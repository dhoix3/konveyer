// Script engine: IDEA -> SCRIPT. Three classic dramatic templates
// (hook -> title -> development -> rising stakes -> twist -> climax ->
// emotional finale -> question) plus a free-form generator for arbitrary
// topics (see story.mjs).  Narration is second person ("Ты просыпаешься...").
// Output is project.json.
import {LIB_CHARS, LIB_VOICES} from '../src/lib/library.ts';
import {analyzeTopic, buildStoryScenes, storyMeta, T, at, ln, L, S} from './story.mjs';

// Re-exported for render.mjs / UI so option lists live in one place.
export const MUSIC_MOODS = ['dark_ambient', 'tense', 'mystery', 'epic', 'emotional', 'lofi'];
export const LANGS = ['ru', 'en'];
// Video styles: affect music everywhere and the colour grade of free-form
// stories (template stories keep their carefully chosen per-scene grades).
export const STYLES = {
  'cinematic-stickman': {label: T('Кинематографичный', 'Cinematic'), grade: null, music: null},
  'noir': {label: T('Нуар', 'Noir'), grade: 'noir', music: 'mystery'},
  'warm': {label: T('Тёплый', 'Warm'), grade: 'warm', music: 'emotional'},
  'vivid': {label: T('Яркий', 'Vivid'), grade: 'teal_orange', music: 'epic'},
};

export const IDEAS = [
  {template: 'no_sleep', theme: 'body', ru: 'Что если ты больше никогда не уснёшь?', en: 'What if you never slept again?'},
  {template: 'no_sleep', theme: 'body', ru: 'Что если сон станет роскошью?', en: 'What if sleep became a luxury?'},
  {template: 'gravity', theme: 'physics', ru: 'Что если гравитация исчезнет на 10 секунд?', en: 'What if gravity vanished for 10 seconds?'},
  {template: 'gravity', theme: 'space', ru: 'Что если Земля на миг перестанет притягивать?', en: 'What if the Earth stopped pulling for a moment?'},
  {template: 'no_internet', theme: 'tech', ru: 'Что если интернет исчезнет на сутки?', en: 'What if the internet disappeared for a day?'},
  {template: 'no_internet', theme: 'tech', ru: 'Что если все телефоны разом отключатся?', en: 'What if every phone switched off at once?'},
  {template: 'no_sleep', theme: 'mind', ru: 'Что если ты будешь слышать чужие мысли?', en: 'What if you could hear everyone\'s thoughts?'},
  {template: 'gravity', theme: 'nature', ru: 'Что если океаны поднимутся в воздух?', en: 'What if the oceans lifted into the air?'},
  {template: 'no_internet', theme: 'society', ru: 'Что если деньги перестанут работать?', en: 'What if money stopped working?'},
];

export function generateIdeas({lang = 'ru', count = 6, theme} = {}) {
  const pool = theme ? IDEAS.filter((i) => i.theme === theme) : IDEAS;
  if (pool.length) {
    return pool.slice(0, count).map((i) => ({template: i.template, theme: i.theme, title: i[lang], ru: i.ru, en: i.en}));
  }
  // Unknown theme: build a real free-form concept for it instead of showing
  // unrelated template ideas.
  if (theme) {
    const A = analyzeTopic(String(theme), lang);
    const meta = storyMeta(A, {lang});
    return [{template: 'freeform', theme: String(theme), topic: String(theme), title: meta.title[lang], ru: meta.title.ru, en: meta.title.en}];
  }
  return IDEAS.slice(0, count).map((i) => ({template: i.template, theme: i.theme, title: i[lang], ru: i.ru, en: i.en}));
}

