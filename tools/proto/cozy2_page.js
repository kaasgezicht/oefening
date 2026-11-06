// Cozy cottage v2 — standalone prototype renderer. Real geometry for shingles and stones, procedural bump + weathering in the shader,
// SSAO, stylised two-band light with ink lines, tilt-shift, bloom. Vertex: pos3 nrm3 col3 mat1 uv2 halfSize2 seed1 pad1 (16 floats).
(function(){
const SZ=+(window.CEL_SIZE||2400);
const cv=document.createElement('canvas');cv.id='cel';cv.width=SZ;cv.height=SZ;cv.style.cssText=`position:fixed;left:0;top:0;width:${SZ}px;height:${SZ}px`;document.body.appendChild(cv);
const g=cv.getContext('webgl2',{antialias:false,preserveDrawingBuffer:true});
// ---------- math
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
  cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len=a=>Math.hypot(a[0],a[1],a[2]),norm=a=>{const l=len(a)||1;return[a[0]/l,a[1]/l,a[2]/l];},neg=a=>[-a[0],-a[1],-a[2]],
  clamp=(x,a,b)=>x<a?a:x>b?b:x,lerp=(a,b,t)=>a+(b-a)*t,mix3=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
let SEED=7;const rnd=()=>{SEED=(SEED*16807)%2147483647;return(SEED-1)/2147483646;};const rr=(a,b)=>a+(b-a)*rnd();
const rot=(v,k,a)=>{const c=Math.cos(a),s=Math.sin(a);return add(add(mul(v,c),mul(cross(k,v),s)),mul(k,dot(k,v)*(1-c)));};// Rodrigues
// ---------- builder
const VB=[];let PID=1;
function pv(p,n,c,m,uv,hs,sd){VB.push(p[0],p[1],p[2],n[0],n[1],n[2],c[0],c[1],c[2],m,uv[0],uv[1],hs[0],hs[1],sd,0);}
function quad(a,b,c,d,n,col,m,sd,hs,ns){n=n||norm(cross(sub(b,a),sub(d,a)));hs=hs||[len(sub(b,a))/2,len(sub(d,a))/2];const N=ns||[n,n,n,n];
  pv(a,N[0],col,m,[-1,-1],hs,sd);pv(b,N[1],col,m,[1,-1],hs,sd);pv(c,N[2],col,m,[1,1],hs,sd);pv(a,N[0],col,m,[-1,-1],hs,sd);pv(c,N[2],col,m,[1,1],hs,sd);pv(d,N[3],col,m,[-1,1],hs,sd);}
function tri(a,b,c,col,m,sd,uvs,hs){const n=norm(cross(sub(b,a),sub(c,a)));uvs=uvs||[[-1,-1],[1,-1],[0,1]];hs=hs||[1,1];pv(a,n,col,m,uvs[0],hs,sd);pv(b,n,col,m,uvs[1],hs,sd);pv(c,n,col,m,uvs[2],hs,sd);}
// oriented box: c centre, X Y Z half-axis vectors
function box(c,X,Y,Z,col,m,sd){sd=sd===undefined?(PID++)*0.6180339%1:sd;const lx=len(X),ly=len(Y),lz=len(Z),nx=norm(X),ny=norm(Y),nz=norm(Z),P=(i,j,k)=>add(add(add(c,mul(X,i)),mul(Y,j)),mul(Z,k));
  quad(P(1,-1,-1),P(1,-1,1),P(1,1,1),P(1,1,-1),nx,col,m,sd,[lz,ly]);quad(P(-1,-1,1),P(-1,-1,-1),P(-1,1,-1),P(-1,1,1),neg(nx),col,m,sd,[lz,ly]);
  quad(P(-1,1,-1),P(1,1,-1),P(1,1,1),P(-1,1,1),ny,col,m,sd,[lx,lz]);quad(P(-1,-1,1),P(1,-1,1),P(1,-1,-1),P(-1,-1,-1),neg(ny),col,m,sd,[lx,lz]);
  quad(P(1,-1,1),P(-1,-1,1),P(-1,1,1),P(1,1,1),nz,col,m,sd,[lx,ly]);quad(P(-1,-1,-1),P(1,-1,-1),P(1,1,-1),P(-1,1,-1),neg(nz),col,m,sd,[lx,ly]);}
const B=(x,y,z,sx,sy,sz,col,m,ry,sd)=>{const c=Math.cos(ry||0),s=Math.sin(ry||0);box([x,y,z],[c*sx/2,0,s*sx/2],[0,sy/2,0],[-s*sz/2,0,c*sz/2],col,m,sd);};
// beam between two points, w across (in the plane given by side vector), d depth
function beam(p0,p1,side,w,d,col,m,sd){const ax=sub(p1,p0),L=len(ax),a=norm(ax);let s=norm(sub(side,mul(a,dot(side,a))));const t=cross(a,s);box(mul(add(p0,p1),0.5),mul(a,L/2),mul(s,w/2),mul(t,d/2),col,m,sd);}
function cyl(p0,p1,r0,r1,sides,col,m,capCol,capM,sd,smooth){sd=sd===undefined?(PID++)*0.6180339%1:sd;const ax=sub(p1,p0),L=len(ax),a=norm(ax),t=Math.abs(a[1])<0.9?[0,1,0]:[1,0,0],u=norm(cross(a,t)),v=cross(a,u);
  const D=k=>{const q=k/sides*Math.PI*2;return add(mul(u,Math.cos(q)),mul(v,Math.sin(q)));};
  for(let k=0;k<sides;k++){const d0=D(k),d1=D(k+1),dm=norm(add(d0,d1));quad(add(p0,mul(d0,r0)),add(p0,mul(d1,r0)),add(p1,mul(d1,r1)),add(p1,mul(d0,r1)),dm,col,m,sd,[Math.PI*(r0+r1)/sides,L/2],smooth?[d0,d1,d1,d0]:null);}
  if(capCol)for(const [p,r,s] of [[p0,r0,-1],[p1,r1,1]])for(let k=0;k<sides;k++){const q0=k/sides*Math.PI*2,q1=(k+1)/sides*Math.PI*2;
    const n=mul(a,s);pv(p,n,capCol,capM,[0,0],[r,r],sd);pv(add(p,mul(D(k),r)),n,capCol,capM,[Math.cos(q0),Math.sin(q0)],[r,r],sd);pv(add(p,mul(D(k+1),r)),n,capCol,capM,[Math.cos(q1),Math.sin(q1)],[r,r],sd);}}
// icosphere blob (flat faces)
const ICO=(()=>{const t=(1+Math.sqrt(5))/2;let V=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(norm);
  let F=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
  const out=[[V,F]];for(let d=0;d<2;d++){const V2=V.slice(),cache={},mid=(a,b)=>{const k=a<b?a+'_'+b:b+'_'+a;if(cache[k]!==undefined)return cache[k];V2.push(norm(mul(add(V[a],V[b]),0.5)));return cache[k]=V2.length-1;};
    const F2=[];for(const [a,b,c] of F){const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);F2.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca]);}V=V2;F=F2;out.push([V,F]);}return out;})();
function ico(c,r,col,m,o){o=o||{};const [V,F]=ICO[o.detail||0],sy=o.sy||1,jit=o.jit||0,sd=o.seed||rnd()*100,J=V.map((v,i)=>1+(Math.sin(i*12.9898+sd*78.233)*43758.5453%1)*jit);
  const P=i=>[c[0]+V[i][0]*r*J[i],c[1]+V[i][1]*r*sy*J[i],c[2]+V[i][2]*r*J[i]];for(const [a,b,d] of F){const sh=o.shade?o.shade(V[a]):col;tri(P(a),P(b),P(d),sh,m,(sd*0.37)%1);}}
function blade(x,z,h,col,lean,ang){const w=rr(0.012,0.022),d=[Math.cos(ang),0,Math.sin(ang)],p=[-d[2],0,d[0]];const b0=[x+p[0]*w,0.02,z+p[2]*w],b1=[x-p[0]*w,0.02,z-p[2]*w],tp=[x+d[0]*lean,h,z+d[2]*lean];
  pv(b0,[0,1,0],col,13,[-1,-1],[w,h/2],0);pv(b1,[0,1,0],col,13,[1,-1],[w,h/2],0);pv(tp,[0,1,0],col,13,[0,1],[w,h/2],0);}
