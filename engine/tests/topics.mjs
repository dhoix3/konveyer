// Topic matrix test: arbitrary free-text topics must produce a story that
// reflects the topic, passes plan QA, and bad inputs must be rejected.
//
//   node tests/topics.mjs            run all cases (projects kept in ../projects/)
//   node tests/topics.mjs --cleanup  delete this test's projects afterwards
//
// Exit code 0 = all passed.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const ENGINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECTS = path.resolve(ENGINE, '..', 'projects');
const RENDER = path.join(ENGINE, 'render.mjs');
const KEEP = !process.argv.includes('--cleanup');

const CASES = [
  {id: 't-dino', lang: 'ru', topic: 'что если динозавры вернутся?', keys: [/динозавр/i]},
  {id: 't-fly', lang: 'ru', topic: 'что если люди научились летать?', keys: [/лета|полёт|полет|крыл/i]},
  {id: 't-wolf', lang: 'ru', topic: 'волки Арктики', keys: [/волк|звер|животн|аркти|снег/i]},
  {id: 't-grav', lang: 'ru', topic: 'что если гравитация исчезнет?', keys: [/гравитац|невесомост|вес/i]},
  {id: 't-int', lang: 'ru', topic: 'что если пропадёт интернет?', keys: [/интернет|сеть|онлайн|сигнал/i]},
  {id: 't-sleep', lang: 'ru', topic: 'что если не спать неделю?', keys: [/сон|спат|бессонниц|устал|глаз/i]},
  {id: 't-cats', lang: 'en', topic: 'what if cats ruled the world?', keys: [/\bcats?\b|kitten/i]},
  {id: 't-ocean', lang: 'en', topic: 'what if the ocean boiled?', duration: 90, keys: [/ocean|sea|water|boil/i]},
];

const NEGATIVE = [
  {name: 'duration too small', args: ['new', 't-neg', '--duration', '10', '--topic', 'x']},
  {name: 'duration too large', args: ['new', 't-neg', '--duration', '300', '--topic', 'x']},
  {name: 'characters out of range', args: ['new', 't-neg', '--characters', '5', '--topic', 'x']},
  {name: 'bad lang', args: ['new', 't-neg', '--lang', 'de', '--topic', 'x']},
  {name: 'bad template', args: ['new', 't-neg', '--template', 'nope', '--topic', 'x']},
  {name: 'bad music', args: ['new', 't-neg', '--music', 'jazz', '--topic', 'x']},
  {name: 'bad voice mode', args: ['new', 't-neg', '--voice', 'shout', '--topic', 'x']},
  {name: 'path-traversal id', args: ['new', '../evil', '--topic', 'x']},
  {name: 'empty topic', args: ['new', 't-neg', '--topic', '   ']},
];

const render = (args) => spawnSync(process.execPath, [RENDER, ...args], {cwd: ENGINE, encoding: 'utf8'});
let failures = 0;
const fail = (msg) => { failures++; console.log(`  ✘ ${msg}`); };
const ok = (msg) => console.log(`  ✔ ${msg}`);

console.log('== negative validation ==');
fs.rmSync(path.join(PROJECTS, 't-neg'), {recursive: true, force: true});
for (const c of NEGATIVE) {
  const r = render(c.args);
  if (r.status !== 0 && /✘/.test(r.stderr + r.stdout)) ok(`${c.name} → rejected`);
  else fail(`${c.name} → expected rejection, got status ${r.status}: ${(r.stderr || r.stdout || '').slice(0, 120)}`);
}
// ensure no project dir leaked from the negative cases
if (fs.existsSync(path.join(PROJECTS, 't-neg', 'project.json'))) fail('t-neg was created despite invalid input');
if (fs.existsSync(path.resolve(PROJECTS, '..', 'evil'))) fail('path-traversal project dir created');