// ------------------------------------------------------------------ templates
// each template returns ordered scene definitions: {opt, needs, scene}
const TEMPLATES = {
  no_sleep: {
    title: T('Что если ты больше никогда не уснёшь?', 'What If You Never Slept Again?'),
    logline: T('Ты просыпаешься в 3:07 и понимаешь, что сон исчез навсегда. Десять ночей превращают подарок в ловушку.', 'You wake at 3:07 and realise sleep is gone forever. Ten nights turn a gift into a trap.'),
    mainIdea: T('Сон — не потеря времени, а то, что удерживает тебя целым.', 'Sleep is not lost time — it is what holds you together.'),
    cast: ['hero', 'friend', 'doc'], music: 'dark_ambient',
    scenes: () => [
      {n: 'hook', scene: S({
        title: T('3:07', '3:07'), env: {id: 'bedroom', time: 'night'}, light: L('moon', 1370, 200, '#9ab4ff', '#7aa8ff', 0.6, {grade: 'cold'}), ambience: 'room_night', minDur: 8, musicLevel: 0.4,
        actors: [{char: 'hero', x: 640, facing: 'r', start: 'sleep', seatH: 62}],
        props: [{id: 'bed', kind: 'bed', x: 600, on: 'floor', color: '#4b3f6b'}, {id: 'ns', kind: 'table', x: 905, on: 'floor', scale: 0.38, color: '#5a3d2b'}, {id: 'clk', kind: 'clock', x: 905, on: 'ns'}],
        pstates: [{t: at('a', 1.3), prop: 'clk', key: 'ring', to: 1, dur: 0.1}, {t: at('b', 0), prop: 'clk', key: 'ring', to: 0, dur: 0.1}],
        lines: [ln('a', 'narrator', 'Ты просыпаешься среди ночи. Часы показывают 3:07.', 'You wake in the middle of the night. The clock says 3:07.'), ln('b', 'narrator', 'Закрываешь глаза. Минута. Час. Сон не приходит. И уже не придёт — никогда.', 'You close your eyes. A minute. An hour. Sleep does not come. And it never will.', {pause: 0.5})],
        beats: [{t: 0, char: 'hero', do: 'sleep', seatH: 62, emotion: 'tired'}, {t: at('a', 1.3), char: 'hero', do: 'sit_up', seatH: 62, emotion: 'surprised', look: {prop: 'clk'}}, {t: at('b', 0.2), char: 'hero', do: 'sit', seatH: 62, emotion: 'sad', look: 'down'}, {t: at('b', 3.6), char: 'hero', do: 'slump', emotion: 'scared', look: 'up'}],
        sfx: [{t: at('a', 1.3), kind: 'sting', gain: 0.7}, {t: at('b', 3.8), kind: 'heartbeat', gain: 0.8}],
        shotPlan: [{type: 'establishing', move: 'push'}, {type: 'medium', char: 'hero'}, {type: 'insert', prop: 'clk', move: 'push'}, {type: 'close', char: 'hero', at: 'head', move: 'push'}],
        counter: {label: T('Часов без сна', 'Hours awake'), from: 0, to: 1, format: 'decimal', unit: ''},
      })},
      {n: 'kitchen', opt: 3, scene: S({
        title: T('Подарок', 'The gift'), env: {id: 'kitchen', time: 'night'}, light: L('lamp', 560, 330, '#ffd9a0', '#ffb86a', 0.7, {grade: 'warm'}), ambience: 'room_night',
        actors: [{char: 'hero', x: 120, facing: 'r'}],
        props: [{id: 'tb', kind: 'table', x: 900, on: 'floor', color: '#7b5a3a'}, {id: 'cup', kind: 'cup', x: 830, on: 'tb'}],
        lines: [ln('a', 'narrator', 'Первая ночь без сна кажется подарком. Целых восемь лишних часов.', 'The first sleepless night feels like a gift. Eight extra hours.'), ln('b', 'narrator', 'Ты делаешь всё, на что раньше не хватало времени.', 'You do everything you never had time for.')],
        beats: [{t: 0.2, char: 'hero', do: 'walk', to: 700, emotion: 'neutral'}, {t: at('a', 2.6), char: 'hero', do: 'reach', emotion: 'happy', look: {prop: 'cup'}}, {t: at('a', 3.1), char: 'hero', do: 'reach', hold: {prop: 'cup', hand: 'r'}}, {t: at('b', 0.3), char: 'hero', do: 'drink', look: 'forward'}, {t: at('b', 2.4), char: 'hero', do: 'idle', emotion: 'happy', look: 'forward'}],
        sfx: [{t: at('a', 3.2), kind: 'cup_set', gain: 0.5}],
        shotPlan: [{type: 'wide', char: 'hero', move: 'dolly'}, {type: 'medium', char: 'hero'}, {type: 'close', char: 'hero', at: 'head'}],
        counter: {label: T('Часов без сна', 'Hours awake'), from: 3, to: 24, format: 'int'},
      })},
      {n: 'city', opt: 2, scene: S({
        title: T('Сверхчеловек', 'Superhuman'), env: {id: 'street', time: 'day'}, light: L('sun', 1500, 100, '#fff0c0', '#ffd38a', 0.7, {grade: 'teal_orange'}), ambience: 'street', musicLevel: 0.75, transition: {in: 'dip', out: 'cut'},
        actors: [{char: 'hero', x: 100, facing: 'r'}],
        lines: [ln('a', 'narrator', 'К утру проект закончен, гараж разобран, три книги прочитаны. Мир вокруг движется как в замедленной съёмке.', 'By morning the project is done, the garage is clean, three books are read. The world around you moves in slow motion.'), ln('b', 'narrator', 'Ты чувствуешь себя богом.', 'You feel like a god.')],
        beats: [{t: 0.3, char: 'hero', do: 'run', to: 1500, dur: 3.2, emotion: 'happy'}, {t: 3.6, char: 'hero', do: 'idle'}, {t: at('b', 0.2), char: 'hero', do: 'cheer', emotion: 'happy', look: 'up'}],
        shotPlan: [{type: 'wide', char: 'hero', move: 'pan'}, {type: 'medium', char: 'hero', move: 'dolly'}, {type: 'close', char: 'hero', at: 'head', angle: 'low'}],
        counter: {label: T('Дни без сна', 'Days awake'), from: 1, to: 3, format: 'int'},
      })},
      {n: 'office', opt: 1, needs: ['friend'], scene: S({
        title: T('Сова', 'Owl eyes'), env: {id: 'office', time: 'night'}, light: L('screen', 930, 470, '#8fd8ff', '#6ac4ff', 0.5, {grade: 'cold'}), ambience: 'office',
        actors: [{char: 'hero', x: 640, facing: 'r'}, {char: 'friend', x: 1230, facing: 'l'}],
        props: [{id: 'desk', kind: 'desk', x: 930, on: 'floor', color: '#5a4636'}, {id: 'lp', kind: 'laptop', x: 930, on: 'desk'}],
        lines: [ln('a', 'friend', 'Ты вообще спал на этой неделе? У тебя глаза как у совы.', 'Did you sleep at all this week? You have owl eyes.'), ln('b', 'hero', 'Конечно. Ну… почти.', 'Of course. Well... almost.'), ln('c', 'narrator', 'Четвёртые сутки. Ты начинаешь забывать слова.', 'Day four. You start forgetting words.')],
        beats: [{t: 0.3, char: 'hero', do: 'idle', emotion: 'tired', look: {char: 'friend'}}, {t: 0.3, char: 'friend', do: 'idle', emotion: 'worried', look: {char: 'hero'}}, {t: at('a', 0.5), char: 'friend', do: 'point', emotion: 'surprised'}, {t: at('b', 0), char: 'hero', do: 'shrug', emotion: 'smug'}, {t: at('b', 1.6), char: 'friend', do: 'cross_arms', emotion: 'sad'}, {t: at('c', 0), char: 'hero', do: 'facepalm', emotion: 'tired', look: 'down'}],
        shotPlan: [{type: 'wide', move: 'drift', focus: {x: 930, y: 520}}, {type: 'medium', char: 'friend'}, {type: 'medium', char: 'hero'}, {type: 'close', char: 'hero', at: 'head'}],
        counter: {label: T('Дни без сна', 'Days awake'), from: 3, to: 5, format: 'int'},
      })},
      {n: 'rain', opt: 4, scene: S({
        title: T('Тишина громче', 'Louder silence'), env: {id: 'street', time: 'night', weather: 'storm'}, light: L('neon', 300, 300, '#ff4d6d', '#ff6a88', 0.65, {flicker: 0.6, grade: 'noir'}), ambience: 'rain', fx: ['fog'], musicLevel: 0.7, transition: {in: 'dip', out: 'cut'},
        actors: [{char: 'hero', x: 1500, facing: 'l'}],
        lines: [ln('a', 'narrator', 'На седьмую ночь тишина становится громче. Мысли — быстрее. А тело — тяжелее.', 'By the seventh night silence gets louder. Thoughts get faster. The body gets heavier.'), ln('b', 'narrator', 'И ты начинаешь замечать то, чего нет.', 'And you begin to notice things that are not there.')],
        beats: [{t: 0.3, char: 'hero', do: 'walk', to: 700, dur: 6, speed: 150, emotion: 'tired'}, {t: at('b', 0.1), char: 'hero', do: 'cower', emotion: 'scared', look: 'back'}, {t: at('b', 2.4), char: 'hero', do: 'slump', emotion: 'panic', look: 'down'}],
        sfx: [{t: at('b', 0.1), kind: 'thunder', gain: 0.9}, {t: at('b', 0.1), kind: 'impact', gain: 0.6}],
        shotPlan: [{type: 'wide', char: 'hero', move: 'pan', angle: 'low'}, {type: 'medium', char: 'hero', move: 'handheld'}, {type: 'close', char: 'hero', at: 'head', move: 'push'}],
        counter: {label: T('Дни без сна', 'Days awake'), from: 7, to: 9, format: 'int', danger: true},
      })},
      {n: 'hospital', opt: 5, scene: S({
        title: T('Диагноз', 'Diagnosis'), env: {id: 'hospital', time: 'indoor'}, light: L('lamp', 1000, 60, '#e8fbff', '#9fe8ff', 0.5, {grade: 'sick', flicker: 0.3}), ambience: 'hospital',
        actors: [{char: 'hero', x: 700, facing: 'r', start: 'sit', seatH: 62}, {char: 'doc', x: 1230, facing: 'l'}],
        props: [{id: 'hb', kind: 'bed', x: 690, on: 'floor', color: '#cfd8dc'}],
        lines: [ln('a', 'narrator', 'Врач разводит руками. Мозгу нужен сон не для отдыха — во сне он вымывает токсины.', 'The doctor spreads his hands. The brain needs sleep not to rest — during sleep it flushes out toxins.'), ln('b', 'doc', 'Без этого он засоряется. Как город, в котором перестали вывозить мусор.', 'Without it, it clogs. Like a city where nobody takes out the trash.', {optional: true})],
        beats: [{t: 0.2, char: 'hero', do: 'sit', seatH: 62, emotion: 'tired', look: 'down'}, {t: 0.2, char: 'doc', do: 'idle', emotion: 'neutral', look: {char: 'hero'}}, {t: at('a', 1.8), char: 'doc', do: 'shrug'}, {t: at('b', 0.2), char: 'doc', do: 'point', emotion: 'sad'}, {t: at('b', 3.5), char: 'hero', do: 'think', seatH: 62, emotion: 'scared', look: 'forward'}],
        sfx: [{t: at('a', 0), kind: 'beep', gain: 0.4}, {t: at('a', 1.6), kind: 'beep', gain: 0.4}],
        shotPlan: [{type: 'wide', move: 'dolly', focus: {x: 960, y: 520}}, {type: 'medium', char: 'doc'}, {type: 'close', char: 'hero', at: 'head', move: 'push'}],
        counter: {label: T('Дни без сна', 'Days awake'), from: 9, to: 10, format: 'int', danger: true},
      })},
      {n: 'climax', scene: S({
        title: T('Потолок дышит', 'The ceiling breathes'), env: {id: 'bedroom', time: 'night'}, light: L('emergency', 1370, 200, '#9aff7a', '#b6ff8a', 0.5, {grade: 'sick', flicker: 0.5, pulse: {color: '#7aff5a', period: 2.4}}), ambience: 'room_night', fx: ['fog'], musicLevel: 0.9,
        actors: [{char: 'hero', x: 640, facing: 'r', start: 'lie', seatH: 62}],
        props: [{id: 'bed', kind: 'bed', x: 600, on: 'floor', color: '#4b3f6b'}, {id: 'ns', kind: 'table', x: 905, on: 'floor', scale: 0.38, color: '#5a3d2b'}, {id: 'clk', kind: 'clock', x: 905, on: 'ns'}],
        pstates: [{t: at('a', 2), prop: 'clk', key: 'ring', to: 1, dur: 0.1}],
        lines: [ln('a', 'narrator', 'На десятый день потолок начинает дышать. Стены шепчут твоё имя.', 'On the tenth day the ceiling begins to breathe. The walls whisper your name.'), ln('b', 'narrator', 'И ты понимаешь: сон был не слабостью. Он был единственным, что держало тебя целым.', 'And you understand: sleep was never weakness. It was the only thing holding you together.', {pause: 0.8})],
        beats: [{t: 0, char: 'hero', do: 'lie', seatH: 62, emotion: 'scared', look: 'up'}, {t: at('a', 2.6), char: 'hero', do: 'sit_up', seatH: 62, emotion: 'panic', look: 'up'}, {t: at('b', 0.2), char: 'hero', do: 'sit', seatH: 62, emotion: 'sad', look: 'down'}],
        sfx: [{t: at('a', 0), kind: 'riser', gain: 0.8}, {t: at('a', 2), kind: 'alarm', gain: 0.45}, {t: at('b', 0), kind: 'static', gain: 0.5}],
        shotPlan: [{type: 'wide', move: 'crane', angle: 'high', dutch: 4}, {type: 'close', char: 'hero', at: 'head', dutch: -5, move: 'handheld'}, {type: 'insert', prop: 'clk', move: 'push'}, {type: 'medium', char: 'hero', move: 'pull'}],
        counter: {label: T('Дни без сна', 'Days awake'), from: 10, to: 11, format: 'int', danger: true},
      })},
      {n: 'finale', scene: S({
        title: T('Одна обычная ночь', 'One ordinary night'), env: {id: 'nature', time: 'dawn'}, light: L('sun', 1500, 300, '#ffd8a8', '#ffc58a', 0.7, {grade: 'dawn'}), ambience: 'forest', silence: false, musicLevel: 0.8, transition: {in: 'fade', out: 'fade'},
        actors: [{char: 'hero', x: 700, facing: 'r', start: 'slump'}],
        lines: [ln('a', 'narrator', 'Ты бы отдал всё за одну самую обычную ночь.', 'You would give anything for one perfectly ordinary night.', {pause: 0.7}), ln('b', 'narrator', 'А ты согласился бы никогда не спать — ради бесконечного времени?', 'Would you agree to never sleep again — for infinite time?')],
        beats: [{t: 0, char: 'hero', do: 'slump', emotion: 'sad', look: 'down'}, {t: at('a', 1.2), char: 'hero', do: 'stretch', emotion: 'tired', look: 'up'}, {t: at('b', 0), char: 'hero', do: 'idle', emotion: 'happy', look: {x: 1700, y: 400}}],
        sfx: [{t: at('a', 1.2), kind: 'swell', gain: 0.6}],
        shotPlan: [{type: 'wide', char: 'hero', move: 'crane'}, {type: 'medium', char: 'hero', move: 'drift'}, {type: 'close', char: 'hero', at: 'head', move: 'push'}, {type: 'wide', char: 'hero', move: 'pull'}],
        overlay: {type: 'question', text: T('Ты согласился бы никогда не спать?', 'Would you agree to never sleep?'), t: at('b', 0.6)},
      })},
    ],
  },
  gravity: {
    title: T('Что если гравитация исчезнет на 10 секунд?', 'What If Gravity Vanished for 10 Seconds?'),
    logline: T('Обычное утро. В 8:15 Земля перестаёт тебя держать — и у тебя есть десять секунд, чтобы понять, что это значит.', 'An ordinary morning. At 8:15 the Earth stops holding you — and you have ten seconds to understand what that means.'),
    mainIdea: T('Всё привычное держится на невидимой силе, которую мы никогда не замечаем.', 'Everything familiar rests on an invisible force we never notice.'),
    cast: ['hero', 'friend', 'doc'], music: 'tense',
    scenes: () => [
      {n: 'hook', scene: S({
        title: T('8:15', '8:15'), env: {id: 'street', time: 'day'}, light: L('sun', 1500, 100, '#fff0c0', '#ffd38a', 0.7, {grade: 'teal_orange'}), ambience: 'street', minDur: 8,
        actors: [{char: 'hero', x: 150, facing: 'r'}],
        props: [{id: 'cup', kind: 'cup', x: 150, on: 'floor', from: 0}],
        lines: [ln('a', 'narrator', 'Ты идёшь на работу с кофе в руке. Обычное утро.', 'You walk to work with coffee in hand. An ordinary morning.'), ln('b', 'narrator', 'Ровно в 8:15 земля перестаёт тебя держать.', 'At exactly 8:15 the ground stops holding you.', {pause: 0.4})],
        beats: [{t: 0, char: 'hero', do: 'idle', hold: {prop: 'cup', hand: 'r'}}, {t: 0.5, char: 'hero', do: 'walk', to: 800, dur: 3.2, emotion: 'neutral'}, {t: at('b', 0.4), char: 'hero', do: 'idle', emotion: 'surprised', look: 'down'}, {t: at('b', 1.8), char: 'hero', do: 'float', emotion: 'panic', look: 'down'}],
        sfx: [{t: at('b', 1.8), kind: 'whoosh', gain: 0.8}, {t: at('b', 1.8), kind: 'sting', gain: 0.7}],
        shotPlan: [{type: 'wide', char: 'hero', move: 'pan'}, {type: 'medium', char: 'hero', move: 'dolly'}, {type: 'close', char: 'hero', at: 'head'}, {type: 'wide', char: 'hero', move: 'crane'}],
        counter: {label: T('Секунд без гравитации', 'Seconds without gravity'), from: 0, to: 1, format: 'int'},
      })},
      {n: 'float', scene: S({
        title: T('Всё поднимается', 'Everything lifts'), env: {id: 'street', time: 'day'}, light: L('sun', 1500, 100, '#fff0c0', '#ffd38a', 0.7, {grade: 'teal_orange'}), ambience: 'street', transition: {in: 'cut', out: 'cut'},
        actors: [{char: 'hero', x: 800, facing: 'r', start: 'float'}],
        props: [{id: 'ball', kind: 'ball', x: 500, on: 'air', y: 360, why: 'zero gravity'}, {id: 'box', kind: 'box', x: 1250, on: 'air', y: 420, why: 'zero gravity'}, {id: 'sg', kind: 'sign', x: 1500, on: 'air', y: 480, why: 'zero gravity', text: 'STOP', color: '#e24a3a'}],
        lines: [ln('a', 'narrator', 'Секунда первая. Всё, что не прикручено, поднимается: мусорные баки, зонты, чьи-то мечты.', 'Second one. Everything not bolted down lifts: trash cans, umbrellas, somebody\'s dreams.'), ln('b', 'narrator', 'Секунда третья. Ты кричишь, но звук некому слушать.', 'Second three. You scream, but there is no one to hear it.')],
        beats: [{t: 0, char: 'hero', do: 'float', emotion: 'panic', look: {prop: 'ball'}}, {t: at('b', 0), char: 'hero', do: 'float', emotion: 'scared', look: 'up'}],
        sfx: [{t: at('a', 0), kind: 'swell', gain: 0.7}],
        shotPlan: [{type: 'wide', move: 'crane', focus: {x: 960, y: 420}}, {type: 'medium', char: 'hero', move: 'handheld'}, {type: 'close', char: 'hero', at: 'head', move: 'push'}],
        counter: {label: T('Секунд без гравитации', 'Seconds without gravity'), from: 1, to: 4, format: 'int', danger: true},
      })},
      {n: 'roof', opt: 1, scene: S({
        title: T('Скорость вращения', 'Spinning'), env: {id: 'city', time: 'dusk'}, light: L('sun', 200, 300, '#ff9a5a', '#ff8a4a', 0.75, {grade: 'dusk'}), ambience: 'city', transition: {in: 'dip', out: 'cut'},
        actors: [{char: 'hero', x: 900, facing: 'r', start: 'float'}],
        lines: [ln('a', 'narrator', 'Секунда пятая. Земля вращается со скоростью полторы тысячи километров в час. Без гравитации ты летишь по касательной.', 'Second five. The Earth spins at over a thousand miles an hour. Without gravity you fly off along a tangent.')],
        beats: [{t: 0, char: 'hero', do: 'float', emotion: 'panic', look: 'down'}, {t: at('a', 3), char: 'hero', do: 'hands_up', emotion: 'scared', look: 'up'}],
        sfx: [{t: at('a', 1), kind: 'riser', gain: 0.7}],
        shotPlan: [{type: 'wide', move: 'pull'}, {type: 'medium', char: 'hero', move: 'dolly'}, {type: 'close', char: 'hero', at: 'head', dutch: 6}],
        counter: {label: T('Скорость', 'Speed'), from: 0, to: 1670, format: 'int', unit: 'км/ч', danger: true},
      })},
      {n: 'twist', scene: S({
        title: T('Вверх', 'Up'), env: {id: 'nature', time: 'day'}, light: L('sun', 1500, 150, '#fff6d0', '#ffffff', 0.8, {grade: 'cold'}), ambience: 'wind', musicLevel: 0.9, transition: {in: 'dip', out: 'cut'},
        actors: [{char: 'hero', x: 900, facing: 'r', start: 'float'}],
        lines: [ln('a', 'narrator', 'Секунда восьмая. Воздух тоже уходит в небо. Становится тихо. Слишком тихо.', 'Second eight. The air drifts upward too. It gets quiet. Far too quiet.', {pause: 0.5}), ln('b', 'narrator', 'Ты понимаешь, что дело не в падении. Дело в том, что падать больше не на что.', 'You realise the problem is not falling. It is that there is nothing left to fall onto.')],
        beats: [{t: 0, char: 'hero', do: 'float', emotion: 'scared', look: 'up'}, {t: at('b', 0.2), char: 'hero', do: 'float', emotion: 'sad', look: 'down'}],
        sfx: [{t: at('a', 1.5), kind: 'powerdown', gain: 0.6}],
        silence: true,
        shotPlan: [{type: 'wide', move: 'crane', focus: {x: 960, y: 380}}, {type: 'close', char: 'hero', at: 'head', move: 'push'}, {type: 'extreme_close', char: 'hero', at: 'head', move: 'drift'}],
        counter: {label: T('Секунд без гравитации', 'Seconds without gravity'), from: 8, to: 10, format: 'int', danger: true},
      })},
      {n: 'finale', scene: S({
        title: T('Земля', 'Ground'), env: {id: 'street', time: 'dawn'}, light: L('sun', 200, 250, '#ffd8a8', '#ffc58a', 0.7, {grade: 'dawn'}), ambience: 'street', musicLevel: 0.8, transition: {in: 'fade', out: 'fade'},
        actors: [{char: 'hero', x: 800, facing: 'r', start: 'float'}],
        lines: [ln('a', 'narrator', 'Секунда десятая. Гравитация возвращается. Ты падаешь — и асфальт встречает тебя как старый друг.', 'Second ten. Gravity returns. You fall — and the asphalt greets you like an old friend.', {pause: 0.6}), ln('b', 'narrator', 'Что бы ты успел сказать за эти десять секунд?', 'What would you have said in those ten seconds?')],
        beats: [{t: 0, char: 'hero', do: 'float', emotion: 'scared', look: 'down'}, {t: at('a', 2.2), char: 'hero', do: 'fall', emotion: 'panic'}, {t: at('a', 4.6), char: 'hero', do: 'lie', seatH: 0, emotion: 'happy', look: 'up'}],
        sfx: [{t: at('a', 2.6), kind: 'fall_thud', gain: 0.9}, {t: at('a', 2.6), kind: 'impact', gain: 0.6}],
        shotPlan: [{type: 'wide', char: 'hero', move: 'pull'}, {type: 'medium', char: 'hero', move: 'drift'}, {type: 'close', char: 'hero', at: 'head', move: 'push'}],
        overlay: {type: 'question', text: T('Что бы ты успел сказать?', 'What would you have said?'), t: at('b', 0.6)},
      })},
    ],
  },
  no_internet: {
    title: T('Что если интернет исчезнет на сутки?', 'What If the Internet Disappeared for a Day?'),
    logline: T('Ты просыпаешься — и ни одного уведомления. Двадцать четыре часа тишины показывают, на чём держится твой мир.', 'You wake up and there is not a single notification. Twenty-four hours of silence show what your world stands on.'),
    mainIdea: T('Связь — это не сеть, а люди, которых мы забыли замечать.', 'Connection is not the network — it is the people we forgot to notice.'),
    cast: ['hero', 'friend', 'doc'], music: 'mystery',
    scenes: () => [
      {n: 'hook', scene: S({
        title: T('Ноль уведомлений', 'Zero notifications'), env: {id: 'bedroom', time: 'dawn'}, light: L('sun', 1370, 150, '#ffd8a8', '#ffc58a', 0.6, {grade: 'dawn'}), ambience: 'room_night', minDur: 8,
        actors: [{char: 'hero', x: 640, facing: 'r', start: 'sleep', seatH: 62}],
        props: [{id: 'bed', kind: 'bed', x: 600, on: 'floor', color: '#4b3f6b'}, {id: 'ns', kind: 'table', x: 905, on: 'floor', scale: 0.38, color: '#5a3d2b'}, {id: 'ph', kind: 'phone', x: 905, on: 'ns'}],
        pstates: [{t: at('b', 0.5), prop: 'ph', key: 'on', to: 0.1, dur: 0.4}],
        lines: [ln('a', 'narrator', 'Ты просыпаешься и по привычке тянешься к телефону.', 'You wake up and reach for your phone out of habit.'), ln('b', 'narrator', 'Ни одного уведомления. Ни одного. Совсем.', 'Not one notification. Not one. At all.', {pause: 0.5})],
        beats: [{t: 0, char: 'hero', do: 'sleep', seatH: 62, emotion: 'tired'}, {t: at('a', 0.5), char: 'hero', do: 'sit_up', seatH: 62, emotion: 'neutral', look: {prop: 'ph'}}, {t: at('a', 2.2), char: 'hero', do: 'reach', hold: {prop: 'ph', hand: 'r'}, seatH: 62}, {t: at('b', 0), char: 'hero', do: 'sit', seatH: 62, emotion: 'surprised', look: {prop: 'ph'}}],
        sfx: [{t: at('a', 2.3), kind: 'click', gain: 0.5}, {t: at('b', 0.5), kind: 'sting', gain: 0.6}],
        shotPlan: [{type: 'establishing', move: 'push'}, {type: 'medium', char: 'hero'}, {type: 'close', char: 'hero', at: 'head'}, {type: 'insert', prop: 'ph', move: 'push'}],
        counter: {label: T('Часов офлайн', 'Hours offline'), from: 0, to: 1, format: 'int'},
      })},
      {n: 'kitchen', opt: 2, scene: S({
        title: T('Руками', 'By hand'), env: {id: 'kitchen', time: 'day'}, light: L('sun', 950, 200, '#fff0c0', '#ffd38a', 0.6, {grade: 'warm'}), ambience: 'room_night',
        actors: [{char: 'hero', x: 150, facing: 'r'}],
        props: [{id: 'tb', kind: 'table', x: 900, on: 'floor', color: '#7b5a3a'}, {id: 'cup', kind: 'cup', x: 840, on: 'tb'}],
        lines: [ln('a', 'narrator', 'Умная колонка молчит. Кофемашина требует подключения.', 'The smart speaker is silent. The coffee machine demands a connection.'), ln('b', 'narrator', 'Впервые за годы ты заваришь чай своими руками.', 'For the first time in years you make tea with your own hands.')],
        beats: [{t: 0.2, char: 'hero', do: 'walk', to: 720, emotion: 'tired'}, {t: at('a', 2.5), char: 'hero', do: 'shrug', emotion: 'sad'}, {t: at('b', 0.2), char: 'hero', do: 'reach', emotion: 'neutral', look: {prop: 'cup'}}, {t: at('b', 0.8), char: 'hero', do: 'reach', hold: {prop: 'cup', hand: 'r'}}, {t: at('b', 2.0), char: 'hero', do: 'drink', emotion: 'happy', look: 'forward'}],
        shotPlan: [{type: 'wide', char: 'hero', move: 'dolly'}, {type: 'medium', char: 'hero'}, {type: 'close', char: 'hero', at: 'head'}],
        counter: {label: T('Часов офлайн', 'Hours offline'), from: 1, to: 5, format: 'int'},
      })},
      {n: 'street', scene: S({
        title: T('Чёрные экраны', 'Black screens'), env: {id: 'street', time: 'day'}, light: L('sun', 1500, 100, '#fff0c0', '#ffd38a', 0.7, {grade: 'cold'}), ambience: 'street', transition: {in: 'dip', out: 'cut'},
        actors: [{char: 'hero', x: 150, facing: 'r'}],
        lines: [ln('a', 'narrator', 'На улице что-то не так. Люди стоят на месте и смотрят в чёрные экраны. Банкоматы молчат. Навигаторы тоже.', 'Something is wrong outside. People stand still, staring into black screens. The ATMs are silent. So are the maps.'), ln('b', 'narrator', 'Город, который никогда не терялся, вдруг потерялся.', 'A city that never got lost has suddenly got lost.')],
        beats: [{t: 0.3, char: 'hero', do: 'walk', to: 1500, dur: 6.5, speed: 210, emotion: 'neutral', look: 'forward'}, {t: at('b', 0.3), char: 'hero', do: 'idle', emotion: 'surprised', look: 'up'}],
        shotPlan: [{type: 'wide', char: 'hero', move: 'pan'}, {type: 'medium', char: 'hero', move: 'dolly'}, {type: 'close', char: 'hero', at: 'head'}],
        counter: {label: T('Часов офлайн', 'Hours offline'), from: 5, to: 12, format: 'int'},
      })},
      {n: 'office', opt: 1, needs: ['friend'], scene: S({
        title: T('Разговор', 'A conversation'), env: {id: 'office', time: 'day'}, light: L('screen', 930, 470, '#8fd8ff', '#6ac4ff', 0.4, {grade: 'cold'}), ambience: 'office',
        actors: [{char: 'hero', x: 640, facing: 'r'}, {char: 'friend', x: 1230, facing: 'l'}],
        props: [{id: 'desk', kind: 'desk', x: 930, on: 'floor', color: '#5a4636'}],
        lines: [ln('a', 'friend', 'Почта не работает. Чат не работает. Что нам теперь делать?', 'Mail is down. Chat is down. What do we do now?'), ln('b', 'hero', 'Не знаю. Может… просто поговорить?', 'No idea. Maybe... just talk?')],
        beats: [{t: 0.3, char: 'friend', do: 'idle', emotion: 'worried', look: {char: 'hero'}}, {t: 0.3, char: 'hero', do: 'idle', look: {char: 'friend'}}, {t: at('a', 0.5), char: 'friend', do: 'hands_up', emotion: 'panic'}, {t: at('b', 0.3), char: 'hero', do: 'shrug', emotion: 'smug'}, {t: at('b', 2), char: 'friend', do: 'idle', emotion: 'happy'}],
        shotPlan: [{type: 'wide', move: 'drift', focus: {x: 930, y: 520}}, {type: 'medium', char: 'friend'}, {type: 'medium', char: 'hero'}],
        counter: {label: T('Часов офлайн', 'Hours offline'), from: 12, to: 16, format: 'int'},
      })},
      {n: 'roof', scene: S({
        title: T('Тишина', 'Silence'), env: {id: 'city', time: 'dusk'}, light: L('sun', 200, 300, '#ff9a5a', '#ff8a4a', 0.75, {grade: 'dusk'}), ambience: 'city', silence: true, musicLevel: 0.5,
        actors: [{char: 'hero', x: 700, facing: 'r'}],
        lines: [ln('a', 'narrator', 'К вечеру город стихает. Впервые ты слышишь, как он на самом деле дышит.', 'By evening the city quiets. For the first time you hear how it really breathes.', {pause: 0.8})],
        beats: [{t: 0, char: 'hero', do: 'idle', emotion: 'thinking', look: {x: 300, y: 350}}, {t: at('a', 1.5), char: 'hero', do: 'stretch', emotion: 'happy', look: 'up'}],
        shotPlan: [{type: 'wide', move: 'crane'}, {type: 'medium', char: 'hero', move: 'drift'}, {type: 'close', char: 'hero', at: 'head', move: 'push'}],
        counter: {label: T('Часов офлайн', 'Hours offline'), from: 16, to: 22, format: 'int'},
      })},
      {n: 'finale', scene: S({
        title: T('Двор', 'The yard'), env: {id: 'nature', time: 'dusk'}, light: L('sun', 200, 400, '#ff9a5a', '#ffb070', 0.7, {grade: 'dusk'}), ambience: 'forest', musicLevel: 0.8, transition: {in: 'fade', out: 'fade'},
        actors: [{char: 'hero', x: 700, facing: 'r'}],
        lines: [ln('a', 'narrator', 'К вечеру люди выходят во двор. Они смеются, спорят, играют. Они снова видят друг друга.', 'By evening people come out into the yard. They laugh, argue, play. They see each other again.', {pause: 0.6}), ln('b', 'narrator', 'Что ты сделаешь, если интернет исчезнет завтра?', 'What will you do if the internet disappears tomorrow?')],
        beats: [{t: 0, char: 'hero', do: 'walk', to: 1000, dur: 4, speed: 150, emotion: 'happy'}, {t: at('a', 4), char: 'hero', do: 'wave', emotion: 'happy', look: {x: 1700, y: 600}}, {t: at('b', 0.3), char: 'hero', do: 'idle', emotion: 'thinking', look: 'camera'}],
        shotPlan: [{type: 'wide', char: 'hero', move: 'crane'}, {type: 'medium', char: 'hero', move: 'dolly'}, {type: 'close', char: 'hero', at: 'head', move: 'push'}],
        overlay: {type: 'question', text: T('Что ты сделаешь, если интернет исчезнет завтра?', 'What will you do if the internet vanishes tomorrow?'), t: at('b', 0.6)},
      })},
    ],
  },
};

