import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';

// 几何入口统一接受 [x,y,z] 与 Vector3，并返回独立的 Vector3。
export const toV3=a=>a.isVector3?a.clone():new THREE.Vector3(a[0],a[1],a[2]);
export const fromV3=v=>[v.x,v.y,v.z];

export function cellVolume(vecs){
  const [a,b,c]=vecs.map(toV3);return Math.abs(a.dot(b.clone().cross(c)));
}

export function metricTensor(vecs){
  const a=vecs.map(toV3);return a.map(x=>a.map(y=>x.dot(y)));
}

export function latticeParameters(vecs){
  const [a,b,c]=vecs.map(toV3);const angle=(u,w)=>Math.acos(THREE.MathUtils.clamp(u.dot(w)/(u.length()*w.length()),-1,1))*180/Math.PI;
  return {a:a.length(),b:b.length(),c:c.length(),alpha:angle(b,c),beta:angle(a,c),gamma:angle(a,b)};
}

export function reciprocalVectors(vecs){
  const [a1,a2,a3]=vecs.map(toV3);const V=a1.dot(a2.clone().cross(a3));
  if(Math.abs(V)<1e-10)throw new Error('Degenerate lattice vectors');
  const f=2*Math.PI/V;
  return [a2.clone().cross(a3).multiplyScalar(f),a3.clone().cross(a1).multiplyScalar(f),a1.clone().cross(a2).multiplyScalar(f)];
}

export function latticePoints(vecs,range=2){
  const [a,b,c]=vecs.map(toV3),pts=[];
  for(let i=-range;i<=range;i++)for(let j=-range;j<=range;j++)for(let k=-range;k<=range;k++)pts.push(a.clone().multiplyScalar(i).addScaledVector(b,j).addScaledVector(c,k));
  return pts;
}

export function structureAtoms(lattice,structure,basisOffsetCartesian,range=2){
  const [a,b,c]=lattice.primitive.map(toV3),atoms=[];
  for(let i=-range;i<=range;i++)for(let j=-range;j<=range;j++)for(let k=-range;k<=range;k++){
    const R=a.clone().multiplyScalar(i).addScaledVector(b,j).addScaledVector(c,k);
    for(const basis of structure.basis){
      const off=toV3(basisOffsetCartesian(structure,basis));atoms.push({position:R.clone().add(off),...basis});
    }
  }
  return atoms;
}

export function coordinationShell(atoms,preferredLabel=null){
  const centers=atoms.filter(a=>a.position.lengthSq()<1e-9&&(preferredLabel===null||a.label===preferredLabel));
  const center=centers[0]||atoms.reduce((best,a)=>a.position.lengthSq()<best.position.lengthSq()?a:best,atoms[0]);
  if(!center)return null;
  const ds=atoms.filter(a=>a!==center).map(a=>({a,d:a.position.distanceTo(center.position)})).filter(x=>x.d>1e-7).sort((x,y)=>x.d-y.d);
  if(!ds.length)return null;const d0=ds[0].d,tol=Math.max(1e-5,d0*2e-3);
  return {center,neighbors:ds.filter(x=>Math.abs(x.d-d0)<tol).map(x=>x.a),distance:d0};
}

// 点阵在原点处的最近邻壳层：原点本身连同等距的那一圈格点。倒空间没有基元，
// 这一圈就是最低阶的几个反射，视觉上充当正空间「中心原子 + 配位壳层」的对应物。
export function nearestShell(vecs,range=2){
  const points=latticePoints(vecs,range);
  let d0=Infinity;
  for(const p of points){const d=p.length();if(d>1e-7&&d<d0)d0=d;}
  if(!Number.isFinite(d0))return [new THREE.Vector3()];
  const tol=Math.max(1e-5,d0*2e-3);
  return [new THREE.Vector3(),...points.filter(p=>Math.abs(p.length()-d0)<tol)];
}

