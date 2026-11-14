'use strict';
// ===== PLANE model (4.15.0) — rebuilt from the user's three photos (Nov 2026): the red D17S Staggerwing with dark-red and gold lightning-bolt
// pinstripes, polished cowling lip, nine-cylinder radial behind it, big chrome spinner, glossy red paint, I-struts with flying and landing
// wires, oleo main gear with the big outer fairing plates (they fold aft into the lower wing roots with the legs), a cabin you can see into
// (glass, two seats, instrument panel, pilot and passenger) and a rounded fin and rudder.
// Body frame: x forward, y up, z right; origin at the CG. Surfaces are parametric (lofts and aerofoils) with smooth normals; paint stripes and
// window frames are thin decals a few millimetres proud of the skin. Parts that move are separate meshes; their hinges are in PLANE_PARTS.
const PL={span:9.75,len:8.18,S:27.5,m:1900,P:336000,cg:[0,0,0],
  // contact points in body frame (gear down): left/right main wheels, tailwheel (about 11.6° nose up on the ground); gear up: the belly
  wheels:[[1.15,-1.9,-1.0],[1.15,-1.9,1.0],[-4.45,-0.75,0]],belly:[[1.1,-0.95,-0.7],[1.1,-0.95,0.7],[-4.4,-0.2,0],[2.4,-0.8,0]],
  gearHinge:[1.05,-0.78],gearZ:1.0,propX:3.07,eye:[0.5,0.6,-0.27]};
