import { cpSync, mkdirSync, rmSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = join(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
copyFileSync(join(root, 'index.html'), join(dist, 'index.html'));
cpSync(join(root, 'src'), join(dist, 'src'), { recursive: true });
cpSync(join(root, 'public'), dist, { recursive: true });
// 声明必须随产物走：docs/THIRD-PARTY-NOTICES.md 自己写着「SeeK-path 的 MIT 声明必须随分发
// 保留，因此本文件是发布产物的一部分」，而 kpaths.js 的 HPKOT 数据正整理自 SeeK-path。
// GitHub Pages 站点就是分发物，所以这两份要进 dist/，不能只躺在仓库根目录。
copyFileSync(join(root, 'LICENSE'), join(dist, 'LICENSE'));
// 声明在仓库里位于 docs/，所以它指向 LICENSE 用 ../LICENSE；进了 dist 两者同在根目录，
// 那个 ../ 会指到站点外面去（404）。文案一字不改，只把这一条相对链接就地改平。
const notices = readFileSync(join(root, 'docs/THIRD-PARTY-NOTICES.md'), 'utf8')
  .replaceAll('](../LICENSE)', '](./LICENSE)');
writeFileSync(join(dist, 'THIRD-PARTY-NOTICES.md'), notices);
console.log('Built dist/ (deterministic static bundle; no external build tool).');
