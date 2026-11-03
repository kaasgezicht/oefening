// Boots Trein headless at phone size (1 km world), waits for the world, runs an optional script, prints errors.
// Usage: node tools/boot.js trein.html <outdir> [tools/e2e.js]
const { chromium } = require('playwright');const fs=require('fs'),path=require('path');
const [,,html,out,scriptFile]=process.argv;fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await b.newContext({viewport:{width:412,height:915},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 await ctx.addInitScript(([ws,mr])=>{try{if(!localStorage.getItem('trein.save.v1'))localStorage.setItem('trein.save.v1',JSON.stringify({app:'Trein',saveVersion:2,params:{worldSize:ws,mapRes:mr,renderScale:0.5,msaa:0,cloudQuality:1,mistQuality:1}}));}catch(e){}},[+(process.env.WS||1024),+(process.env.MR||256)]);
 const p=await ctx.newPage();const errs=[];
 p.on('pageerror',e=>errs.push('pageerror: '+e.message+'\n'+(e.stack||'').split('\n').slice(0,3).join('\n')));p.on('console',m=>{const t=m.text();if(m.type()==='error'||/ERR|WRN/.test(t))errs.push(m.type()+': '+t.slice(0,300));});
 const t0=Date.now();await p.goto('file://'+path.resolve(html));
 await p.waitForFunction(()=>window.TREIN&&TREIN.App.T&&!TREIN.App.busy,null,{timeout:600000});
 console.log('world ready in',((Date.now()-t0)/1000).toFixed(1),'s');
 await p.waitForTimeout(1500);await p.screenshot({path:out+'/boot.png',timeout:120000});
 if(scriptFile){const fn=require(path.resolve(scriptFile));await fn(p,out);}
 const log=await p.evaluate(()=>TREIN.Log.text?TREIN.Log.text():'');fs.writeFileSync(out+'/log.txt',log);
 console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'no errors');
 const wl=log.split('\n').filter(l=>/ERR|WRN/.test(l));if(wl.length)console.log('log warnings/errors:\n'+wl.slice(0,20).join('\n'));
 await b.close();})().catch(e=>{console.error('FAILED',e);process.exit(1);});