// 给定一组相对原点的邻近点，求原点被它们的中垂面围出的 Voronoi 多面体。
// 点阵的 Wigner–Seitz 胞和含基元结构的广义 W–S 胞是同一个计算，只是喂进来的点集不同：
// 前者喂 Bravais 格点，后者喂真实原子位置。金刚石取到的是 16 面 16 顶点 30 条棱的
// **三棱锥化截角四面体**（triakis truncated tetrahedron），而不是 FCC 点阵的菱形十二面体
// （12 面 14 顶点）。面与近邻的对应关系容易记反，实测为：
//   4 个六边形面 ← √3a/4 处的 4 个最近邻（面法向沿 ⟨111⟩）
//   12 个三角形面 ← a/√2 处的 12 个次近邻（面法向沿 ⟨110⟩）
//   6 个 a 处的再次近邻中垂面落在胞外，不参与——胞顶点的最大半径只有 √3a/4 ≈ 0.433a。
// 正因为最近邻给出的是 4 个**六边形**（而非教科书里「4 个最近邻切出正四面体」的那个简化图），
// 拿 4 个近邻手搓四面体是错的：次近邻会把它的顶点和棱全切掉。
// 该胞的对称性是原子处的**位置对称群** Td（24 阶），不是晶体点群 Oh（48 阶）——金刚石的
// 对称中心在键心 (⅛,⅛,⅛)，不在原子上，所以反演不是胞的对称操作（用 Oh 去验会「恰好一半不成立」）。
export function voronoiCell(points,maxPlanes=54){
  const raw=points.filter(p=>p.lengthSq()>1e-10).sort((p,q)=>p.lengthSq()-q.lengthSq());
  const planes=raw.slice(0,Math.min(raw.length,maxPlanes)).map(R=>({R:R.clone(),n:R.clone(),c:R.lengthSq()/2,distance:R.length()}));
  const verts=[],eps=2e-7;
  for(let i=0;i<planes.length;i++)for(let j=i+1;j<planes.length;j++)for(let k=j+1;k<planes.length;k++){
    const p=planes[i],q=planes[j],r=planes[k];const qxr=q.n.clone().cross(r.n);const det=p.n.dot(qxr);if(Math.abs(det)<1e-10)continue;
    const x=qxr.multiplyScalar(p.c).add(r.n.clone().cross(p.n).multiplyScalar(q.c)).add(p.n.clone().cross(q.n).multiplyScalar(r.c)).multiplyScalar(1/det);
    if(planes.every(pl=>pl.n.dot(x)<=pl.c+eps)&&!verts.some(v=>v.distanceToSquared(x)<1e-10))verts.push(x);
  }
  const active=planes.filter(pl=>verts.filter(v=>Math.abs(pl.n.dot(v)-pl.c)<2e-5).length>=3).sort((a,b)=>a.distance-b.distance);
  return {vertices:verts,activePlanes:active,candidatePlanes:planes};
}

export function wignerSeitzData(vecs,neighborRange=3,maxPlanes=54){
  return voronoiCell(latticePoints(vecs,neighborRange),maxPlanes);
}

