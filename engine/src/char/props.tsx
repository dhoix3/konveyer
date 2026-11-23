import React from 'react';
import {INK} from './Character.tsx';
import {shade} from '../lib/math.ts';

// Props are drawn with the origin at bottom-centre. `top` = height of the usable surface
// on top of the object (things can rest on it). `grip` = where a hand holds it.
export interface PropKind {
  top: number;
  grip: [number, number];
  layer: 'back' | 'front';
  held?: boolean;
  draw: (o: PropDrawOpts) => React.ReactNode;
}
export interface PropDrawOpts {
  color: string;
  text?: string;
  st: Record<string, number>; // animated state (open, on, ...)
  t: number;
}

const glow = (id: string, color: string, r: number, op = 0.8) => (
  <g>
    <defs>
      <radialGradient id={id}>
        <stop offset="0" stopColor={color} stopOpacity={op} />
        <stop offset="1" stopColor={color} stopOpacity={0} />
      </radialGradient>
    </defs>
    <circle r={r} fill={`url(#${id})`} />
  </g>
);

export const PROPS: Record<string, PropKind> = {
  bed: {
    top: 62, grip: [0, 0], layer: 'back',
    draw: ({color}) => (
      <g>
        <rect x={-230} y={-40} width={460} height={34} rx={6} fill="#2a2430" />
        <rect x={-236} y={-62} width={472} height={26} rx={10} fill={color} />
        <rect x={-246} y={-150} width={22} height={150} rx={6} fill="#3a2b25" />
        <rect x={218} y={-90} width={18} height={90} rx={6} fill="#3a2b25" />
        <rect x={-210} y={-6} width={14} height={6} fill="#1b1618" />
        <rect x={196} y={-6} width={14} height={6} fill="#1b1618" />
        <ellipse cx={-185} cy={-72} rx={46} ry={14} fill="#e8e3da" />
        <path d="M-120,-62 Q60,-84 236,-62 L236,-40 L-120,-40 Z" fill={shade(color, -0.18)} opacity={0.9} />
      </g>
    ),
  },
  chair: {
    top: 80, grip: [0, -40], layer: 'back',
    draw: ({color}) => (
      <g>
        <rect x={-34} y={-84} width={74} height={9} rx={3} fill={color} />
        <rect x={-38} y={-170} width={10} height={90} rx={3} fill={color} />
        <rect x={-30} y={-76} width={7} height={76} fill={shade(color, -0.3)} />
        <rect x={28} y={-76} width={7} height={76} fill={shade(color, -0.3)} />
      </g>
    ),
  },
  desk: {
    top: 150, grip: [0, -75], layer: 'back',
    draw: ({color}) => (
      <g>
        <rect x={-170} y={-156} width={340} height={14} rx={3} fill={color} />
        <rect x={-160} y={-142} width={14} height={142} fill={shade(color, -0.3)} />
        <rect x={146} y={-142} width={14} height={142} fill={shade(color, -0.3)} />
        <rect x={80} y={-142} width={66} height={80} fill={shade(color, -0.2)} />
      </g>
    ),
  },
  table: {
    top: 120, grip: [0, -60], layer: 'back',
    draw: ({color}) => (
      <g>
        <rect x={-180} y={-126} width={360} height={14} rx={4} fill={color} />
        <rect x={-165} y={-112} width={12} height={112} fill={shade(color, -0.3)} />
        <rect x={153} y={-112} width={12} height={112} fill={shade(color, -0.3)} />
      </g>
    ),
  },
  sofa: {
    top: 72, grip: [0, -40], layer: 'back',
    draw: ({color}) => (
      <g>
        <rect x={-150} y={-120} width={300} height={70} rx={16} fill={shade(color, -0.15)} />
        <rect x={-160} y={-76} width={320} height={52} rx={14} fill={color} />
        <rect x={-170} y={-96} width={36} height={84} rx={14} fill={shade(color, -0.1)} />
        <rect x={134} y={-96} width={36} height={84} rx={14} fill={shade(color, -0.1)} />
        <rect x={-140} y={-26} width={10} height={26} fill="#18141a" />
        <rect x={130} y={-26} width={10} height={26} fill="#18141a" />
      </g>
    ),
  },
  door: {
    top: 0, grip: [0, -150], layer: 'back',
    draw: ({color, st}) => {
      const open = st.open ?? 0;
      const sx = Math.cos(open * 1.25);
      return (
        <g>
          <rect x={-74} y={-322} width={148} height={322} fill="#1a1613" />
          <rect x={-64} y={-312} width={128} height={312} fill={open > 0.02 ? shade(color, -0.1) : '#0b0a0c'} opacity={0.0} />
          {open > 0.02 && (
            <g>
              <defs>
                <linearGradient id="doorlight" x1="0" x2="1">
                  <stop offset="0" stopColor="#ffe9b0" stopOpacity={0.95 * Math.min(1, open * 2)} />
                  <stop offset="1" stopColor="#ffb55a" stopOpacity={0.5 * Math.min(1, open * 2)} />
                </linearGradient>
              </defs>
              <rect x={-64} y={-312} width={128} height={312} fill="url(#doorlight)" />
              <path d={`M-64,0 L-130,60 L130,60 L64,0 Z`} fill="#ffd89a" opacity={0.28 * Math.min(1, open * 2)} />
            </g>
          )}
          <g transform={`translate(-64,0) scale(${Math.max(0.06, sx)},1)`}>
            <rect x={0} y={-312} width={128} height={312} fill={color} />
            <rect x={14} y={-290} width={100} height={110} rx={4} fill={shade(color, -0.18)} />
            <rect x={14} y={-160} width={100} height={140} rx={4} fill={shade(color, -0.18)} />
            <circle cx={112} cy={-150} r={7} fill="#c9a24a" />
          </g>
        </g>
      );
    },
  },
  window: {
    top: 0, grip: [0, 0], layer: 'back',
    draw: ({color, st}) => (
      <g>
        <rect x={-90} y={-250} width={180} height={220} fill="#10151f" stroke="#2b2724" strokeWidth={9} />
        <rect x={-84} y={-244} width={168} height={208} fill={color} opacity={0.55 + 0.4 * (st.on ?? 1)} />
        <path d="M0,-244 V-36 M-84,-140 H84" stroke="#2b2724" strokeWidth={6} />
      </g>
    ),
  },
  phone: {
    top: 0, grip: [0, -14], layer: 'front', held: true,
    draw: ({st}) => {
      const on = st.on ?? 1;
      return (
        <g>
          <rect x={-8} y={-30} width={16} height={30} rx={3} fill="#121218" stroke="#3a3a46" strokeWidth={1} />
          <rect x={-6.4} y={-27.5} width={12.8} height={25} rx={2} fill="#8fd8ff" opacity={0.15 + 0.8 * on} />
          <g transform="translate(0,-15)" opacity={on}>{glow('phg', '#8fd8ff', 110, 0.28)}</g>
        </g>
      );
    },
  },
  cup: {
    top: 0, grip: [0, -12], layer: 'front', held: true,
    draw: ({color}) => (
      <g>
        <path d="M-9,-22 L-7,0 L7,0 L9,-22 Z" fill={color} />
        <path d="M9,-17 q9,1 8,8 q-1,5 -9,5" stroke={color} strokeWidth={3} fill="none" />
        <ellipse cx={0} cy={-22} rx={9} ry={2.6} fill="#3b2415" />
      </g>
    ),
  },
  laptop: {
    top: 0, grip: [0, -10], layer: 'front',
    draw: ({st, t}) => {
      const on = st.on ?? 1;
      return (
        <g>
          <path d="M-34,0 L34,0 L30,-5 L-30,-5 Z" fill="#2a2d33" />
          <path d="M-28,-5 L-24,-52 L26,-52 L30,-5 Z" fill="#14161a" />
          <path d="M-24,-8 L-21,-48 L23,-48 L26,-8 Z" fill="#9fdcff" opacity={on * (0.72 + 0.1 * Math.sin(t * 9))} />
          <g transform="translate(0,-30)" opacity={on}>{glow('lpg', '#9fdcff', 150, 0.26)}</g>
        </g>
      );
    },
  },
  box: {
    top: 50, grip: [0, -25], layer: 'front', held: true,
    draw: ({color}) => (
      <g>
        <rect x={-30} y={-50} width={60} height={50} fill={color} stroke={shade(color, -0.4)} strokeWidth={2} />
        <rect x={-6} y={-50} width={12} height={50} fill={shade(color, 0.25)} opacity={0.6} />
      </g>
    ),
  },
  suitcase: {
    top: 60, grip: [0, -30], layer: 'front', held: true,
    draw: ({color}) => (
      <g>
        <rect x={-34} y={-58} width={68} height={58} rx={6} fill={color} />
        <rect x={-14} y={-68} width={28} height={10} rx={4} fill="none" stroke="#222" strokeWidth={4} />
        <path d="M-34,-30 H34" stroke={shade(color, -0.35)} strokeWidth={2} />
      </g>
    ),
  },
  lamp: {
    top: 0, grip: [0, -20], layer: 'back',
    draw: ({color, st}) => {
      const on = st.on ?? 1;
      return (
        <g>
          <rect x={-14} y={-4} width={28} height={4} fill="#26211f" />
          <rect x={-2} y={-34} width={4} height={30} fill="#26211f" />
          <path d="M-18,-34 L-11,-60 L11,-60 L18,-34 Z" fill={color} opacity={0.5 + 0.5 * on} />
          <g transform="translate(0,-46)" opacity={on}>{glow('lmg', '#ffd9a0', 190, 0.5)}</g>
        </g>
      );
    },
  },
  clock: {
    top: 0, grip: [0, -12], layer: 'back',
    draw: ({t, st}) => {
      const ring = st.ring ?? 0;
      return (
        <g transform={`rotate(${ring ? Math.sin(t * 60) * 2.5 : 0})`}>
          <rect x={-16} y={-8} width={7} height={8} fill="#222" />
          <rect x={9} y={-8} width={7} height={8} fill="#222" />
          <circle cx={0} cy={-24} r={18} fill="#d9d4c7" stroke="#222" strokeWidth={4} />
          <path d="M0,-24 L0,-35" stroke="#111" strokeWidth={2.4} />
          <path d={`M0,-24 L${9 * Math.sin(t * 0.26)},${-24 - 9 * Math.cos(t * 0.26)}`} stroke="#111" strokeWidth={2.4} />
          <circle cx={0} cy={-45} r={5} fill="#444" />
          {ring ? <circle cx={0} cy={-24} r={24} fill="none" stroke="#ff6a4d" strokeWidth={2} opacity={0.6} /> : null}
        </g>
      );
    },
  },
  tv: {
    top: 0, grip: [0, 0], layer: 'back',
    draw: ({color, st, t}) => {
      const on = st.on ?? 1;
      return (
        <g>
          <rect x={-70} y={-100} width={140} height={86} rx={5} fill="#0e0e12" />
          <rect x={-64} y={-94} width={128} height={74} fill={color} opacity={0.15 + on * (0.7 + 0.12 * Math.sin(t * 7))} />
          <rect x={-8} y={-14} width={16} height={14} fill="#1b1b20" />
          <g transform="translate(0,-57)" opacity={on}>{glow('tvg', color, 260, 0.3)}</g>
        </g>
      );
    },
  },
  sign: {
    top: 0, grip: [0, -90], layer: 'front',
    draw: ({color, text}) => (
      <g>
        <rect x={-3} y={-110} width={6} height={110} fill="#3b2f27" />
        <rect x={-64} y={-170} width={128} height={64} rx={5} fill={color} stroke="#111" strokeWidth={3} />
        <text x={0} y={-130} textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight={800} fontSize={20} fill="#111">{text || ''}</text>
      </g>
    ),
  },
  book: {
    top: 0, grip: [0, -10], layer: 'front', held: true,
    draw: ({color}) => (
      <g>
        <rect x={-14} y={-20} width={28} height={20} rx={2} fill={color} />
        <rect x={-12} y={-18} width={24} height={4} fill="#f3eee0" />
      </g>
    ),
  },
  flashlight: {
    top: 0, grip: [0, -14], layer: 'front', held: true,
    draw: () => (
      <g>
        <rect x={-5} y={-30} width={10} height={30} rx={3} fill="#444851" />
        <rect x={-7} y={-36} width={14} height={8} rx={2} fill="#9aa3ad" />
        <path d="M-6,-36 L-60,-150 L60,-150 L6,-36 Z" fill="#fff6c8" opacity={0.2} />
      </g>
    ),
  },
  ball: {
    top: 0, grip: [0, -12], layer: 'front', held: true,
    draw: ({color}) => (
      <g>
        <circle cx={0} cy={-14} r={14} fill={color} stroke="#111" strokeWidth={2} />
        <path d="M-14,-14 H14 M0,-28 V0" stroke="#111" strokeWidth={1.5} opacity={0.6} />
      </g>
    ),
  },
  letter: {
    top: 0, grip: [0, -8], layer: 'front', held: true,
    draw: ({color}) => (
      <g>
        <rect x={-14} y={-18} width={28} height={18} fill={color} stroke="#555" strokeWidth={1} />
        <path d="M-14,-18 L0,-8 L14,-18" fill="none" stroke="#777" strokeWidth={1.2} />
      </g>
    ),
  },
  trophy: {
    top: 0, grip: [0, -20], layer: 'front', held: true,
    draw: () => (
      <g>
        <rect x={-10} y={-6} width={20} height={6} fill="#8a6a1c" />
        <rect x={-3} y={-18} width={6} height={12} fill="#d9a82d" />
        <path d="M-14,-44 H14 Q14,-18 0,-18 Q-14,-18 -14,-44 Z" fill="#f0c43a" />
      </g>
    ),
  },
  plant: {
    top: 0, grip: [0, -40], layer: 'back',
    draw: ({t}) => (
      <g>
        <path d="M-18,0 L-14,-34 L14,-34 L18,0 Z" fill="#7a4a35" />
        {[-24, -10, 6, 22].map((a, i) => (
          <path key={i} d={`M0,-34 Q${a * 1.2 + Math.sin(t * 1.4 + i) * 3},-70 ${a * 2},${-96 + (i % 2) * 14}`} stroke="#2f7a45" strokeWidth={9} fill="none" strokeLinecap="round" />
        ))}
      </g>
    ),
  },
  radio: {
    top: 0, grip: [0, -14], layer: 'back',
    draw: ({st, t}) => (
      <g>
        <rect x={-34} y={-44} width={68} height={44} rx={6} fill="#6a4a30" />
        <circle cx={-16} cy={-22} r={13} fill="#222" />
        <rect x={6} y={-34} width={22} height={9} fill="#d8c48a" opacity={0.5 + 0.4 * (st.on ?? 1)} />
        <path d={`M20,-44 L${34 + Math.sin(t) * 2},-76`} stroke="#aaa" strokeWidth={2} />
      </g>
    ),
  },
  bat: {
    top: 0, grip: [0, -20], layer: 'front', held: true,
    draw: () => <path d="M-3,0 L3,0 L7,-60 Q0,-70 -7,-60 Z" fill="#b98a4c" />,
  },
  remote: {
    top: 0, grip: [0, -10], layer: 'front', held: true,
    draw: () => (
      <g>
        <rect x={-5} y={-22} width={10} height={22} rx={2} fill="#232328" />
        <circle cx={0} cy={-16} r={1.8} fill="#e33" />
      </g>
    ),
  },
  mic: {
    top: 0, grip: [0, -14], layer: 'front', held: true,
    draw: () => (
      <g>
        <rect x={-3} y={-26} width={6} height={26} fill="#333" />
        <circle cx={0} cy={-32} r={8} fill="#888" />
      </g>
    ),
  },
  crate: {
    top: 60, grip: [0, -30], layer: 'back',
    draw: ({color}) => (
      <g>
        <rect x={-34} y={-60} width={68} height={60} fill={color} stroke={shade(color, -0.45)} strokeWidth={3} />
        <path d="M-34,-60 L34,0 M34,-60 L-34,0" stroke={shade(color, -0.4)} strokeWidth={3} />
      </g>
    ),
  },
  tablet: {
    top: 0, grip: [0, -14], layer: 'front', held: true,
    draw: ({st}) => (
      <g>
        <rect x={-14} y={-26} width={28} height={26} rx={3} fill="#17171c" />
        <rect x={-12} y={-24} width={24} height={22} rx={2} fill="#a8e3ff" opacity={0.2 + 0.7 * (st.on ?? 1)} />
      </g>
    ),
  },
};

export const propTop = (kind: string, scale = 1) => (PROPS[kind]?.top ?? 0) * Math.abs(scale);

export const PropShape: React.FC<{kind: string; color: string; text?: string; st: Record<string, number>; t: number}> = ({kind, color, text, st, t}) => {
  const k = PROPS[kind];
  if (!k) return <circle r={10} fill={color} />;
  return <g>{k.draw({color, text, st, t})}</g>;
};

export const PROP_COLORS: Record<string, string> = {
  bed: '#5a4a78', chair: '#6b4a30', desk: '#6b4a30', table: '#7b5a3a', sofa: '#4a5a78', door: '#6e4a2c', window: '#2a3a5a',
  phone: '#111', cup: '#e8e4dc', laptop: '#222', box: '#b88a52', suitcase: '#8a3a32', lamp: '#e9c98a', clock: '#ddd',
  tv: '#8fb9ff', sign: '#f2c744', book: '#2f5f8f', flashlight: '#555', ball: '#e5532d', letter: '#f2eadb',
  trophy: '#f0c43a', plant: '#2f7a45', radio: '#6a4a30', bat: '#b98a4c', remote: '#222', mic: '#333', crate: '#8a6a3a', tablet: '#222',
};
export {INK};
