'use strict';
// ===== canadair.js
// ===================================================================
// The Canadair CL-415 water bomber (4.44.0), modelled from the user's six photos, in the Québec livery (photo 1, C-GQBG, number 245):
// a flying-boat hull, chrome yellow above and red below with a vee bottom, chines and a step; a red-white-red cheat line from the nose
// along the cabin that sweeps up at the tail; a black anti-glare panel ahead of the windscreen; the straight high wing on top of the
// hull with two turboprop nacelles riding on it (four-blade propellers, chrome spinners); wingtip floats on pylons; red wingtips with
// black bands; the tall fin with a red top, the tailplane high on the fin with finlets; tricycle gear that folds into the hull; two
// scoop probes behind the step. Real sizes: span 28.6 m, length 19.82 m, 6 137 L of water, two 1 775 kW engines.
// Body frame as the other planes: x forward, y up, z right, origin near the centre of mass. Measures: d = metres back from the nose tip.
// It flies on Plane.step (aerodynamics) with the Beaver's water code (Beaver.contact with its K): hull keels and wingtip floats.
// ===================================================================
const PLC={kind:'cl415',a0:-0.07,span:28.6,len:19.8,S:100.3,m:14000,P:3550000,cd0:0.034,thr0:62000,I:[130000,320000,220000],stallA:0.27,hk:4.6,
  // wheels: twin nose wheels (steer, first two), main wheels (brakes)
  wheels:[[6.35,-3.32,-0.24],[6.35,-3.32,0.24],[-0.85,-3.38,-1.78],[-0.85,-3.38,1.78]],
  // the hull's keel and chines (bow to stern) and the wingtip floats: water contact
  keel:(()=>{const o=[];for(const [x,y] of [[7.4,-1.5],[6.2,-2.3],[4.8,-2.55],[3.2,-2.6],[1.5,-2.6],[0.2,-2.6],[-1.2,-2.38],[-2.8,-2.1],[-4.4,-1.8],[-6.0,-1.45]])for(const z of [-0.85,0,0.85])o.push([x,y+Math.abs(z)*0.42,z]);
    for(const z of [-11.3,11.3])for(const x of [1.0,-1.6])o.push([x,-0.72,z]);return o;})(),
  spray:[[4.2,-2.4,1.4],[0.6,-2.4,1.45]],float0:1.65,
  propX:4.95,props:[[4.95,2.3,-4.6],[4.95,2.3,4.6]],eye:[6.05,1.22,-0.42],nose:[8.9,0.4,0],chase:[33,8.5],wing:[-4,5,-18],
  noseHinge:[6.6,-2.45,0],mainHinge:[-0.85,-2.05,1.5],
  nav:{l:[-0.7,1.95,-14.35],r:[-0.7,1.95,14.35],t:[-11.55,1.35,0],b:[-10.4,6.75,0]},probe:[-0.6,-2.6,0.55],water:6137};
