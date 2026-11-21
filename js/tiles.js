'use strict';
// ===== tiles.js (4.27.0) — 8 m detail for the big maps (24 and 32 km have 12-16 m cells), step 1 of 3: GENERATE AND STORE.
// The world stays as generated (16 m: villages, roads, track, water, trees all placed on it). On top, each 2 x 2 km tile is refined to 8 m:
//  1. the 16 m heights, interpolated (bilinear) to 8 m cells;
//  2. relief that a 16 m grid cannot hold: ridged noise in world coordinates (continuous over tile edges), strongest on steep and mountain
//     ground, nothing on protected ground (village plots, roads, paths, track, water and shores, so everything placed stays where it is);
//  3. local erosion (the game's own droplet erosion, its own seed per tile) on the tile plus a 16-cell margin, which carves gullies into it;
//     its change fades out toward the tile's edges so neighbouring tiles meet.
// Stored per tile as the difference to the 16 m ground (Int16, cm) in the Origin Private File System, folder "detail-<world key>", 128 KB a
// tile (32 km: 256 tiles, 32 MB). All at once or a quarter at a time (Saves page). Step 2 draws them round the camera; step 3 fits trees,
// rocks and vehicles to them.
const Tiles={S:2048,FC:8,M:16,dirName:'',done:new Set(),busy:false,win:{x0:null,z0:null,N:512,data:null,tex:null,busy:false,key:'',T:null},cur:null,
  /* ---- step 2: the window of detail round the camera (2 x 2 tiles, 4 km, 512² cells) in a texture, loaded from the device when the camera
     moves on (a small pill shows meanwhile); the patch of 8 m ground (1.5 km) round the camera is drawn with it (R.drawFine) */
  update(){const T=App.T,w=this.win;if(!T||!this.on(T)||+P.fineDetail===0||!WorldFile.ok()||App.busy){return;}if(w.T!==T||w.key!==this.key()){w.T=T;w.key=this.key();w.x0=null;w.data=null;}
    if(w.x0!=null&&!Cam.calm(0.3))return;/* 4.53: a new window only once the view has settled: panning stays smooth */
    const c=Cam.pos||R.focus,S=this.S,x0=clamp(Math.round(c[0]/S)*S-S,0,T.W-2*S),z0=clamp(Math.round(c[2]/S)*S-S,0,T.W-2*S);if((x0===w.x0&&z0===w.z0)||w.busy)return;this.loadWin(x0,z0);},
  async loadWin(x0,z0){const w=this.win,n=this.S/this.FC,N=w.N,S=this.S;w.busy=true;this.pill(true);try{const D=new Float32Array(N*N);let got=0;
      for(let q=0;q<4;q++){const ox=q&1,oz=q>>1,a=await this.load(x0/S+ox,z0/S+oz);if(!a)continue;got++;for(let j=0;j<n;j++){const row=(oz*n+j)*N+ox*n;for(let i=0;i<n;i++)D[row+i]=a[j*n+i]/100;}}
      if(!w.tex){w.tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,w.tex);gl.texStorage2D(gl.TEXTURE_2D,1,gl.R32F,N,N);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
      gl.bindTexture(gl.TEXTURE_2D,w.tex);gl.pixelStorei(gl.UNPACK_ALIGNMENT,4);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,N,N,gl.RED,gl.FLOAT,D);w.data=got?D:null;w.x0=x0;w.z0=z0;w.got=got;}
    catch(e){Log.warn('detail window: '+(e.message||e));w.x0=x0;w.z0=z0;}w.busy=false;this.pill(false);},
  pill(on){let el=$('#finePill');if(on&&!el){el=document.createElement('div');el.id='finePill';el.innerHTML='<i class="spin"></i> Loading the 8 m ground';document.body.appendChild(el);}if(el)el.style.display=on?'flex':'none';},
  /* the patch to draw this frame: centred ahead of the camera toward what it looks at, snapped to 16 m; none when high up or no detail here */
  patch(cam){const w=this.win,T=App.T;this.cur=null;if(!w.data||!T||+P.fineDetail===0)return null;const gy=sampleH(T,cam.pos[0],cam.pos[2],T.Hr||T.H);if(cam.pos[1]-gy>700)return null;
    const half=+P.fineDetail>=2?1024:768;let fx=R.focus[0]-cam.pos[0],fz=R.focus[2]-cam.pos[2];const fl=Math.hypot(fx,fz)||1,k=Math.min(fl,half*0.5)/fl,cx=Math.round((cam.pos[0]+fx*k)/16)*16,cz=Math.round((cam.pos[2]+fz*k)/16)*16;
    return this.cur={cx,cz,half,M:half/8};},
  /* the detail at a point as drawn (0 outside the patch, faded toward its edge): R.sampleHr adds it, so vehicles and the camera stand on it */
  dAt(x,z){const p=this.cur,w=this.win;if(!p||!w.data)return 0;const m=Math.max(Math.abs(x-p.cx),Math.abs(z-p.cz));if(m>=p.half)return 0;const e=clamp((p.half-m)/(p.half*0.15),0,1),N=w.N,u=(x-w.x0)/this.FC-0.5,v=(z-w.z0)/this.FC-0.5,i=Math.floor(u),j=Math.floor(v);
    if(i<0||j<0||i>=N-1||j>=N-1)return 0;const fu=u-i,fv=v-j,D=w.data,a=D[j*N+i],b=D[j*N+i+1],c=D[(j+1)*N+i],d=D[(j+1)*N+i+1];return((a*(1-fu)+b*fu)*(1-fv)+(c*(1-fu)+d*fu)*fv)*e;},
  on(T){T=T||App.T;return!!(T&&T.cs>8.5);},
  n(T){return Math.round(T.W/this.S);},
  key(){return'detail-'+(WorldFile.key(P).split('').reduce((h,c)=>(Math.imul(h,31)+c.charCodeAt(0))|0,7)>>>0).toString(36);},
  async dir(create){const root=await navigator.storage.getDirectory();return await root.getDirectoryHandle(this.key(),{create:!!create});},
  async scan(){this.done=new Set();if(!this.on()||!WorldFile.ok())return this.done;try{const d=await this.dir(false);for await(const [name] of d.entries()){const m=/^t_(\d+)_(\d+)\.bin$/.exec(name);if(m)this.done.add(m[1]+'_'+m[2]);}}catch(e){}return this.done;},
  quarter(tx,tz,n){return(tx>=n/2?1:0)+(tz>=n/2?2:0);},
  // ---- one tile
  refine(T,tx,tz){const S=this.S,fc=this.FC,M=this.M,n=S/fc,G=n+2*M,x0=tx*S-M*fc,z0=tz*S-M*fc,N=T.N,cs=T.cs,H=T.H,sea=T.sea;
    const cell=(i,j)=>clamp(j,0,N-1)*N+clamp(i,0,N-1),bil=(A,x,z)=>{const u=x/cs-0.5,v=z/cs-0.5,i=Math.floor(u),j=Math.floor(v),fu=u-i,fv=v-j;
        return(A[cell(i,j)]*(1-fu)+A[cell(i+1,j)]*fu)*(1-fv)+(A[cell(i,j+1)]*(1-fu)+A[cell(i+1,j+1)]*fu)*fv;};
    const prot=(x,z)=>{const i0=Math.floor(x/cs),j0=Math.floor(z/cs);for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const k=cell(i0+di,j0+dj);
        if((T.flatMask&&T.flatMask[k])||(T.roadMask&&T.roadMask[k])||(T.trackMask&&T.trackMask[k])||(T.pathMask&&T.pathMask[k]>40)||(T.water&&T.water[k*4+3]>0)||(sea!=null&&H[k]<sea+2))return 1;}return 0;};
    const nz=this.nz||(this.nz=makeNoise((P.seed|0)+9191)),base=new Float32Array(G*G),fine=new Float32Array(G*G),pr=new Uint8Array(G*G),nd=new Float32Array(G*G);
    for(let j=0;j<G;j++)for(let i=0;i<G;i++){const x=x0+(i+0.5)*fc,z=z0+(j+0.5)*fc,k=j*G+i,b=bil(H,x,z);base[k]=b;const p=pr[k]=prot(x,z);
      if(p){fine[k]=b;continue;}const sx=(bil(H,x+cs,z)-bil(H,x-cs,z))/(2*cs),sz=(bil(H,x,z+cs)-bil(H,x,z-cs))/(2*cs),sl=Math.hypot(sx,sz),mm=T.mm?bil(T.mm,x,z):0;
      const amp=(0.6+3.2*smooth(0.08,0.55,sl)+2.4*mm)*0.75*(+P.mtnGen>=2?1+2.2*smooth(500,2200,b-(sea||0)):1)/* 4.53: rougher high up */,r=ridged(nz,x/90,z/90,3,0.5,2.1)-0.45,f=fbm(nz,x/22+7.3,z/22-3.1,2,0.5,2)*0.35;nd[k]=(r+f)*amp;fine[k]=b+nd[k];}
    // local erosion on the tile and its margin (seeded per tile; the game's erosion settings, fewer drops)
    const E={N:G,cs:fc,H:fine};const pp=Object.assign({},P,{seed:((P.seed|0)*7919+tx*131+tz*977)|0,dropletsPerCell:Math.min(1.2,(+P.dropletsPerCell||1)*0.6),thermalIter:Math.min(2,P.thermalIter|0)});
    return{G,n,M,base,fine,pr,nd,E,pp};},
  /* only the detail is kept: the change minus its own 104 m running mean (separable box blur), so the refined ground neither sinks nor rises
     against the 16 m world on average; protected cells stay exactly 0 */
  finish(r){const {G,n,M,base,fine,pr,nd}=r,out=new Int16Array(n*n),fd=12,D=new Float32Array(G*G),A=new Float32Array(G*G),B=new Float32Array(G*G),R=6;
    /* D: relief (continuous over tile edges) + the erosion's change, which fades out toward the tile's edges (it differs per tile) */
    for(let j=0;j<G;j++)for(let i=0;i<G;i++){const k=j*G+i;if(pr[k]){D[k]=0;continue;}const e=Math.min(i,j,G-1-i,G-1-j)-M,w=smooth(0,fd,e);D[k]=nd[k]+(fine[k]-base[k]-nd[k])*w;}
    for(let j=0;j<G;j++){let a=0;for(let i=-R;i<=R;i++)a+=D[j*G+clamp(i,0,G-1)];for(let i=0;i<G;i++){A[j*G+i]=a/(2*R+1);a+=D[j*G+Math.min(G-1,i+R+1)]-D[j*G+Math.max(0,i-R)];}}
    for(let i=0;i<G;i++){let a=0;for(let j=-R;j<=R;j++)a+=A[clamp(j,0,G-1)*G+i];for(let j=0;j<G;j++){B[j*G+i]=a/(2*R+1);a+=A[Math.min(G-1,j+R+1)*G+i]-A[Math.max(0,j-R)*G+i];}}
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){const k=(j+M)*G+(i+M);if(pr[k]){out[j*n+i]=0;continue;}let d=D[k]-B[k];d=clamp(d,-5,5);out[j*n+i]=Math.round(d*100);}
    return out;},
  async store(tx,tz,a){const d=await this.dir(true),fh=await d.getFileHandle(`t_${tx}_${tz}.bin`,{create:true}),ws=await fh.createWritable();await ws.write(a);await ws.close();this.done.add(tx+'_'+tz);},
  async load(tx,tz){try{const d=await this.dir(false),f=await (await d.getFileHandle(`t_${tx}_${tz}.bin`)).getFile();return new Int16Array(await f.arrayBuffer());}catch(e){return null;}},
  // ---- a batch: 'all' or quarter 0-3 (the tiles not yet made in it), with the loading card and its train
  async run(which){const T=App.T;if(!this.on(T)){UI.toast('8 m detail is for the 24 and 32 km maps (their ground has 12-16 m cells)');return;}if(!WorldFile.ok()){UI.toast('This browser has no file storage for the detail');return;}
    if(this.busy||App.busy){UI.toast('Busy: try again in a moment');return;}this.busy=true;const n=this.n(T);await this.scan();const L=[];
    for(let tz=0;tz<n;tz++)for(let tx=0;tx<n;tx++){if(this.done.has(tx+'_'+tz))continue;if(which!=='all'&&this.quarter(tx,tz,n)!==which)continue;L.push([tx,tz]);}
    if(!L.length){this.busy=false;UI.toast(which==='all'?'All 8 m detail is already made':'That quarter is already made');this.ui();return;}
    const t0=performance.now();UI.progress(true,0,'8 m detail');LoadScene.show(true);let k=0;
    try{for(const [tx,tz] of L){const r=this.refine(T,tx,tz);await genErosion(r.pp,r.E,async(f)=>{if(f>0.98)return;});const a=this.finish(r);await this.store(tx,tz,a);k++;
        UI.progress(true,k/L.length,`8 m detail: tile ${k} of ${L.length} (${this.done.size} of ${n*n} made)`);await new Promise(q=>setTimeout(q,0));}}
    catch(e){Log.err('detail tiles: '+(e.stack||e));UI.toast('8 m detail stopped: '+(e.message||e));}
    UI.progress(false);LoadScene.show(false);this.busy=false;Log.info(`detail tiles: ${k} made in ${((performance.now()-t0)/1000).toFixed(1)} s (${this.done.size} of ${n*n})`);UI.toast(`8 m detail: ${k} tiles made, ${this.done.size} of ${n*n} in all`);this.win.x0=null;this.ui();},
  async clear(){try{const root=await navigator.storage.getDirectory();await root.removeEntry(this.key(),{recursive:true});}catch(e){}this.done=new Set();this.win.x0=null;this.win.data=null;this.ui();UI.toast('8 m detail removed from this device');},
  // ---- the Saves page section
  async ui(){const el=$('#mmDetail');if(!el)return;const T=App.T;if(!this.on(T)){el.innerHTML='<div class="mm-note">8 m detail: only for the 24 and 32 km maps.</div>';return;}await this.scan();const n=this.n(T),q=[0,0,0,0];
    for(const id of this.done){const [x,z]=id.split('_').map(Number);q[this.quarter(x,z,n)]++;}const per=n*n/4,nm=['north-west','north-east','south-west','south-east'];
    el.innerHTML=`<div class="mm-note">8 m detail: ${this.done.size} of ${n*n} tiles made (about ${(n*n*0.4/60).toFixed(0)}-${(n*n*0.9/60).toFixed(0)} min for all on a desktop)</div><button class="mm-b" data-dt="all">Make all of it</button><div class="mm-row">`+
      [0,1,2,3].map(i=>`<button class="mm-b" data-dt="${i}" ${q[i]>=per?'disabled':''}>${nm[i]}<br><small>${q[i]} of ${per}</small></button>`).join('')+`</div><button class="mm-b" data-dt="x">Remove the detail</button>`;
    for(const b of el.querySelectorAll('[data-dt]'))b.onclick=()=>{const v=b.dataset.dt;if(v==='x'){this.clear();return;}MainMenu.hide();this.run(v==='all'?'all':+v);};},
  // a picture of a tile's detail (for checking): grey = 0, light = raised, dark = cut
  async debugCanvas(tx,tz){const a=await this.load(tx,tz);if(!a)return null;const n=this.S/this.FC,c=document.createElement('canvas');c.width=c.height=n;const g=c.getContext('2d'),im=g.createImageData(n,n);
    for(let k=0;k<n*n;k++){const v=clamp(128+a[k]/100*24,0,255);im.data.set([v,v,v,255],k*4);}g.putImageData(im,0,0);return c;}};
