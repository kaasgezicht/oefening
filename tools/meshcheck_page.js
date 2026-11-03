(function(){
const cv=document.createElement('canvas');cv.id='mv';cv.width=1200;cv.height=900;cv.style.cssText='position:fixed;left:0;top:0;z-index:999;background:#bcd';document.body.appendChild(cv);
const g=cv.getContext('webgl2',{preserveDrawingBuffer:true,antialias:false});
const VS=`#version 300 es
layout(location=0) in vec3 aP;layout(location=1) in vec3 aC;layout(location=2) in float aM;
uniform mat4 uVP;uniform vec3 uEye;uniform float uN,uZ;out vec3 vW;out vec3 vC;flat out float vM;
void main(){vW=aP;vC=aC;vM=aM;float r=float(gl_VertexID/3)/uN;if(uZ<0.)r=1.-r;vec3 p=aP+normalize(uEye-aP)*abs(uZ)*r;gl_Position=uVP*vec4(p,1.);}`;
const FS=`#version 300 es
precision highp float;in vec3 vW;in vec3 vC;flat in float vM;uniform vec3 uEye;out vec4 o;
vec3 matTint(int m){
 if(m==4)return vec3(.93,.88,.78);if(m==5)return vec3(.62,.30,.22);if(m==6)return vec3(.25,.35,.55);if(m==7)return vec3(.42,.27,.16);
 if(m==8)return vec3(.66,.32,.24);if(m==9)return vec3(1.,.9,.5);if(m==10)return vec3(1.);if(m==1)return vec3(.35,.6,.3);if(m==3)return vec3(1.,.8,.9);
 if(m==15)return vec3(.3,.45,.7);if(m==16)return vec3(.3,.3,.35);if(m==17)return vec3(.95,.75,.6);if(m==18)return vec3(.8,.2,.2);if(m==19)return vec3(.55,.35,.2);if(m==20)return vec3(.8,.25,.2);
 return vec3(1.);}
void main(){vec3 N=normalize(cross(dFdx(vW),dFdy(vW)));vec3 V=normalize(uEye-vW);if(dot(N,V)<0.)N=-N;
 vec3 L=normalize(vec3(.5,.8,.3));float d=max(dot(N,L),0.)*.75+.3+.15*N.y;
 vec3 c=pow(vC,vec3(1.))*matTint(int(vM+.5));o=vec4(c*d,1.);}`;
function sh(t,s){const x=g.createShader(t);g.shaderSource(x,s);g.compileShader(x);if(!g.getShaderParameter(x,g.COMPILE_STATUS))throw g.getShaderInfoLog(x);return x;}
const pr=g.createProgram();g.attachShader(pr,sh(g.VERTEX_SHADER,VS));g.attachShader(pr,sh(g.FRAGMENT_SHADER,FS));g.linkProgram(pr);
const gridVS=`#version 300 es
layout(location=0) in vec3 aP;uniform mat4 uVP;void main(){gl_Position=uVP*vec4(aP,1.);}`;
const gridFS=`#version 300 es
precision highp float;uniform vec4 uCol;out vec4 o;void main(){o=uCol;}`;
const gp=g.createProgram();g.attachShader(gp,sh(g.VERTEX_SHADER,gridVS));g.attachShader(gp,sh(g.FRAGMENT_SHADER,gridFS));g.linkProgram(gp);
function persp(f,a,n,fa){const t=1/Math.tan(f/2);return[t/a,0,0,0,0,t,0,0,0,0,(fa+n)/(n-fa),-1,0,0,2*fa*n/(n-fa),0];}
function look(e,c,u){const z=norm(sub(e,c)),x=norm(cr(u,z)),y=cr(z,x);return[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,e),-dot(y,e),-dot(z,e),1];}
function mul(a,b){const o=new Array(16).fill(0);for(let i=0;i<4;i++)for(let j=0;j<4;j++)for(let k=0;k<4;k++)o[j*4+i]+=a[k*4+i]*b[j*4+k];return o;}
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cr=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);};
// normalize a mesh object into triangles: [ax,ay,az,bx,...] + col + mat per tri
function tris(M){const T=[],C=[],Mt=[],EN=[];
 if(M.i){const s=14;for(let k=0;k<M.i.length;k+=3){const ids=[M.i[k],M.i[k+1],M.i[k+2]];for(const id of ids)T.push(M.v[id*s],M.v[id*s+1],M.v[id*s+2]);C.push(M.v[ids[0]*s+6],M.v[ids[0]*s+7],M.v[ids[0]*s+8]);Mt.push(M.v[ids[0]*s+13]);EN.push([M.v[ids[0]*s+3],M.v[ids[0]*s+4],M.v[ids[0]*s+5]]);}}
 else{const s=10;for(let k=0;k<M.n;k+=3){for(let j=0;j<3;j++)T.push(M.v[(k+j)*s],M.v[(k+j)*s+1],M.v[(k+j)*s+2]);C.push(M.v[k*s+6],M.v[k*s+7],M.v[k*s+8]);Mt.push(M.v[k*s+9]);}}
 return{T,C,Mt,EN:EN.length?EN:null,n:T.length/9};}
