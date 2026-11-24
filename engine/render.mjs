#!/usr/bin/env node
import {publishPackage} from './tools/publishing.mjs';
import {findPack} from './tools/knowledge.mjs';
import {outputSize} from './src/lib/viewport.ts';
import {exportSubtitles} from './tools/subtitles.mjs';
import {VOICE_REGISTRY} from './tools/voice-registry.mjs';
import {ensureModel} from './tools/voice.mjs';
import {research} from './tools/knowledge.mjs';
import {buildDocumentary,writeDocumentaryArtifacts} from './tools/documentary.mjs';
// Koveyer Dhoix'a — pipeline CLI.
// IDEA -> SCRIPT -> VOICE -> TIMELINE -> SCENES -> SOUND -> RENDER -> FINAL.mp4
import {createSeason, regenerateEpisode, recoverSeason, assertSeriesContext} from './tools/series.mjs';
import {applyLocalEnvironment,fixEnvironment} from './tools/environment.mjs';
import {listHistory,restoreSnapshot} from './tools/storage.mjs';
import {lockProject} from './tools/project-lock.mjs';
import {prepareBrowser} from './tools/browser.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  ENGINE, PROJECTS, OUTPUT, FPS, projectDir, outDir, ensure, readJson, writeJson, sha1, fileSha, logger, markStage, loadState, saveState,
  ff, probe, FFMPEG, runPython, parseArgs, ENGINE_VERSION, sourceHash,
} from './tools/lib.mjs';
import {buildProject, generateIdeas, TEMPLATE_IDS, MUSIC_MOODS, LANGS, STYLES} from './tools/script.mjs';
import {startUI} from './tools/ui.mjs';
import {runVoice, resolveVoiceModel, allLines} from './tools/voice.mjs';
import {buildPlan} from './tools/timeline.mjs';
import {LIB_CHARS,voiceById} from './src/lib/library.ts';
import {runSound} from './tools/sound.mjs';
import {qaPlan, qaMedia, writeReport} from './tools/qa.mjs';

applyLocalEnvironment();
const args = parseArgs(process.argv.slice(2));
const aspectKey=()=>{outputSize(args.aspect);return String(args.aspect).replace(':','x');};
const renderDir=id=>args.aspect?ensure(path.join(outDir(id),aspectKey())):outDir(id);
const cmd = args._[0];

