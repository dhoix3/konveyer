// Forward-kinematics stickman skeleton with a ground-contact solver.
// Every limb is a fixed-length bone attached to a parent joint, so the anatomy
// (2 arms, 2 legs, 1 torso, 1 head, no detached parts) is guaranteed by construction.
import {DEG, lerp} from '../lib/math.ts';

export const BONES = {
  upperArm: 55,
  foreArm: 52,
  thigh: 80,
  shin: 80,
  torso: 100,
  neck: 10,
  headR: 27,
  foot: 24,
  standHip: 160,
};

export interface Pose {
  rot: number; // whole body rotation about the hip (deg, +clockwise / forward)
  torso: number; // torso lean relative to rot
  head: number; // head tilt relative to torso
  lSh: number; lEl: number; // far arm: shoulder angle from "down" (+forward/up), elbow bend (>=0)
  rSh: number; rEl: number; // near arm
  lHp: number; lKn: number; // far leg: hip angle from "down" (+forward), knee bend (>=0)
  rHp: number; rKn: number; // near leg
  lAnk: number; rAnk: number; // foot rotation (deg), + = toes up
  seat: number; // 0..1 weight of "hip pinned to seat height"
  seatH: number; // height of the seat / hip pinned height above support
  lift: number; // height of the support surface under the body (bed, platform)
  air: number; // extra height above support (jumping, floating)
}

export const POSE_KEYS = [
  'rot', 'torso', 'head', 'lSh', 'lEl', 'rSh', 'rEl', 'lHp', 'lKn', 'rHp', 'rKn',
  'lAnk', 'rAnk', 'seat', 'seatH', 'lift', 'air',
] as const;

export const IDLE: Pose = {
  rot: 0, torso: 2, head: 0,
  lSh: 6, lEl: 8, rSh: -4, rEl: 10,
  lHp: 2, lKn: 3, rHp: -3, rKn: 3,
  lAnk: 0, rAnk: 0,
  seat: 0, seatH: 80, lift: 0, air: 0,
};

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out = {...a} as Pose;
  for (const k of POSE_KEYS) out[k] = lerp(a[k], b[k], t);
  return out;
}

export function mkPose(over: Partial<Pose>): Pose {
  return {...IDLE, ...over};
}

// Joint limits (also used by the anatomy QA check)
export const LIMITS = {
  elbow: [0, 160],
  knee: [0, 150],
  shoulder: [-80, 185],
  hip: [-75, 130],
  neckTilt: [-50, 50],
};

export interface Pt { x: number; y: number }
export interface Skeleton {
  hip: Pt; neck: Pt; head: Pt; headAngle: number; torsoAngle: number;
  lElb: Pt; lHand: Pt; rElb: Pt; rHand: Pt;
  lKnee: Pt; lAnkle: Pt; lToe: Pt; rKnee: Pt; rAnkle: Pt; rToe: Pt;
  rForeAngle: number; lForeAngle: number;
  s: number; // scale
  lowest: number;
  bodyRot: number;
}

const dirDown = (a: number) => ({x: Math.sin(a * DEG), y: Math.cos(a * DEG)});
const dirUp = (a: number) => ({x: Math.sin(a * DEG), y: -Math.cos(a * DEG)});
const add = (p: Pt, d: Pt, len: number): Pt => ({x: p.x + d.x * len, y: p.y + d.y * len});

export interface SolveOpts {
  x: number; // world x of the hip
  groundY: number; // world y of the floor
  fx: number; // facing scalar -1..1 (mirror / turn)
  scale: number;
  limbW: number; // limb stroke width (for ground contact radius)
}

// Returns world-space joints. Pose is authored facing +x; fx mirrors/turns it.
export function solve(p: Pose, o: SolveOpts): Skeleton {
  const s = o.scale;
  const B = BONES;
  const T = p.rot + p.torso;
  const hip: Pt = {x: 0, y: 0};
  const neck = add(hip, dirUp(T), B.torso * s);
  const headAngle = T + p.head;
  const head = add(neck, dirUp(headAngle), (B.neck + B.headR) * s);

  const armL = (sh: number, el: number) => {
    const a1 = sh - T;
    const elb = add(neck, dirDown(a1), B.upperArm * s);
    const a2 = sh + Math.max(0, el) - T;
    return {elb, hand: add(elb, dirDown(a2), B.foreArm * s), a2};
  };
  const la = armL(p.lSh, p.lEl);
  const ra = armL(p.rSh, p.rEl);

  const legL = (hp: number, kn: number, ank: number) => {
    const a1 = hp - p.rot;
    const knee = add(hip, dirDown(a1), B.thigh * s);
    const a2 = hp - Math.max(0, kn) - p.rot;
    const ankle = add(knee, dirDown(a2), B.shin * s);
    const toe = add(ankle, dirDown(a2 + 90 - ank), B.foot * s);
    return {knee, ankle, toe};
  };
  const ll = legL(p.lHp, p.lKn, p.lAnk);
  const rl = legL(p.rHp, p.rKn, p.rAnk);

  const r = o.limbW / 2;
  const pts: [Pt, number][] = [
    [hip, r + 2], [neck, r], [head, B.headR * s],
    [la.elb, r], [la.hand, r], [ra.elb, r], [ra.hand, r],
    [ll.knee, r], [ll.ankle, r], [ll.toe, r * 0.8], [rl.knee, r], [rl.ankle, r], [rl.toe, r * 0.8],
  ];
  let maxY = -1e9;
  for (const [pt, rad] of pts) maxY = Math.max(maxY, pt.y + rad);

  // vertical placement: touch the support surface, optionally pinned to a seat
  const groundTarget = o.groundY - p.lift;
  const groundHipY = groundTarget - maxY;
  const seatHipY = groundTarget - p.seatH * s;
  const hipY = lerp(groundHipY, seatHipY, p.seat) - p.air;

  const place = (pt: Pt): Pt => ({x: o.x + o.fx * pt.x, y: hipY + pt.y});
  return {
    hip: place(hip), neck: place(neck), head: place(head), headAngle, torsoAngle: T,
    lElb: place(la.elb), lHand: place(la.hand), rElb: place(ra.elb), rHand: place(ra.hand),
    lKnee: place(ll.knee), lAnkle: place(ll.ankle), lToe: place(ll.toe),
    rKnee: place(rl.knee), rAnkle: place(rl.ankle), rToe: place(rl.toe),
    rForeAngle: ra.a2, lForeAngle: la.a2, s, lowest: hipY + maxY, bodyRot: p.rot,
  };
}

// 2-bone IK helper for seated legs: knee bend that puts the foot on the floor
export function seatedLeg(seatH: number, thighDeg = 78, s = 1) {
  const need = (seatH * s - BONES.thigh * s * Math.cos(thighDeg * DEG)) / (BONES.shin * s);
  const shinAng = Math.acos(Math.min(1, Math.max(-1, need))) / DEG;
  return {hp: thighDeg, kn: Math.max(0, thighDeg - shinAng)};
}
