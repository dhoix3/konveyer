// Measurement only. No renderer defaults or caches changed.
import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
export class Profile {
 constructor(dir){this.dir=dir;this.started=performance.now();this.data={schemaVersion:1,startedAt:new Date().toISOString(),stages:[],scenes:[],frames:[],memory:{nodePeakRSSBytes:0,treePeakRSSBytes:null,samples:0,scope:'Node maxRSS; sampled process-tree RSS (shared pages may be counted twice); not system commit'},errors:[]};this.sample();this.timer=setInterval(()=>this.sample(),750);this.timer.unref();}
 sample(){if(!this.pending)this.pending=this.collect().finally(()=>{this.pending=null;});return this.pending;}
 async collect(){this.data.memory.nodePeakRSSBytes=Math.max(this.data.memory.nodePeakRSSBytes,process.resourceUsage().maxRSS*1024,process.memoryUsage().rss);try{
 const win=process.platform==='win32';const {stdout}=await exec(win?'powershell.exe':'ps',win?['-NoProfile','-Command','Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,WorkingSetSize | ConvertTo-Json -Compress']:['-eo','pid=,ppid=,rss='],{timeout:5000,maxBuffer:4*1024*1024,windowsHide:true});
 const rows=win?[].concat(JSON.parse(stdout)).map(p=>[Number(p.ProcessId),Number(p.ParentProcessId),Number(p.WorkingSetSize)]):stdout.trim().split('\n').map(l=>l.trim().split(/\s+/).map(Number)).map(([pid,ppid,kb])=>[pid,ppid,kb*1024]);
 const ids=new Set([process.pid]);let n;do{n=ids.size;for(const [pid,ppid]of rows)if(ids.has(ppid))ids.add(pid);}while(n!==ids.size);
 const bytes=rows.reduce((s,[pid,,rss])=>s+(ids.has(pid)?rss:0),0);this.data.memory.treePeakRSSBytes=Math.max(this.data.memory.treePeakRSSBytes||0,bytes);this.data.memory.samples++;
 }catch(e){this.data.memory.samplingError=e.message;}}
 async stage(name,fn){const t=performance.now(),row={name,status:'running'};this.data.stages.push(row);try{const r=await fn();row.status='ok';return r;}catch(e){row.status='failed';row.error=e.message;throw e;}finally{row.ms=performance.now()-t;}}
 async frame(scene,frame,fn){const t=performance.now(),row={scene,frame,status:'running',basis:'renderStill wall time, includes capture/IO; warm browser not guaranteed'};this.data.frames.push(row);try{const r=await fn();row.status='ok';return r;}catch(e){row.status='failed';row.error=e.message;throw e;}finally{row.ms=performance.now()-t;}}
 async finish(error){clearInterval(this.timer);if(error)this.data.errors.push(error.message);await this.sample();this.data.elapsedMs=performance.now()-this.started;
 const f=this.data.frames.filter(f=>f.status==='ok'&&f.ms>0);this.data.estimate=f.length&&this.totalFrames?{filmFrames:this.totalFrames,sampledFrames:f.length,renderMs:f.reduce((s,f)=>s+f.ms,0)/f.length*this.totalFrames,basis:'stratified still sample extrapolation; excludes TTS/mix/encode; not a completion promise'}:null;
 const scenes=this.data.scenes.filter(s=>!s.sampled&&s.frames>0&&s.ms>=0);if(!this.data.estimate&&scenes.length&&this.totalFrames)this.data.estimate={filmFrames:this.totalFrames,measuredFrames:scenes.reduce((n,s)=>n+s.frames,0),renderMs:scenes.reduce((n,s)=>n+s.ms,0)/scenes.reduce((n,s)=>n+s.frames,0)*this.totalFrames,basis:'measured scene render+encode wall time extrapolation; excludes other stages; cached scenes are not measured'};
 fs.mkdirSync(this.dir,{recursive:true});fs.writeFileSync(path.join(this.dir,'profile.json'),JSON.stringify(this.data,null,2)+'\n');
 const rows=[...this.data.stages].sort((a,b)=>b.ms-a.ms);fs.writeFileSync(path.join(this.dir,'WHERE-TIME-GOES.md'),`# Где тратится время\n\nMeasured wall: ${(this.data.elapsedMs/1000).toFixed(3)} s. Nested stages overlap; do not sum.\n\n${rows.map(r=>`- ${r.name}: ${r.ms.toFixed(2)} ms (${r.status})`).join('\n')}\n\nScenes: ${JSON.stringify(this.data.scenes)}\n\nMemory: ${JSON.stringify(this.data.memory)}\n\nEstimate: ${JSON.stringify(this.data.estimate)}\n\nErrors: ${this.data.errors.join('; ')||'none'}\nNo static-layer prerender or unverified optimization enabled.\n`);}
}
