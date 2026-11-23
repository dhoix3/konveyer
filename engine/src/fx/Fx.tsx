import React from 'react';
import {AbsoluteFill, staticFile} from 'remotion';
import {rnd, clamp} from '../lib/math.ts';
import type {LightDef} from '../lib/types.ts';

export const Rain: React.FC<{t: number; heavy?: boolean}> = ({t, heavy}) => {
  const n = heavy ? 230 : 130;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      <g stroke="#cfe0ff" strokeLinecap="round">
        {Array.from({length: n}, (_, i) => {
          const sp = 1500 + rnd(i + 1) * 900;
          const x = (rnd(i + 7) * 2400 - 200 - t * 380) % 2200;
          const y = (rnd(i + 3) * 1400 + t * sp) % 1400 - 150;
          const l = 28 + rnd(i + 5) * 34;
          return <line key={i} x1={(x + 2200) % 2200 - 150} y1={y} x2={(x + 2200) % 2200 - 150 - l * 0.24} y2={y + l} strokeWidth={1 + rnd(i + 9) * 1.4} opacity={0.12 + rnd(i + 2) * 0.22} />;
        })}
      </g>
    </svg>
  );
};

export const Snow: React.FC<{t: number}> = ({t}) => (
  <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
    {Array.from({length: 120}, (_, i) => {
      const y = (rnd(i + 3) * 1300 + t * (60 + rnd(i) * 90)) % 1300 - 100;
      const x = rnd(i + 8) * 2000 - 40 + Math.sin(t * (0.6 + rnd(i)) + i) * 30;
      return <circle key={i} cx={x} cy={y} r={1.6 + rnd(i + 4) * 3} fill="#fff" opacity={0.35 + rnd(i) * 0.5} />;
    })}
  </svg>
);

export const Fog: React.FC<{t: number; color?: string; density?: number}> = ({t, color = '#b8c6d8', density = 0.2}) => (
  <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
    <defs>
      <radialGradient id="fogg"><stop offset="0" stopColor={color} stopOpacity={density} /><stop offset="1" stopColor={color} stopOpacity={0} /></radialGradient>
    </defs>
    {[0, 1, 2, 3, 4].map((i) => (
      <ellipse key={i} cx={((i * 560 + t * (14 + i * 4)) % 2700) - 400} cy={700 + (i % 3) * 110} rx={620} ry={160} fill="url(#fogg)" />
    ))}
  </svg>
);

// floating dust motes in screen space (drift + slow parallax)
export const Dust: React.FC<{t: number; color?: string; n?: number; speed?: number}> = ({t, color = '#fff', n = 46, speed = 1}) => (
  <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
    {Array.from({length: n}, (_, i) => {
      const x = (rnd(i + 1) * 2000 + t * (6 + rnd(i + 2) * 14) * speed) % 2000 - 40;
      const y = (rnd(i + 3) * 1200 - t * (4 + rnd(i + 4) * 10) * speed + 2400) % 1200 - 60;
      const r = 1 + rnd(i + 5) * 2.4;
      return <circle key={i} cx={x} cy={y} r={r} fill={color} opacity={(0.1 + rnd(i + 6) * 0.3) * (0.6 + 0.4 * Math.sin(t * 1.3 + i))} />;
    })}
  </svg>
);

export const Embers: React.FC<{t: number}> = ({t}) => (
  <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
    {Array.from({length: 40}, (_, i) => {
      const life = (t * (0.15 + rnd(i) * 0.2) + rnd(i + 3)) % 1;
      return <circle key={i} cx={rnd(i + 5) * 1900 + Math.sin(t + i) * 30} cy={1100 - life * 1200} r={1.5 + rnd(i + 7) * 2.5} fill="#ffa24d" opacity={0.8 * Math.sin(Math.PI * life)} />;
    })}
  </svg>
);

