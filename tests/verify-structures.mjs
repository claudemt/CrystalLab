import { BRAVAIS, STRUCTURES, basisOffsetCartesian } from '../src/core/lattices.js';
const add=(a,b)=>a.map((x,i)=>x+b[i]); const scale=(a,s)=>a.map(x=>x*s); const dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const expected={sc:6,bcc:8,fcc:12,diamond:4,nacl:6,cscl:8,hcp:12,zincblende:4};
let failed=false;
for(const [id,s] of Object.entries(STRUCTURES)){
  const l=BRAVAIS[s.bravais],atoms=[];
  for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++)for(let k=-2;k<=2;k++){
    const R=add(add(scale(l.primitive[0],i),scale(l.primitive[1],j)),scale(l.primitive[2],k));
    for(const b of s.basis)atoms.push({label:b.label,p:add(R,basisOffsetCartesian(s,b))});
  }
  const center=atoms.find(a=>a.label===s.basis[0].label&&Math.hypot(...a.p)<1e-9);
  const ds=atoms.filter(a=>a!==center).map(a=>({a,d:dist(a.p,center.p)})).filter(x=>x.d>1e-7).sort((a,b)=>a.d-b.d);
  const d0=ds[0].d, count=ds.filter(x=>Math.abs(x.d-d0)<1e-5).length,ok=count===expected[id];failed||=!ok;
  console.log(`${ok?'✓':'✗'} ${id.padEnd(11)} coordination=${count} d_nn=${d0.toFixed(6)} expected=${expected[id]}`);
}
if(failed)process.exit(1);
