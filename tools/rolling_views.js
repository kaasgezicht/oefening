// Renders the 01 + tender (+3 grain hoppers unless NOHOP=1) on a flat dry stretch from given views. Usage: node tools/rolling_views.js <outdir> '[[name,alongX,yawOff,pitch,dist,height],...]'  env CAB=1 adds cab views. Run from the repo root.
const { chromium } = require('playwright');const path=require('path');const S=process.argv[2],VIEWS=JSON.parse(process.argv[3]||'null');
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1000,height:640},deviceScaleFactor:1});
await ctx.addInitScript(()=>{try{localStorage.setItem('trein.save.v1',JSON.stringify({app:'Trein',saveVersion:2,params:{worldSize:2048,mapRes:0,seed:4711,preset:'medium',renderScale:1,shadowRes:2048,treeDist:600,autoRes:0,showStats:0}}));}catch(e){}});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,400));});
await p.goto('file://'+path.resolve('trein.html'));await p.waitForFunction(()=>window.TREIN&&TREIN.App.T&&!TREIN.App.busy,null,{timeout:900000});
await p.addStyleTag({content:'body>*:not(#gl){visibility:hidden!important}#gl{visibility:visible!important}'});
const r=await p.evaluate((process_env_NOHOP)=>{const {Track,Net,App,Trains,P}=TREIN;P.timeOfDay=11;P.weather='clear';P.season='summer';P.timeSpeed=0;
 const T=App.T,W=T.W;let best=null;for(let k=0;k<400;k++){const x=200+Math.random()*(W-400),z=200+Math.random()*(W-400),H=Math.random()*6.28,L=160;let mn=1e9,mx=-1e9,wet=false;for(let t=0;t<=L;t+=10){const px=x+Math.cos(H)*t,pz=z+Math.sin(H)*t,h=TREIN.sampleH(T,px,pz);for(const o of [-30,0,30]){const qx=px-Math.sin(H)*o,qz=pz+Math.cos(H)*o,i=Math.floor(qx/T.cs),j=Math.floor(qz/T.cs),n=j*T.N+i;if(T.water[n*4+3]>0)wet=true;}mn=Math.min(mn,h);mx=Math.max(mx,h);}
   const sc=mx-mn+(wet?100:0);if(!best||sc<best.sc)best={x,z,H,L,sc,y:mx+0.3};}
 const {x,z,H,L,y}=best;const a={id:Track.nextId++,x,z,y,h:H+Math.PI,g:0},bb={id:Track.nextId++,x:x+Math.cos(H)*L,z:z+Math.sin(H)*L,y,h:H,g:0};Track.nodes.push(a,bb);
 const sg={id:Track.nextId++,a:a.id,b:bb.id,x0:x,z0:z,h0:H,k:0,L,y0:y,y1:y,g0:0,g1:0,spans:[]};Track.segs.push(sg);Net.changed();App.trackChanged();
 const veh=process_env_NOHOP?[...Trains.locoPair('01')]:[...Trains.locoPair('01'),Trains.car('grain',0,20),Trains.car('grain',0,10),Trains.car('grain',0,0)];Trains.add({sid:sg.id,t:110,dir:1},veh);const tr=Trains.list[Trains.list.length-1];window.__tr=tr;
 App.hold=true;return{sc:best.sc,n:Trains.list.length,len:Trains.length(veh)};},!!process.env.NOHOP);
console.log(JSON.stringify(r));
const views=VIEWS||[['side',0,1.62,0.08,16,2],['front3q',4,0.7,0.12,15,4],['rear3q',-14,2.4,0.3,22,3],['hopper',-26,1.35,0.25,14,2.5],['top',-26,0.9,1.0,18,3],['gear',0,1.35,0.02,7,1.2]];
for(const [n,ax,yaw,pitch,d,ty] of views){for(const dd of (n==='gear'?[0,0.785,1.571,2.356]:[0])){await p.evaluate(([ax,yaw,pitch,d,ty,dd])=>{const {Cam,R}=TREIN,tr=window.__tr,P0=tr.poses[0],X=P0.X,m=P0.m;tr.dist=dd;
  Cam.mode='free';Cam.anim=null;Cam.target=[P0.c[0]+X[0]*ax,P0.c[1]+ty,P0.c[2]+X[2]*ax];const gy=P0.c[1]+ty;Cam.ground=()=>gy;Cam.dist=d;Cam.pitch=pitch;{const h=Math.atan2(X[2],X[0])+yaw;Cam.yaw=Math.atan2(Math.cos(h),Math.sin(h));}R.benchFrame(1234.5,false);},[ax,yaw,pitch,d,ty,dd]);
 await p.screenshot({path:`${S}/l_${n}${dd?'_'+dd:''}.png`,timeout:300000});}}
if(process.env.CAB){await p.evaluate(()=>{const {Cam,R,Trains}=TREIN;Trains.sel=Trains.list.indexOf(window.__tr);Cam.mode='cab';Cam.lookYaw=0;Cam.lookPitch=0;R.benchFrame(1234.5,false);const t=window.__tr,P0=t.poses[0],m=P0.m,d=[Cam.pos[0]-m[12],Cam.pos[1]-m[13],Cam.pos[2]-m[14]];window.__dbg=[d[0]*m[0]+d[1]*m[1]+d[2]*m[2],d[0]*m[4]+d[1]*m[5]+d[2]*m[6],d[0]*m[8]+d[1]*m[9]+d[2]*m[10]].map(v=>+v.toFixed(2)).join(',')+' fwd '+Cam.fwd.map(v=>v.toFixed(2))+' X '+P0.X.map(v=>v.toFixed(2))+' near '+(Cam.near||'?');});console.log(await p.evaluate(()=>window.__dbg));await p.screenshot({path:S+'/l_cab.png',timeout:300000});
 await p.evaluate(()=>{const {Cam,R}=TREIN;Cam.lookYaw=1.2;R.benchFrame(1234.5,false);});await p.screenshot({path:S+'/l_cab2.png',timeout:300000});}
console.log(errs.slice(0,6).join('\n')||'no errors');await b.close();})();
