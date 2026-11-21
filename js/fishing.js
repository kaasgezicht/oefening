'use strict';
// ===== fishing.js
// ===================================================================
// Fishing at the coastal harbours (4.38.0). The boats moored at each quay (Coast.H[i].boats) now go out to work: they leave the quay,
// steam out to a fishing ground (open water where gulls circle over a shoal), shoot their nets and drift with them, haul, and come home.
// On the quays fishermen mend and clean nets beside net piles and fish boxes.
// Any moored boat can be taken out from the harbour's ⚓ icon: steer it with the stick (up = ahead, down = astern, sideways = helm), set
// the nets on a ground (slow, < 3 kn… in game units < 2.5 m/s), wait while they fill, haul them in, and sell the catch at any harbour
// (stop by its quay). The hold takes 600 kg; the price depends on the fish (€18–30 per kg). Grounds are fished out a little by every haul
// and recover over time. Running aground stops the boat.
// ===================================================================
const FISH={hold:600,speed:9,netV:2.5,sellR:70,half:6.5};
/* 4.54 boat physics: buoyancy at ten points along the hull (u forward from the middle, v to starboard), each a spring on its depth below
   the drawn sea surface (Sea.surf), saturating when the point leaves the water or is buried; heave, pitch and roll with their own
   periods and damping (a 13 m trawler: about 2.8 s, 2.6 s, 4.6 s; roll lightly damped); the bow rises with speed, the boat heels out
   in a turn, and the waves' orbital motion pushes it about (not while moored) */
