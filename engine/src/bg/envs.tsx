import React from 'react';
import {rnd, shade, easeInOut} from '../lib/math.ts';
import type {EnvCtx} from './helpers.tsx';
import {palette, Sky, Wall, Floor, WindowView, Shaft, Building, Tree, Steam, Led, Pole, Grad, Clouds} from './helpers.tsx';

export interface EnvLayer { depth: number; key: string; node: React.ReactNode }
export interface EnvDef {
  id: string;
  name: {ru: string; en: string};
  interior: boolean;
  live: string[]; // living (animated) details, used by QA
  layers: (c: EnvCtx) => EnvLayer[];
}

const ENVS: Record<string, EnvDef> = {};
const reg = (e: EnvDef) => { ENVS[e.id] = e; };

// ---------------------------------------------------------------- bedroom
reg({
  id: 'bedroom', name: {ru: 'Спальня', en: 'Bedroom'}, interior: true,
  live: ['curtains sway', 'tree outside sways', 'moon/sun shaft pulses', 'ceiling fan spins', 'dust motes'],
  layers: (c) => {
    const p = palette(c.time === 'indoor' ? 'day' : c.time);
    const shaftCol = p.night ? '#9ab4ff' : '#ffe2a0';
    return [
      {depth: 0.9, key: 'wall', node: (
        <g>
          <Wall p={p} id="bwall" />
          <WindowView x={1250} y={60} w={240} h={300} p={p} ctx={c} id="bwin" curtains />
          <rect x={150} y={150} width={150} height={110} fill="#14131a" stroke="#4a3b30" strokeWidth={7} />
          <path d="M165,245 l36,-60 l24,32 l22,-28 l40,56 Z" fill="#37506a" /><circle cx={252} cy={182} r={12} fill="#e8c36a" opacity={0.8} />
          <rect x={380} y={320} width={200} height={10} fill="#4a3426" /><rect x={400} y={282} width={16} height={38} fill="#3a5a8a" /><rect x={420} y={272} width={14} height={48} fill="#8a3a3a" /><rect x={438} y={290} width={20} height={30} fill="#5a8a4a" />
          <g transform="translate(760,-60)"><rect x={-3} y={0} width={6} height={80} fill="#222" /><g transform={`translate(0,80) rotate(${c.t * 220})`}>{[0, 1, 2, 3].map((i) => <ellipse key={i} cx={46} cy={0} rx={46} ry={6} fill="#33302f" transform={`rotate(${i * 90})`} />)}</g></g>
        </g>)},
      {depth: 1, key: 'floor', node: (
        <g>
          <Floor p={p} id="bfloor" />
          <ellipse cx={720} cy={900} rx={380} ry={60} fill="#5a3a52" opacity={0.65} />
          <Shaft x={1230} w={240} color={shaftCol} t={c.t} id="bshaft" op={p.night ? 0.2 : 0.28} slant={-520} />
          {Array.from({length: 22}, (_, i) => {
            const life = (c.t * 0.05 + rnd(i) ) % 1;
            return <circle key={i} cx={760 + rnd(i + 9) * 450 - life * 160 + Math.sin(c.t + i) * 8} cy={160 + life * 560} r={1.6 + rnd(i + 3) * 1.6} fill="#fff" opacity={0.5 * Math.sin(Math.PI * life)} />;
          })}
        </g>)},
    ];
  },
});

// ---------------------------------------------------------------- kitchen
reg({
  id: 'kitchen', name: {ru: 'Кухня', en: 'Kitchen'}, interior: true,
  live: ['pendant lamp swings', 'kettle steam', 'wall clock second hand', 'tree outside sways'],
  layers: (c) => {
    const p = palette(c.time === 'indoor' ? 'day' : c.time);
    const sw = Math.sin(c.t * 1.4) * 2.5;
    return [
      {depth: 0.9, key: 'wall', node: (
        <g>
          <Wall p={{...p, wall: '#c8d0c6', wallDark: '#9aa59a'}} id="kwall" stripe={false} />
          {Array.from({length: 30}, (_, i) => <path key={i} d={`M${-600 + i * 90},300 V760 M-600,${300 + (i % 6) * 80} H2400`} stroke="#fff" strokeWidth={2} opacity={0.08} />)}
          <WindowView x={820} y={110} w={260} h={230} p={p} ctx={c} id="kwin" />
          <rect x={100} y={80} width={600} height={170} fill="#5a4636" /><path d="M250,80 V250 M400,80 V250 M550,80 V250" stroke="#2d221a" strokeWidth={4} />
          <rect x={1260} y={170} width={230} height={560} rx={10} fill="#d9dcdf" /><rect x={1262} y={430} width={226} height={4} fill="#80868c" />
          <rect x={1456} y={250} width={8} height={80} fill="#80868c" /><rect x={1456} y={470} width={8} height={90} fill="#80868c" />
          <rect x={1290} y={260} width={30} height={30} fill="#e05050" /><rect x={1330} y={290} width={26} height={24} fill="#4a8ae0" />
          <g transform="translate(1000,60)"><circle r={42} fill="#f4f1ea" stroke="#222" strokeWidth={5} /><path d="M0,0 V-30" stroke="#111" strokeWidth={3} /><path d={`M0,0 L${30 * Math.sin(c.t * 2 * Math.PI / 60 * 1)},${-30 * Math.cos(c.t * 2 * Math.PI / 60 * 1)}`} stroke="#c22" strokeWidth={2} /></g>
          <g transform={`translate(560,-120) rotate(${sw})`}><rect x={-2} y={0} width={4} height={250} fill="#222" /><path d="M-40,250 L-22,200 L22,200 L40,250 Z" fill="#d89a3a" /><circle cx={0} cy={252} r={70} fill="#ffd98a" opacity={0.0} /></g>
        </g>)},
      {depth: 1, key: 'floor', node: (
        <g>
          <Floor p={{...p, floor: '#8a8478', floorDark: '#585349'}} id="kfloor" plank={false} shine={0.18} />
          <rect x={-200} y={610} width={1200} height={190} fill="#6a5442" /><rect x={-200} y={590} width={1200} height={24} fill="#d8d2c6" />
          <rect x={200} y={600} width={150} height={12} fill="#8a9aa0" /><ellipse cx={275} cy={604} rx={64} ry={7} fill="#44545a" />
          <g transform="translate(720,586)"><rect x={-24} y={-52} width={48} height={52} rx={8} fill="#b8bcc2" /><rect x={20} y={-44} width={20} height={5} fill="#b8bcc2" /><Steam x={36} y={-40} t={c.t} /></g>
          <Shaft x={800} w={260} color={p.night ? '#9ab4ff' : '#fff0c0'} t={c.t} id="kshaft" op={0.18} slant={260} />
        </g>)},
    ];
  },
});

