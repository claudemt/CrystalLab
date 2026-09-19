# CrystalLab design system

CrystalLab 的界面目标是 **scientific workstation**：高信息密度、低装饰、物理对象优先。

## Layout

- 顶部是全局工具栏；
- 左侧 inspector 只放对象、几何和对称的上下文控制；
- 中央 3D stage 是唯一主视觉；
- 右侧 theory 是可关闭的参考抽屉；
- catalog 是独立工作区，而不是叠在 3D 视图上的 modal。

所有区域通过连续网格和分隔线组织，不使用互相嵌套的 card mosaic。

## Components

全站只保留少量公共控件：

- `segmented / segment`：互斥选择；
- `icon-button`：全局工具；
- `field`：select / number 输入；
- `toggle-row`：布尔图层；
- `text-button`：明确动作；
- `layer-button`：空间对象显隐。

同一种交互不得为 catalog、theory 或 inspector 各写一套视觉实现。

## Color

UI chrome 基本中性。颜色只表达物理语义：

- direct space：冷灰蓝；
- reciprocal space：矿物黄；
- symmetry / Miller action：低饱和红；
- x/y/z axis：固定三色，仅用于坐标方向。

禁止无语义渐变、玻璃拟态、霓虹 glow、彩色卡片和装饰性阴影。

## Motion

动画只表达状态变化。点群操作遵循“一次 action，一个有限几何变换”：

- 开启或切换对称操作时播放一次；
- “作用一次”只重放当前操作；
- 不循环；
- 播放前关闭相机自动旋转；
- 群轨道不做第二套动画。

## Mathematics

数学模式由句法功能决定：

- 符号、短关系、单句定义使用 inline math；
- 矩阵、多步推导和确实需要独立结构的公式使用 display math；
- 定义页和 catalog 原则上没有 display math；
- inline MathJax 不单独换行；
- display math 超宽时只在公式容器内横向滚动。

## 3D scale

所有点径、箭头、标签与线条首先相对当前 cell characteristic length 定义。overlay 只缩放 reciprocal root；禁止对子元素使用 `1/scale` 补偿。

单位按**空间视图**取，不按坐标系取：实空间一律 `directUnit = characteristicLength(lattice.primitive)`，倒空间一律 `reciprocalUnit`。惯用胞棱与原胞棱因此厚度相同——按坐标系细分反而会让 fcc 的惯用胞棱比原胞棱粗 41%。

### 只有一套画线体系

`LineBasicMaterial.linewidth` 在 Windows/ANGLE 上恒被忽略（永远 1px），所以场景里不允许出现它。所有线——晶胞棱、Miller 晶面轮廓、k 路径、对称轴与对称路径、配位键、箭杆——一律走 `makeSegments` 的圆柱实例化，粗细由 `src/app/constants.js` 的 `LINE_WEIGHTS` 一张表给出：

| 权重 | 倍数 | 用在哪 |
|---|---|---|
| `cell` | 1.0 | 原胞 / 惯用胞 / 倒格胞 / W–S / 第一 BZ |
| `plane` | 0.7 | Miller 晶面轮廓 |
| `path` | 0.6 | k 路径、对称操作路径 |
| `axis` | 0.6 | 坐标轴 / 基矢 / G 向量杆 |
| `bond` | 0.7 | 配位键 |

调用点必须**显式**传半径：`makeSegments(points, color, { radius })` 里的 `radius` 没有可用缺省——不传就按平均段长取比例，漏传不会报错，只会得到一个看着有粗细、实际与长度相关的值。`tests/verify-ui.mjs` 逐个调用点断言选项对象里带了 `radius`。

`makeSegments` 吃的是**点对**，不是折线；闭合多边形（如晶面轮廓）必须自己首尾相接。

### 场景颜色的唯一来源是 `COLORS`

`src/app/constants.js` 的 `COLORS` 是 3D 颜色的唯一定义处，`src/styles/tokens.css` 的语义 token 与它同值（供 DOM 图例色块使用），`tests/verify-ui.mjs` 断言两张表相等。同一色系内按明度分级区分同类对象，不引入新色相：实空间由浅到深是惯用胞 → 原胞 → W–S，倒空间是倒格惯用胞 → 第一 BZ；相邻两级的 RGB 距离有下限，靠肉眼「看着像同色」是不允许的。
