import {validateGraphics} from './project-graphics.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {ENGINE,projectDir,readJson,writeJson} from './lib.mjs';
export function validatePack(p) {
  const fail=m=>{throw new Error(`knowledge: ${m}`);};
  if(p?.schemaVersion!==1 || typeof p.id!=='string' || typeof p.topic!=='string' || !Array.isArray(p.sources) || !Array.isArray(p.claims))fail('invalid package');
  const sources=new Set(),ids=new Set();
  for(const s of p.sources){if(!s.id || !s.title || sources.has(s.id))fail('invalid/duplicate source');sources.add(s.id);}
  for(const c of p.claims){
    if(typeof c.id!=='string' || !c.id || ids.has(c.id) || typeof c.text!=='string' || !c.text.trim())fail('invalid/duplicate claim');ids.add(c.id);
    if(!['supported','disputed','hypothesis','unknown'].includes(c.status))fail('invalid status');
    if(!c.date || typeof c.date.value!=='string' || !['day','year','century','range','unknown'].includes(c.date.precision) || typeof c.place!=='string')fail('date/place required');
    if(!Number.isFinite(c.confidence) || c.confidence<0 || c.confidence>1 || typeof c.needsReview!=='boolean')fail('confidence/needsReview');
    if(c.narration!==undefined && (typeof c.narration!=='string' || !c.narration.trim()))fail('invalid narration');
    if(c.era!==undefined && (!Array.isArray(c.era)||c.era.length!==2||!c.era.every(Number.isInteger)||c.era[0]>c.era[1]))fail('invalid era');
    if(!Array.isArray(c.sources) || c.sources.some(s=>!sources.has(s)) || (c.status!=='unknown' && !c.sources.length))fail('missing or unknown source');
  }
  for(const c of p.claims)if(c.quote!==undefined&&(typeof c.quote!=='string'||!c.quote.trim()||!c.sources.some(id=>p.sources.find(s=>s.id===id)?.excerpt?.includes(c.quote))))fail('quote must be an exact excerpt from a referenced source');
  for(const link of p.causalLinks||[])if(!ids.has(link.cause)||!ids.has(link.consequence)||!link.qualification)fail('invalid causal link');
  validateGraphics(p);
  return p;
}
export function findPack(topic) {
  const dir=path.join(ENGINE,'knowledge');
  for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.json'))){const p=validatePack(readJson(path.join(dir,file)));if([p.id,p.topic,...(p.aliases||[])].some(t=>t.toLowerCase()===topic.trim().toLowerCase()))return p;}
  return null;
}
export function research(id,topic) {
  const dir=projectDir(id),existing=readJson(path.join(dir,'knowledge.json'),null);
  if(existing)throw new Error('knowledge.json exists; preserve/review it before researching again');
  const pack=findPack(topic)||{schemaVersion:1,id,topic,sources:[],claims:[],verification:'EMPTY OFFLINE TEMPLATE: no package found; no network used'};
  validatePack(pack);writeJson(path.join(dir,'knowledge.json'),pack);return pack;
}
export function sourceMarkdown(p) {
  return `# SOURCES\n\n${p.topic}\n\n${p.verification}\n\nAI-authored knowledge requires manual review. No invented quotations. Visuals: schematic, stylized people, not portrait reconstructions.\n\n`+p.sources.map(s=>`- **${s.id}**: ${s.title}${s.url?' — '+s.url:''}${s.provenance?' ('+s.provenance+')':''}${s.excerpt?'\n\n  Выдержка пользователя: '+s.excerpt.replaceAll('\n','\n  '):''}`).join('\n')+'\n\n## Claims\n\n'+p.claims.map(c=>`- **${c.id}** [${c.status}; confidence=${c.confidence}; needsReview=${c.needsReview}] ${c.date.value} (${c.date.precision}), ${c.place}: ${c.text} Sources: ${c.sources.join(', ')}.`).join('\n')+'\n';
}
