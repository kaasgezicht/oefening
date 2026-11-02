// upgrades, a mine station filling ore hoppers, bank acceptance, docks and steamboat, castle stops. WS=2048 node tools/boot.js trein.html <out> tools/step2_checks.js
module.exports=async(p,out)=>{
 const r=await p.evaluate(()=>{const {Track,Net,App,Trains,Life,Build,P}=TREIN;P.money=1;Money.cash=200000;const V=Life.villages;
   const ups=V.map(v=>v.name+':'+Object.keys(Life.UPG).map(k=>k+'='+Life.upgState(v,k)).join(',')).join(' | ');
   const mines=(Life.mines||[]).map(m=>m.type+'@'+m.v.name).join(', ');const m=(Life.mines||[])[0];if(!m)return{ups,mines,err:'no mine'};
   const v=m.v;v.level=1;v.trans=60;const before=Money.cash;Life.buyUpg(v,'mine');const paid=before-Money.cash;
   const sl=Life.sawSlots(m)[1],near=Build.makeSiding(sl.p[0],sl.p[1],sl.t);const st={id:Track.nextId++,sid:near.seg.id,t:near.t,name:'Mine'};Track.stations.push(st);Life.attachSawmill(st);Net.changed();App.trackChanged();
   Trains.add({sid:near.seg.id,t:68,dir:1},[...Trains.consist(0,0),Trains.car(m.type),Trains.car(m.type),Trains.car('wood')]);Goods.get('st:'+st.id)[m.type]=60;P.craneSpeed=30;window.__st=st;window.__m=m;
   // bank: a town takes ore once the bank is bought
   const tv=V.find(q=>q.houses.some(h=>h.bank));let bank='no bank house';if(tv){Life.growNow(tv);Life.growNow(tv);const a0=Goods.accepts(tv,m.type);tv.trans=99;Life.buyUpg(tv,'bank');bank=`${tv.name} level ${tv.level} accepts before ${a0} after ${Goods.accepts(tv,m.type)} state ${Life.upgState(tv,'bank')}`;}
   // docks: buy the docks of every village on the first steamer lake
   const sm=(Life.steamers||[])[0];let dock='no steamer lake';if(sm){for(const d of sm.docks){d.v.trans=99;d.v.level=Math.max(1,d.v.level|0);Life.buyUpg(d.v,'docks');}dock=`${sm.docks.length} docks on the lake, owned ${sm.docks.filter(d=>d.v.docksOwned).length}`;}
   return{ups,mines,mineState:Life.upgState(v,'mine'),paid,att:JSON.stringify(st.mine||null),bank,dock,castles:Life.castleList().length};});
 console.log('step2 setup',JSON.stringify(r,null,1));if(r.err)return;
 await p.waitForFunction(()=>Crane.F.some(q=>q.st===window.__st),null,{timeout:60000});
 await p.evaluate(()=>{const f=Crane.F.find(q=>q.st===window.__st),w=Crane.toW(f,0,4,-6),{Cam}=TREIN;Cam.setMode('free');Cam.target=w;Cam.dist=44;Cam.pitch=0.3;Cam.yaw=Math.atan2(f.Z[1],f.Z[0])+0.5;});
 for(let i=0;i<16;i++){await p.waitForTimeout(2500);if(i%5===4)console.log(await p.evaluate(()=>{const t=TREIN.Trains.list[0],c=[...Crane.S.values()].find(q=>q.ph!==undefined);return `loads ${t.veh.filter(v=>v.k==='wagon').map(v=>v.ctype+':'+(v.n||0).toFixed(1)).join(' ')} hold ${Crane.holds(t)} ${Crane.what(t)} stock ${Goods.get('st:'+window.__st.id)[window.__m.type].toFixed(1)} steamerOff ${(TREIN.Life.steamers||[]).map(s=>s.off).join(',')}`;}));}
 await p.setViewportSize({width:900,height:640});await p.waitForTimeout(2500);await p.screenshot({path:out+'/orestation.png',timeout:120000});
 await p.evaluate(()=>{const t=TREIN.Trains.list[0],i=t.veh.findIndex(v=>v.ctype===window.__m.type),m=t.poses[i].m,{Cam}=TREIN,f=Crane.F.find(q=>q.st===window.__st);Cam.target=[m[12],m[13]+2,m[14]];Cam.dist=17;Cam.pitch=0.3;Cam.yaw=Math.atan2(f.Z[1],f.Z[0])+0.35;});await p.waitForTimeout(2500);await p.screenshot({path:out+'/orewagon.png',timeout:120000});
 await p.evaluate(()=>{const m=window.__m,{Cam}=TREIN;Cam.target=[m.x,m.y+4,m.z];Cam.dist=60;Cam.pitch=0.45;Cam.yaw=m.rot+2.2;});await p.waitForTimeout(3000);await p.screenshot({path:out+'/mine.png',timeout:120000});
 await p.evaluate(()=>{TREIN.Life.villages.forEach(v=>{});VillageUI.open(window.__m.v);});await p.waitForTimeout(800);await p.setViewportSize({width:412,height:915});await p.waitForTimeout(1500);await p.screenshot({path:out+'/panel.png',timeout:120000});
};
