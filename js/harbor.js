'use strict';
// ===== harbor.js
// ===================================================================
// THE COAL & ORE HARBOUR (4.48.0, step 1 of 4: site plan and blockout). A compact Victorian harbour terminal from the user's brief:
// a passenger station with a clock tower and a train shed over two through tracks, a freight siding with a portal gantry over a
// receiving hopper, one inclined conveyor up to a belt along the quay, a travelling shiploader on two quay rails, warehouses, and a
// collier moored alongside. Every harbour town has a site reserved when the world is made (Port.find, after the coast); the town
// offers the harbour as an upgrade, and once bought the ground is levelled to the deck and the terminal stands there, partly over the
// water on foundations.
// Step 1 draws every structure as a block at its planned place and size (flat colours: the silhouette test of the brief). Later steps:
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
//  5. The back of the site (y ≥ 50: tracks, station) is at least 70 % land, joined over land to its town; the quay side may stand
//     over the water. The deck stands 3 m above the sea. Ground higher than that is cut down to the deck; where it is lower the deck stands on
//     foundations (blocks now; brick piers and timber stilts in step 2).
//  6. The collier is 45 × 9 m, 2 m off the quay; three hatches at x 44, 53, 62; bridge and funnel aft. The shiploader travels x 44..62
//     (all three hatches) and is modelled over the first one.
// ===================================================================
const PORT={W:120,D:90,water:40,deck:3,quayW:15,cost:150000,
  ship:{x0:37.5,x1:82.5,y0:-11,y1:-2,hatch:[44,53,62]},loader:{x:44,min:44,max:62,rails:[2,12],railX:[34,72]},crab:{y:22.5,min:15.5,max:24},
  track:{pass:[58,64],freight:24,freightEnd:56},
  // colour zones (flat tones: the blockout's silhouette colours)
  C:{brick:[0.62,0.3,0.24],slate:[0.36,0.39,0.43],iron:[0.17,0.18,0.2],stone:[0.6,0.59,0.55],yard:[0.47,0.45,0.41],track:[0.24,0.22,0.2],
    ware:[0.55,0.33,0.26],hull:[0.12,0.12,0.13],cream:[0.9,0.86,0.74],coal:[0.08,0.08,0.09],found:[0.45,0.38,0.32],belt:[0.3,0.3,0.32],plat:[0.7,0.68,0.62]},
  B:[
    // ground and quay
    ['Quay_Deck',0,120,0,15,-0.6,0,'stone'],['Yard_Deck',0,120,15,90,-0.6,0,'yard'],['Quay_Wall',0,120,-0.7,0,-7,0,'stone'],
    // railway (blocks for now): two passenger tracks straight through, the freight siding from the west to its buffer
    ['Track_Passenger_01',0,120,56.6,59.4,0,0.35,'track'],['Track_Passenger_02',0,120,62.6,65.4,0,0.35,'track'],['Track_Freight_01',0,56,22.6,25.4,0,0.35,'track'],['Track_Freight_Buffer',55,57,22.4,25.6,0,1.2,'iron'],
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
    const towns=[...new Set(Coast.H.map(h=>h.v))];
    for(const v of towns){let best=null;
      for(let a=0;a<64;a++){const dx=Math.cos(a/64*6.2832),dz=Math.sin(a/64*6.2832);let prev=false;
        for(let r=(v.R||50)+40;r<1600;r+=8){const x=v.x+dx*r,z=v.z+dz*r;if(x<200||z<200||x>W-200||z>W-200)break;const wet=Hs(x,z)<sea-0.3;if(!wet){prev=false;continue;}if(prev)continue;prev=true;
          // the shore crossing at (x,z): its seaward direction from the water around it
          let sx=0,sz=0;for(let b=0;b<24;b++){const ca=Math.cos(b*0.2618),sa=Math.sin(b*0.2618);if(Hs(x+ca*60,z+sa*60)<sea-0.3){sx+=ca;sz+=sa;}}const sl=Math.hypot(sx,sz);if(sl<3)continue;
          const n=[-sx/sl,-sz/sl],t=[-n[1],n[0]];/* n: inland */
          // move the quay face out until the berth is deep enough
          for(let o=-6;o<=36;o+=3){const qx=x-n[0]*o,qz=z-n[1]*o,s={x:qx,z:qz,t,n,v,deckY:deck};let ok=true,cut=0,low=0;
            for(let lx=36;lx<=84&&ok;lx+=6)for(const ly of [-3,-6.5,-10])if(Hs(...this.xz(s,lx,ly))>sea-4.5){ok=false;break;}
            if(!ok)continue;
            for(let lx=0;lx<=PORT.W&&ok;lx+=10)for(let ly=0;ly<=PORT.D;ly+=10){const g=Hs(...this.xz(s,lx,ly));if(g>deck+6){ok=false;break;}cut+=Math.max(0,g-deck);if(g<deck-1)low++;}
            if(!ok)continue;
            // the back (the tracks and the station, y ≥ 50) must stand mostly on land, and that land on the town's own island: the line
            // from the town to the back of the site stays on land (trains have to get there)
            {let n=0,nl=0;for(let lx=0;lx<=PORT.W;lx+=10)for(let ly=50;ly<=PORT.D;ly+=10){n++;if(Hs(...this.xz(s,lx,ly))>sea+0.5)nl++;}if(nl<n*0.7)continue;
              const b=this.xz(s,PORT.W/2,PORT.D),L=Math.hypot(b[0]-v.x,b[1]-v.z);let wet=0;for(let k=1;k<20;k++){const f=k/20;if(Hs(v.x+(b[0]-v.x)*f,v.z+(b[1]-v.z)*f)<sea+0.2)wet++;}if(wet>1||L>1700)continue;}
            const cs=this.cornersOf(s),bad=Life.houses.some(h=>h.fixed&&!h.gone&&this.inside(s,h.x,h.z,10))||(Life.mines||[]).some(m=>this.inside(s,m.x,m.z,30))||Coast.H.some(h=>this.inside(s,h.x,h.z,25))||Coast.L.some(l=>this.inside(s,l.x,l.z,25))||this.S.some(o=>Math.hypot(o.x-s.x,o.z-s.z)<260)||cs.some(c=>c[0]<60||c[1]<60||c[0]>W-60||c[1]>W-60);
            if(bad)continue;const sc=cut*0.6+low*0.4+r*0.02;if(!best||sc<best.sc)best={...s,sc,cut};break;}}}
      if(best)this.S.push(best);}
    Log.info(`harbour: ${this.S.length} terminal sites for ${towns.length} harbour towns`+this.S.map(s=>` · ${s.v.name} (${s.x.toFixed(0)},${s.z.toFixed(0)}${s.cut>0?', cut '+s.cut.toFixed(0):''})`).join(''));},
  xz(s,x,y){const p=this.P(s,x,y,0);return[p[0],p[2]];},
  cornersOf(s){return[[0,-PORT.water],[PORT.W,-PORT.water],[PORT.W,PORT.D],[0,PORT.D]].map(([x,y])=>this.xz(s,x,y));},
  // ---- bought: the ground under the deck levelled, houses and trees there gone, the terminal built (also after loading a save)
  build(s){if(s.built)return;const T=App.T,N=T.N,cs=T.cs,cr=this.cornersOf(s),x0=Math.min(...cr.map(c=>c[0]))-12,x1=Math.max(...cr.map(c=>c[0]))+12,z0=Math.min(...cr.map(c=>c[1]))-12,z1=Math.max(...cr.map(c=>c[1]))+12;
    const i0=Math.max(0,Math.floor(x0/cs)),i1=Math.min(N-1,Math.ceil(x1/cs)),j0=Math.max(0,Math.floor(z0/cs)),j1=Math.min(N-1,Math.ceil(z1/cs)),top=s.deckY-0.7,M=10;
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const [lx,ly]=this.local(s,i*cs,j*cs),o=Math.hypot(Math.max(0,-lx,lx-PORT.W),Math.max(0,-ly,ly-PORT.D));if(o>M||ly<-2)continue;
      const k=j*N+i,h=T.Hr[k];if(h<=top)continue;const w=o<=0?1:1-(o/M)*(o/M)*(3-2*o/M);T.Hr[k]=h+(top-h)*w;}
    R.patchTerrain(T,i0,j0,i1,j1);R.dryWater(T,i0,j0,i1,j1);
    for(const h of Life.houses)if(!h.gone&&this.inside(s,h.x,h.z,6))h.gone=true;
    if(R.clearVegRect){const c=this.P(s,PORT.W/2,PORT.D/2-PORT.water/2,0);R.clearVegRect(T,{x:c[0],z:c[2],a:Math.atan2(s.t[1],s.t[0]),x0:-PORT.W/2-6,x1:PORT.W/2+6,z0:-(PORT.D+PORT.water)/2-6,z1:(PORT.D+PORT.water)/2+6},2);}
    this.tracks(s);s.built=true;this.meshes.delete(s);Life.uploaded=false;Life.roadsDirty=true;},
  // the two passenger tracks (straight through, x 0 → 120) and the freight siding (from the west to its buffer) as real track at deck
  // height: the player's lines join their free ends; saved with the rest of the track (tagged port:<site>), so they are made once
  tracks(s){const key=Math.round(s.x)+','+Math.round(s.z);if(Track.segs.some(g=>g.port===key))return;const h=Math.atan2(s.t[1],s.t[0]),y=s.deckY+0.25;/* the track bed lies on the deck */
    for(const [ly,x1] of [[PORT.track.pass[0],PORT.W],[PORT.track.pass[1],PORT.W],[PORT.track.freight,PORT.track.freightEnd]]){const a0=this.xz(s,0,ly),b0=this.xz(s,x1,ly),L=Math.hypot(b0[0]-a0[0],b0[1]-a0[1]);
      const a={id:Track.nextId++,x:a0[0],z:a0[1],y,h:wrapPi(h+Math.PI),g:0},b={id:Track.nextId++,x:b0[0],z:b0[1],y,h:wrapPi(h),g:0};Track.nodes.push(a,b);
      Track.segs.push({id:Track.nextId++,a:a.id,b:b.id,x0:a0[0],z0:a0[1],h0:h,k:0,L,y0:y,y1:y,g0:0,g1:0,spans:[],port:key});}
    Net.changed();App.trackChanged();},
  update(){const T=App.T;if(!T||T.sea==null||!Coast.T||Coast.T!==T)return;const key=Coast.key;if(key!==this.key){this.key=key;this.find();}for(const s of this.S)if(s.v.portOwned&&!s.built)this.build(s);},
  // ---- the blockout mesh of a site (world coordinates): flat-coloured blocks from the schedule, and foundation blocks under the deck
  // where the ground (or the sea floor) lies lower
  mesh(s){let m=this.meshes.get(s);if(m)return m;const M=vmesh(),C=PORT.C,T=App.T;
    const W=(x,y,z)=>this.P(s,x,y,z),Nv=(nx,ny,nz)=>[s.t[0]*nx+s.n[0]*ny,nz,s.t[1]*nx+s.n[1]*ny],q=(a,b,c,d,n,col)=>vq(M,a,b,c,d,n,col,3);
    const box=(x0,x1,y0,y1,z0,z1,col)=>{const p=(x,y,z)=>W(x,y,z);
      q(p(x0,y0,z1),p(x1,y0,z1),p(x1,y1,z1),p(x0,y1,z1),Nv(0,0,1),col);q(p(x0,y1,z0),p(x1,y1,z0),p(x1,y0,z0),p(x0,y0,z0),Nv(0,0,-1),col);
      q(p(x0,y0,z0),p(x1,y0,z0),p(x1,y0,z1),p(x0,y0,z1),Nv(0,-1,0),col);q(p(x1,y1,z0),p(x0,y1,z0),p(x0,y1,z1),p(x1,y1,z1),Nv(0,1,0),col);
      q(p(x1,y0,z0),p(x1,y1,z0),p(x1,y1,z1),p(x1,y0,z1),Nv(1,0,0),col);q(p(x0,y1,z0),p(x0,y0,z0),p(x0,y0,z1),p(x0,y1,z1),Nv(-1,0,0),col);};
    const tri=(a,b,c,n,col)=>q(a,b,c,c,n,col);
    const ARCH=/^(Quay_|Yard_|Track_Passenger|Track_Freight_01$|Platform_|Station_|Warehouse_)/;/* step 2: these are built in detail by PortArch */
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
    PortArch.build({box,q,tri,W,Nv,ground,C,col:(z)=>C[z]});
    m=R.uploadVeh(M);this.meshes.set(s,m);return m;},
  draw(p,pass){if(!this.S.length)return;const cp=Cam.pos||[0,0,0];for(const s of this.S){if(!s.built||Math.hypot(s.x-cp[0],s.z-cp[2])>(pass===1?600:5000))continue;const m=this.mesh(s);
      gl.uniformMatrix4fv(p.u('uModel'),false,M4.ident());gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,0);Stats.draws++;}},
  // where the player can drop the camera to look at a site (tests, the map)
  centre(s){const c=this.P(s,PORT.W/2,PORT.D/2-10,0);return c;}};

