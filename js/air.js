'use strict';
// ===== air.js — airstrips (4.17.0): a village upgrade from level 2 that the player places (a ghost runway: tap to move it, ⟲ ⟳ to turn,
// ✓ to build), each with a unique number and colour; flying cargo between them (land and stop: the crates are unloaded and paid by the
// distance from the airstrip where they were loaded, then a new load goes on board); and the compass, a horizontal tape at the top that
// shows N, E, S, W rolling past and coloured markers: the airstrips while flying, the next stop while driving a bus or lorry.
const AIR={len:420,w:26,price:60000,rate:200,crates:8,maxDist:2500};// runway length and width (m), price, € per km, crates per load, max distance from the village
const Air={list:[],pl:null,pending:null,job:null,cargo:null,meshes:new Map(),ghost:null,
  // ---- a unique colour per airstrip number: hues spaced by the golden angle, alternating lightness, so no two are the same
  color(n){const h=((n-1)*137.508)%360,l=n%2?52:62,s=82;return`hsl(${h.toFixed(0)},${s}%,${l}%)`;},
  rgb(n){const h=((n-1)*137.508)%360/360,l=(n%2?52:62)/100,s=0.82,f=k=>{const a=s*Math.min(l,1-l),kk=(k+h*12)%12;return l-a*Math.max(-1,Math.min(kk-3,9-kk,1));};return[f(0),f(8),f(4)];},
  // ---- placement
  startPlace(v){if(!App.T)return;if(Plane.on)Plane.exit();if(Build.active)Build.exit();const s=this.bestSpot(v);this.pl={v,x:s.x,z:s.z,h:s.h};this.ghost=null;this.check();this.ui(true);
    Cam.mode='free';Cam.anim=null;Cam.flyTo([s.x,R.sampleHr(App.T,s.x,s.z),s.z],Math.max(Cam.dist,520));UI.toast(`Airstrip for ${v.name}: tap the ground to move it, ⟲ ⟳ to turn it, ✓ to build`);},
  // a first guess: the flattest dry stretch within reach of the village, in 8 directions and 3 distances
  bestSpot(v){let best=null;for(let r of [350,700,1100])for(let k=0;k<12;k++){const a=k/12*Math.PI*2,x=v.x+Math.cos(a)*r,z=v.z+Math.sin(a)*r;for(let j=0;j<6;j++){const h=j/6*Math.PI,c=this.check({v,x,z,h},true);if(c.ok&&(!best||c.score<best.score))best={x,z,h,score:c.score};}}
    return best||{x:v.x+400,z:v.z,h:0};},
  corners(a){const c=Math.cos(a.h),s=Math.sin(a.h),L=AIR.len/2,W=AIR.w/2;return{c,s,L,W,P:(u,w)=>[a.x+c*u-s*w,a.z+s*u+c*w]};},
  check(a,quiet){a=a||this.pl;if(!a)return{ok:false};const T=App.T,{P,L,W}=this.corners(a);let lo=1e9,hi=-1e9,msg='',worst=0;
    for(let u=-L;u<=L+0.1;u+=20)for(const w of [-W,0,W]){const [x,z]=P(u,w);if(x<60||z<60||x>T.W-60||z>T.W-60){msg='Too close to the edge of the world';break;}
      const g=R.sampleHr(T,x,z),wa=sampleWater(T,x,z);if(wa[1]>0&&wa[0]>g-0.1){msg='Water is in the way';break;}lo=Math.min(lo,g);hi=Math.max(hi,g);
      if(w===0&&u>-L){const [x0,z0]=P(u-20,0),d=Math.abs(g-R.sampleHr(T,x0,z0))/20;worst=Math.max(worst,d);}}
    if(!msg&&hi-lo>9)msg=`Too uneven: ${Math.round(hi-lo)} m between the highest and lowest point`;
    if(!msg&&worst>0.06)msg='Too steep in places';
    if(!msg&&Math.hypot(a.x-a.v.x,a.z-a.v.z)>AIR.maxDist)msg=`Too far from ${a.v.name} (at most ${AIR.maxDist/1000} km)`;
    if(!msg){for(const hs of Life.houses){if(hs.gone)continue;const dx=hs.x-a.x,dz=hs.z-a.z,u=dx*Math.cos(a.h)+dz*Math.sin(a.h),w=-dx*Math.sin(a.h)+dz*Math.cos(a.h);if(Math.abs(u)<L+15&&Math.abs(w)<W+18){msg='Houses are in the way';break;}}}
    if(!msg)for(let u=-L;u<=L;u+=15){const [x,z]=P(u,0);if(Net.nearestOnTrack(x,z,W+6)){msg='The railway is in the way';break;}}
    if(!msg)for(const o of this.list){if(Math.hypot(o.x-a.x,o.z-a.z)<AIR.len+80){msg='Too close to airstrip '+o.n;break;}}
    const r={ok:!msg,msg,score:(hi-lo)+worst*200};if(!quiet&&a===this.pl){this.pl.chk=r;this.ghost=null;const el=$('#airMsg');if(el)el.textContent=r.ok?`${a.v.name} airstrip: ${(Math.hypot(a.x-a.v.x,a.z-a.v.z)/1000).toFixed(1)} km from the village, ${Math.round(hi-lo)} m fall. ✓ builds it for €${Money.fmt(AIR.price)}`:r.msg;const ok=$('#airOK');if(ok)ok.disabled=!r.ok;}return r;},
  tap(sx,sy){if(!this.pl)return false;const h=Cam.pick(sx,sy);if(!h)return true;this.pl.x=h[0];this.pl.z=h[2];this.check();return true;},
  turn(d){if(!this.pl)return;this.pl.h=wrapPi(this.pl.h+d);this.check();},
  confirm(){const a=this.pl;if(!a||!this.check().ok)return;if(Money.on()){if(!Money.canBuild()){UI.toast('Out of money');return;}Money.spend(AIR.price,`airstrip in ${a.v.name}`);}
    const n=this.list.length?Math.max(...this.list.map(o=>o.n))+1:1,s={x:a.x,z:a.z,h:a.h,v:a.v,n};this.list.push(s);a.v.airOwned=true;Life.addGrowth(a.v,40);this.pl=null;this.ghost=null;this.ui(false);
    UI.toast(`Airstrip ${n} at ${a.v.name} is open. Fly cargo to another airstrip: land and stop to unload and get paid`);Log.info(`airstrip ${n} at ${a.v.name} (${a.x.toFixed(0)}, ${a.z.toFixed(0)}) heading ${(a.h*180/Math.PI).toFixed(0)}°`);},
  cancel(){this.pl=null;this.ghost=null;this.ui(false);},
  ui(on){let el=$('#airUI');if(!el){el=document.createElement('div');el.id='airUI';el.innerHTML='<div id="airMsg"></div><div class="air-b"><button data-a="l">⟲</button><button data-a="r">⟳</button><button data-a="x">✕ Cancel</button><button data-a="ok" id="airOK" class="go">✓ Build</button></div>';document.body.appendChild(el);
      el.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;const a=t.dataset.a;if(a==='l')this.turn(-Math.PI/12);else if(a==='r')this.turn(Math.PI/12);else if(a==='x')this.cancel();else if(a==='ok')this.confirm();});}
    el.hidden=!on;if(on)this.check();},
  // ---- saving: position, heading, village, number
  serialize(){return this.list.map(s=>({x:+s.x.toFixed(1),z:+s.z.toFixed(1),h:+s.h.toFixed(4),v:Life.villages.indexOf(s.v),n:s.n}));},
  restore(){if(!this.pending||!Life.villages.length)return;this.list=this.pending.map(q=>({x:q.x,z:q.z,h:q.h,v:Life.villages[q.v]||Life.nearestVillage(q.x,q.z,1e9),n:q.n}));for(const s of this.list)if(s.v)s.v.airOwned=true;this.pending=null;this.meshes.clear();},
  // ---- meshes in world coordinates: the mown grass runway (draped on the ground), edge markers, threshold bars, the big number at
  // both ends in the airstrip's colour, a windsock, a hangar and a number board
  mesh(s){const M=vmesh(),T=App.T,{c,s:sn,L,W,P}=this.corners(s),g=(u,w)=>{const [x,z]=P(u,w);return[x,R.sampleHr(T,x,z)+0.12,z];},col=this.rgb(s.n);
    const V=(p,n,cl,m)=>{M.v.push(p[0],p[1],p[2],n[0],n[1],n[2],cl[0],cl[1],cl[2],0,0,0,1,m);return M.n++;},q=(a,b,cc,d,cl,m)=>{const ix=[a,b,cc,d].map(p=>V(p,[0,1,0],cl,m));M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);};
    for(let u=-L;u<L-0.1;u+=10)for(let w=-W;w<W-0.1;w+=W/2){const stripe=Math.floor((u+L)/20)%2,cl=stripe?[0.42,0.58,0.24]:[0.36,0.52,0.2];q(g(u,w),g(u+10,w),g(u+10,w+W/2),g(u,w+W/2),cl,0);}
    const lift=(p,d)=>[p[0],p[1]+d,p[2]];
    for(const e of [-1,1]){for(let k=0;k<8;k++){const w=-W+3+k*(2*W-6)/7.5;q(lift(g(e*(L-4),w),0.02),lift(g(e*(L-14),w),0.02),lift(g(e*(L-14),w+1.4),0.02),lift(g(e*(L-4),w+1.4),0.02),[0.95,0.95,0.92],0);}
      // the number, painted big across the runway, readable when landing toward it
      if(typeof document!=='undefined'){const cv=document.createElement('canvas'),gx=cv.getContext('2d');cv.width=64;cv.height=64;gx.fillStyle='#000';gx.fillRect(0,0,64,64);gx.fillStyle='#fff';gx.font='bold 54px Arial';gx.textAlign='center';gx.textBaseline='middle';gx.fillText(String(s.n),32,34);const d=gx.getImageData(0,0,64,64).data,px=0.3;
        for(let y=0;y<64;y++){let run=-1;for(let x=0;x<=64;x++){const on=x<64&&d[(y*64+x)*4]>120;if(on&&run<0)run=x;if(!on&&run>=0){// image x → across the runway, image y → along it (toward the threshold)
              const ua=e*(L-22-y*px),ub=e*(L-22-(y+1)*px),wa=-e*(run-32)*px,wb=-e*(x-32)*px;q(lift(g(ua,wa),0.03),lift(g(ub,wa),0.03),lift(g(ub,wb),0.03),lift(g(ua,wb),0.03),col,0);run=-1;}}}}}
    for(let u=-L;u<=L+0.1;u+=42)for(const w of [-W-1,W+1]){const p=g(u,w);for(const [a,b,cc,d] of [[[-0.4,0,-0.2],[0.4,0,-0.2],[0.4,0.35,-0.2],[-0.4,0.35,-0.2]],[[-0.4,0,0.2],[0.4,0,0.2],[0.4,0.35,0.2],[-0.4,0.35,0.2]],[[-0.4,0.35,-0.2],[0.4,0.35,-0.2],[0.4,0.35,0.2],[-0.4,0.35,0.2]]]){const T2=v=>[p[0]+c*v[0]-sn*v[2],p[1]+v[1],p[2]+sn*v[0]+c*v[2]];q(T2(a),T2(b),T2(cc),T2(d),[0.98,0.98,0.95],0);}}
    // windsock near one end, hangar and number board beside the middle
    const ws=g(-L+40,-W-14),bx=(cx,cy,cz,hx,hy,hz,cl,m)=>{const T2=(a,b2,d)=>[cx+c*a-sn*d,cy+b2,cz+sn*a+c*d];const Pp=[[-hx,-hy,-hz],[hx,-hy,-hz],[hx,hy,-hz],[-hx,hy,-hz],[-hx,-hy,hz],[hx,-hy,hz],[hx,hy,hz],[-hx,hy,hz]].map(v=>T2(...v));for(const f of [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7]]){const ix=f.map(i=>V(Pp[i],[0,1,0],cl,m));M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);}};
    bx(ws[0],ws[1]+3,ws[2],0.08,3,0.08,[0.85,0.85,0.85],0);for(let k=0;k<5;k++)bx(ws[0]+c*(0.5+k*0.55),ws[1]+5.6-k*0.08,ws[2]+sn*(0.5+k*0.55),0.28,0.32-k*0.04,0.32-k*0.04,k%2?[0.98,0.98,0.96]:[0.98,0.42,0.08],0);
    const hg=g(0,-W-34);bx(hg[0],hg[1]+2.6,hg[2],9,2.6,7,[0.5,0.52,0.54],0);bx(hg[0],hg[1]+5.6,hg[2],9.2,0.5,7.2,[0.34,0.36,0.38],0);bx(hg[0]+sn*7.05,hg[1]+2.1,hg[2]-c*7.05,6.5,2.1,0.05,[0.12,0.12,0.13],0);
    const sg=g(28,-W-12);bx(sg[0],sg[1]+1.2,sg[2],0.06,1.2,0.06,[0.3,0.25,0.2],0);bx(sg[0],sg[1]+2.8,sg[2],1.1,0.9,0.06,col,0);
    return R.uploadVeh(M);},
  ghostMesh(a){const M=vmesh(),T=App.T,{L,W,P}=this.corners(a),ok=a.chk&&a.chk.ok,cl=ok?[0.15,1,0.3]:[1,0.2,0.1],g=(u,w)=>{const [x,z]=P(u,w);return[x,R.sampleHr(T,x,z)+0.4,z];};
    const V=(p,cl2)=>{M.v.push(p[0],p[1],p[2],0,1,0,cl2[0],cl2[1],cl2[2],0,0,0,1,4);return M.n++;},q=(a2,b,c,d)=>{const ix=[a2,b,c,d].map(p=>V(p,cl));M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);};
    for(let u=-L;u<L-0.1;u+=10){for(const w of [-W,W-1.5])q(g(u,w),g(u+10,w),g(u+10,w+1.5),g(u,w+1.5));if(Math.floor((u+L)/10)%3===0)q(g(u,-0.75),g(u+10,-0.75),g(u+10,0.75),g(u,0.75));}
    for(const e of [-1,1])q(g(e*L-0.75,-W),g(e*L+0.75,-W),g(e*L+0.75,W),g(e*L-0.75,W));return R.uploadVeh(M);},
  draw(p,pass){if(!App.T)return;if(this.pending)this.restore();if(!this.list.length&&!this.pl)return;const cp=Cam.pos||[0,0,0],I=M4.ident();
    const dm=m=>{if(!m)return;gl.uniformMatrix4fv(p.u('uModel'),false,I);gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,0);Stats.draws++;Stats.tris+=m.count/3;};gl.uniform1f(p.u('uDist'),0);
    for(const s of this.list){if(Math.hypot(s.x-cp[0],s.z-cp[2])>(pass===1?900:6000))continue;let m=this.meshes.get(s);if(!m){m=this.mesh(s);this.meshes.set(s,m);}dm(m);}
    if(this.pl&&pass!==1){if(!this.ghost)this.ghost=this.ghostMesh(this.pl);dm(this.ghost);}
    if(this.job&&this.cratesAt)dm(this.crateMesh());},
  // ---- cargo flights: stopped on an airstrip → unload (paid by the distance from where it was loaded) → load
  stripAt(x,z){for(const s of this.list){const dx=x-s.x,dz=z-s.z,u=dx*Math.cos(s.h)+dz*Math.sin(s.h),w=-dx*Math.sin(s.h)+dz*Math.cos(s.h);if(Math.abs(u)<AIR.len/2+30&&Math.abs(w)<AIR.w/2+15)return s;}return null;},
  dist(a,b){return Math.hypot(a.x-b.x,a.z-b.z);},
  update(dt){if(this.pending&&Life.villages.length)this.restore();if(!Plane.on||!Plane.st||Plane.crashed||Plane.paused){if(this.job&&(!Plane.on||Plane.crashed)){this.job=null;}return;}
    const s=Plane.st,v=Math.hypot(s.v[0],s.v[2]),here=Plane.onG?this.stripAt(s.p[0],s.p[2]):null;
    if(this.job){if(v>2.5||here!==this.job.s){UI.toast(this.job.kind==='unload'?'Unloading stopped: the cargo stays on board':'Loading stopped');this.job=null;this.cratesAt=null;return;}
      const J=this.job;J.t+=dt;const k=Math.floor(J.t/J.dur*AIR.crates);while(J.shown<Math.min(k,AIR.crates)){J.shown++;Icons.add(s.p[0]+(Math.random()-0.5)*3,s.p[1]+2,s.p[2]+(Math.random()-0.5)*3,(J.kind==='unload'?'−':'+')+'📦');}
      if(J.t>=J.dur){if(J.kind==='unload'){const from=this.cargo.from,km=this.dist(from,J.s)/1000,pay=Math.round(km*AIR.rate*this.cargo.n/AIR.crates);if(Money.on()&&pay>0)Money.earn(pay,`air cargo ${from.n} → ${J.s.n}`,s.p[0],s.p[1]+3,s.p[2]);
          UI.toast(`${this.cargo.n} crates delivered from airstrip ${from.n} to ${J.s.n}: ${km.toFixed(1)} km${Money.on()?`, +€${Money.fmt(pay)}`:''}`);Log.info(`air cargo ${from.n}→${J.s.n} ${km.toFixed(2)} km €${pay}`);this.cargo=null;this.job={kind:'load',s:J.s,t:0,dur:5,shown:0};}
        else{this.cargo={from:J.s,n:AIR.crates};this.job=null;this.cratesAt=null;UI.toast(`${AIR.crates} crates loaded at airstrip ${J.s.n}: fly them to another airstrip (the compass shows them)`);}}
      this.cratesAt=[s.p[0],s.p[2],J.kind==='unload'?1-Math.min(1,J.t/J.dur):Math.min(1,J.t/J.dur)];return;}
    if(here&&v<1.2&&Plane.ctl.thr<0.35){if(this.cargo&&this.cargo.from!==here)this.job={kind:'unload',s:here,t:0,dur:5,shown:0};else if(!this.cargo)this.job={kind:'load',s:here,t:0,dur:5,shown:0};}},
  lost(){if(this.cargo){UI.toast(`The ${this.cargo.n} crates from airstrip ${this.cargo.from.n} are lost`);this.cargo=null;}this.job=null;this.cratesAt=null;},
  // crates stacked beside the plane while (un)loading: as many as are still on the ground
  crateMesh(){const [x,z,f]=this.cratesAt,n=Math.round(f*AIR.crates),key=n+'|'+x.toFixed(0)+'|'+z.toFixed(0);if(this._ck===key)return this._cm;if(this._cm){gl.deleteVertexArray(this._cm.vao);}
    const M=vmesh(),T=App.T,s=Plane.st,R2=Q.rot(s.q,[0,0,1]),F=Q.rot(s.q,[1,0,0]),bx=x+R2[0]*-6+F[0]*1.5,bz=z+R2[2]*-6+F[2]*1.5,y0=R.sampleHr(T,bx,bz);
    for(let k=0;k<n;k++){const cx=bx+(k%4)*1.0*F[0],cz=bz+(k%4)*1.0*F[2],cy=y0+0.42+Math.floor(k/4)*0.84,h=0.4;const P=[[-h,-h,-h],[h,-h,-h],[h,h,-h],[-h,h,-h],[-h,-h,h],[h,-h,h],[h,h,h],[-h,h,h]].map(v=>[cx+v[0],cy+v[1],cz+v[2]]);
      for(const [fc,nn] of [[[0,1,2,3],[0,0,-1]],[[5,4,7,6],[0,0,1]],[[4,0,3,7],[-1,0,0]],[[1,5,6,2],[1,0,0]],[[3,2,6,7],[0,1,0]]]){const ix=fc.map(i=>{M.v.push(P[i][0],P[i][1],P[i][2],nn[0],nn[1],nn[2],0.62,0.45,0.25,0,0,0,1,0);return M.n++;});M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);}}
    this._ck=key;this._cm=M.n?R.uploadVeh(M):null;return this._cm;},
  hudText(){if(this.job){const p=Math.round(this.job.t/this.job.dur*100);return` · ${this.job.kind==='unload'?'Unloading':'Loading'} 📦 ${p}%`;}return this.cargo?` · 📦 ${this.cargo.n} from ${this.cargo.from.n}`:(this.list.length?' · no cargo: stop on an airstrip':'');},
  spawnSpot(c){if(!this.list.length)return null;let best=null,bd=1e18;for(const s of this.list){const d=Math.hypot(s.x-c[0],s.z-c[2]);if(d<bd){bd=d;best=s;}}const L=AIR.len/2-30;return{x:best.x-Math.cos(best.h)*L,z:best.z-Math.sin(best.h)*L,h:best.h,s:best};}};
