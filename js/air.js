'use strict';
// ===== air.js — airstrips (4.17.0): a village upgrade from level 2 that the player places (a ghost runway: tap to move it, ⟲ ⟳ to turn,
// ✓ to build), each with a unique number and colour; flying cargo between them (land and stop: the crates are unloaded and paid by the
// distance from the airstrip where they were loaded, then a new load goes on board); and the compass, a horizontal tape at the top that
// shows N, E, S, W rolling past and coloured markers: the airstrips while flying, the next stop while driving a bus or lorry.
const AIR={len:600,w:28,price:60000,rate:200,crates:8,maxDist:1000,fill:6};// runway length and width (m), price, € per km, crates per load, max distance from the village
const Air={list:[],pl:null,pending:null,job:null,cargo:null,meshes:new Map(),ghost:null,
  // ---- a unique colour per airstrip number: hues spaced by the golden angle, alternating lightness, so no two are the same
  color(n){const h=((n-1)*137.508)%360,l=n%2?52:62,s=82;return`hsl(${h.toFixed(0)},${s}%,${l}%)`;},
  rgb(n){const h=((n-1)*137.508)%360/360,l=(n%2?52:62)/100,s=0.82,f=k=>{const a=s*Math.min(l,1-l),kk=(k+h*12)%12;return l-a*Math.max(-1,Math.min(kk-3,9-kk,1));};return[f(0),f(8),f(4)];},
  // ---- placement
  startPlace(v){if(!App.T)return;if(Plane.on)Plane.exit();if(Build.active)Build.exit();const s=this.bestSpot(v);this.pl={v,x:s.x,z:s.z,h:s.h};(R.freeMesh(this.ghost),this.ghost=null);this.check();this.ui(true);
    Cam.mode='free';Cam.anim=null;Cam.flyTo([s.x,R.sampleHr(App.T,s.x,s.z),s.z],Math.max(Cam.dist,520));UI.toast(`Airstrip for ${v.name}: tap the ground to move it, ⟲ ⟳ to turn it, ✓ to build`);},
  // a first guess: the flattest dry stretch within reach of the village, in 8 directions and 3 distances
  bestSpot(v){let best=null;for(let r of [380,520,660,800,920])for(let k=0;k<24;k++){if(best&&best.score<4)break;const a=k/24*Math.PI*2,x=v.x+Math.cos(a)*r,z=v.z+Math.sin(a)*r;for(let j=0;j<12;j++){const h=j/12*Math.PI,c=this.check({v,x,z,h},true);if(c.ok&&(!best||c.score<best.score))best={x,z,h,score:c.score};}}
    return best||{x:v.x+400,z:v.z,h:0};},
  corners(a){const c=Math.cos(a.h),s=Math.sin(a.h),L=AIR.len/2,W=AIR.w/2;return{c,s,L,W,P:(u,w)=>[a.x+c*u-s*w,a.z+s*u+c*w]};},
  // the runway's grade line: a straight line fitted along the centre (slope at most 3%), raised over streams (they run under it in a
  // culvert); null if a lake, the sea or a wide river is in the way
  line(a){const T=App.T,{P,L}=this.corners(a);const U=[],Hs=[];let wet=0,lake=false,wmax=-1e9;
    for(let u=-L-20;u<=L+20.1;u+=10){const [x,z]=P(u,0);const g=R.sampleHr(T,x,z),w=sampleWater(T,x,z);U.push(u);Hs.push(g);
      if(w[1]>0&&w[0]>g-0.1){const N=T.N,ci=clamp(Math.floor(x/T.cs),0,N-1),cj=clamp(Math.floor(z/T.cs),0,N-1),kd=T.water[(cj*N+ci)*4+3];if(kd>0.75&&kd<1.5)lake=true;wet+=10;wmax=Math.max(wmax,w[0]);}}
    const n=U.length,mu=U.reduce((p,q)=>p+q,0)/n,mh=Hs.reduce((p,q)=>p+q,0)/n;let sxy=0,sxx=0;for(let k=0;k<n;k++){sxy+=(U[k]-mu)*(Hs[k]-mh);sxx+=(U[k]-mu)*(U[k]-mu);}
    const m=clamp(sxx?sxy/sxx:0,-0.03,0.03);let c=mh-m*mu;for(let k=0;k<n;k++){const [x,z]=P(U[k],0),w=sampleWater(T,x,z);if(w[1]>0&&w[0]>Hs[k]-0.1)c=Math.max(c,w[0]+0.6-m*U[k]);}
    return{m,c,lake,wet,at:u=>c+m*u};},
  check(a,quiet){a=a||this.pl;if(!a)return{ok:false};const T=App.T,{P,L,W}=this.corners(a);let msg='',dev=0;
    for(let u=-L;u<=L+0.1;u+=25)for(const w of [-W,0,W]){const [x,z]=P(u,w);if(x<60||z<60||x>T.W-60||z>T.W-60){msg='Too close to the edge of the world';break;}}
    const ln=msg?null:this.line(a);
    if(!msg&&ln.lake)msg='A lake or the sea is in the way';
    /* the runway keeps its straight line: higher ground is cut away, lower ground filled up to 6 m, and deeper than that the runway stands on a
       concrete deck on piers (streams and rivers run under it); only very deep cuttings or very tall piers are refused */
    let cut=0,pier=0;if(!msg){for(let u=-L;u<=L+0.1;u+=20)for(const w of [-W,0,W]){const [x,z]=P(u,w),gh=R.sampleHr(T,x,z),d=gh-ln.at(u);dev=Math.max(dev,Math.abs(d));cut=Math.max(cut,d);pier=Math.max(pier,-d-AIR.fill);}
      if(cut>60)msg=`Too steep here: a ${Math.round(cut)} m cutting into the hill`;else if(pier>45)msg=`Too steep here: piers ${Math.round(pier)} m tall`;}a.cut=cut;a.pier=Math.max(0,pier);
    if(!msg&&Math.hypot(a.x-a.v.x,a.z-a.v.z)>AIR.maxDist)msg=`Too far from ${a.v.name} (at most ${AIR.maxDist/1000} km)`;
    if(!msg){for(const hs of Life.houses){if(hs.gone)continue;const dx=hs.x-a.x,dz=hs.z-a.z,u=dx*Math.cos(a.h)+dz*Math.sin(a.h),w=-dx*Math.sin(a.h)+dz*Math.cos(a.h);if(Math.abs(u)<L+15&&w<W+18&&w>-W-56){msg='Houses are in the way';break;}/* the apron and buildings lie on the -w side */}}
    if(!msg)for(let u=-L;u<=L;u+=15){const [x,z]=P(u,0);if(Net.nearestOnTrack(x,z,W+6)){msg='The railway is in the way';break;}}
    if(!msg)for(const o of this.list){if(o.water)continue;if(Math.hypot(o.x-a.x,o.z-a.z)<AIR.len+80){msg='Too close to airstrip '+o.n;break;}}
    const r={ok:!msg,msg,score:dev+(ln?Math.abs(ln.m)*100+ln.wet*0.05:99)};if(!quiet&&a===this.pl){this.pl.chk=r;(R.freeMesh(this.ghost),this.ghost=null);const el=$('#airMsg');if(el)el.textContent=r.ok?`${a.v.name} airstrip: ${(Math.hypot(a.x-a.v.x,a.z-a.v.z)/1000).toFixed(1)} km from the village, ${Math.round(Math.min(dev,a.cut+AIR.fill))} m of grading${a.pier>0.5?`, a concrete deck on piers up to ${Math.round(a.pier)} m`:''}${ln.wet?', the water passes under it':''}. ✓ builds it for €${Money.fmt(AIR.price)}`:r.msg;const ok=$('#airOK');if(ok)ok.disabled=!r.ok;}return r;},
  // grade the ground: the runway, its shoulders and the hangar side follow the line; blended into the land over 25 m
  grade(s){const T=App.T,N=T.N,cs=T.cs,ln=this.line(s),c=Math.cos(s.h),sn=Math.sin(s.h),L=AIR.len/2,W=AIR.w/2,M=25,u0=-L-12,u1=L+12,w0=-W-55,w1=W+18,R2=L+M+60;
    const i0=Math.max(0,Math.floor((s.x-R2)/cs)),i1=Math.min(N-1,Math.ceil((s.x+R2)/cs)),j0=Math.max(0,Math.floor((s.z-R2)/cs)),j1=Math.min(N-1,Math.ceil((s.z+R2)/cs));
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const x=i*cs,z=j*cs,dx=x-s.x,dz=z-s.z,u=dx*c+dz*sn,w=-dx*sn+dz*c,ou=Math.max(0,u0-u,u-u1),ow=Math.max(0,w0-w,w-w1),o=Math.hypot(ou,ow);if(o>M)continue;
      const wt=o<=0?1:1-(o/M)*(o/M)*(3-2*o/M),k=j*N+i,g=ln.at(clamp(u,-L,L)),h=T.Hr[k],tg=h>g?g:Math.min(g,h+AIR.fill);T.Hr[k]=h+(tg-h)*wt;}
    R.patchTerrain(T,i0,j0,i1,j1);R.dryWater(T,i0,j0,i1,j1);s.graded=true;s.ln={m:ln.m,c:ln.c};},
  /* the runway surface where a plane stands on it: the line over the deck and the graded ground alike (null off the runways) */
  nm(s){return s?(s.water?'jetty ':'airstrip ')+s.n:'';},
  // ---- seaplane jetties (4.24.0, for the Beaver): on the shore nearest a village, where the water is deep enough off its head and a
  // straight run of at least 600 m of open water lets the Beaver take off and land
  jettySpot(v){if(v._jsp!==undefined&&v._jspT===this.list.length)return v._jsp;v._jspT=this.list.length;const T=App.T,wy=(x,z)=>Beaver.waterY(x,z),deep=(x,z,d)=>{const w=wy(x,z);return w!=null&&w-R.sampleHr(T,x,z)>d;};let best=null;
    for(let k=0;k<36;k++){const a=k/36*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a);let prevDry=true;for(let r=40;r<=750;r+=12){const x=v.x+ca*r,z=v.z+sa*r;if(x<80||z<80||x>T.W-80||z>T.W-80)break;const wet=wy(x,z)!=null;
        if(wet&&prevDry){/* the shore: the jetty runs out along a, its head 24 m off the shore in at least 1.2 m of water */const hx=x+ca*24,hz=z+sa*24;if(!deep(hx,hz,1.2))break;
          let run=0;for(let j=0;j<16;j++){const h=j/16*Math.PI*2;let L=0;for(let t=20;t<=900;t+=20){const px=hx+Math.cos(h)*t,pz=hz+Math.sin(h)*t,cx=px+Math.cos(h+1.57)*25,cz=pz+Math.sin(h+1.57)*25,dx=px-Math.cos(h+1.57)*25,dz=pz-Math.sin(h+1.57)*25;if(!deep(px,pz,0.8)||!deep(cx,cz,0.3)||!deep(dx,dz,0.3))break;L=t;}run=Math.max(run,L);}
          if(run>=600&&!this.list.some(o=>Math.hypot(o.x-hx,o.z-hz)<200)&&!Life.houses.some(q=>!q.gone&&Math.hypot(q.x-x,q.z-z)<q.r+10)){const sc=r+(900-run)*0.2;if(!best||sc<best.sc)best={x:hx,z:hz,h:a,sx:x-ca*6,sz:z-sa*6,sc,run};}break;}prevDry=!wet;}}
    v._jsp=best;return best;},
  buildJetty(v){const sp=this.jettySpot(v);if(!sp){UI.toast(`${v.name} has no shore with 600 m of open water for a seaplane`);return;}const U=Life.UPG.jetty;if(Money.on()){if(!Money.canBuild()){UI.toast('Out of money');return;}Money.spend(U.cost,`seaplane jetty in ${v.name}`);}
    const n=this.list.length?Math.max(...this.list.map(o=>o.n))+1:1,s={x:sp.x,z:sp.z,h:sp.h,sx:sp.sx,sz:sp.sz,v,n,water:true};this.list.push(s);v.jettyOwned=true;Life.addGrowth(v,U.growth);Life.upgApplied(v,'jetty');
    UI.toast(`Jetty ${n} at ${v.name} is open: land the Beaver on the water and stop beside it to load or unload crates`);Log.info(`jetty ${n} at ${v.name} (${sp.x.toFixed(0)}, ${sp.z.toFixed(0)}), ${sp.run} m of water`);if(VillageUI.cur===v)VillageUI.refresh(v);},
  /* a wooden walkway from the shore out to a floating T-head with tyre fenders (the photos' dock), piles at its corners, a boat shed on the
     shore and the jetty's number board in its colour */
  jettyMesh(s){const M=vmesh(),T=App.T,wl=Beaver.waterY(s.x,s.z)??R.sampleHr(T,s.x,s.z),c=Math.cos(s.h),sn=Math.sin(s.h),col=this.rgb(s.n),WD=[0.55,0.4,0.25],WD2=[0.47,0.33,0.2],PO=[0.32,0.25,0.18],TY2=[0.04,0.04,0.045];
    const V=(p,n,cl,m)=>{M.v.push(p[0],p[1],p[2],n[0],n[1],n[2],cl[0],cl[1],cl[2],0,0,0,1,m);return M.n++;},q=(a,b,cc,d,n,cl,m)=>{const ix=[a,b,cc,d].map(p=>V(p,n,cl,m||0));M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);};
    const L=(u,w,y)=>[s.x+c*u-sn*w,y,s.z+sn*u+c*w];/* u along the jetty (0 at the head, negative toward the shore), w across */
    const box=(u,w,y,hu,hw,hy,cl)=>{const P=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(v=>L(u+v[0]*hu,w+v[2]*hw,y+v[1]*hy));for(const [f,n] of [[[0,1,2,3],[0,0,-1]],[[5,4,7,6],[0,0,1]],[[4,0,3,7],[-1,0,0]],[[1,5,6,2],[1,0,0]],[[3,2,6,7],[0,1,0]]])q(P[f[0]],P[f[1]],P[f[2]],P[f[3]],n,cl);};
    const shoreU=-Math.hypot(s.x-s.sx,s.z-s.sz),gS=R.sampleHr(T,s.sx,s.sz),dY=wl+0.45;
    // the walkway: planks across, from the shore (on the ground) sloping to the dock
    for(let u=shoreU;u<-3;u+=0.6){const f=(u-shoreU)/(-3-shoreU),y=lerp(Math.max(gS+0.25,dY),dY,Math.min(1,f*1.6));q(L(u,-1.1,y),L(u+0.55,-1.1,y),L(u+0.55,1.1,y),L(u,1.1,y),[0,1,0],(Math.round(u/0.6)%2)?WD:WD2);}
    for(let u=shoreU+2;u<-3;u+=4)for(const w of [-1.15,1.15])box(u,w,(wl-2+dY)/2,0.12,0.12,(dY-wl+2)/2,PO);// piles
    // the T-head: 18 m across, 3.2 m deep, on pontoons; fenders of old tyres along its outer edge
    for(let w=-9;w<9;w+=0.6)q(L(-3,w,dY),L(0.2,w,dY),L(0.2,w+0.55,dY),L(-3,w+0.55,dY),[0,1,0],(Math.round(w/0.6)%2)?WD:WD2);
    box(-1.4,0,dY-0.3,1.6,9,0.28,[0.36,0.36,0.38]);box(0.15,0,dY-0.05,0.08,9,0.2,PO);
    for(let w=-8.4;w<=8.4;w+=1.2){const cx=0.42,cy=dY-0.3;for(let k=0;k<10;k++){const a0=k/10*Math.PI*2,a1=(k+1)/10*Math.PI*2,R0=0.32,r=0.12;for(let j=0;j<6;j++){const b0=j/6*Math.PI*2,b1=(j+1)/6*Math.PI*2,P=(a,b)=>L(cx+Math.cos(b)*r,w+Math.cos(a)*(R0+r*Math.sin(b))*0.6,cy+Math.sin(a)*(R0+r*Math.sin(b)));q(P(a0,b0),P(a1,b0),P(a1,b1),P(a0,b1),[0,1,0],TY2);}}}
    for(const w of [-9,9])for(const u of [-3,0.2])box(u,w,(wl-2+dY+1.2)/2,0.14,0.14,(dY+1.2-wl+2)/2,PO);
    // the shed on the shore and the number board
    const sh=L(shoreU-7,-6,0),gy=R.sampleHr(T,sh[0],sh[2]);box(shoreU-7,-6,gy+1.4,3,2.5,1.4,[0.55,0.3,0.2]);box(shoreU-7,-6,gy+3.0,3.3,2.8,0.22,[0.25,0.25,0.27]);
    box(shoreU-1,3,Math.max(gS,dY)+1.3,0.06,0.06,1.3,PO);box(shoreU-1,3,Math.max(gS,dY)+2.8,0.06,0.9,0.7,col);
    return R.uploadVeh(M);},
  deckAt(x,z){for(const s of this.list){if(!s.ln||s.water)continue;const dx=x-s.x,dz=z-s.z,c=Math.cos(s.h),sn=Math.sin(s.h),u=dx*c+dz*sn,w=-dx*sn+dz*c;if(Math.abs(u)<=AIR.len/2+2&&Math.abs(w)<=AIR.w/2+1)return s.ln.c+s.ln.m*u;}return null;},
  tap(sx,sy){if(!this.pl)return false;const h=Cam.pick(sx,sy);if(!h)return true;this.pl.x=h[0];this.pl.z=h[2];this.check();return true;},
  turn(d){if(!this.pl)return;this.pl.h=wrapPi(this.pl.h+d);this.check();},
  confirm(){const a=this.pl;if(!a||!this.check().ok)return;if(Money.on()){if(!Money.canBuild()){UI.toast('Out of money');return;}Money.spend(AIR.price,`airstrip in ${a.v.name}`);}
    const n=this.list.length?Math.max(...this.list.map(o=>o.n))+1:1,s={x:a.x,z:a.z,h:a.h,v:a.v,n};this.grade(s);this.list.push(s);a.v.airOwned=true;Life.addGrowth(a.v,40);this.pl=null;(R.freeMesh(this.ghost),this.ghost=null);this.ui(false);
    UI.toast(`Airstrip ${n} at ${a.v.name} is open. Fly cargo to another airstrip: land and stop to unload and get paid`);Log.info(`airstrip ${n} at ${a.v.name} (${a.x.toFixed(0)}, ${a.z.toFixed(0)}) heading ${(a.h*180/Math.PI).toFixed(0)}°`);},
  cancel(){this.pl=null;(R.freeMesh(this.ghost),this.ghost=null);this.ui(false);},
  ui(on){let el=$('#airUI');if(!el){el=document.createElement('div');el.id='airUI';el.innerHTML='<div id="airMsg"></div><div class="air-b"><button data-a="l">⟲</button><button data-a="r">⟳</button><button data-a="x">✕ Cancel</button><button data-a="ok" id="airOK" class="go">✓ Build</button></div>';document.body.appendChild(el);
      el.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;const a=t.dataset.a;if(a==='l')this.turn(-Math.PI/12);else if(a==='r')this.turn(Math.PI/12);else if(a==='x')this.cancel();else if(a==='ok')this.confirm();});}
    el.hidden=!on;if(on)this.check();},
  // ---- saving: position, heading, village, number
  serialize(){return this.list.map(s=>({x:+s.x.toFixed(1),z:+s.z.toFixed(1),h:+s.h.toFixed(4),v:Life.villages.indexOf(s.v),n:s.n,...(s.water?{w:1,sx:+s.sx.toFixed(1),sz:+s.sz.toFixed(1)}:{})}));},
  restore(){if(!this.pending||!Life.villages.length)return;this.list=this.pending.map(q=>({x:q.x,z:q.z,h:q.h,v:Life.villages[q.v]||Life.nearestVillage(q.x,q.z,1e9),n:q.n,...(q.w?{water:true,sx:q.sx,sz:q.sz}:{})}));for(const s of this.list){if(s.water){if(s.v)s.v.jettyOwned=true;continue;}if(s.v)s.v.airOwned=true;this.grade(s);}this.pending=null;this.meshes.clear();},
  // ---- meshes in world coordinates: the mown grass runway (draped on the ground), edge markers, threshold bars, the big number at
  // both ends in the airstrip's colour, a windsock, a hangar and a number board
  mesh(s){const M=vmesh(),T=App.T,{c,s:sn,L,W,P}=this.corners(s),ln=s.ln||{m:0,c:R.sampleHr(T,s.x,s.z)},lineY=u=>ln.c+ln.m*clamp(u,-L,L),g=(u,w)=>{const [x,z]=P(u,w);return[x,Math.abs(u)<=L+0.1&&Math.abs(w)<=W+0.1?Math.max(R.sampleHr(T,x,z),lineY(u))+0.12:R.sampleHr(T,x,z)+0.12,z];},col=this.rgb(s.n),onDeck=(u,w)=>{const [x,z]=P(u,w);return R.sampleHr(T,x,z)<lineY(u)-0.4;};
    const V=(p,n,cl,m)=>{M.v.push(p[0],p[1],p[2],n[0],n[1],n[2],cl[0],cl[1],cl[2],0,0,0,1,m);return M.n++;},q=(a,b,cc,d,cl,m)=>{const ix=[a,b,cc,d].map(p=>V(p,[0,1,0],cl,m));M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);},lift0=(p,d)=>[p[0],p[1]+d,p[2]],lift=lift0;
    /* 4.33.0 (the user's reference pictures): an asphalt runway with white edge lines and centre dashes; concrete on a deck */
    for(let u=-L;u<L-0.1;u+=10)for(let w=-W;w<W-0.1;w+=W/2){const stripe=Math.floor((u+L)/20)%2,mid=Math.abs(w+W/4)<W*0.3,cl=onDeck(u+5,w+W/4)?[0.5,0.5,0.49]:mid?(stripe?[0.56,0.5,0.36]:[0.6,0.53,0.38]):(stripe?[0.5,0.68,0.27]:[0.44,0.62,0.24]);q(g(u,w),g(u+10,w),g(u+10,w+W/2),g(u,w+W/2),cl,0);}/* 4.34.0: a mown grass strip, worn to dirt down the middle where the wheels run */
    {const wl=[0.95,0.95,0.92];for(const e of [-1,1])for(let u=-L+20;u<L-10;u+=50)q(lift0(g(u,e*(W-1.6)),0.03),lift0(g(u+3,e*(W-1.6)),0.03),lift0(g(u+3,e*(W-0.4)),0.03),lift0(g(u,e*(W-0.4)),0.03),wl,0);}/* white edge markers every 50 m */
    // the concrete deck: a fascia along both edges and square piers down to the ground every 15 m where the land falls away
    {const cc=[0.58,0.58,0.56],cd=[0.48,0.48,0.47];for(const e of [-1,1])for(let u=-L;u<L-0.1;u+=5){if(!onDeck(u+2.5,e*W*0.9))continue;const a=P(u,e*(W+0.3)),b=P(u+5,e*(W+0.3)),ya=lineY(u)+0.12,yb=lineY(u+5)+0.12;q([a[0],ya-1.3,a[1]],[b[0],yb-1.3,b[1]],[b[0],yb,b[1]],[a[0],ya,a[1]],cd,0);}
      for(let u=-L+6;u<=L-6;u+=15)for(const w of [-W+2,0,W-2]){const [x,z]=P(u,w),gy=R.sampleHr(T,x,z),top=lineY(u)-1.2;if(top-gy<0.6)continue;const hh=(top-gy+1)/2,T2=(a2,b2,d2)=>[x+c*a2-sn*d2,gy-1+hh+b2,z+sn*a2+c*d2];
        for(const f of [[[-0.8,-hh,-0.8],[0.8,-hh,-0.8],[0.8,hh,-0.8],[-0.8,hh,-0.8]],[[0.8,-hh,0.8],[-0.8,-hh,0.8],[-0.8,hh,0.8],[0.8,hh,0.8]],[[-0.8,-hh,0.8],[-0.8,-hh,-0.8],[-0.8,hh,-0.8],[-0.8,hh,0.8]],[[0.8,-hh,-0.8],[0.8,-hh,0.8],[0.8,hh,0.8],[0.8,hh,-0.8]]])q(T2(...f[0]),T2(...f[1]),T2(...f[2]),T2(...f[3]),cc,0);}}
    for(const e of [-1,1]){for(let k=0;k<8;k++){const w=-W+3+k*(2*W-6)/7.5;q(lift(g(e*(L-4),w),0.02),lift(g(e*(L-14),w),0.02),lift(g(e*(L-14),w+1.4),0.02),lift(g(e*(L-4),w+1.4),0.02),[0.95,0.95,0.92],0);}
      // the number, painted big across the runway, readable when landing toward it
      if(typeof document!=='undefined'){const cv=document.createElement('canvas'),gx=cv.getContext('2d');cv.width=64;cv.height=64;gx.fillStyle='#000';gx.fillRect(0,0,64,64);gx.fillStyle='#fff';gx.font='bold 54px Arial';gx.textAlign='center';gx.textBaseline='middle';gx.fillText(String(s.n),32,34);const d=gx.getImageData(0,0,64,64).data,px=0.3;
        for(let y=0;y<64;y++){let run=-1;for(let x=0;x<=64;x++){const on=x<64&&d[(y*64+x)*4]>120;if(on&&run<0)run=x;if(!on&&run>=0){// image x → across the runway, image y → along it (toward the threshold)
              const ua=e*(L-22-y*px),ub=e*(L-22-(y+1)*px),wa=-e*(run-32)*px,wb=-e*(x-32)*px;q(lift(g(ua,wa),0.03),lift(g(ub,wa),0.03),lift(g(ub,wb),0.03),lift(g(ua,wb),0.03),[0.95,0.95,0.92],0);run=-1;}}}}}
    for(let u=-L;u<=L+0.1;u+=40)for(const w of [-W-1,W+1]){const p=g(u,w);for(const [a,b,cc,d,cl] of [[[-0.15,0,-0.15],[0.15,0,-0.15],[0.15,0.35,-0.15],[-0.15,0.35,-0.15],[0.25,0.24,0.2]],[[-0.15,0,0.15],[0.15,0,0.15],[0.15,0.35,0.15],[-0.15,0.35,0.15],[0.25,0.24,0.2]],[[-0.2,0.35,-0.2],[0.2,0.35,-0.2],[0.2,0.6,-0.2],[-0.2,0.6,-0.2],[1,0.82,0.42]],[[-0.2,0.35,0.2],[0.2,0.35,0.2],[0.2,0.6,0.2],[-0.2,0.6,0.2],[1,0.82,0.42]],[[-0.2,0.6,-0.2],[0.2,0.6,-0.2],[0.2,0.6,0.2],[-0.2,0.6,0.2],[1,0.9,0.6]]]){const T2=v=>[p[0]+c*v[0]-sn*v[2],p[1]+v[1],p[2]+sn*v[0]+c*v[2]];q(T2(a),T2(b),T2(cc),T2(d),cl,0);}}/* edge lights, amber */
    // windsock near one end, hangar and number board beside the middle
    const ws=g(-L+40,-W-14),bx=(cx,cy,cz,hx,hy,hz,cl,m)=>{const T2=(a,b2,d)=>[cx+c*a-sn*d,cy+b2,cz+sn*a+c*d];const Pp=[[-hx,-hy,-hz],[hx,-hy,-hz],[hx,hy,-hz],[-hx,hy,-hz],[-hx,-hy,hz],[hx,-hy,hz],[hx,hy,hz],[-hx,hy,hz]].map(v=>T2(...v));for(const f of [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7]]){const ix=f.map(i=>V(Pp[i],[0,1,0],cl,m));M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);}};
    bx(ws[0],ws[1]+3,ws[2],0.08,3,0.08,[0.85,0.85,0.85],0);for(let k=0;k<5;k++)bx(ws[0]+c*(0.5+k*0.55),ws[1]+5.6-k*0.08,ws[2]+sn*(0.5+k*0.55),0.28,0.32-k*0.04,0.32-k*0.04,k%2?[0.98,0.98,0.96]:[0.98,0.42,0.08],0);
    /* the airfield beside the middle of the runway (w < -W): concrete apron, arched hangar, control tower, fuel, a lean-to, a fence, a sign */
    const by=lineY(0)+0.12,Lb=(u,y,w)=>{const [x,z]=P(u,w);return[x,by+y,z];},LB=(u0,y0,w0,hu,hy,hw,cl,m)=>{const pp=[[-hu,-hy,-hw],[hu,-hy,-hw],[hu,hy,-hw],[-hu,hy,-hw],[-hu,-hy,hw],[hu,-hy,hw],[hu,hy,hw],[-hu,hy,hw]].map(v=>Lb(u0+v[0],y0+v[1],w0+v[2]));
      for(const f of [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7]]){const ix=f.map(i=>V(pp[i],[0,1,0],cl,m||0));M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);}};
    const LQ=(a,b2,cc,d,cl)=>q(Lb(...a),Lb(...b2),Lb(...cc),Lb(...d),cl,0);
    // apron: concrete slabs with dark joints on a plinth that hides the slope, a yellow taxi line and a parking box
    const aw0=-W-2,aw1=-W-50,au=48;LB(0,-1.4,(aw0+aw1)/2,au,1.5,(aw0-aw1)/2,[0.45,0.37,0.27]);
    for(let u=-au;u<au;u+=8)for(let w=aw1;w<aw0;w+=8){const sh=(((u*7+w*13)|0)%5)*0.012;LQ([u,0.12,w],[u+8,0.12,w],[u+8,0.12,w+8],[u,0.12,w+8],[0.55+sh,0.48+sh,0.36+sh]);}/* a gravel and dirt apron */
    const yl=[0.92,0.76,0.18];for(let u=-au+2;u<au-2;u+=4)LQ([u,0.14,-W-6.2],[u+2.5,0.14,-W-6.2],[u+2.5,0.14,-W-5.8],[u,0.14,-W-5.8],yl);
    for(const [a1,b1,c1,d1] of [[0,-W-14,0.3,-W-30],[18,-W-14,18.3,-W-30],[0,-W-14,18.3,-W-14.3],[0,-W-29.7,18.3,-W-30]])LQ([a1,0.14,b1],[c1,0.14,b1],[c1,0.14,d1],[a1,0.14,d1],yl);
    // the hangar: green-grey walls, an arched corrugated roof (ridge across the runway), doors slid open to the apron, dark inside, a rooster vane
    {const hu=-14,hw=-W-40,HX=11,HZ=9,wh=5,wall=[0.36,0.46,0.43],rf=[0.44,0.44,0.47],dk=[0.06,0.06,0.07];LB(hu,0.1,hw,HX+0.2,0.25,HZ+0.2,[0.45,0.44,0.42]);
      LB(hu,wh/2,hw-HZ,HX,wh/2,0.2,wall);LB(hu-HX,wh/2,hw,0.2,wh/2,HZ,wall);LB(hu+HX,wh/2,hw,0.2,wh/2,HZ,wall);LB(hu,wh/2,hw,HX-0.3,wh/2,HZ-0.3,dk);
      for(const sd of [-1,1]){LB(hu+sd*(HX-2.5),wh/2,hw+HZ+0.3,2.6,wh/2,0.15,wall);for(const dx of [-1.2,1.2])LB(hu+sd*(HX-2.5)+dx,wh/2,hw+HZ+0.47,0.08,wh/2-0.2,0.04,[0.9,0.88,0.82]);}
      const NA=12;for(let k=0;k<NA;k++){const a0=Math.PI*k/NA,a1=Math.PI*(k+1)/NA,X0=Math.cos(a0)*(HX+0.4),Y0=Math.sin(a0)*3.4+wh,X1=Math.cos(a1)*(HX+0.4),Y1=Math.sin(a1)*3.4+wh;
        LQ([hu+X0,Y0,hw-HZ-0.5],[hu+X1,Y1,hw-HZ-0.5],[hu+X1,Y1,hw+HZ+0.5],[hu+X0,Y0,hw+HZ+0.5],k%2?rf:[rf[0]*0.9,rf[1]*0.9,rf[2]*0.92]);
        for(const e of [-1,1])LQ([hu+X0,wh,hw+e*HZ],[hu+X1,wh,hw+e*HZ],[hu+X1,Y1,hw+e*HZ],[hu+X0,Y0,hw+e*HZ],wall);}
      LB(hu,wh+3.4+0.9,hw,0.05,0.9,0.05,[0.2,0.2,0.2]);LB(hu+0.2,wh+3.4+1.9,hw,0.45,0.3,0.06,[0.55,0.35,0.15]);LB(hu,wh+2.2,hw+HZ+0.6,1.4,0.9,0.08,[0.7,0.62,0.45]);}
    // the control tower: a timber two-storey building, a glass cab with a railed gallery, a flat roof, an antenna with a red light
    {const tu=20,tw=-W-42,wd=[0.5,0.34,0.22],tr=[0.36,0.25,0.17],gl=[0.95,0.75,0.4];LB(tu,3,tw,6,3,5,wd);LB(tu,6.2,tw,6.4,0.2,5.4,tr);
      for(const [du,dy] of [[-3,1.6],[0,1.6],[3,1.6],[-3,4.4],[0,4.4],[3,4.4]])LB(tu+du,dy,tw+5.02,0.7,0.6,0.05,gl);LB(tu+4.5,1.1,tw+5.02,0.6,1.1,0.06,[0.3,0.22,0.16]);
      LB(tu-1,8.2,tw,3,1.9,3,wd);LB(tu-1,11.4,tw,2.6,1.3,2.6,[0.15,0.2,0.24]);for(const e of [-1,1]){LB(tu-1+e*2.6,11.4,tw,0.1,1.3,2.7,tr);LB(tu-1,11.4,tw+e*2.6,2.7,1.3,0.1,tr);}LB(tu-1,11.4,tw,2.62,0.06,2.62,gl);
      LB(tu-1,10.15,tw,3.8,0.12,3.8,tr);for(let k=0;k<12;k++){const a=k/12*6.283,ru=3.6;LB(tu-1+Math.cos(a)*ru,10.8,tw+Math.sin(a)*ru,0.06,0.6,0.06,tr);}LB(tu-1,11.35,tw+3.6,3.7,0.05,0.05,tr);LB(tu-1,11.35,tw-3.6,3.7,0.05,0.05,tr);LB(tu-4.6,11.35,tw,0.05,0.05,3.7,tr);LB(tu+2.6,11.35,tw,0.05,0.05,3.7,tr);
      LB(tu-1,12.85,tw,3,0.15,3,[0.3,0.3,0.32]);LB(tu-1,14.6,tw,0.06,1.6,0.06,[0.6,0.6,0.62]);LB(tu-1,16.3,tw,0.2,0.2,0.2,[1,0.15,0.1]);}
    // fuel: a white tank on cradles and a red pump; a lean-to shed with crates; a picnic table; a sign with a plane
    {LB(-32,1.5,-W-22,2.3,1.1,1.1,[0.92,0.9,0.85]);for(const e of [-1.6,1.6])LB(-32+e,0.5,-W-22,0.15,0.5,1,[0.3,0.3,0.32]);LB(-27.5,1,-W-21,0.45,1,0.4,[0.78,0.12,0.1]);LB(-27.5,1.5,-W-20.58,0.3,0.25,0.03,[0.95,0.92,0.8]);
      const su=-40,sw=-W-40,wd2=[0.45,0.33,0.22];for(const [du,dw] of [[-4,-3],[4,-3],[-4,3],[4,3]])LB(su+du,1.5,sw+dw,0.12,1.5,0.12,wd2);LQ([su-4.6,3.4,sw-3.6],[su+4.6,3.4,sw-3.6],[su+4.6,2.6,sw+3.6],[su-4.6,2.6,sw+3.6],[0.4,0.3,0.22]);
      for(let k=0;k<5;k++)LB(su-2.5+k*1.2,0.4+((k*7)%3)*0.4,sw-1+((k*3)%2)*1.2,0.5,0.4,0.5,k%2?[0.55,0.42,0.26]:[0.3,0.38,0.3]);LB(su+2,0.8,sw+5.5,1.1,0.06,0.6,wd2);for(const e of [-1,1])LB(su+2,0.45,sw+5.5+e*1,1.1,0.05,0.18,wd2);
      LB(-46,1.3,-W-6,0.08,1.3,0.08,[0.35,0.26,0.18]);LB(-46,2.9,-W-6,1.3,0.75,0.06,[0.86,0.8,0.66]);LB(-46,2.9,-W-5.92,0.8,0.12,0.02,[0.2,0.2,0.22]);LB(-46,2.9,-W-5.92,0.1,0.45,0.02,[0.2,0.2,0.22]);}
    // a timber fence round the apron's back and ends
    {const fc=[0.42,0.31,0.21];for(let u=-au;u<=au;u+=4){LB(u,0.6,aw1-1,0.08,0.6,0.08,fc);if(u<au){LB(u+2,0.85,aw1-1,2,0.05,0.04,fc);LB(u+2,0.45,aw1-1,2,0.05,0.04,fc);}}
      for(const e of [-1,1])for(let w=aw1-1;w<aw0-4;w+=4){LB(e*(au+1),0.6,w,0.08,0.6,0.08,fc);LB(e*(au+1),0.85,w+2,0.04,0.05,2,fc);LB(e*(au+1),0.45,w+2,0.04,0.05,2,fc);}}
    return R.uploadVeh(M);},
  ghostMesh(a){const M=vmesh(),T=App.T,{L,W,P}=this.corners(a),ok=a.chk&&a.chk.ok,cl=ok?[0.15,1,0.3]:[1,0.2,0.1],g=(u,w)=>{const [x,z]=P(u,w);return[x,R.sampleHr(T,x,z)+0.4,z];};
    const V=(p,cl2)=>{M.v.push(p[0],p[1],p[2],0,1,0,cl2[0],cl2[1],cl2[2],0,0,0,1,4);return M.n++;},q=(a2,b,c,d)=>{const ix=[a2,b,c,d].map(p=>V(p,cl));M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);};
    for(let u=-L;u<L-0.1;u+=10){for(const w of [-W,W-1.5])q(g(u,w),g(u+10,w),g(u+10,w+1.5),g(u,w+1.5));if(Math.floor((u+L)/10)%3===0)q(g(u,-0.75),g(u+10,-0.75),g(u+10,0.75),g(u,0.75));}
    for(const e of [-1,1])q(g(e*L-0.75,-W),g(e*L+0.75,-W),g(e*L+0.75,W),g(e*L-0.75,W));return R.uploadVeh(M);},
  draw(p,pass){if(!App.T)return;if(this.pending)this.restore();if(!this.list.length&&!this.pl)return;const cp=Cam.pos||[0,0,0],I=M4.ident();
    const dm=m=>{if(!m)return;gl.uniformMatrix4fv(p.u('uModel'),false,I);gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,0);Stats.draws++;Stats.tris+=m.count/3;};gl.uniform1f(p.u('uDist'),0);
    for(const s of this.list){if(s.water&&!s.cleared&&R.vegB){s.cleared=true;R.clearVegRect(App.T,{x:(s.x+s.sx)/2,z:(s.z+s.sz)/2,a:s.h,x0:-30,x1:30,z0:-14,z1:14},2);}if(!s.cleared&&R.vegB){s.cleared=true;/* trees and rocks off the runway, the hangar and a margin */R.clearVegRect(App.T,{x:s.x,z:s.z,a:s.h,x0:-AIR.len/2-30,x1:AIR.len/2+30,z0:-AIR.w/2-70,z1:AIR.w/2+35},2);}
      if(Math.hypot(s.x-cp[0],s.z-cp[2])>(pass===1?900:6000))continue;let m=this.meshes.get(s);if(!m){m=s.water?this.jettyMesh(s):this.mesh(s);this.meshes.set(s,m);}dm(m);Rescue.drawPads(p,s);}
    if(this.pl&&pass!==1){if(!this.ghost)this.ghost=this.ghostMesh(this.pl);dm(this.ghost);}
    if(this.job&&this.cratesAt)dm(this.crateMesh());},
  // ---- cargo flights: stopped on an airstrip → unload (paid by the distance from where it was loaded) → load
  stripAt(x,z){for(const s of this.list){if(s.water){if(Plane.onW&&Math.hypot(x-s.x,z-s.z)<32)return s;continue;}const dx=x-s.x,dz=z-s.z,u=dx*Math.cos(s.h)+dz*Math.sin(s.h),w=-dx*Math.sin(s.h)+dz*Math.cos(s.h);if(Math.abs(u)<AIR.len/2+30&&Math.abs(w)<AIR.w/2+15)return s;}return null;},
  dist(a,b){return Math.hypot(a.x-b.x,a.z-b.z);},
  update(dt){if(this.pending&&Life.villages.length)this.restore();if(Plane.on&&Plane.kind==='heli')return;/* no cargo flights by helicopter */if(!Plane.on||!Plane.st||Plane.crashed||Plane.paused){if(this.job&&(!Plane.on||Plane.crashed)){this.job=null;}return;}
    const s=Plane.st,v=Math.hypot(s.v[0],s.v[2]),here=Plane.onG?this.stripAt(s.p[0],s.p[2]):null;
    if(this.job){if(v>2.5||here!==this.job.s){UI.toast(this.job.kind==='unload'?'Unloading stopped: the cargo stays on board':'Loading stopped');this.job=null;this.cratesAt=null;return;}
      const J=this.job;J.t+=dt;const k=Math.floor(J.t/J.dur*AIR.crates);while(J.shown<Math.min(k,AIR.crates)){J.shown++;Icons.add(s.p[0]+(Math.random()-0.5)*3,s.p[1]+2,s.p[2]+(Math.random()-0.5)*3,(J.kind==='unload'?'−':'+')+'📦');}
      if(J.t>=J.dur){if(J.kind==='unload'){const from=this.cargo.from,km=this.dist(from,J.s)/1000,tv=Plane.touchV||0,bonus=this.cargo.to?(tv<1.5?0.25:tv<3?0.1:0):0,pay=Math.round(km*AIR.rate*this.cargo.n/AIR.crates*(1+bonus));if(Money.on()&&pay>0)Money.earn(pay,`air cargo ${from.n} → ${J.s.n}`,s.p[0],s.p[1]+3,s.p[2]);{const L=Ledger.flown();Ledger.add(L,'inc',Money.on()?pay:0);Ledger.add(L,'cargo',this.cargo.n);Ledger.add(L,'flights',1);}
          UI.toast(`${this.cargo.n} crates delivered from ${this.nm(from)} to ${this.nm(J.s)}: ${km.toFixed(1)} km${bonus?` · smooth landing +${Math.round(bonus*100)}%`:''}${Money.on()?`, +€${Money.fmt(pay)}`:''}`);Log.info(`air cargo ${from.n}→${J.s.n} ${km.toFixed(2)} km €${pay}`);this.cargo=null;this.job={kind:'load',s:J.s,t:0,dur:5,shown:0};}
        else{this.cargo={from:J.s,n:AIR.crates};this.job=null;this.cratesAt=null;UI.toast(`${AIR.crates} crates loaded at ${this.nm(J.s)}: fly them to another airstrip${Fleet.unlocks.beaver?' or jetty':''} (the compass shows them)`);}}
      this.cratesAt=[s.p[0],s.p[2],J.kind==='unload'?1-Math.min(1,J.t/J.dur):Math.min(1,J.t/J.dur)];return;}
    if(here&&v<1.2&&Plane.ctl.thr<0.35){if(this.cargo&&this.cargo.to&&this.cargo.to!==here){if(this._hint!==here){this._hint=here;UI.toast(`This cargo is for ${this.nm(this.cargo.to)} (${this.cargo.to.v?this.cargo.to.v.name:''}): the compass shows it`);}}
      else if(this.cargo&&this.cargo.from!==here)this.job={kind:'unload',s:here,t:0,dur:5,shown:0};else if(!this.cargo)this.job={kind:'load',s:here,t:0,dur:5,shown:0};}},
  lost(){if(this.cargo){UI.toast(`The ${this.cargo.n} crates from ${this.nm(this.cargo.from)} are lost`);this.cargo=null;}this.job=null;this.cratesAt=null;},
  // crates stacked beside the plane while (un)loading: as many as are still on the ground
  crateMesh(){const [x,z,f]=this.cratesAt,n=Math.round(f*AIR.crates),key=n+'|'+x.toFixed(0)+'|'+z.toFixed(0);if(this._ck===key)return this._cm;if(this._cm)R.freeMesh(this._cm);
    const M=vmesh(),T=App.T,s=Plane.st,R2=Q.rot(s.q,[0,0,1]),F=Q.rot(s.q,[1,0,0]),bx=x+R2[0]*-6+F[0]*1.5,bz=z+R2[2]*-6+F[2]*1.5,y0=R.sampleHr(T,bx,bz);
    for(let k=0;k<n;k++){const cx=bx+(k%4)*1.0*F[0],cz=bz+(k%4)*1.0*F[2],cy=y0+0.42+Math.floor(k/4)*0.84,h=0.4;const P=[[-h,-h,-h],[h,-h,-h],[h,h,-h],[-h,h,-h],[-h,-h,h],[h,-h,h],[h,h,h],[-h,h,h]].map(v=>[cx+v[0],cy+v[1],cz+v[2]]);
      for(const [fc,nn] of [[[0,1,2,3],[0,0,-1]],[[5,4,7,6],[0,0,1]],[[4,0,3,7],[-1,0,0]],[[1,5,6,2],[1,0,0]],[[3,2,6,7],[0,1,0]]]){const ix=fc.map(i=>{M.v.push(P[i][0],P[i][1],P[i][2],nn[0],nn[1],nn[2],0.62,0.45,0.25,0,0,0,1,0);return M.n++;});M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);}}
    this._ck=key;this._cm=M.n?R.uploadVeh(M):null;return this._cm;},
  hudText(){if(this.cargo&&this.cargo.to&&!this.job)return` · 📦 ${this.cargo.n} for ${this.nm(this.cargo.to)} · ${(Plane.st?Math.hypot(this.cargo.to.x-Plane.st.p[0],this.cargo.to.z-Plane.st.p[2])/1000:0).toFixed(1)} km`;if(this.job){const p=Math.round(this.job.t/this.job.dur*100);return` · ${this.job.kind==='unload'?'Unloading':'Loading'} 📦 ${p}%`;}return this.cargo?` · 📦 ${this.cargo.n} from ${this.cargo.from.n}`:(this.list.length?' · no cargo: stop on an airstrip':'');},
  pay(a,b){return Math.round(this.dist(a,b)/1000*AIR.rate);},
  icons(){const show=this.list.length>=1&&!Plane.on&&!RoadVeh.drv&&!Build.active&&!MapView.on&&!this.pl;this.ic=this.ic||new Map();
    for(const s of this.list){let el=this.ic.get(s);if(!el){el=document.createElement('div');el.className='ilabel airIcon';el.innerHTML=`<span>✈</span><b style="background:${this.color(s.n)}">${s.n}</b>`;el.title='Start a cargo flight from airstrip '+s.n;el.onclick=()=>this.missionPanel(s);document.body.appendChild(el);this.ic.set(s,el);}
      const q=show?Cam.toScreen(s.x,R.sampleHr(App.T,s.x,s.z)+12,s.z):null,far=Cam.pos?Math.hypot(Cam.pos[0]-s.x,Cam.pos[2]-s.z)>9000:false;if(!q||far){el.style.display='none';continue;}el.style.display='';el.style.left=q[0]+'px';el.style.top=q[1]+'px';}
    for(const [s,el] of this.ic)if(!this.list.includes(s)){el.remove();this.ic.delete(s);}},
  missionPanel(a){let el=$('#airMis');if(!el){el=document.createElement('div');el.id='airMis';document.body.appendChild(el);el.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;if(t.dataset.a==='x'){el.hidden=true;return;}const A=this.list.find(s=>s.n===+t.dataset.a),B=this.list.find(s=>s.n===+t.dataset.b);if(A&&t.dataset.free){el.hidden=true;this.freeFlight(A);return;}if(t.dataset.rs){const S=this.list.find(q=>q.n===+t.dataset.rs);el.hidden=true;if(S)Rescue.board(Rescue.pad(S));return;}if(A&&B){el.hidden=true;this.startMission(A,B);}});}
    const bv=!!Fleet.unlocks.beaver,others=this.list.filter(s=>s!==a&&(bv||!s.water)).sort((p,q)=>this.dist(a,p)-this.dist(a,q));
    el.innerHTML=`<div class="rv-h"><div><b>✈ ${a.water?'Jetty':'Airstrip'} ${a.n}${a.v?' · '+esc(a.v.name):''}</b><span>Fly ${AIR.crates} crates to another airstrip. Paid on landing there, +25% for a smooth touchdown</span></div><button data-a="x">✕</button></div>`+
      `<button class="mis" data-a="${a.n}" data-free="1"><i style="background:#5b7f6a">✈</i> Fly from here (free flight, no cargo)</button>`+(Fleet.unlocks.heli&&!a.water?`<button class="mis" data-rs="${a.n}"><i style="background:#d9402a">🚁</i> Rescue missions at the helipad</button>`:'')+(others.length?'':`<div class="fp-note" style="padding:6px">This is your only ${a.water?'jetty':'airstrip'} so far: build a second one in another town to fly cargo between them.</div>`)+others.map(b=>`<button class="mis" data-a="${a.n}" data-b="${b.n}"><i style="background:${this.color(b.n)}">${b.n}</i> ${esc(b.v?b.v.name:'')} · ${(this.dist(a,b)/1000).toFixed(1)} km${Money.on()?` · €${Money.fmt(this.pay(a,b))}`:''}</button>`).join('');el.hidden=false;},
  freeFlight(a){if(Plane.on)Plane.exit();if(RoadVeh.drv)RoadVeh.stopDriving();Plane.spawn(a,a.water?'beaver':(Fleet.unlocks.beaver&&Plane.kind==='beaver'?'beaver':'stag'));this.job=null;this.cargo=null;UI.toast('Free flight: full throttle to take off');},
  startMission(a,b){if(Plane.on)Plane.exit();if(RoadVeh.drv)RoadVeh.stopDriving();Plane.spawn(a,a.water||b.water||(Fleet.unlocks.beaver&&Plane.kind==='beaver')?'beaver':'stag');this.job=null;this.cargo={from:a,n:AIR.crates,to:b};this._hint=null;UI.toast(`Cargo for airstrip ${b.n} (${b.v?b.v.name:''}), ${(this.dist(a,b)/1000).toFixed(1)} km: full throttle to take off`);},
  // Build → Roads → Airstrip: the nearest village that can have one now, or what is still missing
  buildButton(){const c=Cam.target,V=Life.villages.slice().sort((p,q)=>Math.hypot(p.x-c[0],p.z-c[2])-Math.hypot(q.x-c[0],q.z-c[2]));const ok=V.find(v=>Life.upgState(v,'air')==='available');
    if(ok){Build.exit();Life.buyUpg(ok,'air');return;}const L=Life.LEVELS,lv=L[Life.UPG.air.level],best=V.filter(v=>!v.airOwned).sort((p,q)=>(q.gp||0)-(p.gp||0))[0];
    UI.toast(best?`An airstrip needs a town (village level ${Life.UPG.air.level}). ${best.name} is the closest: level ${best.level|0}, ${Math.round(best.gp||0)} of ${lv?lv.need:'?'} growth points. Villages grow when people travel by train and bus`:'Every village already has an airstrip');},
  spawnSpot(c){if(!this.list.some(s=>!s.water))return null;let best=null,bd=1e18;for(const s of this.list){if(s.water)continue;const d=Math.hypot(s.x-c[0],s.z-c[2]);if(d<bd){bd=d;best=s;}}const L=AIR.len/2-30;return{x:best.x-Math.cos(best.h)*L,z:best.z-Math.sin(best.h)*L,h:best.h,s:best};}};
