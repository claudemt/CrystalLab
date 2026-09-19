import { BRAVAIS, CRYSTAL_SYSTEMS } from '../src/core/lattices.js';
import { SYMMETRY_OPERATIONS, POINT_GROUP_TABLE, latticePointGroup, orbitOfFractionalPoint } from '../src/core/symmetry.js';
const basisMatrix=v=>[[v[0][0],v[1][0],v[2][0]],[v[0][1],v[1][1],v[2][1]],[v[0][2],v[1][2],v[2][2]]];
const mul=(A,B)=>A.map(r=>B[0].map((_,j)=>r.reduce((s,x,k)=>s+x*B[k][j],0)));
const det=A=>A[0][0]*(A[1][1]*A[2][2]-A[1][2]*A[2][1])-A[0][1]*(A[1][0]*A[2][2]-A[1][2]*A[2][0])+A[0][2]*(A[1][0]*A[2][1]-A[1][1]*A[2][0]);
const inv=A=>{const d=det(A);return [[A[1][1]*A[2][2]-A[1][2]*A[2][1],A[0][2]*A[2][1]-A[0][1]*A[2][2],A[0][1]*A[1][2]-A[0][2]*A[1][1]],[A[1][2]*A[2][0]-A[1][0]*A[2][2],A[0][0]*A[2][2]-A[0][2]*A[2][0],A[0][2]*A[1][0]-A[0][0]*A[1][2]],[A[1][0]*A[2][1]-A[1][1]*A[2][0],A[0][1]*A[2][0]-A[0][0]*A[2][1],A[0][0]*A[1][1]-A[0][1]*A[1][0]]].map(r=>r.map(x=>x/d))};
let fail=false;
for(const l of Object.values(BRAVAIS)){
  const op=SYMMETRY_OPERATIONS[CRYSTAL_SYSTEMS[l.system].defaultOp],A=basisMatrix(l.primitive),M=mul(mul(inv(A),op.matrix),A);
  const ok=Math.abs(Math.abs(det(M))-1)<1e-6&&M.every(r=>r.every(x=>Math.abs(x-Math.round(x))<1e-6));fail||=!ok;
  console.log(`${ok?'✓':'✗'} ${l.name.padEnd(12)} default=${op.symbol}`);
}
console.log(`point groups = ${POINT_GROUP_TABLE.length}`); if(POINT_GROUP_TABLE.length!==32)fail=true;
if(fail)process.exit(1);

const expectedOrder={triclinic:2,monoclinic:4,orthorhombic:8,tetragonal:16,trigonal:12,hexagonal:24,cubic:48};
for(const l of Object.values(BRAVAIS)){
  const pg=latticePointGroup(l.primitive),expected=expectedOrder[l.system],orbit=orbitOfFractionalPoint(l.primitive);
  const orderOK=pg.order===expected,splitOK=pg.proper+pg.improper===pg.order,orbitOK=orbit.points.length===pg.order;
  console.log(`${orderOK&&splitOK&&orbitOK?'✓':'✗'} ${l.name.padEnd(12)} |P|=${pg.order} orbit=${orbit.points.length}`);
  if(!orderOK||!splitOK||!orbitOK)fail=true;
}
if(fail)process.exit(1);
