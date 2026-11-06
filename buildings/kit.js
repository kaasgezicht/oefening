// ===== buildings/kit.js — shared building kit (geometry builders + materials + renderer) for the detailed house types.
// Vertex: pos3 nrm3 col3 mat1 uv2 halfSize2 seed1 aux1 (16 floats). uv is -1..1 over each face, halfSize the face's half extents in metres,
// so the shader can draw bevels, grain, joints and weathering per piece. Material classes are K.M.
// Models register in K.models[name] = (K, opt) => camera; they build around the origin, ground at y = 0, front facing -z.
(function(){
const K=window.KIT={models:{}};
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
  cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len=a=>Math.hypot(a[0],a[1],a[2]),norm=a=>{const l=len(a)||1;return[a[0]/l,a[1]/l,a[2]/l];},neg=a=>[-a[0],-a[1],-a[2]],
  clamp=(x,a,b)=>x<a?a:x>b?b:x,lerp=(a,b,t)=>a+(b-a)*t,mix3=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)],
  rot=(v,k,a)=>{const c=Math.cos(a),s=Math.sin(a);return add(add(mul(v,c),mul(cross(k,v),s)),mul(k,dot(k,v)*(1-c)));};// Rodrigues
K.v={add,sub,mul,dot,cross,len,norm,neg,clamp,lerp,mix3,rot};
let SEED=7;const rnd=()=>{SEED=(SEED*16807)%2147483647;return(SEED-1)/2147483646;},rr=(a,b)=>a+(b-a)*rnd(),pick=a=>a[(rnd()*a.length)|0];
K.rnd=rnd;K.rr=rr;K.pick=pick;
K.M={paint:0,leaf:1,glass:2,glow:3,shingle:4,plaster:5,wood:6,stone:8,grass:9,soil:10,metal:11,deck:12,blade:13,endgrain:14,bark:15,stave:16,lane:17,clay:18,cobble:19};
K.C={timber:[0.36,0.24,0.15],plaster:[0.90,0.83,0.68],mortar:[0.56,0.52,0.46],glow:[1,0.8,0.5],iron:[0.2,0.19,0.19],
  stone:[[0.72,0.66,0.57],[0.64,0.6,0.54],[0.76,0.7,0.6],[0.6,0.55,0.48],[0.7,0.62,0.52],[0.66,0.64,0.6]],
  shingle:[[0.66,0.47,0.3],[0.6,0.42,0.27],[0.72,0.53,0.34],[0.55,0.4,0.28],[0.62,0.5,0.38]],
  clay:[[0.70,0.30,0.20],[0.63,0.26,0.18],[0.76,0.36,0.22],[0.58,0.27,0.2],[0.68,0.33,0.23],[0.72,0.40,0.27]],
  flowers:[[0.92,0.2,0.24],[0.98,0.6,0.75],[0.99,0.85,0.3],[0.6,0.4,0.85],[0.98,0.97,0.94],[0.99,0.5,0.2]]};
const VB=[];let PID=1;K.aux=0;K.VB=VB;
function pv(p,n,c,m,uv,hs,sd){VB.push(p[0],p[1],p[2],n[0],n[1],n[2],c[0],c[1],c[2],m,uv[0],uv[1],hs[0],hs[1],sd,K.aux);}
const nextSeed=()=>(PID++)*0.6180339%1;
// game mode: K.plot (local rect) keeps only what stands on the house's plot; K.lod 0/1/2 drops detail (1: no shingles, stones, grass; 2: big parts only)
K.plot=null;K.lod=0;const outP=(x,z)=>K.plot!==null&&(x<K.plot.x0||x>K.plot.x1||z<K.plot.z0||z>K.plot.z1);K.outP=outP;
function quad(a,b,c,d,n,col,m,sd,hs,ns){if(K.plot&&outP((a[0]+c[0])/2,(a[2]+c[2])/2))return;n=n||norm(cross(sub(b,a),sub(d,a)));hs=hs||[len(sub(b,a))/2,len(sub(d,a))/2];const N=ns||[n,n,n,n];sd=sd===undefined?nextSeed():sd;
  pv(a,N[0],col,m,[-1,-1],hs,sd);pv(b,N[1],col,m,[1,-1],hs,sd);pv(c,N[2],col,m,[1,1],hs,sd);pv(a,N[0],col,m,[-1,-1],hs,sd);pv(c,N[2],col,m,[1,1],hs,sd);pv(d,N[3],col,m,[-1,1],hs,sd);}
function tri(a,b,c,col,m,sd,uvs,hs){if(K.plot&&outP((a[0]+b[0]+c[0])/3,(a[2]+b[2]+c[2])/3))return;const n=norm(cross(sub(b,a),sub(c,a)));uvs=uvs||[[-1,-1],[1,-1],[0,1]];hs=hs||[1,1];sd=sd===undefined?nextSeed():sd;pv(a,n,col,m,uvs[0],hs,sd);pv(b,n,col,m,uvs[1],hs,sd);pv(c,n,col,m,uvs[2],hs,sd);}
// oriented box: centre c, half-axis vectors X Y Z (keep them orthogonal)
function box(c,X,Y,Z,col,m,sd){sd=sd===undefined?nextSeed():sd;const lx=len(X),ly=len(Y),lz=len(Z),mx=Math.max(lx,ly,lz);if(K.plot&&(outP(c[0],c[2])||mx>20))return;if((K.lod>=1&&mx<0.06)||(K.lod>=2&&mx<0.3))return;const nx=norm(X),ny=norm(Y),nz=norm(Z),P=(i,j,k)=>add(add(add(c,mul(X,i)),mul(Y,j)),mul(Z,k));
  quad(P(1,-1,-1),P(1,-1,1),P(1,1,1),P(1,1,-1),nx,col,m,sd,[lz,ly]);quad(P(-1,-1,1),P(-1,-1,-1),P(-1,1,-1),P(-1,1,1),neg(nx),col,m,sd,[lz,ly]);
  quad(P(-1,1,-1),P(1,1,-1),P(1,1,1),P(-1,1,1),ny,col,m,sd,[lx,lz]);quad(P(-1,-1,1),P(1,-1,1),P(1,-1,-1),P(-1,-1,-1),neg(ny),col,m,sd,[lx,lz]);
  quad(P(1,-1,1),P(-1,-1,1),P(-1,1,1),P(1,1,1),nz,col,m,sd,[lx,ly]);quad(P(-1,-1,-1),P(1,-1,-1),P(1,1,-1),P(-1,1,-1),neg(nz),col,m,sd,[lx,ly]);}
// axis-aligned-ish box by centre and sizes, turned ry about y
const B=(x,y,z,sx,sy,sz,col,m,ry,sd)=>{const c=Math.cos(ry||0),s=Math.sin(ry||0);box([x,y,z],[c*sx/2,0,s*sx/2],[0,sy/2,0],[-s*sz/2,0,c*sz/2],col,m,sd);};
// beam between two points; w across along 'side' (made perpendicular), d the remaining depth
function beam(p0,p1,side,w,d,col,m,sd){const ax=sub(p1,p0),L=len(ax),a=norm(ax);const s=norm(sub(side,mul(a,dot(side,a))));const t=cross(a,s);box(mul(add(p0,p1),0.5),mul(a,L/2),mul(s,w/2),mul(t,d/2),col,m,sd);}
function cyl(p0,p1,r0,r1,sides,col,m,capCol,capM,sd,smooth){sd=sd===undefined?nextSeed():sd;const ax=sub(p1,p0),L=len(ax),mr=Math.max(r0,r1,L/2);if(K.plot&&outP((p0[0]+p1[0])/2,(p0[2]+p1[2])/2))return;if((K.lod>=1&&mr<0.06)||(K.lod>=2&&mr<0.3))return;if(K.lod>=1)sides=Math.max(5,Math.ceil(sides/2));const a=norm(ax),t=Math.abs(a[1])<0.9?[0,1,0]:[1,0,0],u=norm(cross(a,t)),v=cross(a,u);
  const D=k=>{const q=k/sides*Math.PI*2;return add(mul(u,Math.cos(q)),mul(v,Math.sin(q)));};
  for(let k=0;k<sides;k++){const d0=D(k),d1=D(k+1),dm=norm(add(d0,d1));quad(add(p0,mul(d0,r0)),add(p0,mul(d1,r0)),add(p1,mul(d1,r1)),add(p1,mul(d0,r1)),dm,col,m,sd,[Math.PI*(r0+r1)/sides,L/2],smooth?[d0,d1,d1,d0]:null);}
  if(capCol)for(const [p,r,s] of [[p0,r0,-1],[p1,r1,1]])for(let k=0;k<sides;k++){const q0=k/sides*Math.PI*2,q1=(k+1)/sides*Math.PI*2,n=mul(a,s);
    pv(p,n,capCol,capM,[0,0],[r,r],sd);pv(add(p,mul(D(k),r)),n,capCol,capM,[Math.cos(q0),Math.sin(q0)],[r,r],sd);pv(add(p,mul(D(k+1),r)),n,capCol,capM,[Math.cos(q1),Math.sin(q1)],[r,r],sd);}}
const ICO=(()=>{const t=(1+Math.sqrt(5))/2;let V=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(norm);
  let F=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
  const out=[[V,F]];for(let d=0;d<2;d++){const V2=V.slice(),cache={},mid=(a,b)=>{const k=a<b?a+'_'+b:b+'_'+a;if(cache[k]!==undefined)return cache[k];V2.push(norm(mul(add(V[a],V[b]),0.5)));return cache[k]=V2.length-1;};
    const F2=[];for(const [a,b,c] of F){const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);F2.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca]);}V=V2;F=F2;out.push([V,F]);}return out;})();
