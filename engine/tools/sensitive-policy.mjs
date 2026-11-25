import {topicProfile,DISCLAIMERS} from './topic-profile.mjs';
export const AUTHORITATIVE_CLASSES=['official','scientific','clinical-guideline'];
export function combinedProfile(topic,options,claims=[]){
 const profile=topicProfile(topic,options),others=claims.map(c=>{const p=topicProfile(c.text.slice(0,4000),options);if(profile.domain==='history'&&!profile.sensitivity.length&&c.era?.[1]<=1700){p.sensitivity=p.sensitivity.filter(s=>!['law','politics'].includes(s));profile.explanation.push('Историческое описание договора/наследования до1700: не современная правовая консультация');}return p;});
 profile.matchedDomains=[...new Set([profile,...others].flatMap(p=>p.matchedDomains))];profile.sensitivity=[...new Set([profile,...others].flatMap(p=>p.sensitivity))];
 profile.disclaimers=profile.sensitivity.map(s=>DISCLAIMERS[options.language||'ru'][s]);if(profile.sensitivity.length)profile.editorialTone='neutral-informational';return profile;
}
export function validateSensitiveMaterials(profile,pack,mode){
 if(!profile.sensitivity.length)return;
 if(profile.sensitivity.some(s=>['health','law','finance'].includes(s))&&mode==='verified'){
  const used=new Set(pack?.claims?.flatMap(c=>c.sources)||[]);
  if(!used.size)throw new Error('Чувствительная verified тема требует авторитетные источники');
  for(const id of used){const source=pack.sources.find(s=>s.id===id);if(!AUTHORITATIVE_CLASSES.includes(source?.reliabilityClass))throw new Error(`Источник ${id}: verified health/law/finance требует reliabilityClass official/scientific/clinical-guideline; метка класса требует ручной проверки`);}
 }
 for(const claim of pack?.claims||[])if(/\b(take\s+\d|inject|stop taking|guaranteed profit|buy this stock|ignore (?:your )?(?:doctor|lawyer))\b|вам\s+(?:нужно|следует)|следует\s+принимать|рекомендуем\s+принимать|you\s+(?:should|must)|recommend\s+taking|\d+\s*(?:мг|мл|таблет|mg\b|ml\b)|подайте\s+иск|подпишите|инвестируйте|принимайте|вводите\s+\d|колите|отмените\s+лекар|гарантированн.*доход|покупайте\s+акци|не\s+обращайтесь\s+к\s+(?:врачу|юристу)/iu.test(claim.narration||claim.text))throw new Error('Нейтральный информационный режим: персональные указания/гарантии вместо специалиста запрещены; отредактируйте материалы');
}
export function isSafetyLine(line,language){return line.editorial==='safety-disclaimer'&&Object.values(DISCLAIMERS[language]||{}).includes(line.text?.[language]);}
export function attachSafetyScenes(project){
 const p=structuredClone(project),profile=p.production?.universal?.profile||p.production?.safetyProfile;if(!profile?.disclaimers?.length)return p;
 const voice=p.characters[0]?.voice;if(!voice)throw new Error('Нет голоса для дисклеймера');
 // Dedicated editorial scenes: no accidental claim-fidelity exemption for arbitrary text.
 const base=p.scenes[0];for(const [i,text]of profile.disclaimers.entries()){
  const id='safety'+(i+1);if(p.scenes.some(s=>s.lines.some(l=>l.text?.[p.language]===text)))continue;
  p.scenes.push({...structuredClone(base),id,kind:'safety',title:{ru:'Информационный дисклеймер',en:'Information disclaimer'},claimIds:[],actors:base.actors.slice(0,1),props:[],crowd:undefined,beats:[],sfx:[],pstates:[],shots:[],shotPlan:[{type:'medium',move:'drift',char:base.actors[0]?.char}],minDur:Math.max(4,Math.ceil(text.length/13.5)),lines:[{id:id+'_0',voice,text:{ru:text,en:text},editorial:'safety-disclaimer',claimIds:[],pause:.1}],doc:{mode:'evidence',profile:'generic',chapter:p.language==='en'?'Information only':'Только общая информация',name:p.language==='en'?'Disclaimer':'Дисклеймер',years:'',sources:'',sourceRefs:[],status:'unknown',needsReview:true,labels:[],note:'editorial safety notice',events:[{label:text}]}});
 }
 return p;
}
