import React from 'react';
import {rnd, shade} from '../lib/math.ts';

export type TimeOfDay = 'day' | 'night' | 'dusk' | 'dawn' | 'indoor';

export interface EnvCtx {
  t: number;
  frame: number;
  time: TimeOfDay;
  weather: string;
  accent: string; // key light colour
}

export interface Palette {
  skyTop: string; skyBot: string; wall: string; wallDark: string; floor: string; floorDark: string;
  far: string; mid: string; near: string; windowLit: string; ink: string; night: boolean;
}

export const palette = (time: TimeOfDay): Palette => {
  switch (time) {
    case 'night':
      return {skyTop: '#050816', skyBot: '#18234a', wall: '#232840', wallDark: '#161a2c', floor: '#191a26', floorDark: '#0f1019', far: '#0d1226', mid: '#141a33', near: '#0a0d1a', windowLit: '#ffcf7a', ink: '#05060b', night: true};
    case 'dusk':
      return {skyTop: '#2a2858', skyBot: '#f08a5a', wall: '#5b4659', wallDark: '#3a2c3d', floor: '#3b2f3a', floorDark: '#251c28', far: '#4a3558', mid: '#33263f', near: '#1c1424', windowLit: '#ffd08a', ink: '#0d0810', night: false};
    case 'dawn':
      return {skyTop: '#32436f', skyBot: '#f5bb92', wall: '#7a6a78', wallDark: '#4d4252', floor: '#4b4350', floorDark: '#2f2a35', far: '#5e5878', mid: '#453f5c', near: '#26233a', windowLit: '#ffe0a8', ink: '#101018', night: false};
    case 'indoor':
      return {skyTop: '#9db6c4', skyBot: '#d6e3e8', wall: '#a9b4b8', wallDark: '#7c888e', floor: '#6a6f73', floorDark: '#464a4e', far: '#8c9ba3', mid: '#6c7a82', near: '#3c464c', windowLit: '#fff1c4', ink: '#12161a', night: false};
    default:
      return {skyTop: '#5c9bd2', skyBot: '#cfe6f2', wall: '#cdbda5', wallDark: '#a8957c', floor: '#8b6b4b', floorDark: '#6a4f36', far: '#8fb0c6', mid: '#6f8fa6', near: '#3e5668', windowLit: '#fff2c0', ink: '#111418', night: false};
  }
};

export const Grad: React.FC<{id: string; a: string; b: string; vertical?: boolean; mid?: string}> = ({id, a, b, vertical = true, mid}) => (
  <linearGradient id={id} x1="0" y1="0" x2={vertical ? 0 : 1} y2={vertical ? 1 : 0}>
    <stop offset="0" stopColor={a} />
    {mid && <stop offset="0.5" stopColor={mid} />}
    <stop offset="1" stopColor={b} />
  </linearGradient>
);

export const Sky: React.FC<{p: Palette; id: string; ctx: EnvCtx; clouds?: boolean; y0?: number; y1?: number; stars?: boolean}> = ({p, id, ctx, clouds = true, y0 = -500, y1 = 820, stars = true}) => (
  <g>
    <defs><Grad id={id} a={p.skyTop} b={p.skyBot} /></defs>
    <rect x={-900} y={y0} width={4000} height={y1 - y0} fill={`url(#${id})`} />
    {p.night && stars && <Stars t={ctx.t} />}
    {clouds && <Clouds t={ctx.t} p={p} y={y1 - 520} />}
  </g>
);

export const Stars: React.FC<{t: number; n?: number}> = ({t, n = 90}) => (
  <g fill="#fff">
    {Array.from({length: n}, (_, i) => {
      const x = -700 + rnd(i * 7 + 1) * 3300;
      const y = -420 + rnd(i * 7 + 2) * 760;
      const r = 0.8 + rnd(i * 7 + 3) * 1.8;
      const tw = 0.45 + 0.55 * Math.abs(Math.sin(t * (0.6 + rnd(i * 7 + 4) * 1.8) + i));
      return <circle key={i} cx={x} cy={y} r={r} opacity={tw} />;
    })}
  </g>
);

