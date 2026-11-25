// Explainable lexical classifier. Unknown is preferable to an invented era/location.
export const UNIVERSAL_FORMATS=['explainer','documentary','story','tutorial','top','promo','kids','skit','review'];
export const TRUST_MODES=['verified','unverified-draft','creative'];
const domains=[
 ['health',/здоров|болез|лекарств|медицин|лечени|health|disease|medicine|treatment/iu],
 ['law',/юрид|закон|адвокат|правов|legal|lawyer|law\b/iu],
 ['finance',/финанс|инвест|кредит|акци[яий]|finance|invest|credit|stock/iu],
 ['politics',/политик|выбор[ыа]|президент|politic|election|president/iu],
 ['history',/истори|летопис|рюрик|средневек|history|medieval/iu],
 ['physics',/физик|гравитац|электр|physics|gravity|electric/iu],
 ['biology',/биолог|клетк|растени|biology|cell\b|plant/iu],
 ['technology',/технолог|компьютер|робот|программ|technology|computer|robot|software/iu],
 ['geography',/географ|континент|океан|геолог|geograph|continent|ocean|geolog/iu],
 ['cooking',/кулин|рецепт|готовить|пирог|cooking|recipe|baking/iu],
 ['sport',/спорт|футбол|трениров|sport|football|training/iu],
 ['psychology',/психолог|память|внимани|psycholog|memory|attention/iu],
 ['business',/бизнес|продукт|компани|business|product|company/iu],
 ['nature',/природ|животн|лес\b|nature|animal|forest/iu],
];
const disclaimers={ru:{health:'Информационный материал, не медицинская рекомендация. Обратитесь к квалифицированному специалисту.',law:'Общая информация, не юридическая консультация. Законодательство зависит от места и даты.',finance:'Общая информация, не индивидуальная инвестиционная рекомендация. Возможны убытки.',politics:'Обзор требует проверки источников и представления различных позиций.'},en:{health:'General information, not medical advice. Consult a qualified professional.',law:'General information, not legal advice. Laws depend on jurisdiction and date.',finance:'General information, not individual investment advice. Losses are possible.',politics:'This overview requires source review and representation of different perspectives.'}};
export function topicProfile(topic,{format='explainer',language='ru'}={}){
 if(typeof topic!=='string'||!topic.trim()||topic.length>4000)throw new Error('Тема: нужен текст1–4000 символов');
 if(!UNIVERSAL_FORMATS.includes(format)||!['ru','en'].includes(language))throw new Error('Неизвестный формат/язык');
 const matches=domains.filter(([,re])=>re.test(topic)),domain=matches[0]?.[0]||'general',sensitivity=matches.map(([id])=>id).filter(id=>['health','law','finance','politics'].includes(id));
 const creative=['story','skit'].includes(format)||/сказк|вымысел|fairy tale|fiction/iu.test(topic);
 const medieval=/средневек|medieval/iu.test(topic),years=[...topic.matchAll(/\b(1[0-9]{3}|20[0-9]{2})\b/gu)].map(m=>Number(m[1]));
 return {schemaVersion:1,domain,matchedDomains:matches.map(([id])=>id),type:creative?'creative':'factual',format,language,sensitivity,era:medieval?[500,1500]:years.length?[Math.min(...years),Math.max(...years)]:null,geography:null,graphics:domain==='geography'?['map','evidence']:domain==='history'?['timeline','evidence']:['evidence'],disclaimers:sensitivity.map(s=>disclaimers[language][s]),explanation:[matches.length?'Словарные совпадения: '+matches.map(([id])=>id).join(', '):'Нет уверенного доменного совпадения; общий профиль',creative?'Творческий формат/явный маркер вымысла':'Фактическая тема: нужны материалы',...(!years.length&&!medieval?['Эпоха не определена; география не угадывается']:[])]};
}
