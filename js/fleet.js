'use strict';
// ===== fleet.js
// ===================================================================
// FLEET: buses and lorries placed on a road and given a route in a planner, the statistics of every bus, lorry, train and the plane,
// the map's tabs (All · Buses · Lorries · Trains · Planes) with a show/hide eye per route, and the store.
//   Ledger   per vehicle: totals, this game year, last game year, and a time series sampled every minute of play (merged pairwise
//            when long, so the whole history stays at a coarser step)
//   Fleet    placing (tap a road), the route planner (list or map), the estimate of a round (time, passengers or cargo, income)
//   MapUI    the tabs and route lists on the map, the stats panel with its graphs, the store
// ===================================================================
const Ledger={days:0,simT:0,acc:0,SAMPLE:60,MAXS:360,plane:{name:'Staggerwing',isPlane:true},beaver:{name:'DHC-2 Beaver',isPlane:true},
  /* the plane being flown */
  flown(){return Plane.kind==='beaver'?this.beaver:this.plane;},
  /* a game year is four seasons of P.daysPerSeason days; with the clock stopped, no year passes */
  year(){return Math.floor(this.days/(4*Math.max(1,P.daysPerSeason|0||1)));},
  of(o){if(!o.led)o.led={tot:{},yr:{},ly:{},yi:this.year(),ser:[],acc:{}};return o.led;},
  add(o,k,v){if(!o||!v)return;const L=this.of(o);L.tot[k]=(L.tot[k]||0)+v;L.yr[k]=(L.yr[k]||0)+v;L.acc[k]=(L.acc[k]||0)+v;
    /* running costs (4.32.0): every km run costs money by vehicle (Settings › Trains › Running costs); paid as it goes, counted as 'cost' */
    if(k==='km'&&+P.runCosts>0){const c=v*this.rate(o)*(+P.runCosts);L.tot.cost=(L.tot.cost||0)+c;L.yr.cost=(L.yr.cost||0)+c;if(Money.on()){this.owe=(this.owe||0)+c;if(this.owe>=50){Money.spend(Math.floor(this.owe),'running costs');this.owe-=Math.floor(this.owe);}}}},
  /* € per km: a train 3 + 15 % per wagon, a bus 1.2, a double-decker 1.6, a lorry 1.4, the Staggerwing 6, the Beaver 5 */
  rate(o){if(o===this.plane)return 6;if(o===this.beaver)return 5;if(o.veh)return 3*(1+0.15*Math.max(0,o.veh.length-2));if(o.goods)return 1.4;return o.type==='dd'?1.6:1.2;},
  all(){return[...Buses.list,...Trains.list,this.plane,...(Fleet.unlocks.beaver?[this.beaver]:[])];},
  /* the levels sampled (not summed): how full it is, people or goods waiting along its route, the last round's time */
  levels(o){if(o.isPlane)return{load:Air.cargo&&this.flown()===o?100:0};if(Trains.list.includes(o)){const C=o.veh.filter(v=>v.k==='coach').length*SEATS,W=o.veh.filter(v=>v.k==='wagon');let l=0;if(C)l=(o.pax||[]).length/C;else if(W.length)l=W.reduce((a,w)=>a+(w.n||0),0)/(W.length*20);return{load:Math.round(l*100)};}
    const R2=Buses.route(o),cap=RV[RoadVeh.type(o)].cap;if(o.goods){const used=Object.values(o.cargo||{}).reduce((a,c)=>a+(c.n||0),0);let w=0;for(const s of R2){const g=Goods.get('bs:'+s.id);for(const t in g)w+=g[t];}return{load:Math.round(used/16*100),wait:Math.round(w),rt:o.led&&o.led.lastRt||0};}
    let w=0;for(const s of R2)w+=s.waiting||0;return{load:Math.round((o.pax||[]).length/cap*100),wait:Math.round(w),rt:o.led&&o.led.lastRt||0};},
  tick(dt){this.simT+=dt;this.days+=dt*(+P.timeSpeed||0)/86400;const y=this.year();
    for(const o of this.all()){const L=this.of(o);if(L.yi!==y){L.ly=L.yi===y-1?L.yr:{};L.yr={};L.yi=y;}}
    this.acc+=dt;if(this.acc<this.SAMPLE)return;this.acc=0;
    for(const o of this.all()){const L=this.of(o),s={t:Math.round(this.simT),d:+this.days.toFixed(3),...L.acc,...this.levels(o)};L.acc={};L.ser.push(s);if(L.ser.length>this.MAXS)this.thin(L.ser);}},
  /* the older half merged pairwise: flows add up, levels average */
  thin(S){const h=S.length>>1,out=[];for(let i=0;i+1<h;i+=2){const a=S[i],b=S[i+1],m={t:b.t,d:b.d};for(const k of new Set([...Object.keys(a),...Object.keys(b)])){if(k==='t'||k==='d')continue;m[k]=Ledger.LEVEL.has(k)?((a[k]||0)+(b[k]||0))/2:(a[k]||0)+(b[k]||0);}out.push(m);}S.splice(0,h-(h%2),...out);},
  LEVEL:new Set(['load','wait','rt']),
  save(o){const L=o.led;if(!L)return null;const r=v=>Math.round(v*100)/100,rr=O=>{const q={};for(const k in O)q[k]=r(O[k]);return q;};return{tot:rr(L.tot),yr:rr(L.yr),ly:rr(L.ly),yi:L.yi,lastRt:L.lastRt||0,ser:L.ser.map(rr)};},
  load(o,d){if(!d)return;o.led={tot:d.tot||{},yr:d.yr||{},ly:d.ly||{},yi:d.yi|0,ser:d.ser||[],acc:{},lastRt:d.lastRt||0};}};

