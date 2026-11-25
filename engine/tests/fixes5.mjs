// fixes5 — regression for the real render crash
// "TypeError: Cannot read properties of undefined (reading 'pulse')"
// reported on project "gravity-film", first scene "s01" (SceneRenderer).
//
// Root cause: the universal "make" outline generator produced scenes without
// the required `light` field (SceneSpec.light is a required LightDef), so the
// plan reached SceneRenderer with scene.light === undefined and the very first
// read of scene.light.pulse crashed Chrome.  Fixed as a contract, not a `?.`:
//   1. generator: universal outline scenes carry an explicit void light;
//   2. plan boundary: buildPlan (the only producer of plan.json) completes the
//      LightDef contract for every scene, keeping old projects renderable;
//   3. QA: an incomplete light is a plan QA error, caught before render;
//   4. regression: the real SceneRenderer renders every scene frame headless
//      (react-dom/server with the project's own typescript + a remotion stub).
// SSR checks the actual component code path; it is not a pixel/browser check.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {renderSceneFrames} from './ssr-render.mjs';
import {makeUniversal} from '../tools/universal.mjs';
import {buildProject, pickTemplate} from '../tools/script.mjs';
import {createSeason} from '../tools/series.mjs';
import {buildDocumentary} from '../tools/documentary.mjs';
import {findPack} from '../tools/knowledge.mjs';
import {buildPlan} from '../tools/timeline.mjs';
import {qaPlan} from '../tools/qa.mjs';
import {normalizeSceneLight} from '../tools/story.mjs';
import {projectDir} from '../tools/lib.mjs';

const ids = [];

function writeProject(id, project) {
  ids.push(id);
  fs.mkdirSync(projectDir(id), {recursive: true});
  fs.writeFileSync(path.join(projectDir(id), 'project.json'), JSON.stringify(project));
}

function cleanup() {
  for (const id of ids) fs.rmSync(projectDir(id), {recursive: true, force: true});
}