export function makeCellMesh(vertices,color=0x8fa2ad,{opacity=.045,radius=0}={}){
  if(vertices.length<4)return new THREE.Group();
  const geom=new ConvexGeometry(vertices);
  const depthMat=new THREE.MeshBasicMaterial({side:THREE.FrontSide,colorWrite:false,depthWrite:true,depthTest:true});
  const depthMesh=new THREE.Mesh(geom,depthMat);depthMesh.renderOrder=0;
  const mat=new THREE.MeshStandardMaterial({color,transparent:true,opacity,side:THREE.FrontSide,depthWrite:false,depthTest:true,roughness:.78,metalness:0,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
  const mesh=new THREE.Mesh(geom,mat);mesh.renderOrder=1;
  const edges=makeSegments(edgesToSegments(geom),color,{opacity:.78,radius});edges.traverse(o=>{o.renderOrder=2});
  const group=new THREE.Group();group.add(depthMesh,mesh,edges);return group;
}

// 帧约定：角点落在原点，不做居中平移。格点、原子与 Miller 平面本来就画在这个帧里，
// 让盒子居中会让它与它们错开半个晶胞——需要居中的是相机，不是几何（见 main.js 的 frameView）。
// WebGL 的 LineBasicMaterial.linewidth 在 Windows/ANGLE 上恒被忽略（永远 1px），
// 所以晶胞棱改用细圆柱实例化绘制，粗细才真正可控。radius 缺省时按棱长取比例。
// points 是**点对**数组：(p0,p1),(p2,p3)… 各画一段。不是折线——闭合多边形的轮廓要自己
// 把首尾接上（见 makePlaneMesh），否则 floor(n/2) 会静默吃掉最后一点并连错弦。
// 场景构造函数的统一签名：前几个是「身份」参数（几何数据 + 颜色），其余一律走 options，
// 与 makeTextSprite 一致。options 里的键就是函数真正会读的键——不写「同形」这种没人兑现的话。
// renderOrder/depthTest/depthWrite 之所以必须能由调用方给：renderKPath 之类要把标志设在
// InstancedMesh 自己身上——本函数返回 Group，调用方再碰 .material 会拿到 undefined；
// 而给 Group 设 renderOrder 会变成 groupOrder，排序键从 (0,N) 变成 (N,0)，语义不同。
export function makeSegments(points,color=0xffffff,{opacity=.78,radius=0,depthTest=true,depthWrite=opacity>=.8,renderOrder=0}={}){
  const group=new THREE.Group(),count=Math.floor(points.length/2);
  if(!count)return group;
  let r=radius;
  if(!(r>0)){let sum=0;for(let i=0;i<count;i++)sum+=points[2*i].distanceTo(points[2*i+1]);r=sum/count*.045;}
  const geom=new THREE.CylinderGeometry(r,r,1,10,1,false);
  const mat=new THREE.MeshStandardMaterial({color,roughness:.55,metalness:0,transparent:opacity<1,opacity,depthTest,depthWrite});
  const inst=new THREE.InstancedMesh(geom,mat,count);inst.renderOrder=renderOrder;
  const up=new THREE.Vector3(0,1,0),m=new THREE.Matrix4(),q=new THREE.Quaternion(),scale=new THREE.Vector3(),mid=new THREE.Vector3(),dir=new THREE.Vector3();
  for(let i=0;i<count;i++){
    const a=points[2*i],b=points[2*i+1];
    dir.subVectors(b,a);const len=dir.length();
    if(len<1e-9){q.identity();scale.set(0,0,0);mid.copy(a);}
    else{q.setFromUnitVectors(up,dir.clone().normalize());scale.set(1,len,1);mid.addVectors(a,b).multiplyScalar(.5);}
    m.compose(mid,q,scale);inst.setMatrixAt(i,m);
  }
  inst.instanceMatrix.needsUpdate=true;group.add(inst);return group;
}

function edgesToSegments(geom){
  const edge=new THREE.EdgesGeometry(geom),pos=edge.getAttribute('position'),pts=[];
  for(let i=0;i<pos.count;i++)pts.push(new THREE.Vector3().fromBufferAttribute(pos,i));
  edge.dispose();return pts;
}

export function makeCellEdges(vecs,color=0xffffff,{opacity=.78,radius=0}={}){
  const [a,b,c]=vecs.map(toV3),pts=[];
  for(let i=0;i<2;i++)for(let j=0;j<2;j++)for(let k=0;k<2;k++)pts.push(a.clone().multiplyScalar(i).addScaledVector(b,j).addScaledVector(c,k));
  const idx=(i,j,k)=>i*4+j*2+k,pairs=[];
  for(let i=0;i<2;i++)for(let j=0;j<2;j++)for(let k=0;k<2;k++){
    if(i===0)pairs.push([idx(0,j,k),idx(1,j,k)]);if(j===0)pairs.push([idx(i,0,k),idx(i,1,k)]);if(k===0)pairs.push([idx(i,j,0),idx(i,j,1)]);
  }
  return makeSegments(pairs.flatMap(([u,w])=>[pts[u],pts[w]]),color,{opacity,radius});
}

// radius 必填：makeSegments 的缺省半径按段长取比例，漏传会让杆粗正比于箭头长度。
// 拿不到有效半径时抛错，与本文件 reciprocalVectors 对退化输入的处理一致——返回空 Group
// 只会让箭头悄悄消失，看不出哪里写错了。len 为 0 是合法输入，仍返回空 Group。
export function makeArrow(origin,vec,color,{radius,headScale=.14,headWidthScale=.065}={}){
  if(!(radius>0))throw new Error('makeArrow: radius 必须是正数');
  const dir=vec.clone(),len=dir.length();if(len<1e-8)return new THREE.Group();
  dir.normalize();
  // 箭头头部只依赖当前箭头长度；正/倒空间整体缩放后保持同一视觉比例。
  const headLength=len*headScale,headWidth=len*headWidthScale;
  const group=new THREE.Group();
  // 杆止于锥底，比例与 ArrowHelper 一致（它把线缩到 length - headLength）。
  group.add(makeSegments([origin.clone(),origin.clone().addScaledVector(dir,Math.max(1e-9,len-headLength))],color,{opacity:1,radius}));
  // 锥头保持普通 Mesh：ArrowHelper 的锥头也是 Mesh，不被 overlay 的置顶 traverse 捕获，
  // 因此 overlay 里的箭头外观不变。改成 InstancedMesh 会顺带改变 overlay 观感。
  const cone=new THREE.Mesh(
    new THREE.ConeGeometry(headWidth,headLength,20,1),
    new THREE.MeshStandardMaterial({color,roughness:.55,metalness:0})
  );
  cone.position.copy(origin).addScaledVector(dir,len);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);
  group.add(cone);
  return group;
}

export function makePointCloud(points,color=0xc3c8cc,{radius=.055,opacity=1,shape='sphere',depthTest=true,depthWrite=opacity>=.8,renderOrder=0,emissiveIntensity=0}={}){
  const group=new THREE.Group();if(!points.length)return group;
  const geom=shape==='cube'?new THREE.BoxGeometry(radius*1.4,radius*1.4,radius*1.4):new THREE.SphereGeometry(radius,18,12);
  const mat=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity,roughness:.72,metalness:0,transparent:opacity<1,opacity,depthTest,depthWrite});
  const inst=new THREE.InstancedMesh(geom,mat,points.length),m=new THREE.Matrix4();inst.renderOrder=renderOrder;points.forEach((p,i)=>{m.makeTranslation(p.x,p.y,p.z);inst.setMatrixAt(i,m)});inst.instanceMatrix.needsUpdate=true;group.add(inst);return group;
}

