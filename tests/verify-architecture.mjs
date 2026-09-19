import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const sourceRoot = path.join(root, 'src');
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|mjs)$/.test(entry.name)) files.push(full);
  }
}
walk(sourceRoot);

let failed = 0;
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);
  for (const specifier of imports) {
    if (!specifier.startsWith('.')) continue;
    const resolved = path.resolve(path.dirname(file), specifier);
    if (!fs.existsSync(resolved)) {
      console.error(`✗ missing import: ${path.relative(root, file)} -> ${specifier}`);
      failed++;
    }
  }
}

const expected = [
  'src/app/state.js', 'src/app/constants.js', 'src/core/model.js',
  'src/scene/viewport.js', 'src/scene/render-scene.js',
  'src/ui/dom.js', 'src/ui/mathjax.js', 'src/ui/theory.js', 'src/ui/workbench.js'
];
for (const item of expected) {
  if (!fs.existsSync(path.join(root, item))) {
    console.error(`✗ missing release module: ${item}`);
    failed++;
  }
}

const legacy = ['control-panel', 'viewport-card', 'value-card', 'layer-chip', 'module-card', 'compact-card'];
const runtimeText = files.map(file => fs.readFileSync(file, 'utf8')).join('\n') + fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const name of legacy) {
  if (runtimeText.includes(name)) {
    console.error(`✗ legacy interface token remains: ${name}`);
    failed++;
  }
}

if (failed) process.exit(1);
console.log(`✓ module graph resolved (${files.length} runtime JS modules)`);
console.log('✓ no legacy UI interface tokens remain');
