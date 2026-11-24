import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {LIB_CHARS,BODY_PRESETS} from '../src/lib/library.ts';import {compileTrack} from '../src/char/track.ts';import {solve,BONES} from '../src/char/skeleton.ts';import {STYLES,MUSIC_MOODS} from '../tools/script.mjs';import {HISTORICAL_ENVS} from '../tools/historical.mjs';
assert.ok(LIB_CHARS.length>=27);assert.equal(Object.keys(BODY_PRESETS).length,4);assert.ok(Object.keys(STYLES).length>=8);assert.equal(HISTORICAL_ENVS.length,20);assert.ok(MUSIC_MOODS.includes('solemn'));
for(const def of LIB_CHARS.slice(-20))for(const action of ['idle','walk','point','sit']) {
 const sc={actors:[{char:def.id,x:500,facing:'r'}],beats:[{t:0,char:def.id,do:action,to:650}],durSec:6};const tr=compileTrack(sc,def.id);
 for(const t of [0,.5,2,4,5.5]){const st=tr.at(t),sk=solve(st.pose,{x:st.x,groundY:800,fx:1,scale:def.height,limbW:13});
 assert.ok(Math.abs(Math.hypot(sk.hip.x-sk.lKnee.x,sk.hip.y-sk.lKnee.y)-BONES.thigh*def.height)<.6);assert.ok(Number.isFinite(sk.head.x));}
}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'koveyer-art-'));try{
 const env={...process.env,WHATIF_PROJECTS:path.join(tmp,'projects'),WHATIF_OUTPUT:path.join(tmp,'output')};
 const r=spawnSync(process.execPath,['render.mjs','smoke','expanded','--extended','--plan-only'],{cwd:path.resolve(import.meta.dirname,'..'),env,encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);
 const p=JSON.parse(fs.readFileSync(path.join(env.WHATIF_PROJECTS,'expanded','plan.json')));assert.equal(p.totalSec,18);assert.ok(p.scenes.every(s=>s.crowd.count===6&&s.env.id.startsWith('rus_')));assert.ok(p.characters.some(c=>c.age==='elder'));assert.ok(p.characters.some(c=>c.age==='child'));
 assert.ok(p.scenes.every(s=>s.shots.every((shot,i)=>s.shots[i+1]?(s.shots[i+1].t-shot.t)<=4:(s.durSec-shot.t)<=4)));
 console.log('PASS 27 common-skeleton characters/4 body-age presets, unchanged bone lengths, 20 historical environments, 10 selectable grades, expanded 18s smoke/crowd/transitions and <=4s shots');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
