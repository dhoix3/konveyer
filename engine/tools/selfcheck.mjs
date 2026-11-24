import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {ENGINE,OUTPUT,PROJECTS,FFMPEG,probe,runPython,writeJson} from './lib.mjs';
import {findBrowser} from './browser.mjs';import {zipFolder} from './zip.mjs';
export async function selfcheck({planOnly=false}={}){
 const stamp=new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomBytes(3).toString('hex'),dir=path.join(OUTPUT,'selfcheck-'+stamp);fs.mkdirSync(dir,{recursive:true});
 const report={schemaVersion:1,date:new Date().toISOString(),platform:process.platform,arch:process.arch,node:process.version,steps:[],frames:[],complete:false,unverified:[]};
 const version=(exe,args)=>{try{const r=spawnSync(exe,args,{encoding:'utf8',timeout:15000,windowsHide:true});return {status:r.status,output:(r.stdout||r.stderr||r.error?.message||'').slice(0,8000)};}catch(e){return {status:null,error:e.message};}};
 async function cli(label,args){const t=Date.now(),file=path.join(dir,label+'.log');const result=await new Promise(resolve=>{const fd=fs.openSync(file,'w');const child=spawn(process.execPath,['render.mjs',...args],{cwd:ENGINE,env:{...process.env,REMOTION_ALLOW_BROWSER_DOWNLOAD:'0',WHATIF_OFFLINE:'1'},stdio:['ignore',fd,fd],windowsHide:true});let error;child.on('error',e=>{error=e.message;});child.on('close',(code,signal)=>{fs.closeSync(fd);resolve({code,signal,error});});});report.steps.push({name:label,...result,ms:Date.now()-t});return result.code===0;}
 try{
 try{report.ffmpeg=version(FFMPEG(),['-version']);}catch(e){report.ffmpeg={status:null,error:e.message};}let browser;try{browser=findBrowser();report.chrome=browser?version(browser,['--version']):{status:null,error:'Chrome not found'};}catch(e){report.chrome={status:null,error:e.message};}
 try{report.piper={status:0,output:runPython('tts.py',['--version']).trim()};}catch(e){report.piper={status:1,error:e.message};}
 const healthy=await cli('doctor',['doctor']),id='sc-'+stamp.replace(/[^0-9]/g,'').slice(0,17)+'-'+crypto.randomBytes(3).toString('hex');
 const real=healthy&&!planOnly;const args=['smoke',id,'--extended','--profile'];if(!real)args.push('--plan-only');
 const smoke=await cli('smoke',args);report.projectId=id;report.draftAttempted=real;
 const profile=path.join(OUTPUT,id,'profile');if(fs.existsSync(profile))fs.cpSync(profile,path.join(dir,'timings'),{recursive:true});
 const draft=path.join(OUTPUT,id,'DRAFT.mp4');
 if(real&&smoke&&fs.existsSync(draft)){const duration=probe(draft).duration;for(let i=0;i<8;i++){const t=(i+.5)/8*duration,file=path.join(dir,`draft-${i+1}.png`);const r=spawnSync(FFMPEG(),['-v','error','-ss',String(t),'-i',draft,'-frames:v','1','-threads','1',file],{encoding:'utf8',timeout:60000,windowsHide:true});if(r.status===0&&fs.existsSync(file))report.frames.push({file:path.basename(file),seconds:t});else report.unverified.push('Frame extraction: '+(r.stderr||r.error?.message||r.status));}}
 if(!real)report.unverified.push('Doctor incomplete or --plan-only: no rendered draft, no visual frames, no TTS verification');
 report.complete=healthy&&smoke&&report.frames.length===8;
 if(!report.complete)report.unverified.push('Windows visual review/listening and real rendered timings remain unverified');
 // Copy only named QA artifacts, never user materials, models, environment or tokens.
 for(const name of ['qa_report.json','plan.json']){const f=path.join(PROJECTS,id,name);if(fs.existsSync(f))fs.copyFileSync(f,path.join(dir,name));}
 }catch(e){report.error=e.message;report.unverified.push('Selfcheck interrupted; inspect error and step logs');}
 finally{writeJson(path.join(dir,'selfcheck.json'),report);fs.writeFileSync(path.join(dir,'README.txt'),'Diagnostic bundle; no automatic upload. Check paths/text in logs before sharing.\nComplete='+report.complete+'\n'+report.unverified.join('\n')+'\n');zipFolder(dir,dir+'.zip');}
 console.log(JSON.stringify({directory:dir,zip:dir+'.zip',complete:report.complete,frames:report.frames.length},null,2));return report;
}
