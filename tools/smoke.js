#!/usr/bin/env node
'use strict';
// tools/smoke.js — a quick check of the whole game before every push (4.39.0). Headless Chromium with a software GPU, a phone-sized
// screen, a fresh 4 km Mountain-islands world. It checks, and fails (exit 1) on any page error or failed check:
//  1. the world loads; the bottom bar fits the screen and the stats line is off;
//  2. an airstrip can be built, the helicopter bought, flown from its helipad, and a mission taken;
//  3. a fishing boat can be taken out and steered; the Staggerwing flies;
//  4. save and load: the mission in progress and the boats' state come back.
// Pictures go to tools/out/ (not committed). Usage: node tools/smoke.js   (needs playwright: require('playwright') must resolve)
const { chromium } = require('playwright');const path=require('path'),fs=require('fs');
const OUT=path.join(__dirname,'out');fs.mkdirSync(OUT,{recursive:true});const ROOT=path.resolve(__dirname,'..');
(async()=>{const t0=Date.now(),fails=[],ok=(c,msg)=>{console.log((c?'  ok   ':'  FAIL ')+msg);if(!c)fails.push(msg);};
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:412,height:860},isMobile:true,hasTouch:true});
  await ctx.addInitScript(()=>{if(sessionStorage.getItem('smoke'))return;sessionStorage.setItem('smoke',1);localStorage.clear();
    localStorage.setItem('trein.save.v1',JSON.stringify({app:'Trein',saveVersion:2,build:'9',params:{worldSize:4096,mapStyle:'peaks',islandGen:2,landShare:0.6,seed:4242,worldFile:0,worldCache:0,autoRes:0,timeSpeed:0,money:1}}));});
  const p=await ctx.newPage(),errs=[];p.on('pageerror',e=>errs.push('page error: '+e.message+' '+(e.stack||'').split('\n')[1]));p.on('console',m=>{if(m.type()==='error'||/ ERR /.test(m.text()))errs.push(m.text().slice(0,300));});
  const ready=()=>p.waitForFunction(()=>window.TREIN&&TREIN.App.T&&!TREIN.App.busy&&typeof Coast!=='undefined'&&Coast.H,null,{timeout:900000});
  const shot=n=>p.screenshot({path:path.join(OUT,n+'.png'),timeout:300000});
  const frames=(n,dt)=>p.evaluate(([n,dt])=>{for(let i=0;i<n;i++){App.time+=dt;if(Plane.on)Plane.update(dt);Coast.update(dt);Cam.update(dt);}R.frame(Cam,App.time);},[n,dt||0.05]);
  try{
    console.log('1. loading');await p.goto('file://'+path.join(ROOT,'trein.html')+'?nomenu');await ready();console.log(`   world ready in ${((Date.now()-t0)/1000).toFixed(1)} s`);
    const lay=await p.evaluate(()=>{const W=innerWidth,bs=[...document.querySelectorAll('#bar button')].filter(e=>e.offsetParent);return{n:bs.length,out:bs.filter(e=>{const r=e.getBoundingClientRect();return r.left<0||r.right>W+0.5;}).map(e=>e.id),stats:!!+P.showStats}});
    ok(lay.n>0&&!lay.out.length,`bottom bar fits the screen (${lay.n} buttons${lay.out.length?', off screen: '+lay.out.join(','):''})`);ok(!lay.stats,'stats line off by default');
    ok(await p.evaluate(()=>Life.villages.length>0&&Coast.H.length>0),'villages and harbours exist');await shot('1-start');
    console.log('2. helicopter');
    const air=await p.evaluate(()=>{for(const v of Life.villages){Air.startPlace(v);if(Air.pl&&Air.check().ok)Air.confirm();else Air.cancel();if(Air.list.length)break;}return Air.list.length;});ok(air>0,'an airstrip was built');
    const h=await p.evaluate(()=>{Fleet.unlocks.heli=true;Rescue.resetPads();Plane.spawn(null,'heli');return{on:Plane.on,kind:Plane.kind,pads:Rescue.pads().length};});ok(h.on&&h.kind==='heli'&&h.pads>0,'helicopter on its helipad');
    await p.evaluate(()=>{Plane.ctl.thr=0.85;});await frames(160);const alt=await p.evaluate(()=>Plane.st.p[1]-Plane.groundAt(Plane.st.p[0],Plane.st.p[2]));ok(alt>8&&!(await p.evaluate(()=>Plane.crashed)),`helicopter climbs (${alt.toFixed(1)} m)`);
    const mis=await p.evaluate(()=>{Rescue.board(Rescue.nearestPad(Plane.st.p[0],Plane.st.p[2]));const o=Rescue.offers.find(q=>q.type==='supply')||Rescue.offers[0];if(!o)return null;Rescue.accept(o,Rescue._bp);document.querySelector('#rsBoard').hidden=true;return o.type;});
    ok(!!mis,'a mission was offered and accepted ('+mis+')');await shot('2-heli');await p.evaluate(()=>Plane.exit());
    console.log('3. boat and plane');
    const bt=await p.evaluate(()=>{const h=Coast.H.find(h=>h.boats.some(b=>b.st==='moor'));if(!h)return null;Fish.take(h);return!!Fish.drv;});ok(bt,'a fishing boat was taken out');
    if(bt){await p.evaluate(()=>{Fish.inp.thr=0.5;});await frames(60,0.1);const v=await p.evaluate(()=>Fish.drv.v);ok(v>0.5,`the boat moves (${v.toFixed(1)} m/s)`);await shot('3-boat');await p.evaluate(()=>Fish.leave());}
    await p.evaluate(()=>{for(let i=0;i<400;i++)Coast.update(1);});const out=await p.evaluate(()=>Coast.H.reduce((a,h)=>a+h.boats.filter(b=>b.st!=='moor').length,0));ok(out>0,`harbour boats go out fishing (${out} out)`);
    await p.evaluate(()=>{Plane.spawn(null,'stag');Plane.ctl.thr=1;});await frames(300);const sp=await p.evaluate(()=>{const r={V:Plane.V,crashed:Plane.crashed};Plane.exit();return r;});ok(sp.V>25&&!sp.crashed,`the Staggerwing takes off (${(sp.V*3.6).toFixed(0)} km/h)`);
    console.log('4. save and load');
    const before=await p.evaluate(()=>{const s=snapshot();localStorage.setItem('smoke.save',JSON.stringify(s));return{m:Rescue.m&&Rescue.m.type,boats:Coast.H.map(h=>h.boats.map(b=>b.st).join(',')).join('|')};});
    await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('smoke.save'));applySnapshot(s);App.camLoaded=true;App.generate(0);});await p.waitForTimeout(500);await ready();
    await p.evaluate(()=>{for(let i=0;i<3;i++)Coast.update(0.01);Rescue.revive();});
    const after=await p.evaluate(()=>({m:Rescue.m&&Rescue.m.type,boats:Coast.H.map(h=>h.boats.map(b=>b.st).join(',')).join('|')}));
    ok(after.m===before.m,`mission kept over save/load (${before.m} → ${after.m})`);ok(after.boats===before.boats,'fishing boats kept over save/load');await frames(1);await shot('4-loaded');
  }catch(e){fails.push('exception: '+e.message.split('\n')[0]);console.log('  FAIL '+e.message.split('\n')[0]);}
  for(const e of errs){fails.push(e);console.log('  ERROR '+e);}
  console.log(fails.length?`\n${fails.length} problem(s) — see tools/out/`:`\nsmoke test passed in ${((Date.now()-t0)/1000).toFixed(0)} s`);await b.close();process.exit(fails.length?1:0);})();
