#!/usr/bin/env python3
"""Procedural sound design + mixer. Pure numpy: no samples, no paid APIs.
usage: mixer.py audio_plan.json out.wav
Synthesises music, ambience beds and SFX, ducks music/ambience under speech, writes a stereo 44.1k WAV."""
import sys, json, wave, os
import numpy as np

SR = 44100
rng = np.random.default_rng(1234)

def tt(d): return np.arange(int(d * SR)) / SR
def noise(n): return rng.standard_normal(n).astype(np.float32)
def edecay(n, tau): return np.exp(-np.arange(n) / SR / tau).astype(np.float32)
def fade(x, a=0.005, b=0.02):
    x = x.copy(); na, nb = int(a * SR), int(b * SR)
    if na: x[:na] *= np.linspace(0, 1, na)
    if nb and nb < len(x): x[-nb:] *= np.linspace(1, 0, nb)
    return x
def fftf(x, lo=None, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR) + 1e-9
    m = np.ones_like(f)
    if lo: m = m / (1 + (lo / f) ** 4)
    if hi: m = m / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x)).astype(np.float32)
def sine(f, d, ph=0): return np.sin(2 * np.pi * f * tt(d) + ph).astype(np.float32)
def sweep(f0, f1, d):
    t = tt(d); f = f0 * (f1 / f0) ** (t / d); return np.sin(2 * np.pi * np.cumsum(f) / SR).astype(np.float32)
def reverb(x, wet=0.3, tail=1.2):
    n = int(tail * SR); ir = noise(n) * edecay(n, tail / 4); ir = fftf(ir, hi=5000)
    L = len(x) + n; y = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L).astype(np.float32)
    y /= (np.max(np.abs(y)) + 1e-9) / (np.max(np.abs(x)) + 1e-9)
    out = np.zeros(L, np.float32); out[:len(x)] += x * (1 - wet); out += y * wet; return out
def norm(x, peak=0.9): return x / (np.max(np.abs(x)) + 1e-9) * peak

# ---------------------------------------------------------------- SFX
def footstep(surface):
    cut = {'wood': 900, 'concrete': 1800, 'grass': 500, 'metal': 3000, 'tile': 2200}.get(surface, 1200)
    n = int(0.16 * SR); x = fftf(noise(n), lo=80, hi=cut) * edecay(n, 0.035)
    thump = sine(70 + rng.random() * 20, 0.16) * edecay(n, 0.04) * 0.9
    y = x / (np.max(np.abs(x)) + 1e-9) * 0.7 + thump
    if surface == 'metal': y += sine(1400, 0.16) * edecay(n, 0.02) * 0.2
    return norm(y, 0.8)
def door_open():
    d = 0.9; t = tt(d); f = 190 + 120 * (t / d) + 14 * np.sin(2 * np.pi * 7 * t)
    creak = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.5 + 0.5 * np.sin(2 * np.pi * 23 * t)) * np.sin(np.pi * t / d)
    return norm(creak * 0.7 + fftf(noise(len(t)), lo=600, hi=3000) * 0.15 * np.sin(np.pi * t / d), 0.6)
def door_close():
    n = int(0.6 * SR); y = sine(75, 0.6) * edecay(n, 0.12) + fftf(noise(n), hi=1500) * edecay(n, 0.03) * 0.8
    return norm(y, 0.9)
def knock():
    out = np.zeros(int(1.0 * SR), np.float32)
    for i, o in enumerate([0.0, 0.28, 0.52]):
        n = int(0.12 * SR); k = (sine(150, 0.12) + fftf(noise(n), hi=1200) * 0.6) * edecay(n, 0.03)
        s = int(o * SR); out[s:s + n] += k
    return norm(out, 0.8)
def impact():
    n = int(1.4 * SR); y = sine(52, 1.4) * edecay(n, 0.3) + fftf(noise(n), hi=300) * edecay(n, 0.25) * 0.9
    return reverb(norm(y, 0.95), 0.2, 0.8)