// ---- the architecture of the harbour (step 2): built in the site's local frame with the helpers of Port.mesh. Flat-toned colours by
// zone (red brick station, slate and iron shed, grey stone quay, brown warehouses), simple shapes that read from a distance.
const PortArch={
  build(h){const {box,q,tri,W,Nv,ground,C}=h,K=PORT,self=this;
    const brick=C.brick,brick2=[0.55,0.26,0.21],stone=[0.74,0.71,0.64],stone2=[0.62,0.6,0.55],slate=C.slate,iron=C.iron,glass=[0.5,0.6,0.66],dark=[0.12,0.13,0.15],timber=[0.32,0.24,0.17],paving=[0.5,0.48,0.44],white=[0.93,0.92,0.88];
    const quad=(a,b,c,d,n,col)=>q(W(...a),W(...b),W(...c),W(...d),Nv(...n),col);
    // a beam between two local points (w wide, t thick)
    const beam=(p0,p1,w,t,col)=>{const d=[p1[0]-p0[0],p1[1]-p0[1],p1[2]-p0[2]],l=Math.hypot(...d)||1,u=d.map(v=>v/l);let sx=[u[1],-u[0],0];let sl=Math.hypot(...sx);if(sl<1e-3){sx=[1,0,0];sl=1;}sx=sx.map(v=>v/sl);
      const up=[u[1]*sx[2]-u[2]*sx[1],u[2]*sx[0]-u[0]*sx[2],u[0]*sx[1]-u[1]*sx[0]],P=(p,a,b)=>[p[0]+sx[0]*a+up[0]*b,p[1]+sx[1]*a+up[1]*b,p[2]+sx[2]*a+up[2]*b],hw=w/2,ht=t/2;
      for(const [a1,b1,a2,b2,n] of [[-hw,ht,hw,ht,up],[hw,-ht,-hw,-ht,up.map(v=>-v)],[hw,ht,hw,-ht,sx],[-hw,-ht,-hw,ht,sx.map(v=>-v)]])quad(P(p0,a1,b1),P(p0,a2,b2),P(p1,a2,b2),P(p1,a1,b1),n,col);};
    // a window on a wall facing ±y (fy) or ±x (fx): a dark pane with a round-arched head, a stone sill and head
    const win=(face,c,z0,z1,w,arched)=>{const o=0.06,hw=w/2,top=arched?z1-hw:z1;
      const pt=(u,z)=>face.ax==='y'?[c+u*face.s,face.p-face.s2*o,z]:[face.p-face.s2*o,c+u*face.s,z],nn=face.ax==='y'?[0,-face.s2,0]:[-face.s2,0,0];
      quad(pt(-hw,z0),pt(hw,z0),pt(hw,top),pt(-hw,top),nn,dark);
      if(arched){const n=6;for(let k=0;k<n;k++){const a0=Math.PI*k/n,a1=Math.PI*(k+1)/n;tri(W(...pt(0,top)),W(...pt(hw*Math.cos(a0),top+hw*Math.sin(a0))),W(...pt(hw*Math.cos(a1),top+hw*Math.sin(a1))),Nv(...nn),dark);}}
      const sill=face.ax==='y'?[c-hw-0.15,c+hw+0.15,face.p-face.s2*0.18,face.p,z0-0.18,z0]:null;if(sill)box(sill[0],sill[1],Math.min(sill[2],sill[3]),Math.max(sill[2],sill[3]),sill[4],sill[5],stone);};
    const gable=(x0,x1,y0,y1,z0,z1,col,alongY)=>{const ym=(y0+y1)/2,xm=(x0+x1)/2;
      if(!alongY){const ny=Math.hypot(z1-z0,(y1-y0)/2);quad([x0,y0,z0],[x1,y0,z0],[x1,ym,z1],[x0,ym,z1],[0,-(z1-z0)/ny,((y1-y0)/2)/ny],col);quad([x1,y1,z0],[x0,y1,z0],[x0,ym,z1],[x1,ym,z1],[0,(z1-z0)/ny,((y1-y0)/2)/ny],col);
        tri(W(x0,y1,z0),W(x0,y0,z0),W(x0,ym,z1),Nv(-1,0,0),col);tri(W(x1,y0,z0),W(x1,y1,z0),W(x1,ym,z1),Nv(1,0,0),col);}
      else{const nx=Math.hypot(z1-z0,(x1-x0)/2);quad([x0,y1,z0],[x0,y0,z0],[xm,y0,z1],[xm,y1,z1],[-(z1-z0)/nx,0,((x1-x0)/2)/nx],col);quad([x1,y0,z0],[x1,y1,z0],[xm,y1,z1],[xm,y0,z1],[(z1-z0)/nx,0,((x1-x0)/2)/nx],col);
        tri(W(x0,y0,z0),W(x1,y0,z0),W(xm,y0,z1),Nv(0,-1,0),col);tri(W(x1,y1,z0),W(x0,y1,z0),W(xm,y1,z1),Nv(0,1,0),col);}};
    const cyl=(x,y,z0,z1,r,col,n)=>{n=n||8;for(let k=0;k<n;k++){const a0=k/n*6.2832,a1=(k+1)/n*6.2832;quad([x+Math.cos(a0)*r,y+Math.sin(a0)*r,z0],[x+Math.cos(a1)*r,y+Math.sin(a1)*r,z0],[x+Math.cos(a1)*r,y+Math.sin(a1)*r,z1],[x+Math.cos(a0)*r,y+Math.sin(a0)*r,z1],[Math.cos(a0+Math.PI/n),Math.sin(a0+Math.PI/n),0],col);}
      for(let k=0;k<n;k++){const a0=k/n*6.2832,a1=(k+1)/n*6.2832;tri(W(x,y,z1),W(x+Math.cos(a0)*r,y+Math.sin(a0)*r,z1),W(x+Math.cos(a1)*r,y+Math.sin(a1)*r,z1),Nv(0,0,1),col);}};
    const disc=(x,y,z,r,col,face)=>{const n=16;for(let k=0;k<n;k++){const a0=k/n*6.2832,a1=(k+1)/n*6.2832,P=(a)=>face==='y-'?[x+Math.cos(a)*r,y,z+Math.sin(a)*r]:face==='y+'?[x-Math.cos(a)*r,y,z+Math.sin(a)*r]:face==='x-'?[x,y-Math.cos(a)*r,z+Math.sin(a)*r]:[x,y+Math.cos(a)*r,z+Math.sin(a)*r];
      tri(W(x,y,z),W(...P(a0)),W(...P(a1)),Nv(...(face==='y-'?[0,-1,0]:face==='y+'?[0,1,0]:face==='x-'?[-1,0,0]:[1,0,0])),col);}};

    // ---- deck: the quay paving (stone, a coping along the edge) and the yard; a fascia round the open edges
    box(0,K.W,0,K.quayW,-0.6,0,stone2);box(0,K.W,0,0.7,0,0.12,stone);box(0,K.W,K.quayW,K.D,-0.6,0,paving);
    for(let y=K.quayW+10;y<K.D;y+=10)box(0,K.W,y-0.05,y+0.05,0,0.01,[0.44,0.42,0.39]);
    // ---- the quay wall: stone courses down to below the water, timber fenders, ladders, bollards, lamps
    for(let z=-7,k=0;z<0;z+=0.9,k++)box(0,K.W,-0.7,0,z,Math.min(0,z+0.9),k%2?stone:stone2);
    for(let x=2;x<K.W;x+=4)box(x-0.18,x+0.18,-1.05,-0.7,-6.5,0.35,timber);
    for(const x of [9,51,93])for(const dx of [-0.25,0.25])box(x+dx-0.04,x+dx+0.04,-0.78,-0.7,-6,0.1,iron);
    for(const x of [9,51,93])for(let z=-5.6;z<0;z+=0.35)box(x-0.25,x+0.25,-0.8,-0.72,z,z+0.04,iron);
    for(let x=5;x<K.W;x+=10){cyl(x,1.1,0,0.55,0.28,iron,8);cyl(x,1.1,0.55,0.72,0.36,iron,8);}
    for(let x=10;x<K.W;x+=20){box(x-0.1,x+0.1,14.3,14.5,0,4.6,iron);box(x-0.3,x+0.3,14.1,14.7,4.6,5.3,[0.95,0.88,0.6]);box(x-0.35,x+0.35,14.05,14.75,5.3,5.45,iron);}
    // ---- foundations where the ground (or the sea floor) lies below the deck: brick piers under the quay (they carry the rails and
    // the shiploader), timber stilts with cross braces under the yard; beams under the deck between them
    for(let x=0;x<=K.W;x+=10)for(let y=0;y<=K.D;y+=10){const g=ground(Math.min(K.W-0.5,Math.max(0.5,x)),Math.min(K.D-0.5,Math.max(0.5,y)));if(g>-1.2)continue;const zb=g-0.6;
      if(y<=20){box(x-0.9,x+0.9,y-0.9,y+0.9,zb,-1.3,brick2);box(x-1.1,x+1.1,y-1.1,y+1.1,-1.3,-0.6,stone);}
      else{for(const [dx,dy] of [[-0.9,-0.9],[0.9,-0.9],[-0.9,0.9],[0.9,0.9]])box(x+dx-0.2,x+dx+0.2,y+dy-0.2,y+dy+0.2,zb,-0.6,timber);
        if(-0.6-zb>2){beam([x-0.9,y-0.9,zb+0.6],[x+0.9,y-0.9,-1.2],0.15,0.15,timber);beam([x-0.9,y+0.9,-1.2],[x+0.9,y+0.9,zb+0.6],0.15,0.15,timber);}}
      if(x<K.W&&ground(Math.min(K.W-0.5,x+5),Math.min(K.D-0.5,Math.max(0.5,y)))<-1.2)box(x,x+10,y-0.3,y+0.3,-1.4,-0.6,y<=20?stone2:timber);}
    // ---- platforms (stone edge, paved top) along the passenger tracks, under the shed
    for(const [y0,y1,edge] of [[53.6,56.3,56.3],[65.7,70,65.7]]){box(30,90,y0,y1,0,0.85,paving);box(30,90,Math.min(edge,edge+(edge===y1?-0.45:0.45)),Math.max(edge,edge+(edge===y1?-0.45:0.45)),0.85,0.95,stone);}
    // ---- the train shed: iron columns every 6 m, a truss over each pair, the roof slate low down and glazed above, a raised lantern
    // along the ridge, glazed gable screens over the open ends
    const sx0=30,sx1=90,sy0=50,sy1=74,ez=9,rz=15,ym=(sy0+sy1)/2;
    for(let x=sx0;x<=sx1+0.01;x+=6){for(const y of [sy0+0.3,sy1-0.3])box(x-0.2,x+0.2,y-0.2,y+0.2,0,ez,iron);
      beam([x,sy0+0.3,ez],[x,ym,rz-0.3],0.2,0.35,iron);beam([x,sy1-0.3,ez],[x,ym,rz-0.3],0.2,0.35,iron);beam([x,sy0+0.3,ez],[x,sy1-0.3,ez],0.15,0.2,iron);
      for(const f of [0.33,0.66]){const ya=sy0+0.3+(ym-sy0-0.3)*f,za=ez+(rz-0.3-ez)*f,yb=sy1-0.3-(sy1-0.3-ym)*f;beam([x,ya,ez],[x,ya,za],0.12,0.12,iron);beam([x,yb,ez],[x,yb,za],0.12,0.12,iron);}}
    box(sx0,sx1,sy0,sy0+0.6,ez-0.6,ez,iron);box(sx0,sx1,sy1-0.6,sy1,ez-0.6,ez,iron);
    {const ny=Math.hypot(rz-ez,ym-sy0),nz=(ym-sy0)/ny,nyy=(rz-ez)/ny,mid=0.45;
      for(const sd of [-1,1]){const ye=sd<0?sy0:sy1,yr=(f)=>ye+(ym-ye)*f,zr=(f)=>ez+(rz-ez)*f,n=[0,sd*nyy,nz];
        quad([sx0,yr(0),zr(0)+0.05],[sx1,yr(0),zr(0)+0.05],[sx1,yr(mid),zr(mid)+0.05],[sx0,yr(mid),zr(mid)+0.05],n,slate);
        quad([sx0,yr(mid),zr(mid)+0.05],[sx1,yr(mid),zr(mid)+0.05],[sx1,yr(0.92),zr(0.92)+0.05],[sx0,yr(0.92),zr(0.92)+0.05],n,glass);
        for(let x=sx0+3;x<sx1;x+=3)beam([x,yr(mid),zr(mid)+0.1],[x,yr(0.92),zr(0.92)+0.1],0.08,0.08,iron);}
      gable(sx0,sx1,ym-2.2,ym+2.2,rz-0.4,rz+1.3,slate);box(sx0,sx1,ym-2.2,ym+2.2,rz-1,rz-0.4,glass);}
    for(const x of [sx0,sx1]){const fx=x===sx0?-1:1;for(let k=0;k<8;k++){const f0=k/8,f1=(k+1)/8,ya=sy0+(ym-sy0)*f0,yb=sy0+(ym-sy0)*f1,yc=sy1-(sy1-ym)*f0,yd=sy1-(sy1-ym)*f1,za=ez+(rz-ez)*f0,zb=ez+(rz-ez)*f1;
        quad([x,ya,ez],[x,yb,ez],[x,yb,zb],[x,ya,za],[fx,0,0],glass);quad([x,yd,ez],[x,yc,ez],[x,yc,za],[x,yd,zb],[fx,0,0],glass);}
      box(x-0.15,x+0.15,sy0,sy1,ez-0.6,ez,iron);for(let y=sy0+3;y<sy1;y+=3){const zt=ez+(rz-ez)*(1-Math.abs(y-ym)/(ym-sy0));beam([x,y,ez],[x,y,zt],0.1,0.1,iron);}}
    // ---- the station: two storeys of red brick, a stone plinth, string course and cornice, arched windows front and back, three
    // arched doors to the platform, a slate roof with chimneys, the clock tower in the middle with four faces and a pyramid spire
    const bx0=38,bx1=82,by0=74,by1=90,bz=13;
    box(bx0,bx1,by0,by1,0,bz,brick);box(bx0-0.15,bx1+0.15,by0-0.15,by1+0.15,0,0.9,stone);box(bx0-0.1,bx1+0.1,by0-0.1,by1+0.1,6.2,6.6,stone);box(bx0-0.25,bx1+0.25,by0-0.25,by1+0.25,12.4,13,stone);
    for(let x=bx0+3;x<bx1-1;x+=4){const door=Math.abs(x-60)<1||Math.abs(x-49)<1||Math.abs(x-71)<1;
      win({ax:'y',p:by0,s:1,s2:1},x,door?0.9:2.2,door?5.4:5.2,door?2.6:1.5,true);win({ax:'y',p:by0,s:1,s2:1},x,7.6,11.4,1.4,true);
      win({ax:'y',p:by1,s:1,s2:-1},x,2.2,5.2,1.5,true);win({ax:'y',p:by1,s:1,s2:-1},x,7.6,11.4,1.4,true);}
    for(let y=by0+3;y<by1-1;y+=4)for(const [xx,s2] of [[bx0,1],[bx1,-1]]){win({ax:'x',p:xx,s:1,s2},y,2.2,5.2,1.5,true);win({ax:'x',p:xx,s:1,s2},y,7.6,11.4,1.4,true);}
    gable(bx0-0.4,bx1+0.4,by0-0.4,by1+0.4,bz,18,slate);
    for(const x of [43,51,69,77]){box(x-0.6,x+0.6,by0+5,by0+6.4,15,19.4,brick);box(x-0.75,x+0.75,by0+4.85,by0+6.55,19.4,19.7,stone);}
    {const tx0=57,tx1=63,ty0=81,ty1=87,tc=60,tyc=84;box(tx0,tx1,ty0,ty1,bz,21.5,brick);box(tx0-0.3,tx1+0.3,ty0-0.3,ty1+0.3,21.5,22,stone);
      for(const [f,x,y] of [['y-',tc,ty0-0.05],['y+',tc,ty1+0.05],['x-',tx0-0.05,tyc],['x+',tx1+0.05,tyc]]){disc(x,y,19,1.5,dark,f);disc(f==='y-'?x:f==='y+'?x:f==='x-'?x-0.03:x+0.03,f==='y-'?y-0.03:f==='y+'?y+0.03:y,19,1.32,white,f);
        const hp=(dx,dz)=>f[0]==='y'?[x+dx*(f==='y-'?1:-1),y+(f==='y-'?-0.06:0.06),19+dz]:[x+(f==='x-'?-0.06:0.06),y+dx*(f==='x-'?-1:1),19+dz];beam(hp(0,0),hp(0,1.0),0.12,0.04,dark);beam(hp(0,0),hp(0.7,0),0.1,0.04,dark);}
      const n=4,pyr=(a,b,c)=>tri(W(...a),W(...b),W(...c),Nv(...[(a[0]+b[0])/2-tc,(a[1]+b[1])/2-tyc,2].map((v,i,A)=>v/Math.hypot(...A))),slate);
      const top=[tc,tyc,25.5];pyr([tx0-0.3,ty0-0.3,22],[tx1+0.3,ty0-0.3,22],top);pyr([tx1+0.3,ty0-0.3,22],[tx1+0.3,ty1+0.3,22],top);pyr([tx1+0.3,ty1+0.3,22],[tx0-0.3,ty1+0.3,22],top);pyr([tx0-0.3,ty1+0.3,22],[tx0-0.3,ty0-0.3,22],top);
      beam([tc,tyc,25.4],[tc,tyc,27],0.12,0.12,iron);void n;}
    // a glazed iron canopy over the street entrance (behind the station, y 90+)
    box(50,70,by1,by1+3.5,4.6,4.8,glass);for(let x=50;x<=70;x+=5)box(x-0.1,x+0.1,by1+3.3,by1+3.5,0,4.6,iron);
    // ---- warehouses: brick on a stone plinth, loading doors to the yard (south), a row of small windows above, a hoist beam, slate roof
    for(const [x0,x1,y0,y1,z1,rz2,floors] of [[74,96,22,40,9,11.5,2],[98,118,22,44,10,12.5,3],[2,18,34,50,8,10,2]]){
      box(x0,x1,y0,y1,0,z1,brick2);box(x0-0.12,x1+0.12,y0-0.12,y1+0.12,0,0.8,stone);box(x0-0.1,x1+0.1,y0-0.1,y1+0.1,z1-0.35,z1,stone);
      const fl=z1/floors;for(let x=x0+2.5;x<x1-1.5;x+=4.5){win({ax:'y',p:y0,s:1,s2:1},x,0.8,4.2,2.6,false);box(x-1.3,x+1.3,y0-0.08,y0,0.8,4.2,timber);
        for(let f=1;f<floors;f++)win({ax:'y',p:y0,s:1,s2:1},x,f*fl+1,f*fl+fl-1.2,1.1,true);}
      for(let y=y0+3;y<y1-1;y+=4.5)for(let f=0;f<floors;f++)win({ax:'x',p:x0,s:1,s2:1},y,f*fl+1.2,f*fl+fl-1.2,1.1,true);
      const xm=(x0+x1)/2;box(xm-0.15,xm+0.15,y0-1.6,y0,z1-1.2,z1-0.8,timber);box(xm-0.05,xm+0.05,y0-1.45,y0-1.35,z1-3,z1-1.2,iron);
      gable(x0-0.3,x1+0.3,y0-0.3,y1+0.3,z1,rz2,slate,true);}
    void self;}};