// ---- the compass: a horizontal tape at the top (±60° visible) with N/E/S/W rolling past, and coloured markers with distances
const Compass={el:null,cv:null,
  show(on){if(!this.el){this.el=document.createElement('div');this.el.id='compass';this.cv=document.createElement('canvas');this.el.appendChild(this.cv);document.body.appendChild(this.el);}this.el.hidden=!on;},
  // heading in degrees (0 = north = -z, 90 = east = +x), the same as the flight HUD
  deg(dx,dz){return((Math.atan2(dz,dx)*180/Math.PI+90)%360+360)%360;},
  tick(){let hd=null,pos=null,marks=[];
    if(Plane.on&&Plane.st){const F=Q.rot(Plane.st.q,[1,0,0]);hd=this.deg(F[0],F[2]);pos=Plane.st.p;for(const s of Air.list)marks.push({x:s.x,z:s.z,label:String(s.n),col:Air.color(s.n),ring:Air.cargo&&(Air.cargo.to?Air.cargo.to===s:Air.cargo.from===s)});marks.push(...Rescue.marks());}
    else if(typeof Fish!=='undefined'&&Fish.drv){const q=Fish.heading();hd=this.deg(q[0],q[1]);pos=[q[2],0,q[3]];marks.push(...Fish.marks());}
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
