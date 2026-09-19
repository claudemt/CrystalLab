import * as THREE from 'three';
import { BRAVAIS, STRUCTURES, basisOffsetCartesian, RECIPROCAL_CENTERING, conventionalFromPrimitive, centeringSites } from './lattices.js';
import { applyMatrix, latticePointGroup } from './symmetry.js';
import { reciprocalVectors, toV3, fromV3, wignerSeitzData, voronoiCell, structureAtoms, coordinationShell } from './geometry.js';

// overlay 里倒空间相对实空间的目标视觉比例 ρ。只有一个消费者（下面的 reciprocalDisplayScale），
// 所以它属于 core 自己而不是 app/constants.js ——否则 core 就要反向依赖 app 层（见 docs/architecture.md）。
const OVERLAY_RECIP_RATIO = 0.96;

const wsCache = new Map();
const structureWsCache = new Map();
const structurePointGroupCache = new Map();

export function fmt(value, digits = 3) {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) < 1e-10) return '0';
  return Number(value).toFixed(digits).replace(/\.0+$|(?<=\.[0-9]*?)0+$/, '');
}

export function currentLattice(state) {
  return state.mode === 'structure' ? BRAVAIS[STRUCTURES[state.structure].bravais] : BRAVAIS[state.bravais];
}

export function directVisible(state) {
  return state.spaceView !== 'reciprocal';
}

export function reciprocalVisible(state) {
  return state.spaceView !== 'direct';
}

export function characteristicLength(vectors) {
  const lengths = vectors.map(v => toV3(v).length());
  return Math.sqrt(lengths.reduce((sum, x) => sum + x * x, 0) / Math.max(1, lengths.length));
}

export function reciprocalDisplayScale(state, lattice = currentLattice(state)) {
  if (state.spaceView !== 'overlay') return 1;
  const directUnit = characteristicLength(lattice.primitive);
  const reciprocalUnit = characteristicLength(reciprocalVectors(lattice.primitive));
  return reciprocalUnit > 1e-10 ? OVERLAY_RECIP_RATIO * directUnit / reciprocalUnit : 1;
}

export function reciprocalSceneActive(state) {
  return reciprocalVisible(state) && (
    state.showReference || state.showBZ || state.showKPath || state.showMiller ||
    state.showReciprocalPrimitiveCell || state.showReciprocalConventionalCell || state.showSymmetry
  );
}

export function basisCell(lattice) {
  return lattice.conventional;
}

// 倒点阵的惯用胞。不能拿正空间惯用胞直接做 2πC^{-T}：对中心化点阵那给的既不是倒格点阵的
// 周期，也丢掉了中心化——FCC 会得到棱长 2π 的空立方体，而真正的倒格惯用胞是棱长 4π 的
// 体心立方（BCC）。正确做法是先取倒格原胞 b_i=2πA^{-T}，再按倒点阵的中心化类型还原成惯用胞。
export function reciprocalConventionalCell(lattice) {
  const centering = RECIPROCAL_CENTERING[lattice.centering] || 'P';
  const vectors = conventionalFromPrimitive(reciprocalVectors(lattice.primitive).map(fromV3), centering);
  return { centering, vectors, sites: centeringSites(centering) };
}

export function repeatRange(state) {
  return state.globalRepeat ? 3 : 2;
}

export function vecLatex(values, digits = 3) {
  return `\\begin{bmatrix}${values.map(x => fmt(x, digits)).join('\\\\')}\\end{bmatrix}`;
}

export function matrixLatex(matrix, digits = 3) {
  return `\\begin{bmatrix}${matrix.map(row => row.map(x => fmt(x, digits)).join('&')).join('\\\\')}\\end{bmatrix}`;
}

