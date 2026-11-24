import path from 'node:path';
import {projectDir,writeJson} from './lib.mjs';
const tokens=s=>String(s).toLowerCase().replaceAll('ё','е').match(/[\p{L}\p{N}]+/gu)||[];
export function checkedWords(words,duration) {
  let end=0;
  if(!Array.isArray(words)||!words.length)throw new Error('Whisper returned no word timestamps');
  return words.map(w=>{
    if(typeof w.text!=='string'||!w.text.trim()||!Number.isFinite(w.start)||!Number.isFinite(w.end)||w.start<end-.001||w.end<=w.start||w.start<0||w.end>duration+.025)throw new Error('Invalid Whisper word timestamps');
    end=w.end;return {text:w.text.trim(),start:w.start,end:w.end};
  });
}
export function clipWords(words,start,end) {
  return words.filter(w=>w.start>=start&&w.end<=end).map(w=>({...w,start:+(w.start-start).toFixed(6),end:+(w.end-start).toFixed(6)}));
}
export async function alignManifest(id,project,manifest,log,{transcriber,disabled=false}={}) {
  if(manifest.source==='none')return manifest;
  const rows=[];let unavailable=false;
  for(const line of project.scenes.flatMap(s=>s.lines)) {
    const m=manifest.lines[line.id];if(!m)continue;
    if(m.wordTiming==='aligned'&&m.words?.length){rows.push({line:line.id,status:'aligned'});continue;}
    m.wordTiming='energy-estimated';delete m.words;
    if(!disabled&&!unavailable)try {
      const transcribe=transcriber||(await import('./whisper.mjs')).transcribe;
      const tr=await transcribe(path.resolve(projectDir(id),m.file),{language:project.language,localOnly:true});
      const words=checkedWords(tr.words,m.dur),script=tokens(line.text[project.language]),recognised=tokens(words.map(w=>w.text).join(' '));
      const matches=script.filter(t=>recognised.includes(t)).length;
      if(!script.length||matches/script.length<.65)throw new Error('Whisper/script mismatch; not marked aligned');
      m.words=words;m.wordTiming='aligned';m.alignmentModel=tr.model;
    } catch(e){m.alignmentWarning=String(e.message).slice(0,240);log.warn(`word alignment ${line.id}: ${m.alignmentWarning}; energy-estimated fallback`);if(!transcriber)unavailable=true;}
    rows.push({line:line.id,status:m.wordTiming,warning:m.alignmentWarning||(disabled?'Whisper disabled':unavailable?'Whisper unavailable':undefined)});
  }
  manifest.alignment={aligned:rows.filter(r=>r.status==='aligned').length,energyEstimated:rows.filter(r=>r.status==='energy-estimated').length,lines:rows};
  writeJson(path.join(projectDir(id),'voice','manifest.json'),manifest);
  writeJson(path.join(projectDir(id),'alignment-report.json'),manifest.alignment);
  return manifest;
}
