'use strict';
// ===== meshes.js
// ===================================================================
// MESHES — low-poly toy models built from triangles with flat face normals.
// vertex: pos3 nrm3 col3(sRGB) mat1. Materials (see FS_OBJ): 0 plain, 1 foliage, 2 bark, 3 blossom, 4 wall,
// 5 roof, 6 window (lights up at night), 7 door, 8 brick, 9 lamp, 10 white trim, 11 turning sails, 13 flapping wing,
// 15 shirt, 16 trousers, 17 skin. Trees are 1 unit tall (scaled per instance); everything else is in metres.
// ===================================================================
function omesh(){return{v:[],n:0};}
function oTri(M,a,b,c,col,mat){const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
  let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
  for(const p of [a,b,c])M.v.push(p[0],p[1],p[2],nx,ny,nz,col[0],col[1],col[2],mat);M.n+=3;}
function oQuad(M,a,b,c,d,col,mat){oTri(M,a,b,c,col,mat);oTri(M,a,c,d,col,mat);}
// frustum around a vertical axis; r0 at y0, r1 at y1 (r1 = 0 makes a cone)
function oPrism(M,cx,cz,r0,r1,y0,y1,sides,col,mat,rot,capCol){rot=rot||0;const P=(r,y,k)=>{const a=rot+k/sides*6.2832;return[cx+Math.cos(a)*r,y,cz+Math.sin(a)*r];};
  for(let k=0;k<sides;k++){const a=P(r0,y0,k),b=P(r0,y0,k+1),c=P(r1,y1,k+1),d=P(r1,y1,k);if(r1>1e-4)oQuad(M,a,b,c,d,col,mat);else oTri(M,a,b,d,col,mat);
    oTri(M,[cx,y0,cz],b,a,capCol||col,mat);if(r1>1e-4)oTri(M,[cx,y1,cz],d,c,capCol||col,mat);}}
// prism between two arbitrary points (branches, spars, logs, wheels). The ends are capped when the limb is 10 cm or thicker
// (caps=undefined) or when caps is true; caps=false leaves an open ring (a cart-wheel rim). Before, every limb was an open
// tube, so wheels, discs, signs and log ends were see-through.
function oLimb(M,a,b,r0,r1,sides,col,mat,caps){const d=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],l=Math.hypot(...d);const ax=d.map(v=>v/l);
  let u=Math.abs(ax[1])<0.9?[0,1,0]:[1,0,0];let s=[ax[1]*u[2]-ax[2]*u[1],ax[2]*u[0]-ax[0]*u[2],ax[0]*u[1]-ax[1]*u[0]];const sl=Math.hypot(...s);s=s.map(v=>v/sl);
  const t=[ax[1]*s[2]-ax[2]*s[1],ax[2]*s[0]-ax[0]*s[2],ax[0]*s[1]-ax[1]*s[0]];
  const R=(p,r,k)=>{const an=k/sides*6.2832,c=Math.cos(an)*r,sn=Math.sin(an)*r;return[p[0]+s[0]*c+t[0]*sn,p[1]+s[1]*c+t[1]*sn,p[2]+s[2]*c+t[2]*sn];};
  for(let k=0;k<sides;k++)oQuad(M,R(a,r0,k),R(a,r0,k+1),R(b,r1,k+1),R(b,r1,k),col,mat);
  if(caps===undefined?Math.max(r0,r1)>=0.1:caps)for(let k=0;k<sides;k++){if(r0>1e-4)oTri(M,a,R(a,r0,k+1),R(a,r0,k),col,mat);if(r1>1e-4)oTri(M,b,R(b,r1,k),R(b,r1,k+1),col,mat);}}
function oBox(M,cx,cy,cz,sx,sy,sz,col,mat,rotY,colTop){const c=Math.cos(rotY||0),s=Math.sin(rotY||0);const P=(x,y,z)=>[cx+x*c-z*s,cy+y,cz+x*s+z*c];
  const a=sx/2,b=sy/2,d=sz/2;const v=[P(-a,-b,-d),P(a,-b,-d),P(a,-b,d),P(-a,-b,d),P(-a,b,-d),P(a,b,-d),P(a,b,d),P(-a,b,d)];
  oQuad(M,v[4],v[5],v[6],v[7],colTop||col,mat);oQuad(M,v[0],v[3],v[2],v[1],col,mat);oQuad(M,v[0],v[1],v[5],v[4],col,mat);
  oQuad(M,v[1],v[2],v[6],v[5],col,mat);oQuad(M,v[2],v[3],v[7],v[6],col,mat);oQuad(M,v[3],v[0],v[4],v[7],col,mat);}
// icosahedron blob, optionally subdivided once and jittered (seeded) for an organic low-poly look
const ICO=(()=>{const t=(1+Math.sqrt(5))/2;const v=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(p=>{const l=Math.hypot(...p);return p.map(q=>q/l);});
  const f=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];return{v,f};})();
function icoTris(detail){let tris=ICO.f.map(f=>f.map(i=>ICO.v[i]));
  for(let d=0;d<detail;d++){const out=[];const mid=(a,b)=>{const m=[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2],l=Math.hypot(...m);return m.map(q=>q/l);};
    for(const [a,b,c] of tris){const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);out.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca]);}tris=out;}return tris;}
function oIco(M,cx,cy,cz,r,col,mat,o){o=o||{};const sy=o.sy||1,jit=o.jit||0,rng=mulberry32(o.seed||7),tris=icoTris(o.detail||0);const key=p=>p.map(q=>q.toFixed(4)).join(',');const J=new Map();
  const tf=p=>{const k=key(p);if(!J.has(k))J.set(k,1+(rng()-0.5)*2*jit);const j=J.get(k);return[cx+p[0]*r*j,cy+p[1]*r*sy*j,cz+p[2]*r*j];};
  for(const [a,b,c] of tris){const sh=o.shade?o.shade(a,b,c):col;oTri(M,tf(a),tf(b),tf(c),sh,mat);}}
// gable roof over a box; ridge runs along x (axis 'x') or z
// roofMat/wallMat default to the house materials (5 roof, 4 wall: the shader picks their colours per instance); 0 keeps the given colours
function oGable(M,cx,cz,w,d,y0,rise,over,axis,roofCol,wallCol,roofMat,wallMat){const X=axis==='z',rm=roofMat===undefined?5:roofMat,wm=wallMat===undefined?4:wallMat;
  const P=(u,y,v)=>X?[cx+v,y,cz+u]:[cx+u,y,cz+v];const L=(X?d:w)/2,D=(X?w:d)/2;
  const L2=L+over,D2=D+over,yE=y0-over*rise/D;
  oQuad(M,P(-L2,yE,-D2),P(L2,yE,-D2),P(L2,y0+rise,0),P(-L2,y0+rise,0),roofCol,rm);
  oQuad(M,P(L2,yE,D2),P(-L2,yE,D2),P(-L2,y0+rise,0),P(L2,y0+rise,0),roofCol,rm);
  oTri(M,P(-L,y0,-D),P(-L,y0,D),P(-L,y0+rise,0),wallCol,wm);oTri(M,P(L,y0,D),P(L,y0,-D),P(L,y0+rise,0),wallCol,wm);}
// the eave drop matches the pitch, so the roof rests on the wall tops instead of hovering above them
function oHip(M,cx,cz,w,d,y0,rise,over,roofCol){const a=w/2+over,b=d/2+over,r=Math.max(0.5,w/2-d/2),yE=y0-over*rise/(d/2);
  const e=[[cx-a,yE,cz-b],[cx+a,yE,cz-b],[cx+a,yE,cz+b],[cx-a,yE,cz+b]],t0=[cx-r,y0+rise,cz],t1=[cx+r,y0+rise,cz];
  oQuad(M,e[0],e[1],t1,t0,roofCol,5);oQuad(M,e[2],e[3],t0,t1,roofCol,5);oTri(M,e[1],e[2],t1,roofCol,5);oTri(M,e[3],e[0],t0,roofCol,5);}
// oriented box: centre c and three half-axis vectors (for boards and beams that are not axis-aligned)
function oOBox(M,c,u,v,w,col,mat){const P=(a,b,d)=>[c[0]+u[0]*a+v[0]*b+w[0]*d,c[1]+u[1]*a+v[1]*b+w[1]*d,c[2]+u[2]*a+v[2]*b+w[2]*d];
  const p=[P(-1,-1,-1),P(1,-1,-1),P(1,1,-1),P(-1,1,-1),P(-1,-1,1),P(1,-1,1),P(1,1,1),P(-1,1,1)];
  for(const f of [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]])oQuad(M,p[f[0]],p[f[1]],p[f[2]],p[f[3]],col,mat);}
// flat semicircular arch top (a fan in a wall plane): centre c, radius r, 'x' = in the x-y plane (wall facing z), 'z' = in the z-y plane
function oArch(M,c,r,plane,col,mat,seg){seg=seg||6;for(let k=0;k<seg;k++){const a0=k/seg*Math.PI,a1=(k+1)/seg*Math.PI;
  const P=a=>plane==='x'?[c[0]+Math.cos(a)*r,c[1]+Math.sin(a)*r,c[2]]:[c[0],c[1]+Math.sin(a)*r,c[2]+Math.cos(a)*r];oTri(M,c,P(a0),P(a1),col,mat);}}
// window / door quads on a box face (face: 'x+','x-','z+','z-'), slightly proud of the wall
function oPane(M,face,cx,cz,hw,hd,u,y,w,h,mat,rnd){const o=0.04;let a,b,c,d;
  if(face==='z-'){const z=cz-hd-o;a=[cx+u-w/2,y,z];b=[cx+u+w/2,y,z];c=[cx+u+w/2,y+h,z];d=[cx+u-w/2,y+h,z];}
  else if(face==='z+'){const z=cz+hd+o;a=[cx+u+w/2,y,z];b=[cx+u-w/2,y,z];c=[cx+u-w/2,y+h,z];d=[cx+u+w/2,y+h,z];}
  else if(face==='x+'){const x=cx+hw+o;a=[x,y,cz+u-w/2];b=[x,y,cz+u+w/2];c=[x,y+h,cz+u+w/2];d=[x,y+h,cz+u-w/2];}
  else{const x=cx-hw-o;a=[x,y,cz+u+w/2];b=[x,y,cz+u-w/2];c=[x,y+h,cz+u-w/2];d=[x,y+h,cz+u+w/2];}
  const col=mat===6?[rnd(),0.5,0.5]:[0.5,0.5,0.5];oQuad(M,a,b,c,d,col,mat);
  if(mat===6){// white frame below the pane
    const f=face[0]==='z'?[w+0.2,0.12,0.12]:[0.12,0.12,w+0.2];const fx=face==='x+'?cx+hw+0.06:face==='x-'?cx-hw-0.06:cx+u,fz=face==='z+'?cz+hd+0.06:face==='z-'?cz-hd-0.06:cz+u;oBox(M,fx,y-0.06,fz,f[0],f[1],f[2],[1,1,1],10);}}

// ---- trees (height 1)
const TREE_NAMES=['spruce','broadleaf','bush','pine','birch','rock'];
function treeMeshes(){const out=[];const bark=[0.47,0.33,0.24];
  {const M=omesh(),F=omesh();oPrism(M,0,0,0.045,0.035,-0.05,0.22,5,bark,2);
    [[0.34,0.14,0.56,0.9,0],[0.27,0.36,0.78,1.0,0.5],[0.18,0.58,1.0,1.1,0.2]].forEach(([r,y0,y1,s,rot])=>oPrism(M,0,0,r,0,y0,y1,6,[s,s,s],1,rot,[s*0.8,s*0.8,s*0.8]));
    oPrism(F,0,0,0.3,0,0.08,1.0,5,[1,1,1],1,0,[0.8,0.8,0.8]);out.push({near:M,far:F});}
  {const M=omesh(),F=omesh();oPrism(M,0,0,0.055,0.04,-0.05,0.52,6,bark,2);oLimb(M,[0,0.4,0],[0.15,0.62,0.06],0.03,0.018,4,bark,2);oLimb(M,[0,0.45,0],[-0.13,0.66,-0.08],0.03,0.018,4,bark,2);oLimb(M,[0,0.5,0],[0.02,0.74,-0.12],0.025,0.015,4,bark,2);
    oIco(M,0,0.66,0,0.30,[1,1,1],1,{sy:0.9,jit:0.1,seed:11});oIco(M,0.14,0.57,0.09,0.21,[0.92,0.92,0.92],1,{jit:0.12,seed:12});oIco(M,-0.13,0.6,-0.1,0.22,[1.06,1.06,1.06],1,{jit:0.12,seed:13});
    const rng=mulberry32(5);for(let k=0;k<7;k++){const a=rng()*6.28,el=rng()*1.2-0.2,r=0.31;const x=Math.cos(a)*Math.cos(el)*r,y=0.66+Math.sin(el)*r*0.9,z=Math.sin(a)*Math.cos(el)*r;oIco(M,x,y,z,0.045,[1,1,1],3,{seed:20+k});}
    oPrism(F,0,0,0.05,0.04,-0.05,0.45,4,bark,2);oIco(F,0,0.64,0,0.32,[1,1,1],1,{sy:0.9});out.push({near:M,far:F});}
  {const M=omesh(),F=omesh();oIco(M,0,0.42,0,0.5,[1,1,1],1,{sy:0.85,jit:0.12,seed:31});oIco(M,0.28,0.38,0.12,0.33,[0.9,0.9,0.9],1,{jit:0.12,seed:32});oIco(F,0,0.45,0,0.52,[1,1,1],1,{sy:0.85});out.push({near:M,far:F});}
  {const M=omesh(),F=omesh();const pb=[0.58,0.36,0.25];oPrism(M,0,0,0.045,0.03,-0.05,0.74,5,pb,2);oLimb(M,[0,0.6,0],[0.12,0.7,0.05],0.02,0.012,4,pb,2);
    oIco(M,0,0.82,0,0.26,[1,1,1],1,{sy:0.55,jit:0.1,seed:41});oIco(M,0.12,0.7,0.06,0.18,[0.9,0.9,0.9],1,{sy:0.6,jit:0.1,seed:42});
    oPrism(F,0,0,0.04,0.03,-0.05,0.7,4,pb,2);oIco(F,0,0.8,0,0.27,[1,1,1],1,{sy:0.6});out.push({near:M,far:F});}
  {const M=omesh(),F=omesh();const wb=[0.93,0.91,0.87];oPrism(M,0,0,0.032,0.022,-0.05,0.62,5,wb,2);for(const y of [0.15,0.3,0.45])oPrism(M,0,0,0.034,0.033,y,y+0.025,5,[0.2,0.2,0.2],2);
    oIco(M,0,0.68,0,0.2,[1,1,1],1,{sy:1.6,jit:0.1,seed:51});oIco(M,0.08,0.84,0.02,0.13,[1.07,1.07,1.07],1,{sy:1.3,jit:0.1,seed:52});
    oPrism(F,0,0,0.03,0.02,-0.05,0.55,4,wb,2);oIco(F,0,0.7,0,0.21,[1,1,1],1,{sy:1.6});out.push({near:M,far:F});}
  {const M=omesh(),F=omesh();oIco(M,0,0.15,0,1,[0.66,0.64,0.60],0,{sy:0.62,jit:0.28,seed:61,shade:()=>{const g=0.6+Math.random()*0.1;return[g,g*0.98,g*0.94];}});oIco(F,0,0.15,0,1,[0.64,0.62,0.58],0,{sy:0.62,jit:0.25,seed:61});out.push({near:M,far:F});}
  return out;}

// ---- buildings (metres, front faces -z, base at y=0 sinks into the ground below)
function houseMeshes(){const H=[];let seed=101;const rnd=()=>{seed=(seed*16807)%2147483647;return(seed&1023)/1024;};
  const body=(M,w,d,h)=>{oBox(M,0,(h-3)/2,0,w,h+3,d,[1,1,1],4);oBox(M,0,-1.4,0,w+0.25,3.2,d+0.25,[1,1,1],8);};
  // door = [face, u, width]: ground-floor windows that would overlap the door are left out (they used to z-fight with it)
  const wins=(M,w,d,rows,cols,y0,dy,faces,door)=>{for(const f of faces){const along=f[0]==='z'?w:d,n=f[0]==='z'?cols:Math.max(1,cols-1);
    for(let r=0;r<rows;r++)for(let k=0;k<n;k++){const u=(k-(n-1)/2)*along/(n+0.4);if(door&&r===0&&f===door[0]&&Math.abs(u-door[1])<(door[2]+0.95)/2+0.15)continue;oPane(M,f,0,0,w/2,d/2,u,y0+r*dy,0.95,1.05,6,rnd);}}};
  // 0 cottage
  {const M=omesh(),w=7.5,d=6,h=3.3;body(M,w,d,h);oGable(M,0,0,w,d,h,3.3,0.5,'x',[1,1,1],[1,1,1]);oBox(M,2.3,h+2.4,1.1,0.8,3.4,0.8,[1,1,1],8);
    wins(M,w,d,1,2,1.35,0,['z-','z+','x+','x-']);oPane(M,'z-',0,0,w/2,d/2,-0.2,0.15,1.0,2.0,7,rnd);H.push({M,chim:[2.3,h+4.2,1.1],r:5});}
  // 1 townhouse, gable to the street
  {const M=omesh(),w=6,d=8.5,h=6.4;body(M,w,d,h);oGable(M,0,0,w,d,h,3.8,0.4,'z',[1,1,1],[1,1,1]);oBox(M,-1.6,h+2.8,2.2,0.7,3.6,0.7,[1,1,1],8);
    wins(M,w,d,2,2,1.4,2.8,['z-','z+','x+','x-'],['z-',1.6,1.0]);oPane(M,'z-',0,0,w/2,d/2,0,h+0.9,0.9,1.0,6,rnd);oPane(M,'z-',0,0,w/2,d/2,1.6,0.15,1.0,2.1,7,rnd);H.push({M,chim:[-1.6,h+4.7,2.2],r:5.5});}
  // 2 farmhouse with barn half
  {const M=omesh(),w=15,d=8,h=3.8;body(M,w,d,h);oGable(M,0,0,w,d,h,4.6,0.6,'x',[1,1,1],[1,1,1]);
    for(const u of [-5,-3]) oPane(M,'z-',0,0,w/2,d/2,u,1.4,1.0,1.1,6,rnd);for(const u of [-5,-3]) oPane(M,'z+',0,0,w/2,d/2,u,1.4,1.0,1.1,6,rnd);
    oPane(M,'z-',0,0,w/2,d/2,3.8,0.1,3.4,3.2,7,rnd);oPane(M,'x-',0,0,w/2,d/2,0,1.4,1,1.1,6,rnd);oBox(M,-4.2,h+3.5,0.3,0.8,3,0.8,[1,1,1],8);H.push({M,chim:[-4.2,h+5,0.3],r:8.5});}
  // 3 church: nave + tower with spire
  {const M=omesh(),w=16,d=9,h=7.5;body(M,w,d,h);oGable(M,0,0,w,d,h,5.5,0.4,'x',[0.35,0.4,0.48],[1,1,1]);
    oBox(M,w/2+2.6,(19-3)/2,0,5.4,22,5.4,[1,1,1],10);oPrism(M,w/2+2.6,0,3.9,0,19,30,4,[0.30,0.42,0.40],0,0.785);oBox(M,w/2+2.6,30.6,0,0.12,1.6,0.12,[0.85,0.7,0.3],0);oBox(M,w/2+2.6,30.6,0,0.9,0.12,0.12,[0.85,0.7,0.3],0);
    for(const u of [-5,-1.7,1.7,5])for(const f of ['z-','z+'])oPane(M,f,0,0,w/2,d/2,u,2.2,1.1,3.2,6,rnd);
    oPane(M,'x+',w/2+2.6,0,2.7,2.7,0,0.1,1.6,3.0,7,rnd);for(const f of ['z-','z+','x+'])oPane(M,f,w/2+2.6,0,2.7,2.7,0,15,1.0,1.8,6,rnd);
    oBox(M,w/2+2.6,13.5,-2.75,1.8,1.8,0.1,[0.96,0.95,0.9],10);H.push({M,chim:null,r:11});}
  // 4 inn / shop with a hipped roof
  {const M=omesh(),w=9,d=8,h=6;body(M,w,d,h);oHip(M,0,0,w,d,h,3.4,0.5,[1,1,1]);wins(M,w,d,2,3,1.4,2.6,['z-','z+','x+','x-'],['z-',0,1.6]);
    oPane(M,'z-',0,0,w/2,d/2,0,0.1,1.6,2.2,7,rnd);oBox(M,0,2.75,-d/2-0.6,4,0.12,1.2,[0.9,0.25,0.2],0);oBox(M,2.6,h+2.8,0,0.7,2.8,0.7,[1,1,1],8);H.push({M,chim:[2.6,h+4.2,0],r:6.5});}
  // 5 tiny cottage
  {const M=omesh(),w=5.5,d=5,h=2.8;body(M,w,d,h);oGable(M,0,0,w,d,h,2.8,0.45,'z',[1,1,1],[1,1,1]);oBox(M,0,h+2.2,1.3,0.6,2.6,0.6,[1,1,1],8);
    wins(M,w,d,1,1,1.2,0,['z-','x+','x-']);oPane(M,'z-',0,0,w/2,d/2,1.6,0.15,0.9,1.9,7,rnd);H.push({M,chim:[0,h+3.5,1.3],r:4});}
  return H;}
