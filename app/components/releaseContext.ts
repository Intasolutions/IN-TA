/**
 * Hands a canvas's graphics context back to the browser, which only allows a few at a time. Only once the canvas has
 * really gone, though: a canvas can't get a new context after this, and React's development mode tears a page down and
 * sets it up again on the same canvas, which would leave it dead and showing white.
 */
export function releaseContext(gl: WebGLRenderingContext | WebGL2RenderingContext, canvas: HTMLCanvasElement) {
  window.setTimeout(() => {
    if (!canvas.isConnected) gl.getExtension('WEBGL_lose_context')?.loseContext();
  }, 0);
}
