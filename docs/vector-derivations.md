# CrystalLab：定义与矢量推导

本文档与网页中的“定义 / 推导”抽屉采用同一套约定。所有倒格矢均采用含 `2π` 的凝聚态物理约定。

## 1. Bravais lattice 与 basis

把三条原始平移矢量作为列排成矩阵

\[
A=\begin{bmatrix}\mathbf a_1&\mathbf a_2&\mathbf a_3\end{bmatrix}.
\]

任一格点写成

\[
\mathbf R_{\mathbf n}=A\mathbf n
=n_1\mathbf a_1+n_2\mathbf a_2+n_3\mathbf a_3,
\qquad \mathbf n\in\mathbb Z^3.
\]

若每个格点附带 basis \(\{\boldsymbol\tau_\alpha\}\)，全部原子位置为

\[
\mathbf r_{\mathbf n\alpha}=A\mathbf n+\boldsymbol\tau_\alpha.
\]

这里的 basis 是相对于格点的原子位移；若存为分数坐标 \(\mathbf u_\alpha\)，需先换算为笛卡尔位移 \(\boldsymbol\tau_\alpha=A\mathbf u_\alpha\)。

原胞体积

\[
V_p=|\det A|=|\mathbf a_1\cdot(\mathbf a_2\times\mathbf a_3)|.
\]

## 2. 度量张量与晶系

定义

\[
g=A^T A,
\qquad g_{ij}=\mathbf a_i\cdot\mathbf a_j.
\]

它把长度与夹角统一起来。若分数坐标为 \(\mathbf x\)，则

\[
|\mathbf r|^2=\mathbf x^Tg\mathbf x,
\qquad \mathbf r=A\mathbf x.
\]

七晶系可理解为对 \(g\) 的不同约束：

- triclinic：无额外度量约束；
- monoclinic：两夹角为 `90°`；
- orthorhombic：三个夹角全为 `90°`；
- tetragonal：正交且 `a=b≠c`；
- trigonal/rhombohedral：`a=b=c` 且 `α=β=γ≠90°`；
- hexagonal：`a=b≠c, α=β=90°, γ=120°`；
- cubic：`a=b=c, α=β=γ=90°`。

## 3. 倒格子

要求对偶关系

\[
\mathbf a_i\cdot\mathbf b_j=2\pi\delta_{ij}.
\]

矩阵形式最简洁：

\[
B=\begin{bmatrix}\mathbf b_1&\mathbf b_2&\mathbf b_3\end{bmatrix}
=2\pi A^{-T},
\qquad A^TB=2\pi I.
\]

等价地，

\[
\mathbf b_1
=2\pi\frac{\mathbf a_2\times\mathbf a_3}
{\mathbf a_1\cdot(\mathbf a_2\times\mathbf a_3)},
\]

其余两式循环置换。

任一倒格矢

\[
\mathbf G_{\mathbf m}=B\mathbf m,
\qquad \mathbf m\in\mathbb Z^3.
\]

于是

\[
\mathbf G\cdot\mathbf R=2\pi N,
\qquad N\in\mathbb Z,
\]

因此

\[
e^{i\mathbf G\cdot\mathbf R}=1.
\]

倒格原胞体积

\[
V^*=|\det B|=\frac{(2\pi)^3}{V_p}.
\]

若 \(g=A^TA\)，则倒空间度量

\[
g^*=B^TB=(2\pi)^2g^{-1}.
\]

## 4. Wigner–Seitz 原胞

取原点格点与任意非零格点 \(\mathbf R\)。离原点至少不比离 \(\mathbf R\) 远的点满足

\[
|\mathbf r|^2\le |\mathbf r-\mathbf R|^2.
\]

展开得

\[
\mathbf r\cdot\mathbf R\le \frac{|\mathbf R|^2}{2}.
\]

所以 Wigner–Seitz 原胞严格地是半空间交

\[
\mathcal W
=\bigcap_{\mathbf R\in L\setminus\{0\}}
\left\{
\mathbf r:\mathbf r\cdot\mathbf R\le\frac{|\mathbf R|^2}{2}
\right\}.
\]

