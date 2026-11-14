'use strict';
// ===== main.js
// ===================================================================
// APP — boot, generation pipeline, file actions, frame loop
// ===================================================================
const SAVE_KEY='trein.save.v1';
// ============================================================
// ===================================================================
// main menu, map view, App (generation pipeline, saves)
const MainMenu={np:null,pt:0,
  show(page){if(!this.bound){this.bound=true;this.bind();}if(MapView.on)MapView.close();$('#mainMenu').hidden=false;this.page(page||'home');$('#mmCont').textContent=App.T?'Continue':'Continue (loading…)';},
  hide(){$('#mainMenu').hidden=true;},
  page(p){for(const e of document.querySelectorAll('.mm-page'))e.hidden=e.dataset.p!==p;if(p==='new')this.initNew();if(p==='saves')this.saveInfo();if(p==='quality')this.initQ();},
  KEYS:['maxHeight','mountains','landShare','bigMtns','bigMtnHeight','bigMtnBase','bigMtnLong','villages'],
  initNew(){const np=this.np={...P};$('#mmSize').value=String(np.worldSize);$('#mmSeed').value=np.seed;for(const k of this.KEYS)$('#mm_'+k).value=np[k];this.sync();this.preview();},
  sync(){const np=this.np;for(const b of document.querySelectorAll('#mmStyle button'))b.classList.toggle('on',b.dataset.v===np.mapStyle);for(const e of document.querySelectorAll('.mm-grid .isl'))e.style.display=np.mapStyle==='land'?'none':'';
    for(const e of document.querySelectorAll('.mm-grid .bm'))e.style.opacity=np.bigMtns>0?1:0.4;},
  preview(){clearTimeout(this.pt);this.pt=setTimeout(async()=>{const np=this.np,t0=performance.now();try{const L=await previewLand(np,160);drawPreview($('#mmPrev'),L,np);$('#mmPrevNote').textContent=`Preview without rivers and lakes · ${np.worldSize/1000} km · seed ${np.seed}`;}catch(e){Log.warn('preview: '+e.message);}},120);},
  start(){const np=this.np;if(!np)return;if(Bench.on){UI.toast('Leave the benchmark world first');return;}
    for(const k of ['worldSize','seed','mapStyle',...this.KEYS])P[k]=np[k];paramChanged('mapStyle');Track.load(null);for(const t of Trains.list){t.whistle=false;Sfx.whistle(t,false);}Trains.list=[];Trains.sel=-1;
    Roads.list=[];Buses.stops=[];Buses.list=[];Buses.pending=0;Buses.pendingList=null;Life.roadsDirty=true;Life.pendingV=null;Money.cash=200000;Money.loan=0;Money.paid=new Map();Money.paidSt=new Set();Money.paidTr=new Set();Money.inited=false;
    App.camLoaded=false;App.placedCam=false;UI.refreshAll();this.hide();App.generate(0);},
  saveInfo(){let t='No save yet';try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(s)t=`Last save: ${new Date(s.savedAt||Date.now()).toLocaleString()} · seed ${s.params.seed}, ${s.params.worldSize/1000} km${s.params.mapStyle&&s.params.mapStyle!=='land'?', '+s.params.mapStyle:''}`;}catch(e){}$('#mmSaveInfo').textContent=t+' · the game also saves itself every few minutes';},
  initQ(){for(const b of document.querySelectorAll('#mmPreset button'))b.classList.toggle('on',b.dataset.v===P.preset);for(const k of ['kitLod','renderScale'])$('#mmq_'+k).value=P[k];},
  bind(){const on=(id,f)=>{$(id).onclick=f;};on('#mmCont',()=>this.hide());on('#mmNew',()=>this.page('new'));on('#mmSaves',()=>this.page('saves'));on('#mmQual',()=>this.page('quality'));
    on('#mmSet',()=>{this.hide();$('#btnMenu').click();});on('#mmFly',()=>{this.hide();if(window.Plane)Plane.spawn();});for(const b of ['#mmBack1','#mmBack2','#mmBack3'])on(b,()=>this.page('home'));
    on('#mmStart',()=>this.start());on('#mmDice',()=>{this.np.seed=1+Math.floor(Math.random()*99998);$('#mmSeed').value=this.np.seed;this.preview();});
    $('#mmSeed').onchange=()=>{this.np.seed=clamp(Math.round(+$('#mmSeed').value||1),1,99999);this.preview();};$('#mmSize').onchange=()=>{this.np.worldSize=+$('#mmSize').value;this.preview();};
    for(const b of document.querySelectorAll('#mmStyle button'))b.onclick=()=>{this.np.mapStyle=b.dataset.v;this.sync();this.preview();};
    for(const k of this.KEYS)$('#mm_'+k).oninput=()=>{this.np[k]=+$('#mm_'+k).value;this.sync();this.preview();};
    on('#mmSaveNow',()=>{App.save();this.saveInfo();});on('#mmLoad',()=>{this.hide();App.load();});on('#mmExport',()=>App.exportJSON());on('#mmImport',()=>$('#file').click());on('#mmLog',()=>App.exportLog());
    for(const b of document.querySelectorAll('#mmPreset button'))b.onclick=()=>{P.preset=b.dataset.v;applyPreset(b.dataset.v);UI.refreshAll();this.initQ();};
    for(const k of ['kitLod','renderScale'])$('#mmq_'+k).oninput=()=>{P[k]=+$('#mmq_'+k).value;paramChanged(k);UI.refresh(k);};}};
