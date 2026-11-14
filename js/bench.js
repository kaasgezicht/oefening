'use strict';
// ===== bench.js
// ===================================================================
// BENCHMARK WORLD (Settings > Experimental > Enter benchmark world): the same world, town, station, trains and people every time, on a
// fixed simulation clock, to measure speed and to point at problems. Playable like the real game. Your own game is kept aside and
// comes back with "Exit". Same seed + same steps + same inputs = same state; the signature in the corner proves it.
// Determinism: world and scenario are built from a seeded Math.random; the simulation runs in fixed 1/30 s steps with its own random
// stream (rendering and the user interface use another one, so where the camera looks cannot change what the simulation does).
// ===================================================================
const BENCH={seed:4711,size:4096,step:1/30,settle:600,id:'B1'};
const Bench={sync:false,on:false,n:0,acc:0,backup:null,places:[],notes:[],labels:true,paused:false,busy:false,pickMode:false,sig:'',rngOrig:Math.random,simR:null,rndR:null,sec:'menu',measureText:'',
  device(id){const d=PDEF[id];if(!d)return true;if(['quality','exp','sound','file'].includes(d.tab))return true;for(const k in PRESETS)if(id in PRESETS[k])return true;
    return['preset','autoRes','frameCap','showStats','msaa','renderScale','kitLod','peopleLod','volume'].includes(id);},
  async enter(){if(this.busy||App.busy||this.on)return;
    if(!confirm('Open the benchmark world? Your game is kept aside and comes back when you press Exit in the benchmark world. Saving is switched off there. Loading takes a moment.'))return;
    this.busy=true;try{this.backup=snapshot();try{localStorage.setItem('trein.bench.backup',JSON.stringify(this.backup));}catch(e){}
      $('#panel').classList.remove('open');$('#bar').classList.remove('hide');if(Build.active)Build.exit();try{if(Drive.active)Drive.exit();}catch(e){}
      await this.build();}catch(e){Log.err('benchmark world failed: '+(e.stack||e));UI.toast('Benchmark world failed: '+e.message);this.on=false;this.sync=false;}finally{this.busy=false;App.hold=false;this.ui();}},
  /* the whole world and scenario from scratch (also used by "Restart") */
  async build(){App.hold=true;this.on=false;this.sync=true;this.paused=false;this.n=0;this.acc=0;this.notesOpen=false;
    for(const id of PORDER)if(!this.device(id))P[id]=PDEF[id].def;
    Object.assign(P,{seed:BENCH.seed,worldSize:BENCH.size,mapRes:0,season:'summer',timeOfDay:10.2,timeSpeed:0,weather:'clear',people:3,autoRes:0});
    Math.random=mulberry32(BENCH.seed+1);this.clearState();Trains.load(null);App.time=0;/* every timer in the game compares with App.time */
    applySnapshot({app:'Trein',saveVersion:SAVE_VERSION,build:VERSION,params:{...P},track:null,trains:null,villages:null,roads:[],buses:null,money:{cash:200000,loan:0,paid:[]}});
    App.camLoaded=true;App.placedCam=true;await App.generate(0);
    this.scenario();this.simR=mulberry32(BENCH.seed*7+1);this.rndR=mulberry32(99);this.places=this.makePlaces();
    /* the simulation looks at the camera (people and smoke only near it, level of detail): settle with the camera at place 1 */
    if(this.places[0])this.go(this.places[0]);this.syncCam();this.on=true;
    UI.progress(true,0.5,'Settling the benchmark world');for(let i=0;i<BENCH.settle;i++){this.step1();if(i%40===39){UI.progress(true,0.5+0.5*i/BENCH.settle,'Settling the benchmark world');await new Promise(r=>setTimeout(r,0));}}
    this.n=0;this.sig=this.signature();UI.progress(false);Math.random=this.rndR;this.clearBanners();this.paused=!!this.startPaused;/* tests: freeze at step 0 */
    Log.info(`benchmark world ${BENCH.id}: seed ${BENCH.seed}, ${BENCH.size} m, signature ${this.sig}, ${this.places.length} places`);},
  /* the game's own state objects as they were just before the first world: put back before every benchmark world (and before your game
     returns), so nothing from earlier play (growth timers, people, goods, queued work) leaks into the starting state */
  capture(){this.pristine=[];for(const [nm,o] of Object.entries({Life,Weather,Crane,Goods,Particles,Buses,Net,Money,Trains})){const p={};for(const k of Object.keys(o)){const v=o[k];if(typeof v==='function')continue;try{p[k]=structuredClone(v);}catch(e){}}this.pristine.push([nm,o,p,new Set(Object.keys(o))]);}},
  clearState(){if(this.pristine)for(const [nm,o,p,keys] of this.pristine){for(const k of Object.keys(o))if(!keys.has(k)&&typeof o[k]!=='function')delete o[k];/* fields made later by play (timers, queues) */for(const k in p){try{o[k]=structuredClone(p[k]);}catch(e){}}}
    try{Goods.stock.clear();Crane.S.clear();Crane.F=[];Crane.hold.clear();Life.stClean.clear();UpgNotes.seen.clear();UpgNotes.L=[];Particles.n=0;Life.walkers=[];const b=$('#banner');if(b)b.hidden=true;const u=$('#upNotes');if(u)u.innerHTML='';}catch(e){Log.warn('bench clearState: '+e.message);}},
  scenario(){const T=App.T,v=Life.villages[0],H=0.6,L=620,x0=v.x-Math.cos(H)*L/2+40,z0=v.z-Math.sin(H)*L/2+40,g=(x,z)=>sampleH(T,x,z),y=Math.max(g(x0,z0),g(x0+Math.cos(H)*L,z0+Math.sin(H)*L))+0.5;
    const a={id:Track.nextId++,x:x0,z:z0,y,h:H+Math.PI,g:0},b={id:Track.nextId++,x:x0+Math.cos(H)*L,z:z0+Math.sin(H)*L,y,h:H,g:0};Track.nodes.push(a,b);
    const sg={id:Track.nextId++,a:a.id,b:b.id,x0,z0,h0:H,k:0,L,y0:y,y1:y,g0:0,g1:0,spans:[]};Track.segs.push(sg);Net.changed();App.trackChanged();
    Build.placeStation({sid:sg.id,t:200,len:44,side:Build.stSide(sg.id,200)});Life.updateStations();const st=Track.stations[0],si0=Life.stInfo[0];
    Life.growNow(si0.v);Life.growNow(si0.v);for(const w of Life.villages)if(w!==si0.v)Life.addGrowth(w,400);Life.updateStations();Build.addTwin(st);Life.updateStations();
    const tw=Track.stations.find(q=>q.twinOf===st.id),c1=Trains.consist(2,0),L1=Trains.length(c1);Trains.add({sid:st.sid,t:st.t+L1/2-6,dir:1},c1);const t1=Trains.list[Trains.list.length-1];t1.auto=false;t1.pax=Array.from({length:14},()=>({dest:st.id}));
    if(tw){const c2=Trains.consist(2,0),L2=Trains.length(c2),s2=Track.segs.find(q=>q.id===tw.sid);Trains.add({sid:tw.sid,t:Math.min(tw.t+L2/2-6,s2.L-0.5),dir:1},c2);const t2=Trains.list[Trains.list.length-1];t2.auto=false;t2.pax=Array.from({length:14},()=>({dest:tw.id}));}
    this.st=st;},
  /* one simulation step (also the loop's, when the benchmark world is on): fixed length, own random stream */
  step1(){const keep=Math.random;Math.random=this.simR;const h=BENCH.step;App.time+=h;
    /* the sky state the simulation reads (day, night, season weights) is worked out here, not left from the last drawn frame */
    {const A=R.atmos();A.keyUp=A.key[1]>0.02&&(A.day>0.01||A.moonUp>0.05);R.sun={day:A.day,L:A.st.sun,night:A.night};R.A=A;}
    if(P.timeSpeed>0){const nt=P.timeOfDay+h*P.timeSpeed/3600;if(nt>=24)Weather.newDay();P.timeOfDay=nt%24;}
    if(App.T){Trains.update(h);Crane.update(h);}Weather.update(h);if(App.T)Life.update(h);this.n++;Math.random=keep;},
  sim(sdt){if(this.paused||this.pickMode)return;this.acc+=sdt;let k=Math.min(12,Math.floor(this.acc/BENCH.step));this.acc=k>=12?0:this.acc-k*BENCH.step;while(k-->0)this.step1();},
  /* a short fingerprint of everything that should be identical: world, buildings, people, trains */
  signature(){let h=2166136261;const mix=x=>{h^=x|0;h=Math.imul(h,16777619);},m=x=>mix(Math.round(x*10));
    for(const v of Life.villages){m(v.x);m(v.z);mix(v.level|0);mix(v.houses?v.houses.length:0);}for(const o of Life.houses){m(o.x);m(o.z);m(o.rot*10);mix(o.v);}
    for(const w of Life.walkers){m(w.x);m(w.z);}for(const a of Life.animals||[]){m(a.x);m(a.z);}for(const t of Trains.list){m(t.head.t);mix(t.veh.length);}
    for(const s of Track.segs){m(s.x0);m(s.z0);m(s.L);}mix(Life.walkers.length);mix((Life.animals||[]).length);mix(Particles.n);mix(Math.round(Money.cash));mix(App.T.stats.trees);for(const [k,e] of Goods.stock)mix(Math.round(Object.values(e).reduce((a,b)=>a+(+b||0),0)));
    return(h>>>0).toString(16).toUpperCase().padStart(8,'0');},
  makePlaces(){const T=App.T,N=T.N,W=T.water,cs=T.cs,si=Life.stInfo.find(q=>q.st===this.st),out=[],yaw0=si?Math.atan2(si.nz,si.nx):0,at=(a,b)=>[si.x+si.nx*b+si.dx*a,si.y+1.5,si.z+si.nz*b+si.dz*a],add=(name,t,d,pitch,yaw)=>{if(t)out.push({n:out.length+1,name,t,d,pitch,yaw});};
    if(si){add('Grand station',at(-4,2),70,0.42,yaw0+0.7);add('Platform with people',at(6,3.5),18,0.32,yaw0+1.25);}
    const v0=si&&si.v;if(v0)add('Village street',[v0.x,sampleH(T,v0.x,v0.z)+1.5,v0.z],34,0.24,yaw0+2.4);if(v0)add('Village from above',[v0.x,sampleH(T,v0.x,v0.z)+1.5,v0.z],320,0.62,yaw0+1.2);
    const v1=Life.villages.find(q=>q!==v0);if(v1)add('Second village',[v1.x,sampleH(T,v1.x,v1.z)+1.5,v1.z],120,0.5,0.8);
    let best=-1,bd=0,rv=-1,rd=0;for(let n=0;n<N*N;n++){const a=W[n*4+3];if(a<=0)continue;const d=W[n*4]-T.H[n],sh=T.shore?T.shore[n]:1;if(sh>=0.99&&d>bd){bd=d;best=n;}if(sh<0.99&&a<1.5&&d>rd){rd=d;rv=n;}}
    if(best>=0){let sn=best;while(sn%N<N-2&&W[sn*4+3]>0)sn++;const pos=n=>[(n%N+0.5)*cs,W[n*4],(((n/N)|0)+0.5)*cs];add('Lake shore',pos(sn),45,0.35,2.2);add('Lake from above',pos(best),260,1.5,0.3);}
    if(rv>=0)add('River',[(rv%N+0.5)*cs,W[rv*4],(((rv/N)|0)+0.5)*cs],70,0.8,1.9);
    for(const s2 of T.streams||[]){const k=s2.length/3-1,x=s2[k*3],z=s2[k*3+1],i=Math.floor(x/cs),j=Math.floor(z/cs);let wet=false;for(let dj=-2;dj<=2;dj++)for(let di=-2;di<=2;di++){const m=(j+dj)*N+i+di;if(m>=0&&m<N*N&&W[m*4+3]>0)wet=true;}if(wet&&s2[k*3+2]>0){add('Stream mouth',[x,sampleH(T,x,z),z],60,0.9,0.8);break;}}
    const cv=(Life.culverts||[])[0];if(cv)add('Culvert',[cv.x,cv.y+1,cv.z],14,0.45,cv.rot+0.8);const sw=(Life.sawmills||[])[0];if(sw)add('Sawmill',[sw.x,sw.y+3,sw.z],40,0.4,sw.rot+0.9);
    if(si)add('Landscape (wide)',at(0,0),1600,0.42,0.4);return out;},
  go(pl){Cam.mode='free';Cam.anim=null;Cam.target=pl.t.slice();Cam.dist=pl.d;Cam.pitch=pl.pitch;Cam.yaw=pl.yaw;this.cur=pl;},
  clearBanners(){const b=$('#banner');if(b)b.hidden=true;const u=$('#upNotes');if(u)u.innerHTML='';},
  syncCam(){for(let k=0;k<8;k++)Cam.update(0.25);R.focus=[Cam.target[0],Cam.target[1],Cam.target[2]];},
  async exit(){if(!this.on||this.busy)return;if(!confirm('Leave the benchmark world and go back to your game?'))return;this.busy=true;
    try{this.on=false;this.sync=false;App.hold=true;Math.random=this.rngOrig;const s=this.backup;this.clearState();Trains.load(null);applySnapshot(s);App.camLoaded=true;await App.generate(0);
      try{localStorage.removeItem('trein.bench.backup');}catch(e){}this.backup=null;UI.toast('Back in your game');}
    catch(e){Log.err('leaving the benchmark world failed: '+(e.stack||e));UI.toast('Could not go back: '+e.message);}finally{this.busy=false;App.hold=false;this.ui();}},
  async restart(){if(!this.on||this.busy)return;this.busy=true;try{await this.build();UI.toast('Benchmark world restarted');}catch(e){Log.err('restart failed '+e);}finally{this.busy=false;App.hold=false;this.ui();}},
  /* ---- notes: tap what is wrong; the game records where, when, what is nearby */
  near(sx,sy){const out=[],gy=(x,z)=>sampleH(R.world,x,z),add=(label,x,y,z,extra)=>{const sc=Cam.toScreen(x,y,z);if(!sc)return;const d=Math.hypot(sc[0]-sx,sc[1]-sy);if(d<60)out.push({d,label,at:[+x.toFixed(1),+y.toFixed(1),+z.toFixed(1)],camDist:Math.round(Math.hypot(x-Cam.pos[0],y-Cam.pos[1],z-Cam.pos[2])),...extra});};
    for(const w of Life.walkers||[]){if(w.hidden)continue;add('person #'+(w.id!=null?w.id:Life.walkers.indexOf(w))+' '+(w.kind||w.k||w.type||'')+' state='+w.state+(w.st&&w.st.st?' at '+w.st.st.name:''),w.x,(w.y==null?gy(w.x,w.z):w.y)+0.9,w.z);}
    for(const h of Life.houses||[]){const df=R.houseDefs[h.v];add('house '+((df&&df.kit)||('type'+h.v))+(h.village?' in '+h.village.name:''),h.x,h.y+3,h.z);}
    Trains.list.forEach((t,i)=>(t.poses||[]).forEach((p,j)=>{if(p)add('train '+(i+1)+' car '+(j+1)+' ('+(t.veh[j]&&t.veh[j].k||'')+')',p.c[0],p.c[1]+1.5,p.c[2]);}));
    for(const q of Life.stInfo||[])add('station '+q.st.name,q.x,q.y+2,q.z);for(const a of Life.animals||[])add('animal '+(a.kind||a.k||''),a.x,gy(a.x,a.z)+0.6,a.z);
    for(const c of Life.culverts||[])add('culvert',c.x,c.y+0.6,c.z);for(const m of Life.sawmills||[])add('sawmill',m.x,m.y+4,m.z);
    out.sort((a,b)=>a.d-b.d);return out.slice(0,4);},
  startPick(){this.pickMode=true;this.sec='menu';this.showPanel(false);$('#bnPick').hidden=false;this.ui();},
  onPick(sx,sy,skip){$('#bnPick').hidden=true;$('#bnPickBar').hidden=true;const h=skip?null:Cam.pick(sx,sy),ctr=Cam.pick(innerWidth/2,innerHeight/2),g=h||ctr||Cam.target,near=skip?[]:this.near(sx,sy);
    let pl=null,pd=1e9;for(const p of this.places){const d=Math.hypot(p.t[0]-g[0],p.t[2]-g[2]);if(d<pd){pd=d;pl=p;}}
    this.draft={n:this.notes.length+1,tap:skip?null:[Math.round(sx),Math.round(sy)],ground:[+g[0].toFixed(1),+g[1].toFixed(1),+g[2].toFixed(1)],near,place:pl?{n:pl.n,name:pl.name,dist:Math.round(pd)}:null};
    const d=this.draft,box=$('#bnNote');box.hidden=false;$('#bnNoteInfo').innerHTML=`<b>Note ${d.n}</b> · step ${this.n}<br>${d.near.length?d.near.map(q=>q.label+' <small>('+q.camDist+' m away)</small>').join('<br>'):(skip?'whole screen':'ground')}${d.place?'<br><small>nearest place: '+d.place.n+' '+d.place.name+' ('+d.place.dist+' m)</small>':''}`;
    $('#bnText').value='';setTimeout(()=>$('#bnText').focus(),50);},
  saveNote(){const d=this.draft;if(!d)return;const txt=$('#bnText').value.trim();const n={...d,text:txt,version:VERSION.split(' ')[0],world:BENCH.id,signature:this.sig,step:this.n,simTime:P.timeOfDay.toFixed(2),season:P.season,weather:P.weather,cam:Cam.state(),preset:P.preset,fpsAvg:+(1000/Math.max(1,(App.perf.fr.slice(-60).reduce((a,b)=>a+b,0)/Math.max(1,Math.min(60,App.perf.fr.length))))).toFixed(1),screen:[innerWidth,innerHeight,devicePixelRatio]};
    this.notes.push(n);this.draft=null;$('#bnNote').hidden=true;this.pickMode=false;try{localStorage.setItem('trein.bench.notes',JSON.stringify(this.notes));}catch(e){}Log.info('bench note '+n.n+' (step '+n.step+', '+(n.place?n.place.name:'')+'): '+txt);UI.toast('Note '+n.n+' saved');this.ui();},
  cancelNote(){this.draft=null;$('#bnNote').hidden=true;$('#bnPick').hidden=true;this.pickMode=false;this.ui();},
  exportNotes(){let gpu='';try{const e=gl.getExtension('WEBGL_debug_renderer_info');gpu=e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'';}catch(e){}
    download(`trein-bench-notes-${stamp()}.json`,JSON.stringify({app:'Trein benchmark world',version:VERSION,world:BENCH,signature:this.sig,gpu,screen:[innerWidth,innerHeight,devicePixelRatio],quality:{preset:P.preset,renderScale:P.renderScale,terrainLod:P.terrainLod,kitLod:P.kitLod},measure:this.measureText,notes:this.notes},null,1));UI.toast('Notes exported');},
  /* ---- fixed views, each timed on the GPU */
  async measure(){if(this.busy||!this.on)return;this.busy=true;this.showPanel(false);const lines=[];const was=this.paused;App.hold=true;R.skip={};
    try{let gpu='';try{const e=gl.getExtension('WEBGL_debug_renderer_info');gpu=e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'';}catch(e){}
      lines.push(`v${VERSION.split(' ')[0]} world ${BENCH.id} sig ${this.sig} step ${this.n} · ${gpu||'GPU'} · ${R.tw||'?'}×${R.th||'?'} · ${P.preset}`);
      let tot=0;for(const pl of this.places){this.go(pl);const a=[];for(let r=0;r<3;r++)a.push(await R.benchThroughput(500.5,4));a.sort((x,y)=>x-y);tot+=a[1];lines.push(`${String(pl.n).padStart(2)} ${pl.name.padEnd(22)}${a[1].toFixed(1).padStart(7)} ms  ±${((a[2]-a[0])/2).toFixed(1)}  ${(Stats.tris/1e6).toFixed(2)}M tris ${Stats.draws} draws`);this.measureText=lines.join('\n');this.sec='out';this.ui();}
      lines.push(`mean ${(tot/this.places.length).toFixed(1)} ms`);}catch(e){lines.push('stopped: '+e.message);}
    finally{R.benchStill=false;App.hold=false;this.paused=was;this.busy=false;}this.measureText=lines.join('\n');Log.info('benchmark views:\n'+this.measureText);this.sec='out';this.showPanel(true);this.ui();},
  /* ---- interface */
  css(){if($('#bnCss'))return;const st=document.createElement('style');st.id='bnCss';st.textContent=`
#bnChip{position:fixed;left:8px;top:44%;z-index:44;font:700 12px system-ui;color:#10201a;background:#e9c870;border:0;border-radius:14px;padding:7px 10px;box-shadow:0 2px 8px #0008}
#bnStat{position:fixed;left:8px;top:calc(44% + 34px);z-index:44;font:11px/1.35 ui-monospace,monospace;color:#f3d98a;text-shadow:0 1px 3px #000;pointer-events:none;white-space:pre}
#bnPanel{position:fixed;left:8px;top:calc(44% + 78px);z-index:44;width:min(86vw,330px);max-height:52vh;overflow:auto;background:#10201af2;border:1px solid #e9c870;border-radius:14px;padding:10px;color:#efe8d6;font:13px system-ui}
#bnPanel button{display:block;width:100%;text-align:left;margin:4px 0;padding:9px 10px;border-radius:10px;border:1px solid #c9a14a88;background:#1e3b30;color:#efe8d6;font:600 13px system-ui}
#bnPanel button.go{background:#c9a14a;color:#10201a}#bnPanel pre{white-space:pre-wrap;font:11px/1.35 ui-monospace,monospace;margin:6px 0}#bnPanel .nt{border-top:1px solid #ffffff22;padding:6px 0;font-size:12px}
#bnPick{position:fixed;inset:0;z-index:43;background:#0000;touch-action:none}#bnPickBar{position:fixed;left:0;right:0;top:calc(env(safe-area-inset-top) + 56px);z-index:45;display:flex;gap:8px;justify-content:center;align-items:center;font:700 14px system-ui;color:#10201a;pointer-events:none}
#bnPickBar span{background:#e9c870;border-radius:12px;padding:8px 12px}#bnPickBar button{pointer-events:auto;font:700 13px system-ui;border-radius:12px;border:0;padding:8px 12px;background:#efe8d6;color:#10201a}
#bnNote{position:fixed;left:50%;top:18%;transform:translateX(-50%);width:min(92vw,400px);z-index:46;background:#10201afa;border:1px solid #e9c870;border-radius:16px;padding:12px;color:#efe8d6;font:13px/1.4 system-ui}
#bnNote textarea{width:100%;height:84px;margin:8px 0;border-radius:10px;border:1px solid #c9a14a88;background:#0b1511;color:#efe8d6;font:15px system-ui;padding:8px;box-sizing:border-box}#bnNote .bt{display:flex;gap:8px;justify-content:flex-end}#bnNote button{padding:9px 14px;border-radius:10px;border:0;font:700 14px system-ui;background:#efe8d6;color:#10201a}#bnNote button.go{background:#c9a14a}
.bnb{position:fixed;z-index:30;min-width:22px;height:22px;border-radius:11px;background:#e9c870;color:#10201a;font:700 12px/22px system-ui;text-align:center;padding:0 5px;box-shadow:0 1px 5px #0009;transform:translate(-50%,-50%)}.bnb.pin{background:#d9503f;color:#fff}.bnb[hidden],#bnPickBar[hidden],#bnPick[hidden],#bnNote[hidden],#bnPanel[hidden],#bnChip[hidden],#bnStat[hidden]{display:none}`;document.head.appendChild(st);},
  build_ui(){if($('#bnChip'))return;this.css();const mk=(tag,id,html,par)=>{const e=document.createElement(tag);e.id=id;if(html!=null)e.innerHTML=html;(par||document.body).appendChild(e);return e;};
    mk('button','bnChip','Bench').onclick=()=>this.showPanel($('#bnPanel').hidden);mk('div','bnStat','');const p=mk('div','bnPanel','');p.hidden=true;
    const pk=mk('div','bnPick','');pk.hidden=true;pk.addEventListener('pointerdown',e=>{e.preventDefault();this.onPick(e.clientX,e.clientY,false);});
    const pb=mk('div','bnPickBar','<span>Tap what is wrong</span><button id="bnSkip">Whole screen</button><button id="bnCancel">Cancel</button>');pb.hidden=true;$('#bnSkip').onclick=()=>this.onPick(innerWidth/2,innerHeight/2,true);$('#bnCancel').onclick=()=>this.cancelNote();
    const nb=mk('div','bnNote','<div id="bnNoteInfo"></div><textarea id="bnText" placeholder="What is wrong? (optional: a few words)"></textarea><div class="bt"><button id="bnNx">Cancel</button><button class="go" id="bnNs">Save note</button></div>');nb.hidden=true;$('#bnNx').onclick=()=>this.cancelNote();$('#bnNs').onclick=()=>this.saveNote();
    this.badges=[];},
  showPanel(open){const p=$('#bnPanel');if(!p)return;p.hidden=!open;if(open)this.fill();},
  fill(){const p=$('#bnPanel'),b=(id,t,c)=>`<button id="${id}"${c?` class="${c}"`:''}>${t}</button>`;let h='';
    if(this.sec==='places')h=b('bnBack','‹ Back')+this.places.map(q=>b('bnP'+q.n,q.n+'  '+q.name)).join('');
    else if(this.sec==='notes')h=b('bnBack','‹ Back')+(this.notes.length?this.notes.map(q=>`<div class="nt"><b>${q.n}</b> step ${q.step}${q.place?' · '+q.place.name:''}<br>${q.near&&q.near[0]?q.near[0].label+'<br>':''}${q.text||'<i>(no text)</i>'}<br><button data-g="${q.n}">Go there</button></div>`).join(''):'<div class="nt">No notes yet.</div>')+b('bnExp','Export notes (file)','go')+b('bnClr','Delete all notes');
    else if(this.sec==='out')h=b('bnBack','‹ Back')+`<pre>${this.measureText||'No measurement yet.'}</pre>`;
    else h=b('bnNote0','Note a problem (tap it)','go')+b('bnPlaces','Places (go to a fixed spot)')+b('bnPause',this.paused?'▶ Continue the simulation':'⏸ Pause the simulation')+b('bnLab','Place labels: '+(this.labels?'on':'off'))+b('bnNotes','My notes ('+this.notes.length+')')+b('bnMeas','Measure all places (about a minute)')+b('bnOut','Last measurement')+b('bnRest','Restart this world (same start again)')+b('bnExit','Exit: back to my game');
    p.innerHTML=h;const on=(id,fn)=>{const e=$('#'+id);if(e)e.onclick=fn;};
    on('bnBack',()=>{this.sec='menu';this.fill();});on('bnNote0',()=>this.startPick());on('bnPlaces',()=>{this.sec='places';this.fill();});on('bnPause',()=>{this.paused=!this.paused;this.fill();});on('bnLab',()=>{this.labels=!this.labels;this.fill();});
    on('bnNotes',()=>{this.sec='notes';this.fill();});on('bnMeas',()=>this.measure());on('bnOut',()=>{this.sec='out';this.fill();});on('bnRest',()=>this.restart());on('bnExit',()=>this.exit());on('bnExp',()=>this.exportNotes());
    on('bnClr',()=>{if(confirm('Delete all notes?')){this.notes=[];try{localStorage.removeItem('trein.bench.notes');}catch(e){}this.fill();}});
    for(const q of this.places)on('bnP'+q.n,()=>{this.go(q);this.showPanel(false);});for(const e of p.querySelectorAll('[data-g]'))e.onclick=()=>{const n=this.notes.find(q=>q.n===+e.dataset.g);if(n){Cam.mode='free';Cam.anim=null;Cam.setState(n.cam);this.showPanel(false);}};},
  ui(){this.build_ui();const on=this.on;for(const id of ['bnChip','bnStat'])$('#'+id).hidden=!on;if(!on){$('#bnPanel').hidden=true;$('#bnPick').hidden=true;$('#bnPickBar').hidden=true;$('#bnNote').hidden=true;for(const e of this.badges||[])e.hidden=true;}
    $('#bnPickBar').hidden=!(on&&this.pickMode&&$('#bnNote').hidden);},
  tick(){if(!this.on)return;this.build_ui();const t=performance.now();if(!(this.sT>t-250)){this.sT=t;$('#bnStat').textContent=`BENCH ${BENCH.id} · step ${this.n}${this.paused?' · PAUSED':''}\nsig ${this.sig} · ${P.timeOfDay.toFixed(1)} h${this.cur?' · place '+this.cur.n:''}`;}
    const want=[...(this.labels?this.places.map(p=>({t:p.t,txt:p.n,pl:p})):[]),...this.notes.map(n=>({t:[n.ground[0],n.ground[1]+2,n.ground[2]],txt:'N'+n.n,pin:true}))];
    while(this.badges.length<want.length){const e=document.createElement('div');e.className='bnb';e.hidden=true;e.onclick=()=>{if(e._pl){this.go(e._pl);}};document.body.appendChild(e);this.badges.push(e);}
    this.badges.forEach((e,i)=>{const w=want[i];if(!w){e.hidden=true;return;}const sc=Cam.toScreen(w.t[0],w.t[1],w.t[2]);const far=Math.hypot(w.t[0]-Cam.pos[0],w.t[2]-Cam.pos[2]);if(!sc||sc[0]<-20||sc[1]<-20||sc[0]>innerWidth+20||sc[1]>innerHeight+20||far>4500||(w.pl&&far<w.pl.d*0.35)){e.hidden=true;return;}
      e.hidden=false;e.style.left=sc[0]+'px';e.style.top=sc[1]+'px';e.textContent=w.txt;e.className='bnb'+(w.pin?' pin':'');e._pl=w.pl||null;});}};
