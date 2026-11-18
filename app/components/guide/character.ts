// What the engine (engine.ts) asks of the website guide's character: the robot in robot.ts. Another character can
// stand in for him by giving the same clips and the same methods.

import type * as THREE from 'three';

export type Clip = 'Idle' | 'Walking' | 'Running' | 'Jump' | 'Wave' | 'ThumbsUp' | 'Yes' | 'No' | 'Sitting' | 'Standing' | 'Dance' | 'Death';
export type Feeling = 'Surprised' | 'Angry' | 'Sad' | null;
export const LOOPS = new Set<Clip>(['Idle', 'Standing', 'Walking', 'Running', 'Sitting', 'Dance']);

export type Character = {
  root: THREE.Group;
  /** how tall he stands on screen at full size, px */
  height: number;
  /** speed 0 holds a pose; a negative speed plays the clip backwards; from: start this far into the clip (seconds) */
  play: (name: Clip, speed: number, fade: number, done: (() => void) | null, from?: number) => void;
  /** keep the feet on the ground whatever the clip does (a frozen mid-air pose while he falls) */
  plant?: (on: boolean) => void;
  /** a point on top of his head, carried by the head as it moves: the speech bubble and the stars sit here */
  crown?: THREE.Object3D;
  is: (name: Clip) => boolean;
  feel: (f: Feeling, amount: number) => void;
  /** which way he falls over (1 to the left on screen, -1 to the right) */
  fallSide: (dir: 1 | -1) => void;
  /** advance the animation; look turns the head (radians, from the way the body faces: + to the right, + down;
   *  hold 0–1 is how firmly the head follows it, 0 when he isn't looking at anything in particular) */
  update: (dt: number, look: { yaw: number; pitch: number; hold?: number }) => void;
};