try {
  // ---- 1. The reported failure, reproduced end-to-end ----------------------
  // The historical "gravity-film": created through the GUI make path with a
  // gravity topic in unverified-draft mode; scene s01 had no light.
  const made = makeUniversal({id: 'reg-gravity-film', topic: 'Что если гравитация исчезнет на 10 секунд?', format: 'explainer', duration: 45, language: 'ru', mode: 'unverified-draft', voiceMode: 'none'});
  ids.push(made.id);
  assert.equal(made.mode, 'unverified-draft');
  const universal = JSON.parse(fs.readFileSync(path.join(projectDir(made.id), 'project.json'), 'utf8'));
  assert.ok(universal.scenes.some(s => s.id === 's01'), 'outline scene s01 exists');
  // Generator contract: the outline generator now emits a complete light itself.
  for (const sc of universal.scenes) assert.ok(sc.light && sc.light.key !== undefined && Number.isFinite(sc.light.x), `generator emits light for ${sc.id}`);
  let plan = buildPlan(made.id, {ignoreAudio: true});
  for (const sc of plan.scenes) {
    assert.ok(sc.light && ['sun', 'moon', 'lamp', 'screen', 'neon', 'fire', 'emergency', 'none'].includes(sc.light.key), `${sc.id} plan light complete`);
  }
  // Old broken projects (light stripped, exactly the user's damaged file)
  // must still produce a renderable plan — contract completed at the boundary.
  const damaged = structuredClone(universal);
  for (const sc of damaged.scenes) delete sc.light;
  writeProject('reg-gravity-broken', damaged);
  const brokenPlan = buildPlan('reg-gravity-broken', {ignoreAudio: true});
  assert.ok(brokenPlan.scenes.every(sc => sc.light && Number.isFinite(sc.light.intensity)), 'plan builder completes missing light');

  // The actual crash: render scene s01 of the damaged plan frame by frame
  // through the real SceneRenderer.  Before the fix this threw
  // "Cannot read properties of undefined (reading 'pulse')".
  const s01 = brokenPlan.scenes.findIndex(s => s.id === 's01');
  const len = await renderSceneFrames(brokenPlan, s01);
  assert.ok(len > 10000, 'scene s01 rendered non-trivial markup');
  await renderSceneFrames(brokenPlan, brokenPlan.scenes.length - 1);

  // ---- 2. One scene of every generator path renders headless ---------------
  const samples = [];
  const whatif = buildProject({id: 'reg-whatif', topic: 'что если гравитация исчезнет на 10 секунд?', duration: 25, language: 'ru'});
  writeProject('reg-whatif', whatif);
  samples.push(buildPlan('reg-whatif', {ignoreAudio: true}));
  const story = buildProject({id: 'reg-story', topic: 'динозавры вернулись в современный мир', duration: 25, language: 'ru'});
  writeProject('reg-story', story);
  samples.push(buildPlan('reg-story', {ignoreAudio: true}));
  const doc = buildDocumentary(buildProject({id: 'reg-doc', topic: 'Рюриковичи', format: 'documentary', duration: 120, voice: 'none'}), findPack('Рюриковичи'));
  writeProject('reg-doc', doc);
  samples.push(buildPlan('reg-doc', {ignoreAudio: true}));
  const season = createSeason({id: 'reg-series', format: 'series', name: 'Экспедиция', topic: 'Экспедиция', episodes: 1, duration: 30, characters: 2, voiceMode: 'none'});
  ids.push(season.id, `${season.id}-e01`);
  samples.push(buildPlan(`${season.id}-e01`, {ignoreAudio: true}));
  const fiction = buildProject({id: 'reg-film', format: 'fiction', topic: 'Возвращение экспедиции', duration: 30, characters: 2, voiceMode: 'none'});
  writeProject('reg-film', fiction);
  samples.push(buildPlan('reg-film', {ignoreAudio: true}));
  for (const p of samples) {
    assert.deepEqual(qaPlan(p.id, p).errors, [], `plan QA clean: ${p.id}`);
    for (let i = 0; i < p.scenes.length; i++) await renderSceneFrames(p, i, {everyNth: Math.max(1, Math.floor(p.scenes[i].durFrames / 6))});
  }

  // ---- 3. QA catches the contract violation before Chrome does -------------
  const stripped = structuredClone(plan);
  delete stripped.scenes[0].light;
  const qa = qaPlan(made.id, stripped);
  assert.ok(qa.errors.some(e => e.includes('light missing')), 'plan QA reports missing light');
  const partial = structuredClone(plan);
  partial.scenes[0].light = {key: 'sun'}; // incomplete: x/y/color/rim/intensity missing
  assert.ok(qaPlan(made.id, partial).errors.some(e => e.includes('light.x')), 'plan QA reports incomplete light');

  // ---- 4. normalizeSceneLight keeps valid authoring, completes the rest ----
  const base = normalizeSceneLight(undefined, {id: 'street', time: 'night'});
  assert.equal(base.key, 'neon');
  const kept = normalizeSceneLight({key: 'sun', x: 1500, y: 100, color: '#fff', rim: '#ffd', intensity: 0.7, grade: 'teal_orange', pulse: {color: '#f00', period: 2}}, {id: 'street', time: 'night'});
  assert.deepEqual(kept, {key: 'sun', x: 1500, y: 100, color: '#fff', rim: '#ffd', intensity: 0.7, grade: 'teal_orange', pulse: {color: '#f00', period: 2}});
  const clamped = normalizeSceneLight({key: 'alien', x: 'NaN-ish', y: 1e9, color: '', rim: null, intensity: 5}, {});
  assert.equal(clamped.key, 'sun');
  assert.ok(Number.isFinite(clamped.x) && clamped.intensity <= 1, 'invalid values replaced with preset');

  console.log('PASS fixes5: gravity-film s01 pulse crash fixed by light contract (generator + plan boundary + QA), old damaged projects render, every generator path renders headless');
} finally {
  cleanup();
}