const CL_PARTS={};
function canadairMeshes(){
  const YL=[0.99,0.76,0.02],YLd=[0.85,0.62,0.02],RD=[0.86,0.1,0.06],RDd=[0.6,0.07,0.05],WH=[0.95,0.95,0.93],BK=[0.04,0.04,0.045],GR=[0.32,0.33,0.35],LG=[0.76,0.77,0.79],
    TY=[0.05,0.05,0.055],GLs=[0.2,0.25,0.3],INT=[0.18,0.18,0.19],SUIT=[0.2,0.28,0.45],SKIN=[0.86,0.63,0.5],PAINT=11,CHROME=10,MATTE=3,INTM=7,GLASS=13;
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],
    crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],nrm=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l];},lerp=(a,b,t)=>a+(b-a)*t;
  const V=(M,p,n,c,m)=>{M.v.push(p[0],p[1],p[2],n[0],n[1],n[2],c[0],c[1],c[2],0,0,0,1,m);return M.n++;};
  const surf=(M,f,us,vs,paint,o)=>{o=o||{};const nu=us.length,nv=vs.length,P=[],N=[],eu=o.eu||1e-4,ev=o.ev||1e-4;
    for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const u=us[i],v=vs[j],p=f(u,v);let du=sub(f(u+eu,v),f(u-eu,v)),dv=sub(f(u,v+ev),f(u,v-ev));
      if(Math.hypot(...du)<1e-9)du=sub(f(u+eu*50,v),f(u-eu*50,v));if(Math.hypot(...dv)<1e-9)dv=sub(f(u,v+ev*50),f(u,v-ev*50));let n=nrm(crs(du,dv));if(o.flip)n=mul(n,-1);P.push(p);N.push(n);}
    for(let i=0;i+1<nu;i++)for(let j=0;j+1<nv;j++){const pc=paint?paint((us[i]+us[i+1])/2,(vs[j]+vs[j+1])/2):[YL,PAINT];if(!pc)continue;
      const k=[i*nv+j,(i+1)*nv+j,(i+1)*nv+j+1,i*nv+j+1],ix=k.map(q=>V(M,P[q],N[q],pc[0],pc[1]));M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);}};
  const range=(a,b,n)=>{const r=[];for(let i=0;i<=n;i++)r.push(a+(b-a)*i/n);return r;};
  const mono=T=>{T=T.slice().sort((a,b)=>a[0]-b[0]);const n=T.length,xs=T.map(t=>t[0]),ys=T.map(t=>t[1]),d=[],m=new Array(n);for(let i=0;i<n-1;i++)d.push((ys[i+1]-ys[i])/(xs[i+1]-xs[i]));
    m[0]=d[0];m[n-1]=d[n-2];for(let i=1;i<n-1;i++)m[i]=d[i-1]*d[i]<=0?0:(d[i-1]+d[i])/2;for(let i=0;i<n-1;i++){if(d[i]===0){m[i]=m[i+1]=0;continue;}const a=m[i]/d[i],b=m[i+1]/d[i],h=a*a+b*b;if(h>9){const t=3/Math.sqrt(h);m[i]=t*a*d[i];m[i+1]=t*b*d[i];}}
    return x=>{if(x<=xs[0])return ys[0];if(x>=xs[n-1])return ys[n-1];let i=0;while(x>xs[i+1])i++;const h=xs[i+1]-xs[i],t=(x-xs[i])/h,t2=t*t,t3=t2*t;return(2*t3-3*t2+1)*ys[i]+(t3-2*t2+t)*h*m[i]+(-2*t3+3*t2)*ys[i+1]+(t3-t2)*h*m[i+1];};};
  const tube=(M,a,b,r0,r1,n,col,mat,cap)=>{const ax=nrm(sub(b,a)),h=Math.abs(ax[1])<0.9?[0,1,0]:[1,0,0],u=nrm(crs(ax,h)),w=crs(ax,u);
    surf(M,(s,t)=>{const r=lerp(r0,r1,s),c=Math.cos(t),sn=Math.sin(t);return add(add(a,mul(sub(b,a),s)),add(mul(u,c*r),mul(w,sn*r)));},[0,1],range(0,Math.PI*2,n),()=>[col,mat]);
    if(cap)for(const [p,r,sg] of [[a,r0,-1],[b,r1,1]]){const c0=V(M,p,mul(ax,sg),col,mat);for(let k=0;k<n;k++){const t0=k/n*Math.PI*2,t1=(k+1)/n*Math.PI*2,q0=add(p,add(mul(u,Math.cos(t0)*r),mul(w,Math.sin(t0)*r))),q1=add(p,add(mul(u,Math.cos(t1)*r),mul(w,Math.sin(t1)*r)));M.i.push(c0,V(M,q0,mul(ax,sg),col,mat),V(M,q1,mul(ax,sg),col,mat));}}};
  const ball=(M,c,r,s,col,mat,n)=>{n=n||12;s=s||[1,1,1];surf(M,(a,b)=>[c[0]+Math.cos(b)*Math.cos(a)*r*s[0],c[1]+Math.sin(b)*r*s[1],c[2]+Math.cos(b)*Math.sin(a)*r*s[2]],range(0,Math.PI*2,n),range(-Math.PI/2,Math.PI/2,Math.ceil(n/2)),()=>[col,mat],{ev:1e-3});};
  const box=(M,c,h,col,mat)=>{const P=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(v=>[c[0]+v[0]*h[0],c[1]+v[1]*h[1],c[2]+v[2]*h[2]]);
    for(const [f,n] of [[[0,1,2,3],[0,0,-1]],[[5,4,7,6],[0,0,1]],[[4,0,3,7],[-1,0,0]],[[1,5,6,2],[1,0,0]],[[3,2,6,7],[0,1,0]],[[4,5,1,0],[0,-1,0]]]){const ix=f.map(i=>V(M,P[i],n,col,mat));M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);}};
  const quad=(M,a,b,c,d,n,col,mat)=>{const ix=[a,b,c,d].map(p=>V(M,p,n,col,mat));M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);};
  // a flat plate in the x-y plane from an outline (x,y), half-thickness th, at side offset z0 (fin, finlets), painted by position
  const slab=(M,poly,th,paint,z0)=>{z0=z0||0;const n=poly.length,c=poly.reduce((a,p)=>[a[0]+p[0]/n,a[1]+p[1]/n],[0,0]);
    const fan=(sd)=>{for(let i=0;i<n;i++){const a=poly[i],b=poly[(i+1)%n];const sub2=8;for(let k=0;k<sub2;k++){/* split each fan triangle so the paint can follow height */
        const t0=k/sub2,t1=(k+1)/sub2,P1=[lerp(c[0],a[0],t0),lerp(c[1],a[1],t0)],P2=[lerp(c[0],a[0],t1),lerp(c[1],a[1],t1)],P3=[lerp(c[0],b[0],t1),lerp(c[1],b[1],t1)],P4=[lerp(c[0],b[0],t0),lerp(c[1],b[1],t0)];
        const mid=[(P1[0]+P2[0]+P3[0]+P4[0])/4,(P1[1]+P2[1]+P3[1]+P4[1])/4],pc=paint(mid[0],mid[1]),Q=[P1,P2,P3,P4].map(p=>[p[0],p[1],z0+sd*th]);
        if(sd>0)quad(M,Q[0],Q[1],Q[2],Q[3],[0,0,1],pc[0],pc[1]);else quad(M,Q[3],Q[2],Q[1],Q[0],[0,0,-1],pc[0],pc[1]);}}};fan(1);fan(-1);
    for(let i=0;i<n;i++){const a=poly[i],b=poly[(i+1)%n],e=nrm([b[1]-a[1],-(b[0]-a[0]),0]),pc=paint((a[0]+b[0])/2,(a[1]+b[1])/2);quad(M,[a[0],a[1],z0-th],[b[0],b[1],z0-th],[b[0],b[1],z0+th],[a[0],a[1],z0+th],e,pc[0],pc[1]);}};
  const NX=8.4,X=d=>NX-d;

  // ================================================================ the hull: a vee bottom from keel to chines, a rounded top above
  const keelY=mono([[0,-0.7],[0.35,-1.45],[0.9,-2.05],[2.0,-2.45],[3.5,-2.6],[9.25,-2.62],[9.3,-2.42],[11.0,-2.18],[13.5,-1.72],[15.5,-1.28],[17.5,-0.55],[19.8,0.55]]),
    topY=mono([[0,-0.25],[0.4,0.35],[1.2,0.72],[2.2,0.98],[2.9,1.5],[3.6,1.66],[13.0,1.66],[15.5,1.55],[18.0,1.35],[19.8,1.12]]),
    hwF=mono([[0,0.12],[0.35,0.62],[0.9,0.98],[2.0,1.22],[3.5,1.32],[11.0,1.32],[13.5,1.15],[15.5,0.92],[17.5,0.62],[19.8,0.3]]),
    dead=mono([[0,0.25],[2,0.55],[9.3,0.42],[12,0.35],[19.8,0.12]]);// chine height above the keel (deadrise)
  const sp=(c,m)=>Math.sign(c)*Math.pow(Math.abs(c),2/m);
  // u: 0 keel (right side) .. 0.14 chine .. 0.5 top .. 0.86 chine .. 1 keel (left); returns [x,y,z]
  const H=(d,u,ins)=>{ins=ins||0;const yk=keelY(d)+ins,yt=topY(d)-ins,hw=Math.max(0.02,hwF(d)-ins),yc=Math.min(yt-0.05,yk+dead(d)),sd=u<0.5?1:-1,w=u<0.5?u:1-u;
    if(w<0.14){const k=w/0.14;return[X(d),yk+(yc-yk)*Math.sign(k)*Math.pow(Math.abs(k),1.15),sd*hw*0.94*k];}
    const a=(w-0.14)/0.36*Math.PI/2,c=Math.cos(a),s=Math.sin(a);return[X(d),yc+(yt-yc)*sp(s,2.6),sd*hw*(0.94+0.06*Math.min(1,a*4))*sp(c,2.6)];};
  const sideZ=(d,y)=>{const yk=keelY(d),yt=topY(d),hw=hwF(d),yc=Math.min(yt-0.05,yk+dead(d));if(y<=yc)return hw*0.94*clamp((y-yk)/Math.max(0.01,yc-yk),0,1);const s=clamp((y-yc)/(yt-yc),0,1),a=Math.asin(Math.pow(s,2.6/2));return hw*Math.pow(Math.cos(a),2/2.6);};
  // paint: red below the waterline band (rising to the nose cap and at the tail), a red-white-red cheat line, black anti-glare panel,
  // windows (glass), cockpit frame; yellow elsewhere
  const redTop=d=>d<1.0?-0.2+d*0.2:d<3?lerp(0.0,-0.6,(d-1)/2):d<15?-0.62:lerp(-0.62,-0.1,(d-15)/4.8);
  const lineY=d=>d<0.6?-0.05:d<3?lerp(0.05,0.5,(d-0.6)/2.4):d<15.5?0.5+(d-3)*0.006:lerp(0.575,1.45,clamp((d-15.5)/3.2,0,1));
  const WSs=[[1.62,2.95,0.98,1.6]];// windscreen: d0,d1,y0,y1 (sloping)
  const winAt=(d,y,z)=>{if(d>2.05&&d<2.95&&y>0.98+(d-2.05)*0.1&&y<topY(d)-0.12&&Math.abs(z)>0.08)return true;/* windscreen: three panes */
    if(d>2.95&&d<3.75&&y>1.0&&y<1.48)return true;/* side windows of the cockpit */
    for(const dc of [6.0,8.6,12.2])if(Math.hypot(d-dc,(y-0.95)*1.2)<0.17)return true;/* round cabin windows */return false;};
  const paint=(d,u)=>{const p=H(d,u),y=p[1],z=p[2];if(winAt(d,y,z))return null;
    if(d>1.95&&d<3.85&&y>0.92&&y<topY(d)-0.05&&!(d>2.95&&d<3.75&&y>1.0&&y<1.48)&&(d<2.95||y<1.54))return[BK,PAINT];// window frames, black
    if(d<2.1&&y>lineY(d)+0.12&&d>0.25)return[BK,PAINT];// the anti-glare panel ahead of the windscreen
    const L=lineY(d);if(y>L&&y<L+0.07)return[RD,PAINT];if(y>=L+0.07&&y<L+0.14)return[WH,PAINT];if(y>=L+0.14&&y<L+0.2)return[RD,PAINT];
    if(y<redTop(d))return[RD,PAINT];
    if([4.8,5.95].some(q=>Math.abs(d-q)<0.012)&&y>-0.3&&y<1.35&&z>0)return[YLd,PAINT];// the cabin door
    if(Math.abs(d-9.27)<0.03&&y<-1.8)return[RDd,PAINT];// the step
    return[YL,PAINT];};
  const body=vmesh(),ds=[];for(let d=0;d<19.8;d+=d<3.8?0.05:d>14?0.1:0.12)ds.push(+d.toFixed(3));ds.push(19.8,9.27,9.33,4.79,4.81,5.94,5.96);const DS=[...new Set(ds)].sort((a,b)=>a-b),US=range(0,1,96);
  surf(body,(d,u)=>H(d,u),DS,US,paint,{ev:1e-4,eu:1e-3});
  const glass=vmesh();surf(glass,(d,u)=>H(d,u,0.01),DS.filter(d=>d>1.9&&d<12.5),US,(d,u)=>{const p=H(d,u);return winAt(d,p[1],p[2])?[GLs,GLASS]:null;},{ev:1e-4,eu:1e-3});
  // inside: a dark lining behind the windows, the floor, panel, glare shield, seats
  surf(body,(d,u)=>H(d,u,0.06),DS.filter(d=>d>1.6&&d<4.4),US,(d,u)=>{const p=H(d,u);return winAt(d,p[1],p[2])?null:[INT,INTM];},{ev:1e-4,eu:1e-3,flip:true});
  box(body,[X(3.6),0.35,0],[1.3,0.03,1.1],INT,INTM);box(body,[X(2.25),0.82,0],[0.12,0.28,0.95],[0.08,0.08,0.09],MATTE);box(body,[X(2.2),1.1,0],[0.25,0.03,0.95],[0.06,0.06,0.07],MATTE);
  for(const z of [-0.45,0.45]){box(body,[X(3.45),0.6,z],[0.25,0.06,0.24],[0.25,0.25,0.27],INTM);box(body,[X(3.75),0.95,z],[0.05,0.38,0.24],[0.25,0.25,0.27],INTM);}
  // the end of the tail cone
  {const d=19.8,c0=V(body,[X(d)-0.01,(keelY(d)+topY(d))/2,0],[-1,0,0],YL,PAINT);for(let k=0;k<48;k++){const a=H(d,k/48),b=H(d,(k+1)/48);body.i.push(c0,V(body,b,[-1,0,0],YL,PAINT),V(body,a,[-1,0,0],YL,PAINT));}}
  // the nose cap (a small red bumper at the bow) and the bow's towing eye
  ball(body,[X(0.06),-0.45,0],0.2,[0.8,1.1,0.9],RD,PAINT,12);
  // the scoop probes (folded flush; deployed ones are their own part) and the drop doors' outlines
  for(const sd of [-1,1])box(body,[X(9.6),-2.42,sd*0.55],[0.35,0.03,0.12],RDd,PAINT);
  for(const sd of [-1,1])box(body,[X(7.3),-2.62,sd*0.4],[1.1,0.01,0.36],RDd,PAINT);
  // ================================================================ the wing on its fairing, nacelles, floats
  const wLE=1.55,wTE=-2.25,wY=1.98,tipZ=14.3;
  const wingT=(z)=>{const a=Math.abs(z);return lerp(0.46,0.28,clamp((a-1.5)/12.8,0,1));};
  const wingPaint=(x,z,top)=>{const a=Math.abs(z);if(a>12.0){const bands=[12.25,12.95,13.65];if(bands.some(b=>Math.abs(a-b)<0.06))return[BK,PAINT];return[RD,PAINT];}return[YL,PAINT];};
  const chordAt=z=>[wLE-(Math.abs(z)>12?(Math.abs(z)-12)*0.0:0),wTE];
  // upper and lower skins: an airfoil-ish lens (thickness peak at 30 %)
  for(const top of [1,-1])surf(body,(u,z)=>{const xs=lerp(wLE,wTE,u),t=wingT(z),th=t*(top>0?1:0.55)*Math.sin(Math.PI*Math.pow(clamp(u,0,1),0.75));return[xs,wY+top*th*0.5+(top>0?0.05:0),z];},range(0,1,16),range(-tipZ,tipZ,96),(u,z)=>wingPaint(lerp(wLE,wTE,u),z,top),{flip:top<0});
  // wingtip caps
  for(const sd of [-1,1])surf(body,(u,v)=>{const xs=lerp(wLE,wTE,u),t=wingT(tipZ);return[xs,wY+0.05+lerp(-0.55,1,v)*t*0.5*Math.sin(Math.PI*Math.pow(clamp(u,0,1),0.75)),sd*tipZ];},range(0,1,12),[0,1],()=>[RD,PAINT],{flip:sd<0});
  // the raised centre section that joins the wing to the hull (photo 3)
  {const f=(u,v)=>{const x=lerp(wLE+0.2,wTE-0.4,u),z=(v-0.5)*2.4,y0=topY(NX-x)-0.1;return[x,lerp(y0,wY,1)+0.02*Math.sin(Math.PI*u)-0.0*z,z*(0.85+0.15*Math.sin(Math.PI*u))];};
    for(const sd of [-1,1])surf(body,(u,v)=>{const x=lerp(wLE+0.3,wTE-0.6,u),z=sd*1.15*(0.8+0.2*Math.sin(Math.PI*u)),y0=topY(NX-x)-0.15;return[x,lerp(y0,wY+0.02,v),z];},range(0,1,14),range(0,1,4),()=>[YL,PAINT],{flip:sd<0});}
  // nacelles on top of the wing: long, round at the front, tapering back; an intake under the spinner, exhausts on the sides
  const NZ=4.6;for(const sd of [-1,1]){const zc=sd*NZ,nr=mono([[4.95,0.36],[4.7,0.55],[3.9,0.66],[1.0,0.66],[-1.5,0.56],[-3.6,0.32],[-4.6,0.08]]),ny=mono([[4.95,2.3],[3.0,2.3],[0.0,2.28],[-2.5,2.32],[-4.6,2.45]]);
    surf(body,(x,a)=>{const r=nr(x),y=ny(x),c=Math.cos(a),s=Math.sin(a);return[x,y+s*r*(s<0?1.25:1),zc+c*r*0.92];},range(-4.6,4.95,40),range(0,Math.PI*2,24),()=>[YL,PAINT],{eu:1e-3});
    box(body,[4.2,1.62,zc],[0.35,0.18,0.28],BK,MATTE);// the intake under the spinner (dark)
    for(const s2 of [-1,1])tube(body,[1.2,2.15,zc+s2*0.64],[0.4,2.05,zc+s2*0.7],0.13,0.15,10,BK,MATTE,true);// exhausts
    box(body,[4.4,2.98,zc],[0.05,0.04,0.4],[0.9,0.9,0.88],PAINT);}
  // wingtip floats on two pylons each (red below, yellow above)
  const FZ=11.3;for(const sd of [-1,1]){const zc=sd*FZ,fl=mono([[1.7,0.02],[1.3,0.22],[0.6,0.36],[-1.0,0.36],[-1.9,0.24],[-2.4,0.02]]);
    surf(body,(x,a)=>{const r=fl(x),c=Math.cos(a),s=Math.sin(a);return[x,-0.32+s*r*(s<0?1.0:0.8),zc+c*r*0.85];},range(-2.4,1.7,24),range(0,Math.PI*2,20),(x,a)=>Math.sin(a)<0.15?[RD,PAINT]:[YL,PAINT],{eu:1e-3});
    for(const x of [0.7,-1.3])surf(body,(u,a)=>[x+Math.cos(a)*0.3,lerp(0.0,wY-0.2,u),zc+Math.sin(a)*0.06],range(0,1,3),range(0,Math.PI*2,10),()=>[YL,PAINT]);}
  // ================================================================ the tail: the tall fin with its red top and black bands, tailplane with finlets
  const finP=[[-6.4,1.4],[-9.2,6.65],[-11.15,6.65],[-11.6,1.0],[-9.0,1.15]],finPaint=(x,y)=>y>5.55?((Math.abs(y-5.85)<0.05||Math.abs(y-6.3)<0.05)?[BK,PAINT]:[RD,PAINT]):[YL,PAINT];
  slab(body,finP.map(([x,y])=>[x,y]),0.16,finPaint);
  const tpY=4.15,tpLE=-8.6,tpTE=-10.9,tpZ=5.48;surf(body,(u,z)=>{const t=0.22*Math.sin(Math.PI*Math.pow(clamp(u,0,1),0.75));return[lerp(tpLE+Math.abs(z)*0.04,tpTE,u),tpY+t*0.5,z];},range(0,1,10),range(-tpZ,tpZ,40),(u,z)=>Math.abs(z)>4.5?[RD,PAINT]:[YL,PAINT]);
  surf(body,(u,z)=>{const t=0.22*Math.sin(Math.PI*Math.pow(clamp(u,0,1),0.75));return[lerp(tpLE+Math.abs(z)*0.04,tpTE,u),tpY-t*0.3,z];},range(0,1,10),range(-tpZ,tpZ,40),(u,z)=>Math.abs(z)>4.5?[RD,PAINT]:[YL,PAINT],{flip:true});
  for(const sd of [-1,1])slab(body,[[-8.75,tpY-0.85],[-9.3,tpY+0.95],[-10.6,tpY+0.95],[-10.6,tpY-0.85]],0.05,()=>[YL,PAINT],sd*2.25);// finlets
  // ================================================================ markings: 245 on the bow, Québec and its flag, C-GQBG under the right wing, 245 under the left
  const letters=(text,font,W,Hh,org,ua,va,nrmv,col)=>{if(typeof document==='undefined')return;const cv=document.createElement('canvas'),gx=cv.getContext('2d');cv.width=W;cv.height=Hh;gx.fillStyle='#000';gx.fillRect(0,0,W,Hh);
    gx.font=font;gx.textBaseline='middle';gx.fillStyle='#f00';gx.fillText(text,2,Hh/2+1);const dd=gx.getImageData(0,0,W,Hh).data;
    for(let y=0;y<Hh;y++){let run=-1;for(let x=0;x<=W;x++){const on=x<W&&dd[(y*W+x)*4]>110;if(on&&run<0)run=x;if(!on&&run>=0){const P=(a,b)=>add(org,add(mul(ua,a/W),mul(va,b/Hh)));quad(body,P(run,y),P(x,y),P(x,y+1),P(run,y+1),nrmv,col,PAINT);run=-1;}}}};
  for(const sd of [-1,1]){const d0=sd<0?1.6:2.8,dl=1.2,y0=0.05,ht=0.45,Z=(d,y)=>sd*(sideZ(d,y)+0.012);
    // letters on the hull side follow its curve: one quad strip per row, x along d
    if(typeof document!=='undefined'){const cv=document.createElement('canvas'),gx=cv.getContext('2d'),W=120,Hh=50;cv.width=W;cv.height=Hh;gx.fillStyle='#000';gx.fillRect(0,0,W,Hh);gx.font='bold 46px Arial';gx.textBaseline='middle';gx.fillStyle='#f00';gx.fillText('245',4,Hh/2+2);const dd=gx.getImageData(0,0,W,Hh).data;
      for(let y=0;y<Hh;y++){let run=-1;for(let x=0;x<=W;x++){const on=x<W&&dd[(y*W+x)*4]>110;if(on&&run<0)run=x;if(!on&&run>=0){const fd=a=>sd<0?1.35+(a/W)*1.3:2.65-(a/W)*1.3,yy=b=>0.42-b/Hh*0.55,P=(a,b)=>[X(fd(a)),yy(b),Z(fd(a),yy(b))];quad(body,P(run,y),P(x,y),P(x,y+1),P(run,y+1),[0,0,sd],BK,PAINT);run=-1;}}}
      const c2=document.createElement('canvas'),g2=c2.getContext('2d'),W2=150,H2=32;c2.width=W2;c2.height=H2;g2.fillStyle='#000';g2.fillRect(0,0,W2,H2);g2.font='italic 28px Georgia';g2.textBaseline='middle';g2.fillStyle='#f00';g2.fillText('Québec',2,H2/2+1);const d2=g2.getImageData(0,0,W2,H2).data;
      for(let y=0;y<H2;y++){let run=-1;for(let x=0;x<=W2;x++){const on=x<W2&&d2[(y*W2+x)*4]>110;if(on&&run<0)run=x;if(!on&&run>=0){const fd=a=>sd<0?6.3+(a/W2)*1.1:7.4-(a/W2)*1.1,yy=b=>0.25-b/H2*0.26,P=(a,b)=>[X(fd(a)),yy(b),Z(fd(a),yy(b))];quad(body,P(run,y),P(x,y),P(x,y+1),P(run,y+1),[0,0,sd],BK,PAINT);run=-1;}}}}
    // the Québec flag: blue with a white cross and four white lilies (squares at this size)
    const fq=sd<0?7.6:6.0,P=(d,y)=>[X(d),y,Z(d,y)+sd*0.002];quad(body,P(fq,0.3),P(fq+0.32,0.3),P(fq+0.32,0.08),P(fq,0.08),[0,0,sd],[0.05,0.2,0.62],PAINT);
    quad(body,[X(fq+0.14),0.3,Z(fq,0.2)+sd*0.004],[X(fq+0.18),0.3,Z(fq,0.2)+sd*0.004],[X(fq+0.18),0.08,Z(fq,0.2)+sd*0.004],[X(fq+0.14),0.08,Z(fq,0.2)+sd*0.004],[0,0,sd],WH,PAINT);
    quad(body,[X(fq),0.21,Z(fq,0.2)+sd*0.004],[X(fq+0.32),0.21,Z(fq,0.2)+sd*0.004],[X(fq+0.32),0.17,Z(fq,0.2)+sd*0.004],[X(fq),0.17,Z(fq,0.2)+sd*0.004],[0,0,sd],WH,PAINT);}
  letters('C-GQBG','bold 40px Arial',200,48,[0.9,wY-0.18,3.2],[0,0,8.2],[-1.8,0,0],[0,-1,0],BK);letters('245','bold 44px Arial',100,48,[0.9,wY-0.18,-11.2],[0,0,5],[-1.8,0,0],[0,-1,0],BK);
  // antennas, a pitot, the beacon base
  tube(body,[X(6.5),1.66,0],[X(6.9),2.2,0],0.02,0.015,5,BK,MATTE,true);slab(body,[[X(13),1.6],[X(12.6),1.6],[X(12.8),2.15],[X(13.0),2.15]],0.015,()=>[BK,MATTE]);
  tube(body,[X(1.0),0.6,0.9],[X(0.3),0.62,1.0],0.015,0.01,5,BK,MATTE);
  // ================================================================ crew (pilot hidden in the cockpit view)
  const person=(M,x,y,z)=>{box(M,[x,y,z],[0.14,0.24,0.19],SUIT,MATTE);ball(M,[x+0.02,y+0.4,z],0.13,[1,1.1,1],SKIN,0,10);box(M,[x+0.02,y+0.5,z],[0.14,0.05,0.14],[0.15,0.15,0.17],MATTE);};
  const pilot=vmesh();person(pilot,X(3.6),0.95,-0.45);person(body,X(3.6),0.95,0.45);
  // ================================================================ moving parts: propellers (4 blades), gear, probes, control surfaces
  const prop=vmesh();ball(prop,[0.05,0,0],0.42,[1.5,1,1],[0.9,0.9,0.92],CHROME,16);
  for(let k=0;k<4;k++){const a=k*Math.PI/2+0.3,c=Math.cos(a),s=Math.sin(a),bl=(r0,r1,w0,w1,col)=>{const P=[[0.03,c*r0-s*w0,s*r0+c*w0],[0.03,c*r1-s*w1,s*r1+c*w1],[-0.03,c*r1+s*w1,s*r1-c*w1],[-0.03,c*r0+s*w0,s*r0-c*w0]];quad(prop,P[0],P[1],P[2],P[3],[1,0,0],col,MATTE);quad(prop,P[3],P[2],P[1],P[0],[-1,0,0],col,MATTE);};
    bl(0.3,1.75,0.16,0.12,[0.08,0.08,0.09]);bl(1.75,2.0,0.12,0.09,[0.92,0.92,0.9]);}
  const disc=vmesh();surf(disc,(r,a)=>[0,Math.cos(a)*r,Math.sin(a)*r],[0.45,2.0],range(0,Math.PI*2,40),()=>[[0.3,0.31,0.33],12]);
  const wheel=(M,c,R0,w)=>{surf(M,(a,b)=>{const r=w/2;return[c[0]+Math.cos(a)*(R0-r+r*Math.cos(b)),c[1]+Math.sin(a)*(R0-r+r*Math.cos(b)),c[2]+r*Math.sin(b)];},range(0,Math.PI*2,22),range(0,Math.PI*2,8),()=>[TY,MATTE],{ev:1e-3});
    for(const s2 of [-1,1])surf(M,(r,a)=>[c[0]+Math.cos(a)*r,c[1]+Math.sin(a)*r,c[2]+s2*w*0.42],[0.02,R0-w*0.45],range(0,Math.PI*2,14),()=>[LG,CHROME]);};
  // gear meshes have their hinge at the origin
  const noseG=vmesh();tube(noseG,[0,0,0],[-0.25,-0.62,0],0.07,0.06,10,LG,CHROME,true);tube(noseG,[-0.25,-0.62,-0.3],[-0.25,-0.62,0.3],0.035,0.035,6,LG,CHROME);for(const s2 of [-1,1])wheel(noseG,[-0.25,-0.62,s2*0.24],0.32,0.18);
  const mainG=sd=>{const M=vmesh(),wc=[0,-0.95,sd*0.28];tube(M,[0,0,0],[0,-0.95,sd*0.12],0.1,0.09,10,LG,CHROME,true);tube(M,[0.6,-0.1,-sd*0.1],[0.02,-0.8,sd*0.1],0.04,0.04,6,LG,CHROME);wheel(M,wc,0.45,0.3);return M;};
  const probe=vmesh();box(probe,[0,-0.3,0],[0.12,0.32,0.06],RDd,PAINT);box(probe,[-0.1,-0.6,0],[0.2,0.04,0.08],GR,CHROME);
  const ctl=(poly,th,col,z0)=>{const M=vmesh();slab(M,poly,th,()=>[col,PAINT],z0);return M;};
  const rud=vmesh();slab(rud,[[0,0],[0,5.2],[-0.75,5.2],[-0.9,0.0]],0.08,(x,y)=>y>4.35?((Math.abs(y-4.6)<0.05||Math.abs(y-5.05)<0.05)?[BK,PAINT]:[RD,PAINT]):[YL,PAINT]);
  const elev=vmesh();surf(elev,(u,z)=>[lerp(0,-0.7,u),0.08*(1-u),z],range(0,1,3),range(-tpZ,tpZ,24),(u,z)=>Math.abs(z)>4.5?[RD,PAINT]:[YL,PAINT]);surf(elev,(u,z)=>[lerp(0,-0.7,u),-0.06*(1-u),z],range(0,1,3),range(-tpZ,tpZ,24),(u,z)=>Math.abs(z)>4.5?[RD,PAINT]:[YL,PAINT],{flip:true});
  const ail=sd=>{const M=vmesh();for(const top of [1,-1])surf(M,(u,z)=>[lerp(0,-0.75,u),top*0.06*(1-u),z],range(0,1,3),range(sd*8.5,sd*13.2,14),(u,z)=>Math.abs(z)>12?[RD,PAINT]:[YL,PAINT],{flip:top<0});return M;};
  const parts={rud:{M:rud,o:[-10.85,1.4,0],ax:[0,1,0]},elev:{M:elev,o:[tpTE+0.02,tpY,0],ax:[0,0,1]},ailL:{M:ail(-1),o:[wTE+0.02,wY+0.02,0],ax:[0,0,1]},ailR:{M:ail(1),o:[wTE+0.02,wY+0.02,0],ax:[0,0,1]}};
  const list=[['body',body],['glass',glass],['pilot',pilot],['prop',prop],['disc',disc],['noseG',noseG],['mainL',mainG(-1)],['mainR',mainG(1)],['probe',probe],['rud',rud],['elev',elev],['ailL',parts.ailL.M],['ailR',parts.ailR.M]];
  list.forEach(([n],i)=>{CL_PARTS[n]={i,...(parts[n]?{o:parts[n].o,ax:parts[n].ax}:{})};});return list.map(l=>l[1]);}

