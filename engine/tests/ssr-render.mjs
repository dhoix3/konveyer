// Headless SSR rendering of the real Remotion components (see ssr-hooks.mjs).
// Registers the loader, then callers import SceneRenderer and render chosen
// frames of a plan scene to static markup.  Throws propagate — any TypeError
// inside the renderer (e.g. the historic `scene.light.pulse` crash) fails the
// test exactly like a real Chrome render would.
import {register} from 'node:module';

let registered = false;
export function registerSSR() {
  if (registered) return;
  register('./ssr-hooks.mjs', import.meta.url);
  registered = true;
}

export async function loadSceneRenderer() {
  registerSSR();
  return import('../src/v2/SceneRenderer.tsx');
}

// Render every frame (or a sampled subset) of one plan scene through the real
// SceneRenderer.  Returns the total markup length as a sanity signal.
export async function renderSceneFrames(plan, sceneIndex, {everyNth = 1} = {}) {
  const React = (await import('react')).default;
  const {renderToStaticMarkup} = await import('react-dom/server');
  const {SceneRenderer} = await loadSceneRenderer();
  const {setFrame} = await import('./remotion-ssr-mock.mjs');
  const scene = plan.scenes[sceneIndex];
  if (!scene) throw new Error(`sceneIndex ${sceneIndex} out of range`);
  let length = 0;
  for (let f = 0; f < scene.durFrames; f += everyNth) {
    setFrame(f);
    length += renderToStaticMarkup(React.createElement(SceneRenderer, {plan, sceneIndex})).length;
  }
  return length;
}
