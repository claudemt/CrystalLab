import { SPACE_GROUPS, POINT_GROUP_METADATA } from '../data/space-groups.js';
import { POINT_GROUP_TABLE } from '../core/symmetry.js';
import { BRAVAIS, SYSTEM_NAMES } from '../core/lattices.js';
import { $ } from './dom.js';
import { typesetMath } from './mathjax.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bravaisCodeById={
 'triclinic-P':'aP','monoclinic-P':'mP','monoclinic-C':'mC','orthorhombic-P':'oP','orthorhombic-C':'oC','orthorhombic-I':'oI','orthorhombic-F':'oF','tetragonal-P':'tP','tetragonal-I':'tI','rhombohedral-R':'hR','hexagonal-P':'hP','cubic-P':'cP','cubic-I':'cI','cubic-F':'cF'
};
const bravaisRows=Object.entries(BRAVAIS).map(([id,l])=>({id,code:bravaisCodeById[id],...l}));
const pointRows=POINT_GROUP_TABLE.map(([systemZh,hm,schoenflies],i)=>({number:i+1,systemZh,hm,schoenflies,meta:POINT_GROUP_METADATA[hm]}));
const codeToId=Object.fromEntries(Object.entries(bravaisCodeById).map(([id,code])=>[code,id]));

function symbolFeatures(g){
 const items=[`中心化 ${g.centering}`,`${g.bravais} Bravais`,g.symmorphic?'symmorphic':'nonsymmorphic',g.sohncke?'Sohncke':'含不正操作'];
 if(g.centrosymmetric)items.push('中心对称');
 if(g.polar)items.push('极性点群');
 if(g.hasGlide)items.push('H–M 符号含滑移面');
 return items;
}
// 逐条详情的正文只保留该条目独有的内容；Seitz 算符、H–M 读法、平移群与倒格约定
// 对同类条目完全一致，统一放在「约定」页，避免 230 条各重复一遍。
function detailSpaceGroup(g){
 const nonsym=g.nonsymmorphic
   ?`该群含不能通过改变原点消去的分数平移，因此应保留完整 Seitz 算符 \\(\\{W|\\boldsymbol\\tau\\}\\)。`
   :`该群为 symmorphic：可选原点使空间群写成 Bravais 平移群与点群的半直积。`;
 return `
 <div class="catalog-detail-head"><div><span class="catalog-number">#${g.number}</span><h2>${esc(g.hm)}</h2></div><span class="catalog-system">${g.systemZh}</span></div>
 <div class="catalog-tags">${symbolFeatures(g).map(x=>`<span>${esc(x)}</span>`).join('')}</div>
 <dl class="catalog-facts">
   <dt>Hermann–Mauguin</dt><dd>${esc(g.hm)}</dd>
   <dt>点群</dt><dd>${esc(g.pointGroup)} &nbsp; / &nbsp; ${esc(g.schoenflies)}</dd>
   <dt>Laue 类</dt><dd>${esc(g.laue)}</dd>
   <dt>Bravais</dt><dd>${esc(g.bravais)} · ${esc(g.centering)}-centred</dd>
   <dt>点群阶</dt><dd>${g.pointGroupOrder}</dd>
   <dt>中心对称</dt><dd>${g.centrosymmetric?'是':'否'}</dd>
   <dt>极性</dt><dd>${g.polar?'是':'否'}</dd>
   <dt>Sohncke</dt><dd>${g.sohncke?'是（只含 proper rotations + translations）':'否'}</dd>
 </dl>
 <section class="catalog-theory-block"><h3>群的类型</h3><p>${nonsym}</p></section>`;
}
function detailPointGroup(g){
 const m=g.meta||{};
 return `<div class="catalog-detail-head"><div><span class="catalog-number">点群</span><h2>${esc(g.hm)}</h2></div><span class="catalog-system">${esc(g.systemZh)}</span></div>
 <dl class="catalog-facts"><dt>H–M</dt><dd>${esc(g.hm)}</dd><dt>Schoenflies</dt><dd>${esc(g.schoenflies)}</dd><dt>晶系</dt><dd>${esc(g.systemZh)}</dd><dt>阶</dt><dd>${m.order??'—'}</dd><dt>Laue</dt><dd>${esc(m.laue??'—')}</dd><dt>中心对称</dt><dd>${m.centro?'是':'否'}</dd><dt>极性</dt><dd>${m.polar?'是':'否'}</dd></dl>`;
}
function detailBravais(g){
 return `<div class="catalog-detail-head"><div><span class="catalog-number">Bravais</span><h2>${esc(g.code)}</h2></div><span class="catalog-system">${esc(SYSTEM_NAMES[g.system])}</span></div>
 <div class="catalog-tags"><span>${esc(g.name)}</span><span>中心化 ${esc(g.centering)}</span></div>`;
}

