'use strict';
// ===== beaver.js
// ===================================================================
// The de Havilland Canada DHC-2 Beaver on amphibious floats (4.24.0), modelled from the user's four photos of N67684: chrome yellow with an
// orange-red sweep on the cowling that runs back as a stripe along the lower fuselage (dark pinstripes on its edges), orange wingtip
// bands and lift struts, the registration in orange with a dark outline, a three-blade grey propeller with white tips and a chrome
// spinner, the nine-cylinder Wasp Junior behind the cowling lip, aluminium floats with white decks, ladder rungs on the float struts.
// The wheels come from the fifth photo (a Turbo Beaver on Wipline amphibious floats): two nose wheels that swing up into the float bows
// and two main wheels that swing up and back beside the floats.
// Real sizes: span 14.64 m, length 9.22 m, wing area 23.2 m², 450 hp (336 kW), about 2300 kg on floats.
// Body frame as the Staggerwing: x forward, y up, z right, origin at the CG.
// ===================================================================
const PLB={a0:-0.07,span:14.64,len:9.22,S:23.2,m:2300,P:336000,cd0:0.034,thr0:6400,I:[6500,11000,8200],stallA:0.27,
  // landing gear contact points (wheels down): nose wheels at the float bows, main wheels beside the float steps
  wheels:[[3.52,-2.45,-1.35],[3.52,-2.45,1.35],[-0.05,-2.61,-1.78],[-0.05,-2.61,1.78]],
  // the float keels: points along each keel (bow to stern), used on water and on land with the wheels up
  keel:(()=>{const o=[];for(const z of [-1.35,1.35])for(const [x,y] of [[3.55,-1.98],[2.6,-2.2],[1.5,-2.25],[0.4,-2.26],[-0.25,-2.26],[-1.2,-2.13],[-2.3,-2.02],[-3.4,-1.88]])o.push([x,y,z]);return o;})(),
  noseHinge:[3.3,-1.58,1.35],mainHinge:[-0.1,-1.62,1.78],propX:3.27,eye:[0.95,0.8,-0.33],floatZ:1.35,nose:[4.1,0.1,0],nav:{l:[0.8,1.1,-7.45],r:[0.8,1.1,7.45],t:[-5.8,0.4,0],b:[0.2,1.15,0]}};