const loadProject = (id) => {
  const p=readJson(path.join(projectDir(id),'project.json'));
  if(p.production?.seriesId) {
    const parent=projectDir(p.production.seriesId);
    if(!fs.existsSync(path.join(parent,'project.json')) || fs.existsSync(path.join(parent,'season-transaction.json')))throw new Error('Season publication pending: run recover on the season container');
  }
  return p;
};
const loadPlan = (id) => {
  if (loadProject(id).production?.kind === 'season') throw new Error('Сезон — контейнер. Выберите отдельный эпизод для рендера.');
  const f = path.join(args.aspect?path.join(projectDir(id),'exports',aspectKey()):projectDir(id), 'plan.json');
  if (!fs.existsSync(f)) throw new Error(`plan.json missing — run: node render.mjs timeline ${id}`);
  assertSeriesContext(loadProject(id));
  const plan = readJson(f);
  for(const scene of plan.scenes)for(const line of scene.lines)if(line.file && line.audioHash) {
    const file=path.resolve(projectDir(id),line.file),relative=path.relative(projectDir(id),file);
    if(relative.startsWith('..')||path.isAbsolute(relative)||!fs.existsSync(file)||fileSha(file)!==line.audioHash)throw new Error(`Audio changed: ${line.id}; re-run timeline ${id}`);
  }
  if(plan.projectHash) {
    const project=loadProject(id),legacy={...project};delete legacy.schemaVersion;
    if(plan.projectHash!==sha1(project) && plan.projectHash!==sha1(legacy))throw new Error(`project.json changed — re-run voice and timeline ${id} before rendering`);
  }
  const manifest = readJson(path.join(projectDir(id), 'voice', 'manifest.json'), {source:'none', lines:{}});
  if (plan.voiceManifestHash && plan.voiceManifestHash !== sha1(manifest)) throw new Error(`Voice manifest changed — re-run timeline ${id}`);
  return plan;
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
  if (!args.format && args.topic && String(args.topic).length > 300) throw new Error('--topic is too long (max 300 characters)');
  if (args.topic && !String(args.topic).trim()) throw new Error('--topic is empty');

  const dir = ensure(projectDir(id));
  const log = logger(id, 'script');
  if (!args.format && args.topic && String(args.topic).length > 200) log.warn('topic longer than 200 chars — it will be truncated');
  if(args.format==='series' && fs.existsSync(path.join(dir,'season-transaction.json'))) {const recovered=recoverSeason(id);log.info('Season recovered');return recovered;}
  const existed = fs.existsSync(path.join(dir, 'project.json'));
  if (existed && !args.force) throw new Error(`project ${id} exists (use --force to overwrite)`);
  const options = {id, language: args.lang, duration: args.duration, topic: args.topic, theme: args.theme, characters: args.characters, voiceMode: args.voice, music: args.music, style: args.style, template: args.template === 'auto' ? undefined : args.template,
    voiceModel:args['voice-model'],format:args.format, name:args.name,genre:args.genre,narrative:args.narrative,episodes:args.episodes,season:args.season,
    sources:args.materials ? readJson(path.resolve(String(args.materials))).sources : undefined,
    claims:args.materials ? readJson(path.resolve(String(args.materials))).claims : undefined};
  if(args['continue-from']) {
    if(!args.format || args.format==='series') throw new Error('Продолжение требует отдельного производственного фильма');
    const previous=loadProject(String(args['continue-from']));
    if(previous.production?.kind==='season') throw new Error('Выберите эпизод, а не контейнер сезона');
    options.characters=previous.characters.length;
    options.cast=previous.characters;
    options.context={previousOutcome:previous.production?.outcome || previous.scenes.at(-1)?.lines.at(-1)?.text[previous.language] || previous.mainIdea?.[previous.language]};
    options.continuationFrom=previous.id;
  }
  if (args.format === 'series' && existed) throw new Error('Существующий сезон не перезаписывается: используйте episode для одной серии');
  const project = args.format === 'series' ? createSeason(options) : buildProject(options);
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
  assertSeriesContext(loadProject(id));
  const log = logger(id, 'voice');
  if (args.audio && !path.isAbsolute(String(args.audio)) && fs.existsSync(path.join(projectDir(id), String(args.audio)))) args.audio = path.join(projectDir(id), String(args.audio));
  markStage(id, 'voice', 'running');
  try {
    const project = loadProject(id);
    if (args['voice-model']) {
      const voiceModels = {...project.settings.voiceModels};
      for (const line of allLines(project)) {
        const model = resolveVoiceModel(voiceById(line.voice), project, args);
        if (!/^[a-z]{2}_[A-Z]{2}-[a-z0-9_]+-(x_low|low|medium|high)$/.test(model)) throw new Error(`invalid Piper voice name: ${model}`);
        voiceModels[line.voice] = model;
      }
      project.settings.voiceModels = voiceModels;
      writeJson(path.join(projectDir(id), 'project.json'), project);
    }
    const mf = await runVoice(id, project, log, args); markStage(id, 'voice', 'done', {source: mf.source}); log.info(`voice ready (${mf.source})`); }
  catch (e) { markStage(id, 'voice', 'failed', {error: e.message}); throw e; }
}

