// renders style variants of the cottage: node cel6.js <trein.html> <outdir>
const { chromium } = require('playwright');const fs=require('fs'),path=require('path');
const [,,htmlPath,outDir]=process.argv;
const V=[
 ['1-brick-wood-shingles',{house:{wallCol:[0.70,0.36,0.26],wallMat:5,roof:'shingle',roofCol:[0.62,0.5,0.38],trim:[0.13,0.40,0.31]},moss:0.5}],
 ['2-fieldstone-slate',{house:{wallCol:[0.66,0.62,0.55],wallMat:8,chimCol:[0.62,0.58,0.52],chimMat:8,roof:'shingle',roofCol:[0.48,0.5,0.56],trim:[0.58,0.17,0.14],barge:[0.86,0.84,0.78]},moss:0.6}],
 ['3-half-timbered-tiles',{house:{wallCol:[0.94,0.89,0.77],wallMat:0,timber:true,roof:'tile',trim:[0.2,0.33,0.52]},moss:0}],
 ['4-thatch-brick-farmhouse',{house:{wallCol:[0.70,0.36,0.26],wallMat:5,roof:'thatch',roofCol:[0.95,0.8,0.5],ridgeCol:[0.34,0.31,0.22],trim:[0.13,0.40,0.31]},moss:0.5}],
 ['5-painted-planks',{house:{wallCol:[0.2,0.36,0.29],wallMat:6,roof:'shingle',roofCol:[0.46,0.42,0.38],trim:[0.93,0.92,0.88],barge:[0.95,0.94,0.9]},moss:0.35}],
 ['6-whitewashed-stone-thatch',{house:{wallCol:[0.92,0.9,0.84],wallMat:8,chimCol:[0.92,0.9,0.84],chimMat:8,roof:'thatch',roofCol:[0.92,0.79,0.53],ridgeCol:[0.3,0.33,0.22],trim:[0.24,0.42,0.62]},moss:0.8}]];
let html=fs.readFileSync(htmlPath,'utf8');html=html.replace(/\nboot\(\);\n<\/script>/,'\nwindow.__ready=1;\n</script>');
html=html.replace('</body>','<script>'+fs.readFileSync(path.join(__dirname,'cel_page.js'),'utf8')+'</script></body>');
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const [name,opt] of V){const p=await b.newPage({viewport:{width:2400,height:2400}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  await p.setContent(html,{waitUntil:'load'});await p.waitForFunction(()=>window.__ready&&window.CEL,null,{timeout:60000});
  const r=await p.evaluate(o=>CEL.render(o),{...opt,sun:[0.46,0.66,-0.6],ink:3.0});console.log(name,JSON.stringify(r),errs.join(' | '));
  await p.locator('#cel').screenshot({path:path.join(outDir,name+'.png'),timeout:300000});await p.close();}
 await b.close();})().catch(e=>{console.error('FAILED',e);process.exit(1);});
