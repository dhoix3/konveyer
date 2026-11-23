// Local speech recognition: Whisper (ONNX) through @huggingface/transformers. No API, runs offline after first model download.
import fs from 'node:fs';
import {ffmpegEnv, FFMPEG} from './lib.mjs';
import {spawnSync} from 'node:child_process';

export async function transcribe(wavFile, {language = 'ru', model = 'Xenova/whisper-tiny'} = {}) {
  const {pipeline} = await import('@huggingface/transformers');
  // decode to 16 kHz mono PCM through a temporary WAV (the bundled ffmpeg has no raw f32 muxer)
  const tmp = wavFile.replace(/\.wav$/, '') + '.16k.wav';
  const r = spawnSync(FFMPEG(), ['-v', 'error', '-y', '-i', wavFile, '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', tmp], {env: ffmpegEnv()});
  if (r.status !== 0) throw new Error('ffmpeg decode failed: ' + String(r.stderr || r.error).slice(0, 200));
  const buf = fs.readFileSync(tmp);
  fs.unlinkSync(tmp);
  const off = buf.indexOf('data') + 8;
  const n = Math.floor((buf.length - off) / 2);
  const pcm = new Float32Array(n);
  for (let i = 0; i < n; i++) pcm[i] = buf.readInt16LE(off + i * 2) / 32768;
  const asr = await pipeline('automatic-speech-recognition', model, {dtype: 'q8'});
  const out = await asr(pcm, {language: language === 'ru' ? 'russian' : 'english', task: 'transcribe', return_timestamps: 'word', chunk_length_s: 30, stride_length_s: 5});
  const words = (out.chunks || []).map((c) => ({text: c.text.trim(), start: c.timestamp[0], end: c.timestamp[1] ?? c.timestamp[0] + 0.3}));
  return {text: out.text, words, model};
}
