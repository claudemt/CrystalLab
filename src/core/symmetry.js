export const SYMMETRY_OPERATIONS={
  identity:{name:'恒等 E',symbol:'E',kind:'identity',matrix:[[1,0,0],[0,1,0],[0,0,1]],latex:'I'},
  inversion:{name:'反演 i',symbol:'i',kind:'inversion',matrix:[[-1,0,0],[0,-1,0],[0,0,-1]],latex:'-I'},
  mirrorXY:{name:'镜面 m_xy',symbol:'m_{xy}',kind:'mirror',normal:[0,0,1],matrix:[[1,0,0],[0,1,0],[0,0,-1]]},
  mirrorXZ:{name:'镜面 m_xz',symbol:'m_{xz}',kind:'mirror',normal:[0,1,0],matrix:[[1,0,0],[0,-1,0],[0,0,1]]},
  mirrorYZ:{name:'镜面 m_yz',symbol:'m_{yz}',kind:'mirror',normal:[1,0,0],matrix:[[-1,0,0],[0,1,0],[0,0,1]]},
  c2x:{name:'二重旋转 C₂x',symbol:'C_{2x}',kind:'rotation',axis:[1,0,0],angle:Math.PI,matrix:[[1,0,0],[0,-1,0],[0,0,-1]]},
  c2y:{name:'二重旋转 C₂y',symbol:'C_{2y}',kind:'rotation',axis:[0,1,0],angle:Math.PI,matrix:[[-1,0,0],[0,1,0],[0,0,-1]]},
  c2z:{name:'二重旋转 C₂z',symbol:'C_{2z}',kind:'rotation',axis:[0,0,1],angle:Math.PI,matrix:[[-1,0,0],[0,-1,0],[0,0,1]]},
  c3z:{name:'三重旋转 C₃z',symbol:'C_{3z}',kind:'rotation',axis:[0,0,1],angle:2*Math.PI/3,matrix:[[-.5,-Math.sqrt(3)/2,0],[Math.sqrt(3)/2,-.5,0],[0,0,1]]},
  c4z:{name:'四重旋转 C₄z',symbol:'C_{4z}',kind:'rotation',axis:[0,0,1],angle:Math.PI/2,matrix:[[0,-1,0],[1,0,0],[0,0,1]]},
  c6z:{name:'六重旋转 C₆z',symbol:'C_{6z}',kind:'rotation',axis:[0,0,1],angle:Math.PI/3,matrix:[[.5,-Math.sqrt(3)/2,0],[Math.sqrt(3)/2,.5,0],[0,0,1]]},
  c3_111:{name:'三重旋转 C₃[111]',symbol:'C_{3,[111]}',kind:'rotation',axis:[1,1,1],angle:2*Math.PI/3,matrix:[[0,0,1],[1,0,0],[0,1,0]]}
};

export const POINT_GROUP_TABLE=[
  ['三斜','1','C_1'],['三斜','-1','C_i'],
  ['单斜','2','C_2'],['单斜','m','C_s'],['单斜','2/m','C_{2h}'],
  ['正交','222','D_2'],['正交','mm2','C_{2v}'],['正交','mmm','D_{2h}'],
  ['四方','4','C_4'],['四方','-4','S_4'],['四方','4/m','C_{4h}'],['四方','422','D_4'],['四方','4mm','C_{4v}'],['四方','-42m','D_{2d}'],['四方','4/mmm','D_{4h}'],
  ['三方','3','C_3'],['三方','-3','S_6\\;(C_{3i})'],['三方','32','D_3'],['三方','3m','C_{3v}'],['三方','-3m','D_{3d}'],
  ['六方','6','C_6'],['六方','-6','C_{3h}'],['六方','6/m','C_{6h}'],['六方','622','D_6'],['六方','6mm','C_{6v}'],['六方','-6m2','D_{3h}'],['六方','6/mmm','D_{6h}'],
  ['立方','23','T'],['立方','m-3','T_h'],['立方','432','O'],['立方','-43m','T_d'],['立方','m-3m','O_h']
];