// ---------------------------------------------------------------- street
reg({
  id: 'street', name: {ru: 'Улица', en: 'Street'}, interior: false,
  live: ['cars drive past', 'clouds/stars drift', 'street lamps flicker', 'windows blink', 'traffic light'],
  layers: (c) => {
    const p = palette(c.time === 'indoor' ? 'day' : c.time);
    const lamp = p.night || c.time === 'dusk' ? '#ffd08a' : '#fff6d8';
    const cars = [0, 1, 2].map((i) => {
      const dir = i % 2 ? -1 : 1;
      const sp = 260 + i * 90;
      const x = dir > 0 ? ((c.t * sp + i * 1500) % 4600) - 1300 : 3300 - ((c.t * sp + i * 1100) % 4600);
      const col = ['#a02a2a', '#2a5a9a', '#d0d0d0'][i];
      return (
        <g key={i} transform={`translate(${x},${i % 2 ? 1010 : 946}) scale(${dir},1)`} opacity={0.95}>
          <rect x={-90} y={-46} width={180} height={34} rx={10} fill={col} /><path d="M-52,-46 L-30,-76 L36,-76 L60,-46 Z" fill={shade(col, -0.2)} />
          <path d="M-42,-48 L-26,-70 L0,-70 L0,-48 Z M6,-48 L6,-70 L32,-70 L50,-48 Z" fill="#9fb8c8" opacity={0.55} />
          <circle cx={-52} cy={-8} r={16} fill="#111" /><circle cx={56} cy={-8} r={16} fill="#111" />
          {(p.night || c.time === 'dusk') && <path d="M92,-34 L300,-70 L300,10 Z" fill="#fff4c4" opacity={0.2} />}
          <rect x={86} y={-38} width={8} height={10} fill="#ffeeaa" />
        </g>
      );
    });
    return [
      {depth: 0.04, key: 'sky', node: <Sky p={p} id="ssky" ctx={c} />},
      {depth: 0.25, key: 'far', node: (
        <g>{Array.from({length: 14}, (_, i) => <rect key={i} x={-700 + i * 230} y={800 - 260 - rnd(i + 3) * 220} width={200} height={600} fill={p.far} opacity={0.9} />)}</g>)},
      {depth: 0.55, key: 'mid', node: (
        <g>
          <Building x={-300} w={420} h={560} color={p.mid} lit={p.windowLit} seed={1} t={c.t} antenna />
          <Building x={150} w={300} h={430} color={shade(p.mid, 0.05)} lit={p.windowLit} seed={2} t={c.t} />
          <Building x={1500} w={380} h={620} color={p.mid} lit={p.windowLit} seed={3} t={c.t} antenna />
          <Building x={1920} w={500} h={500} color={shade(p.mid, 0.06)} lit={p.windowLit} seed={4} t={c.t} />
          <Building x={-800} w={480} h={480} color={shade(p.mid, 0.04)} lit={p.windowLit} seed={5} t={c.t} />
        </g>)},
      {depth: 1, key: 'road', node: (
        <g>
          <defs><Grad id="sroad" a={p.floor} b={p.floorDark} /></defs>
          <rect x={-900} y={790} width={4000} height={26} fill={shade(p.floor, 0.12)} />
          <rect x={-900} y={816} width={4000} height={110} fill={shade(p.floor, 0.05)} />
          <rect x={-900} y={926} width={4000} height={540} fill="url(#sroad)" />
          {Array.from({length: 24}, (_, i) => <rect key={i} x={-860 + i * 200} y={1000} width={110} height={8} fill="#e9e3c7" opacity={0.7} />)}
          {Array.from({length: 8}, (_, i) => <rect key={i} x={-860 + i * 560} y={806} width={4} height={14} fill="#000" opacity={0.3} />)}
        </g>)},
      {depth: 1, key: 'poles', node: (
        <g>
          <Pole x={300} t={c.t} seed={1} color={p.ink} lamp={lamp} broken={c.weather === 'storm'} />
          <Pole x={1180} t={c.t} seed={2} color={p.ink} lamp={lamp} />
          <Pole x={2080} t={c.t} seed={3} color={p.ink} lamp={lamp} />
          <g transform="translate(1620,800)"><rect x={-3} y={-260} width={6} height={260} fill={p.ink} /><rect x={-12} y={-320} width={24} height={62} rx={5} fill="#111" />
            {['#e33', '#ec3', '#3d6'].map((col, i) => <circle key={i} cx={0} cy={-304 + i * 20} r={7} fill={col} opacity={Math.floor(c.t / 2) % 3 === i ? 1 : 0.15} />)}</g>
        </g>)},
      {depth: 1.05, key: 'cars', node: <g>{cars}</g>},
      {depth: 1.3, key: 'fg', node: <g><rect x={-300} y={930} width={90} height={400} fill={p.ink} opacity={0.9} /><rect x={1800} y={900} width={60} height={500} fill={p.ink} opacity={0.9} /></g>},
    ];
  },
});

// ---------------------------------------------------------------- city (rooftop)
reg({
  id: 'city', name: {ru: 'Город / крыша', en: 'City rooftop'}, interior: false,
  live: ['aviation lights blink', 'airplane crosses sky', 'billboard animates', 'clouds drift'],
  layers: (c) => {
    const p = palette(c.time === 'indoor' ? 'dusk' : c.time);
    const plane = ((c.t * 38) % 3600) - 800;
    return [
      {depth: 0.03, key: 'sky', node: (
        <g>
          <Sky p={p} id="csky" ctx={c} />
          <g transform={`translate(${plane},${40 + Math.sin(c.t * 0.3) * 6})`}>
            <rect x={-14} y={-2} width={28} height={4} rx={2} fill="#ccd" /><circle cx={-16} cy={0} r={3} fill="#f33" opacity={Math.sin(c.t * 6) > 0 ? 1 : 0.1} /><circle cx={16} cy={0} r={3} fill="#3f3" opacity={Math.sin(c.t * 6 + 3) > 0 ? 1 : 0.1} />
          </g>
        </g>)},
      {depth: 0.18, key: 'far', node: (
        <g>{Array.from({length: 22}, (_, i) => <Building key={i} x={-800 + i * 160} w={140} h={260 + rnd(i + 8) * 420} color={p.far} lit={p.windowLit} seed={i + 20} t={c.t} density={0.35} antenna={i % 5 === 0} />)}</g>)},
      {depth: 0.45, key: 'mid', node: (
        <g>{Array.from({length: 10}, (_, i) => <Building key={i} x={-760 + i * 330} w={280} h={360 + rnd(i + 30) * 520} color={p.mid} lit={p.windowLit} seed={i + 50} t={c.t} density={0.55} antenna={i % 3 === 0} />)}
          <g transform="translate(1280,300)"><rect x={-130} y={-80} width={260} height={150} fill="#0c0c12" stroke="#444" strokeWidth={5} />
            <rect x={-120} y={-70} width={240} height={130} fill={['#ff4d6d', '#4dc3ff', '#ffd24d'][Math.floor(c.t / 2) % 3]} opacity={0.55 + 0.2 * Math.sin(c.t * 5)} />
            <path d={`M-90,${20 - 20 * Math.sin(c.t * 2)} L-40,-30 L10,10 L60,-40 L100,-10`} stroke="#fff" strokeWidth={5} fill="none" opacity={0.9} /></g>
        </g>)},
      {depth: 1, key: 'roof', node: (
        <g>
          <defs><Grad id="croof" a={p.floor} b={p.floorDark} /></defs>
          <rect x={-900} y={800} width={4000} height={700} fill="url(#croof)" />
          <rect x={-900} y={790} width={4000} height={16} fill={shade(p.floor, 0.2)} />
          <g fill={p.ink}><rect x={-100} y={640} width={160} height={150} /><rect x={1500} y={700} width={220} height={90} /><rect x={1580} y={560} width={6} height={140} /></g>
          {Array.from({length: 4}, (_, i) => <path key={i} d={`M${-100 + i * 600},806 L${-300 + i * 600},1100`} stroke="#000" opacity={0.2} strokeWidth={3} />)}
          <g transform="translate(1010,800)"><rect x={-60} y={-150} width={120} height={150} fill={p.near} /><g transform={`translate(0,-100) rotate(${c.t * 300})`}>{[0, 120, 240].map((a) => <path key={a} d="M0,0 L-6,-30 L6,-30 Z" fill="#555" transform={`rotate(${a})`} />)}</g></g>
        </g>)},
      {depth: 1.25, key: 'fg', node: <g><rect x={-900} y={1010} width={4000} height={26} fill="#000" opacity={0.65} /></g>},
    ];
  },
});

