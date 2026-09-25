// Zero-dependency browser smoke test through Chrome DevTools Protocol.
// Usage: npm run test:browser -- [url]
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const targetUrl = process.argv[2] || 'http://127.0.0.1:5173/';
const port = 9333;
const candidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium'
].filter(Boolean);
const chrome = candidates.find(existsSync);
if (!chrome) {
  console.log('Skip browser smoke: Chrome / Edge not found. Set CHROME_PATH to enable it.');
  process.exit(0);
}

const profile = mkdtempSync(join(tmpdir(), 'crystallab-smoke-'));
const child = spawn(chrome, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--no-proxy-server',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--window-size=1440,900', targetUrl
], { stdio: 'ignore' });
const cleanup = () => {
  try { child.kill(); } catch {}
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
};
process.on('exit', cleanup);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function debuggerUrl() {
  for (let i = 0; i < 80; i++) {
    try {
      const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = pages.find(item => item.type === 'page' && item.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error('Chrome debugging endpoint did not start');
}

const socket = new WebSocket(await debuggerUrl());
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let seq = 0;
const pending = new Map();
socket.onmessage = event => {
  const message = JSON.parse(event.data);
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  message.error ? request.reject(new Error(JSON.stringify(message.error))) : request.resolve(message.result);
};
function send(method, params = {}) {
  const id = ++seq;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

await send('Runtime.enable');
await send('Page.enable');
let mounted = false;
for (let i = 0; i < 60; i++) {
  mounted = await evaluate(`Boolean(document.querySelector('#stageViewport canvas') && document.querySelector('#theoryContent')?.innerHTML)`);
  if (mounted) break;
  await sleep(250);
}
if (!mounted) throw new Error(`CrystalLab did not mount: ${await evaluate('location.href')}`);

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok: Boolean(ok), detail });
check('application mounted', mounted);

const inspector = await evaluate(`(function(){
  const headings=[...document.querySelectorAll('.inspector-section>h2')].map(x=>x.textContent.trim());
  return {headings,ok:headings.join(',')==='对象,几何,对称'};
})()`);
check('research inspector structure', inspector.ok, JSON.stringify(inspector));

const mode = await evaluate(`(function(){
  const buttons=[...document.querySelectorAll('.mode-tab')];
  const before=document.querySelector('.mode-tab.active')?.dataset.mode;
  buttons.find(x=>x.dataset.mode==='bravais')?.click();
  const after=document.querySelector('.mode-tab.active')?.dataset.mode;
  buttons.find(x=>x.dataset.mode==='structure')?.click();
  return {ok:buttons.length===2&&before==='structure'&&after==='bravais'};
})()`);
check('object mode switching', mode.ok, JSON.stringify(mode));
await sleep(150);

const spaces = await evaluate(`(function(){
  const canvas=document.querySelector('#stageViewport canvas');
  const snap=()=>({d:canvas.dataset.directRoot,r:canvas.dataset.reciprocalRoot,s:Number(canvas.dataset.reciprocalScale||0)});
  document.querySelector('[data-space-view="direct"]').click(); const direct=snap();
  document.querySelector('[data-space-view="reciprocal"]').click(); const reciprocal=snap();
  document.querySelector('[data-space-view="overlay"]').click(); const overlay=snap();
  document.querySelector('[data-space-view="direct"]').click();
  return {direct,reciprocal,overlay,ok:direct.d==='true'&&direct.r==='false'&&reciprocal.d==='false'&&reciprocal.r==='true'&&Math.abs(reciprocal.s-1)<1e-6&&overlay.d==='true'&&overlay.r==='true'&&overlay.s>0&&Math.abs(overlay.s-1)>1e-4};
})()`);
check('direct / reciprocal isolation and overlay', spaces.ok, JSON.stringify(spaces));

// 只断言 dataset 曾经漏掉一整类回归：对象齐全、取景正确，但整屏被雾抹平成背景色。
// 所以这里直接读回帧缓冲，要求画面上真的有足够多的亮像素。
async function setView(viewName) {
  await evaluate(`document.querySelector('[data-space-view="${viewName}"]').click()`);
  await sleep(400);
}
// 只读像素、不切视图：切换视图会重新取景，会把缩放状态冲掉。
const litPixels = () => evaluate(`(async function(){
  const canvas=document.querySelector('#stageViewport canvas');
  return await new Promise(resolve=>{
    requestAnimationFrame(()=>{
      const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');
      if(!gl){resolve({ok:false,lit:0,total:0,reason:'no webgl context'});return;}
      const w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
      const px=new Uint8Array(w*h*4);
      gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,px);
      let lit=0,total=0;
      for(let i=0;i<px.length;i+=4){
        if(px[i+3]<8)continue;
        total++;
        if((0.2126*px[i]+0.7152*px[i+1]+0.0722*px[i+2])/255>0.12)lit++;
      }
      resolve({ok:lit>400,lit,total,w,h});
    });
  });
})()`);

// 粗粒度占位指纹：预设视角改的是相机**朝向**，亮像素总数可能几乎不变，只有分布会变。
// 所以取 24×32 的格子数，而不是总亮度。
const frameSignature = () => evaluate(`(async function(){
  const canvas=document.querySelector('#stageViewport canvas');
  return await new Promise(resolve=>{
    requestAnimationFrame(()=>{
      const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');
      const w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
      const px=new Uint8Array(w*h*4);
      gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,px);
      let sig=0,grid='';
      for(let y=0;y<24;y++)for(let x=0;x<32;x++){
        const i=(Math.floor(y*h/24)*w+Math.floor(x*w/32))*4;
        const lit=px[i+3]>8&&(0.2126*px[i]+0.7152*px[i+1]+0.0722*px[i+2])>30;
        if(lit)sig++;
        grid+=lit?'1':'0';
      }
      resolve({sig,grid});
    });
  });
})()`);

await setView('direct');
const directPixels = await litPixels();
check('direct view actually renders geometry', directPixels.ok, JSON.stringify(directPixels));
await setView('reciprocal');
const reciprocalPixels = await litPixels();
check('reciprocal view actually renders geometry', reciprocalPixels.ok, JSON.stringify(reciprocalPixels));

// 放大时近裁剪面必须跟着相机走。只在取景时算一次的话，晶胞和中心原子会被整块裁掉，
// 画面上只剩外围格点——亮像素数会断崖式下跌（实测从 ~25000 掉到 ~14000）。
await setView('direct');
const beforeZoom = await litPixels();
for (let i = 0; i < 16; i++) {
  await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 700, y: 440, deltaX: 0, deltaY: -120 });
  await sleep(60);
}
await sleep(600);
const zoomed = await litPixels();
check('zooming in keeps the cell on screen', zoomed.lit > beforeZoom.lit * 0.9,
  JSON.stringify({ before: beforeZoom.lit, after: zoomed.lit }));