function tuft(x,z,n,h){const c=[[0.32,0.5,0.18],[0.42,0.58,0.22],[0.36,0.54,0.2],[0.5,0.6,0.25]][(rnd()*4)|0];for(let k=0;k<n;k++){const a=rnd()*6.283;blade(x+Math.cos(a)*0.03,z+Math.sin(a)*0.03,h*rr(0.6,1.2),c,rr(0.03,0.12),a);}}
function flower(x,y,z,col,h){cyl([x,y,z],[x+rr(-0.02,0.02),y+h,z+rr(-0.02,0.02)],0.008,0.006,4,[0.3,0.48,0.2],13);ico([x,y+h+0.02,z],rr(0.045,0.065),col,1,{sy:0.7});
  for(let k=0;k<2;k++){const a=rnd()*6.28;ico([x+Math.cos(a)*0.05,y+h*0.35,z+Math.sin(a)*0.05],0.04,[0.28,0.5,0.2],1,{sy:0.5});}}

// ================= the cottage =================
const W=7.0,D=5.6,H=3.0,RISE=3.9,OV=0.42,GOV=0.36,SB=1.15,TH=0.13;// TH: roof deck thickness
const plaster=[0.90,0.83,0.68],timber=[0.36,0.24,0.15],mortar=[0.56,0.52,0.46],glow=[1,0.8,0.5],iron=[0.2,0.19,0.19];
const stonePal=[[0.72,0.66,0.57],[0.64,0.6,0.54],[0.76,0.7,0.6],[0.6,0.55,0.48],[0.7,0.62,0.52],[0.66,0.64,0.6]];
const shPal=[[0.66,0.47,0.3],[0.6,0.42,0.27],[0.72,0.53,0.34],[0.55,0.4,0.28],[0.62,0.5,0.38]];
// faces: o origin on wall plane, n outward, t tangent (u axis)
const F={front:{o:[0,0,-D/2],n:[0,0,-1],t:[1,0,0],half:W/2},back:{o:[0,0,D/2],n:[0,0,1],t:[-1,0,0],half:W/2},left:{o:[-W/2,0,0],n:[-1,0,0],t:[0,0,-1],half:D/2},right:{o:[W/2,0,0],n:[1,0,0],t:[0,0,1],half:D/2}};
const fp=(f,u,y,off)=>[f.o[0]+f.t[0]*u+f.n[0]*off,y,f.o[2]+f.t[2]*u+f.n[2]*off];
const fb=(f,u,y,off,sx,sy,sz,col,m,sd)=>box(fp(f,u,y,off),mul(f.t,sx/2),[0,sy/2,0],mul(f.n,sz/2),col,m,sd);
// stones laid in courses over a rectangle of a face (u0..u1, y0..y1); skip(u,y) leaves holes; shear(y) leans the face
function stones(f,u0,u1,y0,y1,skip,o){o=o||{};const sh=o.shear||(()=>[0,0]);let y=y0;
  while(y<y1-0.04){const rh=Math.min(rr(0.15,0.27),y1-y);let u=u0-rnd()*0.2;
    while(u<u1){let l=rr(0.24,0.55);if(u+l>u1)l=u1-u;if(l<0.08)break;const uc=u+l/2,yc=y+rh/2;if(!(skip&&skip(uc,yc))&&uc>u0-0.01){
        const out=rr(0.012,0.05),dep=0.14,s=sh(yc),c=add(fp(f,uc,yc,out-dep/2+(o.off||0)),[s[0],0,s[1]]),tw=rr(-0.05,0.05),tl=rr(-0.04,0.04);
        let X=mul(f.t,(l-0.022)/2),Y=[0,(rh-0.022)/2,0],Z=mul(f.n,dep/2);X=rot(X,f.n,tw);Y=rot(Y,f.n,tw);X=rot(X,[0,1,0],tl);Z=rot(Z,[0,1,0],tl);
        const pc=stonePal[(rnd()*stonePal.length)|0],v=rr(0.9,1.08);box(c,X,Y,Z,[pc[0]*v,pc[1]*v,pc[2]*v],8);}
      u+=l;}y+=rh;}}
// ---- walls: plaster core, mortar backing behind the stone base, stones, quoins
B(0,H/2,0,W,H,D,plaster,5,0,0.11);B(0,SB/2,0,W+0.02,SB,D+0.02,mortar,8,0,0.31);
const doorSkip=(u,y)=>Math.abs(u)<0.66&&y<2.4;
stones(F.front,-W/2-0.08,W/2+0.08,0,SB,doorSkip);stones(F.back,-W/2-0.08,W/2+0.08,0,SB);stones(F.left,-D/2+0.06,D/2-0.06,0,SB);stones(F.right,-D/2+0.06,D/2-0.06,0,SB);
for(const f of [F.front,F.back])for(const e of [-1,1])for(let y=SB,k=0;y<H-0.25;y+=0.33,k++){const l=k%2?0.55:0.32;const pc=stonePal[k%6];fb(f,e*(f.half-l/2+0.04),y+0.155,0.035,l,0.29,0.12,pc,8);
  const g=e*f.t[0]>0?F.right:F.left;const l2=k%2?0.32:0.55;fb(g,(f===F.front?-1:1)*(g===F.left?-1:1)*(g.half-l2/2+0.04),y+0.155,0.035,l2,0.29,0.12,pc,8);}
// ---- timber frame (sill on the stones, top plate, posts, rails, braces)
const tb=(f,u0,y0,u1,y1,w)=>beam(fp(f,u0,y0,0.025),fp(f,u1,y1,0.025),[0,1,0].map((v,i)=>i===1?0:f.t[i]).map((v,i)=>i===1?1:v),w||0.15,0.08,timber,6);
function frame(f,posts,wins){const h=f.half;fb(f,0,SB+0.08,0.03,h*2+0.04,0.16,0.1,timber,6);fb(f,0,H-0.09,0.03,h*2+0.04,0.18,0.1,timber,6);
  for(const u of posts)fb(f,u,(SB+H)/2,0.025,0.15,H-SB-0.2,0.08,timber,6);
  for(const [u0,u1] of wins)fb(f,(u0+u1)/2,2.42,0.025,u1-u0,0.13,0.08,timber,6);}
frame(F.front,[-2.7,-1.5,-0.62,0.62,1.5,2.7],[[-2.7,-1.5],[1.5,2.7]]);frame(F.back,[-2,-1,0,1,2],[]);frame(F.left,[-1.95,-0.75,0.0],[[-1.95,-0.75]]);frame(F.right,[-1,1],[]);
for(const [f,u0,u1] of [[F.back,-3.05,-2],[F.back,3.05,2],[F.right,-2.35,-1],[F.right,2.35,1],[F.left,2.35,0.0],[F.front,-0.62,-1.5],[F.front,0.62,1.5]]){const lo=f===F.front?SB+0.18:SB+0.18;beam(fp(f,u0,lo,0.025),fp(f,u1,f===F.front?SB+0.95:H-0.2,0.025),f.n,0.08,0.13,timber,6);}
// ---- windows: reveal, frame, 3x2 panes over warm curtained glass, sill, flower box with trailing plants
function win(f,u,y0,w,h,o){o=o||{};const yc=y0+h/2,fw=0.08;fb(f,u,yc,0.004,w-0.04,h-0.04,0.008,glow,2);
  for(const e of [-1,1]){fb(f,u+e*(w/2-0.02),yc,0.04,0.04,h,0.09,[0.3,0.21,0.14],6);fb(f,u,yc+e*(h/2-0.02),0.04,w,0.04,0.09,[0.3,0.21,0.14],6);}
  fb(f,u,y0+h-fw/2,0.075,w+0.02,fw,0.05,timber,6);fb(f,u,y0+fw/2,0.075,w+0.02,fw,0.05,timber,6);for(const e of [-1,1])fb(f,u+e*(w/2-fw/2),yc,0.075,fw,h,0.05,timber,6);
  for(const k of [-1,1])fb(f,u+k*(w-2*fw)/6,yc,0.06,0.035,h-2*fw,0.035,timber,6);fb(f,u,y0+h*0.5,0.06,w-2*fw,0.035,0.035,timber,6);
  fb(f,u,y0-0.04,0.1,w+0.26,0.08,0.22,[0.48,0.36,0.24],6);
  if(o.box){fb(f,u,y0-0.25,0.22,w+0.06,0.24,0.26,[0.44,0.31,0.2],6);fb(f,u,y0-0.13,0.22,w-0.04,0.02,0.2,[0.3,0.21,0.14],10);
    for(let k=0;k<7;k++){const q=fp(f,u-w/2+0.1+k*(w-0.2)/6,0,0.22);ico([q[0],y0-0.1,q[2]],0.1,[0.28,0.5,0.2],1,{detail:1,jit:0.2});flower(q[0],y0-0.14,q[2],[[0.92,0.2,0.24],[0.98,0.6,0.75],[0.99,0.85,0.3],[0.6,0.4,0.85]][k%4],0.13);
      if(k%2===0)for(let j=1;j<4;j++){const q2=fp(f,u-w/2+0.1+k*(w-0.2)/6+rr(-0.03,0.03),0,0.36+j*0.01);ico([q2[0],y0-0.22-j*0.11,q2[2]],0.055,[0.25,0.46,0.18],1);}}}}
