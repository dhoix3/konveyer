import {makeUniversal,reviewUniversal,assertPublicationAllowed} from './universal.mjs';
import {topicProfile} from './topic-profile.mjs';
import {STUDIO_STYLE,STUDIO_SCRIPT} from './studio-page.mjs';
import {prepareMaterials} from './research-materials.mjs';
import {EDITOR_MARKUP,EDITOR_SCRIPT} from './editor-page.mjs';
import {catalog,previewProject,editorProject,editScene,travelHistory,documentaryWizard,frameSVG,estimate} from './editor.mjs';
import {findPack,validatePack} from './knowledge.mjs';
// Local web UI for Koveyer Dhoix'a — zero dependencies (node:http only).
//
// Serves a single page where the user enters the topic, duration, language,
// voice, style and music, creates a project, runs pipeline stages with live
// progress/log tail, and downloads the finished MP4.  It spawns the very same
// `render.mjs` CLI the terminal uses (same logs, same state.json), so the UI
// and the CLI stay fully interchangeable and the architecture is unchanged.
//
//   node render.mjs ui [--port 7788]
import {HttpError, readBody, createSecurity, LOGIN_PAGE} from './ui-security.mjs';
import fs from 'node:fs';
import os from 'node:os';
import {listHistory} from './storage.mjs';
import {lockProject} from './project-lock.mjs';
import {recoverAllSeasons, refreshSeasonContexts} from './series.mjs';
import {normalizeBrief} from './production.mjs';
import path from 'node:path';
import http from 'node:http';
import {spawn, spawnSync} from 'node:child_process';
import {
  ENGINE, PROJECTS, OUTPUT, projectDir, outDir, ensure, readJson, writeJson,
  safeId, assertId, markStage,sha1,sourceHash,
} from './lib.mjs';
import {MUSIC_MOODS, LANGS, STYLES, TEMPLATE_IDS} from './script.mjs';

const STAGES = ['voice', 'timeline', 'scenes', 'sound', 'render', 'final', 'qa'];
const MODEL_RE = /^[a-z]{2}_[A-Z]{2}-[a-z0-9_]+-(x_low|low|medium|high)$/;
const FILE_WHITELIST = new Set(['FINAL.mp4', 'DRAFT.mp4', 'video.mp4', 'video_draft.mp4']);

// latest job per project id
const jobs = new Map();

function listProjects() {
  if (!fs.existsSync(PROJECTS)) return [];
  const rows = [];
  for (const d of fs.readdirSync(PROJECTS)) {
    const pj = path.join(PROJECTS, d, 'project.json');
    if (!fs.existsSync(pj)) continue;
    let p = {};
    try { p = readJson(pj, {});if(!p||typeof p!=='object'||Array.isArray(p))throw new Error('ожидается объект проекта'); } catch(e) {p={__uiError:'Повреждён project.json: '+e.message,title:{ru:'Повреждённый проект · '+d}};}
    let contextWarning=p.__uiError||null;
    if(p.production?.kind==='season' && !jobs.get(d)?.running) {
      let unlock;try{unlock=lockProject(d);p=refreshSeasonContexts(d);}catch(e){contextWarning=e.message;}finally{unlock?.();}
    }
    if(p.production?.seriesId) {
      let parent;try{parent=readJson(path.join(projectDir(p.production.seriesId),'project.json'),null);}catch(e){contextWarning='Повреждён контекст сезона: '+e.message;}
      const entry=parent?.production?.episodes?.find(e=>e.id===d);
      if(entry?.stale)contextWarning=entry.staleReason;
    }
    if(p.production?.seriesId && fs.existsSync(path.join(projectDir(p.production.seriesId),'season-transaction.json')))continue;
    const statePath = path.join(PROJECTS, d, 'state.json');
    let state;try{state=readJson(statePath,{stages:{}})||{stages:{}};}catch(e){state={stages:{}};contextWarning='Повреждён state.json: восстановите из истории; '+e.message;}
    const job = jobs.get(d);
    let mtime = 0;
    try { mtime = fs.statSync(pj).mtimeMs; } catch {}
    rows.push({
      id: d, contextWarning,
      title: p.title || {},
      language: p.language || 'ru',
      scenes: Array.isArray(p.scenes) ? p.scenes.length : 0,
      template: p.idea?.template,
      production:p.production ? {kind:p.production.kind,seriesId:p.production.seriesId,episodes:p.production.episodes,format:p.production.brief?.format} : null,
      topic: p.idea?.topic,
      stages: state.stages || {},
      elapsedSeconds:jobs.get(d)?.running?Math.floor((Date.now()-jobs.get(d).started)/1000):null,
      final: fs.existsSync(path.join(OUTPUT, d, 'FINAL.mp4')),
      draft: fs.existsSync(path.join(OUTPUT, d, 'DRAFT.mp4')),
      job: job ? {stage: job.stage, running: job.running, code: job.code, started: job.started} : null,
      mtime,
    });
  }
  rows.sort((a, b) => b.mtime - a.mtime);
  return rows;
}

function tailFile(file, n = 160) {
  try {
    if (!fs.existsSync(file)) return [];
    const fd = fs.openSync(file, 'r');
    let text;
    try { const size = fs.fstatSync(fd).size; const buffer = Buffer.alloc(Math.min(size, 128 * 1024)); fs.readSync(fd, buffer, 0, buffer.length, Math.max(0, size - buffer.length)); text = buffer.toString('utf8'); }
    finally { fs.closeSync(fd); }
    const lines = text.split('\n').filter(Boolean);
    return lines.slice(-n);
  } catch {
    return [];
  }
}

function latestLog(id) {
  const dir = path.join(PROJECTS, id, 'logs');
  if (!fs.existsSync(dir)) return null;
  let best = null, bestM = 0;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    try {
      const m = fs.statSync(p).mtimeMs;
      if (m > bestM) { bestM = m; best = p; }
    } catch {}
  }
  return best;
}