// icosphere blob (flat faces): foliage, moss, cabbages, pebbles
function ico(c,r,col,m,o){o=o||{};if(K.plot&&outP(c[0],c[2]))return;if((K.lod>=1&&r<0.07)||(K.lod>=2&&r<0.3))return;const [V,F]=ICO[Math.max(0,(o.detail||0)-K.lod)],sy=o.sy||1,jit=o.jit||0,sd=o.seed||rnd()*100,J=V.map((v,i)=>1+(Math.sin(i*12.9898+sd*78.233)*43758.5453%1)*jit);
  const P=i=>[c[0]+V[i][0]*r*J[i],c[1]+V[i][1]*r*sy*J[i],c[2]+V[i][2]*r*J[i]];for(const [a,b,d] of F)tri(P(a),P(b),P(d),col,m,(sd*0.37)%1);}
function blade(x,z,h,col,lean,ang,y0){if(K.lod>=1||(K.plot&&outP(x,z)))return;y0=y0||0.02;const w=rr(0.012,0.022),d=[Math.cos(ang),0,Math.sin(ang)],p=[-d[2],0,d[0]];const b0=[x+p[0]*w,y0,z+p[2]*w],b1=[x-p[0]*w,y0,z-p[2]*w],tp=[x+d[0]*lean,y0+h,z+d[2]*lean];
  pv(b0,[0,1,0],col,13,[-1,-1],[w,h/2],0);pv(b1,[0,1,0],col,13,[1,-1],[w,h/2],0);pv(tp,[0,1,0],col,13,[0,1],[w,h/2],0);}
function tuft(x,z,n,h,y0){const c=pick([[0.32,0.5,0.18],[0.42,0.58,0.22],[0.36,0.54,0.2],[0.5,0.6,0.25]]);for(let k=0;k<n;k++){const a=rnd()*6.283;blade(x+Math.cos(a)*0.03,z+Math.sin(a)*0.03,h*rr(0.6,1.2),c,rr(0.03,0.12),a,y0);}}
function flower(x,y,z,col,h){if(K.lod>=1||(K.plot&&outP(x,z)))return;cyl([x,y,z],[x+rr(-0.02,0.02),y+h,z+rr(-0.02,0.02)],0.008,0.006,4,[0.3,0.48,0.2],13);ico([x,y+h+0.02,z],rr(0.045,0.065),col,1,{sy:0.7});
  for(let k=0;k<2;k++){const a=rnd()*6.28;ico([x+Math.cos(a)*0.05,y+h*0.35,z+Math.sin(a)*0.05],0.04,[0.28,0.5,0.2],1,{sy:0.5});}}
Object.assign(K,{pv,quad,tri,box,B,beam,cyl,ico,blade,tuft,flower});
// ---- wall faces: o = point on the wall plane, n = outward normal, t = the face's u axis, half = half width
K.face=(o,n,t,half)=>({o,n,t,half});
const fp=(f,u,y,off)=>[f.o[0]+f.t[0]*u+f.n[0]*off,y,f.o[2]+f.t[2]*u+f.n[2]*off];
const fb=(f,u,y,off,sx,sy,sz,col,m,sd)=>box(fp(f,u,y,off),mul(f.t,sx/2),[0,sy/2,0],mul(f.n,sz/2),col,m,sd);
K.fp=fp;K.fb=fb;
// the four walls of a box building (x0..x1, z0..z1): front faces -z
K.walls=(x0,x1,z0,z1)=>({front:K.face([(x0+x1)/2,0,z0],[0,0,-1],[1,0,0],(x1-x0)/2),back:K.face([(x0+x1)/2,0,z1],[0,0,1],[-1,0,0],(x1-x0)/2),
  left:K.face([x0,0,(z0+z1)/2],[-1,0,0],[0,0,-1],(z1-z0)/2),right:K.face([x1,0,(z0+z1)/2],[1,0,0],[0,0,1],(z1-z0)/2)});
// stones laid in courses over a face rectangle (u0..u1, y0..y1). o: skip(u,y), shear(y)->[dx,dz], pal, soot:[y0,y1], off
K.stones=function(f,u0,u1,y0,y1,o){o=o||{};if(K.lod>=1){const pal=o.pal||K.C.stone,c=pal[0];fb(f,(u0+u1)/2,(y0+y1)/2,0.03,u1-u0,y1-y0,0.06,c,21);return;}const sh=o.shear||(()=>[0,0]),pal=o.pal||K.C.stone,hr=o.h||[0.15,0.27],lr=o.l||[0.24,0.55];let y=y0;
  while(y<y1-0.04){const rh=Math.min(rr(hr[0],hr[1]),y1-y);let u=u0-rnd()*0.2;
    while(u<u1){let l=rr(lr[0],lr[1]);if(u+l>u1)l=u1-u;if(l<0.08)break;const uc=u+l/2,yc=y+rh/2;if(!(o.skip&&o.skip(uc,yc))&&uc>u0-0.01){
        const out=rr(0.012,0.05),dep=0.14,s=sh(yc),c=add(fp(f,uc,yc,out-dep/2+(o.off||0)),[s[0],0,s[1]]),tw=rr(-0.05,0.05),tl=rr(-0.04,0.04);
        let X=mul(f.t,(l-0.022)/2),Y=[0,(rh-0.022)/2,0],Z=mul(f.n,dep/2);X=rot(X,f.n,tw);Y=rot(Y,f.n,tw);X=rot(X,[0,1,0],tl);Z=rot(Z,[0,1,0],tl);
        const pc=pick(pal),v=rr(0.9,1.08);K.aux=o.soot?clamp((yc-o.soot[0])/(o.soot[1]-o.soot[0]),0,1):0;box(c,X,Y,Z,[pc[0]*v,pc[1]*v,pc[2]*v],o.mat||8);K.aux=0;}
      u+=l;}y+=rh;}};
// overlapping, staggered rows of shingles or clay tiles on any surface S(u,t,o) (u along the ridge, t up the slope, o along the normal)
K.shingles=function(S,u0,u1,L,skip,o){o=o||{};if(K.lod>=1)return;const ex=o.exp||0.2,ln=o.len||0.38,th=o.th||0.024,wr=o.w||[0.16,0.3],pal=o.pal||K.C.shingle,mat=o.mat||4,ph=o.phi||[0.07,0.11],yaw=o.yaw===undefined?0.05:o.yaw;
  for(let tb=-0.05;tb<L-0.12;tb+=ex){let u=u0-rnd()*0.25;while(u<u1){let w=rnd()<(o.wideP===undefined?0.12:o.wideP)?rr(wr[1],wr[1]*1.4):rr(wr[0],wr[1]);if(u+w>u1)w=u1-u;if(w<0.07)break;
      const uc=u+w/2,tc=Math.min(tb+ln/2,L-0.02);u+=w+(o.gap===undefined?0.014:o.gap);const P=S(uc,tc,0);if(skip&&skip(P))continue;if(rnd()<(o.missing===undefined?0.012:o.missing))continue;
      let Tu=norm(sub(S(uc+0.03,tc,0),S(uc-0.03,tc,0))),Tt=norm(sub(S(uc,tc+0.03,0),S(uc,tc-0.03,0))),N=norm(cross(Tt,Tu));if(N[1]<0)N=neg(N);
      const phi=rr(ph[0],ph[1]);let Tt2=norm(sub(mul(Tt,Math.cos(phi)),mul(N,Math.sin(phi))));let N2=norm(cross(Tt2,Tu));if(N2[1]<0)N2=neg(N2);
      const psi=rr(-yaw,yaw),Tu2=rot(Tu,N2,psi);Tt2=rot(Tt2,N2,psi);const age=rnd(),base=age<0.07?(o.fresh||[0.78,0.6,0.4]):age>(o.agedP||0.88)?(o.aged||[0.5,0.48,0.44]):pick(pal),v=rr(0.88,1.1);
      box(add(P,mul(N,0.03+th/2+rr(0,0.006))),mul(Tu2,w/2),mul(N2,th/2),mul(Tt2,ln/2),[base[0]*v,base[1]*v,base[2]*v],mat);}}};
// window: reveal, frame, cols x rows panes over warm curtained glass, sill, optional flower box with trailing plants
K.win=function(f,u,y0,w,h,o){o=o||{};const yc=y0+h/2,fw=0.08,tc=o.frame||K.C.timber,rv=[0.3,0.21,0.14],cols=o.cols||3,rows=o.rows||2;fb(f,u,yc,0.004,w-0.04,h-0.04,0.008,K.C.glow,2);
  for(const e of [-1,1]){fb(f,u+e*(w/2-0.02),yc,0.04,0.04,h,0.09,rv,6);fb(f,u,yc+e*(h/2-0.02),0.04,w,0.04,0.09,rv,6);}
  fb(f,u,y0+h-fw/2,0.075,w+0.02,fw,0.05,tc,6);fb(f,u,y0+fw/2,0.075,w+0.02,fw,0.05,tc,6);for(const e of [-1,1])fb(f,u+e*(w/2-fw/2),yc,0.075,fw,h,0.05,tc,6);
  for(let k=1;k<cols;k++)fb(f,u-w/2+fw+(w-2*fw)*k/cols,yc,0.06,0.035,h-2*fw,0.035,tc,6);for(let k=1;k<rows;k++)fb(f,u,y0+fw+(h-2*fw)*k/rows,0.06,w-2*fw,0.035,0.035,tc,6);
  if(o.sill!==false)fb(f,u,y0-0.04,0.1,w+0.26,0.08,0.22,[0.48,0.36,0.24],6);
  if(o.box){fb(f,u,y0-0.25,0.22,w+0.06,0.24,0.26,[0.44,0.31,0.2],6);fb(f,u,y0-0.13,0.22,w-0.04,0.02,0.2,[0.3,0.21,0.14],10);const n=Math.max(4,Math.round(w*7));
    for(let k=0;k<n;k++){const q=fp(f,u-w/2+0.1+k*(w-0.2)/(n-1),0,0.22);ico([q[0],y0-0.1,q[2]],0.1,[0.28,0.5,0.2],1,{detail:1,jit:0.2});flower(q[0],y0-0.14,q[2],(o.flowers||K.C.flowers)[k%4],0.13);
      if(k%2===0)for(let j=1;j<4;j++){const q2=fp(f,u-w/2+0.1+k*(w-0.2)/(n-1)+rr(-0.03,0.03),0,0.36+j*0.01);ico([q2[0],y0-0.22-j*0.11,q2[2]],0.055,[0.25,0.46,0.18],1);}}}};