const layer = await evaluate(`(function(){
  const button=document.querySelector('.layer-button[data-layer="reference"]');
  const before=button.classList.contains('active'); button.click(); const after=button.classList.contains('active'); button.click();
  return {ok:before!==after,before,after};
})()`);
check('central layer action works', layer.ok, JSON.stringify(layer));

const symmetry = await evaluate(`(function(){
  const toggle=document.getElementById('symmetryLayerToggle');
  if(!toggle.checked) toggle.click();
  const canvas=document.querySelector('#stageViewport canvas');
  const first=canvas.dataset.symmetryAction;
  document.getElementById('symmetryApplyBtn').click();
  const replay=canvas.dataset.symmetryAction;
  return {ok:toggle.checked&&Boolean(first)&&Boolean(replay)&&Boolean(document.getElementById('groupOrderReadout').textContent.trim()),first,replay};
})()`);
check('one-shot symmetry action', symmetry.ok, JSON.stringify(symmetry));

const theory = await evaluate(`(function(){
  document.getElementById('theoryToggleBtn').click();
  const shell=document.getElementById('appShell');
  const inline=[...document.querySelectorAll('#theoryContent mjx-container:not([display="true"])')];
  const overflow=inline.some(x=>getComputedStyle(x).whiteSpace!=='nowrap');
  return {ok:!shell.classList.contains('theory-closed')&&!overflow,inline:inline.length};
})()`);
check('theory drawer and inline math', theory.ok, JSON.stringify(theory));

