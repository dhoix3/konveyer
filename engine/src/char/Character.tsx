import {mouthOpening} from '../lib/lipsync.ts';
import React from 'react';
import {BONES, solve} from './skeleton.ts';
import type {Skeleton, Pt} from './skeleton.ts';
import type {CharState} from './track.ts';
import type {FaceParams} from './emotions.ts';
import type {CharacterDef, LightDef} from '../lib/types.ts';
import {clamp, lerp, shade} from '../lib/math.ts';

export const INK = '#07070b';

export const widths = (b: CharacterDef['build']) =>
  b === 'slim' ? {limb: 11, torso: 22} : b === 'stocky' ? {limb: 16, torso: 36} : {limb: 13, torso: 28};

export function solveChar(def: CharacterDef, st: CharState, groundY: number): Skeleton {
  const w = widths(def.build);
  return solve(st.pose, {x: st.x, groundY, fx: st.fx, scale: def.height, limbW: w.limb});
}

const P = (...pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t)});

interface BodyProps {
  def: CharacterDef;
  sk: Skeleton;
  mode: 'main' | 'rim';
  rimColor?: string;
}

const Body: React.FC<BodyProps> = ({def, sk, mode, rimColor}) => {
  const w = widths(def.build);
  const s = def.height;
  const lw = w.limb * s;
  const tw = w.torso * s;
  const rim = mode === 'rim';
  const ink = rim ? rimColor! : INK;
  const O = rim ? 1.5 : 4; // outline thickness
  const far = (c: string) => shade(c, -0.38);
  const colorOr = (c: string) => (rim ? rimColor! : c);

  const limb = (a: Pt, b: Pt, c: Pt, width: number, color: string, keyp: string, partial = 1) => {
    const mid = partial < 1 ? lerpPt(a, b, partial) : b;
    return (
      <g key={keyp}>
        <path d={P(a, b, c)} stroke={ink} strokeWidth={width + O} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {!rim && <path d={P(a, b, c)} stroke={INK} strokeWidth={width} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
        {!rim && partial > 0 && (
          <path d={partial < 1 ? P(a, mid) : P(a, b, c)} stroke={color} strokeWidth={width - 1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </g>
    );
  };
  const arm = (shoulder: Pt, elb: Pt, hand: Pt, isFar: boolean, k: string) => {
    const col = isFar ? far(def.shirt) : def.shirt;
    return (
      <g key={k}>
        <path d={P(shoulder, elb, hand)} stroke={ink} strokeWidth={lw * 0.82 + O} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {!rim && <path d={P(shoulder, elb, hand)} stroke={INK} strokeWidth={lw * 0.82} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
        {!rim && <path d={P(shoulder, lerpPt(shoulder, elb, 0.92))} stroke={col} strokeWidth={lw * 0.82 - 0.5} fill="none" strokeLinecap="round" />}
        {!rim && <circle cx={hand.x} cy={hand.y} r={lw * 0.5} fill={INK} />}
      </g>
    );
  };
  const leg = (hip: Pt, knee: Pt, ankle: Pt, toe: Pt, isFar: boolean, k: string) => {
    const col = isFar ? far(def.pants) : def.pants;
    const shoe = isFar ? far(def.shoes) : def.shoes;
    return (
      <g key={k}>
        <path d={P(hip, knee, ankle)} stroke={ink} strokeWidth={lw + O} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {!rim && <path d={P(hip, knee, ankle)} stroke={INK} strokeWidth={lw} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
        {!rim && <path d={P(hip, knee, lerpPt(knee, ankle, 0.82))} stroke={col} strokeWidth={lw - 1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
        <path d={P(ankle, toe)} stroke={rim ? ink : INK} strokeWidth={lw * 0.9 + O} fill="none" strokeLinecap="round" />
        {!rim && <path d={P(ankle, toe)} stroke={shoe} strokeWidth={lw * 0.9 - 0.5} fill="none" strokeLinecap="round" />}
      </g>
    );
  };

  const neckBase = sk.neck;
  const sh: Pt = lerpPt(sk.hip, neckBase, 0.97);
  const bodyDir = {x: neckBase.x - sk.hip.x, y: neckBase.y - sk.hip.y};
  void bodyDir;
  return (
    <g>
      {leg(sk.hip, sk.lKnee, sk.lAnkle, sk.lToe, true, 'll')}
      {arm(sh, sk.lElb, sk.lHand, true, 'la')}
      {/* torso */}
      <path d={P(sk.hip, neckBase)} stroke={ink} strokeWidth={tw + O} fill="none" strokeLinecap="round" />
      {!rim && <path d={P(sk.hip, neckBase)} stroke={INK} strokeWidth={tw} fill="none" strokeLinecap="round" />}
      {!rim && <path d={P(lerpPt(sk.hip, neckBase, 0.04), lerpPt(sk.hip, neckBase, 0.96))} stroke={def.shirt} strokeWidth={tw - 2} fill="none" strokeLinecap="round" />}
      {!rim && <path d={P(lerpPt(sk.hip, neckBase, 0.0), lerpPt(sk.hip, neckBase, 0.2))} stroke={shade(def.pants, -0.1)} strokeWidth={tw - 1.5} fill="none" strokeLinecap="round" />}
      {leg(sk.hip, sk.rKnee, sk.rAnkle, sk.rToe, false, 'rl')}
      {arm(sh, sk.rElb, sk.rHand, false, 'ra')}
      {/* neck */}
      <path d={P(neckBase, lerpPt(neckBase, sk.head, 0.75))} stroke={ink} strokeWidth={lw * 0.8 + O} strokeLinecap="round" />
      {!rim && <path d={P(neckBase, lerpPt(neckBase, sk.head, 0.75))} stroke={INK} strokeWidth={lw * 0.8} strokeLinecap="round" />}
      {!rim && def.costume && <g>
        <path d={P(lerpPt(sk.hip,neckBase,0.1),lerpPt(sk.hip,neckBase,0.9))} stroke={def.costume==='chainmail'?'#8b9090':def.shirt} strokeWidth={tw+4} />
        <path d={P({x:sk.hip.x-tw/2,y:sk.hip.y},{x:sk.hip.x+tw/2,y:sk.hip.y})} stroke="#b99961" strokeWidth={5*s}/>
        {def.costume==='cloak' && <path d={P(neckBase,{x:sk.hip.x-tw,y:sk.hip.y+15*s},sk.hip)} fill={shade(def.shirt,-0.25)} stroke={INK} strokeWidth={2}/>}
        {def.costume==='chainmail' && [0.3,0.5,0.7].map(v=><circle key={v} cx={lerpPt(sk.hip,neckBase,v).x} cy={lerpPt(sk.hip,neckBase,v).y} r={3*s} fill="none" stroke="#41494a"/>)}
      </g>}
      {def.accessory === 'tie' && !rim && (
        <path d={P(lerpPt(sk.hip, neckBase, 0.9), lerpPt(sk.hip, neckBase, 0.45))} stroke={def.accessoryColor || '#b0252c'} strokeWidth={5 * s} strokeLinecap="round" />
      )}
      {def.accessory === 'hood' && !rim && <circle cx={sk.head.x} cy={sk.head.y + 1} r={BONES.headR * s + 4} fill={colorOr(def.accessoryColor || def.shirt)} />}
      <circle cx={sk.head.x} cy={sk.head.y} r={BONES.headR * s + (rim ? 1.5 : 0)} fill={ink} />
      {!rim && def.accessory === 'hood' && <circle cx={sk.head.x} cy={sk.head.y} r={BONES.headR * s - 1} fill={INK} />}
    </g>
  );
};

interface FaceProps {
  def: CharacterDef;
  sk: Skeleton;
  fx: number;
  face: FaceParams;
  blink: number;
  closed: number;
  look: {x: number; y: number};
  viseme?: string;
  audioDriven?: boolean;
  talk: number; // 0..1 mouth movement
  t: number;
}

const Face: React.FC<FaceProps> = ({def, sk, fx, face, blink, closed, look, talk, t, audioDriven, viseme}) => {
  const s = def.height;
  const R = BONES.headR * s;
  const sgn = fx >= 0 ? 1 : -1;
  const afx = Math.abs(fx);
  const c = fx * 12 * s;
  const h = lerp(10, 6.2, afx) * s;
  const rx = (def.eyes === 'narrow' ? 6.2 : def.eyes === 'wide' ? 8.2 : 7.2) * s * face.eyeScale;
  const ry = (def.eyes === 'narrow' ? 7 : 9) * s * face.eyeScale;
  const openAmt = clamp(face.open * (1 - blink) * (1 - closed));
  const cover = (1 - openAmt) * 2 * ry;
  const eye = (cx: number, inner: number, k: string) => {
    const base = -ry + cover;
    const yIn = base + face.lid * 0.28;
    const yOut = base - face.lid * 0.28 + face.droop * 0.22;
    const xin = cx + inner * rx * 1.15;
    const xout = cx - inner * rx * 1.15;
    const px = clamp(look.x, -1, 1) * rx * 0.45 + 0;
    const py = clamp(look.y, -1, 1) * ry * 0.4;
    return (
      <g key={k}>
        <ellipse cx={cx} cy={0} rx={rx} ry={ry} fill="#fff" />
        <circle cx={cx + px} cy={py} r={Math.min(rx, ry) * face.pupil * 1.15} fill={INK} />
        <path d={`M${xin},${yIn} L${xout},${yOut} L${xout},${-ry - 3} L${xin},${-ry - 3} Z`} fill={INK} />
        <ellipse cx={cx} cy={ry * (1.95 - face.squint * 1.15)} rx={rx * 1.5} ry={ry} fill={INK} />
      </g>
    );
  };
  const mw = 7.5 * s;
  const my = 15 * s;
  const mouthOpen = mouthOpening(talk,face.mouthO,t,audioDriven);
  const curve = face.mouthC * 6 * s;
  const mc = c * 0.9;
  const leftIsInner = 1; // for eye at c-h inner end is the right side
  return (
    <g transform={`translate(${sk.head.x},${sk.head.y}) rotate(${sk.headAngle * sgn * (sk.bodyRot !== 0 ? 1 : 1) * 1})`} style={{}}>
      {/* head local rotation: head angle already contains torso lean; mirror aware */}
      <g transform={`rotate(${-sk.headAngle * sgn + sk.headAngle * sgn})`}>
        {eye(c - h, leftIsInner, 'e1')}
        {eye(c + h, -leftIsInner, 'e2')}
        {mouthOpen > 0.08 ? (
          <ellipse cx={mc} cy={my + curve * 0.3} rx={mw * (viseme==='round'?0.3:0.45 + mouthOpen * 0.2)} ry={1.5 + mouthOpen * 6 * s} fill="#f4f1ec" />
        ) : (
          <path d={`M${mc - mw},${my} Q${mc},${my + curve} ${mc + mw},${my}`} stroke="#f4f1ec" strokeWidth={2.2 * s} fill="none" strokeLinecap="round" />
        )}
        <Accessory def={def} fx={fx} R={R} t={t} />
        {def.accessory === 'glasses' && (
          <g stroke="#e9eef3" strokeWidth={2} fill="none">
            <circle cx={c - h} cy={0} r={Math.max(rx, ry) + 3.5} />
            <circle cx={c + h} cy={0} r={Math.max(rx, ry) + 3.5} />
            <path d={`M${c - h + Math.max(rx, ry) + 3.5},0 L${c + h - Math.max(rx, ry) - 3.5},0`} />
          </g>
        )}
      </g>
    </g>
  );
};

const LegacyAccessory: React.FC<{def: CharacterDef; fx: number; R: number; t: number}> = ({def, fx, R, t}) => {
  const col = def.accessoryColor || '#c5502b';
  const f = fx;
  switch (def.accessory) {
    case 'cap':
      return (
        <g>
          <path d={`M${-R * 0.98},${-R * 0.12} A${R},${R} 0 0 1 ${R * 0.98},${-R * 0.12} Z`} fill={col} />
          <path d={`M${f * R * 0.2},${-R * 0.16} L${f * R * 1.45},${-R * 0.1} L${f * R * 1.35},${-R * 0.02} L${f * R * 0.2},${-R * 0.03} Z`} fill={shade(col, -0.25)} />
        </g>
      );
    case 'hair':
      return (
        <g fill={col}>
          <path d={`M${-R * 0.7},${-R * 0.55} L${-R * 0.55},${-R * 1.3} L${-R * 0.2},${-R * 0.85} L${R * 0.05},${-R * 1.4} L${R * 0.3},${-R * 0.85} L${R * 0.6},${-R * 1.22} L${R * 0.72},${-R * 0.5} Q0,${-R * 0.95} ${-R * 0.7},${-R * 0.55} Z`} />
        </g>
      );
    case 'scarf':
      return (
        <g>
          <rect x={-R * 0.95} y={R * 0.82} width={R * 1.9} height={R * 0.38} rx={R * 0.18} fill={col} />
          <path d={`M${-f * R * 0.5},${R * 1.1} q${-f * R * 0.5},${R * (0.5 + 0.1 * Math.sin(t * 2.2))} ${-f * R * 1.1},${R * 0.45} l${f * R * 0.2},${R * 0.2} q${f * R * 0.6},${-R * 0.2} ${f * R * 0.9},${-R * 0.6} Z`} fill={shade(col, -0.2)} />
        </g>
      );
    case 'antenna':
      return (
        <g>
          <path d={`M0,${-R} L${f * R * 0.2},${-R * 1.7}`} stroke="#9aa3ad" strokeWidth={2.5} />
          <circle cx={f * R * 0.2} cy={-R * 1.78} r={R * 0.16} fill={col} />
        </g>
      );
    case 'helmet':
      return <circle cx={0} cy={0} r={R * 1.18} fill="rgba(160,210,255,0.16)" stroke="rgba(210,235,255,0.7)" strokeWidth={3} />;
    default:
      return null;
  }
};

const Accessory: React.FC<{def:CharacterDef;fx:number;R:number;t:number}> = p => {
  const {def,R}=p,col=def.accessoryColor||'#69513c';
  return <><LegacyAccessory {...p}/>
    {def.hairStyle==='braid' && <path d={`M${-R*.8} 0 Q${-R*1.3} ${R} ${-R*.8} ${R*1.8}`} fill="none" stroke={col} strokeWidth={R*.3} strokeDasharray="5 2"/>}
    {def.hairStyle==='curly' && [-.7,-.35,0,.35,.7].map((x,i)=><circle key={i} cx={x*R} cy={-R*.8-Math.sin(i)*R*.2} r={R*.32} fill={col}/>)}
    {def.hairStyle==='long' && <path d={`M${-R} ${R*.7} V${-R*.6} Q0 ${-R*1.7} ${R} ${-R*.6} V${R*.7}`} fill="none" stroke={col} strokeWidth={R*.25}/>}
    {def.headwear==='fur' && <rect x={-R*1.1} y={-R*1.25} width={R*2.2} height={R*.65} rx={R*.2} fill="#554739"/>}
    {def.headwear==='conical' && <path d={`M${-R} ${-R*.5} L0 ${-R*1.9} L${R} ${-R*.5}Z`} fill="#a7aba5" stroke="#3a3e3c" strokeWidth={2}/>}
    {def.headwear==='veil' && <path d={`M${-R*1.15} ${R*.8} V${-R*.5} Q0 ${-R*1.6} ${R*1.15} ${-R*.5} V${R*.8}`} fill="none" stroke="#c2b8a1" strokeWidth={R*.3}/>}
    {def.headwear==='hood' && <path d={`M${-R*1.15} ${R*.4} Q${-R*1.5} ${-R*1.6} 0 ${-R*1.4} Q${R*1.5} ${-R*1.6} ${R*1.15} ${R*.4}`} fill="none" stroke={def.shirt} strokeWidth={R*.3}/>}
    {def.age==='elder' && <path d={`M${-R*.7} ${R*.2} h${R*.3} M${R*.4} ${R*.2} h${R*.3}`} stroke="#80766c" strokeWidth={1.5}/>}
  </>;
};

export interface CharacterProps {
  def: CharacterDef;
  state: CharState;
  sk: Skeleton;
  face: FaceParams;
  blink: number;
  look: {x: number; y: number};
  viseme?: string;
  audioDriven?: boolean;
  talk: number;
  t: number;
  groundY: number;
  light: LightDef;
  opacity?: number;
}

export const Character: React.FC<CharacterProps> = ({def, state, sk, face, blink, look, talk, t, groundY, light, opacity = 1, audioDriven, viseme}) => {
  const lx = light.x - sk.hip.x;
  const dirL = Math.sign(lx) || 1;
  const rimC = light.rim;
  const rimOff = {x: 3.2 * dirL, y: -1.4};
  const support = groundY - state.pose.lift;
  const air = Math.max(0, support - sk.lowest);
  const shW = 110 * def.height * (1 + Math.abs(Math.sin((sk.torsoAngle * Math.PI) / 180)) * 1.6);
  const shadowOp = 0.5 * clamp(1 - air / 260) * (state.pose.seat > 0.5 ? 0.7 : 1);
  const footX = (sk.lAnkle.x + sk.rAnkle.x) / 2;
  const cx = lerp(footX, sk.hip.x, clamp(Math.abs(sk.torsoAngle) / 90));
  return (
    <g opacity={opacity}>
      <ellipse cx={cx - dirL * 10} cy={support + 3} rx={shW} ry={9 * def.height} fill="#000" opacity={shadowOp} />
      <g transform={`translate(${rimOff.x},${rimOff.y})`} opacity={0.9 * clamp(light.intensity + 0.25)}>
        <Body def={def} sk={sk} mode="rim" rimColor={rimC} />
      </g>
      <Body def={def} sk={sk} mode="main" />
      <Face def={def} sk={sk} fx={state.fx} face={face} blink={blink} closed={state.eyeClosed} look={look} talk={talk} t={t} audioDriven={audioDriven} viseme={viseme} />
    </g>
  );
};
