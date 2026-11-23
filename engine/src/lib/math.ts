// Pure math helpers. No React here so Node tools can import this file directly.

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};
export const easeInOut = (t: number) => {
  const x = clamp(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t: number) => Math.pow(clamp(t), 2);
export const DEG = Math.PI / 180;

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Deterministic pseudo random in [0,1) from an integer seed.
export function rnd(seed: number): number {
  let x = (seed | 0) + 0x6d2b79f5;
  x = Math.imul(x ^ (x >>> 15), x | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
}

// Smooth 1D value noise (continuous, so no jitter).
export function noise1(x: number, seed = 0): number {
  const i = Math.floor(x);
  const f = x - i;
  const a = rnd(i * 374761393 + seed * 668265263) * 2 - 1;
  const b = rnd((i + 1) * 374761393 + seed * 668265263) * 2 - 1;
  return lerp(a, b, smooth(f));
}

export function mixColor(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const m = pa.map((v, i) => Math.round(lerp(v, pb[i], clamp(t))));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
}

export function parseHex(c: string): [number, number, number] {
  if (c.startsWith('rgb')) {
    const m = c.match(/\d+/g) || ['0', '0', '0'];
    return [Number(m[0]), Number(m[1]), Number(m[2])];
  }
  let h = c.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const shade = (c: string, amt: number) => (amt >= 0 ? mixColor(c, '#ffffff', amt) : mixColor(c, '#000000', -amt));

export function fmtNumber(v: number, format: string | undefined, unit?: string): string {
  switch (format) {
    case 'time': {
      const s = Math.max(0, Math.round(v));
      const hh = Math.floor(s / 3600);
      const mm = Math.floor((s % 3600) / 60);
      const ss = s % 60;
      return hh > 0
        ? `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
        : `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    }
    case 'percent':
      return `${Math.round(v)}%`;
    case 'money':
      return `$${Math.round(v).toLocaleString('en-US')}`;
    case 'decimal':
      return `${v.toFixed(1)}${unit ? ' ' + unit : ''}`;
    default:
      return `${Math.round(v).toLocaleString('en-US').replace(/,/g, ' ')}${unit ? ' ' + unit : ''}`;
  }
}
