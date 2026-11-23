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
import {buildProject, generateIdeas, TEMPLATE_IDS, MUSIC_MOODS, LANGS, STYLES} from './tools/script.mjs';
import {startUI} from './tools/ui.mjs';
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
  if (!id) throw new Error('usage: new <id> [--lang ru|en] [--duration 45] [--topic "..."] [--theme ..] [--characters 1-3] [--voice tts|upload|files|none] [--music mood] [--style ..] [--template gravity|no_sleep|no_internet|freeform]');
  // ---- input validation (fail fast, before touching the filesystem)
  if (args.lang && !LANGS.includes(String(args.lang))) throw new Error(`--lang must be one of: ${LANGS.join(', ')} (got "${args.lang}")`);
  if (args.music && !MUSIC_MOODS.includes(String(args.music))) throw new Error(`--music must be one of: ${MUSIC_MOODS.join(', ')} (got "${args.music}")`);
  if (args.style && !Object.prototype.hasOwnProperty.call(STYLES, String(args.style))) throw new Error(`--style must be one of: ${Object.keys(STYLES).join(', ')} (got "${args.style}")`);
  if (args.template && args.template !== 'freeform' && args.template !== 'auto' && !TEMPLATE_IDS.includes(String(args.template))) throw new Error(`--template must be one of: ${TEMPLATE_IDS.join(', ')}, freeform, auto (got "${args.template}")`);
  if (args.voice && !['tts', 'upload', 'files', 'none'].includes(String(args.voice))) throw new Error(`--voice must be one of: tts, upload, files, none (got "${args.voice}")`);
  if (args.duration !== undefined && !Number.isFinite(Number(args.duration))) throw new Error(`--duration must be a number 25-180 (got "${args.duration}")`);
  if (args.duration !== undefined && (Number(args.duration) < 25 || Number(args.duration) > 180)) throw new Error(`--duration must be 25-180 seconds (got "${args.duration}")`);
  if (args.characters !== undefined && !(Number(args.characters) >= 1 && Number(args.characters) <= 3)) throw new Error('--characters must be 1, 2 or 3');
  if (args.topic && String(args.topic).length > 300) throw new Error('--topic is too long (max 300 characters)');
  if (args.topic && !String(args.topic).trim()) throw new Error('--topic is empty');

  const dir = ensure(projectDir(id));
  const log = logger(id, 'script');
  if (args.topic && String(args.topic).length > 200) log.warn('topic longer than 200 chars — it will be truncated');
  const existed = fs.existsSync(path.join(dir, 'project.json'));
  if (existed && !args.force) throw new Error(`project ${id} exists (use --force to overwrite)`);
  const project = buildProject({id, language: args.lang, duration: args.duration, topic: args.topic, theme: args.theme, characters: args.characters, voiceMode: args.voice, music: args.music, style: args.style, template: args.template === 'auto' ? undefined : args.template});
  writeJson(path.join(dir, 'project.json'), project);
  writeJson(path.join(dir, 'idea.json'), project.idea);
  if (existed && args.force) {
    // A forced rebuild starts a new film: drop stale stage/scene state so the
    // UI and `list` never show progress from the previous version.
    writeJson(path.join(dir, 'state.json'), {stages: {}, scenes: {}});
  }
  markStage(id, 'idea', 'done'); markStage(id, 'script', 'done');
  log.info(`created ${id}: "${project.title[project.language]}" — ${project.scenes.length} scenes, template ${project.idea.template}${project.idea.template === 'freeform' ? `, domain ${project.idea.theme}` : ''}`);
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
  markStage(id, 'timeline', 'running');
  try {
    const plan = buildPlan(id);
    const rep = qaPlan(id, plan);
    markStage(id, 'timeline', rep.errors.length ? 'failed' : 'done', {totalSec: plan.totalSec, source: plan.voiceSource});
    log.info(`timeline: ${plan.scenes.length} scenes, ${plan.totalSec.toFixed(1)}s (${plan.totalFrames} frames), voice=${plan.voiceSource}`);
    rep.warnings.forEach((w) => log.warn(w));
    if (rep.errors.length) { rep.errors.forEach((e) => log.error(e)); throw new Error(`plan QA failed with ${rep.errors.length} error(s) — see projects/${id}/logs/timeline.log`); }
    return plan;
  } catch (e) {
    markStage(id, 'timeline', 'failed', {error: String(e.message).slice(0, 300)});
    throw e;
  }
}

