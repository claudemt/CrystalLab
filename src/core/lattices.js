const deg = d => d * Math.PI / 180;
const v = (x, y, z) => [x, y, z];
const add = (a,b) => a.map((x,i)=>x+b[i]);
const scale = (a,s) => a.map(x=>x*s);
const lincomb = (A,B,C,x,y,z) => add(add(scale(A,x),scale(B,y)),scale(C,z));

function triclinicVectors(a,b,c,alpha,beta,gamma){
  const ca=Math.cos(deg(alpha)), cb=Math.cos(deg(beta)), cg=Math.cos(deg(gamma));
  const sg=Math.sin(deg(gamma));
  const A=v(a,0,0), B=v(b*cg,b*sg,0);
  const cx=c*cb, cy=c*(ca-cb*cg)/sg;
  const cz=Math.sqrt(Math.max(0,c*c-cx*cx-cy*cy));
  return [A,B,v(cx,cy,cz)];
}

function rhombohedralPrimitive(alphaDeg=75){
  const c=Math.cos(deg(alphaDeg));
  const t=(c+.5)/(1-c);
  const rho=1/Math.sqrt(1+t), z=Math.sqrt(t)*rho;
  return [
    v(rho,0,z),
    v(-rho/2,Math.sqrt(3)*rho/2,z),
    v(-rho/2,-Math.sqrt(3)*rho/2,z)
  ];
}

function conventional(system){
  switch(system){
    case 'triclinic': return triclinicVectors(1,1.16,.88,75,83,68);
    case 'monoclinic': {
      const beta=deg(105); return [v(1,0,0),v(0,1.28,0),v(.82*Math.cos(beta),0,.82*Math.sin(beta))];
    }
    case 'orthorhombic': return [v(1,0,0),v(0,1.28,0),v(0,0,.78)];
    case 'tetragonal': return [v(1,0,0),v(0,1,0),v(0,0,1.42)];
    case 'trigonal': return rhombohedralPrimitive();
    case 'hexagonal': return [v(1,0,0),v(-.5,Math.sqrt(3)/2,0),v(0,0,Math.sqrt(8/3))];
    case 'cubic': return [v(1,0,0),v(0,1,0),v(0,0,1)];
    default: return [v(1,0,0),v(0,1,0),v(0,0,1)];
  }
}

function primitiveFromCentering(conv,centering){
  const [A,B,C]=conv;
  if(centering==='P'||centering==='R') return [A,B,C];
  if(centering==='I') return [lincomb(A,B,C,-.5,.5,.5),lincomb(A,B,C,.5,-.5,.5),lincomb(A,B,C,.5,.5,-.5)];
  if(centering==='F') return [lincomb(A,B,C,0,.5,.5),lincomb(A,B,C,.5,0,.5),lincomb(A,B,C,.5,.5,0)];
  if(centering==='C') return [lincomb(A,B,C,.5,.5,0),lincomb(A,B,C,-.5,.5,0),C];
  return [A,B,C];
}

// 倒点阵的中心化类型与正空间成对互换：I 与 F 对调，P、C、R 自对应。
// FCC 的倒点阵是 BCC，正是这组互换的直接后果。
export const RECIPROCAL_CENTERING={P:'P',I:'F',F:'I',C:'C',R:'R'};

// primitiveFromCentering 的逆运算：由原胞基矢还原同一点阵的惯用胞基矢。
// I: a1=½(-A+B+C) ⇒ A=a2+a3；F: a1=½(B+C) ⇒ A=a2+a3-a1；C: a1=½(A+B) ⇒ A=a1-a2。
export function conventionalFromPrimitive(prim,centering){
  const [a1,a2,a3]=prim;
  const p=(u,w)=>add(u,w), m=(u,w)=>u.map((x,i)=>x-w[i]);
  if(centering==='I') return [p(a2,a3),p(a1,a3),p(a1,a2)];
  if(centering==='F') return [m(p(a2,a3),a1),m(p(a1,a3),a2),m(p(a1,a2),a3)];
  if(centering==='C') return [m(a1,a2),p(a1,a2),a3.slice()];
  return [a1.slice(),a2.slice(),a3.slice()];
}

