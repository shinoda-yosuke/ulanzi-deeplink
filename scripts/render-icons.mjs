// Renders the SVG sources in design/ to the PNG icons referenced by manifest.json.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { PLUGIN_DIR, ROOT } from './lib/paths.mjs';

const ICONS = [
  // [source, output, size in px]
  ['icon.svg', 'plugin.png', 256],
  ['icon.svg', 'category.png', 96],
  ['icon.svg', 'action.png', 96],
  ['key.svg', 'key.png', 196],
];

for (const [source, output, size] of ICONS) {
  const svg = readFileSync(path.join(ROOT, 'design', source));
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  const file = path.join(PLUGIN_DIR, 'assets', 'icons', output);
  writeFileSync(file, png);
  console.log(`${path.relative(ROOT, file)} (${size}x${size})`);
}
