'use strict';
// ===== gen.js
// ===================================================================
// WORLD GENERATION (CPU) — steps 2, 3, 6, 7, 8
// Pure functions of the params object; everything seeded => deterministic.
// ===================================================================
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const clamp=(x,a,b)=>x<a?a:x>b?b:x;
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};

// ---- 2D simplex noise, seeded
function makeNoise(seed){
  const rnd=mulberry32(seed*7919+13), p=new Uint8Array(256), perm=new Uint8Array(512);
  for(let i=0;i<256;i++)p[i]=i;
  for(let i=255;i>0;i--){const j=(rnd()*(i+1))|0;const t=p[i];p[i]=p[j];p[j]=t;}
  for(let i=0;i<512;i++)perm[i]=p[i&255];
  const GX=new Float32Array(8),GY=new Float32Array(8);
  for(let i=0;i<8;i++){GX[i]=Math.cos(i*Math.PI/4+0.3927);GY[i]=Math.sin(i*Math.PI/4+0.3927);}
  const F2=0.5*(Math.sqrt(3)-1),G2=(3-Math.sqrt(3))/6;
  return function(x,y){
    const s=(x+y)*F2,i=Math.floor(x+s),j=Math.floor(y+s),t=(i+j)*G2;
    const x0=x-(i-t),y0=y-(j-t);let i1,j1;if(x0>y0){i1=1;j1=0;}else{i1=0;j1=1;}
    const x1=x0-i1+G2,y1=y0-j1+G2,x2=x0-1+2*G2,y2=y0-1+2*G2,ii=i&255,jj=j&255;
    let n=0,q;
    q=0.5-x0*x0-y0*y0;if(q>0){const g=perm[ii+perm[jj]]&7;q*=q;n+=q*q*(GX[g]*x0+GY[g]*y0);}
    q=0.5-x1*x1-y1*y1;if(q>0){const g=perm[ii+i1+perm[jj+j1]]&7;q*=q;n+=q*q*(GX[g]*x1+GY[g]*y1);}
    q=0.5-x2*x2-y2*y2;if(q>0){const g=perm[ii+1+perm[jj+1]]&7;q*=q;n+=q*q*(GX[g]*x2+GY[g]*y2);}
    return n*99.2;
  };
}
function fbm(n,x,y,oct,gain,lac){let s=0,a=1,f=1,norm=0;for(let i=0;i<oct;i++){s+=a*n(x*f,y*f);norm+=a;a*=gain;f*=lac;}return s/norm;}
function ridged(n,x,y,oct,gain,lac){let s=0,a=1,f=1,prev=1,norm=0;for(let i=0;i<oct;i++){let v=1-Math.abs(n(x*f,y*f));v*=v;s+=v*a*prev;norm+=a;prev=clamp(v*1.6,0,1);a*=gain;f*=lac;}return s/norm;}

// yield helper so generation never freezes the page
function makeYielder(prog){let last=Date.now();return async(frac,label)=>{if(Date.now()-last>28){if(prog)prog(frac,label);await new Promise(r=>setTimeout(r,0));last=Date.now();}};}

// ---- Terrain function: raw (un-normalised) height at world x,z
function makeTerrainFn(p){
  const s=p.seed|0, n1=makeNoise(s), n2=makeNoise(s+101), n3=makeNoise(s+202), n4=makeNoise(s+303), n5=makeNoise(s+404);
  const W=p.worldSize, oct=p.octaves|0, gain=p.roughness, lac=p.lacunarity, fs=p.featureScale;
  const ta=mulberry32(s*13+1)()*Math.PI*2, tc=Math.cos(ta), ts=Math.sin(ta);
  return function(x,z,out){
    let px=x/fs, pz=z/fs;
    if(p.warp>0){const wx=fbm(n2,px*0.6+5.2,pz*0.6+1.3,4,0.5,2),wz=fbm(n3,px*0.6+8.3,pz*0.6+2.8,4,0.5,2);px+=p.warp*wx;pz+=p.warp*wz;}
    const base=fbm(n1,px,pz,oct,gain,lac)*0.5+0.5;
    let mm=smooth(0.30,0.72,fbm(n4,px*0.42+11.1,pz*0.42+7.7,3,0.5,2)*0.5+0.5+(p.mountains-0.5)*0.9);
    const r=ridged(n5,px*1.05+3.3,pz*1.05+9.1,oct,gain,lac);
    // distance to world border: <0 outside, 0 at border, 0.5 at centre
    const e=Math.min(x,W-x,z,W-z)/W;
    // edge ranges with gaps (passes) so valleys can drain out of the world
    const gap=smooth(0.25,0.6,n3(x/W*3.1+17.3,z/W*3.1+4.1)*0.5+0.5);
    const em=(e<0?1:smooth(0.2,0.0,e))*gap;
    mm=Math.max(mm,em*p.edgeMountains);
    let h=base*0.42+mm*Math.pow(r,p.ridgeSharp)*0.8+mm*0.1;
    h+=p.edgeMountains*em*0.25;
    // regional tilt: the whole landscape slopes gently towards one side
    h+=p.tilt*0.35*((x-W/2)*tc+(z-W/2)*ts)/W;
    if(out){out.mm=mm;}
    return h;
  };
}

const SEA_LEVEL=40;
// island styles: the land is lifted onto a coastline mask and the rest sinks into the ocean (see genTerrain)
async function coastShape(p,H,mmA,N,cs,W,y){let sea=null;if(p.mapStyle==='island'||p.mapStyle==='islands'){sea=SEA_LEVEL;const nI=makeNoise((p.seed|0)+777),nC=makeNoise((p.seed|0)+778),ls=clamp(+p.landShare||0.5,0.1,0.9);
    for(let j=0;j<N;j++){for(let i=0;i<N;i++){const k=j*N+i,x=(i+0.5)*cs,z=(j+0.5)*cs,dx=x/W-0.5,dz=z/W-0.5,r=Math.hypot(dx,dz)*2,wob=fbm(nC,x/(W*0.18),z/(W*0.18),4,0.5,2);let m;
        if(p.mapStyle==='island')m=1-smooth(0.35+ls*0.55,0.55+ls*0.5,r+0.28*wob);
        else{const n0=fbm(nI,x/(W*0.2)+3.1,z/(W*0.2)+7.7,3,0.45,2.1)*0.5+0.5,thr=0.53-(ls-0.5)*0.3;m=smooth(thr-0.03,thr+0.09,n0+0.05*wob-0.1*smooth(0.55,0.95,r));}
        const t=smooth(0.2,0.7,m),hl=H[k]*smooth(0.45,1,m)*(p.mapStyle==='islands'?0.6:1);H[k]=Math.max(0.5,lerp(sea-30-20*(1-m),sea+1.5+hl,t));mmA[k]*=smooth(0.5,1,m);}if(y&&j%64===0)await y(j/N,'Shaping the coast');}
    for(let i=0;i<N;i++)for(const c of [i,(N-1)*N+i,i*N,i*N+N-1])H[c]=sea;}
  return sea;}