// ---- bendy gable roof. s: c [x,z] centre, dir [dx,dz] ridge direction, halfLen (wall end to centre along the ridge), half (wall to ridge line),
// H wall top, rise, ov eave overhang, gov gable overhang, th deck thickness, sag/flare/wob, cover {...K.shingles options}, skip(P), ends (gable ends with bargeboards),
// rafters step, mossClumps count. Returns rp(slope,u,t,o) in world, under(u,w) local deck underside height, W2(u,y,w) local->world.
K.roof=function(s){const c=s.c||[0,0],R=norm([s.dir[0],0,s.dir[1]]),A=[-R[2],0,R[0]],W2=(u,y,w)=>[c[0]+R[0]*u+A[0]*w,y,c[1]+R[2]*u+A[2]*w];
  const half=s.half,H=s.H,rise=s.rise,ov=s.ov,gov=s.gov,TH=s.th||0.13,hl=s.halfLen,hx=hl+gov,tanA=rise/half,eY=H-ov*tanA,sag=s.sag===undefined?0.32:s.sag,fl=s.flare===undefined?0.22:s.flare,wob=s.wob===undefined?0.05:s.wob;
  const timber=s.trim||K.C.timber,cover=s.cover||{},clay=cover.mat===18;
  const slope=sg=>{const A0=[eY,sg*(half+ov)],B0=[H+rise,0],L=Math.hypot(B0[0]-A0[0],B0[1]-A0[1]),a=[(B0[0]-A0[0])/L,(B0[1]-A0[1])/L];return{s:sg,A0,L,a,n:[Math.abs(a[1]),sg*a[0]]};};
  const rpl=(Sl,x,t,o)=>{const u=x/hx,v=clamp(t/Sl.L,0,1.05),dy=-sag*(1-u*u)*Math.pow(v,1.1)+fl*u*u*(1-v)*(1-v)+wob*Math.sin(u*4.2+Sl.s*1.3+(s.phase||0))*(1-v)*(1-v);return[x,Sl.A0[0]+Sl.a[0]*t+Sl.n[0]*o+dy,Sl.A0[1]+Sl.a[1]*t+Sl.n[1]*o];};
  const rp=(Sl,x,t,o)=>{const p=rpl(Sl,x,t,o);return W2(p[0],p[1],p[2]);};
  const under=(x,w)=>{const Sl=slope(w<0?-1:1),t=(w-Sl.A0[1])/Sl.a[1];return rpl(Sl,x,clamp(t,0,Sl.L),-TH)[1];};
  const nW=Sl=>add(mul([0,1,0],Sl.n[0]),mul(A,Sl.n[1]));
  for(const sg of s.slopes||[-1,1]){const Sl=slope(sg),NX=K.lod>=2?8:K.lod?Math.ceil((s.nx||24)/2):(s.nx||24),NT=K.lod>=2?4:K.lod?6:12,xs=i=>-hx+2*hx*i/NX,ts=j=>Sl.L*j/NT+(j===NT?0.08:0);
    for(let i=0;i<NX;i++)for(let j=0;j<NT;j++){quad(rp(Sl,xs(i),ts(j),K.lod?0.03:0),rp(Sl,xs(i+1),ts(j),K.lod?0.03:0),rp(Sl,xs(i+1),ts(j+1),K.lod?0.03:0),rp(Sl,xs(i),ts(j+1),K.lod?0.03:0),null,K.lod?(clay?mix3((cover.pal||K.C.clay)[0],(cover.pal||K.C.clay)[2],0.5):mix3((cover.pal||K.C.shingle)[0],(cover.pal||K.C.shingle)[2],0.5)):(s.deck||[0.24,0.18,0.13]),K.lod?20:12,0.5);
      quad(rp(Sl,xs(i),ts(j),-TH),rp(Sl,xs(i),ts(j+1),-TH),rp(Sl,xs(i+1),ts(j+1),-TH),rp(Sl,xs(i+1),ts(j),-TH),null,s.soffit||[0.4,0.29,0.19],12,0.7);}
    for(let i=0;i<NX;i++)beam(rp(Sl,xs(i),-0.02,-TH/2),rp(Sl,xs(i+1),-0.02,-TH/2),[0,1,0],0.2,0.05,timber,6,0.2+i*0.01);
    for(const e of s.ends||[-1,1])for(let j=0;j<NT;j++){const x=e*(hx+0.03);beam(rp(Sl,x,ts(j),-0.02),rp(Sl,x,ts(j+1)+0.02,-0.02),nW(Sl),0.24,0.06,timber,6,0.3+j*0.01);}
    if(s.rafters)for(let x=-hl+0.25;x<hl;x+=s.rafters){const tw=(sg*half-Sl.A0[1])/Sl.a[1];beam(rp(Sl,x,tw,-TH-0.07),rp(Sl,x,-0.08,-TH-0.07),R,0.09,0.13,timber,6);}
    K.shingles((u,t,o)=>rp(Sl,u,t,o),-hx-0.02,hx+0.02,Sl.L,s.skip,cover);}
  // ridge: half-round clay ridge tiles, or pairs of cap shingles; moss on top
  const Sf=slope(-1),Sb=slope(1);
  if(clay){for(let x=-hx-0.02;x<hx;x+=0.36){const p0=add(rp(Sf,x,Sf.L,0.07),[0,0.03,0]),p1=add(rp(Sf,Math.min(x+0.4,hx+0.04),Sf.L,0.07),[0,0.03,0]),col=mix3(pick(cover.pal||K.C.clay),[0.5,0.25,0.18],0.25);cyl(p0,p1,0.13,0.12,9,col,18,col,18,undefined,true);}}
  else for(let x=-hx;x<hx;x+=0.3){const xc=x+0.15;for(const Sl of [Sf,Sb]){const P=rp(Sl,xc,Sl.L-0.1,0.07),Tu=R,Tt=norm(sub(rp(Sl,xc,Sl.L,0),rp(Sl,xc,Sl.L-0.2,0)));let N=norm(cross(Tt,Tu));if(N[1]<0)N=neg(N);
      const T2=norm(add(mul(Tt,0.92),mul(N,-0.38)));let N2=norm(cross(T2,Tu));if(N2[1]<0)N2=neg(N2);box(add(P,mul(N,0.02)),mul(R,0.16),mul(N2,0.016),mul(T2,0.2),mix3([0.42,0.34,0.26],[0.5,0.42,0.33],rnd()),4);}}
  for(let x=-hx;x<hx;x+=0.3)if(rnd()<(s.ridgeMoss===undefined?0.35:s.ridgeMoss))ico(add(rp(Sf,x+0.15,Sf.L,0.12+(clay?0.08:0)),[0,0.05,0]),rr(0.07,0.12),[0.3,0.45,0.17],1,{sy:0.55,jit:0.3,detail:1});
  for(let k=0;k<(s.mossClumps||0);k++){const Sl=slope(rnd()<0.6?-1:1),x=rr(-hx+0.2,hx-0.2),t=rnd()<0.5?rr(0.05,1.2):rr(0.2,Sl.L-0.3);const P=rp(Sl,x,t,0.08);if(s.skip&&s.skip(P))continue;ico(P,rr(0.05,0.12),mix3([0.22,0.36,0.12],[0.4,0.52,0.18],rnd()),1,{sy:0.4,jit:0.35,detail:1});}
  return{rp,slope,under,W2,R,A,eY,hx,hl,H,rise,half,c};};
// plaster triangle filling a gable end (end = -1/+1) up to the deck underside
K.gableFan=function(rf,end,col){const u=end*rf.hl,N=12,P=[],uv=[];for(let k=0;k<=N;k++){const w=-rf.half+2*rf.half*k/N,y=Math.min(rf.under(u,w),rf.H+rf.rise)-0.01;P.push(rf.W2(u+end*0.002,y,w));uv.push([w/rf.half,(y-rf.H-rf.rise/2)/(rf.rise/2)]);}
  const cy=rf.H+rf.rise*0.35,cen=rf.W2(u+end*0.002,cy,0),cuv=[0,(cy-rf.H-rf.rise/2)/(rf.rise/2)],b0=rf.W2(u+end*0.002,rf.H-0.05,-rf.half),b1=rf.W2(u+end*0.002,rf.H-0.05,rf.half),hs=[rf.half,rf.rise/2];
  const T=(a,b,c,ua,ub,uc)=>tri(a,b,c,col||K.C.plaster,5,0.13,[ua,ub,uc],hs);T(b0,P[0],cen,[-1,-1],uv[0],cuv);T(P[N],b1,cen,uv[N],[1,-1],cuv);T(b1,b0,cen,[1,-1],[-1,-1],cuv);for(let k=0;k<N;k++)T(P[k],P[k+1],cen,uv[k],uv[k+1],cuv);};
