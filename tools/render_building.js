// Renders one building type from buildings/: node tools/render_building.js <name> <out.png|.jpg> [jsonOptions]
// Loads buildings/kit.js + buildings/<name>.js in a blank page, builds the model, renders 2400² and saves; .jpg is downsampled to 1200².
const { chromium } = require('playwright');const fs=require('fs'),path=require('path');
const [,,name,out,optJson]=process.argv;const dir=path.join(__dirname,'..','buildings');
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await b.newPage({viewport:{width:2400,height:2400}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
 await p.setContent('<!doctype html><html><body style="margin:0;background:#000"></body></html>');
 for(const f of ['kit.js',name+'.js'])await p.addScriptTag({content:fs.readFileSync(path.join(dir,f),'utf8')});
 if(errs.length){console.log('ERRORS\n'+errs.join('\n'));process.exit(1);}
 const r=await p.evaluate(([n,o])=>{try{const cam=KIT.build(n,o);const t0=performance.now();const r=KIT.render({...cam,...o});r.ms=Math.round(performance.now()-t0);return r;}catch(e){return{error:String(e.stack||e).slice(0,3000)};}},[name,optJson?JSON.parse(optJson):{}]);
 console.log(name,JSON.stringify(r));const png=out.replace(/\.jpg$/,'.png');await p.locator('#kit').screenshot({path:png,timeout:600000});await b.close();
 if(out.endsWith('.jpg'))require('child_process').execFileSync('python3',['-c',`from PIL import Image;Image.open('${png}').convert('RGB').resize((1200,1200),Image.LANCZOS).save('${out}',quality=92)`]);
 if(errs.length)console.log('ERRORS\n'+errs.join('\n'));})().catch(e=>{console.error('FAILED',e);process.exit(1);});
