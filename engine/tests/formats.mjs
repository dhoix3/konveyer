import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {deflateSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';
import {outputSize,viewport,ASPECTS} from '../src/lib/viewport.ts';
import {publishPackage} from '../tools/publishing.mjs';
import {ff} from '../tools/lib.mjs';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'koveyer-formats-'));
const env={...process.env,WHATIF_PROJECTS:path.join(temp,'projects'),WHATIF_OUTPUT:path.join(temp,'output')};
const cli=(...args)=>{const r=spawnSync(process.execPath,['render.mjs',...args],{cwd:path.resolve(import.meta.dirname,'..'),env,encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);return r;};
try {
 assert.throws(()=>outputSize('../../bad'));assert.throws(()=>outputSize('constructor'));
 cli('smoke','--plan-only');assert.throws(()=>viewport(0,12));
 cli('smoke','smoke','--plan-only');
 const original=fs.readFileSync(path.join(env.WHATIF_PROJECTS,'smoke','project.json'),'utf8');
 for(const aspect of Object.keys(ASPECTS)){
  cli('export','smoke','--aspect',aspect);
  cli('qa','smoke','--aspect',aspect,'--plan-only');
  const p=JSON.parse(fs.readFileSync(path.join(env.WHATIF_PROJECTS,'smoke','exports',aspect.replace(':','x'),'plan.json')));
  assert.deepEqual({width:p.width,height:p.height},outputSize(aspect));assert.equal(p.totalSec,18);
  const v=viewport(p.width,p.height);assert.ok(v.safe.left>0&&v.safe.right<p.width&&v.safe.bottom<p.height);
  assert.equal(v.w/v.h,p.width/p.height);
  assert.deepEqual(new Set(p.scenes.map(s=>s.doc.mode)),new Set(['map','timeline','tree']));
  const pub=path.join(env.WHATIF_OUTPUT,'smoke',aspect.replace(':','x'),'publish');
  assert.match(fs.readFileSync(path.join(pub,'PUBLISH.md'),'utf8'),/NO VIDEO AVAILABLE/);
  assert.match(fs.readFileSync(path.join(pub,'THUMBNAIL.svg'),'utf8'),/NOT A RENDERED FRAME/);
  assert.ok(fs.existsSync(path.join(pub,'subtitles','captions.srt')));
  assert.ok(fs.existsSync(path.join(pub,'s01-SCHEMATIC.svg')));
 }
 assert.equal(fs.readFileSync(path.join(env.WHATIF_PROJECTS,'smoke','project.json'),'utf8'),original);
 // Real extraction branch is verified using an FFmpeg test signal, NOT engine-rendered footage.
 const crc=buf=>{let crc=0xffffffff;for(const b of buf){crc^=b;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;};
 const chunk=(name,data)=>{const kind=Buffer.from(name),size=Buffer.alloc(4),check=Buffer.alloc(4);size.writeUInt32BE(data.length);check.writeUInt32BE(crc(Buffer.concat([kind,data])));return Buffer.concat([size,kind,data,check]);};
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(160);ihdr.writeUInt32BE(90,4);ihdr[8]=8;ihdr[9]=2;
 const pixels=Buffer.alloc((160*3+1)*90);for(let y=0;y<90;y++)for(let x=0;x<160;x++)pixels[y*481+1+x*3+2]=200;
 const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);
 const video=path.join(temp,'signal.mp4'),raw=path.join(temp,'signal.png');fs.writeFileSync(raw,png);ff(['-loop','1','-i',raw,'-t','5','-c:v','libx264','-pix_fmt','yuv420p',video]);
 const p=JSON.parse(fs.readFileSync(path.join(env.WHATIF_PROJECTS,'smoke','plan.json'))),pub=path.join(temp,'real-publish');
 publishPackage(p,pub,{video});assert.equal(JSON.parse(fs.readFileSync(path.join(pub,'publish.json'))).realFrame,true);assert.match(fs.readFileSync(path.join(pub,'THUMBNAIL.svg'),'utf8'),/data:image\/png;base64/);
 console.log('PASS three aspect exports, dimension metadata/safe zones, separate output paths, original project preservation, 18-second smoke map/timeline/tree, SVG/publication/subtitles and actual FFmpeg test-signal cover extraction');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