win(F.front,-2.1,1.38,1.0,1.0,{box:true});win(F.front,2.1,1.38,1.0,1.0,{box:true});win(F.left,-1.35,1.38,0.95,0.95,{box:true});win(F.back,-1.5,1.38,0.9,0.95);win(F.back,1.5,1.38,0.9,0.95);win(F.right,0,1.38,0.9,0.95);
// ---- door: frame, planks on a dark backing, iron straps with nails, ring, stone steps, lantern
{const f=F.front,dw=0.96,dh=2.05,yb=0.22;fb(f,0,yb+dh/2,0.004,dw+0.1,dh,0.008,[0.08,0.06,0.05],0);
  for(let k=0;k<6;k++)fb(f,-dw/2+dw*(k+0.5)/6,yb+dh/2,0.03,dw/6-0.012,dh-0.02,0.045,mix3([0.46,0.3,0.19],[0.52,0.34,0.22],rnd()),6);
  for(const y of [yb+0.4,yb+1.62]){fb(f,0,y,0.06,dw-0.06,0.07,0.014,iron,11);for(let k=0;k<6;k++)fb(f,-dw/2+0.08+k*(dw-0.16)/5,y,0.07,0.025,0.025,0.012,[0.12,0.11,0.1],11);}
  cyl(fp(f,0.3,yb+1.02,0.06),fp(f,0.3,yb+1.02,0.09),0.06,0.06,10,iron,11);cyl(fp(f,0.3,yb+0.92,0.08),fp(f,0.3,yb+0.92,0.1),0.075,0.075,12,[0.22,0.2,0.18],11);
  for(const e of [-1,1])fb(f,e*(dw/2+0.07),yb+dh/2+0.05,0.06,0.14,dh+0.12,0.14,timber,6);fb(f,0,yb+dh+0.1,0.06,dw+0.36,0.16,0.14,timber,6);
  for(const [w,d,y,o] of [[1.6,0.62,0.11,0.32],[1.9,0.42,0.05,0.76]])for(let k=0;k<3;k++)fb(f,-w/2+w*(k+0.5)/3+rr(-0.02,0.02),y,o,w/3-0.03,y*2,d,stonePal[(rnd()*6)|0],8);
  fb(f,-0.88,yb+1.86,0.12,0.05,0.05,0.24,iron,11);fb(f,-0.88,yb+1.65,0.25,0.18,0.28,0.18,[1,0.85,0.55],3);for(const e of [-1,1])for(const e2 of [-1,1])fb(f,-0.88+e*0.09,yb+1.65,0.25+e2*0.09,0.02,0.3,0.02,iron,11);
  fb(f,-0.88,yb+1.81,0.25,0.24,0.04,0.24,iron,11);fb(f,-0.88,yb+1.49,0.25,0.22,0.03,0.22,iron,11);}
// ================= roof =================
const tanA=RISE/(D/2),eY=H-OV*tanA,hx=W/2+GOV;
function slope(s){const A0=[eY,s*(D/2+OV)],B0=[H+RISE,0],L=Math.hypot(B0[0]-A0[0],B0[1]-A0[1]),a=[(B0[0]-A0[0])/L,(B0[1]-A0[1])/L];return{s,A0,L,a,n:[Math.abs(a[1]),s*a[0]]};}
// bendy: ridge sags, eave corners flare, edges wobble
function rp(R,x,t,o){const u=x/hx,v=clamp(t/R.L,0,1.05),dy=-0.32*(1-u*u)*Math.pow(v,1.1)+0.22*u*u*(1-v)*(1-v)+0.05*Math.sin(u*4.2+R.s*1.3)*(1-v)*(1-v);return[x,R.A0[0]+R.a[0]*t+R.n[0]*o+dy,R.A0[1]+R.a[1]*t+R.n[1]*o];}
const roofUnder=(x,z)=>{const R=slope(z<0?-1:1),t=(z-R.A0[1])/R.a[1];return rp(R,x,clamp(t,0,R.L),-TH)[1];};
// shingles on any surface S(u,t,o) (u along the ridge, t up the slope from the eave): overlapping staggered rows, butts lifted
function shingles(S,u0,u1,L,skip,o){o=o||{};const ex=o.exp||0.2,ln=o.len||0.38,th=0.024;let r=0;
  for(let tb=-0.05;tb<L-0.12;tb+=ex,r++){let u=u0-rnd()*0.25;while(u<u1){let w=rnd()<0.12?rr(0.32,0.42):rr(0.16,0.3);if(u+w>u1)w=u1-u;if(w<0.07)break;const uc=u+w/2,tc=Math.min(tb+ln/2,L-0.02);u+=w+0.014;
      const P=S(uc,tc,0);if(skip&&skip(P))continue;if(rnd()<0.012)continue;// a missing shingle now and then
      let Tu=norm(sub(S(uc+0.03,tc,0),S(uc-0.03,tc,0))),Tt=norm(sub(S(uc,tc+0.03,0),S(uc,tc-0.03,0))),N=norm(cross(Tt,Tu));if(N[1]<0)N=neg(N);
      const phi=rr(0.07,0.11);let Tt2=norm(sub(mul(Tt,Math.cos(phi)),mul(N,Math.sin(phi))));let N2=norm(cross(Tt2,Tu));if(N2[1]<0)N2=neg(N2);
      const psi=rr(-0.05,0.05);const Tu2=rot(Tu,N2,psi);Tt2=rot(Tt2,N2,psi);
      const age=rnd(),base=age<0.07?[0.78,0.6,0.4]:age>0.88?[0.5,0.48,0.44]:shPal[(rnd()*shPal.length)|0],v=rr(0.88,1.1);
      box(add(P,mul(N,0.03+th/2+rr(0,0.006))),mul(Tu2,w/2),mul(N2,th/2),mul(Tt2,ln/2),[base[0]*v,base[1]*v,base[2]*v],4);}}}
const chimSkip=P=>P[0]<-W/2+0.05&&P[2]>0.18&&P[2]<1.68;
for(const s of [-1,1]){const R=slope(s),NX=24,NT=12,xs=i=>-hx+2*hx*i/NX,ts=j=>R.L*j/NT+(j===NT?0.08:0);
  // deck: dark boards on top, underside boards, thick edges
  for(let i=0;i<NX;i++)for(let j=0;j<NT;j++){quad(rp(R,xs(i),ts(j),0),rp(R,xs(i+1),ts(j),0),rp(R,xs(i+1),ts(j+1),0),rp(R,xs(i),ts(j+1),0),null,[0.24,0.18,0.13],12,0.5);
    quad(rp(R,xs(i),ts(j),-TH),rp(R,xs(i),ts(j+1),-TH),rp(R,xs(i+1),ts(j+1),-TH),rp(R,xs(i+1),ts(j),-TH),null,[0.4,0.29,0.19],12,0.7);}
  // fascia along the eave and bargeboards along the gable edges, following the bends
  for(let i=0;i<NX;i++)beam(rp(R,xs(i),-0.02,-TH/2),rp(R,xs(i+1),-0.02,-TH/2),[0,1,0],0.2,0.05,timber,6,0.2+i*0.01);
  for(const e of [-1,1])for(let j=0;j<NT;j++){const x=e*(hx+0.03);beam(rp(R,x,ts(j),-0.02),rp(R,x,ts(j+1)+0.02,-0.02),R.n[0]>0?[0,R.n[0],R.n[1]]:[0,1,0],0.24,0.06,timber,6,0.3+j*0.01);}
  // rafter tails under the eave
  for(let x=-W/2+0.25;x<W/2;x+=0.62){const tw=(s*D/2-R.A0[1])/R.a[1];beam(rp(R,x,tw,-TH-0.07),rp(R,x,-0.08,-TH-0.07),[1,0,0],0.09,0.13,timber,6);}
  shingles((u,t,o)=>rp(R,u,t,o),-hx-0.02,hx+0.02,R.L,chimSkip);}
// ridge: pairs of cap shingles riding the ridge, moss on top
{const Rf=slope(-1),Rb=slope(1);for(let x=-hx;x<hx;x+=0.3){const xc=x+0.15;for(const R of [Rf,Rb]){const P=rp(R,xc,R.L-0.1,0.07),Tu=[1,0,0],Tt=norm(sub(rp(R,xc,R.L,0),rp(R,xc,R.L-0.2,0)));let N=norm(cross(Tt,Tu));if(N[1]<0)N=neg(N);
      const T2=norm(add(mul(Tt,0.92),mul(N,-0.38))),N2=norm(cross(T2,Tu));box(add(P,mul(N,0.02)),[0.16,0,0],mul(N2[1]<0?neg(N2):N2,0.016),mul(T2,0.2),mix3([0.42,0.34,0.26],[0.5,0.42,0.33],rnd()),4);}
    if(rnd()<0.35)ico(add(rp(Rf,xc,Rf.L,0.12),[0,0.05,0]),rr(0.07,0.12),[0.3,0.45,0.17],1,{sy:0.55,jit:0.3,detail:1});}}
