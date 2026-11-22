'use strict';
// ===== upkeep.js
// ===================================================================
// TRACK WEAR AND THE RAIL MAINTENANCE UNIMOG (4.61.0; the user: "introduce track wear and maintenance but turn it off by default";
// worn track: "limits + breakdowns"; the maintenance Unimog: "First you drive it to the right track itself and then click repair. The
// Unimog will then maintain the entire track by using the excavator to renew the ballast and also shows sparks of welding. It will do the
// entire track until it's done unless canceled. Later an upgrade in the store will allow the Unimog to automatically maintain the track").
//
// Wear (setting Track wear, off by default; Wear speed ×): every track piece keeps s.wear 0..1 (saved with the track). Trains wear it as
// they run over it (heavier trains more), and it ages slowly. From 0.5 it is slow track: 60 km/h, from 0.7 40, from 0.85 20; at 1 it
// breaks (s.broken): no train enters it until it is repaired (a train already on it may leave). Worn track looks it: ballast dirty and
// weedy, rails rusty (the track mesh carries the wear in its material number, FS_TRACK).
//
// The rail Unimog (store; RoadVeh type 'unirail'): driven like the Unimog. Over a level crossing or any track lying at the level of the
// ground, "Rail wheels" lowers the guide wheels and it runs on the rails (forward/back with the stick). "Repair track" starts a job over
// the whole line it stands on (every piece joined to it): it drives itself piece by piece, working at walking pace: the backhoe digs out
// and renews the ballast beside it, and welding sparks fly at the rails; each piece it finishes is as new. It goes on until every piece
// is done, or until you stop it. Trains stop short of it; when a train waits for it, it lifts off the rails beside the track to let the
// train by and comes back. The upgrade "Automatic track maintenance" sends idle rail Unimogs on the rails out by themselves to the
// most worn pieces (wear 0.35 and over) of the line they stand on.
// ===================================================================
const Upkeep={dirty:false,meshT:0,
  on(){return!!P.trackWear;},
  /* the speed limit (m/s) a piece's wear sets, 0 when broken, null when none */
  limitOf(s){if(!this.on()||!s)return null;const w=s.wear||0;if(s.broken||w>=1)return 0;if(w<0.5)return null;return(w<0.7?60:w<0.85?40:20)/3.6;},
  band(s){return Math.min(10,Math.floor((s.wear||0)*10))+(s.broken?20:0);},
  setWear(s,w){if(!s)return;const b=this.band(s);s.wear=clamp(w,0,1);if(s.wear>=1&&!s.broken){s.broken=true;const p=segPoint(s,s.L/2),v=Life.nearestVillage?Life.nearestVillage(p[0],p[1],4000):null;
      UI.toast(`Broken track${v?' near '+v.name:''}: the line is closed there until it is repaired (rail Unimog)`);Log.info(`track ${s.id} broke`);}
    if(s.wear<1&&s.broken&&w<0.999)s.broken=false;if(this.band(s)!==b)this.dirty=true;},
  /* a train has moved ds: its head and tail pieces wear (a full pass over a piece by a 150 t train adds about 0.004 × Wear speed) */
  trainMoved(tr,ds,M){if(!this.on()||!ds)return;const k=(+P.wearRate||1)*0.0035*(M/150000)*0.5,L=Trains.length(tr.veh);
    for(const pos of [tr.head,advance(tr.head,-L).pos]){const s=segById(pos.sid);if(s)this.setWear(s,(s.wear||0)+Math.abs(ds)/Math.max(s.L,1)*k);}},
  // ---- trains: stop short of a rail Unimog on the line and of broken track; keep to the limits of worn track
  /* called every step for each train after its own signals: sets tr.redAt (nearer stop) and tr.wearCap (m/s) */
  trainCheck(tr,dt){tr.wearCap=null;tr.upWhy=null;const on=this.on(),vs=this.railVehs().filter(b=>b.rail.on&&!(b.rail.aside>0.5));if(!on&&!vs.length)return;
    const v=Math.abs(tr.v),L=Trains.length(tr.veh),back=tr.rev<0||tr.v<-0.05;let pos=back?advance(tr.head,-L+COUPLE).pos:tr.head;if(back)pos={...pos,dir:-pos.dir};
    // the pieces under the train set its limit now
    if(on){let cap=1e9;const s0=segById(tr.head.sid),s1=segById(advance(tr.head,-L).pos.sid);for(const s of [s0,s1]){const l=this.limitOf(s);if(l)cap=Math.min(cap,l);}if(cap<1e9){tr.wearCap=cap;tr.upWhy='Slow: worn track';}}
    // ahead: walk the line up to the braking distance and a margin
    const look=v*v/(2*0.6)+80;let s=segById(pos.sid),t=pos.t,dir=pos.dir,d=0,g=0,stop=null;const self=new Set([tr.head.sid,advance(tr.head,-L).pos.sid]);
    while(s&&d<look&&g++<40){
      for(const b of vs){const r=b.rail;if(r.pos.sid!==s.id)continue;const half=RV.unirail.len*RV_SCALE/2+1,dd=dir>0?r.pos.t-half-t:t-(r.pos.t+half);if(dd>-half*2-2&&(stop==null||d+Math.max(0,dd)<stop)){stop=d+Math.max(0,dd);tr.upWhy='Waiting: track works ahead';}}
      if(on&&!self.has(s.id)&&d>0){const l=this.limitOf(s);if(l===0){if(stop==null||d<stop){stop=d;tr.upWhy='Line closed: broken track ahead';}}else if(l){const vc=Math.sqrt(l*l+2*0.6*d);if(tr.wearCap==null||vc<tr.wearCap){tr.wearCap=vc;if(!tr.upWhy)tr.upWhy='Slow: worn track ahead';}}}
      if(stop!=null)break;d+=dir>0?s.L-t:t;const node=dir>0?s.b:s.a,n=Net.next(s,node,tr,false);if(!n)break;if(n.a===node){t=0;dir=1;}else{t=n.L;dir=-1;}s=n;}
    if(stop!=null){const st=Math.max(0.5,stop-4);if(tr.redAt==null||st<tr.redAt)tr.redAt=st;if(tr.auto){const vt=Math.sqrt(2*0.6*Math.max(0,st-3));tr.vCap=tr.vCap==null?vt:Math.min(tr.vCap,vt);}}
    if(tr.auto&&tr.wearCap!=null)tr.vCap=tr.vCap==null?tr.wearCap:Math.min(tr.vCap,tr.wearCap);},
  // ---- the rail Unimogs
  railVehs(){return Buses.list.filter(b=>b.type==='unirail'&&b.rail);},
  ensure(b){if(!b.rail)b.rail={on:false,pos:null,lower:0,v:0,job:null,aside:0,wait:0,arm:{yaw:0,a1:-1.35,a2:1.05,a3:1.2},ph:0,yF:0,yR:0};return b.rail;},
  /* where the guide wheels could go down: a track piece within 2.5 m, lying along the vehicle (25°), at the level of the ground there */
  findTrack(b){const k=RV_SCALE;let best=null;for(const s of Track.segs){if(s.pend)continue;const n=segNearest(s,b.x,b.z);if(!n||n[1]>2.5||n[0]<1||n[0]>s.L-1)continue;const t=n[0],p=segPoint(s,t),y=segY(s,t);
      const sp=spanAt(s,t);if(sp)continue;/* not on a bridge or in a tunnel */if(Math.abs(y-RoadVeh.gy(b.x,b.z,b._gy))>1.3)continue;/* the rail top stands about 1 m over the ground beside the ballast */const da=wrapPi(p[2]-b.rot);if(Math.abs(da)>0.45&&Math.abs(Math.abs(da)-Math.PI)>0.45)continue;
      if(!best||n[1]<best.d)best={s,t,d:n[1],dir:Math.abs(da)<Math.PI/2?1:-1};}void k;return best;},
  canLower(b){return!b.rail||!b.rail.on?!!this.findTrack(b):false;},
  lower(b){const r=this.ensure(b),f=this.findTrack(b);if(!f){UI.toast('Drive onto the track first: along it, over a level crossing or where it lies level with the ground');return false;}
    r.on=true;r.pos={sid:f.s.id,t:f.t,dir:f.dir};r.lower=0;r.v=0;r.from={x:b.x,z:b.z,rot:b.rot};r.slide=0;b.mv=0;UI.toast(`${b.name}: rail wheels down. Stick forward and back to run on the rails; Repair track to renew the whole line`);this.place(b);return true;},
  raise(b){const r=b.rail;if(!r||!r.on)return;if(Math.abs(r.v)>0.5){UI.toast('Stop first');return;}const g=RoadVeh.gy(b.x,b.z,b._gy),y=posInfo(r.pos).y;if(Math.abs(g-y)>1.3){UI.toast('The track is not level with the ground here: run on to a level crossing or flat ground');return;}
    if(r.job)this.stopJob(b,true);r.on=false;r.lower=0;b._gy=null;b.mv=0;b.v=0;UI.toast(`${b.name}: rail wheels up, back on the road wheels`);},
  /* the vehicle's place and height from its spot on the rails (front and rear axle heights for its pitch) */
  place(b){const r=b.rail,k=RV_SCALE,S=RV.unirail,pi=posInfo(r.pos);if(!pi)return;const f=posInfo(advance(r.pos,S.axF*k).pos),rr=posInfo(advance(r.pos,S.axR*k).pos);
    let x=pi.x,z=pi.z,h=pi.h;if(r.aside>0){const a=r.aside,lat=3.6*a*(r.asideSd||1);x+=-Math.sin(h)*lat;z+=Math.cos(h)*lat;}
    if(r.slide<1&&r.from){const u=r.slide;x=lerp(r.from.x,x,u);z=lerp(r.from.z,z,u);h=r.from.rot+wrapPi(h-r.from.rot)*u;}
    b.x=x;b.z=z;b.rot=h;const g=RoadVeh.gy(x,z,null);r.yF=lerp(f?f.y:pi.y,g,r.aside);r.yR=lerp(rr?rr.y:pi.y,g,r.aside);if(r.slide<1){r.yF=lerp(g,r.yF,r.slide);r.yR=lerp(g,r.yR,r.slide);}b._gy=(r.yF+r.yR)/2;},
  /* driven by hand on the rails: the stick runs it forward and back (25 km/h at most); with a job running the job drives */
  drive(b,dt,I){const r=b.rail;if(r.job){if(I.gas>0.3||I.brake>0.3){if(!r.jobHint){r.jobHint=true;UI.toast('The repair job drives it now: tap Stop repair to drive it yourself');}}return;}
    let a=0;if(I.gas>0.02)a+=I.gas*1.6;if(I.brake>0.02)a-=I.brake*(r.v>0.2?3:1.2);if(I.gas<0.02&&I.brake<0.02)a=-Math.sign(r.v)*Math.min(Math.abs(r.v)/dt,0.6);r.v=clamp(r.v+a*dt,-3,7);this.move(b,r.v*dt);},
  move(b,ds){const r=b.rail;if(r.lower<1||r.slide<1||!ds)return true;if(this.trainNear(b,Math.sign(ds),14)){r.v=0;return false;}const a=advance(r.pos,ds,null,true);if(a.blocked){r.v=0;r.pos=a.pos;this.place(b);return false;}r.pos=a.pos;this.place(b);return true;},
  /* a train within d metres along the rails in the direction sg (+1 the way the Unimog faces) */
  trainNear(b,sg,d){const r=b.rail,ahead=posInfo(advance(r.pos,sg*(RV.unirail.len*RV_SCALE/2+d*0.5)).pos);if(!ahead)return null;for(const tr of Trains.list){if(!tr.poses)continue;for(const p of tr.poses)if(p&&Math.hypot(p.c[0]-ahead.x,p.c[2]-ahead.z)<d*0.5+6)return tr;}return null;},
  // ---- the repair job: every piece joined to the one it stands on (automatic: only the worn ones), nearest first
  startJob(b,auto){const r=b.rail;if(!r||!r.on){UI.toast('Lower the rail wheels on the track first');return;}const all=[...Net.reachSegs(r.pos.sid)].filter(id=>{const s=segById(id);return s&&!s.pend&&(!auto||(s.wear||0)>=0.35||s.broken);});
    if(!all.length){if(!auto)UI.toast('No track to repair here');return;}r.job={todo:new Set(all),total:all.length,auto:!!auto,route:null,cur:null,workD:0,t0:App.time};r.jobHint=false;
    if(!auto)UI.toast(`${b.name} starts on the whole line: ${all.length} pieces, ${(all.reduce((a,id)=>a+segById(id).L,0)/1000).toFixed(1)} km. It renews the ballast and welds the rails as it goes`);},
  stopJob(b,quiet){const r=b.rail;if(!r||!r.job)return;const n=r.job.total-r.job.todo.size;r.job=null;r.v=0;if(!quiet)UI.toast(`${b.name}: repair stopped (${n} of the pieces done)`);},
  /* plan: the nearest piece still to do, over the rails (dead ends reverse; at a switch it may pull onto the trunk and back into the other branch) */
  plan(b){const r=b.rail,J=r.job,K=(id,d)=>id+(d>0?'+':'-'),dist=new Map(),prev=new Map(),H=[];const s0=segById(r.pos.sid);if(!s0)return null;
    const push=(sid,d,v,pk)=>{const k=K(sid,d);if(v<(dist.has(k)?dist.get(k):1e18)){dist.set(k,v);prev.set(k,pk);H.push([v,sid,d]);}};
    if(J.todo.has(s0.id)){return[{sid:s0.id,d:r.pos.t<s0.L/2?1:-1,first:true}];}
    push(s0.id,1,s0.L-r.pos.t,null);push(s0.id,-1,r.pos.t,null);let goal=null;
    while(H.length){let bi=0;for(let i=1;i<H.length;i++)if(H[i][0]<H[bi][0])bi=i;const [v,sid,d]=H[bi];H[bi]=H[H.length-1];H.pop();const k=K(sid,d);if(v>dist.get(k))continue;const s=segById(sid);if(!s)continue;
      if(J.todo.has(sid)&&prev.get(k)!==null){goal=k;break;}
      const node=d>0?s.b:s.a;for(const [n2,d2,ex] of Net.succ(s,d))push(n2.id,d2,v+n2.L+ex,k);
      const Jn=Net.junction(node);if(Jn&&s!==Jn.trunk)for(const br of Jn.branches)if(br!==s)push(br.id,br.a===node?1:-1,v+br.L+16,k);/* the other branch: onto the trunk and back */}
    if(!goal)return null;const path=[];for(let k=goal;k!=null;k=prev.get(k)){const sid=+k.slice(0,-1),d=k.endsWith('+')?1:-1;path.unshift({sid,d});}return path;},
  jobStep(b,dt){const r=b.rail,J=r.job;if(!J.todo.size){const m=Math.round((App.time-J.t0)/60);r.job=null;r.v=0;UI.toast(J.skipped?`${b.name} has finished, but ${J.skipped} piece${J.skipped>1?'s':''} with a train standing on ${J.skipped>1?'them':'it'} could not be done: start again when the train has gone`:`${b.name} has finished: the whole line is as new${m?' ('+m+' min)':''}`);this.dirty=true;return;}
    if(r.aside>0||r.asideGo){this.asideStep(b,dt);return;}
    if(!J.route||!J.route.length||J.route[0].sid!==r.pos.sid){J.route=this.plan(b);J.ri=0;if(!J.route){J.todo.clear();return;}}
    const st=J.route[0],s=segById(st.sid);if(!s){J.route=null;return;}const work=J.todo.has(s.id),want=work?2.2:7,sg=st.d*r.pos.dir;/* +1: forward */
    const rem=st.d>0?s.L-r.pos.t:r.pos.t,nx=J.route[1];
    // the end of the piece: done with it? then on to the next (set the switch when leaving the trunk; reverse at dead ends and switch backs)
    if(rem<0.4){if(work&&J.cur===s.id){J.todo.delete(s.id);s.wear=0;s.broken=false;this.dirty=true;}J.cur=null;
      if(!nx){J.route=null;return;}const node=st.d>0?s.b:s.a,Jn=Net.junction(node),n=Track.node(node);
      if(nx.sid===s.id){J.route.shift();r.v=0;return;}/* reverse here */
      if(Jn&&n&&s===Jn.trunk){const i=Jn.branches.findIndex(q=>q.id===nx.sid);if(i>=0)n.sw=i;}}/* from a branch into the other one: it runs onto the trunk and plans again from there (back through the switch) */
    const atStart=st.d>0?r.pos.t<1.5:r.pos.t>s.L-1.5;if(work&&J.cur!==s.id&&(atStart||st.first))J.cur=s.id;
    const blocked=this.trainNear(b,Math.sign(sg),18);if(blocked){r.v=0;r.wait+=dt;if(r.wait>8&&(Math.abs(blocked.v)<0.3)){r.asideGo=true;r.wait=0;r.asideT=0;r.asideSd=r.asideSd||1;}return;}r.wait=0;
    const endSlow=!nx||nx.sid===s.id,tv=want*(endSlow?Math.min(1,rem/6+0.15):1);r.v+=clamp(tv-Math.abs(r.v),-2*dt,1.2*dt)*1;r.v=clamp(r.v,0,want);
    const ds=r.v*dt*sg;if(Math.abs(ds)>0){const a=advance(r.pos,ds,null,true);if(a.blocked){r.pos=a.pos;r.v=0;J.route=null;}else r.pos=a.pos;this.place(b);}
    if(work&&J.cur===s.id){J.workD+=r.v*dt;this.effects(b,dt);/* the piece being renewed: its wear falls behind the Unimog */const w=s.wear||0;if(w>0){s.wear=Math.max(0,w-dt*r.v/Math.max(s.L,1)*w*1.2);}}},
  /* a waiting train: lift off beside the track, let it pass, come back (or, after 25 s with the train standing, put down past it) */
  asideStep(b,dt){const r=b.rail;r.asideT=(r.asideT||0)+dt;r.v=0;
    if(r.asideGo){r.aside=Math.min(1,r.aside+dt/3);if(r.aside>=1){const J0=r.job,sg0=J0&&J0.route&&J0.route[0]?J0.route[0].d*r.pos.dir:1,tb=this.trainNear(b,-sg0,30),tr=this.trainNear(b,sg0,30)||(tb&&Math.abs(tb.v)>0.2?tb:null);/* ahead, or coming up from behind */if(!tr){r.clearT=(r.clearT||0)+dt;if(r.clearT>3){r.asideGo=false;r.clearT=0;}}else{r.clearT=0;
          if(r.asideT>25&&Math.abs(tr.v)<0.2){/* a parked train: go round it on the road wheels and put down beyond it */const J=r.job,sg=J&&J.route&&J.route[0]?J.route[0].d*r.pos.dir:1;let p=r.pos;for(let k=0;k<300;k++){const a=advance(p,sg*2,null,true);if(a.blocked)break;p=a.pos;const q=posInfo(p);if(!Trains.list.some(o=>o.poses&&o.poses.some(ps=>ps&&Math.hypot(ps.c[0]-q.x,ps.c[2]-q.z)<14))&&k>4)break;}r.pos=p;if(J){J.route=null;/* the pieces the parked train stands on are left (skipped, still worn: said at the end) */const skip=id=>{if(J.todo.delete(id))J.skipped=(J.skipped|0)+1;};if(J.cur!=null)skip(J.cur);for(const ps of tr.poses||[]){if(!ps)continue;for(const q of Track.segs)if(J.todo.has(q.id)){const nn=segNearest(q,ps.c[0],ps.c[2]);if(nn&&nn[1]<2&&nn[0]>-1&&nn[0]<q.L+1)skip(q.id);}}J.cur=null;}r.asideT=0;}}}}
    else{r.aside=Math.max(0,r.aside-dt/3);}this.place(b);},
  /* the work: the backhoe digs at the side and swings back, ballast dust; welding sparks at the rail just ahead */
  effects(b,dt){const r=b.rail;if(Math.random()<dt*22){const h=b.rot,fx=Math.cos(h),fz=Math.sin(h),sd=Math.random()<0.5?-1:1,k=RV_SCALE,x=b.x+fx*(RV.unirail.axF*k+1.2)+(-fz)*sd*GAUGE/2,z=b.z+fz*(RV.unirail.axF*k+1.2)+fx*sd*GAUGE/2,y=r.yF+0.05;
      for(let i=0;i<3;i++)Particles.spawn(x,y,z,(Math.random()-0.5)*3,1+Math.random()*2.5,(Math.random()-0.5)*3,0.35+Math.random()*0.4,0.05,0.03,8);}
    const ap=r.arm;if(ap.dig&&ap.dig>0.9&&Math.random()<dt*3){const h=b.rot,sd=ap.side||1,x=b.x-Math.cos(h)*2.2+(-Math.sin(h))*sd*2.4,z=b.z-Math.sin(h)*2.2+Math.cos(h)*sd*2.4;Particles.spawn(x,r.yR-0.4,z,(Math.random()-0.5)*0.6,0.4,(Math.random()-0.5)*0.6,0.9,0.12,0.45,1);}},
  /* the backhoe's pose: folded up for travel; working: swings to one side, reaches down, digs and lifts, and the other side after a while */
  armStep(b,dt){const r=b.rail,A=r.arm,working=r.on&&r.job&&r.job.cur!=null&&r.v>0.2&&!(r.aside>0);r.ph=(r.ph||0)+dt;
    let T;if(working){const cyc=(r.ph%7)/7,sd=Math.floor(r.ph/21)%2?-1:1,dig=Math.sin(cyc*Math.PI*2)*0.5+0.5;A.side=sd;A.dig=dig;T={yaw:sd*(Math.PI/2+0.12),a1:-0.42+0.4*dig,a2:0.7+0.65*dig,a3:0.2+1.1*(1-dig)};}
    else{A.dig=0;T={yaw:0,a1:-1.35,a2:1.05,a3:1.2};}
    const e=Math.min(1,dt*1.6);for(const q of ['yaw','a1','a2','a3'])A[q]+= (T[q]-A[q])*e;},
  update(dt){if(!App.T)return;
    for(const b of this.railVehs()){const r=b.rail;if(r.on){r.lower=Math.min(1,r.lower+dt/2.2);r.slide=Math.min(1,(r.slide==null?1:r.slide)+dt/1.6);
        if(r.job)this.jobStep(b,dt);else if(r.aside>0)this.asideStep(b,dt);else if(!b.manual){r.v*=Math.max(0,1-dt*2);if(Math.abs(r.v)>0.05)this.move(b,r.v*dt);else this.place(b);
          if(Fleet.unlocks.railAuto&&this.on()&&!b.manual&&(r.autoT=(r.autoT||0)+dt)>20){r.autoT=0;this.startJob(b,true);}}
        else this.place(b);b.v=Math.abs(r.v);b.st=Math.abs(r.v)>0.05?'drive':'dwell';}
      else{r.lower=Math.max(0,r.lower-dt/2.2);}
      this.armStep(b,dt);}
    // aging (slow: about 0.1 a game day at Wear speed 1) and the track's look when bands change (at most every 4 s)
    if(this.on()&&dt>0){const k=dt*(+P.wearRate||1)*1.2e-6;for(const s of Track.segs)if(!s.pend&&(s.wear||0)<1)this.setWear(s,(s.wear||0)+k);}
    this.meshT+=dt;if(this.dirty&&this.meshT>4){this.meshT=0;this.dirty=false;R.rebuildTrackMesh();}},
  /* the wear on a piece for the mesh: 0 (new) .. 1 (broken) */
  meshWear(s){return this.on()?Math.min(1,s.wear||0):0;},
  // ---- saving: where it stands and what it is doing
  saveVeh(b){const r=b.rail||{};return{x:+b.x.toFixed(2),z:+b.z.toFixed(2),rot:+b.rot.toFixed(3),on:!!r.on,pos:r.on?r.pos:null,job:r.job?{todo:[...r.job.todo],total:r.job.total,auto:r.job.auto}:null};},
  loadVeh(b,u){u=u||{};b.x=+u.x||b.x;b.z=+u.z||b.z;b.rot=+u.rot||0;const r=this.ensure(b);if(u.on&&u.pos&&segById(u.pos.sid)){r.on=true;r.pos=u.pos;r.lower=1;r.slide=1;
      if(u.job&&u.job.todo){r.job={todo:new Set(u.job.todo.filter(id=>segById(id))),total:u.job.total|0,auto:!!u.job.auto,route:null,cur:null,workD:0,t0:App.time};}}},
  /* the status line for its panel */
  status(b){const r=b.rail;if(!r||!r.on)return'On the road';if(r.aside>0.05)return'Beside the track: letting a train pass';if(r.job){const d=r.job.total-r.job.todo.size;return`Repairing the line: ${d} of ${r.job.total} pieces done${r.job.auto?' (automatic)':''}`;}return'On the rails';},
  /* the average wear of the network (for the train list / map) */
  stats(){let L=0,W=0,br=0;for(const s of Track.segs){if(s.pend)continue;L+=s.L;W+=(s.wear||0)*s.L;if(s.broken)br++;}return{wear:L?W/L:0,broken:br};}};
