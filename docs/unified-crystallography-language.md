# 晶体学表示法：一套统一的矢量与群作用语言

本页固定网页使用的坐标约定。原始基用于点阵与倒格；Miller 指数则按惯用胞定义。

## 1. 直接格、原胞、惯用胞与 basis

取三个线性无关的 primitive vectors，组成列矩阵

\[
A=[\mathbf a_1\;\mathbf a_2\;\mathbf a_3].
\]

Bravais lattice 是

\[
L=\{A\mathbf n:\mathbf n\in\mathbb Z^3\}.
\]

因此 Bravais lattice 只编码**平移等价性**。实际晶体由 basis 加到每个格点：

\[
\mathbf r_{\mathbf n\alpha}=A\mathbf n+\boldsymbol\tau_\alpha,
\]

其中 \(\boldsymbol\tau_\alpha\) 是笛卡尔位移；若使用分数坐标 \(\mathbf u_\alpha\)，则 \(\boldsymbol\tau_\alpha=A\mathbf u_\alpha\)。惯用胞用于显示晶系对称性；原胞恰含一个 Bravais 格点。

## 2. 分数坐标与笛卡尔坐标

若 \(\mathbf x=(x_1,x_2,x_3)^T\) 是分数坐标，则

\[
\mathbf r=A\mathbf x.
\]

所有空间群操作最好先在分数坐标中写，因为平移分量通常是 \(1/2,1/3,1/4\) 等有理数。

度量张量

\[
g=A^TA
\]

统一给出长度和夹角：

\[
|\mathbf r|^2=\mathbf x^Tg\mathbf x.
\]

## 3. 倒格子

采用固体物理常见的 \(2\pi\) 约定：

\[
B=[\mathbf b_1\;\mathbf b_2\;\mathbf b_3]=2\pi A^{-T},
\qquad A^TB=2\pi I.
\]

于是

\[
\mathbf G=B\mathbf m,\qquad \mathbf m\in\mathbb Z^3,
\]

并且对任意 \(\mathbf R\in L\)，

\[
e^{i\mathbf G\cdot\mathbf R}=1.
\]

## 4. Miller 指数、晶面与晶向

本节的晶向与 Miller 晶面都按惯用胞 \(C=[\mathbf c_1\;\mathbf c_2\;\mathbf c_3]\) 标记。晶向 \([uvw]\) 对应

\[
\mathbf d=C(u,v,w)^T.
\]

本应用的 Miller 指数 \((hkl)\) 也相对于 \(C\) 定义。设 \(\mathbf r=C\mathbf y\) 且 \(\mathbf h=(h,k,l)^T\)，平面族满足 \(\mathbf h^T\mathbf y=m\)。其法向 covector 为

\[
\mathbf g_{hkl}=2\pi C^{-T}\mathbf h.
\]

平行晶面族满足

\[
\mathbf g_{hkl}\cdot\mathbf r=2\pi m,
\qquad m\in\mathbb Z,
\]

因此

\[
d_{hkl}=\frac{2\pi}{|\mathbf g_{hkl}|}.
\]

这是相邻几何平面的间距。对中心化点阵，只有满足中心化条件时 \(\mathbf g_{hkl}\in L^*\)；它才可写为 \(B\mathbf m\)（\(\mathbf m\in\mathbb Z^3\)）。不满足时该几何面仍存在，但不能把它当成真实倒格矢。只有在特殊度量（例如立方晶格）下，直接空间的 \([hkl]\) 才与 \((hkl)\) 的法向平行。

例如取晶格常数 \(a=1\) 的 FCC：\(C=I\)，所以 \(\mathbf g_{100}=2\pi(1,0,0)^T\)。它与面心平移 \((1/2,0,1/2)^T\) 的点积为 \(\pi\)，故不属于 \(L^*\)；但 \(\mathbf g_{111}=2\pi(1,1,1)^T\) 与每个面心平移的点积都是 \(2\pi\)，属于 \(L^*\)。原始倒格矢 \(B(1,0,0)^T=2\pi(-1,1,1)^T\) 也属于 \(L^*\)，却不是惯用胞的 \((100)\) 法向。这三个对象不能混用。

## 5. 点群：固定原点的正交作用

笛卡尔空间中的点群操作写成

\[
\mathbf r'=W\mathbf r,
\qquad W^TW=I.
\]

在 primitive basis 中，相同操作写成

\[
\mathbf x'=M\mathbf x,
\qquad M=A^{-1}WA.
\]

它保持 Bravais lattice 当且仅当

\[
M\in GL(3,\mathbb Z).
\]

这就是“旋转/镜面是否真的是晶格对称”的统一代数判据。