// stone chimney: base x0..x1/z0..z1 up to bt, sloped stone shoulder, stack (sx0..sx1/sz0..sz1) to top, leaning; clad lists the base faces to dress
K.chimney=function(s){const lean=y=>y>s.bt+0.35?[(y-s.bt-0.35)*(s.lean?s.lean[0]:0),(y-s.bt-0.35)*(s.lean?s.lean[1]:0)]:[0,0],pal=s.pal||K.C.stone,mortar=K.C.mortar;
  const [x0,x1,z0,z1]=s.base,[ux0,ux1,uz0,uz1]=s.stack,bt=s.bt,top=s.top,cx=(x0+x1)/2,cz=(z0+z1)/2,ucx=(ux0+ux1)/2,ucz=(uz0+uz1)/2;
  B(cx,bt/2,cz,x1-x0-0.06,bt,z1-z0-0.06,mortar,8);
  const fc={'x-':K.face([x0,0,cz],[-1,0,0],[0,0,-1],(z1-z0)/2),'x+':K.face([x1,0,cz],[1,0,0],[0,0,1],(z1-z0)/2),'z-':K.face([cx,0,z0],[0,0,-1],[1,0,0],(x1-x0)/2),'z+':K.face([cx,0,z1],[0,0,1],[-1,0,0],(x1-x0)/2)};
  for(const k of s.clad)K.stones(fc[k],-fc[k].half-0.05,fc[k].half+0.05,0,bt+0.05,{pal});
  // shoulder: a sloped stone frustum from the base outline to the stack outline
  const y1=bt+0.38,bo=[[x0,z0],[x1,z0],[x1,z1],[x0,z1]],so=[[ux0,uz0],[ux1,uz0],[ux1,uz1],[ux0,uz1]];for(let k=0;k<4;k++){const a=bo[k],b=bo[(k+1)%4],c2=so[(k+1)%4],d=so[k];
    quad([a[0],bt+0.02,a[1]],[b[0],bt+0.02,b[1]],[c2[0],y1,c2[1]],[d[0],y1,d[1]],null,pick(pal),8);}
  for(let y=bt+0.3;y<top;y+=0.5){const l=lean(y+0.25);B(ucx+l[0],y+0.25,ucz+l[1],ux1-ux0-0.08,0.5,uz1-uz0-0.08,mortar,8);}
  const up=[K.face([ux0,0,ucz],[-1,0,0],[0,0,-1],(uz1-uz0)/2),K.face([ucx,0,uz0],[0,0,-1],[1,0,0],(ux1-ux0)/2),K.face([ucx,0,uz1],[0,0,1],[-1,0,0],(ux1-ux0)/2),K.face([ux1,0,ucz],[1,0,0],[0,0,1],(uz1-uz0)/2)];
  for(const f of up)K.stones(f,-f.half-0.04,f.half+0.04,bt+0.3,top,{shear:lean,pal,soot:[top-1.3,top]});
  const lt=lean(top);K.aux=0.8;B(ucx+lt[0],top+0.06,ucz+lt[1],ux1-ux0+0.22,0.12,uz1-uz0+0.22,pal[3],8);K.aux=0;
  for(const dz of s.pots||[-0.18,0.2]){const p=[ucx+lt[0],top+0.12,ucz+lt[1]+dz];cyl(p,add(p,[0,0.42,0]),0.13,0.11,12,[0.68,0.38,0.25],0,[0.08,0.06,0.05],0,undefined,true);cyl(add(p,[0,0.38,0]),add(p,[0,0.46,0]),0.14,0.14,12,[0.62,0.34,0.22],0,null,0,undefined,true);}};
// ---- props and plants
K.tree=function(x,z,s,o){o=o||{};if(K.plot&&outP(x,z))return;cyl([x,0,z],[x+0.12*s,2.2*s,z+0.05*s],0.22*s,0.14*s,9,[0.42,0.34,0.27],15);for(const [dx,dz] of [[0.9,0.3],[-0.8,-0.3],[0.1,-0.8]])cyl([x+0.1*s,1.8*s,z],[x+dx*s,2.9*s,z+dz*s],0.09*s,0.05*s,6,[0.42,0.34,0.27],15);
  for(const [dx,dy,dz,r] of [[0,3.3,0,1.5],[0.95,3.0,0.35,1.1],[-0.9,3.05,-0.3,1.15],[0.1,4.0,0.1,1.0],[-0.3,3.4,0.9,0.9]])ico([x+dx*s,dy*s,z+dz*s],r*s,mix3([0.26,0.48,0.2],[0.36,0.58,0.26],rnd()),1,{detail:2,jit:0.12});
  if(o.apples)for(let k=0;k<24;k++){const a=rnd()*6.28,el=rr(-0.2,0.9),r=1.45*s;ico([x+Math.cos(a)*Math.cos(el)*r,3.2*s+Math.sin(el)*r*0.85,z+Math.sin(a)*Math.cos(el)*r],0.07,[0.85,0.18,0.14],0,{detail:1});}
  for(let k=0;k<12;k++){const a=rnd()*6.28,d=rr(0.3,0.9);tuft(x+Math.cos(a)*d,z+Math.sin(a)*d,7,rr(0.2,0.45));}};
K.bush=function(x,z,r,col,bloom){ico([x,r*0.75,z],r,col||[0.26,0.48,0.2],1,{detail:2,sy:0.85,jit:0.12});if(bloom)for(let k=0;k<6;k++){const a=rnd()*6.28,el=rr(0.1,1.0);ico([x+Math.cos(a)*Math.cos(el)*r,r*0.75+Math.sin(el)*r*0.85,z+Math.sin(a)*Math.cos(el)*r],0.1,pick(bloom),1,{detail:1,jit:0.3});}};
K.barrel=function(x,z,r,h,o){o=o||{};const st=14,y0=o.y||0,w=[0.5,0.35,0.22];if(o.lying){const d=[Math.cos(o.ry||0),0,Math.sin(o.ry||0)],c=[x,y0+r,z],p0=sub(c,mul(d,h/2)),p1=add(c,mul(d,h/2)),m=mul(add(p0,p1),0.5);
    cyl(p0,m,r*0.94,r*1.04,st,w,16,[0.42,0.3,0.2],14,undefined,true);cyl(m,p1,r*1.04,r*0.94,st,w,16,[0.42,0.3,0.2],14,undefined,true);for(const t of [0.12,0.4,0.6,0.88]){const rr2=r*(0.94+0.1*(1-Math.abs(t-0.5)*2))+0.008,pa=add(p0,mul(d,h*t));cyl(pa,add(pa,mul(d,0.04)),rr2,rr2,st,K.C.iron,11,null,0,undefined,true);}return;}
  cyl([x,y0,z],[x,y0+h*0.5,z],r*0.94,r*1.04,st,w,16,null,0,undefined,true);cyl([x,y0+h*0.5,z],[x,y0+h,z],r*1.04,r*0.94,st,w,16,[0.42,0.3,0.2],6,undefined,true);
  for(const y of [h*0.12,h*0.4,h*0.6,h*0.88]){const rr2=r*(0.94+0.1*(1-Math.abs(y/h-0.5)*2))+0.008;cyl([x,y0+y,z],[x,y0+y+0.04,z],rr2,rr2,st,K.C.iron,11,null,0,undefined,true);}};
K.crate=function(x,y,z,s,ry){B(x,y+s/2,z,s,s,s,[0.55,0.42,0.28],6,ry);for(const e of [-1,1])for(const e2 of [-1,1]){const c=Math.cos(ry),sn=Math.sin(ry),dx=e*s/2,dz=e2*s/2;B(x+c*dx-sn*dz,y+s/2,z+sn*dx+c*dz,0.05,s+0.01,0.05,[0.42,0.3,0.2],6,ry);}};
K.pot=function(x,z,fl){cyl([x,0,z],[x,0.34,z],0.15,0.21,12,[0.72,0.4,0.26],0,[0.3,0.22,0.15],10,undefined,true);cyl([x,0.32,z],[x,0.38,z],0.23,0.23,12,[0.68,0.38,0.24],0,null,0,undefined,true);
  ico([x,0.48,z],0.2,[0.27,0.5,0.2],1,{detail:1,jit:0.25});for(let k=0;k<3;k++)flower(x+rr(-0.1,0.1),0.42,z+rr(-0.1,0.1),(fl||K.C.flowers)[k],0.15);};
K.ivy=function(x0,z0,nx,nz,h,n){for(let s=0;s<n;s++){let x=x0+rr(-0.25,0.25),y=0.05,z=z0+rr(-0.25,0.25);const dx=rr(-0.3,0.3);while(y<h*rr(0.5,1)){y+=rr(0.06,0.12);x+=dx*0.06*Math.abs(nz)+rr(-0.03,0.03)*Math.abs(nz);z+=dx*0.06*Math.abs(nx)+rr(-0.03,0.03)*Math.abs(nx);
    ico([x+nx*0.05,y,z+nz*0.05],rr(0.045,0.075),mix3([0.16,0.34,0.12],[0.3,0.5,0.18],rnd()),1,{sy:0.8,jit:0.2});}}};
// grass tufts over an area, with an exclusion test
K.grass=function(n,x0,x1,z0,z1,skip,hr,blades){if(K.lod>=1||K.plot)return;/* the game draws its own grass; fence-line tufts stay */for(let k=0;k<n;k++){const x=rr(x0,x1),z=rr(z0,z1);if(skip&&skip(x,z))continue;tuft(x,z,blades||(rnd()<0.3?6:4),rr(hr?hr[0]:0.08,hr?hr[1]:0.2));}};
K.dirt=function(x,z,r){for(let k=0;k<7;k++){const a=rnd()*6.28,d=rr(0,r*0.6),rk=rr(0.25,0.5)*r,h=0.004+k*0.0008;cyl([x+Math.cos(a)*d,0,z+Math.sin(a)*d],[x+Math.cos(a)*d,h,z+Math.sin(a)*d],rk,rk*rr(0.7,1),9,[0.5,0.4,0.28],10,mix3([0.46,0.37,0.26],[0.54,0.43,0.3],rnd()),10);}};
// one irregular ground patch (earth, gravel, cobbles): a fan with a noisy outline, so edges never look like a cut rectangle
K.patch=function(x,z,rx,rz,col,mat,y,o){o=o||{};if(K.plot&&outP(x,z))return;const N=o.n||40,ph=rr(0,6.28),R=a=>0.82+0.12*Math.sin(a*3+ph)+0.07*Math.sin(a*7+ph*2)+0.05*Math.sin(a*13+ph*3)+rr(-0.03,0.03),y0=y||0.01;const pts=[];
  for(let k=0;k<N;k++){const a=k/N*6.283,r=R(a);pts.push([Math.cos(a)*rx*r,Math.sin(a)*rz*r]);}const sd=rnd();
  for(let k=0;k<N;k++){const p=pts[k],q=pts[(k+1)%N];pv([x,y0,z],[0,1,0],col,mat,[0,0],[rx,rz],sd);pv([x+q[0],y0,z+q[1]],[0,1,0],col,mat,[q[0]/rx,q[1]/rz],[rx,rz],sd);pv([x+p[0],y0,z+p[1]],[0,1,0],col,mat,[p[0]/rx,p[1]/rz],[rx,rz],sd);}};
