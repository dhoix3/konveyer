export const VOICE_REGISTRY=[
  {id:'ru-narrator',role:'narrator',language:'ru',model:'ru_RU-denis-medium',prosody:{speed:0.95,pitch:1,noiseScale:0.667,noiseW:0.8}},
  {id:'ru-prince',role:'prince',language:'ru',model:'ru_RU-denis-medium',prosody:{speed:0.94,pitch:0.93,noiseScale:0.6,noiseW:0.8}},
  {id:'ru-princess',role:'princess',language:'ru',model:'ru_RU-irina-medium',prosody:{speed:1,pitch:1,noiseScale:0.667,noiseW:0.8}},
  {id:'ru-chronicler',role:'chronicler',language:'ru',model:'ru_RU-dmitri-medium',prosody:{speed:0.92,pitch:1,noiseScale:0.6,noiseW:0.8}},
  {id:'en-narrator',role:'narrator',language:'en',model:'en_US-ryan-medium',prosody:{speed:1,pitch:1,noiseScale:0.667,noiseW:0.8}},
];
export function profileFor(voice,project) {
  const id=project.settings?.voiceProfiles?.[voice.id];
  if(!id)return null;
  const p=VOICE_REGISTRY.find(p=>p.id===id);
  if(!p||p.language!==project.language)throw new Error(`Unknown/incompatible voice profile: ${id}`);
  return p;
}
export function prosodyFor(voice,project) {
  const values={speed:voice.speed||1,pitch:voice.piper?.pitch||1,noiseScale:0.667,noiseW:0.8,...profileFor(voice,project)?.prosody,...project.settings?.voiceProsody?.[voice.id]};
  for(const [key,min,max] of [['speed',0.55,1.8],['pitch',0.7,1.4],['noiseScale',0,2],['noiseW',0,2]])if(!Number.isFinite(values[key])||values[key]<min||values[key]>max)throw new Error(`Invalid prosody ${key}`);
  return values;
}