// 惯用胞内的中心化位点（分数坐标）。把它们画出来，惯用胞才能自证是 P/I/F/C 中的哪一种——
// 否则一个棱长 4π 的空立方体和一个棱长 2π 的空立方体看起来只是大小不同。
const CENTERING_SITES={
  P:[],
  I:[[.5,.5,.5]],
  F:[[.5,.5,0],[.5,.5,1],[.5,0,.5],[.5,1,.5],[0,.5,.5],[1,.5,.5]],
  C:[[.5,.5,0],[.5,.5,1]]
};
export function centeringSites(centering){return CENTERING_SITES[centering]||[];}

export const CRYSTAL_SYSTEMS={
  triclinic:{name:'三斜',metric:'a\\ne b\\ne c;\\; \\alpha\\ne\\beta\\ne\\gamma',angles:'无固定直角',holohedry:'\\bar 1',schoenflies:'C_i',defaultOp:'inversion'},
  monoclinic:{name:'单斜',metric:'a\\ne b\\ne c;\\; \\alpha=\\gamma=90^\\circ,\\;\\beta\\ne90^\\circ',angles:'唯一轴取 b',holohedry:'2/m',schoenflies:'C_{2h}',defaultOp:'c2y'},
  orthorhombic:{name:'正交',metric:'a\\ne b\\ne c;\\; \\alpha=\\beta=\\gamma=90^\\circ',angles:'三轴正交',holohedry:'mmm',schoenflies:'D_{2h}',defaultOp:'c2z'},
  tetragonal:{name:'四方',metric:'a=b\\ne c;\\; \\alpha=\\beta=\\gamma=90^\\circ',angles:'四重轴沿 c',holohedry:'4/mmm',schoenflies:'D_{4h}',defaultOp:'c4z'},
  trigonal:{name:'三方（菱方 R）',metric:'a=b=c;\\; \\alpha=\\beta=\\gamma\\ne90^\\circ',angles:'菱方轴设置',holohedry:'\\bar 3m',schoenflies:'D_{3d}',defaultOp:'c3z'},
  hexagonal:{name:'六方',metric:'a=b\\ne c;\\; \\alpha=\\beta=90^\\circ,\\;\\gamma=120^\\circ',angles:'六重轴沿 c',holohedry:'6/mmm',schoenflies:'D_{6h}',defaultOp:'c6z'},
  cubic:{name:'立方',metric:'a=b=c;\\; \\alpha=\\beta=\\gamma=90^\\circ',angles:'最高对称',holohedry:'m\\bar 3m',schoenflies:'O_h',defaultOp:'c4z'}
};

const defs=[
  ['triclinic-P','三斜 P','triclinic','P','只有原始点阵。'],
  ['monoclinic-P','单斜 P','monoclinic','P','两组直角，一组非直角。'],
  ['monoclinic-C','单斜 C','monoclinic','C','C-中心化：ab 面中心存在等价格点。'],
  ['orthorhombic-P','正交 P','orthorhombic','P','三轴两两垂直，长度一般不同。'],
  ['orthorhombic-C','正交 C','orthorhombic','C','底心正交点阵。'],
  ['orthorhombic-I','正交 I','orthorhombic','I','体心正交点阵。'],
  ['orthorhombic-F','正交 F','orthorhombic','F','面心正交点阵。'],
  ['tetragonal-P','四方 P','tetragonal','P','a=b≠c，三轴互相垂直。'],
  ['tetragonal-I','四方 I','tetragonal','I','体心四方点阵。'],
  ['rhombohedral-R','三方 R（菱方）','trigonal','R','三条原始矢量等长、两两夹角相等。'],
  ['hexagonal-P','六方 P','hexagonal','P','基面 120°，c 轴垂直；HCP 的 Bravais lattice。'],
  ['cubic-P','立方 P','cubic','P','简单立方。'],
  ['cubic-I','立方 I','cubic','I','体心立方。'],
  ['cubic-F','立方 F','cubic','F','面心立方。']
];

export const BRAVAIS=Object.fromEntries(defs.map(([id,name,system,centering,note])=>{
  const conv=conventional(system), primitive=primitiveFromCentering(conv,centering);
  return [id,{id,name,system,centering,note,conventional:conv,primitive}];
}));

