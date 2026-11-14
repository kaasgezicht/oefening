'use strict';
// ===== roadveh.js — buses and lorries up close (4.16.0): detailed models (the Opel Blitz 3.6 lorry and a 1930s double-decker after the user's
// photos, and the small bus), drawn one by one with their own matrices; near the camera they get suspension (the body pitches, rolls and
// bounces on its springs over bumps, under braking and through corners) and turning, steering wheels. Tap one to follow it with the camera,
// change its stops, see what it earned, or drive it yourself (touch joystick or game controller).
// Model frame: x forward, y up, z right; the origin on the ground halfway between the axles. Drawn at the road scale RV_SCALE.
const RV_SCALE=0.75;
const RV={// per type: wheelbase axles (x), tracks, wheel radius, which part list
  blitz:{name:'Opel Blitz',axF:1.8,axR:-1.8,trF:0.83,trR:[0.7,0.97],r:0.47,len:5.9,cap:20,price:30000,mass:1},
  bus:{name:'Bus',axF:2.3,axR:-2.3,trF:0.95,trR:[0.95],r:0.48,len:8.6,cap:30,price:35000,mass:1.1},
  dd:{name:'Double-decker',axF:2.6,axR:-2.4,trF:1.0,trR:[1.0],r:0.52,len:9.2,cap:60,price:55000,mass:1.4}};
