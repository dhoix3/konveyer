// Durable per-file replacement + bounded pre-image history. No dependency on lib.mjs.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export const SCHEMA_VERSION=2;
export function migrateDocument(value) {
  if(!value || typeof value!=='object' || Array.isArray(value))throw new Error('Invalid document: expected object');
  const version=value.schemaVersion ?? 1;
  if(!Number.isInteger(version) || version<1 || version>SCHEMA_VERSION)throw new Error(`Unsupported schemaVersion ${version}`);
  // V1 -> V2 is additive; all old fields and nested production schemas survive.
  return {...value,schemaVersion:SCHEMA_VERSION};
}
const protectedName=file=>['project.json','plan.json'].includes(path.basename(file));
function durableFile(file,bytes) {
  const fd=fs.openSync(file,'wx',0o600);
  try {fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
}
export function atomicJson(file,value,{historyLimit=20}={}) {
  const dir=path.dirname(file);fs.mkdirSync(dir,{recursive:true});
  const data=protectedName(file)?migrateDocument(value):value;
  const bytes=JSON.stringify(data,null,2);
  if(bytes===undefined)throw new Error('Cannot serialize undefined JSON');
  const tmp=path.join(dir,`.${path.basename(file)}.${process.pid}.${crypto.randomUUID()}.tmp`);
  try {
    durableFile(tmp,bytes);
    if(protectedName(file) && fs.existsSync(file)) {
      const history=path.join(dir,'history');fs.mkdirSync(history,{recursive:true});
      const prefix=path.basename(file,'.json');
      // Preserve even corrupt old bytes: restore never silently replaces evidence.
      durableFile(path.join(history,`${prefix}-${Date.now()}-${crypto.randomUUID()}.json`),fs.readFileSync(file));
    }
    fs.renameSync(tmp,file);
    // Sync directory entries where supported. Windows does not permit opening dirs.
    if(process.platform!=='win32') {
      const fd=fs.openSync(dir,'r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
    }
    if(protectedName(file)) {
      const prefix=path.basename(file,'.json')+'-';
      const snapshots=listHistory(dir).filter(x=>x.file.startsWith(prefix));
      for(const stale of snapshots.slice(historyLimit))fs.unlinkSync(path.join(dir,'history',stale.file));
    }
  } finally {
    try{fs.unlinkSync(tmp);}catch(e){if(e.code!=='ENOENT')console.error('temporary JSON cleanup:',e.message);}
  }
}
export function listHistory(dir) {
  const history=path.join(dir,'history');
  if(!fs.existsSync(history))return [];
  return fs.readdirSync(history).filter(f=>/^(project|plan)-\d+-[a-f0-9-]+\.json$/.test(f)).map(file=>{
    const info=fs.statSync(path.join(history,file));return {file,type:file.startsWith('project-')?'project':'plan',mtime:info.mtimeMs,size:info.size};
  }).sort((a,b)=>b.mtime-a.mtime || b.file.localeCompare(a.file));
}
export function restoreSnapshot(dir,snapshot) {
  const item=listHistory(dir).find(x=>x.file===snapshot);
  if(!item)throw new Error('Snapshot not found or invalid name');
  const value=migrateDocument(JSON.parse(fs.readFileSync(path.join(dir,'history',item.file),'utf8')));
  if(value.id!==path.basename(dir) || !Array.isArray(value.scenes))throw new Error('Snapshot belongs to another project or is invalid');
  atomicJson(path.join(dir,`${item.type}.json`),value);
  return item.type;
}