function startJob(id, stage, extra = []) {
  assertId(id);
  const running = jobs.get(id);
  if (running?.running) throw new HttpError(409, `проект ${id} уже выполняется: ${running.stage}`);
  const logDir = ensure(path.join(projectDir(id), 'logs'));
  const logFile = path.join(logDir, `ui_${stage}.log`);
  const fd = fs.openSync(logFile, 'a');
  fs.writeSync(fd, `\n===== ui run: ${stage} ${extra.join(' ')} @ ${new Date().toISOString()} =====\n`);
  const child = spawn(process.execPath, [path.join(ENGINE, 'render.mjs'), stage, id, ...extra], {
    cwd: ENGINE, detached: true, stdio: ['ignore', fd, fd],
  });
  const job = {id, stage, pid: child.pid, started: Date.now(), running: true, code: null, logFile};
  child.on('error', (e) => { job.running = false; job.code = -1; job.error = String(e.message); try { fs.closeSync(fd); } catch {} });
  child.on('exit', (code) => { job.running = false; job.code = code; job.ended = Date.now(); try { fs.closeSync(fd); } catch {} });
  child.unref();
  jobs.set(id, job);
  return job;
}

function stopJob(id) {
  const job = jobs.get(id);
  if (!job?.running) throw new HttpError(409, `для проекта ${id} нет активной задачи`);
  if (process.platform === 'win32') {
    const r = spawnSync('taskkill', ['/PID', String(job.pid), '/T', '/F'], {encoding: 'utf8', windowsHide: true});
    if (r.status !== 0) throw new HttpError(500, `Не удалось остановить дерево процессов: ${r.stderr || r.error?.message}`);
  } else {
    try { process.kill(-job.pid, 'SIGTERM'); }
    catch (e) { if (e.code !== 'ESRCH') throw e; }
  }
  const state = readJson(path.join(projectDir(id), 'state.json'), {stages:{}});
  for (const [stage, value] of Object.entries(state.stages || {})) {
    if (value.status === 'running') markStage(id, stage, 'failed', {error:'Остановлено пользователем'});
  }
  job.stopped = true;
  return job;
}


function createProject(body) {
  const id = String(body.id || '').trim();
  if (!safeId(id)) throw new HttpError(400, 'некорректный id проекта: разрешены буквы, цифры, «-» и «_», до 40 символов');
  if (jobs.get(id)?.running) throw new HttpError(409, 'Нельзя перезаписать выполняющийся проект');
  if(body.aspect&&!['16:9','9:16','1:1'].includes(body.aspect))throw new HttpError(400,'Неизвестное соотношение сторон');
  const narrator = String(body.narrator || '');
  if (narrator && !MODEL_RE.test(narrator)) throw new HttpError(400, 'некорректная модель голоса');
  const topic = String(body.topic ?? '').trim();
  if (topic.length > (body.format ? 4000 : 300)) throw new HttpError(400, 'тема превышает допустимую длину');
  const duration = Number(body.duration);
  if (!Number.isFinite(duration) || duration < 25 || duration > 180) throw new HttpError(400, 'длительность должна быть 25–180 секунд');
  const lang = LANGS.includes(body.lang) ? body.lang : 'ru';
  const characters = [1, 2, 3].includes(Number(body.characters)) ? Number(body.characters) : 2;
  let music;
  if (!body.music || body.music === 'auto') music = undefined;
  else if (MUSIC_MOODS.includes(body.music)) music = body.music;
  else throw new HttpError(400, 'неизвестная музыка');
  const style = Object.prototype.hasOwnProperty.call(STYLES, body.style) ? body.style : 'cinematic-stickman';
  const voiceMode = ['tts', 'none'].includes(body.voiceMode) ? body.voiceMode : 'tts';
  const template = !body.template || body.template === 'auto' ? undefined
    : (body.template === 'freeform' || TEMPLATE_IDS.includes(body.template) ? body.template : undefined);
  if (body.template && body.template !== 'auto' && !template) throw new HttpError(400, 'неизвестный шаблон');

  const args = ['new', id, '--lang', lang, '--duration', String(duration), '--characters', String(characters),
    '--voice', voiceMode, '--style', style];
  if (topic) args.push('--topic', topic);
  if (music) args.push('--music', music);
  if (template) args.push('--template', template);
  if (body.force) args.push('--force');
  if(body.continueFrom) { if(!safeId(body.continueFrom)) throw new HttpError(400,'bad continuation id'); args.push('--continue-from',body.continueFrom); }
  let scratch;
  if (body.format) {
    const materials=body.materials || {};
    if(body.format==='documentary'&&materials.schemaVersion===1){try{validatePack(materials);}catch(e){throw new HttpError(400,e.message);}}
    const canonical=body.format==='documentary'&&materials.schemaVersion===1;
    try { normalizeBrief({name:body.name,topic,format:body.format,genre:body.genre,narrative:body.narrative,episodes:body.episodes,
      language:lang,duration,characters,sources:canonical?[]:materials.sources,claims:canonical?[]:materials.claims}); } catch(e) { throw new HttpError(400,e.message); }
    if(narrator) args.push('--voice-model',narrator);
    args.push('--format',body.format,'--name',body.name || topic,'--genre',body.genre || 'drama','--narrative',body.narrative || 'chronological','--episodes',String(body.episodes || 3));
    scratch=fs.mkdtempSync(path.join(os.tmpdir(),'koveyer-materials-'));
    const file=path.join(scratch,'materials.json');writeJson(file,materials);args.push('--materials',file);
  }

  let r;
  try { r = spawnSync(process.execPath, [path.join(ENGINE, 'render.mjs'), ...args], {cwd: ENGINE, encoding: 'utf8'}); }
  finally { if(scratch) fs.rmSync(scratch,{recursive:true,force:true}); }
  if (r.status !== 0) throw new HttpError(400, (r.stderr || r.stdout || 'create failed').trim().split('\n').slice(-1)[0]);

  // Optional narrator voice model (applied before the voice stage runs).
  if (narrator && !body.format) {
    if (!MODEL_RE.test(narrator)) throw new Error('некорректная модель голоса');
    const pj = path.join(projectDir(id), 'project.json');
    const p = readJson(pj);
    p.settings ||= {};
    p.settings.voiceModels = {...(p.settings.voiceModels || {}), narrator};
    writeJson(pj, p);
  }
  if(body.aspect){const file=path.join(projectDir(id),'project.json');const p=readJson(file);p.settings.aspect=body.aspect;writeJson(file,p);}
  let summary = null;
  try {
    const p = readJson(path.join(projectDir(id), 'project.json'));
    summary = {title: p.title?.[p.language], scenes: p.scenes.length, template: p.idea.template, domain: p.idea.theme};
  } catch {}
  return {id, summary};
}

