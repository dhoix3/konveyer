// One policy for frame rendering, video rendering and diagnostics.
import fs from 'node:fs';
import path from 'node:path';
export function findBrowser({env = process.env, platform = process.platform, isFile = p => {
  try { return fs.statSync(p).isFile(); } catch { return false; }
}} = {}) {
  const explicit = env.REMOTION_BROWSER_EXECUTABLE?.trim().replace(/^"(.*)"$/, '$1');
  if (explicit) {
    if (!isFile(explicit)) throw new Error(`REMOTION_BROWSER_EXECUTABLE: файл не найден: ${explicit}`);
    return explicit;
  }
  const join = platform === 'win32' ? path.win32.join : path.join;
  const candidates = platform === 'win32' ? [
    join(env.PROGRAMFILES || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ...(env.LOCALAPPDATA ? [join(env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe')] : []),
  ] : platform === 'darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
    : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  return candidates.find(isFile) || null;
}
export async function prepareBrowser(log, {env = process.env, ensure, ...options} = {}) {
  const browserExecutable = findBrowser({env, ...options});
  const ensureBrowser = ensure || (await import('@remotion/renderer')).ensureBrowser;
  const status = await ensureBrowser({browserExecutable, onBrowserDownload: () => {
    if (env.REMOTION_ALLOW_BROWSER_DOWNLOAD !== '1') {
      throw new Error('Chrome не найден. Установите Chrome или задайте REMOTION_BROWSER_EXECUTABLE. Для явной загрузки: REMOTION_ALLOW_BROWSER_DOWNLOAD=1.');
    }
    return {onProgress: () => {}};
  }});
  if (!status.path) throw new Error(`Remotion browser unavailable: ${status.type}`);
  log?.info(`Browser: ${status.path}`);
  return status.path;
}