// ---- the new-game preview: the same land (terrain, big mountains, coast) at a coarse grid, without erosion, rivers and lakes; drawn as a
// shaded relief map into a canvas. About 0.1-0.3 s for 192 x 192 cells, so the settings can be tweaked live.
async function previewLand(p,n){const W=p.worldSize,cs=W/n,fn=makeTerrainFn(p),raw=new Float32Array(n*n),mm=new Float32Array(n*n),o={mm:0};let mn=1e9,mx=-1e9;
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const v=fn((i+0.5)*cs,(j+0.5)*cs,o);raw[j*n+i]=v;mm[j*n+i]=o.mm;if(v<mn)mn=v;if(v>mx)mx=v;}
  const H=new Float32Array(n*n),norm={min:mn,max:mx};for(let k=0;k<n*n;k++)H[k]=shapeHeight(raw[k],norm,p,mm[k]);
  const BM=bigMountains(p);if(BM)for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=(i+0.5)*cs,z=(j+0.5)*cs,r=BM.at(x,z);if(r.h>0)H[j*n+i]+=r.h*smooth(0,W*0.09,Math.min(x,z,W-x,W-z));}
  const sea=await coastShape(p,H,mm,n,cs,W,null);return{n,H,sea,W};}
function drawPreview(cv,L,p){const n=L.n,g=cv.getContext('2d'),img=g.createImageData(n,n),H=L.H,sea=L.sea;let top=0;for(const h of H)top=Math.max(top,h);const snow=p.snowLine*Math.max(p.maxHeight,top>p.maxHeight*1.25?top*0.8:0);
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const k=j*n+i,h=H[k],hx=H[j*n+Math.min(n-1,i+1)]-H[j*n+Math.max(0,i-1)],hz=H[Math.min(n-1,j+1)*n+i]-H[Math.max(0,j-1)*n+i],sh=clamp(0.75-(hx+hz)*0.9/(L.W/n),0.35,1.25);let c;
    if(sea!=null&&h<sea){const d=clamp((sea-h)/40,0,1);c=[40-20*d,110-40*d,150-30*d];}
    else{const a=h-(sea||0),t=a/Math.max(1,(top-(sea||0)));c=h>snow?[240,240,245]:t<0.02&&sea!=null?[214,200,150]:t<0.35?[110+60*t,160-40*t,70]:t<0.7?[150,130,95]:[150,145,140];c=c.map(v=>v*sh);}
    img.data.set([c[0],c[1],c[2],255],k*4);}
  const tmp=document.createElement('canvas');tmp.width=tmp.height=n;tmp.getContext('2d').putImageData(img,0,0);g.imageSmoothingEnabled=true;g.clearRect(0,0,cv.width,cv.height);g.drawImage(tmp,0,0,cv.width,cv.height);}
// ---- big mountains (World settings): up to three massifs added in metres on top of the shaped land, each a cone with concave flanks
// stretched along a ridge (shape 0 = round peak, 1 = a long ridge four times longer than wide), with spurs and gullies from ridged
// noise so erosion has something to carve. Position and direction come from the seed unless set.
function bigMountains(p){const n=Math.min(3,p.bigMtns|0);if(!n)return null;const W=p.worldSize,rng=mulberry32((p.seed|0)*97+5),nz=makeNoise((p.seed|0)+515),L=[];
  for(let k=1;k<=3;k++){const ax=0.22+rng()*0.56,az=0.22+rng()*0.56,ad=rng()*Math.PI;if(k>n)continue;const fx=+p['bigMtnX'+k]||0,fz=+p['bigMtnZ'+k]||0,fd=+p['bigMtnDir'+k]||0;
    const x=(fx>0?fx/100:ax)*W,z=(fz>0?fz/100:az)*W,d=fd>0?fd*Math.PI/180:ad,R=p.bigMtnBase/2,el=clamp(+p.bigMtnLong||0,0,1),Lr=R*3*el,H=p.bigMtnHeight*(1-0.14*(k-1));
    L.push({x,z,c:Math.cos(d),s:Math.sin(d),R,Lr,H});}
  return{list:L,at(x,z){let h=0,m=0;for(const q of L){const dx=x-q.x,dz=z-q.z,u=dx*q.c+dz*q.s,v=-dx*q.s+dz*q.c,uu=Math.max(0,Math.abs(u)-q.Lr),r=Math.hypot(uu,v)/q.R;if(r>=1.25)continue;
      const along=q.Lr>0?1-0.25*Math.min(1,Math.abs(u)/(q.Lr+q.R)):1,t=clamp(1-r,0,1),prof=Math.pow(t,1.7)*(1-Math.exp(-t*6))*along+Math.max(0,0.25-Math.abs(r-1.05))*0.12;
      const sp=ridged(nz,x/(q.R*0.55),z/(q.R*0.55),5,0.5,2),gul=0.72+0.38*sp;h+=q.H*prof*gul;m=Math.max(m,clamp(t*1.6,0,1));}return{h,m};}};}
// normalise raw -> metres (shared by inner map and far ring so they meet)
function shapeHeight(raw,norm,p,mm){
  let h01=(raw-norm.min)/(norm.max-norm.min);
  h01=Math.pow(Math.max(h01,0),p.valleyFlat);
  let hm=h01*p.maxHeight;
  if(p.strata>0&&mm>0.02){
    const st=p.strataStep,t=hm/st,f=t-Math.floor(t);
    const g=clamp((f-0.62)/0.38,0,1);const ter=(Math.floor(t)+g*g*(3-2*g))*st;
    hm=lerp(hm,ter,p.strata*smooth(0.05,0.6,mm));
  }
  return hm;
}

