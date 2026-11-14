'use strict';
// ===== weather.js
// ===================================================================
// WEATHER & SEASONS — clear, fair, cloudy, overcast, mist, rain, thunderstorm, snow. Auto mode wanders
// between them with the season (snow in winter, storms in summer, mist at dawn). Clouds are low-poly
// puffs that drift with the wind and cut through the mountains; mist banks lie in the valleys.
// ===================================================================
const WX={clear:{cover:.1,dark:0,low:0,mist:0,rain:0,snow:0,wind:.3,overcast:0,storm:0},
  fair:{cover:.34,dark:.02,low:.08,mist:0,rain:0,snow:0,wind:.45,overcast:.05,storm:0},
  cloudy:{cover:.62,dark:.12,low:.22,mist:.06,rain:0,snow:0,wind:.55,overcast:.28,storm:0},
  overcast:{cover:.92,dark:.3,low:.42,mist:.18,rain:0,snow:0,wind:.6,overcast:.72,storm:0},
  mist:{cover:.22,dark:.04,low:.5,mist:1,rain:0,snow:0,wind:.12,overcast:.3,storm:0},
  rain:{cover:1,dark:.52,low:.55,mist:.28,rain:.85,snow:0,wind:.8,overcast:.85,storm:0},
  storm:{cover:1,dark:.78,low:.7,mist:.2,rain:1.3,snow:0,wind:1.5,overcast:.95,storm:1},
  snow:{cover:.95,dark:.22,low:.45,mist:.3,rain:0,snow:1,wind:.45,overcast:.72,storm:0}};
const WX_NEXT={clear:['clear','fair','fair','cloudy'],fair:['clear','fair','cloudy','cloudy','mist'],cloudy:['fair','overcast','cloudy','rain'],
  overcast:['cloudy','rain','rain','storm','mist','snow'],mist:['clear','fair','cloudy'],rain:['overcast','cloudy','storm','rain'],storm:['rain','overcast'],snow:['overcast','snow','cloudy','snow']};
