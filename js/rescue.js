'use strict';
// ===== rescue.js
// ===================================================================
// The rescue helicopter's work (4.37.0): bought in the store, it comes with a helipad beside every land airstrip (on the graded apron side,
// toward the first end); the hoist over the right-hand door has a winch to lower and raise; missions are taken at the airfield.
// Missions (three on offer at a time, one taken at a time):
//  - Injured hiker: lying high on a steep slope where no helicopter can land, a companion waving, a smoke column over them. Hover, lower
//    the hook to them (it catches by itself), raise them into the cabin, fly back to a helipad: an ambulance waits; paid on landing.
//  - Boat capsized: an upturned boat at sea and two people in life jackets in the swell. Both must be lifted, then back to a pad.
//  - Supply drop: a crate (red cross) on the pad. Hook it, fly it to a lighthouse or a village on the far side, lower it into the marked
//    circle: paid when it stands inside.
// Cancelling costs a tenth of the pay (at least €1.000) and the board tells what became of the people; it keeps count of lives saved and lost.
// The winch: hold ▼ to pay out (3 m/s, the door opens first), ▲ to reel in (2 m/s), up to 60 m; the hook swings on its cable (a damped
// pendulum hung from the hoist), rests on the ground and floats on water. A controller: D-pad down / up.
// ===================================================================
const RESCUE={padU:-200,padW:-52,padR:10,maxL:60,hoist:[0.9,1.12,1.02]};
const Rescue={offers:[],m:null,saved:0,lost:0,M:null,padMs:new Map(),wL:0,hook:null,hv:[0,0,0],load:null,_warn:0,
  // ---- the helipads
  pad(s){const c=Math.cos(s.h),sn=Math.sin(s.h),u=RESCUE.padU,w=RESCUE.padW,ln=s.ln||{m:0,c:R.sampleHr(App.T,s.x,s.z)};return{x:s.x+c*u-sn*w,z:s.z+sn*u+c*w,y:ln.c+ln.m*u+Math.abs(ln.m)*RESCUE.padR+0.25,h:s.h,s};},/* level, so lifted by the runway's slope over its radius; its edge reaches down into the ground */
  pads(){return Fleet.unlocks.heli&&App.T?Air.list.filter(s=>!s.water).map(s=>this.pad(s)):[];},
  nearestPad(x,z){let b=null,bd=1e18;for(const p of this.pads()){const d=Math.hypot(p.x-x,p.z-z);if(d<bd){bd=d;b=p;}}return b;},
  padAt(x,z){if(!Fleet.unlocks.heli)return null;for(const s of Air.list){if(s.water)continue;const p=this.pad(s);if(Math.abs(x-p.x)<RESCUE.padR&&Math.abs(z-p.z)<RESCUE.padR&&Math.hypot(x-p.x,z-p.z)<RESCUE.padR)return p.y;}return null;},
  onPad(pl){if(!pl.st||!pl.onG)return null;for(const p of this.pads())if(Math.hypot(pl.st.p[0]-p.x,pl.st.p[2]-p.z)<RESCUE.padR+2)return p;return null;},
  padMesh(s){const M=vmesh(),p=this.pad(s),c=Math.cos(p.h),sn=Math.sin(p.h),V=(q,n,col,m)=>{M.v.push(q[0],q[1],q[2],n[0],n[1],n[2],col[0],col[1],col[2],0,0,0,1,m||0);return M.n++;},
      Pt=(u,w,y)=>[p.x+c*u-sn*w,p.y+(y||0),p.z+sn*u+c*w],up=[0,1,0],R0=RESCUE.padR;
    const ann=(r0,r1,y,col,n,m)=>{n=n||40;for(let k=0;k<n;k++){const a0=k/n*6.2832,a1=(k+1)/n*6.2832,q=[[r0,a0],[r1,a0],[r1,a1],[r0,a1]].map(([r,a])=>V(Pt(Math.cos(a)*r,Math.sin(a)*r,y),up,col,m));M.i.push(q[0],q[1],q[2],q[0],q[2],q[3]);}};
    const rect=(u0,w0,u1,w1,y,col)=>{const q=[[u0,w0],[u1,w0],[u1,w1],[u0,w1]].map(([u,w])=>V(Pt(u,w,y),up,col,0));M.i.push(q[0],q[2],q[1],q[0],q[3],q[2]);};
    ann(0,R0,0,[0.6,0.6,0.58],48);// the concrete
    for(let k=0;k<48;k++){const a0=k/48*6.2832,a1=(k+1)/48*6.2832,n=[Math.cos((a0+a1)/2)*c-Math.sin((a0+a1)/2)*sn,0,Math.cos((a0+a1)/2)*sn+Math.sin((a0+a1)/2)*c],q=[[a0,0],[a1,0],[a1,-2.6],[a0,-2.6]].map(([a,y])=>V(Pt(Math.cos(a)*R0,Math.sin(a)*R0,y),n,[0.5,0.5,0.48],0));M.i.push(q[0],q[1],q[2],q[0],q[2],q[3]);}// its edge, down into the ground
    ann(R0-1.5,R0-1.0,0.01,[0.96,0.8,0.1],48);// the yellow touchdown circle
    rect(-2.6,-2.1,2.6,-1.3,0.015,[0.96,0.96,0.94]);rect(-2.6,1.3,2.6,2.1,0.015,[0.96,0.96,0.94]);rect(-0.4,-1.3,0.4,1.3,0.015,[0.96,0.96,0.94]);// the H, across the runway's direction
    for(let k=0;k<8;k++){const a=k/8*6.2832,q=Pt(Math.cos(a)*(R0-0.3),Math.sin(a)*(R0-0.3),0.12);ann2(M,V,q,0.13,[0.2,1,0.3]);}// green edge lights
    function ann2(M,V,q,r,col){const n=8;const ci=V([q[0],q[1]+r,q[2]],up,col,4);for(let k=0;k<n;k++){const a0=k/n*6.2832,a1=(k+1)/n*6.2832;M.i.push(ci,V([q[0]+Math.cos(a0)*r,q[1],q[2]+Math.sin(a0)*r],up,col,4),V([q[0]+Math.cos(a1)*r,q[1],q[2]+Math.sin(a1)*r],up,col,4));}}
    return R.uploadVeh(M);},
  drawPads(p,s){if(!Fleet.unlocks.heli||s.water)return;let m=this.padMs.get(s);if(!m){m=this.padMesh(s);this.padMs.set(s,m);}gl.uniformMatrix4fv(p.u('uModel'),false,M4.ident());gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,0);Stats.draws++;},
  resetPads(){for(const m of this.padMs.values())R.freeMesh&&R.freeMesh(m);this.padMs.clear();},
  // ---- small meshes: people, a crate, an upturned boat, an ambulance, the hook, a unit cable, the drop ring
  meshes(){if(this.M)return this.M;const mk=f=>{const M=vmesh();f(M);return R.uploadVeh(M);},V=(M,p,n,c,m)=>{M.v.push(p[0],p[1],p[2],n[0],n[1],n[2],c[0],c[1],c[2],0,0,0,1,m||0);return M.n++;},
      box=(M,c,h,col,m)=>{const P=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(v=>[c[0]+v[0]*h[0],c[1]+v[1]*h[1],c[2]+v[2]*h[2]]);
        for(const [f,n] of [[[0,1,2,3],[0,0,-1]],[[5,4,7,6],[0,0,1]],[[4,0,3,7],[-1,0,0]],[[1,5,6,2],[1,0,0]],[[3,2,6,7],[0,1,0]],[[4,5,1,0],[0,-1,0]]]){const ix=f.map(i=>V(M,P[i],n,col,m));M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);}},
      ball=(M,c,r,col,m,s)=>{s=s||[1,1,1];const n=10,h=6,id=[];for(let j=0;j<=h;j++)for(let i=0;i<=n;i++){const a=i/n*6.2832,b=-Math.PI/2+j/h*Math.PI,d=[Math.cos(b)*Math.cos(a),Math.sin(b),Math.cos(b)*Math.sin(a)];id.push(V(M,[c[0]+d[0]*r*s[0],c[1]+d[1]*r*s[1],c[2]+d[2]*r*s[2]],d,col,m));}
        for(let j=0;j<h;j++)for(let i=0;i<n;i++){const a=id[j*(n+1)+i],b=id[j*(n+1)+i+1],cc=id[(j+1)*(n+1)+i+1],d=id[(j+1)*(n+1)+i];M.i.push(a,b,cc,a,cc,d);}},
      SK=[0.86,0.63,0.5],RJ=[0.85,0.12,0.08],BL=[0.12,0.16,0.3],OV=[1,0.45,0.05],YL=[0.98,0.85,0.1];
    const standing=(M,jacket)=>{box(M,[0,0.45,-0.1],[0.07,0.45,0.07],BL);box(M,[0,0.45,0.1],[0.07,0.45,0.07],BL);box(M,[0,1.2,0],[0.12,0.32,0.2],jacket);ball(M,[0,1.66,0],0.12,SK);box(M,[0,1.2,-0.27],[0.06,0.3,0.06],jacket);};
    this.M={
      lying:mk(M=>{box(M,[0,0.12,0],[0.45,0.1,0.2],RJ);box(M,[0.75,0.1,-0.1],[0.32,0.07,0.07],BL);box(M,[0.75,0.1,0.1],[0.32,0.07,0.07],BL);ball(M,[-0.6,0.14,0],0.12,SK);box(M,[0.25,0.16,0.3],[0.22,0.06,0.06],RJ);}),
      stand:mk(M=>standing(M,[0.15,0.45,0.75])),arm:mk(M=>box(M,[0,0.3,0],[0.06,0.32,0.06],[0.15,0.45,0.75])),
      swim:mk(M=>{box(M,[0,0.05,0],[0.16,0.22,0.24],OV);ball(M,[0,0.42,0],0.12,SK);box(M,[0,0.15,0.34],[0.05,0.05,0.18],OV);box(M,[0,0.15,-0.34],[0.05,0.05,0.18],OV);}),
      hang:mk(M=>{standing(M,RJ);box(M,[0,1.36,0],[0.16,0.06,0.25],YL);}),// in the rescue strop
      crate:mk(M=>{box(M,[0,0.45,0],[0.6,0.45,0.45],[0.62,0.45,0.25]);for(const s of [-1,1]){box(M,[0,0.45,s*0.455],[0.32,0.09,0.01],[0.9,0.1,0.08]);box(M,[0,0.45,s*0.455],[0.09,0.32,0.01],[0.9,0.1,0.08]);}box(M,[0,0.905,0],[0.32,0.01,0.09],[0.9,0.1,0.08]);box(M,[0,0.905,0],[0.09,0.01,0.32],[0.9,0.1,0.08]);
        box(M,[0,1.05,0],[0.03,0.15,0.03],[0.2,0.2,0.2]);}),
      boat:mk(M=>{const n=16;for(let i=0;i<n;i++){const u0=-3+6*i/n,u1=-3+6*(i+1)/n,w=u=>1.05*Math.sqrt(Math.max(0,1-Math.pow(u/3,4))),d=u=>0.55*Math.sqrt(Math.max(0,1-Math.pow(u/3.05,2)));
          for(const s of [-1,1]){const a=V(M,[u0,0.15,s*w(u0)],[0,0,s],[0.95,0.95,0.93]),b=V(M,[u1,0.15,s*w(u1)],[0,0,s],[0.95,0.95,0.93]),cc=V(M,[u1,0.15+d(u1),s*w(u1)*0.4],[0,1,s],[0.7,0.15,0.1]),dd=V(M,[u0,0.15+d(u0),s*w(u0)*0.4],[0,1,s],[0.7,0.15,0.1]);M.i.push(a,b,cc,a,cc,dd);
            const e=V(M,[u0,0.15+d(u0),s*w(u0)*0.4],[0,1,0],[0.7,0.15,0.1]),f=V(M,[u1,0.15+d(u1),s*w(u1)*0.4],[0,1,0],[0.7,0.15,0.1]),g=V(M,[u1,0.15+d(u1)+0.05,0],[0,1,0],[0.7,0.15,0.1]),h=V(M,[u0,0.15+d(u0)+0.05,0],[0,1,0],[0.7,0.15,0.1]);M.i.push(e,f,g,e,g,h);}}}),
      amb:mk(M=>{box(M,[0,1.1,0],[2.6,0.95,1.05],[0.96,0.96,0.94]);box(M,[2.75,0.75,0],[0.35,0.55,1.0],[0.96,0.96,0.94]);for(const s of [-1,1]){box(M,[0,0.85,s*1.06],[2.6,0.12,0.01],[0.95,0.55,0.05]);box(M,[0,1.15,s*1.06],[2.6,0.08,0.01],[0.1,0.25,0.75]);}
        box(M,[2.9,1.05,0],[0.25,0.25,0.95],[0.1,0.12,0.15],13);box(M,[2.2,2.1,0],[0.15,0.06,0.5],[0.2,0.4,1],4);for(const [x,z] of [[1.8,1],[1.8,-1],[-1.8,1],[-1.8,-1]])box(M,[x,0.35,z],[0.35,0.35,0.12],[0.05,0.05,0.05]);}),
      hook:mk(M=>{ball(M,[0,-0.15,0],0.14,[0.95,0.45,0.05],11,[1,1.2,1]);box(M,[0,-0.38,0],[0.03,0.08,0.06],[0.3,0.3,0.32],10);}),
      cable:mk(M=>{const n=6,r=0.012;for(let k=0;k<n;k++){const a0=k/n*6.2832,a1=(k+1)/n*6.2832,q=[[a0,0],[a1,0],[a1,-1],[a0,-1]].map(([a,y])=>V(M,[Math.cos(a)*r,y,Math.sin(a)*r],[Math.cos(a),0,Math.sin(a)],[0.25,0.25,0.27],10));M.i.push(q[0],q[1],q[2],q[0],q[2],q[3]);}})};
    return this.M;},
  // a drop ring that follows the ground (built per mission)
  ringMesh(x,z,r){const M=vmesh(),V=(p,c)=>{M.v.push(p[0],p[1],p[2],0,1,0,c[0],c[1],c[2],0,0,0,1,4);return M.n++;},n=48,T=App.T;
    for(let k=0;k<n;k++){const a0=k/n*6.2832,a1=(k+1)/n*6.2832,col=k%4<2?[1,1,1]:[1,0.45,0.05],P=(a,rr)=>{const xx=x+Math.cos(a)*rr,zz=z+Math.sin(a)*rr;return[xx,Plane.groundAt(xx,zz)+0.15,zz];};
      const q=[V(P(a0,r-0.5),col),V(P(a1,r-0.5),col),V(P(a1,r+0.5),col),V(P(a0,r+0.5),col)];M.i.push(q[0],q[1],q[2],q[0],q[2],q[3]);}return R.uploadVeh(M);},
  // ---- missions
  vname(x,z){let b=null,bd=1e18;for(const v of Life.villages){const d=Math.hypot(v.x-x,v.z-z);if(d<bd){bd=d;b=v;}}return b?b.name:'the island';},
  isWet(x,z){return Plane.water(x,z);},
  hikerSpot(p,rng){const T=App.T,W=T.W,H=T.Hr||T.H;let best=null;for(let k=0;k<500;k++){const a=rng()*6.283,d=1200+rng()*Math.min(7000,W*0.4),x=p.x+Math.cos(a)*d,z=p.z+Math.sin(a)*d;if(x<60||z<60||x>W-60||z>W-60)continue;
      const h=sampleH(T,x,z,H);if(this.isWet(x,z)||h<p.y+60)continue;const gx=(sampleH(T,x+6,z,H)-sampleH(T,x-6,z,H))/12,gz=(sampleH(T,x,z+6,H)-sampleH(T,x,z-6,H))/12,sl=Math.hypot(gx,gz);if(sl<0.32||sl>1.2)continue;
      const sc=h+sl*80;if(!best||sc>best.sc)best={x,z,y:h,sc,d};}return best;},
  seaSpot(p,rng){const T=App.T;if(T.sea==null)return null;const W=T.W;for(let k=0;k<600;k++){const a=rng()*6.283,d=900+rng()*Math.min(6000,W*0.35),x=p.x+Math.cos(a)*d,z=p.z+Math.sin(a)*d;if(x<200||z<200||x>W-200||z>W-200)continue;
      if(!this.isWet(x,z))continue;let ok=true;for(let j=0;j<8&&ok;j++){const b=j/8*6.283;if(!this.isWet(x+Math.cos(b)*180,z+Math.sin(b)*180))ok=false;}if(ok)return{x,z,d};}return null;},
  dropSpot(p,rng){const T=App.T,H=T.Hr||T.H,C=[];for(const l of (typeof Coast!=='undefined'?Coast.L:[]))C.push({x:l.x,z:l.z,R:30,kind:'lighthouse',name:'the lighthouse near '+this.vname(l.x,l.z)});
      for(const v of Life.villages)C.push({x:v.x,z:v.z,R:(v.R||60)+30,kind:'village',name:v.name});
      const far=C.map(c=>({c,d:Math.hypot(c.x-p.x,c.z-p.z)})).filter(o=>o.d>1500&&o.d<12000);if(!far.length)return null;const pick=far[Math.floor(rng()*far.length)];
      for(let k=0;k<300;k++){const a=rng()*6.283,r=pick.c.R+rng()*60,x=pick.c.x+Math.cos(a)*r,z=pick.c.z+Math.sin(a)*r;if(this.isWet(x,z))continue;let ok=true;for(let j=0;j<8&&ok;j++){const b=j/8*6.283;if(this.isWet(x+Math.cos(b)*16,z+Math.sin(b)*16)||Math.abs(sampleH(T,x+Math.cos(b)*12,z+Math.sin(b)*12,H)-sampleH(T,x,z,H))>2.2)ok=false;}
        if(ok&&!Life.houses.some(h=>!h.gone&&Math.hypot(h.x-x,h.z-z)<16))return{x,z,y:sampleH(T,x,z,H),d:Math.hypot(x-p.x,z-p.z),name:pick.c.name,kind:pick.c.kind};}return null;},
  fmt(n){return Money.on()?'€'+Money.fmt(n):'';},
  offer(p){const rng=mulberry32(((App.time*1000)|0)+(this.saved*7+this.lost*13)*101+Math.round(p.x)),L=[],tries=[['hiker','sea','supply'],['sea','hiker','supply'],['supply','hiker','sea']];
    for(const order of tries)for(const t of order){if(L.length>=3)break;if(L.some(m=>m.type===t))continue;
      if(t==='hiker'){const s=this.hikerSpot(p,rng);if(s){L.push({type:'hiker',x:s.x,z:s.z,y:s.y,d:s.d,place:this.vname(s.x,s.z),pay:Math.round((20000+s.d*8)/500)*500});break;}}
      if(t==='sea'){const s=this.seaSpot(p,rng);if(s){L.push({type:'sea',x:s.x,z:s.z,y:App.T.sea,d:s.d,place:this.vname(s.x,s.z),pay:Math.round((30000+s.d*10)/500)*500});break;}}
      if(t==='supply'){const s=this.dropSpot(p,rng);if(s){L.push({type:'supply',x:s.x,z:s.z,y:s.y,d:s.d,place:s.name,kind:s.kind,pay:Math.round((12000+s.d*6)/500)*500});break;}}}
    return L;},
  title(m){return m.type==='hiker'?`Injured hiker above ${m.place}`:m.type==='sea'?`Boat capsized off ${m.place}`:`Medical supplies for ${m.place}`;},
  what(m){return m.type==='hiker'?'Winch them up from the slope and bring them to a helipad: an ambulance waits':m.type==='sea'?'Two people in the water: winch both up, then back to a helipad':`Hook the crate on the helipad, fly it there and lower it into the ring`;},
  icon(m){return m.type==='hiker'?'⛰':m.type==='sea'?'🛟':'📦';},
  accept(m,p){if(this.m){UI.toast('Finish or cancel the current mission first');return;}const T=[];
    if(m.type==='hiker'){T.push({kind:'lying',x:m.x,z:m.z,y:m.y,person:true});const a=Math.random()*6.283;T.push({kind:'stand',x:m.x+Math.cos(a)*2.2,z:m.z+Math.sin(a)*2.2,y:Plane.groundAt(m.x+Math.cos(a)*2.2,m.z+Math.sin(a)*2.2),wave:true});}
    if(m.type==='sea'){T.push({kind:'boat',x:m.x,z:m.z,y:App.T.sea,rot:Math.random()*6.283});for(const s of [-1,1])T.push({kind:'swim',x:m.x+s*5,z:m.z+3,y:App.T.sea,person:true,swim:true});}
    if(m.type==='supply'){const c=Math.cos(p.h),sn=Math.sin(p.h);T.push({kind:'crate',x:p.x+c*4-sn*6,z:p.z+sn*4+c*6,y:p.y,crate:true});m.ring=this.ringMesh(m.x,m.z,12);}
    for(const t of T){t.ox=t.x;t.oz=t.z;t.oy=t.y;}
    this.m={...m,T,pad:p,need:T.filter(t=>t.person).length,aboard:0,t0:App.time};this.offers=this.offers.filter(o=>o!==m);this.board(p);
    UI.toast(`Mission: ${this.title(m)} — ${this.what(m)}`);},
  GRIEF:{hiker:[n=>`Nobody else could reach the slope above ${n} in time. The hiker died of the cold that night.`,n=>`The mountain rescue team found the hiker above ${n} the next morning. Too late.`],
    sea:[n=>`The lifeboat from ${n} came too late. Both of them drowned.`,n=>`Only the upturned boat was found off ${n}. The two fishermen were never seen again.`],
    supply:[n=>`The medicine never reached ${n}. An old man there died waiting for it.`,n=>`Without the supplies, a child in ${n} could not be treated in time.`]},
  cancel(){const m=this.m;if(!m)return;const fee=Math.max(1000,Math.round(m.pay*0.1/100)*100),G=this.GRIEF[m.type],lives=m.type==='sea'?Math.max(1,m.need-m.aboard):1;
    if(Money.on())Money.spend(fee,'mission cancelled');this.lost+=m.type==='supply'?1:lives;if(m.ring&&R.freeMesh)R.freeMesh(m.ring);this.m=null;this.load=null;
    const msg=`Mission cancelled${Money.on()?` (−€${Money.fmt(fee)})`:''}. ${G[Math.floor(Math.random()*G.length)](m.place)}`;UI.toast(msg);Log.info('rescue: '+msg);this.board(null);},
  complete(how){const m=this.m;if(!m)return;if(Money.on())Money.earn(m.pay,m.type==='supply'?'supplies delivered':'rescue',Plane.st.p[0],Plane.st.p[1],Plane.st.p[2]);this.saved+=m.type==='supply'?0:m.need;if(m.ring&&R.freeMesh)R.freeMesh(m.ring);
    UI.toast(how+(Money.on()?` +€${Money.fmt(m.pay)}`:''));this.m=null;this.load=null;this.offers=[];},
  // ---- the missions board: from the airfield's panel, or the Missions button when landed on a pad
  board(p){this.revive();let el=$('#rsBoard');if(!el){el=document.createElement('div');el.id='rsBoard';el.className='fp';document.body.appendChild(el);el.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a;
      if(a==='x'){el.hidden=true;return;}if(a==='cancel'){if(confirm('Cancel this mission? People are counting on you.'))this.cancel();return;}if(a==='acc'){const o=this.offers[+b.dataset.i];if(o)this.accept(o,this._bp);return;}
      if(a==='fly'){el.hidden=true;Air.missionPanelClose&&Air.missionPanelClose();if(!Plane.on||Plane.kind!=='heli')Plane.spawn(this._bp?{n:this._bp.s.n,x:this._bp.s.x,z:this._bp.s.z}:null,'heli');}});}
    if(p===undefined)p=this._bp;if(!p)p=Plane.st?this.nearestPad(Plane.st.p[0],Plane.st.p[2]):this.nearestPad(Cam.target[0],Cam.target[2]);this._bp=p;if(!p){el.hidden=true;return;}
    if(!this.offers.length||this.offers.pad!==p.s)this.offers=Object.assign(this.offer(p),{pad:p.s});
    const m=this.m;el.innerHTML=`<div class="fp-h"><div><b>🚁 Rescue missions · helipad ${p.s.n}</b><span>Saved ${this.saved} · lost ${this.lost}</span></div><button data-a="x">✕</button></div>`+
      (m?`<div class="rs-m on"><i>${this.icon(m)}</i><div><b>${esc(this.title(m))}</b><span>${esc(this.what(m))} · ${(m.d/1000).toFixed(1)} km${Money.on()?' · '+this.fmt(m.pay):''}</span></div></div>
        <div class="rs-b"><button data-a="fly" class="go">${Plane.on&&Plane.kind==='heli'?'Back to flying':'Fly the helicopter'}</button><button data-a="cancel">Cancel (−${this.fmt(Math.max(1000,Math.round(m.pay*0.1/100)*100))||'lives'})</button></div>`
       :this.offers.length?this.offers.map((o,i)=>`<div class="rs-m"><i>${this.icon(o)}</i><div><b>${esc(this.title(o))}</b><span>${esc(this.what(o))} · ${(o.d/1000).toFixed(1)} km${Money.on()?' · '+this.fmt(o.pay):''}</span></div><button data-a="acc" data-i="${i}" class="go">Accept</button></div>`).join('')
       :`<div class="fp-note" style="padding:8px">No calls right now.</div>`);el.hidden=false;},
  // ---- the winch, the hook and its load; markers; mission progress (once per frame while the helicopter flies)
  anchor(pl){const s=pl.st,o=Q.rot(s.q,RESCUE.hoist);return[s.p[0]+o[0],s.p[1]+o[1],s.p[2]+o[2]];},
  winchIn(d){this._in=d;},
  update(pl,dt){this.revive();if(!pl.st)return;const A=this.anchor(pl),an=pl.an||{door:0};let dir=this._in||0;const g=typeof PlanePad!=='undefined'?PlanePad.pad():null;if(g&&g.buttons){if(g.buttons[13]&&g.buttons[13].pressed)dir=-1;if(g.buttons[12]&&g.buttons[12].pressed)dir=1;}
    pl.winchOpen=this.wL>0.05||dir<0;if(dir<0&&an.door<0.95){if(!this._dt||App.time-this._dt>4){this._dt=App.time;UI.toast('Opening the door for the winch');}}
    else if(dir<0)this.wL=Math.min(RESCUE.maxL,this.wL+dt*3);else if(dir>0)this.wL=Math.max(0,this.wL-dt*2);
    // the hook: a damped pendulum hung from the hoist, at most wL below it; on the ground it rests, on water it floats
    if(!this.hook)this.hook=[A[0],A[1]-0.45,A[2]];const h=this.hook,v=this.hv,n=Math.max(1,Math.ceil(dt/0.01)),st=dt/n;
    for(let i=0;i<n;i++){v[1]-=9.81*st;for(let k=0;k<3;k++){v[k]*=1-st*0.6;h[k]+=v[k]*st;}const L=Math.max(0.45,this.wL+0.45),d=[h[0]-A[0],h[1]-A[1],h[2]-A[2]],dl=Math.hypot(...d);
      if(dl>L){const u=d.map(q=>q/dl);for(let k=0;k<3;k++)h[k]=A[k]+u[k]*L;const vn=v[0]*u[0]+v[1]*u[1]+v[2]*u[2],av=pl.st.v,an2=av[0]*u[0]+av[1]*u[1]+av[2]*u[2];if(vn>an2)for(let k=0;k<3;k++)v[k]-=(vn-an2)*u[k];}
      const ld=this.load?(this.load.crate?0.95:1.6):0,gy=pl.water(h[0],h[2])?(App.T.sea!=null&&typeof Sea!=='undefined'&&Sea.amp&&Sea.amp()?Sea.height(h[0],h[2]):sampleWater(App.T,h[0],h[2])[0])-0.2:pl.groundAt(h[0],h[2]);
      if(h[1]-0.45-ld<gy){h[1]=gy+0.45+ld;if(v[1]<0)v[1]=0;v[0]*=1-st*8;v[2]*=1-st*8;this.onGround=true;}else this.onGround=false;}
    if(this.wL<0.05){h[0]=A[0];h[1]=A[1]-0.45;h[2]=A[2];v[0]=v[1]=v[2]=0;}
    const m=this.m;if(!m)return;
    // catch: the hook within reach of someone to lift (or the crate)
    if(!this.load&&this.wL>0.5)for(const t of m.T){if(!(t.person||t.crate)||t.aboard||t.dropped)continue;const ty=t.swim?this.waveY(t):t.y;if(Math.hypot(h[0]-t.x,h[2]-t.z)<1.8&&Math.abs(h[1]-(ty+1.0))<1.6){this.load=t;t.hooked=true;
      UI.toast(t.crate?'Crate hooked: lift it and fly it to the ring':'Hooked! Reel them in (▲ Winch)');break;}}
    if(this.load){const t=this.load;t.x=h[0];t.z=h[2];t.y=h[1]-0.45-(t.crate?0.95:1.6);
      if(this.wL<0.05){if(t.person){t.aboard=true;m.aboard++;this.load=null;UI.toast(m.aboard<m.need?`${m.aboard} on board — one more in the water`:'On board! Fly to a helipad: the ambulance is waiting');}
        else{t.inside=true;}}
      else if(t.crate)t.inside=false;
      // set down inside the ring: released, paid
      if(t.crate&&this.onGround&&!t.inside){const dr=Math.hypot(t.x-m.x,t.z-m.z);if(dr<12){t.dropped=true;this.load=null;this.complete(`Supplies delivered to ${m.place}!`);return;}
        else if(!this._ow||App.time-this._ow>6){this._ow=App.time;UI.toast(`Not inside the ring yet (${Math.round(dr)} m off): lift it and set it down in the ring`);}}
      if(t.person&&!t.aboard&&pl.V>22&&App.time-this._warn>8){this._warn=App.time;UI.toast('Slow down: someone is hanging on the line!');}}
    // back on a pad with everyone aboard
    if(m.need&&m.aboard>=m.need&&this.wL<0.05){const p=this.onPad(pl);if(p&&pl.V<1){this.complete(m.type==='sea'?`Both survivors handed to the ambulance. Well flown!`:`The hiker is in the ambulance. Well flown!`);return;}}
    // the smoke column over the site
    if(typeof Particles!=='undefined'&&P.smoke&&Math.random()<dt*6){const t=m.T[0];if(t&&!t.dropped)Particles.spawn(t.x+2,(t.swim||t.kind==='boat'?App.T.sea:t.y)+0.5,t.z+2,(Math.random()-0.5)*0.6,2.5+Math.random(),(Math.random()-0.5)*0.6,9,0.8,6,2);}},
  waveY(t){const T=App.T;return(T.sea!=null&&typeof Sea!=='undefined'&&Sea.amp&&Sea.amp()?Sea.height(t.x,t.z):T.sea!=null?T.sea:t.y)-0.25+Math.sin(App.time*1.7+t.x)*0.08;},
  // ---- drawing: the hook, its cable, the load; the mission's people, boat, crate, ring; the ambulance at a pad
  draw(pl,p){const M=this.meshes(),dm=(m,mat)=>{gl.uniformMatrix4fv(p.u('uModel'),false,mat);gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,0);Stats.draws++;},
      at=(x,y,z,yaw,sy)=>{const c=Math.cos(yaw||0),s=Math.sin(yaw||0),k=sy||1;return new Float32Array([c,0,-s,0,0,k,0,0,s,0,c,0,x,y,z,1]);};
    const A=this.anchor(pl),h=this.hook;if(h&&this.wL>0.02){const d=[h[0]-A[0],h[1]-A[1],h[2]-A[2]],L=Math.hypot(...d)||1,Yv=d.map(q=>-q/L),X0=Math.abs(Yv[1])<0.95?[0,1,0]:[1,0,0],Xv=[Yv[1]*X0[2]-Yv[2]*X0[1],Yv[2]*X0[0]-Yv[0]*X0[2],Yv[0]*X0[1]-Yv[1]*X0[0]],xl=Math.hypot(...Xv);
      for(let k=0;k<3;k++)Xv[k]/=xl;const Zv=[Xv[1]*Yv[2]-Xv[2]*Yv[1],Xv[2]*Yv[0]-Xv[0]*Yv[2],Xv[0]*Yv[1]-Xv[1]*Yv[0]];
      dm(M.cable,new Float32Array([Xv[0],Xv[1],Xv[2],0,Yv[0]*L,Yv[1]*L,Yv[2]*L,0,Zv[0],Zv[1],Zv[2],0,A[0],A[1],A[2],1]));dm(M.hook,at(h[0],h[1],h[2]));}
    const m=this.m;if(!m)return;const T=App.T;
    for(const t of m.T){if(t.aboard||t.inside)continue;const hooked=this.load===t;
      if(t.kind==='boat')dm(M.boat,at(t.x,this.waveY(t)+0.05,t.z,t.rot));
      else if(t.kind==='lying')dm(hooked?M.hang:M.lying,at(t.x,t.y,t.z,hooked?0:0.6));
      else if(t.kind==='swim')dm(hooked?M.hang:M.swim,at(t.x,hooked?t.y:this.waveY(t),t.z,0.3));
      else if(t.kind==='stand'){dm(M.stand,at(t.x,t.y,t.z,0.8));const q=Q.mul(Q.axis([0,1,0],0.8),Q.axis([1,0,0],Math.sin((App.time||0)*6)*0.55)),X=Q.rot(q,[1,0,0]),Y=Q.rot(q,[0,1,0]),Z=Q.rot(q,[0,0,1]),o=Q.rot(Q.axis([0,1,0],0.8),[0,1.45,0.27]);
        dm(M.arm,new Float32Array([X[0],X[1],X[2],0,Y[0],Y[1],Y[2],0,Z[0],Z[1],Z[2],0,t.x+o[0],t.y+o[1],t.z+o[2],1]));}// waving, the arm swinging about the shoulder
      else if(t.kind==='crate')dm(M.crate,at(t.x,t.y,t.z,m.pad?m.pad.h:0));}
    if(m.ring)dm(m.ring,M4.ident());
    // the ambulance waits beside the pad while someone is on board
    if(m.need&&m.aboard>0){const pd=this.nearestPad(pl.st.p[0],pl.st.p[2]);if(pd){const c=Math.cos(pd.h),s=Math.sin(pd.h),u=0,w=-RESCUE.padR-5;dm(M.amb,at(pd.x+c*u-s*w,pd.y-0.2,pd.z+s*u+c*w,-pd.h));}}},
  // ---- HUD line, compass marks, a label over the site
  hudText(){const m=this.m;if(!m||!Plane.st)return'';const t=m.T.find(q=>(q.person||q.crate)&&!q.aboard&&!q.dropped);let s;
    if(m.type==='supply'){const c=m.T[0];s=this.load===c||c.inside?` · 📦 to the ring at ${m.place} ${(Math.hypot(Plane.st.p[0]-m.x,Plane.st.p[2]-m.z)/1000).toFixed(1)} km`:` · 📦 hook the crate on the pad`;}
    else if(m.aboard>=m.need)s=' · 🚑 to a helipad';else s=` · ${this.icon(m)} ${m.aboard}/${m.need} · ${(Math.hypot(Plane.st.p[0]-m.x,Plane.st.p[2]-m.z)/1000).toFixed(1)} km`+(this.load?' · reel in ▲':'');
    return s+(this.wL>0.05?` · winch ${this.wL.toFixed(0)} m`:'');},
  marks(){const L=[];if(!Fleet.unlocks.heli||!Plane.on||Plane.kind!=='heli')return L;for(const p of this.pads())L.push({x:p.x,z:p.z,label:'H',col:'#f5d24a'});const m=this.m;if(m)L.push({x:m.x,z:m.z,label:m.type==='supply'?'📦':'SOS',col:'#ff5a3a',ring:true});return L;},
  label(){let el=this._lb;const m=this.m,on=m&&Plane.on&&Plane.kind==='heli'&&Plane.st;if(!el){el=this._lb=document.createElement('div');el.className='ilabel rsLabel';document.body.appendChild(el);}if(!on){el.style.display='none';return;}
    const q=Cam.toScreen(m.x,(m.type==='sea'?App.T.sea:m.y)+18,m.z);if(!q){el.style.display='none';return;}el.style.display='';el.style.left=q[0]+'px';el.style.top=q[1]+'px';const d=Math.hypot(Plane.st.p[0]-m.x,Plane.st.p[2]-m.z);
    el.innerHTML=`<b>${m.type==='supply'?'📦 Drop':'SOS'}</b> ${d<1000?Math.round(d)+' m':(d/1000).toFixed(1)+' km'}`;},
  // ---- UI buttons while flying the helicopter: winch down/up (hold), missions
  ui(on){let w=$('#rsUI');if(!w){w=document.createElement('div');w.id='rsUI';w.innerHTML='<button id="rsDown">▼ Winch</button><button id="rsUp">▲ Winch</button><button id="rsBoardB">Missions</button>';$('#planeUI').appendChild(w);
      const hold=(id,d)=>{const e=$(id);e.onpointerdown=ev=>{ev.preventDefault();this.winchIn(d);};e.onpointerup=e.onpointerleave=e.onpointercancel=()=>{this.winchIn(0);};};hold('#rsDown',-1);hold('#rsUp',1);
      $('#rsBoardB').onclick=()=>{const p=Plane.st&&this.onPad(Plane);if(!p&&!this.m){UI.toast('Missions are taken at an airfield: land on a helipad');return;}this.board(p||undefined);};}
    w.hidden=!on;if(!on&&this._lb)this._lb.style.display='none';},
  /* saved: the counts and a mission in progress (its people and crate as they stand; whoever hangs on the line goes back where they were) */
  serialize(){const m=this.m||this.pendM;return{saved:this.saved,lost:this.lost,m:m?{type:m.type,x:m.x,z:m.z,y:m.y,d:m.d,place:m.place,kind:m.kind,pay:m.pay,need:m.need,aboard:m.aboard,
      pad:m.pad&&m.pad.s?m.pad.s.n:m.pad|0,T:m.T.map(t=>{const o={...t};if(o.hooked&&!o.aboard&&!o.dropped){o.x=o.ox;o.z=o.oz;o.y=o.oy;o.inside=false;}o.hooked=false;return o;})}:null};},
  load_(d){this.saved=d&&d.saved|0||0;this.lost=d&&d.lost|0||0;this.m=null;this.pendM=d&&d.m||null;this.offers=[];this.wL=0;this.load=null;this.resetPads();},
  /* a saved mission comes back once the airstrips are restored */
  revive(){const d=this.pendM;if(!d||!App.T||!Air.list.length)return;this.pendM=null;const S=Air.list.find(s=>s.n===d.pad&&!s.water),p=S?this.pad(S):this.nearestPad(d.x,d.z);if(!p)return;
    this.m={...d,pad:p,T:d.T.map(t=>({...t}))};if(d.type==='supply')this.m.ring=this.ringMesh(d.x,d.z,12);Log.info('rescue: mission restored: '+this.title(this.m));}};
