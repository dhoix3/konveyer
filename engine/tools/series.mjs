import fs from 'node:fs';
import path from 'node:path';
import {projectDir, writeJson, readJson, markStage} from './lib.mjs';
import {lockProject} from './project-lock.mjs';
import {buildSeason, buildProduction} from './production.mjs';
import {estimateLine} from './script.mjs';

// Build everything before the first write; refuse existing episode IDs.
// Parent lock is held by the caller (CLI new/episode).
export function createSeason(opts) {
  const built=buildSeason(opts,{estimateLine});
  const releases=[];
  try {
    for (const p of built.projects) {
      releases.push(lockProject(p.id));
      if (fs.existsSync(path.join(projectDir(p.id),'project.json'))) throw new Error(`episode exists: ${p.id}`);
    }
    for (const p of built.projects) saveEpisode(p);
    writeJson(path.join(projectDir(opts.id),'project.json'),built.season);
    writeJson(path.join(projectDir(opts.id),'series.json'),built.season.production);
    return built.season;
  } finally {releases.reverse().forEach(fn=>fn());}
}
function saveEpisode(p) {
  writeJson(path.join(projectDir(p.id),'project.json'),p);
  writeJson(path.join(projectDir(p.id),'state.json'),{stages:{},scenes:{}});
  markStage(p.id,'script','done');
}
export function regenerateEpisode(id, number, force) {
  const season=readJson(path.join(projectDir(id),'project.json'));
  if (season.production?.kind!=='season') throw new Error('not a season container');
  const entry=season.production.episodes[number-1];
  if (!Number.isInteger(number) || !entry) throw new Error('invalid episode number');
  const unlock=lockProject(entry.id);
  try {
    if(!force && fs.existsSync(path.join(projectDir(entry.id),'project.json'))) throw new Error('episode exists: use --force explicitly');
    const p=buildProduction({...season.production.brief,id:entry.id,name:`${season.production.brief.name} · ${number}`,context:entry.context},{estimateLine});
    p.production.seriesId=id; p.production.context=entry.context; p.production.outcome=entry.outcome;
    p.production.characterHistory=p.characters.map(c=>({id:c.id,role:c.productionRole,events:[...entry.context.events,{episode:number,event:entry.outcome}]}));
    saveEpisode(p);
    return p;
  } finally {unlock();}
}
