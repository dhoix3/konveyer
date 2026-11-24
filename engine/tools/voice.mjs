import {alignManifest,clipWords} from './word-alignment.mjs';
import {profileFor,prosodyFor} from './voice-registry.mjs';
// VOICE stage: TTS (Piper ONNX, local) | uploaded narration (Whisper ONNX or silence-VAD) | per-line files | none.
// Uploaded audio is transcribed, split into phrases, aligned to script lines and cut into per-line clips.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ENGINE, projectDir, ensure, readJson, writeJson, sha1, ff, probe, runPython, ffmpegEnv, FFMPEG} from './lib.mjs';
import {voiceById} from '../src/lib/library.ts';

export const allLines = (p) => p.scenes.flatMap((s) => s.lines.map((l) => ({...l, scene: s.id})));
const MODELS = path.join(ENGINE, 'models', 'piper');
const HF = 'https://huggingface.co/rhasspy/piper-voices/resolve/main';
// Bump whenever text normalisation or synthesis changes.  Cached voice WAVs
// from an older version must not be reused: the hash only covers text + voice.
export const TTS_VERSION = 'tts-4';

// Extra Russian Piper voices that can be selected per project without changing
// the defaults in src/lib/library.ts:
//   --voice-model ru_RU-dmitri-medium
//   project.json -> settings.voiceModels = {narrator: "ru_RU-dmitri-medium"}
export const RU_VOICE_ALTERNATIVES = ['ru_RU-dmitri-medium', 'ru_RU-ruslan-medium'];

async function downloadModel(url, dest, log) {
  const tmp = `${dest}.part`;
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(url, {signal: AbortSignal.timeout(120000)});
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 1000) throw new Error(`suspiciously small file (${buf.length} bytes)`);
      fs.writeFileSync(tmp, buf);
      fs.renameSync(tmp, dest);
      return;
    } catch (e) {
      lastErr = e;
      try { fs.unlinkSync(tmp); } catch {}
      if (log) log.warn(`model download attempt ${attempt}/3 failed: ${e.message}`);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1200 * attempt));
    }
  }
  throw new Error(
    `model download failed ${url}: ${lastErr?.message || 'unknown error'}\n` +
    `  hint: download "${path.basename(dest)}" manually from the same URL and put it into ${MODELS}, ` +
    `or continue without this voice: --voice none (music only) / --audio your_file.mp3 (uploaded narration)`,
  );
}

export async function ensureModel(name, log) {
  ensure(MODELS);
  if (!/^[a-z]{2}_[A-Z]{2}-[a-z0-9_]+-(x_low|low|medium|high)$/.test(name)) {
    throw new Error(`invalid Piper voice name "${name}"`);
  }
  const [langRegion, voice, quality] = [name.split('-')[0], name.split('-')[1], name.split('-')[2]];
  const [lc, region] = langRegion.split('_');
  const model = path.join(MODELS, `${name}.onnx`);
  const config = path.join(MODELS, `${name}.onnx.json`);
  const good = (f, min) => fs.existsSync(f) && fs.statSync(f).size >= min;
  if (!good(model, 100_000)) {
    if (log) log.info(`downloading Piper voice ${name}…`);
    await downloadModel(`${HF}/${lc}/${langRegion}/${voice}/${quality}/${name}.onnx`, model, log);
  }
  if (!good(config, 200)) {
    await downloadModel(`${HF}/${lc}/${langRegion}/${voice}/${quality}/${name}.onnx.json`, config, log);
    try { JSON.parse(fs.readFileSync(config, 'utf8')); }
    catch { try { fs.unlinkSync(config); } catch {} throw new Error(`invalid Piper config for ${name}`); }
  }
  return model;
}

