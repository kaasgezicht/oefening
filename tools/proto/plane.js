// ===== PLANE — the Beechcraft D17S Staggerwing (user's photos, Nov 2026): red, gold pin-stripes, negative-stagger biplane with a
// 450 hp radial in a polished-lip NACA cowling, chrome spinner, two-blade propeller, closed cabin, I-struts and flying wires, retractable
// main gear (electric, folding aft into the lower wing roots) and tailwheel. Body frame: x forward, y up, z right; origin at the CG.
// Size: span 9.75 m, length 8.18 m, wing area 27.5 m², empty 1.2 t, flying 1.9 t.
const PL={span:9.75,len:8.18,S:27.5,m:1900,P:336000,cg:[0,0,0],
  // contact points in body frame (gear down): left/right main wheels, tailwheel; gear up: the belly skids
  wheels:[[0.7,-2.06,-1.0],[0.7,-2.06,1.0],[-4.5,-1.12,0]],belly:[[0.6,-0.9,-0.6],[0.6,-0.9,0.6],[-4.6,-0.85,0],[2.2,-0.75,0]],
  gearHinge:[0.75,-0.55],propX:2.95,eye:[0.35,0.62,-0.32]};
function planeMeshes(){const RD=[0.72,0.06,0.05],RD2=[0.55,0.04,0.04],GD=[0.92,0.72,0.3],MR=[0.38,0.05,0.06],CH=[0.86,0.87,0.9],BK=[0.08,0.08,0.09],TY=[0.1,0.1,0.11],GL=COL.glass,
    WH=[0.85,0.85,0.88],ST=[0.55,0.56,0.6];
  const body=vmesh();
  // ---- fuselage: a lofted body of rounded sections from the cowling back to the tail post
  const secs=[// x, centre y, half width, half height (top), half height (bottom)
    [2.45,0.0,0.68,0.68,0.68],[2.2,0.0,0.7,0.72,0.72],[1.6,0.02,0.66,0.74,0.7],[0.9,0.05,0.6,0.78,0.66],[0.2,0.08,0.56,0.8,0.62],[-0.6,0.06,0.52,0.74,0.58],[-1.5,0.05,0.44,0.6,0.5],
    [-2.5,0.06,0.34,0.46,0.4],[-3.4,0.1,0.24,0.34,0.3],[-4.2,0.16,0.14,0.24,0.2],[-4.75,0.2,0.05,0.14,0.1]],NS=20;
  const ring=(s)=>{const out=[];for(let k=0;k<NS;k++){const a=k/NS*Math.PI*2,c=Math.cos(a),sn=Math.sin(a),hh=sn>0?s[3]:s[4];const e=2.6,ce=Math.sign(c)*Math.pow(Math.abs(c),2/e),se=Math.sign(sn)*Math.pow(Math.abs(sn),2/e);out.push([s[0],s[1]+se*hh,ce*s[2]]);}return out;};
  const R=secs.map(ring);for(let i=0;i+1<R.length;i++)for(let k=0;k<NS;k++){const a=R[i][k],b=R[i][(k+1)%NS],c=R[i+1][(k+1)%NS],d=R[i+1][k];
    const n=[0,(a[1]+b[1]+c[1]+d[1])/4-(secs[i][1]+secs[i+1][1])/2,(a[2]+b[2]+c[2]+d[2])/4];const l=Math.hypot(...n)||1;vq(body,a,d,c,b,[0.15,n[1]/l,n[2]/l],RD,1);}
  {const c=R[R.length-1],e=secs[secs.length-1];for(let k=0;k<NS;k++)vt(body,[e[0]-0.02,e[1],0],c[(k+1)%NS],c[k],[-1,0,0],RD,1);}
  // gold and maroon lightning stripe along both sides
  for(const z of [-1,1]){const pts=[[2.2,0.28],[0.9,0.2],[0.6,0.36],[-0.2,0.06],[-2.5,-0.05],[-4.3,0.12]];for(let i=0;i+1<pts.length;i++){const a=pts[i],b=pts[i+1],za=z*(secs[0][2]+0.002),f=x=>{let j=0;while(j<secs.length-1&&secs[j+1][0]>x)j++;const s0=secs[j],s1=secs[Math.min(j+1,secs.length-1)],t=s0[0]===s1[0]?0:(x-s0[0])/(s1[0]-s0[0]);return(s0[2]+(s1[2]-s0[2])*t)*0.995+0.008;};
      for(const [dy,col,w] of [[0,MR,0.07],[0.06,GD,0.018],[-0.06,GD,0.018]])vq(body,[a[0],a[1]+dy-w,z*f(a[0])],[a[0],a[1]+dy+w,z*f(a[0])],[b[0],b[1]+dy+w,z*f(b[0])],[b[0],b[1]+dy-w,z*f(b[0])],[0,0,z],col,1);}}
  // ---- cowling: the big NACA cowl with its polished lip, the radial engine cylinders behind the opening, chrome spinner (spinner turns: prop mesh)
  vcylN(body,[1.95,0,0],[2.95,0,0],0.74,0.74,28,RD,1,null,false);vcylN(body,[2.95,0,0],[3.05,0,0],0.74,0.68,28,RD,1,null,false);vcylN(body,[3.05,0,0],[3.08,0,0],0.68,0.58,28,CH,1,null,false);
  for(const r of [0.55,0.5])vcylN(body,[2.6,0,0],[3.0,0,0],r,r,24,BK,3,null,false);for(let k=0;k<9;k++){const a=k/9*Math.PI*2;vcylN(body,[2.72,Math.sin(a)*0.28,Math.cos(a)*0.28],[2.72,Math.sin(a)*0.5,Math.cos(a)*0.5],0.07,0.06,8,[0.3,0.3,0.32],1);}
  vcylN(body,[2.6,0,0],[2.75,0,0],0.26,0.26,16,[0.25,0.25,0.27],1);
  for(const z of [-1,1]){const P=[[2.9,0.42],[2.4,0.42],[2.25,0.3],[1.95,0.3]];for(let i=0;i+1<P.length;i++){vbar(body,P[i],P[i+1],z*0.735,0.03,0.01,GD,1);}}
  vcylN(body,[1.7,-0.62,0.4],[2.3,-0.62,0.4],0.06,0.06,8,CH,1);vcylN(body,[1.2,-0.6,-0.45],[1.9,-0.6,-0.45],0.08,0.07,8,BK,3);
  // ---- cabin: windscreen and side windows (glass), the roof fairing into the upper wing
  {const x0=1.4,x1=0.95,y0=0.62,y1=1.0;for(const z of [-1,1]){vq(body,[x0,y0,z*0.48],[x1,y1,z*0.4],[x1,y1,z*0.02],[x0,y0,z*0.02],[0.5,0.8,0],GL,2);}
    for(const z of [-1,1]){const zz=z*0.6;vq(body,[0.9,0.35,zz],[0.9,0.85,zz*0.8],[-0.55,0.82,zz*0.8],[-0.75,0.35,zz],[0,0,z],GL,2);vbar(body,[0.15,0.36],[0.15,0.83],zz*0.94,0.05,0.04,RD,1);vbar(body,[-0.75,0.35],[-0.55,0.82],zz*0.98,0.05,0.04,RD,1);}
    vbox(body,[0.15,0.95,0],[1.6,0.12,0.9],RD,1);for(const z of [-1,1])vbar(body,[1.0,0.86],[-0.8,0.86],z*0.47,0.05,0.04,RD,1);}
  // pilot and passenger
  for(const [x,z] of [[0.35,-0.25],[0.35,0.25]]){vcylN(body,[x,0.1,z],[x,0.6,z],0.17,0.15,8,[0.2,0.3,0.55],0);vcylN(body,[x,0.6,z],[x,0.66,z],0.08,0.08,6,[0.8,0.65,0.55],0);vcylN(body,[x,0.66,z],[x,0.88,z],0.11,0.1,8,[0.82,0.66,0.55],0);vcylN(body,[x+0.02,0.82,z],[x+0.02,0.92,z],0.12,0.1,8,BK,3);}
  // ---- wings: negative stagger (lower wing ahead of the upper), elliptic-ish tips, slight dihedral
  const wing=(x0,y0,semi,chord,dih,tip,col)=>{const NSp=10,prof=t=>{/* thin cambered aerofoil: upper and lower surface heights at chord fraction t (0 = leading edge) */const th=0.13*chord;return[th*(1.5*Math.sqrt(Math.max(t,0))*(1-t)),-th*0.35*Math.sqrt(Math.max(t,0))*(1-t)];};
    for(const zs of [-1,1])for(let i=0;i<NSp;i++){const s0=i/NSp,s1=(i+1)/NSp,cf=s=>s<0.75?1:Math.sqrt(1-Math.pow((s-0.75)/0.25,2))*0.7+0.3*Math.cos((s-0.75)/0.25*1.4),
      sec=(s,t)=>{const c=chord*cf(s),le=x0+(tip?0.18*Math.max(0,s-0.6):0),x=le-t*c,y=y0+s*semi*dih,z=zs*(0.45+s*semi);const p=prof(t);return[[x,y+p[0]*cf(s),z],[x,y+p[1]*cf(s),z]];};
      for(let j=0;j<8;j++){const t0=j/8,t1=(j+1)/8,a=sec(s0,t0),b=sec(s0,t1),c=sec(s1,t1),d=sec(s1,t0);
        vq(body,a[0],d[0],c[0],b[0],[0,1,0],col,1);vq(body,a[1],b[1],c[1],d[1],[0,-1,0],col,1);}
      const e0=sec(s1,0),e1=sec(s1,1);if(i===NSp-1)vq(body,e0[0],e0[1],e1[1],e1[0],[0,0,zs],col,1);}};
  wing(0.95,1.08,4.42,1.55,0.03,true,RD);// upper wing (behind)
  wing(1.85,-0.62,4.3,1.5,0.06,true,RD);// lower wing (ahead): the gear folds into its roots
  // I-struts between the wings, with flying and landing wires
  for(const z of [-1,1]){const zz=z*3.25,ya=-0.45,yb=1.1;vob(body,[1.1,(ya+yb)/2,zz],[-0.42,0,0],[0.18,(yb-ya)/2,0],[0,0,0.045],RD,1);
    for(const dx of [-0.38,0.38])vbar(body,[1.15+dx-0.42*((-0.45-ya)/(yb-ya)),ya],[1.15+dx-0.42,yb],zz,0.06,0.07,RD,1);
    vcylN(body,[1.5,-0.42,z*0.6],[0.9,1.1,zz*0.98],0.008,0.008,4,ST,1);vcylN(body,[0.9,-0.42,z*0.6],[1.4,1.1,zz*0.98],0.008,0.008,4,ST,1);vcylN(body,[0.55,0.95,z*0.55],[1.6,-0.5,z*0.9],0.03,0.03,6,RD,1);}
  // ---- tail: fin, rudder post, tailplane with struts (rudder and elevators are separate meshes so they move)
  {vq(body,[-3.9,0.3,0],[-4.8,0.3,0],[-4.85,1.25,0],[-4.35,1.25,0],[0,0,1],RD,1);vq(body,[-3.9,0.3,-0.001],[-4.35,1.25,-0.001],[-4.85,1.25,-0.001],[-4.8,0.3,-0.001],[0,0,-1],RD,1);
    for(const z of [-1,1]){const P=(x,zz)=>[x,0.22,z*zz];vq(body,P(-3.6,0.12),P(-3.9,1.65),P(-4.35,1.7),P(-4.45,0.12),[0,1,0],RD,1);vq(body,P(-3.6,0.12),P(-4.45,0.12),P(-4.35,1.7),P(-3.9,1.65),[0,-1,0],RD,1);
      vcylN(body,[-4.0,-0.1,z*0.1],[-4.05,0.21,z*1.0],0.02,0.02,6,RD,1);}
    vq(body,[-4.42,0.95,0.002],[-4.42,0.6,0.002],[-4.45,0.6,0.002],[-4.45,0.95,0.002],[0,0,1],WH,0);}
  // registration NC 18S on the rudder area of the fin (white letters as small plates)
  // ---- moving parts
  const prop=vmesh();vcylN(prop,[0,0,0],[0.42,0,0],0.3,0.02,16,CH,1);vcylN(prop,[-0.06,0,0],[0,0,0],0.31,0.31,16,CH,1);
  for(const e of [-1,1]){vob(prop,[0.08,e*0.62,0],[0.03,0,0],[0,0.62,0],[0,0,0.11],BK,3);vob(prop,[0.085,e*1.15,0],[0.03,0,0],[0,0.06,0],[0,0,0.1],[0.9,0.75,0.1],0);}
  const disc=vmesh();for(let k=0;k<24;k++){const a0=k/24*6.283,a1=(k+1)/24*6.283;vq(disc,[0.1,0,0],[0.1,Math.sin(a0)*1.2,Math.cos(a0)*1.2],[0.1,Math.sin(a1)*1.2,Math.cos(a1)*1.2],[0.1,0,0],[1,0,0],[0.5,0.5,0.52],2);}
  const gear=vmesh();// one main gear leg in its own frame: hinge at the origin, the leg hangs down (−y), wheel at the bottom
  {vcylN(gear,[0,0,0],[-0.05,-1.0,0],0.07,0.06,8,RD,1);vcylN(gear,[-0.05,-0.7,0],[-0.05,-1.0,0],0.035,0.035,6,CH,1);for(let k=0;k<5;k++)vcylN(gear,[-0.05,-0.72-k*0.05,0],[-0.05,-0.74-k*0.05,0],0.06,0.06,8,CH,1);
    vob(gear,[0.05,-0.75,0.1],[0.24,0,0],[0,0.22,0],[0,0,0.01],RD,1);vcylN(gear,[-0.05,-1.23,-0.11],[-0.05,-1.23,0.11],0.28,0.28,16,TY,0);vcylN(gear,[-0.05,-1.23,0.11],[-0.05,-1.23,0.13],0.14,0.14,12,RD,1);vcylN(gear,[-0.05,-1.23,-0.13],[-0.05,-1.23,-0.11],0.14,0.14,12,RD,1);
    vbar(gear,[0.1,-0.95],[-0.3,-0.95],0.13,0.05,0.04,RD,1);}
  const tailw=vmesh();vcylN(tailw,[0,0,0],[0.1,-0.45,0],0.03,0.03,6,BK,3);vcylN(tailw,[0.1,-0.55,-0.05],[0.1,-0.55,0.05],0.12,0.12,12,TY,0);
  const surf=(pts,col)=>{const M=vmesh();for(let i=0;i+1<pts.length;i+=2){}return M;};
  const elev=vmesh();for(const z of [-1,1]){const P=(x,zz)=>[x,0,z*zz];vq(elev,P(0,0.12),P(0,1.7),P(-0.55,1.62),P(-0.6,0.15),[0,1,0],RD,1);vq(elev,P(0,0.12),P(-0.6,0.15),P(-0.55,1.62),P(0,1.7),[0,-1,0],RD,1);}
  const rud=vmesh();vq(rud,[0,-0.05,0],[0,1.2,0],[-0.5,1.1,0],[-0.55,-0.05,0],[0,0,1],RD,1);vq(rud,[0,-0.05,0],[-0.55,-0.05,0],[-0.5,1.1,0],[0,1.2,0],[0,0,-1],RD,1);
  for(const [y,ch] of [[0.75,0],[0.5,1]])vbox(rud,[-0.3,y,0.012],[0.3,0.12,0.005],[0.95,0.95,0.95],0);
  const ailM=sg=>{const M=vmesh();const P=(x,y,z)=>[x,y,sg*z];vq(M,P(0,0.06,0),P(0,0.06,1.6),P(-0.36,0.01,1.5),P(-0.36,0.01,0),[0,1,0],RD,1);vq(M,P(0,-0.03,0),P(-0.36,0,0),P(-0.36,0,1.5),P(0,-0.03,1.6),[0,-1,0],RD,1);return M;};
  return [body,prop,disc,gear,tailw,elev,rud,ailM(-1),ailM(1)];}