function windmillMeshes(){const B=omesh(),S=omesh();
  oPrism(B,0,0,4.8,4.4,-3,4,8,[0.93,0.91,0.86],10,0.39);oPrism(B,0,0,6.2,6.2,3.9,4.3,8,[0.45,0.33,0.22],0,0.39);
  // gallery railing: posts standing on the stage, joined by a top rail
  for(let k=0;k<8;k++){const a=0.39+k/8*6.2832,a2=0.39+(k+1)/8*6.2832;oBox(B,Math.cos(a)*6,4.85,Math.sin(a)*6,0.12,1.1,0.12,[0.4,0.3,0.2],0);
    oLimb(B,[Math.cos(a)*6,5.35,Math.sin(a)*6],[Math.cos(a2)*6,5.35,Math.sin(a2)*6],0.05,0.05,4,[0.4,0.3,0.2],0);}
  oPrism(B,0,0,4.0,2.7,4,14,8,[0.38,0.34,0.29],0,0.39);oPrism(B,0,0,3.2,0.5,14,17.6,8,[0.30,0.27,0.25],0,0.39);
  // door and window follow the tapered octagonal wall (they used to hover 0.3-0.4 m in front of it)
  {const fd=y=>Math.cos(Math.PI/8)*(4.8-(y+3)*0.4/7)+0.03;oQuad(B,[fd(0.1),0.1,-0.75],[fd(0.1),0.1,0.75],[fd(2.7),2.7,0.75],[fd(2.7),2.7,-0.75],[0.5,0.5,0.5],7);
    oQuad(B,[-0.4,1.5,-fd(1.5)],[0.4,1.5,-fd(1.5)],[0.4,2.4,-fd(2.4)],[-0.4,2.4,-fd(2.4)],[0.3,0.5,0.5],6);oBox(B,0,1.44,-fd(1.44)+0.02,1.0,0.12,0.12,[1,1,1],10);}
  oBox(B,3.05,15.0,0,0.9,0.9,0.9,[0.25,0.22,0.2],0);
  // sails: 4 arms in the y-z plane around the hub (local x points out of the mill)
  oBox(S,0,0,0,0.8,1.1,1.1,[0.25,0.22,0.2],11);
  for(let k=0;k<4;k++){const a=k*Math.PI/2,c=Math.cos(a),s=Math.sin(a);const P=(r,o,x)=>[x===undefined?0.15:x,c*r-s*o,s*r+c*o];
    oLimb(S,P(0.3,0),P(12.5,0),0.2,0.16,4,[0.40,0.30,0.22],11);
    oQuad(S,P(2.2,0.25),P(12,0.25),P(12,2.1),P(2.2,2.1),[0.94,0.90,0.82],11);
    // lattice bars sit 4 cm in front of the cloth (they were in the same plane and flickered)
    for(let r=3;r<12;r+=1.8)oQuad(S,P(r,0.2,0.19),P(r+0.15,0.2,0.19),P(r+0.15,2.15,0.19),P(r,2.15,0.19),[0.45,0.34,0.24],11);}
  return{body:B,sails:S,hub:[3.6,15.0,0]};}
// cute lantern street light: little plinth, slim post, glazed lantern with a pointed cap
// a box between two points (beams, rafters, braces)
function oBeam(M,a,b,w,col,mat){const ax=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],L=Math.hypot(...ax)||1,d=ax.map(q=>q/L),t=Math.abs(d[1])<0.9?[0,1,0]:[1,0,0],cr=(p,q)=>[p[1]*q[2]-p[2]*q[1],p[2]*q[0]-p[0]*q[2],p[0]*q[1]-p[1]*q[0]];
  let u=cr(d,t);const ul=Math.hypot(...u)||1;u=u.map(q=>q/ul*w/2);let v=cr(d,u);const vl=Math.hypot(...v)||1;v=v.map(q=>q/vl*w/2);
  const P=(p,s1,s2)=>[p[0]+u[0]*s1+v[0]*s2,p[1]+u[1]*s1+v[1]*s2,p[2]+u[2]*s1+v[2]*s2],A=[P(a,-1,-1),P(a,1,-1),P(a,1,1),P(a,-1,1)],B=[P(b,-1,-1),P(b,1,-1),P(b,1,1),P(b,-1,1)];
  for(let k=0;k<4;k++){const k2=(k+1)%4;oQuad(M,A[k],A[k2],B[k2],B[k],col,mat);}oQuad(M,A[0],A[3],A[2],A[1],col,mat);oQuad(M,B[0],B[1],B[2],B[3],col,mat);}
// a house being built (house body ~9 x 7 m around 0,0, front -z): 0 foundation, stakes, planks and sand; 1 + timber frame and scaffold; 2 + roof rafters
function siteMesh(stage){const M=omesh(),st=[0.6,0.58,0.54],wd=[0.68,0.5,0.32],wd2=[0.52,0.37,0.23],sand=[0.84,0.74,0.52];
  oBox(M,0,0.2,0,9.4,0.5,7.4,st,0,0,[0.66,0.64,0.6]);for(const [x,z] of [[-5.3,-4.3],[5.3,-4.3],[-5.3,4.3],[5.3,4.3]])oBox(M,x,0.45,z,0.1,0.9,0.1,wd,0);
  for(let k=0;k<5;k++)oBox(M,6.7,0.1+k*0.13,-1.6+(k%2)*0.12,0.95,0.12,4.4,k%2?wd:wd2,0);oIco(M,-6.5,0,2.4,1.0,sand,0,{sy:0.55,seed:3});
  oBox(M,-6.4,0.42,-2.4,0.75,0.32,1.1,[0.36,0.42,0.48],0);oBox(M,-6.4,0.2,-3.0,0.1,0.4,0.1,[0.2,0.2,0.2],0);for(let k=0;k<3;k++)oBox(M,6.6,0.18+k*0.36,2.6,1.1,0.34,0.5,[0.72,0.38,0.28],0);
  if(stage>=1){const y0=0.45,H=2.6;for(const x of [-4.5,-1.5,1.5,4.5])for(const z of [-3.5,3.5])oBox(M,x,y0+H/2,z,0.24,H,0.24,wd,0);for(const z of [-1.2,1.2])for(const x of [-4.5,4.5])oBox(M,x,y0+H/2,z,0.24,H,0.24,wd,0);
    for(const z of [-3.5,3.5]){oBox(M,0,y0+H,z,9.4,0.26,0.26,wd2,0);oBox(M,0,y0+1.3,z,9.1,0.14,0.14,wd,0);oBeam(M,[-4.5,y0,z],[-1.5,y0+H,z],0.14,wd,0);oBeam(M,[4.5,y0,z],[1.5,y0+H,z],0.14,wd,0);}
    for(const x of [-4.5,4.5]){oBox(M,x,y0+H,0,0.26,0.26,7.2,wd2,0);oBeam(M,[x,y0,-3.5],[x,y0+H,-1.2],0.14,wd,0);}
    for(const x of [-4,0,4])oBox(M,x,2.9,-4.7,0.12,5.8,0.12,[0.62,0.6,0.55],0);oBox(M,0,3.0,-4.35,9.4,0.07,0.75,wd2,0);oBox(M,0,1.4,-4.35,9.4,0.07,0.75,wd2,0);
    oBeam(M,[5.4,0,-4.9],[5.0,4.2,-4.2],0.08,wd,0);oBeam(M,[6.0,0,-4.9],[5.6,4.2,-4.2],0.08,wd,0);for(let k=1;k<9;k++){const t=k/9;oBeam(M,[5.4-0.4*t,4.2*t,-4.9+0.7*t],[6.0-0.4*t,4.2*t,-4.9+0.7*t],0.05,wd,0);}}
  if(stage>=2){const y0=3.05,rh=3.1;for(let x=-4.6;x<=4.61;x+=1.15){oBeam(M,[x,y0,-3.9],[x,y0+rh,0],0.15,wd,0);oBeam(M,[x,y0,3.9],[x,y0+rh,0],0.15,wd,0);}oBox(M,0,y0+rh,0,9.8,0.24,0.24,wd2,0);
    for(let k=1;k<5;k++){const t=k/5;oBeam(M,[-4.9,y0+rh*t+0.1,-3.9*(1-t)],[4.9,y0+rh*t+0.1,-3.9*(1-t)],0.07,wd2,0);oBeam(M,[-4.9,y0+rh*t+0.1,3.9*(1-t)],[4.9,y0+rh*t+0.1,3.9*(1-t)],0.07,wd2,0);}
    oBox(M,-4.85,y0+rh+0.6,0,0.1,1.0,0.1,wd,0);oIco(M,-4.85,y0+rh+1.2,0,0.32,[0.3,0.55,0.28],0,{seed:9});}// topping-out bough
  return M;}
// a culvert mouth: fieldstone headwall in the bank (faces +x, the open stream side), a round pipe with a sandstone ring, a capstone and a rubble apron
// a culvert mouth (faces +x, the open stream side; pipe radius 0.42 at y 0.42, scaled to the stream): a low fieldstone headwall flush with
// the bank, a sandstone ring, a dark tube going back into the ground, a thin capstone, a few stones where the water goes in
function culvertMesh(){const M=omesh(),st=[[0.52,0.51,0.48],[0.45,0.44,0.42],[0.57,0.55,0.51],[0.48,0.46,0.43]],rng=mulberry32(41),cy=0.42,R0=0.42;
  oBox(M,-0.18,0.45,0,0.36,1.0,2.2,[0.4,0.39,0.37],0);
  for(let r=0;r<4;r++)for(let k=0;k<5;k++){const y=0.12+r*0.25,z=-1.0+k*0.45+(r%2)*0.22,dy=y-cy;if(Math.hypot(dy,z)<R0+0.2||z>1.05)continue;oBox(M,0.0+rng()*0.03,y,z,0.16,0.22,0.42,st[(r*3+k)%4],0,(rng()-0.5)*0.08);}
  oBox(M,-0.02,0.98,0,0.42,0.1,2.3,[0.58,0.56,0.52],0);
  for(let k=0;k<16;k++){const a0=k/16*6.2832,a1=(k+1)/16*6.2832,P=(a,r,x)=>[x,cy+Math.sin(a)*r,Math.cos(a)*r];
    oBeam(M,P(a0,R0+0.08,0.06),P(a1,R0+0.08,0.06),0.15,k%2?[0.64,0.55,0.43]:[0.57,0.49,0.39],0);
    oQuad(M,P(a0,R0,0.04),P(a1,R0,0.04),P(a1,R0,-0.33),P(a0,R0,-0.33),[0.14,0.13,0.12],0);oTri(M,[-0.33,cy,0],P(a1,R0,-0.33),P(a0,R0,-0.33),[0.01,0.01,0.01],0);}
  for(const e of [-1,1])for(let r=0;r<2;r++)oBox(M,0.35,0.12+r*0.22,e*1.25,0.7-r*0.2,0.22,0.24,st[(r+(e>0?1:2))%4],0,-e*0.6);
  for(let k=0;k<6;k++)oIco(M,0.25+rng()*0.6,0.06,(rng()>0.5?1:-1)*(0.45+rng()*0.4),0.08+rng()*0.08,st[k%4],0,{sy:0.6,seed:k+3});return M;}
function lampMesh(){const M=omesh(),g=[0.12,0.2,0.17];oPrism(M,0,0,0.17,0.15,0,0.35,6,g,0);oPrism(M,0,0,0.06,0.05,0.35,3.0,6,g,0);oPrism(M,0,0,0.11,0.17,2.95,3.06,4,g,0,0.785);
  oBox(M,0,3.25,0,0.3,0.38,0.3,[1,1,1],9);for(const [x,z] of [[-.155,-.155],[.155,-.155],[-.155,.155],[.155,.155]])oBox(M,x,3.25,z,0.04,0.42,0.04,g,0);
  oPrism(M,0,0,0.25,0.02,3.44,3.72,4,g,0,0.785);oIco(M,0,3.76,0,0.05,g,0,{seed:5});return M;}
// skaters: forward is +x. v=0 leisure skater with beanie, v=1 hockey player with helmet and stick
function skaterMesh(v){const M=omesh(),bt=[0.14,0.12,0.11],bl=[0.86,0.88,0.92];
  for(const z of [-0.11,0.11]){oLimb(M,[0,0.86,z*0.9],[0.05,0.14,z*1.25],0.085,0.07,5,[1,1,1],16);oBox(M,0.07,0.1,z*1.25,0.27,0.13,0.11,bt,0);oBox(M,0.07,0.015,z*1.25,0.36,0.03,0.022,bl,0);}
  oLimb(M,[0,0.84,0],[0.13,1.42,0],0.22,0.18,6,[1,1,1],15);for(const z of [-0.24,0.24])oLimb(M,[0.11,1.34,z],[0.06,0.95,z*1.3],0.06,0.05,4,[1,1,1],15);
  oIco(M,0.16,1.6,0,0.17,[1,1,1],17,{seed:3});oIco(M,0.15,1.68,0,0.185,[1,1,1],18,{sy:0.62,seed:9});
  if(v===1){oLimb(M,[0.06,0.95,0.31],[0.75,0.04,0.26],0.025,0.025,4,[0.45,0.3,0.18],0);oBox(M,0.84,0.03,0.26,0.22,0.045,0.06,[0.12,0.12,0.12],0);}
  else oIco(M,0.15,1.84,0,0.06,[0.95,0.95,0.95],0,{seed:11});return M;}
// long-distance speed skater: deep crouch, arms on the back, long blades
function speedSkaterMesh(){const M=omesh(),bt=[0.12,0.1,0.1],bl=[0.86,0.88,0.92];
  for(const z of [-0.11,0.11]){oLimb(M,[-0.05,0.66,z],[0.27,0.4,z*1.1],0.085,0.075,5,[1,1,1],16);oLimb(M,[0.27,0.4,z*1.1],[0.02,0.12,z*1.25],0.075,0.065,5,[1,1,1],16);
    oBox(M,0.05,0.09,z*1.25,0.28,0.12,0.1,bt,0);oBox(M,0.07,0.012,z*1.25,0.48,0.025,0.02,bl,0);}
  oLimb(M,[-0.06,0.7,0],[0.45,0.94,0],0.2,0.17,6,[1,1,1],15);for(const z of [-0.2,0.2])oLimb(M,[0.38,0.95,z],[0.02,0.86,z*0.4],0.055,0.05,4,[1,1,1],15);
  oIco(M,0.62,1.02,0,0.155,[1,1,1],17,{seed:4});oIco(M,0.6,1.08,0,0.165,[1,1,1],18,{sy:0.6,seed:10});return M;}
function goalMesh(){const M=omesh(),r=[0.8,0.12,0.1],w=[0.93,0.93,0.94];for(const z of [-0.92,0.92])oBox(M,0,0.6,z,0.07,1.2,0.07,r,0);oBox(M,0,1.2,0,0.07,0.07,1.9,r,0);
  oBox(M,-0.6,0.55,0,0.03,1.1,1.84,w,0);for(const z of [-0.9,0.9])oBox(M,-0.3,0.55,z,0.6,1.1,0.02,w,0);oBox(M,-0.3,1.18,0,0.6,0.02,1.84,w,0);return M;}
function puckMesh(){const M=omesh();oPrism(M,0,0,0.045,0.045,0,0.03,8,[0.04,0.04,0.04],0);return M;}
function sledMesh(){const M=omesh(),rd=[0.6,0.16,0.1],wd=[0.66,0.42,0.24];for(const z of [-0.28,0.28]){oBox(M,0,0.05,z,1.15,0.05,0.05,rd,0);oBox(M,0.6,0.12,z,0.08,0.18,0.05,rd,0);}
  for(const x of [-0.35,0.25])for(const z of [-0.28,0.28])oBox(M,x,0.13,z,0.05,0.15,0.04,rd,0);oBox(M,-0.05,0.22,0,0.95,0.05,0.62,wd,0);return M;}
function sledderMesh(){const M=sledMesh();for(const z of [-0.1,0.1])oLimb(M,[-0.25,0.33,z],[0.35,0.3,z*1.4],0.085,0.075,5,[1,1,1],16);
  oLimb(M,[-0.28,0.3,0],[-0.18,0.86,0],0.22,0.18,6,[1,1,1],15);for(const z of [-0.23,0.23])oLimb(M,[-0.17,0.78,z],[0.22,0.45,z*1.2],0.055,0.05,4,[1,1,1],15);
  oIco(M,-0.15,1.04,0,0.165,[1,1,1],17,{seed:6});oIco(M,-0.16,1.11,0,0.18,[1,1,1],18,{sy:0.62,seed:12});oIco(M,-0.16,1.27,0,0.055,[0.95,0.95,0.95],0,{seed:13});return M;}
// the sawmill's overshot wheel for the game (kind 11, all parts turn about local x around the hub at the origin); same build as KIT.sawWheel
function sawWheelMesh(){const M=omesh(),R=3.2,W2=0.62,nb=28,wd=[0.36,0.26,0.18],wl=[0.6,0.46,0.32],w0=[0.47,0.34,0.24],ir=[0.16,0.16,0.17];
  for(const e of [-1,1]){const x=e*W2;for(let k=0;k<nb;k++){const a0=k/nb*6.2832,a1=(k+1)/nb*6.2832,am=(a0+a1)/2,c=[x,Math.sin(am)*R,Math.cos(am)*R],t=[0,Math.cos(am),-Math.sin(am)],rr=[0,Math.sin(am),Math.cos(am)],hl=R*Math.sin((a1-a0)/2)+0.02;
      oOBox(M,c,[0.04,0,0],[t[0]*hl,t[1]*hl,t[2]*hl],[0,rr[1]*0.11,rr[2]*0.11],wd,11);}
    for(let k=0;k<8;k++){const a=k/8*6.2832+0.2,c=[x,Math.sin(a)*R/2,Math.cos(a)*R/2];oOBox(M,c,[0.035,0,0],[0,Math.sin(a)*R/2,Math.cos(a)*R/2],[0,Math.cos(a)*0.08,-Math.sin(a)*0.08],w0,11);}}
  for(let k=0;k<nb;k++){const a=(k+0.5)/nb*6.2832,r=R-0.18,c=[0,Math.sin(a)*r,Math.cos(a)*r];oOBox(M,c,[W2,0,0],[0,Math.cos(a)*0.03,-Math.sin(a)*0.03],[0,Math.sin(a)*0.26,Math.cos(a)*0.26],wl,11);}
  oLimbX(M,-W2-0.3,W2+0.15,0.28,ir);oLimbX(M,-W2,W2,R-0.42,wd);return M;}
