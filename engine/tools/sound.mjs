// SOUND stage: plan.json -> audio_plan.json -> procedural synthesis + mix (Python/numpy) -> loudness normalisation to -14 LUFS.
import fs from 'node:fs';
import path from 'node:path';
import {projectDir, ensure, readJson, writeJson, ff, runPython, probe, sha1, fileSha, sourceHash} from './lib.mjs';
import {compileTrack} from '../src/char/track.ts';

const SURFACE = {bedroom: 'wood', kitchen: 'tile', office: 'tile', school: 'wood', hospital: 'tile', street: 'concrete', city: 'concrete', stadium: 'grass', nature: 'grass', station: 'metal', void: 'wood'};
export const TARGET_LUFS = -14;

export function buildAudioPlan(id, plan, log) {
  const dir = projectDir(id);
  const cache = ensure(path.join(dir, 'audio', 'voice44'));
  const voice = [], sfx = [], ambience = [], sections = [];
  for (const sc of plan.scenes) {
    for (const l of sc.lines) {
      if (!l.file) continue;
      const src = path.join(dir, l.file);
      const dst = path.join(cache, `${l.id}-${fileSha(src)}.wav`);
      if (!fs.existsSync(dst)) ff(['-i', src, '-ac', '1', '-ar', '44100', '-c:a', 'pcm_s16le', dst]);
      voice.push({file: dst, t: +l.start.toFixed(3), gain: 1.0, line: l.id});
    }
    for (const s of sc.sfx) sfx.push({t: +(sc.startSec + s.t).toFixed(3), kind: s.kind, gain: s.gain ?? 0.8, pan: s.pan ?? 0});
    for (const p of sc.pstates) {
      if (p.key === 'open' && p.to > 0.5) sfx.push({t: +(sc.startSec + p.t).toFixed(3), kind: 'door_open', gain: 0.7});
      if (p.key === 'open' && p.to < 0.5) sfx.push({t: +(sc.startSec + p.t + (p.dur ?? 0.6)).toFixed(3), kind: 'door_close', gain: 0.8});
      if (p.key === 'ring' && p.to > 0.5) sfx.push({t: +(sc.startSec + p.t).toFixed(3), kind: 'alarm', gain: 0.5});
    }
    // footsteps derived from the actual walk/run cycles (same code that animates the feet)
    const surf = SURFACE[sc.env.id] || 'wood';
    for (const a of sc.actors) {
      const tr = compileTrack(sc, a.char);
      for (const seg of tr.segs) {
        if (!['walk', 'run', 'carry'].includes(seg.action)) continue;
        const run = seg.action === 'run';
        for (const t of tr.footsteps().filter((x) => x >= seg.t0 && x <= seg.t1 + 0.01)) {
          sfx.push({t: +(sc.startSec + t).toFixed(3), kind: `footstep_${surf}`, gain: run ? 0.7 : 0.5, pan: Math.max(-0.8, Math.min(0.8, (tr.xAt(t) - 960) / 1200))});
        }
      }
    }
    ambience.push({t0: +sc.startSec.toFixed(3), t1: +(sc.startSec + sc.durSec + 0.4).toFixed(3), id: sc.silence ? 'silence' : sc.ambience, gain: sc.silence ? 0 : 0.6});
    sections.push({t0: sc.startSec, t1: sc.startSec + sc.durSec, level: sc.silence ? 0.0 : sc.musicLevel ?? 0.6});
  }
  sfx.sort((a, b) => a.t - b.t);
  const ap = {duration: +plan.totalSec.toFixed(3), voice, sfx, ambience, music: {mood: plan.music.mood, sections}};
  writeJson(path.join(dir, 'audio_plan.json'), ap);
  log.info(`audio plan: ${voice.length} voice clips, ${sfx.length} sfx events, ${ambience.length} ambience beds, music=${plan.music.mood}`);
  return ap;
}

export function measureLufs(file) {
  const r = ff(['-i', file, '-vn', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], {allowFail: true});
  const m = (r.stderr || '').match(/\{\s*"input_i"[\s\S]*?\}/);
  return m ? JSON.parse(m[0]) : null;
}

export function runSound(id, plan, log, {force = false} = {}) {
  const dir = projectDir(id);
  const ap = buildAudioPlan(id, plan, log);
  const key = sha1({ap, source:sourceHash()});
  const keyFile = path.join(dir, 'audio', 'mix.key');
  const final = path.join(dir, 'audio', 'mix_norm.wav');
  if (!force && fs.existsSync(final) && fs.existsSync(keyFile) && fs.readFileSync(keyFile, 'utf8') === key) {
    log.info('sound: up to date (skipped)');
    return final;
  }
  ensure(path.join(dir, 'audio'));
  const raw = path.join(dir, 'audio', 'mix.wav');
  log.info(runPython('mixer.py', [path.join(dir, 'audio_plan.json'), raw]).trim());
  const m = measureLufs(raw);
  if (!m) throw new Error('loudnorm measurement failed');
  log.info(`measured: ${m.input_i} LUFS, TP ${m.input_tp}`);
  const af = `loudnorm=I=${TARGET_LUFS}:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  ff(['-i', raw, '-af', af, '-ar', '48000', '-c:a', 'pcm_s16le', final]);
  const after = measureLufs(final);
  log.info(`normalised: ${after?.input_i} LUFS (target ${TARGET_LUFS})`);
  fs.writeFileSync(keyFile, key);
  const d = probe(final).duration;
  if (Math.abs(d - plan.totalSec) > 0.2) log.warn(`audio duration ${d.toFixed(2)} differs from plan ${plan.totalSec.toFixed(2)}`);
  return final;
}