const RVMesh=(()=>{
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],
    crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],nrm=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l];},lerp=(a,b,t)=>a+(b-a)*t;
  const V=(M,p,n,c,m)=>{M.v.push(p[0],p[1],p[2],n[0],n[1],n[2],c[0],c[1],c[2],0,0,0,1,m);return M.n++;};
  const range=(a,b,n)=>{const r=[];for(let i=0;i<=n;i++)r.push(a+(b-a)*i/n);return r;};
  // grid surface with smooth normals (central differences), a colour/material per quad from paint(u,v) (null: left out)
  const surf=(M,f,us,vs,paint,o)=>{o=o||{};const nu=us.length,nv=vs.length,P=[],N=[],eu=o.eu||1e-4,ev=o.ev||1e-4;
    for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const u=us[i],v=vs[j],p=f(u,v);let du=sub(f(u+eu,v),f(u-eu,v)),dv=sub(f(u,v+ev),f(u,v-ev));
      if(Math.hypot(...du)<1e-9)du=sub(f(u+eu*50,v),f(u-eu*50,v));if(Math.hypot(...dv)<1e-9)dv=sub(f(u,v+ev*50),f(u,v-ev*50));P.push(p);N.push(nrm(crs(du,dv)));}
    for(let i=0;i+1<nu;i++)for(let j=0;j+1<nv;j++){const pc=paint((us[i]+us[i+1])/2,(vs[j]+vs[j+1])/2);if(!pc)continue;const k=[i*nv+j,(i+1)*nv+j,(i+1)*nv+j+1,i*nv+j+1],ix=k.map(q=>V(M,P[q],N[q],pc[0],pc[1]));M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);}};
  const quad=(M,a,b,c,d,col,mat)=>{const n=nrm(crs(sub(b,a),sub(d,a)));const ix=[a,b,c,d].map(p=>V(M,p,n,col,mat));M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);};
  const tube=(M,a,b,r0,r1,n,col,mat,cap)=>{const ax=nrm(sub(b,a)),h=Math.abs(ax[1])<0.9?[0,1,0]:[1,0,0],u=nrm(crs(ax,h)),w=crs(ax,u);
    surf(M,(s,t)=>add(add(a,mul(sub(b,a),s)),add(mul(u,Math.cos(t)*lerp(r0,r1,s)),mul(w,Math.sin(t)*lerp(r0,r1,s)))),[0,1],range(0,Math.PI*2,n),()=>[col,mat]);
    if(cap)for(const [p,r,sg] of [[a,r0,-1],[b,r1,1]]){const c0=V(M,p,mul(ax,sg),col,mat);for(let k=0;k<n;k++){const t0=k/n*Math.PI*2,t1=(k+1)/n*Math.PI*2;M.i.push(c0,V(M,add(p,add(mul(u,Math.cos(t0)*r),mul(w,Math.sin(t0)*r))),mul(ax,sg),col,mat),V(M,add(p,add(mul(u,Math.cos(t1)*r),mul(w,Math.sin(t1)*r))),mul(ax,sg),col,mat));}}};
  // a box with rounded edges and corners (superquadric): centre c, half sizes h, roundness e (small = boxier), optional paint(p) for a colour per quad
  const sq=(c,h,e)=>(u,v)=>{const pw=(x,k)=>Math.sign(x)*Math.pow(Math.abs(x),k),cv=Math.cos(v),sv=Math.sin(v),cu=Math.cos(u),su=Math.sin(u);return[c[0]+h[0]*pw(cv,e)*pw(cu,e),c[1]+h[1]*pw(sv,e),c[2]+h[2]*pw(cv,e)*pw(su,e)];};
  // parameters spaced evenly along the surface (a strongly rounded box bunches its samples at the faces' edges otherwise)
  const arc=(g,a,b,n)=>{const K=1500,P=[],L=[0];for(let i=0;i<=K;i++){const t=a+(b-a)*i/K;P.push([t,g(t)]);if(i)L.push(L[i-1]+Math.hypot(P[i][1][0]-P[i-1][1][0],P[i][1][1]-P[i-1][1][1]));}
    const out=[a];let j=0;for(let k=1;k<n;k++){const tl=L[K]*k/n;while(L[j+1]<tl)j++;const f=(tl-L[j])/Math.max(1e-9,L[j+1]-L[j]);out.push(P[j][0]+(P[j+1][0]-P[j][0])*f);}out.push(b);return out;};
  const pw2=(x,k)=>Math.sign(x)*Math.pow(Math.abs(x),k);
  const sqU=(h,e,n)=>arc(u=>[h[0]*pw2(Math.cos(u),e),h[2]*pw2(Math.sin(u),e)],0,Math.PI*2,n),sqV=(h,e,n)=>arc(v=>[Math.max(h[0],h[2])*pw2(Math.cos(v),e),h[1]*pw2(Math.sin(v),e)],-Math.PI/2,Math.PI/2,n);
  const rbox=(M,c,h,e,col,mat,paint,n)=>{n=n||24;const f=sq(c,h,e);surf(M,f,sqU(h,e,n),sqV(h,e,Math.ceil(n/2)),paint?(u,v)=>paint(f(u,v)):()=>[col,mat],{eu:2e-3,ev:2e-3});};
  const box=(M,c,h,col,mat)=>{const [x,y,z]=c,[a,b,d]=h,P=(i,j,k)=>[x+i*a,y+j*b,z+k*d];for(const [n,q] of [[[1,0,0],[P(1,-1,-1),P(1,1,-1),P(1,1,1),P(1,-1,1)]],[[-1,0,0],[P(-1,-1,1),P(-1,1,1),P(-1,1,-1),P(-1,-1,-1)]],[[0,1,0],[P(-1,1,-1),P(-1,1,1),P(1,1,1),P(1,1,-1)]],[[0,-1,0],[P(-1,-1,1),P(-1,-1,-1),P(1,-1,-1),P(1,-1,1)]],[[0,0,1],[P(-1,-1,1),P(1,-1,1),P(1,1,1),P(-1,1,1)]],[[0,0,-1],[P(1,-1,-1),P(-1,-1,-1),P(-1,1,-1),P(1,1,-1)]]]){const ix=q.map(p=>V(M,p,n,col,mat));M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);}};
  const ball=(M,c,r,s,col,mat,n)=>{n=n||12;s=s||[1,1,1];surf(M,(a,b)=>[c[0]+Math.cos(b)*Math.cos(a)*r*s[0],c[1]+Math.sin(b)*r*s[1],c[2]+Math.cos(b)*Math.sin(a)*r*s[2]],range(0,Math.PI*2,n),range(-Math.PI/2,Math.PI/2,Math.ceil(n/2)),()=>[col,mat],{ev:1e-3});};
  const PAINT=11,CHROME=10,GLASS=13,MATTE=3,INT=7,BK=[0.035,0.035,0.04],TY=[0.045,0.045,0.05],CH=[0.92,0.92,0.94],DK=[0.08,0.08,0.09],GLs=[0.5,0.58,0.62],SKIN=[0.86,0.63,0.5];
  // ---------------------------------------------------------------- wheels (turn about z): tyre, painted disc with holes and nuts, hub
  const wheel=(r,disc,side,dual)=>{const M=vmesh(),w=0.12,R0=r-0.13;
    surf(M,(a,b)=>{const c=Math.cos(b),s=Math.sin(b);return[Math.cos(a)*(R0+0.13*c),Math.sin(a)*(R0+0.13*c),w*0.95*s];},range(0,Math.PI*2,30),range(0,Math.PI*2,12),()=>[TY,MATTE],{ev:1e-3});
    // tread blocks: little ribs across the tyre
    for(let k=0;k<36;k++){const a=k/36*Math.PI*2,c=Math.cos(a),s=Math.sin(a),rr=r+0.004;quad(M,[c*rr-s*0.015,s*rr+c*0.015,-w*0.7],[c*rr+s*0.015,s*rr-c*0.015,-w*0.7],[c*rr+s*0.015,s*rr-c*0.015,w*0.7],[c*rr-s*0.015,s*rr+c*0.015,w*0.7],[0.02,0.02,0.02],MATTE);}
    const sd=side,face=z=>sd*z;// the outer face is +z on the right side, -z on the left
    surf(M,(rr,a)=>[Math.cos(a)*rr,Math.sin(a)*rr,face(0.06+0.03*(1-rr/R0))],[0.06,R0*0.55,R0*0.95],range(0,Math.PI*2,28),(rr,a)=>{if(rr>R0*0.5&&rr<R0*0.8){const k=(a/(Math.PI*2)*6)%1;if(k>0.4&&k<0.6)return[DK,MATTE];}return[disc,PAINT];});
    for(let k=0;k<6;k++){const a=k/6*Math.PI*2+0.5;tube(M,[Math.cos(a)*0.11,Math.sin(a)*0.11,face(0.09)],[Math.cos(a)*0.11,Math.sin(a)*0.11,face(0.12)],0.018,0.016,6,[0.1,0.1,0.1],MATTE,true);}
    tube(M,[0,0,face(0.085)],[0,0,face(0.15)],0.075,0.055,14,dual?DK:disc,dual?MATTE:PAINT,true);
    return M;};
  // ---------------------------------------------------------------- a seated person (driver, passengers)
  const person=(M,x,y,z,shirt,cap)=>{ball(M,[x-0.04,y+0.3,z],0.17,[1.0,1.35,1.15],shirt,0,10);tube(M,[x,y+0.52,z],[x+0.01,y+0.6,z],0.045,0.045,8,SKIN,0);ball(M,[x+0.02,y+0.71,z],0.1,[1.05,1.15,0.95],SKIN,0,12);
    ball(M,[x,y+0.76,z],0.1,[1.05,0.7,1.0],cap||[0.25,0.18,0.12],0,10);if(cap)tube(M,[x+0.06,y+0.75,z],[x+0.18,y+0.74,z],0.07,0.07,10,cap,0,true);
    for(const sd of [-1,1]){tube(M,[x,y+0.42,z+sd*0.17],[x+0.28,y+0.3,z+sd*0.22],0.045,0.04,8,shirt,0);tube(M,[x+0.28,y+0.3,z+sd*0.22],[x+0.48,y+0.38,z+sd*0.16],0.04,0.035,8,shirt,0);tube(M,[x-0.02,y+0.1,z+sd*0.09],[x+0.38,y+0.12,z+sd*0.09],0.07,0.06,8,[0.18,0.18,0.22],0);}};
  // ================================================================ the Opel Blitz 3.6 (1937-1950s), from the user's two photos
  const blitz=(red)=>{const B=vmesh(),RD=red,RDd=mul(red,0.7),WD=[0.55,0.3,0.13],WD2=[0.48,0.25,0.1];
    // ---- chassis frame and running gear (black)
    for(const z of [-0.45,0.45])box(B,[-0.35,0.68,z],[2.85,0.08,0.04],BK,MATTE);for(const x of [2.35,0.6,-1.0,-2.6,-3.2])box(B,[x,0.68,0],[0.04,0.06,0.45],BK,MATTE);
    for(const x of [1.8,-1.8]){box(B,[x,0.47,0],[0.06,0.06,0.78],BK,MATTE);for(const z of [-0.45,0.45])for(let l=0;l<4;l++)box(B,[x,0.58+l*0.025,z],[0.55-l*0.1,0.011,0.035],[0.07,0.07,0.07],MATTE);}// axles, leaf springs
    ball(B,[-1.8,0.47,0],0.17,[1,1,0.8],BK,MATTE,12);tube(B,[1.6,0.55,0],[-1.6,0.5,0],0.035,0.035,8,BK,MATTE);// differential, prop shaft
    tube(B,[-0.6,0.62,0.62],[-1.3,0.62,0.62],0.2,0.2,16,BK,MATTE,true);tube(B,[0.4,0.38,-0.3],[-3.0,0.42,-0.5],0.03,0.03,6,[0.25,0.22,0.2],MATTE);// tank, exhaust
    // ---- bonnet: a loft from the cab to the grille, rounded on top, with the side louvres and a chrome strip
    const bw=x=>lerp(0.47,0.42,(x-0.6)/1.8),bt=x=>lerp(1.6,1.5,(x-0.6)/1.8);
    surf(B,(x,t)=>{const w=bw(x),top=bt(x),yb=0.78,a=t;// t: 0 = left bottom, 1 = right bottom, round over the top
      const th=a*Math.PI,cz=-Math.cos(th),sy=Math.sin(th),r=0.16;let z,y;if(sy<0.6){z=cz>0?w:-w;y=yb+(top-r-yb)*(sy/0.6);}else{const k=(th<Math.PI/2?th:Math.PI-th);z=Math.sign(cz)*(w-r+r*Math.cos(Math.max(0,Math.PI/2-k*1.6)))*1;y=top-r+r*Math.sin(Math.min(Math.PI/2,k*1.6));if(Math.abs(cz)<0.05)z=0;}
      return[x,y,z];},range(0.6,2.4,24),range(0,1,26),(x,t)=>[RD,PAINT],{ev:2e-3});
    for(const sd of [-1,1]){for(let k=0;k<14;k++){const x=1.1+k*0.07;quad(B,[x,1.12,sd*(bw(x)+0.004)],[x+0.03,1.12,sd*(bw(x)+0.004)],[x+0.03,1.42,sd*(bw(x)+0.004)],[x,1.42,sd*(bw(x)+0.004)],DK,MATTE);}
      quad(B,[0.62,1.47,sd*(bw(0.62)+0.006)],[2.35,1.38,sd*(bw(2.35)+0.006)],[2.35,1.4,sd*(bw(2.35)+0.006)],[0.62,1.49,sd*(bw(0.62)+0.006)],CH,CHROME);}
    tube(B,[0.62,bt(0.62)+0.003,0],[2.38,bt(2.38)+0.003,0],0.012,0.012,6,CH,CHROME);
    // ---- grille: a tall shield with a chrome surround, vertical bars and the diagonal OPEL BLITZ badge
    {const gx=2.42,gw=0.4,gy0=0.72,gy1=1.5,shape=y=>y<gy1-0.15?gw:gw*Math.sqrt(Math.max(0,1-Math.pow((y-(gy1-0.15))/0.15,2)));
      surf(B,(y,z)=>[gx-0.02,y,z*shape(y)],range(gy0,gy1,16),range(-1,1,2),()=>[DK,MATTE]);
      for(let k=-6;k<=6;k++){const z=k/6.6*gw;tube(B,[gx,gy0+0.02,z],[gx,gy1-0.06-0.12*Math.pow(Math.abs(k)/6,2),z],0.012,0.012,5,mul(RD,0.9),PAINT);}
      const fr=[];for(let k=0;k<=20;k++){const y=gy0+(gy1-gy0)*k/20;fr.push([y,shape(y)]);}for(const sd of [-1,1])for(let k=0;k<20;k++)tube(B,[gx+0.01,fr[k][0],sd*fr[k][1]],[gx+0.01,fr[k+1][0],sd*fr[k+1][1]],0.025,0.025,6,CH,CHROME);
      tube(B,[gx+0.02,1.27,-0.36],[gx+0.02,1.42,0.33],0.028,0.028,6,CH,CHROME);quad(B,[gx+0.05,1.28,-0.28],[gx+0.05,1.36,-0.28],[gx+0.05,1.43,0.2],[gx+0.05,1.35,0.2],DK,MATTE);
      ball(B,[gx-0.05,gy1+0.04,0],0.04,[1,0.6,1],CH,CHROME,8);}
    // ---- front fenders (black, sweeping down to the running boards), headlamps, indicators, bumper, marker posts
    for(const sd of [-1,1]){surf(B,(a,z)=>{const r=0.6+0.05*Math.sin(Math.max(0,a)),x=1.8+Math.cos(a)*r,y=0.47+Math.sin(a)*r,cr=0.06*(1-Math.pow(2*z-1,2));return a>Math.PI*0.92?[lerp(1.8+Math.cos(Math.PI*0.92)*0.6,0.55,(a-Math.PI*0.92)/(Math.PI*0.25)),lerp(0.47+Math.sin(Math.PI*0.92)*0.62,0.72,(a-Math.PI*0.92)/(Math.PI*0.25))+cr,sd*lerp(0.5,1.06,z)]:[x,y+cr,sd*lerp(0.5,1.06,z)];},range(-0.15,Math.PI*1.17,30),range(0,1,6),()=>[BK,PAINT],{eu:1e-3});
      box(B,[0.0,0.72,sd*0.95],[0.6,0.02,0.13],BK,MATTE);for(let k=0;k<5;k++)box(B,[0.0,0.745,sd*(0.86+k*0.04)],[0.55,0.006,0.008],[0.5,0.5,0.5],CHROME);// running board with treads
      surf(B,(a,z)=>{const x=-1.8+Math.cos(a)*0.62,y=0.47+Math.sin(a)*0.62;return[x,y,sd*lerp(0.5,1.15,z)];},range(0.25,Math.PI-0.3,12),range(0,1,2),()=>[BK,MATTE]);// rear wheel arches
      const hl=[2.22,1.16,sd*0.66];tube(B,add(hl,[-0.14,0,0]),hl,0.1,0.13,16,BK,PAINT,true);tube(B,add(hl,[0,0,0]),add(hl,[0.025,0,0]),0.13,0.13,16,CH,CHROME);surf(B,(r,a)=>[hl[0]+0.03+0.02*(1-r/0.12),hl[1]+Math.sin(a)*r,hl[2]+Math.cos(a)*r],[0,0.06,0.115],range(0,Math.PI*2,16),()=>[[1,0.97,0.88],4]);
      tube(B,[1.8,0.9,sd*0.6],[2.15,1.1,sd*0.62],0.025,0.025,6,BK,MATTE);// lamp bracket
      ball(B,[2.45,0.84,sd*0.9],0.05,[1,0.7,1.2],[1,0.45,0.05],4,8);// orange indicator
      tube(B,[2.62,0.62,sd*1.02],[2.62,1.55,sd*1.02],0.012,0.012,6,BK,MATTE,true);}// marker posts (thin black rods)
    box(B,[2.6,0.62,0],[0.06,0.09,1.05],BK,PAINT);
    // ---- cab: a rounded box; windscreen (two panes), door windows and the rear window cut out with glass; door, handle, hinges, mirror
    const cab=(u,v)=>sq([-0.15,1.48,0],[0.75,0.74,0.92],0.16)(u,v);/* the cab body down to the running boards (front panel beside the bonnet, full-height doors) */const win=p=>{const [x,y,z]=p;
      if(x>0.5&&y>1.55&&y<2.06&&Math.abs(z)<0.82&&Math.abs(z)>0.025)return'ws';if(Math.abs(z)>0.85&&y>1.55&&y<2.0&&x>-0.55&&x<0.42)return'side';if(x<-0.82&&y>1.62&&y<1.95&&Math.abs(z)<0.5)return'rear';return null;};
    const cU=sqU([0.75,0.74,0.92],0.16,64),cV=sqV([0.75,0.74,0.92],0.16,36);surf(B,cab,cU,cV,(u,v)=>{const p=cab(u,v);return win(p)?null:[RD,PAINT];},{eu:2e-3,ev:2e-3});
    surf(B,cab,cU,cV,(u,v)=>{const p=cab(u,v);return win(p)?[GLs,GLASS]:null;},{eu:2e-3,ev:2e-3});
    rbox(B,[-0.15,1.48,0],[0.72,0.71,0.89],0.16,DK,INT,p=>{if(p[1]<1.05)return[DK,MATTE];return[[0.16,0.13,0.11],INT];},28);// inside
    box(B,[-0.15,1.0,0],[0.75,0.05,0.92],BK,MATTE);// cab floor
    for(const sd of [-1,1]){const zz=sd*0.93;quad(B,[0.47,0.8,zz],[-0.62,0.8,zz],[-0.62,0.81,zz],[0.47,0.81,zz],RDd,PAINT);quad(B,[0.47,0.8,zz],[0.47,2.12,zz],[0.48,2.12,zz],[0.48,0.8,zz],RDd,PAINT);quad(B,[-0.62,0.8,zz],[-0.62,2.1,zz],[-0.63,2.1,zz],[-0.63,0.8,zz],RDd,PAINT);// door shut lines
      tube(B,[0.3,1.5,zz*1.005],[0.38,1.5,zz*1.005],0.012,0.012,6,CH,CHROME,true);for(const y of [1.2,1.85])box(B,[0.48,y,zz],[0.03,0.05,0.012],CH,CHROME);
      // window frames (chrome strip around the door glass) and the rear-view mirror on its arm
      for(const [a,b] of [[[-0.55,1.55],[0.42,1.55]],[[0.42,1.55],[0.42,2.0]],[[0.42,2.0],[-0.55,2.0]],[[-0.55,2.0],[-0.55,1.55]]])tube(B,[a[0],a[1],sd*0.935],[b[0],b[1],sd*0.935],0.012,0.012,5,CH,CHROME);
      tube(B,[0.52,1.62,sd*0.9],[0.62,1.68,sd*1.15],0.012,0.012,6,BK,MATTE);tube(B,[0.62,1.68,sd*1.15],[0.6,1.68,sd*1.17],0.09,0.09,16,BK,PAINT,true);surf(B,(r,a)=>[0.635,1.68+Math.sin(a)*r,sd*1.16+Math.cos(a)*r],[0,0.085],range(0,Math.PI*2,16),()=>[CH,CHROME]);}
    // windscreen frame and centre post; wipers
    for(const [a,b] of [[[0.55,1.55,-0.82],[0.55,1.55,0.82]],[[0.52,2.06,-0.82],[0.52,2.06,0.82]],[[0.55,1.55,0],[0.52,2.06,0]],[[0.55,1.55,-0.82],[0.52,2.06,-0.82]],[[0.55,1.55,0.82],[0.52,2.06,0.82]]])tube(B,a,b,0.018,0.018,6,RDd,PAINT);
    for(const z of [-0.45,0.4])tube(B,[0.6,2.04,z],[0.62,1.7,z+0.18],0.006,0.006,4,BK,MATTE);
    // steering wheel and seat inside; the driver sits on the left
    tube(B,[0.25,1.45,-0.45],[0.0,1.05,-0.45],0.02,0.02,6,BK,MATTE);surf(B,(a,b)=>{const R0=0.19,r=0.015;return[0.28-Math.sin(0.5)*(R0+r*Math.cos(b))*Math.sin(a)*0,1.48+(R0+r*Math.cos(b))*Math.sin(a)*Math.cos(0.5),-0.45+(R0+r*Math.cos(b))*Math.cos(a)];},range(0,Math.PI*2,20),range(0,Math.PI*2,6),()=>[BK,MATTE],{ev:1e-3});
    box(B,[-0.45,1.25,0],[0.2,0.08,0.78],[0.3,0.2,0.14],0);box(B,[-0.66,1.55,0],[0.05,0.32,0.78],[0.3,0.2,0.14],0);
    // ---- the wooden load bed: floor, headboard and drop sides of varnished planks with black stakes and hinge straps
    const bx0=-0.98,bx1=-3.32,fy=1.04,sy=1.5,hw=1.06;box(B,[(bx0+bx1)/2,fy-0.04,0],[(bx0-bx1)/2,0.04,hw],WD2,0);
    for(const [x0,x1,z0,z1,y0,y1,face] of [[bx0,bx0,-hw,hw,fy,sy+0.12,'f'],[bx1,bx1,-hw,hw,fy,sy,'b'],[bx0,bx1,-hw,-hw,fy,sy,'l'],[bx0,bx1,hw,hw,fy,sy,'r']]){
      for(let k=0;k<3;k++){const ya=lerp(y0,y1,k/3)+0.005,yb=lerp(y0,y1,(k+1)/3)-0.005,col=k%2?WD:WD2,o=face==='l'?-0.02:face==='r'?0.02:face==='f'?0.02:-0.02;
        if(face==='l'||face==='r'){box(B,[(x0+x1)/2,(ya+yb)/2,z0],[(x0-x1)/2,(yb-ya)/2,0.02],col,1);}else box(B,[x0,(ya+yb)/2,0],[0.02,(yb-ya)/2,hw],col,1);}}
    for(const sd of [-1,1]){for(const x of [-1.6,-2.4,-3.3,-1.0])box(B,[x,(fy+sy)/2,sd*(hw+0.025)],[0.025,(sy-fy)/2+0.02,0.012],BK,MATTE);for(const x of [-1.25,-2.0,-2.85])for(const y of [fy+0.08,sy-0.08])box(B,[x,y,sd*(hw+0.025)],[0.1,0.012,0.008],BK,MATTE);}
    for(const sd of [-1,1])box(B,[-3.3,0.8,sd*0.85],[0.06,0.2,0.08],BK,MATTE);// mud flaps and tail lamps
    for(const sd of [-1,1])ball(B,[-3.36,0.95,sd*0.9],0.04,[0.5,1,1],[0.7,0.05,0.05],4,8);
    person(B,-0.25,1.08,-0.45,[0.92,0.92,0.9],[0.15,0.15,0.17]);
    return B;};
  // ================================================================ buses: decks 1 (the small cream-and-red bus) or 2 (the 1930s double-decker)
  const bus=(decks)=>{const B=vmesh(),dd=decks===2;const C=dd?{low:[0.015,0.26,0.07],band:[0.98,0.8,0.28],up:[0.015,0.26,0.07],roof:[0.62,0.63,0.6],hood:[0.015,0.26,0.07]}:{low:[0.74,0.12,0.09],band:[0.93,0.87,0.7],up:[0.93,0.87,0.7],roof:[0.93,0.87,0.7],hood:[0.74,0.12,0.09]};
    const L0=dd?-4.65:-4.4,Lc=dd?1.95:2.15,W=dd?1.2:1.18,yb=0.62,y1=2.28,y2=dd?3.82:2.75,ax=dd?[2.6,-2.4]:[2.3,-2.3];
    // ---- lower deck: a rounded box with the window band cut out; frames; the gold lining
    const lowH=[(Lc-L0)/2,(y1-yb)/2,W],lU=sqU(lowH,0.12,110),lV=sqV(lowH,0.12,34),lowF=sq([(L0+Lc)/2,(yb+y1)/2,0],lowH,0.12),winL=p=>(Math.abs(p[2])>W*0.95&&p[1]>1.35&&p[1]<2.08&&p[0]>L0+0.4&&p[0]<Lc-0.45&&((p[0]-L0-0.4)%0.82)>0.1)||(p[0]>Lc-0.06&&p[1]>1.68&&p[1]<2.12&&Math.abs(p[2])<W*0.86&&Math.abs(p[2])>0.05);/* side windows; the driver's windscreen in two panes */
    surf(B,lowF,lU,lV,(u,v)=>{const p=lowF(u,v);if(winL(p))return null;return[p[1]>2.12?C.band:C.low,PAINT];},{eu:2e-3,ev:2e-3});
    surf(B,lowF,lU,lV,(u,v)=>winL(lowF(u,v))?[GLs,GLASS]:null,{eu:2e-3,ev:2e-3});
    rbox(B,[(L0+Lc)/2,(yb+y1)/2,0],[(Lc-L0)/2-0.04,(y1-yb)/2-0.04,W-0.04],0.12,null,null,()=>[[0.18,0.15,0.12],INT],40);
    for(const sd of [-1,1]){const z=sd*(W+0.006);for(const y of [1.32,2.11])quad(B,[L0+0.3,y,z],[Lc-0.3,y,z],[Lc-0.3,y+0.025,z],[L0+0.3,y+0.025,z],dd?C.band:[0.95,0.8,0.4],PAINT);
      for(const y of [0.98,1.02])quad(B,[L0+0.35,y,z],[Lc-0.35,y,z],[Lc-0.35,y+0.012,z],[L0+0.35,y+0.012,z],[0.95,0.75,0.3],PAINT);// gold lining
      for(let x=L0+0.4;x<Lc-0.4;x+=0.82)box(B,[x+0.05,1.71,z],[0.05,0.37,0.012],dd?C.band:C.band,PAINT);}
    if(dd){// ---- upper deck: cream window frames on green, the long yellow side board for the lettering, a silver roof with an overhang
      const upH=[(Lc-0.1-L0)/2,(y2-y1)/2,W*0.99],uU=sqU(upH,0.12,110),uV=sqV(upH,0.12,34),upF=sq([(L0+Lc-0.1)/2,(y1+y2)/2,0],upH,0.12),winU=p=>(Math.abs(p[2])>W*0.93&&p[1]>2.86&&p[1]<3.52&&p[0]>L0+0.25&&p[0]<Lc-0.3&&((p[0]-L0-0.25)%0.78)>0.08)||(p[0]>Lc-0.25&&p[1]>2.86&&p[1]<3.52&&Math.abs(p[2])<W*0.85&&Math.abs(p[2])>0.04);
      surf(B,upF,uU,uV,(u,v)=>{const p=upF(u,v);if(winU(p))return null;if(p[1]>3.62)return[C.roof,PAINT];return[p[1]>2.8?C.band:C.up,PAINT];},{eu:2e-3,ev:2e-3});
      surf(B,upF,uU,uV,(u,v)=>winU(upF(u,v))?[GLs,GLASS]:null,{eu:2e-3,ev:2e-3});
      rbox(B,[(L0+Lc-0.1)/2,(y1+y2)/2,0],[(Lc-0.1-L0)/2-0.04,(y2-y1)/2-0.04,W*0.99-0.04],0.12,null,null,()=>[[0.2,0.17,0.13],INT],40);
      rbox(B,[(L0+Lc)/2,y2+0.02,0],[(Lc-L0)/2+0.12,0.06,W+0.06],0.2,C.roof,PAINT,null,28);// roof with the overhang
      for(const sd of [-1,1]){const z=sd*(W+0.01);quad(B,[L0+1.6,2.35,z],[Lc-0.8,2.35,z],[Lc-0.8,2.75,z],[L0+1.6,2.75,z],C.band,PAINT);for(const [a,b] of [[2.37,2.39],[2.71,2.73]])quad(B,[L0+1.65,a,z*1.001],[Lc-0.85,a,z*1.001],[Lc-0.85,b,z*1.001],[L0+1.65,b,z*1.001],C.low,PAINT);}}
    else rbox(B,[(L0+Lc)/2,y2-0.12,0],[(Lc-L0)/2,0.3,W],0.3,C.roof,PAINT,null,28);
    // ---- the driver's cab front and the bonnet with radiator (a conventional front, like the photo)
    const hx0=Lc-0.05,hx1=dd?3.35:3.25,hw=x=>lerp(0.55,0.47,(x-hx0)/(hx1-hx0)),ht=x=>lerp(1.62,1.52,(x-hx0)/(hx1-hx0));
    surf(B,(x,t)=>{const w=hw(x),th=t*Math.PI,cz=-Math.cos(th),sy=Math.sin(th),r=0.14;let z,y;if(sy<0.6){z=cz>0?w:-w;y=0.8+(ht(x)-r-0.8)*(sy/0.6);}else{const k=th<Math.PI/2?th:Math.PI-th;z=Math.sign(cz)*(w-r+r*Math.cos(Math.max(0,Math.PI/2-k*1.6)));y=ht(x)-r+r*Math.sin(Math.min(Math.PI/2,k*1.6));if(Math.abs(cz)<0.05)z=0;}return[x,y,z];},range(hx0,hx1,16),range(0,1,22),()=>[C.hood,PAINT],{ev:2e-3});
    {const gx=hx1+0.03,gw=0.44;box(B,[gx-0.02,1.2,0],[0.03,0.4,gw],DK,MATTE);for(let k=-7;k<=7;k++)tube(B,[gx+0.005,0.84,k/7.5*gw],[gx+0.005,1.56,k/7.5*gw],0.01,0.01,5,CH,CHROME);
      for(const [a,b] of [[[gx+0.01,0.82,-gw],[gx+0.01,0.82,gw]],[[gx+0.01,1.6,-gw],[gx+0.01,1.6,gw]],[[gx+0.01,0.82,-gw],[gx+0.01,1.6,-gw]],[[gx+0.01,0.82,gw],[gx+0.01,1.6,gw]]])tube(B,a,b,0.03,0.03,6,CH,CHROME);
      box(B,[gx+0.25,0.6,0],[0.07,0.08,1.08],CH,CHROME);for(const sd of [-1,1])tube(B,[gx+0.25,0.6,sd*0.85],[gx+0.12,0.68,sd*0.6],0.02,0.02,6,CH,CHROME);}
    // ---- front fenders, headlamps; rear arches
    const fx=ax[0];for(const sd of [-1,1]){surf(B,(a,z)=>{const r=0.68,cr=0.05*(1-Math.pow(2*z-1,2));return a>Math.PI*0.9?[lerp(fx+Math.cos(Math.PI*0.9)*r,Lc-0.25,(a-Math.PI*0.9)/(Math.PI*0.2)),lerp(0.52+Math.sin(Math.PI*0.9)*r,0.62,(a-Math.PI*0.9)/(Math.PI*0.2))+cr,sd*lerp(0.6,1.2,z)]:[fx+Math.cos(a)*r,0.52+Math.sin(a)*r+cr,sd*lerp(0.6,1.2,z)];},range(-0.15,Math.PI*1.1,26),range(0,1,6),()=>[BK,PAINT],{eu:1e-3});
      const hl=[fx+0.45,1.2,sd*0.72];tube(B,add(hl,[-0.14,0,0]),hl,0.1,0.13,16,CH,CHROME,true);surf(B,(r,a)=>[hl[0]+0.02+0.02*(1-r/0.12),hl[1]+Math.sin(a)*r,hl[2]+Math.cos(a)*r],[0,0.06,0.115],range(0,Math.PI*2,16),()=>[[1,0.97,0.88],4]);
      surf(B,(a,z)=>{const x=ax[1]+Math.cos(a)*0.7,y=0.52+Math.sin(a)*0.7;return[x,y,sd*lerp(0.9,W+0.02,z)];},range(0.2,Math.PI-0.2,12),range(0,1,2),()=>[BK,MATTE]);
      box(B,[L0-0.02,0.95,sd*0.9],[0.02,0.06,0.06],[0.7,0.05,0.05],4);}
    // destination box over the windscreen (lower deck front), the driver at the wheel
    box(B,[Lc+0.02,dd?2.18:2.4,0],[0.02,0.08,0.5],[0.04,0.04,0.04],MATTE);
    person(B,Lc-0.55,1.0,-0.6,[0.15,0.2,0.32],[0.1,0.12,0.2]);tube(B,[Lc-0.2,1.45,-0.6],[Lc-0.45,1.05,-0.6],0.02,0.02,6,BK,MATTE);
    // a few passengers at the windows
    for(let k=0;k<(dd?7:4);k++){const kk=dd&&k>3?k-4:k,x=L0+0.9+kk*(dd&&k>3?1.6:0.95),sd=k%2?1:-1;person(B,x,dd&&k>3?2.35:0.9,sd*0.6,[[0.5,0.2,0.2],[0.2,0.3,0.5],[0.4,0.4,0.35],[0.25,0.4,0.25]][k%4]);}
    return B;};
  return {blitz,bus,wheel};})();