const SEASONS=['spring','summer','autumn','winter'];
const Weather={cur:{...WX.fair},name:'fair',autoT:60,wet:0,snowCover:0,ice:0,flash:0,nextFlash:5,bolt:null,rainbow:0,rainbowT:0,rainMemo:0,
  seasonW:[0,1,0,0],days:0,clouds:[],cloudInst:{data:new Float32Array(64*8*8),n:0},mistInst:{data:new Float32Array(120*8),n:0},mistSpots:[],peaks:[],world:null,
  label(){const n={clear:'clear',fair:'fair',cloudy:'cloudy',overcast:'overcast',mist:'misty',rain:'rain',storm:'thunderstorm',snow:'snow'}[this.name]||this.name;return n;},
  pickNext(){const S=P.season,h=P.timeOfDay;let opts=(WX_NEXT[this.name]||['fair']).slice();
    if(S==='summer')opts.push('clear','fair');if(S==='autumn')opts.push('rain','mist','overcast');if(S==='spring')opts.push('fair','rain');if(S==='winter')opts.push('snow','overcast');
    let nx=opts[Math.floor(Math.random()*opts.length)];
    if(S==='winter'&&(nx==='rain'||nx==='storm'))nx=Math.random()<0.75?'snow':'overcast';if(S!=='winter'&&nx==='snow')nx=S==='summer'?'rain':'overcast';
    if(nx==='storm'&&S==='winter')nx='snow';if(h>4&&h<9&&(nx==='clear'||nx==='fair')&&Math.random()<0.4)nx='mist';return nx;},
  newDay(){this.days++;Money.newDay();if(P.autoSeason&&this.days%Math.max(1,P.daysPerSeason)===0){const i=(SEASONS.indexOf(P.season)+1)%4;P.season=SEASONS[i];UI.refresh('season');
      UI.toast({spring:'Spring is here',summer:'Summer has come',autumn:'Autumn is here',winter:'Winter has come'}[P.season]);Log.info('season turns '+P.season);
      if(P.weather==='auto'){this.autoT=Math.min(this.autoT,8);}}},
  update(dt){const E0=this.cur;
    if(P.weather==='auto'){this.autoT-=dt;if(this.autoT<=0){this.name=this.pickNext();this.autoT=P.weatherPace*(0.6+Math.random()*0.8);Log.info(`weather turning ${this.name}`);}}
    else this.name=P.weather;
    const tg=WX[this.name]||WX.fair,k=Math.min(1,dt/Math.max(1,P.weatherBlend));for(const key in tg)E0[key]+=(tg[key]-E0[key])*k;
    const si=SEASONS.indexOf(P.season);for(let i=0;i<4;i++)this.seasonW[i]+=((i===si?1:0)-this.seasonW[i])*Math.min(1,dt/10);
    const win=this.seasonW[3],warm=this.seasonW[1]+this.seasonW[0]*0.6;
    this.wet=clamp(this.wet+(E0.rain>0.1?dt/40*E0.rain:-dt/(200+300*win)),0,1);
    let sc=this.snowCover;if(E0.snow>0.1)sc+=dt/360*E0.snow*P.snowRate;else if(win>0.6)sc-=dt/3000*(E0.rain>0.1?8:1);else sc-=dt/(90+120*(1-warm))*(1-win*0.8);
    this.snowCover=clamp(sc,0,1);this.ice=clamp(this.ice+(win>0.6?dt/40:-dt/25),0,1);
    // lightning
    let fI=0;if(this.bolt){this.bolt.t+=dt;fI=boltI(this.bolt);if(this.bolt.t>this.bolt.dur)this.bolt=null;}if(this.ic){this.ic.t+=dt;fI=Math.max(fI,boltI(this.ic)*0.5);if(this.ic.t>this.ic.dur)this.ic=null;}this.flash=Math.max(fI*0.9,this.flash-dt*6);
    if(E0.storm>0.5&&P.lightning&&this.world){this.nextFlash-=dt;if(this.nextFlash<=0){if(Math.random()<0.55)this.strike();else this.sheet();this.nextFlash=2+Math.random()*8;}}
    // rainbow after a shower when the sun is out
    if(E0.rain>0.35)this.rainMemo=40;else this.rainMemo=Math.max(0,this.rainMemo-dt);
    const sunUp=R.sun&&R.sun.L&&R.sun.L[1]>0.05&&R.sun.L[1]<0.6;
    if(P.rainbow&&this.rainMemo>0&&E0.rain<0.08&&sunUp&&this.rainbowT<=0&&E0.overcast<0.75){this.rainbowT=55;this.rainMemo=0;Log.info('rainbow');}
    this.rainbowT-=dt;this.rainbow+=((this.rainbowT>0&&sunUp?0.85:0)-this.rainbow)*Math.min(1,dt/4);
    Sfx.rain(E0.rain*P.precip);Sfx.wind&&Sfx.wind(this.eff().wind);
    if(this.world){Clouds.update(dt);this.updateMist(dt);this.updateFlood(dt);this.updateSpray(dt);}},
  strike(){const T=this.world,F=R.focus||[T.W/2,0,T.W/2];let gx=F[0],gz=F[2],best=-1;
    for(let k=0;k<14;k++){const a=Math.random()*6.283,d=150+Math.random()*900,x=clamp(F[0]+Math.cos(a)*d,20,T.W-20),z=clamp(F[2]+Math.sin(a)*d,20,T.W-20),c=Clouds.cov(x,z)+Math.random()*0.2;if(c>best){best=c;gx=x;gz=z;}}
    const gy=R.sampleHr(T,gx,gz),top=Math.max(Clouds.base+30,gy+120);
    const mk=(a,b,depth,disp)=>{let Q=[a,b];for(let l=0;l<depth;l++){const n=[Q[0]];for(let i=0;i<Q.length-1;i++){const p=Q[i],q=Q[i+1],L=Math.hypot(q[0]-p[0],q[1]-p[1],q[2]-p[2]);
      n.push([(p[0]+q[0])/2+(Math.random()-0.5)*L*disp,(p[1]+q[1])/2+(Math.random()-0.5)*L*disp*0.35,(p[2]+q[2])/2+(Math.random()-0.5)*L*disp],q);}Q=n;}return Q;};
    const main=mk([gx+(Math.random()-0.5)*90,top,gz+(Math.random()-0.5)*90],[gx,gy,gz],7,0.5),lines=[{p:main,w:1,I:1}];
    const nb=3+Math.floor(Math.random()*5);for(let k=0;k<nb;k++){const s0=main[Math.floor(main.length*(0.05+Math.random()*0.6))],h=s0[1]-gy,an=Math.random()*6.283,len=h*(0.2+Math.random()*0.35);
      lines.push({p:mk(s0,[s0[0]+Math.cos(an)*len*0.7,s0[1]-len*(0.6+Math.random()*0.4),s0[2]+Math.sin(an)*len*0.7],5,0.6),w:0.5,I:0.4});}
    const st=[0];let tt=0;for(let k=Math.floor(Math.random()*4);k>0;k--){tt+=0.05+Math.random()*0.13;st.push(tt);}
    this.bolt={lines,t:0,dur:tt+0.4,st,pos:[gx,top+20,gz]};const dist=Math.hypot(gx-Cam.pos[0],gy-Cam.pos[1],gz-Cam.pos[2]);
    Sfx.thunder(Math.min(6,dist/340),clamp(1.25-dist/2200,0.35,1));},
  sheet(){const T=this.world,F=R.focus||[T.W/2,0,T.W/2],a=Math.random()*6.283,d=200+Math.random()*1400,x=F[0]+Math.cos(a)*d,z=F[2]+Math.sin(a)*d;
    this.ic={t:0,dur:0.55,st:[0,0.08+Math.random()*0.1],pos:[x,Clouds.base+Clouds.thick*0.45,z]};const dist=Math.hypot(x-Cam.pos[0],z-Cam.pos[2]);Sfx.thunder(Math.min(7,dist/340),clamp(0.8-dist/3000,0.2,0.6));},
  boltU(){const b=this.bolt||this.ic;if(!b)return[0,-1e4,0,0];return[b.pos[0],b.pos[1],b.pos[2],boltI(b)*(this.bolt?1:0.8)];},
  eff(){const c=this.cur,h=P.timeOfDay;const dawn=smooth(3.8,5.6,h)*(1-smooth(8.2,10.2,h))*(1-c.rain)*(c.cover<0.8?1:0.4);
    const mist=clamp(c.mist+dawn*0.65*(1-this.seasonW[1]*0.3),0,1.4)*P.mistAmt;
    return{cover:c.cover,dark:c.dark,low:c.low,mist,mistTop:this.mistTop||120,rain:c.rain*P.precip,snow:c.snow*P.precip,wind:P.windStrength*(0.5+c.wind),overcast:c.overcast,storm:c.storm,
      wet:this.wet,snowCover:this.snowCover,ice:this.ice,flash:this.flash,rainbow:this.rainbow};},
  // ---- world-dependent setup: valley spots for mist, peaks for low clouds
  setWorld(T){this.world=T;const rng=mulberry32((P.seed|0)+404),N=T.N,H=T.Hr||T.H;
    const hs=Array.from(H).sort((a,b)=>a-b);const low=hs[Math.floor(hs.length*0.22)];this.mistTop=low+38;
    const cand=[];for(let k=0;k<4000;k++){const x=40+rng()*(T.W-80),z=40+rng()*(T.W-80),h=R.sampleHr(T,x,z);if(h>low+45)continue;const i=clamp((x/T.cs)|0,0,N-1),j=clamp((z/T.cs)|0,0,N-1),n=j*N+i;
      const wet=T.data[n*4]/255,shore=T.data[n*4+2]/255;cand.push({x,z,h,s:(1-(h-low)/60)+wet*0.6+shore*0.8+rng()*0.5});}
    cand.sort((a,b)=>b.s-a.s);this.mistSpots=[];for(const c of cand){if(this.mistSpots.length>=90)break;if(this.mistSpots.some(m=>Math.hypot(m.x-c.x,m.z-c.z)<45))continue;
      this.mistSpots.push({x:c.x,z:c.z,h:rng(),size:45+rng()*65,st:0.32+rng()*0.22,dy:5+rng()*16,ph:rng()*6.28});}
    // peaks: local maxima on a coarse grid
    this.peaks=[];const G=16;for(let j=G;j<N-G;j+=G)for(let i=G;i<N-G;i+=G){let bi=i,bj=j,bh=-1e9;for(let dj=0;dj<G;dj++)for(let di=0;di<G;di++){const h=H[(j+dj)*N+i+di];if(h>bh){bh=h;bi=i+di;bj=j+dj;}}
      if(bh>P.maxHeight*0.45)this.peaks.push({x:(bi+0.5)*T.cs,z:(bj+0.5)*T.cs,h:bh});}
    this.peaks.sort((a,b)=>b.h-a.h);this.peaks=this.peaks.filter((p,i,a)=>!a.slice(0,i).some(q=>Math.hypot(q.x-p.x,q.z-p.z)<220)).slice(0,12);
    this.clouds=[];const E=this.eff();const want=Math.round(E.cover*44*P.cloudAmt);for(let i=0;i<want;i++){const c=this.newCloud(rng,true);c.a=1;this.clouds.push(c);}
    this.initMistMap(T);Clouds.setWorld(T);
    Log.info(`weather: ${this.mistSpots.length} mist spots, ${this.peaks.length} peaks, mist top ${this.mistTop.toFixed(0)} m`);},
  newCloud(rng,anywhere,peak){const T=this.world,E=this.eff(),M=500;rng=rng||Math.random;
    const wa=P.windDir*Math.PI/180,wx=Math.cos(wa),wz=Math.sin(wa);let x,z,y;
    if(peak){const p=this.peaks[Math.floor(rng()*this.peaks.length)];x=p.x-wx*120+(rng()-0.5)*120;z=p.z-wz*120+(rng()-0.5)*120;y=p.h*(0.82+rng()*0.25);}
    else{if(anywhere){x=-M+rng()*(T.W+2*M);z=-M+rng()*(T.W+2*M);}else{const u=rng()*(T.W+2*M)-M;if(Math.abs(wx)>Math.abs(wz)){x=wx>0?-M:T.W+M;z=u;}else{z=wz>0?-M:T.W+M;x=u;}}
      const base=P.cloudHeight*P.maxHeight*(1-0.3*E.low);y=base*(0.78+rng()*0.5)+40;}
    const S=(52+rng()*58)*P.cloudSize*(1+E.cover*0.35)*(peak?0.7:1);const n=5+Math.floor(rng()*4),puffs=[];
    for(let k=0;k<n;k++){const r=k===0?S*0.56:S*(0.28+rng()*0.2);const a=rng()*6.283,d=k===0?0:S*(0.35+rng()*0.55);puffs.push([Math.cos(a)*d*1.2,(rng()-0.3)*S*0.12+(k===0?S*0.08:0),Math.sin(a)*d*0.8,r,0.8+rng()*0.35]);}
    return{x,z,y,S,puffs,a:0,want:true,peak:!!peak,dk:0.7+rng()*0.3,h:rng(),sp:0.8+rng()*0.4};},
  updateClouds(dt){const T=this.world,E=this.eff(),M=500,wa=P.windDir*Math.PI/180;const v=E.wind*8*1.6;const wx=Math.cos(wa)*v,wz=Math.sin(wa)*v;
    const target=Math.round(E.cover*44*P.cloudAmt),peakT=this.peaks.length?Math.round(clamp(E.low-0.2,0,1)*8*P.cloudAmt):0;
    let nSky=0,nPeak=0;for(const c of this.clouds)if(c.want){if(c.peak)nPeak++;else nSky++;}
    if(nSky<target&&Math.random()<dt*2){this.clouds.push(this.newCloud(null,Math.random()<0.5));}
    if(nPeak<peakT&&Math.random()<dt*0.6)this.clouds.push(this.newCloud(null,false,true));
    if(nSky>target&&Math.random()<dt*1.5){const l=this.clouds.filter(c=>c.want&&!c.peak);if(l.length)l[Math.floor(Math.random()*l.length)].want=false;}
    if(nPeak>peakT&&Math.random()<dt){const l=this.clouds.filter(c=>c.want&&c.peak);if(l.length)l[0].want=false;}
    const D=this.cloudInst;let o=0;
    this.clouds=this.clouds.filter(c=>{c.a=clamp(c.a+(c.want?dt/8:-dt/6),0,1);if(!c.want&&c.a<=0)return false;
      const f=c.peak?0.35:c.sp;c.x+=wx*f*dt;c.z+=wz*f*dt;
      if(c.x<-M-c.S||c.x>T.W+M+c.S||c.z<-M-c.S||c.z>T.W+M+c.S){if(c.peak)return false;if(c.x<-M-c.S)c.x=T.W+M;else if(c.x>T.W+M+c.S)c.x=-M;if(c.z<-M-c.S)c.z=T.W+M;else if(c.z>T.W+M+c.S)c.z=-M;c.a=0;}
      const edge=Math.min(c.x+M,T.W+M-c.x,c.z+M,T.W+M-c.z),ea=clamp(edge/250,0,1);const al=c.a*ea;if(al<0.01)return true;
      const dark=clamp(E.dark*c.dk+(c.peak?0.05:0),0,1);
      for(const p of c.puffs){if(o>=D.data.length/8)break;D.data.set([c.x+p[0],c.y+p[1],c.z+p[2],p[3]*(0.6+0.4*al),p[4],dark,c.h,al],o*8);o++;}
      return true;});
    D.n=o;},
  // rivers swell with sustained rain (minutes to rise, longer to fall back)
  updateFlood(dt){const E=this.eff(),tg=clamp(E.rain*0.8,0,1.2)*P.floodAmt;this.flood=this.flood||0;this.flood+=(tg-this.flood)*Math.min(1,dt/(tg>this.flood?120:400));},
  updateSpray(dt){const T=this.world,em=T&&T.emitters;if(!em||!(P.fallSpray>0)||!Cam.pos)return;const c=Cam.pos,f=this.flood||0,rise=P.floodRise*f;let budget=14;
    for(const e of em){const d=Math.hypot(e[0]-c[0],e[2]-c[2]);if(d>700)continue;const st=Math.min(3,0.6+e[3]*1.5),rate=st*(3+6*f)*P.fallSpray*(d<250?1:0.45);let k=rate*dt;
      while(k>0&&budget>0){if(k<1&&Math.random()>k)break;k-=1;budget--;const a=Math.random()*6.283,r=Math.random()*(1+st),sp=0.6+Math.random()*1.6;
        Particles.spawn(e[0]+Math.cos(a)*r,e[1]+rise+0.3,e[2]+Math.sin(a)*r,Math.cos(a)*sp,1+Math.random()*2.5,Math.sin(a)*sp,2.5+Math.random()*2.5,0.8+st*0.4,3+st*1.8,3);}}},
  initMistMap(T){const G=128,cs=T.W/G;let fl=new Float32Array(G*G),mn=1e9;
    for(let j=0;j<G;j++)for(let i=0;i<G;i++){const x=(i+0.5)*cs,z=(j+0.5)*cs,h=R.sampleHr(T,x,z),wt=sampleWater(T,x,z);fl[j*G+i]=wt[1]>0?Math.max(h,wt[0]):h;mn=Math.min(mn,h);}
    for(let it=0;it<4;it++){const a=fl.slice();for(let j=0;j<G;j++)for(let i=0;i<G;i++){const n=j*G+i,l=i>0?n-1:n,r=i<G-1?n+1:n,u=j>0?n-G:n,d=j<G-1?n+G:n;fl[n]=(a[n]*2+a[l]+a[r]+a[u]+a[d])/6;}}
    const old=this.mm;this.mm={G,cs,fl,mn,bank:new Float32Array(G*G),thk:new Float32Array(G*G),px:new Float32Array(G*G*4),acc:1,on:false,lo:mn-2,hi:mn,tex:old&&old.tex};
    if(!this.mm.tex)this.mm.tex=tex2D(G,G,gl.RGBA16F,gl.RGBA,gl.FLOAT,null,gl.LINEAR);},
  updateMistMap(dt){const M=this.mm,E=this.eff(),t=App.time,T=this.world;if(!M)return;M.acc+=dt;if(M.acc<0.2)return;M.acc=0;
    if(E.mist<0.01){M.on=false;return;}const G=M.G,cs=M.cs,B=M.bank,K=M.thk;B.fill(0);K.fill(0);const wa=P.windDir*Math.PI/180,wx=Math.cos(wa),wz=Math.sin(wa);
    for(const m of this.mistSpots){const a=clamp(E.mist*1.5*(0.45+0.55*Math.sin(m.ph+t*0.02)**2),0,1.5);if(a<0.01)continue;
      const x=m.x+Math.sin(t*0.013+m.ph)*35+wx*Math.sin(t*0.01+m.h*9)*30,z=m.z+Math.cos(t*0.011+m.ph*1.3)*35+wz*Math.sin(t*0.01+m.h*9)*30;
      const r=m.size*(0.8+E.mist*0.25)*1.15,th=(5+m.dy)*(0.7+0.5*Math.min(E.mist,1.2));const i0=Math.max(0,Math.floor((x-r)/cs)),i1=Math.min(G-1,Math.floor((x+r)/cs)),j0=Math.max(0,Math.floor((z-r)/cs)),j1=Math.min(G-1,Math.floor((z+r)/cs));
      for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const dx=(i+0.5)*cs-x,dz=(j+0.5)*cs-z,q=(dx*dx+dz*dz)/(r*r);if(q>1)continue;const w=a*Math.exp(-2.2*q)*(1-q*q);B[j*G+i]+=w;K[j*G+i]+=w*th;}}
    let hi=-1e9;const px=M.px;for(let n=0;n<G*G;n++){const b=B[n],k=b>1e-3?K[n]/b:8;px[n*4]=Math.min(b,1.5);px[n*4+1]=M.fl[n];px[n*4+2]=k;px[n*4+3]=0;if(b>0.02)hi=Math.max(hi,M.fl[n]+k*3+2);}
    M.on=hi>-1e9;M.hi=hi;M.lo=M.mn-2;if(!M.on)return;scratch();gl.bindTexture(gl.TEXTURE_2D,M.tex);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,G,G,gl.RGBA,gl.FLOAT,px);},
  updateMist(dt){const E=this.eff(),D=this.mistInst,t=App.time;let o=0;if(+P.mistQuality>0){D.n=0;this.updateMistMap(dt);return;}if(this.mm)this.mm.on=false;if(E.mist<0.01){D.n=0;return;}const T=this.world;
    const wa=P.windDir*Math.PI/180,wx=Math.cos(wa),wz=Math.sin(wa);
    for(const m of this.mistSpots){const a=clamp(E.mist*(0.35+0.65*Math.sin(m.ph+t*0.02)**2),0,1)*0.55;if(a<0.01)continue;
      const dx=Math.sin(t*0.013+m.ph)*35+wx*Math.sin(t*0.01+m.h*9)*30,dz=Math.cos(t*0.011+m.ph*1.3)*35+wz*Math.sin(t*0.01+m.h*9)*30;
      const x=m.x+dx,z=m.z+dz,y=Math.max(R.sampleHr(T,x,z),(T.water&&sampleWater(T,x,z)[1]>0)?sampleWater(T,x,z)[0]:-1e9)+m.dy;
      D.data.set([x,y,z,m.size*(0.8+E.mist*0.25),a,m.h,m.st,0],o*8);o++;if(o>=120)break;}
    D.n=o;}
};
function boltI(b){let I=0;for(const s0 of b.st)if(b.t>=s0)I+=Math.exp(-(b.t-s0)*20);return Math.min(I,1.5);}
// ---- volumetric clouds: a 96x96 cloud map over the board (+30% margin) is advected by a wind field that bends
// around the mountains, gains cloud where air is pushed up the windward slopes and loses it in the lee.
const vn2=(x,z)=>{const i=Math.floor(x),j=Math.floor(z),fx=x-i,fz=z-j,h=(a,b)=>{let n=(a*374761393+b*668265263)|0;n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;},u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);
  return h(i,j)*(1-u)*(1-v)+h(i+1,j)*u*(1-v)+h(i,j+1)*(1-u)*v+h(i+1,j+1)*u*v;};