function oLimbX(M,x0,x1,r,col){const n=16;for(let k=0;k<n;k++){const a0=k/n*6.2832,a1=(k+1)/n*6.2832,P=(x,a)=>[x,Math.sin(a)*r,Math.cos(a)*r];oQuad(M,P(x0,a0),P(x0,a1),P(x1,a1),P(x1,a0),col,11);
    oTri(M,[x0,0,0],P(x0,a1),P(x0,a0),col,11);oTri(M,[x1,0,0],P(x1,a0),P(x1,a1),col,11);}}
// ---- detailed toy people (object kind 22): forward +x, left +z, feet at 0, hip 0.9, shoulders 1.42 (children are the same figure at 0.62
// with a bigger head). material = palette + 10*part; parts 2 body, 3/4 left/right leg (knee at 0.52), 5/6 left/right arm, tools in the
// right hand are part 6; palettes 0 tunic/coat 1 trousers/skirt 2 skin 3 hair 4 hat/scarf 5 shoes 6 apron 7 leather 8 own colour (vC).
// VS_OBJ swings and bends the parts by pose (iB.y*10: 0 walk/stand 1 kneel 2 hoe 3 water 4 sweep 5 talk 6 sit 7 run/jump 8 hammer 9 flag up).
// drv: engine driver / fireman in blue drill jacket and trousers with a grease-top cap and a red neckerchief; cond: conductor (guard) in a navy
// frock coat with brass buttons and a peaked cap with a gold band, a green flag in the right hand
const PEOPLE=['man','woman','child','elder','post','gard','gardw','sweep','drv','cond'];
function peopleMesh(kind){const M=omesh(),W=[1,1,1],m=(pal,part)=>pal+10*part,woman=kind==='woman'||kind==='gardw'||kind==='sweep',child=kind==='child';
  const uni=kind==='drv'?[0.2,0.27,0.42]:kind==='cond'?[0.1,0.12,0.22]:null,coat=kind==='post'?[0.2,0.27,0.46]:uni,hs=child?1.28:1;
  // legs: thigh and shin (bent at the knee by the shader), shoes
  for(const [sd,part] of [[1,3],[-1,4]]){const z=sd*0.1;
    if(!woman){oLimb(M,[0,0.93,z],[0.015,0.52,z*1.04],0.085,0.07,7,uni||W,m(uni?8:1,part));oLimb(M,[0.015,0.54,z*1.04],[0,0.1,z*1.06],0.068,0.056,7,uni||W,m(uni?8:1,part));}
    else oLimb(M,[0,0.55,z*0.9],[0,0.1,z*0.95],0.05,0.045,6,W,m(2,part));
    oBox(M,0.045,0.055,z*1.06,0.25,0.11,0.11,W,m(5,part));oBox(M,-0.06,0.07,z*1.06,0.06,0.14,0.105,W,m(5,part));}
  // body: tunic or bodice and long skirt, belt, apron, postman's coat
  if(woman){oPrism(M,0,0,0.31,0.21,0.12,0.98,12,W,m(1,2));oPrism(M,0,0,0.205,0.19,0.95,1.44,10,W,m(0,2));oPrism(M,0,0,0.2,0.13,1.44,1.5,10,W,m(0,2));
    if(kind!=='gardw')oBox(M,0.235,0.62,0,0.03,0.7,0.34,W,m(6,2));oBox(M,0.2,0.96,0,0.04,0.05,0.4,W,m(6,2));}
  else{oPrism(M,0,0,coat?0.26:0.235,0.205,coat?0.55:0.78,1.44,10,coat||W,m(coat?8:0,2));oPrism(M,0,0,0.205,0.13,1.44,1.5,10,coat||W,m(coat?8:0,2));
    oPrism(M,0,0,coat?0.27:0.24,coat?0.27:0.24,0.86,0.93,10,W,m(7,2));if(!coat)oBox(M,0.235,0.9,0,0.03,0.06,0.07,[0.75,0.65,0.4],m(8,2));}
  if(kind==='cond'){for(const y of [0.72,0.86,1.0,1.14,1.28])oBox(M,0.262,y,0.05,0.02,0.03,0.03,[0.85,0.68,0.3],m(8,2));oBox(M,0.0,0.6,0,0.52,0.03,0.5,uni,m(8,2));}
  if(kind==='drv'){oPrism(M,0,0,0.1,0.11,1.44,1.52,8,[0.7,0.16,0.12],m(8,2));}
  if(kind==='post'){oBox(M,-0.02,0.98,-0.3,0.3,0.24,0.1,W,m(7,2));oBeam(M,[0.16,1.42,0.17],[0.02,1.08,-0.27],0.045,W,m(7,2));oBox(M,0.0,1.12,-0.33,0.18,0.03,0.06,[0.95,0.93,0.88],m(8,2));}
  // arms (sleeves) with hands
  for(const [sd,part] of [[1,5],[-1,6]]){const z=sd*0.25;oIco(M,0,1.38,sd*0.2,0.085,coat||W,m(coat?8:0,part),{seed:4});
    oLimb(M,[0,1.4,z],[0.03,1.1,z*1.08],0.062,0.055,7,coat||W,m(coat?8:0,part));oLimb(M,[0.03,1.12,z*1.08],[0.06,0.84,z*1.1],0.055,0.047,7,coat||W,m(coat?8:0,part));
    oIco(M,0.065,0.8,z*1.1,0.052,W,m(2,part),{seed:5,sy:1.2});}
  // neck, head, nose, eyes, ears, hair or scarf, hats
  oPrism(M,0,0,0.06,0.055,1.48,1.56,8,W,m(2,2));const hy=1.64+(hs-1)*0.07,hr=0.125*hs;oIco(M,0,hy,0,hr,W,m(2,2),{detail:1,sy:1.08,seed:6});
  oBox(M,hr*0.98,hy-0.01,0,0.05,0.055*hs,0.04,W,m(2,2));for(const e of [-1,1]){oBox(M,hr*0.93,hy+0.03*hs,e*0.045*hs,0.012,0.022,0.024,[0.09,0.07,0.06],m(8,2));oIco(M,0,hy,e*hr*0.98,0.03*hs,W,m(2,2),{sy:1.4});}
  if(kind==='elder')oIco(M,-0.025,hy+0.035,0,hr*1.07,[0.82,0.81,0.79],m(8,2),{detail:1,sy:0.72,seed:8});
  else if(woman&&(kind==='woman'||kind==='sweep')){oIco(M,-0.03,hy+0.04,0,hr*1.15,W,m(4,2),{detail:1,sy:0.85,seed:9});oBox(M,-0.13,hy-0.11,0,0.06,0.18,0.2,W,m(4,2));}
  else{oIco(M,-0.025,hy+0.035,0,hr*1.07,W,m(3,2),{detail:1,sy:0.72,seed:8});if(woman)oBox(M,-0.12,hy-0.12,0,0.06,0.28,0.2,W,m(3,2));}
  if(kind==='man'||kind==='elder'){oPrism(M,-0.01,0,hr*1.12,hr*1.0,hy+0.06,hy+0.14,10,W,m(4,2));oBox(M,0.1,hy+0.07,0,0.1,0.02,0.2,W,m(4,2));}
  if(kind==='post'){oPrism(M,-0.01,0,hr*1.1,hr*1.05,hy+0.06,hy+0.16,10,[0.15,0.2,0.36],m(8,2));oBox(M,0.13,hy+0.07,0,0.12,0.02,0.2,[0.1,0.1,0.12],m(8,2));}
  if(kind==='drv'){oPrism(M,-0.01,0,hr*1.15,hr*1.1,hy+0.05,hy+0.15,10,[0.16,0.18,0.24],m(8,2));oBox(M,0.13,hy+0.07,0,0.1,0.02,0.22,[0.1,0.1,0.12],m(8,2));}
  if(kind==='cond'){oPrism(M,-0.01,0,hr*1.12,hr*1.12,hy+0.05,hy+0.2,12,[0.09,0.1,0.18],m(8,2));oPrism(M,-0.01,0,hr*1.14,hr*1.14,hy+0.07,hy+0.11,12,[0.85,0.68,0.3],m(8,2));oBox(M,0.14,hy+0.06,0,0.13,0.02,0.22,[0.05,0.05,0.06],m(8,2));}
  if(kind==='gard'||kind==='gardw'){const st=[0.86,0.74,0.42];oPrism(M,0,0,0.27,0.25,hy+0.08,hy+0.1,14,st,m(8,2));oPrism(M,0,0,0.13,0.11,hy+0.1,hy+0.22,12,st,m(8,2));}
  // tools in the right hand (they move with the arm)
  const hand=[0.065,0.8,-0.275];
  if(kind==='elder')oLimb(M,[0.07,0.86,-0.28],[0.2,0.0,-0.3],0.018,0.016,5,[0.4,0.28,0.18],m(8,6));
  if(kind==='gard'){oLimb(M,[0.02,1.0,-0.27],[0.62,0.06,-0.22],0.02,0.02,5,[0.55,0.42,0.28],m(8,6));oBox(M,0.66,0.06,-0.22,0.07,0.12,0.22,[0.42,0.43,0.45],m(8,6));}
  if(kind==='gardw'){const c=[0.12,0.6,-0.3],g=[0.38,0.48,0.4];oPrism(M,c[0],c[2],0.1,0.09,0.5,0.72,10,g,m(8,6));oLimb(M,[0.2,0.58,-0.3],[0.4,0.73,-0.3],0.02,0.016,5,g,m(8,6));
    oLimb(M,[0.04,0.72,-0.3],[0.12,0.84,-0.3],0.012,0.012,4,g,m(8,6));oLimb(M,[0.12,0.84,-0.3],[0.2,0.72,-0.3],0.012,0.012,4,g,m(8,6));}
  if(kind==='cond'){oLimb(M,[0.07,0.8,-0.275],[0.08,0.25,-0.29],0.012,0.012,4,[0.45,0.32,0.2],m(8,6));oBox(M,0.08,0.4,-0.36,0.02,0.2,0.16,[0.15,0.55,0.25],m(8,6));}
  if(kind==='sweep'){oLimb(M,[0.04,1.15,-0.27],[0.42,0.04,-0.16],0.019,0.019,5,[0.55,0.42,0.28],m(8,6));oBox(M,0.47,0.05,-0.15,0.14,0.1,0.32,[0.78,0.66,0.38],m(8,6));}
  return M;}
// far level: one simple figure for all (no tools), same palettes and parts so it walks
function peopleFarMesh(){const M=omesh(),W=[1,1,1],m=(pal,part)=>pal+10*part;for(const [sd,part] of [[1,3],[-1,4]])oBox(M,0.01,0.47,sd*0.1,0.14,0.92,0.13,W,m(1,part));
  oPrism(M,0,0,0.24,0.2,0.8,1.46,6,W,m(0,2));for(const [sd,part] of [[1,5],[-1,6]])oBox(M,0.02,1.12,sd*0.26,0.1,0.62,0.1,W,m(0,part));oIco(M,0,1.64,0,0.13,W,m(2,2),{seed:3});oIco(M,-0.02,1.68,0,0.135,W,m(3,2),{sy:0.7,seed:4});return M;}
function personMesh(){const M=omesh();oPrism(M,0,0,0.17,0.15,0,0.82,5,[1,1,1],16);oPrism(M,0,0,0.25,0.2,0.8,1.45,6,[1,1,1],15);oIco(M,0,1.66,0,0.19,[1,1,1],17,{seed:3});return M;}
// grazing animals: forward +x; the head/neck sits beyond a pivot so the shader can lower it (kinds 17 cow, 18 horse, 19 sheep)
// the head sits on a neck past the grazing pivot (x 0.5) instead of floating 7 cm in front of the fleece
function sheepMesh(){const M=omesh(),k=[0.2,0.18,0.18];oIco(M,-0.08,0.8,0,0.5,[0.96,0.95,0.91],0,{sy:0.75,jit:0.12,seed:71});oLimb(M,[0.28,0.84,0],[0.62,0.9,0],0.13,0.12,6,k,0);oBox(M,0.69,0.86,0,0.34,0.34,0.3,k,0);oBox(M,0.64,0.98,0,0.12,0.1,0.42,k,0);
  for(const x of [-0.32,0.24])for(const z of [-0.17,0.17])oBox(M,x,0.25,z,0.11,0.5,0.11,k,0);return M;}
function cowMesh2(){const M=omesh(),w=[0.96,0.94,0.9],k=[0.15,0.13,0.13],pk=[0.92,0.7,0.66];oBox(M,0,1.08,0,1.9,0.9,0.82,w,0);oBox(M,0.25,1.2,0.42,0.7,0.5,0.02,k,0);oBox(M,-0.5,1.0,-0.42,0.6,0.55,0.02,k,0);oBox(M,-0.2,1.53,0,0.5,0.02,0.5,k,0);
  oBox(M,1.12,1.2,0,0.3,0.42,0.4,w,0);oBox(M,1.42,1.12,0,0.42,0.42,0.36,k,0);oBox(M,1.66,1.02,0,0.12,0.24,0.32,pk,0);for(const z of [-0.2,0.2])oBox(M,1.36,1.38,z,0.06,0.16,0.06,[0.9,0.88,0.8],0);
  oBox(M,-0.55,0.6,0,0.36,0.14,0.32,pk,0);oLimb(M,[-0.95,1.45,0],[-1.05,0.8,0],0.04,0.03,4,k,0);for(const x of [-0.72,0.72])for(const z of [-0.28,0.28])oBox(M,x,0.33,z,0.16,0.66,0.16,x<0&&z<0?w:k,0);return M;}
function horseMesh(){const M=omesh(),dk=[0.12,0.09,0.08];oBox(M,0,1.32,0,1.7,0.72,0.56,[1,1,1],19);oLimb(M,[0.78,1.5,0],[1.08,2.02,0],0.2,0.15,6,[1,1,1],19);oLimb(M,[1.02,2.08,0],[1.42,1.78,0],0.13,0.09,6,[1,1,1],19);
  oLimb(M,[0.76,1.72,0],[1.0,2.18,0],0.06,0.05,4,dk,0);oLimb(M,[-0.84,1.52,0],[-1.08,0.92,0],0.09,0.04,5,dk,0);for(const z of [-0.08,0.08])oBox(M,1.0,2.24,z,0.05,0.14,0.05,[1,1,1],19);
  for(const x of [-0.66,0.66])for(const z of [-0.17,0.17]){oBox(M,x,0.5,z,0.13,0.98,0.13,[1,1,1],19);oBox(M,x,0.04,z,0.15,0.08,0.15,dk,0);}return M;}
// farm machines, forward +x; wheels are horizontal cylinders
function wheel(M,x,y,z,r,w){oLimb(M,[x,y,z-w/2],[x,y,z+w/2],r,r,12,[0.1,0.1,0.1],0);oLimb(M,[x,y,z-w/2-0.01],[x,y,z+w/2+0.01],r*0.55,r*0.55,8,[0.85,0.75,0.2],0);}
function tractorMesh(){const M=omesh(),bk=[0.08,0.08,0.08],gr=[0.15,0.15,0.16],st=[0.75,0.75,0.78];
  const tyre=(x,y,z,r,w,lugs)=>{oLimb(M,[x,y,z-w/2],[x,y,z+w/2],r,r,14,bk,0);oLimb(M,[x,y,z-w/2-0.01],[x,y,z+w/2+0.01],r*0.55,r*0.55,10,[1,1,1],20);oLimb(M,[x,y,z-w/2-0.03],[x,y,z+w/2+0.03],r*0.14,r*0.14,6,st,0);
    if(lugs)for(let k=0;k<14;k++){const a=k*Math.PI/7;oBox(M,x+Math.cos(a)*(r+0.02),y+Math.sin(a)*(r+0.02),z,0.09,0.09,w*0.95,bk,0);}};
  // rear axle housings and a front pivot bolster tie the wheels to the body (the body used to hang between the wheels)
  tyre(-0.62,0.78,-0.8,0.78,0.38,true);tyre(-0.62,0.78,0.8,0.78,0.38,true);tyre(1.42,0.42,-0.56,0.42,0.17,false);tyre(1.42,0.42,0.56,0.42,0.17,false);oBox(M,1.42,0.45,0,0.15,0.15,1.0,gr,0);
  oLimb(M,[-0.62,0.78,-0.66],[-0.62,0.78,0.66],0.09,0.09,8,gr,0);oBox(M,1.36,0.63,0,0.28,0.24,0.3,gr,0);
  oBox(M,-0.35,0.85,0,0.95,0.7,0.62,[1,1,1],20);oBox(M,0.75,1.05,0,1.5,0.62,0.66,[1,1,1],20);oBox(M,1.55,1.05,0,0.08,0.62,0.6,gr,0);for(let y=0.82;y<1.32;y+=0.09)oBox(M,1.6,y,0,0.03,0.03,0.56,st,0);
  for(const z of [-0.36,0.36])oLimb(M,[1.45,1.25,z],[1.6,1.25,z],0.08,0.08,8,[1,0.95,0.8],9);oBox(M,0.2,1.42,0,0.55,0.18,0.5,[1,1,1],20);oLimb(M,[1.25,1.36,0],[1.25,1.46,0],0.06,0.06,6,st,0);
  oLimb(M,[1.05,1.36,0.22],[1.05,2.25,0.22],0.045,0.045,6,gr,0);oBox(M,1.05,2.27,0.22,0.12,0.02,0.12,gr,0);
  for(const z of [-1,1]){oBox(M,-0.62,1.62,z*0.8,1.2,0.05,0.44,[1,1,1],20);oBox(M,-0.05,1.32,z*0.8,0.08,0.6,0.44,[1,1,1],20);oBox(M,-1.18,1.32,z*0.8,0.08,0.6,0.44,[1,1,1],20);oBox(M,-0.62,1.2,z*0.475,1.1,0.05,0.33,gr,0);oBox(M,-0.62,1.41,z*0.6,0.5,0.4,0.04,gr,0);}
  oBox(M,-0.72,1.42,0,0.4,0.06,0.4,gr,0);oLimb(M,[-0.72,1.15,0],[-0.72,1.4,0],0.04,0.04,4,gr,0);oBox(M,-0.9,1.62,0,0.06,0.35,0.36,gr,0);
  oLimb(M,[0.15,1.25,0],[-0.25,1.75,0],0.025,0.025,4,gr,0);for(const z of [-1,1])oLimb(M,[-0.25,1.75,0],[-0.25,1.75,z*0.2],0.012,0.012,4,gr,0);for(let k=0;k<10;k++){const a0=k*0.628,a1=(k+1)*0.628;oLimb(M,[-0.25+Math.sin(a0)*0.1,1.75+Math.cos(a0)*0.12*0.8,Math.cos(a0)*0.2],[-0.25+Math.sin(a1)*0.1,1.75+Math.cos(a1)*0.12*0.8,Math.cos(a1)*0.2],0.018,0.018,4,gr,0);}
  oBox(M,-1.03,0.62,0,0.4,0.08,0.1,gr,0);for(const z of [-0.3,0.3])oLimb(M,[-0.8,0.55,z],[-1.3,0.48,z*1.2],0.03,0.03,4,gr,0);oLimb(M,[-0.85,1.0,0],[-1.25,0.75,0],0.03,0.03,4,gr,0);return M;}
