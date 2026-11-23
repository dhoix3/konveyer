#!/usr/bin/env node
// What If Cine Studio — pipeline CLI.
// IDEA -> SCRIPT -> VOICE -> TIMELINE -> SCENES -> SOUND -> RENDER -> FINAL.mp4
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  ENGINE, PROJECTS, OUTPUT, FPS, projectDir, outDir, ensure, readJson, writeJson, sha1, fileSha, logger, markStage, loadState, saveState,
  ff, probe, FFMPEG, runPython, parseArgs, ENGINE_VERSION, sourceHash,
} from './tools/lib.mjs';
import {buildProject, generateIdeas, TEMPLATE_IDS} from './tools/script.mjs';
import {runVoice} from './tools/voice.mjs';
import {buildPlan} from './tools/timeline.mjs';
import {runSound} from './tools/sound.mjs';
import {qaPlan, qaMedia, writeReport} from './tools/qa.mjs';

const args = parseArgs(process.argv.slice(2));
const cmd = args._[0];

const loadProject = (id) => readJson(path.join(projectDir(id), 'project.json'));
const loadPlan = (id) => {
  const f = path.join(projectDir(id), 'plan.json');
  if (!fs.existsSync(f)) throw new Error(`plan.json missing — run: node render.mjs timeline ${id}`);
  return readJson(f);
};
const need = (id) => { if (!id) throw new Error('project id required'); if (!fs.existsSync(path.join(projectDir(id), 'project.json'))) throw new Error(`project "${id}" not found in ${PROJECTS}`); return id; };

async function ensureAssets() {
  const grain = path.join(ENGINE, 'public', 'fx', 'grain.png');
  if (!fs.existsSync(grain)) runPython('gen_assets.py', [path.join(ENGINE, 'public')]);
}

let _bundle;
async function getBundle(log) {
  if (_bundle) return _bundle;
  const {bundle} = await import('@remotion/bundler');
  log.info('bundling Remotion project…');
  _bundle = await bundle({entryPoint: path.join(ENGINE, 'src', 'index.ts'), publicDir: path.join(ENGINE, 'public')});
  return _bundle;
}
const chromeOpts = () => ({gl: 'swangle', disableWebSecurity: false});

// ---------------------------------------------------------------- stages
async function cmdIdea() {
  const lang = args.lang || 'ru';
  const ideas = generateIdeas({lang, count: Number(args.count) || 6, theme: args.theme});
  console.log(JSON.stringify(ideas, null, 2));
}

async function cmdNew(id) {
  if (!id) throw new Error('usage: new <id> [--lang ru|en] [--duration 45] [--topic "..."] [--theme ..] [--characters 1-3] [--voice tts|upload|files|none] [--music mood] [--style ..]');
  const dir = ensure(projectDir(id));
  const log = logger(id, 'script');
  const project = buildProject({id, language: args.lang, duration: args.duration, topic: args.topic, theme: args.theme, characters: args.characters, voiceMode: args.voice, music: args.music, style: args.style, template: args.template});
  if (fs.existsSync(path.join(dir, 'project.json')) && !args.force) throw new Error(`project ${id} exists (use --force to overwrite)`);
  writeJson(path.join(dir, 'project.json'), project);
  writeJson(path.join(dir, 'idea.json'), project.idea);
  markStage(id, 'idea', 'done'); markStage(id, 'script', 'done');
  log.info(`created ${id}: "${project.title[project.language]}" — ${project.scenes.length} scenes, template ${project.idea.template}`);
  return project;
}

async function cmdVoice(id) {
  const log = logger(id, 'voice');
  if (args.audio && !path.isAbsolute(String(args.audio)) && fs.existsSync(path.join(projectDir(id), String(args.audio)))) args.audio = path.join(projectDir(id), String(args.audio));
  markStage(id, 'voice', 'running');
  try { const mf = await runVoice(id, loadProject(id), log, args); markStage(id, 'voice', 'done', {source: mf.source}); log.info(`voice ready (${mf.source})`); }
  catch (e) { markStage(id, 'voice', 'failed', {error: e.message}); throw e; }
}

async function cmdTimeline(id) {
  const log = logger(id, 'timeline');
  const plan = buildPlan(id);
  const rep = qaPlan(id, plan);
  markStage(id, 'timeline', rep.errors.length ? 'failed' : 'done', {totalSec: plan.totalSec, source: plan.voiceSource});
  log.info(`timeline: ${plan.scenes.length} scenes, ${plan.totalSec.toFixed(1)}s (${plan.totalFrames} frames), voice=${plan.voiceSource}`);
  rep.warnings.forEach((w) => log.warn(w));
  if (rep.errors.length) { rep.errors.forEach((e) => log.error(e)); throw new Error(`plan QA failed with ${rep.errors.length} error(s) — see projects/${id}/logs/timeline.log`); }
  return plan;
}

