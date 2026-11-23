#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Local Russian text-to-speech with Piper (ONNX). Free, offline, no API keys.

usage:
  tts.py jobs.json        jobs: [{id,text,model,pitch,speed,out,lang?}]
  tts.py --version

The stage is deliberately fault tolerant: one bad line must not destroy the
whole batch.  Every job is synthesised atomically (.part -> .wav) and the
result is written to jobs.json.results.json.  Callers decide whether partial
success is acceptable.
"""
from __future__ import annotations

import json
import os
import sys
import traceback
import wave

import numpy as np
from piper import PiperVoice, SynthesisConfig

try:  # keep Cyrillic readable when the script is run by hand on Windows
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

from textnorm import prepare

TTS_VERSION = "tts-3"
TARGET_PEAK_DB = -3.0
CHUNK_FADE = 0.006          # seconds, de-click at chunk joins
LEAD_SILENCE = 0.06
TAIL_SILENCE = 0.14
TRIM_KEEP = 0.02


def db2lin(db: float) -> float:
    return 10.0 ** (db / 20.0)


def trim_silence(audio: np.ndarray, sr: int, thresh_db: float = -48.0) -> np.ndarray:
    """Remove near-silence at both ends but keep a short natural pad."""
    if audio.size == 0:
        return audio
    peak = float(np.max(np.abs(audio)))
    if peak < 1e-6:
        return audio
    idx = np.where(np.abs(audio) > peak * db2lin(thresh_db))[0]
    if idx.size == 0:
        return audio
    pad = int(sr * TRIM_KEEP)
    a = max(0, int(idx[0]) - pad)
    b = min(len(audio), int(idx[-1]) + pad + 1)
    return audio[a:b]


def apply_fade(audio: np.ndarray, sr: int, fade_in: float = CHUNK_FADE, fade_out: float = CHUNK_FADE) -> np.ndarray:
    n_in = min(len(audio), max(1, int(sr * fade_in)))
    n_out = min(len(audio), max(1, int(sr * fade_out)))
    if n_in:
        audio[:n_in] *= np.linspace(0.0, 1.0, n_in, dtype=np.float32)
    if n_out:
        audio[-n_out:] *= np.linspace(1.0, 0.0, n_out, dtype=np.float32)
    return audio


def rms(audio: np.ndarray) -> float:
    if audio.size == 0:
        return 0.0
    return float(np.sqrt(np.mean(np.square(audio, dtype=np.float64))))


def synth_chunk(voice: PiperVoice, text: str, cfg: SynthesisConfig) -> tuple[np.ndarray, int]:
    parts = []
    sr = int(voice.config.sample_rate or 22050)
    for ch in voice.synthesize(text, syn_config=cfg):
        sr = int(ch.sample_rate or sr)
        parts.append(np.asarray(ch.audio_float_array, dtype=np.float32).reshape(-1))
    if not parts:
        return np.zeros(0, dtype=np.float32), sr
    return np.concatenate(parts), sr


def synthesize_job(voice: PiperVoice, job: dict) -> tuple[np.ndarray, int, dict]:
    lang = job.get("lang") or "ru"
    pitch = float(job.get("pitch", 1.0) or 1.0)
    speed = float(job.get("speed", 1.0) or 1.0)
    pitch = max(0.7, min(1.4, pitch))
    speed = max(0.7, min(1.4, speed))

    prep = prepare(str(job.get("text") or ""), lang)
    chunks = prep.get("chunks") or []
    if not chunks:
        raise ValueError("empty text after normalisation")

    # length_scale > 1 is slower.  Keep the historical pitch/speed coupling so
    # existing project files sound the same, but clamp it to a sane range.
    cfg = SynthesisConfig(
        length_scale=max(0.55, min(1.9, pitch / max(speed, 1e-3))),
        noise_scale=0.667,
        noise_w_scale=0.8,
        normalize_audio=False,  # per-sentence normalisation destroys levels
    )

    pieces: list[np.ndarray] = []
    sr = int(voice.config.sample_rate or 22050)
    levels: list[tuple[np.ndarray, float]] = []
    for ch in chunks:
        audio, sr = synth_chunk(voice, ch["text"], cfg)
        if audio.size == 0:
            continue
        audio = trim_silence(audio, sr)
        audio = apply_fade(audio.copy(), sr)
        levels.append((audio, rms(audio)))

    if not levels:
        raise ValueError("Piper produced no audio")

    # Gentle per-chunk level matching: keep expressive variation but remove the
    # occasional 6-10 dB drop that makes one phrase disappear under the music.
    good = [r for _, r in levels if r > 1e-4]
    target = float(np.median(good)) if good else 0.05
    for i, (audio, level) in enumerate(levels):
        if level > 1e-4 and target > 1e-4:
            gain = max(0.7, min(1.45, target / level))  # about -3..+3 dB
            audio = audio * gain
        pieces.append(audio)
        if i < len(levels) - 1:
            pause = float(chunks[i].get("pause", 0.2) or 0.2)
            pause = max(0.06, min(0.7, pause))
            pieces.append(np.zeros(int(sr * pause), dtype=np.float32))

    audio = np.concatenate(pieces).astype(np.float32)

    # Pitch shift by resampling (same trick as before), compensated above in
    # length_scale so the speaking rate stays close to requested.
    if abs(pitch - 1.0) > 1e-3:
        n = max(1, int(round(len(audio) / pitch)))
        audio = np.interp(
            np.linspace(0.0, len(audio) - 1.0, n, dtype=np.float64),
            np.arange(len(audio), dtype=np.float64),
            audio,
        ).astype(np.float32)

    # Lead-in / tail so the mixer never has to butt-join a hard onset.
    audio = np.concatenate([
        np.zeros(int(sr * LEAD_SILENCE), dtype=np.float32),
        audio,
        np.zeros(int(sr * TAIL_SILENCE), dtype=np.float32),
    ])

    # Peak normalise the finished clip.  This is a safety ceiling, not a
    # loudness processor: the mixer matches voice/music levels later.
    peak = float(np.max(np.abs(audio)))
    if peak > 1e-6:
        audio = audio * (db2lin(TARGET_PEAK_DB) / peak)
    audio = np.clip(audio, -1.0, 1.0)

    meta = {
        "normalized": prep.get("normalized", ""),
        "chunks": len(chunks),
        "duration": round(len(audio) / sr, 3),
        "sampleRate": sr,
    }
    return audio, sr, meta


def write_wav_atomic(path: str, audio: np.ndarray, sr: int) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    tmp = path + ".part"
    pcm = np.clip(audio * 32767.0, -32768, 32767).astype(np.int16)
    with wave.open(tmp, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())
    os.replace(tmp, path)


def main(argv: list[str]) -> int:
    if "--version" in argv:
        print(f"piper tts {TTS_VERSION}")
        return 0
    if len(argv) < 2:
        print("usage: tts.py jobs.json", file=sys.stderr)
        return 2

    jobs_path = argv[1]
    with open(jobs_path, "r", encoding="utf-8") as f:
        jobs = json.load(f)
    if not isinstance(jobs, list):
        raise SystemExit("jobs.json must contain a list")

    voices: dict[str, PiperVoice] = {}
    ok, failed = [], []
    for job in jobs:
        jid = str(job.get("id") or "?")
        try:
            model = str(job["model"])
            if not os.path.isfile(model):
                raise FileNotFoundError(f"voice model missing: {model}")
            voice = voices.get(model)
            if voice is None:
                voice = PiperVoice.load(model)
                voices[model] = voice
            audio, sr, meta = synthesize_job(voice, job)
            write_wav_atomic(str(job["out"]), audio, sr)
            ok.append({"id": jid, **meta})
            print(f"ok {jid} {meta['duration']:.2f}s", flush=True)
        except Exception as exc:  # keep the batch alive
            msg = f"{type(exc).__name__}: {exc}"
            failed.append({"id": jid, "error": msg})
            print(f"fail {jid} {msg}", flush=True)
            if os.environ.get("DEBUG"):
                traceback.print_exc()

    results = {"version": TTS_VERSION, "ok": ok, "failed": failed}
    with open(jobs_path + ".results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"done {len(ok)} ok, {len(failed)} failed", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
