// The opening screen (PageLoader) plays on the visit's first page. Things that pop up on their own (the robot, the
// cookie prompt) wait until it has cleared.

/** Calls `go` once the opening screen has cleared (or straight away when it didn't play). Returns a cancel function */
export function afterOpening(go: () => void) {
  const state = document.documentElement.dataset.loader;
  if (state === 'seen' || state === 'left') { go(); return () => {}; }
  const done = () => { window.clearTimeout(fallback); go(); };
  const fallback = window.setTimeout(done, 7000);
  window.addEventListener('inta:opening-done', done, { once: true });
  return () => { window.clearTimeout(fallback); window.removeEventListener('inta:opening-done', done); };
}
