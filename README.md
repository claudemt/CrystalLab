# CrystalLab

一个可在浏览器中使用的晶体学三维辅助工具。适合对照观察晶格、原子位置、晶胞、倒格子、Miller 晶面与第一 Brillouin 区；数值与推导可以在右侧面板核对。

[在线使用](https://claudemt.github.io/CrystalLab/)

## 从哪里开始

1. 在“对象”中选择金刚石或岩盐。小球是周期重复的真实原子，中心较大的球用于看清局部配位；多原子种类按颜色区分。
2. 在下方图层栏打开原胞、惯用胞和“原子胞”。结构模式的原子胞是选定原子的 Voronoi 区域；切换到 Bravais 模式后，W–S 才表示点阵的 Wigner–Seitz 原胞。
3. 切到倒空间，叠加倒格惯用胞与第一 BZ。FCC 的倒格为 BCC，惯用胞中的体心点可以直接看到。
4. 打开“定义 / 推导”查看当前对象的矩阵、长度、体积和对偶关系。Miller 输入为惯用胞三指数 `(hkl)`；页面不提供四指数 `(hkil)` 输入。

“参考 k 路径”目前只对六种 Bravais 类型提供内置示例：cP、cI、cF、tP、oP、hP。路径表中的分数坐标相对于当前原始倒格基；竖线表示不相连的分支。其他类型会禁用开关，不会猜测高对称点。路径用于理解采样，不替代针对具体晶胞与 setting 的能带计算流程。

## 范围与约定

- 倒格采用含 `2π` 的约定：`B = 2π A⁻ᵀ`。`A` 是原胞列向量矩阵；Miller `(hkl)` 相对于惯用胞矩阵 `C` 定义，法向为 `2π C⁻ᵀ(h,k,l)ᵀ`。中心化条件判断这个法向是否属于真实倒格；额外的基元消光属于结构因子问题。
- 索引页收录 14 个 Bravais 类型、32 个晶体学点群类型和 230 个空间群类型的分类信息，不是完整的群操作、Wyckoff 位置或 setting 数据库。三维对称动画仅提供所列的典型操作，不代表该空间群的完整作用。
- 结构模式展示内置示例结构及其原子位置。它不是从任意 CIF 文件生成结构的通用晶体学计算程序。

## 本地运行

需要 Node.js 20.19+ 或 22.12+。Three.js 和 MathJax 已随项目分发；运行时不需要网络服务。

```bash
npm ci
npm run dev
```

打开 `http://127.0.0.1:5173/`。发布前可运行 `npm run check`（测试并构建到 `dist/`）；`npm run preview` 预览构建结果。`npm run test:browser` 需要本机 Chrome 或 Edge。

## 进一步阅读

- [符号与坐标约定](docs/unified-crystallography-language.md)
- [晶格与倒格推导](docs/vector-derivations.md)
- [Brillouin 区与 k 路径](docs/brillouin-kpath.md)
- [模块和交互结构](docs/architecture.md)
- [视觉设计](docs/design-system.md)
- [第三方许可与数据来源](docs/THIRD-PARTY-NOTICES.md)

自有代码采用 [MIT License](LICENSE)。