console.log('== topic matrix ==');
for (const c of CASES) {
  const duration = c.duration || 45;
  console.log(`\n[${c.id}] "${c.topic}" (${c.lang})`);
  const r = render(['new', c.id, '--lang', c.lang, '--duration', String(duration), '--topic', c.topic, '--force']);
  if (r.status !== 0) { fail(`new: ${(r.stderr || r.stdout || '').trim().split('\n').pop()}`); continue; }

  const p = JSON.parse(fs.readFileSync(path.join(PROJECTS, c.id, 'project.json'), 'utf8'));
  const lang = c.lang;
  const blob = [
    p.title?.[lang] || '', p.logline?.[lang] || '',
    ...p.scenes.flatMap((s) => [
      typeof s.overlay?.text === 'string' ? s.overlay.text : (s.overlay?.text?.[lang] || ''),
      s.title?.[lang] || '',
    ]),
    ...p.scenes.flatMap((s) => s.lines.map((l) => l.text?.[lang] || '')),
  ].join(' \n ');
  const keyHit = (re) => re.test(blob);
  if (c.keys.some(keyHit)) ok('topic reflected in title/logline/lines');
  else fail(`topic not reflected (checked: ${blob.slice(0, 160)}…)`);
  const lineHits = c.keys.filter((re) => p.scenes.some((s) => s.lines.some((l) => re.test(l.text?.[lang] || '')))).length;
  // Narration itself must talk about the topic — a matching title over an
  // unrelated script (template hijack) is exactly the bug this catches.
  if (lineHits >= 1) ok(`narration mentions the topic (${lineHits} key lines)`);
  else fail('no narration line mentions the topic (script is about something else?)');
  if (['t-dino', 't-fly', 't-wolf', 't-grav', 't-int', 't-sleep', 't-cats', 't-ocean'].includes(c.id)) {
    console.log(`  · script lines matching topic keys: ${lineHits}`);
  }

  // structure
  const scenes = p.scenes;
  if (scenes.length >= 4) ok(`${scenes.length} scenes`); else fail(`too few scenes: ${scenes.length}`);
  if (scenes[0]?.kind === 'story' && scenes[0].lines.length >= 1) ok('hook scene first with narration');
  else fail('scene 1 is not a hook with lines');
  if (scenes.some((s) => s.kind === 'title')) ok('title scene present'); else fail('no title scene');
  const last = scenes[scenes.length - 1];
  if (last?.overlay?.type === 'question') ok('finale asks the viewer a question'); else fail('finale has no question overlay');
  const empty = scenes.flatMap((s) => s.lines).filter((l) => !(l.text?.[lang] || '').trim());
  if (!empty.length) ok('no empty lines'); else fail(`${empty.length} empty lines`);
  const t = render(['timeline', c.id]);
  if (t.status === 0) ok('timeline + plan QA passed');
  else fail(`timeline: ${(t.stderr || t.stdout || '').trim().split('\n').slice(-3).join(' | ')}`);
  // The film length must honour the request (text drives scene durations, so
  // this is checked against the resolved plan, not against minDur floors).
  try {
    const plan = JSON.parse(fs.readFileSync(path.join(PROJECTS, c.id, 'plan.json'), 'utf8'));
    const drift = Math.abs(plan.totalSec - duration) / duration;
    if (drift <= 0.3) ok(`duration ${plan.totalSec.toFixed(1)}s ≈ requested ${duration}s`);
    else fail(`duration drift too large: ${plan.totalSec.toFixed(1)}s vs ${duration}s requested`);
  } catch (e) { fail(`plan.json unreadable: ${e.message}`); }
  const q = render(['qa', c.id, '--plan-only']);
  if (q.status === 0) ok('qa --plan-only passed');
  else fail(`qa --plan-only: ${(q.stderr || q.stdout || '').trim().split('\n').slice(-3).join(' | ')}`);
}

console.log(`\n${failures === 0 ? 'ALL TOPIC TESTS PASSED' : `FAILURES: ${failures}`}`);
if (!KEEP) {
  for (const c of [...CASES, {id: 't-neg'}]) {
    fs.rmSync(path.join(PROJECTS, c.id), {recursive: true, force: true});
    fs.rmSync(path.resolve(ENGINE, '..', 'output', c.id), {recursive: true, force: true});
  }
}
process.exit(failures === 0 ? 0 : 1);
