// Explicit, non-installing machine setup. Never touches models or virtual environments.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ENGINE,python,writeJson,readJson} from './lib.mjs';
import {findBrowser} from './browser.mjs';
const file=path.join(ENGINE,'local-environment.json');
export function applyLocalEnvironment() {
  if(!fs.existsSync(file))return;
  const config=readJson(file);
  for(const [name,value] of Object.entries(config)) {
    if(!['WHATIF_PYTHON','REMOTION_BROWSER_EXECUTABLE'].includes(name))continue;
    if(!process.env[name] && typeof value==='string' && path.isAbsolute(value) && fs.existsSync(value))process.env[name]=value;
  }
}
export function fixEnvironment(log=console.log) {
  const config={};
  try {
    const result=spawnSync(python(),['-c','import sys; print(sys.executable)'],{encoding:'utf8',windowsHide:true,timeout:10000});
    const p=result.stdout?.trim();if(result.status===0 && path.isAbsolute(p) && fs.existsSync(p))config.WHATIF_PYTHON=p;
    else log(`Python detection failed: ${result.error?.message || result.stderr}`);
  }catch(e){log(e.message);}
  try {const chrome=findBrowser();if(chrome)config.REMOTION_BROWSER_EXECUTABLE=chrome;}catch(e){log(e.message);}
  if(Object.keys(config).length) {
    writeJson(file,config);applyLocalEnvironment();log(`Saved detected paths: ${file}`);
  }
  log('No packages, browsers or models installed. Missing dependencies require manual setup.');
  return config;
}