function combineMesh(){const M=omesh();oBox(M,-0.4,2.0,0,4.2,2.0,2.4,[1,1,1],20);oBox(M,1.2,3.4,0,1.4,1.3,1.5,[0.22,0.26,0.3],0);oBox(M,1.2,4.1,0,1.6,0.1,1.7,[1,1,1],20);
  // feeder house: the sloped channel from the header up into the body (the header used to float half a metre in front)
  oBox(M,2.9,0.75,0,1.4,0.6,4.6,[1,1,1],20);oOBox(M,[1.95,1.2,0],[0.37,-0.37,0],[0.2,0.2,0],[0,0,0.6],[1,1,1],20);oBox(M,3.55,0.55,0,0.2,0.3,4.6,[0.75,0.72,0.6],0);for(let z=-2;z<=2;z+=0.5)oBox(M,3.3,0.95,z,0.9,0.06,0.06,[0.2,0.2,0.2],0);
  oLimb(M,[-1.5,3.0,1.1],[0.2,3.4,3.2],0.18,0.15,6,[1,1,1],20);wheel(M,1.0,0.95,-1.25,0.95,0.6);wheel(M,1.0,0.95,1.25,0.95,0.6);wheel(M,-2.0,0.55,-1.1,0.55,0.35);wheel(M,-2.0,0.55,1.1,0.55,0.35);return M;}
function ploughMesh(){const M=omesh(),r=[0.75,0.2,0.15],s=[0.7,0.72,0.75];oLimb(M,[0.9,0.6,0],[-1.6,0.6,0.6],0.07,0.07,6,r,0);for(let k=0;k<4;k++){const x=0.4-k*0.6,z=0.12+k*0.16;oLimb(M,[x,0.6,z],[x-0.2,0.08,z],0.04,0.04,4,r,0);oBox(M,x-0.3,0.1,z+0.08,0.5,0.2,0.05,s,0);}
  wheel(M,-1.6,0.35,0.9,0.35,0.15);return M;}
function drillMesh(){const M=omesh(),b=[0.25,0.45,0.75];oBox(M,-0.2,1.0,0,1.0,0.7,3.0,b,0);oBox(M,-0.2,0.3,0,0.8,0.12,3.1,[0.3,0.3,0.3],0);for(let z=-1.4;z<=1.4;z+=0.35)oLimb(M,[-0.2,0.65,z],[-0.35,0.05,z],0.025,0.025,4,[0.2,0.2,0.2],0);
  wheel(M,-0.2,0.35,-1.7,0.35,0.15);wheel(M,-0.2,0.35,1.7,0.35,0.15);oLimb(M,[0.3,0.6,0],[1.0,0.6,0],0.05,0.05,5,[0.3,0.3,0.3],0);return M;}
// St Andrew's cross on a post (Dutch "andreaskruis": white with red edges), and a red-white boom pivoting at its origin
// St Andrew's cross: two flat red boards with a white face on both sides (1 cm proud, so nothing z-fights), bolted to the post front
function xbuckMesh(){const M=omesh(),w=[0.95,0.95,0.93],r=[0.82,0.1,0.1];oBox(M,0,1.4,0,0.1,2.8,0.1,[0.25,0.25,0.25],0);
  for(const s of [-1,1]){const L=Math.hypot(0.55,0.75),d=[0,0.55/L,0.75*s/L],p=[0,-0.75*s/L,0.55/L],sc=(v,k)=>v.map(q=>q*k);
    oOBox(M,[0.075,2.45,0],sc(d,0.93),sc(p,0.11),[0.025,0,0],r,0);for(const e of [-1,1])oOBox(M,[0.075+e*0.045,2.45,0],sc(d,0.86),sc(p,0.065),[0.01,0,0],w,0);}
  oBox(M,0,0.55,0,0.4,0.6,0.3,[0.3,0.3,0.3],0);return M;}
// counterweight now meets the boom at the pivot (it used to leave a 10 cm gap)
function boomMesh(){const M=omesh();for(let k=0;k<8;k++)oBox(M,0.25+k*0.5,0,0,0.5,0.12,0.08,k%2?[0.95,0.95,0.93]:[0.85,0.1,0.1],0);oBox(M,-0.3,0,0,0.6,0.35,0.3,[0.25,0.25,0.25],0);return M;}
function shovelerMesh(){const M=personMesh();oLimb(M,[0.25,1.15,0.1],[0.85,0.15,0.05],0.03,0.03,4,[0.45,0.32,0.2],0);oBox(M,0.92,0.08,0.05,0.28,0.04,0.32,[0.35,0.38,0.42],0);oIco(M,0,1.76,0,0.17,[1,1,1],18,{sy:0.6,seed:21});return M;}
// paddle steamer, ~28 m: black hull with white sheer strake, saloon deck, wheelhouse, two funnels with red bands, paddle boxes, mast
// sternwheel steamer, ~32 m: low hull, main and saloon decks with rows of windows and a promenade, pilot house,
// tall twin stacks with crowns forward, wheel frame aft; the wheel itself is a separate mesh that turns (kind 21)
function steamerMesh(){const M=omesh(),hl=[0.36,0.12,0.1],wh=[0.95,0.94,0.9],wd=[0.62,0.46,0.3],bk=[0.08,0.08,0.09],gl=[0.2,0.24,0.3],rd=[0.72,0.13,0.1];
  oBox(M,0,0.5,0,26,1.3,7,hl,0);for(const [x,w] of [[13.6,5.6],[14.8,4.0],[15.8,2.2]])oBox(M,x,0.55,0,1.4,1.2,w,hl,0);oBox(M,0,1.25,0,32.2,0.2,7.3,wh,0);oBox(M,-0.5,1.42,0,30,0.12,7.0,wd,0);
  oBox(M,-0.5,2.55,0,22,2.1,5.4,wh,0);for(let x=-10.5;x<=9.5;x+=1.4)for(const z of [-2.71,2.71])oBox(M,x,2.7,z,0.75,1.0,0.02,gl,0);
  oBox(M,-0.5,3.68,0,24,0.14,7.0,wh,0);for(let x=-12;x<=11.5;x+=1.5)for(const z of [-3.4,3.4])oBox(M,x,2.5,z,0.1,2.2,0.1,wh,0);for(const z of [-3.4,3.4])oBox(M,-0.5,4.05,z,24,0.6,0.04,wh,0);
  oBox(M,-2,4.7,0,15,1.9,4.2,wh,0);for(let x=-9;x<=5;x+=1.3)for(const z of [-2.11,2.11])oBox(M,x,4.85,z,0.7,0.8,0.02,gl,0);oBox(M,-2,5.72,0,16,0.14,5.0,wh,0);
  oBox(M,4.2,6.5,0,2.6,1.5,2.6,wh,0);for(const z of [-1.31,1.31])oBox(M,4.2,6.6,z,2.0,0.7,0.02,gl,0);oBox(M,4.2,7.33,0,3.1,0.14,3.1,wh,0);
  for(const z of [-1.4,1.4]){oPrism(M,7.5,z,0.42,0.42,3.7,12.5,10,bk,0);oPrism(M,7.5,z,0.42,0.68,12.5,13.1,10,bk,0);oPrism(M,7.5,z,0.43,0.43,11.4,11.8,10,rd,0);}
  oLimb(M,[7.5,11.0,-1.4],[7.5,11.0,1.4],0.05,0.05,4,bk,0);oLimb(M,[15.6,1.3,0],[15.6,8,0],0.06,0.05,5,wd,0);oBox(M,15.95,7.6,0,0.7,0.45,0.02,rd,0);
  for(const z of [-3.2,3.2]){oLimb(M,[-12.6,1.3,z],[-17.8,2.4,z],0.16,0.14,6,wd,0);oLimb(M,[-12.6,3.6,z],[-17.8,2.4,z],0.12,0.1,6,wd,0);}
  oBox(M,-13.2,0.9,0,1.2,0.8,6.6,hl,0);return M;}
function sternwheelMesh(){const M=omesh(),rd=[0.75,0.14,0.11],dk=[0.3,0.08,0.06];oLimb(M,[0,0,-3.1],[0,0,3.1],0.22,0.22,10,dk,0);
  for(let k=0;k<12;k++){const a=k*Math.PI/6,c=Math.cos(a),s2=Math.sin(a);oBox(M,c*2.75,s2*2.75,0,0.12+Math.abs(s2)*0.35,0.12+Math.abs(c)*0.35,5.6,rd,0);
    for(const z of [-2.6,0,2.6])oLimb(M,[0,0,z],[c*2.9,s2*2.9,z],0.06,0.05,4,dk,0);}
  for(const z of [-2.6,2.6])for(let k=0;k<24;k++){const a0=k*Math.PI/12,a1=(k+1)*Math.PI/12;oLimb(M,[Math.cos(a0)*2.9,Math.sin(a0)*2.9,z],[Math.cos(a1)*2.9,Math.sin(a1)*2.9,z],0.07,0.07,4,dk,0);}return M;}
function parasolMesh(){const M=omesh();oLimb(M,[0,0,0],[0,2.25,0],0.03,0.03,5,[0.95,0.95,0.95],0);oPrism(M,0,0,1.25,0.06,1.95,2.45,8,[1,1,1],18);return M;}
function towelMesh(){const M=omesh();oBox(M,0,0.015,0,1.8,0.03,0.85,[1,1,1],20);oBox(M,0,0.025,0,1.76,0.03,0.12,[0.96,0.96,0.94],0);return M;}
function lierMesh(){const M=omesh();for(const z of [-0.1,0.1])oLimb(M,[-0.85,0.12,z],[0.05,0.13,z*1.3],0.08,0.07,5,[1,1,1],16);oLimb(M,[0.0,0.16,0],[0.62,0.16,0],0.2,0.18,6,[1,1,1],15);
  for(const z of [-0.25,0.25])oLimb(M,[0.55,0.16,z],[0.95,0.1,z*1.6],0.05,0.05,4,[1,1,1],17);oIco(M,0.85,0.2,0,0.16,[1,1,1],17,{seed:8});return M;}
function swimmerMesh(){const M=omesh();oLimb(M,[0,0.02,-0.22],[0,0.02,0.22],0.13,0.13,6,[1,1,1],17);oIco(M,0.05,0.24,0,0.15,[1,1,1],17,{seed:9});oIco(M,0.03,0.33,0,0.155,[1,1,1],18,{sy:0.5,seed:14});
  for(const z of [-1,1])oLimb(M,[0,0.02,z*0.22],[0.45,0.0,z*0.45],0.05,0.045,4,[1,1,1],17);return M;}
// open end door of a coach (local +x points out of the end wall, origin at rail height on the end wall): the dark doorway over the closed
// door and its window, and the leaf swung into the coach on its hinge (the old open doors stood on the side walls, where the coach has none)
function doorOpenMesh(){const M=omesh(),wd=[0.46,0.31,0.19];oBox(M,0.06,1.95,0,0.012,1.62,0.7,[0.05,0.045,0.04],0);
  oBox(M,-0.31,1.95,0.37,0.7,1.62,0.035,wd,0);oBox(M,-0.31,2.45,0.392,0.4,0.42,0.008,[0.55,0.62,0.66],0);oBox(M,-0.62,1.85,0.335,0.04,0.04,0.04,[0.85,0.72,0.35],0);return M;}
function seatedMesh(){const M=omesh();for(const z of [-0.1,0.1]){oLimb(M,[0,0.06,z],[0.42,0.07,z*1.1],0.08,0.07,5,[1,1,1],16);oLimb(M,[0.42,0.07,z*1.1],[0.46,-0.48,z*1.1],0.065,0.055,5,[1,1,1],16);}
  oLimb(M,[-0.02,0.05,0],[-0.06,0.62,0],0.2,0.17,6,[1,1,1],15);for(const z of [-0.22,0.22])oLimb(M,[-0.04,0.55,z],[0.25,0.2,z*0.9],0.05,0.045,4,[1,1,1],15);oIco(M,-0.04,0.8,0,0.15,[1,1,1],17,{seed:4});return M;}
// farmstead: a Dutch-style barn (brick walls, steep tiled roof, big green-and-white doors), an open machine shed,
// and grain storage (two corrugated silos with conical roofs, a bucket elevator and spouts, a loading shed)
function roofGable(M,L,W,y0,rise,col,cx,cz){cx=cx||0;cz=cz||0;const a=[cx-L/2,y0,cz-W/2],b=[cx+L/2,y0,cz-W/2],r1=[cx+L/2,y0+rise,cz],r0=[cx-L/2,y0+rise,cz],c2=[cx+L/2,y0,cz+W/2],d2=[cx-L/2,y0,cz+W/2];oQuad(M,a,b,r1,r0,col,0);oQuad(M,r0,r1,c2,d2,col,0);}
function barnMesh(){const M=omesh(),br=[0.58,0.25,0.18],rf=[0.30,0.25,0.24],gr=[0.16,0.36,0.25],wh=[0.93,0.92,0.88];oBox(M,0,2.3,0,18,4.6,11,br,0);oBox(M,0,0.2,0,18.3,0.4,11.3,[0.4,0.38,0.36],0);
  // eaves drop with the pitch so the roof sits on the walls (it used to hover 55 cm above them)
  roofGable(M,19,12.4,3.83,6.82,rf);for(const e of [-1,1]){oTri(M,[e*9.02,4.6,-5.5],[e*9.02,4.6,5.5],[e*9.02,10.65,0],br,0);}
  oBox(M,9.05,2.0,0,0.08,3.9,4.2,gr,0);for(const z of [-1,1])oLimb(M,[9.1,0.25,z*2],[9.1,3.8,-z*2],0.06,0.06,4,wh,0);oBox(M,9.1,2.0,0,0.05,3.9,0.1,wh,0);oBox(M,9.08,4.05,0,0.06,0.15,4.4,wh,0);
  for(const x of [-6,-2,2,6])for(const z of [-1,1]){oBox(M,x,3.1,z*5.52,0.9,0.7,0.04,wh,0);oBox(M,x,3.1,z*5.55,0.75,0.55,0.02,[0.2,0.22,0.25],0);}
  oBox(M,9.05,7.0,0,0.06,1.2,1.2,wh,0);oLimb(M,[0,10.6,0],[0,11.6,0],0.05,0.05,4,[0.2,0.2,0.2],0);oBox(M,0.3,11.4,0,0.6,0.25,0.04,[0.2,0.2,0.2],0);return M;}
// side walls now follow the mono-pitch roof (they used to stick up to 0.6 m through it at the open front)
function shedMesh(){const M=omesh(),st=[0.42,0.46,0.44],rf=[0.55,0.56,0.55];oBox(M,0,2.62,-3.9,14,5.24,0.12,st,0);for(const e of [-1,1]){oBox(M,e*7,2.275,0,0.12,4.55,7.8,st,0);oQuad(M,[e*7,4.55,-3.9],[e*7,4.55,3.9],[e*7,4.66,3.9],[e*7,5.27,-3.9],st,0);}
  for(const x of [-3.5,0,3.5])oLimb(M,[x,0,3.8],[x,4.65,3.8],0.1,0.1,4,[0.3,0.3,0.3],0);const a=[-7.3,5.3,-4.3],b=[7.3,5.3,-4.3],c=[7.3,4.6,4.4],d=[-7.3,4.6,4.4];oQuad(M,a,b,c,d,rf,0);oBox(M,0,0.05,0,14,0.1,7.8,[0.45,0.43,0.4],0);return M;}
function siloMesh(){const M=omesh(),gm=[0.74,0.76,0.78],dk=[0.36,0.38,0.4],rd=[0.62,0.18,0.12];for(const z of [-3,3]){oPrism(M,0,z,2.4,2.4,0,11,14,gm,0);for(let y=1;y<11;y+=1.4)oPrism(M,0,z,2.43,2.43,y,y+0.08,14,dk,0);oPrism(M,0,z,2.55,0.35,11,13.2,14,gm,0);
    oLimb(M,[2.45,0.5,z],[2.45,11,z],0.03,0.03,4,dk,0);oLimb(M,[2.45,0.5,z+0.4],[2.45,11,z+0.4],0.03,0.03,4,dk,0);oLimb(M,[0,13.2,z],[0,14.6,0],0.12,0.1,5,dk,0);}
  oBox(M,0,8,0,1.0,16,1.0,rd,0);oBox(M,0,16.3,0,1.6,1.0,1.6,rd,0);oBox(M,-4.2,1.9,0,4,3.8,5,[0.6,0.5,0.38],0);roofGable(M,4.6,5.6,3.656,1.344,[0.32,0.26,0.24],-4.2,0);for(const x of [-6.2,-2.2])oTri(M,[x,3.8,-2.5],[x,3.8,2.5],[x,5.0,0],[0.6,0.5,0.38],0);return M;}
function harrowMesh(){const M=omesh(),y=[0.95,0.72,0.1];oBox(M,-0.1,0.55,0,0.3,0.12,3.2,y,0);oLimb(M,[0.2,0.55,0],[1.0,0.62,0],0.05,0.05,5,y,0);for(const x of [-0.25,0.15])for(let z=-1.4;z<=1.4;z+=0.35)oLimb(M,[x,0.3,z-0.04],[x,0.3,z+0.04],0.25,0.25,8,[0.55,0.56,0.58],0);return M;}
function trailerMesh(){const M=omesh(),r=[0.72,0.16,0.12];oBox(M,-0.6,1.35,0,4.6,1.0,2.3,r,0);oBox(M,-0.6,1.75,0,4.3,0.4,2.0,[0.85,0.7,0.3],0);oLimb(M,[1.7,0.75,0],[2.6,0.65,0],0.06,0.06,5,[0.2,0.2,0.2],0);
  for(const x of [-1.5,0.2])for(const z of [-1,1])oLimb(M,[x,0.5,z*1.0],[x,0.5,z*1.25],0.5,0.5,10,[0.1,0.1,0.1],0);return M;}
function baleMesh(){const M=omesh();oLimb(M,[0,0.75,-0.6],[0,0.75,0.6],0.75,0.75,10,[0.86,0.76,0.42],0);return M;}
// ---- castle helpers (object meshes): round towers with corbels, cornices, crowns and spires; merlons; arched and Gothic windows
function cTower(M,x,z,r,y0,y1,o){o=o||{};const col=o.col||[0.92,0.9,0.85],st=o.st||[0.8,0.77,0.71],sl=o.sl||[0.29,0.34,0.42],gd=[0.95,0.78,0.3],dk=o.dk||[0.13,0.15,0.2],n=o.sides||12;
  oPrism(M,x,z,r,r,y0,y1,n,col,0);if(o.corbel)oPrism(M,x,z,0.3,r,y0-r*1.5,y0,n,col,0);oPrism(M,x,z,r*1.1,r*1.1,y1-0.45,y1,n,st,0);
  if(o.crown){const R2=r*1.15;oPrism(M,x,z,R2,R2,y1,y1+0.9,n,col,0);for(let k=0;k<n;k++){const a=(k+0.5)/n*6.2832;oBox(M,x+Math.cos(a)*R2*0.92,y1+1.3,z+Math.sin(a)*R2*0.92,0.55,0.8,0.55,col,0,-a);}}
  const top=o.crown?y1+0.9:y1;if(o.cone){const cr=o.crown?r*0.85:r*1.14;oPrism(M,x,z,cr,0.06,top,top+o.cone,n,sl,0);oLimb(M,[x,top+o.cone-0.1,z],[x,top+o.cone+1.4,z],0.05,0.035,4,gd,0);oIco(M,x,top+o.cone+0.5,z,0.12,gd,0,{seed:3});}
  const wr=o.winRows||Math.max(1,Math.floor((y1-y0)/4.5)),wn=o.winPer||4;for(let k=0;k<wr;k++)for(let q=0;q<wn;q++){const a=q/wn*6.2832+k*(o.spiral||0.6)+(o.rot||0),y=y0+(y1-y0)*(k+0.6)/(wr+0.4);
    oBox(M,x+Math.cos(a)*(r+0.01),y,z+Math.sin(a)*(r+0.01),0.3,1.05,0.3,dk,0,-a);}}
