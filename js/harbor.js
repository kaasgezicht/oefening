'use strict';
// ===== harbor.js
// ===================================================================
// THE COAL & ORE HARBOUR (4.48.0, step 1 of 4: site plan and blockout). A compact Victorian harbour terminal from the user's brief:
// a passenger station with a clock tower and a train shed over two through tracks, a freight siding with a portal gantry over a
// receiving hopper, one inclined conveyor up to a belt along the quay, a travelling shiploader on two quay rails, warehouses, and a
// collier moored alongside. Every harbour town has a site reserved when the world is made (Port.find, after the coast); the town
// offers the harbour as an upgrade, and once bought the ground is levelled to the deck and the terminal stands there, partly over the
// water on foundations.
// Step 1 drew every structure as a block at its planned place and size (flat colours: the silhouette test of the brief); since 4.51 /
// 4.52 the buildings, machinery and collier are kit models (buildings/harbour.js, buildings/harbourworks.js). Steps:
// 2 the architecture and real tracks, 3 the moving coal handling, 4 the collier, shipping and coal / iron mines.
//
// THE DIMENSION SCHEDULE (the brief's CONFIG): one local frame per site. x along the quay (west → east, 0..120), y inland (north,
// 0 = the quay face, the land terminal 0..90, the water −40..0), z up from the deck (deck = sea level + PORT.deck). Every block below is
// [name, x0, x1, y0, y1, z0, z1, colour zone, shape]; shapes: box (default), gable (roof ridge along x), gableY (ridge along y), cyl.
//
// ASSUMPTIONS (the brief's log, v1):
//  1. No reference image: the layout follows the brief's text: station north (back), yard in the middle, coal handling west, quay south.
//  2. A travelling shiploader cannot sit at the end of one fixed inclined belt. The single belt rises from the hopper (18°) and then runs
//     level along the quay over the shiploader's whole travel; the shiploader carries a tripper that lifts the belt and drops the coal
//     into its transfer hopper. It is still one continuous belt from hopper to shiploader.
//  3. The gantry is static; its crab travels across the siding (along y) between a wagon and the hopper, which stands beside the siding
//     under the gantry beam.
//  4. The freight siding is a separate track entering from the west (no switch on site); the two passenger tracks run straight through
//     the whole site so the player's lines join them at both ends (x 0 and x 120).
//  7. Only on the open sea: water at least 4 m deep joined to the map edge (never a lake, a closed basin, or a bay behind shallows):
//     the berth and the water 40 m out must be such sea.
//  5. The back of the site (y ≥ 50: tracks, station) is at least 70 % land, joined over land to its town; the quay side may stand
//     over the water. The deck stands 3 m above the sea. Ground higher than that is cut down to the deck; where it is lower the deck stands on
//     foundations (blocks now; brick piers and timber stilts in step 2).
//  6. The collier is 45 × 9 m, 2 m off the quay; three hatches at x 44, 53, 62; bridge and funnel aft. The shiploader travels x 44..62
//     (all three hatches) and is modelled over the first one.
// ===================================================================
const PORT={W:120,D:90,water:40,deck:3,quayW:15,cost:150000,shipCap:400,
  ship:{x0:37.5,x1:82.5,y0:-11,y1:-2,hatch:[44,53,62]},loader:{x:44,min:44,max:62,rails:[2,12],railX:[34,72]},crab:{y:22.5,min:15.5,max:24},
  track:{pass:[57,64.2],freight:24,freightEnd:116},/* 4.55: the coal siding runs to x 116 (it was 56: too short for a train's hoppers to pass the gantry) *//* the passenger tracks KIT.TWIN_G (7.2 m) apart: the kit station's island platform fits */
  // colour zones (flat tones: the blockout's silhouette colours)
  C:{brick:[0.62,0.3,0.24],slate:[0.36,0.39,0.43],iron:[0.17,0.18,0.2],stone:[0.6,0.59,0.55],yard:[0.47,0.45,0.41],track:[0.24,0.22,0.2],
    ware:[0.55,0.33,0.26],hull:[0.12,0.12,0.13],cream:[0.9,0.86,0.74],coal:[0.08,0.08,0.09],found:[0.45,0.38,0.32],belt:[0.3,0.3,0.32],plat:[0.7,0.68,0.62]},
  B:[
    // ground and quay
    ['Quay_Deck',0,120,0,15,-0.6,0,'stone'],['Yard_Deck',0,120,15,90,-0.6,0,'yard'],['Quay_Wall',0,120,-0.7,0,-7,0,'stone'],
    // railway (blocks for now): two passenger tracks straight through, the freight siding from the west to its buffer
    ['Track_Passenger_01',0,120,56.6,59.4,0,0.35,'track'],['Track_Passenger_02',0,120,62.6,65.4,0,0.35,'track'],['Track_Freight_01',0,56,22.6,25.4,0,0.35,'track'],['Track_Freight_Buffer',116,118,22.4,25.6,0,1.2,'iron'],
    ['Platform_South',30,90,53.6,56.3,0,0.9,'plat'],['Platform_North',30,90,65.7,70,0,0.9,'plat'],
    // station, train shed, warehouses
    ['Station_TrainShed_Walls',30,90,50,74,0,9,'slate'],['Station_TrainShed_Roof',30,90,50,74,9,15,'slate','gable'],
    ['Station_MainBuilding',38,82,74,90,0,13,'brick'],['Station_Roof',38,82,74,90,13,18,'slate','gable'],['Station_Clock_Tower',57,63,81,87,13,21,'brick'],['Station_Clock_Spire',57,63,81,87,21,24,'slate','gableY'],
    ['Warehouse_01',74,96,22,40,0,9,'ware'],['Warehouse_01_Roof',74,96,22,40,9,11.5,'slate','gableY'],['Warehouse_02',98,118,22,44,0,10,'ware'],['Warehouse_02_Roof',98,118,22,44,10,12.5,'slate','gableY'],
    ['Warehouse_03',2,18,34,50,0,8,'ware'],['Warehouse_03_Roof',2,18,34,50,8,10,'slate','gableY'],
    // coal handling: portal gantry over the siding (legs at y 11 and 29), the receiving hopper under its beam beside the siding
    ['Coal_Gantry_Leg_SW',15.4,16.6,10.4,11.6,0,10,'iron'],['Coal_Gantry_Leg_SE',23.4,24.6,10.4,11.6,0,10,'iron'],['Coal_Gantry_Leg_NW',15.4,16.6,28.4,29.6,0,10,'iron'],['Coal_Gantry_Leg_NE',23.4,24.6,28.4,29.6,0,10,'iron'],
    ['Coal_Gantry_Beam_W',15.4,16.6,10.4,29.6,9,10.4,'iron'],['Coal_Gantry_Beam_E',23.4,24.6,10.4,29.6,9,10.4,'iron'],['Coal_Gantry_Crab',17,23,20.5,24.5,7.5,9.2,'iron'],
    ['Coal_Receiving_Hopper',17,23,13,19,1.2,4,'iron','hopper'],['Coal_Receiving_Hopper_Legs',18.5,21.5,14.5,17.5,0,1.2,'iron'],
    // the conveyor: inclined 18° from the hopper outlet (x 23, z 1.4) to x 40 (z 7), then level along the quay to x 70
    ['Coal_Conveyor_Incline',23,40,15,17,1.4,7,'belt','ramp'],['Coal_Conveyor_Level',40,70,15,17,6.6,7.2,'belt'],
    ['Coal_Conveyor_Trestle_01',44.5,45.5,15.4,16.6,0,6.6,'iron'],['Coal_Conveyor_Trestle_02',54.5,55.5,15.4,16.6,0,6.6,'iron'],['Coal_Conveyor_Trestle_03',64.5,65.5,15.4,16.6,0,6.6,'iron'],['Coal_Conveyor_Trestle_04',34.5,35.5,15.4,16.6,0,5.2,'iron'],
    // the travelling shiploader on two quay rails (rails and end stops fixed; the carriage block at x 44 over the first hatch)
    ['Shiploader_Rail_01',34,72,1.7,2.3,0,0.25,'iron'],['Shiploader_Rail_02',34,72,11.7,12.3,0,0.25,'iron'],
    ['Shiploader_EndStop_W1',33.2,34,1.4,2.6,0,1,'iron'],['Shiploader_EndStop_W2',33.2,34,11.4,12.6,0,1,'iron'],['Shiploader_EndStop_E1',72,72.8,1.4,2.6,0,1,'iron'],['Shiploader_EndStop_E2',72,72.8,11.4,12.6,0,1,'iron'],
    ['Shiploader_Carriage',40,48,1,13,0.3,7.6,'iron','portal'],['Shiploader_Tripper',41.5,46.5,14.6,17.4,7.2,9.6,'iron'],['Shiploader_Boom',43,45,-7.5,17,9.6,10.8,'iron'],
    ['Shiploader_TransferHopper',42.5,45.5,-8.5,-5,8.2,10.8,'iron','hopper'],['Shiploader_Chute',43.3,44.7,-7.4,-5.6,-0.4,8.2,'iron'],
    // the collier (blocks): hull from 2 m below the sea to 2 m above it, bridge and funnel aft, masts, hatches
    ['Ship_Hull',37.5,82.5,-11,-2,-7,-1,'hull','hull'],['Ship_Bridge',70,77,-9.6,-3.4,-1,3.5,'cream'],['Ship_Funnel',73,75.4,-7.7,-5.3,3.5,9,'hull','cyl'],
    ['Ship_Mast_01',48.2,48.8,-6.8,-6.2,-1,11,'cream'],['Ship_Mast_02',57.2,57.8,-6.8,-6.2,-1,11,'cream'],
    ['Ship_Cargo_Hatch_01',41.5,46.5,-8.5,-4.5,-1,-0.3,'iron'],['Ship_Cargo_Hatch_02',50.5,55.5,-8.5,-4.5,-1,-0.3,'iron'],['Ship_Cargo_Hatch_03',59.5,64.5,-8.5,-4.5,-1,-0.3,'iron'],
    // wagons on the siding: one under the gantry, one on approach (coal on top)
    ['Coal_Wagon_01',16,24,23,25,0.4,2.6,'iron'],['Coal_Wagon_01_Load',16.5,23.5,23.2,24.8,2.6,3.2,'coal'],['Coal_Wagon_02',3,11,23,25,0.4,2.6,'iron'],['Coal_Wagon_02_Load',3.5,10.5,23.2,24.8,2.6,3.2,'coal']]};

