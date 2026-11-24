import React from 'react';
import {useVideoConfig, AbsoluteFill} from 'remotion';
import {clamp, easeOut, fmtNumber, lerp, smooth} from '../lib/math.ts';
import type {CounterDef, Lang, ResolvedScene} from '../lib/types.ts';

const FONT = '"Inter", "Helvetica Neue", Arial, sans-serif';

export const Counter: React.FC<{c: CounterDef; t: number; dur: number; lang: Lang}> = ({c, t, dur, lang}) => {
  const t0 = c.t0 ?? 0.4;
  const t1 = c.t1 ?? Math.max(t0 + 1, dur - 0.5);
  const u = smooth((t - t0) / Math.max(0.1, t1 - t0));
  const v = lerp(c.from, c.to, u);
  const appear = easeOut(clamp(t / 0.5));
  const col = c.danger ? '#ff5a4d' : '#e9f2ff';
  const pulse = c.danger ? 0.65 + 0.35 * Math.sin(t * 6) : 1;
  return (
    <div style={{position: 'absolute', left: 120, top: 178, opacity: appear, transform: `translateY(${(1 - appear) * -12}px)`, fontFamily: FONT, color: col}}>
      <div style={{fontSize: 22, letterSpacing: 6, textTransform: 'uppercase', opacity: 0.75, fontWeight: 600}}>{c.label[lang]}</div>
      <div style={{fontSize: 74, fontWeight: 800, lineHeight: 1.05, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 ${24 * pulse}px ${col}88, 0 2px 10px #000`}}>
        {fmtNumber(v, c.format, c.unit)}
      </div>
      <div style={{width: 280, height: 4, background: 'rgba(255,255,255,0.15)', marginTop: 8, borderRadius: 2}}>
        <div style={{width: `${u * 100}%`, height: '100%', background: col, borderRadius: 2, boxShadow: `0 0 12px ${col}`}} />
      </div>
    </div>
  );
};

export const Subtitles: React.FC<{scene: ResolvedScene; t: number; lang: Lang; fps: number}> = ({scene, t, lang, fps}) => {
  const {width,height}=useVideoConfig();
  const line = scene.lines.find((l) => t >= l.sceneStart - 0.02 && t <= l.sceneEnd + 0.1);
  if (!line) return null;
  const fade = Math.min(smooth((t - line.sceneStart) / (6 / fps)), 1 - smooth((t - line.sceneEnd) / 0.1));
  const isNarr = line.voice === 'narrator';
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: '16%', display: 'flex', justifyContent: 'center', opacity: fade, fontFamily: FONT}}>
      <div style={{maxWidth: '84%', textAlign: 'center', fontSize: Math.min(42,width*.039,height*.039), lineHeight: 1.22, fontWeight: isNarr ? 500 : 700, fontStyle: isNarr ? 'normal' : 'italic', color: isNarr ? '#f3f3f0' : '#ffe9a8', textShadow: '0 2px 3px #000, 0 0 18px #000, 0 0 40px #000a', padding: '0 24px'}}>
        {line.text[lang]}
      </div>
    </div>
  );
};

export const Question: React.FC<{text: string; t: number; t0: number; dur: number}> = ({text, t, t0, dur}) => {
  const a = smooth((t - t0) / 0.9) * (1 - smooth((t - (dur - 0.3)) / 0.3));
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: a, fontFamily: FONT, pointerEvents: 'none'}}>
      <div style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.55), rgba(0,0,0,0) 70%)', padding: '60px 140px', textAlign: 'center'}}>
        <div style={{fontSize: 66, fontWeight: 800, color: '#fff', letterSpacing: 1, lineHeight: 1.15, textShadow: '0 4px 30px #000', transform: `translateY(${(1 - a) * 14}px)`}}>{text}</div>
      </div>
    </AbsoluteFill>
  );
};

export const TitleCard: React.FC<{title: string; sub?: string; kicker: string; t: number; dur: number}> = ({title, sub, kicker, t, dur}) => {
  const a = smooth(t / 0.8) * (1 - smooth((t - (dur - 0.6)) / 0.6));
  const spacing = lerp(30, 6, easeOut(clamp(t / 2.5)));
  const sweep = clamp(t / 2.2);
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', fontFamily: FONT, opacity: a, pointerEvents: 'none'}}>
      <div style={{textAlign: 'center'}}>
        <div style={{fontSize: 30, letterSpacing: 18, color: '#9ec4ff', fontWeight: 600, marginBottom: 14, textShadow: '0 0 24px #4a86ff'}}>{kicker}</div>
        <div style={{fontSize: 118, fontWeight: 900, letterSpacing: spacing, color: '#fff', lineHeight: 1.05, textTransform: 'uppercase', textShadow: '0 0 60px rgba(120,170,255,0.55), 0 6px 20px #000', maxWidth: 1640}}>{title}</div>
        <div style={{height: 3, margin: '26px auto 0', width: 900 * easeOut(sweep), background: 'linear-gradient(90deg, rgba(255,255,255,0), #9ec4ff, rgba(255,255,255,0))'}} />
        {sub && <div style={{fontSize: 34, color: '#cbd6e8', marginTop: 22, opacity: smooth((t - 1.2) / 0.8), maxWidth: 1400, marginLeft: 'auto', marginRight: 'auto'}}>{sub}</div>}
      </div>
    </AbsoluteFill>
  );
};

export const Letterbox: React.FC<{bar?: number}> = ({bar = 135}) => (
  <>
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: bar, background: '#000'}} />
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: bar, background: '#000'}} />
  </>
);
