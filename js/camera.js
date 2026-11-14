'use strict';
// ===== camera.js
// ===================================================================
// CAMERA — orbit around a ground target. 1 finger rotate, 2 fingers pan/pinch/twist,
// double-tap to fly to a spot. Mouse: drag rotate, right-drag pan, wheel zoom.
// ===================================================================
const Cam={target:[1024,200,1024],dist:900,yaw:0.9,pitch:0.42,fovy:1,aspect:1,near:1,far:20000,anim:null,mode:'free',lookYaw:0,lookPitch:0,ts:null,sp:null,
  setMode(m){this.mode=m;this.ts=null;this.sp=null;this.lookYaw=0;this.lookPitch=0;if(m==='follow')this.dist=Math.min(this.dist,60);if(m==='chase')this.dist=26;if(m==='free'&&this.dist<20)this.dist=40;},
  toScreen(x,y,z){const c=M4.xform(this.vp,x,y,z,1);if(c[3]<=0)return null;const r=gl.canvas.getBoundingClientRect();return[r.left+(c[0]/c[3]*0.5+0.5)*r.width,r.top+(0.5-c[1]/c[3]*0.5)*r.height];},
  pos:[0,0,0],fwd:[0,0,-1],view:null,proj:null,vp:null,invVP:null,planes:null,planesWide:null,
  state(){return{tx:+this.target[0].toFixed(2),ty:+this.target[1].toFixed(2),tz:+this.target[2].toFixed(2),dist:+this.dist.toFixed(2),yaw:+this.yaw.toFixed(4),pitch:+this.pitch.toFixed(4)};},
  setState(s){if(!s)return;this.target=[+s.tx||0,+s.ty||0,+s.tz||0];this.dist=+s.dist||600;this.yaw=+s.yaw||0;this.pitch=+s.pitch||0.4;},
  ground(x,z){const T=R.world;if(!T)return 0;let h;if(x>=0&&z>=0&&x<=T.W&&z<=T.W){h=sampleH(T,x,z);const w=sampleWater(T,x,z);if(w[1]>0)h=Math.max(h,w[0]);}else h=0;return h;},
  update(dt){
    const cv=gl.canvas;this.aspect=cv.width/cv.height;this.fovy=(this.aspect<1?64:50)*Math.PI/180;
    if(this.anim){const a=this.anim;a.t=Math.min(1,a.t+dt*1.6);const e=a.t*a.t*(3-2*a.t);for(let k=0;k<3;k++)this.target[k]=lerp(a.from[k],a.to[k],e);this.dist=lerp(a.d0,a.d1,e);if(a.t>=1)this.anim=null;}
    const T=R.world;if(T){this.target[0]=clamp(this.target[0],20,T.W-20);this.target[2]=clamp(this.target[2],20,T.W-20);
      // follow the average ground around the target (not every bump) so panning over hills stays smooth
      const rr=clamp(this.dist*0.16,4,220);let g=this.ground(this.target[0],this.target[2])*2;for(let k=0;k<8;k++){const a=k*0.785;g+=this.ground(this.target[0]+Math.cos(a)*rr,this.target[2]+Math.sin(a)*rr);}g/=10;
      if(!this.anim&&!(Plane.on&&Plane.cam==='orbit')&&this.mode!=='follow')this.target[1]+=(g-this.target[1])*Math.min(1,dt*14);}
    MapView.hold();this.pitch=clamp(this.pitch,-0.2,1.55);this.dist=clamp(this.dist,1.5,MapView.on?(App.T?App.T.W*2.4:20000):7000);
    if(Build.active&&Build.camGoal&&this.mode==='free'&&!this.anim){const G=Build.camGoal,k=Math.min(1,dt*2.2);if(G.x!==undefined){this.target[0]+=(G.x-this.target[0])*k;this.target[2]+=(G.z-this.target[2])*k;}
      if(G.dist!==undefined)this.dist+=(G.dist-this.dist)*k;if(G.pitch!==undefined)this.pitch+=(G.pitch-this.pitch)*k;}
    const tr=this.mode!=='free'?Trains.cur():null,L=tr&&tr.poses&&tr.poses[0];let p,look=this.target,cab=false;
    /* follow: the camera is fixed to the train; only the offset left over from switching trains or panning eases away
       (easing the position itself lagged by speed/6 and jittered with every uneven frame, worst at 4× and 8×) */
    if(L&&this.mode==='follow'){const want=[L.c[0],L.c[1]+2,L.c[2]];if(this.fTr!==tr||!this.fPrev){this.fTr=tr;this.fPrev=want;}
      const e=Math.exp(-dt*5);for(let i=0;i<3;i++){const off=(this.target[i]-this.fPrev[i])*e;this.target[i]=want[i]+off;}this.fPrev=want;}
    else this.fTr=null;
    if(L&&(this.mode==='chase'||this.mode==='cab'||this.mode==='coach'||this.mode==='trackside')){const X=L.X;
      if(this.mode==='chase'){const d=clamp(this.dist,10,90);const want=[L.c[0]-X[0]*d*Math.cos(this.yaw*0.3),L.c[1]+d*0.32+3,L.c[2]-X[2]*d*Math.cos(this.yaw*0.3)];
        if(!this.sp||this.spTr!==tr||!this.spC){this.sp=want.slice();this.spTr=tr;this.spC=L.c.slice();}const k=1-Math.exp(-dt*3);for(let i=0;i<3;i++){const o=this.sp[i]-this.spC[i],ow=want[i]-L.c[i];this.sp[i]=L.c[i]+o+(ow-o)*k;}this.spC=L.c.slice();p=this.sp.slice();look=[L.c[0]+X[0]*10,L.c[1]+2.5,L.c[2]+X[2]*10];}
      else if(this.mode==='coach'){const ci=tr.veh.findIndex(q=>q.k==='coach'),cp=ci>=0&&tr.poses[ci]?tr.poses[ci]:L,Xc=cp.X,m=cp.m,Yc=[m[4],m[5],m[6]],Zc=[m[8],m[9],m[10]],lx=-6.1+1.74*3,lz=-0.3,ly=2.4;
        p=[cp.c[0]+Xc[0]*lx+Yc[0]*ly+Zc[0]*lz,cp.c[1]+Xc[1]*lx+Yc[1]*ly+Zc[1]*lz,cp.c[2]+Xc[2]*lx+Yc[2]*ly+Zc[2]*lz];const base=Math.atan2(Xc[2],Xc[0]),h=base-Math.PI/2+this.lookYaw,pp=this.lookPitch-0.05;
        look=[p[0]+Math.cos(h)*Math.cos(pp)*10,p[1]+Math.sin(pp)*10,p[2]+Math.sin(h)*Math.cos(pp)*10];cab=true;}
      else if(this.mode==='cab'){const E=locoSpec(tr).eye;p=locoPoint(tr,E[0],E[1],E[2]);const h=Math.atan2(X[2],X[0])+this.lookYaw,pp=Math.asin(clamp(X[1],-1,1))+this.lookPitch-0.06;
        look=[p[0]+Math.cos(h)*Math.cos(pp)*10,p[1]+Math.sin(pp)*10,p[2]+Math.sin(h)*Math.cos(pp)*10];cab=true;}
      else{const sg=tr.v<-0.3?-1:1;if(!this.ts||Math.hypot(this.ts[0]-L.c[0],this.ts[2]-L.c[2])>230){const a=advance(tr.head,sg*(120+Math.random()*60));const q=posInfo(a.pos);
          if(q){const side=Math.random()<0.5?-1:1,off=11+Math.random()*9;const x=q.x-Math.sin(q.h)*off*side,z=q.z+Math.cos(q.h)*off*side;this.ts=[x,Math.max(this.ground(x,z),q.y)+2.2+Math.random()*3,z];}}
        p=this.ts?this.ts.slice():[L.c[0]+20,L.c[1]+8,L.c[2]];look=[L.c[0],L.c[1]+2,L.c[2]];}
      this.target=look.slice();}
    else{const cp=Math.cos(this.pitch);p=[this.target[0]+this.dist*cp*Math.sin(this.yaw),this.target[1]+this.dist*Math.sin(this.pitch),this.target[2]+this.dist*cp*Math.cos(this.yaw)];}
    if(this.mode==='road'){const c=RoadVeh.camera(dt);if(c){p=c.p;look=c.look;cab=c.cab;}}/* a bus or lorry: behind it, the driver's seat or beside a wheel */
    this.up=null;if(this.mode==='plane'&&Plane.on&&Plane.st){const c=Plane.camera(dt);p=c.p;look=c.look;cab=c.cab;this.up=c.up;}
    const gh=this.ground(p[0],p[2])+1.5;if(!cab){const need=Math.max(0,gh-p[1]);this.lift=(this.lift||0)+(need-(this.lift||0))*Math.min(1,dt*6);p[1]=Math.max(p[1]+this.lift,gh-1.2);}
    this.pos=p;const f=[look[0]-p[0],look[1]-p[1],look[2]-p[2]],fl=Math.hypot(...f)||1;this.fwd=f.map(v=>v/fl);this.right=[-this.fwd[2],0,this.fwd[0]].map(v=>v/(Math.hypot(this.fwd[0],this.fwd[2])||1));
    const agl=Math.max(p[1]-gh+1.2,0.5);this.near=cab?0.12:clamp(agl*0.12,0.2,12);this.far=26000;
    /* a flying plane: the near plane (which grows with height) must not cut into it; the chase camera is only ~12 m away */
    if(Plane.on&&Plane.st&&!cab){const q=Plane.st.p,d=Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]);this.near=Math.min(this.near,Math.max(0.2,(d-6)*0.4));}
    this.view=M4.lookAt(p,look,this.up||[0,1,0]);this.proj=M4.persp(this.fovy,this.aspect,this.near,this.far);
    this.vp=M4.mul(this.proj,this.view);this.invVP=M4.inv(this.vp);this.planes=frustumPlanes(this.vp);
    this.planesWide=frustumPlanes(M4.mul(M4.persp(Math.min(this.fovy*1.5,2.6),this.aspect*1.2,this.near,this.far),this.view));
  },
  ray(sx,sy){const cv=gl.canvas,r=cv.getBoundingClientRect();const nx=(sx-r.left)/r.width*2-1,ny=1-(sy-r.top)/r.height*2;
    const a=M4.xform(this.invVP,nx,ny,-1,1),b=M4.xform(this.invVP,nx,ny,1,1);const o=[a[0]/a[3],a[1]/a[3],a[2]/a[3]],e=[b[0]/b[3],b[1]/b[3],b[2]/b[3]];
    const d=[e[0]-o[0],e[1]-o[1],e[2]-o[2]],l=Math.hypot(...d);return{o,d:d.map(v=>v/l)};},
  pick(sx,sy){const T=R.world;if(!T)return null;const{o,d}=this.ray(sx,sy);let t=0.5,prev=null;
    for(let i=0;i<2000&&t<9000;i++){const x=o[0]+d[0]*t,y=o[1]+d[1]*t,z=o[2]+d[2]*t;if(x>=0&&z>=0&&x<=T.W&&z<=T.W){if(y<=this.ground(x,z))return[x,this.ground(x,z),z];}t+=Math.max(0.5,t*0.01);}return null;},
  flyTo(p,d){this.anim={t:0,from:this.target.slice(),to:p,d0:this.dist,d1:d||Math.min(this.dist,140)};}
};
const Input={tick(){},mode:null,acc:null};
// separate touch + camera recorder (Settings > Export touch log): raw pointer events and one line per frame while touching
const TouchLog={L:[],t0:performance.now(),on:0,
  T(){return((performance.now()-this.t0)/1000).toFixed(3);},
  add(l){this.L.push(l);if(this.L.length>12000)this.L.splice(0,2000);},
  cam(){return`yaw ${Cam.yaw.toFixed(4)} pitch ${Cam.pitch.toFixed(4)} dist ${Cam.dist.toFixed(1)} tgt ${Cam.target.map(v=>v.toFixed(1)).join(',')}`;},
  ev(e,pts){this.on=pts.size;this.add(`${this.T()} EV ${e.type} id ${e.pointerId} x ${e.clientX.toFixed(1)} y ${e.clientY.toFixed(1)} n ${pts.size} | ${this.cam()}`);},
  frame(m,d){this.add(`${this.T()} G2 mode ${m||'-'} da ${d.da.toFixed(4)} ds ${d.ds.toFixed(4)} dx ${d.dx.toFixed(1)} dy ${d.dy.toFixed(1)} | ${this.cam()}`);},
  tick(dt){if(this.on)this.add(`${this.T()} FR dt ${(dt*1000).toFixed(1)} | ${this.cam()} fps ${(1000/Math.max(1,(App.perf.fr.slice(-30).reduce((a,b)=>a+b,0)/30)||16)).toFixed(0)}`);},
  export(){download(`trein-touch-${stamp()}.txt`,`Trein ${VERSION} touch log\n`+this.L.join('\n'),'text/plain');UI.toast('Touch log exported');}};
