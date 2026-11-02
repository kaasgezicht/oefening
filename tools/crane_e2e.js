// sawmill crane test: a siding on a sawmill side, a station on it, a goods train of 3 timber wagons, a full log yard;
// runs the crane fast and screenshots the yard. Usage: WS=2048 node tools/boot.js trein.html <out> tools/crane_e2e.js
module.exports=async(p,out)=>{
 const r=await p.evaluate(()=>{const {Track,Net,App,Trains,Life,Build,Cam,P}=TREIN;const m=(Life.sawmills||[])[0];if(!m)return{err:'no sawmill in this world ('+(Life.villages||[]).length+' villages)'};if(m.v)m.v.sawOwned=true;Life.uploaded=false;Life.roadsDirty=true;
   const sl=Life.sawSlots(m)[1],near=Build.makeSiding(sl.p[0],sl.p[1],sl.t);const st={id:Track.nextId++,sid:near.seg.id,t:near.t,name:'Test'};Track.stations.push(st);Life.attachSawmill(st);Net.changed();App.trackChanged();
   const veh=[...Trains.consist(0,0),Trains.car('wood'),Trains.car('wood'),Trains.car('wood')];Trains.add({sid:near.seg.id,t:66,dir:1},veh);
   P.craneSpeed=60;Goods.get('st:'+st.id).wood=60;P.timeSpeed=0;P.timeOfDay=10.5;window.__st=st;return{st:st.id,trains:Trains.list.length};});
 console.log('crane setup',JSON.stringify(r));if(r.err)return;
 const view=async(lx,ly,lz,yawOff,dist,pitch)=>p.evaluate(([lx,ly,lz,yo,d,pi])=>{const f=Crane.F.find(q=>q.st===window.__st);if(!f)return;const w=Crane.toW(f,lx,ly,lz);const {Cam}=TREIN;Cam.setMode('free');Cam.target=w;Cam.dist=d;Cam.pitch=pi;Cam.yaw=Math.atan2(f.Z[1],f.Z[0])+yo;},[lx,ly,lz,yawOff,dist,pitch]);
 const stat=()=>p.evaluate(()=>{const t=TREIN.Trains.list[0];const c=[...Crane.S.values()][0];return `fps ${(1000/(TREIN.App.perf.fr.slice(-20).reduce((a,b)=>a+b,0)/20)).toFixed(1)} status '${t.status||''}' loads ${t.veh.filter(v=>v.ctype==='wood').map(v=>(v.n||0).toFixed(1)).join('/')} crane ${c?c.ph+' stacks '+c.stacks.join(''):'none'} hold ${Crane.holds(t)}`;});
 await p.waitForFunction(()=>Crane.F.some(q=>q.st===window.__st),null,{timeout:60000});await view(0,4,-5,0.35,46,0.32);
 for(let i=0;i<24;i++){await p.waitForTimeout(2500);if(i%8===7)console.log(await stat());}
 await p.setViewportSize({width:900,height:640});await p.waitForTimeout(2500);await p.screenshot({path:out+'/crane-wide.png',timeout:120000});
 await p.evaluate(()=>{const t=TREIN.Trains.list[0],i=t.veh.findIndex((v,k)=>v.ctype==='wood'&&v.n>0),m=t.poses[i].m;const {Cam}=TREIN;Cam.target=[m[12],m[13]+2,m[14]];Cam.dist=24;Cam.pitch=0.38;});await p.waitForTimeout(2500);await p.screenshot({path:out+'/crane-close.png',timeout:120000});
 await p.evaluate(()=>{const {Cam,Life}=TREIN;const m=Life.sawmills[0];Cam.target=[m.x,m.y+3,m.z];Cam.dist=62;Cam.pitch=0.48;Cam.yaw=m.rot+2.4;});await p.waitForTimeout(3000);await p.screenshot({path:out+'/mill-a.png',timeout:120000});
 await p.evaluate(()=>{const {Cam,Life}=TREIN;const m=Life.sawmills[0];Cam.yaw=m.rot-0.9;Cam.dist=48;Cam.pitch=0.3;});await p.waitForTimeout(3000);await p.screenshot({path:out+'/mill-b.png',timeout:120000});
};