async function cmdTimeline(id) {
  assertSeriesContext(loadProject(id));
  const log = logger(id, 'timeline');
  markStage(id, 'timeline', 'running');
  try {
    const plan = buildPlan(id,{aspect:args.aspect});
    exportSubtitles(id,plan);
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

const sceneHash = (plan, sc) => sha1({v: ENGINE_VERSION, src: sourceHash(), fps: plan.fps, width:plan.width,height:plan.height, chars: plan.characters, scene: sc, lang: plan.language, subs: args['no-subs'] ? 0 : 1});
export const scenesDir = (id, draft) => ensure(path.join(renderDir(id), draft ? 'scenes_draft' : 'scenes'));

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
  const {renderMedia, selectComposition} = await import('@remotion/renderer');
  const browserExecutable = await prepareBrowser(log);
  await ensureAssets();
  const serveUrl = await getBundle(log);
  // 8 GB machines cannot afford two Chromium renderers plus x264; default to
  // one worker and let the user opt in explicitly.
  const ramGB = os.totalmem() / 1e9;
  const autoConc = ramGB < 12 ? 1 : Math.max(1, Math.min(3, Math.floor(os.cpus().length / 2)));
  const conc = Number(args.concurrency ?? autoConc);
  if (!Number.isInteger(conc) || conc < 1 || conc > 16) throw new Error('--concurrency must be an integer 1–16');
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
    const comp = await selectComposition({serveUrl, id: 'Scene', inputProps, browserExecutable, chromiumOptions: chromeOpts()});
    const part = file.replace(/\.mp4$/, '.part.mp4');
    let last = -1;
    await renderMedia({
      composition: comp, serveUrl, browserExecutable, codec: 'h264', outputLocation: part, inputProps, muted: true, crf: draft ? 30 : 17, pixelFormat: 'yuv420p',
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
    const list = path.join(renderDir(id), draft ? 'concat_draft.txt' : 'concat.txt');
    fs.writeFileSync(list, plan.scenes.map((s) => `file '${files[s.id].replace(/'/g, "'\\''")}'`).join('\n'));
    const video = path.join(renderDir(id), draft ? 'video_draft.mp4' : 'video.mp4');
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
    const video = path.join(renderDir(id), draft ? 'video_draft.mp4' : 'video.mp4');
    if (!fs.existsSync(video)) throw new Error('video.mp4 missing — run render first');
    const audio = path.join(projectDir(id), 'audio', 'mix_norm.wav');
    if (!fs.existsSync(audio)) throw new Error('mixed audio missing — run sound first');
    const out = path.join(renderDir(id), draft ? 'DRAFT.mp4' : 'FINAL.mp4');
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
    if (!args['plan-only']) parts.push(qaMedia(id, plan, sceneFiles(id, plan, draft), path.join(renderDir(id), draft ? 'DRAFT.mp4' : 'FINAL.mp4'), draft));
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

async function cmdFrame(id,frameOptions={}) {
  const log = logger(id, 'frame');
  const plan = frameOptions.previewPlan||loadPlan(id);
  const previewSource=sourceHash();
  const sc = plan.scenes.find((s) => s.id === (args.scene || plan.scenes[0].id));
  if (!sc) throw new Error('scene not found');
  const t = Number(args.t ?? 1);
  const frame = Math.max(0, Math.min(sc.durFrames - 1, Math.round(t * FPS)));
  const {renderStill, selectComposition} = await import('@remotion/renderer');
  const browserExecutable = await prepareBrowser(log);
  await ensureAssets();
  const serveUrl = await getBundle(log);
  const inputProps = {plan, sceneIndex: sc.index, subtitles: !args['no-subs']};
  const comp = await selectComposition({serveUrl, id: 'Scene', inputProps, browserExecutable, chromiumOptions: chromeOpts()});
  const out = args.out ? path.resolve(String(args.out)) : path.join(ensure(path.join(renderDir(id), 'frames')), `${sc.id}_f${String(frame).padStart(4, '0')}.png`);
  await renderStill({composition: comp, serveUrl, browserExecutable, output: out, frame, inputProps, imageFormat: 'png', scale: Number(args.scale) || 1, chromiumOptions: chromeOpts()});
  if(frameOptions.previewPlan)writeJson(out+'.meta.json',{revision:plan.projectHash,sourceHash:previewSource,scene:sc.id,frame,time:t});
  log.info(`frame -> ${out}`);
  console.log(out);
}

async function cmdAll(id) {
  const log = logger(id, 'all');
  if (!fs.existsSync(path.join(projectDir(id), 'project.json'))) {
    log.info('no project yet — creating one from the current options');
    await cmdNew(id);
  }
  if (loadProject(id).production?.kind==='season') throw new Error('Выберите эпизод сезона: каждый экспортируется отдельно.');
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
  const final = path.join(renderDir(id), args.draft ? 'DRAFT.mp4' : 'FINAL.mp4');
  if (fs.existsSync(final)) log.info(`pipeline finished: ${final}`);
  else log.warn('pipeline finished but FINAL.mp4 not found — check qa report');
}

async function cmdUi(id, args) {
  const port = Number(args.port || process.env.PORT || 7788);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('--port must be 1..65535');
  startUI({port,host:String(args.host || '127.0.0.1'),allowedHosts:args['allowed-host'] ? String(args['allowed-host']).split(',') : []});
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

async function cmdDoctor() {
  if(args.fix)fixEnvironment();
  const checks = [];
  const add = (name, ok, info) => { checks.push({name, ok, info}); console.log(`${ok ? '✔' : '✘'} ${name}${info ? ' — ' + info : ''}`); };
  add('node', Number(process.versions.node.split('.')[0]) >= 22, process.version);
  try { const v = probe.length ? FFMPEG() : ''; add('ffmpeg', true, v); } catch (e) { add('ffmpeg', false, e.message); }
  try { runPython('gen_assets.py', [path.join(ENGINE, 'public')]); add('python+numpy', true, 'grain asset generated'); } catch (e) { add('python+numpy', false, e.message.slice(0, 120)); }
  try { add('piper-tts', true, runPython('tts.py', ['--version']).trim()); } catch (e) { add('piper-tts', false, e.message); }
  const models = fs.existsSync(path.join(ENGINE, 'models', 'piper')) ? fs.readdirSync(path.join(ENGINE, 'models', 'piper')).filter((f) => f.endsWith('.onnx')) : [];
  add('piper models', models.length > 0, models.length ? models.join(', ') : 'missing in this checkout; existing local model files are required for offline TTS');
  try { const browser = await prepareBrowser(null, {env:{...process.env, REMOTION_ALLOW_BROWSER_DOWNLOAD:'0'}}); add('Chrome', true, browser); } catch (e) { add('Chrome', false, e.message); }
  add('remotion', fs.existsSync(path.join(ENGINE, 'node_modules', 'remotion')), 'engine/node_modules');
  add('whisper (onnx)', fs.existsSync(path.join(ENGINE, 'node_modules', '@huggingface', 'transformers')), '@huggingface/transformers');
  if (checks.some((c) => !c.ok)) process.exitCode = 1;
}

const HELP = `Koveyer Dhoix'a — pipeline
  node render.mjs doctor [--fix]                 diagnose / save detected paths (no installs)
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
  node render.mjs preview <id> --scene s01 --t 1    single Chrome frame, estimated timings
  node render.mjs frame <id> --scene s01 --t 2.5
  node render.mjs all <id> [--draft]             whole pipeline (stage logs in projects/<id>/logs/all.log)
  node render.mjs episode <series-id> --episode 2 --force
  node render.mjs smoke [id] [--plan-only] [--voice none] [--aspect 9:16]
  node render.mjs export <id> --aspect 16:9|9:16|1:1 [--render --draft]
  node render.mjs publish <id> [--aspect 9:16]
  node render.mjs voices [--download ru-narrator]    list registry / explicit model download
  node render.mjs subtitles <id> [--strict]         SRT/VTT/ASS + reading QA
  node render.mjs research <id> --topic "Рюриковичи"   offline knowledge and documentary plan
  node render.mjs recover <season-id>             finish interrupted season publication
  node render.mjs history <id>
  node render.mjs restore <id> --snapshot project-...json
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
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  if (cmd === 'ui') return;
  failRunningStage(args._[1], new Error('Остановлено пользователем'));
  process.exit(130);
});
process.on('uncaughtException', (e) => { failRunningStage(args._[1], e); console.error(`✘ ${e.message}`); process.exit(1); });
process.on('unhandledRejection', (e) => { failRunningStage(args._[1], e); console.error(`✘ ${e?.message || e}`); process.exit(1); });

async function cmdPreview(id){const project=loadProject(id);assertSeriesContext(project);const plan=buildPlan(id,{projectOverride:project,persist:false,ignoreAudio:true});return cmdFrame(id,{previewPlan:plan});}
async function cmdPublish(id) {
  const plan=loadPlan(id),dir=ensure(path.join(renderDir(id),'publish'));
  const video=path.join(renderDir(id),args.draft?'DRAFT.mp4':'FINAL.mp4');
  publishPackage(plan,dir,{video});
  const sources=path.join(projectDir(id),'SOURCES.md');if(fs.existsSync(sources))fs.copyFileSync(sources,path.join(dir,'SOURCES.md'));
  exportSubtitles(id,plan);
  fs.cpSync(path.join(projectDir(id),'subtitles'),path.join(dir,'subtitles'),{recursive:true});
  console.log(`Publishing package: ${dir}`);
}
async function cmdExport(id) {
  if(!args.aspect)args.aspect='16:9';
  await cmdTimeline(id);
  if(args.render){args.concurrency=args.concurrency||1;await cmdSound(id);await cmdRender(id);await cmdFinal(id);}
  await cmdPublish(id);
}
async function cmdSmoke(id) {
  id=id||`smoke-${Date.now()}`;
  if(!args._[1])process.on('exit',lockProject(id,{createDir:false}));
  const dir=projectDir(id);if(fs.existsSync(dir))throw new Error('Smoke project exists: choose a new id; no overwrite');
  const pack=findPack('Рюриковичи'),claims=pack.claims.filter(c=>['treaty','moscow-line','ivan4'].includes(c.id));
  const base=buildProject({id,topic:'Проверка документальной графики',duration:30});
  const p=buildDocumentary(base,{...pack,claims,causalLinks:[]});
  p.title={ru:'Smoke: карта, время, родословная',en:'Documentary smoke'};
  p.settings.duration=18;p.settings.voiceMode=args.voice||'tts';p.settings.music='none';
  p.scenes.forEach(s=>s.minDur=6);p.production.smoke=true;
  if(args.extended){
    const envs=['rus_market','rus_port','rus_scriptorium'];
    p.characters=p.characters.map((c,i)=>({...c,...LIB_CHARS.find(x=>x.id===`ensemble${i+1}`),id:c.id,name:c.name,voice:c.voice}));
    p.scenes.forEach((s,i)=>{s.env.id=envs[i];s.crowd={presets:['ensemble1','ensemble2','ensemble3','ensemble4'],count:6,depth:.65};s.transition={in:i?'wipe':'iris',out:'fade'};s.light.grade=['sepia','dawn','silver'][i];s.sfx=[{t:.2,kind:i===2?'page_turn':'bell',gain:.1}];});
    p.settings.music='solemn';
  }
  writeJson(path.join(dir,'project.json'),p);writeDocumentaryArtifacts(id,p);
  args.draft=true;args.concurrency=1;
  if(args['plan-only']){await cmdTimeline(id);await cmdQa(id);await cmdPublish(id);}
  else {await cmdAll(id);await cmdPublish(id);}
  console.log(`Smoke project: ${id}; output: ${renderDir(id)}`);
}
async function cmdVoices() {
  if(args.download || args.preview) {
    const profile=VOICE_REGISTRY.find(p=>p.id===String(args.download||args.preview));
    if(!profile)throw new Error('Unknown voice registry profile');
    const log={info:console.log,warn:console.warn};
    const model=await ensureModel(profile.model,log);
    if(args.preview) {
      const dir=ensure(path.join(OUTPUT,'voice-previews')),file=path.join(dir,`${profile.id}.wav`),jobs=path.join(dir,`${profile.id}.jobs.json`);
      if(fs.existsSync(file)&&!args.force)throw new Error('Preview exists; use --force to regenerate');
      writeJson(jobs,[{id:profile.id,text:String(args.text||'Рюрик и Ольга. История требует проверки источников.'),model,...profile.prosody,lang:profile.language,out:file}]);
      runPython('tts.py',[jobs]);const results=readJson(`${jobs}.results.json`);
      if(results.failed?.length||!fs.existsSync(file))throw new Error('Piper preview failed; inspect results.json');
      console.log(file);
    } else console.log(model);
  } else console.log(JSON.stringify(VOICE_REGISTRY,null,2));
}
async function cmdSubtitles(id) {
  const result=exportSubtitles(id,loadPlan(id));
  console.log(JSON.stringify({errors:result.errors,warnings:result.warnings,cues:result.cues.length},null,2));
  if(result.errors.length||(args.strict&&result.warnings.length))throw new Error('Subtitle QA failed');
}
async function cmdResearch(id) {
  const project=loadProject(id),topic=String(args.topic||project.logline?.[project.language]||project.title[project.language]);
  const pack=research(id,topic);
  if(!pack.claims.length){console.log('Empty offline template created: no matching package, no network used. Project unchanged.');return;}
  // Long topics are partitioned by authored epochs. A manifest is explicit, never silently truncates.
  if(pack.claims.length>Math.floor(project.settings.duration/8)*2) {
    const epochs=[...new Set(pack.claims.map(c=>c.epoch||'research'))];
    const episodes=epochs.map((epoch,i)=>({id:`${id.slice(0,30)}-e${String(i+1).padStart(2,'0')}`,epoch,claims:pack.claims.filter(c=>(c.epoch||'research')===epoch)}));
    for(const e of episodes) {
      const childDir=projectDir(e.id);
      if(fs.existsSync(childDir))throw new Error(`Episode exists: ${e.id}; no overwrite`);
    }
    for(const e of episodes) {
      const p=buildDocumentary({...project,id:e.id,settings:{...project.settings,duration:Math.max(30,e.claims.length*5)}},{...pack,claims:e.claims,causalLinks:(pack.causalLinks||[]).filter(l=>e.claims.some(c=>c.id===l.cause)&&e.claims.some(c=>c.id===l.consequence))});
      writeJson(path.join(projectDir(e.id),'project.json'),p);writeDocumentaryArtifacts(e.id,p);
    }
    writeJson(path.join(projectDir(id),'documentary-episodes.json'),{episodes:episodes.map(({claims,...e})=>e)});
    console.log('Topic split into epoch episodes; see documentary-episodes.json');return;
  }
  const updated=buildDocumentary(project,pack);
  writeJson(path.join(projectDir(id),'project.json'),updated);writeDocumentaryArtifacts(id,updated);
  console.log(`documentary-rules-v2: ${pack.claims.length} claims; offline bibliography requires manual review`);
}
async function cmdRecover(id) {console.log(recoverSeason(id) ? 'Season recovered' : 'No pending transaction');}
async function cmdHistory(id) {console.log(JSON.stringify(listHistory(projectDir(id)),null,2));}
async function cmdRestore(id) {console.log(`Restored ${restoreSnapshot(projectDir(id),String(args.snapshot || ''))}`);}
async function cmdEpisode(id) { const p=regenerateEpisode(id,Number(args.episode),!!args.force); console.log(`Episode ready: ${p.id}`); }

const table = {preview:cmdPreview,smoke:cmdSmoke,export:cmdExport,publish:cmdPublish,voices:cmdVoices,subtitles:cmdSubtitles,research:cmdResearch,recover:cmdRecover,history:cmdHistory,restore:cmdRestore,episode:cmdEpisode, idea: cmdIdea, new: cmdNew, voice: cmdVoice, timeline: cmdTimeline, scenes: cmdScenes, sound: cmdSound, render: cmdRender, final: cmdFinal, qa: cmdQa, frame: cmdFrame, all: cmdAll, list: cmdList, doctor: cmdDoctor, ui: cmdUi};
try {
  if (!cmd || !table[cmd]) { console.log(HELP); process.exit(cmd ? 1 : 0); }
  const id = args._[1];
  if (!['smoke','voices', 'idea', 'list', 'doctor', 'new', 'ui', 'restore', 'history', 'recover'].includes(cmd)) need(id);
  if (!['voices','idea', 'list', 'doctor', 'ui'].includes(cmd) && id) {
    const unlock = lockProject(id,{createDir:cmd!=='smoke'});
    process.on('exit', unlock);
  }
  await table[cmd](id, args);
  process.exit(process.exitCode || 0);
} catch (e) {
  console.error(`✘ ${e.message}`);
  if (process.env.DEBUG) console.error(e.stack);
  process.exit(1);
}