// ---------------------------------------------------------------- stadium
reg({
  id: 'stadium', name: {ru: 'Стадион', en: 'Stadium'}, interior: false,
  live: ['crowd waves', 'camera flashes', 'floodlight beams shimmer', 'flags wave', 'scoreboard flickers'],
  layers: (c) => {
    const p = palette(c.time === 'day' ? 'day' : c.time === 'indoor' ? 'night' : c.time);
    const crowd = (tier: number, y: number, col: string) => Array.from({length: 62}, (_, i) => {
      const bob = Math.max(0, Math.sin(c.t * 3.2 - i * 0.24 + tier)) * 14;
      const x = -820 + i * 54 + (tier % 2) * 22;
      return (
        <g key={`${tier}-${i}`} transform={`translate(${x},${y - bob})`}>
          <circle r={11} fill={col} /><rect x={-12} y={10} width={24} height={30} rx={8} fill={shade(col, rnd(i + tier * 100) * 0.2 - 0.05)} />
          {bob > 9 && <rect x={-18} y={-20} width={5} height={24} fill={col} />}
        </g>
      );
    });
    const flash = Array.from({length: 14}, (_, i) => {
      const on = Math.sin(c.t * 14 + i * 5.3) > 0.985 ? 1 : (rnd(Math.floor(c.frame / 3) * 7 + i) > 0.985 ? 1 : 0);
      return on ? <circle key={i} cx={-700 + rnd(i) * 3200} cy={470 + rnd(i + 5) * 220} r={20} fill="#fff" opacity={0.9} /> : null;
    });
    return [
      {depth: 0.04, key: 'sky', node: <Sky p={p} id="stsky" ctx={c} />},
      {depth: 0.35, key: 'towers', node: (
        <g>{[-300, 1000, 2250].map((x, i) => (
          <g key={i} transform={`translate(${x},800)`}>
            <rect x={-5} y={-620} width={10} height={620} fill={p.near} /><rect x={-70} y={-700} width={140} height={90} fill="#161a28" />
            {Array.from({length: 12}, (_, k) => <circle key={k} cx={-55 + (k % 6) * 22} cy={-684 + Math.floor(k / 6) * 34} r={7} fill="#fff" opacity={0.85 + 0.1 * Math.sin(c.t * 8 + k + i)} />)}
            <path d={`M0,-690 L-420,150 L420,150 Z`} fill="#fff7d0" opacity={0.06 + 0.02 * Math.sin(c.t + i)} />
          </g>))}</g>)},
      {depth: 0.6, key: 'stands', node: (
        <g>
          <defs><Grad id="stand" a={p.mid} b={p.near} /></defs>
          <rect x={-900} y={440} width={4000} height={380} fill="url(#stand)" />
          {crowd(1, 520, '#1b2038')}{crowd(2, 596, '#232a48')}{crowd(3, 672, '#2c3558')}
          {flash}
          <g transform="translate(980,330)"><rect x={-190} y={-60} width={380} height={100} fill="#05060a" stroke="#555" strokeWidth={4} />
            <text x={-90} y={10} fill="#ff6a4d" fontFamily="monospace" fontWeight={700} fontSize={54} opacity={0.8 + 0.2 * Math.sin(c.t * 12)}>{String(Math.floor(c.t) % 10)}</text>
            <text x={30} y={10} fill="#ffd24d" fontFamily="monospace" fontWeight={700} fontSize={54}>0</text></g>
        </g>)},
      {depth: 1, key: 'pitch', node: (
        <g>
          <defs><Grad id="grass" a={shade('#2f7a3d', p.night ? -0.55 : -0.1)} b={shade('#1d5a2b', p.night ? -0.55 : -0.2)} /></defs>
          <rect x={-900} y={800} width={4000} height={700} fill="url(#grass)" />
          {Array.from({length: 20}, (_, i) => <rect key={i} x={-900 + i * 200} y={800} width={100} height={700} fill="#fff" opacity={0.035} />)}
          <rect x={-900} y={790} width={4000} height={16} fill="#111" />
          <path d="M-900,900 H3100 M960,806 V1500" stroke="#fff" strokeWidth={5} opacity={0.5} />
          <ellipse cx={960} cy={1000} rx={200} ry={44} fill="none" stroke="#fff" strokeWidth={5} opacity={0.5} />
          {[0, 1, 2, 3, 4].map((i) => <g key={i} transform={`translate(${-100 + i * 520},800)`}><rect x={-2} y={-90} width={4} height={90} fill="#ccc" /><path d={`M2,-90 q${24 + Math.sin(c.t * 4 + i) * 8},8 ${44},0 q${-12 + Math.sin(c.t * 4 + i) * 6},14 ${-44},18 Z`} fill={['#e33', '#38f', '#fc3'][i % 3]} /></g>)}
        </g>)},
      {depth: 1.25, key: 'fg', node: <rect x={-900} y={1020} width={4000} height={30} fill="#000" opacity={0.6} />},
    ];
  },
});