const Port={S:[],key:'',meshes:new Map(),
  // ---- the frame of a site: local (x along the quay, y inland, z up from the deck) → world
  P(s,x,y,z){const lx=x-PORT.W/2;return[s.x+s.t[0]*lx+s.n[0]*y,s.deckY+(z||0),s.z+s.t[1]*lx+s.n[1]*y];},
  local(s,wx,wz){const dx=wx-s.x,dz=wz-s.z;return[dx*s.t[0]+dz*s.t[1]+PORT.W/2,dx*s.n[0]+dz*s.n[1]];},
  inside(s,wx,wz,m){const [x,y]=this.local(s,wx,wz);m=m||0;return x>-m&&x<PORT.W+m&&y>-PORT.water*0.4-m&&y<PORT.D+m;},
  siteOf(v){return this.S.find(s=>s.v===v)||null;},
  // a town's houses may not grow into a site (Life.fitsRect)
  blocks(Q){for(const s of this.S)for(const p of VG.corners(Q))if(this.inside(s,p[0],p[1],8))return true;return false;},
  // ---- the sites: once per world after the coast (deterministic: the terrain and the towns' first houses only). For every harbour
  // town: a straight bit of coast within 1.6 km where the berth (the collier's place, 2..11 m off the quay) is at least 4.5 m deep,
  // and the ground of the terminal is low enough; the best by the least ground to cut and the closest to the town
  find(){const T=App.T;this.S=[];this.meshes.clear();if(!T||T.sea==null)return;const sea=T.sea,Hs=(x,z)=>R.sampleHr(T,x,z),W=T.W,deck=sea+PORT.deck;
    // the open sea: water cells joined to the map's edge (a flood fill on the height grid). Lakes, and basins below sea level that
    // do not reach the ocean, are not sea: a collier has to sail in and out
    const N=T.N,cs=T.cs,Hr=T.Hr||T.H,oc=new Uint8Array(N*N),st=[];const wetc=k=>Hr[k]<sea-4;/* navigable: at least 4 m deep all the way (a bay behind shallows reads as a lake and no collier gets in) */
    for(let i=0;i<N;i++)for(const k of [i,(N-1)*N+i,i*N,i*N+N-1])if(!oc[k]&&wetc(k)){oc[k]=1;st.push(k);}
    while(st.length){const k=st.pop(),i=k%N,j=(k/N)|0;for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const ii=i+a,jj=j+b;if(ii<0||jj<0||ii>=N||jj>=N)continue;const m=jj*N+ii;if(!oc[m]&&wetc(m)){oc[m]=1;st.push(m);}}}
    const ocean=(x,z)=>{const i=Math.round(x/cs),j=Math.round(z/cs);return i>=0&&j>=0&&i<N&&j<N&&oc[j*N+i]===1;};this.ocean=ocean;
    const towns=Life.villages.slice();/* 4.58: every village with open sea in reach (it used to be only the fishing-harbour towns) */
    for(const v of towns){let best=null;
      for(let a=0;a<64;a++){const dx=Math.cos(a/64*6.2832),dz=Math.sin(a/64*6.2832);let prev=false;
        for(let r=(v.R||50)+40;r<1600;r+=8){const x=v.x+dx*r,z=v.z+dz*r;if(x<200||z<200||x>W-200||z>W-200)break;const wet=Hs(x,z)<sea-0.3;if(!wet){prev=false;continue;}if(prev)continue;prev=true;
          // the shore crossing at (x,z): its seaward direction from the water around it
          let sx=0,sz=0;for(let b=0;b<24;b++){const ca=Math.cos(b*0.2618),sa=Math.sin(b*0.2618);if(Hs(x+ca*60,z+sa*60)<sea-0.3){sx+=ca;sz+=sa;}}const sl=Math.hypot(sx,sz);if(sl<3)continue;
          const n=[-sx/sl,-sz/sl],t=[-n[1],n[0]];/* n: inland */
          // move the quay face out until the berth is deep enough
          for(let o=-6;o<=36;o+=3){const qx=x-n[0]*o,qz=z-n[1]*o,s={x:qx,z:qz,t,n,v,deckY:deck};let ok=true,cut=0,low=0;
            for(let lx=36;lx<=84&&ok;lx+=6)for(const ly of [-3,-6.5,-10,-25,-40]){const w=this.xz(s,lx,ly);if(Hs(...w)>sea-(ly>-12?0.6:2)){ok=false;break;}}if(ok&&!ocean(...this.xz(s,SHIP.approach[0],SHIP.approach[1]))&&!ocean(...this.xz(s,60,-110)))ok=false;/* 4.58: water along the berth (dredged to 8 m when built: Port.dredge) and open sea off it, where the colliers anchor */
            if(!ok)continue;
            for(let lx=0;lx<=PORT.W&&ok;lx+=10)for(let ly=0;ly<=PORT.D;ly+=10){const g=Hs(...this.xz(s,lx,ly));if(g>deck+6){ok=false;break;}cut+=Math.max(0,g-deck);if(g<deck-1)low++;}
            if(!ok)continue;
            // the back (the tracks and the station, y ≥ 50) must stand mostly on land, and that land on the town's own island: the line
            // from the town to the back of the site stays on land (trains have to get there)
            {let n=0,nl=0;for(let lx=0;lx<=PORT.W;lx+=10)for(let ly=50;ly<=PORT.D;ly+=10){n++;if(Hs(...this.xz(s,lx,ly))>sea+0.5)nl++;}if(nl<n*0.7)continue;
              const b=this.xz(s,PORT.W/2,PORT.D),L=Math.hypot(b[0]-v.x,b[1]-v.z);let wet=0;for(let k=1;k<20;k++){const f=k/20;if(Hs(v.x+(b[0]-v.x)*f,v.z+(b[1]-v.z)*f)<sea+0.2)wet++;}if(wet>1||L>1700)continue;}
            const cs=this.cornersOf(s),bad=Life.houses.some(h=>h.fixed&&!h.gone&&this.inside(s,h.x,h.z,10))||(Life.mines||[]).some(m=>this.inside(s,m.x,m.z,30))||(Life.factories||[]).some(m=>this.inside(s,m.x,m.z,45))||Coast.H.some(h=>this.inside(s,h.x,h.z,25))||Coast.L.some(l=>this.inside(s,l.x,l.z,25))||this.S.some(o=>Math.hypot(o.x-s.x,o.z-s.z)<260)||cs.some(c=>c[0]<60||c[1]<60||c[0]>W-60||c[1]>W-60);
            if(bad)continue;const sc=cut*0.6+low*0.4+r*0.02;if(!best||sc<best.sc)best={...s,sc,cut};break;}}}
      if(best)this.S.push(best);}
    Log.info(`harbour: ${this.S.length} terminal sites for ${towns.length} harbour towns`+this.S.map(s=>` · ${s.v.name} (${s.x.toFixed(0)},${s.z.toFixed(0)}${s.cut>0?', cut '+s.cut.toFixed(0):''})`).join(''));},
  xz(s,x,y){const p=this.P(s,x,y,0);return[p[0],p[2]];},
  cornersOf(s){return[[0,-PORT.water],[PORT.W,-PORT.water],[PORT.W,PORT.D],[0,PORT.D]].map(([x,y])=>this.xz(s,x,y));},
  /* 4.58: the berth dredged: under water in front of the quay (x 25…95, y −1…−55) the sea floor goes down to 8 m, blended out over 15 m
     (only cells already under water: no new water is made) */
  dredge(s){const T=App.T,N=T.N,cs=T.cs,tg=T.sea-8,M=15,c=[this.xz(s,25-M,-55-M),this.xz(s,95+M,-55-M),this.xz(s,95+M,0),this.xz(s,25-M,0)],x0=Math.min(...c.map(q=>q[0])),x1=Math.max(...c.map(q=>q[0])),z0=Math.min(...c.map(q=>q[1])),z1=Math.max(...c.map(q=>q[1]));
    const i0=Math.max(0,Math.floor(x0/cs)),i1=Math.min(N-1,Math.ceil(x1/cs)),j0=Math.max(0,Math.floor(z0/cs)),j1=Math.min(N-1,Math.ceil(z1/cs));
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const k=j*N+i,h=T.Hr[k];if(h<=tg||h>T.sea-0.3)continue;const [lx,ly]=this.local(s,i*cs,j*cs),o=Math.hypot(Math.max(0,25-lx,lx-95),Math.max(0,-55-ly,ly+1));if(o>M)continue;
      const w=o<=0?1:1-(o/M)*(o/M)*(3-2*o/M);T.Hr[k]=h+(tg-h)*w;}
    R.patchTerrain(T,i0,j0,i1,j1);},
  // ---- bought: the ground under the deck levelled, houses and trees there gone, the terminal built (also after loading a save)
  build(s){if(s.built)return;this.earth(s);
    for(const h of Life.houses)if(!h.gone&&this.inside(s,h.x,h.z,6))h.gone=true;
    if(R.clearVegRect){const c=this.P(s,PORT.W/2,PORT.D/2-PORT.water/2,0);R.clearVegRect(App.T,{x:c[0],z:c[2],a:Math.atan2(s.t[1],s.t[0]),x0:-PORT.W/2-6,x1:PORT.W/2+6,z0:-(PORT.D+PORT.water)/2-6,z1:(PORT.D+PORT.water)/2+6},2);}
    s.built=true;this.tracks(s);this.meshes.delete(s);/* built first: the track change re-applies its earthworks (App.reEarth) */Life.uploaded=false;Life.roadsDirty=true;},
  /* the earthworks (also again after every track change near it, App.reEarth: the track earthworks are rebuilt from the bare land) */
  earth(s){const T=App.T,N=T.N,cs=T.cs,cr=this.cornersOf(s),x0=Math.min(...cr.map(c=>c[0]))-12,x1=Math.max(...cr.map(c=>c[0]))+12,z0=Math.min(...cr.map(c=>c[1]))-12,z1=Math.max(...cr.map(c=>c[1]))+12;
    const i0=Math.max(0,Math.floor(x0/cs)),i1=Math.min(N-1,Math.ceil(x1/cs)),j0=Math.max(0,Math.floor(z0/cs)),j1=Math.min(N-1,Math.ceil(z1/cs)),top=s.deckY-0.7,M=10;
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const [lx,ly]=this.local(s,i*cs,j*cs),o=Math.hypot(Math.max(0,-lx,lx-PORT.W),Math.max(0,-ly,ly-PORT.D));if(o>M||ly<-2)continue;
      const k=j*N+i,h=T.Hr[k];if(h<=top)continue;const w=o<=0?1:1-(o/M)*(o/M)*(3-2*o/M);T.Hr[k]=h+(top-h)*w;}
    this.dredge(s);R.patchTerrain(T,i0,j0,i1,j1);R.dryWater(T,i0,j0,i1,j1);},
  // the two passenger tracks (straight through, x 0 → 120) and the freight siding (from the west to its buffer) as real track at deck
  // height: the player's lines join their free ends; saved with the rest of the track (tagged port:<site>), so they are made once
  tracks(s){const key=Math.round(s.x)+','+Math.round(s.z);if(Track.segs.some(g=>g.port===key)){this.extendSiding(s,key);this.stations(s,key);return;}const h=Math.atan2(s.t[1],s.t[0]),y=s.deckY+0.25;/* the track bed lies on the deck */
    for(const [ly,x1] of [[PORT.track.pass[0],PORT.W],[PORT.track.pass[1],PORT.W],[PORT.track.freight,PORT.track.freightEnd]]){const a0=this.xz(s,0,ly),b0=this.xz(s,x1,ly),L=Math.hypot(b0[0]-a0[0],b0[1]-a0[1]);
      const a={id:Track.nextId++,x:a0[0],z:a0[1],y,h:wrapPi(h+Math.PI),g:0},b={id:Track.nextId++,x:b0[0],z:b0[1],y,h:wrapPi(h),g:0};Track.nodes.push(a,b);
      Track.segs.push({id:Track.nextId++,a:a.id,b:b.id,x0:a0[0],z0:a0[1],h0:h,k:0,L,y0:y,y1:y,g0:0,g1:0,spans:[],port:key});}
    this.stations(s,key);Net.changed();App.trackChanged();},
  // the harbour station as a real stop: on the north passenger track (platform inland, by the station building) with a twin on the
  // south track (platform toward the yard); Life draws no station building for them (st.port), the harbour has its own
  stations(s,key){this.freightSt(s,key);if(Track.stations.some(q=>q.port===key&&!q.portFreight))return;const P2=Track.segs.filter(g=>g.port===key&&Math.abs(g.L-PORT.W)<1);if(P2.length<2)return;
    const lyOf=g=>this.local(s,g.x0,g.z0)[1],[g1,g2]=P2.sort((a,b)=>lyOf(a)-lyOf(b)),name=s.v.name+' Harbour';
    const st={id:Track.nextId++,sid:g2.id,t:60,name,side:1,len:56,port:key};Track.stations.push(st);Track.stations.push({id:Track.nextId++,sid:g1.id,t:60,name,side:-1,len:56,twinOf:st.id,port:key});st.twinId=Track.stations[Track.stations.length-1].id;Net.changed();},
  /* 4.55: the coal staithe: a goods stop on the freight siding (x 0..56, dead end at the east buffer). A goods train runs in from the west
     and stops with its head near the buffer; the travelling gantry then empties its coal and iron hoppers (PortCoal) */
  // harbours built before 4.55 have a 56 m coal siding: lengthen it (it is straight: move its east node, keep its id)
  extendSiding(s,key){const g=Track.segs.find(q=>q.port===key&&Math.abs(q.L-56)<1);if(!g)return;const A=Track.nodes.find(n=>n.id===g.a),B=Track.nodes.find(n=>n.id===g.b);if(!A||!B)return;
    const la=this.local(s,A.x,A.z)[0],e=la<PORT.W/2?B:A,p=this.xz(s,PORT.track.freightEnd,PORT.track.freight);if(e===A){/* the segment starts at the east end: keep the west node as its start */return;}
    e.x=p[0];e.z=p[1];g.L=Math.hypot(p[0]-A.x,p[1]-A.z);const st=Track.stations.find(q=>q.port===key&&q.portFreight);if(st){st.t=66;st.len=100;}Net.changed();App.trackChanged();},
  freightSt(s,key){if(Track.stations.some(q=>q.port===key&&q.portFreight))return;const g=Track.segs.find(q=>q.port===key&&Math.abs(q.L-PORT.track.freightEnd)<1);if(!g)return;
    const a=this.local(s,g.x0,g.z0),t=a[0]<PORT.track.freightEnd/2?66:g.L-66;Track.stations.push({id:Track.nextId++,sid:g.id,t,name:s.v.name+' Coal Staithe',side:1,len:100,port:key,portFreight:true});Net.changed();},
  freightOf(s){const key=Math.round(s.x)+','+Math.round(s.z);return Track.stations.find(q=>q.port===key&&q.portFreight)||null;},
  // ---- the harbour's kit instances (buildings/harbour.js): the house kit's detail, drawn with the village houses (Life's kit pass).
  // Model frame: front (−z) toward the sea; rot = the quay heading + π turns model +z inland (the station kit's rule)
  kitList(s){if(s.kit)return s.kit;const T=App.T,h=Math.atan2(s.t[1],s.t[0]),rot=h+Math.PI,L=[],at=(t,x,y,z,hash)=>{const p=this.P(s,x,y,z);L.push({t,x:p[0],y:p[1],z:p[2],rot,hash:hash==null?0.5:hash});};
    for(let x=5,k=0;x<PORT.W;x+=10,k++)at(k%3===1?'portQuayL':'portQuay',x,0,0,k*0.37%1);
    for(let x=5;x<PORT.W;x+=10)for(let y=20;y<PORT.D;y+=10)at('portPave',x,y,0.005,(x*7+y*3)%1);
    at('portWareA',85,37,0,0.2);at('portWareA',108,37.5,0,0.7);/* clear of the coal siding (y 24) */at('portWareB',10,42,0,0.4);
    at('portShed',60,(PORT.track.pass[0]+PORT.track.pass[1])/2,0.4,0.5);
    at('portHopper',20,16,0,0.5);at('portBelt',47,16,0,0.5);/* the coal handling's fixed ironwork (buildings/harbourworks.js) */
    for(let x=0;x<=PORT.W;x+=10)for(let y=0;y<=PORT.D;y+=10){const w=this.xz(s,Math.min(PORT.W-0.5,Math.max(0.5,x)),Math.min(PORT.D-0.5,Math.max(0.5,y)));if(R.sampleHr(T,w[0],w[1])>s.deckY-1.2)continue;at(y<=20?'portPier':'portStilt',x,y,0,(x+y)%1);}
    s.kit=L;return L;},
  // the moving machinery and the collier as kit instances, written every frame (Life.armInst): the gantry's crab, the shiploader and
  // the moored collier riding the swell
  dynPut(put){const cp=Cam.pos||[0,0,0],t=performance.now()/1000;for(const s of this.S){if(!s.built||Math.hypot(s.x-cp[0],s.z-cp[2])>2300)continue;const c=PortCoal.st(s),rot=Math.atan2(s.t[1],s.t[0])+Math.PI,
      at=(k,x,y,z)=>{const p=this.P(s,x,y,z);put(k,{x:p[0],y:p[1],z:p[2],rot,hash:0.5});};
    at('portGantry',c.gx,20,0);at('portCrab',c.gx,c.crabY,10.47);at('portLoader',c.lx,0,0);void t;}if(typeof Ships!=='undefined')Ships.dynPut(put);/* the colliers (js/ships.js) */},
  kitPut(put){const cp=Cam.pos||[0,0,0];for(const s of this.S){if(!s.built||Math.hypot(s.x-cp[0],s.z-cp[2])>2400)continue;for(const o of this.kitList(s))put(o.t,o);}},
  townOf(st){const s=this.S.find(q=>st.port===Math.round(q.x)+','+Math.round(q.z));return s?s.v:null;},
  update(dt){const T=App.T;if(!T||T.sea==null||!Coast.T||Coast.T!==T)return;const key=Coast.key;if(key!==this.key){this.key=key;this.find();}for(const s of this.S){if(s.v.portOwned&&!s.built)this.build(s);if(s.built)PortCoal.step(s,Math.min(0.1,dt||0.016));}},
  // ---- the blockout mesh of a site (world coordinates): flat-coloured blocks from the schedule, and foundation blocks under the deck
  // where the ground (or the sea floor) lies lower
  mesh(s){let m=this.meshes.get(s);if(m)return m;const M=vmesh(),C=PORT.C,T=App.T;
    const W=(x,y,z)=>this.P(s,x,y,z),Nv=(nx,ny,nz)=>[s.t[0]*nx+s.n[0]*ny,nz,s.t[1]*nx+s.n[1]*ny],q=(a,b,c,d,n,col)=>vq(M,a,b,c,d,n,col,3);
    const box=(x0,x1,y0,y1,z0,z1,col)=>{const p=(x,y,z)=>W(x,y,z);
      q(p(x0,y0,z1),p(x1,y0,z1),p(x1,y1,z1),p(x0,y1,z1),Nv(0,0,1),col);q(p(x0,y1,z0),p(x1,y1,z0),p(x1,y0,z0),p(x0,y0,z0),Nv(0,0,-1),col);
      q(p(x0,y0,z0),p(x1,y0,z0),p(x1,y0,z1),p(x0,y0,z1),Nv(0,-1,0),col);q(p(x1,y1,z0),p(x0,y1,z0),p(x0,y1,z1),p(x1,y1,z1),Nv(0,1,0),col);
      q(p(x1,y0,z0),p(x1,y1,z0),p(x1,y1,z1),p(x1,y0,z1),Nv(1,0,0),col);q(p(x0,y1,z0),p(x0,y0,z0),p(x0,y0,z1),p(x0,y1,z1),Nv(-1,0,0),col);};
    const tri=(a,b,c,n,col)=>q(a,b,c,c,n,col);
    const ARCH=/^(Quay_|Yard_|Track_Passenger|Track_Freight_01$|Platform_|Station_|Warehouse_|Coal_|Shiploader_|Ship_)/;/* step 2: these are built in detail by PortArch */
    for(const [nm,x0,x1,y0,y1,z0,z1,zone,shape] of PORT.B){if(ARCH.test(nm))continue;const col=C[zone]||[0.5,0.5,0.5],p=(x,y,z)=>W(x,y,z),ym=(y0+y1)/2,xm=(x0+x1)/2;
      if(shape==='gable'){/* ridge along x at ym */const ny=Math.hypot(z1-z0,(y1-y0)/2);q(p(x0,y0,z0),p(x1,y0,z0),p(x1,ym,z1),p(x0,ym,z1),Nv(0,-(z1-z0)/ny,((y1-y0)/2)/ny),col);q(p(x1,y1,z0),p(x0,y1,z0),p(x0,ym,z1),p(x1,ym,z1),Nv(0,(z1-z0)/ny,((y1-y0)/2)/ny),col);
        tri(p(x0,y1,z0),p(x0,y0,z0),p(x0,ym,z1),Nv(-1,0,0),col);tri(p(x1,y0,z0),p(x1,y1,z0),p(x1,ym,z1),Nv(1,0,0),col);continue;}
      if(shape==='gableY'){const nx=Math.hypot(z1-z0,(x1-x0)/2);q(p(x0,y1,z0),p(x0,y0,z0),p(xm,y0,z1),p(xm,y1,z1),Nv(-(z1-z0)/nx,0,((x1-x0)/2)/nx),col);q(p(x1,y0,z0),p(x1,y1,z0),p(xm,y1,z1),p(xm,y0,z1),Nv((z1-z0)/nx,0,((x1-x0)/2)/nx),col);
        tri(p(x0,y0,z0),p(x1,y0,z0),p(xm,y0,z1),Nv(0,-1,0),col);tri(p(x1,y1,z0),p(x0,y1,z0),p(xm,y1,z1),Nv(0,1,0),col);continue;}
      if(shape==='ramp'){/* the inclined belt: a slab rising along x */const r=(x,y,top)=>{const k=(x-x0)/(x1-x0),z=z0+(z1-z0)*k;return p(x,y,top?z+0.5:z-0.4);};
        q(r(x0,y0,1),r(x1,y0,1),r(x1,y1,1),r(x0,y1,1),Nv(0,0,1),col);q(r(x0,y1,0),r(x1,y1,0),r(x1,y0,0),r(x0,y0,0),Nv(0,0,-1),col);q(r(x0,y0,0),r(x1,y0,0),r(x1,y0,1),r(x0,y0,1),Nv(0,-1,0),col);q(r(x1,y1,0),r(x0,y1,0),r(x0,y1,1),r(x1,y1,1),Nv(0,1,0),col);continue;}
      if(shape==='hopper'){/* a tapered bin: the top wide, the outlet a third of it */const ix=(x1-x0)/3,iy=(y1-y0)/3,a=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]],b=[[x0+ix,y0+iy],[x1-ix,y0+iy],[x1-ix,y1-iy],[x0+ix,y1-iy]];
        for(let k=0;k<4;k++){const k2=(k+1)%4,dx=a[k2][0]-a[k][0],dy=a[k2][1]-a[k][1],l=Math.hypot(dx,dy);q(p(b[k][0],b[k][1],z0),p(b[k2][0],b[k2][1],z0),p(a[k2][0],a[k2][1],z1),p(a[k][0],a[k][1],z1),Nv(dy/l,-dx/l,0.4),col);}
        q(p(a[0][0],a[0][1],z1),p(a[1][0],a[1][1],z1),p(a[2][0],a[2][1],z1),p(a[3][0],a[3][1],z1),Nv(0,0,1),C.coal);continue;}
      if(shape==='cyl'){const r=(x1-x0)/2,n=10;for(let k=0;k<n;k++){const a0=k/n*6.2832,a1=(k+1)/n*6.2832;q(p(xm+Math.cos(a0)*r,ym+Math.sin(a0)*r,z0),p(xm+Math.cos(a1)*r,ym+Math.sin(a1)*r,z0),p(xm+Math.cos(a1)*r,ym+Math.sin(a1)*r,z1),p(xm+Math.cos(a0)*r,ym+Math.sin(a0)*r,z1),Nv(Math.cos(a0+0.31),Math.sin(a0+0.31),0),col);}continue;}
      if(shape==='portal'){/* the shiploader's portal: four legs over the two rails, a deck beam on top */for(const lx of [x0,x1-1])for(const ly of [y0,y1-1])box(lx,lx+1,ly,ly+1,z0,z1-1.2,col);box(x0,x1,y0,y1,z1-1.2,z1,col);continue;}
      if(shape==='hull'){/* a box hull with a pointed bow (east) */const bx=x1-7;box(x0,bx,y0,y1,z0,z1,col);q(p(bx,y0,z0),p(x1,ym,z0),p(x1,ym,z1),p(bx,y0,z1),Nv(0.6,-0.8,0),col);q(p(x1,ym,z0),p(bx,y1,z0),p(bx,y1,z1),p(x1,ym,z1),Nv(0.6,0.8,0),col);tri(p(bx,y0,z1),p(x1,ym,z1),p(bx,y1,z1),Nv(0,0,1),col);
        box(x0,x1-7,y0+0.01,y1-0.01,z0+1.5,z0+2.3,[0.5,0.16,0.1]);continue;}
      box(x0,x1,y0,y1,z0,z1,col);}
    // step 2: the architecture (deck and quay, foundations, platforms, train shed, station, warehouses) in detail
    const ground=(x,y)=>{const w=this.xz(s,x,y);return R.sampleHr(T,w[0],w[1])-s.deckY;};
    box(0,PORT.W,0,PORT.D,-0.6,-0.02,[0.45,0.43,0.4]);/* the deck slab (the paving, quay, buildings and foundations are kit models: Port.kitPut) */void ground;void tri;
    m=R.uploadVeh(M);this.meshes.set(s,m);return m;},
  draw(p,pass){if(!this.S.length)return;const cp=Cam.pos||[0,0,0];for(const s of this.S){if(!s.built||Math.hypot(s.x-cp[0],s.z-cp[2])>(pass===1?600:5000))continue;const m=this.mesh(s);
      gl.uniformMatrix4fv(p.u('uModel'),false,M4.ident());gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,0);Stats.draws++;if(Math.hypot(s.x-cp[0],s.z-cp[2])<(pass===1?500:2500))PortCoal.draw(s,p);}},
  // where the player can drop the camera to look at a site (tests, the map)
  centre(s){const c=this.P(s,PORT.W/2,PORT.D/2-10,0);return c;}};

