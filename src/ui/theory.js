import * as THREE from 'three';
import { state } from '../app/state.js';
import { BRAVAIS, STRUCTURES, CRYSTAL_SYSTEMS, basisOffsetCartesian } from '../core/lattices.js';
import { SYMMETRY_OPERATIONS, littleGroupAtK } from '../core/symmetry.js';
import { cellVolume, metricTensor, latticeParameters, reciprocalVectors } from '../core/geometry.js';
import { getKPath, displayKLabel, kPathBranches, kPathPointNames } from '../core/kpaths.js';
import {
  basisCell, basisMatrix, currentPointGroup, currentWignerSeitz, fmt, inv3, latticeSymmetryIntegerMatrix,
  matrixLatex, millerFamilyData, multiply3, reflectionAllowed, structureSymmetryWitness, vecLatex, wignerSeitzCached
} from '../core/model.js';
import { $ } from './dom.js';
import { typesetMath } from './mathjax.js';

function derivationHTML(lattice) {
  const A = basisMatrix(lattice.primitive);
  const g = metricTensor(lattice.primitive);
  const B = basisMatrix(reciprocalVectors(lattice.primitive));
  const params = latticeParameters(lattice.conventional);
  const system = CRYSTAL_SYSTEMS[lattice.system];
  let html = '';

  if (state.mode === 'structure') {
    const structure = STRUCTURES[state.structure];
    const taus = structure.basis
      .map((site, i) => `\\boldsymbol\\tau_${i + 1}=${vecLatex(basisOffsetCartesian(structure, site), 3)}`)
      .join(',\\quad ');
    html += `<section><h3>Bravais 点阵与基元</h3>
      <p>晶体结构 = Bravais 点阵 + 基元（basis）。点阵提供平移周期性，基元指定每个格点处的原子种类与相对位置。Bravais 点阵 \\(L=A\\mathbb Z^3\\) 是所有整数线性组合的集合。加入基元后，第 \\(\\alpha\\) 个原子的位置为 \\(\\mathbf r_{\\mathbf n\\alpha}=A\\mathbf n+\\boldsymbol\\tau_\\alpha\\)，其中 \\(\\mathbf n\\in\\mathbb Z^3\\) 标记格点，\\(\\alpha\\) 标记基元内的原子。</p>
      <div class="equation-block">\\[\\begin{gathered}A=[\\mathbf a_1\\;\\mathbf a_2\\;\\mathbf a_3]=${matrixLatex(A)}\\\\${taus}\\end{gathered}\\]</div>
      <p>同一 Bravais 点阵上的格点由平移 \\(A\\mathbf n\\) 互相生成；基元标签 \\(\\alpha\\) 保留原子种类、自旋等内部信息。</p></section>
      <section><h3>当前参数</h3><dl class="fact-grid"><dt>配位数</dt><dd>${structure.coordination}</dd><dt>最近邻</dt><dd>\\(${structure.nearest}\\)</dd><dt>几何关系</dt><dd>\\(${structure.packing}\\)</dd></dl></section>`;
  } else {
    html += `<section><h3>基矩阵与度量</h3>
      <p>原始基矩阵 \\(A\\) 的三列是基矢 \\(\\mathbf a_1,\\mathbf a_2,\\mathbf a_3\\)。度量张量 \\(g=A^TA\\) 的元素 \\(g_{ij}=\\mathbf a_i\\cdot\\mathbf a_j\\) 完全确定所有长度与夹角。</p>
      <div class="equation-block">\\[A=${matrixLatex(A)},\\qquad g=A^TA=${matrixLatex(g)}\\]</div>
      <p>原胞体积 \\(V_p=|\\det A|=\\sqrt{\\det g}=${fmt(cellVolume(lattice.primitive), 4)}\\)。</p></section>
      <section><h3>${system.name}晶系</h3>
      <p>该晶系的度量约束为 \\(${system.metric}\\)。当前惯用胞参数：</p>
      <p>\\(a=${fmt(params.a, 3)}\\)、\\(b=${fmt(params.b, 3)}\\)、\\(c=${fmt(params.c, 3)}\\)，\\(\\alpha=${fmt(params.alpha, 1)}^\\circ\\)、\\(\\beta=${fmt(params.beta, 1)}^\\circ\\)、\\(\\gamma=${fmt(params.gamma, 1)}^\\circ\\)。</p></section>`;
  }

  if (state.showSymmetry) {
    const op = SYMMETRY_OPERATIONS[state.symmetry];
    const check = latticeSymmetryIntegerMatrix(lattice, op.matrix);
    const witness = state.mode === 'structure' ? structureSymmetryWitness(lattice, STRUCTURES[state.structure], op.matrix) : null;
    html += `<section><h3>对称操作</h3>
      <p>点群操作 \\(W\\) 是正交矩阵（\\(W^TW=I\\)），作用在笛卡尔向量上：\\(\\mathbf r'=W\\mathbf r\\)。当前操作为</p>
      <div class="equation-block">\\[W=${matrixLatex(op.matrix)}\\]</div>
      <p>在原始分数基中，对应的整数矩阵为 \\(M=A^{-1}WA\\)。操作保持 Bravais 点阵不变当且仅当 \\(M\\in GL(3,\\mathbb Z)\\)（即 \\(|\\det M|=1\\) 且所有元素为整数）。当前</p>
      <div class="equation-block">\\[M=${check.M ? matrixLatex(check.M) : '\\text{undefined}'}\\]</div>
      ${state.mode === 'structure' ? '<p>对含基元的结构，还要求存在平移 \\(\\mathbf t\\) 和置换 \\(\\pi\\)，使 \\(W\\boldsymbol\\tau_\\alpha+\\mathbf t=\\boldsymbol\\tau_{\\pi(\\alpha)}\\pmod L\\)——即操作后原子种类不变，只是位置被置换。</p>' : ''}
      <p class="status ${(witness ? witness.ok : check.ok) ? 'ok' : 'bad'}">${(witness ? witness.ok : check.ok) ? '✓ 当前操作满足该对象的对称条件。' : '✗ 当前操作不满足该对象的对称条件。'}</p></section>`;
  }

  if (state.showMiller) {
    const cell = basisCell(lattice);
    const [c1, c2, c3] = reciprocalVectors(cell);
    const G = c1.clone().multiplyScalar(state.h).addScaledVector(c2, state.k).addScaledVector(c3, state.l);
    const d = 2 * Math.PI / G.length();
    const intercepts = [state.h, state.k, state.l].map(x => x === 0 ? '\\infty' : fmt(1 / x, 3));
    const family = millerFamilyData(state, lattice, state.h, state.k, state.l);
    const allowed = reflectionAllowed(lattice, state.h, state.k, state.l);
    html += `<section><h3>Miller 指数与倒格矢量</h3>
      <p>给定惯用胞 \\(C\\)，Miller 指数 \\((hkl)\\) 定义平面族 \\(\\mathbf h^T\\mathbf y=m\\)（\\(\\mathbf h=(h,k,l)^T\\)，\\(\\mathbf y\\) 是分数坐标）。平面族的笛卡尔法向为 \\(\\mathbf g_{hkl}=2\\pi C^{-T}\\mathbf h\\)。</p>
      <div class="equation-block">\\[\\mathbf g_{hkl}=${vecLatex(G.toArray())}\\]</div>
      <p>面间距 \\(d_{hkl}=2\\pi/|\\mathbf g_{hkl}|=${fmt(d, 4)}\\)。在 \\(m=1\\) 的代表面上，三个分数截距为 \\(x=${intercepts[0]}\\)、\\(y=${intercepts[1]}\\)、\\(z=${intercepts[2]}\\)。</p>
      <p>对中心化点阵，需检查选择定则：\\(\\mathbf g_{hkl}\\) ${allowed ? '满足' : '不满足'} ${lattice.centering} 中心化条件，因此${allowed ? '属于' : '不属于'}真实倒格 \\(L^*\\)。</p></section>
      <section><h3>等价面族</h3><p>点群操作把法向送到 \\(\\mathbf g'=W\\mathbf g_{hkl}\\)。当前 \\(\\{hkl\\}\\) 有 ${family.signedCount} 个带符号法向；识别 \\(\\mathbf g\\sim-\\mathbf g\\)（同一平面族的正反面）后得到 ${family.normals.length} 个独立取向。</p></section>`;
  }

  if (state.spaceView !== 'direct' || state.showBZ || state.showKPath || state.showReciprocalPrimitiveCell) {
    // 这一节要能独立核验，所以给的是数值而不只是公式。两条恒等式用「残差 = 0」的形式显示：
    // 残差同时说明了「两种算法给出同一个矩阵」，而且比并排印两个矩阵窄得多——理论抽屉只有
    // 约 420px 宽，一行放两个 3×3 矩阵会被裁掉（MathJax 不会换行，只会把右边的矩阵切坏）。
    const twoPiI = [[2 * Math.PI, 0, 0], [0, 2 * Math.PI, 0], [0, 0, 2 * Math.PI]];
    const AT = [0, 1, 2].map(i => [0, 1, 2].map(j => A[j][i]));
    const ATB = multiply3(AT, B);
    const gStar = multiply3([0, 1, 2].map(i => B.map(row => row[i])), B);          // g* = BᵀB
    const gInverse = inv3(g);
    const gStarViaG = gInverse ? gInverse.map(row => row.map(x => 4 * Math.PI * Math.PI * x)) : null;
    const dualResidual = ATB.map((row, i) => row.map((x, j) => x - twoPiI[i][j]));
    const metricResidual = gStarViaG ? gStar.map((row, i) => row.map((x, j) => x - gStarViaG[i][j])) : null;
    const bLengths = [0, 1, 2].map(j => Math.hypot(...B.map(row => row[j])));
    // |det B| = √(det g*)：g* = BᵀB 给的是体积的平方。(2π)³/V_p 是同一量的闭式表达。
    const detGStar = gStar[0][0] * (gStar[1][1] * gStar[2][2] - gStar[1][2] * gStar[2][1])
      - gStar[0][1] * (gStar[1][0] * gStar[2][2] - gStar[1][2] * gStar[2][0])
      + gStar[0][2] * (gStar[1][0] * gStar[2][1] - gStar[1][1] * gStar[2][0]);
    const reciprocalVolume = Math.sqrt(Math.max(0, detGStar));
    const closedForm = (2 * Math.PI) ** 3 / cellVolume(lattice.primitive);
    const volumeAgrees = Math.abs(reciprocalVolume - closedForm) < 1e-6;
    const metricAgrees = metricResidual && metricResidual.every(row => row.every(x => Math.abs(x) < 1e-6));
    html += `<section><h3>倒格对偶</h3>
      <p>倒格定义为 \\(L^*=\\{\\mathbf G:\\mathbf G\\cdot\\mathbf R\\in2\\pi\\mathbb Z,\\ \\forall\\mathbf R\\in L\\}\\)。由对偶条件 \\(A^TB=2\\pi I\\) 得 \\(B=2\\pi A^{-T}\\)。当前倒格基矩阵为</p>
      <div class="equation-block">\\[B=${matrixLatex(B)}\\]</div>
      <p>三列 \\(\\mathbf b_1,\\mathbf b_2,\\mathbf b_3\\) 的长度分别为 \\(|\\mathbf b_1|=${fmt(bLengths[0], 4)}\\)、\\(|\\mathbf b_2|=${fmt(bLengths[1], 4)}\\)、\\(|\\mathbf b_3|=${fmt(bLengths[2], 4)}\\)。</p>
      <p>倒胞体积 \\(V_p^*=|\\det B|=\\sqrt{\\det g^*}=${fmt(reciprocalVolume, 4)}\\)，与闭式 \\((2\\pi)^3/V_p=${fmt(closedForm, 4)}\\) ${volumeAgrees ? '一致 ✓' : '<strong>不一致</strong>'}。</p>
      <p>下面用残差矩阵核验两条恒等式（逐元素应全为 0）：对偶关系 \\(A^TB=2\\pi I\\)，以及倒空间度量 \\(g^*=B^TB\\) 与 \\(g^*=(2\\pi)^2g^{-1}\\)。</p>
      <div class="equation-block">\\[\\begin{gathered}
        A^TB-2\\pi I=${matrixLatex(dualResidual, 3)}\\\\
        g^*-(2\\pi)^2g^{-1}=${metricAgrees ? matrixLatex(metricResidual, 3) : '\\text{（不一致）}'}
        \\end{gathered}\\]</div></section>`;
  }

  if (state.showWS) {
    const data = currentWignerSeitz(state, lattice);
    const first = data.activePlanes[0]?.R || new THREE.Vector3(1, 0, 0);
    const structural = state.mode === 'structure';
    const cellSymbol = structural ? '\\mathcal V_\\alpha' : '\\mathcal W';
    html += `<section><h3>${structural ? '原子 Voronoi 胞' : 'Wigner–Seitz 原胞'}</h3>
      <p>Wigner–Seitz 原胞是一种特殊的原胞：以某个格点为原点，取所有「离该格点比离其他任何格点更近」的点构成的区域。它对每个 Bravais 点阵唯一确定，且保留点阵的全部对称性。</p>
      <p>构造方法：令 \\(\\mathbf R\\) 遍历其他格点的位移矢量。胞内点满足 \\(|\\mathbf r|\\le|\\mathbf r-\\mathbf R|\\)。平方消去 \\(|\\mathbf r|^2\\) 后，每个 \\(\\mathbf R\\) 给出一个半空间 \\(\\mathbf r\\cdot\\mathbf R\\le|\\mathbf R|^2/2\\)，所有半空间的交集即为 W–S 胞：</p>
      <div class="equation-block">\\[${cellSymbol}=\\bigcap_{\\mathbf R\\ne0}\\left\\{\\mathbf r:\\mathbf r\\cdot\\mathbf R\\le\\frac{|\\mathbf R|^2}{2}\\right\\}.\\]</div>
      <p>${structural
        ? `结构模式下，画的是所选 ${data.centerLabel} 位点原子的 Voronoi 胞——它考虑的是全部原子（含基元中其他位点），而非仅 Bravais 格点。例如金刚石结构中，原子 Voronoi 胞是截角八面体（14 面），与 FCC 点阵的 W–S 胞（菱形十二面体，12 面）不同。`
        : `当前 Bravais 点阵的 W–S 胞。`}当前有 ${data.activePlanes.length} 个有效面、${data.vertices.length} 个顶点。示例边界取 \\(\\mathbf R=${vecLatex(first.toArray())}\\)，对应右端 \\(${fmt(first.lengthSq() / 2, 4)}\\)。</p></section>`;
  }

  if (state.showBZ) {
    const data = wignerSeitzCached(reciprocalVectors(lattice.primitive));
    html += `<section><h3>第一 Brillouin 区</h3>
      <p>第一 Brillouin 区（BZ）是倒格 \\(L^*\\) 的 Wigner–Seitz 原胞，即 \\(\\mathrm{BZ}_1=\\mathrm{WS}(L^*)\\)。由于 Bloch 能带满足 \\(E_n(\\mathbf k+\\mathbf G)=E_n(\\mathbf k)\\)，所有不等价的 \\(\\mathbf k\\) 都落在第一 BZ 内——它是 k 空间的「基本域」。</p>
      <p>当前多面体有 ${data.activePlanes.length} 个面、${data.vertices.length} 个顶点。</p></section>`;
  }

  if (state.showKPath) {
    const path = getKPath(lattice.id);
    if (!path) {
      html += '<section><h3>k 路径</h3><p>当前 Bravais 类型尚未内置参考 k 路径。路径标签依赖 HPKOT 数据库的完整判定，为避免给出不准确的标签，此处暂不显示。</p></section>';
    } else {
      const rows = kPathPointNames(path)
        .map(name => `<tr><td>${displayKLabel(name)}</td><td>\\(${vecLatex(path.points[name])}\\)</td><td>${littleGroupAtK(lattice.primitive, path.points[name]).order}</td></tr>`)
        .join('');
      const branches = kPathBranches(path).map(branch => branch.map(displayKLabel).join(' → ')).join(' <span class="path-break">|</span> ');
      html += `<section><h3>Bloch 定理与 k 空间</h3>
        <p>Bloch 定理指出，周期势中的电子态可写为 \\(\\psi_{n\\mathbf k}(\\mathbf r)=e^{i\\mathbf k\\cdot\\mathbf r}u_{n\\mathbf k}(\\mathbf r)\\)，其中 \\(u_{n\\mathbf k}\\) 与晶格同周期。因此能带满足 \\(E_n(\\mathbf k+\\mathbf G)=E_n(\\mathbf k)\\)，\\(\\mathbf k\\) 只需取在第一 Brillouin 区内。</p></section>
        <section><h3>Little group 与能带简并</h3>
        <p>对于给定的 \\(\\mathbf k\\)，little group \\(G_{\\mathbf k}=\\{W\\in P(L):W\\mathbf k=\\mathbf k+\\mathbf G\\}\\) 是保持 \\(\\mathbf k\\)（模倒格矢量）不变的点群子群。\\(G_{\\mathbf k}\\) 的不可约表示维度直接决定该 \\(\\mathbf k\\) 处能带的最小简并度——例如 \\(|G_{\\mathbf k}|=6\\) 时，二维不可约表示给出二重简并。</p>
        <p>高对称点（\\(|G_{\\mathbf k}|\\) 大）往往出现能带简并或交叉；沿高对称线连接两个高对称点时，相容关系要求各支能带的表示在端点处可约化为对应的 little group 表示。</p></section>
        <section><h3>${path.variant} · ${lattice.name}</h3>
        <p>下表列出该 Bravais 类型的标准 k 路径中各特殊点。坐标相对于当前原始倒格基 \\(B=[\\mathbf b_1\\;\\mathbf b_2\\;\\mathbf b_3]\\)，即 \\(\\mathbf k=B\\mathbf q\\)。</p>
        <table class="ref-table"><thead><tr><th>点</th><th>原始倒格分数坐标</th><th>|Gₖ|</th></tr></thead><tbody>${rows}</tbody></table>
        <p>路径由若干分支组成，不同分支以竖线分隔，竖线表示分支断开（不表示其间存在连接线）：</p>
        <p class="path-sequence">${branches}</p></section>`;
    }
  }

  return html || '<section><h3>推导</h3><p>当前图层没有附加推导。</p></section>';
}

