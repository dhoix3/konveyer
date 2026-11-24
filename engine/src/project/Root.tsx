import {WORLD} from '../lib/types.ts';
import React from 'react';
import {Composition, Series} from 'remotion';
import type {Plan} from '../lib/types.ts';
import {SceneRenderer} from '../v2/SceneRenderer.tsx';
import {FrameContactSheet} from './FrameContactSheet.tsx';
import {PoseSheet} from './PoseSheet.tsx';

const emptyPlan = {
  version: 1, id: 'empty', language: 'ru', title: {ru: '', en: ''}, fps: 24, width: WORLD.w, height: WORLD.h,
  totalFrames: 48, totalSec: 2, voiceSource: 'estimated', characters: [], voices: [], scenes: [], music: {mood: 'none'}, hash: '',
} as Plan;

type SceneProps = {plan: Plan; sceneIndex: number; subtitles?: boolean};

const SceneComp: React.FC<SceneProps> = (p) => {
  if (!p.plan.scenes.length) return null;
  return <SceneRenderer {...p} />;
};

const Film: React.FC<{plan: Plan; subtitles?: boolean}> = ({plan, subtitles}) => (
  <Series>
    {plan.scenes.map((s, i) => (
      <Series.Sequence key={s.id} durationInFrames={s.durFrames}>
        <SceneRenderer plan={plan} sceneIndex={i} subtitles={subtitles} />
      </Series.Sequence>
    ))}
  </Series>
);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Scene"
      component={SceneComp}
      width={WORLD.w}
      height={WORLD.h}
      fps={24}
      durationInFrames={48}
      defaultProps={{plan: emptyPlan, sceneIndex: 0, subtitles: true} as SceneProps}
      calculateMetadata={({props}) => {
        const p = props as SceneProps;
        const s = p.plan.scenes[p.sceneIndex];
        return {durationInFrames: s ? s.durFrames : 48, fps: p.plan.fps || 24, width: p.plan.width || WORLD.w, height: p.plan.height || WORLD.h};
      }}
    />
    <Composition
      id="Film"
      component={Film}
      width={WORLD.w}
      height={WORLD.h}
      fps={24}
      durationInFrames={48}
      defaultProps={{plan: emptyPlan, subtitles: true}}
      calculateMetadata={({props}) => {
        const p = props as {plan: Plan};
        return {durationInFrames: Math.max(1, p.plan.totalFrames || 48), fps: p.plan.fps || 24,width:p.plan.width||WORLD.w,height:p.plan.height||WORLD.h};
      }}
    />
    <Composition id="FrameContactSheet" component={FrameContactSheet} width={1440} height={720} fps={24} durationInFrames={1} defaultProps={{items:[]}} calculateMetadata={({props})=>({height:Math.max(340,Math.ceil(props.items.length/3)*316+40)})}/>
    <Composition id="PoseSheet" component={PoseSheet} width={WORLD.w} height={WORLD.h} fps={24} durationInFrames={24} defaultProps={{t: 1.0}} />
  </>
);