// moss clumps sitting on the shingles
for(let k=0;k<55;k++){const R=slope(rnd()<0.6?-1:1),x=rr(-hx+0.2,hx-0.2),t=rnd()<0.5?rr(0.05,1.2):rr(0.2,R.L-0.3);const P=rp(R,x,t,0.08);if(chimSkip(P))continue;ico(P,rr(0.05,0.12),mix3([0.22,0.36,0.12],[0.4,0.52,0.18],rnd()),1,{sy:0.4,jit:0.35,detail:1});}
// gables: plaster fan up to the deck underside, timber posts, collar, braces, small window, vent
for(const e of [-1,1]){const x=e*W/2,pts=[];for(let k=0;k<=12;k++){const z=-D/2+D*k/12;pts.push([x+e*0.002,Math.min(roofUnder(x,z),H+RISE)-0.01,z]);}
  const cen=[x+e*0.002,H+RISE*0.35,0],hs=[D/2,RISE/2];const uvOf=p=>[p[2]/hs[0],(p[1]-H-RISE/2)/hs[1]];const T=(a,b,c)=>tri(a,b,c,plaster,5,0.13,[uvOf(a),uvOf(b),uvOf(c)],hs);
  T([x+e*0.002,H-0.05,-D/2],pts[0],cen);T(pts[12],[x+e*0.002,H-0.05,D/2],cen);T([x+e*0.002,H-0.05,D/2],[x+e*0.002,H-0.05,-D/2],cen);for(let k=0;k<12;k++)T(pts[k],pts[k+1],cen);
  const f=e<0?F.left:F.right,yU=z=>roofUnder(x,z)-0.03,U=z=>f.t[2]*z;// u from z
  fb(f,0,H+0.07,0.03,D,0.16,0.1,timber,6);fb(f,0,H+1.95,0.03,2.1,0.15,0.1,timber,6);
  for(const z of [-1.25,1.25])beam(fp(f,U(z),H+0.1,0.025),fp(f,U(z),yU(z),0.025),f.n,0.08,0.15,timber,6);
  beam(fp(f,0,H+1.95,0.025),fp(f,0,yU(0),0.025),f.n,0.08,0.15,timber,6);for(const z of [-1,1])beam(fp(f,U(z*0.18),H+1.98,0.025),fp(f,U(z*1.05),H+2.85,0.025),f.n,0.08,0.12,timber,6);
  win(f,0,H+0.62,0.62,0.7);for(let k=0;k<4;k++)fb(f,0,H+2.3+k*0.09,0.05,0.34,0.05,0.02,timber,6);}
// ================= chimney: stone stack against the left gable, leaning a touch; cap slab, two pots, soot =================
{const x0=-W/2-1.0,x1=-W/2,z0=0.3,z1=1.55,lean=y=>y>2.35?[(y-2.35)*-0.016,(y-2.35)*0.008]:[0,0];
  const cf=(o,n,t,half)=>({o,n,t,half});
  B((x0+x1)/2,1.0,(z0+z1)/2,x1-x0-0.06,2.0,z1-z0-0.06,mortar,8);
  const lowF=[cf([x0,0,(z0+z1)/2],[-1,0,0],[0,0,-1],(z1-z0)/2),cf([(x0+x1)/2,0,z0],[0,0,-1],[1,0,0],(x1-x0)/2),cf([(x0+x1)/2,0,z1],[0,0,1],[-1,0,0],(x1-x0)/2)];
  for(const f of lowF)stones(f,-f.half-0.05,f.half+0.05,0,2.05);
  // shoulder
  for(const [zz,s] of [[z0,-1],[z1,1]])beam([x0+0.1,2.0,zz],[x0+0.3,2.4,zz],[0,0,s],0.2,0.2,stonePal[2],8);beam([x0,2.05,(z0+z1)/2],[x0+0.28,2.38,(z0+z1)/2],[-1,0,0],1.2,0.2,stonePal[1],8);
  const ux0=x0+0.24,ux1=x1+0.02,uz0=z0+0.2,uz1=z1-0.2,top=H+RISE+1.25;
  const ucx=(ux0+ux1)/2,ucz=(uz0+uz1)/2;for(let y=2.35;y<top;y+=0.5){const l=lean(y+0.25);B(ucx+l[0],y+0.25,ucz+l[1],ux1-ux0-0.08,0.5,uz1-uz0-0.08,mortar,8);}
  const upF=[cf([ux0,0,ucz],[-1,0,0],[0,0,-1],(uz1-uz0)/2),cf([ucx,0,uz0],[0,0,-1],[1,0,0],(ux1-ux0)/2),cf([ucx,0,uz1],[0,0,1],[-1,0,0],(ux1-ux0)/2),cf([ux1,0,ucz],[1,0,0],[0,0,1],(uz1-uz0)/2)];
  for(const f of upF)stones(f,-f.half-0.04,f.half+0.04,2.35,top,null,{shear:lean});
  const lt=lean(top);B(ucx+lt[0],top+0.06,ucz+lt[1],ux1-ux0+0.22,0.12,uz1-uz0+0.22,stonePal[3],8);
  for(const dz of [-0.18,0.2]){const p=[ucx+lt[0],top+0.12,ucz+lt[1]+dz];cyl(p,add(p,[0,0.42,0]),0.13,0.11,12,[0.68,0.38,0.25],0,[0.08,0.06,0.05],0,undefined,true);cyl(add(p,[0,0.38,0]),add(p,[0,0.46,0]),0.14,0.14,12,[0.62,0.34,0.22],0,null,0,undefined,true);}}
// ================= porch over the door =================
{const pz=-D/2-1.15,eyP=2.55,ryP=3.35,ex=1.2;for(const e of [-1,1]){cyl([e*0.85,0,pz],[e*0.84,eyP,pz],0.085,0.075,8,[0.42,0.3,0.19],6);box([e*0.85,0.1,pz],[0.12,0,0],[0,0.1,0],[0,0,0.12],stonePal[0],8);
    beam([e*0.84,eyP-0.45,pz],[e*0.84,eyP-0.05,pz+0.4],[1,0,0],0.1,0.1,timber,6);}
  beam([-1.0,eyP,pz],[1.0,eyP,pz],[0,0,1],0.16,0.14,timber,6);for(const e of [-1,1])beam([e*0.84,eyP,pz],[e*0.84,eyP,-D/2],[1,0,0],0.14,0.12,timber,6);
  for(const e of [-1,1]){const Lp=Math.hypot(ex,ryP-eyP),S=(u,t,o)=>{const k=t/Lp,sag=-0.07*Math.sin(Math.PI*clamp((u-(pz-0.4))/(-D/2+0.35-(pz-0.4)),0,1))*k,nx=e*(ryP-eyP)/Lp,ny=ex/Lp;
      return[e*ex*(1-k)+nx*o,eyP+(ryP-eyP)*k+ny*o+sag,u];};
    for(let i=0;i<5;i++)for(let j=0;j<4;j++){const u0=pz-0.4+(-D/2+0.35-(pz-0.4))*i/5,u1=pz-0.4+(-D/2+0.35-(pz-0.4))*(i+1)/5,t0=Lp*j/4,t1=Lp*(j+1)/4+(j===3?0.04:0);
      quad(S(u0,t0,0),S(u1,t0,0),S(u1,t1,0),S(u0,t1,0),null,[0.24,0.18,0.13],12,0.5);quad(S(u0,t0,-0.09),S(u0,t1,-0.09),S(u1,t1,-0.09),S(u1,t0,-0.09),null,[0.4,0.29,0.19],12,0.6);}
    shingles(S,pz-0.42,-D/2+0.35,Lp,null,{exp:0.17,len:0.32});beam(S(pz-0.42,0,-0.04),S(pz-0.42,Lp+0.02,-0.04),[0,0,-1],0.2,0.05,timber,6);}
  for(let x=-0.95;x<0.95;x+=0.32){const c=[x+0.16,ryP+0.08,(pz-0.4-D/2+0.35)/2];}
  {const zf=pz-0.36,yU=x=>eyP+(ryP-eyP)*(1-Math.abs(x)/ex)-0.08;const pts=[];for(let k=0;k<=8;k++){const x=-ex+0.1+(2*ex-0.2)*k/8;pts.push([x,yU(x),zf]);}const c=[0,eyP+0.05,zf];
    for(let k=0;k<8;k++)tri(c,pts[k],pts[k+1],plaster,5,0.17,[[0,-1],[pts[k][0]/ex,(pts[k][1]-eyP)/0.8],[pts[k+1][0]/ex,(pts[k+1][1]-eyP)/0.8]],[ex,0.4]);
    beam([-ex+0.1,eyP+0.04,zf-0.03],[ex-0.1,eyP+0.04,zf-0.03],[0,1,0],0.12,0.06,timber,6);beam([0,eyP+0.05,zf-0.03],[0,ryP-0.08,zf-0.03],[1,0,0],0.12,0.06,timber,6);
    for(const e of [-1,1])beam([e*0.12,eyP+0.1,zf-0.03],[e*0.7,eyP+0.5,zf-0.03],[0,0,1],0.06,0.09,timber,6);}
  // ridge caps on the porch
  for(let z=pz-0.42;z<-D/2+0.3;z+=0.28){for(const e of [-1,1]){const c=[e*0.1,ryP+0.06,z+0.14];box(c,[e*0.13,-0.08,0],[0.012*e*0.5,0.015,0],[0,0,0.15],[0.44,0.36,0.28],4);}}}