function initInput(cv){
  const pts=new Map();let g=null,lastTap=0,lastTapPos=[0,0],downAt=0,moved=0,buildPtr=null;
  const pinfo=()=>{const a=[...pts.values()];if(a.length<2)return null;const cx=(a[0].x+a[1].x)/2,cy=(a[0].y+a[1].y)/2;return{cx,cy,d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),ang:Math.atan2(a[1].y-a[0].y,a[1].x-a[0].x)};};
  const pan=camPan;
  cv.addEventListener('pointerdown',e=>{try{cv.setPointerCapture(e.pointerId);}catch(err){}
    const tool=Build.active?Build:Drive.active?Drive:null;if(tool){if(pts.size===0&&e.button===0&&tool.down(e))buildPtr=e.pointerId;else if(buildPtr!==null){tool.cancel();buildPtr=null;}}
    pts.set(e.pointerId,{x:e.clientX,y:e.clientY,b:e.button,shift:e.shiftKey});Cam.anim=null;Input.vel=null;Input.spin=0;Input.live=false;g=pinfo();Input.mode=null;Input.acc=null;Input.prev=null;downAt=performance.now();moved=0;TouchLog.ev(e,pts);});
  cv.addEventListener('pointermove',e=>{const p=pts.get(e.pointerId);if(!p)return;
    if(e.pointerId===buildPtr){(Build.active?Build:Drive).move(e);p.x=e.clientX;p.y=e.clientY;return;}const dx=e.clientX-p.x,dy=e.clientY-p.y;moved+=Math.abs(dx)+Math.abs(dy);
    // one finger pans, two fingers rotate (twist), tilt (move up/down together) and zoom (pinch); mouse: left pans, right rotates
    if(pts.size===1){if(p.b===2||p.shift||e.buttons===2){Cam.yaw+=dx*0.0055;Cam.pitch+=dy*0.0045;}else if(Cam.mode==='cab'||Cam.mode==='coach'){Cam.lookYaw-=dx*0.005;Cam.lookPitch=clamp(Cam.lookPitch-dy*0.004,-0.8,0.6);}else if(Cam.mode!=='free'){Cam.yaw+=dx*0.0055;Cam.pitch+=dy*0.0045;}else grabPan(p.x,p.y,e.clientX,e.clientY);}
    p.x=e.clientX;p.y=e.clientY;
    TouchLog.ev(e,pts);});
  // called once per frame by the main loop
  Input.tick=()=>{const now=performance.now(),dtI=clamp((now-(Input.tLast||now))/1000,0,0.1);Input.tLast=now;
    if(pts.size===0){const V=Input.vel;if(V&&Cam.mode==='free'){Cam.target[0]+=V[0]*dtI;Cam.target[2]+=V[1]*dtI;const k=Math.exp(-dtI*3.5);V[0]*=k;V[1]*=k;if(Math.hypot(V[0],V[1])<0.3)Input.vel=null;}
      if(Input.spin){Cam.yaw+=Input.spin*dtI;Input.spin*=Math.exp(-dtI*4);if(Math.abs(Input.spin)<0.02)Input.spin=0;}}
    if(pts.size!==2){Input.mode=null;Input.acc=null;Input.prev=null;return;}const n=pinfo(),ent=[...pts.entries()];
    if(!g||!n||!Input.prev){g=n;Input.prev=new Map(ent.map(([id,q])=>[id,{x:q.x,y:q.y}]));return;}
    let da=n.ang-g.ang;if(da>Math.PI)da-=2*Math.PI;if(da<-Math.PI)da+=2*Math.PI;const ds=Math.log(Math.max(n.d,1)/Math.max(g.d,1)),dx=n.cx-g.cx,dy=n.cy-g.cy;
    const q0=Input.prev.get(ent[0][0]),q1=Input.prev.get(ent[1][0]),dy0=q0?ent[0][1].y-q0.y:0,dy1=q1?ent[1][1].y-q1.y:0;
    const par=dy0*dy1>0?Math.sign(dy0)*Math.min(Math.abs(dy0),Math.abs(dy1)):0;// both fingers moving the same way vertically = tilt
    Input.prev=new Map(ent.map(([id,q])=>[id,{x:q.x,y:q.y}]));
    if(!Input.acc)Input.acc={a:0,s:0,x:0,y:0};const A=Input.acc;A.a+=da;A.s+=ds;A.x+=dx;A.y+=dy;
    if(!Input.live){if(Math.abs(A.a)*n.d*0.5+Math.abs(A.s)*n.d*0.5+Math.hypot(A.x,A.y)>4)Input.live=true;else{g=n;TouchLog.frame('-',{da,ds,dx,dy});return;}}
    if(Build.active){Input.mode='build';Cam.dist*=Math.exp(-ds);Cam.yaw+=da;pan(dx,dy);TouchLog.frame('build',{da,ds,dx,dy});g=n;return;}
    Input.mode='free';
    // rotation and zoom: noise-gated a little so a pure tilt does not wobble, zoom keeps the ground point under the fingers
    const rotOK=Math.abs(da)*n.d*0.5>0.25,zoomOK=Math.abs(ds)*n.d*0.5>0.25;
    if(rotOK){Cam.yaw+=da;Input.spin=Input.spin*0.5+da/Math.max(dtI,0.008)*0.5;}
    if(zoomOK){const f=Math.exp(-ds),Q=groundUnder(n.cx,n.cy);Cam.dist=clamp(Cam.dist*f,8,MapView.on&&App.T?App.T.W*2.4:7000);if(Q&&Cam.mode==='free'){Cam.target[0]=Q[0]+(Cam.target[0]-Q[0])*f;Cam.target[2]=Q[2]+(Cam.target[2]-Q[2])*f;}}
    if(par)Cam.pitch=clamp(Cam.pitch+par*0.0065,-0.2,1.55);
    TouchLog.frame(par?(rotOK||zoomOK?'tilt+twist':'tilt'):'twist',{da,ds,dx,dy});g=n;};
  const up=e=>{if(!pts.has(e.pointerId))return;pts.delete(e.pointerId);g=pinfo();Input.mode=null;Input.acc=null;Input.prev=null;Input.live=false;TouchLog.ev(e,pts);
    if(pts.size===0){const now2=performance.now();if(Input.pv&&now2-Input.pvT<90&&Math.hypot(Input.pv[0],Input.pv[1])>2)Input.vel=Input.pv.slice();Input.pv=null;if(Math.abs(Input.spin)<0.3)Input.spin=0;}else Input.spin=0;
    if(e.pointerId===buildPtr){buildPtr=null;const tl=Build.active?Build:Drive;if(e.type==='pointerup')tl.up(e);else tl.cancel();return;}
    const now=performance.now();if(Build.active&&pts.size===0&&moved<12&&now-downAt<400&&e.type==='pointerup'){Build.tap(e);return;}
    if(Drive.active&&pts.size===0&&moved<12&&now-downAt<400&&e.type==='pointerup'){Drive.tap(e);return;}
    if(Air.pl&&pts.size===0&&moved<12&&now-downAt<400&&e.type==='pointerup'){Air.tap(e.clientX,e.clientY);return;}/* placing an airstrip */
    if(MapView.on){if(pts.size===0&&moved<12&&now-downAt<400&&e.type==='pointerup')MapView.tap(e.clientX,e.clientY);return;}
    if(pts.size===0&&moved<12&&now-downAt<300){
      if(now-lastTap<320&&Math.hypot(e.clientX-lastTapPos[0],e.clientY-lastTapPos[1])<30){const h=Cam.pick(e.clientX,e.clientY);if(h){Cam.flyTo(h);Log.info(`fly to ${h.map(v=>v.toFixed(0)).join(',')}`);}lastTap=0;}
      else{lastTap=now;lastTapPos=[e.clientX,e.clientY];const rv=RoadVeh.drv?null:RoadVeh.pick(e.clientX,e.clientY);if(rv){RoadVeh.select(rv);return;}/* buses and lorries first */const ti=pickTrain(e.clientX,e.clientY);if(ti>=0){Trains.sel=ti;if(!Drive.active)Drive.enter();Drive.refresh&&Drive.refresh();UI.toast(`${Trains.list[ti].name} selected`);}}}};
  cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  cv.addEventListener('wheel',e=>{e.preventDefault();Cam.dist*=Math.exp(e.deltaY*0.0012);},{passive:false});
  const keys={};addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT')return;keys[e.key.toLowerCase()]=1;});addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=0;});
  // a key held while the window loses focus never sends keyup: forget held keys so the camera does not drift on
  addEventListener('blur',()=>{for(const k in keys)keys[k]=0;});
  Cam.keys=keys;
}
// drag right -> world follows the finger; drag down -> pull the ground towards you
// ground point under a screen position, on the horizontal plane through the camera target (cheap, no ray-march)
function groundUnder(sx,sy){const r=Cam.ray(sx,sy);if(r.d[1]>-0.03)return null;const t=(Cam.target[1]-r.o[1])/r.d[1];if(t<0||t>Cam.dist*12)return null;return[r.o[0]+r.d[0]*t,Cam.target[1],r.o[2]+r.d[2]*t];}
// grab-pan: the ground under the finger follows the finger exactly; remembers velocity for momentum
function grabPan(x0,y0,x1,y1){if(Build.active&&Build.camGoal&&!Build.stroke){Build.camGoal.x=undefined;Build.camGoal.dist=undefined;}const a=groundUnder(x0,y0),b=groundUnder(x1,y1);
  if(!a||!b){camPan(x1-x0,y1-y0);return;}let mx=a[0]-b[0],mz=a[2]-b[2];const lim=Cam.dist*0.25,ml=Math.hypot(mx,mz);if(ml>lim){mx*=lim/ml;mz*=lim/ml;}Cam.target[0]+=mx;Cam.target[2]+=mz;
  const now=performance.now(),dt=clamp((now-(Input.pvT||now))/1000,0.004,0.1);const v=[mx/dt,mz/dt];Input.pv=Input.pv&&now-Input.pvT<100?[Input.pv[0]*0.6+v[0]*0.4,Input.pv[1]*0.6+v[1]*0.4]:v;Input.pvT=now;}
function camPan(dx,dy){if(Build.active&&Build.camGoal&&!Build.stroke){Build.camGoal.x=undefined;Build.camGoal.dist=undefined;}const sc=Cam.dist*0.0016+0.01,c=Math.cos(Cam.yaw),sn=Math.sin(Cam.yaw);
  Cam.target[0]+=(-c*dx-sn*dy)*sc;Cam.target[2]+=(sn*dx-c*dy)*sc;}
function keyMove(dt){const k=Cam.keys||{};const s=500*dt;if(k.w)camPan(0,s);if(k.s)camPan(0,-s);if(k.a)camPan(s,0);if(k.d)camPan(-s,0);if(k.q)Cam.yaw+=dt*1.2;if(k.e)Cam.yaw-=dt*1.2;}
