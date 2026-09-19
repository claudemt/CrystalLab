// 三种胞在同一色系内按明度分级，否则画面里分不出谁是谁：实空间由浅到深是
// 惯用胞 → 原胞(a2) → W–S，倒空间是倒格惯用胞(b1) → 第一 BZ。
// 每一级都要肉眼可辨，所以下面 ws / bz 的取值是刻意拉开的，不是随手调的。
export const COLORS = Object.freeze({
  a1: 0xc2d0d8,
  a2: 0xa4b8c2,
  a3: 0x88a0ac,
  b1: 0xc8ad73,
  b2: 0xb88f59,
  b3: 0x9f7448,
  site: 0xd2dade,
  conventional: 0xc3c9cb,
  ws: 0x7fa9b8,
  bz: 0xe0b84a,
  g: 0xc96b7d,
  symmetry: 0xc96b7d
});

// 线宽表。场景里只有一套画线体系：所有线都走 makeSegments 的圆柱实例化。
// LineBasicMaterial.linewidth 在 Windows/ANGLE 上恒被忽略（永远 1px），拿它画出来的
// 晶面轮廓、k 路径、配位键会比柱状的晶胞棱细一个量级，两套体系并存正是「粗细不统一」的来源。
// 权重一律相对**当前空间视图**的 characteristic length（docs/design-system.md「3D scale」）：
// 实空间乘 directUnit，倒空间乘 reciprocalUnit。实空间只用这一个单位——惯用胞棱与原胞棱
// 因此厚度相同，这正是「统一」要的效果；若按坐标系细分，fcc 的惯用胞棱会比原胞棱粗 41%。
const CELL_LINE = 0.016;

export const LINE_WEIGHTS = Object.freeze({
  cell: CELL_LINE,          // 晶胞棱：原胞 / 惯用胞 / 倒格胞 / W–S / BZ
  plane: CELL_LINE * 0.7,   // Miller 晶面轮廓
  path: CELL_LINE * 0.6,    // k 路径、对称操作路径
  axis: CELL_LINE * 0.6,    // 坐标轴 / 基矢 / G 向量杆
  bond: CELL_LINE * 0.7     // 配位键
});

export const AXIS_COLORS = Object.freeze([0xb96f5b, 0x7f9977, 0x6d8aa0]);
export const SPACE_VIEWS = Object.freeze(['direct', 'reciprocal', 'overlay']);
