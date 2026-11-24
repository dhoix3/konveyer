import fs from 'node:fs';
import path from 'node:path';
import {ff} from './lib.mjs';
// RIFF chunk traversal (including odd padding): never search for the string 'data'.
export function decodeWav(buf) {
  if(buf.toString('ascii',0,4)!=='RIFF'||buf.toString('ascii',8,12)!=='WAVE')throw new Error('Invalid RIFF WAV');
  let format,data;
  for(let off=12;off+8<=buf.length;) {
    const id=buf.toString('ascii',off,off+4),size=buf.readUInt32LE(off+4),start=off+8;
    if(start+size>buf.length)throw new Error('Truncated WAV chunk');
    if(id==='fmt ') {if(size<16)throw new Error('Invalid fmt');format={code:buf.readUInt16LE(start),channels:buf.readUInt16LE(start+2),rate:buf.readUInt32LE(start+4),align:buf.readUInt16LE(start+12),bits:buf.readUInt16LE(start+14)};}
    if(id==='data')data=buf.subarray(start,start+size);
    off=start+size+(size%2);
  }
  if(!format||!data)throw new Error('Missing WAV fmt/data');
  const {code,channels,rate,align,bits}=format;
  if(!channels||channels>8||!rate||!([1,3].includes(code))||![8,16,24,32].includes(bits)|| (code===3&&bits!==32)||align!==channels*bits/8||data.length%align)throw new Error('Unsupported WAV format');
  const samples=new Float32Array(data.length/align);
  for(let i=0;i<samples.length;i++){
    let sum=0;
    for(let c=0;c<channels;c++){
      const offset=i*align+c*bits/8;
      const value=code===3?data.readFloatLE(offset):bits===8?(data[offset]-128)/128:bits===16?data.readInt16LE(offset)/32768:bits===24?data.readIntLE(offset,3)/8388608:data.readInt32LE(offset)/2147483648;
      if(!Number.isFinite(value))throw new Error('Non-finite WAV sample');
      sum+=value*value; // RMS channels: antiphase stereo must not cancel.
    }
    samples[i]=Math.sqrt(sum/channels);
  }
  return {samples,rate,duration:samples.length/rate};
}
export function analyzeWav(buf,text,{words,phonemes}={}) {
  const {samples,rate,duration}=decodeWav(buf),step=0.02,window=Math.max(1,Math.round(rate*step)),rms=[];
  for(let i=0;i<samples.length;i+=window){let sum=0;for(let j=i;j<Math.min(samples.length,i+window);j++)sum+=samples[j]**2;rms.push(Math.sqrt(sum/Math.min(window,samples.length-i)));}
  const peak=Math.max(0,...rms),gate=Math.max(0.006,peak*0.07);
  const values=rms.map(v=>v<=gate?0:+Math.min(1,Math.sqrt(v/(peak||1))).toFixed(3));
  const active=values.flatMap((v,i)=>v?[i]:[]),tokens=text.trim().split(/\s+/).filter(Boolean);
  const timing=words||tokens.map((text,i)=>{
    const first=active[Math.floor(i*active.length/tokens.length)],last=active[Math.max(0,Math.ceil((i+1)*active.length/tokens.length)-1)];
    return {text,start:first===undefined?0:first*step,end:last===undefined?0:Math.min(duration,(last+1)*step)};
  });
  let end=0;
  for(const w of timing){if(typeof w.text!=='string'||!Number.isFinite(w.start)||!Number.isFinite(w.end)||w.start<end-0.021||w.end<w.start||w.end>duration+0.021)throw new Error('Invalid word timing');end=w.end;}
  const visemes=phonemes?.map(p=>{
    if(!Number.isFinite(p.start)||!Number.isFinite(p.end)||p.start<0||p.end<p.start||p.end>duration+0.021)throw new Error('Invalid phoneme timing');
    return {start:p.start,end:p.end,shape:/^[mbpмбп]$/i.test(p.phoneme)?'closed':/^[ouоуюё]$/i.test(p.phoneme)?'round':'open'};
  });
  return {step,values,words:timing,wordTiming:words?'provided':'energy-estimated',...(visemes?{visemes}: {})};
}
export function analyzeAudio(file,text,metadata={}) {
  if(path.extname(file).toLowerCase()==='.wav')return analyzeWav(fs.readFileSync(file),text,metadata);
  const result=ff(['-i',file,'-f','wav','-ac','1','-ar','16000','-acodec','pcm_s16le','pipe:1'],{encoding:null});
  // ffmpeg piped WAV may advertise unknown RIFF sizes; explicitly materialize data length.
  const buf=Buffer.from(result.stdout);let off=12;
  while(off+8<=buf.length){const size=buf.readUInt32LE(off+4);if(buf.toString('ascii',off,off+4)==='data'){buf.writeUInt32LE(buf.length-off-8,off+4);break;}off+=8+size+(size%2);}
  return analyzeWav(buf,text,metadata);
}