export function makeAtoms(atoms,{radius=.09,opacity=1}={}){
  const group=new THREE.Group(),byColor=new Map();for(const atom of atoms){if(!byColor.has(atom.color))byColor.set(atom.color,[]);byColor.get(atom.color).push(atom)}
  for(const [color,list] of byColor){
    const geom=new THREE.SphereGeometry(radius,22,15),mat=new THREE.MeshStandardMaterial({color,roughness:.68,metalness:0,transparent:opacity<1,opacity,depthWrite:opacity>.65});
    const inst=new THREE.InstancedMesh(geom,mat,list.length),m=new THREE.Matrix4();list.forEach((a,i)=>{m.makeTranslation(...a.position.toArray());inst.setMatrixAt(i,m)});inst.instanceMatrix.needsUpdate=true;group.add(inst)
  }return group;
}

// centerRadius 是中心原子的球径，bondRadius 是键线半径：两个都是半径，管的对象不同。
export function makeCoordinationBonds(shell,color=0x8fa6b2,{centerRadius=.105,bondRadius=0,opacity=.58}={}){
  const g=new THREE.Group();if(!shell)return g;const pts=[];for(const n of shell.neighbors)pts.push(shell.center.position,n.position);g.add(makeSegments(pts,color,{opacity,radius:bondRadius}));
  g.add(makePointCloud([shell.center.position],0xe4e6e4,{radius:centerRadius,opacity:1}));return g;
}

export function millerPlanePolygon(convVecs,h,k,l,level=0){
  if(h===0&&k===0&&l===0)return [];
  const corners=[];for(const x of [0,1])for(const y of [0,1])for(const z of [0,1])corners.push([x,y,z]);
  const edges=[];for(let i=0;i<corners.length;i++)for(let j=i+1;j<corners.length;j++){const diff=corners[i].reduce((s,x,d)=>s+(Math.abs(x-corners[j][d])>1e-9?1:0),0);if(diff===1)edges.push([corners[i],corners[j]])}
  const f=p=>h*p[0]+k*p[1]+l*p[2]-level,verts=[];
  for(const [p,q] of edges){const fp=f(p),fq=f(q);if(Math.abs(fp)<1e-9)verts.push(p);if(fp*fq<0){const t=fp/(fp-fq);verts.push(p.map((x,d)=>x+t*(q[d]-x)))}}
  const unique=[];for(const p of verts)if(!unique.some(q=>p.reduce((s,x,d)=>s+(x-q[d])**2,0)<1e-12))unique.push(p);if(unique.length<3)return [];
  const [A,B,C]=convVecs.map(toV3),cart=unique.map(p=>A.clone().multiplyScalar(p[0]).addScaledVector(B,p[1]).addScaledVector(C,p[2]));const center=cart.reduce((s,p)=>s.add(p),new THREE.Vector3()).multiplyScalar(1/cart.length);
  const [b1,b2,b3]=reciprocalVectors(convVecs),normal=b1.multiplyScalar(h).addScaledVector(b2,k).addScaledVector(b3,l).normalize(),u=cart[0].clone().sub(center).normalize(),vv=normal.clone().cross(u).normalize();
  cart.sort((p,q)=>Math.atan2(p.clone().sub(center).dot(vv),p.clone().sub(center).dot(u))-Math.atan2(q.clone().sub(center).dot(vv),q.clone().sub(center).dot(u)));return cart;
}

