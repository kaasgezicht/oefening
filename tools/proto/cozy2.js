// node cozy2.js <out.png> [jsonOptions] — renders the cozy cottage v2 prototype (standalone page)
const { chromium } = require('playwright');const fs=require('fs'),path=require('path');
const [,,outPng,optJson]=process.argv;const code=fs.readFileSync(path.join(__dirname,'cozy2_page.js'),'utf8');
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await b.newPage({viewport:{width:2400,height:2400}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
 await p.setContent('<!doctype html><html><body style="margin:0;background:#000"></body></html>');await p.addScriptTag({content:code});
 if(errs.length){console.log('ERRORS\n'+errs.join('\n'));process.exit(1);}
 const t0=Date.now();const r=await p.evaluate(o=>{try{return COZY.render(o);}catch(e){return{error:String(e.message||e).slice(0,3000)};}},optJson?JSON.parse(optJson):{});console.log('render',JSON.stringify(r),((Date.now()-t0)/1000).toFixed(1)+'s');
 await p.locator('#cel').screenshot({path:outPng,timeout:600000});if(errs.length)console.log('ERRORS\n'+errs.join('\n'));await b.close();})().catch(e=>{console.error('FAILED',e);process.exit(1);});
