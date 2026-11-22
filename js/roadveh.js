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
  dd:{name:'Double-decker',axF:2.6,axR:-2.4,trF:1.0,trR:[1.0],r:0.52,len:9.2,cap:60,price:55000,mass:1.4},
  unimog:{name:'Unimog',axF:1.405,axR:-1.405,trF:0.93,trR:[0.93],r:0.56,len:5.3,cap:16,price:48000,mass:1.2,off:true},
  unirail:{name:'Rail Unimog',axF:1.405,axR:-1.405,trF:0.93,trR:[0.93],r:0.56,len:5.6,cap:0,price:95000,mass:1.6,off:true,rail:true}};/* 4.61: track maintenance *//* 4.60: the off-road lorry */
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
  const bus=(decks)=>{const B=vmesh(),dd=decks===2;const C=dd?{low:[0.01,0.3,0.08],band:[0.98,0.8,0.26],up:[0.01,0.3,0.08],roof:[0.6,0.61,0.58],hood:[0.01,0.3,0.08]}:{low:[0.74,0.12,0.09],band:[0.93,0.87,0.7],up:[0.93,0.87,0.7],roof:[0.93,0.87,0.7],hood:[0.74,0.12,0.09]};
    const L0=dd?-4.65:-4.4,Lc=dd?1.95:2.15,W=dd?1.2:1.18,yb=0.62,y1=2.28,y2=dd?3.82:2.75,ax=dd?[2.6,-2.4]:[2.3,-2.3];
    // ---- lower deck: a rounded box with the window band cut out; frames; the gold lining
    const lowH=[(Lc-L0)/2,(y1-yb)/2,W],lU=sqU(lowH,0.12,110),lV=sqV(lowH,0.12,34),lowF=sq([(L0+Lc)/2,(yb+y1)/2,0],lowH,0.12),winL=p=>(Math.abs(p[2])>W*0.95&&p[1]>1.35&&p[1]<2.08&&p[0]>L0+0.4&&p[0]<Lc-0.45&&((p[0]-L0-0.4)%0.82)>0.1)||(p[0]>Lc-0.06&&p[1]>1.68&&p[1]<2.12&&Math.abs(p[2])<W*0.86&&Math.abs(p[2])>0.05);/* side windows; the driver's windscreen in two panes */
    surf(B,lowF,lU,lV,(u,v)=>{const p=lowF(u,v);if(winL(p))return null;return[p[1]>2.12?C.band:C.low,PAINT];},{eu:2e-3,ev:2e-3});
    surf(B,lowF,lU,lV,(u,v)=>winL(lowF(u,v))?[GLs,GLASS]:null,{eu:2e-3,ev:2e-3});
    rbox(B,[(L0+Lc)/2,(yb+y1)/2,0],[(Lc-L0)/2-0.04,(y1-yb)/2-0.04,W-0.04],0.12,null,null,()=>[[0.18,0.15,0.12],INT],40);
    for(const sd of [-1,1]){const z=sd*(W+0.006);for(const y of [1.32,2.11])quad(B,[L0+0.3,y,z],[Lc-0.3,y,z],[Lc-0.3,y+0.025,z],[L0+0.3,y+0.025,z],dd?C.band:[0.95,0.8,0.4],PAINT);
      for(const y of [0.98,1.02])quad(B,[L0+0.35,y,z],[Lc-0.35,y,z],[Lc-0.35,y+0.012,z],[L0+0.35,y+0.012,z],[0.95,0.75,0.3],PAINT);// gold lining
      for(let x=L0+0.4;x<Lc-0.4;x+=0.82)box(B,[x+0.05,1.71,z],[0.05,0.37,0.012],dd?C.low:C.band,PAINT);}/* lower-deck window pillars: green on the double-decker (photo), cream on the small bus */
    if(dd){// ---- upper deck: cream window frames on green, the long yellow side board for the lettering, a silver roof with an overhang
      const upH=[(Lc-0.1-L0)/2,(y2-y1)/2,W*0.99],uU=sqU(upH,0.12,110),uV=sqV(upH,0.12,34),upF=sq([(L0+Lc-0.1)/2,(y1+y2)/2,0],upH,0.12),winU=p=>(Math.abs(p[2])>W*0.93&&p[1]>2.86&&p[1]<3.52&&p[0]>L0+0.25&&p[0]<Lc-0.3&&((p[0]-L0-0.25)%0.78)>0.08)||(p[0]>Lc-0.25&&p[1]>2.86&&p[1]<3.52&&Math.abs(p[2])<W*0.85&&Math.abs(p[2])>0.04);
      surf(B,upF,uU,uV,(u,v)=>{const p=upF(u,v);if(winU(p))return null;if(p[1]>3.62)return[C.roof,PAINT];return[p[1]>2.8?C.band:C.up,PAINT];},{eu:2e-3,ev:2e-3});
      surf(B,upF,uU,uV,(u,v)=>winU(upF(u,v))?[GLs,GLASS]:null,{eu:2e-3,ev:2e-3});
      rbox(B,[(L0+Lc-0.1)/2,(y1+y2)/2,0],[(Lc-0.1-L0)/2-0.04,(y2-y1)/2-0.04,W*0.99-0.04],0.12,null,null,()=>[[0.2,0.17,0.13],INT],40);
      rbox(B,[(L0+Lc)/2,y2+0.02,0],[(Lc-L0)/2+0.12,0.06,W+0.06],0.2,C.roof,PAINT,null,28);// roof with the overhang
      // the two front panes of the upper deck in yellow frames (a broad centre pillar), and a yellow rail under the side windows
      {const fx=Lc-0.085;for(const sd of [-1,1]){const z0=sd*0.07,z1=sd*W*0.84;for(const [a,b] of [[[fx,2.86,z0],[fx,2.86,z1]],[[fx,3.52,z0],[fx,3.52,z1]],[[fx,2.86,z0],[fx,3.52,z0]],[[fx,2.86,z1],[fx,3.52,z1]]])tube(B,a,b,0.03,0.03,6,C.band,PAINT);}
        box(B,[fx,3.19,0],[0.02,0.36,0.07],C.band,PAINT);for(const sd of [-1,1])quad(B,[L0+0.2,2.83,sd*(W+0.004)],[Lc-0.3,2.83,sd*(W+0.004)],[Lc-0.3,2.86,sd*(W+0.004)],[L0+0.2,2.86,sd*(W+0.004)],C.band,PAINT);}
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
  // ================================================================ Mercedes-Benz Unimog (424 / U1000 shape), 4.61 after the user's photos
  // (BD-ZT-26 with its lamps and horns, plus the mesh guard, side step and toolbox of the restored one). Proportions from the photos:
  // a short, almost flat bonnet ending in a tall black grille about 1 m ahead of the front axle; a tall square cab whose doors start
  // 1.4 m up (the cab sits above the wheels); windscreen base just behind the front axle; wheels 1.12 m; body 2.0 m wide.
  const UM={ax:[1.405,-1.405],FR:2.5,C0:1.38,C1:-0.12,cb:1.42,ct:2.74,cw:1.0,OR:[0.95,0.42,0.06],ORd:[0.78,0.33,0.04],YL:[0.96,0.78,0.1],RDc:[0.85,0.1,0.08],AMB:[1,0.55,0.08],WL:[1,0.97,0.9]};
  /* chassis, bonnet, grille, bumper, cab, lamps, mirrors, roof equipment, arches: everything in front of the load area (o.rail: the
     rail version: warning stripes on the bumper, no implement plate, its rail wheels are drawn apart) */
  const umFront=(B,o)=>{const {ax,FR,C0,C1,cb,ct,cw,OR,ORd,YL,RDc,AMB,WL}=UM;
    // ---- chassis: ladder frame, portal axles with the hub housings, diffs, prop shaft, fuel tank (right), exhaust
    for(const z of [-0.42,0.42])box(B,[-0.05,0.98,z],[2.5,0.1,0.05],BK,MATTE);for(const x of [2.3,1.2,0,-1.2,-2.4])box(B,[x,0.98,0],[0.05,0.08,0.42],BK,MATTE);
    for(const x of ax){tube(B,[x,0.72,-0.8],[x,0.72,0.8],0.09,0.09,10,BK,MATTE);ball(B,[x,0.72,0.1],0.24,[1,0.9,1],BK,MATTE,12);for(const sd of [-1,1]){box(B,[x,0.64,sd*0.86],[0.17,0.17,0.08],BK,MATTE);tube(B,[x,0.84,sd*0.45],[x,1.0,sd*0.45],0.09,0.09,8,[0.12,0.12,0.12],MATTE);}}
    tube(B,[1.2,0.74,0.08],[-1.2,0.74,0.08],0.045,0.045,8,BK,MATTE);box(B,[0.35,1.0,0.86],[0.38,0.2,0.13],BK,MATTE);/* fuel tank under the right door */
    tube(B,[-0.2,0.85,-0.55],[-2.0,0.88,-0.7],0.04,0.04,8,[0.22,0.2,0.18],MATTE);box(B,[1.9,1.05,0],[0.5,0.14,0.5],[0.1,0.1,0.11],MATTE);/* engine sump between the frame rails */
    // ---- the bonnet: almost flat (1.92 m at the windscreen, 1.80 at the front), square with rounded edges, sides down to 1.2 m
    const top=x=>lerp(1.92,1.8,(x-C0)/(FR-C0)),bw=0.93;
    surf(B,(x,t)=>{const a=t*Math.PI,c=Math.cos(a),sn=Math.sin(a),e=0.2,tp=top(x);return[x,1.44+(tp-1.44)*Math.pow(Math.max(0,sn),e),-bw*Math.sign(c)*Math.pow(Math.abs(c),e)];},range(C0-0.02,FR-0.03,6),range(0,1,20),()=>[OR,PAINT]);
    surf(B,(t,s)=>{const a=t*Math.PI,c=Math.cos(a),sn=Math.sin(a),e=0.2,tp=top(FR),r=0.03*s;return[FR-0.03+r,1.44+(tp-1.44-r)*Math.pow(Math.max(0,sn),e),-(bw-r)*Math.sign(c)*Math.pow(Math.abs(c),e)];},range(0,1,20),[0,1],()=>[OR,PAINT]);/* the rounded front lip */
    quad(B,[FR,1.24,-bw],[FR,1.24,bw],[FR,1.74,bw],[FR,1.74,-bw],OR,PAINT);
    // the grille: a tall black panel with horizontal ribs, the star in its ring at the top, amber indicators at the upper corners
    box(B,[FR+0.005,1.47,0],[0.02,0.2,0.74],BK,MATTE);for(let k=0;k<7;k++)box(B,[FR+0.03,1.3+k*0.052,0],[0.01,0.016,0.72],[0.13,0.13,0.14],PAINT);
    tube(B,[FR+0.03,1.5,0],[FR+0.05,1.5,0],0.1,0.1,24,CH,CHROME,true);for(const a of [Math.PI/2,Math.PI/2+2.094,Math.PI/2+4.189])box(B,[FR+0.06,1.5+Math.sin(a)*0.045,Math.cos(a)*0.045],[0.006,0.05*Math.abs(Math.sin(a))+0.01,0.05*Math.abs(Math.cos(a))+0.01],[0.15,0.15,0.16],MATTE);
    box(B,[FR+0.04,1.33,-0.45],[0.004,0.022,0.15],[0.62,0.62,0.64],CHROME);/* the UNIMOG lettering */
    for(const sd of [-1,1]){box(B,[FR+0.01,1.62,sd*0.85],[0.02,0.045,0.075],AMB,4);box(B,[FR-0.05,1.62,sd*0.935],[0.06,0.045,0.008],AMB,4);/* indicators round the corners */
      box(B,[C0+0.3,1.6,sd*0.936],[0.11,0.13,0.008],BK,MATTE);ball(B,[C0+0.3,1.6,sd*0.93],0.13,[0.85,1,0.08],BK,MATTE,12);/* the air intake on the bonnet side */}
    box(B,[FR-0.25,1.82,0],[0.05,0.012,0.18],[0.1,0.1,0.1],MATTE);/* bonnet handle */
    // ---- front bumper: black, square headlamps in its ends, the yellow plate left of centre; the implement plate with its hooks
    box(B,[FR+0.12,1.08,0],[0.14,0.2,1.02],BK,MATTE);box(B,[FR+0.02,0.86,0],[0.1,0.04,0.9],BK,MATTE);
    for(const sd of [-1,1]){box(B,[FR+0.26,1.1,sd*0.74],[0.012,0.1,0.14],[0.3,0.3,0.32],CHROME);box(B,[FR+0.27,1.1,sd*0.74],[0.006,0.085,0.12],WL,4);box(B,[FR+0.2,0.86,sd*0.5],[0.04,0.05,0.04],RDc,MATTE);/* tow eyes */
      quad(B,[FR+0.262,0.96,sd*0.93],[FR+0.262,0.96,sd*0.99],[FR+0.262,1.12,sd*0.99],[FR+0.262,1.12,sd*0.93],[0.95,0.95,0.95],4);/* the white marker plates at the bumper ends */}
    if(!o.rail){box(B,[FR+0.27,1.08,-0.36],[0.004,0.055,0.22],YL,PAINT);box(B,[FR+0.273,1.08,-0.36],[0.002,0.05,0.2],[0.08,0.08,0.08],3);
      box(B,[FR+0.33,0.9,0.12],[0.04,0.26,0.3],[0.1,0.1,0.11],MATTE);for(const z of [-0.1,0.34])box(B,[FR+0.4,0.72,z],[0.05,0.07,0.04],[0.13,0.13,0.14],MATTE);tube(B,[FR+0.36,0.78,0.12],[FR+0.52,0.76,0.12],0.035,0.035,8,BK,MATTE);}
    else for(let k=0;k<8;k++){const z0=-0.6+k*0.15;quad(B,[FR+0.262,0.94,z0],[FR+0.262,0.94,z0+0.075],[FR+0.262,1.2,z0+0.15],[FR+0.262,1.2,z0+0.075],k%2?[0.95,0.95,0.95]:RDc,4);}/* red/white warning stripes */
    // ---- the cab: square, tall, rounded corners; windscreen, door windows, two rear windows
    rbox(B,[(C0+C1)/2,(cb+ct)/2,0],[(C0-C1)/2,(ct-cb)/2,cw],0.1,OR,PAINT,(p)=>{const fx=p[0]>C0-0.04&&p[1]>1.96&&p[1]<2.7&&Math.abs(p[2])<0.93,side=Math.abs(Math.abs(p[2])-cw)<0.04&&p[1]>1.98&&p[1]<2.62&&p[0]<1.27&&p[0]>0.4,
      back=p[0]<C1+0.05&&p[1]>2.08&&p[1]<2.56&&Math.abs(p[2])>0.07&&Math.abs(p[2])<0.82;return fx||side||back?[[0.1,0.12,0.14],GLASS]:[OR,PAINT];},40);
    for(const sd of [-1,1]){const zs=sd*1.004;box(B,[0.31,1.97,zs],[0.008,0.67,0.004],ORd,PAINT);box(B,[1.33,1.62,zs],[0.008,0.2,0.004],ORd,PAINT);box(B,[0.48,1.31,zs],[0.17,0.008,0.004],ORd,PAINT);/* door seams: rear edge, front edge under the A-pillar, the bottom behind the arch */
      box(B,[0.42,1.92,sd*1.014],[0.07,0.018,0.012],[0.1,0.1,0.1],MATTE);/* handle */box(B,[0.84,1.975,sd*1.006],[0.44,0.014,0.004],[0.08,0.08,0.08],MATTE);box(B,[0.84,2.625,sd*1.006],[0.44,0.012,0.004],[0.08,0.08,0.08],MATTE);/* window rubber */
      box(B,[1.13,2.3,sd*1.008],[0.012,0.32,0.004],[0.08,0.08,0.08],MATTE);/* the vent window's bar */box(B,[0.41,2.3,sd*1.006],[0.012,0.33,0.004],[0.08,0.08,0.08],MATTE);
      box(B,[0.98,1.68,sd*1.006],[0.33,0.006,0.003],ORd,PAINT);/* the crease along the door */}
    // windscreen frame and wipers; the cab inside: floor, seats, wheel, a driver in hi-vis
    box(B,[C0+0.008,2.71,0],[0.01,0.014,0.94],[0.08,0.08,0.08],MATTE);box(B,[C0+0.008,1.955,0],[0.01,0.012,0.94],[0.08,0.08,0.08],MATTE);for(const sd of [-1,1])box(B,[C0+0.008,2.33,sd*0.935],[0.01,0.38,0.012],[0.08,0.08,0.08],MATTE);/* the windscreen rubber */for(const z of [-0.45,0.4])tube(B,[C0+0.04,1.97,z],[C0+0.05,2.22,z+0.32],0.008,0.008,4,BK,MATTE);
    box(B,[0.55,1.48,0],[0.8,0.02,0.95],[0.12,0.12,0.12],INT);for(const z of [-0.5,0.45])box(B,[0.05,1.78,z],[0.22,0.28,0.25],[0.2,0.2,0.22],INT);tube(B,[C0-0.22,2.08,-0.5],[C0-0.36,1.8,-0.5],0.02,0.02,6,BK,MATTE);tube(B,[C0-0.24,2.12,-0.5],[C0-0.2,2.05,-0.5],0.19,0.19,16,BK,MATTE);
    person(B,0.22,1.58,-0.5,[0.95,0.75,0.1],[0.95,0.75,0.1]);
    // the snorkel up the right A-pillar (its intake on the bonnet side), round spot lamps on the bonnet's rear corners, tall mirrors on arms
    tube(B,[C0+0.05,1.5,1.03],[C0+0.05,3.0,1.03],0.075,0.075,12,BK,MATTE,true);ball(B,[C0+0.05,3.05,1.03],0.12,[1,0.45,1],BK,MATTE,12);box(B,[C0+0.12,1.55,0.98],[0.12,0.16,0.05],BK,MATTE);
    for(const sd of [-1,1]){const lp=[C0+0.2,2.05,sd*0.86];box(B,add(lp,[-0.05,-0.1,0]),[0.03,0.05,0.02],BK,MATTE);tube(B,add(lp,[-0.12,0,0]),lp,0.1,0.11,16,BK,PAINT,true);tube(B,add(lp,[-0.005,0,0]),add(lp,[0.012,0,0]),0.112,0.112,16,CH,CHROME);surf(B,(r,a)=>[lp[0]+0.01+0.012*(1-r/0.08),lp[1]+Math.sin(a)*r,lp[2]+Math.cos(a)*r],[0,0.045,0.08],range(0,Math.PI*2,14),()=>[[1,0.88,0.6],4]);
      tube(B,[C0-0.06,2.5,sd*1.0],[C0+0.06,2.5,sd*1.3],0.018,0.018,6,BK,MATTE);tube(B,[C0-0.06,1.98,sd*1.0],[C0+0.06,2.05,sd*1.3],0.018,0.018,6,BK,MATTE);box(B,[C0+0.08,2.27,sd*1.32],[0.035,0.26,0.13],BK,MATTE);box(B,[C0+0.12,2.27,sd*1.32],[0.004,0.23,0.11],[0.55,0.62,0.68],CHROME);}
    // ---- the roof: a rail across the front with the chrome air horns and an amber beacon (right); across the back two work lamps, a beacon (left), marker lamps
    box(B,[C0-0.15,ct+0.06,0],[0.025,0.025,0.95],[0.2,0.2,0.2],CHROME);box(B,[C1+0.18,ct+0.06,0],[0.025,0.025,0.95],[0.2,0.2,0.2],CHROME);
    for(const z of [-0.85,0.85])for(const x of [C0-0.15,C1+0.18])box(B,[x,ct+0.02,z],[0.03,0.03,0.03],BK,MATTE);
    const beacon=(c)=>{tube(B,c,add(c,[0,0.06,0]),0.09,0.09,12,BK,MATTE,true);tube(B,add(c,[0,0.06,0]),add(c,[0,0.25,0]),0.085,0.07,14,AMB,4,true);};
    beacon([C0-0.15,ct+0.09,0.78]);beacon([C1+0.18,ct+0.09,-0.8]);
    for(const z of [-0.3,-0.05])tube(B,[C0-0.35,ct+0.17,z],[C0+0.05,ct+0.17,z],0.022,0.07,10,CH,CHROME);tube(B,[C0-0.4,ct+0.09,-0.18],[C0-0.4,ct+0.16,-0.18],0.02,0.02,6,BK,MATTE);
    for(const z of [-0.35,0.35]){const wl=[C1+0.2,ct+0.2,z];tube(B,add(wl,[0,-0.12,0]),wl,0.02,0.02,6,BK,MATTE);tube(B,add(wl,[0.12,0,0]),wl,0.09,0.1,14,BK,PAINT,true);surf(B,(r,a)=>[wl[0]-0.01,wl[1]+Math.sin(a)*r,wl[2]+Math.cos(a)*r],[0,0.05,0.09],range(0,Math.PI*2,12),()=>[WL,4]);}
    for(const sd of [-1,1])box(B,[C1+0.18,ct+0.12,sd*0.6],[0.03,0.025,0.04],sd<0?[0.9,0.05,0.04]:AMB,4);tube(B,[C0-0.6,ct,0.5],[C0-0.6,ct+0.9,0.5],0.008,0.004,4,BK,MATTE);/* aerial */
    // ---- arches: big black flared fenders over the front wheels (on the body), black guards at the back, mud flaps
    /* the orange body comes down to 1.28 m all along (bonnet sides and the door), cut round the front wheel by the arch (top 1.44 m) */
    const arch=x=>{const d=x-ax[0],r=0.76;return Math.abs(d)<r?0.72+Math.sqrt(r*r-d*d)*0.95:0;},bot=x=>Math.max(1.28,arch(x));
    for(const sd of [-1,1]){for(const [x0,x1,zz] of [[C1+0.04,C0,cw-0.002],[C0,FR-0.03,bw-0.002]])surf(B,(x,s)=>[x,lerp(bot(x),1.47,s),sd*zz],range(x0,x1,28),sd>0?[0,1]:[1,0],()=>[OR,PAINT]);
      quad(B,[C0,bot(C0),sd*bw],[C0,bot(C0),sd*cw],[C0,1.47,sd*cw],[C0,1.47,sd*bw],OR,PAINT);/* the step out from the bonnet side to the cab side */
      // the black flared lip round the arch, and the dark wheel well inside it
      surf(B,(a,z)=>{const r=0.76+0.05*z,x=ax[0]+Math.cos(a)*r,y=0.72+Math.sin(a)*r*0.95;return[x,y,sd*lerp(0.9,1.07,z)];},range(0.06,Math.PI-0.06,18),range(0,1,3),()=>[BK,MATTE]);
      surf(B,(a,z)=>{const r=0.74,x=ax[0]+Math.cos(a)*r,y=0.72+Math.sin(a)*r*0.95;return[x,y,sd*lerp(0.5,0.92,z)];},range(0.06,Math.PI-0.06,14),range(0,1,2),()=>[[0.02,0.02,0.02],MATTE]);
      quad(B,[ax[0]-0.74,0.72,sd*0.5],[ax[0]+0.74,0.72,sd*0.5],[ax[0]+0.74,1.45,sd*0.5],[ax[0]-0.74,1.45,sd*0.5],[0.02,0.02,0.02],MATTE);/* the well's inner wall */
      // under the door, behind the wheel: the black step box with two treads (the cab no longer floats), the cab's floor tub over the frame
      box(B,[0.29,1.03,sd*0.8],[0.34,0.26,0.19],BK,MATTE);for(const [y,dz] of [[0.78,0.07],[1.04,0.04]])box(B,[0.3,y,sd*(0.99+dz)],[0.26,0.018,0.08],[0.16,0.16,0.17],CHROME);
      box(B,[-0.02,1.1,sd*0.98],[0.012,0.2,0.012],BK,MATTE);}
    box(B,[(C0+C1)/2,1.3,0],[(C0-C1)/2-0.04,0.16,0.9],BK,MATTE);
    for(const sd of [-1,1]){
      surf(B,(a,z)=>{const r=0.74,x=ax[1]+Math.cos(a)*r,y=0.72+Math.sin(a)*r*0.95;return[x,y,sd*lerp(0.8,1.1,z)];},range(0.2,Math.PI-0.2,12),range(0,1,2),()=>[BK,MATTE]);
      box(B,[ax[1]-0.72,0.58,sd*0.96],[0.015,0.3,0.15],BK,MATTE);}
  };
  // the tipper (BD-ZT-26): ribbed drop sides, chevron boards on the tailgate; the mesh guard over the headboard and the side step and
  // toolbox of the restored one; tail lamps, plate, rear power take-off
  const unimog=()=>{const B=vmesh(),{ax,OR,ORd,YL,RDc,AMB}=UM;umFront(B,{});
    const B0=-0.26,B1=-2.52,bw=1.04,fy=1.4,sh=0.4;box(B,[(B0+B1)/2,fy,0],[(B0-B1)/2,0.04,bw],OR,PAINT);box(B,[(B0+B1)/2,fy-0.2,0],[(B0-B1)/2-0.05,0.16,0.5],BK,MATTE);
    for(const sd of [-1,1]){box(B,[(B0+B1)/2,fy+sh/2,sd*bw],[(B0-B1)/2,sh/2,0.02],OR,PAINT);for(let k=0;k<3;k++)box(B,[(B0+B1)/2,fy+0.09+k*0.12,sd*(bw+0.02)],[(B0-B1)/2-0.02,0.025,0.012],ORd,PAINT);box(B,[(B0+B1)/2,fy+sh,sd*bw],[(B0-B1)/2,0.02,0.035],ORd,PAINT);
      for(const x of [B0+0.4,(B0+B1)/2,B1+0.4])box(B,[x,fy+0.05,sd*(bw+0.03)],[0.03,0.04,0.02],[0.2,0.2,0.2],MATTE);}
    box(B,[B0,fy+0.3,0],[0.03,0.3,bw],OR,PAINT);box(B,[B1,fy+sh/2,0],[0.02,sh/2,bw],OR,PAINT);for(let k=0;k<3;k++)box(B,[B1-0.02,fy+0.09+k*0.12,0],[0.012,0.025,bw-0.02],ORd,PAINT);
    for(const sd of [-1,1]){const zc=sd*0.72;for(let k=0;k<4;k++){const z0=zc-0.24+k*0.12;quad(B,[B1-0.035,fy+0.08,z0],[B1-0.035,fy+0.08,z0+0.06],[B1-0.035,fy+0.33,z0+0.12],[B1-0.035,fy+0.33,z0+0.06],k%2?YL:RDc,4);}}
    // the mesh guard: an orange tube frame standing on the headboard up to the roof, with a fine mesh
    const gx=B0+0.06,g0=fy+0.6,g1=2.74;for(const sd of [-1,1])box(B,[gx,(g0+g1)/2+0.05,sd*0.98],[0.03,(g1-g0)/2+0.05,0.03],OR,PAINT);box(B,[gx,g1,0],[0.03,0.03,1.0],OR,PAINT);box(B,[gx,(g0+g1)/2,0],[0.02,(g1-g0)/2,0.02],OR,PAINT);
    for(let k=1;k<20;k++){const z=-0.98+k*0.098;box(B,[gx,(g0+g1)/2,z],[0.006,(g1-g0)/2,0.004],ORd,PAINT);}for(let k=1;k<12;k++)box(B,[gx,g0+k*(g1-g0)/12,0],[0.006,0.004,0.97],ORd,PAINT);
    // side step (a black tube frame from the door step back to the toolbox) and the toolbox under the front of the bed (left)
    box(B,[-0.3,1.05,-0.86],[0.32,0.22,0.14],BK,MATTE);box(B,[-0.3,1.05,-1.002],[0.3,0.2,0.004],[0.12,0.12,0.13],MATTE);tube(B,[0.62,0.8,-1.02],[-0.2,0.78,-1.02],0.02,0.02,6,BK,MATTE);tube(B,[0.62,0.8,-1.02],[0.62,1.0,-1.0],0.02,0.02,6,BK,MATTE);box(B,[0.3,0.78,-1.0],[0.2,0.015,0.07],[0.2,0.2,0.2],MATTE);
    for(const sd of [-1,1]){box(B,[B1+0.05,1.02,sd*0.82],[0.03,0.06,0.1],[0.85,0.06,0.05],4);box(B,[B1+0.05,0.92,sd*0.82],[0.03,0.03,0.1],AMB,4);}
    box(B,[B1+0.12,0.9,-0.5],[0.01,0.1,0.2],YL,PAINT);box(B,[B1+0.11,0.9,-0.5],[0.003,0.09,0.18],[0.08,0.08,0.08],3);box(B,[B1+0.15,0.86,0.15],[0.08,0.12,0.18],[0.12,0.12,0.13],MATTE);
    return B;};
  // ================================================================ the rail maintenance Unimog (4.61): the same Unimog, municipal orange, with a flat
  // deck carrying welding bottles, a hydraulic tank and the operator's seat under a roof frame, a backhoe on a swing post at the back
  // with two stabiliser legs, warning stripes; rail guide wheels front and back (drawn apart: they lower). The backhoe's swing frame,
  // boom, stick and bucket are separate meshes (they move).
  const unirail=()=>{const B=vmesh(),{OR,ORd,YL,RDc,AMB}=UM;umFront(B,{rail:true});
    const B0=-0.26,B1=-2.62,bw=1.04,fy=1.42;box(B,[(B0+B1)/2,fy,0],[(B0-B1)/2,0.04,bw],[0.42,0.42,0.44],CHROME);box(B,[(B0+B1)/2,fy-0.2,0],[(B0-B1)/2-0.05,0.16,0.5],BK,MATTE);/* chequer-plate deck */
    for(const sd of [-1,1]){box(B,[(B0+B1)/2,fy+0.1,sd*bw],[(B0-B1)/2,0.1,0.02],OR,PAINT);for(let k=0;k<10;k++){const x0=B0-0.05-k*0.21;quad(B,[x0,fy+0.02,sd*(bw+0.022)],[x0-0.1,fy+0.02,sd*(bw+0.022)],[x0-0.21,fy+0.18,sd*(bw+0.022)],[x0-0.11,fy+0.18,sd*(bw+0.022)],k%2?[0.95,0.95,0.95]:RDc,4);}}
    box(B,[B0,fy+0.35,0],[0.03,0.35,bw],OR,PAINT);/* headboard */
    // welding bottles (oxygen blue, acetylene maroon) in a rack behind the cab, the hydraulic tank and a toolbox
    for(const [z,c] of [[0.75,[0.15,0.3,0.6]],[0.55,[0.5,0.1,0.1]]]){tube(B,[B0-0.15,fy+0.05,z],[B0-0.15,fy+1.05,z],0.09,0.09,12,c,PAINT,true);ball(B,[B0-0.15,fy+1.08,z],0.09,[1,0.6,1],c,PAINT,10);tube(B,[B0-0.15,fy+1.1,z],[B0-0.15,fy+1.2,z],0.025,0.025,6,[0.7,0.6,0.3],CHROME);}
    box(B,[B0-0.15,fy+0.55,0.65],[0.04,0.03,0.25],BK,MATTE);box(B,[B0-0.35,fy+0.3,-0.6],[0.2,0.3,0.35],OR,PAINT);box(B,[-1.2,fy+0.22,0.75],[0.35,0.2,0.22],[0.12,0.12,0.13],MATTE);
    tube(B,[B0-0.15,fy+0.5,0.75],[-1.5,fy+0.1,0.9],0.012,0.012,4,[0.6,0.1,0.1],MATTE);/* welding hose */
    // the operator's seat facing back, the control levers, a roof frame over it (like the photos' excavator Unimogs)
    box(B,[-1.85,fy+0.35,0],[0.22,0.05,0.25],[0.15,0.15,0.16],INT);box(B,[-1.62,fy+0.65,0],[0.05,0.3,0.25],[0.15,0.15,0.16],INT);box(B,[-1.85,fy+0.18,0],[0.15,0.15,0.15],BK,MATTE);
    for(const z of [-0.3,0.3]){box(B,[-2.15,fy+0.55,z],[0.08,0.25,0.08],[0.12,0.12,0.13],MATTE);tube(B,[-2.15,fy+0.8,z],[-2.2,fy+1.0,z],0.012,0.012,4,BK,MATTE);ball(B,[-2.2,fy+1.02,z],0.03,[1,1,1],RDc,MATTE,8);}
    person(B,-1.95,fy+0.4,0,[0.95,0.75,0.1],[0.95,0.75,0.1]);
    for(const x of [-1.4,-2.4])for(const z of [-0.85,0.85])box(B,[x,fy+0.7,z],[0.03,0.7,0.03],OR,PAINT);box(B,[-1.9,fy+1.42,0],[0.56,0.03,0.92],OR,PAINT);box(B,[-1.9,fy+1.46,0],[0.5,0.012,0.86],[0.14,0.14,0.15],MATTE);
    beaconAt(B,[-1.5,fy+1.47,0.75]);
    // the swing post bracket at the back, two stabiliser legs (folded up), warning stripes and lamps on the rear beam
    box(B,[B1-0.12,1.15,0],[0.14,0.3,0.32],OR,PAINT);box(B,[B1-0.05,0.95,0],[0.06,0.1,1.02],BK,MATTE);
    for(const sd of [-1,1]){box(B,[B1-0.05,1.15,sd*0.95],[0.07,0.25,0.07],OR,PAINT);tube(B,[B1-0.05,1.4,sd*0.95],[B1-0.05,0.55,sd*0.95],0.05,0.05,8,[0.7,0.7,0.72],CHROME);box(B,[B1-0.05,0.52,sd*0.95],[0.14,0.03,0.12],BK,MATTE);
      box(B,[B1+0.02,1.0,sd*0.75],[0.03,0.06,0.1],[0.85,0.06,0.05],4);box(B,[B1+0.02,0.9,sd*0.75],[0.03,0.03,0.1],AMB,4);}
    for(let k=0;k<8;k++){const z0=-0.6+k*0.15;quad(B,[B1-0.115,0.86,z0+0.075],[B1-0.115,0.86,z0],[B1-0.115,1.05,z0+0.075],[B1-0.115,1.05,z0+0.15],k%2?[0.95,0.95,0.95]:RDc,4);}
    box(B,[B1-0.02,0.82,-0.5],[0.01,0.08,0.18],YL,PAINT);
    return B;};
  const beaconAt=(B,c)=>{tube(B,c,add(c,[0,0.06,0]),0.09,0.09,12,BK,MATTE,true);tube(B,add(c,[0,0.06,0]),add(c,[0,0.25,0]),0.085,0.07,14,UM.AMB,4,true);};
  /* the rail guide wheels: a pair of flanged steel wheels on an axle at the track gauge (1.435 m, so 1.913 in this 0.75 model), a beam and
     two hydraulic posts; origin = the axle centre (it is drawn lowered or raised) */
  const railGear=()=>{const M=vmesh(),g=1.435/2/RV_SCALE,r=0.25,ST=[0.55,0.55,0.58];tube(M,[0,0,-g-0.1],[0,0,g+0.1],0.05,0.05,8,BK,MATTE);
    for(const sd of [-1,1]){const z=sd*g;tube(M,[0,0,z-0.06],[0,0,z+0.06],r,r,18,ST,CHROME,true);tube(M,[0,0,z-sd*0.075],[0,0,z-sd*0.06],r+0.045,r+0.045,18,ST,CHROME,true);/* the flange inside */
      box(M,[0,0.35,sd*(g-0.25)],[0.06,0.35,0.06],UM.OR,PAINT);tube(M,[0,0.55,sd*(g-0.25)],[0,1.05,sd*(g-0.25)],0.04,0.04,8,[0.75,0.75,0.78],CHROME);}
    box(M,[0,0.25,0],[0.08,0.06,g-0.2],UM.OR,PAINT);return M;};
  /* the backhoe, in four moving parts. swing: on the post (origin the pivot); boom: from its foot pivot, reaching along -x with a bend;
     stick: from the boom tip, hanging along -y; bucket: from the stick tip */
  const BH={L1:2.5,L2:1.65};
  const bhSwing=()=>{const M=vmesh();box(M,[0,0,0],[0.14,0.3,0.24],UM.OR,PAINT);tube(M,[0,-0.32,0],[0,0.32,0],0.1,0.1,12,BK,MATTE,true);for(const sd of [-1,1])box(M,[-0.16,0.22,sd*0.12],[0.1,0.1,0.02],UM.OR,PAINT);return M;};
  const bhBoom=()=>{const M=vmesh(),L=BH.L1,K=[-0.95,0.42,0];
    const fix=(a,b,h,w)=>{/* a closed beam: top and bottom faces span -w..w */const d=sub(b,a),l=Math.hypot(...d),u=d.map(v=>v/l),n=[-u[1],u[0],0];
      for(const sg of [1,-1]){const o=mul(n,h*sg);quad(M,add(add(a,o),[0,0,-w]),add(add(b,o),[0,0,-w]),add(add(b,o),[0,0,w]),add(add(a,o),[0,0,w]),UM.OR,PAINT);}
      for(const z of [w,-w])quad(M,add(a,add(mul(n,-h),[0,0,z])),add(a,add(mul(n,h),[0,0,z])),add(b,add(mul(n,h),[0,0,z])),add(b,add(mul(n,-h),[0,0,z])),UM.OR,PAINT);};
    fix([0,0,0],K,0.12,0.1);fix(K,[-L,0.05,0],0.1,0.09);tube(M,[-0.25,0.2,0],[-0.95,0.62,0],0.045,0.035,8,[0.75,0.75,0.78],CHROME);tube(M,[-1.05,0.58,0],[-1.7,0.3,0],0.04,0.03,8,[0.75,0.75,0.78],CHROME);
    for(const p of [[0,0,0],[-L,0.05,0]])tube(M,add(p,[0,0,-0.12]),add(p,[0,0,0.12]),0.05,0.05,8,BK,MATTE,true);return M;};
  const bhStick=()=>{const M=vmesh(),L=BH.L2;box(M,[0,-L/2+0.1,0],[0.08,L/2+0.1,0.07],UM.OR,PAINT);tube(M,[0.1,0.2,0],[0.1,-L*0.75,0],0.035,0.03,8,[0.75,0.75,0.78],CHROME);tube(M,[0,-L,-0.1],[0,-L,0.1],0.045,0.045,8,BK,MATTE,true);return M;};
  const bhBucket=()=>{const M=vmesh(),D=[0.3,0.3,0.32];/* opens toward -x; teeth along the lip */
    quad(M,[0,0,-0.3],[0,0,0.3],[-0.4,-0.15,0.3],[-0.4,-0.15,-0.3],D,MATTE);quad(M,[-0.4,-0.15,-0.3],[-0.4,-0.15,0.3],[-0.45,-0.45,0.3],[-0.45,-0.45,-0.3],D,MATTE);
    for(const z of [-0.3,0.3]){const s=Math.sign(z);quad(M,[0,0,z],[-0.4,-0.15,z],[-0.45,-0.45,z],[-0.05,-0.3,z],UM.OR,PAINT);void s;}
    for(let k=0;k<5;k++){const z=-0.24+k*0.12;box(M,[-0.06,-0.36,z],[0.06,0.025,0.025],[0.5,0.5,0.52],CHROME);}return M;};
  // the Unimog's wheel: a wide lugged tyre on a black steel rim (turns about z)
  const uwheel=(side)=>{const M=vmesh(),r=0.56,w=0.19,R0=r-0.16;
    surf(M,(a,b)=>{const c=Math.cos(b),s=Math.sin(b);return[Math.cos(a)*(R0+0.16*Math.max(0,c)+0.16*(c<0?c*0.2:0)+0.0*s),Math.sin(a)*(R0+0.16*Math.max(0,c)),w*s];},range(0,Math.PI*2,32),range(0,Math.PI*2,14),()=>[TY,MATTE],{ev:1e-3});
    for(let k=0;k<26;k++){const a=k/26*Math.PI*2,c=Math.cos(a),s=Math.sin(a),off=(k%2?1:-1)*0.05;for(const sd of [-1,1]){const z0=sd*0.02+off,z1=sd*(w*0.95);const P=(rr,da,z)=>[Math.cos(a+da)*rr,Math.sin(a+da)*rr,z];
        box(M,[c*(r+0.012),s*(r+0.012),(z0+z1)/2],[0.024,0.022,Math.abs(z1-z0)/2],[0.03,0.03,0.035],MATTE);void P;}}
    const face=z=>side*z;surf(M,(rr,a)=>[Math.cos(a)*rr,Math.sin(a)*rr,face(0.1+0.04*(1-rr/R0))],[0.05,R0*0.6,R0*0.98],range(0,Math.PI*2,24),()=>[[0.05,0.05,0.055],PAINT]);
    for(let k=0;k<6;k++){const a=k/6*Math.PI*2;tube(M,[Math.cos(a)*0.12,Math.sin(a)*0.12,face(0.12)],[Math.cos(a)*0.12,Math.sin(a)*0.12,face(0.16)],0.02,0.018,6,[0.12,0.12,0.12],MATTE,true);}
    tube(M,[0,0,face(0.1)],[0,0,face(0.2)],0.08,0.06,14,[0.06,0.06,0.07],MATTE,true);return M;};
  return {blitz,bus,wheel,unimog,uwheel,unirail,railGear,bhSwing,bhBoom,bhStick,bhBucket,BH};})();
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
  type(b){return b.type==='unirail'?'unirail':b.type==='unimog'?'unimog':b.goods?'blitz':b.type==='dd'?'dd':'bus';},spec(b){return RV[this.type(b)];},
  /* the height a wheel stands at. Over a tunnel there are two levels (the road in the tube, the ground above): ref, the vehicle's own last
     height, picks the nearer one; without it, the tube only when the point is inside a tunnel's mouth zone is not known, so the surface wins */
  gy(x,z,ref){const T=R.world,hk=T.hole?clamp(Math.floor(z/T.cs),0,T.N-1)*T.N+clamp(Math.floor(x/T.cs),0,T.N-1):-1,g=hk>=0&&T.hole[hk]===2?(T.Hr||T.H)[hk]:R.drawnH(T,x,z),/* a tunnel mouth's cells are left out of the drawn ground: their own level (the apron, the block top) */tu=Life.tunY?Life.tunY(x,z):null,dk=Life.deckY?Life.deckY(x,z,ref):-1e9,rd=Life.roadY?Life.roadY(x,z,ref):null;let y=Math.max(g,dk,rd==null?-1e9:rd);
    /* stacked levels (a bridge over a road, a road on its wall over the ground, a road over a tunnel): the one nearest the vehicle's own height */
    if(ref!=null){let bd=Math.abs(ref-g);y=g;for(const c of [dk>g-0.5?dk:null,rd,tu]){if(c!=null&&Math.abs(ref-c)<bd){bd=Math.abs(ref-c);y=c;}}}
    const d=this.drv;if(d&&d.swim&&Math.abs(x-d.x)<10&&Math.abs(z-d.z)<10){const w=sampleWater(T,clamp(x,0,T.W),clamp(z,0,T.W));if(w[1]>0)y=Math.max(y,w[0]-0.9);}/* the driven vehicle floats in the water */return y;},
  // meshes are made once (after the GL context): a body per type (two reds for the lorry), wheels per type and side, and a far version
  // with the wheels merged in (one draw call)
  build(){const U=m=>R.uploadVeh(m),cat=(...ms)=>{const M=vmesh();for(const [m,off] of ms){const b=M.n;for(let k=0;k<m.n;k++){const o=k*14;M.v.push(m.v[o]+off[0],m.v[o+1]+off[1],m.v[o+2]+off[2],...m.v.slice(o+3,o+14));}for(const i of m.i)M.i.push(i+b);M.n+=m.n;}return M;};
    const W={blitz:[0.62,0.04,0.035],bus:[0.55,0.07,0.05],dd:[0.06,0.06,0.07]},out={};
    for(const ty of ['blitz','bus','dd','unimog','unirail']){const S=RV[ty],bodies=ty==='blitz'?[RVMesh.blitz([0.92,0.035,0.025]),RVMesh.blitz([0.68,0.03,0.035])]:ty==='unimog'?[RVMesh.unimog()]:ty==='unirail'?[RVMesh.unirail()]:[RVMesh.bus(ty==='dd'?2:1)];
      const um=ty==='unimog'||ty==='unirail',wR=um?RVMesh.uwheel(1):RVMesh.wheel(S.r,W[ty],1,false),wL=um?RVMesh.uwheel(-1):RVMesh.wheel(S.r,W[ty],-1,false),wRi=um?wL:RVMesh.wheel(S.r,W[ty],-1,true),wLi=um?wR:RVMesh.wheel(S.r,W[ty],1,true);
      const wp=[];for(const sd of [-1,1]){wp.push([sd<0?wL:wR,[S.axF,S.r,sd*S.trF]]);S.trR.forEach((t,i)=>wp.push([i===0&&S.trR.length>1?(sd<0?wLi:wRi):(sd<0?wL:wR),[S.axR,S.r,sd*t]]));}
      out[ty]={body:bodies.map(U),far:bodies.map(b=>U(cat([b,[0,0,0]],...wp))),wL:U(wL),wR:U(wR),wLi:U(wLi),wRi:U(wRi)};}
    out.parts={gear:U(RVMesh.railGear()),swing:U(RVMesh.bhSwing()),boom:U(RVMesh.bhBoom()),stick:U(RVMesh.bhStick()),bucket:U(RVMesh.bhBucket())};/* the rail Unimog's moving parts */
    this.M=out;},
  // lettering for one vehicle (town names from its route), made the first time it is seen up close
  words(b){const s=Buses.route(b)[0],v=s&&s.v||(s?Life.nearestVillage(s.x,s.z,2000):null),town=v?v.name:'Trein';const h=Math.floor((b.hash||0.5)*997);
    if(b.goods){const N=['Bakker','de Vries','Jansen','Visser','Smit','Meijer','de Boer','Mulder','Bos','Vos','Peters','Hendriks'],I='ABCDGHJKMPW';return{town,owner:`${I[h%I.length]}. ${N[h%N.length]}`,tel:`TEL. ${10+h%90}`};}return{town};},
  text(b){const M=vmesh(),w=this.words(b),gold=[0.98,0.86,0.5],cream=[0.98,0.94,0.82],ty=this.type(b);
    if(ty==='blitz'){for(const sd of [-1,1])rvText(M,[{t:w.owner,font:'italic bold PX Georgia',h:0.17},{t:'VRACHTRIJDERIJ',font:'bold PX Arial',h:0.065},{t:w.tel,font:'bold PX Arial',h:0.06},{t:w.town.toUpperCase(),font:'bold PX Arial',h:0.08}],{x:-0.06,y:1.5,z:sd*0.935,col:cream,px:110});}
    else if(ty==='dd'){for(const sd of [-1,1]){rvText(M,[{t:`${w.town.toUpperCase()} COACH COMPANY`,font:'bold PX Georgia',h:0.13}],{x:-1.1,y:1.27,z:sd*1.207,col:gold,px:90});rvText(M,[{t:`${w.town} Transit`,font:'bold PX Georgia',h:0.2}],{x:-0.6,y:2.66,z:sd*1.216,col:[0.03,0.2,0.09],px:80});}}
    else if(ty==='unimog'||ty==='unirail'){for(const sd of [-1,1])rvText(M,[{t:ty==='unirail'?'BAANONDERHOUD':'GEMEENTE',font:'bold PX Arial',h:0.07},{t:w.town.toUpperCase(),font:'bold PX Arial',h:0.1}],{x:0.86,y:1.7,z:sd*1.008,col:[0.06,0.06,0.07],px:110});}
    else for(const sd of [-1,1])rvText(M,[{t:`${w.town.toUpperCase()} AUTOBUSDIENST`,font:'bold PX Georgia',h:0.13}],{x:-1.0,y:1.26,z:sd*1.187,col:[0.98,0.88,0.6],px:90});
    return M.n?R.uploadVeh(M):null;},
  // ---- the frame of a vehicle: chassis on the ground under its wheels, the body on its springs (heave h, pitch p, roll r)
  frame(b){const S=this.spec(b),k=RV_SCALE,h=b.rot,c=Math.cos(h),s=Math.sin(h),zx=-s,zz=c,P=(ax,tr)=>this.gy(b.x+c*ax*k+zx*tr*k,b.z+s*ax*k+zz*tr*k,b._gy);
    const RL=b.rail&&b.rail.on?b.rail:null,tr=S.trF,fl=RL?RL.yF:P(S.axF,-tr),fr=RL?RL.yF:P(S.axF,tr),rl=RL?RL.yR:P(S.axR,-tr),rr=RL?RL.yR:P(S.axR,tr),wb=(S.axF-S.axR)*k,pitch=Math.atan2((fl+fr)/2-(rl+rr)/2,wb),roll=Math.atan2((fl+rl)/2-(fr+rr)/2,2*tr*k);
    const y=(fl+fr+rl+rr)/4+(b.hz||0),q=Q.mul(Q.mul(Q.axis([0,1,0],-h),Q.axis([0,0,1],pitch)),Q.axis([1,0,0],roll)),sp=b._s||{h:0,p:0,r:0};
    const qb=Q.mul(Q.mul(q,Q.axis([0,0,1],sp.p)),Q.axis([1,0,0],sp.r)),cg=[0,1.1,0],oc=[b.x,y,b.z],a=Q.rot(q,cg),bb=Q.rot(qb,cg),hv=Q.rot(q,[0,sp.h,0]);
    const ob=[oc[0]+(a[0]-bb[0]+hv[0])*k,oc[1]+(a[1]-bb[1]+hv[1])*k,oc[2]+(a[2]-bb[2]+hv[2])*k];return{q,qb,oc,ob,k};},
  mat(q,o,k,off,extra){const qq=extra?Q.mul(q,extra):q,X=Q.rot(qq,[k,0,0]),Y=Q.rot(qq,[0,k,0]),Z=Q.rot(qq,[0,0,k]),d=off?Q.rot(q,off):[0,0,0];
    return new Float32Array([X[0],X[1],X[2],0,Y[0],Y[1],Y[2],0,Z[0],Z[1],Z[2],0,o[0]+d[0]*k,o[1]+d[1]*k,o[2]+d[2]*k,1]);},
  draw(p,pass){if(!App.T||!Buses.list.length)return;if(!this.M)this.build();const cp=Cam.pos||[0,0,0],pl=pass===1?null:Cam.planes;
    const dm=(m,mat)=>{if(!m)return;gl.uniformMatrix4fv(p.u('uModel'),false,mat);gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,0);Stats.draws++;Stats.tris+=m.count/3;};
    gl.uniform1f(p.u('uDist'),0);
    for(const b of Buses.list){const d=Math.hypot(b.x-cp[0],b.z-cp[2]);if(d>(pass===1?400:1800))continue;const S=this.spec(b),Lh=S.len*RV_SCALE/2+1;
      const gyb=this.gy(b.x,b.z,b._gy);if(pl&&!boxVisible(pl,b.x-Lh,gyb-2,b.z-Lh,b.x+Lh,gyb+5,b.z+Lh))continue;
      const ty=this.type(b),MS=this.M[ty],vi=ty==='blitz'?((b.hash*7.3)%1<0.5?0:1):0,F=this.frame(b),k=F.k;
      if(ty==='unirail'&&d<600)this.drawRail(b,F,dm);/* 4.61: guide wheels and backhoe */
      if(d>140&&b!==this.sel&&b!==this.drv){dm(MS.far[vi],this.mat(F.q,F.oc,k));continue;}
      dm(MS.body[vi],this.mat(F.qb,F.ob,k));
      if(d<350){if(b._txt===undefined)b._txt=this.text(b);if(b._txt)dm(b._txt,this.mat(F.qb,F.ob,k));}
      // wheels: on the chassis (they follow the ground), turning with the distance driven; the front ones steer
      const spin=Q.axis([0,0,1],-(b._spin||0)),st=b._steer||0;
      for(const sd of [-1,1]){dm(sd<0?MS.wL:MS.wR,this.mat(F.q,F.oc,k,[S.axF,S.r,sd*S.trF],Q.mul(Q.axis([0,1,0],-st),spin)));
        S.trR.forEach((t,i)=>dm(i===0&&S.trR.length>1?(sd<0?MS.wLi:MS.wRi):(sd<0?MS.wL:MS.wR),this.mat(F.q,F.oc,k,[S.axR,S.r,sd*t],spin)));}}},
  /* the rail Unimog's moving parts: guide wheels front and back (raised 0.6 m above the rail when on the road), and the backhoe chain
     swing post (yaw) → boom (a1) → stick (a2) → bucket (a3), all in the body's frame */
  drawRail(b,F,dm){const PS=this.M.parts,k=F.k,r=Upkeep.ensure(b),lw=r.lower,A=r.arm,BH=RVMesh.BH,add=(a,c)=>[a[0]+c[0],a[1]+c[1],a[2]+c[2]];
    for(const x of [2.5,-2.3])dm(PS.gear,this.mat(F.q,F.oc,k,[x,lerp(0.68,0.25,lw),0]));
    const SP=[-2.86,1.25,0],qt=Q.axis([0,1,0],A.yaw),bp=add(SP,Q.rot(qt,[-0.16,0.22,0])),qb=Q.mul(qt,Q.axis([0,0,1],A.a1)),sp=add(bp,Q.rot(qb,[-BH.L1,0.05,0])),qs=Q.mul(qb,Q.axis([0,0,1],A.a2)),kp=add(sp,Q.rot(qs,[0,-BH.L2,0])),qk=Q.mul(qs,Q.axis([0,0,1],A.a3));
    dm(PS.swing,this.mat(F.qb,F.ob,k,SP,qt));dm(PS.boom,this.mat(F.qb,F.ob,k,bp,qb));dm(PS.stick,this.mat(F.qb,F.ob,k,sp,qs));dm(PS.bucket,this.mat(F.qb,F.ob,k,kp,qk));},
  // ---- suspension and wheels, every frame: near vehicles (or the one followed or driven) bounce on their springs
  update(dt){if(!App.T)return;const cp=Cam.pos||[0,0,0];
    if(this.drv)this.driveStep(dt);
    for(const b of Buses.list){const S=this.spec(b),k=RV_SCALE,v=b.manual?(b.mv||0):(b.st==='drive'?b.v:0);b._gy=this.gy(b.x,b.z,b._gy);
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
    if(this.sel&&this.cam==='follow'){const b=this.sel,y=this.gy(b.x,b.z,b._gy)+1.5;Cam.mode='free';{const z=this.zoomOut;if(z){z.t=Math.min(1,z.t+dt/1.8);const f=z.t*z.t*(3-2*z.t);Cam.dist=lerp(z.d0,z.d1,f);Cam.pitch=lerp(z.p0,z.p1,f);if(z.t>=1)this.zoomOut=null;}}Cam.target[0]+=(b.x-Cam.target[0])*Math.min(1,dt*6);Cam.target[2]+=(b.z-Cam.target[2])*Math.min(1,dt*6);Cam.target[1]=y;}
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
    if(this.cam==='cab'){const e=b.goods?[0.68,1.92,-0.4]:/* the lorry: just ahead of the windscreen over the bonnet (the cab has no inside) */b.type==='dd'?[RV.dd.axF-0.6,1.95,-0.6]:[RV.bus.axF-0.4,1.95,-0.6];p=P(e);look=P([e[0]+20,e[1]-1.2,e[2]]);cab=true;}
    else if(this.cam==='wheel'){p=P([S.axF+2.8,0.75,S.trF+2.3]);look=P([S.axR-0.5,0.7,S.trF]);cab=true;}/* low beside the front wheel, looking back along the side: the springs at work */
    else{const fw=[Math.cos(b.rot),0,Math.sin(b.rot)],back=(b.manual&&(b.mv||0)<-0.5)?-1:1,want=[b.x-fw[0]*11*back,F.oc[1]+4.2,b.z-fw[2]*11*back];if(!this.cp||Math.hypot(this.cp[0]-want[0],this.cp[2]-want[2])>40)this.cp=want.slice();const a=Math.min(1,dt*3);for(let i=0;i<3;i++)this.cp[i]+=(want[i]-this.cp[i])*a;p=this.cp.slice();look=[b.x+fw[0]*3,F.oc[1]+1.2,b.z+fw[2]*3];}
    const gh=this.gy(p[0],p[2],F.oc[1])+0.4;if(p[1]<gh)p[1]=gh;return{p,look,cab};},
  panel(on){let el=$('#rvPanel');if(!el){el=document.createElement('div');el.id='rvPanel';document.body.appendChild(el);el.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;const a=t.dataset.a,b=this.sel;if(!b&&a!=='x')return;
        if(a==='x')this.close();else if(a==='cam')this.nextCam();else if(a==='stops'){BusUI.open=true;BusUI.ed=b;BusUI.refresh();}else if(a==='drive')this.startDriving(b);else if(a==='back')this.stopDriving();else if(a==='rstop'){Upkeep.stopJob(b);this.refresh();}else if(a==='fly'){Cam.setMode('free');Cam.flyTo([b.x,this.gy(b.x,b.z),b.z],30);}});}
    el.hidden=!on;},
  refresh(){const el=$('#rvPanel');if(!el||el.hidden||!this.sel)return;const b=this.sel,S=this.spec(b),R2=Buses.route(b);
    let load='';if(b.goods){const c=b.cargo||{},parts=Object.keys(c).filter(t=>c[t]&&c[t].n>=1).map(t=>`${Math.floor(c[t].n)} ${Goods.T[t].icon}`);load=parts.length?parts.join(' '):'empty';}else load=`🧍 ${b.pax?b.pax.length:0} / ${S.cap}`;
    const cams={off:'Camera: off',follow:'📷 Follow',chase:'📷 Behind',cab:'📷 Driver',wheel:'📷 Wheel'};
    const h=`<div class="rv-h"><div><b>${esc(b.name)}</b><span>${S.name}${b.manual?' · you drive':''}</span></div><button data-a="x" aria-label="Close">✕</button></div>
      <div class="rv-r">${esc(b.type==='unirail'?Upkeep.status(b)+(b.manual?' · driven by you':''):b.manual?'Driven by you':Buses.status(b))}</div><div class="rv-r">${load} · ${Math.round(Math.abs(b.manual?b.mv||0:b.st==='drive'?b.v:0)/RV_SCALE*3.6)} km/h</div>
      <div class="rv-r">Earned <b>€ ${Money.fmt?Money.fmt(Math.round(b.earned||0)):Math.round(b.earned||0)}</b> · ${b.trips||0} stops served · route of ${R2.length} stops</div>
      <div class="rv-b"><button data-a="cam">${cams[this.cam]||'📷'}</button>${b.type==='unirail'?(b.rail&&b.rail.job?'<button data-a="rstop">✖ Stop repair</button>':''):'<button data-a="stops">Change stops</button>'}${b.manual?'<button data-a="back" class="go">Back to the route</button>':'<button data-a="drive" class="go">Drive it</button>'}</div>`;
    if(el._h!==h){el.innerHTML=h;el._h=h;}},
  tick(){const t=performance.now();if(this.sel&&!(this._rt>t-300)){this._rt=t;this.refresh();}if(this.drv)this.hud();},
  // ---- driving it yourself: the touch joystick (left/right steers, up accelerates, down brakes and then reverses) or a controller
  // (left stick steers, RT accelerates, LT brakes/reverses, A horn, B camera, Y back to the route). Off the roads it is slower and bumpier;
  // water stops it. "Back to the route" hands it back: it plans from where it stands to its next stop and carries on.
  startDriving(b){if(Plane.on)Plane.exit();if(Build.active)Build.exit();if(Drive.active)Drive.exit();this.drv=b;b.manual=true;b.mv=b.st==='drive'?b.v:0;b.st='drive';b.queued=null;this.sel=b;
    this.setCam('chase');this.ui(true);UI.toast('You drive '+b.name+': joystick to steer and drive, or a controller (left stick, RT, LT)');this.refresh();},
  /* stop driving: the free camera takes over exactly where the driving camera was (behind or in the cab), then glides out to a view from
     above and behind and keeps following the vehicle back to its route */
  stopDriving(){const b=this.drv;if(!b)return;b.manual=false;b.mv=0;b.v=0;b.path=null;b.st='drive';b.offRoad=false;this.drv=null;this.ui(false);
    if(this.sel){const eye=(Cam.pos||[b.x,0,b.z]).slice(),gy=this.gy(b.x,b.z,b._gy)+1.5;this.setCam('follow');Cam.anim=null;Cam.target=[b.x,gy,b.z];const d=[eye[0]-b.x,eye[1]-gy,eye[2]-b.z],L=Math.max(2,Math.hypot(...d));
      Cam.dist=L;Cam.pitch=clamp(Math.asin(clamp(d[1]/L,-1,1)),0.05,1.4);Cam.yaw=Math.atan2(d[0],d[2]);this.zoomOut={t:0,d0:L,d1:Math.max(48,L),p0:Cam.pitch,p1:0.5};}UI.toast(b.type==='unirail'?b.name+(b.rail&&b.rail.on?(b.rail.job?' carries on repairing the line':' stays on the rails (trains wait for it): lower it onto a level crossing to leave the line free'):' parks here'):b.name+' goes back to its route');this.refresh();},
  ui(on){let el=$('#rvUI');if(!el){el=document.createElement('div');el.id='rvUI';el.innerHTML='<div id="rvHud"></div><div id="rvTop"><button data-a="min">🙈 Hide</button><button data-a="cam">📷 Camera</button><button data-a="horn">📯 Horn</button><button data-a="hop">⤒ Hop</button><span id="rvRail"></span><button data-a="back" class="go">Back to the route</button></div><div id="rvStickWrap"><div id="rvStick"><div id="rvKnob"></div></div></div>';document.body.appendChild(el);
      el.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;if(t.dataset.a==='cam')this.nextCam();else if(t.dataset.a==='horn')this.horn();else if(t.dataset.a==='hop')this.hop();else if(t.dataset.a==='back')this.stopDriving();else if(t.dataset.a==='rdown'){Upkeep.lower(this.drv);this.railBtns(true);}else if(t.dataset.a==='rup'){Upkeep.raise(this.drv);this.railBtns(true);}else if(t.dataset.a==='rfix'){Upkeep.startJob(this.drv,false);this.railBtns(true);}else if(t.dataset.a==='rstop'){Upkeep.stopJob(this.drv);this.railBtns(true);}else if(t.dataset.a==='min'){const on=!document.body.classList.contains('rvmin');document.body.classList.toggle('rvmin',on);t.textContent=on?'👁 Show':'🙈 Hide';}});
      const st=el.querySelector('#rvStick'),kn=el.querySelector('#rvKnob');let id=null;const mv=ev=>{const r=st.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,Rr=r.width/2-14;let dx=(ev.clientX-cx)/Rr,dy=(ev.clientY-cy)/Rr;const l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l;}
        this.inp.steer=dx;this.inp.gas=Math.min(1,Math.max(0,-dy)*1.4);this.inp.brake=Math.min(1,Math.max(0,dy)*1.4);/* full gas before the edge of the ring */this.inp.touch=true;kn.style.transform=`translate(${dx*Rr}px,${dy*Rr}px)`;};
      st.onpointerdown=ev=>{ev.preventDefault();id=ev.pointerId;st.setPointerCapture(id);mv(ev);};st.onpointermove=ev=>{if(ev.pointerId===id)mv(ev);};st.onpointerup=st.onpointercancel=ev=>{if(ev.pointerId!==id)return;id=null;this.inp.steer=this.inp.gas=this.inp.brake=0;this.inp.touch=false;kn.style.transform='';};}
    el.hidden=!on;document.body.classList.toggle('roaddrive',on);if(!on)document.body.classList.remove('rvmin');},
  /* the rail Unimog's buttons while driving: rail wheels down (only over a track lying level with the ground) or up, repair / stop */
  railBtns(force){const el=$('#rvRail'),b=this.drv;if(!el)return;let h='';if(b&&b.type==='unirail'){const r=b.rail;if(r&&r.on){h=`<button data-a="rup">⬆ Road wheels</button>${r.job?'<button data-a="rstop">✖ Stop repair</button>':'<button data-a="rfix" class="go">🔧 Repair track</button>'}`;}
      else{const t=performance.now();if(force||!(this._rbT>t-400)){this._rbT=t;this._rbOk=Upkeep.canLower(b);}h=this._rbOk?'<button data-a="rdown" class="go">⬇ Rail wheels</button>':'<button disabled title="Drive onto a level crossing or along track lying level with the ground">⬇ Rail wheels</button>';}}
    if(el._h!==h){el.innerHTML=h;el._h=h;}const bk=document.querySelector('#rvTop [data-a="back"]');if(bk){const tx=b&&b.type==='unirail'?'Get out':'Back to the route';if(bk.textContent!==tx)bk.textContent=tx;}},
  hud(){const b=this.drv,el=$('#rvHud');if(!el)return;this.railBtns();if(b.rail&&b.rail.on){el.innerHTML=`<b>${Math.round(Math.abs(b.rail.v)*3.6)}</b> km/h · ${esc(Upkeep.status(b))} · ${esc(b.name)}`;return;}el.innerHTML=`<b>${Math.round(Math.abs(b.mv||0)/RV_SCALE*3.6)}</b> km/h${(b.mv||0)<-0.3?' · reverse':''}${b.offRoad?' · off the road':''} · ${esc(b.name)}`;},
  /* a hop: up it goes (about 1.2 m), no grip in the air (no throttle or brake, a little steering), and the springs take the landing */
  /* a vehicle's outline (half length, half width) at x,z heading rot against the houses' plots: front and back corners and mid sides */
  hitsHouse(x,z,rot,hl,hw){const c=Math.cos(rot),sn=Math.sin(rot);for(const h of Life.houses){if(h.gone||!h.rect||Math.abs(h.x-x)>hl+h.r+4||Math.abs(h.z-z)>hl+h.r+4)continue;if(!Life.plotOn(h))continue;
      for(const [u,w] of [[hl,-hw],[hl,0],[hl,hw],[-hl,-hw],[-hl,hw],[0,-hw],[0,hw]])if(VG.inRect(h.rect,x+c*u-sn*w,z+sn*u+c*w,-0.8))return true;}return false;},/* the plot less its hedge line, so a street past the gate stays free */
  hop(){const b=this.drv;if(!b||(b.hz||0)>0.02)return;b.hvz=4.9;b.hz=0.03;},
  horn(){const c=Sfx.ctx;if(!c||!Sfx.on)return;const t=c.currentTime,g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.18,t+0.03);g.gain.setValueAtTime(0.18,t+0.45);g.gain.linearRampToValueAtTime(0,t+0.55);g.connect(Sfx.master);
    for(const f of [392,494]){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f;const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1800;o.connect(lp);lp.connect(g);o.start(t);o.stop(t+0.6);}},
  padPoll(){const g=typeof Pad!=='undefined'?Pad.vp:null;if(!g)return;/* the virtual controller (pad.js) */
    const bt=i=>{const x=g.buttons[i];return x?(typeof x==='object'?(x.value||(x.pressed?1:0)):+x):0;},pr=i=>bt(i)>0.5,ed=i=>pr(i)&&!this.pad.prev[i],ax=v=>Math.abs(v)<0.12?0:(v-Math.sign(v)*0.12)/0.88;
    const sx=ax(g.axes[0]||0),gas=bt(7),brk=bt(6);if(sx||gas>0.05||brk>0.05){this.inp.steer=sx;this.inp.gas=gas;this.inp.brake=brk;this.pad.act=true;}else if(this.pad.act&&!this.inp.touch){this.inp.steer=this.inp.gas=this.inp.brake=0;this.pad.act=false;}
    if(ed(0))this.horn();if(ed(1))this.nextCam();if(ed(2))this.hop();if(ed(3))this.stopDriving();this.pad.prev=g.buttons.map((x,i)=>pr(i));},
  driveStep(dt){const b=this.drv;if(!b||!Buses.list.includes(b)){this.drv=null;this.ui(false);return;}this.padPoll();if(!this.drv)return;
    if(b.rail&&b.rail.on){Upkeep.drive(b,dt,this.inp);return;}/* 4.61: on the rails */
    const S=this.spec(b),k=RV_SCALE,T=App.T,I=this.inp,wb=(S.axF-S.axR)*k;let v=b.mv||0;
    // on a road? (the road mask used by the routing), and the slope along the heading
    const cs=T.cs,ci=clamp(Math.floor(b.x/cs),0,T.N-1),cj=clamp(Math.floor(b.z/cs),0,T.N-1),onRoad=!!(Life.roadKill&&Life.roadKill[cj*T.N+ci])||(b._gy!=null&&(Life.tunY(b.x,b.z)!=null||Math.abs(Life.deckY(b.x,b.z,b._gy)-b._gy)<0.8));/* a bridge deck or a tunnel is road too */b.offRoad=!onRoad;
    const fw=[Math.cos(b.rot),Math.sin(b.rot)],h0=this.gy(b.x-fw[0]*2,b.z-fw[1]*2,b._gy),h1=this.gy(b.x+fw[0]*2,b.z+fw[1]*2,b._gy),slope=Math.atan2(h1-h0,4);
    const um=!!S.off,amax=um?3.4:b.goods?3.0:2.0,vmax=(um?(onRoad?24:17):b.goods?(onRoad?26:12):(onRoad?17:8))*k,/* the lorry: about 70 km/h on the road; the Unimog ~80, and 60 off it */roll=(onRoad?0.12:um?0.16:0.35)+0.0015*v*v;/* off the road: more resistance than on it, but less than the engine at part throttle */
    const air=(b.hz||0)>0.02;if(b.hz>0||b.hvz){b.hvz=(b.hvz||0)-9.81*dt;b.hz=(b.hz||0)+b.hvz*dt;if(b.hz<=0){if(b.hvz<-2.5&&b._s){b._s.hv+=b.hvz*0.06;b._s.pv+=(Math.random()-0.5)*0.4;}b.hz=0;b.hvz=0;}}
    let a=0;if(I.gas>0.02&&!air)a+=I.gas*amax*(v<-0.3?3:1)*(v>vmax?0:1);if(I.brake>0.02&&!air){if(v>0.4)a-=I.brake*6;else a-=I.brake*amax*0.7*(v<-4*k?0:1);}
    a-=Math.sign(v)*Math.min(Math.abs(v)/dt,roll)+9.81*Math.sin(slope)*(um?0.4:0.6);/* the Unimog's low gears climb */if(Math.abs(v)<0.05&&I.gas<0.02&&I.brake<0.02&&Math.abs(slope)<0.25){a=0;v=0;}
    v+=a*dt;if(v>vmax&&I.gas<0.02)v-=Math.min(v-vmax,3*dt);
    const want=I.steer*0.6/(1+Math.abs(v)/(9*k))*(air?0.25:1);b._steer=(b._steer||0)+(want-(b._steer||0))*Math.min(1,dt*6);
    const nr=b.rot+v/wb*Math.tan(b._steer)*dt,nx=b.x+Math.cos(nr)*v*dt,nz=b.z+Math.sin(nr)*v*dt;
    const water=(x,z)=>{const w=sampleWater(T,clamp(x,0,T.W),clamp(z,0,T.W));return w[1]>0&&w[0]>R.sampleHr(T,x,z)+0.25;};
    const ahead=[nx+Math.cos(nr)*S.len*k*0.5*Math.sign(v||1),nz+Math.sin(nr)*S.len*k*0.5*Math.sign(v||1)];
    // driven by hand it may go into the water: it floats like an amphibian (slow, the body half under), throwing spray; only the edge of the world stops it
    const inW=water(b.x,b.z);b.swim=inW;if(!inW&&!water(ahead[0],ahead[1]))b.wetToast=false;if(inW){const vw=5.2*k;if(Math.abs(v)>vw)v-=Math.sign(v)*Math.min(Math.abs(v)-vw,6*dt);if(Math.abs(v)>0.8&&Math.random()<dt*25){const w=sampleWater(T,b.x,b.z);Particles.spawn(b.x+(Math.random()-0.5)*2,w[0]+0.2,b.z+(Math.random()-0.5)*2,-Math.cos(b.rot)*Math.sign(v)*1.5+(Math.random()-0.5),1.5+Math.random()*1.5,-Math.sin(b.rot)*Math.sign(v)*1.5+(Math.random()-0.5),1.4,0.7,2.2,0);}}
    /* parapets and tunnel walls: from a bridge deck, a tunnel or a road on its wall, a move that would drop the vehicle more than 1.5 m (over
       the side) is not made; it scrapes along and slows. Off the structures, or in the air after a hop, nothing holds it */
    const yNow=b._gy,yNew=this.gy(nx,nz,yNow),onStruct=yNow!=null&&(Life.deckY(b.x,b.z,yNow)>-1e8&&Math.abs(Life.deckY(b.x,b.z,yNow)-yNow)<0.6||(Life.tunY(b.x,b.z)!=null&&Math.abs(Life.tunY(b.x,b.z)-yNow)<0.6)||(Life.roadY(b.x,b.z,yNow)!=null&&R.drawnH(T,b.x,b.z)<yNow-1.5));
    if(onStruct&&!air&&yNew<yNow-1.5){v*=0.6;b.rot=nr;if(Math.abs(v)>2&&!b.railToast){b.railToast=true;UI.toast('The parapet holds you');setTimeout(()=>b.railToast=false,3000);}}
    else if(ahead[0]<10||ahead[1]<10||ahead[0]>T.W-10||ahead[1]>T.W-10){if(Math.abs(v)>1)UI.toast('The edge of the world');v=0;}else{if(this.hitsHouse(nx,nz,nr,S.len*k*0.5,1.25*k)){/* houses are solid: it stops against the wall and rocks back a little */if(Math.abs(v)>1.5){if(Sfx.clunk)Sfx.clunk();if(b._s)b._s.pv+=0.25*Math.sign(v);}v=-v*0.2;}else{b.x=nx;b.z=nz;b.rot=nr;}}
    b.mv=v;b.v=Math.abs(v);b._gy=this.gy(b.x,b.z,b._gy);Ledger.add(b,'km',Math.abs(v)*dt/1000);}};