async function genTerrain(p,y){
  const N=(p.mapRes|0)||(p.worldSize>8192?2048:p.worldSize>4096?1024:p.worldSize>2048?512:256),W=p.worldSize,cs=W/N,fn=makeTerrainFn(p);
  const raw=new Float32Array(N*N),mmA=new Float32Array(N*N),o={mm:0};
  let mn=1e9,mx=-1e9;
  for(let j=0;j<N;j++){
    for(let i=0;i<N;i++){const v=fn((i+0.5)*cs,(j+0.5)*cs,o);raw[j*N+i]=v;mmA[j*N+i]=o.mm;if(v<mn)mn=v;if(v>mx)mx=v;}
    await y(j/N,'Shaping terrain');
  }
  const norm={min:mn,max:mx};
  const H=new Float32Array(N*N);
  for(let k=0;k<N*N;k++)H[k]=shapeHeight(raw[k],norm,p,mmA[k]);
  const BM=bigMountains(p);if(BM)for(let j=0;j<N;j++){for(let i=0;i<N;i++){const k=j*N+i,x=(i+0.5)*cs,z=(j+0.5)*cs,r=BM.at(x,z);if(r.h>0){r.h*=smooth(0,W*0.09,Math.min(x,z,W-x,W-z));H[k]+=r.h;mmA[k]=Math.max(mmA[k],r.m);}}if(j%32===0)await y(j/N,'Raising the big mountains');}
  /* island styles: the land is lifted onto a coastline mask and the rest sinks into an ocean whose surface is SEA_LEVEL; the outermost
     cells are held at sea level so the whole ocean becomes one basin that the water pass fills to that level (see genWater: T.sea) */
  const sea=await coastShape(p,H,mmA,N,cs,W,y);
  return {N,W,cs,H,mm:mmA,norm,bigMtns:BM?BM.list:null,sea};
}

// ---- Hydraulic (droplet) + thermal erosion. Heights are converted to
// "erosion units" hE = h / (cs*128) so slider behaviour does not change with map resolution.
async function genErosion(p,T,y){
  const {N,cs}=T,H=T.H,E=cs*128;
  const flow=new Float32Array(N*N),depo=new Float32Array(N*N);
  for(let k=0;k<N*N;k++)H[k]/=E;
  const rng=mulberry32((p.seed|0)*31+7);
  const R=Math.max(1,p.erosionRadius|0),bo=[],bw=[];let ws=0;
  for(let by=-R;by<=R;by++)for(let bx=-R;bx<=R;bx++){const d=Math.hypot(bx,by);if(d<=R){const w=1-d/(R+0.5);bo.push(bx,by);bw.push(w);ws+=w;}}
  for(let k=0;k<bw.length;k++)bw[k]/=ws;
  const nb=bw.length,BO=Int32Array.from(bo),BW=Float32Array.from(bw);
  const drops=Math.floor(p.dropletsPerCell*N*N),inertia=p.inertia,capF=p.capacity,minCap=0.01,
        er=p.erodeRate,dep=p.depositRate,evap=p.evaporation,grav=p.gravity,life=p.maxLife|0;
  const lim=N-1;
  for(let d=0;d<drops;d++){
    let px=rng()*(lim-1)+0.5,py=rng()*(lim-1)+0.5,dx=0,dy=0,sp=1,wa=1,sed=0;
    for(let l=0;l<life;l++){
      const nx=px|0,ny=py|0,ci=ny*N+nx,fx=px-nx,fy=py-ny;
      const a=H[ci],b=H[ci+1],c=H[ci+N],e=H[ci+N+1];
      const gx=(b-a)*(1-fy)+(e-c)*fy,gy=(c-a)*(1-fx)+(e-b)*fx;
      const h=a*(1-fx)*(1-fy)+b*fx*(1-fy)+c*(1-fx)*fy+e*fx*fy;
      dx=dx*inertia-gx*(1-inertia);dy=dy*inertia-gy*(1-inertia);
      const len=Math.hypot(dx,dy);if(len<1e-10)break;
      dx/=len;dy/=len;px+=dx;py+=dy;
      if(px<0||px>=lim||py<0||py>=lim)break;
      const mx=px|0,my=py|0,mi=my*N+mx,gx2=px-mx,gy2=py-my;
      const nh=H[mi]*(1-gx2)*(1-gy2)+H[mi+1]*gx2*(1-gy2)+H[mi+N]*(1-gx2)*gy2+H[mi+N+1]*gx2*gy2;
      const dh=nh-h,cap=Math.max(-dh*sp*wa*capF,minCap);
      if(sed>cap||dh>0){
        const amt=dh>0?Math.min(dh,sed):(sed-cap)*dep;
        sed-=amt;
        H[ci]+=amt*(1-fx)*(1-fy);H[ci+1]+=amt*fx*(1-fy);H[ci+N]+=amt*(1-fx)*fy;H[ci+N+1]+=amt*fx*fy;
        depo[ci]+=amt;
      }else{
        const amt=Math.min((cap-sed)*er,-dh);
        for(let k=0;k<nb;k++){
          const xx=nx+BO[2*k],yy=ny+BO[2*k+1];
          if(xx<0||yy<0||xx>=N||yy>=N)continue;
          const j=yy*N+xx,w=amt*BW[k],dd=H[j]<w?H[j]:w;H[j]-=dd;sed+=dd;
        }
      }
      sp=Math.sqrt(Math.max(0.0001,sp*sp-dh*grav));if(sp>8)sp=8;
      wa*=(1-evap);
      flow[ci]+=wa;
    }
    if((d&2047)===0)await y(d/drops*0.85,'Hydraulic erosion');
  }
  // thermal erosion: material slides off slopes steeper than the talus angle
  const it=p.thermalIter|0,tal=Math.tan(p.talus*Math.PI/180)/128,tal2=tal*Math.SQRT2;
  const OX=[1,-1,0,0,1,1,-1,-1],OY=[0,0,1,-1,1,-1,1,-1];
  for(let r=0;r<it;r++){
    for(let j=1;j<N-1;j++){
      for(let i=1;i<N-1;i++){
        const c=j*N+i,hc=H[c];let best=-1,bd=0;
        for(let k=0;k<8;k++){const n=c+OY[k]*N+OX[k],d=hc-H[n]-(k<4?tal:tal2);if(d>bd){bd=d;best=n;}}
        if(best>=0){const m=bd*0.25;H[c]-=m;H[best]+=m;depo[best]+=m*0.5;}
      }
    }
    await y(0.85+0.15*r/Math.max(1,it),'Thermal erosion');
  }
  for(let k=0;k<N*N;k++){H[k]*=E;depo[k]*=E;}
  T.flow=flow;T.depo=depo;
}

// ---- binary min-heap for priority flood
class MinHeap{
  constructor(cap){this.i=new Int32Array(cap);this.k=new Float64Array(cap);this.n=0;}
  push(id,key){let a=this.n++;const I=this.i,K=this.k;while(a>0){const p=(a-1)>>1;if(K[p]<=key)break;I[a]=I[p];K[a]=K[p];a=p;}I[a]=id;K[a]=key;}
  pop(){const I=this.i,K=this.k,top=I[0];const n=--this.n;if(n>0){const id=I[n],key=K[n];let a=0;for(;;){let c=2*a+1;if(c>=n)break;if(c+1<n&&K[c+1]<K[c])c++;if(K[c]>=key)break;I[a]=I[c];K[a]=K[c];a=c;}I[a]=id;K[a]=key;}return top;}
}
const D8X=[1,-1,0,0,1,1,-1,-1],D8Y=[0,0,1,-1,1,-1,1,-1],D8D=[1,1,1,1,Math.SQRT2,Math.SQRT2,Math.SQRT2,Math.SQRT2];

