import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {PROJECTS, projectDir, writeJson, readJson, sha1, ensure} from './lib.mjs';
import {lockProject} from './project-lock.mjs';
import {buildSeason, buildProduction} from './production.mjs';
import {estimateLine} from './script.mjs';
const journalFile=id=>path.join(projectDir(id),'season-transaction.json');
const digest=file=>sha1(fs.readFileSync(file,'utf8'));
// Parent lock must be held. Journal is published only after every staged file is durable.
export function createSeason(opts,{afterPublish}={}) {
  const restored=recoverSeason(opts.id,{afterPublish});if(restored)return restored;
  const built=buildSeason(opts,{estimateLine}),releases=[];
  const staging=ensure(path.join(PROJECTS,'.transactions',crypto.randomUUID()));
  try {
    for(const p of built.projects) {
      releases.push(lockProject(p.id,{createDir:false}));
      if(fs.existsSync(projectDir(p.id)))throw new Error(`episode exists: ${p.id}`);
      saveEpisode(p,path.join(staging,p.id));
    }
    const parent=ensure(path.join(staging,opts.id));
    writeJson(path.join(parent,'series.json'),built.season.production);
    writeJson(path.join(parent,'project.json'),built.season);
    const entries=[...built.projects,built.season].map(p=>({id:p.id,hash:digest(path.join(staging,p.id,'project.json'))}));
    writeJson(journalFile(opts.id),{schemaVersion:1,id:opts.id,staging:path.basename(staging),entries});
  } finally {releases.reverse().forEach(fn=>fn());}
  return recoverSeason(opts.id,{afterPublish});
}
export function recoverSeason(id,{afterPublish}={}) {
  const file=journalFile(id);if(!fs.existsSync(file))return null;
  const journal=readJson(file);
  if(journal.id!==id || !/^[a-f0-9-]{36}$/.test(journal.staging) || !Array.isArray(journal.entries) || journal.entries.at(-1)?.id!==id)throw new Error('Invalid season recovery journal');
  const staging=path.join(PROJECTS,'.transactions',journal.staging),releases=[];
  try {
    const seen=new Set();
    for(const entry of journal.entries) {
      if(seen.has(entry.id) || (entry.id!==id && !new RegExp(`^${id}-e[0-9]{2}$`).test(entry.id)))throw new Error('Invalid journal episode id');
      seen.add(entry.id);projectDir(entry.id);
      if(entry.id!==id)releases.push(lockProject(entry.id,{createDir:false}));
      const dest=path.join(projectDir(entry.id),'project.json');
      const source=path.join(staging,entry.id,'project.json');
      if(fs.existsSync(dest)) {if(digest(dest)!==entry.hash)throw new Error(`Recovery conflict: ${entry.id}; existing data preserved`);}
      else if(!fs.existsSync(source) || digest(source)!==entry.hash)throw new Error(`Recovery staging missing or corrupt: ${entry.id}`);
    }
    for(const [i,entry] of journal.entries.entries()) {
      const dest=projectDir(entry.id),source=path.join(staging,entry.id);
      if(entry.id===id) {
        if(!fs.existsSync(path.join(dest,'project.json'))) {
          const seriesSource=path.join(source,'series.json'),seriesDest=path.join(dest,'series.json');
          if(fs.existsSync(seriesSource))fs.renameSync(seriesSource,seriesDest);
          else if(!fs.existsSync(seriesDest) || sha1(readJson(seriesDest))!==sha1(readJson(path.join(source,'project.json')).production))throw new Error('Recovery series metadata conflict');
          fs.renameSync(path.join(source,'project.json'),path.join(dest,'project.json'));
        }
      } else if(!fs.existsSync(dest))fs.renameSync(source,dest);
      afterPublish?.(i,entry.id);
    }
    const season=readJson(path.join(projectDir(id),'project.json'));
    fs.unlinkSync(file); // commit record removed last; retry before this point is idempotent.
    // All content has moved. Only our transaction staging may be removed.
    fs.rmSync(staging,{recursive:true,force:true});
    return season;
  } finally {releases.reverse().forEach(fn=>fn());}
}
export function recoverAllSeasons() {
  if(!fs.existsSync(PROJECTS))return;
  for(const id of fs.readdirSync(PROJECTS)) {
    if(!/^[a-z0-9][a-z0-9_-]{0,39}$/i.test(id) || !fs.existsSync(journalFile(id)))continue;
    let unlock;
    try{unlock=lockProject(id);recoverSeason(id);}
    catch(e){console.error(`season recovery ${id}: ${e.message}`);}
    finally{unlock?.();}
  }
}
function saveEpisode(p,dir=projectDir(p.id)) {
  writeJson(path.join(dir,'project.json'),p);
  writeJson(path.join(dir,'state.json'),{stages:{script:{status:'done',at:new Date().toISOString()}},scenes:{}});
}
function outcome(p,entry) {
  return p.production?.outcome!==entry.outcome ? p.production?.outcome : p.scenes.at(-1)?.lines.at(-1)?.text[p.language] || entry.outcome;
}
// Parent lock required. Store staleness, never silently rewrite later contexts.
export function refreshSeasonContexts(id) {
  const season=readJson(path.join(projectDir(id),'project.json'));
  if(season.production?.kind!=='season')throw new Error('not a season container');
  let dirty=false;
  const entries=season.production.episodes;
  entries.forEach((entry,i)=>{
    const current=outcome(readJson(path.join(projectDir(entry.id),'project.json')),entry);
    if(current!==(entry.observedOutcome ?? entry.outcome)) {
      entry.observedOutcome=current;dirty=true;
      for(const later of entries.slice(i+1)){later.stale=true;later.staleReason=`Outcome changed: ${entry.id}; explicitly regenerate episode context`;}
    }
  });
  if(dirty){writeJson(path.join(projectDir(id),'project.json'),season);writeJson(path.join(projectDir(id),'series.json'),season.production);}
  return season;
}
export function assertSeriesContext(project) {
  const id=project.production?.seriesId;if(!id)return;
  const unlock=lockProject(id);
  try {
    const season=refreshSeasonContexts(id);
    if(season.production.episodes.find(e=>e.id===project.id)?.stale)throw new Error(`Stale episode context: ${project.id}. Recreate this episode explicitly with episode ${id} --episode N --force.`);
  } finally {unlock();}
}
export function regenerateEpisode(id,number,force) {
  const season=refreshSeasonContexts(id),entries=season.production.episodes,entry=entries[number-1];
  if(!Number.isInteger(number) || !entry)throw new Error('invalid episode number');
  const unlock=lockProject(entry.id);
  try {
    if(!force && fs.existsSync(path.join(projectDir(entry.id),'project.json')))throw new Error('episode exists: use --force explicitly');
    const events=entries.slice(0,number-1).map((e,i)=>({episode:i+1,event:e.observedOutcome ?? e.outcome}));
    const context={...entry.context,events,previousOutcome:events.at(-1)?.event || null};
    const p=buildProduction({...season.production.brief,id:entry.id,name:`${season.production.brief.name} · ${number}`,context},{estimateLine});
    p.production.seriesId=id;p.production.context=context;p.production.outcome=entry.outcome;
    p.production.characterHistory=p.characters.map(c=>({id:c.id,role:c.productionRole,events:[...events,{episode:number,event:entry.outcome}]}));
    saveEpisode(p);entry.context=context;entry.stale=false;delete entry.staleReason;entry.observedOutcome=entry.outcome;
    writeJson(path.join(projectDir(id),'project.json'),season);writeJson(path.join(projectDir(id),'series.json'),season.production);
    return p;
  } finally {unlock();}
}