// ---------------------------------------------------------------- HTTP

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'});
  res.end(body);
}


function serveFile(req, res, file) {
  if (!fs.existsSync(file)) return json(res, 404, {error: 'file not found'});
  const stat = fs.statSync(file);
  const ext = path.extname(file).toLowerCase();
  const type = ext === '.mp4' ? 'video/mp4' : ext === '.png'?'image/png':ext === '.json' ? 'application/json' : 'application/octet-stream';
  const range = req.headers.range;
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (m) {
      let start = m[1] ? Number(m[1]) : Math.max(0, stat.size - Number(m[2]));
      let end = m[1] && m[2] ? Number(m[2]) : stat.size - 1;
      if (!m[1] && (!m[2] || Number(m[2]) <= 0)) start = stat.size;
      if (start <= end && start < stat.size) {
        end = Math.min(end, stat.size - 1);
        res.writeHead(206, {
          'content-type': type, 'content-length': end - start + 1,
          'content-range': `bytes ${start}-${end}/${stat.size}`, 'accept-ranges': 'bytes',
        });
        fs.createReadStream(file, {start, end}).pipe(res);
        return;
      }
    }
    res.writeHead(416, {'content-range': `bytes */${stat.size}`});
    return res.end();
  }
  res.writeHead(200, {'content-type': type, 'content-length': stat.size, 'accept-ranges': 'bytes'});
  fs.createReadStream(file).pipe(res);
}

