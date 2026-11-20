'use strict';
// ===== wild.js
// ===================================================================
// WILDLIFE in the woods and at the field edges: red deer (some stags with antlers), wild boar, foxes, rabbits and crows. Herds are placed
// among the trees, away from villages and roads; rabbits along field edges. They graze, wander inside a home range and flee from vehicles
// (buses, lorries, trains, a low plane), then settle again. Crows circle over the woods in flocks, now and then land on a field to peck,
// and lift off when something comes. Only animals within 1.5 km of the camera move; drawn with the vehicle shader, one call each.
// ===================================================================
const WILD={deer:{n:6,size:[3,6],home:60,walk:1.3,run:9,flee:45},boar:{n:4,size:[3,5],home:35,walk:1.0,run:6,flee:30},fox:{n:6,size:[1,1],home:130,walk:1.8,run:8,flee:35},rabbit:{n:8,size:[2,4],home:12,walk:2.6,run:7,flee:18}};
const Wild={key:'',L:[],flocks:[],M:null,
  init(){const T=App.T;this.key=T.W+'|'+P.seed+'|'+(Life.villages||[]).length;this.L=[];this.flocks=[];let s=(P.seed|0)*9301+71;const rnd=()=>{s=(s*16807)%2147483647;return s/2147483647;};
    const A=Math.min(10,(T.W/4096)*(T.W/4096)),trees=(T.veg&&T.veg.trees||[]).filter(a=>a.length),V=Life.villages||[];
    const okAt=(x,z)=>{if(x<40||z<40||x>T.W-40||z>T.W-40)return false;const w=sampleWater(T,x,z);if(w[1]>0&&w[0]>R.sampleHr(T,x,z)-0.3)return false;for(const v of V)if(Math.hypot(v.x-x,v.z-z)<v.R+140)return false;return!(Life.roadKill&&Life.roadKill[clamp((z/T.cs)|0,0,T.N-1)*T.N+clamp((x/T.cs)|0,0,T.N-1)]);};
    const inWood=()=>{for(let k=0;k<40;k++){const a=trees[Math.floor(rnd()*trees.length)];if(!a)return null;const i=Math.floor(rnd()*a.length/8);if(a[i*8+3]<=0)continue;const x=a[i*8]+(rnd()-0.5)*30,z=a[i*8+2]+(rnd()-0.5)*30;if(okAt(x,z))return[x,z];}return null;};
    const fields=(T.fields||[]).filter(f=>f&&f.hx);const atField=()=>{for(let k=0;k<20;k++){const f=fields[Math.floor(rnd()*fields.length)];if(!f)return null;const e=rnd()<0.5?1:-1,c=Math.cos(f.a),sn=Math.sin(f.a),lx=e*(f.hx+4+rnd()*6),lz=(rnd()-0.5)*2*f.hz,x=f.x+c*lx-sn*lz,z=f.z+sn*lx+c*lz;if(okAt(x,z))return[x,z];}return null;};
    for(const [k,W] of Object.entries(WILD)){const groups=Math.round(Math.min(90,W.n*A*(P.wildlife==null?2:+P.wildlife)));for(let g=0;g<groups;g++){const at=k==='rabbit'?(atField()||inWood()):inWood();if(!at)continue;const n=W.size[0]+Math.floor(rnd()*(W.size[1]-W.size[0]+1));
        for(let i=0;i<n;i++){const x=at[0]+(rnd()-0.5)*14,z=at[1]+(rnd()-0.5)*14;this.L.push({k,x,z,hx:at[0],hz:at[1],h:rnd()*6.28,st:'graze',t:rnd()*8,tx:x,tz:z,v:0,ph:rnd()*6.28,sc:k==='deer'?0.9+rnd()*0.2:0.9+rnd()*0.2,stag:k==='deer'&&i===0&&rnd()<0.7});}}}
    for(let f=0;f<Math.round(Math.min(20,4*A));f++){const at=inWood();if(!at)continue;const n=7+Math.floor(rnd()*9),B=[];for(let i=0;i<n;i++)B.push({ph:rnd()*6.28,oa:rnd()*6.28,or:rnd()*18,oy:(rnd()-0.5)*8,gx:0,gz:0,hop:rnd()*3});this.flocks.push({x:at[0],z:at[1],hx:at[0],hz:at[1],r:30+rnd()*30,alt:25+rnd()*20,a:rnd()*6.28,sp:0.25+rnd()*0.15,st:'circle',t:20+rnd()*40,B});}
    Log.info(`wildlife: ${this.L.filter(q=>q.k==='deer').length} deer, ${this.L.filter(q=>q.k==='boar').length} wild boar, ${this.L.filter(q=>q.k==='fox').length} foxes, ${this.L.filter(q=>q.k==='rabbit').length} rabbits, ${this.flocks.length} crow flocks`);},
  threats(){const out=[];for(const b of Buses.list)out.push([b.x,b.z]);for(const tr of Trains.list){const p=tr.poses&&tr.poses[0];if(p)out.push([p.c[0],p.c[2]]);}if((typeof Plane!=='undefined')&&Plane.on&&Plane.st){const p=Plane.st.p;if(p[1]-R.sampleHr(App.T,p[0],p[2])<40)out.push([p[0],p[2]]);}return out;},
  update(dt){const T=App.T;if(!T||!T.veg)return;if(this.key!==T.W+'|'+P.seed+'|'+(Life.villages||[]).length)this.init();const cp=Cam.pos||[0,0,0],TH=this.threats(),near=(x,z,r)=>Math.abs(x-cp[0])<r&&Math.abs(z-cp[2])<r;
    for(const a of this.L){if(!near(a.x,a.z,1500))continue;const W=WILD[a.k];let th=null,td=W.flee;for(const q of TH){const d=Math.hypot(q[0]-a.x,q[1]-a.z);if(d<td){td=d;th=q;}}
      if(th&&a.st!=='flee'){a.st='flee';a.t=3+Math.random()*3;const ang=Math.atan2(a.z-th[1],a.x-th[0])+(Math.random()-0.5)*0.8;a.tx=a.x+Math.cos(ang)*W.run*a.t;a.tz=a.z+Math.sin(ang)*W.run*a.t;}
      a.t-=dt;if(a.st==='graze'){a.v=0;if(a.t<=0){const r=W.home*Math.sqrt(Math.random()),an=Math.random()*6.28,x=a.hx+Math.cos(an)*r,z=a.hz+Math.sin(an)*r,w=sampleWater(T,x,z);if(!(w[1]>0&&w[0]>R.sampleHr(T,x,z)-0.3)){a.tx=x;a.tz=z;a.st='walk';}a.t=4+Math.random()*10;}}
      if(a.st==='walk'||a.st==='flee'){const dx=a.tx-a.x,dz=a.tz-a.z,d=Math.hypot(dx,dz),sp=a.st==='flee'?W.run:W.walk;if(d<0.6||(a.st==='flee'&&a.t<=0)){a.st='graze';a.t=3+Math.random()*9;if(a.st==='graze'&&Math.hypot(a.x-a.hx,a.z-a.hz)>W.home*2){a.hx=a.x;a.hz=a.z;}continue;}
        const want=Math.atan2(dz,dx);a.h+=wrapPi(want-a.h)*Math.min(1,dt*(a.st==='flee'?6:2.5));a.v=sp;const nx=a.x+Math.cos(a.h)*sp*dt,nz=a.z+Math.sin(a.h)*sp*dt,w=sampleWater(T,nx,nz);
        if(w[1]>0&&w[0]>R.sampleHr(T,nx,nz)-0.3){a.st='graze';a.t=2;continue;}a.x=nx;a.z=nz;a.ph+=dt*sp*(a.k==='rabbit'?2.6:a.k==='deer'?1.4:2);}}
    for(const f of this.flocks){if(!near(f.x,f.z,1800))continue;f.t-=dt;let th=false;for(const q of TH)if(Math.hypot(q[0]-f.x,q[1]-f.z)<60){th=true;break;}
      if(f.st==='circle'){f.a+=dt*f.sp;if(f.t<=0){const L=(App.T.fields||[]).filter(q=>q&&q.hx&&Math.hypot(q.x-f.hx,q.z-f.hz)<450);if(L.length){const q=L[Math.floor(Math.random()*L.length)];f.st='go';f.tx=q.x;f.tz=q.z;}else f.t=30;}}
      else if(f.st==='go'||f.st==='home'){const dx=f.tx-f.x,dz=f.tz-f.z,d=Math.hypot(dx,dz);if(d<3){if(f.st==='go'){f.st='ground';f.t=15+Math.random()*25;for(const b of f.B){b.gx=(Math.random()-0.5)*16;b.gz=(Math.random()-0.5)*16;}}else{f.st='circle';f.t=25+Math.random()*40;}}else{const s=Math.min(d,11*dt);f.x+=dx/d*s;f.z+=dz/d*s;f.a+=dt*0.8;}}
      else if(f.st==='ground'){if(th||f.t<=0){f.st='home';f.tx=f.hx;f.tz=f.hz;}for(const b of f.B)b.hop-=dt;}}},
  build(){const V=(M,p,n,c)=>{M.v.push(p[0],p[1],p[2],n[0],n[1],n[2],c[0],c[1],c[2],0,0,0,1,0);return M.n++;},nrm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);};
    const loft=(M,x0,x1,prof,top,belly,nx,nt)=>{const Pp=[],N=[];for(let i=0;i<=nx;i++)for(let j=0;j<=nt;j++){const x=x0+(x1-x0)*i/nx,a=j/nt*Math.PI*2,[ry,rz,yc]=prof(x),p=[x,yc+Math.sin(a)*ry,Math.cos(a)*rz];Pp.push(p);N.push(nrm([0,Math.sin(a)*rz,Math.cos(a)*ry]));}
      for(let i=0;i<nx;i++)for(let j=0;j<nt;j++){const k=[i*(nt+1)+j,(i+1)*(nt+1)+j,(i+1)*(nt+1)+j+1,i*(nt+1)+j+1],ix=k.map(q=>V(M,Pp[q],N[q],N[q][1]<-0.4?belly:top));M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);}};
    const blob=(x0,x1,ry,rz,yc,pw)=>x=>{const u=(x-x0)/(x1-x0),s=Math.pow(Math.sin(Math.PI*clamp(u*0.9+0.05,0,1)),pw||0.6);return[ry*s+0.01,rz*s+0.01,yc];};
    const leg=(M,a,b,r,col)=>{const d=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],L=Math.hypot(...d),u=nrm(d),s1=nrm([u[1],-u[0],0]).map(v=>v||0),s2=[u[1]*s1[2]-u[2]*s1[1],u[2]*s1[0]-u[0]*s1[2],u[0]*s1[1]-u[1]*s1[0]];
      const S=[s1,s2,s1.map(v=>-v),s2.map(v=>-v)];for(let k=0;k<4;k++){const e=S[k],f=S[(k+1)%4],n=nrm([e[0]+f[0],e[1]+f[1],e[2]+f[2]]),q=[[a,e],[a,f],[b,f],[b,e]].map(([p,o])=>V(M,[p[0]+o[0]*r,p[1]+o[1]*r,p[2]+o[2]*r],n,col));M.i.push(q[0],q[1],q[2],q[0],q[2],q[3]);}};
    const fin=(M,root,tip,w0,w1,up,col)=>{const d=nrm([tip[0]-root[0],tip[1]-root[1],tip[2]-root[2]]),side=nrm([d[1]*up[2]-d[2]*up[1],d[2]*up[0]-d[0]*up[2],d[0]*up[1]-d[1]*up[0]]);const a=[root[0]+side[0]*w0,root[1]+side[1]*w0,root[2]+side[2]*w0],b=[root[0]-side[0]*w0,root[1]-side[1]*w0,root[2]-side[2]*w0],c=[tip[0]-side[0]*w1,tip[1]-side[1]*w1,tip[2]-side[2]*w1],e=[tip[0]+side[0]*w1,tip[1]+side[1]*w1,tip[2]+side[2]*w1];
      const ix=[a,b,c,e].map(p=>V(M,p,up,col));M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);const ix2=[e,c,b,a].map(p=>V(M,p,up.map(v=>-v),col));M.i.push(ix2[0],ix2[1],ix2[2],ix2[0],ix2[2],ix2[3]);};
    const legs=(M,xs,zs,y0,r,col)=>{for(const x of xs)for(const z of zs)leg(M,[x,y0,z],[x+(x>0?0.02:-0.02),0,z*0.9],r,col);};
    // red deer (1.7 m, shoulder 1.1 m): russet coat, pale rump and belly, slim legs; the stag carries antlers
    const deer=(stag)=>{const M=vmesh(),C=[0.47,0.29,0.16],B=[0.72,0.6,0.44],D=[0.25,0.17,0.11];loft(M,-0.75,0.75,blob(-0.75,0.75,0.3,0.24,1.05,0.5),C,B,10,10);
      leg(M,[0.6,1.15,0],[0.85,1.62,0],0.11,C);loft(M,0.75,1.12,blob(0.72,1.15,0.13,0.11,1.66,0.7),C,C,6,8);fin(M,[0.82,1.76,0.06],[0.74,1.95,0.16],0.05,0.02,[0,0,1],C);fin(M,[0.82,1.76,-0.06],[0.74,1.95,-0.16],0.05,0.02,[0,0,1],C);
      legs(M,[0.5,-0.5],[0.14,-0.14],1.0,0.045,D);loft(M,-0.85,-0.7,blob(-0.85,-0.68,0.09,0.07,1.12,0.8),B,B,3,6);
      if(stag)for(const e of [-1,1]){const r0=[0.86,1.8,e*0.07],t1=[0.7,2.35,e*0.38];leg(M,r0,t1,0.025,[0.78,0.7,0.58]);leg(M,[0.79,2.05,e*0.2],[1.0,2.25,e*0.28],0.018,[0.78,0.7,0.58]);leg(M,[0.73,2.25,e*0.33],[0.82,2.5,e*0.42],0.016,[0.78,0.7,0.58]);}return M;};
    // wild boar (1.3 m, low): dark bristly body, wedge head with a pale snout
    const boar=()=>{const M=vmesh(),C=[0.2,0.16,0.13],B=[0.16,0.13,0.11];loft(M,-0.6,0.55,x=>{const u=(x+0.6)/1.15,s=Math.pow(Math.sin(Math.PI*clamp(u*0.9+0.05,0,1)),0.45);return[0.36*s*(0.8+0.3*u)+0.01,0.27*s+0.01,0.58+0.06*u];},C,B,9,9);
      loft(M,0.5,0.95,x=>{const u=(x-0.5)/0.45;return[0.2*(1-u)+0.05,0.15*(1-u)+0.05,0.55-0.12*u];},C,C,4,8);loft(M,0.92,1.0,x=>[0.05,0.06,0.43],[0.55,0.45,0.4],[0.55,0.45,0.4],1,6);
      fin(M,[0.55,0.72,0.08],[0.5,0.86,0.13],0.05,0.02,[0,0,1],C);fin(M,[0.55,0.72,-0.08],[0.5,0.86,-0.13],0.05,0.02,[0,0,1],C);legs(M,[0.35,-0.4],[0.13,-0.13],0.45,0.05,B);return M;};
    // fox (0.7 m + brush): russet, white chest and tail tip, black legs, big ears
    const fox=()=>{const M=vmesh(),C=[0.82,0.38,0.12],W=[0.93,0.9,0.85],D=[0.12,0.09,0.08];loft(M,-0.4,0.38,blob(-0.4,0.38,0.14,0.12,0.42,0.5),C,W,8,8);
      loft(M,0.32,0.65,x=>{const u=(x-0.32)/0.33;return[0.11*(1-u*0.8)+0.01,0.1*(1-u*0.7)+0.01,0.52-0.05*u];},C,W,4,8);fin(M,[0.4,0.6,0.05],[0.36,0.75,0.08],0.05,0.005,[0,0,1],C);fin(M,[0.4,0.6,-0.05],[0.36,0.75,-0.08],0.05,0.005,[0,0,1],C);
      loft(M,-0.95,-0.38,x=>{const u=(x+0.95)/0.57;return[0.08*Math.sin(Math.PI*clamp(u,0.05,1))+0.02,0.08*Math.sin(Math.PI*clamp(u,0.05,1))+0.02,0.4-0.12*(1-u)];},C,C,5,6);loft(M,-1.02,-0.9,x=>[0.05,0.05,0.27],W,W,1,6);
      legs(M,[0.25,-0.27],[0.07,-0.07],0.35,0.03,D);return M;};
    // rabbit (0.4 m): round grey-brown body, long ears, white scut
    const rabbit=()=>{const M=vmesh(),C=[0.5,0.42,0.33],W=[0.9,0.88,0.84];loft(M,-0.2,0.16,blob(-0.2,0.16,0.13,0.11,0.17,0.45),C,W,6,8);loft(M,0.1,0.27,blob(0.08,0.28,0.08,0.07,0.27,0.6),C,C,4,8);
      fin(M,[0.16,0.33,0.03],[0.08,0.52,0.05],0.03,0.02,[0,0,1],C);fin(M,[0.16,0.33,-0.03],[0.08,0.52,-0.05],0.03,0.02,[0,0,1],C);loft(M,-0.25,-0.18,x=>[0.05,0.05,0.2],W,W,1,6);return M;};
    // crow (0.45 m): black body and head, grey beak; the wings are a mesh of their own (they beat)
    const crow=()=>{const M=vmesh(),K=[0.05,0.05,0.06];loft(M,-0.22,0.16,blob(-0.22,0.16,0.07,0.07,0,0.6),K,K,6,6);loft(M,0.12,0.24,blob(0.1,0.25,0.05,0.05,0.03,0.7),K,K,3,6);leg(M,[0.24,0.03,0],[0.31,0.02,0],0.015,[0.25,0.25,0.25]);fin(M,[-0.2,0,0],[-0.33,0,0],0.04,0.08,[0,1,0],K);return M;};
    const wing=()=>{const M=vmesh(),K=[0.06,0.06,0.07];fin(M,[0.0,0,0.03],[-0.05,0,0.42],0.09,0.06,[0,1,0],K);return M;};
    const U=m=>R.uploadVeh(m);this.M={deer:U(deer(false)),stag:U(deer(true)),boar:U(boar()),fox:U(fox()),rabbit:U(rabbit()),crow:U(crow()),wing:U(wing())};},
  mat(x,y,z,h,pitch,roll,s){const q=Q.mul(Q.mul(Q.axis([0,1,0],-h),Q.axis([0,0,1],pitch||0)),Q.axis([1,0,0],roll||0)),X=Q.rot(q,[s,0,0]),Y=Q.rot(q,[0,s,0]),Z=Q.rot(q,[0,0,s]);return{q,m:new Float32Array([X[0],X[1],X[2],0,Y[0],Y[1],Y[2],0,Z[0],Z[1],Z[2],0,x,y,z,1])};},
  draw(p,pass){if(!this.L.length&&!this.flocks.length)return;if(!this.M)this.build();const cp=Cam.pos||[0,0,0],T=App.T,M=this.M,lim=pass===1?250:900,t=App.time;
    const dm=(m,mt)=>{gl.uniformMatrix4fv(p.u('uModel'),false,mt);gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,0);Stats.draws++;Stats.tris+=m.count/3;};gl.uniform1f(p.u('uDist'),0);
    const near=(x,z,r)=>Math.hypot(x-cp[0],z-cp[2])<r;
    for(const a of this.L){if(!near(a.x,a.z,a.k==='rabbit'?350:lim))continue;const g=R.sampleHr(T,a.x,a.z),mv=a.v>0.1,bob=a.k==='rabbit'?(mv?Math.abs(Math.sin(a.ph))*0.35:0):(mv?Math.abs(Math.sin(a.ph))*(a.st==='flee'?0.12:0.03):0);
      const pitch=a.k==='rabbit'&&mv?Math.cos(a.ph)*0.3:(a.st==='flee'?Math.sin(a.ph)*0.08:0)+(a.st==='graze'&&a.k!=='rabbit'?-0.06:0);dm(a.stag?M.stag:M[a.k],this.mat(a.x,g+bob,a.z,a.h,pitch,0,a.sc).m);}
    for(const f of this.flocks){if(!near(f.x,f.z,lim))continue;const g0=R.sampleHr(T,f.x,f.z);
      for(const b of f.B){let x,y,z,h,flap;if(f.st==='ground'){x=f.x+b.gx;z=f.z+b.gz;const hop=Math.max(0,Math.sin(t*3+b.ph))*0.12*(b.hop<0?1:0);y=R.sampleHr(T,x,z)+0.12+hop;h=b.oa+Math.sin(t*0.5+b.ph)*0.6;flap=0.1;}
        else{const a=f.a*(f.st==='circle'?1:0.3)+b.oa,r=(f.st==='circle'?f.r:6)+b.or*0.5;x=f.x+Math.cos(a)*r;z=f.z+Math.sin(a)*r;y=g0+(f.st==='circle'?f.alt:16)+b.oy+Math.sin(t*0.7+b.ph)*2;h=a+Math.PI/2;flap=Math.sin(t*9+b.ph)*0.8;}
        const F=this.mat(x,y,z,h,0,0,1.2);dm(M.crow,F.m);if(pass===1)continue;for(const e of [-1,1]){const wq=Q.mul(F.q,Q.axis([1,0,0],e*flap*(f.st==='ground'?0:1))),X=Q.rot(wq,[1.2,0,0]),Y=Q.rot(wq,[0,1.2,0]),Z=Q.rot(wq,[0,0,1.2*e]);dm(M.wing,new Float32Array([X[0],X[1],X[2],0,Y[0],Y[1],Y[2],0,Z[0],Z[1],Z[2],0,x,y,z,1]));}}}}};
