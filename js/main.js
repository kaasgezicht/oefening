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
  SIZES:[1024,2048,4096,8192,12288,16384,24576,32768],
  /* world presets (4.33.0): each sets the map style and the settings that shape the land; the rest stays as it was */
  PRESETS:[['Mountain islands','A chain of islands, each round a big peak, bays and harbours',{mapStyle:'peaks',worldSize:8192,landShare:0.5,maxHeight:420,bigMtnHeight:1000,reliefMix:0.5,plainsMix:0.15,bays:1,shoreFlat:0.9}],
    ['Big islands','Fewer, larger islands with wide coastal plains and room for railways',{mapStyle:'peaks',worldSize:12288,landShare:0.85,maxHeight:420,bigMtnHeight:1100,bigMtnBase:4200,reliefMix:0.5,plainsMix:0.3,bays:1,shoreFlat:1}],
    ['Scattered isles','Many small islands far apart, lots of open sea',{mapStyle:'peaks',worldSize:8192,landShare:0.25,maxHeight:380,bigMtnHeight:850,reliefMix:0.5,plainsMix:0.15,bays:1,shoreFlat:0.9}],
    ['High peaks','Steep volcanic peaks with deep bays and little flat land',{mapStyle:'peaks',worldSize:8192,landShare:0.55,maxHeight:520,bigMtnHeight:1700,bigMtnBase:3600,reliefMix:0.3,plainsMix:0.08,bays:1.5,shoreFlat:0.7}],
    ['Green isles','Low, gentle islands with rolling hills and sandy shores',{mapStyle:'peaks',worldSize:8192,landShare:0.6,maxHeight:260,bigMtnHeight:450,reliefMix:0.75,plainsMix:0.35,hillHeight:0.15,bays:1,shoreFlat:1.2}]],
  applyPreset(i){const pr=this.PRESETS[i];if(!pr)return;for(const id of [...this.KEYS,...this.genIds()])if(PDEF[id])this.np[id]=PDEF[id].def;Object.assign(this.np,pr[2]);this.fill();this.sync();this.preview();
    for(const b of document.querySelectorAll('#mmPresets button'))b.classList.toggle('on',+b.dataset.pr===i);UI.toast(pr[0]+': '+pr[1]);},
  /* every setting that shapes a new world (applied when the world is made), in folding groups below the basics */
  GROUPS:[['Land shape',d=>d.tab==='world'&&!/^bigMtn/.test(d.id)],['Big mountains',d=>d.tab==='world'&&/^bigMtn/.test(d.id)],['Erosion',d=>d.tab==='erosion'],['Rivers and lakes',d=>d.tab==='water'],
    ['Coast and sea',d=>d.tab==='sea'],['Trees and rocks',d=>d.tab==='trees'],['Villages and countryside',d=>d.tab==='life']],
  genIds(){return PORDER.filter(id=>{const d=PDEF[id];return !d.hide&&['world','water','veg','life'].includes(d.apply)&&!['seed','worldSize','mapStyle'].includes(id)&&!this.KEYS.includes(id);});},
  fmt(d,v){if(d.kind==='select'){const o=d.options.find(q=>String(q[0])===String(v));return o?o[1]:v;}if(d.kind==='check')return'';const st=+d.step||1,dg=st>=1?0:st>=0.1?1:2;return(+v).toFixed(dg)+(d.unit||'');},
  buildMore(){const box=$('#mmMore');if(!box||box.dataset.built)return;box.dataset.built=1;const ids=this.genIds();let html='';
    for(const [g,f] of this.GROUPS){const L=ids.filter(id=>f(PDEF[id]));if(!L.length)continue;
      html+=`<details class="mm-fold"><summary>${g}<small>${L.length}</small></summary><div class="mm-grid">`+L.map(id=>{const d=PDEF[id];
        /* choices as a row of buttons (the dropdowns were hard to tap on a phone) */
        if(d.kind==='select')return`<div class="mm-chs"><span>${d.label}</span><div>${d.options.map(o=>`<button type="button" data-mc="${id}" data-v="${o[0]}">${o[1]}</button>`).join('')}</div></div>`;
        if(d.kind==='check')return`<label class="mm-ck"><span>${d.label}</span><input type="checkbox" data-mk="${id}"></label>`;
        return`<label>${d.label} <b data-mv="${id}"></b><input type="range" data-mk="${id}" min="${d.min}" max="${d.max}" step="${d.step}"></label>`;}).join('')+`</div></details>`;}
    html+=`<button class="mm-b" id="mmDefaults">Reset these to the defaults</button>`;box.innerHTML=html;
    for(const e of box.querySelectorAll('[data-mk]')){const id=e.dataset.mk,d=PDEF[id];e.oninput=e.onchange=()=>{const v=d.kind==='check'?(e.checked?1:0):d.kind==='select'?(isNaN(+e.value)?e.value:+e.value):+e.value;this.np[id]=v;this.showVal(id);if(d.tab==='world'||d.tab==='erosion')this.preview();};}
    for(const b of box.querySelectorAll('[data-mc]'))b.onclick=()=>{const id=b.dataset.mc,v=b.dataset.v;this.np[id]=isNaN(+v)?v:+v;this.chips();if(PDEF[id].tab==='world'||PDEF[id].tab==='erosion')this.preview();};
    $('#mmDefaults').onclick=()=>{for(const id of [...this.genIds(),...this.KEYS])this.np[id]=PDEF[id].def;this.fill();this.preview();};},
  chips(){for(const b of document.querySelectorAll('#mmMore [data-mc]'))b.classList.toggle('on',String(this.np[b.dataset.mc])===b.dataset.v);},
  showVal(id){const b=document.querySelector(`#mmMore [data-mv="${id}"]`);if(b)b.textContent=this.fmt(PDEF[id],this.np[id]);},
  fill(){const np=this.np;for(const k of this.KEYS)$('#mm_'+k).value=np[k];for(const e of document.querySelectorAll('#mmMore [data-mk]')){const id=e.dataset.mk;if(PDEF[id].kind==='check')e.checked=!!+np[id];else e.value=np[id];this.showVal(id);}this.chips();
    const si=Math.max(0,this.SIZES.indexOf(+np.worldSize));$('#mmSize').value=si;this.sizeLabel();},
  sizeLabel(){const W=+this.np.worldSize,km=W/1024;$('#mmSizeV').textContent=`${km} × ${km} km`+(W>16384?' · heavy':W>=16384?' · large':'');},
  initNew(){const np=this.np={...P};np.mapStyle='peaks';np.islandGen=2;np.mtnGen=2;/* for now every new world is mountain islands (the other styles stay in the code) */this.buildMore();{const pe=$('#mmPresets');if(pe&&!pe.dataset.built){pe.dataset.built=1;pe.innerHTML=this.PRESETS.map((q,i)=>`<button type="button" data-pr="${i}"><b>${q[0]}</b><small>${q[1]}</small></button>`).join('');for(const b of pe.querySelectorAll('button'))b.onclick=()=>this.applyPreset(+b.dataset.pr);}}$('#mmExplore').checked=!!+P.exploreMode;$('#mmSeed').value=np.seed;this.fill();this.sync();this.preview();},
  sync(){const np=this.np;for(const b of document.querySelectorAll('#mmStyle button'))b.classList.toggle('on',b.dataset.v===np.mapStyle);for(const e of document.querySelectorAll('.mm-grid .isl'))e.style.display=np.mapStyle==='land'?'none':'';
    for(const e of document.querySelectorAll('.mm-grid .bm'))e.style.opacity=np.bigMtns>0?1:0.4;},
  preview(){clearTimeout(this.pt);this.pt=setTimeout(async()=>{const np=this.np,t0=performance.now();try{const L=await previewLand(np,160);drawPreview($('#mmPrev'),L,np);$('#mmPrevNote').textContent=`Preview without rivers and lakes · ${np.worldSize/1000} km · seed ${np.seed}`;}catch(e){Log.warn('preview: '+e.message);}},120);},
  start(){const np=this.np;if(!np)return;if(Bench.on){UI.toast('Leave the benchmark world first');return;}
    for(const k of ['worldSize','seed','mapStyle','islandGen','mtnGen',...this.KEYS,...this.genIds()])P[k]=np[k];/* islandGen: a new world always gets the current island layout (it was left at 1 from an older save: islands of fixed small sizes) */P.exploreMode=$('#mmExplore').checked?1:0;Explore.M=null;Explore.pending=null;Explore.fresh=!!P.exploreMode;try{Air.list=[];for(const m of Air.meshes.values())R.freeMesh(m);Air.meshes.clear();Air.cargo=null;Air.job=null;}catch(e){}paramChanged('mapStyle');Track.load(null);for(const t of Trains.list){t.whistle=false;Sfx.whistle(t,false);}Trains.list=[];Trains.sel=-1;
    Roads.list=[];Buses.stops=[];Buses.list=[];Buses.pending=0;Buses.pendingList=null;Fleet.unlocks={dd:false};Rescue.load_(null);Fires.load_(null);Fish.load_(null);if(typeof Ships!=='undefined')Ships.load_(null);Ledger.days=0;Ledger.simT=0;Ledger.plane.led=null;Ledger.beaver.led=null;Life.roadsDirty=true;Life.pendingV=null;Money.cash=200000;Money.loan=0;Money.paid=new Map();Money.paidSt=new Set();Money.paidTr=new Set();Money.inited=false;
    App.camLoaded=false;App.placedCam=false;UI.refreshAll();this.hide();App.generate(0);},
  saveInfo(){let t='No save yet';try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(s)t=`Last save: ${new Date(s.savedAt||Date.now()).toLocaleString()} · seed ${s.params.seed}, ${s.params.worldSize/1000} km${s.params.mapStyle&&s.params.mapStyle!=='land'?', '+s.params.mapStyle:''}`;}catch(e){}$('#mmSaveInfo').textContent=t+' · the game also saves itself every few minutes. Two files: the save (your game, small) and the world file (the generated world, kept on this device; back it up to keep a world without generating it again).';try{Tiles.ui();}catch(e){}},
  initQ(){for(const b of document.querySelectorAll('#mmPreset button'))b.classList.toggle('on',b.dataset.v===P.preset);for(const k of ['kitLod','renderScale'])$('#mmq_'+k).value=P[k];},
  bind(){const on=(id,f)=>{$(id).onclick=f;};on('#mmCont',()=>this.hide());on('#mmNew',()=>this.page('new'));on('#mmSaves',()=>this.page('saves'));on('#mmQual',()=>this.page('quality'));
    on('#mmSet',()=>{this.hide();$('#btnMenu').click();});on('#mmFly',()=>{this.hide();if((typeof Plane!=='undefined'))Plane.choose();});for(const b of ['#mmBack1','#mmBack2','#mmBack3'])on(b,()=>this.page('home'));
    on('#mmStart',()=>this.start());on('#mmDice',()=>{this.np.seed=1+Math.floor(Math.random()*99998);$('#mmSeed').value=this.np.seed;this.preview();});
    $('#mmSeed').onchange=()=>{this.np.seed=clamp(Math.round(+$('#mmSeed').value||1),1,99999);this.preview();};$('#mmSize').oninput=()=>{this.np.worldSize=this.SIZES[+$('#mmSize').value]||8192;this.sizeLabel();this.preview();};
    for(const b of document.querySelectorAll('#mmStyle button'))b.onclick=()=>{this.np.mapStyle=b.dataset.v;this.sync();this.preview();};
    for(const k of this.KEYS)$('#mm_'+k).oninput=()=>{this.np[k]=+$('#mm_'+k).value;this.sync();this.preview();};
    on('#mmSaveNow',()=>{App.save();this.saveInfo();});on('#mmLoad',()=>{this.hide();App.load();});on('#mmExport',()=>App.exportJSON());on('#mmImport',()=>$('#file').click());on('#mmWExport',()=>WorldFile.exportFile());on('#mmWImport',()=>$('#wfile').click());$('#wfile').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f){this.hide();WorldFile.importFile(f);}};on('#mmLog',()=>App.exportLog());
    for(const b of document.querySelectorAll('#mmPreset button'))b.onclick=()=>{P.preset=b.dataset.v;applyPreset(b.dataset.v);UI.refreshAll();this.initQ();};
    for(const k of ['kitLod','renderScale'])$('#mmq_'+k).oninput=()=>{P[k]=+$('#mmq_'+k).value;paramChanged(k);UI.refresh(k);};}};
