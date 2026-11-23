// Facial expression model for the white-eyed stickman head.
import {clamp, lerp, smooth, hashStr} from '../lib/math.ts';
import type {Emotion} from '../lib/types.ts';

export interface FaceParams {
  open: number; // eye openness 0..1
  lid: number; // upper lid slant, deg (+ = angry: inner end lower)
  squint: number; // lower lid pushed up (happy cheeks) 0..1
  pupil: number; // pupil size 0.3..1
  mouthC: number; // mouth curve -1 (sad) .. 1 (smile)
  mouthO: number; // static mouth openness 0..1
  eyeScale: number;
  droop: number; // outer lid droop (sad/tired) deg
}

export const EMOTIONS: Record<Emotion, FaceParams> = {
  neutral: {open: 1, lid: 0, squint: 0, pupil: 0.55, mouthC: 0, mouthO: 0, eyeScale: 1, droop: 0},
  happy: {open: 0.95, lid: -4, squint: 0.55, pupil: 0.6, mouthC: 1, mouthO: 0.15, eyeScale: 1, droop: 0},
  sad: {open: 0.85, lid: -10, squint: 0, pupil: 0.55, mouthC: -0.9, mouthO: 0, eyeScale: 1, droop: 22},
  angry: {open: 0.8, lid: 24, squint: 0.15, pupil: 0.5, mouthC: -0.6, mouthO: 0.1, eyeScale: 1, droop: 0},
  surprised: {open: 1, lid: -6, squint: 0, pupil: 0.32, mouthC: 0, mouthO: 0.85, eyeScale: 1.22, droop: 0},
  scared: {open: 1, lid: -12, squint: 0, pupil: 0.28, mouthC: -0.5, mouthO: 0.55, eyeScale: 1.18, droop: 8},
  tired: {open: 0.42, lid: -6, squint: 0, pupil: 0.55, mouthC: -0.2, mouthO: 0, eyeScale: 1, droop: 14},
  thinking: {open: 0.9, lid: 8, squint: 0.1, pupil: 0.55, mouthC: -0.1, mouthO: 0, eyeScale: 1, droop: 0},
  smug: {open: 0.7, lid: 10, squint: 0.35, pupil: 0.55, mouthC: 0.7, mouthO: 0, eyeScale: 1, droop: 0},
  panic: {open: 1, lid: -16, squint: 0, pupil: 0.25, mouthC: -0.3, mouthO: 0.9, eyeScale: 1.28, droop: 10},
};

export interface EmoKey { t: number; emo: Emotion }

export function emotionAt(keys: EmoKey[], t: number, ramp = 0.25): FaceParams {
  let i = -1;
  for (let k = 0; k < keys.length; k++) if (keys[k].t <= t) i = k;
  const cur = i < 0 ? 'neutral' : keys[i].emo;
  const prev = i <= 0 ? 'neutral' : keys[i - 1].emo;
  const w = i < 0 ? 1 : smooth((t - keys[i].t) / ramp);
  const a = EMOTIONS[prev];
  const b = EMOTIONS[cur];
  const out = {} as FaceParams;
  (Object.keys(a) as (keyof FaceParams)[]).forEach((k) => {
    out[k] = lerp(a[k], b[k], w);
  });
  return out;
}

// Deterministic blink: every ~2.6-5 s, 5 frames long at 24fps. Returns eye closing factor 0..1.
export function blinkAt(charId: string, t: number): number {
  const seed = hashStr(charId);
  const period = 3.1 + (seed % 17) / 10; // 3.1 .. 4.7 s
  const phase = (seed % 100) / 100 * period;
  const lt = (t + phase) % period;
  const d = 0.2;
  if (lt > d) return 0;
  const x = lt / d;
  return clamp(1 - Math.abs(x * 2 - 1));
}
