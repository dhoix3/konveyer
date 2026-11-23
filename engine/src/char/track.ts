// Action library + track compiler: beats -> continuous character state (position, facing, pose).
// Everything is a pure function of time, so renders are deterministic and resumable.
import {clamp, lerp, smooth, easeOut, DEG, noise1, hashStr} from '../lib/math.ts';
import {IDLE, lerpPose, mkPose, seatedLeg, POSE_KEYS} from './skeleton.ts';
import type {Pose} from './skeleton.ts';
import type {ActionName, Beat, Emotion, Facing, LookSpec, ResolvedScene} from '../lib/types.ts';
import type {EmoKey} from './emotions.ts';

export const SPEED = {walk: 270, run: 650, carry: 220};
const CYCLE = {walk: 304, run: 480, carry: 280};
const MOVE_ACTIONS: ActionName[] = ['walk', 'run', 'carry'];
export const isMove = (a: ActionName) => MOVE_ACTIONS.includes(a);

const BLEND: Partial<Record<ActionName, number>> = {
  sit: 0.7, sit_up: 0.8, stand_up: 0.9, lie: 0.8, sleep: 0.8, fall: 0.12, jump: 0.12,
  cower: 0.18, walk: 0.3, run: 0.3, carry: 0.35, idle: 0.35, float: 1.0, slump: 0.8, shrug: 0.25,
};
const OVERSHOOT: ActionName[] = ['wave', 'point', 'hands_up', 'cheer', 'reach', 'stretch'];

export interface Seg {
  t0: number; t1: number; action: ActionName;
  x0: number; x1: number; moveDur: number; ramp: number;
  seatH: number; blend: number; sgn: number; dur: number;
}

export interface CharState {
  x: number; fx: number; face: number; pose: Pose; v: number;
  eyeClosed: number; action: ActionName; seg: number;
}

export interface Track {
  segs: Seg[];
  emoKeys: EmoKey[];
  lookKeys: {t: number; look: LookSpec}[];
  holdKeys: {t: number; hold: Beat['hold']; drop?: Beat['drop']}[];
  at: (t: number) => CharState;
  footsteps: () => number[];
  xAt: (t: number) => number;
}

const sineBlink = (a: number, f: number, t: number) => a * Math.sin(2 * Math.PI * f * t);

// distance travelled along a trapezoid velocity profile
export function travelled(seg: Seg, lt: number): {d: number; v: number} {
  const total = Math.abs(seg.x1 - seg.x0);
  const D = seg.moveDur;
  if (total < 0.5 || D <= 0) return {d: 0, v: 0};
  const r = seg.ramp;
  const vmax = total / Math.max(0.001, D - r);
  if (lt <= 0) return {d: 0, v: 0};
  if (lt >= D) return {d: total, v: 0};
  if (lt < r) return {d: (vmax * lt * lt) / (2 * r), v: (vmax * lt) / r};
  if (lt <= D - r) return {d: vmax * (r / 2 + (lt - r)), v: vmax};
  const rem = D - lt;
  return {d: total - (vmax * rem * rem) / (2 * r), v: (vmax * rem) / r};
}

function locomotion(kind: 'walk' | 'run' | 'carry', dist: number, v: number): Pose {
  const run = kind === 'run';
  const A = run ? 52 : 30;
  const K = run ? 105 : 40;
  const nominal = SPEED[kind];
  const k = Math.pow(clamp(v / (nominal * 0.85)), 0.6);
  const phi = (2 * Math.PI * dist) / CYCLE[kind];
  const s = Math.sin(phi);
  const kneeL = 5 + K * Math.pow(Math.max(0, Math.cos(phi + 0.35)), 1.4);
  const kneeR = 5 + K * Math.pow(Math.max(0, Math.cos(phi + Math.PI + 0.35)), 1.4);
  const armA = run ? 55 : 24;
  const carry = kind === 'carry';
  const p = mkPose({
    torso: lerp(2, run ? 16 : 4, k),
    head: lerp(0, run ? -9 : -2, k),
    lHp: lerp(2, A * s, k), rHp: lerp(-3, -A * s, k),
    lKn: lerp(3, kneeL, k), rKn: lerp(3, kneeR, k),
    lSh: carry ? 62 : lerp(6, -armA * s, k),
    rSh: carry ? 66 : lerp(-4, armA * s, k),
    lEl: carry ? 75 : lerp(8, run ? 88 : 14 + 8 * (1 + s), k),
    rEl: carry ? 72 : lerp(10, run ? 88 : 14 + 8 * (1 - s), k),
    air: run ? 14 * k * (1 - Math.abs(s)) : 0,
  });
  return p;
}