// 列向量约定：A = [a1 a2 a3]，第 j 列是第 j 个基矢。走 toV3 而不是直接下标取分量，
// 因为调用方两种都存在——lattice.primitive 是 [[x,y,z],…]，而 reciprocalVectors() 返回
// Vector3[]。直接写 vectors[j][i] 在 Vector3 上会静默取到 undefined，矩阵渲染成一片空白。
export function basisMatrix(vectors) {
  const [a, b, c] = vectors.map(toV3);
  return [
    [a.x, b.x, c.x],
    [a.y, b.y, c.y],
    [a.z, b.z, c.z]
  ];
}

export function multiply3(A, B) {
  return A.map(row => B[0].map((_, j) => row.reduce((sum, x, k) => sum + x * B[k][j], 0)));
}

export function det3(A) {
  return A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1])
    - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0])
    + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
}

export function inv3(A) {
  const d = det3(A);
  if (Math.abs(d) < 1e-12) return null;
  return [
    [A[1][1] * A[2][2] - A[1][2] * A[2][1], A[0][2] * A[2][1] - A[0][1] * A[2][2], A[0][1] * A[1][2] - A[0][2] * A[1][1]],
    [A[1][2] * A[2][0] - A[1][0] * A[2][2], A[0][0] * A[2][2] - A[0][2] * A[2][0], A[0][2] * A[1][0] - A[0][0] * A[1][2]],
    [A[1][0] * A[2][1] - A[1][1] * A[2][0], A[0][1] * A[2][0] - A[0][0] * A[2][1], A[0][0] * A[1][1] - A[0][1] * A[1][0]]
  ].map(row => row.map(x => x / d));
}

export function latticeSymmetryIntegerMatrix(lattice, W) {
  const A = basisMatrix(lattice.primitive);
  const inverse = inv3(A);
  if (!inverse) return { ok: false, M: null };
  const M = multiply3(multiply3(inverse, W), A);
  const ok = Math.abs(Math.abs(det3(M)) - 1) < 1e-6
    && M.every(row => row.every(x => Math.abs(x - Math.round(x)) < 2e-6));
  return { ok, M };
}

export function structureSymmetryWitness(lattice, structure, W, tolerance = 2e-6) {
  if (!latticeSymmetryIntegerMatrix(lattice, W).ok) return { ok: false, t: null };
  const A = basisMatrix(lattice.primitive);
  const inverse = inv3(A);
  if (!inverse) return { ok: false, t: null };
  const sites = structure.basis.map(site => ({ label: site.label, p: toV3(basisOffsetCartesian(structure, site)) }));
  if (!sites.length) return { ok: true, t: new THREE.Vector3() };
  const p0 = sites[0];
  const Wp0 = toV3(applyMatrix(W, p0.p.toArray()));
  for (const target of sites.filter(site => site.label === p0.label)) {
    const translation = target.p.clone().sub(Wp0);
    const ok = sites.every(site => {
      const mapped = toV3(applyMatrix(W, site.p.toArray())).add(translation);
      return sites.some(candidate => {
        if (candidate.label !== site.label) return false;
        const frac = applyMatrix(inverse, mapped.clone().sub(candidate.p).toArray());
        return frac.every(x => Math.abs(x - Math.round(x)) < tolerance);
      });
    });
    if (ok) return { ok: true, t: translation };
  }
  return { ok: false, t: null };
}

export function structurePointGroup(lattice, structureId) {
  const key = `${structureId}|${lattice.id}`;
  if (structurePointGroupCache.has(key)) return structurePointGroupCache.get(key);
  const structure = STRUCTURES[structureId];
  const base = latticePointGroup(lattice.primitive);
  const operations = base.operations.filter(op => structureSymmetryWitness(lattice, structure, op.W).ok);
  const result = {
    operations,
    order: operations.length,
    proper: operations.filter(op => op.det > 0).length,
    improper: operations.filter(op => op.det < 0).length
  };
  structurePointGroupCache.set(key, result);
  return result;
}

export function currentPointGroup(state, lattice = currentLattice(state)) {
  return state.mode === 'structure'
    ? structurePointGroup(lattice, state.structure)
    : latticePointGroup(lattice.primitive);
}