const catalog = await evaluate(`(function(){
  document.getElementById('catalogToggleBtn').click();
  return {ok:document.getElementById('appShell').classList.contains('catalog-mode')&&!document.getElementById('catalogArea').classList.contains('hidden')};
})()`);
check('catalog opens as separate workspace', catalog.ok, JSON.stringify(catalog));

const catalogSearch = await evaluate(`(function(){
  const search=document.getElementById('catalogSearch');
  search.value='227';search.dispatchEvent(new Event('input',{bubbles:true}));
  const row=document.querySelector('#catalogList .catalog-row.active');
  const detail=document.getElementById('catalogDetail');
  const matched=row?.dataset.id==='227'&&detail.querySelector('.catalog-number')?.textContent==='#227';
  search.value='unmatched-query';search.dispatchEvent(new Event('input',{bubbles:true}));
  const empty=!document.querySelector('#catalogList .catalog-row')&&detail.textContent.includes('没有匹配条目');
  search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));
  return {ok:matched&&empty,matched,empty};
})()`);
check('catalog search keeps the detail in sync and explains empty results', catalogSearch.ok, JSON.stringify(catalogSearch));

// ── 委派覆盖 ──────────────────────────────────────────────────────────────────
// 控件现在只在 HTML/模板串里声明 data-action，由 bindWorkbench 一处查表分发。打错一个字母
// **不会报错**，只会静默 no-op——所以这些检查一律断言「点下去真的有副作用」，而不是「元素存在」。
// 覆盖的是改造前那 12 项没点到的控件：正是最容易在查表里写错的那批。

// catalog 是最该测的地方：行按钮每次 renderList() 重建，「在 3D 中查看」每次 renderDetail()
// 重建——逐元素绑定必须跟着重绑，委派则挂一次管到底。切一次页签再点，就是在验证这一点。
const catalogFlow = await evaluate(`(function(){
  const rows=()=>[...document.querySelectorAll('#catalogList .catalog-row')];
  const first=rows()[0]; if(!first) return {ok:false,reason:'no rows'};
  const idA=first.dataset.id; first.click();
  const activeA=document.querySelector('#catalogList .catalog-row.active')?.dataset.id;
  document.querySelector('[data-catalog-kind="bravais"]').click();   // 列表重建
  const rowsB=rows(); if(rowsB.length<2) return {ok:false,reason:'no rows after kind switch'};
  const idB=rowsB[1].dataset.id; rowsB[1].click();
  const activeB=document.querySelector('#catalogList .catalog-row.active')?.dataset.id;
  const jump=document.querySelector('#catalogDetail [data-action="openIn3D"]');
  if(!jump) return {ok:false,reason:'no openIn3D button'};
  jump.click();   // 详情页重建出来的按钮
  const hidden=document.getElementById('catalogArea').classList.contains('hidden');
  return {ok:activeA===idA&&activeB===idB&&hidden,idA,activeA,idB,activeB,hidden};
})()`);
check('catalog rows and jump work after re-render', catalogFlow.ok, JSON.stringify(catalogFlow));