// ---- flight model: rigid body (position, velocity in the world; attitude as a quaternion; body rates), aerodynamics from lift/drag curves
// with a stall, propeller thrust from power and speed, control moments scaled by dynamic pressure and propwash, gear and flaps drag,
// three wheel contacts with springs, brakes and a steerable tailwheel. Assists: coordinated turns (auto-rudder) and "easy" (bank and
// pitch limits, no stall).
const Q={mul(a,b){return[a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]];},
  rot(q,v){const p=[0,v[0],v[1],v[2]],r=Q.mul(Q.mul(q,p),[q[0],-q[1],-q[2],-q[3]]);return[r[1],r[2],r[3]];},inv(q){return[q[0],-q[1],-q[2],-q[3]];},
  norm(q){const l=Math.hypot(...q)||1;return q.map(v=>v/l);},axis(ax,a){const s=Math.sin(a/2);return[Math.cos(a/2),ax[0]*s,ax[1]*s,ax[2]*s];}};
const Plane={on:false,cam:'chase',st:null,ctl:{thr:0,pitch:0,roll:0,yaw:0,brake:0},gear:1,gearPos:1,flaps:0,flapPos:0,easy:true,coord:true,prop:0,crashed:false,
  spawn(at){if(!App.T){UI.toast('Wait for the world to load');return;}const T=App.T;let x,z,h;
    // a runway-like spot: the longest flat, dry stretch near the camera (else take off in the air)
    const c=Cam.target,flat=(x0,z0,hd,L)=>{let mn=1e9,mx=-1e9;for(let t=0;t<=L;t+=10){const px=x0+Math.cos(hd)*t,pz=z0+Math.sin(hd)*t;if(px<40||pz<40||px>T.W-40||pz>T.W-40)return 1e9;const w=sampleWater(T,px,pz);if(w[1]>0&&w[0]>R.sampleHr(T,px,pz)-0.2)return 1e9;const g=R.sampleHr(T,px,pz);mn=Math.min(mn,g);mx=Math.max(mx,g);}return mx-mn;};
    let best=null;for(let k=0;k<500;k++){const px=c[0]+(Math.random()-0.5)*2500,pz=c[2]+(Math.random()-0.5)*2500,hd=Math.random()*6.283,f=flat(px,pz,hd,420);if(f<3.5&&(!best||f<best.f))best={x:px,z:pz,h:hd,f};}
    const air=!best;if(air){x=c[0];z=c[2];h=Cam.yaw+Math.PI;}else{x=best.x;z=best.z;h=best.h;}
    const g=R.sampleHr(T,x,z),y=air?Math.max(g,this.groundAt(x,z))+300:g+2.2;
    // nose up on the ground (taildragger: about 11°), level in the air
    const q0=Q.axis([0,1,0],-h),qp=Q.axis([0,0,1],air?0:0.19);
    this.st={p:[x,y,z],v:air?Q.rot(q0,[60,0,0]):[0,0,0],q:Q.norm(Q.mul(q0,qp)),w:[0,0,0]};this.ctl={thr:air?0.7:0,pitch:0,roll:0,yaw:0,brake:air?0:1};this.gear=air?0:1;this.gearPos=this.gear;this.flaps=0;this.flapPos=0;this.crashed=false;this.on=true;this.prop=0;
    if(Build.active)Build.exit();if(Drive.active)Drive.exit();if(MapView.on)MapView.close();this.setCam(this.cam||'chase');PlaneUI.show(true);UI.toast(air?'Flying: no flat ground nearby, so you start in the air':'Ready on a flat field: full throttle, keep it straight, lift off at about 110 km/h');},
  exit(){this.on=false;PlaneUI.show(false);Cam.mode='free';Cam.up=null;if(this.st){Cam.target=this.st.p.slice();Cam.dist=60;}},
  groundAt(x,z){const T=App.T;if(!T)return 0;const g=R.sampleHr(T,clamp(x,0,T.W),clamp(z,0,T.W)),w=sampleWater(T,clamp(x,0,T.W),clamp(z,0,T.W));return w[1]>0?Math.max(g,w[0]):g;},
  water(x,z){const T=App.T;const w=sampleWater(T,clamp(x,0,T.W),clamp(z,0,T.W));return w[1]>0&&w[0]>R.sampleHr(T,x,z)+0.1;},
  setCam(c){this.cam=c;Cam.anim=null;if(c==='orbit'){Cam.mode='free';Cam.up=null;if(this.st){Cam.target=this.st.p.slice();Cam.dist=25;}}else Cam.mode='plane';PlaneUI.refresh();},
  update(dt){if(!this.on||!this.st)return;const n=Math.max(1,Math.ceil(dt/0.008));for(let i=0;i<n;i++)this.step(dt/n);
    this.gearPos+=clamp(this.gear-this.gearPos,-dt/6,dt/6);this.flapPos+=clamp(this.flaps/2-this.flapPos,-dt/3,dt/3);
    this.prop=(this.prop+dt*this.rpm()/60*6.283)%6.283;if(this.cam==='orbit'){const p=this.st.p;for(let k=0;k<3;k++)Cam.target[k]+=(p[k]-Cam.target[k])*Math.min(1,dt*8);}Sfx.plane&&Sfx.plane(this);},
  rpm(){return this.crashed?0:900+this.ctl.thr*1300+Math.hypot(...this.st.v)*4;},
  step(dt){const s=this.st,c=this.ctl,rho=1.225*Math.exp(-s.p[1]/9000);if(this.crashed){s.v=s.v.map(v=>v*Math.max(0,1-dt*2));s.w=s.w.map(v=>v*Math.max(0,1-dt*3));return;}
    const qi=Q.inv(s.q),vb=Q.rot(qi,s.v),V=Math.hypot(...vb),qd=0.5*rho*V*V,alpha=Math.atan2(-vb[1],Math.max(vb[0],0.1)),beta=V>1?Math.asin(clamp(vb[2]/V,-1,1)):0;
    // lift curve with a stall at ~16° (flaps add lift and move the stall), "easy" keeps it on the linear part
    const fl=this.flapPos,a0=-0.035-fl*0.07,aS=0.28-fl*0.03,ae=alpha-a0;let CL=5.2*ae;if(Math.abs(ae)>aS&&!this.easy){const ex=Math.abs(ae)-aS;CL=Math.sign(ae)*(5.2*aS-ex*4.2);CL=Math.sign(ae)*Math.max(Math.abs(CL),0.6*Math.abs(Math.sin(2*ae)));}if(this.easy)CL=clamp(CL,-1.4,1.55+fl*0.4);
    const CD=0.0205+0.06*CL*CL/(Math.PI*6.0*0.8)+this.gearPos*0.016+fl*0.045+(Math.abs(ae)>aS?0.25*Math.sin(Math.abs(ae)):0),CY=-0.9*beta;
    // forces in the body frame: lift at right angles to the airflow in the plane of symmetry, drag along it, side force; thrust along x
    const ux=V>0.1?vb[0]/V:1,uy=V>0.1?vb[1]/V:0,uz=V>0.1?vb[2]/V:0,L=qd*PL.S*CL,D=qd*PL.S*CD,Y=qd*PL.S*CY;
    const lift=[-uy*L/Math.max(Math.hypot(ux,uy),1e-3)*Math.hypot(ux,uy),ux*L,0];
    const Tst=5200,thr=c.thr*Math.min(Tst,PL.P*0.82/Math.max(V,8))*(rho/1.225);
    let F=[thr+lift[0]-ux*D,lift[1]-uy*D,Y-uz*D];
    // moments: stability (pitch, weathercock, dihedral), damping, controls (with propwash at low speed); assists
    const qw=qd+0.5*rho*Math.pow(c.thr*28,2)*0.6,w=s.w,b=PL.span,ch=1.5;
    let ail=c.roll,ele=c.pitch,rud=c.yaw;if(this.coord&&V>15)rud+=clamp(beta*2.5,-0.6,0.6)+ail*0.15;/* coordinated: the rudder cancels the slip and the adverse yaw */
    if(this.easy){const up=Q.rot(s.q,[0,1,0]),fw=Q.rot(s.q,[1,0,0]),bank=Math.atan2(-Q.rot(s.q,[0,0,1])[1],up[1]),pitch=Math.asin(clamp(fw[1],-1,1));
      if(Math.abs(bank)>1.05&&Math.sign(ail)===Math.sign(-bank)*-1)ail*=0.2;ail+=clamp((Math.abs(c.roll)<0.05?-bank*1.2:0),-0.5,0.5);if(pitch>0.45&&ele>0)ele*=0.3;if(pitch<-0.6&&ele<0)ele*=0.3;}
    const Cl=-0.09*beta+0.17*ail-0.45*w[0]*b/(2*Math.max(V,10)),Cm=0.02-0.95*ae+0.95*ele-fl*0.05-10*w[2]*ch/(2*Math.max(V,10)),Cn=-0.11*beta-0.11*rud-0.18*w[1]*b/(2*Math.max(V,10));
    let M=[qw*PL.S*b*Cl,qw*PL.S*b*Cn,qw*PL.S*ch*Cm];
    // ground: three wheels (or the belly with the gear up), springs and dampers, rolling friction, brakes, tailwheel steering
    const G=this.gearPos>0.95?PL.wheels:PL.belly;let onG=0;const Fw=[0,0,0];
    G.forEach((cp,i)=>{const wp=Q.rot(s.q,cp),P=[s.p[0]+wp[0],s.p[1]+wp[1],s.p[2]+wp[2]],gy=this.groundAt(P[0],P[2]),pen=gy-P[1];if(pen<=0)return;onG++;
      if(this.water(P[0],P[2])&&V>3){this.crash('In the water');return;}
      const vp=[s.v[0]-(w[1]*0+0),s.v[1],s.v[2]];const wv=Q.rot(s.q,[w[0],w[1],w[2]]),rv=[wv[1]*wp[2]-wv[2]*wp[1],wv[2]*wp[0]-wv[0]*wp[2],wv[0]*wp[1]-wv[1]*wp[0]],pv=[s.v[0]+rv[0],s.v[1]+rv[1],s.v[2]+rv[2]];
      if(G!==PL.wheels&&-pv[1]>2.5){this.crash('Belly landing');}if(-pv[1]>5.5){this.crash('Hard landing');return;}
      const k=i<2?160000:60000,dmp=i<2?14000:6000,N=Math.max(0,k*pen-dmp*pv[1]);
      // friction in the wheel's rolling direction (low, brakes add) and sideways (high): in world, along the body's x and z
      const fx=Q.rot(s.q,[1,0,0]),fz=Q.rot(s.q,[0,0,1]);let hx=[fx[0],0,fx[2]],hl=Math.hypot(hx[0],hx[2])||1;hx=[hx[0]/hl,0,hx[2]/hl];let hz=[-hx[2],0,hx[0]];
      if(i===2&&G===PL.wheels){const st=-rud*0.5*(V<25?1:0.3);const c2=Math.cos(st),s2=Math.sin(st);const nx=[hx[0]*c2-hz[0]*s2,0,hx[2]*c2-hz[2]*s2];hz=[-nx[2],0,nx[0]];hx=nx;}
      const vr=pv[0]*hx[0]+pv[2]*hx[2],vs=pv[0]*hz[0]+pv[2]*hz[2],mu=G===PL.wheels?(0.02+(i<2?c.brake*0.6:0)):0.5,Fr=-Math.sign(vr)*Math.min(Math.abs(vr)*8000,mu*N),Fs=-clamp(vs*9000,-0.8*N,0.8*N);
      const f=[hx[0]*Fr+hz[0]*Fs,N,hx[2]*Fr+hz[2]*Fs];Fw[0]+=f[0];Fw[1]+=f[1];Fw[2]+=f[2];const fb=Q.rot(qi,f);M=[M[0]+cp[1]*fb[2]-cp[2]*fb[1],M[1]+cp[2]*fb[0]-cp[0]*fb[2],M[2]+cp[0]*fb[1]-cp[1]*fb[0]];});
    if(this.crashed)return;
    // integrate: forces to the world, gravity; rates with a diagonal inertia
    const Fwld=Q.rot(s.q,F);const m=PL.m,acc=[(Fwld[0]+Fw[0])/m,(Fwld[1]+Fw[1])/m-9.81,(Fwld[2]+Fw[2])/m];for(let k=0;k<3;k++){s.v[k]+=acc[k]*dt;s.p[k]+=s.v[k]*dt;}
    const I=[1700,4300,2900];for(let k=0;k<3;k++)s.w[k]+=M[k]/I[k]*dt;if(onG)s.w=s.w.map(v=>v*(1-dt*1.5));
    const wq=[0,s.w[0],s.w[1],s.w[2]],dq=Q.mul(s.q,wq);s.q=Q.norm(s.q.map((v,k)=>v+0.5*dq[k]*dt));
    // terrain: never below the ground with the fuselage
    const gy=this.groundAt(s.p[0],s.p[2]);if(s.p[1]<gy+0.5){if(Math.hypot(...s.v)>12)this.crash('Crashed into the ground');s.p[1]=gy+0.5;}
    const T=App.T;if(s.p[0]<-2000||s.p[2]<-2000||s.p[0]>T.W+2000||s.p[2]>T.W+2000){s.v=s.v.map(v=>-v);UI.toast('The edge of the world: turned around');}
    this.alpha=ae;this.V=V;this.onG=onG;this.stall=!this.easy&&Math.abs(ae)>aS*0.9&&V>5;},
  crash(why){if(this.crashed)return;this.crashed=true;this.st.v=this.st.v.map(v=>v*0.2);UI.toast(why+' — tap Reset to try again');if(P.smoke)for(let k=0;k<40;k++){const p=this.st.p;Particles.spawn(p[0],p[1],p[2],(Math.random()-0.5)*4,2+Math.random()*3,(Math.random()-0.5)*4,3,0.5,3,0);}PlaneUI.refresh();},
  // body-frame matrix for drawing (column-major, like the train poses)
  mat(off,extra){const s=this.st,qq=extra?Q.mul(s.q,extra):s.q,X=Q.rot(qq,[1,0,0]),Y=Q.rot(qq,[0,1,0]),Z=Q.rot(qq,[0,0,1]),o=Q.rot(s.q,off||[0,0,0]);
    return new Float32Array([X[0],X[1],X[2],0,Y[0],Y[1],Y[2],0,Z[0],Z[1],Z[2],0,s.p[0]+o[0],s.p[1]+o[1],s.p[2]+o[2],1]);},
  draw(p){if(!this.on||!this.st||!R.planeMesh)return;const M=R.planeMesh,dm=(m,mat)=>{gl.uniformMatrix4fv(p.u('uModel'),false,mat);gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,0);Stats.draws++;Stats.tris+=m.count/3;};
    gl.uniform1f(p.u('uDist'),0);dm(M[0],this.mat());const r=this.rpm(),c=this.ctl;
    dm(M[1],this.mat([PL.propX,0,0],Q.axis([1,0,0],this.prop)));if(r>1400)dm(M[2],this.mat([PL.propX,0,0]));
    const ga=-(1-this.gearPos)*1.45;/* the legs fold aft into the lower wing roots */for(const z of [-1,1])dm(M[3],this.mat([PL.gearHinge[0],PL.gearHinge[1],z*1.0],Q.axis([0,0,1],ga)));
    dm(M[4],this.mat([-4.6,-0.45,0],Q.axis([0,0,1],-(1-this.gearPos)*1.2)));
    dm(M[5],this.mat([-4.45,0.22,0],Q.axis([0,0,1],-c.pitch*0.35)));dm(M[6],this.mat([-4.8,0.25,0],Q.axis([0,1,0],c.yaw*0.4)));
    dm(M[7],this.mat([-0.22,1.17,-2.95],Q.axis([0,0,1],c.roll*0.3)));dm(M[8],this.mat([-0.22,1.17,2.95],Q.axis([0,0,1],-c.roll*0.3)));},
  // camera modes: chase (behind and above, smoothed), cockpit (pilot's eye, rolls with the plane), wing (on the left wing looking in),
  // tower (a fixed spot watching it pass, moved on when far), orbit (the free camera around the plane: drag to turn, pinch to zoom)
  camera(dt){const s=this.st,P0=s.p,F=Q.rot(s.q,[1,0,0]),U=Q.rot(s.q,[0,1,0]),Zr=Q.rot(s.q,[0,0,1]);let p,look,up=[0,1,0],cab=false;
    if(this.cam==='cockpit'){const e=Q.rot(s.q,PL.eye);p=[P0[0]+e[0],P0[1]+e[1],P0[2]+e[2]];look=[p[0]+F[0]*20+U[0]*-1,p[1]+F[1]*20+U[1]*-1,p[2]+F[2]*20+U[2]*-1];up=U;cab=true;}
    else if(this.cam==='wing'){const e=Q.rot(s.q,[0.4,1.35,-4.2]);p=[P0[0]+e[0],P0[1]+e[1],P0[2]+e[2]];look=[P0[0]+F[0]*1.5,P0[1]+F[1]*1.5,P0[2]+F[2]*1.5];up=U;cab=true;}
    else if(this.cam==='tower'){if(!this.tw||Math.hypot(this.tw[0]-P0[0],this.tw[2]-P0[2])>700){const v=s.v,vl=Math.hypot(v[0],v[2])||1,ax=P0[0]+v[0]/vl*350+(-v[2]/vl)*120,az=P0[2]+v[2]/vl*350+(v[0]/vl)*120;this.tw=[ax,this.groundAt(ax,az)+6,az];}p=this.tw.slice();look=P0.slice();}
    else{const hd=Math.hypot(F[0],F[2])>0.1?[F[0],0,F[2]]:[s.v[0],0,s.v[2]],hl=Math.hypot(hd[0],hd[2])||1,want=[P0[0]-hd[0]/hl*16,P0[1]+4.5,P0[2]-hd[2]/hl*16];if(!this.cp)this.cp=want.slice();const k=Math.min(1,dt*3.5);for(let i=0;i<3;i++)this.cp[i]+=(want[i]-this.cp[i])*k;p=this.cp.slice();look=[P0[0]+F[0]*4,P0[1]+1,P0[2]+F[2]*4];}
    const gh=this.groundAt(p[0],p[2])+0.6;if(p[1]<gh)p[1]=gh;return{p,look,up,cab};}};
