import { BRAVAIS, STRUCTURES, basisOffsetCartesian } from '../src/core/lattices.js';
import { latticePointGroup, applyMatrix } from '../src/core/symmetry.js';

const basisMatrix=v=>[[v[0][0],v[1][0],v[2][0]],[v[0][1],v[1][1],v[2][1]],[v[0][2],v[1][2],v[2][2]]];
const det3=A=>A[0][0]*(A[1][1]*A[2][2]-A[1][2]*A[2][1])-A[0][1]*(A[1][0]*A[2][2]-A[1][2]*A[2][0])+A[0][2]*(A[1][0]*A[2][1]-A[1][1]*A[2][0]);
const inv3=A=>{const d=det3(A);return [[A[1][1]*A[2][2]-A[1][2]*A[2][1],A[0][2]*A[2][1]-A[0][1]*A[2][2],A[0][1]*A[1][2]-A[0][2]*A[1][1]],[A[1][2]*A[2][0]-A[1][0]*A[2][2],A[0][0]*A[2][2]-A[0][2]*A[2][0],A[0][2]*A[1][0]-A[0][0]*A[1][2]],[A[1][0]*A[2][1]-A[1][1]*A[2][0],A[0][1]*A[2][0]-A[0][0]*A[2][1],A[0][0]*A[1][1]-A[0][1]*A[1][0]]].map(r=>r.map(x=>x/d))};
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const add=(a,b)=>a.map((x,i)=>x+b[i]);

function operationPreservesStructure(lattice,structure,W,tol=2e-6){
  const A=basisMatrix(lattice.primitive),Ai=inv3(A),sites=structure.basis.map(site=>({label:site.label,p:basisOffsetCartesian(structure,site)}));
  const p0=sites[0],Wp0=applyMatrix(W,p0.p);
  for(const target of sites.filter(x=>x.label===p0.label)){
    const t=sub(target.p,Wp0);
    const ok=sites.every(site=>{
      const mapped=add(applyMatrix(W,site.p),t);
      return sites.some(candidate=>candidate.label===site.label&&applyMatrix(Ai,sub(mapped,candidate.p)).every(x=>Math.abs(x-Math.round(x))<tol));
    });
    if(ok)return true;
  }
  return false;
}

const expected={sc:48,bcc:48,fcc:48,diamond:48,nacl:48,cscl:48,hcp:24,zincblende:24};
for(const [id,structure] of Object.entries(STRUCTURES)){
  const lattice=BRAVAIS[structure.bravais],order=latticePointGroup(lattice.primitive).operations.filter(op=>operationPreservesStructure(lattice,structure,op.W)).length;
  if(order!==expected[id])throw new Error(`${id}: structure point-group order ${order}, expected ${expected[id]}`);
  console.log(`✓ ${id.padEnd(11)} structure point-group order=${order}`);
}