function registry(){const L={};const add=(k,f)=>{L[k]=f;};
 const tm=()=>treeMeshes();for(let i=0;i<6;i++){add('t'+i+'n',()=>tm()[i].near);add('t'+i+'f',()=>tm()[i].far);}
 for(let i=0;i<6;i++)add('house'+i,()=>houseMeshes()[i].M);
 add('millBody',()=>windmillMeshes().body);add('millSails',()=>windmillMeshes().sails);
 const fns={hohenzollern:hohenzollernMesh,lamp:lampMesh,workshop:workshopMesh,slotmark:slotMarkMesh,lorry:lorryMesh,sawmill:sawmillMesh,bakery:bakeryMesh,restaurant:restaurantMesh,stall:stallMesh,stationhall:stationHallMesh,bus:busMesh,busstop:busStopMesh,castle:castleMesh,barn:barnMesh,shed:shedMesh,silo:siloMesh,harrow:harrowMesh,trailer:trailerMesh,bale:baleMesh,seated:seatedMesh,dooropen:doorOpenMesh,steamer:steamerMesh,sternwheel:sternwheelMesh,parasol:parasolMesh,towel:towelMesh,lier:lierMesh,swimmer:swimmerMesh,shoveler:shovelerMesh,xbuck:xbuckMesh,boom:boomMesh,tractor:tractorMesh,combine:combineMesh,plough:ploughMesh,drill:drillMesh,horse:horseMesh,fence:fenceMesh,person:personMesh,speedskater:speedSkaterMesh,hgoal:goalMesh,puck:puckMesh,sled:sledMesh,sledder:sledderMesh,sheep:sheepMesh,cow:cowMesh2,duck:duckMesh,swan:swanMesh,rowboat:rowboatMesh,sailboat:sailboatMesh,cloud:cloudMesh,
  loco:locoMesh,tender:tenderMesh,signal:signalMesh,station:stationMesh,loadStage:loadStageMesh,gantry:gantryMesh,trolley:trolleyMesh,hook:hookMesh};
 add('logRow0',()=>logRowMesh(0));for(let v=0;v<3;v++)add('balloon'+v,()=>balloonMesh(v));for(const k of ['gold','diamond'])add('mine_'+k,()=>mineMesh(k));add('oreWagon',oreWagonMesh);add('oreLoad',()=>oreLoadMesh('gold'));add('oreYard',oreYardMesh);add('oreHeap',()=>oreHeapMesh('silver'));add('bundle2',()=>logRowMesh(2,true));
 for(const k in fns)add(k,fns[k]);
 add('skater',()=>skaterMesh(0));add('hockeyP',()=>skaterMesh(1));add('birdD',()=>birdMesh(true));add('birdL',()=>birdMesh(false));
 add('coachR',()=>coachMesh([0.72,0.20,0.17],[0.96,0.88,0.70]));for(let t=0;t<4;t++)add('wagon'+t,()=>wagonMesh(t));
 return L;}