// lettering: text from a canvas, turned into thin quads (one per run of lit pixels in a row), lying on a side of the body.
// side: z of the face (sign = which side), x0/y0: the lower left corner as seen from that side, h: text height in metres
function rvText(M,lines,o){if(typeof document==='undefined')return;const cv=document.createElement('canvas'),g=cv.getContext('2d');const scale=o.px||48;
  let W=0;const meas=lines.map(l=>{g.font=l.font.replace('PX',scale*l.h+'px');return g.measureText(l.t).width;});W=Math.ceil(Math.max(...meas))+4;const Hs=lines.map(l=>Math.ceil(scale*l.h*1.25)),H=Hs.reduce((a,b)=>a+b,0)+4;
  cv.width=W;cv.height=H;g.fillStyle='#000';g.fillRect(0,0,W,H);g.fillStyle='#fff';g.textBaseline='top';let yy=2;lines.forEach((l,i)=>{g.font=l.font.replace('PX',scale*l.h+'px');g.textAlign='center';g.fillText(l.t,W/2,yy);yy+=Hs[i];});
  const d=g.getImageData(0,0,W,H).data,px=1/scale,sd=Math.sign(o.z);
  for(let y=0;y<H;y++){let run=-1;for(let x=0;x<=W;x++){const on=x<W&&d[(y*W+x)*4]>110;if(on&&run<0)run=x;if(!on&&run>=0){// a run of lit pixels: one quad
        const ax=(run-W/2)*px,bx=(x-W/2)*px,yt=o.y-y*px,yb2=yt-px;const X=t=>o.x+sd*t;// along the side: forward is +x seen from the right side
        const P=[[X(ax),yb2],[X(bx),yb2],[X(bx),yt],[X(ax),yt]].map(q=>[q[0],q[1],o.z]);const n=[0,0,sd];const ix=P.map(p=>{M.v.push(p[0],p[1],p[2],n[0],n[1],n[2],o.col[0],o.col[1],o.col[2],0,0,0,1,o.mat||11);return M.n++;});M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);run=-1;}}}}
