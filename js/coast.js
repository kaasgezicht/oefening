'use strict';
// ===== coast.js (4.26.0) — on maps with a sea: lighthouses on the headlands (from the user's photos of a granite lighthouse on a rocky
// point: a rough granite base, a whitewashed stone tower, a black gallery with railing, an octagonal lantern with a dome and ball), their
// slowly turning warm beams at night (settings under Sea), fishing harbours at the coastal villages (a stone quay with boats that ride
// the swell and a fisherman's hut), and seagulls that circle the harbours, the lighthouses and the coast.
// Everything here follows from the seed and the generated world, so nothing of it is saved.
const LH={lamp:13.25,/* the lamp above the tower's foot (m) */rock:0};
const Coast={L:[],H:[],gulls:[],key:'',rot:0,M:null,
  sea(T,x,z){return T.sea!=null&&(x<0||z<0||x>T.W||z>T.W||R.sampleHr(T,x,z)<T.sea-0.25);},
  // ---- placement (once per world, after the villages)
  init(){const T=App.T;this.L=[];this.H=[];this.gulls=[];if(!T||T.sea==null||!Life.villages)return;const W=T.W,sea=T.sea,rng=mulberry32((P.seed|0)*313+29),Hs=(x,z)=>R.sampleHr(T,x,z),isSea=(x,z)=>this.sea(T,x,z);
    // islands: land components on a coarse grid
    const G=Math.min(256,T.N),gc=W/G,land=new Uint8Array(G*G),comp=new Int32Array(G*G).fill(-1),C=[];for(let j=0;j<G;j++)for(let i=0;i<G;i++)land[j*G+i]=Hs((i+0.5)*gc,(j+0.5)*gc)>sea+1?1:0;
    for(let n0=0;n0<G*G;n0++){if(!land[n0]||comp[n0]>=0)continue;const id=C.length,st=[n0],coast=[];comp[n0]=id;let n1=0;
      while(st.length){const n=st.pop();n1++;const i=n%G,j=(n/G)|0;let edge=false;for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=i+di,b=j+dj;if(a<0||b<0||a>=G||b>=G){edge=true;continue;}const m=b*G+a;if(!land[m]){edge=true;continue;}if(comp[m]<0){comp[m]=id;st.push(m);}}if(edge)coast.push(n);}
      C.push({id,area:n1*gc*gc/1e6,coast});}
    const want=+P.lighthouses||0,vill=Life.villages;
    for(const c of C.sort((a,b)=>b.area-a.area)){if(c.area<1.2||!want)continue;const n=Math.max(1,Math.min(6,Math.round(Math.sqrt(c.area)/2.0*want))),spacing=Math.max(1100,Math.sqrt(c.area)*1000/Math.max(1.5,n)*0.9),cand=[];
      for(const g of c.coast){const x0=(g%G+0.5)*gc,z0=(((g/G)|0)+0.5)*gc;let sx=0,sz=0,ns=0;for(let a=0;a<24;a++){const dx=Math.cos(a*0.2618),dz=Math.sin(a*0.2618);if(isSea(x0+dx*110,z0+dz*110)){sx+=dx;sz+=dz;ns++;}}
        const f=ns/24;if(f<0.38||f>0.85)continue;const sl=Math.hypot(sx,sz)||1,dx=sx/sl,dz=sz/sl;
        // walk to the waterline along the sea direction, then stand 16 m back from it
        let r=-60,x=x0,z=z0;for(;r<160;r+=2){x=x0+dx*r;z=z0+dz*r;if(isSea(x,z))break;}if(r>=160)continue;x-=dx*16;z-=dz*16;const h=Hs(x,z)-sea;if(h<2||h>48)continue;
        let mn=1e9,mx=-1e9;for(let a=0;a<8;a++){const hh=Hs(x+Math.cos(a*0.785)*4,z+Math.sin(a*0.785)*4);mn=Math.min(mn,hh);mx=Math.max(mx,hh);}if(mx-mn>7)continue;
        if(vill.some(v=>Math.hypot(v.x-x,v.z-z)<(v.R||60)+300))continue;cand.push({x,z,y:mx,rot:Math.atan2(dz,dx),s:f+(h>5&&h<24?0.15:0)+rng()*0.25});}
      cand.sort((a,b)=>b.s-a.s);let k=0;for(const q of cand){if(k>=n)break;if(this.L.some(o=>Math.hypot(o.x-q.x,o.z-q.z)<spacing))continue;this.L.push({x:q.x,y:q.y,z:q.z,rot:q.rot,ph:rng()*6.283,isl:c.id});k++;}}
    // fishing harbours: a quay out from the nearest bit of sea shore within 420 m of a coastal village
    for(const v of vill){let best=null;for(let a=0;a<48;a++){const dx=Math.cos(a*0.1309),dz=Math.sin(a*0.1309);for(let r=(v.R||50)*0.7;r<420;r+=4){const x=v.x+dx*r,z=v.z+dz*r;if(x<40||z<40||x>W-40||z>W-40)break;
        if(isSea(x,z)){/* the sea must stay open (2 m deep) for 40 m out */let ok=true;for(const d of [14,26,40])if(!isSea(x+dx*d,z+dz*d)||Hs(x+dx*d,z+dz*d)>sea-2)ok=false;if(ok&&(!best||r<best.r))best={x,z,r,dx,dz};break;}}}
      if(best&&!this.L.some(o=>Math.hypot(o.x-best.x,o.z-best.z)<120))this.H.push({x:best.x-best.dx*3,z:best.z-best.dz*3,rot:Math.atan2(best.dz,best.dx),v,boats:[0,1,2].slice(0,1+Math.floor(rng()*3)).map(i=>({k:Math.floor(rng()*3),side:i%2?1:-1,at:10+i*9+rng()*2,ph:rng()*6}))});}
    for(const q of [...this.L,...this.H])if(R.vegB&&R.clearVegRect){const isL=!!q.ph&&q.isl!==undefined;R.clearVegRect(T,{x:q.x,z:q.z,a:q.rot,x0:isL?-9:-10,x1:isL?9:4,z0:isL?-9:-6,z1:isL?9:6},2);}
    // seagulls: a flock over every harbour and lighthouse and along the coast
    const flock=(x,z,n,r,y)=>{for(let i=0;i<n;i++)this.gulls.push({cx:x,cz:z,r:r*(0.6+rng()*0.7),y:y+rng()*18,a:rng()*6.283,w:(rng()<0.5?-1:1)*(7+rng()*3),ph:rng()*20,sit:null});};
    for(const h of this.H){flock(h.x+Math.cos(h.rot)*20,h.z+Math.sin(h.rot)*20,5+Math.floor(rng()*4),40,10);for(let i=0;i<3;i++)this.gulls.push({sit:h,at:4+i*7+rng()*3,side:rng()<0.5?-1:1,ph:rng()*20});}
    for(const l of this.L)flock(l.x+Math.cos(l.rot)*40,l.z+Math.sin(l.rot)*40,3+Math.floor(rng()*3),55,l.y-sea+12);
    for(const c of C)if(c.area>1.2)for(let k=0;k<Math.min(6,Math.round(c.area/6)+1);k++){const g=c.coast[Math.floor(rng()*c.coast.length)];if(g!==undefined)flock((g%G+0.5)*gc,(((g/G)|0)+0.5)*gc,2+Math.floor(rng()*4),70,14);}
    this.inst();Log.info(`coast: ${this.L.length} lighthouses on ${C.filter(c=>c.area>=1.2).length} islands, ${this.H.length} fishing harbours, ${this.gulls.length} seagulls`);},
  inst(){const T=App.T,b=new Float32Array(Math.max(1,this.L.length)*8),q=new Float32Array(Math.max(1,this.H.length)*8);this.L.forEach((l,i)=>b.set([l.x,l.y,l.z,1,l.rot,0.5,(l.ph/6.283)%1,0],i*8));
    this.H.forEach((h,i)=>q.set([h.x,T.sea,h.z,1,h.rot,0.5,0.3,0],i*8));R.inst('lighthouses',b,this.L.length);R.inst('quays',q,this.H.length);},
  drawObj(pass){const T=App.T;if(!T||T.sea==null)return;R.drawObj('lighthouse',10,R.instBufs.lighthouses,pass);R.drawObj('quay',10,R.instBufs.quays,pass);},
  update(dt){const T=App.T;if(!T||T.sea==null||!Life.villages||App.busy||Life.T!==T)return;const key=T.W+'|'+T.sea+'|'+P.seed+'|'+Life.villages.length+'|'+P.lighthouses;if(key!==this.key||this.T!==T){this.key=key;this.T=T;this.init();}
    /* the beams turn on real time (not the game clock), so fast-forward does not make them spin */this.rot+=Math.min(dt,0.1)*(+P.lhSpeed||0)*6.2832/60;
    for(const g of this.gulls)if(!g.sit){g.a+=dt*g.w/g.r;g.ph+=dt;}
    if(typeof Fish!=='undefined')Fish.update(dt);if(typeof Port!=='undefined')Port.update(dt);},
  // lamp lights for the pools of light round lamps at night (Life.lights)
  lights(add){for(const l of this.L)add(l.x,l.y+LH.lamp,l.z,32,[2.4,1.8,0.9]);},
  // ---- boats and seagulls (vehicle program, like Sea and Wild)
  build(){const M={};const hull=(col)=>{const m=vmesh(),wd=x=>{const u=(x+4.6)/9.2;return u>0.82?2.2*Math.sqrt(Math.max(0,(1-u)/0.18))*0.55+0.05:1.1+0.12*Math.sin(u*3);},S=[];
      for(let i=0;i<=12;i++){const x=-4.6+9.2*i/12,w=wd(x),sh=x>3?(x-3)*0.35:0;S.push([[x,1.25+sh,w],[x,0.05,w*0.72],[x,-0.55,0]]);}
      for(let i=0;i<12;i++){const a=S[i],b=S[i+1];for(const e of [1,-1]){const f=p=>[p[0],p[1],p[2]*e];vq(m,f(a[0]),f(b[0]),f(b[1]),f(a[1]),[0,0,e],col,0);vq(m,f(a[1]),f(b[1]),f(b[2]),f(a[2]),[0,-0.6,e*0.8],[0.32,0.14,0.1],0);}
        vq(m,[a[0][0],1.0,a[0][2]],[b[0][0],1.0,b[0][2]],[b[0][0],1.0,-b[0][2]],[a[0][0],1.0,-a[0][2]],[0,1,0],[0.55,0.43,0.3],0);}
      for(const e of [1,-1])for(let i=0;i<12;i++){const a=S[i][0],b=S[i+1][0];vq(m,[a[0],a[1]-0.12,a[2]*e*1.01],[b[0],b[1]-0.12,b[2]*e*1.01],[b[0],b[1],b[2]*e*1.01],[a[0],a[1],a[2]*e*1.01],[0,0,e],[0.93,0.92,0.88],0);}
      vbox(m,[-1.3,1.95,0],[2.2,1.9,1.7],[0.93,0.92,0.88],0);vbox(m,[-1.3,3.0,0],[2.5,0.16,1.95],[0.28,0.3,0.32],0);for(const e of [1,-1])vbox(m,[-1.3,2.3,e*0.86],[1.6,0.6,0.02],[0.12,0.16,0.2],0);vbox(m,[-0.18,2.3,0],[0.02,0.6,1.3],[0.12,0.16,0.2],0);
      vcyl(m,[0.9,3.3,0],'y',0.07,4.4,[0.85,0.85,0.82],0,6);vcyl(m,[-3.8,2.0,0],'y',0.05,1.8,[0.3,0.3,0.3],0,5);vbox(m,[2.2,1.2,0],[1.4,0.35,1.3],[0.2,0.38,0.3],0);vbox(m,[-3.3,1.25,0.5],[0.6,0.4,0.5],[0.62,0.5,0.32],0);return R.uploadVeh(m);};
    M.boats=[hull([0.16,0.3,0.55]),hull([0.62,0.16,0.12]),hull([0.15,0.4,0.28])];
    const gull=()=>{const m=vmesh(),Wc=[0.95,0.95,0.93];vcylN(m,[-0.2,0,0],[0.18,0,0],0.07,0.09,7,Wc,0,null,true);vcylN(m,[0.18,0,0],[0.3,0.04,0],0.09,0.06,7,Wc,0,null,true);vcylN(m,[0.3,0.04,0],[0.38,0.03,0],0.03,0.008,5,[0.95,0.75,0.2],0,null,true);
      vcylN(m,[-0.2,0,0],[-0.34,0.02,0],0.07,0.02,6,[0.92,0.92,0.9],0,null,true);return R.uploadVeh(m);};
    const wing=()=>{const m=vmesh(),G=[0.62,0.65,0.68],K=[0.08,0.08,0.09];const a=[0.08,0,0],b=[-0.1,0,0],c=[0.04,0.02,0.36],d=[-0.14,0.02,0.34],e=[-0.06,-0.03,0.62];
      for(const s of [1,-1]){const nm=[0,s,0];vt(m,a,b,c,nm,G,0);vt(m,b,d,c,nm,G,0);vt(m,c,d,e,nm,K,0);}return R.uploadVeh(m);};M.gull=gull();M.wing=wing();this.M=M;},
  mat(x,y,z,h,pitch,roll,s){return Sea.mat(x,y,z,h,pitch,roll,s);},
  draw(p,pass){const T=App.T;if(!T||T.sea==null||(!this.H.length&&!this.gulls.length))return;if(!this.M)this.build();const cp=Cam.pos||[0,0,0],M=this.M,t=App.time,lim=pass===1?400:1600;
    const dm=(m,mt)=>{gl.uniformMatrix4fv(p.u('uModel'),false,mt);gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,0);Stats.draws++;Stats.tris+=m.count/3;};gl.uniform1f(p.u('uDist'),0);
    const near=(x,z,r)=>Math.hypot(x-cp[0],z-cp[2])<r;
    for(const h of this.H){if(!near(h.x,h.z,lim))continue;const c=Math.cos(h.rot),s=Math.sin(h.rot);for(const b of h.boats){const ps=typeof Fish!=='undefined'?Fish.pose(h,b):null,hd=ps?ps.hd:h.rot,c=Math.cos(hd),s=Math.sin(hd),lx=b.at,lz=b.side*4.6,x=ps?ps.x:h.x+Math.cos(h.rot)*lx-Math.sin(h.rot)*lz,z=ps?ps.z:h.z+Math.sin(h.rot)*lx+Math.cos(h.rot)*lz,y=Sea.on()?Sea.height(x,z,t):T.sea,
        dx=(Sea.on()?Sea.height(x+c*3,z+s*3,t)-Sea.height(x-c*3,z-s*3,t):0)/6,dz=(Sea.on()?Sea.height(x-s*1.5,z+c*1.5,t)-Sea.height(x+s*1.5,z-c*1.5,t):0)/3;
        dm(M.boats[b.k],this.mat(x,y-0.15+Math.sin(t*0.9+b.ph)*0.06,z,hd,Math.atan(dx)+Math.sin(t*0.7+b.ph)*0.02,Math.atan(dz)+Math.sin(t*0.83+b.ph)*0.04,1).m);}}
    if(typeof Fish!=='undefined')Fish.draw(p,pass);
    if(pass===1)return;
    for(const g of this.gulls){let x,y,z,hd,bank=0,fl=0;
      if(g.sit){const h=g.sit,c=Math.cos(h.rot),s=Math.sin(h.rot),lz=g.side*2.1;x=h.x+c*g.at-s*lz;z=h.z+s*g.at+c*lz;y=T.sea+1.62;hd=h.rot+g.side*1.4+Math.sin(t*0.2+g.ph)*0.6;fl=-1.3;}
      else{x=g.cx+Math.cos(g.a)*g.r;z=g.cz+Math.sin(g.a)*g.r;y=T.sea+g.y+Math.sin(g.a*2+g.ph)*3;hd=g.a+(g.w>0?Math.PI/2:-Math.PI/2);bank=(g.w>0?1:-1)*0.35;const c=(g.ph%9);fl=c<1.4?Math.sin(c*14)*0.7:0.12;}
      if(!near(x,z,700))continue;const F=this.mat(x,y,z,hd,0,-bank,1.6);dm(M.gull,F.m);
      for(const e of [-1,1]){const wq=Q.mul(F.q,Q.axis([1,0,0],-e*fl)),X=Q.rot(wq,[1.6,0,0]),Y=Q.rot(wq,[0,1.6,0]),Z=Q.rot(wq,[0,0,1.6*e]);dm(M.wing,new Float32Array([X[0],X[1],X[2],0,Y[0],Y[1],Y[2],0,Z[0],Z[1],Z[2],0,x,y,z,1]));}}},
  /* the four beams nearest the camera as light for every surface, the mist and the clouds (UBO 336-371, see beams() in shaders.js) */
  /* how far a beam reaches before the ground stands in its way (a hill, a headland): the light and the shaft stop there */
  reach(L,d,rng){const T=App.T,H=T.Hr||T.H,Wd=T.N*T.cs,n=48,st=rng/n;for(let i=1;i<=n;i++){const s=i*st,x=L[0]+d[0]*s,z=L[2]+d[2]*s;if(x<0||z<0||x>=Wd||z>=Wd)return rng;if(sampleH(T,x,z,H)>L[1]+d[1]*s+0.5)return Math.max(8,s-st*0.5);}return rng;},
  beamU(U,A){const T=App.T;if(!T||T.sea==null||!this.L.length||!A||!P.lhLight)return;const nk=clamp(A.night*1.3,0,1);if(nk<0.02)return;const cp=Cam.pos||[0,0,0],nb=P.lhDouble?2:1,rng=Math.max(100,+P.lhRange||2500),
      dv=Math.tan((+P.lhDiverge||4)*Math.PI/360),half=Math.atan(dv)+0.006,I=(+P.lhBright||0)*nk*(+P.lhLight||1),L=this.L.map(l=>[Math.hypot(l.x-cp[0],l.z-cp[2]),l]).sort((a,b)=>a[0]-b[0]);let k=0;
    for(const [d,l] of L){if(d>rng+6000)break;for(let bi=0;bi<nb&&k<4;bi++,k++){const a=this.rot+l.ph+bi*Math.PI,Lp=[l.x,l.y+LH.lamp,l.z];U.set([Lp[0],Lp[1],Lp[2],this.reach(Lp,[Math.cos(a),-0.004,Math.sin(a)],rng)],336+k*4);U.set([Math.cos(a),-0.004,Math.sin(a),Math.cos(half)],352+k*4);}if(k>=4)break;}
    const r0=rng*0.3;U.set([2.6*I,2.0*I,1.1*I,1/(r0*r0)],368);},
  // ---- the beams: camera-facing ribbons along each beam and a glare at the lamp, additive, at dusk and night
  beams(){const T=App.T,A=R.A;if(!T||T.sea==null||!this.L.length||!A)return null;const nk=clamp(A.night*1.3,0,1);if(nk<0.02)return null;const E=Weather.eff(),cp=Cam.pos,V=[];
    const I0=(+P.lhBright||0)*nk*(1+0.6*(E.storm||0)+1.5*(E.mist||0)+0.8*(E.rain||0)),rng=Math.max(100,+P.lhRange||2500),w0=Math.max(0.3,+P.lhWidth||3)/2,dv=Math.tan((+P.lhDiverge||4)*Math.PI/360),nb=P.lhDouble?2:1,tilt=-0.004;
    for(const l of this.L){const L=[l.x,l.y+LH.lamp,l.z],dc=Math.hypot(L[0]-cp[0],L[1]-cp[1],L[2]-cp[2]);if(dc>rng+9000)continue;
      for(let bi=0;bi<nb;bi++){const a=this.rot+l.ph+bi*Math.PI,d=[Math.cos(a),tilt,Math.sin(a)],n=14,re=this.reach(L,d,rng);let prev=null;
        for(let i=0;i<=n;i++){const u=i/n,s=re*u*u,Pp=[L[0]+d[0]*s,L[1]+d[1]*s,L[2]+d[2]*s],m=[Pp[0]-cp[0],Pp[1]-cp[1],Pp[2]-cp[2]];let sx=d[1]*m[2]-d[2]*m[1],sy=d[2]*m[0]-d[0]*m[2],sz=d[0]*m[1]-d[1]*m[0];const sl=Math.hypot(sx,sy,sz)||1;sx/=sl;sy/=sl;sz/=sl;
          const w=w0+s*dv,dist=Math.hypot(m[0],m[1],m[2]),al=I0*Math.pow(1-s/rng,1.3)*clamp(dist/25,0,1)*(0.4+0.6*clamp(w0*2/w,0,1)),cur=[Pp[0]-sx*w,Pp[1]-sy*w,Pp[2]-sz*w,al,Pp[0]+sx*w,Pp[1]+sy*w,Pp[2]+sz*w,al];
          if(prev){const [a0,a1]=[prev,cur];V.push(a0[0],a0[1],a0[2],a0[3],-1,0, a0[4],a0[5],a0[6],a0[7],1,0, a1[4],a1[5],a1[6],a1[7],1,0, a0[0],a0[1],a0[2],a0[3],-1,0, a1[4],a1[5],a1[6],a1[7],1,0, a1[0],a1[1],a1[2],a1[3],-1,0);}prev=cur;}
        // the glare: bright when the beam points at the camera
        const tc=[(cp[0]-L[0])/dc,(cp[1]-L[1])/dc,(cp[2]-L[2])/dc],fa=Math.max(0,d[0]*tc[0]+d[1]*tc[1]+d[2]*tc[2]),sharp=1/Math.max(0.002,1-Math.cos(Math.max(0.02,Math.atan(dv)+Math.atan(w0/Math.max(dc,1))*2))),
          gI=(+P.lhBright||0)*nk*(0.45/nb+3.2*Math.exp(-(1-fa)*sharp*0.5)),gs=2.2+dc*0.006+gI*dc*0.0015;
        if(gI>0.003){const up=[0,1,0],rt=[tc[2],0,-tc[0]],rl=Math.hypot(rt[0],rt[2])||1;rt[0]/=rl;rt[2]/=rl;const u2=[tc[1]*rt[2]-tc[2]*rt[1],tc[2]*rt[0]-tc[0]*rt[2],tc[0]*rt[1]-tc[1]*rt[0]];
          const Q4=(qx,qy)=>[L[0]+(rt[0]*qx+u2[0]*qy)*gs,L[1]+(rt[1]*qx+u2[1]*qy)*gs,L[2]+(rt[2]*qx+u2[2]*qy)*gs];for(const [qx,qy] of [[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]]){const q=Q4(qx,qy);V.push(q[0],q[1],q[2],gI,qx,2+qy);}}}}
    return V.length?new Float32Array(V):null;}};