// ===================================================================
// drawing, and the water tanks: scooping (automatic while skimming at 100–180 km/h on the hull) and dropping (the Drop button)
// ===================================================================
const Canadair={
  draw(pl,p){if(!R.clMesh)R.clMesh=canadairMeshes().map(m=>R.uploadVeh(m));const M=R.clMesh,PP=CL_PARTS,K=PLC,dm=(n,mat)=>{const m=M[PP[n].i];if(!m)return;gl.uniformMatrix4fv(p.u('uModel'),false,mat);gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,0);Stats.draws++;Stats.tris+=m.count/3;};
    gl.uniform1f(p.u('uDist'),0);const inC=pl.cam==='cockpit';if(inC)gl.uniform2f(p.u('uOcc'),K.eye[1]-0.05,-(10+K.eye[0]+0.9));dm('body',pl.mat());if(inC)gl.uniform2f(p.u('uOcc'),0,0);
    if(!inC){dm('pilot',pl.mat());dm('glass',pl.mat());}const c=pl.ctl,r=pl.rpm();
    for(const [i,o] of K.props.entries())dm('prop',pl.mat(o,Q.axis([1,0,0],(i?1:-1)*pl.prop)));
    // gear: the nose leg swings forward-up into the bow, the main legs up into the hull sides
    const g=1-pl.gearPos;dm('noseG',pl.mat(K.noseHinge,Q.axis([0,0,1],g*1.9)));for(const sd of [-1,1])dm(sd<0?'mainL':'mainR',pl.mat([K.mainHinge[0],K.mainHinge[1],sd*K.mainHinge[2]],Q.axis([1,0,0],sd*g*1.6)));
    // the probes come down while scooping
    const pr=pl.probe||0;if(pr>0.02)for(const sd of [-1,1])dm('probe',pl.mat([K.probe[0],K.probe[1]+0.3*(1-pr),sd*K.probe[2]]));
    const hg=(n,a)=>{const q=PP[n];dm(n,pl.mat(q.o,Q.axis(q.ax,a)));};hg('elev',-c.pitch*0.3);hg('rud',c.yaw*0.35);hg('ailL',-c.roll*0.35);hg('ailR',c.roll*0.35);
    pl.drawNav(p);const da=clamp((r-500)/1400,0,1)*0.38;if(da>0.01){gl.uniform2f(p.u('uOcc'),da,0);for(const o of K.props)dm('disc',pl.mat(o));gl.uniform2f(p.u('uOcc'),0,0);}},
  // called each step from Plane.update for the CL-415
  update(pl,dt){const s=pl.st,K=PLC;if(!s||pl.crashed)return;pl.waterKg=pl.waterKg||0;const V=pl.V||0,skim=pl.onW>0&&V>27&&V<50&&pl.gearPos<0.05;
    pl.probe=clamp((pl.probe||0)+(skim&&pl.waterKg<K.water?dt*2:-dt*1.5),0,1);
    if(skim&&pl.waterKg<K.water){const was=pl.waterKg;pl.waterKg=Math.min(K.water,pl.waterKg+K.water/12*dt);if(was<K.water&&pl.waterKg>=K.water)UI.toast('Tanks full: 6 137 L. Lift off and fly to the fire');
      // the scooping plume: water thrown up and back behind the probes
      if(P.smoke!==0)for(let k=0;k<3;k++){const o=Q.rot(s.q,[K.probe[0]-0.8,K.probe[1],(Math.random()-0.5)*1.4]);Particles.spawn(s.p[0]+o[0],s.p[1]+o[1],s.p[2]+o[2],s.v[0]*0.5+(Math.random()-0.5)*3,2+Math.random()*3,s.v[2]*0.5+(Math.random()-0.5)*3,1.4,0.6,3.2,3);}}
    else if(pl.onW>0&&V>12&&V<=27&&pl.waterKg<K.water&&!pl._slow){pl._slow=true;UI.toast('Scoop at 100–180 km/h with the hull on the water (wheels up)');}
    if(V>27)pl._slow=false;
    // dropping: the tanks empty in 1.6 s in a long white curtain; the fires below are hit
    if(pl.dropT>0){const out=Math.min(pl.waterKg,K.water/1.6*dt);pl.waterKg-=out;pl.dropT-=dt;
      if(P.smoke!==0)for(let k=0;k<8;k++){const o=Q.rot(s.q,[1.5-Math.random()*4,-2.7,(Math.random()-0.5)*1.6]);Particles.spawn(s.p[0]+o[0],s.p[1]+o[1],s.p[2]+o[2],s.v[0]*0.75+(Math.random()-0.5)*4,-3-Math.random()*3,s.v[2]*0.75+(Math.random()-0.5)*4,3.5+Math.random()*1.5,1.2,6.5,6);}
      Fires.splash(s.p,s.v,out,dt);if(pl.waterKg<=0||pl.dropT<=0){pl.dropT=0;}}},
  drop(pl){if(!pl.waterKg||pl.waterKg<50){UI.toast('The tanks are empty: scoop water by skimming a lake or the sea at 100–180 km/h');return;}if(pl.onG){UI.toast('Not on the ground');return;}pl.dropT=1.7;Sfx.clunk&&Sfx.clunk();}};
