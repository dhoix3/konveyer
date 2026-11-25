import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {decodeWav,analyzeWav} from '../tools/speech-analysis.mjs';
import {mouthAt,mouthOpening} from '../src/lib/lipsync.ts';
import {subtitleCues} from '../tools/subtitles.mjs';
import {claimFidelity} from '../tools/claim-fidelity.mjs';
import {findPack} from '../tools/knowledge.mjs';
import {python} from '../tools/lib.mjs';
import {prosodyFor} from '../tools/voice-registry.mjs';
export function syntheticWav() {
 const rate=16000,count=rate*2,b=Buffer.alloc(44+count*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(count*2,40);
 for(let i=0;i<count;i++){const t=i/rate,value=(t>=.2&&t<.6)||(t>=1&&t<1.6)?Math.sin(2*Math.PI*220*t)*.5:0;b.writeInt16LE(Math.round(value*32767),44+i*2);}return b;
}
assert.equal(mouthOpening(0,.8,1,true),0);assert.notEqual(mouthOpening(1,0,.1),mouthOpening(1,0,.2));
const wav=syntheticWav(),speech=analyzeWav(wav,'Привет мир');
assert.equal(decodeWav(wav).duration,2);assert.equal(mouthAt(speech,.1),0);assert.equal(mouthAt(speech,.8),0);assert.equal(mouthAt(speech,1.9),0);assert.ok(mouthAt(speech,.4)>.8);
assert.equal(speech.wordTiming,'energy-estimated');assert.equal(speech.words.length,2);
assert.ok(speech.words[0].start>=.2&&speech.words.at(-1).end<=1.62);
const visemes=analyzeWav(wav,'Мама',{phonemes:[{phoneme:'m',start:.3,end:.5}]});assert.equal(mouthAt(visemes,.4),0);
const provided=analyzeWav(wav,'слово',{words:[{text:'слово',start:.2,end:.6}]});assert.equal(provided.wordTiming,'provided');
assert.throws(()=>analyzeWav(wav,'x',{words:[{text:'x',start:1,end:3}]}));assert.throws(()=>decodeWav(wav.subarray(0,60)),/Truncated/);
// Unknown odd-sized chunk before fmt/data must be skipped with padding.
const extra=Buffer.alloc(10);extra.write('JUNK');extra.writeUInt32LE(1,4);extra[8]=42;
const chunked=Buffer.concat([wav.subarray(0,12),extra,wav.subarray(12)]);chunked.writeUInt32LE(chunked.length-8,4);assert.equal(decodeWav(chunked).duration,2);
const silent=Buffer.from(wav);silent.fill(0,44);assert.ok(analyzeWav(silent,'Тишина').values.every(v=>v===0));
const plan={language:'ru',totalSec:3,scenes:[{startSec:0,lines:[{id:'l',text:{ru:'Привет мир'},sceneStart:.5,sceneEnd:2.5,speech}]}]};
assert.equal(subtitleCues(plan).errors.length,0);
const overflow=structuredClone(plan);delete overflow.scenes[0].lines[0].speech;overflow.scenes[0].lines[0].text.ru='слово '.repeat(50);assert.ok(subtitleCues(overflow).warnings.some(w=>w.includes('overflow')));assert.ok(subtitleCues(overflow).warnings.some(w=>w.includes('reading speed')));
for(const c of findPack('Рюриковичи').claims)assert.deepEqual(claimFidelity(c.narration||c.text,c),[],c.id);
assert.ok(claimFidelity('Наполеон в 1812 году.',{text:'Иван IV венчался на царство.'}).length>=2);
assert.throws(()=>prosodyFor({id:'x',piper:{}},{settings:{voiceProsody:{x:{speed:99}}}}));
const py=spawnSync(python(),['-c',`import sys;sys.path.insert(0,'tools');from textnorm import prepare
for text,expected in [('Иван IV','четвёртый'),('в XI веке','одиннадцатом'),('в 862 году','восемьсот'),('Рюрик и Святослав','Рю́рик')]:
 value=prepare(text)['normalized'];assert expected.lower() in value.lower(),(text,value)
`],{encoding:'utf8'});assert.equal(py.status,0,py.stderr);
console.log('PASS real PCM envelope/pause closure, odd RIFF chunks, optional timed visemes, provided/estimated words, subtitle limits, claim fidelity, historical textnorm and prosody validation');