const sceneHash = (plan, sc) => sha1({v: ENGINE_VERSION, src: sourceHash(), fps: plan.fps, chars: plan.characters, scene: sc, lang: plan.language, subs: args['no-subs'] ? 0 : 1});
export const scenesDir = (id, draft) => ensure(path.join(outDir(id), draft ? 'scenes_draft' : 'scenes'));

async function cmdScenes(id) {
  const log = logger(id, 'scenes');
  markStage(id, 'scenes', 'running');
  let done = 0, skipped = 0;
  try {
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
  // 8 GB machines cannot afford two Chromium renderers plus x264; default to
  // one worker and let the user opt in explicitly.
  const ramGB = os.totalmem() / 1e9;
  const autoConc = ramGB < 12 ? 1 : Math.max(1, Math.min(3, Math.floor(os.cpus().length / 2)));
  const conc = Number(args.concurrency) || autoConc;
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
  } catch (e) {
    markStage(id, 'scenes', 'failed', {error: String(e.message).slice(0, 300)});
    log.error(`scenes failed: ${e.message}`);
    throw e;
  }
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
  markStage(id, 'render', 'running');
  try {
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
  } catch (e) {
    markStage(id, 'render', 'failed', {error: String(e.message).slice(0, 300)});
    log.error(`render failed: ${e.message}`);
    throw e;
  }
}

async function cmdFinal(id) {
  const log = logger(id, 'final');
  markStage(id, 'final', 'running');
  try {
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
  } catch (e) {
    markStage(id, 'final', 'failed', {error: String(e.message).slice(0, 300)});
    log.error(`final failed: ${e.message}`);
    throw e;
  }
}

async function cmdQa(id) {
  const log = logger(id, 'qa');
  markStage(id, 'qa', 'running');
  try {
    const plan = loadPlan(id);
    const draft = !!args.draft;
    const parts = [qaPlan(id, plan)];
    if (!args['plan-only']) parts.push(qaMedia(id, plan, sceneFiles(id, plan, draft), path.join(outDir(id), draft ? 'DRAFT.mp4' : 'FINAL.mp4'), draft));
    const rep = writeReport(id, parts);
    rep.errors.forEach((e) => log.error(e));
    rep.warnings.forEach((w) => log.warn(w));
    log.info(rep.ok ? `QA passed (${rep.warnings.length} notes)` : `QA FAILED: ${rep.errors.length} error(s)`);
    markStage(id, 'qa', rep.ok ? 'done' : 'failed', {errors: rep.errors.length});
    if (!rep.ok) process.exitCode = 2;
  } catch (e) {
    markStage(id, 'qa', 'failed', {error: String(e.message).slice(0, 300)});
    throw e;
  }
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
  const log = logger(id, 'all');
  if (!fs.existsSync(path.join(projectDir(id), 'project.json'))) {
    log.info('no project yet — creating one from the current options');
    await cmdNew(id);
  }
  const stages = [
    ['voice', cmdVoice], ['timeline', cmdTimeline], ['scenes', cmdScenes],
    ['sound', cmdSound], ['render', cmdRender], ['final', cmdFinal], ['qa', cmdQa],
  ];
  const t0 = Date.now();
  for (const [name, fn] of stages) {
    log.info(`=== stage ${name} started ===`);
    await fn(id);
    log.info(`=== stage ${name} done (${((Date.now() - t0) / 1000).toFixed(0)}s total) ===`);
  }
  const final = path.join(OUTPUT, id, 'FINAL.mp4');
  if (fs.existsSync(final)) log.info(`pipeline finished: ${final}`);
  else log.warn('pipeline finished but FINAL.mp4 not found — check qa report');
}