边界面正是原点与某些邻格点之间的垂直平分面。并非所有近邻候选平面最终都会成为多面体面；网页只把真正 active 的平面用于构造最终几何。

## 5. 第一 Brillouin 区

将上一节的格点集合从直接格 \(L\) 换成倒格 \(L^*\)，得到

\[
\mathrm{BZ}_1=\mathrm{WS}(L^*).
\]

因此第一 BZ 体积就是

\[
V_{\mathrm{BZ}}=\frac{(2\pi)^3}{V_p}.
\]

## 6. Miller 晶面

用惯用胞三矢量 \(\mathbf a_i^c\) 定义对应对偶基 \(\mathbf b_i^c\)。令

\[
\mathbf G_{hkl}=h\mathbf b_1^c+k\mathbf b_2^c+l\mathbf b_3^c.
\]

一族平行晶面满足

\[
\mathbf G_{hkl}\cdot\mathbf r=2\pi m,
\qquad m\in\mathbb Z.
\]

所以法向量严格为 \(\mathbf G_{hkl}\)，相邻晶面间距

\[
d_{hkl}=\frac{2\pi}{|\mathbf G_{hkl}|}.
\]

若 \(\mathbf r=x\mathbf a_1^c+y\mathbf a_2^c+z\mathbf a_3^c\)，则

\[
hx+ky+lz=m.
\]

取 `m=1` 时，非零指数对应的分数截距为

\[
x=\frac1h,\qquad y=\frac1k,\qquad z=\frac1l.
\]

零指数意味着平行于对应晶轴。

### 方向与晶面不要混淆

晶向

\[
[uvw]\quad\Longleftrightarrow\quad
\mathbf d=u\mathbf a_1^c+v\mathbf a_2^c+w\mathbf a_3^c.
\]

晶面法向却是

\[
\mathbf n_{hkl}\parallel
h\mathbf b_1^c+k\mathbf b_2^c+l\mathbf b_3^c.
\]

仅在特殊正交高对称情形，尤其立方晶格中，才可把 `[hkl]` 与 `(hkl)` 的法向简单视为同一方向。

## 7. 中心化与倒格选择规则

以惯用胞 Miller 指数记号表示 Bravais reciprocal-lattice 条件：

- P：无额外条件；
- I：`h+k+l` 为偶数；
- F：`h,k,l` 全奇或全偶；
- C（ab 面中心）：`h+k` 为偶数。

这只是 Bravais 点阵的条件。真正的衍射振幅还包含 basis 结构因子

\[
F(\mathbf G)=\sum_\alpha f_\alpha(\mathbf G)
 e^{i\mathbf G\cdot\boldsymbol\tau_\alpha}.
\]

因此“是倒格点”与“实验中一定出现强衍射峰”不是同一命题。

## 8. 对称操作的矩阵形式

点群操作写成

\[
\mathbf r'=W\mathbf r,
\qquad W^TW=I.
\]

- `det W=+1`：proper rotation；
- `det W=-1`：mirror、inversion、rotoinversion 等 improper operation。

对 Bravais lattice，\(W\) 是点阵对称当且仅当

\[
A^{-1}WA=M,
\qquad M\in GL(3,\mathbb Z),
\qquad \det M=\pm1.
\]

这表示 \(W\) 作用后，每条原始平移仍是原始平移的整数线性组合。

空间群操作统一写成 Seitz 记号

\[
\{W|\mathbf t\}:\qquad
\mathbf r'=W\mathbf r+\mathbf t.
\]

当 \(\mathbf t=0\) 时退化为点群操作；若 \(W\) 是旋转而 \(\mathbf t\) 含沿轴分量，可形成 screw axis；若 \(W\) 是镜面而 \(\mathbf t\) 含面内分量，可形成 glide plane。

## 9. 六方四指数 Miller–Bravais 记号

六方基面有三条等价的 `a` 轴。常用四指数

\[
(hkil),\qquad i=-(h+k),
\]

以及方向

\[
[uvtw],\qquad t=-(u+v).
\]

例如 basal plane 为 `(0001)`，常见 prismatic plane 为 `{10-10}`，`a` 方向族可写作 `⟨11-20⟩`。
