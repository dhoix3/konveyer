import {outputSize,viewport} from '../src/lib/viewport.ts';
import {analyzeAudio} from './speech-analysis.mjs';
// TIMELINE stage: project.json + voice manifest -> plan.json (all times numeric, shots generated, scenes sized).
import {ttsLineHash} from './voice.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {projectDir, readJson, writeJson, sha1, fileSha, FPS} from './lib.mjs';
import {estimateLine, LEAD, TAIL, GAP} from './script.mjs';
const MOVES = ['push', 'drift', 'pan', 'dolly', 'pull', 'crane'];
const TYPE_CYCLE = ['wide', 'medium', 'close'];
const TYPE_ORDER = ['wide', 'medium', 'close', 'establishing', 'insert', 'extreme_close'];
const hashStr = (s) => { let h = 5381; for (const ch of String(s)) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0; return h; };

export function resolveT(t, starts) {
  if (typeof t === 'number') return t;
  const s = starts[t.line];
  if (s === undefined) throw new Error(`Unknown line anchor "${t.line}"`);
  return s + (t.off || 0);
}

// Build the shot list for a scene.  The authored shotPlan is followed exactly
// while it lasts; after that the generator keeps the film visually varied:
// no identical shot types or camera moves back-to-back, plus deterministic
// low/high angles and occasional dutch tilt so repeated topics (and long
// scenes) do not fall into the same visual rhythm.
function autoShots(sc, dur) {
  const base = sc.shotPlan?.length ? sc.shotPlan : null;
  const plan = base || [{type: 'wide'}, {type: 'medium', char: sc.actors[0]?.char}, {type: 'close', char: sc.actors[0]?.char, at: 'head'}];
  // Shot count: ~one shot per 3.4 s, but never fewer than the authored plan
  // can fill at a watchable pace (≥ 2.5 s per shot).
  let n = sc.kind === 'title' ? 1 : Math.max(1, Math.min(14, Math.round(dur / 3.4)));
  if (sc.kind !== 'title' && base) n = Math.max(n, Math.min(base.length, Math.floor(dur / 2.5)));
  const seed = hashStr(sc.id || 'scene');
  const shots = [];
  let prevType = null, prevMove = null;
  for (let i = 0; i < n; i++) {
    const p = plan[i % plan.length];
    const scripted = i < plan.length;
    let type = p.type;
    if (i > 0 && type === prevType) {
      const at = Math.max(0, TYPE_ORDER.indexOf(type));
      type = TYPE_ORDER[(at + 1) % TYPE_ORDER.length];
      if (type === prevType) type = TYPE_ORDER[(at + 2) % TYPE_ORDER.length];
    }
    const focus = p.focus ? p.focus : p.char ? {char: p.char, at: p.at} : p.prop ? {prop: p.prop} : undefined;
    let move;
    if (scripted) move = p.move || MOVES[(seed + i) % MOVES.length];
    else {
      // deterministic pick that never repeats the previous move
      let k = (seed + i * 3) % MOVES.length;
      if (MOVES[k] === prevMove) k = (k + 1) % MOVES.length;
      move = MOVES[k];
    }
    let angle = p.angle;
    let dutch = p.dutch;
    if (!scripted) {
      const v = (seed >>> ((i % 8) * 3)) % 11;
      if (v === 0 && (type === 'wide' || type === 'medium')) angle = 'low';
      else if (v === 1 && (type === 'wide' || type === 'medium')) angle = 'high';
      if (type === 'close' && v === 2) dutch = (seed % 2 ? 1 : -1) * 4;
      if (v === 3 && move === 'pan') dutch = (seed % 2 ? 1 : -1) * 3;
    }
    shots.push({
      t: +(dur * i / n).toFixed(3), type, focus, move, angle, dutch, zoom: p.zoom,
      cut: i > 0 && p.type === 'establishing' ? 'dip' : 'cut',
    });
    prevType = type; prevMove = move;
  }
  return shots;
}

