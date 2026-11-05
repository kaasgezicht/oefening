// red signals: a fast automatic train approaches a signal, the block beyond is suddenly taken by another train 40 m before the signal;
// the train must stop before it (emergency braking). Then a normal approach to a red signal, and a driven (manual) train. Steps the sim synchronously.
// Usage: node tools/boot.js trein.html <out> tools/signal_check.js
module.exports=async(p,out)=>{
 console.log(await p.evaluate(()=>{const {Track,Net,App,Trains,P}=TREIN;const res=[];
   const lay=()=>{Trains.list.length=0;Track.segs.length=0;Track.nodes.length=0;Track.sigs.length=0;Track.stations.length=0;const H=0.3,L=1400,x0=150,z0=150,y=(App.T?sampleH(App.T,x0,z0):0)+40;
     const a={id:Track.nextId++,x:x0,z:z0,y,h:H+Math.PI,g:0},b={id:Track.nextId++,x:x0+Math.cos(H)*L,z:z0+Math.sin(H)*L,y,h:H,g:0};Track.nodes.push(a,b);
     const sg={id:Track.nextId++,a:a.id,b:b.id,x0,z0,h0:H,k:0,L,y0:y,y1:y,g0:0,g1:0,spans:[]};Track.segs.push(sg);Track.sigs.push({id:Track.nextId++,sid:sg.id,t:700},{id:Track.nextId++,sid:sg.id,t:1000});Net.changed();App.trackChanged();return sg;};
   const run=(sg,cond,maxT)=>{let t=0;while(t<maxT){Trains.update(0.05);t+=0.05;if(cond&&cond())break;}return t;};
   P.derail=false;P.autoSpeed=90;
   // 1: sudden red at 40 m
   let sg=lay();Trains.add({sid:sg.id,t:300,dir:1},Trains.consist(3,0));Trains.add({sid:sg.id,t:1350,dir:1},Trains.consist(2,0));const A=Trains.list[0],B=Trains.list[1];A.auto=true;A.rev=1;A.v=25;B.auto=false;B.v=0;
   run(sg,()=>A.head.t>660,60);const v0=A.v,d0=700-A.head.t;B.head={sid:sg.id,t:900,dir:1};let maxT=0,eb=false;run(sg,()=>{maxT=Math.max(maxT,A.head.t);eb=eb||A.ebrake;return Math.abs(A.v)<0.01&&!A.ebrake;},30);
   res.push(`sudden red: ${(v0*3.6).toFixed(0)} km/h at ${d0.toFixed(0)} m, stopped at ${(700-maxT).toFixed(1)} m before the signal, emergency ${eb}, ${maxT<700?'PASS':'FAIL'}`);
   // 2: red from far away: normal braking, no emergency
   sg=lay();Trains.add({sid:sg.id,t:200,dir:1},Trains.consist(3,0));Trains.add({sid:sg.id,t:900,dir:1},Trains.consist(2,0));const A2=Trains.list[0];A2.auto=true;A2.rev=1;A2.v=20;Trains.list[1].auto=false;
   let eb2=false,m2=0;run(sg,()=>{eb2=eb2||A2.ebrake;m2=Math.max(m2,A2.head.t);return false;},90);res.push(`red ahead: stopped ${(700-m2).toFixed(1)} m before, emergency ${eb2}, status '${A2.status}', ${m2<700?'PASS':'FAIL'}`);
   // 3: the block clears: the train goes on
   Trains.list[1].head={sid:sg.id,t:1300,dir:1};run(sg,()=>A2.head.t>750,120);res.push(`cleared: head at ${A2.head.t.toFixed(0)} ${A2.head.t>750?'PASS':'FAIL'}`);
   // 4: a driven train at full throttle toward a red signal
   sg=lay();Trains.add({sid:sg.id,t:400,dir:1},Trains.consist(2,0));Trains.add({sid:sg.id,t:900,dir:1},Trains.consist(2,0));const M=Trains.list[0];M.auto=false;M.rev=1;M.throttle=1;M.brake=0;Trains.list[1].auto=false;
   let m4=0;run(sg,()=>{M.throttle=1;M.brake=0;m4=Math.max(m4,M.head.t);return false;},90);res.push(`driven train: stopped ${(700-m4).toFixed(1)} m before, ${m4<700?'PASS':'FAIL'}`);
   // 5: the lamp: green for a train approaching an empty block, red behind a train
   sg=lay();Trains.add({sid:sg.id,t:600,dir:1},Trains.consist(2,0));const G=Trains.list[0];G.auto=true;G.rev=1;Trains.update(0.05);const f1=Net.face.get(Track.sigs[0]);
   res.push(`lamp for approaching train: ${f1==='g'?'green PASS':'FAIL '+f1}`);
   return res.join('\n');}));};
