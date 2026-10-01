import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { describe, it } from 'node:test';
import { PassThrough } from 'node:stream';
import { buildOpenCommand, normalizeDeeplink, openDeeplink } from '../src/deeplink.js';

describe('normalizeDeeplink', () => {
  it('keeps valid URLs untouched', () => {
    for (const url of [
      'slack://open',
      'spotify:track:4uLU6hMCjMI75M1A2tKUQC',
      'zoommtg://zoom.us/join?confno=123&pwd=a%20b',
      "myapp://host/path?a=1&b=[2]#frag!$'()*+,;=@~",
      'https://example.com/search?q=deeplink',
    ]) {
      assert.deepEqual(normalizeDeeplink(url), { ok: true, url });
    }
  });

  it('trims surrounding whitespace', () => {
    assert.deepEqual(normalizeDeeplink('  slack://open\n'), { ok: true, url: 'slack://open' });
  });

  it('percent-encodes characters that are not allowed in URLs', () => {
    assert.equal(normalizeDeeplink('obsidian://open?vault=My Vault').url, 'obsidian://open?vault=My%20Vault');
    assert.equal(normalizeDeeplink('myapp://search?q=日本語').url, 'myapp://search?q=%E6%97%A5%E6%9C%AC%E8%AA%9E');
    assert.equal(normalizeDeeplink('myapp://x?e=😀').url, 'myapp://x?e=%F0%9F%98%80');
    assert.equal(normalizeDeeplink('myapp://x?d={"a":1}|<b>^`\\').url, 'myapp://x?d=%7B%22a%22:1%7D%7C%3Cb%3E%5E%60%5C');
  });

  it('rejects empty input', () => {
    for (const input of ['', '   ', undefined, null, 42]) {
      assert.deepEqual(normalizeDeeplink(input), { ok: false, reason: 'empty' });
    }
  });

  it('rejects input without a scheme', () => {
    for (const input of ['example.com', '/Applications/Slack.app', 'C:\\Users\\me\\file.txt', '://x', '1x://y']) {
      assert.deepEqual(normalizeDeeplink(input), { ok: false, reason: 'no-scheme' }, input);
    }
  });

  it('rejects text that cannot be encoded', () => {
    assert.deepEqual(normalizeDeeplink('myapp://x?\uD800'), { ok: false, reason: 'malformed' });
  });
});

describe('buildOpenCommand', () => {
  const url = 'myapp://x?a=1&b=2';

  it('uses open(1) on macOS', () => {
    assert.deepEqual(buildOpenCommand(url, 'darwin'), { command: '/usr/bin/open', args: [url] });
  });

  it('uses the URL protocol handler on Windows', () => {
    assert.deepEqual(buildOpenCommand(url, 'win32', { SystemRoot: 'D:\\Win' }), {
      command: 'D:\\Win\\System32\\rundll32.exe',
      args: ['url.dll,FileProtocolHandler', url],
    });
    assert.equal(buildOpenCommand(url, 'win32', {}).command, 'C:\\Windows\\System32\\rundll32.exe');
  });

  it('falls back to xdg-open elsewhere', () => {
    assert.deepEqual(buildOpenCommand(url, 'linux'), { command: 'xdg-open', args: [url] });
  });
});

describe('openDeeplink', () => {
  /** A spawn() stand-in whose child exits with `code` after writing `stderr`, or fails with `error`. */
  function fakeSpawn({ code = 0, stderr = '', error } = {}) {
    const calls = [];
    const spawnFn = (command, args, options) => {
      calls.push({ command, args, options });
      const child = new EventEmitter();
      child.stderr = new PassThrough();
      setImmediate(() => {
        if (error) {
          child.emit('error', error);
          return;
        }
        child.stderr.once('end', () => child.emit('close', code));
        child.stderr.end(stderr);
      });
      return child;
    };
    return { spawnFn, calls };
  }

  it('hands the URL to the opener as a single argument without a shell', async () => {
    const { spawnFn, calls } = fakeSpawn();
    await openDeeplink('myapp://x?a=1&b=2', { platform: 'darwin', spawnFn });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].command, '/usr/bin/open');
    assert.deepEqual(calls[0].args, ['myapp://x?a=1&b=2']);
    assert.equal(calls[0].options.shell, undefined);
  });

  it('reports a missing handler', async () => {
    const { spawnFn } = fakeSpawn({
      code: 1,
      stderr: 'LSOpenURLsWithRole() failed with error -10814 for the URL nope://x.\n',
    });
    await assert.rejects(openDeeplink('nope://x', { platform: 'darwin', spawnFn }), {
      name: 'OpenDeeplinkError',
      reason: 'no-handler',
      message: 'LSOpenURLsWithRole() failed with error -10814 for the URL nope://x.',
    });
  });

  it('reports other failures with the exit code', async () => {
    const { spawnFn } = fakeSpawn({ code: 2 });
    await assert.rejects(openDeeplink('myapp://x', { platform: 'darwin', spawnFn }), {
      reason: 'open-failed',
      message: 'open exited with code 2',
    });
  });

  it('reports an opener that cannot be started', async () => {
    const { spawnFn } = fakeSpawn({ error: Object.assign(new Error('spawn xdg-open ENOENT'), { code: 'ENOENT' }) });
    await assert.rejects(openDeeplink('myapp://x', { platform: 'linux', spawnFn }), {
      reason: 'open-failed',
      message: 'spawn xdg-open ENOENT',
    });
  });

  it('reports a spawn() that throws', async () => {
    const spawnFn = () => {
      throw new Error('boom');
    };
    await assert.rejects(openDeeplink('myapp://x', { platform: 'darwin', spawnFn }), {
      reason: 'open-failed',
      message: 'boom',
    });
  });
});