// ===================================================================
// FLEET: place a bus or lorry on a road, plan its route, buy it
// ===================================================================
const Fleet={draft:null,unlocks:{dd:false},dc:new Map(),
  price(type){return RV[type].price;},
  /* step 1: the Add button arms the road tools; the next tap on a road (within 30 m) is where it starts */
  startPlace(goods){if(!App.T)return;if(!Money.canBuild()){UI.toast('Out of money');return;}if(!Build.active)Build.enter&&Build.enter();Build.setTab&&Build.setTab('roads');
    Roads.tool='spawn';Roads.spawn={goods:!!goods};Roads.a=null;Build.ui();Build.info(goods?'Tap a road where the new lorry should start.':'Tap a road where the new bus should start.');},
  placed(h){const q=Roads.nearestRoad(h[0],h[2],30);if(!q){UI.toast('Tap on a road (or within 30 m of one)');return;}if(!Explore.seen(q.x,q.z)){UI.toast('That road is still in the mist');return;}
    const sp=Roads.spawn||{goods:false};Roads.tool='build';Roads.spawn=null;if(Build.active)Build.exit();
    this.open({goods:sp.goods,type:sp.goods?'blitz':'bus',x:q.x,z:q.z,rot:Math.atan2(q.dz,q.dx),sel:[],tab:'list'});},
  /* edit the route of a vehicle already running */
  edit(b){const C=this.cands(b.goods),sel=[];for(const id of b.stops){const c=C.find(q=>q.stop&&q.stop.id===id);if(c&&!sel.includes(c.key))sel.push(c.key);}
    this.open({goods:b.goods,type:b.type||'bus',x:b.x,z:b.z,rot:b.rot,sel,tab:'list',edit:b,manual:true});},
  open(d){this.draft=d;this.order();FleetUI.show();},
  close(){if(this.draft&&this.draft.tab==='map'&&MapView.on)MapView.close();this.draft=null;FleetUI.hide();},
  // ---- the places a route can visit: villages (that are known); for lorries also the sawmills and wood workshops
  cands(goods){const out=[],kn=v=>Explore.vKnown(v);
    for(const v of Life.villages){if(!kn(v))continue;const st=Buses.stops.find(s=>s.v===v&&!Buses.isCargo(s)&&!s.castle&&s.name.startsWith(v.name))||Buses.stops.find(s=>s.v===v&&!Buses.isCargo(s)&&!s.castle);
      let x,z;if(st){x=st.rx;z=st.rz;}else{const q=Roads.nearestRoad(v.x,v.z,v.R+80);if(!q)continue;x=q.x;z=q.z;}out.push({key:'v'+Life.villages.indexOf(v),kind:'v',name:v.name,v,lv:v.level|0,x,z,stop:st||null});}
    if(goods)for(const [kind,L] of [['sawmill',Life.sawmills||[]],['workshop',Life.workshops||[]]])L.forEach((m,mi)=>{if(!Life.indOn(kind,m)||!Explore.seen(m.x,m.z))return;const st=Buses.stops.find(s=>s[kind]&&s[kind].mi===mi);
      const sl=st?null:Life.sawSlots(m).find(q=>!Buses.stops.some(s=>s[kind]&&s[kind].mi===mi&&s[kind].k===q.k));if(!st&&!sl)return;
      out.push({key:kind[0]+mi,kind,name:Life.indName({kind,m,mi}),v:m.v,m,mi,slot:sl,x:st?st.rx:sl.p[0],z:st?st.rz:sl.p[1],stop:st||null});});
    return out;},
  // ---- road distance between two points (cached; straight × 1.3 where no road joins them)
  dist(a,b){const k=`${a.x|0},${a.z|0}>${b.x|0},${b.z|0}`;if(this.dc.has(k))return this.dc.get(k);let p=null;try{p=Buses.roadPath([a.x,a.z],[b.x,b.z]);}catch(e){}const r=p?{len:Buses.plen(p),road:true,path:p}:{len:Math.hypot(a.x-b.x,a.z-b.z)*1.3,road:false,path:[[a.x,a.z],[b.x,b.z]]};this.dc.set(k,r);return r;},
  /* driving time of a leg: the vehicles keep to 11 m/s on the open road, slower in bends (about 15% over a typical leg), and lose about
     9 s starting off and pulling in (1.2 m/s² both ways) */
  legT(L){return L/11*1.15+9.2;},
  dwell(c,goods,type){return goods?(c.kind==='sawmill'||c.kind==='workshop'?36:10):type==='dd'?11:8;},
  // ---- the order: buses take the shortest round trip (every order tried up to 8 stops, else nearest-neighbour then 2-opt); lorries keep
  // the order they were ticked in (pick-up before delivery is the player's call), with a button for the shortest
  order(force){const d=this.draft;if(!d)return;const C=this.cands(d.goods),sel=d.sel.map(k=>C.find(c=>c.key===k)).filter(Boolean);d.C=C;d.route=sel;
    if((d.goods||d.manual)&&!force)return;if(sel.length<3){d.route=sel;return;}const n=sel.length,D=sel.map(a=>sel.map(b=>a===b?0:this.dist(a,b).len)),cost=o=>{let s=0;for(let i=0;i<n;i++)s+=D[o[i]][o[(i+1)%n]];return s;};
    let best=null,bc=1e18;if(n<=8){const rest=[...Array(n).keys()].slice(1),perm=(a,l)=>{if(l===a.length){const o=[0,...a],c=cost(o);if(c<bc){bc=c;best=o;}return;}for(let i=l;i<a.length;i++){[a[l],a[i]]=[a[i],a[l]];perm(a,l+1);[a[l],a[i]]=[a[i],a[l]];}};perm(rest,0);}
    else{let o=[0];const left=new Set([...Array(n).keys()].slice(1));while(left.size){const a=o[o.length-1];let bi=-1,bd=1e18;for(const j of left)if(D[a][j]<bd){bd=D[a][j];bi=j;}o.push(bi);left.delete(bi);}
      let imp=true;while(imp){imp=false;for(let i=1;i<n-1;i++)for(let j=i+1;j<n;j++){const q=o.slice(0,i).concat(o.slice(i,j+1).reverse(),o.slice(j+1)),c=cost(q);if(c<cost(o)-1e-6){o=q;imp=true;}}}best=o;}
    /* start at the stop nearest the vehicle */let s0=0,sd=1e18;best.forEach((ix,i)=>{const dd=Math.hypot(sel[ix].x-d.x,sel[ix].z-d.z);if(dd<sd){sd=dd;s0=i;}});d.route=best.slice(s0).concat(best.slice(0,s0)).map(i=>sel[i]);d.sel=d.route.map(c=>c.key);},
  toggle(key){const d=this.draft;if(!d)return;const i=d.sel.indexOf(key);if(i>=0)d.sel.splice(i,1);else d.sel.push(key);this.order();FleetUI.refresh();},
  move(i,dir){const d=this.draft,j=i+dir;if(!d||j<0||j>=d.sel.length)return;[d.sel[i],d.sel[j]]=[d.sel[j],d.sel[i]];d.manual=true;this.order();FleetUI.refresh();},
  // ---- the estimate of one round, by following it three times (the third is the steady state): people (or goods) pile up at each stop
  // while the vehicle is away, shared with the other vehicles that serve the same stop; it takes on what fits; each passenger pays the
  // fare on arrival (Money.fare: by distance and how long the trip took), each load of goods units × km × rate
  estimate(){const d=this.draft;if(!d||d.route.length<1)return null;const R=d.route,n=R.length,goods=d.goods,type=d.type,cap=goods?16:RV[type].cap;
    const legs=R.map((c,i)=>{const a=n>1?R[(i-1+n)%n]:{x:d.x,z:d.z};return this.dist(a,c);}),tl=legs.map(L=>this.legT(L.len)),dw=R.map(c=>this.dwell(c,goods,type));
    const T=n>1?tl.reduce((a,b)=>a+b,0)+dw.reduce((a,b)=>a+b,0):0,km=n>1?legs.reduce((a,L)=>a+L.len,0)/1000:0;
    const share=R.map(c=>1+(c.stop?Buses.list.filter(b=>b!==d.edit&&!!b.goods===!!goods&&b.stops.includes(c.stop.id)).length:0));
    const out={T,km,legs,tl,dw,share,inc:0,pax:0,cargo:0,full:[],rate:[],acc:[]};if(n<2)return out;
    if(!goods){const rate=R.map(c=>0.05*P.people*(1+c.lv*0.9)),capS=R.map(c=>16+c.lv*12);out.rate=rate;
      const ob=[];let inc=0,pax=0;const arr=[];{let t=0;for(let i=0;i<n;i++){t+=tl[i];arr.push(t);t+=dw[i];}}
      for(let round=0;round<3;round++){inc=0;pax=0;for(let i=0;i<n;i++){const c=R[i],now=round*T+arr[i];
          for(let k=ob.length-1;k>=0;k--){const p=ob[k];if(p.dest===i){const o=R[p.from],dd=Math.abs(c.x-o.x)+Math.abs(c.z-o.z),tt=now-p.t0,exp=dd/15+75,f=clamp(1.6-0.6*tt/exp,0.25,1.3);inc+=p.n*350*P.fareRate*(dd/1000)*f;pax+=p.n;ob.splice(k,1);}}
          const waiting=Math.min(capS[i],rate[i]*T/share[i]),aboard=ob.reduce((a,p)=>a+p.n,0),bd=Math.min(waiting,cap-aboard);out.acc[i]=waiting;if(round===2&&waiting>cap-aboard+0.5)out.full.push(c.name);
          if(bd>0)for(let j=0;j<n;j++)if(j!==i)ob.push({from:i,dest:j,n:bd/(n-1),t0:now+dw[i]});}}
      out.inc=Money.on()?inc:0;out.pax=pax;return out;}
    // lorries: what each stop makes and takes
    const TY=['mail','produce','grain','wood'],mk=R.map(c=>{const r=Goods.src(c.x,c.z);if(c.kind==='sawmill')r.wood+=0.18;const o={};for(const t of TY)o[t]=r[t]*P.goodsRate;return o;}),
      tk=R.map(c=>{const o={};for(const t of TY)o[t]=t==='wood'?(c.kind==='workshop'||(Life.workshops||[]).some(m=>Math.hypot(m.x-c.x,m.z-c.z)<250)):Goods.accepts(c.v,t);return o;});out.make=mk;out.take=tk;
    const hold={};let inc=0,units=0;for(let round=0;round<3;round++){inc=0;units=0;for(let i=0;i<n;i++){const c=R[i];
        for(const t of TY){const h=hold[t];if(h&&h.n>0&&h.from!==i&&tk[i][t]){const o=R[h.from],km2=(Math.abs(c.x-o.x)+Math.abs(c.z-o.z))/1000;inc+=h.n*km2*Goods.T[t].rate*P.fareRate;units+=h.n;h.n=0;}}
        const used=TY.reduce((a,t)=>a+(hold[t]?hold[t].n:0),0),free=Math.max(0,cap-used);
        let all=0;for(const t of TY){const stock=Math.min(60,mk[i][t]*T/share[i]),room=Math.floor(free/4),take=Math.max(0,Math.min(room,Math.floor(stock)));all+=stock;if(take>0){if(!hold[t]||hold[t].n<1)hold[t]={n:0,from:i};hold[t].n+=take;}}if(round===2&&all>free+2)out.full.push(c.name);}}
    out.inc=Money.on()?inc:0;out.cargo=units;return out;},
  /* buy: the stops that are missing are placed (a stop on the village street, a loading bay at an industry), the vehicle starts where it
     was placed and drives to the first stop */
  confirm(){const d=this.draft;if(!d)return;const R=d.route;const min=Explore.on()&&d.goods?1:2;if(R.length<min){UI.toast(`Choose at least ${min} destinations`);return;}
    const newStops=R.filter(c=>!c.stop),cost=(d.edit?0:this.price(d.type))+newStops.reduce((a,c)=>a+(c.kind==='v'?8000:12000),0);if(Money.on()&&!Money.canBuild()){UI.toast('Out of money');return;}
    for(const c of newStops){if(c.kind==='v'){Explore.autoStop(c.v);c.stop=Buses.stops.find(s=>s.v===c.v&&!Buses.isCargo(s))||null;if(c.stop&&Money.on())Money.spend(8000,'bus stop '+c.stop.name);}
      else{const sl=c.slot,dx=Math.cos(sl.t),dz=Math.sin(sl.t),nr=Roads.nearestRoad(sl.p[0],sl.p[1],400);if(nr&&Math.hypot(nr.x-sl.p[0],nr.z-sl.p[1])>4){const pts=Life.routePath([sl.p[0],sl.p[1]],[nr.x,nr.z],{cs:5,margin:60,bridge:true,wind:0.1,road:0.6,maxG:0.32});if(pts)Roads.list.push({p:pts.flat(),w:1.4,kind:1,player:true});}
        Roads.list.push({p:[sl.p[0]-dx*10,sl.p[1]-dz*10,sl.p[0]+dx*10,sl.p[1]+dz*10],w:2.2,kind:1,player:true});Life.roadsDirty=true;Buses.G=null;Buses.legCache=null;
        const s={id:Buses.nextId++,x:sl.p[0],z:sl.p[1],rx:sl.p[0],rz:sl.p[1],rot:sl.t,v:c.m.v,name:c.name,waiting:0,[c.kind]:{mi:c.mi,k:sl.k}};Buses.stops.push(s);Buses.stopAdded(s);c.stop=s;if(Money.on())Money.spend(12000,'loading bay');}}
    const ids=R.map(c=>c.stop&&c.stop.id).filter(id=>id!=null);
    if(d.edit){const b=d.edit;b.stops=ids;Buses.edited(b);UI.toast(`${b.name}: new route of ${ids.length} stops`);this.close();return;}
    const b=Buses.make(d.goods,null,ids);if(d.type==='dd'){b.type='dd';b.name=`Double-decker ${Buses.list.filter(q=>q.type==='dd').length+1}`;}
    b.x=d.x;b.z=d.z;b.rot=d.rot;b.st='drive';b.leg=0;b.path=null;b.allStops=false;b.v=0;if(ids.length<2&&Explore.on())b.explorer=true;Buses.list.push(b);
    if(Money.on())Money.spend(this.price(d.type),d.goods?'lorry':'bus');Ledger.of(b);
    UI.toast(b.explorer?`${b.name} is on the road: tap it, choose Drive and follow the road into the mist to find another village`:`${b.name} is on its way: ${ids.length} stops`);BusUI.refresh();this.close();},
  /* the colour of a route on the map: hues by the golden angle, buses blue-to-violet and lorries orange-to-red so the two kinds stay apart */
  color(b){const i=(b.id*0.618034)%1;return b.goods?`hsl(${(15+i*40).toFixed(0)},90%,${(55+i*12).toFixed(0)}%)`:`hsl(${(185+i*95).toFixed(0)},85%,${(58+i*10).toFixed(0)}%)`;}};