def boom():
    n = int(2.6 * SR); y = sweep(90, 32, 2.6) * edecay(n, 0.7) + fftf(noise(n), hi=200) * edecay(n, 0.6)
    return reverb(norm(y, 0.95), 0.35, 1.8)
def hit():
    n = int(0.25 * SR); return norm((fftf(noise(n), lo=100, hi=2500) + sine(110, 0.25) * 0.8) * edecay(n, 0.05), 0.85)
def whoosh():
    d = 0.9; n = int(d * SR); t = tt(d); x = fftf(noise(n), lo=500, hi=5000) * np.sin(np.pi * t / d) ** 2
    return norm(x, 0.55)
def notification():
    out = np.zeros(int(0.9 * SR), np.float32)
    for f, o in [(880, 0), (1318, 0.13)]:
        n = int(0.5 * SR); s = int(o * SR); out[s:s + n] += sine(f, 0.5) * edecay(n, 0.12)
    return norm(out, 0.6)
def phone_buzz():
    d = 0.7; t = tt(d); return norm(np.sign(np.sin(2 * np.pi * 160 * t)) * 0.4 * (np.sin(2 * np.pi * 22 * t) > 0) + fftf(noise(len(t)), hi=500) * 0.2, 0.5)
def alarm():
    out = np.zeros(int(1.6 * SR), np.float32)
    for i in range(4):
        f = 1000 if i % 2 == 0 else 780; n = int(0.3 * SR); s = int(i * 0.38 * SR)
        out[s:s + n] += np.sign(sine(f, 0.3)) * 0.25 * np.sin(np.pi * np.linspace(0, 1, n))
    return norm(fftf(out, hi=4000), 0.5)
def tick(): n = int(0.03 * SR); return norm(fftf(noise(n), lo=1500, hi=6000) * edecay(n, 0.006), 0.5)
def thunder():
    d = 4.0; n = int(d * SR); r = fftf(noise(n), hi=180) * edecay(n, 1.2) * (1 + 0.5 * np.sin(2 * np.pi * 3 * tt(d)))
    crack = fftf(noise(n), lo=800, hi=6000) * edecay(n, 0.05) * 0.8
    return reverb(norm(r + crack, 0.95), 0.3, 2.0)
def heartbeat():
    out = np.zeros(int(2.0 * SR), np.float32)
    for b in range(2):
        for o, g in [(0, 1.0), (0.22, 0.7)]:
            n = int(0.18 * SR); s = int((b * 0.9 + o) * SR); out[s:s + n] += sweep(90, 45, 0.18) * edecay(n, 0.05) * g
    return norm(fftf(out, hi=250), 0.95)
def riser():
    d = 3.2; n = int(d * SR); t = tt(d); x = fftf(noise(n), lo=300, hi=7000) * (t / d) ** 2 + sweep(100, 900, d) * 0.3 * (t / d)
    return reverb(norm(x, 0.7) * fade(np.ones(n, np.float32), 0.1, 0.05), 0.2, 0.8)
def sting():
    d = 2.0; n = int(d * SR); y = sum(sine(f, d) for f in (293.7, 311.1, 415.3, 622.3)) * edecay(n, 0.7) + fftf(noise(n), lo=2000) * edecay(n, 0.08) * 0.5
    return reverb(norm(y, 0.7), 0.4, 1.6)
