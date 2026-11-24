import {MOSCOW_TREE} from '../src/doc/graphic-data.ts';
import {claimFidelity} from './claim-fidelity.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {LIB_CHARS,LIB_VOICES} from '../src/lib/library.ts';
import {T,S,L} from './story.mjs';
import {validatePack,sourceMarkdown} from './knowledge.mjs';
import {HISTORICAL_ENVS,HISTORICAL_PROPS,HISTORICAL_COSTUMES,HISTORICAL_ACTIONS} from './historical.mjs';
import {projectDir} from './lib.mjs';
export const documentaryProvider={id:'documentary-rules-v2'};
export function buildDocumentary(project,pack) {
  validatePack(pack);if(!pack.claims.length)throw new Error('Empty knowledge: research outline only, no factual film generated');
  const duration=project.settings.duration;
  if(pack.claims.length>Math.floor(duration/8)*2)throw new Error('Topic too long: use epoch episodes from research; facts are never truncated');
  const base=LIB_CHARS.find(c=>c.id==='hero');
  const names=['Рассказчик',...new Set(pack.claims.map(c=>c.person||'Исторический участник'))];
  const namedCount=names.length;
  names.push('Дружинник','Летописец','Горожанин');
  const characters=names.map((name,i)=>({...structuredClone(base),id:`historian${i}`,name:T(name,name),voice:LIB_VOICES[i%LIB_VOICES.length].id,shirt:['#344253','#8a4537','#507368','#927b4f','#65656d'][i%5],height:.94,build:i%3===0?'stocky':'normal',namedPerson:i>0&&i<namedCount?name:undefined,anonymous:i>=namedCount,headwear:['fur','conical','hood','veil'][i%4],hairStyle:['long','curly','bald','braid'][i%4],beard:i%2===1,costume:['tunic','cloak','tunic','tunic','chainmail'][i%5],era:[800,1600]}));
  const groups=[];
  for(const c of pack.claims) {
    const last=groups.at(-1);
    if(!last || last.length===2 || last[0].epoch!==c.epoch)groups.push([c]);else last.push(c);
  }
  while(groups.length<Math.max(3,Math.ceil(duration/12))) {
    const index=groups.findIndex(g=>g.length>1);
    if(index>=0){const last=groups[index].pop();groups.splice(index+1,0,[last]);}
    else groups.push([pack.claims[groups.length%pack.claims.length]]);
  }
  if(groups.length>Math.floor(duration/8))throw new Error('Epoch chapters need more time: use epoch episodes');
  // Never invent a filler claim: shorter packages repeat evidence rather than assert new facts.
  const chapterNames={origins:'Истоки и летописные версии',kiev:'Киев и христианство',division:'Княжества и усобицы',horde:'Нашествие и Орда',moscow:'Возвышение Москвы',tsardom:'Царство и конец московской линии'};
  const scenes=groups.map((g,i)=>{
    if(!g.length)g=[pack.claims[i%pack.claims.length]];
    const id=`s${String(i+1).padStart(2,'0')}`,epoch=g[0].epoch||'research';
    const participants=[...new Set(g.map(c=>names.indexOf(c.person||'Исторический участник')))];
    // Tiny epoch episodes still show four distinct stylized supporting figures.
    // Supporting figures are roles, never unrelated named rulers from another epoch.
    participants.push(namedCount+i%3);
    const mode=['map','timeline','tree'][i%3];
    return S({id,title:T(epoch,epoch),env:{id:HISTORICAL_ENVS[i%HISTORICAL_ENVS.length],time:'day'},era:[Math.min(...g.map(c=>c.era?.[0]??800)),Math.max(...g.map(c=>c.era?.[1]??1600))],claimIds:[...new Set([...g.map(c=>c.id),...(mode==='tree' && pack.claims.some(c=>c.id==='moscow-line')?['moscow-line']:[])])],
      doc:{mode,tree:mode==='tree'?MOSCOW_TREE.map(n=>({...n,years:pack.claims.filter(c=>c.person===n.name).map(c=>c.date.value).filter((v,i,a)=>a.indexOf(v)===i).join(', ')||'дата не указана'})):undefined,chapter:i===0?'Как менялась власть Рюриковичей?':i===groups.length-1?'Итог: московская линия, не весь род':(chapterNames[epoch]||epoch),
        name:g[0].person||'Исторический эпизод',person:g[0].person,retrospective:mode==='tree',events:g.map(c=>({year:c.era?.[0]||Number(c.date.value.match(/\d{3,4}/)?.[0])||862,label:c.place})),subjects:g.map(c=>({id:c.id,name:c.person||'Исторический эпизод',years:c.date.value,status:c.status,sources:c.sources.join(', ')})),years:g[0].date.value,sources:[...new Set(g.flatMap(c=>c.sources))].join(', '),status:[...new Set(g.map(c=>c.status))].join(' / '),
        labels:mode==='tree'?(pack.claims.some(c=>c.id==='moscow-line')?['Иван III','Василий III','Иван IV','Фёдор Иванович']:['Нет данных для родословной в этой эпохе']):g.map(c=>mode==='timeline'?`${c.date.value}: ${c.place}`:c.place),
        note:mode==='tree'?'Ретроспектива: графика московской линии; персонажи текущей эпохи':'Стилизация, не портретная реконструкция'},
      light:L('sun',1300,120,'#e8d7b4','#958c67',0.6,{grade:'warm'}),ambience:'forest',
      actors:participants.map((index,j)=>({char:characters[index].id,x:1050+j*220,facing:j?'l':'r',era:[Math.min(...g.map(c=>c.era?.[0]??800)),Math.max(...g.map(c=>c.era?.[1]??1600))]})),
      props:[{id:'evidence',kind:mode==='timeline'?'scroll':i%2?'round_shield':'scroll',x:650,on:'floor',color:'#b39b70'}],
      beats:participants.flatMap((index,j)=>[{t:0,char:characters[index].id,do:j?'think':mode==='map'?'point':mode==='tree'?'wave':'type',...(j===0&&mode==='timeline'?{hold:{prop:'evidence',hand:'l'}}:{}),emotion:'thinking'}]),
      historicalAction:'council',
      lines:g.map((c,j)=>({id:`${id}_${j}`,voice:characters[0].voice,text:T((c.narration||c.text),(c.narration||c.text)),claimIds:[c.id],pause:0.1})),
      shotPlan:[{type:['wide','medium','close'][i%3],char:characters[participants[0]].id,move:'drift'},{type:i%3===2?'medium':'close',char:characters[participants[0]].id,at:'head',move:'pull'}],minDur:(Math.floor(duration*24/groups.length)+(i<Math.round(duration*24)%groups.length?1:0))/24});
  });
  return {...project,production:{...project.production,kind:'documentary',provider:documentaryProvider.id,fiction:false,knowledge:pack,notes:['Offline authored; needsReview=true. Causal statements are claims, not generated conjecture.']},characters,voices:LIB_VOICES.filter(v=>characters.some(c=>c.voice===v.id)),scenes};
}
export function qaDocumentary(plan) {
  if(plan.production?.provider!==documentaryProvider.id)return {errors:[],warnings:[]};
  const errors=[],warnings=[],pack=plan.production.knowledge;
  try{validatePack(pack);}catch(e){return {errors:[e.message],warnings};}
  const claims=new Map(pack.claims.map(c=>[c.id,c]));const seen=new Set();
  for(const c of pack.claims)for(const m of claimFidelity(c.narration||c.text,c))errors.push(`[${c.id}] ${m}`);
  for(const s of plan.scenes){
    const fail=m=>errors.push(`[${s.id}] ${m}`);
    if(!HISTORICAL_ENVS.includes(s.env.id))fail('modern/unknown historical environment');
    const localClaims=(s.lines||[]).flatMap(l=>(l.claimIds||[]).map(id=>claims.get(id))).filter(Boolean);
    const retrospective=s.doc?.retrospective===true&&/ретроспектив/i.test((s.doc?.note||'')+' '+(s.doc?.chapter||''));
    for(const a of s.actors||[]){const person=plan.characters.find(c=>c.id===a.char);if(person?.anonymous&&a.era&&s.era&&(a.era[0]>s.era[0]||a.era[1]<s.era[1]))fail('anachronistic anonymous role era');if(!person||person.anonymous||person.role==='narrator'||person.name?.ru==='Рассказчик')continue;
      const name=person.namedPerson||person.name?.ru;
      if(!localClaims.some(c=>c.person===name)&&!retrospective)fail(`anachronistic cast: ${name} absent from this scene claims (retrospective required)`);
    }
    const named=(s.actors||[]).map(a=>plan.characters.find(c=>c.id===a.char)).filter(c=>c&&!c.anonymous&&c.name?.ru!=='Рассказчик');
    if(!retrospective)for(let i=0;i<named.length;i++)for(let j=i+1;j<named.length;j++){
      const epochs=c=>new Set(pack.claims.filter(k=>k.person===(c.namedPerson||c.name.ru)).map(k=>k.epoch||String(Math.floor((k.era?.[0]||0)/100))));
      const a=epochs(named[i]),b=epochs(named[j]);if(a.size&&b.size&&![...a].some(x=>b.has(x)))fail('anachronistic cast: mixed epochs without retrospective');
    }
    if(!Array.isArray(s.era)||s.era.length!==2||s.era[0]>s.era[1])fail('missing/invalid era');
    if(s.doc?.mode==='tree' && pack.claims.some(c=>c.id==='moscow-line') && !s.claimIds?.includes('moscow-line'))fail('genealogy missing evidence');
    if(!s.claimIds?.length || s.claimIds.some(id=>!claims.has(id)))fail('missing/unknown scene claim');
    for(const l of s.lines)if(!l.claimIds?.length || l.claimIds.some(id=>!claims.has(id)||!s.claimIds.includes(id)))fail('missing/unknown line claim');else l.claimIds.forEach(id=>seen.add(id));
    for(const a of s.actors||[]) {const c=plan.characters.find(c=>c.id===a.char),era=HISTORICAL_COSTUMES[c?.costume];if(!era||!s.era||s.era[0]<era[0]||s.era[1]>era[1])fail('anachronistic costume');}
    for(const p of s.props||[]){const era=HISTORICAL_PROPS[p.kind];if(!era||!s.era||s.era[0]<era[0]||s.era[1]>era[1])fail(`anachronistic prop ${p.kind}`);}
    if(!HISTORICAL_ACTIONS[s.historicalAction])fail('unknown historical action');
    if(s===plan.scenes[0] && s.durSec>15)fail('hook exceeds 15 seconds');
    if(s.durSec>12.05)fail('scene exceeds 12 second cadence; split, do not truncate speech');
  }
  for(let i=0;i<plan.scenes.length;i+=3)if(!plan.scenes.slice(i,i+3).some(s=>s.shots?.some(k=>['medium','close','extreme_close'].includes(k.type))))errors.push('documentary camera: need medium/close at least once per three scenes');
  for(const s of plan.scenes)for(const l of s.lines) {
    const texts=(l.claimIds||[]).map(id=>claims.get(id)?.text||'').join(' ');
    for(const m of claimFidelity(l.text[plan.language],{text:texts}))errors.push(`[${l.id}] ${m}`);
  }
  for(const c of plan.characters){const era=HISTORICAL_COSTUMES[c.costume];if(!era)errors.push(`unknown costume ${c.costume}`);}
  if(new Set(plan.scenes.map(s=>s.env.id)).size<Math.min(8,plan.scenes.length))errors.push('insufficient historical environment diversity');
  if(plan.characters.length<5)errors.push('need four characters plus narrator');
  if(plan.characters.filter(c=>!c.anonymous&&c.namedPerson).some(c=>!plan.scenes.some(s=>s.actors.some(a=>a.char===c.id))))errors.push('unused historical character');
  for(const mode of ['map','timeline','tree'])if(!plan.scenes.some(s=>s.doc?.mode===mode))errors.push(`missing ${mode}`);
  if(seen.size!==pack.claims.length)errors.push('uncovered claims: split into epoch episodes');
  if(pack.claims.some(c=>c.needsReview))warnings.push('Knowledge needs manual factual/bibliographic review; supported does not mean independently verified');
  if(plan.voiceSource==='estimated')warnings.push('Estimated timing only: Piper/audio/render not verified');
  return {errors,warnings};
}
export function writeDocumentaryArtifacts(id,project) {
  const dir=projectDir(id),p=project.production.knowledge;
  fs.writeFileSync(path.join(dir,'SOURCES.md'),sourceMarkdown(p));
  // Storyboard, never misrepresented as rendered frames. No browser dependency.
  const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  const cards=project.scenes.map((s,i)=>`<g transform="translate(${i%3*400},${Math.floor(i/3)*230})"><rect width="390" height="220" fill="#26352e"/><text x="12" y="30" fill="white">${esc(s.id+' · '+s.env.id)}</text><text x="12" y="70" fill="#e7c586">${esc(s.doc.chapter)}</text><text x="12" y="115" fill="white">${esc(s.doc.mode+' · '+s.doc.years)}</text><text x="12" y="160" fill="white">${esc(s.claimIds.join(', '))}</text></g>`).join('');
  fs.writeFileSync(path.join(dir,'CONTACT_SHEET.svg'),`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${Math.ceil(project.scenes.length/3)*230+50}"><rect width="100%" height="100%" fill="#111"/><text x="10" y="25" fill="white">SCHEMATIC STORYBOARD — NOT RENDERED FRAMES</text><g transform="translate(0,50)">${cards}</g></svg>`);
}