const REG=registry();
// --- automated checks
function checks(D){const iss=[];const T=D.T;let nan=0,deg=0;const n=D.n;
 const tri=k=>[[T[k*9],T[k*9+1],T[k*9+2]],[T[k*9+3],T[k*9+4],T[k*9+5]],[T[k*9+6],T[k*9+7],T[k*9+8]]];
 const area=[],nrm=[];
 for(let k=0;k<n;k++){const [a,b,c]=tri(k);if([...a,...b,...c].some(v=>!isFinite(v))){nan++;area.push(0);nrm.push([0,0,0]);continue;}
  const x=cr(sub(b,a),sub(c,a)),l=Math.hypot(...x);area.push(l/2);nrm.push(l>0?x.map(v=>v/l):[0,0,0]);if(l/2<1e-7)deg++;}
 if(nan)iss.push(`NaN tris ${nan}`);if(deg)iss.push(`degenerate tris ${deg}`);
 // coplanar overlap (z-fight) between tris of different colour/material
 const key=(nv,d)=>{let s=nv[0]<-1e-6||(Math.abs(nv[0])<1e-6&&(nv[1]<-1e-6||(Math.abs(nv[1])<1e-6&&nv[2]<0)))?-1:1;return[nv.map(v=>Math.round(v*s*200)).join(','),Math.round(d*s*400)];};
 const buckets=new Map();
 for(let k=0;k<n;k++){if(area[k]<1e-5)continue;const [a]=tri(k);const nv=nrm[k];const d=dot(nv,a);const [kk,dd]=key(nv,d);
  for(const off of [-1,0,1]){const K=kk+'|'+(dd+off);if(!buckets.has(K))buckets.set(K,[]);if(off===0)buckets.get(K).push(k);}}
 let zf=0;const zfEx=[];
 const proj=(p,nv)=>{const ax=Math.abs(nv[0])>Math.abs(nv[1])?(Math.abs(nv[0])>Math.abs(nv[2])?0:2):(Math.abs(nv[1])>Math.abs(nv[2])?1:2);const i=(ax+1)%3,j=(ax+2)%3;return[p[i],p[j]];};
 const inTri=(p,a,b,c)=>{const s=(u,v,w)=>(v[0]-u[0])*(w[1]-u[1])-(v[1]-u[1])*(w[0]-u[0]);const d1=s(a,b,p),d2=s(b,c,p),d3=s(c,a,p);const neg=d1<-1e-9||d2<-1e-9||d3<-1e-9,pos=d1>1e-9||d2>1e-9||d3>1e-9;return!(neg&&pos);};
 const strictIn=(p,a,b,c)=>{const s=(u,v,w)=>(v[0]-u[0])*(w[1]-u[1])-(v[1]-u[1])*(w[0]-u[0]);const d1=s(a,b,p),d2=s(b,c,p),d3=s(c,a,p);const e=1e-6;return(d1>e&&d2>e&&d3>e)||(d1<-e&&d2<-e&&d3<-e);};
 const keysAll=[...buckets.keys()];
 const seenPair=new Set();
 for(const K of keysAll){const arr=buckets.get(K);const [kk,dd]=K.split('|');const pool=[];for(const off of [-1,0,1]){const b=buckets.get(kk+'|'+(+dd+off));if(b)pool.push(...b);}
  if(pool.length<2||pool.length>4000)continue;
  for(const i of arr)for(const j of pool){if(j<=i)continue;const pk=i+'_'+j;if(seenPair.has(pk))continue;seenPair.add(pk);
   const sameLook=D.C[i*3]===D.C[j*3]&&D.C[i*3+1]===D.C[j*3+1]&&D.C[i*3+2]===D.C[j*3+2]&&D.Mt[i]===D.Mt[j];
   const A=tri(i),B=tri(j);const nv=nrm[i];if(Math.abs(dot(nv,sub(B[0],A[0])))>0.004)continue;if(D.EN){if(dot(D.EN[i],D.EN[j])<0.99)continue;}else if(dot(nrm[i],nrm[j])<0.99)continue;if(Math.max(A[0][1],A[1][1],A[2][1])<-0.25&&Math.max(B[0][1],B[1][1],B[2][1])<-0.25)continue;
   const a2=A.map(p=>proj(p,nv)),b2=B.map(p=>proj(p,nv));
   const ca=[(a2[0][0]+a2[1][0]+a2[2][0])/3,(a2[0][1]+a2[1][1]+a2[2][1])/3],cb=[(b2[0][0]+b2[1][0]+b2[2][0])/3,(b2[0][1]+b2[1][1]+b2[2][1])/3];
   let ov=strictIn(cb,...a2)||strictIn(ca,...b2);
   if(!ov){for(const p of b2)if(strictIn(p,...a2)){ov=true;break;}}
   if(!ov){for(const p of a2)if(strictIn(p,...b2)){ov=true;break;}}
   if(ov&&!sameLook){zf++;const ctr=[0,1,2].map(a=>((A[0][a]+A[1][a]+A[2][a])/3).toFixed(2)).join(',');if(zfEx.length<10&&!zfEx.some(t=>t.startsWith('@'+ctr)))zfEx.push('@'+ctr+' '+`[${A[0].map(v=>v.toFixed(2))}] c${[...D.C.slice(i*3,i*3+3)].map(v=>v.toFixed(2))} m${D.Mt[i]} vs c${[...D.C.slice(j*3,j*3+3)].map(v=>v.toFixed(2))} m${D.Mt[j]}`);}
  }}
 if(zf)iss.push(`zfight ${zf}: `+zfEx.join(' ; '));
 // connected components by shared vertex positions, then attachment by true proximity (sampled points vs triangles)
 const vk=p=>p.map(v=>Math.round(v*500)).join(',');const par=new Int32Array(n).map((_,i)=>i);const f=x=>{while(par[x]!==x){par[x]=par[par[x]];x=par[x];}return x;};
 const vm=new Map();for(let k=0;k<n;k++)for(const p of tri(k)){const K=vk(p);if(vm.has(K)){const a=f(vm.get(K)),b=f(k);if(a!==b)par[a]=b;}else vm.set(K,k);}
 const cid=new Int32Array(n);const roots=new Map();for(let k=0;k<n;k++){const r=f(k);if(!roots.has(r))roots.set(r,roots.size);cid[k]=roots.get(r);}
 const NC=roots.size;const lo=new Float32Array(NC*3).fill(1e9),hi=new Float32Array(NC*3).fill(-1e9);
 for(let k=0;k<n;k++){const c=cid[k];for(const p of tri(k))for(let a=0;a<3;a++){lo[c*3+a]=Math.min(lo[c*3+a],p[a]);hi[c*3+a]=Math.max(hi[c*3+a],p[a]);}}
 const CS=0.3,cell=new Map(),ck=(x,y,z)=>x+','+y+','+z;
 for(let k=0;k<n;k++){if(area[k]<1e-9)continue;const t=tri(k);const l=[0,1,2].map(a=>Math.floor((Math.min(t[0][a],t[1][a],t[2][a])-0.07)/CS)),h=[0,1,2].map(a=>Math.floor((Math.max(t[0][a],t[1][a],t[2][a])+0.07)/CS));
  if((h[0]-l[0]+1)*(h[1]-l[1]+1)*(h[2]-l[2]+1)>20000)continue;for(let x=l[0];x<=h[0];x++)for(let y=l[1];y<=h[1];y++)for(let z=l[2];z<=h[2];z++){const K=ck(x,y,z);let b=cell.get(K);if(!b)cell.set(K,b=[]);b.push(k);}}
 const ptd=(p,a,b,c)=>{// distance point-triangle
  const ab=sub(b,a),ac=sub(c,a),ap=sub(p,a);const d1=dot(ab,ap),d2=dot(ac,ap);if(d1<=0&&d2<=0)return Math.hypot(...ap);
  const bp=sub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);if(d3>=0&&d4<=d3)return Math.hypot(...bp);const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0){const v=d1/(d1-d3);return Math.hypot(...sub(p,[a[0]+ab[0]*v,a[1]+ab[1]*v,a[2]+ab[2]*v]));}
  const cp=sub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);if(d6>=0&&d5<=d6)return Math.hypot(...cp);const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0){const w=d2/(d2-d6);return Math.hypot(...sub(p,[a[0]+ac[0]*w,a[1]+ac[1]*w,a[2]+ac[2]*w]));}
  const va=d3*d6-d5*d4;if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0){const w=(d4-d3)/((d4-d3)+(d5-d6));return Math.hypot(...sub(p,[b[0]+(c[0]-b[0])*w,b[1]+(c[1]-b[1])*w,b[2]+(c[2]-b[2])*w]));}
  const den=1/(va+vb+vc),v=vb*den,w=vc*den;return Math.hypot(...sub(p,[a[0]+ab[0]*v+ac[0]*w,a[1]+ab[1]*v+ac[1]*w,a[2]+ab[2]*v+ac[2]*w]));};
 const TOL=0.06,SP=0.1;const adj=Array.from({length:NC},()=>new Set());
 for(let k=0;k<n;k++){if(area[k]<1e-9)continue;const t=tri(k),c=cid[k];const L1=Math.hypot(...sub(t[1],t[0])),L2=Math.hypot(...sub(t[2],t[0]));const m=Math.min(20,Math.max(1,Math.ceil(Math.max(L1,L2)/SP)));
  for(let i=0;i<=m;i++)for(let j=0;j<=m-i;j++){const u=i/m,v=j/m;const p=[0,1,2].map(a=>t[0][a]+(t[1][a]-t[0][a])*u+(t[2][a]-t[0][a])*v);
   const b=cell.get(ck(Math.floor(p[0]/CS),Math.floor(p[1]/CS),Math.floor(p[2]/CS)));if(!b)continue;
   for(const q of b){const c2=cid[q];if(c2===c||adj[c].has(c2))continue;if(p[0]<lo[c2*3]-TOL||p[0]>hi[c2*3]+TOL||p[1]<lo[c2*3+1]-TOL||p[1]>hi[c2*3+1]+TOL||p[2]<lo[c2*3+2]-TOL||p[2]>hi[c2*3+2]+TOL)continue;
    const T2=tri(q);if(ptd(p,T2[0],T2[1],T2[2])<TOL){adj[c].add(c2);adj[c2].add(c);}}}}
 for(let c=0;c<NC;c++)for(let c2=0;c2<NC;c2++){if(c===c2||adj[c].has(c2))continue;let inside=true;for(let a=0;a<3;a++){if(hi[c*3+a]<lo[c2*3+a]+0.01||lo[c*3+a]>hi[c2*3+a]-0.01){inside=false;break;}}if(!inside)continue;
  // c overlaps the interior of c2's box: count it when c2 is a closed solid-ish part (box/prism: many tris in a small hull)
  let ov=1;for(let a=0;a<3;a++)ov*=Math.min(hi[c*3+a],hi[c2*3+a])-Math.max(lo[c*3+a],lo[c2*3+a]);if(ov>1e-5){adj[c].add(c2);adj[c2].add(c);}}
 // grounded: reaches y <= ground (0.2 above the lowest point of the whole mesh, or y<=0.2)
 let gmin=1e9;for(let c=0;c<NC;c++)gmin=Math.min(gmin,lo[c*3+1]);const gy=Math.max(0.2,gmin+0.2);
 const seen=new Uint8Array(NC);const st=[];for(let c=0;c<NC;c++)if(lo[c*3+1]<=gy){seen[c]=1;st.push(c);}
 // also anchor the largest component (vehicles / sails hang off their body)
 let big=0,bigN=-1;const cnt=new Int32Array(NC);for(let k=0;k<n;k++)cnt[cid[k]]++;for(let c=0;c<NC;c++)if(cnt[c]>bigN){bigN=cnt[c];big=c;}if(!seen[big]){seen[big]=1;st.push(big);}
 while(st.length){const c=st.pop();for(const o of adj[c])if(!seen[o]){seen[o]=1;st.push(o);}}
 const flEx=[];let fl=0;for(let c=0;c<NC;c++)if(!seen[c]){fl++;if(flEx.length<40)flEx.push(`[${[lo[c*3],lo[c*3+1],lo[c*3+2]].map(v=>v.toFixed(2))}..${[hi[c*3],hi[c*3+1],hi[c*3+2]].map(v=>v.toFixed(2))}]`);}
 if(fl)iss.push(`floating parts ${fl}: `+flEx.join(' ; '));
 return iss;}