function seated(seatH: number, extra: Partial<Pose> = {}): Pose {
  const l = seatedLeg(seatH, 78);
  const r = seatedLeg(seatH, 84);
  return mkPose({
    seat: 1, seatH, torso: 4, head: 2,
    lHp: l.hp, lKn: l.kn, rHp: r.hp, rKn: r.kn, lAnk: 0, rAnk: 0,
    lSh: 22, lEl: 70, rSh: 28, rEl: 78, ...extra,
  });
}

function lying(lift: number, extra: Partial<Pose> = {}): Pose {
  return mkPose({
    rot: -90, torso: 0, head: -3, lift,
    lSh: -10, lEl: 30, rSh: -4, rEl: 55,
    lHp: 4, lKn: 8, rHp: 10, rKn: 24, ...extra,
  });
}

// pose for any non-locomotion action. lt = local time in segment, d = segment duration
export function actionPose(a: ActionName, lt: number, d: number, seatH: number, absT: number): Pose {
  const ph = (f: number) => 2 * Math.PI * f * lt;
  const sm = (t0: number, t1: number) => smooth((lt - t0) / Math.max(0.001, t1 - t0));
  switch (a) {
    case 'idle':
      return IDLE;
    case 'sit':
      return seated(seatH);
    case 'sit_up':
      return seated(seatH, {torso: -4, rSh: -38, rEl: 6, lSh: -30, lEl: 6, head: 4});
    case 'lie':
      return lying(seatH);
    case 'sleep':
      return lying(seatH, {torso: 0.8 * Math.sin(absT * 1.7)});
    case 'stand_up':
      return mkPose({torso: 5, head: 0});
    case 'wave':
      return mkPose({rSh: 150, rEl: 28 + sineBlink(26, 2.2, lt), torso: -1, head: 4});
    case 'point':
      return mkPose({rSh: 88, rEl: 4, torso: 6, head: 2, lSh: 4});
    case 'shrug': {
      const w = sm(0, 0.25) * (1 - sm(d - 0.3, d));
      return mkPose({lSh: lerp(6, 25, w), lEl: lerp(8, 85, w), rSh: lerp(-4, 25, w), rEl: lerp(10, 85, w), head: 9 * w, torso: -1 * w});
    }
    case 'facepalm':
      return mkPose({rSh: 80, rEl: 140, torso: 7, head: 14, lSh: 8});
    case 'cross_arms':
      return mkPose({lSh: 36, lEl: 125, rSh: 44, rEl: 130, torso: 1});
    case 'hands_up':
      return mkPose({lSh: 150, lEl: 14, rSh: 158, rEl: 12, head: -8, torso: -3});
    case 'cower':
      return mkPose({torso: 38, head: 22, lHp: 62, lKn: 112, rHp: 56, rKn: 106, lSh: 128, lEl: 120, rSh: 134, rEl: 118});
    case 'jump': {
      const ant = 0.22 * d, fly = 0.58 * d;
      if (lt < ant) {
        const w = smooth(lt / ant);
        return mkPose({torso: 18 * w, lHp: 50 * w, lKn: 95 * w, rHp: 46 * w, rKn: 90 * w, lSh: -35 * w, rSh: -40 * w, lEl: 25, rEl: 25});
      }
      const u = clamp((lt - ant) / fly);
      if (u < 1) {
        return mkPose({air: 130 * Math.sin(Math.PI * u), torso: 4, lHp: 32, lKn: 70, rHp: 18, rKn: 60, lSh: 150, rSh: 156, lEl: 20, rEl: 16});
      }
      const w = 1 - smooth((lt - ant - fly) / (d - ant - fly));
      return mkPose({torso: 14 * w, lHp: 44 * w, lKn: 88 * w, rHp: 40 * w, rKn: 84 * w, lSh: 20 * w});
    }
    case 'fall': {
      const u = easeOut(clamp(lt / Math.max(0.2, d * 0.75)));
      return mkPose({rot: -95 * u, torso: 0, lSh: lerp(6, 140, 1 - u), rSh: lerp(-4, 150, 1 - u), lEl: 20, rEl: 20, lHp: 12 * u, rHp: -8 * u, lKn: 14 * u, rKn: 20 * u, head: -8 * u, air: 60 * Math.max(0, 1 - lt / (d * 0.5)) * Math.sin(Math.PI * clamp(lt / (d * 0.5)))});
    }
    case 'knock': {
      const cyc = (lt * 2.6) % 1;
      const hit = Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, cyc * 1.6))), 2);
      return mkPose({rSh: 86 - 10 * hit, rEl: 95 - 55 * hit, torso: 4, head: 3});
    }
    case 'type':
      return seated(seatH, {torso: 9, head: 10, lSh: 52, lEl: 58 + sineBlink(7, 4.5, lt), rSh: 56, rEl: 54 + sineBlink(7, 5.1, lt + 0.1)});
    case 'drink': {
      const up = sm(0, 0.5) * (1 - sm(d - 0.55, d - 0.05));
      return mkPose({rSh: lerp(-4, 72, up), rEl: lerp(10, 128, up), head: -12 * up, torso: -3 * up});
    }
    case 'look_phone':
      return mkPose({rSh: 64, rEl: 92, lSh: 14, lEl: 20, head: 22, torso: 7});
    case 'think':
      return mkPose({rSh: 74, rEl: 132, lSh: 40, lEl: 112, head: 9, torso: 2});
    case 'cheer':
      return mkPose({lSh: 164, lEl: 10, rSh: 168, rEl: 8, head: -9, torso: -4, air: 20 * Math.abs(Math.sin(ph(1.3)))});
    case 'reach':
      return mkPose({rSh: 100, rEl: 14, lSh: 24, torso: 16, head: 4, lHp: 22, lKn: 4, rHp: -26, rKn: 16});
    case 'clap': {
      const c = 0.5 + 0.5 * Math.sin(ph(3.2));
      return mkPose({lSh: 66, lEl: 20 + 70 * c, rSh: 62, rEl: 24 + 66 * c, head: -2});
    }
    case 'stretch': {
      const w = sm(0, 0.8) * (1 - sm(d - 0.6, d));
      return mkPose({lSh: lerp(6, 172, w), lEl: lerp(8, 8, w), rSh: lerp(-4, 176, w), rEl: lerp(10, 8, w), torso: -9 * w, head: -14 * w});
    }
    case 'float':
      return mkPose({
        rot: 18 * Math.sin(absT * 0.9), torso: 4, head: 4,
        lSh: 44 + 10 * Math.sin(absT * 1.3), lEl: 28, rSh: 28 + 10 * Math.sin(absT * 1.1 + 1), rEl: 36,
        lHp: 22, lKn: 30, rHp: -12, rKn: 44, air: 230 + 14 * Math.sin(absT * 1.2),
      });
    case 'slump':
      return mkPose({torso: 24, head: 26, lSh: 2, lEl: 4, rSh: -2, rEl: 6, lHp: 4, lKn: 8, rHp: -2, rKn: 6});
    case 'turn':
    default:
      return IDLE;
  }
}

