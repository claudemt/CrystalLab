import { state, LAYERS, setLayer, toggleLayer } from './app/state.js';
import { SPACE_VIEWS } from './app/constants.js';
import { currentLattice, fracToCartesian } from './core/model.js';
import { Viewport3D } from './scene/viewport.js';
import { renderScene } from './scene/render-scene.js';
import { initCatalog } from './ui/catalog.js';
import { createTheory } from './ui/theory.js';
import {
  applyMode, bindWorkbench, populateSelectors, refreshSymmetryControls,
  syncWorkbench, toggleTheory as setTheoryPanelOpen
} from './ui/workbench.js';
import { $, $$ } from './ui/dom.js';

const view = new Viewport3D($('#stageViewport'));

function frameKey(lattice = currentLattice(state)) {
  return [state.mode, lattice.id || state.structure || state.bravais, state.spaceView, state.globalRepeat].join('|');
}

function render({ forceTheory = false } = {}) {
  const lattice = currentLattice(state);
  if (state.mode !== 'catalog') renderScene(view, state, lattice);
  syncWorkbench(lattice);
  if (state.mode !== 'catalog') theory.update(lattice, forceTheory);
}

function stopAutoRotate() {
  state.autoRotate = false;
  $('#autoRotateBtn')?.classList.remove('active');
}

function activateLayerFromTheory(layer) {
  const definition = LAYERS[layer];
  if (!definition) return;
  setLayer(layer, true);
  if (definition.requires) state[definition.requires] = true;
  if (definition.space === 'direct') state.spaceView = 'direct';
  if (definition.space === 'reciprocal') state.spaceView = 'reciprocal';
  render();
}

// 两者都不再收回调：跳转按钮与 catalog 的行按钮改成声明 data-action，
// 由 bindWorkbench 的全局委派分发到下面 actions 里的 jumpLayer / openIn3D。
const theory = createTheory();

const catalog = initCatalog();

const actions = {
  setMode(mode, applyDefaults = true) {
    if (mode === 'catalog') {
      state.mode = 'catalog';
      catalog.setVisible(true);
      syncWorkbench(currentLattice(state));
      return;
    }
    catalog.setVisible(false);
    applyMode(mode, applyDefaults);
    if (mode === 'bravais') $('#bravaisSelect').value = state.bravais;
    refreshSymmetryControls(currentLattice(state));
    render({ forceTheory: true });
  },

  setStructure(id) {
    state.structure = id;
    refreshSymmetryControls(currentLattice(state));
    render({ forceTheory: true });
  },

  setBravais(id) {
    state.bravais = id;
    refreshSymmetryControls(currentLattice(state));
    render({ forceTheory: true });
  },

  setSymmetry(id, play = false) {
    state.symmetry = id;
    if (play) state.symmetryPlayRequested = true;
    stopAutoRotate();
    render();
  },

  playSymmetry() {
    state.symmetryPlayRequested = true;
    stopAutoRotate();
    render();
  },

  toggleLayer(layer) {
    if (!toggleLayer(layer)) return;
    render();
  },

  setSymmetryVisible(visible) {
    state.showSymmetry = visible;
    if (visible) {
      refreshSymmetryControls(currentLattice(state));
      state.symmetryPlayRequested = true;
      stopAutoRotate();
    } else {
      state.showGroupOrbit = false;
    }
    render();
  },

  setMillerVisible(visible) {
    state.showMiller = visible;
    render();
  },

  setKPathVisible(visible) {
    state.showKPath = visible;
    if (visible && state.spaceView === 'direct') state.spaceView = 'reciprocal';
    render();
  },

  setOrbitVisible(visible) {
    state.showGroupOrbit = visible;
    if (visible) state.showSymmetry = true;
    render();
  },

  setSpaceView(viewName) {
    if (!SPACE_VIEWS.includes(viewName)) return;
    state.spaceView = viewName;
    render();
  },

  toggleRepeat() {
    state.globalRepeat = !state.globalRepeat;
    render();
  },

  setMillerIndices() {
    state.h = Number($('#hInput').value);
    state.k = Number($('#kInput').value);
    state.l = Number($('#lInput').value);
    if (state.h === 0 && state.k === 0 && state.l === 0) {
      state.l = 1;
      $('#lInput').value = 1;
    }
    render();
  },

  setMillerPreset(value) {
    const [h, k, l] = value.split(',').map(Number);
    Object.assign(state, { h, k, l });
    $('#hInput').value = h;
    $('#kInput').value = k;
    $('#lInput').value = l;
    render();
  },

  setStandardView(code) {
    const lattice = currentLattice(state);
    if (code === 'iso') {
      view.resetCamera();
      view.frame(frameKey(lattice), state.spaceView, { force: true });
    } else {
      const directions = { '100': [1, 0, 0], '110': [1, 1, 0], '111': [1, 1, 1], '001': [0, 0, 1] };
      const uvw = directions[code];
      if (!uvw) return;
      view.frame(frameKey(lattice), state.spaceView, { force: true });
      view.setViewDirection(fracToCartesian(lattice.conventional, uvw, false));
    }
    $('#viewMenu').open = false;
  },

  toggleAutoRotate() {
    state.autoRotate = !state.autoRotate;
    $('#autoRotateBtn').classList.toggle('active', state.autoRotate);
    $('#autoRotateBtn').title = state.autoRotate ? '关闭自动旋转' : '自动旋转';
  },

  toggleTheory(open) {
    setTheoryPanelOpen(open);
    if (open) theory.update(currentLattice(state), true);
    setTimeout(() => view.resize(), 100);
  },

  setTheoryTab(tab) {
    state.theoryTab = tab;
    for (const button of $$('.theory-tab')) button.classList.toggle('active', button.dataset.theoryTab === tab);
    theory.update(currentLattice(state), true);
  },

  // 理论抽屉的跳转按钮：开层、满足依赖、并切到该层所属的空间。
  jumpLayer(layer) {
    activateLayerFromTheory(layer);
  },

  // catalog 详情页的「在 3D 中查看该 Bravais 格子」。
  openIn3D(id) {
    applyMode('bravais', true);
    state.bravais = id;
    $('#bravaisSelect').value = id;
    refreshSymmetryControls(currentLattice(state));
    catalog.setVisible(false);
    render({ forceTheory: true });
  }
};

populateSelectors(currentLattice(state));
bindWorkbench(actions);
catalog.setVisible(false);
render({ forceTheory: true });

function loop(time) {
  requestAnimationFrame(loop);
  view.render(time);
}
requestAnimationFrame(loop);
