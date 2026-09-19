import * as THREE from 'three';
import { state } from '../app/state.js';
import { BRAVAIS, STRUCTURES, CRYSTAL_SYSTEMS, basisOffsetCartesian } from '../core/lattices.js';
import { SYMMETRY_OPERATIONS, littleGroupAtK } from '../core/symmetry.js';
import { cellVolume, metricTensor, latticeParameters, reciprocalVectors } from '../core/geometry.js';
import { getKPath, displayKLabel } from '../core/kpaths.js';
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
      <div class="equation-block">\\[A=[\\mathbf a_1\\;\\mathbf a_2\\;\\mathbf a_3]=${matrixLatex(A)}\\]</div>
      <p>Bravais 点阵是 \\(L=A\\mathbb Z^3\\)。加入 primitive basis 后，晶体位置写成 \\(\\mathbf r_{\\mathbf n\\alpha}=A\\mathbf n+\\boldsymbol\\tau_\\alpha\\)，其中 \\(\\mathbf n\\in\\mathbb Z^3\\)。</p>
      <div class="equation-block">\\[${taus}\\]</div>
      <p>同一 Bravais 点阵上的位置由 \\(L\\) 的平移互相生成；basis 标签保留原子种类等内部信息。</p></section>
      <section><h3>当前参数</h3><dl class="fact-grid"><dt>配位数</dt><dd>${structure.coordination}</dd><dt>最近邻</dt><dd>\\(${structure.nearest}\\)</dd><dt>几何关系</dt><dd>\\(${structure.packing}\\)</dd></dl></section>`;
  } else {
    html += `<section><h3>基矩阵与度量</h3>
      <div class="equation-block">\\[A=${matrixLatex(A)},\\qquad g=A^TA=${matrixLatex(g)}\\]</div>
      <p>Gram 矩阵满足 \\(g_{ij}=\\mathbf a_i\\!\\cdot\\!\\mathbf a_j\\)，原胞体积为 \\(V_p=|\\det A|=\\sqrt{\\det g}=${fmt(cellVolume(lattice.primitive), 4)}\\)。长度与夹角由正定矩阵 \\(g\\) 完全确定。</p></section>
      <section><h3>${system.name}晶系</h3>
      <p>度量约束为 \\(${system.metric}\\)。当前惯用胞参数为 \\(a=${fmt(params.a, 3)}\\)、\\(b=${fmt(params.b, 3)}\\)、\\(c=${fmt(params.c, 3)}\\)，以及 \\(\\alpha=${fmt(params.alpha, 1)}^\\circ\\)、\\(\\beta=${fmt(params.beta, 1)}^\\circ\\)、\\(\\gamma=${fmt(params.gamma, 1)}^\\circ\\)。</p></section>`;
  }

  if (state.showSymmetry) {
    const op = SYMMETRY_OPERATIONS[state.symmetry];
    const check = latticeSymmetryIntegerMatrix(lattice, op.matrix);
    const witness = state.mode === 'structure' ? structureSymmetryWitness(lattice, STRUCTURES[state.structure], op.matrix) : null;
    html += `<section><h3>群作用</h3>
      <p>笛卡尔向量按 \\(\\mathbf r'=W\\mathbf r\\) 变换，并满足 \\(W^TW=I\\)。当前操作矩阵为</p>
      <div class="equation-block">\\[W=${matrixLatex(op.matrix)}\\]</div>
      <p>在原始分数基中 \\(M=A^{-1}WA\\)。保持 Bravais 点阵等价于 \\(M\\in GL(3,\\mathbb Z)\\)；当前 \\(M=${check.M ? matrixLatex(check.M) : '\\text{undefined}'}\\)。</p>
      ${state.mode === 'structure' ? '<p>对具体结构还要求存在同一个平移 \\(\\mathbf t\\) 和保持元素标签的置换 \\(\\pi\\)，使 \\(W\\boldsymbol\\tau_\\alpha+\\mathbf t=\\boldsymbol\\tau_{\\pi(\\alpha)}\\pmod L\\)。</p>' : ''}
      <p class="status ${(witness ? witness.ok : check.ok) ? 'ok' : 'bad'}">${(witness ? witness.ok : check.ok) ? '当前操作满足该对象的对称条件。' : '当前操作不满足该对象的对称条件。'}</p></section>`;
  }

  if (state.showMiller) {
    const cell = basisCell(lattice);
    const [c1, c2, c3] = reciprocalVectors(cell);
    const G = c1.clone().multiplyScalar(state.h).addScaledVector(c2, state.k).addScaledVector(c3, state.l);
    const d = 2 * Math.PI / G.length();
    const intercepts = [state.h, state.k, state.l].map(x => x === 0 ? '\\infty' : fmt(1 / x, 3));
    const family = millerFamilyData(state, lattice, state.h, state.k, state.l);
    const allowed = reflectionAllowed(lattice, state.h, state.k, state.l);
    html += `<section><h3>Miller covector</h3>
      <p>取惯用胞矩阵 \\(C\\)，令 \\(\\mathbf r=C\\mathbf y\\) 与 \\(\\mathbf h=(h,k,l)^T\\)。平面族由 \\(\\mathbf h^T\\mathbf y=m\\) 定义，其笛卡尔法向为 \\(\\mathbf g_{hkl}=2\\pi C^{-T}\\mathbf h\\)。当前数值为</p>
      <div class="equation-block">\\[\\mathbf g_{hkl}=${vecLatex(G.toArray())}\\]</div>
      <p>面间距 \\(d_{hkl}=2\\pi/|\\mathbf g_{hkl}|=${fmt(d, 4)}\\)。在 \\(m=1\\) 的代表面上，三个分数截距为 \\(x=${intercepts[0]}\\)、\\(y=${intercepts[1]}\\)、\\(z=${intercepts[2]}\\)。</p>
      <p>对中心化点阵，\\(\\mathbf g_{hkl}\\) ${allowed ? '满足' : '不满足'}当前 ${lattice.centering} 中心化选择定则，因此${allowed ? '属于' : '不属于'}真实倒格 \\(L^*\\)。</p></section>
      <section><h3>等价面族</h3><p>点群把法向送到 \\(\\mathbf g'=W\\mathbf g_{hkl}\\)。当前 \\(\\{hkl\\}\\) 有 ${family.signedCount} 个带符号法向；识别 \\(\\mathbf g\\sim-\\mathbf g\\) 后得到 ${family.normals.length} 个取向。</p></section>`;
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
      <p>定义 \\(L^*=\\{\\mathbf G:\\mathbf G\\cdot\\mathbf R\\in2\\pi\\mathbb Z,\\ \\forall\\mathbf R\\in L\\}\\)。由 \\(A^TB=2\\pi I\\) 得 \\(B=2\\pi A^{-T}\\)，当前倒格基矩阵为</p>
      <div class="equation-block">\\[B=${matrixLatex(B)}\\]</div>
      <p>其三列 \\(\\mathbf b_j\\) 就是 \\(B\\) 的三列，长度 \\(|\\mathbf b_1|=${fmt(bLengths[0], 4)}\\)、\\(|\\mathbf b_2|=${fmt(bLengths[1], 4)}\\)、\\(|\\mathbf b_3|=${fmt(bLengths[2], 4)}\\)。
        倒胞体积 \\(V_p^*=|\\det B|=\\sqrt{\\det g^*}=${fmt(reciprocalVolume, 4)}\\)，与闭式 \\((2\\pi)^3/V_p=(2\\pi)^3/${fmt(cellVolume(lattice.primitive), 4)}=${fmt(closedForm, 4)}\\) ${volumeAgrees ? '一致' : '<strong>不一致</strong>'}。</p>
      <p>两条恒等式按残差核验，逐元素应全为 \\(0\\)：对偶关系 \\(A^TB=2\\pi I\\)，以及倒空间度量
        \\(g^*=B^TB\\) 与 \\(g^*=(2\\pi)^2g^{-1}\\)（等价于 \\(\\det g^*=(2\\pi)^6/\\det g\\)）。</p>
      <div class="equation-block">\\[\\begin{gathered}
        A^TB-2\\pi I=${matrixLatex(dualResidual, 3)}\\\\
        g^*-(2\\pi)^2g^{-1}=${metricAgrees ? matrixLatex(metricResidual, 3) : '\\text{（不一致）}'}
        \\end{gathered}\\]</div></section>`;
  }

  if (state.showWS) {
    const data = currentWignerSeitz(state, lattice);
    const first = data.activePlanes[0]?.R || new THREE.Vector3(1, 0, 0);
    const structural = state.mode === 'structure';
    html += `<section><h3>Wigner–Seitz ${structural ? '胞（按实际原子）' : '原胞'}</h3>
      <p>定义 \\(\\mathcal W=\\{\\mathbf r:|\\mathbf r|\\le|\\mathbf r-\\mathbf R|,\\ \\forall\\mathbf R\\in L\\setminus\\{0\\}\\}\\)。平方并消去 \\(|\\mathbf r|^2\\) 后，每个非零 \\(\\mathbf R\\) 给出半空间 \\(\\mathbf r\\!\\cdot\\!\\mathbf R\\le |\\mathbf R|^2/2\\)，因此</p>
      <div class="equation-block">\\[\\mathcal W=\\bigcap_{\\mathbf R\\ne0}\\left\\{\\mathbf r:\\mathbf r\\cdot\\mathbf R\\le\\frac{|\\mathbf R|^2}{2}\\right\\}.\\]</div>
      <p>${structural
        ? `带基元时 \\(\\mathbf R\\) 不再取 Bravais 格点，而是取以中心原子为原点的<strong>真实原子位移</strong>——W–S 胞是「离哪个原子最近」的划分，所以它属于原子而不是点阵。当前结构有 ${data.activePlanes.length} 个有效面和 ${data.vertices.length} 个顶点。`
        : `当前点阵有 ${data.activePlanes.length} 个有效面和 ${data.vertices.length} 个顶点。`}
      示例边界取 \\(\\mathbf R=${vecLatex(first.toArray())}\\)，右端为 \\(${fmt(first.lengthSq() / 2, 4)}\\)。</p></section>`;
  }

  if (state.showBZ) {
    const data = wignerSeitzCached(reciprocalVectors(lattice.primitive));
    html += `<section><h3>第一 Brillouin 区</h3><p>第一 Brillouin 区就是倒格 \\(L^*\\) 的 Wigner–Seitz 原胞，即 \\(\\mathrm{BZ}_1=\\mathrm{WS}(L^*)\\)。当前多面体有 ${data.activePlanes.length} 个面和 ${data.vertices.length} 个顶点。</p></section>`;
  }

  if (state.showKPath) {
    const path = getKPath(lattice.id);
    if (!path) {
      html += '<section><h3>k 路径</h3><p>当前 Bravais 类型没有内置完整的 HPKOT extended-case 判定，因此不生成未经标准化确认的标签。</p></section>';
    } else {
      const rows = Object.entries(path.points)
        .map(([name, q]) => `<tr><td>${displayKLabel(name)}</td><td>\\(${vecLatex(q)}\\)</td><td>${littleGroupAtK(lattice.primitive, q).order}</td></tr>`)
        .join('');
      html += `<section><h3>Bloch 周期性</h3><p>Bloch 态满足 \\(\\psi_{n\\mathbf k}(\\mathbf r)=e^{i\\mathbf k\\cdot\\mathbf r}u_{n\\mathbf k}(\\mathbf r)\\)，且 \\(E_n(\\mathbf k+\\mathbf G)=E_n(\\mathbf k)\\)。因此 \\(\\mathbf k\\) 定义在商空间 \\(\\mathbb R^3/L^*\\) 上，可取第一 BZ 为基本域。</p></section>
        <section><h3>little group</h3><p>定义 \\(G_{\\mathbf k}=\\{W\\in P(L):W\\mathbf k=\\mathbf k+\\mathbf G,\\ \\mathbf G\\in L^*\\}\\)。非平凡 \\(G_{\\mathbf k}\\) 约束能带不可约表示、简并和相容关系。</p></section>
        <section><h3>${path.variant}</h3><table class="ref-table"><thead><tr><th>label</th><th>primitive reciprocal coordinates</th><th>|G_k|</th></tr></thead><tbody>${rows}</tbody></table><p>HPKOT path：${path.path.map(([a, b]) => `${displayKLabel(a)}–${displayKLabel(b)}`).join(' · ')}</p></section>`;
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
    <p>全站采用列向量。原始基矩阵记为 \\(A=[\\mathbf a_1\\;\\mathbf a_2\\;\\mathbf a_3]\\)，笛卡尔向量和分数坐标满足 \\(\\mathbf r=A\\mathbf x\\)。Bravais 点阵为 \\(L=A\\mathbb Z^3\\)，度量为 \\(g=A^TA\\)，原胞体积为 \\(V_p=|\\det A|\\)。</p>
    <p>倒格采用物理学的 \\(2\\pi\\) 约定：\\(L^*=\\{\\mathbf G:e^{i\\mathbf G\\cdot\\mathbf R}=1,\\ \\forall\\mathbf R\\in L\\}\\)，因此 \\(B=2\\pi A^{-T}\\) 且 \\(A^TB=2\\pi I\\)。若文献使用 \\(B=A^{-T}\\)，Fourier 相位通常相应写成 \\(e^{2\\pi i\\mathbf k\\cdot\\mathbf r}\\)。</p>
    <p>点阵点群是 \\(P(L)=\\{W\\in O(3):WL=L\\}\\)。在原始分数基中，对应整数矩阵为 \\(M=A^{-1}WA\\in GL(3,\\mathbb Z)\\)。</p>
  </section>`;

  if (state.mode === 'structure') {
    const structure = STRUCTURES[state.structure];
    const bravais = BRAVAIS[structure.bravais];
    html += `<section><h3>${structure.name}</h3><dl class="fact-grid">
      <dt>Bravais</dt><dd>${bravais.name}</dd><dt>晶系</dt><dd>${CRYSTAL_SYSTEMS[bravais.system].name}</dd>
      <dt>点群</dt><dd>\\(${structure.pointGroupHM}\\) / \\(${structure.pointGroupS}\\)</dd><dt>空间群</dt><dd>\\(${structure.spaceGroup}\\) · No. ${structure.spaceGroupNo}</dd>
      <dt>配位数</dt><dd>${structure.coordination}</dd><dt>示例</dt><dd>${structure.example}</dd></dl>
      <p>结构位置统一写为 \\(\\mathbf r_{\\mathbf n\\alpha}=A\\mathbf n+\\boldsymbol\\tau_\\alpha\\)，其中 \\(\\mathbf n\\in\\mathbb Z^3\\)。最近邻关系为 \\(${structure.nearest}\\)，几何关系为 \\(${structure.packing}\\)。</p>
      <p>${jump('lattice', '格点')}${jump('primitive', '原胞')}${jump('conventional', '惯用胞')}</p></section>`;
  } else {
    html += `<section><h3>${lattice.name}</h3><dl class="fact-grid">
      <dt>晶系</dt><dd>${system.name}</dd><dt>中心化</dt><dd>${lattice.centering}</dd>
      <dt>holohedry</dt><dd>\\(${system.holohedry}\\) / \\(${system.schoenflies}\\)</dd><dt>|P(L)|</dt><dd>${pointGroup.order}</dd>
      <dt>V_p</dt><dd>${fmt(primitiveVolume, 4)}</dd><dt>V_conv / V_p</dt><dd>${multiplicity}</dd></dl>
      <p>${jump('lattice', '格点')}${jump('primitive', '原胞')}${jump('conventional', '惯用胞')}${jump('ws', 'W–S')}</p></section>`;
  }

  html += `<section><h3>惯用胞与 Miller 指数</h3>
    <p>设惯用胞矩阵为 \\(C=[\\mathbf c_1\\;\\mathbf c_2\\;\\mathbf c_3]\\)，并令 \\(\\mathbf r=C\\mathbf y\\)。整数三元组 \\(\\mathbf h=(h,k,l)^T\\) 通过 \\(\\mathbf h^T\\mathbf y=m\\) 定义平面族；对应的笛卡尔法向为 \\(\\mathbf g_{hkl}=2\\pi C^{-T}\\mathbf h\\)。</p>
    <p>对中心化点阵，只有满足中心化选择定则时 \\(\\mathbf g_{hkl}\\) 才属于真实倒格 \\(L^*\\)。当前 \\((${state.h}\\,${state.k}\\,${state.l})\\) ${allowed ? '满足' : '不满足'} ${lattice.centering} 中心化条件。</p>
    <p>${jump('family', '{hkl}')}${jump('g', 'gₕₖₗ')}</p></section>`;

  html += `<section><h3>正倒空间对应</h3>
    <p>由 \\(A^TB=2\\pi I\\) 有 \\(V_p^*=(2\\pi)^3/V_p\\)，并且第一 Brillouin 区就是 \\(\\mathrm{BZ}_1=\\mathrm{WS}(L^*)\\)。</p>
    <table class="ref-table"><thead><tr><th>实空间</th><th>倒空间</th></tr></thead><tbody>
      <tr><td>\\(L=A\\mathbb Z^3\\)</td><td>\\(L^*=B\\mathbb Z^3\\)</td></tr>
      <tr><td>原始基 \\(A\\)</td><td>倒格基 \\(B=2\\pi A^{-T}\\)</td></tr>
      <tr><td>Wigner–Seitz 原胞</td><td>第一 Brillouin 区</td></tr>
      <tr><td>平面 covector \\((hkl)\\)</td><td>法向 \\(\\mathbf g_{hkl}\\)</td></tr>
      <tr><td>惯用胞的中心化</td><td>互换：\\(F\\leftrightarrow I\\)，\\(P,C,R\\) 各自对应</td></tr></tbody></table>
    <p>中心化互换的后果是惯用胞不再相同：正空间 FCC 的倒点阵是 BCC，惯用胞为棱长 \\(4\\pi\\)（取 \\(a=1\\)）、带一个体心格点的立方体；正空间 BCC 则反之，得到带 6 个面心格点的立方体。</p>
    <p>${jump('reciprocal', '倒格点')}${jump('recipPrim', '倒格原胞')}${jump('recipConv', '倒格惯用胞')}${jump('bz', '第一 BZ')}</p></section>`;

  const kpath = getKPath(lattice.id);
  if (kpath) {
    html += `<section><h3>k 路径</h3><dl class="fact-grid"><dt>分支</dt><dd>${kpath.variant}</dd><dt>特殊点</dt><dd>${new Set(kpath.path.flat()).size}</dd><dt>路径段</dt><dd>${kpath.path.length}</dd></dl><p>${jump('kpath', '显示路径')}</p></section>`;
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