// ================= garden =================
B(0,-0.5,0,160,1.0,160,[0.42,0.56,0.27],9,0,0);
// lane with ruts
{const c=[0.6,0.5,0.37];box([0,0.012,-11.6],[30,0,0],[0,0.012,0],[0,0,1.9],c,17,0.5);for(let k=0;k<90;k++)ico([rr(-28,28),0.03,-11.6+rr(-1.9,1.9)],rr(0.04,0.1),stonePal[(rnd()*6)|0],0,{sy:0.45,jit:0.2});
  for(let k=0;k<160;k++){const x=rr(-28,28),z=-11.6+(rnd()<0.5?rr(-2.1,-1.6):rr(1.6,2.1));tuft(x,z,6,rr(0.12,0.3));}}
// cobble path: rounded stones on a dirt strip, from the lane to the steps
{box([0,0.006,-6.6],[0.75,0,0],[0,0.006,0],[0,0,3.3],[0.5,0.4,0.29],10,0.4);for(let z=-9.75;z<-3.75;z+=0.2)for(let x=-0.6;x<0.6;x+=0.22){if(rnd()<0.18)continue;const s=rr(0.13,0.2),ang=rr(-0.4,0.4);
    box([x+rr(-0.04,0.04)+0.11,0.035,z+rr(-0.03,0.03)+0.1],rot([s/2,0,0],[0,1,0],ang),[0,rr(0.025,0.04),0],rot([0,0,rr(0.07,0.1)],[0,1,0],ang),stonePal[(rnd()*6)|0],8);}
  for(let k=0;k<70;k++){const z=rr(-9.8,-3.8),x=(rnd()<0.5?-1:1)*rr(0.62,0.95);tuft(x,z,5,rr(0.1,0.24));}}
// worn dirt patches
for(const [x,z,r] of [[0,-3.85,0.8],[-5.4,-3.0,0.6],[0,-9.3,0.7]])for(let k=0;k<7;k++){const a=rnd()*6.28,d=rr(0,r*0.6),rk=rr(0.25,0.5)*r,h=0.004+k*0.0008;cyl([x+Math.cos(a)*d,0,z+Math.sin(a)*d],[x+Math.cos(a)*d,h,z+Math.sin(a)*d],rk,rk*rr(0.7,1),9,[0.5,0.4,0.28],10,mix3([0.46,0.37,0.26],[0.54,0.43,0.3],rnd()),10);}
// split-rail fence with an open gate
{const posts=[];for(let x=-7.4;x<=7.41;x+=1.85)posts.push([x,-9.2]);for(let z=-7.35;z<=6.6;z+=1.85){posts.push([-7.4,z]);posts.push([7.4,z]);}
  for(const [x,z] of posts){if(Math.abs(x)<0.8&&z<-9)continue;const tl=[rr(-0.05,0.05),0,rr(-0.05,0.05)],ang=rnd();box([x+tl[0]/2,0.55,z+tl[2]/2],rot([0.065,0,0],[0,1,0],ang),[0,0.55,0],rot([0,0,0.065],[0,1,0],ang),mix3([0.42,0.34,0.27],[0.5,0.42,0.33],rnd()),6);
    for(let k=0;k<4;k++)tuft(x+rr(-0.15,0.15),z+rr(-0.15,0.15),7,rr(0.2,0.4));}
  const rail=(a,b)=>{for(const y of [0.5,0.9]){const p0=[a[0],y+rr(-0.04,0.04),a[1]],p1=[b[0],y+rr(-0.04,0.04),b[1]];beam(p0,p1,[0,1,0],rr(0.08,0.11),rr(0.06,0.08),mix3([0.48,0.39,0.3],[0.56,0.46,0.35],rnd()),6);}};
  for(let x=-7.4;x<7.3;x+=1.85){if(x<0.8&&x+1.85>-0.8)continue;rail([x,-9.2],[x+1.85,-9.2]);}
  for(const e of [-1,1])for(let z=-9.2;z<6.5;z+=1.85)rail([e*7.4,z],[e*7.4,Math.min(z+1.85,6.6)]);
  // gate swung open
  {const h=[0.72,-9.2],a=Math.PI-0.9,d=[Math.cos(a),Math.sin(a)];const P=k=>[h[0]+d[0]*k,0,h[1]+d[1]*k];
    for(const y of [0.35,0.85])beam(add(P(0.05),[0,y,0]),add(P(1.3),[0,y,0]),[0,1,0],0.1,0.05,[0.52,0.42,0.32],6);beam(add(P(0.1),[0,0.35,0]),add(P(1.25),[0,0.85,0]),[0,1,0],0.09,0.05,[0.5,0.4,0.3],6);
    for(const k of [0.08,1.27])beam(add(P(k),[0,0.15,0]),add(P(k),[0,1.0,0]),[d[0],0,d[1]],0.09,0.06,[0.48,0.38,0.29],6);}}
// flower beds along the front (soil, leaves, flowers)
for(const e of [-1,1]){const cx=e*2.2;box([cx,0.05,-3.2],[1.45,0,0],[0,0.05,0],[0,0,0.36],[0.33,0.23,0.15],10);for(let k=0;k<12;k++)fb(F.front,cx-1.4+k*0.255,0.07,0.78,0.22,0.12,0.12,stonePal[(rnd()*6)|0],8);
  for(let k=0;k<18;k++){const x=cx-1.3+rnd()*2.6,z=-3.42+rnd()*0.42;ico([x,0.13,z],rr(0.1,0.17),mix3([0.24,0.45,0.18],[0.35,0.58,0.24],rnd()),1,{detail:1,jit:0.25,sy:0.8});
    flower(x,0.1,z,[[0.92,0.2,0.24],[0.98,0.6,0.75],[0.99,0.85,0.3],[0.6,0.4,0.85],[0.98,0.97,0.94],[0.99,0.5,0.2]][k%6],rr(0.18,0.4));}}
// hollyhocks against the wall
for(const x of [-3.2,-1.05,1.05,3.25]){cyl([x,0,-3.02],[x,1.5,-3.0],0.015,0.01,5,[0.3,0.48,0.2],13);for(let y=0.5;y<1.5;y+=0.13)ico([x+rr(-0.06,0.06),y,-3.05],0.06,x<0?[0.95,0.55,0.7]:[0.98,0.95,0.92],1,{sy:0.6});
  for(let y=0.15;y<0.8;y+=0.2)ico([x+rr(-0.1,0.1),y,-3.07],0.09,[0.27,0.48,0.2],1,{sy:0.5});}
// ivy up the front-left corner and the chimney foot
function ivy(x0,z0,nx,nz,h,n){for(let s=0;s<n;s++){let x=x0+rr(-0.25,0.25),y=0.05,z=z0+rr(-0.25,0.25);const dx=rr(-0.3,0.3);while(y<h*rr(0.5,1)){y+=rr(0.06,0.12);x+=dx*0.06+rr(-0.03,0.03)*Math.abs(nz);z+=rr(-0.03,0.03)*Math.abs(nx);
    ico([x+nx*0.05,y,z+nz*0.05],rr(0.045,0.075),mix3([0.16,0.34,0.12],[0.3,0.5,0.18],rnd()),1,{sy:0.8,jit:0.2});}}}
