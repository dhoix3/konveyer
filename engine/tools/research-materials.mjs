import {validatePack,sourceMarkdown} from './knowledge.mjs';
// Offline evidence preparation, NOT a fact checker. Exact excerpts stay traceable.
export function prepareMaterials({topic,sources}){
 if(typeof topic!=='string'||!topic.trim()||topic.length>4000)throw new Error('Укажите тему исследования');
 if(!Array.isArray(sources)||!sources.length||sources.length>30)throw new Error('Добавьте от1 до30 реальных источников с выдержками');
 const ids=new Set();let claims=[];
 const bibliography=sources.map((s,i)=>{
  const id=s.id||`src${i+1}`;
  if(!/^[a-zA-Z0-9_-]{1,60}$/.test(id)||ids.has(id)||typeof s.title!=='string'||!s.title.trim()||s.title.length>500||typeof s.excerpt!=='string'||!s.excerpt.trim()||s.excerpt.length>20000)throw new Error('Источник: нужны уникальный id, название и выдержка до20000 знаков');ids.add(id);
  if(s.url&&!/^https?:\/\//.test(s.url))throw new Error('Ссылка источника должна начинаться с http:// или https://');
  // One candidate per user-delimited paragraph, never an LLM expansion.
  for(const paragraph of s.excerpt.trim().split(/\n\s*\n/).filter(Boolean)){
   if(paragraph.length>1200)throw new Error('Разбейте выдержку на абзацы до1200 знаков');
   claims.push({id:`candidate${claims.length+1}`,text:paragraph.trim(),quote:paragraph.trim(),status:'unknown',date:{value:'не установлено',precision:'unknown'},place:'не установлено',confidence:0,needsReview:true,sources:[id],epoch:'research'});
  }
  return {id,title:s.title.trim(),url:s.url||undefined,excerpt:s.excerpt.trim(),provenance:'user-supplied; not fetched or independently verified'};
 });
 if(claims.length>100)throw new Error('Максимум100 абзацев; разделите исследование');
 const pack=validatePack({schemaVersion:1,id:'user-materials',topic:topic.trim(),sources:bibliography,claims,verification:'Локальная подготовка предоставленных выдержек. Не независимый фактчекинг. Все кандидаты требуют проверки.'});
 return {pack,report:sourceMarkdown(pack),gaps:['Проверьте авторство, дату и доступность каждого источника','Уточните даты, места и эпохи; они не извлекаются догадками','Отметьте спорные версии и удалите нерелевантные абзацы','Перед генерацией подтвердите каждую формулировку, графику и длительность']};
}