// ---------------------------------------------------------------- hospital
reg({
  id: 'hospital', name: {ru: 'Больница', en: 'Hospital'}, interior: true,
  live: ['ceiling light flickers', 'ECG line scrolls', 'IV drip falls', 'blinds light shimmers'],
  layers: (c) => {
    const p = palette('indoor');
    const fl = Math.sin(c.t * 17) > 0.8 && Math.sin(c.t * 2.3) > 0.2 ? 0.25 : 1;
    const ecg: string[] = [];
    for (let i = 0; i <= 90; i++) {
      const x = i * 2;
      const ph = ((x + c.t * 60) % 120) / 120;
      const y = ph > 0.42 && ph < 0.46 ? -22 : ph > 0.46 && ph < 0.5 ? 12 : ph > 0.5 && ph < 0.54 ? -4 : 0;
      ecg.push(`${i ? 'L' : 'M'}${x},${y}`);
    }
    const drip = (c.t * 0.8) % 1;
    return [
      {depth: 0.9, key: 'wall', node: (
        <g>
          <Wall p={{...p, wall: '#c3d3d2', wallDark: '#92a6a5'}} id="hwall" stripe={false} />
          <rect x={-900} y={470} width={4000} height={14} fill="#6a9a98" />
          {[100, 560, 1020, 1480, 1940].map((x, i) => <g key={i} transform={`translate(${x},0)`}><rect x={0} y={190} width={140} height={610} fill="#8aa0a6" /><rect x={14} y={206} width={112} height={560} fill="#a9bec3" /><rect x={36} y={260} width={68} height={90} fill="#cfe3e8" opacity={0.7} /></g>)}
          <g transform="translate(1330,120)"><rect width={200} height={60} fill="#1c6a62" /><text x={100} y={40} fill="#fff" fontFamily="Arial" fontWeight={800} fontSize={30} textAnchor="middle">+ ER</text></g>
          {[0, 1, 2, 3].map((i) => <g key={i} transform={`translate(${200 + i * 560},-60)`} opacity={i === 1 ? fl : 1}><rect width={300} height={14} fill="#f4fbff" /><path d="M-10,14 L310,14 L420,560 L-120,560 Z" fill="#e8fbff" opacity={0.05} /></g>)}
          <g transform="translate(1000,420)"><rect x={-60} y={-80} width={140} height={110} rx={8} fill="#10161a" stroke="#556" strokeWidth={4} /><g transform="translate(-52,-26)"><path d={ecg.join(' ')} stroke="#4dff9a" strokeWidth={3} fill="none" /></g></g>
        </g>)},
      {depth: 1, key: 'floor', node: (
        <g>
          <Floor p={{...p, floor: '#b6c4c4', floorDark: '#7a8a8a'}} id="hfloor" plank={false} shine={0.3} />
          <g transform="translate(1700,800)"><rect x={-3} y={-290} width={6} height={290} fill="#bbb" /><rect x={-22} y={-300} width={44} height={6} fill="#bbb" /><rect x={-12} y={-272} width={24} height={46} rx={8} fill="#cfeaff" opacity={0.8} />
            <circle cx={0} cy={-224 + drip * 160} r={3.2} fill="#cfeaff" opacity={drip < 0.9 ? 1 : 0} /></g>
          <rect x={-900} y={1010} width={4000} height={8} fill="#fff" opacity={0.2} />
        </g>)},
    ];
  },
});

