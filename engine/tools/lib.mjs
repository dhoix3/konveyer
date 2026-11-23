// Shared helpers for the What If Cine Studio pipeline.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

export const ENGINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ROOT = path.resolve(ENGINE, '..');
export const PROJECTS = process.env.WHATIF_PROJECTS || path.join(ROOT, 'projects');
export const OUTPUT = process.env.WHATIF_OUTPUT || path.join(ROOT, 'output');
export const FPS = 24, WIDTH = 1920, HEIGHT = 1080;
export const ENGINE_VERSION = 'engine-1.1';
const require = createRequire(import.meta.url);

// Project ids are used as directory names and in shell-free spawn args. Keep them
// strictly to the same alphabet the Studio UI accepts (no path traversal).
export const safeId = (id) => /^[a-z0-9][a-z0-9_-]{0,39}$/i.test(String(id || ''));
export const assertId = (id) => {
  if (!safeId(id)) throw new Error(`invalid project id "${id}" (use letters, digits, "-" and "_", max 40 chars)`);
  return id;
};

export const projectDir = (id) => path.join(PROJECTS, assertId(id));
export const outDir = (id) => path.join(OUTPUT, assertId(id));
export const ensure = (d) => (fs.mkdirSync(d, {recursive: true}), d);

// Hash of the engine source that affects rendered output / audio. Used to
// invalidate scene and sound caches when code changes (not just project data).
let _sourceHash;
export function sourceHash() {
  if (_sourceHash) return _sourceHash;
  const files = [];
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, {withFileTypes: true})) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === 'node_modules' || ent.name === '__pycache__') continue;
        walk(p);
      } else if (/\.(ts|tsx|mjs|js|py|json)$/.test(ent.name) && !/package-lock\.json$/.test(ent.name)) {
        files.push(p);
      }
    }
  };
  for (const d of ['src', 'tools']) {
    const p = path.join(ENGINE, d);
    if (fs.existsSync(p)) walk(p);
  }
  files.sort();
  const h = crypto.createHash('sha1');
  for (const f of files) {
    h.update(path.relative(ENGINE, f).replace(/\\/g, '/'));
    h.update(fs.readFileSync(f));
  }
  _sourceHash = h.digest('hex').slice(0, 16);
  return _sourceHash;
}

export const readJson = (f, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    if (fallback !== undefined) return fallback;
    throw new Error(`Cannot read JSON: ${f}`);
  }
};

export const writeJson = (f, data) => {
  ensure(path.dirname(f));
  const tmp = f + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, f);
};

export const sha1 = (x) => crypto.createHash('sha1')
  .update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');

export const fileSha = (f) => crypto.createHash('sha1')
  .update(fs.readFileSync(f)).digest('hex');

export function logger(id, stage) {
  const dir = ensure(path.join(projectDir(id), 'logs'));
  const file = path.join(dir, `${stage}.log`);

  const write = (lvl, msg) => {
    const text = typeof msg === 'string' ? msg : JSON.stringify(msg);
    const line = `[${new Date().toISOString()}] [${lvl}] ${text}`;
    try { fs.appendFileSync(file, line + '\n'); } catch {}
    (lvl === 'ERROR' ? console.error : console.log)(`[${stage}] ${text}`);
  };

  return {
    info: (m) => write('INFO', m),
    warn: (m) => write('WARN', m),
    error: (m) => write('ERROR', m),
    debug: (m) => { if (process.env.DEBUG) write('DEBUG', m); },
    file
  };
}

// Pipeline state
export const statePath = (id) => path.join(projectDir(id), 'state.json');
export const loadState = (id) => readJson(statePath(id), {stages: {}, scenes: {}});
export const saveState = (id, s) => writeJson(statePath(id), s);

export function markStage(id, stage, status, extra = {}) {
  const s = loadState(id);
  s.stages[stage] = {status, at: new Date().toISOString(), ...extra};
  saveState(id, s);
}

// Binaries
export function ffmpegEnv() {
  const env = {...process.env};

  try {
    const dir = path.dirname(require.resolve(
      '@remotion/compositor-linux-x64-gnu/package.json',
      {paths: [ENGINE]}
    ));

    env.LD_LIBRARY_PATH = dir +
      (env.LD_LIBRARY_PATH ? ':' + env.LD_LIBRARY_PATH : '');
  } catch {}

  return env;
}

function findBin(name) {
  const exe = process.platform === 'win32' ? `${name}.exe` : name;
  const sys = spawnSync(exe, ['-version'], {encoding: 'utf8', windowsHide: true});
  if (sys.status === 0) return exe;

  // Prefer the package matching the current platform, then fall back to all
  // bundled builds (the previous code checked Linux first even on Windows).
  const order = process.platform === 'win32'
    ? ['compositor-win32-x64-msvc']
    : process.platform === 'darwin'
      ? ['compositor-darwin-arm64', 'compositor-darwin-x64']
      : ['compositor-linux-x64-gnu', 'compositor-linux-x64-musl'];
  const pkgs = [...order, 'compositor-linux-x64-gnu', 'compositor-linux-x64-musl', 'compositor-darwin-arm64', 'compositor-darwin-x64', 'compositor-win32-x64-msvc'];
  for (const pkg of [...new Set(pkgs)]) {
    try {
      const dir = path.dirname(require.resolve(
        `@remotion/${pkg}/package.json`,
        {paths: [ENGINE]}
      ));

      const f = path.join(dir, name + (pkg.includes('win32') ? '.exe' : ''));
      if (fs.existsSync(f)) return f;
    } catch {}
  }

  throw new Error(`${name} not found (install ffmpeg or run npm install in engine/)`);
}