const BOATP={pts:[[5.4,-0.9],[5.4,0.9],[3,-1.8],[3,1.8],[0.5,-2.1],[0.5,2.1],[-2.5,-2.05],[-2.5,2.05],[-5.6,-1.8],[-5.6,1.8]],D:1.2,wh:6.2832/2.8,zh:0.32,wp:6.2832/2.6,zp:0.3,wr:6.2832/4.6,zr:0.1,near:1300};
const Fish={G:[],key:'',drv:null,cam:'chase',inp:{steer:0,thr:0},M:null,ic:new Map(),
  T(){return App.T;},
  sea(x,z,d){const T=App.T;if(!T||T.sea==null)return false;if(x<0||z<0||x>T.W||z>T.W)return true;return R.sampleHr(T,x,z)<T.sea-(d==null?1.2:d);},
  // the fishing grounds: for each harbour, two or three spots 400–2000 m out in open, deep water that a boat can reach in a straight
  // line from the harbour's mouth
  init(){const T=App.T;this.G=[];if(!T||T.sea==null||typeof Coast==='undefined')return;const rng=mulberry32((P.seed|0)*733+11);
    for(const h of Coast.H){const c=Math.cos(h.rot),s=Math.sin(h.rot);h.gate=[h.x+c*60,h.z+s*60];let made=0;
      for(let k=0;k<160&&made<3;k++){const a=h.rot+(rng()-0.5)*2.4,d=400+rng()*1600,x=h.gate[0]+Math.cos(a)*d,z=h.gate[1]+Math.sin(a)*d;if(!this.sea(x,z,6))continue;
        let ok=true;for(let t=0.05;t<=1&&ok;t+=0.05)if(!this.sea(h.gate[0]+(x-h.gate[0])*t,h.gate[1]+(z-h.gate[1])*t,2.5))ok=false;for(let j=0;j<8&&ok;j++){const b=j/8*6.283;if(!this.sea(x+Math.cos(b)*90,z+Math.sin(b)*90,3))ok=false;}
        if(!ok||this.G.some(g=>Math.hypot(g.x-x,g.z-z)<350))continue;const fish=['herring','mackerel','cod','plaice'][Math.floor(rng()*4)];
        this.G.push({x,z,r:90,stock:0.6+rng()*0.4,fish,price:{herring:18,mackerel:22,cod:30,plaice:26}[fish],h});made++;
        for(let i=0;i<5;i++)Coast.gulls.push({cx:x,cz:z,r:30+rng()*40,y:6+rng()*10,a:rng()*6.283,w:(rng()<0.5?-1:1)*(7+rng()*3),ph:rng()*20,sit:null});}
      // each boat: moored, with a wait before its first trip; fishermen on the quay
      for(const b of h.boats){const m=this.moor(h,b);Object.assign(b,{st:'moor',x:m[0],z:m[1],hd:h.rot,v:0,wait:20+rng()*240,net:0,kg:0});}
      h.men=[0,1,2].slice(0,2+Math.floor(rng()*2)).map(i=>({at:5+i*7+rng()*2,side:rng()<0.5?-1:1,ph:rng()*6,job:i%2}));}
    Log.info(`fishing: ${this.G.length} fishing grounds off ${Coast.H.length} harbours`);this.apply();},
  moor(h,b){const c=Math.cos(h.rot),s=Math.sin(h.rot),lz=b.side*4.6;return[h.x+c*b.at-s*lz,h.z+s*b.at+c*lz];},
  nearestG(x,z){let b=null,bd=1e18;for(const g of this.G){const d=Math.hypot(g.x-x,g.z-z);if(d<bd){bd=d;b=g;}}return b?{g:b,d:bd}:null;},
  nearestH(x,z){let b=null,bd=1e18;for(const h of Coast.H){const d=Math.hypot(h.x-x,h.z-z);if(d<bd){bd=d;b=h;}}return b?{h:b,d:bd}:null;},
  // ---- steering toward a point, keeping off the land: probe ahead, and turn toward open water when the way is blocked
  steer(b,tx,tz,dt,vmax){let want=Math.atan2(tz-b.z,tx-b.x);const probe=a=>{let free=0;for(const d of [12,25,45]){if(this.sea(b.x+Math.cos(a)*d,b.z+Math.sin(a)*d,1.0))free++;else break;}return free;};
    if(probe(want)<3&&Math.hypot(tx-b.x,tz-b.z)>40){let best=want,bs=-1;for(const o of [0.4,-0.4,0.8,-0.8,1.2,-1.2,1.7,-1.7]){const f=probe(want+o);if(f>bs){bs=f;best=want+o;}if(f===3)break;}want=best;}
    const da=wrapPi(want-b.hd);b.hd=wrapPi(b.hd+clamp(da,-0.35*dt,0.35*dt));const d=Math.hypot(tx-b.x,tz-b.z),v=Math.min(vmax,0.4+d*0.08)*(Math.abs(da)>1.2?0.4:1);b.v+=(v-b.v)*Math.min(1,dt*0.5);
    b.x+=Math.cos(b.hd)*b.v*dt;b.z+=Math.sin(b.hd)*b.v*dt;return d;},
  phys(b,dt,moored){const T=App.T,sea=T.sea,P2=BOATP;if(b.py==null||!isFinite(b.py)){b.py=sea;b.vy=0;b.pt=0;b.wp=0;b.rl=0;b.wr=0;}
    const cp=Cam.pos||[0,0,0];if(!Sea.on()||Math.hypot(b.x-cp[0],b.z-cp[2])>P2.near){b.py=sea;b.vy=b.pt=b.wp=b.rl=b.wr=0;return;}
    const c=Math.cos(b.hd),s=Math.sin(b.hd),yr=b._hd0==null?0:wrapPi(b.hd-b._hd0)/Math.max(dt,1e-3);b._hd0=b.hd;b.yr=(b.yr||0)+(yr-(b.yr||0))*Math.min(1,dt*3);
    const t=App.time,ff=b.fft&&App.time-(b.fftT||-9)<0.5?b.fft:null,h=P2.pts.map(([u,v],i)=>Sea.surf(b.x+c*u-s*v,b.z+s*u+c*v,t)+(ff?ff[i]:0)),uv=[0,0];/* + the FFT wind waves read back from the GPU */Sea.surf(b.x,b.z,t,uv);
    let su2=0,sv2=0;for(const [u,v] of P2.pts){su2+=u*u;sv2+=v*v;}
    const trim=0.035*clamp((b.v||0)/FISH.speed,-0.5,1),heel=clamp(0.03*(b.yr||0)*(b.v||0),-0.12,0.12),n=Math.max(1,Math.ceil(dt/0.02)),hdt=dt/n,D=P2.D;
    for(let k=0;k<n;k++){let fy=0,fp=0,fr=0;const sp=Math.sin(b.pt),sr=Math.sin(b.rl);
      P2.pts.forEach(([u,v],i)=>{const e=h[i]-(b.py+u*sp+v*sr),f=clamp(e+D,0,2*D)-D;fy+=f;fp+=f*u;fr+=f*v;});
      const ay=P2.wh*P2.wh*fy/P2.pts.length-2*P2.zh*P2.wh*b.vy,ap=P2.wp*P2.wp*(fp/su2+trim)-2*P2.zp*P2.wp*b.wp,ar=P2.wr*P2.wr*(fr/sv2+heel)-2*P2.zr*P2.wr*b.wr;
      b.vy+=ay*hdt;b.wp+=ap*hdt;b.wr+=ar*hdt;b.py+=b.vy*hdt;b.pt=clamp(b.pt+b.wp*hdt,-0.5,0.5);b.rl=clamp(b.rl+b.wr*hdt,-0.5,0.5);}
    if(!moored){b.x+=uv[0]*0.55*dt;b.z+=uv[1]*0.55*dt;}},
  // the hull points of up to three boats near the camera (yours first) for R.waveProbe
  probePts(){const cp=Cam.pos||[0,0,0],B=[];if(this.drv)B.push(this.drv);for(const h of Coast.H)for(const b of h.boats){if(b===this.drv||b.x==null)continue;if(Math.hypot(b.x-cp[0],b.z-cp[2])<350)B.push(b);}
    B.sort((a,b)=>(a===this.drv?-1:b===this.drv?1:Math.hypot(a.x-cp[0],a.z-cp[2])-Math.hypot(b.x-cp[0],b.z-cp[2])));const pts=[],boats=[];
    for(const b of B.slice(0,3)){const c=Math.cos(b.hd),s=Math.sin(b.hd);for(const [u,v] of BOATP.pts)pts.push([b.x+c*u-s*v,b.z+s*u+c*v]);boats.push([b,BOATP.pts.length]);}return{pts,boats};},
  // pose for drawing and cameras: the boat-frame point (u forward, v starboard, w up) in the world
  bp(b,u,v,w){const c=Math.cos(b.hd),s=Math.sin(b.hd),cp=Math.cos(b.pt||0),sp=Math.sin(b.pt||0),cr=Math.cos(b.rl||0),sr=Math.sin(b.rl||0);
    const u1=u*cp-w*sp,w1=u*sp+w*cp,v2=v*cr-w1*sr,w2=v*sr+w1*cr;return[b.x+c*u1-s*v2,(b.py==null?App.T.sea:b.py)+w2,b.z+s*u1+c*v2];},
  lightsOn(b){if(b===this.drv)return!!b.lights;return!!(R.sun&&R.sun.night>0.35);},
  // ---- the boats' day (and the player's boat)
  update(dt){const T=App.T;if(!T||T.sea==null||typeof Coast==='undefined'||!Coast.H)return;const key=Coast.key+'|'+Coast.H.length;if(key!==this.key){this.key=key;this.drv=null;this.init();}
    dt=Math.min(dt,0.5);for(const g of this.G)g.stock=Math.min(1,g.stock+dt*0.0015);
    for(const h of Coast.H)for(const b of h.boats){if(!b.st||b===this.drv)continue;
      if(b.st==='moor'){const m=this.moor(h,b);b.x=m[0];b.z=m[1];b.hd=h.rot;b.v=0;if((b.wait-=dt)<=0){const gs=this.G.filter(g=>g.h===h);if(!gs.length){b.wait=600;continue;}b.g=gs[Math.floor(Math.random()*gs.length)];b.st='out';b.leg=0;}}
      else if(b.st==='out'){const tgt=b.leg===0?h.gate:[b.g.x,b.g.z];const d=this.steer(b,tgt[0],tgt[1],dt,b.leg===0?2.5:FISH.speed*0.8);if(b.leg===0&&d<15)b.leg=1;else if(b.leg===1&&d<b.g.r*0.6){b.st='fish';b.fishT=90+Math.random()*120;b.a=Math.atan2(b.z-b.g.z,b.x-b.g.x);b.net=0;}}
      else if(b.st==='fish'){/* the nets go out over the stern, then it drifts round the shoal at walking pace, then hauls */b.net=Math.min(1,b.net+dt/20);b.a+=dt*0.025;const tx=b.g.x+Math.cos(b.a)*b.g.r*0.5,tz=b.g.z+Math.sin(b.a)*b.g.r*0.5;this.steer(b,tx,tz,dt,1.4);
        if((b.fishT-=dt)<=0){b.st='haul';b.haulT=30;}}
      else if(b.st==='haul'){b.v*=1-dt*0.5;b.x+=Math.cos(b.hd)*b.v*dt;b.z+=Math.sin(b.hd)*b.v*dt;b.net=Math.max(0,b.net-dt/30);if((b.haulT-=dt)<=0){b.g.stock=Math.max(0,b.g.stock-0.05);b.st='back';b.leg=0;b.net=0;}}
      else if(b.st==='back'){const m=this.moor(h,b),tgt=b.leg===0?h.gate:m,d=this.steer(b,tgt[0],tgt[1],dt,b.leg===0?FISH.speed*0.8:1.6);if(b.leg===0&&d<15)b.leg=1;else if(b.leg===1&&d<2.5){b.st='moor';b.wait=120+Math.random()*360;}}
      // foam at the stern of a boat under way
      if(b.v>2&&P.smoke&&Math.random()<dt*8&&Math.hypot(b.x-(Cam.pos||[0,0,0])[0],b.z-(Cam.pos||[0,0,0])[2])<900)Particles.spawn(b.x-Math.cos(b.hd)*6.8,T.sea+0.3,b.z-Math.sin(b.hd)*6.8,(Math.random()-0.5)*0.6,0.4,(Math.random()-0.5)*0.6,1.6,0.6,2.2,1);}
    for(const g of Coast.gulls)if(g.follow){g.cx=g.follow.x;g.cz=g.follow.z;}
    if(this.drv)this.drive(dt);for(const h of Coast.H)for(const b of h.boats)if(b.x!=null)this.phys(b,dt,b.st==='moor');this.icons();if(typeof Sfx!=='undefined'&&Sfx.sea)try{Sfx.sea(dt);}catch(e){}},
  // ---- the player's boat
  take(h){const b=h.boats.find(q=>q.st==='moor');if(!b){UI.toast('All boats of this harbour are out fishing: wait for one to come back');return;}
    if(typeof Plane!=='undefined'&&Plane.on)Plane.exit();if(RoadVeh.drv)RoadVeh.stopDriving();if(Build.active)Build.exit();if(MapView.on)MapView.close();
    this.drv=b;b.h=h;b.st='player';b.v=0;if(b.lights==null)b.lights=!!(R.sun&&R.sun.night>0.35);b.kg=b.kg||0;b.net=0;b.netT=0;this.inp.steer=this.inp.thr=0;this.cam='chase';Cam.mode='boat';Cam.anim=null;this.ui(true);
    if(!b.gulls){b.gulls=[];for(let i=0;i<4;i++){const g={cx:b.x,cz:b.z,r:18+Math.random()*16,y:7+Math.random()*6,a:Math.random()*6.283,w:(Math.random()<0.5?-1:1)*7,ph:Math.random()*20,sit:null,follow:b};Coast.gulls.push(g);b.gulls.push(g);}}
    UI.toast(`Your boat at ${h.v?h.v.name:'the harbour'}: stick up for ahead. Gulls over the water show the fishing grounds (⚑ on the compass)`);},
  leave(){const b=this.drv;if(!b)return;this.drv=null;b.st='back';b.leg=0;b.net=0;this.ui(false);Cam.mode='free';Cam.target=[b.x,App.T.sea,b.z];Cam.dist=60;UI.toast(b.kg>0?`The crew takes the boat home; your ${Math.round(b.kg)} kg stay in its hold for next time`:'The crew takes the boat home');},
  drive(dt){const b=this.drv,T=App.T,i=this.inp;const netOut=b.net>0;
    const vmax=netOut?FISH.netV:FISH.speed,tv=i.thr>=0?i.thr*vmax:i.thr*3;b.v+=clamp(tv-b.v,-dt*1.2,dt*0.9);
    b.hd=wrapPi(b.hd+i.steer*clamp(Math.abs(b.v)/3,0.15,1)*Math.sign(b.v||1)*0.32*dt);
    const nx=b.x+Math.cos(b.hd)*b.v*dt,nz=b.z+Math.sin(b.hd)*b.v*dt,bow=[nx+Math.cos(b.hd)*FISH.half*Math.sign(b.v||1),nz+Math.sin(b.hd)*FISH.half*Math.sign(b.v||1)];
    if(!this.sea(bow[0],bow[1],0.6)){if(Math.abs(b.v)>1.5&&(!this._ag||App.time-this._ag>4)){this._ag=App.time;UI.toast('Aground! Back off with the stick down');}b.v=0;}else{b.x=nx;b.z=nz;}
    // the nets: shoot, fill with what the ground holds, haul
    if(b.netSt==='out'){b.net=Math.min(1,b.net+dt/12);const G=this.nearestG(b.x,b.z),on=G&&G.d<G.g.r;b.netT+=dt;if(on){b.fill=(b.fill||0)+dt*G.g.stock*4;b.fg=G.g;}}
    else if(b.netSt==='haul'){b.net=Math.max(0,b.net-dt/15);if(b.net<=0){b.netSt=null;const kg=Math.min(FISH.hold-b.kg,Math.round(b.fill||0));b.kg+=kg;if(b.fg)b.fg.stock=Math.max(0,b.fg.stock-kg/900);b.fish=b.fg?b.fg.fish:b.fish;b.price=b.fg?b.fg.price:b.price||18;
        UI.toast(kg>0?`${kg} kg of ${b.fish} in the hold (${Math.round(b.kg)} / ${FISH.hold} kg)${b.kg>=FISH.hold?' — full: back to a harbour to sell':''}`:'The nets came up empty: set them where the gulls circle');b.fill=0;this.btns();}}
    this.btns();this.hud();},
  netBtn(){const b=this.drv;if(!b)return;if(b.netSt==='out'){b.netSt='haul';UI.toast('Hauling the nets in…');}
    else if(!b.netSt){if(b.kg>=FISH.hold){UI.toast('The hold is full: sell the catch at a harbour first');return;}if(Math.abs(b.v)>FISH.netV+0.3){UI.toast('Slow down to set the nets');return;}b.netSt='out';b.fill=0;b.netT=0;
      const G=this.nearestG(b.x,b.z);UI.toast(G&&G.d<G.g.r?`Nets out over a shoal of ${G.g.fish}: drift slowly, then haul`:'Nets out, but there are no fish here: look for circling gulls');}this.btns();},
  sell(){const b=this.drv;if(!b)return;const H=this.nearestH(b.x,b.z);if(!H||H.d>FISH.sellR||Math.abs(b.v)>1){UI.toast('Stop beside a harbour quay to sell');return;}if(b.kg<=0){UI.toast('Nothing in the hold yet');return;}
    const pay=Math.round(b.kg*(b.price||18)/10)*10;if(Money.on())Money.earn(pay,`${Math.round(b.kg)} kg of ${b.fish||'fish'}`,b.x,App.T.sea+3,b.z);UI.toast(`Sold ${Math.round(b.kg)} kg of ${b.fish||'fish'} at ${H.h.v?H.h.v.name:'the harbour'}${Money.on()?` for €${Money.fmt(pay)}`:''}`);b.kg=0;this.btns();},
  camera(dt){const b=this.drv,T=App.T,y=b.py==null?T.sea:b.py;let p,look,cab=false;
    if(this.cam==='bridge'){/* at the wheelhouse's front windows (just outside the glass: the house is a solid block), looking over the foredeck; it moves with the boat's pitch and roll */p=this.bp(b,3.95,0,2.35);look=this.bp(b,34,0,1.6);cab=true;}
    else{const want=[-Math.cos(b.hd)*24,8.5,-Math.sin(b.hd)*24];if(!this.co)this.co=want.slice();const k=Math.min(1,dt*2);for(let i=0;i<3;i++)this.co[i]+=(want[i]-this.co[i])*k;p=[b.x+this.co[0],y+this.co[1],b.z+this.co[2]];look=[b.x+Math.cos(b.hd)*6,y+2,b.z+Math.sin(b.hd)*6];}
    return{p,look,cab};},
  hud(){const b=this.drv;if(!b)return;const el=$('#fbHud');if(!el)return;const G=this.nearestG(b.x,b.z),H=this.nearestH(b.x,b.z),kn=Math.abs(b.v)*1.944;
    el.innerHTML=`<b>${kn.toFixed(1)}</b> kn · hold ${Math.round(b.kg)}/${FISH.hold} kg`+(b.netSt==='out'?` · nets out${b.fill>1?` (~${Math.round(Math.min(b.fill,FISH.hold-b.kg))} kg)`:''}`:b.netSt==='haul'?' · hauling':'')+
      (G?` · ⚑ ${G.g.fish} ${G.d<G.g.r?'here':(G.d<1000?Math.round(G.d)+' m':(G.d/1000).toFixed(1)+' km')}`:'')+(H&&b.kg>0?` · ⚓ ${H.h.v?esc(H.h.v.name):''} ${H.d<1000?Math.round(H.d)+' m':(H.d/1000).toFixed(1)+' km'}`:'');},
  btns(){const b=this.drv;if(!b)return;const n=$('#fbNet'),s=$('#fbSell'),lb=$('#fbLights');if(lb)lb.classList.toggle('on',!!b.lights);if(n)n.textContent=b.netSt==='out'?'🪝 Haul nets':b.netSt==='haul'?'Hauling…':'🕸 Set nets';
    const H=this.nearestH(b.x,b.z);if(s)s.hidden=!(H&&H.d<FISH.sellR*1.5&&b.kg>0);},
  ui(on){let el=$('#fbUI');if(!el){el=document.createElement('div');el.id='fbUI';el.innerHTML='<div id="fbHud"></div><div id="fbTop"><button data-a="cam">📷 Camera</button><button data-a="lights" id="fbLights">💡 Lights</button><button data-a="net" id="fbNet">🕸 Set nets</button><button data-a="sell" id="fbSell" class="go">💶 Sell catch</button><button data-a="x">✕ Leave the boat</button></div><div id="fbStickWrap"><div id="fbStick"><div id="fbKnob"></div></div></div>';document.body.appendChild(el);
      el.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;const a=t.dataset.a;if(a==='cam'){this.cam=this.cam==='chase'?'bridge':this.cam==='bridge'?'orbit':'chase';Cam.mode=this.cam==='orbit'?'free':'boat';if(this.cam==='orbit'){Cam.target=[this.drv.x,App.T.sea+2,this.drv.z];Cam.dist=30;}}else if(a==='lights'){const b=this.drv;if(b){b.lights=!b.lights;UI.toast(b.lights?'Lights on: navigation lights, deck floodlights and the wheelhouse':'Lights off');this.btns();}}else if(a==='net')this.netBtn();else if(a==='sell')this.sell();else if(a==='x')this.leave();});
      const st=el.querySelector('#fbStick'),kn=el.querySelector('#fbKnob');let id=null;const mv=ev=>{const r=st.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,Rr=r.width/2-14;let dx=(ev.clientX-cx)/Rr,dy=(ev.clientY-cy)/Rr;const l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l;}
        this.inp.steer=dx;this.inp.thr=clamp(-dy*1.25,-1,1);kn.style.transform=`translate(${dx*Rr}px,${dy*Rr}px)`;};
      st.onpointerdown=ev=>{ev.preventDefault();id=ev.pointerId;st.setPointerCapture(id);mv(ev);};st.onpointermove=ev=>{if(ev.pointerId===id)mv(ev);};
      st.onpointerup=st.onpointercancel=ev=>{if(ev.pointerId!==id)return;id=null;this.inp.steer=0;kn.style.transform='';/* the throttle stays where it was left, like a boat's lever */kn.style.transform=`translate(0px,${-this.inp.thr/1.25*(st.getBoundingClientRect().width/2-14)}px)`;};}
    el.hidden=!on;document.body.classList.toggle('boatdrive',on);if(on){this.btns();this.hud();}},
  // ---- harbour icons (⚓), like the airstrip icons
  icons(){const show=!this.drv&&!(typeof Plane!=='undefined'&&Plane.on)&&!RoadVeh.drv&&!Build.active&&!MapView.on&&App.T&&App.T.sea!=null;
    for(const h of Coast.H){let el=this.ic.get(h);if(!el){el=document.createElement('div');el.className='ilabel airIcon fbIcon';el.innerHTML='<span>⚓</span>';el.title='Fishing harbour: take a boat out';el.onclick=()=>this.panel(h);document.body.appendChild(el);this.ic.set(h,el);}
      const q=show?Cam.toScreen(h.x,App.T.sea+8,h.z):null,far=Cam.pos?Math.hypot(Cam.pos[0]-h.x,Cam.pos[2]-h.z)>3500:false;if(!q||far){el.style.display='none';continue;}el.style.display='';el.style.left=q[0]+'px';el.style.top=q[1]+'px';}
    for(const [h,el] of this.ic)if(!Coast.H.includes(h)){el.remove();this.ic.delete(h);}},
  panel(h){let el=$('#fbPanel');if(!el){el=document.createElement('div');el.id='fbPanel';el.className='fp';document.body.appendChild(el);el.addEventListener('click',e=>{const t=e.target.closest('[data-a]');if(!t)return;el.hidden=true;if(t.dataset.a==='take')this.take(this._ph);});}
    this._ph=h;const n=h.boats.filter(b=>b.st==='moor').length,out=h.boats.length-n,G=this.G.filter(g=>g.h===h);
    el.innerHTML=`<div class="fp-h"><div><b>⚓ Fishing harbour${h.v?' · '+esc(h.v.name):''}</b><span>${h.boats.length} boat${h.boats.length===1?'':'s'}: ${n} in, ${out} out fishing</span></div><button data-a="x">✕</button></div>`+
      `<div class="fp-note" style="padding:6px 10px">Grounds off this harbour: ${G.map(g=>`${g.fish} (€${g.price}/kg, ${g.stock>0.66?'plenty':g.stock>0.33?'some':'few'} fish)`).join(', ')||'none in reach'}. Set the nets where the gulls circle, haul, and sell at any harbour.</div>`+
      `<div class="rs-b"><button data-a="take" class="go"${n?'':' disabled'}>Take a boat out</button></div>`;el.hidden=false;},
  marks(){if(!this.drv)return[];const L=this.G.map(g=>({x:g.x,z:g.z,label:'⚑',col:'#5ad1ff'}));for(const h of Coast.H)L.push({x:h.x,z:h.z,label:'⚓',col:'#f1e7d0'});return L;},
  heading(){const b=this.drv;return b?[Math.cos(b.hd),Math.sin(b.hd),b.x,b.z]:null;},
  // ---- drawing: the boats' poses (Coast.draw asks), nets with their floats, fishermen on the quays
  pose(h,b){if(!b.st||b.st==='moor')return null;return{x:b.x,z:b.z,hd:b.hd};},
  meshes(){if(this.M)return this.M;const V=(M,p,n,c,m)=>{M.v.push(p[0],p[1],p[2],n[0],n[1],n[2],c[0],c[1],c[2],0,0,0,1,m||0);return M.n++;},mk=f=>{const M=vmesh();f(M);return R.uploadVeh(M);},
      box=(M,c,h,col)=>{const P=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(v=>[c[0]+v[0]*h[0],c[1]+v[1]*h[1],c[2]+v[2]*h[2]]);
        for(const [f,n] of [[[0,1,2,3],[0,0,-1]],[[5,4,7,6],[0,0,1]],[[4,0,3,7],[-1,0,0]],[[1,5,6,2],[1,0,0]],[[3,2,6,7],[0,1,0]],[[4,5,1,0],[0,-1,0]]]){const ix=f.map(i=>V(M,P[i],n,col));M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);}},
      ball=(M,c,r,col,s)=>{s=s||[1,1,1];const n=8,hh=5,id=[];for(let j=0;j<=hh;j++)for(let i=0;i<=n;i++){const a=i/n*6.2832,b=-Math.PI/2+j/hh*Math.PI,d=[Math.cos(b)*Math.cos(a),Math.sin(b),Math.cos(b)*Math.sin(a)];id.push(V(M,[c[0]+d[0]*r*s[0],c[1]+d[1]*r*s[1],c[2]+d[2]*r*s[2]],d,col));}
        for(let j=0;j<hh;j++)for(let i=0;i<n;i++){const a=id[j*(n+1)+i],b=id[j*(n+1)+i+1],cc=id[(j+1)*(n+1)+i+1],d=id[(j+1)*(n+1)+i];M.i.push(a,b,cc,a,cc,d);}};
    const OIL=[0.95,0.75,0.1],BL=[0.18,0.22,0.35],SK=[0.86,0.63,0.5],NET=[0.24,0.32,0.26];
    this.M={
      // a fisherman bending over the net (body from the hips; the arms are their own part, swung about the shoulders)
      man:mk(M=>{box(M,[0,0.42,-0.11],[0.08,0.42,0.08],BL);box(M,[0,0.42,0.11],[0.08,0.42,0.08],BL);box(M,[0,0.82,0],[0.1,0.06,0.2],BL);}),
      torso:mk(M=>{box(M,[0,0.3,0],[0.13,0.32,0.21],OIL);ball(M,[0.02,0.76,0],0.12,SK);box(M,[0.02,0.86,0],[0.14,0.05,0.14],[0.95,0.75,0.1]);}),
      arm:mk(M=>{box(M,[0,-0.28,0],[0.06,0.3,0.06],OIL);ball(M,[0,-0.6,0],0.06,SK);}),
      pile:mk(M=>{ball(M,[0,0.1,0],0.9,NET,[1.3,0.32,1]);ball(M,[0.6,0.2,0.3],0.4,NET,[1,0.5,1]);for(let k=0;k<7;k++){const a=k/7*6.283;ball(M,[Math.cos(a)*1.0,0.18,Math.sin(a)*0.75],0.08,[1,0.45,0.08]);}}),
      boxes:mk(M=>{for(const [x,z,y] of [[0,0,0],[0.65,0,0],[0.32,0,0.4],[0,0.5,0]]){box(M,[x,y+0.17,z],[0.3,0.17,0.22],[0.2,0.45,0.75]);box(M,[x,y+0.33,z],[0.26,0.02,0.18],[0.75,0.78,0.8]);}}),
      float:mk(M=>ball(M,[0,0,0],0.32,[1,0.45,0.08],[1,0.7,1])),
      buoy:mk(M=>{ball(M,[0,0,0],0.35,[1,0.45,0.08]);box(M,[0,0.8,0],[0.03,0.6,0.03],[0.2,0.2,0.2]);box(M,[0,1.3,0.15],[0.02,0.12,0.15],[0.1,0.1,0.1]);})};
    return this.M;},
  draw(p,pass){const T=App.T;if(!T||T.sea==null||!Coast.H||!Coast.H.length)return;const M=this.meshes(),cp=Cam.pos||[0,0,0],t=App.time||0,
      dm=(m,mt)=>{gl.uniformMatrix4fv(p.u('uModel'),false,mt);gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,0);Stats.draws++;},
      at=(x,y,z,hd,q)=>{const qq=q||Q.axis([0,1,0],-hd),X=Q.rot(qq,[1,0,0]),Y=Q.rot(qq,[0,1,0]),Z=Q.rot(qq,[0,0,1]);return new Float32Array([X[0],X[1],X[2],0,Y[0],Y[1],Y[2],0,Z[0],Z[1],Z[2],0,x,y,z,1]);},
      wy=(x,z)=>Sea.on()?Sea.height(x,z,t):T.sea,lim=pass===1?300:900;
    // nets: a curve of floats streaming astern of every boat that has them out, a marker buoy at the end
    for(const h of Coast.H)for(const b of h.boats){if(!(b.net>0.02)||Math.hypot(b.x-cp[0],b.z-cp[2])>lim)continue;const n=Math.max(2,Math.round(16*b.net)),c=Math.cos(b.hd),s=Math.sin(b.hd);
      for(let i=1;i<=n;i++){const d=6.8+i*3.2,sw=(Math.sin(i*0.35+t*0.2)*0.35+0.6)*i*0.6,x=b.x-c*d-s*sw,z=b.z-s*d+c*sw;dm(i===n?M.buoy:M.float,at(x,wy(x,z)+(i===n?0.25:0.18),z,b.hd));}}
    if(pass===1)return;
    // the quays: fishermen at work, net piles, fish boxes
    for(const h of Coast.H){if(!h.men||Math.hypot(h.x-cp[0],h.z-cp[2])>500)continue;const c=Math.cos(h.rot),s=Math.sin(h.rot),y=T.sea+1.55,P=(u,w)=>[h.x+c*u-s*w,h.z+s*u+c*w];
      for(const m of h.men){const lz=m.side*1.1,[x,z]=P(m.at,lz),[px,pz]=P(m.at+0.2,-m.side*0.5),face=h.rot+(m.side>0?-Math.PI/2:Math.PI/2);
        dm(M.pile,at(px,y,pz,h.rot));if(m.job){const [bx,bz]=P(m.at-1.6,lz*0.4);dm(M.boxes,at(bx,y,bz,h.rot+0.3));}
        // bend over, pull the net in a slow rhythm, now and then straighten up
        const cyc=(t*0.5+m.ph)%12,rest=cyc>10,bend=rest?0.15:0.75+Math.sin(t*1.8+m.ph)*0.1,pull=rest?0:Math.sin(t*1.8+m.ph);
        dm(M.man,at(x,y,z,face));const hq=Q.mul(Q.axis([0,1,0],-face),Q.axis([0,0,1],-bend)),hip=[x,y+0.88,z];dm(M.torso,at(hip[0],hip[1],hip[2],0,hq));
        for(const sd of [-1,1]){const sh=Q.rot(hq,[0,0.58,sd*0.25]),aq=Q.mul(hq,Q.axis([0,0,1],(rest?0.1:1.0+pull*0.6*sd)));dm(M.arm,at(hip[0]+sh[0],hip[1]+sh[1],hip[2]+sh[2],0,aq));}}}},
  /* saved: every boat's day (where it is, what it does, its catch) and how much fish each ground holds; your boat goes home with its crew */
  serialize(){if(!Coast.H||!Coast.H.length)return this.pending||null;return{H:Coast.H.map(h=>h.boats.map(b=>({st:b===this.drv?'back':b.st,x:+(b.x||0).toFixed(1),z:+(b.z||0).toFixed(1),hd:+(b.hd||0).toFixed(3),wait:Math.round(b.wait||0),
      g:b.g?this.G.indexOf(b.g):-1,leg:b===this.drv?0:b.leg|0,net:+(b.net||0).toFixed(2),kg:Math.round(b.kg||0),fish:b.fish||null,price:b.price||0}))),G:this.G.map(g=>+g.stock.toFixed(3))};},
  load_(d){this.pending=d||null;this.key='';if(this.drv){this.ui(false);this.drv=null;}},
  apply(){const d=this.pending;this.pending=null;if(!d||!d.H||d.H.length!==Coast.H.length)return;d.G&&d.G.forEach((s,i)=>{if(this.G[i])this.G[i].stock=s;});
    Coast.H.forEach((h,i)=>h.boats.forEach((b,k)=>{const q=d.H[i]&&d.H[i][k];if(!q)return;Object.assign(b,q);b.g=q.g>=0?this.G[q.g]:null;if(!b.g&&b.st!=='moor'&&b.st!=='back'){b.st='back';b.leg=0;}if(b.st==='fish'){b.fishT=60;b.a=Math.atan2(b.z-b.g.z,b.x-b.g.x);}if(b.st==='haul')b.haulT=20;}));
    Log.info('fishing: boats restored from the save');}};
