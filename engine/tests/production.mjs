// Isolated end-to-end CLI authoring, new production provider and season storage.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {buildProject} from '../tools/script.mjs';
import {qaPlan} from '../tools/qa.mjs';
import {normalizeBrief} from '../tools/production.mjs';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'koveyer-test-'));
const env={...process.env,WHATIF_PROJECTS:path.join(temp,'projects'),WHATIF_OUTPUT:path.join(temp,'output')};
const cli=(...args)=>spawnSync(process.execPath,['render.mjs',...args],{cwd:path.resolve(import.meta.dirname,'..'),env,encoding:'utf8'});
const load=id=>JSON.parse(fs.readFileSync(path.join(temp,'projects',id,'project.json')));
try {
  let cases=0;
  for (const language of ['ru','en']) for(const characters of [1,2,3]) for(const duration of [25,30,45,90,180]) {
    const topic=language==='ru'?'Возвращение динозавров':'Dinosaurs return';
    const p=buildProject({id:'probe',name:'Terra',format:'fiction',topic,language,characters,duration});
    assert.equal(p.characters.length,characters);
    for(const c of p.characters) {
      assert.ok(p.scenes.some(s=>s.actors.some(a=>a.char===c.id)));
      assert.ok(p.scenes.some(s=>s.lines.some(l=>l.voice===c.voice)));
    }
    assert.equal(p.production.brief.topic,topic);
    assert.ok(new Set(p.scenes.map(s=>s.env.id)).size>1);
    const id=`film${cases++}`;
    fs.mkdirSync(path.join(temp,'projects',id),{recursive:true});
    p.id=id;fs.writeFileSync(path.join(temp,'projects',id,'project.json'),JSON.stringify(p));
    const timeline=cli('timeline',id);
    assert.equal(timeline.status,0,timeline.stdout+timeline.stderr);
    const plan=JSON.parse(fs.readFileSync(path.join(temp,'projects',id,'plan.json')));
    assert.ok(Math.abs(plan.totalSec-duration)/duration<=0.055,`${duration}/${plan.totalSec}`);
    if(characters===3) {
      const bad=structuredClone(plan);bad.scenes.forEach(s=>s.actors=s.actors.filter(a=>a.char!=='doc'));
      assert.ok(qaPlan(id,bad).errors.some(e=>e.includes('never appears')));
    }
  }
  assert.throws(()=>normalizeBrief({format:'documentary',topic:'X',claims:[{text:'A fact',status:'supported',sources:[]}]}),/needs sources/);
  const material={sources:[{id:'ref',title:'User source',url:'https://example.org/report'}],claims:[{text:'User-supplied observation',date:'1900',place:'Test place',status:'supported',sources:['ref']},{text:'Cause uncertain',status:'hypothesis',sources:[]}]};
  const file=path.join(temp,'materials.json');fs.writeFileSync(file,JSON.stringify(material));
  const doc=cli('new','document','--format','documentary','--topic','Historical event','--name','Archive','--duration','90','--materials',file);
  assert.equal(doc.status,0,doc.stderr);
  const p=load('document');
  assert.equal(p.production.fiction,false);
  assert.equal(p.references.length,1);
  assert.ok(p.scenes.flatMap(s=>s.lines).some(l=>l.evidence?.status==='hypothesis'));
  assert.equal(cli('timeline','document').status,0);
  const season=cli('new','saga','--format','series','--name','Terra','--topic','Возвращение динозавров','--characters','3','--duration','90','--episodes','3');
  assert.equal(season.status,0,season.stderr);
  assert.equal(load('saga').production.episodes.length,3);
  const first=fs.readFileSync(path.join(temp,'projects','saga-e01','project.json'),'utf8');
  const third=fs.readFileSync(path.join(temp,'projects','saga-e03','project.json'),'utf8');
  assert.ok(load('saga-e02').production.context.previousOutcome);
  assert.deepEqual(load('saga-e01').characters,load('saga-e03').characters);
  assert.equal(cli('episode','saga','--episode','2').status,1);
  assert.equal(cli('episode','saga','--episode','2','--force').status,0);
  assert.equal(fs.readFileSync(path.join(temp,'projects','saga-e01','project.json'),'utf8'),first);
  assert.equal(fs.readFileSync(path.join(temp,'projects','saga-e03','project.json'),'utf8'),third);
  assert.equal(cli('new','saga','--format','series','--topic','Replacement','--force').status,1);
  assert.equal(cli('all','saga').status,1);
  const sequel=cli('new','sequel','--format','fiction','--name','After Terra','--topic','A new expedition','--continue-from','saga-e01','--duration','90');
  assert.equal(sequel.status,0,sequel.stderr);
  assert.equal(load('sequel').production.continuationFrom,'saga-e01');
  assert.deepEqual(load('sequel').characters,load('saga-e01').characters);
  assert.equal(fs.readFileSync(path.join(temp,'projects','saga-e01','project.json'),'utf8'),first);
  console.log(`PASS ${cases} production plans: RU/EN, 1–3 cast, 25–180s; documentary evidence; season context and episode isolation`);
} finally {fs.rmSync(temp,{recursive:true,force:true});}
