// STORY engine: free-form topic → story (IDEA -> SCRIPT for arbitrary themes).
//
// The user's topic always drives the content: it becomes the title premise,
// the logline, the hook headline and is cited throughout the narration.
// Deterministic (hash of the topic), no randomness on re-runs, no external
// APIs.  Three classic templates (gravity / no_sleep / no_internet) live in
// script.mjs and are still used when explicitly requested or when the topic
// clearly matches them; everything else goes through this generator.
//
// Shared scene-authoring helpers (T/at/ln/L/S) are defined here and reused by
// script.mjs so there is a single source of truth for the scene JSON shape.
export const T = (ru, en) => ({ru, en});
export const at = (line, off = 0) => ({line, off});
export const ln = (id, voice, ru, en, extra = {}) => ({id, voice, text: T(ru, en), ...extra});
export const L = (key, x, y, color, rim, intensity, extra = {}) => ({key, x, y, color, rim, intensity, ...extra});
export const S = (o) => ({kind: 'story', transition: {in: 'cut', out: 'cut'}, musicLevel: 0.6, minDur: 4, props: [], pstates: [], sfx: [], beats: [], shots: [], lines: [], fx: [], ...o});

// ---------------------------------------------------------------- topic analysis

// NOTE: \b does not work with Cyrillic in JS — use explicit space/end checks.
const WHAT_IF = [/^(?:а\s+)?что\s+если(?:\s|$)/i, /^что\s+будет,\s*если(?:\s|$)/i, /^что\s+будет\s+если(?:\s|$)/i];
const WHAT_IF_EN = [/^what\s+if(?:\s|$)/i, /^what\s+would\s+happen\s+if(?:\s|$)/i];
// A leading preposition ("про динозавров", "о роботах") means the topic is not
// a nominative phrase — verb-agreement premise frames would be ungrammatical,
// so we use a citation frame instead.
const PREP = /^(?:про|обо|об|о|для|без|из|после|перед|над|под|при|по|у|к|с|до|на|в|вне|like|about|of|on|in|for)\s+/i;

