import React from 'react';
import type {ResolvedScene} from '../lib/types.ts';
import {LIB_CHARS} from '../lib/library.ts';
import {compileTrack} from './track.ts';
import {solveChar,Character} from './Character.tsx';
import {emotionAt} from './emotions.ts';
// Same solver and bone lengths as the foreground, reduced scale only.
export const Crowd:React.FC<{scene:ResolvedScene;t:number}> = ({scene,t}) => {
  const spec=scene.crowd;if(!spec)return null;
  return <g opacity={0.58}>{Array.from({length:Math.min(24,spec.count)},(_,i)=>{
    const original=LIB_CHARS.find(c=>c.id===spec.presets[i%spec.presets.length]);if(!original)return null;
    const def={...original,height:original.height*0.65},track=compileTrack({...scene,actors:[{char:def.id,x:100+i*150,facing:'r'}],beats:[{t:0,char:def.id,do:'idle'}]},def.id);
    const st=track.at(t);st.x+=Math.sin(t*.7+i)*7;
    const sk=solveChar(def,st,730);return <Character key={i} def={def} state={st} sk={sk} face={emotionAt([],t)} blink={0} look={{x:1,y:0}} talk={0} t={t} groundY={730} light={scene.light}/>;
  })}</g>;
};