// ---- the lighthouse (object mesh, +x toward the sea, y 0 at the foot of the tower; the lamp at LH.lamp)
function lighthouseMesh(){const M=omesh(),rng=mulberry32(4711),gran=[[0.56,0.46,0.41],[0.5,0.41,0.37],[0.6,0.5,0.44],[0.46,0.38,0.35]],wh=[[0.9,0.89,0.85],[0.86,0.85,0.81],[0.93,0.92,0.88],[0.82,0.8,0.75]],blk=[0.07,0.07,0.08],
    rock=[[0.55,0.54,0.52],[0.62,0.6,0.56],[0.5,0.48,0.46],[0.6,0.53,0.48],[0.45,0.44,0.43]],pick=a=>a[Math.floor(rng()*a.length)];
  // the rocky point: big flat-topped granite slabs round the foot, falling away toward the sea
  oIco(M,0,-2.2,0,5.4,rock[0],0,{sy:0.55,jit:0.18,detail:1,seed:3});
  for(let i=0;i<22;i++){const a=rng()*6.283,r=3.6+rng()*5,x=Math.cos(a)*r+(Math.cos(a)>0?rng()*3:0),z=Math.sin(a)*r,rr=1.6+rng()*2.2;oIco(M,x,-1.2-Math.max(0,x)*0.35+rng()*0.6,z,rr,pick(rock),0,{sy:0.4+rng()*0.25,jit:0.25,seed:20+i});}
  for(let i=0;i<14;i++){const x=6+rng()*12,z=(rng()-0.5)*16,rr=1.4+rng()*2.4;oIco(M,x,-2-x*0.45+rng(),z,rr,pick(rock),0,{sy:0.45,jit:0.28,seed:60+i});}
  // the granite base (0 - 3.6 m) and the whitewashed tower (3.6 - 11 m): a core with rows of stones on it
  const rB=y=>3.05-(y/3.6)*0.27,rU=y=>2.72-((y-3.6)/7.4)*0.4;oPrism(M,0,0,3.0,2.74,-2,3.6,18,gran[1],0);oPrism(M,0,0,2.68,2.3,3.6,11.02,20,wh[1],0);
  const rows=(y0,y1,n,per,rf,cols,stain)=>{const hh=(y1-y0)/n;for(let k=0;k<n;k++){const y=y0+hh*(k+0.5),r=rf(y),off=(k%2)*0.5;for(let j=0;j<per;j++){const a=(j+off+(rng()-0.5)*0.12)/per*6.2832,w=2*Math.PI*r/per*0.93;let c=pick(cols);
      if(stain&&Math.cos(a-0.9)>0.86&&y>8.5&&rng()<0.7)c=[c[0]*0.82,c[1]*0.76,c[2]*0.66];oBox(M,Math.cos(a)*(r+0.03),y,Math.sin(a)*(r+0.03),0.14,hh*0.9,w,c,0,a);}}};
  rows(-0.4,3.6,9,20,rB,gran,false);rows(3.6,11.0,17,22,rU,wh,true);
  // the doorway in the base (sea side, a little round) and a narrow window high up on the land side, a smaller one round the other way
  {const a=-0.55,r=rB(1)+0.06;oBox(M,Math.cos(a)*r,0.95,Math.sin(a)*r,0.12,1.9,0.82,[0.06,0.05,0.05],0,a);oBox(M,Math.cos(a)*(r+0.02),1.98,Math.sin(a)*(r+0.02),0.16,0.16,1.0,gran[2],0,a);}
  for(const [a,y,h] of [[2.4,7.2,1.5],[0.9,5.0,0.9]]){const r=rU(y)+0.05;oBox(M,Math.cos(a)*r,y,Math.sin(a)*r,0.1,h,0.52,[0.08,0.09,0.1],0,a);oBox(M,Math.cos(a)*(r+0.03),y-h/2-0.06,Math.sin(a)*(r+0.03),0.18,0.1,0.66,wh[2],0,a);}
  // the fog-signal bracket on the sea side: a white box with a horn
  {const a=0.25,r=rU(9.1);const cx=Math.cos(a)*(r+0.5),cz=Math.sin(a)*(r+0.5);oBox(M,cx,9.1,cz,1.1,0.75,0.6,wh[2],0,a);oLimb(M,[Math.cos(a)*(r+1.0),9.1,Math.sin(a)*(r+1.0)],[Math.cos(a)*(r+1.6),9.1,Math.sin(a)*(r+1.6)],0.09,0.28,8,wh[0],0,true);
    oBox(M,Math.cos(a)*(r+0.45),8.55,Math.sin(a)*(r+0.45),0.7,0.12,0.12,[0.3,0.3,0.3],0,a);}
  // cornice band, the gallery with its railing
  oPrism(M,0,0,2.36,2.56,11.0,11.38,24,wh[2],0);oPrism(M,0,0,2.6,2.6,11.38,11.56,24,wh[0],0);oPrism(M,0,0,3.05,3.05,11.56,11.72,24,blk,0);
  const NP=20;for(let k=0;k<NP;k++){const a=k/NP*6.2832,b=(k+1)/NP*6.2832,p=r=>[Math.cos(a)*r,0,Math.sin(a)*r];oBox(M,Math.cos(a)*2.95,12.22,Math.sin(a)*2.95,0.06,1.0,0.06,blk,0,a);
    for(const y of [12.7,12.25,11.9])oLimb(M,[Math.cos(a)*2.95,y,Math.sin(a)*2.95],[Math.cos(b)*2.95,y,Math.sin(b)*2.95],y>12.6?0.04:0.022,y>12.6?0.04:0.022,4,blk,0,false);
    if(k%2===0)oLimb(M,[Math.cos((a+b)/2)*2.95,11.75,Math.sin((a+b)/2)*2.95],[Math.cos((a+b)/2)*2.95,12.68,Math.sin((a+b)/2)*2.95],0.012,0.012,3,blk,0,false);}
  // the lantern: dark octagonal base, glass (lit at night), mullions, a black roof with a vent ball and rod
  oPrism(M,0,0,1.38,1.38,11.72,12.55,8,[0.1,0.09,0.08],0,Math.PI/8);oPrism(M,0,0,1.3,1.3,12.55,13.95,8,[0.95,0.9,0.75],9,Math.PI/8);
  for(let k=0;k<8;k++){const a=(k+0.5)/8*6.2832+Math.PI/8-Math.PI/8;const ca=Math.cos(k/8*6.2832+Math.PI/8),sa=Math.sin(k/8*6.2832+Math.PI/8),r=1.3/Math.cos(Math.PI/8);oBox(M,ca*r,13.25,sa*r,0.08,1.4,0.08,blk,0,a);}
  oPrism(M,0,0,1.33,1.33,13.2,13.27,8,blk,0,Math.PI/8);oPrism(M,0,0,1.3,1.32,13.93,14.02,8,blk,0,Math.PI/8);
  oPrism(M,0,0,1.62,0.14,14.0,15.05,8,blk,0,Math.PI/8);oIco(M,0,15.32,0,0.3,blk,0,{detail:1});oLimb(M,[0,15.55,0],[0,16.3,0],0.025,0.015,4,blk,0,false);
  // inside the glass: the lens and lamp (lit)
  oPrism(M,0,0,0.55,0.55,12.7,13.8,10,[1,0.85,0.55],9);
  return M;}
