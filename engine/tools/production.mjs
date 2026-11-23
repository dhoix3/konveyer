// Production schema / rule-based provider. No claim of LLM or source verification.
import {LIB_CHARS, LIB_VOICES} from '../src/lib/library.ts';
import {T, S, L} from './story.mjs';
export const FORMATS = ['fiction', 'documentary', 'reconstruction', 'series'];
export const GENRES = ['drama','science','history','disaster','fantasy','post-apocalyptic'];
export const NARRATIVES = ['chronological','investigation','character'];
export const VISUAL_PROFILES = {
  drama: {envs:['city','kitchen','street','nature'], grade:'warm', music:'emotional'},
  science: {envs:['station','office','street','nature'],grade:'cold',music:'mystery'},
  history: {envs:['nature','office','street','city'],grade:'warm',music:'emotional'},
  disaster: {envs:['city','office','street','nature'],grade:'cold',music:'tense'},
  fantasy: {envs:['nature','station','city','nature'],grade:'teal_orange',music:'epic'},
  'post-apocalyptic': {envs:['city','street','station','nature'],grade:'noir',music:'dark_ambient'},
};
const text = (v, max, name) => {
  if (typeof v !== 'string' || !v.trim() || v.length > max) throw new Error(`${name}: требуется текст 1–${max} символов`);
  return v.trim();
};
export function normalizeBrief(opts) {
  const format = opts.format || 'fiction';
  if (!FORMATS.includes(format)) throw new Error('unknown production format');
  const genre = opts.genre || 'drama';
  if (!GENRES.includes(genre)) throw new Error('unknown genre');
  const narrative = opts.narrative || 'chronological';
  if (!NARRATIVES.includes(narrative)) throw new Error('unknown narrative style');
  const language = opts.language || 'ru';
  if (!['ru','en'].includes(language)) throw new Error('unknown language');
  const duration = Number(opts.duration ?? 45), characters = Number(opts.characters ?? 2);
  if (!Number.isFinite(duration) || duration < 25 || duration > 180) throw new Error('duration must be 25–180 seconds');
  if (!Number.isInteger(characters) || characters < 1 || characters > 3) throw new Error('characters must be 1–3');
  const episodes = Number(opts.episodes ?? 3), season = Number(opts.season ?? 1);
  if (!Number.isInteger(episodes) || episodes < 1 || episodes > 12) throw new Error('episodes must be 1–12');
  if (!Number.isInteger(season) || season < 1 || season > 99) throw new Error('season must be 1–99');
  if(opts.voiceModel && !/^[a-z]{2}_[A-Z]{2}-[a-z0-9_]+-(x_low|low|medium|high)$/.test(opts.voiceModel)) throw new Error('invalid voice model');
  const sources = opts.sources || [], claims = opts.claims || [];
  if (!Array.isArray(sources) || sources.length > 50 || !Array.isArray(claims) || claims.length > 50) throw new Error('sources/claims: expected arrays, max 50');
  const ids = new Set();
  for (const source of sources) {
    text(source.id,40,'source.id'); text(source.title,300,'source.title');
    if (ids.has(source.id)) throw new Error('duplicate source id'); ids.add(source.id);
    if (!/^https?:\/\//i.test(source.url || '')) throw new Error('source.url must be http(s)');
    new URL(source.url);
  }
  for (const claim of claims) {
    text(claim.text,600,'claim.text');
    if (!['supported','hypothesis','unknown'].includes(claim.status)) throw new Error('claim.status: supported/hypothesis/unknown');
    if (!Array.isArray(claim.sources) || claim.sources.some(id=>!ids.has(id))) throw new Error('claim references unknown source');
    if (claim.status === 'supported' && !claim.sources.length) throw new Error('supported claim needs sources');
    // Dates/geography/order are user-authored, not invented by the provider.
    if (claim.date !== undefined) text(claim.date,80,'claim.date');
    if (claim.place !== undefined) text(claim.place,120,'claim.place');
  }
  return {format,genre,narrative,language,duration,characters,episodes,season,
    name:text(opts.name || opts.topic,160,'name'), topic:text(opts.topic,4000,'topic'),
    voiceModel:opts.voiceModel,style:opts.style || 'cinematic-stickman', voiceMode:opts.voiceMode || 'tts', music:opts.music,
    sources:structuredClone(sources),claims:structuredClone(claims),
    context:structuredClone(opts.context || null)};
}

// Contract: provider.generate(brief) -> {beats:[{text,role,evidence}], notes:[]}.
// A future model adapter must return this shape and pass the same validators.
export const ruleProvider = {
  id:'local-rules-v1',
  generate(b) {
    const en = b.language === 'en';
    const documentary = ['documentary','reconstruction'].includes(b.format);
    const heading = b.name;
    if (documentary) {
      const ordered = b.narrative === 'investigation' ? [...b.claims].sort((a,c)=>Number(a.status!=='supported')-Number(c.status!=='supported')) : b.claims;
      const beats = ordered.map((c,i)=>({text:
        `${c.status === 'supported' ? (en?'Source-backed (not independently verified): ':'По источнику (без независимой проверки): ') : c.status === 'hypothesis' ? (en?'Hypothesis: ':'Предположение: ') : (en?'Unknown: ':'Не установлено: ')}${[c.date,c.place,c.text].filter(Boolean).join('. ')}`,
        evidence:{...c,index:i},role:i%b.characters}));
      return {beats:[
        {text:en?`${heading}. Educational account; visuals are schematic.`:`${heading}. Учебный разбор; изображение условное.`,role:0},
        ...beats,
        {text:beats.length ? (en?'Causes and consequences require separate evidence. See the source register.':'Причины и последствия требуют отдельных доказательств. Источники — в материалах проекта.') :
          (en?'No evidence was supplied. Dates, causes and geography are not established. This is a research outline, not a factual film.':'Материалы не предоставлены. Даты, причины и география не установлены. Это заявка на исследование, не факт-фильм.'),role:1%b.characters},
        {text:en?'Open questions remain. No eyewitness quotations have been invented.':'Открытые вопросы остаются. Цитаты очевидцев не выдумывались.',role:2%b.characters},
      ],notes:beats.length?['User-supplied sources are not independently verified']:['Research outline only: no evidence']};
    }
    const episode = b.context?.episode;
    if (b.duration <= 30) return {beats:[
      {text:en?`${heading}. Fiction.`:`${heading}. Вымысел.`,role:0},
      {text:b.topic,role:0},
      {text:en?'We must protect people before taking a risk.':'Сначала защитим людей, потом пойдём на риск.',role:1%b.characters},
      {text:b.context?.outcome || (en?'We found a safer path. The choice has consequences.':'Найден безопасный путь. За выбор придётся отвечать.'),role:2%b.characters},
    ],notes:['Compact rule-based outline; review before production']};
    const ru = [
      `${heading}. ${episode ? `Эпизод ${episode}. ` : ''}Это вымышленная история.`,
      b.context?.previousOutcome || `Замысел истории: ${b.topic}`,
      b.context?.goal || (b.narrative==='character' ? 'Я проверю неизвестность, прежде чем рисковать.' : 'Герой решает проверить неизвестность, прежде чем рисковать.'),
      b.characters > 1 ? 'Напарник предлагает другой путь: сначала защитить людей.' : 'Первый план не срабатывает. Герой ищет безопасный путь.',
      b.characters > 2 ? 'Исследователь сопоставляет наблюдения и находит слабое место плана.' : 'Наблюдение меняет план: действовать придётся вместе.',
      'Герои отказываются от лёгкого решения и принимают ответственность.',
      b.context?.outcome || (episode && episode < b.context.total ? 'Решение принято. Следующая серия проверит его последствия.' : 'Конфликт завершён выбором героев, но цена решения остаётся с ними.'),
    ];
    const eng = [
      `${heading}. ${episode ? `Episode ${episode}. ` : ''}This is a fictional story.`,
      b.context?.previousOutcome || `Story premise: ${b.topic}`,
      b.context?.goal || (b.narrative==='character' ? 'I will investigate before taking a risk.' : 'The protagonist investigates before taking a risk.'),
      b.characters > 1 ? 'The companion proposes another route: protect people first.' : 'The first plan fails. The protagonist seeks a safe route.',
      b.characters > 2 ? 'The researcher compares observations and finds a flaw in the plan.' : 'An observation changes the plan: cooperation is necessary.',
      'The characters reject the easy option and accept responsibility.',
      b.context?.outcome || (episode && episode < b.context.total ? 'A decision is made. The next episode explores its consequences.' : 'Their choice resolves the conflict, but its cost stays with them.'),
    ];
    return {beats:(en?eng:ru).map((text,i)=>({text,role:i%b.characters})),notes:['Generic rule-based dramatic outline; review and author scene text before production']};
  },
};
export function buildProduction(opts, {estimateLine, provider = ruleProvider}) {
  const b = normalizeBrief(opts);
  const script = provider.generate(b);
  if (!Array.isArray(script.beats) || script.beats.length < b.characters) throw new Error('provider: insufficient beats');
  const cast = (opts.cast || [LIB_CHARS.find(c=>c.id==='hero'),LIB_CHARS.find(c=>c.id==='friend'),LIB_CHARS.find(c=>c.id==='doc')].slice(0,b.characters)).map((c,i)=>({...structuredClone(c),productionRole:['protagonist','companion','researcher'][i]}));
  if(cast.length !== b.characters || new Set(cast.map(c=>c.id)).size!==cast.length) throw new Error('continuation cast mismatch');
  const profile = {...VISUAL_PROFILES[b.genre]};
  if (b.style === 'noir') profile.grade='noir';
  if (b.style === 'warm') profile.grade='warm';
  if (b.style === 'vivid') profile.grade='teal_orange';
  // All semantic beats are retained. A too-long brief is rejected, never silently cut.
  const groups = [[],[],[],[]];
  script.beats.forEach((beat,i)=> {
    if (typeof beat.text !== 'string' || !beat.text.trim() || !Number.isInteger(beat.role) || !cast[beat.role]) throw new Error('provider: invalid beat');
    groups[Math.min(3,Math.floor(i*4/script.beats.length))].push(beat);
  });
  const scenes = groups.filter(g=>g.length).map((beats,i)=> {
    const sid=`s${String(i+1).padStart(2,'0')}`;
    return S({id:sid,title:T(['Начало','Развитие','Выбор','Развязка'][i],['Opening','Development','Choice','Resolution'][i]),
      env:{id:profile.envs[i],time: i===0?'dawn':'day'},
      light:L('sun',1300,120,'#c7f5ed','#69daca',0.6,{grade:profile.grade}),ambience:profile.envs[i]==='nature'?'forest':'street',
      actors:cast.map((c,j)=>({char:c.id,x:400+j*460,facing:j===0?'r':'l'})),
      beats:cast.map(c=>({t:0,char:c.id,do:i===2?'think':'idle',emotion:'thinking'})),
      lines:beats.map((beat,j)=>({id:`${sid}_${j+1}`,voice:cast[beat.role].voice,text:T(beat.text,beat.text),pause:0.25,evidence:beat.evidence})),
      shotPlan:[{type:'wide',move:'drift'},{type:'medium',char:cast[i%cast.length].id,move:'push'},{type:'close',char:cast[i%cast.length].id,at:'head',move:'pull'}],
      transition:{in:i===0?'fade':'cut',out:i===3?'fade':'cut'},minDur:2.5});
  });
  const estimate = s=>0.7+s.lines.reduce((sum,l)=>sum+estimateLine(l.text[b.language],l.voice,b.language)+l.pause,0)-0.25+0.9;
  const spoken = scenes.reduce((sum,s)=>sum+Math.max(2.5,estimate(s)),0);
  if (spoken > b.duration*1.05) throw new Error(`Сценарий требует примерно ${Math.ceil(spoken)} сек. Увеличьте длительность или сократите материалы; речь не обрезана.`);
  const pad = Math.max(0,b.duration-spoken)/scenes.length;
  scenes.forEach(s=>s.minDur=Math.max(2.5,estimate(s))+pad);
  return {version:1,id:opts.id,language:b.language,title:T(b.name,b.name),logline:T(b.topic,b.topic),mainIdea:T(b.topic,b.topic),
    idea:{template:'production',topic:b.topic,theme:b.genre},
    production:{schemaVersion:1,continuationFrom:opts.continuationFrom,brief:b,provider:provider.id,notes:script.notes,kind:'film',fiction:!['documentary','reconstruction'].includes(b.format)},
    settings:{duration:b.duration,style:b.style,characters:b.characters,voiceMode:b.voiceMode,voiceModels:b.voiceModel ? Object.fromEntries(cast.map(c=>[c.voice,b.voiceModel])) : {},music:b.music||profile.music,fps:24,width:1920,height:1080},
    characters:cast,voices:LIB_VOICES.filter(v=>cast.some(c=>c.voice===v.id)),references:b.sources,scenes};
}

export function buildSeason(opts, dependencies) {
  const b = normalizeBrief({...opts,format:'series'});
  const projects=[]; let previousOutcome=null;
  const ledger=[];
  const outcomes=b.language==='en' ? ['The group forms an alliance.','Evidence changes their route.','A setback forces a new plan.','They choose to help others.','The team accepts the cost of its choice.','The immediate conflict is resolved.'] :
    ['Герои заключают союз.','Наблюдения меняют маршрут.','Неудача вынуждает изменить план.','Герои решают помочь другим.','Команда принимает цену выбора.','Ближайший конфликт разрешён.'];
  for (let n=1;n<=b.episodes;n++) {
    const id=`${opts.id}-e${String(n).padStart(2,'0')}`;
    if(id.length>40) throw new Error('series id must leave room for -eNN (max 36 characters)');
    const context={season:b.season,episode:n,total:b.episodes,previousOutcome,events:structuredClone(ledger),
      goal:b.language==='en'?`Chapter ${n}: test the previous decision.`:`Глава ${n}: проверить последствия прежнего выбора.`,
      outcome:outcomes[n===b.episodes ? 5 : Math.min(4,Math.floor((n-1)*5/b.episodes))]};
    const p=buildProduction({...b,id,context,name:`${b.name} · ${n}`},dependencies);
    p.production.seriesId=opts.id;
    p.production.context=context;
    p.production.outcome=p.scenes.at(-1).lines.at(-1).text[b.language];
    previousOutcome=p.production.outcome;
    ledger.push({episode:n,event:previousOutcome});
    p.production.characterHistory=p.characters.map(c=>({id:c.id,role:c.productionRole,events:structuredClone(ledger)}));
    projects.push(p);
  }
  const season={version:1,id:opts.id,language:b.language,title:T(b.name,b.name),idea:{template:'series',topic:b.topic,theme:b.genre},
    production:{schemaVersion:1,kind:'season',provider:'local-rules-v1',brief:b,season:b.season,arc:b.topic,
      episodes:projects.map(p=>({id:p.id,context:p.production.context,outcome:p.production.outcome}))},
    settings:projects[0].settings,characters:projects[0].characters,voices:projects[0].voices,scenes:[],references:[]};
  return {season,projects};
}
