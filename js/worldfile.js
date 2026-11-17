'use strict';
// ===== worldfile.js (4.26.0)
// LoadScene: while a world is generated (or read back), a tiny 50 x 50 m world in the loading card: the black DB 01 with its tender
// running round a circle of track on a lawn with a few trees, smoke from the chimney, the camera slowly circling. It is drawn with the
// store's preview renderer (its own small WebGL canvas), so it costs nothing of the main renderer and keeps moving between the steps.
const LoadScene={on:false,raf:0,cv:null,S:null,t0:0,puffs:[],
  build(){if(this.S)return this.S;if(!Preview.init())return null;const up=m=>Preview.up(m);
    const G=vmesh(),R0=17;/* lawn, a gravel ring for the track, sleepers and two rails, a few trees, a little platform with a lamp */
    vbox(G,[0,-0.15,0],[50,0.3,50],[0.36,0.55,0.24],0);for(let i=0;i<64;i++){const a0=i/64*6.2832,a1=(i+1)/64*6.2832,P=(a,r,y)=>[Math.cos(a)*r,y,Math.sin(a)*r];
      vq(G,P(a0,R0-1.6,0.02),P(a1,R0-1.6,0.02),P(a1,R0+1.6,0.02),P(a0,R0+1.6,0.02),[0,1,0],[0.5,0.47,0.42],0);
      for(const r of [R0-0.72,R0+0.72]){vq(G,P(a0,r-0.04,0.32),P(a1,r-0.04,0.32),P(a1,r+0.04,0.32),P(a0,r+0.04,0.32),[0,1,0],[0.62,0.6,0.58],10);vq(G,P(a0,r-0.04,0.18),P(a1,r-0.04,0.18),P(a1,r-0.04,0.32),P(a0,r-0.04,0.32),[0,0,1],[0.3,0.25,0.2],0);}}
    for(let i=0;i<110;i++){const a=i/110*6.2832;vobox(G,[Math.cos(a)*R0,0.1,Math.sin(a)*R0],[Math.cos(a)*1.3,0,Math.sin(a)*1.3],[0,0.07,0],[-Math.sin(a)*0.12,0,Math.cos(a)*0.12],[0.33,0.25,0.18],0);}
    const rng=mulberry32(5);for(let i=0;i<14;i++){const a=rng()*6.283,r=i<6?5+rng()*7:21+rng()*3,x=Math.cos(a)*r,z=Math.sin(a)*r,h=3+rng()*3;vcylN(G,[x,0,z],[x,h*0.35,z],0.18,0.14,6,[0.4,0.28,0.18],0,null,false);
      vcylN(G,[x,h*0.3,z],[x,h,z],1.1+rng()*0.5,0.05,7,rng()<0.5?[0.2,0.42,0.2]:[0.26,0.48,0.22],0,null,true);}
    vbox(G,[0,0.45,R0+4.1],[10,0.9,3],[0.6,0.56,0.5],0);vcyl(G,[3.5,0.9,R0+4.6],'y',0.06,3,[0.15,0.15,0.16],0,6);vbox(G,[3.5,4.0,R0+4.6],[0.35,0.4,0.35],[1,0.9,0.6],9);
    const puff=vmesh();vcylN(puff,[0,-0.5,0],[0,0.5,0],0.55,0.55,7,[0.86,0.86,0.88],0,null,true);
    this.S={G:up(G),loco:up(loco01Mesh()),tender:up(tender01Mesh()),puff:up(puff),R:R0};return this.S;},
  show(on){if(on===this.on)return;this.on=on;let cv=this.cv;if(on&&!cv){cv=this.cv=document.createElement('canvas');cv.id='progScene';cv.width=600;cv.height=340;const p=$('#prog');if(p)p.insertBefore(cv,p.firstChild);}
    if(cv)cv.style.display=on?'block':'none';if(on){this.t0=performance.now();const loop=()=>{if(!this.on)return;try{this.draw();}catch(e){this.on=false;Log.warn('loading scene: '+e.message);return;}this.raf=requestAnimationFrame(loop);};this.raf=requestAnimationFrame(loop);}else cancelAnimationFrame(this.raf);},
  draw(){const S=this.build();if(!S)return;const g=Preview.gl,pc=Preview.cv,dst=this.cv,W=dst.width,H=dst.height;if(pc.width!==W||pc.height!==H){pc.width=W;pc.height=H;}const t=(performance.now()-this.t0)/1000;
    g.viewport(0,0,W,H);g.clearColor(0.55,0.68,0.8,1);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);g.enable(g.DEPTH_TEST);g.disable(g.CULL_FACE);g.useProgram(Preview.prog);
    const yaw=t*0.12,eye=[Math.sin(yaw)*34,15,Math.cos(yaw)*34],c=[0,1.5,0],asp=W/H,f=1/Math.tan(0.5),n=0.5,fa=200;
    const z=[eye[0]-c[0],eye[1]-c[1],eye[2]-c[2]],zl=Math.hypot(...z),Z=z.map(v=>v/zl),X0=[Z[2],0,-Z[0]],xl=Math.hypot(...X0)||1,X=X0.map(v=>v/xl),Y=[Z[1]*X[2]-Z[2]*X[1],Z[2]*X[0]-Z[0]*X[2],Z[0]*X[1]-Z[1]*X[0]];
    const V=[X[0],Y[0],Z[0],0,X[1],Y[1],Z[1],0,X[2],Y[2],Z[2],0,-(X[0]*eye[0]+X[1]*eye[1]+X[2]*eye[2]),-(Y[0]*eye[0]+Y[1]*eye[1]+Y[2]*eye[2]),-(Z[0]*eye[0]+Z[1]*eye[1]+Z[2]*eye[2]),1],
      Pm=[f/asp,0,0,0,0,f,0,0,0,0,(fa+n)/(n-fa),-1,0,0,2*fa*n/(n-fa),0],VP=new Float32Array(16);for(let i=0;i<4;i++)for(let j=0;j<4;j++){let a=0;for(let k=0;k<4;k++)a+=Pm[k*4+j]*V[i*4+k];VP[i*4+j]=a;}
    g.uniformMatrix4fv(g.getUniformLocation(Preview.prog,'uVP'),false,VP);g.uniform3fv(g.getUniformLocation(Preview.prog,'uEye'),eye);const uM=g.getUniformLocation(Preview.prog,'uM');
    const dm=(m,M)=>{g.uniformMatrix4fv(uM,false,M);g.bindVertexArray(m.vao);g.drawElements(g.TRIANGLES,m.count,g.UNSIGNED_INT,0);};
    /* a body on the circle: centre at angle a, its x axis along the track (anticlockwise seen from above) */const on=(a,y,s)=>{const cx=Math.cos(a)*S.R,cz=Math.sin(a)*S.R,tx=-Math.sin(a),tz=Math.cos(a);s=s||1;return new Float32Array([tx*s,0,tz*s,0,0,s,0,0,-tz*s,0,tx*s,0,cx,y,cz,1]);};
    dm(S.G,new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]));const th=t*0.32,LL=VEH.loco01.len,LT=VEH.tender01.len;dm(S.loco,on(th,0.32));dm(S.tender,on(th-(LL/2+COUPLE+LT/2)/S.R,0.32));
    /* smoke: a puff every 0.35 s from the chimney, rising, growing and drifting back */const ch=th+(LL/2-3.2)/S.R;if(!this.lp||t-this.lp>0.35){this.lp=t;this.puffs.push({x:Math.cos(ch)*S.R,z:Math.sin(ch)*S.R,t});}
    this.puffs=this.puffs.filter(p=>t-p.t<3.2);for(const p of this.puffs){const u=t-p.t,s=0.5+u*0.9;dm(S.puff,new Float32Array([s,0,0,0,0,s*0.8,0,0,0,0,s,0,p.x+u*0.6,4.9+u*1.6,p.z+u*0.3,1]));}
    const c2=dst.getContext('2d');c2.drawImage(pc,0,0);}};