// ---- the quay of a fishing harbour (+x out to sea, y 0 at sea level, the root at x -6 on the shore)
function quayMesh(){const M=omesh(),rng=mulberry32(808),st=[[0.55,0.53,0.5],[0.5,0.48,0.46],[0.6,0.58,0.54]],pick=a=>a[Math.floor(rng()*a.length)],wd=[0.42,0.32,0.22];
  oBox(M,14,-2.4,0,40,7.8,5,st[1],0);for(let x=-5.5;x<34;x+=1.1)for(const e of [-1,1])oBox(M,x,0.9,e*2.48,1.05,0.5,0.1,pick(st),0);
  oBox(M,14,1.48,0,40,0.12,5.1,[0.5,0.49,0.47],0);for(let x=-5.5;x<34;x+=2)oBox(M,x+0.5,1.6,0,1.9,0.04,4.8,pick(st),0);
  for(const e of [-1,1])oBox(M,14,1.68,e*2.42,40,0.22,0.26,st[2],0);oBox(M,33.9,1.68,0,0.26,0.22,5,st[2],0);
  for(let x=-2;x<34;x+=7)for(const e of [-1,1]){oLimb(M,[x,1.55,e*2.1],[x,2.1,e*2.1],0.13,0.11,8,[0.1,0.1,0.11],0,true);oIco(M,x,2.12,e*2.1,0.15,[0.1,0.1,0.11],0);}
  for(const e of [-1,1]){oBox(M,26,0.2,e*2.56,0.08,2.6,0.5,[0.2,0.2,0.2],0);}
  // the lamp at the end, the fisherman's hut at the root with nets, crates and lobster pots
  oLimb(M,[32.8,1.6,0],[32.8,5.6,0],0.08,0.06,6,[0.12,0.13,0.12],0,true);oBox(M,32.8,5.8,0,0.5,0.5,0.5,[1,0.85,0.55],9);oPrism(M,32.8,0,0.42,0.05,6.05,6.4,4,[0.12,0.13,0.12],0,Math.PI/4);
  oBox(M,-3.2,2.9,0,4.2,2.6,3.6,[0.42,0.3,0.22],0);oGable(M,-3.2,0,4.2,3.6,4.2,1.3,0.25,'x',[0.25,0.24,0.26],[0.42,0.3,0.22],0,0);oBox(M,-1.08,2.6,0.6,0.05,1.9,0.9,[0.16,0.13,0.1],0);oBox(M,-1.08,3.2,-0.9,0.05,0.7,0.7,[0.95,0.9,0.75],9);
  for(let i=0;i<5;i++)oBox(M,2+rng()*8,1.85,(rng()<0.5?-1:1)*(0.6+rng()*1.3),0.7,0.45,0.5,[0.55+rng()*0.1,0.45,0.32],0,rng()*3);
  for(let i=0;i<3;i++)oIco(M,5+i*1.3,1.85,-1.5,0.45,[0.2,0.35,0.3],0,{sy:0.5,jit:0.3,seed:i+5});
  for(let i=0;i<4;i++)oPrism(M,12+i*0.9,1.3,0.38,0.32,1.56,2.2,8,[0.35,0.26,0.16],0);
  return M;}