let _ff, _fp;
export const FFMPEG = () => (_ff ||= findBin('ffmpeg'));
export const FFPROBE = () => (_fp ||= findBin('ffprobe'));

export function ff(args, opts = {}) {
  const r = spawnSync(
    FFMPEG(),
    ['-hide_banner', '-y', ...args],
    {
      encoding: 'utf8',
      env: ffmpegEnv(),
      maxBuffer: 1 << 28,
      windowsHide: true,
      ...opts
    }
  );

  if (r.error) throw new Error(`ffmpeg could not start: ${r.error.message}`);
  if (r.status !== 0 && !opts.allowFail) {
    throw new Error(`ffmpeg failed (${r.status}): ${(r.stderr || r.stdout || '').split('\n').slice(-10).join('\n')}`);
  }

  return r;
}

export function probe(file) {
  if (!fs.existsSync(file)) throw new Error(`file not found: ${file}`);
  const r = spawnSync(
    FFPROBE(),
    ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file],
    {encoding: 'utf8', env: ffmpegEnv(), maxBuffer: 1 << 26, windowsHide: true}
  );

  if (r.error) throw new Error(`ffprobe could not start: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`ffprobe failed for ${file}: ${(r.stderr || '').slice(-1200)}`);

  const j = JSON.parse(r.stdout);
  const v = j.streams.find((s) => s.codec_type === 'video');
  const a = j.streams.find((s) => s.codec_type === 'audio');
  const [n, d] = (v?.r_frame_rate || '0/1').split('/').map(Number);

  return {
    duration: Number(j.format.duration || v?.duration || a?.duration || 0),
    formatDuration: Number(j.format.duration || 0),
    videoDuration: Number(v?.duration || 0),
    audioDuration: Number(a?.duration || 0),
    width: v?.width,
    height: v?.height,
    fps: v ? n / (d || 1) : 0,
    vcodec: v?.codec_name,
    acodec: a?.codec_name,
    profile: v?.profile,
    pixFmt: v?.pix_fmt,
    nbFrames: v?.nb_frames ? Number(v.nb_frames) : undefined,
    hasAudio: !!a,
    audioChannels: a?.channels,
    audioSampleRate: a?.sample_rate ? Number(a.sample_rate) : undefined,
    bitrate: j.format.bit_rate ? Number(j.format.bit_rate) : undefined,
    size: j.format.size ? Number(j.format.size) : undefined,
    format: j.format.format_name
  };
}

// Python: explicitly prefer Piper virtual environment.
export function python() {
  const candidates = [
    // Windows layouts first (historical), then POSIX layouts.
    path.join(ENGINE, 'piper-env', 'Scripts', 'python.exe'),
    path.join(ENGINE, '.venv', 'Scripts', 'python.exe'),
    path.join(ENGINE, 'piper-env', 'bin', 'python'),
    path.join(ENGINE, '.venv', 'bin', 'python'),
    process.env.WHATIF_PYTHON,
    'python3',
    'python'
  ].filter(Boolean);

  for (const p of candidates) {
    if (path.isAbsolute(p) && !fs.existsSync(p)) continue;

    const r = spawnSync(p, ['--version'], {
      encoding: 'utf8',
      windowsHide: true
    });

    if (r.status === 0) return p;
  }

  throw new Error('Python not found (checked engine virtual environments and PATH)');
}

export function runPython(script, args, opts = {}) {
  const py = python();
  if (process.env.DEBUG) console.log(`[python] Using: ${py}`);

  const r = spawnSync(
    py,
    [path.join(ENGINE, 'tools', script), ...args],
    {
      encoding: 'utf8',
      env: {
        ...ffmpegEnv(),
        PYTHONUNBUFFERED: '1',
        // Windows consoles default to cp1251/cp866 and mangle Cyrillic paths
        // and error messages. Force UTF-8 for every Python child.
        PYTHONUTF8: '1',
        PYTHONIOENCODING: 'utf-8',
        PYTHONDONTWRITEBYTECODE: '1'
      },
      maxBuffer: 1 << 28,
      windowsHide: true,
      ...opts
    }
  );

  if (r.error) throw new Error(`${script} could not start: ${r.error.message}`);
  if (r.status !== 0) {
    throw new Error(
      `${script} failed (${r.status}):\n${(r.stderr || '') + (r.stdout || '')}`.slice(-3000)
    );
  }

  return r.stdout;
}

export function parseArgs(argv) {
  const out = {_: []};

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    if (a === '--') { out._.push(...argv.slice(i + 1)); break; }
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq > 2) { out[a.slice(2, eq)] = a.slice(eq + 1); continue; }
      const k = a.slice(2);
      if (k.startsWith('no-')) { out[k] = true; out[k.slice(3)] = false; continue; }
      const nxt = argv[i + 1];

      if (nxt === undefined || (nxt.startsWith('--') && nxt.length > 2)) {
        out[k] = true;
      } else {
        out[k] = nxt;
        i++;
      }
    } else {
      out._.push(a);
    }
  }

  return out;
}