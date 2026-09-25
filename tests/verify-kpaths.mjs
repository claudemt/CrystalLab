import { BRAVAIS } from '../src/core/lattices.js';
import { KPATHS, kPathBranches, kPathPointNames } from '../src/core/kpaths.js';
import { latticePointGroup, littleGroupAtK } from '../src/core/symmetry.js';

const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const scale=(a,s)=>a.map(x=>x*s);
const add=(a,b)=>a.map((x,i)=>x+b[i]);
const norm2=a=>dot(a,a);
const reciprocal=([a1,a2,a3])=>{
  const V=dot(a1,cross(a2,a3));
  return [scale(cross(a2,a3),2*Math.PI/V),scale(cross(a3,a1),2*Math.PI/V),scale(cross(a1,a2),2*Math.PI/V)];
};
const cart=(q,b)=>q.reduce((p,x,i)=>add(p,scale(b[i],x)),[0,0,0]);
let fail=false;
for(const [id,kp] of Object.entries(KPATHS)){
  const l=BRAVAIS[id]; if(!l){console.error('✗ missing lattice',id);fail=true;continue}
  const b=reciprocal(l.primitive);
  const G=[];for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++)for(let k=-2;k<=2;k++)if(i||j||k)G.push(add(add(scale(b[0],i),scale(b[1],j)),scale(b[2],k)));
  for(const [a,z] of kp.path)if(!kp.points[a]||!kp.points[z]){console.error(`✗ ${id} path references missing point ${a}-${z}`);fail=true}
  const names=kPathPointNames(kp),branches=kPathBranches(kp);
  if(names.length!==Object.keys(kp.points).length){console.error(`✗ ${id} table contains points not used by path`);fail=true}
  const restored=branches.flatMap(branch=>branch.slice(1).map((end,i)=>[branch[i],end]));
  if(JSON.stringify(restored)!==JSON.stringify(kp.path)){console.error(`✗ ${id} branch breaks alter path segments`);fail=true}
  let maxViolation=-Infinity;
  const fullOrder=latticePointGroup(l.primitive).order;
  if(littleGroupAtK(l.primitive,[0,0,0]).order!==fullOrder){console.error(`✗ ${id} Γ little group mismatch`);fail=true}
  for(const [name,q] of Object.entries(kp.points)){
    const K=cart(q,b);
    for(const g of G)maxViolation=Math.max(maxViolation,dot(K,g)-norm2(g)/2);
    if(name==='GAMMA'&&norm2(K)>1e-18){console.error(`✗ ${id} Γ is not zero`);fail=true}
    const little=littleGroupAtK(l.primitive,q).order;if(little<1||fullOrder%little!==0){console.error(`✗ ${id} ${name} invalid little-group order ${little}/${fullOrder}`);fail=true}
  }
  const ok=maxViolation<1e-7;fail||=!ok;
  console.log(`${ok?'✓':'✗'} ${id.padEnd(15)} ${kp.variant.padEnd(4)} points=${String(Object.keys(kp.points).length).padStart(2)} segments=${String(kp.path.length).padStart(2)} max BZ violation=${maxViolation.toExponential(2)}`);
}
for(const [id,count] of [['cubic-F',2],['hexagonal-P',3],['orthorhombic-P',4]]){
  if(kPathBranches(KPATHS[id]).length!==count){console.error(`✗ ${id} branch count`);fail=true}
}
if(fail)process.exit(1);