function cMerlons(M,x0,z0,x1,z1,y,col,step){const L=Math.hypot(x1-x0,z1-z0),n=Math.max(1,Math.floor(L/(step||1.5)));const a=Math.atan2(z1-z0,x1-x0);for(let k=0;k<n;k+=2){const t=(k+0.5)/n;oBox(M,x0+(x1-x0)*t,y+0.4,z0+(z1-z0)*t,(step||1.5)*0.55,0.8,0.5,col,0,a);}}
// a pointed (Gothic) or round-headed window on a wall facing ±x or ±z ('x+', 'z-' ...): plane is the wall's x or z, u the position along it
function cWin(M,face,u,y,plane,w,h,gothic,col,lit){const w0=plane;const dk=lit?[1,0.86,0.55]:[0.13,0.15,0.2],mt=lit?9:0,sill=col||[0.95,0.94,0.9];
  if(face[0]==='z'){const z=face[1]==='+'?w0+0.05:w0-0.05;oBox(M,u,y,z,w,h,0.06,dk,mt);oBox(M,u,y-h/2-0.06,z,w+0.24,0.12,0.12,sill,0);
    if(gothic){oTri(M,[u-w/2,y+h/2,z],[u+w/2,y+h/2,z],[u,y+h/2+w*0.9,z],dk,mt);}else oArch(M,[u,y+h/2,z],w/2,'x',dk,mt);}
  else{const x=face[1]==='+'?w0+0.05:w0-0.05;oBox(M,x,y,u,0.06,h,w,dk,mt);oBox(M,x,y-h/2-0.06,u,0.12,0.12,w+0.24,sill,0);
    if(gothic){oTri(M,[x,y+h/2,u-w/2],[x,y+h/2,u+w/2],[x,y+h/2+w*0.9,u],dk,mt);}else oArch(M,[x,y+h/2,u],w/2,'z',dk,mt);}}
// a gable roof on its own colours (ridge along x, or along z with axis 'z'): walls Lx by Wz, eaves drop with the pitch
function cRoof(M,cx,cz,L,Wd,y0,rise,ov,col,gc,axis){const X=axis==='z',P=(u,y,v)=>X?[cx+v,y,cz+u]:[cx+u,y,cz+v],a=(X?Wd:L)/2,b=(X?L:Wd)/2,yE=y0-ov*rise/b;
  oQuad(M,P(-a-ov,yE,-b-ov),P(a+ov,yE,-b-ov),P(a+ov,y0+rise,0),P(-a-ov,y0+rise,0),col,0);oQuad(M,P(a+ov,yE,b+ov),P(-a-ov,yE,b+ov),P(-a-ov,y0+rise,0),P(a+ov,y0+rise,0),col,0);
  for(const e of [-1,1])oTri(M,P(e*a,y0,-b),P(e*a,y0,b),P(e*a,y0+rise,0),gc,0);}
// a rocky plinth: rounded-oblong rings (half extents A,B, corner radius R) from the foot up to the terrace, jittered in the middle
function cPlinth(M,rings,col,seed){const rr=(A,B,R,j,rng)=>{const p=[];for(const [sx,sz,a0] of [[1,1,0],[-1,1,1.5708],[-1,-1,3.1416],[1,-1,4.7124]])for(let k=0;k<4;k++){const a=a0+k/3*1.5708,q=1+(rng?(rng()-0.5)*j:0);p.push([(sx*(A-R)+Math.cos(a)*R)*q,(sz*(B-R)+Math.sin(a)*R)*q]);}return p;};
  const rg=mulberry32(seed),R=rings.map(([y,A,B,Rc,j])=>[y,rr(A,B,Rc,j,j?rg:null)]);
  for(let i=0;i+1<R.length;i++){const [y0,a]=R[i],[y1,b]=R[i+1];for(let k=0;k<a.length;k++){const k1=(k+1)%a.length;oQuad(M,[a[k][0],y0,a[k][1]],[a[k1][0],y0,a[k1][1]],[b[k1][0],y1,b[k1][1]],[b[k][0],y1,b[k][1]],col,0);}}
  const [yt,top]=R[R.length-1];for(let k=0;k<top.length;k++){const k1=(k+1)%top.length;oTri(M,[0,yt,0],[top[k][0],yt,top[k][1]],[top[k1][0],yt,top[k1][1]],col,0);}}

// Neuschwanstein (after the castle above the Pöllat gorge; +x is the gate side, east). From the gate: the red-brick gatehouse
// with its round corner towers and battlements; the lower courtyard; the Knights' House with its ground-floor arcade and the
// Square Tower with its gallery, loggia and pinnacled spire; the Bower with two corbelled turrets; the slender stair tower,
// the tallest, with a window spiral and an open lantern under its spire; the white Palas, five storeys of paired round-arched
// windows between string courses, a steep slate roof with dormers and a gilded ridge, corbelled turrets on its corners, a
// pinnacle on the courtyard gable; and at the west end the Throne Hall with its apse and two balconies over the cliff.
function castleMesh(){const M=omesh(),wh=[0.93,0.91,0.86],st=[0.8,0.77,0.71],sl=[0.29,0.34,0.42],br=[0.7,0.43,0.31],gd=[0.95,0.78,0.3],dk=[0.13,0.15,0.2],rk=[0.55,0.53,0.5],ty=1.2;
  cPlinth(M,[[-8,37,20,8,0],[-3.5,34,17,5,0.1],[0.3,31.2,14.2,3,0]],rk,77);for(let k=0;k<10;k++){const a=k*0.63+0.2,x=Math.cos(a)*34,z=Math.sin(a)*17;oIco(M,x,-4,z,2.2+(k%3)*0.7,rk,0,{sy:0.8,jit:0.25,seed:90+k});}
  oBox(M,0,0.6,0,60,1.2,26,st,0);for(const z of [-12.8,12.8])oBox(M,-1,1.65,z,58,0.9,0.4,st,0);oBox(M,-29.8,1.65,0,0.4,0.9,25.6,st,0);
  // gatehouse (x 16..27, z ±11)
  oBox(M,22,7.1,0,10,11.8,22,br,0);for(const y of [5.2,9.6])oBox(M,22,y,0,10.12,0.22,22.12,wh,0);cMerlons(M,17,-11,27,-11,13,br);cMerlons(M,17,11,27,11,13,br);cMerlons(M,27,-11,27,11,13,br);cRoof(M,22,0,9.4,21.4,13.02,1.1,0,sl,br);
  for(const z of [-11,11])cTower(M,27,z,2.5,0,16.5,{col:br,st:wh,crown:true,cone:5.5,winRows:3});
  oBox(M,27.05,4.2,0,0.2,6,4.4,[0.12,0.1,0.09],0);oArch(M,[27.16,7.2,0],2.2,'z',[0.12,0.1,0.09],0,8);oArch(M,[27.2,7.2,0],2.45,'z',wh,0,8);
  for(const z of [-7,-4,4,7])for(const y of [7.3,11.2])cWin(M,'x+',z,y,27,0.9,1.5,false,wh,y>10&&z===4);
  for(const x of [18.5,22,25.5])for(const y of [7.3,11.2])for(const s of ['z+','z-'])cWin(M,s,x,y,s==='z+'?11:-11,0.9,1.5,false,wh);
  // lower courtyard walls, the Knights' House with its arcade (x 9..16, z 6..12) and the Square Tower (x 2..9, z 5.5..12.5)
  oBox(M,9,3.6,-12,14,4.8,1.2,wh,0);cMerlons(M,2,-12,16,-12,6,wh);
  oBox(M,12.5,7.6,9,7,12.8,6,wh,0);cRoof(M,12.5,9,7,6,14,3.4,0.3,sl,wh);for(let k=0;k<4;k++){const x=9.8+k*1.8;oBox(M,x,2.6,5.97,1.2,2.4,0.06,dk,0);oArch(M,[x,3.8,5.93],0.6,'x',dk,0);}
  for(const x of [10.4,12.5,14.6])for(const y of [7,10.2])cWin(M,'z-',x,y,6,0.7,1.4,false,wh,y>9&&x===12.5);
  oBox(M,5.5,17.6,9,7,32.8,7,wh,0);for(const y of [12,22])oBox(M,5.5,y,9,7.12,0.25,7.12,st,0);oBox(M,5.5,30.2,9,8.2,0.3,8.2,st,0);for(let x=1.7;x<=9.31;x+=0.95)for(const z of [4.95,13.05])oBox(M,x,30.85,z,0.12,1.0,0.12,st,0);
  for(const [f,u,pl] of [['x+',9,9],['x-',9,2],['z+',5.5,12.5],['z-',5.5,5.5]])for(const d of [-1.4,0,1.4])cWin(M,f,u+d,32.4,pl,0.8,1.6,false,wh);
  for(const y of [6,10,15,19,24])cWin(M,'x+',9,y,9,0.9,1.4,false,wh,y===24);
  oPrism(M,5.5,9,5.2,0.05,34,46,4,sl,0,0.7854);oLimb(M,[5.5,45.8,9],[5.5,48,9],0.06,0.04,4,gd,0);for(const dx of [-3.3,3.3])for(const dz of [-3.3,3.3]){oPrism(M,5.5+dx,9+dz,0.45,0.04,34,37.2,6,sl,0);oBox(M,5.5+dx,34,9+dz,0.6,0.3,0.6,st,0);}
  oLimb(M,[9.2,34,12.6],[9.2,38.5,12.6],0.03,0.03,4,wh,0);oBox(M,9.95,37.9,12.6,1.4,0.5,0.03,[0.95,0.96,1],0);oBox(M,9.95,37.4,12.6,1.4,0.5,0.03,[0.25,0.45,0.8],0);
  // Palas (x -23..3, z ±6.5, up to 27): string courses, five storeys of paired arched windows, the Singers' Hall taller arches
  const px=-10,PL=26,PW=13,PH=27;oBox(M,px,(PH+ty)/2,0,PL,PH-ty,PW,wh,0);oBox(M,px,ty+0.5,0,PL+0.12,1.0,PW+0.12,st,0);for(const y of [6,10.6,15.2,20.8,24.6])oBox(M,px,y,0,PL+0.1,0.22,PW+0.1,st,0);
  for(let f=0;f<5;f++)for(let w=0;w<8;w++){const x=px-PL/2+1.9+w*3.15,big=f===3,y=[3.8,8.2,12.8,17.8,22.6][f],h=big?2.8:1.7;for(const s of ['z+','z-'])for(const d of [-0.36,0.36])cWin(M,s,x+d,y,s==='z+'?PW/2:-PW/2,0.5,h,false,wh,f===4&&w%3===1);
    for(const z of [-1,1])oBox(M,x,y,z*(PW/2+0.08),0.12,h+0.4,0.08,wh,0);}
  {const R0=PH-0.4*13/(PW/2);cRoof(M,px,0,PL,PW,PH,13,0.4,sl,wh);oBox(M,px,PH+13.05,0,PL+0.8,0.18,0.22,gd,0);for(const x of [-19,-14,-9,-4,1])for(const s of [-1,1]){const zz=s*3.9,yb=PH+13*(1-3.9/6.5);oBox(M,x,yb+0.3,zz,1.3,1.8,1.4,wh,0);cRoof(M,x,zz,1.3,1.4,yb+1.2,1.2,0.1,sl,wh,'z');cWin(M,s>0?'z+':'z-',x,yb+0.3,s*(Math.abs(zz)+0.7),0.5,0.9,false,wh);}}
  for(const y of [29,33])cWin(M,'x+',0,y,3,0.8,1.6,false,wh);oPrism(M,3.1,0,0.5,0.04,PH+12.5,PH+16,6,sl,0);oLimb(M,[3.1,PH+15.8,0],[3.1,PH+17.2,0],0.04,0.03,4,gd,0);
  for(const [x,z] of [[px-PL/2,-PW/2],[px-PL/2,PW/2],[px+PL/2,-PW/2],[px+PL/2,PW/2]])cTower(M,x,z,1.5,PH-8,PH+2,{corbel:true,cone:5.5,winRows:2,winPer:3});
  // Throne Hall at the west end: the bay, its apse with tall windows and a conical roof, two semicircular balconies
  oBox(M,-26,(23+ty)/2,0,6,23-ty,8,wh,0);oPrism(M,-29,0,4,4,ty,23,12,wh,0,0.26);oPrism(M,-29,0,4.4,4.4,22.55,23,12,st,0,0.26);oPrism(M,-29,0,4.5,0.05,23,29,12,sl,0,0.26);cRoof(M,-26,0,6,8,23,4,0.2,sl,wh);
  for(let k=0;k<7;k++){const a=Math.PI/2+k/6*Math.PI,ca=Math.cos(a),sa=Math.sin(a);for(const y of [8,15.5])oBox(M,-29+ca*4.02,y,sa*4.02,0.3,y>10?4.2:2,0.85,dk,0,a);}
  for(const y of [11.8,18.6]){oPrism(M,-29,0,5.1,5.1,y,y+0.3,12,st,0,0.26);for(let k=0;k<12;k++){const a=k/12*6.2832;if(Math.cos(a)>0.2)continue;oBox(M,-29+Math.cos(a)*4.95,y+0.75,Math.sin(a)*4.95,0.08,0.9,0.08,st,0);}}
  // stair tower (the tallest): window spiral, an open lantern of eight columns, the spire; and the Bower with its turrets
  {const x=4.6,z=-3.2,r=2.3;cTower(M,x,z,r,ty,46,{winRows:9,winPer:2,spiral:0.7});for(let k=0;k<8;k++){const a=k/8*6.2832;oBox(M,x+Math.cos(a)*r*0.9,47.2,z+Math.sin(a)*r*0.9,0.3,2.4,0.3,wh,0,-a);}
    oPrism(M,x,z,r*1.05,r*1.05,48.4,48.9,12,st,0);oPrism(M,x,z,r*1.1,0.06,48.9,60,12,sl,0);oLimb(M,[x,59.8,z],[x,62,z],0.06,0.04,4,gd,0);oIco(M,x,60.6,z,0.16,gd,0,{seed:5});}
  oBox(M,4,(16+ty)/2,-8,10,16-ty,7,wh,0);cRoof(M,4,-8,10,7,16,5,0.3,sl,wh);cTower(M,9.5,-11.5,1.6,10,20,{corbel:true,cone:5,winRows:2,winPer:3});cTower(M,-1,-12,1.4,10,19,{corbel:true,cone:4.5,winRows:2,winPer:3});
  for(let w=0;w<3;w++)for(let f=0;f<3;f++)for(const d of [-0.3,0.3])cWin(M,'z-',1+w*3+d,4+f*4,-11.5,0.45,1.5,false,wh,f===2&&w===1);
  return M;}

// Hohenzollern (after the castle on its conical hill; +x is the gate). A ring of grey stone bastion walls with battlements
// and corbelled bartizans on every point, the Eagle Gate tower; inside on the raised platform the Grafensaal block, two
// wings with Gothic windows and battlemented parapets, the chapel with buttresses, tall pointed windows, an apse and a
// slender flèche, and the cluster of towers: the round Markgrafenturm (tallest, crowned and spired), the square
// Wilhelmsturm with four corner bartizans and a spire, the crowned Kaiserturm and the Bischofsturm, plus corner turrets.
function hohenzollernMesh(){const M=omesh(),hs=[0.66,0.62,0.55],hd=[0.52,0.49,0.44],hr=[0.25,0.27,0.31],gd=[0.92,0.76,0.3],dk=[0.12,0.13,0.16],rk=[0.5,0.48,0.45],o={col:hs,st:hd,sl:hr,dk};
  cPlinth(M,[[-10,46,46,22,0],[-4,42,41,16,0.12],[0.3,39.2,38.6,13,0]],rk,51);
  // bastion ring: nine points (the gate at +x), battered walls 9.6 m high, merlons, a bartizan on each point
  const PTS=[];for(let k=0;k<9;k++){const a=k/9*6.2832,r=k===0?37:k%3===0?37.5:34+((k*7)%3);PTS.push([Math.cos(a)*r,Math.sin(a)*r]);}
  for(let k=0;k<9;k++){const a=PTS[k],b=PTS[(k+1)%9],mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2,dx=(b[0]-a[0])/2,dz=(b[1]-a[1])/2,L=Math.hypot(dx,dz),nx=-dz/L,nz=dx/L,inw=(mx*nx+mz*nz)>0?-1:1;
    oOBox(M,[mx,4.8,mz],[dx,0,dz],[0,4.8,0],[nx*1.2,0,nz*1.2],hs,0);oOBox(M,[mx-nx*inw*0.3,1.3,mz-nz*inw*0.3],[dx,0,dz],[0,1.3,0],[nx*1.6,0,nz*1.6],hd,0);
    const ox=-nx*inw*0.95,oz=-nz*inw*0.95,n=Math.floor(L*2/1.6);for(let q=0;q<n;q+=2){const t=(q+0.5)/n;oBox(M,a[0]+(b[0]-a[0])*t+ox,10.0,a[1]+(b[1]-a[1])*t+oz,0.8,0.9,0.5,hs,0,Math.atan2(dz,dx));}
    for(let q=1;q<n;q+=3){const t=(q+0.5)/n;oBox(M,a[0]+(b[0]-a[0])*t+ox*1.32,3.2,a[1]+(b[1]-a[1])*t+oz*1.32,0.25,0.7,0.25,dk,0,-Math.atan2(dz,dx));}}
  for(let k=1;k<9;k++){const [x,z]=PTS[k],l=Math.hypot(x,z);cTower(M,x*(1+1.2/l),z*(1+1.2/l),1.6,7.6,11.4,{...o,corbel:true,cone:3.6,winRows:1,winPer:3});}
  for(let k=0;k<9;k++){const a=PTS[k],b=PTS[(k+1)%9];oTri(M,[0,9.55,0],[a[0],9.55,a[1]],[b[0],9.55,b[1]],hd,0);}
  // the Eagle Gate tower on the +x point
  oBox(M,38,8.5,0,8,17,9,hs,0);oBox(M,42.05,4.0,0,0.12,5.6,3.4,dk,0);oTri(M,[42.08,6.8,-1.7],[42.08,6.8,1.7],[42.08,8.6,0],dk,0);cMerlons(M,34,-4.5,42,-4.5,17,hs,1.4);cMerlons(M,34,4.5,42,4.5,17,hs,1.4);cMerlons(M,42,-4.5,42,4.5,17,hs,1.4);
  oBox(M,42.08,12,0,0.06,1.8,1.4,gd,0);oBox(M,42.1,12.3,0,0.04,0.9,0.5,[0.12,0.12,0.12],0);for(const z of [-4.5,4.5])cTower(M,42,z,1.2,13,18,{...o,corbel:true,cone:3,winRows:1,winPer:2});
  for(const z of [-2.5,2.5])cWin(M,'x+',z,13.2,42,0.7,1.6,true,hd);
  // buildings on the platform (y 9.6): Grafensaal block, north and south wings, chapel
  const py=9.6;
  const block=(cx,cz,L,Wd,h,rise,rows)=>{oBox(M,cx,py+h/2,cz,L,h,Wd,hs,0);oBox(M,cx,py+0.5,cz,L+0.15,1,Wd+0.15,hd,0);for(const z of [cz-Wd/2,cz+Wd/2])cMerlons(M,cx-L/2,z,cx+L/2,z,py+h,hs,1.4);for(const x of [cx-L/2,cx+L/2])cMerlons(M,x,cz-Wd/2,x,cz+Wd/2,py+h,hs,1.4);
    cRoof(M,cx,cz,L-0.8,Wd-0.8,py+h,rise,0,hr,hs);
    for(let r=0;r<rows;r++){const y=py+2.8+r*3.7;for(let k=0;k<Math.floor(L/3.3);k++){const x=cx-L/2+1.9+k*3.3;for(const sg of [-1,1]){const z=cz+sg*(Wd/2+0.05),lit=r===rows-1&&k%4===1;oBox(M,x,y,z,0.85,1.9,0.06,lit?[1,0.86,0.55]:dk,lit?9:0);oTri(M,[x-0.425,y+0.95,z],[x+0.425,y+0.95,z],[x,y+1.7,z],dk,0);oBox(M,x,y-1.0,z,1.1,0.12,0.14,hd,0);}}
      for(let k=0;k<Math.floor(Wd/3.3);k++){const z=cz-Wd/2+1.9+k*3.3;for(const sg of [-1,1]){const x=cx+sg*(L/2+0.05);oBox(M,x,y,z,0.06,1.9,0.85,dk,0);oTri(M,[x,y+0.95,z-0.425],[x,y+0.95,z+0.425],[x,y+1.7,z],dk,0);}}}};
  block(-19,0,14,24,16,6,3);block(0,9,24,8,13,5,2);block(-2,-9,20,8,13,5,2);
  // chapel: nave, buttresses, tall pointed windows, east apse, a flèche on the ridge
  {const cx=18,cz=8,L=12,Wd=8,h=11;oBox(M,cx,py+h/2,cz,L,h,Wd,hs,0);cRoof(M,cx,cz,L,Wd,py+h,7,0.3,hr,hs);oPrism(M,cx+L/2,cz,4,4,py,py+h,10,hs,0,0.31);oPrism(M,cx+L/2,cz,4.3,0.05,py+h,py+h+6,10,hr,0,0.31);
    for(let k=0;k<4;k++){const x=cx-L/2+1.2+k*3.2;for(const s of [-1,1]){oBox(M,x,py+h*0.42,cz+s*(Wd/2+0.4),0.7,h*0.84,0.8,hd,0);if(k<3){const xw=x+1.6,z=cz+s*(Wd/2+0.05);oBox(M,xw,py+5.5,z,1.1,5.2,0.06,dk,0);oTri(M,[xw-0.55,py+8.1,z],[xw+0.55,py+8.1,z],[xw,py+9.4,z],dk,0);}}}
    oPrism(M,cx-1,cz,0.55,0.55,py+h+5.5,py+h+8.5,6,hd,0);oPrism(M,cx-1,cz,0.65,0.04,py+h+8.5,py+h+14,6,hr,0);oLimb(M,[cx-1,py+h+13.8,cz],[cx-1,py+h+15.6,cz],0.04,0.03,4,gd,0);}
  // towers
  cTower(M,-24,-12,4.4,py,44,{...o,crown:true,cone:12,winRows:6,winPer:4});oLimb(M,[-24,57.5,-12],[-24,61,-12],0.04,0.04,4,hs,0);oBox(M,-23.2,60.5,-12,1.5,0.9,0.03,[0.95,0.95,0.95],0);oBox(M,-23.2,60.05,-12,1.5,0.45,0.035,[0.08,0.08,0.08],0);
  {const x=-24,z=12;oBox(M,x,(py+40)/2,z,7,40-py,7,hs,0);for(const y of [20,30])oBox(M,x,y,z,7.15,0.25,7.15,hd,0);cMerlons(M,x-3.5,z-3.5,x+3.5,z-3.5,40,hs,1.3);cMerlons(M,x-3.5,z+3.5,x+3.5,z+3.5,40,hs,1.3);cMerlons(M,x+3.5,z-3.5,x+3.5,z+3.5,40,hs,1.3);cMerlons(M,x-3.5,z-3.5,x-3.5,z+3.5,40,hs,1.3);
    oPrism(M,x,z,4.0,0.05,40,50,4,hr,0,0.7854);oLimb(M,[x,49.8,z],[x,51.6,z],0.05,0.04,4,gd,0);for(const dx of [-3.5,3.5])for(const dz of [-3.5,3.5])cTower(M,x+dx,z+dz,1.1,35,41,{...o,corbel:true,cone:3.4,winRows:1,winPer:2});
    for(const y of [16,23,30,36])for(const [f,u,pl] of [['x+',z,x+3.5],['x-',z,x-3.5],['z+',x,z+3.5]])cWin(M,f,u,y,pl,0.8,1.9,true,hd);}
  cTower(M,8,-13,3.6,py,36,{...o,crown:true,cone:5,winRows:4,winPer:4});cTower(M,12,13,3.2,py,32,{...o,cone:8,winRows:4,winPer:3});
  for(const [x,z,y0,y1] of [[-12,13,18,27],[-12,-13,18,27],[8,-5,17,25],[12,5,18,26]])cTower(M,x,z,1.4,y0,y1,{...o,corbel:true,cone:4.2,winRows:1,winPer:3});
  return M;}
