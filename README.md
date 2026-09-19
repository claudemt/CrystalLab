<p align="center">
  <img src="https://img.shields.io/badge/Web-三维科研工作台-0078D4" alt="Web">
  <img src="https://img.shields.io/badge/Three.js-r180-2b2b2b" alt="Three.js">
  <img src="https://img.shields.io/badge/%E4%BE%9D%E8%B5%96-0-2ea44f" alt="Zero dependencies">
</p>

<h1 align="center">🔬 CrystalLab</h1>
<p align="center"><b>把晶体学的一整套数学约定，做成转得起来的三维工作台</b></p>

---

**在线使用**：<https://claudemt.github.io/CrystalLab/>

## 它做什么

**1. 一套约定，贯通全站**

晶体学最难的地方往往不是算不出来，而是同一个符号在不同章节指不同的东西。CrystalLab 全站只认一套：向量一律是列向量，原始基矩阵 $A=[\mathbf a_1\;\mathbf a_2\;\mathbf a_3]$，直接格 $L=A\mathbb Z^3$，位置与分数坐标满足 $\mathbf r=A\mathbf x$，度量 $g=A^TA$。

倒格固定取含 $2\pi$ 的物理学约定：$L^*=\{\mathbf G:e^{i\mathbf G\cdot\mathbf R}=1,\ \forall\mathbf R\in L\}$，于是 $B=2\pi A^{-T}$ 且 $A^TB=2\pi I$。Miller 指数相对惯用胞分数坐标定义，**中心化点阵的选择定则**与**真实倒格成员资格**是两件事，这里始终分开讲——它们最常被混为一谈。

**2. 两个空间，以及把它们摆在一起看**

实空间与倒空间可以单独显示，也可以对照：对照模式下倒空间按当前点阵自适应归一化，两种结构在同一屏里保持可比。原胞、惯用胞、Wigner–Seitz 原胞与第一 Brillouin 区都能同屏叠加，方便看清 $L$ 与 $L^*$ 的对应关系。

**3. 从 Miller 面到 k 路径**

给定 $(hkl)$ 或 $(hkil)$，可以看到面族、法向 $\mathbf g_{hkl}$ 与中心化选择定则的实际后果；转到倒空间则是等高对称点的标准路径与各点的 little group。对称部分覆盖 32 个晶体学点群与 230 个空间群类型，群作用可以直接播一遍看。

**4. 定义与推导就在手边**

每个视图旁边都有可展开的定义 / 推导抽屉。推导不是结论的复述，而是把关键恒等式按**残差**给出并带上数值：例如倒格那一节会印出当前 $B$ 矩阵、三个基矢长度、倒胞体积 $|{\det}B|=\sqrt{\det g^*}$ 与闭式 $(2\pi)^3/V_p$ 的对照，以及 $A^TB-2\pi I$ 与 $g^*-(2\pi)^2g^{-1}$ 两个零矩阵——可以当场核对，不必信我。

## 运行

要求 Node.js 20.19+ 或 22.12+。Three.js 与 MathJax 运行时已随项目保留许可证一同分发，**不依赖 npm registry**，也没有任何 `dependencies`。

```bash
npm ci
npm run dev
```

默认地址为 `http://127.0.0.1:5173/`。生产构建、预览与完整校验：

```bash
npm run build      # 产出 dist/
npm run preview    # 以 dist/ 起本地服务
npm run check      # 测试 + 构建
```

`npm run test:browser` 会用本机 Chrome / Edge 真跑一遍界面（无头模式，走 CDP），覆盖视图切换、图层、对称、索引器与理论抽屉。

## 架构

```text
src/
├─ app/       # 单一状态源、图层注册表、视觉常量
├─ core/      # 晶格、几何、群论、k-path 与公共数学模型
├─ scene/     # Three.js viewport 与场景渲染
├─ ui/        # inspector、索引器、理论抽屉、MathJax
├─ styles/    # 全站 token 与统一工作台样式
└─ main.js    # 应用编排与 action wiring
```

依赖只向下：`main → scene/ + ui/ → core/`。`core/` 是叶子——它算晶体学，不知道有 DOM，也不知道有 scene graph。所有图层入口共享 `src/app/state.js` 里的单一注册表，图层栏、理论跳转与 inspector 不各自维护状态映射；所有控件只声明 `data-action`，由一处委派分发。

## 文档

- [`docs/architecture.md`](docs/architecture.md)：模块边界、依赖方向、交互入口与 scene 生命周期
- [`docs/design-system.md`](docs/design-system.md)：科研工作台视觉、动画和数学排版规范
- [`docs/unified-crystallography-language.md`](docs/unified-crystallography-language.md)：基矩阵、倒格与 Seitz 表示
- [`docs/vector-derivations.md`](docs/vector-derivations.md)：直接格、倒格、W–S 与 Miller 推导
- [`docs/brillouin-kpath.md`](docs/brillouin-kpath.md)：第一 BZ、高对称点与标准 k 路径
- [`docs/crystallography-reference.md`](docs/crystallography-reference.md)：晶体学与群论速查
- [`docs/reference/space-groups-230.md`](docs/reference/space-groups-230.md)：230 个空间群类型表

## License

CrystalLab 自有代码采用 [MIT License](LICENSE)。第三方运行时与数据来源见 [`docs/THIRD-PARTY-NOTICES.md`](docs/THIRD-PARTY-NOTICES.md)。

---

<p align="center">
  <b>如果这个项目对你有帮助，欢迎 ⭐ Star ⭐ 让更多人看到</b>
</p>