/* a new rail Unimog: on the road beside the level crossing nearest the camera (or the road nearest it), pointing along the road */
Upkeep.spawn=function(){const c=Cam.target||[0,0,0],X=Life.crossings||[];let x=c[0],z=c[2],rot=0;
  const xs=X.slice().sort((a,q)=>Math.hypot(a.x-c[0],a.z-c[2])-Math.hypot(q.x-c[0],q.z-c[2]))[0];
  if(xs){rot=xs.rh;x=xs.x-Math.cos(rot)*9;z=xs.z-Math.sin(rot)*9;}else{const G=Buses.graph(),n=G.nearest(c[0],c[2],3000);if(n>=0){x=G.N[n][0];z=G.N[n][1];const e=G.E[n][0];if(e)rot=Math.atan2(G.N[e[0]][1]-z,G.N[e[0]][0]-x);}}
  const nb=Buses.list.filter(q=>q.type==='unirail').length+1,b=Buses.make(false,`Rail Unimog ${nb}`,[]);b.type='unirail';b.goods=false;b.stops=[];b.allStops=false;b.x=x;b.z=z;b.rot=rot;b.st='dwell';b.v=0;this.ensure(b);Buses.list.push(b);
  RoadVeh.sel=b;RoadVeh.panel(true);RoadVeh.refresh();Cam.setMode('free');Cam.flyTo([x,RoadVeh.gy(x,z),z],30);return b;};
