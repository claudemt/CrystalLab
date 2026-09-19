import { BRAVAIS, STRUCTURES, RECIPROCAL_CENTERING, conventionalFromPrimitive, centeringSites } from '../src/core/lattices.js';
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const scale=(a,s)=>a.map(x=>x*s);
const volume=v=>Math.abs(dot(v[0],cross(v[1],v[2])));
const reciprocal=v=>{const V=dot(v[0],cross(v[1],v[2])); const f=2*Math.PI/V; return [scale(cross(v[1],v[2]),f),scale(cross(v[2],v[0]),f),scale(cross(v[0],v[1]),f)]};
let failed=false;
for(const lattice of Object.values(BRAVAIS)){
  const vp=volume(lattice.primitive), vc=volume(lattice.conventional), ratio=vc/vp;
  const expected=lattice.centering==='F'?4:(lattice.centering==='I'||lattice.centering==='C'?2:1);
  const b=reciprocal(lattice.primitive),vpStar=volume(b);
  const err=Math.max(...lattice.primitive.flatMap((a,i)=>b.map((bb,j)=>Math.abs(dot(a,bb)-(i===j?2*Math.PI:0)))));
  const volumeErr=Math.abs(vp*vpStar-(2*Math.PI)**3);
  const ok=Math.abs(ratio-expected)<1e-9 && err<1e-9 && volumeErr<1e-8;
  failed ||= !ok;
  console.log(`${ok?'✓':'✗'} ${lattice.name.padEnd(12)} Vconv/Vprim=${ratio.toFixed(6)}  dual-error=${err.toExponential(2)}  volume-dual=${volumeErr.toExponential(2)}`);
}
const identities={diamond:'cubic-F',nacl:'cubic-F',cscl:'cubic-P',hcp:'hexagonal-P'};
for(const [name,bravais] of Object.entries(identities)){
  const ok=STRUCTURES[name].bravais===bravais; failed||=!ok; console.log(`${ok?'✓':'✗'} ${name} -> ${STRUCTURES[name].bravais}`);
}
// 倒格惯用胞必须是倒格点阵的真晶胞：基矢与中心化位点都得是倒格矢的整数组合，
// 且体积比等于该中心化类型的重数。只看体积是不够的——把正空间惯用胞直接乘 2π 得到的
// 那只 2π 立方体，对 FCC 体积比也是 4，但它的基矢 2π(1,0,0) 根本不是倒格矢
// （h,k,l 奇偶混合被 FCC 消光），画出来就是个棱长只有真晶胞一半的空壳子。
const inv3=N=>{
  const [[a,b,c],[d,e,f],[g,h,i]]=N;
  const A=e*i-f*h,B=-(d*i-f*g),C=d*h-e*g,det=a*A+b*B+c*C;
  const D=-(b*i-c*h),E=a*i-c*g,F=-(a*h-b*g);
  const G=b*f-c*e,H=-(a*f-c*d),I=a*e-b*d;
  return [[A,D,G],[B,E,H],[C,F,I]].map(r=>r.map(x=>x/det));
};
const integerError=(p,frac)=>Math.max(...frac(p).map(x=>Math.abs(x-Math.round(x))));
for(const lattice of Object.values(BRAVAIS)){
  const b=reciprocal(lattice.primitive);
  const centering=RECIPROCAL_CENTERING[lattice.centering];
  const cell=conventionalFromPrimitive(b,centering);
  const frac=p=>inv3([0,1,2].map(i=>b.map(v=>v[i]))).map(row=>row.reduce((s,x,i)=>s+x*p[i],0));
  const pointOf=f=>[0,1,2].map(d=>cell[0][d]*f[0]+cell[1][d]*f[1]+cell[2][d]*f[2]);
  const vecErr=Math.max(...cell.map(p=>integerError(p,frac)));
  const siteErr=Math.max(0,...centeringSites(centering).map(f=>integerError(pointOf(f),frac)));
  const mult={P:1,R:1,I:2,F:4,C:2}[centering];
  const ratioErr=Math.abs(volume(cell)/volume(b)-mult);
  const ok=vecErr<1e-9&&siteErr<1e-9&&ratioErr<1e-9;
  failed ||= !ok;
  console.log(`${ok?'✓':'✗'} ${lattice.name.padEnd(12)} 倒格 ${lattice.centering}→${centering}  基矢整数误差=${vecErr.toExponential(2)}  位点整数误差=${siteErr.toExponential(2)}  体积比误差=${ratioErr.toExponential(2)}`);
}
{
  // 两个立方镜像案例：正空间 FCC 的倒点阵是 BCC，正空间 BCC 的倒点阵是 FCC。
  // 两者惯用胞都是棱长 4π 的立方，区别只在中心化位点是 1 个（体心）还是 6 个（面心）。
  const cases=[
    {id:'cubic-F',want:'I',wantSites:1,bodyC:2*Math.PI,label:'FCC → 倒格 BCC（棱长 4π，体心 2π(1,1,1)）'},
    {id:'cubic-I',want:'F',wantSites:6,bodyC:null,label:'BCC → 倒格 FCC（棱长 4π，6 个面心）'}
  ];
  for(const c of cases){
    const lattice=BRAVAIS[c.id];
    const centering=RECIPROCAL_CENTERING[lattice.centering];
    const cell=conventionalFromPrimitive(reciprocal(lattice.primitive),centering);
    const edge=cell.map(a=>Math.hypot(...a));
    const sites=centeringSites(centering).map(f=>[0,1,2].map(d=>cell[0][d]*f[0]+cell[1][d]*f[1]+cell[2][d]*f[2]));
    const ok=centering===c.want
      && sites.length===c.wantSites
      && edge.every(x=>Math.abs(x-4*Math.PI)<1e-9)
      && (c.bodyC===null||sites[0].every(x=>Math.abs(x-c.bodyC)<1e-9));
    failed ||= !ok;
    console.log(`${ok?'✓':'✗'} ${c.label} · edge=${edge.map(x=>x.toFixed(3)).join(',')} sites=${sites.length}`);
  }
  // 反向断言：正空间惯用胞直接乘 2π 得到的不是倒格晶胞。这条把「为什么不能那么写」钉进测试里，
  // 免得以后有人看着 2πC^{-T} 更简单就换回去。
  const fcc=BRAVAIS['cubic-F'];
  const naive=reciprocal(fcc.conventional);
  const b=reciprocal(fcc.primitive);
  const frac=p=>inv3([0,1,2].map(i=>b.map(v=>v[i]))).map(row=>row.reduce((s,x,i)=>s+x*p[i],0));
  const naiveErr=Math.max(...naive.map(p=>integerError(p,frac)));
  const ok=naiveErr>1e-6;
  failed ||= !ok;
  console.log(`${ok?'✓':'✗'} 2πC^{-T} 不是 FCC 的倒格晶胞（基矢 2π(1,0,0) 对 h,k,l 奇偶混合，被消光）· 整数误差=${naiveErr.toExponential(2)}`);
}
if(failed) process.exit(1);
