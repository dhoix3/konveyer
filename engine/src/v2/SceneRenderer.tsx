import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Plan, ResolvedScene, PropDef, CharacterDef, LookSpec} from '../lib/types.ts';
import {WORLD} from '../lib/types.ts';
import {clamp, easeIn, lerp, smooth} from '../lib/math.ts';
import {compileTrack} from '../char/track.ts';
import type {Track, CharState} from '../char/track.ts';
import {emotionAt, blinkAt} from '../char/emotions.ts';
import {Character, solveChar} from '../char/Character.tsx';
import type {Skeleton} from '../char/skeleton.ts';
import {PROPS, PROP_COLORS, PropShape, propTop} from '../char/props.tsx';
import {compileCamera} from '../cine/camera.ts';
import {getEnv} from '../bg/envs.tsx';
import {Rain, Snow, Fog, Dust, Embers, Grain, Vignette, Grade, KeyGlow} from '../fx/Fx.tsx';
import {Counter, Subtitles, Question, TitleCard, Letterbox} from '../hud/Hud.tsx';

type Pt = {x: number; y: number};
interface AttachEv { t: number; char: string; hand: 'l' | 'r' | null; drop?: {x?: number; on?: string} }

const GROUND = WORLD.groundY;

function useScene(plan: Plan, scene: ResolvedScene) {
  return useMemo(() => {
    const defs = new Map<string, CharacterDef>(plan.characters.map((c) => [c.id, c]));
    const tracks = new Map<string, Track>();
    for (const a of scene.actors) tracks.set(a.char, compileTrack(scene, a.char));
    const stateAt = (id: string, t: number): CharState => tracks.get(id)!.at(t);
    const skAt = (id: string, t: number): {st: CharState; sk: Skeleton} => {
      const st = stateAt(id, t);
      return {st, sk: solveChar(defs.get(id)!, st, GROUND)};
    };
    // attach events per prop
    const attach = new Map<string, AttachEv[]>();
    for (const [char, tr] of tracks) {
      let current: string | null = null;
      for (const k of tr.holdKeys) {
        if (k.hold) {
          current = k.hold.prop;
          const arr = attach.get(k.hold.prop) || [];
          arr.push({t: k.t, char, hand: k.hold.hand});
          attach.set(k.hold.prop, arr);
        } else if (current) {
          const arr = attach.get(current) || [];
          arr.push({t: k.t, char, hand: null, drop: k.drop});
          attach.set(current, arr);
          current = null;
        }
      }
    }
    for (const arr of attach.values()) arr.sort((a, b) => a.t - b.t);
    const propMap = new Map<string, PropDef>((scene.props || []).map((p) => [p.id, p]));
    return {defs, tracks, skAt, attach, propMap};
  }, [plan, scene]);
}

function surfaceY(propMap: Map<string, PropDef>, on: string, depth = 0): number {
  if (on === 'floor' || depth > 3) return GROUND;
  const host = propMap.get(on);
  if (!host) return GROUND;
  return surfaceY(propMap, host.on, depth + 1) - propTop(host.kind, host.scale ?? 1);
}

