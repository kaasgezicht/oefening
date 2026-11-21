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
/* 4.46: a fire mission is driven by two numbers, both shown as bars: H, the fire's strength (starts at 0.6, grows FIRE.grow a minute,
   a full load of water landing on the flames takes FIRE.drop off it: three good drops put it out), and L, the forest lost (it fills at
   a speed set by H, so an untouched fire takes all the forest only when the time is up: FIRE.base plus the flight to the fire at
   100 km/h). The cells on the ground follow them: about H×FIRE.N cells burn, L×FIRE.LN have burnt out. */
const FIRE={cs:16,burnT:90,N:56,LN:180,base:420,grow:0.06,drop:0.5,h0:0.6};/* grow: per minute (half that once water has hit it) */
const Fires={list:[],burnt:new Set(),pendBurnt:null,_scorch:null,_sk:'',char:[],_tp:new Map(),
  // the trees of a cell as {x,y,z,h} (cached): where the flame tongues stand and how tall they are
  treesAt(i,j){const k=this.key(i,j);let L=this._tp.get(k);if(L)return L;L=[];const T=App.T;if(T&&R.vegB){const cs=FIRE.cs,x0=i*cs,z0=j*cs,CN=16,cw=T.W/CN,ch=clamp(Math.floor((z0+cs/2)/cw),0,CN-1)*CN+clamp(Math.floor((x0+cs/2)/cw),0,CN-1);
      for(let b=0;b<R.vegB.length-1;b++){const B=R.vegB[b],D=B.data;for(let q=B.start[ch];q<B.start[ch+1];q++){const x=D[q*8],z=D[q*8+2];if(x>=x0&&x<x0+cs&&z>=z0&&z<z0+cs&&D[q*8+3]>0)L.push({x,y:D[q*8+1],z,h:D[q*8+3]});}}}
    L.sort((a,b)=>b.h-a.h);L=L.slice(0,6);this._tp.set(k,L);return L;},
  key(i,j){return i*65536+j;},
  // trees in a cell (cached): counted from the uploaded tree buffers (R.vegB, one per kind; the rocks are the last set)
  trees(i,j){const T=App.T;if(!T||!R.vegB)return 0;const cs=FIRE.cs,x0=i*cs,z0=j*cs,CN=16,cw=T.W/CN,ch=clamp(Math.floor((z0+cs/2)/cw),0,CN-1)*CN+clamp(Math.floor((x0+cs/2)/cw),0,CN-1);let n=0;
    for(let b=0;b<R.vegB.length-1;b++){const B=R.vegB[b],D=B.data;for(let k=B.start[ch];k<B.start[ch+1];k++){const x=D[k*8],z=D[k*8+2];if(x>=x0&&x<x0+cs&&z>=z0&&z<z0+cs&&D[k*8+3]>0)n++;}}return n;},
  // burn the trees of a cell: gone from the buffers and from the world's tree list
  kill(i,j){const T=App.T;if(!T||!R.vegB)return;const cs=FIRE.cs,x0=i*cs,z0=j*cs,CN=16,cw=T.W/CN,ch=clamp(Math.floor((z0+cs/2)/cw),0,CN-1)*CN+clamp(Math.floor((x0+cs/2)/cw),0,CN-1);
    for(let b=0;b<R.vegB.length-1;b++){const B=R.vegB[b],D=B.data;for(let k=B.start[ch];k<B.start[ch+1];k++){const x=D[k*8],z=D[k*8+2];if(x>=x0&&x<x0+cs&&z>=z0&&z<z0+cs){if(D[k*8+3]>0&&this.char.length<24000)this.char.push(x,D[k*8+1],z,D[k*8+3]);D[k*8+3]=0;if(B.orig)B.orig[k]=0;}}}
    for(const arr of (T.veg&&T.veg.trees)||[])for(let k=0;k+3<arr.length;k+=8){const x=arr[k],z=arr[k+2];if(x>=x0&&x<x0+cs&&z>=z0&&z<z0+cs)arr[k+3]=0;}
    R.vegKey='';R.vegVer=(R.vegVer|0)+1;this.burnt.add(this.key(i,j));this._sk='';},
  // where a fire may start: a dense wood, 300 m from any village, airstrip or track, on dry land
  // near: the airfield the mission was taken at; the fire is 2–7 km from it (and if possible within 2.5 km of water to scoop from)
  start(quiet,near){const T=App.T;if(!T||!R.vegB||!T.veg)return null;const rng=Math.random,cs=FIRE.cs,wet=(x,z)=>{for(let a=0;a<12;a++){const r=300+a*190;for(let b=0;b<8;b++){const t=b/8*Math.PI*2;if(Plane.water(x+Math.cos(t)*r,z+Math.sin(t)*r))return true;}}return false;};
    for(let k=0;k<900;k++){const set=T.veg.trees[Math.floor(rng()*T.veg.trees.length)];if(!set||!set.length)continue;const t=Math.floor(rng()*set.length/8)*8;if(!(set[t+3]>0))continue;const x=set[t],z=set[t+2];
      if(Life.villages.some(v=>Math.hypot(v.x-x,v.z-z)<(v.R||80)+300)||Air.list.some(s=>Math.hypot(s.x-x,s.z-z)<500))continue;if(Plane.water(x,z))continue;if(near&&k<800){const d=Math.hypot(near.x-x,near.z-z);if(d<2000||d>7000||(k<500&&!wet(x,z)))continue;}
      const i=Math.floor(x/cs),j=Math.floor(z/cs);let n=0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)n+=this.trees(i+a,j+b);if(n<14)continue;
      const f={id:(Date.now()%1e7)+k,x,z,cells:new Map(),t0:App.time,hits:0,water:0,place:Rescue.vname(x,z),total:0,H:FIRE.h0,L:0,el:0,budget:FIRE.base+(near?Math.hypot(near.x-x,near.z-z)/27.8:0)};f.cells.set(this.key(i,j),{i,j,int:0.4,t:0,st:'burn',n:this.trees(i,j)});
      for(const [a,b] of [[1,0],[0,1],[-1,0]])f.cells.set(this.key(i+a,j+b),{i:i+a,j:j+b,int:0.15,t:0,st:'burn',n:this.trees(i+a,j+b)});
      this.list.push(f);Log.info(`fire: started above ${f.place} at ${x.toFixed(0)},${z.toFixed(0)}`);if(!quiet)UI.toast(`🔥 A forest fire above ${f.place}! Fight it with the CL-415: tap an airfield or jetty`);Sfx.clunk&&Sfx.clunk();return f;}
    return null;},
  active(){return this.list.filter(f=>[...f.cells.values()].some(c=>c.st==='burn'));},
  nearest(x,z){let b=null,bd=1e18;for(const f of this.active()){const d=Math.hypot(f.x-x,f.z-z);if(d<bd){bd=d;b=f;}}return b;},
  stats(f){let burn=0,burnt=0,out=0;for(const c of f.cells.values()){if(c.st==='burn')burn++;else if(c.st==='burnt')burnt++;else out++;}return{burn,burnt,out,ha:(burnt*FIRE.cs*FIRE.cs/1e4)};},
  update(dt){const T=App.T;if(!T||App.busy)return;if(this.pendBurnt&&R.vegB){for(const k of this.pendBurnt)this.kill(Math.floor(k/65536),k%65536);this.pendBurnt=null;}
    this.bars();if(!this.list.length)return;dt=Math.min(dt,2);const wa=(P.windDir||0)*Math.PI/180,wx=Math.cos(wa),wz=Math.sin(wa),ws=0.5+(P.windStrength||0.3)*2,rain=Weather.eff?Weather.eff().rain:0;
    const N8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
    for(const f of this.list){if(f.done)continue;if(!f.budget)f.budget=FIRE.base;if(f.H==null){f.H=FIRE.h0;f.L=0;}f.el=(f.el||0)+dt;
      // the two numbers
      if(f.H>0)f.H=Math.min(1,f.H+dt*FIRE.grow/60*(f.hits?0.5:1)*(1-rain*0.8));f.L=Math.min(1,f.L+dt*f.H/(f.budget*0.9));
      const B=[];for(const c of f.cells.values()){if(c.st==='wet'){c.t-=dt;if(c.t<=0)c.st='out';continue;}if(c.st!=='burn')continue;B.push(c);c.t+=dt;c.int+=(Math.min(1,0.35+f.H*0.75)-c.int)*Math.min(1,dt*0.3);}
      // cells burn out (the oldest first) as the forest-lost number rises
      let nb=0;for(const c of f.cells.values())if(c.st==='burnt')nb++;
      while(nb<Math.round(f.L*FIRE.LN)&&B.length){let o=0;for(let i=1;i<B.length;i++)if(B[i].t>B[o].t)o=i;const c=B.splice(o,1)[0];c.st='burnt';if(c.n>0)this.kill(c.i,c.j);nb++;}
      // the front spreads into the wood next to it (downwind first) until about H×N cells burn
      const want=f.H>0?Math.max(1,Math.round(f.H*FIRE.N)):0;let tries=0;
      while(B.length<want&&tries++<12){const src=B.length?B[Math.floor(Math.random()*B.length)]:null;if(!src)break;let best=null,bs=-1;
        for(const [a,b] of N8){const k=this.key(src.i+a,src.j+b),q=f.cells.get(k);if(q&&q.st!=='out')continue;const n=this.trees(src.i+a,src.j+b);if(!n)continue;const sc=Math.max(0,(a*wx+b*wz)/Math.hypot(a,b))*ws+Math.random();if(sc>bs){bs=sc;best=[k,{i:src.i+a,j:src.j+b,int:0.15,t:0,st:'burn',n}];}}
        if(best){f.cells.set(best[0],best[1]);B.push(best[1]);}if(Math.random()>dt*3)break;}
      // knocked back: no more cells burn than the fire's strength allows (the ones nearest the last drop go out first)
      while(B.length>want+2){let o=0;if(f.lastDrop){let bd=1e18;B.forEach((c,i)=>{const d=Math.hypot((c.i+0.5)*16-f.lastDrop[0],(c.j+0.5)*16-f.lastDrop[1]);if(d<bd){bd=d;o=i;}});}const c=B.splice(o,1)[0];c.st='wet';c.t=300;c.steam=(c.steam||0)+1;}
      f.total=Math.max(f.total,f.cells.size);
      if(f.H<=0||!B.length&&f.H<0.05){f.H=0;for(const c of f.cells.values())if(c.st==='burn'){c.st='wet';c.t=300;}f.done=true;this.finish(f,true);}
      else if(f.L>=1){f.done=true;this.finish(f,false);}}
    this.list=this.list.filter(f=>!f.done||App.time-f.doneT<5);this.effects(dt);},
  finish(f,won){f.doneT=App.time;const s=this.stats(f),lostHa=s.ha.toFixed(1),saved=clamp(1-f.L,0,1);
    if(won){const pay=Math.round((40000+70000*saved)/500)*500;if(Money.on())Money.earn(pay,'forest fire put out',f.x,R.sampleHr(App.T,f.x,f.z)+20,f.z);
      MissionDone.show({title:'Fire out!',sub:`The forest fire above ${f.place}`,stars:saved>0.8?3:saved>0.5?2:1,rows:[['Water drops',String(f.hits)],['Water used',Math.round(f.water).toLocaleString()+' L'],['Forest lost',lostHa+' ha'],['Saved',Math.round(saved*100)+' %']],pay:Money.on()?pay:0});}
    else UI.toast(`Too late: the forest above ${f.place} is lost (${lostHa} ha). Take a new fire mission at an airfield`);Log.info(`fire: ${won?'put out':'forest lost'}, ${lostHa} ha, ${f.hits} drops, ${Math.round(f.el)} s of ${Math.round(f.budget)}`);},
  // water from the CL-415: where it lands (ahead of the plane, by its height), how much reaches the flames (less from high up); the
  // water that lands on burning cells takes its share off the fire's strength, and puts those cells out
  splash(p,v,kg,dt){if(!this.list.length||kg<=0)return;const g=Plane.groundAt(p[0],p[2]),h=Math.max(1,p[1]-g),tf=Math.min(4,Math.sqrt(2*h/9.81)),lx=p[0]+v[0]*tf*0.6,lz=p[2]+v[2]*tf*0.6,eff=clamp(1.25-h/200,0.3,1),R2=26+h*0.15,cs=FIRE.cs;
    for(const f of this.list){if(f.done)continue;let hit=false;for(const c of f.cells.values()){const cx=(c.i+0.5)*cs,cz=(c.j+0.5)*cs,d=Math.hypot(cx-lx,cz-lz);if(d>R2+16)continue;if(c.st==='wet'&&c.t>285||c.st==='burn'&&d>R2){if(c.st==='burn'||c.st==='wet')hit=true;continue;}/* just put out by this load: the rest of it still counts */if(c.st!=='burn'&&c.st!=='out')continue;
        if(c.st==='burn'){hit=true;c.int-=kg/PLC.water*4*eff;c.steam=(c.steam||0)+1;if(c.int<=0.05){c.st='wet';c.t=300;c.int=0;}}else{c.st='wet';c.t=300;}}
      if(hit){f.water+=kg;f.H=Math.max(0,f.H-kg/PLC.water*FIRE.drop*eff);f.lastDrop=[lx,lz];if(!f._lastHit||App.time-f._lastHit>2.5){f.hits++;f._lastHit=App.time;if(Sfx.hiss)Sfx.hiss(clamp(1.2-Math.hypot(lx-Cam.pos[0],lz-Cam.pos[2])/1500,0,1));Icons.add&&Icons.add(lx,R.sampleHr(App.T,lx,lz)+12,lz,'💧');}}}},
  // the two bars while flying with a fire on: its strength and the forest lost, with the time left
  bars(){let el=this._bars;const f=Plane.on?this.list.find(q=>!q.done):null;if(!f){if(el)el.hidden=true;return;}
    if(!el){el=this._bars=document.createElement('div');el.id='fireBars';el.innerHTML='<div><span>🔥 Fire</span><i><b class="h"></b></i><em class="hv"></em></div><div><span>🌲 Forest lost</span><i><b class="l"></b></i><em class="lv"></em></div><small></small>';document.body.appendChild(el);}
    el.hidden=false;el.querySelector('.h').style.width=(f.H*100).toFixed(1)+'%';el.querySelector('.l').style.width=(f.L*100).toFixed(1)+'%';el.querySelector('.hv').textContent=Math.round(f.H*100)+'%';el.querySelector('.lv').textContent=Math.round(f.L*100)+'%';
    const left=f.H>0?(1-f.L)*f.budget*0.9/Math.max(f.H,0.05):0,m=Math.floor(left/60),sc=Math.floor(left%60);el.querySelector('small').textContent=`${f.place} · about ${m}:${String(sc).padStart(2,'0')} left at this strength`;},
  // the particles round the flames (the flames themselves: drawFlames): sparks and embers rising and blowing downwind, the smoke plume
  // (dark and lit orange at its foot, paler and wider as it rises and bends with the wind), steam where the water hit
  effects(dt){if(!P.smoke)return;const cp=Cam.pos||[0,0,0],T=App.T,cs=FIRE.cs,R1=Math.random;
    for(const f of this.list){const fd=Math.hypot(f.x-cp[0],f.z-cp[2]);if(fd>7000)continue;const B=[];for(const c of f.cells.values())if(c.st==='burn')B.push(c);
      if(B.length){const near=fd<1800;
        for(let k=0;k<(near?3:1);k++)if(R1()<dt*Math.min(40,B.length*1.5)){const c=B[Math.floor(R1()*B.length)],tr=this.treesAt(c.i,c.j)[0],x=tr?tr.x:(c.i+R1())*cs,z=tr?tr.z:(c.j+R1())*cs,y=tr?tr.y+tr.h*(0.4+R1()*0.8):R.sampleHr(T,x,z)+2;
          Particles.spawn(x+(R1()-0.5)*3,y,z+(R1()-0.5)*3,(R1()-0.5)*3,4+R1()*5,(R1()-0.5)*3,1.4+R1()*2.2,0.22+c.int*0.25,0.06,5);}
        if(R1()<dt*Math.min(9,1.2+B.length/10)){const c=B[Math.floor(R1()*B.length)],tr=this.treesAt(c.i,c.j)[0],x=(c.i+0.5)*cs,z=(c.j+0.5)*cs;
          Particles.spawn(x,R.sampleHr(T,x,z)+(tr?tr.h:6)*0.9,z,(R1()-0.5)*2,6+R1()*3*c.int,(R1()-0.5)*2,26+R1()*14,8+c.int*5,48+R1()*16,7);}}
      for(const c of f.cells.values()){if(c.steam){const n=Math.min(10,c.steam*4);c.steam=0;for(let k=0;k<n;k++){const x=(c.i+R1())*cs,z=(c.j+R1())*cs;Particles.spawn(x,R.sampleHr(T,x,z)+1+R1()*4,z,(R1()-0.5)*3,4+R1()*4,(R1()-0.5)*3,4+R1()*3,4,15+R1()*8,1);}}
        if(c.st==='wet'&&c.t>270&&R1()<dt*3){const x=(c.i+R1())*cs,z=(c.j+R1())*cs;Particles.spawn(x,R.sampleHr(T,x,z)+1,z,0,2,0,4,2,9,1);}}}},
  // flame tongues: one quad per burning tree (standing up, turned to the camera) and low ground fire, drawn with their own shader:
  // noise-shaped tongues rising and licking, white-yellow at the core to orange and dark red at the tips, glowing (added light)
  drawFlames(cam){if(!this.list.length||!App.T)return;const cp=cam.pos,cs=FIRE.cs,T=App.T,MX=1400;if(!this._fa)this._fa=new Float32Array(MX*8);const A=this._fa;let n=0;
    const put=(x,y,z,h,w,seed,e,kind)=>{if(n>=MX)return;const o=n*8;A[o]=x;A[o+1]=y;A[o+2]=z;A[o+3]=h;A[o+4]=w;A[o+5]=seed;A[o+6]=e;A[o+7]=kind;n++;};
    for(const f of this.list){if(Math.hypot(f.x-cp[0],f.z-cp[2])>6500)continue;
      for(const c of f.cells.values()){if(c.st!=='burn')continue;const x0=c.i*cs,z0=c.j*cs,d=Math.hypot(x0+8-cp[0],z0+8-cp[2]);if(d>6500)continue;
        const fade=1,Ts=this.treesAt(c.i,c.j),far=d>2200;
        Ts.forEach((tr,k)=>{if(far&&k>0)return;const e=c.int*fade*smooth(0,7,c.t-k*5);if(e<0.03)return;const sd=((c.i*73856093^c.j*19349663)>>>0)%997/997+k*0.13;
          put(tr.x,tr.y-0.5,tr.z,tr.h*(0.45+0.95*e),tr.h*0.22+1.2,sd,e,0);if(!far)put(tr.x+0.8,tr.y-0.3,tr.z-0.6,tr.h*(0.3+0.5*e),tr.h*0.16+0.8,sd+0.5,e*0.8,0);});
        for(let k=0;k<(far?1:3);k++){const sd=((c.i*31+c.j*17+k*7)%101)/101,x=x0+2+sd*12,z=z0+2+((sd*7.3+k*0.37)%1)*12;put(x,R.sampleHr(T,x,z)-0.2,z,1.4+2.6*c.int*fade,3.2,sd+k,c.int*fade*0.9,1);}}}
    if(!n)return;if(!this._fp){this._fp=makeProgram('fire-flames',VS_FLAME,FS_FLAME);this._fb=gl.createBuffer();this._fv=gl.createVertexArray();gl.bindVertexArray(this._fv);gl.bindBuffer(gl.ARRAY_BUFFER,this._fb);
      for(const [l,o] of [[0,0],[1,16]]){gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,4,gl.FLOAT,false,32,o);gl.vertexAttribDivisor(l,1);}gl.bindVertexArray(null);}
    const p=this._fp;gl.useProgram(p.p);gl.uniform2f(p.u('uNF'),cam.near,cam.far);gl.bindBuffer(gl.ARRAY_BUFFER,this._fb);gl.bufferData(gl.ARRAY_BUFFER,A.subarray(0,n*8),gl.STREAM_DRAW);
    gl.bindVertexArray(this._fv);gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,n);Stats.draws++;gl.bindVertexArray(null);},
  lights(add){for(const f of this.list){const B=[...f.cells.values()].filter(c=>c.st==='burn').sort((a,b)=>b.int-a.int).slice(0,4);for(const c of B){const x=(c.i+0.5)*FIRE.cs,z=(c.j+0.5)*FIRE.cs;add(x,R.sampleHr(App.T,x,z)+6,z,40,[2.6*c.int,1.1*c.int,0.25*c.int]);}}},
  // the black ground of the burnt cells (one mesh, rebuilt when the set changes)
  draw(p,pass){if(!this.burnt.size||!App.T)return;const sk=this.burnt.size+'|'+this.char.length+'|'+App.T.W;if(this._sk!==sk){this._sk=sk;if(this._scorch&&R.freeMesh)R.freeMesh(this._scorch);
      const M=vmesh(),T=App.T,cs=FIRE.cs,n=4,s=cs/n,B=this.burnt,hs=(x,z)=>{const h=Math.sin(x*12.9898+z*78.233)*43758.5453;return h-Math.floor(h);},H=(x,z)=>R.sampleHr(T,x,z)+0.12;
      // a vertex's shade from a hash of its position, so neighbouring squares share it (smooth, not tiled); the rim of the burnt area is scorched brown
      const V=(x0,z0,rim)=>{/* every vertex nudged by a hash of its place (shared corners move together): no straight 16 m grid lines */const x=x0+(hs(x0+3.1,z0)-0.5)*3.4,z=z0+(hs(x0,z0+5.7)-0.5)*3.4,e=1.5,nx=H(x-e,z)-H(x+e,z),nz=H(x,z-e)-H(x,z+e),nl=Math.hypot(nx,2*e,nz),sh=0.05+0.06*hs(x,z),c=rim?[0.2,0.15,0.08]:[sh,sh*0.9,sh*0.8];
        M.v.push(x,H(x,z),z,nx/nl,2*e/nl,nz/nl,c[0],c[1],c[2],0,0,0,1,3);return M.n++;};
      for(const k of B){const i=Math.floor(k/65536),j=k%65536,nb=(di,dj)=>B.has((i+di)*65536+j+dj);
        for(let a=0;a<n;a++)for(let b=0;b<n;b++){const x0=i*cs+a*s,z0=j*cs+b*s;
          // the outer row of squares next to unburnt ground: some left out, the rest brown, so the edge is ragged
          const edge=(a===0&&!nb(-1,0))||(a===n-1&&!nb(1,0))||(b===0&&!nb(0,-1))||(b===n-1&&!nb(0,1));if(edge&&hs(x0+1.3,z0+2.7)<0.45)continue;
          const q=[V(x0,z0,edge),V(x0+s,z0,edge),V(x0+s,z0+s,edge),V(x0,z0+s,edge)];M.i.push(q[0],q[2],q[1],q[0],q[3],q[2]);}}
      // the burnt trees: black charred trunks, broken off, with a stub or two of branch
      const C=this.char,box=(a,b,r0,r1,cl)=>{const d=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],l=Math.hypot(...d)||1,u=d.map(v=>v/l),s0=Math.abs(u[1])<0.9?[0,1,0]:[1,0,0],
          x=[u[1]*s0[2]-u[2]*s0[1],u[2]*s0[0]-u[0]*s0[2],u[0]*s0[1]-u[1]*s0[0]],xl=Math.hypot(...x),X=x.map(v=>v/xl),Y=[u[1]*X[2]-u[2]*X[1],u[2]*X[0]-u[0]*X[2],u[0]*X[1]-u[1]*X[0]];
          for(let k=0;k<5;k++){const t0=k/5*Math.PI*2,t1=(k+1)/5*Math.PI*2,nm=t=>[X[0]*Math.cos(t)+Y[0]*Math.sin(t),X[1]*Math.cos(t)+Y[1]*Math.sin(t),X[2]*Math.cos(t)+Y[2]*Math.sin(t)],n0=nm(t0),n1=nm(t1),
            P=(p,nn,r)=>[p[0]+nn[0]*r,p[1]+nn[1]*r,p[2]+nn[2]*r],vs=[[P(a,n0,r0),n0],[P(a,n1,r0),n1],[P(b,n1,r1),n1],[P(b,n0,r1),n0]].map(([p,nn])=>{M.v.push(p[0],p[1],p[2],nn[0],nn[1],nn[2],cl,cl*0.95,cl*0.9,0,0,0,1,3);return M.n++;});
            M.i.push(vs[0],vs[1],vs[2],vs[0],vs[2],vs[3]);}};
      for(let k=0;k<C.length;k+=4){const x=C[k],y=C[k+1],z=C[k+2],h=C[k+3],hs2=hs(x,z),top=h*(0.35+0.35*hs2),r=0.12+h*0.018,cl=0.025+0.03*hs2;
        box([x,y-0.4,z],[x,y+top,z],r,r*0.45,cl);if(h>5){const by=y+top*0.6,a=hs2*6.28,L2=h*0.18;box([x,by,z],[x+Math.cos(a)*L2,by+L2*0.7,z+Math.sin(a)*L2],r*0.4,r*0.15,cl);
          if(hs2>0.4)box([x,by-top*0.2,z],[x-Math.cos(a+1)*L2*0.8,by+L2*0.3,z-Math.sin(a+1)*L2*0.8],r*0.35,r*0.12,cl);}}
      this._scorch=R.uploadVeh(M);}
    const m=this._scorch;gl.uniformMatrix4fv(p.u('uModel'),false,M4.ident());gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,0);Stats.draws++;},
  // compass mark and a label over the fire while flying the CL-415
  marks(){if(Plane.kind!=='cl415')return[];return this.active().map(f=>({x:f.x,z:f.z,label:'🔥',col:'#ff6a2a',ring:true}));},
  label(){let el=this._lb;const f=Plane.on&&Plane.kind==='cl415'&&Plane.st?this.nearest(Plane.st.p[0],Plane.st.p[2]):null;if(!el){el=this._lb=document.createElement('div');el.className='ilabel rsLabel';el.style.background='#e2531fe6';document.body.appendChild(el);}
    if(!f){el.style.display='none';return;}const q=Cam.toScreen(f.x,R.sampleHr(App.T,f.x,f.z)+40,f.z);if(!q){el.style.display='none';return;}const s=this.stats(f),d=Math.hypot(Plane.st.p[0]-f.x,Plane.st.p[2]-f.z);
    el.style.display='';el.style.left=q[0]+'px';el.style.top=q[1]+'px';el.innerHTML=`<b>🔥 Fire</b> ${d<1000?Math.round(d)+' m':(d/1000).toFixed(1)+' km'} · ${s.burn} burning`;},
  serialize(){return{burnt:[...this.burnt],fires:this.list.filter(f=>!f.done).map(f=>({x:f.x,z:f.z,place:f.place,hits:f.hits,water:f.water,total:f.total,H:+(f.H||0).toFixed(3),L:+(f.L||0).toFixed(3),el:Math.round(f.el||0),budget:Math.round(f.budget||FIRE.base),cells:[...f.cells.values()].map(c=>[c.i,c.j,+c.int.toFixed(2),Math.round(c.t),c.st,c.n])}))};},
  load_(d){this.list=[];this.burnt=new Set();this._sk='';this.char=[];this._tp=new Map();this.pendBurnt=d&&d.burnt&&d.burnt.length?d.burnt.slice():null;
    for(const q of (d&&d.fires)||[]){const f={id:Math.random(),x:q.x,z:q.z,place:q.place,hits:q.hits|0,water:q.water||0,total:q.total|0,t0:App.time||0,cells:new Map(),H:q.H!=null?q.H:FIRE.h0,L:q.L||0,el:q.el||0,budget:q.budget||FIRE.base};for(const c of q.cells)f.cells.set(this.key(c[0],c[1]),{i:c[0],j:c[1],int:c[2],t:c[3],st:c[4],n:c[5]});this.list.push(f);}}};

