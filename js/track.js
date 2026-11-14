'use strict';
// ===== track.js
// ===================================================================
// TRACK (steps 10-11) — straights and constant-radius curves like real track, laid by dragging.
// Vertical profile follows the ground or keeps an even grade. Deep cuts become tunnels, high fills
// and water crossings become stone viaducts. Nothing is built until you confirm the preview.
// nodes: {id,x,z,y,h,g}  h = heading pointing OUT of the node, g = grade along h
// segs:  {id,a,b,x0,z0,h0,k,L,y0,y1,g0,g1,prof?,spans?}  spans: [[t0,t1,'b'|'t'],...]
// ===================================================================
const GAUGE=1.435,FORMATION_DROP=0.72,TUN_R=3.3,TUN_CY=1.7,TUN_PORTAL=TUN_CY+TUN_R+3.5;
const wrapPi=a=>{a=(a+Math.PI)%(2*Math.PI);if(a<0)a+=2*Math.PI;return a-Math.PI;};
const Track={nodes:[],segs:[],sigs:[],stations:[],nextId:1,undo:[],
  serialize(){const keep=this.segs.filter(s=>!s.pend),ids=new Set(),sids=new Set(keep.map(s=>s.id));keep.forEach(s=>{ids.add(s.a);ids.add(s.b);});
    return{nodes:this.nodes.filter(n=>ids.has(n.id)).map(n=>({...n})),segs:keep.map(s=>{const o={...s};if(o.prof)o.prof=o.prof.map(v=>+v.toFixed(2));return o;}),nextId:this.nextId,
      sigs:this.sigs.filter(g=>sids.has(g.sid)).map(g=>({...g})),stations:this.stations.filter(g=>sids.has(g.sid)).map(g=>({...g}))};},
  load(d){this.nodes=(d&&d.nodes||[]).map(n=>({...n}));this.segs=(d&&d.segs||[]).map(s=>({...s}));this.nextId=d&&d.nextId||1;this.sigs=(d&&d.sigs||[]).map(g=>({...g}));this.stations=(d&&d.stations||[]).map(g=>({...g}));this.undo=[];if(window.Net||typeof Net!=='undefined')Net.changed();},
  node(id){return this.nodes.find(n=>n.id===id);},
  links(id){let c=0;for(const s of this.segs)if(s.a===id||s.b===id)c++;return c;},
  freeEnds(){return this.nodes.filter(n=>this.links(n.id)<2);},
  length(){return this.segs.reduce((a,s)=>a+(s.pend?0:s.L),0);}
};
function segPoint(s,t){const th=s.h0+s.k*t;if(Math.abs(s.k)<1e-7)return[s.x0+Math.cos(s.h0)*t,s.z0+Math.sin(s.h0)*t,th];
  return[s.x0+(Math.sin(th)-Math.sin(s.h0))/s.k,s.z0-(Math.cos(th)-Math.cos(s.h0))/s.k,th];}
function segY(s,t){t=clamp(t,0,s.L);
  if(s.prof){const n=s.prof.length-1,f=t/s.L*n,i=Math.min(n-1,f|0),u=f-i;return s.prof[i]*(1-u)+s.prof[i+1]*u;}
  const u=t/s.L,u2=u*u,u3=u2*u;return(2*u3-3*u2+1)*s.y0+(u3-2*u2+u)*s.L*s.g0+(-2*u3+3*u2)*s.y1+(u3-u2)*s.L*s.g1;}
function segGrade(s,t){const e=Math.min(1,s.L*0.25),a=Math.max(0,t-e),b=Math.min(s.L,t+e);return(segY(s,b)-segY(s,a))/(b-a);}
function spanAt(s,t){if(!s.spans)return null;for(const sp of s.spans)if(t>=sp[0]&&t<=sp[1])return sp;return null;}
function segNearest(s,x,z){
  if(Math.abs(s.k)<1e-7){const c=Math.cos(s.h0),sn=Math.sin(s.h0),dx=x-s.x0,dz=z-s.z0;return[dx*c+dz*sn,Math.abs(-dx*sn+dz*c)];}
  const r=1/s.k,cx=s.x0-Math.sin(s.h0)*r,cz=s.z0+Math.cos(s.h0)*r;const b=Math.atan2(z-cz,x-cx);
  const th=b+(s.k>0?Math.PI/2:-Math.PI/2);let dth=wrapPi(th-s.h0);
  if(s.k>0){if(dth<-0.3)dth+=2*Math.PI;}else{if(dth>0.3)dth-=2*Math.PI;}
  return[dth/s.k,Math.abs(Math.hypot(x-cx,z-cz)-Math.abs(r))];
}
function arcThrough(x0,z0,h0,x1,z1){const dx=x1-x0,dz=z1-z0,c=Math.hypot(dx,dz);if(c<0.5)return null;
  const phi=wrapPi(Math.atan2(dz,dx)-h0);if(Math.abs(phi)>2.5)return null;if(Math.abs(phi)<1e-5)return{k:0,L:c};
  return{k:2*Math.sin(phi)/c,L:c*phi/Math.sin(phi)};}