async function cmdUi(id, args) {
  const port = Number(args.port || process.env.PORT || 7788);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('--port must be 1..65535');
  startUI({port});
  // Keep the process alive until SIGINT/SIGTERM (startUI exits on both);
  // otherwise the CLI's trailing process.exit() would kill the server.
  await new Promise(() => {});
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
  add('piper models', models.length > 0, models.length ? models.join(', ') : 'missing in this checkout; existing local model files are required for offline TTS');
  add('remotion', fs.existsSync(path.join(ENGINE, 'node_modules', 'remotion')), 'engine/node_modules');
  add('whisper (onnx)', fs.existsSync(path.join(ENGINE, 'node_modules', '@huggingface', 'transformers')), '@huggingface/transformers');
  if (checks.some((c) => !c.ok)) process.exitCode = 1;
}

const HELP = `What If Cine Studio — pipeline
  node render.mjs doctor                         check environment
  node render.mjs ui [--port 7788]               local web UI (create/run/download MP4)
  node render.mjs idea [--lang ru|en] [--theme t] [--count n]
  node render.mjs new <id> [--lang ru] [--duration 45] [--topic "..."] [--characters 2]
      [--voice tts|upload|files|none] [--style cinematic-stickman|noir|warm|vivid]
      [--music dark_ambient|tense|mystery|epic|emotional|lofi] [--template auto|freeform|${TEMPLATE_IDS.join('|')}] [--force]
  node render.mjs voice <id> [--audio file.mp3] [--no-whisper] [--force]
  node render.mjs timeline <id>
  node render.mjs scenes <id> [--only s01,s03] [--force] [--draft]
  node render.mjs sound <id> [--force]
  node render.mjs render <id> [--draft]          scenes + lossless concat
  node render.mjs final <id> [--draft]           mux audio -> FINAL.mp4
  node render.mjs qa <id> [--plan-only] [--draft]
  node render.mjs frame <id> --scene s01 --t 2.5
  node render.mjs all <id> [--draft]             whole pipeline (stage logs in projects/<id>/logs/all.log)
  node render.mjs list
templates: ${TEMPLATE_IDS.join(', ')}`;

// Last-resort guard: some renderer internals die via an uncaught exception
// (e.g. a socket error while downloading the browser) instead of a rejected
// promise, which bypasses every stage's try/catch and would leave the stage
// stuck at "running" with a raw Node dump.  Mark the running stage failed
// and exit with a clean message instead.
function failRunningStage(id, err) {
  if (!id) return;
  try {
    const s = loadState(id);
    for (const [stage, info] of Object.entries(s.stages || {})) {
      if (info?.status === 'running') markStage(id, stage, 'failed', {error: String(err?.message || err).slice(0, 300)});
    }
  } catch { /* no readable state — nothing to mark */ }
}
process.on('uncaughtException', (e) => { failRunningStage(args._[1], e); console.error(`✘ ${e.message}`); process.exit(1); });
process.on('unhandledRejection', (e) => { failRunningStage(args._[1], e); console.error(`✘ ${e?.message || e}`); process.exit(1); });

const table = {idea: cmdIdea, new: cmdNew, voice: cmdVoice, timeline: cmdTimeline, scenes: cmdScenes, sound: cmdSound, render: cmdRender, final: cmdFinal, qa: cmdQa, frame: cmdFrame, all: cmdAll, list: cmdList, doctor: cmdDoctor, ui: cmdUi};
try {
  if (!cmd || !table[cmd]) { console.log(HELP); process.exit(cmd ? 1 : 0); }
  const id = args._[1];
  if (!['idea', 'list', 'doctor', 'new', 'ui'].includes(cmd)) need(id);
  await table[cmd](id, args);
  process.exit(process.exitCode || 0);
} catch (e) {
  console.error(`✘ ${e.message}`);
  if (process.env.DEBUG) console.error(e.stack);
  process.exit(1);
}