// ---- the map: the world seen straight down without clouds, mist or haze; on top of it (a 2D canvas) the railways, the bus and lorry
// routes, the trains, and symbols with names for the villages (by size), stations, bus stops, farms, mines, sawmills, workshops, castles
// and docks. One finger pans, two pinch to zoom (the usual camera controls, rotation locked); a tap on a symbol leaves the map there.
const MapView={on:false,keep:null,cam:null,hits:[],paths:new Map(),
  toggle(){this.on?this.close():this.open();},
  open(){if(!App.T||this.on)return;if(Build.active)Build.exit();if(Drive.active)Drive.exit();this.on=true;this.cam=Cam.state();this.keep={mode:Cam.mode,fog:P.fogDensity,bokeh:P.bokeh,skip:R.skip};
    P.fogDensity=0;P.bokeh=0;R.skip={...R.skip,clouds:1,mist:1};const T=App.T;Cam.mode='free';Cam.anim=null;Cam.target=[T.W/2,0,T.W/2];const asp=innerWidth/innerHeight,fy=(asp<1?64:50)*Math.PI/180;Cam.dist=T.W/2/(Math.tan(fy/2)*Math.min(1,asp))*1.05;Cam.pitch=1.52;Cam.yaw=0;
    document.body.classList.add('mapmode');$('#mapOv').hidden=false;$('#mapBar').hidden=false;this.paths.clear();this.legend();},
  close(){if(!this.on)return;this.on=false;P.fogDensity=this.keep.fog;P.bokeh=this.keep.bokeh;R.skip=this.keep.skip||{};Cam.mode=this.keep.mode==='free'?'free':this.keep.mode;
    if(this.fly){Cam.setState(this.cam);Cam.flyTo(this.fly,160);this.fly=null;}else Cam.setState(this.cam);
    document.body.classList.remove('mapmode');$('#mapOv').hidden=true;$('#mapBar').hidden=true;},
  legend(){$('#mapLegend').innerHTML='<span style="color:#ff5a4a">━ railway</span> · <span style="color:#4fb4ff">┅ bus</span> · <span style="color:#ffb340">┅ lorry</span> · 🏡 hamlet · 🏘️ village · 🏰 town';},
  /* the camera is held straight down while the map is open */
  hold(){if(!this.on)return;Cam.pitch=1.52;Cam.yaw=0;Cam.mode='free';Cam.dist=clamp(Cam.dist,60,App.T?App.T.W*2.4:20000);},
  busPath(a,b){const k=a.id+'>'+b.id;if(!this.paths.has(k)){let p=null;try{p=Buses.roadPath([a.rx,a.rz],[b.rx,b.rz]);}catch(e){}this.paths.set(k,p&&p.length>1?p:[[a.rx,a.rz],[b.rx,b.rz]]);}return this.paths.get(k);},
  draw(){if(!this.on||!App.T)return;const cv=$('#mapOv'),dpr=Math.min(2,devicePixelRatio||1),W=innerWidth,H=innerHeight;if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);}
    const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);const T=App.T,Hr=(x,z)=>R.sampleHr(T,x,z),S=(x,z,y)=>Cam.toScreen(x,y===undefined?Hr(x,z):y,z);this.hits=[];
    const line=(pts,col,w,dash,casing)=>{const sp=pts.map(p=>S(p[0],p[1],p[2])).filter(Boolean);if(sp.length<2)return;g.setLineDash(dash||[]);g.lineJoin='round';g.lineCap='round';
      if(casing){g.strokeStyle=casing;g.lineWidth=w+3;g.beginPath();sp.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke();}
      g.strokeStyle=col;g.lineWidth=w;g.beginPath();sp.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke();g.setLineDash([]);};
    // railways
    for(const sg of Track.segs){if(sg.pend)continue;const n=Math.max(2,Math.ceil(sg.L/12)),pts=[];for(let k=0;k<=n;k++){const t=sg.L*k/n,q=segPoint(sg,t);pts.push([q[0],q[1],segY(sg,t)]);}line(pts,'#ff5a4a',3.5,null,'#2a0d0acc');}
    // bus and lorry routes (each leg along the roads)
    Buses.list.forEach((b,bi)=>{const RS=Buses.route(b);if(RS.length<2)return;const col=b.goods?'#ffb340':'#4fb4ff',off=(bi%3-1)*Cam.dist*0.004;for(let k=0;k<RS.length;k++){const a=RS[k],c=RS[(k+1)%RS.length],p=this.busPath(a,c);line(p.map(q=>[q[0]+off,q[1]+off]),col,2.5,[7,5],'#0008');}});
    // vehicles: trains and buses as dots
    for(const tr of Trains.list){const p=tr.poses&&tr.poses[0];if(!p)continue;const q=S(p.c[0],p.c[2],p.c[1]);if(q){g.fillStyle='#fff';g.strokeStyle='#000';g.lineWidth=2;g.beginPath();g.arc(q[0],q[1],5,0,6.283);g.fill();g.stroke();}}
    for(const b of Buses.list){const q=S(b.x,b.z);if(q){g.fillStyle=b.goods?'#ffb340':'#4fb4ff';g.strokeStyle='#000';g.lineWidth=1.5;g.beginPath();g.arc(q[0],q[1],4,0,6.283);g.fill();g.stroke();}}
    // symbols with names
    const boxes=[],sym=(x,z,icon,name,size,col,obj)=>{const q=S(x,z);if(!q||q[0]<-40||q[1]<-40||q[0]>W+40||q[1]>H+40)return;const r=size/2+5;g.fillStyle='#15191ae6';g.strokeStyle=col||'#c9a14a';g.lineWidth=2;g.beginPath();g.arc(q[0],q[1],r,0,6.283);g.fill();g.stroke();
      g.font=`${size}px system-ui`;g.textAlign='center';g.textBaseline='middle';g.fillText(icon,q[0],q[1]+1);if(name){g.font=`600 ${size>20?14:12}px system-ui`;const tw=g.measureText(name).width/2+3,bx=[q[0]-tw,q[1]+r+2,q[0]+tw,q[1]+r+17];if(boxes.some(o=>o[0]<bx[2]&&o[2]>bx[0]&&o[1]<bx[3]&&o[3]>bx[1]))name='';else boxes.push(bx);}if(name){g.lineWidth=3;g.strokeStyle='#000c';g.strokeText(name,q[0],q[1]+r+9);g.fillStyle='#fff';g.fillText(name,q[0],q[1]+r+9);}
      this.hits.push({x:q[0],y:q[1],r:r+6,wx:x,wz:z});};
    const LV=Life.LEVELS||[];for(const v of Life.villages){const lv=v.level|0,big=lv>=LV.length-1,mid=lv>=1;sym(v.x,v.z,big?'🏰':mid?'🏘️':'🏡',`${v.name} · ${(LV[lv]&&LV[lv].name)||''}`,big?26:mid?22:18,big?'#ffd36a':'#c9a14a',v);}
    for(const si of Life.stInfo||[]){if(si.parent)continue;sym(si.x,si.z,si.st.farm?'🌾':si.cargo?'🚂':'🚉',si.st.name,18,'#ff5a4a');}
    for(const c of Life.castleList())sym(c.x,c.z,'🏯',c.name,18,'#b9a7ff');
    for(const fm of Life.farms())if(fm&&fm.v.farmOwned)sym(fm.x,fm.z,'🌾',fm.v.name+' farm',16,'#e7c35a');
    for(const [kind,L] of Life.inds())L.forEach(m=>{if(!Life.indOn(kind,m))return;sym(m.x,m.z,kind==='sawmill'?'🪚':kind==='mine'?'⛏️':'🪑',kind==='mine'?(ORE[m.type]?ORE[m.type].name+' mine':'Mine'):kind==='sawmill'?'Sawmill':'Workshop',16,'#9fd0a0');});
    for(const d of Life.docks||[])if(d.v&&d.v.docksOwned)sym(d.sx,d.sz,'⚓','',14,'#8fd3ff');
    for(const st of Buses.stops)sym(st.x,st.z,st.sawmill||st.workshop?'🚚':'🚏',st.name,14,'#4fb4ff');},
  tap(x,y){let best=null,bd=1e9;for(const h of this.hits){const d=Math.hypot(h.x-x,h.y-y);if(d<h.r&&d<bd){bd=d;best=h;}}if(!best)return false;this.fly=[best.wx,R.sampleHr(App.T,best.wx,best.wz),best.wz];this.close();return true;}};