ivy(-W/2-0.02,-D/2+0.4,-1,0,2.4,7);ivy(-W/2+0.4,-D/2-0.02,0,-1,2.0,5);ivy(-W/2-1.03,0.6,-1,0,2.8,8);
// bushes, hydrangea, lavender
for(const [x,z,r,c] of [[-3.95,-3.4,0.6,[0.24,0.46,0.2]],[3.95,-3.3,0.55,[0.28,0.5,0.22]],[-4.1,2.9,0.75,[0.22,0.42,0.18]],[3.9,-1.0,0.5,[0.3,0.52,0.22]],[-1.3,-4.45,0.32,[0.26,0.48,0.2]],[1.3,-4.5,0.3,[0.26,0.48,0.2]],[6.6,-8.4,0.7,[0.24,0.45,0.2]],[-6.6,5.8,0.8,[0.22,0.42,0.18]]]){
  ico([x,r*0.75,z],r,c,1,{detail:2,sy:0.85,jit:0.12});if(rnd()<0.6)for(let k=0;k<6;k++){const a=rnd()*6.28,el=rr(0.1,1.0);ico([x+Math.cos(a)*Math.cos(el)*r,r*0.75+Math.sin(el)*r*0.85,z+Math.sin(a)*Math.cos(el)*r],0.1,[[0.6,0.62,0.92],[0.95,0.75,0.85],[0.98,0.96,0.92]][k%3],1,{detail:1,jit:0.3});}}
for(let x=-6.6;x<6.7;x+=0.42){if(Math.abs(x)<1.2)continue;ico([x,0.18,-8.65],0.17,[0.36,0.5,0.32],1,{sy:0.8,jit:0.2});for(let k=0;k<5;k++)cyl([x+rr(-0.12,0.12),0.15,-8.65+rr(-0.1,0.1)],[x+rr(-0.2,0.2),rr(0.45,0.6),-8.65+rr(-0.15,0.15)],0.022,0.016,5,[0.55,0.45,0.78],1);}
// barrels, crates, pots, bucket by the door
function barrel(x,z,r,h,ry){const st=14;cyl([x,0,z],[x,h*0.5,z],r*0.94,r*1.04,st,[0.5,0.35,0.22],16,null,0,undefined,true);cyl([x,h*0.5,z],[x,h,z],r*1.04,r*0.94,st,[0.5,0.35,0.22],16,[0.42,0.3,0.2],6,undefined,true);
  for(const y of [h*0.12,h*0.4,h*0.6,h*0.88]){const rr2=r*(0.94+0.1*(1-Math.abs(y/h-0.5)*2))+0.008;cyl([x,y,z],[x,y+0.04,z],rr2,rr2,st,iron,11,null,0,undefined,true);}}
barrel(1.3,-3.95,0.3,0.82);barrel(1.82,-3.65,0.26,0.72);barrel(-W/2-0.25,-D/2-0.55,0.34,0.9);
for(const [x,z,s,ry] of [[-1.5,-4.0,0.5,0.3],[-1.45,-4.0,0.38,0.7]]){const y=x===-1.5?s/2:0.5+s/2;B(x,y,z,s,s,s,[0.55,0.42,0.28],6,ry);for(const e of [-1,1])for(const e2 of [-1,1]){const c=Math.cos(ry),sn=Math.sin(ry),dx=e*s/2,dz=e2*s/2;B(x+c*dx-sn*dz,y,z+sn*dx+c*dz,0.05,s+0.01,0.05,[0.42,0.3,0.2],6,ry);}}
for(const [x,z] of [[-0.9,-3.82],[0.92,-3.86],[2.6,-3.9]]){cyl([x,0,z],[x,0.34,z],0.15,0.21,12,[0.72,0.4,0.26],0,[0.3,0.22,0.15],10,undefined,true);cyl([x,0.32,z],[x,0.38,z],0.23,0.23,12,[0.68,0.38,0.24],0,null,0,undefined,true);
  ico([x,0.48,z],0.2,[0.27,0.5,0.2],1,{detail:1,jit:0.25});for(let k=0;k<3;k++)flower(x+rr(-0.1,0.1),0.42,z+rr(-0.1,0.1),[[0.92,0.2,0.24],[0.99,0.85,0.3],[0.98,0.97,0.94]][k],0.15);}
cyl([2.25,0,-4.25],[2.25,0.3,-4.25],0.13,0.16,12,[0.55,0.56,0.58],11,[0.3,0.32,0.34],11,undefined,true);
// woodpile under a lean-to by the chimney, chopping block with axe
{const x=-W/2-0.5;for(let r=0;r<5;r++)for(let k=0;k<7-r;k++){const z=-2.25+k*0.32+r*0.16+rr(-0.02,0.02),y=0.16+r*0.27,rr2=rr(0.11,0.15);cyl([x-0.42+rr(-0.05,0.05),y,z],[x+0.4+rr(-0.05,0.05),y,z],rr2,rr2,9,[0.36,0.27,0.2],15,[0.75,0.6,0.42],14);}
  for(const z of [-2.5,-0.2])cyl([x-0.55,0,z],[x-0.55,1.62,z],0.06,0.05,6,[0.42,0.3,0.2],6);beam([x-0.62,1.65,-2.6],[x+0.42,1.95,-2.6],[0,0,1],0.04,0.05,timber,6);
  for(let z=-2.62;z<-0.05;z+=0.2)beam([x-0.7,1.62,z+0.1],[x+0.48,1.98,z+0.1],[0,0,1],0.19,0.025,mix3([0.4,0.3,0.21],[0.5,0.39,0.28],rnd()),6);
  cyl([x-1.1,0,-3.1],[x-1.1,0.48,-3.1],0.28,0.28,12,[0.36,0.27,0.2],15,[0.75,0.6,0.42],14);beam([x-1.1,0.5,-3.1],[x-1.35,0.98,-2.95],[0,0,1],0.04,0.035,[0.6,0.46,0.3],6);box([x-1.13,0.53,-3.08],[0.09,0.03,0.05],[0,0.07,0],[0.01,0,-0.012],[0.42,0.44,0.46],11);
  for(let k=0;k<6;k++){const ang=rnd()*3;box([x-1.1+rr(-0.6,0.5),0.025,-3.1+rr(-0.5,0.5)],rot([rr(0.05,0.1),0,0],[0,1,0],ang),[0,0.02,0],rot([0,0,0.03],[0,1,0],ang),[0.7,0.56,0.38],6);}}
// vegetable patch: raised bed, mounded rows, cabbages, carrot tops, bean tepee
{const cx=-5.6,cz=-0.1;box([cx,0.12,cz],[1.15,0,0],[0,0.12,0],[0,0,1.75],[0.33,0.23,0.15],10);
  for(const [x,z,sx,sz] of [[cx,cz-1.8,1.2,0.05],[cx,cz+1.8,1.2,0.05],[cx-1.2,cz,0.05,1.85],[cx+1.2,cz,0.05,1.85]])box([x,0.15,z],[sx,0,0],[0,0.15,0],[0,0,sz],[0.42,0.32,0.22],6);
  for(let r=0;r<3;r++){box([cx-0.75+r*0.75,0.25,cz],[0.18,0,0],[0,0.04,0],[0,0,1.6],[0.3,0.21,0.14],10);for(let k=0;k<6;k++){const p=[cx-0.75+r*0.75,0.33,cz-1.4+k*0.56];
      if(r<2){ico(p,0.17,[0.48,0.66,0.36],1,{detail:1,sy:0.75,jit:0.15});for(let j=0;j<5;j++){const a=j*1.26;ico(add(p,[Math.cos(a)*0.17,-0.03,Math.sin(a)*0.17]),0.11,[0.4,0.6,0.32],1,{sy:0.35});}}
      else for(let j=0;j<5;j++)cyl(p,add(p,[rr(-0.07,0.07),rr(0.15,0.25),rr(-0.07,0.07)]),0.012,0.004,4,[0.36,0.6,0.22],13);}}
  const tp=[cx+0.85,2.1,cz+1.35];for(const [dx,dz] of [[-0.3,-0.3],[0.3,-0.3],[0.3,0.3],[-0.3,0.3]]){const b=[cx+0.85+dx,0.22,cz+1.35+dz];cyl(b,tp,0.022,0.016,5,[0.55,0.43,0.3],6);
    for(let t=0.1;t<0.92;t+=0.08)ico(add(b,mul(sub(tp,b),t)),rr(0.05,0.08),mix3([0.25,0.48,0.18],[0.38,0.58,0.24],rnd()),1,{sy:0.7});}}
// bench under the apple tree
{const x=-4.6,z=4.0;for(const dz of [-0.12,0,0.12])B(x,0.46,z+dz,1.6,0.05,0.11,[0.52,0.4,0.28],6,0.3);for(const dy of [0.7,0.84])B(x+0.05,dy,z+0.22,1.6,0.1,0.04,[0.5,0.38,0.27],6,0.3);
  for(const e of [-0.7,0.7]){const c=Math.cos(0.3),s=Math.sin(0.3);B(x+c*e,0.23,z+s*e,0.07,0.46,0.38,[0.42,0.32,0.22],6,0.3);}}
