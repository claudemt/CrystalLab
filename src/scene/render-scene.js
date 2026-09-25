import * as THREE from 'three';
import { COLORS, AXIS_COLORS, LINE_WEIGHTS } from '../app/constants.js';
import { resetTransientAnimation } from '../app/state.js';
import { STRUCTURES, basisOffsetCartesian } from '../core/lattices.js';
import { SYMMETRY_OPERATIONS, applyMatrix } from '../core/symmetry.js';
import {
  toV3, fromV3, reciprocalVectors, latticePoints, structureAtoms, coordinationShell, nearestShell,
  makeCellMesh, makeCellEdges, makeArrow, makePointCloud, makeAtoms,
  makeCoordinationBonds, millerPlanePolygon, planeThroughCellCenter, makePlaneMesh,
  makeSymmetryPlane, makeSegments, makeTextSprite
} from '../core/geometry.js';
import { getKPath, displayKLabel } from '../core/kpaths.js';
import {
  basisCell, characteristicLength, currentPointGroup, directVisible, fracToCartesian, reciprocalConventionalCell,
  millerFamilyData, reciprocalDisplayScale, reciprocalSceneActive, reciprocalVisible,
  repeatRange, wignerSeitzCached, currentWignerSeitz
} from '../core/model.js';

// 取景只按「一个周期的邻近格点」计算。重复度是显示密度而不是尺度，若跟着
// repeatRange 走，切换局部/全局会让默认缩放跳变（局部时远景、全局时更远）。
const FRAME_RANGE = 1;

function frameBox(vectors, scale = 1, into = new THREE.Box3()) {
  for (const point of latticePoints(vectors, FRAME_RANGE)) into.expandByPoint(toV3(point).multiplyScalar(scale));
  return into;
}

function addAxes(group, length, radius, colors = AXIS_COLORS) {
  group.add(makeArrow(new THREE.Vector3(), new THREE.Vector3(length, 0, 0), colors[0], { radius }));
  group.add(makeArrow(new THREE.Vector3(), new THREE.Vector3(0, length, 0), colors[1], { radius }));
  group.add(makeArrow(new THREE.Vector3(), new THREE.Vector3(0, 0, length), colors[2], { radius }));
}

function addBasisArrows(group, vectors, radius, prefix = 'a') {
  const colors = [COLORS[`${prefix}1`], COLORS[`${prefix}2`], COLORS[`${prefix}3`]];
  vectors.forEach((vector, i) => group.add(makeArrow(new THREE.Vector3(), toV3(vector), colors[i], { radius })));
}

function symmetryPath(op, start, end, steps = 36) {
  const samples = [];
  if (op.kind === 'rotation') {
    const axis = toV3(op.axis).normalize();
    for (let i = 0; i <= steps; i++) {
      const q = new THREE.Quaternion().setFromAxisAngle(axis, op.angle * i / steps);
      samples.push(start.clone().applyQuaternion(q));
    }
  } else {
    for (let i = 0; i <= steps; i++) samples.push(start.clone().lerp(end, i / steps));
  }
  const pairs = [];
  for (let i = 1; i < samples.length; i++) pairs.push(samples[i - 1], samples[i]);
  return pairs;
}