export const Grain: React.FC<{frame: number; amount?: number}> = ({frame, amount = 0.06}) => {
  const ox = Math.floor(rnd(frame * 3 + 1) * 256);
  const oy = Math.floor(rnd(frame * 3 + 2) * 256);
  return (
    <AbsoluteFill style={{mixBlendMode: 'overlay', opacity: amount * 4.5, backgroundImage: `url(${staticFile('fx/grain.png')})`, backgroundPosition: `${-ox}px ${-oy}px`, backgroundSize: '256px 256px', pointerEvents: 'none'}} />
  );
};

export const Vignette: React.FC<{strength?: number}> = ({strength = 0.62}) => (
  <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 48%, rgba(0,0,0,${strength}) 100%)`, pointerEvents: 'none'}} />
);

// Cinematic grading presets implemented with blend-mode overlays (cheap, resolution independent)
export const Grade: React.FC<{light: LightDef; time: string; t: number; pulse?: number}> = ({light, time, t, pulse = 0}) => {
  const g = light.grade || 'teal_orange';
  const night = time === 'night';
  const map: Record<string, {shadow: string; high: string; tint: string; sat: number; con: number}> = {
    teal_orange: {shadow: 'rgba(8,48,66,0.42)', high: 'rgba(255,150,70,0.22)', tint: 'rgba(0,0,0,0)', sat: 1.12, con: 1.08},
    cold: {shadow: 'rgba(10,30,70,0.5)', high: 'rgba(120,170,255,0.16)', tint: 'rgba(40,80,160,0.08)', sat: 0.92, con: 1.1},
    warm: {shadow: 'rgba(60,22,10,0.38)', high: 'rgba(255,190,100,0.24)', tint: 'rgba(255,140,60,0.06)', sat: 1.1, con: 1.05},
    noir: {shadow: 'rgba(0,0,0,0.45)', high: 'rgba(255,255,255,0.08)', tint: 'rgba(20,20,30,0.1)', sat: 0.45, con: 1.25},
    sick: {shadow: 'rgba(20,50,30,0.5)', high: 'rgba(190,230,120,0.16)', tint: 'rgba(80,120,40,0.1)', sat: 0.85, con: 1.1},
    dawn: {shadow: 'rgba(40,40,90,0.4)', high: 'rgba(255,200,150,0.24)', tint: 'rgba(255,170,120,0.05)', sat: 1.08, con: 1.04},
    dusk: {shadow: 'rgba(40,16,70,0.44)', high: 'rgba(255,120,70,0.26)', tint: 'rgba(255,90,60,0.05)', sat: 1.15, con: 1.08},
    space: {shadow: 'rgba(5,10,40,0.5)', high: 'rgba(120,200,255,0.15)', tint: 'rgba(0,20,60,0.1)', sat: 1.0, con: 1.14},
  };
  const m = map[g] || map.teal_orange;
  return (
    <>
      <AbsoluteFill style={{background: m.shadow, mixBlendMode: 'multiply', pointerEvents: 'none'}} />
      <AbsoluteFill style={{background: `linear-gradient(180deg, ${m.tint}, ${m.high})`, mixBlendMode: 'soft-light', pointerEvents: 'none'}} />
      {night && <AbsoluteFill style={{background: 'rgba(6,10,30,0.18)', mixBlendMode: 'multiply'}} />}
      {light.pulse && (
        <AbsoluteFill style={{background: light.pulse.color, mixBlendMode: 'screen', opacity: pulse * 0.2, pointerEvents: 'none'}} />
      )}
    </>
  );
};

export const KeyGlow: React.FC<{sx: number; sy: number; light: LightDef; t: number}> = ({sx, sy, light, t}) => {
  if (light.key === 'none') return null;
  const fl = 1 - (light.flicker || 0) * (0.5 + 0.5 * Math.sin(t * 23) * Math.sin(t * 7.3));
  const r = 700;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'screen', opacity: clamp(light.intensity * fl) * 0.55, background: `radial-gradient(circle at ${sx}px ${sy}px, ${light.color} 0%, rgba(0,0,0,0) ${r}px)`}} />
  );
};
