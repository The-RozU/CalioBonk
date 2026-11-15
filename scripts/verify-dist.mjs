import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const assetUrls = [...html.matchAll(/(?:src|href)="(\/CalioBonk\/assets\/[^"]+)"/g)]
  .map(match => match[1]);

assert(!html.includes('/src/main.ts'), 'GitHub Pages cannot serve the uncompiled TypeScript entrypoint');
assert(assetUrls.some(url => url.endsWith('.js')), 'Production HTML is missing compiled JavaScript');
assert(assetUrls.some(url => url.endsWith('.css')), 'Production HTML is missing compiled CSS');
for (const url of assetUrls) {
  const localPath = join(dist, url.slice('/CalioBonk/'.length));
  assert(existsSync(localPath), `Built asset is missing: ${url}`);
}
console.log(`OK: production HTML links to ${assetUrls.length} built assets under /CalioBonk/`);
