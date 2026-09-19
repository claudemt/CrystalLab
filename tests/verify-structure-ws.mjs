// 广义 W–S 胞：结构模式下画的必须是「真实原子的 Voronoi 胞」，不是点阵的 W–S 胞。
// 这两者只对单原子 Bravais 晶体一致；一旦有基元就会分开，而分开之后画错很难用肉眼发现
// （都是对称的多面体），所以这里用可证伪的数值来钉住。
import { register } from 'node:module';

// register 必须早于任何 'three' 的解析：静态 import 会在本文件任何语句之前就完成解析，
// 所以这里一律用动态 import —— 挂上 loader 之后再解析裸说明符。
register('./three-loader.mjs', import.meta.url);
const THREE = await import('three');
const { ConvexGeometry } = await import('three/addons/geometries/ConvexGeometry.js');
const { BRAVAIS, STRUCTURES } = await import('../src/core/lattices.js');
const { structureWignerSeitzCached, wignerSeitzCached, structurePointGroup } = await import('../src/core/model.js');
const { applyMatrix } = await import('../src/core/symmetry.js');

let failed = 0;
const check = (name, ok) => { console.log(`${ok ? '✓' : '✗'} ${name}`); if (!ok) failed++; };

// 用 three 自带的凸包实现求体积，而不是复用 src 的 hull 代码——否则是自证。
function hullVolume(vertices) {
  const geometry = new ConvexGeometry(vertices);
  const position = geometry.getAttribute('position');
  let volume = 0;
  for (let i = 0; i < position.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(position, i);
    const b = new THREE.Vector3().fromBufferAttribute(position, i + 1);
    const c = new THREE.Vector3().fromBufferAttribute(position, i + 2);
    volume += a.dot(b.clone().cross(c)) / 6;
  }
  return Math.abs(volume);
}
const cellVolume = lattice => {
  const [a, b, c] = lattice.primitive.map(v => new THREE.Vector3(...v));
  return Math.abs(a.dot(b.clone().cross(c)));
};
const faces = (data) => `${data.activePlanes.length}/${data.vertices.length}`;
// 每个面的边数（顶点落在该面上的个数），用来钉住多面体的具体形状而不只是面数。
// 30 条棱的 16 面体若六边形/三角形的数量记反，面数看不出来，这里能看出来。
function faceSides(data) {
  const sides = {};
  for (const plane of data.activePlanes) {
    const n = data.vertices.filter(v => Math.abs(plane.n.dot(v) - plane.c) < 1e-6).length;
    sides[n] = (sides[n] || 0) + 1;
  }
  return sides;
}

// 1. Voronoi 胞必然铺满空间，所以每一胞的体积严格等于 晶胞体积 / 该胞原子数。
//    这一条同时挡住「面集漏了」和「面集多了」两类错误：两种情况体积都会偏。
for (const [id, structure] of Object.entries(STRUCTURES)) {
  const lattice = BRAVAIS[structure.bravais];
  const data = structureWignerSeitzCached(lattice, structure);
  const actual = hullVolume(data.vertices);
  const expected = cellVolume(lattice) / structure.basis.length;
  const ok = Math.abs(actual - expected) < 1e-4 * expected;
  check(`${structure.name} 结构 W–S 体积 = 晶胞体积/原子数 (${actual.toFixed(6)} vs ${expected.toFixed(6)})`, ok);
}

// 2. 钉住具体面数/顶点数，防止回归时形状悄悄变了。菱形十二面体 (FCC, 12/14)、
//    截角八面体 (BCC, 14/24)、立方体 (SC, 6/8) 是点阵侧的基准。
check('FCC 点阵 W–S 是菱形十二面体 12 面/14 顶点', faces(wignerSeitzCached(BRAVAIS['cubic-F'].primitive)) === '12/14');
check('BCC 点阵 W–S 是截角八面体 14 面/24 顶点', faces(wignerSeitzCached(BRAVAIS['cubic-I'].primitive)) === '14/24');
check('SC 点阵 W–S 是立方体 6 面/8 顶点', faces(wignerSeitzCached(BRAVAIS['cubic-P'].primitive)) === '6/8');