// ---- small formatting helpers
const fmtT=s=>{s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s/60)%60,q=s%60;return h?`${h}:${String(m).padStart(2,'0')} h`:`${m}:${String(q).padStart(2,'0')} min`;},
  fmtKm=m=>m>=1000?(m/1000).toFixed(2)+' km':Math.round(m)+' m',fmtE=v=>'€ '+Money.fmt(Math.round(v||0));

// ===================================================================
// the route planner panel: list (route in order, the estimate, all destinations to tick) or map (tap destinations on the map)
// ===================================================================
const FleetUI={el:null,
  show(){if(!this.el){const p=this.el=document.createElement('div');p.id='fleetPanel';p.className='fp';document.body.appendChild(p);p.addEventListener('click',e=>this.click(e));}this.el.hidden=false;this.refresh();},
  hide(){if(this.el)this.el.hidden=true;document.body.classList.remove('fplan');},
  setTab(t){const d=Fleet.draft;if(!d)return;d.tab=t;if(t==='map'){if(!MapView.on)MapView.open();this.frame();}else if(MapView.on)MapView.close();this.refresh();},
  /* the map shows the start, the chosen places and the nearest others, with room below for the panel */
  frame(){const d=Fleet.draft,pts=[[d.x,d.z],...d.route.map(c=>[c.x,c.z]),...d.C.slice().sort((a,b)=>Math.hypot(a.x-d.x,a.z-d.z)-Math.hypot(b.x-d.x,b.z-d.z)).slice(0,6).map(c=>[c.x,c.z])];let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const [x,z] of pts){x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,z);z1=Math.max(z1,z);}
    const asp=innerWidth/innerHeight,fy=(asp<1?64:50)*Math.PI/180,span=Math.max(x1-x0,(z1-z0)*1.6,600)*1.25;Cam.target=[(x0+x1)/2,0,(z0+z1)/2+span*0.12];Cam.dist=span/2/(Math.tan(fy/2)*Math.min(1,asp));},
  click(e){const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a,d=Fleet.draft;if(!d)return;
    if(a==='x')Fleet.close();else if(a==='tab'){if(b.dataset.t!==d.tab)this.setTab(b.dataset.t);}else if(a==='tg')Fleet.toggle(b.dataset.k);else if(a==='up')Fleet.move(+b.dataset.i,-1);else if(a==='dn')Fleet.move(+b.dataset.i,1);
    else if(a==='short'){d.manual=false;Fleet.order(true);if(d.goods)d.manual=true;this.refresh();}else if(a==='type'){d.type=b.dataset.t;this.refresh();}else if(a==='buy')Fleet.confirm();else if(a==='eye'){const v=Buses.list.find(q=>q.id===+b.dataset.id);if(v){v.mapHidden=!v.mapHidden;this.refresh();}}},
  refresh(){const d=Fleet.draft,p=this.el;if(!d||!p)return;document.body.classList.toggle('fplan',d.tab==='map');p.classList.toggle('compact',d.tab==='map');const E=Fleet.estimate(),G=d.goods,R=d.route;
    const title=d.edit?`Route of ${esc(d.edit.name)}`:G?'New lorry':d.type==='dd'?'New double-decker':'New bus';
    let h=`<div class="fp-h"><div><b>${title}</b><span>${R.length} destination${R.length===1?'':'s'}</span></div><span class="seg"><button data-a="tab" data-t="list" class="${d.tab==='list'?'on':''}">${svgIcon('list')} List</button><button data-a="tab" data-t="map" class="${d.tab==='map'?'on':''}">${svgIcon('map')} Map</button></span><button data-a="x" aria-label="Close">✕</button></div>`;
    if(!G&&!d.edit&&Fleet.unlocks.dd)h+=`<div class="fp-row"><span class="seg"><button data-a="type" data-t="bus" class="${d.type==='bus'?'on':''}">Bus · 24 seats · ${fmtE(RV.bus.price)}</button><button data-a="type" data-t="dd" class="${d.type==='dd'?'on':''}">Double-decker · 60 seats · ${fmtE(RV.dd.price)}</button></span></div>`;
    // the estimate
    if(E&&R.length>1){const perH=E.T>0?E.inc*3600/E.T:0;h+=`<div class="fp-est"><div><em>One round</em><b>${fmtT(E.T)}</b><span>${E.km.toFixed(2)} km</span></div><div><em>${G?'Goods':'Passengers'}</em><b>${Math.round(G?E.cargo:E.pax)}</b><span>per round</span></div><div><em>Income</em><b>${fmtE(E.inc)}</b><span>per round · ${fmtE(perH)}/h</span></div></div>`;
      if(E.full.length)h+=`<div class="fp-warn">${G?'More goods pile up':'More people wait'} at ${esc([...new Set(E.full)].join(', '))} than fit: another ${G?'lorry':'bus'} on this route would earn more.</div>`;
      if(E.share.some(k=>k>1))h+=`<div class="fp-note">Stops shared with other ${G?'lorries':'buses'}: the estimate splits what waits there.</div>`;
      if(E.legs.some(L=>!L.road))h+=`<div class="fp-warn">Some legs have no road between them (≈ distances): build a road first.</div>`;}
    else h+=`<div class="fp-note">${d.tab==='map'?'Tap villages'+(G?' and industries':'')+' on the map to add or remove them.':'Tick at least two destinations below'+(Explore.on()&&G?' (or one, to go exploring)':'')+'.'}</div>`;
    if(d.tab==='map'){const others=Buses.list.filter(b=>b!==d.edit);if(others.length)h+=`<div class="fp-cap">Other routes on the map</div><div class="fp-eyes">${others.map(b=>`<button data-a="eye" data-id="${b.id}" class="${b.mapHidden?'':'on'}"><i style="background:${Fleet.color(b)}"></i>${svgIcon(b.mapHidden?'eyeOff':'eye')}${esc(b.name)}</button>`).join('')}</div>`;}
    // the route, in driving order
    if(R.length&&d.tab==='list'){h+=`<div class="fp-cap">Route${G?' · in the order you set':' · shortest round trip'}${G&&R.length>2?' <button data-a="short" class="mini">Shortest order</button>':''}</div><ol class="fp-r">`;
      R.forEach((c,i)=>{const L=E&&E.legs[i],dt=E&&E.tl[i],extra=G?this.goodsLine(E,i):`waits ≈ ${Math.round(E?E.acc[i]||0:0)} per round · +${(0.05*P.people*(1+c.lv*0.9)*60).toFixed(1)}/min`;
        h+=`<li><div><b>${esc(c.name)}</b><span>${R.length>1&&L?`${i===0?'from '+esc(R[R.length-1].name)+': ':''}${L.road?'':'≈ '}${fmtKm(L.len)} · ${fmtT(dt)} drive · ${fmtT(E.dw[i])} stop`:''}</span><span>${extra}</span></div><button data-a="up" data-i="${i}" aria-label="Earlier">↑</button><button data-a="dn" data-i="${i}" aria-label="Later">↓</button><button data-a="tg" data-k="${c.key}" aria-label="Remove">✕</button></li>`;});h+=`</ol>`;}
    // all destinations
    if(d.tab==='list'){const C=d.C.slice().sort((a,b)=>Math.hypot(a.x-d.x,a.z-d.z)-Math.hypot(b.x-d.x,b.z-d.z));h+=`<div class="fp-cap">Destinations</div><div class="fp-c">`;
      for(const c of C){const on=d.sel.includes(c.key),lv=c.kind==='v'?(Life.LEVELS[c.lv]||{}).name:c.kind==='sawmill'?'sawmill':'wood workshop',info=G?this.goodsCand(c):`+${(0.05*P.people*(1+c.lv*0.9)*60).toFixed(1)} people/min, up to ${16+c.lv*12} waiting${c.stop?' · '+Math.floor(c.stop.waiting||0)+' now':''}`;
        h+=`<button data-a="tg" data-k="${c.key}" class="${on?'on':''}"><i>${on?'✓':''}</i><div><b>${esc(c.name)}</b><span>${lv} · ${fmtKm(Math.hypot(c.x-d.x,c.z-d.z))} away${c.stop?'':' · new '+(c.kind==='v'?'stop '+fmtE(8000):'loading bay '+fmtE(12000))}</span><span>${info}</span></div></button>`;}
      if(!C.length)h+=`<div class="fp-note">No destinations known yet.</div>`;h+=`</div>`;}
    const nNew=R.filter(c=>!c.stop),cost=(d.edit?0:Fleet.price(d.type))+nNew.reduce((a,c)=>a+(c.kind==='v'?8000:12000),0);
    h+=`<div class="fp-f"><span>${d.edit?'':`${G?'Lorry':d.type==='dd'?'Double-decker':'Bus'} ${fmtE(Fleet.price(d.type))}`}${nNew.length?` + ${nNew.length} new stop${nNew.length>1?'s':''}`:''}${Money.on()?` = <b>${fmtE(cost)}</b>`:''}</span><button data-a="buy" class="go">${d.edit?'Save route':'Buy and start'}</button></div>`;
    p.innerHTML=h;},
  goodsCand(c){const r=Goods.src(c.x,c.z);if(c.kind==='sawmill')r.wood+=0.18;const mk=Object.keys(r).filter(t=>r[t]>0.001).map(t=>`${Goods.T[t].icon} ${(r[t]*P.goodsRate*60).toFixed(1)}/min`),
      tk=['mail','produce','grain','wood'].filter(t=>t==='wood'?(c.kind==='workshop'||(Life.workshops||[]).some(m=>Math.hypot(m.x-c.x,m.z-c.z)<250)):Goods.accepts(c.v,t)).map(t=>Goods.T[t].icon);
    return`makes ${mk.length?mk.join(' '):'nothing'} · takes ${tk.length?tk.join(' '):'nothing'}`;},
  goodsLine(E,i){if(!E||!E.make)return'';const mk=Object.keys(E.make[i]).filter(t=>E.make[i][t]>0.001).map(t=>`${Goods.T[t].icon} ${(E.make[i][t]*60).toFixed(1)}/min`),tk=Object.keys(E.take[i]).filter(t=>E.take[i][t]).map(t=>Goods.T[t].icon);return`makes ${mk.join(' ')||'nothing'} · takes ${tk.join(' ')||'nothing'}`;}};