K.plots={cottage:{x0:-7.75,x1:7.75,z0:-9.45,z1:7.8},tavern:{x0:-8.9,x1:8.8,z0:-13.1,z1:6.2},farmhouse:{x0:-12.9,x1:10.9,z0:-13.2,z1:6.6},shop:{x0:-6.6,x1:9.3,z0:-10.0,z1:6.0}};
K.build=function(name,opt){VB.length=0;PID=1;SEED=(opt&&opt.seed)||7;K.aux=0;K.plot=opt&&opt.game?K.plots[name]:null;K.lod=(opt&&opt.lod)||0;return K.models[name](K,opt||{})||{};};

// ================= GL =================
let G=null;function sh(t,s){const g=G;const x=g.createShader(t);g.shaderSource(x,s);g.compileShader(x);if(!g.getShaderParameter(x,g.COMPILE_STATUS))throw new Error(g.getShaderInfoLog(x));return x;}
function prog(vs,fs){const g=G;const p=g.createProgram();g.attachShader(p,sh(g.VERTEX_SHADER,vs));g.attachShader(p,sh(g.FRAGMENT_SHADER,fs));g.linkProgram(p);if(!g.getProgramParameter(p,g.LINK_STATUS))throw new Error(g.getProgramInfoLog(p));return p;}
function look(e,c,u){const z=norm(sub(e,c)),x=norm(cross(u,z)),y=cross(z,x);return[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,e),-dot(y,e),-dot(z,e),1];}
function persp(f,a,n,fa){const t=1/Math.tan(f/2);return[t/a,0,0,0,0,t,0,0,0,0,(fa+n)/(n-fa),-1,0,0,2*fa*n/(n-fa),0];}
function ortho(l,r,b,t,n,f){return[2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1];}
function mmul(a,b){const o=new Array(16).fill(0);for(let i=0;i<4;i++)for(let j=0;j<4;j++)for(let k=0;k<4;k++)o[j*4+i]+=a[k*4+i]*b[j*4+k];return o;}
function inv4(m){const a=m,inv=new Array(16);inv[0]=a[5]*a[10]*a[15]-a[5]*a[11]*a[14]-a[9]*a[6]*a[15]+a[9]*a[7]*a[14]+a[13]*a[6]*a[11]-a[13]*a[7]*a[10];inv[4]=-a[4]*a[10]*a[15]+a[4]*a[11]*a[14]+a[8]*a[6]*a[15]-a[8]*a[7]*a[14]-a[12]*a[6]*a[11]+a[12]*a[7]*a[10];
  inv[8]=a[4]*a[9]*a[15]-a[4]*a[11]*a[13]-a[8]*a[5]*a[15]+a[8]*a[7]*a[13]+a[12]*a[5]*a[11]-a[12]*a[7]*a[9];inv[12]=-a[4]*a[9]*a[14]+a[4]*a[10]*a[13]+a[8]*a[5]*a[14]-a[8]*a[6]*a[13]-a[12]*a[5]*a[10]+a[12]*a[6]*a[9];
  inv[1]=-a[1]*a[10]*a[15]+a[1]*a[11]*a[14]+a[9]*a[2]*a[15]-a[9]*a[3]*a[14]-a[13]*a[2]*a[11]+a[13]*a[3]*a[10];inv[5]=a[0]*a[10]*a[15]-a[0]*a[11]*a[14]-a[8]*a[2]*a[15]+a[8]*a[3]*a[14]+a[12]*a[2]*a[11]-a[12]*a[3]*a[10];
  inv[9]=-a[0]*a[9]*a[15]+a[0]*a[11]*a[13]+a[8]*a[1]*a[15]-a[8]*a[3]*a[13]-a[12]*a[1]*a[11]+a[12]*a[3]*a[9];inv[13]=a[0]*a[9]*a[14]-a[0]*a[10]*a[13]-a[8]*a[1]*a[14]+a[8]*a[2]*a[13]+a[12]*a[1]*a[10]-a[12]*a[2]*a[9];
  inv[2]=a[1]*a[6]*a[15]-a[1]*a[7]*a[14]-a[5]*a[2]*a[15]+a[5]*a[3]*a[14]+a[13]*a[2]*a[7]-a[13]*a[3]*a[6];inv[6]=-a[0]*a[6]*a[15]+a[0]*a[7]*a[14]+a[4]*a[2]*a[15]-a[4]*a[3]*a[14]-a[12]*a[2]*a[7]+a[12]*a[3]*a[6];
  inv[10]=a[0]*a[5]*a[15]-a[0]*a[7]*a[13]-a[4]*a[1]*a[15]+a[4]*a[3]*a[13]+a[12]*a[1]*a[7]-a[12]*a[3]*a[5];inv[14]=-a[0]*a[5]*a[14]+a[0]*a[6]*a[13]+a[4]*a[1]*a[14]-a[4]*a[2]*a[13]-a[12]*a[1]*a[6]+a[12]*a[2]*a[5];
  inv[3]=-a[1]*a[6]*a[11]+a[1]*a[7]*a[10]+a[5]*a[2]*a[11]-a[5]*a[3]*a[10]-a[9]*a[2]*a[7]+a[9]*a[3]*a[6];inv[7]=a[0]*a[6]*a[11]-a[0]*a[7]*a[10]-a[4]*a[2]*a[11]+a[4]*a[3]*a[10]+a[8]*a[2]*a[7]-a[8]*a[3]*a[6];
  inv[11]=-a[0]*a[5]*a[11]+a[0]*a[7]*a[9]+a[4]*a[1]*a[11]-a[4]*a[3]*a[9]-a[8]*a[1]*a[7]+a[8]*a[3]*a[5];inv[15]=a[0]*a[5]*a[10]-a[0]*a[6]*a[9]-a[4]*a[1]*a[10]+a[4]*a[2]*a[9]+a[8]*a[1]*a[6]-a[8]*a[2]*a[5];
  const det=a[0]*inv[0]+a[1]*inv[4]+a[2]*inv[8]+a[3]*inv[12];return inv.map(v=>v/det);}

