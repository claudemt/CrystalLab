import { state, LAYERS, layerValue, setModeDefaults } from '../app/state.js';
import { SPACE_VIEWS } from '../app/constants.js';
import { BRAVAIS, STRUCTURES, SYSTEM_NAMES, CRYSTAL_SYSTEMS } from '../core/lattices.js';
import { SYMMETRY_OPERATIONS } from '../core/symmetry.js';
import { cellVolume, latticeParameters, reciprocalVectors } from '../core/geometry.js';
import { getKPath, kPathBranches, displayKLabel } from '../core/kpaths.js';
import {
  basisCell, currentPointGroup, currentWignerSeitz, directVisible, fmt, namedSymmetryValid,
  reciprocalDisplayScale, reciprocalVisible, wignerSeitzCached
} from '../core/model.js';
import { $, $$, setHidden } from './dom.js';
import { typesetMath } from './mathjax.js';

export function populateSelectors(lattice) {
  const structureSelect = $('#structureSelect');
  structureSelect.innerHTML = Object.entries(STRUCTURES).map(([id, structure]) => `<option value="${id}">${structure.name}</option>`).join('');
  structureSelect.value = state.structure;

  const groups = {};
  for (const [id, item] of Object.entries(BRAVAIS)) (groups[item.system] ??= []).push([id, item]);
  const bravaisSelect = $('#bravaisSelect');
  bravaisSelect.innerHTML = Object.entries(groups)
    .map(([system, items]) => `<optgroup label="${SYSTEM_NAMES[system]}">${items.map(([id, item]) => `<option value="${id}">${item.name}</option>`).join('')}</optgroup>`)
    .join('');
  bravaisSelect.value = state.bravais;
  refreshSymmetryControls(lattice);
}

export function refreshSymmetryControls(lattice) {
  const select = $('#symmetrySelect');
  if (!select) return;
  const valid = Object.entries(SYMMETRY_OPERATIONS).filter(([, op]) => namedSymmetryValid(state, lattice, op));
  const ids = valid.map(([id]) => id);
  if (!ids.includes(state.symmetry)) {
    const preferred = CRYSTAL_SYSTEMS[lattice.system].defaultOp;
    state.symmetry = ids.includes(preferred) ? preferred : (ids.find(id => id !== 'identity') || ids[0] || 'identity');
  }
  select.innerHTML = valid.map(([id, op]) => `<option value="${id}">${op.name}</option>`).join('');
  select.value = state.symmetry;
}

function refreshKPathReadout(lattice) {
  const path = getKPath(lattice.id);
  const note = $('#kpathNote');
  if (note) note.textContent = path ? '' : '当前 Bravais 类型暂无内置路径';
  const guide = $('#kpathGuide');
  if (guide) {
    guide.classList.toggle('hidden', !path || !state.showKPath || !reciprocalVisible(state));
    guide.innerHTML = path
      ? `<strong>${path.variant} · k 路径</strong><span>${kPathBranches(path).map(branch => branch.map(displayKLabel).join(' → ')).join(' <em>|</em> ')}</span><small>竖线表示分支断开；各点坐标见「推导」页签</small>`
      : '';
  }
}

function syncInspector(lattice) {
  const structural = state.mode === 'structure';
  setHidden('#structureField', !structural);
  setHidden('#bravaisField', structural);
  setHidden('#symmetryControls', !state.showSymmetry);
  setHidden('#millerControls', !state.showMiller);
  setHidden('#kpathNote', Boolean(getKPath(lattice.id)));

  const symmetryToggle = $('#symmetryLayerToggle');
  const millerToggle = $('#millerLayerToggle');
  const kPathToggle = $('#kPathLayerToggle');
  const orbitToggle = $('#groupOrbitToggle');
  if (symmetryToggle) symmetryToggle.checked = state.showSymmetry;
  if (millerToggle) millerToggle.checked = state.showMiller;
  if (kPathToggle) {
    kPathToggle.checked = state.showKPath;
    kPathToggle.disabled = !getKPath(lattice.id);
  }
  if (orbitToggle) orbitToggle.checked = state.showGroupOrbit;

  refreshKPathReadout(lattice);
  const wsLabel = $('[data-ws-label]');
  if (wsLabel) wsLabel.textContent = structural ? '原子胞' : 'W–S';
}

function syncLayerDock() {
  for (const button of $$('[data-layer]')) {
    const definition = LAYERS[button.dataset.layer];
    if (!definition) continue;
    button.classList.toggle('active', layerValue(button.dataset.layer));
    button.classList.toggle('is-context-hidden', Boolean(definition.requires && !state[definition.requires]));
    button.setAttribute('aria-pressed', String(layerValue(button.dataset.layer)));
  }
}

function syncSpaceUI() {
  document.documentElement.dataset.spaceView = state.spaceView;
  for (const button of $$('[data-space-view]')) button.classList.toggle('active', button.dataset.spaceView === state.spaceView);
  const repeat = $('#repeatToggleBtn');
  if (repeat) {
    repeat.classList.toggle('active', state.globalRepeat);
    repeat.setAttribute('aria-pressed', String(state.globalRepeat));
    repeat.title = state.globalRepeat ? '切换为局部范围' : '显示全局周期重复';
    repeat.setAttribute('aria-label', state.globalRepeat ? '当前为全局范围；切换为局部范围' : '当前为局部范围；切换为全局范围');
  }
}