// ===================================================================
// the map: tabs (All · Buses · Lorries · Trains · Planes), a list per tab with a show/hide eye and a statistics button per route
// ===================================================================
const MapUI={tab:'all',TABS:[['all','All','map'],['bus','Buses','bus'],['lorry','Lorries','lorry'],['train','Trains','loco'],['plane','Planes','plane']],
  kind(o){return o.isPlane?'plane':Trains.list.includes(o)?'train':o.goods?'lorry':'bus';},
  shows(o){return!o.mapHidden&&(this.tab==='all'||this.tab===this.kind(o));},
  showKind(k){return this.tab==='all'||this.tab===k;},
  bar(){const t=$('#mapTabs');if(!t)return;t.innerHTML=this.TABS.map(([k,n,ic])=>`<button data-mt="${k}" class="${this.tab===k?'on':''}">${svgIcon(ic)}<span>${n}</span></button>`).join('');
    for(const b of t.querySelectorAll('[data-mt]'))b.onclick=()=>{this.tab=b.dataset.mt;this.bar();this.list();};},
  list(){let p=$('#mapList');if(!p){p=document.createElement('div');p.id='mapList';p.className='fp';document.body.appendChild(p);p.addEventListener('click',e=>this.click(e));}
    if(!MapView.on||Fleet.draft){p.hidden=true;return;}p.hidden=false;{const bar=$('#mapBar');p.style.bottom=(bar&&!bar.hidden?innerHeight-bar.getBoundingClientRect().top+8:90)+'px';}const yr=o=>fmtE(o.led&&o.led.yr.inc||0),eye=o=>`<button data-a="eye" data-k="${this.key(o)}" aria-label="${o.mapHidden?'Show':'Hide'} on the map" class="ic2${o.mapHidden?'':' on'}">${svgIcon(o.mapHidden?'eyeOff':'eye')}</button>`,
      st=o=>`<button data-a="st" data-k="${this.key(o)}" aria-label="Numbers and graphs" class="ic2">${svgIcon('list')}</button>`,row=(o,col,sub)=>`<div class="ml-r"><i style="background:${col}"></i><div><b>${esc(o.name)}</b><span>${sub}</span></div>${eye(o)}${st(o)}</div>`;
    let h='';const B=Buses.list.filter(b=>!b.goods),Lo=Buses.list.filter(b=>b.goods);
    if(this.tab==='all'){const sum=(L)=>fmtE(L.reduce((a,o)=>a+(o.led&&o.led.yr.inc||0),0));h+=`<div class="fp-cap">This year</div>`+[['bus','Buses',B],['lorry','Lorries',Lo],['train','Trains',Trains.list],['plane','Planes',[...(Air.list.length?[Ledger.plane]:[]),...(Fleet.unlocks.beaver?[Ledger.beaver]:[])]]].map(([k,n,L])=>`<button data-a="tab" data-t="${k}" class="ml-all">${svgIcon(this.TABS.find(q=>q[0]===k)[2])}<b>${n}</b><span>${L.length} · ${sum(L)}</span></button>`).join('');}
    else if(this.tab==='bus'||this.tab==='lorry'){const L=this.tab==='bus'?B:Lo;h+=`<div class="ml-h"><span>${L.length} ${this.tab==='bus'?(L.length===1?'bus route':'bus routes'):(L.length===1?'lorry route':'lorry routes')}</span><button data-a="add" class="go">+ ${this.tab==='bus'?'Add bus':'Add lorry'}</button></div>`;
      h+=L.map(b=>row(b,Fleet.color(b),`${Buses.route(b).length} stops · ${esc(Buses.status(b))} · ${yr(b)} this year`)).join('')||`<div class="fp-note">None yet.</div>`;}
    else if(this.tab==='train')h+=Trains.list.map(t=>row(t,'#ff5a4a',`${t.veh.length-2} ${t.veh.some(v=>v.k==='coach')?'coaches':'wagons'} · ${yr(t)} this year`)).join('')||`<div class="fp-note">No trains yet.</div>`;
    else{const nS=Air.list.filter(s=>!s.water).length,nJ=Air.list.length-nS;h+=row(Ledger.plane,'#ffe07a',`${nS} airstrip${nS===1?'':'s'} · ${yr(Ledger.plane)} this year`);if(Fleet.unlocks.beaver)h+=row(Ledger.beaver,'#f0a020',`${nJ} jett${nJ===1?'y':'ies'} · ${yr(Ledger.beaver)} this year`);if(!Air.list.length)h+=`<div class="fp-note">No airstrip yet: a town can buy one (tap the town).</div>`;}
    /* the panel folds to one line (tap its title); on a short landscape screen it starts folded and sits at the left, so the map stays free */
    const land=innerWidth>innerHeight&&innerHeight<760;if(this.fold==null)this.fold=land;p.classList.toggle('side',land);if(land){p.style.bottom='';}
    h=`<button data-a="fold" class="ml-fold">${this.fold?'▸ Show the list':'▾ Hide the list'}</button>`+(this.fold?'':h);p.innerHTML=h;},
  key(o){return o===Ledger.beaver?'pb':o.isPlane?'p':Trains.list.includes(o)?'t'+o.id:'b'+o.id;},
  byKey(k){if(k==='pb')return Ledger.beaver;if(k==='p')return Ledger.plane;if(k[0]==='t')return Trains.list.find(t=>t.id===+k.slice(1));return Buses.list.find(b=>b.id===+k.slice(1));},
  click(e){const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a;if(a==='fold'){this.fold=!this.fold;this.list();return;}if(a==='tab'){this.tab=b.dataset.t;this.bar();this.list();return;}
    if(a==='add'){const g=this.tab==='lorry';MapView.close();Build.enter();Build.setTab('roads');Fleet.startPlace(g);return;}
    const o=this.byKey(b.dataset.k);if(!o)return;if(a==='eye'){o.mapHidden=!o.mapHidden;this.list();}else if(a==='st')StatsUI.open(o);}};

