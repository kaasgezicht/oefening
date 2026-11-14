'use strict';
// ===== build.js
// ===================================================================
// TRACK BUILDER — three ways to build, switchable at the top of the build bar:
//  PIECES  like RollerCoaster Tycoon: pick an end, choose a piece (curve / straight, slope),
//          Place it, repeat. The camera follows the construction head. Ends snap shut.
//  DRAW    like Transport Fever / Rails-style finger drawing on a top-down plan: drag a line,
//          it becomes smooth track (straights + curves, min radius) that rides the ground.
//  ROUTE   like Factorio's rail planner: tap a start and a destination, an A* search finds a
//          line that hugs the terrain (tunnels / bridges only where they pay off).
// Draw and Route show a ghost first (green fine, amber big earthworks, red impossible) with a
// line through the hills; nothing changes until Build it.
// ===================================================================
const TURN=Math.PI/8;// RCT-style pieces turn 22.5 degrees, so loops and parallel lines line up
const Build={sigTool:'signal',choice:null,hold:null,active:false,mode:'pieces',remove:false,plan:null,stroke:null,camGoal:null,lastXY:null,snapPx:54,
  pc:null,rt:null,target:'track',pcT:{cur:null,dir:0,slope:'auto',len:20,newLine:false},rtT:{a:null,b:null,prefer:'scenic',busy:false},pcR:{cur:null,dir:0,slope:'auto',len:20,newLine:false},rtR:{a:null,b:null,prefer:'scenic',busy:false},
  enter(){this.active=true;$('#bar').classList.add('hide');$('#buildBar').hidden=false;this.setMode(this.mode,true);},
  exit(){this.discard(true);this.pc.cur=null;this.rt.a=this.rt.b=null;this.active=false;this.camGoal=null;Cam.planView=false;$('#buildBar').hidden=true;$('#bar').classList.remove('hide');$('#ovl').getContext('2d').clearRect(0,0,9999,9999);},
  tabOf(m){return m==='signals'?'stations':this.target==='road'?'roads':'track';},
  // roads are built exactly like track (Pieces, Draw, Route); the target says which: each keeps its own pieces and route state
  setTarget(tg){if(this.target===tg&&this.pc)return;this.discard(true);this.target=tg;this.pc=tg==='road'?this.pcR:this.pcT;this.rt=tg==='road'?this.rtR:this.rtT;},
  road(){return this.target==='road';},
  ends(){return this.road()?Roads.ends():Track.freeEnds();},
  preview(pieces,ok,warn){if(this.road()){this.rPrev=pieces?{pieces,ok,warn}:null;R.setPreview(null);}else{this.rPrev=null;R.setPreview(pieces,ok,warn);}},
  setTab(t){if(t!=='stations')this.setTarget(t==='roads'?'road':'track');this.setMode(t==='stations'?'signals':(t==='roads'?this.roadMode:this.trackMode)||'pieces');},
  setMode(m,first){if(!this.pc)this.setTarget(this.target);if(m==='roads'){this.setTab('roads');return;}if(m==='pieces'||m==='draw'||m==='route'){if(this.road())this.roadMode=m;else this.trackMode=m;}this.choice=null;this.hold=null;this.discard(true);this.remove=false;this.mode=m;this.pc.newLine=false;this.rt.a=this.rt.b=null;this.camGoal=null;
    if(m==='draw'){this.camGoal={pitch:1.38,dist:Math.max(Cam.dist,320)};}
    else if(!first&&Cam.pitch>1.1)this.camGoal={pitch:0.75};
    if(m==='pieces'&&!this.pc.cur){const e=this.ends();if(e.length)this.pc.cur=this.stateOf(e[e.length-1]);}
    this.ui();this.refresh();this.hint();},
  hint(){const m=this.mode;if(this.road()&&m!=='signals'){if(Roads.tool!=='build'){this.info(Roads.hint());return;}
      if(m==='pieces')this.info(this.pc.cur?'':this.pc.newLine?'Tap the ground where the new road should start.':this.pc.branch?'Tap a road where the new road should branch off.':'Tap a gold ring (the end of a road you built), Junction to branch off any road, or New road.');
      else if(m==='draw')this.info('Draw the road with one finger on the map, from a gold ring or a road to extend it. End on a road to join it. Two fingers move the camera.');
      else this.info(!this.rt.a?'Tap where the road should start: on a road, a gold ring or open ground.':!this.rt.b?'Now tap the destination: a road to join it, or open ground.':'');return;}
    if(this.remove){this.info('Tap a piece of track to remove it. Tap Remove again when done.');return;}
    if(m==='pieces')this.info(this.pc.cur?'':this.pc.newLine?'Tap the ground where the new line should start.':Track.segs.length?'Tap a gold ring (a track end) to build from it, or the pin with + for a new line.':'Tap the pin with + (new line), then tap the ground to start your railway.');
    else if(m==='draw')this.info(Track.segs.length?'Draw with one finger on the map, starting on a gold ring to extend the track. End on another ring to join up.':'Draw your railway with one finger on the map. Two fingers move the camera.');
    else if(m==='signals')this.info(this.sigTool==='signal'?'Tap the track to put up a signal. Signals split the line into blocks; trains on Auto only enter an empty block.':this.sigTool==='station'?'Tap where the station should stand, on a track or on open ground. A green ghost shows it: drag it, then press ✓. Trains on Auto stop at every station.':this.sigTool==='longer'?'Tap a station to make its platform 16 m (about one coach) longer, so long trains fit.':this.sigTool==='shorter'?'Tap a station to make its platform 16 m shorter.':'Tap a signal or station to remove it.');
    else this.info(!this.rt.a?'Tap where the line should start: a gold ring, or open ground.':!this.rt.b?'Now tap the destination: another ring to join up, or open ground.':'');},
  setSig(t){this.sigTool=t;if(t!=='station')this.stg=null;this.ui();this.hint();},
  // ---- station ghost: where the station will stand; drag it along the track, flip it to the other side, then Build it (the ground is
  // levelled only then). The building side defaults to the village's side of the line.
  stSide(sid,t){const s=segById(sid);if(!s)return 1;const fixed=this.curveSide(s);if(fixed)return fixed;const q=segPoint(s,t),c=Math.cos(q[2]),sn=Math.sin(q[2]),v=Life.nearestVillage(q[0],q[1],420);return v&&sn*(v.x-q[0])-c*(v.z-q[1])<0?-1:1;},
  // on a curve tighter than 450 m the building must stand on the outside: on the inside its straight front would close in on the
  // curving track (canopy columns in the way of the trains). k > 0 turns left, so the outside is the right-hand side (+1).
  curveSide(s){return Math.abs(s.k)>1/450?(s.k>0?1:-1):0;},
  reach(pos,d){let lo=0,hi=d;if(!advance(pos,d).blocked)return d;for(let k=0;k<14;k++){const m=(lo+hi)/2;if(advance(pos,m).blocked)hi=m;else lo=m;}return lo;},
  // keep the whole platform on track: slide the centre back from a dead end
  fitPlat(g){for(let k=0;k<2;k++){const c={sid:g.sid,t:g.t,dir:1},f=this.reach(c,g.len/2),b=this.reach({...c,dir:-1},g.len/2),sh=(g.len/2-f)-(g.len/2-b);
      if(Math.abs(sh)<0.05)break;const a=advance(c,-sh);if(a.blocked)break;const p=a.pos;g.t=p.t;g.sid=p.sid;if(p.dir<0){/* crossed onto a reversed piece: keep the same physical side */g.side=-(g.side||1);}}},
  ghostAt(near){const g={sid:near.seg.id,t:near.t,len:44};g.side=this.stSide(g.sid,g.t);this.stg=g;this.fitPlat(g);this.ui();
    this.info('This is where the station will be. Drag it, ⇅ puts the building on the other side. Press ✓ when it is right.');},
  /* ---- the station ghost can stand on a track or free on the ground (then it brings its own 70 m of track, laid when you press ✓) ---- */
  stPos(G){if(G.free)return{x:G.x,y:G.y,z:G.z,h:G.h};const i=posInfo({sid:G.sid,t:G.t,dir:1});return i?{x:i.x,y:i.y,z:i.z,h:i.h}:null;},
  stgMove(h){if(this.stg)delete this.stg.slot;const G=this.stg,keep=G&&G.sideSet,snap=G&&!G.free?Math.max(32,Cam.dist*0.1):Math.max(16,Cam.dist*0.04),on=Net.nearestOnTrack(h[0],h[2],snap);
    if(on){let g=G&&!G.free?G:{sid:0,t:0,len:G?G.len:44};g.sid=on.seg.id;g.t=on.t;delete g.free;if(!(keep))g.side=this.stSide(g.sid,g.t);else g.side=G.side;g.sideSet=!!keep;this.stg=g;this.fitPlat(g);}
    else{let hd=0;if(G){const p=this.stPos(G);hd=p?p.h:0;}else{const cp=Cam.pos||[h[0],0,h[2]+1];hd=Math.atan2(h[2]-cp[2],h[0]-cp[0])+Math.PI/2;const nt=Net.nearestOnTrack(h[0],h[2],200);if(nt){hd=segPoint(nt.seg,nt.t)[2];}}
      let side=G?G.side||1:1;if(!G){const v=Life.nearestVillage(h[0],h[2],420);if(v)side=Math.sin(hd)*(v.x-h[0])-Math.cos(hd)*(v.z-h[2])>=0?1:-1;}
      this.stg={free:true,x:h[0],z:h[2],h:hd,y:ground0(h[0],h[2])+FORMATION_DROP,len:G?G.len:44,side,sideSet:keep};}
    if(!G||!!G.free!==!!this.stg.free)this.ui();/* buttons for a new ghost, or when it goes between a track and free ground */this.stSync();if(!G)this.info('This is where the station will be. Drag it anywhere (it brings its own piece of track), ⟲ ⟳ turn it, ⇅ other side. Press ✓ when it is right.');},
  rotGhost(d){const G=this.stg;if(!G)return;if(!G.free){UI.toast('On a track the station follows the line. Drag it off the track to turn it.');return;}G.h=wrapPi(G.h+d);this.stSync();},
  /* can it stand here? the footprint (platform and building, 5 x 4 points) must be on land, inside the world, not too steep, clear of the village square and of other stations */
  stCheck(G){const p=this.stPos(G);if(!p)return{ok:false,msg:'No track here'};if(G.slot)return{ok:true,msg:''};/* the station places at industries were checked when they were made */const T=R.world,c=Math.cos(p.h),sn=Math.sin(p.h),side=G.side||1,nx=sn*side,nz=-c*side,hl=(G.len||44)/2;let lo=1e9,hi=-1e9;
    for(const a of [-hl,-hl/2,0,hl/2,hl])for(const b of [0,4,10,15]){const x=p.x+c*a+nx*b,z=p.z+sn*a+nz*b;
      if(x<30||z<30||x>T.W-30||z>T.W-30)return{ok:false,msg:'Too close to the edge of the world'};
      const gy=sampleH(T,x,z),w=sampleWater(T,x,z);if(w[1]>0&&w[0]>gy-0.2)return{ok:false,msg:'The water is in the way'};lo=Math.min(lo,gy);hi=Math.max(hi,gy);
      for(const v of Life.villages){if(v.plaza&&Math.hypot(x-v.plaza[0],z-v.plaza[1])<v.plaza[2]+14)return{ok:false,msg:'Too close to the village square: it will grow'};}}
    if(hi-lo>8)return{ok:false,msg:'Too steep here ('+(hi-lo).toFixed(0)+' m difference)'};
    /* collisions: points over the real footprint (platform along its length, and the building along its own length, every 3 m) against houses (their plots), other
       stations (their footprints), mills, sawmills, workshops, mines, castles, farm yards, and other track beside the building */
    const town=G.free?(()=>{const v=Life.nearestVillage(p.x,p.z,420);return !!(v&&(v.level|0)>=Life.LEVELS.length-1);})():this.isTownAt(G),bx=town?[-22,19.5]:[-14,5.5],bb=side>0?[-bx[1],-bx[0]]:bx,pts=[];
    for(let a=-hl-3;a<=hl+3.01;a+=3)for(const b of [-1,2.5,5])pts.push([a,b,0]);for(let a=bb[0];a<=bb[1]+0.01;a+=3)for(const b of (town?[7,10.5,14,17.5]:[7,10,13]))pts.push([a,b,1]);
    const W=pts.map(q=>[p.x+c*q[0]+nx*q[1],p.z+sn*q[0]+nz*q[1],q[1],q[2]]);
    for(const v of Life.villages){const gr=v.green,pl=v.plaza;if(!gr&&!pl)continue;for(const w of W){if(pl&&Math.hypot(w[0]-pl[0],w[1]-pl[1])<pl[2]+4)return{ok:false,msg:'The village square is here'};if(gr){const dx=w[0]-gr[0],dz=w[1]-gr[1],u=dx*Math.cos(gr[2])+dz*Math.sin(gr[2]),t=-dx*Math.sin(gr[2])+dz*Math.cos(gr[2]);if(Math.abs(u)<gr[3]+5&&Math.abs(t)<gr[4]+5)return{ok:false,msg:'The village green is here'};}}}
    for(const h of Life.houses||[]){if(!h.rect||!Life.plotOn(h)||Math.hypot(h.x-p.x,h.z-p.z)>hl+80)continue;for(const w of W)if(VG.inRect(h.rect,w[0],w[1],1.3))return{ok:false,msg:'A house is in the way'};}
    for(const q of Life.stInfo||[]){if(q.cargo||q.st===G.st)continue;for(const w of W){const dx=w[0]-q.x,dz=w[1]-q.z,a=dx*q.dx+dz*q.dz,b=dx*q.nx+dz*q.nz;if(Math.abs(a)<q.half+5&&b>-5&&b<(Life.stTown(q)?20:16))return{ok:false,msg:'Another station is in the way'};}}
    const circ=[];for(const m of Life.mills||[])circ.push([m.x,m.z,12,'A windmill is in the way']);for(const m of Life.sawmills||[])circ.push([m.x,m.z,28,'The sawmill is in the way']);for(const m of Life.workshops||[])circ.push([m.x,m.z,18,'The workshop is in the way']);
    for(const m of Life.mines||[])circ.push([m.x,m.z,22,'The mine is in the way']);for(const m of Life.castleList())circ.push([m.x,m.z,(m.r||60)+8,'The castle is in the way']);for(const w of W)if(Life.farmAt(w[0],w[1]))return{ok:false,msg:'A farm is in the way'};
    for(const e of circ)for(const w of W)if(Math.hypot(w[0]-e[0],w[1]-e[1])<e[2])return{ok:false,msg:e[3]};
    for(const w of W)if(w[3]&&w[2]>=6){const n=Net.nearestOnTrack(w[0],w[1],3);if(n&&!(G.sid&&n.seg.id===G.sid))return{ok:false,msg:'Other track is in the way'};}
    return{ok:true,msg:''};},
  isTownAt(G){const q=segById(G.sid);if(!q)return false;const pt=segPoint(q,G.t),v=Life.nearestVillage(pt[0],pt[1],420);return !!(v&&(v.level|0)>=Life.LEVELS.length-1);},
  stSync(){const G=this.stg;if(!G)return;G.chk=this.stCheck(G);const ok=$('#btnStOK');if(ok)ok.disabled=!G.chk.ok;for(const id of ['btnStRotL','btnStRotR']){const e=$(id==='btnStRotL'?'#btnStRotL':'#btnStRotR');if(e)e.hidden=!G.free;}this.info(G.chk.ok?(G.free?'This is where the station will be. It brings its own piece of track. Drag it, ⟲ ⟳ turn it, ⇅ other side. Press ✓ when it is right.':'This is where the station will be. Drag it, ⇅ other side. Press ✓ when it is right.'):G.chk.msg+'. Drag it somewhere else.');},
  flipGhost(){if(!this.stg)return;const s=this.stg.free?null:segById(this.stg.sid),cs=s?this.curveSide(s):0;if(cs&&-(this.stg.side||1)!==cs){UI.toast('The curve is too tight here for the building on the inside: it stays on the outside');return;}this.stg.side=-(this.stg.side||1);this.stg.sideSet=true;this.ui();this.stSync();},
  placeStation(g){const n=Track.stations.length+1,s=segById(g.sid);if(!s)return;const q=segPoint(s,g.t),v=Life.nearestVillage(q[0],q[1],420);const names=['Halte Heide','Halte Bos','Halte Meer','Kruispunt','Halte Berg','Halte Veld'];
    let name=v?v.name:names[(n-1)%names.length];if(Track.stations.some(s=>s.name===name))name+=' '+(Track.stations.filter(s=>s.name.startsWith(name)).length+1);
    const st={id:Track.nextId++,sid:g.sid,t:g.t,name,side:g.side||1};if(g.len&&g.len!==44)st.len=g.len;Track.stations.push(st);Life.attachSawmill(st);Net.levelStation(st);
    this.info(v?`Station ${name} built. People from ${v.name} will walk over and take the train.`:`Station ${name} built. Build it near a village and people will come and ride.`);
    Net.changed();App.trackChanged();Sfx.clunk();},
  info(t){if(t!=='')$('#buildInfo').textContent=t;},
  stateOf(n){return{node:n,x:n.x,z:n.z,y:n.y,h:n.h,g:n.g};},
  ui(){const m=this.mode,gh=!!(this.stg&&m==='signals'),pend=gh||!!(this.plan&&this.plan.pieces&&m!=='pieces'&&!this.stroke);
    for(const b of document.querySelectorAll('#buildBar [data-mode]'))b.classList.toggle('on',b.dataset.mode===m);const tab=this.tabOf(m);
    for(const b of document.querySelectorAll('#buildBar [data-btab]'))b.classList.toggle('on',b.dataset.btab===tab);$('#mTrackHow').hidden=tab!=='track'||this.remove;$('#bTrackOpts').hidden=tab!=='track'||this.remove;$('#btnRemove').hidden=tab!=='track';
    $('#bChoice').hidden=!this.choice||!!this.stroke;if(this.choice){const j=this.choice.kind==='join';$('#cA').textContent=j?'Join, fix heights':'Level crossing';$('#cB').textContent=j?'Join as drawn':'Junction (switch)';$('#cC').textContent=j?"Don't join":'Cancel';}
    $('#mSignals').hidden=m!=='signals';for(const b of document.querySelectorAll('#buildBar [data-sig]'))b.classList.toggle('on',b.dataset.sig===this.sigTool);
    const rd=this.road()&&m!=='signals',rb=rd&&Roads.tool!=='build';$('#mTrackHow').hidden=tab==='stations'||this.remove||rb;$('#bTrackOpts').hidden=tab!=='track'||this.remove;$('#btnClearAll').hidden=tab!=='track';$('#pSlope').hidden=rd;$('#pNew').textContent=rd?'New road':'New line';
    $('#mPieces').hidden=m!=='pieces'||this.remove||rb;$('#mRoute').hidden=m!=='route'||this.remove||rb;$('#bProfile').hidden=m==='pieces';$('#mRoads').hidden=tab!=='roads';for(const b of document.querySelectorAll('#buildBar [data-rtool]'))b.classList.toggle('on',b.dataset.rtool===Roads.tool);
    $('#bPending').hidden=!pend;$('#bIdle').hidden=pend;$('#btnBuildOK').disabled=!gh&&!(this.plan&&this.plan.ok);$('#btnStFlip').hidden=!gh;$('#btnStOK').hidden=!gh;$('#btnBuildOK').hidden=gh;$('#btnStRotL').hidden=!(gh&&this.stg.free);$('#btnStRotR').hidden=!(gh&&this.stg.free);if(gh)$('#btnStOK').disabled=!(this.stg.chk&&this.stg.chk.ok);$('#btnDiscard').textContent=gh?'Discard':'Discard plan';
    for(const b of document.querySelectorAll('#buildBar [data-v]'))b.classList.toggle('on',b.dataset.v===P.trackProfile);
    for(const b of document.querySelectorAll('#buildBar [data-dir]'))b.classList.toggle('on',+b.dataset.dir===this.pc.dir);
    for(const b of document.querySelectorAll('#buildBar [data-slope]'))b.classList.toggle('on',b.dataset.slope===this.pc.slope);
    for(const b of document.querySelectorAll('#buildBar [data-prefer]'))b.classList.toggle('on',b.dataset.prefer===this.rt.prefer);
    $('#pLen').textContent=this.pc.len+' m';$('#pRot').hidden=!(this.pc.cur&&!this.pc.cur.node);$('#pPlace').disabled=!(this.pc.cur&&this.plan&&this.plan.ok);
    $('#pNew').classList.toggle('on',this.pc.newLine);$('#pBranch').classList.toggle('on',!!this.pc.branch||!!(this.pc.cur&&this.pc.cur.sj));$('#pDemolish').disabled=!(this.pc.cur&&this.pc.cur.node);
    $('#bBridges').classList.toggle('on',!!P.trackBridges);$('#bTunnels').classList.toggle('on',!!P.trackTunnels);$('#btnRemove').classList.toggle('on',this.remove);},
  toggle(k){P[k]=P[k]?0:1;UI.refresh(k);this.replan();},
  setProfile(v){P.trackProfile=v;UI.refresh('trackProfile');this.replan();},
  toggleRemove(){this.discard(true);this.remove=!this.remove;this.ui();this.hint();},
  replan(){if(this.mode==='pieces')this.refresh();else if(this.mode==='draw'){if(this.plan&&this.plan.stroke&&!this.stroke){const st=this.plan.stroke;this.plan=this.make(st);if(this.plan&&this.plan.pieces)this.plan.stroke=st;this.show();}}
    else if(this.rt.a&&this.rt.b)this.runRoute();this.ui();},
  buzz(){try{navigator.vibrate&&navigator.vibrate(12);}catch(e){}},
  endNear(sx,sy,exclude){let best=null,bd=this.snapPx;for(const n of this.ends()){if(exclude&&n.id===exclude)continue;const s=Cam.toScreen(n.x,n.y,n.z);if(!s)continue;const d=Math.hypot(s[0]-sx,s[1]-sy);if(d<bd){bd=d;best=n;}}return best;},
  // ---- shared: heights, structures, summary for a set of pieces
  plan_(st,pieces,snap,vmode){
    const T=R.world,gmax=P.maxGrade/100,y0=st.y,gIn=st.node?st.g:null,Lt=pieces.reduce((a,p)=>a+p.L,0);let bad='';
    for(const p of pieces)for(let t=0;t<=p.L;t+=4){const q=segPoint(p,t);if(q[0]<10||q[1]<10||q[0]>T.W-10||q[1]>T.W-10){bad='That runs off the edge of the world';break;}}
    const tooSteep=()=>`The ends are ${Math.abs(snap.y-y0).toFixed(1)} m apart in height, too steep to join over ${Lt.toFixed(0)} m. ${this.mode==='pieces'?'Use ↗ / ↘ pieces to bring them level first.':'Start further away so it can climb.'}`;
    if(snap){if(vmode==='follow'){if(!profileFollow(pieces,y0,snap.y,gmax,gIn))bad=bad||tooSteep();}
      else{const avg=(snap.y-y0)/Lt;if(Math.abs(avg)>gmax*1.05)bad=bad||tooSteep();profileGrade(pieces,y0,snap.y,gIn!==null?clamp(gIn,-gmax,gmax):null,clamp(-snap.g,-gmax,gmax));}}
    else if(vmode==='follow')profileFollow(pieces,y0,null,gmax,gIn);
    else if(vmode==='grade'){const lp=pieces[pieces.length-1],e=segPoint(lp,lp.L);const yT=clamp(ground0(e[0],e[1])+FORMATION_DROP,y0-gmax*Lt,y0+gmax*Lt);profileGrade(pieces,y0,yT,gIn!==null?clamp(gIn,-gmax,gmax):null,null);}
    else{const gs=clamp(vmode,-gmax,gmax);profileGrade(pieces,y0,y0+gs*Lt,gIn!==null?clamp(gIn,-gmax,gmax):null,gs);}
    if(bad)profileGrade(pieces,y0,y0,null,null);
    const stt=classify(pieces);let steep=0,minR=1e9;for(const p of pieces){if(Math.abs(p.k)>1e-7)minR=Math.min(minR,1/Math.abs(p.k));for(let t=0;t<=p.L;t+=4)steep=Math.max(steep,Math.abs(segGrade(p,t)));}
    const lp=pieces[pieces.length-1],e=segPoint(lp,lp.L);
    const parts=[`${Lt.toFixed(0)} m`,minR<1e8?`tightest curve ${minR.toFixed(0)} m`:'straight',`steepest ${(steep*100).toFixed(1)}%`];
    if(stt.bridge>0)parts.push(`bridge ${stt.bridge.toFixed(0)} m`);if(stt.tunnel>0)parts.push(`tunnel ${stt.tunnel.toFixed(0)} m`);
    if(stt.maxCut>1.5)parts.push(`cutting ${stt.maxCut.toFixed(0)} m`);if(stt.maxFill>1.5)parts.push(`embankment ${stt.maxFill.toFixed(0)} m`);
    if(snap)parts.unshift('Joins up');
    return{pieces,snap,start:st.node?{node:st.node}:{x:st.x,z:st.z,sj:st.sj},ok:!bad,warn:stt.maxCut>7||stt.maxFill>7,msg:bad||parts.join(', '),endXY:[e[0],segY(lp,lp.L),e[1]],end:e};
  },
  joinNear(st,e,kmaxF){// ghost end close to a free end that faces back at it? join with an S-curve
    const kmax=1/Math.max(P.minRadius,20)*(kmaxF||1.02);
    for(const n of Track.freeEnds()){if(st.node&&n.id===st.node.id)continue;const d=Math.hypot(n.x-e[0],n.z-e[1]);if(d>Math.max(16,this.pc.len*0.45))continue;
      if(Math.abs(wrapPi(e[2]-(n.h+Math.PI)))>1.1)continue;const b=biarc(st.x,st.z,st.h,n.x,n.z,n.h+Math.PI);
      if(b&&b.length&&b.every(q=>Math.abs(q.k)<=kmax&&Math.abs(q.k*q.L)<2.2))return{pieces:b.filter(q=>q.L>0.3),node:n};}
    return null;},
  // ---- PIECES (RollerCoaster Tycoon)
  pieceGeom(){const st=this.pc.cur,d=this.pc.dir,rd=this.road(),Rmin=rd?12:Math.max(P.minRadius,20),Rg=rd?40:Math.max(Rmin*2.3,160);
    if(d===0)return{x0:st.x,z0:st.z,h0:st.h,k:0,L:this.pc.len};const R_=Math.abs(d)===2?Rmin:Rg;return{x0:st.x,z0:st.z,h0:st.h,k:(d<0?1:-1)/R_,L:R_*TURN};},
  slopeG(){const s=this.pc.slope,g=P.maxGrade/100,m=Math.min(P.buildGrade/100,g);return s==='auto'?'follow':s==='level'?0:s==='up'?m:s==='up2'?g:s==='down'?-m:-g;},
  refresh(){
    if(this.mode!=='pieces'){return;}
    const st=this.pc.cur;if(!st){this.plan=null;this.preview(null);this.ui();this.hint();return;}
    let pieces=[this.pieceGeom()],snap=null;const e=segPoint(pieces[0],pieces[0].L);
    if(this.road()){const j=this.roadJoin(st,e,Math.max(10,this.pc.len*0.45));if(j){pieces=j.pieces;snap=j.snap;}this.plan=this.roadPlan_(st,pieces,snap);}
    else{const j=this.joinNear(st,e);if(j){pieces=j.pieces;snap=j.node;}this.plan=this.plan_(st,pieces,snap,snap?'follow':this.slopeG());}this.preview(this.plan.pieces,this.plan.ok,this.plan.warn);
    const lp=this.plan.end;/* the camera only comes along when the piece being built is in view: opening Build never drags it to a far track end */{const sc=Cam.toScreen(st.x,st.y,st.z);if(sc&&sc[0]>-40&&sc[1]>-40&&sc[0]<innerWidth+40&&sc[1]<innerHeight+40&&Math.hypot(st.x-Cam.target[0],st.z-Cam.target[2])<Math.max(120,Cam.dist*1.6))this.camGoal={x:(st.x+lp[0])/2,z:(st.z+lp[1])/2,y:st.y};else this.camGoal=null;}
    this.info((snap?'':'Next piece: ')+this.plan.msg+(this.plan.ok?'':''));this.ui();},
  setDir(d){this.pc.dir=d;this.refresh();},setSlope(s){this.pc.slope=s;this.refresh();},
  addLen(d){this.pc.len=clamp(this.pc.len+d,10,120);this.refresh();},
  rotStart(s){if(this.pc.cur&&!this.pc.cur.node){this.pc.cur.h=wrapPi(this.pc.cur.h+s*TURN);this.refresh();}},
  // ---- junction: tap existing track to start a branch there (split happens when the first piece is placed)
  // a straight 70 m siding (two free ends to join up later) for a station placed away from the track
  makeSiding(x,z,h){const L=70,c=Math.cos(h),s2=Math.sin(h),x0=x-c*L/2,z0=z-s2*L/2,y=ground0(x,z)+FORMATION_DROP;const a={id:Track.nextId++,x:x0,z:z0,y,h:h+Math.PI,g:0},b={id:Track.nextId++,x:x0+c*L,z:z0+s2*L,y,h,g:0};
    Track.undo.push(JSON.stringify(Track.serialize()));Track.nodes.push(a,b);const sg={id:Track.nextId++,a:a.id,b:b.id,x0,z0,h0:h,k:0,L,y0:y,y1:y,g0:0,g1:0,spans:[]};Track.segs.push(sg);Net.changed();App.trackChanged();if(Money.on())Money.spend(Math.round(L*110),'station siding');
    this.info('Station siding laid: join its gold ends to your line.');return{seg:sg,t:L/2};},
  // ---- a second station track (grand station only): a parallel track 7.2 m out (an island platform between) on the side away from the building, over the platform plus 24 m each way
  // (room for the player's switches), with its own platform on the outer side and a waiting shelter. Its ends are left free (gold
  // rings) for the player to join to the line. Each piece is the exact offset of the line beside it (same heading, curvature k/(1-k·o)).
  addTwin(st){if(st.twinId&&Track.stations.some(q=>q.id===st.twinId)){UI.toast('This station already has a second track');return;}
    const si=Life.stInfo.find(q=>q.st===st);if(!si||si.cargo||si.parent)return;if(!Life.stTown(si)){UI.toast('A second track comes with the grand station, once the town has grown to its full size');return;}const s0=segById(st.sid);if(!s0)return;const G=KIT.TWIN_G,H=(st.len||44)/2+24;
    const pcs=[{seg:s0,ta:Math.max(0,st.t-H),tb:Math.min(s0.L,st.t+H),dOf:t=>t-st.t}];
    for(const sg of [1,-1]){let seg=s0,node=sg>0?s0.b:s0.a,dE=sg>0?s0.L-st.t:st.t,guard=0;
      while(dE<H&&guard++<40){const nx=Net.linked(node).filter(q=>q!==seg);if(nx.length!==1)break;const n2=nx[0];if(pcs.some(p=>p.seg===n2))break;const fromA=n2.a===node,d0=dE,len=Math.min(n2.L,H-dE);
        pcs.push(fromA?{seg:n2,ta:0,tb:len,dOf:t=>sg*(d0+t)}:{seg:n2,ta:n2.L-len,tb:n2.L,dOf:t=>sg*(d0+n2.L-t)});dE+=n2.L;seg=n2;node=fromA?n2.b:n2.a;}}
    if(pcs.some(p=>(p.seg.spans||[]).some(q=>q[1]>p.ta&&q[0]<p.tb))){UI.toast('The second track cannot run over a bridge or through a tunnel here');return;}
    const away=[-si.nx,-si.nz],out=[];
    for(const p of pcs){if(p.tb-p.ta<0.5)continue;const tm=(p.ta+p.tb)/2,qm=segPoint(p.seg,tm),o=G*Math.sign(-Math.sin(qm[2])*away[0]+Math.cos(qm[2])*away[1]||1),s=p.seg,q0=segPoint(s,p.ta),fac=1-s.k*o;
      if(fac<0.3){UI.toast('The curve is too tight for a second track here');return;}
      const L=(p.tb-p.ta)*fac,n=Math.max(2,Math.ceil(L/2)),prof=[];for(let i=0;i<=n;i++)prof.push(segY(s,p.ta+(p.tb-p.ta)*i/n));
      const ns={id:Track.nextId++,x0:q0[0]-Math.sin(q0[2])*o,z0:q0[1]+Math.cos(q0[2])*o,h0:q0[2],k:s.k/fac,L,y0:prof[0],y1:prof[n],g0:0,g1:0,prof,spans:[]};
      const dA=p.dOf(p.ta),dB=p.dOf(p.tb);out.push({ns,lo:Math.min(dA,dB),aIsLo:dA<dB,src:p,fac});}
    out.sort((a,b)=>a.lo-b.lo);const nodes=[];
    const mk=(pt,h,y)=>{const nd={id:Track.nextId++,x:pt[0],z:pt[1],y,h:wrapPi(h),g:0};nodes.push(nd);return nd;};
    let prev=null;out.forEach((e,i)=>{const s=e.ns,pa=[s.x0,s.z0],pb=segPoint(s,s.L),hA=s.h0,hB=segPoint(s,s.L)[2];
      const loPt=e.aIsLo?pa:pb,hiPt=e.aIsLo?pb:pa,loY=e.aIsLo?s.y0:s.y1,hiY=e.aIsLo?s.y1:s.y0;
      // heading pointing toward +d at either end
      const fwdLo=e.aIsLo?hA:hB+Math.PI,fwdHi=e.aIsLo?hB:hA+Math.PI;
      const nLo=prev||mk(loPt,i===0?fwdLo+Math.PI:fwdLo,loY),nHi=mk(hiPt,i===out.length-1?fwdHi:fwdHi,hiY);
      if(e.aIsLo){s.a=nLo.id;s.b=nHi.id;}else{s.b=nLo.id;s.a=nHi.id;}prev=nHi;});
    Track.undo.push(JSON.stringify(Track.serialize()));Track.nodes.push(...nodes);Track.segs.push(...out.map(e=>e.ns));
    // the second platform's station: same name, centre opposite the first, platform on the outer side
    const ce=out.find(e=>e.src.seg===s0);const tC=(st.t-ce.src.ta)*ce.fac,qc=segPoint(ce.ns,tC),side=Math.sign(Math.sin(qc[2])*away[0]-Math.cos(qc[2])*away[1])||1;
    const tw={id:Track.nextId++,sid:ce.ns.id,t:tC,name:st.name,side,twinOf:st.id};if(st.len&&st.len!==44)tw.len=st.len;Track.stations.push(tw);st.twinId=tw.id;
    const Lt=out.reduce((a,e)=>a+e.ns.L,0);if(Money.on())Money.spend(Math.round(Lt*110+6000),'second station track');
    Log.info(`second track at ${st.name}: ${out.length} pieces, ${Lt.toFixed(0)} m, platform ${(tw.len||44)} m`);
    Net.changed();App.trackChanged();Sfx.clunk();this.info(`A second track and platform at ${st.name}. Join its two gold ends to your line with switches.`);},
  branchMode(){this.pc.branch=!this.pc.branch;this.pc.newLine=false;if(this.pc.branch){this.pc.cur=null;this.plan=null;this.preview(null);this.info(this.road()?'Tap a road where the new road should branch off.':'Tap the track where the junction should be.');}else this.hint();this.ui();},
  // a road branches off any road: it starts on the road, square to it, on the side the camera looks to (⟲ ⟳ turn it)
  roadBranchAt(h){const q=Roads.nearestRoad(h[0],h[2],Math.max(8,Cam.dist*0.03));if(!q){UI.toast('Tap on a road to branch off it');return;}let a=Math.atan2(q.dx,-q.dz);if(Math.cos(a)*(h[0]-q.x)+Math.sin(a)*(h[2]-q.z)<0&&Math.hypot(h[0]-q.x,h[2]-q.z)>1)a+=Math.PI;
    else if(Math.cos(a)*Cam.fwd[0]+Math.sin(a)*Cam.fwd[2]<0&&Math.hypot(h[0]-q.x,h[2]-q.z)<=1)a+=Math.PI;const sx=q.x+Math.cos(a)*(q.w*0.5),sz=q.z+Math.sin(a)*(q.w*0.5);
    this.pc.cur={x:sx,z:sz,y:ground0(sx,sz)+0.4,h:wrapPi(a),g:0,onRoad:q.road};if(this.pc.dir===2||this.pc.dir===-2)this.pc.dir=0;this.pc.branch=false;this.buzz();this.refresh();this.info('Branch: choose a piece and tap Place. ⟲ ⟳ turn it.');},
  // an arc from a start state ending exactly at (x,z) (a road meets another road at any angle)
  arcTo(st,x,z){const dx=x-st.x,dz=z-st.z,d=Math.hypot(dx,dz);if(d<0.5)return null;const a=wrapPi(Math.atan2(dz,dx)-st.h);if(Math.abs(a)>1.45)return null;if(Math.abs(a)<1e-4)return{x0:st.x,z0:st.z,h0:st.h,k:0,L:d};
    for(const sg of [1,-1]){const k=sg*2*Math.sin(a)/d,L=Math.abs(a*d/Math.sin(a)),p={x0:st.x,z0:st.z,h0:st.h,k,L},e=segPoint(p,L);if(Math.hypot(e[0]-x,e[1]-z)<0.3)return p;}return null;},
  // join a road end ring facing back (an S-curve), or meet any road near the end of the plan
  roadJoin(st,e,reach){const kmax=1/10;for(const n of Roads.ends()){if(st.node&&n.id===st.node.id)continue;const d=Math.hypot(n.x-e[0],n.z-e[1]);if(d>reach)continue;if(Math.abs(wrapPi(e[2]-(n.h+Math.PI)))>1.3)continue;
      const b=biarc(st.x,st.z,st.h,n.x,n.z,n.h+Math.PI);if(b&&b.length&&b.every(q=>Math.abs(q.k)<=kmax&&Math.abs(q.k*q.L)<2.4))return{pieces:b.filter(q=>q.L>0.3),snap:{x:n.x,z:n.z,node:n}};}
    const q=Roads.nearestRoad(e[0],e[1],Math.max(6,reach*0.7));if(q&&q.road!==st.onRoad&&!(st.rid&&q.road.id===st.rid)&&Math.hypot(q.x-st.x,q.z-st.z)>8){const a=this.arcTo(st,q.x,q.z);if(a)return{pieces:[a],snap:{x:q.x,z:q.z,road:q.road}};}
    return null;},
  // a road plan: it lies on the ground (the bridges over water come with it), so only its length, bends and slope are told
  roadPlan_(st,pieces,snap){const T=R.world;let bad='',L=0,minR=1e9,steep=0,wet=0;
    for(const p of pieces){L+=p.L;if(Math.abs(p.k)>1e-7)minR=Math.min(minR,1/Math.abs(p.k));let ly=null;for(let t=0;t<=p.L+1e-6;t+=3){const q=segPoint(p,Math.min(t,p.L));if(q[0]<10||q[1]<10||q[0]>T.W-10||q[1]>T.W-10){bad='That runs off the edge of the world';break;}
        const y=ground0(q[0],q[1]);if(ly!==null)steep=Math.max(steep,Math.abs(y-ly)/3);ly=y;const w=sampleWater(T,q[0],q[1]);if(w[1]>0&&w[0]>y+0.2)wet+=3;}}
    for(let i=1;i<pieces.length;i++){const a=pieces[i-1],b=pieces[i];if(Math.abs(a.k)>1e-7||Math.abs(b.k)>1e-7)continue;const dh=Math.abs(wrapPi(b.h0-a.h0));if(dh>0.02)minR=Math.min(minR,(a.L+b.L)/2/dh);}// a routed road is a chain of short straights
    if(!bad&&steep>0.45)bad=`Too steep for a road here (${(steep*100).toFixed(0)}%). Go round the hill.`;
    const lp=pieces[pieces.length-1],e=segPoint(lp,lp.L),parts=[`${L.toFixed(0)} m of gravel road`,minR<1e8?`tightest bend ${minR.toFixed(0)} m`:'straight',`steepest ${(steep*100).toFixed(0)}%`];
    if(wet>0)parts.push(`bridge ${wet.toFixed(0)} m`);if(Money.on())parts.push(`costs ${Money.fmt?Money.fmt(Math.round(L*45)):Math.round(L*45)}`);if(snap)parts.unshift('Joins the road');
    return{pieces,snap,start:st,ok:!bad,warn:steep>0.3,msg:bad||parts.join(', '),endXY:[e[0],ground0(e[0],e[1])+0.4,e[1]],end:e,road:true};},
  // draw a road: follow the finger with bends no tighter than 12 m, 4 m at a time
  roadMake(st){const T=R.world,kmax=1/12,tr=st.trail;let x,z,h,start=null;
    if(st.node){start=Roads.ends().find(n=>n.id===st.node);if(!start)return null;x=start.x;z=start.z;h=start.h;}
    else{let far=null;for(const p of tr)if(Math.hypot(p[0]-st.ax,p[1]-st.az)>8){far=p;break;}if(!far)return{pieces:null};x=st.ax;z=st.az;const q=Roads.nearestRoad(x,z,5);if(q){x=q.x;z=q.z;st.onRoad=q.road;}h=Math.atan2(far[1]-z,far[0]-x);}
    const s0={x,z,h,y:ground0(x,z)+0.4,g:0,node:start||null,onRoad:st.onRoad};const step=4,Ld=10,pieces=[];let idx=0,guard=600;
    while(guard-->0){while(idx<tr.length-1&&(Math.hypot(tr[idx][0]-x,tr[idx][1]-z)<Ld||((tr[idx][0]-x)*Math.cos(h)+(tr[idx][1]-z)*Math.sin(h))<0))idx++;
      const tg=tr[idx],dx=tg[0]-x,dz=tg[1]-z,d=Math.hypot(dx,dz);if(idx===tr.length-1&&(d<step||(dx*Math.cos(h)+dz*Math.sin(h))<0))break;
      const a=wrapPi(Math.atan2(dz,dx)-h),k=clamp(2*Math.sin(a)/Math.max(d,1),-kmax,kmax),p={x0:x,z0:z,h0:h,k,L:step},e=segPoint(p,step);if(e[0]<12||e[1]<12||e[0]>T.W-12||e[1]>T.W-12)break;pieces.push(p);x=e[0];z=e[1];h=e[2];}
    if(!pieces.length)return{pieces:null};let snap=null;
    if(st.snap){const n=Roads.ends().find(q=>q.id===st.snap);if(n){for(let back=0;back<Math.min(pieces.length-1,40)&&!snap;back++){const cut=pieces.slice(0,pieces.length-back),lp=cut[cut.length-1],e=segPoint(lp,lp.L),b=biarc(e[0],e[1],e[2],n.x,n.z,n.h+Math.PI);
        if(b&&b.length&&b.every(q=>Math.abs(q.k)<=1/10&&Math.abs(q.k*q.L)<2.4)){pieces.length=0;pieces.push(...cut,...b.filter(q=>q.L>0.3));snap={x:n.x,z:n.z,node:n};}}}}
    if(!snap){const end=tr[tr.length-1],q=Roads.nearestRoad(end[0],end[1],6);if(q&&q.road!==st.onRoad&&Math.hypot(q.x-s0.x,q.z-s0.z)>10){for(let back=0;back<Math.min(pieces.length-1,6)&&!snap;back++){const cut=pieces.slice(0,pieces.length-back),lp=cut[cut.length-1],e=segPoint(lp,lp.L),a=this.arcTo({x:e[0],z:e[1],h:e[2]},q.x,q.z);if(a){pieces.length=0;pieces.push(...cut,a);snap={x:q.x,z:q.z,road:q.road};}}}}
    return this.roadPlan_(s0,pieces,snap);},
  // route a road: the village-road planner (follows the land, bridges small water)
  roadRoute(){const rt=this.rt;const a=[rt.a.x,rt.a.z],b=[rt.b.x,rt.b.z];const pts=Life.routePath(a,b,{cs:5,margin:90,bridge:true,wind:rt.prefer==='scenic'?0.25:0.04,road:0.6,maxG:0.32});
    if(!pts||pts.length<2){this.info('No road route found. Try a closer destination.');this.ui();return;}const pieces=[];for(let i=1;i<pts.length;i++){const dx=pts[i][0]-pts[i-1][0],dz=pts[i][1]-pts[i-1][1],L=Math.hypot(dx,dz);if(L<0.3)continue;pieces.push({x0:pts[i-1][0],z0:pts[i-1][1],h0:Math.atan2(dz,dx),k:0,L});}
    const st={x:a[0],z:a[1],h:pieces[0].h0,y:ground0(a[0],a[1])+0.4,g:0};this.plan=this.roadPlan_(st,pieces,rt.b.road||rt.b.node?{x:b[0],z:b[1]}:null);this.preview(this.plan.pieces,this.plan.ok,this.plan.warn);
    let x0=1e9,z0=1e9,x1=-1e9,z1=-1e9;for(const p of pts){x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);z0=Math.min(z0,p[1]);z1=Math.max(z1,p[1]);}this.camGoal={x:(x0+x1)/2,z:(z0+z1)/2,dist:clamp(Math.hypot(x1-x0,z1-z0)*1.1,120,2200),pitch:1.0};
    this.info(this.plan.msg+(this.plan.ok?`. Build it, ✕ to discard, or try the ${rt.prefer==='scenic'?'direct':'scenic'} route.`:''));this.ui();},
  branchAt(h){const hit=Net.nearestOnTrack(h[0],h[2],10);if(!hit){UI.toast('Tap on the track to place a junction');return;}const s=hit.seg;let t=hit.t;
    const endNode=t<5?Track.node(s.a):t>s.L-5?Track.node(s.b):null;
    if(endNode){const k=Net.linked(endNode.id).length;if(k===1){this.pc.cur=this.stateOf(endNode);this.pc.branch=false;this.refresh();return;}if(k>=3){UI.toast('There is already a junction here');return;}}
    const p=segPoint(s,clamp(t,0,s.L)),fwd=endNode?(endNode.id===s.a?s.h0:segPoint(s,s.L)[2]):p[2],g=segGrade?segGrade(s,clamp(t,0,s.L)):0;
    this.pc.cur=endNode?{node:endNode,x:endNode.x,z:endNode.z,y:endNode.y,h:fwd,g:endNode.id===s.a?-g:g,jx:true}:{x:p[0],z:p[1],y:segY(s,t),h:fwd,g,sj:{sid:s.id,t},jx:true};
    if(this.pc.dir===0)this.pc.dir=-1;this.pc.branch=false;this.buzz();this.refresh();this.info('Junction: choose a curve and tap Place. Tap the junction again to branch the other way.');},
  newLine(){this.pc.newLine=!this.pc.newLine;this.pc.branch=false;if(this.pc.newLine){this.pc.cur=null;this.plan=null;this.preview(null);}this.ui();this.hint();},
  place(){const p=this.plan;if(this.mode!=='pieces'||!p||!p.ok)return;
    if(this.road()){if(!Money.canBuild()){UI.toast('Out of money');return;}const r=Roads.commitPlan(p);if(!r)return;if(p.snap){this.pc.cur=null;this.plan=null;this.preview(null);this.ui();UI.toast('Joined up!');this.info('Joined the road. Tap a gold ring to build more.');return;}
      const lp=p.pieces[p.pieces.length-1],e=segPoint(lp,lp.L);this.pc.cur={node:{id:'r'+r.id+'b'},x:e[0],z:e[1],y:ground0(e[0],e[1])+0.4,h:e[2],g:0,rid:r.id};this.refresh();return;}
    this.commit(p);
    if(p.snap){this.pc.cur=null;this.plan=null;this.preview(null);this.ui();UI.toast('Joined up!');this.info('Joined up. Tap a gold ring to build more.');return;}
    const last=Track.nodes[Track.nodes.length-1];this.pc.cur=this.stateOf(last);this.refresh();},
  demolish(){const c=this.pc.cur;if(!c||!c.node)return;
    if(this.road()){const r=Roads.list.find(q=>'r'+q.id+'b'===c.node.id||'r'+q.id+'a'===c.node.id);if(!r)return;const atB='r'+r.id+'b'===c.node.id,p=r.p,n=p.length/2,k=atB?0:n-1,k2=atB?1:n-2;
      Roads.undoL.push(JSON.stringify(Roads.list.map(q=>({p:Array.from(q.p),w:q.w,kind:q.kind,id:q.id}))));Roads.list.splice(Roads.list.indexOf(r),1);Roads.ver++;Life.roadsDirty=true;Buses.G=null;
      const x=p[k*2],z=p[k*2+1],e=Roads.ends().find(q=>Math.hypot(q.x-x,q.z-z)<0.5);this.pc.cur=e?this.stateOf(e):{x,z,y:ground0(x,z)+0.4,h:Math.atan2(z-p[k2*2+1],x-p[k2*2])+Math.PI,g:0};this.refresh();this.ui();return;}const s=Track.segs.find(s=>s.a===c.node.id||s.b===c.node.id);if(!s)return;
    const other=s.a===c.node.id?s.b:s.a;removeSeg(s.id);App.trackChanged();Trains.trackChanged();const n=Track.node(other);this.pc.cur=n?this.stateOf(n):null;this.refresh();this.ui();if(!n)this.hint();},
  // ---- DRAW (finger on the plan view)
  make(st){if(this.road())return this.roadMake(st);
    const T=R.world,Rmin=P.minRadius,kmax=1/Rmin,gmax=P.maxGrade/100,tr=st.trail;let x,z,h,y0,gIn=null,startNode=null;
    if(st.node){startNode=Track.node(st.node);if(!startNode)return null;x=startNode.x;z=startNode.z;h=startNode.h;y0=startNode.y;gIn=startNode.g;}
    else{let far=null;for(const p of tr)if(Math.hypot(p[0]-st.ax,p[1]-st.az)>8){far=p;break;}if(!far)return{pieces:null};x=st.ax;z=st.az;h=Math.atan2(far[1]-z,far[0]-x);y0=ground0(x,z)+FORMATION_DROP;}
    const sx=x,sz=z,sh=h;
    const step=4,Ld=clamp(Rmin*1.2,18,50);let idx=0,len=0,turnWin=[];for(let i=1;i<tr.length;i++)len+=Math.hypot(tr[i][0]-tr[i-1][0],tr[i][1]-tr[i-1][1]);
    const raw=[],end=tr[tr.length-1];let guard=Math.ceil(len/step)*3+60;
    while(guard-->0){
      while(idx<tr.length-1&&(Math.hypot(tr[idx][0]-x,tr[idx][1]-z)<Ld||((tr[idx][0]-x)*Math.cos(h)+(tr[idx][1]-z)*Math.sin(h))<0))idx++;
      const tg=tr[idx],dx=tg[0]-x,dz=tg[1]-z,d=Math.hypot(dx,dz);
      if(idx===tr.length-1&&(d<step||(dx*Math.cos(h)+dz*Math.sin(h))<0))break;
      const a=wrapPi(Math.atan2(dz,dx)-h);const k=clamp(2*Math.sin(a)/Math.max(d,1),-kmax,kmax);
      const s={x0:x,z0:z,h0:h,k,L:step},e=segPoint(s,step);if(e[0]<12||e[1]<12||e[0]>T.W-12||e[1]>T.W-12)break;
      raw.push(k);x=e[0];z=e[1];h=e[2];turnWin.push(k*step);if(turnWin.length>70)turnWin.shift();if(Math.abs(turnWin.reduce((a2,b2)=>a2+b2,0))>Math.PI*1.6)break;}
    if(raw.length<2)return{pieces:null};
    // merge into a few constant-radius pieces; nearly straight runs become true straights
    const ks=raw.map((k,i)=>(raw[Math.max(0,i-1)]+2*k+raw[Math.min(raw.length-1,i+1)])/4);
    const runs=[];let cur=null;const tol=0.22*kmax;
    for(const k0 of ks){const k=Math.abs(k0)<1/1600?0:k0;if(cur&&Math.abs(k-cur.k)<tol&&cur.L<240){cur.k=(cur.k*cur.L+k*step)/(cur.L+step);cur.L+=step;}else{cur={k,L:step};runs.push(cur);}}
    for(const r of runs)if(Math.abs(r.k)<1/1600)r.k=0;
    const chain=(sx,sz,sh,rs)=>{const out=[];let px=sx,pz=sz,ph=sh;for(const r of rs){const p={x0:px,z0:pz,h0:ph,k:r.k,L:r.L};out.push(p);const e=segPoint(p,r.L);px=e[0];pz=e[1];ph=e[2];}return out;};
    let pieces=chain(sx,sz,sh,runs);
    {// merging can drift the end a little: trim anything that leaves the world
      const inW=(px,pz)=>px>=12&&pz>=12&&px<=T.W-12&&pz<=T.W-12;const out=[];
      for(const p of pieces){let L=p.L;for(let t=2;t<=p.L;t+=2){const q=segPoint(p,t);if(!inW(q[0],q[1])){L=t-2;break;}}if(L>0.5)out.push({...p,L});if(L<p.L)break;}
      pieces=out;if(!pieces.length)return{pieces:null};}
    // join another end: walk back along the ghost until an S-curve can meet it at its heading
    let snap=st.junc?st.junc:(st.snap&&!st.noSnap?Track.node(st.snap):null),joinFail=false;let regrade=null;
    // auto-correct: let the new line climb what it can and lift / lower the existing track to meet it
    if(snap&&st.fix&&!st.junc){const Lt0=pieces.reduce((a,p)=>a+p.L,0),reach=gmax*0.9*Lt0,yR=clamp(snap.y,y0-reach,y0+reach),dy=yR-snap.y;
      if(Math.abs(dy)>0.05){regrade={nid:snap.id,dy};snap={...snap,y:yR};}}
    // a join must be a sensible S-curve: within the radius limit, no loops, not much longer than the gap
    const good=(b,e)=>{if(!b||!b.length)return false;const d=Math.hypot(snap.x-e[0],snap.z-e[1]),Lb=b.reduce((a,q)=>a+q.L,0);
      return b.every(q=>Math.abs(q.k)<=kmax*1.02&&Math.abs(q.k*q.L)<2.4)&&Lb<d*1.5+25;};
    if(snap){let ok=null;const total=pieces.reduce((a,p)=>a+p.L,0);
      for(let back=0;back<=Math.min(total-4,260)&&!ok;back+=4){let rem=total-back;const cut=[];
        for(const p of pieces){if(rem<=0)break;const L=Math.min(p.L,rem);cut.push({...p,L});rem-=L;}
        const lp=cut[cut.length-1],e=segPoint(lp,lp.L);const b=biarc(e[0],e[1],e[2],snap.x,snap.z,snap.h+Math.PI);if(good(b,e))ok=cut.concat(b);}
      if(!ok){const p0=pieces[0];const b=biarc(p0.x0,p0.z0,p0.h0,snap.x,snap.z,snap.h+Math.PI);if(good(b,[p0.x0,p0.z0]))ok=b;}
      if(ok)pieces=ok.filter(p=>p.L>0.4);else{joinFail=true;snap=null;}}
    // heights: ride the ground (smoothed, within the max grade) or one even grade
    const Lt=pieces.reduce((a,p)=>a+p.L,0);let bad='';
    if(snap){if(P.trackProfile==='follow'){if(!profileFollow(pieces,y0,snap.y,gmax,gIn))bad=`Too steep to join that end (max ${P.maxGrade}%)`;}
      else{const avg=(snap.y-y0)/Lt;if(Math.abs(avg)>gmax*1.05)bad=`Too steep to join that end: ${(avg*100).toFixed(1)}%`;profileGrade(pieces,y0,snap.y,gIn!==null?clamp(gIn,-gmax,gmax):null,clamp(-snap.g,-gmax,gmax));}}
    else if(P.trackProfile==='follow')profileFollow(pieces,y0,null,gmax,gIn);
    else{const lp=pieces[pieces.length-1],e=segPoint(lp,lp.L);let yT=ground0(e[0],e[1])+FORMATION_DROP;yT=clamp(yT,y0-gmax*Lt,y0+gmax*Lt);profileGrade(pieces,y0,yT,gIn!==null?clamp(gIn,-gmax,gmax):null,null);}
    if(bad)profileGrade(pieces,y0,y0,null,null);
    // level crossings: the new line meets the old one at its height there
    for(const cx of st.cross||[]){let best=null,bd=1e9,acc=0;for(const p of pieces){for(let t=0;t<=p.L;t+=2){const q=segPoint(p,t),d=Math.hypot(q[0]-cx.x,q[1]-cx.z);if(d<bd){bd=d;best=acc+t;}}acc+=p.L;}
      if(best===null||bd>12)continue;acc=0;for(const p of pieces){const n=Math.max(2,Math.ceil(p.L/3)),pr=[];for(let i=0;i<=n;i++){const t=p.L*i/n,dd=Math.abs(acc+t-best),w=1-smooth(8,45,dd);const y=segY(p,t);pr.push(y+(cx.y-y)*w);}
        p.prof=pr;p.y0=pr[0];p.y1=pr[n];acc+=p.L;}}
    const stt=classify(pieces);let steep=0,minR=1e9;for(const p of pieces){if(Math.abs(p.k)>1e-7)minR=Math.min(minR,1/Math.abs(p.k));for(let t=0;t<=p.L;t+=4)steep=Math.max(steep,Math.abs(segGrade(p,t)));}
    const lp=pieces[pieces.length-1],e=segPoint(lp,lp.L);
    const parts=[`${Lt.toFixed(0)} m`];parts.push(minR<1e8?`tightest curve ${minR.toFixed(0)} m`:'straight');parts.push(`steepest ${(steep*100).toFixed(1)}%`);
    if(stt.bridge>0)parts.push(`bridge ${stt.bridge.toFixed(0)} m`);if(stt.tunnel>0)parts.push(`tunnel ${stt.tunnel.toFixed(0)} m`);
    if(stt.maxCut>1.5)parts.push(`cutting ${stt.maxCut.toFixed(0)} m`);if(stt.maxFill>1.5)parts.push(`embankment ${stt.maxFill.toFixed(0)} m`);
    if(snap)parts.unshift(st.junc?'Joins the line with a switch':'Joins up');if(joinFail)parts.push("can't join that end smoothly from here");if((st.cross||[]).length)parts.push(`${st.cross.length} level crossing${st.cross.length>1?'s':''}`);
    let mods=null;if(regrade&&!bad){const r=Net.regrade(regrade.nid,regrade.dy,true);mods=r.mods;parts.push(`${regrade.dy>0?'raises':'lowers'} the last ${r.ramp.toFixed(0)} m of the old track by up to ${Math.abs(regrade.dy).toFixed(1)} m (ghost)`);}
    if(bad&&st.snap&&!st.fix&&!st.junc)bad+=' Hold on the ring to see fixes.';
    return{regrade,mods,junc:st.junc||null,pieces,snap,start:startNode?{node:startNode}:{x:st.ax,z:st.az},ok:!bad,warn:stt.maxCut>10||stt.maxFill>10||joinFail,msg:bad||parts.join(', '),endXY:[e[0],segY(lp,lp.L),e[1]]};
  },
  show(){const p=this.plan;if(!p||!p.pieces){this.preview(null);return;}this.preview(p.mods?p.pieces.concat(p.mods.map(m=>({...m.seg,prof:m.prof,id:-m.seg.id}))):p.pieces,p.ok,p.warn||!!p.mods);
    this.info(this.stroke?p.msg:(p.ok?p.msg+'. Build it, or ✕ to discard.':p.msg));},
  // roads have no rails to ghost: the plan is drawn over the map as a road-wide band (green: fine, amber: steep, red: not possible),
  // with gold rings at the open ends of your roads and an arrow at the start of the next piece
  roadTick(){const c=$('#ovl');if(!c)return;const on=this.active&&this.road()&&this.mode!=='signals'&&Roads.tool==='build';
    if(!on){if(this.rDrawn){this.rDrawn=false;c.getContext('2d').clearRect(0,0,c.width,c.height);}return;}
    this.drawTrail();const g=c.getContext('2d');g.save();g.scale(devicePixelRatio,devicePixelRatio);this.rDrawn=true;const S=(x,y,z)=>Cam.toScreen(x,y,z);
    const pv=this.rPrev;if(pv&&pv.pieces){const A=[],B=[];for(const p of pv.pieces){const n=Math.max(1,Math.ceil(p.L/2));for(let i=A.length?1:0;i<=n;i++){const q=segPoint(p,p.L*i/n),nx=-Math.sin(q[2]),nz=Math.cos(q[2]),y=ground0(q[0],q[1])+0.3;
        A.push(S(q[0]+nx*2.1,y,q[1]+nz*2.1));B.push(S(q[0]-nx*2.1,y,q[1]-nz*2.1));}}
      g.fillStyle=pv.ok?(pv.warn?'rgba(250,185,50,0.5)':'rgba(95,225,115,0.45)'):'rgba(250,70,50,0.5)';g.strokeStyle='rgba(255,255,255,0.75)';g.lineWidth=1.5;
      // one polygon per unbroken run (points behind the camera split it), filled once so the overlaps do not darken
      let i=0;while(i<A.length){while(i<A.length&&!(A[i]&&B[i]))i++;let j=i;while(j<A.length&&A[j]&&B[j])j++;if(j-i>=2){g.beginPath();g.moveTo(A[i][0],A[i][1]);for(let k=i+1;k<j;k++)g.lineTo(A[k][0],A[k][1]);for(let k=j-1;k>=i;k--)g.lineTo(B[k][0],B[k][1]);g.closePath();g.fill();
          g.beginPath();g.moveTo(A[i][0],A[i][1]);for(let k=i+1;k<j;k++)g.lineTo(A[k][0],A[k][1]);g.stroke();g.beginPath();g.moveTo(B[i][0],B[i][1]);for(let k=i+1;k<j;k++)g.lineTo(B[k][0],B[k][1]);g.stroke();}i=j;}}
    g.lineWidth=3.5;for(const n of Roads.ends()){const p=S(n.x,n.y,n.z);if(!p)continue;g.strokeStyle='#0007';g.beginPath();g.arc(p[0],p[1],12,0,6.283);g.stroke();g.strokeStyle='#e8c25a';g.lineWidth=2.5;g.beginPath();g.arc(p[0],p[1],12,0,6.283);g.stroke();g.lineWidth=3.5;}
    const cur=this.mode==='pieces'?this.pc.cur:null;if(cur){const p=S(cur.x,cur.y,cur.z),q=S(cur.x+Math.cos(cur.h)*6,cur.y,cur.z+Math.sin(cur.h)*6);if(p&&q){g.strokeStyle='#fff';g.fillStyle='#e8c25a';g.lineWidth=3;g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1]);g.stroke();g.beginPath();g.arc(p[0],p[1],7,0,6.283);g.fill();g.stroke();}}
    if(this.mode==='route'&&this.rt.a){const p=S(this.rt.a.x,ground0(this.rt.a.x,this.rt.a.z)+0.4,this.rt.a.z);if(p){g.fillStyle='#e8c25a';g.strokeStyle='#fff';g.lineWidth=2.5;g.beginPath();g.arc(p[0],p[1],8,0,6.283);g.fill();g.stroke();}}
    g.restore();},
  drawTrail(){const c=$('#ovl'),g=c.getContext('2d');if(c.width!==innerWidth*devicePixelRatio){c.width=innerWidth*devicePixelRatio;c.height=innerHeight*devicePixelRatio;}
    g.clearRect(0,0,c.width,c.height);if(!this.stroke)return;g.save();g.scale(devicePixelRatio,devicePixelRatio);g.lineWidth=5;g.lineCap='round';g.lineJoin='round';g.strokeStyle='#efe8d6cc';g.setLineDash([2,9]);g.beginPath();let first=true;
    for(const p of this.stroke.trail){const s=Cam.toScreen(p[0],ground0(p[0],p[1])+1,p[1]);if(!s)continue;if(first){g.moveTo(s[0],s[1]);first=false;}else g.lineTo(s[0],s[1]);}g.stroke();
    if(this.hold&&this.hold.t>0.04){const f=Math.min(1,this.hold.t/0.5);g.setLineDash([]);g.lineWidth=6;g.strokeStyle='#0008';g.beginPath();g.arc(this.hold.sx,this.hold.sy-58,26,0,6.283);g.stroke();
      g.strokeStyle=this.hold.kind==='join'?'#5ab0ff':'#c9a14a';g.beginPath();g.arc(this.hold.sx,this.hold.sy-58,26,-1.5708,-1.5708+f*6.283);g.stroke();}g.restore();},
  // ---- ROUTE (A* planner)
  async runRoute(){const rt=this.rt;if(!rt.a||!rt.b||rt.busy)return;if(this.road()){this.roadRoute();return;}rt.busy=true;this.plan=null;this.preview(null);this.ui();
    this.info('Looking for a route…');const t0=performance.now();
    const res=await planRoute(rt.a,rt.b,rt.prefer,(f,d)=>this.info(`Looking for a route… ${Math.round(f*100)}%`));rt.busy=false;
    if(!res){this.info(`No route found within the limits. Try ${rt.prefer==='scenic'?'Direct':'a closer destination'}, or allow bridges and tunnels.`);this.ui();return;}
    const st=rt.a.node?rt.a:{...rt.a,h:res.h0};this.plan=this.plan_(st,res.pieces,rt.b.node||null,P.trackProfile);
    this.preview(this.plan.pieces,this.plan.ok,this.plan.warn);
    let x0=1e9,z0=1e9,x1=-1e9,z1=-1e9;for(const p of this.plan.pieces)for(let t=0;t<=p.L;t+=8){const q=segPoint(p,t);x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);z0=Math.min(z0,q[1]);z1=Math.max(z1,q[1]);}
    this.camGoal={x:(x0+x1)/2,z:(z0+z1)/2,dist:clamp(Math.hypot(x1-x0,z1-z0)*1.1,120,2200),pitch:1.0};
    this.info(this.plan.msg+(this.plan.ok?`. Found in ${((performance.now()-t0)/1000).toFixed(1)} s. Build it, ✕ to discard, or try the ${rt.prefer==='scenic'?'direct (straight arrow)':'scenic (winding)'} route.`:''));this.ui();},
  setPrefer(p){this.rt.prefer=p;this.ui();if(this.rt.a&&this.rt.b)this.runRoute();},
  routeClear(){this.rt.a=this.rt.b=null;this.plan=null;this.preview(null);this.ui();this.hint();},
  // ---- pointer: Draw captures one finger; everything else is taps (one-finger drags pan)
  down(e){this.lastXY=[e.clientX,e.clientY];
    if(this.mode==='signals'&&this.stg&&!this.remove){const hd=StationUI.ghostHandle;if(hd&&(Math.hypot(hd[0]-e.clientX,hd[1]-e.clientY)<70||StationUI.inGhost(e.clientX,e.clientY))){this.stDrag=true;this.buzz();return true;}return false;}
    if(this.mode!=='draw'||this.remove||(this.road()&&Roads.tool!=='build'))return false;
    const h=Cam.pick(e.clientX,e.clientY);if(!h)return false;
    if(this.plan&&this.plan.endXY&&this.plan.stroke){const s=Cam.toScreen(...this.plan.endXY);if(s&&Math.hypot(s[0]-e.clientX,s[1]-e.clientY)<this.snapPx){this.stroke={...this.plan.stroke,trail:this.plan.stroke.trail.slice()};this.ui();return true;}}
    this.discard(true);const n=this.endNear(e.clientX,e.clientY);
    this.stroke=n?{node:n.id,trail:[[n.x,n.z]]}:{node:0,ax:h[0],az:h[2],trail:[[h[0],h[2]]]};if(n)this.buzz();this.ui();return true;},
  move(e){this.lastXY=[e.clientX,e.clientY];
    if(this.stDrag&&this.stg){const h=Cam.pick(e.clientX,e.clientY);if(!h)return;this.stgMove(h);return;}
    if(!this.stroke)return;const h=Cam.pick(e.clientX,e.clientY);if(!h)return;
    const tr=this.stroke.trail,l=tr[tr.length-1];if(Math.hypot(h[0]-l[0],h[2]-l[1])<2.5)return;tr.push([h[0],h[2]]);
    const snap=this.endNear(e.clientX,e.clientY,this.stroke.node);if((snap?snap.id:0)!==(this.stroke.snap||0)){this.stroke.snap=snap?snap.id:0;if(snap)this.buzz();}
    const now=performance.now();if(!this.lastMake||now-this.lastMake>60){this.lastMake=now;this.plan=this.make(this.stroke);this.show();}this.drawTrail();},
  up(e){if(this.stDrag){this.stDrag=false;this.lastXY=null;this.ui();return;}const st=this.stroke;this.stroke=null;this.lastXY=null;this.hold=null;if(!st){this.ui();return;}
    this.plan=this.make(st);if(!this.plan||!this.plan.pieces){this.plan=null;this.preview(null);this.ui();this.drawTrail();return;}
    this.plan.stroke=st;this.show();this.ui();this.drawTrail();},
  cancel(){if(this.stDrag){this.stDrag=false;this.ui();return;}const st=this.stroke;this.stroke=null;this.lastXY=null;if(st&&this.plan&&this.plan.pieces){this.plan.stroke=st;this.show();}else{this.plan=null;this.preview(null);}this.ui();this.drawTrail();},
  tap(e){const h=Cam.pick(e.clientX,e.clientY);
    if(this.mode==='signals'&&!this.remove){if(!h)return;
      if(this.sigTool==='remove'){let best=null,bd=15,list=null;for(const L of [Track.sigs,Track.stations])for(const o of L){const s=segById(o.sid);if(!s)continue;const q=segPoint(s,o.t),d=Math.hypot(q[0]-h[0],q[1]-h[2]);if(d<bd){bd=d;best=o;list=L;}}
        if(best){list.splice(list.indexOf(best),1);Net.changed();App.trackChanged();this.info('Removed.');}else this.info('Nothing there to remove.');return;}
      if(this.sigTool==='longer'||this.sigTool==='shorter'){let best=null,bd=1e9;for(const o of Track.stations){const s=segById(o.sid);if(!s)continue;const q=segPoint(s,o.t),d=Math.hypot(q[0]-h[0],q[1]-h[2]);if(d<Math.max(30,(o.len||44)/2+6)&&d<bd){bd=d;best=o;}}
        if(!best){this.info('Tap a station.');return;}const L0=best.len||44,up=this.sigTool==='longer',L1=clamp(L0+(up?16:-16),44,172);
        if(L1===L0){this.info(up?`${best.name} is as long as platforms go (${L0} m).`:`${best.name} is already the shortest platform (44 m).`);return;}
        if(up&&Money.on()){if(!Money.canBuild()){UI.toast('Out of money');return;}Money.spend(4000,'platform');}best.len=L1;
        const lt=Trains.list.reduce((m,t)=>Math.max(m,Trains.length(t.veh)),0);this.info(`${best.name}: platform ${L1} m.`+(lt?` Your longest train is ${Math.round(lt)} m${lt<=L1-4?' and fits.':', still longer.'}`:''));
        Net.changed();App.trackChanged();Sfx.clunk();return;}
      let near=null;if(this.sigTool==='station'){const sw=Life.nearSawSlot(h[0],h[2],38);if(sw&&!Track.stations.some(q=>q[sw.kind]&&q[sw.kind].mi===sw.mi&&q[sw.kind].k===sw.k)){const sl=sw.slot,on=Net.nearestOnTrack(sl.p[0],sl.p[1],9);
          // a station place at a farm, sawmill, mine or workshop: the ghost appears there and ✓ builds it (with its own piece of track if no line passes)
          if(on){this.ghostAt(on);this.stg.slot=1;}else{this.stg={free:true,slot:1,x:sl.p[0],z:sl.p[1],h:sl.t,y:ground0(sl.p[0],sl.p[1])+FORMATION_DROP,len:44,side:1,sideSet:false};this.ui();}
          this.stSync();this.info(`Station for the ${sw.kind}: press ✓ to build it here.`);return;}}
      if(!near&&this.sigTool==='station'){this.stgMove(h);return;}
      if(!near)near=Net.nearestOnTrack(h[0],h[2],Math.max(8,Cam.dist*0.02));
      if(!near){this.info('Tap closer to the track.');return;}
      if(this.sigTool==='signal'){Track.sigs.push({id:Track.nextId++,sid:near.seg.id,t:near.t});this.info(`Signal placed. ${Track.sigs.length} signal${Track.sigs.length>1?'s':''} on the network.`);}
      else{const n=Track.stations.length+1,q=segPoint(near.seg,near.t),v=Life.nearestVillage(q[0],q[1],420);const names=['Halte Heide','Halte Bos','Halte Meer','Kruispunt','Halte Berg','Halte Veld'];
        let name=v?v.name:names[(n-1)%names.length];if(Track.stations.some(s=>s.name===name))name+=' '+(Track.stations.filter(s=>s.name.startsWith(name)).length+1);
        Track.stations.push({id:Track.nextId++,sid:near.seg.id,t:near.t,name});Life.attachSawmill(Track.stations[Track.stations.length-1]);this.info(v?`Station ${name} built. People from ${v.name} will walk over and take the train.`:`Station ${name} built. Build it near a village and people will come and ride.`);}
      Net.changed();App.trackChanged();Sfx.clunk();return;}
    if(this.road()&&Roads.tool!=='build'){Roads.tap(h);return;}
    if(this.remove){if(!h)return;let best=null,bd=Math.max(6,Cam.dist*0.02);for(const s of Track.segs){const [t,d]=segNearest(s,h[0],h[2]);if(t>=-1&&t<=s.L+1&&d<bd){bd=d;best=s;}}
      if(best){removeSeg(best.id);App.trackChanged();Trains.trackChanged();if(this.pc.cur&&this.pc.cur.node&&!Track.node(this.pc.cur.node.id))this.pc.cur=null;this.info('Removed. Tap another piece, or tap Remove when done.');}else this.info('No track there.');return;}
    const n=this.endNear(e.clientX,e.clientY);
    if(this.mode==='pieces'){
      if(this.pc.branch&&h){if(this.road())this.roadBranchAt(h);else this.branchAt(h);return;}
      if(this.pc.cur&&this.pc.cur.jx&&h&&Math.hypot(h[0]-this.pc.cur.x,h[2]-this.pc.cur.z)<6){this.pc.cur.h=wrapPi(this.pc.cur.h+Math.PI);this.pc.cur.g=-this.pc.cur.g;this.buzz();this.refresh();return;}// branch the other way
      if(n){this.pc.cur=this.stateOf(n);if(n.road)this.pc.cur.rid=n.road.id;this.pc.newLine=false;this.buzz();this.refresh();return;}
      if(this.road()&&!this.pc.cur&&h&&Roads.nearestRoad(h[0],h[2],Math.max(6,Cam.dist*0.02))){this.roadBranchAt(h);return;}
      if(this.pc.newLine&&h){const T=R.world;if(h[0]<15||h[2]<15||h[0]>T.W-15||h[2]>T.W-15){UI.toast('Too close to the edge');return;}
        const fh=Math.round(Math.atan2(Cam.fwd[2],Cam.fwd[0])/TURN)*TURN;this.pc.cur={x:h[0],z:h[2],y:ground0(h[0],h[2])+(this.road()?0.4:FORMATION_DROP),h:fh,g:0};this.pc.newLine=false;
        this.info('Turn the start with ⟲ ⟳ if needed, choose a piece and tap Place.');this.refresh();}
      return;}
    if(this.mode==='route'){const rt=this.rt;
      let pick=n?{...this.stateOf(n)}:h?{x:h[0],z:h[2],y:ground0(h[0],h[2])+FORMATION_DROP,h:0,g:0}:null;if(!pick)return;
      if(this.road()&&!n){const q=Roads.nearestRoad(h[0],h[2],Math.max(6,Cam.dist*0.02));if(q)pick={x:q.x,z:q.z,y:ground0(q.x,q.z)+0.4,h:0,g:0,road:q.road};}
      if(!rt.a||(rt.a&&rt.b)){if(rt.a&&rt.b){this.plan=null;this.preview(null);}rt.a=pick;rt.b=null;this.buzz();this.ui();this.hint();this.camGoal=null;}
      else{if(n&&rt.a.node&&n.id===rt.a.node.id)return;rt.b=n?{node:n,x:n.x,z:n.z}:pick.road?{x:pick.x,z:pick.z,road:pick.road}:{x:h[0],z:h[2]};this.buzz();this.runRoute();}}
  },
  // ---- shared actions
  clearAll(){if(!Track.segs.length){UI.toast('There is no track yet');return;}if(!confirm('Remove all track, signals, stations and trains? (Undo brings the track back.)'))return;this.discard(true);this.pc.cur=null;Net.clearAll();this.ui();this.hint();},
  commit(p){if(!Money.canBuild()){UI.toast('Out of money, and the bank will not lend more');return;}Track.undo.push(JSON.stringify(Track.serialize()));if(Track.undo.length>100)Track.undo.shift();
    if(p.regrade)Net.regrade(p.regrade.nid,p.regrade.dy);
    if(p.junc){const seg=segById(p.junc.sid);if(seg){const J=Net.split(seg,p.junc.t);J.h=p.junc.h;p={...p,snap:J};}}
    let start=p.start.node?{node:Track.node(p.start.node.id)}:p.start;if(p.start.sj){const seg=segById(p.start.sj.sid);if(seg){const J=Net.split(seg,p.start.sj.t);start={node:J};}}addPieces(start,p,false);
    Log.info(`track built (${this.mode}): ${p.msg}; total ${Track.segs.length} pieces ${Track.length().toFixed(0)} m`);App.trackChanged();Sfx.clunk();},
  confirm(){if(this.stg&&this.mode==='signals'){const g=this.stg;if(!(g.chk||this.stCheck(g)).ok){UI.toast(this.stCheck(g).msg);return;}if(!Money.canBuild()){UI.toast('Out of money');return;}this.stg=null;this.ui();Busy.run('Building the station and levelling the ground…',()=>{if(g.free){const near=this.makeSiding(g.x,g.z,g.h);g.sid=near.seg.id;g.t=near.t;}this.placeStation(g);});return;}
    const p=this.plan;if(!p||!p.ok||!p.pieces||this.mode==='pieces')return;if(this.road()){if(!Money.canBuild()){UI.toast('Out of money');return;}Roads.commitPlan(p);}else this.commit(p);this.plan=null;this.preview(null);
    if(this.mode==='route'){this.rt.a=this.rt.b=null;}this.ui();this.drawTrail();this.info(p.snap?'Joined up!':this.mode==='draw'?'Built. Draw on from the gold ring at its end.':'Built. Tap a new start for the next route.');},
  discard(quiet){if(this.stg){this.stg=null;this.stDrag=false;if(!quiet)this.info('Discarded.');}if(this.plan||this.stroke){this.plan=null;this.stroke=null;this.preview(null);if(this.mode==='route'){this.rt.b=null;}if(!quiet)this.info('Discarded.');}if(document.querySelector('#ovl'))this.drawTrail();this.ui();},
  undo(){if(this.plan&&this.mode!=='pieces'){this.discard();return;}
    if(this.road()&&this.mode!=='signals'){if(Roads.undo()){this.pc.cur=null;this.plan=null;this.preview(null);this.refresh();this.ui();this.info('Undone.');}return;}
    const u=Track.undo.pop();if(!u){UI.toast('Nothing to undo');return;}const d=JSON.parse(u);Track.load(d);
    App.trackChanged();Trains.trackChanged();if(this.pc.cur&&this.pc.cur.node){const n=Track.node(this.pc.cur.node.id);this.pc.cur=n&&Track.links(n.id)<2?this.stateOf(n):null;}
    if(this.mode==='pieces'&&!this.pc.cur){const e=Track.freeEnds();if(e.length)this.pc.cur=this.stateOf(e[e.length-1]);}this.refresh();this.ui();this.info('Undone.');},
  // ---- hold the finger still on another line (or on a ring) for half a second to get choices
  holdTick(dt){const st=this.stroke;if(!st||!this.lastXY||this.road()){this.hold=null;return;}const [x,y]=this.lastXY;
    if(!this.hold||Math.hypot(x-this.hold.sx,y-this.hold.sy)>10){this.hold=null;const h=Cam.pick(x,y);if(!h)return;
      if(st.snap&&!st.noSnap){this.hold={sx:x,sy:y,t:0,kind:'join',nid:st.snap};}
      else{const near=Net.nearestOnTrack(h[0],h[2],Math.max(5,Cam.dist*0.015));if(near&&!(st.node&&(near.seg.a===st.node||near.seg.b===st.node)&&Math.hypot(h[0]-st.trail[0][0],h[2]-st.trail[0][1])<30))
        this.hold={sx:x,sy:y,t:0,kind:'cross',sid:near.seg.id,tt:near.t,x:h[0],z:h[2]};}}
    else if(!this.hold.done){this.hold.t+=dt;if(this.hold.t>=0.5){this.hold.done=true;this.buzz();this.choice=this.hold;this.ui();
      this.info(this.hold.kind==='join'?'Lift your finger, then choose how to join.':'Lift your finger, then choose a crossing or a junction (switch).');}}
    this.drawTrail();},
  choose(c){const ch=this.choice,p=this.plan;this.choice=null;if(!ch||!p||!p.stroke||c==='cancel'){this.ui();return;}const st={...p.stroke,trail:p.stroke.trail.slice()};
    if(ch.kind==='join'){st.snap=ch.nid;st.noSnap=c==='none';st.fix=c==='fix';}
    else if(c==='cross'){st.cross=(st.cross||[]).concat([{x:ch.x,z:ch.z,y:segY(segById(ch.sid),ch.tt)}]);}
    else if(c==='junc'){const seg=segById(ch.sid);if(seg){// stop the stroke there and meet the line along its direction
        let k=0,bd=1e9;st.trail.forEach((q,i)=>{const d=Math.hypot(q[0]-ch.x,q[1]-ch.z);if(d<bd){bd=d;k=i;}});st.trail=st.trail.slice(0,k+1);
        const q=segPoint(seg,ch.tt),a=st.trail[Math.max(0,st.trail.length-6)],dirIn=Math.atan2(q[1]-a[1],q[0]-a[0]);
        const arrive=Math.abs(wrapPi(q[2]-dirIn))<Math.PI/2?q[2]:q[2]+Math.PI;st.trail.push([q[0],q[1]]);
        st.junc={id:-1,sid:seg.id,t:ch.tt,x:q[0],z:q[1],y:segY(seg,ch.tt),h:wrapPi(arrive+Math.PI),g:0};st.snap=0;}}
    this.plan=this.make(st);if(this.plan&&this.plan.pieces)this.plan.stroke=st;this.show();this.ui();},
  edgePan(dt){this.holdTick(dt);if(!this.stroke||!this.lastXY)return;const W=innerWidth,m=56,bb=$('#buildBar').getBoundingClientRect().top;
    let dx=0,dy=0;const [x,y]=this.lastXY;if(x<m)dx=-(m-x)/m;else if(x>W-m)dx=(x-(W-m))/m;if(y<m+40)dy=-(m+40-y)/m;else if(y>bb-m)dy=(y-(bb-m))/m;
    if(dx||dy){const s=Cam.dist*0.9*dt;camPan(-dx*s/(Cam.dist*0.0016+0.01),-dy*s/(Cam.dist*0.0016+0.01));this.drawTrail();}},
  markers(){const out=[],m=this.mode;let act=0,tgt=0;if(this.road()&&m!=='signals')return out;// roads draw their own rings (roadTick)
    if(m==='pieces'&&this.pc.cur&&this.pc.cur.node)act=this.pc.cur.node.id;
    if(m==='draw'){act=this.stroke?this.stroke.node:(this.plan&&this.plan.start.node?this.plan.start.node.id:0);tgt=this.stroke?this.stroke.snap:0;}
    if(m==='route'){if(this.rt.a&&this.rt.a.node)act=this.rt.a.node.id;if(this.rt.b&&this.rt.b.node)tgt=this.rt.b.node.id;}
    if(this.plan&&this.plan.snap)tgt=this.plan.snap.id;
    for(const n of Track.freeEnds()){out.push([n.x,n.y,n.z,n.h,n.id===act?1:n.id===tgt?2:0]);}
    if(m==='pieces'&&this.pc.cur&&!this.pc.cur.node){const c=this.pc.cur;out.push([c.x,c.y,c.z,c.h,1]);}
    if(m==='route'){if(this.rt.a&&!this.rt.a.node)out.push([this.rt.a.x,this.rt.a.y,this.rt.a.z,0,1]);if(this.rt.b&&!this.rt.b.node)out.push([this.rt.b.x,ground0(this.rt.b.x,this.rt.b.z),this.rt.b.z,0,2]);}
    if(this.plan&&this.plan.pieces&&!this.plan.snap){const lp=this.plan.pieces[this.plan.pieces.length-1],e=segPoint(lp,lp.L);out.push([e[0],segY(lp,lp.L),e[1],e[2],this.plan.ok?3:4]);}
    return out;}
};Build.pc=Build.pcT;Build.rt=Build.rtT;
