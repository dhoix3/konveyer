import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {prepareMaterials} from '../tools/research-materials.mjs';
import {validatePack,findPack} from '../tools/knowledge.mjs';
import {projectGraphics} from '../tools/project-graphics.mjs';
import {buildProject} from '../tools/script.mjs';import {buildDocumentary,qaDocumentary} from '../tools/documentary.mjs';import {buildPlan} from '../tools/timeline.mjs';
import {renderEstimate} from '../tools/render-estimate.mjs';
import {whisperStatus,fetchWhisper,validModelFile} from '../tools/models.mjs';
const prepared=prepareMaterials({topic:'Исследование образца',sources:[{title:'Предоставленный журнал лаборатории',excerpt:'В образце наблюдались изменения.'}]});
assert.equal(prepared.pack.claims[0].needsReview,true);assert.equal(prepared.pack.claims[0].status,'unknown');assert.equal(prepared.pack.claims[0].text,prepared.pack.sources[0].excerpt);assert.equal(prepared.pack.claims[0].sources[0],'src1');
assert.throws(()=>prepareMaterials({topic:'Новая тема',sources:[]}),/источников/);
assert.throws(()=>prepareMaterials({topic:'Тема',sources:[{title:'Нет выдержки'}]}),/выдержка/);
assert.equal(renderEstimate(100,{scenes:{a:{frames:100,seconds:1}}},{source:'current'}).finalSampleCount,0);
let pack=prepared.pack;
for(const aspect of ['16:9','9:16','1:1']){
 const project=buildDocumentary(buildProject({id:'generic-test',topic:pack.topic,duration:30,voice:'none'}),pack);
 assert.ok(project.scenes.every(s=>s.doc.profile==='generic'&&s.doc.mode==='timeline'&&!s.doc.tree&&!s.doc.chapter.includes('Рюрик')));
 assert.ok(!project.characters.some(c=>c.namedPerson));assert.deepEqual(projectGraphics(pack).ticks,[]);
 const plan=buildPlan(project.id,{projectOverride:project,ignoreAudio:true,persist:false,aspect});
 const q=qaDocumentary(plan);assert.deepEqual(q.errors,[],JSON.stringify(q));
}
pack=structuredClone(pack);pack.graphics={places:[{id:'lab',label:'Лаборатория',x:.3,y:.4,claimIds:['candidate1']},{id:'store',label:'Хранилище',x:.7,y:.7,claimIds:['candidate1']}],routes:[{from:'lab',to:'store',claimIds:['candidate1']}],genealogy:[]};
validatePack(pack);assert.equal(projectGraphics(pack).places.length,2);
pack.graphics.routes[0].to='missing';assert.throws(()=>validatePack(pack),/маршрута/);pack.graphics.routes=[];
pack.graphics.genealogy=[{id:'a',name:'А',parent:'b',claimIds:['candidate1']},{id:'b',name:'Б',parent:'a',claimIds:['candidate1']}];assert.throws(()=>validatePack(pack),/цикл/);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'major-model-'));
try{
 fs.writeFileSync(path.join(tmp,'config.json'),'<html>');assert.equal(validModelFile(path.join(tmp,'config.json')),false);assert.equal(whisperStatus(tmp).ready,false);
 let n=0;await assert.rejects(fetchWhisper({allowDownload:true,directory:tmp,fetchImpl:async()=>{n++;return new Response('<html>broken model</html>');}}),/Invalid model/);assert.equal(n,1);assert.equal(fs.readFileSync(path.join(tmp,'config.json'),'utf8'),'<html>');assert.ok(!fs.readdirSync(tmp).some(f=>f.endsWith('.download')));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
assert.equal(projectGraphics(findPack('Рюриковичи')).profile,'rurikids');
console.log('PASS major: traceable offline preparation, absent sources rejected, generic no-person/unknown-era/no-genealogy all aspects, legacy profile, graph evidence/routes/cycles, corrupt model and temp cleanup; no browser/model inference assertions');