function priorityFlood(H,N,eps){
  const F=new Float32Array(H),closed=new Uint8Array(N*N),hp=new MinHeap(N*N),order=new Int32Array(N*N);let oc=0;
  for(let i=0;i<N;i++){for(const c of [i,(N-1)*N+i,i*N,i*N+N-1]){if(!closed[c]){closed[c]=1;hp.push(c,F[c]);}}}
  while(hp.n){
    const c=hp.pop();order[oc++]=c;const cx=c%N,cy=(c/N)|0,fc=F[c];
    for(let k=0;k<8;k++){const x=cx+D8X[k],yy=cy+D8Y[k];if(x<0||yy<0||x>=N||yy>=N)continue;const n=yy*N+x;if(closed[n])continue;closed[n]=1;
      if(F[n]<=fc+eps)F[n]=Math.fround(fc+eps)>fc?Math.fround(fc+eps):fc+eps*4;hp.push(n,F[n]);}
  }
  return {F,order};
}

// ---- Lakes, rivers, waterfalls (step 6/7). Works on a copy of the eroded map and carves river beds.
// the biggest lake (cells that are lake water, not river), in m²
function bigLakeArea(T){const N=T.N,cs=T.cs,seen=new Uint8Array(N*N),isL=n=>T.water[n*4+3]>0&&T.shore[n]>=0.99;let best=0;const st=[];
  for(let n0=0;n0<N*N;n0++){if(seen[n0]||!isL(n0))continue;let a=0;st.push(n0);seen[n0]=1;while(st.length){const n=st.pop();a++;const i=n%N,j=(n/N)|0;for(const m of [i>0?n-1:-1,i<N-1?n+1:-1,j>0?n-N:-1,j<N-1?n+N:-1])if(m>=0&&!seen[m]&&isL(m)){seen[m]=1;st.push(m);}}if(a>best)best=a;}return best*cs*cs;}
// every map gets a lake big enough for two lakeside villages and a steamboat: when the land made none, a bowl is
// carved on the flattest low ground in the middle of the board, down from its lowest rim point, so it holds a lake to the brim
function carveLakeBowl(T,seed){const N=T.N,cs=T.cs,W=T.W,H=T.H,R=Math.min(430,W*0.11),rng=mulberry32(seed*31+7);let best=null;
  for(let k=0;k<500;k++){const x=W*0.2+rng()*W*0.6,z=W*0.2+rng()*W*0.6;let mn=1e9,mx=-1e9;for(let a=0;a<24;a++){const h=sampleH(T,x+Math.cos(a*0.2618)*R,z+Math.sin(a*0.2618)*R);mn=Math.min(mn,h);mx=Math.max(mx,h);}
    const sc=-(mx-mn)-sampleH(T,x,z)*0.05;if(!best||sc>best.sc)best={x,z,sc,base:mn,R};}
  const {x,z,base}=best,depth=16;for(let j=0;j<N;j++)for(let i=0;i<N;i++){const d=Math.hypot((i+0.5)*cs-x,(j+0.5)*cs-z);if(d>=R)continue;const t=base-0.6-depth*(1-(d/R)*(d/R)),k=j*N+i;if(H[k]>t)H[k]=t;}
  return best;}