// ---- the coal handling (step 3): the fixed structures (built into the site mesh) and the moving parts (own meshes in the site's
// local frame, drawn with a model matrix): the gantry crab and its grab, the coal on the belt, the shiploader, the wagons.
// One cycle: the grab drops into the wagon under the gantry, closes, lifts, the crab runs over the hopper, the grab opens; five grabs
// empty a wagon, which then rolls out east and a full one rolls in. The belt runs all the time; the shiploader pours into a hatch and
// moves on to the next (x 44 → 53 → 62 → 53 → …).
const PortCoal={M:null,
  // ---- the moving parts: meshes in local coordinates (vertex = x, z up, y), origin at the site's x 0, y 0, deck level
  meshes(){if(this.M)return this.M;const mk=()=>vmesh(),L=(x,y,z)=>[x,z,y],Ln=(x,y,z)=>[x,z,y];
    const box=(M,x0,x1,y0,y1,z0,z1,col)=>{const p=L;const q=(a,b,c,d,n)=>vq(M,a,b,c,d,Ln(...n),col,3);
      q(p(x0,y0,z1),p(x1,y0,z1),p(x1,y1,z1),p(x0,y1,z1),[0,0,1]);q(p(x0,y1,z0),p(x1,y1,z0),p(x1,y0,z0),p(x0,y0,z0),[0,0,-1]);q(p(x0,y0,z0),p(x1,y0,z0),p(x1,y0,z1),p(x0,y0,z1),[0,-1,0]);
      q(p(x1,y1,z0),p(x0,y1,z0),p(x0,y1,z1),p(x1,y1,z1),[0,1,0]);q(p(x1,y0,z0),p(x1,y1,z0),p(x1,y1,z1),p(x1,y0,z1),[1,0,0]);q(p(x0,y1,z0),p(x0,y0,z0),p(x0,y0,z1),p(x0,y1,z1),[-1,0,0]);};
    const beam=(M,p0,p1,w,col)=>{const d=[p1[0]-p0[0],p1[1]-p0[1],p1[2]-p0[2]],l=Math.hypot(...d)||1,u=d.map(v=>v/l);let sx=[u[1],-u[0],0];let sl=Math.hypot(...sx);if(sl<1e-3){sx=[1,0,0];sl=1;}sx=sx.map(v=>v/sl);
      const up=[u[1]*sx[2]-u[2]*sx[1],u[2]*sx[0]-u[0]*sx[2],u[0]*sx[1]-u[1]*sx[0]],P=(p,a,b)=>L(p[0]+sx[0]*a+up[0]*b,p[1]+sx[1]*a+up[1]*b,p[2]+sx[2]*a+up[2]*b),h=w/2;
      for(const [a1,b1,a2,b2,n] of [[-h,h,h,h,up],[h,-h,-h,-h,up.map(v=>-v)],[h,h,h,-h,sx],[-h,-h,-h,h,sx.map(v=>-v)]])vq(M,P(p0,a1,b1),P(p0,a2,b2),P(p1,a2,b2),P(p1,a1,b1),Ln(...n),col,3);};
    const iron=[0.2,0.21,0.23],iron2=[0.3,0.31,0.33],green=[0.2,0.3,0.23],coal=[0.07,0.07,0.08];
    // the hoist ropes: unit length (scaled down by the hoist), from z 0 to −1 at x 19.4 / 20.6
    const rope=mk();for(const x of [19.4,20.6])box(rope,x-0.03,x+0.03,-0.03,0.03,-1,0,[0.1,0.1,0.1]);
    // grab bucket (two halves; origin at its top), open = halves apart
    // the grab: a head with the rope sheaves, four arms to the shells, the hinge beam, two curved shells of riveted plate with side plates
    const grab=mk();box(grab,19.2,20.8,-0.35,0.35,-0.55,0,green);for(const x of [19.4,20.6])box(grab,x-0.12,x+0.12,-0.2,0.2,-0.1,0.25,iron2);
    for(const sx of [-1,1])for(const sy of [-1,1])beam(grab,[20+sx*0.6,sy*0.3,-0.45],[20+sx*1.12,sy*0.8,-1.45],0.09,iron);box(grab,19.75,20.25,-0.95,0.95,-2.5,-2.2,green);
    for(const sd of [-1,1]){let pr=null;for(let k=0;k<=5;k++){const th=k/5*1.45,q=[20+sd*1.25*Math.sin(th),0,-1.2-1.25*Math.cos(th)];if(pr){for(const y of [-0.62,0,0.62])beam(grab,[pr[0],y,pr[2]],[q[0],y,q[2]],0.62,green);for(const y of [-0.92,0.92])beam(grab,[pr[0],y,pr[2]],[q[0],y,q[2]],0.08,iron);}pr=q;}
      box(grab,sd<0?18.72:21.18,sd<0?18.82:21.28,-0.95,0.95,-1.45,-1.25,iron);}
    const grabFull=mk();box(grabFull,18.8,21.2,-0.85,0.85,-1.5,-1.25,coal);
    // coal lumps on the belt (spacing 1.6 m): the incline (23 → 40) and the level run (40 → 70); drawn shifted by the belt's phase
    const lumpsA=mk(),lumpsB=mk();for(let x=23-1.6;x<40;x+=1.6){const z=1.4+(x-23)/17*5.6+0.3;box(lumpsA,x,x+0.9,15.6,16.4,z,z+0.35,coal);}for(let x=40-1.6;x<70;x+=1.6)box(lumpsB,x,x+0.9,15.6,16.4,7.3,7.65,coal);
    const load=mk();for(let x=-2.7;x<2.65;x+=0.45)for(let y=-1.05;y<1.0;y+=0.35){const pk=1-Math.pow(Math.abs(x+0.22)/3,2)*0.6-Math.pow(Math.abs(y+0.17)/1.2,2)*0.5,hh=0.55*pk+0.12*Math.sin(x*7.1+y*9.3);box(load,x,x+0.47,y,y+0.37,0,0.35+hh,coal);}
    this.M={rope,grab,grabFull,lumpsA,lumpsB,load};for(const k in this.M)this.M[k]=R.uploadVeh(this.M[k]);return this.M;},
  // ---- the state of a site's machinery
  /* ---- 4.55: the coal handling works on real trains. The goods train stands at the coal staithe (Port.freightOf) held by the crane
     rule (PortCoal.holds, from Crane.update) while hoppers of coal or iron ore within the gantry's reach (siding x 8..34) still hold
     anything. The gantry travels to a hopper (1.8 m/s) while the crab runs out over the siding, the grab drops in, bites up to 4 units,
     lifts, and the gantry carries it back over the receiving hopper (x 20) where it opens: the units are paid for like any delivery
     (Goods.deliver, by distance from the mine) and go into the harbour's stock. The belt runs and the shiploader pours into the
     collier's holds while there is stock (step 4b-2: the colliers you run carry it away) */
  st(s){if(!s.coal)s.coal={ph:'idle',t:0,gx:20,crabY:PORT.crab.min,hook:0,grab:null,task:null,belt:0,lx:PORT.loader.x,lT:0,lDir:1,lTarget:0,pour:0,stock:{coal:0,iron:0},hold:0};
    if(s.coal.gx==null){s.coal.gx=20;s.coal.ph='idle';s.coal.stock=s.coal.stock||{coal:0,iron:0};s.coal.hold=s.coal.hold||0;}
    if(s.v&&s.v.portCoal){const q=s.v.portCoal;s.v.portCoal=null;s.coal.stock=q.s?{...q.s}:{coal:+q.c||0,iron:+q.i||0};s.coal.imp=q.m?{...q.m}:{};s.coal.hold=+q.h||0;}if(!s.coal.imp)s.coal.imp={};return s.coal;},
  REACH:[8,34],
  // the train at the coal staithe and its bulk hoppers (in the site's frame: lx along the siding, ly across, top height above the deck)
  train(s){const st=Port.freightOf(s);if(!st)return null;const tr=Trains.list.find(t=>t.atSt===st.id&&Math.abs(t.v||0)<0.15&&t.poses);if(!tr)return null;const cars=[];
    tr.veh.forEach((w,i)=>{if(w.k!=='wagon'||!ORE[w.ctype])return;/* 4.57: every kind of ore hopper */const ps=tr.poses[i];if(!ps)return;const m=ps.m,[lx,ly]=Port.local(s,m[12],m[14]);if(Math.abs(ly-PORT.track.freight)>2)return;cars.push({w,lx,y:m[13]-s.deckY});});
    return{tr,st,cars};},
  work(s){const T=this.train(s);if(!T)return null;const R2=this.REACH,key=this.key(s),c=T.cars.filter(q=>(q.w.n||0)>=0.5&&q.w.from!==key&&q.lx>=R2[0]&&q.lx<=R2[1]);return c.length?{T,cars:c}:null;},
  key(s){const st=Port.freightOf(s);return st?'st:'+st.id:'port';},
  sum(o){let n=0;for(const t in o||{})n+=o[t]||0;return n;},
  /* 4.57: the import stock (what colliers brought, s.coal.imp) goes out by rail: with nothing to unload, the gantry fills hoppers in its
     reach that are not full, of a kind of ore the harbour holds and some factory takes, and that it did not empty on this visit
     (c.unl), 4 units a grab from the receiving hopper. Filled hoppers carry the staithe as their origin (paid at the factory by distance from here) */
  canFill(s,c,w){return(c.imp[w.ctype]||0)>=1&&(w.n||0)<19.5&&!(c.unl&&c.unl.has(w))&&!((w.n||0)>=0.5&&w.from!==this.key(s))&&this.factWants(w.ctype);},
  needs(s,c,w){return((w.n||0)>=0.5&&w.from!==this.key(s))||this.canFill(s,c,w);},/* a hopper the gantry still has to empty or fill */
  factWants(t){return(Life.factories||[]).some(f=>FACTORY[f.type]&&FACTORY[f.type].takes.includes(t));},
  fillWork(s){const T=this.train(s);if(!T)return null;const c=this.st(s),R2=this.REACH;if(c.unlTr!==T.tr.id){c.unlTr=T.tr.id;c.unl=new Set();}
    const ok=T.cars.filter(q=>q.lx>=R2[0]&&q.lx<=R2[1]&&this.canFill(s,c,q.w));
    if(!ok.length)return null;let car=ok[0];for(const q of ok)if(Math.abs(q.lx-c.gx)<Math.abs(car.lx-c.gx))car=q;return{T,car};},
  /* where a goods train stops at the coal staithe: its first loaded coal or iron hopper at x 28 (the next one then stands at x 16,
     both in the gantry's reach), never past x 114 (the buffer is at 117); Crane.stopAt asks. With every hopper in reach empty and loaded
     ones further back, the train draws up (tr.grainMove, the farm's way) */
  headOff(tr,s){const back=(tr.rev||1)<0,V=back?tr.veh.slice().reverse():tr.veh,c=this.st(s);let front=0;for(const v of V){if(v.k==='wagon'&&ORE[v.ctype]&&this.needs(s,c,v))return front+v.len/2;front+=v.len+COUPLE;}return null;},/* the front-most hopper to empty or fill */
  stopAt(tr,st,base){const s=Port.S.find(q=>Math.round(q.x)+','+Math.round(q.z)===st.port);const c=s?this.headOff(tr,s):null;if(!s||c==null)return base;const g=segById(st.sid);if(!g)return base;
    const pc=segPoint(g,st.t),xc=Port.local(s,pc[0],pc[1])[0];return Math.min(28+c,114)-xc;},
  drawUp(s,T){const tr=T.tr;if(tr.grainMove)return true;const c=this.st(s),ld=T.cars.filter(q=>this.needs(s,c,q.w)&&q.lx<this.REACH[0]);if(!ld.length)return false;const nxt=ld.reduce((a,b)=>b.lx>a.lx?b:a),ps=tr.poses,hd=ps&&ps[0]?Port.local(s,ps[0].m[12],ps[0].m[14])[0]:0,
    hx=Math.max(hd,ps&&ps.length?Port.local(s,ps[ps.length-1].m[12],ps[ps.length-1].m[14])[0]:0),D=Math.min(28-nxt.lx,114-hx);if(D>2){tr.grainMove=D;return true;}return false;},
  holds(hold){for(const s of Port.S){if(!s.built||!s.coal)continue;const c=s.coal;if(c.task&&c.task.tr&&Trains.list.includes(c.task.tr)){hold.set(c.task.tr.id,'harbour');continue;}const w=this.work(s)||this.fillWork(s);if(w){hold.set(w.T.tr.id,'harbour');continue;}const T=this.train(s);if(T&&T.cars.some(q=>this.needs(s,c,q.w))&&(c.ph!=='idle'||this.drawUp(s,T)))hold.set(T.tr.id,'harbour');}},/* hold while a draw-up can bring more within reach */
  step(s,dt){const c=this.st(s),cp=Cam.pos||[0,0,0];dt*=Math.max(1,Math.min(4,App.ff||1));const near=Math.hypot(s.x-cp[0],s.z-cp[2])<2500;
    const H=PORT.crab,mv=(k,to,v)=>{const d=to-c[k];if(Math.abs(d)<=v*dt){c[k]=to;return true;}c[k]+=Math.sign(d)*v*dt;return false;};c.t+=dt;
    if(c.ph==='idle'){c.hook=Math.max(0,c.hook-dt/2);if(c.unlTr!=null){const fs=Port.freightOf(s),t=Trains.list.find(q=>q.id===c.unlTr);if(!t||!fs||t.atSt!==fs.id){c.unl=null;c.unlTr=null;}}/* the train has left the staithe (not just drawing up): a new visit starts afresh */const w=this.work(s);if(w){let car=w.cars[0];for(const q of w.cars)if(Math.abs(q.lx-c.gx)<Math.abs(car.lx-c.gx))car=q;c.task={tr:w.T.tr,w:car.w,lx:car.lx,y:car.y};c.ph='out';}
      else{const f=this.fillWork(s);if(f){c.task={tr:f.T.tr,w:f.car.w,lx:f.car.lx,y:f.car.y,fill:true};c.atH=true;c.ph='fdown';}else{mv('gx',20,1.8);mv('crabY',H.min,2.2);}}}
    /* filling (4.57): down into the receiving hopper, bite from the import stock, up, out over the hopper wagon, down, open, up */
    else if(c.ph==='fdown'){const a=mv('gx',20,1.8),b=mv('crabY',H.min,2.2);if(a&&b){c.hook=Math.min(1,c.hook+dt/2.5);if(c.hook>=1){c.ph='fbite';c.t=0;}}}
    else if(c.ph==='fbite'){if(c.t>0.9){const w=c.task.w,t=w.ctype,n=Math.min(4,c.imp[t]||0,20-(w.n||0));c.imp[t]=Math.max(0,(c.imp[t]||0)-n);c.grab={type:t,n};c.ph='fup';}}
    else if(c.ph==='fup'){c.hook=Math.max(0,c.hook-dt/2.5);if(c.hook<=0){c.ph='fout';c.atH=false;}}
    else if(c.ph==='fout'){const a=mv('gx',c.task.lx,1.8),b=mv('crabY',H.max,2.2);if(a&&b)c.ph='fdrop';}
    else if(c.ph==='fdrop'){c.hook=Math.min(1,c.hook+dt/2.5);if(c.hook>=1){c.ph='fopen';c.t=0;}}
    else if(c.ph==='fopen'){if(c.t>0.3&&c.grab){const g=c.grab,w=c.task.w,tr=c.task.tr,gone=!tr||!Trains.list.includes(tr)||!tr.veh.includes(w);c.grab=null;
        if(gone)c.imp[g.type]=(c.imp[g.type]||0)+g.n;else{const o=Port.P(s,c.task.lx,H.max,4);w.n=Math.min(20,(w.n||0)+g.n);w.fx=o[0];w.fz=o[2];w.from=this.key(s);
          if(P.smoke&&near)for(let k=0;k<6;k++){const q=Port.P(s,c.task.lx+(Math.random()-0.5)*2,H.max+(Math.random()-0.5)*1.5,5);Particles.spawn(q[0],q[1],q[2],0,-2,0,1.2,0.3,1.4,0);}}}
      if(c.t>1.2)c.ph='fup2';}
    else if(c.ph==='fup2'){c.hook=Math.max(0,c.hook-dt/2.5);if(c.hook<=0){c.task=null;c.ph='idle';}}
    else if(c.ph==='out'){const a=mv('gx',c.task.lx,1.8),b=mv('crabY',H.max,2.2);if(a&&b){c.ph='down';}}
    else if(c.ph==='down'){c.hook=Math.min(1,c.hook+dt/2.5);if(c.hook>=1){c.ph='bite';c.t=0;}}
    else if(c.ph==='bite'){if(c.t>0.9){const w=c.task.w,n=Math.min(4,w.n||0);if(c.unlTr!==c.task.tr.id||!c.unl){c.unlTr=c.task.tr.id;c.unl=new Set();}c.unl.add(w);w.n=Math.max(0,(w.n||0)-n);if(w.n<0.5)w.n=0;c.grab={type:w.ctype,n,fx:w.fx,fz:w.fz,from:w.from};c.ph='up';}}
    else if(c.ph==='up'){c.hook=Math.max(0,c.hook-dt/2.5);if(c.hook<=0)c.ph='back';}
    else if(c.ph==='back'){const a=mv('gx',20,1.8),b=mv('crabY',H.min,2.2);if(a&&b){c.ph='open';c.t=0;}}
    else if(c.ph==='open'){if(c.t>0.3&&c.grab){const g=c.grab,st=Port.freightOf(s),o=Port.P(s,20,H.min,6);c.grab=null;
        if(g.n>0){const tr=c.task&&c.task.tr,p0=Goods.lastPay||0;Goods.deliver(st?'st:'+st.id:'port',o[0],o[2],s.v,{[g.type]:{n:g.n,fx:g.fx==null?o[0]:g.fx,fz:g.fz==null?o[2]:g.fz,from:g.from||null}},s.v.name+' Coal Staithe',tr?tr.name:'',true);
          c.stock[g.type]=Math.min(600,(c.stock[g.type]||0)+g.n);if(tr){Ledger.add(tr,'inc',(Goods.lastPay||0)-p0);Ledger.add(tr,'cargo',g.n);}}
        if(P.smoke&&near)for(let k=0;k<6;k++){const w=Port.P(s,20+(Math.random()-0.5)*2,H.min+(Math.random()-0.5)*1.5,7);Particles.spawn(w[0],w[1],w[2],0,-2,0,1.2,0.3,1.4,0);}}
      if(c.t>1.2){c.task=null;c.ph='idle';}}
    // the belt and the shiploader: while there is stock and the collier's holds have room
    /* 4.56: the shiploader fills a collier lying at the berth (js/ships.js) that is loading */
    const sh=typeof Ships!=='undefined'?Ships.at(s):null,stock=this.sum(c.stock),run=stock>0.05&&!!sh&&!sh.unl&&Ships.load(sh)<SHIP.cap;if(run)c.belt=(c.belt+dt*1.5)%1.6;c.run=run;c.hold=sh?Ships.load(sh):0;
    const hs=PORT.ship.hatch;if(c.lT>0&&run){c.lT-=dt;c.pour=1;const a=Math.min(dt*1.2,stock,SHIP.cap-Ships.load(sh));for(const t in c.stock){const q=a*(c.stock[t]||0)/Math.max(stock,1e-6);c.stock[t]=Math.max(0,(c.stock[t]||0)-q);sh.cargo[t]=(sh.cargo[t]||0)+q;}
      if(P.smoke&&near&&Math.random()<dt*6){const w=Port.P(s,c.lx,-8,0.4);Particles.spawn(w[0],w[1],w[2],(Math.random()-0.5),0.6,(Math.random()-0.5),2,0.5,2.2,0);}}
    else{c.pour=0;if(!run)return;const tx=hs[c.lTarget];if(Math.abs(c.lx-tx)<0.05){c.lx=tx;c.lT=25;let n=c.lTarget+c.lDir;if(n<0||n>=hs.length){c.lDir=-c.lDir;n=c.lTarget+c.lDir;}c.lTarget=n;}else c.lx+=Math.sign(tx-c.lx)*Math.min(Math.abs(tx-c.lx),dt*0.6);}},
  // the site's frame as a model matrix (local x along t, z up, y along n), shifted by (dx, dy, dz) in the local frame; sy scales z
  mat(s,dx,dy,dz,sz){const O=Port.P(s,0,0,0),t=s.t,n=s.n;return new Float32Array([t[0],0,t[1],0,0,sz||1,0,0,n[0],0,n[1],0,O[0]+t[0]*dx+n[0]*dy,O[1]+(dz||0),O[2]+t[1]*dx+n[1]*dy,1]);},
  draw(s,p){const M=this.meshes(),c=this.st(s),dm=(m,mat)=>{gl.uniformMatrix4fv(p.u('uModel'),false,mat);gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,0);Stats.draws++;};
    // crab at c.crabY; the grab hangs c.hook of the way down to the wagon (z 3.4 above the deck when down)
    const top=10.67,low=c.task&&c.task.y!=null&&!c.atH?c.task.y+3.0+1.2*Math.min(1,(c.task.w.n||0)/20):3.1,gz=top-0.55-(top-0.55-low)*c.hook,dx=c.gx-20;/* the ropes hang from the crab's sheaves (buildings/harbourworks.js); the grab bottoms on the load */const len=Math.max(0.3,top-gz);dm(M.rope,this.mat(s,dx,c.crabY,top,len));dm(M.grab,this.mat(s,dx,c.crabY,gz));if(c.grab&&c.grab.n>0)dm(M.grabFull,this.mat(s,dx,c.crabY,gz));
    // the belt's coal (while it runs)
    if(c.run){dm(M.lumpsA,this.mat(s,c.belt,0,c.belt*5.6/17));dm(M.lumpsB,this.mat(s,c.belt,0,0));}
    // wagons: the one under the gantry (or rolling), one waiting behind

    /* the crab, the shiploader and the collier are kit models (Port.dynPut) */}};