// Resolve the actual Piper model for a library voice.  Precedence:
// CLI --voice-model (all lines or "voiceId=model,voiceId=model") >
// project.settings.voiceModels[voiceId] > library default.
export function resolveVoiceModel(voice, project, opts = {}) {
  const lang = project.language || 'ru';
  const fallback = voice.piper?.[lang];
  if (!fallback) throw new Error(`no Piper voice configured for ${voice.id}/${lang}`);
  const override = opts['voice-model'] ?? opts.voiceModel;
  if (override && typeof override === 'string') {
    const pairs = override.split(',').map((s) => s.trim()).filter(Boolean);
    const single = pairs.find((p) => !p.includes('='));
    if (single && !pairs.some((p) => p.startsWith(`${voice.id}=`))) return single;
    for (const p of pairs) {
      const [id, model] = p.split('=').map((s) => s.trim());
      if (id === voice.id && model) return model;
    }
  }
  return project.settings?.voiceModels?.[voice.id] || profileFor(voice,project)?.model || fallback;
}

export function ttsLineHash(line, project, opts = {}) {
  const v = voiceById(line.voice);
  return sha1([TTS_VERSION, project.language, line.text[project.language],
    resolveVoiceModel(v, project, opts), prosodyFor(v,project)]);
}

export const lineFile = (id, lid) => path.join(projectDir(id), 'voice', `${lid}.wav`);

export async function voiceTTS(id, project, log, {force = false, ...opts} = {}) {
  const dir = ensure(path.join(projectDir(id), 'voice'));
  const mf = readJson(path.join(dir, 'manifest.json'), {source: 'tts', lines: {}});
  const jobs = [];
  const hashes = {};
  const earlyFailed = [];
  const valid = new Set();
  for (const l of allLines(project)) {
    const v = voiceById(l.voice);
    const text = l.text[project.language];
    const name = resolveVoiceModel(v, project, opts);
    const {pitch,speed,noiseScale,noiseW}=prosodyFor(v,project);
    const hash = ttsLineHash(l, project, opts);
    hashes[l.id] = hash;
    const out = lineFile(id, l.id);
    if (!force && mf.lines[l.id]?.hash === hash && fs.existsSync(out)) { valid.add(l.id); continue; }
    try {
      jobs.push({id: l.id, text, model: await ensureModel(name, log), pitch, speed, noiseScale, noiseW, lang: project.language, out, hash});
    } catch (e) {
      earlyFailed.push({id: l.id, error: e.message});
    }
  }

  let failed = [...earlyFailed];
  if (jobs.length) {
    log.info(`TTS: synthesizing ${jobs.length} line(s) with Piper`);
    const jf = path.join(dir, 'jobs.json');
    writeJson(jf, jobs);
    try {
      const out = runPython('tts.py', [jf]);
      for (const line of out.trim().split('\n').filter(Boolean)) log.info(line);
      const rf = `${jf}.results.json`;
      if (fs.existsSync(rf)) {
        const res = readJson(rf, {ok: [], failed: []});
        failed.push(...(res.failed || []));
        for (const x of res.ok || []) valid.add(x.id);
        try { fs.unlinkSync(rf); } catch {}
      }
    } catch (e) {
      // The batch itself failed (missing Python module, killed process, …).
      failed.push(...jobs.map((j) => ({id: j.id, error: e.message})));
    } finally {
      try { fs.unlinkSync(jf); } catch {}
    }
  } else if (!earlyFailed.length) log.info('TTS: all lines up to date (skipped)');

  const lines = {};
  const missing = [];
  for (const l of allLines(project)) {
    const f = lineFile(id, l.id);
    if (!valid.has(l.id)) { missing.push(l.id); continue; }
    if (!fs.existsSync(f)) { missing.push(l.id); continue; }
    try {
      const dur = probe(f).duration;
      if (!(dur > 0.15)) throw new Error(`audio too short (${dur}s)`);
      lines[l.id] = {file: path.relative(projectDir(id), f), dur, hash: hashes[l.id]};
    } catch (e) {
      log.warn(`${l.id}: unusable voice file (${e.message}); will re-synthesize on next run`);
      try { fs.unlinkSync(f); } catch {}
      missing.push(l.id);
    }
  }
  const out = {source: 'tts', lang: project.language, ttsVersion: TTS_VERSION, lines};
  writeJson(path.join(dir, 'manifest.json'), out);

  if (failed.length) {
    for (const f of failed.slice(0, 12)) log.error(`TTS failed ${f.id}: ${String(f.error).slice(0, 240)}`);
  }
  if (missing.length) {
    throw new Error(`voice: ${missing.length} line(s) missing or failed (${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ', …' : ''}). Successful lines are cached; re-run "voice ${id}" to retry only the failures.`);
  }
  return out;
}

