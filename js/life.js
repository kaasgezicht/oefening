'use strict';
// ===== life.js
// ===================================================================
// LIFE — little villages along a street with gardens and lamp posts, patchwork farm fields,
// windmills that turn into the wind, chimneys that smoke, people who stroll, wait on the platform
// and ride the trains, sheep and cows in the pastures, ducks, swans and boats on the lakes, flocks of birds.
// ===================================================================
const bzP=(s,t)=>{const u=1-t,a=u*u*u,b=3*u*u*t,c=3*u*t*t,d=t*t*t;return[a*s[0]+b*s[2]+c*s[4]+d*s[6],a*s[1]+b*s[3]+c*s[5]+d*s[7]];};
const bzD=(s,t)=>{const u=1-t;return[3*u*u*(s[2]-s[0])+6*u*t*(s[4]-s[2])+3*t*t*(s[6]-s[4]),3*u*u*(s[3]-s[1])+6*u*t*(s[5]-s[3])+3*t*t*(s[7]-s[5])];};
const VILLAGE_NAMES=['Dalwijk','Hoogveld','Meerhaven','Dennenburg','Steenrijk','Valkendal','Wolkentop','Rietmeer','Molendorp','Beekhuizen','Lindeloo','Zonnedal','Eikenrode','Klaverveen','Hazelbroek','Bergen','Wilgendaal','Heidegoor','Ganzenmeer','Rozendaal','Mosveld','Elzenhoek','Kievitsdal','Berkelhout','Vossenberg','Sterrenwoud','Duivenrode','Lisserbroek'];
const HOUSE_W=[[0,0.3],[1,0.22],[2,0.14],[4,0.08],[5,0.26]];
// plot rectangles (local x0..x1 / z0..z1 around x,z turned by a; front = -z) and segment distance, shared by generation and growth
const VG={rectOf(x,z,a,def){const p=def.plot||{x0:-def.r,x1:def.r,z0:-def.r,z1:def.r};return{x,z,a,x0:p.x0,x1:p.x1,z0:p.z0,z1:p.z1};},
  corners(Q){const c=Math.cos(Q.a),s=Math.sin(Q.a);return[[Q.x0,Q.z0],[Q.x1,Q.z0],[Q.x1,Q.z1],[Q.x0,Q.z1]].map(([u,w])=>[Q.x+c*u-s*w,Q.z+s*u+c*w]);},
  inRect(Q,x,z,m){const c=Math.cos(Q.a),s=Math.sin(Q.a),dx=x-Q.x,dz=z-Q.z,u=c*dx+s*dz,w=-s*dx+c*dz;return u>Q.x0-m&&u<Q.x1+m&&w>Q.z0-m&&w<Q.z1+m;},
  rectHit(A2,B2){const ca=VG.corners(A2),cb=VG.corners(B2);for(const Q of [A2,B2]){const c=Math.cos(Q.a),s=Math.sin(Q.a);for(const ax of [[c,s],[-s,c]]){let a0=1e9,a1=-1e9,b0=1e9,b1=-1e9;
      for(const p of ca){const d=p[0]*ax[0]+p[1]*ax[1];a0=Math.min(a0,d);a1=Math.max(a1,d);}for(const p of cb){const d=p[0]*ax[0]+p[1]*ax[1];b0=Math.min(b0,d);b1=Math.max(b1,d);}if(a1+0.6<b0||b1+0.6<a0)return false;}}return true;},
  gateOf(x,z,a,def){const c=Math.cos(a),s=Math.sin(a),u=def.gx,w=def.plot.z0;return[x+c*u-s*w,z+s*u+c*w];},
  segDist(sg,x,z){const ex=sg[2]-sg[0],ez=sg[3]-sg[1],ll=ex*ex+ez*ez||1e-6,t=clamp(((x-sg[0])*ex+(z-sg[1])*ez)/ll,0,1),px=sg[0]+ex*t,pz=sg[1]+ez*t;return[Math.hypot(x-px,z-pz),px,pz];}};
