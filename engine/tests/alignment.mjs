import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'koveyer-align-'));process.env.WHATIF_PROJECTS=temp;
const {alignManifest,clipWords,checkedWords}=await import('../tools/word-alignment.mjs');
const {analyzeWav}=await import('../tools/speech-analysis.mjs');
const {mouthAt}=await import('../src/lib/lipsync.ts');
try{
 assert.deepEqual(clipWords([{text:'мир',start:3.2,end:3.5}],3,4),[{text:'мир',start:.2,end:.5}]);
 assert.throws(()=>checkedWords([{text:'a',start:0,end:null}],1));
 const project={language:'ru',scenes:[{lines:[{id:'l',text:{ru:'Привет мир'}}]}]},mf={source:'tts',lines:{l:{file:'voice/l.wav',dur:2}}},log={warn(){}};
 const words=[{text:'Привет',start:.21,end:.59},{text:'мир',start:1.01,end:1.59}];
 const aligned=await alignManifest('demo',project,structuredClone(mf),log,{transcriber:async()=>({model:'test-injected-whisper',words})});
 assert.equal(aligned.lines.l.wordTiming,'aligned');assert.deepEqual(aligned.lines.l.words,words);assert.equal(aligned.alignment.aligned,1);
 const fallback=await alignManifest('demo',project,structuredClone(mf),log,{transcriber:async()=>{throw new Error('model absent');}});
 assert.equal(fallback.lines.l.wordTiming,'energy-estimated');assert.equal(fallback.alignment.energyEstimated,1);
 const mismatch=await alignManifest('demo',project,structuredClone(mf),log,{transcriber:async()=>({words:[{text:'Other',start:0,end:1}]})});assert.equal(mismatch.alignment.aligned,0);
 const speech={step:.1,values:Array(20).fill(1),words,wordTiming:'aligned'};assert.equal(mouthAt(speech,.8),0);assert.equal(mouthAt(speech,.3),1);
 console.log('PASS injected Whisper exact timestamps -> aligned; no model/mismatch -> energy-estimated; clipped word offsets and mouth closure between aligned words');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
