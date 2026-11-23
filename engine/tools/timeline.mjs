// TIMELINE stage: project.json + voice manifest -> plan.json (all times numeric, shots generated, scenes sized).
import fs from 'node:fs';
import path from 'node:path';
import {projectDir, readJson, writeJson, sha1, FPS, WIDTH, HEIGHT} from './lib.mjs';
import {estimateLine} from './script.mjs';

const LEAD = 0.7, TAIL = 0.9, GAP = 0.3;
const MOVES = ['push', 'drift', 'pan', 'dolly', 'pull', 'crane'];

export function resolveT(t, starts) {
  if (typeof t === 'number') return t;
  const s = starts[t.line];
  if (s === undefined) throw new Error(`Unknown line anchor "${t.line}"`);
  return s + (t.off || 0);
}

function autoShots(sc, dur) {
  const plan = sc.shotPlan?.length ? sc.shotPlan : [{type: 'wide'}, {type: 'medium', char: sc.actors[0]?.char}, {type: 'close', char: sc.actors[0]?.char, at: 'head'}];
  const n = sc.kind === 'title' ? 1 : Math.max(1, Math.min(14, Math.round(dur / 3.4)));
  const shots = [];
  for (let i = 0; i < n; i++) {
    const p = plan[i % plan.length];
    const focus = p.focus ? p.focus : p.char ? {char: p.char, at: p.at} : p.prop ? {prop: p.prop} : undefined;
    shots.push({t: +(dur * i / n).toFixed(3), type: p.type, focus, move: i < plan.length ? p.move || MOVES[i % MOVES.length] : MOVES[(i + 2) % MOVES.length], angle: p.angle, dutch: p.dutch, zoom: p.zoom, cut: i > 0 && p.type === 'establishing' ? 'dip' : 'cut'});
  }
  return shots;
}

export function buildPlan(id) {
  const dir = projectDir(id);
  const project = readJson(path.join(dir, 'project.json'));
  const mf = readJson(path.join(dir, 'voice', 'manifest.json'), {source: 'none', lines: {}});
  const lang = project.language;
  const fps = FPS;
  let cursor = 0, frameCursor = 0, usedFiles = 0, totalLines = 0;
  const scenes = project.scenes.map((sc, index) => {
    const starts = {};
    let c = sc.kind === 'title' ? 0 : LEAD;
    const lines = sc.lines.map((l) => {
      totalLines++;
      const m = mf.lines[l.id];
      const file = m && fs.existsSync(path.join(dir, m.file)) ? m.file : undefined;
      if (file) usedFiles++;
      const dur = file ? m.dur : estimateLine(l.text[lang], l.voice, lang);
      const rs = {...l, sceneStart: +c.toFixed(3), sceneEnd: +(c + dur).toFixed(3), file};
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
    cursor += durSec; frameCursor += durFrames;
    return out;
  });
  const voiceSource = usedFiles === totalLines && totalLines > 0 ? (mf.source === 'files' ? 'tts' : mf.source) : 'estimated';
  const plan = {
    version: 1, id: project.id, language: lang, title: project.title, fps, width: WIDTH, height: HEIGHT,
    totalFrames: frameCursor, totalSec: frameCursor / fps, voiceSource,
    characters: project.characters, voices: project.voices, scenes, music: {mood: project.settings.music},
  };
  plan.hash = sha1({...plan, hash: undefined});
  writeJson(path.join(dir, 'plan.json'), plan);
  writeJson(path.join(dir, 'timeline.json'), {
    fps, source: voiceSource, totalSec: plan.totalSec,
    scenes: scenes.map((s) => ({id: s.id, title: s.title, start: s.startSec, duration: s.durSec, startFrame: s.startFrame, frames: s.durFrames, lines: s.lines.map((l) => ({id: l.id, voice: l.voice, text: l.text[lang], start: +l.start.toFixed(3), end: +l.end.toFixed(3), file: l.file || null}))})),
  });
  return plan;
}
