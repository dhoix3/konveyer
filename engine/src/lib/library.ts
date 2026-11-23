// Character + voice library. Every character has a permanent id and a fixed visual design.
import type {CharacterDef, VoiceDef} from './types.ts';

export const LIB_CHARS: CharacterDef[] = [
  {id: 'hero', name: {ru: 'Алекс', en: 'Alex'}, role: 'protagonist', shirt: '#e0522b', pants: '#27334f', shoes: '#e8e8e8', accessory: 'hair', accessoryColor: '#5a3a22', height: 1.0, build: 'normal', eyes: 'round', voice: 'hero'},
  {id: 'friend', name: {ru: 'Мия', en: 'Mia'}, role: 'friend', shirt: '#26a6b8', pants: '#3a2d4f', shoes: '#f2c744', accessory: 'scarf', accessoryColor: '#f2c744', height: 0.94, build: 'slim', eyes: 'wide', voice: 'friend'},
  {id: 'max', name: {ru: 'Макс', en: 'Max'}, role: 'rival', shirt: '#4c9a3c', pants: '#2c2c34', shoes: '#222', accessory: 'cap', accessoryColor: '#2b2b30', height: 1.06, build: 'stocky', eyes: 'narrow', voice: 'boss'},
  {id: 'doc', name: {ru: 'Доктор Вега', en: 'Dr. Vega'}, role: 'expert', shirt: '#e6eaee', pants: '#33363f', shoes: '#444', accessory: 'glasses', height: 1.08, build: 'slim', eyes: 'round', voice: 'doc'},
  {id: 'boss', name: {ru: 'Шеф', en: 'The Boss'}, role: 'authority', shirt: '#cfd3dc', pants: '#1f2229', shoes: '#111', accessory: 'tie', accessoryColor: '#b0252c', height: 1.04, build: 'stocky', eyes: 'narrow', voice: 'boss'},
  {id: 'kid', name: {ru: 'Лёва', en: 'Leo'}, role: 'child', shirt: '#f2c744', pants: '#3a6fb0', shoes: '#e0522b', accessory: 'hair', accessoryColor: '#2b2b2b', height: 0.74, build: 'slim', eyes: 'wide', voice: 'kid'},
  {id: 'astro', name: {ru: 'Командир Рэй', en: 'Cmdr. Ray'}, role: 'astronaut', shirt: '#e8e9ee', pants: '#d6d8de', shoes: '#9aa0aa', accessory: 'helmet', height: 1.02, build: 'normal', eyes: 'round', voice: 'hero'},
];