export function voiceFiles(id, project, log) {
  const dir = path.join(projectDir(id), 'voice');
  const lines = {};
  let found = 0;
  for (const l of allLines(project)) {
    const f = ['wav', 'mp3', 'm4a', 'ogg', 'flac'].map((e) => path.join(dir, `${l.id}.${e}`)).find((x) => fs.existsSync(x));
    if (f) { lines[l.id] = {file: path.relative(projectDir(id), f), dur: probe(f).duration}; found++; }
  }
  log.info(`voice files: ${found}/${allLines(project).length} lines have audio`);
  const out = {source: 'files', lang: project.language, lines};
  writeJson(path.join(dir, 'manifest.json'), out);
  return out;
}

const norm = (s) => s.toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);

// Needleman-Wunsch alignment of script tokens to recognised words
export function alignWords(lines, words) {
  const S = [];
  lines.forEach((l, li) => norm(l.text).forEach((tok) => S.push({tok, li})));
  const W = words.flatMap((w) => norm(w.text).map((tok) => ({tok, start: w.start, end: w.end})));
  const n = S.length, m = W.length;
  const sc = (a, b) => (a === b ? 3 : a.length > 3 && b.length > 3 && a.slice(0, 4) === b.slice(0, 4) ? 2 : -2);
  const H = Array.from({length: n + 1}, () => new Int32Array(m + 1));
  for (let i = 1; i <= n; i++) H[i][0] = -i;
  for (let j = 1; j <= m; j++) H[0][j] = -j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) H[i][j] = Math.max(H[i - 1][j - 1] + sc(S[i - 1].tok, W[j - 1].tok), H[i - 1][j] - 1, H[i][j - 1] - 1);
  const res = lines.map(() => ({start: Infinity, end: -Infinity, hits: 0}));
  let i = n, j = m;
  while (i > 0 && j > 0) {
    if (H[i][j] === H[i - 1][j - 1] + sc(S[i - 1].tok, W[j - 1].tok)) {
      if (sc(S[i - 1].tok, W[j - 1].tok) > 0) { const r = res[S[i - 1].li]; r.start = Math.min(r.start, W[j - 1].start); r.end = Math.max(r.end, W[j - 1].end); r.hits++; }
      i--; j--;
    } else if (H[i][j] === H[i - 1][j] - 1) i--; else j--;
  }
  return res;
}

export function detectSpeech(wav, dur) {
  const r = ff(['-i', wav, '-af', 'silencedetect=noise=-38dB:d=0.3', '-f', 'null', '-'], {allowFail: true});
  const sil = [];
  let cur = null;
  for (const line of (r.stderr || '').split('\n')) {
    const a = line.match(/silence_start: ([\d.]+)/); if (a) cur = Number(a[1]);
    const b = line.match(/silence_end: ([\d.]+)/); if (b && cur !== null) { sil.push([cur, Number(b[1])]); cur = null; }
  }
  if (cur !== null) sil.push([cur, dur]);
  const segs = [];
  let t = 0;
  for (const [s, e] of sil) { if (s - t > 0.15) segs.push([t, s]); t = e; }
  if (dur - t > 0.15) segs.push([t, dur]);
  return segs;
}

function alignByVad(lines, segs) {
  const total = segs.reduce((a, [s, e]) => a + e - s, 0);
  const chars = lines.map((l) => l.text.length);
  const sum = chars.reduce((a, b) => a + b, 0);
  const toReal = (u) => { let acc = 0; for (const [s, e] of segs) { if (u <= acc + (e - s)) return s + (u - acc); acc += e - s; } return segs[segs.length - 1][1]; };
  let c = 0;
  if (segs.length === lines.length) return segs.map(([s, e]) => ({start: s, end: e, hits: 1}));
  return lines.map((l, i) => { const a = (c / sum) * total; c += chars[i]; const b = (c / sum) * total; return {start: toReal(a), end: toReal(b), hits: 1}; });
}