const PLANE_PARTS={};
function planeMeshes(){
  const RD=[0.80,0.045,0.035],RDd=[0.55,0.03,0.025],MR=[0.30,0.025,0.04],GD=[0.96,0.74,0.30],CH=[0.92,0.92,0.94],AL=[0.62,0.62,0.64],BK=[0.04,0.04,0.045],
    TY=[0.05,0.05,0.055],GLs=[0.55,0.62,0.66],INT=[0.40,0.34,0.28],SEAT=[0.33,0.19,0.12],DK=[0.12,0.12,0.13],ENG=[0.30,0.30,0.32],SKIN=[0.86,0.63,0.50],
    SHIRT=[0.14,0.28,0.66],SHIRT2=[0.85,0.85,0.82],HAIR=[0.25,0.18,0.12],PAINT=11,CHROME=10,GLASS=2,MATTE=3,INTM=7;
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],
    crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],nrm=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l];},lerp=(a,b,t)=>a+(b-a)*t;
  const V=(M,p,n,c,m)=>{M.v.push(p[0],p[1],p[2],n[0],n[1],n[2],c[0],c[1],c[2],0,0,0,1,m);return M.n++;};
  // a grid surface: f(u,v) → point; normals from central differences (so they are smooth), one colour and material per quad from paint(u,v)
  // (null leaves the quad out); flip turns the normals round (the shader lights both sides, so it only matters for the interior)
  const surf=(M,f,us,vs,paint,o)=>{o=o||{};const nu=us.length,nv=vs.length,P=[],N=[],eu=o.eu||1e-4,ev=o.ev||1e-4;
    for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const u=us[i],v=vs[j],p=f(u,v);let du=sub(f(u+eu,v),f(u-eu,v)),dv=sub(f(u,v+ev),f(u,v-ev));
      if(Math.hypot(...du)<1e-9)du=sub(f(u+eu*50,v),f(u-eu*50,v));if(Math.hypot(...dv)<1e-9)dv=sub(f(u,v+ev*50),f(u,v-ev*50));let n=nrm(crs(du,dv));if(o.flip)n=mul(n,-1);P.push(p);N.push(n);}
    for(let i=0;i+1<nu;i++)for(let j=0;j+1<nv;j++){const pc=paint?paint((us[i]+us[i+1])/2,(vs[j]+vs[j+1])/2):[RD,PAINT];if(!pc)continue;
      const k=[i*nv+j,(i+1)*nv+j,(i+1)*nv+j+1,i*nv+j+1],ix=k.map(q=>V(M,P[q],N[q],pc[0],pc[1]));M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);}};
  const range=(a,b,n)=>{const r=[];for(let i=0;i<=n;i++)r.push(a+(b-a)*i/n);return r;};
  const cosr=(n)=>{const r=[];for(let i=0;i<=n;i++)r.push(0.5-0.5*Math.cos(Math.PI*i/n));return r;};// clustered at both ends (leading and trailing edges)
  // monotone cubic interpolation through a table [[x,y],...] (no overshoot between the points)
  const mono=T=>{T=T.slice().sort((a,b)=>a[0]-b[0]);const n=T.length,xs=T.map(t=>t[0]),ys=T.map(t=>t[1]),d=[],m=new Array(n);for(let i=0;i<n-1;i++)d.push((ys[i+1]-ys[i])/(xs[i+1]-xs[i]));
    m[0]=d[0];m[n-1]=d[n-2];for(let i=1;i<n-1;i++)m[i]=d[i-1]*d[i]<=0?0:(d[i-1]+d[i])/2;for(let i=0;i<n-1;i++){if(d[i]===0){m[i]=m[i+1]=0;continue;}const a=m[i]/d[i],b=m[i+1]/d[i],h=a*a+b*b;if(h>9){const t=3/Math.sqrt(h);m[i]=t*a*d[i];m[i+1]=t*b*d[i];}}
    return x=>{if(x<=xs[0])return ys[0];if(x>=xs[n-1])return ys[n-1];let i=0;while(x>xs[i+1])i++;const h=xs[i+1]-xs[i],t=(x-xs[i])/h,t2=t*t,t3=t2*t;return(2*t3-3*t2+1)*ys[i]+(t3-2*t2+t)*h*m[i]+(-2*t3+3*t2)*ys[i+1]+(t3-t2)*h*m[i+1];};};
  // simple pieces with smooth sides: a tube between two points (radius r0 → r1), a sphere (squashed by s), a revolved profile around x
  const tube=(M,a,b,r0,r1,n,col,mat,cap)=>{const ax=nrm(sub(b,a)),h=Math.abs(ax[1])<0.9?[0,1,0]:[1,0,0],u=nrm(crs(ax,h)),w=crs(ax,u);
    surf(M,(s,t)=>{const r=lerp(r0,r1,s),c=Math.cos(t),sn=Math.sin(t);return add(add(a,mul(sub(b,a),s)),add(mul(u,c*r),mul(w,sn*r)));},[0,1],range(0,Math.PI*2,n),()=>[col,mat]);
    if(cap)for(const [p,r,sg] of [[a,r0,-1],[b,r1,1]]){const c0=V(M,p,mul(ax,sg),col,mat);for(let k=0;k<n;k++){const t0=k/n*Math.PI*2,t1=(k+1)/n*Math.PI*2,q0=add(p,add(mul(u,Math.cos(t0)*r),mul(w,Math.sin(t0)*r))),q1=add(p,add(mul(u,Math.cos(t1)*r),mul(w,Math.sin(t1)*r)));M.i.push(c0,V(M,q0,mul(ax,sg),col,mat),V(M,q1,mul(ax,sg),col,mat));}}};
  const ball=(M,c,r,s,col,mat,n)=>{n=n||12;s=s||[1,1,1];surf(M,(a,b)=>[c[0]+Math.cos(b)*Math.cos(a)*r*s[0],c[1]+Math.sin(b)*r*s[1],c[2]+Math.cos(b)*Math.sin(a)*r*s[2]],range(0,Math.PI*2,n),range(-Math.PI/2,Math.PI/2,Math.ceil(n/2)),()=>[col,mat],{ev:1e-3});};
  const revolve=(M,prof,n,paint,yc)=>{yc=yc||0;const L=prof.length;
    surf(M,(u,t)=>{const i=Math.max(0,Math.min(L-2,Math.floor(u))),k=u-i,x=lerp(prof[i][0],prof[i+1][0],k),r=lerp(prof[i][1],prof[i+1][1],k);return[x,yc+Math.sin(t)*r,Math.cos(t)*r];},range(0,L-1,L-1),range(0,Math.PI*2,n),paint||null,{eu:1e-3});};
  // ---------------------------------------------------------------- fuselage: one loft from the cowling lip to the rudder hinge
  // sections are superellipses: centre height, half height, half width, exponent (2 = round at the cowling, squarer along the cabin)
  const xLip=3.02,xTail=-4.62,xCowl=1.95;
  const cowlR=mono([[3.02,0.625],[2.98,0.655],[2.9,0.678],[2.75,0.69],[2.4,0.686],[2.1,0.678],[1.95,0.672]]);
  const yT=mono([[1.95,0.672],[1.78,0.69],[1.6,0.72],[1.35,0.82],[1.1,0.93],[0.9,0.98],[0.4,0.995],[-0.3,0.985],[-0.85,0.93],[-1.5,0.82],[-2.4,0.67],[-3.4,0.52],[-4.2,0.42],[-4.62,0.385]]);
  const yB=mono([[1.95,-0.672],[1.7,-0.715],[1.2,-0.765],[0.0,-0.775],[-0.8,-0.735],[-1.8,-0.6],[-3.0,-0.37],[-4.0,-0.13],[-4.62,0.04]]);
  const hW=mono([[1.95,0.672],[1.6,0.665],[1.0,0.64],[0.2,0.605],[-0.6,0.555],[-1.6,0.455],[-2.8,0.325],[-3.8,0.205],[-4.3,0.13],[-4.62,0.075]]);
  const eX=mono([[1.95,2.0],[1.55,2.4],[0.9,2.9],[-0.5,2.9],[-2.0,2.5],[-4.62,2.2]]);
  const sec=x=>{if(x>=xCowl){const r=cowlR(x);return[0,r,r,2];}const t=yT(x),b=yB(x);return[(t+b)/2,(t-b)/2,hW(x),eX(x)];};
  const pw=(c,e)=>Math.sign(c)*Math.pow(Math.abs(c),2/e);
  const F=(x,th)=>{const s=sec(x);return[x,s[0]+s[1]*pw(Math.sin(th),s[3]),s[2]*pw(Math.cos(th),s[3])];};
  const FN=(x,th)=>{const du=sub(F(x+1e-4,th),F(x-1e-4,th)),dv=sub(F(x,th+1e-3),F(x,th-1e-3));return nrm(crs(du,dv)).map(v=>v);};
  const outN=(x,th)=>{let n=FN(x,th);const p=F(x,th),s=sec(x);if((p[1]-s[0])*n[1]+p[2]*n[2]<0)n=mul(n,-1);return n;};
  // a point on the skin seen from the side: (x, y) on the right (sd 1) or left (sd -1) side, pushed out by off along the normal
  const side=(x,y,sd,off)=>{const s=sec(x);let q=clamp((y-s[0])/s[1],-0.999,0.999);const th=Math.asin(Math.sign(q)*Math.pow(Math.abs(q),s[3]/2)),thS=sd>0?th:Math.PI-th;
    return add(F(x,thS),mul(outN(x,thS),off||0));};
  // windows (side view, right side; mirrored on the left) and the windscreen; the skin is left open there, glass and frames go on top
  const W1=[[1.33,0.31],[1.21,0.79],[1.0,0.875],[0.13,0.875],[0.13,0.31]],W2=[[0.02,0.31],[0.02,0.875],[-0.5,0.85],[-0.92,0.66],[-0.95,0.42],[-0.78,0.31]];
  const inPoly=(P,x,y)=>{let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};
  const wsX=th=>1.585-0.26*Math.pow(Math.cos(th),2),wsT=0.62;// windscreen: from the roof (x 0.97) down to this line; across the top between θ 0.62 and π-0.62
  const inWS=(x,th)=>x>0.97&&x<wsX(th)&&th>wsT&&th<Math.PI-wsT;
  const sideWin=(x,th)=>{const p=F(x,th),s=sec(x);if(Math.abs(p[2])<s[2]*0.55)return false;return inPoly(W1,x,p[1])||inPoly(W2,x,p[1]);};
  const body=vmesh();
  {const xs=[];for(let x=xTail;x<xLip-1e-6;x+=0.05)xs.push(x);xs.push(xLip);
    surf(body,F,xs,range(0,Math.PI*2,88),(x,th)=>{if(inWS(x,th)||sideWin(x,th))return null;return[RD,PAINT];},{ev:1e-3});
    // the tail end: a small cap behind the rudder hinge
    {const s=sec(xTail),c0=V(body,[xTail-0.01,s[0],0],[-1,0,0],RD,PAINT);for(let k=0;k<32;k++){const a=F(xTail,k/32*Math.PI*2),b=F(xTail,(k+1)/32*Math.PI*2);body.i.push(c0,V(body,b,[-1,0,0],RD,PAINT),V(body,a,[-1,0,0],RD,PAINT));}}
    // glass: the same skin where the windows are, in the transparent pass
    const gl2=body;surf(gl2,F,xs.filter(x=>x>-1.0&&x<1.6),range(0,Math.PI*2,88),(x,th)=>inWS(x,th)||sideWin(x,th)?[GLs,GLASS]:null,{ev:1e-3});}
  // ---- decals: a ribbon along a side-view polyline (x, y), perpendicular offset dy, half width hw; mitred corners (the bolt's points)
  const ribbon=(M,pts,dy,hw,col,mat,sd,off)=>{const n=pts.length,nm=[];for(let i=0;i<n;i++){const a=pts[Math.max(0,i-1)],b=pts[Math.min(n-1,i+1)],c=pts[i];
      const d0=i>0?nrm([c[0]-a[0],c[1]-a[1],0]):null,d1=i<n-1?nrm([b[0]-c[0],b[1]-c[1],0]):null,p0=d0?[-d0[1],d0[0]]:null,p1=d1?[-d1[1],d1[0]]:null;
      let m=p0&&p1?[p0[0]+p1[0],p0[1]+p1[1]]:(p0||p1);const ml=Math.hypot(m[0],m[1])||1;m=[m[0]/ml,m[1]/ml];const ref=p1||p0,cosh=Math.max(0.25,m[0]*ref[0]+m[1]*ref[1]);nm.push([m[0]/cosh,m[1]/cosh]);}
    // resample each segment so the ribbon follows the curved skin
    let prv=null;for(let i=0;i+1<n;i++){const a=pts[i],b=pts[i+1],L=Math.hypot(b[0]-a[0],b[1]-a[1]),k=Math.max(1,Math.ceil(L/0.04));
      for(let j=0;j<=k;j++){if(i>0&&j===0)continue;const t=j/k,c=[lerp(a[0],b[0],t),lerp(a[1],b[1],t)],m=[lerp(nm[i][0],nm[i+1][0],t),lerp(nm[i][1],nm[i+1][1],t)];
        const hi=side(c[0]+m[0]*(dy+hw),c[1]+m[1]*(dy+hw),sd,off),lo=side(c[0]+m[0]*(dy-hw),c[1]+m[1]*(dy-hw),sd,off),q=[V(M,hi,[0,0,sd],col,mat),V(M,lo,[0,0,sd],col,mat)];/* normals: decalNormals */
        if(prv)M.i.push(prv[0],prv[1],q[1],prv[0],q[1],q[0]);prv=q;}}};
  // fix the decal normals afterwards: each decal vertex takes the skin normal under it
  const decalNormals=(M,from)=>{for(let k=from;k<M.n;k++){const o=k*14,x=M.v[o],y=M.v[o+1],z=M.v[o+2],s=sec(x),sd=z>=0?1:-1;let q=clamp((y-s[0])/s[1],-0.999,0.999);const th=Math.asin(Math.sign(q)*Math.pow(Math.abs(q),s[3]/2)),n=outN(x,sd>0?th:Math.PI-th);M.v[o+3]=n[0];M.v[o+4]=n[1];M.v[o+5]=n[2];}};
  const d0=body.n;
  for(const sd of [-1,1]){
    // the lightning bolt: from the cowling back along the side, a sharp step forward and down under the cabin, then aft, narrowing to the tail
    const bolt=[[2.9,0.29],[1.33,0.215],[1.55,0.0],[0.2,-0.07],[-1.2,-0.1],[-2.8,0.0],[-4.35,0.17]];
    for(const [dy,hw,col] of [[0.064,0.008,GD],[0.03,0.024,MR],[-0.004,0.008,GD],[-0.033,0.013,MR],[-0.054,0.006,GD]])ribbon(body,bolt,dy,hw*(1),col,PAINT,sd,0.006);
    // the cowling's speed lines: a dark-red band with gold edges stepping back from the lip
    for(const [dy,hw,col] of [[0.0,0.018,MR],[0.026,0.005,GD],[-0.026,0.005,GD]])ribbon(body,[[2.97,0.47],[2.55,0.47],[2.45,0.39],[2.0,0.39]],dy,hw,col,PAINT,sd,0.006);
    // window frames (red mouldings over the cut edges of the skin)
    for(const W of [W1,W2])ribbon(body,[...W,W[0],W[1]],0,0.03,RDd,PAINT,sd,0.01);}
  // windscreen frame: along its bottom edge and its sides (in loft coordinates)
  {const fr=(pts)=>{let prv=null;for(const [x,th] of pts){const n=outN(x,th),p=add(F(x,th),mul(n,0.01)),tg=nrm(crs(n,[1,0,0])),a=add(p,mul(tg,0.028)),b=add(p,mul(tg,-0.028)),q=[V(body,a,n,RDd,PAINT),V(body,b,n,RDd,PAINT)];if(prv)body.i.push(prv[0],prv[1],q[1],prv[0],q[1],q[0]);prv=q;}};
    const bot=[];for(let k=0;k<=40;k++){const th=wsT+(Math.PI-2*wsT)*k/40;bot.push([wsX(th),th]);}const fb=[];for(const [x,th] of bot){const n=outN(x,th),p=add(F(x,th),mul(n,0.01)),d=nrm(sub(F(x+0.03,th),F(x-0.03,th)));fb.push([p,n,d]);}
    let prv=null;for(const [p,n,d] of fb){const q=[V(body,add(p,mul(d,0.03)),n,RDd,PAINT),V(body,add(p,mul(d,-0.03)),n,RDd,PAINT)];if(prv)body.i.push(prv[0],prv[1],q[1],prv[0],q[1],q[0]);prv=q;}
    for(const th of [wsT,Math.PI-wsT,Math.PI/2]){const pts=[];for(let k=0;k<=12;k++){const x=lerp(0.96,wsX(th),k/12);pts.push([x,th]);}if(th===Math.PI/2)continue;fr(pts);}}
  decalNormals(body,d0);
  // ---------------------------------------------------------------- cowling lip, engine, exhausts
  // the lip turns in from the outer skin to the opening; a polished ring at its front, dark inside
  revolve(body,[[3.02,0.625],[3.04,0.6],[3.045,0.575],[3.035,0.55],[3.0,0.528],[2.9,0.52],[2.7,0.515]],48,(u)=>u<1?[RD,PAINT]:u<2.5?[GD,CHROME]:u<3.5?[RDd,PAINT]:[DK,MATTE]);
  revolve(body,[[2.72,0.52],[2.72,0.24]],32,()=>[DK,MATTE]);// baffle behind the cylinders
  revolve(body,[[2.7,0.25],[2.86,0.25],[2.98,0.2],[3.02,0.15]],20,()=>[ENG,1]);// crankcase and nose case
  for(let k=0;k<9;k++){const a=k/9*Math.PI*2+0.17,c=Math.cos(a),s=Math.sin(a),P=r=>[2.84,s*r,c*r];
    tube(body,P(0.22),P(0.31),0.075,0.075,10,ENG,1);for(let f=0;f<7;f++){const r0=0.31+f*0.022;tube(body,P(r0),P(r0+0.01),0.083,0.083,10,[0.38,0.38,0.4],1);}// finned barrel
    tube(body,P(0.46),P(0.5),0.07,0.06,10,[0.36,0.36,0.38],1,true);// head
    for(const dz of [-0.04,0.04])tube(body,[2.9,s*0.24+c*dz,c*0.24-s*dz],[2.9,s*0.46+c*dz,c*0.46-s*dz],0.009,0.009,5,CH,CHROME);}// pushrods
  // exhaust collector ring stub and the stack under the cowling
  tube(body,[2.1,-0.62,0.28],[1.55,-0.7,0.33],0.055,0.05,10,DK,MATTE,true);tube(body,[2.1,-0.62,-0.28],[1.55,-0.7,-0.33],0.055,0.05,10,DK,MATTE,true);
  // ---------------------------------------------------------------- wings and tail: aerofoils
  // NACA 4-digit: thickness th, camber m at p; returns [upper, lower] offsets as a fraction of chord at chord fraction t (0 = leading edge)
  const foilY=(t,th,m,p)=>{const yt=5*th*(0.2969*Math.sqrt(Math.max(t,0))-0.126*t-0.3516*t*t+0.2843*t*t*t-0.1036*t*t*t*t),yc=m?(t<p?m/(p*p)*(2*p*t-t*t):m/((1-p)*(1-p))*(1-2*p+2*p*t-t*t)):0;return[yc+yt,yc-yt];};
  // a lifting surface along a span parameter s (0..1): LE(s), TE(s) as points; up(s) the thickness direction; th, camber; t from t0 to t1
  const lift=(M,LE,TE,UP,th,cm,ss,t0,t1,paint,nt)=>{nt=nt||14;const ts=cosr(nt).map(t=>t0+(t1-t0)*t);
    for(const sg of [1,-1])surf(M,(s,t)=>{const a=LE(s),b=TE(s),c=Math.hypot(...sub(a,b)),y=foilY(t,th,cm,0.4)[sg>0?0:1],u=UP(s);return add(add(a,mul(sub(b,a),t)),mul(u,y*c));},ss,ts,paint||(()=>[RD,PAINT]),{eu:1e-4,ev:1e-4});
    if(t1<0.999)surf(M,(s,k)=>{const a=LE(s),b=TE(s),c=Math.hypot(...sub(a,b)),f=foilY(t1,th,cm,0.4),u=UP(s),p=add(a,mul(sub(b,a),t1));return add(p,mul(u,lerp(f[1],f[0],k)*c));},ss,[0,1],()=>[RDd,PAINT]);// spar face at the hinge
    if(t0>0.001)surf(M,(s,k)=>{const a=LE(s),b=TE(s),c=Math.hypot(...sub(a,b)),f=foilY(t0,th,cm,0.4),u=UP(s),p=add(a,mul(sub(b,a),t0));return add(p,mul(u,lerp(f[1],f[0],k)*c));},ss,[0,1],()=>[RDd,PAINT]);};
  // wing planform: straight taper, then an elliptic tip that sweeps the leading edge back; sd = side
  const wingPF=(o)=>{const sr=o.sr||0.82,LE=(s,sd)=>{const z=o.z0+s*(o.semi-o.z0),q=s>sr?Math.min(1,(s-sr)/(1-sr)):0,cl=lerp(o.c0,o.c1,Math.min(s,sr)/sr),cs=cl*Math.max(0.03,Math.sqrt(1-q*q)),xm=lerp(o.x0-o.c0/2,o.x0-o.c0/2-o.sw,Math.min(s,sr)/sr)-0.22*q*q*cl,y=o.y0+z*o.dih;return[[xm+cs/2,y,sd*z],[xm-cs/2,y,sd*z]];};return LE;};
  const spanS=(n,sr)=>{const r=[];for(let i=0;i<=n;i++){const t=i/n;r.push(t<0.6?t/0.6*sr:sr+(1-sr)*(1-Math.pow(1-(t-0.6)/0.4,1.6)));}return r;};
  const upper=wingPF({x0:0.85,c0:1.62,c1:1.3,semi:4.875,z0:0,y0:1.075,dih:0.035,sw:0.05}),lower=wingPF({x0:1.55,c0:1.55,c1:1.25,semi:4.875,z0:0.3,y0:-0.66,dih:0.07,sw:0.05});
  const parts={};const hingeOf=(PF,s,t,sd)=>{const p=PF(s,sd);return add(p[0],mul(sub(p[1],p[0]),t));};
  const sAil=[0.42,0.86],tAil=0.74,sFlap=[0.06,0.4],tFlap=0.78;
    for(const sd of [-1,1]){const U=s=>[0,1,0],LEu=s=>upper(s,sd)[0],TEu=s=>upper(s,sd)[1],LEl=s=>lower(s,sd)[0],TEl=s=>lower(s,sd)[1];
    const ss=spanS(30,0.82),inA=ss.filter(s=>s<=sAil[0]+1e-9),aS=ss.filter(s=>s>=sAil[0]-1e-9&&s<=sAil[1]+1e-9),outA=ss.filter(s=>s>=sAil[1]-1e-9);
    lift(body,LEu,TEu,U,0.15,0.02,inA,0,1,null,18);lift(body,LEu,TEu,U,0.15,0.02,aS,0,tAil,null,16);lift(body,LEu,TEu,U,0.15,0.02,outA,0,1,null,18);
    // a dark-red and gold pinstripe on top of the upper wing, parallel to the leading edge (photo 3)
    for(const [t0,t1,col] of [[0.15,0.19,MR],[0.2,0.21,GD],[0.135,0.142,GD]])surf(body,(s,t)=>{const a=LEu(s),b=TEu(s),c=Math.hypot(...sub(a,b)),y=foilY(t,0.15,0.02,0.4)[0];return add(add(a,mul(sub(b,a),t)),[0,y*c+0.006,0]);},spanS(16,0.82).filter(s=>s>=0.03&&s<=0.7),[t0,(t0+t1)/2,t1],()=>[col,PAINT]);
    const inF=ss.filter(s=>s<=sFlap[0]+1e-9),fS=ss.filter(s=>s>=sFlap[0]-1e-9&&s<=sFlap[1]+1e-9),outF=ss.filter(s=>s>=sFlap[1]-1e-9);
    lift(body,LEl,TEl,U,0.15,0.02,inF,0,1,null,16);lift(body,LEl,TEl,U,0.15,0.02,fS,0,tFlap,null,16);lift(body,LEl,TEl,U,0.15,0.02,outF,0,1,null,16);
    // ailerons (upper wing) and flaps (lower wing): own meshes around their hinge lines
    const mk=(PF,LE,TE,sr,t0,name,ns)=>{const h0=hingeOf(PF,sr[0],t0,sd),h1=hingeOf(PF,sr[1],t0,sd),org=mul(add(h0,h1),0.5),M=vmesh();const sh=f=>s=>sub(f(s),org);
      lift(M,sh(LE),sh(TE),U,0.15,0.02,ss.filter(s=>s>=sr[0]-1e-9&&s<=sr[1]+1e-9),t0,1,null,8);parts[name]={o:org,ax:nrm(sub(h1,h0)),M};};
    mk(upper,LEu,TEu,sAil,tAil,sd<0?'ailL':'ailR');mk(lower,LEl,TEl,sFlap,tFlap,sd<0?'flapL':'flapR');
    // I-strut between the wings at z 3.3: an aerofoil web flaring into wide feet at both wings
    {const zS=3.3,sl=(zS-0.3)/(4.875-0.3),su=zS/4.875,bl=lower(sl,sd),bu=upper(su,sd),pl=add(bl[0],mul(sub(bl[1],bl[0]),0.42)),pu=add(bu[0],mul(sub(bu[1],bu[0]),0.42));
      const yl=pl[1]+0.08,yu=pu[1]-0.06,hs=range(0,1,16),c=h=>0.24+0.5*Math.pow(Math.max(0,1-h/0.2),2)+0.55*Math.pow(Math.max(0,(h-0.8)/0.2),2);
      const ctr=h=>[lerp(pl[0],pu[0],h),lerp(yl,yu,h),sd*zS];
      lift(body,h=>add(ctr(h),[c(h)/2,0,0]),h=>add(ctr(h),[-c(h)/2,0,0]),h=>[0,0,1],0.12,0,hs,0,1,null,10);
      // flying wires (lower wing root to the strut top) and landing wires (upper wing root to the strut foot), two of each
      for(const dx of [-0.05,0.05]){tube(body,[1.0+dx,-0.66,sd*0.62],[pu[0]+dx,yu,sd*(zS-0.05)],0.006,0.006,4,AL,CHROME);tube(body,[0.35+dx,1.0,sd*0.5],[pl[0]+dx,yl,sd*(zS-0.05)],0.006,0.006,4,AL,CHROME);}}
    // wingtip navigation light
    {const t=upper(1,sd);ball(body,add(mul(add(t[0],t[1]),0.5),[0,0,sd*0.01]),0.03,[1,1,1],sd<0?[0.9,0.1,0.1]:[0.1,0.8,0.3],1,8);}}
  // roots: fillets where the lower wing meets the fuselage (a dark walkway at the leading edge, like the black strip in photo 2)
  for(const sd of [-1,1]){const p=lower(0.02,sd),q=lower(0.12,sd);surf(body,(s,t)=>{const a=lower(s,sd),b=add(a[0],mul(sub(a[1],a[0]),t)),c=Math.hypot(...sub(a[0],a[1])),y=foilY(t,0.15,0.02,0.4)[0];return add(b,[0,y*c+0.005,0]);},[0.0,0.06,0.12],[0.04,0.1,0.18],()=>[DK,MATTE]);}
  // tailplane and elevators (one mesh for both elevators), braced from below
  {const tp=wingPF({x0:-3.72,c0:1.02,c1:0.78,semi:1.78,z0:0,y0:0.36,dih:0,sw:0.06,sr:0.7}),tE=0.6;
    for(const sd of [-1,1]){const ss=spanS(14,0.7),LE=s=>tp(s,sd)[0],TE=s=>tp(s,sd)[1];lift(body,LE,TE,()=>[0,1,0],0.09,0,ss,0,tE,null,10);
      tube(body,[-4.05,-0.08,sd*0.1],[-4.1,0.33,sd*0.95],0.022,0.018,6,RD,PAINT);tube(body,[-4.35,1.25,0],[-4.05,0.4,sd*0.95],0.005,0.005,4,AL,CHROME);}
    const h=hingeOf(tp,0,tE,1),M=vmesh();for(const sd of [-1,1]){const ss=spanS(14,0.7);lift(M,s=>sub(tp(s,sd)[0],h),s=>sub(tp(s,sd)[1],h),()=>[0,1,0],0.09,0,ss,tE,1,null,6);}
    parts.elev={o:[h[0],h[1],0],ax:[0,0,1],M};}
  // fin and rudder: one rounded outline split at the hinge (x -4.62)
  {const xH=-4.62,top=[-4.55,1.71],LEc=y=>y<=1.25?-3.40-(y-0.3)*0.77:-4.55+(-3.40-0.95*0.77+4.55)*Math.sqrt(Math.max(0,1-Math.pow((y-1.25)/0.46,2))),
      TEc=y=>y>1.3?-4.55-0.47*Math.sqrt(Math.max(0,1-Math.pow((y-1.3)/0.41,2))):y<0.1?xH-(xH+5.02)*Math.sqrt(Math.max(0,1-Math.pow((0.1-y)/0.17,2))):-5.02;
    const ys=(a,b,n)=>range(a,b,n).map((y,i,A)=>i===A.length-1?b-0.002:y);
    lift(body,y=>[Math.max(LEc(y),xH+0.004),y,0],y=>[xH,y,0],()=>[0,0,1],0.1,0,ys(0.3,1.71,24),0,1,null,10);
    const M=vmesh();lift(M,y=>[xH-xH,y,0],y=>[Math.min(TEc(y),xH-0.004)-xH,y,0],()=>[0,0,1],0.08,0,ys(-0.07,1.71,28),0,1,null,8);
    // registration in gold on the rudder (small bars standing in for the letters)
    for(const sd of [-1,1])for(let k=0;k<5;k++)surf(M,(u,v)=>[-0.08-k*0.065-u*0.045,0.98+v*0.12,sd*0.022],[0,1],[0,1],()=>[GD,PAINT]);
    parts.rud={o:[xH,0,0],ax:[0,1,0],M};}
  // ---------------------------------------------------------------- cabin interior (seen through the glass)
  {const xs=range(-1.0,1.58,26);surf(body,(x,th)=>{const s=sec(x),k=0.955;return[x,s[0]+s[1]*k*pw(Math.sin(th),s[3]),s[2]*k*pw(Math.cos(th),s[3])];},xs,range(0,Math.PI*2,40),(x,th)=>Math.sin(th)<-0.55?[DK,MATTE]:[INT,INTM],{ev:1e-3,flip:true});
    surf(body,(x,z)=>[x,-0.42,z],[-1.0,1.5],[-0.55,0.55],()=>[DK,MATTE]);// floor
    // instrument panel with gauges, glare shield, throw-over yoke
    surf(body,(z,y)=>[1.42-0.15*(y-0.1),y,z],[-0.58,0.58],[0.1,0.5],()=>[DK,MATTE]);
    for(const [z,y,r] of [[-0.42,0.38,0.05],[-0.3,0.38,0.05],[-0.42,0.25,0.045],[-0.3,0.25,0.045],[-0.18,0.32,0.04],[0.05,0.36,0.04],[0.18,0.36,0.04],[0.32,0.3,0.05]])
      tube(body,[1.42-0.15*(y-0.1)-0.005,y,z],[1.42-0.15*(y-0.1)-0.012,y,z],r,r,12,[0.85,0.85,0.8],0,true);
    tube(body,[1.36,0.52,-0.58],[1.36,0.52,0.58],0.04,0.04,8,DK,MATTE);
    tube(body,[1.38,0.15,0],[1.05,0.12,0],0.025,0.025,6,AL,CHROME);tube(body,[1.05,0.12,0],[1.0,0.24,-0.25],0.02,0.02,6,DK,MATTE);
    tube(body,[1.0,0.24,-0.25],[0.98,0.3,-0.25],0.015,0.015,6,DK,MATTE);tube(body,[0.98,0.3,-0.36],[0.98,0.3,-0.14],0.02,0.02,6,DK,MATTE,true);
    // seats: two in front, a bench behind
    for(const [x,z,w] of [[0.4,-0.27,0.42],[0.4,0.27,0.42],[-0.45,0,1.0]]){surf(body,(u,v)=>[x+0.25-u*0.5,-0.14+0.03*u,z+(v-0.5)*w],[0,1],[0,1],()=>[SEAT,0]);
      surf(body,(u,v)=>[x-0.25-u*0.08,-0.14+u*0.6,z+(v-0.5)*w],[0,1],[0,1],()=>[SEAT,0]);}}
  // ---------------------------------------------------------------- pilot (left) and passenger (right): own meshes
  const person=(z,shirt,pilot)=>{const M=vmesh(),x=0.42;
    ball(M,[x-0.04,0.02,z],0.17,[1.0,1.35,1.15],shirt,0,12);// torso
    ball(M,[x-0.02,0.27,z],0.12,[0.9,0.5,1.6],shirt,0,10);// shoulders
    tube(M,[x,0.36,z],[x+0.01,0.43,z],0.045,0.045,8,SKIN,0);ball(M,[x+0.02,0.55,z],0.105,[1.05,1.15,0.95],SKIN,0,14);// neck, head
    ball(M,[x-0.0,0.6,z],0.105,[1.0,0.85,0.97],HAIR,0,12);// hair
    for(const dz of [-0.04,0.04])ball(M,[x+0.115,0.565,z+dz],0.03,[0.4,0.6,1.1],BK,CHROME,8);// sunglasses
    if(pilot){tube(M,[x+0.02,0.68,z-0.13],[x+0.02,0.68,z+0.13],0.02,0.02,6,DK,MATTE);for(const dz of [-0.12,0.12])tube(M,[x+0.02,0.55,z+dz],[x+0.02,0.56,z+dz*1.18],0.05,0.05,10,DK,MATTE,true);
      tube(M,[x+0.02,0.52,z-0.12],[x+0.14,0.5,z-0.05],0.008,0.008,4,DK,MATTE);}
    // arms: the pilot's hands on the yoke; the passenger's left arm resting, right hand up in a wave (photo 2)
    for(const sd of [-1,1]){const sh=[x-0.02,0.27,z+sd*0.19];let el,hd;if(pilot){el=[x+0.2,0.1,z+sd*0.2];hd=[0.97,0.3,z+sd*0.1];}else if(sd>0){el=[x+0.08,0.5,z+0.32];hd=[x+0.14,0.74,z+0.36];}else{el=[x+0.22,0.02,z-0.18];hd=[x+0.45,0.04,z-0.08];}
      tube(M,sh,el,0.05,0.045,8,shirt,0);tube(M,el,hd,0.045,0.035,8,shirt===SHIRT2?SKIN:shirt,0);ball(M,hd,0.04,[1,1,1],SKIN,0,8);}
    for(const sd of [-1,1]){tube(M,[x-0.06,-0.12,z+sd*0.08],[x+0.36,-0.08,z+sd*0.09],0.07,0.06,8,[0.2,0.2,0.24],0);tube(M,[x+0.36,-0.08,z+sd*0.09],[x+0.42,-0.4,z+sd*0.09],0.055,0.045,8,[0.2,0.2,0.24],0);}
    return M;};
  const pilotM=person(-0.27,SHIRT,true),paxM=person(0.27,SHIRT,false);
  // ---------------------------------------------------------------- propeller and spinner (turns): two polished blades, a chrome bullet spinner
  const prop=vmesh();
  {revolve(prop,[[-0.02,0.27],[0.06,0.272],[0.16,0.262],[0.26,0.23],[0.34,0.18],[0.4,0.12],[0.435,0.06],[0.445,0.0]],32,()=>[CH,CHROME]);
    for(const e of [-1,1]){const rs=range(0.22,1.3,16),tw=r=>(0.72-0.42*(r-0.22)/1.08),ch=r=>0.11+0.12*Math.sin(Math.min(1,(r-0.15)/0.75)*Math.PI*0.55)-Math.max(0,r-1.15)*0.35;
      for(const sg of [1,-1])surf(prop,(r,t)=>{const a=tw(r),c=ch(r),f=foilY(t,0.09,0.03,0.4)[sg>0?0:1],xb=(0.5-t)*c,yb=f*c;return[0.08+xb*Math.sin(a)+yb*Math.cos(a),e*r,e*(xb*Math.cos(a)-yb*Math.sin(a))];},rs,cosr(6),(r,t)=>r>1.2?[[0.95,0.78,0.15],PAINT]:sg>0?[[0.68,0.68,0.7],1]:[[0.2,0.2,0.21],MATTE]);}}
  // the blur disc (drawn in the transparent pass, faint, when the engine runs)
  const disc=vmesh();surf(disc,(r,a)=>[0.08,Math.sin(a)*r,Math.cos(a)*r],[0.3,0.8,1.3],range(0,Math.PI*2,48),()=>[[0.5,0.5,0.52],12]);
  // ---------------------------------------------------------------- main gear leg (hinge at the origin; the wheel hangs at (0.1, -0.79)), drawn twice
  const gear=sd=>{const M=vmesh(),ax=[0.1,-0.79],wz=0,oz=sd*0.17;
    tube(M,[0,0,wz],[0.06,-0.45,wz],0.065,0.06,10,RD,PAINT,true);// upper leg (faired)
    for(let k=0;k<26;k++){const a0=k*0.75,a1=(k+1)*0.75,y0=-0.42-k*0.0095,y1=-0.42-(k+1)*0.0095,P=(a,y)=>[0.065+Math.cos(a)*0.055,y,wz+Math.sin(a)*0.055];tube(M,P(a0,y0),P(a1,y1),0.009,0.009,4,CH,CHROME);}// the coil spring
tube(M,[0.065,-0.42,wz],[0.065,-0.69,wz],0.03,0.03,8,CH,CHROME);
    tube(M,[0.07,-0.68,wz],[ax[0],ax[1],wz-sd*0.12],0.04,0.035,8,RD,PAINT,true);// fork to the axle (inboard)
    // the wheel: tyre (a torus), red hub with a chrome cap, brake drum
    surf(M,(a,b)=>{const R0=0.225,r=0.105,c=Math.cos(b),s=Math.sin(b);return[ax[0]+Math.cos(a)*(R0+r*c),ax[1]+Math.sin(a)*(R0+r*c),wz+r*1.0*s];},range(0,Math.PI*2,28),range(0,Math.PI*2,12),()=>[TY,MATTE],{ev:1e-3});
    for(const s2 of [-1,1]){surf(M,(r,a)=>[ax[0]+Math.cos(a)*r,ax[1]+Math.sin(a)*r,wz+s2*(0.07+0.02*(1-r/0.2))],[0.03,0.2],range(0,Math.PI*2,20),()=>[RD,PAINT]);ball(M,[ax[0],ax[1],wz+s2*0.09],0.035,[1,1,0.5],CH,CHROME,8);}
    // the big fairing plate outboard of the wheel (closes the wheel well when retracted); a smaller one inboard on the leg
    const out=[[-0.3,0.02],[0.36,0.02],[0.44,-0.3],[0.46,-0.62],[0.4,-0.8],[0.28,-0.86],[0.0,-0.86],[-0.2,-0.74],[-0.3,-0.4]];
    {const cx=0.08,cy=-0.42;surf(M,(k,u)=>{const n=out.length,i=((Math.floor(k)%n)+n)%n,j=(i+1)%n,f=k-Math.floor(k),p=[lerp(out[i][0],out[j][0],f),lerp(out[i][1],out[j][1],f)];return[cx+(p[0]-cx)*u,cy+(p[1]-cy)*u,oz+sd*0.012*(1-u*u)];},range(0,out.length,out.length*3),[0,0.5,0.85,1],()=>[RD,PAINT],{eu:1e-3});
      for(let i=0;i<out.length;i++){const a=out[i],b=out[(i+1)%out.length];surf(M,(f,d)=>[lerp(a[0],b[0],f),lerp(a[1],b[1],f),oz-sd*0.012+d*sd*0.012],[0,1],[0,1],()=>[RDd,PAINT]);}}
    tube(M,[-0.02,-0.66,wz],[-0.42,-0.05,wz],0.022,0.022,6,RD,PAINT);// drag brace
    return M;};
  const tailw=vmesh();{tube(tailw,[0,0,0],[0.04,-0.4,0],0.03,0.025,8,DK,MATTE,true);tube(tailw,[0.04,-0.4,-0.04],[-0.06,-0.5,-0.04],0.012,0.012,5,DK,MATTE);tube(tailw,[0.04,-0.4,0.04],[-0.06,-0.5,0.04],0.012,0.012,5,DK,MATTE);
    surf(tailw,(a,b)=>{const R0=0.08,r=0.045;return[-0.06+Math.cos(a)*(R0+r*Math.cos(b)),-0.5+Math.sin(a)*(R0+r*Math.cos(b)),r*Math.sin(b)];},range(0,Math.PI*2,16),range(0,Math.PI*2,8),()=>[TY,MATTE],{ev:1e-3});}
  // the pitot tube under the left lower wing, a step under the door, the aerial mast behind the cabin
  tube(body,[1.2,-0.74,-3.6],[1.75,-0.74,-3.6],0.012,0.012,6,AL,CHROME);tube(body,[0.3,-0.78,0.52],[0.3,-1.0,0.62],0.015,0.015,6,AL,CHROME);tube(body,[0.15,-1.0,0.55],[0.45,-1.0,0.68],0.02,0.02,6,AL,CHROME);
  tube(body,[-1.3,0.86,0],[-1.45,1.12,0],0.012,0.008,6,AL,CHROME);tube(body,[-1.45,1.12,0],[-4.3,1.55,0],0.003,0.003,4,AL,CHROME);
  // part list for Plane.draw (index into the meshes returned below)
  const list=[['body',body],['prop',prop],['pilot',pilotM],['pax',paxM],['gearL',gear(-1)],['gearR',gear(1)],['tailw',tailw],['elev',parts.elev.M],['rud',parts.rud.M],
    ['ailL',parts.ailL.M],['ailR',parts.ailR.M],['flapL',parts.flapL.M],['flapR',parts.flapR.M],['disc',disc]];
  list.forEach(([n],i)=>{PLANE_PARTS[n]={i,...(parts[n]?{o:parts[n].o,ax:parts[n].ax}:{})};});
  return list.map(l=>l[1]);}