let buf=null,vao=null;
function draw(D,views){const P=[],I=[];const C=[];
 const lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];for(let k=0;k<D.T.length;k+=3)for(let a=0;a<3;a++){const v=D.T[k+a];if(isFinite(v)){lo[a]=Math.min(lo[a],v);hi[a]=Math.max(hi[a],v);}}
 const V=new Float32Array(D.n*3*7);for(let t=0;t<D.n;t++)for(let j=0;j<3;j++){const o=(t*3+j)*7;V.set([D.T[t*9+j*3],D.T[t*9+j*3+1],D.T[t*9+j*3+2],D.C[t*3],D.C[t*3+1],D.C[t*3+2],D.Mt[t]],o);}
 if(!vao){vao=g.createVertexArray();buf=g.createBuffer();}
 g.bindVertexArray(vao);g.bindBuffer(g.ARRAY_BUFFER,buf);g.bufferData(g.ARRAY_BUFFER,V,g.STATIC_DRAW);
 g.enableVertexAttribArray(0);g.vertexAttribPointer(0,3,g.FLOAT,false,28,0);g.enableVertexAttribArray(1);g.vertexAttribPointer(1,3,g.FLOAT,false,28,12);g.enableVertexAttribArray(2);g.vertexAttribPointer(2,1,g.FLOAT,false,28,24);
 const c=[(lo[0]+hi[0])/2,(lo[1]+hi[1])/2,(lo[2]+hi[2])/2],r=Math.max(0.05,Math.hypot(hi[0]-lo[0],hi[1]-lo[1],hi[2]-lo[2])/2);
 // ground grid at y=0
 const gl2=[];const gs=Math.pow(10,Math.floor(Math.log10(r*2)))/2,ext=Math.ceil(r*1.5/gs)*gs;for(let x=-ext;x<=ext+1e-6;x+=gs){gl2.push(c[0]+x,0,c[2]-ext,c[0]+x,0,c[2]+ext,c[0]-ext,0,c[2]+x,c[0]+ext,0,c[2]+x);}
 const gb=g.createBuffer(),gv=g.createVertexArray();g.bindVertexArray(gv);g.bindBuffer(g.ARRAY_BUFFER,gb);g.bufferData(g.ARRAY_BUFFER,new Float32Array(gl2),g.STATIC_DRAW);g.enableVertexAttribArray(0);g.vertexAttribPointer(0,3,g.FLOAT,false,12,0);
 g.enable(g.SCISSOR_TEST);g.enable(g.DEPTH_TEST);g.disable(g.CULL_FACE);
 const W=600,H=450;const zpix=[];views.forEach((vw,i)=>{const x=(i%2)*W,y=(1-Math.floor(i/2))*H;g.viewport(x,y,W,H);g.scissor(x,y,W,H);g.clearColor(.74,.8,.86,1);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);
  const [yaw,pit,zoom,fx,fy,fz]=vw;const cc=fx!==undefined?[fx,fy,fz]:c;const d=r*2.6/(zoom||1);const e=[cc[0]+Math.cos(pit)*Math.cos(yaw)*d,cc[1]+Math.sin(pit)*d,cc[2]+Math.cos(pit)*Math.sin(yaw)*d];
  const VP=mul(persp(0.75,W/H,d*0.02,d*4),look(e,cc,Math.abs(pit)>1.5?[1,0,0]:[0,1,0]));
  g.useProgram(gp);g.uniformMatrix4fv(g.getUniformLocation(gp,'uVP'),false,VP);g.uniform4f(g.getUniformLocation(gp,'uCol'),.5,.55,.6,1);g.bindVertexArray(gv);g.drawArrays(g.LINES,0,gl2.length/3);
  g.useProgram(pr);g.uniformMatrix4fv(g.getUniformLocation(pr,'uVP'),false,VP);g.uniform3fv(g.getUniformLocation(pr,'uEye'),e);g.uniform1f(g.getUniformLocation(pr,'uN'),D.n);g.bindVertexArray(vao);
  const zr=Math.max(0.004,d*0.0004);g.uniform1f(g.getUniformLocation(pr,'uZ'),zr);g.drawArrays(g.TRIANGLES,0,D.n*3);const A=new Uint8Array(W*H*4);g.readPixels(x,y,W,H,g.RGBA,g.UNSIGNED_BYTE,A);
  g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);g.useProgram(gp);g.bindVertexArray(gv);g.drawArrays(g.LINES,0,gl2.length/3);g.useProgram(pr);g.bindVertexArray(vao);
  g.uniform1f(g.getUniformLocation(pr,'uZ'),-zr);g.drawArrays(g.TRIANGLES,0,D.n*3);const B=new Uint8Array(W*H*4);g.readPixels(x,y,W,H,g.RGBA,g.UNSIGNED_BYTE,B);
  const df=new Uint8Array(W*H);for(let q=0,p=0;q<W*H*4;q+=4,p++)df[p]=(Math.abs(A[q]-B[q])+Math.abs(A[q+1]-B[q+1])+Math.abs(A[q+2]-B[q+2])>24)?1:0;
  let zc=0;for(let yy=1;yy<H-1;yy++)for(let xx=1;xx<W-1;xx++){const p=yy*W+xx;if(df[p]&&df[p-1]&&df[p+1]&&df[p-W]&&df[p+W]){zc++;for(const o of [0,-1,1,-W,W]){const q=(p+o)*4;B[q]=255;B[q+1]=0;B[q+2]=255;}}}
  zpix.push(zc);if(zc){const tex=g.createTexture();g.bindTexture(g.TEXTURE_2D,tex);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,W,H,0,g.RGBA,g.UNSIGNED_BYTE,B);const fb=g.createFramebuffer();g.bindFramebuffer(g.READ_FRAMEBUFFER,fb);g.framebufferTexture2D(g.READ_FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,tex,0);g.bindFramebuffer(g.DRAW_FRAMEBUFFER,null);g.disable(g.SCISSOR_TEST);g.blitFramebuffer(0,0,W,H,x,y,x+W,y+H,g.COLOR_BUFFER_BIT,g.NEAREST);g.enable(g.SCISSOR_TEST);g.bindFramebuffer(g.READ_FRAMEBUFFER,null);g.deleteFramebuffer(fb);g.deleteTexture(tex);}
  });
 g.deleteBuffer(gb);g.deleteVertexArray(gv);
 return{lo,hi,zpix};}
window.MV={list:()=>Object.keys(REG),
 views:[[-2.2,0.35],[0.9,0.3],[-0.7,1.2],[2.4,-0.05]],
 show(name,views){try{const M=REG[name]();const D=tris(M);const bb=draw(D,views||this.views);const iss=checks(D);if(bb.zpix.some(v=>v>0))iss.unshift('ZPIX '+bb.zpix.join('/'));
   return{name,ok:true,tris:D.n,bbox:bb.lo.map(v=>v.toFixed(2)).join(',')+' .. '+bb.hi.map(v=>v.toFixed(2)).join(','),issues:iss};}catch(e){return{name,ok:false,err:String(e&&e.stack||e)};}},
 showMesh(M,views){const D=tris(M);draw(D,views||this.views);return checks(D);},REG,tris,checks};
})();