function biarc(x1,z1,h1,x2,z2,h2){
  const t1=[Math.cos(h1),Math.sin(h1)],t2=[Math.cos(h2),Math.sin(h2)],v=[x2-x1,z2-z1];
  const vt=v[0]*(t1[0]+t2[0])+v[1]*(t1[1]+t2[1]),vv=v[0]*v[0]+v[1]*v[1],den=2*(1-(t1[0]*t2[0]+t1[1]*t2[1]));let d;
  if(den<1e-6){const vt2=v[0]*t2[0]+v[1]*t2[1];if(Math.abs(vt2)<1e-6)return null;d=vv/(4*vt2);}else d=(-vt+Math.sqrt(vt*vt+den*vv))/den;
  if(!(d>0))return null;
  const pm=[(x1+x2+d*(t1[0]-t2[0]))/2,(z1+z2+d*(t1[1]-t2[1]))/2];
  const a1=arcThrough(x1,z1,h1,pm[0],pm[1]);if(!a1)return null;const hm=h1+a1.k*a1.L;
  const a2=arcThrough(pm[0],pm[1],hm,x2,z2);if(!a2)return null;if(Math.abs(wrapPi(hm+a2.k*a2.L-h2))>0.05)return null;
  return[{x0:x1,z0:z1,h0:h1,k:a1.k,L:a1.L},{x0:pm[0],z0:pm[1],h0:hm,k:a2.k,L:a2.L}].filter(p=>p.L>0.3);
}
// curve of a fixed radius, then a straight to the target (like sectional model track)
function curveStraight(x0,z0,h0,bx,bz,Rr){
  const side=Math.sign(Math.cos(h0)*(bz-z0)-Math.sin(h0)*(bx-x0))||1;const cx=x0-Math.sin(h0)*Rr*side,cz=z0+Math.cos(h0)*Rr*side;
  const d=Math.hypot(bx-cx,bz-cz);if(d<Rr*1.02)return null;const beta=Math.atan2(bz-cz,bx-cx),al=Math.acos(Rr/d);
  const tht=side>0?beta-al:beta+al,th0=Math.atan2(z0-cz,x0-cx);let sw=wrapPi(tht-th0);
  if(side>0&&sw<-1e-4)sw+=2*Math.PI;if(side<0&&sw>1e-4)sw-=2*Math.PI;if(Math.abs(sw)>2.6)return null;
  const arc={x0,z0,h0,k:side/Rr,L:Math.abs(sw)*Rr},e=segPoint(arc,arc.L),Ls=Math.hypot(bx-e[0],bz-e[1]);
  const out=[];if(arc.L>0.5)out.push(arc);if(Ls>0.5)out.push({x0:e[0],z0:e[1],h0:e[2],k:0,L:Ls});return out.length?out:null;
}
const ground0=(x,z)=>{const T=R.world;return sampleH(T,x,z,T.H0||T.H);};
const waterAt0=(x,z)=>sampleWater(R.world,x,z);

// ---- vertical profile
function profileFollow(pieces,y0,y1,gmax,gIn){
  const pts=[];pieces.forEach((p,pi)=>{const n=Math.max(2,Math.ceil(p.L/4));p.n=n;for(let k=pi?1:0;k<=n;k++){const q=segPoint(p,p.L*k/n);
    let g=ground0(q[0],q[1])+FORMATION_DROP;const w=waterAt0(q[0],q[1]);if(w[1]>0)g=Math.max(g,w[0]+3);pts.push({g,ds:p.L/n});}});
  const n=pts.length;let y=pts.map(p=>p.g);
  for(let it=0;it<3;it++){const z=y.slice();for(let i=0;i<n;i++){let s=0,c=0;for(let j=Math.max(0,i-5);j<=Math.min(n-1,i+5);j++){s+=z[j];c++;}y[i]=s/c;}}
  const fwd=()=>{y[0]=y0;for(let i=1;i<n;i++){const m=gmax*pts[i].ds;y[i]=clamp(y[i],y[i-1]-m,y[i-1]+m);}};
  const bwd=()=>{y[n-1]=y1;for(let i=n-2;i>=0;i--){const m=gmax*pts[i+1].ds;y[i]=clamp(y[i],y[i+1]-m,y[i+1]+m);}};
  fwd();if(y1!==null){bwd();fwd();if(Math.abs(y[n-1]-y1)>0.05)return false;}
  for(let it=0;it<4;it++){const z=y.slice();for(let i=1;i<n-1;i++)y[i]=(z[i-1]+2*z[i]+z[i+1])/4;}
  if(gIn!==undefined&&gIn!==null){let acc=0;for(let i=1;i<n;i++){acc+=pts[i].ds;const w=smooth(0,24,acc);y[i]=lerp(y0+clamp(gIn,-gmax,gmax)*acc,y[i],w);}}
  let o=0;pieces.forEach(p=>{p.prof=[];for(let k=0;k<=p.n;k++)p.prof.push(y[o+k]);o+=p.n;p.y0=p.prof[0];p.y1=p.prof[p.n];p.g0=p.g1=0;delete p.n;});
  return true;
}
function profileGrade(pieces,y0,y1,gIn,gEnd){
  const Lt=pieces.reduce((a,p)=>a+p.L,0),avg=(y1-y0)/Lt;let acc=0;
  pieces.forEach((p,i)=>{p.y0=y0+avg*acc;acc+=p.L;p.y1=y0+avg*acc;p.g0=i===0&&gIn!==null?gIn:avg;p.g1=i===pieces.length-1&&gEnd!==null?gEnd:avg;delete p.prof;});
}
// ---- decide which stretches become bridges or tunnels
function classify(pieces){
  const st={bridge:0,tunnel:0,maxCut:0,maxFill:0};
  for(const p of pieces){const n=Math.max(2,Math.ceil(p.L/2)),f=[],wet=[];
    for(let k=0;k<=n;k++){const t=p.L*k/n,q=segPoint(p,t);const g=ground0(q[0],q[1]),w=waterAt0(q[0],q[1]);f.push(segY(p,t)-FORMATION_DROP-g);wet.push(w[1]>0&&w[0]>g-0.2);}
    const spans=[];const run=(want,ext,type,minL)=>{let k=0;while(k<=n){if(!want(k)){k++;continue;}let a=k,b=k;while(b<n&&want(b+1))b++;
        while(a>0&&ext(a-1))a--;while(b<n&&ext(b+1))b++;const t0=p.L*a/n,t1=p.L*b/n;if(t1-t0>=minL)spans.push(type==='b'?[t0,t1,type,+P.bridgeType||0]:[t0,t1,type]);k=b+1;}};
    // short pieces may hold short structures; they join up with the neighbours' structures
    if(P.trackBridges)run(k=>f[k]>P.bridgeMin||wet[k],k=>f[k]>2.2||wet[k],'b',6);
    if(P.trackTunnels)run(k=>f[k]<-P.tunnelMin,k=>f[k]<-Math.min(6.5,P.tunnelMin*0.75),'t',10);
    spans.sort((a,b)=>a[0]-b[0]);p.spans=spans.length?spans:undefined;
    for(let k=0;k<=n;k++){const sp=spanAt(p,p.L*k/n);if(sp)continue;st.maxCut=Math.max(st.maxCut,-f[k]);st.maxFill=Math.max(st.maxFill,f[k]);}
    for(const s of spans)st[s[2]==='b'?'bridge':'tunnel']+=s[1]-s[0];}
  return st;
}
function addPieces(start,pr,pend){
  let a;
  if(start.node)a=start.node;
  else{const p0=pr.pieces[0];a={id:Track.nextId++,x:p0.x0,z:p0.z0,y:segY(p0,0),h:wrapPi(p0.h0+Math.PI),g:-segGrade(p0,0)};Track.nodes.push(a);}
  let prev=a;
  pr.pieces.forEach((p,i)=>{const last=i===pr.pieces.length-1;let b;
    if(last&&pr.snap)b=pr.snap;
    else{const e=segPoint(p,p.L);b={id:Track.nextId++,x:e[0],z:e[1],y:segY(p,p.L),h:wrapPi(e[2]),g:segGrade(p,p.L)};Track.nodes.push(b);}
    const s={id:Track.nextId++,a:prev.id,b:b.id,x0:p.x0,z0:p.z0,h0:p.h0,k:p.k,L:p.L,y0:p.y0,y1:p.y1,g0:p.g0,g1:p.g1};if(pend)s.pend=true;
    if(p.prof)s.prof=p.prof;if(p.spans)s.spans=p.spans;Track.segs.push(s);prev=b;});
  return prev;
}
function removeSeg(id){Track.undo.push(JSON.stringify(Track.serialize()));const s=Track.segs.find(s=>s.id===id);Track.segs=Track.segs.filter(s=>s.id!==id);Track.sigs=Track.sigs.filter(g=>g.sid!==id);Track.stations=Track.stations.filter(g=>g.sid!==id);
  Track.nodes=Track.nodes.filter(n=>Track.links(n.id)>0);Log.info(`track piece removed (${s?s.L.toFixed(0):0} m)`);}