## 6. 空间群：Seitz 算符

所有普通三维空间群元素统一写成

\[
g=\{W|\boldsymbol\tau\}.
\]

对笛卡尔坐标：

\[
\mathbf r' = W\mathbf r+\boldsymbol\tau.
\]

对分数坐标：

\[
\mathbf x'=M\mathbf x+\mathbf t,
\qquad M=A^{-1}WA,
\qquad \boldsymbol\tau=A\mathbf t.
\]

乘法规则为

\[
\{W_1|\boldsymbol\tau_1\}\{W_2|\boldsymbol\tau_2\}
=\{W_1W_2|\boldsymbol\tau_1+W_1\boldsymbol\tau_2\}.
\]

因此：

- 普通旋转、镜面、反演：\(\boldsymbol\tau=0\)；
- 螺旋轴：旋转后带轴向分数平移；
- 滑移面：镜面反射后带面内分数平移。

## 7. Hermann–Mauguin、Schoenflies、Hall 各自描述什么

- **Hermann–Mauguin (H–M)**：晶体学中最常用，直接突出标准晶向上的旋转/镜面/螺旋/滑移元素；空间群首字母同时给出 P/C/I/F/R 等中心化。
- **Schoenflies**：主要用于点群，强调群的抽象类型，如 \(O_h,D_{6h},T_d\)。它不适合单独编码空间群中的非平移对称细节。
- **Hall symbol**：对空间群生成元与原点/setting 的编码更不含糊，特别适合计算数据库。相同 International space-group number 可能存在不同 setting；“230 个空间群类型”不等同于“只有 230 个所有可能的 setting”。
- **International number**：No. 1–230 是空间群类型的标准索引，不替代符号本身。

## 8. Wyckoff position 是群轨道问题

给定空间群 \(G\) 与点 \(\mathbf x\)，轨道是

\[
\mathcal O(\mathbf x)=\{g\mathbf x:g\in G\}.
\]

稳定子（site-symmetry group）是

\[
G_{\mathbf x}=\{g\in G:g\mathbf x\equiv\mathbf x\pmod L\}.
\]

Wyckoff multiplicity 本质上由轨道—稳定子关系决定。一般位置稳定子最小、multiplicity 最大；点落在镜面、旋转轴等特殊位置后，site symmetry 增强，multiplicity 降低。

## 9. Wigner–Seitz 与第一 Brillouin 区

Wigner–Seitz cell 是 Voronoi cell：

\[
\mathcal W(L)=\bigcap_{\mathbf R\in L\setminus\{0\}}
\left\{\mathbf r:\mathbf r\cdot\mathbf R\le\frac{|\mathbf R|^2}{2}\right\}.
\]

第一 Brillouin 区只是把同一定义应用于倒格子：

\[
\mathrm{BZ}_1=\mathcal W(L^*).
\]

因此它们不是两个独立概念，而是直接空间与倒空间中的同一 Voronoi 构造。

## 10. 衍射与结构因子

Bravais reciprocal lattice 给出允许的相位周期；basis 再决定结构因子

\[
F(\mathbf G)=\sum_\alpha f_\alpha(\mathbf G)
 e^{i\mathbf G\cdot\boldsymbol\tau_\alpha}.
\]

所以“中心化消光规则”和“basis 导致的额外系统消光”必须分开。一个 \((hkl)\) 几何晶面存在，并不意味着对应衍射峰一定非零。

## 11. k 空间中的群作用

对 \(\mathbf k=B\mathbf q\)，点群操作在 reciprocal fractional coordinates 中作用为

\[
\mathbf q' = M^{-T}\mathbf q.
\]

little co-group 满足

\[
M^{-T}\mathbf q-\mathbf q\in\mathbb Z^3.
\]

这正是高对称 k 点、能带简并与不可约表示分析的代数入口。

---

网页中的 3D 图、Miller 面、倒格子、点群动画、空间群检索都应使用以上同一套符号约定，避免不同教材记号混用造成概念断裂。

## 12. 常见表示法的逐项转换字典

为了避免把“坐标”“指标”“基矢分量”和“几何向量”混为一谈，统一采用下面的类型约定。

