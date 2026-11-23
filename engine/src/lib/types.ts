// Shared data model. `Plan` is the fully resolved artefact (numeric times, frames)
// produced by the TIMELINE stage from project.json + voice timing, and consumed by
// Remotion, the sound planner and the QA tools.

export type Lang = 'ru' | 'en';
export type L10n = {ru: string; en: string};
export type Facing = 'l' | 'r';

export type Emotion =
  | 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised'
  | 'scared' | 'tired' | 'thinking' | 'smug' | 'panic';

export type ActionName =
  | 'idle' | 'walk' | 'run' | 'sit' | 'sit_up' | 'lie' | 'sleep' | 'stand_up'
  | 'wave' | 'point' | 'shrug' | 'facepalm' | 'cross_arms' | 'hands_up' | 'cower'
  | 'jump' | 'fall' | 'knock' | 'type' | 'drink' | 'look_phone' | 'think'
  | 'cheer' | 'reach' | 'clap' | 'stretch' | 'turn' | 'float' | 'carry' | 'slump';

export type LookSpec =
  | 'forward' | 'up' | 'down' | 'back' | 'camera'
  | {x: number; y: number}
  | {char: string}
  | {prop: string};

export interface CharacterDef {
  id: string;
  name: L10n;
  role: string;
  shirt: string;
  pants: string;
  shoes: string;
  accessory: 'none' | 'cap' | 'glasses' | 'hair' | 'scarf' | 'tie' | 'hood' | 'antenna' | 'helmet';
  accessoryColor?: string;
  height: number; // 0.8 .. 1.2
  build: 'slim' | 'normal' | 'stocky';
  eyes: 'round' | 'narrow' | 'wide';
  voice: string;
}

export interface VoiceDef {
  id: string;
  label: L10n;
  gender: 'male' | 'female' | 'neutral';
  ageRange: string;
  timbre: string;
  speed: number; // 1 = normal speech rate
  intonation: string;
  mood: string;
  accent: L10n;
  delivery: L10n;
  prompt: L10n; // ready-made prompt for external voice generators
  piper: {ru: string; en: string; pitch?: number}; // piper model per language + pitch factor
}

export interface Beat {
  t: number | {line: string; off?: number};
  char: string;
  do?: ActionName;
  to?: number; // target x for walk / run / carry
  dur?: number;
  speed?: number;
  face?: Facing;
  emotion?: Emotion;
  look?: LookSpec;
  hold?: {prop: string; hand: 'l' | 'r'} | null;
  drop?: {x?: number; on?: string}; // where a released prop lands
  seatH?: number; // seat height for sit/lie on furniture
  note?: string;
}

export interface PropDef {
  id: string;
  kind: string;
  x: number;
  on: string; // surface name from the environment, or 'air' (needs `why`)
  scale?: number;
  rot?: number;
  from?: number; // appear time (s, relative to scene)
  to?: number; // disappear time
  y?: number; // world y, only for on === 'air'
  why?: string; // justification when on === 'air'
  color?: string;
  text?: string;
}

export interface PropState {
  t: number | {line: string; off?: number};
  prop: string;
  key: string; // e.g. open, on, fall
  to: number;
  dur?: number;
}

export interface Shot {
  t: number | {line: string; off?: number};
  type: 'wide' | 'medium' | 'close' | 'extreme_close' | 'insert' | 'ots' | 'establishing';
  focus?: {char?: string; prop?: string; x?: number; y?: number; at?: 'head' | 'chest' | 'feet' | 'body'};
  move?: 'push' | 'pull' | 'pan' | 'drift' | 'dolly' | 'crane' | 'handheld';
  angle?: 'eye' | 'low' | 'high';
  dutch?: number;
  zoom?: number;
  pan?: number; // pixels of lateral travel for pan/dolly
  cut?: 'cut' | 'dip' | 'fade';
}