// ---- world cache (IndexedDB): the land as generated before the villages (terrain, erosion, water, streams, vegetation) is kept so the next
// start skips those 15-20 s. It is a CACHE, not a save: the game state lives in the compact save (localStorage, saved on every Save and
// automatically every few minutes and when the page is hidden). The entry is keyed by every setting that shapes the land plus the game
// version, so any change of either just regenerates; a missing, unreadable or inconsistent entry is ignored (and removed) and the land is
// generated as before. Only the latest world is kept. Villages are always generated anew on top (a few seconds), then the save's growth
// log, track, trains etc. are applied as before.
const WorldCache={DB:'trein-cache',ST:'world',db:null,
  open(){if(this.db)return Promise.resolve(this.db);return new Promise((res,rej)=>{if(typeof indexedDB==='undefined')return rej(new Error('no IndexedDB'));const r=indexedDB.open(this.DB,1);
    r.onupgradeneeded=()=>{r.result.createObjectStore(this.ST);};r.onsuccess=()=>{this.db=r.result;res(this.db);};r.onerror=()=>rej(r.error);});},
  key(p){const o={};for(const id of PORDER){const a=PDEF[id].apply;if(a==='world'||a==='water'||a==='veg')o[id]=p[id];}return VERSION+'|'+JSON.stringify(o);},
  async load(key){try{const db=await this.open();const rec=await new Promise((res,rej)=>{const q=db.transaction(this.ST,'readonly').objectStore(this.ST).get('land');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});
      if(!rec)return null;if(rec.key!==key){Log.info('world cache: settings or version changed, regenerating');return null;}const T=rec.T;
      if(!T||!T.H||!T.N||T.H.length!==T.N*T.N||!T.veg||!T.stats){Log.warn('world cache entry is incomplete: removed');this.clear();return null;}return T;}
    catch(e){Log.warn('world cache unreadable ('+(e.message||e)+'): generating instead');this.clear();return null;}},
  /* a copy of the land without functions (they cannot be stored; none are needed after generation) */
  plain(o,seen){if(o===null||typeof o!=='object')return typeof o==='function'?undefined:o;if(ArrayBuffer.isView(o)||o instanceof ArrayBuffer)return o;seen=seen||new Map();if(seen.has(o))return seen.get(o);
    if(Array.isArray(o)){const a=[];seen.set(o,a);for(const v of o)a.push(this.plain(v,seen));return a;}if(o instanceof Map||o instanceof Set)return o;const r={};seen.set(o,r);for(const k in o){const v=this.plain(o[k],seen);if(v!==undefined)r[k]=v;}return r;},
  store(key,T){try{const C=this.plain(T);this.open().then(db=>{const t0=performance.now();const tx=db.transaction(this.ST,'readwrite');tx.objectStore(this.ST).put({key,T:C,at:Date.now()},'land');/* the value is copied here, at the call */
      Log.info(`world cache: land copied in ${(performance.now()-t0).toFixed(0)} ms`);tx.oncomplete=()=>Log.info('world cache: stored');tx.onerror=()=>Log.warn('world cache: could not store ('+(tx.error&&tx.error.message)+')');}).catch(e=>Log.warn('world cache off: '+(e.message||e)));}
    catch(e){Log.warn('world cache: could not copy the land ('+(e.message||e)+')');}},
  clear(){this.open().then(db=>{db.transaction(this.ST,'readwrite').objectStore(this.ST).delete('land');}).catch(()=>{});}};