const BEAVER_PARTS={};
function beaverMeshes(){
  const YL=[0.98,0.70,0.03],YLd=[0.9,0.62,0.02],OR=[0.93,0.33,0.06],ORd=[0.8,0.26,0.05],PS=[0.24,0.09,0.04],CH=[0.92,0.92,0.94],AL=[0.74,0.75,0.77],ALd=[0.6,0.61,0.63],
    WH=[0.93,0.93,0.92],BK=[0.04,0.04,0.045],TY=[0.05,0.05,0.055],GLs=[0.55,0.62,0.66],INT=[0.2,0.18,0.16],SEAT=[0.25,0.16,0.1],DK=[0.12,0.12,0.13],ENG=[0.3,0.3,0.32],
    PG=[0.28,0.29,0.31],SKIN=[0.86,0.63,0.50],SHIRT=[0.16,0.3,0.55],SHIRT2=[0.82,0.82,0.8],HAIR=[0.3,0.22,0.14],PAINT=11,CHROME=10,MATTE=3,INTM=7;
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],
    crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],nrm=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l];},lerp=(a,b,t)=>a+(b-a)*t;
  const V=(M,p,n,c,m)=>{M.v.push(p[0],p[1],p[2],n[0],n[1],n[2],c[0],c[1],c[2],0,0,0,1,m);return M.n++;};
  const surf=(M,f,us,vs,paint,o)=>{o=o||{};const nu=us.length,nv=vs.length,P=[],N=[],eu=o.eu||1e-4,ev=o.ev||1e-4;
    for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const u=us[i],v=vs[j],p=f(u,v);let du=sub(f(u+eu,v),f(u-eu,v)),dv=sub(f(u,v+ev),f(u,v-ev));
      if(Math.hypot(...du)<1e-9)du=sub(f(u+eu*50,v),f(u-eu*50,v));if(Math.hypot(...dv)<1e-9)dv=sub(f(u,v+ev*50),f(u,v-ev*50));let n=nrm(crs(du,dv));if(o.flip)n=mul(n,-1);P.push(p);N.push(n);}
    for(let i=0;i+1<nu;i++)for(let j=0;j+1<nv;j++){const pc=paint?paint((us[i]+us[i+1])/2,(vs[j]+vs[j+1])/2):[YL,PAINT];if(!pc)continue;
      const k=[i*nv+j,(i+1)*nv+j,(i+1)*nv+j+1,i*nv+j+1],ix=k.map(q=>V(M,P[q],N[q],pc[0],pc[1]));M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);}};
  const range=(a,b,n)=>{const r=[];for(let i=0;i<=n;i++)r.push(a+(b-a)*i/n);return r;};
  const cosr=n=>{const r=[];for(let i=0;i<=n;i++)r.push(0.5-0.5*Math.cos(Math.PI*i/n));return r;};
  const mono=T=>{T=T.slice().sort((a,b)=>a[0]-b[0]);const n=T.length,xs=T.map(t=>t[0]),ys=T.map(t=>t[1]),d=[],m=new Array(n);for(let i=0;i<n-1;i++)d.push((ys[i+1]-ys[i])/(xs[i+1]-xs[i]));
    m[0]=d[0];m[n-1]=d[n-2];for(let i=1;i<n-1;i++)m[i]=d[i-1]*d[i]<=0?0:(d[i-1]+d[i])/2;for(let i=0;i<n-1;i++){if(d[i]===0){m[i]=m[i+1]=0;continue;}const a=m[i]/d[i],b=m[i+1]/d[i],h=a*a+b*b;if(h>9){const t=3/Math.sqrt(h);m[i]=t*a*d[i];m[i+1]=t*b*d[i];}}
    return x=>{if(x<=xs[0])return ys[0];if(x>=xs[n-1])return ys[n-1];let i=0;while(x>xs[i+1])i++;const h=xs[i+1]-xs[i],t=(x-xs[i])/h,t2=t*t,t3=t2*t;return(2*t3-3*t2+1)*ys[i]+(t3-2*t2+t)*h*m[i]+(-2*t3+3*t2)*ys[i+1]+(t3-t2)*h*m[i+1];};};
  const tube=(M,a,b,r0,r1,n,col,mat,cap)=>{const ax=nrm(sub(b,a)),h=Math.abs(ax[1])<0.9?[0,1,0]:[1,0,0],u=nrm(crs(ax,h)),w=crs(ax,u);
    surf(M,(s,t)=>{const r=lerp(r0,r1,s),c=Math.cos(t),sn=Math.sin(t);return add(add(a,mul(sub(b,a),s)),add(mul(u,c*r),mul(w,sn*r)));},[0,1],range(0,Math.PI*2,n),()=>[col,mat]);
    if(cap)for(const [p,r,sg] of [[a,r0,-1],[b,r1,1]]){const c0=V(M,p,mul(ax,sg),col,mat);for(let k=0;k<n;k++){const t0=k/n*Math.PI*2,t1=(k+1)/n*Math.PI*2,q0=add(p,add(mul(u,Math.cos(t0)*r),mul(w,Math.sin(t0)*r))),q1=add(p,add(mul(u,Math.cos(t1)*r),mul(w,Math.sin(t1)*r)));M.i.push(c0,V(M,q0,mul(ax,sg),col,mat),V(M,q1,mul(ax,sg),col,mat));}}};
  /* a streamlined strut: an elliptic section (chord c, thickness 0.3·c) from a to b, chord along the airflow (x) */
  const strut=(M,a,b,c,col,mat)=>{const ax=nrm(sub(b,a)),fw=nrm(sub([1,0,0],mul(ax,ax[0]))),sd=crs(ax,fw);surf(M,(s,t)=>add(add(a,mul(sub(b,a),s)),add(mul(fw,Math.cos(t)*c/2),mul(sd,Math.sin(t)*c*0.15))),[0,1],range(0,Math.PI*2,12),()=>[col,mat]);};
  const ball=(M,c,r,s,col,mat,n)=>{n=n||12;s=s||[1,1,1];surf(M,(a,b)=>[c[0]+Math.cos(b)*Math.cos(a)*r*s[0],c[1]+Math.sin(b)*r*s[1],c[2]+Math.cos(b)*Math.sin(a)*r*s[2]],range(0,Math.PI*2,n),range(-Math.PI/2,Math.PI/2,Math.ceil(n/2)),()=>[col,mat],{ev:1e-3});};
  const revolve=(M,prof,n,paint,yc)=>{yc=yc||0;const L=prof.length;
    surf(M,(u,t)=>{const i=Math.max(0,Math.min(L-2,Math.floor(u))),k=u-i,x=lerp(prof[i][0],prof[i+1][0],k),r=lerp(prof[i][1],prof[i+1][1],k);return[x,yc+Math.sin(t)*r,Math.cos(t)*r];},range(0,L-1,L-1),range(0,Math.PI*2,n),paint||null,{eu:1e-3});};
  const box=(M,c,h,col,mat)=>{const P=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(v=>[c[0]+v[0]*h[0],c[1]+v[1]*h[1],c[2]+v[2]*h[2]]);
    for(const [f,n] of [[[0,1,2,3],[0,0,-1]],[[5,4,7,6],[0,0,1]],[[4,0,3,7],[-1,0,0]],[[1,5,6,2],[1,0,0]],[[3,2,6,7],[0,1,0]],[[4,5,1,0],[0,-1,0]]]){const ix=f.map(i=>V(M,P[i],n,col,mat));M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);}};
  const foilY=(t,th,m,p)=>{const yt=5*th*(0.2969*Math.sqrt(Math.max(t,0))-0.126*t-0.3516*t*t+0.2843*t*t*t-0.1036*t*t*t*t),yc=m?(t<p?m/(p*p)*(2*p*t-t*t):m/((1-p)*(1-p))*(1-2*p+2*p*t-t*t)):0;return[yc+yt,yc-yt];};
  const lift=(M,LE,TE,UP,th,cm,ss,t0,t1,paint,nt)=>{nt=nt||14;const ts=cosr(nt).map(t=>t0+(t1-t0)*t);
    for(const sg of [1,-1])surf(M,(s,t)=>{const a=LE(s),b=TE(s),c=Math.hypot(...sub(a,b)),y=foilY(t,th,cm,0.4)[sg>0?0:1],u=UP(s);return add(add(a,mul(sub(b,a),t)),mul(u,y*c));},ss,ts,paint||(()=>[YL,PAINT]),{eu:1e-4,ev:1e-4});
    if(t1<0.999)surf(M,(s,k)=>{const a=LE(s),b=TE(s),c=Math.hypot(...sub(a,b)),f=foilY(t1,th,cm,0.4),u=UP(s),p=add(a,mul(sub(b,a),t1));return add(p,mul(u,lerp(f[1],f[0],k)*c));},ss,[0,1],()=>[YLd,PAINT]);
    if(t0>0.001)surf(M,(s,k)=>{const a=LE(s),b=TE(s),c=Math.hypot(...sub(a,b)),f=foilY(t0,th,cm,0.4),u=UP(s),p=add(a,mul(sub(b,a),t0));return add(p,mul(u,lerp(f[1],f[0],k)*c));},ss,[0,1],()=>[YLd,PAINT]);};
  const inPoly=(P,x,y)=>{let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};
  /* a rounded rectangle (side view) as a polygon */
  const rrect=(x0,x1,y0,y1,r)=>{const o=[];for(const [cx,cy,a0] of [[x1-r,y1-r,0],[x0+r,y1-r,Math.PI/2],[x0+r,y0+r,Math.PI],[x1-r,y0+r,Math.PI*1.5]])for(let k=0;k<=4;k++){const a=a0+k/4*Math.PI/2;o.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r]);}return o;};

  // ================================================================ fuselage: one loft, cowling lip (x 2.95) to the rudder post (x -5.75)
  // superellipse sections: centre height, half height, half width, exponent (round at the cowling, a squarish box along the cabin)
  const xLip=2.95,xTail=-5.75,xCowl=1.95;
  const cowlR=mono([[2.95,0.6],[2.9,0.628],[2.75,0.652],[2.45,0.66],[2.1,0.652],[1.95,0.646]]),cowlC=mono([[2.95,0.02],[1.95,0.0]]);
  const yT=mono([[1.95,0.646],[1.75,0.68],[1.45,0.8],[1.15,0.93],[0.6,0.95],[-0.45,0.95],[-1.2,0.9],[-2.2,0.8],[-3.4,0.66],[-4.6,0.56],[-5.75,0.5]]);
  const yB=mono([[1.95,-0.646],[1.7,-0.68],[1.2,-0.74],[0,-0.76],[-1.0,-0.72],[-2.2,-0.52],[-3.4,-0.24],[-4.6,0.04],[-5.75,0.22]]);
  const hW=mono([[1.95,0.646],[1.6,0.64],[1.0,0.63],[-0.6,0.615],[-1.6,0.53],[-2.8,0.38],[-4.0,0.24],[-5.0,0.13],[-5.75,0.06]]);
  const eX=mono([[1.95,2.0],[1.6,2.6],[1.0,3.6],[-1.0,3.6],[-2.6,3.0],[-5.75,2.4]]);
  const sec=x=>{if(x>=xCowl){const r=cowlR(x);return[cowlC(x),r,r,2];}const t=yT(x),b=yB(x);return[(t+b)/2,(t-b)/2,hW(x),eX(x)];};
  const pw=(c,e)=>Math.sign(c)*Math.pow(Math.abs(c),2/e);
  const F=(x,th)=>{const s=sec(x);return[x,s[0]+s[1]*pw(Math.sin(th),s[3]),s[2]*pw(Math.cos(th),s[3])];};
  const FN=(x,th)=>nrm(crs(sub(F(x+1e-4,th),F(x-1e-4,th)),sub(F(x,th+1e-3),F(x,th-1e-3))));
  const outN=(x,th)=>{let n=FN(x,th);const p=F(x,th),s=sec(x);if((p[1]-s[0])*n[1]+p[2]*n[2]<0)n=mul(n,-1);return n;};
  const side=(x,y,sd,off)=>{const s=sec(x);let q=clamp((y-s[0])/s[1],-0.999,0.999);const th=Math.asin(Math.sign(q)*Math.pow(Math.abs(q),s[3]/2)),thS=sd>0?th:Math.PI-th;return add(F(x,thS),mul(outN(x,thS),off||0));};
  // windows (side view; the same on both sides): the cockpit door with its slanted front, the cabin door window, two cabin windows
  const W1=[[1.24,0.1],[1.13,0.78],[0.55,0.84],[0.5,0.1]],W2=rrect(-0.38,0.3,0.14,0.74,0.1),W3=rrect(-1.08,-0.56,0.2,0.7,0.1),W4=rrect(-1.62,-1.26,0.3,0.64,0.08);
  const WS=[W1,W2,W3,W4];
  /* the windscreen: two panes over the top from the cowling back to the wing's leading edge */
  const wsBot=th=>1.62-0.18*Math.pow(Math.cos(th),2),inWS=(x,th)=>x>1.16&&x<wsBot(th)&&th>0.42&&th<Math.PI-0.42;
  const sideWin=(x,th)=>{const p=F(x,th),s=sec(x);if(Math.abs(p[2])<s[2]*0.6)return false;return WS.some(W=>inPoly(W,x,p[1]));};
  // the paint: yellow; an orange sweep on the cowling (below a line running from high at the lip to low at the firewall) that becomes the
  // stripe along the lower fuselage, narrowing and rising to the tail; dark pinstripes on its upper edge
  const swY=mono([[2.95,0.32],[2.7,0.18],[2.35,-0.06],[2.0,-0.26],[1.6,-0.02],[1.0,0.02],[0,0.02],[-1.5,0.08],[-3.0,0.2],[-4.5,0.32],[-5.75,0.4]]),
    stB=mono([[1.6,-0.54],[0.5,-0.52],[-1.0,-0.42],[-2.5,-0.2],[-4.0,0.04],[-5.75,0.27]]);
  const paintF=(x,y)=>{const t=swY(x);if(y>t+0.075&&y<t+0.1)return[PS,PAINT];if(y>t&&y<t+0.03)return[PS,PAINT];if(y<=t&&(x>1.6||y>=stB(x)))return[OR,PAINT];if(y<stB(x)&&y>stB(x)-0.025&&x<=1.6)return[PS,PAINT];return[YL,PAINT];};
  const body=vmesh();
  {const xs=[];for(let x=xTail;x<xLip-1e-6;x+=0.04)xs.push(x);xs.push(xLip);
    surf(body,F,xs,range(0,Math.PI*2,96),(x,th)=>{if(inWS(x,th)||sideWin(x,th))return null;const p=F(x,th);return paintF(x,p[1]);},{ev:1e-3});
    {const s=sec(xTail),c0=V(body,[xTail-0.01,s[0],0],[-1,0,0],YL,PAINT);for(let k=0;k<32;k++){const a=F(xTail,k/32*Math.PI*2),b=F(xTail,(k+1)/32*Math.PI*2);body.i.push(c0,V(body,b,[-1,0,0],YL,PAINT),V(body,a,[-1,0,0],YL,PAINT));}}
    surf(body,F,xs.filter(x=>x>-1.7&&x<1.7),range(0,Math.PI*2,96),(x,th)=>inWS(x,th)||sideWin(x,th)?[GLs,13]:null,{ev:1e-3});}
  // window frames: thin dark mouldings round each window, and the windscreen's centre post
  const frame=(W,sd)=>{let prv=null;const n=W.length;for(let i=0;i<=n;i++){const a=W[i%n],b=W[(i+1)%n],c=W[(i-1+n)%n],d=nrm([b[0]-c[0],b[1]-c[1],0]),pn=[-d[1],d[0]],p=side(a[0],a[1],sd,0.008),o=side(a[0]+pn[0]*0.025,a[1]+pn[1]*0.025,sd,0.008),N=[0,0,sd],q=[V(body,p,N,PG,PAINT),V(body,o,N,PG,PAINT)];if(prv)body.i.push(prv[0],prv[1],q[1],prv[0],q[1],q[0]);prv=q;}};
  for(const sd of [-1,1])for(const W of WS)frame(W,sd);
  {const th=Math.PI/2;let prv=null;for(let k=0;k<=10;k++){const x=lerp(1.16,wsBot(th),k/10),p=add(F(x,th),[0,0.008,0]),q=[V(body,add(p,[0,0,-0.02]),[0,1,0],PG,PAINT),V(body,add(p,[0,0,0.02]),[0,1,0],PG,PAINT)];if(prv)body.i.push(prv[0],prv[1],q[1],prv[0],q[1],q[0]);prv=q;}}
  // the registration N67684 on the rear fuselage, orange with a dark outline (letters from a canvas, one quad per run of pixels)
  if(typeof document!=='undefined'){const cv=document.createElement('canvas'),gx=cv.getContext('2d'),W=180,H=40;cv.width=W;cv.height=H;gx.fillStyle='#000';gx.fillRect(0,0,W,H);gx.font='italic bold 34px Arial';gx.textBaseline='middle';
    gx.lineWidth=4;gx.strokeStyle='#0f0';gx.strokeText('N67684',6,21);gx.fillStyle='#f00';gx.fillText('N67684',6,21);const d=gx.getImageData(0,0,W,H).data,x0=-1.95,len=1.55,y1=0.62,ht=0.32;
    for(const sd of [-1,1])for(let y=0;y<H;y++){let run=-1,rc=null;for(let x=0;x<=W;x++){const o=(y*W+x)*4,cl=x<W?(d[o]>120?OR:d[o+1]>120?PS:null):null;if(cl!==rc){if(rc&&run>=0){/* left side reads from the tail forward: mirror the text */const fx=a=>sd>0?x0-len+(a/W)*len:x0-(a/W)*len;
          const xa=fx(run),xb=fx(x),ya=y1-y/H*ht,yb=y1-(y+1)/H*ht,P4=[side(xa,ya,sd,0.009),side(xb,ya,sd,0.009),side(xb,yb,sd,0.009),side(xa,yb,sd,0.009)],ix=P4.map(p=>V(body,p,[0,0,sd],rc,PAINT));body.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);}run=x;rc=cl;}}}}
  // ================================================================ cowling lip, engine, exhaust
  revolve(body,[[2.95,0.6],[2.98,0.58],[2.99,0.555],[2.98,0.53],[2.95,0.515],[2.85,0.508],[2.7,0.505]],48,u=>u<1?[OR,PAINT]:u<3?[YL,PAINT]:u<4?[ORd,PAINT]:[DK,MATTE],0.02);
  revolve(body,[[2.72,0.5],[2.72,0.25]],32,()=>[DK,MATTE],0.02);
  revolve(body,[[2.7,0.26],[2.86,0.26],[2.98,0.21],[3.04,0.15]],20,()=>[ENG,1],0.02);
  for(let k=0;k<9;k++){const a=k/9*Math.PI*2+0.17,c=Math.cos(a),s=Math.sin(a),P=r=>[2.84,0.02+s*r,c*r];
    tube(body,P(0.23),P(0.32),0.078,0.078,10,ENG,1);for(let f=0;f<6;f++){const r0=0.32+f*0.021;tube(body,P(r0),P(r0+0.011),0.087,0.087,10,[0.4,0.4,0.42],1);}
    tube(body,P(0.45),P(0.48),0.072,0.062,10,[0.34,0.34,0.36],1,true);for(const dz of [-0.045,0.045])tube(body,[2.91,0.02+s*0.25+c*dz,c*0.25-s*dz],[2.91,0.02+s*0.45+c*dz,c*0.45-s*dz],0.009,0.009,5,CH,CHROME);}
  tube(body,[1.75,-0.55,0.5],[1.35,-0.7,0.6],0.06,0.055,10,DK,MATTE,true);// the exhaust stack on the right, under the cowling
  tube(body,[2.0,-0.62,-0.3],[1.55,-0.72,-0.3],0.05,0.05,8,DK,MATTE,true);// oil cooler scoop
  // ================================================================ wings: a straight, constant-chord wing on the cabin roof
  const semi=7.32,c0=1.59,xLE=1.16,yW=0.95,dih=0.017;
  const wLE=(s,sd)=>{const z=sd*(0.62+s*(semi-0.62)),tip=Math.max(0,(s-0.97)/0.03);return[xLE-0.03*tip,yW+Math.abs(z)*dih,z];},wTE=(s,sd)=>{const z=sd*(0.62+s*(semi-0.62)),tip=Math.max(0,(s-0.95)/0.05);return[xLE-c0+0.25*tip*tip,yW+Math.abs(z)*dih,z];};
  const sAil=[0.62,0.97],sFlap=[0.03,0.6],tH=0.76;
  /* orange band near each tip with a dark pinstripe each side (photos 1 and 2); the rest yellow */
  const wPaint=s=>s>0.855&&s<0.862||s>0.946&&s<0.953?[PS,PAINT]:s>=0.862&&s<=0.946?[OR,PAINT]:[YL,PAINT];
  const parts={};
  for(const sd of [-1,1]){const U=()=>[0,1,0],LE=s=>wLE(s,sd),TE=s=>wTE(s,sd),ss=[...new Set([...range(0,1,34),...sAil,...sFlap,0.855,0.862,0.946,0.953])].sort((a,b)=>a-b);
    const pc=(s)=>wPaint(s);lift(body,LE,TE,U,0.15,0.03,ss,0,tH,s=>pc(s),16);
    lift(body,LE,TE,U,0.15,0.03,ss.filter(s=>s<=sFlap[0]+1e-9||s>=sAil[1]-1e-9),tH,1,s=>pc(s),6);
    // the tip: a rounded closing cap
    {const a=LE(1),b=TE(1),c=Math.hypot(...sub(a,b));surf(body,(t,k)=>{const p=add(a,mul(sub(b,a),t)),f=foilY(t,0.15,0.03,0.4);return add(add(p,[0,lerp(f[1],f[0],k)*c,0]),[0,0,sd*0.06*Math.sin(k*Math.PI)]);},cosr(10),range(0,1,6),()=>[YL,PAINT]);}
    const mk=(sr,name,col)=>{const h0=add(LE(sr[0]),mul(sub(TE(sr[0]),LE(sr[0])),tH)),h1=add(LE(sr[1]),mul(sub(TE(sr[1]),LE(sr[1])),tH)),org=mul(add(h0,h1),0.5),M=vmesh(),sh=f=>s=>sub(f(s),org);
      lift(M,sh(LE),sh(TE),U,0.15,0.03,ss.filter(s=>s>=sr[0]-1e-9&&s<=sr[1]+1e-9),tH,1,s=>col?col(s):[YL,PAINT],8);parts[name]={o:org,ax:nrm(sub(h1,h0)),M};};
    mk(sAil,sd<0?'ailL':'ailR',s=>wPaint(s));mk(sFlap,sd<0?'flapL':'flapR');
    // the lift strut (orange, streamlined) from the lower fuselage to the wing at 40% span, with a jury strut, and the strut fairings
    const wa=add(LE(0.36),mul(sub(TE(0.36),LE(0.36)),0.3)),fa=[0.42,-0.58,sd*0.6];strut(body,fa,[wa[0],wa[1]-0.02,wa[2]],0.13,OR,PAINT);
    {const m=add(fa,mul(sub(wa,fa),0.55)),wj=add(LE(0.2),mul(sub(TE(0.2),LE(0.2)),0.32));tube(body,m,[wj[0],wj[1]-0.02,wj[2]],0.018,0.018,6,OR,PAINT);}
    // nav lights and the pitot under the left wing
    ball(body,add(mul(add(LE(1),TE(1)),0.5),[0.35,0,sd*0.06]),0.035,[1,1,1],sd<0?[0.95,0.1,0.1]:[0.1,0.85,0.3],1,8);
    if(sd<0)tube(body,[0.95,yW+5.2*dih-0.08,-5.2],[1.45,yW+5.2*dih-0.08,-5.2],0.012,0.012,6,AL,CHROME);}
  // a roof fairing where the wing meets the cabin, two whip aerials on top
  surf(body,(x,z)=>[x,yW+0.075*Math.cos(z/0.62*Math.PI/2),z],range(xLE-c0,xLE,8),range(-0.62,0.62,6),()=>[YL,PAINT]);
  tube(body,[-0.2,yW+0.08,0.15],[-0.45,yW+0.85,0.15],0.008,0.004,5,BK,MATTE);tube(body,[-0.6,yW+0.06,-0.15],[-0.85,yW+0.8,-0.15],0.008,0.004,5,BK,MATTE);
  // ================================================================ tail: the tailplane on the tail cone, a tall fin with a square top
  {const tLE=(s,sd)=>{const z=sd*(0.06+s*2.42);return[-4.62-0.1*s,0.5,z];},tTE=(s,sd)=>{const z=sd*(0.06+s*2.42);return[-5.98+0.25*s*s,0.5,z];},tE=0.62;
    for(const sd of [-1,1]){const ss=range(0,1,14);lift(body,s=>tLE(s,sd),s=>tTE(s,sd),()=>[0,1,0],0.1,0,ss,0,tE,s=>s>0.84?[OR,PAINT]:[YL,PAINT],10);
      tube(body,[-5.0,0.12,sd*0.12],[-5.05,0.48,sd*1.4],0.016,0.014,6,OR,PAINT);}// the strut under each half
    const h=add(tLE(0,1),mul(sub(tTE(0,1),tLE(0,1)),tE)),M=vmesh();for(const sd of [-1,1])lift(M,s=>sub(tLE(s,sd),[h[0],h[1],0]),s=>sub(tTE(s,sd),[h[0],h[1],0]),()=>[0,1,0],0.1,0,range(0,1,14),tE,1,s=>s>0.84?[OR,PAINT]:[YL,PAINT],6);
    parts.elev={o:[h[0],h[1],0],ax:[0,0,1],M};}
  {const xH=-5.75,LEc=y=>y<0.62?-4.1-(y-0.5)*3.2:-4.48-(y-0.62)*0.8,yTop=2.05;
    /* an orange band across the fin, slanting back (photo 1) */const fP=(y,x)=>{const b=0.95+(x+5.0)*0.35;return y>b&&y<b+0.32?[OR,PAINT]:(y>b-0.03&&y<=b)||(y>=b+0.32&&y<b+0.35)?[PS,PAINT]:[YL,PAINT];};
    surf(body,(y,t)=>{const xl=Math.max(LEc(y),xH+0.01),x=lerp(xl,xH,t),c=xl-xH,f=foilY(t,0.11,0,0.4)[0];return[x,y,f*c];},range(0.5,yTop,24),cosr(12),(y,t)=>fP(y,lerp(LEc(y),xH,t)));
    surf(body,(y,t)=>{const xl=Math.max(LEc(y),xH+0.01),x=lerp(xl,xH,t),c=xl-xH,f=foilY(t,0.11,0,0.4)[1];return[x,y,f*c];},range(0.5,yTop,24),cosr(12),(y,t)=>fP(y,lerp(LEc(y),xH,t)));
    surf(body,(x,k)=>[x,yTop,lerp(-1,1,k)*0.03*(x-xH)/Math.max(0.01,LEc(yTop)-xH)],range(xH,LEc(yTop),6),[0,1],()=>[YL,PAINT]);
    const M=vmesh(),rTE=y=>y>1.9?-0.55+(y-1.9)*1.2:-0.62+Math.max(0,0.25-y)*0.6;// the rudder: square top with a small horn balance
    for(const sg of [1,-1])surf(M,(y,t)=>{const xt=rTE(y),x=xt*t,f=foilY(t,0.09,0,0.4)[sg>0?0:1];return[x,y,f*0.62];},range(0.2,yTop,22),cosr(8),(y,t)=>y>0.95+(-5.75-0.3*t+5)*0.35&&y<1.27+(-5.75-0.3*t+5)*0.35?[OR,PAINT]:[YL,PAINT]);
    parts.rud={o:[xH,0,0],ax:[0,1,0],M};}
  // ================================================================ cabin interior (seen through the glass)
  {const xs=range(-1.7,1.62,30);surf(body,(x,th)=>{const s=sec(x),k=0.96;return[x,s[0]+s[1]*k*pw(Math.sin(th),s[3]),s[2]*k*pw(Math.cos(th),s[3])];},xs,range(0,Math.PI*2,44),(x,th)=>inWS(x,th)||sideWin(x,th)?null:Math.sin(th)<-0.55?[DK,MATTE]:[INT,INTM],{ev:1e-3,flip:true});
    surf(body,(x,z)=>[x,-0.5,z],[-1.7,1.5],[-0.58,0.58],()=>[DK,MATTE]);
    surf(body,(z,y)=>[1.38-0.12*(y-0.1),y,z],[-0.58,0.58],[0.0,0.36],()=>[DK,MATTE]);tube(body,[1.36,0.38,-0.58],[1.36,0.38,0.58],0.035,0.035,8,DK,MATTE);
    {const xf=1.5,s=sec(xf);surf(body,(k,th)=>[xf,s[0]+s[1]*k*pw(Math.sin(th),s[3]),s[2]*k*pw(Math.cos(th),s[3])],[0,0.5,0.97],range(0,Math.PI*2,44),()=>[DK,MATTE]);}/* the firewall: closes the cabin ahead of the panel */
    for(const [z,y,r] of [[-0.45,0.27,0.04],[-0.34,0.27,0.04],[-0.45,0.15,0.036],[-0.34,0.15,0.036],[-0.22,0.22,0.032],[0.05,0.26,0.032],[0.18,0.26,0.032],[0.33,0.2,0.04]])tube(body,[1.38-0.12*(y-0.1)-0.005,y,z],[1.38-0.12*(y-0.1)-0.012,y,z],r,r,12,[0.85,0.85,0.8],0,true);
    tube(body,[1.3,0.1,-0.33],[1.05,0.12,-0.33],0.02,0.02,6,DK,MATTE);tube(body,[1.05,0.05,-0.43],[1.05,0.2,-0.23],0.018,0.018,6,DK,MATTE,true);
    for(const [x,z,w] of [[0.45,-0.3,0.46],[0.45,0.3,0.46],[-0.55,0,1.1],[-1.35,0,1.0]]){surf(body,(u,v)=>[x+0.25-u*0.5,-0.15+0.03*u,z+(v-0.5)*w],[0,1],[0,1],()=>[SEAT,0]);surf(body,(u,v)=>[x-0.25-u*0.08,-0.15+u*0.62,z+(v-0.5)*w],[0,1],[0,1],()=>[SEAT,0]);}}
  const person=(x,z,shirt,pilot)=>{const M=vmesh();ball(M,[x-0.04,-0.02,z],0.17,[1.0,1.35,1.15],shirt,0,12);ball(M,[x-0.02,0.23,z],0.12,[0.9,0.5,1.6],shirt,0,10);
    tube(M,[x,0.32,z],[x+0.01,0.39,z],0.045,0.045,8,SKIN,0);ball(M,[x+0.02,0.51,z],0.105,[1.05,1.15,0.95],SKIN,0,14);ball(M,[x,0.56,z],0.105,[1.0,0.85,0.97],HAIR,0,12);
    if(pilot){tube(M,[x+0.02,0.64,z-0.13],[x+0.02,0.64,z+0.13],0.02,0.02,6,DK,MATTE);for(const dz of [-0.12,0.12])tube(M,[x+0.02,0.51,z+dz],[x+0.02,0.52,z+dz*1.18],0.05,0.05,10,DK,MATTE,true);}
    for(const sd of [-1,1]){const sh=[x-0.02,0.23,z+sd*0.19],el=[x+0.2,0.05,z+sd*0.2],hd=pilot?[1.05,0.13,z+sd*0.08]:[x+0.4,0.0,z+sd*0.12];tube(M,sh,el,0.05,0.045,8,shirt,0);tube(M,el,hd,0.045,0.035,8,shirt,0);ball(M,hd,0.04,[1,1,1],SKIN,0,8);}
    for(const sd of [-1,1]){tube(M,[x-0.06,-0.16,z+sd*0.08],[x+0.36,-0.12,z+sd*0.09],0.07,0.06,8,[0.2,0.2,0.24],0);tube(M,[x+0.36,-0.12,z+sd*0.09],[x+0.42,-0.48,z+sd*0.09],0.055,0.045,8,[0.2,0.2,0.24],0);}return M;};
  const pilotM=person(0.47,-0.3,SHIRT,true),paxM=person(0.47,0.3,SHIRT2,false);
  // ================================================================ propeller: three grey blades with white tip bands, a pointed chrome spinner
  const prop=vmesh();
  {revolve(prop,[[-0.02,0.22],[0.08,0.222],[0.2,0.2],[0.32,0.15],[0.42,0.09],[0.48,0.04],[0.5,0.0]],32,()=>[CH,CHROME]);
    for(let b=0;b<3;b++){const a0=b/3*Math.PI*2,ca=Math.cos(a0),sa=Math.sin(a0),rs=range(0.2,1.3,16),tw=r=>(0.75-0.45*(r-0.2)/1.1),ch=r=>0.12+0.09*Math.sin(Math.min(1,(r-0.15)/0.8)*Math.PI*0.6)-Math.max(0,r-1.18)*0.5;
      for(const sg of [1,-1])surf(prop,(r,t)=>{const a=tw(r),c=ch(r),f=foilY(t,0.09,0.03,0.4)[sg>0?0:1],xb=(0.5-t)*c,yb=f*c,ly=r,lz=xb*Math.cos(a)-yb*Math.sin(a);return[0.1+xb*Math.sin(a)+yb*Math.cos(a),ly*ca-lz*sa,ly*sa+lz*ca];},rs,cosr(6),(r)=>r>1.16?[WH,PAINT]:r>1.1&&r<=1.16?[[0.8,0.12,0.1],PAINT]:[PG,PAINT]);}}
  const disc=vmesh();surf(disc,(r,a)=>[0.1,Math.sin(a)*r,Math.cos(a)*r],[0.25,0.8,1.3],range(0,Math.PI*2,48),()=>[[0.5,0.5,0.52],12]);
  // ================================================================ floats: aluminium hulls with a V bottom and a step, white decks with dark
  // walkways, rubber bow bumpers, a water rudder at each stern; the rigging: an N strut forward, a ladder strut aft, spreader bars, wires
  const fx0=3.95,fx1=-4.0,xSt=-0.3,ydk=mono([[3.95,-1.64],[3.4,-1.5],[2.4,-1.45],[0,-1.45],[-2.5,-1.5],[-4.0,-1.64]]),
    kF=mono([[3.95,-1.7],[3.6,-1.96],[3.0,-2.16],[2.0,-2.24],[0.5,-2.26],[xSt,-2.26]]),kA=mono([[xSt,-2.17],[-1.2,-2.12],[-2.4,-2.01],[-3.4,-1.88],[-4.0,-1.72]]),
    bm=mono([[3.95,0.06],[3.55,0.28],[2.8,0.39],[0.5,0.41],[-2.4,0.35],[-3.5,0.2],[-4.0,0.05]]);
  const yk=x=>x>=xSt?kF(x):kA(x);
  /* the half section as a polyline: deck centre, deck edge, shoulder, chine, keel; t from -1 (left) to 1 (right) */
  const fsec=(x,t)=>{const b=bm(x),yd=ydk(x),k=yk(x),yc=k+0.24*b/0.41,P=[[0,yd],[b*0.88,yd],[b,yd-0.06],[b,yc],[0,k]],u=Math.abs(t)*4,i=Math.min(3,Math.floor(u)),f=u-i,a=P[i],c=P[i+1];return[Math.sign(t||1)*lerp(a[0],c[0],f),lerp(a[1],c[1],f)];};
  for(const sd of [-1,1]){const zc=sd*PLB.floatZ,xs=[...range(fx1,xSt-0.001,30),xSt+0.001,...range(xSt+0.1,fx0,30)].sort((a,b)=>a-b);
    surf(body,(x,t)=>{const p=fsec(x,t);return[x,p[1],zc+p[0]];},xs,range(-1,1,32),(x,t)=>{const a=Math.abs(t);if(a<0.25)return Math.abs(t)<0.07?[BK,MATTE]:[WH,PAINT];if(a<0.5)return[WH,PAINT];if(a<0.75)return(Math.abs(a-0.62)<0.012)?[ALd,CHROME]:[AL,CHROME];return[ALd,CHROME];},{ev:1e-3});
    // the step face and the transom
    surf(body,(t,k)=>{const a=fsec(xSt-0.001,t),b2=fsec(xSt+0.001,t);return[xSt,lerp(b2[1],a[1],k),zc+a[0]];},range(-1,1,16).filter(t=>Math.abs(t)>0.75),[0,1],()=>[ALd,CHROME]);
    ball(body,[fx0-0.02,ydk(fx0)-0.03,zc],0.09,[1.3,0.8,0.9],BK,MATTE,10);// bow bumper
    box(body,[fx1+0.05,yk(fx1)-0.16,zc],[0.16,0.16,0.012],ALd,CHROME);// water rudder
    for(const x of [2.6,-1.6])box(body,[x,ydk(x)+0.04,zc+sd*0.28],[0.06,0.03,0.025],AL,CHROME);// cleats
    // N strut forward, ladder strut aft (rungs between its two legs), and the fittings on the deck
    const D=x=>[x,ydk(x),zc];strut(body,[1.62,-0.66,sd*0.42],D(2.1),0.09,AL,CHROME);strut(body,[0.78,-0.72,sd*0.5],D(2.1),0.08,AL,CHROME);
    const A0=[0.28,-0.74,sd*0.52],A1=D(-0.28),B0=[0.78,-0.72,sd*0.5],B1=D(0.32);strut(body,A0,A1,0.09,AL,CHROME);strut(body,B0,B1,0.08,AL,CHROME);
    for(const f of [0.25,0.45,0.65,0.85]){const a=add(A0,mul(sub(A1,A0),f)),b=add(B0,mul(sub(B1,B0),f));tube(body,a,b,0.016,0.016,6,AL,CHROME);}
    tube(body,[0.28,-0.74,sd*0.52],D(2.1),0.006,0.006,4,AL,CHROME);/* bracing wire */}
  for(const x of [2.1,-0.28]){tube(body,[x,ydk(x)+0.02,-PLB.floatZ],[x,ydk(x)+0.02,PLB.floatZ],0.035,0.035,8,AL,CHROME);}// spreader bars
  for(const sd of [-1,1])tube(body,[2.1,ydk(2.1),sd*PLB.floatZ],[-0.28,ydk(-0.28)+0.6,-sd*0.3],0.006,0.006,4,AL,CHROME);// cross wires between the floats
  // ================================================================ amphibious gear (hinge at the origin of each mesh)
  const wheel=(M,c,R0,w,col)=>{surf(M,(a,b)=>{const r=w/2;return[c[0]+Math.cos(a)*(R0-r+r*Math.cos(b)),c[1]+Math.sin(a)*(R0-r+r*Math.cos(b)),c[2]+r*Math.sin(b)];},range(0,Math.PI*2,24),range(0,Math.PI*2,10),()=>[TY,MATTE],{ev:1e-3});
    for(const s2 of [-1,1]){surf(M,(r,a)=>[c[0]+Math.cos(a)*r,c[1]+Math.sin(a)*r,c[2]+s2*w*0.42],[0.02,R0-w*0.45],range(0,Math.PI*2,16),()=>[col,CHROME]);}};
  const nose=()=>{const M=vmesh(),wc=[0.22,-0.68,0];tube(M,[0,0,0],[0.17,-0.5,0],0.035,0.03,8,AL,CHROME,true);tube(M,[0.17,-0.5,-0.08],[0.22,-0.68,-0.08],0.018,0.018,6,AL,CHROME);tube(M,[0.17,-0.5,0.08],[0.22,-0.68,0.08],0.018,0.018,6,AL,CHROME);
    tube(M,[0.17,-0.5,-0.09],[0.17,-0.5,0.09],0.02,0.02,6,AL,CHROME);wheel(M,wc,0.19,0.11,AL);return M;};
  const main=sd=>{const M=vmesh(),wc=[0.05,-0.78,sd*0.1];tube(M,[0,0,0],[0.03,-0.62,sd*0.06],0.045,0.04,8,AL,CHROME,true);tube(M,[0.03,-0.62,sd*0.06],wc,0.03,0.03,6,AL,CHROME);
    tube(M,[-0.35,-0.05,-sd*0.3],[0.03,-0.55,sd*0.05],0.02,0.02,6,AL,CHROME);/* the retraction jack */wheel(M,wc,0.21,0.13,AL);return M;};
  const list=[['body',body],['prop',prop],['pilot',pilotM],['pax',paxM],['noseL',nose()],['noseR',nose()],['mainL',main(-1)],['mainR',main(1)],['elev',parts.elev.M],['rud',parts.rud.M],
    ['ailL',parts.ailL.M],['ailR',parts.ailR.M],['flapL',parts.flapL.M],['flapR',parts.flapR.M],['disc',disc]];
  list.forEach(([n],i)=>{BEAVER_PARTS[n]={i,...(parts[n]?{o:parts[n].o,ax:parts[n].ax}:{})};});
  return list.map(l=>l[1]);}

