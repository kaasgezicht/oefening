'use strict';
// ===== mine.js
// ===================================================================
// UNDERGROUND: THE STEAM MINING DRILL (4.63.0; the user, with a picture of a brass steam crawler with a huge spiral drill in a timbered
// mine: "When the mines are there should be a button to enter the mine. This should be a different area separate of above ground. Add
// this vehicle to the game and add a gameplay feature where you can use this to mine coal, iron ore etc." Answers: dig your own tunnels;
// the ore is sold and added to the mine's stock; the drill comes from the Store, simple (no fuel); the drill first).
//
// Near a mine you own a button "⛏ Enter the mine" appears. Underground is its own world (the surface keeps running): a block of rock
// 128 × 48 × 128 m under the mine, one density value a metre (Uint8, ≥128 rock), drawn as smooth walls (surface nets, 16 m chunks, remeshed
// where dug). The rock is layered (sandstone, shale, granite going down) and holds seams: three coal seams (one cuts the walls of the
// entrance gallery at head height), blobs of iron ore deeper down, and thin veins of the mine's own ore (gold, silver or diamonds) deepest;
// a coal mine has thicker coal, an iron mine more iron. The entrance gallery (timbered, rails, lanterns, daylight at its mouth) leads to a
// rock face. Driving the drill into rock spins it and cuts a horseshoe tunnel (4 m wide, 4.6 m high) ahead: level, or sloping up or down
// (⬆ ⬇, 10° steps to ±30°). Behind it the crew set up timber frames every 3 m and hang a lantern on every third. Every cubic metre of coal or
// ore cut is sold at once (money) and its load goes into the stock of the mine's station(s), where trains collect it as usual.
// Saved per mine: the dug rock (run-length coded), the frames and lanterns, where the drill stands, the totals.
// ===================================================================
const Mine={on:false,m:null,key:'',data:{},NX:128,NY:48,NZ:128,CH:16,D:null,MAT:null,chunks:null,dirty:new Set(),props:null,propList:[],lamps:[],
  dr:null,cam:{yaw:0,pitch:0.1,dist:11,mode:'chase'},inp:{steer:0,thr:0},parts:[],tot:{},seam:'',prog:null,pprog:null,M:null,ui:null,t:0,btnT:0,
  FLOOR:28,GX:64,PRICE:{coal:22,iron:34,gold:240,silver:150,diamond:420},YIELD:{1:0.35,2:0.35,3:0.12},
  // ---------------------------------------------------------------- the rock
  idx(i,j,k){return i+this.NX*(j+this.NY*k);},
  d(i,j,k){return i<0||j<0||k<0||i>=this.NX||j>=this.NY||k>=this.NZ?255:this.D[i+this.NX*(j+this.NY*k)];},
  /* trilinear density at a point (metres, lattice points at integers) */
  dens(x,y,z){const i=Math.floor(x),j=Math.floor(y),k=Math.floor(z),u=x-i,v=y-j,w=z-k,d=(a,b,c)=>this.d(a,b,c);
    const a=d(i,j,k)*(1-u)+d(i+1,j,k)*u,b=d(i,j+1,k)*(1-u)+d(i+1,j+1,k)*u,c=d(i,j,k+1)*(1-u)+d(i+1,j,k+1)*u,e=d(i,j+1,k+1)*(1-u)+d(i+1,j+1,k+1)*u;return(a*(1-v)+b*v)*(1-w)+(c*(1-v)+e*v)*w;},
  /* value noise, 3D, 0..1 */
  n3(x,y,z,s){const h=(a,b,c)=>{let q=Math.imul(a,374761393)^Math.imul(b,668265263)^Math.imul(c,2147483647)^Math.imul(s|0,1274126177);q=Math.imul(q^(q>>>13),1103515245);return((q^(q>>>16))>>>0)/4294967296;};
    const i=Math.floor(x),j=Math.floor(y),k=Math.floor(z),u=x-i,v=y-j,w=z-k,f=t=>t*t*(3-2*t),U=f(u),V=f(v),W=f(w),L=(a,b,t)=>a+(b-a)*t;
    return L(L(L(h(i,j,k),h(i+1,j,k),U),L(h(i,j+1,k),h(i+1,j+1,k),U),V),L(L(h(i,j,k+1),h(i+1,j,k+1),U),L(h(i,j+1,k+1),h(i+1,j+1,k+1),U),V),W);},
  /* the materials: 0 rock, 1 coal, 2 iron ore, 3 the mine's own ore */
  /* the seam heights per column are made at once (cheap); each cell's material only when it is first needed (cut or drawn): 255 = not yet */
  makeMat(seed,type){const {NX,NY,NZ}=this,cm=type==='coal'?1.6:1;const seams=[[this.FLOOR+2.2,0.9],[this.FLOOR-8,1.3],[this.FLOOR-17,1.7]];if(type==='coal')seams.push([this.FLOOR-12.5,1.1]);
    const sh=new Float32Array(NX*NZ*seams.length*2);for(let k=0;k<NZ;k++)for(let i=0;i<NX;i++)for(let q=0;q<seams.length;q++){const [c,t]=seams[q],o=((k*NX+i)*seams.length+q)*2;sh[o]=c+(this.n3(i/26,q*7.1,k/26,seed+q)-0.5)*5;sh[o+1]=t*cm*(0.7+0.6*this.n3(i/14,q*3.3+50,k/14,seed+9));}
    this.mseed=seed;this.mtype=type;this.sh=sh;this.ns=seams.length;return new Uint8Array(NX*NY*NZ).fill(255);},
  matAt(q){let m=this.MAT[q];if(m!==255)return m;const {NX,NY}=this,i=q%NX,j=((q/NX)|0)%NY,k=(q/(NX*NY))|0,seed=this.mseed,type=this.mtype,im=type==='iron'?0.08:0,sp=type==='coal'||type==='iron'?null:type;m=0;
    for(let s=0;s<this.ns;s++){const o=((k*NX+i)*this.ns+s)*2;if(Math.abs(j-this.sh[o])<this.sh[o+1]){m=1;break;}}
    if(!m&&j<this.FLOOR+3){const n=this.n3(i/8,j/8,k/8,seed+21);if(n>0.74-im-0.004*(this.FLOOR-j))m=2;}
    if(!m&&j<this.FLOOR-4){const n=this.n3(i/11,j/9,k/11,seed+33);if(Math.abs(n-0.5)<0.018+0.0012*(this.FLOOR-4-j)&&this.n3(i/30,j/30,k/30,seed+44)>0.42)m=sp?3:2;}
    this.MAT[q]=m;return m;},
  oreOf(mat){return mat===1?'coal':mat===2?'iron':mat===3?(this.m&&this.m.type)||'gold':null;},
  /* carve the tunnel profile (horseshoe: 2 m to each side, walls to 2.6 m, an arch of 2 m radius) as a slab 1.2 m deep across the
     direction f, its floor centre at p; returns the material counts of the rock taken out */
  carve(p,f,up){const r={},{NX,NY,NZ}=this,hw=2.0,wall=2.6,ar=2.0;let lat=[f[2],0,-f[0]];const ll=Math.hypot(lat[0],lat[2])||1;lat=[lat[0]/ll,0,lat[2]/ll];
    const i0=Math.max(2,Math.floor(p[0]-3.5)),i1=Math.min(NX-3,Math.ceil(p[0]+3.5)),j0=Math.max(3,Math.floor(p[1]-1.5)),j1=Math.min(NY-3,Math.ceil(p[1]+5.5)),k0=Math.max(2,Math.floor(p[2]-3.5)),k1=Math.min(NZ-3,Math.ceil(p[2]+3.5));
    for(let k=k0;k<=k1;k++)for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const dx=i-p[0],dy=j-p[1],dz=k-p[2],a=dx*f[0]+dy*f[1]+dz*f[2];if(Math.abs(a)>0.7)continue;
      const u=dx*lat[0]+dz*lat[2],w=dx*up[0]+dy*up[1]+dz*up[2];let e;if(w<=wall)e=Math.min(hw-Math.abs(u),w+0.1);else e=ar-Math.hypot(u,w-wall);e=Math.min(e,(0.7-Math.abs(a))*2);
      const nv=Math.max(0,Math.min(255,Math.round(128-e*120)));const q=i+NX*(j+NY*k),o=this.D[q];if(nv<o){if(o>=128&&nv<128){const m=this.matAt(q);r[m]=(r[m]||0)+1;}this.D[q]=nv;this.dirty.add(((i>>4)|((j>>4)<<4)|((k>>4)<<8)));
        // neighbours across a chunk edge share the cubes: mark those chunks too
        if((i&15)===0&&i>0)this.dirty.add((((i-1)>>4)|((j>>4)<<4)|((k>>4)<<8)));if((j&15)===0&&j>0)this.dirty.add(((i>>4)|(((j-1)>>4)<<4)|((k>>4)<<8)));if((k&15)===0&&k>0)this.dirty.add(((i>>4)|((j>>4)<<4)|(((k-1)>>4)<<8)));}}
    return r;},
  // ---------------------------------------------------------------- meshing (surface nets)
  ROCK(j,mat,i,k){if(mat===1)return[0.1,0.1,0.11];if(mat===2)return[0.5,0.26,0.16];if(mat===3){const o=ORE[this.m&&this.m.type]||ORE.gold;return o.glint;}
    const t=j/this.NY,v=0.88+0.24*this.n3(i/3,j/2,k/3,7);return t>0.62?[0.62*v,0.52*v,0.4*v]:t>0.38?[0.36*v,0.33*v,0.31*v]:[0.5*v,0.46*v,0.45*v];},
  meshChunk(cx,cy,cz){const C=this.CH,x0=cx*C,y0=cy*C,z0=cz*C,iso=128,vmap=new Map(),M={v:[],i:[],n:0},d=(i,j,k)=>this.d(i,j,k);
    const vert=(i,j,k)=>{const key=(i-x0+1)+(j-y0+1)*18+(k-z0+1)*324;if(vmap.has(key))return vmap.get(key);
      const c=[d(i,j,k),d(i+1,j,k),d(i,j+1,k),d(i+1,j+1,k),d(i,j,k+1),d(i+1,j,k+1),d(i,j+1,k+1),d(i+1,j+1,k+1)];let mn=255,mx=0;for(const q of c){if(q<mn)mn=q;if(q>mx)mx=q;}if(mn>=iso||mx<iso){vmap.set(key,-1);return -1;}
      const E=[[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]],P=n=>[n&1,(n>>1)&1,(n>>2)&1];let sx=0,sy=0,sz=0,cnt=0;
      for(const [a,b] of E){const va=c[a],vb=c[b];if((va>=iso)===(vb>=iso))continue;const t=(iso-va)/(vb-va),pa=P(a),pb=P(b);sx+=pa[0]+(pb[0]-pa[0])*t;sy+=pa[1]+(pb[1]-pa[1])*t;sz+=pa[2]+(pb[2]-pa[2])*t;cnt++;}
      const x=i+sx/cnt,y=j+sy/cnt,z=k+sz/cnt;const g=[(c[1]+c[3]+c[5]+c[7])-(c[0]+c[2]+c[4]+c[6]),(c[2]+c[3]+c[6]+c[7])-(c[0]+c[1]+c[4]+c[5]),(c[4]+c[5]+c[6]+c[7])-(c[0]+c[1]+c[2]+c[3])],gl2=Math.hypot(...g)||1;
      let best=0,bm=0;for(let q=0;q<8;q++)if(c[q]>bm){bm=c[q];best=q;}const pq=P(best),mi=Math.min(this.NX-1,i+pq[0]),mj=Math.min(this.NY-1,j+pq[1]),mk=Math.min(this.NZ-1,k+pq[2]),mat=this.matAt(mi+this.NX*(mj+this.NY*mk));
      const col=this.ROCK(mj,mat,mi,mk);M.v.push(x,y,z,-g[0]/gl2,-g[1]/gl2,-g[2]/gl2,col[0],col[1],col[2],0,0,0,1,30+mat);const id=M.n++;vmap.set(key,id);return id;};
    for(let k=z0;k<z0+C;k++)for(let j=y0;j<y0+C;j++)for(let i=x0;i<x0+C;i++){if(i>=this.NX||j>=this.NY||k>=this.NZ)continue;const s0=d(i,j,k)>=iso;
      for(let ax=0;ax<3;ax++){const s1=(ax===0?d(i+1,j,k):ax===1?d(i,j+1,k):d(i,j,k+1))>=iso;if(s0===s1)continue;
        const q=ax===0?[[i,j,k],[i,j-1,k],[i,j-1,k-1],[i,j,k-1]]:ax===1?[[i,j,k],[i-1,j,k],[i-1,j,k-1],[i,j,k-1]]:[[i,j,k],[i-1,j,k],[i-1,j-1,k],[i,j-1,k]];
        const vs=q.map(c=>c[0]<0||c[1]<0||c[2]<0?-1:vert(c[0],c[1],c[2]));if(vs.some(v=>v<0))continue;M.i.push(vs[0],vs[1],vs[2],vs[0],vs[2],vs[3]);}}
    return M;},
  remesh(all){const C=this.CH,nx=this.NX/C,ny=this.NY/C,nz=this.NZ/C;if(!this.chunks)this.chunks=new Map();
    const list=all?(()=>{const L=[];for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)L.push(x|(y<<4)|(z<<8));return L;})():[...this.dirty];this.dirty.clear();
    for(const key of list){const cx=key&15,cy=(key>>4)&15,cz=key>>8;if(all&&!this.hasAir(cx,cy,cz))continue;const M=this.meshChunk(cx,cy,cz),old=this.chunks.get(key);if(old)this.free(old);
      if(M.i.length)this.chunks.set(key,R.uploadVeh(M));else this.chunks.delete(key);}},
  /* any lattice point below the iso level in the chunk or its border (else the chunk is solid rock: nothing to draw) */
  hasAir(cx,cy,cz){const C=this.CH;for(let k=cz*C-1;k<=cz*C+C;k++)for(let j=cy*C-1;j<=cy*C+C;j++)for(let i=cx*C-1;i<=cx*C+C;i++)if(this.d(i,j,k)<128)return true;return false;},
  free(o){if(!o)return;gl.deleteVertexArray(o.vao);gl.deleteBuffer(o.vb);gl.deleteBuffer(o.ib);},
  // ---------------------------------------------------------------- props: timber frames, lanterns, rails, the mouth
  PM:null,
  propMeshes(){if(this.PM)return this.PM;const tb=[0.42,0.29,0.17],tbd=[0.3,0.2,0.12],ir=[0.2,0.19,0.18],box=(M,c,h,col,mat)=>{const [x,y,z]=c,[a,b,e]=h,Pp=(i,j,k)=>[x+i*a,y+j*b,z+k*e];
      for(const [n,q] of [[[1,0,0],[Pp(1,-1,-1),Pp(1,1,-1),Pp(1,1,1),Pp(1,-1,1)]],[[-1,0,0],[Pp(-1,-1,1),Pp(-1,1,1),Pp(-1,1,-1),Pp(-1,-1,-1)]],[[0,1,0],[Pp(-1,1,-1),Pp(-1,1,1),Pp(1,1,1),Pp(1,1,-1)]],[[0,-1,0],[Pp(-1,-1,1),Pp(-1,-1,-1),Pp(1,-1,-1),Pp(1,-1,1)]],[[0,0,1],[Pp(-1,-1,1),Pp(1,-1,1),Pp(1,1,1),Pp(-1,1,1)]],[[0,0,-1],[Pp(1,-1,-1),Pp(-1,-1,-1),Pp(-1,1,-1),Pp(1,1,-1)]]]){
        const b0=M.n;for(const p of q){M.v.push(p[0],p[1],p[2],n[0],n[1],n[2],col[0],col[1],col[2],0,0,0,1,mat);M.n++;}M.i.push(b0,b0+1,b0+2,b0,b0+2,b0+3);}};
    // a timber set across the tunnel (x along the tunnel, z across): two posts leaning in, a cap, wedges; local origin on the floor centre
    const set={v:[],i:[],n:0};for(const sd of [-1,1]){box(set,[0,1.45,sd*1.78],[0.13,1.45,0.13],tb,3);box(set,[0,0.06,sd*1.78],[0.2,0.06,0.2],tbd,3);}box(set,[0,2.98,0],[0.15,0.13,2.0],tb,3);for(const z of [-1.2,-0.4,0.4,1.2])box(set,[0,3.16,z],[0.42,0.05,0.16],tbd,3);
    const lamp={v:[],i:[],n:0};box(lamp,[0,2.72,0],[0.012,0.12,0.012],ir,10);box(lamp,[0,2.5,0],[0.09,0.04,0.09],ir,10);box(lamp,[0,2.36,0],[0.07,0.11,0.07],[1,0.72,0.3],4);box(lamp,[0,2.22,0],[0.09,0.03,0.09],ir,10);
    const rail={v:[],i:[],n:0};for(const sd of [-1,1])box(rail,[0,0.12,sd*0.5],[1.25,0.05,0.03],[0.36,0.33,0.3],10);box(rail,[0,0.04,0],[0.12,0.04,0.75],[0.3,0.22,0.15],3);box(rail,[0.62,0.04,0],[0.12,0.04,0.75],[0.3,0.22,0.15],3);
    const cart={v:[],i:[],n:0};box(cart,[0,0.75,0],[0.8,0.38,0.55],[0.32,0.24,0.16],3);box(cart,[0,0.36,0],[0.7,0.06,0.5],ir,10);for(const x of [-0.5,0.5])for(const sd of [-1,1])box(cart,[x,0.22,sd*0.5],[0.18,0.18,0.04],ir,10);box(cart,[0,1.08,0],[0.72,0.12,0.48],[0.08,0.08,0.09],3);
    const mouth={v:[],i:[],n:0};box(mouth,[0,2.3,0],[0.05,2.6,2.3],[1,0.98,0.92],5);
    return this.PM={set,lamp,rail,cart,mouth};},
  rebuildProps(){const PM=this.propMeshes(),O={v:[],i:[],n:0},put=(M,p,h)=>{const c=Math.cos(h),s=Math.sin(h),b=O.n;for(let q=0;q<M.n;q++){const o=q*14,x=M.v[o],y=M.v[o+1],z=M.v[o+2],nx=M.v[o+3],nz=M.v[o+5];
        O.v.push(p[0]+x*c-z*s,p[1]+y,p[2]+x*s+z*c,nx*c-nz*s,M.v[o+4],nx*s+nz*c,...M.v.slice(o+6,o+14));O.n++;}for(const ix of M.i)O.i.push(ix+b);};
    for(const q of this.propList){if(q.t==='set')put(PM.set,q.p,q.h);else if(q.t==='lamp')put(PM.lamp,q.p,q.h);else if(q.t==='rail')put(PM.rail,q.p,q.h);else if(q.t==='cart')put(PM.cart,q.p,q.h);else if(q.t==='mouth')put(PM.mouth,q.p,q.h);}
    if(this.props)this.free(this.props);this.props=O.n?R.uploadVeh(O):null;this.lamps=this.propList.filter(q=>q.t==='lamp').map(q=>[q.p[0],q.p[1]+2.36,q.p[2]]);},
  // ---------------------------------------------------------------- entering and leaving
  owned(){return(Life.mines||[]).filter(m=>m&&m.v&&m.v.mineOwned);},
  keyOf(m){return Math.round(m.x)+'_'+Math.round(m.z);},
  enter(m){if(!Fleet.unlocks.drill){UI.toast('You need the steam mining drill: it is in the Store');Store.open();return;}
    const t0=performance.now();this.m=m;this.key=this.keyOf(m);const seed=(Math.round(m.x)*73+Math.round(m.z)*31+(P.seed|0)*7)|0,{NX,NY,NZ}=this;
    if(this.chunks){for(const o of this.chunks.values())this.free(o);this.chunks.clear();}
    this.D=new Uint8Array(NX*NY*NZ).fill(255);this.MAT=this.makeMat(seed,m.type);const sv=this.data[this.key];this.propList=[];this.tot={};
    // the entrance gallery: from the mouth (z 1) 34 m in, rails, timber sets every 2.5 m, a lantern on every second, a cart
    const G=this.GX,F=this.FLOOR;for(let z=1;z<=35;z+=0.5)this.carve([G,F,z],[0,0,1],[0,1,0]);
    for(let z=3;z<=34;z+=2.5){this.propList.push({t:'set',p:[G,F,z],h:Math.PI/2});if(((z-3)/2.5)%2===0)this.propList.push({t:'lamp',p:[G,F,z],h:Math.PI/2});}
    for(let z=2.2;z<34;z+=2.5)this.propList.push({t:'rail',p:[G,F,z],h:Math.PI/2});this.propList.push({t:'cart',p:[G,F,9],h:Math.PI/2},{t:'mouth',p:[G,F,1.6],h:Math.PI/2});
    this.dr={x:G,y:F,z:29,h:Math.PI/2,pitch:0,v:0,spin:0,spinV:0,bp:0,lastSet:[G,F,34],drilling:0,steam:0};
    if(sv){try{this.unpack(sv.rle);}catch(e){Log.warn('mine: saved tunnels could not be read: '+e);}if(sv.props)this.propList=this.propList.concat(sv.props.map(q=>({t:q[0],p:[q[1],q[2],q[3]],h:q[4]})));if(sv.dr)Object.assign(this.dr,{x:sv.dr[0],y:sv.dr[1],z:sv.dr[2],h:sv.dr[3],pitch:sv.dr[4]||0,lastSet:[sv.dr[0],sv.dr[1],sv.dr[2]]});this.tot=sv.tot||{};}
    this.remesh(true);this.rebuildProps();this.initGL();this.on=true;this.cam.yaw=0;this.cam.pitch=0.1;this.cam.dist=11;this.ce=null;this.trail=[];for(let k=12;k>=0;k-=0.5)this.trail.push([this.dr.x-Math.cos(this.dr.h)*k,this.dr.y,this.dr.z-Math.sin(this.dr.h)*k]);this.parts=[];this.seam='';document.body.classList.add('inmine');this.showUI(true);
    if(RoadVeh.drv)RoadVeh.stopDriving();Log.info(`mine: entered ${m.v.name} (${m.type}) in ${(performance.now()-t0).toFixed(0)} ms, ${this.chunks.size} chunks`);
    UI.toast(`Underground at ${m.v.name}. Drive into the rock face to drill. ${(ORE[m.type]||{}).name||''} lies deep; coal seams show as black bands`);},
  exit(){if(!this.on)return;this.store();this.on=false;document.body.classList.remove('inmine');this.showUI(false);UI.toast(`Back up at ${this.m.v.name}`);},
  store(){if(!this.D)return;this.data[this.key]={rle:this.pack(),props:this.propList.filter(q=>q.dug).map(q=>[q.t,+q.p[0].toFixed(2),+q.p[1].toFixed(2),+q.p[2].toFixed(2),+q.h.toFixed(3)]),dr:[+this.dr.x.toFixed(2),+this.dr.y.toFixed(2),+this.dr.z.toFixed(2),+this.dr.h.toFixed(3),this.dr.pitch],tot:this.tot};},
  /* the rock as 16 levels, run-length coded: "level,run;..." (mostly long runs of solid rock) */
  pack(){const D=this.D,o=[];let cur=D[0]>>4,n=0;for(let q=0;q<D.length;q++){const v=D[q]>>4;if(v===cur)n++;else{o.push(cur.toString(16)+n.toString(36));cur=v;n=1;}}o.push(cur.toString(16)+n.toString(36));return o.join(',');},
  unpack(s){const D=this.D;let q=0;for(const t of s.split(',')){const v=parseInt(t[0],16),n=parseInt(t.slice(1),36),val=v>=15?255:v*16+8;for(let k=0;k<n&&q<D.length;k++,q++)D[q]=Math.min(D[q],val);}},
  serialize(){if(this.on)this.store();return{data:this.data};},
  load_(o){this.data=(o&&o.data)||{};if(this.on){this.on=false;document.body.classList.remove('inmine');this.showUI(false);}},
  // ---------------------------------------------------------------- the drill
  /* the floor under (x,z), searched down from y0+1.4 (the first point where the rock starts) */
  floorAt(x,z,y0){let air=false;for(let y=y0+1.4;y>y0-4;y-=0.1){const r=this.dens(x,y,z)>=128;if(!r)air=true;else if(air)return y+0.1;}return air?y0-4:null;},/* null: rock all the way (a wall) */
  /* rock in the way at distance a ahead along heading h (sampled over the machine's cross-section) */
  blocked(a,sg){const d=this.dr,f=[Math.cos(d.h),Math.sin(d.h)],l=[-f[1],f[0]];for(const u of [-1.3,-0.65,0,0.65,1.3])for(const w of [0.6,1.4,2.2,3.0,3.8]){if(Math.abs(u)>1.0&&w>3.6)continue;const x=d.x+f[0]*a*sg+l[0]*u,z=d.z+f[1]*a*sg+l[1]*u;if(this.dens(x,d.y+w+(sg>0?Math.tan(d.bp)*a:-Math.tan(d.bp)*a),z)>=150)return true;}return false;},
  step(dt){const d=this.dr,I=this.inp,DR=RVMesh.DRILL;
    /* steering: a crawler can turn on the spot, slowly (it slews in the tunnel); the corners must stay clear of rock (the drill at the front cuts its own way) */
    const dh=-I.steer*dt*(Math.abs(d.v)>0.15?Math.min(0.32,Math.abs(d.v)/7):0.1)*(d.v<-0.05?-1:1);/* about a 7 m radius on the move */if(dh&&this.clear(d.h+dh))d.h+=dh;
    const want=I.thr*2.4;let face=this.blocked(DR.tip-0.2,1),drill=I.thr>0.05&&face;d.drilling+=((drill?1:0)-d.drilling)*Math.min(1,dt*4);
    d.spinV+=((I.thr>0.05&&(drill||this.blocked(DR.tip+1.2,1))?14:Math.abs(d.v)>0.1?2:0)-d.spinV)*Math.min(1,dt*1.5);d.spin+=d.spinV*dt;
    let tv=want;if(drill)tv=Math.min(want,0.55);if(I.thr<-0.05&&this.blocked(4.5,-1))tv=0;
    d.v+=(tv-d.v)*Math.min(1,dt*2.5);
    if(drill){/* cut: a slab at the drill tip along the heading and the chosen slope */const f=[Math.cos(d.h)*Math.cos(d.pitch),Math.sin(d.pitch),Math.sin(d.h)*Math.cos(d.pitch)],up=[-Math.cos(d.h)*Math.sin(d.pitch),Math.cos(d.pitch),-Math.sin(d.h)*Math.sin(d.pitch)];
      const tip=DR.tip+0.3,p=[d.x+f[0]*tip,d.y+f[1]*tip+(d.pitch<0?Math.sin(d.pitch)*1.0:0),d.z+f[2]*tip];if(p[1]<4){p[1]=4;}if(p[1]>this.NY-7)p[1]=this.NY-7;
      const got=this.carve(p,f,up);this.gain(got,p);face=this.blocked(DR.tip-0.2,1);}
    if(face&&d.v>0)d.v=Math.min(d.v,0.0);
    const ds=d.v*dt;if(Math.abs(ds)>0){const nx=d.x+Math.cos(d.h)*ds,nz=d.z+Math.sin(d.h)*ds;if(nx>4&&nz>2&&nx<this.NX-4&&nz<this.NZ-4){d.x=nx;d.z=nz;}else d.v=0;}
    // the floor under the front and back of the tracks: the machine pitches with it and settles (falls if the floor drops away)
    const fx=Math.cos(d.h),fz=Math.sin(d.h),F0=this.floorAt(d.x,d.z,d.y),yc=F0==null?d.y:F0,yf0=this.floorAt(d.x+fx*1.3,d.z+fz*1.3,d.y),yb0=this.floorAt(d.x-fx*3.4,d.z-fz*3.4,d.y),yf=yf0==null||Math.abs(yf0-yc)>0.9?yc:yf0,yb=yb0==null||Math.abs(yb0-yc)>0.9?yc:yb0,ym=yc;
    d.y+=(ym-d.y)*Math.min(1,dt*(ym>d.y?6:3));d.bp+=(Math.max(-0.35,Math.min(0.35,Math.atan2(yf-yb,4.7)))-d.bp)*Math.min(1,dt*4);
    {const T=this.trail||(this.trail=[]),l=T[T.length-1];if(!l||Math.hypot(d.x-l[0],d.z-l[2],d.y-l[1])>0.5){T.push([d.x,d.y,d.z]);if(T.length>200)T.shift();}}
    // timber behind it in fresh tunnel: a set every 3 m, a lantern on every third
    const ls=d.lastSet,bx=d.x-fx*3.8,bz=d.z-fz*3.8;if(Math.hypot(bx-ls[0],bz-ls[2])>3&&this.freshTunnel(bx,d.y,bz)){d.nSet=(d.nSet|0)+1;const p=[bx,this.floorAt(bx,bz,d.y)??d.y,bz];this.propList.push({t:'set',p,h:d.h,dug:1});if(d.nSet%3===0)this.propList.push({t:'lamp',p,h:d.h,dug:1});this.rebuildProps();d.lastSet=[bx,p[1],bz];}
    else if(Math.hypot(bx-ls[0],bz-ls[2])>3&&!this.freshTunnel(bx,d.y,bz))d.lastSet=[bx,d.y,bz];
    if(this.dirty.size)this.remesh(false);
    // steam from the chimney, sparks and rock from the drill, dust
    d.steam+=dt*(1.2+Math.abs(d.v)*2+d.drilling*3);while(d.steam>1){d.steam-=1;this.puff('steam',this.wp([-1.95,4.35,0]),[(Math.random()-0.5)*0.4,1.4+Math.random(),(Math.random()-0.5)*0.4],2.6,0.5);}
    if(d.drilling>0.3){const tp=this.wp([DR.tip-0.1,DR.cy,0]);for(let k=0;k<3;k++){const a=Math.random()*6.283;this.puff('spark',[tp[0]+(Math.random()-0.5)*1.2,tp[1]+Math.sin(a)*0.8,tp[2]+(Math.random()-0.5)*1.2],[(Math.random()-0.5)*5-fx*2,Math.random()*4,(Math.random()-0.5)*5-fz*2],0.5,0.06);}
      if(Math.random()<dt*25)this.puff('rock',[tp[0],tp[1]-0.5,tp[2]],[(Math.random()-0.5)*2-fx*1.5,1+Math.random()*2,(Math.random()-0.5)*2-fz*1.5],1.4,0.14);if(Math.random()<dt*14)this.puff('dust',[tp[0],tp[1]+(Math.random()-0.5),tp[2]],[(Math.random()-0.5)-fx*0.8,0.3,(Math.random()-0.5)-fz*0.8],4,0.6);}},
  /* is this spot inside tunnel the drill cut (not the old gallery, which has its own frames) */
  /* the machine's corners clear of rock at heading h (rear corners and the sides of the drum; the drill face is free to cut) */
  clear(h){const d=this.dr,c=Math.cos(h),s=Math.sin(h);for(const [a,u] of [[-4.3,1.45],[-4.3,-1.45],[-2,1.5],[-2,-1.5],[1.8,1.45],[1.8,-1.45]])for(const w of [0.7,2.2]){const x=d.x+c*a-s*u,z=d.z+s*a+c*u;if(this.dens(x,d.y+w,z)>=170)return false;}return true;},
  freshTunnel(x,y,z){return!(Math.abs(x-this.GX)<3&&z<36);},
  wp(v){const d=this.dr,c=Math.cos(d.h),s=Math.sin(d.h),cp=Math.cos(d.bp),sp=Math.sin(d.bp),X=[c*cp,sp,s*cp],Y=[-c*sp,cp,-s*sp],Z=[-s,0,c];return[d.x+X[0]*v[0]+Y[0]*v[1]+Z[0]*v[2],d.y+X[1]*v[0]+Y[1]*v[1]+Z[1]*v[2],d.z+X[2]*v[0]+Y[2]*v[1]+Z[2]*v[2]];},
  /* what was cut: coal and ore are sold at once and loaded into the stock of the mine's station(s) */
  acc:{},
  gain(got,p){for(const k in got){const mat=+k;if(!mat)continue;const t=this.oreOf(mat);this.acc[t]=(this.acc[t]||0)+got[k]*this.YIELD[mat];
      if(this.seam!==t){this.seam=t;this.seamT=App.time;UI.toast(`${ORE[t].icon} You struck ${t==='coal'?'a coal seam':t==='iron'?'iron ore':'a vein of '+ORE[t].name.toLowerCase()}!`);}}
    if(!Object.keys(got).some(k=>+k>0)&&this.seam&&App.time-(this.seamT||0)>3)this.seam='';
    for(const t in this.acc){const n=Math.floor(this.acc[t]);if(n<1)continue;this.acc[t]-=n;this.tot[t]=(this.tot[t]||0)+n;const pay=n*(this.PRICE[t]||40);
      const sts=Track.stations.filter(st=>st.mine&&Crane.ind('mine',st.mine)===this.m);if(sts.length){const S=Goods.get('st:'+sts[0].id);S[t]=Math.min(150,(S[t]||0)+n);}else this.m.dug=(this.m.dug||0)+n;
      if(Money.on())Money.earn(pay,`${this.m.v.name} mine: ${n} ${ORE[t].icon}`,this.m.x,0,this.m.z);this.tot.eur=(this.tot.eur||0)+pay;}},
  puff(type,p,v,life,size){if(this.parts.length>900)this.parts.shift();this.parts.push({type,p:p.slice(),v:v.slice(),t:0,life,size});},
  stepParts(dt){for(const q of this.parts){q.t+=dt;if(q.type==='spark'){q.v[1]-=9.8*dt;}else if(q.type==='rock'){q.v[1]-=9.8*dt;{const fy=this.floorAt(q.p[0],q.p[2],q.p[1]+0.5);if(fy!=null&&q.p[1]<fy){q.p[1]=fy;q.v=[0,0,0];}}}else if(q.type==='steam'){q.v[0]*=1-dt*0.5;q.v[2]*=1-dt*0.5;q.v[1]*=1-dt*0.3;}else{q.v[0]*=1-dt;q.v[2]*=1-dt;}
      for(let a=0;a<3;a++)q.p[a]+=q.v[a]*dt;if(q.type==='steam'&&this.dens(q.p[0],q.p[1]+0.4,q.p[2])>=128)q.v[1]=Math.min(q.v[1],0);}
    this.parts=this.parts.filter(q=>q.t<q.life);},
  // ---------------------------------------------------------------- per frame
  update(dt){if(!this.on)return;dt=Math.min(dt,0.05);this.t+=dt;this.pad();const k=Cam.keys||{};
    if(k.w||k.arrowup||k.s||k.arrowdown||k.a||k.arrowleft||k.d||k.arrowright){this.inp.thr=(k.w||k.arrowup?1:0)-(k.s||k.arrowdown?1:0);this.inp.steer=(k.d||k.arrowright?1:0)-(k.a||k.arrowleft?1:0);this.keyed=true;}else if(this.keyed&&!this.touch){this.inp.thr=0;this.inp.steer=0;this.keyed=false;}
    this.step(dt);this.stepParts(dt);this.hud();},
  pad(){const g=typeof Pad!=='undefined'?Pad.vp:null;if(!g)return;const bt=i=>{const x=g.buttons[i];return x?(typeof x==='object'?(x.value||(x.pressed?1:0)):+x):0;},ax=v=>Math.abs(v)<0.15?0:v;
    const s=ax(g.axes[0]||0),f=bt(7)-bt(6);if(s||Math.abs(f)>0.05){this.inp.steer=s;this.inp.thr=f;this.padAct=true;}else if(this.padAct){this.inp.steer=this.inp.thr=0;this.padAct=false;}
    const prev=this.padPrev||[];const ed=i=>bt(i)>0.5&&!prev[i];if(ed(4))this.tilt(1);if(ed(5))this.tilt(-1);if(ed(1))this.cam.mode=this.cam.mode==='chase'?'cab':'chase';if(ed(3))this.exit();this.padPrev=g.buttons.map((x,i)=>bt(i)>0.5);},
  tilt(s){const d=this.dr;d.pitch=Math.max(-0.52,Math.min(0.52,Math.round((d.pitch+s*0.1745)/0.1745)*0.1745));if(Math.abs(d.pitch)<0.01)d.pitch=0;this.hud(true);},
  // ---------------------------------------------------------------- drawing
  initGL(){if(this.prog)return;const VS=`#version 300 es
precision highp float;layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNrm;layout(location=2) in vec3 aCol;layout(location=4) in float aMat;
uniform mat4 uVP;uniform mat4 uModel;uniform float uSpin;out vec3 vW;out vec3 vN;out vec3 vC;flat out float vMat;
void main(){vec4 w=uModel*vec4(aPos,1.);vW=w.xyz;vN=mat3(uModel)*aNrm;vC=aCol;vMat=aMat;gl_Position=uVP*w;}`;
    const FS=`#version 300 es
precision highp float;in vec3 vW;in vec3 vN;in vec3 vC;flat in float vMat;out vec4 o;
uniform vec3 uCam;uniform vec4 uLP[16];uniform vec4 uLC[16];uniform int uNL;uniform float uT;uniform vec3 uHP;uniform vec3 uHD;
float h3(vec3 p){p=fract(p*.3183+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
void main(){vec3 N=normalize(vN);vec3 V=normalize(uCam-vW);if(dot(N,V)<0.)N=-N;int m=int(vMat+.5);vec3 c=vC*vC;float spec=.04,rough=32.;vec3 em=vec3(0);
  if(m>=30){float k=n3(vW*2.1)*.55+n3(vW*6.3)*.3+n3(vW*.6)*.15;c*=.6+.8*k;N=normalize(N+(vec3(n3(vW*4.),n3(vW*4.+7.),n3(vW*4.+13.))-.5)*.5);
    if(m==31){spec=.35;rough=60.;c*=.9+.4*step(.86,h3(floor(vW*9.)));}
    else if(m==32){spec=.2;c=mix(c,c*vec3(1.3,.8,.6),n3(vW*3.)*.6);}
    else if(m==33){float g=step(.9,h3(floor(vW*11.)));spec=.6;rough=90.;c=mix(c*.45,c*1.6,g);em=c*g*.06;}}
  else if(m==10){spec=.55;rough=50.;}else if(m==11){spec=.3;rough=30.;}else if(m==13){c=vec3(.03,.035,.035);spec=.8;rough=120.;}
  else if(m==4){em=c*3.2*(.92+.08*sin(uT*13.+vW.x*3.));}else if(m==5){em=vec3(1.,.96,.88)*2.2;c=vec3(0);}
  vec3 col=c*vec3(.022,.02,.019);
  for(int i=0;i<16;i++){if(i>=uNL)break;vec3 L=uLP[i].xyz-vW;float d=length(L);L/=max(d,1e-3);float r=uLP[i].w,att=1./(1.+d*d/(r*r*.03))*smoothstep(r,r*.4,d);
    float df=max(dot(N,L),0.)*.85+.15*max(dot(N,L)+.5,0.);vec3 H=normalize(L+V);float sp=pow(max(dot(N,H),0.),rough)*spec*4.;col+=uLC[i].rgb*uLC[i].w*att*(c*df+sp*vec3(1.,.9,.75)*step(0.,dot(N,L)));}
  /* the drill's headlamp: a cone ahead */
  {vec3 L=uHP-vW;float d=length(L);L/=d;float cone=smoothstep(.82,.95,dot(-L,uHD));col+=vec3(1.,.82,.55)*1.3*cone/(1.+d*d*.02)*(c*max(dot(N,L),0.));}
  col+=em;float fog=1.-exp(-length(uCam-vW)*.022);col=mix(col,vec3(.012,.009,.006),fog*.85);col=1.-exp(-col*1.25);o=vec4(sqrt(col),1.);}`;
    this.prog=makeProgram('mine',VS,FS);
    this.pprog=makeProgram('mine-parts',`#version 300 es
precision highp float;layout(location=0) in vec3 aP;layout(location=1) in vec4 aC;layout(location=2) in float aS;uniform mat4 uVP;uniform float uPx;out vec4 vC;
void main(){vec4 p=uVP*vec4(aP,1.);gl_Position=p;gl_PointSize=clamp(aS*uPx/max(p.w,.1),1.,96.);vC=aC;}`,`#version 300 es
precision highp float;in vec4 vC;out vec4 o;void main(){vec2 q=gl_PointCoord*2.-1.;float r=dot(q,q);if(r>1.)discard;float a=(1.-r);o=vec4(vC.rgb*a,vC.a*a);}`);
    this.pbuf=gl.createBuffer();this.pvao=gl.createVertexArray();gl.bindVertexArray(this.pvao);gl.bindBuffer(gl.ARRAY_BUFFER,this.pbuf);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,32,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,4,gl.FLOAT,false,32,12);gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,1,gl.FLOAT,false,32,28);gl.bindVertexArray(null);
    this.M={body:R.uploadVeh(RVMesh.minedrill()),bit:R.uploadVeh(RVMesh.drillbit())};},
  camera(){const d=this.dr,c=this.cam,tgt=[d.x+Math.cos(d.h)*0.8,d.y+2.6,d.z+Math.sin(d.h)*0.8];let eye,look;
    if(this.freeCam)return{eye:this.freeCam[0],look:this.freeCam[1]};/* (tests) */if(c.mode==='cab'){eye=this.wp([-0.2,3.2,0.38]);look=this.wp([7,1.6,0.1]);return{eye,look};}
    if(Math.abs(c.yaw)<0.05&&c.pitch<0.2&&this.trail&&this.trail.length>2){/* along the path it came: always inside the tunnel */const T=this.trail;let acc=0,q=T[T.length-1],pt=null;
      for(let i=T.length-2;i>=0;i--){acc+=Math.hypot(T[i][0]-q[0],T[i][2]-q[2]);q=T[i];if(acc>=c.dist){pt=q;break;}}if(!pt)pt=T[0];
      const bx=d.x-Math.cos(d.h)*c.dist,bz=d.z-Math.sin(d.h)*c.dist,straight=this.dens(bx,d.y+2.5,bz)<100&&this.dens((bx+d.x)/2,d.y+2.5,(bz+d.z)/2)<100;
      const e=straight?[bx,d.y+2.55,bz]:[pt[0],pt[1]+2.55,pt[2]];if(!this.ce)this.ce=e.slice();else for(let a=0;a<3;a++)this.ce[a]+=(e[a]-this.ce[a])*0.12;return{eye:this.ce,look:tgt};}
    const yaw=d.h+Math.PI+c.yaw,cp=Math.cos(c.pitch),want=[tgt[0]+Math.cos(yaw)*cp*c.dist,tgt[1]+Math.sin(c.pitch)*c.dist,tgt[2]+Math.sin(yaw)*cp*c.dist];
    // pull in in front of rock between the machine and the camera
    let t=1;for(let s=0.08;s<=1;s+=0.04){const p=[tgt[0]+(want[0]-tgt[0])*s,tgt[1]+(want[1]-tgt[1])*s,tgt[2]+(want[2]-tgt[2])*s];if(this.dens(p[0],p[1],p[2])>=100){t=Math.max(0.05,s-0.06);break;}}
    eye=[tgt[0]+(want[0]-tgt[0])*t,tgt[1]+(want[1]-tgt[1])*t,tgt[2]+(want[2]-tgt[2])*t];eye[1]=Math.min(eye[1],d.y+2.65+Math.max(0,c.pitch-0.1)*6);/* under the timber caps unless looked down from above */if(!this.ce)this.ce=eye;else for(let a=0;a<3;a++)this.ce[a]+=(eye[a]-this.ce[a])*0.25;return{eye:this.ce,look:tgt};},
  mat(X,Y,Z,o){return new Float32Array([X[0],X[1],X[2],0,Y[0],Y[1],Y[2],0,Z[0],Z[1],Z[2],0,o[0],o[1],o[2],1]);},
  frame(){const cv=gl.canvas,W=cv.width,H=cv.height,p=this.prog,d=this.dr,DR=RVMesh.DRILL;const {eye,look}=this.camera();
    const V=M4.lookAt(eye,look,[0,1,0]),Pm=M4.persp(this.cam.mode==='cab'?1.2:0.95,W/H,0.08,220),VP=M4.mul(Pm,V);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,W,H);gl.clearColor(0.012,0.009,0.006,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);gl.useProgram(p.p);gl.uniformMatrix4fv(p.u('uVP'),false,VP);gl.uniform3fv(p.u('uCam'),eye);gl.uniform1f(p.u('uT'),this.t);
    // lights: the drill's lanterns, then the gallery's and the frames' lanterns nearest the camera, the daylight at the mouth
    const LP=[],LC=[],add=(q,r,c,i)=>{LP.push(q[0],q[1],q[2],r);LC.push(c[0],c[1],c[2],i);};const fl=k=>0.85+0.15*Math.sin(this.t*(7+k)+k*3)*Math.sin(this.t*(11.3+k*0.7));
    for(const [v,k] of [[[-3.4,2.95,-0.85],0],[[-3.4,2.95,0.85],1],[[1.35,3.25,0.85],2],[[1.35,3.25,-0.85],3],[[-0.3,4.0,0],4]])add(this.wp(v),13,[1,0.68,0.32],0.55*fl(k));
    const ls=this.lamps.map(q=>[q,Math.hypot(q[0]-eye[0],q[1]-eye[1],q[2]-eye[2])]).sort((a,b)=>a[1]-b[1]).slice(0,9);ls.forEach(([q],k)=>add(q,14,[1,0.7,0.36],0.7*fl(k+5)));
    add([this.GX,this.FLOOR+2.4,0.5],30,[0.75,0.82,1],1.4);
    gl.uniform4fv(p.u('uLP'),new Float32Array(LP.concat(new Array(64-LP.length).fill(0))));gl.uniform4fv(p.u('uLC'),new Float32Array(LC.concat(new Array(64-LC.length).fill(0))));gl.uniform1i(p.u('uNL'),LP.length/4);
    gl.uniform3fv(p.u('uHP'),this.wp([DR.face,DR.cy+1.3,0]));gl.uniform3fv(p.u('uHD'),[Math.cos(d.h)*Math.cos(d.bp),Math.sin(d.bp)-0.15,Math.sin(d.h)*Math.cos(d.bp)]);
    const draw=(o,m)=>{if(!o)return;gl.uniformMatrix4fv(p.u('uModel'),false,m);gl.bindVertexArray(o.vao);gl.drawElements(gl.TRIANGLES,o.count,gl.UNSIGNED_INT,0);};
    const I=M4.ident();for(const o of this.chunks.values())draw(o,I);draw(this.props,I);
    const c=Math.cos(d.h),s=Math.sin(d.h),cp=Math.cos(d.bp),sp=Math.sin(d.bp),X=[c*cp,sp,s*cp],Y=[-c*sp,cp,-s*sp],Z=[-s,0,c];draw(this.M.body,this.mat(X,Y,Z,[d.x,d.y,d.z]));
    const ca=Math.cos(d.spin),sa=Math.sin(d.spin),Y2=[Y[0]*ca+Z[0]*sa,Y[1]*ca+Z[1]*sa,Y[2]*ca+Z[2]*sa],Z2=[Z[0]*ca-Y[0]*sa,Z[1]*ca-Y[1]*sa,Z[2]*ca-Y[2]*sa];draw(this.M.bit,this.mat(X,Y2,Z2,this.wp([DR.face+0.25,DR.cy,0])));
    // particles
    if(this.parts.length){const A=new Float32Array(this.parts.length*8);this.parts.forEach((q,i)=>{const u=q.t/q.life,o=i*8;A[o]=q.p[0];A[o+1]=q.p[1];A[o+2]=q.p[2];
        if(q.type==='spark'){A[o+3]=1.6;A[o+4]=0.8*(1-u)+0.3;A[o+5]=0.25*(1-u);A[o+6]=0;A[o+7]=q.size;}else if(q.type==='steam'){const a=0.32*(1-u)*Math.min(1,q.t*3);A[o+3]=0.55*a;A[o+4]=0.52*a;A[o+5]=0.48*a;A[o+6]=a;A[o+7]=q.size*(1+u*4);}
        else if(q.type==='dust'){const a=0.3*(1-u);A[o+3]=0.22*a;A[o+4]=0.17*a;A[o+5]=0.12*a;A[o+6]=a;A[o+7]=q.size*(1+u*3);}else{A[o+3]=0.05;A[o+4]=0.045;A[o+5]=0.04;A[o+6]=1;A[o+7]=q.size;}});
      const pp=this.pprog;gl.useProgram(pp.p);gl.uniformMatrix4fv(pp.u('uVP'),false,VP);gl.uniform1f(pp.u('uPx'),H/(2*Math.tan(0.475)));gl.bindBuffer(gl.ARRAY_BUFFER,this.pbuf);gl.bufferData(gl.ARRAY_BUFFER,A,gl.DYNAMIC_DRAW);
      gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.bindVertexArray(this.pvao);gl.drawArrays(gl.POINTS,0,this.parts.length);gl.depthMask(true);gl.disable(gl.BLEND);}
    gl.bindVertexArray(null);gl.useProgram(null);},
  // ---------------------------------------------------------------- the interface
  showUI(on){let el=this.ui;if(!el&&on){el=this.ui=document.createElement('div');el.id='mineUI';el.innerHTML=`<div id="mnTop"><button data-a="exit">⬆ Leave the mine</button><button data-a="cam">📷 Camera</button><button data-a="up">⬆ Slope up</button><button data-a="dn">⬇ Slope down</button></div><div id="mnHud"></div><div id="mnStickWrap"><div id="mnStick"><div id="mnKnob"></div></div></div>`;document.body.appendChild(el);
      el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const a=b.dataset.a;if(a==='exit')this.exit();else if(a==='cam')this.cam.mode=this.cam.mode==='chase'?'cab':'chase';else if(a==='up')this.tilt(1);else if(a==='dn')this.tilt(-1);});
      const st=el.querySelector('#mnStick'),kn=el.querySelector('#mnKnob');let id=null;const mv=ev=>{const r=st.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,Rr=r.width/2-14;let dx=(ev.clientX-cx)/Rr,dy=(ev.clientY-cy)/Rr;const l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l;}this.inp.steer=dx;this.inp.thr=Math.max(-1,Math.min(1,-dy*1.3));this.touch=true;kn.style.transform=`translate(${dx*Rr}px,${dy*Rr}px)`;};
      st.onpointerdown=ev=>{ev.preventDefault();ev.stopPropagation();id=ev.pointerId;st.setPointerCapture(id);mv(ev);};st.onpointermove=ev=>{if(ev.pointerId===id)mv(ev);};st.onpointerup=st.onpointercancel=ev=>{if(ev.pointerId!==id)return;id=null;this.inp.steer=this.inp.thr=0;this.touch=false;kn.style.transform='';};
      /* dragging anywhere else turns the camera round the machine; the wheel or a pinch zooms */
      const P2=new Map();let pd=0;el.addEventListener('pointerdown',ev=>{if(ev.target.closest('button,#mnStick'))return;P2.set(ev.pointerId,[ev.clientX,ev.clientY]);el.setPointerCapture(ev.pointerId);if(P2.size===2){const [a,b]=[...P2.values()];pd=Math.hypot(a[0]-b[0],a[1]-b[1]);}});
      el.addEventListener('pointermove',ev=>{const q=P2.get(ev.pointerId);if(!q)return;if(P2.size===1){this.cam.yaw-=(ev.clientX-q[0])*0.008;this.cam.pitch=Math.max(-0.1,Math.min(1.3,this.cam.pitch+(ev.clientY-q[1])*0.006));}P2.set(ev.pointerId,[ev.clientX,ev.clientY]);
        if(P2.size===2){const [a,b]=[...P2.values()],nd=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pd>0)this.cam.dist=Math.max(6,Math.min(40,this.cam.dist*pd/nd));pd=nd;}});
      const end=ev=>{P2.delete(ev.pointerId);if(P2.size<2)pd=0;};el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
      el.addEventListener('wheel',ev=>{this.cam.dist=Math.max(6,Math.min(40,this.cam.dist*Math.exp(ev.deltaY*0.001)));ev.preventDefault();},{passive:false});
      addEventListener('keydown',ev=>{if(!this.on)return;const k=ev.key.toLowerCase();if(k==='escape')this.exit();else if(k==='r')this.tilt(1);else if(k==='f')this.tilt(-1);else if(k==='c')this.cam.mode=this.cam.mode==='chase'?'cab':'chase';});}
    if(el)el.hidden=!on;},
  hud(force){const el=$('#mnHud');if(!el||!this.dr)return;const t=performance.now();if(!force&&this._hT>t-150)return;this._hT=t;const d=this.dr,deg=Math.round(d.pitch*57.3),T=this.tot,parts=['coal','iron',this.m.type].filter((q,i,a)=>a.indexOf(q)===i&&T[q]).map(q=>`${ORE[q].icon} ${T[q]}`);
    el.innerHTML=`<b>${esc(this.m.v.name)} mine</b> · depth ${Math.max(0,Math.round(this.NY-2-d.y))} m · ${Math.round(Math.abs(d.v)*3.6)} km/h · slope ${deg>0?'+':''}${deg}°${d.drilling>0.3?' · <span class="mn-dr">drilling'+(this.seam?' '+ORE[this.seam].name.toLowerCase():' rock')+'</span>':''}<br>${parts.length?'Dug: '+parts.join(' · ')+' · ':''}${T.eur?'earned € '+(Money.fmt?Money.fmt(Math.round(T.eur)):Math.round(T.eur)):'cut coal and ore to earn'}`;},
  /* the entrance button: near a mine you own (camera within 600 m and not too high) */
  tick(dt){if(this.on)return;this.btnT-=dt;if(this.btnT>0)return;this.btnT=0.5;let b=$('#mineBtn');const c=Cam.target||[0,0,0];let best=null,bd=650;
    if(App.T&&!MapView.on&&!Plane.on&&Cam.dist<1400)for(const m of this.owned()){const dd=Math.hypot(m.x-c[0],m.z-c[2]);if(dd<bd){bd=dd;best=m;}}
    if(!best){if(b)b.hidden=true;return;}if(!b){b=document.createElement('button');b.id='mineBtn';document.body.appendChild(b);b.onclick=()=>{if(this.near)this.enter(this.near);};}this.near=best;
    const tx=`⛏ Enter the ${best.v.name} mine`;if(b.textContent!==tx)b.textContent=tx;b.hidden=false;}};
