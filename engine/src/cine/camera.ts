// Virtual camera: shots -> continuous camera state (pure, deterministic, smooth).
import {clamp, easeInOut, noise1, smooth} from '../lib/math.ts';
import type {ResolvedScene} from '../lib/types.ts';

export const SHOT_ZOOM: Record<string, number> = {
  establishing: 0.92, wide: 1.0, medium: 1.55, close: 2.4, extreme_close: 3.5, insert: 3.0, ots: 1.9,
};

export interface CamState {
  cx: number; cy: number; zoom: number; rot: number;
  shot: number; local: number; shotDur: number; black: number; moving: number;
}

export type FocusFn = (shot: ResolvedScene['shots'][number], t: number) => {x: number; y: number};

export function shotRanges(scene: ResolvedScene) {
  const shots = [...scene.shots].sort((a, b) => a.t - b.t);
  return shots.map((s, i) => ({
    shot: s,
    t0: s.t,
    t1: i + 1 < shots.length ? shots[i + 1].t : scene.durSec,
  }));
}

export function compileCamera(scene: ResolvedScene, focus: FocusFn) {
  const ranges = shotRanges(scene);
  return (t: number): CamState => {
    let idx = 0;
    for (let i = 0; i < ranges.length; i++) if (ranges[i].t0 <= t) idx = i;
    const r = ranges[idx];
    const s = r.shot;
    const dur = Math.max(0.1, r.t1 - r.t0);
    const local = t - r.t0;
    const u = easeInOut(clamp(local / dur));
    const lin = clamp(local / dur);
    // focus smoothing: average over the last 0.5 s of subject motion (never before the shot started... clamp to >= 0)
    let fx = 0, fy = 0;
    const N = 5;
    for (let i = 0; i < N; i++) {
      const f = focus(s, Math.max(0, t - (i * 0.5) / (N - 1)));
      fx += f.x / N;
      fy += f.y / N;
    }
    let z = s.zoom ?? SHOT_ZOOM[s.type] ?? 1;
    let cx = fx;
    let cy = fy;
    let rot = s.dutch ?? 0;
    const pan = s.pan ?? 240;
    const mv = s.move ?? 'drift';
    switch (mv) {
      case 'push': z *= 1 + 0.16 * u; break;
      case 'pull': z *= 1.16 - 0.16 * u; break;
      case 'pan': cx += pan * (u - 0.5); break;
      case 'dolly': cx += pan * 0.7 * (u - 0.5); z *= 1 + 0.07 * u; break;
      case 'crane': cy += 120 * (0.5 - u); z *= 1.08 - 0.08 * u; break;
      case 'handheld':
        cx += 7 * noise1(t * 0.8, 1) + 40 * (lin - 0.5);
        cy += 5 * noise1(t * 0.7, 2);
        rot += 0.3 * noise1(t * 0.5, 3);
        z *= 1 + 0.04 * lin;
        break;
      default: // drift
        cx += 56 * (lin - 0.5);
        z *= 1 + 0.035 * lin;
    }
    if (s.angle === 'low') cy -= 70 / z;
    if (s.angle === 'high') cy += 60 / z;
    // keep the frame inside the drawn world
    const hw = 960 / z;
    const hh = 540 / z;
    const xr = [-480 + hw, 2400 - hw];
    const yr = [-260 + hh, 1260 - hh];
    cx = xr[0] <= xr[1] ? clamp(cx, xr[0], xr[1]) : 960;
    cy = yr[0] <= yr[1] ? clamp(cy, yr[0], yr[1]) : 540;
    // dips / fades at the shot boundary
    let black = 0;
    const cut = s.cut ?? 'cut';
    if (cut !== 'cut' && idx > 0) black = Math.max(black, 1 - smooth(local / (cut === 'dip' ? 0.22 : 0.4)));
    const next = ranges[idx + 1]?.shot;
    if (next && (next.cut ?? 'cut') !== 'cut') {
      const w = next.cut === 'dip' ? 0.22 : 0.4;
      black = Math.max(black, smooth((t - (r.t1 - w)) / w) * 0.0 + 0);
    }
    const moving = mv === 'handheld' ? 1 : 0.5;
    return {cx, cy, zoom: z, rot, shot: idx, local, shotDur: dur, black: clamp(black), moving};
  };
}
