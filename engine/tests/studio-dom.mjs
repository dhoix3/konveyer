// Optional DOM integration; no runtime dependency. npm install --prefix ../.cache/major-dom jsdom@22
import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
const {JSDOM,VirtualConsole}=await import(path.resolve('../.cache/major-dom/node_modules/jsdom/lib/api.js'));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-dom-'));const port=39000+Math.floor(Math.random()*1000),base=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['render.mjs','ui','--port',String(port)],{env:{...process.env,WHATIF_PROJECTS:path.join(dir,'projects'),WHATIF_OUTPUT:path.join(dir,'output'),WHATIF_OFFLINE:'1'},stdio:['ignore','pipe','pipe']});
let dom;try{
 await new Promise((resolve,reject)=>{let s='';const timer=setTimeout(()=>reject(new Error(s)),10000);child.stdout.on('data',b=>{s+=b;if(s.includes('listening on')){clearTimeout(timer);resolve();}});child.on('exit',()=>reject(new Error(s)));});
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 dom=new JSDOM(await fetch(base).then(r=>r.text()),{url:base,runScripts:'dangerously',virtualConsole:vc,beforeParse(w){w.fetch=(u,o)=>fetch(new URL(u,base),o);w.confirm=()=>true;w.prompt=()=>null;w.localStorage.setItem('koveyer-creation-draft-v1',JSON.stringify({topic:'Восстановленная тема',projectName:'Черновик'}));}});
 await new Promise(r=>setTimeout(r,500));const w=dom.window,d=w.document;
 assert.deepEqual(errors,[]);assert.equal(d.querySelectorAll('.studio-nav button').length,3);assert.equal(d.querySelectorAll('fieldset').length,3);assert.equal(d.querySelectorAll('fieldset:not([hidden])').length,1);
 Array.from(d.querySelectorAll('button')).find(b=>b.textContent==='Восстановить черновик формы').click();assert.equal(d.getElementById('topic').value,'Восстановленная тема');
 d.querySelector('.wizard-foot button:last-child').click();assert.equal(d.querySelectorAll('fieldset:not([hidden])')[0],d.querySelectorAll('fieldset')[1]);
 d.querySelectorAll('.studio-nav button')[2].click();assert.equal(d.getElementById('sceneEditor').classList.contains('studio-hidden'),false);
 d.getElementById('researchTopic').value='Эксперимент';d.getElementById('researchSources').value=JSON.stringify([{title:'Журнал',excerpt:'Измерение выполнено.'}]);d.getElementById('researchPrepare').click();
 await new Promise(r=>setTimeout(r,200));assert.equal(d.getElementById('researchUse').disabled,false);d.getElementById('researchUse').click();await new Promise(r=>setTimeout(r,100));assert.match(d.getElementById('wizClaims').textContent,/Утверждение/);assert.ok(d.getElementById('wizClaims').querySelector('input[type=checkbox]').checked);
 d.getElementById('materials').value=d.getElementById('wizMaterials').value;d.getElementById('universalEnabled').checked=true;d.getElementById('pid').value='dom-universal';d.getElementById('topic').value='Эксперимент';d.getElementById('duration').value='30';d.getElementById('voiceMode').value='none';await w.create();assert.equal(w.current,'dom-universal');
 await new Promise(r=>setTimeout(r,200));
 assert.ok(d.getElementById('advancedBrief')&&d.getElementById('advancedProduction')&&d.getElementById('advancedLaunch')&&d.getElementById('advancedBrief').querySelector('#genre'),'rare settings grouped under "Дополнительно" details');
 const nextHint=d.getElementById('nextStepHint');assert.ok(nextHint,'production next-step hint exists');assert.match(nextHint.textContent,/Следующий шаг/);
 const loadReview=Array.from(d.querySelectorAll('button')).find(b=>b.textContent==='Загрузить материалы выбранного проекта');loadReview.click();await new Promise(r=>setTimeout(r,150));const confirmButton=Array.from(d.querySelectorAll('button')).find(b=>b.textContent==='Подтвердить');assert.ok(confirmButton);confirmButton.click();await new Promise(r=>setTimeout(r,150));const reviewed=await fetch(base+'/api/editor?id=dom-universal').then(r=>r.json());assert.equal(reviewed.project.production.universal.status,'reviewed');
 assert.deepEqual(errors,[]);console.log('PASS JSDOM: studio navigation/step visibility, creation draft restore, real offline preparation API → review table with needsReview checked, universal make form → revision-bound confirm; not browser layout or screenshot verification');
}finally{dom?.window.close();child.kill();if(child.exitCode===null)await new Promise(r=>child.once('exit',r));fs.rmSync(dir,{recursive:true,force:true});}
