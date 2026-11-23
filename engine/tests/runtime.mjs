import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn, spawnSync} from 'node:child_process';
import {findBrowser, prepareBrowser} from '../tools/browser.mjs';
import {ttsLineHash, runVoice} from '../tools/voice.mjs';
import {buildProject} from '../tools/script.mjs';
import {buildPlan} from '../tools/timeline.mjs';
import {buildAudioPlan} from '../tools/sound.mjs';
import {ff} from '../tools/lib.mjs';
import {lockProject} from '../tools/project-lock.mjs';
import {projectDir, writeJson, ENGINE} from '../tools/lib.mjs';

const temp = fs.mkdtempSync(path.join(os.tmpdir(),'cine-runtime-'));
let child;
try {
  const chrome = path.join(temp, 'chrome with spaces.exe');
  fs.writeFileSync(chrome, 'test fixture - never executed');
  assert.equal(findBrowser({env:{REMOTION_BROWSER_EXECUTABLE:`"${chrome}"`}}), chrome);
  assert.throws(()=>findBrowser({env:{REMOTION_BROWSER_EXECUTABLE:temp}}), /файл не найден/);
  assert.throws(()=>findBrowser({env:{REMOTION_BROWSER_EXECUTABLE:chrome+'missing'}}), /файл не найден/);
  const windows = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  assert.equal(findBrowser({env:{}, platform:'win32',isFile:p=>p===windows}), windows);
  assert.equal(findBrowser({env:{}, platform:'win32',isFile:()=>false}), null);
  // Real Remotion ensureBrowser: supplied file exists; no launch, no network.
  assert.equal(await prepareBrowser(null,{env:{REMOTION_BROWSER_EXECUTABLE:chrome}}),chrome);
  await assert.rejects(prepareBrowser(null,{env:{},platform:'win32',isFile:()=>false,
    ensure:async opts=>opts.onBrowserDownload()}), /Chrome не найден/);
  console.log('PASS browser discovery, explicit errors, real ensureBrowser without download');

  const id = `runtime-${process.pid}`;
  const dir = projectDir(id);
  assert.ok(!fs.existsSync(dir));
  fs.mkdirSync(dir,{recursive:true});
  try {
    const project = buildProject({id,topic:'динозавры вернулись в современный мир',duration:25,language:'ru'});
    writeJson(path.join(dir,'project.json'),project);
    const line = project.scenes.flatMap(s=>s.lines)[0];
    const hash = ttsLineHash(line,project);
    assert.notEqual(hash,ttsLineHash({...line,text:{...line.text,ru:'Другой текст'}},project));
    assert.notEqual(hash,ttsLineHash(line,{...project,settings:{...project.settings,voiceModels:{narrator:'ru_RU-dmitri-medium'}}}));
    fs.mkdirSync(path.join(dir,'voice'));
    fs.writeFileSync(path.join(dir,'voice','clip.wav'),'fixture, not decoded in metadata test');
    writeJson(path.join(dir,'voice','manifest.json'),{source:'tts',lines:{[line.id]:{file:'voice/clip.wav',dur:2,hash}}});
    assert.equal(buildPlan(id).scenes[0].lines[0].file,'voice/clip.wav');
    line.text.ru += ' Изменено.';
    writeJson(path.join(dir,'project.json'),project);
    assert.throws(()=>buildPlan(id),/Voice cache invalid/);
    writeJson(path.join(dir,'voice','manifest.json'),{source:'tts',lines:{[line.id]:{file:'voice/clip.wav',dur:-1,hash:ttsLineHash(line,project)}}});
    assert.throws(()=>buildPlan(id),/Voice cache invalid/);
    const messages=[];
    await assert.rejects(runVoice(id,project,{info:s=>messages.push(s),warn:s=>messages.push(s),error:s=>messages.push(s)}, {'voice-model':'invalid-model',force:true}),/missing or failed/);
    assert.ok(!messages.some(s=>s.includes('all lines up to date')));
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'voice','manifest.json'))).lines,{});
    // Real FFmpeg conversion: overwriting audio while preserving its mtime
    // must still invalidate the resampled audio and mix key inputs.
    const src = path.join(dir,'voice','tone.wav');
    ff(['-f','lavfi','-i','sine=frequency=440:duration=0.2','-c:a','pcm_s16le',src]);
    const audioPlan = buildPlan(id);
    audioPlan.scenes[0].lines[0].file='voice/tone.wav';
    const log = {info:()=>{}};
    const first = buildAudioPlan(id,audioPlan,log).voice[0].file;
    const date = fs.statSync(src).mtime;
    ff(['-f','lavfi','-i','sine=frequency=880:duration=0.2','-c:a','pcm_s16le',src]);
    fs.utimesSync(src,date,date);
    const second = buildAudioPlan(id,audioPlan,log).voice[0].file;
    assert.notEqual(first,second);
    assert.equal(second,buildAudioPlan(id,audioPlan,log).voice[0].file);
    console.log('PASS actual FFmpeg conversion and content-based audio cache');
    const unlock = lockProject(id);
    const locked = spawnSync(process.execPath,['render.mjs','timeline',id],{cwd:ENGINE,encoding:'utf8'});
    assert.equal(locked.status,1); assert.match(locked.stderr,/уже выполняется/);
    unlock();
    const again = spawnSync(process.execPath,['render.mjs','timeline',id],{cwd:ENGINE,encoding:'utf8'});
    assert.equal(again.status,0,again.stderr);
    fs.writeFileSync(path.join(dir,'.pipeline.lock'),JSON.stringify({pid:2147483647}));
    const recovered=lockProject(id); recovered();
    assert.ok(!fs.existsSync(path.join(dir,'.pipeline.lock')));
    project.scenes[0].title.ru += ' edited';
    writeJson(path.join(dir,'project.json'),project);
    const stale=spawnSync(process.execPath,['render.mjs','scenes',id],{cwd:ENGINE,encoding:'utf8'});
    assert.equal(stale.status,1);assert.match(stale.stderr,/project.json changed/);
    console.log('PASS text/model invalidation, corrupt metadata, Piper preparation failure, CLI lock and retry');
  } finally {fs.rmSync(dir,{recursive:true,force:true});}

  const port = 18000 + Math.floor(Math.random()*10000);
  child=spawn(process.execPath,['render.mjs','ui','--port',String(port)],{cwd:ENGINE,
    env:{...process.env,WHATIF_PROJECTS:path.join(temp,'projects'),WHATIF_OUTPUT:path.join(temp,'output')},stdio:['ignore','pipe','pipe']});
  let logs=''; child.stdout.on('data',c=>logs+=c);child.stderr.on('data',c=>logs+=c);
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(logs||'UI timeout')),10000);child.stdout.on('data',()=>{if(logs.includes('listening on')){clearTimeout(timer);resolve();}});child.once('exit',()=>{clearTimeout(timer);reject(new Error(logs));});});
  const base=`http://127.0.0.1:${port}`;
  const post=(route,body)=>fetch(base+route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const page=await(await fetch(base)).text();
  const script=page.match(/<script>([\s\S]*?)<\/script>/)[1];
  new Function(script); // UI has no build step: syntax-check the actual served JS.
  assert.equal((await fetch(base+'/api/state')).status,200);
  assert.equal((await post('/api/create',{id:'bad',duration:25,narrator:'invalid'})).status,400);
  assert.equal((await fetch(base+'/api/state').then(r=>r.json())).projects.length,0);
  const payload={id:'sample',topic:'динозавры вернулись в современный мир',duration:25,voiceMode:'none'};
  assert.equal((await post('/api/create',payload)).status,200);
  assert.equal((await post('/api/create',payload)).status,400);
  assert.equal((await fetch(base+'/api/script?id=sample')).status,200);
  assert.equal((await fetch(base+'/api/log?id=sample&stage=../../project')).status,400);
  assert.equal((await post('/api/run',{id:'sample',stage:'bad'})).status,400);
  assert.equal((await fetch(base+'/api/create',{method:'POST',body:'{'})).status,400);
  assert.equal((await fetch(base+'/api/run',{method:'POST',headers:{origin:'http://evil.invalid'},body:'{}'})).status,403);
  fs.mkdirSync(path.join(temp,'output','sample'),{recursive:true});
  fs.writeFileSync(path.join(temp,'output','sample','FINAL.mp4'),'0123456789');
  const suffix=await fetch(base+'/file?id=sample&name=FINAL.mp4',{headers:{range:'bytes=-3'}});
  assert.equal(suffix.status,206); assert.equal(await suffix.text(),'789');
  assert.equal((await fetch(base+'/file?id=sample&name=FINAL.mp4',{headers:{range:'bytes=99-100'}})).status,416);
  assert.equal((await fetch(base+'/api/create',{method:'POST',body:'null'})).status,400);
  const requests=await Promise.all([post('/api/run',{id:'sample',stage:'voice'}),post('/api/run',{id:'sample',stage:'voice'})]);
  assert.deepEqual(requests.map(r=>r.status).sort(),[200,409]);
  for (let i=0;i<100;i++) {
    const state=await fetch(base+'/api/state').then(r=>r.json());
    if(state.projects[0].job && !state.projects[0].job.running){
      assert.equal(state.projects[0].stages.voice.status,'done');break;
    }
    if(i===99)assert.fail('voice job timeout');
    await new Promise(r=>setTimeout(r,30));
  }
  console.log('PASS GUI served-script syntax, API JSON/validation/origin, preview, duplicate launch, real voice-none state');
} finally {
  if(child && child.exitCode===null) {child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));}
  fs.rmSync(temp,{recursive:true,force:true});
}
