// The original guide character: RobotExpressive by Tomás Laulhé (Quaternius), CC0 1.0, with face morphs by
// Don McCurdy (public/guide/robot.glb, from the three.js examples). Its three materials are repainted in IN-TA colours,
// and it plays the same clips the engine asks of every character (character.ts), so engine.ts drives it unchanged.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Character, Clip, Feeling } from './character';

/** The model's three materials: Main (its shell), Grey (joints, hands, the face plate's rim), Black (the face). */
export type Scheme = { main: string; grey: string; black: string };

export const SCHEMES = {
  /** brand blue shell, white joints, midnight face: reads on the white pages and the dark ones */
  blue: { main: '#0144b5', grey: '#eef2f8', black: '#01072b' },
  /** a white shell with brand-blue joints and a midnight face (the one in use): stands out on the dark sections and the light ones */
  white: { main: '#f3f6fb', grey: '#0144b5', black: '#01072b' },
  /** midnight shell with sky-blue joints: the darkest, closest to the footer */
  midnight: { main: '#0d1d5c', grey: '#9dbbff', black: '#01072b' },
} satisfies Record<string, Scheme>;

// clips that hold their last frame instead of looping (he stays down, stays seated)
const HOLD = new Set<Clip>(['Death', 'Sitting', 'Standing']);
const LOOP = new Set<Clip>(['Idle', 'Walking', 'Running', 'Dance']);