const App={busy:false,pendingFrom:99,base:null,eroded:null,T:null,time:0,perf:{fr:[],last:0,logAt:0,hudAt:0},
  async generate(from){
    if(this.busy){this.pendingFrom=Math.min(this.pendingFrom,from);return;}
    if(from>0&&!this.eroded)from=0;
    if(from===4&&this.T){this.busy=true;try{const T=this.T;Life.generate(T);R.refreshGround(T);if(R.buildStreams)R.buildStreams(T);Weather.setWorld(T);}catch(e){Log.err('villages failed: '+(e.stack||e));}this.busy=false;
      if(this.pendingFrom<99){const f=this.pendingFrom;this.pendingFrom=99;this.generate(f);}return;}
    this.busy=true;const t0=performance.now(),show=from<=2;const times=[];
    const W={0:[0,0.12],1:[0.12,0.6],2:[0.72,0.16],3:[0.88,0.12]};let st=W[from];
    const y=makeYielder((f,l)=>{if(show)UI.progress(true,st[0]+f*st[1],l);});
    if(show)UI.progress(true,0,'Starting');await new Promise(r=>setTimeout(r,30));
    try{
      let t=performance.now(),T,cached=false,ckey=null;
      if(from===0&&+P.worldCache!==0&&!Bench.on){ckey=WorldCache.key(P);if(show)UI.progress(true,0.05,'Loading the land from the cache');const c=await WorldCache.load(ckey);
        if(c){T=c;cached=true;this.base=null;this.eroded=null;times.push('land from cache '+(performance.now()-t).toFixed(0));t=performance.now();}}
      if(!cached){
      if(from<=0){st=W[0];this.base=await genTerrain(P,y);times.push('terrain '+(performance.now()-t).toFixed(0));t=performance.now();}
      if(from<=1){st=W[1];const B=this.base;const E={N:B.N,W:B.W,cs:B.cs,mm:B.mm,norm:B.norm,sea:B.sea,H:new Float32Array(B.H),flow:null,depo:null};
        if(P.erosionOn&&P.dropletsPerCell>0)await genErosion(P,E,y);this.eroded=E;times.push('erosion '+(performance.now()-t).toFixed(0));t=performance.now();}
      if(from<=2){st=W[2];const E=this.eroded;T={...E,H:new Float32Array(E.H),stats:{}};
        await genWater(P,T,y);if(bigLakeArea(T)<Math.min(400000,T.W*T.W*0.025)){const T2={...E,H:new Float32Array(E.H),stats:{}},b=carveLakeBowl(T2,P.seed|0);await genWater(P,T2,y);T=T2;Log.info(`no big lake: carved a lake basin (r ${b.R.toFixed(0)} m) at ${b.x.toFixed(0)},${b.z.toFixed(0)}, now ${(bigLakeArea(T)/10000).toFixed(0)} ha`);}T.H0=new Float32Array(T.H);carveTrack(T);genMaps(P,T);times.push('water+maps '+(performance.now()-t).toFixed(0));t=performance.now();}
      else T=this.T;
      st=W[3];if(from<=3){await genVegetation(P,T,y);T.vegOrig=null;T.Hr=null;times.push('vegetation '+(performance.now()-t).toFixed(0));t=performance.now();
        if(+P.worldCache!==0&&!Bench.on)WorldCache.store(ckey||WorldCache.key(P),T);}
      }
      if(show)UI.progress(true,0.97,'Villages and fields');await new Promise(r=>setTimeout(r,0));
      Life.generate(T);times.push('villages '+(performance.now()-t).toFixed(0));
      this.T=T;R.uploadWorld(T);Weather.setWorld(T);if(this.pendingTrains){Trains.load(this.pendingTrains);this.pendingTrains=null;}else Trains.trackChanged();
      const s=T.stats;Log.info(`generate(from ${from}) ${(performance.now()-t0).toFixed(0)} ms [${times.join(', ')}] seed ${P.seed} ${T.W}m/${T.N}px lakes ${s.lakes} riverCells ${s.riverCells} falls ${s.fallCells} gorgeCells ${s.carvedCells||0} trees ${s.trees} bushes ${s.bushes} rocks ${s.rocks}`);
      $('#worldinfo').textContent=`Seed ${P.seed}: ${T.W/1000} km world, ${s.lakes} lakes, ${s.villages} villages with ${s.houses} houses, ${s.fields} fields, ${s.mills} windmills, ${s.trees.toLocaleString()} trees.`;
      if(from===0){Pending.world=false;UI.markGenerate(false);}
      if(!this.placedCam){this.placedCam=true;if(!this.camLoaded)this.frameWorld();}
    }catch(e){Log.err('generation failed: '+(e.stack||e));UI.toast('Generation failed — export the debug log');}
    UI.progress(false);this.busy=false;
    if(this.pendingFrom<99){const f=this.pendingFrom;this.pendingFrom=99;this.generate(f);}
  },
  frameWorld(){const T=this.T;const v=Life.villages[0];const x=v?v.x:T.W*0.5,z=v?v.z:T.W*0.5;Cam.target=[x,sampleH(T,x,z),z];Cam.dist=v?420:T.W*0.6;Cam.pitch=0.55;Cam.yaw=0.8;},
  applyPending(){
    if(Pending.shadow){Pending.shadow=false;R.setupShadows();}
    if(Pending.track){Pending.track=false;this.trackChanged();}
    if(Pending.streams){Pending.streams=false;if(this.T)R.buildStreams(this.T);}
    if(Pending.water){Pending.water=false;Pending.veg=false;this.generate(2);}
    else if(Pending.veg){Pending.veg=false;Pending.life=Pending.smooth=false;this.generate(3);}
    else if(Pending.life||Pending.smooth){Pending.life=Pending.smooth=false;this.generate(4);}
  },
  trackChanged(){Net.changed();const T=this.T;if(!T||!T.H0)return;const t0=performance.now();T.H.set(T.H0);carveTrack(T);computeNormals(T,T.nrm);R.updateTerrain(T);
    Log.info(`track earthworks rebuilt in ${(performance.now()-t0).toFixed(0)} ms (${Track.segs.length} pieces, ${Track.length().toFixed(0)} m)`);},
  /* a recent compact save is always there: every 3 minutes of play and whenever the page is hidden (app switched, screen off) */
  autosave(){if(Bench.on||!App.T||App.busy)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(snapshot()));}catch(e){}},
  save(){if(Bench.on){UI.toast('Saving is switched off in the benchmark world');return;}try{localStorage.setItem(SAVE_KEY,JSON.stringify(snapshot()));UI.toast('Saved');Log.info('saved to browser storage');}catch(e){Log.err('save failed '+e);UI.toast('Save failed: browser storage is blocked');}},
  load(){if(Bench.on){UI.toast('Leave the benchmark world first (Bench > Exit)');return;}let s;try{s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch(e){s=null;}if(!s){UI.toast('No save found yet');return;}
    try{applySnapshot(s);this.camLoaded=true;this.generate(0);UI.toast('Save loaded');}catch(e){UI.toast(e.message);}},
  exportJSON(){const s=snapshot();if(this.T)s.world=this.T.stats;download(`trein-state-${stamp()}.json`,JSON.stringify(s,null,2));Log.info('state exported');UI.toast('JSON exported');},
  importJSON(file){if(Bench.on){UI.toast('Leave the benchmark world first (Bench > Exit)');return;}const r=new FileReader();r.onload=()=>{try{applySnapshot(JSON.parse(r.result));this.camLoaded=true;this.generate(0);UI.toast('Imported '+file.name);}catch(e){Log.err('import failed '+e);UI.toast('Import failed: '+e.message);}};r.readAsText(file);},
  exportLog(){const s=snapshot();download(`trein-log-${stamp()}.txt`,Log.text()+'\n\n--- state ---\n'+JSON.stringify(s,null,1),'text/plain');UI.toast('Debug log exported');},
  resetAll(){if(Bench.on){UI.toast('Leave the benchmark world first (Bench > Exit)');return;}if(!confirm('Reset every setting to its default and remove all track, trains and roads? This cannot be undone.'))return;for(const id of PORDER)P[id]=PDEF[id].def;Track.load(null);for(const t of Trains.list){t.whistle=false;Sfx.whistle(t,false);}Trains.list=[];Trains.sel=-1;
    // roads, bus stops, buses, village growth and money used to survive a reset
    Roads.list=[];Buses.stops=[];Buses.list=[];Buses.pending=0;Buses.pendingList=null;Life.roadsDirty=true;Life.pendingV=null;Money.cash=200000;Money.loan=0;Money.paid=new Map();Money.paidSt=new Set();Money.paidTr=new Set();Money.inited=false;applyPreset(P.preset,true);UI.refreshAll();this.camLoaded=false;this.placedCam=false;R.setupShadows();this.generate(0);}
};