// ===================================================================
// statistics of one vehicle: this year, last year and in all; a tap on a number draws its graph
// ===================================================================
const StatsUI={el:null,o:null,ch:null,
  ROWS:{bus:[['inc','Income','€'],['pax','Passengers carried'],['km','Distance driven','km'],['rounds','Rounds completed'],['stops','Stops served']],
    lorry:[['inc','Income','€'],['cargo','Goods delivered','units'],['km','Distance driven','km'],['rounds','Rounds completed'],['stops','Stops served']],
    train:[['inc','Income','€'],['pax','Passengers carried'],['cargo','Goods delivered','units'],['km','Distance','km']],
    plane:[['inc','Income','€'],['cargo','Crates delivered'],['flights','Cargo flights'],['km','Distance flown','km']]},
  LEVELS:{bus:[['load','Seats taken','%'],['wait','People waiting at its stops'],['rt','Time of a round','s']],lorry:[['load','Load','%'],['wait','Goods waiting at its stops','units'],['rt','Time of a round','s']],train:[['load','Load','%']],plane:[['load','Cargo on board','%']]},
  fmt(v,u){if(u==='€')return fmtE(v);if(u==='km')return(v||0).toFixed(1)+' km';if(u==='%')return Math.round(v||0)+'%';if(u==='s')return v?fmtT(v):'—';return Math.round(v||0).toLocaleString('nl-NL')+(u&&u!=='units'?' '+u:'');},
  open(o){this.o=o;this.ch=null;let p=this.el;if(!p){p=this.el=document.createElement('div');p.id='statsPanel';p.className='fp';document.body.appendChild(p);p.addEventListener('click',e=>this.click(e));}p.hidden=false;this.refresh();},
  close(){if(this.el)this.el.hidden=true;this.o=null;},
  click(e){const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a;if(a==='x'){this.close();return;}if(a==='g'){this.ch={k:b.dataset.k,s:b.dataset.s};this.refresh();return;}
    if(a==='edit'&&this.o&&!this.o.isPlane&&Buses.list.includes(this.o)){const o=this.o;this.close();MapView.close();Fleet.edit(o);}
    if(a==='go'&&this.o){const o=this.o,p=o.isPlane?(Plane.st?[Plane.st.p[0],Plane.st.p[2]]:null):Trains.list.includes(o)?(o.poses&&o.poses[0]?[o.poses[0].c[0],o.poses[0].c[2]]:null):[o.x,o.z];this.close();if(p){MapView.fly=[p[0],R.sampleHr(App.T,p[0],p[1]),p[1]];MapView.close();}}},
  refresh(){const o=this.o,p=this.el;if(!o||!p)return;const L=Ledger.of(o),k=MapUI.kind(o),rows=this.ROWS[k],lv=this.LEVELS[k],cell=(key,s,v,u)=>`<td><button data-a="g" data-k="${key}" data-s="${s}" class="${this.ch&&this.ch.k===key&&this.ch.s===s?'on':''}">${this.fmt(v,u)}</button></td>`;
    let h=`<div class="fp-h"><div><b>${esc(o.name)}</b><span>${{bus:'bus',lorry:'lorry',train:'train',plane:'plane'}[k]} · game year ${Ledger.year()+1}</span></div>${Buses.list.includes(o)?'<button data-a="edit">Edit route</button>':''}<button data-a="go">Go to</button><button data-a="x" aria-label="Close">✕</button></div>`;
    if(this.ch)h+=`<div class="st-g"><div class="st-gt" id="stGT"></div><canvas id="stCv"></canvas></div>`;
    h+=`<table class="st-t"><tr><th></th><th>This year</th><th>Last year</th><th>In all</th></tr>`;
    for(const [key,n,u] of rows)h+=`<tr><th>${n}</th>${cell(key,'yr',L.yr[key],u)}${cell(key,'ly',L.ly[key],u)}${cell(key,'tot',L.tot[key],u)}</tr>`;
    h+=`<tr class="st-c"><th>Running costs</th>${['yr','ly','tot'].map(s=>`<td>${fmtE(L[s].cost||0)}</td>`).join('')}</tr><tr><th>Profit</th>${['yr','ly','tot'].map(s=>`<td>${fmtE((L[s].inc||0)-(L[s].cost||0))}</td>`).join('')}</tr>`;
    const per=(a,b,u)=>['yr','ly','tot'].map(s=>`<td>${L[s][b]?this.fmt((L[s][a]||0)/L[s][b],u):'—'}</td>`).join('');
    h+=`<tr class="st-d"><th>Income per km</th>${per('inc','km','€')}</tr>`;if(L.tot.rounds!=null||k==='bus'||k==='lorry')h+=`<tr class="st-d"><th>Income per round</th>${per('inc','rounds','€')}</tr><tr class="st-d"><th>${k==='lorry'?'Goods':'Passengers'} per round</th>${per(k==='lorry'?'cargo':'pax','rounds')}</tr>`;
    h+=`</table><table class="st-t"><tr><th></th><th>Now</th><th>Average</th><th></th></tr>`;const S=L.ser,lvNow=Ledger.levels(o);
    for(const [key,n,u] of lv){const vals=S.map(q=>q[key]).filter(v=>v!=null&&(key!=='rt'||v>0)),avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;h+=`<tr><th>${n}</th>${cell(key,'now',lvNow[key],u)}<td>${this.fmt(avg,u)}</td><td></td></tr>`;}
    h+=`</table><div class="st-note">Running costs are paid per km driven (Settings › Trains › Running costs). Tap a number for its graph.</div>`;
    p.innerHTML=h;if(this.ch)this.chart();},
  /* a single series: running totals for the flows (this year from its start, last year, in all), the sampled value for the levels */
  chart(){const o=this.o,L=Ledger.of(o),{k,s}=this.ch,lev=Ledger.LEVEL.has(k)||k==='load',k2=MapUI.kind(o),def=[...this.ROWS[k2],...this.LEVELS[k2]].find(r=>r[0]===k)||[k,k],u=def[2],Y=4*Math.max(1,P.daysPerSeason|0||1);
    let S=L.ser.slice();if(s==='yr')S=S.filter(q=>Math.floor(q.d/Y)===L.yi);else if(s==='ly')S=S.filter(q=>Math.floor(q.d/Y)===L.yi-1);
    const pts=[];let acc=0;for(const q of S){if(lev){if(q[k]!=null)pts.push([q,q[k]]);}else{acc+=q[k]||0;pts.push([q,acc]);}}
    const cv=$('#stCv'),gt=$('#stGT');gt.textContent=`${def[1]}${lev?'':' · running total'} · ${s==='yr'?'this year':s==='ly'?'last year':s==='now'?'all samples':'in all'}`;
    const dpr=Math.min(2,devicePixelRatio||1),W=cv.clientWidth||320,H=170;cv.width=W*dpr;cv.height=H*dpr;cv.style.height=H+'px';const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
    if(pts.length<2){g.fillStyle='#cdbf9f';g.font='13px system-ui';g.fillText(pts.length?'One sample so far: the graph grows each minute of play.':'No data yet: a sample is taken every minute of play.',8,H/2);return;}
    const useD=pts[pts.length-1][0].d-pts[0][0].d>0.02,X=q=>useD?q.d:q.t/60,x0=X(pts[0][0]),x1=X(pts[pts.length-1][0]),ymax=Math.max(1e-9,...pts.map(p=>p[1]))*1.08,l=58,r=10,t=10,b=24,
      sx=x=>l+(x-x0)/(x1-x0||1)*(W-l-r),sy=y=>H-b-y/ymax*(H-t-b);
    g.strokeStyle='#ffffff1c';g.lineWidth=1;g.fillStyle='#a99f88';g.font='11px system-ui';g.textAlign='right';
    for(let i=0;i<=3;i++){const y=ymax*i/3,py=sy(y);g.beginPath();g.moveTo(l,py);g.lineTo(W-r,py);g.stroke();g.fillText(this.fmt(y,u),l-6,py+4);}
    g.textAlign='center';for(let i=0;i<=3;i++){const x=x0+(x1-x0)*i/3;g.fillText(useD?`day ${(x+1).toFixed(1)}`:`${x.toFixed(0)} min`,sx(x),H-6);}
    g.strokeStyle='#e8c35a';g.lineWidth=2;g.lineJoin='round';g.beginPath();pts.forEach((p,i)=>{const X2=sx(X(p[0])),Y2=sy(p[1]);i?g.lineTo(X2,Y2):g.moveTo(X2,Y2);});g.stroke();
    // touch or hover: the value at that point
    const show=ev=>{const rc=cv.getBoundingClientRect(),mx=ev.clientX-rc.left;let bi=0,bd=1e9;pts.forEach((p,i)=>{const d=Math.abs(sx(X(p[0]))-mx);if(d<bd){bd=d;bi=i;}});const p=pts[bi];
      this.chart.call(Object.assign(Object.create(this),{ch:this.ch,o:this.o,noTip:true}));const g2=cv.getContext('2d');g2.setTransform(dpr,0,0,dpr,0,0);const px=sx(X(p[0])),py=sy(p[1]);
      g2.strokeStyle='#ffffff55';g2.lineWidth=1;g2.beginPath();g2.moveTo(px,t);g2.lineTo(px,H-b);g2.stroke();g2.fillStyle='#e8c35a';g2.strokeStyle='#15191a';g2.lineWidth=2;g2.beginPath();g2.arc(px,py,4.5,0,6.283);g2.fill();g2.stroke();
      gt.textContent=`${def[1]}: ${this.fmt(p[1],u)} · ${useD?'day '+(p[0].d+1).toFixed(1):(p[0].t/60).toFixed(0)+' min of play'}`;};
    if(!this.noTip){cv.onpointermove=show;cv.onpointerdown=show;}}};