function renderSymmetry(root, state, basisVectors, unit, animate = false, alwaysOnTop = false) {
  const op = SYMMETRY_OPERATIONS[state.symmetry];
  const W = op.matrix;
  const extent = Math.max(0.55 * unit, ...basisVectors.map(v => toV3(v).length())) * 0.9;
  const group = new THREE.Group();
  group.name = 'symmetry-visual-root';
  const color = COLORS.symmetry;

  if (op.kind === 'mirror') group.add(makeSymmetryPlane(op.normal, color, { size: extent * 2.65 }));
  if (op.kind === 'rotation') {
    const axis = toV3(op.axis).normalize();
    const p1 = axis.clone().multiplyScalar(-extent * 1.12);
    const p2 = axis.clone().multiplyScalar(extent * 1.12);
    group.add(makeSegments([p1, p2], color, { opacity: 0.74, radius: LINE_WEIGHTS.axis * unit }));
    group.add(makeArrow(new THREE.Vector3(), axis.clone().multiplyScalar(extent * 0.88), color, { radius: LINE_WEIGHTS.axis * unit }));
  }
  if (op.kind === 'inversion') {
    group.add(makePointCloud([new THREE.Vector3()], color, {
      radius: 0.052 * unit, opacity: 1, shape: 'sphere',
      depthTest: !alwaysOnTop, depthWrite: false, renderOrder: 320
    }));
  }

  const start = new THREE.Vector3(0.72, 0.38, 0.52).normalize().multiplyScalar(extent * 0.72);
  const end = toV3(applyMatrix(W, start.toArray()));
  // 动画播放时，路径和终点先隐藏——让标记点的移动本身揭示变换轨迹，
  // 避免"答案先于过程"的视觉干扰；静态模式（非播放）照常全量展示。
  const pathSegments = op.kind !== 'identity'
    ? makeSegments(symmetryPath(op, start, end), color, { opacity: 0.30, radius: LINE_WEIGHTS.path * unit })
    : null;
  if (pathSegments) {
    if (animate) pathSegments.visible = false;
    group.add(pathSegments);
  }
  group.add(makePointCloud([start], 0x7d8589, {
    radius: 0.032 * unit, opacity: 0.62, shape: 'sphere',
    depthTest: !alwaysOnTop, depthWrite: false, renderOrder: 322
  }));
  const endPoint = makePointCloud([end], color, {
    radius: 0.041 * unit, opacity: 0.94, shape: 'sphere',
    depthTest: !alwaysOnTop, depthWrite: false, renderOrder: 323
  });
  if (animate) endPoint.visible = false;
  group.add(endPoint);

  if (op.kind !== 'identity') {
    const startLabel = makeTextSprite('起点', { fontSize: 36, scale: 0.065 * unit, textColor: '#9aa0a4', alwaysOnTop: true });
    startLabel.renderOrder = 324;
    startLabel.position.copy(start).addScaledVector(start.clone().normalize(), 0.065 * unit);
    startLabel.userData.kind = 'sym-label';
    startLabel.userData.desiredPixels = 14;
    startLabel.userData.aspect = startLabel.scale.x / startLabel.scale.y;
    group.add(startLabel);
    const endLabel = makeTextSprite('终点', { fontSize: 36, scale: 0.065 * unit, textColor: '#c96b7d', alwaysOnTop: true });
    endLabel.renderOrder = 324;
    endLabel.position.copy(end).addScaledVector(end.clone().normalize(), 0.065 * unit);
    endLabel.userData.kind = 'sym-label';
    endLabel.userData.desiredPixels = 14;
    endLabel.userData.aspect = endLabel.scale.x / endLabel.scale.y;
    if (animate) endLabel.visible = false;
    group.add(endLabel);
  }

  if (animate) {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.052 * unit, 20, 14),
      new THREE.MeshStandardMaterial({ color: 0xf0f0ec, roughness: 0.72, metalness: 0, depthTest: !alwaysOnTop, depthWrite: false })
    );
    marker.renderOrder = 325;
    marker.position.copy(start);
    group.add(marker);
    group.userData.symmetryAnimation = {
      marker, start, end, kind: op.kind, pathSegments, endPoint,
      axis: op.axis ? toV3(op.axis).normalize() : new THREE.Vector3(0, 0, 1),
      angle: op.angle || 0, startedAt: null, duration: 1200, done: false
    };
  }

  if (alwaysOnTop) {
    group.traverse(object => {
      if (!(object.isLine || object.isLineSegments || object.isInstancedMesh) || !object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        material.depthTest = false;
        material.depthWrite = false;
      }
      object.renderOrder = Math.max(object.renderOrder || 0, 315);
    });
  }
  root.add(group);
}