export function planeThroughCellCenter(convVecs,normal){
  const n=normal.clone().normalize();if(n.lengthSq()<1e-12)return [];
  const [A,B,C]=convVecs.map(toV3),center=A.clone().add(B).add(C).multiplyScalar(.5);
  const corners=[];for(const x of [0,1])for(const y of [0,1])for(const z of [0,1])corners.push({f:[x,y,z],r:A.clone().multiplyScalar(x).addScaledVector(B,y).addScaledVector(C,z)});
  const edges=[];for(let i=0;i<corners.length;i++)for(let j=i+1;j<corners.length;j++){const diff=corners[i].f.reduce((sum,x,d)=>sum+(Math.abs(x-corners[j].f[d])>1e-9?1:0),0);if(diff===1)edges.push([corners[i].r,corners[j].r])}
  const verts=[],f=r=>n.dot(r.clone().sub(center));
  for(const [p,q] of edges){const fp=f(p),fq=f(q);if(Math.abs(fp)<1e-9)verts.push(p.clone());if(fp*fq<0){const t=fp/(fp-fq);verts.push(p.clone().lerp(q,t))}}
  const unique=[];for(const r of verts)if(!unique.some(q=>q.distanceToSquared(r)<1e-12))unique.push(r);if(unique.length<3)return [];
  const c=unique.reduce((sum,r)=>sum.add(r),new THREE.Vector3()).multiplyScalar(1/unique.length),u=unique[0].clone().sub(c).normalize(),v=n.clone().cross(u).normalize();
  unique.sort((p,q)=>Math.atan2(p.clone().sub(c).dot(v),p.clone().sub(c).dot(u))-Math.atan2(q.clone().sub(c).dot(v),q.clone().sub(c).dot(u)));return unique;
}

export function makePlaneMesh(points,color=0xf59e0b,{opacity=.18,outlineOpacity=1,outlineRadius=0}={}){
  if(points.length<3)return new THREE.Group();const pos=[];for(let i=1;i<points.length-1;i++)pos.push(...points[0].toArray(),...points[i].toArray(),...points[i+1].toArray());
  const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geom.computeVertexNormals();const mesh=new THREE.Mesh(geom,new THREE.MeshStandardMaterial({color,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false,depthTest:true,roughness:.72,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1}));
  // 轮廓是闭合多边形，而 makeSegments 吃的是点对：必须显式首尾相接。直接传 [...points,points[0]]
  // 会得到奇数个点，floor(n/2) 只取前 n-1 个、丢掉收尾边，还把相邻点错配成跨多边形的弦。
  const pairs=[];for(let i=0;i<points.length;i++)pairs.push(points[i],points[(i+1)%points.length]);
  const outline=makeSegments(pairs,color,{opacity:outlineOpacity,radius:outlineRadius}),g=new THREE.Group();g.add(mesh,outline);return g;
}

export function makeSymmetryPlane(normal,color=0x34d399,{size=2.5,opacity=.035}={}){
  const n=toV3(normal).normalize(),mesh=new THREE.Mesh(new THREE.PlaneGeometry(size,size),new THREE.MeshBasicMaterial({color,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false}));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),n);return mesh;
}

export function makeTextSprite(text,{fontSize=52,textColor='#e9ebe8',strokeColor='rgba(17,19,21,.96)',scale=.32,alwaysOnTop=false}={}){
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;
  const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:!alwaysOnTop,depthWrite:false});
  const sprite=new THREE.Sprite(material);sprite.userData.texture=texture;
  const family=getComputedStyle(document.body).fontFamily||'system-ui, sans-serif',font=`700 ${fontSize}px ${family}`;
  ctx.font=font;
  const w=Math.max(1,Math.ceil(ctx.measureText(text).width+24)),h=Math.ceil(fontSize*1.5);
  canvas.width=w;canvas.height=h;
  ctx.font=font;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=8;ctx.strokeStyle=strokeColor;ctx.strokeText(text,w/2,h/2);ctx.fillStyle=textColor;ctx.fillText(text,w/2,h/2);
  texture.needsUpdate=true;
  sprite.scale.set(scale*w/h,scale,1);
  return sprite;
}
