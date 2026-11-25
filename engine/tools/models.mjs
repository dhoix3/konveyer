import fs from 'node:fs';import path from 'node:path';
import {ENGINE} from './lib.mjs';
export const WHISPER_FILES=['config.json','generation_config.json','preprocessor_config.json','tokenizer.json','tokenizer_config.json','vocab.json','merges.txt','normalizer.json','added_tokens.json','special_tokens_map.json','onnx/encoder_model_quantized.onnx','onnx/decoder_model_merged_quantized.onnx'];
export const whisperDir=()=>path.join(ENGINE,'models','whisper-tiny');
export function validModelFile(file,name=file){
 try{const stat=fs.statSync(file);if(!stat.isFile()||stat.size<(name.endsWith('.onnx')?1024:2))return false;
 if(name.endsWith('.json')){const v=JSON.parse(fs.readFileSync(file,'utf8'));return !!v&&typeof v==='object';}return true;}catch{return false;}
}
export function whisperStatus(dir=process.env.WHISPER_MODEL_PATH||whisperDir()){
 const required=['config.json','preprocessor_config.json','tokenizer.json','tokenizer_config.json','onnx/encoder_model_quantized.onnx','onnx/decoder_model_merged_quantized.onnx'];
 const missing=required.filter(f=>!validModelFile(path.join(dir,f)));
 return {directory:dir,ready:missing.length===0,missing,status:missing.length?'energy-estimated':'local-assets-ready (aligned only after valid inference)',action:'node render.mjs models fetch whisper-tiny --allow-download OR copy local files; see docs/FIXES_1.md'};
}
export async function fetchWhisper({allowDownload=false,fetchImpl=fetch,directory=whisperDir()}={}){
 if(!allowDownload)throw new Error('Download permission required: network + ~75–150 MB local storage. Re-run: models fetch whisper-tiny --allow-download. Nothing downloaded.');
 if(process.env.WHATIF_OFFLINE==='1')throw new Error('WHATIF_OFFLINE=1 forbids model download');
 // Explicit preparation only, never called by transcription/doctor/render.
 const base='https://huggingface.co/Xenova/whisper-tiny/resolve/main/';fs.mkdirSync(directory,{recursive:true});
 for(const f of WHISPER_FILES){const dest=path.join(directory,f);if(validModelFile(dest))continue;const res=await fetchImpl(base+f,{signal:AbortSignal.timeout(180000)});
 if(res.status===404&&!['config.json','preprocessor_config.json','tokenizer.json','tokenizer_config.json',...WHISPER_FILES.filter(f=>f.endsWith('.onnx'))].includes(f))continue;
 if(!res.ok)throw new Error(`Model ${f}: HTTP ${res.status}`);fs.mkdirSync(path.dirname(dest),{recursive:true});const temp=dest+'.'+process.pid+'-'+Date.now()+'.download';
 try{const {Readable}=await import('node:stream');const {pipeline}=await import('node:stream/promises');await pipeline(Readable.fromWeb(res.body),fs.createWriteStream(temp,{flags:'wx'}));if(!validModelFile(temp,f))throw new Error(`Invalid model asset: ${f}`);fs.renameSync(temp,dest);}catch(e){if(fs.existsSync(temp))fs.unlinkSync(temp);throw e;}
 }
 const status=whisperStatus(directory);if(!status.ready)throw new Error('Incomplete model: '+status.missing.join(', '));return status;
}