// Strong signals only: a template must really be the topic.  Loose words
// (ocean, phone, money, dream…) hijacked unrelated topics into an unrelated
// story — anything without a strong match goes to the free-form generator.
const KEYWORDS = {
  no_sleep: /не спать|бессонниц|не усн|не сможешь усн|insomnia|can'?t sleep|without sleep|no sleep|never sleep|сон|спат|уснё|уснешь|sleep/i,
  gravity: /гравит|gravity|невесомост|zero gravity|без гравитац/i,
  no_internet: /интернет|internet|wi-?fi|без сети|offline|no internet/i,
};

/**
 * Strong template match for a topic, or null (→ free-form story).
 * A template is only picked when the topic really is about that template;
 * arbitrary topics must never be replaced by an unrelated story.
 */
export function pickTemplate(topic = '', theme) {
  const t = String(topic || '');
  for (const [k, re] of Object.entries(KEYWORDS)) if (re.test(t)) return k;
  const idea = IDEAS.find((i) => i.ru === t || i.en === t);
  if (idea) return idea.template;
  const byTheme = IDEAS.find((i) => i.theme === theme);
  if (byTheme) return byTheme.template;
  return null; // no strong match — the caller generates a free-form story
}

export function estimateLine(text, voice, lang) {
  const cps = lang === 'ru' ? 14.2 : 15.5;
  const v = LIB_VOICES.find((x) => x.id === voice) || LIB_VOICES[0];
  return Math.max(1.2, text.length / (cps * v.speed)) + 0.15;
}
const estScene = (sc, lang) => {
  const total = sc.lines.reduce((a, l) => a + estimateLine(l.text[lang], l.voice, lang) + (l.pause ?? 0.25), 0);
  return Math.max(sc.minDur ?? 4, total + 0.8);
};

