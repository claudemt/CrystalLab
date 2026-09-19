# Crystal Space Lab：晶体学与群论速查

## 1. 32 个三维晶体学点群

| 晶系 | Hermann–Mauguin | Schoenflies |
|---|---|---|
| 三斜 | `1`, `-1` | `C1`, `Ci` |
| 单斜 | `2`, `m`, `2/m` | `C2`, `Cs`, `C2h` |
| 正交 | `222`, `mm2`, `mmm` | `D2`, `C2v`, `D2h` |
| 四方 | `4`, `-4`, `4/m`, `422`, `4mm`, `-42m`, `4/mmm` | `C4`, `S4`, `C4h`, `D4`, `C4v`, `D2d`, `D4h` |
| 三方 | `3`, `-3`, `32`, `3m`, `-3m` | `C3`, `S6 (C3i)`, `D3`, `C3v`, `D3d` |
| 六方 | `6`, `-6`, `6/m`, `622`, `6mm`, `-6m2`, `6/mmm` | `C6`, `C3h`, `C6h`, `D6`, `C6v`, `D3h`, `D6h` |
| 立方 | `23`, `m-3`, `432`, `-43m`, `m-3m` | `T`, `Th`, `O`, `Td`, `Oh` |

晶体学限制只允许 `1,2,3,4,6` 重旋转与三维周期平移共存。

## 2. 14 种 Bravais lattices

- triclinic：P
- monoclinic：P, C
- orthorhombic：P, C, I, F
- tetragonal：P, I
- trigonal：R
- hexagonal：P
- cubic：P, I, F

中心化惯用胞与原胞体积关系：

- P：`Vconv/Vprim = 1`
- C：`2`
- I：`2`
- F：`4`
- R：取 rhombohedral primitive axes 时为 `1`

## 3. 网页内置常见结构

| 结构 | Bravais lattice | point group | space group | No. | 配位 |
|---|---|---|---|---:|---:|
| simple cubic | cubic P | `m-3m / Oh` | `Pm-3m` | 221 | 6 |
| BCC | cubic I | `m-3m / Oh` | `Im-3m` | 229 | 8 |
| FCC | cubic F | `m-3m / Oh` | `Fm-3m` | 225 | 12 |
| diamond | cubic F + 2-point basis | `m-3m / Oh` | `Fd-3m` | 227 | 4 |
| NaCl / rock salt | cubic F + Na/Cl basis | `m-3m / Oh` | `Fm-3m` | 225 | 6:6 |
| CsCl | cubic P + Cs/Cl basis | `m-3m / Oh` | `Pm-3m` | 221 | 8:8 |
| HCP | hexagonal P + 2-point basis | `6/mmm / D6h` | `P6_3/mmc` | 194 | 12 |
| zinc blende | cubic F + AB basis | `-43m / Td` | `F-43m` | 216 | 4:4 |

注意：空间群是“具体晶体结构”的属性，而不是仅由 Bravais lattice 唯一决定。

## 4. 常见几何关系

### SC

- `Ncoord = 6`
- `d_nn = a`
- touching hard sphere：`r=a/2`
- `APF = π/6 ≈ 0.524`

### BCC

- `Ncoord = 8`
- 最近邻沿 `⟨111⟩`
- `d_nn = √3 a/2`
- `r=√3 a/4`
- `APF=√3π/8≈0.680`

### FCC

- `Ncoord = 12`
- 密排面 `{111}`
- 密排方向 `⟨110⟩`
- `d_nn=a/√2`
- `r=a/(2√2)`
- `APF=π/(3√2)≈0.740`

### diamond

- tetrahedral coordination `4`
- nearest-neighbor direction `⟨111⟩`
- `d_nn=√3 a/4`
- 8 atoms per conventional cubic cell

### CsCl

- `8:8` coordination
- unlike nearest-neighbor separation `√3 a/2`
- looks like BCC geometrically, but Bravais lattice is simple cubic because corner and body-center species differ

### NaCl

- `6:6` octahedral coordination
- unlike nearest-neighbor separation `a/2`
- two interpenetrating FCC sublattices

### ideal HCP