export interface Line {
  id: string;
  voice: string; // voice id (narrator or character voice)
  text: L10n;
  t?: number | {after?: string; off?: number};
  emotion?: string;
  pause?: number; // seconds of silence after
}

export interface SfxEvent {
  t: number | {line: string; off?: number};
  kind: string;
  gain?: number;
  pan?: number;
}

export interface CounterDef {
  label: L10n;
  from: number;
  to: number;
  unit?: string;
  format?: 'int' | 'time' | 'percent' | 'money' | 'decimal';
  t0?: number;
  t1?: number;
  danger?: boolean;
}

export interface LightDef {
  key: 'sun' | 'moon' | 'lamp' | 'screen' | 'neon' | 'fire' | 'emergency' | 'none';
  x: number; // 0..1920 position of key light
  y: number;
  color: string;
  rim: string; // contra-light colour on characters
  intensity: number; // 0..1
  flicker?: number; // 0..1
  pulse?: {color: string; period: number}; // e.g. alarm lights
  grade?: 'teal_orange' | 'cold' | 'warm' | 'noir' | 'sick' | 'dawn' | 'dusk' | 'space';
}

export interface SceneSpec {
  id: string;
  kind?: 'story' | 'title';
  title: L10n;
  env: {id: string; time: 'day' | 'night' | 'dusk' | 'dawn' | 'indoor'; weather?: 'clear' | 'rain' | 'snow' | 'fog' | 'storm'};
  light: LightDef;
  actors: {char: string; x: number; facing: Facing; start?: ActionName; seatH?: number}[];
  beats: Beat[];
  props?: PropDef[];
  pstates?: PropState[];
  shots: Shot[];
  lines: Line[];
  sfx?: SfxEvent[];
  counter?: CounterDef;
  ambience: string;
  musicLevel?: number; // 0..1
  silence?: boolean;
  minDur?: number;
  transition?: {in?: 'cut' | 'fade' | 'dip'; out?: 'cut' | 'fade' | 'dip'};
  overlay?: {type: 'question' | 'caption'; text: L10n; t: number};
  fx?: string[]; // extra fx ids
}

export interface ProjectSpec {
  version: number;
  id: string;
  language: Lang;
  title: L10n;
  logline: L10n;
  mainIdea: L10n;
  idea: {template: string; topic: string; theme: string};
  settings: {
    duration: number;
    style: string;
    characters: number;
    voiceMode: 'tts' | 'upload' | 'none';
    music: string;
    fps: number;
    width: number;
    height: number;
  };
  characters: CharacterDef[];
  voices: VoiceDef[];
  scenes: SceneSpec[];
  references?: string[];
}

// ---------- resolved plan ----------
export interface ResolvedLine extends Line {
  start: number; // absolute seconds
  end: number;
  sceneStart: number; // relative to the scene
  sceneEnd: number;
  file?: string;
}

export interface ResolvedScene extends Omit<SceneSpec, 'beats' | 'shots' | 'lines' | 'sfx' | 'pstates'> {
  index: number;
  startSec: number;
  durSec: number;
  startFrame: number;
  durFrames: number;
  beats: (Omit<Beat, 't'> & {t: number})[];
  shots: (Omit<Shot, 't'> & {t: number})[];
  lines: ResolvedLine[];
  sfx: (Omit<SfxEvent, 't'> & {t: number})[];
  pstates: (Omit<PropState, 't'> & {t: number})[];
}

export interface Plan {
  version: number;
  id: string;
  language: Lang;
  title: L10n;
  fps: number;
  width: number;
  height: number;
  totalFrames: number;
  totalSec: number;
  voiceSource: 'estimated' | 'tts' | 'whisper' | 'vad';
  characters: CharacterDef[];
  voices: VoiceDef[];
  scenes: ResolvedScene[];
  music: {mood: string};
  hash: string;
}

export const WORLD = {w: 1920, h: 1080, groundY: 800, bar: 135};
