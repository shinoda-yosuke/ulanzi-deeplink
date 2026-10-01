import { spawn } from 'node:child_process';
import path from 'node:path';

// A scheme is at least two characters so Windows paths such as C:\foo are not mistaken for URLs.
const SCHEME = /^[a-z][a-z0-9+.-]+:/i;

// Anything outside RFC 3986 unreserved/reserved characters. "%" is kept so existing escapes survive.
const NOT_URI_CHAR = /[^A-Za-z0-9\-._~:\/?#[\]@!$&'()*+,;=%]/gu;

/**
 * Validates a deeplink entered by the user and percent-encodes the characters that are not
 * allowed in a URL (spaces, quotes, non-ASCII text, ...), so the OS URL handler accepts it.
 *
 * @param {unknown} input
 * @returns {{ ok: true, url: string } | { ok: false, reason: 'empty' | 'no-scheme' | 'malformed' }}
 */
export function normalizeDeeplink(input) {
  const value = typeof input === 'string' ? input.trim() : '';
  if (!value) return { ok: false, reason: 'empty' };
  if (!SCHEME.test(value)) return { ok: false, reason: 'no-scheme' };
  try {
    return { ok: true, url: value.replace(NOT_URI_CHAR, (char) => encodeURIComponent(char)) };
  } catch {
    // encodeURIComponent throws on lone surrogates
    return { ok: false, reason: 'malformed' };
  }
}

/**
 * Returns the command that hands a URL to the operating system's default handler.
 * The URL is passed as a single argument and no shell is involved, so it is never
 * interpreted as a command line.
 *
 * @param {string} url
 * @param {NodeJS.Platform} [platform]
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ command: string, args: string[] }}
 */
export function buildOpenCommand(url, platform = process.platform, env = process.env) {
  if (platform === 'darwin') {
    return { command: '/usr/bin/open', args: [url] };
  }
  if (platform === 'win32') {
    const systemRoot = env.SystemRoot || env.SYSTEMROOT || 'C:\\Windows';
    return {
      command: path.win32.join(systemRoot, 'System32', 'rundll32.exe'),
      args: ['url.dll,FileProtocolHandler', url],
    };
  }
  return { command: 'xdg-open', args: [url] };
}

export class OpenDeeplinkError extends Error {
  /**
   * @param {string} message
   * @param {{ reason: 'no-handler' | 'open-failed', cause?: unknown }} options
   */
  constructor(message, { reason, cause }) {
    super(message, { cause });
    this.name = 'OpenDeeplinkError';
    this.reason = reason;
  }
}

/**
 * Opens a (normalized) deeplink with the OS default handler.
 * Resolves once the opener exits successfully, rejects with an {@link OpenDeeplinkError} otherwise.
 *
 * @param {string} url
 * @param {{ platform?: NodeJS.Platform, spawnFn?: typeof spawn }} [options]
 * @returns {Promise<void>}
 */
export function openDeeplink(url, { platform = process.platform, spawnFn = spawn } = {}) {
  const { command, args } = buildOpenCommand(url, platform);
  return new Promise((resolve, reject) => {
    let stderr = '';
    let child;
    try {
      child = spawnFn(command, args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    } catch (error) {
      reject(new OpenDeeplinkError(error.message, { reason: 'open-failed', cause: error }));
      return;
    }
    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk) => {
      stderr += chunk;
    });
    child.once('error', (error) => {
      reject(new OpenDeeplinkError(error.message, { reason: 'open-failed', cause: error }));
    });
    child.once('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      const message = stderr.trim() || `${path.basename(command)} exited with code ${code}`;
      // macOS `open` reports kLSApplicationNotFoundErr (-10814) when no app handles the scheme
      const reason = /-10814\b/.test(stderr) ? 'no-handler' : 'open-failed';
      reject(new OpenDeeplinkError(message, { reason }));
    });
  });
}