function updateStageMeta(lattice) {
  const structure = state.mode === 'structure' ? STRUCTURES[state.structure] : null;
  const title = { direct: '实空间', reciprocal: '倒空间', overlay: '正倒空间对照' }[state.spaceView] || '实空间';
  $('#stageTitle').textContent = title;
  $('#stageCaption').textContent = state.spaceView === 'overlay' ? `显示归一化 × ${fmt(reciprocalDisplayScale(state, lattice), 3)}` : '';
  const dot = $('#stageSpaceDot');
  dot?.classList.toggle('is-reciprocal', state.spaceView === 'reciprocal');
  dot?.classList.toggle('is-direct', state.spaceView !== 'reciprocal');

  // 格点/倒格点在场景里直接可见，左下角不再重复标注。
  const legends = [];
  if (state.showWS && directVisible(state)) legends.push(`<span class="legend-item"><i class="legend-mark ws"></i>${state.mode === 'structure' ? '原子 Voronoi' : 'W–S'}</span>`);
  if (state.showBZ && reciprocalVisible(state)) legends.push('<span class="legend-item"><i class="legend-mark bz"></i>第一 BZ</span>');
  if (state.showMiller) legends.push('<span class="legend-item"><i class="legend-mark symmetry"></i>(hkl)</span>');
  if (state.showKPath && reciprocalVisible(state)) legends.push('<span class="legend-item"><i class="legend-mark reciprocal"></i>k 路径</span>');
  $('#stageLegend').innerHTML = legends.join('');

  if (state.mode === 'structure') {
    $('#objectIdentity').innerHTML = `<span>${structure.example} · ${BRAVAIS[structure.bravais].name}</span>`;
  } else {
    $('#objectIdentity').innerHTML = `<span>${CRYSTAL_SYSTEMS[lattice.system].name} · ${lattice.centering} 中心化</span>`;
  }

  const readout = $('#groupOrderReadout');
  if (readout) {
    const op = SYMMETRY_OPERATIONS[state.symmetry];
    readout.textContent = state.showSymmetry ? `${op.name} · |P| = ${currentPointGroup(state, lattice).order}` : '';
  }
}

function updateReadout(lattice) {
  const card = $('#stageReadout');
  if (!card) return;
  const primitiveVolume = cellVolume(lattice.primitive);
  const conventionalVolume = cellVolume(lattice.conventional);
  const reciprocal = reciprocalVectors(lattice.primitive);
  const reciprocalVolume = cellVolume(reciprocal);
  const rows = [];
  const add = (label, value) => rows.push(`<div class="readout-row"><span>${label}</span><b>${value}</b></div>`);
  const separator = () => rows.push('<div class="readout-separator"></div>');

  if (state.spaceView === 'reciprocal') {
    add('|b₁|', fmt(reciprocal[0].length(), 3));
    add('|b₂|', fmt(reciprocal[1].length(), 3));
    add('|b₃|', fmt(reciprocal[2].length(), 3));
    add('V*', fmt(reciprocalVolume, 3));
  } else if (state.spaceView === 'overlay') {
    add('Vₚ', fmt(primitiveVolume, 3));
    add('Vₚ*', fmt(reciprocalVolume, 3));
    add('VₚVₚ*', fmt(primitiveVolume * reciprocalVolume, 3));
    add('(2π)³', fmt((2 * Math.PI) ** 3, 3));
    add('显示归一化', `×${fmt(reciprocalDisplayScale(state, lattice), 3)}`);
  } else {
    const params = latticeParameters(lattice.conventional);
    add('a', fmt(params.a, 3));
    add('b / c', `${fmt(params.b, 3)} / ${fmt(params.c, 3)}`);
    add('α β γ', `${fmt(params.alpha, 0)}° ${fmt(params.beta, 0)}° ${fmt(params.gamma, 0)}°`);
    add('Vₚ', fmt(primitiveVolume, 3));
    if (Math.abs(conventionalVolume - primitiveVolume) > 1e-9) add('Vconv / Vₚ', Math.round(conventionalVolume / primitiveVolume));
    if (state.mode === 'structure') {
      const structure = STRUCTURES[state.structure];
      separator();
      add('结构', structure.short);
      add('配位数', structure.coordination);
    }
  }

  if (state.showMiller) {
    const [b1, b2, b3] = reciprocalVectors(basisCell(lattice));
    const G = b1.clone().multiplyScalar(state.h).addScaledVector(b2, state.k).addScaledVector(b3, state.l);
    separator();
    add('(hkl)', `(${state.h} ${state.k} ${state.l})`);
    if (G.length() > 1e-8) {
      add('dₕₖₗ', fmt(2 * Math.PI / G.length(), 3));
      add('|G|', fmt(G.length(), 3));
    }
  }
  if (state.showWS && directVisible(state)) {
    // 与画面同源：结构模式报的是真实原子的 Voronoi 胞，不是点阵 W–S 胞。
    const data = currentWignerSeitz(state, lattice);
    separator();
    add(state.mode === 'structure' ? '原子 Voronoi' : 'W–S 原胞', `${state.mode === 'structure' ? `${data.centerLabel} · ` : ''}${data.activePlanes.length} 面 · ${data.vertices.length} 顶点`);
  }
  if (state.showBZ && reciprocalVisible(state)) {
    const data = wignerSeitzCached(reciprocal);
    separator();
    add('BZ₁', `${data.activePlanes.length} 面 · ${data.vertices.length} 顶点`);
  }
  if (state.showSymmetry) {
    separator();
    add(state.mode === 'structure' ? '|P|' : '|P(L)|', currentPointGroup(state, lattice).order);
  }

  card.innerHTML = rows.join('');
}