const sceneHash = (plan, sc) => sha1({v: ENGINE_VERSION, src: sourceHash(), fps: plan.fps, chars: plan.characters, scene: sc, lang: plan.language, subs: args['no-subs'] ? 0 : 1});
export const scenesDir = (id, draft) => ensure(path.join(outDir(id), draft ? 'scenes_draft' : 'scenes'));

async function cmdScenes(id) {
  const log = logger(id, 'scenes');
  const plan = loadPlan(id);
  const draft = !!args.draft;
  const scale = draft ? 0.5 : 1;
  const dir = scenesDir(id, draft);
  const only = args.only ? String(args.only).split(',') : null;
  const state = loadState(id);
  state.scenes ||= {};
  await ensureAssets();
  const {renderMedia, selectComposition, ensureBrowser} = await import('@remotion/renderer');
  await ensureBrowser();
  const serveUrl = await getBundle(log);
  markStage(id, 'scenes', 'running');
  // 8 GB machines cannot afford two Chromium renderers plus x264; default to
  // one worker and let the user opt in explicitly.
  const ramGB = os.totalmem() / 1e9;
  const autoConc = ramGB < 12 ? 1 : Math.max(1, Math.min(3, Math.floor(os.cpus().length / 2)));
  const conc = Number(args.concurrency) || autoConc;
  let done = 0, skipped = 0;
  for (const sc of plan.scenes) {
    if (only && !only.includes(sc.id)) continue;
    const file = path.join(dir, `${sc.id}.mp4`);
    const h = sceneHash(plan, sc) + (draft ? 'd' : '');
    const key = draft ? `${sc.id}:draft` : sc.id;
    const st = state.scenes[key];
    if (!args.force && st?.hash === h && fs.existsSync(file)) {
      try {
        const m = probe(file);
        if (st.sha === fileSha(file) && Math.abs(m.duration - sc.durFrames / FPS) < 0.1) { skipped++; log.info(`${sc.id}: up to date — skipped`); continue; }
        log.warn(`${sc.id}: integrity check failed, re-rendering`);
      } catch { log.warn(`${sc.id}: unreadable, re-rendering`); }
    }
    const t0 = Date.now();
    log.info(`${sc.id}: rendering ${sc.durFrames} frames (${sc.env.id}/${sc.env.time})${draft ? ' [draft]' : ''}`);
    const inputProps = {plan, sceneIndex: sc.index, subtitles: !args['no-subs']};
    const comp = await selectComposition({serveUrl, id: 'Scene', inputProps, chromiumOptions: chromeOpts()});
    const part = file.replace(/\.mp4$/, '.part.mp4');
    let last = -1;
    await renderMedia({
      composition: comp, serveUrl, codec: 'h264', outputLocation: part, inputProps, muted: true, crf: draft ? 30 : 17, pixelFormat: 'yuv420p',
      imageFormat: 'jpeg', jpegQuality: 92, scale, concurrency: conc, x264Preset: draft ? 'veryfast' : 'medium', chromiumOptions: chromeOpts(), overwrite: true,
      onProgress: ({progress}) => { const p = Math.floor(progress * 10); if (p !== last) { last = p; process.stdout.write(`\r  ${sc.id} ${p * 10}%   `); } },
    });
    process.stdout.write('\n');
    fs.renameSync(part, file);
    const m = probe(file);
    const exp = sc.durFrames / FPS;
    if (Math.abs(m.duration - exp) > 0.1) throw new Error(`${sc.id}: rendered ${m.duration}s, expected ${exp}s`);
    state.scenes[key] = {hash: h, file: path.relative(ROOT_OUT(), file), sha: fileSha(file), frames: sc.durFrames, seconds: +((Date.now() - t0) / 1000).toFixed(1), at: new Date().toISOString()};
    saveState(id, state);
    done++;
    log.info(`${sc.id}: done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  markStage(id, 'scenes', 'done', {rendered: done, skipped});
  log.info(`scenes finished: ${done} rendered, ${skipped} skipped`);
}
const ROOT_OUT = () => path.resolve(OUTPUT, '..');

async function cmdSound(id) {
  const log = logger(id, 'sound');
  markStage(id, 'sound', 'running');
  try { runSound(id, loadPlan(id), log, {force: !!args.force}); markStage(id, 'sound', 'done'); }
  catch (e) { markStage(id, 'sound', 'failed', {error: e.message}); log.error(e.message); throw e; }
}

function sceneFiles(id, plan, draft) {
  const dir = scenesDir(id, draft);
  return Object.fromEntries(plan.scenes.map((s) => [s.id, path.join(dir, `${s.id}.mp4`)]));
}

async function cmdRender(id) {
  // RENDER: make sure every scene exists then concatenate losslessly
  const log = logger(id, 'render');
  const plan = loadPlan(id);
  await cmdScenes(id);
  const draft = !!args.draft;
  const files = sceneFiles(id, plan, draft);
  for (const [sid, f] of Object.entries(files)) if (!fs.existsSync(f)) throw new Error(`scene ${sid} missing: ${f}`);
  const list = path.join(outDir(id), draft ? 'concat_draft.txt' : 'concat.txt');
  fs.writeFileSync(list, plan.scenes.map((s) => `file '${files[s.id].replace(/'/g, "'\\''")}'`).join('\n'));
  const video = path.join(outDir(id), draft ? 'video_draft.mp4' : 'video.mp4');
  ff(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', video]);
  const m = probe(video);
  log.info(`concatenated video: ${m.duration.toFixed(2)}s ${m.width}x${m.height} @${m.fps}fps`);
  markStage(id, 'render', 'done', {video});
}

async function cmdFinal(id) {
  const log = logger(id, 'final');
  const plan = loadPlan(id);
  const draft = !!args.draft;
  const video = path.join(outDir(id), draft ? 'video_draft.mp4' : 'video.mp4');
  if (!fs.existsSync(video)) throw new Error('video.mp4 missing — run render first');
  const audio = path.join(projectDir(id), 'audio', 'mix_norm.wav');
  if (!fs.existsSync(audio)) throw new Error('mixed audio missing — run sound first');
  const out = path.join(outDir(id), draft ? 'DRAFT.mp4' : 'FINAL.mp4');
  const tmp = out.replace(/\.mp4$/, '.part.mp4');
  ff(['-i', video, '-i', audio, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-crf', draft ? '28' : '21', '-preset', draft ? 'veryfast' : 'medium', '-pix_fmt', 'yuv420p', '-r', '24', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', plan.totalSec.toFixed(3), '-movflags', '+faststart', tmp]);
  fs.renameSync(tmp, out);
  const m = probe(out);
  log.info(`${path.basename(out)}: ${m.duration.toFixed(2)}s ${m.width}x${m.height} @${m.fps}fps ${m.vcodec}/${m.acodec} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB)`);
  markStage(id, 'final', 'done', {file: out, seconds: m.duration});
}

async function cmdQa(id) {
  const log = logger(id, 'qa');
  const plan = loadPlan(id);
  const draft = !!args.draft;
  const parts = [qaPlan(id, plan)];
  if (!args['plan-only']) parts.push(qaMedia(id, plan, sceneFiles(id, plan, draft), path.join(outDir(id), draft ? 'DRAFT.mp4' : 'FINAL.mp4')));
  const rep = writeReport(id, parts);
  rep.errors.forEach((e) => log.error(e));
  rep.warnings.forEach((w) => log.warn(w));
  log.info(rep.ok ? `QA passed (${rep.warnings.length} notes)` : `QA FAILED: ${rep.errors.length} error(s)`);
  markStage(id, 'qa', rep.ok ? 'done' : 'failed', {errors: rep.errors.length});
  if (!rep.ok) process.exitCode = 2;
}

async function cmdFrame(id) {
  const log = logger(id, 'frame');
  const plan = loadPlan(id);
  await ensureAssets();
  const sc = plan.scenes.find((s) => s.id === (args.scene || plan.scenes[0].id));
  if (!sc) throw new Error('scene not found');
  const t = Number(args.t ?? 1);
  const frame = Math.max(0, Math.min(sc.durFrames - 1, Math.round(t * FPS)));
  const {renderStill, selectComposition, ensureBrowser} = await import('@remotion/renderer');
  await ensureBrowser();
  const serveUrl = await getBundle(log);
  const inputProps = {plan, sceneIndex: sc.index, subtitles: !args['no-subs']};
  const comp = await selectComposition({serveUrl, id: 'Scene', inputProps, chromiumOptions: chromeOpts()});
  const out = args.out ? path.resolve(String(args.out)) : path.join(ensure(path.join(outDir(id), 'frames')), `${sc.id}_f${String(frame).padStart(4, '0')}.png`);
  await renderStill({composition: comp, serveUrl, output: out, frame, inputProps, imageFormat: 'png', scale: Number(args.scale) || 1, chromiumOptions: chromeOpts()});
  log.info(`frame -> ${out}`);
  console.log(out);
}

async function cmdAll(id) {
  if (!fs.existsSync(path.join(projectDir(id), 'project.json'))) await cmdNew(id);
  await cmdVoice(id);
  await cmdTimeline(id);
  await cmdScenes(id);
  await cmdSound(id);
  await cmdRender(id);
  await cmdFinal(id);
  await cmdQa(id);
}

function cmdList() {
  ensure(PROJECTS);
  const rows = fs.readdirSync(PROJECTS).filter((d) => fs.existsSync(path.join(PROJECTS, d, 'project.json'))).map((d) => {
    const p = readJson(path.join(PROJECTS, d, 'project.json'));
    const s = loadState(d);
    return {id: d, title: p.title[p.language], lang: p.language, scenes: p.scenes.length, stages: Object.fromEntries(Object.entries(s.stages).map(([k, v]) => [k, v.status])), final: fs.existsSync(path.join(OUTPUT, d, 'FINAL.mp4'))};
  });
  console.log(JSON.stringify(rows, null, 2));
}

function cmdDoctor() {
  const checks = [];
  const add = (name, ok, info) => { checks.push({name, ok, info}); console.log(`${ok ? '✔' : '✘'} ${name}${info ? ' — ' + info : ''}`); };
  add('node', Number(process.versions.node.split('.')[0]) >= 22, process.version);
  try { const v = probe.length ? FFMPEG() : ''; add('ffmpeg', true, v); } catch (e) { add('ffmpeg', false, e.message); }
  try { runPython('gen_assets.py', [path.join(ENGINE, 'public')]); add('python+numpy', true, 'grain asset generated'); } catch (e) { add('python+numpy', false, e.message.slice(0, 120)); }
  try { runPython('tts.py', ['/dev/null']); } catch (e) { add('piper-tts', !/No module named/.test(e.message), /No module/.test(e.message) ? 'pip install piper-tts' : 'installed'); }
  const models = fs.existsSync(path.join(ENGINE, 'models', 'piper')) ? fs.readdirSync(path.join(ENGINE, 'models', 'piper')).filter((f) => f.endsWith('.onnx')) : [];
  add('piper models', true, models.length ? models.join(', ') : 'none yet (downloaded on first voice run)');
  add('remotion', fs.existsSync(path.join(ENGINE, 'node_modules', 'remotion')), 'engine/node_modules');
  add('whisper (onnx)', fs.existsSync(path.join(ENGINE, 'node_modules', '@huggingface', 'transformers')), '@huggingface/transformers');
  if (checks.some((c) => !c.ok)) process.exitCode = 1;
}

const HELP = `What If Cine Studio — pipeline
  node render.mjs doctor                         check environment
  node render.mjs idea [--lang ru|en] [--theme t] [--count n]
  node render.mjs new <id> [--lang ru] [--duration 45] [--topic "..."] [--characters 2] [--voice tts|upload|files|none] [--music dark_ambient|tense|mystery|epic|emotional|lofi]
  node render.mjs voice <id> [--audio file.mp3] [--no-whisper] [--force]
  node render.mjs timeline <id>
  node render.mjs scenes <id> [--only s01,s03] [--force] [--draft]
  node render.mjs sound <id> [--force]
  node render.mjs render <id> [--draft]          scenes + lossless concat
  node render.mjs final <id> [--draft]           mux audio -> FINAL.mp4
  node render.mjs qa <id> [--plan-only]
  node render.mjs frame <id> --scene s01 --t 2.5
  node render.mjs all <id>                       whole pipeline
  node render.mjs list
templates: ${TEMPLATE_IDS.join(', ')}`;

const table = {idea: cmdIdea, new: cmdNew, voice: cmdVoice, timeline: cmdTimeline, scenes: cmdScenes, sound: cmdSound, render: cmdRender, final: cmdFinal, qa: cmdQa, frame: cmdFrame, all: cmdAll, list: cmdList, doctor: cmdDoctor};
try {
  if (!cmd || !table[cmd]) { console.log(HELP); process.exit(cmd ? 1 : 0); }
  const id = args._[1];
  if (!['idea', 'list', 'doctor', 'new'].includes(cmd) && !(cmd === 'all')) need(id);
  await table[cmd](id);
  process.exit(process.exitCode || 0);
} catch (e) {
  console.error(`✘ ${e.message}`);
  if (process.env.DEBUG) console.error(e.stack);
  process.exit(1);
}