def beep(): return fade(norm(sine(1000, 0.18), 0.35), 0.005, 0.02)
def static(): d = 1.0; n = int(d * SR); return norm(fftf(noise(n), lo=200, hi=8000) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 40 * tt(d)))), 0.35)
def powerdown(): d = 1.8; n = int(d * SR); return norm(sweep(500, 28, d) * edecay(n, 0.9) + fftf(noise(n), hi=400) * edecay(n, 0.3) * 0.4, 0.7)
def click(): n = int(0.02 * SR); return norm(fftf(noise(n), lo=800) * edecay(n, 0.004), 0.5)
def cup_set(): n = int(0.4 * SR); return norm(sine(1850, 0.4) * edecay(n, 0.04) * 0.5 + sine(95, 0.4) * edecay(n, 0.05) + fftf(noise(n), lo=1000) * edecay(n, 0.01) * 0.4, 0.5)
def keyboard():
    out = np.zeros(int(1.5 * SR), np.float32)
    for o in np.sort(rng.random(14) * 1.3):
        n = int(0.025 * SR); s = int(o * SR); out[s:s + n] += fftf(noise(n), lo=1500, hi=7000) * edecay(n, 0.006) * (0.5 + 0.5 * rng.random())
    return norm(out, 0.4)
def swell():
    d = 3.0; n = int(d * SR); t = tt(d); y = sum(sine(f, d) for f in (196, 247, 294, 392)) * np.sin(np.pi * t / d) ** 2
    return reverb(norm(y, 0.55), 0.35, 1.5)
def fall_thud(): n = int(0.7 * SR); return reverb(norm((sine(60, 0.7) * edecay(n, 0.12) + fftf(noise(n), hi=800) * edecay(n, 0.05)), 0.9), 0.15, 0.5)
def glass():
    n = int(1.2 * SR); y = sum(sine(f, 1.2) * edecay(n, 0.15) for f in (2400, 3100, 4200, 5300)) + fftf(noise(n), lo=3000) * edecay(n, 0.03); return norm(y, 0.5)
def shutter(): return norm(np.concatenate([click(), np.zeros(int(0.05 * SR), np.float32), click() * 0.7]), 0.5)

SFX = {'door_open': door_open, 'door_close': door_close, 'knock': knock, 'impact': impact, 'boom': boom, 'hit': hit, 'whoosh': whoosh,
       'notification': notification, 'phone_buzz': phone_buzz, 'alarm': alarm, 'tick': tick, 'thunder': thunder, 'heartbeat': heartbeat,
       'riser': riser, 'sting': sting, 'beep': beep, 'static': static, 'powerdown': powerdown, 'click': click, 'cup_set': cup_set,
       'keyboard': keyboard, 'swell': swell, 'fall_thud': fall_thud, 'glass': glass, 'shutter': shutter}
_cache = {}
def get_sfx(kind):
    if kind.startswith('footstep'):
        key = kind
        v = _cache.setdefault(key, [footstep(kind.split('_')[1] if '_' in kind else 'wood') for _ in range(4)])
        return v[int(rng.integers(0, len(v)))]
    if kind not in SFX: print('unknown sfx', kind, file=sys.stderr); kind = 'click'
    return _cache.setdefault(kind, SFX[kind]())