// ===================================================================
// the Beaver in flight and on the water: drawing, float hydrodynamics, wheels, spray
// ===================================================================
const Beaver={
  /* the water surface under a point (the sea's swell where it is the sea), or null on dry land */
  waterY(x,z){const T=App.T;if(!T)return null;const cx=clamp(x,0,T.W),cz=clamp(z,0,T.W),w=sampleWater(T,cx,cz);if(!(w[1]>0&&w[0]>R.sampleHr(T,cx,cz)+0.05))return null;
    if(T.sea!=null&&Math.abs(w[0]-T.sea)<0.6&&(typeof Sea!=='undefined')&&Sea.amp&&Sea.amp())return Sea.height(cx,cz);return w[0];},
  draw(pl,p){if(!R.beaverMesh){R.beaverMesh=beaverMeshes().map(m=>R.uploadVeh(m));}const M=R.beaverMesh,PP=BEAVER_PARTS,dm=(n,mat)=>{const m=M[PP[n].i];if(!m)return;gl.uniformMatrix4fv(p.u('uModel'),false,mat);gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,0);Stats.draws++;Stats.tris+=m.count/3;};
    gl.uniform1f(p.u('uDist'),0);const inC=pl.cam==='cockpit';if(inC)gl.uniform2f(p.u('uOcc'),PLB.eye[1]-0.02,-(10+PLB.eye[0]+0.7));dm('body',pl.mat());if(inC)gl.uniform2f(p.u('uOcc'),0,0);const r=pl.rpm(),c=pl.ctl,K=PLB;
    dm('prop',pl.mat([K.propX,0.02,0],Q.axis([1,0,0],pl.prop)));if(pl.cam!=='cockpit')dm('pilot',pl.mat());dm('pax',pl.mat());
    // wheels: the nose wheels swing up and forward into the float bows, the main wheels up and back along the float sides
    const g=1-pl.gearPos,nh=K.noseHinge,mh=K.mainHinge;
    for(const sd of [-1,1]){dm(sd<0?'noseL':'noseR',pl.mat([nh[0],nh[1],sd*nh[2]],Q.axis([0,0,1],g*1.66)));dm(sd<0?'mainL':'mainR',pl.mat([mh[0],mh[1],sd*mh[2]],Q.axis([0,0,1],-g*1.75)));}
    const hg=(n,a)=>{const q=PP[n];dm(n,pl.mat(q.o,Q.axis(q.ax,a)));};
    hg('elev',-c.pitch*0.35);hg('rud',c.yaw*0.4);hg('ailL',-c.roll*0.4);hg('ailR',-c.roll*0.4);hg('flapL',-pl.flapPos*0.6);hg('flapR',pl.flapPos*0.6);
    pl.drawNav(p);const da=clamp((r-500)/1400,0,1)*0.42;if(da>0.01){gl.uniform2f(p.u('uOcc'),da,0);dm('disc',pl.mat([K.propX,0.02,0]));gl.uniform2f(p.u('uOcc'),0,0);}},
  /* contact forces: the float keels in the water (buoyancy, planing lift, drag that rises to a hump and falls once the floats run on the
     step, keel side force, water rudders), the keels on dry ground (a hard slide), the wheels on land. Returns the world force, the body
     moment and how many points touch */
  contact(pl,s,qi,V,c,w,M0,dt){const K=pl.K||PLB,hk=K.hk||1,Fw=[0,0,0];let M=M0.slice(),onG=0,onW=0,spray=0;const wv=Q.rot(s.q,w),fx=Q.rot(s.q,[1,0,0]);let hx=[fx[0],0,fx[2]];const hl=Math.hypot(hx[0],hx[2])||1;hx=[hx[0]/hl,0,hx[2]/hl];const hz=[-hx[2],0,hx[0]];
    const addF=(cp,f)=>{Fw[0]+=f[0];Fw[1]+=f[1];Fw[2]+=f[2];const fb=Q.rot(qi,f);M=[M[0]+cp[1]*fb[2]-cp[2]*fb[1],M[1]+cp[2]*fb[0]-cp[0]*fb[2],M[2]+cp[0]*fb[1]-cp[1]*fb[0]];};
    const at=cp=>{const wp=Q.rot(s.q,cp),P=[s.p[0]+wp[0],s.p[1]+wp[1],s.p[2]+wp[2]],rv=[wv[1]*wp[2]-wv[2]*wp[1],wv[2]*wp[0]-wv[0]*wp[2],wv[0]*wp[1]-wv[1]*wp[0]];return{P,pv:[s.v[0]+rv[0],s.v[1]+rv[1],s.v[2]+rv[2]]};};
    const gearDown=pl.gearPos>0.95,wheelsOut=pl.gearPos>0.3;
    // the keels
    for(const cp of K.keel){const {P,pv}=at(cp),wl=this.waterY(P[0],P[2]),vr=pv[0]*hx[0]+pv[2]*hx[2],vs=pv[0]*hz[0]+pv[2]*hz[2];
      if(wl!=null){const d=wl-P[1];if(d<=0)continue;onW++;const dd=Math.min(d,0.75),fwd=Math.max(0,vr);
        if(wheelsOut&&vr>7&&cp[0]>2){pl.crash('Nosed over: the wheels were down on the water');return null;}
        const N=hk*Math.max(0,7270*dd+38*dd*fwd*fwd-2600*pv[1]*Math.min(1,dd/0.1));
        /* along the float: planing drag (lift/drag about 6) plus the hump of a hull still pushing water, highest near 10 m/s */const av=Math.abs(vr);let Fr=-hk*Math.sign(vr)*dd*(6*av*av+160*av*Math.exp(-(av/11)*(av/11))),Fs=-hk*(1400*dd*vs*Math.abs(vs)+2500*dd*vs);
        if(cp[0]<-3&&pl.gearPos<0.5)Fs+=-hk*c.yaw*5000*dd*clamp(vr,-6,6);/* water rudders: strong at taxi speed */
        addF(cp,[hx[0]*Fr+hz[0]*Fs,N,hx[2]*Fr+hz[2]*Fs]);if(Math.abs(vr)>4&&dd>0.02)spray+=dd*Math.abs(vr);continue;}
      const gy=Plane.groundAt(P[0],P[2]),pen=gy-P[1];if(pen<=0)continue;onG++;
      if(-pv[1]>3.5){pl.crash('Landed hard on the floats');return null;}if(!gearDown&&Math.abs(vr)>6&&!pl._scrape){pl._scrape=true;UI.toast('Floats on hard ground: the wheels were up');}
      const N=hk*Math.max(0,120000*pen-9000*pv[1]),Fr=-Math.sign(vr)*Math.min(Math.abs(vr)*9000,0.45*N),Fs=-clamp(vs*9000,-0.7*N,0.7*N);addF(cp,[hx[0]*Fr+hz[0]*Fs,N,hx[2]*Fr+hz[2]*Fs]);}
    // the wheels, on land only (on water they hang in it, the floats carry the plane)
    if(gearDown)K.wheels.forEach((cp,i)=>{const {P,pv}=at(cp);if(this.waterY(P[0],P[2])!=null)return;const gy=Plane.groundAt(P[0],P[2]),pen=gy-P[1];if(pen<=0)return;onG++;
      if(-pv[1]>5.5){pl.crash('Hard landing');return;}const k=hk*(i<2?90000:150000),dmp=hk*(i<2?8000:13000),N=Math.max(0,k*pen-dmp*pv[1]);let ax=hx,az=hz;
      if(i<2){const st=-c.yaw*0.45*(V<20?1:0.3),c2=Math.cos(st),s2=Math.sin(st);ax=[hx[0]*c2-hz[0]*s2,0,hx[2]*c2-hz[2]*s2];az=[-ax[2],0,ax[0]];}/* the nose wheels steer with the rudder pedals */
      const vr=pv[0]*ax[0]+pv[2]*ax[2],vs=pv[0]*az[0]+pv[2]*az[2],mu=0.02+(i>=2?c.brake*0.6:0),Fr=-Math.sign(vr)*Math.min(Math.abs(vr)*8000,mu*N),Fs=-clamp(vs*9000,-0.8*N,0.8*N);
      addF(cp,[ax[0]*Fr+az[0]*Fs,N,ax[2]*Fr+az[2]*Fs]);});
    if(pl.crashed)return null;if(!onG)pl._scrape=false;
    // spray: from the bows and the steps, thrown out sideways and up (photo 1); more the faster it runs
    if(spray>0&&P.smoke!==0&&Math.random()<Math.min(1,spray*dt*3))for(const sd of [-1,1])for(const sp of (K.spray||[[2.2,-2.2,K.floatZ+0.45],[-0.3,-2.2,K.floatZ+0.45]])){const {P:Pp}=at([sp[0],sp[1],sd*sp[2]]),vh=Math.hypot(s.v[0],s.v[2]);
      Particles.spawn(Pp[0],Pp[1]+0.1,Pp[2],s.v[0]*0.3+hz[0]*sd*(2+vh*0.15),1.5+vh*0.12*Math.random(),s.v[2]*0.3+hz[2]*sd*(2+vh*0.15),0.9,0.35,1.6,2);}/* white spray (type 0 was grey smoke) */
    return{Fw,M,onG:onG+onW,onW};},
  /* where it starts: beside a jetty, on an airstrip, or on open water near the camera (a straight 600 m of water), else a flat field */
  spawn(pl,at){const T=App.T,c=Cam.target;let spot=null;
    const sp=at||(()=>{let best=null,bd=1e18;for(const s of Air.list){const d=Math.hypot(s.x-c[0],s.z-c[2]);if(d<bd){bd=d;best=s;}}return best;})();
    if(sp&&sp.water){const h=sp.h,x=sp.x+Math.cos(h)*28,z=sp.z+Math.sin(h)*28;spot={x,z,h,water:true,s:sp};}
    else if(sp){const L=AIR.len/2-30;spot={x:sp.x-Math.cos(sp.h)*L,z:sp.z-Math.sin(sp.h)*L,h:sp.h,s:sp};}
    else{for(let k=0;k<900&&!spot;k++){const r=k<400?2500:T.W,x=c[0]+(Math.random()-0.5)*r,z=c[2]+(Math.random()-0.5)*r,h=Math.random()*6.283;if(this.waterY(x,z)==null)continue;let ok=true;for(let t=-40;t<=600&&ok;t+=20){const px=x+Math.cos(h)*t,pz=z+Math.sin(h)*t;if(this.waterY(px,pz)==null||R.sampleHr(T,px,pz)>(this.waterY(px,pz)||0)-1.2)ok=false;}if(ok)spot={x,z,h,water:true};}}
    if(!spot)return false;
    const q0=Q.axis([0,1,0],-spot.h);pl.st={p:[spot.x,0,spot.z],v:[0,0,0],q:q0,w:[0,0,0]};pl.ctl={thr:0,pitch:0,roll:0,yaw:0,brake:spot.water?0:1};pl.parkBrake=!spot.water;
    pl.gear=spot.water?0:1;pl.gearPos=pl.gear;pl.bridges=0;pl.prevP=null;pl.flaps=0;pl.flapPos=0;pl.crashed=false;pl.on=true;pl.prop=0;pl._scrape=false;
    if(spot.water){const wl=this.waterY(spot.x,spot.z);pl.st.p[1]=wl+(pl.K.float0||2.06);}else{let y=-1e9;for(const cp of pl.K.wheels){const wp=Q.rot(q0,cp);y=Math.max(y,Plane.groundAt(spot.x+wp[0],spot.z+wp[2])-wp[1]);}pl.st.p[1]=y+0.01;}
    UI.toast(spot.water?(spot.s?`On the water at jetty ${spot.s.n}: stop beside it to load cargo. Full throttle, stick back a little until it climbs onto the step, then ease forward and lift off at about 100 km/h`:'On the water: full throttle, hold the stick a little back until the floats run on the step, then lift off at about 100 km/h. Wheels stay up on water'):(spot.s?`On airstrip ${spot.s.n}, wheels down`:'Ready'));return true;}};