// 参考页只保留跨对象的数学约定；短定义全部行内，避免把索引器排成教材式公式墙。
// 各条目详情页只写自身独有的内容，凡是同类条目完全一致的约定都收敛到这里。
function detailReference(){
 return `<div class="catalog-detail-head"><div><span class="catalog-number">Convention</span><h2>约定</h2></div><span class="catalog-system">CrystalLab</span></div>
 <section class="catalog-theory-block"><h3>向量、基与坐标</h3>
 <p>向量均视为列向量。原始基矩阵是 \\(A=[\\mathbf a_1\\;\\mathbf a_2\\;\\mathbf a_3]\\)，笛卡尔向量与分数坐标满足 \\(\\mathbf r=A\\mathbf x\\)，Bravais 点阵为 \\(L=A\\mathbb Z^3\\)。度量和原胞体积分别为 \\(g=A^TA\\) 与 \\(V_p=|\\det A|\\)。</p></section>
 <section class="catalog-theory-block"><h3>点阵、基元与晶体位置</h3>
 <p>Bravais 点阵 \\(L=A\\mathbb Z^3\\) 只描述平移等价点集，不含原子种类或 basis。含基元的晶体，其第 \\(\\alpha\\) 个原子的位置为 \\(\\mathbf r_{\\mathbf n\\alpha}=A\\mathbf n+\\boldsymbol\\tau_\\alpha\\)。长度、夹角、体积和倒格因此都由同一个 \\(A\\) 决定。</p></section>
 <section class="catalog-theory-block"><h3>倒格：\\(2\\pi\\) 约定</h3>
 <p>定义 \\(L^*=\\{\\mathbf G:e^{i\\mathbf G\\cdot\\mathbf R}=1,\\ \\forall\\mathbf R\\in L\\}\\)。因此 \\(B=2\\pi A^{-T}\\) 且 \\(\\mathbf a_i\\cdot\\mathbf b_j=2\\pi\\delta_{ij}\\)。若文献写 \\(B=A^{-T}\\)，通常同时把 Fourier 相位写成 \\(e^{2\\pi i\\mathbf k\\cdot\\mathbf r}\\)。</p></section>
 <section class="catalog-theory-block"><h3>Miller 指数</h3>
 <p>若惯用胞矩阵为 \\(C\\) 且 \\(\\mathbf r=C\\mathbf y\\)，则整数 covector \\(\\mathbf h=(h,k,l)^T\\) 通过 \\(\\mathbf h^T\\mathbf y=m\\) 定义平面族，笛卡尔法向为 \\(\\mathbf g_{hkl}=2\\pi C^{-T}\\mathbf h\\)。对中心化点阵，只有满足选择定则时 \\(\\mathbf g_{hkl}\\in L^*\\)。</p></section>
 <section class="catalog-theory-block"><h3>点群与空间群</h3>
 <p>点阵点群是 \\(P(L)=\\{W\\in O(3):WL=L\\}\\)，即每个 \\(W\\) 满足 \\(W^TW=I\\)；等价的分数坐标判据是 \\(M=A^{-1}WA\\in GL(3,\\mathbb Z)\\)。点群只保留线性部分 \\(W\\)。</p>
 <p>空间群元素写成 Seitz 形式 \\(\\{W|\\boldsymbol\\tau\\}\\)。由 \\(\\mathbf r=A\\mathbf x\\) 得 \\(\\mathbf r'=W\\mathbf r+\\boldsymbol\\tau\\)，或等价地 \\(\\mathbf x'=M\\mathbf x+\\mathbf t\\)，其中 \\(\\boldsymbol\\tau=A\\mathbf t\\)。含不能通过改变原点消去的分数平移时，必须保留完整 Seitz 算符；symmorphic 群则可选原点写成 Bravais 平移群与点群的半直积。</p></section>
 <section class="catalog-theory-block"><h3>H–M 与 Schoenflies 记号</h3>
 <p>Hermann–Mauguin 描述标准晶体学方向上的对称元素：首字母 a/b/c/I/F/R 指 Bravais 中心化，后续符号按该晶系的标准对称方向排列，整数表示旋转轴，带下标的整数表示螺旋轴，m 表示镜面，a/b/c/n/d/e 表示滑移面。Schoenflies 标识点群类型；International No. 1–230 标识空间群类型；Hall 符号进一步固定生成元与 setting。</p></section>`;
}