# ---------------------------------------------------------------- ambience beds (loopable ~20s)
def amb_bed(kind, d=20):
    n = int(d * SR); t = tt(d)
    hum = lambda f, g: np.sin(2 * np.pi * f * t) * g
    if kind == 'silence': return np.zeros(n, np.float32)
    if kind == 'rain':
        x = fftf(noise(n), lo=800, hi=9000) * 0.5 + fftf(noise(n), hi=300) * 0.3
        for o in rng.random(200) * d:
            s = int(o * SR); m = int(0.02 * SR)
            if s + m < n: x[s:s + m] += fftf(noise(m), lo=2000) * edecay(m, 0.004) * 0.6
        return norm(x, 0.5)
    if kind == 'street':
        x = fftf(noise(n), lo=40, hi=500) * 1.0 + fftf(noise(n), lo=500, hi=3000) * 0.08
        for o in rng.random(3) * d * 0.8:
            m = int(3.0 * SR); s = int(o * SR); car = fftf(noise(m), lo=150, hi=1200) * np.sin(np.pi * np.linspace(0, 1, m)) ** 2 * 0.7
            e = min(n - s, m); x[s:s + e] += car[:e]
        return norm(x, 0.45)
    if kind == 'city':
        return norm(fftf(noise(n), lo=30, hi=400) + fftf(noise(n), lo=400, hi=2500) * 0.1 + hum(60, 0.05), 0.4)
    if kind == 'forest' or kind == 'wind':
        w = fftf(noise(n), lo=80, hi=700 if kind == 'wind' else 500) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.17 * t))
        x = w * (1.0 if kind == 'wind' else 0.5)
        if kind == 'forest':
            for o in rng.random(6) * d:
                m = int(0.35 * SR); s = int(o * SR)
                if s + m < n:
                    f0 = 2600 + rng.random() * 1200; ch = np.sin(2 * np.pi * np.cumsum(f0 + 900 * np.sin(2 * np.pi * 14 * tt(0.35))) / SR) * np.sin(np.pi * np.linspace(0, 1, m)) ** 2
                    x[s:s + m] += ch * 0.12
            x += np.sin(2 * np.pi * 4300 * t) * (np.sin(2 * np.pi * 38 * t) > 0.6) * 0.012
        return norm(x, 0.4)
    if kind == 'hospital':
        x = hum(120, 0.15) + hum(60, 0.1) + fftf(noise(n), hi=600) * 0.15
        for o in np.arange(1, d, 1.6):
            s = int(o * SR); m = int(0.12 * SR); x[s:s + m] += sine(1000, 0.12) * 0.12
        return norm(x, 0.35)
    if kind == 'office':
        x = hum(100, 0.1) + hum(50, 0.1) + fftf(noise(n), lo=200, hi=900) * 0.1
        for o in rng.random(30) * d:
            s = int(o * SR); m = int(0.02 * SR); x[s:s + m] += fftf(noise(m), lo=1500) * edecay(m, 0.005) * 0.25
        return norm(x, 0.3)
    # room_night default: low hum + faint tick
    x = hum(50, 0.2) + hum(100, 0.07) + fftf(noise(n), hi=300) * 0.1
    for o in np.arange(0.5, d, 1.0):
        s = int(o * SR); m = int(0.02 * SR); x[s:s + m] += fftf(noise(m), lo=1500, hi=5000) * edecay(m, 0.004) * 0.18
    return norm(x, 0.3)

# ---------------------------------------------------------------- music
MOODS = {
    'dark_ambient': dict(bpm=58, root=55.0, prog=[[0, 3, 7], [-4, -1, 3], [-2, 1, 5], [-5, -2, 2]], drums=0, arp=0, pulse=0, bright=1800),
    'tense': dict(bpm=96, root=55.0, prog=[[0, 3, 7], [0, 3, 7], [-2, 1, 5], [-4, -1, 3]], drums=1, arp=0, pulse=1, bright=3000),
    'mystery': dict(bpm=72, root=65.4, prog=[[0, 3, 7, 10], [-4, 0, 3], [-2, 2, 5], [-7, -3, 0]], drums=0, arp=1, pulse=0, bright=3500),
    'epic': dict(bpm=100, root=65.4, prog=[[0, 7, 12], [-4, 3, 8], [-2, 5, 10], [-5, 2, 7]], drums=1, arp=0, pulse=1, bright=5000),
    'emotional': dict(bpm=66, root=98.0, prog=[[0, 4, 7], [-3, 0, 4], [-5, -1, 2], [-7, -3, 0]], drums=0, arp=1, pulse=0, bright=4500),
    'lofi': dict(bpm=78, root=82.4, prog=[[0, 3, 7, 10], [5, 8, 12], [3, 7, 10], [7, 10, 14]], drums=1, arp=1, pulse=0, bright=3000),
}
def pad_note(f, d):
    n = int(d * SR); t = np.arange(n) / SR; y = np.zeros(n, np.float32)
    for det in (-0.004, 0.0, 0.004):
        for h, g in ((1, 1.0), (2, 0.4), (3, 0.2), (4, 0.1)):
            y += np.sin(2 * np.pi * f * h * (1 + det) * t + det * 50) * g
    a = np.minimum(1, t / 0.9); r = np.minimum(1, (d - t) / 1.0); return (y * a * r).astype(np.float32) / 8
