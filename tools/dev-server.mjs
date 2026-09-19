import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { basename, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
const arg = name => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const port = Number(arg('--port') ?? process.env.PORT ?? 5173);
const host = arg('--host') ?? process.env.HOST ?? '127.0.0.1';
const requestedRoot = arg('--root');
const root = requestedRoot ? resolve(projectRoot, requestedRoot) : projectRoot;
const publicRoot = requestedRoot ? null : join(projectRoot, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.md': 'text/markdown; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

// 发布物把 LICENSE 与第三方声明放在根目录（GitHub Pages 站点本身就是分发物，见 tools/build.mjs），
// 而仓库里声明位于 docs/ 下。这里按同样的布局补一条别名——否则那个链接只在发布后才可用，
// 本地一点就是 404，最容易被当成死链接删掉。
const PUBLISHED_AT_ROOT = {
  '/LICENSE': 'LICENSE',
  '/THIRD-PARTY-NOTICES.md': 'docs/THIRD-PARTY-NOTICES.md'
};
// LICENSE 没有扩展名，extname 取到空串，会掉进 application/octet-stream——浏览器不显示，
// 直接下载。声明是要给人读的，按文件名补上。
const NAME_MIME = { LICENSE: 'text/plain; charset=utf-8' };

function safePath(base, pathname) {
  const relative = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '');
  const full = resolve(base, relative);
  return full === base || full.startsWith(base + sep) ? full : null;
}

function candidate(pathname) {
  if (pathname === '/') return join(root, 'index.html');
  if (!requestedRoot && PUBLISHED_AT_ROOT[pathname]) {
    const published = join(projectRoot, PUBLISHED_AT_ROOT[pathname]);
    if (existsSync(published)) return published;
  }
  const primary = safePath(root, pathname);
  if (primary && existsSync(primary) && statSync(primary).isFile()) return primary;
  if (publicRoot) {
    const pub = safePath(publicRoot, pathname);
    if (pub && existsSync(pub) && statSync(pub).isFile()) return pub;
  }
  return null;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const file = candidate(url.pathname);
  if (!file) {
    res.writeHead(404, {'content-type':'text/plain; charset=utf-8'});
    res.end('Not found');
    return;
  }
  res.writeHead(200, {
    'content-type': MIME[extname(file).toLowerCase()] ?? NAME_MIME[basename(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store'
  });
  createReadStream(file).pipe(res);
});

server.listen(port, host, () => {
  console.log(`CrystalLab: http://${host}:${port}/`);
});
