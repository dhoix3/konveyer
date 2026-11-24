import os from 'node:os';import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {ENGINE,projectDir,readJson,writeJson,sha1} from './lib.mjs';
import {LIB_CHARS,LIB_VOICES} from '../src/lib/library.ts';
import {STYLES,MUSIC_MOODS,estimateLine} from './script.mjs';
import {lockProject} from './project-lock.mjs';
import {buildPlan} from './timeline.mjs';import {qaPlan} from './qa.mjs';
import {schematicFrame} from './publishing.mjs';
import {validatePack,findPack} from './knowledge.mjs';
import {buildDocumentary,writeDocumentaryArtifacts} from './documentary.mjs';
const envText=fs.readFileSync(path.join(ENGINE,'src/bg/envs.tsx'),'utf8');
export const EDITOR_ENVS=[...envText.matchAll(/reg\(\{\s*id:\s*'([^']+)'/g)].map(m=>m[1]);
const transition=new Set(['cut','fade','dip','wipe','iris']),moves=new Set(['push','pull','pan','drift','dolly','crane','handheld']),shots=new Set(['wide','medium','close','extreme_close','insert','ots','establishing']);
export const catalog=()=>({characters:LIB_CHARS,environments:EDITOR_ENVS,styles:STYLES,music:MUSIC_MOODS,camera:[...moves],shots:[...shots],transitions:[...transition]});
function acquire(id){try{return lockProject(id);}catch(e){if(/уже выполняется|acquisition in progress/.test(e.message))fail(e.message,409);throw e;}}
const file=id=>path.join(projectDir(id),'project.json');
function fail(message,status=400){throw Object.assign(new Error(message),{status});}
export function editorProject(id){const p=readJson(file(id));if(p.production?.kind==='season')fail('Select an episode, not a season');return p;}
export function estimate(project) {
  const seconds=project.scenes.reduce((sum,s)=>sum+Math.max(s.minDur||4,1.6+s.lines.reduce((n,l)=>n+estimateLine(l.text[project.language]||'',l.voice,project.language)+(l.pause||0),0)),0);
  const frames=Math.ceil(seconds*24),pixels=(project.settings.width||1920)*(project.settings.height||1080);
  return {seconds:+seconds.toFixed(1),frames,concurrency:1,renderSecondsRange:[Math.ceil(frames/15),Math.ceil(frames/1.5)],memoryMiBRange:[768,Math.ceil(1536+pixels*4*24/1048576)],availableMemoryMiB:Math.floor(os.freemem()/1048576),estimated:true,basis:'CPU concurrency=1 heuristic, not measured on this machine'};
}
export function previewProject(id,project=editorProject(id)) {
  const plan=buildPlan(id,{projectOverride:project,persist:false,ignoreAudio:true}),qa=qaPlan(id,plan,{project});
  return {project,revision:sha1(project),plan,qa,estimate:estimate(project),sceneQA:Object.fromEntries(plan.scenes.map(s=>[s.id,{errors:qa.errors.filter(m=>m.includes(`[${s.id}]`)||s.lines.some(l=>m.includes(`[${l.id}]`))),warnings:qa.warnings.filter(m=>m.includes(`[${s.id}]`)).concat(project.production?.knowledge?.claims?.some(c=>s.claimIds?.includes(c.id)&&c.needsReview)?['Claims in this scene need manual factual review']:[])}]))};
}
function capture(id,p){const name=`editor-${crypto.randomUUID()}.json`;writeJson(path.join(projectDir(id),'history',name),p);return name;}
function state(id){return readJson(path.join(projectDir(id),'editor-history.json'),{undo:[],redo:[],revision:null});}
function readCapture(id,name){if(!/^editor-[a-f0-9-]{36}\.json$/.test(name))fail('Invalid editor snapshot');return readJson(path.join(projectDir(id),'history',name));}
function mutate(id,revision,change) {
  const unlock=acquire(id);
  try {
    const p=editorProject(id);if(!revision||sha1(p)!==revision)fail('Project changed; reload before editing',409);
    const h=state(id),next=change(structuredClone(p));
    h.undo=[...h.undo,capture(id,p)].slice(-50);h.redo=[];
    writeJson(file(id),next);if(next.production?.knowledge)writeDocumentaryArtifacts(id,next);h.revision=sha1(readJson(file(id)));writeJson(path.join(projectDir(id),'editor-history.json'),h);
    return previewProject(id);
  } finally {unlock();}
}
export function editScene(id,{revision,sceneId,patch}) {
  return mutate(id,revision,p=>{
    const s=p.scenes.find(s=>s.id===sceneId);if(!s||!patch||typeof patch!=='object')fail('Unknown scene/patch');
    if(Object.keys(patch).some(k=>!['lines','minDur','env','actors','camera','transition'].includes(k)))fail('Unsupported scene field');
    if(patch.lines!==undefined){if(!Array.isArray(patch.lines)||patch.lines.length!==s.lines.length)fail('Line count must be preserved');patch.lines.forEach((value,i)=>{if(typeof value!=='string'||!value.trim()||value.length>4000)fail('Invalid line text');s.lines[i].text[p.language]=value;});}
    if(patch.minDur!==undefined){if(!Number.isFinite(patch.minDur)||patch.minDur<1||patch.minDur>180)fail('Duration 1–180');s.minDur=patch.minDur;}
    if(patch.env!==undefined){if(!EDITOR_ENVS.includes(patch.env))fail('Unknown environment');s.env.id=patch.env;}
    if(patch.actors!==undefined){if(!Array.isArray(patch.actors)||patch.actors.length>8||new Set(patch.actors).size!==patch.actors.length)fail('Invalid cast');
      s.actors=patch.actors.map((id,i)=>{let c=p.characters.find(c=>c.id===id);if(!c){c=LIB_CHARS.find(c=>c.id===id);if(!c)fail('Unknown character');p.characters.push(structuredClone(c));for(const v of LIB_VOICES.filter(v=>v.id===c.voice))if(!p.voices.some(x=>x.id===v.id))p.voices.push(v);}
        return s.actors.find(a=>a.char===id)||{char:id,x:650+i*330,facing:i?'l':'r'};});
      s.beats=s.beats.filter(b=>patch.actors.includes(b.char));for(const a of s.actors)if(!s.beats.some(b=>b.char===a.char))s.beats.push({t:0,char:a.char,do:'idle'});
      s.shots=[];s.shotPlan=[{type:'wide',move:'drift'},{type:'medium',char:s.actors[0]?.char,move:'push'}];
    }
    if(patch.camera!==undefined){const c=patch.camera;if(!moves.has(c.move)||!shots.has(c.type)||!Number.isFinite(c.zoom)||c.zoom<.6||c.zoom>3.5)fail('Invalid camera');s.shots=[];s.shotPlan=[{type:c.type,move:c.move,zoom:c.zoom,char:s.actors[0]?.char}];}
    if(patch.transition!==undefined){if(!transition.has(patch.transition))fail('Invalid transition');s.transition={in:patch.transition,out:'fade'};}
    return p;
  });
}
export function travelHistory(id,{revision,direction}) {
  const unlock=acquire(id);try{
    const p=editorProject(id),h=state(id);if(sha1(p)!==revision||h.revision!==revision)fail('History diverged; reload or restore a snapshot',409);
    if(!['undo','redo'].includes(direction))fail('Invalid history direction');
    if(!h[direction].length)fail('No history in that direction');
    const name=h[direction].at(-1),next=readCapture(id,name);if(next.id!==id||!Array.isArray(next.scenes))fail('Invalid snapshot');
    const opposite=direction==='undo'?'redo':'undo';h[opposite]=[...h[opposite],capture(id,p)].slice(-50);h[direction].pop();
    writeJson(file(id),next);if(next.production?.knowledge)writeDocumentaryArtifacts(id,next);h.revision=sha1(readJson(file(id)));writeJson(path.join(projectDir(id),'editor-history.json'),h);return previewProject(id);
  }finally{unlock();}
}
export function frameSVG(id,sceneId){const {plan}=previewProject(id),scene=plan.scenes.find(s=>s.id===sceneId);if(!scene)fail('Unknown scene');return schematicFrame(plan,scene);}
export function documentaryWizard(id,{revision,topic,materials,duration,commit=false}) {
  if(typeof topic!=='string'||!topic.trim()||topic.length>160)fail('Topic required (max 160)');
  const p=editorProject(id);if(sha1(p)!==revision)fail('Project changed',409);
  const pack=materials?validatePack(materials):findPack(topic);
  if(!pack||!pack.claims.length)fail('No facts: supply a knowledge package with sources/claims; no network lookup performed');
  const target=duration===undefined?p.settings.duration:duration;if(!Number.isFinite(target)||target<25||target>180)fail('Documentary duration 25–180 seconds');
  const updated=buildDocumentary({...p,title:{ru:topic,en:topic},settings:{...p.settings,duration:target},production:{...p.production,brief:{...p.production?.brief,name:topic,topic,format:'documentary',genre:'history'}}},pack);
  if(!commit)return previewProject(id,updated);
  const result=mutate(id,revision,()=>updated);writeDocumentaryArtifacts(id,result.project);return result;
}