// ---- the compass: a horizontal tape at the top (±60° visible) with N/E/S/W rolling past, and coloured markers with distances
const Compass={el:null,cv:null,
  show(on){if(!this.el){this.el=document.createElement('div');this.el.id='compass';this.cv=document.createElement('canvas');this.el.appendChild(this.cv);document.body.appendChild(this.el);}this.el.hidden=!on;},
  // heading in degrees (0 = north = -z, 90 = east = +x), the same as the flight HUD
  deg(dx,dz){return((Math.atan2(dz,dx)*180/Math.PI+90)%360+360)%360;},
  tick(){let hd=null,pos=null,marks=[];
    if(Plane.on&&Plane.st){const F=Q.rot(Plane.st.q,[1,0,0]);hd=this.deg(F[0],F[2]);pos=Plane.st.p;for(const s of Air.list)marks.push({x:s.x,z:s.z,label:String(s.n),col:Air.color(s.n),ring:Air.cargo&&Air.cargo.from===s});}
    else if(RoadVeh.drv){const b=RoadVeh.drv;hd=this.deg(Math.cos(b.rot),Math.sin(b.rot));pos=[b.x,0,b.z];const t=Buses.cur(b);if(t)marks.push({x:t.rx,z:t.rz,label:'🚏',col:'#ffd27a',name:t.name});}
    this.show(hd!==null);if(hd===null)return;const t=performance.now();if(this._t>t-60)return;this._t=t;
    const cv=this.cv,dpr=Math.min(2,devicePixelRatio||1),W=this.el.clientWidth,H=this.el.clientHeight;if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);}
    const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);const span=120,px=W/span,X=d=>W/2+wrap(d-hd)*px,wrap=a=>((a+540)%360)-180;
    g.strokeStyle='#efe8d6aa';g.fillStyle='#efe8d6';g.lineWidth=1;g.textAlign='center';g.textBaseline='top';
    for(let d=0;d<360;d+=5){const r=wrap(d-hd);if(Math.abs(r)>span/2)continue;const x=X(d),big=d%45===0;g.beginPath();g.moveTo(x,0);g.lineTo(x,d%15===0?9:5);g.stroke();
      if(big){const L={0:'N',45:'NE',90:'E',135:'SE',180:'S',225:'SW',270:'W',315:'NW'}[d];g.font=d%90===0?'bold 14px system-ui':'11px system-ui';g.fillStyle=d===0?'#ff8a7a':'#efe8d6';g.fillText(L,x,10);}}
    g.fillStyle='#ffd27a';g.beginPath();g.moveTo(W/2-6,0);g.lineTo(W/2+6,0);g.lineTo(W/2,7);g.fill();// the heading mark
    for(const m of marks){const b=this.deg(m.x-pos[0],m.z-pos[2]),r=wrap(b-hd),d=Math.hypot(m.x-pos[0],m.z-pos[2]),edge=Math.abs(r)>span/2-4,x=edge?(r<0?14:W-14):X(b);
      g.fillStyle=m.col;g.strokeStyle='#000a';g.lineWidth=1.5;g.beginPath();g.roundRect?g.roundRect(x-12,H-26,24,17,5):g.rect(x-12,H-26,24,17);g.fill();g.stroke();if(m.ring){g.strokeStyle='#fff';g.lineWidth=2;g.stroke();}
      g.fillStyle='#111';g.font='bold 12px system-ui';g.textBaseline='middle';g.fillText(m.label,x,H-17.5);g.fillStyle='#fff';g.font='10px system-ui';g.textBaseline='top';g.fillText(d>=1000?(d/1000).toFixed(1)+' km':Math.round(d)+' m',x,H-8);
      if(edge){g.fillStyle=m.col;g.font='bold 12px system-ui';g.fillText(r<0?'◀':'▶',x+(r<0?-10:10),H-24);}g.textBaseline='top';}}};