export function namedSymmetryValid(state, lattice, op) {
  return latticeSymmetryIntegerMatrix(lattice, op.matrix).ok
    && (state.mode !== 'structure' || structureSymmetryWitness(lattice, STRUCTURES[state.structure], op.matrix).ok);
}

export function fracToCartesian(vectors, fractions, centered = false) {
  const [a, b, c] = vectors.map(toV3);
  const r = a.clone().multiplyScalar(fractions[0]).addScaledVector(b, fractions[1]).addScaledVector(c, fractions[2]);
  if (centered) r.sub(a.clone().add(b).add(c).multiplyScalar(0.5));
  return r;
}

export function millerFamilyData(state, lattice, h, k, l) {
  if (h === 0 && k === 0 && l === 0) return { normals: [], signedCount: 0 };
  const [b1, b2, b3] = reciprocalVectors(basisCell(lattice));
  const G = b1.clone().multiplyScalar(h).addScaledVector(b2, k).addScaledVector(b3, l);
  const normals = [];
  for (const op of currentPointGroup(state, lattice).operations) {
    const n = toV3(applyMatrix(op.W, G.toArray())).normalize();
    const first = [n.x, n.y, n.z].find(x => Math.abs(x) > 1e-8) ?? 1;
    if (first < 0) n.multiplyScalar(-1);
    if (!normals.some(q => Math.abs(q.dot(n)) > 1 - 1e-7)) normals.push(n);
  }
  return { normals, signedCount: normals.length * 2 };
}

export function wignerSeitzCached(vectors) {
  const v3 = vectors.map(toV3);
  const key = JSON.stringify(v3.map(v => v.toArray().map(x => +x.toFixed(8))));
  if (!wsCache.has(key)) wsCache.set(key, wignerSeitzData(v3, 3));
  return wsCache.get(key);
}

// 含基元结构的广义 W–S 胞：喂进去的是相对中心原子的真实原子位移，不是 Bravais 格点。
// 金刚石得到三棱锥化截角四面体（16 面 16 顶点：4 个六边形面来自 √3a/4 的 4 个最近邻，
// 12 个三角形面来自 a/√2 的次近邻），与 FCC 点阵的菱形十二面体（12 面 14 顶点）是两回事——
// 「W–S 是点阵的性质」只对单原子 Bravais 晶体成立。NaCl 更直白：点阵胞是菱形十二面体，
// 而实际原子的胞是棱长 a/2 的立方体（6 个 a/2 处的异种近邻）。
export function structureWignerSeitzCached(lattice, structure) {
  const key = `${lattice.id}|${structure.short}|${structure.basis.length}`;
  if (!structureWsCache.has(key)) {
    // 邻域范围与显示用的 repeatRange 无关：胞只由近邻决定，取足够远的一份缓存起来。
    const atoms = structureAtoms(lattice, structure, basisOffsetCartesian, 3);
    const shell = coordinationShell(atoms, structure.basis[0].label);
    const center = shell ? shell.center : atoms.reduce((best, a) => a.position.lengthSq() < best.position.lengthSq() ? a : best, atoms[0]);
    const relative = atoms.map(a => a.position.clone().sub(center.position));
    structureWsCache.set(key, { ...voronoiCell(relative, 54), center: center.position.clone() });
  }
  return structureWsCache.get(key);
}

// 当前对象的 W–S 胞：结构模式按真实原子算，Bravais 模式按点阵算。
export function currentWignerSeitz(state, lattice = currentLattice(state)) {
  if (state.mode !== 'structure') return wignerSeitzCached(lattice.primitive);
  return structureWignerSeitzCached(lattice, STRUCTURES[state.structure]);
}

export function reflectionAllowed(lattice, h, k, l) {
  if (lattice.centering === 'I') return (h + k + l) % 2 === 0;
  if (lattice.centering === 'F') return Math.abs(h) % 2 === Math.abs(k) % 2 && Math.abs(k) % 2 === Math.abs(l) % 2;
  if (lattice.centering === 'C') return (h + k) % 2 === 0;
  return true;
}