def pluck(f, d=1.2):
    n = int(d * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 6) + 0.2 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t * 9)).astype(np.float32) * np.exp(-t * 3.2) * np.minimum(1, t / 0.004)
def kick():
    n = int(0.35 * SR); return sweep(130, 42, 0.35) * edecay(n, 0.1)
def make_music(mood, total, curve):
    m = MOODS.get(mood, MOODS['dark_ambient'])
    n = int(total * SR) + SR * 3; out = np.zeros(n, np.float32)
    beat = 60.0 / m['bpm']; bar = beat * 4; nb = int(total / bar) + 2
    for b in range(nb):
        ch = m['prog'][b % len(m['prog'])]; s = int(b * bar * SR)
        for semi in ch:
            f = m['root'] * 4 * 2 ** (semi / 12); p = pad_note(f, bar + 1.2); e = min(len(p), n - s)
            if e > 0: out[s:s + e] += p[:e] * 0.9
        bass = sine(m['root'] * 2 ** (ch[0] / 12), bar + 0.5) * np.minimum(1, np.linspace(0, 6, int((bar + 0.5) * SR))) * 0.5
        e = min(len(bass), n - s)
        if e > 0: out[s:s + e] += bass[:e]
        if m['arp']:
            for k in range(8):
                semi = ch[(k * 2 + b) % len(ch)] + (12 if k % 3 == 0 else 0); f = m['root'] * 8 * 2 ** (semi / 12)
                ps = s + int(k * beat / 2 * SR); pl = pluck(f) * 0.22; e = min(len(pl), n - ps)
                if e > 0 and (b + k) % 4 != 3: out[ps:ps + e] += pl[:e]
        if m['drums']:
            for k in range(4):
                ps = s + int(k * beat * SR); kk = kick() * (0.9 if k % 2 == 0 else 0.45); e = min(len(kk), n - ps)
                if e > 0: out[ps:ps + e] += kk[:e]
            for k in range(8):
                ps = s + int((k + 0.5) * beat / 2 * SR); h = fftf(noise(int(0.04 * SR)), lo=6000) * edecay(int(0.04 * SR), 0.008) * 0.12; e = min(len(h), n - ps)
                if e > 0 and k % 2 == 1: out[ps:ps + e] += h[:e]
        if m['pulse']:
            for k in range(8):
                ps = s + int(k * beat / 2 * SR); pn = sine(m['root'] * 2 ** (ch[0] / 12), beat / 2) * edecay(int(beat / 2 * SR), 0.12) * 0.35; e = min(len(pn), n - ps)
                if e > 0: out[ps:ps + e] += pn[:e]
    out = fftf(out, hi=m['bright'])
    out = reverb(out[:int(total * SR)], 0.25, 1.5)[:int(total * SR)]
    # intensity curve (sections) with smooth transitions
    t = np.arange(len(out)) / SR; xs = [0.0]; ys = [curve[0]['level'] if curve else 0.6]
    for c in curve: xs += [c['t0'] + 0.01, c['t1'] - 0.01]; ys += [c['level'], c['level']]
    g = np.interp(t, xs, ys); k = int(0.8 * SR); g = np.convolve(g, np.ones(k) / k, mode='same')
    return norm(out, 0.9) * g.astype(np.float32)