export function applyMatrix(M,p){return M.map(row=>row[0]*p[0]+row[1]*p[1]+row[2]*p[2]);}

const pointGroupCache=new Map();
const matT=A=>A[0].map((_,j)=>A.map(r=>r[j]));
const matMul=(A,B)=>A.map(r=>B[0].map((_,j)=>r.reduce((s,x,k)=>s+x*B[k][j],0)));
const det3=A=>A[0][0]*(A[1][1]*A[2][2]-A[1][2]*A[2][1])-A[0][1]*(A[1][0]*A[2][2]-A[1][2]*A[2][0])+A[0][2]*(A[1][0]*A[2][1]-A[1][1]*A[2][0]);
const inv3=A=>{const d=det3(A);return [[A[1][1]*A[2][2]-A[1][2]*A[2][1],A[0][2]*A[2][1]-A[0][1]*A[2][2],A[0][1]*A[1][2]-A[0][2]*A[1][1]],[A[1][2]*A[2][0]-A[1][0]*A[2][2],A[0][0]*A[2][2]-A[0][2]*A[2][0],A[0][2]*A[1][0]-A[0][0]*A[1][2]],[A[1][0]*A[2][1]-A[1][1]*A[2][0],A[0][1]*A[2][0]-A[0][0]*A[2][1],A[0][0]*A[1][1]-A[0][1]*A[1][0]]].map(r=>r.map(x=>x/d))};
const basisMatrix=vecs=>[[vecs[0][0],vecs[1][0],vecs[2][0]],[vecs[0][1],vecs[1][1],vecs[2][1]],[vecs[0][2],vecs[1][2],vecs[2][2]]];
const matrixClose=(A,B,tol)=>A.every((r,i)=>r.every((x,j)=>Math.abs(x-B[i][j])<tol));

export function latticePointGroup(primitive,tol=2e-7){
  const key=JSON.stringify(primitive.map(v=>v.map(x=>+x.toFixed(10))));
  if(pointGroupCache.has(key))return pointGroupCache.get(key);
  const A=basisMatrix(primitive),Ai=inv3(A),g=matMul(matT(A),A),ops=[];
  for(let code=0;code<3**9;code++){
    let n=code;const flat=[];for(let q=0;q<9;q++){flat.push((n%3)-1);n=Math.floor(n/3)}
    const M=[flat.slice(0,3),flat.slice(3,6),flat.slice(6,9)],d=det3(M);
    if(Math.abs(Math.abs(d)-1)>1e-9)continue;
    const test=matMul(matMul(matT(M),g),M);if(!matrixClose(test,g,tol))continue;
    const W=matMul(matMul(A,M),Ai);ops.push({M,W,det:d>0?1:-1});
  }
  ops.sort((a,b)=>b.det-a.det||JSON.stringify(a.M).localeCompare(JSON.stringify(b.M)));
  const result={operations:ops,order:ops.length,proper:ops.filter(o=>o.det>0).length,improper:ops.filter(o=>o.det<0).length,metric:g};
  pointGroupCache.set(key,result);return result;
}

export function orbitOfFractionalPoint(primitive,fractional=[0.173,0.287,0.361],tol=1e-8){
  const group=latticePointGroup(primitive),A=basisMatrix(primitive),pts=[];
  for(const op of group.operations){
    const x=op.M.map(r=>r.reduce((s,v,j)=>s+v*fractional[j],0));
    const p=A.map(r=>r.reduce((s,v,j)=>s+v*x[j],0));
    if(!pts.some(q=>q.reduce((s,v,j)=>s+(v-p[j])**2,0)<tol**2))pts.push(p);
  }
  return {points:pts,group};
}

export function littleGroupAtK(primitive,q,tol=1e-8){
  const group=latticePointGroup(primitive),operations=[];
  for(const op of group.operations){
    const MinvT=matT(inv3(op.M));
    const qp=MinvT.map(r=>r.reduce((sum,x,j)=>sum+x*q[j],0));
    const delta=qp.map((x,j)=>x-q[j]);
    if(delta.every(x=>Math.abs(x-Math.round(x))<tol))operations.push(op);
  }
  return {operations,order:operations.length};
}
