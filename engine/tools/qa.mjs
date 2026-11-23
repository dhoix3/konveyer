// QA stage: static checks on the plan (anatomy, contact, teleport, props, sync, duration) + checks on rendered media.
import fs from 'node:fs';
import path from 'node:path';
import {ENGINE, projectDir, readJson, writeJson, probe, ff, FPS, WIDTH, HEIGHT} from './lib.mjs';
import {compileTrack, SPEED} from '../src/char/track.ts';
import {solve, BONES, LIMITS} from '../src/char/skeleton.ts';
import {measureLufs, TARGET_LUFS} from './sound.mjs';

const envSrc = fs.readFileSync(path.join(ENGINE, 'src/bg/envs.tsx'), 'utf8');
const ENVS = {};
for (const m of envSrc.matchAll(/reg\(\{\s*id: '(\w+)'[\s\S]*?live: \[([^\]]*)\]/g)) ENVS[m[1]] = (m[2].match(/'[^']+'/g) || []).length;
const propSrc = fs.readFileSync(path.join(ENGINE, 'src/char/props.tsx'), 'utf8');
const PROP_KINDS = new Set([...propSrc.matchAll(/^  (\w+): \{\n    top:/gm)].map((m) => m[1]));
const AIR_OK = new Set(['jump', 'float', 'cheer', 'run', 'fall']);

export function qaPlan(id, plan) {
  const errors = [], warnings = [];
  const E = (s, m) => errors.push(`[${s}] ${m}`), W = (s, m) => warnings.push(`[${s}] ${m}`);
  const chars = new Map(plan.characters.map((c) => [c.id, c]));
  const kinds = new Set();
  let frames = 0;
  for (const sc of plan.scenes) {
    const S = sc.id;
    frames += sc.durFrames;
    if (sc.durFrames < 24) E(S, 'scene shorter than 1 second');
    if (!(sc.env.id in ENVS)) E(S, `unknown environment "${sc.env.id}"`);
    else if (ENVS[sc.env.id] < 2) E(S, `environment "${sc.env.id}" has fewer than 2 live details`);
    // props
    const ids = new Set((sc.props || []).map((p) => p.id));
    for (const p of sc.props || []) {
      if (!PROP_KINDS.has(p.kind)) E(S, `prop ${p.id}: unknown kind ${p.kind}`);
      if (p.on === 'air') { if (!p.why) E(S, `prop ${p.id} floats in the air without a reason ("why")`); }
      else if (p.on !== 'floor' && !ids.has(p.on)) E(S, `prop ${p.id} rests on missing surface "${p.on}"`);
    }
    for (const b of sc.beats) {
      if (!chars.has(b.char)) E(S, `beat for unknown character ${b.char}`);
      if (b.hold && !ids.has(b.hold.prop)) E(S, `${b.char} holds missing prop ${b.hold.prop}`);
      if (b.look && typeof b.look === 'object' && 'prop' in b.look && !ids.has(b.look.prop)) E(S, `look at missing prop ${b.look.prop}`);
      if (b.t > sc.durSec) E(S, `beat at ${b.t}s is after scene end`);
    }
    // shots
    sc.shots.forEach((s, i) => {
      kinds.add(s.type);
      const end = sc.shots[i + 1]?.t ?? sc.durSec;
      if (end - s.t > 6.5) W(S, `shot ${i} lasts ${(end - s.t).toFixed(1)}s`);
      if (s.focus?.prop && !ids.has(s.focus.prop)) E(S, `shot focuses on missing prop ${s.focus.prop}`);
    });
    if (sc.kind !== 'title' && sc.durSec > 6 && new Set(sc.shots.map((s) => s.type)).size < 2) W(S, 'only one shot type in a long scene');
    // lines / audio sync
    let prev = 0;
    for (const l of sc.lines) {
      if (l.sceneStart < prev - 0.001) E(S, `line ${l.id} overlaps previous line`);
      if (l.sceneEnd > sc.durSec + 0.001) E(S, `line ${l.id} ends after the scene`);
      if (plan.voiceSource !== 'estimated' && !l.file) E(S, `line ${l.id} has no audio file`);
      prev = l.sceneEnd;
    }
    // characters: anatomy, contact, teleport, jitter
    for (const a of sc.actors) {
      const def = chars.get(a.char);
      if (!def) { E(S, `actor ${a.char} is not in the cast`); continue; }
      const tr = compileTrack(sc, a.char);
      const lw = def.build === 'slim' ? 11 : def.build === 'stocky' ? 16 : 13;
      let last = null, lastHip = null, lastVel = 0;
      for (let f = 0; f < sc.durFrames; f++) {
        const t = f / FPS;
        const st = tr.at(t);
        const p = st.pose;
        if (Object.values(p).some((v) => !Number.isFinite(v))) { E(S, `${a.char}: NaN pose at ${t.toFixed(2)}s`); break; }
        if (p.lEl < -2 || p.rEl < -2 || p.lEl > LIMITS.elbow[1] + 5 || p.rEl > LIMITS.elbow[1] + 5) { E(S, `${a.char}: elbow out of range at ${t.toFixed(2)}s`); break; }
        if (p.lKn < -2 || p.rKn < -2 || p.lKn > LIMITS.knee[1] || p.rKn > LIMITS.knee[1]) { E(S, `${a.char}: knee out of range at ${t.toFixed(2)}s`); break; }
        for (const k of ['lSh', 'rSh']) if (p[k] < LIMITS.shoulder[0] - 5 || p[k] > LIMITS.shoulder[1] + 5) { E(S, `${a.char}: shoulder out of range at ${t.toFixed(2)}s`); break; }
        for (const k of ['lHp', 'rHp']) if (p[k] < LIMITS.hip[0] || p[k] > LIMITS.hip[1]) { E(S, `${a.char}: hip out of range at ${t.toFixed(2)}s`); break; }
        const sk = solve(p, {x: st.x, groundY: 800, fx: 1, scale: def.height, limbW: lw});
        const d = (u, v) => Math.hypot(u.x - v.x, u.y - v.y);
        const bones = [[sk.hip, sk.lKnee, BONES.thigh], [sk.lKnee, sk.lAnkle, BONES.shin], [sk.hip, sk.rKnee, BONES.thigh], [sk.rKnee, sk.rAnkle, BONES.shin], [sk.neck, sk.lElb, BONES.upperArm], [sk.lElb, sk.lHand, BONES.foreArm], [sk.neck, sk.rElb, BONES.upperArm], [sk.rElb, sk.rHand, BONES.foreArm], [sk.hip, sk.neck, BONES.torso]];
        for (const [u, v, len] of bones) if (Math.abs(d(u, v) - len * def.height) > 0.6) { E(S, `${a.char}: bone length drift at ${t.toFixed(2)}s`); break; }
        // contact: lowest body point touches the support surface unless airborne is justified
        const support = 800 - p.lift;
        if (p.seat < 0.01 && p.air < 1 && Math.abs(sk.lowest - support) > 1.5) { E(S, `${a.char}: not touching the ground at ${t.toFixed(2)}s (${(sk.lowest - support).toFixed(1)}px)`); break; }
        if (p.air > 3 && !AIR_OK.has(st.action) && f > 0 && tr.segs[st.seg] && !AIR_OK.has(tr.segs[Math.max(0, st.seg - 1)].action)) { W(S, `${a.char}: airborne during "${st.action}" at ${t.toFixed(2)}s`); break; }
        // teleport / jitter
        const hip = {x: st.x, y: sk.hip.y};
        const pts = [sk.head, sk.lHand, sk.rHand, sk.lAnkle, sk.rAnkle, sk.hip];
        if (last) {
          const jump = Math.max(...pts.map((q, i) => d(q, last[i])));
          if (jump > 90 && st.action !== 'fall') { E(S, `${a.char}: teleport (${jump.toFixed(0)}px/frame) at ${t.toFixed(2)}s`); break; }
          const vel = hip.x - lastHip.x;
          if (Math.abs(vel - lastVel) > 14 && st.action !== 'fall') { E(S, `${a.char}: jitter (accel ${(vel - lastVel).toFixed(1)}px/frame²) at ${t.toFixed(2)}s`); break; }
          lastVel = vel;
        }
        last = pts; lastHip = hip;
      }
      for (const s of tr.segs) {
        if (['walk', 'run', 'carry'].includes(s.action) && s.moveDur > 0) {
          const v = Math.abs(s.x1 - s.x0) / s.moveDur;
          if (v > SPEED.run * 1.4) E(S, `${a.char}: ${s.action} speed ${v.toFixed(0)}px/s is impossible (teleport-like)`);
        }
      }
      if (sc.kind !== 'title') {
        const used = tr.segs.length;
        if (used < 1) W(S, `${a.char} has no actions`);
      }
    }
    if (sc.kind !== 'title' && sc.actors.length === 0) W(S, 'scene without characters');
  }
  for (const need of ['wide', 'medium', 'close']) if (!kinds.has(need)) W('film', `no "${need}" shots in the film`);
  if (frames !== plan.totalFrames) E('film', `frame sum ${frames} != totalFrames ${plan.totalFrames}`);
  const proj = readJson(path.join(projectDir(id), 'project.json'), null);
  if (proj) {
    const target = proj.settings.duration;
    if (Math.abs(plan.totalSec - target) / target > 0.3) W('film', `duration ${plan.totalSec.toFixed(1)}s differs from requested ${target}s by more than 30%`);
  }
  return {errors, warnings};
}

export function qaMedia(id, plan, sceneFiles, finalFile) {
  const errors = [], warnings = [];
  for (const sc of plan.scenes) {
    const f = sceneFiles[sc.id];
    if (!f || !fs.existsSync(f)) { errors.push(`[${sc.id}] scene video missing`); continue; }
    try {
      const m = probe(f);
      if (m.width !== WIDTH || m.height !== HEIGHT) errors.push(`[${sc.id}] resolution ${m.width}x${m.height}`);
      if (Math.abs(m.fps - FPS) > 0.01) errors.push(`[${sc.id}] fps ${m.fps}`);
      if (m.vcodec !== 'h264') errors.push(`[${sc.id}] codec ${m.vcodec}`);
      const expect = sc.durFrames / FPS;
      if (Math.abs(m.duration - expect) > 0.1) errors.push(`[${sc.id}] duration ${m.duration.toFixed(2)}s != ${expect.toFixed(2)}s`);
      const r = ff(['-i', f, '-vf', 'blackdetect=d=1.2:pix_th=0.04,freezedetect=n=-70dB:d=4', '-an', '-f', 'null', '-'], {allowFail: true});
      const err = r.stderr || '';
      for (const mm of err.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)) if (+mm[2] - +mm[1] > 1.2) errors.push(`[${sc.id}] empty (black) frames ${mm[1]}s-${mm[2]}s`);
      for (const mm of err.matchAll(/freeze_duration: ([\d.]+)/g)) warnings.push(`[${sc.id}] frozen picture for ${(+mm[1]).toFixed(1)}s`);
    } catch (e) { errors.push(`[${sc.id}] ${e.message}`); }
  }
  if (finalFile && fs.existsSync(finalFile)) {
    const m = probe(finalFile);
    if (m.width !== WIDTH || m.height !== HEIGHT) errors.push(`[final] resolution ${m.width}x${m.height}`);
    if (Math.abs(m.fps - FPS) > 0.01) errors.push(`[final] fps ${m.fps}`);
    if (m.vcodec !== 'h264' || (m.hasAudio && m.acodec !== 'aac')) errors.push(`[final] codecs ${m.vcodec}/${m.acodec}`);
    if (!m.hasAudio) errors.push('[final] no audio track');
    if (Math.abs(m.duration - plan.totalSec) > 0.25) errors.push(`[final] duration ${m.duration.toFixed(2)}s vs plan ${plan.totalSec.toFixed(2)}s`);
    const l = measureLufs(finalFile);
    if (!l) warnings.push('[final] loudness could not be measured');
    else if (Math.abs(Number(l.input_i) - TARGET_LUFS) > 1.5) warnings.push(`[final] loudness ${l.input_i} LUFS (target ${TARGET_LUFS})`);
    else warnings.push(`[final] loudness ${l.input_i} LUFS OK`);
  } else errors.push('[final] FINAL file missing');
  return {errors, warnings};
}

export function writeReport(id, parts) {
  const rep = {at: new Date().toISOString(), errors: parts.flatMap((p) => p.errors), warnings: parts.flatMap((p) => p.warnings)};
  rep.ok = rep.errors.length === 0;
  writeJson(path.join(projectDir(id), 'qa_report.json'), rep);
  return rep;
}
