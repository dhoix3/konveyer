// Local regressions: no TTS/model downloads or media rendering required.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {buildProject, pickTemplate} from '../tools/script.mjs';
import {buildPlan} from '../tools/timeline.mjs';
import {qaPlan, parsePropKinds} from '../tools/qa.mjs';
import {ENGINE, projectDir} from '../tools/lib.mjs';
const source = fs.readFileSync(path.join(ENGINE, 'src/char/props.tsx'), 'utf8');
const kinds = parsePropKinds(source);
assert.equal(kinds.size, 34);
assert.deepEqual(parsePropKinds(source.replace(/\r?\n/g, '\r\n')), kinds);
assert.throws(() => parsePropKinds(''), /PROPS/);
const topics = ['динозавры вернулись в современный мир', 'что если не спать неделю?', 'что если гравитация исчезнет?', 'что если пропадёт интернет?', 'what if the ocean boiled?', 'what if cats ruled the world?'];
for (const topic of ['интернет стал быстрее', 'гравитация усилилась', 'люди спят вечно', 'кошки правят миром']) {
  assert.equal(pickTemplate(topic, 'body'), null, topic);
}
let count = 0;
for (const topic of topics) for (const duration of [25, 30, 45, 90, 180]) {
  const id = `reg-local-${count++}`;
  const dir = projectDir(id);
  assert.ok(!fs.existsSync(dir), `test directory already exists: ${dir}`);
  fs.mkdirSync(dir, {recursive:true});
  try {
    const language = topic.startsWith('what') ? 'en' : 'ru';
    const p = buildProject({id, topic, duration, language});
    fs.writeFileSync(path.join(dir, 'project.json'), JSON.stringify(p));
    const plan = buildPlan(id);
    const result = qaPlan(id, plan);
    assert.deepEqual(result.errors, [], `${topic}/${duration}`);
    assert.ok(Math.abs(plan.totalSec - duration) / duration <= 0.055, `${topic}/${duration}: ${plan.totalSec}`);
    if (topic.startsWith('динозавры')) {
      const narration = p.scenes.flatMap(s=>s.lines.map(l=>l.text.ru)).join(' ');
      assert.match(narration, /Динозавры выходят/);
      assert.match(narration, /заповедники/);
      assert.equal(p.idea.template, 'freeform');
    }
    if (count === 1) {
      const all = structuredClone(plan);
      all.scenes[0].props = [...kinds].map((kind,i)=>({id:`prop${i}`, kind, x:300, on:'floor'}));
      // Remove original references; isolate kind validation from staging.
      all.scenes[0].beats = [];
      all.scenes[0].shots = [{t:0,type:'wide'}];
      assert.ok(!qaPlan(id, all).errors.some(e=>e.includes('unknown kind')));
      all.scenes[0].props[0].kind = 'invalid-test-kind';
      assert.ok(qaPlan(id, all).errors.some(e=>e.includes('unknown kind invalid-test-kind')));
    }
    console.log(`PASS ${language}/${duration}: ${plan.totalSec.toFixed(2)}s ${topic}`);
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
}
console.log(`PASS: ${count} plans, 34 props, CRLF, invalid-kind rejection`);
