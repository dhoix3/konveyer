import fs from 'node:fs';
import path from 'node:path';
import {ff,writeJson} from './lib.mjs';
import {viewport} from '../src/lib/viewport.ts';
export const xml=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const time=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(Math.floor(n)%60).padStart(2,'0')}`;
export function selectCover(plan) {
  return plan.scenes.map((scene,index)=>({scene,index,score:(scene.doc?.mode==='map'?5:0)+(scene.actors?.length||0)*2-(scene.kind==='title'?10:0)})).sort((a,b)=>b.score-a.score||a.index-b.index)[0];
}
export function schematicFrame(plan,scene) {
  const {width:w,height:h}=plan,safe=viewport(w,h).safe;
  const labels=scene.doc?.labels||[],mode=scene.doc?.mode||'scene';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#203e3d"/><rect x="${safe.left}" y="${safe.top}" width="${safe.right-safe.left}" height="${safe.bottom-safe.top}" fill="none" stroke="#67b79b" stroke-dasharray="8 8"/><text x="${w*.1}" y="${h*.14}" fill="white" font-size="${w*.025}">SCHEMATIC PREVIEW — NOT A RENDER</text><text x="${w*.1}" y="${h*.23}" fill="#ffe1a3" font-size="${w*.032}">${xml(scene.doc?.chapter||scene.title[plan.language])}</text><text x="${w*.1}" y="${h*.31}" fill="white" font-size="${w*.03}">${xml(mode==='map'?'Карта — схема':mode==='tree'?'Родословная — схема':mode==='timeline'?'Таймлайн':'План сцены')}</text>${mode==='map'?`<path d="M${w*.15} ${h*.4} L${w*.7} ${h*.36} L${w*.8} ${h*.6} L${w*.4} ${h*.63}Z" fill="#75916b"/>`:''}${labels.map((s,i)=>`<text x="${w*.15}" y="${h*(.43+i*.07)}" fill="white" font-size="${w*.027}">${xml(s)}</text>`).join('')}<text x="${w*.1}" y="${h*.78}" fill="white" font-size="${w*.02}">${xml(scene.env.id)} · ${xml(scene.claimIds?.join(', ')||'')}</text></svg>`;
}
export function publishPackage(plan,dir,{video}={}) {
  fs.mkdirSync(dir,{recursive:true});const selected=selectCover(plan);if(!selected)throw new Error('No scenes for publishing');
  const at=selected.scene.startSec+selected.scene.durSec/2;
  let image=null;
  if(video&&fs.existsSync(video)) {const file=path.join(dir,'cover-frame.png');ff(['-ss',String(at),'-i',video,'-frames:v','1',file]);image=fs.readFileSync(file).toString('base64');}
  for(const scene of plan.scenes)fs.writeFileSync(path.join(dir,`${scene.id}-SCHEMATIC.svg`),schematicFrame(plan,scene));
  const {width:w,height:h}=plan,title=plan.title[plan.language],words=title.split(/\s+/),lines=[''];
  for(const word of words){if(lines.at(-1).length+word.length>24)lines.push(word);else lines[lines.length-1]+=(lines.at(-1)?' ':'')+word;}
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#1c343b"/>${image?`<image href="data:image/png;base64,${image}" width="100%" height="100%"/>`:''}<rect x="${w*.06}" y="${h*.58}" width="${w*.88}" height="${h*.3}" fill="#10202b" opacity=".87"/>${lines.map((t,i)=>`<text x="${w*.1}" y="${h*(.68+i*.06)}" fill="#ffe4ac" font-size="${w*.045}">${xml(t)}</text>`).join('')}<text x="${w*.1}" y="${h*.16}" fill="white" font-size="${w*.023}">${image?'Frame selected by deterministic scene score':'SCHEMATIC COVER — NOT A RENDERED FRAME'}</text></svg>`;
  fs.writeFileSync(path.join(dir,'THUMBNAIL.svg'),svg);
  const seen=new Set(),chapters=plan.scenes.flatMap(s=>{const title=s.doc?.chapter||s.title[plan.language];if(seen.has(title))return [];seen.add(title);return [`- ${time(s.startSec)} ${title}`];});
  fs.writeFileSync(path.join(dir,'PUBLISH.md'),`# ${title}\n\n${plan.width}×${plan.height}, ${plan.aspect||'16:9'}, ${plan.totalSec.toFixed(2)} s.\n\n## Chapters\n\n${chapters.join('\n')}\n\n## Cover\n\nScene ${selected.scene.id}, ${at.toFixed(2)} s; deterministic score, not subjective visual quality.\n${image?'Real video frame embedded in THUMBNAIL.svg.':'NO VIDEO AVAILABLE. Cover and SVG scene previews are schematic, NOT rendered frames.'}\n\n## Review\n\nAudio timing: ${plan.voiceSource}. Check subtitles/qa.json for reading speed/overflow.\nCheck SOURCES.md and needsReview; graphics and people are stylized.\nSafe-zone: left/right 8%, top 8%, bottom reserved 16%.\n`);
  writeJson(path.join(dir,'publish.json'),{coverScene:selected.scene.id,coverTime:at,realFrame:!!image,safeZone:viewport(w,h).safe});
  return dir;
}
