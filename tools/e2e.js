// lay a straight line by a village with two stations, add a passenger train and a goods train, run the clock, screenshot the scene
module.exports=async(p,out)=>{
 const r=await p.evaluate(()=>{const {Track,Net,App,Trains,Life,Build,Cam,P}=TREIN;
   const v=Life.villages[0];const H=0.6,L=420;const x0=v.x-Math.cos(H)*L/2+40,z0=v.z-Math.sin(H)*L/2+40;
   const g=(x,z)=>App.T?sampleH(App.T,x,z):0;const y=Math.max(g(x0,z0),g(x0+Math.cos(H)*L,z0+Math.sin(H)*L))+0.5;
   const a={id:Track.nextId++,x:x0,z:z0,y,h:H+Math.PI,g:0},b={id:Track.nextId++,x:x0+Math.cos(H)*L,z:z0+Math.sin(H)*L,y,h:H,g:0};
   Track.nodes.push(a,b);const sg={id:Track.nextId++,a:a.id,b:b.id,x0,z0,h0:H,k:0,L,y0:y,y1:y,g0:0,g1:0,spans:[]};Track.segs.push(sg);
   Track.stations.push({id:Track.nextId++,sid:sg.id,t:80,name:'Oost'},{id:Track.nextId++,sid:sg.id,t:340,name:'West'});Net.changed();App.trackChanged();
   Trains.add({sid:sg.id,t:200,dir:1},Trains.consist(3,0));const t=Trains.list[0];if(t){t.auto=true;t.rev=1;t.autoKmh=40;}
   Trains.add({sid:sg.id,t:400,dir:1},Trains.goodsConsist(2));
   P.timeSpeed=120;Cam.setMode('free');Cam.target=[x0+Math.cos(H)*120,y,z0+Math.sin(H)*120];Cam.dist=90;Cam.pitch=0.35;Cam.yaw=H+1.9;
   return{trains:Trains.list.length,y};});
 console.log('e2e setup',JSON.stringify(r));
 for(let i=0;i<12;i++){await p.waitForTimeout(2500);}
 await p.screenshot({path:out+'/e2e-1.png',timeout:180000});
 const st=await p.evaluate(()=>TREIN.Trains.list.map(t=>`${t.name} v=${t.v.toFixed(1)} ${t.status||''} pax ${t.pax?t.pax.length:0}`).join(' | '));console.log('trains:',st);
 await p.evaluate(()=>{const {Cam,Trains}=TREIN;const t=Trains.list[0];if(t&&t.poses&&t.poses[0]){const c=t.poses[0].c;Cam.target=[c[0],c[1],c[2]];Cam.dist=28;Cam.pitch=0.3;Cam.yaw+=0.6;}});
 await p.waitForTimeout(3000);await p.screenshot({path:out+'/e2e-2.png',timeout:180000});
 await p.evaluate(()=>{TREIN.P.timeOfDay=21.5;});await p.waitForTimeout(3000);await p.screenshot({path:out+'/e2e-night.png',timeout:180000});
};
