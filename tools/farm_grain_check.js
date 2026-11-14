// Farm grain station test: builds a station at farm side K (0-3) with a 01 + 5 grain hoppers and logs the arm/train loading cycle. Usage: node tools/farm_grain_check.js <outdir> K  (run from the repo root)
const { chromium } = require('playwright');const path=require('path');const S=process.argv[2],K=+(process.argv[3]||0);
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:900,height:700},deviceScaleFactor:1});
await ctx.addInitScript(()=>{try{localStorage.setItem('trein.save.v1',JSON.stringify({app:'Trein',saveVersion:2,params:{worldSize:4096,mapRes:0,seed:4711,preset:'medium',renderScale:0.6,shadowRes:1024,treeDist:1200,autoRes:0,showStats:0}}));}catch(e){}});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,300));});
await p.goto('file://'+path.resolve('trein.html'));await p.waitForFunction(()=>window.TREIN&&TREIN.App.T&&!TREIN.App.busy,null,{timeout:900000});
const info=await p.evaluate((K)=>{const {Life,Cam,P,Track,Net,App,Build,Trains}=TREIN;P.timeOfDay=11;P.weather='clear';P.season='summer';P.money=0;
 const vf=Life.villages.find(v=>v.farm);vf.farmOwned=true;Life.upgApplied(vf,'farm');const fm=vf.farm;window.__fm=fm;
 const sl=Life.sawSlots(fm)[K],H=sl.t,L=360,x0=sl.p[0]-Math.cos(H)*L/2,z0=sl.p[1]-Math.sin(H)*L/2,g=(x,z)=>TREIN.sampleH(App.T,x,z),y=g(sl.p[0],sl.p[1])+0.5;
 const a={id:Track.nextId++,x:x0,z:z0,y,h:H+Math.PI,g:0},bb={id:Track.nextId++,x:x0+Math.cos(H)*L,z:z0+Math.sin(H)*L,y,h:H,g:0};
 Track.nodes.push(a,bb);const sg={id:Track.nextId++,a:a.id,b:bb.id,x0,z0,h0:H,k:0,L,y0:y,y1:y,g0:0,g1:0,spans:[]};Track.segs.push(sg);Net.changed();App.trackChanged();
 const near=Net.nearestOnTrack(sl.p[0],sl.p[1],9);Track.stations.push({id:Track.nextId++,sid:near.seg.id,t:near.t,name:'x'});const st=Track.stations[Track.stations.length-1];Life.attachSawmill(st);Net.changed();App.trackChanged();Life.updateStations();
 const cons=[...Trains.consist(0,0),Trains.car('grain'),Trains.car('grain'),Trains.car('grain'),Trains.car('grain'),Trains.car('grain')];Trains.add({sid:sg.id,t:near.t-40,dir:1},cons);const tr=Trains.list[Trains.list.length-1];tr.auto=true;window.__tr=tr;window.__st=st;window.__log=[];{let gm=0;Object.defineProperty(tr,'grainMove',{get(){return gm;},set(v){if(v&&!gm){const f=Crane.F.find(q=>q.kind==='farm'),c=f&&Crane.cars(f);window.__log.push('move '+v.toFixed(1)+' cars '+(c?c.cars.map(q=>q.ax.toFixed(1)+':'+Math.round(q.w.n||0)).join(' '):'none')+' a0 '+(f&&f.tw?f.tw.a:'?'));}gm=v;}});}
 Goods.get('st:'+st.id).grain=60;window.__keep=setInterval(()=>{const G=Goods.get('st:'+st.id);if(G.grain<30)G.grain=60;},500);
 const si=Life.stInfo.find(q=>q.st===st);Cam.mode='free';Cam.target=[si.x+si.nx*6,si.y+3,si.z+si.nz*6];Cam.dist=55;Cam.pitch=0.45;Cam.yaw=Math.atan2(si.nz,si.nx)+Math.PI+0.5;
 const bn=document.getElementById('banner');if(bn)bn.hidden=true;App.setFF(4);return{st:JSON.stringify(st),veh:tr.veh.map(v=>v.k+':'+(v.ctype||'')).join(' '),tower:JSON.stringify((()=>{const t=Life.farmTower(fm);return{x:Math.round(t.x),z:Math.round(t.z),a:t.a,att:!!t.si};})())};},K);
console.log(JSON.stringify(info));
let shot=0;for(let k=0;k<45;k++){await p.waitForTimeout(4000);const r=await p.evaluate(()=>{const tr=window.__tr,C=Crane,s=C.S.get('st:'+window.__st.id)||{};return{status:tr.status,v:+(tr.v||0).toFixed(2),n:tr.veh.filter(v=>v.k==='wagon').map(v=>Math.round(v.n||0)).join(','),ph:s.ph,ax:s.ax===undefined?null:+s.ax.toFixed(1),stuck:s.stuck||null,atSt:tr.atSt,log:window.__log.splice(0).join(' | '),tgt:tr.stopTgt?+tr.stopTgt.rem.toFixed(1):null};});console.log(k,JSON.stringify(r));
 if(r.ph==='pour'&&shot<2){shot++;await p.screenshot({path:S+'/g_pour'+K+'_'+shot+'.png',timeout:300000});}
 if(r.n.split(",").filter(x=>+x>=20).length>=3)break;}
console.log(errs.slice(0,8));await b.close();})();