function renderGroupOrbit(root, state, lattice, basisVectors, unit, alwaysOnTop = false) {
  if (!state.showGroupOrbit) return;
  const p = fracToCartesian(basisVectors, [0.173, 0.287, 0.361], false);
  const cartesian = [];
  for (const op of currentPointGroup(state, lattice).operations) {
    const q = toV3(applyMatrix(op.W, p.toArray()));
    if (!cartesian.some(x => x.distanceToSquared(q) < 1e-10)) cartesian.push(q);
  }
  // 群轨道点只是辅助示意，不应抢原子/格架的视觉焦点：半径和透明度都压低，
  // 让种子点（白色、更大）仍然是目光落点。
  root.add(makePointCloud(cartesian, COLORS.symmetry, {
    radius: 0.024 * unit, opacity: 0.42, shape: 'sphere',
    depthTest: !alwaysOnTop, depthWrite: false, renderOrder: 310
  }));
  if (cartesian.length) {
    root.add(makePointCloud([cartesian[0]], 0xe9ebe8, {
      radius: 0.047 * unit, opacity: 0.96, shape: 'sphere',
      depthTest: !alwaysOnTop, depthWrite: false, renderOrder: 311
    }));
  }
}

function kPointCartesian(frac, reciprocal) {
  return toV3(reciprocal[0]).multiplyScalar(frac[0])
    .addScaledVector(toV3(reciprocal[1]), frac[1])
    .addScaledVector(toV3(reciprocal[2]), frac[2]);
}

function renderKPath(lattice, reciprocal, rootGroup, unit, alwaysOnTop = false) {
  const data = getKPath(lattice.id);
  if (!data) return null;
  const root = new THREE.Group();
  const positions = {};
  const used = new Set(data.path.flat());
  for (const [name, frac] of Object.entries(data.points)) if (used.has(name)) positions[name] = kPointCartesian(frac, reciprocal);

  const segments = [];
  for (const [a, b] of data.path) if (positions[a] && positions[b]) segments.push(positions[a], positions[b]);
  // 标志必须经由 options 落到 InstancedMesh 上：makeSegments 返回 Group，再写 .material 是
  // undefined；给 Group 设 renderOrder 则会变成 groupOrder 而排到最前，排序键不一样。
  root.add(makeSegments(segments, COLORS.b1, {
    opacity: 0.9, radius: LINE_WEIGHTS.path * unit,
    depthTest: !alwaysOnTop, depthWrite: false, renderOrder: alwaysOnTop ? 280 : 4
  }));
  root.add(makePointCloud(Object.values(positions), 0xd8c395, {
    radius: 0.040 * unit, opacity: 0.98, shape: 'sphere',
    depthTest: !alwaysOnTop, depthWrite: false, renderOrder: alwaysOnTop ? 281 : 5
  }));

  const placed = [];
  for (const [name, p] of Object.entries(positions)) {
    const radial = p.length() > 1e-7 ? p.clone().normalize().multiplyScalar(0.085 * unit) : new THREE.Vector3(0.05 * unit, 0.055 * unit, 0.01);
    const labelPosition = p.clone().add(radial);
    for (let tries = 0; tries < 3; tries++) {
      if (!placed.some(q => q.distanceTo(labelPosition) < 0.12 * unit)) break;
      let tangent = p.length() > 1e-7 ? new THREE.Vector3().crossVectors(p.clone().normalize(), new THREE.Vector3(0, 0, 1)) : new THREE.Vector3(1, 0, 0);
      if (tangent.length() < 0.15) tangent = new THREE.Vector3().crossVectors(p.clone().normalize(), new THREE.Vector3(0, 1, 0));
      tangent.normalize().multiplyScalar(0.04 * unit * (tries + 1) * (placed.length % 2 ? 1 : -1));
      labelPosition.add(tangent);
    }
    placed.push(labelPosition.clone());
    const label = makeTextSprite(displayKLabel(name), { fontSize: 52, scale: 0.105 * unit, alwaysOnTop: true });
    label.renderOrder = alwaysOnTop ? 282 : 6;
    label.position.copy(labelPosition);
    label.userData.kind = 'klabel';
    label.userData.desiredPixels = 22;
    label.userData.aspect = label.scale.x / label.scale.y;
    label.userData.frameExclude = true;
    label.userData.priority = name === 'GAMMA' ? 0 : 1;
    root.add(label);
  }
  rootGroup.add(root);
}

