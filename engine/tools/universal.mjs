import fs from 'node:fs';import crypto from 'node:crypto';import path from 'node:path';
import {projectDir,writeJson,readJson,sha1} from './lib.mjs';import {lockProject} from './project-lock.mjs';
import {buildProject} from './script.mjs';import {T,S} from './story.mjs';
import {buildDocumentary,writeDocumentaryArtifacts} from './documentary.mjs';import {validatePack} from './knowledge.mjs';
import {topicProfile,TRUST_MODES} from './topic-profile.mjs';
export function assertPublicationAllowed(project,{acceptUnverified=false,draft=false}={}){
 const u=project.production?.universal;if(!u||draft)return;
 const script=project.scenes.flatMap(s=>s.lines.map(l=>l.text[project.language]||'')).join(' ').replace(/\s+/g,' ');
 if((u.profile.disclaimers||[]).some(text=>!script.includes(text.replace(/\s+/g,' '))))throw new Error('Финальный экспорт заблокирован: добавьте обязательный дисклеймер в озвучиваемый сценарий чувствительной темы. Флаг принятия непроверенных фактов не обходит это требование.');
 if(u.mode==='creative')return;
 const pack=project.production?.knowledge;
 const pending=!pack?.claims?.length||pack.claims.some(c=>c.needsReview!==false||c.reviewDecision==='rejected'||!c.quote||!c.sources?.length);
 if(pending&&!acceptUnverified)throw new Error('Финальный экспорт заблокирован: утверждения/источники не подтверждены редактором. Проверьте материалы в GUI или явно используйте --accept-unverified (пометка непроверенности сохранится).');
 if(pack)validatePack(pack); // A bypass never permits corrupted evidence links/quotes.
}
export function makeUniversal({id,topic,format='explainer',duration=60,language='ru',mode,materials,voiceMode='tts',autoResearch=false,allowNetwork=false}={}){
 if(autoResearch)throw new Error('Автоисследование ещё не реализовано в этой фазе. Никакая сеть не использовалась. Добавьте материалы или создайте unverified-draft заявку.');
 const profile=topicProfile(topic,{format,language});
 mode=mode||(profile.type==='creative'?'creative':materials?'verified':'unverified-draft');
 if(!TRUST_MODES.includes(mode))throw new Error('Неизвестный режим достоверности');
 if(!['tts','none'].includes(voiceMode))throw new Error('Озвучка: tts или none');
 if(mode==='creative'&&materials)throw new Error('Материалы требуют factual режима, не creative');
 if(materials)validatePack(materials);
 if(mode==='verified'&&!materials?.claims?.length)throw new Error('verified требует материалы с источниками и утверждениями; без них выберите unverified-draft');
 if(!Number.isFinite(Number(duration))||Number(duration)<25||Number(duration)>180)throw new Error('Длительность25–180 секунд');
 id=id||'make-'+Date.now().toString(36)+'-'+crypto.randomBytes(3).toString('hex');
 const dir=projectDir(id),unlock=lockProject(id,{createDir:false});
 try{
 if(fs.existsSync(path.join(dir,'project.json')))throw new Error('Проект уже существует; make не перезаписывает его');
 const base=buildProject({id,topic,format:'fiction',genre:profile.domain==='history'?'history':'drama',language,duration:Number(duration),characters:2,voiceMode});
 let project=base;
 if(materials)project=buildDocumentary(base,materials);
 else if(mode!=='creative'){
  const statements=language==='en'?['Research outline, not a factual script. Sources have not been supplied.','Add short attributed excerpts, then review each candidate claim.','This draft cannot be published as verified.']:['Исследовательская заявка, не фактический сценарий. Источники не добавлены.','Добавьте короткие выдержки с атрибуцией и проверьте каждое утверждение.','Этот черновик нельзя публиковать как проверенный материал.'];
  project={...base,characters:base.characters.slice(0,1),voices:base.voices.filter(v=>v.id===base.characters[0].voice),scenes:statements.map((text,i)=>S({id:'s0'+(i+1),title:T('Подготовка материалов','Material preparation'),env:{id:'void',time:'night'},actors:[{char:base.characters[0].id,x:960,facing:'r'}],beats:[{t:0,char:base.characters[0].id,do:'think'}],lines:[{id:'s0'+(i+1)+'_0',voice:base.characters[0].voice,text:T(text,text),needsReview:true}],minDur:Number(duration)/3,doc:{mode:'evidence',profile:'generic',name:topic,chapter:language==='en'?'Unverified draft':'Непроверенный черновик',years:'—',sources:language==='en'?'No sources supplied':'Источники не добавлены',status:'unknown',needsReview:true,labels:[],note:'Outline only',events:[{label:text}]}})),production:{...base.production,kind:'outline',fiction:false}};
 }
 project.production={...project.production,universal:{schemaVersion:1,format,mode,profile,networkAllowed:false,requestedNetwork:!!allowNetwork,status:materials?'awaiting-review':mode==='creative'?'creative-draft':'needs-materials',notice:'networkAllowed stays false: network workflow not implemented'}};
 writeJson(path.join(dir,'project.json'),project);writeJson(path.join(dir,'topic-profile.json'),profile);
 if(materials){writeJson(path.join(dir,'knowledge.json'),materials);writeDocumentaryArtifacts(id,project);}
 return {id,mode,profile,next:materials?'Проверьте claims в GUI; final export пока блокируется':mode==='creative'?'Проверьте творческий сценарий, затем timeline/frames':'Добавьте материалы в GUI; это заявка, не готовый факт-фильм',networkUsed:false};
 }finally{unlock();}
}
export function reviewUniversal(id,{revision,decisions}){
 const unlock=lockProject(id);try{
 const file=path.join(projectDir(id),'project.json'),p=readJson(file);
 if(!p.production?.universal||!p.production.knowledge)throw new Error('Нет universal knowledge-пакета для проверки');
 if(sha1(p)!==revision)throw new Error('Проект изменён; загрузите актуальную версию');
 if(!Array.isArray(decisions)||!decisions.length||decisions.length>100)throw new Error('Нужны решения по утверждениям');
 const seen=new Set();
 for(const decision of decisions){const c=p.production.knowledge.claims.find(c=>c.id===decision.id);if(!c||seen.has(decision.id)||!['confirm','reject'].includes(decision.action))throw new Error('Неизвестное/повторное утверждение или решение');seen.add(c.id);
 if(decision.action==='confirm'&&(!c.quote||!c.sources.length))throw new Error('Подтверждение требует дословную выдержку и источник');
 c.needsReview=decision.action!=='confirm';c.reviewDecision=decision.action==='confirm'?'confirmed':'rejected';}
 validatePack(p.production.knowledge);p.production.universal.status=p.production.knowledge.claims.every(c=>c.needsReview===false)?'reviewed':'awaiting-review';
 writeJson(file,p);writeJson(path.join(projectDir(id),'knowledge.json'),p.production.knowledge);writeDocumentaryArtifacts(id,p);return {ok:true,revision:sha1(readJson(file)),status:p.production.universal.status};
 }finally{unlock();}
}
