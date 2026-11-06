// renders the cel-shaded cottage prototype: node cel.js <trein.html> <out.png> [jsonOptions]
const { chromium } = require('playwright');const fs=require('fs'),path=require('path');
const [,,htmlPath,outPng,optJson]=process.argv;
let html=fs.readFileSync(htmlPath,'utf8');html=html.replace(/\nboot\(\);\n<\/script>/,'\nwindow.__ready=1;\n</script>');
html=html.replace('</body>','<script>'+fs.readFileSync(path.join(__dirname,'cel_page.js'),'utf8')+'</script></body>');
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await b.newPage({viewport:{width:2400,height:2400}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
 await p.setContent(html,{waitUntil:'load'});await p.waitForFunction(()=>window.__ready&&window.CEL,null,{timeout:60000});
 const r=await p.evaluate(o=>CEL.render(o),optJson?JSON.parse(optJson):{});console.log('render',JSON.stringify(r));
 await p.locator('#cel').screenshot({path:outPng,timeout:300000});if(errs.length)console.log('ERRORS\n'+errs.join('\n'));await b.close();})().catch(e=>{console.error('FAILED',e);process.exit(1);});