// ---------------------------------------------------------------- the road vehicles in the game: drawing, suspension, selection, cameras, driving
const RoadVeh={M:null,sel:null,cam:'off',drv:null,inp:{steer:0,gas:0,brake:0},pad:{prev:[],act:false},
  type(b){return b.goods?'blitz':b.type==='dd'?'dd':'bus';},spec(b){return RV[this.type(b)];},
  gy(x,z){const T=R.world;return Math.max(R.sampleHr(T,x,z),Life.deckY?Life.deckY(x,z):-1e9);},
  // meshes are made once (after the GL context): a body per type (two reds for the lorry), wheels per type and side, and a far version
  // with the wheels merged in (one draw call)
  build(){const U=m=>R.uploadVeh(m),cat=(...ms)=>{const M=vmesh();for(const [m,off] of ms){const b=M.n;for(let k=0;k<m.n;k++){const o=k*14;M.v.push(m.v[o]+off[0],m.v[o+1]+off[1],m.v[o+2]+off[2],...m.v.slice(o+3,o+14));}for(const i of m.i)M.i.push(i+b);M.n+=m.n;}return M;};
    const W={blitz:[0.62,0.04,0.035],bus:[0.55,0.07,0.05],dd:[0.06,0.06,0.07]},out={};
    for(const ty of ['blitz','bus','dd']){const S=RV[ty],bodies=ty==='blitz'?[RVMesh.blitz([0.8,0.05,0.04]),RVMesh.blitz([0.5,0.04,0.055])]:[RVMesh.bus(ty==='dd'?2:1)];
      const wR=RVMesh.wheel(S.r,W[ty],1,false),wL=RVMesh.wheel(S.r,W[ty],-1,false),wRi=RVMesh.wheel(S.r,W[ty],-1,true),wLi=RVMesh.wheel(S.r,W[ty],1,true);
      const wp=[];for(const sd of [-1,1]){wp.push([sd<0?wL:wR,[S.axF,S.r,sd*S.trF]]);S.trR.forEach((t,i)=>wp.push([i===0&&S.trR.length>1?(sd<0?wLi:wRi):(sd<0?wL:wR),[S.axR,S.r,sd*t]]));}
      out[ty]={body:bodies.map(U),far:bodies.map(b=>U(cat([b,[0,0,0]],...wp))),wL:U(wL),wR:U(wR),wLi:U(wLi),wRi:U(wRi)};}
    this.M=out;},
  // lettering for one vehicle (town names from its route), made the first time it is seen up close
  words(b){const s=Buses.route(b)[0],v=s&&s.v||(s?Life.nearestVillage(s.x,s.z,2000):null),town=v?v.name:'Trein';const h=Math.floor((b.hash||0.5)*997);
    if(b.goods){const N=['Bakker','de Vries','Jansen','Visser','Smit','Meijer','de Boer','Mulder','Bos','Vos','Peters','Hendriks'],I='ABCDGHJKMPW';return{town,owner:`${I[h%I.length]}. ${N[h%N.length]}`,tel:`TEL. ${10+h%90}`};}return{town};},
  text(b){const M=vmesh(),w=this.words(b),gold=[0.98,0.86,0.5],cream=[0.98,0.94,0.82],ty=this.type(b);
    if(ty==='blitz'){for(const sd of [-1,1])rvText(M,[{t:w.owner,font:'italic bold PX Georgia',h:0.12},{t:'VRACHTRIJDERIJ',font:'bold PX Arial',h:0.05},{t:w.tel,font:'bold PX Arial',h:0.045},{t:w.town.toUpperCase(),font:'bold PX Arial',h:0.06}],{x:-0.06,y:1.48,z:sd*0.935,col:cream,px:120});}
    else if(ty==='dd'){for(const sd of [-1,1]){rvText(M,[{t:`${w.town.toUpperCase()} COACH COMPANY`,font:'bold PX Georgia',h:0.13}],{x:-1.1,y:1.27,z:sd*1.207,col:gold,px:90});rvText(M,[{t:`${w.town} Transit`,font:'bold PX Georgia',h:0.2}],{x:-0.6,y:2.66,z:sd*1.216,col:[0.03,0.2,0.09],px:80});}}
    else for(const sd of [-1,1])rvText(M,[{t:`${w.town.toUpperCase()} AUTOBUSDIENST`,font:'bold PX Georgia',h:0.13}],{x:-1.0,y:1.26,z:sd*1.187,col:[0.98,0.88,0.6],px:90});
    return M.n?R.uploadVeh(M):null;},
  // ---- the frame of a vehicle: chassis on the ground under its wheels, the body on its springs (heave h, pitch p, roll r)
  frame(b){const S=this.spec(b),k=RV_SCALE,h=b.rot,c=Math.cos(h),s=Math.sin(h),zx=-s,zz=c,P=(ax,tr)=>this.gy(b.x+c*ax*k+zx*tr*k,b.z+s*ax*k+zz*tr*k);
    const tr=S.trF,fl=P(S.axF,-tr),fr=P(S.axF,tr),rl=P(S.axR,-tr),rr=P(S.axR,tr),wb=(S.axF-S.axR)*k,pitch=Math.atan2((fl+fr)/2-(rl+rr)/2,wb),roll=Math.atan2((fl+rl)/2-(fr+rr)/2,2*tr*k);
    const y=(fl+fr+rl+rr)/4,q=Q.mul(Q.mul(Q.axis([0,1,0],-h),Q.axis([0,0,1],pitch)),Q.axis([1,0,0],roll)),sp=b._s||{h:0,p:0,r:0};
    const qb=Q.mul(Q.mul(q,Q.axis([0,0,1],sp.p)),Q.axis([1,0,0],sp.r)),cg=[0,1.1,0],oc=[b.x,y,b.z],a=Q.rot(q,cg),bb=Q.rot(qb,cg),hv=Q.rot(q,[0,sp.h,0]);
    const ob=[oc[0]+(a[0]-bb[0]+hv[0])*k,oc[1]+(a[1]-bb[1]+hv[1])*k,oc[2]+(a[2]-bb[2]+hv[2])*k];return{q,qb,oc,ob,k};},
  mat(q,o,k,off,extra){const qq=extra?Q.mul(q,extra):q,X=Q.rot(qq,[k,0,0]),Y=Q.rot(qq,[0,k,0]),Z=Q.rot(qq,[0,0,k]),d=off?Q.rot(q,off):[0,0,0];
    return new Float32Array([X[0],X[1],X[2],0,Y[0],Y[1],Y[2],0,Z[0],Z[1],Z[2],0,o[0]+d[0]*k,o[1]+d[1]*k,o[2]+d[2]*k,1]);},
  draw(p,pass){if(!App.T||!Buses.list.length)return;if(!this.M)this.build();const cp=Cam.pos||[0,0,0],pl=pass===1?null:Cam.planes;
    const dm=(m,mat)=>{if(!m)return;gl.uniformMatrix4fv(p.u('uModel'),false,mat);gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,0);Stats.draws++;Stats.tris+=m.count/3;};
    gl.uniform1f(p.u('uDist'),0);
    for(const b of Buses.list){const d=Math.hypot(b.x-cp[0],b.z-cp[2]);if(d>(pass===1?400:1800))continue;const S=this.spec(b),Lh=S.len*RV_SCALE/2+1;
      if(pl&&!boxVisible(pl,b.x-Lh,this.gy(b.x,b.z)-2,b.z-Lh,b.x+Lh,this.gy(b.x,b.z)+5,b.z+Lh))continue;
      const ty=this.type(b),MS=this.M[ty],vi=ty==='blitz'?((b.hash*7.3)%1<0.5?0:1):0,F=this.frame(b),k=F.k;
      if(d>140&&b!==this.sel&&b!==this.drv){dm(MS.far[vi],this.mat(F.q,F.oc,k));continue;}
      dm(MS.body[vi],this.mat(F.qb,F.ob,k));
      if(d<350){if(b._txt===undefined)b._txt=this.text(b);if(b._txt)dm(b._txt,this.mat(F.qb,F.ob,k));}
      // wheels: on the chassis (they follow the ground), turning with the distance driven; the front ones steer
      const spin=Q.axis([0,0,1],-(b._spin||0)),st=b._steer||0;
      for(const sd of [-1,1]){dm(sd<0?MS.wL:MS.wR,this.mat(F.q,F.oc,k,[S.axF,S.r,sd*S.trF],Q.mul(Q.axis([0,1,0],-st),spin)));
        S.trR.forEach((t,i)=>dm(i===0&&S.trR.length>1?(sd<0?MS.wLi:MS.wRi):(sd<0?MS.wL:MS.wR),this.mat(F.q,F.oc,k,[S.axR,S.r,sd*t],spin)));}}},
  // ---- suspension and wheels, every frame: near vehicles (or the one followed or driven) bounce on their springs
  update(dt){if(!App.T)return;const cp=Cam.pos||[0,0,0];
    if(this.drv)this.driveStep(dt);
    for(const b of Buses.list){const S=this.spec(b),k=RV_SCALE,v=b.manual?(b.mv||0):(b.st==='drive'?b.v:0);
      b._spin=((b._spin||0)+v*dt/(S.r*k))%(Math.PI*2);
      const near=b===this.sel||b===this.drv||Math.hypot(b.x-cp[0],b.z-cp[2])<160;
      const yr=b._pr===undefined?0:wrapPi(b.rot-b._pr)/Math.max(dt,1e-3);b._pr=b.rot;const al=b._pv===undefined?0:(v-b._pv)/Math.max(dt,1e-3);b._pv=v;
      b._yr=(b._yr||0)+(yr-(b._yr||0))*Math.min(1,dt*8);b._al=(b._al||0)+(clamp(al,-8,8)-(b._al||0))*Math.min(1,dt*8);
      if(!b.manual)b._steer=Math.abs(v)>0.3?clamp(Math.atan((S.axF-S.axR)*k*b._yr/v),-0.6,0.6):(b._steer||0)*0.95;
      if(!near){b._s=null;continue;}
      const s=b._s||(b._s={h:0,hv:0,p:0,pv:0,r:0,rv:0}),dd=b.type==='dd'?1.35:1;
      // road and ground bumps: value noise along the distance driven, stronger off the roads; front and rear axles and both sides differ
      b._dist=(b._dist||0)+Math.abs(v)*dt;const off=b.onRoad===false||b.offRoad,amp=off?0.035:0.008,wb=(S.axF-S.axR)*k,nz=(x,o)=>{const i=Math.floor(x),f=x-i,h=q=>{const t=Math.sin(q*127.1+o*311.7)*43758.5453;return t-Math.floor(t);};return(h(i)*(1-f*f*(3-2*f))+h(i+1)*f*f*(3-2*f))-0.5;};
      const fq=off?1.6:0.9,bf=nz((b._dist+wb)*fq,1)*amp,br=nz(b._dist*fq,1)*amp,bl=nz(b._dist*fq*1.3,7)*amp,bR=nz(b._dist*fq*1.3,9)*amp;
      const hT=(bf+br)/2,pT=(bf-br)/wb,rT=(bl-bR)/(S.trF*2*k);
      const n=Math.max(1,Math.ceil(dt/0.01)),h=dt/n,w0=2*Math.PI*1.4/Math.sqrt(dd),z=0.3;
      for(let i=0;i<n;i++){// body pitch: nose dips under braking, squats when pulling away; roll: leans out of a turn
        s.pv+=(-w0*w0*(s.p-pT)-2*z*w0*s.pv-b._al*0.012*dd)*h;s.rv+=(-w0*w0*(s.r-rT)-2*z*w0*s.rv-v*b._yr*0.016*dd)*h;s.hv+=(-w0*w0*1.4*(s.h-hT)-2*z*w0*s.hv)*h;
        s.p+=s.pv*h;s.r+=s.rv*h;s.h+=s.hv*h;}
      s.p=clamp(s.p,-0.09,0.09);s.r=clamp(s.r,-0.12,0.12);s.h=clamp(s.h,-0.08,0.08);}
    if(this.sel&&!Buses.list.includes(this.sel))this.close();
    if(this.sel&&this.cam==='follow'){const b=this.sel,y=this.gy(b.x,b.z)+1.5;Cam.mode='free';Cam.target[0]+=(b.x-Cam.target[0])*Math.min(1,dt*6);Cam.target[2]+=(b.z-Cam.target[2])*Math.min(1,dt*6);Cam.target[1]=y;}
    this.tick();},
  // ---- picking a vehicle with a tap: the nearest on screen within a radius that grows as it comes closer
  pick(sx,sy){let best=null,bd=1e9;const cp=Cam.pos||[0,0,0];for(const b of Buses.list){const d=Math.hypot(b.x-cp[0],b.z-cp[2]);if(d>1500)continue;const q=Cam.toScreen(b.x,this.gy(b.x,b.z)+1.4*RV_SCALE,b.z);if(!q)continue;
      const r=Math.max(30,Math.min(140,9000/Math.max(d,1))),e=Math.hypot(q[0]-sx,q[1]-sy);if(e<r&&e<bd){bd=e;best=b;}}return best;},
  // ---- the panel of the selected vehicle
  select(b){this.sel=b;if(this.cam==='off')this.setCam('follow');this.panel(true);this.refresh();},
  close(){if(this.drv)this.stopDriving();this.sel=null;this.setCam('off');this.panel(false);},
  setCam(c){this.cam=c;if(c==='off'){if(Cam.mode==='road'||Cam.mode==='free')Cam.mode='free';return;}if(c==='follow'){Cam.mode='free';Cam.anim=null;if(this.sel){Cam.dist=Math.min(Math.max(Cam.dist,14),45);Cam.pitch=Math.max(Cam.pitch,0.3);}}else{Cam.mode='road';Cam.anim=null;}this.refresh();},
  nextCam(){const L=this.drv?['chase','cab','wheel','follow']:['follow','chase','cab','wheel'];this.setCam(L[(L.indexOf(this.cam)+1)%L.length]);},
  camera(dt){const b=this.drv||this.sel;if(!b)return null;const F=this.frame(b),k=F.k,S=this.spec(b),P=v=>{const r=Q.rot(F.qb,v);return[F.ob[0]+r[0]*k,F.ob[1]+r[1]*k,F.ob[2]+r[2]*k];};let p,look,cab=false;
    if(this.cam==='cab'){const e=b.goods?[0.1,1.95,-0.45]:b.type==='dd'?[RV.dd.axF-0.6,1.95,-0.6]:[RV.bus.axF-0.4,1.95,-0.6];p=P(e);look=P([e[0]+20,e[1]-1.2,e[2]]);cab=true;}
    else if(this.cam==='wheel'){p=P([S.axF+2.8,0.75,S.trF+2.3]);look=P([S.axR-0.5,0.7,S.trF]);cab=true;}/* low beside the front wheel, looking back along the side: the springs at work */
    else{const fw=[Math.cos(b.rot),0,Math.sin(b.rot)],back=(b.manual&&(b.mv||0)<-0.5)?-1:1,want=[b.x-fw[0]*11*back,F.oc[1]+4.2,b.z-fw[2]*11*back];if(!this.cp||Math.hypot(this.cp[0]-want[0],this.cp[2]-want[2])>40)this.cp=want.slice();const a=Math.min(1,dt*3);for(let i=0;i<3;i++)this.cp[i]+=(want[i]-this.cp[i])*a;p=this.cp.slice();look=[b.x+fw[0]*3,F.oc[1]+1.2,b.z+fw[2]*3];}
    const gh=this.gy(p[0],p[2])+0.4;if(p[1]<gh)p[1]=gh;return{p,look,cab};},
  panel(on){let el=$('#rvPanel');if(!el){el=document.createElement('div');el.id='rvPanel';document.body.appendChild(el);el.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;const a=t.dataset.a,b=this.sel;if(!b&&a!=='x')return;
        if(a==='x')this.close();else if(a==='cam')this.nextCam();else if(a==='stops'){BusUI.open=true;BusUI.ed=b;BusUI.refresh();}else if(a==='drive')this.startDriving(b);else if(a==='back')this.stopDriving();else if(a==='fly'){Cam.setMode('free');Cam.flyTo([b.x,this.gy(b.x,b.z),b.z],30);}});}
    el.hidden=!on;},
  refresh(){const el=$('#rvPanel');if(!el||el.hidden||!this.sel)return;const b=this.sel,S=this.spec(b),R2=Buses.route(b);
    let load='';if(b.goods){const c=b.cargo||{},parts=Object.keys(c).filter(t=>c[t]&&c[t].n>=1).map(t=>`${Math.floor(c[t].n)} ${Goods.T[t].icon}`);load=parts.length?parts.join(' '):'empty';}else load=`🧍 ${b.pax?b.pax.length:0} / ${S.cap}`;
    const cams={off:'Camera: off',follow:'📷 Follow',chase:'📷 Behind',cab:'📷 Driver',wheel:'📷 Wheel'};
    const h=`<div class="rv-h"><div><b>${esc(b.name)}</b><span>${S.name}${b.manual?' · you drive':''}</span></div><button data-a="x" aria-label="Close">✕</button></div>
      <div class="rv-r">${esc(b.manual?'Driven by you':Buses.status(b))}</div><div class="rv-r">${load} · ${Math.round(Math.abs(b.manual?b.mv||0:b.st==='drive'?b.v:0)/RV_SCALE*3.6)} km/h</div>
      <div class="rv-r">Earned <b>€ ${Money.fmt?Money.fmt(Math.round(b.earned||0)):Math.round(b.earned||0)}</b> · ${b.trips||0} stops served · route of ${R2.length} stops</div>
      <div class="rv-b"><button data-a="cam">${cams[this.cam]||'📷'}</button><button data-a="stops">Change stops</button>${b.manual?'<button data-a="back" class="go">Back to the route</button>':'<button data-a="drive" class="go">Drive it</button>'}</div>`;
    if(el._h!==h){el.innerHTML=h;el._h=h;}},
  tick(){const t=performance.now();if(this.sel&&!(this._rt>t-300)){this._rt=t;this.refresh();}if(this.drv)this.hud();},
  // ---- driving it yourself: the touch joystick (left/right steers, up accelerates, down brakes and then reverses) or a controller
  // (left stick steers, RT accelerates, LT brakes/reverses, A horn, B camera, Y back to the route). Off the roads it is slower and bumpier;
  // water stops it. "Back to the route" hands it back: it plans from where it stands to its next stop and carries on.
  startDriving(b){if(Plane.on)Plane.exit();if(Build.active)Build.exit();if(Drive.active)Drive.exit();this.drv=b;b.manual=true;b.mv=b.st==='drive'?b.v:0;b.st='drive';b.queued=null;this.sel=b;
    this.setCam('chase');this.ui(true);UI.toast('You drive '+b.name+': joystick to steer and drive, or a controller (left stick, RT, LT)');this.refresh();},
  stopDriving(){const b=this.drv;if(!b)return;b.manual=false;b.mv=0;b.v=0;b.path=null;b.st='drive';b.offRoad=false;this.drv=null;this.ui(false);if(this.sel)this.setCam('follow');UI.toast(b.name+' goes back to its route');this.refresh();},
  ui(on){let el=$('#rvUI');if(!el){el=document.createElement('div');el.id='rvUI';el.innerHTML='<div id="rvHud"></div><div id="rvTop"><button data-a="cam">📷 Camera</button><button data-a="horn">📯 Horn</button><button data-a="back" class="go">Back to the route</button></div><div id="rvStickWrap"><div id="rvStick"><div id="rvKnob"></div></div></div>';document.body.appendChild(el);
      el.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;if(t.dataset.a==='cam')this.nextCam();else if(t.dataset.a==='horn')this.horn();else if(t.dataset.a==='back')this.stopDriving();});
      const st=el.querySelector('#rvStick'),kn=el.querySelector('#rvKnob');let id=null;const mv=ev=>{const r=st.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,Rr=r.width/2-14;let dx=(ev.clientX-cx)/Rr,dy=(ev.clientY-cy)/Rr;const l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l;}
        this.inp.steer=dx;this.inp.gas=Math.max(0,-dy);this.inp.brake=Math.max(0,dy);this.inp.touch=true;kn.style.transform=`translate(${dx*Rr}px,${dy*Rr}px)`;};
      st.onpointerdown=ev=>{ev.preventDefault();id=ev.pointerId;st.setPointerCapture(id);mv(ev);};st.onpointermove=ev=>{if(ev.pointerId===id)mv(ev);};st.onpointerup=st.onpointercancel=ev=>{if(ev.pointerId!==id)return;id=null;this.inp.steer=this.inp.gas=this.inp.brake=0;this.inp.touch=false;kn.style.transform='';};}
    el.hidden=!on;document.body.classList.toggle('roaddrive',on);},
  hud(){const b=this.drv,el=$('#rvHud');if(!el)return;el.innerHTML=`<b>${Math.round(Math.abs(b.mv||0)/RV_SCALE*3.6)}</b> km/h${(b.mv||0)<-0.3?' · reverse':''}${b.offRoad?' · off the road':''} · ${esc(b.name)}`;},
  horn(){const c=Sfx.ctx;if(!c||!Sfx.on)return;const t=c.currentTime,g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.18,t+0.03);g.gain.setValueAtTime(0.18,t+0.45);g.gain.linearRampToValueAtTime(0,t+0.55);g.connect(Sfx.master);
    for(const f of [392,494]){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f;const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1800;o.connect(lp);lp.connect(g);o.start(t);o.stop(t+0.6);}},
  padPoll(){if(!navigator.getGamepads)return;let g=null;for(const q of navigator.getGamepads()){if(q&&q.connected){g=q;if(q.mapping==='standard')break;}}if(!g)return;
    const bt=i=>{const x=g.buttons[i];return x?(typeof x==='object'?(x.value||(x.pressed?1:0)):+x):0;},pr=i=>bt(i)>0.5,ed=i=>pr(i)&&!this.pad.prev[i],ax=v=>Math.abs(v)<0.12?0:(v-Math.sign(v)*0.12)/0.88;
    const sx=ax(g.axes[0]||0),gas=bt(7),brk=bt(6);if(sx||gas>0.05||brk>0.05){this.inp.steer=sx;this.inp.gas=gas;this.inp.brake=brk;this.pad.act=true;}else if(this.pad.act&&!this.inp.touch){this.inp.steer=this.inp.gas=this.inp.brake=0;this.pad.act=false;}
    if(ed(0))this.horn();if(ed(1))this.nextCam();if(ed(3))this.stopDriving();this.pad.prev=g.buttons.map((x,i)=>pr(i));},
  driveStep(dt){const b=this.drv;if(!b||!Buses.list.includes(b)){this.drv=null;this.ui(false);return;}this.padPoll();if(!this.drv)return;
    const S=this.spec(b),k=RV_SCALE,T=App.T,I=this.inp,wb=(S.axF-S.axR)*k;let v=b.mv||0;
    // on a road? (the road mask used by the routing), and the slope along the heading
    const cs=T.cs,ci=clamp(Math.floor(b.x/cs),0,T.N-1),cj=clamp(Math.floor(b.z/cs),0,T.N-1),onRoad=!!(Life.roadKill&&Life.roadKill[cj*T.N+ci]);b.offRoad=!onRoad;
    const fw=[Math.cos(b.rot),Math.sin(b.rot)],h0=this.gy(b.x-fw[0]*2,b.z-fw[1]*2),h1=this.gy(b.x+fw[0]*2,b.z+fw[1]*2),slope=Math.atan2(h1-h0,4);
    const amax=b.goods?2.0:1.5,vmax=(onRoad?17:7)*k,roll=(onRoad?0.18:1.1)+0.0015*v*v;
    let a=0;if(I.gas>0.02)a+=I.gas*amax*(v<-0.3?3:1)*(v>vmax?0:1);if(I.brake>0.02){if(v>0.4)a-=I.brake*6;else a-=I.brake*amax*0.7*(v<-4*k?0:1);}
    a-=Math.sign(v)*Math.min(Math.abs(v)/dt,roll)+9.81*Math.sin(slope)*0.6;if(Math.abs(v)<0.05&&I.gas<0.02&&I.brake<0.02&&Math.abs(slope)<0.25){a=0;v=0;}
    v+=a*dt;if(v>vmax&&I.gas<0.02)v-=Math.min(v-vmax,3*dt);
    const want=I.steer*0.6/(1+Math.abs(v)/(9*k));b._steer=(b._steer||0)+(want-(b._steer||0))*Math.min(1,dt*6);
    const nr=b.rot+v/wb*Math.tan(b._steer)*dt,nx=b.x+Math.cos(nr)*v*dt,nz=b.z+Math.sin(nr)*v*dt;
    const water=(x,z)=>{const w=sampleWater(T,clamp(x,0,T.W),clamp(z,0,T.W));return w[1]>0&&w[0]>R.sampleHr(T,x,z)+0.25;};
    const ahead=[nx+Math.cos(nr)*S.len*k*0.5*Math.sign(v||1),nz+Math.sin(nr)*S.len*k*0.5*Math.sign(v||1)];
    if(water(ahead[0],ahead[1])||ahead[0]<10||ahead[1]<10||ahead[0]>T.W-10||ahead[1]>T.W-10){if(Math.abs(v)>1)UI.toast(water(ahead[0],ahead[1])?'Water ahead':'The edge of the world');v=0;}else{b.x=nx;b.z=nz;b.rot=nr;}
    b.mv=v;b.v=Math.abs(v);}};