const PAGE = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Koveyer Dhoix'a</title>
<style>
:root{--bg:#0d1117;--panel:#161b22;--line:#30363d;--text:#e6edf3;--dim:#8b949e;--acc:#42dbc8;--ok:#3fb950;--err:#f85149;--warn:#d29922}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:14px/1.55 Segoe UI,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
header{padding:14px 20px;border-bottom:1px solid var(--line);display:flex;align-items:baseline;gap:14px}
header h1{font-size:17px;margin:0}header .sub{color:var(--dim);font-size:12px}
main{display:grid;grid-template-columns:260px 1fr 1fr;gap:14px;padding:14px 20px;max-width:1500px;margin:0 auto}
@media(max-width:1000px){main{grid-template-columns:1fr}}
section{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px}
h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--dim);margin:0 0 10px}
label{display:block;margin:8px 0 3px;color:var(--dim);font-size:12px}
input,select,textarea{width:100%;background:#0d1117;color:var(--text);border:1px solid var(--line);border-radius:6px;padding:7px 9px;font:inherit}
textarea{min-height:64px;resize:vertical}
.row{display:flex;gap:10px}.row>div{flex:1}
button{background:#238636;color:#fff;border:0;border-radius:6px;padding:8px 14px;font:inherit;font-weight:600;cursor:pointer}
button.secondary{background:#21262d;border:1px solid var(--line);color:var(--text);font-weight:400}
button.danger{background:#da3633}
button:disabled{opacity:.45;cursor:not-allowed}
button.small{padding:4px 9px;font-size:12px}
.proj{padding:8px 10px;border:1px solid var(--line);border-radius:8px;margin-bottom:7px;cursor:pointer}
.proj.active{border-color:var(--acc);background:#121a24}
.proj .t{font-weight:600}.proj .m{color:var(--dim);font-size:12px}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
.chip{border:1px solid var(--line);border-radius:20px;padding:4px 10px;font-size:12px;color:var(--dim);display:flex;gap:6px;align-items:center}
.chip.done{border-color:#2ea043;color:var(--ok)}.chip.failed{border-color:var(--err);color:var(--err)}
.chip.running{border-color:var(--warn);color:var(--warn)}
.dot{width:7px;height:7px;border-radius:50%;background:currentColor}
pre#log{background:#010409;border:1px solid var(--line);border-radius:8px;padding:10px;height:340px;overflow:auto;font:12px/1.4 ui-monospace,Consolas,monospace;white-space:pre-wrap;word-break:break-all;margin:0}
.msg{margin-top:8px;font-size:13px;min-height:18px}.msg.err{color:var(--err)}.msg.ok{color:var(--ok)}
a.dl{display:inline-block;margin:6px 8px 0 0;color:var(--acc);text-decoration:none;font-weight:600}
.bar{height:6px;background:#21262d;border-radius:4px;overflow:hidden;margin:8px 0}
.bar i{display:block;height:100%;background:linear-gradient(90deg,#1f6feb,#58a6ff);width:30%;animation:slide 1.1s infinite}
@keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}
.muted{color:var(--dim);font-size:12px}
</style>${STUDIO_STYLE}</head><body>
<header><h1>&#127916; Koveyer Dhoix'a</h1><span class="sub">идея &rarr; сценарий &rarr; голос &rarr; сцены &rarr; звук &rarr; MP4</span></header>
<main>
<section>
  <h2>Проекты</h2>
  <div id="projects"><div class="muted">загрузка…</div></div>
</section>
<section>
  <h2>Создать производство</h2>
  <p class="muted">Локальный правиловый сценарист · стилизованная SVG-графика · не LLM</p>
  <h3>1. Замысел</h3>
  <details><summary>Универсальный вход · офлайн, экспериментальный</summary><label><input id="universalEnabled" type="checkbox"> Создать через make вместо legacy сценариста</label><label>Тип ролика</label><select id="universalFormat"><option value="explainer">Объяснение</option><option value="documentary">Документальный</option><option value="story">История / сказка</option><option value="tutorial">Обучение</option><option value="top">Топ-N</option><option value="promo">Промо</option><option value="kids">Детский</option><option value="skit">Скетч</option><option value="review">Обзор</option></select><label>Достоверность</label><select id="universalMode"><option value="">Определить по теме/материалам</option><option value="verified">По материалам · требует проверки</option><option value="unverified-draft">Непроверенная заявка</option><option value="creative">Вымысел</option></select><p class="muted">Сеть не используется. Веб-исследование пока не реализовано. Тип ролика сохраняется как намерение; отдельные структуры сценария будут в следующей фазе. Без материалов factual режим создаёт заявку, не факты.</p></details>
  <label for="projectName">Название</label><input id="projectName" maxlength="160" placeholder="Название фильма или сезона">
  <div class="row"><div><label for="format">Формат</label><select id="format"><option value="fiction">Художественный фильм</option><option value="documentary">Документальный разбор</option><option value="reconstruction">Учебная реконструкция</option><option value="series">Мини-сериал (вымысел)</option></select></div>
  <div><label for="genre">Жанр</label><select id="genre"><option value="drama">Драма</option><option value="science">Научный</option><option value="history">Исторический</option><option value="disaster">Катастрофа</option><option value="fantasy">Фантастика</option><option value="post-apocalyptic">Постапокалипсис</option></select></div></div>
  <label for="topic">Тема видео</label>
  <textarea id="topic" maxlength="4000" placeholder="Тема, конфликт, события и желаемое завершение"></textarea>
  <label for="continueFrom">Продолжение проекта (id, необязательно)</label><input id="continueFrom" maxlength="40" placeholder="Например: terra-e01">
  <h3>2. Производство</h3>
  <label for="aspect">Соотношение сторон</label><select id="aspect"><option value="16:9">16:9 · горизонтальное</option><option value="9:16">9:16 · вертикальное</option><option value="1:1">1:1 · квадрат</option></select>
  <div class="row"><div><label for="episodes">Эпизодов (только сериал)</label><input id="episodes" type="number" min="1" max="12" value="3"></div><div><label for="narrative">Повествование</label><select id="narrative"><option value="chronological">Хронология</option><option value="investigation">Исследование</option><option value="character">От лица героев</option></select></div></div>
  <div class="row">
    <div><label for="duration">Длительность, сек</label><input id="duration" type="number" min="25" max="180" value="90"></div>
    <div><label for="lang">Язык</label><select id="lang"><option value="ru">Русский</option><option value="en">English</option></select></div>
  </div>
  <div class="row">
    <div><label for="characters">Персонажей</label><select id="characters"><option>1</option><option selected>2</option><option>3</option></select></div>
    <div><label for="narrator">Голос диктора</label><select id="narrator"></select></div>
  </div>
  <div class="row">
    <div><label for="style">Стиль</label><select id="style"></select></div>
    <div><label for="music">Музыка</label><select id="music"></select></div>
  </div>
  <h3>3. Материалы и запуск</h3>
  <details id="evidencePanel"><summary>Источники и утверждения (JSON)</summary><p class="muted">Для документального разбора. supported означает «подкреплено источником пользователя», а не независимую проверку. Без материалов создаётся только исследовательская заявка.</p><textarea id="materials" placeholder='{"sources":[],"claims":[]}'></textarea></details>
  <div class="row">
    <div><label for="template">Шаблон</label><select id="template"><option value="auto">авто (по теме)</option><option value="freeform">свободная тема</option></select></div>
    <div><label for="voiceMode">Озвучка</label><select id="voiceMode"><option value="tts">Piper TTS</option><option value="none">без голоса (музыка)</option></select></div>
  </div>
  <div class="row">
    <div><label for="pid">id проекта</label><input id="pid" placeholder="авто"></div>
    <div style="display:flex;align-items:flex-end;padding-bottom:8px"><label style="margin:0;color:var(--text)"><input type="checkbox" id="force" style="width:auto"> перезаписать</label></div>
  </div>
  <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
    <button onclick="create()">Создать проект</button>
    <button class="secondary" onclick="run('all')">&#9654; Запустить всё</button>
    <button class="danger" onclick="stop()">&#9632; Остановить</button>
  </div>
  <button class="small secondary" onclick="checkReady()">Проверить компоненты</button>
  <button class="small secondary" onclick="openFolder('project')">Папка проекта</button>
  <button class="small secondary" onclick="openFolder('output')">Папка видео</button>
  <div class="msg" id="msg" role="status"></div>
</section>
<section>
  <h2 id="stageTitle">Этапы</h2>
  <div class="chips" id="chips"><span class="muted">выберите проект</span></div>
  <div class="muted" id="progress" role="status" style="display:none">Генерация выполняется. Этапы и журнал обновляются автоматически.</div>
  <button class="small secondary" onclick="restoreVersion()">История / восстановить</button>
  <button class="small secondary" onclick="previewScript()">Предпросмотр сценария</button>
  <button class="small secondary" onclick="regenerateEpisode()">Пересоздать эпизод сезона</button>
  <pre id="scriptPreview" style="white-space:pre-wrap" hidden></pre>
  <video id="player" controls preload="none" style="width:100%;max-height:440px;margin-top:12px" hidden></video>
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px" id="stageBtns"></div>
  <label style="display:flex;gap:6px;align-items:center;color:var(--dim);font-size:12px;margin:0 0 8px">
    <input type="checkbox" id="draft" style="width:auto"> Быстрый черновик · половинное разрешение
  </label>
  <div id="downloads"></div>
  <h2 style="margin-top:14px">Журнал</h2>
  <pre id="log">&mdash;</pre>
</section>
${EDITOR_MARKUP}
</main>
<script>
var UI_LANG='ru';
var STAGES = ['voice','timeline','scenes','sound','render','final','qa'];
var LABELS = {voice:'голос',timeline:'таймлайн',scenes:'сцены',sound:'звук',render:'рендер',final:'сборка MP4',qa:'контроль качества'};
var current = null, pollTimer = null, logTimer = null;
var projectsCache = [];
function el(id){ return document.getElementById(id); }
function msg(t, cls){ var m = el('msg'); m.textContent = t || ''; m.className = 'msg ' + (cls || ''); }
async function api(url, opt){
  var r = await fetch(url, opt);
  var j = await r.json().catch(function(){ return {}; });
  if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
  return j;
}
function esc(s){
  return String(s).replace(/[&<>"]/g, function(c){
    return c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;';
  });
}
function slug(s){
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
}
function fillSelects(){
  var styles = [['cinematic-stickman','Кинематографичный'],['noir','Нуар'],['warm','Тёплый'],['vivid','Яркий']];
  var h = '';
  for (var i = 0; i < styles.length; i++) h += '<option value="' + styles[i][0] + '">' + styles[i][1] + '</option>';
  el('style').innerHTML = h;
  var moods = [['auto','авто (по теме)'],['dark_ambient','dark_ambient'],['tense','tense'],['mystery','mystery'],['epic','epic'],['emotional','emotional'],['lofi','lofi']];
  h = '';
  for (var j = 0; j < moods.length; j++) h += '<option value="' + moods[j][0] + '">' + moods[j][1] + '</option>';
  el('music').innerHTML = h;
  fillNarrator();
}
function fillNarrator(){
  var lang = el('lang').value;
  var opts = lang === 'ru'
    ? [['','по умолчанию (denis)'],['ru_RU-dmitri-medium','dmitri'],['ru_RU-ruslan-medium','ruslan'],['ru_RU-irina-medium','irina (женский)']]
    : [['','по умолчанию (ryan)'],['en_US-amy-medium','amy (женский)']];
  var h = '';
  for (var i = 0; i < opts.length; i++) h += '<option value="' + opts[i][0] + '">' + opts[i][1] + '</option>';
  el('narrator').innerHTML = h;
}
el('lang').addEventListener('change', fillNarrator);
function updateFormat(){
  var format=el('format').value;
  el('episodes').disabled=format!=='series';
  el('template').disabled=!!format;
  el('evidencePanel').hidden=format!=='documentary' && format!=='reconstruction';
}
el('format').addEventListener('change',updateFormat);
el('topic').addEventListener('input', function(){
  if (!el('pid').dataset.touched) el('pid').value = slug(el('topic').value);
});
el('pid').addEventListener('input', function(){ el('pid').dataset.touched = '1'; });

function renderProjects(list){
  projectsCache = list || [];
  var e = el('projects');
  if (!projectsCache.length){ e.innerHTML = '<div class="muted">проектов нет — создайте первый</div>'; return; }
  var h = '';
  for (var i = 0; i < projectsCache.length; i++){
    var p = projectsCache[i];
    var title = (p.title && (p.title[p.language] || p.title.ru)) || p.id;
    var status = p.contextWarning ? '⚠ Контекст устарел или недоступен: см. сценарий сезона' : p.job && p.job.running ? '⏳ ' + p.job.stage : (p.final ? 'MP4 сохранён · проверьте этапы' : '…');
    h += '<div class="proj ' + (p.id === current ? 'active' : '') + '" onclick="select(\\'' + p.id + '\\')">' +
      '<div class="t">' + esc(title) + '</div>' +
      '<div class="m">' + esc(p.id) + ' · ' + p.scenes + ' сцен · ' + esc(p.template || 'freeform') + '</div>' +
      '<div class="m">' + status + '</div></div>';
  }
  e.innerHTML = h;
}
function select(id){ current = id; refresh(); loadLog(); }
async function refresh(){
  try {
    var st = await api('/api/state');
    renderProjects(st.projects);
    renderStage();
  } catch (e) { msg('Нет связи с сервером: ' + e.message, 'err'); }
}
async function loadLog(){
  if (!current){ el('log').textContent = '—'; return; }
  try {
    var r = await api('/api/log?id=' + encodeURIComponent(current));
    var text = r.lines.length ? r.lines.join(String.fromCharCode(10)) : '(пусто)';
    var box = el('log');
    var nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
    box.textContent = text;
    if (nearBottom) box.scrollTop = box.scrollHeight;
  } catch (e) {}
}
async function create(){
  try {
    msg('создание…');
    if(el('universalEnabled').checked){var materials=JSON.parse(el('materials').value||'null');var made=await api('/api/universal/make',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:el('pid').value||undefined,topic:el('topic').value,format:el('universalFormat').value,mode:el('universalMode').value||undefined,duration:Number(el('duration').value),language:el('lang').value,voiceMode:el('voiceMode').value,materials:materials})});current=made.id;msg(made.next+' · '+made.mode,'ok');await refresh();loadLog();return;}

    var body = {
      continueFrom:el('continueFrom').value,name:el('projectName').value,format:el('format').value,genre:el('genre').value,narrative:el('narrative').value,episodes:el('episodes').value,
      materials:JSON.parse(el('materials').value || '{}'),
      aspect:el('aspect').value, topic: el('topic').value, duration: el('duration').value, lang: el('lang').value,
      characters: el('characters').value, style: el('style').value, music: el('music').value,
      template: el('template').value, voiceMode: el('voiceMode').value, narrator: el('narrator').value,
      force: el('force').checked
    };
    body.id = (el('pid').value || '').trim() || slug(el('topic').value) || ('film-' + Date.now().toString(36).slice(-4));
    var r = await api('/api/create', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body)});
    current = r.id;
    msg('проект ' + r.id + ' создан' + (r.summary ? ': ' + r.summary.title : ''), 'ok');
    refresh(); loadLog();
  } catch (e) { msg(e.message, 'err'); }
}
async function run(stage){
  if (!current){ msg('сначала выберите проект', 'err'); return; }
  try {
    var draft = el('draft').checked;
    await api('/api/run', {method:'POST', headers:{'content-type':'application/json'},
      body: JSON.stringify({id: current, stage: stage, draft: draft})});
    msg('запущен этап: ' + stage, 'ok');
    renderStage(); loadLog();
  } catch (e) { msg(e.message, 'err'); }
}
async function stop(){
  if (!current) return;
  try {
    await api('/api/stop', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({id: current})});
    msg('остановлено', 'ok');
  } catch (e) { msg(e.message, 'err'); }
}
function renderStage(){
  var chips = el('chips'), btns = el('stageBtns');
  var p = null;
  for (var i = 0; i < projectsCache.length; i++) if (projectsCache[i].id === current) p = projectsCache[i];
  if (!current){ chips.innerHTML = '<span class="muted">выберите проект</span>'; btns.innerHTML = ''; el('downloads').innerHTML = ''; return; }
  var st = (p && p.stages) || {};
  var h = '';
  for (var s = 0; s < STAGES.length; s++){
    var key = STAGES[s], v = st[key];
    var status = v ? v.status : '—';
    var cls = status === 'done' ? 'done' : status === 'failed' ? 'failed' : status === 'running' ? 'running' : '';
    h += '<span class="chip ' + cls + '"><span class="dot"></span>' + LABELS[key] + ': ' + status + '</span>';
  }
  chips.innerHTML = h;
  h = '';
  for (var b = 0; b < STAGES.length; b++){
    h += '<button class="small secondary" onclick="run(\\'' + STAGES[b] + '\\')">' + LABELS[STAGES[b]] + '</button>';
  }
  h += '<button class="small secondary" onclick="run(\\'all\\')">всё</button>';
  btns.innerHTML = h;
  var running = p && p.job && p.job.running;
  var container = p && p.production && p.production.kind==='season';
  el('progress').style.display = running ? 'block' : 'none';
  var title = p ? ((p.title && (p.title[p.language] || p.title.ru)) || current) : current;
  el('stageTitle').textContent = (UI_LANG==='en'?'Stages — ':'Этапы — ') + title;
  var dl = '';
  if (p && p.final) dl += '<a class="dl" href="/file?id=' + encodeURIComponent(current) + '&name=FINAL.mp4">&#11015; FINAL.mp4</a>';
  if (p && p.draft) dl += '<a class="dl" href="/file?id=' + encodeURIComponent(current) + '&name=DRAFT.mp4">&#11015; DRAFT.mp4</a>';
  el('downloads').innerHTML = dl;
  var player = el('player');
  var videoUrl = p && (p.final || p.draft) ? '/file?id=' + encodeURIComponent(current) + '&name=' + (p.final ? 'FINAL.mp4' : 'DRAFT.mp4') : '';
  if (player.dataset.url !== videoUrl) { player.dataset.url = videoUrl; if (videoUrl) player.src = videoUrl; else player.removeAttribute('src'); }
  player.hidden = !videoUrl;
  var buttons = btns.querySelectorAll('button');
  for (var j = 0; j < buttons.length; j++) buttons[j].disabled = !!running || !!container || !!(p && p.contextWarning);
}
async function checkReady(){
  msg('Проверка компонентов…');
  try { var result = await api('/api/check', {method:'POST',headers:{'content-type':'application/json'},body:'{}'});
    el('log').textContent = result.report;
    msg(result.ready ? 'Компоненты готовы' : 'Есть проблемы: см. журнал проверки', result.ready ? 'ok' : 'err');
  } catch(e){ msg(e.message, 'err'); }
}
async function openFolder(target){
  if (!current) return;
  try { await api('/api/open', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({id:current,target:target})}); }
  catch(e){msg(e.message,'err');}
}
async function regenerateEpisode(){
  if(!current) return;
  var number=Number(prompt('Номер эпизода выбранного сезона'));
  if(!Number.isInteger(number) || number<1 || !confirm('Пересоздать сценарий только этого эпизода? Другие серии сохранятся.')) return;
  try {await api('/api/episode',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:current,episode:number})});msg('Перегенерация эпизода запущена','ok');}
  catch(e){msg(e.message,'err');}
}
async function restoreVersion(){
  if(!current)return;
  try {
    var result=await api('/api/history?id='+encodeURIComponent(current));
    if(!result.snapshots.length){msg('Снимков пока нет');return;}
    var index=Number(prompt(result.snapshots.map(function(s,i){return (i+1)+'. '+s.file;}).join(String.fromCharCode(10))));
    var snapshot=result.snapshots[index-1];if(!snapshot || !confirm('Восстановить снимок? Текущая версия тоже будет сохранена.'))return;
    await api('/api/restore',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:current,snapshot:snapshot.file})});
    msg('Восстановление запущено; затем пересоберите voice и timeline','ok');
  }catch(e){msg(e.message,'err');}
}
async function previewScript(){
  if (!current) return;
  try { var data = await api('/api/script?id=' + encodeURIComponent(current));
    el('scriptPreview').textContent = (data.production ? JSON.stringify({provider:data.production.provider,notes:data.production.notes,episodes:data.production.episodes},null,2) + String.fromCharCode(10) : '') + data.scenes.map(function(s){return s.id + ': ' + s.lines.join(' ');}).join(String.fromCharCode(10,10));
    el('scriptPreview').hidden = false;
  } catch(e){msg(e.message, 'err');}
}
function startPoll(){
  if (pollTimer) return;
  pollTimer = setInterval(refresh, 1500);
  logTimer = setInterval(loadLog, 2500);
}
async function boot(){
  fillSelects();
  updateFormat();
  await refresh();
  if (!current && projectsCache.length) select(projectsCache[0].id);
  else loadLog();
  startPoll();
}
boot();
</script>
${EDITOR_SCRIPT}
${STUDIO_SCRIPT}
</body></html>`;

export function startUI({port = 7788, host = '127.0.0.1', token = process.env.KOVEYER_GUI_TOKEN, allowedHosts = []} = {}) {
  const security=createSecurity({host,token,allowedHosts});
  recoverAllSeasons();
  const server = http.createServer(async (req, res) => {
    try {
      const u = new URL(req.url, 'http://localhost');
      const p = u.pathname;
      security.checkBoundary(req,server.address().port);
      if(req.method==='POST' && p==='/api/login') {
        const body=await readBody(req,4096);
        if(!security.login(body.token))return json(res,401,{error:'Unauthorized'});
        res.setHeader('set-cookie',security.cookie());return json(res,200,{ok:true});
      }
      if(!security.authorized(req)) {
        if(req.method==='GET' && p==='/'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer'});return res.end(LOGIN_PAGE);}
        return json(res,401,{error:'GUI authentication required'});
      }
      if(req.method==='POST'&&['/api/universal/make','/api/universal/review','/api/universal/profile'].includes(p)){const body=await readBody(req);try{if(p==='/api/universal/make')return json(res,200,makeUniversal(body));if(p==='/api/universal/profile')return json(res,200,topicProfile(body.topic,body));if(!safeId(body.id))throw new Error('Некорректный id');return json(res,200,reviewUniversal(body.id,body));}catch(e){throw new HttpError(400,e.message);}}
      if(req.method==='POST'&&p==='/api/materials/prepare'){const body=await readBody(req);try{return json(res,200,prepareMaterials(body));}catch(e){throw new HttpError(400,e.message);}}
      if(p.startsWith('/api/editor')) {
        if(req.method==='GET' && p==='/api/editor/catalog')return json(res,200,catalog());
        if(req.method==='GET' && p==='/api/editor/knowledge') {
          const pack=findPack(String(u.searchParams.get('topic')||''));
          if(!pack)return json(res,404,{error:'No offline package: supply materials; no network lookup performed'});
          return json(res,200,pack);
        }
        if(req.method==='GET') {
          const id=u.searchParams.get('id');if(!safeId(id))return json(res,400,{error:'bad id'});
          if(p==='/api/editor')return json(res,200,previewProject(id));
          if(p==='/api/editor/estimate')return json(res,200,estimate(editorProject(id)));
          if(p==='/api/editor/frame') {
            const scene=u.searchParams.get('scene');if(!safeId(scene)||!editorProject(id).scenes.some(s=>s.id===scene))return json(res,400,{error:'bad scene'});
            if(u.searchParams.get('actual')==='1') {
              const meta=readJson(path.join(outDir(id),'frames',`editor-${scene}.png.meta.json`),null);
              const latest=jobs.get(id);
              if(latest?.stage==='preview'&&latest.preview?.scene===scene&&(latest.running||latest.code!==0))return json(res,409,{error:'Current preview job not successful; inspect log'});
              if(!meta||meta.sourceHash!==sourceHash()||meta.revision!==sha1(editorProject(id)))return json(res,409,{error:'No current Chrome frame: save and run preview; check job log for missing dependencies'});
              return serveFile(req,res,path.join(outDir(id),'frames',`editor-${scene}.png`));
            }
            res.writeHead(200,{'content-type':'image/svg+xml; charset=utf-8','cache-control':'no-store','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'"});return res.end(frameSVG(id,scene));
          }
        }
        if(req.method==='POST') {
          const body=await readBody(req);if(!safeId(body.id))return json(res,400,{error:'bad id'});
          if(jobs.get(body.id)?.running)return json(res,409,{error:'Project job running; stop/wait before editing'});
          if(p==='/api/editor/edit')return json(res,200,editScene(body.id,body));
          if(p==='/api/editor/history')return json(res,200,travelHistory(body.id,body));
          if(p==='/api/editor/documentary')return json(res,200,documentaryWizard(body.id,body));
          if(p==='/api/editor/frame') {
            const project=editorProject(body.id);
            if(sha1(project)!==body.revision)return json(res,409,{error:'Project changed; reload'});
            if(!safeId(body.sceneId)||!project.scenes.some(s=>s.id===body.sceneId)||!Number.isFinite(body.t)||body.t<0||body.t>180)return json(res,400,{error:'bad frame parameters'});
            const out=path.join(ensure(path.join(outDir(body.id),'frames')),`editor-${body.sceneId}.png`);
            const job=startJob(body.id,'preview',['--scene',body.sceneId,'--t',String(body.t),'--out',out]);job.preview={scene:body.sceneId,time:body.t};return json(res,200,{ok:true,pid:job.pid});
          }
        }
        return json(res,404,{error:'Unknown editor endpoint'});
      }
      if (req.method === 'GET' && p === '/api/script') {
        const id = u.searchParams.get('id');
        if (!safeId(id)) return json(res, 400, {error:'bad id'});
        const file = path.join(projectDir(id), 'project.json');
        if (!fs.existsSync(file)) return json(res, 404, {error:'project not found'});
        const project = readJson(file);
        return json(res, 200, {production:project.production,language:project.language, scenes:project.scenes.map(s => ({id:s.id, title:s.title, lines:s.lines.map(l => l.text[project.language])}))});
      }
      if (req.method === 'GET' && (p === '/' || p === '/index.html')) {
        res.writeHead(200, {'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store'});
        return res.end(PAGE);
      }
      if (req.method === 'POST' && p === '/api/check') {
        const check = await new Promise(resolve=>{const child=spawn(process.execPath,[path.join(ENGINE,'render.mjs'),'doctor'],{cwd:ENGINE,windowsHide:true});let stdout='',stderr='';const timer=setTimeout(()=>child.kill(),30000);child.stdout.on('data',b=>{stdout=(stdout+b).slice(-100000);});child.stderr.on('data',b=>{stderr=(stderr+b).slice(-100000);});child.on('error',error=>{clearTimeout(timer);resolve({status:null,error});});child.on('close',status=>{clearTimeout(timer);resolve({status,stdout,stderr});});});
        return json(res, 200, {ready:check.status === 0, report:(check.stdout || '') + (check.stderr || '') + (check.error?.message || '')});
      }
      if (req.method === 'POST' && p === '/api/open') {
        const {id, target} = await readBody(req);
        if (!safeId(id) || !['project', 'output'].includes(target)) return json(res, 400, {error:'bad folder'});
        if (process.platform !== 'win32') return json(res, 501, {error:'Открытие папки доступно на локальном Windows-сервере'});
        const folder = target === 'project' ? projectDir(id) : outDir(id);
        if (!fs.existsSync(folder)) return json(res, 404, {error:'folder not found'});
        const explorer = spawn('explorer.exe', [folder], {windowsHide:true, stdio:'ignore'});
        explorer.on('error', e=>console.error('explorer:',e.message));
        explorer.unref();
        return json(res, 200, {ok:true});
      }
      if (req.method === 'GET' && p === '/api/state') return json(res, 200, {projects: listProjects()});
      if (req.method === 'GET' && p === '/api/log') {
        const id = u.searchParams.get('id') || '';
        if (!safeId(id)) return json(res, 400, {error: 'bad id'});
        const stage = u.searchParams.get('stage');
        if (stage && ![...STAGES, 'all', 'script', 'idea', ...STAGES.map(s => 'ui_' + s), 'ui_all'].includes(stage)) return json(res, 400, {error:'bad log stage'});
        const file = stage ? path.join(projectDir(id), 'logs', `${stage}.log`) : latestLog(id);
        return json(res, 200, {file: file || null, lines: file ? tailFile(file, 220) : []});
      }
      if (req.method === 'GET' && p === '/file') {
        const id = u.searchParams.get('id') || '';
        const name = u.searchParams.get('name') || '';
        if (!safeId(id)) return json(res, 400, {error: 'bad id'});
        if (!FILE_WHITELIST.has(name)) return json(res, 403, {error: 'forbidden'});
        return serveFile(req, res, path.join(outDir(id), name));
      }
      if (req.method === 'POST' && p === '/api/create') {
        const body = await readBody(req);
        return json(res, 200, createProject(body));
      }
      if (req.method === 'POST' && p === '/api/episode') {
        const {id,episode}=await readBody(req);
        if(!safeId(id) || !Number.isInteger(episode)) return json(res,400,{error:'bad episode'});
        const project=readJson(path.join(projectDir(id),'project.json'));
        if(project.production?.kind!=='season' || !project.production.episodes[episode-1]) return json(res,400,{error:'Выберите сезон и существующий эпизод'});
        const job=startJob(id,'episode',['--episode',String(episode),'--force']);
        return json(res,200,{ok:true,pid:job.pid});
      }
      if(req.method==='GET' && p==='/api/history') {
        const id=u.searchParams.get('id');if(!safeId(id))return json(res,400,{error:'bad id'});
        return json(res,200,{snapshots:listHistory(projectDir(id))});
      }
      if(req.method==='POST' && p==='/api/restore') {
        const {id,snapshot}=await readBody(req);
        if(!safeId(id) || !listHistory(projectDir(id)).some(x=>x.file===snapshot))return json(res,400,{error:'bad snapshot'});
        startJob(id,'restore',['--snapshot',snapshot]);return json(res,200,{ok:true});
      }
      if (req.method === 'POST' && p === '/api/run') {
        const {id, stage, draft} = await readBody(req);
        if (!safeId(id)) return json(res, 400, {error: 'bad id'});
        if (stage !== 'all' && !STAGES.includes(stage)) return json(res, 400, {error: 'bad stage'});
        if (!fs.existsSync(path.join(projectDir(id), 'project.json'))) return json(res, 404, {error: 'project not found'});
        if (readJson(path.join(projectDir(id),'project.json')).production?.kind==='season') return json(res,400,{error:'Выберите проект отдельного эпизода'});
        if(['all','scenes','render','final'].includes(stage)){const review=previewProject(id);if(review.qa.errors.length)return json(res,422,{error:'Fix QA errors before render',qa:review.qa});}
        if(['all','final'].includes(stage)){try{assertPublicationAllowed(editorProject(id),{draft:!!draft});}catch(e){throw new HttpError(422,e.message);}}
        const extra = draft ? ['--draft','--concurrency','1'] : ['--concurrency','1'];
        const job = startJob(id, stage, extra);
        return json(res, 200, {ok: true, stage: job.stage, pid: job.pid});
      }
      if (req.method === 'POST' && p === '/api/stop') {
        const {id} = await readBody(req);
        if (!safeId(id)) return json(res, 400, {error: 'bad id'});
        return json(res, 200, {ok: true, stopped: stopJob(id).stage});
      }
      json(res, 404, {error: 'not found'});
    } catch (e) {
      console.error('ui request failed:', e.stack || e);
      json(res, e.status || (e.message?.includes('unknown') || e.message?.includes('требуется') ? 400 : 500), {error: String(e.message || e)});
    }
  });
  server.headersTimeout=10000;server.requestTimeout=30000;
  server.on('error', (e) => {
    console.error(`ui: ${e.message} (port ${port})`);
    process.exit(1);
  });
  server.listen(port, host, () => {
    console.log(`Koveyer Dhoix'a UI: http://localhost:${server.address().port}  (listening on ${host})`);
    console.log('Ctrl+C to stop. The UI spawns the same render.mjs CLI — logs stay in projects/<id>/logs/.');
  });
  const shutdown = () => {
    for (const [id, job] of jobs) if (job.running) { try { stopJob(id); } catch (e) { console.error('shutdown:', e.message); } }
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  return server;
}