export async function voiceUpload(id, project, audio, log, opts = {}) {
  const dir = ensure(path.join(projectDir(id), 'voice'));
  const wav = path.join(dir, 'upload.wav');
  ff(['-i', audio, '-ac', '1', '-ar', '44100', '-c:a', 'pcm_s16le', wav]);
  const dur = probe(wav).duration;
  log.info(`uploaded audio: ${dur.toFixed(2)}s`);
  const lines = allLines(project).map((l) => ({id: l.id, text: l.text[project.language]}));
  let source = 'vad', transcript = null, res;
  if (!opts.noWhisper) {
    try {
      const {transcribe} = await import('./whisper.mjs');
      const tr = await transcribe(wav, {language: project.language, model: opts.model});
      transcript = tr;
      res = alignWords(lines, tr.words);
      source = 'whisper';
      log.info(`Whisper (${tr.model}) recognised ${tr.words.length} words`);
    } catch (e) {
      log.warn(`Whisper unavailable (${String(e.message).slice(0, 160)}); falling back to silence detection`);
    }
  }
  const segs = detectSpeech(wav, dur);
  if (!res || res.every((r) => r.hits === 0)) { res = alignByVad(lines, segs.length ? segs : [[0, dur]]); source = 'vad'; }
  // fill lines without matches by interpolation
  for (let i = 0; i < res.length; i++) {
    if (res[i].hits === 0 || !isFinite(res[i].start)) {
      const prev = res.slice(0, i).reverse().find((r) => isFinite(r.end) && r.hits > 0);
      const next = res.slice(i + 1).find((r) => isFinite(r.start) && r.hits > 0);
      const a = prev ? prev.end + 0.15 : 0, b = next ? next.start - 0.15 : dur;
      res[i] = {start: a, end: Math.max(a + 0.6, Math.min(b, a + lines[i].text.length / 14)), hits: 0};
    }
  }
  const manifestLines = {};
  res.forEach((r, i) => {
    const prevEnd = i ? res[i - 1].end : 0, nextStart = i + 1 < res.length ? res[i + 1].start : dur;
    const s = Math.max(0, Math.max(r.start - 0.1, (prevEnd + r.start) / 2));
    const e = Math.min(dur, Math.min(r.end + 0.2, (r.end + nextStart) / 2 + 0.05));
    const out = lineFile(id, lines[i].id);
    ff(['-i', wav, '-ss', s.toFixed(3), '-to', Math.max(e, s + 0.3).toFixed(3), '-c:a', 'pcm_s16le', out]);
    manifestLines[lines[i].id] = {file: path.relative(projectDir(id), out), dur: probe(out).duration, srcStart: r.start, srcEnd: r.end, matched: r.hits,...(source==='whisper'&&r.hits>0?{words:clipWords(transcript.words,s,Math.max(e,s+.3)),wordTiming:'aligned'}:{wordTiming:'energy-estimated'})};
  });
  const phrases = res.map((r, i) => ({line: lines[i].id, start: r.start, end: r.end, text: lines[i].text}));
  const mf = {source, lang: project.language, audio: path.relative(projectDir(id), wav), duration: dur, lines: manifestLines, phrases, transcript: transcript?.text || null};
  writeJson(path.join(dir, 'manifest.json'), mf);
  writeJson(path.join(projectDir(id), 'transcript.json'), {source, duration: dur, phrases, words: transcript?.words || [], speechSegments: segs});
  return mf;
}

export async function runVoice(id,project,log,args={}) {
  const mode=args.audio?'upload':args.mode||project.settings.voiceMode||'tts';log.info(`voice mode: ${mode}`);
  let mf;
  if(mode==='upload')mf=await voiceUpload(id,project,path.resolve(String(args.audio)),log,{noWhisper:!!args['no-whisper'],model:args.model});
  else if(mode==='files')mf=voiceFiles(id,project,log);
  else if(mode==='none'){mf={source:'none',lines:{}};writeJson(path.join(ensure(path.join(projectDir(id),'voice')),'manifest.json'),mf);return mf;}
  else mf=await voiceTTS(id,project,log,{...args,force:!!args.force});
  return alignManifest(id,project,mf,log,{disabled:!!args['no-whisper'],model:args.model});
}

export {FFMPEG, ffmpegEnv, spawnSync};