export const SceneRenderer: React.FC<{plan: Plan; sceneIndex: number; subtitles?: boolean}> = ({plan, sceneIndex, subtitles = true}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const scene = plan.scenes[sceneIndex];
  const t = frame / fps;
  const env = getEnv(scene.env.id);
  const lang = plan.language;
  const ctx = useScene(plan, scene);
  const isTitle = scene.kind === 'title';

  const focusFn = useMemo(() => (shot: ResolvedScene['shots'][number], tt: number): Pt => {
    const f = shot.focus || {};
    if (f.char && ctx.tracks.has(f.char)) {
      const {st, sk} = ctx.skAt(f.char, tt);
      const lead = st.fx * 40;
      const at = f.at || (shot.type === 'close' || shot.type === 'extreme_close' ? 'head' : shot.type === 'medium' ? 'chest' : 'body');
      if (at === 'head') return {x: sk.head.x + lead, y: sk.head.y + 8};
      if (at === 'chest') return {x: sk.neck.x * 0.6 + sk.hip.x * 0.4 + lead, y: (sk.neck.y + sk.hip.y) / 2 - 12};
      if (at === 'feet') return {x: (sk.lAnkle.x + sk.rAnkle.x) / 2, y: sk.lowest - 20};
      return {x: sk.hip.x + lead, y: Math.min(560, (sk.head.y + sk.lowest) / 2)};
    }
    if (f.prop) {
      const p = ctx.propMap.get(f.prop);
      if (p) return {x: p.x, y: surfaceY(ctx.propMap, p.on, 0) - propTop(p.kind, p.scale ?? 1) - 30 - (PROPS[p.kind]?.top ? 0 : 20) + (p.on === 'air' ? ((p.y ?? 500) - GROUND) : 0)};
    }
    return {x: f.x ?? 960, y: f.y ?? 520};
  }, [ctx]);
  const camFn = useMemo(() => compileCamera(scene, focusFn), [scene, focusFn]);
  const cam = camFn(t);

  // --- characters
  const chars = scene.actors.map((a) => {
    const def = ctx.defs.get(a.char)!;
    const tr = ctx.tracks.get(a.char)!;
    const {st, sk} = ctx.skAt(a.char, t);
    return {a, def, tr, st, sk};
  });

  const lookFor = (c: (typeof chars)[number]): Pt => {
    const vecFor = (look: LookSpec, tt: number): Pt => {
      const {st, sk} = ctx.skAt(c.a.char, tt);
      const face = st.fx >= 0 ? 1 : -1;
      if (look === 'forward') return {x: face, y: 0};
      if (look === 'up') return {x: face * 0.3, y: -1};
      if (look === 'down') return {x: face * 0.4, y: 1};
      if (look === 'back') return {x: -face, y: 0};
      if (look === 'camera') return {x: 0, y: 0};
      let target: Pt | null = null;
      if ('x' in look) target = look;
      else if ('char' in look && ctx.tracks.has(look.char)) target = ctx.skAt(look.char, tt).sk.head;
      else if ('prop' in look) {
        const p = ctx.propMap.get(look.prop);
        if (p) target = {x: p.x, y: surfaceY(ctx.propMap, p.on, 0) - 30};
      }
      if (!target) return {x: face, y: 0};
      const dx = target.x - sk.head.x;
      const dy = target.y - sk.head.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      return {x: dx / d, y: dy / d};
    };
    const keys = c.tr.lookKeys.filter((k) => k.t <= t);
    if (!keys.length) return vecFor('forward', t);
    const cur = keys[keys.length - 1];
    const prev = keys.length > 1 ? keys[keys.length - 2].look : 'forward';
    const w = smooth((t - cur.t) / 0.2);
    const a = vecFor(prev, t);
    const b = vecFor(cur.look, t);
    return {x: lerp(a.x, b.x, w), y: lerp(a.y, b.y, w)};
  };

  const talkOf = (def: CharacterDef) => {
    const l = scene.lines.find((ln) => ln.voice === def.voice && t >= ln.sceneStart && t <= ln.sceneEnd);
    return l ? 1 : 0;
  };

  // --- props
  const propNodes = (scene.props || []).map((p) => {
    const kind = PROPS[p.kind];
    const baseY = p.on === 'air' ? p.y ?? 500 : surfaceY(ctx.propMap, p.on, 0);
    const base: Pt = {x: p.x, y: baseY};
    const scale = p.scale ?? 1;
    let rest = base;
    let pos: Pt = base;
    let held = false;
    let rot = p.rot ?? 0;
    const ev = ctx.attach.get(p.id) || [];
    const handPt = (e: AttachEv, tt: number): Pt => {
      const {sk} = ctx.skAt(e.char, tt);
      const h = e.hand === 'l' ? sk.lHand : sk.rHand;
      const g = kind?.grip || [0, -10];
      return {x: h.x - g[0] * scale, y: h.y - g[1] * scale};
    };
    const dropTarget = (e: AttachEv, tt: number): Pt => {
      const h = handPt({...e, hand: e.hand || 'r'}, tt);
      const sy = e.drop?.on ? surfaceY(ctx.propMap, e.drop.on, 0) : GROUND;
      return {x: e.drop?.x ?? h.x, y: sy};
    };
    let idx = -1;
    for (let i = 0; i < ev.length; i++) if (ev[i].t <= t) idx = i;
    if (idx >= 0) {
      const e = ev[idx];
      const prior: Pt = idx === 0 ? base : dropTarget(ev[idx - 1], ev[idx - 1].t);
      if (e.hand) {
        const w = smooth((t - e.t) / 0.28);
        const h = handPt(e, t);
        pos = {x: lerp(prior.x, h.x, w), y: lerp(prior.y, h.y, w)};
        held = true;
        rot = lerp(rot, 0, w);
      } else {
        const from = handPt({...e, hand: ev[idx - 1]?.hand || 'r'}, e.t);
        const to = dropTarget({...e, hand: ev[idx - 1]?.hand || 'r'}, e.t);
        const w = easeIn(clamp((t - e.t) / 0.38));
        pos = {x: lerp(from.x, to.x, smooth((t - e.t) / 0.38)), y: lerp(from.y, to.y, w)};
        rest = to;
      }
    }
    // visibility
    const from = p.from ?? -1;
    const to = p.to ?? 1e9;
    if (t < from - 0.01 || t > to + 0.3) return null;
    const appear = p.from !== undefined ? smooth((t - from) / 0.3) : 1;
    const vanish = p.to !== undefined ? 1 - smooth((t - to) / 0.3) : 1;
    const op = Math.min(appear, vanish);
    // animated state
    const st: Record<string, number> = {open: 0, on: 1, ring: 0};
    const states = scene.pstates.filter((s) => s.prop === p.id).sort((a, b) => a.t - b.t);
    const lastTo: Record<string, number> = {};
    for (const s of states) {
      const prev = lastTo[s.key] ?? st[s.key] ?? 0;
      const u = smooth((t - s.t) / Math.max(0.05, s.dur ?? 0.6));
      if (t >= s.t) st[s.key] = lerp(prev, s.to, u);
      lastTo[s.key] = s.to;
    }
    const shadow = !held && p.on !== 'air' && (kind?.layer === 'back' || p.kind === 'box');
    const sc = scale * (0.92 + 0.08 * op);
    const flip = sc < 0 ? -1 : 1;
    const node = (
      <g key={p.id} opacity={op} transform={`translate(${pos.x},${pos.y}) rotate(${rot}) scale(${Math.abs(sc) * flip},${Math.abs(sc)})`}>
        {shadow && <ellipse cx={0} cy={2} rx={70} ry={7} fill="#000" opacity={0.28} transform="scale(1,1)" />}
        <PropShape kind={p.kind} color={p.color || PROP_COLORS[p.kind] || '#888'} text={p.text} st={st} t={t} />
      </g>
    );
    void rest;
    return {layer: held ? 'front' : kind?.layer || 'back', node};
  });

  // --- fx
  const w = scene.env.weather || 'clear';
  const pulse = scene.light.pulse ? 0.5 + 0.5 * Math.sin((t * 2 * Math.PI) / scene.light.pulse.period) : 0;
  const sx = 960 + (scene.light.x - cam.cx) * cam.zoom;
  const sy = 540 + (scene.light.y - cam.cy) * cam.zoom;
  const envCtx = {t, frame, time: scene.env.time, weather: w, accent: scene.light.color};
  const layers = env.layers(envCtx);

  // scene transitions
  const dF = scene.durFrames;
  const inT = scene.transition?.in ?? 'cut';
  const outT = scene.transition?.out ?? 'cut';
  const fadeIn = inT === 'cut' ? 0 : 1 - smooth(frame / (inT === 'dip' ? 8 : 14));
  const fadeOut = outT === 'cut' ? 0 : smooth((frame - (dF - (outT === 'dip' ? 8 : 14))) / (outT === 'dip' ? 8 : 14));
  const black = Math.max(fadeIn, fadeOut, cam.black);

  const sorted = [...chars];
  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      <AbsoluteFill>
        <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', left: 0, top: 0}}>
          <g transform={`translate(960,540) rotate(${cam.rot}) scale(${cam.zoom}) translate(${-cam.cx},${-cam.cy})`}>
            {layers.map((l) => (
              <g key={l.key} transform={`translate(${(cam.cx - 960) * (1 - l.depth)},${(cam.cy - 540) * (1 - l.depth) * 0.5})`}>{l.node}</g>
            ))}
            {propNodes.filter((p) => p && p.layer === 'back').map((p) => p!.node)}
            {sorted.map((c) => (
              <Character
                key={c.a.char}
                def={c.def}
                state={c.st}
                sk={c.sk}
                face={emotionAt(c.tr.emoKeys, t)}
                blink={blinkAt(c.a.char, t)}
                look={lookFor(c)}
                talk={talkOf(c.def)}
                t={t}
                groundY={GROUND}
                light={scene.light}
              />
            ))}
            {propNodes.filter((p) => p && p.layer === 'front').map((p) => p!.node)}
          </g>
        </svg>
        {(w === 'rain' || w === 'storm') && <Rain t={t} heavy={w === 'storm'} />}
        {w === 'snow' && <Snow t={t} />}
        {(w === 'fog' || scene.fx?.includes('fog')) && <Fog t={t} />}
        {scene.fx?.includes('embers') && <Embers t={t} />}
        <Dust t={t} color={scene.env.time === 'night' ? '#aabbff' : '#fff4d6'} n={isTitle ? 70 : 34} />
        <KeyGlow sx={sx} sy={sy} light={scene.light} t={t} />
        <Grade light={scene.light} time={scene.env.time} t={t} pulse={pulse} />
        <Vignette />
        <Grain frame={frame} />
      </AbsoluteFill>
      {isTitle && <TitleCard title={plan.title[lang]} sub={scene.overlay?.text[lang]} kicker={lang === 'ru' ? 'А ЧТО ЕСЛИ' : 'WHAT IF'} t={t} dur={scene.durSec} />}
      {!isTitle && scene.counter && <Counter c={scene.counter} t={t} dur={scene.durSec} lang={lang} />}
      {!isTitle && scene.overlay?.type === 'question' && <Question text={scene.overlay.text[lang]} t={t} t0={scene.overlay.t} dur={scene.durSec} />}
      {subtitles && !isTitle && <Subtitles scene={scene} t={t} lang={lang} fps={fps} />}
      <Letterbox bar={WORLD.bar} />
      <AbsoluteFill style={{background: '#000', opacity: black, pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};