export function syncWorkbench(lattice) {
  for (const button of $$('.mode-tab')) button.classList.toggle('active', button.dataset.mode === state.mode);
  $('#catalogToggleBtn')?.classList.toggle('active', state.mode === 'catalog');
  $('#appShell')?.classList.toggle('catalog-mode', state.mode === 'catalog');
  $('.workspace')?.classList.toggle('catalog-open', state.mode === 'catalog');
  syncInspector(lattice);
  syncLayerDock();
  syncSpaceUI();
  updateStageMeta(lattice);
  updateReadout(lattice);
}

export function toggleTheory(open) {
  state.theoryOpen = open;
  $('#appShell').classList.toggle('theory-closed', !open);
  $('#theoryToggleBtn').classList.toggle('active', open);
  $('#theoryToggleBtn').title = open ? '收起定义与推导' : '定义与推导';
  if (open) typesetMath([$('#theoryContent')]);
}

export function applyMode(mode, applyDefaults = true) {
  if (mode === 'catalog') {
    state.mode = 'catalog';
    return;
  }
  if (state.mode === 'structure' && mode !== 'structure') state.bravais = STRUCTURES[state.structure].bravais;
  state.mode = mode;
  if (applyDefaults) setModeDefaults(mode);
}

// 控件一律在 HTML / 模板串里声明 data-action，由这里唯一的一份委派分发。
// 之所以委派而不是逐元素绑定：理论抽屉的跳转按钮与 catalog 的行按钮每次重绘都会重建，
// 逐元素绑定必须跟着重绑（catalog 原来正是这么做的），漏一处就是「点了没反应」。
//
// 每个 handler 收到**元素本身**，自己决定取 dataset / value / checked。统一传「值」是行不通的：
// setMode 要两个实参，toggleTheory 不取参数，图层 checkbox 要的是 checked。
export function bindWorkbench(actions) {
  const CLICKS = {
    setMode:            el => actions.setMode(el.dataset.mode, true),
    openCatalog:        () => actions.setMode('catalog', false),
    playSymmetry:       () => actions.playSymmetry(),
    toggleLayer:        el => actions.toggleLayer(el.dataset.layer),
    setSpaceView:       el => actions.setSpaceView(el.dataset.spaceView),
    toggleRepeat:       () => actions.toggleRepeat(),
    setMillerPreset:    el => actions.setMillerPreset(el.dataset.hkl),
    setStandardView:    el => actions.setStandardView(el.dataset.view),
    toggleAutoRotate:   () => actions.toggleAutoRotate(),
    toggleTheory:       () => actions.toggleTheory(!state.theoryOpen),
    closeTheory:        () => actions.toggleTheory(false),
    setTheoryTab:       el => actions.setTheoryTab(el.dataset.theoryTab),
    jumpLayer:          el => actions.jumpLayer(el.dataset.jumpLayer),
    openIn3D:           el => actions.openIn3D(el.dataset.jump)
  };
  const CHANGES = {
    setStructure:     el => actions.setStructure(el.value),
    setBravais:       el => actions.setBravais(el.value),
    setSymmetry:      el => actions.setSymmetry(el.value, true),
    setMillerIndices: () => actions.setMillerIndices(),
    // 四个图层 checkbox 各带 data-layer-action，指向保留自身副作用的专用 action。
    // 它们不能塌成 setLayer(id, checked)：setSymmetryVisible 还要刷新操作列表、触发一次动画、
    // 关掉自动旋转，关时还要清 showGroupOrbit；setKPathVisible 开着时要切到倒空间；
    // setOrbitVisible 开着时要一并打开对称。统一的是绑定方式，不是语义。
    setNamedLayer:    el => actions[el.dataset.layerAction](el.checked)
  };
  // 未知 action 静默忽略。守卫（tests/verify-ui.mjs）保证每个 data-action 都在这两张表里，
  // 所以运行时不该出现查不到的情况；真出现了也不该让整个界面卡死。
  const dispatch = table => event => {
    const el = event.target.closest?.('[data-action]');
    if (el) table[el.dataset.action]?.(el);
  };
  document.addEventListener('click', dispatch(CLICKS));
  document.addEventListener('change', dispatch(CHANGES));

  if (!SPACE_VIEWS.includes(state.spaceView)) state.spaceView = 'direct';
}