// neighbour piece at a node continues a tunnel? (then no portal there)
function tunnelContinues(seg,atEnd){const nid=atEnd?seg.b:seg.a;for(const o of Track.segs){if(o===seg)continue;
  if(o.a===nid){const sp=spanAt(o,0);if(sp&&sp[2]==='t')return true;}if(o.b===nid){const sp=spanAt(o,o.L);if(sp&&sp[2]==='t')return true;}}return false;}

// ---- earthworks (deterministic from the track list)
function carveTrack(T){
  const N=T.N,cs=T.cs,H=T.H;const mask=T.trackMask||(T.trackMask=new Uint8Array(N*N));mask.fill(0);const hole=T.hole||(T.hole=new Uint8Array(N*N));hole.fill(0);const tun=T.tunMask||(T.tunMask=new Uint8Array(N*N));tun.fill(0);
  // bed level by cell (formation height at the nearest track point, for cells near open track): the drawn-bed pass digs by height above it
  const bedY=T.bedY||(T.bedY=new Float32Array(N*N));bedY.fill(NaN);const bedD=T.bedD||(T.bedD=new Float32Array(N*N));bedD.fill(1e9);
  const hw=P.formationWidth/2+cs*0.6,emb=P.embSlope,cut=P.cutSlope,reach=70;
  for(const s of Track.segs){
    let x0=1e9,z0=1e9,x1=-1e9,z1=-1e9;for(let i=0;i<=40;i++){const p=segPoint(s,s.L*i/40);x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);z0=Math.min(z0,p[1]);z1=Math.max(z1,p[1]);}
    const i0=clamp(Math.floor((x0-reach)/cs),0,N-1),i1=clamp(Math.ceil((x1+reach)/cs),0,N-1),j0=clamp(Math.floor((z0-reach)/cs),0,N-1),j1=clamp(Math.ceil((z1+reach)/cs),0,N-1);
    const contA=tunnelContinues(s,false),contB=tunnelContinues(s,true);
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const x=(i+0.5)*cs,z=(j+0.5)*cs;let [t,d]=segNearest(s,x,z);
      if(t<-3||t>s.L+3)continue;const tc=clamp(t,0,s.L);if(t!==tc){const q=segPoint(s,tc);d=Math.hypot(x-q[0],z-q[1]);}
      if(d>hw+reach)continue;const k=j*N+i,sp=spanAt(s,tc);
      if(sp&&sp[2]==='t'){const oA=!(sp[0]<0.01&&contA),oB=!(sp[1]>s.L-0.01&&contB),e=Math.min(oA?tc-sp[0]:99,oB?sp[1]-tc:99);
        // open the ground just at the portal mouth (hidden under the portal block) so nothing bulges in front of the arch
        if(d<4.8&&e<3.5){hole[k]=1;H[k]=Math.min(H[k],segY(s,tc)-FORMATION_DROP);mask[k]=255;continue;}
        // behind the portal: enough earth over the tube and the portal block (a cut-and-cover mound where the hill is too thin)
        if(e>1.2&&d<20&&t===tc){const pt=e<9,yc=segY(s,tc)+(pt?TUN_PORTAL+0.6:TUN_CY+TUN_R+2.2)-Math.max(0,d-(pt?8.5:5))*0.75;
          if(yc>H[k]){const w=clamp((20-d)/(20-(pt?8.5:5)),0,1);H[k]+=Math.min(yc-H[k],14)*w*w*(3-2*w);}const tv=Math.round(255*clamp(1-(d-12)/8,0,1));if(tv>tun[k])tun[k]=tv;}
        continue;}
      if(sp&&sp[2]==='b'){if(d<hw+3&&mask[k]<25)mask[k]=25;continue;}
      const yF=segY(s,tc)-FORMATION_DROP;if(d<bedD[k]&&d<hw+16){bedD[k]=d;bedY[k]=yF;}
      if(d<=hw){H[k]=yF;mask[k]=255;}
      else{const dd=d-hw;H[k]=clamp(H[k],yF-dd*emb,yF+dd*cut);const m=Math.round(255*clamp(1-dd/3,0,1));if(m>mask[k])mask[k]=m;}}
  }
  for(const st of Track.stations||[]){const s=Track.segs.find(q=>q.id===st.sid);if(!s)continue;const sp=spanAt(s,st.t);if(sp)continue;const c=segPoint(s,st.t),yP=segY(s,st.t)-0.18,R2=Math.max(34,(st.len||44)/2+12);
    // a passenger station stands on a level terrace: the rectangle under the building, platform, forecourt and the footbridge landing
    // (model frame, see buildings/station.js) is levelled at the forecourt height; around it the ground falls or rises as cutting or
    // embankment slopes, as real stations are built into a hillside or on a bank of fill
    /* a farm's grain station: the ground from the track to behind the grain tower is levelled to the rail height (no gravel, grass stays) */
    if(st.farm){const f=st._f||1,h=c[2],tx=Math.cos(h)*f,tz=Math.sin(h)*f,nx=Math.sin(h)*f,nz=-Math.cos(h)*f,X1=(st.len||44)/2+6,Z1=KIT.GRAIN.track+9,RR=X1+30;
      const i0=clamp(Math.floor((c[0]-RR)/cs),0,N-1),i1=clamp(Math.ceil((c[0]+RR)/cs),0,N-1),j0=clamp(Math.floor((c[1]-RR)/cs),0,N-1),j1=clamp(Math.ceil((c[1]+RR)/cs),0,N-1);
      for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const x=(i+0.5)*cs,z=(j+0.5)*cs,rx=x-c[0],rz=z-c[1],mx=rx*tx+rz*tz,mz=rx*nx+rz*nz,k=j*N+i;if(mz<1.5)continue;
        const ex=Math.max(Math.abs(mx)-X1,0),ez=Math.max(1.5-mz,0,mz-Z1),e=Math.hypot(ex,ez);if(e>25)continue;if(e===0)H[k]=yP+0.1;else H[k]=clamp(H[k],yP+0.1-e*emb,yP+0.1+e*cut);}}
    if(!(st.mine||st.sawmill||st.workshop||st.farm)){const f=st._f||st.side||1,h=c[2],tx=Math.cos(h)*f,tz=Math.sin(h)*f,nx=Math.sin(h)*f,nz=-Math.cos(h)*f;
      const v=typeof Life!=='undefined'?Life.nearestVillage(c[0],c[1],420):null,town=!!(v&&(v.level|0)>=Life.LEVELS.length-1),span=town?[-24,23.5]:[-22,21],L2=(st.len||44)/2+5;
      const tw=!!st.twinOf,X0=tw?-L2:Math.min(span[0]-1.5,-L2),X1=tw?L2:Math.max(span[1]+1.5,L2),Z0=tw?-6:-11.5,Z1=tw?7.5:(town?13.4:12.4)+4.6,RR=Math.max(-X0,X1)+45;
      const i0=clamp(Math.floor((c[0]-RR)/cs),0,N-1),i1=clamp(Math.ceil((c[0]+RR)/cs),0,N-1),j0=clamp(Math.floor((c[1]-RR)/cs),0,N-1),j1=clamp(Math.ceil((c[1]+RR)/cs),0,N-1);
      for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const x=(i+0.5)*cs,z=(j+0.5)*cs,rx=x-c[0],rz=z-c[1],mx=-(rx*tx+rz*tz),mz=rx*nx+rz*nz,k=j*N+i;
        const ex=Math.max(X0-mx,0,mx-X1),ez=Math.max(Z0-mz,0,mz-Z1),e=Math.hypot(ex,ez);if(e>40)continue;
        if(mask[k]===255&&H[k]<yP&&e===0)continue;// the track bed itself
        if(e===0){H[k]=yP;mask[k]=255;}else{H[k]=clamp(H[k],yP-e*emb,yP+e*cut);const m=Math.round(255*clamp(1-e/5,0,1));if(m>mask[k])mask[k]=m;}}
      continue;}
    const i0=clamp(Math.floor((c[0]-R2)/cs),0,N-1),i1=clamp(Math.ceil((c[0]+R2)/cs),0,N-1),j0=clamp(Math.floor((c[1]-R2)/cs),0,N-1),j1=clamp(Math.ceil((c[1]+R2)/cs),0,N-1);
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const x=(i+0.5)*cs,z=(j+0.5)*cs,[t,d]=segNearest(s,x,z),k=j*N+i;if(d<=hw)continue;const along=Math.abs(t-st.t);
      const AL=Math.max(28,(st.len||44)/2+6);const w=clamp((AL-along)/5,0,1)*clamp(((st.mine?24:st.sawmill||st.workshop?21:st.farm?4:18)-d)/6,0,1);if(w<=0)continue;H[k]+=(yP-H[k])*w;const m=Math.round(255*w);if(m>mask[k])mask[k]=m;}}
}