# ---------------------------------------------------------------- IO / mixing
def read_wav(path):
    with wave.open(path, 'rb') as w:
        ch, sw, sr, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
        raw = w.readframes(n)
    a = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768 if sw == 2 else np.frombuffer(raw, dtype=np.uint8).astype(np.float32) / 128 - 1
    if ch > 1: a = a.reshape(-1, ch).mean(axis=1)
    if sr != SR: a = np.interp(np.linspace(0, len(a) - 1, int(len(a) * SR / sr)), np.arange(len(a)), a).astype(np.float32)
    return a
def put(buf, x, t, gain=1.0, pan=0.0):
    s = int(t * SR)
    if s < 0 or s >= buf.shape[1]: return
    e = min(len(x), buf.shape[1] - s); l = gain * np.sqrt(0.5 * (1 - pan)); r = gain * np.sqrt(0.5 * (1 + pan))
    buf[0, s:s + e] += x[:e] * l; buf[1, s:s + e] += x[:e] * r
def envelope(x, win=0.04):
    k = int(win * SR); return np.sqrt(np.convolve(x * x, np.ones(k) / k, mode='same'))
def smooth_follow(g, attack=0.06, release=0.6):
    out = np.empty_like(g); v = 0.0; a = 1 - np.exp(-1 / (attack * 100)); r = 1 - np.exp(-1 / (release * 100))
    gd = g[::441]  # 100 Hz control rate
    res = np.empty_like(gd)
    for i, x in enumerate(gd):
        v += (x - v) * (a if x > v else r); res[i] = v
    return np.interp(np.arange(len(g)), np.arange(len(gd)) * 441, res).astype(np.float32)

def main():
    plan = json.load(open(sys.argv[1])); outp = sys.argv[2]
    dur = plan['duration']; n = int(dur * SR) + SR
    voice = np.zeros((2, n), np.float32); music = np.zeros((2, n), np.float32); amb = np.zeros((2, n), np.float32); sfx = np.zeros((2, n), np.float32)
    for v in plan.get('voice', []): put(voice, read_wav(v['file']), v['t'], v.get('gain', 1.0))
    mus = make_music(plan['music']['mood'], dur, plan['music']['sections'])
    music[0, :len(mus)] = mus; music[1, :len(mus)] = mus
    beds = {}
    for a in plan.get('ambience', []):
        if a['id'] not in beds: beds[a['id']] = amb_bed(a['id'])
        bed = beds[a['id']]; s, e = int(a['t0'] * SR), min(int(a['t1'] * SR), n)
        if e <= s: continue
        seg = np.resize(bed, e - s).astype(np.float32); f = int(min(0.6, (a['t1'] - a['t0']) / 3) * SR)
        env = np.ones(e - s, np.float32); env[:f] = np.linspace(0, 1, f); env[-f:] = np.linspace(1, 0, f)
        seg = seg * env * a.get('gain', 0.5); amb[0, s:e] += seg; amb[1, s:e] += seg
    for s in plan.get('sfx', []): put(sfx, get_sfx(s['kind']), s['t'], s.get('gain', 0.8) * 0.9, s.get('pan', 0.0))
    # speech ducking: music -12 dB, ambience -6 dB while someone talks
    vm = voice.mean(axis=0); env = envelope(vm); talk = (env > 0.015).astype(np.float32)
    duck = smooth_follow(talk, 0.08, 0.7)
    gm = 1 - duck * (1 - 10 ** (-12 / 20)); ga = 1 - duck * (1 - 10 ** (-6 / 20))
    mix = voice * 1.0 + music * 0.32 * gm + amb * 0.5 * ga + sfx * 0.85
    mix = np.tanh(mix * 0.9) / np.tanh(0.9)
    mix = mix[:, :int(dur * SR)]
    pk = np.max(np.abs(mix)); mix = mix / max(1.0, pk / 0.95)
    pcm = (np.clip(mix, -1, 1).T * 32767).astype(np.int16)
    with wave.open(outp, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print(f'mixed {dur:.2f}s, ducking {float(duck.mean()) * 100:.0f}% of timeline, peak {pk:.2f}')
main()
