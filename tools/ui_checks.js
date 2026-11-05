// run-1 UI: build tabs (track options only on Track), locomotive + mixed wagons, a longer platform, trip card, village upgrade bar,
// hold-the-camera view. Screenshots each. Usage: WS=2048 node tools/boot.js trein.html <out> tools/ui_checks.js
module.exports=async(p,out)=>{const shot=async n=>{await p.waitForTimeout(1200);await p.screenshot({path:out+'/'+n+'.png',timeout:120000});};
 // build bar tabs
 await p.evaluate(()=>{TREIN.Build.enter();TREIN.Build.setTab('track');});await shot('ui-build-track');
 console.log('track tab: options', await p.evaluate(()=>!document.querySelector('#bTrackOpts').hidden&&!document.querySelector('#mTrackHow').hidden));
 await p.evaluate(()=>TREIN.Build.setTab('stations'));await shot('ui-build-stations');
 console.log('stations tab: track options hidden', await p.evaluate(()=>document.querySelector('#bTrackOpts').hidden&&document.querySelector('#mTrackHow').hidden));
 await p.evaluate(()=>TREIN.Build.setTab('roads'));console.log('roads tab: track options hidden', await p.evaluate(()=>document.querySelector('#bTrackOpts').hidden));
 await p.evaluate(()=>TREIN.Build.exit());
 // line, station, locomotive, mixed wagons
 const r=await p.evaluate(()=>{const {Track,Net,App,Trains,Life,Cam,P,Drive}=TREIN;P.money=1;
   const v=Life.villages.slice().sort((a,b)=>(b.houses||[]).length-(a.houses||[]).length)[0];const H=0.6,L=520;const x0=v.x-Math.cos(H)*L/2+30,z0=v.z-Math.sin(H)*L/2+30;
   const g=(x,z)=>App.T?sampleH(App.T,x,z):0;const y=Math.max(g(x0,z0),g(x0+Math.cos(H)*L,z0+Math.sin(H)*L),g(x0+Math.cos(H)*L/2,z0+Math.sin(H)*L/2))+0.5;
   const a={id:Track.nextId++,x:x0,z:z0,y,h:H+Math.PI,g:0},b={id:Track.nextId++,x:x0+Math.cos(H)*L,z:z0+Math.sin(H)*L,y,h:H,g:0};
   Track.nodes.push(a,b);const sg={id:Track.nextId++,a:a.id,b:b.id,x0,z0,h0:H,k:0,L,y0:y,y1:y,g0:0,g1:0,spans:[]};Track.segs.push(sg);
   Track.stations.push({id:Track.nextId++,sid:sg.id,t:130,name:'Oost',len:108},{id:Track.nextId++,sid:sg.id,t:400,name:'West'});Net.changed();App.trackChanged();
   Trains.add({sid:sg.id,t:330,dir:1},Trains.consist(0,0));const t=Trains.list[0];for(const k of ['coach','coach','wood','gold','mail'])Trains.addCar(t,k);
   Drive.enter();Trains.sel=0;Drive.listOpen=true;Drive.refresh();window.__ln={sg,y,x0,z0,H};return{cons:t.veh.map(q=>q.k==='wagon'?q.ctype:q.k).join(','),len:Math.round(Trains.length(t.veh))};});
 console.log('mixed train',JSON.stringify(r));await shot('ui-wagons');
 // trip card + village bar: run the train to Oost (long platform) at 4x
 await p.evaluate(()=>{const {Trains,Drive,Cam,App,Life}=TREIN;Drive.listOpen=false;Drive.refresh();const t=Trains.list[0];t.auto=true;t.rev=-1;for(const v of Life.villages){v.trans=(v.trans||0)+12;}t.pax=Array.from({length:14},()=>({dest:null,fx:0,fz:0,t0:App.time-200}));App.setFF(4);
   const st=TREIN.Track.stations[0],s=segById(st.sid),q=segPoint(s,st.t);Cam.setMode('free');Cam.target=[q[0],TREIN.R.sampleHr(TREIN.R.world,q[0],q[1])+4,q[1]];Cam.dist=120;Cam.pitch=0.5;Cam.yaw=window.__ln.H+1.9;});
 let seen=false;for(let i=0;i<40&&!seen;i++){await p.waitForTimeout(1000);seen=await p.evaluate(()=>!!document.querySelector('.trip')&&document.querySelector('.trip').style.display!=='none');}
 console.log('trip card shown',seen);if(seen){await p.evaluate(()=>{TREIN.App.ff=1;});await p.waitForTimeout(1500);await p.screenshot({path:out+'/ui-trip.png',timeout:120000});}
 console.log('train stop on long platform', await p.evaluate(()=>{const t=TREIN.Trains.list[0],st=TREIN.Track.stations[0];const hd=t.head.t,tl=hd+TREIN.Trains.length(t.veh);return `head ${hd.toFixed(0)} tail ${tl.toFixed(0)} platform ${st.t-st.len/2}..${st.t+st.len/2} status ${t.status}`;}));
 // hold the camera button 600 ms
 await p.evaluate(()=>{TREIN.App.ff=1;TREIN.Cam.setMode('chase');TREIN.Drive.refresh();});const b=await p.$('#dCam');const bb=await b.boundingBox();await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2);await p.mouse.down();await p.waitForTimeout(700);await p.mouse.up();
 console.log('cinema', await p.evaluate(()=>({bar:document.querySelector('#driveBar').hidden,cine:!document.querySelector('#cine').hidden,cam:TREIN.Cam.mode})));await shot('ui-cinema');
 await p.click('#cineCam');console.log('cinema cam ->',await p.evaluate(()=>TREIN.Cam.mode));await p.click('#cineExit');console.log('exit: bar shown',await p.evaluate(()=>!document.querySelector('#driveBar').hidden));
 await p.evaluate(()=>{TREIN.Drive.exit();const v=TREIN.Life.villages[0];const C=TREIN.Cam;C.target=[v.x,TREIN.R.sampleHr(TREIN.R.world,v.x,v.z),v.z];C.dist=420;C.pitch=0.6;});await shot('ui-village');
 console.log('village bars',await p.evaluate(()=>[...document.querySelectorAll('.vlabel')].filter(e=>e.style.display!=='none').map(e=>{const u=e.querySelector('.vl-up');return e.querySelector('b').textContent+':'+(u?u.title:'-');}).slice(0,5).join(' | ')));
};