export function renderScene(view, state, lattice) {
  const direct = lattice.primitive;
  const reciprocal = reciprocalVectors(direct).map(fromV3);
  const directUnit = characteristicLength(direct);
  const reciprocalUnit = characteristicLength(reciprocal);
  const overlay = state.spaceView === 'overlay';
  const playSymmetry = state.symmetryPlayRequested;
  view.clear();

  let directRoot = null;
  let reciprocalRoot = null;

  if (directVisible(state)) {
    directRoot = new THREE.Group();
    directRoot.name = 'direct-space-root';
    view.dynamic.add(directRoot);

    if (state.showReference) {
      if (state.mode === 'structure') {
        // 结构模式的「格架」必须就是真实原子场：按实际原子位置画，并交给 makeAtoms 按元素分色。
        // 拿 Bravais 格点当格架，在金刚石这类带基元的晶体上会漏掉整套亚点阵——金刚石只画 FCC
        // 那一半，另一半 (¼,¼,¼) 的原子根本不出现；NaCl 则会把 Na 和 Cl 画成同一种灰点。
        // 这层是「平移对称性下的重复场」的主体，不是核心结构的陪衬，所以它的亮度和 Bravais
        // 点阵场同级（0.94/0.66），只是球径取小，好让放大的核心结构仍然压得住画面。
        const scaffold = structureAtoms(lattice, STRUCTURES[state.structure], basisOffsetCartesian, repeatRange(state));
        directRoot.add(makeAtoms(scaffold, { radius: 0.032 * characteristicLength(lattice.conventional), opacity: overlay ? 0.46 : 0.82 }));
      } else {
        const pointOpacity = overlay ? 0.66 : 0.94;
        directRoot.add(makePointCloud(latticePoints(direct, repeatRange(state)), COLORS.site, {
          radius: 0.057 * directUnit, opacity: pointOpacity, shape: 'sphere',
          depthWrite: !overlay, emissiveIntensity: 0
        }));
      }
    }

    if (state.mode === 'structure') {
      const structure = STRUCTURES[state.structure];
      const atoms = structureAtoms(lattice, structure, basisOffsetCartesian, repeatRange(state));
      const shell = coordinationShell(atoms, structure.basis[0].label);
      const atomUnit = characteristicLength(lattice.conventional);
      const focusAtoms = shell ? [shell.center, ...shell.neighbors] : atoms.slice(0, Math.min(atoms.length, 16));
      directRoot.add(makeAtoms(focusAtoms, { radius: 0.082 * atomUnit, opacity: overlay ? 0.82 : 1 }));
      if (shell) directRoot.add(makeCoordinationBonds(shell, 0x879aa3, { centerRadius: 0.105 * atomUnit, bondRadius: LINE_WEIGHTS.bond * atomUnit }));
    }

    if (state.showConventionalCell) directRoot.add(makeCellEdges(lattice.conventional, COLORS.conventional, { opacity: overlay ? 0.46 : 0.78, radius: LINE_WEIGHTS.cell * directUnit }));
    if (state.showPrimitiveCell) {
      addBasisArrows(directRoot, direct, LINE_WEIGHTS.axis * directUnit, 'a');
      directRoot.add(makeCellEdges(direct, COLORS.a2, { opacity: overlay ? 0.56 : 0.78, radius: LINE_WEIGHTS.cell * directUnit }));
    }
    if (state.showWS) {
      // 结构模式画的是真实原子的 Voronoi 胞（顶点已相对中心原子，天然落在原点），
      // Bravais 模式才是点阵的 W–S 胞。两者用同一个多面体算法，只是喂的点集不同。
      const data = currentWignerSeitz(state, lattice);
      const cell = makeCellMesh(data.vertices, COLORS.ws, { opacity: overlay ? 0.025 : 0.045, radius: LINE_WEIGHTS.cell * directUnit });
      cell.userData.kind = 'ws';
      directRoot.add(cell);
    }
    if (state.showSymmetry) {
      renderSymmetry(directRoot, state, direct, directUnit, playSymmetry, overlay);
      renderGroupOrbit(directRoot, state, lattice, direct, directUnit, overlay);
    }
    if (state.showMiller) {
      const cell = basisCell(lattice);
      if (state.showMillerFamily) {
        const family = millerFamilyData(state, lattice, state.h, state.k, state.l);
        const alpha = family.normals.length > 12 ? 0.018 : family.normals.length > 6 ? 0.026 : 0.038;
        for (const normal of family.normals) {
          const polygon = planeThroughCellCenter(cell, normal);
          directRoot.add(makePlaneMesh(polygon, COLORS.a2, { opacity: alpha, outlineOpacity: 0.28, outlineRadius: LINE_WEIGHTS.plane * directUnit }));
        }
      }
      let polygon = millerPlanePolygon(cell, state.h, state.k, state.l, 1);
      if (polygon.length < 3) polygon = millerPlanePolygon(cell, state.h, state.k, state.l, 0);
      directRoot.add(makePlaneMesh(polygon, COLORS.g, { opacity: 0.075, outlineOpacity: 0.78, outlineRadius: LINE_WEIGHTS.plane * directUnit }));
      const [b1, b2, b3] = reciprocalVectors(cell);
      const G = b1.clone().multiplyScalar(state.h).addScaledVector(b2, state.k).addScaledVector(b3, state.l);
      if (G.length() > 1e-8 && state.showG && state.spaceView === 'direct') {
        const maxA = Math.max(...cell.map(a => toV3(a).length()));
        directRoot.add(makeArrow(new THREE.Vector3(), G.clone().normalize().multiplyScalar(maxA * 0.90), COLORS.g, { radius: LINE_WEIGHTS.axis * directUnit }));
      }
    }
  }

  if (reciprocalSceneActive(state)) {
    const scale = reciprocalDisplayScale(state, lattice);
    reciprocalRoot = new THREE.Group();
    reciprocalRoot.name = 'reciprocal-space-root';
    reciprocalRoot.scale.setScalar(scale);
    view.dynamic.add(reciprocalRoot);

    if (state.showReference) {
      reciprocalRoot.add(makePointCloud(latticePoints(reciprocal, repeatRange(state)), COLORS.b1, {
        radius: 0.056 * reciprocalUnit, opacity: overlay ? 0.96 : 0.90, shape: 'cube',
        depthTest: !overlay, depthWrite: !overlay, renderOrder: overlay ? 260 : 0, emissiveIntensity: 0
      }));
      // 焦点壳层：G=0 加最近邻倒格点。
      reciprocalRoot.add(makePointCloud(nearestShell(reciprocal), COLORS.b1, {
        radius: 0.130 * reciprocalUnit, opacity: overlay ? 0.86 : 1, shape: 'cube',
        depthTest: !overlay, depthWrite: !overlay, renderOrder: overlay ? 262 : 1, emissiveIntensity: 0
      }));
    }
    if (state.showReciprocalConventionalCell) {
      // 倒格惯用胞 + 它的中心化位点。位点必须画出来：FCC 的倒格惯用胞是「棱长 4π 的体心立方」，
      // 少了体心那颗，画面就只是一个普通的空立方体，看不出 BCC。
      const cell = reciprocalConventionalCell(lattice);
      reciprocalRoot.add(makeCellEdges(cell.vectors, COLORS.b1, { opacity: overlay ? 0.62 : 0.80, radius: LINE_WEIGHTS.cell * reciprocalUnit }));
      if (cell.sites.length) {
        const [c1, c2, c3] = cell.vectors.map(toV3);
        const sites = cell.sites.map(f => c1.clone().multiplyScalar(f[0]).addScaledVector(c2, f[1]).addScaledVector(c3, f[2]));
        reciprocalRoot.add(makePointCloud(sites, COLORS.b1, {
          radius: 0.056 * reciprocalUnit, opacity: overlay ? 0.96 : 1, shape: 'cube',
          depthTest: !overlay, depthWrite: !overlay, renderOrder: overlay ? 260 : 0, emissiveIntensity: 0
        }));
      }
    }
    if (state.showReciprocalPrimitiveCell) {
      reciprocalRoot.add(makeCellEdges(reciprocal, COLORS.b3, { opacity: overlay ? 0.92 : 0.80, radius: LINE_WEIGHTS.cell * reciprocalUnit }));
      addBasisArrows(reciprocalRoot, reciprocal, LINE_WEIGHTS.axis * reciprocalUnit, 'b');
    }
    if (state.showBZ) {
      const bz = makeCellMesh(wignerSeitzCached(reciprocal).vertices, COLORS.bz, { opacity: overlay ? 0.032 : 0.045, radius: LINE_WEIGHTS.cell * reciprocalUnit });
      bz.userData.kind = 'bz';
      reciprocalRoot.add(bz);
    }
    if (state.showKPath) renderKPath(lattice, reciprocal, reciprocalRoot, reciprocalUnit, overlay);
    if (state.showMiller && state.showG) {
      const [b1, b2, b3] = reciprocalVectors(basisCell(lattice));
      const G = b1.clone().multiplyScalar(state.h).addScaledVector(b2, state.k).addScaledVector(b3, state.l);
      reciprocalRoot.add(makeArrow(new THREE.Vector3(), G, COLORS.g, { radius: LINE_WEIGHTS.axis * reciprocalUnit }));
    }
    if (state.showSymmetry) {
      // 对照模式下实、倒空间都展示对称操作，帮助用户对照两种空间中的变换效果。
      renderSymmetry(reciprocalRoot, state, reciprocal, reciprocalUnit, playSymmetry, false);
      renderGroupOrbit(reciprocalRoot, state, lattice, reciprocal, reciprocalUnit, false);
    }
    if (overlay) {
      reciprocalRoot.traverse(object => {
        if (!(object.isLine || object.isLineSegments || object.isInstancedMesh) || !object.material) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          material.depthTest = false;
          material.depthWrite = false;
        }
        object.renderOrder = Math.max(object.renderOrder || 0, 240);
      });
    }
  }

  // 笛卡尔 x/y/z 只在实空间（和对照视图的实空间部分）有物理含义。倒空间的自然基是 b1、b2、b3，
  // 由「原胞」层画成基矢箭头；在那里再叠一组笛卡尔轴，会被当成晶轴误读。「格架」在倒空间
  // 仍然有效——它管的是倒格点场。
  if (state.showReference) {
    if (state.spaceView === 'direct' && directRoot) addAxes(directRoot, 0.68 * directUnit, LINE_WEIGHTS.axis * directUnit, AXIS_COLORS);
    else if (state.spaceView === 'overlay') {
      const axisRoot = new THREE.Group();
      axisRoot.name = 'reference-axis-root';
      addAxes(axisRoot, 0.68 * directUnit, LINE_WEIGHTS.axis * directUnit, AXIS_COLORS);
      view.dynamic.add(axisRoot);
    }
  }

  const canvas = view.renderer.domElement;
  canvas.dataset.spaceView = state.spaceView;
  canvas.dataset.directRoot = String(Boolean(view.dynamic.getObjectByName('direct-space-root')));
  canvas.dataset.reciprocalRoot = String(Boolean(view.dynamic.getObjectByName('reciprocal-space-root')));
  const reciprocalScene = view.dynamic.getObjectByName('reciprocal-space-root');
  canvas.dataset.reciprocalScale = reciprocalScene ? String(reciprocalScene.scale.x) : '0';
  canvas.dataset.symmetryAction = playSymmetry ? state.symmetry : '';

  const frameKey = [state.mode, lattice.id || state.structure || state.bravais, state.spaceView, state.globalRepeat].join('|');
  const fitBox = new THREE.Box3();
  if (directVisible(state)) frameBox(direct, 1, fitBox);
  if (reciprocalVisible(state)) frameBox(reciprocal, reciprocalDisplayScale(state, lattice), fitBox);
  view.frame(frameKey, state.spaceView, { box: fitBox });
  resetTransientAnimation();
}