export const Clouds: React.FC<{t: number; p: Palette; y: number; n?: number; speed?: number}> = ({t, p, y, n = 6, speed = 9}) => (
  <g opacity={p.night ? 0.28 : 0.75}>
    {Array.from({length: n}, (_, i) => {
      const w = 260 + rnd(i * 3 + 1) * 280;
      const x = ((rnd(i * 3 + 2) * 3600 + t * speed * (0.6 + rnd(i * 3 + 5))) % 3800) - 900;
      const yy = y + rnd(i * 3 + 3) * 260;
      const c = p.night ? '#2a3459' : p.skyBot === '#f08a5a' ? '#ffb48a' : '#ffffff';
      return (
        <g key={i} transform={`translate(${x},${yy})`} fill={c}>
          <ellipse cx={0} cy={0} rx={w * 0.5} ry={34} />
          <ellipse cx={-w * 0.2} cy={-20} rx={w * 0.26} ry={34} />
          <ellipse cx={w * 0.12} cy={-30} rx={w * 0.3} ry={40} />
        </g>
      );
    })}
  </g>
);

// A window with a sky view; trees sway, optional city lights
export const WindowView: React.FC<{x: number; y: number; w: number; h: number; p: Palette; ctx: EnvCtx; id: string; tree?: boolean; frame?: string; curtains?: boolean; city?: boolean}> = ({x, y, w, h, p, ctx, id, tree = true, frame = '#2a2420', curtains = false, city = false}) => (
  <g transform={`translate(${x},${y})`}>
    <defs>
      <clipPath id={`${id}c`}><rect x={0} y={0} width={w} height={h} /></clipPath>
      <Grad id={`${id}g`} a={p.skyTop} b={p.skyBot} />
    </defs>
    <g clipPath={`url(#${id}c)`}>
      <rect width={w} height={h} fill={`url(#${id}g)`} />
      {p.night && <g transform={`scale(${w / 1400})`}><Stars t={ctx.t} n={26} /></g>}
      {p.night ? <circle cx={w * 0.7} cy={h * 0.25} r={w * 0.07} fill="#e8eeff" /> : <circle cx={w * 0.7} cy={h * 0.25} r={w * 0.08} fill="#fff6d0" opacity={0.9} />}
      {city && (
        <g fill={p.far}>
          {Array.from({length: 9}, (_, i) => {
            const bw = w / 9;
            const bh = h * (0.3 + rnd(i + 40) * 0.45);
            return (
              <g key={i}>
                <rect x={i * bw} y={h - bh} width={bw - 4} height={bh} />
                {Array.from({length: 6}, (_, k) => (
                  <rect key={k} x={i * bw + 6 + (k % 2) * 16} y={h - bh + 10 + Math.floor(k / 2) * 22} width={8} height={10} fill={p.windowLit} opacity={rnd(i * 9 + k + Math.floor(ctx.t / 3)) > 0.55 ? 0.85 : 0.1} />
                ))}
              </g>
            );
          })}
        </g>
      )}
      {tree && (
        <g transform={`translate(${w * 0.2},${h})`} fill={p.night ? '#06100c' : '#2a5a3a'}>
          <rect x={-5} y={-h * 0.5} width={10} height={h * 0.5} />
          {[0, 1, 2, 3].map((i) => (
            <ellipse key={i} cx={Math.sin(ctx.t * 1.1 + i * 1.7) * 6 + (i - 1.5) * 24} cy={-h * 0.55 - (i % 2) * 24} rx={46} ry={34} />
          ))}
        </g>
      )}
    </g>
    <rect x={0} y={0} width={w} height={h} fill="none" stroke={frame} strokeWidth={10} />
    <path d={`M${w / 2},0 V${h} M0,${h * 0.52} H${w}`} stroke={frame} strokeWidth={6} />
    {curtains && (
      <g>
        {[0, 1].map((s) => {
          const sw = Math.sin(ctx.t * 0.9 + s * 2) * 7;
          const x0 = s === 0 ? -16 : w + 16;
          const dir = s === 0 ? 1 : -1;
          return <path key={s} d={`M${x0},-14 L${x0 + dir * 62},-14 Q${x0 + dir * (50 + sw)},${h * 0.5} ${x0 + dir * (66 + sw * 1.5)},${h + 20} L${x0},${h + 20} Z`} fill="#8a3d46" opacity={0.92} />;
        })}
      </g>
    )}
  </g>
);

