# 第一 Brillouin 区、高对称点与标准 k-path

本页采用

\[
\mathbf b_i\cdot\mathbf a_j=2\pi\delta_{ij},\qquad
\mathbf k=q_1\mathbf b_1+q_2\mathbf b_2+q_3\mathbf b_3
\]

的倒格约定。网页中表格里的 \((q_1,q_2,q_3)\) 都是 **primitive reciprocal basis 的分数坐标**。

## 1. 为什么只需研究第一 Brillouin 区

对周期势

\[
V(\mathbf r+\mathbf R)=V(\mathbf r),\qquad \mathbf R\in L,
\]

Bloch 定理给出

\[
\psi_{n\mathbf k}(\mathbf r)
=e^{i\mathbf k\cdot\mathbf r}u_{n\mathbf k}(\mathbf r),
\qquad
u_{n\mathbf k}(\mathbf r+\mathbf R)=u_{n\mathbf k}(\mathbf r).
\]

若 \(\mathbf G\in L^*\)，则

\[
e^{i(\mathbf k+\mathbf G)\cdot\mathbf r}
=e^{i\mathbf k\cdot\mathbf r}e^{i\mathbf G\cdot\mathbf r},
\]

而 \(e^{i\mathbf G\cdot\mathbf R}=1\)。因此 \(\mathbf k\) 与 \(\mathbf k+\mathbf G\) 描述等价的晶体动量标签，能量满足

\[
E_n(\mathbf k+\mathbf G)=E_n(\mathbf k).
\]

于是任选一个倒格原胞就足以代表所有 \(\mathbf k\)。最对称的选法是倒格子的 Wigner–Seitz 原胞：

\[
\boxed{\mathrm{BZ}_1=\mathrm{WS}(L^*)}.
\]

## 2. 特殊 k 点为什么“特殊”

设 Bravais lattice 的点群为 \(P\)。给定 \(\mathbf k\)，其 little co-group 定义为

\[
P_{\mathbf k}
=\{W\in P\mid W\mathbf k=\mathbf k+\mathbf G,
\ \mathbf G\in L^*\}.
\]

若直接格 primitive fractional coordinates 在点群操作下满足

\[
\mathbf x' =M\mathbf x,
\qquad M\in GL(3,\mathbb Z),
\]

则 reciprocal fractional coordinates 变换为