let lastT=0,frameAcc=0;
function loop(ts){
  requestAnimationFrame(loop);
  if(document.hidden||App.hold)return;
  const raw=(ts-lastT)/1000;if(P.frameCap>0&&raw<1/P.frameCap-0.003&&lastT)return;
  const dt=lastT?Math.min(raw,0.1):0.016,ff=App.ff||1,sdt=dt*ff;lastT=ts;if(!Bench.on)App.time+=sdt;// ff: fast forward (1, 2, 4 or 8 ×) speeds up the whole simulation
  if(!Bench.on&&P.timeSpeed>0){const nt=P.timeOfDay+sdt*P.timeSpeed/3600;if(nt>=24)Weather.newDay();P.timeOfDay=nt%24;if((frameAcc+=dt)>0.5){frameAcc=0;UI.refresh('timeOfDay');Sky.refresh();}}
  const c0=performance.now();
  resizeCanvas();keyMove(dt);Input.tick();TouchLog.tick(dt);if(Bench.on)Bench.sim(sdt);else{if(App.T){const n=Math.min(16,Math.ceil(sdt/0.05-1e-6)),h=sdt/n;for(let k=0;k<n;k++){Trains.update(h);Crane.update(h);}Plane.update(sdt);RoadVeh.update(sdt);}Weather.update(sdt);if(App.T)Life.update(sdt);}if(Build.active)Build.edgePan(dt);Cam.update(dt);Sfx.update(dt);Drive.tick();
  R.ensureTargets(R.rtW||gl.canvas.width,R.rtH||gl.canvas.height);
  try{R.frame(Cam,App.time);}catch(e){Log.err('frame: '+(e.stack||e));throw e;}
  if(MapView.on)MapView.draw();if(Plane.on)PlaneUI.hud();
  const cpu=performance.now()-c0,pf=App.perf;pf.fr.push(dt*1000);if(pf.fr.length>240)pf.fr.shift();pf.cpu=(pf.cpu||cpu)*0.95+cpu*0.05;
  AutoRes.tick(ts,pf.fr);{const dtm=Math.min(0.1,(ts-(pf.mlast||ts))/1000);Money.tick(dtm*(App.ff||1));Icons.tick(dtm);TripFX.tick(dtm);LoadUI.tick(dtm);pf.lab=((pf.lab|0)+1)%Math.max(1,P.labelRate|0||1);if(!pf.lab){VillageUI.tick();IndUI.tick();StationUI.tick();BusUI.tick();}Bench.tick();UpgNotes.tick(dtm);if(App.T)Goods.tick(dtm*(App.ff||1));}pf.mlast=ts;if(ts-pf.hudAt>350){pf.hudAt=ts;const st=$('#stats');st.hidden=!P.showStats;
    if(P.showStats){const a=pf.fr.slice(-60),avg=a.reduce((x,y)=>x+y,0)/a.length;
      st.textContent=`${(1000/avg).toFixed(0)} fps   ${avg.toFixed(1)} ms   cpu ${pf.cpu.toFixed(1)} ms   draws ${Stats.draws}   tris ${(Stats.tris/1e6).toFixed(2)}M   ${R.tw}×${R.th}`;}
    Sky.clock();}
  if(ts-pf.logAt>10000){pf.logAt=ts;const a=pf.fr,avg=a.reduce((x,y)=>x+y,0)/a.length,worst=Math.max(...a);
    Log.info(`perf avg ${(1000/avg).toFixed(1)} fps (${avg.toFixed(1)} ms, worst ${worst.toFixed(0)} ms) cpu ${pf.cpu.toFixed(1)} ms draws ${Stats.draws} tris ${(Stats.tris/1e6).toFixed(2)}M chunks ${Stats.chunks} objects ${Stats.objs} target ${R.tw}x${R.th} msaa ${R.ms} preset ${P.preset} cam ${Cam.pos.map(v=>v.toFixed(0)).join(',')} ${P.season} ${P.timeOfDay.toFixed(1)}h ${Weather.name} walkers ${Life.walkers.length} particles ${Particles.n}`);}
  if(App.gpuCheck===undefined){App.gpuCheck=0;const e=gl.getError();if(e)Log.err('GL error after first frame 0x'+e.toString(16));}
}