// ---- the flying controls: throttle slider (left), stick (right: pitch and roll), rudder and brake buttons, gear, flaps, camera, reset, exit
const PlaneUI={show(on){$('#planeUI').hidden=!on;document.body.classList.toggle('flying',on);if(on)this.refresh();},
  refresh(){if(!Plane.on)return;$('#plGear').textContent=Plane.gear?'Gear ▼':'Gear ▲';$('#plFlaps').textContent='Flaps '+['0','½','1'][Plane.flaps];$('#plCam').textContent='📷 '+{chase:'Chase',cockpit:'Cockpit',wing:'Wing',tower:'Tower',orbit:'Orbit'}[Plane.cam];$('#plEasy').classList.toggle('on',Plane.easy);},
  hud(){if(!Plane.on||!Plane.st)return;const s=Plane.st,F=Q.rot(s.q,[1,0,0]),hd=((Math.atan2(F[2],F[0])*180/Math.PI+90)%360+360)%360,gy=Plane.groundAt(s.p[0],s.p[2]);
    $('#plHud').innerHTML=`<b>${Math.round((Plane.V||0)*3.6)}</b> km/h · ${Math.round(s.p[1]-gy)} m · ${(s.v[1]>=0?'+':'')}${s.v[1].toFixed(1)} m/s · ${String(Math.round(hd)).padStart(3,'0')}° · ${Math.round(Plane.ctl.thr*100)}%`+(Plane.stall?' · <span style="color:#ff6a5a">STALL</span>':'')+(Plane.gearPos>0&&Plane.gearPos<1?' · gear moving':'');},
  bind(){const on=(id,f)=>{$(id).onclick=f;};on('#plGear',()=>{Plane.gear=Plane.gear?0:1;if(Plane.onG&&!Plane.gear){Plane.gear=1;UI.toast('Not on the ground');}this.refresh();});on('#plFlaps',()=>{Plane.flaps=(Plane.flaps+1)%3;this.refresh();});
    on('#plCam',()=>{const L=['chase','cockpit','wing','tower','orbit'];Plane.setCam(L[(L.indexOf(Plane.cam)+1)%L.length]);});on('#plExit',()=>Plane.exit());on('#plReset',()=>Plane.spawn());on('#plEasy',()=>{Plane.easy=!Plane.easy;UI.toast(Plane.easy?'Assists on: bank and pitch limits, no stall':'Assists off: it can stall and spin');this.refresh();});
    const hold=(id,k,v)=>{const e=$(id);e.onpointerdown=ev=>{ev.preventDefault();Plane.ctl[k]=v;};e.onpointerup=e.onpointerleave=e.onpointercancel=()=>{Plane.ctl[k]=0;};};hold('#plRudL','yaw',-1);hold('#plRudR','yaw',1);hold('#plBrake','brake',1);
    const th=$('#plThr');th.oninput=()=>{Plane.ctl.thr=+th.value/100;};
    const st=$('#plStick'),kn=$('#plKnob');let id=null;const mv=ev=>{const r=st.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,R=r.width/2-14;let dx=(ev.clientX-cx)/R,dy=(ev.clientY-cy)/R;const l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l;}
      Plane.ctl.roll=dx;Plane.ctl.pitch=dy;/* stick back (finger down) = nose up */kn.style.transform=`translate(${dx*R}px,${dy*R}px)`;};
    st.onpointerdown=ev=>{ev.preventDefault();id=ev.pointerId;st.setPointerCapture(id);mv(ev);};st.onpointermove=ev=>{if(ev.pointerId===id)mv(ev);};st.onpointerup=st.onpointercancel=ev=>{if(ev.pointerId!==id)return;id=null;Plane.ctl.roll=0;Plane.ctl.pitch=0;kn.style.transform='';};}};
