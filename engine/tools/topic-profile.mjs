// Explainable bilingual lexical classifier, not a medical/legal/safety diagnosis.
export const UNIVERSAL_FORMATS=['explainer','documentary','story','tutorial','top','promo','kids','skit','review'];
export const TRUST_MODES=['verified','unverified-draft','creative'];
const domains=[
 ['health',/вакцин|привив|иммун|здоров|заболеван|профилактик|медицин|лекарств|болез|симптом|диагност|лечени|терап|диет|(?<!\p{L})БАД(?:ы|ов|ами)?(?!\p{L})|биодобав|питательн.*добав|антибиот|онколог|диабет|инсулин|депресси|vaccin|immun|health|medic|drug\b|disease|symptom|diagnos|treat|therap|diet|supplement|antibiotic|cancer|diabetes|insulin|depression/iu],
 ['law',/(?<!\p{L})прав(?:о|а|е|ом)(?!\p{L})|юрид|закон|адвокат|правов|штраф|оспорить|договор|наследств|судеб|суд\p{L}*\s|трудов.*прав|права\s|арендатор|авторск.*прав|legal|law\b|lawyer|fine\b|appeal|contract|inheritance|court|copyright|tenant/iu],
 ['finance',/финанс|инвест|кредит|ипотек|инфляц|(?<!\p{L})акци[яий]|облигац|вклад|депозит|пенси|налог|бюджет|банкрот|криптовалют|биткоин|finance|invest|credit|mortgage|inflation|stock|bond\b|deposit|pension|tax\b|budget|bankrupt|cryptocurr|bitcoin/iu],
 ['politics',/политик|выбор[ыа]|президент|парламент|санкци|правительств|референдум|демократ|politic|election|president|parliament|sanction|government|referendum|democra/iu],
 ['physics',/физик|гравитац|электр|небо.*голуб|свет.*рассе|квант|магнит|термодинами|оптик|physics|gravity|electric|sky.*blue|light.*scatter|quantum|magnet|thermodynam|optic/iu],
 ['chemistry',/хими|молекул|кислот|щелоч|ртут|аммиак|взрывчат|токсич|ядовит|chemistr|molecul|acid\b|alkali|mercury|ammonia|explosive|toxic|poison/iu],
 ['biology',/биолог|клетк|клеточ|растени|фотосинтез|эволюц|генет|ДНК|иммун|вакцин|привив|biology|cell\b|cellular|plant|photosynth|evolut|genetic|\bDNA\b|immun|vaccin/iu],
 ['technology',/технолог|компьютер|робот|программ|алгоритм|нейросет|интернет|процессор|technology|computer|robot|software|algorithm|neural|internet|processor/iu],
 ['history',/истори|летопис|рюрик|средневек|древн|археолог|наполеон|history|historical|chronicle|medieval|ancient|archaeolog|napoleon/iu],
 ['geography',/географ|континент|океан|геолог|вулкан|материк|климат|географ.*карт|geograph|continent|ocean|geolog|volcano|climate/iu],
 ['cooking',/кулин|рецепт|готовить|борщ|пирог|кухн|выпечк|суп\b|cooking|recipe|borscht|baking|kitchen|soup|cake/iu],
 ['sport',/спорт|футбол|трениров|баскетбол|(?<!\p{L})бег(?!\p{L})|плаван|олимпий|sport|football|training|basketball|running|swimming|olympic/iu],
 ['psychology',/психолог|память|внимани|эмоци|мотивац|стресс|депресси|psycholog|memory|attention|emotion|motivation|stress|depression/iu],
 ['business',/бизнес|продукт|компани|маркетинг|предприним|стартап|business|product|company|marketing|entrepreneur|startup/iu],
 ['nature',/природ|животн|лес\b|птиц|nature|animal|forest|bird/iu],
 ['science',/наук|научн|science|scientific/iu],
];
export const DISCLAIMERS={ru:{health:'Информационный материал, не медицинская рекомендация. Обратитесь к квалифицированному специалисту.',law:'Общая информация, не юридическая консультация. Обратитесь к квалифицированному специалисту.',finance:'Общая информация, не инвестиционная рекомендация. Решения обсудите со специалистом; возможны убытки.',politics:'Обзор требует проверки источников и представления различных позиций.',dangerous:'Общая информация об опасностях, не инструкция по применению веществ. Требуется профессиональная оценка безопасности.'},en:{health:'General information, not medical advice. Consult a qualified professional.',law:'General information, not legal advice. Consult a qualified professional.',finance:'General information, not investment advice. Consult a professional; losses are possible.',politics:'This overview requires source review and representation of different perspectives.',dangerous:'General hazard information, not instructions for using substances. Professional safety assessment is required.'}};
export function topicProfile(topic,{format='explainer',language='ru'}={}){
 if(typeof topic!=='string'||!topic.trim()||topic.length>4000)throw new Error('Тема: нужен текст1–4000 символов');
 if(!UNIVERSAL_FORMATS.includes(format)||!['ru','en'].includes(language))throw new Error('Неизвестный формат/язык');
 const matches=domains.filter(([,re])=>re.test(topic)).map(([id])=>id),domain=matches[0]||'general';
 if(matches.some(id=>['physics','chemistry','biology'].includes(id))&&!matches.includes('science'))matches.push('science');
 const sensitivity=matches.filter(id=>['health','law','finance','politics'].includes(id));
 if(/опасн.*веществ|взрывчат|ртут|ядовит|токсич|кислот|щелоч|dangerous.*substance|explosive|mercury|poison|toxic|acid\b|alkali/iu.test(topic))sensitivity.push('dangerous');
 const creative=['story','skit'].includes(format)||/сказк|вымысел|fairy tale|fiction/iu.test(topic);
 const medieval=/средневек|medieval/iu.test(topic),years=[...topic.matchAll(/\b(1[0-9]{3}|20[0-9]{2})\b/gu)].map(m=>Number(m[1]));
 return {schemaVersion:2,domain,matchedDomains:matches,type:creative?'creative':'factual',format,language,sensitivity,era:medieval?[500,1500]:years.length?[Math.min(...years),Math.max(...years)]:null,geography:null,graphics:domain==='geography'?['map','evidence']:domain==='history'?['timeline','evidence']:['evidence'],disclaimers:sensitivity.map(s=>DISCLAIMERS[language][s]),editorialTone:sensitivity.length?'neutral-informational':'general',explanation:[matches.length?'Словарные совпадения (включая родительские домены): '+matches.join(', '):'Профиль общий (general): ни один словарь доменов не совпал; контекста недостаточно, догадки не добавлены',creative?'Творческий формат/явный маркер вымысла':'Фактическая тема: нужны материалы',...(!years.length&&!medieval?['Эпоха не определена; география не угадывается']:[])]};
}