- `Ncoord=12`
- `c/a=√(8/3)≈1.633`
- packing fraction equals FCC close packing, `≈0.740`
- stacking `ABAB…`; FCC close packing is `ABCABC…`

## 5. Hermann–Mauguin 与 Schoenflies

- crystallography/space-group tables 更常用 Hermann–Mauguin；
- 分子群论、量子力学与谱项讨论常用 Schoenflies；
- 同一个 point group 可以有两套名字，例如 `m-3m ↔ Oh`, `-43m ↔ Td`, `6/mmm ↔ D6h`。

## 6. 空间群操作

Seitz 形式：

`{W|t}: r' = W r + t`。

常见类型：

- pure rotation / mirror / inversion：`t=0`
- screw axis：rotation + fractional translation along axis
- glide plane：mirror + fractional translation in plane

例如 HCP 的 `P6_3/mmc` 中，`6_3` 表示六重 screw axis：旋转 `60°` 后再沿 `c` 方向平移 `c/2`。

## 7. Wyckoff positions

同一 space group 中，原子位置按轨道分成 Wyckoff positions。每个位置具有：

- multiplicity
- Wyckoff letter
- site symmetry
- fractional coordinates / free parameters

这部分不适合在基础 3D 页面里完整列出；需要具体材料时应查 International Tables 或 Bilbao Crystallographic Server。

## 8. 推荐教材与资料

适合作为本网页的理论配套：

- C. Kittel, *Introduction to Solid State Physics*
- N. W. Ashcroft & N. D. Mermin, *Solid State Physics*
- M. Tinkham, *Group Theory and Quantum Mechanics*
- M. S. Dresselhaus, G. Dresselhaus, A. Jorio, *Group Theory: Application to the Physics of Condensed Matter*
- International Tables for Crystallography, Vol. A: *Space-group symmetry*

在线查表：

- Bilbao Crystallographic Server: https://www.cryst.ehu.es/
- SeeK-path: https://www.materialscloud.org/work/tools/seekpath
- Materials Cloud: https://www.materialscloud.org/

## 9. 学习顺序

建议不要直接背 230 个空间群。先固定以下主线：

1. `lattice + basis`
2. primitive/conventional cell
3. metric tensor 与 7 晶系
4. 14 Bravais lattices
5. reciprocal lattice
6. Miller planes / directions
7. point group matrices
8. `space group = point operation + fractional translation`
9. Wyckoff positions 与 structure factor
10. Brillouin zone / k-space symmetry

## 10. 常用点操作的矩阵

在笛卡尔正交基中，网页采用以下代表矩阵。它们都满足 `W^T W = I`。

### 镜面与反演

\[
m_{xy}=\begin{pmatrix}1&0&0\\0&1&0\\0&0&-1\end{pmatrix},\qquad
m_{xz}=\begin{pmatrix}1&0&0\\0&-1&0\\0&0&1\end{pmatrix},
\]

\[
i=-I=\begin{pmatrix}-1&0&0\\0&-1&0\\0&0&-1\end{pmatrix}.
\]

### 绕主轴旋转

\[
C_{4z}=\begin{pmatrix}0&-1&0\\1&0&0\\0&0&1\end{pmatrix},
\]

\[
C_{6z}=\begin{pmatrix}
\tfrac12&-\tfrac{\sqrt3}{2}&0\\
\tfrac{\sqrt3}{2}&\tfrac12&0\\
0&0&1
\end{pmatrix}.
\]

立方晶系的一条三重轴 `[111]` 可取

\[
C_{3,[111]}=\begin{pmatrix}
0&0&1\\1&0&0\\0&1&0
\end{pmatrix},
\]

它把 `(x,y,z)` 循环置换为 `(z,x,y)`，并保持 `[111]` 不变。

矩阵是否为某个具体 Bravais 点阵的对称操作，不能只看 `W^T W=I`；还必须检查

\[
M=A^{-1}WA\in GL(3,\mathbb Z).
\]

网页“镜面与点群”模块实时计算这一判据。

## 11. 常用晶面的代数公式

一般晶格中，若 Miller 指数列向量记作

\[
\mathbf m=(h,k,l)^T,
\]

则