// 「约定与速查」只以详情形态存在，没有列表：rows() 返回一条合成行。
// 检索器的类别元数据集中定义，避免各分支重复维护。
const KIND={
 space:{
   defaultId:225,
   key:g=>g.number,
   rows:({q,sys})=>SPACE_GROUPS.filter(g=>(sys==='all'||g.system===sys)&&(!q||`${g.number} ${g.hm} ${g.pointGroup} ${g.schoenflies} ${g.bravais} ${g.systemZh}`.toLowerCase().includes(q))),
   row:g=>`<span class="row-no">${g.number}</span><strong>${esc(g.hm)}</strong><span>${esc(g.pointGroup)}</span><em>${esc(g.bravais)}</em>`,
   find:id=>SPACE_GROUPS.find(x=>x.number===Number(id))||SPACE_GROUPS[0],
   detail:detailSpaceGroup,
   bravaisId:g=>codeToId[g.bravais]??null
 },
 point:{
   defaultId:'m-3m',
   key:g=>g.hm,
   rows:({q,sys})=>pointRows.filter(g=>(sys==='all'||({三斜:'triclinic',单斜:'monoclinic',正交:'orthorhombic',四方:'tetragonal',三方:'trigonal',六方:'hexagonal',立方:'cubic'}[g.systemZh])===sys)&&(!q||`${g.hm} ${g.schoenflies} ${g.systemZh}`.toLowerCase().includes(q))),
   row:g=>`<span class="row-no">${g.number}</span><strong>${esc(g.hm)}</strong><span>${esc(g.schoenflies)}</span><em>${esc(g.systemZh)}</em>`,
   find:id=>pointRows.find(x=>x.hm===id)||pointRows[0],
   detail:detailPointGroup,
   bravaisId:()=>null
 },
 bravais:{
   defaultId:'cubic-F',
   key:g=>g.id,
   rows:({q,sys})=>bravaisRows.filter(g=>(sys==='all'||g.system===sys)&&(!q||`${g.code} ${g.name} ${g.centering} ${SYSTEM_NAMES[g.system]}`.toLowerCase().includes(q))),
   row:g=>`<span class="row-no">${esc(g.code)}</span><strong>${esc(g.name)}</strong><span>${esc(g.centering)}</span><em>${esc(SYSTEM_NAMES[g.system])}</em>`,
   find:id=>bravaisRows.find(x=>x.id===id)||bravaisRows[0],
   detail:detailBravais,
   bravaisId:g=>g.id
 },
 reference:{
   defaultId:'ref',noFilter:true,
   key:g=>g.id,
   rows:()=>[{id:'ref'}],
   row:()=>`<span class="row-no">速查</span><strong>约定与速查</strong><span>符号体系</span><em>统一语言</em>`,
   find:()=>({id:'ref'}),
   detail:detailReference,
   bravaisId:()=>null
 }
};

export function initCatalog(){
 const area=$('#catalogArea');if(!area)return {setVisible(){}};
 const search=$('#catalogSearch'),system=$('#catalogSystemFilter'),kindBtns=[...area.querySelectorAll('[data-catalog-kind]')],list=$('#catalogList'),detail=$('#catalogDetail'),count=$('#catalogCount');
 let kind='space',selected=KIND.space.defaultId;
 const systems=['all','triclinic','monoclinic','orthorhombic','tetragonal','trigonal','hexagonal','cubic'];
 system.innerHTML=systems.map(x=>`<option value="${x}">${x==='all'?'全部晶系':({triclinic:'三斜',monoclinic:'单斜',orthorhombic:'正交',tetragonal:'四方',trigonal:'三方',hexagonal:'六方',cubic:'立方'}[x])}</option>`).join('');
 const spec=()=>KIND[kind];
 function rows(){const q=search.value.trim().toLowerCase(),sys=system.value;return spec().rows({q,sys})}
 function renderList(){
   const k=spec(),rs=rows();count.textContent=`${rs.length} 条`;
   list.innerHTML=rs.map(g=>`<button data-id="${esc(k.key(g))}" class="catalog-row ${selected===k.key(g)?'active':''}">${k.row(g)}</button>`).join('');
   if(rs.length&&!rs.some(g=>k.key(g)===selected)){selected=k.defaultId;renderList();}
   renderDetail();
 }
 // space 的 id 是数字，其余是字符串——统一在这里还原，避免每个 kind 各写一遍。
 const rawKey=v=>kind==='space'?Number(v):v;
 function renderDetail(){
   const k=spec(),g=k.find(selected);
   const latticeId=k.bravaisId(g);
   // data-action="openIn3D" 由 bindWorkbench 的全局委派接管——catalog 不自留 onOpenIn3D 回调。
   detail.innerHTML=k.detail(g)+(latticeId?`<button class="catalog-jump" data-action="openIn3D" data-jump="${esc(latticeId)}"><span>◈</span><span>在 3D 中查看该 Bravais 格子</span></button>`:'');
   typesetMath([detail]);
 }
 // kind/selected 是 catalog 自己的视图状态（architecture.md 把它列为独立工作区），
 // 所以这里自留一份**作用域限定在 #catalogArea** 的委派，不提升为 app action。
 // 行按钮每次 renderList() 都重建——逐元素绑定必须跟着重绑，委派则挂一次管到底。
 area.addEventListener('click',event=>{
   const row=event.target.closest('.catalog-row');
   if(row){selected=rawKey(row.dataset.id);renderList();renderDetail();return;}
   const kindBtn=event.target.closest('[data-catalog-kind]');
   if(kindBtn){kind=kindBtn.dataset.catalogKind;selected=spec().defaultId;system.disabled=!!spec().noFilter;
     kindBtns.forEach(x=>x.classList.toggle('active',x===kindBtn));renderList();}
 });
 // 检索框与晶系筛选不在其中：前者要边打边筛，绑 input；后者是唯一一个不需要选区状态的选择器。
 search.addEventListener('input',renderList);system.addEventListener('change',renderList);renderList();
  return {setVisible(v){area.classList.toggle('hidden',!v);if(v)renderList()}};
}