const Life={stClean:new Map(),tclear:new Float32Array(256*256),tcAcc:0,roadClear:1,shovel:[],farm:{season:null,jobs:[],tr:[]},villages:[],houses:[],mills:[],lamps:[],walkers:[],sk:{groups:[],game:null},sledP:[],sledH:null,vRoads:[],roads:[],stRoads:{},roadsDirty:true,animals:[],swimmers:[],boats:[],flocks:[],T:null,uploaded:false,stInfo:[],spawnT:0,
  // ---------------- generation (deterministic from the seed)
  generate(T){const t0=performance.now();this.T=T;const N=T.N,cs=T.cs,W=T.W,rng=mulberry32((P.seed|0)*31+77);
    if(!T.vegOrig)T.vegOrig={trees:T.veg.trees.map(a=>a.slice()),rocks:T.veg.rocks.slice()};
    const veg={trees:T.vegOrig.trees.map(a=>Array.from(a)),rocks:Array.from(T.vegOrig.rocks)};
    T.flatMask=null;R.computeRenderHeights(T);
    const H=(x,z)=>R.sampleHr(T,x,z),wet=(x,z)=>{const w=sampleWater(T,x,z);return w[1]>0&&w[0]>H(x,z)-0.6;};
    const onTrack=(x,z)=>{const M=T.trackMask;if(!M)return false;const i=clamp((x/cs)|0,0,N-1),j=clamp((z/cs)|0,0,N-1);return M[j*N+i]>0;};
    const flatMask=new Uint8Array(N*N),flatH=new Float32Array(N*N),fieldId=new Uint8Array(N*N),path=new Uint8Array(N*N);
    const clearZones=[];// [x,z,r]
    this.buildStreamGrid();this.building=[];this.links=[];
    this.villages=[];this.houses=[];this.mills=[];this.lamps=[];this.vRoads=[];this.stRoads={};this.roadsDirty=true;this.sledH=null;this.sledP=[];const fields=[];
    // --- lakes as connected areas (for lakeside villages, beaches and steamers)
    {const comp=new Int32Array(N*N).fill(-1),lakes=[],isL=n=>T.water[n*4+3]>0&&T.shore[n]>=0.99;for(let n0=0;n0<N*N;n0++){if(comp[n0]>=0||!isL(n0))continue;const id=lakes.length,st=[n0],cells=[];comp[n0]=id;
        while(st.length){const n=st.pop();cells.push(n);const i=n%N,j=(n/N)|0;for(const m of [i>0?n-1:-1,i<N-1?n+1:-1,j>0?n-N:-1,j<N-1?n+N:-1])if(m>=0&&comp[m]<0&&isL(m)){comp[m]=id;st.push(m);}}
        let cx=0,cz=0;for(const n of cells){cx+=(n%N+0.5)*cs;cz+=(((n/N)|0)+0.5)*cs;}lakes.push({id,cells,area:cells.length*cs*cs,cx:cx/cells.length,cz:cz/cells.length,lvl:T.water[cells[0]*4]});}
      this.lakes=lakes;this.lakeComp=comp;}
    const bigLakeAt=(x,z)=>{const c=this.lakeComp[clamp((z/cs)|0,0,N-1)*N+clamp((x/cs)|0,0,N-1)];return c>=0&&this.lakes[c].area>60000;};
    // --- village sites: flat, low, near water, apart
    const cand=[];for(let k=0;k<Math.round(2600*Math.max(1,W*W/(4096*4096)));k++){const x=170+rng()*(W-340),z=170+rng()*(W-340),h=H(x,z);if(h>P.maxHeight*0.5||wet(x,z)||onTrack(x,z))continue;
      let mn=h,mx=h,ok=true;for(let a=0;a<8;a++){const xx=x+Math.cos(a*0.785)*48,zz=z+Math.sin(a*0.785)*48,hh=H(xx,zz);mn=Math.min(mn,hh);mx=Math.max(mx,hh);if(wet(xx,zz))ok=false;}
      if(!ok||mx-mn>16||this.streamNear(x,z,28))continue;let nearW=0;for(let a=0;a<12;a++){if(wet(x+Math.cos(a*0.52)*120,z+Math.sin(a*0.52)*120)){nearW=1;break;}}
      let nearBig=0;for(let a=0;a<16&&!nearBig;a++)for(const r of [110,190])if(bigLakeAt(x+Math.cos(a*0.39)*r,z+Math.sin(a*0.39)*r)){nearBig=1;break;}
      cand.push({x,z,s:(11-(mx-mn))/11+nearW*0.7+nearBig*1.4+(1-h/P.maxHeight)*0.6+rng()*0.7});}
    cand.sort((a,b)=>b.s-a.s);const spacing=320*Math.sqrt(P.villageSize);
    const vWant=Math.round(P.villages*Math.max(1,T.W/4096));for(const c of cand){if(this.villages.length>=vWant)break;if(this.villages.some(v=>Math.hypot(v.x-c.x,v.z-c.z)<spacing))continue;
      this.villages.push({x:c.x,z:c.z,dir:rng()*Math.PI,name:VILLAGE_NAMES[(this.villages.length+(P.seed|0))%VILLAGE_NAMES.length],houses:[],R:(42+rng()*30)*P.villageSize});}
    // the biggest lake gets at least two lakeside villages: shore sites replace the villages that crowd them, or the last one
    {const BL=(this.lakes||[]).slice().sort((a,b)=>b.area-a.area)[0];if(BL&&BL.area>150000&&P.villages>0){const onL=(x,z)=>{for(let a=0;a<16;a++)for(const r of [110,190]){const xx=x+Math.cos(a*0.39)*r,zz=z+Math.sin(a*0.39)*r;if(this.lakeComp[clamp((zz/cs)|0,0,N-1)*N+clamp((xx/cs)|0,0,N-1)]===BL.id)return true;}return false;};
      // candidates all round the shore: march out from the lake centre to dry land, then 80-200 m further, on flat ground
      const shore=[];for(let a=0;a<64;a++){const dx=Math.cos(a*0.0982),dz=Math.sin(a*0.0982);let r=0;while(r<3000){const x=BL.cx+dx*r,z=BL.cz+dz*r;if(x<0||z<0||x>W||z>W)break;const c0=this.lakeComp[clamp((z/cs)|0,0,N-1)*N+clamp((x/cs)|0,0,N-1)];if(c0!==BL.id&&r>20)break;r+=6;}
        for(const d of [80,120,160,200]){const x=BL.cx+dx*(r+d),z=BL.cz+dz*(r+d);if(x<170||z<170||x>W-170||z>W-170||wet(x,z)||onTrack(x,z))continue;const h=H(x,z);let mn=h,mx=h,ok=true;for(let q=0;q<8;q++){const xx=x+Math.cos(q*0.785)*40,zz=z+Math.sin(q*0.785)*40,hh=H(xx,zz);mn=Math.min(mn,hh);mx=Math.max(mx,hh);if(wet(xx,zz))ok=false;}
          if(ok&&mx-mn<12&&onL(x,z)){shore.push({x,z,s:(12-(mx-mn))/12+rng()*0.3});break;}}}
      shore.sort((a,b)=>b.s-a.s);let nL=this.villages.filter(v=>onL(v.x,v.z)).length,moved=0;const ext=rng();for(const c of [...shore,...cand.filter(c=>onL(c.x,c.z))]){if(nL>=2)break;if(this.villages.some(v=>onL(v.x,v.z)&&Math.hypot(v.x-c.x,v.z-c.z)<spacing*0.7))continue;const crowd=this.villages.filter(v=>!onL(v.x,v.z)&&Math.hypot(v.x-c.x,v.z-c.z)<spacing);
        this.villages=this.villages.filter(v=>!crowd.includes(v));if(this.villages.length>=vWant)this.villages.pop();this.villages.push({x:c.x,z:c.z,dir:ext*Math.PI,name:'',houses:[],R:(42+((c.s*977)%1)*30)*P.villageSize});nL++;moved++;}
      if(moved){this.villages.forEach((v,i)=>v.name=VILLAGE_NAMES[(i+(P.seed|0))%VILLAGE_NAMES.length]);Log.info(`${moved} village${moved>1?'s':''} moved to the shore of the biggest lake (${(BL.area/10000).toFixed(0)} ha)`);}}}
    // beach sites: the nearest gently sloping lake shore within 450 m of a village
    for(const v of this.villages){if(rng()>P.beaches)continue;let best=null;for(let a=0;a<36;a++){const dx=Math.cos(a*0.1745),dz=Math.sin(a*0.1745);let px=null,pz=null;
        for(let r=v.R*0.6;r<450;r+=4){const x=v.x+dx*r,z=v.z+dz*r;if(x<20||z<20||x>W-20||z>W-20)break;const c=this.lakeComp[clamp((z/cs)|0,0,N-1)*N+clamp((x/cs)|0,0,N-1)];
          if(c>=0){if(px===null||Math.hypot(px-v.x,pz-v.z)<(v.plaza?v.plaza[2]:0)+14)break;const sl=Math.abs(H(px,pz)-H(px-dx*10,pz-dz*10));if(sl<1.6&&(!best||r<best.r))best={x:px,z:pz,nx:dx,nz:dz,r,lvl:this.lakes[c].lvl};break;}if(wet(x,z))break;px=x;pz=z;}}
      if(best){v.beach=best;clearZones.push([best.x-best.nx*6,best.z-best.nz*6,14]);}}
    // --- houses along a main street and a cross street, fronts to the street
    const fits=(x,z,r)=>{if(x<r+25||z<r+25||x>W-r-25||z>W-r-25)return null;let mn=1e9,mx=-1e9;
      for(let a=0;a<8;a++)for(const rr of [r*0.5,r]){const xx=x+Math.cos(a*0.785)*rr,zz=z+Math.sin(a*0.785)*rr;const hh=H(xx,zz);mn=Math.min(mn,hh);mx=Math.max(mx,hh);if(wet(xx,zz)||onTrack(xx,zz))return null;}
      if(mx-mn>4.5)return null;for(const h of this.houses)if(Math.hypot(h.x-x,h.z-z)<h.r+r+1.5)return null;return(mn+mx)/2;};
    const stampLine=(x0,z0,x1,z1,w)=>{const L=Math.hypot(x1-x0,z1-z0),n=Math.ceil(L/2);for(let k=0;k<=n;k++){const x=x0+(x1-x0)*k/n,z=z0+(z1-z0)*k/n;
      const i0=Math.floor((x-w-4)/cs),i1=Math.ceil((x+w+4)/cs),j0=Math.floor((z-w-4)/cs),j1=Math.ceil((z+w+4)/cs);
      for(let j=Math.max(0,j0);j<=Math.min(N-1,j1);j++)for(let i=Math.max(0,i0);i<=Math.min(N-1,i1);i++){const d=Math.hypot((i+0.5)*cs-x,(j+0.5)*cs-z);const v=Math.round(255*clamp((w+1.5-d)/2.5,0,1));if(v>path[j*N+i]&&!wet((i+0.5)*cs,(j+0.5)*cs))path[j*N+i]=v;}}};
    // plots of the detailed houses: oriented rectangles (local x0..x1 / z0..z1, front = -z), tested against other plots, streets and the square
    const rectOf=VG.rectOf,corners=VG.corners,inRect=VG.inRect,rectHit=VG.rectHit,fitsRect=(Q,streets,v)=>this.fitsRect(Q,streets,v);
    const flatRect=(Q,base)=>{let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const p of corners(Q)){x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);z0=Math.min(z0,p[1]);z1=Math.max(z1,p[1]);}
      for(let j=Math.floor((z0-2)/cs);j<=Math.ceil((z1+2)/cs);j++)for(let i=Math.floor((x0-2)/cs);i<=Math.ceil((x1+2)/cs);i++){if(i<0||j<0||i>=N||j>=N)continue;if(inRect(Q,(i+0.5)*cs,(j+0.5)*cs,1.5)){flatMask[j*N+i]=1;flatH[j*N+i]=base;}}};
    const gateOf=VG.gateOf;
    const pickVariant=(central)=>{let r=rng()*(central?0.85:1),acc=0;for(const [v,w] of HOUSE_W){acc+=w;if(r<acc)return central&&v===2?1:v;}return 5;};
    // --- villages grow organically: a square, a main street and a side street laid along the lie of the land, church and inn on the square,
    // then a hamlet's worth of houses picked one by one by the same rules the village keeps growing by while you play (Life.growHouse)
    // plans after the old village forms of western Europe: a clustered village (Haufendorf: an irregular square, three or four bending arms,
    // forks), a street village (Strassendorf: one long street), a village green (Angerdorf: the road splits round a long green with the church
    // in it) and a hill village (streets along the contours, the church on the uphill side, steeper plots)
    for(const v of this.villages){v.R0=v.R;v.ways=[];v.log=[];v.streets=[];
      let fall=0;{let mn=1e9,mx=-1e9;for(let a=0;a<12;a++)for(const r of [20,45]){const h=H(v.x+Math.cos(a*0.5236)*r,v.z+Math.sin(a*0.5236)*r);mn=Math.min(mn,h);mx=Math.max(mx,h);}fall=mx-mn;}
      const gx=H(v.x+25,v.z)-H(v.x-25,v.z),gz=H(v.x,v.z+25)-H(v.x,v.z-25);v.upA=Math.hypot(gx,gz)>1.5?Math.atan2(gz,gx):null;
      {const r=rng();v.plan=fall>11&&v.upA!==null?'hill':r<0.45?'cluster':r<0.72?'anger':'street';}
      if(v.plan==='hill')v.dir=v.upA+Math.PI/2;// the main street runs along the contour
      const d=[Math.cos(v.dir),Math.sin(v.dir)],nn=[-d[1],d[0]],plR=(10+5*Math.sqrt(P.villageSize))*(v.plan==='cluster'?0.8+rng()*0.3:v.plan==='anger'?1:0.75);
      const lay=(p0,a,len,w,o)=>{const pts=this.layWay(v,p0,a,len,{rnd:rng,...(o||{})});if(pts)this.addWay(v,pts,w,{gen:true,rnd:rng});return pts;};
      if(v.plan==='anger'){// two streets bowing round the green, then the road carries on from both ends
        const Lg=26+8*P.villageSize,Wg=21;v.plaza=null;v.green=[v.x,v.z,v.dir,Lg,Wg];const A=[v.x-d[0]*Lg,v.z-d[1]*Lg],Bp=[v.x+d[0]*Lg,v.z+d[1]*Lg];
        for(const e of [-1,1]){const pts=[];for(let k=0;k<=8;k++){const t=k/8,o=e*Wg*Math.sin(Math.PI*t)+(rng()-0.5)*1.2,ax=-Lg+2*Lg*t;pts.push([v.x+d[0]*ax+nn[0]*o,v.z+d[1]*ax+nn[1]*o]);}
          if(pts.every(p=>!this.wetAt(p[0],p[1])))this.addWay(v,pts,1.6,{gen:true,rnd:rng});}
        lay(A,v.dir+Math.PI,v.R*0.6,1.75);lay(Bp,v.dir,v.R*0.6,1.75);}
      else{v.plaza=[v.x,v.z,plR];this.vRoads.push({disc:[v.x,v.z,plR],vil:v,lvl:1});
        if(v.plan==='street'){lay([v.x,v.z],v.dir,v.R*1.15,1.75,{meander:0.12});lay([v.x,v.z],v.dir+Math.PI,v.R*1.15,1.75,{meander:0.12});lay([v.x,v.z],v.dir+(rng()<0.5?1:-1)*(1.0+rng()*0.5),v.R*0.4,1.4);}
        else if(v.plan==='hill'){lay([v.x,v.z],v.dir,v.R*0.9,1.6,{maxG:0.25});lay([v.x,v.z],v.dir+Math.PI,v.R*0.9,1.6,{maxG:0.25});lay([v.x,v.z],v.upA+(rng()<0.5?0.6:-0.6),v.R*0.5,1.4,{maxG:0.25});lay([v.x,v.z],v.upA+Math.PI+(rng()<0.5?0.5:-0.5),v.R*0.4,1.4,{maxG:0.25});}
        else{const k=rng()<0.5?3:4;for(let i=0;i<k;i++)lay([v.x,v.z],v.dir+i*6.2832/k+(rng()-0.5)*0.7,v.R*(0.5+rng()*0.35),i<2?1.75:1.5,{meander:0.2});}}
      if(!v.ways.length)this.addWay(v,[[v.x,v.z],[v.x+d[0]*20,v.z+d[1]*20],[v.x+d[0]*40,v.z+d[1]*40]],1.6,{gen:true,rnd:rng});// steep or wet all round: at least a stub of street
      const streets=v.streets;
      // on a village green the church stands in the middle of it, its tower end toward one of the road forks
      if(v.green){const def=R.houseDefs[3],a=Math.atan2(d[0],-d[1]),Q=rectOf(v.x,v.z,a,def),base=fitsRect(Q,streets,null);
        if(base!==null){const h={x:v.x,z:v.z,y:base,rot:a,v:3,r:def.r,hash:rng(),village:v,lvl:1,rect:Q,front:gateOf(v.x,v.z,a,def),fixed:true};flatRect(Q,base);this.houses.push(h);v.houses.push(h);clearZones.push([v.x,v.z,def.r*0.8]);
          let best=null,bd=1e9;for(const sg of streets){const q=VG.segDist(sg,h.front[0],h.front[1]);if(q[0]<bd){bd=q[0];best=q;}}if(best)this.vRoads.push({p:[h.front[0],h.front[1],best[1],best[2]],w:1.2,h});}}
      // church and inn stand on two corners of the square, facing it
      for(const [vt2,qx,qy] of [[3,-1,1],[4,1,-1]]){if(vt2===3&&v.houses.some(h=>h.v===3))continue;const def=R.houseDefs[vt2],r=def.r,cx=v.green&&vt2===4?v.x+d[0]*(v.green[3]+4):v.x,cz=v.green&&vt2===4?v.z+d[1]*(v.green[3]+4):v.z;
        for(let tries=0;tries<(def.plot?14:6);tries++){const rr=def.plot?(v.green?8:plR)-def.plot.z0+2+tries*1.5:plR+r*0.8+tries*2.5,ang=(vt2===3&&v.plan==='hill'?v.upA-v.dir:vt2===4&&v.plan==='hill'?v.upA-v.dir+Math.PI:Math.atan2(qy,qx))+(tries%2?0.25:-0.25)*(def.plot?tries*0.5:tries),ux=Math.cos(ang),uz=Math.sin(ang);
        const x=cx+(d[0]*ux+nn[0]*uz)*rr,z=cz+(d[1]*ux+nn[1]*uz)*rr,tx=cx-x,tz=cz-z,tl=Math.hypot(tx,tz)||1,a=Math.atan2(tx/tl,-tz/tl),Q=def.plot?rectOf(x,z,a,def):null,base=Q?fitsRect(Q,streets,null):fits(x,z,r);if(base===null)continue;
        const h={x,z,y:base,rot:a,v:vt2,r,hash:rng(),village:v,lvl:1,rect:Q||rectOf(x,z,a,{r}),front:Q?gateOf(x,z,a,def):[x+tx/tl*r*0.75,z+tz/tl*r*0.75]};if(Q){flatRect(Q,base);}h.fixed=true;this.houses.push(h);v.houses.push(h);
        if(!Q){const pr=r+1.5;for(let j=Math.floor((z-pr)/cs);j<=Math.ceil((z+pr)/cs);j++)for(let i=Math.floor((x-pr)/cs);i<=Math.ceil((x+pr)/cs);i++){if(i<0||j<0||i>=N||j>=N)continue;if(Math.hypot((i+0.5)*cs-x,(j+0.5)*cs-z)<pr){flatMask[j*N+i]=1;flatH[j*N+i]=base;}}}
        clearZones.push([x,z,r+5]);this.vRoads.push({p:[h.front[0],h.front[1],v.x+(x-v.x)*0.55,v.z+(z-v.z)*0.55],w:1.2,h});break;}}
      if(!v.houses.some(h=>h.v===3))this.growHouse(v,{gen:true,rnd:rng,flat:flatRect,clear:clearZones,vt:3,lvl:1,fixed:true});// no room on the square: the church takes the best plot near it
      const n0=Math.round((3+rng()*2)*Math.pow(P.villageSize,1.2));let got=0,lanes=0;
      for(let k=0;k<n0*2&&got<n0;k++){const h=this.growHouse(v,{gen:true,rnd:rng,flat:flatRect,clear:clearZones});if(h)got++;else if(lanes++<2)this.newLane(v,{gen:true,rnd:rng});else break;}v.n0=got;
      clearZones.push([v.x,v.z,v.R*0.55]);if(v.plaza)for(let k=0;k<4;k++){const a=k*1.5708+0.785,x=v.x+Math.cos(a)*(plR+1.2),z=v.z+Math.sin(a)*(plR+1.2);if(!wet(x,z))this.lamps.push({x,z,y:H(x,z),hash:rng(),vil:v,lvl:1});}
      v.R=Math.max(v.R,...v.houses.map(h=>Math.hypot(h.x-v.x,h.z-v.z)+h.r));}
    // --- country roads: minimum spanning tree over nearby villages (+ a few scenic loops), A* routed, winding, with bridges
    const roadKill=new Uint8Array(N*N),killSeg=(x0,z0,x1,z1,w)=>{const L=Math.hypot(x1-x0,z1-z0),n=Math.max(1,Math.ceil(L/2));for(let k=0;k<=n;k++){const x=x0+(x1-x0)*k/n,z=z0+(z1-z0)*k/n,r=w+2;
      for(let j=Math.floor((z-r)/cs);j<=Math.floor((z+r)/cs);j++)for(let i=Math.floor((x-r)/cs);i<=Math.floor((x+r)/cs);i++)if(i>=0&&j>=0&&i<N&&j<N&&Math.hypot((i+0.5)*cs-x,(j+0.5)*cs-z)<r)roadKill[j*N+i]=1;}};
    this.links=[];if(+P.countryRoads>0&&this.villages.length>1){const V=this.villages,E=[];for(let a=0;a<V.length;a++)for(let b=a+1;b<V.length;b++){const d=Math.hypot(V[a].x-V[b].x,V[a].z-V[b].z);if(d<2600)E.push([d,a,b]);}
      E.sort((p,q)=>p[0]-q[0]);const par=V.map((_,i)=>i),fd=i=>par[i]===i?i:(par[i]=fd(par[i])),pick=[],rest=[];for(const e of E){const ra=fd(e[1]),rb=fd(e[2]);if(ra!==rb){par[ra]=rb;pick.push(e);}else rest.push(e);}
      if(+P.countryRoads>1)pick.push(...rest.filter(e=>e[0]<1100).slice(0,2));
      for(const [,a,b] of pick){const A=V[a],B=V[b];let best=null,bd=1e9;for(const sa of A.streets)for(const ea of [[sa[0],sa[1]],[sa[2],sa[3]]])for(const sb of B.streets)for(const eb of [[sb[0],sb[1]],[sb[2],sb[3]]]){const d=Math.hypot(ea[0]-eb[0],ea[1]-eb[1]);if(d<bd){bd=d;best=[ea,eb];}}
        if(!best)continue;let pts=this.routePath(best[0],best[1],{cs:Math.max(7,(bd+320)/270),margin:160,bridge:true,wind:0.6});if(!pts)pts=this.routePath(best[0],best[1],{cs:Math.max(10,(bd+640)/270),margin:320,bridge:true,wind:0.2,maxG:0.55});
        if(!pts)pts=this.routePath(best[0],best[1],{cs:Math.max(12,(bd+1400)/270),margin:700,bridge:true,wind:0.1,maxG:0.6});// long way round a lake
        if(!pts&&bd<500){const a=best[0],b=best[1],n=Math.ceil(bd/4);let ok=true;for(let q=0;q<=n&&ok;q++){const x=a[0]+(b[0]-a[0])*q/n,z=a[1]+(b[1]-a[1])*q/n,c=clamp((z/cs)|0,0,N-1)*N+clamp((x/cs)|0,0,N-1);if(T.water[c*4+3]>0&&T.shore[c]>=0.99)ok=false;}if(ok)pts=[a,b];}
        if(!pts)Log.warn(`country road ${A.name} – ${B.name} (${bd.toFixed(0)} m) found no route`);if(pts){this.vRoads.push({p:pts.flat(),w:1.55,link:true});this.links.push(pts);}}}
    for(const r of this.vRoads){if(r.disc){killSeg(r.disc[0],r.disc[1],r.disc[0],r.disc[1],r.disc[2]);continue;}for(let i=0;i+3<r.p.length;i+=2)killSeg(r.p[i],r.p[i+1],r.p[i+2],r.p[i+3],r.w);}
    const onRoad=(x,z)=>roadKill[clamp((z/cs)|0,0,N-1)*N+clamp((x/cs)|0,0,N-1)]===1;this.roadKill=roadKill;
    // --- farm fields around the villages
    const fieldFree=(f)=>{const c=Math.cos(f.a),s=Math.sin(f.a);let mn=1e9,mx=-1e9;
      for(let u=-1;u<=1;u+=0.5)for(let w=-1;w<=1;w+=0.5){const lx=u*f.hx,lz=w*f.hz,x=f.x+c*lx-s*lz,z=f.z+s*lx+c*lz;if(x<20||z<20||x>W-20||z>W-20)return false;
        const h=H(x,z);mn=Math.min(mn,h);mx=Math.max(mx,h);if(wet(x,z)||onTrack(x,z)||onRoad(x,z))return false;}
      if(mx-mn>9)return false;const rad=Math.hypot(f.hx,f.hz);
      for(const o of fields)if(Math.hypot(o.x-f.x,o.z-f.z)<(rad+Math.hypot(o.hx,o.hz))*0.72)return false;
      for(const h of this.houses)if(Math.hypot(h.x-f.x,h.z-f.z)<rad+h.r+3)return false;
      for(const v of this.villages)if(Math.hypot(v.x-f.x,v.z-f.z)<v.R*0.8+rad*0.6)return false;return true;};
    const kp=(1-P.pastures)/0.8,CROPS=[[0,0.25*kp],[1,0.14*kp],[2,P.pastures],[3,0.15*kp],[4,0.12*kp],[5,0.14*kp]];
    for(const v of this.villages){const want=Math.round((5+rng()*8)*P.fields);let got=0;
      for(let at=0;at<80&&got<want&&fields.length<254;at++){const ang=rng()*6.283,dist=v.R+30+rng()*230;
        const f={v,x:v.x+Math.cos(ang)*dist,z:v.z+Math.sin(ang)*dist,hx:(16+rng()*26)*P.fieldSize,hz:(12+rng()*18)*P.fieldSize,a:v.dir+(rng()<0.6?0:Math.PI/2)+(rng()-0.5)*0.3,seed:rng()};
        if(!fieldFree(f))continue;let r=rng(),acc=0;f.crop=5;for(const [c,w] of CROPS){acc+=w;if(r<acc){f.crop=c;break;}}
        fields.push(f);got++;const id=fields.length,c=Math.cos(f.a),s=Math.sin(f.a),rad=Math.hypot(f.hx,f.hz)+cs;
        for(let j=Math.floor((f.z-rad)/cs);j<=Math.ceil((f.z+rad)/cs);j++)for(let i=Math.floor((f.x-rad)/cs);i<=Math.ceil((f.x+rad)/cs);i++){if(i<0||j<0||i>=N||j>=N)continue;
          const dx=(i+0.5)*cs-f.x,dz=(j+0.5)*cs-f.z,lx=c*dx+s*dz,lz=-s*dx+c*dz;if(Math.abs(lx)<f.hx+cs*0.75&&Math.abs(lz)<f.hz+cs*0.75)fieldId[j*N+i]=id;}}}
    T.fields=fields;
    // --- windmills on open rises near the villages (and a few in the countryside)
    for(let m=0;m<P.windmills;m++){const v=this.villages.length?this.villages[m%this.villages.length]:null;let best=null;
      for(let at=0;at<40;at++){let x,z;if(v&&m<this.villages.length*2){const a=rng()*6.283,d=v.R+25+rng()*170;x=v.x+Math.cos(a)*d;z=v.z+Math.sin(a)*d;}else{x=100+rng()*(W-200);z=100+rng()*(W-200);}
        const h=H(x,z);if(h>P.maxHeight*0.6||wet(x,z)||onTrack(x,z))continue;let mn=h,mx=h;for(let a=0;a<6;a++){const hh=H(x+Math.cos(a)*7,z+Math.sin(a)*7);mn=Math.min(mn,hh);mx=Math.max(mx,hh);}
        if(mx-mn>3.5)continue;if(this.houses.some(q=>Math.hypot(q.x-x,q.z-z)<q.r+10)||this.mills.some(q=>Math.hypot(q.x-x,q.z-z)<60))continue;
        const fi=fieldId[clamp((z/cs)|0,0,N-1)*N+clamp((x/cs)|0,0,N-1)];if(fi)continue;const sc=h+rng()*6;if(!best||sc>best.sc)best={x,z,y:(mn+mx)/2,sc};}
      if(!best)continue;this.mills.push({x:best.x,z:best.z,y:best.y,rot:0,ang:rng()*6.28,hash:rng()});clearZones.push([best.x,best.z,16]);
      for(let j=Math.floor((best.z-8)/cs);j<=Math.ceil((best.z+8)/cs);j++)for(let i=Math.floor((best.x-8)/cs);i<=Math.ceil((best.x+8)/cs);i++){if(i<0||j<0||i>=N||j>=N)continue;if(Math.hypot((i+0.5)*cs-best.x,(j+0.5)*cs-best.z)<8){flatMask[j*N+i]=1;flatH[j*N+i]=best.y;}}}
    // --- a fairy-tale castle on a summit (Neuschwanstein-like), by chance
    // castles: at least two per map on summits well apart, first a Neuschwanstein, then a Hohenzollern (more alternate)
    this.castles=[];this.castle=null;{const want=Math.max(2,P.castleCount|0),sites=[],nS=Math.round(900*Math.max(1,W*W/(4096*4096))),sep=Math.min(1500,W*0.35);
      for(const pass of [0,1]){for(let k=0;k<nS;k++){const x=70+rng()*(W-140),z=70+rng()*(W-140),h=H(x,z);if(pass===0&&h<P.maxHeight*0.35)continue;let mn=1e9,mx=-1e9,drop=0;
          for(let q=0;q<12;q++){const a=q*0.5236,h1=H(x+Math.cos(a)*24,z+Math.sin(a)*24),h2=H(x+Math.cos(a)*70,z+Math.sin(a)*70);mn=Math.min(mn,h1);mx=Math.max(mx,h1);drop+=h-h2;}
          if(mx-mn>(pass?20:14)||wet(x,z)||this.villages.some(v=>Math.hypot(v.x-x,v.z-z)<v.R+90))continue;sites.push({x,z,h,sc:h+drop/12*1.5-(mx-mn)*3,top:Math.max(mx,h)});}
        sites.sort((p,q)=>q.sc-p.sc);for(const b of sites){if(this.castles.length>=want)break;if(this.castles.some(c=>Math.hypot(c.x-b.x,c.z-b.z)<sep))continue;const kind=this.castles.length%2?'hoh':'neu';
          this.castles.push({x:b.x,z:b.z,y:b.top-1.5,rot:rng()*6.283,kind,name:kind==='hoh'?'Hohenzollern':'Neuschwanstein',top:b.top});}if(this.castles.length>=want)break;}
      for(const c of this.castles){const best=c,y=c.y,FR=c.kind==='hoh'?41:34;{let nd=1e9;for(const v of this.villages){const d=Math.hypot(v.x-c.x,v.z-c.z);if(d<nd){nd=d;c.rot=Math.atan2(v.z-c.z,v.x-c.x);}}}const rot=c.rot;for(let j=Math.floor((best.z-FR-2)/cs);j<=Math.ceil((best.z+FR+2)/cs);j++)for(let i=Math.floor((best.x-FR-2)/cs);i<=Math.ceil((best.x+FR+2)/cs);i++){if(i<0||j<0||i>=N||j>=N)continue;
          if(Math.hypot((i+0.5)*cs-best.x,(j+0.5)*cs-best.z)<FR){flatMask[j*N+i]=1;flatH[j*N+i]=y;}}clearZones.push([best.x,best.z,FR+18]);
        let nv=null,nd=1e9;for(const v of this.villages){const d=Math.hypot(v.x-best.x,v.z-best.z);if(d<nd){nd=d;nv=v;}}const gd=c.kind==='hoh'?44:30;
        if(nv&&nd<2600){const g=[best.x+Math.cos(rot)*gd,best.z+Math.sin(rot)*gd];let e=null,ed=1e9;for(const st of nv.streets)for(const p of [[st[0],st[1]],[st[2],st[3]]]){const d=Math.hypot(p[0]-g[0],p[1]-g[1]);if(d<ed){ed=d;e=p;}}
          const pts=e&&this.routePath(g,e,{cs:Math.max(7,(ed+320)/270),margin:220,bridge:true,wind:0.3,maxG:0.32});if(pts){this.vRoads.push({p:pts.flat(),w:1.5,link:true});this.vRoads.push({p:[best.x+Math.cos(rot)*(gd-8),best.z+Math.sin(rot)*(gd-8),g[0],g[1]],w:2.2});}}
        Log.info(`${c.name} on a summit at ${best.x.toFixed(0)},${best.z.toFixed(0)} (${y.toFixed(0)} m)`);}
      this.castle=this.castles[0]||null;}
    // --- farmsteads: one per village with arable fields, on the edge toward them
    for(const v of this.villages){const my=fields.filter(f=>f.v===v&&f.crop!==2);if(!my.length)continue;let cx=0,cz=0;for(const f of my){cx+=f.x;cz+=f.z;}cx/=my.length;cz/=my.length;
      const a0=Math.atan2(cz-v.z,cx-v.x);let spot=null;
      for(let k=0;k<40&&!spot;k++){const a=a0+(k%2?1:-1)*Math.ceil((k%20)/2)*0.32,r=v.R*0.85+26+(k>=20?30:0),x=v.x+Math.cos(a)*r,z=v.z+Math.sin(a)*r;if(x<40||z<40||x>W-40||z>W-40)continue;
        let ok=true,mn=1e9,mx=-1e9;for(let q=0;q<16&&ok;q++){const qa=q*0.3927,qx=x+Math.cos(qa)*18,qz=z+Math.sin(qa)*18;const h=H(qx,qz);mn=Math.min(mn,h);mx=Math.max(mx,h);if(wet(qx,qz)||onRoad(qx,qz)||onTrack(qx,qz))ok=false;}
        if(!ok||mx-mn>8)continue;if(this.houses.some(h=>Math.hypot(h.x-x,h.z-z)<h.r+20))continue;if(fields.some(f=>Math.hypot(f.x-x,f.z-z)<Math.hypot(f.hx,f.hz)+12))continue;spot={x,z,a};}
      if(!spot)continue;const rot0=Math.atan2(v.z-spot.z,v.x-spot.x),base=H(spot.x,spot.z);
      /* the farmstead (buildings/farm.js: 54 x 38 m, front = model -z): long side across the line village-fields where that is free, else another quarter turn */
      let rot=rot0+Math.PI/2;{const ok=a=>{const c=Math.cos(a),s=Math.sin(a);for(let u=-27;u<=27;u+=6)for(let w=-18;w<=18;w+=6){const x=spot.x+c*u-s*w,z=spot.z+s*u+c*w;if(x<30||z<30||x>W-30||z>W-30||wet(x,z)||onTrack(x,z))return false;if(this.houses.some(h=>Math.hypot(h.x-x,h.z-z)<h.r+3))return false;}return true;};for(const a of [rot0+Math.PI/2,rot0-Math.PI/2,rot0,rot0+Math.PI])if(ok(a)){rot=a;break;}}
      const c=Math.cos(rot),sn=Math.sin(rot),P2=(u,w)=>[spot.x+c*u-sn*w,spot.z+sn*u+c*w];
      const fm={x:spot.x,z:spot.z,rot,v,barn:P2(-7.5,12),shed:P2(13,-9),silo:P2(-14.5,-10.6),yard:P2(-3,-3),gate:P2(-2.1,-20),unload:P2(-6,-12),park:[P2(4,-2),P2(7.5,-1),P2(1,-5)],y:base};v.farm=fm;
      for(let u=-31;u<=31;u+=cs*0.5)for(let w=-21;w<=21;w+=cs*0.5){const q=P2(u,w),i=Math.floor(q[0]/cs),j=Math.floor(q[1]/cs);if(i<0||j<0||i>=N||j>=N)continue;flatMask[j*N+i]=1;flatH[j*N+i]=base;}
      for(const u of [-17,17])clearZones.push([...P2(u,0),24]);
      for(let j=Math.floor((spot.z-26)/cs);j<=Math.ceil((spot.z+26)/cs);j++)for(let i=Math.floor((spot.x-26)/cs);i<=Math.ceil((spot.x+26)/cs);i++){if(i<0||j<0||i>=N||j>=N)continue;const d=Math.hypot((i+0.5)*cs-spot.x,(j+0.5)*cs-spot.z);if(d<26){const w=clamp((26-d)/6,0,1);flatMask[j*N+i]=Math.max(flatMask[j*N+i],w>0.99?1:0);if(w>0.99)flatH[j*N+i]=base;}}
      clearZones.push([spot.x,spot.z,30]);let best=null,bd=1e9;for(const st of v.streets){const ex=st[2]-st[0],ez=st[3]-st[1],ll=ex*ex+ez*ez||1,t=clamp(((fm.yard[0]-st[0])*ex+(fm.yard[1]-st[1])*ez)/ll,0,1),px=st[0]+ex*t,pz=st[1]+ez*t,d=Math.hypot(px-fm.yard[0],pz-fm.yard[1]);if(d<bd){bd=d;best=[px,pz];}}
      if(best)this.vRoads.push({p:[fm.yard[0],fm.yard[1],best[0],best[1]],w:1.5,farmOf:v});this.vRoads.push({disc:[fm.yard[0],fm.yard[1],7],farmOf:v});}
    // --- sawmills, old placement: still run so the random sequence (and so the workshops and mines placed after it) stays as it was in
    // saved worlds; the results only serve as the fallback spots (oldSaw). The sawmills themselves are placed after the mines, beside a brook.
    const oldSaw=[],sawOrder=[];{const TG=new Map();for(const arr of veg.trees)for(let k=0;k+3<arr.length;k+=8){const key=Math.floor(arr[k]/32)+','+Math.floor(arr[k+2]/32);TG.set(key,(TG.get(key)||0)+1);}
      const dens=(x,z)=>{let n=0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)n+=TG.get((Math.floor(x/32)+a)+','+(Math.floor(z/32)+b))||0;return n;};const want=Math.max(1,Math.round(this.villages.length/3));this.sawDens=dens;this.sawWant=want;
      for(const v of this.villages.slice().sort(()=>rng()-0.5)){sawOrder.push(v);if(oldSaw.length>=want)break;let best=null;for(let k=0;k<50;k++){const a=rng()*6.283,r=v.R+120+rng()*260,x=v.x+Math.cos(a)*r,z=v.z+Math.sin(a)*r;if(x<50||z<50||x>W-50||z>W-50)continue;
          let mn=1e9,mx=-1e9,ok=true;for(let q=0;q<8&&ok;q++){const qa=q*0.785,qx=x+Math.cos(qa)*24,qz=z+Math.sin(qa)*24,h=H(qx,qz);mn=Math.min(mn,h);mx=Math.max(mx,h);if(wet(qx,qz)||onRoad(qx,qz)||onTrack(qx,qz))ok=false;}if(!ok||mx-mn>6)continue;
          if(this.houses.some(h=>Math.hypot(h.x-x,h.z-z)<40)||fields.some(f=>Math.hypot(f.x-x,f.z-z)<Math.hypot(f.hx,f.hz)+18))continue;const d=dens(x,z);if(!best||d>best.d)best={x,z,d};}
        if(!best||best.d<8)continue;oldSaw.push({x:best.x,z:best.z,v});}}
    this.sawmills=[];
    // --- wood workshops (joinery, cartwright and cooper): where the wood goes
    this.workshops=[];{const TG2=new Map();for(const arr of veg.trees)for(let k=0;k+3<arr.length;k+=8){if(arr[k+3]<=0)continue;const key=Math.floor(arr[k]/32)+','+Math.floor(arr[k+2]/32);TG2.set(key,(TG2.get(key)||0)+1);}
      const dens2=(x,z)=>{let n=0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)n+=TG2.get((Math.floor(x/32)+a)+','+(Math.floor(z/32)+b))||0;return n;};const want=Math.max(1,Math.round(this.villages.length/3));
      for(const v of this.villages.slice().sort((a,b)=>b.R-a.R)){if(this.workshops.length>=want)break;if(oldSaw.some(m=>Math.hypot(m.x-v.x,m.z-v.z)<v.R+150))continue;let best=null;
        for(let k=0;k<60;k++){const a=rng()*6.283,r=v.R+50+rng()*170,x=v.x+Math.cos(a)*r,z=v.z+Math.sin(a)*r;if(x<50||z<50||x>W-50||z>W-50)continue;let mn=1e9,mx=-1e9,ok=true;
          for(let q=0;q<8&&ok;q++){const qa=q*0.785,qx=x+Math.cos(qa)*22,qz=z+Math.sin(qa)*22,h=H(qx,qz);mn=Math.min(mn,h);mx=Math.max(mx,h);if(wet(qx,qz)||onRoad(qx,qz)||onTrack(qx,qz))ok=false;}if(!ok||mx-mn>6)continue;
          if(this.houses.some(h=>Math.hypot(h.x-x,h.z-z)<h.r+28)||fields.some(f=>Math.hypot(f.x-x,f.z-z)<Math.hypot(f.hx,f.hz)+18)||(v.farm&&Math.hypot(v.farm.x-x,v.farm.z-z)<55))continue;const sc=-dens2(x,z)-(mx-mn)*2;if(!best||sc>best.sc)best={x,z,sc};}
        if(!best)continue;const rot=Math.atan2(v.z-best.z,v.x-best.x),yl=this.levelPlot(T,best.x,best.z,rot,17,13,9,flatMask,flatH);this.workshops.push({x:best.x,z:best.z,rot,v,y:yl});clearZones.push([best.x,best.z,32]);
        const pts=this.routePath([best.x+Math.cos(rot)*14,best.z+Math.sin(rot)*14],[v.x,v.z],{cs:6,margin:100,bridge:true,wind:0.2,maxG:0.3});if(pts)this.vRoads.push({p:pts.flat(),w:1.4,kind:1});}}
    // --- mines: 60% of villages have a gold, silver or diamond lode in the hills nearby (a village upgrade)
    this.mines=[];{const mr=mulberry32((P.seed|0)*7919+13);for(const v of this.villages){if(mr()>0.6)continue;const type=['gold','silver','diamond'][Math.floor(mr()*3)],hv=H(v.x,v.z);let best=null;
      for(let k=0;k<70;k++){const a=mr()*6.283,r=v.R+160+mr()*380,x=v.x+Math.cos(a)*r,z=v.z+Math.sin(a)*r;if(x<60||z<60||x>W-60||z>W-60)continue;let mn=1e9,mx=-1e9,ok=true;
        for(let q=0;q<8&&ok;q++){const qa=q*0.785,qx=x+Math.cos(qa)*21,qz=z+Math.sin(qa)*21,h=H(qx,qz);mn=Math.min(mn,h);mx=Math.max(mx,h);if(wet(qx,qz)||onRoad(qx,qz)||onTrack(qx,qz))ok=false;}if(!ok||mx-mn>9)continue;
        if(this.houses.some(h=>Math.hypot(h.x-x,h.z-z)<h.r+40)||fields.some(f=>Math.hypot(f.x-x,f.z-z)<Math.hypot(f.hx,f.hz)+20)||[...oldSaw,...this.workshops,...this.mines].some(m=>Math.hypot(m.x-x,m.z-z)<90)||this.castleList().some(c=>Math.hypot(c.x-x,c.z-z)<130)||(v.farm&&Math.hypot(v.farm.x-x,v.farm.z-z)<60))continue;
        const sc=(H(x,z)-hv)*0.6-(mx-mn)*2;if(!best||sc>best.sc)best={x,z,sc};}
      if(!best)continue;const rot=Math.atan2(v.z-best.z,v.x-best.x),yl=this.levelPlot(T,best.x,best.z,rot,17,13,9,flatMask,flatH),m={x:best.x,z:best.z,rot,v,y:yl,type};this.mines.push(m);v.mine=m;clearZones.push([best.x,best.z,40]);
      const pts=this.routePath([best.x+Math.cos(rot)*16,best.z+Math.sin(rot)*16],[v.x,v.z],{cs:7,margin:120,bridge:true,wind:0.3,maxG:0.32});if(pts)this.vRoads.push({p:pts.flat(),w:1.4,kind:1,ind:m});}}
    // --- sawmills: water-powered, so beside a brook. The brook passes the mill's road side (+x, about 28 m out, along the mill's z axis)
    // and nothing else of it may cross the plot or the three loading sides (-x, ±z). A run-off rill that fits is made a permanent brook;
    // where nothing fits, the mill keeps its old spot and gets a brook of its own. See placeSawmills.
    this.placeSawmills(T,{H,wet,onRoad,onTrack,fields,flatMask,flatH,clearZones,oldSaw,order:[...sawOrder,...this.villages.filter(v=>!sawOrder.includes(v))]});
    // --- sledding slopes: pick open runs near the villages now and keep them free of trees
    const sledKill=new Uint8Array(N*N);this.sledH=this.findHills(true,fieldId);for(const hl of this.sledH)for(const p of hl.pts){const r=8;for(let j=Math.floor((p[1]-r)/cs);j<=Math.floor((p[1]+r)/cs);j++)for(let i=Math.floor((p[0]-r)/cs);i<=Math.floor((p[0]+r)/cs);i++)if(i>=0&&j>=0&&i<N&&j<N)sledKill[j*N+i]=1;}
    // --- clear trees out of villages, plots and fields
    const inField=(x,z)=>{const id=fieldId[clamp((z/cs)|0,0,N-1)*N+clamp((x/cs)|0,0,N-1)];return id>0;};
    let cleared=0;const clearArr=(arr,isRock)=>{for(let k=0;k<arr.length;k+=8){const x=arr[k],z=arr[k+2];let kill=inField(x,z);
      if(!kill)for(const c of clearZones)if(Math.hypot(c[0]-x,c[1]-z)<c[2]){kill=true;break;}
      if(!kill&&!isRock)for(const v of this.villages)if(Math.hypot(v.x-x,v.z-z)<v.R+10&&arr[k+6]>0.18&&arr[k+3]>7){kill=true;break;}
      if(!kill&&(path[clamp((z/cs)|0,0,N-1)*N+clamp((x/cs)|0,0,N-1)]>40||onRoad(x,z)||sledKill[clamp((z/cs)|0,0,N-1)*N+clamp((x/cs)|0,0,N-1)]))kill=true;if(kill){arr[k+3]=0;cleared++;}}};
    veg.trees.forEach((a,i)=>clearArr(a,false));clearArr(veg.rocks,true);
    T.veg={trees:veg.trees.map(a=>Float32Array.from(a)),rocks:Float32Array.from(veg.rocks)};
    T.flatMask=flatMask;T.flatH=flatH;T.fieldId=fieldId;T.pathMask=path;R.computeRenderHeights(T);
    for(const h of this.houses)h.y=R.sampleHr(T,h.x,h.z);for(const l of this.lamps)l.y=R.sampleHr(T,l.x,l.z);for(const m of this.mills)m.y=R.sampleHr(T,m.x,m.z);
    this.spawnCritters(T,rng,fields);this.uploaded=false;this.hidden=new Set();this.applyTrackMask(T);
    T.stats.villages=this.villages.length;T.stats.houses=this.houses.length;T.stats.fields=fields.length;T.stats.mills=this.mills.length;
    Log.info(`life: ${this.villages.length} villages (${this.villages.map(v=>v.name+' '+v.houses.length).join(', ')}), ${this.houses.length} houses, ${fields.length} fields, ${this.mills.length} windmills, ${this.lamps.length} lamps, ${cleared} trees cleared, ${this.animals.length} animals, ${this.swimmers.length} ducks/swans, ${this.boats.length} boats in ${(performance.now()-t0).toFixed(0)} ms`);},
  spawnCritters(T,rng,fields){const N=T.N,cs=T.cs;
    // pastures: one herd each (sheep, cows or horses with foals), fenced with a gate toward the village
    this.animals=[];this.herds=[];this.fences=[];for(const f of fields){if(f.crop!==2)continue;const r=rng(),kind=r<0.4?'sheep':r<0.75?'cow':'horse',area=f.hx*f.hz;
      const n=Math.max(2,Math.round((kind==='sheep'?6+area/160:kind==='cow'?3+area/320:2+area/420)*(0.7+rng()*0.6)*P.sheep));const hd={f,kind,cx:f.x,cz:f.z,tx:f.x,tz:f.z,timer:20+rng()*40};this.herds.push(hd);
      for(let k=0;k<n;k++){const a=this.randInField(f,rng),an={x:a[0],z:a[1],tx:a[0],tz:a[1],rot:rng()*6.28,f,hd,kind,cow:kind==='cow',hash:rng(),st:'graze',wait:rng()*12,g:1,mv:0,sc:1};this.animals.push(an);
        if(kind==='horse'&&rng()<0.35){const fo={...an,hash:rng(),sc:0.62,mother:an,x:a[0]+1.5,z:a[1]+1,wait:0};this.animals.push(fo);}}
      if(P.fences){const c=Math.cos(f.a),s2=Math.sin(f.a),H=(x,z)=>R.sampleHr(T,x,z),corner=(u,w)=>[f.x+c*u-s2*w,f.z+s2*u+c*w],e=f.hx+1.5,q=f.hz+1.5,C=[corner(-e,-q),corner(e,-q),corner(e,q),corner(-e,q)];
        let gv=null,gd=1e9;for(const v of this.villages){const d=Math.hypot(v.x-f.x,v.z-f.z);if(d<gd){gd=d;gv=v;}}let gate=-1,gb=-1e9;
        for(let k=0;k<4;k++){const a=C[k],b=C[(k+1)%4],mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2,sc=gv?-Math.hypot(gv.x-mx,gv.z-mz):0;if(sc>gb){gb=sc;gate=k;}}
        for(let k=0;k<4;k++){const a=C[k],b=C[(k+1)%4],L=Math.hypot(b[0]-a[0],b[1]-a[1]),m=Math.max(1,Math.round(L/3)),seg=L/m,rot=Math.atan2(b[1]-a[1],b[0]-a[0]);
          for(let t=0;t<m;t++){if(k===gate&&t===Math.floor(m/2))continue;const u0=t/m,u1=(t+1)/m,x0=a[0]+(b[0]-a[0])*u0,z0=a[1]+(b[1]-a[1])*u0,x1=a[0]+(b[0]-a[0])*u1,z1=a[1]+(b[1]-a[1])*u1;
            const y0=H(x0,z0),y1=H(x1,z1),w0=sampleWater(T,(x0+x1)/2,(z0+z1)/2);if(w0[1]>0&&w0[0]>H((x0+x1)/2,(z0+z1)/2)-0.2)continue;
            this.fences.push({f,x:(x0+x1)/2,y:Math.min(y0,y1)+0.02,z:(z0+z1)/2,sc:seg/3,rot,pitch:Math.atan((y1-y0)/seg)});}}}}
    // lake cells for swimmers and boats
    const lake=[];for(let j=2;j<N-2;j+=2)for(let i=2;i<N-2;i+=2){const n=j*N+i;if(T.water[n*4+3]>0&&T.shore&&T.shore[n]>=0.99&&T.water[n*4]-T.H[n]>0.8)lake.push(n);}
    this.lakeCells=lake;this.swimmers=[];this.boats=[];
    const nd=Math.round(Math.min(48,lake.length/25)*P.ducks);
    for(let k=0;k<nd;){const c=lake[Math.floor(rng()*lake.length)];const x=(c%N+0.5)*cs,z=((c/N|0)+0.5)*cs,swan=rng()<0.18,fam=swan?2:3+Math.floor(rng()*3);
      const lead={x,z,tx:x,tz:z,rot:rng()*6.28,swan,hash:rng(),lead:null,wait:0};this.swimmers.push(lead);k++;
      for(let q=1;q<fam&&k<nd;q++,k++)this.swimmers.push({x:x+q*1.4,z:z+q,tx:x,tz:z,rot:lead.rot,swan,hash:rng(),lead,off:q});}
    const deep=lake.filter(n=>T.water[n*4]-T.H[n]>2.2);const nb=Math.round(Math.min(7,deep.length/120)*P.boats);
    for(let k=0;k<nb;k++){const c=deep[Math.floor(rng()*deep.length)];const x=(c%N+0.5)*cs,z=((c/N|0)+0.5)*cs;this.boats.push({x,z,tx:x,tz:z,rot:rng()*6.28,sail:rng()<0.5,hash:rng(),wait:0});}
    this.steamers=[];this.docks=[];const W=T.W,clearZones=[],wet=(x,z)=>{const w=sampleWater(T,x,z);return w[1]>0&&w[0]>R.sampleHr(T,x,z)-0.15;};for(const lk of this.lakes||[]){if(lk.area<150000||rng()>P.steamers)continue;const deep=(x,z)=>this.isLake(x,z)&&this.isLake(x+18,z)&&this.isLake(x-18,z)&&this.isLake(x,z+18)&&this.isLake(x,z-18);
      if(!deep(lk.cx,lk.cz))continue;const rr=[];for(let a=0;a<32;a++){const dx=Math.cos(a*0.19635),dz=Math.sin(a*0.19635);let r=0;while(r<1500&&deep(lk.cx+dx*(r+4),lk.cz+dz*(r+4)))r+=4;rr.push(r*0.72);}
      const sm=rr.map((r,i)=>(rr[(i+31)%32]+2*r+rr[(i+1)%32])/4);if(Math.min(...sm)<20)continue;const loop=sm.map((r,i)=>[lk.cx+Math.cos(i*0.19635)*r,lk.cz+Math.sin(i*0.19635)*r]);
      const cum=[0];for(let i=1;i<=32;i++)cum.push(cum[i-1]+Math.hypot(loop[i%32][0]-loop[i-1][0],loop[i%32][1]-loop[i-1][1]));const st={loop,cum,L:cum[32],s:rng()*cum[32],lvl:lk.lvl,hash:rng(),x:loop[0][0],z:loop[0][1],rot:0,smoke:0,lake:lk.id,docks:[],mode:'loop',leg:0,wait:0};
      // a wooden dock at every village on this lake: walk out from the nearest shore until the water is deep and open
      const H=(x,z)=>R.sampleHr(T,x,z),inLk=(x,z)=>this.lakeComp[clamp((z/cs)|0,0,N-1)*N+clamp((x/cs)|0,0,N-1)]===lk.id,open=(x,z,m)=>inLk(x,z)&&inLk(x+m,z)&&inLk(x-m,z)&&inLk(x,z+m)&&inLk(x,z-m);
      for(const v of this.villages){let best=null;for(let a=0;a<48;a++){const dx=Math.cos(a*0.1309),dz=Math.sin(a*0.1309);let px=v.x,pz=v.z;
          for(let r=v.R*0.5;r<600;r+=3){const x=v.x+dx*r,z=v.z+dz*r;if(x<20||z<20||x>W-20||z>W-20)break;if(inLk(x,z)){let L=4;while(L<46&&!open(px+dx*L,pz+dz*L,8))L+=2;if(L<46&&(!best||r+L*2<best.cost))best={sx:px,sz:pz,nx:dx,nz:dz,L,cost:r+L*2,v};break;}if(wet(x,z))break;px=x;pz=z;}}
        if(best&&!(v.beach&&Math.hypot(v.beach.x-best.sx,v.beach.z-best.sz)<25)){const d=best,sd=[-d.nz,d.nx];d.px=d.sx+d.nx*d.L;d.pz=d.sz+d.nz*d.L;d.bx=d.px-d.nx*6+sd[0]*5.6;d.bz=d.pz-d.nz*6+sd[1]*5.6;d.lvl=lk.lvl;d.sy=H(d.sx,d.sz);
          st.docks.push(d);this.docks.push(d);const hx=d.sx-d.nx*5,hz=d.sz-d.nz*5;for(const arr of [...T.veg.trees,T.veg.rocks])for(let k=0;k+3<arr.length;k+=8)if(Math.hypot(arr[k]-hx,arr[k+2]-hz)<11||Math.hypot(arr[k]-d.sx,arr[k+2]-d.sz)<6)arr[k+3]=0;}}
      if(st.docks.length>=2)st.mode='sail';else if(st.docks.length===1)st.mode='loop';
      if(st.docks.length){const d=st.docks[0];st.x=d.bx;st.z=d.bz;st.rot=Math.atan2(-d.nz,-d.nx);st.mode=st.docks.length>=2?'moor':'loop';st.wait=10+rng()*20;st.leg=0;}
      this.steamers.push(st);}
    this.walkers=[];this.stReady=false;this.stClean=new Map();this.treeGrid=null;this.farm={season:null,jobs:[],tr:[]};this.sk={groups:[],game:null};this.sledP=[];this.lakeIdx=null;this.beachP=[];this.flocks=[];this.flockKey='';},
  // herds: the herd centre drifts around the pasture; animals graze (head down), walk back toward the herd, cows rest,
  // horses sometimes trot off, foals stay near their mother, sheep keep a tight flock
  inFieldClamp(f,x,z,m){const c=Math.cos(f.a),s=Math.sin(f.a),dx=x-f.x,dz=z-f.z;let u=c*dx+s*dz,w=-s*dx+c*dz;u=clamp(u,-f.hx+m,f.hx-m);w=clamp(w,-f.hz+m,f.hz-m);return[f.x+c*u-s*w,f.z+s*u+c*w];},
  updateHerds(dt){const R1=Math.random;for(const h of this.herds||[]){if(!this.farmOn(h.f))continue;h.timer-=dt;if(h.timer<=0){const p=this.randInField(h.f,R1);h.tx=p[0];h.tz=p[1];h.timer=(h.kind==='sheep'?25:45)+R1()*60;}
      const dx=h.tx-h.cx,dz=h.tz-h.cz,d=Math.hypot(dx,dz),sp=(h.kind==='sheep'?0.22:0.12)*dt;if(d>0.1){h.cx+=dx/d*Math.min(sp,d);h.cz+=dz/d*Math.min(sp,d);}}
    for(const a of this.animals){if(!this.farmOn(a.f))continue;const hd=a.hd,K=a.kind,rad=K==='sheep'?6:K==='cow'?11:18,walkV=K==='horse'?0.9:K==='cow'?0.5:0.6;
      if(a.mother){const m=a.mother,bx=m.x-Math.cos(m.rot)*1.2+Math.sin(m.rot)*1.3,bz=m.z-Math.sin(m.rot)*1.2-Math.cos(m.rot)*1.3,dx=bx-a.x,dz=bz-a.z,d=Math.hypot(dx,dz);
        if(d>0.4){const v=Math.min(d>4?2.6:0.9,d*1.2);a.x+=dx/d*v*dt;a.z+=dz/d*v*dt;a.rot=lerpAng(a.rot,Math.atan2(dz,dx),dt*3);a.mv=v>1.5?11:6;a.g=Math.max(0,a.g-dt*2);}
        else{a.mv=0;a.rot=lerpAng(a.rot,m.rot,dt);a.g+=((m.g>0.5?1:0)-a.g)*Math.min(1,dt*1.5);}continue;}
      if(a.st==='graze'||a.st==='rest'){a.mv=0;a.g+=((a.st==='graze'?1:0)-a.g)*Math.min(1,dt*1.2);a.wait-=dt;
        if(a.st==='graze'&&R1()<dt*0.08){a.x+=Math.cos(a.rot)*0.25;a.z+=Math.sin(a.rot)*0.25;}// nibble forward
        const far=Math.hypot(a.x-hd.cx,a.z-hd.cz)>rad*1.6;if(a.wait<=0||far){const trot=K==='horse'&&R1()<0.12;let tx,tz;
          if(trot){const p=this.randInField(a.f,R1);tx=p[0];tz=p[1];}else{const an=R1()*6.283,rr=R1()*rad;tx=hd.cx+Math.cos(an)*rr;tz=hd.cz+Math.sin(an)*rr;}
          const q=this.inFieldClamp(a.f,tx,tz,2.5);a.tx=q[0];a.tz=q[1];a.st=trot?'trot':'walk';}}
      else{const dx=a.tx-a.x,dz=a.tz-a.z,d=Math.hypot(dx,dz),v=a.st==='trot'?3.2:walkV;a.g=Math.max(0,a.g-dt*2);
        if(d<0.4){const r=R1();a.st=K==='cow'&&r<0.25?'rest':'graze';a.wait=(K==='sheep'?5:8)+R1()*(K==='cow'?30:18);continue;}
        a.x+=dx/d*Math.min(v*dt,d);a.z+=dz/d*Math.min(v*dt,d);a.rot=lerpAng(a.rot,Math.atan2(dz,dx),dt*(a.st==='trot'?4:2.5));a.mv=a.st==='trot'?11:K==='sheep'?7:5;}}
    // keep animals apart a little
    const A=this.animals;for(let i=0;i<A.length;i++)for(let k=i+1;k<Math.min(A.length,i+12);k++){const p=A[i],q=A[k];if(p.hd!==q.hd)continue;const dx=q.x-p.x,dz=q.z-p.z,d=Math.hypot(dx,dz),md=p.kind==='sheep'?0.9:1.8;
      if(d<md&&d>1e-3){const push=(md-d)*0.5*Math.min(1,dt*4);p.x-=dx/d*push;p.z-=dz/d*push;q.x+=dx/d*push;q.z+=dz/d*push;}}},
  randInField(f,rng){const u=(rng()*2-1)*(f.hx-3),w=(rng()*2-1)*(f.hz-3),c=Math.cos(f.a),s=Math.sin(f.a);return[f.x+c*u-s*w,f.z+s*u+c*w];},
  // lake water drawn at x,z (the lake surface reaches a little onto the bank)
  lakeAt(x,z){const T=this.T,N=T.N,cs=T.cs,w=sampleWater(T,x,z);if(!(w[1]>0&&w[0]>R.sampleHr(T,x,z)-0.3))return false;const i=clamp((x/cs)|0,0,N-1),j=clamp((z/cs)|0,0,N-1);
    for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const n=clamp(j+dj,0,N-1)*N+clamp(i+di,0,N-1);if(T.water[n*4+3]>0&&T.shore[n]>=0.99)return true;}return false;},
  nearLake(x,z,r){if(this.lakeAt(x,z))return true;for(let a=0;a<8;a++)if(this.lakeAt(x+Math.cos(a*0.785)*r,z+Math.sin(a*0.785)*r))return true;return false;},
  // move a road point inland until no lake water is within 3 m
  awayFromLake(p){if(!this.nearLake(p[0],p[1],3))return p;for(let r=1;r<=14;r+=1)for(let a=0;a<16;a++){const x=p[0]+Math.cos(a*0.3927)*r,z=p[1]+Math.sin(a*0.3927)*r;if(!this.nearLake(x,z,3))return[x,z];}return p;},
  isLake(x,z){const T=this.T,N=T.N,i=clamp((x/T.cs)|0,0,N-1),j=clamp((z/T.cs)|0,0,N-1),n=j*N+i;return T.water[n*4+3]>0&&T.shore[n]>=0.99&&T.water[n*4]-T.H[n]>0.5;},
  // houses and lamps that end up under new track disappear (and come back when it goes)
  applyTrackMask(T){const M=T.trackMask;if(!M)return;const N=T.N,cs=T.cs;const hit=(x,z,r)=>{for(let j=Math.floor((z-r)/cs);j<=Math.ceil((z+r)/cs);j++)for(let i=Math.floor((x-r)/cs);i<=Math.ceil((x+r)/cs);i++){if(i<0||j<0||i>=N||j>=N)continue;if(M[j*N+i]>60)return true;}return false;};
    let n=0;for(const h of this.houses){h.gone=hit(h.x,h.z,h.r*0.8);if(h.gone)n++;}for(const l of this.lamps)l.gone=hit(l.x,l.z,1);for(const m of this.mills)m.gone=hit(m.x,m.z,5);{let ns=0;for(const h of this.houses)if(!h.gone&&this.stInfo&&this.stInfo.length&&this.stRectHit(h.rect||VG.rectOf(h.x,h.z,h.rot,{r:h.r}),(x,z,m)=>this.stFoot(x,z,m),1.5)){h.gone=true;ns++;}if(ns)Log.info(`${ns} houses make way for a station`);}this.uploaded=false;if(n)Log.info(`${n} houses make way for the railway`);},
  FARM:{level:1,trans:40,cost:1,growth:60},
  // village upgrades: each unlocks at a village size and after some transport (a badge on the label), then is bought (€1 for now)
  UPG:{farm:{p:'farmOwned',name:'Farming',icon:'🌾',level:1,trans:40,cost:1,growth:60,desc:'fields, pastures, a farmstead and tractors'},
    saw:{p:'sawOwned',name:'Sawmill',icon:'🪚',level:0,trans:15,cost:1,growth:30,desc:'a steam sawmill in the woods that cuts logs for timber wagons'},
    mine:{p:'mineOwned',name:'Mine',icon:'⛏️',level:1,trans:60,cost:1,growth:50,desc:'a shaft mine; its ore goes by rail in ore hoppers to a town with a bank'},
    bank:{p:'bankOwned',name:'Bank',icon:'🏦',level:2,trans:0,cost:1,growth:40,desc:'a bank by the square that takes gold, silver and diamond ore'},
    docks:{p:'docksOwned',name:'Steamboat dock',icon:'⛴️',level:0,trans:20,cost:1,growth:30,desc:'a dock on the lake; the steamboat sails once two villages on the lake have one'}},
  // what an upgrade brings and why it is on offer now (shown when the player taps the notification)
  UPG_WHY:{farm:v=>`${v.name} has grown into a village and enough travellers have come by train, so its people can take up farming. You get fields and pastures around the village, a farmstead and tractors. Build a station at one of the farm's four marked sides: the grain tower then stands beside that track and its arm fills your grain hoppers. The farms send grain and produce: carry them by goods wagon to other villages, and ${v.name} grows faster.`,
    saw:v=>`Enough passengers have travelled from ${v.name} for its woodsmen to open a sawmill in the forest nearby. It is a water-powered mill on a brook: the wheel drives the saws, logs come in from the woods and leave as cut timber. Build a wood-mill station at one of its three marked sides and take the timber by wagon to a wood workshop.`,
    mine:v=>`${v.name} has grown and its line is busy, so the lode in the hills can be worked. You get a shaft mine with a headframe and an ore bunker. Build a station at a marked side and take the ore in hoppers to a town with a bank.`,
    bank:v=>`${v.name} is now a town, big enough for a bank by its square. The bank buys gold, silver and diamond ore: bring it by rail from the mines.`,
    docks:v=>`Travellers from ${v.name} have made the lake worth sailing. You get a steamboat dock on the shore; the steamboat starts sailing once two villages on the lake have one.`},
  upgHas(v,k){if(k==='farm')return!!(this.T&&(this.T.fields||[]).some(f=>f.v===v));if(k==='saw')return(this.sawmills||[]).some(m=>m.v===v);if(k==='mine')return!!v.mine;if(k==='bank')return v.houses.some(h=>h.bank);if(k==='docks')return(this.docks||[]).some(d=>d.v===v);return false;},
  upgState(v,k){const U=this.UPG[k];if(v[U.p])return'owned';if(!this.upgHas(v,k))return'none';return((v.level|0)>=U.level&&(v.trans||0)>=U.trans)?'available':'locked';},
  upgName(v,k){return k==='mine'&&v.mine?ORE[v.mine.type].name+' mine':this.UPG[k].name;},
  upgIcon(v,k){return k==='mine'&&v.mine?ORE[v.mine.type].icon:this.UPG[k].icon;},
  buyUpg(v,k){const U=this.UPG[k];if(this.upgState(v,k)!=='available'){UI.toast('Not available yet');return;}if(Money.on()){if(!Money.canBuild()){UI.toast('Out of money');return;}Money.spend(U.cost,`${this.upgName(v,k).toLowerCase()} in ${v.name}`);}
    v[U.p]=true;this.upgApplied(v,k);UI.toast(`${v.name}: ${this.upgName(v,k)}, ${U.desc}`);this.addGrowth(v,U.growth);},
  upgApplied(v,k){if(k==='farm'){R.uploadFields(this.T);this.farm.season=null;}this.uploaded=false;this.roadsDirty=true;},
  farmState(v){return this.upgState(v,'farm');},
  buyFarm(v){this.buyUpg(v,'farm');},
  castleList(){return this.castles&&this.castles.length?this.castles:(this.castle?[this.castle]:[]);},
  farmOn(f){return !!(f&&(!f.v||f.v.farmOwned));},
  inds(){return[['sawmill',this.sawmills||[]],['workshop',this.workshops||[]],['mine',this.mines||[]]];},
  // sawmills and mines are village upgrades (a sawmill without a village stays on); workshops always work
  indOn(kind,m){if(!m)return false;if(kind==='farm')return!!(m.v&&m.v.farmOwned);if(kind==='sawmill')return!m.v||!!m.v.sawOwned;if(kind==='mine')return!!(m.v&&m.v.mineOwned);return true;},
  /* ---- farms: one per farming village (index = the village's). A station at one of a farm's four marked sides is its grain station: the grain tower
     stands beside that station's track (else at the farm's front) and its arm fills the grain hoppers (Crane, kind 'farm') */
  farms(){return this.villages.map(v=>v.farm||null);},
  farmOf(st){const v=st&&st.farm?this.villages[st.farm.mi]:null;return v&&v.farm||null;},
  farmAt(x,z,m){for(const v of this.villages){const fm=v.farm;if(!fm||Math.abs(x-fm.x)>45||Math.abs(z-fm.z)>45)continue;const c=Math.cos(fm.rot),s=Math.sin(fm.rot),dx=x-fm.x,dz=z-fm.z,u=dx*c+dz*s,w=-dx*s+dz*c;if(Math.abs(u)<28+(m||0)&&Math.abs(w)<19.5+(m||0))return fm;}return null;},
  farmTower(fm){const G=KIT.GRAIN,c=Math.cos(fm.rot),sn=Math.sin(fm.rot),P2=(lx,lz)=>[fm.x+c*lx-sn*lz,fm.z+sn*lx+c*lz],mi=this.villages.indexOf(fm.v),st=Track.stations.find(q=>q.farm&&q.farm.mi===mi),si=st&&(this.stInfo||[]).find(q=>q.st===st);
    if(si){const sl=this.sawSlots(fm)[st.farm.k],h=(st.len||44)/2-4,a=sl?clamp((sl.in[0]-si.x)*si.dx+(sl.in[1]-si.z)*si.dz,-h,h):0,x=si.x+si.dx*a+si.nx*G.track,z=si.z+si.dz*a+si.nz*G.track;return{x,z,y:si.y,rot:Math.atan2(-si.nx,si.nz),si,st,a};}
    const p=P2(-14.5,-10.6);return{x:p[0],z:p[1],y:this.T?R.sampleHr(this.T,p[0],p[1]):fm.y,rot:fm.rot,a:0};},
  farmFolk(){const out=[],h=P.timeOfDay;if(!(h>7&&h<19)||!this.T)return out;for(const v of this.villages){const fm=v.farm;if(!fm||!v.farmOwned)continue;const c=Math.cos(fm.rot),sn=Math.sin(fm.rot);
      for(const [lx,lz,r,hh] of [[-2,-4,0.6,0.13],[-1,-3.4,3.6,0.57],[6,-2.5,2.2,0.81],[-8.7,7.6,-1.2,0.35]]){const x=fm.x+c*lx-sn*lz,z=fm.z+sn*lx+c*lz;out.push({x,z,y:R.sampleHr(this.T,x,z)-0.05,rot:fm.rot+r,hash:hh,k:'stand'});}}return out;},
  slotInds(){return[...this.inds(),['farm',this.farms()]];},
  sawSlots(m){const c=Math.cos(m.rot),sn=Math.sin(m.rot),P2=(lx,lz)=>[m.x+c*lx-sn*lz,m.z+sn*lx+c*lz];if(m.park)return[{k:0,p:P2(-14.5,-22.3),t:m.rot,in:P2(-14.5,-10.6)},{k:1,p:P2(-19.5,20.7),t:m.rot,in:P2(-19.5,9)},{k:2,p:P2(-34.2,0),t:m.rot+Math.PI/2,in:P2(-22.5,0)},{k:3,p:P2(35.7,-2.5),t:m.rot+Math.PI/2,in:P2(24,-2.5)}];if(m.type)return[{k:0,p:P2(-38,0),t:m.rot+Math.PI/2,in:P2(-26,0)},{k:1,p:P2(0,34),t:m.rot,in:P2(0,21)},{k:2,p:P2(0,-34),t:m.rot,in:P2(0,-21)}];return[{k:0,p:P2(-35,0),t:m.rot+Math.PI/2,in:P2(-26,0)},{k:1,p:P2(0,30),t:m.rot,in:P2(0,21)},{k:2,p:P2(0,-30),t:m.rot,in:P2(0,-21)}];},
  nearSawSlot(x,z,r){let best=null,bd=r;for(const [kind,L] of this.slotInds())L.forEach((m,mi)=>{if(!this.indOn(kind,m))return;for(const s of this.sawSlots(m)){const d=Math.hypot(s.p[0]-x,s.p[1]-z);if(d<bd){bd=d;best={kind,mi,k:s.k,slot:s,m};}}});return best;},
  indName(q){if(q.kind==='farm')return `${q.m.v.name} Farm`;return `${q.m.v?q.m.v.name+' ':''}${q.kind==='sawmill'?'Sawmill':q.kind==='mine'?ORE[q.m.type].name+' Mine':'Wood Workshop'}`;},
  attachSawmill(st){const sg=segById(st.sid);if(!sg)return;const p=segPoint(sg,st.t),q=this.nearSawSlot(p[0],p[1],45);if(q){st[q.kind]={mi:q.mi,k:q.k};st.name=this.indName(q);}},
  // level a plot: the average height inside the footprint, blended into the surroundings over a margin (in T.H and the flat mask)
  levelPlot(T,x,z,rot,hx,hz,margin,flatMask,flatH){const N=T.N,cs=T.cs,c=Math.cos(rot),sn=Math.sin(rot);let sum=0,n=0;for(let u=-hx;u<=hx;u+=4)for(let w=-hz;w<=hz;w+=4){const px=x+c*u-sn*w,pz=z+sn*u+c*w;sum+=R.sampleHr(T,px,pz);n++;}const avg=sum/n,ext=Math.hypot(hx,hz)+margin;
    for(let j=Math.floor((z-ext)/cs);j<=Math.ceil((z+ext)/cs);j++)for(let i=Math.floor((x-ext)/cs);i<=Math.ceil((x+ext)/cs);i++){if(i<0||j<0||i>=N||j>=N)continue;const dx=(i+0.5)*cs-x,dz=(j+0.5)*cs-z,u=Math.abs(c*dx+sn*dz)-hx,w=Math.abs(-sn*dx+c*dz)-hz,d=Math.max(u,w),k=j*N+i;
      if(d<=1.5){flatMask[k]=1;flatH[k]=avg;T.H[k]=avg;}else if(d<margin){const t=1-(d-1.5)/(margin-1.5),s2=t*t*(3-2*t);T.H[k]+=(avg-T.H[k])*s2;}}return avg;},
  plotOn(h){return !h.gone&&(h.lvl|0)<=((h.village&&h.village.level)|0);},
  houseOn(h){return this.plotOn(h)&&!(h.prog<1);},
  // ---------------- organic village growth: one house at a time on the best free plot along the streets and roads, new lanes when they fill up
  wetAt(x,z){const T=this.T,w=sampleWater(T,x,z);return w[1]>0&&w[0]>R.sampleHr(T,x,z)-0.6;},
  trackAt(x,z){const T=this.T,M=T.trackMask;if(!M)return false;const N=T.N,cs=T.cs;return M[clamp((z/cs)|0,0,N-1)*N+clamp((x/cs)|0,0,N-1)]>0;},
  // mountain streams as segments in a 16 m grid, so plots and houses keep off the stream beds
  buildStreamGrid(){const T=this.T,G=new Map();for(const st of T.streams||[])for(let i=0;i+5<st.length;i+=3){if(st[i+2]<=0)continue;const hw=clamp(P.riverWidth*6.5*Math.sqrt(st[i+2]),0.7,3.2)*0.9+T.cs*0.3,sg=[st[i],st[i+1],st[i+3],st[i+4],hw];
      for(let kz=Math.floor(Math.min(sg[1],sg[3])/16);kz<=Math.floor(Math.max(sg[1],sg[3])/16);kz++)for(let kx=Math.floor(Math.min(sg[0],sg[2])/16);kx<=Math.floor(Math.max(sg[0],sg[2])/16);kx++){const k=kx+','+kz;if(!G.has(k))G.set(k,[]);G.get(k).push(sg);}}this.sgrid=G;},
  streamNear(x,z,m){const G=this.sgrid;if(!G)return false;const r=m+4;for(let kz=Math.floor((z-r)/16);kz<=Math.floor((z+r)/16);kz++)for(let kx=Math.floor((x-r)/16);kx<=Math.floor((x+r)/16);kx++){const L=G.get(kx+','+kz);if(L)for(const sg of L)if(VG.segDist(sg,x,z)[0]<sg[4]+m)return true;}return false;},
  streamHitsRect(Q,m){const G=this.sgrid;if(!G)return false;const rr=Math.max(-Q.x0,Q.x1,-Q.z0,Q.z1)+m+4;
    for(let kz=Math.floor((Q.z-rr)/16);kz<=Math.floor((Q.z+rr)/16);kz++)for(let kx=Math.floor((Q.x-rr)/16);kx<=Math.floor((Q.x+rr)/16);kx++){const L=G.get(kx+','+kz);if(!L)continue;
      for(const sg of L){const n=Math.max(1,Math.ceil(Math.hypot(sg[2]-sg[0],sg[3]-sg[1])/1.2));for(let k=0;k<=n;k++)if(VG.inRect(Q,sg[0]+(sg[2]-sg[0])*k/n,sg[1]+(sg[3]-sg[1])*k/n,sg[4]+m))return true;}}return false;},
  // a plot rectangle is free: inside the world, dry, off the track and the streams, less than 5 m of fall, clear of other plots, streets (2 m) and the square
  fitsRect(Q,streets,v){const T=this.T,W=T.W,cq=VG.corners(Q);for(const p of cq)if(p[0]<25||p[1]<25||p[0]>W-25||p[1]>W-25)return null;let mn=1e9,mx=-1e9;const c=Math.cos(Q.a),s=Math.sin(Q.a);
    for(const h of this.houses)if(!h.gone&&Math.abs(h.x-Q.x)<45&&Math.abs(h.z-Q.z)<45&&VG.rectHit(Q,h.rect||VG.rectOf(h.x,h.z,h.rot,{r:h.r})))return null;
    for(let i=0;i<=5;i++)for(let j=0;j<=5;j++){const u=Q.x0+(Q.x1-Q.x0)*i/5,w=Q.z0+(Q.z1-Q.z0)*j/5,xx=Q.x+c*u-s*w,zz=Q.z+s*u+c*w,hh=R.sampleHr(T,xx,zz);mn=Math.min(mn,hh);mx=Math.max(mx,hh);if(this.wetAt(xx,zz)||this.trackAt(xx,zz)||this.farmAt(xx,zz,2))return null;}
    if(mx-mn>(v&&v.plan==='hill'?6.5:5))return null;
    for(const st of streets||[]){if(VG.segDist(st,Q.x,Q.z)[0]>40)continue;const L=Math.hypot(st[2]-st[0],st[3]-st[1]),n=Math.ceil(L/1.5);for(let k=0;k<=n;k++)if(VG.inRect(Q,st[0]+(st[2]-st[0])*k/n,st[1]+(st[3]-st[1])*k/n,1.0))return null;}
    if(this.stInfo&&this.stInfo.length&&this.stRectHit(Q,(x,z,m)=>this.stReserve(x,z,m),2))return null;
    for(const u of this.villages)if(u.plaza&&(VG.inRect(Q,u.plaza[0],u.plaza[1],u.plaza[2])||cq.some(p=>Math.hypot(p[0]-u.plaza[0],p[1]-u.plaza[1])<u.plaza[2]+1)))return null;
    return(mn+mx)/2;},
  // street and road segments near a point: village lanes (tagged with their village), country, station, industry and player roads
  nearSegs(x,z,Rr){const out=[],add=(p,vil)=>{for(let i=0;i+3<p.length;i+=2){const sg=[p[i],p[i+1],p[i+2],p[i+3]];if(VG.segDist(sg,x,z)[0]>Rr)continue;sg.vil=vil;out.push(sg);}};
    for(const r of this.vRoads){if(!r.p||r.h)continue;add(r.p,r.way?r.vil:null);}for(const r of Roads.list)add(r.p,null);for(const k in this.stRoads){const p=this.stRoads[k];if(p)add(p.flat(),null);}return out;},
  // what pulls houses (and new lanes): the village's station, its bus stops, the starts of the country roads (ribbon growth toward the neighbours)
  attractors(v){const A=[],R0=v.R0||v.R;for(const s of this.stInfo||[])if(s.v===v&&!s.cargo)A.push({x:s.x,z:s.z,w:0.9});
    for(const s of Buses.stops)if(Math.hypot(s.x-v.x,s.z-v.z)<R0*3+150)A.push({x:s.x,z:s.z,w:0.5});
    for(const L of this.links||[])for(const e of [L[0],L[L.length-1]])if(Math.hypot(e[0]-v.x,e[1]-v.z)<R0*2.2)A.push({x:e[0],z:e[1],w:0.3});return A.sort((a,b)=>b.w-a.w);},
  zoneType(c,rnd){const r=rnd();return c<0.55?(r<0.5?1:r<0.85?0:5):c<1.15?(r<0.45?0:r<0.62?1:5):(r<0.45?2:r<0.72?0:5);},// shops near the square, cottages, farms at the edge
  wantHouses(v){const n0=v.n0||0;return Math.min(n0+Math.round(30*Math.pow(P.villageSize,1.3)),n0+Math.floor((v.gp||0)/8));},
  // lay a street from p0 in steps of 10 m, turning a little toward the flattest way (and toward o.toward); stops at water, track, plots, other streets
  layWay(v,p0,h0,len,o){const T=this.T,H=(x,z)=>R.sampleHr(T,x,z),rnd=o.rnd||Math.random,st=10,pts=[p0.slice()],maxG=o.maxG||(v.plan==='hill'?0.25:0.2),ph=rnd()*6.28,mea=o.meander||0.12;let h=h0,x=p0[0],z=p0[1];const oth=this.nearSegs(x,z,len+40);
    for(let k=0;k<Math.ceil(len/st);k++){let best=null,bc=1e9;for(const dh of [-0.3,-0.15,0,0.15,0.3]){const a=h+dh+(rnd()-0.5)*0.08,nx=x+Math.cos(a)*st,nz=z+Math.sin(a)*st;
        if(nx<40||nz<40||nx>T.W-40||nz>T.W-40)continue;let bad=false;
        for(let q=1;q<=4&&!bad;q++){const qx=x+(nx-x)*q/4,qz=z+(nz-z)*q/4;if(this.wetAt(qx,qz)||this.trackAt(qx,qz)){bad=true;break;}for(const hh of this.houses)if(!hh.gone&&hh.rect&&Math.abs(hh.x-qx)<32&&Math.abs(hh.z-qz)<32&&VG.inRect(hh.rect,qx,qz,1.2)){bad=true;break;}}
        if(!bad&&k>=1)for(const sg of oth)if(VG.segDist(sg,nx,nz)[0]<(k===1?8:20)){bad=true;break;}
        if(!bad&&v.plaza&&k>=1&&Math.hypot(nx-v.plaza[0],nz-v.plaza[1])<v.plaza[2]+2)bad=true;if(!bad&&this.nearLake(nx,nz,3))bad=true;if(bad)continue;
        const dy=Math.abs(H(nx,nz)-H(x,z));if(dy/st>maxG)continue;const c=dy*1.2+Math.abs(dh-mea*Math.sin(k*0.9+ph))*2+(o.toward?-(Math.cos(a)*o.toward[0]+Math.sin(a)*o.toward[1])*0.7:0)+rnd()*0.45+(this.streamNear(nx,nz,1)?1.2:0);
        if(c<bc){bc=c;best=[nx,nz,a];}}
      if(!best)break;x=best[0];z=best[1];h=best[2];pts.push([x,z]);}
    return pts.length>=3?pts:null;},
  addWay(v,pts,w,o){const way={p:pts,w};v.ways.push(way);this.vRoads.push({p:pts.flat(),w,vil:v,lvl:0,way:true});v.streets=[];for(const W2 of v.ways)for(let i=0;i+1<W2.p.length;i++)v.streets.push([W2.p[i][0],W2.p[i][1],W2.p[i+1][0],W2.p[i+1][1]]);
    const rnd=o.rnd||Math.random,T=this.T;let acc=8,side=1;for(let i=1;i<pts.length;i++){const dx=pts[i][0]-pts[i-1][0],dz=pts[i][1]-pts[i-1][1],L=Math.hypot(dx,dz)||1;acc+=L;if(acc<20)continue;acc=0;
      const x=pts[i][0]-dz/L*(w+2.2)*side,z=pts[i][1]+dx/L*(w+2.2)*side;side=-side;if(!this.wetAt(x,z)&&!this.trackAt(x,z))this.lamps.push({x,z,y:R.sampleHr(T,x,z),hash:rnd(),vil:v,lvl:0});}
    if(!o.gen){const vr=this.vRoads[this.vRoads.length-1];if(this.roads&&R.roadD){this.roads.push(vr);R.addRoadPieces(this.T,[vr]);Buses.G=null;Buses.legCache=null;
        const nb=this.findBridges([vr]).filter(b=>!(this.bridges||[]).some(q=>Math.hypot(q.cx-b.cx,q.cz-b.cz)<q.len*0.5+3));if(nb.length){this.bridges=(this.bridges||[]).concat(nb);R.buildBridges(this.bridges);}this.xingDirty=true;}else this.roadsDirty=true;
      this.uploaded=false;{let x0=1e9,z0=1e9,x1=-1e9,z1=-1e9;for(const p of pts){x0=Math.min(x0,p[0]);z0=Math.min(z0,p[1]);x1=Math.max(x1,p[0]);z1=Math.max(z1,p[1]);}this.applyCulverts([x0,z0,x1,z1]);}if(!o.replay)v.log.push(['w',w,...pts.flat().map(q=>Math.round(q*100)/100)]);}return way;},
  // a new lane: carry a street on past its end, or branch off one at right angles, preferring ends that lead toward what pulls the village
  newLane(v,o){const rnd=o.rnd||Math.random,att=this.attractors(v),R0=v.R0||v.R;let best=null;
    for(let t=0;t<14;t++){const W2=v.ways[Math.floor(rnd()*v.ways.length)];if(!W2)break;const n=W2.p.length;let i,h0;
      if(rnd()<0.55){i=n-1;const a=W2.p[n-2],b=W2.p[n-1];h0=Math.atan2(b[1]-a[1],b[0]-a[0]);}
      else{i=1+Math.floor(rnd()*(n-1));const a=W2.p[i-1],b=W2.p[i],hs=Math.atan2(b[1]-a[1],b[0]-a[0]),th=0.6+rnd()*0.6,out=(hh)=>Math.hypot(b[0]+Math.cos(hh)*30-v.x,b[1]+Math.sin(hh)*30-v.z);// forks, not crossings: lanes leave at 35-70 degrees, mostly outward
        h0=(out(hs+th)>out(hs-th))===(rnd()<0.8)?hs+th:hs-th;}
      const p0=W2.p[i];if(v.plaza&&Math.hypot(p0[0]-v.plaza[0],p0[1]-v.plaza[1])<v.plaza[2]+(i===n-1?6:28))continue;
      let toward=null;if(att.length){const dx=att[0].x-p0[0],dz=att[0].z-p0[1],l=Math.hypot(dx,dz);if(l>20)toward=[dx/l,dz/l];}
      const pts=this.layWay(v,p0,h0,40+rnd()*30,{rnd,toward});if(!pts)continue;const e=pts[pts.length-1];
      let sc=-Math.hypot(e[0]-v.x,e[1]-v.z)/R0+rnd()*0.4;for(const a of att)sc+=a.w*Math.exp(-Math.hypot(a.x-e[0],a.z-e[1])/90);if(!best||sc>best.sc)best={pts,sc};}
    return best?this.addWay(v,best.pts,1.4,o):null;},
  // pick the best free plot: close to the square, near what pulls the village, next to neighbours (infill first), along streets and roads
  growHouse(v,o){const rnd=o.rnd||Math.random,R0=v.R0||v.R,nH=v.houses.filter(h=>!h.gone).length,maxD=R0*(1.1+0.06*nH)+50,segs=this.nearSegs(v.x,v.z,maxD+60),att=this.attractors(v),C=[];
    const near=this.houses.filter(h=>!h.gone&&h.rect&&Math.hypot(h.x-v.x,h.z-v.z)<maxD+80);
    for(const sg of segs){const L=Math.hypot(sg[2]-sg[0],sg[3]-sg[1]);if(L<4)continue;const sd=[(sg[2]-sg[0])/L,(sg[3]-sg[1])/L],sn=[-sd[1],sd[0]];
      for(let u=2;u<L-1.5;u+=2.5)for(const side of [-1,1]){const x=sg[0]+sd[0]*u,z=sg[1]+sd[1]*u,d=Math.hypot(x-v.x,z-v.z);if(d>maxD)continue;
        const fx=x+sn[0]*side*5,fz=z+sn[1]*side*5;let taken=false;for(const h of near)if(Math.abs(h.x-fx)<26&&Math.abs(h.z-fz)<26&&VG.inRect(h.rect,fx,fz,1)){taken=true;break;}if(taken)continue;
        let sc=-d/R0*1.1+rnd()*0.5+(sg.vil===v?0.25:0);for(const a of att)sc+=a.w*Math.exp(-Math.hypot(a.x-x,a.z-z)/70);
        let nb=0;for(const h of v.houses)if(!h.gone&&Math.abs(h.x-x)<32&&Math.abs(h.z-z)<32)nb++;sc+=Math.min(nb,5)*0.12;C.push({x,z,sn,side,d,sc,sg});}}
    C.sort((a,b)=>b.sc-a.sc);let tries=0;
    for(const c of C){if(tries++>420)break;const vt=o.vt!=null?o.vt:this.zoneType(c.d/R0,rnd),def=R.houseDefs[vt];if(!def.plot)continue;const a=Math.atan2(-c.side*c.sn[0],c.side*c.sn[1]);
      for(const dz of [0,1.5,3.2]){const off=-def.plot.z0+2.4+dz,x=c.x+c.sn[0]*c.side*off,z=c.z+c.sn[1]*c.side*off,Q=VG.rectOf(x,z,a,def),base=this.fitsRect(Q,segs,v);if(base!==null)return this.addHouse(v,{x,z,a,vt,hash:rnd(),sg:c.sg},base,o);}}
    return null;},
  addHouse(v,q,base,o){const def=R.houseDefs[q.vt],Q=VG.rectOf(q.x,q.z,q.a,def),h={x:q.x,z:q.z,y:base,rot:q.a,v:q.vt,r:def.r,hash:q.hash,village:v,lvl:o.lvl|0,rect:Q,front:VG.gateOf(q.x,q.z,q.a,def)};if(o.fixed)h.fixed=true;
    if(!o.gen&&!o.replay)h.prog=0;this.houses.push(h);v.houses.push(h);v.R=Math.max(v.R,Math.hypot(h.x-v.x,h.z-v.z)+def.r*0.5);
    let sg=q.sg;if(!sg){let bd=1e9;for(const s2 of this.nearSegs(h.front[0],h.front[1],60)){const dd=VG.segDist(s2,h.front[0],h.front[1])[0];if(dd<bd){bd=dd;sg=s2;}}}
    const path=sg?{p:[h.front[0],h.front[1],...VG.segDist(sg,h.front[0],h.front[1]).slice(1)],w:0.6,h}:null;if(path)this.vRoads.push(path);
    for(const l of this.lamps)if(!l.gone&&Math.abs(l.x-h.x)<30&&Math.abs(l.z-h.z)<30&&VG.inRect(Q,l.x,l.z,0.8))l.gone=true;
    if(o.gen){o.flat(Q,base);o.clear.push([q.x,q.z,def.r*0.85]);return h;}
    this.flattenLive(Q,base);R.clearVegRect(this.T,Q,2);this.culvertLater([q.x-30,q.z-30,q.x+30,q.z+30]);if(path){this.roads.push(path);if(!R.addRoadPieces(this.T,[path]))this.roadsDirty=true;}this.uploaded=false;this.kitDirty=true;
    if(!o.replay)v.log.push(['h',Math.round(q.x*100)/100,Math.round(q.z*100)/100,Math.round(q.a*1e4)/1e4,q.vt,Math.round(q.hash*1e4)/1e4]);return h;},
  // level a new plot while playing: the flat mask (kept for later full rebuilds) and the drawn heights, uploaded for just that patch
  flattenLive(Q,base){const T=this.T,N=T.N,cs=T.cs;if(!T.flatMask){T.flatMask=new Uint8Array(N*N);T.flatH=new Float32Array(N*N);}let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
    for(const p of VG.corners(Q)){x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);z0=Math.min(z0,p[1]);z1=Math.max(z1,p[1]);}
    const i0=Math.max(0,Math.floor((x0-3)/cs)),i1=Math.min(N-1,Math.ceil((x1+3)/cs)),j0=Math.max(0,Math.floor((z0-3)/cs)),j1=Math.min(N-1,Math.ceil((z1+3)/cs));
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++)if(VG.inRect(Q,(i+0.5)*cs,(j+0.5)*cs,1.5)){const k=j*N+i;T.flatMask[k]=1;T.flatH[k]=base;T.Hr[k]=base;}
    R.patchTerrain(T,i0,j0,i1,j1);},
  // while playing: start a house whenever the village's growth points ask for more; each one is a building site for about a minute
  updateGrowth(dt){const B=this.building||(this.building=[]);let done=false;
    for(const h of B){const st=Math.floor(h.prog*3);h.prog=Math.min(1,h.prog+dt/(h.v===2?75:55));if(h.gone)h.prog=1;if(Math.floor(h.prog*3)!==st)this.uploaded=false;if(h.prog>=1)done=true;}
    if(done){this.building=B.filter(h=>h.prog<1);this.uploaded=false;this.kitDirty=true;for(const v of this.villages)VillageUI.refresh(v);}
    this.growT=(this.growT||0)-dt;if(this.growT>0||!this.villages.length)return;
    /* one village per call, round robin, and a real-time gap between calls: a village's growth step costs several ms (plot search, levelling,
       trees, paths), so at 8x fast forward doing all villages at once made the game stutter. Growth per game time is unchanged at 1x. */
    const rt=performance.now();if(rt-(this.growRT||0)<120)return;this.growRT=rt;this.growI=((this.growI|0)+1)%this.villages.length;if(this.growI===0)this.growT=1.5;const now=App.time||0;
    for(const v of [this.villages[this.growI]]){if(!v.ways||(v.nextTry||0)>now)continue;const n=v.houses.filter(h=>!h.gone&&!h.fixed).length,want=this.wantHouses(v),nb=this.building.filter(h=>h.village===v).length;
      if(n>=want||nb>=clamp(Math.ceil((want-n)/4),1,4))continue;let h=this.growHouse(v,{});if(!h&&(v.idleLanes|0)<2&&v.ways.length<4+n/3&&this.newLane(v,{})){v.idleLanes=(v.idleLanes|0)+1;h=this.growHouse(v,{});}
      if(h){v.idleLanes=0;this.building.push(h);VillageUI.refresh(v);}else{v.nextTry=now+(v.idleLanes>=2?90:25);if(v.idleLanes>=2)v.idleLanes=1;}}},
  /* culverts after growth are batched: the regions of new plots are merged and done together at most every 1.5 s (each run rebuilds the
     terrain patch texture and sinks trees) */
  culvertLater(r){const P0=this.pendCulv;this.pendCulv=P0?[Math.min(P0[0],r[0]),Math.min(P0[1],r[1]),Math.max(P0[2],r[2]),Math.max(P0[3],r[3])]:r.slice();},
  culvertFlush(){if(!this.pendCulv)return;const rt=performance.now();if(rt-(this.culvRT||0)<1500)return;this.culvRT=rt;const r=this.pendCulv;this.pendCulv=null;this.applyCulverts(r);},
  // ---------------- culverts: streams go into a pipe under plots, village streets, garden paths and squares, with a stone headwall at each mouth
  culvertGrid(){const G=new Map(),put=(o,x0,z0,x1,z1)=>{for(let kz=Math.floor(z0/24);kz<=Math.floor(z1/24);kz++)for(let kx=Math.floor(x0/24);kx<=Math.floor(x1/24);kx++){const k=kx+','+kz;if(!G.has(k))G.set(k,[]);G.get(k).push(o);}};
    for(const h of this.houses){if(!this.plotOn(h)||!h.rect)continue;const Q=h.rect,r=Math.max(-Q.x0,Q.x1,-Q.z0,Q.z1)+2;put({Q},h.x-r,h.z-r,h.x+r,h.z+r);}
    for(const v of this.villages){if(v.plaza&&(v.level|0)>=1){const [x,z,r]=v.plaza;put({d:[x,z,r+1.5]},x-r-2,z-r-2,x+r+2,z+r+2);}}
    // the railway: a brook under open track (not a bridge or a tunnel) goes through a culvert under the ballast
    if(typeof Track!=='undefined')for(const s of Track.segs){if(s.pend)continue;const n=Math.max(1,Math.ceil(s.L/6));for(let i=0;i<n;i++){const ta=s.L*i/n,tb=s.L*(i+1)/n,sp=spanAt(s,(ta+tb)/2);if(sp)continue;
        const a=segPoint(s,ta),b=segPoint(s,tb),sg=[a[0],a[1],b[0],b[1]],w=4.4;put({sg,w},Math.min(sg[0],sg[2])-w,Math.min(sg[1],sg[3])-w,Math.max(sg[0],sg[2])+w,Math.max(sg[1],sg[3])+w);}}
    for(const r of this.vRoads){if(!r.p||!r.h||!this.plotOn(r.h))continue;const w=r.w+1.4;for(let i=0;i+3<r.p.length;i+=2){const sg=[r.p[i],r.p[i+1],r.p[i+2],r.p[i+3]];put({sg,w},Math.min(sg[0],sg[2])-w,Math.min(sg[1],sg[3])-w,Math.max(sg[0],sg[2])+w,Math.max(sg[1],sg[3])+w);}}
    this.cgrid=G;},
  culvertAt(x,z){const L=this.cgrid&&this.cgrid.get(Math.floor(x/24)+','+Math.floor(z/24));if(!L)return false;for(const o of L){if(o.Q?VG.inRect(o.Q,x,z,0.8):o.d?Math.hypot(x-o.d[0],z-o.d[1])<o.d[2]:VG.segDist(o.sg,x,z)[0]<o.w)return true;}return false;},
  // How deep a culvert's ditch is at (x,z). Like a real road or railway culvert, the stream is led to the pipe in a dug ditch so the pipe's
  // invert is the lowest point and the headwall stands in the ditch with its coping flush with the ground (not on top of the field):
  // full depth at the face, the ditch floor then rising gently along the stream (with the water) until it meets the natural bed, its
  // sides sloping out at about 1:1.25. Behind the face the ground comes back up inside the headwall's body (or, for a bare pipe, as a bank).
  trenchDepth(ts,x,z){let best=0;const ss=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
    for(const t of ts){if(Math.abs(x-t.fx)>t.ext||Math.abs(z-t.fz)>t.ext)continue;const p=t.poly;let bd=1e9,bs=0,bi=0;
      for(let i=0;i+1<p.length;i++){const ax=p[i][0],az=p[i][1],ex=p[i+1][0]-ax,ez=p[i+1][1]-az,ll=ex*ex+ez*ez||1e-6;let u=((x-ax)*ex+(z-az)*ez)/ll;if(i>0||u>0)u=Math.max(u,0);u=Math.min(u,1);
        const d=Math.hypot(x-ax-ex*u,z-az-ez*u);if(d<bd){bd=d;bs=p[i][2]+u*Math.sqrt(ll);bi=i;}}
      let dep,wf,bw;
      if(bs<0){dep=t.dep[0]*(1-ss(t.b0,t.b1,-bs));wf=t.wb;bw=t.pipe?0.45+dep*1.25:0.3;}
      else{const q=p[bi],r=p[bi+1],f=clamp((bs-q[2])/Math.max(r[2]-q[2],1e-4),0,1);dep=t.dep[bi]+(t.dep[bi+1]-t.dep[bi])*f;wf=t.wf0+(t.wf1-t.wf0)*ss(t.n0,t.n0+2.5,bs);bw=0.45+dep*1.25;}
      if(dep<=1e-3)continue;const v=dep*(1-ss(wf,wf+bw,bd));if(v>best)best=v;}
    return best>1e-3?best:0;},
  applyCulverts(bb){if(!R.stC||!this.T)return;this.culvertGrid();const C=R.stC,H=R.stHid,T=this.T,test=k=>{if(C[k*6+5]<0.5)return;H[k]=this.culvertAt(C[k*6],C[k*6+1])?1:0;};
    if(bb){for(let kz=Math.floor((bb[1]-30)/24);kz<=Math.floor((bb[3]+30)/24);kz++)for(let kx=Math.floor((bb[0]-30)/24);kx<=Math.floor((bb[2]+30)/24);kx++){const L=R.stGrid.get(kx+','+kz);if(L)for(const k of L)test(k);}}else for(let k=0;k<H.length;k++)test(k);
    const SS=R.stSS,M=[],TR=[],FL=new Float32Array(H.length);
    // a short open stretch between two pipes (a garden, then a path) stays in the pipe
    // (and so does one shorter than two ditches would need: two culverts close together read as one longer one)
    for(let s2=0;s2<SS.length;s2+=2){const b=SS[s2],n=SS[s2+1];let i=b;while(i<b+n){if(H[i]){i++;continue;}let j=i;while(j<b+n&&!H[j])j++;let gl=0;for(let k=i;k<j;k++)gl+=Math.hypot(C[k*6+6]-C[k*6],C[k*6+7]-C[k*6+1]);if(i>b&&j<b+n&&(j-i<=2||gl<18))for(let k=i;k<j;k++)H[k]=1;i=j;}}
    for(let k=0;k<H.length;k++)FL[k]=H[k];
    for(let s2=0;s2<SS.length;s2+=2){const b=SS[s2],n=SS[s2+1];
      for(let i=b;i<b+n-1;i++){if(H[i]===H[i+1])continue;const vi=H[i]?i+1:i,hi=H[i]?i:i+1,step=vi-hi;
        // the face: exactly where the pipe's cover begins (bisection between the last open and the first piped ribbon point)
        let ax=C[vi*6],az=C[vi*6+1],bx=C[hi*6],bz=C[hi*6+1];const sl=Math.hypot(bx-ax,bz-az)||1;for(let it=0;it<9;it++){const mx=(ax+bx)/2,mz=(az+bz)/2;if(this.culvertAt(mx,mz)){bx=mx;bz=mz;}else{ax=mx;az=mz;}}
        const tf=clamp(Math.hypot(ax-C[vi*6],az-C[vi*6+1])/sl,0.02,0.98);FL[hi]=Math.max(FL[hi]>1?FL[hi]:0,0.5/tf);// the water is cut at the face (the flag is interpolated)
        let dx=C[vi*6]-C[hi*6],dz=C[vi*6+1]-C[hi*6+1];const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;
        const hw=C[vi*6+4],wd=hw/1.8,sc=clamp(wd*1.3/0.45,0.7,2.6),pipe=sc<1.45,Gf=R.drawnH(T,ax,az),inlet=vi<hi;
        // the cover over the pipe is measured from the lowest ground just behind the face, so neither the bare pipe nor the headwall's back shows
        let G0=Gf;for(const b2 of pipe?[0.8,1.6,2.5]:[0.4,0.75])G0=Math.min(G0,R.drawnH(T,ax-dx*b2*sc,az-dz*b2*sc));const D=(pipe?1.03*sc+0.25:1.09*sc)+(Gf-G0),Lm=clamp(D*7,9,26);G0=Gf;
        // the ditch follows the stream away from the face; the floor runs at a 1.2 % fall toward the pipe and meets the natural ground
        const poly=[[ax,az,0]],dep=[D];let sacc=0,px=ax,pz=az;for(let k=vi;k>=b&&k<b+n&&sacc<Lm+3;k+=step){if(H[k])break;const x=C[k*6],z=C[k*6+1];sacc+=Math.hypot(x-px,z-pz);if(sacc<0.05)continue;poly.push([x,z,sacc]);px=x;pz=z;}
        if(poly.length<2)poly.push([ax+dx*3,az+dz*3,3]);
        for(let k=1;k<poly.length;k++){const q=poly[k],fl=G0-D+(inlet?1:-1)*0.012*q[2];let d=clamp(R.drawnH(T,q[0],q[1])-fl,0,D);d=Math.min(d,dep[k-1]);
          const fa=clamp((q[2]-Lm*0.55)/(Lm*0.45),0,1);dep.push(d*(1-fa*fa*(3-2*fa)));}
        dep[dep.length-1]=0;
        const t={fx:ax,fz:az,poly,dep,pipe,sc,D,wf0:pipe?0.52*sc+0.3:1.35*sc,wf1:hw+0.15,n0:pipe?0.3:0.9*sc,wb:pipe?0.52*sc+0.2:1.1*sc,b0:pipe?0:0.3*sc,b1:pipe?0.15+D*0.45:0.65*sc};
        t.ext=Lm+4+Math.max(t.wf0,t.wf1)+0.45+D*1.25+1;TR.push(t);
        M.push({x:ax,z:az,y:G0-D,rot:Math.atan2(dz,dx),sc,pipe});}}
    // the water lies on the ditch floor: each ribbon vertex in a ditch drops by the ditch's depth there; flags and drops are uploaded in runs
    const V=R.stV,ch=new Set(),old=R.stDropK||new Set(),nk=new Set(),T2=TR;R.stFL=R.stFL&&R.stFL.length===H.length?R.stFL:new Float32Array(H.length);
    for(let k=0;k<H.length;k++)if(R.stFL[k]!==FL[k]){R.stFL[k]=FL[k];ch.add(k);}
    for(const t of T2){for(let kz=Math.floor((t.fz-t.ext)/24);kz<=Math.floor((t.fz+t.ext)/24);kz++)for(let kx=Math.floor((t.fx-t.ext)/24);kx<=Math.floor((t.fx+t.ext)/24);kx++){const L=R.stGrid.get(kx+','+kz);if(L)for(const k of L)nk.add(k);}}
    for(const k of new Set([...old,...nk])){let any=false;for(const e of [0,1]){const o=(k*2+e)*8,d=nk.has(k)?Math.max(0,this.trenchDepth(T2,V[o],V[o+2])-0.02):0;if(d>0)any=true;if(Math.abs(V[o+1]-d)>1e-4){V[o+1]=d;ch.add(k);}}if(!any)nk.delete(k);}
    R.stDropK=nk;for(const k of ch){V[(k*2)*8+7]=FL[k];V[(k*2+1)*8+7]=FL[k];}R.uploadStreamPts([...ch]);
    // the ditch patches and the trees in them only change with the ditches or the ground (each new house calls this)
    const sig=(R.terrVer|0)+'|'+(+P.riverQ||0)+'|'+T2.map(t=>t.fx.toFixed(2)+','+t.fz.toFixed(2)+','+t.D.toFixed(3)+','+t.poly.length+','+t.dep.map(d=>d.toFixed(3)).join(',')).join(';');
    this.trenches=T2;if(sig!==this.trSig||!R.patches){this.trSig=sig;R.buildPatches(T,T2);R.sinkVeg(T,T2);}
    const cs=M.map(c=>c.x.toFixed(2)+','+c.z.toFixed(2)+','+c.y.toFixed(3)+','+c.sc.toFixed(3)).join(';');if(cs!==this.cvSig){this.cvSig=cs;this.culverts=M;this.uploaded=false;this.kitDirty=true;}},
  // a saved village: lanes and houses again in the order they were built (skipped if the ground has changed under them)
  replayVillage(v,log){for(const e of log||[]){if(e[0]==='w'){const p=[];for(let i=2;i+1<e.length;i+=2)p.push([e[i],e[i+1]]);if(p.length>=2)this.addWay(v,p,e[1],{replay:true});}
      else if(e[0]==='h'){const def=R.houseDefs[e[4]];if(!def||!def.plot)continue;const Q=VG.rectOf(e[1],e[2],e[3],def),base=this.fitsRect(Q,this.nearSegs(e[1],e[2],120),v);if(base===null)continue;this.addHouse(v,{x:e[1],z:e[2],a:e[3],vt:e[4],hash:e[5]},base,{replay:true});}}
    v.log=(log||[]).slice();},
  // ---------------- village growth: growth points → levels (hamlet, village, town); a level reveals more of the planned village
  LEVELS:[{name:'Hamlet',need:0},{name:'Village',need:100},{name:'Town',need:300}],
  addGrowth(v,pts){v.gp=(v.gp||0)+pts;let lv=0;for(let k=0;k<this.LEVELS.length;k++)if(v.gp>=this.LEVELS[k].need)lv=k;if(lv!==(v.level|0)){const up=lv>(v.level|0);v.level=lv;this.uploaded=false;this.roadsDirty=true;this.applyCulverts([v.x-v.R-40,v.z-v.R-40,v.x+v.R+40,v.z+v.R+40]);
      this.busyText=`${v.name} is growing: laying out new streets…`;UI.toast(up?`${v.name} grew into a ${this.LEVELS[lv].name.toLowerCase()}!`:`${v.name} is now a ${this.LEVELS[lv].name.toLowerCase()}`);}VillageUI.refresh(v);},
  growNow(v){const nx=Math.min((v.level|0)+1,this.LEVELS.length-1);if(nx===(v.level|0)){UI.toast(`${v.name} is already a town`);return;}this.addGrowth(v,this.LEVELS[nx].need-(v.gp||0));},
  nearestVillage(x,z,maxD){let best=null,bd=maxD||380;for(const v of this.villages){const d=Math.hypot(v.x-x,v.z-z);if(d<bd){bd=d;best=v;}}return best;},
  // ---------------- per frame
  windowsLit(A){const h=P.timeOfDay;let f=h>=16&&h<23?0.85:h>=23||h<5?0.22:h>=5&&h<8.5?0.5:0;return clamp(f*smooth(0.55,0.05,A.day)+A.E.overcast*0.15*(1-A.day*0.5),0,1);},
  lights(F,n){const L=[];const add=(x,y,z,r,c)=>L.push([x,y,z,r,...c,Math.hypot(x-F[0],z-F[2])]);
    for(const s of this.stInfo){add(s.lx[0],s.y+4,s.lx[1],24,[1.6,1.1,0.6]);add(s.lx2[0],s.y+4,s.lx2[1],24,[1.6,1.1,0.6]);}
    for(const tr of Trains.list){const p=locoPoint(tr,(tr.rev||1)>=0?9:-6,1.6,0);if(p)add(p[0],p[1],p[2],38,[1.8,1.5,1.1]);}
    L.sort((a,b)=>a[7]-b[7]);return L.slice(0,n);},
  update(dt){const T=this.T;if(!T||!R.A)return;const A=R.A,t=App.time;
    /* the station picture (stInfo, roads, footprints, houses that make way) is rebuilt only when stations, track or village sizes change;
       it used to be rebuilt every frame, and with it every building instance (4.8.0-4.13.0: a large share of the frame) */
    {let sg=Net.ver+'|';for(const st of Track.stations)sg+=st.id+':'+st.sid+':'+Math.round(st.t*10)+':'+(st.len|0)+':'+(st.twinOf||'')+':'+(st._f||'')+';';for(const v of this.villages)sg+=(v.level|0)+(v.farmOwned?'f':'');
      if(sg!==this._usig){this._usig=sg;this.updateStations();}else this.trainsAtStations();}
    // animals graze and wander inside their pasture
    this.updateHerds(dt);this.culvertFlush();
    // ducks and swans paddle about; families follow the leader
    const frozen=Weather.ice>0.5;
    for(const s of this.swimmers){if(s.lead){const L=s.lead,bx=L.x-Math.cos(L.rot)*s.off*1.6*(s.swan?2:1),bz=L.z-Math.sin(L.rot)*s.off*1.6*(s.swan?2:1)+Math.sin(t*0.7+s.hash*9)*0.4;
        const dx=bx-s.x,dz=bz-s.z,d=Math.hypot(dx,dz);if(d>0.05){const v=Math.min(d,dt*(0.5+d*0.5));s.x+=dx/d*v;s.z+=dz/d*v;s.rot=lerpAng(s.rot,Math.atan2(dz,dx),dt*2);}continue;}
      if(s.wait>0){s.wait-=dt;continue;}const dx=s.tx-s.x,dz=s.tz-s.z,d=Math.hypot(dx,dz);
      if(d<1){for(let k=0;k<8;k++){const a=Math.random()*6.28,r=10+Math.random()*50,x=s.x+Math.cos(a)*r,z=s.z+Math.sin(a)*r;if(this.isLake(x,z)){s.tx=x;s.tz=z;break;}}s.wait=Math.random()*6;continue;}
      const v=dt*(s.swan?0.7:0.9);const nx=s.x+dx/d*v,nz=s.z+dz/d*v;if(!this.isLake(nx,nz)){s.tx=s.x;s.tz=s.z;continue;}s.x=nx;s.z=nz;s.rot=lerpAng(s.rot,Math.atan2(dz,dx),dt*1.5);}
    for(const b of this.boats){if(b.wait>0){b.wait-=dt;continue;}const dx=b.tx-b.x,dz=b.tz-b.z,d=Math.hypot(dx,dz);
      if(d<2){for(let k=0;k<10;k++){const a=Math.random()*6.28,r=40+Math.random()*120,x=b.x+Math.cos(a)*r,z=b.z+Math.sin(a)*r;let ok=true;for(let q=1;q<=6&&ok;q++)ok=this.isLake(b.x+(x-b.x)*q/6,b.z+(z-b.z)*q/6);if(ok){b.tx=x;b.tz=z;break;}}b.wait=4+Math.random()*10;continue;}
      const tg=Math.atan2(dz,dx);b.rot=lerpAng(b.rot,tg,dt*0.5);const al=Math.cos(wrapPi(tg-b.rot));const v=dt*(b.sail?2.2:1.3)*Math.max(al,0.15);const nx=b.x+Math.cos(b.rot)*v,nz=b.z+Math.sin(b.rot)*v;
      if(this.isLake(nx,nz)){b.x=nx;b.z=nz;}else{b.tx=b.x;b.tz=b.z;}}
    // windmills turn their caps into the wind, sails speed up with it
    const wa=P.windDir*Math.PI/180,ws=Weather.eff().wind;for(const m of this.mills){m.rot=lerpAng(m.rot,wa+Math.PI,dt*0.15);m.ang+=dt*(0.25+ws*0.9)*(m.gone?0:1);}
    this.updateGrowth(dt);this.updateWalkers(dt,A);this.updateVillagers(dt,A);this.updateCrew(dt);this.updateStationCare(dt);this.updateFarm(dt);this.updateSnowWork(dt,A);
    /* ambient details (leaves, steamers, balloons, beach-goers): at 4× and 8× with 'Fast forward: life details' on Reduced they update every 3rd frame with the summed time */
    this.ambDt=(this.ambDt||0)+dt;this.ambN=((this.ambN|0)+1)%3;if(P.ffDetail||(App.ff||1)<4||this.ambN===0){const ad=this.ambDt;this.ambDt=0;this.updateLeaves(ad);this.updateSteamers(ad);this.updateBalloons(ad);this.updateBeaches(ad,A);}Buses.update(dt);if(this.pendingV&&this.villages.length){this.pendingV.forEach((q,i)=>{const v=this.villages[i];if(v){v.gp=q.gp;v.level=q.level;v.farmOwned=!!q.farm;v.sawOwned=!!q.saw;v.mineOwned=!!q.mine;v.bankOwned=!!q.bank;v.docksOwned=!!q.docks;v.trans=q.trans||0;if(q.log&&q.log.length)this.replayVillage(v,q.log);}});this.pendingV=null;this.applyCulverts(null);R.uploadFields(this.T);this.farm.season=null;this.uploaded=false;this.roadsDirty=true;}this.updateSkaters(dt,A);this.updateSledding(dt,A);if(this.roadsDirty&&!this.roadsBusy){this.roadsBusy=true;Busy.run(this.busyText||'Updating roads and bridges…',()=>{this.roadsDirty=false;this.xingDirty=false;this.busyText=null;try{this.rebuildRoads();}finally{this.roadsBusy=false;}});}else if(this.xingDirty){this.xingDirty=false;this.rebuildCrossings();}this.updateCrossings(dt);this.updateFlocks(dt,A);this.smoke(dt,A);},
  // ---------------- station roads: A* over a 5 m grid (slope-weighted, around water and houses), smoothed
  routeRoad(a,v){let best=null,bd=1e9;for(const s of v.streets||[]){const ex=s[2]-s[0],ez=s[3]-s[1],ll=ex*ex+ez*ez||1,t=clamp(((a[0]-s[0])*ex+(a[1]-s[1])*ez)/ll,0.05,0.95),x=s[0]+ex*t,z=s[1]+ez*t,d=Math.hypot(x-a[0],z-a[1]);if(d<bd){bd=d;best=[x,z];}}
    if(!best||bd<8)return null;return this.routePath(a,best,{cs:5,margin:90,bridge:true,wind:0.25});},
  // A* on a grid: slope cost, gentle value-noise wander, lakes and houses blocked, rivers crossable (bridges) at a price
  routePath(a,b,o){const T=this.T,cs=o.cs,N=T.N,x0=Math.min(a[0],b[0])-o.margin,z0=Math.min(a[1],b[1])-o.margin,nx=Math.min(280,Math.ceil((Math.abs(a[0]-b[0])+2*o.margin)/cs)),nz=Math.min(280,Math.ceil((Math.abs(a[1]-b[1])+2*o.margin)/cs));
    const n=nx*nz,hh=new Float32Array(n),cost=new Float32Array(n);const seed=(P.seed|0)*0.013,vn=(x,z)=>{const xi=Math.floor(x),zi=Math.floor(z),fx=x-xi,fz=z-zi,h=(i,j)=>{const q=Math.sin(i*127.1+j*311.7+seed)*43758.5453;return q-Math.floor(q);},u=fx*fx*(3-2*fx),w=fz*fz*(3-2*fz);
      return h(xi,zi)*(1-u)*(1-w)+h(xi+1,zi)*u*(1-w)+h(xi,zi+1)*(1-u)*w+h(xi+1,zi+1)*u*w;};
    for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const x=x0+(i+0.5)*cs,z=z0+(j+0.5)*cs,k=j*nx+i;if(x<6||z<6||x>T.W-6||z>T.W-6){cost[k]=-1;continue;}hh[k]=R.sampleHr(T,x,z);
      const ci=clamp((x/T.cs)|0,0,N-1),cj=clamp((z/T.cs)|0,0,N-1),cn=cj*N+ci,wt=T.water[cn*4+3]>0&&T.water[cn*4]>T.H[cn]+0.15;
      if(wt){cost[k]=(T.shore[cn]>=0.99||!o.bridge)?-1:(o.road&&this.roadKill&&this.roadKill[cn]?1:14);}else cost[k]=o.road?(this.roadKill&&this.roadKill[cn]?o.road:1.8):1+o.wind*(vn(x/90,z/90)*1.6+vn(x/31,z/31)*0.5);}
    for(const h of this.houses){if(h.gone)continue;const r=h.r+1.5;for(let j=Math.floor((h.z-r-z0)/cs);j<=Math.floor((h.z+r-z0)/cs);j++)for(let i=Math.floor((h.x-r-x0)/cs);i<=Math.floor((h.x+r-x0)/cs);i++)if(i>=0&&j>=0&&i<nx&&j<nz)cost[j*nx+i]=-1;}
    const id=(x,z)=>clamp(Math.floor((z-z0)/cs),0,nz-1)*nx+clamp(Math.floor((x-x0)/cs),0,nx-1),s0=id(a[0],a[1]),s1=id(b[0],b[1]);cost[s0]=1;cost[s1]=1;
    const g=new Float32Array(n).fill(1e30),from=new Int32Array(n).fill(-1),hk=[],hv=[];const push=(v,k)=>{hk.push(k);hv.push(v);let i=hv.length-1;while(i>0){const p=(i-1)>>1;if(hv[p]<=hv[i])break;[hv[p],hv[i]]=[hv[i],hv[p]];[hk[p],hk[i]]=[hk[i],hk[p]];i=p;}};
    const pop=()=>{const k=hk[0],lv=hv.pop(),lk=hk.pop();if(hv.length){hv[0]=lv;hk[0]=lk;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<hv.length&&hv[l]<hv[m])m=l;if(r<hv.length&&hv[r]<hv[m])m=r;if(m===i)break;[hv[m],hv[i]]=[hv[i],hv[m]];[hk[m],hk[i]]=[hk[i],hk[m]];i=m;}}return k;};
    const ex=s1%nx,ez=(s1/nx)|0,hx=k=>Math.hypot((k%nx)-ex,((k/nx)|0)-ez)*cs;g[s0]=0;push(hx(s0),s0);let it=0;
    while(hv.length&&it++<200000){const k=pop();if(k===s1)break;const ki=k%nx,kj=(k/nx)|0;
      for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const ii=ki+di,jj=kj+dj;if(ii<0||jj<0||ii>=nx||jj>=nz)continue;const m=jj*nx+ii,cm=cost[m];if(cm<0)continue;
        const L=Math.hypot(di,dj)*cs,gr=Math.abs(hh[m]-hh[k])/L;if(gr>(o.maxG||0.3)&&cm<5)continue;const ng=g[k]+L*(cm+(cm<5?40*gr*gr:0));if(ng<g[m]){g[m]=ng;from[m]=k;push(ng+hx(m),m);}}}
    if(from[s1]<0)return null;let pts=[],k=s1;while(k>=0&&pts.length<4000){pts.push([x0+((k%nx)+0.5)*cs,z0+(((k/nx)|0)+0.5)*cs]);if(k===s0)break;k=from[k];}pts.reverse();pts[0]=[a[0],a[1]];pts[pts.length-1]=[b[0],b[1]];
    pts=pts.filter((p,i)=>i===0||i===pts.length-1||i%2===0);for(let it2=0;it2<3;it2++){const q=[pts[0]];for(let i=0;i<pts.length-1;i++){const p0=pts[i],p1=pts[i+1];q.push([p0[0]*.75+p1[0]*.25,p0[1]*.75+p1[1]*.25],[p0[0]*.25+p1[0]*.75,p0[1]*.25+p1[1]*.75]);}q.push(pts[pts.length-1]);pts=q;}
    for(let i=1;i<pts.length-1;i++)pts[i]=this.awayFromLake(pts[i]);
    return pts;},
  // bridges wherever a road crosses a river (wet run) or a mountain stream (segment intersection); deck humps over the water
  findBridges(roads){const T=this.T,B=[],H=(x,z)=>R.sampleHr(T,x,z),wetAt=(x,z)=>{const w=sampleWater(T,x,z);return w[1]>0&&w[0]>H(x,z)-0.15?w[0]:null;};
    const SG=new Map(),key=(x,z)=>Math.floor(x/16)+','+Math.floor(z/16);for(const st of T.streams||[])for(let i=0;i+5<st.length;i+=3){if(st[i+2]<=0)continue;const k=key((st[i]+st[i+3])/2,(st[i+1]+st[i+4])/2);if(!SG.has(k))SG.set(k,[]);SG.get(k).push([st[i],st[i+1],st[i+3],st[i+4],st[i+2]]);}
    const add=(cx,cz,dx,dz,len,w,lvl,sw)=>{if(B.some(b=>Math.hypot(b.cx-cx,b.cz-cz)<b.len*0.5+3))return;const pts=[],n=Math.max(4,Math.ceil(len/1.5)),ya=H(cx-dx*len/2,cz-dz*len/2)+0.12,yb=H(cx+dx*len/2,cz+dz*len/2)+0.12;
      for(let k=0;k<=n;k++){const u=k/n,x=cx+dx*len*(u-0.5),z=cz+dz*len*(u-0.5),base=ya+(yb-ya)*u,need=lvl+(lvl>-1e8?2.0:0),hump=Math.max(0,need-base,lvl>-1e8?0.35*len/8:1.0);pts.push([x,base+Math.max(0,hump)*Math.sin(Math.PI*u),z]);}B.push({cx,cz,len,w,pts,lvl,sw:sw||0});};
    for(const r of roads||this.roads){if(r.disc)continue;const p=r.p,S=[];for(let i=0;i+3<p.length;i+=2){const x0=p[i],z0=p[i+1],x1=p[i+2],z1=p[i+3],L=Math.hypot(x1-x0,z1-z0),n=Math.max(1,Math.ceil(L));for(let k=(i?1:0);k<=n;k++)S.push([x0+(x1-x0)*k/n,z0+(z1-z0)*k/n]);}
      let run=-1,lv=-1e9;for(let i=0;i<S.length;i++){const wl=wetAt(S[i][0],S[i][1]);if(wl!==null){if(run<0)run=i;lv=Math.max(lv,wl);}
        if((wl===null||i===S.length-1)&&run>=0){const a=S[Math.max(0,run-2)],b=S[Math.min(S.length-1,i+1)],L=Math.hypot(b[0]-a[0],b[1]-a[1]),mid=S[(run+i)>>1];if(L>2&&L<70&&!this.lakeAt(mid[0],mid[1]))add((a[0]+b[0])/2,(a[1]+b[1])/2,(b[0]-a[0])/L,(b[1]-a[1])/L,L+2,r.w+0.35,lv);run=-1;lv=-1e9;}}
      if(!r.h)for(let i=0;i+1<S.length;i+=3){const a=S[i],b=S[Math.min(S.length-1,i+3)],cand=SG.get(key((a[0]+b[0])/2,(a[1]+b[1])/2));if(!cand)continue;
        for(const c of cand){const d1x=b[0]-a[0],d1z=b[1]-a[1],d2x=c[2]-c[0],d2z=c[3]-c[1],den=d1x*d2z-d1z*d2x;if(Math.abs(den)<1e-6)continue;const t=((c[0]-a[0])*d2z-(c[1]-a[1])*d2x)/den,u=((c[0]-a[0])*d1z-(c[1]-a[1])*d1x)/den;
          if(t<0||t>1||u<0||u>1)continue;const L=Math.hypot(d1x,d1z)||1,sw=clamp(P.riverWidth*6.5*Math.sqrt(c[4]),0.7,3.2);add(a[0]+d1x*t,a[1]+d1z*t,d1x/L,d1z/L,clamp(sw*1.8+5,7,12),r.w+0.35,-1e9,sw);}}}
    return B;},
  findCrossings(){const X=[],TS=new Map(),key=(x,z)=>Math.floor(x/16)+','+Math.floor(z/16),T=this.T;
    for(const sg of Track.segs){if(sg.pend)continue;const n=Math.max(2,Math.ceil(sg.L/2));let prev=null;for(let k=0;k<=n;k++){const t=sg.L*k/n,p=segPoint(sg,t),q=[p[0],p[1],segY(sg,t),p[2]];
        if(prev){const kk=key((prev[0]+q[0])/2,(prev[1]+q[1])/2);if(!TS.has(kk))TS.set(kk,[]);TS.get(kk).push([prev,q]);}prev=q;}}
    if(!TS.size)return X;
    for(const r of this.roads){if(r.disc)continue;const p=r.p;for(let i=0;i+3<p.length;i+=2){const a=[p[i],p[i+1]],b=[p[i+2],p[i+3]],L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<0.01)continue;
        const ks=new Set();for(let u=0;u<=1;u+=Math.min(1,8/L))ks.add(key(a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u));ks.add(key(b[0],b[1]));
        for(const kk of ks){const cand=TS.get(kk);if(!cand)continue;for(const [c,d] of cand){const d1x=b[0]-a[0],d1z=b[1]-a[1],d2x=d[0]-c[0],d2z=d[1]-c[1],den=d1x*d2z-d1z*d2x;if(Math.abs(den)<1e-6)continue;
          const t=((c[0]-a[0])*d2z-(c[1]-a[1])*d2x)/den,u=((c[0]-a[0])*d1z-(c[1]-a[1])*d1x)/den;if(t<0||t>1||u<0||u>1)continue;const x=a[0]+d1x*t,z=a[1]+d1z*t,y=c[2]+(d[2]-c[2])*u;
          if(Math.abs(y-R.sampleHr(T,x,z))>2.2||X.some(q=>Math.hypot(q.x-x,q.z-z)<10))continue;X.push({x,z,y,th:Math.atan2(d2z,d2x),rh:Math.atan2(d1z,d1x),w:r.w,ang:1});}}}}
    return X;},
  rebuildCrossings(){this.crossings=this.findCrossings();R.buildCrossings(this.crossings);this.uploaded=false;},
  updateCrossings(dt){const XS=this.crossings;if(!XS||!XS.length)return;for(const q of XS){let near=false;for(const tr of Trains.list){if(!tr.poses)continue;for(const ps of [tr.poses[0],tr.poses[tr.poses.length-1]]){if(ps&&Math.hypot(ps.c[0]-q.x,ps.c[2]-q.z)<110){near=true;break;}}if(near)break;}
      const tg=near?0:1;q.ang+=clamp(tg-q.ang,-dt*0.8,dt*0.8);}},
  deckY(x,z){for(const b of this.bridges||[]){if(Math.hypot(b.cx-x,b.cz-z)>b.len*0.5+b.w+1)continue;const p=b.pts;for(let i=0;i<p.length-1;i++){const ax=p[i][0],az=p[i][2],ex=p[i+1][0]-ax,ez=p[i+1][2]-az,ll=ex*ex+ez*ez||1e-6,t=clamp(((x-ax)*ex+(z-az)*ez)/ll,0,1);
      if(Math.hypot(x-ax-ex*t,z-az-ez*t)<b.w)return p[i][1]+(p[i+1][1]-p[i][1])*t+0.05;}}return -1e9;},
  stampRoad(x0,z0,x1,z1,w){const T=this.T,N=T.N,cs=T.cs,K=this.roadKill;if(!K)return;const L=Math.hypot(x1-x0,z1-z0),n=Math.max(1,Math.ceil(L/2));for(let k=0;k<=n;k++){const x=x0+(x1-x0)*k/n,z=z0+(z1-z0)*k/n,r=w+2;
    for(let j=Math.floor((z-r)/cs);j<=Math.floor((z+r)/cs);j++)for(let i=Math.floor((x-r)/cs);i<=Math.floor((x+r)/cs);i++)if(i>=0&&j>=0&&i<N&&j<N&&Math.hypot((i+0.5)*cs-x,(j+0.5)*cs-z)<r)K[j*N+i]=1;}},
  rebuildRoads(){if(!this.T||!R.world)return;/* a queued rebuild that ran after the world was swapped out */const tR=performance.now();const L=this.vRoads.filter(r=>!(r.ind&&!this.indOn(r.ind.type?'mine':'sawmill',r.ind))&&!(r.farmOf&&!r.farmOf.farmOwned)&&!(r.h&&!this.plotOn(r.h))&&!(r.vil&&(r.lvl|0)>(r.vil.level|0))).slice();this.lamps=this.lamps.filter(l=>!l.road);let side=1;
    for(const k in this.stRoads){const p=this.stRoads[k];if(!p)continue;L.push({p:p.flat(),w:1.6});let acc=0;
      for(let i=1;i<p.length;i++){const dx=p[i][0]-p[i-1][0],dz=p[i][1]-p[i-1][1],d=Math.hypot(dx,dz)||1;acc+=d;if(acc<22)continue;acc=0;const x=p[i][0]-dz/d*3*side,z=p[i][1]+dx/d*3*side;side=-side;
        const w=sampleWater(this.T,x,z);if(!(w[1]>0&&w[0]>R.sampleHr(this.T,x,z)-0.3))this.lamps.push({x,z,y:R.sampleHr(this.T,x,z),hash:Math.random(),road:k});}}
    for(const r of Roads.list){L.push(r);const p=r.p;for(let i=0;i+3<p.length;i+=2)this.stampRoad(p[i],p[i+1],p[i+2],p[i+3],r.w);}
    for(const s of Buses.stops){if(!s.v)s.v=this.nearestVillage(s.x,s.z,500);}Buses.restore();
    this.roads=L;Buses.G=null;Buses.legCache=null;this.uploaded=false;const ta=performance.now();R.buildRoads(this.T);const tb=performance.now();R.buildDocks((this.docks||[]).filter(d=>d.v&&d.v.docksOwned));this.bridges=this.findBridges();const tc=performance.now();R.buildBridges(this.bridges);const td=performance.now();this.rebuildCrossings();
    Log.info(`roads rebuilt in ${(performance.now()-tR).toFixed(0)} ms (gather ${(ta-tR).toFixed(0)}, distance field ${(tb-ta).toFixed(0)}, find bridges ${(tc-tb).toFixed(0)}, bridges ${(td-tc).toFixed(0)}, crossings ${(performance.now()-td).toFixed(0)})`);},
  // ---------------- skating on frozen lakes: groups glide along chained cubic Bézier curves
  iceOK(x,z,m){if(this.T&&this.T.sea!=null&&Math.abs(sampleWater(this.T,x,z)[0]-this.T.sea)<1)return false;/* the ocean does not freeze */return this.isLake(x,z)&&this.isLake(x+m,z)&&this.isLake(x-m,z)&&this.isLake(x,z+m)&&this.isLake(x,z-m);},
  nextSeg(g){const s=g.seg,x=s?s[6]:g.x,z=s?s[7]:g.z;let dx=s?s[6]-s[4]:Math.cos(g.h),dz=s?s[7]-s[5]:Math.sin(g.h);const dl=Math.hypot(dx,dz)||1;dx/=dl;dz/=dl;
    for(let k=0;k<16;k++){const turn=(Math.random()-0.5)*(k<9?g.turn:6.28),len=g.l0+Math.random()*(g.l1-g.l0),h=Math.atan2(dz,dx)+turn,tx=x+Math.cos(h)*len,tz=z+Math.sin(h)*len,a=len*(0.3+Math.random()*0.15),h2=h+(Math.random()-0.5)*1.2;
      const S=[x,z,x+dx*a,z+dz*a,tx-Math.cos(h2)*a,tz-Math.sin(h2)*a,tx,tz];let ok=true;for(let q=1;q<=8&&ok;q++){const p=bzP(S,q/8);ok=this.iceOK(p[0],p[1],g.m);}if(ok){g.seg=S;g.t=0;return true;}}
    const r=3;g.seg=[x,z,x+dx*r,z+dz*r,x-dz*r*2+dx*r,z+dx*r*2+dz*r,x-dz*r*2,z+dx*r*2];g.t=0;return false;},// tight turn when cornered
  spawnGroup(type,x,z){const R1=Math.random,g={type,x,z,h:R1()*6.283,seg:null,t:0,hist:[],m:2.5,turn:2,l0:14,l1:40,sp:3,mem:[]};const add=(o)=>g.mem.push(Object.assign({back:0,lat:0,sc:1,tint:0.3,mv:5,hash:R1(),mesh:'skater',wob:R1()*6},o));
    if(type==='loner'){g.sp=2.6+R1()*2.8;add({mv:4+g.sp*0.4});}
    else if(type==='couple'){g.sp=2.4+R1()*1.4;add({lat:0.42,mv:4.6});add({lat:-0.42,mv:4.6,hash:R1()});}
    else if(type==='family'){g.sp=1.1+R1()*0.7;g.turn=1.4;add({lat:0.5,mv:3.6});const kids=1+(R1()<0.5?1:0);for(let k=0;k<kids;k++)add({back:1.3+k*0.9,lat:k?0.7:-0.6,sc:0.62+R1()*0.1,tint:0.95,mv:5.5,kid:true});if(R1()<0.5)add({lat:-1.0,back:0.4,mv:3.6});}
    else if(type==='train'){g.sp=3+R1()*1.2;g.turn=1.6;g.l0=18;g.l1=45;const n=4+Math.floor(R1()*5);for(let k=0;k<n;k++)add({back:k*1.05,mv:4.8,tint:0.25});}
    else if(type==='speed'){g.sp=7.5+R1()*2.5;g.turn=0.9;g.l0=60;g.l1=150;g.m=4;const n=3+Math.floor(R1()*4);for(let k=0;k<n;k++)add({back:k*1.7,lat:(k%2)*0.25,mv:7.6,tint:0.15,mesh:'speedskater'});}
    this.nextSeg(g);this.sk.groups.push(g);return g;},
  updateSkaters(dt,A){const T=this.T,S=this.sk;if(!(Weather.ice>0.5)||!P.waterOn){if(S.groups.length||S.game){S.groups=[];S.game=null;}return;}
    if(!this.lakeIdx){const L=[];for(let n=0;n<T.N*T.N;n++)if(T.water[n*4+3]>0&&T.shore[n]>=0.99&&T.water[n*4]-T.H[n]>0.5)L.push(n);this.lakeIdx=L;}
    const LI=this.lakeIdx;if(!LI.length)return;const f=R.focus||[T.W/2,0,T.W/2],out=1-smooth(0.35,0.85,A.night)*0.9,want=Math.round(170*P.people*out);
    const pick=(m,rr)=>{for(let k=0;k<30;k++){const n=LI[Math.floor(Math.random()*LI.length)],x=((n%T.N)+0.5)*T.cs,z=(((n/T.N)|0)+0.5)*T.cs;if(Math.hypot(x-f[0],z-f[2])<rr&&this.iceOK(x,z,m))return[x,z];}return null;};
    S.groups=S.groups.filter(g=>Math.hypot(g.x-f[0],g.z-f[2])<1300);if(S.game&&Math.hypot(S.game.x-f[0],S.game.z-f[2])>1300)S.game=null;
    let n=S.groups.reduce((a,g)=>a+g.mem.length,0)+(S.game?10:0);
    if(!S.game&&want>20&&Math.random()<dt*0.5)this.startHockey(f);
    if(n<want&&Math.random()<dt*5){const r=Math.random(),sp=S.groups.filter(g=>g.type==='speed').length;const type=r<0.22?'loner':r<0.44?'couple':r<0.66?'family':r<0.82?'train':(sp<2?'speed':'loner');const p=pick(type==='speed'?8:4,700);if(p)this.spawnGroup(type,p[0],p[1]);}
    else if(n>want+6&&S.groups.length)S.groups.shift();
    for(const g of S.groups){const d=bzD(g.seg,g.t),dl=Math.hypot(d[0],d[1])||1;g.t+=g.sp*dt/dl;if(g.t>=1)this.nextSeg(g);const p=bzP(g.seg,Math.min(g.t,1)),d2=bzD(g.seg,Math.min(g.t,1));
      g.x=p[0];g.z=p[1];g.h=Math.atan2(d2[1],d2[0]);const H=g.hist,last=H[H.length-1];if(!last||Math.hypot(last[0]-g.x,last[1]-g.z)>0.25){H.push([g.x,g.z,g.h]);if(H.length>240)H.shift();}
      const y=sampleWater(T,g.x,g.z)[0]-0.02;
      for(const m of g.mem){let q=H[Math.max(0,H.length-1-Math.round(m.back/0.25))]||[g.x,g.z,g.h];m.wob+=dt*(m.kid?2.3:1);const lat=m.lat+(m.kid?Math.sin(m.wob)*0.35:0);
        m.x=q[0]-Math.sin(q[2])*lat;m.z=q[1]+Math.cos(q[2])*lat;m.y=y;m.rot=q[2]+(m.kid?Math.sin(m.wob*1.7)*0.25:0);}}
    if(S.game)this.updateHockey(dt);},
  startHockey(f){const T=this.T;for(let k=0;k<30;k++){const n=this.lakeIdx[Math.floor(Math.random()*this.lakeIdx.length)],x=((n%T.N)+0.5)*T.cs,z=(((n/T.N)|0)+0.5)*T.cs;if(Math.hypot(x-f[0],z-f[2])>600)continue;
      const a=Math.random()*3.1416,c=Math.cos(a),s=Math.sin(a),hl=17,hw=8.5;let ok=true;for(let u=-1;u<=1&&ok;u+=0.5)for(let w=-1;w<=1&&ok;w+=0.5){const lu=u*(hl+3),lw=w*(hw+3);ok=this.isLake(x+c*lu-s*lw,z+s*lu+c*lw);}
      if(!ok)continue;const pl=[];for(const tm of [0,1])for(let i=0;i<5;i++){const dir=tm?-1:1;pl.push({tm,gk:i===0,u:i===0?-dir*(hl-1.5):-dir*(3+i*2.5),w:(i%2?-1:1)*(i>2?4:2),vu:0,vw:0,h:tm?Math.PI:0,cd:0,hash:tm?0.052+i*0.008:0.003+i*0.009,mv:0});}
      this.sk.game={x,z,a,c,s,hl,hw,pl,pk:{u:0,w:0,vu:0,vw:0}};return;}},
  updateHockey(dt){const G=this.sk.game,pk=G.pk;pk.u+=pk.vu*dt;pk.w+=pk.vw*dt;const fr=Math.exp(-0.45*dt);pk.vu*=fr;pk.vw*=fr;
    if(Math.abs(pk.u)>G.hl){if(Math.abs(pk.w)<1){pk.u=0;pk.w=0;pk.vu=0;pk.vw=0;}else{pk.u=Math.sign(pk.u)*G.hl;pk.vu*=-0.7;}}if(Math.abs(pk.w)>G.hw){pk.w=Math.sign(pk.w)*G.hw;pk.vw*=-0.7;}
    for(const tm of [0,1]){const dir=tm?-1:1,mine=G.pl.filter(p=>p.tm===tm&&!p.gk);let ch=mine[0],cd=1e9;for(const p of mine){const d=Math.hypot(p.u-pk.u,p.w-pk.w);if(d<cd){cd=d;ch=p;}}
      const supp=[[-5,-4],[-5,4],[-11,0]];let si=0;
      for(const p of G.pl.filter(q=>q.tm===tm)){let tu,tw;if(p.gk){tu=-dir*(G.hl-1.2);tw=clamp(pk.w,-1.1,1.1);}else if(p===ch){tu=pk.u;tw=pk.w;}else{const o=supp[si++%3];tu=clamp(pk.u+dir*o[0],-G.hl+2,G.hl-2);tw=clamp(o[1]+pk.w*0.4,-G.hw+1,G.hw-1);}
        const du=tu-p.u,dw=tw-p.w,d=Math.hypot(du,dw),vmax=p.gk?2:6,ds=Math.min(vmax,d*1.6),k=Math.min(1,dt*2.6);p.vu+=((d>0.01?du/d*ds:0)-p.vu)*k;p.vw+=((d>0.01?dw/d*ds:0)-p.vw)*k;
        p.u=clamp(p.u+p.vu*dt,-G.hl,G.hl);p.w=clamp(p.w+p.vw*dt,-G.hw,G.hw);const spd=Math.hypot(p.vu,p.vw);if(spd>0.3)p.h=lerpAng(p.h,Math.atan2(p.vw,p.vu),dt*6);else if(p.gk)p.h=tm?Math.PI:0;
        p.mv=spd>0.6?4+spd*0.5:0;p.cd-=dt;
        if(p===ch&&d<0.9&&p.cd<=0){p.cd=0.8;const gu=dir*G.hl,gw=(Math.random()-0.5)*1.6,pass=Math.random()<0.4&&mine.length>1;let au=gu-pk.u,aw=gw-pk.w;
          if(pass){const mate=mine.filter(q=>q!==p)[Math.floor(Math.random()*(mine.length-1))];au=mate.u-pk.u;aw=mate.w-pk.w;}const al=Math.hypot(au,aw)||1,sp=pass?7+Math.random()*3:10+Math.random()*5,er=(Math.random()-0.5)*0.25;
          pk.vu=(au/al*Math.cos(er)-aw/al*Math.sin(er))*sp;pk.vw=(au/al*Math.sin(er)+aw/al*Math.cos(er))*sp;}}}},
  // ---------------- sledding on snowy hills near the villages (winter with snow only)
  findHills(gen,fieldId){const T=this.T,H=(x,z)=>R.sampleHr(T,x,z),hills=[],tg=new Map();for(const arr of (T.veg&&T.veg.trees)||[])for(let i=0;i+2<arr.length;i+=8){const k=Math.floor(arr[i]/8)+','+Math.floor(arr[i+2]/8);tg.set(k,(tg.get(k)||0)+1);}
    const treey=(x,z)=>{let n=0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)n+=tg.get((Math.floor(x/8)+a)+','+(Math.floor(z/8)+b))||0;return n;};// open slopes only, no forest runs
    for(const v of this.villages){let got=0;for(let k=0;k<120&&got<2;k++){const a=Math.random()*6.283,r=v.R*0.7+40+Math.random()*200;let x=v.x+Math.cos(a)*r,z=v.z+Math.sin(a)*r;if(x<30||z<30||x>T.W-30||z>T.W-30)continue;
      const pts=[[x,z]];let len=0,drop=0;for(let st=0;st<30;st++){const gx=(H(x+1.5,z)-H(x-1.5,z))/3,gz=(H(x,z+1.5)-H(x,z-1.5))/3,gl=Math.hypot(gx,gz);if(gl<0.08)break;
        const nx=x-gx/gl*3,nz=z-gz/gl*3;const w=sampleWater(T,nx,nz);if(w[1]>0&&w[0]>H(nx,nz)-0.3)break;drop+=H(x,z)-H(nx,nz);x=nx;z=nz;len+=3;pts.push([x,z]);}
      if(len<30||drop/len<0.12||drop/len>0.75)continue;if(pts.some(p=>this.houses.some(h=>!h.gone&&Math.hypot(h.x-p[0],h.z-p[1])<h.r+6)))continue;if(!gen&&pts.reduce((n,p)=>n+treey(p[0],p[1]),0)>pts.length*1.0)continue;if(fieldId&&pts.some(p=>fieldId[clamp((p[1]/T.cs)|0,0,T.N-1)*T.N+clamp((p[0]/T.cs)|0,0,T.N-1)]>0))continue;
      if(hills.some(o=>Math.hypot(o.pts[0][0]-pts[0][0],o.pts[0][1]-pts[0][1])<30))continue;const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
      hills.push({pts,cum,L:cum[cum.length-1],v});got++;}}return hills;},
  hillAt(hl,s){const c=hl.cum,P2=hl.pts;s=clamp(s,0,hl.L);let i=1;while(i<c.length-1&&c[i]<s)i++;const t=(s-c[i-1])/Math.max(c[i]-c[i-1],1e-6),a=P2[i-1],b=P2[i];return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,Math.atan2(b[1]-a[1],b[0]-a[0])];},
  updateSledding(dt,A){const T=this.T;if(!(P.season==='winter'&&Weather.snowCover>0.25)){if(this.sledP.length)this.sledP=[];return;}
    if(!this.sledH)this.sledH=this.findHills();const f=R.focus||[0,0,0],out=1-smooth(0.35,0.8,A.night)*0.95,H=(x,z)=>R.sampleHr(T,x,z);
    for(const hl of this.sledH){const near=Math.hypot(hl.pts[0][0]-f[0],hl.pts[0][1]-f[2])<1100,cnt=this.sledP.filter(p=>p.hl===hl).length,want=near?Math.round((3+hl.L/15)*P.people*out):0;
      if(cnt<want&&Math.random()<dt*1.5)this.sledP.push({hl,s:Math.random()*hl.L*0.3,v:0,st:'top',wait:Math.random()*3,lat:(Math.random()-0.5)*4,hash:Math.random()});
      else if(cnt>want){const i=this.sledP.findIndex(p=>p.hl===hl&&p.st!=='down');if(i>=0)this.sledP.splice(i,1);}}
    for(const p of this.sledP){const hl=p.hl;if(p.st==='top'||p.st==='bottom'){p.wait-=dt;if(p.wait<=0){if(p.st==='top'){p.st='down';p.v=0.5;p.lat=(Math.random()-0.5)*4;}else p.st='up';}}
      else if(p.st==='down'){const a=this.hillAt(hl,p.s),b=this.hillAt(hl,p.s+1.5),gr=(H(a[0],a[1])-H(b[0],b[1]))/1.5;p.v+=(9.81*gr/Math.sqrt(1+gr*gr)-0.06*9.81-0.012*p.v*p.v)*dt;p.v=Math.max(p.v,0.3);p.s+=p.v*dt;
        if(p.s>=hl.L||(gr<0.03&&p.v<0.5)){p.st='bottom';p.wait=1+Math.random()*2.5;}}
      else{p.s-=1.1*dt;if(p.s<=0){p.s=0;p.st='top';p.wait=1+Math.random()*3;}}
      const q=this.hillAt(hl,p.s),lat=p.lat+(p.st==='up'?2.6:0),x=q[0]-Math.sin(q[2])*lat,z=q[1]+Math.cos(q[2])*lat,q2=this.hillAt(hl,p.s+1),gr=(H(q[0],q[1])-H(q2[0],q2[1]))/1;
      p.x=x;p.z=z;p.y=H(x,z);p.rot=p.st==='up'?q[2]+Math.PI:q[2];p.pitch=p.st==='up'?Math.atan(gr):-Math.atan(gr);
      if(p.st==='up'){const bx=x+Math.cos(q[2])*1.5,bz=z+Math.sin(q[2])*1.5;p.sx=bx;p.sz=bz;p.sy=H(bx,bz);}}},
  // water routing on the lake grid: 8-neighbour A*, costlier near the shore so routes keep to open water
  waterPath(a,b,lakeId){const T=this.T,N=T.N,cs=T.cs,C=this.lakeComp,id=(x,z)=>clamp((z/cs)|0,0,N-1)*N+clamp((x/cs)|0,0,N-1),s0=id(a[0],a[1]),s1=id(b[0],b[1]);
    const inL=n=>C[n]===lakeId,shore=n=>{let k=0;const i=n%N,j=(n/N)|0;for(let dj=-3;dj<=3;dj+=3)for(let di=-3;di<=3;di+=3){const ii=i+di,jj=j+dj;if(ii<0||jj<0||ii>=N||jj>=N||!inL(jj*N+ii))k++;}return k;};
    const g=new Map(),from=new Map(),hk=[],hv=[],push=(v,k)=>{hk.push(k);hv.push(v);let q=hv.length-1;while(q>0){const p=(q-1)>>1;if(hv[p]<=hv[q])break;[hv[p],hv[q]]=[hv[q],hv[p]];[hk[p],hk[q]]=[hk[q],hk[p]];q=p;}};
    const pop=()=>{const k=hk[0],lv=hv.pop(),lk2=hk.pop();if(hv.length){hv[0]=lv;hk[0]=lk2;let q=0;for(;;){const l=2*q+1,r=l+1;let m=q;if(l<hv.length&&hv[l]<hv[m])m=l;if(r<hv.length&&hv[r]<hv[m])m=r;if(m===q)break;[hv[m],hv[q]]=[hv[q],hv[m]];[hk[m],hk[q]]=[hk[q],hk[m]];q=m;}}return k;};
    const ex=s1%N,ez=(s1/N)|0,hx=k=>Math.hypot((k%N)-ex,((k/N)|0)-ez);g.set(s0,0);push(hx(s0),s0);let it=0;
    while(hv.length&&it++<120000){const k=pop();if(k===s1)break;const ki=k%N,kj=(k/N)|0;for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const ii=ki+di,jj=kj+dj;if(ii<0||jj<0||ii>=N||jj>=N)continue;const m=jj*N+ii;
        if(!inL(m)&&m!==s1)continue;const ng=g.get(k)+Math.hypot(di,dj)*(1+shore(m)*0.8);if(ng<(g.has(m)?g.get(m):1e18)){g.set(m,ng);from.set(m,k);push(ng+hx(m),m);}}}
    if(!from.has(s1)&&s0!==s1)return[[a[0],a[1]],[b[0],b[1]]];let pts=[],k=s1;while(k!==undefined&&pts.length<5000){pts.push([((k%N)+0.5)*cs,(((k/N)|0)+0.5)*cs]);if(k===s0)break;k=from.get(k);}pts.reverse();pts[0]=[a[0],a[1]];pts[pts.length-1]=[b[0],b[1]];
    pts=pts.filter((p,q)=>q===0||q===pts.length-1||q%3===0);for(let r=0;r<3;r++){const q2=[pts[0]];for(let q=0;q<pts.length-1;q++){const p0=pts[q],p1=pts[q+1];q2.push([p0[0]*.75+p1[0]*.25,p0[1]*.75+p1[1]*.25],[p0[0]*.25+p1[0]*.75,p0[1]*.25+p1[1]*.75]);}q2.push(pts[pts.length-1]);pts=q2;}return pts;},
  setCourse(st,d){const ap=[d.bx+d.nx*32,d.bz+d.nz*32],pts=this.waterPath([st.x,st.z],ap,st.lake);pts.push([d.bx+d.nx*12,d.bz+d.nz*12],[d.bx,d.bz]);const cum=[0];for(let q=1;q<pts.length;q++)cum.push(cum[q-1]+Math.hypot(pts[q][0]-pts[q-1][0],pts[q][1]-pts[q-1][1]));
    st.path=pts;st.pcum=cum;st.ps=0;st.target=d;st.mode='sail';},
  updateSteamers(dt){const winter=P.season==='winter'||Weather.ice>0.3;
    for(const st of this.steamers||[]){const D=st.docks.filter(d=>d.v&&d.v.docksOwned);st.off=D.length<2;if(st.off){st.was=false;st.v=0;continue;}
      if(!st.was){st.was=true;const d=D[0];st.x=d.bx;st.z=d.bz;st.rot=Math.atan2(-d.nz,-d.nx);st.mode='moor';st.wait=6;st.leg=0;st.target=d;}st.wa=(st.wa||0)+(st.v||0)*dt/2.8;
      if(!D.length||(st.mode==='loop'&&!winter)){// cruise the loop (no docks, or one dock in summer)
        const v=Weather.ice>0.5?0:4.2;if(st.mode==='moor')st.mode='loop';st.s=(st.s+v*dt)%st.L;const c=st.cum;let i=1;while(i<32&&c[i]<st.s)i++;const a=st.loop[i-1],b=st.loop[i%32],t=(st.s-c[i-1])/Math.max(1e-6,c[i]-c[i-1]);
        const nx=a[0]+(b[0]-a[0])*t,nz=a[1]+(b[1]-a[1])*t;st.x+=(nx-st.x)*Math.min(1,dt*0.5);st.z+=(nz-st.z)*Math.min(1,dt*0.5);st.rot=lerpAng(st.rot,Math.atan2(b[1]-a[1],b[0]-a[0]),dt*0.6);st.v=v;}
      else if(st.mode==='moor'){st.v=0;const d=st.target||D[st.leg%D.length];st.x+=(d.bx-st.x)*Math.min(1,dt);st.z+=(d.bz-st.z)*Math.min(1,dt);st.rot=lerpAng(st.rot,Math.atan2(-d.nz,-d.nx),dt*0.8);
        if(winter){st.laid=true;continue;}st.laid=false;st.wait-=dt;if(st.wait<=0){if(D.length>=2){st.leg=(st.leg+1)%D.length;this.setCourse(st,D[st.leg]);}else{st.mode='loop';}}}
      else{// sailing a course to a dock
        if(winter&&Weather.ice>0.5){const d=st.target;st.x=d.bx;st.z=d.bz;st.mode='moor';continue;}// caught by the ice: frozen in at the dock
        if(winter&&!st.homeward){let best=D[0],bd=1e9;for(const d of D){const q=Math.hypot(d.bx-st.x,d.bz-st.z);if(q<bd){bd=q;best=d;}}st.homeward=true;st.leg=D.indexOf(best);this.setCourse(st,best);}
        const rem=st.pcum[st.pcum.length-1]-st.ps,v=Math.min(4.6,Math.sqrt(2*0.12*rem)+0.25);st.v=v;st.ps+=v*dt;
        if(rem<0.6){st.mode='moor';st.wait=25+Math.random()*20;st.homeward=false;continue;}
        const c=st.pcum;let i=1;while(i<c.length-1&&c[i]<st.ps)i++;const a=st.path[i-1],b=st.path[i],t=clamp((st.ps-c[i-1])/Math.max(1e-6,c[i]-c[i-1]),0,1);st.x=a[0]+(b[0]-a[0])*t;st.z=a[1]+(b[1]-a[1])*t;st.rot=lerpAng(st.rot,Math.atan2(b[1]-a[1],b[0]-a[0]),dt*0.7);}
      if(winter&&st.mode==='loop'&&D.length){this.setCourse(st,D[0]);st.homeward=true;}
      if((st.v||0)>0.3&&P.smoke&&(st.smoke+=dt)>0.35){st.smoke=0;for(const lz of [-1.4,1.4]){const x=st.x+Math.cos(st.rot)*7.5-Math.sin(st.rot)*lz,z=st.z+Math.sin(st.rot)*7.5+Math.cos(st.rot)*lz;Particles.spawn(x,st.lvl+13.4,z,-Math.cos(st.rot)*1.5,1.2,-Math.sin(st.rot)*1.5,5,0.8,4,0);}}
      else if(st.mode==='moor'&&!st.laid&&P.smoke&&(st.smoke+=dt)>1.4){st.smoke=0;const x=st.x+Math.cos(st.rot)*7.5,z=st.z+Math.sin(st.rot)*7.5;Particles.spawn(x,st.lvl+13.4,z,0,0.8,0,4,0.6,2.5,0);}}},
  // beaches: on fine summer days between 9 and 19 h, parasols, towels, sunbathers and swimmers appear at the beach sites near the camera
  updateBeaches(dt,A){const E=Weather.eff(),h=P.timeOfDay,ok=P.season==='summer'&&h>9&&h<19&&E.rain<0.1&&(Weather.cur.cover||0)<0.75,f=R.focus||[0,0,0];
    if(!ok){if(this.beachP.length){this.beachP=[];for(const v of this.villages)if(v.beach)v.beach.on=false;}return;}
    for(const v of this.villages){const b=v.beach;if(!b||b.on===true&&Math.hypot(b.x-f[0],b.z-f[2])<1300)continue;if(Math.hypot(b.x-f[0],b.z-f[2])>1100){if(b.on){b.on=false;this.beachP=this.beachP.filter(q=>q.b!==b);}continue;}
      b.on=true;const R1=Math.random,tx=-b.nz,tz=b.nx,n=Math.round((16+R1()*12)*P.people),T=this.T;
      const dry=(x,z)=>!this.nearLake(x,z,1.0);
      for(let k=0;k<n;k++){const u=(R1()-0.5)*34,kind=R1();if(kind<0.4){let d=3+R1()*9,x=b.x+tx*u-b.nx*d,z=b.z+tz*u-b.nz*d;for(let q=0;q<12&&!dry(x,z);q++){d+=2.5;x=b.x+tx*u-b.nx*d;z=b.z+tz*u-b.nz*d;}if(!dry(x,z))continue;const y=R.sampleHr(T,x,z),rot=Math.atan2(b.nz,b.nx)+(R1()-0.5)*0.6;
          this.beachP.push({b,k:'towel',x,y,z,rot,hash:R1()});this.beachP.push({b,k:'lier',x:x,y:y+0.03,z,rot,hash:R1()});if(R1()<0.6)this.beachP.push({b,k:'parasol',x:x+Math.cos(rot)*0.9,y,z:z+Math.sin(rot)*0.9,rot:0,hash:R1()});}
        else if(kind<0.75){const d=5+R1()*20,x=b.x+tx*u+b.nx*d,z=b.z+tz*u+b.nz*d;if(this.isLake(x,z))this.beachP.push({b,k:'swim',x,z,y:b.lvl-0.05,rot:R1()*6.28,hash:R1(),vx:0,vz:0,t:R1()*10});}
        else{let d=R1()*3,x=b.x+tx*u-b.nx*d,z=b.z+tz*u-b.nz*d;for(let q=0;q<12&&!dry(x,z);q++){d+=2.5;x=b.x+tx*u-b.nx*d;z=b.z+tz*u-b.nz*d;}if(!dry(x,z))continue;this.beachP.push({b,k:'stand',x,z,y:R.sampleHr(T,x,z)-0.05,rot:Math.atan2(b.nz,b.nx),hash:R1()});}}}
    for(const q of this.beachP)if(q.k==='swim'){q.t+=dt;if(q.t>4){q.t=0;const a=Math.random()*6.28;q.vx=Math.cos(a)*0.5;q.vz=Math.sin(a)*0.5;}const nx=q.x+q.vx*dt,nz=q.z+q.vz*dt;if(this.isLake(nx,nz)){q.x=nx;q.z=nz;if(Math.abs(q.vx)+Math.abs(q.vz)>0.05)q.rot=Math.atan2(q.vz,q.vx);}else{q.vx=-q.vx;q.vz=-q.vz;}}},
  // ---------------- falling leaves: autumn trees around the camera shed tumbling leaves (more when windy)
  updateLeaves(dt){const T=this.T,au=Weather.seasonW[2],E=Weather.eff();if(au<0.3||!(P.leaves>0)||!T.veg)return;
    if(!this.treeGrid){const G=new Map();(T.veg.trees||[]).forEach((arr,ty)=>{for(let i=0;i+7<arr.length;i+=8){if(arr[i+3]<=0)continue;const k=Math.floor(arr[i]/40)+','+Math.floor(arr[i+2]/40);if(!G.has(k))G.set(k,[]);G.get(k).push([arr,i]);}});this.treeGrid=G;}/* references, so trees cleared later simply drop out (no rebuild) */
    const f=R.focus||[0,0,0],cp=Cam.pos||f,cx=(f[0]+cp[0])/2,cz=(f[2]+cp[2])/2,rate=dt*60*P.leaves*au*(0.5+E.wind*1.2);let n=Math.floor(rate)+(Math.random()<rate%1?1:0);
    while(n-->0){const x=cx+(Math.random()-0.5)*160,z=cz+(Math.random()-0.5)*160,L=this.treeGrid.get(Math.floor(x/40)+','+Math.floor(z/40));if(!L||!L.length)continue;const ref=L[Math.floor(Math.random()*L.length)],A2=ref[0],i2=ref[1];if(!(A2[i2+3]>0))continue;const t=[A2[i2],A2[i2+1],A2[i2+2],A2[i2+3]];
      const r=t[3]*0.25,hh=t[3]*(0.45+Math.random()*0.4);Particles.spawn(t[0]+(Math.random()-0.5)*r,t[1]+hh,t[2]+(Math.random()-0.5)*r,0,-0.3,0,hh/0.8+0.4,0.2+Math.random()*0.1,0.24,4);}},
  // ---------------- winter work: trains plough the track (spray + a cleared strip that snows over again),
  // villagers shovel the streets (global road-clear amount; shovellers walk the streets throwing snow aside)
  updateSnowWork(dt,A){const T=this.T,sn=Weather.snowCover,E=Weather.eff(),G=256,cs=T.W/G,TC=this.tclear;
    const fall=E.snow>0.1?dt/240*E.snow*P.snowRate:0;for(let k=0;k<TC.length;k++)if(TC[k]>0)TC[k]=Math.max(0,TC[k]-fall);
    for(const tr of Trains.list){if(!tr.poses)continue;const sp=Math.abs(tr.v||0);for(const ps of tr.poses){if(!ps)continue;const i=clamp((ps.c[0]/cs)|0,0,G-1),j=clamp((ps.c[2]/cs)|0,0,G-1);for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const ii=i+di,jj=j+dj;if(ii>=0&&jj>=0&&ii<G&&jj<G)TC[jj*G+ii]=1;}}
      const p0=tr.poses[0];if(p0&&sn>0.2&&sp>3&&P.smoke){const i=clamp((p0.c[0]/cs)|0,0,G-1),j=clamp((p0.c[2]/cs)|0,0,G-1);if(Math.random()<dt*Math.min(30,sp*2)*sn){const X=p0.X,dir=Math.sign(tr.v||1),fx=p0.c[0]+X[0]*6*dir,fz=p0.c[2]+X[2]*6*dir,side=Math.random()<0.5?-1:1;
        Particles.spawn(fx,p0.c[1]+0.4,fz,X[0]*sp*0.35*dir-X[2]*side*(2+sp*0.25),1.5+Math.random()*1.5,X[2]*sp*0.35*dir+X[0]*side*(2+sp*0.25),1.6,0.6,2.4,3);}}}
    this.tcAcc+=dt;if(this.tcAcc>0.5){this.tcAcc=0;const b=this.tcBuf||(this.tcBuf=new Uint8Array(G*G));for(let k=0;k<b.length;k++)b[k]=TC[k]*255;scratch();gl.bindTexture(gl.TEXTURE_2D,R.tcTex);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,G,G,gl.RED,gl.UNSIGNED_BYTE,b);}
    if(sn<0.05){this.roadClear=1;this.shovel=[];return;}const out=1-smooth(0.35,0.85,A.night)*0.95;
    this.roadClear=clamp(this.roadClear-(E.snow>0.1?dt/150*E.snow*P.snowRate:0)+dt/180*P.people*out*(this.shovel.length?1:0.3),0,1);
    const f=R.focus||[0,0,0],want=this.roadClear<0.97?Math.round(3*P.people*out):0;
    for(const v of this.villages){const nearV=Math.hypot(v.x-f[0],v.z-f[2])<1000,mine=this.shovel.filter(q=>q.v===v);if(nearV&&mine.length<want&&Math.random()<dt){const st=v.streets[Math.floor(Math.random()*v.streets.length)];this.shovel.push({v,st,u:0,lat:(Math.random()-0.5)*2,dir:Math.random()<0.5?1:-1,hash:Math.random(),t:0});}
      else if((!nearV||mine.length>want)&&mine.length)this.shovel.splice(this.shovel.indexOf(mine[0]),1);}
    for(const q of this.shovel){const s=q.st,L=Math.hypot(s[2]-s[0],s[3]-s[1])||1;q.u+=0.45*dt/L;if(q.u>=1){q.u=0;q.st=q.v.streets[Math.floor(Math.random()*q.v.streets.length)];}
      const u=q.dir>0?q.u:1-q.u,dx=(s[2]-s[0])/L*q.dir,dz=(s[3]-s[1])/L*q.dir;q.x=s[0]+(s[2]-s[0])*u-dz*q.lat;q.z=s[1]+(s[3]-s[1])*u+dx*q.lat;q.rot=Math.atan2(dz,dx);q.t+=dt;
      if(q.t>1.3&&P.smoke){q.t=0;const sd=q.lat>0?1:-1,px=q.x+Math.cos(q.rot)*0.9,pz=q.z+Math.sin(q.rot)*0.9;Particles.spawn(px,R.sampleHr(T,px,pz)+0.6,pz,-dz*sd*1.6,1.6,dx*sd*1.6,1.1,0.35,1.2,3);}}},
  // ---------------- farming: each season gives the arable fields jobs (sow / harvest → plough / plough); village tractors
  // work them lane by lane and the terrain shows the worked part (field texel .w = base*1000 + result*100 + progress*99)
  farmSchedule(S,init){const F=this.farm,T=this.T,R1=Math.random;F.jobs=[];for(const t of F.tr)t.job=null;
    this.bales=[];(T.fields||[]).forEach((f,k)=>{f.k=k;if(f.crop===2){f.base=0;f.tgt=0;f.p=0;R.setFieldWork(k,f);return;}const pr=init?(R1()<0.5?1:R1()):0;
      if(S==='spring'){if(pr<1){f.base=1;f.tgt=3;f.p=init?pr*0.5:0;F.jobs.push({f,kind:'harrow'});}else{f.base=1;f.tgt=0;f.p=1;}}
      else if(S==='summer'){f.base=0;f.tgt=0;f.p=0;}
      else if(S==='autumn'){if(f.crop===3||f.crop===1){f.base=0;f.tgt=1;f.p=pr;if(f.p<1)F.jobs.push({f,kind:'plough'});}else{f.base=0;f.tgt=2;f.p=pr;F.jobs.push({f,kind:f.p<1?'harvest':'plough'});if(f.p>=1){f.base=2;f.tgt=1;f.p=0;}}}
      else{f.base=1;f.tgt=1;f.p=1;}
      R.setFieldWork(k,f);});},
  fieldPose(f,p){const lanes=Math.max(1,Math.ceil(2*f.hx/4)),fl=clamp(p,0,0.9999)*lanes,cur=Math.floor(fl),al=fl-cur,odd=cur%2===1,u=Math.min(-f.hx+(cur+0.5)*4,f.hx-1),w=odd?f.hz-al*2*f.hz:-f.hz+al*2*f.hz,c=Math.cos(f.a),s=Math.sin(f.a);
    return[f.x+c*u-s*w,f.z+s*u+c*w,f.a+(odd?-Math.PI/2:Math.PI/2),lanes];},
  updateFarm(dt){const F=this.farm,T=this.T;if(!T||!T.fields)return;if(F.season!==P.season){const init=F.season===null;F.season=P.season;this.farmSchedule(P.season,init);}
    const home=(v,k)=>v.farm?(v.farm.park?v.farm.park[Math.max(0,k|0)%v.farm.park.length]:v.farm.yard):[v.x,v.z];F.carts=F.carts||[];
    for(const v of this.villages){const want=v.farmOwned?Math.round(P.tractors):0,mine=F.tr.filter(t=>t.v===v);if(mine.length<want&&(T.fields||[]).length){const k=mine.length,h=home(v,k);F.tr.push({v,x:h[0],z:h[1],rot:v.farm?v.farm.rot:0,job:null,st:'idle',hash:Math.random(),tool:null});}
      else if(mine.length>want){const t=mine[mine.length-1];if(t.job)t.job.taken=false;F.tr.splice(F.tr.indexOf(t),1);}}
    const H=(x,z)=>R.sampleHr(T,x,z),route=(a,b)=>this.routePath(a,b,{cs:6,margin:90,bridge:true,wind:0,road:0.3,maxG:0.45})||[b],
      follow=(o,spd)=>{const wp=o.path[Math.min(o.pi,o.path.length-1)],dx=wp[0]-o.x,dz=wp[1]-o.z,d=Math.hypot(dx,dz);if(d<1.5){if(o.pi<o.path.length-1){o.pi++;return false;}return true;}const v=Math.min(spd*dt,d);o.x+=dx/d*v;o.z+=dz/d*v;o.rot=lerpAng(o.rot,Math.atan2(dz,dx),dt*4);return false;},
      TOOL={harvest:'combine',plough:'plough',sow:'drill',harrow:'harrow'};
    /* in and out of the farmstead by its gate at the front, so nothing drives through the house or the shed */
    const farmRoute=(v,a,b)=>{const fm=v&&v.farm;if(!fm||!fm.gate)return route(a,b);const inF=p=>this.farmAt(p[0],p[1])===fm,ia=inF(a),ib=inF(b);if(ia&&ib)return[b];const r=route(ia?fm.gate:a,ib?fm.gate:b);return[...(ia?[fm.gate]:[]),...r,...(ib?[b]:[])];};
    for(const t of F.tr){const hm=home(t.v,F.tr.filter(o=>o.v===t.v).indexOf(t));
      if(!t.job){if(t.st==='home'){if(!t.path){t.path=farmRoute(t.v,[t.x,t.z],hm);t.pi=0;}if(follow(t,7*P.farmSpeed)){t.st='idle';t.path=null;t.tool=null;}continue;}
        if(Math.hypot(t.x-hm[0],t.z-hm[1])>8){t.st='home';t.path=null;continue;}
        let best=null,bd=1e9;for(const j of F.jobs){if(j.taken||!this.farmOn(j.f)||(j.f.v&&j.f.v!==t.v&&F.tr.some(o=>o.v===j.f.v)))continue;const d=Math.hypot(j.f.x-hm[0],j.f.z-hm[1]);if(d<bd){bd=d;best=j;}}
        if(best){best.taken=true;t.job=best;t.st='drive';t.tool=TOOL[best.kind];t.path=null;}else{t.st='idle';continue;}}
      const j=t.job,f=j.f,sp=(j.kind==='harvest'?2.2:2.8)*P.farmSpeed;
      if(t.st==='drive'){const q=this.fieldPose(f,f.p);if(!t.path){t.path=farmRoute(t.v,[t.x,t.z],[q[0],q[1]]);t.pi=0;}if(follow(t,7*P.farmSpeed)){t.st='work';t.path=null;if(j.kind==='harvest')F.carts.push({t,x:t.x,z:t.z,rot:t.rot,st:'escort',hash:Math.random(),v:t.v});}continue;}
      const lanes=Math.max(1,Math.ceil(2*f.hx/4));f.p+=sp*dt/(lanes*2*f.hz+lanes*6);
      if(f.p>=1){f.p=1;F.jobs.splice(F.jobs.indexOf(j),1);t.job=null;t.st='home';t.path=null;
        if(j.kind==='harvest'){f.base=2;f.tgt=1;f.p=0;F.jobs.push({f,kind:'plough'});const c=Math.cos(f.a),s2=Math.sin(f.a),n=Math.round(f.hx*f.hz/90);for(let q=0;q<n;q++){const u=(Math.random()-0.5)*1.8*f.hx,w=(Math.random()-0.5)*1.8*f.hz;this.bales.push({f,x:f.x+c*u-s2*w,z:f.z+s2*u+c*w,rot:Math.random()*6.28});}
          for(const cr of F.carts)if(cr.t===t){cr.st='toSilo';cr.path=null;}}
        else if(j.kind==='harrow'){f.base=3;f.tgt=0;f.p=0;F.jobs.push({f,kind:'sow'});}
        R.setFieldWork(f.k,f);continue;}
      const q=this.fieldPose(f,f.p);t.x=q[0];t.z=q[1];t.rot=lerpAng(t.rot,q[2],dt*2.5);if((t.dirty=(t.dirty||0)+dt)>0.25){t.dirty=0;R.setFieldWork(f.k,f);}
      if(j.kind==='plough'&&this.bales.length)this.bales=this.bales.filter(b=>b.f!==f||Math.hypot(b.x-t.x,b.z-t.z)>7);
      if(P.smoke&&Math.random()<dt*2.5){const ex=t.x+Math.cos(t.rot)*(j.kind==='harvest'?1:0.95),ez=t.z+Math.sin(t.rot)*(j.kind==='harvest'?1:0.95);Particles.spawn(ex,H(ex,ez)+(j.kind==='harvest'?4.3:2.3),ez,0,0.8,0,2.5,0.4,1.8,0);}
      if(j.kind!=='sow'&&Weather.eff().rain<0.2&&P.season!=='winter'&&Math.random()<dt*1.2){const bx=t.x-Math.cos(t.rot)*3,bz=t.z-Math.sin(t.rot)*3;Particles.spawn(bx,H(bx,bz)+0.4,bz,(Math.random()-0.5)*0.6,0.25,(Math.random()-0.5)*0.6,2,0.8,2.4,2);}}
    // grain carts: ride alongside the combine, then haul to the silos, tip (dust), and go home
    for(const cr of F.carts){if(cr.st==='escort'){const t=cr.t,sx=-Math.sin(t.rot),sz=Math.cos(t.rot),tx=t.x+sx*5.5-Math.cos(t.rot)*2,tz=t.z+sz*5.5-Math.sin(t.rot)*2;cr.x+=(tx-cr.x)*Math.min(1,dt*2);cr.z+=(tz-cr.z)*Math.min(1,dt*2);cr.rot=lerpAng(cr.rot,t.rot,dt*3);if(!t.job)cr.st='toSilo';continue;}
      const fm=cr.v.farm,tgt=cr.st==='toSilo'?(fm?fm.unload:[cr.v.x,cr.v.z]):cr.st==='tip'?null:(fm?fm.yard:[cr.v.x,cr.v.z]);
      if(cr.st==='tip'){cr.wait-=dt;if(P.smoke&&Math.random()<dt*6)Particles.spawn(cr.x-Math.cos(cr.rot)*3,H(cr.x,cr.z)+1.5,cr.z-Math.sin(cr.rot)*3,0,0.5,0,2,1,3,2);if(cr.wait<=0){cr.st='home';cr.path=null;}continue;}
      if(!cr.path){cr.path=farmRoute(cr.v,[cr.x,cr.z],tgt);cr.pi=0;}if(follow(cr,7*P.farmSpeed)){if(cr.st==='toSilo'){cr.st='tip';cr.wait=8;}else cr.done=true;cr.path=null;}}
    F.carts=F.carts.filter(c=>!c.done);},
  // ---------------- people: strollers, waiting passengers, boarding and alighting  // ---------------- people: strollers, waiting passengers, boarding and alighting
  updateWalkers(dt,A){const Hr0=(x,z)=>R.sampleHr(this.T,x,z);const T=this.T,want=Math.round(Math.min(320,this.houses.length*0.7*P.people)),out=1-smooth(0.35,0.85,A.night)*0.85;
    let n=this.walkers.filter(w=>w.state==='stroll').length;
    if(n<want*out&&this.houses.length&&Math.random()<dt*6){const h=this.houses[Math.floor(Math.random()*this.houses.length)];if(this.houseOn(h)&&!this.stFoot(h.front[0],h.front[1],1))this.walkers.push(this.newWalker(h.front[0],h.front[1],h.village));}
    for(const w of this.walkers){if(w.state==='stroll'&&n>want*out+2&&Math.random()<dt*0.3){w.state='home';let h=w.v.houses[Math.floor(Math.random()*w.v.houses.length)];if(h&&this.stFoot(h.front[0],h.front[1],1))h=w.v.houses.find(q=>!this.stFoot(q.front[0],q.front[1],1))||h;w.tx=h.front[0];w.tz=h.front[1];const pth=this.vpath(w.v,[w.x,w.z],h.front);w.wp=pth&&pth.length>1?pth:null;n--;}
      if(w.wait>0){w.wait-=dt;w.mv=0;w.hidden=!!w.inside||(w.state==='leave'&&!w.out);continue;}
      // arrived at the station forecourt: in through the building to a spot on the platform
      if(w.state==='toStation'&&w.st&&!w.st.cargo&&!w.inDone&&!(w.wp&&w.wp.length)&&!w.bp){w.inDone=true;w.bp=w.far?[...this.farIn(w.st),[w.tx,w.tz,w.st.y+0.85]]:this.stIn(w.st,[w.tx,w.tz]);w.spd=1.3;}
      if(w.bp&&w.bp.length&&(w.state==='board'||w.state==='leave'||w.state==='toStation')){
        if(w.state==='board'&&!(w.train&&w.st&&w.train.atSt===(w.bst||w.st).st.id&&Math.abs(w.train.v||0)<0.1)){// the train left without them: back to the main platform (over the footbridge if they were crossing)
          const back=w.bst&&w.bst.parent;w.state='toStation';w.train=null;w.inDone=true;w.tx=w.st?w.st.px+w.st.dx*(Math.random()-0.5)*20:w.x;w.tz=w.st?w.st.pz+w.st.dz*(Math.random()-0.5)*20:w.z;
          w.bp=back?[...this.fbPathTo(w.st,w.pk||1,0),[w.tx,w.tz,w.st.y+0.85]]:[[w.tx,w.tz,w.st?w.st.y+0.85:w.y]];w.bst=null;w.spd=1.4;continue;}
        if(w.icon){Icons.add(w.x,(w.y!=null?w.y:w.st?w.st.y:Hr0(w.x,w.z))+3.2,w.z,w.icon);w.icon=null;}w.out=true;w.hidden=!!w.inside;
        const q=w.bp[0],dx=q[0]-w.x,dz=q[1]-w.z,d=Math.hypot(dx,dz),sp=(w.spd||2.2)*dt,py=w.st?w.st.y+0.85:Hr0(w.x,w.z);
        if(d<=sp){w.x=q[0];w.z=q[1];w.y=q[2];w.bp.shift();if(q[3]==='in')w.inside=true;else if(q[3]==='out')w.inside=false;else if(q[3]==='wait')w.wait=q[4]||2;w.hidden=!!w.inside;
          if(!w.bp.length){w.bp=null;if(w.state==='board'&&w.train){w.done=true;Icons.add(w.x,(w.y||py)+3.2,w.z,'+');w.train.pax.push({dest:w.dest,fx:w.st.x,fz:w.st.z,t0:App.time,ci:w.ci});}
            else if(w.state==='toStation'){w.state='wait';w.rot=w.faceRot;w.mv=0;w.y=null;continue;}else if(w.state==='leave')w.y=null;}}
        else{w.x+=dx/d*sp;w.z+=dz/d*sp;const y0=w.y!=null?w.y:py,y1=q[2]!=null?q[2]:py;w.y=q[2]==null&&w.y==null?null:y0+(y1-y0)*Math.min(1,sp/d);if(w.y!=null&&q[2]==null&&Math.abs(w.y-py)<0.02)w.y=null;}
        if(d>0.01)w.rot=lerpAng(w.rot,Math.atan2(dz,dx),dt*8);w.mv=1;continue;}if(w.icon){Icons.add(w.x,(w.st?w.st.y:Hr0(w.x,w.z))+3.2,w.z,w.icon);w.icon=null;}w.hidden=false;let gx=w.tx,gz=w.tz;if(w.wp&&w.wp.length){if(Math.hypot(w.wp[0][0]-w.x,w.wp[0][1]-w.z)<1.6)w.wp.shift();if(w.wp.length){gx=w.wp[0][0];gz=w.wp[0][1];}}
      const dx=gx-w.x,dz=gz-w.z,d=Math.hypot(dx,dz);
      if(d<0.4&&!(w.wp&&w.wp.length)){w.mv=0;if(w.state==='stroll'){this.pickStrollTarget(w);w.wait=1+Math.random()*7;}else if(w.state==='toStation'){w.state='wait';w.rot=w.faceRot;}
        else if(w.state==='board'){if(w.train&&w.st&&w.train.atSt===(w.bst||w.st).st.id){w.done=true;Icons.add(w.x,w.st.y+3.2,w.z,'+');w.train.pax.push({dest:w.dest,fx:w.st.x,fz:w.st.z,t0:App.time,ci:w.ci});}else{w.state='toStation';w.train=null;w.tx=w.st?w.st.px:w.x;w.tz=w.st?w.st.pz:w.z;}}else if(w.state==='home'||w.state==='leave')w.done=true;continue;}
      const sp=(w.state==='board'?(w.spd||2.2):w.state==='leave'?1.6:1.25)*dt;w.x+=dx/d*Math.min(sp,d);w.z+=dz/d*Math.min(sp,d);w.rot=lerpAng(w.rot,Math.atan2(dz,dx),dt*6);w.mv=1;}
    this.walkers=this.walkers.filter(w=>!w.done);},
  newWalker(x,z,v){const hs=Math.random(),w={x,z,tx:x,tz:z,rot:Math.random()*6.28,v,hash:hs,state:'stroll',wait:Math.random()*3,mv:0,var:this.pvar(hs)};if(w.var==='child')w.sc=0.62;this.pickStrollTarget(w);return w;},
  pvar(h){return h<0.44?'man':h<0.86?'woman':h<0.94?'elder':'child';},
  // ---------------- a village's street graph (lane points, junctions, the foot of every garden path, the gates) so people keep to streets and paths
  vgraph(v){const key=(v.ways||[]).length*10007+v.houses.length+(this.stVer||0)*1e7;if(v.G&&v.G.key===key)return v.G;const N=[],E=[],node=(x,z)=>{N.push([x,z]);E.push([]);return N.length-1;},
      link=(a,b)=>{if(a===b)return;{const L=Math.hypot(N[b][0]-N[a][0],N[b][1]-N[a][1]),n=Math.max(1,Math.ceil(L/1.5));for(let i=0;i<=n;i++){const u=i/n;if(this.stFoot(N[a][0]+(N[b][0]-N[a][0])*u,N[a][1]+(N[b][1]-N[a][1])*u,1.8))return;}}const d=Math.hypot(N[a][0]-N[b][0],N[a][1]-N[b][1]);E[a].push([b,d]);E[b].push([a,d]);};
    const WS=v.ways||[],WI=WS.map(W=>{const ids=W.p.map(p=>node(p[0],p[1]));for(let i=0;i+1<ids.length;i++)link(ids[i],ids[i+1]);return ids;});
    WI.forEach((ids,wi)=>{for(const e of [ids[0],ids[ids.length-1]]){let best=-1,bd=9;WI.forEach((o,oi)=>{if(oi===wi)return;for(const k of o){const d=Math.hypot(N[k][0]-N[e][0],N[k][1]-N[e][1]);if(d<bd){bd=d;best=k;}}});if(best>=0)link(e,best);}});
    const gate=new Map();for(const h of v.houses){if(h.gone||!h.front)continue;let bd=60,bw=-1,bi=-1,bp=null;WS.forEach((W,wi)=>{for(let i=0;i+1<W.p.length;i++){const q=VG.segDist([W.p[i][0],W.p[i][1],W.p[i+1][0],W.p[i+1][1]],h.front[0],h.front[1]);if(q[0]<bd){bd=q[0];bw=wi;bi=i;bp=[q[1],q[2]];}}});
      if(bw<0)continue;const fo=node(bp[0],bp[1]);link(fo,WI[bw][bi]);link(fo,WI[bw][bi+1]);const g=node(h.front[0],h.front[1]);link(g,fo);gate.set(h,g);}
    return v.G={key,N,E,gate};},
  vpath(v,from,to){const G=this.vgraph(v),N=G.N,n=N.length;if(!n)return null;const near=p=>{let b=0,bd=1e9;for(let k=0;k<n;k++){const d=Math.hypot(N[k][0]-p[0],N[k][1]-p[1]);if(d<bd){bd=d;b=k;}}return b;};
    const s0=near(from),s1=near(to),g=new Float64Array(n).fill(1e30),pr=new Int32Array(n).fill(-1),done=new Uint8Array(n);g[s0]=0;
    for(;;){let k=-1,bv=1e30;for(let i=0;i<n;i++)if(!done[i]&&g[i]<bv){bv=g[i];k=i;}if(k<0||k===s1)break;done[k]=1;for(const [j,d] of G.E[k])if(g[k]+d<g[j]){g[j]=g[k]+d;pr[j]=k;}}
    if(s1!==s0&&pr[s1]<0)return null;const out=[];for(let k=s1;k>=0;k=pr[k]){out.push(N[k].slice());if(k===s0)break;}return out.reverse();},
  // ---------------- daily life around the focus: gardeners at their beds, sweepers at the gate in the morning, people chatting, children playing
  // on the square, an evening crowd outside the inn, and the postman's morning round of every gate (walking the street graph)
  updateVillagers(dt,A){const h=P.timeOfDay,E=Weather.eff(),wet=E.rain>0.25,winter=Weather.seasonW[3]>0.5,dark=A.night>0.5,f=R.focus||[0,0,0],T=this.T,t=App.time||0,Hr=(x,z)=>R.sampleHr(T,x,z);
    const NV=this.villages.filter(v=>Math.hypot(v.x-f[0],v.z-f[2])<900);
    this.vgT=(this.vgT||0)-dt;if(this.vgT<=0||!this.vStatic){this.vgT=1;const L=[];
      for(const v of NV){
        if(!dark)for(const ho of v.houses){if(!this.houseOn(ho)||ho.fixed)continue;const def=R.houseDefs[ho.v],spots=KIT_WORK[def.kit],c=Math.cos(ho.rot),s=Math.sin(ho.rot);
          if(spots&&!wet&&!winter){const st=8+((ho.hash*13.1)%1)*8.5;if(h>=st&&h<st+2.3){const sp=spots[Math.floor(((ho.hash*7.7)%1)*spots.length)],x=ho.x+c*sp[0]-s*sp[1],z=ho.z+s*sp[0]+c*sp[1];
              L.push({x,z,y:ho.y-0.02,rot:ho.rot+sp[3],hash:(ho.hash*3.3)%1,var:sp[2]===2?'gard':sp[2]===3?'gardw':((ho.hash*5.1)%1<0.5?'woman':'man'),pose:sp[2],anim:0});}}
          {const st=7+((ho.hash*5.1)%1)*2;if((ho.hash*31.3)%1<0.3&&!wet&&h>=st&&h<st+0.7&&ho.front){const gx=ho.front[0],gz=ho.front[1],dx=ho.x-gx,dz=ho.z-gz,l=Math.hypot(dx,dz)||1,x=gx+dx/l*1.4,z=gz+dz/l*1.4;
              L.push({x,z,y:Hr(x,z)-0.03,rot:Math.atan2(-dz,-dx)+0.5,hash:(ho.hash*9.7)%1,var:'sweep',pose:4,anim:0});}}}
        if(!dark&&!wet&&h>8.5&&h<19.5){const ng=1+(v.level|0)+Math.min(2,Math.floor(v.houses.length/15));for(let g=0;g<ng;g++){if((h*0.45+g*0.37+((v.x*0.013)%1))%1>0.72)continue;let cx,cz;
            if(g===0&&v.plaza){const a=v.dir+1.1;cx=v.plaza[0]+Math.cos(a)*v.plaza[2]*0.55;cz=v.plaza[1]+Math.sin(a)*v.plaza[2]*0.55;}
            else if(v.streets&&v.streets.length){const sg=v.streets[(g*7+3)%v.streets.length],L2=Math.hypot(sg[2]-sg[0],sg[3]-sg[1])||1;cx=(sg[0]+sg[2])/2-(sg[3]-sg[1])/L2*(v.ways&&v.ways[0]?v.ways[0].w+0.9:2.6);cz=(sg[1]+sg[3])/2+(sg[2]-sg[0])/L2*(v.ways&&v.ways[0]?v.ways[0].w+0.9:2.6);}else continue;
            const n=2+((g+v.houses.length)%2);for(let k=0;k<n;k++){const a=k/n*6.283+g,x=cx+Math.cos(a)*0.62,z=cz+Math.sin(a)*0.62,hs=((v.x+g*13+k*7)*0.618)%1;L.push({x,z,y:Hr(x,z)-0.03,rot:a+Math.PI,hash:hs,var:hs<0.5?'man':hs<0.9?'woman':'elder',pose:5,anim:0});}}}
        const inn=v.houses.find(q=>q.v===4&&this.houseOn(q));if(inn&&inn.front&&!wet&&h>18&&h<23){const gx=inn.front[0],gz=inn.front[1],dx=gx-inn.x,dz=gz-inn.z,l=Math.hypot(dx,dz)||1,ox=dx/l,oz=dz/l,n=3+2*(v.level|0);
          for(let k=0;k<n;k++){const a=k*2.4,r=1.2+(k%3)*0.7,x=gx+ox*(3+Math.sin(a)*r)-oz*Math.cos(a)*r*1.6,z=gz+oz*(3+Math.sin(a)*r)+ox*Math.cos(a)*r*1.6,hs=((inn.hash+k*0.37)*7.1)%1;L.push({x,z,y:Hr(x,z)-0.03,rot:Math.atan2(gz+oz*3-z,gx+ox*3-x),hash:hs,var:hs<0.55?'man':'woman',pose:5,anim:0});}}}
      this.vStatic=L;}
    const D=[];
    for(const v of NV){// children playing tag on the square (or at the end of the green)
      if(!dark&&!wet&&h>10&&h<18.5){let cx=v.x,cz=v.z;if(v.green){cx=v.x+Math.cos(v.dir)*v.green[3]*0.78;cz=v.z+Math.sin(v.dir)*v.green[3]*0.78;}else if(!v.plaza&&v.ways&&v.ways[0]){cx=v.ways[0].p[1][0];cz=v.ways[0].p[1][1];}
        const n=3+Math.min(3,(v.level|0)+Math.floor(v.houses.length/12));for(let k=0;k<n;k++){const r=3+k*0.75,dir=k%2?1:-1,a=t*2.4/r*dir+k*2.4,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r*0.75,hs=((v.x+k*11)*0.618)%1;
          D.push({x,z,y:Hr(x,z)-0.03,rot:Math.atan2(Math.cos(a)*0.75*dir,-Math.sin(a)*dir),hash:hs,var:'child',sc:0.62,pose:7,anim:11});}}
      // the postman: from 8 to 11:30 a round of the gates, nearest first, along the streets
      if(h<7.9)v.postDone=false;if(h>=8&&h<11.5&&!v.postDone){if(!v.post){const gates=v.houses.filter(q=>this.houseOn(q)&&!q.fixed&&q.front).slice(0,30),legs=[];let at=v.plaza?[v.plaza[0],v.plaza[1]]:[v.x,v.z];const left=gates.slice();
            while(left.length){let bi=0,bd=1e9;left.forEach((q,i)=>{const d=Math.hypot(q.front[0]-at[0],q.front[1]-at[1]);if(d<bd){bd=d;bi=i;}});const q=left.splice(bi,1)[0],pth=this.vpath(v,at,q.front);legs.push({pts:pth&&pth.length?pth:[q.front.slice()],house:q});at=q.front;}
            if(legs.length)v.post={legs,li:0,pi:0,x:legs[0].pts[0][0],z:legs[0].pts[0][1],wait:0,rot:0};else v.postDone=true;}
          const pm=v.post;if(pm){let mv=0;if(pm.wait>0)pm.wait-=dt;else{const leg=pm.legs[pm.li],q=leg.pts[pm.pi],dx=q[0]-pm.x,dz=q[1]-pm.z,d=Math.hypot(dx,dz),sp=1.35*dt;
              if(d<=sp){pm.x=q[0];pm.z=q[1];pm.pi++;if(pm.pi>=leg.pts.length){pm.wait=2.5;pm.rot=Math.atan2(leg.house.z-pm.z,leg.house.x-pm.x);pm.li++;pm.pi=0;if(pm.li>=pm.legs.length){v.post=null;v.postDone=true;}}}
              else{pm.x+=dx/d*sp;pm.z+=dz/d*sp;pm.rot=lerpAng(pm.rot,Math.atan2(dz,dx),Math.min(1,dt*8));mv=1;}}
            D.push({x:pm.x,z:pm.z,y:Math.max(Hr(pm.x,pm.z)-0.03,this.deckY(pm.x,pm.z)),rot:pm.rot,hash:0.31,var:'post',pose:0,anim:mv?6.4:0});}}
      else if(v.post&&(h<8||h>=11.5)){v.post=null;}}
    this.villagers=this.vStatic.concat(D);},
  pickStrollTarget(w){const v=w.v;if(!v){w.done=true;return;}const r=Math.random();
    if(r<0.45&&v.houses.length){const h=v.houses[Math.floor(Math.random()*v.houses.length)];w.tx=h.front[0];w.tz=h.front[1];}
    else if(r<0.8&&v.streets&&v.streets.length){const s=v.streets[Math.floor(Math.random()*v.streets.length)],u=Math.random();w.tx=s[0]+(s[2]-s[0])*u;w.tz=s[1]+(s[3]-s[1])*u;}
    else{w.tx=v.x+(Math.random()-0.5)*14;w.tz=v.z+(Math.random()-0.5)*14;}
    if(this.stFoot(w.tx,w.tz,1.5)){const t=this.safeSpot(v,w);w.tx=t[0];w.tz=t[1];}
    {const pth=this.vpath(v,[w.x,w.z],[w.tx,w.tz]);w.wp=pth&&pth.length>1?pth:null;
      // no street path: a straight walk, but never across a station (platforms, tracks between them, the building)
      if(!w.wp&&this.stInfo&&this.stInfo.length){const L=Math.hypot(w.tx-w.x,w.tz-w.z),n=Math.ceil(L/2);for(let i=1;i<=n;i++){const u=i/n;if(this.stFoot(w.x+(w.tx-w.x)*u,w.z+(w.tz-w.z)*u,0.8)){w.tx=w.x+(Math.random()-0.5)*6;w.tz=w.z+(Math.random()-0.5)*6;if(this.stFoot(w.tx,w.tz,0.8)){w.tx=w.x;w.tz=w.z;}break;}}}}
    // now and then someone heads for the station
    const st=this.stInfo.find(s=>s.v===v&&!s.cargo&&!s.parent);const lvq=st&&st.v?(st.v.level|0):0;if(st&&Math.random()<0.18*(1+lvq*0.7)&&this.walkers.filter(q=>q.st&&q.st.st.id===st.st.id&&(q.state==='wait'||q.state==='toStation')).length<6+lvq*6){const u=(Math.random()-0.5)*Math.max(26,(st.half||22)*2-14);
      w.state='toStation';w.st=st;w.tx=st.px+st.dx*u;w.tz=st.pz+st.dz*u;w.faceRot=Math.atan2(-st.nz,-st.nx);w.inDone=false;
      if(this.stFar(st,w.x,w.z)){w.far=true;const fs=this.farStart(st),pth=this.vpath(v,[w.x,w.z],[fs[0],fs[1]]);w.wp=pth&&pth.length>1?[...pth,[fs[0],fs[1]]]:[[fs[0],fs[1]]];}
      else if(st.road)w.wp=st.road.slice().reverse();else{const fc=this.stW(st,this.stDoorX(st),this.stBack(st)+3.2),pth=this.vpath(v,[w.x,w.z],fc);w.wp=pth&&pth.length>1?[...pth,fc]:[fc];}}},
  // a house to walk home to: standing, and not under a station
  homeIn(v){for(let k=0;k<16;k++){const h=v.houses[Math.floor(Math.random()*v.houses.length)];if(h&&h.front&&this.houseOn(h)&&!this.stFoot(h.front[0],h.front[1],1.5))return h;}return null;},
  // somewhere in the village that is not under a station: the centre, else a house front, else where the walker stands
  safeSpot(v,w){if(!this.stFoot(v.x,v.z,1.5))return[v.x,v.z];for(let k=0;k<12;k++){const h=v.houses[Math.floor(Math.random()*v.houses.length)];if(h&&h.front&&!this.stFoot(h.front[0],h.front[1],1.5))return h.front.slice();}return[w.x,w.z];},
  // inside a passenger station's building or on its platforms (a margin m): village streets do not run there and nobody strolls there
  stFoot(x,z,m){m=m||0;for(const si of this.stInfo||[]){if(si.cargo)continue;const rx=x-si.x,rz=z-si.z;if(Math.abs(rx)>60||Math.abs(rz)>60)continue;const mx=-(rx*si.dx+rz*si.dz),mz=rx*si.nx+rz*si.nz,L=(si.st.len||44)/2+4;
      const lo=si.parent?1.2:this.stTown(si)?(si.twin?-(KIT.TWIN_G+6):-6):1.2;if(Math.abs(mx)<L+m&&mz>lo-m&&mz<6+m)return true;if(!si.parent){const town=this.stTown(si),bx=town?[-22,19.5]:[-14,5.5];if(mx>bx[0]-m&&mx<bx[1]+m&&mz>5.5-m&&mz<this.stBack(si)+1.4+m)return true;}}return false;},
  // ---- the station building's frame: model x along the building, z out from the track toward it (see buildings/station.js)
  stW(si,mx,mz){return[si.x-si.dx*mx+si.nx*mz,si.z-si.dz*mx+si.nz*mz];},
  /* the footprint a passenger station will have when its village is a town (grand building, second track, forecourt): houses never get planned in it */
  stReserve(x,z,m){m=m||0;for(const si of this.stInfo||[]){if(si.cargo||si.parent)continue;const rx=x-si.x,rz=z-si.z;if(Math.abs(rx)>70||Math.abs(rz)>70)continue;const mx=-(rx*si.dx+rz*si.dz),mz=rx*si.nx+rz*si.nz,L=Math.max((si.st.len||44)/2+4,26);
      if(mx>-22-m&&mx<19.5+m&&mz>-(KIT.TWIN_G+7)-m&&mz<19+m)return true;if(Math.abs(mx)<L+m&&mz>-(KIT.TWIN_G+7)-m&&mz<6+m)return true;}return false;},
  stRectHit(Q,fn,m){const c=VG.corners(Q);if(fn((c[0][0]+c[2][0])/2,(c[0][1]+c[2][1])/2,m))return true;for(let i=0;i<4;i++){const a=c[i],b=c[(i+1)%4];if(fn(a[0],a[1],m)||fn((a[0]+b[0])/2,(a[1]+b[1])/2,m))return true;}return false;},
  stTown(si){return!!(si&&si.v&&(si.v.level|0)>=this.LEVELS.length-1);},
  stDoorX(si){return this.stTown(si)?-6.8:0;},stBack(si){return this.stTown(si)?13.4:12.4;},
  // the way in: from the forecourt up the steps to the rear door, through the booking hall (out of sight a few seconds), out of the front
  // door under the canopy and on to a spot on the platform. Points are [x, z, y, flag, seconds]; flag 'in' hides, 'wait' pauses, 'out' shows.
  stIn(si,to){const dx=this.stDoorX(si),bk=this.stBack(si),G=p=>[p[0],p[1],R.sampleHr(this.T,p[0],p[1])-0.05],py=si.y+0.85,W=(x,z)=>this.stW(si,x,z);
    const a=W(dx,bk+2.4),b=W(dx,bk+0.25),c=W(dx,6.6),d=W(dx,4.4);return[G(a),[b[0],b[1],py,'in'],[c[0],c[1],py,'wait',2+Math.random()*5],[c[0],c[1],py,'out'],[d[0],d[1],py],[to[0],to[1],py]];},
  // the way out: to the front door, through the hall, down the rear steps to the forecourt
  stOut(si){const dx=this.stDoorX(si),bk=this.stBack(si),G=p=>[p[0],p[1],R.sampleHr(this.T,p[0],p[1])-0.05],py=si.y+0.85,W=(x,z)=>this.stW(si,x,z);
    const d=W(dx+(Math.random()-0.5)*1.4,4.2),c=W(dx,6.6),b=W(dx,bk+0.25),a=W(dx+(Math.random()-0.5)*2,bk+2.6);return[[d[0],d[1],py],[c[0],c[1],py,'in'],[b[0],b[1],py,'wait',1+Math.random()*2],[b[0],b[1],py,'out'],G(a)];},
  updateStations(){this.stInfo=[];this.kitDirty=true;for(const st of Track.stations){const s=segById(st.sid);if(!s)continue;const q=segPoint(s,st.t),y=segY(s,st.t);let c=Math.cos(q[2]),sn=Math.sin(q[2]);
      // a station at a sawmill or workshop turns its yard (and platform) toward it
      st._f=1;const cargo=!!(st.sawmill||st.workshop||st.mine||st.farm);{const kind=st.sawmill?'sawmill':st.workshop?'workshop':st.mine?'mine':null,m=st.farm?this.farmOf(st):kind?Crane.ind(kind,st[kind]):null;if(m&&sn*(m.x-q[0])-c*(m.z-q[1])<0){st._f=-1;c=-c;sn=-sn;}}
      if(!cargo&&(st.side||1)<0){st._f=-1;c=-c;sn=-sn;}
      const px=q[0]+sn*3.6,pz=q[1]-c*3.6,v=this.nearestVillage(q[0],q[1],420);
      const si={st,v,cargo,px,pz,y,half:(st.len||44)/2,dx:c,dz:sn,nx:sn,nz:-c,x:q[0],z:q[1],lx:[q[0]+sn*5.4-c*7,q[1]-c*5.4-sn*7],lx2:[q[0]+sn*5.4+c*7,q[1]-c*5.4+sn*7]};
      if(v&&!cargo&&!st.twinOf){const town=this.stTown(si),key=st.id+':'+Math.round(q[0])+','+Math.round(q[1])+(town?'T':'');if(!(key in this.stRoads)){const p0=this.stW(si,this.stDoorX(si),this.stBack(si)+3.2);this.stRoads[key]=this.routeRoad(p0,v);this.roadsDirty=true;}si.road=this.stRoads[key];si.rkey=key;}
      this.stInfo.push(si);}
    // a station whose town reached its full size is rebuilt as the grand one: tell the player once (not for stations loaded that way)
    for(const si of this.stInfo){if(si.cargo||si.parent)continue;const g=this.stTown(si);if(g&&!si.st.grand){si.st.grand=true;if(this.stReady)Banner.grand(si);}else if(!g&&si.st.grand)si.st.grand=false;}this.stReady=true;
    // a second platform belongs to its station: its people wait at the main platform and cross by the footbridge
    {const sig=this.stInfo.map(q=>q.st.id+':'+Math.round(q.x)+','+Math.round(q.z)+(this.stTown(q)?'T':'')).join('|');if(sig!==this.stSig){this.stSig=sig;this.stVer=(this.stVer||0)+1;
      // walks planned before this station stood here: plan them again around it
      for(const w of this.walkers){if(!(w.state==='stroll'||w.state==='home')||!w.v)continue;if(this.stFoot(w.tx,w.tz,1)){const t=this.safeSpot(w.v,w);w.tx=t[0];w.tz=t[1];}if(w.wp&&w.wp.some(p=>this.stFoot(p[0],p[1],1.8))){const pth=this.vpath(w.v,[w.x,w.z],[w.tx,w.tz]);w.wp=pth&&pth.length>1?pth:null;}}}}
    for(const si of this.stInfo)if(si.st.twinOf){const p=this.stInfo.find(q=>q.st.id===si.st.twinOf);if(p){si.parent=p;p.twin=si;si.v=p.v;}}
    {const live=new Set(this.stInfo.map(q=>q.rkey).filter(Boolean));for(const k in this.stRoads)if(!live.has(k)){delete this.stRoads[k];this.roadsDirty=true;}}
    if(App.T&&App.T.trackMask&&this.houses&&this.houses.length)this.applyTrackMask(App.T);
    this.trainsAtStations();},
  trainsAtStations(){for(const tr of Trains.list){if(!tr.pax)tr.pax=[];if(!tr.poses||!tr.poses.length)continue;const mid=tr.poses[Math.floor(tr.poses.length/2)];if(!mid)continue;
      let at=null;if(Math.abs(tr.v)<0.4)for(const si of this.stInfo){const cr=si.cargo;if((Math.hypot(mid.c[0]-si.x,mid.c[2]-si.z)<28&&Math.abs((mid.c[0]-si.x)*si.nx+(mid.c[2]-si.z)*si.nz)<2.4)||(!cr&&tr.poses.some(p=>p&&Math.abs((p.c[0]-si.x)*si.dx+(p.c[2]-si.z)*si.dz)<si.half-2&&Math.abs((p.c[0]-si.x)*si.nx+(p.c[2]-si.z)*si.nz)<2.4))||(cr&&tr.poses.some(p=>p&&Math.hypot(p.c[0]-si.x,p.c[2]-si.z)<22))){at=si;break;}}
      if(tr.plat&&tr.plat.moving)continue;// pulling up along a short platform: still at this station
      if(at&&tr.atSt!==at.st.id){tr.atSt=at.st.id;this.stop(tr,at);}else if(!at&&tr.atSt&&Math.abs(tr.v)>1){tr.atSt=null;tr.plat=null;}}},
  // the way into a coach: platform edge beside its end platform -> onto the end platform -> through the end door (x, z, y; y null = platform)
  doorPath(p,si,e){const X=p.X,Zl=[-X[2],0,X[0]],sd=(Zl[0]*si.nx+Zl[2]*si.nz)>0?1:-1,P=(a,l,y)=>[p.c[0]+X[0]*a+Zl[0]*l*sd,p.c[2]+X[2]*a+Zl[2]*l*sd,y],fy=p.c[1]+1.18;
    return[P(e*7.02,1.95,null),P(e*7.0,0.95,fy),P(e*6.55,0,fy)];},
  // ---- platforms of a station by index: 0 the building's, 1 across the line (the island platform once there is a second track), 2 the outer
  // platform of the second track. lane: where people walk along it; sz: the footbridge stairs on it (model z, see buildings/station.js)
  plat(psi,k){const G=KIT.TWIN_G;return k===0?{lane:3.6,sz:5.0}:k===1?{lane:-3.6,sz:-5.0}:{lane:-(G+3.6),sz:-(G+5.0)};},
  platsOf(si){const ps=si.parent||si;if(si.parent)return[1,2];return this.stTown(ps)?[0,1]:[0];},
  // from platform a to platform b over the footbridge (grand station only): along a to the foot of its stairs, up, across, down, onto b
  fbPathTo(psi,a,b){if(a===b)return[];const fb=KIT.FB.stationTown,x0=fb[0],xm=(fb[0]+fb[1])/2,py=psi.y+0.85,deck=psi.y+6.55,A=this.plat(psi,a),Bp=this.plat(psi,b),P=(x,z,y)=>{const w=this.stW(psi,x,z);return[w[0],w[1],y];};
    return[P(x0-8.4,A.lane,py),P(x0-7.3,A.sz,py),P(x0-0.15,A.sz,deck),P(xm,A.sz,deck),P(xm,Bp.sz,deck),P(x0-0.15,Bp.sz,deck),P(x0-7.3,Bp.sz,py),P(x0-8.6,Bp.lane,py)];},
  // a coach's door path on the side of platform k at stop station si (the second track's own side is its outer platform)
  doorSide(p,si,k,e){const own=si.parent?2:0;return this.doorPath(p,k===own?si:{nx:-si.nx,nz:-si.nz},e);},
  // people from the far side of the line: only the grand station lets them in from there (up the end ramp of the farthest platform and over
  // the footbridge); at a small station they walk round by the streets
  stFar(psi,x,z){if(!this.stTown(psi))return false;const rx=x-psi.x,rz=z-psi.z;return rx*psi.nx+rz*psi.nz<-3;},
  farPlat(psi){return psi.twin?2:1;},
  farRamp(psi){const k=this.farPlat(psi),L=((k===2?psi.twin.st.len:psi.st.len)||44)/2,ln=this.plat(psi,k).lane,py=psi.y+0.85,a=this.stW(psi,L+0.6,ln),b=this.stW(psi,L+7,ln);return[[b[0],b[1],R.sampleHr(this.T,b[0],b[1])-0.05],[a[0],a[1],py]];},
  farIn(psi){return[...this.farRamp(psi),...this.fbPathTo(psi,this.farPlat(psi),0)];},
  farStart(psi){return this.farIn(psi)[0];},

  // ---- the conductor (guard): steps out of a coach at the platform when the train stops, stands by the train, and when it is ready to go
  // blows the whistle and raises the green flag, then gets back in; the train leaves only when the conductor is aboard
  condOut(tr,si,cs){if(!cs||!cs.length||!tr.poses)return;const ci=cs[cs.length-1],p=tr.poses[ci];if(!p)return;const dp=this.doorPath(p,si,-1),py=si.y+0.85,e=dp[0],sp=[e[0]+si.nx*1.1,e[1]+si.nz*1.1,py];
    tr.cond={state:'out',path:[dp[1],dp[0],sp],x:dp[2][0],z:dp[2][1],y:dp[2][2],rot:0,si,ci,door:dp,t:0,hash:(tr.id*0.377)%1};},
  // ---- sawmill placement beside a brook (see generate). Mill frame: P2(lx,lz) = mill + rot·(lx,lz); +x the road and brook side.
  placeSawmills(T,o){const {H,wet,onRoad,onTrack,fields,flatMask,flatH,clearZones}=o,N=T.N,cs=T.cs,W=T.W,rr=mulberry32((P.seed|0)*4243+29),dens=this.sawDens||(()=>10);
    if(!T.streams0)T.streams0=(T.streams||[]).map(a=>Float32Array.from(a));T.streams=T.streams0.map(a=>Float32Array.from(a));// generation starts from the world's own streams
    const frame=(x,z,rot)=>{const c=Math.cos(rot),s=Math.sin(rot);return{P2:(lx,lz)=>[x+c*lx-s*lz,z+s*lx+c*lz],L:(px,pz)=>{const dx=px-x,dz=pz-z;return[c*dx+s*dz,-s*dx+c*dz];}};};
    const others=()=>[...this.sawmills,...(this.workshops||[]),...(this.mines||[])];
    // the plot, the loading sides and the yard must be dry, off roads and tracks, clear of houses, fields and other industries
    const siteOK=(x,z,rot)=>{if(x<70||z<70||x>W-70||z>W-70)return null;const F=frame(x,z,rot);let mn=1e9,mx=-1e9;
      for(const [lx,lz] of [[0,0],[-18,-13],[18,-13],[-18,13],[18,13],[-35,0],[0,30],[0,-30],[-28,-20],[-28,20],[22,0],[22,-12],[22,12]]){const p=F.P2(lx,lz),h=H(p[0],p[1]);if(Math.abs(lx)<=22&&Math.abs(lz)<=15){mn=Math.min(mn,h);mx=Math.max(mx,h);}
        if(wet(p[0],p[1])||onRoad(p[0],p[1])||onTrack(p[0],p[1]))return null;}
      if(mx-mn>8)return null;if(this.houses.some(h=>Math.hypot(h.x-x,h.z-z)<h.r+42)||fields.some(f=>Math.hypot(f.x-x,f.z-z)<Math.hypot(f.hx,f.hz)+22))return null;
      if(others().some(m=>Math.hypot(m.x-x,m.z-z)<110)||this.castleList().some(c=>Math.hypot(c.x-x,c.z-z)<120))return null;return{rough:mx-mn};};
    // every stream point near the mill: the brook must pass the road side (x 24..34 by the wheel) and keep out of the plot and loading sides
    const brookOK=(F,skip)=>{let near=false;for(const st of T.streams){for(let i=0;i<st.length;i+=3){const l=F.L(st[i],st[i+1]);if(Math.abs(l[0])>90||Math.abs(l[1])>90)continue;
        if(l[0]<23&&Math.abs(l[1])<46)return false;if(st===skip&&l[0]>=24&&l[0]<=34&&Math.abs(l[1])<7)near=true;}}return near;};
    for(const v of o.order){if(this.sawmills.length>=(this.sawWant||1))break;let best=null;
      // candidates: points on streams (and run-off rills) in a ring around the village
      for(const st of T.streams){const n=st.length/3;if(n<8)continue;for(let i=4;i<n-4;i+=2){const x=st[i*3],z=st[i*3+1],d=Math.hypot(x-v.x,z-v.z);if(d<v.R+90||d>v.R+440)continue;if(rr()>0.5)continue;
          const tx=st[i*3+6]-st[i*3-6],tz=st[i*3+7]-st[i*3-5],tl=Math.hypot(tx,tz)||1,nx=-tz/tl,nz=tx/tl;
          for(const sd of [1,-1]){const ux=nx*sd,uz=nz*sd,cx=x-ux*28,cz=z-uz*28,rot=Math.atan2(uz,ux),ok=siteOK(cx,cz,rot);if(!ok)continue;const F=frame(cx,cz,rot);if(!brookOK(F,st))continue;
            const iu=Math.max(0,i-5),up=F.L(st[iu*3],st[iu*3+1])[1]>0?1:-1,drop=H(st[iu*3],st[iu*3+1])-H(x,z),sc=dens(cx,cz)+Math.min(Math.max(drop,0),6)*3-ok.rough*1.5+(st[i*3+2]>0?12:0)+rr()*3;
            if(!best||sc>best.sc)best={x:cx,z:cz,rot,sc,st,up,brook:st[i*3+2]>0?'stream':'rill'};}}}
      if(best&&best.brook==='rill'){const st=best.st;for(let i=0;i<st.length;i+=3)st[i+2]=Math.max(Math.abs(st[i+2]),0.02);}// the rill becomes a permanent brook
      if(!best){// no brook fits: the old spot, facing the village, with a brook of its own down past the road side
        const os=o.oldSaw.find(q=>q.v===v);if(!os)continue;let rot=Math.atan2(v.z-os.z,v.x-os.x),ok=null;for(let k=0;k<8&&!ok;k++){const r2=rot+(k?(k%2?1:-1)*Math.ceil(k/2)*0.4:0);ok=siteOK(os.x,os.z,r2);if(ok)rot=r2;}if(!ok)continue;
        const st=this.makeBrook(T,os.x,os.z,rot,H,wet);if(!st)continue;const F=frame(os.x,os.z,rot);if(!brookOK(F,st)){T.streams.pop();continue;}
        best={x:os.x,z:os.z,rot,st,up:F.L(st[0],st[1])[1]>0?1:-1,brook:'made'};}
      const yl=this.levelPlot(T,best.x,best.z,best.rot,20,15,9,flatMask,flatH),base=H(best.x,best.z),m={x:best.x,z:best.z,rot:best.rot,v,y:yl,up:best.up,brook:best.brook};this.sawmills.push(m);
      // the tailrace leaves the stone race at the yard's edge and runs on down the bank into the brook as a little stream of its own
      {const F=frame(best.x,best.z,best.rot),W=KIT.SAW.wheel,a0=F.P2(21.6,W[2]);let bp=null,bd=1e9;for(let i=0;i<best.st.length;i+=3){const d=Math.hypot(best.st[i]-a0[0],best.st[i+1]-a0[1]);if(d<bd){bd=d;bp=[best.st[i],best.st[i+1]];}}
        if(bp&&bd<20){const n=Math.max(3,Math.ceil(bd/3)),tr=new Float32Array((n+1)*3);for(let k=0;k<=n;k++){const u=k/n;tr[k*3]=a0[0]+(bp[0]-a0[0])*u;tr[k*3+1]=a0[1]+(bp[1]-a0[1])*u;tr[k*3+2]=0.012;}T.streams.push(tr);}}
      for(let j=Math.floor((best.z-28)/cs);j<=Math.ceil((best.z+28)/cs);j++)for(let i=Math.floor((best.x-28)/cs);i<=Math.ceil((best.x+28)/cs);i++){if(i<0||j<0||i>=N||j>=N)continue;const F=frame(best.x,best.z,best.rot),l=F.L((i+0.5)*cs,(j+0.5)*cs);if(l[0]<21&&Math.hypot(l[0],l[1])<26){flatMask[j*N+i]=1;flatH[j*N+i]=yl;}}
      clearZones.push([best.x,best.z,34]);const F=frame(best.x,best.z,best.rot),r0=F.P2(20,-13*best.up);const pts=this.routePath(r0,[v.x,v.z],{cs:7,margin:120,bridge:true,wind:0.3,maxG:0.3});if(pts)this.vRoads.push({p:pts.flat(),w:1.4,kind:1,ind:m});
      Log.info(`sawmill for ${v.name}: ${best.brook==='stream'?'beside a brook':best.brook==='rill'?'beside a rill made a brook':'with a brook of its own'} at ${best.x.toFixed(0)},${best.z.toFixed(0)}`);}
    T.stats.streams=T.streams.length;},
  // a brook of the mill's own: from higher ground on one side of the road side, past the wheel (x 28), then on downhill by steepest descent
  // until it reaches water, another stream or 500 m. Points every cell as [x, z, area km²].
  makeBrook(T,x,z,rot,H,wet){const c=Math.cos(rot),s=Math.sin(rot),P2=(lx,lz)=>[x+c*lx-s*lz,z+s*lx+c*lz],cs=T.cs,a=P2(28,-48),b=P2(28,48),up=H(a[0],a[1])>=H(b[0],b[1])?-1:1,pts=[];
    for(let lz=48;lz>=-48;lz-=cs*0.75){const p=P2(28,lz*up);pts.push([p[0],p[1]]);}
    let [px,pz]=pts[pts.length-1];for(let k=0;k<70;k++){if(wet(px,pz))break;let bx=px,bz=pz,bh=H(px,pz);for(let d=0;d<8;d++){const an=d*Math.PI/4,qx=px+Math.cos(an)*cs,qz=pz+Math.sin(an)*cs,h=H(qx,qz);if(h<bh-0.02){bh=h;bx=qx;bz=qz;}}
      if(bx===px&&bz===pz)break;const dx=bx-x,dz=bz-z;if(c*dx+s*dz<24&&Math.abs(-s*dx+c*dz)<50)break;px=bx;pz=bz;pts.push([px,pz]);}
    if(pts.length<10)return null;const out=new Float32Array(pts.length*3);pts.forEach((p,i)=>{out[i*3]=p[0];out[i*3+1]=p[1];out[i*3+2]=0.02+0.03*i/pts.length;});T.streams.push(out);return out;},
  // ---- the sawmill yard by day: a sawyer at the sawhorses, a man with a cant hook at the log deck, one stacking sawn boards, and two
  // carrying planks on their shoulders from the back door to the stacks and back (the plank is drawn between them). Positions in the
  // mill frame (see buildings/sawmill.js), turned with the mill.
  sawWork(m){const h=P.timeOfDay;if(h<7||h>18.5||!this.indOn('sawmill',m))return null;const t=App.time||0,c=Math.cos(m.rot),s=Math.sin(m.rot),y=m.y,W=(lx,lz)=>[m.x+c*lx-s*lz,m.z+s*lx+c*lz],R2=a=>m.rot+a,hs=(m.x*0.013)%1,out=[];
    const pin=(lx,lz,a,pose,k,kind)=>{const p=W(lx,lz);out.push({x:p[0],z:p[1],y:y-0.03,rot:R2(a),pose,anim:0,hash:(hs+k*0.17)%1,var:kind||'man'});};
    pin(-1.5,-9.45,Math.PI/2,4,0);pin(-10.5,-6.7,-Math.PI/2,2,1);pin(10.5,9.85,Math.PI/2,8,2);
    // the plank carriers: a loop from the back door (4.3, 6.2) to the stack (10.2, 9.6) and back, a pause at each end
    const A=[4.3,6.4],Bp=[8.9,8.9],L=Math.hypot(Bp[0]-A[0],Bp[1]-A[1]),T=L/1.1,cyc=2*T+6,u=((t+hs*40)%cyc);let f,carry,mv=1;
    if(u<3){f=0;carry=true;mv=0;}else if(u<3+T){f=(u-3)/T;carry=true;}else if(u<6+T){f=1;carry=false;mv=0;}else{f=1-(u-6-T)/T;carry=false;}
    const dx=(Bp[0]-A[0])/L,dz=(Bp[1]-A[1])/L,head=Math.atan2(dz,dx)+(carry?0:Math.PI),mid=[A[0]+(Bp[0]-A[0])*f,A[1]+(Bp[1]-A[1])*f];
    for(const e of [-1,1]){const lx=mid[0]+dx*e*1.35,lz=mid[1]+dz*e*1.35,p=W(lx,lz);out.push({x:p[0],z:p[1],y:y-0.03,rot:R2(head),pose:0,anim:mv?6.4:0,hash:(hs+0.5+e*0.11)%1,var:'man'});}
    let plank=null;if(carry){const p=W(mid[0],mid[1]);plank=[p[0],y+1.58,p[1],1,R2(Math.atan2(dz,dx)),0.5,0.5,0];}
    return{people:out,plank};},
  // ---- the grand station's porter. In autumn leaves blow onto the platforms and build up; when there are enough the porter comes out of
  // the front door with a broom, sweeps each drift onto a pile (two piles per platform), bags the piles, and carries the sacks inside one
  // by one, crossing the footbridge for the other platforms. Out of autumn there is a short sweep along the building platform each morning.
  careZone(si,k){const G=KIT.TWIN_G;return k===0?[2.0,5.3]:k===1?[-5.3,-2.0]:[-(G+5.3),-(G+2.0)];},
  leafDrop(si,c,ks){if(c.leaves.length>=42){const q=c.leaves[Math.floor(Math.random()*c.leaves.length)];q.a=Math.min(1,q.a+0.15);return;}
    const k=ks[Math.floor(Math.random()*ks.length)],L=(((k===2&&si.twin)?si.twin.st.len:si.st.len)||44)/2-3,zn=this.careZone(si,k),mx=(Math.random()*2-1)*L,mz=zn[0]+Math.random()*(zn[1]-zn[0]);
    const near=c.leaves.find(q=>q.k===k&&Math.hypot(q.mx-mx,q.mz-mz)<1.4);if(near){near.a=Math.min(1,near.a+0.18);return;}const w=this.stW(si,mx,mz);
    c.leaves.push({x:w[0],z:w[1],y:si.y+1.0,a:0.22,r:Math.random()*6.28,h:Math.random(),k,mx,mz});},
  pileAt(si,c,k,mx){const zn=this.careZone(si,k),pmx=k===0?(mx<-2?-8.6:3.0):(mx<0.5?-8.6:9.0),mz=k===0?3.2:(zn[0]+zn[1])/2;/* clear of columns, benches, carts, the shelter and the stairs */let p=c.piles.find(q=>q.k===k&&q.mx===pmx);
    if(!p){const w=this.stW(si,pmx,mz);p={x:w[0],z:w[1],y:si.y+1.0,a:0,r:Math.random()*6.28,k,mx:pmx,mz};c.piles.push(p);}return p;},
  updateStationCare(dt){const C=this.stClean,h=P.timeOfDay,au=Weather.seasonW[2],E=Weather.eff(),f=R.focus||[0,0,0],live=new Set();
    for(const si of this.stInfo||[]){if(si.cargo||si.parent||!this.stTown(si)||Math.hypot(si.x-f[0],si.z-f[2])>900)continue;live.add(si.st.id);
      let c=C.get(si.st.id);if(!c){c={leaves:[],piles:[],bags:[],sw:null,acc:0,rest:20,mdone:false};C.set(si.st.id,c);}c.si=si;const ks=si.twin?[0,1,2]:[0,1];
      if(au>0.3&&P.leaves>0){c.acc+=dt*au*P.leaves*(0.6+E.wind*0.8)/40;while(c.acc>=1){c.acc-=1;this.leafDrop(si,c,ks);}}
      else for(const q of c.leaves)q.a-=dt*0.003;c.leaves=c.leaves.filter(q=>q.a>0.02);
      if(h<6)c.mdone=false;c.rest-=dt;
      const total=c.leaves.reduce((a,q)=>a+q.a,0);
      if(!c.sw&&c.rest<=0&&h>7&&h<19&&(total>3.5||c.piles.some(q=>q.a>0.05)||c.bags.length||(au<=0.3&&h>7.5&&h<9.5&&!c.mdone))){
        const dx=this.stDoorX(si),d=this.stW(si,dx,4.4);c.sw={x:d[0],z:d[1],y:si.y+0.85,rot:Math.atan2(-si.nz,-si.nx),mv:0,pose:0,hidden:false,plat:0,path:[],act:null,t:0,bag:false,hash:(si.st.id*0.29)%1,morning:au<=0.3&&total<3.5,swept:0};
        if(c.sw.morning)c.mdone=true;}
      if(c.sw)this.porter(si,c,dt);}
    for(const k of [...C.keys()])if(!live.has(k))C.delete(k);},
  // the porter's next job once the last one is done
  porterPlan(si,c,w){const py=si.y+0.85,W=(mx,mz)=>{const p=this.stW(si,mx,mz);return[p[0],p[1],py];},go=(k,pt)=>{w.path=[...this.fbPathTo(si,w.plat,k),pt];w.plat=k;},dx=this.stDoorX(si);
    if(w.bag){go(0,W(dx,4.4));w.path.push([...W(dx,6.6),'in']);w.act='drop';return;}
    if(!w.morning){let best=null,bd=1e9;for(const q of c.leaves){if(q.a<0.05)continue;const d=(q.k===w.plat?0:60)+Math.hypot(q.x-w.x,q.z-w.z);if(d<bd){bd=d;best=q;}}
      if(best){go(best.k,W(best.mx,best.mz));w.act='sweep';w.tgt=best;return;}
      const pl=c.piles.find(q=>q.a>0.05);if(pl){go(pl.k,W(pl.mx+0.6,pl.mz));w.act='bag';w.tgt=pl;return;}
      const bg=c.bags[0];if(bg){go(bg.k,W(bg.mx+0.5,bg.mz));w.act='pick';w.tgt=bg;return;}}
    else if(w.swept<3){const mx=[-9,-1,7][w.swept];go(0,W(mx,3.0+Math.random()*1.6));w.act='brush';return;}
    go(0,W(dx,4.4));w.path.push([...W(dx,6.6),'in']);w.act='home';},
  porter(si,c,dt){const w=c.sw;if(w.t>0){w.t-=dt;w.mv=0;if(w.t<=0)this.porterDone(si,c,w);return;}
    if(!w.path.length){if(w.act&&!w.arrived){w.arrived=true;w.mv=0;
        if(w.act==='sweep'){w.pose=4;w.t=2.6;}else if(w.act==='brush'){w.pose=4;w.t=4;}else if(w.act==='bag'){w.pose=1;w.t=3.2;}else if(w.act==='pick'){w.pose=1;w.t=1.1;}else if(w.act==='drop'||w.act==='home'){w.hidden=true;w.t=w.act==='drop'?2.2:0.5;}return;}
      w.arrived=false;w.act=null;w.pose=0;this.porterPlan(si,c,w);return;}
    const q=w.path[0],dx=q[0]-w.x,dz=q[1]-w.z,d=Math.hypot(dx,dz),sp=1.25*dt;w.mv=1;w.pose=0;if(d>0.01)w.rot=Math.atan2(dz,dx);
    if(d<=sp){w.x=q[0];w.z=q[1];w.y=q[2];w.path.shift();if(q[3]==='in')w.hidden=true;}else{w.x+=dx/d*sp;w.z+=dz/d*sp;w.y+=(q[2]-w.y)*Math.min(1,sp/d);}},
  porterDone(si,c,w){const a=w.act;w.pose=0;
    if(a==='sweep'){const q=w.tgt,pl=this.pileAt(si,c,q.k,q.mx);pl.a+=q.a;q.a=0;c.leaves=c.leaves.filter(o=>o!==q);// swept along onto the pile
      // walk the broom to the pile and back is folded into the next job; the drift is gone, the pile has grown
    }else if(a==='bag'){const p=w.tgt;c.piles=c.piles.filter(o=>o!==p);const n=Math.max(1,Math.round(p.a/1.6));for(let k=0;k<n;k++)c.bags.push({x:p.x+k*0.55*Math.cos(p.r),z:p.z+k*0.55*Math.sin(p.r),y:p.y,r:p.r+k,k:p.k,mx:p.mx+k*0.55,mz:p.mz});}
    else if(a==='pick'){c.bags=c.bags.filter(o=>o!==w.tgt);w.bag=true;}
    else if(a==='drop'){w.bag=false;w.hidden=false;const p=this.stW(si,this.stDoorX(si),4.4);w.x=p[0];w.z=p[1];}// the sack stays inside
    else if(a==='brush'){w.swept++;}
    else if(a==='home'){c.sw=null;c.rest=60+Math.random()*60;return;}
    w.act=null;w.arrived=false;},
  condReady(tr){return!tr.cond||tr.cond.state==='aboard';},
  condGo(tr,noFlag){const c=tr.cond;if(!c||c.state!=='out'||c.path.length)return;c.state=noFlag?'board':'flag';c.t=0;if(noFlag)c.path=[c.door[0],c.door[1],c.door[2]];},
  updateCrew(dt){for(const tr of Trains.list){const c=tr.cond;if(!c)continue;if(c.state==='aboard')continue;
      if(Math.abs(tr.v||0)>0.4&&!(tr.plat&&tr.plat.moving)){c.state='aboard';continue;}// the train has gone: the conductor is on it
      if(c.state==='flag'){c.t+=dt;c.pose=9;if(c.t>0.2&&!c.blew){c.blew=true;Sfx.guard&&Sfx.guard(c.x,c.y,c.z);}if(c.t>2.6){c.state='board';c.pose=0;c.path=[c.door[0],c.door[1],c.door[2]];}continue;}
      if(c.path.length){const q=c.path[0],dx=q[0]-c.x,dz=q[1]-c.z,d=Math.hypot(dx,dz),sp=1.5*dt;c.mv=1;if(d>0.01)c.rot=Math.atan2(dz,dx);
        if(d<=sp){c.x=q[0];c.z=q[1];c.y=q[2]!=null?q[2]:c.si.y+0.85;c.path.shift();}else{c.x+=dx/d*sp;c.z+=dz/d*sp;const y1=q[2]!=null?q[2]:c.si.y+0.85;c.y+=(y1-c.y)*Math.min(1,sp/d);}
        if(!c.path.length){c.mv=0;if(c.state==='board')c.state='aboard';else c.rot=Math.atan2(-c.si.nz,-c.si.nx)+(((tr.id*7)%2)?0.9:-0.9);}}else c.mv=0;}},
  // coaches standing beside the platform (whole coach within it, 1 m grace), as indices into tr.veh
  platCoaches(tr,si){const half=(si.st.len||44)/2,out=[];tr.veh.forEach((v,i)=>{const p=tr.poses[i];if(!p||v.k!=='coach')return;const a=(p.c[0]-si.x)*si.dx+(p.c[2]-si.z)*si.dz;if(Math.abs(a)+6.6<=half+1)out.push(i);});
    if(!out.length)tr.veh.forEach((v,i)=>{const p=tr.poses[i];if(!p||v.k!=='coach')return;const a=(p.c[0]-si.x)*si.dx+(p.c[2]-si.z)*si.dz;if(Math.abs(a)<=half)out.push(i);});return out;},
  // a train arrives: who leaves is decided now (each passenger rides in a coach, p.ci); then the coaches beside the platform are worked
  // (stopPhase). A train longer than the platform is moved up afterwards (Drive) and the next coaches are worked, until all are done.
  stop(tr,si){if(tr.veh.some(q=>q.k==='wagon'))Goods.trainStop(tr,si);if(si.cargo)return;const psi=si.parent||si,fam=new Set([psi.st.id,psi.twin?psi.twin.st.id:-1]);
    const ci=[];tr.veh.forEach((v,i)=>{if(v.k==='coach')ci.push(i);});if(!ci.length)return;
    for(const p of tr.pax){if(p.ci==null||tr.veh[p.ci]?.k!=='coach')p.ci=ci[Math.floor(Math.random()*ci.length)];p.off=fam.has(p.dest)||(!p.dest&&Math.random()<0.35)||Math.random()<0.12;}
    const now=this.platCoaches(tr,si);tr.plat={id:si.st.id,si,all:ci.slice(),served:new Set(),short:now.length<ci.length,len:si.st.len||44,trainL:Trains.length(tr.veh),moves:0,moving:false};
    if(tr.plat.short)Log.info(`${tr.name} at ${si.st.name}: platform ${tr.plat.len} m, train ${tr.plat.trainL.toFixed(0)} m, ${ci.length-now.length} of ${ci.length} coaches off the platform`);
    this.stopPhase(tr,si,now);this.condOut(tr,si,now);},
  stopPhase(tr,si,cs){const psi=si.parent||si,fam=new Set([psi.st.id,psi.twin?psi.twin.st.id:-1]),others=this.stInfo.filter(s=>!fam.has(s.st.id)&&!s.parent&&!s.cargo);const pl=tr.plat;
    const fresh=cs.filter(i=>!pl.served.has(i));for(const i of fresh)pl.served.add(i);if(!fresh.length)return;
    // doors open on both sides where there is a platform on both sides (the grand station): people get out on either and cross the
    // footbridge to the building platform; people board from the side the footbridge brings them to
    const PL=this.platsOf(si),door=(i,k)=>this.doorSide(tr.poses[i],si,k,Math.random()<0.5?-1:1),budget=Math.max(8,P.dwell-5);
    let off=0,inc=0;const stay=[];for(const p of tr.pax){if(p.off&&fresh.includes(p.ci)){if(Money.on())inc+=Money.fare(p,si);const k=PL[Math.floor(Math.random()*PL.length)],dp=door(p.ci,k),d=dp[2];const w={x:d[0],z:d[1],y:d[2],bp:[dp[1],dp[0],...this.fbPathTo(psi,k,0),...this.stOut(psi)],spd:2.4,tx:psi.px,tz:psi.pz,rot:0,v:psi.v,hash:Math.random(),state:'leave',wait:Math.min(off*0.22,budget*0.35),mv:0,st:psi,icon:'-'};
        off++;if(psi.v){const h=this.homeIn(psi.v);w.tx=h?h.front[0]:psi.v.x;w.tz=h?h.front[1]:psi.v.z;
          if(this.stFar(psi,w.tx,w.tz)){// home is on the far side: over to the farthest platform and down its end ramp
            const fp=this.farPlat(psi),rp=this.farRamp(psi).reverse();w.bp=[dp[1],dp[0],...this.fbPathTo(psi,k,fp),...rp];
            const st0=w.bp[w.bp.length-1],pth=this.vpath(psi.v,[st0[0],st0[1]],[w.tx,w.tz]);if(pth&&pth.length>1)w.wp=pth;}
          else if(psi.road)w.wp=psi.road.slice();else{const fc=this.stW(psi,this.stDoorX(psi),this.stBack(psi)+3.2),pth=this.vpath(psi.v,fc,[w.tx,w.tz]);if(pth&&pth.length>1)w.wp=pth;}}else{const o=this.stW(psi,this.stDoorX(psi)+(Math.random()-0.5)*20,this.stBack(psi)+25);w.tx=o[0];w.tz=o[1];}this.walkers.push(w);}else stay.push(p);}
    if(inc>0)Money.earn(Math.round(inc),`${tr.name} → ${si.st.name}`,si.x,si.y,si.z);tr.pax=stay;
    // seats free in the coaches at the platform
    const free=new Map(fresh.map(i=>[i,SEATS-tr.pax.filter(p=>p.ci===i).length]));let board=0;const pick=()=>{let b=-1,bv=0;for(const [i,n] of free)if(n>bv){bv=n;b=i;}return b;};
    for(const w of this.walkers){if(!(w.st&&w.st.st.id===psi.st.id&&(w.state==='wait'||(w.state==='toStation'&&w.inDone&&!w.bp))))continue;const c=pick();if(c<0)break;free.set(c,free.get(c)-1);
      const k=si.parent?PL[Math.floor(Math.random()*PL.length)]:0,dp=door(c,k);w.state='board';w.ci=c;w.pk=k;w.bp=[...this.fbPathTo(psi,0,k),...dp];w.bst=si;w.tx=dp[2][0];w.tz=dp[2][1];w.train=tr;w.wait=1+Math.min(board*0.15,budget*0.3);board++;
      {let L=Math.hypot(w.bp[0][0]-w.x,w.bp[0][1]-w.z);for(let i=1;i<w.bp.length;i++)L+=Math.hypot(w.bp[i][0]-w.bp[i-1][0],w.bp[i][1]-w.bp[i-1][1],((w.bp[i][2]||0)-(w.bp[i-1][2]||0))*(w.bp[i][2]!=null&&w.bp[i-1][2]!=null?1:0));w.spd=clamp(L/Math.max(2,budget+(si.parent?18:0)-w.wait),1.4,3.2);}
      w.dest=others.length?others[Math.floor(Math.random()*others.length)].st.id:null;}
    if(psi.v&&(off||board)){const gp0=psi.v.gp||0;psi.v.trans=(psi.v.trans||0)+off+board;Life.addGrowth(psi.v,(off+board)*0.5);TripFX.show(si,inc,(off+board)*0.5,psi.v,gp0);}else if(inc>0)TripFX.show(si,inc,0,null,0);
    if(off||board)Log.info(`${tr.name} at ${si.st.name}: ${off} off, ${board} on`+(pl.short?` (coaches ${pl.served.size}/${pl.all.length})`:''));
    if((board||off)&&!pl.moves)UI.toast(`${si.st.name}: ${off} getting off, ${board} getting on`);},
  // after the coaches at the platform are worked: how far to pull up so the next coaches stand at it (null when all are done)
  moveUpBy(tr){const pl=tr.plat;if(!pl||!pl.short||pl.served.size>=pl.all.length)return null;const si=pl.si,half=pl.len/2;
    // signed position along the platform in the direction the train moves (the head is ahead)
    const lead=(tr.rev||1)<0?tr.poses[tr.poses.length-1]:tr.poses[0],tail=(tr.rev||1)<0?tr.poses[0]:tr.poses[tr.poses.length-1],al=p=>(p.c[0]-si.x)*si.dx+(p.c[2]-si.z)*si.dz,sg=lead&&tail?Math.sign(al(lead)-al(tail))||1:1;
    let need=0,amax=-1e9;for(const i of pl.all){if(pl.served.has(i))continue;const p=tr.poses[i];if(!p)continue;const a=al(p)*sg;need=Math.max(need,-half+6.6-a);amax=Math.max(amax,a);}
    // far enough to bring the waiting coaches up, but the first of them must not run past the platform's far end
    return clamp(Math.min(need+0.6,half-6.6-amax),3,pl.len-6);},
  // ---------------- birds: flocks swooping over the land, gulls over the lakes
  updateBalloons(dt){const B=this.balloons||(this.balloons=[]),T=this.T,f=R.focus;if(!T||!f)return;const W=T.W,h=P.timeOfDay,E=Weather.eff(),ok=P.season==='summer'&&h>6.5&&h<19.5&&E.rain<0.15&&(E.snow||0)<0.05&&P.windStrength<1.6&&P.balloons>0;
    if(!ok){B.length=0;return;}this.bt=(this.bt||0)-dt;if(this.bt<=0){this.bt=40+Math.random()*80;if(B.length<Math.round(2*P.balloons)&&Math.random()<0.5){const a=Math.random()*6.283,r=500+Math.random()*900,x=clamp(f[0]+Math.cos(a)*r,80,W-80),z=clamp(f[2]+Math.sin(a)*r,80,W-80);
      B.push({x,z,alt:120+Math.random()*220,v:Math.floor(Math.random()*3),ph:Math.random()*6.28,rot:Math.random()*6.28,sp:1.6+Math.random()*1.8});}}
    const wa=P.windDir*Math.PI/180;for(const b of B){b.x+=Math.cos(wa)*b.sp*dt;b.z+=Math.sin(wa)*b.sp*dt;b.ph+=dt*0.12;b.rot+=dt*0.02;const g=R.sampleHr(T,b.x,b.z);if(b.yb===undefined){b.yb=g+b.alt;b.y=b.yb;}const ty=Math.max(g+80,b.yb+Math.sin(b.ph)*14);b.y+=(ty-b.y)*Math.min(1,dt*0.25);}
    this.balloons=B.filter(b=>b.x>40&&b.z>40&&b.x<W-40&&b.z<W-40&&Math.hypot(b.x-f[0],b.z-f[2])<3200);},
  updateFlocks(dt,A){const T=this.T,want=Math.round(4*P.birds),key=want+':'+(P.seed|0);
    if(this.flockKey!==key){this.flockKey=key;const rng=mulberry32((P.seed|0)+919);this.flocks=[];
      for(let f=0;f<want;f++){let x=200+rng()*(T.W-400),z=200+rng()*(T.W-400);const gull=this.lakeCells.length>0&&rng()<0.35;
        if(gull){const c=this.lakeCells[Math.floor(rng()*this.lakeCells.length)];x=(c%T.N+0.5)*T.cs;z=((c/T.N|0)+0.5)*T.cs;}
        const n=gull?5+Math.floor(rng()*5):9+Math.floor(rng()*14);const birds=[];for(let b=0;b<n;b++)birds.push({o:[(rng()-0.5)*16,(rng()-0.5)*5,(rng()-0.5)*16],ph:rng()*6.28,h:rng()});
        this.flocks.push({x,z,rx:120+rng()*240,rz:100+rng()*200,w:0.03+rng()*0.03,ph:rng()*6.28,alt:45+rng()*90,gull,birds,p:[x,0,z],v:[0,0,0]});}}
    const t=App.time;for(const f of this.flocks){const a=t*f.w+f.ph;const cx=f.x+Math.cos(a)*f.rx,cz=f.z+Math.sin(2*a)*f.rz*0.6;const g=R.sampleHr(T,clamp(cx,0,T.W),clamp(cz,0,T.W));
      const ty=Math.max(g,Weather.mistTop||0)+f.alt+Math.sin(a*3)*12;const np=[cx,f.p[1]?f.p[1]+(ty-f.p[1])*Math.min(1,dt*0.5):ty,cz];f.v=[(np[0]-f.p[0])/Math.max(dt,1e-3),0,(np[2]-f.p[2])/Math.max(dt,1e-3)];f.p=np;}},
  // ---------------- chimney smoke: more on cold days, in the morning and at night
  smoke(dt,A){if(!P.chimneySmoke||!P.smoke)return;const h=P.timeOfDay,cold=Weather.seasonW[3]+Weather.seasonW[2]*0.5+Weather.seasonW[0]*0.25,busy=(h<9||h>17?0.45:0)+cold*0.5+0.15;
    const F=Cam.pos;for(const ho of this.houses){if(!this.houseOn(ho)||ho.shop)continue;const def=R.houseDefs[ho.v];if(!def.chim||ho.hash>busy)continue;
      if(Math.abs(ho.x-F[0])>1100||Math.abs(ho.z-F[2])>1100)continue;if(Math.random()>dt*0.9*P.chimneySmoke)continue;
      const c=Math.cos(ho.rot),s=Math.sin(ho.rot),lx=def.chim[0],lz=def.chim[2];const x=ho.x+c*lx-s*lz,z=ho.z+s*lx+c*lz;
      Particles.spawn(x,ho.y+def.chim[1],z,(Math.random()-0.5)*0.3,1.0+Math.random()*0.6,(Math.random()-0.5)*0.3,6+Math.random()*4,0.7,4.2,2);}},
  // ---------------- instance buffers
  // detailed buildings: the level of detail follows the camera (re-picked when it has moved 4 m, or when houses changed)
  kitInst(B){this.kitInst0(B);this.armInst(B);},
  /* the grain arms turn and reach, so their instances are written every frame (a handful) */
  armInst(B){const L=[[],[],[],[]],cp=Cam.pos||[0,0,0],G=KIT.GRAIN;for(const fm of this.farms()){if(!fm||!fm.v.farmOwned)continue;const tw=this.farmTower(fm),d=Math.hypot(tw.x-cp[0],tw.z-cp[2]);if(d>2400)continue;
      const c=Math.cos(tw.rot),s=Math.sin(tw.rot),px=tw.x+c*G.pivot[0]-s*G.pivot[2],pz=tw.z+s*G.pivot[0]+c*G.pivot[2];let rot=tw.rot,sc=1;
      if(tw.si){const st=Crane.S.get('st:'+tw.st.id),gx=st&&st.ax!==undefined?st.ax:tw.a,si=tw.si,dx=si.x+si.dx*gx-px,dz=si.z+si.dz*gx-pz;rot=Math.atan2(dx,-dz);sc=Math.hypot(dx,dz)/G.reach;}
      L[d<140?0:d<320?1:d<700?2:3].push([px,tw.y-(sc-1)*G.pivot[1],pz,sc,rot,0.5,0.5,0]);}
    for(let l=0;l<4;l++){const a=B(L[l].length);L[l].forEach((r,i)=>a.set(r,i*8));R.inst('kit_grainArm_'+l,a,L[l].length);}},
  kitInst0(B){const cp=Cam.pos||[0,0,0],lp=this.kitCP;if(!this.uploaded)this.kitDirty=true;const ps0=innerHeight/(2*Math.tan((Cam.fovy||1)/2));if(!this.kitDirty&&lp&&Math.hypot(cp[0]-lp[0],cp[1]-lp[1],cp[2]-lp[2])<4&&Math.abs(ps0/(this.kitPS||ps0)-1)<0.03)return;this.kitPS=ps0;this.kitDirty=false;this.kitCP=[cp[0],cp[1],cp[2]];/* detail levels by SIZE ON SCREEN (a building's radius in pixels), not by one fixed distance: 0 whole detail >= 150 px, 0.5 no single roof
       tiles >= 93 px, 1 no small stones/grass >= 29 px, 2 big parts only; the pixel limits shrink with Quality > Building detail distance
       (x2 = twice the distance). A cottage keeps its old 110 m / 350 m switches; a culvert (radius counted as 8 m at least) switches near; every building
       larger than a cottage is counted as 16 m at most, so a 330 000-triangle station does not stay detailed out to 500 m (it measured heavier
       when the real radius was used) */
    const ls=clamp(+P.kitLod||1,0.1,3),PS=innerHeight/(2*Math.tan((Cam.fovy||1)/2)),LVL=(t,d)=>{const r=clamp((R.kitBound[t]||[0,14])[1],8,16),k=r*PS/Math.max(d,1)*ls;return k>=150?0:k>=93?1:k>=29?2:3;};
    const KB={};for(const t of KIT_TYPES)for(let l=0;l<4;l++)KB[t+l]=[];
    for(const h of this.houses){const def=R.houseDefs[h.v];if(!def.kit||h.shop||(h.bank&&h.village&&h.village.bankOwned)||!this.houseOn(h))continue;const d=Math.hypot(h.x-cp[0],h.y-cp[1],h.z-cp[2]);if(d>2400)continue;KB[def.kit+LVL(def.kit,d)].push(h);}
    for(const c of this.culverts||[]){const d=Math.hypot(c.x-cp[0],c.y-cp[1],c.z-cp[2]);if(d<1500)KB[(c.pipe?'culvertPipe':'culvert')+LVL(c.pipe?'culvertPipe':'culvert',d)].push({x:c.x,y:c.y,z:c.z,rot:c.rot,hash:0.5,sc:c.sc});}
    for(const fm of this.farms()){if(!fm||!fm.v.farmOwned)continue;if(Math.hypot(fm.x-cp[0],fm.z-cp[2])>2450)continue;const y=R.sampleHr(this.T,fm.x,fm.z),c=Math.cos(fm.rot),sn=Math.sin(fm.rot);
      for(const [t,k] of [['farmHouse','house'],['farmBarn','barn'],['farmShed','shed'],['farmYard','yard']]){const q=KIT.FARM[k],x=fm.x+c*q[0]-sn*q[1],z=fm.z+sn*q[0]+c*q[1],d=Math.hypot(x-cp[0],y-cp[1],z-cp[2]);if(d<2400)KB[t+LVL(t,d)].push({x,y,z,rot:fm.rot,hash:0.5});}
      const tw=this.farmTower(fm);KB['grainTower'+LVL('grainTower',Math.hypot(tw.x-cp[0],tw.z-cp[2]))].push({x:tw.x,y:tw.y,z:tw.z,rot:tw.rot,hash:0.5});}
    for(const m of this.sawmills||[]){if(!this.indOn('sawmill',m))continue;const d=Math.hypot(m.x-cp[0],m.y-cp[1],m.z-cp[2]);if(d>2400)continue;KB[((m.up||1)>0?'sawmillA':'sawmillB')+LVL('sawmillA',d)].push({x:m.x,y:m.y,z:m.z,rot:m.rot,hash:0.5});}
    // passenger stations: the Victorian building (the grand one with the clock tower once its town is fully grown) and the platform in 4.1 m pieces
    for(const si of this.stInfo||[]){if(si.cargo&&!si.st.farm)continue;const d=Math.hypot(si.x-cp[0],si.y-cp[1],si.z-cp[2]);if(d>2400)continue;const L=LVL('station',d),town=!!(si.v&&(si.v.level|0)>=this.LEVELS.length-1);
      const put=(t,o)=>{const dp=Math.hypot(o.x-cp[0],o.y-cp[1],o.z-cp[2]);if(dp<1800)KB[t+LVL(t,dp)].push(o);};
      // at a point along a station's track (d from its centre) on the side sf: position and the rotation of a piece facing that platform
      const at=(st,d,sf)=>{const a=advance({sid:st.sid,t:st.t,dir:1},d);if(a.blocked)return null;const i=posInfo(a.pos);if(!i)return null;const h=a.pos.dir>0?i.h:i.h+Math.PI;return{x:i.x,y:i.y,z:i.z,rot:h+(sf>0?Math.PI:0),hash:0.5};};
      const ramps=(st,sf)=>{for(const e of [-1,1]){const o=at(st,e*((st.len||44)/2+2.05),sf);if(o)put((sf>0?-1:1)===e?'platEa':'platEb',o);}};
      const pieces=(st,o)=>{for(const pc of stationPieces(st,o))put('plat'+pc.v,pc);};
      if(si.st.farm)continue;/* a farm's grain station has no platform: the tower's cobbled apron with its wall along the track is the loading place */
      const ps=si.parent||si,tp=this.stTown(ps),fb=KIT.FB[tp?'stationTown':'station'],stairs=tp?ST_SPAN.stairs.stationTown:null,shX=fb[0]-17;
      if(si.parent){// second track: its outer platform (with a shelter); the island platform between the tracks belongs to the first track
        const f=si.st._f||1,w=this.stW(ps,shX,-(KIT.TWIN_G+3.6)),o=at(si.st,alongD(si.st,w[0],w[1]),f);if(o)put('shelter',o);
        pieces(si.st,{sf:f,fr:ps,stairs,shelterX:shX});ramps(si.st,f);continue;}
      const f=si.st._f||1;
      KB[(town?'stationTown':'station')+L].push({x:si.x,y:si.y,z:si.z,rot:Math.atan2(si.dz,si.dx)+Math.PI,hash:(si.st.id*0.618)%1});
      pieces(si.st,{sf:f,fr:si,span:town?ST_SPAN.stationTown:ST_SPAN.station,stairs});ramps(si.st,f);
      if(town){// the grand station: the footbridge, and a platform across the line (an island platform once there is a second track)
        const lx=(fb[0]+fb[1])/2,o=at(si.st,f>0?-lx:lx,f);if(o)put(si.twin?'fbT2':'fbT1',o);
        const w=this.stW(si,shX,-3.6),os=si.twin?null:at(si.st,alongD(si.st,w[0],w[1]),-f);if(os)put('shelter',os);
        pieces(si.st,{sf:-f,fr:si,stairs,shelterX:si.twin?null:shX,island:!!si.twin});ramps(si.st,-f);}}
    /* fading between levels: an instance whose size on screen lies within a band around a switch point is drawn by both levels
       (buckets kit_<t>_<l>f, the dithering shader), the finer one taking the share u of the pixels and the coarser one the rest */
    {const TH=[150,93,29],BD=1.22,lb=Math.log(BD);for(const t of KIT_TYPES){if(t==='grainArm')continue;const r=clamp((R.kitBound[t]||[0,14])[1],8,16);for(let l=0;l<4;l++){KB[t+l+'f']=KB[t+l+'f']||[];}
      for(let l=0;l<4;l++){const L=KB[t+l],keep=[];for(const h of L){const k=r*PS/Math.max(Math.hypot(h.x-cp[0],h.y-cp[1],h.z-cp[2]),1)*ls;let done=false;
          for(let i=0;i<3&&!done;i++){const T=TH[i];if(k>T/BD&&k<T*BD){const u=clamp((Math.log(k/T)/lb+1)/2,0.02,0.98);KB[t+i+'f'].push({...h,fw:1+u});KB[t+(i+1)+'f'].push({...h,fw:-(1+u)});done=true;}}
          if(!done)keep.push(h);}KB[t+l]=keep;}}}
    for(const t of KIT_TYPES)if(t!=='grainArm')for(let l=0;l<4;l++)for(const fd of ['','f']){const L=KB[t+l+fd]||[],a=B(L.length);if(L.length>1){for(const h of L)h._kd=(h.x-cp[0])*(h.x-cp[0])+(h.z-cp[2])*(h.z-cp[2]);L.sort((p,q)=>p._kd-q._kd);}L.forEach((h,i)=>a.set([h.x,h.y,h.z,h.sc||1,h.rot,0.5,h.hash,h.fw||0],i*8));R.inst('kit_'+t+'_'+l+fd,a,L.length);}},
  prepare(cam,A){if(!this.T)return;const B=(n)=>new Float32Array(Math.max(1,n)*8);this.kitInst(B);
    if(!this.uploaded){this.uploaded=true;
      for(let v=0;v<R.houseDefs.length;v++){if(R.houseDefs[v].kit){R.inst('house'+v,B(0),0);continue;}const L=this.houses.filter(h=>h.v===v&&!h.shop&&!(h.bank&&h.village&&h.village.bankOwned)&&this.houseOn(h)),a=B(L.length);L.forEach((h,i)=>a.set([h.x,h.y,h.z,1,h.rot,0.5,h.hash,0],i*8));R.inst('house'+v,a,L.length);}
      const M=this.mills.filter(m=>!m.gone),mb=B(M.length);M.forEach((m,i)=>mb.set([m.x,m.y,m.z,1,m.rot,0.5,m.hash,0],i*8));R.inst('millBody',mb,M.length);
      const Lm=this.lamps.filter(l=>!l.gone&&!(l.vil&&(l.lvl|0)>(l.vil.level|0))),lb=B(Lm.length);Lm.forEach((l,i)=>lb.set([l.x,l.y,l.z,1,0,0.5,l.hash,0],i*8));R.inst('lamps',lb,Lm.length);
      {const SH={bakery:[],restaurant:[]};for(const h of this.houses)if(h.shop&&this.houseOn(h))SH[h.shop].push(h);for(const k in SH){const L=SH[k],b=B(L.length);L.forEach((h,i)=>b.set([h.x,h.y,h.z,1,h.rot,0.5,h.hash,0],i*8));R.inst(k==='bakery'?'bakeries':'restaurants',b,L.length);}
        {const BK=this.houses.filter(h=>h.bank&&h.village&&h.village.bankOwned&&this.houseOn(h)),bb=B(BK.length);BK.forEach((h,i)=>bb.set([h.x,h.y,h.z,1,h.rot,0.5,h.hash,0],i*8));R.inst('banks',bb,BK.length);}
        const MS=[];this.marketPeople=this.farmFolk();for(const v of this.villages){const lv=v.level|0;if(lv<1||!v.plaza)continue;const pr=v.plaza[2]-3.2,base=v.dir||0,angs=lv>=2?[0.32,0.6,0.95,1.23]:[0.78];
          for(let q=0;q<4;q++)for(const a0 of angs){const a=base+q*Math.PI/2+a0,x=v.x+Math.cos(a)*pr,z=v.z+Math.sin(a)*pr,y=R.sampleHr(this.T,x,z),rot=a+Math.PI,hh=((q*7+a0*13)%1+1)%1;if(this.stReserve(x,z,3))continue;MS.push([x,y,z,1,rot,0.5,hh,0]);
            if(P.timeOfDay>7&&P.timeOfDay<19){const bx=x+Math.cos(a)*1.4,bz=z+Math.sin(a)*1.4;this.marketPeople.push({x:bx,z:bz,y:R.sampleHr(this.T,bx,bz)-0.05,rot:rot,hash:hh,k:'stand'});if(hh>0.4){const fx=x-Math.cos(a)*1.6,fz=z-Math.sin(a)*1.6;this.marketPeople.push({x:fx,z:fz,y:R.sampleHr(this.T,fx,fz)-0.05,rot:a,hash:(hh*3.7)%1,k:'stand'});}}}}
        const mb=B(MS.length);MS.forEach((r,i)=>mb.set(r,i*8));R.inst('stalls',mb,MS.length);}

      {const SW=(this.sawmills||[]).filter(m=>this.indOn('sawmill',m)),sb3=B(SW.length);R.inst('sawmills',sb3,0);const WK=this.workshops||[],wb3=B(WK.length);WK.forEach((m,i)=>wb3.set([m.x,m.y,m.z,1,m.rot,0.5,0.5,0],i*8));R.inst('workshops',wb3,WK.length);
        for(const k of ['gold','silver','diamond']){const L=(this.mines||[]).filter(m=>m.type===k&&this.indOn('mine',m)),b=B(L.length);L.forEach((m,i)=>b.set([m.x,m.y,m.z,1,m.rot,0.5,0.5,0],i*8));R.inst('mines_'+k,b,L.length);}}
      for(const [kind,key] of [['neu','castle'],['hoh','castle2']]){const L=this.castleList().filter(c=>(c.kind||'neu')===kind),cb=B(L.length);L.forEach((C,i)=>cb.set([C.x,C.y,C.z,1,C.rot,0.5,0.4,0],i*8));R.inst(key,cb,L.length);}
      {const FM=[]/* the old barn, shed and silos made way for the farmstead (kitInst) */,bb=B(FM.length),sb=B(FM.length),ss=B(FM.length);FM.forEach((f,i)=>{const y=R.sampleHr(this.T,f.barn[0],f.barn[1]);bb.set([f.barn[0],y,f.barn[1],1,f.rot,0.5,0.3,0],i*8);sb.set([f.shed[0],R.sampleHr(this.T,f.shed[0],f.shed[1]),f.shed[1],1,f.rot,0.5,0.3,0],i*8);ss.set([f.silo[0],R.sampleHr(this.T,f.silo[0],f.silo[1]),f.silo[1],1,f.rot,0.5,0.3,0],i*8);});R.inst('barns',bb,FM.length);R.inst('sheds',sb,FM.length);R.inst('silos',ss,FM.length);}
      {const SB=[[],[],[]];this.sitePeople=[];for(const h of this.building||[]){if(h.gone||!this.plotOn(h))continue;const st=Math.min(2,Math.floor(h.prog*3)),sc=h.v===2?1.25:1,c=Math.cos(h.rot),s=Math.sin(h.rot);SB[st].push([h.x,h.y,h.z,sc,h.rot,0.5,h.hash,0]);
          for(const [lx,lz,ry] of [[-3.2,-4.7,0],[2.6,-4.5,0.5],[6.4,1.2,2.4]].slice(0,h.hash>0.5?3:2)){const x=h.x+(c*lx-s*lz)*sc,z=h.z+(s*lx+c*lz)*sc;this.sitePeople.push({x,z,y:h.y-0.05,rot:h.rot+Math.PI/2+ry,hash:(h.hash*7.3+lx*0.13+1)%1,pose:8,var:'man'});}}
        SB.forEach((L,k)=>{const b=B(L.length);L.forEach((r,i)=>b.set(r,i*8));R.inst('sites'+k,b,L.length);});
        }
      R.buildLampMap(this.T,Lm);const Fn=(this.fences||[]).filter(q=>!q.gone&&this.farmOn(q.f)),fb=B(Fn.length);Fn.forEach((q,i)=>fb.set([q.x,q.y,q.z,q.sc,q.rot,clamp(0.5+q.pitch/2,0,1),0.5,0],i*8));R.inst('fences',fb,Fn.length);}
    // mills (caps turn), sails
    const M=this.mills.filter(m=>!m.gone),mb=B(M.length),sb=B(M.length),hub=R.millHub;
    M.forEach((m,i)=>{mb.set([m.x,m.y,m.z,1,m.rot,0.5,m.hash,0],i*8);const c=Math.cos(m.rot),s=Math.sin(m.rot);sb.set([m.x+c*hub[0],m.y+hub[1],m.z+s*hub[0],1,m.rot,0.5,(m.ang/6.2832)%1,0],i*8);});
    R.inst('millBody',mb,M.length);R.inst('sails',sb,M.length);
    const T=this.T,Hr=(x,z)=>R.sampleHr(T,x,z);
    const near=(x,z,d)=>Math.abs(x-cam.pos[0])<d&&Math.abs(z-cam.pos[2])<d;
      {// fallen leaves on the grand stations' platforms, swept piles, sacks (one carried by the porter)
        const LP=[],PL=[],BG=[];for(const c of this.stClean.values()){for(const q of c.leaves)if(near(q.x,q.z,500))LP.push([q.x,q.y,q.z,0.45+0.75*q.a,q.r,0.5,q.h,0]);for(const q of c.piles)if(q.a>0.05&&near(q.x,q.z,500))PL.push([q.x,q.y,q.z,0.55+0.65*Math.min(1.6,q.a)/1.6,q.r,0.5,0.5,0]);
          for(const q of c.bags)if(near(q.x,q.z,500))BG.push([q.x,q.y,q.z,1,q.r,0.5,0.5,0]);const w=c.sw;if(w&&w.bag&&!w.hidden){const r=w.rot;BG.push([w.x-Math.sin(r)*0.34+Math.cos(r)*0.12,w.y+0.32,w.z+Math.cos(r)*0.34+Math.sin(r)*0.12,0.9,r,0.5,0.5,0]);}}
        const l1=B(LP.length);LP.forEach((r,i)=>l1.set(r,i*8));R.inst('leafp',l1,LP.length);const l2=B(PL.length);PL.forEach((r,i)=>l2.set(r,i*8));R.inst('leafpl',l2,PL.length);const l3=B(BG.length);BG.forEach((r,i)=>l3.set(r,i*8));R.inst('leafbg',l3,BG.length);}
    {const PD=80*clamp(+P.peopleLod||1,0.2,3);/* metres to the simple far figure: Quality > People detail distance */const PB={far:[]};for(const k of PEOPLE)PB[k]=[];const put=(x,y,z,rot,hash,vr,pose,anim,sc)=>{const d=Math.hypot(x-cam.pos[0],y-cam.pos[1],z-cam.pos[2]);(d<PD?PB[vr]||PB.man:PB.far).push([x,y,z,sc||1,rot,(pose||0)/10+0.02,hash,anim||0]);};
      const W=this.walkers.filter(w=>near(w.x,w.z,900)&&!w.hidden),S=this.sledP.filter(q=>q.st==='up'&&near(q.x,q.z,700)).concat((this.beachStand||[]).concat(this.busWait||[],this.marketPeople||[],this.sitePeople||[]).map(q=>({...q,sx:q.x,sz:q.z,sy:-999,pitch:0}))),a=null;W.forEach((w,i)=>{let y=Math.max(Hr(w.x,w.z)-0.05,this.deckY(w.x,w.z));const si=w.st;if(w.y!=null)y=w.y;else if(si){const rx=w.x-si.x,rz=w.z-si.z,al=rx*si.dx+rz*si.dz,la=rx*si.nx+rz*si.nz;if(Math.abs(al)<(si.half||22)+0.5&&la>1.2&&la<5.9)y=Math.max(y,si.y+0.85);}
        if(!w.hidden)put(w.x,y,w.z,w.rot,w.hash,w.var||this.pvar(w.hash),0,w.mv?(w.state==='board'||w.state==='leave'?7.5:6.4):0,w.sc);});
      S.forEach(q=>put(q.x,q.y,q.z,q.rot,q.hash,q.var||this.pvar(q.hash),q.pose!=null?q.pose:q.k==='stand'?5:0,q.st==='up'?5:0,q.sc));
      for(const q of this.villagers||[])if(near(q.x,q.z,900))put(q.x,q.y,q.z,q.rot,q.hash,q.var,q.pose,q.anim,q.sc);
      // train crews: the driver at the right of the cab and the fireman at the left (not drawn from the cab view itself), the conductor when out
      for(const tr of Trains.list){if(!tr.poses||!tr.poses[0]||tr.veh[0].k!=='loco')continue;const L0=tr.poses[0];if(!near(L0.c[0],L0.c[2],400))continue;
        if(!(Cam.mode==='cab'&&Trains.cur()===tr)){const X=L0.X,rot=Math.atan2(X[2],X[0]);const LS=locoSpec(tr);for(const [lz,lx,hs] of LS.crew){const pt=locoPoint(tr,lx,LS.crewY,lz);if(pt)put(pt[0],pt[1],pt[2],rot+(lz<0?0.5:-0.2),(tr.id*0.13+hs)%1,'drv',0,0,1);}}
        const c=tr.cond;if(c&&c.state!=='aboard'&&near(c.x,c.z,400))put(c.x,c.y,c.z,c.rot,c.hash,'cond',c.pose||0,c.mv?6.4:0,1);}
      for(const c of this.stClean.values()){const w=c.sw;if(w&&!w.hidden&&near(w.x,w.z,400))put(w.x,w.y,w.z,w.rot,w.hash,'sweep',w.pose,w.mv?6.4:0,1);}
      {const SWL=[],PKL=[];for(const m of this.sawmills||[]){if(!this.indOn('sawmill',m)||!near(m.x,m.z,1600))continue;const c=Math.cos(m.rot),s=Math.sin(m.rot),S=KIT.SAW.wheel;
          SWL.push([m.x+c*S[0]-s*S[2],m.y+S[1],m.z+s*S[0]+c*S[2],1,m.rot,0.5,(m.x*0.0071)%1,-0.55*(m.up||1)]);
          if(near(m.x,m.z,450)){const wk=this.sawWork(m);if(wk){for(const q of wk.people)put(q.x,q.y,q.z,q.rot,q.hash,q.var,q.pose,q.anim,1);if(wk.plank)PKL.push(wk.plank);}}}
        const b1=B(SWL.length);SWL.forEach((r,i)=>b1.set(r,i*8));R.inst('sawwheels',b1,SWL.length);const b2=B(PKL.length);PKL.forEach((r,i)=>b2.set(r,i*8));R.inst('planks',b2,PKL.length);}
      for(const k in PB){const L=PB[k],b=B(L.length);L.forEach((r,i)=>b.set(r,i*8));R.inst('pp_'+k,b,L.length);}
      const SL=this.sledP.filter(q=>q.st!=='up'&&near(q.x,q.z,700)),sl=B(SL.length);SL.forEach((q,i)=>sl.set([q.x,q.y+0.05,q.z,1.2,q.rot,clamp(0.5+q.pitch/2,0,1),q.hash,0],i*8));R.inst('sledders',sl,SL.length);
      const SU=S,su=B(SU.length);SU.forEach((q,i)=>{const ph=Math.atan2(q.z-q.sz,q.x-q.sx);su.set([q.sx,q.sy+0.03,q.sz,1.2,ph,clamp(0.5+q.pitch/2,0,1),q.hash,0],i*8);});R.inst('sleds',su,SU.length);
      const Mm={skater:[],speedskater:[]};for(const g of this.sk.groups)if(near(g.x,g.z,900))for(const m of g.mem)Mm[m.mesh].push(m);
      for(const k in Mm){const L2=Mm[k],b2=B(L2.length);L2.forEach((m,i)=>b2.set([m.x,m.y,m.z,1.2*m.sc,m.rot,m.tint,m.hash,m.mv],i*8));R.inst(k+'s',b2,L2.length);}
      {const SL=(this.steamers||[]).filter(q=>!q.off&&near(q.x,q.z,2500)),sb=B(SL.length),wb=B(SL.length);SL.forEach((q,i)=>{sb.set([q.x,q.lvl+0.05,q.z,1,q.rot,0.5,q.hash,0],i*8);wb.set([q.x-Math.cos(q.rot)*16.6,q.lvl+2.45,q.z-Math.sin(q.rot)*16.6,1,q.rot,-((q.wa||0)%(Math.PI/6))/1.45,0.5,0],i*8);});R.inst('steamers',sb,SL.length);R.inst('sternwheels',wb,SL.length);
        const DW=[];if(P.timeOfDay>8&&P.timeOfDay<20&&P.season!=='winter')for(const d of this.docks||[]){if(!(d.v&&d.v.docksOwned)||!near(d.px,d.pz,700))continue;const n=2+Math.floor((d.L*7.3)%3);for(let k=0;k<n;k++){const u=d.L-3-k*1.6,x=d.sx+d.nx*u-d.nz*(k%2?0.6:-0.5),z=d.sz+d.nz*u+d.nx*(k%2?0.6:-0.5);DW.push({x,z,y:d.lvl+0.92,rot:Math.atan2(d.nz,d.nx),hash:(k*0.137+d.L*0.01)%1,k:'stand'});}}
        const BP=(this.beachP||[]).filter(q=>near(q.x,q.z,900)).concat(DW),K={parasol:[],towel:[],lier:[],swim:[]},stand=[];for(const q of BP){if(q.k==='stand')stand.push(q);else K[q.k].push(q);}
        for(const [k,key] of [['parasol','parasols'],['towel','towels'],['lier','liers'],['swim','swimmers']]){const L=K[k],b=B(L.length);L.forEach((q,i)=>b.set([q.x,q.y,q.z,k==='swim'?1.2:1,q.rot,0.5,q.hash,0],i*8));R.inst(key,b,L.length);}this.beachStand=stand;}
      {const SH=this.shovel.filter(q=>q.x!==undefined&&near(q.x,q.z,800)),sb=B(SH.length);SH.forEach((q,i)=>sb.set([q.x,Hr(q.x,q.z)-0.05,q.z,1.25,q.rot,0.5,q.hash,1],i*8));R.inst('shovelers',sb,SH.length);}
      {const SM=[];const showSlots=Build.active&&((Build.mode==='signals'&&Build.sigTool==='station')||(Build.target==='road'&&Roads.tool==='stop'));if(showSlots)for(const [kind,LST] of this.slotInds())LST.forEach((m,mi)=>{if(!m||(kind==='farm'&&Build.target==='road'))return;if(!near(m.x,m.z,1500)||!this.indOn(kind,m))return;for(const sl of this.sawSlots(m)){
          const rs=Track.stations.find(st=>st[kind]&&st[kind].mi===mi&&st[kind].k===sl.k),bs=Buses.stops.find(q=>q[kind]&&q[kind].mi===mi&&q[kind].k===sl.k);if(!rs&&!bs)SM.push([sl.p[0],Hr(sl.p[0],sl.p[1]),sl.p[1],1,sl.t,0.5,0.5,0]);}});
        const b=B(SM.length);SM.forEach((r,i)=>b.set(r,i*8));R.inst('slotmarks',b,SM.length);}
      {const BL=Buses.list.filter(b=>near(b.x,b.z,1500)),bb=B(BL.length),lb=B(BL.length);let nB=0,nL=0;BL.forEach((b,i)=>{const y=Math.max(Hr(b.x,b.z),this.deckY(b.x,b.z)),a=Hr(b.x+Math.cos(b.rot)*3,b.z+Math.sin(b.rot)*3),c=Hr(b.x-Math.cos(b.rot)*3,b.z-Math.sin(b.rot)*3);const row=[b.x,y,b.z,0.75,b.rot,clamp(0.5+Math.atan((a-c)/6)/2,0,1),b.hash,0];if(b.goods)lb.set(row,(nL++)*8);else bb.set(row,(nB++)*8);});/* buses and lorries are drawn by RoadVeh (4.16.0) */R.inst('buses',bb,0);R.inst('lorries',lb,0);
        const SS=Buses.stops,sb2=B(SS.length);SS.forEach((s,i)=>sb2.set([s.x,Hr(s.x,s.z),s.z,1,s.rot,0.5,0.5,0],i*8));R.inst('busstops',sb2,SS.length);
        const BW=[];for(const s of SS){if(!near(s.x,s.z,600))continue;const n=Math.min(6,Math.floor(s.waiting));for(let k=0;k<n;k++){const u=0.6+k*0.55,x=s.x+Math.cos(s.rot)*u-Math.sin(s.rot)*0.3,z=s.z+Math.sin(s.rot)*u+Math.cos(s.rot)*0.3;BW.push({x,z,y:Hr(x,z)-0.05,rot:s.rot-Math.PI/2,hash:(s.id*0.37+k*0.21)%1,k:'stand'});}}this.busWait=BW;}
      {const SHL=[],hb=B(SHL.length);SHL.forEach((si,i)=>{const x=si.x+si.nx*9.6,z=si.z+si.nz*9.6;hb.set([x,si.y,z,1,Math.atan2(si.dz,si.dx)+Math.PI,0.5,0.5,0],i*8);});R.inst('stationhalls',hb,SHL.length);}
      {const SE=[];const cp=Cam.pos||[0,0,0];for(const tr of Trains.list){if(!tr.poses)continue;const nc=tr.veh.filter(q=>q.k==='coach').length||1,occ=!tr.veh.some(q=>q.k==='coach')?0:clamp(0.15+(tr.pax?tr.pax.length:0)/(nc*16),0,0.9);
          tr.poses.forEach((p,vi)=>{if(!p||tr.veh[vi].k!=='coach'||Math.hypot(p.c[0]-cp[0],p.c[2]-cp[2])>260)return;const X=p.X,m=p.m,Y=[m[4],m[5],m[6]],Z=[m[8],m[9],m[10]],yaw=Math.atan2(X[2],X[0]);
            for(let w=0;w<8;w++)for(const sd of [-1,1])for(const f of [-1,1])for(const lz of [-0.24,0.24]){const h=Math.abs(Math.sin((w*7.13+sd*3.7+f*1.9+lz*11.3+vi*5.31+Trains.list.indexOf(tr)*2.17)*43758.5))%1;if(h>=occ)continue;
              const lx=-6.1+w*1.74+f*0.62,lzz=sd*0.86+lz,ly=1.66;SE.push([p.c[0]+X[0]*lx+Y[0]*ly+Z[0]*lzz,p.c[1]+X[1]*lx+Y[1]*ly+Z[1]*lzz,p.c[2]+X[2]*lx+Y[2]*ly+Z[2]*lzz,1,yaw+(f<0?0:Math.PI),0.5,h,0]);}});}
        const sb=B(SE.length);SE.forEach((r,i)=>sb.set(r,i*8));R.inst('seated',sb,SE.length);}
      {const DR=[];for(const tr of Trains.list){if(tr.atSt==null||Math.abs(tr.v||0)>0.1||!tr.poses)continue;const si=this.stInfo.find(q=>q.st.id===tr.atSt);if(!si)continue;
          tr.poses.forEach((p,i)=>{if(!p||tr.veh[i].k!=='coach')return;const X=p.X;for(const e of [-1,1])DR.push([p.c[0]+X[0]*e*6.75,p.c[1],p.c[2]+X[2]*e*6.75,1,Math.atan2(X[2],X[0])+(e>0?0:Math.PI),0.5,0.5,0]);});}const db=B(DR.length);DR.forEach((r,i)=>db.set(r,i*8));R.inst('doors',db,DR.length);}
      {const XS=(this.crossings||[]).filter(q=>near(q.x,q.z,900)),xb=B(XS.length*2),bm=B(XS.length*2);XS.forEach((q,i)=>{const cr=Math.cos(q.rh),sr=Math.sin(q.rh),nx=-sr,nz=cr;
          [[-1,1],[1,-1]].forEach(([a,sd],k)=>{const x=q.x+cr*3.9*a+nx*(q.w+0.7)*sd,z=q.z+sr*3.9*a+nz*(q.w+0.7)*sd,y=Hr(x,z);xb.set([x,y,z,1,q.rh,0.5,0.5,0],(i*2+k)*8);bm.set([x,y+1.05,z,1,Math.atan2(-nz*sd,-nx*sd),clamp(q.ang,0,1),0.5,0],(i*2+k)*8);});});
        R.inst('xbucks',xb,XS.length*2);R.inst('booms',bm,XS.length*2);}
      {const TR=this.farm.tr.filter(t=>near(t.x,t.z,1200)),Hh=(x,z)=>Math.max(Hr(x,z),this.deckY(x,z)),pit=(x,z,r,L)=>{const a=Hh(x+Math.cos(r)*L,z+Math.sin(r)*L),b=Hh(x-Math.cos(r)*L,z-Math.sin(r)*L);return clamp(0.5+Math.atan((a-b)/(2*L))/2,0,1);};
        const tr=[],cb=[],pl=[],dr=[],hw=[],tl=[],ba=[],hitch=(t,key)=>{const bx=t.x-Math.cos(t.rot)*2.6,bz=t.z-Math.sin(t.rot)*2.6;key.push([bx,Hh(bx,bz),bz,1,t.rot,pit(bx,bz,t.rot,1),t.hash,0]);};
        for(const t of TR){const row=[t.x,Hh(t.x,t.z),t.z,1,t.rot,pit(t.x,t.z,t.rot,1.5),t.hash,0];if(t.tool==='combine')cb.push(row);else{tr.push(row);if(t.tool==='plough')hitch(t,pl);else if(t.tool==='drill')hitch(t,dr);else if(t.tool==='harrow')hitch(t,hw);}}
        for(const c of this.farm.carts||[]){if(!near(c.x,c.z,1200))continue;tr.push([c.x,Hh(c.x,c.z),c.z,1,c.rot,pit(c.x,c.z,c.rot,1.5),c.hash,0]);const bx=c.x-Math.cos(c.rot)*3.4,bz=c.z-Math.sin(c.rot)*3.4;tl.push([bx,Hh(bx,bz),bz,1,c.rot+(c.st==='tip'?0:0),c.st==='tip'?0.62:pit(bx,bz,c.rot,1),0.5,0]);}
        for(const b of this.bales||[])if(near(b.x,b.z,700))ba.push([b.x,Hh(b.x,b.z),b.z,1,b.rot,0.5,0.5,0]);
        for(const [key,L] of [['tractors',tr],['combines',cb],['ploughs',pl],['drills',dr],['harrows',hw],['trailers',tl],['bales',ba]]){const b=B(L.length);L.forEach((r,i)=>b.set(r,i*8));R.inst(key,b,L.length);}}
      const Gm=this.sk.game;if(Gm&&near(Gm.x,Gm.z,900)){const tw=(u,w)=>[Gm.x+Gm.c*u-Gm.s*w,Gm.z+Gm.s*u+Gm.c*w],y=sampleWater(this.T,Gm.x,Gm.z)[0]-0.02,hb=B(10);Gm.pl.forEach((p,i)=>{const q=tw(p.u,p.w);hb.set([q[0],y,q[1],1.2,Gm.a+p.h,0.3,p.hash,p.mv],i*8);});R.inst('hockeyP',hb,10);
        const gb=B(2);[-1,1].forEach((sd,i)=>{const q=tw(sd*Gm.hl,0);gb.set([q[0],y,q[1],1,Gm.a+(sd>0?Math.PI:0),0.5,0.5,0],i*8);});R.inst('hgoals',gb,2);const pq=tw(Gm.pk.u,Gm.pk.w),pb=B(1);pb.set([pq[0],y,pq[1],1,0,0.5,0.5,0],0);R.inst('pucks',pb,1);}
      else{R.inst('hockeyP',B(0),0);R.inst('hgoals',B(0),0);R.inst('pucks',B(0),0);}}
    for(const [K,key,s0] of [['sheep','sheep',1.15],['cow','cows',1.25],['horse','horses',1.2]]){const L=this.animals.filter(q=>q.kind===K&&this.farmOn(q.f)&&near(q.x,q.z,1200)),a=B(L.length);L.forEach((q,i)=>a.set([q.x,Hr(q.x,q.z)-0.05,q.z,s0*q.sc,q.rot,clamp(q.g,0,1),q.hash,q.mv],i*8));R.inst(key,a,L.length);}
    const ice=Weather.ice>0.5;
    for(const swan of [false,true]){const L=ice?[]:this.swimmers.filter(q=>q.swan===swan),a=B(L.length);L.forEach((q,i)=>{const w=sampleWater(T,q.x,q.z);a.set([q.x,w[0]-0.02,q.z,swan?1.3:1.4,q.rot,0.5,q.hash,0],i*8);});R.inst(swan?'swans':'ducks',a,L.length);}
    for(const sail of [false,true]){const L=ice?[]:this.boats.filter(q=>q.sail===sail),a=B(L.length);L.forEach((q,i)=>{const w=sampleWater(T,q.x,q.z);a.set([q.x,w[0]-0.25,q.z,1.2,q.rot,0.5,q.hash,0],i*8);});R.inst(sail?'sailboats':'rowboats',a,L.length);}
    const day=1-smooth(0.4,0.9,A.night);
    for(const gull of [false,true]){const L=[];for(const f of this.flocks)if(f.gull===gull&&day>0.05){const hd=Math.atan2(f.v[2],f.v[0]);for(const b of f.birds){const t=App.time+b.ph;
        L.push([f.p[0]+b.o[0]+Math.sin(t*0.9)*4,f.p[1]+b.o[1]+Math.sin(t*1.3)*2,f.p[2]+b.o[2]+Math.cos(t*0.8)*4,gull?3.2:2.6,hd,0.5,b.h,Math.sin(t*0.37)>-0.3?1:0.15]);}}
      const a=B(L.length);L.forEach((q,i)=>a.set(q,i*8));R.inst(gull?'birdsL':'birdsD',a,L.length);}
    for(let v=0;v<3;v++){const L=(this.balloons||[]).filter(b=>b.v===v),a=B(L.length);L.forEach((b,i)=>a.set([b.x,b.y,b.z,1.15,b.rot,0.5,0.5,0],i*8));R.inst('balloons'+v,a,L.length);}},
  draw(pass){if(!this.T)return;const I=R.instBufs;
    for(let v=0;v<R.houseDefs.length;v++)R.drawObj('h'+v,10,I['house'+v],pass);for(let k=0;k<3;k++)R.drawObj('site'+k,10,I['sites'+k],pass);R.drawObj('barn',10,I.barns,pass);R.drawObj('bakery',10,I.bakeries,pass);R.drawObj('restaurant',10,I.restaurants,pass);R.drawObj('stall',10,I.stalls,pass);R.drawObj('leafpatch',10,I.leafp,pass);R.drawObj('leafpile',10,I.leafpl,pass);R.drawObj('leafbag',10,I.leafbg,pass);R.drawObj('stationhall',10,I.stationhalls,pass);R.drawObj('castle',10,I.castle,pass);R.drawObj('castle2',10,I.castle2,pass);for(let v=0;v<3;v++)R.drawObj('balloon'+v,10,I['balloons'+v],pass);R.drawObj('shed',10,I.sheds,pass);R.drawObj('silo',10,I.silos,pass);R.drawObj('millBody',10,I.millBody,pass);R.drawObj('millSails',11,I.sails,pass);R.drawObj('sawWheel',11,I.sawwheels,pass);R.drawObj('plankCarry',10,I.planks,pass);R.drawObj('lamp',10,I.lamps,pass);R.drawObj('sawmill',10,I.sawmills,pass);R.drawObj('workshop',10,I.workshops,pass);for(const k of ['gold','silver','diamond'])R.drawObj('mine_'+k,10,I['mines_'+k],pass);R.drawObj('bank',10,I.banks,pass);
    if(pass===1)return;for(const k of PEOPLE)R.drawObj('pp_'+k,22,I['pp_'+k],pass);R.drawObj('pp_far',22,I.pp_far,pass);R.drawObj('skater',15,I.skaters,pass);R.drawObj('speedskater',15,I.speedskaters,pass);R.drawObj('hockeyP',15,I.hockeyP,pass);R.drawObj('hgoal',10,I.hgoals,pass);R.drawObj('puck',10,I.pucks,pass);R.drawObj('sledder',16,I.sledders,pass);R.drawObj('sled',16,I.sleds,pass);R.drawObj('sheep',19,I.sheep,pass);R.drawObj('cow',17,I.cows,pass);R.drawObj('horse',18,I.horses,pass);R.drawObj('tractor',16,I.tractors,pass);R.drawObj('bus',16,I.buses,pass);R.drawObj('lorry',16,I.lorries,pass);R.drawObj('slotmark',10,I.slotmarks,pass);R.drawObj('busstop',10,I.busstops,pass);R.drawObj('harrow',16,I.harrows,pass);R.drawObj('trailer',16,I.trailers,pass);R.drawObj('bale',10,I.bales,pass);R.drawObj('seated',10,I.seated,pass);R.drawObj('dooropen',10,I.doors,pass);R.drawObj('shoveler',13,I.shovelers,pass);R.drawObj('xbuck',10,I.xbucks,pass);R.drawObj('boom',21,I.booms,pass);R.drawObj('combine',16,I.combines,pass);R.drawObj('plough',16,I.ploughs,pass);R.drawObj('drill',16,I.drills,pass);R.drawObj('fence',16,I.fences,pass);
    R.drawObj('duck',14,I.ducks,pass);R.drawObj('swan',14,I.swans,pass);R.drawObj('rowboat',14,I.rowboats,pass);R.drawObj('steamer',14,I.steamers,pass);R.drawObj('sternwheel',21,I.sternwheels,pass);R.drawObj('parasol',10,I.parasols,pass);R.drawObj('towel',10,I.towels,pass);R.drawObj('lier',10,I.liers,pass);R.drawObj('swimmer',14,I.swimmers,pass);R.drawObj('sailboat',14,I.sailboats,pass);
    R.drawObj('birdD',12,I.birdsD,pass);R.drawObj('birdL',12,I.birdsL,pass);}
};
function lerpAng(a,b,k){return a+wrapPi(b-a)*Math.min(1,k);}
