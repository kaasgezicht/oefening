// Benchmark + image capture for optimisation work. Boots an 8 km world at Pixel 9a size (412×915 css px, DPR 2.625) on the
// Medium preset, grows a town with a grand station, two trains and passengers, lets it run, then holds the game loop and renders
// fixed camera views at a fixed time (R.benchFrame): GPU time per pass (timer queries) and the JS time per pass and a screenshot of the canvas only.
// Usage: node tools/bench.js trein.html <outdir> [label]      env: VIEWS=town,street (subset), REPS=3, SET='{"param":value}',
//   DSF=1 (lower resolution for timing runs), K=5 frames per timing, ABLATE=1 (cost of each category by leaving it out), WARM=ms
// Compare two runs with: python3 tools/imgdiff.py <outA> <outB>
const { chromium } = require('playwright');const fs=require('fs'),path=require('path');
const [,,html,out,label]=process.argv;fs.mkdirSync(out,{recursive:true});
const REPS=+(process.env.REPS||3),SET=process.env.SET?JSON.parse(process.env.SET):{},ONLY=process.env.VIEWS?process.env.VIEWS.split(','):null;
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await b.newContext({viewport:{width:412,height:915},deviceScaleFactor:+(process.env.DSF||2.625),isMobile:true,hasTouch:true});
 await ctx.addInitScript(()=>{try{localStorage.setItem('trein.save.v1',JSON.stringify({app:'Trein',saveVersion:2,params:{worldSize:8192,mapRes:0,seed:4711,preset:'medium',renderScale:0.7,msaa:0,shadowRes:2048,terrainLod:260,treeDist:3200,treeLod:520,bloom:0.45,nightLights:16,riverQ:1,autoRes:0,showStats:0}}));}catch(e){}});
 const p=await ctx.newPage();const errs=[];
 p.on('pageerror',e=>errs.push('pageerror: '+e.message));p.on('console',m=>{const t=m.text();if(m.type()==='error'||/ERR/.test(t))errs.push(m.type()+': '+t.slice(0,300));});
 const t0=Date.now();await p.goto('file://'+path.resolve(html));
 await p.waitForFunction(()=>window.TREIN&&TREIN.App.T&&!TREIN.App.busy,null,{timeout:900000});
 const boot=(Date.now()-t0)/1000;
 await p.addStyleTag({content:'body>*:not(#gl){visibility:hidden!important}#gl{visibility:visible!important}'});
 // the scene: a long straight line through the first village, a grand station with a second track, two trains standing with passengers
 const setup=await p.evaluate((SET)=>{const {Track,Net,App,Life,Build,P,Trains}=TREIN;P.timeOfDay=10.2;P.weather='clear';P.season='summer';P.people=3;P.timeSpeed=0;
   for(const k in SET)P[k]=SET[k];
   const v=Life.villages[0];const H=0.6,L=620;const x0=v.x-Math.cos(H)*L/2+40,z0=v.z-Math.sin(H)*L/2+40;
   const g=(x,z)=>TREIN.sampleH(App.T,x,z);const y=Math.max(g(x0,z0),g(x0+Math.cos(H)*L,z0+Math.sin(H)*L))+0.5;
   const a={id:Track.nextId++,x:x0,z:z0,y,h:H+Math.PI,g:0},b={id:Track.nextId++,x:x0+Math.cos(H)*L,z:z0+Math.sin(H)*L,y,h:H,g:0};
   Track.nodes.push(a,b);const sg={id:Track.nextId++,a:a.id,b:b.id,x0,z0,h0:H,k:0,L,y0:y,y1:y,g0:0,g1:0,spans:[]};Track.segs.push(sg);Net.changed();App.trackChanged();
   Build.placeStation({sid:sg.id,t:200,len:44,side:Build.stSide(sg.id,200)});Life.updateStations();const st=Track.stations[0];
   const si0=Life.stInfo[0];Life.growNow(si0.v);Life.growNow(si0.v);for(const w of Life.villages)if(w!==si0.v){Life.addGrowth(w,400);}Life.updateStations();Build.addTwin(st);Life.updateStations();
   const tw=Track.stations.find(q=>q.twinOf===st.id);
   const c1=Trains.consist(2,0),L1=Trains.length(c1);Trains.add({sid:st.sid,t:st.t+L1/2-6,dir:1},c1);const t1=Trains.list[Trains.list.length-1];t1.auto=false;t1.pax=Array.from({length:14},()=>({dest:st.id}));
   if(tw){const c2=Trains.consist(2,0),L2=Trains.length(c2),s2=Track.segs.find(q=>q.id===tw.sid);Trains.add({sid:tw.sid,t:Math.min(tw.t+L2/2-6,s2.L-0.5),dir:1},c2);const t2=Trains.list[Trains.list.length-1];t2.auto=false;t2.pax=Array.from({length:14},()=>({dest:tw.id}));}
   const si=Life.stInfo.find(q=>q.st===st);window.__si=si;const bn=document.getElementById('banner');if(bn)bn.hidden=true;
   P.renderScale=0.35;App.setFF(4);return{village:v.name,houses:Life.houses.length,grand:!!st.grand,twin:!!tw};},SET);
 // let people walk out and about (low resolution while it runs, the views are rendered at the real setting afterwards)
 await p.waitForTimeout(+(process.env.WARM||45000));
 await p.evaluate(()=>{const {App,P}=TREIN;App.setFF(1);P.renderScale=0.7;App.hold=true;});
 const VIEWS={
   town:{d:70,pitch:0.42,yaw:0.7,at:[-4,2]},        // the grand station and the town behind it
   street:{d:34,pitch:0.24,yaw:2.4,vil:true},       // low in the village: lots of buildings in front of each other
   platform:{d:18,pitch:0.32,yaw:1.25,at:[6,3.5]},  // along the platform among people
   overview:{d:320,pitch:0.62,yaw:1.2,at:[0,30]},   // the village from above
   wide:{d:1600,pitch:0.42,yaw:0.4,at:[0,0]}};      // the landscape
 // CMP='{"param":value,...}': every view is rendered twice in the same session (same people, same everything): first with CMP's settings
 // (folder <out>/A), then with the current ones (folder <out>/B); compare with: python3 tools/imgdiff.py <out>/A <out>/B
 const CMP=process.env.CMP?JSON.parse(process.env.CMP):null,cfgs=CMP?[['A',CMP],['B',null]]:[['',null]];
 const resBy={};for(const [cn] of cfgs)resBy[cn]={label:(label||'')+(cn?' '+cn:''),boot,setup,views:{}};
 for(const [nm,v] of Object.entries(VIEWS)){if(ONLY&&!ONLY.includes(nm))continue;
  for(const [cn,cfg] of cfgs){const res=resBy[cn],od=cn?out+'/'+cn:out;fs.mkdirSync(od,{recursive:true});
   const saved=await p.evaluate(cfg=>{const P=TREIN.P,o={};if(cfg)for(const k in cfg){o[k]=P[k];P[k]=cfg[k];}return o;},cfg);
   await p.evaluate(v=>{const {Cam}=TREIN,si=window.__si;const vg=si.v,t=v.vil?[vg.x,TREIN.sampleH(TREIN.App.T,vg.x,vg.z)+1.5,vg.z]:[si.x+si.nx*v.at[1]+si.dx*v.at[0],si.y+1.5,si.z+si.nz*v.at[1]+si.dz*v.at[0]];Cam.mode='free';Cam.anim=null;Cam.target=t;Cam.dist=v.d;Cam.pitch=v.pitch;Cam.yaw=Math.atan2(si.nz,si.nx)+v.yaw;},v);
   // each frame: CPU time of the JS per pass, then the GPU time per pass from timer queries (polled until the GPU has them)
   const runs=[];for(let k=0;k<REPS+1;k++){const f=await p.evaluate(()=>TREIN.R.benchFrame(1234.5,true));let g=null;if(process.env.GPUQ)for(let w=0;w<600&&!g;w++){await p.waitForTimeout(50);g=await p.evaluate(()=>TREIN.R.benchRead());}f.gpu=g||{};runs.push(f);}
   const r=runs.slice(1);const med=a=>{a=a.slice().sort((x,y)=>x-y);return a[a.length>>1];};
   const passes={},cpu={};for(const k of Object.keys(r[0].gpu))passes[k]=+med(r.map(q=>q.gpu[k]||0)).toFixed(2);for(const k of Object.keys(r[0].cpu))cpu[k]=+med(r.map(q=>q.cpu[k]||0)).toFixed(2);
   const gpuT=+Object.values(passes).reduce((a,b)=>a+b,0).toFixed(1),cpuT=+med(r.map(q=>q.ms)).toFixed(1);
   res.views[nm]={ms:gpuT,cpuMs:cpuT,draws:r[0].draws,tris:r[0].tris,objs:r[0].objs,chunks:r[0].chunks,passes,cpu};
   // the frame's real GPU cost: K frames between two GPU fences, and with ABLATE=1 the same with each category left out (its cost = the difference)
   const K=+(process.env.K||5),thr=async sk=>p.evaluate(async([sk,K])=>{TREIN.R.skip=sk;const v=await TREIN.R.benchThroughput(1234.5,K);TREIN.R.skip={};return v;},[sk,K]);
   const base=[];for(let k=0;k<3;k++)base.push(await thr({}));res.views[nm].frameMs=+med(base).toFixed(1);res.views[nm].frameSpread=[+Math.min(...base).toFixed(1),+Math.max(...base).toFixed(1)];
   if(process.env.ABLATE){const ab={};for(const c of ['shadow','terrain','track','vehicles','veg','life','kit','sky','water','streams','clouds','mist']){const a2=[];for(let k=0;k<2;k++)a2.push(await thr({[c]:1}));ab[c]=+(res.views[nm].frameMs-Math.min(...a2)).toFixed(1);}res.views[nm].ablate=ab;}
   await p.evaluate(()=>TREIN.R.benchFrame(1234.5,false));
   await p.screenshot({path:`${od}/${nm}.png`,timeout:300000});await p.evaluate(o=>{const P=TREIN.P;for(const k in o)P[k]=o[k];},saved);
   const vv=res.views[nm];console.log(nm,'frame',vv.frameMs,'ms',JSON.stringify(vv.frameSpread),'draws',vv.draws,'tris',(vv.tris/1e6).toFixed(2)+'M',vv.ablate?'ablate '+JSON.stringify(vv.ablate):'',cn);}}
 for(const [cn] of cfgs){const res=resBy[cn];res.errors=errs;fs.writeFileSync((cn?out+'/'+cn:out)+'/bench.json',JSON.stringify(res,null,1));}
 console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'no errors');await b.close();})().catch(e=>{console.error('FAILED',e);process.exit(1);});
