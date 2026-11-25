import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {topicProfile} from '../tools/topic-profile.mjs';
const groups={
 health:['Как работает вакцина','Нужна ли прививка','Симптомы гриппа и диагностика','Лечение диабета','Диета и БАД','Антибиотики и иммунитет','How vaccines work','Medical diagnosis','Dietary supplements','Disease symptoms','Insulin treatment','Health and medicine'],
 law:['Можно ли оспорить штраф','Права арендатора','Как работает договор','Судебный процесс','Авторское право и закон','Appealing a fine','Legal contracts','Tenant rights','Copyright law','Inheritance and lawyers'],
 finance:['Что такое инфляция','Инвестиции в акции','Ипотечный кредит','Пенсионные вклады','Налоги и бюджет','What is inflation','Investing in stocks','Mortgage rates','Cryptocurrency and bitcoin','Financial deposits'],
 politics:['Парламентские выборы','Президент и правительство','Политические санкции','Democracy and elections','Government and parliament','Political referendum'],
 physics:['Почему небо голубое','Как работает гравитация','Квантовая физика','Электрические магниты','Why is the sky blue','Thermodynamics and optics'],
 chemistry:['Что такое молекула','Химические реакции','Chemistry of molecules','Basic chemistry'],
 biology:['Как идёт фотосинтез','Строение клетки','Генетика растений','DNA and genetics','Plant biology','How evolution works'],
 technology:['Как работает компьютер','Роботы и алгоритмы','Программирование нейросетей','Computer processors','Internet technology','Software algorithms'],
 history:['История Рюриковичей','Летописи Средневековья','Ancient history','Archaeology and chronicles'],
 geography:['География материков','Океаны и континенты','Geography and volcanoes','Climate and continents'],
 cooking:['Рецепт борща','Кулинария: выпечка пирога','Borscht recipe','Cooking soup'],
 sport:['Футбольная тренировка','Олимпийское плавание','Football training','Swimming and running'],
 psychology:['Как работает память','Психология внимания','Psychology of emotions','Motivation and memory'],
 science:['Что изучает наука','Scientific method'],
};
let total=0;const evidence=[];
for(const [domain,topics]of Object.entries(groups))for(const topic of topics){const language=/[а-яё]/iu.test(topic)?'ru':'en',p=topicProfile(topic,{language});assert.equal(p.domain,domain,topic);assert.equal(p.type,'factual',topic);const expected=['health','law','finance','politics'].includes(domain)?[domain]:[];assert.deepEqual(p.sensitivity,expected,topic);assert.equal(p.disclaimers.length,expected.length,topic);evidence.push({topic,expectedDomain:domain,domain:p.domain,type:p.type,sensitivity:p.sensitivity,disclaimers:p.disclaimers});total++;}
for(const topic of ['Ртуть и токсичные кислоты','Dangerous substances: mercury and acid']){const p=topicProfile(topic);assert.equal(p.domain,'chemistry');assert.ok(p.sensitivity.includes('dangerous'));total++;}
const multi=topicProfile('Вакцина, физика, химия, инвестиции, закон и политика');for(const d of ['health','biology','physics','chemistry','finance','law','politics','science'])assert.ok(multi.matchedDomains.includes(d),d);assert.equal(multi.disclaimers.length,4);
assert.equal(topicProfile('Сказка о лесной птице',{format:'story'}).type,'creative');assert.equal(topicProfile('A fairy tale about a robot').type,'creative');assert.match(topicProfile('Кракозябра').explanation[0],/общий.*ни один словарь/);assert.ok(total>=60);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'fixes4-')),env={...process.env,WHATIF_PROJECTS:path.join(temp,'projects'),WHATIF_OUTPUT:path.join(temp,'output'),WHATIF_OFFLINE:'1'};
try{
 const code=`import assert from'node:assert/strict';import{makeUniversal,assertPublicationAllowed}from'./tools/universal.mjs';import{prepareMaterials}from'./tools/research-materials.mjs';import{buildPlan}from'./tools/timeline.mjs';import{qaDocumentary}from'./tools/documentary.mjs';import{qaPlan}from'./tools/qa.mjs';import{projectDir,readJson}from'./tools/lib.mjs';import path from'node:path';
 const material=prepareMaterials({topic:'Вакцина',sources:[{title:'Предоставленный учебный текст',excerpt:'Вакцина изучается в информационном материале.',reliabilityClass:'blog'}]}).pack;
 assert.throws(()=>makeUniversal({id:'bad',topic:'Как работает вакцина',materials:material,voiceMode:'none'}),/reliabilityClass/);material.sources[0].reliabilityClass='official';makeUniversal({id:'good',topic:'Как работает вакцина',materials:material,voiceMode:'none'});
 const p=readJson(path.join(projectDir('good'),'project.json'));assert.equal(p.production.universal.profile.domain,'health');assert.equal(p.scenes.filter(s=>s.kind==='safety').length,1);const text=p.production.universal.profile.disclaimers[0];assert.ok(p.scenes.some(s=>s.lines.some(l=>l.text.ru===text)));assert.ok(p.scenes.some(s=>s.doc?.events?.some(e=>e.label===text)));
 const plan=buildPlan('good',{projectOverride:p,persist:false,ignoreAudio:true});assert.deepEqual(qaDocumentary(plan).errors,[]);assert.deepEqual(qaPlan('good',plan,{project:p}).errors,[]);const bad=structuredClone(plan);bad.scenes.find(s=>s.kind==='safety').lines[0].text.ru='Произвольный факт не дисклеймер';assert.ok(qaDocumentary(bad).errors.some(e=>e.includes('invalid safety')));
 p.production.knowledge.claims.forEach(c=>{c.needsReview=false;c.reviewDecision='confirmed';});assertPublicationAllowed(p,{acceptUnverified:true});p.scenes=p.scenes.filter(s=>s.kind!=='safety');assert.throws(()=>assertPublicationAllowed(p,{acceptUnverified:true}),/дисклеймер/);
 const advice=prepareMaterials({topic:'Лечение',sources:[{title:'Материал',excerpt:'Принимайте пять таблеток без врача.',reliabilityClass:'official'}]}).pack;assert.throws(()=>makeUniversal({id:'advice',topic:'Лечение',materials:advice}),/запрещены/);
 `;
 const r=spawnSync(process.execPath,['--input-type=module','-e',code],{env,cwd:path.resolve(import.meta.dirname,'..'),encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
if(process.env.FIXES4_EVIDENCE)fs.writeFileSync(process.env.FIXES4_EVIDENCE,JSON.stringify({total,verifiedWithFixtures:true,networkUsed:false,topics:evidence,multidomain:multi},null,2)+'\n');
console.log('PASS fixes4: '+total+' RU/EN topic fixtures + multidomain/creative/unknown, authoritative class gate, auto spoken+on-screen disclaimer, exact editorial whitelist, personal directive rejection; no external factual/medical verification');
