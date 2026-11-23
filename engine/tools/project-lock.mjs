// Cross-process lock: GUI and CLI must not write the same project concurrently.
import fs from 'node:fs';
import path from 'node:path';
import {ensure, projectDir} from './lib.mjs';
export function lockProject(id) {
  const file = path.join(ensure(projectDir(id)), '.pipeline.lock');
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      fs.writeFileSync(file, JSON.stringify({pid:process.pid, at:new Date().toISOString()}), {flag:'wx'});
      return () => {
        try {
          if (JSON.parse(fs.readFileSync(file, 'utf8')).pid === process.pid) fs.unlinkSync(file);
        } catch (e) { if (e.code !== 'ENOENT') console.error(`lock cleanup: ${e.message}`); }
      };
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      let owner;
      try { owner = JSON.parse(fs.readFileSync(file,'utf8')); }
      catch { throw new Error(`Нечитаемый lock ${file}. Убедитесь, что проект не запущен, перед ручным удалением lock.`); }
      if (!Number.isInteger(owner.pid) || owner.pid <= 0) throw new Error(`Invalid lock: ${file}`);
      try { process.kill(owner.pid, 0); }
      catch (err) {
        if (err.code === 'ESRCH') { fs.unlinkSync(file); continue; }
        throw err;
      }
      throw new Error(`Проект ${id} уже выполняется (PID ${owner.pid})`);
    }
  }
  throw new Error(`Не удалось захватить lock проекта ${id}`);
}