export const SYSTEM_NAMES=Object.fromEntries(Object.entries(CRYSTAL_SYSTEMS).map(([k,x])=>[k,x.name]));

export const STRUCTURES={
  sc:{
    name:'Simple cubic · 简单立方', short:'SC', bravais:'cubic-P', formula:'A', example:'α-Po',
    basis:[{label:'A',offset:[0,0,0],color:'#8fa7b3'}],
    pointGroupHM:'m\\bar 3m',pointGroupS:'O_h',spaceGroup:'Pm\\bar 3m',spaceGroupNo:221,
    coordination:'6',nearest:'d_{nn}=a',packing:'\\eta=\\pi/6\\approx0.524',cellContent:'1 atom / conventional cell',
    planes:['{100}','{110}','{111}'],directions:['⟨100⟩','⟨110⟩','⟨111⟩'],extinction:'P 点阵无中心化消光。',
    note:'单原子简单立方中，晶体结构与 P 型立方 Bravais lattice 重合。'
  },
  bcc:{
    name:'BCC · 体心立方', short:'BCC', bravais:'cubic-I', formula:'A', example:'α-Fe, W',
    basis:[{label:'A',offset:[0,0,0],color:'#8fa7b3'}],
    pointGroupHM:'m\\bar 3m',pointGroupS:'O_h',spaceGroup:'Im\\bar 3m',spaceGroupNo:229,
    coordination:'8',nearest:'d_{nn}=\\sqrt3 a/2',packing:'\\eta=\\sqrt3\\pi/8\\approx0.680',cellContent:'2 atoms / conventional cell',
    planes:['{110} (最密)','{200}','{211}'],directions:['⟨111⟩ (最近邻)','⟨100⟩','⟨110⟩'],extinction:'I 点阵：h+k+l 为偶数时才是倒格点。',
    note:'BCC 本身是 Bravais lattice；体心与角点由原始平移相互生成。'
  },
  fcc:{
    name:'FCC · 面心立方', short:'FCC', bravais:'cubic-F', formula:'A', example:'Al, Cu, Ag, Au',
    basis:[{label:'A',offset:[0,0,0],color:'#8fa7b3'}],
    pointGroupHM:'m\\bar 3m',pointGroupS:'O_h',spaceGroup:'Fm\\bar 3m',spaceGroupNo:225,
    coordination:'12',nearest:'d_{nn}=a/\\sqrt2',packing:'\\eta=\\pi/(3\\sqrt2)\\approx0.740',cellContent:'4 atoms / conventional cell',
    planes:['{111} (密排面)','{200}','{220}'],directions:['⟨110⟩ (密排方向)','⟨100⟩','⟨111⟩'],extinction:'F 点阵：h,k,l 必须全奇或全偶。',
    note:'FCC 本身是 Bravais lattice；{111} 是密排面，⟨110⟩ 是密排方向。'
  },
  diamond:{
    name:'Diamond · 金刚石', short:'diamond', bravais:'cubic-F', formula:'A', example:'C, Si, Ge',
    basis:[{label:'A',offset:[0,0,0],color:'#8fa7b3'},{label:'A',offset:[.25,.25,.25],color:'#8fa7b3'}],basisCoordinates:'conventional',
    pointGroupHM:'m\\bar 3m',pointGroupS:'O_h',spaceGroup:'Fd\\bar 3m',spaceGroupNo:227,
    coordination:'4',nearest:'d_{nn}=\\sqrt3 a/4',packing:'\\eta=\\pi\\sqrt3/16\\approx0.340',cellContent:'8 atoms / conventional cell',
    planes:['{111}','{220}','{311}'],directions:['⟨111⟩ (键方向)','⟨110⟩','⟨100⟩'],extinction:'F 中心化之外还有 diamond basis 的结构因子条件。',
    note:'diamond = FCC Bravais lattice + 两点基元 (0,0,0) 与 (1/4,1/4,1/4)。'
  },
  nacl:{
    name:'NaCl · 岩盐', short:'rock salt', bravais:'cubic-F', formula:'NaCl', example:'NaCl, MgO',
    basis:[{label:'Cl',offset:[0,0,0],color:'#7f9b78'},{label:'Na',offset:[.5,0,0],color:'#c39a57'}],basisCoordinates:'conventional',
    pointGroupHM:'m\\bar 3m',pointGroupS:'O_h',spaceGroup:'Fm\\bar 3m',spaceGroupNo:225,
    coordination:'6 : 6',nearest:'d_{Na-Cl}=a/2',packing:'r_++r_-=a/2（接触模型）',cellContent:'4 NaCl / conventional cell',
    planes:['{100}','{110}','{111}'],directions:['⟨100⟩','⟨110⟩','⟨111⟩'],extinction:'F 中心化控制 Bravais 倒格点；Na/Cl basis 再决定强度。',
    note:'NaCl 由两个互相错开半个晶格常数的 FCC 子晶格组成。'
  },
  cscl:{
    name:'CsCl · 氯化铯', short:'CsCl', bravais:'cubic-P', formula:'CsCl', example:'CsCl',
    basis:[{label:'Cs',offset:[0,0,0],color:'#c39a57'},{label:'Cl',offset:[.5,.5,.5],color:'#7f9b78'}],basisCoordinates:'conventional',
    pointGroupHM:'m\\bar 3m',pointGroupS:'O_h',spaceGroup:'Pm\\bar 3m',spaceGroupNo:221,
    coordination:'8 : 8',nearest:'d_{Cs-Cl}=\\sqrt3 a/2',packing:'r_++r_-=\\sqrt3 a/2（接触模型）',cellContent:'1 CsCl / conventional cell',
    planes:['{100}','{110}','{111}'],directions:['⟨111⟩ (异种最近邻)','⟨100⟩','⟨110⟩'],extinction:'Bravais lattice 为 P；basis 导致不同 hkl 的结构因子强度差异。',
    note:'几何外观类似 BCC，但角点与体心是不同物种，因此不能由纯平移互换；Bravais lattice 是 simple cubic。'
  },
  hcp:{
    name:'HCP · 六方密堆积', short:'HCP', bravais:'hexagonal-P', formula:'A', example:'Mg, Zn, Ti(α)',
    basis:[{label:'A',offset:[0,0,0],color:'#8fa7b3'},{label:'A',offset:[2/3,1/3,.5],color:'#8fa7b3'}],basisCoordinates:'primitive',
    pointGroupHM:'6/mmm',pointGroupS:'D_{6h}',spaceGroup:'P6_3/mmc',spaceGroupNo:194,
    coordination:'12',nearest:'d_{nn}=a（理想密堆积）',packing:'c/a=\\sqrt{8/3}\\approx1.633,\\;\\eta\\approx0.740',cellContent:'2 atoms / primitive parallelepiped',
    planes:['(0001) basal','{10-10} prismatic','{10-11} pyramidal'],directions:['⟨11-20⟩ a-direction','[0001] c-axis'],extinction:'六方晶体常用四指数 Miller–Bravais 记号；i=-(h+k)。',
    note:'HCP 不是第 15 种 Bravais lattice；它是 hexagonal P + 两点基元。'
  },
  zincblende:{
    name:'Zinc blende · 闪锌矿', short:'zinc blende', bravais:'cubic-F', formula:'AB', example:'ZnS, GaAs',
    basis:[{label:'A',offset:[0,0,0],color:'#83a7b8'},{label:'B',offset:[.25,.25,.25],color:'#bd7f6b'}],basisCoordinates:'conventional',
    pointGroupHM:'\\bar 43m',pointGroupS:'T_d',spaceGroup:'F\\bar 43m',spaceGroupNo:216,
    coordination:'4 : 4',nearest:'d_{AB}=\\sqrt3 a/4',packing:'四面体配位；无反演中心',cellContent:'4 AB / conventional cell',
    planes:['{111}','{220}','{311}'],directions:['⟨111⟩ (键方向)','⟨110⟩'],extinction:'F 中心化 + 两种原子的 basis 共同决定结构因子。',
    note:'几何骨架与 diamond 相近，但两个子格由不同原子占据，因此点群降为 T_d，空间群 F-43m。'
  }
};

export function basisOffsetCartesian(structure,basisItem){
  const lattice=BRAVAIS[structure.bravais];
  const vecs=structure.basisCoordinates==='primitive'?lattice.primitive:lattice.conventional;
  return lincomb(vecs[0],vecs[1],vecs[2],...basisItem.offset);
}