| 对象 | 无量纲坐标/指标 | 笛卡尔几何对象 | 转换 |
|---|---|---|---|
| 位置 | \(\mathbf x\in\mathbb R^3\) | \(\mathbf r\) | \(\mathbf r=A\mathbf x\) |
| Bravais 平移 | \(\mathbf n\in\mathbb Z^3\) | \(\mathbf R\) | \(\mathbf R=A\mathbf n\) |
| 晶向（惯用胞指标） | \([uvw]\) | \(\mathbf d\) | \(\mathbf d=C(u,v,w)^T\) |
| 倒格指标 | \(\mathbf m\in\mathbb Z^3\) | \(\mathbf G\) | \(\mathbf G=B\mathbf m\) |
| Miller 面（惯用胞指标） | \((hkl)\) | 法向 \(\mathbf g_{hkl}\) | \(\mathbf g_{hkl}=2\pi C^{-T}(h,k,l)^T\) |
| 点群操作 | \(M\) | \(W\) | \(W=AMA^{-1}\) |
| 分数平移 | \(\mathbf t\) | \(\boldsymbol\tau\) | \(\boldsymbol\tau=A\mathbf t\) |
| k 点 | \(\mathbf q\) | \(\mathbf k\) | \(\mathbf k=B\mathbf q\) |

这里最容易出现的错误有两个：

1. 把分数坐标列向量 \(\mathbf x\) 当成笛卡尔向量直接做欧氏点积；正确长度是 \(\mathbf x^Tg\mathbf x\)。
2. 把 \((hkl)\) 与 \([hkl]\) 当作同一个向量；前者属于倒空间对偶基，后者属于直接空间基。

## 13. 主动变换、被动换基与矩阵左右作用

本项目网页统一把对称操作解释为**主动变换**：基底 \(A\) 固定，物理点移动，

\[
\mathbf r' = W\mathbf r,
\qquad
\mathbf x'=M\mathbf x,
\qquad
M=A^{-1}WA.
\]

若只是把同一几何向量改用新基底 \(A'=AP\) 表示，则属于**被动换基**。同一点满足

\[
A\mathbf x=A'\mathbf x'=AP\mathbf x',
\]

所以

\[
\mathbf x'=P^{-1}\mathbf x.
\]

因此主动群作用的 \(M\) 与被动换基的 \(P^{-1}\) 虽然都可能是整数矩阵，物理含义完全不同。网页中的 symmetry 动画只使用主动 convention；晶胞标准化、primitive ↔ conventional 转换则属于被动换基问题。

## 14. 等价点、模格平移与空间群相等

在周期晶体中，分数坐标按整数平移等价：

\[
\mathbf x\sim\mathbf x+\mathbf n,
\qquad \mathbf n\in\mathbb Z^3.
\]

因此判断空间群元素是否固定某点时，条件不是严格的 \(M\mathbf x+\mathbf t=\mathbf x\)，而是

\[
M\mathbf x+\mathbf t-\mathbf x\in\mathbb Z^3.
\]

同理，两个 Seitz 操作若只相差一个 Bravais 平移，在商掉平移子群以后对应同一个点群元素。空间群与点群的关系可以写成短正合列

\[
1\longrightarrow T\longrightarrow G\longrightarrow P\longrightarrow 1,
\]

其中 \(T\cong\mathbb Z^3\) 是平移子群，\(P\) 是 crystallographic point group。symmorphic 空间群对应这个扩张可以分裂；nonsymmorphic 情形则必须保留 screw/glide 的分数平移信息。

## 15. 表示论入口：从空间群到能带 little group

Bloch 态满足

\[
T_{\mathbf R}\psi_{n\mathbf k}
=e^{-i\mathbf k\cdot\mathbf R}\psi_{n\mathbf k}.
\]

空间群元素 \(g=\{W|\boldsymbol\tau\}\) 把 \(\mathbf k\) 映到 \(W\mathbf k\)。只有当

\[
W\mathbf k=\mathbf k+\mathbf G
\]

时，\(g\) 才属于该 \(\mathbf k\) 的 little group。对 nonsymmorphic 元素，其分数平移还会贡献 Bloch 相位

\[
e^{-i\mathbf k\cdot\boldsymbol\tau},
\]

这正是 zone-boundary sticking、强制简并和 projective representation 结构的来源之一。因而 H–M 符号里的 screw/glide 不是纯粹的命名细节，而会直接进入能带对称性分析。

## 16. 推荐的统一检索顺序

科研中拿到一个未知结构时，可按以下单向链条查询：

\[
\text{lattice parameters}
\to
A,g
\to
\text{Bravais}
\to
\{W|\tau\}
\to
\text{space group}
\to
\text{Wyckoff orbit}
\to
B
\to
\mathrm{BZ}
\to
G_{\mathbf k}.
\]

这样可以避免从“看起来像 FCC/BCC”直接跳到空间群，也避免只根据一个 H–M 符号猜测实际 atomic basis。三维工作台负责几何对象，检索器负责分类信息；二者使用完全相同的 \(A,B,M,W,\mathbf x,\mathbf q\) 语言。
