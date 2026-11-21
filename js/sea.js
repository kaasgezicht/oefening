'use strict';
// ===== sea.js — the ocean on island maps (4.18.0): the swell's height in JS (the same sum as swellD in the water shader, so things float on
// it), and sea life: whales that swim, surface with a spout, roll and dive with their flukes up (now and then one breaches); pods of
// dolphins that porpoise along (and come to ride beside the plane when it flies low over the sea); schools of fish that jump out in little
// arcs, with their shoal visible as dark shapes just under the surface.
const sstep=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const Sea={whales:[],pods:[],schools:[],M:null,key:'',
  // swell height (m, crest to trough) from the setting, more in wind and storms
  amp(){const E=Weather.eff();return(+P.oceanSwell||0)*(0.65+0.45*E.wind+0.9*E.storm);},
  on(){const T=App.T;return!!(T&&T.sea!=null&&P.waterOn);},
  height(x,z,t){const T=App.T,A0=this.amp();if(!A0)return T.sea;t=t===undefined?App.time:t;let y=0;const dep=Math.min(1,Math.max(0,(T.sea-R.sampleHr(T,x,z))/16)),wd=P.windDir*Math.PI/180;
    for(let i=0;i<5;i++){const lam=330*Math.pow(0.73,i),sh=[0.42,0.27,0.17,0.09,0.05][i],da=[0,0.32,-0.41,0.75,-0.9][i],k=6.2832/lam,w=Math.sqrt(9.81*k),A=A0*0.5*sh*1.25*dep,ph=k*(Math.cos(wd+da)*x+Math.sin(wd+da)*z)-w*t+i*1.7;y+=A*Math.cos(ph);}
    return T.sea+y;},
  /* 4.54: the sea surface exactly as the water shader draws it. swellD moves each vertex sideways as well as up (Gerstner waves), so the
     height at a world point is that of the grid point p whose displaced position lands there: p = q - shift(p), found in three steps.
     Also the shader's fade of the swell 1.5-3 km from the camera. out (optional) gets the surface water's horizontal velocity (orbital
     motion, m/s), which pushes floating things about */
  surf(x,z,t,out){const T=App.T,A0=this.amp();if(out){out[0]=0;out[1]=0;}if(!A0)return T.sea;t=t===undefined?App.time:t;const wd=P.windDir*Math.PI/180,cp=Cam.pos||[x,0,z];
    let px=x,pz=z,y=0;for(let it=0;it<4;it++){const dep=Math.min(1,Math.max(0,(T.sea-R.sampleHr(T,px,pz))/16)),swk=1-sstep(1500,3000,Math.hypot(px-cp[0],pz-cp[2]));let dx=0,dz=0;y=0;let ux=0,uz=0;
      for(let i=0;i<5;i++){const lam=330*Math.pow(0.73,i),sh=[0.42,0.27,0.17,0.09,0.05][i],da=[0,0.32,-0.41,0.75,-0.9][i],k=6.2832/lam,w=Math.sqrt(9.81*k),A=A0*0.5*sh*1.25*dep,Qq=Math.min(0.16/Math.max(k*A,1e-4),1),
        cx=Math.cos(wd+da),cz=Math.sin(wd+da),ph=k*(cx*px+cz*pz)-w*t+i*1.7,c=Math.cos(ph),sn=Math.sin(ph);dx-=Qq*A*cx*sn;dz-=Qq*A*cz*sn;y+=A*c;ux+=Qq*A*w*cx*c;uz+=Qq*A*w*cz*c;}
      dx*=swk;dz*=swk;y*=swk;if(out){out[0]=ux*swk;out[1]=uz*swk;}if(it<3){px=x-dx;pz=z-dz;}}
    return T.sea+y;},
  // open water: on the sea, at least `d` deep
  deep(x,z,d){const T=App.T;if(x<30||z<30||x>T.W-30||z>T.W-30)return false;const w=sampleWater(T,x,z);return w[1]>0&&Math.abs(w[0]-T.sea)<0.6&&T.sea-R.sampleHr(T,x,z)>d;},
  spot(d,rnd){const T=App.T;for(let k=0;k<400;k++){const x=30+rnd()*(T.W-60),z=30+rnd()*(T.W-60);if(this.deep(x,z,d))return[x,z];}return null;},
  init(){const T=App.T;this.key=T.W+'|'+T.sea+'|'+P.seed;this.whales=[];this.pods=[];this.schools=[];let s=(P.seed|0)*7919+13;const rnd=()=>{s=(s*16807)%2147483647;return s/2147483647;};
    for(let i=0;i<6;i++){const p=this.spot(25,rnd);if(p)this.whales.push({x:p[0],z:p[1],h:rnd()*6.28,st:'under',t:rnd()*30,y:-6,pitch:0,roll:0,fl:0,hash:rnd(),sp:1.6+rnd()*0.8});}
    for(let i=0;i<4;i++){const p=this.spot(10,rnd);if(p){const pod={x:p[0],z:p[1],h:rnd()*6.28,sp:6,m:[]};for(let k=0;k<5;k++)pod.m.push({ox:(rnd()-0.5)*12,oz:(rnd()-0.5)*10,ph:rnd()*6.28,y:0,pitch:0});this.pods.push(pod);}}
    for(let i=0;i<8;i++){const p=this.spot(4,rnd);if(p)this.schools.push({x:p[0],z:p[1],h:rnd()*6.28,jumps:[],next:rnd()*3,hash:rnd()});}},
  update(dt){if(!this.on()){return;}const T=App.T;if(this.key!==T.W+'|'+T.sea+'|'+P.seed)this.init();const t=App.time;
    const turnAway=(o,d)=>{const ax=o.x+Math.cos(o.h)*d,az=o.z+Math.sin(o.h)*d;if(!this.deep(ax,az,o.minD||8))o.h+=dt*1.2;else o.h+=Math.sin(t*0.05+(o.hash||0)*20)*dt*0.05;};
    for(const w of this.whales){w.minD=20;turnAway(w,60);const v=w.st==='under'?w.sp*1.3:w.st==='breach'?w.sp*0.5:w.sp;w.x+=Math.cos(w.h)*v*dt;w.z+=Math.sin(w.h)*v*dt;w.t-=dt;w.fl+=dt*(w.st==='under'?1.6:0.9);
      const surf=this.height(w.x,w.z,t)-T.sea;
      if(w.st==='under'){w.y+=(-7-w.y)*Math.min(1,dt*0.5);w.pitch*=1-dt;w.roll*=1-dt;if(w.t<0){if(Math.random()<0.15){w.st='breach';w.t=4.2;w.vy=9.5;w.y=-5;}else{w.st='surface';w.t=9+Math.random()*6;w.blow=1.2;}}}
      else if(w.st==='surface'){w.y+=(surf-0.85-w.y)*Math.min(1,dt*1.5);w.pitch+=(0-w.pitch)*Math.min(1,dt);w.roll=Math.sin(t*0.4+w.hash*9)*0.08;
        if(w.blow>0){w.blow-=dt;if(Math.random()<dt*35)Particles.spawn(w.x+Math.cos(w.h)*4,T.sea+surf+1+Math.random()*2,w.z+Math.sin(w.h)*4,(Math.random()-0.5)*0.6,4+Math.random()*3,(Math.random()-0.5)*0.6,2.2,0.8,3.2,0);}// the spout
        if(w.t<0){w.st='dive';w.t=6;}}
      else if(w.st==='dive'){const f=1-w.t/6;w.pitch=-0.55*Math.sin(Math.min(1,f*1.3)*Math.PI/2)-0.15;w.y+=(surf-0.8-f*6-w.y)*Math.min(1,dt*2);w.flUp=Math.sin(Math.min(1,f*1.6)*Math.PI);if(w.t<0){w.st='under';w.t=25+Math.random()*30;w.flUp=0;}}
      else if(w.st==='breach'){w.vy-=9.81*dt;w.y+=w.vy*dt;w.pitch=Math.atan2(w.vy,w.sp*2)*0.95;w.roll+=dt*0.6;if(w.vy<0&&w.y<surf-1&&!w.splashed){w.splashed=true;for(let k=0;k<70;k++){const a=Math.random()*6.28,r=Math.random()*5;Particles.spawn(w.x+Math.cos(a)*r,T.sea+surf+0.5,w.z+Math.sin(a)*r,Math.cos(a)*3,3+Math.random()*7,Math.sin(a)*3,2.5,1.2,3.5,0);}}
        if(w.t<0||w.y<-6){w.st='under';w.t=30+Math.random()*30;w.splashed=false;w.roll=0;}}}
    // dolphins: porpoising arcs; a pod comes to ride beside the plane when it flies low over the sea
    const pl=Plane.on&&Plane.st&&!Plane.crashed?Plane.st:null;
    for(const d of this.pods){d.minD=6;let v=d.sp;if(pl&&pl.p[1]-T.sea<60&&Math.hypot(pl.p[0]-d.x,pl.p[2]-d.z)<600&&this.deep(pl.p[0],pl.p[2],6)){const F=Q.rot(pl.q,[1,0,0]),tx=pl.p[0]+F[0]*30,tz=pl.p[2]+F[2]*30,want=Math.atan2(tz-d.z,tx-d.x);d.h+=wrapPi(want-d.h)*Math.min(1,dt*1.5);v=Math.min(45,Math.hypot(pl.v[0],pl.v[2])*1.05+Math.hypot(tx-d.x,tz-d.z)*0.15);}else turnAway(d,40);
      d.x+=Math.cos(d.h)*v*dt;d.z+=Math.sin(d.h)*v*dt;d.v=v;for(const m of d.m){m.ph+=dt*(2.2+v*0.06);const s=Math.sin(m.ph);m.y=s>0?s*1.4:s*0.9;m.pitch=Math.cos(m.ph)*0.6;}}
    // fish: a school drifts; now and then a fish leaps out (a short arc) with a little splash
    for(const s of this.schools){s.minD=3;turnAway(s,25);s.x+=Math.cos(s.h)*1.2*dt;s.z+=Math.sin(s.h)*1.2*dt;s.next-=dt;
      if(s.next<0&&s.jumps.length<4){s.next=0.3+Math.random()*2.5;const a=Math.random()*6.28,r=Math.random()*9;s.jumps.push({x:s.x+Math.cos(a)*r,z:s.z+Math.sin(a)*r,h:Math.random()*6.28,t:0,d:0.7+Math.random()*0.5,hgt:0.6+Math.random()*0.9});}
      for(const j of s.jumps)j.t+=dt;s.jumps=s.jumps.filter(j=>{if(j.t>j.d){if(!j.sp){j.sp=1;}return false;}return true;});}},
  // ---- meshes (vehicle shader): a loft along x with a radius profile, fins as thin tapered plates
  build(){const V=(M,p,n,c,m)=>{M.v.push(p[0],p[1],p[2],n[0],n[1],n[2],c[0],c[1],c[2],0,0,0,1,m);return M.n++;},nrm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);};
    const loft=(M,x0,x1,prof,top,belly,nx,nt)=>{const P=[],N=[];for(let i=0;i<=nx;i++)for(let j=0;j<=nt;j++){const x=x0+(x1-x0)*i/nx,a=j/nt*Math.PI*2,[ry,rz,yc]=prof(x),p=[x,yc+Math.sin(a)*ry,Math.cos(a)*rz];P.push(p);N.push(nrm([0,Math.sin(a)*rz,Math.cos(a)*ry]));}
      for(let i=0;i<nx;i++)for(let j=0;j<nt;j++){const k=[i*(nt+1)+j,(i+1)*(nt+1)+j,(i+1)*(nt+1)+j+1,i*(nt+1)+j+1],ix=k.map(q=>V(M,P[q],N[q],N[q][1]<-0.35?belly:top,11));M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);}};
    const fin=(M,root,tip,w0,w1,up,col)=>{const d=nrm([tip[0]-root[0],tip[1]-root[1],tip[2]-root[2]]),side=nrm([d[1]*up[2]-d[2]*up[1],d[2]*up[0]-d[0]*up[2],d[0]*up[1]-d[1]*up[0]]);
      const a=[root[0]+side[0]*w0,root[1]+side[1]*w0,root[2]+side[2]*w0],b=[root[0]-side[0]*w0,root[1]-side[1]*w0,root[2]-side[2]*w0],c=[tip[0]-side[0]*w1,tip[1]-side[1]*w1,tip[2]-side[2]*w1],e=[tip[0]+side[0]*w1,tip[1]+side[1]*w1,tip[2]+side[2]*w1];
      const ix=[a,b,c,e].map(p=>V(M,p,up,col,11));M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);};
    // humpback: 13 m, dark blue-grey back, pale belly, long pale flippers; the flukes are their own mesh (they beat)
    const wh=vmesh(),WT=[0.11,0.13,0.17],WB=[0.78,0.8,0.82];loft(wh,-6.5,6.5,x=>{const u=(x+6.5)/13,r=1.55*Math.pow(Math.sin(Math.PI*Math.min(1,Math.max(0,u*0.92+0.04))),0.75)*(u<0.3?0.55+1.5*u:1)+0.05;return[r*0.85,r,0];},WT,WB,26,18);
    fin(wh,[2.6,-0.6,1.1],[0.4,-1.6,4.4],0.45,0.18,[0,1,0.2],WB);fin(wh,[2.6,-0.6,-1.1],[0.4,-1.6,-4.4],0.45,0.18,[0,1,-0.2],WB);fin(wh,[-2.6,1.1,0],[-3.5,1.6,0],0.35,0.08,[0,0,1],WT);
    const fl=vmesh();loft(fl,-1.0,0.3,x=>[0.22,0.22,0],WT,WT,4,8);fin(fl,[-0.6,0,0],[-1.9,0.05,2.1],0.55,0.25,[0,1,0],WT);fin(fl,[-0.6,0,0],[-1.9,0.05,-2.1],0.55,0.25,[0,1,0],WT);
    // dolphin 2.4 m: grey, pale belly, dorsal fin, flukes
    const dl=vmesh(),DT=[0.36,0.39,0.44],DB=[0.82,0.84,0.86];loft(dl,-1.2,1.2,x=>{const u=(x+1.2)/2.4,r=0.3*Math.pow(Math.sin(Math.PI*Math.min(1,Math.max(0,u*0.95+0.03))),0.8)+0.02;return[r,r*0.9,0];},DT,DB,16,12);
    fin(dl,[0,0.25,0],[-0.3,0.62,0],0.18,0.04,[0,0,1],DT);fin(dl,[-1.05,0,0],[-1.35,0,0.38],0.12,0.07,[0,1,0],DT);fin(dl,[-1.05,0,0],[-1.35,0,-0.38],0.12,0.07,[0,1,0],DT);fin(dl,[0.4,-0.18,0.2],[0.1,-0.35,0.5],0.1,0.04,[0,1,0],DT);fin(dl,[0.4,-0.18,-0.2],[0.1,-0.35,-0.5],0.1,0.04,[0,1,0],DT);
    // a silver fish (35 cm) and a shoal of dark shapes under the surface
    const fi=vmesh(),FS=[0.75,0.78,0.82],FD=[0.3,0.36,0.42];loft(fi,-0.17,0.17,x=>{const u=(x+0.17)/0.34,r=0.06*Math.sin(Math.PI*Math.min(1,Math.max(0,u*0.94+0.03)))+0.005;return[r,r*0.45,0];},FD,FS,8,8);fin(fi,[-0.15,0,0],[-0.24,0,0],0.01,0.07,[0,0,1],FS);
    const sh=vmesh();let sd=4242;const rnd=()=>{sd=(sd*16807)%2147483647;return sd/2147483647;};for(let k=0;k<45;k++){const r=Math.sqrt(rnd())*6,a=rnd()*6.28,x=Math.cos(a)*r*1.4,z=Math.sin(a)*r,y=(rnd()-0.5)*0.8,h=0.4+(rnd()-0.5)*0.4;
      loft(sh,x-0.22,x+0.22,u=>{const q=(u-x+0.22)/0.44;return[0.07*Math.sin(Math.PI*Math.min(1,Math.max(0,q)))+0.01,0.03+0.03*Math.sin(Math.PI*Math.min(1,Math.max(0,q))),y];},[0.08,0.12,0.14],[0.1,0.14,0.16],4,6);}
    const U=m=>R.uploadVeh(m);this.M={whale:U(wh),fluke:U(fl),dolphin:U(dl),fish:U(fi),shoal:U(sh)};},
  mat(x,y,z,h,pitch,roll,s){const q=Q.mul(Q.mul(Q.axis([0,1,0],-h),Q.axis([0,0,1],pitch||0)),Q.axis([1,0,0],roll||0)),X=Q.rot(q,[s,0,0]),Y=Q.rot(q,[0,s,0]),Z=Q.rot(q,[0,0,s]);
    return{q,m:new Float32Array([X[0],X[1],X[2],0,Y[0],Y[1],Y[2],0,Z[0],Z[1],Z[2],0,x,y,z,1])};},
  draw(p,pass){if(!this.on()||!this.whales.length&&!this.pods.length&&!this.schools.length)return;if(!this.M)this.build();const cp=Cam.pos||[0,0,0],T=App.T,M=this.M,t=App.time,lim=pass===1?600:3000;
    const dm=(m,mt)=>{gl.uniformMatrix4fv(p.u('uModel'),false,mt);gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,0);Stats.draws++;Stats.tris+=m.count/3;};gl.uniform1f(p.u('uDist'),0);
    const near=(x,z)=>Math.hypot(x-cp[0],z-cp[2])<lim;
    for(const w of this.whales){if(!near(w.x,w.z)||w.y<-6.5)continue;const y=T.sea+w.y,F=this.mat(w.x,y,w.z,w.h,w.pitch,w.roll,1);dm(M.whale,F.m);
      // flukes: at the tail, beating up and down; raised high as it dives
      const tail=Q.rot(F.q,[-6.6,0,0]),fa=Math.sin(w.fl*2)*0.35+(w.flUp||0)*0.9,fq=Q.mul(F.q,Q.axis([0,0,1],fa)),X=Q.rot(fq,[1,0,0]),Y=Q.rot(fq,[0,1,0]),Z=Q.rot(fq,[0,0,1]);
      dm(M.fluke,new Float32Array([X[0],X[1],X[2],0,Y[0],Y[1],Y[2],0,Z[0],Z[1],Z[2],0,w.x+tail[0],y+tail[1],w.z+tail[2],1]));}
    for(const d of this.pods)for(const m of d.m){const x=d.x+Math.cos(d.h)*m.ox-Math.sin(d.h)*m.oz,z=d.z+Math.sin(d.h)*m.ox+Math.cos(d.h)*m.oz;if(!near(x,z))continue;dm(M.dolphin,this.mat(x,this.height(x,z,t)+m.y-0.3,z,d.h,m.pitch,0,1).m);}
    for(const s of this.schools){if(!near(s.x,s.z))continue;if(pass!==1)dm(M.shoal,this.mat(s.x,this.height(s.x,s.z,t)-1.3+Math.sin(t*0.7+s.hash*9)*0.2,s.z,s.h+Math.sin(t*0.3)*0.2,0,0,1).m);
      for(const j of s.jumps){const u=j.t/j.d,x=j.x+Math.cos(j.h)*(u-0.5)*1.6,z=j.z+Math.sin(j.h)*(u-0.5)*1.6,y=this.height(x,z,t)+Math.sin(Math.PI*u)*j.hgt-0.1;dm(M.fish,this.mat(x,y,z,j.h,Math.cos(Math.PI*u)*0.9,0,1.4).m);}}}};
