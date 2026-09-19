import fs from 'node:fs';

// constants.js 无 import，可以直接加载：颜色与线宽得按数值断言，不能只做文本匹配。
const { COLORS, LINE_WEIGHTS } = await import('../src/app/constants.js');

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const html = read('index.html');
const css = read('src/styles/app.css');
const tokens = read('src/styles/tokens.css');
const main = read('src/main.js');
const state = read('src/app/state.js');
const scene = read('src/scene/render-scene.js');
const viewport = read('src/scene/viewport.js');
const theory = read('src/ui/theory.js');
const workbench = read('src/ui/workbench.js');
const catalog = read('src/ui/catalog.js');
const geometry = read('src/core/geometry.js');
const lattices = read('src/core/lattices.js');
const model = read('src/core/model.js');
const pkg = JSON.parse(read('package.json'));

const checks = [];
const check = (name, ok) => checks.push([name, Boolean(ok)]);
const uniq = items => new Set(items).size === items.length;
const hex = n => `#${n.toString(16).padStart(6, '0')}`;
const tokenValue = name => tokens.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
// 「看着像同色」是本次真正的缺陷，所以量 RGB 距离而不是「不相等」——两个值不同但看不出
// 差别时，只有距离能发现。设计系统定的色阶级距约 36，阈值取 30 略低于它。
const rgbDistance = (a, b) => Math.hypot((a >> 16 & 255) - (b >> 16 & 255), (a >> 8 & 255) - (b >> 8 & 255), (a & 255) - (b & 255));

// 取某个函数名所有调用点的顶层实参。正则数不清楚嵌套括号（`makeSegments(pairs.flatMap(([u,w])=>…))`
// 会被截断成 2 个参数而误报），所以按括号配对切。
function callArgs(source, name) {
  const calls = [];
  for (let i = source.indexOf(`${name}(`); i >= 0; i = source.indexOf(`${name}(`, i + 1)) {
    let depth = 0, j = i + name.length;
    for (; j < source.length; j++) {
      if (source[j] === '(') depth++;
      else if (source[j] === ')' && --depth === 0) break;
    }
    const inner = source.slice(i + name.length + 1, j);
    const parts = []; let d = 0, last = 0;
    for (let k = 0; k < inner.length; k++) {
      const c = inner[k];
      if ('([{'.includes(c)) d++;
      else if (')]}'.includes(c)) d--;
      else if (c === ',' && d === 0) { parts.push(inner.slice(last, k)); last = k + 1; }
    }
    parts.push(inner.slice(last));
    calls.push(parts);
  }
  return calls;
}

const sidebarHeadings = [...html.matchAll(/<section class="inspector-section">\s*<h2>([^<]+)<\/h2>/g)].map(m => m[1]);
const theoryTabs = [...html.matchAll(/data-theory-tab="([^"]+)"/g)].map(m => m[1]);
const spaceViews = [...html.matchAll(/<button[^>]+data-space-view="([^"]+)"/g)].map(m => m[1]);
const overviewSource = theory.slice(theory.indexOf('function overviewHTML('), theory.indexOf('export function createTheory('));
const derivationSource = theory.slice(theory.indexOf('function derivationHTML('), theory.indexOf('function overviewHTML('));
const sourceBundle = [main, state, scene, viewport, theory, workbench, catalog].join('\n');

