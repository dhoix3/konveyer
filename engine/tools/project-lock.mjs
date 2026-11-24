// Canonical locks live outside project directories, allowing atomic directory publication.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {ensure, projectDir, PROJECTS} from './lib.mjs';
function liveOwner(file) {
  const owner=JSON.parse(fs.readFileSync(file,'utf8'));
  if(!Number.isInteger(owner.pid) || owner.pid<=0)throw new Error(`Invalid lock: ${file}`);
  try {process.kill(owner.pid,0);return owner;}
  catch(e){if(e.code==='ESRCH')return null;throw e;}
}
export function lockProject(id,{createDir=true}={}) {
  const dir=projectDir(id),legacy=path.join(dir,'.pipeline.lock');
  const guard=path.join(ensure(path.join(PROJECTS,'.locks')),`${id}.acquiring`);
  try{fs.mkdirSync(guard);}catch(e){
    if(e.code==='EEXIST')throw new Error(`Lock acquisition in progress: ${id}; if a process crashed during acquisition, inspect and remove ${guard} only after stopping all project processes`);
    throw e;
  }
  try {
  // Honor locks made by older CLI versions; never bypass a live legacy owner.
  if(fs.existsSync(legacy)) {
    if(liveOwner(legacy))throw new Error(`Проект ${id} уже выполняется (legacy lock)`);
    fs.unlinkSync(legacy);
  }
  const file=path.join(ensure(path.join(PROJECTS,'.locks')),`${id}.json`);
  for(let attempt=0;attempt<3;attempt++) {
    const token=crypto.randomUUID();
    try {
      fs.writeFileSync(file,JSON.stringify({pid:process.pid,token,at:new Date().toISOString()}),{flag:'wx'});
      if(createDir)ensure(dir);
      return ()=>{try{if(JSON.parse(fs.readFileSync(file,'utf8')).token===token)fs.unlinkSync(file);}catch(e){if(e.code!=='ENOENT')console.error('lock cleanup:',e.message);}};
    } catch(e) {
      if(e.code!=='EEXIST')throw e;
      let owner;try{owner=liveOwner(file);}catch(err){if(err.code==='ENOENT')continue;throw err;}
      if(owner)throw new Error(`Проект ${id} уже выполняется (PID ${owner.pid})`);
      try{fs.unlinkSync(file);}catch(err){if(err.code!=='ENOENT')throw err;}
    }
  }
  throw new Error(`Cannot acquire project lock: ${id}`);
  } finally {fs.rmdirSync(guard);}
}