// ===================================================================
// the store: a page of its own (4.25.0). Each item turns slowly in a 3D preview drawn by a small renderer of its own (a second WebGL
// context with a plain lit shader) from the same meshes the game uses; drag a preview to turn it
// ===================================================================
const Preview={gl:null,cv:null,prog:null,cache:new Map(),
  init(){if(this.gl)return true;const cv=this.cv=document.createElement('canvas');cv.width=640;cv.height=400;const g=this.gl=cv.getContext('webgl2',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true,antialias:true});if(!g)return false;
    const sh=(t,src)=>{const o=g.createShader(t);g.shaderSource(o,src);g.compileShader(o);if(!g.getShaderParameter(o,g.COMPILE_STATUS))Log.warn('preview shader: '+g.getShaderInfoLog(o));return o;};
    const vs=`#version 300 es
layout(location=0) in vec3 aP;layout(location=1) in vec3 aN;layout(location=2) in vec3 aC;layout(location=4) in float aM;uniform mat4 uVP,uM;out vec3 vN;out vec3 vC;out vec3 vW;flat out float vMt;
void main(){vec4 w=uM*vec4(aP,1.);vW=w.xyz;vN=mat3(uM)*aN;vC=aC;vMt=aM;gl_Position=uVP*w;}`;
    const fs=`#version 300 es
precision highp float;in vec3 vN;in vec3 vC;in vec3 vW;flat in float vMt;uniform vec3 uEye;out vec4 o;
void main(){if(vMt>11.5&&vMt<12.5)discard;vec3 N=normalize(vN),V=normalize(uEye-vW);if(dot(N,V)<0.)N=-N;vec3 L=normalize(vec3(0.45,0.8,0.35)),H=normalize(L+V);
  float d=max(dot(N,L),0.),hemi=0.5+0.5*N.y,sp=vMt>9.5&&vMt<10.5?pow(max(dot(N,H),0.),60.)*1.4:vMt>10.5&&vMt<11.5?pow(max(dot(N,H),0.),40.)*0.45:vMt>12.5?pow(max(dot(N,H),0.),80.)*1.2:pow(max(dot(N,H),0.),12.)*0.08;
  vec3 c=vC*vC;vec3 col=c*(d*vec3(1.,0.96,0.9)*1.15+mix(vec3(0.16,0.13,0.1),vec3(0.3,0.36,0.45),hemi))+sp*vec3(1.);float fr=pow(1.-max(dot(N,V),0.),4.)*0.15;col+=fr*vec3(0.6,0.7,0.85);
  if(vMt>12.5){col=mix(vec3(0.04,0.06,0.08),vec3(0.45,0.55,0.65),fr*3.)+sp;}o=vec4(sqrt(col),1.);}`;
    const p=g.createProgram();g.attachShader(p,sh(g.VERTEX_SHADER,vs));g.attachShader(p,sh(g.FRAGMENT_SHADER,fs));g.linkProgram(p);this.prog=p;return true;},
  up(M){const g=this.gl,vao=g.createVertexArray();g.bindVertexArray(vao);const vb=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,vb);g.bufferData(g.ARRAY_BUFFER,new Float32Array(M.v),g.STATIC_DRAW);
    [[0,3,0],[1,3,12],[2,3,24],[4,1,52]].forEach(([l,n,o])=>{g.enableVertexAttribArray(l);g.vertexAttribPointer(l,n,g.FLOAT,false,56,o);});const ib=g.createBuffer();g.bindBuffer(g.ELEMENT_ARRAY_BUFFER,ib);g.bufferData(g.ELEMENT_ARRAY_BUFFER,new Uint32Array(M.i),g.STATIC_DRAW);g.bindVertexArray(null);
    let b0=[1e9,1e9,1e9],b1=[-1e9,-1e9,-1e9];for(let k=0;k<M.n;k++)for(let a=0;a<3;a++){const v=M.v[k*14+a];if(v<b0[a])b0[a]=v;if(v>b1[a])b1[a]=v;}return{vao,count:M.i.length,b0,b1};},
  /* the parts of each model with their offsets (translation only), as they stand in the game */
  build(id){if(this.cache.has(id))return this.cache.get(id);const P=[],T=(m,o)=>P.push({m:this.up(m),o:o||[0,0,0]});
    if(id==='beaver'){const L=beaverMeshes(),pp=BEAVER_PARTS,at=n=>L[pp[n].i];T(at('body'));T(at('prop'),[PLB.propX,0.02,0]);T(at('pilot'));T(at('pax'));
      for(const n of ['elev','rud','ailL','ailR','flapL','flapR'])T(at(n),pp[n].o);const nh=PLB.noseHinge,mh=PLB.mainHinge;T(at('noseL'),[nh[0],nh[1],-nh[2]]);T(at('noseR'),nh);T(at('mainL'),[mh[0],mh[1],-mh[2]]);T(at('mainR'),mh);}
    else if(id==='heli'){const L=heliMeshes(),pp=HELI_PARTS,at=n=>L[pp[n].i];for(const n of ['body','glass','pilot','door','nav','beacon'])T(at(n));T(at('hub'),PLH.hub);for(const sd of [-1,1])T(at('mainWheel'),[-0.95,-0.96,sd*1.14]);T(at('noseFork'),[2.88,-0.79,0]);T(at('noseWheel'),[2.94,-1.02,0]);}
    else if(id==='dd'){const S=RV.dd,W=[0.06,0.06,0.07];T(RVMesh.bus(2));for(const sd of [-1,1]){T(RVMesh.wheel(S.r,W,sd,false),[S.axF,S.r,sd*S.trF]);S.trR.forEach(t=>T(RVMesh.wheel(S.r,W,sd,false),[S.axR,S.r,sd*t]));}}
    else if(id==='loco01'){T(loco01Mesh());const t=tender01Mesh();T(t,[-(VEH.loco01.len/2+COUPLE+VEH.tender01.len/2),0,0]);}
    let b0=[1e9,1e9,1e9],b1=[-1e9,-1e9,-1e9];for(const q of P)for(let a=0;a<3;a++){b0[a]=Math.min(b0[a],q.m.b0[a]+q.o[a]);b1[a]=Math.max(b1[a],q.m.b1[a]+q.o[a]);}
    const r={P,c:[(b0[0]+b1[0])/2,(b0[1]+b1[1])/2,(b0[2]+b1[2])/2],R:Math.hypot(b1[0]-b0[0],b1[1]-b0[1],b1[2]-b0[2])/2,b0,b1};this.cache.set(id,r);return r;},
  /* one frame into a card's 2D canvas */
  draw(id,dst,yaw,pitch){if(!this.init())return;const g=this.gl,cv=this.cv,W=dst.width,H=dst.height;if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}const S=this.build(id);
    g.viewport(0,0,W,H);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);g.enable(g.DEPTH_TEST);g.disable(g.CULL_FACE);g.useProgram(this.prog);
    const d=S.R*(id==="beaver"?1.55:1.75),eye=[S.c[0]+Math.sin(yaw)*Math.cos(pitch)*d,S.c[1]+Math.sin(pitch)*d,S.c[2]+Math.cos(yaw)*Math.cos(pitch)*d],asp=W/H,f=1/Math.tan(0.42),n=0.2,fa=d*4;
    const z=[eye[0]-S.c[0],eye[1]-S.c[1],eye[2]-S.c[2]],zl=Math.hypot(...z),Z=z.map(v=>v/zl),X0=[Z[2],0,-Z[0]],xl=Math.hypot(...X0)||1,X=X0.map(v=>v/xl),Y=[Z[1]*X[2]-Z[2]*X[1],Z[2]*X[0]-Z[0]*X[2],Z[0]*X[1]-Z[1]*X[0]];
    const V=[X[0],Y[0],Z[0],0,X[1],Y[1],Z[1],0,X[2],Y[2],Z[2],0,-(X[0]*eye[0]+X[1]*eye[1]+X[2]*eye[2]),-(Y[0]*eye[0]+Y[1]*eye[1]+Y[2]*eye[2]),-(Z[0]*eye[0]+Z[1]*eye[1]+Z[2]*eye[2]),1],
      Pm=[f/asp,0,0,0,0,f,0,0,0,0,(fa+n)/(n-fa),-1,0,0,2*fa*n/(n-fa),0],VP=new Array(16);for(let i=0;i<4;i++)for(let j=0;j<4;j++){let a=0;for(let k=0;k<4;k++)a+=Pm[k*4+j]*V[i*4+k];VP[i*4+j]=a;}
    g.uniformMatrix4fv(g.getUniformLocation(this.prog,'uVP'),false,new Float32Array(VP));g.uniform3fv(g.getUniformLocation(this.prog,'uEye'),eye);const uM=g.getUniformLocation(this.prog,'uM');
    for(const q of S.P){g.uniformMatrix4fv(uM,false,new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,q.o[0],q.o[1],q.o[2],1]));g.bindVertexArray(q.m.vao);g.drawElements(g.TRIANGLES,q.m.count,g.UNSIGNED_INT,0);}
    const c2=dst.getContext('2d');c2.clearRect(0,0,W,H);/* a soft shadow on the floor under it */const gr=c2.createRadialGradient(W/2,H*0.8,4,W/2,H*0.8,W*0.42);gr.addColorStop(0,'rgba(0,0,0,0.38)');gr.addColorStop(1,'rgba(0,0,0,0)');c2.fillStyle=gr;c2.beginPath();c2.ellipse(W/2,H*0.8,W*0.42,H*0.09,0,0,6.283);c2.fill();c2.drawImage(cv,0,0);}};