function busMesh(){const M=omesh(),cr=[0.93,0.88,0.72],rd=[0.74,0.16,0.12],gl=[0.2,0.25,0.3],bk=[0.1,0.1,0.1],ch=[0.82,0.83,0.86];
  oBox(M,0,1.15,0,9.4,1.2,2.45,rd,0);oBox(M,0,2.2,0,9.2,0.9,2.42,gl,0);oBox(M,0,2.82,0,9.2,0.35,2.45,cr,0);oLimb(M,[-4.5,2.95,0],[4.4,2.95,0],1.2,1.2,10,cr,0);oBox(M,0,1.72,0,9.45,0.1,2.5,ch,0);
  for(let x=-3.8;x<=3.8;x+=1.35)for(const z of [-1.23,1.23])oBox(M,x,2.2,z,0.12,0.95,0.04,cr,0);oBox(M,4.75,1.7,0,0.4,2.0,2.35,rd,0);oBox(M,4.96,2.25,0,0.05,0.8,2.0,gl,0);oBox(M,4.98,1.1,0,0.06,0.35,1.6,ch,0);
  for(const z of [-0.8,0.8]){oLimb(M,[5.0,1.15,z],[5.06,1.15,z],0.17,0.17,8,[1,0.95,0.8],9);}oBox(M,-4.75,1.6,0,0.3,1.8,2.35,rd,0);oBox(M,-4.92,2.3,0,0.05,0.6,1.8,gl,0);
  for(const x of [-3,3.1])for(const z of [-1.05,1.05])oLimb(M,[x,0.5,z*1.0],[x,0.5,z*1.18],0.5,0.5,10,bk,0);oBox(M,1.5,1.5,1.24,0.9,1.9,0.04,[0.55,0.12,0.1],0);return M;}
function busStopMesh(){const M=omesh(),gn=[0.18,0.35,0.26],yl=[0.98,0.82,0.15];oLimb(M,[0,0,0],[0,2.8,0],0.05,0.05,6,[0.6,0.6,0.62],0);oLimb(M,[0,2.85,-0.03],[0,2.85,0.03],0.32,0.32,12,yl,0);oLimb(M,[0,2.85,-0.04],[0,2.85,0.04],0.2,0.2,12,gn,0);
  oBox(M,1.8,1.25,1.2,3.0,2.5,0.06,[0.6,0.7,0.75],0);for(const x of [0.3,3.3])oBox(M,x,1.25,0.6,0.08,2.5,1.3,gn,0);oBox(M,1.8,2.55,0.6,3.4,0.1,1.6,gn,0);oBox(M,1.8,0.5,0.95,2.6,0.08,0.4,[0.5,0.36,0.22],0);return M;}
// bakery: brick townhouse with a big lit shop window, striped awning, a hanging bread sign, crates of loaves and a bench
function shopBase(M,w,d,h,wall,roof){oBox(M,0,h/2,0,w,h,d,wall,0);oBox(M,0,0.15,0,w+0.3,0.3,d+0.3,[0.42,0.4,0.38],0);const yE=h-0.4*2.6/(d/2),a=[-w/2-0.3,yE,-d/2-0.4],b=[w/2+0.3,yE,-d/2-0.4],r1=[w/2+0.3,h+2.6,0],r0=[-w/2-0.3,h+2.6,0],c2=[w/2+0.3,yE,d/2+0.4],d2=[-w/2-0.3,yE,d/2+0.4];oQuad(M,a,b,r1,r0,roof,0);oQuad(M,r0,r1,c2,d2,roof,0);for(const e of [-1,1])oTri(M,[e*w/2,h,-d/2],[e*w/2,h,d/2],[e*w/2,h+2.6,0],wall,0);
  for(const x of [-w/4,w/4])oBox(M,x,h-1.3,-d/2-0.02,1.0,1.2,0.05,[0.2,0.22,0.26],0);}
// the lit shop window now sits in front of its frame (the frame used to cover it completely)
function bakeryMesh(){const M=omesh(),br=[0.66,0.36,0.26];shopBase(M,7,7,5.6,br,[0.32,0.24,0.2]);oBox(M,-1.2,1.35,-3.55,3.4,1.9,0.04,[1,0.85,0.55],9);oBox(M,-1.2,1.35,-3.52,3.6,2.1,0.03,[0.2,0.16,0.12],0);
  oBox(M,2.2,1.15,-3.53,1.0,2.2,0.06,[0.35,0.22,0.14],0);for(let k=0;k<6;k++)oBox(M,-3.2+k*0.65,2.75,-4.1,0.65,0.06,1.2,k%2?[0.95,0.92,0.85]:[0.78,0.18,0.14],0);
  oLimb(M,[2.9,3.2,-3.5],[2.9,3.2,-4.3],0.03,0.03,4,[0.15,0.15,0.15],0);oLimb(M,[2.9,2.84,-4.25],[2.9,2.84,-4.35],0.32,0.32,10,[0.85,0.62,0.3],0);oBox(M,-3.0,0.4,-4.3,1.4,0.5,0.6,[0.5,0.36,0.22],0);for(let k=0;k<4;k++)oIco(M,-3.5+k*0.33,0.73,-4.3,0.14,[0.86,0.62,0.32],0,{sy:0.6,seed:30+k});
  oBox(M,0.6,0.45,-4.2,1.6,0.08,0.4,[0.45,0.3,0.18],0);for(const x of [0,1.2])oBox(M,x,0.22,-4.2,0.08,0.44,0.35,[0.2,0.2,0.2],0);return M;}
// restaurant: plastered house with a lit dining room, a canvas awning and a terrace of tables with chairs and parasols
function restaurantMesh(){const M=omesh(),wl=[0.93,0.88,0.74];shopBase(M,8,7.5,5.8,wl,[0.55,0.22,0.16]);for(const x of [-2.6,0,2.6])oBox(M,x,1.5,-3.78,1.6,1.6,0.05,[1,0.82,0.5],9);oBox(M,3.3,1.15,-3.78,0.9,2.2,0.06,[0.3,0.18,0.12],0);
  oBox(M,0,2.95,-4.3,8.2,0.08,1.6,[0.16,0.36,0.24],0);oBox(M,0,2.75,-5.08,8.2,0.35,0.04,[0.16,0.36,0.24],0);oBox(M,0,0.05,-6.2,9,0.1,4.6,[0.6,0.56,0.5],0);
  for(const [x,z] of [[-2.8,-5.5],[0,-6.6],[2.8,-5.5],[-1.4,-7.6],[1.6,-7.8]]){oPrism(M,x,z,0.45,0.45,0.72,0.78,10,[0.95,0.95,0.93],0);oLimb(M,[x,0,z],[x,0.72,z],0.05,0.05,5,[0.2,0.2,0.2],0);
    // terrace chairs get legs (seats used to float 0.3 m above the terrace)
    for(const q of [[0.7,0],[-0.7,0]]){oBox(M,x+q[0],0.45,z,0.4,0.06,0.4,[0.35,0.24,0.16],0);oBox(M,x+q[0]*1.25,0.75,z,0.05,0.6,0.4,[0.35,0.24,0.16],0);for(const a of [-0.17,0.17])for(const b of [-0.17,0.17])oBox(M,x+q[0]+a,0.26,z+b,0.04,0.32,0.04,[0.2,0.2,0.2],0);}
    oLimb(M,[x,0.78,z],[x,2.4,z],0.025,0.025,4,[0.9,0.9,0.9],0);oPrism(M,x,z,1.1,0.05,2.15,2.55,8,[1,1,1],18);}
  oBox(M,-3.9,0.75,-3.85,0.08,1.3,0.7,[0.15,0.12,0.1],0);return M;}
// town bank (an upgrade; it takes the place of a townhouse near the square, front faces -z): a stone building on a plinth
// with a portico of four columns under a pediment and a gilded frieze, a panelled door with a fanlight, tall arched windows,
// a cornice and a balustrade, and a flag on the roof
function bankMesh(){const M=omesh(),sw=[0.86,0.82,0.74],sd=[0.62,0.6,0.56],wh=[0.95,0.94,0.9],gd=[0.92,0.74,0.3],dk=[0.16,0.18,0.22];
  oBox(M,0,-1.2,0.3,8.6,3.0,8.6,sd,0);oBox(M,0,3.3,0.4,8,6.0,7.7,sw,0);for(const y of [1.2,2.3])oBox(M,0,y,0.4,8.08,0.08,7.78,sd,0);
  oBox(M,0,6.45,0.4,8.5,0.3,8.2,wh,0);oBox(M,0,6.85,0.4,7.6,0.5,7.3,sw,0);for(let x=-3.5;x<=3.51;x+=0.7)for(const z of [-3.25,4.05])oBox(M,x,7.35,z,0.14,0.5,0.14,wh,0);for(const z of [-3.25,4.05])oBox(M,0,7.62,z,7.4,0.08,0.2,wh,0);
  oBox(M,0,0.15,-4.15,6.4,0.3,1.5,sd,0);oBox(M,0,0.4,-3.95,5.8,0.2,1.1,sd,0);
  for(const x of [-2.6,-0.9,0.9,2.6]){oPrism(M,x,-4.0,0.34,0.34,0.5,0.72,12,wh,0);oPrism(M,x,-4.0,0.27,0.24,0.72,4.95,12,wh,0);oBox(M,x,5.05,-4.0,0.72,0.22,0.72,wh,0);}
  oBox(M,0,5.45,-3.85,6.4,0.6,1.5,wh,0);oBox(M,0,5.45,-4.62,5.8,0.24,0.04,gd,0);
  oTri(M,[-3.2,5.75,-4.6],[3.2,5.75,-4.6],[0,6.95,-4.6],wh,0);oQuad(M,[-3.2,5.75,-4.6],[0,6.95,-4.6],[0,6.95,-3.3],[-3.2,5.75,-3.3],[0.55,0.56,0.58],0);oQuad(M,[3.2,5.75,-4.6],[3.2,5.75,-3.3],[0,6.95,-3.3],[0,6.95,-4.6],[0.55,0.56,0.58],0);
  oLimb(M,[0,6.2,-4.63],[0,6.2,-4.6],0.3,0.3,12,gd,0);
  oBox(M,0,1.55,-3.47,1.5,2.5,0.06,[0.3,0.2,0.13],0);oArch(M,[0,2.8,-3.48],0.75,'x',dk,0);oBox(M,0,2.8,-3.5,1.6,0.1,0.06,wh,0);
  for(const x of [-3.1,3.1])oBox(M,x,2.6,-3.47,0.9,2.0,0.06,dk,0);
  for(const e of [-1,1])for(const z of [-1.4,1.0,3.3]){oBox(M,e*4.02,2.6,z,0.06,2.2,1.0,dk,0);oArch(M,[e*4.05,3.7,z],0.5,'z',dk,0);oBox(M,e*4.05,1.45,z,0.1,0.12,1.2,wh,0);}
  oLimb(M,[2.8,7.1,2.8],[2.8,10.2,2.8],0.04,0.04,6,wh,0);oBox(M,3.35,9.7,2.8,1.1,0.7,0.03,[0.75,0.15,0.12],0);
  return M;}
// hot-air balloon (three liveries): a teardrop envelope of 16 gores from the throat ring up to the crown, a load ring,
// rigging down to a wicker basket with a padded rim, the burner frame and the burner (it glows a little)
function balloonMesh(v){const M=omesh(),P2=[[0,1.3,6.2],[1,2.6,8.0],[2,5.2,10.6],[3,7.0,13.4],[4,7.8,16.4],[5,7.5,19.2],[6,6.2,21.6],[7,3.8,23.4],[8,0.01,24.3]],n=16,
    L=[[[0.86,0.16,0.14],[0.98,0.82,0.18]],[[0.16,0.32,0.72],[0.96,0.96,0.94]],[[0.9,0.3,0.15],[0.2,0.55,0.35]]][v%3],band=[0.97,0.95,0.9];
  for(let i=0;i+1<P2.length;i++){const [,r0,y0]=P2[i],[,r1,y1]=P2[i+1];for(let k=0;k<n;k++){const a0=k/n*6.2832,a1=(k+1)/n*6.2832,col=i===4||i===5?(k%4<2?band:L[k%2]):L[(k+(v===2?i:0))%2];
      oQuad(M,[Math.cos(a0)*r0,y0,Math.sin(a0)*r0],[Math.cos(a1)*r0,y0,Math.sin(a1)*r0],[Math.cos(a1)*r1,y1,Math.sin(a1)*r1],[Math.cos(a0)*r1,y1,Math.sin(a0)*r1],col,0);}}
  oLimb(M,[0,6.15,0],[0,6.3,0],1.36,1.36,16,[0.3,0.25,0.2],0,false);
  const wk=[0.62,0.46,0.27];oBox(M,0,0.55,0,1.4,1.1,1.4,wk,0);oBox(M,0,1.14,0,1.56,0.12,1.56,[0.42,0.28,0.18],0);for(let y=0.2;y<1;y+=0.25)oBox(M,0,y,0,1.42,0.03,1.42,[0.5,0.36,0.22],0);
  for(const dx of [-0.65,0.65])for(const dz of [-0.65,0.65]){oLimb(M,[dx,1.15,dz],[dx*0.5,2.6,dz*0.5],0.025,0.025,4,[0.25,0.25,0.25],0);oLimb(M,[dx*0.5,2.6,dz*0.5],[dx*1.95,6.2,dz*1.95],0.012,0.012,4,[0.2,0.2,0.2],0);}
  oBox(M,0,2.6,0,0.9,0.08,0.9,[0.3,0.3,0.32],0);oPrism(M,0,0,0.22,0.16,2.64,3.0,8,[0.55,0.56,0.6],0);oPrism(M,0,0,0.12,0.02,3.0,3.5,6,[1,0.75,0.35],9);
  return M;}
// market stall: posts, a counter with produce crates, a striped awning (front faces the square, local +x)
function stallMesh(){const M=omesh(),wd=[0.5,0.36,0.22];for(const x of [-0.9,0.9])for(const z of [-1.3,1.3])oLimb(M,[x,0,z],[x,2.3,z],0.04,0.04,4,wd,0);oBox(M,0.5,0.85,0,1.1,0.1,2.6,wd,0);oBox(M,0.5,0.45,0,1.0,0.8,2.5,[0.42,0.3,0.18],0);
  const cols=[[0.85,0.2,0.15],[0.95,0.75,0.2],[0.4,0.65,0.2],[0.9,0.5,0.15],[0.55,0.25,0.5]];for(let k=0;k<4;k++){oBox(M,0.55,0.98,-0.95+k*0.63,0.8,0.16,0.55,[0.6,0.45,0.28],0);oIco(M,0.55,1.1,-0.95+k*0.63,0.3,cols[k%5],0,{sy:0.4,seed:40+k});}
  for(let k=0;k<6;k++){const z0=-1.45+k*0.48;oQuad(M,[-1.05,2.4,z0],[-1.05,2.4,z0+0.48],[1.25,2.05,z0+0.48],[1.25,2.05,z0],k%2?[0.97,0.95,0.9]:[1,1,1],k%2?0:20);}return M;}
// fallen leaves on a platform (a loose drift about 1.2 m across), a swept pile, and a filled leaf sack tied at the neck
const LEAF_C=[[0.82,0.42,0.12],[0.74,0.28,0.1],[0.9,0.62,0.18],[0.55,0.32,0.14],[0.68,0.5,0.16],[0.86,0.52,0.2]];
// a plank on two men's shoulders (centre at the origin, along x)
function plankCarryMesh(){const M=omesh();oBox(M,0,0,0,3.4,0.06,0.24,[0.8,0.64,0.44],0);oBox(M,0.4,0.07,0,3.0,0.06,0.22,[0.74,0.58,0.4],0);return M;}
function leafPatchMesh(){const M=omesh(),rng=mulberry32(91);for(let k=0;k<46;k++){const a=rng()*6.283,r=Math.pow(rng(),0.7)*0.7,x=Math.cos(a)*r,z=Math.sin(a)*r,s=0.07+rng()*0.05,t=rng()*3.14,c=Math.cos(t)*s,n=Math.sin(t)*s,y=0.012+rng()*0.012;
    oQuad(M,[x-c,y,z-n],[x-n,y+0.004,z+c],[x+c,y,z+n],[x+n,y+0.004,z-c],LEAF_C[k%LEAF_C.length],0);}return M;}