// trees: bark trunks with branches, lumpy canopies
function tree(x,z,s,apples){cyl([x,0,z],[x+0.12*s,2.2*s,z+0.05*s],0.22*s,0.14*s,9,[0.42,0.34,0.27],15);for(const [dx,dz] of [[0.9,0.3],[-0.8,-0.3],[0.1,-0.8]])cyl([x+0.1*s,1.8*s,z],[x+dx*s,2.9*s,z+dz*s],0.09*s,0.05*s,6,[0.42,0.34,0.27],15);
  for(const [dx,dy,dz,r] of [[0,3.3,0,1.5],[0.95,3.0,0.35,1.1],[-0.9,3.05,-0.3,1.15],[0.1,4.0,0.1,1.0],[-0.3,3.4,0.9,0.9]])ico([x+dx*s,dy*s,z+dz*s],r*s,mix3([0.26,0.48,0.2],[0.36,0.58,0.26],rnd()),1,{detail:2,jit:0.12});
  if(apples)for(let k=0;k<24;k++){const a=rnd()*6.28,el=rr(-0.2,0.9),r=1.45*s;ico([x+Math.cos(a)*Math.cos(el)*r,3.2*s+Math.sin(el)*r*0.85,z+Math.sin(a)*Math.cos(el)*r],0.07,[0.85,0.18,0.14],0,{detail:1});}
  for(let k=0;k<12;k++){const a=rnd()*6.28,d=rr(0.3,0.9);tuft(x+Math.cos(a)*d,z+Math.sin(a)*d,7,rr(0.2,0.45));}}
tree(-5.3,4.6,1,true);tree(4.6,4.2,1.2);tree(1.6,5.8,0.9);for(const [x,z,s] of [[-9.5,2,1.3],[9.8,-2,1.1],[-2.5,9.8,1.4],[6.5,9.2,1.2],[-13,-9,1.0],[11,6,1.4],[-12,9,1.5]])tree(x,z,s);
// grass: tufts everywhere outside the beds, denser along fence, walls and paths
for(let k=0;k<2600;k++){const x=rr(-14,14),z=rr(-9.6,12);if(Math.abs(x)<3.65&&z>-3.0&&z<2.95)continue;if(Math.abs(x)<0.65&&z<-3.6&&z>-9.8)continue;if(x<-4.3&&x>-6.9&&z>-2&&z<1.8)continue;
  if(Math.abs(x)<3.4&&z<-2.9&&z>-3.55)continue;tuft(x,z,rnd()<0.3?6:4,rr(0.08,0.2));}
for(let k=0;k<500;k++){const side=k%4,u=rnd();const x=side<2?(side?-1:1)*rr(3.55,3.8):rr(-3.6,3.6),z=side<2?rr(-2.9,2.9):(side===2?-1:1)*rr(2.85,3.05);tuft(x,z,6,rr(0.15,0.32));}
// a few daisies and dandelions in the grass
for(let k=0;k<120;k++){const x=rr(-7,7),z=rr(-9,6);if(Math.abs(x)<3.7&&z>-3.6&&z<3.2)continue;flower(x,0,z,rnd()<0.6?[0.98,0.97,0.94]:[0.99,0.85,0.25],rr(0.08,0.16));}

// ================= GL =================
function sh(t,s){const x=g.createShader(t);g.shaderSource(x,s);g.compileShader(x);if(!g.getShaderParameter(x,g.COMPILE_STATUS))throw new Error(g.getShaderInfoLog(x));return x;}
function prog(vs,fs){const p=g.createProgram();g.attachShader(p,sh(g.VERTEX_SHADER,vs));g.attachShader(p,sh(g.FRAGMENT_SHADER,fs));g.linkProgram(p);if(!g.getProgramParameter(p,g.LINK_STATUS))throw new Error(g.getProgramInfoLog(p));return p;}
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
float voro(vec2 p){vec2 i=floor(p),f=fract(p);float d=9.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 o=vec2(x,y);vec2 r=o+vec2(h2(i+o),h2(i+o+17.3))-f;d=min(d,dot(r,r));}return sqrt(d);}`;
const VS=`#version 300 es
layout(location=0) in vec3 aP;layout(location=1) in vec3 aN;layout(location=2) in vec3 aC;layout(location=3) in float aM;layout(location=4) in vec4 aUH;layout(location=5) in vec2 aS;
uniform mat4 uVP,uLVP;uniform vec3 uL;out vec3 vW,vN;out vec2 vUV;flat out vec2 vHS;flat out vec3 vC;flat out int vM;flat out float vSeed;out vec4 vL;
void main(){vW=aP;vN=aN;vC=aC;vM=int(aM+.5);vUV=aUH.xy;vHS=aUH.zw;vSeed=aS.x;vec3 nl=dot(aN,uL)<0.?-aN:aN;vL=uLVP*vec4(aP+nl*.012,1.);gl_Position=uVP*vec4(aP,1.);}`;
const FS=`#version 300 es
precision highp float;precision highp sampler2DShadow;
in vec3 vW,vN;in vec2 vUV;flat in vec2 vHS;flat in vec3 vC;flat in int vM;flat in float vSeed;in vec4 vL;
uniform vec3 uEye,uL,uSun,uSky,uGnd;uniform sampler2DShadow uSh;uniform float uShT,uMoss;
layout(location=0) out vec4 oC;layout(location=1) out vec4 oN;layout(location=2) out vec4 oX;
${NOISE}
float edgeD(vec2 q){vec2 e=vHS-abs(q);return min(e.x,e.y);}
float hgt(int m,vec2 q){float sd=vSeed*31.;float e=edgeD(q);
  if(m==4){float bev=smoothstep(0.,.016,e)*.005;float gr=vn(vec2(q.x*60.+sd,q.y*3.5))-.5;float cr=smoothstep(.04,0.,abs(vn(vec2(q.x*9.+sd,q.y*1.3))-.5));return bev+gr*.0018-cr*.004;}
  if(m==8){float mn=min(vHS.x,vHS.y);return sqrt(clamp(e/(mn*.6),0.,1.))*.03+fbm(q*10.+sd)*.009;}
  if(m==5){float pm=smoothstep(.69,.71,fbm(q*.8+13.));vec2 bq=q/vec2(.22,.075);bq.x+=floor(bq.y)*.5;vec2 bf=fract(bq);float mo=min(1.,step(bf.y,.15)+step(bf.x,.06));
    float crk=smoothstep(.012,0.,abs(fbm(q*1.1+7.)-.5))*(1.-pm);return mix(fbm(q*2.5)*.005+fbm(q*13.)*.002,-.012+(1.-mo)*.004,pm)-crk*.004;}
  if(m==6||m==16){vec2 gq=vHS.x>=vHS.y?q:q.yx;float gr=vn(vec2(gq.x*1.6+sd,gq.y*40.+sd));float cr=smoothstep(.05,0.,abs(vn(vec2(gq.x*.6+sd,gq.y*8.))-.5));return smoothstep(0.,.012,e)*.004+(gr-.5)*.002-cr*.0035;}
  if(m==15)return fbm(vec2(q.x*16.+sd,q.y*2.4))*.03;
  if(m==14){float r=length(vUV);return -smoothstep(.85,1.,r)*.004+sin(r*48.+vn(vUV*4.+sd)*4.)*.0006;}
  if(m==9)return fbm(q*4.)*.014+fbm(q*21.)*.005;
  if(m==10)return fbm(q*7.)*.018+(h2(floor(q*16.))>.85?.006:0.);
  if(m==17){float rut=smoothstep(.4,.0,abs(abs(q.y)-.75));return fbm(q*5.)*.02-rut*.05+(h2(floor(q*14.))>.88?.008:0.);}
  if(m==12)return -step(fract(q.y/.17),.05)*.004;
  if(m==11)return fbm(q*25.)*.002;
  return 0.;}