const Store={el:null,raf:0,
  ITEMS:[{id:'heli',name:'Rescue helicopter',sub:'Twin-engine, with a rescue winch',price:600000,specs:['Hovers and lands on helipads','A helipad at every airfield','Rescue and supply missions'],desc:'The orange rescue helicopter with a winch over its sliding door. Helipads come with it at your airfields; take missions there: injured hikers on mountain slopes, people in the water, supplies for lighthouses and villages. Paid when done.'},
    {id:'beaver',name:'DHC-2 Beaver',sub:'Amphibian bush plane',price:450000,specs:['Floats and retractable wheels','Lakes, the sea and airstrips','Seaplane jetties for cargo'],desc:'The de Havilland Canada bush plane on amphibious floats: it lands on water as well as on airstrips, with wheels that fold into the floats. Villages on open water can then build a seaplane jetty. Choose it whenever you fly.'},
    {id:'loco01',name:'DB class 01 Pacific',sub:'Express locomotive 01 118',price:350000,specs:['4-6-2 Pacific with tender','35% more pulling power','Faster on long lines'],desc:'The German express steam locomotive in black and red, with full Walschaerts valve gear. After buying, pick it for any train in the train editor.'},
    {id:'dd',name:'Double-decker',sub:'1930s bus',price:300000,specs:['60 seats instead of 24','For busy town routes','€ 55.000 per bus'],desc:'The 1930s double-decker bus, for busy routes between towns. After this, a new bus can be bought as a double-decker.'}],
  open(){let p=this.el;if(!p){p=this.el=document.createElement('div');p.id='storePage';document.body.appendChild(p);p.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;if(b.dataset.a==='x')this.close();else if(b.dataset.a==='buy')this.buy(b.dataset.id);});}
    p.hidden=false;document.body.classList.add('storeOpen');this.refresh();this.spin();},
  close(){if(this.el)this.el.hidden=true;document.body.classList.remove('storeOpen');cancelAnimationFrame(this.raf);this.raf=0;},
  buy(id){const it=this.ITEMS.find(q=>q.id===id);if(!it||Fleet.unlocks[id])return;if(Money.on()){if(Money.cash<it.price){UI.toast(`Not enough money: ${it.name} costs ${fmtE(it.price)}`);return;}Money.spend(it.price,it.name);}
    Fleet.unlocks[id]=true;if(id==='heli')Rescue.resetPads();UI.toast(id==='heli'?'The rescue helicopter is yours: a helipad now stands at each airfield. Tap an airfield for missions, or Fly → Rescue helicopter':id==='beaver'?'The Beaver is yours: tap Fly and choose it. Villages on open water now offer a seaplane jetty':id==='loco01'?'The 01 118 is yours: choose it for a train in the train editor':`${it.name} bought: choose it when you add a bus`);if(id==='beaver')for(const v of Life.villages)v._jsp=undefined;this.refresh();},
  refresh(){const p=this.el;if(!p)return;p.innerHTML=`<div class="sp-h"><div><b>Store</b><span>${Money.on()?'You have '+fmtE(Money.cash):'upgrades and purchases'}</span></div><button data-a="x" aria-label="Close the store">✕</button></div><div class="sp-g">`+
      this.ITEMS.map(it=>{const own=!!Fleet.unlocks[it.id];return`<div class="sp-c${own?' own':''}"><canvas data-pv="${it.id}" width="560" height="340"></canvas><div class="sp-t"><b>${it.name}</b><span>${it.sub}</span></div><ul>${it.specs.map(s=>`<li>${s}</li>`).join('')}</ul><p>${it.desc}</p>
        <div class="sp-f">${own?'<em>Owned</em>':`<button data-a="buy" data-id="${it.id}" class="go">Buy · ${fmtE(it.price)}</button>`}</div></div>`;}).join('')+`</div><div class="sp-n">More upgrades will come here.</div>`;
    for(const cv of p.querySelectorAll('canvas[data-pv]')){const st=cv._st={yaw:0.7,pitch:0.28,drag:null,t:0};cv.onpointerdown=e=>{st.drag=[e.clientX,e.clientY];cv.setPointerCapture(e.pointerId);};cv.onpointermove=e=>{if(!st.drag)return;st.yaw-=(e.clientX-st.drag[0])*0.01;st.pitch=clamp(st.pitch+(e.clientY-st.drag[1])*0.006,-0.1,1.2);st.drag=[e.clientX,e.clientY];st.t=performance.now();};cv.onpointerup=cv.onpointercancel=()=>{st.drag=null;};}},
  /* the previews turn slowly (not while being dragged, and not for 3 s after) */
  spin(){cancelAnimationFrame(this.raf);let last=performance.now();const tick=ts=>{if(!this.el||this.el.hidden)return;const dt=Math.min(0.1,(ts-last)/1000);last=ts;
      for(const cv of this.el.querySelectorAll('canvas[data-pv]')){const st=cv._st;if(!st)continue;if(!st.drag&&ts-st.t>3000)st.yaw+=dt*0.35;try{Preview.draw(cv.dataset.pv,cv,st.yaw,st.pitch);}catch(e){if(!this._err){this._err=1;Log.warn('store preview: '+(e.stack||e));}}}this.raf=requestAnimationFrame(tick);};this.raf=requestAnimationFrame(tick);}};