async function boot(){
  UI.build();
  $('#btnMenu').onclick=()=>{$('#panel').classList.add('open');$('#bar').classList.add('hide');};
  $('#btnClose').onclick=()=>{$('#panel').classList.remove('open');$('#bar').classList.remove('hide');};
  $('#btnGen').onclick=()=>App.generate(0);$('#btnSave').onclick=()=>App.save();
  $('#btnMap').onclick=()=>MapView.open();PlaneUI.bind();$('#btnHome').onclick=()=>MainMenu.show('home');$('#mapClose').onclick=()=>MapView.close();
  $('#btnBuild').onclick=()=>{if(!Sfx.on)Sfx.start();Sfx.syncBtn();Build.enter();};$('#btnDone').onclick=()=>Build.exit();$('#btnUndo').onclick=()=>Build.undo();
  const on=(sel,fn)=>{for(const b of document.querySelectorAll(sel))b.onclick=()=>fn(b);};
  on('#buildBar [data-mode]',b=>Build.setMode(b.dataset.mode));on('#buildBar [data-btab]',b=>Build.setTab(b.dataset.btab));on('#buildBar [data-rtool]',b=>{Build.discard(true);Roads.tool=b.dataset.rtool;Roads.a=null;Build.ui();Build.hint();});$('#rAddBus').onclick=()=>Buses.add();$('#rAddLorry').onclick=()=>Buses.add(true);$('#rAddDD').onclick=()=>Buses.add(false,'dd');$('#rBusList').onclick=()=>BusUI.toggle();on('#buildBar [data-v]',b=>Build.setProfile(b.dataset.v));
  on('#buildBar [data-dir]',b=>Build.setDir(+b.dataset.dir));on('#buildBar [data-slope]',b=>Build.setSlope(b.dataset.slope));on('#buildBar [data-prefer]',b=>Build.setPrefer(b.dataset.prefer));
  $('#pLenMinus').onclick=()=>Build.addLen(-10);$('#pLenPlus').onclick=()=>Build.addLen(10);$('#pRotL').onclick=()=>Build.rotStart(1);$('#pRotR').onclick=()=>Build.rotStart(-1);
  $('#pNew').onclick=()=>Build.newLine();$('#pBranch').onclick=()=>Build.branchMode();$('#pDemolish').onclick=()=>Build.demolish();$('#pPlace').onclick=()=>Build.place();$('#rClear').onclick=()=>Build.routeClear();
  on('#buildBar [data-sig]',b=>Build.setSig(b.dataset.sig));$('#btnClearAll').onclick=()=>Build.clearAll();
  $('#cA').onclick=()=>Build.choose(Build.choice&&Build.choice.kind==='join'?'fix':'cross');$('#cB').onclick=()=>Build.choose(Build.choice&&Build.choice.kind==='join'?'asis':'junc');$('#cC').onclick=()=>Build.choose(Build.choice&&Build.choice.kind==='join'?'none':'cancel');
  $('#bBridges').onclick=()=>Build.toggle('trackBridges');{const nm=['Stone arch','Brick arch','Steel truss','Plate girder','Concrete','Timber trestle'],up=()=>{$('#bBridgeType').textContent=nm[+P.bridgeType|0];};up();$('#bBridgeType').onclick=()=>{P.bridgeType=((+P.bridgeType|0)+1)%6;UI.refresh('bridgeType');up();};}$('#bTunnels').onclick=()=>Build.toggle('trackTunnels');
  $('#btnRemove').onclick=()=>Build.toggleRemove();$('#btnBuildOK').onclick=()=>Build.confirm();$('#btnStFlip').onclick=()=>Build.flipGhost();$('#btnStOK').onclick=()=>Build.confirm();$('#btnStRotL').onclick=()=>Build.rotGhost(-Math.PI/12);$('#btnStRotR').onclick=()=>Build.rotGhost(Math.PI/12);$('#btnDiscard').onclick=()=>Build.discard();
  $('#btnDrive').onclick=()=>Drive.enter();$('#btnSound').onclick=()=>Sfx.toggle();App.setFF=f=>{App.ff=f;const b=$('#btnFF');b.innerHTML=svgIcon('fast')+'<span>'+f+'×</span>';b.classList.toggle('on',f>1);b.title=f>1?`Fast forward ${f}× (tap for ${f>=8?1:f*2}×)`:'Fast forward';};
  $('#btnFF').onclick=()=>App.setFF((App.ff||1)>=8?1:(App.ff||1)*2);App.setFF(1);Drive.bind();Sky.bind();Sfx.syncBtn();
  // sound and music pause while the tab is in the background (they used to keep playing with the screen off)
  document.addEventListener('visibilitychange',()=>{if(!Sfx.ctx)return;if(document.hidden)Sfx.ctx.suspend();else if(Sfx.on)Sfx.ctx.resume();});
  $('#errLog').onclick=()=>App.exportLog();
  try{
    for(let i=0;;i++){try{initGL($('#gl'));break;}catch(e){if(i>=5)throw new Error('Chrome would not start 3D graphics (WebGL2). This happens after the phone resets the graphics: close this tab completely (or force-stop Chrome) and open the file again.');
      Log.warn('WebGL2 not available yet, retry '+(i+1));const c=$('#gl'),n2=c.cloneNode();c.replaceWith(n2);await new Promise(r=>setTimeout(r,1500));}}
    await probeEnvironment();
    let bb=null;try{bb=localStorage.getItem('trein.bench.backup');localStorage.removeItem('trein.bench.backup');}catch(e){}
    let saved=null,recovered=false;try{const rc=localStorage.getItem('trein.recover');if(rc){localStorage.removeItem('trein.recover');saved=JSON.parse(rc);recovered=true;}}catch(e){}
    if(!saved&&bb){try{saved=JSON.parse(bb);Log.info('the page was reloaded inside the benchmark world: your game is restored');}catch(e){}}
    if(!saved){try{saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch(e){}}
    if(recovered){Log.warn('recovering after a graphics reset');if(saved.recoverLog)for(const l of saved.recoverLog)Log.info('(before reset) '+l);}
    if(saved){try{applySnapshot(saved);App.camLoaded=true;Log.info('restored last save');}catch(e){Log.warn('could not restore save: '+e.message);}}
    else applyPreset(P.preset,true);
    resizeCanvas();R.init();Trains.init();Particles.init();initInput(gl.canvas);
    requestAnimationFrame(loop);
    if(!Bench.on&&!navigator.webdriver&&!/[?&]nomenu/.test(location.search))MainMenu.show('home');
    Bench.capture();await App.generate(0);if(!$('#mainMenu').hidden)$('#mmCont').textContent='Continue';
    setInterval(()=>App.autosave(),180000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')App.autosave();});addEventListener('pagehide',()=>App.autosave());
    if(saved)UI.toast(recovered?'Recovered after a graphics reset':'Restored your last save');
  }catch(e){Log.err('boot failed: '+(e.stack||e));$('#err').hidden=false;$('#errMsg').textContent=String(e.message||e);UI.progress(false);}
}
window.TREIN={P,PDEF,Cam,R,App,Log,Stats,Track,Build,Trains,Drive,Sfx,Particles,Life,Weather,Music,Net,Clouds,Input,TouchLog,segPoint,segY,spanAt,segNearest,sampleH,StationUI,Busy,Roads,Bench,BENCH};
// ?nostart: load the code without starting the game (tools/meshcheck.js renders the meshes on their own)
if(/[?&]nostart/.test(location.search))window.__ready=1;else boot();