const NOISE=`
float h2(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s/.9375;}
float voro(vec2 p){vec2 i=floor(p),f=fract(p);float d=9.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 o=vec2(x,y);vec2 r=o+vec2(h2(i+o),h2(i+o+17.3))-f;d=min(d,dot(r,r));}return sqrt(d);}
vec3 voro2(vec2 p){vec2 i=floor(p),f=fract(p);float d1=9.,d2=9.;vec2 id=vec2(0);for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 o=vec2(x,y);vec2 r=o+vec2(h2(i+o),h2(i+o+17.3))*.85-f;float d=dot(r,r);if(d<d1){d2=d1;d1=d;id=i+o;}else if(d<d2)d2=d;}return vec3(sqrt(d1),sqrt(d2)-sqrt(d1),h2(id+3.1));}`;
const MATS=`vec3 gN;
float edgeD(vec2 q){vec2 e=vHS-abs(q);return min(e.x,e.y);}
vec3 roofRC(){vec3 th=normalize(cross(vec3(0,1,0),gN)+vec3(1e-4,0,0));float r=floor(vW.y/.17),f=fract(vW.y/.17),su=dot(vW,th)/(.27+.1*h2(vec2(r,5.)))+r*.5;return vec3(r,f,su);}
float hgt(int m,vec2 q){float sd=vSeed*31.;float e=edgeD(q);
  if(m==4){float bev=smoothstep(0.,.016,e)*.005;float gr=vn(vec2(q.x*60.+sd,q.y*3.5))-.5;float cr=smoothstep(.04,0.,abs(vn(vec2(q.x*9.+sd,q.y*1.3))-.5));return bev+gr*.0018-cr*.004;}
  if(m==8){float mn=min(vHS.x,vHS.y);return sqrt(clamp(e/(mn*.6),0.,1.))*.03+fbm(q*10.+sd)*.009;}
  if(m==5){float pm=smoothstep(.69,.71,fbm(q*.8+13.));vec2 bq=q/vec2(.22,.075);bq.x+=floor(bq.y)*.5;vec2 bf=fract(bq);float mo=min(1.,step(bf.y,.15)+step(bf.x,.06));
    float crk=smoothstep(.005,0.,abs(fbm(q*1.1+7.)-.5))*(1.-pm)*smoothstep(.45,.6,fbm(q*.6+3.));return mix(fbm(q*2.5)*.005+fbm(q*13.)*.002,-.012+(1.-mo)*.004,pm)-crk*.004;}
  if(m==6||m==16){vec2 gq=vHS.x>=vHS.y?q:q.yx;float gr=vn(vec2(gq.x*1.6+sd,gq.y*40.+sd));float cr=smoothstep(.05,0.,abs(vn(vec2(gq.x*.6+sd,gq.y*8.))-.5));return smoothstep(0.,.012,e)*.004+(gr-.5)*.002-cr*.0035;}
  if(m==15)return fbm(vec2(q.x*16.+sd,q.y*2.4))*.03;
  if(m==14){float r=length(vUV);return -smoothstep(.85,1.,r)*.004+sin(r*48.+vn(vUV*4.+sd)*4.)*.0006;}
  if(m==9)return fbm(q*4.)*.014+fbm(q*21.)*.005;
  if(m==10)return fbm(q*7.)*.018+(h2(floor(q*16.))>.85?.006:0.);
  if(m==17){float rut=smoothstep(.4,.0,abs(abs(q.y)-.75));return fbm(q*5.)*.02-rut*.05+(h2(floor(q*14.))>.88?.008:0.);}
  if(m==12)return -step(fract(q.y/.17),.05)*.004;
  if(m==11)return fbm(q*25.)*.002;
  if(m==18){vec2 cq=vHS-abs(q);float chip=(cq.x<.035&&cq.y<.035&&h2(vec2(sd,sign(q.x)+sign(q.y)*2.))>.55)?-.006:0.;return smoothstep(0.,.01,e)*.003+(1.-pow(q.x/vHS.x,2.))*.006+fbm(q*30.+sd)*.0015+chip;}
  if(m==19){vec3 v=voro2(q/.19);return sqrt(smoothstep(0.,.42,v.y))*.03+fbm(q*12.)*.004;}
  if(m==20){vec3 R=roofRC();float id=h2(vec2(R.x,floor(R.z)));return (.5-R.y)*.012+(R.y<.14?-.004:0.)-(fract(R.z)<.05?.004:0.)+(id-.5)*.002;}
  if(m==21){float r=floor(q.y/.24),f=fract(q.y/.24),s=q.x/(.36+.24*h2(vec2(r,3.)))+h2(vec2(r,1.)),fs=fract(s);float ed=min(min(f,1.-f)*.24,min(fs,1.-fs)*.3);return sqrt(clamp(ed/.07,0.,1.))*.025+fbm(q*9.)*.006;}
  return 0.;}
vec3 albedo(int m,vec2 q,vec3 c){float sd=vSeed*31.;float e=edgeD(q);
  if(m==4){float gr=vn(vec2(q.x*60.+sd,q.y*3.5));c*=.8+.32*gr;c*=mix(.66,1.,smoothstep(-vHS.y,-vHS.y*.25,q.y));c*=mix(.55,1.,smoothstep(0.,.012,e));
    float cr=smoothstep(.04,0.,abs(vn(vec2(q.x*9.+sd,q.y*1.3))-.5));return c*(1.-cr*.45);}
  if(m==8){c*=.76+.4*fbm(q*4.+sd);c*=mix(.45,1.,smoothstep(0.,.03,e));c+=(h2(floor(q*80.)+sd)-.5)*.07;return c;}
  if(m==5){float pm=smoothstep(.69,.71,fbm(q*.8+13.));c*=.86+.18*fbm(q*.9)+.06*fbm(q*9.);vec2 bq=q/vec2(.22,.075);bq.x+=floor(bq.y)*.5;vec2 bf=fract(bq);float mo=min(1.,step(bf.y,.15)+step(bf.x,.06));
    vec3 bc=mix(vec3(.6,.3,.21)*(.75+.45*h2(floor(bq))),vec3(.62,.58,.52),mo);c=mix(c,c*.78,smoothstep(.64,.69,fbm(q*.8+13.))*(1.-pm));c=mix(c,bc,pm);
    float crk=smoothstep(.005,0.,abs(fbm(q*1.1+7.)-.5))*(1.-pm)*smoothstep(.45,.6,fbm(q*.6+3.));return c*(1.-crk*.4);}
  if(m==6||m==16){vec2 gq=vHS.x>=vHS.y?q:q.yx;float gr=vn(vec2(gq.x*1.6+sd,gq.y*40.+sd)),fi=vn(vec2(gq.x*6.,gq.y*140.));c*=.74+.34*gr+.1*fi;
    float cr=smoothstep(.05,0.,abs(vn(vec2(gq.x*.6+sd,gq.y*8.))-.5));c*=1.-cr*.5;return c*mix(.55,1.,smoothstep(0.,.012,e));}
  if(m==15)return c*(.55+.75*fbm(vec2(q.x*16.+sd,q.y*2.4)));
  if(m==14){float r=length(vUV);vec3 k=mix(vec3(.8,.64,.44),vec3(.62,.46,.3),.5+.5*sin(r*48.+vn(vUV*4.+sd)*4.));k=mix(k,vec3(.3,.23,.17),smoothstep(.8,.92,r));
    k*=1.-smoothstep(.03,0.,abs(fract(atan(vUV.y,vUV.x)*.477+sd)-.5)-.45)*.5*step(r,.8);return k*(.92+.16*h2(vec2(sd)));}
  if(m==9){float big=fbm(q*.16),mid=fbm(q*.8),smv=fbm(q*5.);vec3 k=mix(vec3(.24,.37,.15),vec3(.42,.5,.22),big);k*=.82+.22*mid;k*=.84+.3*smv;k=mix(k,vec3(.24,.42,.18),step(.8,vn(q*3.1))*.25);
    float dry=smoothstep(.6,.75,fbm(q*.5+5.));return mix(k,vec3(.62,.6,.36),dry*.3);}
  if(m==10)return c*(.72+.5*fbm(q*6.))+(h2(floor(q*16.))>.85?vec3(.07,.06,.05):vec3(0.));
  if(m==17){float rut=smoothstep(.4,.0,abs(abs(q.y)-.75));vec3 k=c*(.78+.35*fbm(q*3.));k=mix(k,k*.66,rut);k=mix(k,vec3(.4,.38,.3),smoothstep(.5,.75,fbm(q*.7))*rut*.7);
    float mid=smoothstep(.32,.08,abs(q.y));return mix(k,vec3(.34,.48,.2)*(.8+.4*fbm(q*5.)),mid*smoothstep(.4,.55,fbm(q*1.3)));}
  if(m==12)return c*(.75+.35*vn(vec2(q.x*2.,q.y*40.)));
  if(m==11){vec3 k=c*(.8+.35*fbm(q*20.));return mix(k,vec3(.42,.22,.11),smoothstep(.55,.7,fbm(q*7.+sd))*.75);}
  if(m==18){c*=.84+.26*fbm(q*7.+sd);c*=1.-.25*smoothstep(.6,.8,fbm(q*14.+sd*3.));c*=mix(.7,1.,smoothstep(-vHS.y,-vHS.y*.3,q.y));return c*mix(.6,1.,smoothstep(0.,.008,e));}
  if(m==19){vec3 v=voro2(q/.19);vec3 k=mix(mix(vec3(.66,.61,.54),vec3(.56,.52,.47),step(.33,v.z)),vec3(.72,.66,.56),step(.7,v.z));k*=.78+.32*fbm(q*6.+v.z*10.);
    float gap=smoothstep(.13,.0,v.y);vec3 gc=mix(vec3(.24,.19,.14),vec3(.25,.38,.14),smoothstep(.45,.6,fbm(q*1.4))*.8);return mix(k,gc,gap);}
  if(m==20){vec3 R=roofRC();float id=h2(vec2(R.x,floor(R.z)));c*=.78+.36*id;if(id>.88)c=mix(c,vec3(dot(c,vec3(.33))),.5);c*=R.y<.14?.7:1.;c*=fract(R.z)<.05?.6:1.;return c;}
  if(m==21){float r=floor(q.y/.24),f=fract(q.y/.24),s=q.x/(.36+.24*h2(vec2(r,3.)))+h2(vec2(r,1.)),fs=fract(s),id=h2(vec2(r,floor(s)));vec3 k=c*(.78+.42*id)*(.8+.3*fbm(q*4.+id*9.));
    return (f<.08||fs<.05)?vec3(.38,.35,.31):k;}
  return c;}
vec3 weather(int m,vec3 c,vec3 N,vec2 q){float y=vW.y;
  if(m==4||m==18||m==20||m==21||m==8||m==6||m==16||m==12||m==15){float mm=fbm(vW.xz*.9+vW.y*.45+vec2(3,7));
    float sunF=clamp(dot(N,uL),0.,1.);float bias=(m==4||m==18)?(m==18?-.05:.04)+.14*smoothstep(-.2,-.9,vUV.y):m==8?(N.y>.6?-.25+.4*smoothstep(.03,0.,edgeD(q)):.0)+.2*smoothstep(.7,0.,y):m==15?.08:.16*smoothstep(.5,0.,y);bias-=.12*sunF;
    float fz=vn(vW.xz*45.+vW.y*35.),moss=smoothstep(.7,.8,mm+bias)*uMoss;vec3 mc=mix(vec3(.17,.3,.09),vec3(.46,.56,.17),fz*.7+.3*vn(vW.xz*6.));
    c=mix(c,mc,moss*smoothstep(.25,.55,fz+moss*.45));
    vec2 lp=(m==4||m==8||m==18)?q*7.+vSeed*13.:vW.xz*5.+vW.y*3.;float d=voro(lp),lm=smoothstep(.45,.6,fbm(vW.xz*.5+vW.y*.4+11.));
    vec3 lc=m==18?mix(vec3(.93,.6,.18),vec3(.84,.82,.68),step(.7,h2(floor(lp)))):mix(vec3(.82,.8,.64),vec3(.86,.72,.42),step(.5,h2(floor(lp))));c=mix(c,lc,smoothstep(.17,.09,d)*lm*(m==18?.75:.6)*uMoss);}
  if(m==5||m==8||m==6||m==16){float gr=smoothstep(.85,0.,y)*(.5+.5*fbm(vW.xz*3.+y*4.));c=mix(c,c*vec3(.6,.55,.47),gr*.65);
    float shd=1.-clamp(dot(N,uL),0.,1.);float al=smoothstep(1.7,.2,y)*shd*smoothstep(.4,.7,fbm(vW.xz*1.7+y*2.));c=mix(c,c*vec3(.68,.84,.58),al*.7);}
  if(m==5){float s=vn(vec2((vW.x+vW.z)*7.,y*.32));float tp=vHS.y-q.y;c=mix(c,c*vec3(.72,.7,.64),smoothstep(.58,.85,s)*smoothstep(1.7,.3,tp)*.35);c*=1.-smoothstep(.55,0.,tp)*.22;
    c=mix(c,c*vec3(.7,.66,.6),smoothstep(.62,.8,vn(vec2((vW.x+vW.z)*14.,y*.6)))*smoothstep(1.4,1.2,y)*0.);}
  if(m==8&&vAux>0.)c*=mix(1.,.38,vAux*(.6+.4*fbm(vW.xz*4.+y*3.)));
  if(m==4||m==18)c=mix(c,c*vec3(.82,.8,.76),smoothstep(.55,.8,vn(vec2(vW.x*2.5,vW.y*.7)))*.35);
  return c;}
`;
K.GLSL={NOISE,MATS};
const VS=`#version 300 es
layout(location=0) in vec3 aP;layout(location=1) in vec3 aN;layout(location=2) in vec3 aC;layout(location=3) in float aM;layout(location=4) in vec4 aUH;layout(location=5) in vec2 aS;
uniform mat4 uVP,uLVP;uniform vec3 uL;out vec3 vW,vN;out vec2 vUV;flat out vec2 vHS;flat out vec3 vC;flat out int vM;flat out float vSeed,vAux;out vec4 vL;
void main(){vW=aP;vN=aN;vC=aC;vM=int(aM+.5);vUV=aUH.xy;vHS=aUH.zw;vSeed=aS.x;vAux=aS.y;vec3 nl=dot(aN,uL)<0.?-aN:aN;vL=uLVP*vec4(aP+nl*.012,1.);gl_Position=uVP*vec4(aP,1.);}`;
const FS=`#version 300 es
precision highp float;precision highp sampler2DShadow;
in vec3 vW,vN;in vec2 vUV;flat in vec2 vHS;flat in vec3 vC;flat in int vM;flat in float vSeed,vAux;in vec4 vL;
uniform vec3 uEye,uL,uSun,uSky,uGnd;uniform sampler2DShadow uSh;uniform float uShT,uMoss;
layout(location=0) out vec4 oC;layout(location=1) out vec4 oN;layout(location=2) out vec4 oX;
${NOISE}
${MATS}
float shadowAt(){vec3 p=vL.xyz/vL.w*.5+.5;if(p.x<0.||p.y<0.||p.x>1.||p.y>1.)return 1.;float s=0.;for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++)s+=texture(uSh,vec3(p.xy+vec2(i,j)*.7*uShT,p.z-.0004));return s/9.;}
void main(){vec3 Ng=normalize(vN),V=normalize(uEye-vW);if(dot(Ng,V)<0.)Ng=-Ng;gN=Ng;int m=vM;vec2 q=vUV*vHS;if(m==9)q=vW.xz;
  vec3 Nd=Ng;float hc=0.;
  if(m>=4&&m!=13){vec3 dp1=dFdx(vW),dp2=dFdy(vW);vec2 du1=dFdx(q),du2=dFdy(q);vec3 p2=cross(dp2,Ng),p1=cross(Ng,dp1);vec3 T=p2*du1.x+p1*du2.x,Bv=p2*du1.y+p1*du2.y;
    float iv=inversesqrt(max(max(dot(T,T),dot(Bv,Bv)),1e-12));T*=iv;Bv*=iv;float ep=.0025;hc=hgt(m,q);float hx=(hgt(m,q+vec2(ep,0))-hc)/ep,hy=(hgt(m,q+vec2(0,ep))-hc)/ep;
    Nd=normalize(Ng-(T*hx+Bv*hy)*1.2);}
  vec3 alb=albedo(m,q,vC);alb=weather(m,alb,Nd,q);
  float sh=shadowAt();float ndl=dot(Nd,uL),ndg=dot(Ng,uL);vec3 col;float inkW=1.;
  if(m==1||m==13){vec3 n2=normalize(Nd+(vec3(vn(vW.xy*7.),vn(vW.yz*7.),vn(vW.zx*7.))-.5)*(m==1?.9:.2));float w=clamp(dot(n2,uL)*.6+.42,0.,1.);if(m==13){w=clamp(dot(n2,uL)*.3+.62,0.,1.);alb*=mix(.5,1.2,vUV.y*.5+.5);}
    else alb*=.68+.38*fbm(vW.xz*3.+vW.y*3.);float l=(smoothstep(.3,.6,w)*.75+w*.25)*mix(.3,1.,sh);col=alb*(uSun*l+mix(uGnd,uSky,n2.y*.5+.5)*.9);inkW=0.;}
  else if(m==2){vec2 u=vUV;vec3 inn=mix(vec3(1.,.55,.22),vec3(1.,.84,.52),smoothstep(-1.,.7,u.y))*1.25;float cur=smoothstep(.48,.6,abs(u.x));inn=mix(inn,vec3(.7,.22,.16)*(.75+.25*sin(u.x*38.))*1.2,cur*.9);
    inn=mix(inn,vec3(.5,.3,.18),smoothstep(-.55,-.85,u.y)*.6);float refl=smoothstep(.1,1.,u.y)*.3+smoothstep(.07,0.,abs(u.x+u.y*.6-.25))*.35;col=inn+vec3(.75,.85,.95)*refl*.5;col*=1.-smoothstep(.75,1.,max(abs(u.x),abs(u.y)))*.4;inkW=.7;}
  else if(m==3){col=vC*1.6;inkW=.6;}
  else{float ramp=smoothstep(-.03,.16,ndl)*.6+smoothstep(.38,.6,ndl)*.4;float lit=ramp*smoothstep(.25,.75,sh)*smoothstep(-.2,.05,ndg);
    float cav=m==4||m==18||m==20||m==21||m==8||m==6||m==16||m==19?mix(.72,1.,smoothstep(-.002,.01,hc+.002)):1.;
    col=alb*(uSun*lit+mix(uGnd,uSky,Nd.y*.5+.5)*cav);if(m==9||m==10||m==17)inkW=0.;else if(m==4||m==8||m==18)inkW=.5;else if(m==19)inkW=.35;}
  float id=fract(vSeed*7.31+float(m)*.173+dot(floor(vC*64.),vec3(.013,.029,.047)));
  oC=vec4(col,1.);oN=vec4(Ng*.5+.5,1.);oX=vec4(id,inkW,0.,1.);}`;