// WorldFile: the whole generated world (the land, water, vegetation, villages, houses, roads, fields, industries: everything made from the
// seed and the world settings) kept in the browser's Origin Private File System, so a world is generated once. The game itself (track,
// trains, money, growth...) stays in the compact save; this file only replaces generating. Format: "TRW1", a JSON header (an object graph
// with references, so shared and circular objects come back as they were) and the typed arrays as one binary block, all gzip-compressed.
// If the file is missing, damaged or from other settings, the world is generated as before (and written again).
const WorldFile={NAME:'world.trw',FMT:1,
  ok(){return!!(typeof navigator!=='undefined'&&navigator.storage&&navigator.storage.getDirectory&&typeof CompressionStream!=='undefined');},
  key(p){const o={};for(const id of PORDER){const a=PDEF[id].apply;if(a==='world'||a==='water'||a==='veg'||a==='life')o[id]=p[id];}return'F'+this.FMT+'|'+JSON.stringify(o);},
  // ---- object graph <-> header + binary
  pack(root){const ids=new Map(),objs=[],queue=[],bins=[];let bl=0;
    const ref=v=>{if(v===undefined||typeof v==='function')return undefined;if(v===null||typeof v!=='object'){if(typeof v==='number'&&!isFinite(v))return{n:String(v)};return v;}
      let id=ids.get(v);if(id===undefined){id=objs.length;ids.set(v,id);objs.push(null);queue.push(v);}return{$:id};};
    const root$=ref(root);for(let qi=0;qi<queue.length;qi++){const v=queue[qi],id=ids.get(v);let e;
      if(ArrayBuffer.isView(v)&&!(v instanceof DataView)){const by=new Uint8Array(v.buffer,v.byteOffset,v.byteLength);bl+=(8-bl%8)%8;e={t:v.constructor.name,o:bl,n:v.length};bins.push([bl,by]);bl+=by.length;}
      else if(Array.isArray(v))e={a:v.map(x=>{const r=ref(x);return r===undefined?null:r;})};
      else if(v instanceof Map)e={m:[...v].map(([k,x])=>[ref(k),ref(x)===undefined?null:ref(x)])};
      else if(v instanceof Set)e={s:[...v].map(x=>ref(x))};
      else{const pr=Object.getPrototypeOf(v);if(pr===Object.prototype||pr===null){const o={};for(const k in v){const r=ref(v[k]);if(r!==undefined)o[k]=r;}e={o};}else e={x:1};}
      objs[id]=e;}
    return{hdr:{root:root$,objs},bins,bl};},
  unpack(hdr,buf,b0){const O=hdr.objs,out=new Array(O.length);
    O.forEach((e,i)=>{if(e.t){const C=globalThis[e.t];out[i]=new C(buf,b0+e.o,e.n);}else if(e.a)out[i]=[];else if(e.m)out[i]=new Map();else if(e.s)out[i]=new Set();else if(e.o)out[i]={};else out[i]=null;});
    const d=x=>x!==null&&typeof x==='object'?(x.$!==undefined?out[x.$]:x.n!==undefined?Number(x.n):x):x;
    O.forEach((e,i)=>{const t=out[i];if(e.a){for(const x of e.a)t.push(d(x));}else if(e.m){for(const [k,x] of e.m)t.set(d(k),d(x));}else if(e.s){for(const x of e.s)t.add(d(x));}else if(e.o){for(const k in e.o)t[k]=d(e.o[k]);}});
    return d(hdr.root);},
  blob(root){const {hdr,bins,bl}=this.pack(root),hj=new TextEncoder().encode(JSON.stringify(hdr)),pre=new Uint8Array(16),dv=new DataView(pre.buffer);pre.set([84,82,87,49]);dv.setUint32(4,hj.length,true);
    const hdrEnd=16+hj.length,pad=(8-hdrEnd%8)%8,parts=[pre,hj,new Uint8Array(pad)];let at=0;for(const [o,by] of bins){if(o>at)parts.push(new Uint8Array(o-at));parts.push(by);at=o+by.length;}return new Blob(parts);},
  async gz(blob,dir){const s=blob.stream().pipeThrough(dir?new CompressionStream('gzip'):new DecompressionStream('gzip'));return await new Response(s).blob();},
  parse(ab){const u=new Uint8Array(ab);if(u[0]!==84||u[1]!==82||u[2]!==87||u[3]!==49)throw new Error('not a Trein world file');const hl=new DataView(ab).getUint32(4,true),hdr=JSON.parse(new TextDecoder().decode(u.subarray(16,16+hl)));
    const b0=16+hl+(8-(16+hl)%8)%8;return{hdr,root:this.unpack(hdr,ab,b0)};},
  async dir(){return await navigator.storage.getDirectory();},
  /* after the villages are made: Life's fields that the generation set (L), the land T, the world settings and the key; written in the background */
  async save(T,L,key,params){if(!this.ok())return false;const t0=performance.now();try{const raw=this.blob({fmt:this.FMT,key,params,at:Date.now(),T,L}),t1=performance.now();
      const z=await this.gz(raw,true);const d=await this.dir(),fh=await d.getFileHandle(this.NAME,{create:true}),ws=await fh.createWritable();await ws.write(z);await ws.close();
      try{if(navigator.storage.persist&&!(await navigator.storage.persisted()))await navigator.storage.persist();}catch(e){}
      Log.info(`world file: ${(raw.size/1e6).toFixed(1)} MB packed in ${(t1-t0).toFixed(0)} ms, ${(z.size/1e6).toFixed(1)} MB written to the device (OPFS) in ${(performance.now()-t1).toFixed(0)} ms`);return true;}
    catch(e){Log.warn('world file: could not write ('+(e.message||e)+')');return false;}},
  async readRaw(){const d=await this.dir(),fh=await d.getFileHandle(this.NAME);return await fh.getFile();},
  async load(key){if(!this.ok())return null;const t0=performance.now();try{let f;try{f=await this.readRaw();}catch(e){return null;}const ab=await (await this.gz(f,false)).arrayBuffer(),{root}=this.parse(ab);
      if(!root||root.fmt!==this.FMT||!root.T||!root.L){Log.warn('world file: unknown format, generating instead');return null;}
      if(root.key!==key){Log.info('world file: made with other world settings, generating instead');return null;}const T=root.T;if(!T.H||T.H.length!==T.N*T.N||!T.veg){Log.warn('world file incomplete: generating instead');return null;}
      Log.info(`world file: read ${(f.size/1e6).toFixed(1)} MB in ${(performance.now()-t0).toFixed(0)} ms`);return root;}
    catch(e){Log.warn('world file unreadable ('+(e.message||e)+'): generating instead');return null;}},
  // ---- backups: download the file as it is stored; import one (its world settings come with it)
  async exportFile(){if(!this.ok()){UI.toast('This browser has no file storage for worlds');return;}try{const f=await this.readRaw();const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=`trein-world-${P.seed}-${P.worldSize/1024}km.trw`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);
      UI.toast(`World file: ${(f.size/1e6).toFixed(1)} MB`);}catch(e){UI.toast('No world file yet: it is written after a world has been generated');}},
  async importFile(file){try{UI.toast('Reading the world file…');const ab=await (await this.gz(file,false)).arrayBuffer(),{root}=this.parse(ab);if(!root||root.fmt!==this.FMT||!root.params)throw new Error('not a world file of this version');
      const d=await this.dir(),fh=await d.getFileHandle(this.NAME,{create:true}),ws=await fh.createWritable();await ws.write(file);await ws.close();
      for(const k in root.params)if(k in PDEF)P[k]=root.params[k];UI.refreshAll&&UI.refreshAll();UI.toast('World file loaded: opening that world (your track and trains stay as they are)');App.generate(0);}
    catch(e){UI.toast('Could not load that world file: '+(e.message||e));}}};
