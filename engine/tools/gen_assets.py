#!/usr/bin/env python3
"""Generates procedural assets (film grain tile). usage: gen_assets.py <public_dir>"""
import sys, os, zlib, struct
import numpy as np
out = os.path.join(sys.argv[1], 'fx'); os.makedirs(out, exist_ok=True)
rng = np.random.default_rng(7)
n = 256
g = np.clip(128 + rng.normal(0, 38, (n, n)), 0, 255).astype(np.uint8)
raw = b''.join(b'\x00' + g[y].tobytes() for y in range(n))
def chunk(t, d): c = struct.pack('>I', len(d)) + t + d; return c + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', n, n, 8, 0, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
open(os.path.join(out, 'grain.png'), 'wb').write(png)
print('grain.png written')