// ---- flight model: rigid body (position, velocity in the world; attitude as a quaternion; body rates), aerodynamics from lift/drag curves
// with a stall, propeller thrust from power and speed, control moments scaled by dynamic pressure and propwash, gear and flaps drag,
// three wheel contacts with springs, brakes and a steerable tailwheel. Assists: coordinated turns (auto-rudder) and "easy" (bank and
// pitch limits, no stall).
const Q={mul(a,b){return[a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]];},
  rot(q,v){const p=[0,v[0],v[1],v[2]],r=Q.mul(Q.mul(q,p),[q[0],-q[1],-q[2],-q[3]]);return[r[1],r[2],r[3]];},inv(q){return[q[0],-q[1],-q[2],-q[3]];},
  norm(q){const l=Math.hypot(...q)||1;return q.map(v=>v/l);},axis(ax,a){const s=Math.sin(a/2);return[Math.cos(a/2),ax[0]*s,ax[1]*s,ax[2]*s];}};
const Plane={on:false,cam:'chase',st:null,ctl:{thr:0,pitch:0,roll:0,yaw:0,brake:0},gear:1,gearPos:1,flaps:0,flapPos:0,easy:true,coord:true,prop:0,crashed:false,
  spawn(at){if(!App.T){UI.toast('Wait for the world to load');return;}const T=App.T;let x,z,h;
    // a runway-like spot: the longest flat, dry stretch near the camera (else take off in the air)
    const c=Cam.target,flat=(x0,z0,hd,L)=>{let mn=1e9,mx=-1e9;for(let t=0;t<=L;t+=10){const px=x0+Math.cos(hd)*t,pz=z0+Math.sin(hd)*t;if(px<40||pz<40||px>T.W-40||pz>T.W-40)return 1e9;const w=sampleWater(T,px,pz);if(w[1]>0&&w[0]>R.sampleHr(T,px,pz)-0.2)return 1e9;const g=R.sampleHr(T,px,pz);mn=Math.min(mn,g);mx=Math.max(mx,g);}return mx-mn;};
    let best=null;for(let k=0;k<1500&&!(best&&best.f<1.5);k++){const sp=k<700?2500:T.W,px=c[0]+(Math.random()-0.5)*sp,pz=c[2]+(Math.random()-0.5)*sp,hd=Math.random()*6.283,f=flat(px,pz,hd,380);if(f<5&&(!best||f+Math.hypot(px-c[0],pz-c[2])*0.002<best.f+Math.hypot(best.x-c[0],best.z-c[2])*0.002))best={x:px,z:pz,h:hd,f};}
    const air=!best;if(air){x=c[0];z=c[2];h=Cam.yaw+Math.PI;}else{x=best.x;z=best.z;h=best.h;}
    const g=R.sampleHr(T,x,z),y=air?Math.max(g,this.groundAt(x,z))+300:g+2.2;
    // nose up on the ground (taildragger: about 11°), level in the air
    const q0=Q.axis([0,1,0],-h),qp=Q.axis([0,0,1],air?0:0.19);
    this.st={p:[x,y,z],v:air?Q.rot(q0,[60,0,0]):[0,0,0],q:Q.norm(Q.mul(q0,qp)),w:[0,0,0]};this.ctl={thr:air?0.7:0,pitch:0,roll:0,yaw:0,brake:air?0:1};this.gear=air?0:1;this.gearPos=this.gear;this.flaps=0;this.flapPos=0;this.crashed=false;this.on=true;this.prop=0;
    if(Build.active)Build.exit();if(Drive.active)Drive.exit();if(MapView.on)MapView.close();this.setCam(this.cam||'chase');PlaneUI.show(true);UI.toast(air?'Flying: no flat ground nearby, so you start in the air':'Ready on a flat field: full throttle, keep it straight, lift off at about 110 km/h');},
  exit(){this.on=false;PlaneUI.show(false);Cam.mode='free';Cam.up=null;if(this.st){Cam.target=this.st.p.slice();Cam.dist=60;}},
  groundAt(x,z){const T=App.T;if(!T)return 0;const g=R.sampleHr(T,clamp(x,0,T.W),clamp(z,0,T.W)),w=sampleWater(T,clamp(x,0,T.W),clamp(z,0,T.W));return w[1]>0?Math.max(g,w[0]):g;},
  water(x,z){const T=App.T;const w=sampleWater(T,clamp(x,0,T.W),clamp(z,0,T.W));return w[1]>0&&w[0]>R.sampleHr(T,x,z)+0.1;},
  setCam(c){this.cam=c;Cam.anim=null;if(c==='orbit'){Cam.mode='free';Cam.up=null;if(this.st){Cam.target=this.st.p.slice();Cam.dist=25;}}else Cam.mode='plane';PlaneUI.refresh();},
  update(dt){if(!this.on||!this.st)return;PlanePad.poll(dt);if(this.paused)return;const n=Math.max(1,Math.ceil(dt/0.008));for(let i=0;i<n;i++)this.step(dt/n);
    this.gearPos+=clamp(this.gear-this.gearPos,-dt/6,dt/6);this.flapPos+=clamp(this.flaps/2-this.flapPos,-dt/3,dt/3);
    this.prop=(this.prop+dt*this.rpm()/60*6.283)%6.283;if(this.cam==='orbit'){const p=this.st.p;for(let k=0;k<3;k++)Cam.target[k]+=(p[k]-Cam.target[k])*Math.min(1,dt*8);}Sfx.plane&&Sfx.plane(this);},
  rpm(){return this.crashed?0:900+this.ctl.thr*1300+Math.hypot(...this.st.v)*4;},
  step(dt){const s=this.st,c=this.ctl,rho=1.225*Math.exp(-s.p[1]/9000);if(this.crashed){s.v=s.v.map(v=>v*Math.max(0,1-dt*2));s.w=s.w.map(v=>v*Math.max(0,1-dt*3));return;}
    const qi=Q.inv(s.q),vb=Q.rot(qi,s.v),V=Math.hypot(...vb),qd=0.5*rho*V*V,alpha=Math.atan2(-vb[1],Math.max(vb[0],0.1)),beta=V>1?Math.asin(clamp(vb[2]/V,-1,1)):0;
    // lift curve with a stall at ~16° (flaps add lift and move the stall), "easy" keeps it on the linear part
    const fl=this.flapPos,a0=-0.035-fl*0.07,aS=0.28-fl*0.03,ae=alpha-a0;let CL=5.2*ae;if(Math.abs(ae)>aS&&!this.easy){const ex=Math.abs(ae)-aS;CL=Math.sign(ae)*(5.2*aS-ex*4.2);CL=Math.sign(ae)*Math.max(Math.abs(CL),0.6*Math.abs(Math.sin(2*ae)));}if(this.easy)CL=clamp(CL,-1.4,1.55+fl*0.4);
    const CD=0.0205+0.06*CL*CL/(Math.PI*6.0*0.8)+this.gearPos*0.016+fl*0.045+(Math.abs(ae)>aS?0.25*Math.sin(Math.abs(ae)):0),CY=-0.9*beta;
    // forces in the body frame: lift at right angles to the airflow in the plane of symmetry, drag along it, side force; thrust along x
    const ux=V>0.1?vb[0]/V:1,uy=V>0.1?vb[1]/V:0,uz=V>0.1?vb[2]/V:0,L=qd*PL.S*CL,D=qd*PL.S*CD,Y=qd*PL.S*CY;
    const lift=[-uy*L/Math.max(Math.hypot(ux,uy),1e-3)*Math.hypot(ux,uy),ux*L,0];
    const Tst=5200,thr=c.thr*Math.min(Tst,PL.P*0.82/Math.max(V,8))*(rho/1.225);
    let F=[thr+lift[0]-ux*D,lift[1]-uy*D,Y-uz*D];
    // moments: stability (pitch, weathercock, dihedral), damping, controls (with propwash at low speed); assists
    const qw=qd+0.5*rho*Math.pow(c.thr*28,2)*0.6,w=s.w,b=PL.span,ch=1.5;
    let ail=c.roll,ele=c.pitch,rud=c.yaw;if(this.coord&&V>15)rud+=clamp(beta*2.5,-0.6,0.6)+ail*0.15;/* coordinated: the rudder cancels the slip and the adverse yaw */
    if(this.easy){const up=Q.rot(s.q,[0,1,0]),fw=Q.rot(s.q,[1,0,0]),bank=Math.atan2(-Q.rot(s.q,[0,0,1])[1],up[1]),pitch=Math.asin(clamp(fw[1],-1,1));
      if(Math.abs(bank)>1.05&&Math.sign(ail)===Math.sign(-bank)*-1)ail*=0.2;ail+=clamp((Math.abs(c.roll)<0.05?-bank*1.2:0),-0.5,0.5);if(pitch>0.45&&ele>0)ele*=0.3;if(pitch<-0.6&&ele<0)ele*=0.3;if(Math.abs(c.pitch)<0.05&&!this.onG&&V>20)ele+=clamp(-s.v[1]*0.07-w[2]*0.5,-0.5,0.5);}
    const Cl=-0.09*beta+0.17*ail-0.45*w[0]*b/(2*Math.max(V,10)),Cm=0.015-1.0*ae+0.42*ele-fl*0.05-20*w[2]*ch/(2*Math.max(V,10)),Cn=-0.11*beta-0.11*rud-0.18*w[1]*b/(2*Math.max(V,10));
    let M=[qw*PL.S*b*Cl,qw*PL.S*b*Cn,qw*PL.S*ch*Cm];
    // ground: three wheels (or the belly with the gear up), springs and dampers, rolling friction, brakes, tailwheel steering
    const G=this.gearPos>0.95?PL.wheels:PL.belly;let onG=0;const Fw=[0,0,0];
    G.forEach((cp,i)=>{const wp=Q.rot(s.q,cp),P=[s.p[0]+wp[0],s.p[1]+wp[1],s.p[2]+wp[2]],gy=this.groundAt(P[0],P[2]),pen=gy-P[1];if(pen<=0)return;onG++;
      if(this.water(P[0],P[2])&&V>3){this.crash('In the water');return;}
      const vp=[s.v[0]-(w[1]*0+0),s.v[1],s.v[2]];const wv=Q.rot(s.q,[w[0],w[1],w[2]]),rv=[wv[1]*wp[2]-wv[2]*wp[1],wv[2]*wp[0]-wv[0]*wp[2],wv[0]*wp[1]-wv[1]*wp[0]],pv=[s.v[0]+rv[0],s.v[1]+rv[1],s.v[2]+rv[2]];
      if(G!==PL.wheels&&-pv[1]>2.5){this.crash('Belly landing');}if(-pv[1]>5.5){this.crash('Hard landing');return;}
      const k=i<2?160000:60000,dmp=i<2?14000:6000,N=Math.max(0,k*pen-dmp*pv[1]);
      // friction in the wheel's rolling direction (low, brakes add) and sideways (high): in world, along the body's x and z
      const fx=Q.rot(s.q,[1,0,0]),fz=Q.rot(s.q,[0,0,1]);let hx=[fx[0],0,fx[2]],hl=Math.hypot(hx[0],hx[2])||1;hx=[hx[0]/hl,0,hx[2]/hl];let hz=[-hx[2],0,hx[0]];
      if(i===2&&G===PL.wheels){const st=-rud*0.5*(V<25?1:0.3);const c2=Math.cos(st),s2=Math.sin(st);const nx=[hx[0]*c2-hz[0]*s2,0,hx[2]*c2-hz[2]*s2];hz=[-nx[2],0,nx[0]];hx=nx;}
      const vr=pv[0]*hx[0]+pv[2]*hx[2],vs=pv[0]*hz[0]+pv[2]*hz[2],mu=G===PL.wheels?(0.02+(i<2?c.brake*0.6:0)):0.5,Fr=-Math.sign(vr)*Math.min(Math.abs(vr)*8000,mu*N),Fs=-clamp(vs*9000,-0.8*N,0.8*N);
      const f=[hx[0]*Fr+hz[0]*Fs,N,hx[2]*Fr+hz[2]*Fs];Fw[0]+=f[0];Fw[1]+=f[1];Fw[2]+=f[2];const fb=Q.rot(qi,f);M=[M[0]+cp[1]*fb[2]-cp[2]*fb[1],M[1]+cp[2]*fb[0]-cp[0]*fb[2],M[2]+cp[0]*fb[1]-cp[1]*fb[0]];});
    if(this.crashed)return;
    // integrate: forces to the world, gravity; rates with a diagonal inertia
    const Fwld=Q.rot(s.q,F);const m=PL.m,acc=[(Fwld[0]+Fw[0])/m,(Fwld[1]+Fw[1])/m-9.81,(Fwld[2]+Fw[2])/m];for(let k=0;k<3;k++){s.v[k]+=acc[k]*dt;s.p[k]+=s.v[k]*dt;}
    const I=[1700,4300,2900];for(let k=0;k<3;k++)s.w[k]+=M[k]/I[k]*dt;if(onG)s.w=s.w.map(v=>v*(1-dt*1.5));
    const wq=[0,s.w[0],s.w[1],s.w[2]],dq=Q.mul(s.q,wq);s.q=Q.norm(s.q.map((v,k)=>v+0.5*dq[k]*dt));
    // terrain: never below the ground with the fuselage
    const gy=this.groundAt(s.p[0],s.p[2]);if(s.p[1]<gy+0.5){if(Math.hypot(...s.v)>12)this.crash('Crashed into the ground');s.p[1]=gy+0.5;}
    const T=App.T;if(s.p[0]<-2000||s.p[2]<-2000||s.p[0]>T.W+2000||s.p[2]>T.W+2000){s.v=s.v.map(v=>-v);UI.toast('The edge of the world: turned around');}
    this.alpha=ae;this.V=V;this.onG=onG;this.stall=!this.easy&&Math.abs(ae)>aS*0.9&&V>5;},
  crash(why){if(this.crashed)return;this.crashed=true;this.st.v=this.st.v.map(v=>v*0.2);UI.toast(why+' — tap Reset to try again');if(P.smoke)for(let k=0;k<40;k++){const p=this.st.p;Particles.spawn(p[0],p[1],p[2],(Math.random()-0.5)*4,2+Math.random()*3,(Math.random()-0.5)*4,3,0.5,3,0);}PlaneUI.refresh();},
  // body-frame matrix for drawing (column-major, like the train poses)
  mat(off,extra){const s=this.st,qq=extra?Q.mul(s.q,extra):s.q,X=Q.rot(qq,[1,0,0]),Y=Q.rot(qq,[0,1,0]),Z=Q.rot(qq,[0,0,1]),o=Q.rot(s.q,off||[0,0,0]);
    return new Float32Array([X[0],X[1],X[2],0,Y[0],Y[1],Y[2],0,Z[0],Z[1],Z[2],0,s.p[0]+o[0],s.p[1]+o[1],s.p[2]+o[2],1]);},
  draw(p){if(!this.on||!this.st||!R.planeMesh)return;const M=R.planeMesh,PP=PLANE_PARTS,dm=(n,mat)=>{const m=M[PP[n].i];if(!m)return;gl.uniformMatrix4fv(p.u('uModel'),false,mat);gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,0);Stats.draws++;Stats.tris+=m.count/3;};
    gl.uniform1f(p.u('uDist'),0);dm('body',this.mat());const r=this.rpm(),c=this.ctl;
    dm('prop',this.mat([PL.propX,0,0],Q.axis([1,0,0],this.prop)));if(this.cam!=='cockpit')dm('pilot',this.mat());dm('pax',this.mat());
    const ga=-(1-this.gearPos)*1.45;/* the legs fold aft into the lower wing roots */dm('gearL',this.mat([PL.gearHinge[0],PL.gearHinge[1],-PL.gearZ],Q.axis([0,0,1],ga)));dm('gearR',this.mat([PL.gearHinge[0],PL.gearHinge[1],PL.gearZ],Q.axis([0,0,1],ga)));
    dm('tailw',this.mat([-4.4,-0.12,0],Q.axis([0,0,1],-(1-this.gearPos)*1.2)));
    // control surfaces turn about their own hinge lines
    const hg=(n,a)=>{const q=PP[n];dm(n,this.mat(q.o,Q.axis(q.ax,a)));};
    hg('elev',-c.pitch*0.35);hg('rud',c.yaw*0.4);hg('ailL',-c.roll*0.3);hg('ailR',-c.roll*0.3);hg('flapL',-this.flapPos*0.7);hg('flapR',this.flapPos*0.7);
    // the propeller disc: faint, in the transparent pass, when the engine turns fast
    const da=clamp((r-500)/1400,0,1)*0.42;if(da>0.01){gl.uniform2f(p.u('uOcc'),da,0);dm('disc',this.mat([PL.propX,0,0]));gl.uniform2f(p.u('uOcc'),0,0);}},
  // camera modes: chase (behind and above, smoothed), cockpit (pilot's eye, rolls with the plane), wing (on the left wing looking in),
  // tower (a fixed spot watching it pass, moved on when far), orbit (the free camera around the plane: drag to turn, pinch to zoom)
  camera(dt){const s=this.st,P0=s.p,F=Q.rot(s.q,[1,0,0]),U=Q.rot(s.q,[0,1,0]),Zr=Q.rot(s.q,[0,0,1]);let p,look,up=[0,1,0],cab=false;
    const lb=this.lookBack?-1:1;/* RT held on a controller: look back */
    if(this.cam==='cockpit'){const e=Q.rot(s.q,PL.eye);p=[P0[0]+e[0],P0[1]+e[1],P0[2]+e[2]];look=[p[0]+F[0]*20*lb+U[0]*0.6,p[1]+F[1]*20*lb+U[1]*0.6,p[2]+F[2]*20*lb+U[2]*0.6];up=U;cab=true;}
    else if(this.cam==='wing'){const e=Q.rot(s.q,[-2.6,2.6,-7.2]);p=[P0[0]+e[0],P0[1]+e[1],P0[2]+e[2]];look=[P0[0]+F[0]*1.5,P0[1]+F[1]*1.5,P0[2]+F[2]*1.5];up=U;cab=true;}
    else if(this.cam==='tower'){if(!this.tw||Math.hypot(this.tw[0]-P0[0],this.tw[2]-P0[2])>700){const v=s.v,vl=Math.hypot(v[0],v[2])||1,ax=P0[0]+v[0]/vl*350+(-v[2]/vl)*120,az=P0[2]+v[2]/vl*350+(v[0]/vl)*120;this.tw=[ax,this.groundAt(ax,az)+6,az];}p=this.tw.slice();look=P0.slice();}
    else{const hd=Math.hypot(F[0],F[2])>0.1?[F[0],0,F[2]]:[s.v[0],0,s.v[2]],hl=Math.hypot(hd[0],hd[2])||1,want=[P0[0]-hd[0]/hl*12*lb,P0[1]+3.2,P0[2]-hd[2]/hl*12*lb];if(!this.cp||Math.hypot(this.cp[0]-want[0],this.cp[1]-want[1],this.cp[2]-want[2])>40)this.cp=want.slice();const k=Math.min(1,dt*3.5);for(let i=0;i<3;i++)this.cp[i]+=(want[i]-this.cp[i])*k;p=this.cp.slice();look=[P0[0]+F[0]*4*lb,P0[1]+1,P0[2]+F[2]*4*lb];}
    const gh=this.groundAt(p[0],p[2])+0.6;if(p[1]<gh)p[1]=gh;return{p,look,up,cab};}};
