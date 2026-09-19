# 开源组件与数据来源

本项目自己的代码以 [MIT](../LICENSE) 发布。它同时使用或参考了下列项目与数据，各自的许可与版权归原作者所有。
其中 SeeK-path 的 MIT 声明**必须随分发保留**，因此本文件是发布产物的一部分，而不是可选的致谢名单。

## 运行时依赖

### Three.js

- https://github.com/mrdoob/three.js — MIT License
- 直接使用其 WebGL renderer、`OrbitControls`、`ConvexGeometry` 与 `ConvexHull`。运行所需模块取自 `three@0.180.0`，随项目放在 `public/vendor/three/`，不依赖 npm registry。许可证副本见 `public/vendor/three/LICENSE`。

### MathJax

- https://github.com/mathjax/MathJax — Apache License 2.0
- `public/vendor/mathjax/tex-svg.js` 来自 MathJax 3.2.1，用于**本地** SVG 数学排版（不依赖 CDN，离线可用）。
- 许可证副本见 `public/vendor/mathjax/LICENSE`。

## 设计参考

### OpenLyceum / CrystalLattice

- https://github.com/OpenLyceum/CrystalLattice — GNU AGPL-3.0-or-later
- 参考其物理模型与视图分离方式，以及经过测试的 SC/BCC/FCC 基础几何关系；当前代码架构与 3D / W–S / 倒格 / 群论实现均为本项目自己的实现。
- **注意**：本项目**未**移植其源码。若将来直接引入其中较大段 AGPL 代码，需按 AGPL 保留对应版权与许可证要求（本项目的 MIT 发布将与 AGPL 冲突，届时须重新评估）。

### janosh / matterviz

- https://github.com/janosh/matterviz — MIT License
- 参考其把「材料结构 + 倒格 / BZ」组织成同一个可视化工作台的产品思路。

### Materials Cloud

- Brillouin-zone visualizer: https://github.com/materialscloud-org/brillouinzone-visualizer — BSD-3-Clause
- SeeK-path: https://github.com/materialscloud-org/seekpath — MIT
- 参考其第一 Brillouin zone 与高对称 k 空间的成熟表达方式。
- `src/core/kpaths.js` 中的 cP2、cI1、cF2、tP1、oP1、hP2 special-point / path fixtures **直接整理自 SeeK-path 的 HPKOT 数据表**。

SeeK-path MIT notice for this adapted data / code portion:

> Copyright (c), 2016-2023, Giovanni Pizzi, PAUL SCHERRER INSTITUT (Laboratory for Materials Simulations), ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE (Theory and Simulation of Materials (THEOS) and National Centre for Computational Design and Discovery of Novel Materials (NCCR MARVEL)), Switzerland. All rights reserved.
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the conditions of the MIT License.

完整许可证见 SeeK-path 仓库的 `LICENSE.txt`。

### 其它参考实现

- PhysicsLattice: https://github.com/fbuessen/PhysicsLattice — MIT
- lattpy: https://github.com/dylanljones/lattpy — MIT

两者都把 direct lattice、reciprocal lattice、Wigner–Seitz / Brillouin zone 组织成统一的格点几何对象；本项目沿用这一抽象。

## 晶体学数据核对来源

内置的空间群、点群与 Bravais 数据经下列来源核对：

- Bilbao Crystallographic Server: https://www.cryst.ehu.es/
- AFLOW prototype / Strukturbericht databases: https://aflow.org/
- International Tables for Crystallography, Vol. A
- C. Kittel, *Introduction to Solid State Physics*
- N. W. Ashcroft & N. D. Mermin, *Solid State Physics*
- M. Tinkham, *Group Theory and Quantum Mechanics*

内置结构参数主要是**无量纲几何参考值**，不是特定样品的实验晶格常数。