const toolbar = await evaluate(`(function(){
  const repeat=document.getElementById('repeatToggleBtn');
  const before=repeat.getAttribute('aria-pressed');
  repeat.click();
  const after=repeat.getAttribute('aria-pressed');
  repeat.click();
  const rotate=document.getElementById('autoRotateBtn');
  const ra=rotate.classList.contains('active');
  rotate.click(); const rb=rotate.classList.contains('active');
  rotate.click();   // 复原：留着会一直转，后面的像素断言会飘
  return {ok:before!==after&&ra!==rb, before, after, ra, rb};
})()`);
check('repeat range and auto-rotate toggles', toolbar.ok, JSON.stringify(toolbar));

const miller = await evaluate(`(function(){
  const h=document.getElementById('hInput'),k=document.getElementById('kInput'),l=document.getElementById('lInput');
  document.querySelector('[data-hkl="1,1,0"]').click();
  const preset=[h.value,k.value,l.value].join(',');
  h.value='2'; h.dispatchEvent(new Event('change',{bubbles:true}));   // 走 change 表
  const readback=document.getElementById('millerReadout')?.textContent??'';
  const family=document.querySelector('.layer-button[data-layer="family"]');
  const before=family.classList.contains('active');
  family.click();
  const after=family.classList.contains('active');
  family.click();   // 复原
  return {ok:preset==='1,1,0'&&before!==after,preset,before,after,readback};
})()`);
check('miller preset, index inputs and family toggle', miller.ok, JSON.stringify(miller));

await setView('direct');
const viewIso = await evaluate(`(function(){
  document.getElementById('viewMenu').open=true;
  document.querySelector('[data-view="iso"]').click();
  return document.getElementById('viewMenu').open;   // 处理器末尾会收起菜单
})()`);
await sleep(500);
const sigIso = await frameSignature();
const view001 = await evaluate(`(function(){
  document.getElementById('viewMenu').open=true;
  document.querySelector('[data-view="001"]').click();
  return document.getElementById('viewMenu').open;
})()`);
await sleep(500);
const sig001 = await frameSignature();
check('standard view presets move the camera', viewIso === false && view001 === false && sigIso.grid !== sig001.grid,
  JSON.stringify({ menuClosed: [viewIso, view001], iso: sigIso.sig, uv001: sig001.sig }));

const selects = await evaluate(`(function(){
  const pick=(id,v)=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('change',{bubbles:true}));return e.value;};
  const other=e=>[...e.options].map(o=>o.value).find(v=>v!==e.value);
  const s=document.getElementById('structureSelect');
  const picked=pick('structureSelect',other(s));
  const identity=document.getElementById('objectIdentity').textContent.trim();
  document.querySelector('.mode-tab[data-mode="bravais"]').click();
  const b=document.getElementById('bravaisSelect');
  const pickedB=pick('bravaisSelect',other(b));
  const sym=document.getElementById('symmetrySelect');
  const pickedS=pick('symmetrySelect',other(sym));
  document.querySelector('.mode-tab[data-mode="structure"]').click();
  return {ok:picked===s.value||picked===other(s),picked,pickedB,pickedS,identity,
    okB:b.value===pickedB,okS:sym.value===pickedS};
})()`);
check('three selects dispatch through the change table',
  selects.okB && selects.okS && Boolean(selects.identity), JSON.stringify(selects));

const pathCoverage = await evaluate(`(function(){
  document.querySelector('.mode-tab[data-mode="bravais"]').click();
  const select=document.getElementById('bravaisSelect'),toggle=document.getElementById('kPathLayerToggle');
  select.value='monoclinic-P';select.dispatchEvent(new Event('change',{bubbles:true}));
  const unsupported=toggle.disabled&&!toggle.checked&&document.getElementById('kpathNote').textContent.includes('暂无');
  select.value='hexagonal-P';select.dispatchEvent(new Event('change',{bubbles:true}));
  const supported=!toggle.disabled;
  toggle.click();
  const guide=document.getElementById('kpathGuide');
  const branchBreak=!guide.classList.contains('hidden')&&guide.textContent.includes('Γ → M → K')
    &&guide.querySelectorAll('em').length===2;
  toggle.click();
  document.querySelector('.mode-tab[data-mode="structure"]').click();
  return {ok:unsupported&&supported&&branchBreak,unsupported,supported,branchBreak};
})()`);
check('unsupported paths are disabled; supported paths show branch breaks', pathCoverage.ok, JSON.stringify(pathCoverage));

