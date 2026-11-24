import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {PassThrough} from 'node:stream';
import {atomicJson,listHistory,restoreSnapshot,migrateDocument} from '../tools/storage.mjs';
import {createSecurity,readBody} from '../tools/ui-security.mjs';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'koveyer-reliable-'));
process.env.WHATIF_PROJECTS=path.join(temp,'projects');process.env.WHATIF_OUTPUT=path.join(temp,'output');
const {createSeason,recoverSeason,assertSeriesContext,regenerateEpisode}=await import('../tools/series.mjs');
const {readJson,writeJson,projectDir,ENGINE}=await import('../tools/lib.mjs');
let child;
try {
  assert.equal(migrateDocument({version:1}).schemaVersion,2);
  assert.throws(()=>migrateDocument({schemaVersion:999}),/Unsupported/);
  const dir=path.join(temp,'history-test'),file=path.join(dir,'project.json');
  atomicJson(file,{id:'history-test',scenes:[],revision:0});
  for(let n=1;n<=24;n++)atomicJson(file,{id:'history-test',scenes:[],revision:n});
  assert.equal(listHistory(dir).length,20);
  const snapshot=listHistory(dir).find(x=>JSON.parse(fs.readFileSync(path.join(dir,'history',x.file))).revision===10);
  restoreSnapshot(dir,snapshot.file);assert.equal(readJson(file).revision,10);
  assert.ok(listHistory(dir).some(x=>JSON.parse(fs.readFileSync(path.join(dir,'history',x.file))).revision===24));
  assert.throws(()=>restoreSnapshot(dir,'../../other.json'),/Snapshot/);
  const original=fs.readFileSync(file,'utf8'),rename=fs.renameSync;
  try {fs.renameSync=()=>{throw new Error('simulated disk failure');};assert.throws(()=>atomicJson(file,{id:'history-test',scenes:[]}),/simulated/);}
  finally{fs.renameSync=rename;}
  assert.equal(fs.readFileSync(file,'utf8'),original);
  fs.writeFileSync(path.join(temp,'broken.json'),'{');
  assert.throws(()=>readJson(path.join(temp,'broken.json'),{}),/Invalid JSON/);
  assert.deepEqual(readJson(path.join(temp,'absent.json'),{}),{});
  console.log('PASS schema migration, history rotation/restore, failed replacement preserves original, corrupt JSON not hidden');

  assert.throws(()=>createSecurity({host:'0.0.0.0'}),/requires/);
  const stream=new PassThrough();stream.headers={};
  const reading=readBody(stream,100);const utf=Buffer.from('{"text":"Рюрик"}');
  stream.write(utf.subarray(0,11));stream.end(utf.subarray(11));assert.equal((await reading).text,'Рюрик');
  const large=new PassThrough();large.headers={};const oversized=readBody(large,30);
  large.end(Buffer.from(JSON.stringify({text:'Ж'.repeat(20)})));await assert.rejects(oversized,e=>e.status===413);

  // Failure after first atomic episode publication; retry must finish the exact transaction.
  const opts={id:'season',name:'Terra',topic:'Динозавры вернулись',format:'series',duration:90,characters:3,episodes:3};
  assert.throws(()=>createSeason(opts,{afterPublish:i=>{if(i===0)throw new Error('power loss');}}),/power loss/);
  assert.ok(fs.existsSync(path.join(projectDir('season'),'season-transaction.json')));
  assert.ok(!fs.existsSync(path.join(projectDir('season'),'project.json')));
  recoverSeason('season');
  assert.equal(readJson(path.join(projectDir('season'),'project.json')).production.episodes.length,3);
  assert.equal(recoverSeason('season'),null);
  const secondPath=path.join(projectDir('season-e02'),'project.json');
  const unchanged=fs.readFileSync(secondPath,'utf8');
  const firstPath=path.join(projectDir('season-e01'),'project.json');
  const first=readJson(firstPath);first.production.outcome='Ручная правка исхода';writeJson(firstPath,first);
  assert.throws(()=>assertSeriesContext(readJson(secondPath)),/Stale episode context/);
  assert.equal(fs.readFileSync(secondPath,'utf8'),unchanged);
  assert.ok(readJson(path.join(projectDir('season'),'project.json')).production.episodes[1].stale);
  regenerateEpisode('season',2,true);
  assert.equal(readJson(secondPath).production.context.previousOutcome,'Ручная правка исхода');
  assertSeriesContext(readJson(secondPath));
  assert.ok(readJson(path.join(projectDir('season'),'project.json')).production.episodes[2].stale);
  const conflictOpts={...opts,id:'conflict'};
  assert.throws(()=>createSeason(conflictOpts,{afterPublish:()=>{throw new Error('interrupt');}}),/interrupt/);
  const conflict=path.join(projectDir('conflict-e01'),'project.json');
  const data=readJson(conflict);data.title.ru='Do not overwrite';writeJson(conflict,data);
  assert.throws(()=>recoverSeason('conflict'),/conflict/i);
  assert.equal(readJson(conflict).title.ru,'Do not overwrite');
  console.log('PASS interrupted season recovery, idempotence, conflict preservation and explicit stale-context regeneration');

  const token='a'.repeat(48),port=20000+Math.floor(Math.random()*10000);
  child=spawn(process.execPath,['render.mjs','ui','--port',String(port),'--host','0.0.0.0'],{cwd:ENGINE,
    env:{...process.env,KOVEYER_GUI_TOKEN:token},stdio:['ignore','pipe','pipe']});
  let log='';child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error(log)),15000);child.stdout.on('data',()=>{if(log.includes('listening on')){clearTimeout(timeout);resolve();}});child.on('exit',()=>{clearTimeout(timeout);reject(new Error(log));});});
  const base=`http://127.0.0.1:${port}`,headers={authorization:`Bearer ${token}`,'content-type':'application/json'};
  const request=(route,opts={})=>fetch(base+route,opts);
  assert.equal((await request('/api/state')).status,401);
  assert.equal((await request('/file?id=test&name=FINAL.mp4')).status,401);
  assert.match(await (await request('/')).text(),/password/);
  assert.equal((await request('/api/state',{headers})).status,200);
  assert.equal((await request('/api/state',{headers:{...headers,origin:'http://evil.invalid'}})).status,403);
  assert.equal((await request('/api/state',{headers:{...headers,'sec-fetch-site':'cross-site'}})).status,403);
  const hostResponse=await new Promise((resolve,reject)=>{http.get(base+'/api/state',{headers:{...headers,host:`evil.invalid:${port}`}},r=>{resolve(r.statusCode);r.resume();}).on('error',reject);});
  assert.equal(hostResponse,403);
  assert.equal((await request('/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:'wrong'})})).status,401);
  const login=await request('/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token})});
  const cookie=login.headers.get('set-cookie');assert.match(cookie,/HttpOnly; SameSite=Strict/);
  assert.equal((await request('/api/state',{headers:{cookie:cookie.split(';')[0]}})).status,200);
  assert.equal((await request('/api/create',{method:'POST',headers,body:JSON.stringify({topic:'Ж'.repeat(600000)})})).status,413);
  const uiDir=projectDir('ui-history'),uiFile=path.join(uiDir,'project.json');
  atomicJson(uiFile,{id:'ui-history',scenes:[],language:'ru',title:{ru:'Original'}});
  atomicJson(uiFile,{id:'ui-history',scenes:[],language:'ru',title:{ru:'Changed'}});
  const versions=await request('/api/history?id=ui-history',{headers}).then(r=>r.json());
  assert.equal(versions.snapshots.length,1);
  const restore=await request('/api/restore',{method:'POST',headers,body:JSON.stringify({id:'ui-history',snapshot:versions.snapshots[0].file})});
  assert.equal(restore.status,200);
  let restored=false;
  for(let i=0;i<100;i++) {
    if(readJson(uiFile).title.ru==='Original'){restored=true;break;}
    await new Promise(r=>setTimeout(r,20));
  }
  assert.ok(restored,'GUI restore child command completed');
  assert.ok(listHistory(uiDir).length>=2);
  console.log('PASS authenticated GUI history listing and actual restore child process');
  assert.equal((await request('/api/create',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'text/plain'},body:'{}'})).status,415);
  console.log('PASS live LAN-token GUI, login cookie, Host/Origin for GET, missing auth, byte limit and content type');
} finally {
  if(child && child.exitCode===null){child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));}
  fs.rmSync(temp,{recursive:true,force:true});
}