// ---- the flying controls: throttle slider (left), stick (right: pitch and roll), rudder and brake buttons, gear, flaps, camera, reset, exit
const PlaneUI={show(on){$('#planeUI').hidden=!on;document.body.classList.toggle('flying',on);if(on)this.refresh();},
  refresh(){if(!Plane.on)return;$('#plGear').textContent=Plane.gear?'Gear ▼':'Gear ▲';$('#plFlaps').textContent='Flaps '+['0','½','1'][Plane.flaps];$('#plCam').textContent='📷 '+{chase:'Chase',cockpit:'Cockpit',wing:'Wing',tower:'Tower',orbit:'Orbit'}[Plane.cam];$('#plEasy').classList.toggle('on',Plane.easy);},
  hud(){if(!Plane.on||!Plane.st)return;const s=Plane.st,F=Q.rot(s.q,[1,0,0]),hd=((Math.atan2(F[2],F[0])*180/Math.PI+90)%360+360)%360,gy=Plane.groundAt(s.p[0],s.p[2]);
    $('#plHud').innerHTML=`<b>${Math.round((Plane.V||0)*3.6)}</b> km/h · ${Math.round(s.p[1]-gy)} m · ${(s.v[1]>=0?'+':'')}${s.v[1].toFixed(1)} m/s · ${String(Math.round(hd)).padStart(3,'0')}° · ${Math.round(Plane.ctl.thr*100)}%`+(Plane.stall?' · <span style="color:#ff6a5a">STALL</span>':'')+(Plane.gearPos>0&&Plane.gearPos<1?' · gear moving':'')+(Plane.paused?' · <b>PAUSED</b> (Start)':'');},
  gear(){Plane.gear=Plane.gear?0:1;if(Plane.onG&&!Plane.gear){Plane.gear=1;UI.toast('Not on the ground');}else UI.toast(Plane.gear?'Gear down':'Gear up');this.refresh();},
  setFlaps(n){Plane.flaps=clamp(n,0,2);this.refresh();},
  nextCam(d){const L=['chase','cockpit','wing','tower','orbit'];Plane.setCam(L[(L.indexOf(Plane.cam)+(d||1)+L.length)%L.length]);},
  easy(){Plane.easy=!Plane.easy;UI.toast(Plane.easy?'Assists on: bank and pitch limits, no stall':'Assists off: it can stall and spin');this.refresh();},
  bind(){const on=(id,f)=>{$(id).onclick=f;};on('#plGear',()=>this.gear());on('#plFlaps',()=>this.setFlaps((Plane.flaps+1)%3));
    on('#plCam',()=>this.nextCam(1));on('#plExit',()=>Plane.exit());on('#plReset',()=>Plane.spawn());on('#plEasy',()=>this.easy());
    const hold=(id,k,v)=>{const e=$(id);e.onpointerdown=ev=>{ev.preventDefault();Plane.ctl[k]=v;};e.onpointerup=e.onpointerleave=e.onpointercancel=()=>{Plane.ctl[k]=0;};};hold('#plRudL','yaw',-1);hold('#plRudR','yaw',1);hold('#plBrake','brake',1);
    const th=$('#plThr');th.oninput=()=>{Plane.ctl.thr=+th.value/100;};
    const st=$('#plStick'),kn=$('#plKnob');let id=null;const mv=ev=>{const r=st.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,R=r.width/2-14;let dx=(ev.clientX-cx)/R,dy=(ev.clientY-cy)/R;const l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l;}
      Plane.ctl.roll=dx;Plane.ctl.pitch=dy;/* stick back (finger down) = nose up */kn.style.transform=`translate(${dx*R}px,${dy*R}px)`;};
    st.onpointerdown=ev=>{ev.preventDefault();id=ev.pointerId;st.setPointerCapture(id);mv(ev);};st.onpointermove=ev=>{if(ev.pointerId===id)mv(ev);};st.onpointerup=st.onpointercancel=ev=>{if(ev.pointerId!==id)return;id=null;Plane.ctl.roll=0;Plane.ctl.pitch=0;kn.style.transform='';};}};