async function genWater(p,T,y){
  const {N,cs,W}=T,H=T.H;const NN=N*N;
  if(T.sea!=null)for(let i=0;i<N;i++)for(const c of [i,(N-1)*N+i,i*N,i*N+N-1])H[c]=T.sea;/* erosion may have nibbled the ocean's rim */
  await y(0,'Finding lakes');
  // 1) depression breaching: every basin keeps a lake of at most "max lake depth" and
  //    gets an outlet gorge carved to lower ground, like a real drained landscape.
  const depr=(F0)=>{const comp=new Int32Array(NN).fill(-1),list=[],stack=new Int32Array(NN);
    for(let s0=0;s0<NN;s0++){if(comp[s0]>=0||F0[s0]-H[s0]<=0.02)continue;const id=list.length,lev=F0[s0];let sp=0,area=0,minH=1e9,minC=s0,edge=false;stack[sp++]=s0;comp[s0]=id;
      while(sp){const c=stack[--sp];area++;if(H[c]<minH){minH=H[c];minC=c;}const cx=c%N,cy=(c/N)|0;if(cx<=1||cy<=1||cx>=N-2||cy>=N-2)edge=true;
        for(let k=0;k<8;k++){const x=cx+D8X[k],yy=cy+D8Y[k];if(x<0||yy<0||x>=N||yy>=N)continue;const n=yy*N+x;
          if(comp[n]<0&&F0[n]-H[n]>0.02&&Math.abs(F0[n]-lev)<0.05){comp[n]=id;stack[sp++]=n;}}}
      list.push({spill:lev,minH,minC,area,sea:edge&&T.sea!=null&&Math.abs(lev-T.sea)<0.5});}
    return {comp,list};};
  {
    const f0=priorityFlood(H,N,0),fe0=priorityFlood(H,N,1e-3),F0=f0.F,Fe=fe0.F;const D=depr(F0);
    const rc0=new Int32Array(NN).fill(-1);
    for(let c=0;c<NN;c++){const cx=c%N,cy=(c/N)|0;if(cx===0||cy===0||cx===N-1||cy===N-1)continue;let best=-1,bs=0;
      for(let k=0;k<8;k++){const n=(cy+D8Y[k])*N+cx+D8X[k];const sl=(Fe[c]-Fe[n])/D8D[k];if(sl>bs){bs=sl;best=n;}}rc0[c]=best;}
    const wallT=Math.tan(48*Math.PI/180)*cs;let carved=0;
    const order=D.list.map((d,i)=>i).sort((a,b)=>D.list[b].spill-D.list[a].spill);
    for(const id of order){const d=D.list[id];if(d.sea)continue;/* the ocean keeps its level */const depth=d.spill-d.minH;if(depth<=p.minLakeDepth*0.5)continue;
      const L=d.minH+Math.min(p.lakeFill*depth,p.maxLakeDepth);if(L>=d.spill-0.05)continue;
      // trace the outlet along the steepest way down (on flat filled ground that is a ruler-straight line), then round it off and let it
      // meander: a sideways swing that grows from the lake, with a wavelength and phase of its own, carved along the curve with a falling floor
      const path=[];let c=d.minC,cur=L,steps=0;
      while(c>=0&&steps<N*4){steps++;if(D.comp[c]!==id&&H[c]<=cur)break;path.push([(c%N)+0.5,((c/N)|0)+0.5,cur,D.comp[c]===id]);if(D.comp[c]!==id)cur-=0.03*cs;c=rc0[c];}
      if(path.length<2)continue;const n=path.length,sm=path.map((q,i)=>{let x=0,z=0,k=0;for(let j=Math.max(0,i-4);j<=Math.min(n-1,i+4);j++){x+=path[j][0];z+=path[j][1];k++;}return[x/k,z/k];});
      const rg=mulberry32((p.seed|0)*97+id*13+5),lam=26+rg()*18,ph=rg()*6.283,amp=Math.min(6,n/8)*(0.7+rg()*0.5);let sl=0,first=path.findIndex(q=>!q[3]);if(first<0)first=n;
      const pts=[];for(let i=0;i<n;i++){if(i>0)sl+=Math.hypot(sm[i][0]-sm[i-1][0],sm[i][1]-sm[i-1][1]);const a=sm[Math.max(0,i-2)],b=sm[Math.min(n-1,i+2)];let tx=b[0]-a[0],tz=b[1]-a[1];const tl=Math.hypot(tx,tz)||1;tx/=tl;tz/=tl;
        const out=i<first?0:Math.min(1,(i-first)/14)*Math.min(1,(n-1-i)/10),o=amp*out*(Math.sin(sl/lam*6.283+ph)+0.35*Math.sin(sl/lam*15.7+ph*2.3));pts.push([sm[i][0]-tz*o,sm[i][1]+tx*o,path[i][2],path[i][3]]);}
      (T.gorges=T.gorges||[]).push(pts.filter((q,i)=>i%6===0).map(q=>[q[0]*cs,q[1]*cs]));
      for(let i=0;i<n;i++){const A=pts[i],B=pts[Math.min(n-1,i+1)],seg=Math.max(1,Math.ceil(Math.hypot(B[0]-A[0],B[1]-A[1])*2));
        for(let q=0;q<seg;q++){const t=q/seg,px=A[0]+(B[0]-A[0])*t,pz=A[1]+(B[1]-A[1])*t,cv=A[2]+(B[2]-A[2])*t,ci=Math.floor(px),cj=Math.floor(pz);
          if(ci<0||cj<0||ci>=N||cj>=N)continue;const c0=cj*N+ci;if(H[c0]<=cv&&!A[3])continue;if(H[c0]>cv){H[c0]=cv;carved++;}
          for(let dy=-12;dy<=12;dy++)for(let dx=-12;dx<=12;dx++){const x=ci+dx,yy=cj+dy;if(x<0||yy<0||x>=N||yy>=N)continue;const nn=yy*N+x;
            const v=cv+Math.max(0,Math.hypot(x+0.5-px,yy+0.5-pz)-0.7)*wallT;if(H[nn]>v)H[nn]=v;}}}
    }
    T.stats.carvedCells=carved;
  }
  await y(0.12,'Finding lakes');
  const Fx=priorityFlood(H,N,0).F;const DL=depr(Fx);
  const lakeId=new Int32Array(NN).fill(-1),lakes=DL.list;
  const minA=p.minLakeArea/(cs*cs);let lakeCount=0;
  for(const L of lakes){L.keep=L.area>=minA&&L.spill-L.minH>=p.minLakeDepth;L.level=L.spill;if(L.keep)lakeCount++;}
  for(let c=0;c<NN;c++){const id=DL.comp[c];if(id<0)continue;if(lakes[id].keep)lakeId[c]=id;else H[c]=Fx[c];}// tiny pits are filled
  await y(0.25,'Routing rivers');
  // flow routing on epsilon-filled surface
  const fe=priorityFlood(H,N,1e-3),F=fe.F,order=fe.order;
  const rcv=new Int32Array(NN).fill(-1),rdist=new Float32Array(NN);
  for(let c=0;c<NN;c++){const cx=c%N,cy=(c/N)|0;if(cx===0||cy===0||cx===N-1||cy===N-1)continue;
    let best=-1,bs=0;for(let k=0;k<8;k++){const n=(cy+D8Y[k])*N+cx+D8X[k];const s=(F[c]-F[n])/D8D[k];if(s>bs){bs=s;best=n;rdist[c]=D8D[k]*cs;}}rcv[c]=best;}
  const acc=new Float32Array(NN).fill(1);
  for(let k=NN-1;k>=0;k--){const c=order[k],r=rcv[c];if(r>=0)acc[r]+=acc[c];}
  await y(0.45,'Tracing rivers');
  const thr=p.riverThreshold*1e6/(cs*cs);
  const isRiv=new Uint8Array(NN);for(let c=0;c<NN;c++)if(acc[c]>=thr&&lakeId[c]<0)isRiv[c]=1;
  // water surface along the river: never rises downstream
  const s=new Float32Array(NN).fill(1e9),sUp=new Float32Array(NN).fill(1e9);
  for(let k=NN-1;k>=0;k--){const c=order[k];if(!isRiv[c])continue;s[c]=Math.min(H[c],sUp[c]);const r=rcv[c];if(r>=0&&isRiv[r])sUp[r]=Math.min(sUp[r],s[c]);}
  // paint rivers with width, carve beds, mark falls
  const water=new Float32Array(NN*4);// R surface, G flowX, B flowZ, A presence(1)/fall(2)
  const dist=new Float32Array(NN).fill(1e9),near=new Int32Array(NN).fill(-1);
  const widthOf=c=>p.riverWidth*6.5*Math.sqrt(acc[c]*cs*cs/1e6);
  const emitters=[];let fallCells=0;
  const fall=new Uint8Array(NN);
  for(let c=0;c<NN;c++){if(!isRiv[c])continue;const r=rcv[c];if(r<0)continue;const drop=s[c]-(isRiv[r]?s[r]:(lakeId[r]>=0?lakes[lakeId[r]].level:H[r]));
    if(drop/rdist[c]>p.fallSlope){fall[c]=1;fallCells++;const wd=widthOf(c);
      const ex=((r%N)+0.5)*cs,ez=(((r/N)|0)+0.5)*cs,ey=isRiv[r]?s[r]:H[r];const str=Math.min(3,drop*wd/40);
      let merged=false;for(const e of emitters){if(Math.hypot(e[0]-ex,e[2]-ez)<14){if(str>e[3]){e[0]=ex;e[1]=ey;e[2]=ez;}e[3]=Math.max(e[3],str);merged=true;break;}}
      if(!merged)emitters.push([ex,ey,ez,str]);}}
  emitters.sort((a,b)=>b[3]-a[3]);if(emitters.length>64)emitters.length=64;
  for(let c=0;c<NN;c++){if(!isRiv[c])continue;const rc=Math.max(0.55,widthOf(c)*0.5/cs)+0.5,RR=Math.ceil(rc+1.5),cx=c%N,cy=(c/N)|0;
    for(let dy=-RR;dy<=RR;dy++)for(let dx=-RR;dx<=RR;dx++){const x=cx+dx,yy=cy+dy;if(x<0||yy<0||x>=N||yy>=N)continue;const d=Math.hypot(dx,dy);const n=yy*N+x;
      if(d<=rc+1.5&&d/rc<dist[n]){dist[n]=d/rc;near[n]=c;}}}
  await y(0.65,'Carving river beds');
  const depthOf=c=>p.riverDepth*clamp(widthOf(c)/8,0.35,1.6);
  for(let n=0;n<NN;n++){
    const L=lakeId[n];
    if(L>=0){water[n*4]=lakes[L].level;water[n*4+3]=1;continue;}
    const c=near[n];
    if(c>=0){const t=dist[n],sv=s[c];
      if(t<=1){water[n*4]=sv;water[n*4+3]=fall[c]?2:1;H[n]=Math.min(H[n],sv-depthOf(c)*(1-t*t)-0.05);
        const r=rcv[c];if(r>=0){const fx=(r%N)-(c%N),fz=((r/N)|0)-((c/N)|0),l=Math.hypot(fx,fz)||1;
          const drop=Math.max(0,sv-(isRiv[r]?s[r]:sv));const spd=fall[c]?2:clamp(0.25+drop/rdist[c]*25,0.25,1);
          water[n*4+1]=fx/l*spd;water[n*4+2]=fz/l*spd;}
        continue;}
      else if(H[n]<sv+0.2)H[n]=sv+0.2;// small bank so water never shows a side wall
    }
    water[n*4]=H[n]-3;water[n*4+3]=0;
  }
  // dry cells next to water keep the neighbour's surface (presence 0) so lake/river
  // surfaces stay flat right up to the shore instead of sloping down into the bank
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const n=j*N+i;if(water[n*4+3]>0)continue;let sv=0,c=0;
    for(let k=0;k<8;k++){const x=i+D8X[k],yy=j+D8Y[k];if(x<0||yy<0||x>=N||yy>=N)continue;const m=(yy*N+x)*4;if(water[m+3]>0){sv+=water[m];c++;}}
    water[n*4]=c?sv/c:H[n]-3;}
  // soften the river flow field (3x3 box on presence cells)
  const fl=new Float32Array(NN*2);
  for(let pass=0;pass<2;pass++){
    for(let j=1;j<N-1;j++)for(let i=1;i<N-1;i++){const n=j*N+i;if(water[n*4+3]===0||lakeId[n]>=0){fl[n*2]=water[n*4+1];fl[n*2+1]=water[n*4+2];continue;}
      let sx=0,sz=0,cnt=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const m=n+dy*N+dx;if(water[m*4+3]>0&&lakeId[m]<0){sx+=water[m*4+1];sz+=water[m*4+2];cnt++;}}
      fl[n*2]=sx/cnt;fl[n*2+1]=sz/cnt;}
    for(let n=0;n<NN;n++){water[n*4+1]=fl[n*2];water[n*4+2]=fl[n*2+1];}
  }
  await y(0.8,'Shorelines');
  // shore factor: chamfer distance to water + height above that water
  const sd=new Float32Array(NN).fill(99),sl=new Float32Array(NN).fill(-1e9);
  for(let n=0;n<NN;n++)if(lakeId[n]>=0){sd[n]=0;sl[n]=water[n*4];}// sandy shores on lakes only; river banks stay grassy/muddy
  const relax=(n,m,w)=>{if(sd[m]+w<sd[n]){sd[n]=sd[m]+w;sl[n]=sl[m];}};
  for(let j=1;j<N;j++)for(let i=1;i<N-1;i++){const n=j*N+i;relax(n,n-1,1);relax(n,n-N,1);relax(n,n-N-1,1.41);relax(n,n-N+1,1.41);}
  for(let j=N-2;j>=0;j--)for(let i=N-2;i>0;i--){const n=j*N+i;relax(n,n+1,1);relax(n,n+N,1);relax(n,n+N+1,1.41);relax(n,n+N-1,1.41);}
  const shore=new Float32Array(NN);
  for(let n=0;n<NN;n++){const dm=sd[n]*cs;shore[n]=lakeId[n]>=0?1:water[n*4+3]>0?0.3:smooth(7,1,dm)*smooth(1.8,0.3,H[n]-sl[n]);}
  // mountain streams (always flowing) and run-off rills (only in rain): D8 paths below the river threshold.
  // Each path is x,z,area (km²) per cell; area>0 = stream, <0 = run-off. Paths end where they join water or another path.
  {const sThr=p.streams>0?thr*0.14/p.streams:1e30,rThr=thr*0.035;const sm=new Uint8Array(NN),don=new Uint8Array(NN),vis=new Uint8Array(NN);
    for(let c=0;c<NN;c++){if(acc[c]<rThr||isRiv[c]||lakeId[c]>=0)continue;const cx=c%N,cy=(c/N)|0;if(cx<2||cy<2||cx>N-3||cy>N-3)continue;sm[c]=1;}
    for(let c=0;c<NN;c++)if(sm[c]){const r=rcv[c];if(r>=0&&sm[r]&&don[r]<255)don[r]++;}
    const streams=[];let pts=0;
    for(let c0=0;c0<NN&&pts<60000;c0++){if(!sm[c0]||don[c0])continue;const q=[];let c=c0,st=0;
      while(c>=0&&st++<4000){const ar=acc[c]*cs*cs/1e6;q.push(((c%N)+0.5)*cs,(((c/N)|0)+0.5)*cs,acc[c]>=sThr?ar:-ar);if(!sm[c]||vis[c])break;vis[c]=1;c=rcv[c];}
      if(q.length>=9){streams.push(new Float32Array(q));pts+=q.length/3;}}
    T.streams=streams;T.stats.streams=streams.length;T.stats.streamPts=pts;}
  T.water=water;T.shore=shore;T.acc=acc;T.emitters=emitters;
  T.stats.lakes=lakeCount;T.stats.riverCells=isRiv.reduce((a,b)=>a+b,0);T.stats.fallCells=fallCells;T.stats.emitters=emitters.length;
}

