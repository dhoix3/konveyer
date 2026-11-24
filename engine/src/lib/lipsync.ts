export interface SpeechData {
  step: number;
  values: number[];
  words: {text: string; start: number; end: number}[];
  wordTiming: 'aligned' | 'provided' | 'energy-estimated';
  visemes?: {start: number; end: number; shape: string}[];
}
export function mouthAt(speech: SpeechData, time: number): number {
  if(time<0 || time>=speech.values.length*speech.step)return 0;
  // Nearest analysis bin: interpolation would open the mouth inside a silent bin.
  if(speech.wordTiming==='aligned' && !speech.words.some(w=>time>=w.start&&time<w.end))return 0;
  const amplitude=speech.values[Math.floor(time/speech.step)]||0;
  if(amplitude===0)return 0;
  const viseme=speech.visemes?.find(v=>time>=v.start&&time<v.end);
  return viseme?.shape==='closed'?0:amplitude;
}

export function mouthOpening(talk: number, emotion: number, time: number, audioDriven=false): number {
  const value=audioDriven?talk:emotion+talk*(0.35+0.65*(0.5+0.5*Math.sin(time*22)));
  return Math.max(0,Math.min(1,value));
}