const Clouds={G:96,d:null,off:[0,0],acc:0,wd:null,base:300,thick:0,dens:1,inv:1,M:0,
  setWorld(T){const G=this.G;this.T=T;this.M=T.W*0.3;const span=T.W+2*this.M;this.cs=span/G;this.inv=1/span;const H=T.Hr||T.H;let hb=new Float32Array(G*G);
    for(let j=0;j<G;j++)for(let i=0;i<G;i++){let m=0;for(let k=0;k<9;k++){const x=-this.M+(i+0.1+(k%3)*0.4)*this.cs,z=-this.M+(j+0.1+((k/3)|0)*0.4)*this.cs;if(x>0&&z>0&&x<T.W&&z<T.W)m=Math.max(m,sampleH(T,x,z,H));}hb[j*G+i]=m;}
    for(let it=0;it<2;it++){const a=hb.slice();for(let j=1;j<G-1;j++)for(let i=1;i<G-1;i++){const n=j*G+i;hb[n]=(a[n]*4+a[n-1]+a[n+1]+a[n-G]+a[n+G])/8;}}
    const srt=Array.from(hb).sort((a,b)=>a-b);this.hLow=srt[Math.floor(srt.length*0.25)];this.hTop=srt[srt.length-1];
    this.hb=hb;for(const k of ['d','d2','up','vx','vz','tow','o'])this[k]=new Float32Array(G*G);this.px=new Uint8Array(G*G*4);this.wd=null;this.layer();this.flow();
    const cov=this.cov0();for(let n=0;n<G*G;n++)this.d[n]=clamp(this.target(n%G,(n/G)|0,cov)+Math.max(this.up[n],0)*0.4*cov,0,1);this.upload();},
  cov0(){const E=Weather.eff();return clamp(E.cover*P.cloudAmt,0,1);},
  layer(){const E=Weather.eff();this.base=this.hLow+(this.hTop-this.hLow)*0.78*P.cloudHeight*(1-0.4*E.low)+25;this.thick=+P.cloudQuality>0?(130+240*E.cover+320*E.storm)*P.cloudSize:0;this.dens=0.8+0.5*E.dark+0.4*E.storm;},
  flow(){const G=this.G,cs=this.cs,wa=P.windDir*Math.PI/180,wx=Math.cos(wa),wz=Math.sin(wa),yc=this.base+60,hb=this.hb,o=this.o;this.wd=P.windDir;
    for(let n=0;n<G*G;n++)o[n]=smooth(yc-160,yc+40,hb[n]);
    for(let j=0;j<G;j++)for(let i=0;i<G;i++){const n=j*G+i,l=j*G+Math.max(i-1,0),r=j*G+Math.min(i+1,G-1),dn=Math.max(j-1,0)*G+i,u=Math.min(j+1,G-1)*G+i;
      this.up[n]=clamp((wx*(hb[r]-hb[l])+wz*(hb[u]-hb[dn]))/(2*cs)*4,-1,1);
      let ox=o[r]-o[l],oz=o[u]-o[dn],vx=wx,vz=wz;const ol=Math.hypot(ox,oz);
      if(ol>1e-4){ox/=ol;oz/=ol;const into=wx*ox+wz*oz;if(into>0){const k=clamp(ol*2.5,0,1);vx-=ox*into*k;vz-=oz*into*k;}}// slide along the mountain instead of into it
      const sp=1-0.75*o[n];this.vx[n]=vx*sp;this.vz[n]=vz*sp;}
    for(let it=0;it<6;it++){const ax=this.vx.slice(),az=this.vz.slice();for(let j=1;j<G-1;j++)for(let i=1;i<G-1;i++){const n=j*G+i;
      this.vx[n]=(ax[n]*2+ax[n-1]+ax[n+1]+ax[n-G]+ax[n+G])/6;this.vz[n]=(az[n]*2+az[n-1]+az[n+1]+az[n-G]+az[n+G])/6;}}},
  target(i,j,cov){const x=(-this.M+(i+0.5)*this.cs-this.off[0])/1300,z=(-this.M+(j+0.5)*this.cs-this.off[1])/1300;
    let nz=vn2(x,z)*0.55+vn2(x*2.1+5.2,z*2.1+1.3)*0.3+vn2(x*4.3+9.1,z*4.3+3.7)*0.15;nz=clamp((nz-0.5)*1.7+0.5,0,1);return clamp((nz-(1-cov))/Math.max(cov,0.12),0,1);},
  update(dt){if(!this.d)return;this.acc+=dt;if(this.acc<0.1)return;const st=Math.min(this.acc,0.5);this.acc=0;
    /* Cloud quality Off: no clouds are drawn, so the 96² simulation stops and the map is cleared once (the ground's cloud shadows read it) */
    if(!(+P.cloudQuality>0)){this.thick=0;if(!this.offDone&&this.tex){this.offDone=true;this.px.fill(0);scratch();gl.bindTexture(gl.TEXTURE_2D,this.tex);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,this.G,this.G,gl.RGBA,gl.UNSIGNED_BYTE,this.px);}return;}this.offDone=false;
    if(this.wd===null||Math.abs(((P.windDir-this.wd+540)%360)-180)>4)this.flow();this.layer();
    const E=Weather.eff(),G=this.G,cs=this.cs,spd=E.wind*14*P.cloudSpeed,wa=P.windDir*Math.PI/180,wx=Math.cos(wa),wz=Math.sin(wa),cov=this.cov0();
    this.off[0]+=wx*spd*st;this.off[1]+=wz*spd*st;const k=spd*st/cs,d=this.d,d2=this.d2,hum=clamp(cov*1.2+0.15,0,1);
    for(let j=0;j<G;j++)for(let i=0;i<G;i++){const n=j*G+i,x=clamp(i-this.vx[n]*k,0,G-1.001),z=clamp(j-this.vz[n]*k,0,G-1.001),i0=x|0,j0=z|0,fx=x-i0,fz=z-j0,m=j0*G+i0;
      let v=d[m]*(1-fx)*(1-fz)+d[m+1]*fx*(1-fz)+d[m+G]*(1-fx)*fz+d[m+G+1]*fx*fz;
      const ed=(i<4&&wx>0.3)||(i>G-5&&wx<-0.3)||(j<4&&wz>0.3)||(j>G-5&&wz<-0.3);v+=(this.target(i,j,cov)-v)*Math.min(1,st*(ed?0.6:0.016));
      const u=this.up[n];v+=(u>0?u*0.06*hum:u*0.04)*st-this.o[n]*0.03*st;d2[n]=clamp(v,0,1);
      this.tow[n]+=(clamp(u*1.2+E.storm*0.6,0,1)-this.tow[n])*Math.min(1,st*0.2);}
    this.d=d2;this.d2=d;this.upload();},
  upload(){const G=this.G,px=this.px;for(let n=0;n<G*G;n++){px[n*4]=this.d[n]*255;px[n*4+1]=this.tow[n]*255;px[n*4+2]=clamp(this.hb[n]/P.maxHeight,0,1)*255;px[n*4+3]=255;}
    if(!this.tex){this.tex=tex2D(G,G,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,px,gl.LINEAR);bindTU(TU.uCloudMap,gl.TEXTURE_2D,this.tex);}
    else{scratch();gl.bindTexture(gl.TEXTURE_2D,this.tex);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,G,G,gl.RGBA,gl.UNSIGNED_BYTE,px);}},
  cell(x,z){const i=clamp(Math.floor((x+this.M)/this.cs),0,this.G-1),j=clamp(Math.floor((z+this.M)/this.cs),0,this.G-1);return j*this.G+i;},
  cov(x,z){return this.d?this.d[this.cell(x,z)]:0;},
  // tileable 64^3 noise: R = Perlin-Worley (shape), G = Worley fBm (edge erosion)
  initGL(){const S=64,D=new Uint8Array(S*S*S*2),t0=performance.now();
    const worley=(C,seed)=>{const F=new Float32Array(C*C*C*3);let r=seed;const rnd=()=>{r=Math.imul(r^(r>>>15),2246822519)+1013904223|0;return((r>>>0)%100000)/100000;};for(let i=0;i<F.length;i++)F[i]=rnd();
      const out=new Float32Array(S*S*S),cs=S/C;for(let z=0;z<S;z++)for(let y=0;y<S;y++)for(let x=0;x<S;x++){const px=x/cs,py=y/cs,pz=z/cs,ix=Math.floor(px),iy=Math.floor(py),iz=Math.floor(pz);let m=9;
        for(let dz=-1;dz<=1;dz++)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const cx=ix+dx,cy=iy+dy,cz=iz+dz,c=(((cz%C)+C)%C*C+(((cy%C)+C)%C))*C+(((cx%C)+C)%C);
          const fx=cx+F[c*3]-px,fy=cy+F[c*3+1]-py,fz=cz+F[c*3+2]-pz,dd=fx*fx+fy*fy+fz*fz;if(dd<m)m=dd;}out[(z*S+y)*S+x]=1-Math.min(1,Math.sqrt(m));}return out;};
    const vn3=(C,seed)=>{const L=new Float32Array(C*C*C);let r=seed;for(let i=0;i<L.length;i++){r=Math.imul(r^(r>>>15),2246822519)+1013904223|0;L[i]=((r>>>0)%100000)/100000;}
      const out=new Float32Array(S*S*S),cs=S/C,g=(x,y,z)=>L[(((z%C)+C)%C*C+((y%C)+C)%C)*C+((x%C)+C)%C],sm=t=>t*t*(3-2*t);
      for(let z=0;z<S;z++)for(let y=0;y<S;y++)for(let x=0;x<S;x++){const px=x/cs,py=y/cs,pz=z/cs,ix=Math.floor(px),iy=Math.floor(py),iz=Math.floor(pz),u=sm(px-ix),v=sm(py-iy),w=sm(pz-iz);
        const a=g(ix,iy,iz)*(1-u)+g(ix+1,iy,iz)*u,b=g(ix,iy+1,iz)*(1-u)+g(ix+1,iy+1,iz)*u,c=g(ix,iy,iz+1)*(1-u)+g(ix+1,iy,iz+1)*u,e=g(ix,iy+1,iz+1)*(1-u)+g(ix+1,iy+1,iz+1)*u;
        out[(z*S+y)*S+x]=(a*(1-v)+b*v)*(1-w)+(c*(1-v)+e*v)*w;}return out;};
    const w4=worley(4,11),w8=worley(8,23),w16=worley(16,37),p4=vn3(4,5),p8=vn3(8,7),p16=vn3(16,9);
    for(let n=0;n<S*S*S;n++){const pf=p4[n]*0.55+p8[n]*0.3+p16[n]*0.15,wf=w4[n]*0.6+w8[n]*0.3+w16[n]*0.1;
      const pw=clamp((pf-(1-wf)*0.9)/(1-(1-wf)*0.9+1e-3),0,1);D[n*2]=clamp(pw*0.7+wf*0.45,0,1)*255;D[n*2+1]=clamp(w8[n]*0.6+w16[n]*0.4,0,1)*255;}
    scratch();const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_3D,t);gl.texImage3D(gl.TEXTURE_3D,0,gl.RG8,S,S,S,0,gl.RG,gl.UNSIGNED_BYTE,D);
    for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.REPEAT],[gl.TEXTURE_WRAP_T,gl.REPEAT],[gl.TEXTURE_WRAP_R,gl.REPEAT]])gl.texParameteri(gl.TEXTURE_3D,k,v);
    bindTU(TU.uNoise3,gl.TEXTURE_3D,t);bindTU(TU.uCloudMap,gl.TEXTURE_2D,tex2D(1,1,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(4)));
    Log.info(`cloud noise 64³ in ${(performance.now()-t0).toFixed(0)} ms`);}
};
