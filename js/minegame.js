'use strict';
// ===== minegame.js
// ===================================================================
// THE MINE, PART 2 (4.64.0; the user: "In the mine, have the mine shown from above, where the roof is transparent, as with isometric games,
// so you control the drill from above. Add more gameplay elements." Chosen: hard rock & drill upgrades, cave-ins & supports, water & pumps,
// finds & caverns; ore goes out in mine carts on rails; a cut-away view).
//
// View: an isometric camera looking down at ~55°; everything above the drill's level + 3.3 m (between the tunnel's walls and its arch) is cut away and the cut is capped with a
//   slice of the rock (Mine.slice): the rock's material shows on it (coal seams black, iron rust, quartz white, the mine's ore glinting),
//   the tunnels are holes in it, and tunnels lower down show faintly through it. Hidden finds near the cut glint on it. 📷 cycles the view:
//   from above, behind the drill, the cab.
// Hard rock & bits: every material has a hardness (sandstone 1, shale 1.3, granite 2.2 deep down, coal 0.7, iron ore 1.6, the mine's
//   ore 1.9, quartz lenses 4, rubble 0.5). The drill cuts at 0.55 m/s × bit / hardness and the bit wears with what it cuts; a blunt bit
//   cuts at a quarter. At the lift (the gallery mouth) the 🔧 panel sharpens it or fits a steel (×1.6, lasts 2.2×) or diamond-tipped
//   (×2.6, lasts 5×) bit.
// Cave-ins & supports: tunnel you cut (not the timbered gallery) is unsupported. 🪵 places a timber set with a lantern at the drill's back
//   (€300). Unsupported roof more than ~6 m from a set, after a minute, can start to creak (dust trickles, a warning for 15 s); then it
//   comes down: a heap of rubble fills the tunnel there (it drills easily but yields nothing). Soft sandstone and coal fall in most,
//   granite hardly.
// Water & pumps: below about 9 m under the gallery the rock holds water pockets; cutting into one starts a spring. The water fills the
//   lowest tunnels first (the volume of every tunnel cell, level by level). Deep in water the drill slows, and with the firebox flooded it
//   can only back out. ⛽ sets a steam pump (€6 000) at the drill: it pumps while the water reaches its intake.
// Finds & caverns: two or three natural caverns lie in the rock (one with an underground lake, all with stalactites and stalagmites):
//   breaking into one opens it (and pays a discovery bonus). Seven finds (fossils, an old lamp, a pocket watch, a strongbox, a bone) are
//   buried; cutting through one pays and lists it under 📜.
// Carts on rails: the drill's hopper holds 40 units; whatever it cuts goes into it (and spills when it is full). 🛤 lays rails behind the
//   drill as it drives (€40 a metre), joined to the nearest rail. Carts run on the rails between the lift and the drill: they fill from
//   the hopper and at the lift their load is sold and goes into the mine station's stock. The drill also unloads itself at the lift.
// ===================================================================
Object.assign(Mine,{
  BITS:{iron:{name:'Iron bit',f:1,dur:1,price:0},steel:{name:'Steel bit',f:1.6,dur:2.2,price:40000},diamond:{name:'Diamond-tipped bit',f:2.6,dur:5,price:120000}},
  HOP:40,CART:12,LIFT:[64,28,4],
  FINDS:[['ammonite','🐚','an ammonite fossil',4000],['trilobite','🪲','a trilobite fossil',6000],['fern','🌿','a fossil fern',3000],['lamp','🏮',"an old miner's lamp",2500],['watch','⌚','a silver pocket watch',8000],['strongbox','🧰',"a lost miner's strongbox",20000],['bone','🦴','a giant fossil bone',12000]],
  hardOf(m,j){return m===1?0.7:m===2?1.6:m===3?1.9:m===4?4:m===5?0.5:j<this.FLOOR-10?2.2:j<this.FLOOR-2?1.3:1;},
  aquifer(i,j,k){return j<this.FLOOR-9&&this.n3(i/16,j/12,k/16,(this.mseed|0)+77)>0.63;},
  // ---------------------------------------------------------------- setting up a mine's game state
  initGame(sv){const g=Object.assign({bit:'iron',wear:0,hop:{},rails:[],pumps:[],V:0,inflow:0,finds:[],cav:[],rubble:[],cuts:[],lay:false},sv&&sv.g||{});this.g=g;this.view=this.view||'iso';
    const seed=this.mseed|0,R=(a)=>{const v=Math.sin(seed*0.137+a*12.9898)*43758.5453;return v-Math.floor(v);},{NX,NZ,FLOOR,GX}=this;
    // the caverns (deterministic per mine)
    this.caves=[];for(let c=0;c<3&&this.caves.length<(R(1)<0.5?2:3);c++){for(let t=0;t<20;t++){const x=14+R(c*31+t)*(NX-28),z=20+R(c*47+t+5)*(NZ-34),y=8+R(c*13+t+9)*(FLOOR-6);if(Math.abs(x-GX)<14&&z<50)continue;if(this.caves.some(q=>Math.hypot(q.c[0]-x,q.c[2]-z)<30))continue;
        this.caves.push({id:c,c:[x,y,z],r:[7+R(c*3+t)*5,3.6+R(c*5+t)*1.8,6+R(c*7+t)*5],a:R(c*11+t)*3.14,lake:c===0,open:g.cav.includes(c)});break;}}
    // the finds
    this.findList=this.FINDS.map((f,i)=>({id:i,type:f[0],icon:f[1],name:f[2],pay:f[3],p:[10+R(i*17+3)*(NX-20),6+R(i*19+7)*(FLOOR-2),14+R(i*23+11)*(NZ-24)],got:g.finds.includes(i)}));
    // the air in each level (for the water), the rubble's material
    this.airJ=new Int32Array(this.NY);for(let q=0;q<this.D.length;q++)if(this.D[q]<128)this.airJ[((q/NX)|0)%this.NY]++;
    for(const [x,y,z,r] of g.rubble)this.eachIn(x,y,z,r,(q)=>{if(this.D[q]>=128)this.MAT[q]=5;});
    for(const cv of this.caves)if(cv.open)this.caveProps(cv);
    this.railBuild();this.carts=[];const nC=Math.min(5,2+Math.floor(this.railLen()/60));for(let i=0;i<nC;i++)this.carts.push({at:0,path:null,s:i*-6,load:{},n:0,st:'lift',t:i*4,p:this.LIFT.slice(),h:Math.PI/2});
    this.sliceKey='';this.waterKey='';this.camT=null;this.warn=null;this.lastCut=null;this.blunt=false;this.full=false;},
  eachIn(x,y,z,r,f){const {NX,NY,NZ}=this;for(let k=Math.max(0,Math.floor(z-r));k<=Math.min(NZ-1,Math.ceil(z+r));k++)for(let j=Math.max(0,Math.floor(y-r));j<=Math.min(NY-1,Math.ceil(y+r));j++)for(let i=Math.max(0,Math.floor(x-r));i<=Math.min(NX-1,Math.ceil(x+r));i++)if(Math.hypot(i-x,j-y,k-z)<=r)f(i+NX*(j+NY*k),i,j,k);},
  saveGame(){const g=this.g;if(!g)return null;g.cuts=g.cuts.slice(-300);return{bit:g.bit,wear:+g.wear.toFixed(3),hop:g.hop,rails:g.rails.map(l=>l.map(p=>p.map(v=>+v.toFixed(2)))),pumps:g.pumps,V:+g.V.toFixed(1),inflow:+g.inflow.toFixed(3),finds:g.finds,cav:g.cav,rubble:g.rubble,cuts:g.cuts.map(c=>c.map(v=>+v.toFixed(1)))};},
  // ---------------------------------------------------------------- drilling
  drillRate(){const B=this.BITS[this.g.bit]||this.BITS.iron,H=this.Heff||1,blunt=this.g.wear>=1;return 0.55*B.f/H*(blunt?0.25:1)*this.waterSlow();},
  /* after each slab: hardness and wear, ore into the hopper, finds, caverns, springs, the cut for the cave-in check */
  afterCut(got,p){const g=this.g,B=this.BITS[g.bit]||this.BITS.iron;if(got.n){const h=got.H/got.n;this.Heff=(this.Heff||1)*0.6+h*0.4;g.wear=Math.min(1,g.wear+got.H*0.00025/B.dur);
      if(g.wear>=1&&!this.blunt){this.blunt=true;UI.toast('The drill bit is blunt: it cuts slowly now. Sharpen or replace it at the lift (🔧)');}}
    if(got.aq){const was=g.inflow;g.inflow=Math.min(3,g.inflow+got.aq*0.012);if(was<0.01)UI.toast('💧 You cut into a water pocket: water is running into the mine. Set a pump (⛽) in the lowest part');}
    this.gain(got,p);
    for(const f of this.findList)if(!f.got&&this.dens(f.p[0],f.p[1],f.p[2])<128){f.got=true;g.finds.push(f.id);if(Money.on())Money.earn(f.pay,`Find: ${f.name}`,this.m.x,0,this.m.z);this.tot.eur=(this.tot.eur||0)+f.pay;UI.toast(`${f.icon} You found ${f.name}! (€ ${Money.fmt?Money.fmt(f.pay):f.pay}, listed under 📜)`);}
    for(const cv of this.caves)if(!cv.open&&this.caveF(cv,p[0],p[1]+2,p[2])<1.7)this.openCave(cv);
    const lc=this.lastCut;if(!lc||Math.hypot(p[0]-lc[0],p[1]-lc[1],p[2]-lc[2])>1.5){this.lastCut=p.slice();if(this.freshTunnel(p[0],p[1],p[2]))g.cuts.push([p[0],p[1],p[2],this.t]);}},
  gain(got,p){const g=this.g;let any=false;for(const k in got){const mat=+k;if(!(mat>=1&&mat<=3))continue;any=true;const t=this.oreOf(mat);this.acc[t]=(this.acc[t]||0)+got[k]*this.YIELD[mat];
      if(this.seam!==t){this.seam=t;this.seamT=this.t;UI.toast(`${ORE[t].icon} You struck ${t==='coal'?'a coal seam':t==='iron'?'iron ore':'a vein of '+ORE[t].name.toLowerCase()}!`);}}
    if(!any&&this.seam&&this.t-(this.seamT||0)>3)this.seam='';
    for(const t in this.acc){const n=Math.floor(this.acc[t]);if(n<1)continue;this.acc[t]-=n;const room=this.HOP-this.hopN();const take=Math.min(n,room);if(take>0)g.hop[t]=(g.hop[t]||0)+take;
      if(take<n&&!this.full){this.full=true;UI.toast('The hopper is full: ore spills. Lay rails (🛤) to the face so carts can take it, or drive back to the lift');}if(take>=n)this.full=false;}},
  hopN(){let n=0;for(const t in this.g.hop)n+=this.g.hop[t];return n;},
  /* at the lift: sold, and into the mine station's stock */
  sell(load,who){let pay=0;const parts=[];for(const t in load){const n=Math.floor(load[t]);if(n<1)continue;this.tot[t]=(this.tot[t]||0)+n;pay+=n*(this.PRICE[t]||40);parts.push(`${n} ${ORE[t].icon}`);
      const sts=Track.stations.filter(st=>st.mine&&Crane.ind('mine',st.mine)===this.m);if(sts.length){const S=Goods.get('st:'+sts[0].id);S[t]=Math.min(150,(S[t]||0)+n);}else this.m.dug=(this.m.dug||0)+n;load[t]-=n;}
    if(pay>0){if(Money.on())Money.earn(pay,`${this.m.v.name} mine${who?' ('+who+')':''}: ${parts.join(' ')}`,this.m.x,0,this.m.z);this.tot.eur=(this.tot.eur||0)+pay;}return pay;},
  // ---------------------------------------------------------------- caverns
  caveF(cv,x,y,z){const c=Math.cos(cv.a),s=Math.sin(cv.a),dx=x-cv.c[0],dz=z-cv.c[2],u=dx*c+dz*s,w=-dx*s+dz*c;return(u/cv.r[0])**2+((y-cv.c[1])/cv.r[1])**2+(w/cv.r[2])**2;},
  openCave(cv){cv.open=true;if(!this.g.cav.includes(cv.id))this.g.cav.push(cv.id);const R=Math.max(...cv.r)+1;let n=0;
    this.eachIn(cv.c[0],cv.c[1],cv.c[2],R,(q,i,j,k)=>{const f=this.caveF(cv,i,j,k)+(this.n3(i/4,j/3,k/4,(this.mseed|0)+91)-0.5)*0.5;if(f<1){const nv=Math.max(0,Math.round(128-(1-f)*500));if(nv<this.D[q]){if(this.D[q]>=128&&nv<128){this.airJ[j]++;n++;}this.D[q]=nv;this.dirty.add((i>>4)|((j>>4)<<4)|((k>>4)<<8));}}});
    this.remesh(false);this.caveProps(cv);this.rebuildProps();this.sliceKey='';const bonus=5000;if(Money.on())Money.earn(bonus,'Discovered a cavern',this.m.x,0,this.m.z);this.tot.eur=(this.tot.eur||0)+bonus;
    UI.toast(`🕳️ You broke into a natural cavern${cv.lake?' with an underground lake':''}! (€ 5.000)`);Log.info(`mine: cavern ${cv.id} opened, ${n} m³`);},
  /* stalactites from the roof, stalagmites from the floor (deterministic) */
  caveProps(cv){let s=(this.mseed|0)*31+cv.id*977;const rnd=()=>{s=(s*16807)%2147483647;return s/2147483647;};
    for(let k=0;k<26;k++){const a=rnd()*6.283,rr=Math.sqrt(rnd())*0.8,c=Math.cos(cv.a),sn=Math.sin(cv.a),u=Math.cos(a)*rr*cv.r[0],w=Math.sin(a)*rr*cv.r[2],x=cv.c[0]+u*c-w*sn,z=cv.c[2]+u*sn+w*c;
      let top=null,bot=null;for(let y=cv.c[1];y<cv.c[1]+cv.r[1]+2;y+=0.25)if(this.dens(x,y,z)>=128){top=y;break;}for(let y=cv.c[1];y>cv.c[1]-cv.r[1]-2;y-=0.25)if(this.dens(x,y,z)>=128){bot=y;break;}
      if(top!=null&&k%2===0)this.propList.push({t:'stal',p:[x,top+0.2,z],h:rnd()*6.28,s:0.5+rnd()*1.3,cave:1});if(bot!=null&&k%2===1)this.propList.push({t:'stag',p:[x,bot-0.1,z],h:rnd()*6.28,s:0.4+rnd()*1.1,cave:1});}
    if(cv.lake){let low=cv.c[1];for(let y=cv.c[1];y>cv.c[1]-cv.r[1]-2;y-=0.2)if(this.dens(cv.c[0],y,cv.c[2])>=128){low=y;break;}cv.lakeY=low+1.1;}},
  // ---------------------------------------------------------------- the per-second simulation: water, cave-ins, carts
  sim(dt){const g=this.g;
    // water: the springs fill the mine, the pumps empty it; the level is where that volume of tunnel fills up from the bottom
    let out=0;const L=this.waterLevel();for(const pp of g.pumps)if(L>pp[1]-0.3)out+=0.8;g.V=Math.max(0,g.V+(g.inflow-out)*dt);
    this.pumpOn=out>0;
    // cave-ins
    this.caveT=(this.caveT||0)+dt;if(this.caveT>1){this.caveT=0;this.caveCheck();}
    if(this.warn){const w=this.warn;w.t-=dt;if(this.supported(w.p)){UI.toast('The support holds the roof');this.warn=null;}else{if(Math.random()<dt*6)this.puff('dust',[w.p[0]+(Math.random()-0.5)*3,w.p[1]+4.2,w.p[2]+(Math.random()-0.5)*3],[0,-0.6,0],2.5,0.4);if(w.t<=0){this.collapse(w.p);this.warn=null;}}}
    this.cartStep(dt);
    // the drill at the lift: unload the hopper
    const d=this.dr;if(Math.hypot(d.x-this.LIFT[0],d.z-this.LIFT[2])<9&&this.hopN()>=1){this.sell(this.g.hop,'drill');}},
  waterLevel(){const g=this.g;if(!g||g.V<0.5)return -1;let v=g.V;for(let j=0;j<this.NY;j++){const a=this.airJ[j];if(v<=a)return j+(a?v/a:0)-0.5;v-=a;}return this.NY;},
  waterSlow(){const L=this.waterLevel(),dp=L-this.dr.y;return dp<0.4?1:dp<1.6?0.45:0.12;},
  supported(p){for(const q of this.propList)if(q.t==='set'&&Math.hypot(q.p[0]-p[0],q.p[2]-p[2])<6&&Math.abs(q.p[1]-p[1])<3)return true;return!this.freshTunnel(p[0],p[1],p[2]);},
  caveCheck(){if(this.warn)return;const g=this.g,d=this.dr;for(const c of g.cuts){if(this.t-c[3]<60)continue;const p=[c[0],c[1],c[2]];if(this.supported(p))continue;if(Math.hypot(p[0]-d.x,p[2]-d.z)<6)continue;
      const q=Math.floor(p[0])+this.NX*(Math.min(this.NY-1,Math.floor(p[1]+5))+this.NY*Math.floor(p[2])),m=this.matAt(q),j=Math.floor(p[1]+5),k=m===1?1.6:m===4?0.2:j<this.FLOOR-10?0.25:j<this.FLOOR-2?0.8:1.4;
      if(Math.random()<0.0035*k){this.warn={p,t:15};UI.toast('⚠ The roof is creaking in an unsupported stretch! Place a support (🪵) there within 15 s, or it comes down');return;}}},
  collapse(p){const r=2.6,cx=p[0],cy=p[1]+2.4,cz=p[2];this.g.rubble.push([+cx.toFixed(1),+cy.toFixed(1),+cz.toFixed(1),r]);
    this.eachIn(cx,cy,cz,r+0.6,(q,i,j,k)=>{const e=r+(this.n3(i/2,j/2,k/2,(this.mseed|0)+5)-0.5)*1.2-Math.hypot(i-cx,j-cy,k-cz);if(e<=0)return;const nv=Math.min(255,Math.round(128+e*90));if(nv>this.D[q]){if(this.D[q]<128&&nv>=128){this.airJ[j]=Math.max(0,this.airJ[j]-1);this.MAT[q]=5;}this.D[q]=nv;this.dirty.add((i>>4)|((j>>4)<<4)|((k>>4)<<8));}});
    this.g.cuts=this.g.cuts.filter(c=>Math.hypot(c[0]-cx,c[2]-cz)>4);this.remesh(false);this.sliceKey='';for(let k=0;k<40;k++)this.puff('dust',[cx+(Math.random()-0.5)*5,cy+Math.random()*2,cz+(Math.random()-0.5)*5],[(Math.random()-0.5)*2,0.2,(Math.random()-0.5)*2],5,1);
    UI.toast('💥 Cave-in! Rubble blocks the tunnel there: drill through it, and support the roof');Log.info(`mine: cave-in at ${cx.toFixed(0)},${cy.toFixed(0)},${cz.toFixed(0)}`);},
  // ---------------------------------------------------------------- building: supports, pumps, rails
  placeSupport(){const d=this.dr,bx=d.x-Math.cos(d.h)*4.6,bz=d.z-Math.sin(d.h)*4.6,y=this.floorAt(bx,bz,d.y)??d.y;if(this.dens(bx,y+1.5,bz)>=128){UI.toast('No room for a support behind the drill');return;}
    if(Money.on()){if(Money.cash<300){UI.toast('Out of money');return;}Money.spend(300,'mine support');}this.propList.push({t:'set',p:[bx,y,bz],h:d.h,dug:1},{t:'lamp',p:[bx,y,bz],h:d.h,dug:1});this.rebuildProps();if(this.warn&&this.supported(this.warn.p)){this.warn=null;UI.toast('The support holds the roof');}},
  placePump(){const d=this.dr,bx=d.x-Math.cos(d.h)*5,bz=d.z-Math.sin(d.h)*5,y=this.floorAt(bx,bz,d.y)??d.y;if(Money.on()){if(Money.cash<6000){UI.toast('A pump costs € 6.000');return;}Money.spend(6000,'mine pump');}
    this.g.pumps.push([+bx.toFixed(2),+y.toFixed(2),+bz.toFixed(2)]);this.propList.push({t:'pump',p:[bx,y,bz],h:d.h,dug:1});this.rebuildProps();UI.toast('⛽ A steam pump stands here now: it pumps while the water reaches it');},
  toggleRails(){const g=this.g;g.lay=!g.lay;if(g.lay){const d=this.dr,bp=[d.x-Math.cos(d.h)*4.4,d.y,d.z-Math.sin(d.h)*4.4],n=this.railNear(bp,4);const L=[n?n.p.slice():bp];g.rails.push(L);this.layL=L;
      UI.toast(n?'🛤 Laying rails behind the drill (€ 40 a metre), joined to the line here':'🛤 Laying rails, but not joined to the line: start near existing rails so carts can reach it');}else{this.layL=null;UI.toast('Rails stopped');}this.hud(true);},
  layStep(){const g=this.g;if(!g.lay||!this.layL)return;const d=this.dr,bp=[d.x-Math.cos(d.h)*4.4,this.floorAt(d.x-Math.cos(d.h)*4.4,d.z-Math.sin(d.h)*4.4,d.y)??d.y,d.z-Math.sin(d.h)*4.4],L=this.layL,l=L[L.length-1];
    if(Math.hypot(bp[0]-l[0],bp[2]-l[2])>=1){if(Money.on()){if(Money.cash<40){g.lay=false;UI.toast('Out of money for rails');return;}Money.spend(40,'mine rails');}L.push(bp);if(L.length%3===0){this.railBuild();this.rebuildProps();}}},
  /* the rail graph: the gallery line (from the lift) and every laid line, points 1 m apart; line ends join the nearest point within 2.5 m */
  railBuild(){const lines=[[]];for(let z=this.LIFT[2];z<=34;z+=1)lines[0].push([this.GX,this.FLOOR,z]);for(const l of this.g.rails)if(l.length>1)lines.push(l);
    const N=[],E=[];const idx=[];lines.forEach((l,li)=>{idx[li]=[];l.forEach((p,i)=>{const n=N.length;N.push(p);E.push([]);idx[li].push(n);if(i>0){const a=n-1,dd=Math.hypot(p[0]-N[a][0],p[1]-N[a][1],p[2]-N[a][2]);E[a].push([n,dd]);E[n].push([a,dd]);}});});
    lines.forEach((l,li)=>{for(const end of [0,l.length-1]){if(!l.length)continue;const n=idx[li][end],p=N[n];let best=-1,bd=2.5;for(let m=0;m<N.length;m++){if(idx[li].includes(m))continue;const dd=Math.hypot(N[m][0]-p[0],N[m][1]-p[1],N[m][2]-p[2]);if(dd<bd){bd=dd;best=m;}}if(best>=0){E[n].push([best,bd]);E[best].push([n,bd]);}}});
    this.RG={N,E};this.railVer=(this.railVer|0)+1;
    // the rail props: a 2.5 m rail piece every 2.5 m along each line
    this.propList=this.propList.filter(q=>q.t!=='rail');for(const l of lines){let acc=1.25;for(let i=1;i<l.length;i++){const a=l[i-1],b=l[i],L=Math.hypot(b[0]-a[0],b[2]-a[2]);acc+=L;if(acc>=2.5){acc-=2.5;this.propList.push({t:'rail',p:[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2],h:Math.atan2(b[2]-a[2],b[0]-a[0])});}}}},
  railLen(){let L=0;for(const l of this.g.rails)for(let i=1;i<l.length;i++)L+=Math.hypot(l[i][0]-l[i-1][0],l[i][2]-l[i-1][2]);return L;},
  railNear(p,r){const G=this.RG;if(!G)return null;let best=null,bd=r;G.N.forEach((q,i)=>{const dd=Math.hypot(q[0]-p[0],q[2]-p[2]);if(dd<bd&&Math.abs(q[1]-p[1])<3){bd=dd;best={i,p:q};}});return best;},
  /* the shortest way over the rails from node a to node b (Dijkstra) */
  railPath(a,b){const G=this.RG,n=G.N.length,dist=new Float64Array(n).fill(1e18),pr=new Int32Array(n).fill(-1),done=new Uint8Array(n);dist[a]=0;
    for(;;){let u=-1,bd=1e18;for(let i=0;i<n;i++)if(!done[i]&&dist[i]<bd){bd=dist[i];u=i;}if(u<0||u===b)break;done[u]=1;for(const [v,w] of G.E[u])if(dist[u]+w<dist[v]){dist[v]=dist[u]+w;pr[v]=u;}}
    if(dist[b]>=1e17)return null;const P=[];for(let v=b;v>=0;v=pr[v]){P.push(G.N[v]);if(v===a)break;}return P.reverse();},
  /* the carts: lift → along the rails to the drill (when a rail end is within 7 m of it) → fill from the hopper → back → unload (sold) */
  cartStep(dt){const d=this.dr,G=this.RG;if(!G)return;const face=this.railNear([d.x-Math.cos(d.h)*4.4,d.y,d.z-Math.sin(d.h)*4.4],7);
    if(!this.cpath||this.cpath.ver!==this.railVer||!face||this.cpath.to!==face.i){this.cpath=face?{ver:this.railVer,to:face.i,P:this.railPath(0,face.i)}:null;}
    const P=this.cpath&&this.cpath.P;const len=P?P.reduce((a,p,i)=>i?a+Math.hypot(p[0]-P[i-1][0],p[1]-P[i-1][1],p[2]-P[i-1][2]):0,0):0;
    for(const c of this.carts){c.t-=dt;const cn=Object.values(c.load).reduce((a,b)=>a+b,0);
      if(c.st==='lift'){c.s=0;if(c.t<=0&&P&&P.length>1&&this.hopN()>=1&&!this.carts.some(o=>o!==c&&o.st==='out'&&o.s<8)){c.st='out';c.path=P;c.L=len;}}
      else if(c.st==='out'){c.s+=3*dt;if(c.path!==P||!P){c.st='back';}else if(c.s>=c.L-0.5){c.s=c.L;c.st='fill';c.t=0;}}
      else if(c.st==='fill'){c.t+=dt;const room=this.CART-cn;if(room>0.5&&this.hopN()>=1){for(const t in this.g.hop){const q=Math.min(this.g.hop[t],room,dt*8);this.g.hop[t]-=q;c.load[t]=(c.load[t]||0)+q;if(this.g.hop[t]<0.01)delete this.g.hop[t];break;}}
        if(cn>=this.CART-0.5||(c.t>25&&cn>=1)||(!P&&cn>=0)||c.path!==P){c.st='back';}}
      else if(c.st==='back'){c.s-=3*dt;if(c.s<=0){c.s=0;c.st='unload';c.t=1.5;}}
      else if(c.st==='unload'){if(c.t<=0){this.sell(c.load,'carts');c.load={};c.st='lift';c.t=2;}}
      const path=c.path&&c.path.length>1?c.path:[this.LIFT,[this.LIFT[0],this.LIFT[1],this.LIFT[2]+1]];let s=Math.max(0,c.s),i=1;for(;i<path.length;i++){const L=Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1],path[i][2]-path[i-1][2]);if(s<=L){const u=L?s/L:0;c.p=[path[i-1][0]+(path[i][0]-path[i-1][0])*u,path[i-1][1]+(path[i][1]-path[i-1][1])*u,path[i-1][2]+(path[i][2]-path[i-1][2])*u];c.h=Math.atan2(path[i][2]-path[i-1][2],path[i][0]-path[i-1][0]);break;}s-=L;}
      if(c.st==='lift'||c.st==='unload'){c.p=[this.LIFT[0]+((this.carts.indexOf(c)%2)?1.6:0)*0,this.LIFT[1],this.LIFT[2]+2+this.carts.indexOf(c)*2.2];c.h=Math.PI/2;}}},
  // ---------------------------------------------------------------- the slice textures: the cap of the cut-away, and water surfaces
  sliceTex(y,old){const {NX,NZ,NY}=this,A=new Uint8Array(NX*NZ*4),j0=Math.max(0,Math.min(NY-2,Math.floor(y))),f=Math.max(0,Math.min(1,y-j0));
    for(let k=0;k<NZ;k++)for(let i=0;i<NX;i++){const q0=i+NX*(j0+NY*k),q1=q0+NX,dd=this.D[q0]*(1-f)+this.D[q1]*f,o=(k*NX+i)*4;A[o]=Math.round(dd);A[o+1]=dd>=128?this.matAt(f<0.5?q0:q1)*40:0;A[o+2]=Math.round(255*(j0+f)/NY);A[o+3]=255;}
    const t=old||gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,NX,NZ,0,gl.RGBA,gl.UNSIGNED_BYTE,A);for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);return t;},
  initSlice(){if(this.sprog)return;this.sprog=makeProgram('mine-slice',`#version 300 es
precision highp float;layout(location=0) in vec2 aQ;uniform mat4 uVP;uniform float uY;uniform vec2 uN;out vec3 vW;
void main(){vW=vec3(aQ.x*uN.x,uY,aQ.y*uN.y);gl_Position=uVP*vec4(vW,1.);}`,`#version 300 es
precision highp float;in vec3 vW;out vec4 o;uniform sampler2D uS;uniform vec2 uN;uniform int uMode;uniform float uT;uniform vec4 uF[8];uniform vec3 uD;uniform vec3 uOre;
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n2(vec2 x){vec2 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
void main(){vec2 uv=(vW.xz+.5)/uN;if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.)discard;vec4 s=texture(uS,uv);float d=s.r*255.;
  if(uMode==1){/* water */if(d>=128.)discard;float r=n2(vW.xz*1.3+uT*.4)*.6+n2(vW.xz*3.1-uT*.7)*.4;vec3 c=mix(vec3(.02,.06,.07),vec3(.09,.2,.22),r);float dd=length(vW.xz-uD.xz);c+=vec3(.6,.45,.25)*.25/(1.+dd*dd*.02);o=vec4(c,.78);return;}
  if(d<128.)discard;int m=int(s.g*255./40.+.5);float t=s.b;vec3 c=t>.62?vec3(.46,.38,.29):t>.38?vec3(.26,.24,.23):vec3(.36,.33,.33);
  if(m==1)c=vec3(.16,.16,.18)+vec3(.35,.36,.4)*step(.9,h2(floor(vW.xz*5.)));/* coal: dark with glinting facets */else if(m==2)c=vec3(.42,.2,.12);else if(m==3)c=uOre;else if(m==4)c=vec3(.75,.73,.7);else if(m==5)c=vec3(.22,.2,.18);
  float k=n2(vW.xz*.9)*.5+n2(vW.xz*3.7)*.35+n2(vW.xz*11.)*.15;c*=.55+.7*k;
  /* the edge of the cut along the tunnels: a dark rim and a lit bevel */
  vec2 px=1./uN;float a=0.;for(int i=0;i<8;i++){float an=float(i)*.785;a+=step(texture(uS,uv+vec2(cos(an),sin(an))*px*1.2).r*255.,127.);}c*=1.-a*.07;
  if(m==3&&h2(floor(vW.xz*4.)+floor(uT*2.))>.93)c+=uOre*1.2;
  for(int i=0;i<8;i++){if(uF[i].w<=0.)continue;float dd=length(vW.xz-uF[i].xz);c+=vec3(1.,.8,.4)*uF[i].w*smoothstep(1.4,.0,dd)*(.6+.4*sin(uT*4.+float(i)));}
  float dl=length(vW.xz-uD.xz);c*=.55+.45/(1.+dl*dl*.0015);o=vec4(c*.9,.93);}`);
    this.sbuf=gl.createBuffer();this.svao=gl.createVertexArray();gl.bindVertexArray(this.svao);gl.bindBuffer(gl.ARRAY_BUFFER,this.sbuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,1,1,0,0,1,1,0,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,8,0);gl.bindVertexArray(null);},
  drawSlices(VP,cutY){this.initSlice();const p=this.sprog,d=this.dr;gl.useProgram(p.p);gl.uniformMatrix4fv(p.u('uVP'),false,VP);gl.uniform2f(p.u('uN'),this.NX,this.NZ);gl.uniform1f(p.u('uT'),this.t);gl.uniform3f(p.u('uD'),d.x,d.y,d.z);
    const O=(ORE[this.m.type]||ORE.gold).glint;gl.uniform3f(p.u('uOre'),O[0],O[1],O[2]);const F=new Float32Array(32);let n=0;for(const f of this.findList)if(!f.got&&Math.abs(f.p[1]-cutY)<3.5&&n<8){F.set([f.p[0],f.p[1],f.p[2],1-Math.abs(f.p[1]-cutY)/3.5],n*4);n++;}gl.uniform4fv(p.u('uF'),F);
    gl.activeTexture(gl.TEXTURE0+SCRATCH_TU);gl.uniform1i(p.u('uS'),SCRATCH_TU);gl.bindVertexArray(this.svao);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    const draw=(tex,y,mode)=>{gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1f(p.u('uY'),y);gl.uniform1i(p.u('uMode'),mode);gl.drawArrays(gl.TRIANGLES,0,6);};
    // water first (under the cap): the flood, and the lakes in opened caverns
    const L=this.waterLevel();if(L>0){const key=L.toFixed(2)+'|'+this.cutVer;if(key!==this.waterKey||!this.wtex){this.waterKey=key;this.wtex=this.sliceTex(L,this.wtex);}gl.depthMask(false);draw(this.wtex,L,1);}
    for(const cv of this.caves)if(cv.open&&cv.lake&&cv.lakeY&&!(L>cv.lakeY)){if(!cv.tex)cv.tex=this.sliceTex(cv.lakeY);gl.depthMask(false);draw(cv.tex,cv.lakeY,1);}
    gl.depthMask(true);if(cutY!=null){const key=cutY.toFixed(1)+'|'+this.cutVer;if(key!==this.sliceKey||!this.ctex){this.sliceKey=key;this.ctex=this.sliceTex(cutY,this.ctex);}draw(this.ctex,cutY,0);}
    gl.disable(gl.BLEND);gl.bindVertexArray(null);},
  // ---------------------------------------------------------------- panels
  panel(kind){let el=$('#mnPanel');if(!el){el=document.createElement('div');el.id='mnPanel';$('#mineUI').appendChild(el);el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const a=b.dataset.a;if(a==='x'){el.hidden=true;return;}
        if(a==='sharpen'||a==='steel'||a==='diamond'){const near=Math.hypot(this.dr.x-this.LIFT[0],this.dr.z-this.LIFT[2])<12;if(!near){UI.toast('Drive back to the lift (the gallery mouth) to change the bit');return;}const pr=a==='sharpen'?2000:this.BITS[a].price;if(Money.on()){if(Money.cash<pr){UI.toast('Not enough money');return;}Money.spend(pr,a==='sharpen'?'bit sharpened':this.BITS[a].name);}if(a!=='sharpen')this.g.bit=a;this.g.wear=0;this.blunt=false;UI.toast(a==='sharpen'?'The bit is sharp again':`${this.BITS[a].name} fitted`);this.panel('bit');}});}
    const g=this.g,B=this.BITS[g.bit];let h='';
    if(kind==='bit')h=`<div class="mp-h"><b>🔧 Drill bit</b><button data-a="x">✕</button></div><p>${B.name}: ${Math.round((1-g.wear)*100)} % sharp${g.wear>=1?' (blunt: it cuts at a quarter)':''}. Hard rock wears it faster: granite deep down and the white quartz lenses most of all.</p>
      <p>At the lift (the gallery mouth):</p><div class="mp-b"><button data-a="sharpen">Sharpen · € 2.000</button>${g.bit!=='steel'&&g.bit!=='diamond'?'<button data-a="steel">Steel bit · € 40.000<br><small>cuts 1.6× faster, lasts 2.2×</small></button>':''}${g.bit!=='diamond'?'<button data-a="diamond">Diamond-tipped · € 120.000<br><small>cuts 2.6× faster, lasts 5×</small></button>':''}</div>`;
    else{const got=this.findList.filter(f=>f.got);h=`<div class="mp-h"><b>📜 Finds</b><button data-a="x">✕</button></div>${got.length?'<ul>'+got.map(f=>`<li>${f.icon} ${f.name} · € ${Money.fmt?Money.fmt(f.pay):f.pay}</li>`).join('')+'</ul>':'<p>Nothing found yet.</p>'}<p>${got.length} of ${this.findList.length} finds · ${this.caves.filter(c=>c.open).length} of ${this.caves.length} caverns. Buried finds glint on the cut when you dig at their level.</p>`;}
    el.innerHTML=h;el.hidden=false;}});