export async function loadRobot(scheme: Scheme = SCHEMES.white, url = '/guide/robot.glb'): Promise<Character> {
  const gltf = await new GLTFLoader().loadAsync(url);
  const model = gltf.scene;

  // repaint, and soften the plastic a touch
  const paint: Record<string, string> = { Main: scheme.main, Grey: scheme.grey, Black: scheme.black };
  const faces: THREE.Mesh[] = [];
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.frustumCulled = false;
    const mats = (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshStandardMaterial[];
    for (const mat of mats) {
      const c = paint[mat.name];
      if (c) mat.color.set(c);
      mat.roughness = mat.name === 'Black' ? 0.35 : 0.55;
      mat.metalness = mat.name === 'Main' ? 0.12 : 0.05;
    }
    if (m.morphTargetDictionary && 'Surprised' in m.morphTargetDictionary) faces.push(m);
  });

  // a wrapper turns him side-on as he falls over, so the fall reads on a flat screen (the clip falls backwards)
  const root = new THREE.Group();
  const turner = new THREE.Group();
  turner.add(model);
  root.add(turner);

  const mixer = new THREE.AnimationMixer(model);
  const actions = new Map<string, THREE.AnimationAction>();
  for (const clip of gltf.animations) {
    const a = mixer.clipAction(clip);
    if (!LOOP.has(clip.name as Clip)) {
      a.setLoop(THREE.LoopOnce, 1);
      a.clampWhenFinished = true;
    }
    actions.set(clip.name, a);
  }

  let cur: Clip = 'Idle';
  let curAction: THREE.AnimationAction | null = null;
  let done: (() => void) | null = null;
  mixer.addEventListener('finished', (e) => {
    if ((e as unknown as { action: THREE.AnimationAction }).action !== curAction || !done) return;
    const d = done;
    done = null;
    d();
  });

  // Head look. The clips move the head on their own (Idle glances 26° one way and 15° the other, Dance spins it), so
  // adding the cursor turn on top sent the head away from the cursor every few seconds. Instead the head is aimed at the
  // cursor in the model's own frame (facing the viewer), replacing the clip's head move; only the nods, shakes and
  // spins that mean something (KEEP) are laid on top of the aim.
  let head: THREE.Object3D | null = null;
  model.traverse((o) => { if (!head && (o as THREE.Bone).isBone && o.name === 'Head') head = o; });
  const rest = head ? (head as THREE.Object3D).quaternion.clone() : new THREE.Quaternion();
  const chain: THREE.Object3D[] = []; // the head's parents, up to the model
  for (let o = head ? (head as THREE.Object3D).parent : null; o && o !== model; o = o.parent) chain.push(o);
  /** the neck's turn as seen from the model, this frame */
  const neckInModel = (q: THREE.Quaternion) => {
    q.identity();
    for (let i = chain.length - 1; i >= 0; i--) q.multiply(chain[i].quaternion);
    return q;
  };
  const bind = neckInModel(new THREE.Quaternion()).multiply(rest); // the head at rest, in the model's frame
  const bindInv = bind.clone().invert();
  const neck = new THREE.Quaternion(), pose = new THREE.Quaternion(), own = new THREE.Quaternion();
  const aim = new THREE.Quaternion(), want = new THREE.Quaternion(), still = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const eased = { yaw: 0, pitch: 0, hold: 0, keep: 0 };
  const KEEP = new Set<Clip>(['Yes', 'No', 'Jump', 'Dance']);
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

  let fell = 1;
  const feelings: Record<'Surprised' | 'Angry' | 'Sad', number> = { Surprised: 0, Angry: 0, Sad: 0 };
  const target = { ...feelings };

  // the top of his head, fixed to the head bone (so it tips over with him when he falls): the speech bubble sits here
  model.updateMatrixWorld(true);
  const crown = new THREE.Object3D();
  if (head) {
    const h = head as THREE.Object3D;
    const top = h.getWorldPosition(new THREE.Vector3());
    top.y = new THREE.Box3().setFromObject(model).max.y;
    crown.position.copy(h.worldToLocal(top));
    h.add(crown);
  }

  // feet on the ground: the Jump clip lifts the whole body ~40 px, so a mid-air pose held while he falls would land
  // with his feet in the air; while planted, he is lowered by however far his lower foot is above where it rests
  const feet = ['FootL', 'FootR'].map((n) => model.getObjectByName(n)).filter(Boolean) as THREE.Object3D[];
  const footV = new THREE.Vector3();
  const lowestFoot = () => Math.min(...feet.map((f) => root.worldToLocal(f.getWorldPosition(footV)).y));
  root.updateMatrixWorld(true);
  const footRest = feet.length ? lowestFoot() : 0;
  let planted = 0, plantTo = 0;

  return {
    root,
    height: 112,
    crown,
    plant(on) { plantTo = on ? 1 : 0; },
    play(name, speed, fade, then, from) {
      const next = actions.get(name);
      if (!next) { then?.(); return; }
      next.reset();
      if (from !== undefined) next.time = from;
      next.setEffectiveTimeScale(speed);
      next.setEffectiveWeight(1);
      if (curAction && curAction !== next) next.crossFadeFrom(curAction, Math.max(0.01, fade), false);
      next.play();
      curAction = next;
      cur = name;
      done = then;
    },
    is: (name) => cur === name,
    feel(f: Feeling, amount: number) {
      for (const k of Object.keys(target) as (keyof typeof target)[]) target[k] = k === f ? amount : 0;
    },
    fallSide(dir) { fell = dir; },
    update(dt, look) {
      if (head) (head as THREE.Object3D).quaternion.copy(rest);
      mixer.update(dt);
      const k = Math.min(1, dt * 10);
      eased.yaw += (clamp(look.yaw, -0.8, 0.8) - eased.yaw) * k;
      eased.pitch += (clamp(look.pitch, -0.35, 0.4) - eased.pitch) * k;
      const down = HOLD.has(cur) && cur !== 'Sitting';
      eased.hold += ((down ? 0 : look.hold ?? 1) - eased.hold) * Math.min(1, dt * 6);
      eased.keep += ((KEEP.has(cur) ? 1 : 0) - eased.keep) * Math.min(1, dt * 8);
      if (head && eased.hold > 0.001) {
        const h = head as THREE.Object3D;
        neckInModel(neck);
        pose.copy(neck).multiply(h.quaternion); // where the clip put the head
        own.copy(pose).multiply(bindInv).slerp(still, 1 - eased.keep); // the clip's own head move, kept for nods and shakes
        aim.setFromEuler(euler.set(eased.pitch * 0.8, eased.yaw, 0, 'YXZ'));
        want.copy(aim).multiply(own).multiply(bind);
        pose.slerp(want, eased.hold);
        h.quaternion.copy(neck.invert()).multiply(pose);
      }
      // side-on while he's falling or lying down, facing the viewer again once he's up
      const side = cur === 'Death' ? fell * Math.PI / 2 : 0;
      turner.rotation.y += (side - turner.rotation.y) * Math.min(1, dt * (cur === 'Death' ? 18 : 6));
      planted += (plantTo - planted) * Math.min(1, dt * 14);
      if (feet.length && (planted > 0.001 || turner.position.y !== 0)) {
        root.updateMatrixWorld(true);
        const raised = lowestFoot() - turner.position.y - footRest;
        turner.position.y = planted > 0.001 ? -Math.max(0, raised) * planted : 0;
      }
      for (const key of Object.keys(feelings) as (keyof typeof feelings)[]) {
        feelings[key] += (target[key] - feelings[key]) * Math.min(1, dt * 8);
        for (const m of faces) {
          const i = m.morphTargetDictionary![key];
          if (i !== undefined && m.morphTargetInfluences) m.morphTargetInfluences[i] = feelings[key];
        }
      }
    },
  };
}
