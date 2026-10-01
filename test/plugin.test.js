import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { beforeEach, describe, it } from 'node:test';
import { OpenDeeplinkError } from '../src/deeplink.js';
import { ACTION_UUID, MESSAGES, registerDeeplinkAction } from '../src/plugin.js';

/** Records what the plugin sends; events are delivered with emit() like the SDK does. */
class FakeApi extends EventEmitter {
  sent = [];

  onAdd(fn) { this.on('add', fn); }
  onParamFromApp(fn) { this.on('paramfromapp', fn); }
  onParamFromPlugin(fn) { this.on('paramfromplugin', fn); }
  onClear(fn) { this.on('clear', fn); }
  onRun(fn) { this.on('run', fn); }
  onSendToPlugin(fn) { this.on('sendToPlugin', fn); }

  t(key) { return `t:${key}`; }
  showAlert(context) { this.sent.push(['showAlert', context]); }
  toast(msg) { this.sent.push(['toast', msg]); }
  logMessage(msg, level) { this.sent.push(['logMessage', level]); }
  sendToPropertyInspector(payload, context) { this.sent.push(['sendToPropertyInspector', payload, context]); }
}

const context = (key) => `${ACTION_UUID}___${key}___action-${key}`;
const settle = () => new Promise((resolve) => setImmediate(resolve));

describe('registerDeeplinkAction', () => {
  let api;
  let opened;
  let openResult;

  beforeEach(() => {
    api = new FakeApi();
    opened = [];
    openResult = () => Promise.resolve();
    registerDeeplinkAction({
      api,
      open: (url) => {
        opened.push(url);
        return openResult(url);
      },
    });
  });

  async function emit(event, message) {
    api.emit(event, message);
    await settle();
  }

  it('opens the saved URL when the key runs', async () => {
    await emit('add', { context: context('0_0'), param: { url: 'obsidian://open?vault=My Vault' } });
    await emit('run', { context: context('0_0'), param: null });
    assert.deepEqual(opened, ['obsidian://open?vault=My%20Vault']);
    assert.deepEqual(api.sent, []);
  });

  it('uses the settings carried by run', async () => {
    await emit('run', { context: context('0_0'), param: { url: 'slack://open' } });
    assert.deepEqual(opened, ['slack://open']);
  });

  it('follows settings changed in the property inspector', async () => {
    await emit('add', { context: context('0_0'), param: { url: 'slack://open' } });
    await emit('paramfromplugin', { context: context('0_0'), param: { url: 'zoommtg://zoom.us/start' } });
    await emit('run', { context: context('0_0') });
    await emit('paramfromapp', { context: context('0_0'), param: { url: 'notion://www.notion.so' } });
    await emit('run', { context: context('0_0') });
    assert.deepEqual(opened, ['zoommtg://zoom.us/start', 'notion://www.notion.so']);
  });

  it('keeps keys independent', async () => {
    await emit('add', { context: context('0_0'), param: { url: 'slack://open' } });
    await emit('add', { context: context('1_0'), param: { url: 'discord://-/' } });
    await emit('run', { context: context('1_0') });
    await emit('run', { context: context('0_0') });
    assert.deepEqual(opened, ['discord://-/', 'slack://open']);
  });

  it('alerts when no URL is set', async () => {
    await emit('add', { context: context('0_0'), param: null });
    await emit('run', { context: context('0_0') });
    assert.deepEqual(opened, []);
    assert.deepEqual(api.sent, [
      ['showAlert', context('0_0')],
      ['toast', `t:${MESSAGES.empty}`],
    ]);
  });

  it('alerts when the URL has no scheme', async () => {
    await emit('run', { context: context('0_0'), param: { url: 'example.com' } });
    assert.deepEqual(opened, []);
    assert.deepEqual(api.sent, [
      ['showAlert', context('0_0')],
      ['toast', `t:${MESSAGES['no-scheme']}`],
    ]);
  });

  it('alerts and logs when opening fails', async () => {
    openResult = () => Promise.reject(new OpenDeeplinkError('LSOpenURLsWithRole() failed', { reason: 'no-handler' }));
    await emit('run', { context: context('0_0'), param: { url: 'nope://x' } });
    openResult = () => Promise.reject(new Error('unexpected'));
    await emit('run', { context: context('0_0'), param: { url: 'nope://y' } });
    assert.deepEqual(api.sent, [
      ['logMessage', 'error'],
      ['showAlert', context('0_0')],
      ['toast', `t:${MESSAGES['no-handler']}`],
      ['logMessage', 'error'],
      ['showAlert', context('0_0')],
      ['toast', `t:${MESSAGES['open-failed']}`],
    ]);
  });

  it('forgets cleared keys', async () => {
    await emit('add', { context: context('0_0'), param: { url: 'slack://open' } });
    await emit('clear', { param: [{ context: context('0_0') }] });
    await emit('run', { context: context('0_0') });
    assert.deepEqual(opened, []);
    assert.deepEqual(api.sent.at(-1), ['toast', `t:${MESSAGES.empty}`]);
  });

  it('opens the URL from the "Test" button and reports back', async () => {
    await emit('sendToPlugin', { context: context('0_0'), payload: { type: 'test', url: ' slack://open ' } });
    await emit('sendToPlugin', { context: context('0_0'), payload: { type: 'test', url: 'example.com' } });
    assert.deepEqual(opened, ['slack://open']);
    assert.deepEqual(api.sent, [
      ['sendToPropertyInspector', { type: 'testResult', ok: true, message: '' }, context('0_0')],
      ['sendToPropertyInspector', { type: 'testResult', ok: false, message: `t:${MESSAGES['no-scheme']}` }, context('0_0')],
    ]);
  });

  it('ignores other messages from the property inspector', async () => {
    await emit('sendToPlugin', { context: context('0_0'), payload: { type: 'something-else', url: 'slack://open' } });
    await emit('sendToPlugin', { context: context('0_0') });
    assert.deepEqual(opened, []);
    assert.deepEqual(api.sent, []);
  });
});