function leafPileMesh(){const M=omesh(),rng=mulberry32(93);oIco(M,0,0,0,0.5,[0.66,0.38,0.14],0,{sy:0.42,jit:0.22,seed:5,detail:1});
  for(let k=0;k<18;k++){const a=rng()*6.283,r=rng()*0.42,x=Math.cos(a)*r,z=Math.sin(a)*r,y=0.2*(1-r/0.5)+0.02,s=0.06;oQuad(M,[x-s,y,z],[x,y+0.03,z+s],[x+s,y,z],[x,y+0.03,z-s],LEAF_C[k%LEAF_C.length],0);}return M;}
function leafBagMesh(){const M=omesh(),bur=[0.62,0.52,0.36];oPrism(M,0,0,0.24,0.27,0.02,0.42,9,bur,0);oPrism(M,0,0,0.27,0.13,0.42,0.62,9,bur,0);oPrism(M,0,0,0.06,0.07,0.6,0.7,6,[0.5,0.4,0.26],0);oIco(M,0,0.73,0,0.07,bur,0,{seed:4});
  oPrism(M,0,0,0.135,0.135,0.585,0.61,9,[0.35,0.25,0.15],0);return M;}
// station hall for towns: brick hall with tall arched windows, a central clock tower and a canopy toward the platform
function stationHallMesh(){const M=omesh(),br=[0.62,0.32,0.24],st=[0.86,0.82,0.74],rf=[0.30,0.33,0.38];oBox(M,0,4,0,20,8,8,br,0);oBox(M,0,8.15,0,20.4,0.3,8.4,st,0);
  const a=[-10.4,8.3,-4.3],b=[10.4,8.3,-4.3],r1=[10.4,11.3,0],r0=[-10.4,11.3,0],c2=[10.4,8.3,4.3],d2=[-10.4,8.3,4.3];oQuad(M,a,b,r1,r0,rf,0);oQuad(M,r0,r1,c2,d2,rf,0);for(const e of [-1,1])oTri(M,[e*10.4,8.3,-4.3],[e*10.4,8.3,4.3],[e*10.4,11.3,0],br,0);
  for(let k=0;k<6;k++){const x=-7.5+k*3;for(const z of [-4.02,4.02]){oBox(M,x,3.6,z,1.4,4.2,0.05,[0.95,0.8,0.5],9);oPrism(M,x,z,0.7,0.7,5.7,6.1,8,st,0);}}
  oBox(M,0,9,0,3.4,18,3.4,br,0);oBox(M,0,18.2,0,3.8,0.4,3.8,st,0);oPrism(M,0,0,2.7,0.1,18.4,22,4,rf,0,0.785);for(const [x,z] of [[0,-1.72],[0,1.72]])oLimb(M,[x,15.5,z],[x,15.5,z*1.02],0.9,0.9,14,[0.96,0.95,0.9],0);
  for(const [x,z] of [[1.72,0],[-1.72,0]])oLimb(M,[x,15.5,z],[x*1.02,15.5,z],0.9,0.9,14,[0.96,0.95,0.9],0);oBox(M,0,1.6,-4.05,2.4,3.2,0.08,[0.3,0.2,0.14],0);
  oBox(M,0,4.2,-6.2,20,0.15,4.4,rf,0);for(let x=-9;x<=9;x+=3)oLimb(M,[x,0,-8.2],[x,4.1,-8.2],0.08,0.08,6,[0.25,0.32,0.28],0);return M;}
// 1950s lorry: rounded cab with a long bonnet, flatbed with a canvas tilt
function lorryMesh(){const M=omesh(),cb=[0.22,0.38,0.56],gl=[0.2,0.25,0.3],bk=[0.1,0.1,0.1],tl=[0.55,0.52,0.38];oBox(M,0,0.75,0,7.6,0.3,1.9,bk,0);
  oBox(M,2.9,1.25,0,1.8,0.9,1.6,cb,0);oLimb(M,[2.0,1.75,0],[3.8,1.6,0],0.55,0.45,8,cb,0);oBox(M,1.6,1.85,0,1.4,1.6,2.1,cb,0);oBox(M,2.31,2.15,0,0.04,0.7,1.8,gl,0);for(const z of [-1.06,1.06])oBox(M,1.6,2.15,z,0.9,0.6,0.03,gl,0);
  oBox(M,3.82,1.2,0,0.08,0.6,1.1,[0.8,0.8,0.82],0);for(const z of [-0.6,0.6])oLimb(M,[3.86,1.45,z],[3.92,1.45,z],0.13,0.13,8,[1,0.95,0.8],9);
  oBox(M,-1.6,1.15,0,4.4,0.12,2.2,[0.45,0.32,0.2],0);oBox(M,-1.6,1.95,0,4.4,1.5,2.2,tl,0);oLimb(M,[-3.8,2.7,0],[0.6,2.7,0],1.1,1.1,8,tl,0);
  for(const x of [-2.6,2.9])for(const z of [-1,1])oLimb(M,[x,0.5,z*0.95],[x,0.5,z*1.15],0.5,0.5,10,bk,0);return M;}
// a log with bark on its sides and pale end grain on its cut faces (static object meshes)
function oLog(M,a,b,r,sides,bark,endc){sides=sides||8;oLimb(M,a,b,r,r,sides,bark||[0.42,0.31,0.21],0,false);
  const d=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],l=Math.hypot(...d),ax=d.map(v=>v/l);let u=Math.abs(ax[1])<0.9?[0,1,0]:[1,0,0];
  let s=[ax[1]*u[2]-ax[2]*u[1],ax[2]*u[0]-ax[0]*u[2],ax[0]*u[1]-ax[1]*u[0]];const sl=Math.hypot(...s);s=s.map(v=>v/sl);const t=[ax[1]*s[2]-ax[2]*s[1],ax[2]*s[0]-ax[0]*s[2],ax[0]*s[1]-ax[1]*s[0]];
  const R=(p,k)=>{const an=k/sides*6.2832,c=Math.cos(an)*r,sn=Math.sin(an)*r;return[p[0]+s[0]*c+t[0]*sn,p[1]+s[1]*c+t[1]*sn,p[2]+s[2]*c+t[2]*sn];};const ec=endc||[0.86,0.72,0.5];
  for(let k=0;k<sides;k++){oTri(M,a,R(a,k+1),R(a,k),ec,0);oTri(M,b,R(b,k),R(b,k+1),ec,0);}}
// copy another object mesh into M, turned about y and moved (people and animals posed in a scene)
function oMerge(M,S,x,y,z,rot,sc){sc=sc||1;const c=Math.cos(rot||0),s=Math.sin(rot||0);for(let k=0;k<S.v.length;k+=10){const px=S.v[k]*sc,py=S.v[k+1]*sc,pz=S.v[k+2]*sc,nx=S.v[k+3],nz=S.v[k+5];
  M.v.push(x+px*c-pz*s,y+py,z+px*s+pz*c,nx*c-nz*s,S.v[k+4],nx*s+nz*c,S.v[k+6],S.v[k+7],S.v[k+8],S.v[k+9]);}M.n+=S.n;}
// a stack of logs along x on two bearers: rows of n, n-1, ... logs, each row resting on the one below
function oLogStack(M,x0,x1,zc,y0,r,rows,n,bark,endc,brg){const sp=2*r+0.02,dy=Math.sqrt(Math.pow(2*r-0.01,2)-Math.pow(sp/2,2));if(brg)for(const bx of [x0+0.8,x1-0.8])oBox(M,bx,y0-0.1,zc,0.3,0.2,n*sp+0.4,brg,0);
  for(let rr=0;rr<rows;rr++)for(let k=0;k<n-rr;k++){const z=zc+(k-(n-rr-1)/2)*sp,y=y0+r+rr*dy;oLog(M,[x0+(k%2)*0.12,y,z],[x1-((k+rr)%3)*0.1,y,z],r,8,bark,endc);}}
// sawmill (plot 40 × 30, +x faces the village; the loading sides are -x and ±z, where stations bring their own log yards).
// It shows the whole round-wood process: logs floated in the mill pond are hauled up the jack ladder onto a roller
// conveyor through an open timber saw shed, where a steam-driven pendulum saw cuts them to length; a horse team skids
// fresh logs to the cold deck; cut logs are stacked by the gate. The steam engine house drives the line shaft by a
// long belt from its flywheel; a water tank, the engine's brick stack, an office, sawdust and bark heaps, tools.
function sawmillMesh(){const M=omesh(),tb=[0.34,0.25,0.18],tl=[0.45,0.34,0.24],rf=[0.38,0.33,0.30],br=[0.62,0.32,0.24],ir=[0.22,0.22,0.24],st=[0.72,0.73,0.76],
    ground=[0.50,0.44,0.36],dust=[0.84,0.70,0.47],bark=[0.40,0.29,0.19],water=[0.18,0.30,0.31];
  oBox(M,0,0.08,0,40,0.16,30,ground,0);oBox(M,8.5,0.17,-1.6,9,0.02,6.5,dust,0);oBox(M,-12,0.17,-1.5,6,0.02,3,[0.46,0.36,0.26],0);
  // ---- open timber saw shed (x -6..10, z ±3.5): posts, plates, tie beams, knee braces, boarded gables, a ridge ventilator
  for(const x of [-6,-2,2,6,10])for(const z of [-3.5,3.5]){oBox(M,x,2.4,z,0.3,4.5,0.3,tb,0);for(const e of [-1,1])if((x>-6||e>0)&&(x<10||e<0))oLimb(M,[x,3.7,z],[x+e*0.95,4.62,z],0.07,0.07,4,tb,0);}
  for(const z of [-3.5,3.5])oBox(M,2,4.75,z,16.6,0.3,0.34,tb,0);for(const x of [-6,-2,2,6,10])oBox(M,x,4.75,0,0.26,0.26,7.3,tb,0);
  oGable(M,2,0,16,7,4.9,2.0,0.6,'x',rf,tl,0,0);oBox(M,2,6.95,0,6,0.9,0.9,tl,0);oGable(M,2,0,6,0.9,7.4,0.42,0.2,'x',rf,tl,0,0);
  // ---- roller conveyor from the jack ladder to the outfeed, with logs on it
  for(const z of [-0.45,0.45])oBox(M,1,0.75,z,28,0.14,0.1,tb,0);for(let x=-12.5;x<=14.5;x+=2.5)for(const z of [-0.45,0.45])oBox(M,x,0.44,z,0.12,0.6,0.12,tb,0);
  for(let x=-12.5;x<=14.5;x+=1)oLimb(M,[x,0.86,-0.5],[x,0.86,0.5],0.07,0.07,6,st,0);
  oLog(M,[-11.5,1.23,0],[-2.2,1.23,0],0.3,10,bark);oLog(M,[2.6,1.23,0],[6.9,1.23,0],0.3,10,bark);oLog(M,[8.4,1.23,0],[12.7,1.2,0],0.29,10,bark);
  // ---- pendulum cross-cut saw at x 2: arm hung from the tie beam, thin toothed blade cutting into the log, belt to the line shaft
  for(const x of [1.78,2.22])oLimb(M,[x,4.5,-1.6],[x,1.5,-1.0],0.05,0.05,4,ir,0);oLimb(M,[1.7,4.5,-1.6],[2.3,4.5,-1.6],0.09,0.09,6,ir,0);oBox(M,2,4.56,-1.6,0.7,0.16,0.3,ir,0);
  oLimb(M,[1.985,1.5,-1.0],[2.015,1.5,-1.0],0.9,0.9,18,st,0);for(let k=0;k<20;k++){const a=k/20*6.2832;oBox(M,2,1.5+Math.sin(a)*0.93,-1.0+Math.cos(a)*0.93,0.035,0.09,0.09,st,0);}
  oLimb(M,[1.7,1.5,-1.0],[2.32,1.5,-1.0],0.14,0.14,8,ir,0);oLimb(M,[2.24,1.5,-1.0],[2.4,1.5,-1.0],0.24,0.24,10,ir,0);oOBox(M,[2.32,2.95,-1.3],[0,1.43,-0.29],[0.02,0,0],[0,0.05,0.24],[0.2,0.16,0.12],0);
  oLimb(M,[1.78,1.6,-1.0],[1.5,1.1,-2.2],0.03,0.03,4,ir,0);oBox(M,1.5,1.07,-2.24,0.08,0.08,0.3,tb,0);oPrism(M,2,-1.0,0.18,0.14,0.16,0.55,6,tb,0);
  // line shaft under the tie beams with hangers and pulleys; the drive pulley takes the belt from the engine flywheel
  oLimb(M,[-5.6,4.33,-1.6],[9.6,4.33,-1.6],0.05,0.05,6,ir,0);for(const x of [-2,6])oBox(M,x,4.5,-1.6,0.12,0.32,0.12,ir,0);oLimb(M,[2.3,4.33,-1.6],[2.46,4.33,-1.6],0.32,0.32,12,ir,0);
  oLimb(M,[3.85,4.33,-1.6],[4.15,4.33,-1.6],0.5,0.5,14,ir,0);
  // ---- sawdust chute under the saw and the heap beside the shed; bark heap by the cold deck
  oOBox(M,[4.9,0.85,-3.3],[2.6,-0.35,-2.1],[0,0.1,0],[0.19,0,0.23],[0.42,0.32,0.22],0);oPrism(M,8.5,-6.3,2.4,0.25,0.16,1.6,12,dust,0);oIco(M,8.5,1.5,-6.3,0.35,dust,0,{sy:0.5,seed:3});
  oIco(M,-2.5,0.3,-9.5,1.7,bark,0,{sy:0.42,jit:0.18,detail:1,seed:9});
  // ---- steam engine house (x 1..9, z 7..12.5): brick, slate roof, arched windows, door, stack; flywheel and belt to the shed
  oBox(M,5,2.1,9.75,8,4.2,5.5,br,0);oBox(M,5,0.25,9.75,8.3,0.5,5.8,[0.42,0.40,0.38],0);oGable(M,5,9.75,8,5.5,4.2,2.0,0.4,'x',[0.32,0.34,0.38],br,0,0);
  for(const x of [2.6,7.4]){oBox(M,x,2.3,6.97,0.9,1.4,0.06,[0.16,0.18,0.22],0);oArch(M,[x,3.0,6.93],0.45,'x',[0.16,0.18,0.22],0);oBox(M,x,1.55,6.9,1.1,0.1,0.18,[0.8,0.78,0.74],0);}
  oBox(M,0.97,1.3,9.75,0.06,2.3,1.2,[0.32,0.22,0.15],0);oBox(M,0.97,2.4,10.9,0.06,0.9,0.7,[1,0.85,0.55],9);
  oBox(M,10,7,10,1.1,14,1.1,br,0);oBox(M,9.2,1.0,10,0.6,0.8,0.7,br,0);oBox(M,10,13.55,10,1.45,0.5,1.45,br,0);oBox(M,10,14.0,10,1.2,0.4,1.2,[0.14,0.13,0.13],0);for(const y of [4.5,9])oBox(M,10,y,10,1.18,0.12,1.18,[0.5,0.26,0.2],0);
  oLimb(M,[4,2.25,6.2],[4,2.25,7.1],0.13,0.13,8,ir,0);oLimb(M,[4,2.25,6.25],[4,2.25,6.55],1.9,1.9,22,ir,0,false);oLimb(M,[4,2.25,6.28],[4,2.25,6.52],1.72,1.72,22,ir,0,false);
  for(let k=0;k<6;k++){const a=k/6*6.2832;oLimb(M,[4,2.25,6.4],[4,2.25+Math.sin(a)*1.75,6.4+0*Math.cos(a)].map((v,i)=>i===0?4+Math.cos(a)*1.75:v),0.07,0.07,4,ir,0);}oLimb(M,[4,2.25,6.25],[4,2.25,6.55],0.32,0.32,10,ir,0);
  oPrism(M,4,6.4,0.5,0.5,0.0,0.3,8,[0.42,0.40,0.38],0);
  oOBox(M,[4,4.55,2.4],[0,0.15,-4.0],[0,0.02,0],[0.14,0,0],[0.3,0.22,0.16],0);oOBox(M,[4,2.0,2.4],[0,1.7,-4.0].map(v=>v),[0,0.02,0],[0.14,0,0],[0.3,0.22,0.16],0);
  // ---- water tank on a timber trestle, feeding the engine
  for(const dx of [-1,1])for(const dz of [-1,1])oBox(M,-1.5+dx,2.5,10.5+dz,0.24,5.0,0.24,tb,0);for(const y of [1.5,3.4])for(const dz of [-1,1])oBox(M,-1.5,y,10.5+dz,2.24,0.14,0.14,tb,0);oBox(M,-1.5,5.06,10.5,2.6,0.12,2.6,tb,0);
  oPrism(M,-1.5,10.5,1.25,1.25,5.12,6.9,14,tl,0);for(const y of [5.5,6.1,6.7])oPrism(M,-1.5,10.5,1.28,1.28,y,y+0.06,14,ir,0);oPrism(M,-1.5,10.5,1.4,0.08,6.9,7.6,14,rf,0);
  oLimb(M,[-0.3,5.2,10.5],[1.0,3.6,10.5],0.06,0.06,6,ir,0);
  // ---- log pond with a timber kerb and floating logs; the jack ladder lifts logs up to the conveyor
  oBox(M,-14,0.21,8.5,9.4,0.06,8.4,water,0);for(const z of [4.15,12.85])oBox(M,-14,0.3,z,10,0.3,0.3,tb,0);for(const x of [-18.85,-9.15])oBox(M,x,0.3,8.5,0.3,0.3,9,tb,0);
  for(const [x0,z0,a] of [[-17,6,0.1],[-16.5,8.2,-0.2],[-14,10.6,0.35],[-12.5,7.4,1.3],[-17.2,11,0.6],[-11.2,10.6,-0.4]]){const c=Math.cos(a)*2.4,s=Math.sin(a)*2.4;oLog(M,[x0-c,0.22,z0-s],[x0+c,0.22,z0+s],0.26,8,bark);}
  for(const x of [-12.75,-11.25])oOBox(M,[x,0.62,3.3],[0,0.42,-2.4],[0.08,0,0],[0,0.12,0.02],tb,0);for(let k=0;k<6;k++){const f=k/5;oBox(M,-12,0.27+f*0.8,5.6-f*4.6,1.5,0.06,0.1,ir,0);}oLog(M,[-13.4,0.95,2.4],[-10.6,0.95,2.4],0.27,8,bark);
  // ---- cold deck: logs skidded in from the woods, on three skids
  for(const x of [-17.5,-13.5,-9.5])oBox(M,x,0.24,-9,0.3,0.16,7.6,tb,0);
  {const r=0.32,sp=0.66,dy=Math.sqrt(0.63*0.63-0.33*0.33);for(let rr=0;rr<3;rr++)for(let k=0;k<6-rr;k++){const z=-9+(k-(5-rr)/2)*sp,y=0.32+r+rr*dy;oLog(M,[-18.6+(k%2)*0.2,y,z],[-8.8-((k+rr)%3)*0.25,y,z],r,9,bark);}}
  // a horse skids a fresh log in from the forest, its teamster walking alongside
  oMerge(M,horseMesh(),-4.6,0.16,-13.4,0,1.05);oLog(M,[-11.2,0.42,-13.4],[-6.8,0.36,-13.4],0.26,8,bark);for(const z of [-13.55,-13.25])oLimb(M,[-6.8,0.38,z],[-5.4,1.05,z],0.015,0.015,4,ir,0);
  oMerge(M,personMesh(),-4.2,0.16,-14.4,0.2);
  // ---- cut logs stacked by the gate, ready to go to the loading yards (no planks: round wood ships as logs)
  oLogStack(M,12.2,16.8,-9.5,0.36,0.27,3,6,bark,null,tb);oLogStack(M,12.2,16.8,-4.6,0.36,0.27,2,5,bark,null,tb);
  // ---- office (x 13..19, z 8..13.5): board walls with battens, tiled roof, porch, lit window, stovepipe; a bench
  oBox(M,16,1.5,10.75,5.6,3.0,5,[0.55,0.42,0.30],0);for(let x=13.4;x<=18.6;x+=0.55)oBox(M,x,1.5,8.23,0.06,3.0,0.04,[0.42,0.32,0.22],0);oGable(M,16,10.75,5.6,5,3.0,1.6,0.35,'x',[0.6,0.26,0.18],[0.55,0.42,0.30],0,0);
  oBox(M,15,1.2,8.2,0.9,2.1,0.06,[0.3,0.2,0.13],0);oBox(M,17.3,1.8,8.2,1.0,0.9,0.05,[1,0.85,0.55],9);oBox(M,16,2.7,7.5,5.8,0.1,1.6,[0.6,0.26,0.18],0);for(const x of [13.4,18.6])oBox(M,x,1.35,6.85,0.14,2.7,0.14,tb,0);
  oBox(M,16,0.25,7.5,5.6,0.18,1.4,tb,0);oLimb(M,[14,3.5,12.2],[14,5.4,12.2],0.08,0.08,6,ir,0);oBox(M,17.6,0.55,7.15,1.6,0.08,0.4,tb,0);for(const x of [16.95,18.25])oBox(M,x,0.34,7.15,0.08,0.36,0.36,tb,0);
  // gate sign with a saw-blade emblem, fence along the village side with the gate gap
  for(const z of [-2.6,2.6])oBox(M,19.6,1.6,z,0.22,3.2,0.22,tb,0);oBox(M,19.6,3.05,0,0.16,0.6,5.6,tl,0);oLimb(M,[19.48,3.05,0],[19.5,3.05,0],0.45,0.45,14,st,0);
  for(let k=0;k<12;k++){const a=k/12*6.2832;oBox(M,19.49,3.05+Math.sin(a)*0.47,Math.cos(a)*0.47,0.02,0.08,0.08,st,0);}
  for(const [z0,z1] of [[-14.8,-2.6],[2.6,14.8]]){for(let z=z0;z<=z1+0.01;z+=(z1-z0)/5)oBox(M,19.7,0.7,z,0.14,1.1,0.14,tb,0);for(const y of [0.55,1.0])oBox(M,19.7,y,(z0+z1)/2,0.07,0.1,z1-z0,tl,0);}
  // ---- tools and odds: grindstone with trough, chopping block with axe, cant hooks against a post, a wheelbarrow of sawdust
  oBox(M,11.6,0.5,3.2,0.9,0.12,0.5,tb,0);for(const x of [11.25,11.95])oBox(M,x,0.32,3.2,0.08,0.34,0.4,tb,0);oLimb(M,[11.52,0.95,3.2],[11.68,0.95,3.2],0.42,0.42,14,[0.62,0.6,0.56],0);
  oPrism(M,-3.5,7,0.34,0.3,0.16,0.75,8,tl,0,0,[0.82,0.7,0.5]);oLimb(M,[-3.5,0.75,7],[-3.0,1.25,6.85],0.025,0.025,4,[0.6,0.45,0.3],0);oBox(M,-3.48,0.79,7.0,0.24,0.1,0.06,st,0);
  for(const dz of [-0.2,0.2])oLimb(M,[-6.2,0.16,3.3+dz],[-6.06,1.6,3.52+dz],0.03,0.03,4,[0.6,0.45,0.3],0);
  oOBox(M,[6.6,0.62,-8.9],[0.55,0.05,0],[0,0.18,0],[0,0,0.36],[0.4,0.42,0.44],0);oLimb(M,[7.25,0.32,-8.9],[7.35,0.32,-8.9],0.2,0.2,10,ir,0);for(const z of [-9.15,-8.65])oLimb(M,[6.0,0.6,z],[5.4,0.75,z],0.03,0.03,4,tb,0);oIco(M,6.6,0.78,-8.9,0.3,dust,0,{sy:0.4,seed:4});
  return M;}