// ---- the flame shader (Fires.drawFlames): per instance base xyz + height, width + seed + strength + kind (0 a tree's tongue, standing
// up and turned to the camera; 1 low ground fire, facing the camera fully so it still reads from above)
const VS_FLAME=GLSL_HEAD+`
layout(location=0) in vec4 iA;layout(location=1) in vec4 iB;out vec2 vUV;out float vSeed;out float vE;out vec3 vW;
void main(){vec2 q=vec2(float(gl_VertexID&1)*2.-1.,float(gl_VertexID>>1));vec3 b=iA.xyz;float t=uCamPos.w;
  vec3 toC=uCamPos.xyz-b;vec3 r=normalize(vec3(toC.z,0.,-toC.x)+1e-4),up=iB.w>.5?vec3(uView[0][1],uView[1][1],uView[2][1]):vec3(0,1,0);if(iB.w>.5)r=vec3(uView[0][0],uView[1][0],uView[2][0]);
  float h=iA.w*(.82+.18*sin(t*6.3+iB.y*21.)+.08*sin(t*13.+iB.y*7.)),w=iB.x*(1.+.25*q.y);
  vec3 lean=vec3(uWind.x,0.,uWind.z)*.035*q.y*q.y*h;/* the wind bends the tips over */
  vec3 W=b+r*q.x*w+up*q.y*h+lean;vUV=q;vSeed=iB.y;vE=iB.z;vW=W;gl_Position=uViewProj*vec4(W,1.);}`;
