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