// ---- quick sky sheet: time, speed, season and weather without opening the settings
const Sky={bind(){$('#btnSky').onclick=()=>{const s=$('#skySheet');s.hidden=!s.hidden;this.refresh();};
    $('#skyTime').oninput=e=>{P.timeOfDay=+e.target.value;UI.refresh('timeOfDay');this.clock();};
    for(const b of document.querySelectorAll('#skySheet [data-speed]'))b.onclick=()=>{P.timeSpeed=+b.dataset.speed;UI.refresh('timeSpeed');this.refresh();};
    for(const b of document.querySelectorAll('#skySheet [data-season]'))b.onclick=()=>{P.season=b.dataset.season;UI.refresh('season');this.refresh();};
    for(const b of document.querySelectorAll('#skySheet [data-wx]'))b.onclick=()=>{P.weather=b.dataset.wx;UI.refresh('weather');if(P.weather==='auto')Weather.autoT=0;this.refresh();};
    $('#skyMusic').onclick=()=>{P.music=P.music?0:1;UI.refresh('music');if(P.music&&!Sfx.on){Sfx.start();Sfx.syncBtn();}this.refresh();};
    $('#skyClose').onclick=()=>{$('#skySheet').hidden=true;};},
  refresh(){const s=$('#skySheet');if(!s||s.hidden)return;$('#skyTime').value=P.timeOfDay;
    for(const b of s.querySelectorAll('[data-speed]'))b.classList.toggle('on',+b.dataset.speed===P.timeSpeed);
    for(const b of s.querySelectorAll('[data-season]'))b.classList.toggle('on',b.dataset.season===P.season);
    for(const b of s.querySelectorAll('[data-wx]'))b.classList.toggle('on',b.dataset.wx===P.weather);const mb=$('#skyMusic');mb.classList.toggle('on',!!P.music);setIcon(mb,P.music?'music':'musicOff');setCap(mb,P.music?'Music on':'Music off');},
  clock(){const h=Math.floor(P.timeOfDay),mi=Math.floor((P.timeOfDay-h)*60),z=n=>String(n).padStart(2,'0');const S=P.season[0].toUpperCase()+P.season.slice(1);
    const t=`${S} ${z(h)}:${z(mi)}, ${Weather.label()}`;const el=$('#clock');if(el&&el.textContent!==t)el.textContent=t;const b=$('#btnSky');if(b)b.textContent=`${z(h)}:${z(mi)}`;}};
