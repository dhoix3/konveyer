// Word-level Whisper ONNX; local cache only by default. Never fabricate missing timestamps.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ff} from './lib.mjs';
import {decodeWav} from './speech-analysis.mjs';
import {checkedWords} from './word-alignment.mjs';
export async function transcribe(wavFile,{language='ru',model=process.env.WHISPER_MODEL_PATH||process.env.WHISPER_MODEL||'Xenova/whisper-tiny',localOnly=true}={}) {
  if(!localOnly)throw new Error('Whisper recognition is offline-only; prepare the model cache separately');
  const {pipeline,env}=await import('@huggingface/transformers');
  // Transformers v4 model-registry preflight may omit local_files_only. Enforce
  // the offline boundary globally as well; Piper downloads are a separate API.
  env.allowRemoteModels=false;
  if(process.env.WHISPER_CACHE_DIR)env.cacheDir=path.resolve(process.env.WHISPER_CACHE_DIR);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'koveyer-whisper-'));
  try {
    const file=path.join(dir,'mono.wav');ff(['-i',wavFile,'-ac','1','-ar','16000','-c:a','pcm_s16le',file]);
    const buf=fs.readFileSync(file),{duration}=decodeWav(buf);
    // Preserve signed PCM for ASR (RMS decoder returns absolute channel energy).
    let off=12,start,size;
    while(off+8<=buf.length){size=buf.readUInt32LE(off+4);if(buf.toString('ascii',off,off+4)==='data'){start=off+8;break;}off+=8+size+(size%2);}
    if(start===undefined)throw new Error('Whisper PCM data missing');
    const pcm=Float32Array.from({length:size/2},(_,i)=>buf.readInt16LE(start+i*2)/32768);
    const asr=await pipeline('automatic-speech-recognition',model,{dtype:'q8',local_files_only:localOnly});
    try {
      const out=await asr(pcm,{language:language==='ru'?'russian':'english',task:'transcribe',return_timestamps:'word',chunk_length_s:30,stride_length_s:5});
      const words=checkedWords((out.chunks||[]).map(c=>({text:c.text,start:c.timestamp?.[0],end:c.timestamp?.[1]})),duration);
      return {text:out.text,words,model};
    }finally{await asr.dispose?.();}
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