const pathTable = await evaluate(`(function(){
  document.querySelector('.mode-tab[data-mode="bravais"]').click();
  const select=document.getElementById('bravaisSelect');
  select.value='hexagonal-P';select.dispatchEvent(new Event('change',{bubbles:true}));
  document.getElementById('kPathLayerToggle').click();
  document.querySelector('.theory-tab[data-theory-tab="derivation"]').click();
  const section=[...document.querySelectorAll('#theoryContent section')].find(x=>x.querySelector('h3')?.textContent.includes('hP2'));
  const rows=section?.querySelectorAll('tbody tr').length;
  const breaks=section?.querySelectorAll('.path-break').length;
  const guide=document.getElementById('kpathGuide');
  const readable=!guide.classList.contains('hidden')&&guide.textContent.includes('Γ → M → K');
  document.getElementById('kPathLayerToggle').click();
  document.querySelector('.mode-tab[data-mode="structure"]').click();
  return {ok:rows===6&&breaks===2&&readable,rows,breaks,readable};
})()`);
check('k-path table lists only used points and marks discontinuities', pathTable.ok, JSON.stringify(pathTable));

const atomicCell = await evaluate(`(function(){
  document.querySelector('[data-space-view="direct"]').click();
  const structure=document.getElementById('structureSelect');
  structure.value='nacl';structure.dispatchEvent(new Event('change',{bubbles:true}));
  const ws=document.querySelector('.layer-button[data-layer="ws"]');
  if(!ws.classList.contains('active')) ws.click();
  const structural=ws.textContent.includes('原子胞')&&document.getElementById('stageReadout').textContent.includes('原子 Voronoi')
    &&document.getElementById('stageReadout').textContent.includes('Cl ·');
  document.querySelector('.mode-tab[data-mode="bravais"]').click();
  const lattice=ws.textContent.includes('W–S');
  document.querySelector('.mode-tab[data-mode="structure"]').click();
  return {ok:structural&&lattice,structural,lattice};
})()`);
check('atomic Voronoi and lattice Wigner–Seitz are labelled separately', atomicCell.ok, JSON.stringify(atomicCell));

const theoryTabs = await evaluate(`(function(){
  const content=()=>document.getElementById('theoryContent').innerHTML;
  const overview=document.querySelector('.theory-tab[data-theory-tab="overview"]');
  const derivation=document.querySelector('.theory-tab[data-theory-tab="derivation"]');
  overview.click(); const a=content(); const okA=overview.classList.contains('active');
  derivation.click(); const b=content(); const okB=derivation.classList.contains('active');
  return {ok:okA&&okB&&a!==b&&!overview.classList.contains('active'),okA,okB};
})()`);
check('theory tabs switch the drawer content', theoryTabs.ok, JSON.stringify(theoryTabs));

// 跳转按钮同样是重绘出来的：先切页签让 innerHTML 整个重建，再点。
// 取一个在**倒空间**的层——它的效果最可观测：既要开层，也要把空间切过去，两件事一起断言。
// 注意 lattice / reciprocal 是指向共用「格架」按钮的别名层，自身没有按钮，所以不能按第一个取。
const theoryJump = await evaluate(`(function(){
  document.querySelector('[data-space-view="direct"]').click();
  document.querySelector('.theory-tab[data-theory-tab="overview"]').click();
  const ids=[...document.querySelectorAll('#theoryContent [data-action="jumpLayer"]')].map(b=>b.dataset.jumpLayer);
  const target=['recipPrim','bz','recipConv'].find(id=>ids.includes(id));
  if(!target) return {ok:false,reason:'no reciprocal jump button',ids};
  document.querySelector('[data-action="jumpLayer"][data-jump-layer="'+target+'"]').click();
  const layer=document.querySelector('.layer-button[data-layer="'+target+'"]');   // 点完再取：重绘可能换掉节点
  const space=document.documentElement.dataset.spaceView;
  return {ok:space==='reciprocal'&&Boolean(layer&&layer.classList.contains('active')),target,ids,space,
    active:Boolean(layer&&layer.classList.contains('active'))};
})()`);
check('theory jump buttons fire after re-render', theoryJump.ok, JSON.stringify(theoryJump));