check('release version', pkg.version === '1.0.0' && pkg.name === 'crystallab');
check('tabless research inspector', sidebarHeadings.join(',') === '对象,几何,对称' && !html.includes('data-panel-tab=') && !sourceBundle.includes('panelTab'));
check('sidebar headings unique', uniq(sidebarHeadings));
check('two theory tabs', theoryTabs.join(',') === 'overview,derivation');
check('three space views', uniq(spaceViews) && spaceViews.join(',') === 'direct,reciprocal,overlay');
check('binary repeat control', html.includes('id="repeatToggleBtn"') && html.includes('repeat-local-icon') && html.includes('repeat-global-icon') && !/[×*][123]/.test(html));
check('unified control primitives', html.includes('class="segmented mode-switch"') && html.includes('class="segmented space-switch') && html.includes('class="segmented theory-tabs"') && html.includes('class="icon-button visual-tool"'));
check('flat workstation layout', css.includes('.workspace { min-height: 0; display: grid;') && css.includes('.inspector { min-height: 0; border-right: 1px solid var(--line);') && !css.includes('backdrop-filter') && !css.includes('linear-gradient') && !css.includes('radial-gradient'));
check('no card soup legacy classes', !html.includes('module-card') && !html.includes('viewport-card') && !html.includes('value-card') && !html.includes('layer-bar') && !css.includes('.module-card') && !css.includes('.viewport-card'));
check('single centralized layer registry', state.includes('export const LAYERS') && !main.includes('LAYER_FLAGS') && !theory.includes('LAYER_FLAGS') && !workbench.includes('const LAYER_FLAGS'));
check('theory jump uses layer registry', main.includes('const definition = LAYERS[layer]') && main.includes('setLayer(layer, true)'));
check('main is orchestration only', main.split('\n').length < 240 && !main.includes('makePointCloud') && !main.includes('function overviewHTML') && !main.includes('new THREE.Scene'));
check('scene renderer isolated', scene.includes('export function renderScene') && scene.includes("direct-space-root") && scene.includes("reciprocal-space-root"));
check('viewport owns camera framing', viewport.includes('bounds()') && viewport.includes('fitDistance(') && viewport.includes('updateClipPlanes()') && viewport.includes('updateSymmetryAnimation'));
check('overlay reciprocal scale is lattice adaptive', scene.includes('reciprocalDisplayScale(state, lattice)') && !scene.includes('1/scale') && !scene.includes('invScale'));
check('overlay reciprocal geometry remains visible', scene.includes('depthTest: !overlay') && scene.includes('renderOrder: overlay ? 260 : 0') && scene.includes('material.depthTest = false'));
check('one-shot symmetry animation', scene.includes('startedAt: null, duration: 760, done: false') && !scene.includes('time%') && html.includes('id="symmetryApplyBtn"'));
check('aligned layer columns', /direct-layer-row[\s\S]*data-layer="primitive"[\s\S]*data-layer="ws"[\s\S]*data-layer="conventional"[\s\S]*data-layer="family"/.test(html) && /reciprocal-layer-row[\s\S]*data-layer="recipPrim"[\s\S]*data-layer="recipConv"[\s\S]*data-layer="bz"[\s\S]*data-layer="g"/.test(html));
check('shared grid layer removes duplicated axes/points', html.includes('data-layer="reference"') && !html.includes('data-layer="axes"') && !html.includes('data-layer="recipAxes"'));
check('space rows context switch', css.includes('html[data-space-view="reciprocal"] .direct-layer-row') && css.includes('html[data-space-view="overlay"] .reciprocal-layer-row'));
// 色点规则只能指向真实存在的图层按钮：这里曾经留着 data-layer="kpath"（图层栏里没有这个按钮，
// k 路径走的是 checkbox），而真正在用的 recipConv 反而漏了规则——倒空间一行里只有它的色点
// 掉回 .layer-button i 的 currentColor。两个方向都要挡住。
const dockLayerIds = new Set([...html.matchAll(/data-layer="([^"]+)"/g)].map(m => m[1]));
const cssLayerIds = [...css.matchAll(/\.layer-button\[data-layer="([^"]+)"\]/g)].map(m => m[1]);
check('layer dock colour rules only target existing buttons',
  cssLayerIds.length > 0 && cssLayerIds.every(id => dockLayerIds.has(id)));
check('every reciprocal dock button takes the reciprocal colour',
  [...['recipPrim', 'recipConv', 'bz']].every(id => new RegExp(`\\.layer-button\\[data-layer="${id}"\\] i[^{]*\\{[^}]*var\\(--reciprocal\\)`).test(css)));
// ── 发布产物：声明必须随分发走 ────────────────────────────────────────────────
// docs/THIRD-PARTY-NOTICES.md 自己写着它「是发布产物的一部分」——SeeK-path 的 MIT 声明必须随
// 分发保留。GitHub Pages 站点就是分发物，所以这两份必须真的被拷进 dist/，而不是只躺在仓库里。
const build = read('tools/build.mjs');
check('the published bundle carries LICENSE and the third-party notices',
  build.includes("'LICENSE'") && build.includes('THIRD-PARTY-NOTICES.md'));
// 声明在仓库里位于 docs/，指向 LICENSE 用 ../LICENSE；进 dist 后两者同在根目录，那个 ../
// 会指到站点外面（404）。所以拷过去时要把它改平——这条同时挡住「忘了改」和「改错了源文件」。
check('the notices link is rewritten for the dist layout, source left alone',
  build.includes("'](../LICENSE)'") && build.includes("'](./LICENSE)'")
  && read('docs/THIRD-PARTY-NOTICES.md').includes('](../LICENSE)'));
// 声明得在站上走得到。放在 #theoryContent 外面，否则每次重绘抽屉内容都会被冲掉。
const footer = html.match(/<footer class="theory-footer">[\s\S]*?<\/footer>/)?.[0] ?? '';
check('the drawer links to the notices',
  footer.includes('href="./THIRD-PARTY-NOTICES.md"') && footer.includes('rel="noopener"')
  && html.indexOf(footer) > html.indexOf('id="theoryContent"'));
// 发布物把它放在根目录，仓库里在 docs/ 下——dev server 要按同样的布局补别名，
// 否则那个链接只在发布后才可用，本地一点就是 404，最容易被当成死链接删掉。
const dev = read('tools/dev-server.mjs');
check('dev server serves the notices at the published path',
  dev.includes("'/THIRD-PARTY-NOTICES.md': 'docs/THIRD-PARTY-NOTICES.md'"));

// ── 交互入口：所有控件只声明 data-action，由 bindWorkbench 一处委派分发 ──────────────
// 委派把「控件」和「处理器」拆到两个文件里，代价是打错一个字母不会有任何提示（查不到表
// 就静默 no-op）。这两条就是补上那个提示：HTML 里出现的每个 action 都必须在表里有 handler，
// 反过来表里的每个 handler 也必须真被某个控件用到——否则就是写了没人调的处理器。
// 控件不只声明在 index.html 里：catalog 的「在 3D 中查看」与理论抽屉的跳转按钮都是模板串
// 生成的，所以三处一起扫——只扫 HTML 会把 openIn3D 误判成没人用的处理器。
const controlSources = html + catalog + theory;
const actionAttrs = [...controlSources.matchAll(/data-action="([^"]+)"/g)].map(m => m[1]);
const layerActions = [...html.matchAll(/data-layer-action="([^"]+)"/g)].map(m => m[1]);
const tableBody = name => workbench.match(new RegExp(`${name}\\s*=\\s*\\{([\\s\\S]*?)\\n  \\};`))?.[1] ?? '';
const handlerNames = table => [...tableBody(table).matchAll(/^ {4}(\w+):/gm)].map(m => m[1]);
const clickHandlers = handlerNames('CLICKS');
const changeHandlers = handlerNames('CHANGES');
// 同一个 action 只属于一张表：click 表和 change 表都认领它，浏览器会按事件类型只派发一次，
// 但写错表（把 select 的 change 写进 CLICKS）在浏览器里表现为「完全没反应」，很难查。
check('every data-action has exactly one handler',
  actionAttrs.length >= 30 && actionAttrs.every(a => clickHandlers.includes(a) !== changeHandlers.includes(a)));
check('every declared handler is used by a control',
  [...clickHandlers, ...changeHandlers].every(h => actionAttrs.includes(h)));
// data-layer-action 指向的是保留自身副作用的专用 action，必须真的存在于 actions 对象上。
const actionKeys = [...main.matchAll(/^  (\w+)\(/gm)].map(m => m[1]);
check('every layer checkbox points at a real action',
  layerActions.length === 4 && uniq(layerActions) && layerActions.every(a => actionKeys.includes(a)));
// 委派的意义就是「挂一次管到底」。workbench.js 再出现逐元素绑定，抽屉跳转按钮和 catalog
// 行按钮这类每次重绘都会重建的控件就会重新变成「点了没反应」。
const wbBindings = [...workbench.matchAll(/\.addEventListener\(/g)];
check('workbench delegates through exactly one click and one change listener',
  wbBindings.length === 2 && workbench.includes("document.addEventListener('click'")
  && workbench.includes("document.addEventListener('change'"));
// 行按钮与跳转按钮不再自己绑事件——它们重绘后由上面的委派接管。
// 这条要按**结构**断言而不是照抄原字符串：把绑定搬回渲染函数的人不会恰好用回单引号，
// 照抄字面量的守卫只在「撤销这次改动」时能红，改写成别的等价写法就漏过去了。
// 渲染路径 = 渲染函数里紧跟 querySelectorAll 之后挂的监听；计数则兜住其它写法。
const renderBindings = /querySelectorAll\([^)]*\)[^;]*addEventListener/;
check('the rebuildable controls carry no per-element listener',
  !renderBindings.test(catalog) && !renderBindings.test(theory)
  && (catalog.match(/addEventListener\(/g) ?? []).length === 3
  && !theory.includes('addEventListener'));
// basisMatrix 曾经直接写 vectors[j][i]。lattice.primitive 是 [[x,y,z],…]，所以正空间的 A
// 一直是对的；但 reciprocalVectors() 返回 Vector3[]，取下标得到 undefined，于是倒格基矩阵
// 静默渲染成一格空白——不报错、不抛异常，看上去只是「还没算」。经 toV3 归一化后两种输入都对。
check('basis matrix accepts arrays and Vector3 alike',
  /export function basisMatrix\(vectors\)\s*\{[^}]*\.map\(toV3\)/.test(model));
// 倒胞体积是 |det B| = √(det g*)：g* = BᵀB 给的是体积的**平方**。曾经误把 det g* 当体积输出，
// 同一行里就与闭式 (2π)³/V_p 差了 992 倍，是「读者一眼能看出矛盾」的那类错误。
check('reciprocal cell volume is |det B| = sqrt(det g*), not det g*',
  theory.includes('Math.sqrt(Math.max(0, detGStar))') && theory.includes('volumeAgrees')
  && theory.includes('closedForm'));
// 抽屉顶部只有「定义 / 推导」两个页签。再挂一个同名标题就是重复一行字。
check('theory drawer has no title duplicating its tabs',
  !html.includes('theoryModeTitle') && !theory.includes('theoryModeTitle'));
// 命名规则从「三个函数改名」那一刻起就是全仓的：只改调用点、把旧名留在注释里，
// 下一个人照着注释写就会把旧函数名写回代码里。src/ 里一个旧名都不该剩下。
const srcBundle = [main, state, scene, viewport, theory, workbench, catalog, geometry, lattices, model,
  read('src/app/constants.js'), read('src/core/symmetry.js'), read('src/core/kpaths.js')].join('\n');
check('the pre-rename geometry names are gone from src/',
  !/\b(thickSegments|parallelepipedEdges)\b/.test(srcBundle));
check('definition and catalog keep short math inline', !overviewSource.includes('\\\\[') && !catalog.includes('\\\\['));
check('derivation display math is selective', (derivationSource.match(/\\\\\[/g) || []).length <= 8);
check('inline MathJax cannot wrap by itself', css.includes('mjx-container:not([display="true"])') && css.includes('white-space: nowrap !important'));
check('display MathJax scrolls instead of breaking layout', css.includes('mjx-container[display="true"]') && css.includes('overflow-x: auto'));
// 图例色块和 3D 对象是两张表（CSS token 与 COLORS），曾经数值各不相同、也没有任何 JS 读 token，
// 于是图例和画面各说各话。这条把两张表绑在一起，任一边漂移都会失败。
check('semantic palette mirrors the scene colour registry',
  tokenValue('direct') === hex(COLORS.a2) && tokenValue('reciprocal') === hex(COLORS.b1)
  && tokenValue('symmetry') === hex(COLORS.symmetry) && tokenValue('ws') === hex(COLORS.ws)
  && tokenValue('bz') === hex(COLORS.bz)
  && css.includes('.legend-mark.ws { background: var(--ws); }')
  && css.includes('.legend-mark.bz { background: var(--bz); }') && !css.includes('#8eaab2'));
// 晶胞之间「看着像同色」是用户直接反馈的问题，所以量距离。旧值 ws↔a2 只有 12、bz↔b1 只有 22，
// 都过不了 30；把任一个改回去这条就会红。
check('the three direct-space cells are perceptibly distinct',
  rgbDistance(COLORS.conventional, COLORS.a2) > 30 && rgbDistance(COLORS.a2, COLORS.ws) > 30);
check('the reciprocal cells are perceptibly distinct', rgbDistance(COLORS.b1, COLORS.bz) > 30);
// 场景里只能有一套画线体系：LineBasicMaterial.linewidth 在 Windows/ANGLE 上恒被忽略，
// 与圆柱实例化并存时，晶面轮廓 / k 路径 / 配位键会比晶胞棱细一个量级。
// 只找构造用法，不找解释这条约束的注释（geometry.js 里就留着一段说明为什么不能用它）。
check('single controllable line system',
  !geometry.includes('new THREE.LineBasicMaterial') && !geometry.includes('new THREE.Line(')
  && !geometry.includes('THREE.ArrowHelper') && !scene.includes('new THREE.LineBasicMaterial')
  && !scene.includes('lineSegments(')
  && geometry.includes('export function makeSegments') && !scene.includes('const CELL_LINE')
  && geometry.includes('export function makeArrow'));
check('line weights come from one table',
  LINE_WEIGHTS.cell > 0 && LINE_WEIGHTS.plane === LINE_WEIGHTS.cell * 0.7
  && LINE_WEIGHTS.path === LINE_WEIGHTS.cell * 0.6 && LINE_WEIGHTS.axis === LINE_WEIGHTS.cell * 0.6
  && LINE_WEIGHTS.bond === LINE_WEIGHTS.cell * 0.7
  && scene.includes('LINE_WEIGHTS.cell * directUnit') && scene.includes('LINE_WEIGHTS.cell * reciprocalUnit')
  && scene.includes('LINE_WEIGHTS.plane * directUnit') && scene.includes('LINE_WEIGHTS.path * unit')
  && scene.includes('LINE_WEIGHTS.axis * unit') && scene.includes('LINE_WEIGHTS.bond * atomUnit'));
// 漏传半径不会报错：makeSegments 会退回「平均段长 × 0.045」，拿到一个看着有粗细、实际与
// 长度相关的值（对称轴会粗约 9 倍，配位键则每个结构都不同）。所以逐个调用点要求显式半径。
// 签名统一成 options 之后实参降到 3 个，「数实参个数」再也守不住这件事（3 个实参里没有半径
// 完全合法），必须直接断言选项对象里写了 radius。声明语句本身也匹配得上——它的第三个形参
// 就是含 radius 的解构模式，正好也满足同一条不变式。
const segCalls = callArgs(`${geometry}\n${scene}`, 'makeSegments');
const arrowCalls = callArgs(`${geometry}\n${scene}`, 'makeArrow');
const cloudCalls = callArgs(`${geometry}\n${scene}`, 'makePointCloud');
check('every makeSegments call site passes an explicit radius',
  segCalls.length >= 8 && segCalls.every(p => p.length >= 3 && p[2].includes('radius')));
// makeArrow 多一个 vec 身份参数，选项对象落在第 4 位（origin, vec, color, options）。
check('every makeArrow call site passes an explicit radius',
  arrowCalls.length >= 8 && arrowCalls.every(p => p.length >= 4 && p[3].includes('radius')));
// makePointCloud 曾经是这对签名里最容易踩的那个：它的第三个参数是 radius，而 makeCellMesh /
// makeSegments 的第三个参数是 opacity。统一后两边都是 options，这条守住它不会退回去。
check('every makePointCloud call site passes an explicit radius',
  cloudCalls.length >= 5 && cloudCalls.every(p => p.length >= 3 && p[2].includes('radius')));
check('conventional cell colour lives in the registry',
  Object.prototype.hasOwnProperty.call(COLORS, 'conventional') && !scene.includes('0xc7cbcc')
  && scene.includes('COLORS.conventional'));
check('no decorative animation system', !css.includes('@keyframes') && !css.includes('animation:') && !css.includes('filter: blur'));
check('system font stack is shared with canvas labels', tokens.includes('Segoe UI Variable') && tokens.includes('PingFang SC') && geometry.includes('getComputedStyle(document.body).fontFamily') && !geometry.includes('Inter'));
check('same species retain same structure color', !lattices.includes("label:'A',offset:[.25,.25,.25],color:'#a78bfa'") && !lattices.includes("label:'A',offset:[2/3,1/3,.5],color:'#a78bfa'"));
check('no legacy interface names or demo state', !sourceBundle.includes('DemoController') && !sourceBundle.includes('demoController') && !sourceBundle.includes('state.range') && !sourceBundle.includes("mode==='symmetry'") && !sourceBundle.includes("mode==='miller'"));
check('single DOM helper module', main.includes("from './ui/dom.js'") && theory.includes("from './dom.js'") && workbench.includes("from './dom.js'") && catalog.includes("from './dom.js'"));
check('local MathJax runtime', html.includes('./vendor/mathjax/tex-svg.js') && fs.existsSync(new URL('../public/vendor/mathjax/tex-svg.js', import.meta.url)));
check('vendored Three.js runtime', html.includes('type="importmap"') && html.includes('"three": "./vendor/three/three.module.js"') && fs.existsSync(new URL('../public/vendor/three/addons/controls/OrbitControls.js', import.meta.url)));
check('zero-dependency npm toolchain', !pkg.dependencies && !pkg.devDependencies && pkg.scripts.dev === 'node tools/dev-server.mjs' && pkg.scripts.build === 'node tools/build.mjs');
check('no bundled fonts or font-face', !css.includes('@font-face') && !tokens.includes('@font-face') && !html.includes('Inter'));
check('reciprocal convention explicit', theory.includes('B=2\\\\pi A^{-T}') && catalog.includes('B=2\\\\pi A^{-T}'));
check('catalog remains separate research index', html.includes('id="catalogToggleBtn"') && html.includes('id="catalogArea"') && catalog.includes('SPACE_GROUPS'));
// 倒格惯用胞必须走倒点阵的中心化（正 F ↔ 倒 I），不能拿正空间惯用胞直接做 2πC^{-T}；
// 后者对 FCC 给出棱长 2π 的空立方体，看不出体心。中心化位点也必须画出来，否则同样看不出。
check('reciprocal conventional cell uses the reciprocal centring',
  scene.includes('reciprocalConventionalCell(lattice)') && !scene.includes('reciprocalVectors(lattice.conventional)')
  && scene.includes('cell.sites') && lattices.includes('export function conventionalFromPrimitive')
  && lattices.includes('export function centeringSites'));
// 倒空间的自然基是 b1/b2/b3（「原胞」层画基矢箭头），笛卡尔 x/y/z 在那里没有物理对应。
check('reciprocal view draws no cartesian axes', !/addAxes\(reciprocalRoot/.test(scene) && /addAxes\(directRoot/.test(scene));
check('reciprocal lattice points keep a focus shell',
  scene.includes('nearestShell(reciprocal)') && scene.includes('0.130 * reciprocalUnit') && geometry.includes('export function nearestShell'));
// 结构模式的「格架」必须是真实原子场（按实际原子位置画、由 makeAtoms 按元素分色），
// 不能是 Bravais 格点云：金刚石会漏掉 (¼,¼,¼) 那一半原子，NaCl 会把 Na/Cl 画成同一种灰。
check('structure scaffold draws real atoms, not lattice points',
  /state\.mode === 'structure'[\s\S]{0,600}?makeAtoms\(scaffold/.test(scene)
  && scene.includes('structureAtoms(lattice, STRUCTURES[state.structure], basisOffsetCartesian, repeatRange(state))')
  && geometry.includes('byColor.has(atom.color)'));
// W–S 必须与画面同源：结构模式走广义 W–S 胞，Bravais 模式走点阵胞；两处读数也要一致。
check('Wigner–Seitz follows the structure in structure mode',
  scene.includes('currentWignerSeitz(state, lattice)') && workbench.includes('currentWignerSeitz(state, lattice)')
  && theory.includes('currentWignerSeitz(state, lattice)')
  && model.includes('export function currentWignerSeitz')
  && /state\.mode !== 'structure'\) return wignerSeitzCached\(lattice\.primitive\)/.test(model)
  && theory.includes('真实原子位移'));
// BZ 永远是倒格点阵的 W–S 胞（倒空间没有基元），不该跟着结构走。
check('Brillouin zone stays lattice-based',
  scene.includes('wignerSeitzCached(reciprocal)') && workbench.includes('wignerSeitzCached(reciprocal)'));
// 依赖只能向下：main → scene/ui → core。core 是纯物理与几何，反向 import app/ 或 scene/ 或 ui/
// 会让它变成「知道界面长什么样」的模块（曾经 model.js 就为了一个 overlay 显示比例 ρ 去 import
// app/constants.js）。core 内部互相 import 是允许的。
const coreFiles = ['geometry', 'lattices', 'model', 'symmetry', 'kpaths'];
const coreImports = coreFiles.map(name => [...read(`src/core/${name}.js`).matchAll(/from\s+'([^']+)'/g)].map(m => m[1])).flat();
check('core does not depend on app, scene or ui',
  coreImports.length > 0 && !coreImports.some(spec => /^\.\.\/(app|scene|ui)\//.test(spec)));
check('overlay display ratio lives in core',
  model.includes('const OVERLAY_RECIP_RATIO') && !tokens.includes('OVERLAY_RECIP_RATIO')
  && !read('src/app/constants.js').includes('OVERLAY_RECIP_RATIO'));

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failed++;
}
if (failed) {
  console.error(`\n${failed} UI checks failed.`);
  process.exit(1);
}
console.log(`\n${checks.length} UI checks passed.`);