const FS_FLAME=GLSL_HEAD+GLSL_COMMON+`
precision highp sampler3D;uniform sampler3D uNoise3;uniform sampler2D uDepthCopy;uniform vec2 uNF;in vec2 vUV;in float vSeed;in float vE;in vec3 vW;`+FS_OUT+`
float lin(float d){float z=d*2.-1.;return 2.*uNF.x*uNF.y/(uNF.y+uNF.x-z*(uNF.y-uNF.x));}
void main(){float t=uCamPos.w,y=vUV.y;vec3 np=vec3(vUV.x*.35+vSeed*5.7,y*.55-t*.9,vSeed*2.3+t*.11);
  float n=texture(uNoise3,np).r*.62+texture(uNoise3,np*2.7+vec3(.31,-t*.6,.17)).g*.38;
  float x=vUV.x+(n-.5)*.9*y+sin(y*5.+t*7.+vSeed*40.)*.12*y;/* tongues lick sideways more toward the tip */
  float wd=pow(max(1.-y,0.),.6)*.95;float d=abs(x)/max(wd,.03);
  float f=1.-smoothstep(.35,1.,d+(n-.5)*.9+y*y*.55);f*=smoothstep(0.,.07,y);if(f<.01)discard;
  float T=f*(1.-y*.8)*(.55+.45*n);
  vec3 c=mix(vec3(.55,.07,.01),vec3(1.,.36,.05),smoothstep(.08,.4,T));c=mix(c,vec3(1.,.72,.25),smoothstep(.4,.72,T));c=mix(c,vec3(1.,.95,.78),smoothstep(.75,1.,T));
  float I=f*vE*(2.2+uSunCol.w*2.5);
  {vec2 suv=gl_FragCoord.xy/vec2(textureSize(uDepthCopy,0));float th=lin(texture(uDepthCopy,suv).r)-lin(gl_FragCoord.z);I*=clamp(th/1.2,0.,1.);}/* soft where it meets the ground */
  I*=1.-smoothstep(2500.,6500.,length(vW-uCamPos.xyz));
  o=vec4(c*I,clamp(f*vE*.22,0.,1.));}`;