// ---- game controller (Gamepad API, standard layout such as Xbox; it works in Chrome on the Mac and on Android over Bluetooth or USB):
// left stick up/down opens or closes the throttle (it stays where you leave it); right stick: pitch (up = nose down) and roll, with a little
// expo for fine control; LB/RB rudder; LT wheel brakes (how hard you pull). A gear up/down, B next camera, X flaps step, Y assists,
// D-pad down/up flaps out/in, D-pad left/right camera, RT held look back, Start pause, Back (View) reset. The touch controls keep working:
// the controller only writes a control while it is being used, and lets go of it once when released.
const PlanePad={prev:[],act:{},seen:false,
  pad(){if(!navigator.getGamepads)return null;let any=null;for(const q of navigator.getGamepads()){if(!q||!q.connected)continue;if(q.mapping==='standard')return q;any=any||q;}return any;},
  poll(dt){const g=this.pad();if(!g)return;const c=Plane.ctl;
    if(!this.seen){this.seen=true;UI.toast('Controller ready: left stick throttle, right stick pitch and roll, LB/RB rudder, A gear, B camera');}
    const ax=i=>{const v=g.axes[i]||0;return Math.abs(v)<0.12?0:(v-Math.sign(v)*0.12)/0.88;},bt=i=>{const b=g.buttons[i];return b?(typeof b==='object'?(b.value||(b.pressed?1:0)):+b):0;},pr=i=>bt(i)>0.5,ed=i=>pr(i)&&!this.prev[i];
    const ly=ax(1);if(ly){c.thr=clamp(c.thr-ly*dt*0.7,0,1);const th=$('#plThr');if(th)th.value=Math.round(c.thr*100);}
    const ex=v=>v*(0.5+0.5*v*v),rx=ax(2),ry=ax(3);if(rx||ry){c.roll=ex(rx);c.pitch=ex(ry);this.act.stick=true;}else if(this.act.stick){c.roll=c.pitch=0;this.act.stick=false;}
    const yw=(pr(5)?1:0)-(pr(4)?1:0);if(yw){c.yaw=yw;this.act.yaw=true;}else if(this.act.yaw){c.yaw=0;this.act.yaw=false;}
    const br=bt(6);if(br>0.05){c.brake=br;this.act.br=true;}else if(this.act.br){c.brake=0;this.act.br=false;}
    Plane.lookBack=pr(7);
    if(ed(0))PlaneUI.gear();if(ed(1))PlaneUI.nextCam(1);if(ed(2))PlaneUI.setFlaps((Plane.flaps+1)%3);if(ed(3))PlaneUI.easy();
    if(ed(13))PlaneUI.setFlaps(Plane.flaps+1);if(ed(12))PlaneUI.setFlaps(Plane.flaps-1);if(ed(14))PlaneUI.nextCam(-1);if(ed(15))PlaneUI.nextCam(1);
    if(ed(9)){Plane.paused=!Plane.paused;UI.toast(Plane.paused?'Paused (Start to fly on)':'Flying');}if(ed(8)){Plane.paused=false;Plane.spawn();}
    this.prev=g.buttons.map((b,i)=>pr(i));}};
addEventListener('gamepadconnected',e=>Log.info('controller connected: '+e.gamepad.id+' ('+(e.gamepad.mapping||'no standard mapping')+')'));

// ---- the main menu: shown when the game opens (the world loads behind it) and from the Menu button. New game picks the map style and the
// land settings with a live 2D preview, then starts a fresh game (track, trains, roads, buses, money and village growth cleared).