export const Wall: React.FC<{p: Palette; id: string; y0?: number; stripe?: boolean; baseboard?: boolean}> = ({p, id, y0 = -400, stripe = true, baseboard = true}) => (
  <g>
    <defs><Grad id={id} a={shade(p.wall, -0.1)} b={p.wallDark} /></defs>
    <rect x={-900} y={y0} width={4000} height={800 - y0} fill={`url(#${id})`} />
    {stripe && Array.from({length: 60}, (_, i) => <rect key={i} x={-900 + i * 64} y={y0} width={3} height={800 - y0} fill="#000" opacity={0.045} />)}
    {baseboard && <rect x={-900} y={758} width={4000} height={42} fill={shade(p.wallDark, -0.25)} />}
  </g>
);

export const Floor: React.FC<{p: Palette; id: string; plank?: boolean; shine?: number}> = ({p, id, plank = true, shine = 0.1}) => (
  <g>
    <defs>
      <Grad id={id} a={p.floor} b={p.floorDark} />
      <linearGradient id={`${id}s`} x1="0" x2="1"><stop offset="0" stopColor="#fff" stopOpacity={0} /><stop offset="0.5" stopColor="#fff" stopOpacity={shine} /><stop offset="1" stopColor="#fff" stopOpacity={0} /></linearGradient>
    </defs>
    <rect x={-900} y={800} width={4000} height={700} fill={`url(#${id})`} />
    {plank && Array.from({length: 40}, (_, i) => <path key={i} d={`M${-900 + i * 110},800 L${-900 + i * 190 - 800},1500`} stroke="#000" strokeWidth={2} opacity={0.18} />)}
    <rect x={-900} y={800} width={4000} height={120} fill={`url(#${id}s)`} />
    <rect x={-900} y={796} width={4000} height={6} fill="#000" opacity={0.3} />
  </g>
);

// light shaft from a window, pulsing slowly like drifting clouds
export const Shaft: React.FC<{x: number; w: number; color: string; t: number; slant?: number; op?: number; id: string}> = ({x, w, color, t, slant = 380, op = 0.22, id}) => {
  const pulse = 0.75 + 0.25 * Math.sin(t * 0.7) + 0.08 * Math.sin(t * 2.3);
  return (
    <g opacity={op * pulse}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity={0.9} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`M${x},40 L${x + w},40 L${x + w + slant},800 L${x + slant - w * 0.2},800 Z`} fill={`url(#${id})`} />
    </g>
  );
};

export const Building: React.FC<{x: number; w: number; h: number; color: string; lit: string; seed: number; t: number; density?: number; ground?: number; antenna?: boolean; flicker?: boolean}> = ({x, w, h, color, lit, seed, t, density = 0.5, ground = 800, antenna, flicker = true}) => {
  const cols = Math.max(2, Math.floor(w / 34));
  const rows = Math.max(2, Math.floor(h / 42));
  return (
    <g>
      <rect x={x} y={ground - h} width={w} height={h} fill={color} />
      <rect x={x} y={ground - h} width={w} height={6} fill="#fff" opacity={0.05} />
      {Array.from({length: cols * rows}, (_, i) => {
        const cx = i % cols;
        const cy = Math.floor(i / cols);
        const on = rnd(seed * 131 + i) < density;
        const fl = flicker && rnd(seed * 17 + i) > 0.97 ? 0.5 + 0.5 * Math.sin(t * 9 + i) : 1;
        return <rect key={i} x={x + 10 + cx * ((w - 20) / cols)} y={ground - h + 14 + cy * 42} width={((w - 20) / cols) * 0.55} height={20} fill={on ? lit : '#000'} opacity={on ? 0.85 * fl : 0.22} />;
      })}
      {antenna && (
        <g>
          <rect x={x + w / 2 - 2} y={ground - h - 70} width={4} height={70} fill={color} />
          <circle cx={x + w / 2} cy={ground - h - 72} r={4} fill="#ff3b30" opacity={0.3 + 0.7 * (Math.sin(t * 3 + seed) > 0.4 ? 1 : 0)} />
        </g>
      )}
    </g>
  );
};