// ---------------------------------------------------------------- office
reg({
  id: 'office', name: {ru: 'Офис', en: 'Office'}, interior: true,
  live: ['monitors flicker', 'city lights blink through windows', 'wall clock ticks', 'plant leaves sway'],
  layers: (c) => {
    const p = palette(c.time === 'indoor' ? 'night' : c.time);
    return [
      {depth: 0.9, key: 'wall', node: (
        <g>
          <Wall p={{...p, wall: p.night ? '#2c3548' : '#b9c3cb', wallDark: p.night ? '#171d2c' : '#8a959e'}} id="owall" stripe={false} />
          {[160, 640, 1120, 1600].map((x, i) => <WindowView key={i} x={x} y={90} w={400} h={560} p={p} ctx={c} id={`owin${i}`} tree={false} city frame="#1a1f2a" />)}
          <g transform="translate(1000,70)"><circle r={36} fill="#f0f0ea" stroke="#111" strokeWidth={5} /><path d={`M0,0 L${22 * Math.sin(c.t * 0.1)},${-22 * Math.cos(c.t * 0.1)}`} stroke="#111" strokeWidth={3} /><path d={`M0,0 L${26 * Math.sin(c.t * 1.2)},${-26 * Math.cos(c.t * 1.2)}`} stroke="#c22" strokeWidth={2} /></g>
        </g>)},
      {depth: 1, key: 'floor', node: (
        <g>
          <Floor p={{...p, floor: p.night ? '#232a38' : '#6c747c', floorDark: '#12161e'}} id="ofloor" plank={false} shine={0.2} />
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${380 + i * 640},800)`}>
              <rect x={-190} y={-210} width={20} height={210} fill={shade(p.wallDark, -0.2)} /><rect x={-190} y={-214} width={380} height={14} fill={shade(p.wall, -0.2)} />
              <rect x={170} y={-210} width={20} height={210} fill={shade(p.wallDark, -0.2)} />
              <rect x={-120} y={-168} width={110} height={70} rx={4} fill="#0d1118" /><rect x={-114} y={-162} width={98} height={56} fill="#7fd3ff" opacity={0.45 + 0.2 * Math.sin(c.t * 8 + i * 2) * (rnd(Math.floor(c.t * 4) + i) > 0.5 ? 1 : 0.4)} />
              <rect x={-70} y={-98} width={10} height={20} fill="#333" />
            </g>))}
          <g transform="translate(1800,800)"><rect x={-18} y={-40} width={36} height={40} fill="#7a4a35" />{[-30, -10, 14, 32].map((a, i) => <path key={i} d={`M0,-40 Q${a + Math.sin(c.t * 1.5 + i) * 5},-90 ${a * 1.8},${-140 + i * 8}`} stroke="#2f7a45" strokeWidth={10} fill="none" strokeLinecap="round" />)}</g>
        </g>)},
    ];
  },
});

// ---------------------------------------------------------------- school
reg({
  id: 'school', name: {ru: 'Школа / класс', en: 'School classroom'}, interior: true,
  live: ['sun shaft with drifting dust', 'tree outside sways', 'wall clock ticks', 'chalk dust falls'],
  layers: (c) => {
    const p = palette(c.time === 'indoor' ? 'day' : c.time);
    return [
      {depth: 0.9, key: 'wall', node: (
        <g>
          <Wall p={{...p, wall: '#d8cfa8', wallDark: '#b0a27a'}} id="swall" stripe={false} />
          <g transform="translate(300,170)"><rect width={680} height={330} fill="#4a3a2a" /><rect x={14} y={14} width={652} height={302} fill="#27493a" />
            <path d="M50,80 q60,-30 110,0 t110,0 M50,150 h300 M50,210 q80,-24 160,0 t120,10" stroke="#e8f0e8" strokeWidth={4} fill="none" opacity={0.7} />
            <rect x={14} y={316} width={652} height={14} fill="#3a2d20" /></g>
          <WindowView x={1250} y={120} w={420} h={300} p={p} ctx={c} id="swin" />
          <g transform="translate(1100,70)"><circle r={36} fill="#f4f1e6" stroke="#222" strokeWidth={5} /><path d={`M0,0 L${24 * Math.sin(c.t * 0.1)},${-24 * Math.cos(c.t * 0.1)}`} stroke="#111" strokeWidth={3} /><path d={`M0,0 L${28 * Math.sin(c.t * 1.2)},${-28 * Math.cos(c.t * 1.2)}`} stroke="#c22" strokeWidth={2} /></g>
          <rect x={1700} y={150} width={100} height={70} fill="#2b4a8a" /><rect x={1700} y={185} width={100} height={12} fill="#fff" opacity={0.8} />
        </g>)},
      {depth: 1, key: 'floor', node: (
        <g>
          <Floor p={{...p, floor: '#9a7a52', floorDark: '#6a4f32'}} id="sfloor" />
          <Shaft x={1230} w={420} color="#fff1c0" t={c.t} id="sshaft" op={p.night ? 0.05 : 0.26} slant={-560} />
          {[0, 1, 2].map((i) => <g key={i} transform={`translate(${1250 + i * 340},800)`}><rect x={-60} y={-92} width={120} height={9} fill="#b88a58" /><rect x={-52} y={-83} width={7} height={83} fill="#555" /><rect x={45} y={-83} width={7} height={83} fill="#555" /></g>)}
          {Array.from({length: 24}, (_, i) => {
            const life = (c.t * 0.12 + rnd(i * 2)) % 1;
            return <circle key={i} cx={1260 + rnd(i + 11) * 400 - life * 300} cy={150 + life * 600} r={1.5 + rnd(i) * 1.5} fill="#fff" opacity={0.6 * Math.sin(Math.PI * life)} />;
          })}
          <g transform="translate(520,512)">{Array.from({length: 6}, (_, i) => { const l = (c.t * 0.6 + i / 6) % 1; return <circle key={i} cx={Math.sin(i * 9) * 20 + i * 18 - 40} cy={l * 160} r={2} fill="#fff" opacity={0.5 * (1 - l)} />; })}</g>
        </g>)},
    ];
  },
});

// ---------------------------------------------------------------- space station
reg({
  id: 'station', name: {ru: 'Космическая станция', en: 'Space station'}, interior: true,
  live: ['stars drift past portholes', 'Earth rotates', 'panel LEDs blink', 'floating dust', 'warning lamp pulses'],
  layers: (c) => {
    const earthShift = (c.t * 12) % 240;
    const win = (x: number, y: number, r: number, id: string) => (
      <g key={id} transform={`translate(${x},${y})`}>
        <defs><clipPath id={id}><circle r={r} /></clipPath></defs>
        <g clipPath={`url(#${id})`}>
          <rect x={-r} y={-r} width={r * 2} height={r * 2} fill="#02030a" />
          {Array.from({length: 40}, (_, i) => <circle key={i} cx={-r + ((rnd(i + 3) * r * 2 + c.t * (8 + rnd(i) * 12)) % (r * 2))} cy={-r + rnd(i + 99) * r * 2} r={1 + rnd(i + 4)} fill="#fff" />)}
          <circle cx={-r * 0.2} cy={r * 1.35} r={r * 1.6} fill="#2b6cc4" />
          <g opacity={0.65}>{[0, 1, 2, 3].map((i) => <ellipse key={i} cx={-r * 2 + ((i * 140 + earthShift * 1) % 420)} cy={r * 0.4 + (i % 2) * 22} rx={80} ry={10} fill="#fff" />)}</g>
          <circle cx={-r * 0.2} cy={r * 1.35} r={r * 1.6} fill="none" stroke="#7fc4ff" strokeWidth={6} opacity={0.5} />
        </g>
        <circle r={r} fill="none" stroke="#5c6672" strokeWidth={16} /><circle r={r + 10} fill="none" stroke="#1a1f26" strokeWidth={5} />
      </g>
    );
    const pulse = 0.5 + 0.5 * Math.sin(c.t * 4);
    return [
      {depth: 0.9, key: 'wall', node: (
        <g>
          <defs><Grad id="stw" a="#3a4452" b="#1c222c" /></defs>
          <rect x={-900} y={-400} width={4000} height={1200} fill="url(#stw)" />
          {Array.from({length: 30}, (_, i) => <path key={i} d={`M${-800 + i * 130},-400 V800`} stroke="#000" strokeWidth={4} opacity={0.3} />)}
          {Array.from({length: 10}, (_, i) => <rect key={i} x={-860 + i * 400} y={120} width={360} height={260} fill="none" stroke="#000" strokeWidth={3} opacity={0.25} />)}
          {win(520, 330, 150, 'sw1')}{win(1330, 330, 150, 'sw2')}
          {[0, 1, 2].map((i) => <rect key={i} x={-860} y={80 + i * 70} width={4000} height={14} rx={7} fill="#2a313c" />)}
          <g transform="translate(1800,200)"><circle r={26} fill="#ff4d2e" opacity={0.25 + 0.65 * pulse} /><circle r={70} fill="#ff4d2e" opacity={0.08 * pulse} /></g>
        </g>)},
      {depth: 1, key: 'floor', node: (
        <g>
          <defs><Grad id="stf" a="#2b323d" b="#14181f" /></defs>
          <rect x={-900} y={800} width={4000} height={700} fill="url(#stf)" />
          {Array.from({length: 24}, (_, i) => <path key={i} d={`M${-900 + i * 160},800 L${-900 + i * 160},1500`} stroke="#000" strokeWidth={3} opacity={0.3} />)}
          <rect x={-900} y={796} width={4000} height={8} fill="#8fd8ff" opacity={0.45} />
          <g transform="translate(900,800)"><rect x={-300} y={-150} width={600} height={150} rx={8} fill="#222a35" />{Array.from({length: 18}, (_, i) => <Led key={i} x={-270 + (i % 9) * 66} y={-110 + Math.floor(i / 9) * 44} color={['#4dff9a', '#ffd24d', '#ff5a4d', '#4dc3ff'][i % 4]} t={c.t} seed={i + 1} />)}
            <rect x={-250} y={-148} width={160} height={36} fill="#0b1a14" /><path d={`M-244,-130 q20,${-14 * Math.sin(c.t * 2)} 40,0 t40,0 t40,0 t36,0`} stroke="#4dff9a" strokeWidth={2} fill="none" /></g>
          {Array.from({length: 36}, (_, i) => <circle key={i} cx={-300 + ((rnd(i + 1) * 2600 + c.t * (6 + rnd(i) * 10)) % 2700)} cy={80 + rnd(i + 70) * 700 + Math.sin(c.t * 0.8 + i) * 12} r={1.2 + rnd(i + 2) * 1.8} fill="#cfe9ff" opacity={0.5} />)}
        </g>)},
    ];
  },
});

// ---------------------------------------------------------------- nature
reg({
  id: 'nature', name: {ru: 'Природа', en: 'Nature'}, interior: false,
  live: ['trees sway', 'birds fly', 'clouds drift', 'water shimmers', 'grass blades sway', 'fireflies'],
  layers: (c) => {
    const p = palette(c.time === 'indoor' ? 'day' : c.time);
    const treeCol = p.night ? '#07140d' : c.time === 'dusk' ? '#254a38' : '#2b6a3f';
    return [
      {depth: 0.03, key: 'sky', node: (
        <g>
          <Sky p={p} id="nsky" ctx={c} />
          {!p.night && <circle cx={1500} cy={260} r={70} fill="#fff6c8" opacity={0.9} />}
          {[0, 1, 2, 3].map((i) => { const x = ((c.t * (60 + i * 8) + i * 520) % 3000) - 500; return <path key={i} d={`M${x},${210 + i * 36 + Math.sin(c.t * 3 + i) * 5} q14,-14 28,0 q14,-14 28,0`} stroke={p.ink} strokeWidth={3} fill="none" opacity={p.night ? 0 : 0.8} />; })}
        </g>)},
      {depth: 0.15, key: 'mountains', node: (
        <g>
          <path d="M-900,800 L-500,380 L-250,560 L120,260 L520,610 L900,330 L1300,590 L1640,300 L2060,620 L2500,380 L3000,800 Z" fill={p.far} />
          <path d="M-900,800 L-300,560 L200,640 L700,470 L1200,660 L1800,500 L2400,650 L3000,560 L3000,800 Z" fill={p.mid} opacity={0.9} />
          <path d="M120,260 L60,330 L120,310 L170,350 Z M1640,300 L1590,360 L1650,340 L1700,378 Z" fill="#fff" opacity={p.night ? 0.3 : 0.8} />
        </g>)},
      {depth: 0.5, key: 'forest', node: (
        <g>
          {Array.from({length: 22}, (_, i) => <Tree key={i} x={-700 + i * 150 + rnd(i) * 50} h={300 + rnd(i + 5) * 190} t={c.t} seed={i} color={shade(treeCol, rnd(i + 8) * 0.12)} pine={i % 3 === 0} />)}
        </g>)},
      {depth: 0.85, key: 'lake', node: (
        <g>
          <defs><Grad id="lake" a={p.skyBot} b={p.skyTop} /></defs>
          <rect x={-900} y={790} width={4000} height={0} fill="none" />
        </g>)},
      {depth: 1, key: 'ground', node: (
        <g>
          <defs><Grad id="ngr" a={p.night ? '#102a1a' : '#3b8a4a'} b={p.night ? '#07130c' : '#1e5530'} /></defs>
          <rect x={-900} y={800} width={4000} height={700} fill="url(#ngr)" />
          <path d="M-900,810 Q400,780 1000,812 T3000,805 V830 H-900 Z" fill={p.night ? '#0e2616' : '#4a9a58'} />
          <g opacity={0.55}>{Array.from({length: 14}, (_, i) => <path key={i} d={`M${-600 + i * 200},${1100 + (i % 3) * 40} q40,${-8 + Math.sin(c.t * 2 + i) * 4} 90,0`} stroke="#fff" strokeWidth={3} fill="none" opacity={0.0} />)}</g>
          {p.night && Array.from({length: 18}, (_, i) => { const x = rnd(i) * 2400 - 200 + Math.sin(c.t * 0.7 + i) * 30; const y = 480 + rnd(i + 4) * 440 + Math.cos(c.t * 0.9 + i * 2) * 24; return <g key={i}><circle cx={x} cy={y} r={14} fill="#d8ff6a" opacity={0.12 * (0.5 + 0.5 * Math.sin(c.t * 3 + i * 2))} /><circle cx={x} cy={y} r={2.6} fill="#f4ffb0" opacity={0.4 + 0.6 * Math.abs(Math.sin(c.t * 3 + i * 2))} /></g>; })}
        </g>)},
      {depth: 1.25, key: 'grass', node: (
        <g>{Array.from({length: 70}, (_, i) => { const x = -700 + i * 42 + rnd(i) * 20; const h = 60 + rnd(i + 2) * 70; const sw = Math.sin(c.t * 1.6 + i * 0.7) * 10; return <path key={i} d={`M${x},1060 Q${x + sw * 0.5},${1060 - h * 0.6} ${x + sw},${1060 - h}`} stroke={p.night ? '#04100a' : '#12351d'} strokeWidth={6} fill="none" strokeLinecap="round" />; })}</g>)},
    ];
  },
});

// backdrop used by title cards
reg({
  id: 'void', name: {ru: 'Пустота (титры)', en: 'Void (title)'}, interior: false,
  live: ['stars twinkle', 'light streak sweeps', 'dust drifts'],
  layers: (c) => {
    const p = palette('night');
    const sweep = easeInOut(((c.t * 0.18) % 1)) * 3200 - 600;
    return [
      {depth: 0.1, key: 'v', node: (
        <g>
          <Sky p={{...p, skyTop: '#02030a', skyBot: '#0b1020'}} id="vsky" ctx={c} clouds={false} />
          <g transform={`translate(${sweep},0)`} opacity={0.2}><rect x={-60} y={-400} width={120} height={1600} fill="#8fb4ff" transform="skewX(-20)" /></g>
          <Clouds t={c.t} p={p} y={500} n={4} speed={5} />
        </g>)},
    ];
  },
});


reg({id: 'rus_river', name: {ru: 'river', en: 'rus_river'}, interior: false,
  live: ['clouds drift', 'banner moves'],
  layers: c => [{depth: 1, key: 'historical', node: <g>
    <rect x={-1000} y={-500} width={4000} height={2200} fill="#8fa3a5"/>
    <path d="M-800 600 Q500 450 2600 600 V1600 H-800Z" fill="#687050"/>
    <g transform={`translate(${(c.t*9)%200},0)`}><ellipse cx={300} cy={90} rx={190} ry={35} fill="#e2ddd0" opacity={0.4}/></g>
    <path d="M-500 740 Q600 540 2400 850 L2400 1500 H-500Z" fill="#678e9a"/>
    <path d={`M1450 220 L${1580+Math.sin(c.t*2)*12} 250 L1450 290Z`} fill="#8d4737"/><path d="M1450 220 V700" stroke="#473c30" strokeWidth={9}/>
    <text x={100} y={620} fill="#eadac0" fontSize={24}>Условная историческая среда · не реконструкция</text>
  </g>}],
});

reg({id: 'rus_ladoga', name: {ru: 'ladoga', en: 'rus_ladoga'}, interior: false,
  live: ['clouds drift', 'banner moves'],
  layers: c => [{depth: 1, key: 'historical', node: <g>
    <rect x={-1000} y={-500} width={4000} height={2200} fill="#b6a787"/>
    <path d="M-800 600 Q500 437 2600 600 V1600 H-800Z" fill="#687050"/>
    <g transform={`translate(${(c.t*9)%200},0)`}><ellipse cx={300} cy={90} rx={190} ry={35} fill="#e2ddd0" opacity={0.4}/></g>
    <g transform="translate(-200,0)"><rect x="0" y="360" width="220" height="360" fill="#8a795b"/><path d="M-30 360 L110 190 L250 360Z" fill="#544638"/></g><g transform="translate(150,0)"><rect x="0" y="360" width="220" height="360" fill="#8a795b"/><path d="M-30 360 L110 190 L250 360Z" fill="#544638"/></g><g transform="translate(500,0)"><rect x="0" y="360" width="220" height="360" fill="#8a795b"/><path d="M-30 360 L110 190 L250 360Z" fill="#544638"/></g>
    <path d={`M1450 220 L${1580+Math.sin(c.t*2)*12} 250 L1450 290Z`} fill="#8d4737"/><path d="M1450 220 V700" stroke="#473c30" strokeWidth={9}/>
    <text x={100} y={620} fill="#eadac0" fontSize={24}>Условная историческая среда · не реконструкция</text>
  </g>}],
});

reg({id: 'rus_hall', name: {ru: 'hall', en: 'rus_hall'}, interior: true,
  live: ['clouds drift', 'banner moves'],
  layers: c => [{depth: 1, key: 'historical', node: <g>
    <rect x={-1000} y={-500} width={4000} height={2200} fill="#695543"/>
    <path d="M-800 600 Q500 424 2600 600 V1600 H-800Z" fill="#687050"/>
    <g transform={`translate(${(c.t*9)%200},0)`}><ellipse cx={300} cy={90} rx={190} ry={35} fill="#e2ddd0" opacity={0.4}/></g>
    <g transform="translate(-200,0)"><rect x="0" y="300" width="220" height="420" fill="#716b60"/><path d="M-30 300 L110 160 L250 300Z" fill="#544638"/></g><g transform="translate(150,0)"><rect x="0" y="300" width="220" height="420" fill="#716b60"/><path d="M-30 300 L110 160 L250 300Z" fill="#544638"/></g><g transform="translate(500,0)"><rect x="0" y="300" width="220" height="420" fill="#716b60"/><path d="M-30 300 L110 160 L250 300Z" fill="#544638"/></g><g transform="translate(850,0)"><rect x="0" y="300" width="220" height="420" fill="#716b60"/><path d="M-30 300 L110 160 L250 300Z" fill="#544638"/></g>
    <path d={`M1450 220 L${1580+Math.sin(c.t*2)*12} 250 L1450 290Z`} fill="#8d4737"/><path d="M1450 220 V700" stroke="#473c30" strokeWidth={9}/>
    <text x={100} y={620} fill="#eadac0" fontSize={24}>Условная историческая среда · не реконструкция</text>
  </g>}],
});

reg({id: 'rus_camp', name: {ru: 'camp', en: 'rus_camp'}, interior: false,
  live: ['clouds drift', 'banner moves'],
  layers: c => [{depth: 1, key: 'historical', node: <g>
    <rect x={-1000} y={-500} width={4000} height={2200} fill="#8fa3a5"/>
    <path d="M-800 600 Q500 411 2600 600 V1600 H-800Z" fill="#687050"/>
    <g transform={`translate(${(c.t*9)%200},0)`}><ellipse cx={300} cy={90} rx={190} ry={35} fill="#e2ddd0" opacity={0.4}/></g>
    <g transform="translate(-200,0)"><rect x="0" y="420" width="220" height="300" fill="#756047"/><path d="M-30 420 L110 220 L250 420Z" fill="#544638"/></g><g transform="translate(150,0)"><rect x="0" y="420" width="220" height="300" fill="#756047"/><path d="M-30 420 L110 220 L250 420Z" fill="#544638"/></g><g transform="translate(500,0)"><rect x="0" y="420" width="220" height="300" fill="#756047"/><path d="M-30 420 L110 220 L250 420Z" fill="#544638"/></g><g transform="translate(850,0)"><rect x="0" y="420" width="220" height="300" fill="#756047"/><path d="M-30 420 L110 220 L250 420Z" fill="#544638"/></g><g transform="translate(1200,0)"><rect x="0" y="420" width="220" height="300" fill="#756047"/><path d="M-30 420 L110 220 L250 420Z" fill="#544638"/></g>
    <path d={`M1450 220 L${1580+Math.sin(c.t*2)*12} 250 L1450 290Z`} fill="#8d4737"/><path d="M1450 220 V700" stroke="#473c30" strokeWidth={9}/>
    <text x={100} y={620} fill="#eadac0" fontSize={24}>Условная историческая среда · не реконструкция</text>
  </g>}],
});

reg({id: 'rus_monastery', name: {ru: 'monastery', en: 'rus_monastery'}, interior: false,
  live: ['clouds drift', 'banner moves'],
  layers: c => [{depth: 1, key: 'historical', node: <g>
    <rect x={-1000} y={-500} width={4000} height={2200} fill="#b6a787"/>
    <path d="M-800 600 Q500 398 2600 600 V1600 H-800Z" fill="#687050"/>
    <g transform={`translate(${(c.t*9)%200},0)`}><ellipse cx={300} cy={90} rx={190} ry={35} fill="#e2ddd0" opacity={0.4}/></g>
    <g transform="translate(-200,0)"><rect x="0" y="360" width="220" height="360" fill="#8a795b"/><path d="M-30 360 L110 190 L250 360Z" fill="#544638"/></g><g transform="translate(150,0)"><rect x="0" y="360" width="220" height="360" fill="#8a795b"/><path d="M-30 360 L110 190 L250 360Z" fill="#544638"/></g><g transform="translate(500,0)"><rect x="0" y="360" width="220" height="360" fill="#8a795b"/><path d="M-30 360 L110 190 L250 360Z" fill="#544638"/></g><g transform="translate(850,0)"><rect x="0" y="360" width="220" height="360" fill="#8a795b"/><path d="M-30 360 L110 190 L250 360Z" fill="#544638"/></g><g transform="translate(1200,0)"><rect x="0" y="360" width="220" height="360" fill="#8a795b"/><path d="M-30 360 L110 190 L250 360Z" fill="#544638"/></g><g transform="translate(1550,0)"><rect x="0" y="360" width="220" height="360" fill="#8a795b"/><path d="M-30 360 L110 190 L250 360Z" fill="#544638"/></g>
    <path d={`M1450 220 L${1580+Math.sin(c.t*2)*12} 250 L1450 290Z`} fill="#8d4737"/><path d="M1450 220 V700" stroke="#473c30" strokeWidth={9}/>
    <text x={100} y={620} fill="#eadac0" fontSize={24}>Условная историческая среда · не реконструкция</text>
  </g>}],
});

reg({id: 'rus_veche', name: {ru: 'veche', en: 'rus_veche'}, interior: false,
  live: ['clouds drift', 'banner moves'],
  layers: c => [{depth: 1, key: 'historical', node: <g>
    <rect x={-1000} y={-500} width={4000} height={2200} fill="#695543"/>
    <path d="M-800 600 Q500 385 2600 600 V1600 H-800Z" fill="#687050"/>
    <g transform={`translate(${(c.t*9)%200},0)`}><ellipse cx={300} cy={90} rx={190} ry={35} fill="#e2ddd0" opacity={0.4}/></g>
    <g transform="translate(-200,0)"><rect x="0" y="300" width="220" height="420" fill="#716b60"/><path d="M-30 300 L110 160 L250 300Z" fill="#544638"/></g><g transform="translate(150,0)"><rect x="0" y="300" width="220" height="420" fill="#716b60"/><path d="M-30 300 L110 160 L250 300Z" fill="#544638"/></g>
    <path d={`M1450 220 L${1580+Math.sin(c.t*2)*12} 250 L1450 290Z`} fill="#8d4737"/><path d="M1450 220 V700" stroke="#473c30" strokeWidth={9}/>
    <text x={100} y={620} fill="#eadac0" fontSize={24}>Условная историческая среда · не реконструкция</text>
  </g>}],
});

reg({id: 'rus_fortress', name: {ru: 'fortress', en: 'rus_fortress'}, interior: false,
  live: ['clouds drift', 'banner moves'],
  layers: c => [{depth: 1, key: 'historical', node: <g>
    <rect x={-1000} y={-500} width={4000} height={2200} fill="#8fa3a5"/>
    <path d="M-800 600 Q500 372 2600 600 V1600 H-800Z" fill="#687050"/>
    <g transform={`translate(${(c.t*9)%200},0)`}><ellipse cx={300} cy={90} rx={190} ry={35} fill="#e2ddd0" opacity={0.4}/></g>
    <g transform="translate(-200,0)"><rect x="0" y="420" width="220" height="300" fill="#756047"/><path d="M-30 420 L110 220 L250 420Z" fill="#544638"/></g><g transform="translate(150,0)"><rect x="0" y="420" width="220" height="300" fill="#756047"/><path d="M-30 420 L110 220 L250 420Z" fill="#544638"/></g><g transform="translate(500,0)"><rect x="0" y="420" width="220" height="300" fill="#756047"/><path d="M-30 420 L110 220 L250 420Z" fill="#544638"/></g>
    <path d={`M1450 220 L${1580+Math.sin(c.t*2)*12} 250 L1450 290Z`} fill="#8d4737"/><path d="M1450 220 V700" stroke="#473c30" strokeWidth={9}/>
    <text x={100} y={620} fill="#eadac0" fontSize={24}>Условная историческая среда · не реконструкция</text>
  </g>}],
});

reg({id: 'rus_steppe', name: {ru: 'steppe', en: 'rus_steppe'}, interior: false,
  live: ['clouds drift', 'banner moves'],
  layers: c => [{depth: 1, key: 'historical', node: <g>
    <rect x={-1000} y={-500} width={4000} height={2200} fill="#b6a787"/>
    <path d="M-800 600 Q500 359 2600 600 V1600 H-800Z" fill="#687050"/>
    <g transform={`translate(${(c.t*9)%200},0)`}><ellipse cx={300} cy={90} rx={190} ry={35} fill="#e2ddd0" opacity={0.4}/></g>
    <g transform="translate(-200,0)"><rect x="0" y="360" width="220" height="360" fill="#8a795b"/><path d="M-30 360 L110 190 L250 360Z" fill="#544638"/></g><g transform="translate(150,0)"><rect x="0" y="360" width="220" height="360" fill="#8a795b"/><path d="M-30 360 L110 190 L250 360Z" fill="#544638"/></g><g transform="translate(500,0)"><rect x="0" y="360" width="220" height="360" fill="#8a795b"/><path d="M-30 360 L110 190 L250 360Z" fill="#544638"/></g><g transform="translate(850,0)"><rect x="0" y="360" width="220" height="360" fill="#8a795b"/><path d="M-30 360 L110 190 L250 360Z" fill="#544638"/></g>
    <path d={`M1450 220 L${1580+Math.sin(c.t*2)*12} 250 L1450 290Z`} fill="#8d4737"/><path d="M1450 220 V700" stroke="#473c30" strokeWidth={9}/>
    <text x={100} y={620} fill="#eadac0" fontSize={24}>Условная историческая среда · не реконструкция</text>
  </g>}],
});

reg({id: 'rus_moscow', name: {ru: 'moscow', en: 'rus_moscow'}, interior: false,
  live: ['clouds drift', 'banner moves'],
  layers: c => [{depth: 1, key: 'historical', node: <g>
    <rect x={-1000} y={-500} width={4000} height={2200} fill="#695543"/>
    <path d="M-800 600 Q500 346 2600 600 V1600 H-800Z" fill="#687050"/>
    <g transform={`translate(${(c.t*9)%200},0)`}><ellipse cx={300} cy={90} rx={190} ry={35} fill="#e2ddd0" opacity={0.4}/></g>
    <g transform="translate(-200,0)"><rect x="0" y="300" width="220" height="420" fill="#716b60"/><path d="M-30 300 L110 160 L250 300Z" fill="#544638"/></g><g transform="translate(150,0)"><rect x="0" y="300" width="220" height="420" fill="#716b60"/><path d="M-30 300 L110 160 L250 300Z" fill="#544638"/></g><g transform="translate(500,0)"><rect x="0" y="300" width="220" height="420" fill="#716b60"/><path d="M-30 300 L110 160 L250 300Z" fill="#544638"/></g><g transform="translate(850,0)"><rect x="0" y="300" width="220" height="420" fill="#716b60"/><path d="M-30 300 L110 160 L250 300Z" fill="#544638"/></g><g transform="translate(1200,0)"><rect x="0" y="300" width="220" height="420" fill="#716b60"/><path d="M-30 300 L110 160 L250 300Z" fill="#544638"/></g>
    <path d={`M1450 220 L${1580+Math.sin(c.t*2)*12} 250 L1450 290Z`} fill="#8d4737"/><path d="M1450 220 V700" stroke="#473c30" strokeWidth={9}/>
    <text x={100} y={620} fill="#eadac0" fontSize={24}>Условная историческая среда · не реконструкция</text>
  </g>}],
});

reg({id: 'rus_chamber', name: {ru: 'chamber', en: 'rus_chamber'}, interior: true,
  live: ['clouds drift', 'banner moves'],
  layers: c => [{depth: 1, key: 'historical', node: <g>
    <rect x={-1000} y={-500} width={4000} height={2200} fill="#8fa3a5"/>
    <path d="M-800 600 Q500 333 2600 600 V1600 H-800Z" fill="#687050"/>
    <g transform={`translate(${(c.t*9)%200},0)`}><ellipse cx={300} cy={90} rx={190} ry={35} fill="#e2ddd0" opacity={0.4}/></g>
    <g transform="translate(-200,0)"><rect x="0" y="420" width="220" height="300" fill="#756047"/><path d="M-30 420 L110 220 L250 420Z" fill="#544638"/></g><g transform="translate(150,0)"><rect x="0" y="420" width="220" height="300" fill="#756047"/><path d="M-30 420 L110 220 L250 420Z" fill="#544638"/></g><g transform="translate(500,0)"><rect x="0" y="420" width="220" height="300" fill="#756047"/><path d="M-30 420 L110 220 L250 420Z" fill="#544638"/></g><g transform="translate(850,0)"><rect x="0" y="420" width="220" height="300" fill="#756047"/><path d="M-30 420 L110 220 L250 420Z" fill="#544638"/></g><g transform="translate(1200,0)"><rect x="0" y="420" width="220" height="300" fill="#756047"/><path d="M-30 420 L110 220 L250 420Z" fill="#544638"/></g><g transform="translate(1550,0)"><rect x="0" y="420" width="220" height="300" fill="#756047"/><path d="M-30 420 L110 220 L250 420Z" fill="#544638"/></g>
    <path d={`M1450 220 L${1580+Math.sin(c.t*2)*12} 250 L1450 290Z`} fill="#8d4737"/><path d="M1450 220 V700" stroke="#473c30" strokeWidth={9}/>
    <text x={100} y={620} fill="#eadac0" fontSize={24}>Условная историческая среда · не реконструкция</text>
  </g>}],
});

export const ENV_LIST = Object.values(ENVS);
export const getEnv = (id: string): EnvDef => ENVS[id] || ENVS.bedroom;
export const hasEnv = (id: string) => !!ENVS[id];
export {Building, Tree, Led};