// automatic resolution: drops the render scale (never above the chosen one) when the frame rate sags, e.g. when the phone heats up
const AutoRes={dyn:1,last:0,warned:false,
  tick(ts,fr){const tgt=+P.autoRes;if(!tgt){this.dyn=1;return;}if(fr.length<40||ts-this.last<3000)return;const a=fr.slice(-45),fps=1000/(a.reduce((x,y)=>x+y,0)/a.length),lo=0.4/clamp(+P.renderScale||1,0.3,1);
    if(fps<tgt*0.9&&this.dyn>lo){this.dyn=Math.max(lo,this.dyn*0.88);this.last=ts;if(this.dyn<0.8&&!this.warned){this.warned=true;UI.toast('Lowering resolution to keep it smooth (the phone may be warm)');}Log.info(`auto resolution ×${this.dyn.toFixed(2)} at ${fps.toFixed(0)} fps`);}
    else if(fps>tgt*1.3&&this.dyn<1){this.dyn=Math.min(1,this.dyn*1.06);this.last=ts+4000;}}};
// the 3D image is rendered at the resolution scale (R.rtW × R.rtH); normally the canvas has that size too and the browser stretches it
// to the screen. With sharper upscaling (P.fxUpscale) the canvas has the screen's full resolution and the last pass upscales and sharpens.
function resizeCanvas(){const cv=gl.canvas,dpr=Math.min(devicePixelRatio||1,3,+P.maxDpr||3),sc=clamp(+P.renderScale||1,0.3,1)*AutoRes.dyn,up=+P.fxUpscale===1&&sc<0.999,d=up?dpr:dpr*sc,w=Math.max(64,Math.round(innerWidth*d)),h=Math.max(64,Math.round(innerHeight*d));if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}
  R.rtW=up?Math.max(64,Math.round(innerWidth*dpr*sc)):w;R.rtH=up?Math.max(64,Math.round(innerHeight*dpr*sc)):h;}