export const LIB_VOICES: VoiceDef[] = [
  {
    id: 'narrator', label: {ru: 'Диктор', en: 'Narrator'}, gender: 'male', ageRange: '35-50', timbre: 'deep, warm baritone with slight rasp',
    speed: 0.94, intonation: 'low, measured, rising tension toward the end of each paragraph', mood: 'ominous curiosity',
    accent: {ru: 'нейтральный русский', en: 'neutral General American'}, delivery: {ru: 'второе лицо, шёпот в тихих местах, паузы перед поворотами', en: 'second person, near-whisper in quiet moments, pauses before twists'},
    prompt: {
      ru: 'Мужской голос, 35-50 лет, глубокий тёплый баритон с лёгкой хрипотцой, медленный темп (0.94x), документально-кинематографическая подача, сдержанное напряжение, паузы перед поворотами, обращение на «ты». Без пафоса и крика.',
      en: 'Male voice, 35-50, deep warm baritone with a slight rasp, slow pace (0.94x), cinematic documentary delivery, restrained tension, pauses before twists, addressing the viewer as "you". No melodrama, never shouting.',
    },
    piper: {ru: 'ru_RU-denis-medium', en: 'en_US-ryan-medium', pitch: 0.9},
  },
  {
    id: 'hero', label: {ru: 'Герой', en: 'Hero'}, gender: 'male', ageRange: '22-32', timbre: 'light, slightly nasal tenor, youthful',
    speed: 1.04, intonation: 'natural, expressive, breaks when afraid', mood: 'confused, determined',
    accent: {ru: 'нейтральный', en: 'neutral American'}, delivery: {ru: 'разговорно, живые эмоции', en: 'conversational, lively emotion'},
    prompt: {ru: 'Молодой мужской голос 22-32 года, светлый тенор, живая разговорная подача, голос срывается на страхе, скорость 1.04x.', en: 'Young male voice, 22-32, light tenor, lively conversational delivery, voice cracks when afraid, 1.04x speed.'},
    piper: {ru: 'ru_RU-denis-medium', en: 'en_US-ryan-medium', pitch: 1.1},
  },
  {
    id: 'friend', label: {ru: 'Подруга', en: 'Friend'}, gender: 'female', ageRange: '22-32', timbre: 'bright, clear mezzo',
    speed: 1.08, intonation: 'quick, bright, warm', mood: 'worried, supportive',
    accent: {ru: 'нейтральный', en: 'neutral American'}, delivery: {ru: 'быстро и тепло', en: 'quick and warm'},
    prompt: {ru: 'Женский голос 22-32 года, яркое чистое меццо, быстрый тёплый темп 1.08x, заботливая интонация.', en: 'Female voice, 22-32, bright clear mezzo, quick warm pace 1.08x, caring intonation.'},
    piper: {ru: 'ru_RU-irina-medium', en: 'en_US-amy-medium', pitch: 1.0},
  },
  {
    id: 'doc', label: {ru: 'Эксперт', en: 'Expert'}, gender: 'male', ageRange: '50-65', timbre: 'dry, gravelly bass-baritone',
    speed: 0.92, intonation: 'precise, lecturing, dry humor', mood: 'calm, concerned',
    accent: {ru: 'интеллигентный', en: 'light British'}, delivery: {ru: 'академично, с паузами', en: 'academic, with pauses'},
    prompt: {ru: 'Мужской голос 50-65 лет, сухой с хрипотцой, академичная точная подача, темп 0.92x.', en: 'Male voice 50-65, dry and gravelly, precise academic delivery, 0.92x pace.'},
    piper: {ru: 'ru_RU-denis-medium', en: 'en_US-ryan-medium', pitch: 0.82},
  },
  {
    id: 'boss', label: {ru: 'Шеф', en: 'Boss'}, gender: 'male', ageRange: '40-55', timbre: 'firm, commanding baritone',
    speed: 1.0, intonation: 'clipped, authoritative', mood: 'stern', accent: {ru: 'деловой', en: 'corporate American'}, delivery: {ru: 'отрывисто, командно', en: 'clipped, commanding'},
    prompt: {ru: 'Мужской голос 40-55 лет, твёрдый командный баритон, отрывистая подача.', en: 'Male voice 40-55, firm commanding baritone, clipped delivery.'},
    piper: {ru: 'ru_RU-denis-medium', en: 'en_US-ryan-medium', pitch: 0.95},
  },
  {
    id: 'kid', label: {ru: 'Ребёнок', en: 'Child'}, gender: 'neutral', ageRange: '7-10', timbre: 'high, bright, curious',
    speed: 1.1, intonation: 'rising, curious', mood: 'excited', accent: {ru: 'нейтральный', en: 'neutral'}, delivery: {ru: 'эмоционально, с вопросами', en: 'excited, questioning'},
    prompt: {ru: 'Детский голос 7-10 лет, высокий яркий, любопытная интонация, темп 1.1x.', en: 'Child voice 7-10, high and bright, curious intonation, 1.1x pace.'},
    piper: {ru: 'ru_RU-irina-medium', en: 'en_US-amy-medium', pitch: 1.25},
  },
];

export const voiceById = (id: string) => LIB_VOICES.find((v) => v.id === id) || LIB_VOICES[0];
export const charById = (id: string) => LIB_CHARS.find((c) => c.id === id);