// ---- the map: the world seen straight down without clouds, mist or haze; on top of it (a 2D canvas) the railways, the bus and lorry
// routes, the trains, and symbols with names for the villages (by size), stations, bus stops, farms, mines, sawmills, workshops, castles
// and docks. One finger pans, two pinch to zoom (the usual camera controls, rotation locked); a tap on a symbol leaves the map there.
const MapView={on:false,keep:null,cam:null,hits:[],paths:new Map(),
  toggle(){this.on?this.close():this.open();},
  open(){if(!App.T||this.on)return;if(Build.active)Build.exit();if(Drive.active)Drive.exit();this.on=true;this.cam=Cam.state();this.keep={mode:Cam.mode,fog:P.fogDensity,bokeh:P.bokeh,skip:R.skip};
    P.fogDensity=0;P.bokeh=0;R.skip={...R.skip,clouds:1,mist:1};const T=App.T;Cam.mode='free';Cam.anim=null;Cam.target=[T.W/2,0,T.W/2];const asp=innerWidth/innerHeight,fy=(asp<1?64:50)*Math.PI/180;Cam.dist=T.W/2/(Math.tan(fy/2)*Math.min(1,asp))*1.05;Cam.pitch=1.52;Cam.yaw=0;
    document.body.classList.add('mapmode');$('#mapOv').hidden=false;$('#mapBar').hidden=!!Fleet.draft;this.paths.clear();this.legend();MapUI.bar();MapUI.list();},
  close(){if(!this.on)return;this.on=false;this.focus=null;P.fogDensity=this.keep.fog;P.bokeh=this.keep.bokeh;R.skip=this.keep.skip||{};Cam.mode=this.keep.mode==='free'?'free':this.keep.mode;
    if(this.fly){Cam.setState(this.cam);Cam.flyTo(this.fly,160);this.fly=null;}else Cam.setState(this.cam);
    document.body.classList.remove('mapmode');$('#mapOv').hidden=true;$('#mapBar').hidden=true;$('#mapKey').hidden=true;MapUI.list();StatsUI.close();Store.close();if(Fleet.draft&&Fleet.draft.tab==='map'){Fleet.draft.tab='list';FleetUI.refresh();}},
  /* the colour key (top left, folds to its title): the dot / ring colour of each kind of place, and the route lines */
  KEY:[['town','#ffe066','Town'],['village','#f29e4c','Village'],['hamlet','#8fd16a','Hamlet'],['station','#ff5a4a','Station'],['farm','#d4b483','Farm'],['mine','#9aa3b5','Mine'],['factory','#e2794f','Factory'],['saw','#2ec4b6','Sawmill · workshop'],['castle','#b39cff','Castle'],['harbour','#5fb3ff','Harbour'],['stop','#ffffff','Bus / lorry stop'],['air','#ffe07a','Airstrip']],
  col(k){const e=this.KEY.find(q=>q[0]===k);return e?e[1]:'#c9a14a';},
  legend(){const el=$('#mapKey');if(!el)return;el.hidden=false;if(this.keyFold==null)this.keyFold=innerWidth<500;
    el.innerHTML=`<button class="mk-h">${this.keyFold?'▸':'▾'} Legend</button>`+(this.keyFold?'':`<div class="mk-l">${this.KEY.map(([k,c,n])=>`<span><i style="background:${c}"${k==='air'?' class="sq"':''}></i>${n}</span>`).join('')}<span><b style="color:#ff5a4a">━</b> Railway</span><span><b style="color:#4fb4ff">┅</b> Bus route</span><span><b style="color:#ffb340">· ·</b> Lorry route</span></div><div class="mk-n">Zoomed out, places that would overlap become dots</div>`);
    el.querySelector('.mk-h').onclick=()=>{this.keyFold=!this.keyFold;this.legend();};},
  /* the camera is held straight down while the map is open */
  hold(){if(!this.on)return;Cam.pitch=1.52;Cam.yaw=0;Cam.mode='free';Cam.dist=clamp(Cam.dist,60,App.T?App.T.W*2.4:20000);},
  /* 4.53: the map is a painted picture, not the 3D world from far above (that was slow and flickered on big worlds). Painted once per
     world (and per opening in exploration mode, where unexplored land is mist): hill-shaded land tinted by height (green lowland,
     brown upland, grey rock, snow on the tops), forests darker, roads tan, water shaded by its true depth. Drawn in 8 x 8 pieces, each
     placed by the camera's own projection at sea level, so the railways, routes and places drawn over it (also at sea level) sit
     exactly on it. The 3D frame is skipped while the map is open (the main loop). */
  paint(){const T=App.T;if(!T)return null;const ex=typeof Explore!=='undefined'&&Explore.on&&Explore.on();if(this.img&&this.imgT===T&&!ex)return this.img;
    const N=T.N,cs=T.cs,H=T.H,Wt=T.water,D=T.data,RM=T.roadMask,sea=T.sea,cv=document.createElement('canvas');cv.width=N;cv.height=N;const g=cv.getContext('2d'),im=g.createImageData(N,N),px=im.data;
    const lx=-0.55,ly=0.62,lz=-0.55,mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t],sm=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
    const G0=[0.52,0.67,0.35],G1=[0.62,0.63,0.4],BR=[0.57,0.5,0.39],RK=[0.56,0.55,0.53],SN=[0.95,0.96,0.98],FO=[0.24,0.4,0.22],SH=[0.62,0.8,0.9],DP=[0.06,0.16,0.34],RD=[0.86,0.8,0.64],MI=[0.55,0.58,0.6];
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){const k=j*N+i,h=H[k],o=k*4;let c,wl=null;
      if(Wt&&Wt[k*4+3]>0)wl=Wt[k*4];else if(sea!=null&&h<sea)wl=sea;
      if(wl!=null&&wl>h){c=mix(SH,DP,Math.min(1,(wl-h)/60));}
      else{const hx=(H[j*N+Math.min(N-1,i+1)]-H[j*N+Math.max(0,i-1)])/(2*cs),hz=(H[Math.min(N-1,j+1)*N+i]-H[Math.max(0,j-1)*N+i])/(2*cs),nl=1/Math.hypot(hx,1,hz),sl=Math.hypot(hx,hz);
        const a=h-(sea||0),lam=(-hx*lx+ly-hz*lz)*nl;c=mix(G0,G1,sm(0,500,a));c=mix(c,BR,sm(450,1100,a));c=mix(c,RK,Math.max(sm(1000,1700,a),sm(0.6,1.1,sl)));
        if(D)c=mix(c,FO,(D[k*4+3]/255)*0.85*(1-sm(1200,1700,a)));c=mix(c,SN,sm(1750,2300,a)*(1-sm(0.9,1.4,sl)*0.6));if(RM&&RM[k])c=mix(c,RD,0.75);
        const f=0.32+0.86*Math.max(0,lam);c=[c[0]*f,c[1]*f,c[2]*f];}
      if(ex&&!Explore.seen((i+0.5)*cs,(j+0.5)*cs))c=mix(c,MI,0.85);
      px[o]=Math.min(255,c[0]*255);px[o+1]=Math.min(255,c[1]*255);px[o+2]=Math.min(255,c[2]*255);px[o+3]=255;}
    g.putImageData(im,0,0);this.img=cv;this.imgT=T;return cv;},
  // world (x, z) to the screen: set by draw() each frame (the map's flat mapping)
  S(x,z){return Cam.toScreen(x,0,z);},
  busPath(a,b){const k=a.id+'>'+b.id;if(!this.paths.has(k)){let p=null;try{p=Buses.roadPath([a.rx,a.rz],[b.rx,b.rz]);}catch(e){}this.paths.set(k,p&&p.length>1?p:[[a.rx,a.rz],[b.rx,b.rz]]);}return this.paths.get(k);},
  draw(){if(!this.on||!App.T)return;const cv=$('#mapOv'),dpr=Math.min(2,devicePixelRatio||1),W=innerWidth,H=innerHeight;if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);}
    const g=cv.getContext('2d');const T=App.T;this.hits=[];
    /* one flat (affine) mapping from the world to the screen, matched to the camera at the view's centre: the picture and everything on it
       use it, so nothing drifts or leaves seams (the camera looks almost, but not exactly, straight down) */
    const c=Cam.target,p0=Cam.toScreen(c[0],0,c[2]),pa=Cam.toScreen(c[0]+100,0,c[2]),pb=Cam.toScreen(c[0],0,c[2]+100);if(!p0||!pa||!pb)return;
    const ax=[(pa[0]-p0[0])/100,(pa[1]-p0[1])/100],az=[(pb[0]-p0[0])/100,(pb[1]-p0[1])/100],S=(x,z)=>[p0[0]+ax[0]*(x-c[0])+az[0]*(z-c[2]),p0[1]+ax[1]*(x-c[0])+az[1]*(z-c[2])];this.S=S;
    g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle='#10294e';g.fillRect(0,0,W,H);
    {const img=this.paint();if(img){const cs=T.W/img.width,o=S(0,0);g.imageSmoothingEnabled=true;g.setTransform(dpr*ax[0]*cs,dpr*ax[1]*cs,dpr*az[0]*cs,dpr*az[1]*cs,dpr*o[0],dpr*o[1]);g.drawImage(img,0,0);}}
    g.setTransform(dpr,0,0,dpr,0,0);
    const line=(pts,col,w,dash,casing)=>{const sp=pts.map(p=>S(p[0],p[1])).filter(Boolean);if(sp.length<2)return;g.setLineDash(dash||[]);g.lineJoin='round';g.lineCap='round';
      if(casing){g.strokeStyle=casing;g.lineWidth=w+3;g.beginPath();sp.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke();}
      g.strokeStyle=col;g.lineWidth=w;g.beginPath();sp.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke();g.setLineDash([]);};
    // railways
    for(const sg of Track.segs){if(sg.pend)continue;const n=Math.max(2,Math.ceil(sg.L/12)),pts=[];for(let k=0;k<=n;k++){const t=sg.L*k/n,q=segPoint(sg,t);pts.push([q[0],q[1]]);}line(pts,'#ff5a4a',3.5,null,'#2a0d0acc');}
    // bus and lorry routes (each leg along the roads)
    const plan=Fleet.draft&&Fleet.draft.tab==='map'?Fleet.draft:null;Buses.list.forEach((b,bi)=>{if(plan?(b.mapHidden||b===plan.edit):!MapUI.shows(b))return;const RS=Buses.route(b);if(RS.length<2)return;const col=Fleet.color(b),off=(bi%3-1)*Cam.dist*0.004;for(let k=0;k<RS.length;k++){const a=RS[k],c=RS[(k+1)%RS.length],p=this.busPath(a,c);line(p.map(q=>[q[0]+off,q[1]+off]),col,2.5,b.goods?[2,5]:[7,5],'#0008');}});

    if(typeof Ships!=='undefined')Ships.mapDraw(g,(x,z)=>S(x,z));/* the colliers and their sea routes */
    // vehicles: trains and buses as dots
    for(const tr of Trains.list){const p=tr.poses&&tr.poses[0];if(!p||!MapUI.shows(tr))continue;const q=S(p.c[0],p.c[2]);if(q){g.fillStyle='#fff';g.strokeStyle='#000';g.lineWidth=2;g.beginPath();g.arc(q[0],q[1],5,0,6.283);g.fill();g.stroke();}}
    if(MapUI.shows(Ledger.plane)&&!plan){for(const a of Air.list){const q=S(a.x,a.z);if(q){g.fillStyle='#ffe07a';g.strokeStyle='#000';g.lineWidth=1.5;g.fillRect(q[0]-6,q[1]-2.5,12,5);g.strokeRect(q[0]-6,q[1]-2.5,12,5);}}if(Plane.on&&Plane.st){const q=S(Plane.st.p[0],Plane.st.p[2]);if(q){g.fillStyle='#ffe07a';g.strokeStyle='#000';g.lineWidth=2;g.beginPath();g.moveTo(q[0],q[1]-7);g.lineTo(q[0]+6,q[1]+5);g.lineTo(q[0]-6,q[1]+5);g.closePath();g.fill();g.stroke();}}}
    for(const b of Buses.list){if(plan?b.mapHidden:!MapUI.shows(b))continue;const q=S(b.x,b.z);if(q){g.fillStyle=Fleet.color(b);g.strokeStyle='#000';g.lineWidth=1.5;g.beginPath();g.arc(q[0],q[1],4,0,6.283);g.fill();g.stroke();}}
    // places: an icon in a ring of its kind's colour, with its name; where icons would overlap (zoomed out) a plain dot of that colour
    const SY=[],sym=(x,z,icon,name,size,kind)=>{if(!Explore.seen(x,z))return;/* exploration: nothing shows in the mist */const q=S(x,z);if(!q||q[0]<-40||q[1]<-40||q[0]>W+40||q[1]>H+40)return;SY.push({q,x,z,icon,name,size,col:this.col(kind),r:size/2+5,big:kind==='town'});};
    const LV=Life.LEVELS||[];for(const v of Life.villages){const lv=v.level|0,big=lv>=LV.length-1,mid=lv>=1;sym(v.x,v.z,big?'🏰':mid?'🏘️':'🏡',`${v.name} · ${(LV[lv]&&LV[lv].name)||''}`,big?26:mid?22:18,big?'town':mid?'village':'hamlet');}
    for(const si of Life.stInfo||[]){if(si.parent)continue;sym(si.x,si.z,si.st.farm?'🌾':si.cargo?'🚂':'🚉',si.st.name,18,'station');}
    for(const c of Life.castleList())sym(c.x,c.z,'🏯',c.name,18,'castle');
    for(const fm of Life.farms())if(fm&&fm.v.farmOwned)sym(fm.x,fm.z,'🌾',fm.v.name+' farm',16,'farm');
    for(const [kind,L] of Life.inds())L.forEach(m=>{if(!Life.indOn(kind,m))return;sym(m.x,m.z,Life.indIcon(kind),Life.indLabel(kind,m),16,kind==='mine'?'mine':kind==='factory'?'factory':'saw');});
    for(const d of Life.docks||[])if(d.v&&d.v.docksOwned)sym(d.sx,d.sz,'⚓','',14,'harbour');
    if(typeof Port!=='undefined')for(const s of Port.S)if(s.built){const c=Port.centre(s);sym(c[0],c[2],'🏗️',s.v.name+' harbour',18,'harbour');}
    for(const st of Buses.stops)sym(st.x,st.z,st.sawmill||st.workshop?'🚚':'🚏',st.name,14,'stop');
    // which become dots: any icon whose ring would touch another's (bigger places keep their icon longest: they are tested first)
    SY.sort((a,b)=>b.size-a.size);const kept=[];for(const o of SY){o.dot=kept.some(k=>Math.hypot(k.q[0]-o.q[0],k.q[1]-o.q[1])<k.r+o.r+2);if(!o.dot)kept.push(o);}
    {const nd=SY.filter(o=>o.dot).length;if(nd>SY.length*0.35)for(const o of SY)o.dot=true;}/* mostly overlapping: all dots, so the map reads as one picture */
    for(const o of SY)if(o.dot){const r=o.big?6:4.5;g.fillStyle=o.col;g.strokeStyle='#000c';g.lineWidth=1.5;g.beginPath();g.arc(o.q[0],o.q[1],r,0,6.283);g.fill();g.stroke();this.hits.push({x:o.q[0],y:o.q[1],r:r+8,wx:o.x,wz:o.z});}
    const boxes=[];for(const o of SY){if(o.dot)continue;const q=o.q,r=o.r;let name=o.name;g.fillStyle='#15191ae6';g.strokeStyle=o.col;g.lineWidth=2.5;g.beginPath();g.arc(q[0],q[1],r,0,6.283);g.fill();g.stroke();
      g.font=`${o.size}px system-ui`;g.textAlign='center';g.textBaseline='middle';g.fillText(o.icon,q[0],q[1]+1);if(name){g.font=`600 ${o.size>20?14:12}px system-ui`;const tw=g.measureText(name).width/2+3,bx=[q[0]-tw,q[1]+r+2,q[0]+tw,q[1]+r+17];if(boxes.some(b=>b[0]<bx[2]&&b[2]>bx[0]&&b[1]<bx[3]&&b[3]>bx[1]))name='';else boxes.push(bx);}
      if(name){g.lineWidth=3;g.strokeStyle='#000c';g.strokeText(name,q[0],q[1]+r+9);g.fillStyle='#fff';g.fillText(name,q[0],q[1]+r+9);}this.hits.push({x:q[0],y:q[1],r:r+6,wx:o.x,wz:o.z});}
    if(plan)this.drawPlan(plan,line,S,g);
    if(this.focus)this.drawFocus(this.focus,S,g,W);},
  /* 4.57: the mine panel's "Show on the map": gold lines from the mine to each place that takes its ore (dashed across the sea, by
     harbour and collier), pulsing rings, and a note at the top */
  drawFocus(f,S,g,W){const a=S(f.x,f.z);if(!a)return;const t=(performance.now()-f.t0)/1000,pl=0.5+0.5*Math.sin(t*4);
    for(const d of f.D){const b=S(d.x,d.z);if(!b)continue;g.setLineDash(d.same?[]:[9,7]);g.lineCap='round';g.strokeStyle='#000a';g.lineWidth=6;g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();
      g.strokeStyle=d.hb?'#5fb3ff':'#ffd24a';g.lineWidth=3;g.stroke();g.setLineDash([]);g.lineWidth=3;g.beginPath();g.arc(b[0],b[1],20+pl*6,0,6.283);g.stroke();}
    g.strokeStyle='#ffd24a';g.lineWidth=4;g.beginPath();g.arc(a[0],a[1],18+pl*5,0,6.283);g.stroke();
    const F=f.D.filter(d=>!d.hb),near=F.find(d=>d.same),msg=!F.length?`Nothing takes this ore yet${f.D.length?': the blue lines go to the harbours that ship it':''}`:near?`${f.name}: nearest by rail is ${near.name}`:`${f.name}: nothing on this island takes it. Ship it: train to a harbour here, collier across, train on to the factory (dashed)`;
    g.font='600 14px system-ui';const tw=Math.min(W-24,g.measureText(msg).width+24);g.fillStyle='#15191ae6';g.fillRect((W-tw)/2,58,tw,28);g.fillStyle='#ffd24a';g.textAlign='center';g.textBaseline='middle';g.fillText(msg,W/2,72,W-36);},
  /* planning a route on the map: every place it can visit gets a ring (gold, numbered in driving order, when chosen) and the route is drawn
     over the roads, thick, from the vehicle's start */
  drawPlan(d,line,S,g){const R2=d.route;if(R2.length>1)for(let k=0;k<R2.length;k++){const a=R2[k],c=R2[(k+1)%R2.length],p=Fleet.dist(a,c).path;line(p,'#fff',4,null,'#000c');}
    if(R2.length){const p=Fleet.dist({x:d.x,z:d.z},R2[0]).path;line(p,'#ffffffaa',2,[4,4]);}
    const st=S(d.x,d.z);if(st){g.fillStyle='#fff';g.strokeStyle='#000';g.lineWidth=2;g.beginPath();g.rect(st[0]-6,st[1]-6,12,12);g.fill();g.stroke();}
    for(const c of d.C){const q=S(c.x,c.z);if(!q)continue;const on=d.sel.includes(c.key);/* a ring round the place; chosen: gold with its number in a badge */g.lineWidth=on?4:2.5;g.strokeStyle=on?'#e8c35a':'#e8c35acc';g.setLineDash(on?[]:[4,3]);g.beginPath();g.arc(q[0],q[1],19,0,6.283);g.stroke();g.setLineDash([]);
      if(on){const bx=q[0]+15,by=q[1]-15;g.fillStyle='#e8c35a';g.strokeStyle='#15191a';g.lineWidth=2;g.beginPath();g.arc(bx,by,10,0,6.283);g.fill();g.stroke();g.fillStyle='#15191a';g.font='700 12px system-ui';g.textAlign='center';g.textBaseline='middle';g.fillText(String(d.route.indexOf(c)+1),bx,by+1);}
      if(c.kind!=='v'){g.fillStyle='#15191ae6';g.beginPath();g.arc(q[0],q[1],9,0,6.283);g.fill();g.fillStyle='#e8c35a';g.font='600 11px system-ui';g.textAlign='center';g.textBaseline='middle';g.fillText(c.kind==='sawmill'?'S':'W',q[0],q[1]+1);}}},
  planTap(x,y){const d=Fleet.draft;let best=null,bd=34;for(const c of d.C){const q=this.S(c.x,c.z);if(!q)continue;const dd=Math.hypot(q[0]-x,q[1]-y);if(dd<bd){bd=dd;best=c;}}
    if(!best){/* a village symbol drawn a little off its stop */for(const h of this.hits){const dd=Math.hypot(h.x-x,h.y-y);if(dd<h.r&&dd<bd){const c=d.C.find(c=>c.kind==='v'&&Math.hypot(c.v.x-h.wx,c.v.z-h.wz)<5);if(c){bd=dd;best=c;}}}}
    if(best)Fleet.toggle(best.key);},
  tap(x,y){if(Fleet.draft&&Fleet.draft.tab==='map'){this.planTap(x,y);return true;}let best=null,bd=1e9;for(const h of this.hits){const d=Math.hypot(h.x-x,h.y-y);if(d<h.r&&d<bd){bd=d;best=h;}}if(!best)return false;this.fly=[best.wx,R.sampleHr(App.T,best.wx,best.wz),best.wz];this.close();return true;}};
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
    if(from===4&&this.T){this.busy=true;try{const T=this.T;Life.generate(T);R.refreshGround(T);if(R.buildStreams)R.buildStreams(T);Weather.setWorld(T);try{Explore.worldReady(T);}catch(e){Log.err('explore: '+(e.stack||e));}}catch(e){Log.err('villages failed: '+(e.stack||e));}this.busy=false;
      if(this.pendingFrom<99){const f=this.pendingFrom;this.pendingFrom=99;this.generate(f);}return;}
    this.busy=true;const t0=performance.now(),show=from<=2;const times=[];
    const W={0:[0,0.08],1:[0.08,0.36],2:[0.44,0.1],3:[0.54,0.08]};/* the villages take the rest (0.62-0.96): on a 16 km map they are a third of the time */let st=W[from];
    const y=makeYielder((f,l)=>{if(show)UI.progress(true,st[0]+f*st[1],l);});
    if(show){UI.progress(true,0,'Starting');LoadScene.show(true);}await new Promise(r=>setTimeout(r,30));
    try{
      let t=performance.now(),T,cached=false,ckey=null,fromFile=null;const wkey=from===0&&!Bench.on&&+P.worldFile!==0&&WorldFile.ok()?WorldFile.key(P):null;
      /* the whole world from the device (OPFS): no generating at all; the save's track is carved in afresh */
      if(wkey){if(show)UI.progress(true,0.03,'Reading the world from this device');fromFile=await WorldFile.load(wkey);
        if(fromFile){T=fromFile.T;Object.assign(Life,fromFile.L);if(Track.segs&&Track.segs.length&&T.H0){T.H.set(T.H0);carveTrack(T);computeNormals(T,T.nrm);}Life.applyTrackMask(T);R.computeRenderHeights(T);Life.uploaded=false;Life.kitDirty=true;Life.roadsDirty=true;
          this.base=null;this.eroded=null;times.push('world file '+(performance.now()-t).toFixed(0));t=performance.now();}}
      if(!fromFile){
      if(from===0&&+P.worldCache!==0&&!Bench.on){ckey=WorldCache.key(P);if(show)UI.progress(true,0.05,'Loading the land from the cache');const c=await WorldCache.load(ckey);
        if(c){T=c;cached=true;this.base=null;this.eroded=null;times.push('land from cache '+(performance.now()-t).toFixed(0));t=performance.now();}}
      if(!cached){
      if(from<=0){st=W[0];this.base=await genTerrain(P,y);times.push('terrain '+(performance.now()-t).toFixed(0));t=performance.now();}
      if(from<=1){st=W[1];const B=this.base;const E={N:B.N,W:B.W,cs:B.cs,mm:B.mm,norm:B.norm,sea:B.sea,H:new Float32Array(B.H),flow:null,depo:null};
        if(P.erosionOn&&P.dropletsPerCell>0)await genErosion(P,E,y);this.eroded=E;times.push('erosion '+(performance.now()-t).toFixed(0));t=performance.now();}
      if(from<=2){st=W[2];const E=this.eroded;T={...E,H:new Float32Array(E.H),stats:{}};
        await genWater(P,T,y);if(bigLakeArea(T)<Math.min(400000,T.W*T.W*0.025)){const T2={...E,H:new Float32Array(E.H),stats:{}},b=carveLakeBowl(T2,P.seed|0);await genWater(P,T2,y);T=T2;Log.info(`no big lake: carved a lake basin (r ${b.R.toFixed(0)} m) at ${b.x.toFixed(0)},${b.z.toFixed(0)}, now ${(bigLakeArea(T)/10000).toFixed(0)} ha`);}{const nf=flattenShores(P,T);if(nf)Log.info(`flat lake shores: ${nf} cells`);}T.H0=new Float32Array(T.H);carveTrack(T);genMaps(P,T);times.push('water+maps '+(performance.now()-t).toFixed(0));t=performance.now();}
      else T=this.T;
      st=W[3];if(from<=3){await genVegetation(P,T,y);T.vegOrig=null;T.Hr=null;times.push('vegetation '+(performance.now()-t).toFixed(0));t=performance.now();
        if(+P.worldCache!==0&&!Bench.on)WorldCache.store(ckey||WorldCache.key(P),T);}
      }
      if(show)UI.progress(true,0.62,'Villages and fields');await new Promise(r=>setTimeout(r,0));
      {const before=new Map(Object.keys(Life).map(k=>[k,Life[k]]));const g=Life.genSteps(T);let r,last=Date.now();while(!(r=g.next()).done){const [f,l]=r.value;if(show&&Date.now()-last>40){UI.progress(true,0.62+f*0.34,l);await new Promise(q=>setTimeout(q,0));last=Date.now();}}
        /* everything the villages step set on Life goes into the world file with the land (written in the background) */
        if(wkey){const L={};for(const k of Object.keys(Life))if(typeof Life[k]!=='function'&&Life[k]!==before.get(k))L[k]=Life[k];const prm={};for(const id of PORDER){const a=PDEF[id].apply;if(a==='world'||a==='water'||a==='veg'||a==='life')prm[id]=P[id];}if(show)UI.progress(true,0.965,'Storing the world on this device');WorldFile.save(T,L,wkey,prm);}}
      }
      if(show){UI.progress(true,0.97,'Building the 3D world');await new Promise(q=>setTimeout(q,0));}
      times.push('villages '+(performance.now()-t).toFixed(0));
      this.T=T;R.uploadWorld(T);Weather.setWorld(T);try{Explore.worldReady(T);}catch(e){Log.err('explore: '+(e.stack||e));}if(this.pendingTrains){Trains.load(this.pendingTrains);this.pendingTrains=null;}else Trains.trackChanged();
      const s=T.stats;Log.info(`generate(from ${from}) ${(performance.now()-t0).toFixed(0)} ms [${times.join(', ')}] seed ${P.seed} ${T.W}m/${T.N}px lakes ${s.lakes} riverCells ${s.riverCells} falls ${s.fallCells} gorgeCells ${s.carvedCells||0} trees ${s.trees} bushes ${s.bushes} rocks ${s.rocks}`);
      $('#worldinfo').textContent=`Seed ${P.seed}: ${T.W/1000} km world, ${s.lakes} lakes, ${s.villages} villages with ${s.houses} houses, ${s.fields} fields, ${s.mills} windmills, ${s.trees.toLocaleString()} trees.`;
      if(from===0){Pending.world=false;UI.markGenerate(false);}
      if(!this.placedCam){this.placedCam=true;if(!this.camLoaded)this.frameWorld();}
    }catch(e){Log.err('generation failed: '+(e.stack||e));UI.toast('Generation failed — export the debug log');}
    UI.progress(false);LoadScene.show(false);this.busy=false;
    if(this.pendingFrom<99){const f=this.pendingFrom;this.pendingFrom=99;this.generate(f);}
  },
  frameWorld(){const T=this.T;const v=Life.villages.slice().sort((a,b)=>(b.houses?b.houses.length:0)-(a.houses?a.houses.length:0))[0];/* the biggest village */const x=v?v.x:T.W*0.5,z=v?v.z:T.W*0.5;Cam.target=[x,sampleH(T,x,z),z];Cam.dist=v?420:T.W*0.6;Cam.pitch=0.55;Cam.yaw=0.8;},
  applyPending(){
    if(Pending.shadow){Pending.shadow=false;R.setupShadows();}
    if(Pending.track){Pending.track=false;this.trackChanged();}
    if(Pending.streams){Pending.streams=false;if(this.T)R.buildStreams(this.T);}
    if(Pending.water){Pending.water=false;Pending.veg=false;this.generate(2);}
    else if(Pending.veg){Pending.veg=false;Pending.life=Pending.smooth=false;this.generate(3);}
    else if(Pending.life||Pending.smooth){Pending.life=Pending.smooth=false;this.generate(4);}
  },
  /* 4.32.0: only the area round the track pieces added or removed since the last time is rebuilt (heights restored and carved, drawn heights);
     the roads are re-planned only when that area touches one. A full rebuild took seconds per piece on big maps */
  trackChanged(){Net.changed();const T=this.T;if(!T||!T.H0)return;{const ss=Track.stations.filter(q=>!q.port).map(q=>q.id+':'+q.sid+':'+Math.round(q.t)+':'+(q.len||44)).join('|');if(ss!==this._stSig){if(this._stSig!=null)Pending.streams=true;this._stSig=ss;}}/* 4.57.1: streams are cut at station yards (R.cutStreams) */const t0=performance.now(),N=T.N,cs=T.cs,sig=new Map();for(const s of Track.segs)sig.set(s.id,s);
    const old=this._segSig;this._segSig=sig;let rc=null;
    if(old){const ch=[...[...sig.values()].filter(s=>old.get(s.id)!==s),...[...old.values()].filter(s=>!sig.has(s.id))];if(ch.length&&ch.length<40){let x0=1e9,z0=1e9,x1=-1e9,z1=-1e9;for(const s of ch)for(let i=0;i<=16;i++){const p=segPoint(s,s.L*i/16);x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);z0=Math.min(z0,p[1]);z1=Math.max(z1,p[1]);}
      const mg=110;rc={i0:Math.max(0,Math.floor((x0-mg)/cs)),i1:Math.min(N-1,Math.ceil((x1+mg)/cs)),j0:Math.max(0,Math.floor((z0-mg)/cs)),j1:Math.min(N-1,Math.ceil((z1+mg)/cs))};}}
    if(rc){for(let j=rc.j0;j<=rc.j1;j++){const r=j*N;T.H.set(T.H0.subarray(r+rc.i0,r+rc.i1+1),r+rc.i0);}}else T.H.set(T.H0);
    carveTrack(T);computeNormals(T,T.nrm);R.updateTerrain(T,rc);if(rc&&Life.roads&&Life.roads.some(r=>{const p=r.p||r;for(let k=0;k+1<p.length;k+=2){const i=p[k]/cs,j=p[k+1]/cs;if(i>=rc.i0&&i<=rc.i1&&j>=rc.j0&&j<=rc.j1)return true;}return false;}))Life.roadsDirty=true;if(Life.rc)R.buildRoadRibbons(Life.rc);
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
    Roads.list=[];Buses.stops=[];Buses.list=[];Buses.pending=0;Buses.pendingList=null;Fleet.unlocks={dd:false};Rescue.load_(null);Fires.load_(null);Fish.load_(null);if(typeof Ships!=='undefined')Ships.load_(null);Ledger.days=0;Ledger.simT=0;Ledger.plane.led=null;Life.roadsDirty=true;Life.pendingV=null;Money.cash=200000;Money.loan=0;Money.paid=new Map();Money.paidSt=new Set();Money.paidTr=new Set();Money.inited=false;applyPreset(P.preset,true);UI.refreshAll();this.camLoaded=false;this.placedCam=false;R.setupShadows();this.generate(0);}
};

