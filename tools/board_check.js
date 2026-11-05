// boarding: a passenger train between two stations by a village, run at 8× fast forward; measures the stop time, checks that no walker
// stands inside a coach body (off its end platforms), and screenshots boarding at a coach end. Usage: WS=2048 node tools/boot.js trein.html <out> tools/board_check.js
module.exports=async(p,out)=>{
 const r=await p.evaluate(()=>{const {Track,Net,App,Trains,Life,Cam,P}=TREIN;
   const v=Life.villages.slice().sort((a,b)=>(b.houses||[]).length-(a.houses||[]).length)[0];const H=0.6,L=520;const x0=v.x-Math.cos(H)*L/2+30,z0=v.z-Math.sin(H)*L/2+30;
   const g=(x,z)=>App.T?sampleH(App.T,x,z):0;const y=Math.max(g(x0,z0),g(x0+Math.cos(H)*L,z0+Math.sin(H)*L),g(x0+Math.cos(H)*L/2,z0+Math.sin(H)*L/2))+0.5;
   const a={id:Track.nextId++,x:x0,z:z0,y,h:H+Math.PI,g:0},b={id:Track.nextId++,x:x0+Math.cos(H)*L,z:z0+Math.sin(H)*L,y,h:H,g:0};
   Track.nodes.push(a,b);const sg={id:Track.nextId++,a:a.id,b:b.id,x0,z0,h0:H,k:0,L,y0:y,y1:y,g0:0,g1:0,spans:[]};Track.segs.push(sg);
   Track.stations.push({id:Track.nextId++,sid:sg.id,t:90,name:'Oost'},{id:Track.nextId++,sid:sg.id,t:430,name:'West'});Net.changed();App.trackChanged();
   Trains.add({sid:sg.id,t:300,dir:1},Trains.consist(3,0));const t=Trains.list[0];t.auto=false;t.rev=1;P.people=2;App.setFF(8);window.__bc={arr:null,dep:null,bad:0,maxBad:'',samples:0};return{dwell:P.dwell};});
 console.log('board setup',JSON.stringify(r));await p.waitForTimeout(3000);
 console.log('waiting',await p.evaluate(()=>{const {Life,Trains}=TREIN;let n=0;for(const si of Life.stInfo){if(si.cargo)continue;for(let k=0;k<14;k++){const u=(Math.random()-0.5)*30,w=Life.newWalker(si.px+si.dx*u,si.pz+si.dz*u,si.v);
   w.state='wait';w.st=si;w.wait=0;w.tx=w.x;w.tz=w.z;w.faceRot=Math.atan2(-si.nz,-si.nx);Life.walkers.push(w);n++;}}Trains.list[0].auto=true;return n;}));
 // sample: inside-the-coach check while the train stands
 const sample=()=>p.evaluate(()=>{const {Trains,Life,App}=TREIN,t=Trains.list[0],S=window.__bc;if(!t.poses)return;const standing=t.atSt!=null&&Math.abs(t.v)<0.1;
   if(standing&&S.arr==null)S.arr=App.time;if(!standing&&S.arr!=null&&S.dep==null&&Math.abs(t.v)>0.5)S.dep=App.time;
   for(const w of Life.walkers){if(w.hidden)continue;t.poses.forEach((ps,i)=>{if(!ps||t.veh[i].k!=='coach')return;const rx=w.x-ps.c[0],rz=w.z-ps.c[2],al=rx*ps.X[0]+rz*ps.X[2],la=-rx*ps.X[2]+rz*ps.X[0];
     if(Math.abs(al)<6.7&&Math.abs(la)<1.38){S.bad++;S.maxBad=w.state+' al '+al.toFixed(2)+' la '+la.toFixed(2);}});}S.samples++;});
 let shot=false;
 for(let i=0;i<45;i++){await sample();await p.waitForTimeout(1200);
   const st=await p.evaluate(()=>{const {Trains,Life,Cam}=TREIN,t=Trains.list[0];const b=Life.walkers.find(w=>w.state==='board'&&w.bp&&w.bp.length<=2);
     if(b&&!window.__shot){window.__shot=1;TREIN.App.ff=0;const ps=t.poses[1],yaw=Math.atan2(ps.X[2],ps.X[0]);Cam.mode='free';Cam.target=[b.x,(b.y||b.st.y+1)+0.6,b.z];Cam.dist=15;Cam.pitch=0.85;window.__yaw=yaw;let best=0,bs=-1e9;const si=b.st;for(let k=0;k<40;k++){Cam.yaw=k*0.157;Cam.update(0.016);const dx=Cam.pos[0]-Cam.target[0],dz=Cam.pos[2]-Cam.target[2],la=dx*si.nx+dz*si.nz,al=dx*ps.X[0]+dz*ps.X[2];const sc=-la-Math.abs(al+6)*0.6;if(sc>bs){bs=sc;best=Cam.yaw;}}window.__yaw=best;Cam.yaw=best;return 'shoot';}
     return window.__bc.dep!=null?'done':'';});
   if(st==='shoot'&&!shot){shot=true;for(const [k,dy] of [['a',0],['b',0.5],['c',-0.5]]){await p.evaluate(dy=>{TREIN.Cam.yaw=window.__yaw+dy;},dy);await p.waitForTimeout(1500);await p.screenshot({path:out+'/board_'+k+'.png',timeout:120000});}
     await p.evaluate(()=>{TREIN.App.ff=8;});}
   if(st==='done')break;}
 console.log(await p.evaluate(()=>{const S=window.__bc,t=TREIN.Trains.list[0];return `stop ${S.arr!=null&&S.dep!=null?(S.dep-S.arr).toFixed(1)+' s':'not measured (arr '+S.arr+')'}; walkers inside a coach: ${S.bad} of ${S.samples} samples ${S.maxBad}; pax ${t.pax.length}; status ${t.status}`;}));
};
