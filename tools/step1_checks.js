// workshop unloading, wagon editor UI and goods-train save round trip. Usage: WS=2048 node tools/boot.js trein.html <out> tools/step1_checks.js
module.exports=async(p,out)=>{
 const r=await p.evaluate(()=>{const {Track,Net,App,Trains,Life,Build,P}=TREIN;const w=(Life.workshops||[])[0];if(!w)return{err:'no workshop'};P.money=1;Money.cash=200000;
   const sl=Life.sawSlots(w)[2],near=Build.makeSiding(sl.p[0],sl.p[1],sl.t);const st={id:Track.nextId++,sid:near.seg.id,t:near.t,name:'Shop'};Track.stations.push(st);Life.attachSawmill(st);Net.changed();App.trackChanged();
   const mk=()=>{const v=Trains.car('wood',0,20);v.fx=w.x+3000;v.fz=w.z;v.from='st:999';return v;};Trains.add({sid:near.seg.id,t:66,dir:1},[...Trains.consist(0,0),mk(),mk()]);P.craneSpeed=60;window.__st=st;return{kind:st.workshop?'workshop':'?',cash:Money.cash};});
 console.log('workshop setup',JSON.stringify(r));if(r.err)return;
 await p.waitForFunction(()=>Crane.F.some(q=>q.st===window.__st),null,{timeout:60000});
 for(let i=0;i<20;i++)await p.waitForTimeout(2500);
 console.log(await p.evaluate(()=>{const t=TREIN.Trains.list[0],c=[...Crane.S.values()][0];return `loads ${t.veh.filter(v=>v.ctype==='wood').map(v=>(v.n||0).toFixed(1)).join('/')} cash ${Math.round(Money.cash)} stacks ${c.stacks.join('')} yard ${c.yard} ph ${c.ph}`;}));
 // save round trip: the goods train keeps its wagons and their loads
 console.log(await p.evaluate(()=>{const s=snapshot(),t=s.trains[0];const before=JSON.stringify(TREIN.Trains.list[0].veh.map(v=>v.k+(v.ctype?':'+v.ctype+':'+(v.n||0).toFixed(1):'')));TREIN.Trains.load(s.trains);const after=JSON.stringify(TREIN.Trains.list[0].veh.map(v=>v.k+(v.ctype?':'+v.ctype+':'+(v.n||0).toFixed(1):'')));return 'save round trip '+(before===after?'OK ':'MISMATCH ')+after;}));
 // wagon editor
 await p.evaluate(()=>{TREIN.Drive.enter();TREIN.Drive.listOpen=true;TREIN.Trains.sel=0;TREIN.Drive.refresh();});await p.waitForTimeout(1500);
 const n0=await p.evaluate(()=>TREIN.Trains.list[0].veh.length);await p.click('#trainList .wed .wadd[title="Add a timber wagon"]');await p.waitForTimeout(800);
 const n1=await p.evaluate(()=>TREIN.Trains.list[0].veh.length);await p.screenshot({path:out+'/editor.png',timeout:120000});
 await p.click('#trainList .wed .wadd:last-child');await p.waitForTimeout(800);const n2=await p.evaluate(()=>TREIN.Trains.list[0].veh.length);
 console.log(`wagon editor: ${n0} -> add ${n1} -> remove ${n2}`);
};