// wood workshop (joinery, cartwright and cooper): a brick shop with a north-light sawtooth roof (it reads as "workshop"),
// half-timbered gable office with the trade sign (a big chair and crossed saws), double doors open on a lit bench,
// an open timber-drying lean-to with racked planks, the wood delivery stack, and the products outside:
// chairs and a table, barrels, cart wheels against the wall, a finished hay cart, a sawhorse and a heap of shavings.
function workshopMesh(){const M=omesh(),br=[0.64,0.34,0.25],pl=[0.92,0.88,0.78],bm=[0.24,0.16,0.11],rf=[0.32,0.33,0.36],gl=[0.75,0.85,0.9],wd=[0.62,0.45,0.28],pk=[0.88,0.76,0.52];
  oBox(M,0,0.08,0,34,0.16,26,[0.55,0.5,0.42],0);
  // shop walls with a real doorway on the north side, so the open doors show the lit bench inside
  // (the doors used to sit inside the office block, and the shop was a closed box)
  oBox(M,-2,2.5,-5.9,16,5,0.2,br,0);oBox(M,5.9,2.5,-1,0.2,5,10,br,0);oBox(M,-9.9,2.5,-1,0.2,5,10,br,0);oBox(M,-5.6,2.5,3.9,8.8,5,0.2,br,0);oBox(M,4.6,2.5,3.9,2.8,5,0.2,br,0);oBox(M,1,4.15,3.9,4.4,1.7,0.2,br,0);
  for(const x of [-1.2,3.2])oBox(M,x,1.65,5.1,0.08,3.2,2.2,[0.35,0.22,0.14],0);
  oBox(M,1,0.95,2.8,3.5,0.12,1.0,wd,0);for(const x of [-0.6,2.6])for(const z of [2.4,3.2])oBox(M,x,0.53,z,0.1,0.74,0.1,bm,0);oBox(M,1,3.0,2.8,0.5,0.12,0.3,[1,0.85,0.55],9);oLimb(M,[1,3.06,2.8],[1,5.62,2.8],0.015,0.015,4,bm,0);
  // north-light sawtooth: each tooth slopes up toward -x and drops in a vertical glazed face; brick gable triangles at both ends
  for(let k=0;k<4;k++){const x0=-10+k*4,x1=x0+4;oQuad(M,[x1,5,-6.3],[x1,5,4.3],[x0,7.4,4.3],[x0,7.4,-6.3],rf,0);oQuad(M,[x0,5,-6],[x0,7.4,-6],[x0,7.4,4],[x0,5,4],gl,0);
    for(let z=-5;z<=3;z+=2)oBox(M,x0-0.03,6.2,z,0.06,2.4,0.08,bm,0);oBox(M,x0-0.03,5.05,-1,0.06,0.1,10,bm,0);for(const z of [-6,4])oTri(M,[x1,5,z],[x0,5,z],[x0,7.4,z],br,0);}
  oBox(M,-4,1.5,-6.03,8,1.4,0.06,gl,0);for(let x=-7.5;x<=-0.5;x+=1)oBox(M,x,1.5,-6.06,0.06,1.4,0.04,bm,0);
  oBox(M,9,3,-1,6,6,7,pl,0);for(const x of [6.1,11.9])oBox(M,x,3,-4.52,0.2,6,0.08,bm,0);for(const y of [0.2,3,5.9])oBox(M,9,y,-4.52,6,0.2,0.08,bm,0);for(const d of [-1,1])oLimb(M,[9-d*2.6,0.3,-4.55],[9+d*0.2,2.9,-4.55],0.07,0.07,4,bm,0);
  oQuad(M,[5.7,5.7,-4.9],[12.3,5.7,-4.9],[12.3,8.6,-1],[5.7,8.6,-1],[0.55,0.24,0.18],0);oQuad(M,[5.7,8.6,-1],[12.3,8.6,-1],[12.3,5.7,2.9],[5.7,5.7,2.9],[0.55,0.24,0.18],0);for(const e of [6,12])oTri(M,[e,6,-4.5],[e,6,2.5],[e,8.6,-1],pl,0);
  for(const x of [7.5,10.5])oBox(M,x,3.6,-4.56,1,1.1,0.04,[0.95,0.85,0.55],9);oBox(M,12.04,1.3,-1,0.06,2.4,1.1,[0.35,0.22,0.14],0);
  // seat and back turn with the chair (they used to stay axis-aligned while the legs turned)
  const chair=(x,y,z,sc,rot)=>{const c=Math.cos(rot),s2=Math.sin(rot),P=(u,w)=>[x+(c*u-s2*w)*sc,z+(s2*u+c*w)*sc];const q=P(0,0);oBox(M,q[0],y+0.75*sc,q[1],0.9*sc,0.1*sc,0.9*sc,wd,0,rot);for(const [u,w] of [[-0.4,-0.4],[0.4,-0.4],[0.4,0.4],[-0.4,0.4]]){const p=P(u,w);oLimb(M,[p[0],y,p[1]],[p[0],y+0.75*sc,p[1]],0.05*sc,0.05*sc,4,wd,0);}
    const b=P(-0.42,0);oBox(M,b[0],y+1.3*sc,b[1],0.1*sc,1.1*sc,0.9*sc,wd,0,rot);};
  // trade sign: a bracket from the gable wall with a tie rod, the board hanging from it on chains, and the big chair standing on the bracket end
  // (the board, its rods and the chair used to float in front of the wall)
  oBox(M,12.8,5.6,-1,1.6,0.14,0.14,bm,0);oLimb(M,[12,6.6,-1],[13.5,5.68,-1],0.02,0.02,4,bm,0);for(const x of [12.4,13.3])oLimb(M,[x,5.53,-1],[x,5.2,-1],0.015,0.015,4,[0.3,0.3,0.32],0);
  oBox(M,12.85,4.6,-1,1.3,1.2,0.08,[0.4,0.28,0.18],0);oBox(M,13.05,5.72,-1,1.0,0.1,1.0,bm,0);chair(13.1,5.77,-1,0.8,0);
  oBox(M,0,3.2,-6.1,3.2,0.9,0.1,[0.28,0.2,0.13],0);for(const d of [-1,1])oLimb(M,[-0.6,2.85,-6.18],[0.6,3.55,-6.18].map((v,i)=>i===0?d*0.6:v),0.03,0.03,4,[0.8,0.8,0.82],0);
  oBox(M,-11,2.1,8.5,10,0.12,5,rf,0);for(const x of [-15.5,-11,-6.5])for(const z of [6.2,10.8])oLimb(M,[x,0,z],[x,2.1,z],0.1,0.1,4,bm,0);for(let k=0;k<12;k++)oBox(M,-15+k*0.8,1.05,9.6,0.06,1.9,0.3,pk,0);for(let r=0;r<6;r++){oBox(M,-11,0.3+r*0.22,7.2,9,0.12,1.4,pk,0);for(const sx of [-4,0,4])oBox(M,-11+sx,0.19+r*0.22,7.2,0.1,0.1,1.4,bm,0);}
  for(let r=0;r<5;r++){oBox(M,-12,0.35+r*0.3,-9.5,6,0.16,2.6,pk,0);for(const sx of [-2.4,0,2.4])oBox(M,-12+sx,0.2+r*0.3,-9.5,0.1,0.14,2.6,bm,0);}
  for(const [x,z,r0] of [[10,5,0.4],[11.5,6.5,-0.6],[9,7.5,0.9]])chair(x,0.16,z,1,r0);oBox(M,10.5,0.9,8.6,1.6,0.1,1,wd,0);for(const [u,w] of [[-0.7,-0.4],[0.7,-0.4],[0.7,0.4],[-0.7,0.4]])oLimb(M,[10.5+u,0.16,8.6+w],[10.5+u,0.9,8.6+w],0.05,0.05,4,wd,0);
  for(const [x,z,y] of [[14.5,4,0.16],[15.5,4.6,0.16],[14.9,5.6,0.16],[15.1,4.8,1.15]]){oPrism(M,x,z,0.42,0.48,y,y+0.5,10,wd,0);oPrism(M,x,z,0.48,0.42,y+0.5,y+1.0,10,wd,0);for(const hh of [0.15,0.85])oPrism(M,x,z,0.47,0.47,y+hh,y+hh+0.06,10,[0.25,0.25,0.27],0);}
  for(let k=0;k<3;k++){const x=6.3,z=2.5+k*0.9;oLimb(M,[x,0.75,z],[x+0.08,0.75,z],0.72,0.72,12,[0.45,0.32,0.2],0,false);oLimb(M,[x+0.02,0.75,z],[x+0.1,0.75,z],0.15,0.15,8,bm,0);for(let s3=0;s3<6;s3++){const a=s3*1.047;oLimb(M,[x+0.04,0.75,z],[x+0.04,0.75+Math.sin(a)*0.65,z+Math.cos(a)*0.65],0.03,0.03,4,wd,0);}}
  oBox(M,-3,1.0,8.5,5,0.12,2.2,wd,0);for(const z of [7.5,9.5])oBox(M,-3,1.4,z,5,0.6,0.08,wd,0);for(const [x,z] of [[-4.8,7.4],[-1.2,7.4],[-4.8,9.6],[-1.2,9.6]])oLimb(M,[x,0.62,z],[x,0.62,z+(z<8.5?-0.12:0.12)],0.6,0.6,12,[0.4,0.28,0.18],0);oLimb(M,[-5.5,0.9,8.5],[-7.5,0.6,8.5],0.05,0.05,4,wd,0);
  for(const e of [-1,1])for(const f of [-1,1])oLimb(M,[2+e*0.35,0,-9+f*0.3],[2,0.85,-9],0.04,0.04,4,bm,0);oBox(M,2,0.92,-9,1.6,0.08,0.3,pk,0);oPrism(M,4,-9,1.1,0.1,0.1,0.7,10,[0.92,0.82,0.58],0);
  oPrism(M,-9,-3,0.35,0.3,5,9.5,8,br,0);return M;}
// post-and-rail fence panel, 3 m along x
// where a station can go at a farm, sawmill, mine or workshop: a green rectangle (the platform's place) with a darker rim on stakes, so it reads from far away
function slotMarkMesh(){const M=omesh(),g=[0.35,0.9,0.4],d=[0.1,0.5,0.18];oBox(M,0,0.55,0,24,0.1,6,g,0);
  for(const z of [-3,3])oBox(M,0,0.62,z,24.4,0.2,0.4,d,0);for(const x of [-12,12])oBox(M,x,0.62,0,0.4,0.2,6.4,d,0);
  for(const x of [-12,0,12])for(const z of [-3,3])oLimb(M,[x,-2,z],[x,0.6,z],0.12,0.12,4,d,0);return M;}
// post-and-rail fence panel, 3 m along x
function fenceMesh(){const M=omesh(),wd=[0.48,0.36,0.24],wd2=[0.42,0.31,0.21];for(const x of [-1.5,1.5])oBox(M,x,0.48,0,0.12,1.16,0.12,wd2,0);oBox(M,0,0.56,0,3.04,0.09,0.06,wd,0);oBox(M,0,0.96,0,3.04,0.09,0.06,wd,0);return M;}
function duckMesh(){const M=omesh();oIco(M,0,0.12,0,0.3,[0.55,0.43,0.32],0,{sy:0.55,seed:81});oIco(M,0.24,0.33,0,0.12,[0.14,0.45,0.28],0,{seed:82});oBox(M,0.37,0.31,0,0.12,0.04,0.07,[0.95,0.65,0.15],0);oBox(M,-0.22,0.18,0,0.1,0.08,0.14,[0.2,0.18,0.16],0);return M;}
function swanMesh(){const M=omesh();oIco(M,0,0.2,0,0.55,[0.97,0.97,0.95],0,{sy:0.5,seed:83});oLimb(M,[0.35,0.25,0],[0.55,1.0,0],0.07,0.06,4,[0.97,0.97,0.95],0);oIco(M,0.62,1.05,0,0.11,[0.97,0.97,0.95],0,{seed:84});oBox(M,0.78,1.02,0,0.18,0.06,0.06,[0.95,0.45,0.15],0);return M;}
function rowboatMesh(){const M=omesh(),wd=[0.62,0.42,0.27],dk=[0.42,0.28,0.18];const p=(x,y,z)=>[x,y,z];
  oQuad(M,p(-2,0.1,-0.7),p(1.4,0.1,-0.75),p(1.6,0.6,-0.85),p(-2,0.6,-0.8),wd,0);oQuad(M,p(1.4,0.1,0.75),p(-2,0.1,0.7),p(-2,0.6,0.8),p(1.6,0.6,0.85),wd,0);
  oTri(M,p(1.4,0.1,-0.75),p(2.4,0.5,0),p(1.6,0.6,-0.85),wd,0);oTri(M,p(2.4,0.5,0),p(1.4,0.1,0.75),p(1.6,0.6,0.85),wd,0);oQuad(M,p(-2,0.1,0.7),p(-2,0.1,-0.7),p(-2,0.6,-0.8),p(-2,0.6,0.8),wd,0);
  oQuad(M,p(-2,0.15,-0.7),p(1.4,0.15,-0.75),p(1.4,0.15,0.75),p(-2,0.15,0.7),dk,0);oBox(M,0,0.45,0,0.4,0.06,1.5,dk,0);return M;}
function sailboatMesh(){const M=omesh(),wh=[0.96,0.96,0.94];const p=(x,y,z)=>[x,y,z];
  oQuad(M,p(-2.6,0,-0.9),p(2,0,-0.95),p(2.2,0.8,-1.1),p(-2.6,0.8,-1.0),wh,0);oQuad(M,p(2,0,0.95),p(-2.6,0,0.9),p(-2.6,0.8,1.0),p(2.2,0.8,1.1),wh,0);
  oTri(M,p(2,0,-0.95),p(3.4,0.7,0),p(2.2,0.8,-1.1),wh,0);oTri(M,p(3.4,0.7,0),p(2,0,0.95),p(2.2,0.8,1.1),wh,0);oQuad(M,p(-2.6,0,0.9),p(-2.6,0,-0.9),p(-2.6,0.8,-1.0),p(-2.6,0.8,1.0),[0.2,0.35,0.6],0);
  oQuad(M,p(-2.6,0.7,-1.0),p(2.2,0.7,-1.1),p(2.2,0.7,1.1),p(-2.6,0.7,1.0),[0.65,0.5,0.35],0);oBox(M,0.4,4.2,0,0.14,7,0.14,[0.6,0.45,0.3],0);
  // the jib runs along a forestay from the masthead to the bow (it used to hang 8 cm off the mast)
oTri(M,p(0.3,1.3,0.02),p(0.3,7.4,0.02),p(-2.3,1.3,0.02),[0.97,0.95,0.9],0);oTri(M,p(0.48,6.6,0),p(3.1,0.9,0),p(1.2,1.3,0),[0.9,0.3,0.25],0);oLimb(M,[0.47,7.0,0],[3.35,0.72,0],0.012,0.012,4,[0.3,0.3,0.3],0);return M;}
function birdMesh(dark){const M=omesh(),b=dark?[0.22,0.22,0.25]:[0.95,0.95,0.95],w=dark?[0.2,0.2,0.24]:[0.7,0.72,0.76];
  oTri(M,[0.5,0,0],[-0.3,0.08,0],[-0.4,0,0.08],b,0);oTri(M,[0.5,0,0],[-0.4,0,-0.08],[-0.3,0.08,0],b,0);oTri(M,[0.5,0,0],[-0.4,0,0.08],[-0.4,0,-0.08],b,0);
  oTri(M,[0.2,0.03,0.05],[-0.15,0.03,0.05],[0,0.02,0.85],w,13);oTri(M,[-0.15,0.03,-0.05],[0.2,0.03,-0.05],[0,0.02,-0.85],w,13);return M;}
function cloudMesh(){const M=omesh();oIco(M,0,0,0,1,[1,1,1],0,{detail:1,jit:0.12,seed:91});return M;}
