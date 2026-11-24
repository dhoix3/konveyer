import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {validatePack,findPack} from '../tools/knowledge.mjs';
import {qaDocumentary} from '../tools/documentary.mjs';
const pack=findPack('Рюриковичи');assert.ok(pack.claims.length>=20);
assert.ok(pack.claims.every(c=>c.needsReview&&c.sources.length));
assert.ok(pack.claims.some(c=>c.status==='disputed'));
assert.ok(pack.causalLinks.length>=2);
for(const mutate of [p=>p.claims[0].sources=['fake'],p=>p.claims[0].status='true',p=>p.claims[0].confidence=2,p=>p.claims[0].needsReview=undefined,p=>p.claims[0].date.precision='guess',p=>p.claims.push(p.claims[0])]){
 const p=structuredClone(pack);mutate(p);assert.throws(()=>validatePack(p));
}
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'koveyer-documentary-'));
const env={...process.env,WHATIF_PROJECTS:path.join(temp,'projects'),WHATIF_OUTPUT:path.join(temp,'output')};
const cli=(...args)=>{const r=spawnSync(process.execPath,['render.mjs',...args],{cwd:path.resolve(import.meta.dirname,'..'),env,encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);return r;};
const load=(id,file)=>JSON.parse(fs.readFileSync(path.join(env.WHATIF_PROJECTS,id,file)));
try {
 cli('new','rurik','--format','documentary','--genre','history','--topic','Рюриковичи','--duration','120');
 cli('research','rurik','--topic','Рюриковичи');cli('timeline','rurik');cli('qa','rurik','--plan-only');
 const plan=load('rurik','plan.json');assert.equal(plan.totalSec,120);
 assert.equal(qaDocumentary(plan).errors.length,0);
 assert.ok(plan.scenes.length>=10);assert.ok(new Set(plan.scenes.map(s=>s.env.id)).size>=8);
 assert.ok(plan.characters.length>=5);assert.ok(plan.scenes.every(s=>s.durSec<=12));
 assert.ok(plan.scenes[0].doc.chapter.endsWith('?'));
 assert.ok(plan.scenes.at(-1).doc.chapter.startsWith('Итог'));
 assert.ok(plan.scenes.every(s=>new Set(s.lines.flatMap(l=>l.claimIds).map(id=>pack.claims.find(c=>c.id===id).epoch)).size===1));
 assert.ok(plan.scenes.filter(s=>s.doc.mode==='tree').every(s=>s.claimIds.includes('moscow-line')));
 for(const mutate of [p=>p.scenes[0].env.id='office',p=>p.scenes[0].lines[0].claimIds=[],p=>p.scenes[0].claimIds=['fake'],p=>p.scenes[0].props[0].kind='phone',p=>p.characters[1].costume='spacesuit',p=>p.scenes[0].era=[1900,2000]]){
   const p=structuredClone(plan);mutate(p);assert.ok(qaDocumentary(p).errors.length);
 }
 assert.match(fs.readFileSync(path.join(env.WHATIF_PROJECTS,'rurik','SOURCES.md'),'utf8'),/needsReview=true/);
 assert.match(fs.readFileSync(path.join(env.WHATIF_PROJECTS,'rurik','CONTACT_SHEET.svg'),'utf8'),/NOT RENDERED FRAMES/);
 cli('new','empty','--topic','unmapped');const result=cli('research','empty','--topic','unmapped');assert.match(result.stdout,/Empty offline template/);assert.equal(load('empty','knowledge.json').claims.length,0);
 cli('new','short','--format','documentary','--genre','history','--topic','Рюриковичи','--duration','30');
 cli('research','short','--topic','Рюриковичи');const episodes=load('short','documentary-episodes.json').episodes;
 assert.ok(episodes.length>=5);
 for(const e of episodes){cli('timeline',e.id);cli('qa',e.id,'--plan-only');}
 console.log('PASS documentary pack validator; CLI new/research/timeline/QA 120 seconds; claim coverage, cadence, graphics, anachronism rejection, empty offline template and epoch episodes');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