// ---- meshes: ballast, sleepers, rails, stone viaducts, tunnel tubes and portals
// materials: 0 ballast, 1 sleeper, 2 rail, 3 masonry, 4 tunnel lining, 5 arch stones
function trackUnder(self,x,z,top,r){const all=new Set([...Track.segs,...(R.previewSegs||[])]);
  for(const o of all){if(o===self||(self.id!==undefined&&o.id===self.id))continue;let [t,d]=segNearest(o,x,z);const tc=clamp(t,0,o.L);if(t!==tc){const p=segPoint(o,tc);d=Math.hypot(x-p[0],z-p[1]);}
    if(d<r&&segY(o,tc)<top-0.5)return true;}return false;}
function buildTrackMesh(segs,xray){
  const V=[],I=[],XV=[],XI=[];let n=0,xn=0;const T=R.world;
  const quad=(a,b,c,d,nm,mat,uv,X)=>{const vv=X?XV:V,ii=X?XI:I,base=X?xn:n;
    for(const [p,u,v] of [[a,uv[0],uv[1]],[b,uv[2],uv[1]],[c,uv[2],uv[3]],[d,uv[0],uv[3]]])vv.push(p[0],p[1],p[2],nm[0],nm[1],nm[2],u,v,mat);
    ii.push(base,base+1,base+2,base,base+2,base+3);if(X)xn+=4;else n+=4;};
  const prof=[[-3.8,-2.66],[-1.8,-0.36],[1.8,-0.36],[3.8,-2.66]];// shoulders run on below the formation, so ground dug away beside the bed shows a gravel slope, not a gap
  const gr=(x,z)=>T?sampleH(T,x,z):0;
  const Wp=(q,la,dy)=>[q.x-Math.sin(q.h)*la,q.y+dy,q.z+Math.cos(q.h)*la];
  const lat=(q,e)=>[-Math.sin(q.h)*e,0,Math.cos(q.h)*e];
  for(const s of segs){
    const step=Math.min(1.5,Math.abs(s.k)>1e-7?0.05/Math.abs(s.k):1.5),cnt=Math.max(1,Math.ceil(s.L/step));
    const st=[];for(let i=0;i<=cnt;i++){const t=s.L*i/cnt,p=segPoint(s,t);st.push({t,x:p[0],z:p[1],h:p[2],y:segY(s,t)});}
    for(let i=0;i<cnt;i++){const a=st[i],b=st[i+1],sp=spanAt(s,(a.t+b.t)/2),inT=!!(sp&&sp[2]==='t'),X=xray&&inT;
      for(let f=0;f<3;f++){const l0=prof[f],l1=prof[f+1],dy=l1[1]-l0[1],dl=l1[0]-l0[0],nl=Math.hypot(dy,dl);
        const nm=f===1?[0,1,0]:[-Math.sin(a.h)*(-dy/nl),dl/nl,Math.cos(a.h)*(-dy/nl)];
        // the foot of each shoulder reaches down into the drawn ground where that lies lower (dug cuttings), so no edge ever floats
        const foot=(p,f0)=>{if(f0&&T&&T.Hr&&!sp){const g=R.drawnH(T,p[0],p[2])-0.25;if(g<p[1])p[1]=g;}return p;};
        quad(foot(Wp(a,l0[0],l0[1]),f===0),foot(Wp(a,l1[0],l1[1]),f===2),foot(Wp(b,l1[0],l1[1]),f===2),foot(Wp(b,l0[0],l0[1]),f===0),nm,0,[l0[0]*0.5,a.t*0.5,l1[0]*0.5,b.t*0.5]);}
      for(const side of [-1,1]){const c=side*(GAUGE/2+0.035);
        quad(Wp(a,c-0.035,0),Wp(a,c+0.035,0),Wp(b,c+0.035,0),Wp(b,c-0.035,0),[0,1,0],2,[0,a.t,1,b.t],X);
        for(const e of [-1,1])quad(Wp(a,c+e*0.035,0),Wp(a,c+e*0.035,-0.17),Wp(b,c+e*0.035,-0.17),Wp(b,c+e*0.035,0),lat(a,e),2,[0,a.t,0.3,b.t]);}
      if(inT){// tunnel tube: horseshoe lining facing inwards
        const seg=14;for(let k=0;k<seg;k++){const a0=-0.25+(Math.PI+0.5)*k/seg,a1=-0.25+(Math.PI+0.5)*(k+1)/seg,am=(a0+a1)/2;
          const P0=(q,an)=>Wp(q,Math.cos(an)*TUN_R,TUN_CY+Math.sin(an)*TUN_R);const nm=[Math.sin(a.h)*Math.cos(am),-Math.sin(am),-Math.cos(a.h)*Math.cos(am)];
          quad(P0(a,a0),P0(a,a1),P0(b,a1),P0(b,a0),nm,4,[k/seg*6,a.t*0.3,(k+1)/seg*6,b.t*0.3]);}
        for(const e of [-1,1]){const x=e*Math.cos(-0.25)*TUN_R,yt=TUN_CY+Math.sin(-0.25)*TUN_R;quad(Wp(a,x,yt),Wp(a,x,-1.45),Wp(b,x,-1.45),Wp(b,x,yt),lat(a,-e),4,[0,a.t*0.3,1,b.t*0.3]);}
        quad(Wp(a,-3.3,-1.42),Wp(a,3.3,-1.42),Wp(b,3.3,-1.42),Wp(b,-3.3,-1.42),[0,1,0],4,[0,a.t*0.3,1,b.t*0.3]);}// floor: no gaps beside the ballast
    }
    for(let t=0.31;t<s.L;t+=0.62){const p=segPoint(s,t),q={x:p[0],z:p[1],h:p[2],y:segY(s,t)};const fx=Math.cos(q.h)*0.12,fz=Math.sin(q.h)*0.12;
      const sp=spanAt(s,t),X=!!(xray&&sp&&sp[2]==='t');
      const A=(la,dy,f)=>{const w=Wp(q,la,dy);return[w[0]+fx*f,w[1],w[2]+fz*f];};const top=-0.17,bot=-0.36;
      quad(A(-1.3,top,-1),A(1.3,top,-1),A(1.3,top,1),A(-1.3,top,1),[0,1,0],1,[0,0,1,0.2],X);
      for(const f of [-1,1])quad(A(-1.3,top,f),A(1.3,top,f),A(1.3,bot,f),A(-1.3,bot,f),[Math.cos(q.h)*f,0,Math.sin(q.h)*f],1,[0,0,1,0.1]);}
    if(!s.spans)continue;
    const at=t=>{const p=segPoint(s,t);return{t,x:p[0],z:p[1],h:p[2],y:segY(s,t)};};
    for(const sp of s.spans){
      if(sp[2]==='b'){const bt=sp[3]|0,len=sp[1]-sp[0],mid=at((sp[0]+sp[1])/2),hMid=mid.y-gr(mid.x,mid.z);
        // building blocks: prisms from 4 bottom + 4 top corners (normals from the winding; the shader flips back faces)
        const nrm=(a,b,c)=>{const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];let x=uy*vz-uz*vy,y=uz*vx-ux*vz,z=ux*vy-uy*vx;const l=Math.hypot(x,y,z)||1;return[x/l,y/l,z/l];};
        const prism=(B,T,mat,caps)=>{for(let e=0;e<4;e++){const a=B[e],b=B[(e+1)%4],c=T[(e+1)%4],d=T[e],L=Math.hypot(b[0]-a[0],b[2]-a[2])*0.5;quad(a,b,c,d,nrm(a,b,c),mat,[0,a[1]*0.5,L,d[1]*0.5]);}
          if(caps){quad(T[0],T[1],T[2],T[3],nrm(T[0],T[1],T[2]),mat,[T[0][0]*0.5,T[0][2]*0.5,T[2][0]*0.5,T[2][2]*0.5]);quad(B[3],B[2],B[1],B[0],nrm(B[3],B[2],B[1]),mat,[0,0,1,1]);}};
        const fw=q=>[Math.cos(q.h),0,Math.sin(q.h)],lv=q=>[-Math.sin(q.h),0,Math.cos(q.h)];
        const box=(c,q,hl,hw,hh,mat)=>{const f=fw(q),l=lv(q),P=(a,b,d)=>[c[0]+f[0]*a*hl+l[0]*b*hw,c[1]+d*hh,c[2]+f[2]*a*hl+l[2]*b*hw];prism([P(-1,-1,-1),P(1,-1,-1),P(1,1,-1),P(-1,1,-1)],[P(-1,-1,1),P(1,-1,1),P(1,1,1),P(-1,1,1)],mat,true);};
        const bar=(A,B,r,mat)=>{let dx=B[0]-A[0],dy=B[1]-A[1],dz=B[2]-A[2];const dl=Math.hypot(dx,dy,dz)||1;dx/=dl;dy/=dl;dz/=dl;let sx=-dz,sz=dx,sl=Math.hypot(sx,sz);if(sl<0.2){sx=1;sz=0;sl=1;}sx/=sl;sz/=sl;
          const tx=-dy*sz,ty=dz*sx-dx*sz,tz=dy*sx,C=(P0,a,b)=>[P0[0]+(sx*a+tx*b)*r,P0[1]+ty*b*r,P0[2]+(sz*a+tz*b)*r];prism([C(A,-1,-1),C(A,1,-1),C(A,1,1),C(A,-1,1)],[C(B,-1,-1),C(B,1,-1),C(B,1,1),C(B,-1,1)],mat,true);};
        const along=(t0,t1,la,dy,hw,hh,mat,st)=>{const n=Math.max(1,Math.ceil((t1-t0)/(st||2)));for(let i=0;i<n;i++){const a=at(t0+(t1-t0)*i/n),b=at(t0+(t1-t0)*(i+1)/n);
          prism([Wp(a,la-hw,dy-hh),Wp(b,la-hw,dy-hh),Wp(b,la+hw,dy-hh),Wp(a,la+hw,dy-hh)],[Wp(a,la-hw,dy+hh),Wp(b,la-hw,dy+hh),Wp(b,la+hw,dy+hh),Wp(a,la+hw,dy+hh)],mat,i===0||i===n-1);}};
        // a pier: tapered (batter), capped, with a plinth; skipped where it would hit track below
        const pier=(q,top,hw,hl,mat,bat,capMat)=>{const g=gr(q.x,q.z)-1.5,h=top-g;if(h<1.5||trackUnder(s,q.x,q.z,top,hw+h*bat+3.4))return;const f=fw(q),l=lv(q),Pt=(a,b,y,k)=>[q.x+f[0]*a*hl*k+l[0]*b*hw*k,y,q.z+f[2]*a*hl*k+l[2]*b*hw*k],kb=1+h*bat/Math.max(hw,hl);
          prism([Pt(-1,-1,g,kb),Pt(1,-1,g,kb),Pt(1,1,g,kb),Pt(-1,1,g,kb)],[Pt(-1,-1,top,1),Pt(1,-1,top,1),Pt(1,1,top,1),Pt(-1,1,top,1)],mat,true);
          if(capMat!=null)box([q.x,top+0.15,q.z],q,hl+0.25,hw+0.25,0.15,capMat);const gy=gr(q.x,q.z);if(h>3)box([q.x,gy+0.3,q.z],q,hl*kb+0.35,hw*kb+0.35,0.5,mat);};
        const spanSplit=(target)=>{const n=Math.max(1,Math.round(len/target));return[n,len/n];};
        if(bt<=1){// --- masonry arch viaducts: stone (segmental arches) or brick (near-semicircular, closer spacing)
          const brick=bt===1,wm=brick?6:3,cm=3;const [nSp,spanL]=spanSplit(brick?clamp(hMid*0.65,7,15):clamp(hMid*0.9,9,22));const rise=Math.min(spanL*(brick?0.48:0.32),Math.max(0,hMid-3)*0.6);
          const under=t=>{const u=clamp((t-sp[0])/spanL-Math.floor(Math.min((t-sp[0])/spanL,nSp-1e-6)),0,1);return-1.6-rise*(2*u-1)*(2*u-1);};const m=Math.max(4,Math.ceil(len/1.2));
          for(let i=0;i<m;i++){const a=at(sp[0]+len*i/m),b=at(sp[0]+len*(i+1)/m),ua=under(a.t),ub=under(b.t);
            for(const e of [-1,1]){const o=e*2.75;quad(Wp(a,o,0.65),Wp(a,o,ua),Wp(b,o,ub),Wp(b,o,0.65),lat(a,e),wm,[a.t*0.5,0.65,b.t*0.5,ua]);
              quad(Wp(a,o-e*0.4,0.65),Wp(a,o-e*0.4,-0.3),Wp(b,o-e*0.4,-0.3),Wp(b,o-e*0.4,0.65),lat(a,-e),wm,[a.t*0.5,0.65,b.t*0.5,-0.3]);}
            quad(Wp(a,-2.75,ua),Wp(a,2.75,ua),Wp(b,2.75,ub),Wp(b,-2.75,ub),[0,-1,0],wm,[-1.4,a.t*0.5,1.4,b.t*0.5]);
            // arch ring: a band of dressed voussoirs following the intrados on both faces
            for(const e of [-1,1]){const o=e*2.76;quad(Wp(a,o,ua),Wp(a,o,ua+0.55),Wp(b,o,ub+0.55),Wp(b,o,ub),lat(a,e),cm,[a.t*0.9,ua*1.6,b.t*0.9,(ua+0.55)*1.6]);}}
          for(const e of [-1,1]){along(sp[0],sp[1],e*2.62,0.72,0.3,0.08,cm,3);along(sp[0],sp[1],e*2.86,-0.25,0.14,0.14,cm,3);}// coping on the parapets, string course below
          for(let k=0;k<=nSp;k++){const q=at(clamp(sp[0]+k*spanL,sp[0]+1.1,sp[1]-1.1)),top=q.y-1.6-rise;pier(q,top+0.02,2.9,1.05+(top-gr(q.x,q.z))*0.02,wm,brick?0.02:0.03,cm);}}
        else if(bt===2){// --- steel through truss (Warren with verticals), on stone piers
          const [nSp,spanL]=spanSplit(clamp(len,24,48)),H=5.4,sm=7;along(sp[0],sp[1],0,-0.78,2.65,0.16,sm,3);
          for(let k=0;k<nSp;k++){const t0=sp[0]+k*spanL+0.4,t1=t0+spanL-0.8,np=Math.max(3,Math.round((t1-t0)/4.8)),pl=(t1-t0)/np;
            for(const e of [-1,1]){const o=e*2.8,B=i=>Wp(at(t0+i*pl),o,-0.6),Tn=i=>Wp(at(t0+i*pl),o,H);along(t0,t1,o,-0.6,0.18,0.22,sm,pl);
              for(let i=0;i<np;i++){bar(B(i),Tn(i+0.5),0.11,sm);bar(Tn(i+0.5),B(i+1),0.11,sm);if(i>0)bar(B(i),Tn(i),0.07,sm);}
              for(let i=0;i<np-1;i++)bar(Tn(i+0.5),Tn(i+1.5),0.2,sm);}
            for(let i=0;i<np;i++){const q=at(t0+(i+0.5)*pl);bar(Wp(q,-2.8,H),Wp(q,2.8,H),0.08,sm);if(i<np-1){const q2=at(t0+(i+1.5)*pl);bar(Wp(q,-2.8,H),Wp(q2,2.8,H),0.05,sm);}}
            for(const tt of [t0,t1]){const q=at(tt);pier(q,q.y-0.95,3.3,1.3+(q.y-gr(q.x,q.z))*0.015,3,0.02,8);}}}
        else if(bt===3){// --- deck plate girders: two deep riveted I-girders with stiffeners, walkways and handrails, on stone piers
          const [nSp,spanL]=spanSplit(clamp(hMid*1.1,14,26)),D=Math.max(1.4,spanL/12),sm=7;
          for(let k=0;k<nSp;k++){const t0=sp[0]+k*spanL+0.25,t1=t0+spanL-0.5;
            for(const e of [-1,1]){const o=e*1.25;along(t0,t1,o,-0.4-D/2,0.06,D/2,sm,3);along(t0,t1,o,-0.43,0.28,0.04,sm,3);along(t0,t1,o,-0.38-D,0.28,0.04,sm,3);
              for(let u=t0+0.9;u<t1-0.5;u+=1.8){const q=at(u);box(Wp(q,o+e*0.1,-0.4-D/2),q,0.04,0.06,D/2-0.05,sm);box(Wp(q,o-e*0.1,-0.4-D/2),q,0.04,0.06,D/2-0.05,sm);}
              along(t0,t1,e*2.05,-0.44,0.55,0.035,sm,3);along(t0,t1,e*2.55,0.95,0.03,0.03,sm,3);along(t0,t1,e*2.55,0.5,0.025,0.025,sm,3);
              for(let u=t0;u<=t1;u+=2.4){const q=at(u);bar(Wp(q,e*2.55,-0.44),Wp(q,e*2.55,0.98),0.03,sm);bar(Wp(q,o,-0.4-D*0.9),Wp(q,e*2.5,-0.44),0.03,sm);}}
            for(let u=t0+1.5;u<t1;u+=3){const q=at(u);bar(Wp(q,-1.2,-0.5),Wp(q,1.2,-0.3-D),0.04,sm);bar(Wp(q,1.2,-0.5),Wp(q,-1.2,-0.3-D),0.04,sm);}
            for(const tt of [t0-0.25,t1+0.25]){const q=at(tt);pier(q,q.y-0.42-D-0.05,2.0,1.0+(q.y-gr(q.x,q.z))*0.02,3,0.025,8);}}}
        else if(bt===4){// --- concrete box girder on single columns with hammerhead caps, concrete parapets
          const [nSp,spanL]=spanSplit(clamp(len,20,40)),D=Math.max(1.6,spanL/16),cm=8,m=Math.max(2,Math.ceil(len/2));
          for(let i=0;i<m;i++){const a=at(sp[0]+len*i/m),b=at(sp[0]+len*(i+1)/m),top=-0.45,bot=top-D;
            const S=[[-3.1,top],[-3.1,top-0.25],[-1.7,bot],[1.7,bot],[3.1,top-0.25],[3.1,top]];for(let k=0;k<S.length-1;k++){const p0=S[k],p1=S[k+1];quad(Wp(a,p0[0],p0[1]),Wp(b,p0[0],p0[1]),Wp(b,p1[0],p1[1]),Wp(a,p1[0],p1[1]),nrm(Wp(a,p0[0],p0[1]),Wp(b,p0[0],p0[1]),Wp(b,p1[0],p1[1])),cm,[a.t*0.5,p0[1]*0.5,b.t*0.5,p1[1]*0.5]);}}
          for(const e of [-1,1])along(sp[0],sp[1],e*2.95,0.15,0.13,0.6,cm,3);
          for(let k=0;k<=nSp;k++){const q=at(clamp(sp[0]+k*spanL,sp[0]+1.5,sp[1]-1.5)),top=q.y-0.45-D-0.9;box([q.x,top+0.45,q.z],q,0.9,2.3,0.45,cm);pier(q,top,1.0,0.75,cm,0.012,null);}}
        else{// --- timber trestle: framed bents every 4.5 m (battered posts, caps, girts, X-bracing), stringers, guard timbers
          const wm=9;for(const e of [-1,1]){along(sp[0],sp[1],e*0.85,-0.75,0.17,0.24,wm,2.25);along(sp[0],sp[1],e*1.9,-0.3,0.12,0.12,wm,2.25);}
          const nb=Math.max(1,Math.round(len/4.5));for(let k=0;k<=nb;k++){const q=at(clamp(sp[0]+k*len/nb,sp[0]+0.6,sp[1]-0.6)),topY=q.y-1.0,g=gr(q.x,q.z)-0.5,H=topY-g;if(H<0.8||trackUnder(s,q.x,q.z,topY,4))continue;
            box([q.x,topY+0.1,q.z],q,0.2,2.2,0.13,wm);const pos=la=>{const sg=Math.sign(la),bl=la+sg*H*(Math.abs(la)>1?0.17:0.06);return[Wp(q,la,-1.0),Wp(q,bl,-1.0-H)];};
            const posts=[-1.55,-0.55,0.55,1.55].map(pos);for(const [A,B] of posts)bar(A,B,0.13,wm);
            const lvl=Math.max(1,Math.ceil(H/5.5));const at2=(P2,f)=>[P2[0][0]+(P2[1][0]-P2[0][0])*f,P2[0][1]+(P2[1][1]-P2[0][1])*f,P2[0][2]+(P2[1][2]-P2[0][2])*f];
            for(let v=1;v<=lvl;v++){const f0=(v-1)/lvl,f1=v/lvl;if(v<lvl||H>3)bar(at2(posts[0],f1*0.97),at2(posts[3],f1*0.97),0.09,wm);bar(at2(posts[0],f0+0.02),at2(posts[3],f1-0.02),0.06,wm);bar(at2(posts[3],f0+0.02),at2(posts[0],f1-0.02),0.06,wm);}}}
            }else{// tunnel portals where the tunnel meets daylight
        for(const end of [0,1]){if(end===0&&sp[0]<0.01&&tunnelContinues(s,false))continue;if(end===1&&sp[1]>s.L-0.01&&tunnelContinues(s,true))continue;
          const q=at(end===0?sp[0]+1.2:sp[1]-1.2),dir=end===0?-1:1;
          const bot=-1.6,fwd=[Math.cos(q.h)*dir,0,Math.sin(q.h)*dir];
          const topAt=x=>{const w=Wp(q,x,0);return Math.max(gr(w[0]-fwd[0]*2.5,w[2]-fwd[2]*2.5)+0.4-q.y,TUN_CY+TUN_R+1.3);};
          const xs=[-8,-6.5,-5,-TUN_R];for(let k=1;k<12;k++)xs.push(-TUN_R+2*TUN_R*k/12);xs.push(TUN_R,5,6.5,8);
          const bottomAt=x=>Math.abs(x)<TUN_R-1e-4?TUN_CY+Math.sqrt(TUN_R*TUN_R-x*x):bot;
          const off=(w,d)=>[w[0]-fwd[0]*d,w[1],w[2]-fwd[2]*d];
          for(let k=0;k<xs.length-1;k++){const xa=xs[k],xb=xs[k+1];
            const ta=topAt(xa),tb=topAt(xb);
            quad(Wp(q,xa,ta),Wp(q,xb,tb),Wp(q,xb,bottomAt(xb)),Wp(q,xa,bottomAt(xa)),fwd,3,[xa*0.5,ta*0.5,xb*0.5,bottomAt(xa)*0.5]);
            quad(Wp(q,xa,ta),Wp(q,xb,tb),off(Wp(q,xb,tb),4.5),off(Wp(q,xa,ta),4.5),[0,1,0],3,[xa*0.5,0,xb*0.5,3.5]);}
          for(const e of [-1,1]){const te=topAt(e*8);quad(Wp(q,e*8,te),Wp(q,e*8,bot),off(Wp(q,e*8,bot),4.5),off(Wp(q,e*8,te),4.5),lat(q,e),3,[0,te*0.5,3.5,bot*0.5]);}
          for(let k=0;k<12;k++){const a0=Math.PI*k/12,a1=Math.PI*(k+1)/12;const P2=(an,r)=>{const w=Wp(q,Math.cos(an)*r,TUN_CY+Math.sin(an)*r);return[w[0]+fwd[0]*0.06,w[1],w[2]+fwd[2]*0.06];};
            quad(P2(a0,TUN_R),P2(a1,TUN_R),P2(a1,TUN_R+0.75),P2(a0,TUN_R+0.75),fwd,5,[k,0,k+1,1]);}
        }}
    }
  }
  return{v:new Float32Array(V),i:new Uint32Array(I),xv:new Float32Array(XV),xi:new Uint32Array(XI)};
}