// 声明链接得真的可达，而不是只写在那里。它放在抽屉的重绘区外面，所以切过页签后仍在。
const notices = await evaluate(`(async function(){
  const link=document.querySelector('.theory-footer a');
  if(!link) return {ok:false,reason:'no footer link'};
  const href=link.getAttribute('href');
  const res=await fetch(href);
  const body=await res.text();
  return {ok:res.ok&&body.includes('SeeK-path'),href,status:res.status};
})()`);
check('the drawer notices link resolves', notices.ok, JSON.stringify(notices));

// 抽屉改成了弹性列（内容区自适应 + 页脚贴底），取代原先写死的 calc(100% - 78px)。
// 这条确认内容区没被压扁、页脚也没被挤出面板——布局改动最容易在这里静默塌掉。
const drawer = await evaluate(`(function(){
  const content=document.getElementById('theoryContent');
  const footer=document.querySelector('.theory-footer');
  const panel=document.getElementById('theoryPanel');
  const c=content.getBoundingClientRect(),f=footer.getBoundingClientRect(),p=panel.getBoundingClientRect();
  return {ok:c.height>300&&f.height>0&&f.bottom<=p.bottom+1&&f.top>=c.bottom-1,
    contentH:Math.round(c.height),footerBottom:Math.round(f.bottom),panelBottom:Math.round(p.bottom)};
})()`);
check('theory drawer keeps its scroll area and a pinned footer', drawer.ok, JSON.stringify(drawer));

const closeTheory = await evaluate(`(function(){
  document.getElementById('closeTheoryBtn').click();
  return {ok:document.getElementById('appShell').classList.contains('theory-closed')};
})()`);
check('theory drawer closes', closeTheory.ok, JSON.stringify(closeTheory));

await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 780, deviceScaleFactor: 1, mobile: true });
const mobileCatalog = await evaluate(`(function(){
  document.getElementById('catalogToggleBtn').click();
  const toolbar=document.querySelector('.catalog-toolbar').getBoundingClientRect();
  const scope=document.querySelector('.catalog-scope').getBoundingClientRect();
  const list=document.getElementById('catalogList').getBoundingClientRect();
  const search=document.getElementById('catalogSearch').getBoundingClientRect();
  return {ok:toolbar.bottom<=scope.top+1&&scope.bottom<=list.top+1&&search.bottom<=toolbar.bottom+1,
    toolbarBottom:toolbar.bottom,scopeTop:scope.top,scopeBottom:scope.bottom,listTop:list.top};
})()`);
check('mobile catalog toolbar and scope note do not overlap', mobileCatalog.ok, JSON.stringify(mobileCatalog));
await send('Emulation.clearDeviceMetricsOverride');

const overflow = await evaluate(`({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,ok:document.documentElement.scrollWidth<=document.documentElement.clientWidth+1})`);
check('no horizontal page overflow', overflow.ok, JSON.stringify(overflow));

let failed = 0;
for (const item of results) {
  console.log(`${item.ok ? '✓' : '✗'} ${item.name}${item.detail ? ` · ${item.detail}` : ''}`);
  if (!item.ok) failed++;
}
socket.close();
cleanup();
if (failed) process.exit(1);
console.log(`\n${results.length} browser smoke checks passed.`);
