// Runs the bundled main service (plugin/app.js) the way Ulanzi Studio does, against a fake host.
// Set PLUGIN_NODE to run it with another Node.js, e.g. the one bundled with Ulanzi Studio:
//   PLUGIN_NODE="/Applications/Ulanzi Studio.app/Contents/MacOS/NodeJS/node" npm test
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { PLUGIN_DIR } from '../scripts/lib/paths.mjs';
import { ACTION_UUID, PLUGIN_UUID } from '../src/plugin.js';
import { startFakeHost } from './fake-host.js';

const node = process.env.PLUGIN_NODE || process.execPath;
const japanese = JSON.parse(readFileSync(path.join(PLUGIN_DIR, 'ja_JP.json'), 'utf8')).Localization;
const key = { uuid: ACTION_UUID, key: '0_0', actionid: 'e2e' };
const target = ({ uuid, key, actionid }) => ({ uuid, key, actionid });

describe('plugin/app.js against a fake Ulanzi Studio', () => {
  let host;
  let plugin;
  let output = '';

  before(async () => {
    host = await startFakeHost();
    plugin = spawn(
      node,
      [path.join(PLUGIN_DIR, 'plugin', 'app.js'), '127.0.0.1', String(host.port), 'ja-JP', '3.3.9'],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    plugin.stdout.on('data', (chunk) => (output += chunk));
    plugin.stderr.on('data', (chunk) => (output += chunk));
  });

  after(async () => {
    if (plugin.exitCode === null) plugin.kill();
    await host.close();
  });

  it('connects as the main service', async () => {
    const message = await host.waitFor((m) => m.cmd === 'connected');
    assert.equal(message.uuid, PLUGIN_UUID);
  });

  it('acknowledges host events', async () => {
    const from = host.received.length;
    host.send({ cmd: 'add', ...key, param: { url: 'example.com' } });
    const ack = await host.waitFor((m) => m.cmd === 'add', { from });
    assert.equal(ack.code, 0);
    assert.deepEqual(target(ack), key);
  });

  it('alerts with a message in the host language when the URL is invalid', async () => {
    const from = host.received.length;
    host.send({ cmd: 'run', ...key, param: { url: 'example.com' } });
    const alert = await host.waitFor((m) => m.cmd === 'showAlert', { from });
    assert.deepEqual(target(alert), key);
    const toast = await host.waitFor((m) => m.cmd === 'toast', { from });
    assert.equal(toast.msg, japanese['The URL must start with a scheme such as myapp://']);
  });

  it('answers the "Test" button of the property inspector', async () => {
    const from = host.received.length;
    host.send({ cmd: 'sendToPlugin', ...key, payload: { type: 'test', url: '' } });
    const reply = await host.waitFor((m) => m.cmd === 'sendToPropertyInspector', { from });
    assert.deepEqual(target(reply), key);
    assert.deepEqual(reply.payload, {
      type: 'testResult',
      ok: false,
      message: japanese['Set a deeplink URL for this key first.'],
    });
  });

  it('reports a scheme that no app handles', { skip: process.platform !== 'darwin' && 'needs open(1)' }, async () => {
    const from = host.received.length;
    host.send({ cmd: 'run', ...key, param: { url: 'ulanzi-deeplink-e2e-unregistered://ping' } });
    const toast = await host.waitFor((m) => m.cmd === 'toast', { from });
    assert.equal(toast.msg, japanese['No app is registered to open this kind of link.']);
  });

  it('exits when the connection to Ulanzi Studio closes', async () => {
    const exited = once(plugin, 'exit');
    await host.close();
    const [code] = await exited;
    assert.equal(code, 0, output);
  });
});