// ---- normals + data maps for the GPU (RGBA8)
function computeNormals(T,nrm){const {N,cs,H}=T;nrm=nrm||new Uint8Array(N*N*4);
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){
    const n=j*N+i,l=H[j*N+Math.max(i-1,0)],r=H[j*N+Math.min(i+1,N-1)],d=H[Math.max(j-1,0)*N+i],u=H[Math.min(j+1,N-1)*N+i];
    let nx=(l-r)/(2*cs),nz=(d-u)/(2*cs),ny=1;const L=Math.hypot(nx,ny,nz);nx/=L;ny/=L;nz/=L;
    nrm[n*4]=Math.round((nx*0.5+0.5)*255);nrm[n*4+1]=Math.round((ny*0.5+0.5)*255);nrm[n*4+2]=Math.round((nz*0.5+0.5)*255);nrm[n*4+3]=T.hole&&T.hole[n]?0:255;// A = 0 where a tunnel portal opens the ground
  }
  return nrm;}
function genMaps(p,T){
  const {N,cs,H}=T,NN=N*N;
  const nrm=computeNormals(T),data=new Uint8Array(NN*4);
  // wetness from erosion flow (log), boosted by drainage area; sediment from deposits
  const flow=T.flow,depo=T.depo,acc=T.acc;
  let fmax=1e-6,dmax=1e-6;
  if(flow){const tmp=Array.from(flow.filter(v=>v>0));tmp.sort((a,b)=>a-b);fmax=tmp.length?tmp[Math.floor(tmp.length*0.985)]:1;
    const t2=Array.from(depo.filter(v=>v>0));t2.sort((a,b)=>a-b);dmax=t2.length?t2[Math.floor(t2.length*0.98)]:1;}
  const lf=Math.log1p(fmax);
  for(let n=0;n<NN;n++){
    let w=flow?Math.log1p(flow[n])/lf:0;
    if(acc)w=Math.max(w,clamp(Math.log(acc[n])/Math.log(4000)-0.2,0,1)*0.8);
    data[n*4]=Math.round(clamp(w,0,1)*255);
    data[n*4+1]=Math.round(clamp(depo?depo[n]/dmax:0,0,1)*255);
    data[n*4+2]=Math.round(clamp(T.shore?T.shore[n]:0,0,1)*255);
    data[n*4+3]=0;// forest density, filled by vegetation
  }
  T.nrm=nrm;T.data=data;
}