function overviewHTML(lattice) {
  const pointGroup = currentPointGroup(state, lattice);
  const conventionalVolume = cellVolume(lattice.conventional);
  const primitiveVolume = cellVolume(lattice.primitive);
  const multiplicity = Math.round(conventionalVolume / primitiveVolume);
  const system = CRYSTAL_SYSTEMS[lattice.system];
  const allowed = reflectionAllowed(lattice, state.h, state.k, state.l);
  const jump = (layer, label) => `<button class="layer-jump" data-action="jumpLayer" data-jump-layer="${layer}">${label}</button>`;

  let html = `<section><h3>数学约定</h3>
    <p><strong>向量与坐标</strong>：全站采用列向量。原始基矩阵 \\(A=[\\mathbf a_1\\;\\mathbf a_2\\;\\mathbf a_3]\\) 的三列是三个基矢，笛卡尔向量 \\(\\mathbf r\\) 与分数坐标 \\(\\mathbf x\\) 满足 \\(\\mathbf r=A\\mathbf x\\)。</p>
    <p><strong>Bravais 点阵</strong>：无限周期点集 \\(L=A\\mathbb Z^3\\)，即所有整数线性组合 \\(n_1\\mathbf a_1+n_2\\mathbf a_2+n_3\\mathbf a_3\\)。度量张量 \\(g=A^TA\\) 记录基矢间的长度与夹角，原胞体积 \\(V_p=|\\det A|\\)。</p>
    <p><strong>倒格</strong>：采用物理学 \\(2\\pi\\) 约定，定义 \\(L^*=\\{\\mathbf G:e^{i\\mathbf G\\cdot\\mathbf R}=1,\\ \\forall\\mathbf R\\in L\\}\\)。倒格基矩阵 \\(B=2\\pi A^{-T}\\)，满足 \\(A^TB=2\\pi I\\)（即 \\(\\mathbf a_i\\cdot\\mathbf b_j=2\\pi\\delta_{ij}\\)）。若文献使用 \\(B=A^{-T}\\)，Fourier 相位通常相应写成 \\(e^{2\\pi i\\mathbf k\\cdot\\mathbf r}\\)。</p>
    <p><strong>点群</strong>：点阵点群 \\(P(L)=\\{W\\in O(3):WL=L\\}\\) 是保持点阵不变的正交变换。在分数基中，对应整数矩阵 \\(M=A^{-1}WA\\in GL(3,\\mathbb Z)\\)。</p>
  </section>`;

  if (state.mode === 'structure') {
    const structure = STRUCTURES[state.structure];
    const bravais = BRAVAIS[structure.bravais];
    html += `<section><h3>${structure.name}</h3><dl class="fact-grid">
      <dt>Bravais</dt><dd>${bravais.name}</dd><dt>晶系</dt><dd>${CRYSTAL_SYSTEMS[bravais.system].name}</dd>
      <dt>点群</dt><dd>\\(${structure.pointGroupHM}\\) / \\(${structure.pointGroupS}\\)</dd><dt>空间群</dt><dd>\\(${structure.spaceGroup}\\) · No. ${structure.spaceGroupNo}</dd>
      <dt>配位数</dt><dd>${structure.coordination}</dd><dt>示例</dt><dd>${structure.example}</dd></dl>
      <p>结构位置统一写为 \\(\\mathbf r_{\\mathbf n\\alpha}=A\\mathbf n+\\boldsymbol\\tau_\\alpha\\)，其中 \\(\\mathbf n\\in\\mathbb Z^3\\)。最近邻关系为 \\(${structure.nearest}\\)，几何关系为 \\(${structure.packing}\\)。</p>
      <p>${jump('lattice', '原子格架')}${jump('primitive', '点阵原胞')}${jump('conventional', '惯用胞')}${jump('ws', '原子 Voronoi')}</p></section>`;
  } else {
    html += `<section><h3>${lattice.name}</h3><dl class="fact-grid">
      <dt>晶系</dt><dd>${system.name}</dd><dt>中心化</dt><dd>${lattice.centering}</dd>
      <dt>holohedry</dt><dd>\\(${system.holohedry}\\) / \\(${system.schoenflies}\\)</dd><dt>|P(L)|</dt><dd>${pointGroup.order}</dd>
      <dt>V_p</dt><dd>${fmt(primitiveVolume, 4)}</dd><dt>V_conv / V_p</dt><dd>${multiplicity}</dd></dl>
      <p>${jump('lattice', '格点')}${jump('primitive', '原胞')}${jump('conventional', '惯用胞')}${jump('ws', 'W–S')}</p></section>`;
  }

  html += `<section><h3>惯用胞与 Miller 指数</h3>
    <p>惯用胞矩阵 \\(C=[\\mathbf c_1\\;\\mathbf c_2\\;\\mathbf c_3]\\) 按晶系选取，可能包含中心化格点（如 FCC 有 4 个格点/胞）。令分数坐标 \\(\\mathbf r=C\\mathbf y\\)，则整数三元组 \\((hkl)\\) 通过 \\(hy+kz+lz=m\\)（\\(m\\in\\mathbb Z\\)）定义一族等间距平面。</p>
    <p>平面族的笛卡尔法向为 \\(\\mathbf g_{hkl}=2\\pi C^{-T}(h,k,l)^T\\)，面间距 \\(d_{hkl}=2\\pi/|\\mathbf g_{hkl}|\\)。对中心化点阵，只有满足选择定则（如 I 中心化要求 \\(h+k+l\\) 为偶数）时 \\(\\mathbf g_{hkl}\\) 才属于真实倒格 \\(L^*\\)。当前 \\((${state.h}\\,${state.k}\\,${state.l})\\) ${allowed ? '满足' : '不满足'} ${lattice.centering} 中心化条件。</p>
    <p>${jump('family', '{hkl}')}${jump('g', 'gₕₖₗ')}</p></section>`;

  html += `<section><h3>正倒空间对应</h3>
    <p>正空间与倒空间通过 \\(A^TB=2\\pi I\\) 对偶：体积满足 \\(V_p^*=(2\\pi)^3/V_p\\)，第一 Brillouin 区是倒格的 Wigner–Seitz 原胞 \\(\\mathrm{BZ}_1=\\mathrm{WS}(L^*)\\)。下表列出主要对应关系：</p>
    <table class="ref-table"><thead><tr><th>实空间</th><th>倒空间</th></tr></thead><tbody>
      <tr><td>\\(L=A\\mathbb Z^3\\)</td><td>\\(L^*=B\\mathbb Z^3\\)</td></tr>
      <tr><td>原始基 \\(A\\)</td><td>倒格基 \\(B=2\\pi A^{-T}\\)</td></tr>
      <tr><td>Wigner–Seitz 原胞</td><td>第一 Brillouin 区</td></tr>
      <tr><td>平面族 \\((hkl)\\)</td><td>法向 \\(\\mathbf g_{hkl}\\)</td></tr>
      <tr><td>惯用胞中心化</td><td>互换：\\(F\\leftrightarrow I\\)，\\(P,C,R\\) 各自对应</td></tr></tbody></table>
    <p>中心化互换意味着正空间 FCC 的倒点阵是 BCC（惯用胞棱长 \\(4\\pi\\)，取 \\(a=1\\)），而正空间 BCC 的倒点阵是 FCC（惯用胞含 6 个面心格点）。</p>
    <p>${jump('reciprocal', '倒格点')}${jump('recipPrim', '倒格原胞')}${jump('recipConv', '倒格惯用胞')}${jump('bz', '第一 BZ')}</p></section>`;

  const kpath = getKPath(lattice.id);
  if (kpath) {
    html += `<section><h3>参考 k 路径</h3><p>${kpath.variant} · ${lattice.name}。${kPathPointNames(kpath).length} 个特殊点、${kpath.path.length} 段、${kPathBranches(kpath).length} 条断开的分支；坐标使用原始倒格基。</p><p class="path-sequence">${kPathBranches(kpath).map(branch => branch.map(displayKLabel).join(' → ')).join(' <span class="path-break">|</span> ')}</p><p>${jump('kpath', '在 3D 中显示')}</p></section>`;
  }
  return html;
}

export function createTheory() {
  let lastKey = '';

  function update(lattice, force = false) {
    const key = [
      state.theoryTab, state.mode, state.spaceView, state.structure, state.bravais,
      state.h, state.k, state.l, state.symmetry, state.showSymmetry, state.showMiller,
      state.showReference, state.showWS, state.showBZ, state.showKPath,
      state.showMillerFamily, state.showReciprocalPrimitiveCell, state.showG
    ].join('|');
    if (!force && key === lastKey) return;
    lastKey = key;
    // 标题不在这里写：抽屉顶部只有「定义 / 推导」两个页签，再挂一个同名的 h2 就是重复。
    $('#theoryContent').innerHTML = state.theoryTab === 'derivation' ? derivationHTML(lattice) : overviewHTML(lattice);
    // 跳转按钮不在这里绑定：它们每次重绘都会重建，绑定必须跟着重绑。声明 data-action
    // 交给 bindWorkbench 的委派，挂一次就管到底。
    typesetMath([$('#theoryContent')]);
  }

  return { update };
}
