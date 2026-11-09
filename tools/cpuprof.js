// JS CPU profile of the running game (Chrome DevTools protocol): the same town scene as tools/bench.js, played at normal speed for
// a while, plus timed building actions (village growth, roads rebuild, culverts, a station). Prints the functions with the most self
// time and the slowest single frames. Usage: node tools/cpuprof.js trein.html <outdir>     env: SECS=20
const { chromium } = require('playwright');const fs=require('fs'),path=require('path');
const [,,html,out]=process.argv;fs.mkdirSync(out,{recursive:true});const SECS=+(process.env.SECS||20);
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await b.newContext({viewport:{width:412,height:915},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 await ctx.addInitScript(()=>{try{localStorage.setItem('trein.save.v1',JSON.stringify({app:'Trein',saveVersion:2,params:{worldSize:8192,mapRes:0,seed:4711,preset:'medium',renderScale:0.5,msaa:0,shadowRes:2048,terrainLod:260,treeDist:3200,treeLod:520,bloom:0.45,nightLights:16,riverQ:1,autoRes:0}}));}catch(e){}});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push('pageerror: '+e.message));
 const top=(profile,n,title)=>{const self=new Map(),byId=new Map(profile.nodes.map(q=>[q.id,q]));const dt=profile.timeDeltas;let total=0;
   profile.samples.forEach((id,i)=>{const q=byId.get(id),f=q.callFrame,k=(f.functionName||'(anon)')+' '+(f.lineNumber+1);const d=(dt[i]||0)/1000;total+=d;self.set(k,(self.get(k)||0)+d);});
   console.log(`${title}: ${total.toFixed(0)} ms sampled; top self time:`);for(const [k,v] of [...self.entries()].sort((a,b)=>b[1]-a[1]).slice(0,n))console.log(`  ${(v/total*100).toFixed(1).padStart(5)}%  ${v.toFixed(0).padStart(6)} ms  ${k}`);};
 // loading: profile from the first line of script until the world is ready
 const cdp0=await ctx.newCDPSession(p);await cdp0.send('Profiler.enable');await cdp0.send('Profiler.setSamplingInterval',{interval:500});await cdp0.send('Profiler.start');
 const tl=Date.now();await p.goto('file://'+path.resolve(html));await p.waitForFunction(()=>window.TREIN&&TREIN.App.T&&!TREIN.App.busy,null,{timeout:900000});
 {const {profile}=await cdp0.send('Profiler.stop');fs.writeFileSync(out+'/load.cpuprofile',JSON.stringify(profile));console.log('load',((Date.now()-tl)/1000).toFixed(1),'s');top(profile,25,'loading');
  const lg=await p.evaluate(()=>TREIN.Log.text?TREIN.Log.text().split('\n').filter(l=>/ms|built|took| s\b/.test(l)).slice(0,60).join('\n'):'');console.log(lg);}
 const cdpA=await ctx.newCDPSession(p);await cdpA.send('Profiler.enable');await cdpA.send('Profiler.setSamplingInterval',{interval:200});await cdpA.send('Profiler.start');
 await p.evaluate(()=>{const gl=document.querySelector('#gl').getContext('webgl2'),o=gl.texSubImage2D.bind(gl),o2=gl.texImage2D.bind(gl);window.__upA=new Map();const wrap=(f,nm)=>function(...a){const t=performance.now();const r=f(...a);const dt=performance.now()-t,st=(new Error().stack||'').split('\n')[2]||'',k=nm+' '+st.trim().replace(/\(.*\/(trein|b\d)\.html/,'(').slice(0,80);const e=window.__upA.get(k)||{n:0,ms:0};e.n++;e.ms+=dt;window.__upA.set(k,e);return r;};gl.texSubImage2D=wrap(o,'sub');gl.texImage2D=wrap(o2,'img');gl.bufferData=wrap(gl.bufferData.bind(gl),'buf');gl.bufferSubData=wrap(gl.bufferSubData.bind(gl),'bsub');});
 // timed actions (each one is what a player triggers; their time is a hitch on the phone, ~3-5x slower than here)
 const acts=await p.evaluate(()=>{const {Track,Net,App,Life,Build,P,Trains}=TREIN;const T={},tm=(k,f)=>{const t=performance.now();f();T[k]=+(performance.now()-t).toFixed(1);};
   P.timeOfDay=10.2;P.weather='clear';P.people=3;
   const v=Life.villages[0];const H=0.6,L=620;const x0=v.x-Math.cos(H)*L/2+40,z0=v.z-Math.sin(H)*L/2+40;const g=(x,z)=>TREIN.sampleH(App.T,x,z);const y=Math.max(g(x0,z0),g(x0+Math.cos(H)*L,z0+Math.sin(H)*L))+0.5;
   const a={id:Track.nextId++,x:x0,z:z0,y,h:H+Math.PI,g:0},b={id:Track.nextId++,x:x0+Math.cos(H)*L,z:z0+Math.sin(H)*L,y,h:H,g:0};
   tm('track (trackChanged)',()=>{Track.nodes.push(a,b);const sg={id:Track.nextId++,a:a.id,b:b.id,x0,z0,h0:H,k:0,L,y0:y,y1:y,g0:0,g1:0,spans:[]};Track.segs.push(sg);Net.changed();App.trackChanged();window.__sg=sg;});
   tm('station (placeStation)',()=>{Build.placeStation({sid:window.__sg.id,t:200,len:44,side:Build.stSide(window.__sg.id,200)});Life.updateStations();});
   const si0=Life.stInfo[0];
   tm('grow village (growNow)',()=>Life.growNow(si0.v));tm('grow village again',()=>Life.growNow(si0.v));
   tm('applyCulverts(all)',()=>Life.applyCulverts(null));
   tm('rebuildRoads',()=>Life.rebuildRoads());
   tm('kitInst (forced)',()=>{Life.kitDirty=true;Life.kitCP=null;Life.kitInst(n=>new Float32Array(Math.max(1,n)*8));});
   tm('second track (addTwin)',()=>{Build.addTwin(Track.stations[0]);Life.updateStations();});
   const c1=Trains.consist(2,0),L1=Trains.length(c1),st=Track.stations[0];Trains.add({sid:st.sid,t:st.t+L1/2-6,dir:1},c1);
   window.__si=Life.stInfo.find(q=>q.st===st);App.setFF(1);return T;});
 console.log('actions (ms):',JSON.stringify(acts,null,1));
 {const {profile}=await cdpA.send('Profiler.stop');top(profile,25,'building actions');console.log('uploads during actions:\n'+await p.evaluate(()=>[...window.__upA.entries()].sort((a,b)=>b[1].ms-a[1].ms).slice(0,10).map(([k,e])=>`${e.ms.toFixed(0).padStart(7)} ms ${String(e.n).padStart(4)}×  ${k}`).join('\n')));}
 await p.evaluate(()=>{const {Cam}=TREIN,si=window.__si;Cam.mode='free';Cam.target=[si.x+si.nx*2,si.y+1.5,si.z+si.nz*2];Cam.dist=70;Cam.pitch=0.42;Cam.yaw=Math.atan2(si.nz,si.nx)+0.7;
   window.__fr=[];let last=performance.now();const tick=()=>{const t=performance.now();window.__fr.push(t-last);last=t;if(window.__fr.length<100000)requestAnimationFrame(tick);};requestAnimationFrame(tick);});
 // count texture uploads by caller while it plays (each one is a CPU→GPU copy; big ones stall a frame)
 await p.evaluate(()=>{const gl=document.querySelector('#gl').getContext('webgl2'),o=gl.texSubImage2D.bind(gl);window.__up=new Map();
   gl.texSubImage2D=function(...a){const t=performance.now();const r=o(...a);const dt=performance.now()-t,st=(new Error().stack||'').split('\n')[2]||'',k=st.trim().replace(/\(.*\/(trein|b\d)\.html/,'(').slice(0,90),px=(a[4]||0)*(a[5]||0);const e=window.__up.get(k)||{n:0,ms:0,px:0};e.n++;e.ms+=dt;e.px+=px;window.__up.set(k,e);return r;};});
 await p.waitForTimeout(8000);
 const cdp=await ctx.newCDPSession(p);await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:200});await cdp.send('Profiler.start');
 await p.waitForTimeout(SECS*1000);
 const {profile}=await cdp.send('Profiler.stop');fs.writeFileSync(out+'/town.cpuprofile',JSON.stringify(profile));
 top(profile,30,'town, playing');
 const up=await p.evaluate(()=>[...window.__up.entries()].sort((a,b)=>b[1].ms-a[1].ms).slice(0,12).map(([k,e])=>`${e.ms.toFixed(0).padStart(7)} ms ${String(e.n).padStart(4)}× ${(e.px/1e6).toFixed(1).padStart(6)} Mpx  ${k}`).join('\n'));console.log('texture uploads while playing:\n'+up);
 const fr=await p.evaluate(()=>{const a=window.__fr.slice(30).sort((x,y)=>x-y);return{n:a.length,med:a[a.length>>1],p95:a[Math.floor(a.length*0.95)],max:a[a.length-1],perf:TREIN.App.perf.cpu};});
 console.log('frames',JSON.stringify(fr));console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'no errors');await b.close();})().catch(e=>{console.error('FAILED',e);process.exit(1);});
