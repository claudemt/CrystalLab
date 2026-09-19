const INITIAL_STATE = Object.freeze({
  mode: 'structure',
  spaceView: 'direct',
  structure: 'fcc',
  bravais: 'cubic-F',
  symmetry: 'c4z',
  globalRepeat: false,
  autoRotate: false,
  h: 1,
  k: 1,
  l: 1,
  theoryTab: 'overview',
  theoryOpen: false,
  showReference: true,
  showConventionalCell: true,
  showPrimitiveCell: false,
  showWS: false,
  showBZ: false,
  showKPath: false,
  showSymmetry: false,
  showMiller: false,
  showGroupOrbit: false,
  showMillerFamily: false,
  showReciprocalPrimitiveCell: false,
  showReciprocalConventionalCell: true,
  showG: true,
  symmetryPlayRequested: false
});

export const state = { ...INITIAL_STATE };

export const LAYERS = Object.freeze({
  reference: { flag: 'showReference', space: 'both' },
  lattice: { flag: 'showReference', space: 'direct' },
  reciprocal: { flag: 'showReference', space: 'reciprocal' },
  conventional: { flag: 'showConventionalCell', space: 'direct' },
  primitive: { flag: 'showPrimitiveCell', space: 'direct' },
  ws: { flag: 'showWS', space: 'direct' },
  family: { flag: 'showMillerFamily', space: 'direct', requires: 'showMiller' },
  recipPrim: { flag: 'showReciprocalPrimitiveCell', space: 'reciprocal' },
  recipConv: { flag: 'showReciprocalConventionalCell', space: 'reciprocal' },
  bz: { flag: 'showBZ', space: 'reciprocal' },
  g: { flag: 'showG', space: 'reciprocal', requires: 'showMiller' },
  kpath: { flag: 'showKPath', space: 'reciprocal' }
});

function layerFlag(id) {
  return LAYERS[id]?.flag ?? null;
}

export function layerValue(id) {
  const flag = layerFlag(id);
  return flag ? Boolean(state[flag]) : false;
}

export function setLayer(id, value = true) {
  const flag = layerFlag(id);
  if (!flag) return false;
  state[flag] = Boolean(value);
  return true;
}

export function toggleLayer(id) {
  const flag = layerFlag(id);
  if (!flag) return false;
  state[flag] = !state[flag];
  return true;
}

export function setModeDefaults(mode) {
  state.showGroupOrbit = false;
  state.showMillerFamily = false;
  state.showReference = true;
  state.showWS = false;
  state.showBZ = false;
  state.showKPath = false;
  state.showG = true;
  const primitive = mode === 'bravais';
  state.showPrimitiveCell = primitive;
  state.showReciprocalPrimitiveCell = primitive;
}

export function resetTransientAnimation() {
  state.symmetryPlayRequested = false;
}
