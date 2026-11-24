import fs from 'node:fs';
import path from 'node:path';
import {projectDir,writeJson} from './lib.mjs';
const stamp=(n,comma=false)=>{const ms=Math.round(n*1000),h=Math.floor(ms/3600000),m=Math.floor(ms/60000)%60,s=Math.floor(ms/1000)%60;return [h,m,s].map(v=>String(v).padStart(2,'0')).join(':')+(comma?',':'.')+String(ms%1000).padStart(3,'0');};
const assTime=n=>`${Math.floor(n/3600)}:${stamp(n).slice(3,-1)}`;
const wrap=(text,width)=>{
  const lines=[''];for(const word of text.split(/\s+/)){if(lines.at(-1).length+word.length+1>width&&lines.at(-1))lines.push(word);else lines[lines.length-1]+=(lines.at(-1)?' ':'')+word;}return lines;
};
export function subtitleCues(plan,{maxChars=42,maxLines=2,maxCps=22}={}) {
  const cues=[],warnings=[];
  for(const s of plan.scenes)for(const l of s.lines){
    let words=l.speech?.words?.filter(w=>w.end>w.start);
    // ASR provides times, never new documentary dialogue/facts for publication.
    if(words?.length && l.speech.wordTiming==='aligned') {
      const authored=l.text[plan.language].trim().split(/\s+/);
      words=authored.length===words.length?words.map((w,i)=>({...w,text:authored[i]})):[{text:l.text[plan.language],start:words[0].start,end:words.at(-1).end}];
    }
    const chunks=[];
    if(words?.length){
      let group=[];
      for(const w of words){if(group.length && (group.map(w=>w.text).join(' ').length+w.text.length+1>maxChars*maxLines || w.start-group.at(-1).end>0.6)){chunks.push(group);group=[];}group.push(w);}if(group.length)chunks.push(group);
    }
    const parts=chunks.length?chunks.map(g=>({text:g.map(w=>w.text).join(' '),start:s.startSec+l.sceneStart+g[0].start,end:s.startSec+l.sceneStart+g.at(-1).end})):[{text:l.text[plan.language],start:s.startSec+l.sceneStart,end:s.startSec+l.sceneEnd}];
    for(const part of parts){const lines=wrap(part.text,maxChars);const cps=part.text.length/Math.max(0.001,part.end-part.start);if(lines.length>maxLines||lines.some(l=>l.length>maxChars))warnings.push(`${l.id}: subtitle overflow`);if(cps>maxCps)warnings.push(`${l.id}: reading speed ${cps.toFixed(1)} cps > ${maxCps}`);cues.push({...part,text:lines.join('\n'),timing:l.speech?.wordTiming||'estimated'});}
  }
  const errors=[];let prev=0;
  for(const c of cues){if(c.start<prev-0.001 || c.end<=c.start || c.end>plan.totalSec+0.01)errors.push('overlapping/invalid subtitle time');prev=c.end;}
  return {cues,errors,warnings};
}
export function exportSubtitles(id,plan) {
  const report=subtitleCues(plan),dir=path.join(projectDir(id),'subtitles');fs.mkdirSync(dir,{recursive:true});
  const plain=t=>t.replace(/[<>]/g,'');
  fs.writeFileSync(path.join(dir,'captions.srt'),report.cues.map((c,i)=>`${i+1}\n${stamp(c.start,true)} --> ${stamp(c.end,true)}\n${plain(c.text)}\n`).join('\n'));
  fs.writeFileSync(path.join(dir,'captions.vtt'),'WEBVTT\n\n'+report.cues.map(c=>`${stamp(c.start)} --> ${stamp(c.end)}\n${plain(c.text)}\n`).join('\n'));
  const escapeASS=t=>t.replace(/[{}\\]/g,'').replace(/\n/g,'\\N');
  fs.writeFileSync(path.join(dir,'captions.ass'),`[Script Info]\nScriptType: v4.00+\nPlayResX: ${plan.width}\nPlayResY: ${plan.height}\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Arial,${Math.round(Math.min(plan.width,plan.height)*0.04)},&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,1,2,${Math.round(plan.width*.08)},${Math.round(plan.width*.08)},${Math.round(plan.height*.12)},1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`+report.cues.map(c=>`Dialogue: 0,${assTime(c.start)},${assTime(c.end)},Default,,0,0,0,,${escapeASS(c.text)}`).join('\n')+'\n');
  writeJson(path.join(dir,'qa.json'),report);return report;
}
