// Node module hooks that let headless tests render the REAL .tsx renderer with
// react-dom/server: TS/JSX is transpiled with esbuild (ships with Remotion),
// and 'remotion' resolves to a tiny SSR mock (remotion-ssr-mock.mjs).  This verifies the actual component code path (the
// same code Chrome renders) without a browser — it is a contract/render-path
// check, not a pixel check, and never claims to be one.
import fs from 'node:fs';

const mockURL = new URL("./remotion-ssr-mock.mjs", import.meta.url);
const mockURLHREF = mockURL.href;

export async function resolve(specifier, context, next) {
  if (process.env.SSR_DEBUG) console.error('resolve', specifier, 'from', context.parentURL);
  if (specifier === 'remotion') return {url: mockURLHREF, shortCircuit: true};
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (process.env.SSR_DEBUG) console.error('load', url);
  if (/\.(tsx|ts)$/.test(new URL(url).pathname)) {
    // esbuild ships with Remotion (a direct runtime dependency of the engine);
    // typescript@7 in this repo is the native compiler without a JS API.
    const esbuild = (await import('esbuild')).default ?? (await import('esbuild'));
    const source = fs.readFileSync(new URL(url), 'utf8');
    const out = await esbuild.transform(source, {
      loader: url.endsWith('.tsx') ? 'tsx' : 'ts',
      jsx: 'automatic',
      format: 'esm',
      target: 'es2022',
      sourcefile: url,
    });
    return {format: 'module', source: out.code, shortCircuit: true};
  }
  return next(url, context);
}