const lastWord = (s) => (s.trim().match(/[\p{L}][\p{L}\-']*$/u) || [''])[0];

// Russian number heuristic for verb agreement: plural (-ы/-и), feminine
// singular (-а/-я), masculine/neuter (the rest).  Good enough for topics.
function ruNumber(phrase) {
  const w = lastWord(phrase).toLowerCase();
  if (!w) return 'm';
  if (/[ыи]$/.test(w)) return 'pl';
  if (/[ая]$/.test(w)) return 'f';
  return 'm';
}

// English: trailing 's' that is not ss/us/is → plural (cats, trees); works for
// the vast majority of topic nouns; past-tense frames avoid the issue anyway.
function enNumber(phrase) {
  const w = lastWord(phrase).toLowerCase();
  if (!w) return 'sing';
  return /(s)$/.test(w) && !/(ss|us|is|ys)$/.test(w) ? 'pl' : 'sing';
}

// ---------------------------------------------------------------- domains

const DOMAINS = [
  {
    id: 'animals',
    keywords: /динозавр|динозав|зверь|звер[еяи]|волк|волч|медвед|лис(?!т)|кошк|кот[а-я]*|собак|птиц|птич|рыб(?!ц)|заяц|енот|лось|олен|тигр|слон|панд|дельфин|кит|обезьян|змей|ящер|крокодил|белк|пингвин|бегемот|жираф|бабоч|мурав|пчел|паук|мыш(?!ь)|dinosaur|wolf|bear|fox|cats?|dogs?|birds?|fish|animal|tiger|lion|elephant|panda|dolphin|whale|monkey|snake|horse|deer|eagle|squirrel|penguin|insect|butterfly/i,
    music: 'mystery', expert: 'doc',
    climaxEnv: {env: 'nature', time: 'day'}, fx: ['embers'],
    premise: {
      ru: (T2, num) => num === 'pl'
        ? `Что если ${T2} вернутся туда, откуда их забыли?`
        : `Что если ${T2} вернётся туда, откуда его забыли?`,
      en: (T2) => `What if ${T2} came back?`,
    },
    logline: {
      ru: 'Ты решаешь проверить это сам — и каждая минута делает хуже.',
      en: 'You decide to check it yourself — and every minute makes it worse.',
    },
    mainIdea: {ru: 'Природа возвращает долги тише, чем мы ждём.', en: 'Nature repays its debts quieter than we expect.'},
    explain: {
      ru: 'Природа не повторяет ошибки. Если это вернулось — значит, для этого есть причина.',
      en: 'Nature never repeats mistakes. If it came back, it came back for a reason.',
    },
    sighting: {
      ru: 'Первый раз ты видишь это своими глазами: «{T}». Не в экране — вживую.',
      en: 'For the first time you see it with your own eyes: "{T}". Not on a screen — right here.',
    },
    develop: {
      ru: ['Учёные наблюдают за животными в новой среде.', 'Людям и животным придётся делить пространство.'],
      en: ['Scientists observe the animals in their new environment.', 'People and animals will have to share space.'],
    },
  },
  {
    id: 'nature',
    develop: {ru: ['Фермеры первыми замечают перемены.', 'Города меняют планы защиты от стихии.'], en: ['Farmers notice the changes first.', 'Cities revise their disaster plans.']},
    keywords: /лес(?!н)|дерев[ья]|океан|мор[еяюем]|рек[аиу]|вулкан|погод|климат|ледник|пустын|облак|дожд|снег|гроз|засух|наводнен|пляж|озер|цвет[ы]|природ/i,
    music: 'emotional', expert: 'doc',
    climaxEnv: {env: 'street', time: 'night', weather: 'storm'}, fx: ['fog'],
    premise: {
      ru: (T2, num) => `Что если ${T2} ${num === 'pl' ? 'изменятся' : 'изменится'} навсегда?`,
      en: (T2) => `What if ${T2} changed forever?`,
    },
    logline: {
      ru: 'Сначала это выглядит как случайность. Потом — как закономерность.',
      en: 'At first it looks like an accident. Then — like a pattern.',
    },
    mainIdea: {ru: 'Мы живём внутри системы и замечаем её только когда она меняется.', en: 'We live inside a system and only notice it when it changes.'},
    explain: {
      ru: 'Целое не ломается внезапно. Оно предупреждает долго и тихо.',
      en: 'Whole systems do not break suddenly. They warn quietly, for a long time.',
    },
    sighting: {
      ru: '«{T}» — теперь это можно увидеть невооружённым глазом.',
      en: '"{T}" — now you can see it with the naked eye.',
    },
  },
  {
    id: 'space',
    keywords: /космос|космическ|звёзд|звезд|планет|солнц|луны|лунн|марс|астероид|комет|галактик|спутник|орбит|астронав|чёрн.{0,4}дыр|черн.{0,4}дыр|space|stars?|planets?|sun|moon|mars|asteroid|comet|galax|orbit|astronaut|rocket/i,
    music: 'epic', expert: 'doc',
    climaxEnv: {env: 'station', time: 'indoor'}, fx: [],
    premise: {
      ru: (T2) => `Что если ${T2} ближе, чем мы думали?`,
      en: (T2) => `What if ${T2} were closer than we thought?`,
    },
    logline: {
      ru: 'Ответ приходит не с неба — он приходит с пониманием, что небо рядом.',
      en: 'The answer comes not from above, but from realising the sky is close.',
    },
    mainIdea: {ru: 'Бесконечность измеряется не расстоянием, а вниманием.', en: 'Infinity is measured not by distance, but by attention.'},
    explain: {
      ru: 'В космосе всё считается заранее. Ошибка — это всегда вопрос времени.',
      en: 'In space everything is calculated in advance. An error is always a question of time.',
    },
    sighting: {
      ru: '«{T}» — больше не теория. Это можно измерить.',
      en: '"{T}" — no longer a theory. It can be measured.',
    },
  },
  {
    id: 'tech',
    keywords: /робот|искусственн|интеллект|нейросет|компьютер|программ|интернет|телефон|смартфон|приложени|вирус|хакер|технолог|цифров|автоматиз|машин[аы] обуч|robot|artificial intelligence|computer|software|internet|phone|app|technolog|digital|hacker|cyber|drone|gadget|algorith/i,
    music: 'tense', expert: 'doc',
    climaxEnv: {env: 'city', time: 'night'}, fx: ['fog'],
    premise: {
      ru: (T2, num) => `Что если ${T2} ${num === 'pl' ? 'выйдут' : 'выйдет'} из-под контроля?`,
      en: (T2) => `What if ${T2} got out of control?`,
    },
    logline: {
      ru: 'Технология обещала экономить время. Однажды она решит, что знает лучше.',
      en: 'The technology promised to save time. One day it decides it knows better.',
    },
    mainIdea: {ru: 'Любая система однажды делает то, для чего её не создавали.', en: 'Every system eventually does what it was never built for.'},
    explain: {
      ru: 'Любая система однажды делает то, для чего её не создавали. Вопрос лишь в том, кто это заметит.',
      en: 'Any system eventually does what it was never built for. The only question is who notices.',
    },
    sighting: {
      ru: '«{T}» — теперь это работает без тебя. И без твоего разрешения.',
      en: '"{T}" — now it works without you. And without your permission.',
    },
  },
  {
    id: 'food',
    keywords: /еда|кухн|шоколад|пицц|торт|кекс|пирож|мясо|фрукт|овощ|ягод|морожен|конфет|сахар|кофе|чай(?!ник)|завтрак|ужин|обед|ресторан|пельмен|салат|хлеб|supper|chocolate|food|pizza|coffee|cake|fruit|vegetable|cooking|kitchen|dinner|lunch|breakfast|restaurant|burger|sugar|meat|soup|bread|candy/i,
    music: 'lofi', expert: 'boss',
    climaxEnv: {env: 'kitchen', time: 'night'}, fx: [],
    premise: {
      ru: (T2, num) => `Что если ${T2} ${num === 'pl' ? 'исчезнут' : 'исчезнет'} с наших столов?`,
      en: (T2) => `What if ${T2} disappeared from our tables?`,
    },
    logline: {
      ru: 'Привычный вкус становится роскошью — и это только первая неприятность.',
      en: 'An ordinary taste becomes a luxury — and that is only the first problem.',
    },
    mainIdea: {ru: 'Мы ценим то, что стоит на столе каждый день, только когда пусто.', en: 'We value what sits on the table daily only when it is gone.'},
    explain: {
      ru: 'Привычка сильнее рецепта. Уберите привычку — и исчезнет всё остальное.',
      en: 'Habit is stronger than any recipe. Remove the habit and the rest disappears.',
    },
    sighting: {
      ru: '«{T}» — теперь об этом говорят даже на кухнях.',
      en: '"{T}" — now even kitchens are talking about it.',
    },
  },
  {
    id: 'sport',
    keywords: /спорт|марафон|футбол|баскетбол|хоккей|олимпиад|тренер|трениров|гимнаст|плаван|прыжк|соревнован|стадион|(?<![а-яё])бег|бокс|йога|фитнес|лыж|athlet|marathon|sport|football|soccer|basketball|hockey|olympic|training|workout|swimming|competition|boxing|yoga/i,
    music: 'epic', expert: 'boss',
    climaxEnv: {env: 'stadium', time: 'day'}, fx: [],
    premise: {
      ru: (T2, num) => `Что если ${T2} ${num === 'pl' ? 'станут' : 'станет'} главным событием года?`,
      en: (T2) => `What if ${T2} became the event of the year?`,
    },
    logline: {
      ru: 'Тренировки были ради часа. Этот час наступает — и он необратим.',
      en: 'The training was for one hour. That hour arrives — and it cannot be undone.',
    },
    mainIdea: {ru: 'Победа начинается задолго до финиша — в моменте, когда все смотрят.', en: 'Victory starts long before the finish — in the moment everyone is watching.'},
    explain: {
      ru: 'Форма — это не талант. Это тысяча повторений, которых никто не видел.',
      en: 'Form is not talent. It is a thousand repetitions nobody ever saw.',
    },
    sighting: {
      ru: '«{T}» — и трибуны понимают это раньше тебя.',
      en: '"{T}" — and the stands understand it before you do.',
    },
  },
  {
    id: 'health',
    keywords: /здоров|больниц|врач|мозг|организм|иммунитет|бессон|диет|болез|вирус|доктор|анализ|лекарств|пациент|health|disease|doctor|hospital|medicine|pandemic|immunity|clinic|nurse/i,
    music: 'dark_ambient', expert: 'doc',
    climaxEnv: {env: 'hospital', time: 'indoor'}, fx: [],
    premise: {
      ru: (T2) => `Что если ${T2} серьёзнее, чем все думают?`,
      en: (T2) => `What if ${T2} were more serious than anyone thought?`,
    },
    logline: {
      ru: 'Первый симптому — это шутка. Второй — уже нет.',
      en: 'The first symptom is a joke. The second one is not.',
    },
    mainIdea: {ru: 'Тело говорит тихо. Проблема в том, что мы включаем его только когда кричит.', en: 'The body speaks quietly. The problem is we only hear it scream.'},
    explain: {
      ru: 'Организм не спорит. Он запоминает каждое «потом».',
      en: 'The body does not argue. It remembers every "later".',
    },
    sighting: {
      ru: '«{T}» — и впервые ты читаешь это без улыбки.',
      en: '"{T}" — and for the first time you read it without smiling.',
    },
  },
  {
    id: 'society',
    keywords: /деньг|власт|реклам|школ|работ|офис|компан|бизнес|рынок|закон|полиц|начальник|зарплат|налог|полит|труд|город|money|society|government|work|office|school|business|market|police|law|election|advertis|salary|boss|crowd/i,
    music: 'tense', expert: 'boss',
    climaxEnv: {env: 'city', time: 'dusk'}, fx: ['fog'],
    premise: {
      ru: (T2) => `Что если ${T2} меняет всё вокруг?`,
      en: (T2) => `What if ${T2} changed everything around us?`,
    },
    logline: {
      ru: 'Правила перестают работать раньше, чем мы перестаём их соблюдать.',
      en: 'The rules stop working before we stop following them.',
    },
    mainIdea: {ru: 'Общество держится не на законах, а на привычке верить друг другу.', en: 'Society runs not on laws, but on the habit of trusting each other.'},
    explain: {
      ru: 'Любой порядок — это привычка. Отнимите привычку — и порядок исчезнет за день.',
      en: 'Any order is a habit. Take the habit away and the order is gone in a day.',
    },
    sighting: {
      ru: '«{T}» — и впервые все думают об одном и том же.',
      en: '"{T}" — and for the first time everyone is thinking about the same thing.',
    },
    develop: {
      ru: ['На площадях появляются очереди. На экранах — одни и те же лица.', 'Люди впервые за долгое время говорят друг с другом по-настоящему.'],
      en: ['Queues appear in the squares. The same faces fill the screens.', 'People talk to each other for real — for the first time in a long while.'],
    },
  },
  {
    id: 'transport',
    keywords: /машин|автомобил|поезд|самол|метро|дорог|корабл|велосипед|автобус|аэропорт|перелёт|перелет|traffic|cars?|trains?|planes?|subway|ships?|trucks?|buses?|highway|airport|aviation/i,
    music: 'tense', expert: 'doc',
    climaxEnv: {env: 'street', time: 'night', weather: 'storm'}, fx: ['fog'],
    premise: {
      ru: (T2, num) => `Что если ${T2} ${num === 'pl' ? 'остановятся' : 'остановится'} на один день?`,
      en: (T2) => `What if ${T2} stopped for a single day?`,
    },
    logline: {
      ru: 'Город привык двигаться. День, когда всё стоит, обходится дороже, чем кажется.',
      en: 'The city is used to moving. The day everything stands still costs more than it seems.',
    },
    mainIdea: {ru: 'Скорость — это привычка. Отвыкнуть от неё сложнее, чем от двигателя.', en: 'Speed is a habit. Unlearning it is harder than switching off an engine.'},
    explain: {
      ru: 'Движение — это договор между миллионами. Один сбой — и договора нет.',
      en: 'Movement is a contract between millions. One failure and the contract is gone.',
    },
    sighting: {
      ru: '«{T}» — и город впервые замирает целиком.',
      en: '"{T}" — and for the first time the whole city freezes.',
    },
    develop: {
      ru: ['Дороги закрывают по одной. Водители ищут объезды.', 'Вокзалы гудят. Поезда уходят раньше расписания.'],
      en: ['Roads close one by one. Drivers look for detours.', 'Stations hum. Trains leave ahead of schedule.'],
    },
  },
  {
    id: 'science',
    keywords: /наук|физик|хими|эксперимент|лаборатор|атом|молекул|теори|исследован|учёные|ученые|формул|science|experiment|physics|chemistry|laborator|atom|molecule|theor|research|scientist/i,
    music: 'mystery', expert: 'doc',
    climaxEnv: {env: 'station', time: 'indoor'}, fx: [],
    premise: {
      ru: (T2) => `Что если ${T2} не то, чем кажутся?`,
      en: (T2) => `What if ${T2} were not what they seemed?`,
    },
    logline: {
      ru: 'Гипотеза была красивой. Данные — нет.',
      en: 'The hypothesis was beautiful. The data was not.',
    },
    mainIdea: {ru: 'Наука начинается там, где заканчивается удобный ответ.', en: 'Science begins where the convenient answer ends.'},
    explain: {
      ru: 'Факт не спорит с мнением. Он просто ждёт, когда его проверят.',
      en: 'A fact does not argue with an opinion. It just waits to be checked.',
    },
    sighting: {
      ru: '«{T}» — результат воспроизводится. Значит, это не совпадение.',
      en: '"{T}" — the result reproduces. Which means it is not a coincidence.',
    },
  },
  {
    id: 'art',
    keywords: /кино|фильм|музык|песн|книг|книж|картин|искусств|театр|актер|актёр|режисс|подкаст|блог|ютуб|видеоигр|art|music|movies?|films?|songs?|books?|painting|theater|theatre|actor|director|podcast|blog|youtube|video game|games?/i,
    music: 'emotional', expert: 'boss',
    climaxEnv: {env: 'city', time: 'night'}, fx: ['fog'],
    premise: {
      ru: (T2, num) => `Что если ${T2} ${num === 'pl' ? 'исчезнут' : 'исчезнет'} из нашей жизни?`,
      en: (T2) => `What if ${T2} vanished from our lives?`,
    },
    logline: {
      ru: 'Сначала его не замечают. Потом не могут без него.',
      en: 'First nobody notices it. Then nobody can live without it.',
    },
    mainIdea: {ru: 'Культура — это память в формате привычки.', en: 'Culture is memory in the shape of habit.'},
    explain: {
      ru: 'Искусство не умирает громко. Оно просто перестаёт находить зрителя.',
      en: 'Art does not die loudly. It simply stops finding an audience.',
    },
    sighting: {
      ru: '«{T}» — и город звучит иначе.',
      en: '"{T}" — and the city sounds different.',
    },
  },
  {
    id: 'general',
    develop: {ru: ['Люди проверяют сообщения очевидцев.', 'Приходится пересматривать привычные правила.'], en: ['People check eyewitness reports.', 'Familiar rules need to be reconsidered.']},
    keywords: /$^/, // never matches — fallback
    music: 'tense', expert: 'doc',
    climaxEnv: {env: 'street', time: 'night'}, fx: ['fog'],
    premise: {
      ru: (T2, num) => num === 'pl'
        ? `Что если ${T2} окажутся важнее, чем ты думаешь?`
        : `Что если ${T2} окажется важнее, чем ты думаешь?`,
      en: (T2) => `What if ${T2} mattered more than you think?`,
    },
    logline: {
      ru: 'Ты решаешь разобраться сам — но чем дальше, тем страннее.',
      en: 'You decide to look into it yourself — but the deeper you go, the stranger it gets.',
    },
    mainIdea: {ru: 'Всё, что кажется далёким, однажды приходит к твоей двери.', en: 'Everything distant eventually knocks on your door.'},
    explain: {
      ru: 'У всего есть причина. Вопрос лишь в том, готовы ли ты её услышать.',
      en: 'Everything has a cause. The only question is whether you are ready to hear it.',
    },
    sighting: {
      ru: '«{T}» — теперь это можно увидеть невооружённым глазом.',
      en: '"{T}" — now you can see it with the naked eye.',
    },
  },
];

export const DOMAIN_IDS = DOMAINS.map((d) => d.id);

export function classifyDomain(topic) {
  for (const d of DOMAINS) if (d.keywords.test(topic)) return d;
  return DOMAINS[DOMAINS.length - 1];
}

// Light presets per env:time used by the free-form scenes.
const LIGHTS = {
  'bedroom:dawn': () => L('sun', 1370, 150, '#ffd8a8', '#ffc58a', 0.6, {grade: 'dawn'}),
  'bedroom:night': () => L('moon', 1370, 200, '#9ab4ff', '#7aa8ff', 0.6, {grade: 'cold'}),
  'street:day': () => L('sun', 1500, 100, '#fff0c0', '#ffd38a', 0.7, {grade: 'teal_orange'}),
  'street:night': () => L('neon', 300, 300, '#ff4d6d', '#ff6a88', 0.65, {flicker: 0.4, grade: 'noir'}),
  'office:day': () => L('screen', 930, 470, '#8fd8ff', '#6ac4ff', 0.5, {grade: 'cold'}),
  'kitchen:day': () => L('sun', 950, 200, '#fff0c0', '#ffd38a', 0.6, {grade: 'warm'}),
  'kitchen:night': () => L('lamp', 560, 330, '#ffd9a0', '#ffb86a', 0.7, {flicker: 0.2, grade: 'warm'}),
  'city:dusk': () => L('sun', 200, 300, '#ff9a5a', '#ff8a4a', 0.75, {grade: 'dusk'}),
  'city:night': () => L('neon', 1200, 300, '#7ab8ff', '#6ac4ff', 0.6, {flicker: 0.35, grade: 'noir'}),
  'hospital:indoor': () => L('lamp', 1000, 60, '#e8fbff', '#9fe8ff', 0.5, {grade: 'sick', flicker: 0.3}),
  'nature:night': () => L('moon', 400, 150, '#9ab4ff', '#7aa8ff', 0.55, {grade: 'cold'}),
  'nature:day': () => L('sun', 1500, 150, '#fff6d0', '#ffffff', 0.8, {grade: 'teal_orange'}),
  'nature:dusk': () => L('sun', 200, 400, '#ff9a5a', '#ffb070', 0.7, {grade: 'dusk'}),
  'nature:dawn': () => L('sun', 1500, 300, '#ffd8a8', '#ffc58a', 0.7, {grade: 'dawn'}),
  'station:indoor': () => L('emergency', 1400, 200, '#9aff7a', '#b6ff8a', 0.5, {grade: 'space', pulse: {color: '#7aff5a', period: 3.2}}),
  'stadium:day': () => L('sun', 1500, 150, '#fff0c0', '#ffd38a', 0.7, {grade: 'teal_orange'}),
  'school:indoor': () => L('lamp', 960, 150, '#ffe9c0', '#ffd9a0', 0.6, {grade: 'warm'}),
};
export const lightFor = (env, time) => (LIGHTS[`${env}:${time}`] || LIGHTS['street:day'])();

// Ambience bed per environment (ids understood by tools/mixer.py).
const AMBIENCE = {
  bedroom: 'room_night', kitchen: 'room_night', office: 'office', school: 'office',
  street: 'street', city: 'city', stadium: 'city', hospital: 'hospital',
  station: 'city', nature: 'forest', void: 'silence',
};

// ---------------------------------------------------------------- analysis

/**
 * Analyse a user topic. Returns:
 *   raw       — cleaned topic string (user's words, case preserved)
 *   low       — lower-cased topic
 *   isWhatIf  — the topic already is a "what if …" premise
 *   prep      — starts with a preposition (not a nominative phrase)
 *   num       — 'pl' | 'f' | 'm' (ru heuristic) — used for verb agreement
 *   domain    — domain pack id
 *   pack      — the domain pack object
 *   premise   — {ru, en} L10n question that anchors the whole story
 */
export function analyzeTopic(topic, lang = 'ru') {
  const raw = String(topic || '').replace(/[\u0022\u0027\u201c\u201d\u2018\u2019«»]/g, ' ').replace(/\s+/g, ' ').trim();
  const low = raw.toLowerCase();
  const isWhatIf = (lang === 'en' ? WHAT_IF_EN : WHAT_IF).some((re) => re.test(raw)) ||
    WHAT_IF.some((re) => re.test(raw)) || WHAT_IF_EN.some((re) => re.test(raw));
  const prep = PREP.test(low);
  const num = /[а-яё]/i.test(raw) ? ruNumber(raw) : enNumber(raw);
  const pack = classifyDomain(raw || low);
  const body = raw.replace(/^(?:а\s+)?(?:что\s+если|что\s+будет,\s*если|что\s+будет\s+если)\s*/i, '')
    .replace(/^what\s+(?:if|would\s+happen\s+if)\s*/i, '').replace(/[?!.]+$/, '').trim() || raw;
  const premise = premiseOf(raw, body, pack, num, isWhatIf, prep);
  return {raw, body, low, isWhatIf, prep, num, domain: pack.id, pack, premise, lang};
}

function premiseOf(raw, body, pack, num, isWhatIf, prep) {
  const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
  if (isWhatIf) {
    // Keep the user's own "what if …" phrasing verbatim as the premise.
    const q = raw.endsWith('?') ? raw : `${raw}?`;
    return {ru: cap(q), en: cap(q)};
  }
  if (prep) {
    return {
      ru: cap(`Что если это правда: ${body}?`),
      en: cap(`What if it is true: ${body}?`),
    };
  }
  // Preserve the premise instead of appending a domain-specific verb.
  return {ru: cap(`Что если: ${body}?`), en: cap(`What if: ${body}?`)};
}

// ---------------------------------------------------------------- story scenes

// Compose the ordered scene definitions for a free-form topic.
// Returns {defs, extras} where defs are required/optional scenes in dramatic
// order and extras are appended only when the requested duration needs them.
export function buildStoryScenes(A, {nChars = 2, compact = false} = {}) {
  // Specific causal beats must not leak into unrelated animal stories.
  const dinosaursReturn = /динозавр|dinosaur/i.test(A.raw) && /верн|возвра|return|back/i.test(A.raw);
  const pack = dinosaursReturn ? {...A.pack,
    develop: {
      ru: ['Динозавры выходят на улицы. Движение перекрыто.', 'Городу нужны ограды, а динозаврам — заповедники.'],
      en: ['Dinosaurs enter the streets. Traffic stops.', 'The city needs fences; dinosaurs need reserves.'],
    },
  } : {...A.pack, develop: A.pack.develop || {
    ru: [A.pack.explain.ru, A.pack.mainIdea.ru],
    en: [A.pack.explain.en, A.pack.mainIdea.en],
  }};
  const topic = A.raw;
  const expertId = pack.expert;
  const sightingRu = pack.sighting.ru.replace('{T}', () => topic);
  const sightingEn = pack.sighting.en.replace('{T}', () => topic);

  const defs = [
    // 1) HOOK — the headline that starts everything (proven bedroom pattern).
    {n: 'hook', scene: S({
      title: T(topic || 'Утро', topic || 'Morning'), env: {id: 'bedroom', time: 'dawn'},
      light: lightFor('bedroom', 'dawn'), ambience: 'room_night', minDur: 8, musicLevel: 0.4,
      actors: [{char: 'hero', x: 640, facing: 'r', start: 'sleep', seatH: 62}],
      props: [
        {id: 'bed', kind: 'bed', x: 600, on: 'floor', color: '#4b3f6b'},
        {id: 'ns', kind: 'table', x: 905, on: 'floor', scale: 0.38, color: '#5a3d2b'},
        {id: 'ph', kind: 'phone', x: 905, on: 'ns'},
      ],
      lines: [
        ln('a', 'narrator', `Ты открываешь экран — и одна фраза уже везде: «${topic}».`, `You unlock your screen — and one phrase is everywhere: "${topic}".`),
        ln('b', 'narrator', 'Сначала ты смеёшься. Потом читаешь ещё раз. И больше не смеёшься.', 'At first you laugh. Then you read it again. Then you stop laughing.', {pause: 0.5}),
      ],
      beats: [
        {t: 0, char: 'hero', do: 'sleep', seatH: 62, emotion: 'tired'},
        {t: at('a', 0.5), char: 'hero', do: 'sit_up', seatH: 62, emotion: 'neutral', look: {prop: 'ph'}},
        {t: at('a', 1.4), char: 'hero', do: 'reach', seatH: 62, hold: {prop: 'ph', hand: 'r'}, look: {prop: 'ph'}},
        {t: at('b', 0), char: 'hero', do: 'sit', seatH: 62, emotion: 'surprised', look: {prop: 'ph'}},
        {t: at('b', 3.4), char: 'hero', do: 'slump', emotion: 'scared', look: 'down'},
      ],
      sfx: [{t: at('a', 1.5), kind: 'sting', gain: 0.6}, {t: at('b', 0.4), kind: 'heartbeat', gain: 0.6}],
      shotPlan: [{type: 'establishing', move: 'push'}, {type: 'medium', char: 'hero'}, {type: 'insert', prop: 'ph', move: 'push'}, {type: 'close', char: 'hero', at: 'head', move: 'push'}],
      transition: {in: 'cut', out: 'dip'},
    })},

    // 2) ENCOUNTER — see it with one's own eyes in the street.
    {n: 'encounter', scene: S({
      title: T('Первый раз', 'First sight'), env: {id: 'street', time: 'day'},
      light: lightFor('street', 'day'), ambience: 'street', minDur: 6,
      actors: [{char: 'hero', x: 150, facing: 'r'}],
      lines: [
        ln('a', 'narrator', pack.develop.ru[0], pack.develop.en[0]),
        ln('b', 'narrator', sightingRu, sightingEn, {pause: 0.4}),
      ],
      beats: [
        {t: 0.3, char: 'hero', do: 'walk', to: 1500, dur: 6.5, speed: 210, emotion: 'neutral', look: 'forward'},
        {t: at('b', 0.4), char: 'hero', do: 'idle', emotion: 'surprised', look: 'up'},
        {t: at('b', 2.2), char: 'hero', do: 'point', emotion: 'scared', look: 'up'},
      ],
      sfx: [{t: at('b', 0.4), kind: 'whoosh', gain: 0.55}],
      shotPlan: [{type: 'wide', char: 'hero', move: 'pan'}, {type: 'medium', char: 'hero', move: 'dolly'}, {type: 'close', char: 'hero', at: 'head', move: 'push'}],
      transition: {in: 'cut', out: 'cut'},
    })},

    // 3) DISCOVERY — everyone is talking about it (optional).
    {n: 'discovery', opt: 1, scene: S({
      title: T('Все об этом', 'Everyone knows'), env: {id: 'office', time: 'day'},
      light: lightFor('office', 'day'), ambience: 'office', musicLevel: 0.65,
      actors: [{char: 'hero', x: 640, facing: 'r'}],
      props: [{id: 'desk', kind: 'desk', x: 930, on: 'floor', color: '#5a4636'}, {id: 'lp', kind: 'laptop', x: 930, on: 'desk'}],
      lines: [
        ln('a', 'narrator', `К полудню у каждого на экране одна и та же новость: «${topic}».`, `By noon every screen shows the same news: "${topic}".`),
        ln('b', 'narrator', 'Ты открываешь десяток вкладок. Везде одно и то же.', 'You open a dozen tabs. It is the same everywhere.'),
      ],
      beats: [
        {t: 0.3, char: 'hero', do: 'idle', emotion: 'thinking', look: {prop: 'lp'}},
        {t: at('a', 1.3), char: 'hero', do: 'type', emotion: 'neutral', look: {prop: 'lp'}},
        {t: at('b', 0.4), char: 'hero', do: 'think', emotion: 'tired', look: 'down'},
      ],
      sfx: [{t: at('a', 1.4), kind: 'keyboard', gain: 0.4}, {t: at('b', 1.6), kind: 'click', gain: 0.5}],
      shotPlan: [{type: 'wide', move: 'drift', focus: {x: 930, y: 520}}, {type: 'medium', char: 'hero'}, {type: 'insert', prop: 'lp', move: 'push'}, {type: 'close', char: 'hero', at: 'head'}],
      counter: {label: T('Источников', 'Sources'), from: 3, to: 40, format: 'int'},
    })},

    // 4) DIALOG — talk it over with a friend (needs the friend in the cast).
    {n: 'dialog', opt: 3, needs: ['friend'], scene: S({
      title: T('Разговор', 'A conversation'), env: {id: 'kitchen', time: 'day'},
      light: lightFor('kitchen', 'day'), ambience: 'room_night', musicLevel: 0.55,
      actors: [{char: 'hero', x: 300, facing: 'r'}, {char: 'friend', x: 1350, facing: 'l'}],
      props: [{id: 'tb', kind: 'table', x: 900, on: 'floor', color: '#7b5a3a'}, {id: 'cup', kind: 'cup', x: 840, on: 'tb'}],
      lines: [
        ln('a', 'friend', `Ты тоже это видел? «${topic}». Я не спала всю ночь.`, `Did you see it too? "${topic}". I could not sleep all night.`),
        ln('b', 'hero', 'Я тоже. Думаю, это только начинается.', 'Me neither. I think this is only starting.'),
        ln('c', 'narrator', 'Впервые за долгое время вы говорите об одном и том же.', 'For the first time in a long while you are talking about the same thing.', {pause: 0.5}),
      ],
      beats: [
        {t: 0.3, char: 'hero', do: 'idle', emotion: 'thinking', look: {char: 'friend'}},
        {t: 0.3, char: 'friend', do: 'idle', emotion: 'scared', look: {char: 'hero'}},
        {t: at('a', 0.5), char: 'friend', do: 'point', emotion: 'surprised'},
        {t: at('b', 0.3), char: 'hero', do: 'shrug', emotion: 'sad'},
        {t: at('c', 0.2), char: 'hero', do: 'think', emotion: 'tired', look: 'down'},
        {t: at('c', 0.2), char: 'friend', do: 'cross_arms', emotion: 'sad', look: {char: 'hero'}},
      ],
      shotPlan: [{type: 'wide', move: 'drift', focus: {x: 900, y: 520}}, {type: 'medium', char: 'friend', move: 'dolly'}, {type: 'medium', char: 'hero'}, {type: 'close', char: 'hero', at: 'head', move: 'push'}],
    })},

    // 5) ESCALATION — the city freezes (optional).
    {n: 'escalation', opt: 4, scene: S({
      title: T('Без шуток', 'No more jokes'), env: {id: 'city', time: 'dusk'},
      light: lightFor('city', 'dusk'), ambience: 'city', musicLevel: 0.8, transition: {in: 'dip', out: 'cut'},
      actors: [{char: 'hero', x: 150, facing: 'r'}],
      lines: [
        ln('a', 'narrator', `К вечеру шутки смолкают. «${topic}» больше не новость — это фон.`, `By evening the jokes stop. "${topic}" is no longer news — it is the background.`),
        ln('b', 'narrator', 'Город замирает. Везде одно и то же выражение лица.', 'The city freezes. Everyone wears the same face.'),
      ],
      beats: [
        {t: 0.3, char: 'hero', do: 'walk', to: 1300, dur: 6, speed: 190, emotion: 'tired'},
        {t: at('a', 3.4), char: 'hero', do: 'idle', emotion: 'scared', look: 'back'},
        {t: at('b', 0.4), char: 'hero', do: 'cower', emotion: 'panic', look: 'up'},
      ],
      sfx: [{t: at('b', 0.2), kind: 'sting', gain: 0.55}],
      shotPlan: [{type: 'wide', char: 'hero', move: 'pan', angle: 'low'}, {type: 'medium', char: 'hero', move: 'drift'}, {type: 'close', char: 'hero', at: 'head', move: 'handheld'}],
      counter: {label: T('Уровень тревоги', 'Alarm level'), from: 15, to: 85, format: 'percent', danger: true},
    })},

    // 6) EXPERT — an explanation (needs the expert from the cast).
    {n: 'expert', opt: 2, needs: [expertId], scene: S({
      title: T('Объяснение', 'The explanation'), env: {id: 'hospital', time: 'indoor'},
      light: lightFor('hospital', 'indoor'), ambience: 'hospital', musicLevel: 0.5,
      actors: [{char: 'hero', x: 700, facing: 'r', start: 'sit', seatH: 62}, {char: expertId, x: 1230, facing: 'l'}],
      props: [{id: 'hb', kind: 'bed', x: 690, on: 'floor', color: '#cfd8dc'}],
      lines: [
        ln('a', 'narrator', 'В кабинете пахнет дезинфекцией и плохой новостью.', 'The office smells of disinfectant and bad news.'),
        ln('b', expertId, pack.explain.ru, pack.explain.en, {optional: true}),
        ln('c', 'hero', 'Значит, всё это правда?', 'So all of this is real?'),
      ],
      beats: [
        {t: 0.2, char: 'hero', do: 'sit', seatH: 62, emotion: 'tired', look: 'down'},
        {t: 0.2, char: expertId, do: 'idle', emotion: 'neutral', look: {char: 'hero'}},
        {t: at('a', 1.7), char: expertId, do: 'shrug', emotion: 'thinking'},
        {t: at('b', 0.3), char: expertId, do: 'point', emotion: 'sad'},
        {t: at('c', 0), char: 'hero', do: 'think', seatH: 62, emotion: 'scared', look: 'forward'},
      ],
      sfx: [{t: at('a', 0.3), kind: 'beep', gain: 0.35}, {t: at('a', 1.9), kind: 'beep', gain: 0.35}],
      shotPlan: [{type: 'wide', move: 'dolly', focus: {x: 960, y: 520}}, {type: 'medium', char: expertId}, {type: 'close', char: 'hero', at: 'head', move: 'push'}],
    })},

    // 7) TWIST — silence before the climax (optional but dropped last).
    {n: 'twist', opt: 5, scene: S({
      title: T('Поворот', 'The turn'), env: {id: 'nature', time: 'night'},
      light: lightFor('nature', 'night'), ambience: 'forest', musicLevel: 0.5, silence: true,
      transition: {in: 'fade', out: 'cut'},
      actors: [{char: 'hero', x: 900, facing: 'r'}],
      lines: [
        ln('a', 'narrator', `Странно: шум притихает первым. «${topic}» — не конец. Это начало.`, `Strange: the noise fades first. "${topic}" is not the end. It is the beginning.`, {pause: 0.6}),
        ln('b', 'narrator', 'Ты перестаёшь бояться. Именно это и страшно.', 'You stop being afraid. That is what is truly scary.'),
      ],
      beats: [
        {t: 0, char: 'hero', do: 'idle', emotion: 'thinking', look: 'up'},
        {t: at('a', 2.6), char: 'hero', do: 'turn', emotion: 'scared', look: 'back'},
        {t: at('b', 0.3), char: 'hero', do: 'idle', emotion: 'sad', look: 'down'},
      ],
      sfx: [{t: at('a', 1.4), kind: 'powerdown', gain: 0.55}],
      shotPlan: [{type: 'wide', move: 'crane'}, {type: 'medium', char: 'hero', move: 'drift'}, {type: 'close', char: 'hero', at: 'head', move: 'push'}, {type: 'extreme_close', char: 'hero', at: 'head'}],
    })},

    // 8) CLIMAX — the moment everything changes.
    {n: 'climax', scene: S({
      title: T('Момент истины', 'The moment'), env: {id: pack.climaxEnv.env, time: pack.climaxEnv.time, weather: pack.climaxEnv.weather},
      light: lightFor(pack.climaxEnv.env, pack.climaxEnv.time), ambience: AMBIENCE[pack.climaxEnv.env] || 'street',
      musicLevel: 0.95, fx: pack.fx || [], transition: {in: 'dip', out: 'cut'},
      actors: [{char: 'hero', x: 400, facing: 'r'}],
      lines: [
        ln('a', 'narrator', pack.develop.ru[1], pack.develop.en[1], {pause: 0.4}),
        ln('b', 'narrator', pack.explain.ru, pack.explain.en),
      ],
      beats: [
        // NB: the next action beat interrupts a move — keep the walk short
        // enough that it completes comfortably before at('a', 2.5).
        {t: 0.3, char: 'hero', do: 'walk', to: 1000, dur: 3, speed: 240, emotion: 'tired'},
        {t: at('a', 2.5), char: 'hero', do: 'idle', emotion: 'surprised', look: 'up'},
        {t: at('b', 0), char: 'hero', do: 'run', to: 1650, dur: 2.4, emotion: 'panic'},
        {t: at('b', 2.8), char: 'hero', do: 'idle', emotion: 'scared', look: 'back'},
      ],
      sfx: [{t: at('a', 0), kind: 'riser', gain: 0.7}, {t: at('b', 0.1), kind: 'whoosh', gain: 0.6}, {t: at('b', 2.6), kind: 'boom', gain: 0.7}, {t: at('b', 2.6), kind: 'impact', gain: 0.5}],
      shotPlan: [{type: 'wide', move: 'crane', angle: 'high', dutch: 4}, {type: 'medium', char: 'hero', move: 'dolly'}, {type: 'close', char: 'hero', at: 'head', move: 'push', angle: 'low'}, {type: 'wide', char: 'hero', move: 'pull'}],
    })},

    // 9) FINALE — reflection + the question to the viewer.
    {n: 'finale', scene: S({
      title: T('Утро после', 'The morning after'), env: {id: 'nature', time: 'dawn'},
      light: lightFor('nature', 'dawn'), ambience: 'forest', musicLevel: 0.8,
      transition: {in: 'fade', out: 'fade'},
      actors: [{char: 'hero', x: 700, facing: 'r', start: 'slump'}],
      lines: [
        ln('a', 'narrator', 'Позже всё это будет казаться сном. Почти сном.', 'Later all of it will feel like a dream. Almost a dream.', {pause: 0.7}),
        ln('b', 'narrator', 'Если это случится завтра — ты будешь готов?', 'If this happens tomorrow — will you be ready?'),
      ],
      beats: [
        {t: 0, char: 'hero', do: 'slump', emotion: 'sad', look: 'down'},
        {t: at('a', 1.4), char: 'hero', do: 'stretch', emotion: 'tired', look: 'up'},
        {t: at('b', 0), char: 'hero', do: 'idle', emotion: 'happy', look: {x: 1700, y: 400}},
      ],
      sfx: [{t: at('a', 1.4), kind: 'swell', gain: 0.6}],
      shotPlan: [{type: 'wide', char: 'hero', move: 'crane'}, {type: 'medium', char: 'hero', move: 'drift'}, {type: 'close', char: 'hero', at: 'head', move: 'push'}, {type: 'wide', char: 'hero', move: 'pull'}],
      overlay: {type: 'question', text: A.premise, t: at('b', 0.7)},
    })},
  ];

  // Extra scenes for long durations — inserted before the climax.
  const extras = [
    {n: 'reaction', opt: 6, scene: S({
      title: T('Реакция', 'The reaction'), env: {id: 'stadium', time: 'day'},
      light: lightFor('stadium', 'day'), ambience: 'city', musicLevel: 0.7,
      actors: [{char: 'hero', x: 300, facing: 'r'}],
      lines: [
        ln('a', 'narrator', 'Где-то люди снова вышли на улицу — просто посмотреть.', 'Somewhere people flood the streets again — just to look.'),
        ln('b', 'narrator', 'Кто-то снимает. Кто-то молчит. Все смотрят в одну сторону.', 'Some film it. Some say nothing. Everyone looks the same way.'),
      ],
      beats: [
        {t: 0.3, char: 'hero', do: 'walk', to: 1100, dur: 5, speed: 200, emotion: 'neutral'},
        {t: at('a', 2.4), char: 'hero', do: 'hands_up', emotion: 'surprised', look: 'up'},
        {t: at('b', 0.5), char: 'hero', do: 'wave', emotion: 'happy', look: {x: 1700, y: 350}},
      ],
      sfx: [{t: at('b', 0.4), kind: 'swell', gain: 0.5}],
      shotPlan: [{type: 'wide', move: 'pan'}, {type: 'medium', char: 'hero', move: 'dolly'}, {type: 'close', char: 'hero', at: 'head', angle: 'low'}],
    })},
    {n: 'quiet', opt: 7, scene: S({
      title: T('Перед бурей', 'Before the storm'), env: {id: 'school', time: 'indoor'},
      light: lightFor('school', 'indoor'), ambience: 'office', musicLevel: 0.45,
      actors: [{char: 'hero', x: 700, facing: 'r', start: 'sit', seatH: 80}],
      props: [{id: 'chr', kind: 'chair', x: 700, on: 'floor', color: '#6b5636'}],
      lines: [
        ln('a', 'narrator', 'В школе отменяют уроки. Впервые никто не радуется.', 'School is cancelled. For the first time nobody is happy.'),
        ln('b', 'narrator', 'Ты сидишь у окна и просто смотришь.', 'You sit by the window and simply watch.', {pause: 0.6}),
      ],
      beats: [
        {t: 0.2, char: 'hero', do: 'sit', seatH: 80, emotion: 'sad', look: {x: 1700, y: 350}},
        {t: at('a', 2.2), char: 'hero', do: 'think', seatH: 80, emotion: 'thinking', look: 'down'},
        {t: at('b', 1.2), char: 'hero', do: 'idle', emotion: 'neutral', look: {x: 1700, y: 350}},
      ],
      shotPlan: [{type: 'wide', move: 'drift', focus: {x: 960, y: 520}}, {type: 'medium', char: 'hero'}, {type: 'close', char: 'hero', at: 'head', move: 'push'}],
    })},
    {n: 'standoff', opt: 8, scene: S({
      title: T('Ночь', 'Nightfall'), env: {id: 'street', time: 'night', weather: 'rain'},
      light: lightFor('street', 'night'), ambience: 'rain', fx: ['fog'], musicLevel: 0.75,
      transition: {in: 'dip', out: 'cut'},
      actors: [{char: 'hero', x: 250, facing: 'r'}],
      lines: [
        ln('a', 'narrator', 'Ночью идёт дождь. Кажется, что мир держит дыхание.', 'At night it rains. It feels like the world is holding its breath.'),
        ln('b', 'narrator', 'Ты стоишь посреди всего этого — и не уходишь.', 'You stand in the middle of it all — and you do not leave.'),
      ],
      beats: [
        {t: 0.5, char: 'hero', do: 'walk', to: 900, dur: 5, speed: 150, emotion: 'tired'},
        {t: at('a', 2.6), char: 'hero', do: 'cower', emotion: 'scared', look: 'up'},
        {t: at('b', 0.4), char: 'hero', do: 'idle', emotion: 'thinking', look: 'forward'},
      ],
      sfx: [{t: at('a', 0.6), kind: 'thunder', gain: 0.8}],
      shotPlan: [{type: 'wide', char: 'hero', move: 'pan', angle: 'low'}, {type: 'medium', char: 'hero', move: 'handheld'}, {type: 'close', char: 'hero', at: 'head', move: 'push'}],
    })},
  ];

  void nChars;
  if (compact) {
    // A short cut keeps complete causal beats, not chopped-off topic text.
    const hook = defs.find(d => d.n === 'hook').scene;
    hook.lines = [ln('a', 'narrator', A.premise.ru, A.premise.en)];
    const encounter = defs.find(d => d.n === 'encounter').scene;
    encounter.lines = [ln('a', 'narrator', pack.develop.ru[0], pack.develop.en[0])];
    const climax = defs.find(d => d.n === 'climax').scene;
    climax.lines = [ln('a', 'narrator', pack.develop.ru[1], pack.develop.en[1])];
    const finale = defs.find(d => d.n === 'finale').scene;
    finale.lines = [ln('b', 'narrator', 'Как теперь жить рядом?', 'How do we live together now?')];
  }
  return {defs, extras, expertId};
}

// ---------------------------------------------------------------- meta

/** Compose title/logline/mainIdea + cast & music for a free-form project. */
export function storyMeta(A, {lang = 'ru'} = {}) {
  const pack = A.pack;
  const premise = A.premise;
  const stripQ = (s) => s.replace(/[?]+\s*$/, '.');
  const logline = {
    ru: `${stripQ(premise.ru)} ${pack.logline.ru}`,
    en: `${stripQ(premise.en)} ${pack.logline.en}`,
  };
  return {
    title: premise,
    logline,
    mainIdea: T(pack.mainIdea.ru, pack.mainIdea.en),
    music: pack.music,
    cast: ['hero', 'friend', pack.expert],
    domain: pack.id,
    premise,
    lang,
  };
}