// bilinear helpers on the inner map
function sampleH(T,x,z,arr){const N=T.N,cs=T.cs;let fx=x/cs-0.5,fz=z/cs-0.5;fx=clamp(fx,0,N-1.001);fz=clamp(fz,0,N-1.001);const i=fx|0,j=fz|0,u=fx-i,v=fz-j,H=arr||T.H,k=j*N+i;
  return H[k]*(1-u)*(1-v)+H[k+1]*u*(1-v)+H[k+N]*(1-u)*v+H[k+N+1]*u*v;}
function sampleWater(T,x,z){const N=T.N,cs=T.cs;const i=clamp(Math.round(x/cs-0.5),0,N-1),j=clamp(Math.round(z/cs-0.5),0,N-1);const k=(j*N+i)*4;return T.water?[T.water[k],T.water[k+3]]:[0,0];}

// ---- Vegetation placement (step 8). Instances: [x,y,z,scale, rot,tint,hash,variant]
async function genVegetation(p,T,y){
  const {N,cs,W,H}=T;const rng=mulberry32((p.seed|0)*977+5);const nf=makeNoise((p.seed|0)+777);
  const out={trees:[[],[],[],[],[]],rocks:[]};// tree types: 0 spruce,1 broadleaf,2 bush,3 pine,4 birch
  const ns=makeNoise((p.seed|0)+919);
  // species: conifers split into spruce (damp, shady) and pine (dry patches); broadleaf into oak-like and birch (edges, damp)
  const pickType=(x,z,alt,wet,fm,pc)=>{const sp=fbm(ns,x/320,z/320,3,0.5,2);
    if(rng()<pc)return sp>0.1-wet*0.5?3:0;return(sp<-0.12||(fm>0.15&&fm<0.55&&rng()<0.45)||wet>0.55&&rng()<0.5)?4:1;};
  const HUE={0:-0.25,1:0,2:0.1,3:-0.35,4:0.35};const hueEnc=(t,v)=>v+0.5+clamp(HUE[t]+(rng()-0.5)*0.9,-1,1)*0.38;
  const SZ={0:[16,12],1:[11,8],3:[15,10],4:[11,7]};
  const nrm=T.nrm,data=T.data;
  const nAt=(x,z)=>{const i=clamp((x/cs)|0,0,N-1),j=clamp((z/cs)|0,0,N-1);return (j*N+i)*4;};
  const forestMask=(x,z)=>{const v=fbm(nf,x/p.forestScale,z/p.forestScale,4,0.5,2)*0.5+0.5;return smooth(1-p.forestCover-0.08,1-p.forestCover+0.08,v);};
  const sp=5.6/Math.sqrt(p.treeDensity),cnt=Math.floor(W/sp);let placed=0;const maxT=170000;
  const fmap=new Float32Array(N*N);
  const total=cnt*cnt,scr=W>4096;
  for(let kk=0;kk<total;kk++){const idx=scr?(kk*1000003)%total:kk,gj=(idx/cnt)|0,gi=idx%cnt;if(kk%(cnt*8)===0)await y(kk/total*0.8,'Planting trees');
    {
      const x=(gi+0.15+rng()*0.7)*sp,z=(gj+0.15+rng()*0.7)*sp,r0=rng();
      if(x<2||z<2||x>W-2||z>W-2)continue;
      const k=nAt(x,z),ny=nrm[k+1]/127.5-1,slope=Math.acos(clamp(ny,0,1))*57.3;
      const h=sampleH(T,x,z),wt=sampleWater(T,x,z);if(wt[1]>0&&wt[0]>h-1.2)continue;
      const shore=data[k+2]/255,wet=data[k]/255,alt=h/p.maxHeight;
      let pr=forestMask(x,z)*smooth(p.treeLine,p.treeLine-0.09,alt)*smooth(p.treeMaxSlope,p.treeMaxSlope-8,slope)*(1-shore*0.7);
      pr=Math.max(pr,wet*0.35*smooth(0.9,0.3,shore)*smooth(p.treeMaxSlope,p.treeMaxSlope-8,slope)*smooth(p.treeLine,p.treeLine-0.09,alt));// riverside trees
      if(r0>pr)continue;
      if(placed>=maxT){if(placed===maxT){Log&&Log.warn&&Log.warn('tree limit reached, forest cut short');placed++;}continue;}
      const pc=clamp(p.coniferShare+(alt-0.3)*0.9-wet*0.25,0,1);
      const type=pickType(x,z,alt,wet,forestMask(x,z),pc);
      const shrink=lerp(1,0.55,smooth(p.treeLine-0.12,p.treeLine,alt));
      const sc=p.treeSize*(SZ[type][0]+rng()*SZ[type][1])*shrink*(rng()<0.12?0.55:1);
      out.trees[type].push(x,h-0.25,z,sc,rng()*6.2832,0.75+rng()*0.5,rng(),hueEnc(type,(rng()*3)|0));placed++;
      // stamp forest density
      const ci=clamp((x/cs)|0,0,N-1),cj=clamp((z/cs)|0,0,N-1),rr=Math.max(1,Math.round(sc*0.25/cs));
      for(let dy=-rr;dy<=rr;dy++)for(let dx=-rr;dx<=rr;dx++){const a=ci+dx,b=cj+dy;if(a<0||b<0||a>=N||b>=N)continue;fmap[b*N+a]+=0.5*(1-Math.hypot(dx,dy)/(rr+1));}
    }
  }
  // far band: trees continue 450 m past the world edge (heights follow the far ring, blended into the edge)
  if(T.far){const F=T.far,B=450,fc=F.cs;
    const farAt=(x,z)=>{let fx=(x-F.org)/fc-0.5,fz=(z-F.org)/fc-0.5;fx=clamp(fx,0,F.N-1.001);fz=clamp(fz,0,F.N-1.001);const i=fx|0,j=fz|0,u=fx-i,v=fz-j,k=j*F.N+i,G=F.H;
      const hf=G[k]*(1-u)*(1-v)+G[k+1]*u*(1-v)+G[k+F.N]*(1-u)*v+G[k+F.N+1]*u*v;const cx=clamp(x,0,W),cz=clamp(z,0,W),od=Math.hypot(x-cx,z-cz);return lerp(sampleH(T,cx,cz),hf,smooth(0,fc*3,od));};
    const c0=Math.floor(-B/sp),c1=Math.ceil((W+B)/sp);
    for(let gj=c0;gj<c1;gj++){for(let gi=c0;gi<c1;gi++){const x=(gi+0.15+rng()*0.7)*sp,z=(gj+0.15+rng()*0.7)*sp,r0=rng();
      if(x>=0&&z>=0&&x<=W&&z<=W)continue;const od=Math.hypot(x-clamp(x,0,W),z-clamp(z,0,W));if(od>B)continue;
      const h=farAt(x,z),hx=farAt(x+4,z)-farAt(x-4,z),hz=farAt(x,z+4)-farAt(x,z-4),slope=Math.atan(Math.hypot(hx,hz)/8)*57.3,alt=h/p.maxHeight;
      const pr=forestMask(x,z)*smooth(p.treeLine,p.treeLine-0.09,alt)*smooth(p.treeMaxSlope,p.treeMaxSlope-8,slope);if(r0>pr||placed>=maxT)continue;
      const pc=clamp(p.coniferShare+(alt-0.3)*0.9,0,1),type=pickType(x,z,alt,0,forestMask(x,z),pc);
      out.trees[type].push(x,h-0.25,z,p.treeSize*(SZ[type][0]+rng()*SZ[type][1]),rng()*6.2832,0.75+rng()*0.5,rng(),hueEnc(type,(rng()*3)|0));placed++;}}}
  // bushes: forest edges, banks, moderately steep ground
  if(p.bushes>0){const bs=9/Math.sqrt(p.bushes),bc=Math.floor(W/bs);
    for(let gj=0;gj<bc;gj++)for(let gi=0;gi<bc;gi++){
      const x=(gi+rng())*bs,z=(gj+rng())*bs,r0=rng();if(x<2||z<2||x>W-2||z>W-2)continue;
      const k=nAt(x,z),ny=nrm[k+1]/127.5-1,slope=Math.acos(clamp(ny,0,1))*57.3,h=sampleH(T,x,z),wt=sampleWater(T,x,z);if(wt[1]>0&&wt[0]>h-0.6)continue;
      const fm=forestMask(x,z),edge=smooth(0.05,0.4,fm)*smooth(0.95,0.55,fm),alt=h/p.maxHeight;
      const pr=(edge*0.7+data[k]/255*0.4+smooth(15,30,slope)*0.25)*smooth(p.treeLine+0.08,p.treeLine-0.02,alt)*smooth(45,35,slope);
      if(r0>pr)continue;
      out.trees[2].push(x,h-0.15,z,(1.0+rng()*1.9)*p.treeSize,rng()*6.2832,0.75+rng()*0.5,rng(),hueEnc(2,(rng()*3)|0));
    }}
  await y(0.85,'Placing rocks');
  if(p.rocks>0){const rs=11/Math.sqrt(p.rocks),rc=Math.floor(W/rs);
    for(let gj=0;gj<rc;gj++)for(let gi=0;gi<rc;gi++){
      const x=(gi+rng())*rs,z=(gj+rng())*rs,r0=rng();if(x<2||z<2||x>W-2||z>W-2)continue;
      const k=nAt(x,z),ny=nrm[k+1]/127.5-1,slope=Math.acos(clamp(ny,0,1))*57.3,h=sampleH(T,x,z);
      const sed=data[k+1]/255,shore=data[k+2]/255;
      const pr=smooth(22,40,slope)*0.6+sed*0.25*smooth(12,25,slope)+shore*0.12+0.015;
      if(r0>pr)continue;const big=rng();
      out.rocks.push(x,h-0.2,z,(0.4+big*big*big*3.2)*(slope>30?1.4:1),rng()*6.2832,0.85+rng()*0.3,rng(),(rng()*4)|0);
    }
    // small stones scattered through meadows and along streams
    const ps=6/Math.sqrt(p.rocks),pcn=Math.floor(W/ps);
    for(let gj=0;gj<pcn;gj++)for(let gi=0;gi<pcn;gi++){const x=(gi+rng())*ps,z=(gj+rng())*ps,r0=rng();if(x<2||z<2||x>W-2||z>W-2)continue;
      const k=nAt(x,z),wet=data[k]/255,wt=sampleWater(T,x,z);if(wt[1]>0)continue;if(r0>0.08+wet*0.12)continue;
      out.rocks.push(x,sampleH(T,x,z)-0.09,z,0.14+rng()*0.34,rng()*6.2832,0.5+rng()*0.25,rng(),(rng()*4)|0);}}
  // forest density -> data.A (blurred)
  const fb=new Float32Array(N*N);
  for(let j=1;j<N-1;j++)for(let i=1;i<N-1;i++){let s=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)s+=fmap[(j+dy)*N+i+dx];fb[j*N+i]=s/9;}
  for(let n=0;n<N*N;n++)data[n*4+3]=Math.round(clamp(fb[n],0,1)*255);
  out.trees=out.trees.map(a=>Float32Array.from(a));out.rocks=Float32Array.from(out.rocks);
  T.veg=out;T.stats.trees=(out.trees[0].length+out.trees[1].length+out.trees[3].length+out.trees[4].length)/8;T.stats.bushes=out.trees[2].length/8;T.stats.rocks=out.rocks.length/8;
  T.forestMask=forestMask;
}

if(typeof module!=='undefined')module.exports={mulberry32,makeNoise,fbm,ridged,makeTerrainFn,shapeHeight,genTerrain,genErosion,genWater,genMaps,genVegetation,sampleH,priorityFlood,makeYielder};