// ---- quick sky sheet: time, speed, season and weather without opening the settings
const Sky={
  /* the camera settings under the clock's ⚙: a field-of-view slider for each flying view (the change shows at once) */
  fovUI(){const el=$('#skyFov');el.innerHTML=[['chase','Chase'],['cockpit','Cockpit'],['nose','Front'],['wing','Wing'],['tower','Tower'],['orbit','Orbit']].map(([k,n])=>`<label><span>${n}</span><input type="range" min="30" max="110" step="1" data-fov="${k}" value="${P['fov_'+k]}"><b>${P['fov_'+k]}°</b></label>`).join('')+'<button id="skyFovReset" style="margin-top:4px">Reset</button>';
    for(const i of el.querySelectorAll('[data-fov]'))i.oninput=()=>{P['fov_'+i.dataset.fov]=+i.value;i.nextElementSibling.textContent=i.value+'°';UI.refresh&&UI.refresh('fov_'+i.dataset.fov);};
    $('#skyFovReset').onclick=()=>{for(const k of ['chase','cockpit','nose','wing','tower','orbit'])P['fov_'+k]=PDEF['fov_'+k].def;this.fovUI();};},
  bind(){$('#btnSky').onclick=()=>{const s=$('#skySheet');s.hidden=!s.hidden;this.refresh();};
    $('#skyTime').oninput=e=>{P.timeOfDay=+e.target.value;UI.refresh('timeOfDay');this.clock();};
    for(const b of document.querySelectorAll('#skySheet [data-speed]'))b.onclick=()=>{P.timeSpeed=+b.dataset.speed;UI.refresh('timeSpeed');this.refresh();};
    for(const b of document.querySelectorAll('#skySheet [data-season]'))b.onclick=()=>{P.season=b.dataset.season;UI.refresh('season');this.refresh();};
    for(const b of document.querySelectorAll('#skySheet [data-wx]'))b.onclick=()=>{P.weather=b.dataset.wx;UI.refresh('weather');if(P.weather==='auto')Weather.autoT=0;this.refresh();};
    $('#skyMusic').onclick=()=>{P.music=P.music?0:1;UI.refresh('music');if(P.music&&!Sfx.on)Sfx.start();Sfx.setPref(Sfx.on?(P.music?'all':'sfx'):'off');Sfx.syncBtn();this.refresh();};
    $('#skyClose').onclick=()=>{$('#skySheet').hidden=true;};
    $('#skyCog').onclick=()=>{const c=$('#skyCam');c.hidden=!c.hidden;if(!c.hidden)this.fovUI();};
    {const mb=$('#skyMusic');if(mb&&!$('#skyMusicMgr')){const b=document.createElement('button');b.id='skyMusicMgr';b.textContent='♪ Music…';b.className=mb.className.replace(/\bon\b/,'');b.onclick=()=>{$('#skySheet').hidden=true;MusicMgr.open();};mb.after(b);}}},
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
