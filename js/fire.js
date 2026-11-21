'use strict';
// ===== fire.js
// ===================================================================
// Forest fires (4.44.0), the work of the CL-415. Since 4.44.1 a fire only starts when you take a forest-fire mission at an airfield or
// jetty (Air.missionPanel → Fires.start(false,strip)): in a dense wood 2–7 km from that field, away from the villages. It burns on a 16 m grid: a cell's flames grow, it spreads to its neighbours (faster
// downwind, only where there are trees), and after about 90 s a cell burns out: its trees are gone and the ground is black. Water
// dropped on it (Fires.splash, from the CL-415's tanks) knocks the flames back; a cell put out stays wet for a while.
// The fire is a mission at every airfield and jetty (Air.missionPanel); put it out and you are paid more the less forest was lost.
// If nobody fights it, it burns out by itself. Flames and a tall smoke column (particle types 5 and 7), an orange glow at night.
// ===================================================================
const FIRE={cs:16,burnT:90,maxCells:420};
const Fires={list:[],burnt:new Set(),pendBurnt:null,_scorch:null,_sk:'',
  key(i,j){return i*65536+j;},
  // trees in a cell (cached): counted from the uploaded tree buffers (R.vegB, one per kind; the rocks are the last set)
  trees(i,j){const T=App.T;if(!T||!R.vegB)return 0;const cs=FIRE.cs,x0=i*cs,z0=j*cs,CN=16,cw=T.W/CN,ch=clamp(Math.floor((z0+cs/2)/cw),0,CN-1)*CN+clamp(Math.floor((x0+cs/2)/cw),0,CN-1);let n=0;
    for(let b=0;b<R.vegB.length-1;b++){const B=R.vegB[b],D=B.data;for(let k=B.start[ch];k<B.start[ch+1];k++){const x=D[k*8],z=D[k*8+2];if(x>=x0&&x<x0+cs&&z>=z0&&z<z0+cs&&D[k*8+3]>0)n++;}}return n;},
  // burn the trees of a cell: gone from the buffers and from the world's tree list
  kill(i,j){const T=App.T;if(!T||!R.vegB)return;const cs=FIRE.cs,x0=i*cs,z0=j*cs,CN=16,cw=T.W/CN,ch=clamp(Math.floor((z0+cs/2)/cw),0,CN-1)*CN+clamp(Math.floor((x0+cs/2)/cw),0,CN-1);
    for(let b=0;b<R.vegB.length-1;b++){const B=R.vegB[b],D=B.data;for(let k=B.start[ch];k<B.start[ch+1];k++){const x=D[k*8],z=D[k*8+2];if(x>=x0&&x<x0+cs&&z>=z0&&z<z0+cs){D[k*8+3]=0;if(B.orig)B.orig[k]=0;}}}
    for(const arr of (T.veg&&T.veg.trees)||[])for(let k=0;k+3<arr.length;k+=8){const x=arr[k],z=arr[k+2];if(x>=x0&&x<x0+cs&&z>=z0&&z<z0+cs)arr[k+3]=0;}
    R.vegKey='';R.vegVer=(R.vegVer|0)+1;this.burnt.add(this.key(i,j));this._sk='';},
  // where a fire may start: a dense wood, 300 m from any village, airstrip or track, on dry land
  // near: the airfield the mission was taken at; the fire is 2–7 km from it (and if possible within 2.5 km of water to scoop from)
  start(quiet,near){const T=App.T;if(!T||!R.vegB||!T.veg)return null;const rng=Math.random,cs=FIRE.cs,wet=(x,z)=>{for(let a=0;a<12;a++){const r=300+a*190;for(let b=0;b<8;b++){const t=b/8*Math.PI*2;if(Plane.water(x+Math.cos(t)*r,z+Math.sin(t)*r))return true;}}return false;};
    for(let k=0;k<900;k++){const set=T.veg.trees[Math.floor(rng()*T.veg.trees.length)];if(!set||!set.length)continue;const t=Math.floor(rng()*set.length/8)*8;if(!(set[t+3]>0))continue;const x=set[t],z=set[t+2];
      if(Life.villages.some(v=>Math.hypot(v.x-x,v.z-z)<(v.R||80)+300)||Air.list.some(s=>Math.hypot(s.x-x,s.z-z)<500))continue;if(Plane.water(x,z))continue;if(near&&k<800){const d=Math.hypot(near.x-x,near.z-z);if(d<2000||d>7000||(k<500&&!wet(x,z)))continue;}
      const i=Math.floor(x/cs),j=Math.floor(z/cs);let n=0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)n+=this.trees(i+a,j+b);if(n<14)continue;
      const f={id:(Date.now()%1e7)+k,x,z,cells:new Map(),t0:App.time,hits:0,water:0,place:Rescue.vname(x,z),total:0};f.cells.set(this.key(i,j),{i,j,int:0.4,t:0,st:'burn',n:this.trees(i,j)});
      for(const [a,b] of [[1,0],[0,1],[-1,0]])f.cells.set(this.key(i+a,j+b),{i:i+a,j:j+b,int:0.15,t:0,st:'burn',n:this.trees(i+a,j+b)});
      this.list.push(f);Log.info(`fire: started above ${f.place} at ${x.toFixed(0)},${z.toFixed(0)}`);if(!quiet)UI.toast(`🔥 A forest fire above ${f.place}! Fight it with the CL-415: tap an airfield or jetty`);Sfx.clunk&&Sfx.clunk();return f;}
    return null;},
  active(){return this.list.filter(f=>[...f.cells.values()].some(c=>c.st==='burn'));},
  nearest(x,z){let b=null,bd=1e18;for(const f of this.active()){const d=Math.hypot(f.x-x,f.z-z);if(d<bd){bd=d;b=f;}}return b;},
  stats(f){let burn=0,burnt=0,out=0;for(const c of f.cells.values()){if(c.st==='burn')burn++;else if(c.st==='burnt')burnt++;else out++;}return{burn,burnt,out,ha:(burnt*FIRE.cs*FIRE.cs/1e4)};},
  update(dt){const T=App.T;if(!T||App.busy)return;if(this.pendBurnt&&R.vegB){for(const k of this.pendBurnt)this.kill(Math.floor(k/65536),k%65536);this.pendBurnt=null;}
    if(!this.list.length)return;dt=Math.min(dt,2);const wa=(P.windDir||0)*Math.PI/180,wx=Math.cos(wa),wz=Math.sin(wa),ws=0.5+(P.windStrength||0.3)*2,rain=Weather.eff?Weather.eff().rain:0;
    for(const f of this.list){const add=[];
      for(const c of f.cells.values()){if(c.st==='wet'){c.t-=dt;if(c.t<=0)c.st='out';continue;}if(c.st!=='burn')continue;
        c.int=Math.min(1,c.int+dt*(c.n>0?0.04:0.01)*(1-rain*0.8));c.t+=dt;if(c.t>FIRE.burnT||(c.n===0&&c.t>20)){c.st='burnt';if(c.n>0)this.kill(c.i,c.j);continue;}
        if(c.int>0.5&&f.cells.size<FIRE.maxCells)for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const k=this.key(c.i+a,c.j+b);if(f.cells.has(k)||add.some(q=>q[0]===k))continue;
          const down=Math.max(0,(a*wx+b*wz)/Math.hypot(a,b)),pr=dt*0.012*(1+down*ws*2)*(1-rain);if(Math.random()<pr){const n=this.trees(c.i+a,c.j+b);if(n>0)add.push([k,{i:c.i+a,j:c.j+b,int:0.1,t:0,st:'burn',n}]);}}}
      for(const [k,c] of add)f.cells.set(k,c);f.total=Math.max(f.total,f.cells.size);
      const s=this.stats(f);if(!s.burn&&!f.done){f.done=true;this.finish(f,s);}}
    this.list=this.list.filter(f=>!f.done||App.time-f.doneT<5);this.effects(dt);},
  finish(f,s){f.doneT=App.time;const lostHa=s.ha.toFixed(1);if(f.hits>0){const saved=clamp(1-s.burnt/Math.max(1,f.total),0,1),pay=Math.round((40000+70000*saved+(f.d||0)*5)/500)*500;
      if(Money.on())Money.earn(pay,'forest fire put out',f.x,R.sampleHr(App.T,f.x,f.z)+20,f.z);
      MissionDone.show({title:'Fire out!',sub:`The forest fire above ${f.place}`,stars:saved>0.8?3:saved>0.5?2:1,rows:[['Water drops',String(f.hits)],['Water used',Math.round(f.water).toLocaleString()+' L'],['Forest lost',lostHa+' ha'],['Saved',Math.round(saved*100)+' %']],pay:Money.on()?pay:0});}
    else UI.toast(`The fire above ${f.place} has burnt itself out: ${lostHa} ha of forest lost`);Log.info(`fire: ${f.hits?'put out':'burnt out'}, ${lostHa} ha`);},
  // water from the CL-415: where it lands (ahead of the plane, by its height), how much reaches the ground (less from high up)
  splash(p,v,kg,dt){if(!this.list.length||kg<=0)return;const g=Plane.groundAt(p[0],p[2]),h=Math.max(1,p[1]-g),tf=Math.min(4,Math.sqrt(2*h/9.81)),lx=p[0]+v[0]*tf*0.6,lz=p[2]+v[2]*tf*0.6,eff=clamp(1.4-h/110,0.15,1),R2=26+h*0.15,cs=FIRE.cs;
    for(const f of this.list){let hit=false;for(const c of f.cells.values()){if(c.st!=='burn'&&c.st!=='out')continue;const cx=(c.i+0.5)*cs,cz=(c.j+0.5)*cs,d=Math.hypot(cx-lx,cz-lz);if(d>R2)continue;
        if(c.st==='burn'){c.int-=kg/PLC.water*4.2*eff*(1-d/R2*0.5);hit=true;if(c.int<=0){c.st='wet';c.t=300;c.int=0;}}else{c.st='wet';c.t=300;}}
      if(hit){f.water+=kg;if(!f._lastHit||App.time-f._lastHit>2.5){f.hits++;f._lastHit=App.time;Icons.add&&Icons.add(lx,R.sampleHr(App.T,lx,lz)+12,lz,'💧');}}}},
  // flames, smoke, steam where it was hit
  effects(dt){if(!P.smoke)return;const cp=Cam.pos||[0,0,0],T=App.T,cs=FIRE.cs;const sb=3.5*dt;
    for(const f of this.list){if(Math.hypot(f.x-cp[0],f.z-cp[2])>6000)continue;const B=[...f.cells.values()].filter(c=>c.st==='burn');if(!B.length)continue;
      for(let k=0;k<Math.min(B.length*0.4,14);k++){if(Math.random()>dt*12)continue;const c=B[Math.floor(Math.random()*B.length)],x=(c.i+Math.random())*cs,z=(c.j+Math.random())*cs,y=R.sampleHr(T,x,z);
        Particles.spawn(x,y+1+Math.random()*7*c.int,z,(Math.random()-0.5)*1.5,2.5+Math.random()*2,(Math.random()-0.5)*1.5,0.6+Math.random()*0.5,0.9+c.int*1.6,0.3,5);}
      if(Math.random()<sb*Math.min(1,B.length/6)){const c=B[Math.floor(Math.random()*B.length)],x=(c.i+0.5)*cs,z=(c.j+0.5)*cs;Particles.spawn(x,R.sampleHr(T,x,z)+8,z,(Math.random()-0.5)*2,5+Math.random()*2,(Math.random()-0.5)*2,22+Math.random()*10,7,34,7);}
      for(const c of f.cells.values())if(c.st==='wet'&&c.t>290&&Math.random()<dt*6){const x=(c.i+Math.random())*cs,z=(c.j+Math.random())*cs;Particles.spawn(x,R.sampleHr(T,x,z)+1,z,0,2,0,4,2,8,1);}}},
  lights(add){for(const f of this.list){const B=[...f.cells.values()].filter(c=>c.st==='burn').sort((a,b)=>b.int-a.int).slice(0,4);for(const c of B){const x=(c.i+0.5)*FIRE.cs,z=(c.j+0.5)*FIRE.cs;add(x,R.sampleHr(App.T,x,z)+6,z,40,[2.6*c.int,1.1*c.int,0.25*c.int]);}}},
  // the black ground of the burnt cells (one mesh, rebuilt when the set changes)
  draw(p,pass){if(!this.burnt.size||!App.T)return;if(this._sk!==this.burnt.size+'|'+App.T.W){this._sk=this.burnt.size+'|'+App.T.W;if(this._scorch&&R.freeMesh)R.freeMesh(this._scorch);
      const M=vmesh(),T=App.T,cs=FIRE.cs,n=4,s=cs/n,B=this.burnt,hs=(x,z)=>{const h=Math.sin(x*12.9898+z*78.233)*43758.5453;return h-Math.floor(h);},H=(x,z)=>R.sampleHr(T,x,z)+0.12;
      // a vertex's shade from a hash of its position, so neighbouring squares share it (smooth, not tiled); the rim of the burnt area is scorched brown
      const V=(x,z,rim)=>{const e=1.5,nx=H(x-e,z)-H(x+e,z),nz=H(x,z-e)-H(x,z+e),nl=Math.hypot(nx,2*e,nz),sh=0.05+0.06*hs(x,z),c=rim?[0.2,0.15,0.08]:[sh,sh*0.9,sh*0.8];
        M.v.push(x,H(x,z),z,nx/nl,2*e/nl,nz/nl,c[0],c[1],c[2],0,0,0,1,3);return M.n++;};
      for(const k of B){const i=Math.floor(k/65536),j=k%65536,nb=(di,dj)=>B.has((i+di)*65536+j+dj);
        for(let a=0;a<n;a++)for(let b=0;b<n;b++){const x0=i*cs+a*s,z0=j*cs+b*s;
          // the outer row of squares next to unburnt ground: some left out, the rest brown, so the edge is ragged
          const edge=(a===0&&!nb(-1,0))||(a===n-1&&!nb(1,0))||(b===0&&!nb(0,-1))||(b===n-1&&!nb(0,1));if(edge&&hs(x0+1.3,z0+2.7)<0.45)continue;
          const q=[V(x0,z0,edge),V(x0+s,z0,edge),V(x0+s,z0+s,edge),V(x0,z0+s,edge)];M.i.push(q[0],q[2],q[1],q[0],q[3],q[2]);}}
      this._scorch=R.uploadVeh(M);}
    const m=this._scorch;gl.uniformMatrix4fv(p.u('uModel'),false,M4.ident());gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,0);Stats.draws++;},
  // compass mark and a label over the fire while flying the CL-415
  marks(){if(Plane.kind!=='cl415')return[];return this.active().map(f=>({x:f.x,z:f.z,label:'🔥',col:'#ff6a2a',ring:true}));},
  label(){let el=this._lb;const f=Plane.on&&Plane.kind==='cl415'&&Plane.st?this.nearest(Plane.st.p[0],Plane.st.p[2]):null;if(!el){el=this._lb=document.createElement('div');el.className='ilabel rsLabel';el.style.background='#e2531fe6';document.body.appendChild(el);}
    if(!f){el.style.display='none';return;}const q=Cam.toScreen(f.x,R.sampleHr(App.T,f.x,f.z)+40,f.z);if(!q){el.style.display='none';return;}const s=this.stats(f),d=Math.hypot(Plane.st.p[0]-f.x,Plane.st.p[2]-f.z);
    el.style.display='';el.style.left=q[0]+'px';el.style.top=q[1]+'px';el.innerHTML=`<b>🔥 Fire</b> ${d<1000?Math.round(d)+' m':(d/1000).toFixed(1)+' km'} · ${s.burn} burning`;},
  serialize(){return{burnt:[...this.burnt],fires:this.list.filter(f=>!f.done).map(f=>({x:f.x,z:f.z,place:f.place,hits:f.hits,water:f.water,total:f.total,cells:[...f.cells.values()].map(c=>[c.i,c.j,+c.int.toFixed(2),Math.round(c.t),c.st,c.n])}))};},
  load_(d){this.list=[];this.burnt=new Set();this._sk='';this.pendBurnt=d&&d.burnt&&d.burnt.length?d.burnt.slice():null;
    for(const q of (d&&d.fires)||[]){const f={id:Math.random(),x:q.x,z:q.z,place:q.place,hits:q.hits|0,water:q.water||0,total:q.total|0,t0:App.time||0,cells:new Map()};for(const c of q.cells)f.cells.set(this.key(c[0],c[1]),{i:c[0],j:c[1],int:c[2],t:c[3],st:c[4],n:c[5]});this.list.push(f);}}};