\[
\boxed{\mathbf q'=M^{-T}\mathbf q}.
\]

因此网页直接用

\[
M^{-T}\mathbf q-\mathbf q\in\mathbb Z^3
\]

判断一个点群操作是否属于 \(P_{\mathbf k}\)。特别地，在 \(\Gamma=(0,0,0)\) 有

\[
P_\Gamma=P.
\]

一般内部点的 little group 往往很小；BZ 的顶点、棱和高对称面上的 little group 更大。因此这些位置最容易出现由对称性保护的简并、交叉和不可约表示结构。

## 3. 高对称路径不是电子轨迹

一条常见能带图如

\[
\Gamma\to X\to M\to\Gamma\to R\to X
\]

表示在这些 reciprocal-space 线段上依次计算 \(E_n(\mathbf k)\)，横轴是沿选定路径累计的 \(k\)-空间弧长。它不是电子随时间在 BZ 中运动的经典路径。

高对称路径的目的，是用有限的一维切片突出最有信息量的对称位置。完整三维色散仍是

\[
E_n(k_x,k_y,k_z).
\]

因此“标准路径上看不到”不等于“整个 BZ 不存在某个极值或交叉”。

## 4. 本项目采用的标准路径

当前网页对下列 Bravais cases 使用 SeeK-path 的 HPKOT 标准表。符号和分数坐标均以标准 primitive reciprocal basis 为准。

### cubic P · cP2

\[
\Gamma=(0,0,0),\quad
X=(0,\tfrac12,0),\quad
M=(\tfrac12,\tfrac12,0),\quad
R=(\tfrac12,\tfrac12,\tfrac12).
\]

推荐线段：

\[
\Gamma-X-M-\Gamma-R-X,\qquad R-M.
\]

### cubic I · cI1

\[
\Gamma=(0,0,0),\quad
H=(\tfrac12,-\tfrac12,\tfrac12),\quad
P=(\tfrac14,\tfrac14,\tfrac14),\quad
N=(0,0,\tfrac12).
\]

线段：

\[
\Gamma-H-N-\Gamma-P-H,\qquad P-N.
\]

### cubic F · cF2

\[
\begin{aligned}
X&=(\tfrac12,0,\tfrac12),\\
L&=(\tfrac12,\tfrac12,\tfrac12),\\
W&=(\tfrac12,\tfrac14,\tfrac34),\\
K&=(\tfrac38,\tfrac38,\tfrac34),\\
U&=(\tfrac58,\tfrac14,\tfrac58).
\end{aligned}
\]

线段采用 HPKOT 给出的

\[
\Gamma-X-U,\qquad K-\Gamma-L-W-X.
\]

### tetragonal P · tP1

\[
\Gamma,
X=(0,\tfrac12,0),
M=(\tfrac12,\tfrac12,0),
Z=(0,0,\tfrac12),
R=(0,\tfrac12,\tfrac12),
A=(\tfrac12,\tfrac12,\tfrac12).
\]

### orthorhombic P · oP1

\[
\Gamma,
X=(\tfrac12,0,0),
Y=(0,\tfrac12,0),
Z=(0,0,\tfrac12)
\]

以及边、角点 \(S,U,T,R\)。

### hexagonal P · hP2

\[
\Gamma=(0,0,0),\quad
M=(\tfrac12,0,0),\quad
K=(\tfrac13,\tfrac13,0),
\]

\[
A=(0,0,\tfrac12),\quad
L=(\tfrac12,0,\tfrac12),\quad
H=(\tfrac13,\tfrac13,\tfrac12).
\]

标准线段为

\[
\Gamma-M-K-\Gamma-A-L-H-A,
\qquad L-M,
\qquad H-K.
\]

## 5. 为什么没有给所有 14 种 Bravais 格子硬塞一张路径表

对于若干 centered / low-symmetry lattices，HPKOT 的 extended Bravais case 取决于标准化晶胞与格参不等式。例如 orthorhombic F、monoclinic C、rhombohedral、triclinic 都存在分支。

因此网页遵守两条原则：

1. 第一 BZ 始终直接由当前 reciprocal lattice 的 Wigner–Seitz 构造得到；
2. 只有在标准 primitive setting 与 HPKOT branch 已明确匹配时才显示命名特殊点。

这避免把某个“看起来在角上”的点错误叫作 \(X,L,W\) 等标准名称。

## 6. 从 k-path 走向真正的能带计算

几何层只确定允许的 \(\mathbf k\) 区域和对称性。能量还来自具体 Hamiltonian：

\[
H(\mathbf k)|u_{n\mathbf k}\rangle
=E_n(\mathbf k)|u_{n\mathbf k}\rangle.
\]

最简单的自由电子模型是

\[
E(\mathbf k)=\frac{\hbar^2|\mathbf k|^2}{2m},
\]

周期势会在满足 Bragg 条件的 BZ 边界耦合 \(\mathbf k\) 与 \(\mathbf k-\mathbf G\)，从而打开能隙。网页后续若加入 nearly-free-electron / tight-binding 模块，应把能带曲线与当前 3D k-path 使用完全相同的 reciprocal coordinates。

## 7. 数据来源

标准特殊点和推荐路径采用 Materials Cloud 的 **SeeK-path**（HPKOT convention）。网页只内置已经与当前 primitive basis 数值核验一致的 cases。第一 BZ 的几何仍由本项目的半空间交算法独立计算。