const SVS=`#version 300 es
layout(location=0) in vec3 aP;uniform mat4 uLVP;void main(){gl_Position=uLVP*vec4(aP,1.);}`;
const SFS=`#version 300 es
precision mediump float;void main(){}`;
const QVS=`#version 300 es
const vec2 P[3]=vec2[3](vec2(-1,-1),vec2(3,-1),vec2(-1,3));out vec2 vU;void main(){vec2 p=P[gl_VertexID];vU=p*.5+.5;gl_Position=vec4(p,0,1);}`;
// SSAO in view space with a hemisphere kernel
const AO=`#version 300 es
precision highp float;in vec2 vU;uniform sampler2D uD,uN;uniform mat4 uP,uIP,uV;uniform vec3 uK[24];uniform vec2 uPx;out vec4 o;
vec3 vpos(vec2 u){float d=texture(uD,u).r;vec4 p=uIP*vec4(u*2.-1.,d*2.-1.,1.);return p.xyz/p.w;}
void main(){float d0=texture(uD,vU).r;if(d0>=1.){o=vec4(1);return;}vec3 P=vpos(vU);vec3 N=normalize(mat3(uV)*(texture(uN,vU).xyz*2.-1.));
  float a=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)*6.283;vec3 r=vec3(cos(a),sin(a),0.);vec3 T=normalize(r-N*dot(r,N)),Bt=cross(N,T);
  float occ=0.;const float R=.55;for(int i=0;i<24;i++){vec3 s=P+(T*uK[i].x+Bt*uK[i].y+N*uK[i].z)*R;vec4 c=uP*vec4(s,1.);vec2 su=c.xy/c.w*.5+.5;if(su.x<0.||su.y<0.||su.x>1.||su.y>1.)continue;
    float sz=vpos(su).z;float rc=smoothstep(0.,1.,R/abs(P.z-sz));occ+=(sz>=s.z+.015?1.:0.)*rc;}
  o=vec4(vec3(1.-occ/24.),1.);}`;