function resolveT(t: number) {
  return t;
}

export function compileTrack(scene: ResolvedScene, charId: string): Track {
  const actor = scene.actors.find((a) => a.char === charId);
  const beats = scene.beats.filter((b) => b.char === charId).sort((a, b) => a.t - b.t);
  const sceneDur = scene.durSec;
  const startAction: ActionName = actor?.start || 'idle';
  const startSeat = actor?.seatH ?? (startAction === 'lie' || startAction === 'sleep' ? 60 : 80);

  // face keys
  const faceKeys: {t: number; to: number}[] = [{t: -10, to: (actor?.facing || 'r') === 'r' ? 1 : -1}];
  const emoKeys: EmoKey[] = [];
  const lookKeys: Track['lookKeys'] = [];
  const holdKeys: Track['holdKeys'] = [];
  const faceTo = (f: Facing) => (f === 'r' ? 1 : -1);

  // build segments
  const actBeats = beats.filter((b) => b.do);
  const first = actBeats[0];
  const initial: Beat & {t: number} = {t: 0, char: charId, do: startAction, seatH: startSeat};
  const list: (Beat & {t: number})[] = first && first.t <= 0.001 ? actBeats as (Beat & {t: number})[] : [initial, ...(actBeats as (Beat & {t: number})[])];

  const segs: Seg[] = [];
  let curX = actor?.x ?? 960;
  let curSeat = startSeat;
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    const act = b.do as ActionName;
    const t0 = resolveT(b.t);
    const t1 = i + 1 < list.length ? list[i + 1].t : sceneDur + 5;
    const segDur = Math.max(0.05, t1 - t0);
    const seatH = b.seatH ?? (act === 'sit' || act === 'type' || act === 'sit_up' ? curSeat : act === 'lie' || act === 'sleep' ? curSeat : 80);
    if (b.seatH !== undefined) curSeat = b.seatH;
    let x1 = curX;
    let moveDur = 0;
    if (isMove(act)) {
      const kind = act as 'walk' | 'run' | 'carry';
      const target = b.to ?? curX + (faceKeys[faceKeys.length - 1].to) * 200;
      const dist = Math.abs(target - curX);
      const sp = b.speed ?? SPEED[kind];
      moveDur = b.dur ?? dist / sp;
      moveDur = Math.min(moveDur, segDur);
      x1 = target;
      const dir = Math.sign(target - curX);
      if (dir !== 0 && dir !== faceKeys[faceKeys.length - 1].to) faceKeys.push({t: t0, to: dir});
    }
    if (b.face && b.t >= 0) {
      const f = faceTo(b.face);
      if (f !== faceKeys[faceKeys.length - 1].to) faceKeys.push({t: t0, to: f});
    }
    const ramp = Math.min(0.35, moveDur / 3);
    segs.push({t0, t1: t0 + moveDur > 0 && isMove(act) && moveDur < segDur - 0.02 ? t0 + moveDur : t1, action: act, x0: curX, x1, moveDur, ramp, seatH, blend: BLEND[act] ?? 0.3, sgn: Math.sign(x1 - curX), dur: segDur});
    if (isMove(act) && moveDur < segDur - 0.02) {
      segs.push({t0: t0 + moveDur, t1, action: 'idle', x0: x1, x1, moveDur: 0, ramp: 0, seatH: 80, blend: 0.35, sgn: 0, dur: t1 - t0 - moveDur});
    }
    curX = x1;
  }

  // facing keys from beats without actions + emotion/look/hold keys
  for (const b of beats) {
    if (b.emotion) emoKeys.push({t: b.t, emo: b.emotion as Emotion});
    if (b.look !== undefined) lookKeys.push({t: b.t, look: b.look});
    if (b.hold !== undefined) holdKeys.push({t: b.t, hold: b.hold, drop: b.drop});
    if (!b.do && b.face) {
      const f = faceTo(b.face);
      if (f !== faceKeys[faceKeys.length - 1].to) faceKeys.push({t: b.t, to: f});
    }
  }
  faceKeys.sort((a, b) => a.t - b.t);
  emoKeys.sort((a, b) => a.t - b.t);
  lookKeys.sort((a, b) => a.t - b.t);
  holdKeys.sort((a, b) => a.t - b.t);

  const faceAt = (t: number) => {
    let val = faceKeys[0].to;
    for (let i = 1; i < faceKeys.length; i++) {
      const k = faceKeys[i];
      const prev = faceKeys[i - 1].to;
      if (t >= k.t) {
        val = lerp(prev, k.to, smooth((t - k.t) / 0.3));
      } else break;
    }
    return val;
  };

  const segAt = (t: number) => {
    let idx = 0;
    for (let i = 0; i < segs.length; i++) if (segs[i].t0 <= t) idx = i;
    return idx;
  };

  const poseOf = (s: Seg, lt: number, absT: number): {pose: Pose; v: number} => {
    if (isMove(s.action)) {
      const tr = travelled(s, lt);
      return {pose: locomotion(s.action as 'walk' | 'run' | 'carry', tr.d, tr.v), v: tr.v};
    }
    return {pose: actionPose(s.action, lt, s.dur, s.seatH, absT), v: 0};
  };

  const breathe = (p: Pose, t: number): Pose => {
    const b = Math.sin(t * 1.75 + hashStr(charId)) * 0.9 + noise1(t * 0.35, hashStr(charId) % 50) * 0.6;
    return {...p, torso: p.torso + b, head: p.head - b * 0.5, lSh: p.lSh + b * 0.8, rSh: p.rSh - b * 0.8};
  };

  const at = (t: number): CharState => {
    const i = segAt(t);
    const s = segs[i];
    const lt = t - s.t0;
    let {pose, v} = poseOf(s, lt, t);
    if (i > 0 && lt < s.blend) {
      const ps = segs[i - 1];
      const pp = poseOf(ps, ps.t1 - ps.t0, t).pose;
      let w = smooth(lt / s.blend);
      if (OVERSHOOT.includes(s.action)) {
        const x = clamp(lt / s.blend);
        w = 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);
      }
      pose = lerpPose(pp, pose, w);
    }
    pose = breathe(pose, t);
    const tr = isMove(s.action) ? travelled(s, lt) : {d: 0, v: 0};
    const x = s.x0 + s.sgn * tr.d;
    const fx = faceAt(t);
    const closed = s.action === 'sleep' ? 1 : 0;
    return {x, fx, face: fx >= 0 ? 1 : -1, pose, v, eyeClosed: closed, action: s.action, seg: i};
  };

  const footsteps = () => {
    const out: number[] = [];
    for (const s of segs) {
      if (!isMove(s.action) || s.moveDur <= 0) continue;
      const kind = s.action as 'walk' | 'run' | 'carry';
      const total = Math.abs(s.x1 - s.x0);
      const stepLen = CYCLE[kind] / 2;
      let n = 1;
      for (let lt = 0; lt <= s.moveDur; lt += 1 / 120) {
        if (travelled(s, lt).d >= n * stepLen * 0.5 + (n - 1) * stepLen * 0.5 && n * stepLen * 0.5 + (n - 1) * stepLen * 0.5 <= total) {
          out.push(s.t0 + lt);
          n++;
        }
      }
    }
    return out;
  };

  const xAt = (t: number) => at(t).x;
  return {segs, emoKeys, lookKeys, holdKeys, at, footsteps, xAt};
}

export {POSE_KEYS};