vec3 albedo(int m,vec2 q,vec3 c){float sd=vSeed*31.;float e=edgeD(q);
  if(m==4){float gr=vn(vec2(q.x*60.+sd,q.y*3.5));c*=.8+.32*gr;c*=mix(.66,1.,smoothstep(-vHS.y,-vHS.y*.25,q.y));c*=mix(.55,1.,smoothstep(0.,.012,e));
    float cr=smoothstep(.04,0.,abs(vn(vec2(q.x*9.+sd,q.y*1.3))-.5));return c*(1.-cr*.45);}
  if(m==8){c*=.76+.4*fbm(q*4.+sd);c*=mix(.45,1.,smoothstep(0.,.03,e));c+=(h2(floor(q*80.)+sd)-.5)*.07;return c;}
  if(m==5){float pm=smoothstep(.69,.71,fbm(q*.8+13.));c*=.86+.18*fbm(q*.9)+.06*fbm(q*9.);vec2 bq=q/vec2(.22,.075);bq.x+=floor(bq.y)*.5;vec2 bf=fract(bq);float mo=min(1.,step(bf.y,.15)+step(bf.x,.06));
    vec3 bc=mix(vec3(.6,.3,.21)*(.75+.45*h2(floor(bq))),vec3(.62,.58,.52),mo);c=mix(c,c*.78,smoothstep(.64,.69,fbm(q*.8+13.))*(1.-pm));c=mix(c,bc,pm);
    float crk=smoothstep(.012,0.,abs(fbm(q*1.1+7.)-.5))*(1.-pm);return c*(1.-crk*.5);}
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
  return c;}
vec3 weather(int m,vec3 c,vec3 N,vec2 q){float y=vW.y;
  if(m==4||m==8||m==6||m==16||m==12||m==15){float mm=fbm(vW.xz*.9+vW.y*.45+vec2(3,7));
    float sunF=clamp(dot(N,uL),0.,1.);float bias=m==4?.02+.14*smoothstep(-.2,-.9,vUV.y)+.1*smoothstep(4.,2.8,y):m==8?(N.y>.6?-.25+.4*smoothstep(.03,0.,edgeD(q)):.0)+.2*smoothstep(.7,0.,y):m==15?.08:.16*smoothstep(.5,0.,y);bias-=.12*sunF;
    float fz=vn(vW.xz*45.+vW.y*35.),moss=smoothstep(.7,.8,mm+bias)*uMoss;vec3 mc=mix(vec3(.17,.3,.09),vec3(.46,.56,.17),fz*.7+.3*vn(vW.xz*6.));
    c=mix(c,mc,moss*smoothstep(.25,.55,fz+moss*.45));
    vec2 lp=(m==4||m==8)?q*7.+vSeed*13.:vW.xz*5.+vW.y*3.;float d=voro(lp),lm=smoothstep(.45,.6,fbm(vW.xz*.5+vW.y*.4+11.));
    c=mix(c,mix(vec3(.82,.8,.64),vec3(.86,.72,.42),step(.5,h2(floor(lp)))),smoothstep(.17,.09,d)*lm*.6*uMoss);}
  if(m==5||m==8||m==6||m==16){float gr=smoothstep(.85,0.,y)*(.5+.5*fbm(vW.xz*3.+y*4.));c=mix(c,c*vec3(.6,.55,.47),gr*.65);
    float shd=1.-clamp(dot(N,uL),0.,1.);float al=smoothstep(1.7,.2,y)*shd*smoothstep(.4,.7,fbm(vW.xz*1.7+y*2.));c=mix(c,c*vec3(.68,.84,.58),al*.7);}
  if(m==5){float s=vn(vec2((vW.x+vW.z)*7.,y*.32));c=mix(c,c*vec3(.72,.7,.64),smoothstep(.58,.85,s)*smoothstep(1.3,2.9,y)*.35);c*=1.-smoothstep(2.45,3.,y)*.22;
    c=mix(c,c*vec3(.7,.66,.6),smoothstep(.62,.8,vn(vec2((vW.x+vW.z)*14.,y*.6)))*smoothstep(1.4,1.2,y)*0.);}
  if(m==8&&y>7.)c*=mix(1.,.4,smoothstep(7.,8.3,y)*(.6+.4*fbm(vW.xz*4.+y*3.)));
  if(m==4)c=mix(c,c*vec3(.82,.8,.76),smoothstep(.55,.8,vn(vec2(vW.x*2.5,vW.y*.7)))*.35);
  return c;}
float shadowAt(){vec3 p=vL.xyz/vL.w*.5+.5;if(p.x<0.||p.y<0.||p.x>1.||p.y>1.)return 1.;float s=0.;for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++)s+=texture(uSh,vec3(p.xy+vec2(i,j)*.7*uShT,p.z-.0004));return s/9.;}
void main(){vec3 Ng=normalize(vN),V=normalize(uEye-vW);if(dot(Ng,V)<0.)Ng=-Ng;int m=vM;vec2 q=vUV*vHS;if(m==9)q=vW.xz;
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
    float cav=m==4||m==8||m==6||m==16?mix(.72,1.,smoothstep(-.002,.01,hc+.002)):1.;
    col=alb*(uSun*lit+mix(uGnd,uSky,Nd.y*.5+.5)*cav);if(m==9||m==10||m==17)inkW=0.;else if(m==4||m==8)inkW=.5;}
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
precision highp float;in vec2 vU;uniform sampler2D uC,uN,uD,uX,uA;uniform vec2 uPx;uniform float uNear,uFar;out vec4 o;
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
  float hz=smoothstep(26.,70.,z0);c=mix(c,vec3(.78,.84,.86),hz*.75);o=vec4(c,1.);}`;
// final: bloom from warm lights, tilt-shift, grade, vignette
const FIN=`#version 300 es
precision highp float;in vec2 vU;uniform sampler2D uC;uniform vec2 uPx;out vec4 o;
void main(){float b=smoothstep(.17,.5,abs(vU.y-.46))*7.;vec3 s=texture(uC,vU).rgb;float w=1.;
  for(int k=0;k<16;k++){float a=float(k)*2.39996,r=sqrt(float(k)+.5)/4.*b;s+=texture(uC,vU+vec2(cos(a),sin(a))*r*uPx).rgb;w+=1.;}vec3 c=s/w;
  vec3 bl=vec3(0.);for(int k=0;k<24;k++){float a=float(k)*2.39996,r=sqrt(float(k)+.5)*5.;vec3 t=texture(uC,vU+vec2(cos(a),sin(a))*r*uPx).rgb;bl+=max(t-vec3(.95),0.);}c+=bl/24.*vec3(1.,.75,.45)*1.6;
  c=c/(1.+max(c-.85,0.)*.6);float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l),c,1.06);c=mix(c*vec3(.95,.98,1.04),c*vec3(1.04,1.,.94),smoothstep(.2,.7,l));
  float vg=smoothstep(1.1,.35,length(vU-vec2(.5,.47)));o=vec4(c*mix(.86,1.,vg),1.);}`;
function tex(w,h,ifmt,fmt,type,filt){const t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);g.texImage2D(g.TEXTURE_2D,0,ifmt,w,h,0,fmt,type,null);
  g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,filt);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,filt);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);return t;}
function fbo(atts,depth){const f=g.createFramebuffer();g.bindFramebuffer(g.FRAMEBUFFER,f);atts.forEach((t,i)=>g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0+i,g.TEXTURE_2D,t,0));if(depth)g.framebufferTexture2D(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.TEXTURE_2D,depth,0);
  if(atts.length)g.drawBuffers(atts.map((_,i)=>g.COLOR_ATTACHMENT0+i));return f;}
window.COZY={render(opt){opt=opt||{};const nv=VB.length/16;const buf=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,buf);g.bufferData(g.ARRAY_BUFFER,new Float32Array(VB),g.STATIC_DRAW);
  const vao=g.createVertexArray();g.bindVertexArray(vao);const A=(i,n,o)=>{g.enableVertexAttribArray(i);g.vertexAttribPointer(i,n,g.FLOAT,false,64,o*4);};A(0,3,0);A(1,3,3);A(2,3,6);A(3,1,9);A(4,4,10);A(5,2,14);
  const L=norm(opt.sun||[-0.3,0.72,-0.62]),tgt=opt.target||[-0.4,2.4,-1.4],dir=norm(opt.dir||[-0.6,0.52,-0.6]),dist=opt.dist||25,eye=add(tgt,mul(dir,dist));
  const near=0.5,far=200,Pm=persp((opt.fov||30)*Math.PI/180,1,near,far),Vm=look(eye,tgt,[0,1,0]),VP=mmul(Pm,Vm);
  const lc=[0,1.5,-1],LV=look(add(lc,mul(L,60)),lc,[0,1,0]),LVP=mmul(ortho(-15,15,-15,15,1,140),LV);
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
  g.uniform2f(I('uPx'),1/SZ,1/SZ);g.uniform1f(I('uNear'),near);g.uniform1f(I('uFar'),far);g.drawArrays(g.TRIANGLES,0,3);
  g.bindFramebuffer(g.FRAMEBUFFER,null);const fpg=prog(QVS,FIN);g.useProgram(fpg);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,iT);g.uniform1i(g.getUniformLocation(fpg,'uC'),0);g.uniform2f(g.getUniformLocation(fpg,'uPx'),1/SZ,1/SZ);g.drawArrays(g.TRIANGLES,0,3);
  g.finish();return{tris:nv/3,err:g.getError()};}};
})();