\[
\frac{1}{d_{hkl}^{2}}=\mathbf m^T g^{-1}\mathbf m,
\]

其中 `g=A^T A` 是惯用胞度量张量。这是各晶系面间距公式的统一母式。

### 立方晶系

\[
d_{hkl}=\frac{a}{\sqrt{h^2+k^2+l^2}}.
\]

所以

\[
d_{100}=a,\qquad
d_{110}=\frac{a}{\sqrt2},\qquad
d_{111}=\frac{a}{\sqrt3}.
\]

### 四方晶系

\[
\frac{1}{d_{hkl}^{2}}
=\frac{h^2+k^2}{a^2}+\frac{l^2}{c^2}.
\]

### 正交晶系

\[
\frac{1}{d_{hkl}^{2}}
=\frac{h^2}{a^2}+\frac{k^2}{b^2}+\frac{l^2}{c^2}.
\]

### 六方晶系（三指数形式）

\[
\frac{1}{d_{hkl}^{2}}
=\frac{4}{3}\frac{h^2+hk+k^2}{a^2}+\frac{l^2}{c^2}.
\]

常见六方晶面：basal `{0001}`、prismatic `{10-10}`、pyramidal `{10-11}`；常见 `a` 方向族为 `⟨11-20⟩`。

## 12. 常见结构因子与系统消光

衍射振幅的基本量为

\[
F_{hkl}=\sum_{\alpha}f_{\alpha}
\exp\!\left[2\pi i(hx_\alpha+ky_\alpha+lz_\alpha)\right].
\]

这里 `(x_α,y_α,z_α)` 是惯用胞分数坐标。下列式子能把“图里的额外格点/基元”直接变成选择定则。

### BCC

把惯用胞看作角点与 `(1/2,1/2,1/2)`：

\[
F_{hkl}=f\left[1+(-1)^{h+k+l}\right].
\]

因此只有 `h+k+l` 为偶数时非零。

### FCC

惯用胞的四个平移点给出

\[
F_{hkl}=f\left[1+(-1)^{k+l}+(-1)^{h+l}+(-1)^{h+k}\right].
\]

只有 `h,k,l` 全奇或全偶时非零。

### Diamond

diamond = FCC centering × 两点 basis `{0,(1/4,1/4,1/4)}`，因此

\[
F_{hkl}=F^{\mathrm{FCC}}_{hkl}
\left[1+e^{i\pi(h+k+l)/2}\right].
\]

在满足 FCC 条件后：

- 全奇反射一般允许；
- 全偶时还要求 `h+k+l=4n`；
- 例如 `(222)` 因 basis 干涉而消光，而 `(220)`、`(400)` 允许。

### CsCl

若 Cs 在 `(0,0,0)`、Cl 在 `(1/2,1/2,1/2)`，则

\[
F_{hkl}=f_{\mathrm{Cs}}+(-1)^{h+k+l}f_{\mathrm{Cl}}.
\]

因此奇偶两类反射的强度不同，但当两种原子的散射因子不同，不存在 BCC 那种纯平移导致的系统消光。这也是“CsCl 不是 BCC Bravais lattice”的衍射版本。

### NaCl

采用 FCC Bravais lattice，并令 Cl 在 `0`、Na 相对位移 `(1/2,0,0)`：

\[
F_{hkl}=F^{\mathrm{FCC}}_{hkl}
\left[f_{\mathrm{Cl}}+(-1)^h f_{\mathrm{Na}}\right].
\]

满足 FCC 条件后，全偶反射含 `f_Cl+f_Na`，全奇反射含 `f_Cl-f_Na`。

### Zinc blende

与 diamond 具有相同几何位移，但两种原子不同：

\[
F_{hkl}=F^{\mathrm{FCC}}_{hkl}
\left[f_A+f_Be^{i\pi(h+k+l)/2}\right].
\]

因此 diamond 中由相同原子完全相消的某些峰，在 zinc blende 中一般不会完全消失。

> 对 nonsymmorphic space group（如 `P6_3/mmc`）的完整 reflection conditions，还需要把 screw/glide 的空间群约束一起纳入。需要具体材料时应以 International Tables 或 Bilbao 的 reflection conditions 为准。