// 3. 结构侧：金刚石 16 面/16 顶点（4 个三角面来自 √3a/4 的 4 个最近邻，12 个面来自
//    a/√2 的次近邻），而不是它点阵的 12/14。
check('金刚石结构 W–S 是 16 面/16 顶点', faces(structureWignerSeitzCached(BRAVAIS['cubic-F'], STRUCTURES.diamond)) === '16/16');
// 关键是面型而不是面数：4 个最近邻（√3a/4）给的是 4 个**六边形**，12 个次近邻（a/√2）给的是
// 12 个**三角形**。这组数字一旦对调（很容易，因为「最近邻→小面」的直觉是反的），
// 面数仍是 16、体积仍然正确，只有这里能发现。
{
  const sides = faceSides(structureWignerSeitzCached(BRAVAIS['cubic-F'], STRUCTURES.diamond));
  check('金刚石结构 W–S 是 4 个六边形面 + 12 个三角形面（三棱锥化截角四面体）',
    sides[6] === 4 && sides[3] === 12 && Object.keys(sides).length === 2);
  // 六边形面必须来自最近邻那一壳层，三角形面来自次近邻壳层。
  const d = structureWignerSeitzCached(BRAVAIS['cubic-F'], STRUCTURES.diamond);
  const hexNorms = d.activePlanes.filter(p => d.vertices.filter(v => Math.abs(p.n.dot(v) - p.c) < 1e-6).length === 6)
    .every(p => Math.abs(p.distance - Math.sqrt(3) / 4) < 1e-6);
  const triNorms = d.activePlanes.filter(p => d.vertices.filter(v => Math.abs(p.n.dot(v) - p.c) < 1e-6).length === 3)
    .every(p => Math.abs(p.distance - Math.SQRT1_2) < 1e-6);
  check('金刚石 W–S 的六边形面来自 √3a/4 最近邻、三角形面来自 a/√2 次近邻', hexNorms && triNorms);
}
// NaCl 最直白：点阵是菱形十二面体，真实原子（6 个 a/2 的异种近邻）围出的是立方体。
check('岩盐结构 W–S 是立方体 6 面/8 顶点', faces(structureWignerSeitzCached(BRAVAIS['cubic-F'], STRUCTURES.nacl)) === '6/8');
check('氯化铯结构 W–S 是截角八面体 14 面/24 顶点', faces(structureWignerSeitzCached(BRAVAIS['cubic-P'], STRUCTURES.cscl)) === '14/24');
check('氯化铯结构 W–S 是 8 个六边形面 + 6 个四边形面（截角八面体）', (() => {
  const s = faceSides(structureWignerSeitzCached(BRAVAIS['cubic-P'], STRUCTURES.cscl));
  return s[6] === 8 && s[4] === 6 && Object.keys(s).length === 2;
})());
check('简单立方结构 W–S 与点阵 W–S 相同（单原子，本就该一致）',
  faces(structureWignerSeitzCached(BRAVAIS['cubic-P'], STRUCTURES.sc)) === faces(wignerSeitzCached(BRAVAIS['cubic-P'].primitive)));
// 结构与点阵确实不同，所以模式切换不是装饰：岩盐 6/8 对 12/14，氯化铯 14/24 对 6/8。
check('岩盐的结构胞与点阵胞确实不同', faces(structureWignerSeitzCached(BRAVAIS['cubic-F'], STRUCTURES.nacl)) !== faces(wignerSeitzCached(BRAVAIS['cubic-F'].primitive)));
check('氯化铯的结构胞与点阵胞确实不同', faces(structureWignerSeitzCached(BRAVAIS['cubic-P'], STRUCTURES.cscl)) !== faces(wignerSeitzCached(BRAVAIS['cubic-P'].primitive)));

// 4. 胞的对称性等于原子处的**位置对称群**，不是晶体点群。金刚石的对称中心在键心 (⅛,⅛,⅛)
//    而不在原子上，所以反演不是胞的对称操作——用晶体点群 Oh (48 阶) 去验会「恰好一半不成立」
//    而误判成 bug。这里用闪锌矿的点群当 Td (24 阶) 的来源：两者原子位置完全相同，
//    但 Zn/S 异种原子把 Oh 降为 Td，正好给出金刚石该有的那个群。
{
  const td = structurePointGroup(BRAVAIS['cubic-F'], 'zincblende');
  const diamond = structureWignerSeitzCached(BRAVAIS['cubic-F'], STRUCTURES.diamond);
  const closed = td.operations.every(op => diamond.vertices.every(v => {
    const mapped = new THREE.Vector3(...applyMatrix(op.W, v.toArray()));
    return diamond.vertices.some(u => u.distanceTo(mapped) < 1e-5);
  }));
  check(`金刚石结构 W–S 在 Td (${td.order} 阶，即原子处的位置对称群) 下闭合`, td.order === 24 && closed);
}

if (failed) { console.error(`\n${failed} structure W–S checks failed.`); process.exit(1); }
console.log('\nstructure W–S checks passed.');