export const Tree: React.FC<{x: number; h: number; t: number; seed: number; color: string; trunk?: string; ground?: number; pine?: boolean}> = ({x, h, t, seed, color, trunk = '#2a1c14', ground = 800, pine}) => {
  const sway = Math.sin(t * 0.9 + seed) * 2.2;
  return (
    <g transform={`translate(${x},${ground}) rotate(${sway * 0.4})`}>
      <rect x={-h * 0.03} y={-h * 0.45} width={h * 0.06} height={h * 0.45} fill={trunk} />
      {pine
        ? [0, 1, 2, 3].map((i) => <path key={i} d={`M${-h * (0.26 - i * 0.04)},${-h * (0.22 + i * 0.2)} L${Math.sin(t * 0.9 + seed + i) * 3},${-h * (0.52 + i * 0.2)} L${h * (0.26 - i * 0.04)},${-h * (0.22 + i * 0.2)} Z`} fill={color} />)
        : [0, 1, 2].map((i) => <ellipse key={i} cx={(i - 1) * h * 0.2 + sway * (1 + i * 0.5)} cy={-h * (0.58 + (i % 2) * 0.12)} rx={h * 0.26} ry={h * 0.22} fill={color} />)}
    </g>
  );
};

export const Steam: React.FC<{x: number; y: number; t: number; n?: number; color?: string}> = ({x, y, t, n = 7, color = '#fff'}) => (
  <g>
    {Array.from({length: n}, (_, i) => {
      const life = ((t * 0.55 + i / n) % 1);
      return <circle key={i} cx={x + Math.sin(t * 2 + i * 2) * 8 * life + (i % 3) * 3} cy={y - life * 80} r={6 + life * 14} fill={color} opacity={0.32 * (1 - life)} />;
    })}
  </g>
);

export const Led: React.FC<{x: number; y: number; color: string; t: number; seed: number; r?: number}> = ({x, y, color, t, seed, r = 4}) => {
  const on = Math.sin(t * (1.5 + rnd(seed) * 3) + seed * 3) > -0.2 ? 1 : 0.15;
  return <circle cx={x} cy={y} r={r} fill={color} opacity={on} />;
};

export const Pole: React.FC<{x: number; t: number; seed: number; color: string; lamp: string; broken?: boolean; ground?: number}> = ({x, t, seed, color, lamp, broken, ground = 800}) => {
  const fl = broken ? (Math.sin(t * 13 + seed) > 0.2 ? 1 : 0.15) : 0.92 + 0.08 * Math.sin(t * 2 + seed);
  return (
    <g>
      <rect x={x - 4} y={ground - 330} width={8} height={330} fill={color} />
      <path d={`M${x},${ground - 330} q30,-14 62,0`} stroke={color} strokeWidth={7} fill="none" />
      <path d={`M${x + 62},${ground - 326} l-26,${700 / 14} l52,0 Z`} fill="none" />
      <defs>
        <radialGradient id={`pg${seed}`}><stop offset="0" stopColor={lamp} stopOpacity={0.55} /><stop offset="1" stopColor={lamp} stopOpacity={0} /></radialGradient>
        <linearGradient id={`pc${seed}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={lamp} stopOpacity={0.35} /><stop offset="1" stopColor={lamp} stopOpacity={0} /></linearGradient>
      </defs>
      <g opacity={fl}>
        <path d={`M${x + 52},${ground - 322} L${x + 8},${ground} L${x + 118},${ground} Z`} fill={`url(#pc${seed})`} />
        <circle cx={x + 58} cy={ground - 324} r={90} fill={`url(#pg${seed})`} />
        <rect x={x + 46} y={ground - 328} width={26} height={7} rx={3} fill={lamp} />
      </g>
    </g>
  );
};