function localize(sc, sid) {
  // rename local line ids -> global ids and rewrite anchors
  const map = (id) => `${sid}_${id}`;
  const fix = (t) => (t && typeof t === 'object' && 'line' in t ? {...t, line: map(t.line)} : t);
  return {
    ...sc, id: sid,
    lines: sc.lines.map((l) => ({...l, id: map(l.id)})),
    beats: sc.beats.map((b) => ({...b, t: fix(b.t)})),
    sfx: (sc.sfx || []).map((s) => ({...s, t: fix(s.t)})),
    pstates: (sc.pstates || []).map((s) => ({...s, t: fix(s.t)})),
    overlay: sc.overlay ? {...sc.overlay, t: fix(sc.overlay.t)} : undefined,
  };
}

const hashId = (s) => { let h = 5381; for (const ch of String(s)) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0; return h; };

export function buildProject(opts = {}) {
  const lang = opts.language === 'en' ? 'en' : 'ru';
  const duration = Math.max(25, Math.min(180, Number(opts.duration) || 45));
  let topic = String(opts.topic || '').replace(/\s+/g, ' ').trim();
  if (topic.length > 200) topic = topic.slice(0, 200);
  if (opts.template && opts.template !== 'freeform' && !TEMPLATES[opts.template]) {
    throw new Error(`unknown template "${opts.template}" (available: ${Object.keys(TEMPLATES).join(', ')}, freeform)`);
  }
  const nChars = Math.max(1, Math.min(3, Number(opts.characters) || 2));
  const styleKey = Object.prototype.hasOwnProperty.call(STYLES, opts.style) ? opts.style : 'cinematic-stickman';
  const style = STYLES[styleKey];

  // ---- resolve the story source -------------------------------------------------
  // explicit template -> template; topic strongly matching a template -> template;
  // anything else -> free-form story built around the user's topic.
  let mode, tid = null, tpl = null, A = null, meta;
  if (opts.template === 'freeform') {
    if (!topic) throw new Error('freeform template requires a topic: --topic "..."');
    mode = 'freeform';
  } else if (opts.template) {
    mode = 'template'; tid = opts.template; tpl = TEMPLATES[tid];
  } else if (topic) {
    const kw = pickTemplate(topic, opts.theme);
    if (kw) { mode = 'template'; tid = kw; tpl = TEMPLATES[tid]; }
    else mode = 'freeform';
  } else {
    // No topic: pick a full template story deterministically (by theme or id)
    // so `new my-film` always produces a complete, varied film.
    const byTheme = opts.theme ? IDEAS.find((i) => i.theme === opts.theme) : null;
    const chosen = byTheme || IDEAS[hashId(opts.id || 'film') % IDEAS.length];
    mode = 'template'; tid = chosen.template; tpl = TEMPLATES[tid];
  }

  let poolDefs, extras = [];
  if (mode === 'freeform') {
    A = analyzeTopic(topic, lang);
    meta = storyMeta(A, {lang});
    const built = buildStoryScenes(A, {nChars});
    poolDefs = built.defs;
    extras = built.extras;
  } else {
    poolDefs = tpl.scenes();
    meta = {title: tpl.title, logline: tpl.logline, mainIdea: tpl.mainIdea, cast: tpl.cast, music: tpl.music, domain: tid};
  }
  const music = opts.music || style.music || meta.music;
  const castIds = meta.cast.slice(0, nChars);
  const has = (c) => castIds.includes(c);

  // choose scenes for the target duration
  let defs = poolDefs.filter((d) => !(d.needs || []).some((n) => !has(n)));
  const TITLE = 4.2;
  const total = () => defs.reduce((a, d) => a + estScene(d.scene, lang), 0) + TITLE;
  while (total() > duration * 1.12) {
    const droppable = defs.filter((d) => d.opt).sort((a, b) => a.opt - b.opt)[0];
    if (!droppable) break;
    defs = defs.filter((d) => d !== droppable);
  }
  // Short films: core scenes alone can exceed the budget (free-form narration
  // is text-length driven).  Trim trailing narration lines from the back of
  // the arc so the script fits; the finale's overlay line is never touched.
  // Beats/sfx anchored to a removed line are filtered out below via ok().
  while (total() > duration * 1.12) {
    let trimmed = false;
    for (let i = defs.length - 1; i >= 0; i--) {
      const sc = defs[i].scene;
      if (sc.lines.length < 2) continue;
      const last = sc.lines[sc.lines.length - 1];
      const ov = sc.overlay?.t;
      if (ov && typeof ov === 'object' && ov.line === last.id) continue;
      sc.lines = sc.lines.slice(0, -1);
      trimmed = true;
      break;
    }
    if (!trimmed) break;
  }
  // Long videos: add extra development scenes from the free-form pool so the
  // story does not become a few over-stretched scenes.
  if (extras.length) {
    let insertAt = defs.findIndex((d) => d.n === 'climax');
    if (insertAt < 0) insertAt = defs.length;
    for (const ex of extras) {
      if (total() >= duration * 0.85) break;
      defs.splice(insertAt, 0, ex);
      insertAt += 1;
    }
  }
  const extra = duration - total();

  const scenes = [];
  let k = 1;
  defs.forEach((d, i) => {
    const sid = `s${String(k++).padStart(2, '0')}`;
    let sc = localize(d.scene, sid);
    // drop absent characters; reassign their lines
    sc.actors = sc.actors.filter((a) => has(a.char) || a.char === 'hero');
    sc.beats = sc.beats.filter((b) => sc.actors.some((a) => a.char === b.char));
    sc.lines = sc.lines.filter((l) => !(l.optional && l.voice !== 'narrator' && !has(l.voice === 'boss' ? 'boss' : l.voice)))
      .map((l) => (l.voice !== 'narrator' && !has(l.voice) && l.voice !== 'hero' ? {...l, voice: 'narrator'} : l));
    const lids = new Set(sc.lines.map((l) => l.id));
    const ok = (x) => !(x.t && typeof x.t === 'object' && 'line' in x.t) || lids.has(x.t.line);
    sc.beats = sc.beats.filter(ok); sc.sfx = sc.sfx.filter(ok); sc.pstates = sc.pstates.filter(ok);
    // spread the remaining duration over ALL surviving scenes so the final
    // length matches the request (previously only required scenes stretched
    // and long videos undershot the target).
    if (extra > 3) sc.minDur = estScene(d.scene, lang) + extra / defs.length;
    if (mode === 'freeform' && style.grade) sc.light = {...sc.light, grade: style.grade};
    scenes.push(sc);
    if (i === 0) {
      scenes.push(S({
        id: `s${String(k++).padStart(2, '0')}`, kind: 'title', title: meta.title, env: {id: 'void', time: 'night'},
        light: L('none', 960, 400, '#9ec4ff', '#9ec4ff', 0.3, {grade: 'cold'}), ambience: 'silence', musicLevel: 0.9, minDur: TITLE,
        actors: [], overlay: {type: 'caption', text: meta.logline, t: 1.0}, transition: {in: 'dip', out: 'dip'},
        sfx: [{t: 0.2, kind: 'boom', gain: 0.9}, {t: 0.2, kind: 'whoosh', gain: 0.6}],
        shotPlan: [{type: 'establishing', move: 'push'}],
      }));
    }
  });

  const used = new Set(['hero']);
  castIds.forEach((c) => used.add(c));
  const chars = LIB_CHARS.filter((c) => used.has(c.id));
  const voiceIds = new Set(['narrator', ...chars.map((c) => c.voice)]);
  let title;
  if (mode === 'freeform') {
    title = meta.title; // the premise, built from the user's topic
  } else {
    title = topic && !IDEAS.some((i) => i.ru === topic || i.en === topic)
      ? T(lang === 'ru' ? topic : tpl.title.ru, lang === 'en' ? topic : tpl.title.en)
      : tpl.title;
  }
  const id = opts.id || tid || 'film';
  return {
    version: 1, id, language: lang, title, logline: meta.logline, mainIdea: meta.mainIdea,
    idea: {
      template: mode === 'freeform' ? 'freeform' : tid,
      topic: topic || meta.title[lang],
      theme: opts.theme || (mode === 'freeform' ? A.domain : 'general'),
    },
    settings: {duration, style: styleKey, characters: nChars, voiceMode: opts.voiceMode || 'tts', music, fps: 24, width: 1920, height: 1080},
    characters: chars, voices: LIB_VOICES.filter((v) => voiceIds.has(v.id)), scenes, references: [],
  };
}

export const TEMPLATE_IDS = Object.keys(TEMPLATES);
