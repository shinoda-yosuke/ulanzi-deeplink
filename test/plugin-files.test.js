// Consistency checks for the files that ship in the plugin folder.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { PLUGIN_DIR, ROOT } from '../scripts/lib/paths.mjs';
import { validatePlugin } from '../scripts/lib/validate-plugin.mjs';
import { ACTION_UUID, MESSAGES, PLUGIN_UUID } from '../src/plugin.js';

const read = (...segments) => readFileSync(path.join(PLUGIN_DIR, ...segments), 'utf8');
const english = JSON.parse(read('en.json')).Localization;

describe('plugin folder', () => {
  it('passes the manifest and localization checks', () => {
    assert.deepEqual(validatePlugin(PLUGIN_DIR).problems, []);
  });

  it('uses the UUIDs of the main service', () => {
    const manifest = JSON.parse(read('manifest.json'));
    assert.equal(manifest.UUID, PLUGIN_UUID);
    assert.deepEqual(manifest.Actions.map((action) => action.UUID), [ACTION_UUID]);
    assert.match(read('property-inspector', 'open', 'inspector.js'), new RegExp(`'${ACTION_UUID.replaceAll('.', '\\.')}'`));
  });

  it('keeps manifest.json and package.json versions in sync', () => {
    const { version } = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.equal(JSON.parse(read('manifest.json')).Version, version);
  });

  it('has an English text for every message of the main service', () => {
    for (const message of Object.values(MESSAGES)) assert.ok(message in english, message);
  });

  it('has an English text for every string the property inspector localizes', () => {
    const html = read('property-inspector', 'open', 'inspector.html');
    const script = read('property-inspector', 'open', 'inspector.js');
    const texts = [
      ...[...html.matchAll(/<\w+[^>]*\sdata-localize[^>]*>([^<]*)</g)].map((match) => match[1].trim()),
      ...[...html.matchAll(/placeholder="([^"]+)"[^>]*data-localize/g)].map((match) => match[1]),
      ...[...script.matchAll(/\$UD\.t\('([^']+)'\)/g)].map((match) => match[1]),
    ].filter(Boolean);
    assert.ok(texts.length >= 6, `found only ${texts.length} texts`);
    for (const text of texts) assert.ok(text in english, text);
  });
});