// composite: AO (blurred), ink lines, haze
const INK=`#version 300 es
precision highp float;in vec2 vU;uniform sampler2D uC,uN,uD,uX,uA;uniform vec2 uPx,uHaze;uniform float uNear,uFar;out vec4 o;
float lz(vec2 u){float d=texture(uD,u).r;return uNear*uFar/(uFar-d*(uFar-uNear));}
void main(){vec3 c=texture(uC,vU).rgb;float dz=texture(uD,vU).r;if(dz>=1.){o=vec4(mix(vec3(.82,.88,.9),vec3(.6,.74,.88),smoothstep(.5,1.,vU.y)),1.);return;}
  float ao=0.,wa=0.;for(int y=-2;y<=2;y++)for(int x=-2;x<=2;x++){ao+=texture(uA,vU+vec2(x,y)*uPx*2.).r;wa+=1.;}ao/=wa;c*=mix(1.,ao,.9);
  vec4 n0=texture(uN,vU),x0=texture(uX,vU);float z0=lz(vU);float e=0.;vec3 dk=c;
  for(int k=0;k<8;k++){float a=float(k)*.785398;vec2 dir=vec2(cos(a),sin(a));vec2 u=vU+dir*2.4*uPx;vec4 x1=texture(uX,u);float z1=lz(u);vec4 n1=texture(uN,u);
    float w=max(x0.y,x1.y);if(w<=0.)continue;float ed=0.;
    if(abs(z1-z0)>.018*z0+.03){ed=w;if(z1<z0&&x1.y==0.&&x0.y>0.)ed=0.;}
    if(dot(n0.xyz*2.-1.,n1.xyz*2.-1.)<.72)ed=max(ed,min(x0.y,x1.y)*.9);
    vec2 u2=vU+dir*1.3*uPx;vec4 x2=texture(uX,u2);if(x0.y>0.&&x2.y>0.&&abs(x0.x-x2.x)>.002)ed=max(ed,.45*min(x0.y,x2.y));
    if(ed>e)e=ed;if(ed>0.&&z1<z0)dk=min(dk,texture(uC,u).rgb);}
  vec3 ink=min(c,dk)*.22+vec3(.035,.02,.015);c=mix(c,ink,clamp(e,0.,1.));
  float hz=smoothstep(uHaze.x,uHaze.y,z0);c=mix(c,vec3(.78,.84,.86),hz*.75);o=vec4(c,1.);}`;
// final: bloom from warm lights, tilt-shift, grade, vignette
const FIN=`#version 300 es
precision highp float;in vec2 vU;uniform sampler2D uC;uniform vec2 uPx;out vec4 o;
void main(){float b=smoothstep(.17,.5,abs(vU.y-.46))*7.;vec3 s=texture(uC,vU).rgb;float w=1.;
  for(int k=0;k<16;k++){float a=float(k)*2.39996,r=sqrt(float(k)+.5)/4.*b;s+=texture(uC,vU+vec2(cos(a),sin(a))*r*uPx).rgb;w+=1.;}vec3 c=s/w;
  vec3 bl=vec3(0.);for(int k=0;k<24;k++){float a=float(k)*2.39996,r=sqrt(float(k)+.5)*5.;vec3 t=texture(uC,vU+vec2(cos(a),sin(a))*r*uPx).rgb;bl+=max(t-vec3(.95),0.);}c+=bl/24.*vec3(1.,.75,.45)*1.6;
  c=c/(1.+max(c-.85,0.)*.6);float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l),c,1.06);c=mix(c*vec3(.95,.98,1.04),c*vec3(1.04,1.,.94),smoothstep(.2,.7,l));
  float vg=smoothstep(1.1,.35,length(vU-vec2(.5,.47)));o=vec4(c*mix(.86,1.,vg),1.);}`;
function tex(w,h,ifmt,fmt,type,filt){const g=G;const t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);g.texImage2D(g.TEXTURE_2D,0,ifmt,w,h,0,fmt,type,null);
  g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,filt);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,filt);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);return t;}
function fbo(atts,depth){const g=G;const f=g.createFramebuffer();g.bindFramebuffer(g.FRAMEBUFFER,f);atts.forEach((t,i)=>g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0+i,g.TEXTURE_2D,t,0));if(depth)g.framebufferTexture2D(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.TEXTURE_2D,depth,0);
  if(atts.length)g.drawBuffers(atts.map((_,i)=>g.COLOR_ATTACHMENT0+i));return f;}
K.render=function(opt){opt=opt||{};const SZ=opt.size||2400;let cv=document.getElementById('kit');if(!cv){cv=document.createElement('canvas');cv.id='kit';cv.width=SZ;cv.height=SZ;cv.style.cssText=`position:fixed;left:0;top:0;width:${SZ}px;height:${SZ}px`;document.body.appendChild(cv);}
  const g=cv.getContext('webgl2',{antialias:false,preserveDrawingBuffer:true});G=g;const nv=VB.length/16;const buf=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,buf);g.bufferData(g.ARRAY_BUFFER,new Float32Array(VB),g.STATIC_DRAW);
  const vao=g.createVertexArray();g.bindVertexArray(vao);const A=(i,n,o)=>{g.enableVertexAttribArray(i);g.vertexAttribPointer(i,n,g.FLOAT,false,64,o*4);};A(0,3,0);A(1,3,3);A(2,3,6);A(3,1,9);A(4,4,10);A(5,2,14);
  const L=norm(opt.sun||[-0.3,0.72,-0.62]),tgt=opt.target||[-0.4,2.4,-1.4],dir=norm(opt.dir||[-0.6,0.52,-0.6]),dist=opt.dist||25,eye=add(tgt,mul(dir,dist));
  const near=0.5,far=200,Pm=persp((opt.fov||30)*Math.PI/180,1,near,far),Vm=look(eye,tgt,[0,1,0]),VP=mmul(Pm,Vm);
  const lc=opt.shadowC||[0,1.5,-1],sb=opt.shadowR||15,LV=look(add(lc,mul(L,80)),lc,[0,1,0]),LVP=mmul(ortho(-sb,sb,-sb,sb,1,180),LV);
  const SS=4096,sT=tex(SS,SS,g.DEPTH_COMPONENT24,g.DEPTH_COMPONENT,g.UNSIGNED_INT,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_COMPARE_MODE,g.COMPARE_REF_TO_TEXTURE);
  fbo([],sT);g.drawBuffers([g.NONE]);const sp=prog(SVS,SFS);g.useProgram(sp);g.uniformMatrix4fv(g.getUniformLocation(sp,'uLVP'),false,LVP);g.viewport(0,0,SS,SS);g.enable(g.DEPTH_TEST);g.clear(g.DEPTH_BUFFER_BIT);g.drawArrays(g.TRIANGLES,0,nv);
  const cT=tex(SZ,SZ,g.RGBA16F,g.RGBA,g.HALF_FLOAT,g.LINEAR),nT=tex(SZ,SZ,g.RGBA8,g.RGBA,g.UNSIGNED_BYTE,g.NEAREST),xT=tex(SZ,SZ,g.RGBA8,g.RGBA,g.UNSIGNED_BYTE,g.NEAREST),dT=tex(SZ,SZ,g.DEPTH_COMPONENT24,g.DEPTH_COMPONENT,g.UNSIGNED_INT,g.NEAREST);
  if(!g.getExtension('EXT_color_buffer_float'))throw new Error('no float RT');
  fbo([cT,nT,xT],dT);g.viewport(0,0,SZ,SZ);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);
  const mp=prog(VS,FS);g.useProgram(mp);const U=n=>g.getUniformLocation(mp,n);g.uniformMatrix4fv(U('uVP'),false,VP);g.uniformMatrix4fv(U('uLVP'),false,LVP);g.uniform3fv(U('uEye'),eye);g.uniform3fv(U('uL'),L);
  g.uniform3fv(U('uSun'),opt.sunCol||[1.02,0.9,0.74]);g.uniform3fv(U('uSky'),[0.4,0.48,0.6]);g.uniform3fv(U('uGnd'),[0.28,0.25,0.18]);g.uniform1f(U('uShT'),1/SS);g.uniform1f(U('uMoss'),opt.moss===undefined?1:opt.moss);
  g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,sT);g.uniform1i(U('uSh'),0);g.drawArrays(g.TRIANGLES,0,nv);g.disable(g.DEPTH_TEST);
  // SSAO
  const aT=tex(SZ,SZ,g.RGBA8,g.RGBA,g.UNSIGNED_BYTE,g.LINEAR);fbo([aT]);const ap=prog(QVS,AO);g.useProgram(ap);const K=[];for(let i=0;i<24;i++){let v=[rr(-1,1),rr(-1,1),rr(0.05,1)];v=norm(v);const s=lerp(0.12,1,Math.pow(i/24,2))*rr(0.6,1);K.push(...mul(v,s));}
  g.uniform3fv(g.getUniformLocation(ap,'uK'),K);g.uniformMatrix4fv(g.getUniformLocation(ap,'uP'),false,Pm);g.uniformMatrix4fv(g.getUniformLocation(ap,'uIP'),false,inv4(Pm));g.uniformMatrix4fv(g.getUniformLocation(ap,'uV'),false,Vm);
  g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,dT);g.uniform1i(g.getUniformLocation(ap,'uD'),0);g.activeTexture(g.TEXTURE1);g.bindTexture(g.TEXTURE_2D,nT);g.uniform1i(g.getUniformLocation(ap,'uN'),1);g.uniform2f(g.getUniformLocation(ap,'uPx'),1/SZ,1/SZ);g.drawArrays(g.TRIANGLES,0,3);
  // ink + AO composite
  const iT=tex(SZ,SZ,g.RGBA16F,g.RGBA,g.HALF_FLOAT,g.LINEAR);fbo([iT]);const ip=prog(QVS,INK);g.useProgram(ip);const I=n=>g.getUniformLocation(ip,n);
  [[cT,'uC'],[nT,'uN'],[dT,'uD'],[xT,'uX'],[aT,'uA']].forEach(([t,n],i)=>{g.activeTexture(g.TEXTURE0+i);g.bindTexture(g.TEXTURE_2D,t);g.uniform1i(I(n),i);});
  g.uniform2f(I('uPx'),1/SZ,1/SZ);g.uniform2fv(I('uHaze'),opt.haze||[26,70]);g.uniform1f(I('uNear'),near);g.uniform1f(I('uFar'),far);g.drawArrays(g.TRIANGLES,0,3);
  g.bindFramebuffer(g.FRAMEBUFFER,null);const fpg=prog(QVS,FIN);g.useProgram(fpg);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,iT);g.uniform1i(g.getUniformLocation(fpg,'uC'),0);g.uniform2f(g.getUniformLocation(fpg,'uPx'),1/SZ,1/SZ);g.drawArrays(g.TRIANGLES,0,3);
  g.finish();return{tris:nv/3,err:g.getError()};};
})();
