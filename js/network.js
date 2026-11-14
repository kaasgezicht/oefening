'use strict';
// ===== network.js
// ===================================================================
// NETWORK (step 14) — junctions with switches, crossings, block signals and stations.
// Like Factorio: signals cut the line into blocks, an automatic train only enters a block that
// is empty, waits at red, stops at stations, and reverses at buffer stops.
// ===================================================================
const Net={ver:0,jc:new Map(),blocks:null,occ:new Map(),occAll:new Map(),face:new Map(),dms:new Map(),
  changed(){this.ver++;this.jc.clear();this.blocks=null;this.dms.clear();},
  // ---- routing: track distance from entering (segment, direction) to a station; trains reverse only at buffer stops (+30 m)
  succ(seg,dir){const node=dir>0?seg.b:seg.a,ss=this.linked(node).filter(q=>q!==seg),ent=n2=>[n2,n2.a===node?1:-1];
    if(!ss.length)return[[seg,-dir,30]];const J=this.junction(node);if(J&&seg===J.trunk)return J.branches.map(b=>[...ent(b),0]);const n2=this.next(seg,node,null,false);return n2?[[...ent(n2),0]]:[];},
  distMap(st){const key=st.id+':'+st.sid+':'+st.t;if(this.dms.has(key))return this.dms.get(key);const K=(q,d)=>q.id+(d>0?'+':'-'),pred=new Map(),dist=new Map();
    for(const q of Track.segs){if(q.pend)continue;for(const d of [1,-1])for(const [s2,d2,ex] of this.succ(q,d)){const k2=K(s2,d2);if(!pred.has(k2))pred.set(k2,[]);pred.get(k2).push([q,d,ex]);}}
    const ds=segById(st.sid);if(ds){const H=[],push=(q,d,v)=>{const k=K(q,d);if(v<(dist.has(k)?dist.get(k):1e18)){dist.set(k,v);H.push([v,q,d]);}};push(ds,1,st.t);push(ds,-1,ds.L-st.t);
      while(H.length){let bi=0;for(let i=1;i<H.length;i++)if(H[i][0]<H[bi][0])bi=i;const [v,q,d]=H[bi];H[bi]=H[H.length-1];H.pop();if(v>dist.get(K(q,d)))continue;for(const [pq,pd,ex] of pred.get(K(q,d))||[])push(pq,pd,v+pq.L+ex);}}
    this.dms.set(key,dist);return dist;},
  destOf(tr){const pax=!tr.veh.some(v=>v.k==='wagon'),S0=Track.stations,S=pax&&S0.some(q=>!(q.sawmill||q.workshop||q.mine||q.farm))?S0.filter(q=>!(q.sawmill||q.workshop||q.mine||q.farm)):S0;if(!S.length)return null;if(tr.destId!=null){const st=S.find(q=>q.id===tr.destId);if(st)return st;tr.destId=null;}
    if(tr.autoDest==null||!S.some(q=>q.id===tr.autoDest))tr.autoDest=S[(Trains.list.indexOf(tr)+1)%S.length].id;return S.find(q=>q.id===tr.autoDest);},
  arrived(tr,sid){const pax=!tr.veh.some(v=>v.k==='wagon'),S0=Track.stations,S=pax&&S0.some(q=>!(q.sawmill||q.workshop||q.mine||q.farm))?S0.filter(q=>!(q.sawmill||q.workshop||q.mine||q.farm)):S0;if(tr.destId===sid)tr.destId=null;if(tr.autoDest===sid&&S.length){const i=S.findIndex(q=>q.id===sid);tr.autoDest=S[(i+1)%S.length].id;}},
  // look ahead and throw facing points toward the branch with the shortest way to the destination
  autoRoute(tr){const st=this.destOf(tr);if(!st)return;const D=this.distMap(st),back=tr.rev<0;let pos=back?advance(tr.head,-Trains.length(tr.veh)+COUPLE).pos:tr.head;if(back)pos={...pos,dir:-pos.dir};
    let s=segById(pos.sid),dir=pos.dir,t=pos.t,d=0,g=0;while(s&&d<300&&g++<40){if(s.id===st.sid)break;d+=dir>0?s.L-t:t;const node=dir>0?s.b:s.a,J=this.junction(node),n=Track.node(node);
      if(J&&s===J.trunk&&n){let bi=-1,bv=1e18;J.branches.forEach((b,i)=>{const v=D.get(b.id+(b.a===node?'+':'-'));if(v!=null&&v<bv){bv=v;bi=i;}});
        if(bi>=0&&(n.sw|0)!==bi&&!Trains.list.some(o=>o.poses&&o.poses.some(p=>p&&Math.hypot(p.c[0]-n.x,p.c[2]-n.z)<14)))n.sw=bi;}
      const nx=this.next(s,node,tr,false);if(!nx)break;dir=nx.a===node?1:-1;t=dir>0?0:nx.L;s=nx;}},
  linked(nid){return Track.segs.filter(s=>!s.pend&&(s.a===nid||s.b===nid));},
  /* ids of every track piece joined (through any number of pieces) to piece sid: what a train standing there could ever drive to */
  reachSegs(sid){const seen=new Set(),s0=segById(sid);if(!s0)return seen;const by=new Map();for(const s of Track.segs){if(s.pend)continue;for(const n of [s.a,s.b]){let l=by.get(n);if(!l)by.set(n,l=[]);l.push(s);}}
    const Q=[s0];seen.add(s0.id);while(Q.length){const s=Q.pop();for(const n of [s.a,s.b])for(const o of by.get(n)||[])if(!seen.has(o.id)){seen.add(o.id);Q.push(o);}}return seen;},
  leaveDir(s,nid){return s.a===nid?s.h0:wrapPi(segPoint(s,s.L)[2]+Math.PI);},
  // a junction: the two legs leaving in about the same direction are the branches, the third is the trunk
  junction(nid){if(this.jc.has(nid))return this.jc.get(nid);const ss=this.linked(nid);let J=null;
    if(ss.length===3){const d=ss.map(s=>this.leaveDir(s,nid));let best=[0,1],bd=9;for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){const df=Math.abs(wrapPi(d[i]-d[j]));if(df<bd){bd=df;best=[i,j];}}
      const ti=3-best[0]-best[1],br=[ss[best[0]],ss[best[1]]];const base=d[ti]+Math.PI;br.sort((a,b)=>wrapPi(this.leaveDir(b,nid)-base)-wrapPi(this.leaveDir(a,nid)-base));
      J={trunk:ss[ti],branches:br};}
    this.jc.set(nid,J);return J;},
  next(seg,nid,tr,setSw){const ss=this.linked(nid).filter(s=>s!==seg);if(!ss.length)return null;if(ss.length===1)return ss[0];
    const J=this.junction(nid);if(!J)return ss[0];const n=Track.node(nid);
    if(seg!==J.trunk){if(setSw&&n){const i=J.branches.indexOf(seg);if(i>=0&&n.sw!==i){n.sw=i;}}return J.trunk;}// trailing through a switch sets it
    return J.branches[(n&&n.sw)|0];},
  junctions(){const out=[];for(const n of Track.nodes)if(this.linked(n.id).length===3)out.push(n);return out;},
  flip(n){const J=this.junction(n.id);if(!J)return;if(Trains.list.some(t=>t.poses&&t.poses.some(p=>p&&Math.hypot(p.c[0]-n.x,p.c[2]-n.z)<14))){UI.toast('A train is on the points');return;}
    n.sw=((n.sw|0)+1)%2;Sfx.clunk();},
  // ---- split a piece of track at t: returns the new node in the middle
  split(seg,t){const p=segPoint(seg,t),y=segY(seg,t),g=segGrade(seg,t);
    const toProf=(a,b)=>{const L=b-a,n=Math.max(2,Math.ceil(L/4)),out=[];for(let i=0;i<=n;i++)out.push(segY(seg,a+L*i/n));return out;};
    const J={id:Track.nextId++,x:p[0],z:p[1],y,h:wrapPi(p[2]),g};Track.nodes.push(J);
    const s1={...seg,id:Track.nextId++,b:J.id,L:t,prof:toProf(0,t)},s2={...seg,id:Track.nextId++,a:J.id,x0:p[0],z0:p[1],h0:p[2],L:seg.L-t,prof:toProf(t,seg.L)};
    s1.y1=y;s2.y0=y;const sp=seg.spans||[];s1.spans=sp.filter(q=>q[0]<t).map(q=>[q[0],Math.min(q[1],t),q[2],q[3]]);s2.spans=sp.filter(q=>q[1]>t).map(q=>[Math.max(0,q[0]-t),q[1]-t,q[2],q[3]]);if(typeof Money!=='undefined')Money.paidSeg(s1,s2);
    if(!s1.spans.length)delete s1.spans;if(!s2.spans.length)delete s2.spans;
    Track.segs=Track.segs.filter(s=>s!==seg);Track.segs.push(s1,s2);
    for(const o of [...Track.sigs,...Track.stations])if(o.sid===seg.id){if(o.t<=t)o.sid=s1.id;else{o.sid=s2.id;o.t-=t;}}
    for(const tr of Trains.list){const h=tr.head;if(h.sid===seg.id){if(h.t<=t)h.sid=s1.id;else{h.sid=s2.id;h.t-=t;}}}
    this.changed();return J;},
  // ---- regrade: shift existing track near an end up/down so a new line can meet it (ramp fades out)
  regrade(nid,dy,dry){const gmax=P.maxGrade/100,ramp=clamp(Math.abs(dy)/(gmax*0.45),40,900),mods=[],nodes=[];let node=nid,s=0,prev=null,guard=0;
    while(s<ramp&&guard++<60){const segs=this.linked(node).filter(q=>q!==prev);if(segs.length!==1)break;const sg=segs[0],fromB=sg.b===node,n=Math.max(2,Math.ceil(sg.L/4)),prof=[];
      for(let i=0;i<=n;i++){const t=sg.L*i/n,dd=s+(fromB?sg.L-t:t),f=dd<ramp?1-dd/ramp:0;prof.push(segY(sg,t)+dy*f*f*(3-2*f)*0+dy*f);}
      mods.push({seg:sg,prof});nodes.push(node);s+=sg.L;prev=sg;node=fromB?sg.a:sg.b;}
    if(dry)return{mods,ramp:Math.min(ramp,s)};
    for(const m of mods){m.seg.prof=m.prof;m.seg.y0=m.prof[0];m.seg.y1=m.prof[m.prof.length-1];}
    for(const n of Track.nodes){const s1=Track.segs.find(q=>!q.pend&&(q.a===n.id||q.b===n.id));if(!s1)continue;if(mods.some(m=>m.seg===s1||m.seg.a===n.id||m.seg.b===n.id)){const at=s1.a===n.id?0:s1.L;n.y=segY(s1,at);n.g=s1.a===n.id?-segGrade(s1,0):segGrade(s1,s1.L);}}
    this.changed();return{mods};},
  // ---- a station stands on level track: the platform stretch (centre ± half + 4 m) is made level at the centre's height, with ramps
  // either side that blend back into the old profile (stops at junctions: the stretch beyond one keeps its heights)
  levelStation(st){const s0=segById(st.sid);if(!s0)return false;const yc=segY(s0,st.t),H=(st.len||44)/2+4;
    const visit=[];// {seg, d(t) -> signed distance from the centre}
    visit.push({seg:s0,d:t=>t-st.t});
    for(const sg of [1,-1]){let seg=s0,node=sg>0?s0.b:s0.a,dEnd=sg>0?s0.L-st.t:st.t,guard=0;
      while(dEnd<H+160&&guard++<40){const nx=this.linked(node).filter(q=>q!==seg);if(nx.length!==1)break;const n2=nx[0];if(visit.some(v=>v.seg===n2))break;const fromA=n2.a===node,d0=dEnd;
        visit.push({seg:n2,d:fromA?(t=>sg*(d0+t)):(t=>sg*(d0+n2.L-t))});dEnd+=n2.L;seg=n2;node=fromA?n2.b:n2.a;}
      visit.find(v=>v.seg===seg).end=dEnd;}
    // ramps: long enough for a gentle change (2.5%), but they end where the walk stopped (a junction or the end of the line)
    let dev=0;for(const v of visit)for(let t=0;t<=v.seg.L;t+=2){const d=Math.abs(v.d(t));if(d<=H)dev=Math.max(dev,Math.abs(segY(v.seg,t)-yc));}
    if(dev<0.03)return false;const ramp=clamp(dev/0.025,12,160);
    const lim={};for(const sg of [1,-1]){let m=0;for(const v of visit)for(const t of [0,v.seg.L]){const d=v.d(t);if(Math.sign(d)===sg)m=Math.max(m,Math.abs(d));}lim[sg]=m;}
    const w=d=>{const a=Math.abs(d),R=Math.max(0,Math.min(ramp,lim[d<0?-1:1]-H));if(a<=H)return 1;if(R<=0||a>=H+R)return 0;const u=1-(a-H)/R;return u*u*(3-2*u);};
    for(const v of visit){const sg=v.seg,n=Math.max(2,Math.ceil(sg.L/2)),prof=[];let any=false;for(let i=0;i<=n;i++){const t=sg.L*i/n,y=segY(sg,t),k=w(v.d(t));if(k>0)any=true;prof.push(y+(yc-y)*k);}
      if(any){sg.prof=prof;sg.y0=prof[0];sg.y1=prof[n];}}
    for(const n of Track.nodes){const s1=Track.segs.find(q=>!q.pend&&(q.a===n.id||q.b===n.id));if(!s1||!visit.some(v=>v.seg.a===n.id||v.seg.b===n.id))continue;const at=s1.a===n.id?0:s1.L;n.y=segY(s1,at);n.g=s1.a===n.id?-segGrade(s1,0):segGrade(s1,s1.L);}
    Log.info(`station ${st.name}: track levelled over ${Math.round(2*H)} m (it was ${dev.toFixed(2)} m off level), ramps ${Math.round(ramp)} m`);this.changed();return true;},
  // ---- blocks between signals
  buildBlocks(){const parent=new Map(),find=k=>{while(parent.get(k)!==k){parent.set(k,parent.get(parent.get(k)));k=parent.get(k);}return k;},union=(a,b)=>{parent.set(find(a),find(b));};
    const segSig=new Map();for(const s of Track.segs)segSig.set(s.id,Track.sigs.filter(g=>g.sid===s.id).map(g=>g.t).sort((a,b)=>a-b));
    for(const s of Track.segs){const n=segSig.get(s.id).length;for(let i=0;i<=n;i++)parent.set(s.id+':'+i,s.id+':'+i);}
    for(const nd of Track.nodes){const ss=this.linked(nd.id);const keys=ss.map(s=>s.id+':'+(s.a===nd.id?0:segSig.get(s.id).length));for(let i=1;i<keys.length;i++)union(keys[0],keys[i]);}
    this.blocks={segSig,find};},
  blockAt(sid,t){if(!this.blocks)this.buildBlocks();const ts=this.blocks.segSig.get(sid);if(!ts)return null;let i=0;while(i<ts.length&&t>ts[i])i++;return this.blocks.find(sid+':'+i);},
  // occupancy: every block a train stands in (all trains, not just the last one), plus the block an automatic train has committed to
  // entering (it reserved it while it could still brake normally), so two trains never claim the same block
  updateOcc(){this.occ.clear();this.occAll=new Map();this.face=new Map();if(!Track.sigs.length)return;for(const tr of Trains.list){let off=0;for(const v of tr.veh){for(const d of [off,off+v.len*0.5,off+v.len]){const p=advance(tr.head,-d).pos;const b=this.blockAt(p.sid,p.t);if(b)this.addOcc(b,tr.id);}off+=v.len+COUPLE;}}
    for(const tr of Trains.list)if(tr.resB)this.addOcc(tr.resB,tr.id);},
  addOcc(b,id){this.occ.set(b,id);let S=this.occAll.get(b);if(!S)this.occAll.set(b,S=new Set());S.add(id);},
  redFor(b,id){const S=b?this.occAll.get(b):null;if(!S)return false;for(const q of S)if(q!==id)return true;return false;},
  // the first signal ahead of any train (auto or driven): distance to it when it is red for this train, and what its lamp shows
  sigAhead(tr,ev){for(const e of ev){if(e.type==='end')break;if(e.type!=='signal')continue;const b=this.blockAt(e.sid,e.t+e.dir*0.2),red=this.redFor(b,tr.id);
      this.face.set(e.o,red||this.face.get(e.o)==='r'?'r':'g');return{e,b,red};}return null;},
  // ---- look along the line ahead of a train: signals, stations and buffer stops
  scan(tr,maxD){const back=tr.rev<0;let pos=back?advance(tr.head,-Trains.length(tr.veh)+COUPLE).pos:tr.head;if(back)pos={...pos,dir:-pos.dir};
    let s=segById(pos.sid),t=pos.t,dir=pos.dir,d=0;const ev=[];let guard=0;
    while(s&&d<maxD&&guard++<40){const evs=[];for(const g of Track.sigs)if(g.sid===s.id)evs.push(['signal',g.t,g]);for(const st of Track.stations)if(st.sid===s.id)evs.push(['station',st.t,st]);
      for(const e of evs){const dd=dir>0?e[1]-t:t-e[1];if(dd>0.5)ev.push({type:e[0],d:d+dd,o:e[2],sid:s.id,t:e[1],dir});}
      const rem=dir>0?s.L-t:t;d+=rem;const node=dir>0?s.b:s.a;const n=this.next(s,node,tr,false);if(!n){ev.push({type:'end',d});break;}
      if(n.a===node){t=0;dir=1;}else{t=n.L;dir=-1;}s=n;}
    ev.sort((a,b)=>a.d-b.d);return ev;},
  // ---- automatic driving: speed limit, red signals, station stops, reverse at the buffers
  autoDrive(tr,dt){this.autoRoute(tr);const v=Math.abs(tr.v),look=v*v/(2*0.55)+60,ev=this.scan(tr,look);let stop=1e9,why='';const L=Trains.length(tr.veh);
    const sa=this.sigAhead(tr,ev);tr.resB=null;tr.redAt=sa&&sa.red?sa.e.d:null;if(sa&&!sa.red&&sa.b&&sa.e.d<v*v/1.2+25){tr.resB=sa.b;this.addOcc(sa.b,tr.id);}
    for(const e of ev){
      if(e.type==='end'){if(e.d-6<stop){stop=e.d-6;why='end';}break;}
      if(e.type==='signal'){const b=this.blockAt(e.sid,e.t+e.dir*0.2);if(this.redFor(b,tr.id)){if(e.d-8<stop){stop=e.d-8;why='signal';}break;}}
      if(e.type==='station'&&P.stopStations&&tr.lastStation!==e.o.id&&!((e.o.sawmill||e.o.workshop||e.o.mine||e.o.farm)&&!tr.veh.some(v=>v.k==='wagon'))&&(P.stopAll||!this.destOf(tr)||this.destOf(tr).id===e.o.id)){const sd=e.d+Crane.stopAt(tr,e.o,L);if(sd<stop){stop=sd;why='station';tr.nextStation=e.o;tr.stopTgt={id:e.o.id,o:e.o,rem:sd};}break;}}
    // the stop point lies beyond the platform marker: keep braking for it after the head has passed the marker
    if(why!=='station'&&tr.stopTgt&&tr.lastStation!==tr.stopTgt.id){tr.stopTgt.rem-=v*dt;if(tr.stopTgt.rem<stop){stop=tr.stopTgt.rem;why='station';tr.nextStation=tr.stopTgt.o;}if(tr.stopTgt.rem<-20)tr.stopTgt=null;}
    const vmax=P.autoSpeed/3.6,vt=Math.min(vmax,Math.sqrt(2*0.6*Math.max(0,stop-1.5)),tr.plat&&tr.plat.moving?2.2:1e9);tr.wait=why;
    tr.vCap=why?vt:null;
    if(stop<2.5&&v<0.3){tr.throttle=0;tr.brake=1;tr.v=0;
      if(why==='station'){const pl=tr.plat;
        // pulled up along a short platform: work the coaches that now stand at it
        if(pl&&pl.moving){pl.moving=false;tr.dwell=0;const cs=Life.platCoaches(tr,pl.si);Life.stopPhase(tr,pl.si,cs);Life.condOut(tr,pl.si,cs);}
        tr.dwell=(tr.dwell||0)+dt;const now=P.timeOfDay*60;
        /* at a farm's grain station: the arm has filled the hoppers in its reach, draw up so the next ones stand at it */
        if(tr.grainMove){const D=tr.grainMove,endAt=ev.find(e=>e.type==='end');tr.grainMove=0;if(!(endAt&&endAt.d<D+8)){tr.dwell=0;tr.stopTgt={id:tr.nextStation.id,o:tr.nextStation,rem:D+1.5};tr.status=`Drawing up at ${tr.nextStation.name}`;return;}tr.grainStuck=true;}
        // a train longer than the platform: once the coaches at it are done, pull up so the next ones stand at the platform
        if(pl&&pl.short&&pl.served.size<pl.all.length&&tr.dwell>Math.max(8,P.dwell*0.45)&&!Life.walkers.some(w=>w.state==='board'&&w.train===tr)&&(Life.condReady(tr)||(Life.condGo(tr,true),false))){
          const D=Life.moveUpBy(tr),endAt=ev.find(e=>e.type==='end');
          if(D&&!(endAt&&endAt.d<D+8)){pl.moving=true;pl.moves++;tr.dwell=0;tr.stopTgt={id:tr.nextStation.id,o:tr.nextStation,rem:D+2.4};tr.status=`Pulling up at ${tr.nextStation.name}`;return;}
          else{for(const i of pl.all)pl.served.add(i);pl.blocked=true;}}
        if(P.timetable&&tr.depT==null){const iv=Math.max(5,P.ttInterval),off=(Trains.list.indexOf(tr)*7)%iv;tr.depT=(Math.ceil((now+P.dwell/30+0.5-off)/iv)*iv+off)%1440;}
        const until=tr.depT==null?0:(()=>{const d=((tr.depT-now)%1440+1440)%1440;return d>720?d-1440:d;})(),hm=m=>String(Math.floor(m/60)%24).padStart(2,'0')+':'+String(Math.floor(m%60)).padStart(2,'0');
        const boarding=Life.walkers.some(w=>w.state==='board'&&w.train===tr),ttOk=!P.timetable||until<=0||tr.dwell>240;
        const crn=Crane.holds(tr);tr.status=`At ${tr.nextStation.name}`+(P.timetable&&tr.depT!=null?` · departs ${hm(tr.depT)}`:'')+(boarding?' · boarding':'')+(crn?' · '+Crane.what(tr):'')+(pl&&pl.short?` · platform too short (${pl.served.size}/${pl.all.length} coaches)`:'');
        const ready=tr.dwell>P.dwell&&ttOk&&!crn&&(!boarding||tr.dwell>P.dwell+25)&&!(pl&&pl.short&&pl.served.size<pl.all.length);if(ready&&!Life.condReady(tr)){Life.condGo(tr);tr.status=`At ${tr.nextStation.name} · the conductor gives the right away`;}
        if(ready&&Life.condReady(tr)){if(tr.cond){tr.cond=null;if(P.sound!==0){Sfx.whistle(tr,true);setTimeout(()=>Sfx.whistle(tr,false),650);}}tr.lastStation=tr.nextStation.id;tr.dwell=0;tr.depT=null;tr.stopTgt=null;tr.plat=null;this.arrived(tr,tr.lastStation);}}
      else if(why==='end'){tr.dwell=(tr.dwell||0)+dt;tr.status='Reversing';if(tr.dwell>3){tr.rev=-(tr.rev||1);tr.dwell=0;if(Track.stations.length<2)tr.lastStation=null;}}
      else tr.status=why==='signal'?'Waiting at a red signal':'Stopped';return;}
    tr.dwell=0;tr.status=why==='signal'?'Slowing for a red signal':why==='station'?`Arriving at ${tr.nextStation.name}`:'Running';
    const vn=Math.abs(tr.v),err=vt-vn;tr.throttle=why&&vn>vt-0.4?0:clamp(err*0.4+0.12,0,1);tr.brake=clamp(-err*0.35-0.05,0,1);if(tr.brake>0.02)tr.throttle=0;if(!tr.rev)tr.rev=1;},
  // ---- drawing signals (red / green) and station platforms
  draw(pass,lvp){const p=R.pVeh;if((!Track.sigs.length&&!Track.stations.length)||!R.signalMesh)return;gl.useProgram(p.p);gl.uniform1i(p.u('uPass'),pass);if(lvp)gl.uniformMatrix4fv(p.u('uLightVP'),false,lvp);gl.uniform1f(p.u('uDist'),0);
    const mat=(s,t,off)=>{const q=segPoint(s,t),y=segY(s,t),c=Math.cos(q[2]),sn=Math.sin(q[2]);const x=q[0]-sn*off,z=q[1]+c*off;return new Float32Array([c,0,sn,0,0,1,0,0,-sn,0,c,0,x,y,z,1]);};
    for(const g of Track.sigs){const s=segById(g.sid);if(!s)continue;const b1=this.blockAt(g.sid,g.t-0.2),b2=this.blockAt(g.sid,g.t+0.2);const f=this.face.get(g),red=f==='r'||(f!=='g'&&(this.occAll.has(b1)||this.occAll.has(b2)));
      gl.uniform3f(p.u('uLamp'),red?1.6:0.05,red?0.08:1.3,red?0.04:0.2);gl.uniformMatrix4fv(p.u('uModel'),false,mat(s,g.t,-2.7));gl.bindVertexArray(R.signalMesh.vao);gl.drawElements(gl.TRIANGLES,R.signalMesh.count,gl.UNSIGNED_INT,0);Stats.draws++;}
    gl.uniform3f(p.u('uLamp'),1,1,1);
    const matF=(s,t,f)=>{const q=segPoint(s,t),y=segY(s,t),c=Math.cos(q[2])*f,sn=Math.sin(q[2])*f;return new Float32Array([c,0,sn,0,0,1,0,0,-sn,0,c,0,q[0],y,q[1],1]);};
    for(const st of Track.stations){const s=segById(st.sid);if(!s)continue;if(!(st.mine||st.sawmill||st.workshop)&&R.kitVao)continue;if(st.farm)continue;// passenger stations are kit buildings (Life.kitInst)
      const m=st.mine&&R.veh&&R.veh[31]?R.veh[31]:(st.sawmill||st.workshop)&&R.veh&&R.veh[10]?R.veh[10]:R.stationMesh;gl.uniformMatrix4fv(p.u('uModel'),false,matF(s,st.t,st._f||1));gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,0);Stats.draws++;
      if((st.len||44)>44&&R.platMesh&&R.platMesh[1]){const n=Math.round(((st.len||44)-44)/8),f=st._f||1;for(const e of [-1,1])for(let k=0;k<n;k++){const a=advance({sid:st.sid,t:st.t,dir:1},e*(24+4*k));if(a.blocked)break;const ps=a.pos,s2=segById(ps.sid);if(!s2)break;
          const q=segPoint(s2,ps.t),h=q[2]+(ps.dir<0?Math.PI:0),c=Math.cos(h)*f,sn=Math.sin(h)*f,pm=R.platMesh[k%3===1?1:0];gl.uniformMatrix4fv(p.u('uModel'),false,new Float32Array([c,0,sn,0,0,1,0,0,-sn,0,c,0,q[0],segY(s2,ps.t),q[1],1]));gl.bindVertexArray(pm.vao);gl.drawElements(gl.TRIANGLES,pm.count,gl.UNSIGNED_INT,0);Stats.draws++;}}}
    gl.bindVertexArray(null);},
  nearestOnTrack(x,z,maxD){let best=null,bd=maxD||12;for(const s of Track.segs){if(s.pend)continue;const [t,d]=segNearest(s,x,z);if(t<0||t>s.L)continue;if(d<bd){bd=d;best={seg:s,t,d};}}return best;},
  clearAll(){Track.undo.push(JSON.stringify(Track.serialize()));Track.nodes=[];Track.segs=[];Track.sigs=[];Track.stations=[];for(const t of Trains.list){t.whistle=false;Sfx.whistle(t,false);}Trains.list=[];Trains.sel=-1;this.changed();App.trackChanged();Drive.refresh();Log.info('all track removed');}
};