export function buildPlan(id,{aspect,projectOverride,persist=true,ignoreAudio=false}={}) {
  const dir = projectDir(id);
  const project = projectOverride||readJson(path.join(dir, 'project.json'));
  const size=outputSize(aspect||project.settings.aspect);
  const planDir=aspect?path.join(dir,'exports',aspect.replace(':','x')):dir;
  if(project.production?.kind==='season') throw new Error('Сезон — контейнер: выберите отдельный эпизод для таймлайна.');
  const mf = ignoreAudio?{source:'none',lines:{}}:readJson(path.join(dir, 'voice', 'manifest.json'), {source: 'none', lines: {}});
  const lang = project.language;
  const fps = FPS;
  const speechWarnings=[];
  let cursor = 0, frameCursor = 0, usedFiles = 0, totalLines = 0;
  const scenes = project.scenes.map((sc, index) => {
    const starts = {};
    let c = sc.kind === 'title' ? 0 : LEAD;
    const lines = sc.lines.map((l) => {
      totalLines++;
      const m = mf.lines[l.id];
      let file;
      if (m) {
        const resolved = typeof m.file === 'string' ? path.resolve(dir, m.file) : '';
        const relative = path.relative(dir, resolved);
        const safe = resolved && !relative.startsWith('..') && !path.isAbsolute(relative);
        const current = mf.source !== 'tts' || m.hash === ttsLineHash(l, project);
        if (safe && current && Number.isFinite(m.dur) && m.dur > 0 && fs.existsSync(resolved)) file = m.file;
        else throw new Error(`Voice cache invalid for ${l.id}: text/voice changed, missing audio or invalid duration/path. Re-run voice ${id}.`);
      }
      if (file) usedFiles++;
      const dur = file ? m.dur : estimateLine(l.text[lang], l.voice, lang);
      let speech;
      if(file)try{speech=analyzeAudio(path.resolve(dir,file),l.text[lang],{words:m.words,phonemes:m.phonemes,wordTiming:m.wordTiming});}catch(e){speechWarnings.push(`${l.id}: audio analysis unavailable; legacy lip sync fallback: ${e.message}`);}
      const rs = {...l, speech, audioHash:file?fileSha(path.resolve(dir,file)):undefined, sceneStart: +c.toFixed(3), sceneEnd: +(c + dur).toFixed(3), file};
      starts[l.id] = rs.sceneStart;
      c += dur + (l.pause ?? GAP);
      return rs;
    });
    const lastEnd = lines.length ? lines[lines.length - 1].sceneEnd + Math.max(TAIL, (sc.lines.at(-1)?.pause ?? 0) + 0.4) : 0;
    const durFrames = Math.max(Math.ceil((sc.minDur ?? 4) * fps), Math.ceil(lastEnd * fps));
    const durSec = durFrames / fps;
    const clamp = (t) => Math.min(Math.max(0, t), durSec - 0.15);
    const rt = (x) => clamp(resolveT(x, starts));
    const shots = (sc.shots && sc.shots.length ? sc.shots.map((s) => ({...s, t: rt(s.t)})) : autoShots(sc, durSec)).sort((a, b) => a.t - b.t);
    if (shots[0].t > 0) shots[0].t = 0;
    const overlay = sc.overlay ? {...sc.overlay, t: typeof sc.overlay.t === 'number' ? sc.overlay.t : rt(sc.overlay.t)} : undefined;
    const {shotPlan, ...rest} = sc;
    void shotPlan;
    const out = {
      ...rest, index, startSec: cursor, durSec, startFrame: frameCursor, durFrames,
      lines: lines.map((l) => ({...l, start: cursor + l.sceneStart, end: cursor + l.sceneEnd})),
      beats: (sc.beats || []).map((b) => ({...b, t: rt(b.t)})).sort((a, b) => a.t - b.t),
      sfx: (sc.sfx || []).map((s) => ({...s, t: rt(s.t)})).sort((a, b) => a.t - b.t),
      pstates: (sc.pstates || []).map((s) => ({...s, t: rt(s.t)})),
      shots, overlay,
    };
    if(out.doc&&project.production?.knowledge){const claims=project.production.knowledge.claims;out.doc={...out.doc,subjects:out.lines.flatMap(l=>(l.claimIds||[]).map(id=>claims.find(c=>c.id===id))).filter(Boolean).map(c=>({id:c.id,name:c.person||'Исторический эпизод',years:c.date.value,status:c.status,sources:c.sources.join(', ')}))};}
    cursor += durSec; frameCursor += durFrames;
    return out;
  });
  const voiceSource = usedFiles === totalLines && totalLines > 0 ? (mf.source === 'files' ? 'tts' : mf.source) : 'estimated';
  const plan = {
    version: 1, schemaVersion:2, projectHash: sha1(project), voiceManifestHash: sha1(mf), id: project.id, language: lang, title: project.title, fps, width: size.width, height: size.height, aspect:aspect||project.settings.aspect||'16:9', safeZone:viewport(size.width,size.height).safe,
    totalFrames: frameCursor, totalSec: frameCursor / fps, voiceSource,
    speechWarnings, production: project.production, characters: project.characters, voices: project.voices, scenes, music: {mood: project.settings.music},
  };
  plan.hash = sha1({...plan, hash: undefined});
  if(persist){writeJson(path.join(planDir, 'plan.json'), plan);
  writeJson(path.join(planDir, 'timeline.json'), {
    fps, source: voiceSource, totalSec: plan.totalSec,
    scenes: scenes.map((s) => ({id: s.id, title: s.title, start: s.startSec, duration: s.durSec, startFrame: s.startFrame, frames: s.durFrames, lines: s.lines.map((l) => ({id: l.id, voice: l.voice, text: l.text[lang], start: +l.start.toFixed(3), end: +l.end.toFixed(3), file: l.file || null}))})),
  });
  }
  return plan;
}
