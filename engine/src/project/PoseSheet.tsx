import React from 'react';
import {AbsoluteFill} from 'remotion';
import type {ActionName, CharacterDef, ResolvedScene} from '../lib/types.ts';
import {compileTrack} from '../char/track.ts';
import {Character, solveChar} from '../char/Character.tsx';
import {emotionAt} from '../char/emotions.ts';
import {LIB_CHARS} from '../lib/library.ts';

export const SHEET_ACTIONS: ActionName[] = [
  'idle', 'walk', 'run', 'sit', 'lie', 'sleep', 'wave', 'point', 'shrug', 'facepalm',
  'cross_arms', 'hands_up', 'cower', 'jump', 'fall', 'type', 'drink', 'look_phone', 'think', 'cheer',
  'reach', 'clap', 'stretch', 'float', 'carry', 'slump', 'knock', 'stand_up',
];

const mk = (action: ActionName, x: number): ResolvedScene => ({
  id: 'sheet', index: 0, startSec: 0, durSec: 6, startFrame: 0, durFrames: 144, title: {ru: '', en: ''},
  env: {id: 'void', time: 'night'}, light: {key: 'none', x: 0, y: 0, color: '#fff', rim: '#9ec4ff', intensity: 0.5}, ambience: 'silence',
  actors: [{char: 'hero', x, facing: 'r'}],
  beats: [{t: 0.01, char: 'hero', do: action, to: x + 1200, seatH: action === 'lie' || action === 'sleep' ? 60 : 80}],
  shots: [], lines: [], sfx: [], pstates: [],
});

// Visual regression sheet: every action rendered with the same skeleton at time t (used for anatomy review)
export const PoseSheet: React.FC<{t: number}> = ({t}) => {
  const def: CharacterDef = LIB_CHARS[0];
  return (
    <AbsoluteFill style={{background: '#1b2030'}}>
      <svg width={1920} height={1080}>
        {SHEET_ACTIONS.map((a, i) => {
          const col = i % 7;
          const row = Math.floor(i / 7);
          const gx = 150 + col * 270;
          const gy = 330 + row * 250;
          const sc = mk(a, 0);
          const tr = compileTrack(sc, 'hero');
          const st = {...tr.at(t), x: 0};
          const sk = solveChar(def, st, 0);
          return (
            <g key={a} transform={`translate(${gx},${gy}) scale(0.5)`}>
              <Character def={def} state={st} sk={sk} face={emotionAt([], 0)} blink={0} look={{x: 1, y: 0}} talk={0} t={t} groundY={0} light={sc.light} />
              <text x={0} y={70} fill="#fff" fontSize={40} textAnchor="middle" fontFamily="monospace">{a}</text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
