'use strict';
// ===== train.js
// ===================================================================
// TRAINS (steps 12-14) — steam loco + tender + carriages riding the track graph,
// with real forces: tractive effort / power curve, gravity on grades, rolling, curve and air
// resistance, brakes, wheel slip. Smoke and steam particles, buffer stops, collisions.
// position on the network: {sid, t, dir}  dir=+1 means train-forward runs towards increasing t
// ===================================================================
const VEH={wagon:{len:9.4,pf:2.8,pr:-2.8,m:16000},ore:{len:11.4,pf:3.4,pr:-3.4,m:24000},loco:{len:11.2,pf:3.4,pr:-1.6,m:72000,drive:true},tender:{len:7.2,pf:2.2,pr:-2.2,m:38000},coach:{len:15,pf:4.9,pr:-4.9,m:27000},loco01:{len:15.2,pf:4.95,pr:-4.3,m:108000,drive:true},tender01:{len:8.0,pf:2.45,pr:-2.45,m:70000}};
/* per locomotive kind (veh[0].lt): mesh, size, where the chimney, drain cocks, whistle, the driver's eye and the crew are (loco frame), driving wheel radius, pull */
const LOCOS={std:{name:'Green tank-style loco',loco:'loco',tender:'tender',mesh:[0,1],chim:[4.55,3.95],drain:[3.9,0.9,1.3],whistle:[-0.9,3.75],eye:[-1.5,3.35,0.95],crew:[[0.82,-1.45,0.31],[-0.78,-1.7,0.73]],crewY:1.62,R:0.8,te:1},
  '01':{name:'DB class 01 Pacific (01 118)',loco:'loco01',tender:'tender01',mesh:[34,35],chim:[5.9,4.62],drain:[5.6,0.6,1.3],whistle:[-2.0,4.58],eye:[-5.9,3.62,0.9],crew:[[0.82,-5.9,0.31],[-0.78,-6.5,0.73]],crewY:2.05,R:1.0,te:1.35}};
const locoSpec=tr=>LOCOS[(tr&&tr.veh&&tr.veh[0]&&tr.veh[0].lt)||'std']||LOCOS.std;
const COUPLE=0.7;
function segById(id){return Track.segs.find(s=>s.id===id);}
function advance(pos,ds,tr,setSw){
  let s=segById(pos.sid);if(!s)return{pos,blocked:true};let t=pos.t+ds*pos.dir,dir=pos.dir,guard=0;const sg=ds>=0?1:-1;
  while((t>s.L||t<0)&&guard++<200){const atB=t>s.L,ex=atB?t-s.L:-t,node=atB?s.b:s.a,n=Net.next(s,node,tr,setSw);
    if(!n)return{pos:{sid:s.id,t:atB?s.L:0,dir},blocked:true};
    if(n.a===node){t=ex;dir=sg;}else{t=n.L-ex;dir=-sg;}s=n;}
  return{pos:{sid:s.id,t,dir},blocked:false};
}
function posInfo(pos){const s=segById(pos.sid);if(!s)return null;const p=segPoint(s,pos.t);const y=segY(s,pos.t);
  const h=pos.dir>0?p[2]:p[2]+Math.PI;return{x:p[0],y,z:p[1],h,grade:segGrade(s,pos.t)*pos.dir,k:s.k,inTunnel:!!((spanAt(s,pos.t)||[])[2]==='t')};}

// ---- vehicle meshes (local: x forward, y up, z sideways; front end at +len/2, rail top at y=0)
// vertex: pos3 nrm3 col3 anim4(type,px|crank,py,radius) mat1  — type 1 wheel spin, 2/3 rods (left/right crank phase)
function vmesh(){return{v:[],i:[],n:0};}
function vt(M,a,b,c,nm,col,mat,anim){const A=anim||[0,0,0,1];for(const p of [a,b,c])M.v.push(p[0],p[1],p[2],nm[0],nm[1],nm[2],col[0],col[1],col[2],A[0],A[1],A[2],A[3],mat);M.i.push(M.n,M.n+1,M.n+2);M.n+=3;}
function vq(M,a,b,c,d,nm,col,mat,anim){const A=anim||[0,0,0,1];for(const p of [a,b,c,d])M.v.push(p[0],p[1],p[2],nm[0],nm[1],nm[2],col[0],col[1],col[2],A[0],A[1],A[2],A[3],mat);M.i.push(M.n,M.n+1,M.n+2,M.n,M.n+2,M.n+3);M.n+=4;}
function vbox(M,c,s,col,mat,anim){const [x,y,z]=c,[a,b,d]=[s[0]/2,s[1]/2,s[2]/2];
  vq(M,[x-a,y+b,z-d],[x+a,y+b,z-d],[x+a,y+b,z+d],[x-a,y+b,z+d],[0,1,0],col,mat,anim);vq(M,[x-a,y-b,z+d],[x+a,y-b,z+d],[x+a,y-b,z-d],[x-a,y-b,z-d],[0,-1,0],col,mat,anim);
  vq(M,[x+a,y-b,z-d],[x+a,y-b,z+d],[x+a,y+b,z+d],[x+a,y+b,z-d],[1,0,0],col,mat,anim);vq(M,[x-a,y-b,z+d],[x-a,y-b,z-d],[x-a,y+b,z-d],[x-a,y+b,z+d],[-1,0,0],col,mat,anim);
  vq(M,[x-a,y-b,z+d],[x-a,y+b,z+d],[x+a,y+b,z+d],[x+a,y-b,z+d],[0,0,1],col,mat,anim);vq(M,[x+a,y-b,z-d],[x+a,y+b,z-d],[x-a,y+b,z-d],[x-a,y-b,z-d],[0,0,-1],col,mat,anim);}
function vcyl(M,c,axis,r,len,col,mat,seg,anim,caps){seg=Math.min(seg||10,10);const [x,y,z]=c;
  const P=(t,a,rr)=>axis==='x'?[x+t,y+Math.cos(a)*rr,z+Math.sin(a)*rr]:axis==='y'?[x+Math.cos(a)*rr,y+t,z+Math.sin(a)*rr]:[x+Math.cos(a)*rr,y+Math.sin(a)*rr,z+t];
  const N=(a)=>axis==='x'?[0,Math.cos(a),Math.sin(a)]:axis==='y'?[Math.cos(a),0,Math.sin(a)]:[Math.cos(a),Math.sin(a),0];
  for(let k=0;k<seg;k++){const a0=k/seg*6.2832,a1=(k+1)/seg*6.2832,am=(a0+a1)/2;vq(M,P(-len/2,a0,r),P(len/2,a0,r),P(len/2,a1,r),P(-len/2,a1,r),N(am),col,mat,anim);
    if(caps!==false)for(const e of [-1,1]){const cc=P(e*len/2,0,0);const ax=axis==='x'?[e,0,0]:axis==='y'?[0,e,0]:[0,0,e];vt(M,cc,P(e*len/2,a0,r),P(e*len/2,a1,r),ax,col,mat,anim);}}}
function vwheel(M,x,y,z,r,col){const A=[1,x,y,r];vcyl(M,[x,y,z],'z',r,0.13,col,0,10,A);
  // spokes are offset across their own direction (the horizontal one used to have zero width and vanished)
  for(let k=0;k<6;k++){const a=k/6*3.1416;const dz=z+Math.sign(z)*0.07;const c=Math.cos(a)*r*0.85,s=Math.sin(a)*r*0.85,px=Math.sin(a)*0.03,py=-Math.cos(a)*0.03;
    vq(M,[x-c-px,y-s-py,dz],[x+c-px,y+s-py,dz],[x+c+px,y+s+py,dz],[x-c+px,y-s+py,dz],[0,0,Math.sign(z)],[0.08,0.08,0.08],1,A);}}
const COL={green:[0.15,0.46,0.30],black:[0.17,0.17,0.19],red:[0.86,0.20,0.16],brass:[0.92,0.72,0.30],steel:[0.62,0.63,0.66],maroon:[0.62,0.16,0.15],cream:[0.95,0.88,0.70],roof:[0.36,0.36,0.38],coal:[0.1,0.1,0.1],glass:[0.30,0.38,0.46],lamp:[1,0.9,0.7],wheel:[0.82,0.18,0.14]};
// ---- timber loading yard and wooden travelling gantry crane (vehicle meshes in the station frame: x along the track,
// y up from the rail top, z across; the log stacks are on -z). The gantry rolls on two runway rails at z zA and zB,
// its trolley runs across on the truss bridge, and the hook hangs from ropes on the trolley's winch drum.
const CRN={zA:3.4,zB:-13.6,drumY:10.45,zPile:-9.3,stackX:[0,8.25,-8.25,16.5,-16.5],xMax:21,rest:6.6,logR:0.21,rowY0:0.23,rowDY:0.364,carY:1.42,sling:1.5,unit:20/3};
function vobox(M,c,u,v,w,col,mat){const ax=[u,v,w],add=(...q)=>q.reduce((a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],[0,0,0]),sc=(a,k)=>a.map(x=>x*k),nz=a=>{const l=Math.hypot(...a)||1;return a.map(x=>x/l);};
  for(let i=0;i<3;i++){const A=ax[i],B=ax[(i+1)%3],C=ax[(i+2)%3];for(const s of [-1,1]){const f=add(c,sc(A,s));vq(M,add(f,sc(B,-1),sc(C,-1)),add(f,B,sc(C,-1)),add(f,B,C),add(f,sc(B,-1),C),sc(nz(A),s),col,mat);}}}
// square timber (half width hw) between two points
function vbeam(M,a,b,hw,col,mat){const d=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],l=Math.hypot(...d),ax=d.map(x=>x/l);const up=Math.abs(ax[1])<0.95?[0,1,0]:[1,0,0];
  let s=[ax[1]*up[2]-ax[2]*up[1],ax[2]*up[0]-ax[0]*up[2],ax[0]*up[1]-ax[1]*up[0]];const sl=Math.hypot(...s);s=s.map(x=>x/sl*hw);const t=[ax[1]*s[2]-ax[2]*s[1],ax[2]*s[0]-ax[0]*s[2],ax[0]*s[1]-ax[1]*s[0]];
  vobox(M,[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2],d.map(x=>x/2),s,t,col,mat);}
// a log along x with bark sides and pale end grain
function vlogx(M,x0,x1,y,z,r,seg){seg=seg||8;vcyl(M,[(x0+x1)/2,y,z],'x',r,x1-x0,[0.42,0.31,0.21],3,seg,null,false);const ec=[0.86,0.72,0.5];
  for(const x of [x0,x1])for(let k=0;k<seg;k++){const a0=k/seg*6.2832,a1=(k+1)/seg*6.2832;vt(M,[x,y,z],[x,y+Math.cos(a0)*r,z+Math.sin(a0)*r],[x,y+Math.cos(a1)*r,z+Math.sin(a1)*r],[x<0?-1:1,0,0],ec,3);}}
// one row of logs (row k of a timber wagon load or a yard stack: 5, 4 or 3 logs), top of the row at y 0; chains=true adds the slings of a hanging bundle
function logRowMesh(k,chains){const M=vmesh(),n=5-k,r=CRN.logR;for(let i=0;i<n;i++)vlogx(M,-3.8+(i%2)*0.08,3.8-((i+k)%3)*0.07,-r,(i-(n-1)/2)*0.42,r,8);
  if(chains)for(const x of [-2,2]){vbox(M,[x,-r,0],[0.05,2*r+0.04,n*0.42+0.06],[0.16,0.16,0.17],1);}return M;}
function loadStageMesh(){const M=vmesh(),tb=[0.36,0.27,0.19],tl=[0.5,0.38,0.27],ir=[0.3,0.3,0.32],stn=[0.55,0.53,0.5];
  for(const z of [CRN.zA,CRN.zB]){vbox(M,[0,-0.9,z],[47.8,1.5,0.5],stn,3);vbox(M,[0,-0.03,z],[48,0.3,0.36],tb,3);vbox(M,[0,0.16,z],[48,0.08,0.09],ir,1);for(const e of [-1,1])vbox(M,[e*24.2,0.45,z],[0.35,0.6,0.55],tb,3);}
  // loading platform (timber deck on posts) between the track and the stacks, with ramps at both ends
  vbox(M,[0,0.95,-3.15],[44,0.1,3.0],tl,5);vbox(M,[0,0.45,-1.72],[44,0.9,0.1],tb,3);for(let x=-22;x<=22.01;x+=2.75)for(const z of [-1.8,-4.5])vbox(M,[x,0.38,z],[0.22,1.12,0.22],tb,3);
  for(const e of [-1,1])vobox(M,[e*24,0.4,-3.15],[e*2,-0.55,0],[0,0.05,0],[0,0,1.5],tl,5);
  // bearers under the five stack places
  for(const sx of CRN.stackX)for(const e of [-2.8,2.8])vbox(M,[sx+e,-0.08,CRN.zPile],[0.26,0.2,2.6],tb,3);
  // lamp posts with lanterns (the station's two night lights sit just above them) and a tally hut at the far end
  for(const x of [-7,7]){vbox(M,[x,1.8,-5.4],[0.14,3.9,0.14],[0.15,0.2,0.17],1);vbox(M,[x,3.92,-5.4],[0.36,0.4,0.36],COL.lamp,4);vbox(M,[x,4.2,-5.4],[0.48,0.08,0.48],[0.15,0.2,0.17],1);}
  vbox(M,[-26.6,1.1,-9.3],[2.6,2.6,2.4],tl,3);vbox(M,[-26.6,2.48,-9.3],[3.0,0.14,2.8],[0.5,0.24,0.18],3);vbox(M,[-25.28,1.0,-9.3],[0.05,1.9,0.8],[0.3,0.2,0.13],3);vbox(M,[-26.6,1.4,-10.52],[0.9,0.6,0.05],COL.glass,2);
  return M;}
function gantryMesh(){const M=vmesh(),tb=[0.36,0.27,0.19],tl=[0.5,0.38,0.27],ir=[0.24,0.24,0.26],z0=CRN.zA+0.45,z1=CRN.zB-0.45,mid=(z0+z1)/2,len=z0-z1;
  for(const z of [CRN.zA,CRN.zB]){
    for(const x of [-2,2]){vcyl(M,[x,0.53,z],'z',0.33,0.14,ir,1,12);vcyl(M,[x,0.53,z],'z',0.07,0.46,ir,1,6);for(const e of [-1,1])vbox(M,[x,0.62,z+e*0.17],[0.95,0.34,0.06],ir,1);}
    vbox(M,[0,0.95,z],[5.2,0.3,0.42],tb,3);
    const X=y=>2.3-(y-1.1)/6.95*1.45;for(const e of [-1,1])vbeam(M,[e*2.3,1.1,z],[e*0.85,8.05,z],0.17,tb,3);
    for(const y of [3.6,6.1])vbox(M,[0,y,z],[2*X(y)+0.25,0.22,0.26],tb,3);for(const e of [-1,1])vbeam(M,[e*2.05,1.25,z],[-e*X(3.45),3.45,z],0.045,ir,1);
    vbox(M,[0,8.2,z],[2.4,0.3,0.46],tb,3);}
  // truss bridge: two Howe girders with chords, posts and diagonals, lateral ties, trolley rails, a walkway with a handrail
  const N=8,zk=k=>z0+(z1-z0)*k/N;
  for(const x of [-0.85,0.85]){vbox(M,[x,8.5,mid],[0.26,0.3,len],tb,3);vbox(M,[x,9.55,mid],[0.26,0.3,len],tb,3);vbox(M,[x,9.74,mid],[0.07,0.08,len],ir,1);
    for(let k=0;k<=N;k++)vbox(M,[x,9.03,zk(k)],[0.2,0.76,0.2],tb,3);for(let k=0;k<N;k++){const up=k<N/2;vbeam(M,[x,8.66,zk(up?k+1:k)],[x,9.4,zk(up?k:k+1)],0.08,tb,3);}}
  for(let k=0;k<=N;k++){vbox(M,[0,9.62,zk(k)],[1.96,0.12,0.16],tb,3);vbox(M,[0,8.42,zk(k)],[1.96,0.12,0.16],tb,3);}
  vbox(M,[1.42,9.68,mid],[0.8,0.06,len],tl,5);for(let k=0;k<=N;k++){vbox(M,[1.42,9.6,zk(k)],[0.8,0.08,0.12],tb,3);vbox(M,[1.8,10.2,zk(k)],[0.05,1.0,0.05],ir,1);}vbox(M,[1.8,10.7,mid],[0.05,0.05,len],ir,1);
  // ladder up the near trestle; steam winch house on a platform on the yard-side trestle, with a stovepipe
  {const lx=y=>-2.55+(y-1.1)/6.95*1.45;for(const e of [-0.22,0.22])vbeam(M,[lx(1.1),1.1,CRN.zA+e],[lx(8.05),8.05,CRN.zA+e],0.03,tb,3);for(let y=1.45;y<8;y+=0.4)vbox(M,[lx(y),y,CRN.zA],[0.05,0.05,0.44],tb,3);}
  const zc=CRN.zB-1.15;vbox(M,[0,3.94,zc],[3.0,0.12,1.9],tb,3);for(const e of [-1,1])vbeam(M,[e*1.3,3.88,zc-0.9],[e*1.9,2.2,CRN.zB],0.07,tb,3);
  vbox(M,[0,5.0,zc],[2.4,2.0,1.6],tl,3);vbox(M,[0,6.08,zc],[2.8,0.12,2.0],[0.42,0.2,0.15],3);vbox(M,[0,5.1,zc-0.81],[0.9,0.7,0.03],COL.glass,2);vbox(M,[-0.8,4.8,zc-0.81],[0.6,1.5,0.03],[0.3,0.2,0.13],3);
  vcyl(M,[0.8,6.7,zc+0.3],'y',0.08,1.1,ir,1,8);vcyl(M,[0.8,7.3,zc+0.3],'y',0.13,0.12,ir,1,8);
  return M;}
function trolleyMesh(){const M=vmesh(),tb=[0.36,0.27,0.19],ir=[0.22,0.22,0.24];
  for(const x of [-0.85,0.85])for(const z of [-0.42,0.42])vcyl(M,[x,9.92,z],'x',0.14,0.12,ir,1,10);
  for(const x of [-0.85,0.85])vbox(M,[x,10.14,0],[0.22,0.22,1.3],tb,3);for(const z of [-0.55,0.55])vbox(M,[0,10.14,z],[1.92,0.22,0.2],tb,3);
  vcyl(M,[0,CRN.drumY,0],'x',0.22,1.1,tb,3,12);for(const x of [-0.58,0.58])vcyl(M,[x,CRN.drumY,0],'x',0.32,0.05,ir,1,12);vcyl(M,[0.75,CRN.drumY,0],'x',0.4,0.05,ir,1,14);
  vcyl(M,[0,CRN.drumY,0],'x',0.05,1.7,ir,1,6);for(const e of [-1,1]){vbox(M,[e*0.85,CRN.drumY,0],[0.06,0.5,0.06],ir,1);vbox(M,[e*0.88,CRN.drumY-0.25,0.22],[0.06,0.06,0.45],ir,1);}
  for(const e of [-1,1])vbox(M,[e*0.65,10.3,0],[0.08,0.3,0.2],ir,1);return M;}
// two hoist ropes, 1 m long downward (the draw call stretches them to the hook)
function cableMesh(){const M=vmesh();for(const x of [-0.09,0.09])vbox(M,[x,-0.5,0],[0.025,1.0,0.025],[0.14,0.13,0.12],3);return M;}
// hook block with its sheave, the spreader beam, and the chain slings that hang down to the bundle top 1.5 m below
function hookMesh(){const M=vmesh(),ir=[0.2,0.2,0.22],tb=[0.36,0.27,0.19];vbox(M,[0,-0.22,0],[0.3,0.44,0.26],ir,1);vcyl(M,[0,-0.14,0],'x',0.15,0.34,ir,1,10);vbox(M,[0,-0.55,0],[0.08,0.28,0.08],ir,1);
  for(const e of [-1,1])vbeam(M,[0,-0.62,0],[e*0.9,-0.76,0],0.025,ir,1);vbox(M,[0,-0.85,0],[4.4,0.2,0.2],tb,3);for(const x of [-2,2])vbox(M,[x,-1.17,0],[0.04,0.64,0.04],ir,1);return M;}
// ---- mines: the three ore kinds (colours of the ore piles, loads and signs)
const ORE={gold:{name:'Gold',icon:'🥇',col:[0.66,0.5,0.26],glint:[0.95,0.8,0.32]},silver:{name:'Silver',icon:'🥈',col:[0.55,0.56,0.58],glint:[0.86,0.88,0.92]},diamond:{name:'Diamond',icon:'💎',col:[0.30,0.35,0.40],glint:[0.72,0.88,0.98]}};
// 19th-century shaft mine (plot 34 × 26, +x faces the village; loading sides back -36, ±32, where the station brings its ore yard):
// a timber headframe with two sheave wheels over the shaft house, the brick winding-engine house with its tall stack and a
// boiler lean-to, cables from the drum up to the sheaves, a sorting house on stilts fed by a tub track from the shaft,
// tubs of ore and a miner pushing one, the grey waste dump and the ore stockpile, an assay office, a powder magazine,
// a water tank, lamps, a fence and a gate sign with the mine's emblem.
function mineMesh(kind){const M=omesh(),o=ORE[kind]||ORE.gold,tb=[0.33,0.25,0.18],tl=[0.46,0.35,0.25],br=[0.6,0.31,0.24],ir=[0.2,0.2,0.22],st=[0.7,0.71,0.74],rock=[0.5,0.49,0.47],
    gnd=[0.47,0.45,0.42],sl=[0.32,0.34,0.38];
  oBox(M,0,0.08,0,34,0.16,26,gnd,0);
  // shaft house (x -9..-3, z -3..3) and the headframe over it: four raking legs, back braces toward the engine, two sheaves
  oBox(M,-6,2.2,0,6,4.1,6,tl,0);oGable(M,-6,0,6,6,4.25,1.6,0.3,'z',[0.38,0.33,0.3],tl,0,0);oBox(M,-2.97,1.5,0,0.06,2.6,1.8,[0.15,0.12,0.1],0);
  for(const x of [-7.6,-4.4])for(const z of [-2.6,2.6])oLimb(M,[x,0.16,z],[x+(x<-6?0.9:-0.9),15.2,z*0.45],0.2,0.18,4,tb,0);
  for(const z of [-1.17,1.17])oLimb(M,[2.4,0.16,z*2],[-5.2,14.8,z],0.17,0.15,4,tb,0);
  for(const y of [6,10,13.5])oBox(M,-6,y,0,3.2-(y-6)*0.12,0.24,4.6-(y-6)*0.3,tb,0);oBox(M,-6,15.35,0,2.4,0.3,1.6,tb,0);oBox(M,-6,15.7,0,3.0,0.12,2.0,tl,0);
  for(const z of [-0.45,0.45]){oLimb(M,[-6,16.6,z-0.06],[-6,16.6,z+0.06],1.25,1.25,16,ir,0,false);oLimb(M,[-6,16.6,z-0.06],[-6,16.6,z+0.06],0.2,0.2,8,ir,0);
    for(let k=0;k<6;k++){const a=k/6*6.2832;oLimb(M,[-6,16.6,z],[-6+Math.cos(a)*1.2,16.6+Math.sin(a)*1.2,z],0.04,0.04,4,ir,0);}oBox(M,-6,15.95,z,0.3,0.4,0.2,ir,0);}
  for(const z of [-0.45,0.45])oLimb(M,[-4.85,16.6,z],[5.6,3.2,z*1.6],0.03,0.03,4,[0.12,0.12,0.12],0);
  // winding-engine house (x 4..14, z -3.5..3.5): brick, slate roof, arched windows, the drum showing through a door; stack and boiler house
  oBox(M,9,2.6,0,10,5.2,7,br,0);oBox(M,9,0.3,0,10.3,0.6,7.3,[0.42,0.4,0.38],0);oGable(M,9,0,10,7,5.2,2.2,0.4,'x',sl,br,0,0);
  for(const x of [6.5,9,11.5])for(const z of [-1,1]){oBox(M,x,2.7,z*3.52,1.0,1.6,0.06,[0.16,0.18,0.22],0);oArch(M,[x,3.5,z*3.56],0.5,'x',[0.16,0.18,0.22],0);}
  oBox(M,3.97,1.8,0,0.06,3,2.6,[0.12,0.1,0.09],0);oLimb(M,[5.0,3.2,-1.2],[5.0,3.2,1.2],0.9,0.9,14,[0.35,0.3,0.26],0);oBox(M,5.6,3.2,0,0.16,0.16,0.16,ir,0);
  oBox(M,12,9,-5.3,1.2,18,1.2,br,0);oBox(M,12,17.7,-5.3,1.55,0.5,1.55,br,0);oBox(M,12,18.1,-5.3,1.3,0.35,1.3,[0.14,0.13,0.13],0);for(const y of [6,12])oBox(M,12,y,-5.3,1.28,0.14,1.28,[0.48,0.25,0.2],0);
  oBox(M,9.5,1.7,-5.3,5,3.4,3.6,br,0);oBox(M,9.5,3.5,-5.3,5.3,0.12,3.9,sl,0);oBox(M,11.4,1.0,-5.3,0.7,0.6,1.3,br,0);
  // sorting house on stilts (x -14..-8, z 5..11) with chutes, fed by a tub track from the shaft house; tubs of ore, a miner pushing one
  for(const x of [-13.6,-8.4])for(const z of [5.4,10.6])oBox(M,x,2.0,z,0.3,4,0.3,tb,0);oBox(M,-11,4.7,8,6,2.8,6,tl,0);oGable(M,-11,8,6,6,6.1,1.4,0.3,'x',[0.38,0.33,0.3],tl,0,0);
  for(const z of [6.2,9.8])oOBox(M,[-11,2.9,z],[0,0.6,0],[0.5,0,0],[0,0.06,0.5],ir,0);oBox(M,-11,4.1,4.95,3,0.6,0.1,[0.25,0.2,0.15],0);
  {const rails=(x0,z0,x1,z1)=>{const L=Math.hypot(x1-x0,z1-z0),dx=(x1-x0)/L,dz=(z1-z0)/L;for(const e of [-0.32,0.32])oOBox(M,[(x0+x1)/2-dz*e,0.22,(z0+z1)/2+dx*e],[(x1-x0)/2,0,(z1-z0)/2],[0,0.04,0],[-dz*0.03,0,dx*0.03],ir,0);for(let u=0.4;u<L;u+=0.8)oOBox(M,[x0+dx*u,0.18,z0+dz*u],[dx*0.1,0,dz*0.1],[0,0.03,0],[-dz*0.5,0,dx*0.5],tb,0);};
    rails(-6,3.2,-6,8);rails(-6,8,-8.3,8);rails(-6,-3.2,-6,-10);}
  const tub=(x,z,full)=>{oBox(M,x,0.6,z,1.1,0.6,0.8,ir,0);for(const dx of [-0.35,0.35])for(const dz of [-0.33,0.33])oLimb(M,[x+dx,0.36,z+dz-0.03],[x+dx,0.36,z+dz+0.03],0.13,0.13,8,[0.12,0.12,0.12],0);if(full)oIco(M,x,0.92,z,0.38,o.col,0,{sy:0.45,jit:0.2,seed:Math.round(x*7+z)});};
  tub(-6,5.2,true);tub(-6,6.6,true);tub(-6,-6,false);tub(-6,-8,true);oMerge(M,personMesh(),-6,0.16,4.2,Math.PI/2);
  // waste rock dump and the ore stockpile; a few rocks
  oIco(M,-12,0.3,-7.5,4.2,rock,0,{sy:0.48,jit:0.16,detail:1,seed:31});oIco(M,-7.5,0.3,9,2.3,o.col,0,{sy:0.5,jit:0.2,detail:1,seed:33});for(let k=0;k<5;k++){const x=-8.3+k*0.4,z=9.4-k*0.2,d=Math.hypot(x+7.5,z-9);oIco(M,x,0.25+1.15*Math.sqrt(Math.max(0,1-d*d/5.3)),z,0.18,o.glint,0,{seed:40+k});}
  for(const [x,z,r] of [[2,-10,0.6],[3.4,-11.2,0.4],[-1,11.5,0.5]])oIco(M,x,0.3,z,r,rock,0,{sy:0.7,jit:0.25,seed:Math.round(x*3+z)});
  // assay office with porch and lit window, powder magazine (stone, iron door), water tank, lamps
  oBox(M,9,1.5,8.8,6,3,4.4,[0.6,0.52,0.42],0);oGable(M,9,8.8,6,4.4,3.0,1.4,0.35,'x',[0.55,0.25,0.18],[0.6,0.52,0.42],0,0);oBox(M,8,1.15,6.58,0.9,2.0,0.06,[0.3,0.2,0.13],0);oBox(M,10.4,1.8,6.58,1.1,0.9,0.05,[1,0.85,0.55],9);
  oBox(M,9,2.7,5.9,6.2,0.1,1.4,[0.55,0.25,0.18],0);for(const x of [6.2,11.8])oBox(M,x,1.35,5.3,0.14,2.7,0.14,tb,0);
  oBox(M,14.5,1.2,-10.6,2.6,2.4,2.2,[0.62,0.6,0.56],0);oGable(M,14.5,-10.6,2.6,2.2,2.4,0.8,0.15,'x',[0.4,0.4,0.42],[0.62,0.6,0.56],0,0);oBox(M,13.17,1.0,-10.6,0.05,1.5,0.8,[0.25,0.25,0.27],0);
  for(const dx of [-1,1])for(const dz of [-1,1])oBox(M,1.5+dx,2.3,-9.5+dz,0.22,4.6,0.22,tb,0);oPrism(M,1.5,-9.5,1.2,1.2,4.6,6.3,12,tl,0);oPrism(M,1.5,-9.5,1.3,0.08,6.3,7.0,12,[0.36,0.3,0.26],0);for(const y of [5,5.7])oPrism(M,1.5,-9.5,1.23,1.23,y,y+0.06,12,ir,0);
  for(const [x,z] of [[0,4],[-2,-4],[15,3]]){oBox(M,x,1.8,z,0.14,3.6,0.14,[0.15,0.2,0.17],0);oBox(M,x,3.7,z,0.34,0.38,0.34,[1,1,1],9);}
  // fence along the village side with a gate sign carrying the mine's emblem (a coin, a bar or a cut stone)
  for(const z of [-2.8,2.8])oBox(M,16.6,1.7,z,0.22,3.4,0.22,tb,0);oBox(M,16.6,3.2,0,0.16,0.7,5.8,tl,0);
  if(kind==='diamond'){const c=[16.48,3.2,0],r=0.42;for(let k=0;k<6;k++){const a0=k/6*6.2832,a1=(k+1)/6*6.2832;oTri(M,c,[c[0],c[1]+Math.sin(a0)*r*0.6+0.12,Math.cos(a0)*r],[c[0],c[1]+Math.sin(a1)*r*0.6+0.12,Math.cos(a1)*r],o.glint,0);}oTri(M,[16.48,3.32,-0.42],[16.48,3.32,0.42],[16.48,2.85,0],o.glint,0);}
  else oLimb(M,[16.5,3.2,0],[16.47,3.2,0],0.38,0.38,14,o.glint,0);
  for(const [z0,z1] of [[-12.8,-2.8],[2.8,12.8]]){for(let z=z0;z<=z1+0.01;z+=(z1-z0)/4)oBox(M,16.7,0.7,z,0.14,1.1,0.14,tb,0);for(const y of [0.55,1.0])oBox(M,16.7,y,(z0+z1)/2,0.07,0.1,z1-z0,tl,0);}
  return M;}
// ---- ore hopper wagon on two bogies, after the long-haul ore trains: a tall ribbed steel box in rust-red paint with a heavy top
// chord, corner posts and a belt rail, sloping discharge hoppers underneath, centre-buffer couplers, cast bogie side frames with
// coil-spring nests, disc wheels, a handbrake wheel on the end wall, end and side ladders, grab irons and an air reservoir.
function oreWagonMesh(){const M=vmesh(),rs=[0.50,0.30,0.21],rd=[0.40,0.24,0.17],dk=[0.17,0.16,0.16],ir=[0.24,0.23,0.23],L=5.0,W=1.47,y0=1.3,y1=3.55,yc=(y0+y1)/2,h=y1-y0;
  // body: sides and ends, the inside floor, heavy top chord, belt rail, corner posts, closely spaced U-section stiffeners
  for(const z of [-1,1])vbox(M,[0,yc,z*W],[2*L,h,0.06],rs,0);for(const e of [-1,1])vbox(M,[e*L,yc,0],[0.06,h,2*W],rs,0);vbox(M,[0,1.72,0],[2*L-0.1,0.05,2*W-0.1],rd,3);
  for(const z of [-1,1]){vbox(M,[0,y1,z*(W+0.04)],[2*L+0.12,0.16,0.16],rd,0);vbox(M,[0,2.05,z*(W+0.04)],[2*L,0.1,0.08],rd,0);vbox(M,[0,y0+0.05,z*(W+0.03)],[2*L,0.18,0.12],rd,0);
    for(let x=-L+0.55;x<L-0.4;x+=0.82)vbox(M,[x,yc,z*(W+0.06)],[0.15,h-0.12,0.1],rd,0);}
  for(const e of [-1,1]){vbox(M,[e*(L+0.04),y1,0],[0.16,0.16,2*W+0.12],rd,0);for(const z of [-1,1])vbox(M,[e*(L-0.02),yc,z*(W-0.02)],[0.22,h+0.1,0.18],rd,0);for(const z of [-0.55,0.55])vbox(M,[e*(L+0.06),yc,z],[0.1,h-0.12,0.14],rd,0);}
  // underframe: centre sill, end sills, sloping discharge hoppers with doors and their levers, air reservoir, brake rods
  vbox(M,[0,1.0,0],[2*L+0.5,0.32,0.42],dk,3);for(const e of [-1,1])vbox(M,[e*(L+0.1),1.05,0],[0.22,0.42,2.6],dk,3);
  for(const x of [-1.35,1.35]){for(const z of [-1,1])vobox(M,[x,1.02,z*0.85],[1.15,0,0],[0,0.28,-z*0.32],[0,z*0.1,0.03],rd,0);vbox(M,[x,0.78,0],[1.8,0.08,0.9],dk,3);vbox(M,[x,0.9,1.0],[0.06,0.5,0.06],ir,1);}
  vcyl(M,[0,0.82,-0.62],'x',0.2,1.3,ir,1,10);for(const z of [-0.3,0.3])vbox(M,[0,0.72,z],[6.6,0.04,0.04],ir,1);
  // centre-buffer couplers with knuckles and air hoses, a step plate at each end
  for(const e of [-1,1]){vbox(M,[e*(L+0.45),0.98,0],[0.7,0.22,0.3],ir,1);vbox(M,[e*(L+0.82),0.98,0],[0.16,0.34,0.38],ir,1);vcyl(M,[e*(L+0.55),0.88,0.18],'x',0.035,0.5,dk,3,6);
    vbox(M,[e*(L+0.32),1.28,0],[0.44,0.05,2.3],ir,1);}
  // handbrake wheel on the A end wall, with its column and chain down to the frame
  {const cx=L+0.12,cy=2.75,cz=0.85,R=0.42;for(let k=0;k<14;k++){const a=k/14*6.2832;vbox(M,[cx,cy+Math.sin(a)*R,cz+Math.cos(a)*R],[0.05,0.2,0.2],ir,1);}for(let k=0;k<3;k++){const a=k/3*3.1416;vbox(M,[cx,cy,cz],[0.04,0.06+Math.abs(Math.sin(a))*0.8,0.06+Math.abs(Math.cos(a))*0.8],ir,1);}
    vcyl(M,[cx-0.05,cy,cz],'x',0.08,0.14,ir,1,8);vbox(M,[cx-0.06,(1.3+cy)/2,cz],[0.06,cy-1.3,0.06],ir,1);}
  // ladders: on the B end wall and up the side at the A end; grab irons
  {for(const e of [-0.24,0.24])vbox(M,[-(L+0.1),2.25,-0.8+e],[0.05,2.6,0.05],ir,1);for(let y=1.25;y<3.5;y+=0.38)vbox(M,[-(L+0.1),y,-0.8],[0.05,0.04,0.52],ir,1);
    for(const e of [-0.24,0.24])vbox(M,[L-0.7+e,2.25,W+0.16],[0.05,2.6,0.05],ir,1);for(let y=1.25;y<3.5;y+=0.38)vbox(M,[L-0.7,y,W+0.16],[0.52,0.04,0.05],ir,1);}
  for(const e of [-1,1])for(const z of [-1,1])vbox(M,[e*(L-0.35),1.55,z*(W+0.14)],[0.5,0.04,0.04],ir,1);
  // two bogies: cast side frames with pedestals, a nest of coil springs each side under the bolster, axleboxes, disc wheels on axles
  for(const bx of [-3.4,3.4]){vbox(M,[bx,0.86,0],[0.42,0.26,2.0],dk,3);
    for(const z of [-1,1]){const sz=z*0.95;vbox(M,[bx,0.64,sz],[2.5,0.16,0.14],dk,3);vbox(M,[bx,0.42,sz],[0.9,0.12,0.14],dk,3);for(const dx of [-1.05,1.05])vbox(M,[bx+dx,0.5,sz],[0.4,0.34,0.18],dk,3);
      for(const dx of [-0.22,0,0.22]){vcyl(M,[bx+dx,0.6,sz],'y',0.05,0.28,ir,1,6);for(let k=0;k<4;k++)vcyl(M,[bx+dx,0.5+k*0.065,sz],'y',0.085,0.03,ir,1,8);}}
    for(const dx of [-0.95,0.95]){vcyl(M,[bx+dx,0.46,0],'z',0.07,2.0,ir,1,8);for(const z of [-0.72,0.72])vwheel(M,bx+dx,0.46,z,0.46,dk);}}
  return M;}
// the ore in a hopper: a heaped load 1 m high (the draw stretches it to the fill), one per ore kind
function oreLoadMesh(kind){const M=vmesh(),o=ORE[kind],L=4.88,W=1.38;vbox(M,[0,0.4,0],[2*L,0.8,2*W],o.col,3);
  for(const z of [-1,1])vq(M,[-L,0.8,z*W],[L,0.8,z*W],[L*0.9,1.0,z*0.25],[-L*0.9,1.0,z*0.25],[0,0.9,z*0.4],o.col,3);vq(M,[-L*0.9,1.0,-0.25],[L*0.9,1.0,-0.25],[L*0.9,1.0,0.25],[-L*0.9,1.0,0.25],[0,1,0],o.col,3);
  for(const e of [-1,1])vq(M,[e*L,0.8,-W],[e*L,0.8,W],[e*L*0.9,1.0,0.25],[e*L*0.9,1.0,-0.25],[e,0.6,0],o.col,3);
  for(let k=0;k<9;k++){const x=-4+k,z=((k*37)%7-3)*0.3;vbox(M,[x,0.99,z*0.5],[0.12,0.04,0.12],o.glint,1);}return M;}
// ore loading station (station frame, yard on -z): a timber ore bunker on trestle bents spanning the track, a row of ore
// pockets with spouts between the bents (the one over a wagon opens and pours), a roof, an inclined covered conveyor gallery
// from the ore yard up to the bunker, lamps and a weigh hut
function oreYardMesh(){const M=vmesh(),tb=[0.34,0.26,0.19],tl=[0.47,0.36,0.26],ir=[0.24,0.24,0.26],rf=[0.36,0.33,0.31],dk=[0.2,0.19,0.18];
  for(let x=-20;x<=20.01;x+=4){for(const z of [-2.9,2.9]){vbox(M,[x,3.1,z],[0.32,6.6,0.32],tb,3);vbox(M,[x,-0.6,z],[0.7,0.9,0.7],[0.55,0.53,0.5],3);}vbox(M,[x,6.55,0],[0.34,0.3,6.4],tb,3);for(const e of [-1,1])vbeam(M,[x,4.9,e*2.9],[x,6.4,e*1.6],0.09,tb,3);}
  for(const z of [-2.9,2.9])vbox(M,[0,6.55,z],[41,0.3,0.3],tb,3);for(let x=-18;x<=18.01;x+=4)for(const z of [-2.9,2.9])vbeam(M,[x-2,1.2,z],[x+2,5.9,z],0.07,tb,3);
  vbox(M,[0,8.0,0],[41.2,2.6,5.6],tl,5);vbox(M,[0,6.8,0],[41.2,0.2,5.2],tb,3);for(let x=-20;x<=20.01;x+=2)for(const z of [-2.85,2.85])vbox(M,[x,8.0,z],[0.12,2.6,0.1],tb,3);
  for(const z of [-1,1])vq(M,[-21,9.3,z*3.1],[21,9.3,z*3.1],[21,10.6,0],[-21,10.6,0],[0,0.92,z*0.39],rf,3);for(const e of [-1,1])vt(M,[e*20.6,9.3,-2.8],[e*20.6,9.3,2.8],[e*20.6,10.6,0],[e,0,0],tl,3);
  for(let x=-18;x<=18.01;x+=4){vobox(M,[x,6.35,0],[0.7,0,0],[0,0.35,0],[0,0,0.7],dk,3);vbox(M,[x,5.35,0],[0.55,1.6,0.55],ir,1);vbox(M,[x+0.4,5.5,0.45],[0.05,0.9,0.05],ir,1);vbox(M,[x+0.4,5.95,0.6],[0.05,0.05,0.35],ir,1);}
  // inclined conveyor gallery from the ore yard (z -17, ground) up to the bunker side (z -3, y 8.8), on two trestles
  vobox(M,[0,4.6,-10.2],[0,4.2,7.0],[1.15,0,0],[0,0.68,-0.41],tl,3);vobox(M,[0,5.27,-10.6],[0,4.2,7.0],[1.3,0,0],[0,0.043,-0.026],rf,3);
  for(const [z,y] of [[-13.5,2.6],[-8.5,5.6]])for(const x of [-0.9,0.9])vbox(M,[x,(y-0.2)/2,z],[0.24,y+0.2,0.24],tb,3);
  for(const x of [-7,7]){vbox(M,[x,1.8,-5.4],[0.14,3.9,0.14],[0.15,0.2,0.17],1);vbox(M,[x,3.92,-5.4],[0.36,0.4,0.36],COL.lamp,4);vbox(M,[x,4.2,-5.4],[0.48,0.08,0.48],[0.15,0.2,0.17],1);}
  vbox(M,[-24.6,1.1,-6],[2.6,2.6,2.4],tl,3);vbox(M,[-24.6,2.48,-6],[3.0,0.14,2.8],[0.5,0.24,0.18],3);vbox(M,[-23.28,1.0,-6],[0.05,1.9,0.8],[0.3,0.2,0.13],3);
  return M;}
// the falling ore (1 m, stretched to the drop) and the yard stockpile (1 m high, stretched to the stock)
function oreStreamMesh(kind){const M=vmesh();vbox(M,[0,-0.5,0],[0.4,1,0.4],ORE[kind].col,3);return M;}
function oreHeapMesh(kind){const M=vmesh(),o=ORE[kind],n=10;for(let k=0;k<n;k++){const a0=k/n*6.2832,a1=(k+1)/n*6.2832,P=(a,r,y)=>[Math.cos(a)*r*1.6,y,Math.sin(a)*r];
    vq(M,P(a0,4,0),P(a1,4,0),P(a1,1.4,0.85),P(a0,1.4,0.85),[Math.cos(a0),0.7,Math.sin(a0)],o.col,3);vt(M,P(a0,1.4,0.85),P(a1,1.4,0.85),[0,1,0],[0,1,0],o.col,3);}return M;}
// tender engine, toyish but true to type: frames and footplate with red valances, splashers with brass beading over
// the drivers, banded boiler with handrails, smokebox with door, hinges and number plate, chimney with copper cap,
// brass dome and safety valves, sandboxes, cylinders with valve chests, a cab with spectacle windows and a glowing
// firehole, buffers and oil lamps. Wheel and rod animation hooks (anim arrays) are unchanged.
function locoMesh(){const M=vmesh(),o=-0.45,G=COL.green,B=COL.black,BR=COL.brass,RD=COL.red,S=COL.steel,CU=[0.80,0.42,0.22];
  // frames reach up to the footplate; the valances hang just below it (they used to overlap its edge and flicker)
  vbox(M,[o+0.5,1.16,0],[9.8,0.5,1.1],B,3);vbox(M,[o+1.4,1.45,0],[8.8,0.08,2.7],B,3);for(const z of [-1.33,1.33])vbox(M,[o+1.4,1.31,z],[8.8,0.2,0.04],RD,0);
  for(const x of [-2.6,-0.75,1.1])vcyl(M,[o+x,0.8,0],'z',0.09,1.5,B,3,8);for(const x of [3.4,4.5])vcyl(M,[o+x,0.45,0],'z',0.07,1.5,B,3,8);
  for(const x of [-2.6,-0.75,1.1])for(const z of [-0.72,0.72]){vwheel(M,o+x,0.8,z,0.8,COL.wheel);vbox(M,[o+x,1.6,z*1.25],[1.45,0.24,0.3],G,0);vbox(M,[o+x,1.73,z*1.25],[1.5,0.04,0.32],BR,1);}
  for(const x of [3.4,4.5])for(const z of [-0.72,0.72])vwheel(M,o+x,0.45,z,0.45,COL.wheel);
  for(const z of [-1.25,1.25]){vbox(M,[o-2.3,0.98,z],[0.5,0.04,0.28],B,3);vbox(M,[o-2.3,0.62,z],[0.5,0.04,0.28],B,3);vbox(M,[o-2.05,0.82,z],[0.04,0.7,0.04],B,3);vbox(M,[o-2.55,0.82,z],[0.04,0.7,0.04],B,3);}
  vcyl(M,[o+1.55,2.25,0],'x',0.82,6.1,G,0,20);for(const x of [-0.9,0.6,2.1,3.6])vcyl(M,[o+x,2.25,0],'x',0.84,0.07,BR,1,20,null,false);
  // handrail stanchions now reach from the boiler skin out to the rail (they used to float 15 cm off the boiler)
  for(const z of [-0.88,0.88]){vcyl(M,[o+1.9,2.78,z],'x',0.025,5.8,BR,1,6);for(const x of [-0.6,1.9,4.2])vbox(M,[o+x,2.77,Math.sign(z)*0.77],[0.03,0.03,0.24],BR,1);}
  vcyl(M,[o+5.1,2.25,0],'x',0.88,1.0,B,3,20);vbox(M,[o+5.1,1.62,0],[1.0,0.36,1.2],B,3);vcyl(M,[o+5.64,2.25,0],'x',0.74,0.04,S,1,20);vcyl(M,[o+5.68,2.25,0],'x',0.68,0.06,B,3,20);
  vbox(M,[o+5.74,2.25,0],[0.05,0.06,0.34],S,1);vbox(M,[o+5.73,2.25,0],[0.06,0.2,0.05],S,1);for(const y of [1.95,2.55])vbox(M,[o+5.72,y,-0.15],[0.03,0.07,0.8],S,1);vbox(M,[o+5.71,2.86,0],[0.03,0.16,0.52],BR,1);
  vcyl(M,[o+5.1,3.16,0],'y',0.38,0.2,B,3,12);vcyl(M,[o+5.1,3.56,0],'y',0.25,0.7,B,3,12);vcyl(M,[o+5.1,3.95,0],'y',0.34,0.14,CU,1,12);
  vcyl(M,[o+2.3,3.03,0],'y',0.44,0.22,G,0,12);vcyl(M,[o+2.3,3.3,0],'y',0.37,0.34,BR,1,12);vcyl(M,[o+2.3,3.5,0],'y',0.24,0.08,BR,1,10);
  vcyl(M,[o+0.15,3.1,0],'y',0.22,0.2,BR,1,10);for(const z of [-0.08,0.08])vcyl(M,[o+0.15,3.35,z],'y',0.05,0.32,BR,1,6);vcyl(M,[o-0.65,3.2,0.3],'y',0.045,0.44,BR,1,6);vcyl(M,[o-0.65,3.45,0.3],'y',0.07,0.1,BR,1,6);
  for(const z of [-0.95,0.95]){vbox(M,[o+3.05,1.72,z],[0.5,0.46,0.32],G,0);vbox(M,[o+3.05,1.97,z],[0.54,0.04,0.36],BR,1);}
  for(const z of [-1.05,1.05]){vcyl(M,[o+4.3,1.05,z],'x',0.33,1.2,G,0,14);for(const x of [3.68,4.92])vcyl(M,[o+x,1.05,z],'x',0.36,0.05,S,1,12);vbox(M,[o+4.3,1.5,z],[1.0,0.32,0.36],G,0);}
  const cx=o-2.4;vbox(M,[cx,1.53,0],[2.3,0.05,2.6],[0.35,0.25,0.15],7);
  // spectacle plate: solid either side of the two glazed windows (it used to leave open slots beside the glass)
  vbox(M,[o-1.25,2.1,0],[0.07,1.2,2.7],G,0);vbox(M,[o-1.25,3.45,0],[0.07,0.3,2.7],G,0);vbox(M,[o-1.25,3.0,0],[0.07,0.6,1.02],G,0);for(const z of [-1.14,1.14])vbox(M,[o-1.25,3.0,z],[0.07,0.6,0.42],G,0);
  for(const z of [-0.72,0.72]){vbox(M,[o-1.24,3.0,z],[0.02,0.6,0.42],COL.glass,2);vbox(M,[o-1.2,3.32,z],[0.03,0.04,0.46],BR,1);vbox(M,[o-1.2,2.69,z],[0.03,0.04,0.46],BR,1);}
  for(const z of [-1.33,1.33]){vbox(M,[cx,2.1,z],[2.3,1.2,0.06],G,0);vbox(M,[cx,3.45,z],[2.3,0.3,0.06],G,0);vbox(M,[o-1.45,3.0,z],[0.4,0.6,0.06],G,0);vbox(M,[o-3.35,3.0,z],[0.4,0.6,0.06],G,0);vbox(M,[cx,2.68,Math.sign(z)*1.37],[2.3,0.04,0.02],BR,1);}
  vbox(M,[cx,3.66,0],[2.9,0.1,2.95],COL.roof,3);vbox(M,[cx,3.74,0],[2.7,0.08,2.4],COL.roof,3);
  // backhead stands 2 cm proud of the boiler's end cap (they were coplanar and flickered in the cab view)
  vbox(M,[o-1.43,2.35,0],[0.18,1.5,1.5],B,3);vbox(M,[o-1.53,2.0,0],[0.03,0.38,0.5],[1,0.45,0.12],4);for(const z of [-0.32,0.32])vcyl(M,[o-1.54,3.0,z],'x',0.1,0.04,BR,1,10);vbox(M,[o-1.57,2.75,0.1],[0.06,0.06,0.5],BR,1);
  vbox(M,[o+5.75,1.3,0],[0.16,0.45,2.7],RD,0);for(const z of [-0.88,0.88]){vcyl(M,[o+6.05,1.25,z],'x',0.12,0.45,S,1,10);vcyl(M,[o+6.3,1.25,z],'x',0.24,0.05,S,1,12);}vbox(M,[o+5.95,1.15,0],[0.3,0.08,0.1],S,1);
  for(const z of [-0.9,0.9,0])vbox(M,[o+5.78,z===0?3.05:1.61,z===0?0:z],[0.2,0.24,0.2],COL.lamp,4);
  for(const [z,ty] of [[0.86,2],[-0.86,3]]){vbox(M,[o-0.75,0.8,z],[3.9,0.12,0.06],COL.steel,1,[ty,0.3,0,0.8]);vbox(M,[o+2.5,0.95,z*1.03],[3.0,0.1,0.06],COL.steel,1,[ty,0.3,0,0.8]);}
  return M;}
// frames reach down to the axles, axles run through to the axleboxes, and spring hangers tie the springs to the body
// (frames, axleboxes and springs used to float between the wheels)
function tenderMesh(){const M=vmesh(),G=COL.green,B=COL.black,BR=COL.brass,LN=[0.95,0.80,0.32];vbox(M,[0,0.9,0],[7,0.6,1.1],B,3);
  for(const x of [-2.2,0,2.2]){vcyl(M,[x,0.55,0],'z',0.08,2.1,B,3,8);for(const z of [-0.72,0.72]){vwheel(M,x,0.55,z,0.55,COL.wheel);vbox(M,[x,0.6,z*1.4],[0.34,0.36,0.12],B,3);vbox(M,[x,0.98,z*1.4],[1.1,0.08,0.1],B,3);for(const e of [-1,1])vbox(M,[x+e*0.5,1.11,z*1.4],[0.05,0.2,0.06],B,3);}}
  for(const z of [-1.33,1.33])vbox(M,[0,1.28,z],[7,0.24,0.06],COL.red,0);vbox(M,[0,2.05,0],[6.8,1.7,2.7],G,0);for(const z of [-1.36,1.36])vbox(M,[0.4,3.0,z],[5.8,0.22,0.08],G,0);
  vbox(M,[0.4,2.95,0],[5.6,0.35,2.6],COL.coal,3);vbox(M,[0.9,3.16,0],[3.6,0.28,1.9],COL.coal,3);vbox(M,[1.1,3.32,0],[1.8,0.18,1.2],COL.coal,3);
  for(const z of [-1.356,1.356]){for(const y of [1.45,2.7])vbox(M,[0,y,z],[6.3,0.04,0.01],LN,0);for(const x of [-3.15,3.15])vbox(M,[x,2.05,z],[0.04,1.34,0.01],LN,0);}
  vcyl(M,[-2.55,3.0,0.55],'y',0.26,0.22,B,3,10);for(const z of [-0.8,0.8])vbox(M,[-3.05,2.98,z],[0.5,0.26,0.6],B,3);for(const z of [-1.22,1.22])vcyl(M,[-3.44,2.3,z],'y',0.025,1.2,BR,1,6);
  for(const z of [-0.88,0.88]){vcyl(M,[-3.65,1.25,z],'x',0.12,0.4,COL.steel,1,10);vcyl(M,[-3.88,1.25,z],'x',0.24,0.05,COL.steel,1,12);}vbox(M,[-3.42,1.3,0],[0.14,0.4,2.7],COL.red,0);vbox(M,[-3.48,1.75,0.9],[0.18,0.2,0.18],COL.lamp,4);return M;}
// ---- DB class 01 Pacific (2'C1'h2, as 01 118) with its 2'2' T32 tender, and the two-axle HEA-style grain hopper (user's photos, Nov 2026).
// Real size: loco 14.6 m + tender 8.6 m over buffers (+0.7 m coupling = 23.9 m), driving wheels 2.0 m, bogie wheels 1.0 m, trailing 1.25 m.
// Moving parts (vertex anim types in VS_VEH): 1 turns with its wheel; 2/3 coupling rods (crank circle, left/right); 4 main rod; 5 crosshead,
// piston rod and union link; 6 eccentric rod; 7 expansion link; 8 radius rod; 9 combination lever (shear between union link and radius rod);
// 10 valve spindle (rigid, at the lever's height aAnim.z). aAnim.y = side (0 or 1 = a quarter turn later), aAnim.w = driving wheel radius.
// The rest geometry is built with every crank pin at its axle centre (the shader puts it on its circle), the cranked parts of a wheel at their
// angle for the wheel's side (phase 0 on +z, a quarter turn on -z).
function vob(M,c,X,Y,Z,col,mat,anim){const P=(i,j,k)=>[c[0]+X[0]*i+Y[0]*j+Z[0]*k,c[1]+X[1]*i+Y[1]*j+Z[1]*k,c[2]+X[2]*i+Y[2]*j+Z[2]*k],n=v=>{const l=Math.hypot(...v)||1;return[v[0]/l,v[1]/l,v[2]/l];},ng=v=>[-v[0],-v[1],-v[2]];
  vq(M,P(1,-1,-1),P(1,1,-1),P(1,1,1),P(1,-1,1),n(X),col,mat,anim);vq(M,P(-1,-1,1),P(-1,1,1),P(-1,1,-1),P(-1,-1,-1),ng(n(X)),col,mat,anim);
  vq(M,P(-1,1,-1),P(-1,1,1),P(1,1,1),P(1,1,-1),n(Y),col,mat,anim);vq(M,P(-1,-1,1),P(-1,-1,-1),P(1,-1,-1),P(1,-1,1),ng(n(Y)),col,mat,anim);
  vq(M,P(-1,-1,1),P(1,-1,1),P(1,1,1),P(-1,1,1),n(Z),col,mat,anim);vq(M,P(1,-1,-1),P(-1,-1,-1),P(-1,1,-1),P(1,1,-1),ng(n(Z)),col,mat,anim);}
// a bar in the x-y plane from p0 to p1 (both [x,y]) at depth z: w its height across, d its thickness in z
function vbar(M,p0,p1,z,w,d,col,mat,anim){const dx=p1[0]-p0[0],dy=p1[1]-p0[1],L=Math.hypot(dx,dy)||1e-6,u=[dx/L,dy/L];vob(M,[(p0[0]+p1[0])/2,(p0[1]+p1[1])/2,z],[u[0]*L/2,u[1]*L/2,0],[-u[1]*w/2,u[0]*w/2,0],[0,0,d/2],col,mat,anim);}
// a cylinder along any axis with as many sides as asked (vcyl stops at 10)
function vcylN(M,p0,p1,r0,r1,seg,col,mat,anim,caps){const ax=[p1[0]-p0[0],p1[1]-p0[1],p1[2]-p0[2]],L=Math.hypot(...ax),a=ax.map(v=>v/L),h=Math.abs(a[1])<0.9?[0,1,0]:[1,0,0];
  let u=[a[1]*h[2]-a[2]*h[1],a[2]*h[0]-a[0]*h[2],a[0]*h[1]-a[1]*h[0]];const ul=Math.hypot(...u);u=u.map(v=>v/ul);const w=[a[1]*u[2]-a[2]*u[1],a[2]*u[0]-a[0]*u[2],a[0]*u[1]-a[1]*u[0]];
  const D=k=>{const q=k/seg*6.28318;return[u[0]*Math.cos(q)+w[0]*Math.sin(q),u[1]*Math.cos(q)+w[1]*Math.sin(q),u[2]*Math.cos(q)+w[2]*Math.sin(q)];},at=(p,d,r)=>[p[0]+d[0]*r,p[1]+d[1]*r,p[2]+d[2]*r];
  for(let k=0;k<seg;k++){const d0=D(k),d1=D(k+1),dm=D(k+0.5);vq(M,at(p0,d0,r0),at(p0,d1,r0),at(p1,d1,r1),at(p1,d0,r1),dm,col,mat,anim);
    if(caps!==false){vt(M,p1,at(p1,d0,r1),at(p1,d1,r1),a,col,mat,anim);vt(M,p0,at(p0,d1,r0),at(p0,d0,r0),a.map(v=>-v),col,mat,anim);}}}
// a ring (annulus) in a plane z=const facing out (sg), from radius r0 to r1, angles a0..a1
function vring(M,cx,cy,z,r0,r1,a0,a1,seg,sg,col,mat,anim){for(let k=0;k<seg;k++){const q0=a0+(a1-a0)*k/seg,q1=a0+(a1-a0)*(k+1)/seg,P=(q,r)=>[cx+Math.cos(q)*r,cy+Math.sin(q)*r,z];
  if(sg>0)vq(M,P(q0,r0),P(q0,r1),P(q1,r1),P(q1,r0),[0,0,1],col,mat,anim);else vq(M,P(q0,r0),P(q1,r0),P(q1,r1),P(q0,r1),[0,0,-1],col,mat,anim);}}
// a spoked wheel: steel tyre, red rim, spokes, hub, a counterweight opposite the crank (driving wheels) and the crank boss
function vspoked(M,x,y,z,R,nsp,o){o=o||{};const sg=Math.sign(z)||1,A=[1,x,y,R*0+(o.drvR||R)],tc=[0.24,0.23,0.23],rc=o.col||[0.66,0.1,0.08],w=o.w||0.14,zo=z+sg*w/2,seg=o.seg||28,ph=o.ph||0;
  const An=[1,x,y,o.drvR||R];vcylN(M,[x,y,z-w/2],[x,y,z+w/2],R,R,seg,tc,1,An,false);vcylN(M,[x,y,z-w/2-0.012],[x,y,z+w/2],R*0.985,R*0.985,seg,tc,1,An,false);
  vcylN(M,[x,y,z-0.05],[x,y,z+0.05],R*0.94,R*0.94,seg,tc,1,An,false);vring(M,x,y,zo,R*0.86,R*0.985,0,6.28318,seg,sg,tc,1,An);vring(M,x,y,z-sg*w/2,R*0.86,R*0.985,0,6.28318,seg,-sg,tc,1,An);
  vring(M,x,y,zo+sg*0.004,R*0.8,R*0.87,0,6.28318,seg,sg,rc,0,An);vring(M,x,y,z-sg*(w/2+0.004),R*0.8,R*0.87,0,6.28318,seg,-sg,rc,0,An);
  if(!nsp){vring(M,x,y,zo+sg*0.004,R*0.18,R*0.81,0,6.28318,seg,sg,rc,0,An);vring(M,x,y,z-sg*(w/2+0.004),R*0.18,R*0.81,0,6.28318,seg,-sg,rc,0,An);}
  for(let k=0;k<nsp;k++){const q=ph+k/nsp*6.28318,c=Math.cos(q),s=Math.sin(q),r0=R*0.2,r1=R*0.82,rm=(r0+r1)/2,tw=R*(o.drvR?0.055:0.08);
    vob(M,[x+c*rm,y+s*rm,z+sg*0.02],[c*(r1-r0)/2,s*(r1-r0)/2,0],[-s*tw/2,c*tw/2,0],[0,0,0.045],rc,0,An);}
  vcylN(M,[x,y,z-0.11*sg],[x,y,z+sg*(w/2+0.06)],R*0.2,R*0.18,14,rc,0,An);vcylN(M,[x,y,z+sg*(w/2+0.06)],[x,y,z+sg*(w/2+0.1)],R*0.1,R*0.08,10,[0.3,0.29,0.29],1,An);
  if(o.cw){const q0=ph+Math.PI-o.cw/2,q1=ph+Math.PI+o.cw/2;vring(M,x,y,zo+sg*0.03,R*0.3,R*0.8,q0,q1,8,sg,rc,0,An);vring(M,x,y,zo-sg*0.07,R*0.3,R*0.8,q0,q1,8,-sg,rc,0,An);
    for(const [q,e] of [[q0,-1],[q1,1]]){const c=Math.cos(q),s=Math.sin(q);vob(M,[x+c*R*0.55,y+s*R*0.55,zo-sg*0.02],[c*R*0.25,s*R*0.25,0],[-s*0.01,c*0.01,0],[0,0,0.05],rc,0,An);}}
  if(o.crank){const c=Math.cos(ph),s=Math.sin(ph),px=x+c*o.crank,py=y+s*o.crank;vcylN(M,[px,py,zo],[px,py,zo+sg*0.07],0.17,0.17,12,rc,0,An);vcylN(M,[px,py,zo+sg*0.07],[px,py,zo+sg*(o.pin||0.2)],0.075,0.075,10,[0.62,0.63,0.66],1,An);}}
// the seven-segment number plate figures ("01 118"): plate centre c in the plane facing n (+x front or ±z side), figure height h
function vplate(M,c,face,txt,h,plate,fig){const W=txt.length*h*0.62+h*0.65,u=face==='x'?[0,0,-1]:face==='-x'?[0,0,1]:face==='z'?[1,0,0]:[-1,0,0],n=face==='x'?[1,0,0]:face==='-x'?[-1,0,0]:face==='z'?[0,0,1]:[0,0,-1],P=(a,b,o)=>[c[0]+u[0]*a+n[0]*o,c[1]+b,c[2]+u[2]*a+n[2]*o];
  vob(M,P(0,0,-0.01),[u[0]*W/2,0,u[2]*W/2],[0,h*0.8,0],[n[0]*0.012,0,n[2]*0.012],plate,3);vob(M,P(0,0,-0.014),[u[0]*(W/2+0.02),0,u[2]*(W/2+0.02)],[0,h*0.8+0.02,0],[n[0]*0.008,0,n[2]*0.008],fig,1);
  const SEG={0:'abcdef',1:'bc',8:'abcdefg'},sw=h*0.42,st=h*0.09;let a=-W/2+h*0.45;for(const ch of txt){if(ch===' '){a+=h*0.45;continue;}const S=SEG[ch]||'';
    const bar=(x0,y0,x1,y1)=>vob(M,P(a+(x0+x1)/2,(y0+y1)/2,0.008),[u[0]*(Math.abs(x1-x0)/2+st/2),0,u[2]*(Math.abs(x1-x0)/2+st/2)],[0,Math.abs(y1-y0)/2+st/2,0],[n[0]*0.006,0,n[2]*0.006],fig,1);
    if(S.includes('a'))bar(0,h/2,sw,h/2);if(S.includes('g'))bar(0,0,sw,0);if(S.includes('d'))bar(0,-h/2,sw,-h/2);if(S.includes('b'))bar(sw,0,sw,h/2);if(S.includes('c'))bar(sw,-h/2,sw,0);if(S.includes('f'))bar(0,0,0,h/2);if(S.includes('e'))bar(0,-h/2,0,0);a+=h*0.62;}}
// a prism along x from x0 to x1 whose cross-section (y,z) is the convex hull of circles [[y,z,r],...]: the lagged cylinder + valve chest casing
function vhull(M,x0,x1,circ,col,mat,seg){seg=seg||20;const pts=[];for(const [y,z,r] of circ)for(let k=0;k<seg;k++){const q=k/seg*6.28318;pts.push([y+Math.sin(q)*r,z+Math.cos(q)*r]);}
  pts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],up=[];
  for(const p of pts){while(lo.length>1&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p);}for(let i=pts.length-1;i>=0;i--){const p=pts[i];while(up.length>1&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p);}
  const H=lo.slice(0,-1).concat(up.slice(0,-1)),n=H.length;let cy=0,cz=0;for(const p of H){cy+=p[0];cz+=p[1];}cy/=n;cz/=n;
  for(let i=0;i<n;i++){const a=H[i],b=H[(i+1)%n],my=(a[0]+b[0])/2-cy,mz=(a[1]+b[1])/2-cz,l=Math.hypot(my,mz)||1;vq(M,[x0,a[0],a[1]],[x1,a[0],a[1]],[x1,b[0],b[1]],[x0,b[0],b[1]],[0,my/l,mz/l],col,mat);
    vt(M,[x1,cy,cz],[x1,a[0],a[1]],[x1,b[0],b[1]],[1,0,0],col,mat);vt(M,[x0,cy,cz],[x0,b[0],b[1]],[x0,a[0],a[1]],[-1,0,0],col,mat);}}
// a ring of bolt heads on a cover facing +x/-x (sg) at x
function vbolts(M,x,y,z,r,n,sg,col){for(let k=0;k<n;k++){const q=k/n*6.28318;vcylN(M,[x,y+Math.sin(q)*r,z+Math.cos(q)*r],[x+sg*0.04,y+Math.sin(q)*r,z+Math.cos(q)*r],0.028,0.028,6,col,1);}}
// a plate on a side face (z = const, facing sg): text lines as thin bars (a stand-in for lettering)
function vsign(M,x,y,z,sg,w,h,plate,ink,lines){vbox(M,[x,y,z],[w,h,0.012],plate,3);vbox(M,[x,y,z+sg*0.004],[w-0.03,h-0.03,0.008],plate,3);
  for(const e of [-1,1]){vbox(M,[x,y+e*(h/2-0.02),z+sg*0.008],[w-0.02,0.012,0.006],ink,1);vbox(M,[x+e*(w/2-0.02),y,z+sg*0.008],[0.012,h-0.02,0.006],ink,1);}
  (lines||[]).forEach(([dy,lw])=>vbox(M,[x,y+dy,z+sg*0.009],[lw,h*0.12,0.006],ink,1));}
// DB class 01 (01 118) after the user's photos: cab far back over the trailing axle with a long firebox ahead of it, a red air reservoir under
// the running board between the rear driver and the trailing wheel, big lagged cylinder blocks with bolted covers and the Krupp plate,
// red rods, Wagner smoke deflectors, a cab roof with its ventilator, gold number plates. Loco 15.2 m over buffers (front +7.6).
const G01={cx:0,cy:1.0,r:0.33,L:3.6,e:0.2,off:-1.5708,piv:[2.6,1.82],foot:0.42,die:0.26,yb:0.72,yt:1.98,R:1.0,drv:[2.3,0,-2.3],bog:[6.05,3.85],trail:-6.2,lever:4.08,valveY:1.86};
function loco01Mesh(){const M=vmesh(),G=G01,BK=[0.1,0.1,0.11],BK2=[0.14,0.14,0.15],RD=[0.68,0.1,0.08],RD2=[0.55,0.08,0.06],ST=[0.62,0.63,0.66],ST2=[0.4,0.4,0.42],BR=[0.85,0.68,0.32],GD=[0.88,0.72,0.36],CR=[0.92,0.9,0.84],LMP=COL.lamp,GL=COL.glass,
    BY=3.05,BR0=0.98,RB=2.25,C0=-5.2,C1=-7.25,CB=1.72,CW=4.05,CR0=4.3;// boiler axis and radius, running board, cab front/rear/bottom/wall top/roof
  // ---- frames, buffer beams, buffers, couplings, life guards
  for(const z of [-0.6,0.6]){vbox(M,[0.0,1.55,z],[14.6,0.5,0.1],RD,0);vbox(M,[5.0,1.12,z],[4.6,0.36,0.1],RD,0);vbox(M,[0.0,1.12,z],[5.6,0.3,0.1],RD,0);vbox(M,[-5.4,1.2,z],[3.6,0.36,0.1],RD,0);}
  for(const x of [5.4,3.1,1.15,-1.15,-3.4,-5.0,-6.9])vbox(M,[x,1.5,0],[0.14,0.6,1.2],RD,0);
  for(const e of [1,-1]){const xb=e*7.12;vbox(M,[xb,1.12,0],[0.22,0.5,e>0?3.0:2.8],RD,0);if(e>0)for(const z of [-1,1])vbox(M,[xb+0.08,1.12,z*1.36],[0.06,0.5,0.2],BK,3);
    for(const z of [-0.875,0.875]){const x0=e*7.23;vcylN(M,[x0,1.06,z],[x0+e*0.17,1.06,z],0.17,0.15,12,BK,3);vcylN(M,[x0+e*0.17,1.06,z],[x0+e*0.32,1.06,z],0.085,0.085,10,ST,1);vcylN(M,[x0+e*0.32,1.06,z],[x0+e*0.37,1.06,z],0.22,0.22,16,ST2,1);}
    vbox(M,[e*7.32,1.0,0],[0.2,0.14,0.12],BK,3);vbar(M,[e*7.35,1.0],[e*7.56,0.95],0,0.1,0.1,BK,3);for(const z of [-0.35,0.35]){vcylN(M,[e*7.2,1.0,z],[e*7.4,0.6,z*1.2],0.035,0.035,6,BK,3);vcylN(M,[e*7.4,0.6,z*1.2],[e*7.44,0.55,z*1.2],0.05,0.05,6,RD,0);}}
  for(const z of [-0.72,0.72])vbar(M,[6.9,0.95],[6.85,0.12],z,0.1,0.06,RD,0);vbox(M,[7.25,0.75,0],[0.06,0.1,2.1],BK2,3);for(const z of [-1.1,1.1]){vbox(M,[7.22,0.72,z],[0.3,0.04,0.3],BK2,3);vbar(M,[7.15,1.0],[7.2,0.72],z,0.04,0.04,BK2,3);}
  // ---- running boards: along the boiler at RB with a red edge, down in a curve at the front onto the front platform; front platform over the beam
  for(const z of [-1,1]){const zz=z*1.32;vbox(M,[-0.6,RB,zz],[9.2,0.05,0.5],BK2,3);vbox(M,[-0.6,RB-0.07,z*1.565],[9.2,0.14,0.025],RD,0);
    const pts=[[3.9,RB],[5.7,RB],[5.95,RB-0.12],[6.15,RB-0.4],[6.32,1.66],[7.0,1.6]];for(let i=0;i+1<pts.length;i++){const a=pts[i],b=pts[i+1];vbar(M,a,b,zz,0.05,0.5,BK2,3);vbar(M,[a[0],a[1]-0.08],[b[0],b[1]-0.08],z*1.565,0.14,0.025,RD,0);}}
  vbox(M,[6.65,1.6,0],[0.9,0.05,2.6],BK2,3);vbox(M,[5.9,1.95,0],[0.7,0.6,1.6],BK,3);vbox(M,[7.0,1.42,0],[0.2,0.3,2.9],RD,0);
  // ---- Wagner smoke deflectors (rounded top front corner), their stays and the hand holes
  for(const z of [-1,1]){const zz=z*1.53,X0=4.55,X1=7.15,Y0=RB+0.03,Y1=4.08,rc=0.5,P=[[X0,Y0],[X1,Y0],[X1,Y1-rc]];for(let k=1;k<=6;k++){const q=k/6*Math.PI/2;P.push([X1-rc+Math.cos(q)*rc,Y1-rc+Math.sin(q)*rc]);}P.push([X0,Y1]);
    for(let i=1;i+1<P.length;i++){vt(M,[P[0][0],P[0][1],zz],[P[i][0],P[i][1],zz],[P[i+1][0],P[i+1][1],zz],[0,0,z],BK,3);vt(M,[P[0][0],P[0][1],zz-z*0.02],[P[i+1][0],P[i+1][1],zz-z*0.02],[P[i][0],P[i][1],zz-z*0.02],[0,0,-z],BK,3);}
    for(let i=2;i+1<P.length;i++)vbar(M,P[i],P[i+1],zz-z*0.01,0.035,0.05,BK2,3);vbox(M,[(X0+X1)/2,Y1,zz-z*0.01],[X1-X0-rc,0.035,0.05],BK2,3);
    for(const x of [4.9,6.6])vbox(M,[x,3.3,z*1.27],[0.06,0.06,0.5],BK,3);for(const x of [5.6,6.0])vbox(M,[x,2.6,zz+z*0.004],[0.3,0.12,0.004],[0.02,0.02,0.02],3);}
  // ---- boiler: barrel with cladding bands, the wide firebox down to the running board behind the drivers, washout covers, pipes, handrails
  vcylN(M,[C0,BY,0],[4.75,BY,0],BR0,BR0,32,BK,1);for(const x of [-3.9,-2.2,-0.6,1.0,2.6,4.1])vcylN(M,[x-0.025,BY,0],[x+0.025,BY,0],BR0+0.012,BR0+0.012,32,[0.17,0.17,0.18],1,null,false);
  vbox(M,[(C0-3.3)/2,RB+0.45,0],[C0+3.3,0.9,2.1],BK,1);for(const z of [-1,1]){vbox(M,[(C0-3.3)/2,RB+0.9,z*0.99],[C0+3.3,0.06,0.14],BK2,1);
    for(const x of [-3.6,-4.15,-4.7]){vcylN(M,[x,3.6,z*0.8],[x,3.75,z*0.92],0.17,0.12,12,BK,1);}
    vcylN(M,[C0,3.55,z*0.9],[6.4,3.55,z*0.9],0.022,0.022,6,ST,1);for(const x of [-4.5,-2.0,0.5,3.0,5.6])vbox(M,[x,3.53,z*0.95],[0.03,0.03,0.12],ST,1);
    vcylN(M,[C0,2.62,z*1.0],[4.4,2.62,z*1.0],0.045,0.045,8,BK2,1);vcylN(M,[C0,2.8,z*0.98],[3.0,2.8,z*0.98],0.03,0.03,6,BK2,1);vcylN(M,[-1.0,3.95,z*0.45],[-1.6,3.25,z*0.94],0.04,0.04,8,BK2,1);
    vcylN(M,[2.2,3.9,z*0.4],[2.2,2.4,z*1.0],0.03,0.03,6,BK2,1);vcylN(M,[2.2,2.4,z*1.0],[1.6,1.25,z*1.05],0.03,0.03,6,BK2,1);
    // the tall black box beside the firebox at the cab front (injector / feed-water pump housing), with a rounded top
    vbox(M,[C0+0.38,2.8,z*1.25],[0.62,1.1,0.36],BK,1);vcylN(M,[C0+0.07,3.35,z*1.25],[C0+0.69,3.35,z*1.25],0.18,0.18,12,BK,1);}
  // smokebox, the dished door with hinges, handwheel and dart, number plate, rivets, lamp irons
  const SX0=4.75,SX1=6.95;vcylN(M,[SX0,BY,0],[SX1,BY,0],1.03,1.03,32,BK,3);vcylN(M,[SX0-0.05,BY,0],[SX0+0.05,BY,0],1.06,1.06,32,BK2,1);vbox(M,[5.85,1.95,0],[2.2,0.3,1.7],BK,3);
  vcylN(M,[SX1,BY,0],[SX1+0.05,BY,0],1.04,1.04,32,BK2,1);vcylN(M,[SX1+0.05,BY,0],[SX1+0.14,BY,0],0.92,0.85,32,BK,1);vcylN(M,[SX1+0.14,BY,0],[SX1+0.2,BY,0],0.24,0.2,16,BK2,1);
  vcylN(M,[SX1+0.2,BY,0],[SX1+0.26,BY,0],0.06,0.06,8,ST,1);vcylN(M,[SX1+0.24,BY,0],[SX1+0.26,BY,0],0.3,0.3,16,ST2,1,null,false);for(let k=0;k<6;k++){const q=k/6*6.283;vob(M,[SX1+0.25,BY+Math.sin(q)*0.15,Math.cos(q)*0.15],[0.01,0,0],[0,Math.sin(q)*0.15,0],[0,0,0.015],ST2,1);}
  vbar(M,[SX1+0.22,BY+0.35],[SX1+0.22,BY-0.05],0,0.05,0.05,ST2,1);for(const y of [BY+0.5,BY-0.5])vbox(M,[SX1+0.1,y,-0.5],[0.04,0.08,0.8],BK2,1);vbox(M,[SX1+0.1,BY,-0.94],[0.08,1.3,0.1],BK2,1);
  for(let k=0;k<16;k++){const q=k/16*6.283;vcylN(M,[SX1+0.04,BY+Math.sin(q)*0.97,Math.cos(q)*0.97],[SX1+0.07,BY+Math.sin(q)*0.97,Math.cos(q)*0.97],0.022,0.022,6,BK2,1);}
  vplate(M,[SX1+0.15,BY-0.58,0],'x','01 118',0.12,[0.05,0.05,0.05],CR);
  // chimney, feed-water dome, sand dome, steam dome, safety valves, whistle
  vcylN(M,[5.9,3.75,0],[5.9,4.52,0],0.36,0.34,20,BK,3);vcylN(M,[5.9,4.52,0],[5.9,4.6,0],0.4,0.4,20,BK,3);vcylN(M,[5.9,4.0,0],[5.9,4.6,0],0.3,0.3,16,[0.03,0.03,0.03],3,null,false);
  vcylN(M,[4.15,3.8,0],[4.15,4.08,0],0.32,0.3,18,BK,3);vcylN(M,[4.15,4.08,0],[4.15,4.15,0],0.2,0.12,14,BK,3);
  for(const [x,r,h] of [[2.35,0.48,0.62],[0.4,0.52,0.66]]){vcylN(M,[x,3.6,0],[x,3.87+h*0.55,0],r,r*0.97,20,BK,1);vcylN(M,[x,3.87+h*0.55,0],[x,3.87+h*0.7,0],r*0.97,r*0.72,20,BK,1);vcylN(M,[x,3.87+h*0.7,0],[x,3.87+h*0.74,0],r*0.72,r*0.3,20,BK,1);}
  for(const z of [-0.14,0.14]){vcylN(M,[-1.4,3.9,z],[-1.4,4.24,z],0.07,0.06,10,BR,1);vcylN(M,[-1.4,4.24,z],[-1.4,4.32,z],0.09,0.09,10,BR,1);}
  vcylN(M,[-2.0,3.95,0.25],[-2.0,4.3,0.25],0.04,0.04,8,BR,1);vcylN(M,[-2.0,4.3,0.25],[-2.0,4.52,0.25],0.09,0.08,12,BR,1);vcylN(M,[-2.0,4.52,0.25],[-2.0,4.56,0.25],0.11,0.02,12,BR,1);
  // air pump (right) and feed pump (left) beside the smokebox, lubricators on the running board
  vcylN(M,[4.15,RB,-1.38],[4.15,3.25,-1.38],0.19,0.19,14,BK,3);vcylN(M,[4.15,3.25,-1.38],[4.15,3.85,-1.38],0.14,0.14,14,BK,3);vcylN(M,[4.15,3.85,-1.38],[4.15,3.95,-1.38],0.17,0.17,14,BK2,1);vcylN(M,[4.15,2.72,-1.38],[4.15,2.79,-1.38],0.22,0.22,14,BK2,1);
  vbox(M,[4.0,2.7,1.38],[0.55,0.75,0.32],BK,3);vcylN(M,[4.0,RB+0.05,1.38],[4.0,3.15,1.38],0.15,0.15,12,BK2,1);for(const z of [-1.28,1.28])vbox(M,[3.1,RB+0.22,z],[0.55,0.4,0.3],BK,3);
  // headlamps: two on the front platform beside the deflectors, one on the smokebox top
  for(const [x,y,z] of [[7.0,1.9,1.12],[7.0,1.9,-1.12],[6.85,4.15,0]]){vbox(M,[x-0.08,y,z],[0.26,0.3,0.3],BK,3);vcylN(M,[x+0.05,y,z],[x+0.08,y,z],0.12,0.12,14,LMP,4);vcylN(M,[x+0.05,y,z],[x+0.09,y,z],0.135,0.135,14,BK2,1,null,false);vbox(M,[x-0.08,y+0.2,z],[0.14,0.1,0.14],BK,3);}
  // ---- cylinder blocks: one lagged casing round the cylinder and the valve chest above it, bolted covers, the valve chest tail tube,
  //      the Krupp builder's plate and the round inspection cover, drain cocks
  for(const z of [-1,1]){const zc=z*1.13,X0=4.32,X1=5.62,yc=1.02,yv=G.valveY;vhull(M,X0,X1,[[yc,zc,0.5],[yv,zc,0.36]],BK,1,24);
    for(const [x,sg] of [[X1,1],[X0,-1]]){vcylN(M,[x,yc,zc],[x+sg*0.07,yc,zc],0.46,0.46,24,BK2,1);vbolts(M,x+sg*0.07,yc,zc,0.38,12,sg,BK2);vcylN(M,[x+sg*0.07,yc,zc],[x+sg*0.13,yc,zc],0.25,0.22,16,BK2,1);
      vcylN(M,[x,yv,zc],[x+sg*0.06,yv,zc],0.33,0.33,20,BK2,1);vbolts(M,x+sg*0.06,yv,zc,0.27,10,sg,BK2);}
    vcylN(M,[X1+0.06,yv,zc],[X1+0.42,yv,zc],0.1,0.1,12,BK,1);vcylN(M,[X1+0.42,yv,zc],[X1+0.47,yv,zc],0.13,0.13,12,BK2,1);vcylN(M,[X0-0.13,yc,zc],[X0-0.3,yc,zc],0.12,0.1,12,BK2,1);
    const zs=zc+z*0.5;vsign(M,4.97,1.48,zs+z*0.01,z,0.42,0.26,[0.72,0.12,0.09],[0.92,0.88,0.78],[[0.06,0.3],[0,0.22],[-0.06,0.26]]);
    vring(M,4.97,1.05,zs+z*0.012,0.2,0.215,0,6.28318,16,z,[0.03,0.03,0.03],3);for(const x of [4.5,5.45]){vcylN(M,[x,0.55,zc],[x,0.38,zc],0.03,0.03,6,ST2,1);}
    // slide bars (top and bottom) from the back cover to the bar bracket
    for(const y of [0.84,1.2])vbox(M,[(2.95+X0)/2,y,zc],[X0-2.95,0.09,0.14],ST,1);vbox(M,[2.95,1.02,zc*0.96],[0.14,0.6,0.4],RD,0);
    // the expansion link's bracket on the frame
    vbox(M,[G.piv[0]+0.32,G.piv[1],z*1.22],[0.64,0.16,0.1],RD,0);vbar(M,[G.piv[0]+0.55,G.piv[1]],[G.piv[0]+0.75,1.45],z*1.15,0.14,0.08,RD,0);}
  // ---- wheels: bogie (two axles, 1.0 m), coupled (three axles, 2.0 m, 20 spokes, counterweights, crank bosses), trailing (1.25 m)
  for(const x of G.bog){vcylN(M,[x,0.5,-0.8],[x,0.5,0.8],0.07,0.07,8,BK,3,[1,x,0.5,0.5]);for(const z of [-0.72,0.72])vspoked(M,x,0.5,z,0.5,12,{w:0.13,seg:22});}
  {const bc=(G.bog[0]+G.bog[1])/2;for(const z of [-1,1]){vbox(M,[bc,0.55,z*0.98],[2.9,0.22,0.08],RD,0);for(const x of G.bog)vbox(M,[x,0.5,z*0.98],[0.36,0.36,0.14],RD,0);vbox(M,[bc,0.82,z*0.98],[1.2,0.1,0.12],BK,3);}vbox(M,[bc,0.75,0],[0.5,0.25,1.8],RD,0);}
  G.drv.forEach((x,i)=>{vcylN(M,[x,1.0,-0.8],[x,1.0,0.8],0.1,0.1,10,BK,3,[1,x,1.0,1.0]);for(const z of [-0.72,0.72]){const ph=z>0?0:Math.PI/2;vspoked(M,x,1.0,z,1.0,20,{w:0.14,seg:36,drvR:1.0,cw:i===1?1.7:1.0,crank:G.r,ph,pin:i===1?0.34:0.2,col:RD});}});
  {const x=G.trail;vcylN(M,[x,0.625,-0.8],[x,0.625,0.8],0.08,0.08,8,BK,3,[1,x,0.625,0.625]);for(const z of [-0.72,0.72])vspoked(M,x,0.625,z,0.625,14,{w:0.13,seg:24});
    for(const z of [-1,1]){vbox(M,[x,0.68,z*1.05],[0.46,0.46,0.18],RD,0);vcylN(M,[x,0.68,z*1.14],[x,0.68,z*1.2],0.15,0.15,12,RD,0);vbar(M,[x+0.3,0.9],[x+2.4,1.25],z*0.86,0.22,0.08,RD,0);vbox(M,[x,1.05,z*1.05],[1.2,0.1,0.1],RD,0);
      vcylN(M,[x-0.35,1.1,z*1.05],[x-0.35,0.55,z*1.05],0.1,0.1,10,RD2,0);vcylN(M,[x+0.35,1.1,z*1.05],[x+0.35,0.55,z*1.05],0.1,0.1,10,RD2,0);}}
  // brake hangers and shoes, sand pipes, axleboxes and springs on the coupled wheels
  for(const x of G.drv)for(const z of [-0.72,0.72]){vbar(M,[x-1.0,0.9],[x-1.08,1.25],z,0.12,0.1,BK,3);vbar(M,[x-1.08,1.25],[x-1.0,1.7],z,0.05,0.05,BK,3);vcylN(M,[x+0.4,1.7,z*1.05],[x+0.92,0.18,z],0.025,0.025,6,BK2,1);}
  for(const x of G.drv)for(const z of [-0.6,0.6]){vbox(M,[x,1.0,z],[0.42,0.48,0.16],RD,0);vbox(M,[x,0.62,z],[1.1,0.1,0.14],BK,3);}
  // ---- the main air reservoir under the running board between the rear driver and the trailing wheel; brake valve and pipes
  for(const z of [-1,1]){const zr=z*1.18,xa=-3.45,xb=-5.55;vcylN(M,[xb,1.32,zr],[xa,1.32,zr],0.3,0.3,20,RD,0,null,false);for(const [x,sg] of [[xa,1],[xb,-1]])vcylN(M,[x,1.32,zr],[x+sg*0.12,1.32,zr],0.3,0.12,16,RD,0);
    for(const x of [-3.8,-5.2])vbox(M,[x,1.7,zr],[0.1,0.4,0.08],RD,0);vcylN(M,[xa+0.2,1.62,zr],[xa+0.4,2.05,zr*0.95],0.03,0.03,6,RD,0);vcylN(M,[-3.1,RB-0.2,z*1.3],[-5.6,RB-0.2,z*1.3],0.03,0.03,6,RD,0);
    vbox(M,[-4.5,0.4,z*1.1],[0.55,0.1,0.35],RD,0);vbox(M,[-4.5,0.56,z*1.1],[0.4,0.2,0.25],[0.8,0.78,0.74],0);}
  // ---- rods: coupling rods (2/3) and main rod (4) red; crosshead, piston rod, union link (5) steel; return crank (1) red; eccentric rod (6) red;
  //      expansion link (7), radius rod (8), combination lever (9) and valve spindle (10) bright steel
  for(const z of [-1,1]){const sd=z>0?0:1,ty=z>0?2:3,ph=z>0?0:Math.PI/2,zr=z*0.98;
    vbar(M,[G.drv[0],1.0],[G.drv[2],1.0],zr,0.17,0.07,RD,0,[ty,G.r,0,G.R]);for(const x of G.drv)vcylN(M,[x,1.0,zr-0.05*z],[x,1.0,zr+0.05*z],0.15,0.15,12,RD,0,[ty,G.r,0,G.R]);
    const zm=z*1.1,A4=[4,sd,0,G.R],xc=G.cx+G.L;vbar(M,[G.cx,G.cy],[xc,G.cy],zm,0.22,0.07,RD,0,A4);vcylN(M,[G.cx,G.cy,zm-0.05*z],[G.cx,G.cy,zm+0.05*z],0.2,0.2,14,RD,0,A4);vcylN(M,[xc,G.cy,zm-0.05*z],[xc,G.cy,zm+0.05*z],0.12,0.12,10,RD,0,A4);
    const A5=[5,sd,0,G.R],zc=z*1.13;vbox(M,[xc+0.05,G.cy+0.02,zc],[0.5,0.27,0.24],ST2,1,A5);vcylN(M,[xc+0.3,G.cy+0.02,zc],[4.35,G.cy+0.02,zc],0.055,0.055,10,ST,1,A5);vbox(M,[xc+0.05,0.8,z*1.2],[0.08,0.32,0.06],ST2,1,A5);
    vbar(M,[xc+0.05,G.yb],[G.lever,G.yb],z*1.25,0.07,0.05,ST,1,A5);
    {const rc=[G.cx+Math.cos(ph+G.off)*G.e,G.cy+Math.sin(ph+G.off)*G.e],pn=[G.cx+Math.cos(ph)*G.r,G.cy+Math.sin(ph)*G.r];vbar(M,pn,rc,z*1.22,0.14,0.07,RD,0,[1,G.cx,G.cy,G.R]);vcylN(M,[rc[0],rc[1],z*1.19],[rc[0],rc[1],z*1.29],0.07,0.07,10,ST,1,[1,G.cx,G.cy,G.R]);}
    const A6=[6,sd,0,G.R],B0=[G.piv[0],G.piv[1]-G.foot];vbar(M,[G.cx,G.cy],B0,z*1.27,0.1,0.05,RD,0,A6);
    const A7=[7,sd,0,G.R];vbar(M,[G.piv[0],G.piv[1]-G.foot-0.05],[G.piv[0],G.piv[1]+0.45],z*1.27,0.15,0.07,ST,1,A7);vcylN(M,[G.piv[0],G.piv[1],z*1.2],[G.piv[0],G.piv[1],z*1.34],0.06,0.06,8,ST2,1);
    vbar(M,[G.piv[0],G.piv[1]+G.die],[G.lever,G.yt],z*1.32,0.09,0.05,ST,1,[8,sd,0,G.R]);
    vbar(M,[G.lever,G.yb-0.05],[G.lever,G.yt+0.12],z*1.28,0.11,0.06,ST,1,[9,sd,0,G.R]);
    vcylN(M,[G.lever,G.valveY,zc],[4.32,G.valveY,zc],0.035,0.035,8,ST,1,[10,sd,G.valveY,G.R]);vbox(M,[G.lever+0.1,G.valveY,zc],[0.2,0.1,0.1],ST2,1,[10,sd,G.valveY,G.R]);
    vcylN(M,[C0,RB-0.15,z*1.3],[G.piv[0],RB-0.25,z*1.3],0.025,0.025,6,RD,0);}
  // ---- cab: front wall with spectacle windows, side walls (lower panel to the cab bottom), the glazed front side window and the open
  //      driver's window, the roof with its overhang and ventilator, number plates and lettering, steps, handrails; inside: backhead, seats
  vbox(M,[C0-0.03,(RB+3.4)/2,0],[0.06,3.4-RB,2.98],BK,3);vbox(M,[C0-0.03,(3.86+CW)/2,0],[0.06,CW-3.86,2.98],BK,3);
  for(const z of [-1,1]){vbox(M,[C0-0.03,3.63,z*0.28],[0.06,0.46,0.36],BK,3);vbox(M,[C0-0.03,3.63,z*1.37],[0.06,0.46,0.22],BK,3);vbox(M,[C0-0.02,3.63,z*0.83],[0.03,0.46,0.74],GL,2);
    for(const e of [-1,1]){vbox(M,[C0+0.0,3.63+e*0.24,z*0.83],[0.04,0.03,0.78],BK2,1);vbox(M,[C0+0.0,3.63,z*0.83+e*0.38],[0.04,0.48,0.03],BK2,1);}}
  for(const z of [-1,1]){const zz=z*1.49,xm=(C0+C1)/2,W=C0-C1;vbox(M,[xm,(CB+3.0)/2,zz],[W,3.0-CB,0.04],BK,3);vbox(M,[xm,(3.82+CW)/2,zz],[W,CW-3.82,0.04],BK,3);
    for(const [a,b] of [[C0,C0-0.15],[C0-0.92,C0-1.08],[C0-1.8,C1]])vbox(M,[(a+b)/2,3.41,zz],[Math.abs(a-b),0.82,0.04],BK,3);
    {const x=C0-0.535;vbox(M,[x,3.41,zz],[0.77,0.8,0.02],GL,2);for(const e of [-1,1]){vbox(M,[x,3.41+e*0.4,zz+z*0.02],[0.83,0.05,0.03],BK2,1);vbox(M,[x+e*0.39,3.41,zz+z*0.02],[0.05,0.83,0.03],BK2,1);}}
    {const x=C0-1.44;for(const e of [-1,1]){vbox(M,[x,3.41+e*0.4,zz+z*0.02],[0.75,0.05,0.03],BK2,1);vbox(M,[x+e*0.36,3.41,zz+z*0.02],[0.05,0.83,0.03],BK2,1);}vbox(M,[x+0.25,3.41,zz-z*0.06],[0.02,0.78,0.6],GL,2);}
    vcylN(M,[C0-0.1,2.92,zz+z*0.06],[C1+0.1,2.92,zz+z*0.06],0.018,0.018,6,BK2,1);for(const x of [C0-0.1,C1+0.1])vcylN(M,[x,2.92,zz],[x,2.92,zz+z*0.06],0.015,0.015,5,BK2,1);
    vplate(M,[xm,2.38,zz+z*0.03],z>0?'z':'-z','01 118',0.16,[0.05,0.05,0.05],GD);vsign(M,xm,2.72,zz+z*0.02,z,0.62,0.1,[0.05,0.05,0.05],GD,[[0,0.5]]);
    vsign(M,C0-1.68,2.0,zz+z*0.02,z,0.3,0.12,[0.05,0.05,0.05],GD,[[0.02,0.2],[-0.03,0.2]]);vbox(M,[C0-0.35,2.1,zz+z*0.02],[0.12,0.12,0.01],[0.8,0.1,0.08],0);
    vbox(M,[xm,CB+0.03,zz+z*0.015],[W,0.12,0.02],RD,0);for(const x of [C0-0.6,C0-1.4])vbox(M,[x,CB+0.03,zz+z*0.03],[0.35,0.03,0.005],CR,0);
    vbox(M,[xm,1.62,z*1.32],[W,0.08,0.45],RD,0);vbox(M,[xm,1.4,z*1.5],[W,0.35,0.04],RD,0);
    for(const x of [C0-0.04,C1+0.04])vcylN(M,[x,1.75,z*1.55],[x,3.7,z*1.55],0.02,0.02,6,ST,1);
    for(const y of [0.45,0.85,1.25]){vbox(M,[C1+0.25,y,z*1.42],[0.42,0.04,0.28],RD,0);vbox(M,[C1+0.25,y-0.02,z*1.42],[0.38,0.02,0.24],[0.25,0.25,0.26],1);}vbox(M,[C1+0.05,0.85,z*1.42],[0.04,0.9,0.3],RD,0);vbox(M,[C1+0.45,0.85,z*1.42],[0.04,0.9,0.3],RD,0);}
  vbox(M,[C1+0.03,2.5,0],[0.06,1.5,1.1],BK,3);vbox(M,[(C0+C1)/2,2.02,0],[C0-C1,0.06,2.98],[0.3,0.24,0.18],7);
  {const RX0=C0+0.15,RX1=C1-0.4,ry=a=>CW+0.25*(1-a*a);for(let k=0;k<10;k++){const a0=-1+k/10*2,a1=-1+(k+1)/10*2,zz=a=>a*1.58;
      vq(M,[RX0,ry(a0),zz(a0)],[RX0,ry(a1),zz(a1)],[RX1,ry(a1),zz(a1)],[RX1,ry(a0),zz(a0)],[0,1,-(a0+a1)],[0.12,0.12,0.13],3);vq(M,[RX0,ry(a0)-0.05,zz(a0)],[RX1,ry(a0)-0.05,zz(a0)],[RX1,ry(a1)-0.05,zz(a1)],[RX0,ry(a1)-0.05,zz(a1)],[0,-1,0],[0.3,0.24,0.18],7);
      for(const x of [RX0,RX1]){const sg=x>RX1?1:-1;vq(M,[x,CW-0.06,a0*1.58],[x,CW-0.06,a1*1.58],[x,ry(a1),a1*1.58],[x,ry(a0),a0*1.58],[sg,0,0],[0.12,0.12,0.13],3);}}
    vbox(M,[(RX0+RX1)/2,CW-0.03,0],[RX0-RX1,0.06,3.1],BK2,3);
    // the roof ventilator: a raised box along the ridge with four louvred openings each side, a little roof on top
    const vx=(C0+C1)/2-0.1;vbox(M,[vx,CR0+0.1,0],[1.85,0.22,0.8],BK,3);vbox(M,[vx,CR0+0.24,0],[2.0,0.05,0.95],BK2,3);for(const z of [-1,1])for(let k=0;k<4;k++){const x=vx-0.7+k*0.46;vbox(M,[x,CR0+0.1,z*0.401],[0.34,0.13,0.01],[0.02,0.02,0.02],3);}}
  vbox(M,[C0-0.12,2.75,0],[0.14,1.3,1.3],BK2,7);vbox(M,[C0-0.2,2.45,0],[0.04,0.36,0.5],[1,0.45,0.12],4);for(const z of [-0.35,0.35])vcylN(M,[C0-0.19,3.3,z],[C0-0.22,3.3,z],0.1,0.1,12,[0.9,0.88,0.8],7);
  vbox(M,[C0-0.3,3.1,0.15],[0.06,0.06,0.6],BR,1);for(const z of [-1,1])vbox(M,[C0-1.3,2.6,z*1.15],[0.5,0.08,0.45],[0.35,0.25,0.18],7);vbox(M,[-7.45,2.05,0],[0.35,0.06,1.6],BK2,3);
  return M;}
// T32 tender (after the user's photo from behind): a full-width water tank, above it the narrower raised coal space with its slatted top,
// the rear upper box with the number plate and a lamp on top; on the rear wall two lamps, panels, the ladder and warning plates;
// red buffer beam and bogies with coil springs. 8.0 m over buffers (front +4.0).
function tender01Mesh(){const M=vmesh(),BK=[0.1,0.1,0.11],BK2=[0.14,0.14,0.15],RD=[0.68,0.1,0.08],RD2=[0.55,0.08,0.06],ST=[0.62,0.63,0.66],ST2=[0.4,0.4,0.42],CO=[0.05,0.05,0.055],GD=[0.88,0.72,0.36],YL=[0.95,0.8,0.1],L0=-4.0,L1=4.0,T0=-3.75,T1=3.65,TY0=1.45,TY1=3.3,UZ=1.15,UY=4.3;
  vbox(M,[(T0+T1)/2,1.32,0],[T1-T0+0.1,0.3,2.55],RD,0);for(const x of [L1-0.12,L0+0.12])vbox(M,[x,1.12,0],[0.24,0.5,2.9],RD,0);
  // water tank (full width) and the raised upper part (narrower), the ledge between them
  vbox(M,[(T0+T1)/2,(TY0+TY1)/2,0],[T1-T0,TY1-TY0,2.98],BK,1);vbox(M,[(T0+T1)/2,TY1+0.02,0],[T1-T0+0.04,0.05,3.04],BK2,3);
  for(const z of [-1,1]){vbox(M,[(T0+T1)/2,TY0+0.05,z*1.5],[T1-T0,0.08,0.03],BK2,3);for(const x of [-2.4,-0.6,1.2,2.8])vbox(M,[x,(TY0+TY1)/2,z*1.495],[0.04,TY1-TY0-0.1,0.02],BK2,1);
    vsign(M,-2.9,2.4,z*1.5,z,0.28,0.6,[0.08,0.08,0.09],[0.85,0.85,0.82],[[0.2,0.18],[0.1,0.2],[0,0.18],[-0.1,0.2],[-0.2,0.16]]);}
  vbox(M,[T0+0.75,(TY1+UY)/2,0],[1.5,UY-TY1,2*UZ],BK,1);for(const z of [-1,1]){vq(M,[T0+1.5,TY1,z*UZ],[T0+1.5,UY,z*UZ],[T0+2.2,TY1+0.35,z*UZ],[T0+2.2,TY1,z*UZ],[0,0,z],BK,3);}
  // the coal space: side walls of slats over a solid lower half, the front plate with the shovel opening, coal heaped
  for(const z of [-1,1]){const zz=z*UZ;vbox(M,[0.85,(TY1+UY)/2,zz],[4.4,UY-TY1,0.05],BK,1);vbox(M,[0.85,UY-0.04,zz+z*0.02],[4.4,0.08,0.06],BK2,3);vbox(M,[0.85,TY1+0.62,zz+z*0.02],[4.4,0.05,0.06],BK2,3);
    for(let x=-1.25;x<=3.0;x+=0.32)vbox(M,[x,(TY1+0.67+UY-0.08)/2,zz+z*0.035],[0.06,UY-0.08-TY1-0.67,0.04],BK2,3);}
  vbox(M,[3.05,(TY1+UY)/2,0],[0.06,UY-TY1,2*UZ],BK,3);vbox(M,[3.08,TY1+0.3,0],[0.04,0.5,0.7],[0.25,0.2,0.15],6);vbox(M,[0.85,TY1+0.06,0],[4.4,0.06,2*UZ-0.1],CO,3);
  for(let k=0;k<30;k++){const x=-1.0+((k*0.618)%1)*3.9,z=((k*0.371)%1-0.5)*1.8,r=0.32+((k*0.29)%1)*0.25;vob(M,[x,TY1+0.15+r*0.45,z],[r,0,r*0.3],[0,r*0.45,0],[-r*0.3,0,r],CO,3);}
  vbox(M,[T1+0.05,2.4,0],[0.1,1.6,2.0],BK,3);vbox(M,[T1+0.1,2.3,0],[0.04,0.7,0.8],[0.25,0.2,0.15],6);for(const z of [-1,1])vbox(M,[3.3,TY1+0.2,z*1.25],[0.6,0.35,0.45],BK,3);
  // rear wall: number plate up on the rear box, a lamp on top, two lamps lower down, two door panels, warning plates, the ladder, handrails
  vplate(M,[T0-0.01,UY-0.4,0],'-x','01 118',0.17,[0.05,0.05,0.05],GD);
  for(const [y,z] of [[UY+0.18,0.75],[2.25,1.05],[2.25,-1.05]]){vbox(M,[T0-0.12,y,z],[0.24,0.28,0.28],BK,3);vcylN(M,[T0-0.24,y,z],[T0-0.27,y,z],0.12,0.12,14,[1,0.92,0.75],4);vcylN(M,[T0-0.24,y,z],[T0-0.28,y,z],0.135,0.135,14,BK2,1,null,false);}
  for(const z of [-0.45,0.45]){const P=(y,zz)=>[T0-0.012,y,zz];for(const [a,b,c,d] of [[1.6,2.85,z-0.4,z+0.4]]){vbox(M,[T0-0.01,(a+b)/2,c],[0.02,b-a,0.03],BK2,1);vbox(M,[T0-0.01,(a+b)/2,d],[0.02,b-a,0.03],BK2,1);vbox(M,[T0-0.01,a,z],[0.02,0.03,0.8],BK2,1);vbox(M,[T0-0.01,b,z],[0.02,0.03,0.8],BK2,1);}}
  for(const z of [1.18,-1.18]){vob(M,[T0-0.012,2.9,z],[0.006,0,0],[0,0.15,0],[0,0,0.22],YL,0);vob(M,[T0-0.016,2.9,z],[0.004,0,0],[0,0.08,0],[0,0,0.03],[0.05,0.05,0.05],0);}
  {const z=-1.3;for(const dz of [-0.17,0.17])vcylN(M,[T0-0.08,0.9,z+dz],[T0-0.08,UY-0.05,z+dz],0.02,0.02,6,BK2,1);for(let y=1.0;y<UY-0.1;y+=0.3)vcylN(M,[T0-0.08,y,z-0.17],[T0-0.08,y,z+0.17],0.016,0.016,5,BK2,1);}
  for(const z of [-1,1]){vcylN(M,[T0-0.06,2.0,z*1.45],[T0-0.06,3.2,z*1.45],0.02,0.02,6,ST,1);vcylN(M,[T1+0.06,1.7,z*1.45],[T1+0.06,3.2,z*1.45],0.02,0.02,6,ST,1);for(const y of [1.0,1.45])vbox(M,[T1+0.15,y,z*1.42],[0.4,0.04,0.25],RD,0);}
  vcylN(M,[T0-0.06,UY-0.1,-0.3],[T0-0.06,UY-0.1,0.3],0.02,0.02,6,BK2,1);
  // buffers, coupling, hoses at the rear
  for(const z of [-0.875,0.875]){vcylN(M,[L0+0.12,1.06,z],[L0-0.08,1.06,z],0.17,0.15,12,BK,3);vcylN(M,[L0-0.08,1.06,z],[L0-0.25,1.06,z],0.085,0.085,10,ST,1);vcylN(M,[L0-0.25,1.06,z],[L0-0.3,1.06,z],0.24,0.24,16,ST2,1);}
  vbox(M,[L0-0.05,1.0,0],[0.2,0.14,0.12],BK,3);vbar(M,[L0-0.1,1.0],[L0-0.3,0.95],0,0.1,0.1,BK,3);for(const z of [-0.35,0.35]){vcylN(M,[L0,1.0,z],[L0-0.2,0.6,z*1.2],0.035,0.035,6,BK,3);vcylN(M,[L0-0.2,0.6,z*1.2],[L0-0.24,0.55,z*1.2],0.05,0.05,6,RD,0);}
  // bogies: red plate frames, axleboxes, coil springs, the bolster; spoked wheels
  for(const bx of [2.45,-2.45]){for(const z of [-1,1]){vbox(M,[bx,0.62,z*0.98],[2.7,0.3,0.08],RD,0);vbox(M,[bx,0.88,z*0.98],[1.0,0.16,0.1],RD,0);for(const e of [-0.95,0.95]){vbox(M,[bx+e,0.5,z*0.98],[0.34,0.36,0.16],RD,0);}
      for(const e of [-0.32,0.32])for(let k=0;k<5;k++)vcylN(M,[bx+e,0.45+k*0.08,z*1.08],[bx+e,0.49+k*0.08,z*1.08],0.11,0.11,10,RD2,0);vbox(M,[bx,0.86,z*1.08],[0.9,0.08,0.2],RD,0);vbox(M,[bx,0.4,z*1.08],[0.9,0.08,0.2],RD,0);}
    vbox(M,[bx,0.95,0],[0.5,0.3,1.9],RD,0);vbox(M,[bx,1.12,0],[0.9,0.12,1.2],RD,0);
    for(const e of [-0.95,0.95]){const x=bx+e;vcylN(M,[x,0.5,-0.8],[x,0.5,0.8],0.07,0.07,8,BK,3,[1,x,0.5,0.5]);for(const z of [-0.72,0.72])vspoked(M,x,0.5,z,0.5,12,{w:0.13,seg:22});}}
  vbox(M,[0,1.0,0],[2.4,0.4,1.4],BK2,3);vcylN(M,[-0.8,1.0,-1.2],[0.8,1.0,-1.2],0.2,0.2,14,RD,0);
  return M;}
// HEA-style two-axle hopper (rust brown, weathered): deep open box on two chutes, outside stanchions, oleo buffers, leaf springs in W-irons,
// round axlebox covers, brake lever, ladder at one end, placards. The grain is a separate heap (grainHeapMesh) that rises with the load.
function hopperMesh(){const M=vmesh(),RS=[0.42,0.24,0.18],RS2=[0.36,0.21,0.16],UF=[0.17,0.15,0.14],IN=[0.25,0.17,0.13],ST=[0.55,0.56,0.58],W9=9,yT=3.62,yB=2.42,zO=1.4,zI=1.18;
  // upper box: sides and sloped ends as plates (open top), the bottom lip, top rim angles
  for(const z of [-1,1]){vq(M,[-4.22,yB,z*zO],[4.22,yB,z*zO],[4.4,yT,z*zO],[-4.4,yT,z*zO],[0,0,z],RS,W9);vq(M,[-4.22,yB,z*(zO-0.05)],[-4.4,yT,z*(zO-0.05)],[4.4,yT,z*(zO-0.05)],[4.22,yB,z*(zO-0.05)],[0,0,-z],IN,W9);
    if(z<0){/* flip winding for the -z side */}
    vbox(M,[0,yB+0.04,z*(zO+0.05)],[8.5,0.08,0.12],RS2,W9);vbox(M,[0,yT-0.03,z*(zO+0.03)],[8.84,0.08,0.1],RS2,W9);
    for(const x of [-2.6,-0.9,0.9,2.6])vbox(M,[x,(yB+yT)/2,z*(zO+0.025)],[0.1,yT-yB,0.05],RS2,W9);}
  for(const e of [-1,1]){const x0=e*4.22,x1=e*4.4;vq(M,[x0,yB,-zO],[x0,yB,zO],[x1,yT,zO],[x1,yT,-zO],[e*0.99,-0.15,0],RS,W9);vq(M,[x0-e*0.05,yB,zO],[x0-e*0.05,yB,-zO],[x1-e*0.05,yT,-zO],[x1-e*0.05,yT,zO],[-e,0,0],IN,W9);
    vbox(M,[x1,yT-0.03,0],[0.1,0.08,2.86],RS2,W9);vbar(M,[x0,yB],[x1,yT],0,0.08,0.06,RS2,W9);for(const z of [-1,1])vbar(M,[x0+e*0.02,yB],[x1+e*0.02,yT],z*(zO-0.02),0.1,0.06,RS2,W9);
    vbox(M,[e*4.3,yB+0.05,0],[0.2,0.1,2.8],RS2,W9);}
  // the lower body: side plates following the chutes, the chute slopes inside, the ridge between them, outlet door gear, centre box
  const prof=[[-4.22,yB],[-2.7,1.35],[-0.75,1.35],[0,2.1],[0.75,1.35],[2.7,1.35],[4.22,yB]];
  for(const z of [-1,1])for(let i=0;i+1<prof.length;i++){const a=prof[i],b=prof[i+1];const P=(p,y,zz)=>[p,y,zz];
    if(z>0)vq(M,[a[0],a[1],z*zI],[b[0],b[1],z*zI],[b[0],yB,z*zI],[a[0],yB,z*zI],[0,0,1],RS,W9);else vq(M,[a[0],a[1],z*zI],[a[0],yB,z*zI],[b[0],yB,z*zI],[b[0],b[1],z*zI],[0,0,-1],RS,W9);}
  for(let i=0;i+1<prof.length;i++){const a=prof[i],b=prof[i+1],dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy),n=[-dy/L,dx/L,0];
    vq(M,[a[0],a[1],-zI],[a[0],a[1],zI],[b[0],b[1],zI],[b[0],b[1],-zI],[-n[0]*-1,n[1],0].map(v=>v),IN,W9);vq(M,[a[0],a[1]-0.04,zI],[a[0],a[1]-0.04,-zI],[b[0],b[1]-0.04,-zI],[b[0],b[1]-0.04,zI],[-n[0],-n[1],0],RS2,W9);}
  vq(M,[-4.22,yB+0.01,-zO],[4.22,yB+0.01,-zO],[4.22,yB+0.01,-zI],[-4.22,yB+0.01,-zI],[0,1,0],IN,W9);vq(M,[-4.22,yB+0.01,zI],[4.22,yB+0.01,zI],[4.22,yB+0.01,zO],[-4.22,yB+0.01,zO],[0,1,0],IN,W9);
  for(const z of [-1,1]){vbar(M,[-4.15,yB-0.02],[-2.75,1.4],z*(zI+0.03),0.12,0.06,RS2,W9);vbar(M,[4.15,yB-0.02],[2.75,1.4],z*(zI+0.03),0.12,0.06,RS2,W9);
    for(const x of [-2.7,-0.75,0.75,2.7])vbox(M,[x,(1.35+yB)/2,z*(zI+0.03)],[0.1,yB-1.35,0.06],RS2,W9);vbar(M,[-0.75,1.4],[0,2.05],z*(zI+0.03),0.1,0.06,RS2,W9);vbar(M,[0.75,1.4],[0,2.05],z*(zI+0.03),0.1,0.06,RS2,W9);
    vbar(M,[-1.9,1.4],[-2.4,yB-0.05],z*(zI+0.03),0.08,0.05,RS2,W9);vbar(M,[1.9,1.4],[2.4,yB-0.05],z*(zI+0.03),0.08,0.05,RS2,W9);}
  for(const x of [-1.72,1.72]){vbox(M,[x,1.25,0],[1.9,0.22,1.2],RS2,W9);vbox(M,[x,1.13,0],[1.7,0.06,1.0],UF,3);for(const z of [-0.65,0.65])vcylN(M,[x-0.8,1.2,z],[x+0.8,1.2,z],0.04,0.04,6,UF,3);}
  vbox(M,[0,1.42,0],[1.1,0.5,1.3],[0.5,0.42,0.36],W9);vbox(M,[0,1.15,0],[1.3,0.08,1.5],UF,3);
  // underframe: solebars (channels), headstocks, cross members; oleo buffers; screw couplings; air pipes
  for(const z of [-1,1]){vbox(M,[0,1.0,z*1.05],[8.0,0.32,0.06],UF,3);vbox(M,[0,1.15,z*0.98],[8.0,0.04,0.18],UF,3);vbox(M,[0,0.85,z*0.98],[8.0,0.04,0.18],UF,3);
    vbox(M,[-1.2,1.0,z*1.085],[0.5,0.1,0.01],[0.85,0.83,0.78],0);vbox(M,[1.8,1.02,z*1.085],[0.3,0.08,0.01],[0.85,0.83,0.78],0);}
  for(const e of [-1,1]){vbox(M,[e*4.02,1.02,0],[0.16,0.36,2.62],UF,3);for(const z of [-0.875,0.875]){vbox(M,[e*4.14,1.04,z],[0.08,0.34,0.34],UF,3);vcylN(M,[e*4.14,1.04,z],[e*4.42,1.04,z],0.13,0.12,12,UF,3);
      vcylN(M,[e*4.42,1.04,z],[e*4.64,1.04,z],0.085,0.085,10,ST,1);vcylN(M,[e*4.64,1.04,z],[e*4.7,1.04,z],0.215,0.215,16,[0.3,0.28,0.27],1);}
    vbox(M,[e*4.2,1.0,0],[0.25,0.12,0.12],UF,3);vbar(M,[e*4.3,1.0],[e*4.62,0.96],0,0.08,0.08,UF,3);vcylN(M,[e*4.12,0.95,0.35],[e*4.45,0.55,0.4],0.035,0.035,6,[0.15,0.15,0.15],3);vcylN(M,[e*4.45,0.55,0.4],[e*4.47,0.5,0.4],0.05,0.05,6,[0.7,0.15,0.1],0);}
  for(const x of [-2.0,0,2.0])vbox(M,[x,0.95,0],[0.12,0.2,2.0],UF,3);
  // running gear: W-irons, axleboxes with round covers, long leaf springs with shackles, brake blocks, brake lever and rigging
  for(const x of [-2.8,2.8]){vcylN(M,[x,0.46,-0.9],[x,0.46,0.9],0.07,0.07,8,UF,3,[1,x,0.46,0.46]);for(const z of [-0.72,0.72])vspoked(M,x,0.46,z,0.46,0,{w:0.13,seg:20,col:[0.2,0.16,0.14]});
    for(const z of [-1,1]){vbar(M,[x-0.55,0.86],[x-0.2,0.25],z*1.02,0.08,0.05,UF,3);vbar(M,[x+0.55,0.86],[x+0.2,0.25],z*1.02,0.08,0.05,UF,3);vbox(M,[x,0.25,z*1.02],[0.5,0.05,0.06],UF,3);
      vbox(M,[x,0.46,z*1.0],[0.32,0.34,0.18],UF,3);vcylN(M,[x,0.46,z*1.09],[x,0.46,z*1.14],0.13,0.13,14,UF,3);vcylN(M,[x,0.46,z*1.14],[x,0.46,z*1.16],0.07,0.07,10,UF,3);
      for(let k=0;k<6;k++){const w=1.25-k*0.17,y=0.68+k*0.032;vbox(M,[x,y+0.04*(1-w/1.25)*0,z*1.0],[w,0.03,0.11],UF,3);}
      for(const e of [-1,1]){vbar(M,[x+e*0.63,0.7],[x+e*0.7,0.86],z*1.0,0.05,0.05,UF,3);}
      vbox(M,[x+0.5,0.46,z*0.72],[0.08,0.32,0.12],UF,3);vbox(M,[x-0.5,0.46,z*0.72],[0.08,0.32,0.12],UF,3);}}
  vbar(M,[1.3,0.78],[3.7,0.62],1.13,0.06,0.05,UF,3);vbox(M,[3.75,0.6,1.13],[0.16,0.06,0.08],[0.85,0.83,0.78],0);vbar(M,[-1.3,0.78],[-3.7,0.62],-1.13,0.06,0.05,UF,3);
  vcylN(M,[-2.2,0.82,0],[2.2,0.82,0],0.03,0.03,6,UF,3);vcylN(M,[0.9,0.85,0.4],[0.9,0.85,-0.4],0.15,0.15,12,UF,3);
  // ladder and grab handles at one end, placards
  for(const dz of [-0.2,0.2]){vcylN(M,[-3.75,1.15,1.45+0.0],[-3.75,yT+0.15,1.45],0.02,0.02,6,RS2,W9);}
  for(const z of [1.45]){for(const x of [-3.95,-3.55])vcylN(M,[x,1.2,z],[x,yT+0.12,z],0.022,0.022,6,RS2,W9);for(let y=1.4;y<yT;y+=0.3)vcylN(M,[-3.95,y,z],[-3.55,y,z],0.016,0.016,5,RS2,W9);}
  vcylN(M,[-4.3,yT+0.1,-0.5],[-4.3,yT+0.1,0.5],0.02,0.02,6,UF,3);for(const z of [-0.5,0.5])vcylN(M,[-4.3,yT,z],[-4.3,yT+0.1,z],0.02,0.02,6,UF,3);
  for(const [x,y] of [[-3.3,yT-0.3],[3.95,yT-0.35]])for(const z of [-1,1])vbox(M,[x,y,z*(zO+0.02)],[0.14,0.22,0.01],[0.86,0.82,0.7],0);
  return M;}
// the grain in a hopper: a heap over the open top (unit height: the game scales it with the load and lifts it in the box)
function grainHeapMesh(){const M=vmesh(),nx=36,nz=12,X0=-4.32,X1=4.32,Z=1.36,col=(x,z)=>{const h=0.5+0.25*Math.sin(x*1.3+z*2.1)+0.25*Math.sin(x*0.7-z*3.3);return[0.84+0.05*h,0.69+0.05*h,0.4+0.04*h];};
  const H=(x,z)=>{const pk=Math.max(0,1-Math.pow(Math.abs(x-1.75)/2.9,1.6)-Math.pow(Math.abs(z)/1.9,2)*0.8),pk2=Math.max(0,1-Math.pow(Math.abs(x+1.75)/2.9,1.6)-Math.pow(Math.abs(z)/1.9,2)*0.8);
    return Math.max(pk,pk2)*0.85+0.15+0.04*Math.sin(x*3.1+z*5.7)*Math.sin(x*1.7-z*2.3);};
  const P=(i,j)=>{const x=X0+(X1-X0)*i/nx,z=-Z+2*Z*j/nz;return[x,H(x,z),z];};
  /* smooth normals per vertex (the heap is a soft surface, not facets); the game squashes it in y, so the normals are made a little steeper here */
  const Nm=(x,z)=>{const e=0.05,hx=(H(x+e,z)-H(x-e,z))/(2*e)*0.35,hz=(H(x,z+e)-H(x,z-e))/(2*e)*0.35,l=Math.hypot(hx,1,hz);return[-hx/l,1/l,-hz/l];},V=(p)=>{const n=Nm(p[0],p[2]),c=col(p[0],p[2]);M.v.push(p[0],p[1],p[2],n[0],n[1],n[2],c[0],c[1],c[2],0,0,0,1,8);return M.n++;};
  const idx=[];for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++)idx.push(V(P(i,j)));for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=idx[j*(nx+1)+i],b=a+1,c=a+nx+2,d=a+nx+1;M.i.push(a,d,c,a,c,b);}
  return M;}
// panelled bogie coach: side walls built around real window openings (glass is drawn in a transparent pass), lining,
// clerestory roof with lamp pots, end balconies with railings; inside: wood panelling, upholstered bays of facing
// benches either side of the aisle, luggage racks, ceiling lamps
// two-axle goods wagons: 0 grain hopper, 1 covered van (produce), 2 mail van (PTT green with a yellow band), 3 timber flat with logs
// solebars outside the wheels carry the springs; axleboxes meet the springs and the axles run through (all used to float)
function wagonMesh(t){const M=vmesh(),B=COL.black,S=COL.steel;vbox(M,[0,0.95,0],[8.6,0.28,1.5],B,3);for(const z of [-0.86,0.86])vbox(M,[0,0.95,z],[8.6,0.28,0.1],B,3);
  for(const x of [-2.8,2.8]){vcyl(M,[x,0.46,0],'z',0.07,1.9,B,3,8);for(const z of [-0.72,0.72])vwheel(M,x,0.46,z,0.46,B);for(const z of [-0.86,0.86]){vbox(M,[x,0.78,z],[1.5,0.07,0.1],B,3);vbox(M,[x,0.575,z],[0.3,0.35,0.1],B,3);}}
  for(const e of [-1,1]){vbox(M,[e*4.4,1.1,0],[0.12,0.32,2.5],B,3);for(const z of [-0.88,0.88])vcyl(M,[e*4.62,1.1,z],'x',0.15,0.36,S,1,10);}
  // hopper: body sits on the frame, an open rim around the top, and the grain heaped inside it (the grain used to be hidden under a solid lid)
  if(t===0){const g=[0.46,0.44,0.4],rm=[0.36,0.35,0.33];vbox(M,[0,2.095,0],[7.6,2.01,2.6],g,0);for(const z of [-1.3,1.3])vbox(M,[0,3.15,z],[7.7,0.1,0.1],rm,3);for(const x of [-3.8,3.8])vbox(M,[x,3.15,0],[0.1,0.1,2.7],rm,3);
    vbox(M,[0,3.14,0],[7.4,0.1,2.4],[0.86,0.72,0.34],0);vbox(M,[0,3.22,0],[6.6,0.1,1.5],[0.86,0.72,0.34],0);for(const x of [-2.4,0,2.4])vbox(M,[x,1.05,0],[1.4,0.5,1.4],g,0);for(let x=-3.6;x<=3.6;x+=1.2)for(const z of [-1.31,1.31])vbox(M,[x,2.095,z],[0.08,2.01,0.04],rm,3);}
  else if(t===1||t===2){const c=t===1?[0.52,0.28,0.18]:[0.18,0.36,0.26];vbox(M,[0,2.3,0],[8.2,2.4,2.7],c,0);vbox(M,[0,3.58,0],[8.4,0.16,2.6],COL.roof,3);vbox(M,[0,3.68,0],[8.4,0.1,2.0],COL.roof,3);
    // planks stop at the mail van's windows and the yellow band clears the door (both used to sit within a few mm and flicker)
    for(const z of [-1.36,1.36]){vbox(M,[0,2.3,z],[1.8,2.0,0.04],t===1?[0.45,0.24,0.15]:[0.15,0.3,0.22],0);for(let x=-3.8;x<=3.8;x+=0.95){if(t===2&&Math.abs(Math.abs(x)-2.6)<0.6)continue;vbox(M,[x,2.3,z*1.005],[0.05,2.3,0.02],[0.3,0.18,0.12],0);}if(t===2){vbox(M,[0,1.55,Math.sign(z)*1.392],[8.2,0.22,0.02],[0.96,0.78,0.15],0);for(const x of [-2.6,2.6])vbox(M,[x,2.85,z],[1.0,0.45,0.03],COL.glass,2);}}}
  else{vbox(M,[0,1.15,0],[8.6,0.12,2.6],[0.42,0.3,0.2],0);for(let x=-3.8;x<=3.8;x+=1.9)for(const z of [-1.25,1.25])vbox(M,[x,1.85,z],[0.1,1.4,0.1],B,3);
    // the logs are drawn row by row from the wagon's load (logRowMesh), so a crane can fill it bundle by bundle
    }
  return M;}
function coachMesh(c1,c2){const M=vmesh(),B=COL.black,wd=[0.46,0.31,0.19],seat=[0.58,0.13,0.15],gold=[0.92,0.78,0.38],L=6.75,cream=[0.9,0.86,0.76];
  // truss rods hang from queen posts; bogies are a bolster plus two side frames, so the wheels show between them, on real axles
  vbox(M,[0,0.95,0],[14.2,0.3,1.6],B,3);for(const z of [-0.55,0.55]){vbox(M,[0,0.6,z],[6.6,0.05,0.05],B,3);for(const x of [-3.3,-1.2,1.2,3.3])vbox(M,[x,0.7,z],[0.05,0.25,0.05],B,3);}vbox(M,[0,0.7,0],[1.6,0.4,1.0],B,3);
  for(const bx of [-4.9,4.9]){vbox(M,[bx,0.7,0],[0.5,0.25,1.7],B,3);for(const z of [-0.88,0.88])vbox(M,[bx,0.7,z],[2.8,0.2,0.1],B,3);for(const x of [-1.05,1.05]){vcyl(M,[bx+x,0.46,0],'z',0.07,1.9,B,3,8);for(const z of [-0.72,0.72])vwheel(M,bx+x,0.46,z,0.46,B);}for(const z of [-0.88,0.88]){vbox(M,[bx,0.78,z],[1.7,0.08,0.1],B,3);for(const x of [-1.05,1.05])vbox(M,[bx+x,0.5,z],[0.3,0.32,0.1],B,3);}}
  vbox(M,[0,1.13,0],[2*L,0.06,2.8],wd,7);
  for(const z of [-1,1]){vbox(M,[0,1.65,z*1.38],[2*L,1.05,0.05],c1,0);vbox(M,[0,1.42,z*1.41],[2*L,0.5,0.02],c2,0);vbox(M,[0,3.1,z*1.38],[2*L,0.35,0.05],c1,0);
    vbox(M,[0,1.65,z*1.335],[2*L,1.05,0.02],wd,7);vbox(M,[0,3.1,z*1.335],[2*L,0.35,0.02],wd,7);
    for(let w=0;w<7;w++){const x0=-6.1+w*1.74+0.6,x1=-6.1+(w+1)*1.74-0.6;vbox(M,[(x0+x1)/2,2.55,z*1.38],[x1-x0,0.75,0.05],c1,0);vbox(M,[(x0+x1)/2,2.55,z*1.335],[x1-x0,0.75,0.02],wd,7);}
    for(const e of [-1,1])vbox(M,[e*6.725,2.55,z*1.38],[0.05,0.75,0.05],c1,0);
    for(let w=0;w<8;w++)vbox(M,[-6.1+w*1.74,2.55,z*1.38],[1.2,0.75,0.015],COL.glass,2);
    for(const y of [2.12,2.98])vbox(M,[0,y,z*1.414],[2*L-0.2,0.03,0.01],gold,0);}
  for(const e of [-1,1]){vbox(M,[e*L,2.2,0],[0.06,2.2,2.8],c1,0);vbox(M,[e*(L-0.04),2.2,0],[0.02,2.2,2.7],wd,7);vbox(M,[e*(L+0.035),1.95,0],[0.02,1.65,0.72],wd,0);vbox(M,[e*(L+0.045),2.45,0],[0.01,0.45,0.42],COL.glass,2);
    vbox(M,[e*7.0,1.15,0],[0.5,0.06,2.5],wd,0);for(const z of [-1.18,-0.42,0.42,1.18])vbox(M,[e*7.22,1.55,z],[0.04,0.8,0.04],B,3);for(const z of [-0.8,0.8])vbox(M,[e*7.22,1.95,z],[0.04,0.04,0.8],B,3);
    vbox(M,[e*7.25,1.25,0],[0.12,0.35,2.6],B,3);for(const z of [-0.88,0.88])vcyl(M,[e*7.45,1.25,z],'x',0.17,0.4,COL.steel,1,10);}
  vbox(M,[0,3.33,0],[2*L+0.6,0.08,2.98],COL.roof,3);vbox(M,[0,3.42,0],[2*L+0.6,0.1,2.4],COL.roof,3);vbox(M,[0,3.64,0],[2*L-1,0.34,1.2],c1,0);vbox(M,[0,3.86,0],[2*L-0.7,0.07,1.5],COL.roof,3);
  for(let x=-5.5;x<=5.6;x+=1.1)for(const z of [-0.61,0.61])vbox(M,[x,3.65,z],[0.6,0.18,0.012],COL.glass,2);for(const x of [-4.5,-1.5,1.5,4.5])vcyl(M,[x,3.96,0],'y',0.1,0.14,B,3,8);
  vbox(M,[0,3.27,0],[2*L,0.03,2.7],cream,7);
  for(let w=0;w<8;w++){const wx=-6.1+w*1.74;for(const sd of [-1,1])for(const f of [-1,1]){const bx=wx+f*0.6,zc=sd*0.86;vbox(M,[bx,1.6,zc],[0.46,0.1,0.95],seat,7);vbox(M,[bx+f*0.26,2.0,zc],[0.08,0.8,0.95],seat,7);vbox(M,[bx,1.35,zc],[0.42,0.42,0.9],wd,7);}}
  for(const sd of [-1,1])vbox(M,[0,2.95,sd*1.13],[2*L-0.4,0.03,0.32],[0.72,0.62,0.38],7);for(const x of [-5.2,-1.74,1.74,5.2])vbox(M,[x,3.2,0],[0.26,0.1,0.26],COL.lamp,4);
  return M;}

// 4 m of platform for lengthened stations (same section as the station's own platform); variant 1 has a lamp post and a bench
function platPieceMesh(lamp){const M=vmesh();vbox(M,[0,0.45,-3.6],[4,1.1,4.2],[0.78,0.74,0.68],3);vbox(M,[0,1.02,-1.62],[3.96,0.06,0.28],[0.98,0.96,0.88],0);
  if(lamp){const dk=[0.22,0.30,0.26];vbox(M,[0,2.5,-5.2],[0.14,3.0,0.14],dk,1);vbox(M,[0.35,3.95,-5.2],[0.8,0.08,0.08],dk,1);vbox(M,[0.7,3.7,-5.2],[0.34,0.4,0.34],COL.lamp,4);
    vbox(M,[-1.1,1.5,-4.9],[1.8,0.12,0.55],[0.6,0.42,0.28],0);vbox(M,[-1.1,1.83,-5.13],[1.8,0.55,0.08],[0.6,0.42,0.28],0);for(const e of [-0.75,0.75])vbox(M,[-1.1+e,1.22,-4.9],[0.08,0.44,0.45],dk,0);}return M;}
function signalMesh(){const M=vmesh();vbox(M,[0,2.2,0],[0.18,4.4,0.18],[0.85,0.85,0.82],1);for(let y=0.4;y<4;y+=0.8)vbox(M,[0,y,0],[0.2,0.4,0.2],[0.86,0.2,0.16],0);
  vbox(M,[0,4.35,0],[0.46,0.9,0.36],[0.15,0.15,0.17],3);vbox(M,[0.24,4.55,0],[0.04,0.26,0.26],[1,1,1],4);vbox(M,[-0.24,4.55,0],[0.04,0.26,0.26],[1,1,1],4);vbox(M,[0,4.84,0],[0.6,0.08,0.45],[0.15,0.15,0.17],3);return M;}
// toy station: platform with a white edge line, a little station house with a pitched roof, canopy, lamps, benches, name board
function stationMesh(){const M=vmesh(),wall=[0.95,0.88,0.72],roof=[0.78,0.30,0.22],trim=[0.97,0.96,0.92],dk=[0.22,0.30,0.26];
  vbox(M,[0,0.45,-3.6],[44,1.1,4.2],[0.78,0.74,0.68],3);vbox(M,[0,1.02,-1.62],[44,0.06,0.28],[0.98,0.96,0.88],0);
  vbox(M,[0,2.3,-7.3],[11,4.6,4.6],wall,0);vbox(M,[0,0.4,-7.3],[11.3,0.8,4.9],[0.62,0.34,0.27],3);
  const rf=(z0,z1,y0,y1)=>{vq(M,[-6,y0,z0],[6,y0,z0],[6,y1,z1],[-6,y1,z1],[0,Math.abs(z1-z0),Math.sign(z0-z1)*(y1-y0)].map((v,i,a)=>v/Math.hypot(...a)),roof,0);};
  // roof eaves drop with the pitch so the roof rests on the walls (it used to leave a 33 cm slit), gables reach the ridge, the chimney clears it
  rf(-4.5,-7.3,4.1,6.9);rf(-10.1,-7.3,4.1,6.9);vt(M,[-5.5,4.6,-9.6],[-5.5,4.6,-5.0],[-5.5,6.9,-7.3],[-1,0,0],wall,0);vt(M,[5.5,4.6,-5.0],[5.5,4.6,-9.6],[5.5,6.9,-7.3],[1,0,0],wall,0);
  for(const x of [-3.2,0,3.2])vbox(M,[x,2.5,-4.97],[1.4,1.6,0.06],COL.glass,2);vbox(M,[4.5,1.9,-4.97],[1.2,2.6,0.06],[0.32,0.5,0.4],0);vbox(M,[-2.2,6.6,-7.3],[0.7,2.0,0.7],[0.62,0.34,0.27],3);
  for(const x of [-14,-6,6,14])vbox(M,[x,2.6,-4.4],[0.18,3.1,0.18],dk,0);vbox(M,[0,4.2,-3.9],[32,0.16,3.2],[0.86,0.82,0.74],0);vbox(M,[0,4.32,-3.9],[32.4,0.08,3.4],roof,0);
  // lamps hang under the canopy (their posts used to run up through the canopy roof with the lamp on top of it)
  for(const x of [-7,7]){vbox(M,[x,3.98,-5.4],[0.05,0.3,0.05],dk,1);vbox(M,[x,3.64,-5.4],[0.4,0.4,0.4],COL.lamp,4);}
  for(const x of [-10,10]){vbox(M,[x,1.5,-4.9],[2.2,0.12,0.6],[0.6,0.42,0.28],0);vbox(M,[x,1.85,-5.15],[2.2,0.6,0.08],[0.6,0.42,0.28],0);for(const e of [-1,1])vbox(M,[x+e*0.95,1.22,-4.9],[0.08,0.44,0.5],dk,0);}
  vbox(M,[-18,3.0,-4.6],[3.2,0.8,0.1],[0.12,0.25,0.5],0);vbox(M,[-18,2.97,-4.54],[2.8,0.5,0.02],trim,0);vbox(M,[-18,1.8,-4.6],[0.12,2.2,0.12],dk,1);return M;}
// ===================================================================
// TIMBER CRANES — a wooden travelling gantry at every station and lorry bay attached to a sawmill or a wood workshop.
// At a sawmill it lifts row-bundles of logs off the yard stacks and lowers them onto the timber wagons standing
// alongside the 44 m yard (wagons beyond the yard are left alone); at a workshop it unloads them onto its stacks
// (and the delivery is paid as each bundle is set down). Trains wait while their wagons are worked. The stacks show
// the stock: one row per CRN.unit of wood.
// ===================================================================
const Crane={S:new Map(),F:[],hold:new Map(),
  rows(n){return Math.min(3,Math.floor((n||0)/CRN.unit+1e-6));},
  ind(kind,q){return((kind==='sawmill'?Life.sawmills:kind==='mine'?Life.mines:Life.workshops)||[])[q.mi]||null;},
  // loading points with their frame: origin o, along-track X and across Z (the yard lies on -Z)
  frames(){const out=[];for(const si of Life.stInfo||[]){const st=si.st,kind=st.sawmill?'sawmill':st.workshop?'workshop':st.mine?'mine':null;if(!kind||st.farm)continue;const m=this.ind(kind,st[kind]);if(!Life.indOn(kind,m))continue;
      out.push({key:'st:'+st.id,kind,st,si,v:si.v,name:st.name,ore:kind==='mine'?m.type:null,o:[si.x,si.y,si.z],X:[si.dx,si.dz],Z:[-si.dz,si.dx]});}
    for(const si of Life.stInfo||[]){const st=si.st,fm=st.farm?Life.farmOf(st):null;if(!fm||!fm.v.farmOwned)continue;out.push({key:'st:'+st.id,kind:'farm',want:'grain',st,si,v:fm.v,name:st.name,ore:null,tw:Life.farmTower(fm),o:[si.x,si.y,si.z],X:[si.dx,si.dz],Z:[-si.dz,si.dx]});}
    for(const b of Buses.stops){const kind=b.sawmill?'sawmill':b.workshop?'workshop':null;if(!kind)continue;const m=this.ind(kind,b[kind]);if(!m||!R.world||!Life.indOn(kind,m))continue;
      let c=Math.cos(b.rot),s=Math.sin(b.rot);if(s*(m.x-b.x)-c*(m.z-b.z)<0){c=-c;s=-s;}
      out.push({key:'bs:'+b.id,kind,bs:b,v:b.v,name:b.name,o:[b.x,R.sampleHr(R.world,b.x,b.z)+0.18,b.z],X:[c,s],Z:[-s,c]});}
    return out;},
  st(k){let s=this.S.get(k);if(!s){s={gx:0,tz:CRN.zPile,hy:CRN.rest,ph:'idle',t:0,task:null,load:-1,stacks:[0,0,0,0,0],yard:0,eat:0,puff:0};this.S.set(k,s);}return s;},
  toL(f,x,z){const dx=x-f.o[0],dz=z-f.o[2];return[dx*f.X[0]+dz*f.X[1],dx*f.Z[0]+dz*f.Z[1]];},
  toW(f,lx,ly,lz){return[f.o[0]+f.X[0]*lx+f.Z[0]*lz,f.o[1]+ly,f.o[2]+f.X[1]*lx+f.Z[1]*lz];},
  // the stacks follow the stock (sawmill) or what has been unloaded and not yet used (workshop)
  sync(f,s,dt){if(f.kind==='mine'||f.kind==='farm')return;let want;if(f.kind==='sawmill')want=Math.min(15,Math.floor(Goods.get(f.key).wood/CRN.unit+1e-6));else{s.eat+=dt;if(s.eat>45){s.eat=0;if(s.yard>0)s.yard--;}want=s.yard;}
    if(s.task)return;let n=s.stacks.reduce((a,b)=>a+b,0);while(n<want){const i=s.stacks.findIndex(r=>r<3);if(i<0)break;s.stacks[i]++;n++;}
    while(n>want){let i=-1;for(let j=4;j>=0;j--)if(s.stacks[j]>0){i=j;break;}if(i<0)break;s.stacks[i]--;n--;}},
  // timber wagons of the train standing at this station, in the yard frame (|along| within reach, on this track)
  cars(f){if(!f.st)return null;const tr=Trains.list.find(t=>t.atSt===f.st.id&&Math.abs(t.v||0)<0.15&&t.poses);if(!tr)return null;const cars=[];
    const want=f.want||f.ore||'wood';tr.veh.forEach((w,i)=>{if(w.k!=='wagon'||w.ctype!==want)return;const ps=tr.poses[i];if(!ps)return;const m=ps.m,[ax,az]=this.toL(f,m[12],m[14]);if(Math.abs(az)>1.6||Math.abs(ax)>(f.kind==='farm'?600:CRN.xMax))return;cars.push({w,ax,az,ay:m[13]-f.o[1]});});
    return{tr,cars};},
  lorry(f){const b=f.bs;return Buses.list.find(q=>q.goods&&q.st==='dwell'&&Buses.cur(q)===b)||null;},
  near(list,x){let best=-1,bd=1e9;for(const i of list){const d=Math.abs(CRN.stackX[i]-x);if(d<bd){bd=d;best=i;}}return best;},
  plan(f,s){if(f.kind==='mine'){const c=this.cars(f);if(!c||Goods.get(f.key)[f.ore]<1)return null;const cand=c.cars.filter(q=>(q.w.n||0)<19.9);if(!cand.length)return null;let car=cand[0];for(const q of cand)if(Math.abs(q.ax-s.gx)<Math.abs(car.ax-s.gx))car=q;
      let cx=-18;for(let x=-18;x<=18.01;x+=4)if(Math.abs(x-car.ax)<Math.abs(cx-car.ax))cx=x;return{mode:'pour',tr:c.tr,car,cx};}
    if(f.bs){const l=this.lorry(f);if(!l||l._cr===l.leg)return null;l._cr=l.leg;const [ax,az]=this.toL(f,l.x,l.z),load=f.kind==='sawmill';
      const sl=load?this.near([0,1,2,3,4].filter(i=>s.stacks[i]>0),ax):this.near([0,1,2,3,4].filter(i=>s.stacks[i]<3),ax);if(sl<0)return null;
      return{mode:load?'load':'unload',vis:true,lorry:l,car:{w:{n:load?0:CRN.unit},ax,az,ay:-0.3},k:0,slot:sl,px:CRN.stackX[sl]};}
    const c=this.cars(f);if(!c)return null;const load=f.kind==='sawmill';
    const cand=c.cars.filter(q=>load?this.rows(q.w.n)<3:(this.rows(q.w.n)>0&&q.w.from!==f.key));if(!cand.length)return null;
    const slots=[0,1,2,3,4].filter(i=>load?s.stacks[i]>0:s.stacks[i]<3);if(!slots.length)return null;
    let car=cand[0];for(const q of cand)if(Math.abs(q.ax-s.gx)<Math.abs(car.ax-s.gx))car=q;const sl=this.near(slots,car.ax);
    return{mode:load?'load':'unload',tr:c.tr,car,k:load?this.rows(car.w.n):this.rows(car.w.n)-1,slot:sl,px:CRN.stackX[sl]};},
  still(f,t){if(t.lorry)return t.lorry.st==='dwell';return t.tr.atSt===f.st.id&&Math.abs(t.tr.v||0)<0.15&&Trains.list.includes(t.tr);},
  pileTop(s,t){const i=t.mode==='load'?s.stacks[t.slot]-1:s.stacks[t.slot];return CRN.rowY0+Math.max(0,i)*CRN.rowDY+CRN.logR;},
  carTop(t){return t.car.ay+(t.lorry?1.35:CRN.carY+t.k*CRN.rowDY+CRN.logR);},
  icon(f,t,txt){const p=this.toW(f,t.car.ax,t.car.ay+3.5,t.car.az);Icons.add(p[0],p[1],p[2],txt);},
  pick(f,s,t){if(s.stacks[t.slot]>0)s.stacks[t.slot]--;if(!t.vis){const S=Goods.get(f.key);S.wood=Math.max(0,S.wood-CRN.unit);}s.load=t.k;},
  put(f,s,t){s.load=-1;if(t.vis)return;const w=t.car.w;if(!(w.n>=1)){const o=f.o;w.fx=o[0];w.fz=o[2];w.from=f.key;}w.n=Math.min(20,(t.k+1)*CRN.unit);if(w.n>19.9)w.n=20;this.icon(f,t,'+🪵');},
  take(f,s,t){s.load=t.k;if(t.vis)return;const w=t.car.w;t.cargo={n:CRN.unit,fx:w.fx,fz:w.fz,from:w.from};w.n=Math.max(0,t.k*CRN.unit);if(w.n<0.5)w.n=0;},
  drop(f,s,t){s.load=-1;s.stacks[t.slot]=Math.min(3,s.stacks[t.slot]+1);s.yard=Math.min(15,s.yard+1);if(t.vis||!t.cargo)return;Goods.deliver(f.key,f.o[0],f.o[2],f.v,{wood:t.cargo},f.name,t.tr.name);},
  back(f,s,t){s.stacks[t.slot]=Math.min(3,s.stacks[t.slot]+1);if(!t.vis){const S=Goods.get(f.key);S.wood=Math.min(60,S.wood+CRN.unit);}},
  // ore pockets: the one over the wagon opens, ore pours until the hopper is full or the bunker is empty, then it closes
  runOre(f,s,dt){if(s.ph==='idle'){s.task=this.plan(f,s);if(!s.task)return;s.ph='open';s.t=0.8;s.gx=s.task.cx;}
    const t=s.task;if(!this.still(f,t)){s.task=null;s.ph='idle';s.pour=false;return;}const w=t.car.w,S=Goods.get(f.key);
    if(s.ph==='open'){s.pour=false;if((s.t-=dt)<=0)s.ph='pour';return;}
    if(s.ph==='pour'){s.pour=true;if(!(w.n>=0.5)){w.fx=f.o[0];w.fz=f.o[2];w.from=f.key;w.n=w.n||0;}const a=Math.min(1.4*dt,S[f.ore],20-w.n);w.n+=a;S[f.ore]-=a;t.got=(t.got||0)+a;
      if(P.smoke&&Math.random()<dt*2){const p=this.toW(f,t.cx,t.car.ay+3.3,t.car.az);Particles.spawn(p[0],p[1],p[2],(Math.random()-0.5)*0.8,0.4,(Math.random()-0.5)*0.8,1.4,0.35,1.3,1);}
      if(w.n>=19.95||S[f.ore]<0.02){w.n=Math.min(20,w.n);s.ph='close';s.t=0.6;s.pour=false;if(t.got>=1)this.icon(f,t,`+${Math.round(t.got)} ${ORE[f.ore].icon}`);}return;}
    if((s.t-=dt)<=0){s.task=null;s.ph='idle';}},
  /* the farm's grain arm: it swings to the nearer of the (at most two) hoppers within its reach and fills it, then the other; when both are full and more
     stand further back, the train draws up (two wagons at a time) and the arm goes on. s.ax: where along the track the spout is now */
  grainWork(f,c){const a0=f.tw&&f.tw.si?f.tw.a:0,ps=c.tr.poses,ld=(c.tr.rev||1)<0?ps[ps.length-1]:ps[0],tl=(c.tr.rev||1)<0?ps[0]:ps[ps.length-1],sg=ps.length>1?Math.sign(this.toL(f,ld.c[0],ld.c[2])[0]-this.toL(f,tl.c[0],tl.c[2])[0])||1:1;
    const open=c.cars.filter(q=>(q.w.n||0)<19.9),by=(p,q)=>Math.abs(p.ax-a0)-Math.abs(q.ax-a0);return{a0,sg,reach:open.filter(q=>Math.abs(q.ax-a0)<KIT.GRAIN.swing).sort(by),rest:open.filter(q=>Math.abs(q.ax-a0)>=KIT.GRAIN.swing&&(q.ax-a0)*sg<0).sort(by)};},
  runGrain(f,s,dt){const S=Goods.get(f.key),a0=f.tw&&f.tw.si?f.tw.a:0,mv=(to,sp)=>{if(s.ax===undefined)s.ax=a0;const d=to-s.ax;if(Math.abs(d)<=sp){s.ax=to;return true;}s.ax+=Math.sign(d)*sp;return false;};
    if(s.ph==='idle'){s.pour=false;const c=this.cars(f);if(!c)s.stuck=null;let t=null;if(c&&c.tr.grainStuck){s.stuck=c.tr.id;c.tr.grainStuck=false;}
      if(c&&S.grain>=1){const w=this.grainWork(f,c);if(w.reach.length)t={mode:'grain',tr:c.tr,car:w.reach[0]};
        else if(w.rest.length&&s.stuck!==c.tr.id&&mv(a0,1.6*dt)&&!c.tr.grainMove&&c.tr.stopTgt&&c.tr.stopTgt.rem<3){const q=w.rest[0],q2=w.rest[1],tg=q2&&Math.abs(q2.ax-q.ax)<VEH.wagon.len+COUPLE+1.5?(q.ax+q2.ax)/2:q.ax;c.tr.grainMove=Math.abs(tg-a0);return;}}
      if(!t){if(!c||!this.grainWork(f,c).rest.length)mv(a0,1.2*dt);return;}s.task=t;s.ph='swing';}
    const t=s.task;if(!this.still(f,t)){s.task=null;s.ph='idle';s.pour=false;return;}const w=t.car.w;
    if(s.ph==='swing'){s.pour=false;if(mv(t.car.ax,1.6*dt)){s.ph='pour';t.got=0;}return;}
    if(s.ph==='pour'){s.pour=true;if(!(w.n>=0.5)){w.fx=f.o[0];w.fz=f.o[2];w.from=f.key;w.n=w.n||0;}const a=Math.min(1.1*dt,S.grain,20-w.n);w.n+=a;S.grain-=a;t.got+=a;
      if(P.smoke){const G=KIT.GRAIN,y0=f.o[1]-0.2+G.pivot[1]-(G.pivot[1]-G.tipY)*Math.hypot(s.ax-a0,G.reach)/G.reach;let n=Math.floor(dt*40+Math.random());while(n-->0){const p=this.toW(f,s.ax+(Math.random()-0.5)*0.25,0,(Math.random()-0.5)*0.25);Particles.spawn(p[0],y0,p[2],(Math.random()-0.5)*0.3,-2.6-Math.random(),(Math.random()-0.5)*0.3,0.45,0.16,0.3,2);}
        if(Math.random()<dt*3){const p=this.toW(f,s.ax,t.car.ay+3.0,0);Particles.spawn(p[0],p[1],p[2],(Math.random()-0.5)*0.8,0.5,(Math.random()-0.5)*0.8,1.6,0.4,1.5,2);}}
      if(w.n>=19.95||S.grain<0.02){w.n=Math.min(20,w.n);s.ph='close';s.t=0.5;s.pour=false;if(t.got>=1)this.icon(f,t,`+${Math.round(t.got)} 🌾`);}return;}
    if((s.t-=dt)<=0){s.task=null;s.ph='idle';}},
  run(f,s,dt){if(f.kind==='farm')return this.runGrain(f,s,dt);if(f.kind==='mine')return this.runOre(f,s,dt);const g=1.6*dt,tv=1.2*dt,hv=0.9*dt,mv=(k,to,step)=>{const d=to-s[k];if(Math.abs(d)<=step){s[k]=to;return true;}s[k]+=Math.sign(d)*step;return false;};
    if(s.ph==='idle'){s.task=this.plan(f,s);if(!s.task){mv('hy',CRN.rest,hv);mv('tz',CRN.zPile,tv);return;}s.ph='lift';}
    const t=s.task;
    if(!this.still(f,t)){if(s.load>=0&&t.mode==='load')this.back(f,s,t);else if(s.load>=0)this.drop(f,s,t);s.load=-1;s.task=null;s.ph='idle';return;}
    const L=t.mode==='load';
    switch(s.ph){
      case'lift':if(mv('hy',CRN.rest,hv))s.ph=L?'toPile':'toCar';break;
      case'toPile':{const a=mv('gx',t.px,g),b=mv('tz',CRN.zPile,tv);if(a&&b)s.ph='downP';break;}
      case'downP':if(mv('hy',this.pileTop(s,t)+CRN.sling,hv)){s.ph='hookP';s.t=1.4;}break;
      case'hookP':if((s.t-=dt)<=0){if(L)this.pick(f,s,t);else this.drop(f,s,t);s.ph='upP';}break;
      case'upP':if(mv('hy',CRN.rest,hv))s.ph=L?'toCar':'done';break;
      case'toCar':{const a=mv('gx',t.car.ax,g),b=mv('tz',t.car.az,tv);if(a&&b)s.ph='downC';break;}
      case'downC':if(mv('hy',this.carTop(t)+CRN.sling,hv)){s.ph='hookC';s.t=1.4;}break;
      case'hookC':if((s.t-=dt)<=0){if(L)this.put(f,s,t);else this.take(f,s,t);s.ph='upC';}break;
      case'upC':if(mv('hy',CRN.rest,hv))s.ph=L?'done':'toPile';break;
      default:s.task=null;s.ph='idle';}},
  update(dt){if(!App.T||!R.world){this.F=[];return;}const sp=+P.craneSpeed||2.5,F=this.frames(),live=new Set();this.hold.clear();
    for(const f of F){live.add(f.key);const s=this.st(f.key);f.s=s;this.sync(f,s,dt);this.run(f,s,Math.min(dt,0.1)*sp);
      // a train waits while a bundle is on its way or while there is work for it here
      if(f.st){const t=s.task;if(t&&t.tr)this.hold.set(t.tr.id,t.mode);else{const c=this.cars(f);if(c&&(f.kind==='farm'?(Goods.get(f.key).grain>=1&&(()=>{const w=this.grainWork(f,c);return w.reach.length>0||(w.rest.length>0&&s.stuck!==c.tr.id);})()):f.kind==='mine'?c.cars.some(q=>(q.w.n||0)<19.9)&&Goods.get(f.key)[f.ore]>=1:f.kind==='sawmill'?c.cars.some(q=>this.rows(q.w.n)<3)&&s.stacks.some(r=>r>0):c.cars.some(q=>this.rows(q.w.n)>0&&q.w.from!==f.key)))this.hold.set(c.tr.id,f.kind==='farm'?'grain':f.kind==='mine'?'pour':f.kind==='sawmill'?'load':'unload');}}
      // the steam winch smokes while the crane works
      if(s.task&&f.kind!=='mine'&&f.kind!=='farm'&&P.smoke&&(s.puff-=dt)<=0){s.puff=0.45;const p=this.toW(f,s.gx+0.8,7.4,CRN.zB-0.85);Particles.spawn(p[0],p[1],p[2],(Math.random()-0.5)*0.4,1.4,(Math.random()-0.5)*0.4,2.6,0.25,1.1,0);}}
    for(const k of [...this.S.keys()])if(!live.has(k))this.S.delete(k);this.F=F;
    // the mill engine's stack smokes in the working day
    const h=P.timeOfDay;if(P.smoke&&h>6.5&&h<19.5&&R.focus)for(const m of Life.sawmills||[]){if(Math.hypot(m.x-R.focus[0],m.z-R.focus[2])>1400)continue;if(Math.random()<dt*3){const c=Math.cos(m.rot),sn=Math.sin(m.rot);
      const S=KIT.SAW.stack;Particles.spawn(m.x+c*S[0]-sn*S[2],(m.y||0)+S[1],m.z+sn*S[0]+c*S[2],(Math.random()-0.5)*0.6,1.8,(Math.random()-0.5)*0.6,5,0.6,3,1);}}
    // water pouring from the flume onto the wheel and splashing in the pit (near the camera only)
    if(P.smoke&&R.focus)for(const m of Life.sawmills||[]){if(!Life.indOn('sawmill',m)||Math.hypot(m.x-R.focus[0],m.z-R.focus[2])>300)continue;const c=Math.cos(m.rot),sn=Math.sin(m.rot),F=KIT.SAW.flumeEnd,W=KIT.SAW.wheel,up=m.up||1,P2=(lx,lz)=>[m.x+c*lx-sn*lz,m.z+sn*lx+c*lz];
      let n=Math.floor(dt*26+Math.random());while(n-->0){const lx=F[0]+(Math.random()-0.5)*1.0,lz=F[2]-up*(0.3+Math.random()*0.8),p=P2(lx,lz);Particles.spawn(p[0],(m.y||0)+F[1]-0.2,p[1],(Math.random()-0.5)*0.3,-1.5-Math.random(),(Math.random()-0.5)*0.3,0.7+Math.random()*0.4,0.18,0.5,3);}
      if(Math.random()<dt*10){const p=P2(W[0]+(Math.random()-0.5)*1.2,W[2]-up*(1.5+Math.random()*1.5));Particles.spawn(p[0],(m.y||0)+0.5,p[1],(Math.random()-0.5)*0.6,0.6+Math.random()*0.6,(Math.random()-0.5)*0.6,0.9,0.2,0.9,3);}}},
  holds(tr){return this.hold.has(tr.id);},
  what(tr){const m=this.hold.get(tr.id);return m==='grain'?'loading grain':m==='unload'?'unloading logs':m==='pour'?'loading ore':'loading logs';},
  // where a train should stop at a station: at a crane station the first timber wagon draws up at the far end of the yard
  stopAt(tr,st,L){const base=Math.min((st.len||44)/2-3,L/2);
    if(st.farm){/* the first two grain hoppers still to fill come to stand either side of the arm */const si=(Life.stInfo||[]).find(q=>q.st===st),fm=Life.farmOf(st),tw=si&&fm?Life.farmTower(fm):null,a0=tw&&tw.si?tw.a:0,ps=tr.poses||[],back=(tr.rev||1)<0;let sg=1;
      if(si&&ps.length>1){const ld=back?ps[ps.length-1]:ps[0],tl=back?ps[0]:ps[ps.length-1];sg=Math.sign((ld.c[0]-tl.c[0])*si.dx+(ld.c[2]-tl.c[2])*si.dz)||1;}
      let front=0,n=0,f0=-1;for(const v of back?tr.veh.slice().reverse():tr.veh){if(v.k==='wagon'&&v.ctype==='grain'&&(v.n||0)<19.9){if(f0<0)f0=front;if(front-f0<VEH.wagon.len+COUPLE+1)n++;}front+=v.len+COUPLE;}
      return f0<0?base:Math.max(3,a0*sg+f0+(n>1?VEH.wagon.len+COUPLE/2:VEH.wagon.len/2)+1.5);}if(!(st.sawmill||st.workshop||st.mine))return base;const want=st.mine?(this.ind('mine',st.mine)||{}).type:'wood';let front=0;for(const v of tr.veh){if(v.k==='wagon'&&v.ctype===want)return Math.max(base,Math.min(front+20.5,L-1));front+=v.len+COUPLE;}return base;},
  mat(f,x,y,z,sy){const X=f.X,Z=f.Z,o=f.o;return new Float32Array([X[0],0,X[1],0,0,sy||1,0,0,Z[0],0,Z[1],0,o[0]+X[0]*x+Z[0]*z,o[1]+y,o[2]+X[1]*x+Z[1]*z,1]);},
  draw(pass){if(!this.F.length||!R.veh||!R.veh[18])return;const p=R.pVeh,c=Cam.pos||R.focus||[0,0,0];gl.useProgram(p.p);gl.uniform1i(p.u('uPass'),pass);gl.uniform3f(p.u('uLamp'),1,1,1);gl.uniform1f(p.u('uDist'),0);gl.uniform2f(p.u('uOcc'),0,0);
    const dm=(mi,M)=>{const m=R.veh[mi];gl.uniformMatrix4fv(p.u('uModel'),false,M);gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,0);Stats.draws++;Stats.tris+=m.count/3;};
    for(const f of this.F){const s=f.s;if(!s||f.kind==='farm'||Math.hypot(f.o[0]-c[0],f.o[2]-c[2])>1600)continue;
      if(f.kind==='mine'){const i=['gold','silver','diamond'].indexOf(f.ore),S=Goods.get(f.key)[f.ore];dm(28+i,this.mat(f,-8,-0.18,-14,0.35+2.4*Math.min(1,S/60)));
        if(s.pour&&s.task){const t=s.task,top=4.55,bot=t.car.ay+1.74+0.12+1.6*Math.min(1,(t.car.w.n||0)/20);dm(25+i,this.mat(f,t.cx,top,t.car.az,Math.max(0.1,top-bot)));}continue;}
      if(f.bs)dm(10,this.mat(f,0,0,0));dm(11,this.mat(f,s.gx,0,0));dm(12,this.mat(f,s.gx,0,s.tz));dm(13,this.mat(f,s.gx,CRN.drumY,s.tz,CRN.drumY-s.hy));dm(14,this.mat(f,s.gx,s.hy,s.tz));
      if(s.load>=0)dm(18+s.load,this.mat(f,s.gx,s.hy-CRN.sling,s.tz));
      for(let i=0;i<5;i++)for(let r=0;r<s.stacks[i];r++)dm(15+r,this.mat(f,CRN.stackX[i],CRN.rowY0+r*CRN.rowDY+CRN.logR,CRN.zPile));}
    gl.bindVertexArray(null);}};
// ---- trains
const Trains={list:[],sel:-1,parts:[],nextId:1,
  init(){const ms=[locoMesh(),tenderMesh(),coachMesh([0.72,0.20,0.17],[0.96,0.88,0.70]),coachMesh([0.20,0.48,0.34],[0.96,0.90,0.74]),signalMesh(),stationMesh(),hopperMesh(),wagonMesh(1),wagonMesh(2),wagonMesh(3),loadStageMesh(),gantryMesh(),trolleyMesh(),cableMesh(),hookMesh(),logRowMesh(0),logRowMesh(1),logRowMesh(2),logRowMesh(0,true),logRowMesh(1,true),logRowMesh(2,true),
    oreWagonMesh(),...['gold','silver','diamond'].map(oreLoadMesh),...['gold','silver','diamond'].map(oreStreamMesh),...['gold','silver','diamond'].map(oreHeapMesh),oreYardMesh(),platPieceMesh(false),platPieceMesh(true),loco01Mesh(),tender01Mesh(),grainHeapMesh(),...planeMeshes()];R.buildVehicleMeshes(ms);R.planeMesh=R.veh.slice(37,46);
    R.signalMesh=R.veh[4];R.stationMesh=R.veh[5];R.platMesh=[R.veh[32],R.veh[33]];},
  cur(){return this.list[this.sel]||null;},
  locoPair(lt){const S=LOCOS[lt]||LOCOS.std,k=lt&&LOCOS[lt]&&lt!=='std'?lt:undefined;return[{k:'loco',...VEH[S.loco],mesh:S.mesh[0],lt:k},{k:'tender',...VEH[S.tender],mesh:S.mesh[1]}];},
  setLoco(t,lt){const veh=[...this.locoPair(lt),...t.veh.slice(2)];if(advance(t.head,-this.length(veh)).blocked){UI.toast(`No room for the longer locomotive behind ${t.name}`);return false;}t.veh=veh;t.poses=[];this.place(t);return true;},
  goodsConsist(n,lt){const v=this.locoPair(lt),T=['grain','produce','mail','wood'];for(let i=0;i<Math.max(4,n+2);i++){const t=i%4;v.push({k:'wagon',...VEH.wagon,mesh:6+t,ctype:T[t],n:0});}return v;},
  consist(n,livery,lt){const v=this.locoPair(lt);for(let i=0;i<n;i++)v.push({k:'coach',...VEH.coach,mesh:2+(livery||0)});return v;},
  length(veh){return veh.reduce((a,v)=>a+v.len+COUPLE,0);},
  add(at,vh){
    if(!Track.segs.length){UI.toast('Build some track first');return;}
    if(at){const tr0={id:this.nextId++,head:at,v:0,throttle:0,brake:0,rev:1,veh:vh,dist:0,beat:0,joint:0,whistle:false,auto:false,autoKmh:40,derailed:false,slip:false,shake:0,name:`Train ${this.list.length+1}`};
      this.list.push(tr0);this.sel=this.list.length-1;this.place(tr0);UI.toast(`${tr0.name} is on the line`);Drive.refresh();return;}
    const tx=Cam.target[0],tz=Cam.target[2];let best=null,bd=1e9;
    for(const s of Track.segs){if(s.pend)continue;const [t,d]=segNearest(s,tx,tz);const tc=clamp(t,0,s.L);const q=segPoint(s,tc);const dd=Math.hypot(q[0]-tx,q[1]-tz);if(dd<bd){bd=dd;best={sid:s.id,t:tc,dir:1};}}
    const veh=this.consist(P.trainCars,this.list.length%2),L=this.length(veh);
    let head=best;for(const dir of [1,-1]){const h={...best,dir};const back=advance(h,-L);if(!back.blocked){head=h;break;}
      const fwd=advance(back.pos,L+1);if(!fwd.blocked&&!advance(fwd.pos,-L).blocked){head=fwd.pos;break;}head=null;}
    if(!head){UI.toast(`Not enough track here — this train needs ${L.toFixed(0)} m`);return;}
    const tr={id:this.nextId++,head,v:0,throttle:0,brake:0,rev:1,veh,dist:0,beat:0,joint:0,whistle:false,auto:false,autoKmh:40,derailed:false,slip:false,shake:0,name:`Train ${this.list.length+1}`};
    this.list.push(tr);this.sel=this.list.length-1;this.place(tr);Log.info(`${tr.name} added: ${veh.length} vehicles, ${L.toFixed(0)} m`);UI.toast(`${tr.name} is on the line`);Drive.refresh();},
  remove(){if(this.sel<0)return;const t=this.list.splice(this.sel,1)[0];t.whistle=false;Sfx.whistle(t,false);this.sel=Math.min(this.sel,this.list.length-1);Log.info(`${t.name} removed`);Drive.refresh();},
  trackChanged(){const before=this.list.length;this.list=this.list.filter(t=>{let ok=!!segById(t.head.sid);let off=0;for(const v of t.veh){if(!ok)break;ok=!advance(t.head,-(off+v.len)).blocked||true;off+=v.len+COUPLE;}return ok;});
    if(this.list.length<before){UI.toast('A train lost its track and was removed');this.sel=Math.min(this.sel,this.list.length-1);Drive.refresh();}},
  // vehicle placement: two pivot points on the track give position, heading and pitch
  place(tr){let off=0;tr.poses=[];
    for(const v of tr.veh){const c=off+v.len/2;const f=posInfo(advance(tr.head,-(c-v.pf)).pos),r=posInfo(advance(tr.head,-(c-v.pr)).pos);off+=v.len+COUPLE;
      if(!f||!r){tr.poses.push(null);continue;}
      let X=[f.x-r.x,f.y-r.y,f.z-r.z];const l=Math.hypot(...X)||1;X=X.map(q=>q/l);
      let Y=[0,1,0];const d=X[1];Y=[Y[0]-X[0]*d,Y[1]-X[1]*d,Y[2]-X[2]*d];const yl=Math.hypot(...Y);Y=Y.map(q=>q/yl);
      let Z=[X[1]*Y[2]-X[2]*Y[1],X[2]*Y[0]-X[0]*Y[2],X[0]*Y[1]-X[1]*Y[0]];
      if(tr.derailed){const rl=0.9*(off%2?1:-1)*Math.min(1,tr.derailT||1);const cy=Math.cos(rl),sy=Math.sin(rl);const Y2=Y.map((q,i)=>q*cy+Z[i]*sy),Z2=Z.map((q,i)=>q*cy-Y[i]*sy);Y=Y2;Z=Z2;}
      const c0=[f.x-X[0]*v.pf,f.y-X[1]*v.pf,f.z-X[2]*v.pf];
      tr.poses.push({m:new Float32Array([X[0],X[1],X[2],0,Y[0],Y[1],Y[2],0,Z[0],Z[1],Z[2],0,c0[0],c0[1],c0[2],1]),c:c0,X,inTunnel:f.inTunnel,k:f.k,grade:(f.grade+r.grade)/2});}},
  update(dt){Net.updateOcc();for(const tr of this.list)this.step(tr,dt);this.collisions();Particles.update(dt);},
  step(tr,dt){
    const g=9.81*P.gravityScale,M=tr.veh.reduce((a,v)=>a+v.m,0),loco=tr.veh[0];const v=tr.v;
    if(tr.auto&&!tr.derailed)Net.autoDrive(tr,dt);else{tr.status=tr.derailed?'Derailed':Math.abs(v)<0.1?'Standing':'Driven by you';tr.resB=null;tr.redAt=null;
      if(!tr.derailed&&Track.sigs.length){const sa=Net.sigAhead(tr,Net.scan(tr,v*v/1.2+40));if(sa&&sa.red)tr.redAt=sa.e.d;}}
    let Fg=0;let off=0;for(let i=0;i<tr.veh.length;i++){const p=tr.poses&&tr.poses[i];if(p){const gr=P.toyGrades?clamp(p.grade,-0.05,0.05):p.grade;Fg-=tr.veh[i].m*g*gr/Math.sqrt(1+gr*gr);}}
    const vs=Math.max(Math.abs(v),1.2);let Ft=tr.derailed?0:tr.throttle*Math.min(P.locoTE*1000,P.locoPower*1000/vs)*tr.rev*locoSpec(tr).te;
    const adh=0.26*(loco.m+10000)*9.81*P.adhesion;tr.slip=Math.abs(Ft)>adh;if(tr.slip)Ft=Math.sign(Ft)*adh*0.75;
    const k=tr.poses&&tr.poses[0]?Math.abs(tr.poses[0].k):0,Rr=k>1e-6?1/k:1e9;
    const resist=M*g*P.rollingRes+M*g*Math.min(0.012,0.5/Math.max(Rr,60))+(tr.derailed?M*g*0.5:0)+tr.brake*0.14*M*g*P.brakeStrength;
    const Fa=0.5*1.2*(9+2.5*(tr.veh.length-2))*v*Math.abs(v),Fn=Ft+Fg-Fa;
    let nv;if(Math.abs(v)<0.05&&Math.abs(Fn)<=resist)nv=0;
    else{const dir=Math.abs(v)<0.05?Math.sign(Fn):Math.sign(v);nv=v+(Fn-dir*resist)/M*dt;if(Math.sign(nv)!==Math.sign(v)&&Math.abs(v)>=0.05&&Math.abs(Fn)<resist)nv=0;}
    if(tr.auto&&tr.vCap!=null&&Math.abs(nv)>tr.vCap+0.05)nv=Math.sign(nv)*Math.max(tr.vCap,Math.abs(v)-1.4*dt);
    // a red signal is never passed: when the normal brakes are not enough to stop 3 m before it, brake as hard as it takes
    tr.ebrake=false;if(tr.redAt!=null&&!tr.derailed){const s=tr.redAt-3,av=Math.abs(v);if(s<=0.3){if(av>0.05)tr.ebrake=true;nv=0;}else{const need=av*av/(2*s);if(need>0.9&&Math.abs(nv)>0){nv=Math.sign(nv)*Math.max(0,av-need*1.08*dt);tr.ebrake=true;}}
      if(tr.ebrake){tr.status='Emergency stop: red signal';tr.throttle=0;tr.brake=1;}}
    tr.acc=(nv-v)/Math.max(dt,1e-4);tr.v=nv;
    // derailment on curves taken too fast (optional, fun)
    if(P.derail&&!tr.derailed&&Rr<1e8&&Math.abs(nv)>Math.sqrt(P.derailAccel*Rr)){tr.derailed=true;tr.derailT=0;UI.toast(`${tr.name} derailed! Too fast for a ${Rr.toFixed(0)} m curve`);Sfx.crash(tr);Log.warn(`${tr.name} derailed at ${(nv*3.6).toFixed(0)} km/h, radius ${Rr.toFixed(0)} m`);}
    if(tr.derailed){tr.derailT=Math.min(1,(tr.derailT||0)+dt*2);}
    const ds=tr.v*dt;
    if(Math.abs(ds)>0){const front=ds>0?tr.head:advance(tr.head,-this.length(tr.veh)+COUPLE).pos;// the end leading the motion
      const a=advance(front,ds,tr,true);
      if(a.blocked){if(Math.abs(tr.v)>2.5){UI.toast(`${tr.name} hit the buffers at ${(Math.abs(tr.v)*3.6).toFixed(0)} km/h`);Sfx.crash(tr);tr.shake=0.6;}tr.v=0;}
      else{if(ds>0)tr.head=a.pos;else tr.head=advance(a.pos,this.length(tr.veh)-COUPLE).pos;tr.dist+=ds;}}
    this.place(tr);tr.shake=Math.max(0,tr.shake-dt);
    // exhaust beats: 4 per driving-wheel turn
    const per=2*Math.PI*locoSpec(tr).R/4,b=Math.floor(Math.abs(tr.dist)/per);
    if(b!==tr.beat){tr.beat=b;if(!tr.derailed){const str=clamp(tr.throttle*(1.2-Math.min(Math.abs(tr.v)/30,0.7)),0,1);Particles.puff(tr,str);Sfx.chuff(tr,str);}}
    if(Math.abs(tr.v)<0.2&&Math.random()<dt*2)Particles.puff(tr,0.05);
    if(tr.throttle>0.15&&Math.abs(tr.v)<4&&!tr.derailed)Particles.drain(tr,dt);
    if(tr.whistle)Particles.whistle(tr,dt);
    // rail joints every 18 m: a click under every axle
    const j=Math.floor(tr.dist/18);if(j!==tr.joint){tr.joint=j;Sfx.joints(tr);}
    Sfx.trainLoop(tr,Rr);
  },
  collisions(){const L=this.list;for(let a=0;a<L.length;a++)for(let b=a+1;b<L.length;b++){const A=L[a],B=L[b];if(!A.poses||!B.poses)continue;
    for(const pa of A.poses)for(const pb of B.poses){if(!pa||!pb)continue;if(Math.hypot(pa.c[0]-pb.c[0],pa.c[1]-pb.c[1],pa.c[2]-pb.c[2])<9){
      if(Math.abs(A.v)+Math.abs(B.v)>1.5){UI.toast(`${A.name} and ${B.name} collided!`);Sfx.crash(A);A.shake=B.shake=0.8;}
      const rel=A.v-B.v;A.v=B.v=0;return;}}}},
  serialize(){return this.list.map(t=>({head:t.head,lt:t.veh[0].lt||undefined,cars:t.veh.length-2,livery:t.veh[2]&&t.veh[2].k==='coach'?t.veh[2].mesh-2:0,autoKmh:t.autoKmh,name:t.name,
    cons:t.veh.slice(2).map(v=>v.k==='wagon'?{w:v.ctype,n:Math.round((v.n||0)*100)/100,fx:v.fx,fz:v.fz,from:v.from}:{c:v.mesh-2})}));},
  // a vehicle for the wagon editor: 'coach' (livery 0/1) or a goods wagon kind
  car(kind,livery,n){if(kind==='coach')return{k:'coach',...VEH.coach,mesh:2+(livery|0)};if(ORE[kind])return{k:'wagon',...VEH.ore,mesh:21,ctype:kind,n:n||0};const T=['grain','produce','mail','wood'],t=Math.max(0,T.indexOf(kind));return{k:'wagon',...VEH.wagon,mesh:6+t,ctype:T[t],n:n||0};},
  addCar(tr,kind){const t=tr||this.cur();if(!t)return;const live=t.veh.find(v=>v.k==='coach'),v=this.car(kind,live?live.mesh-2:Trains.list.indexOf(t)%2),veh=[...t.veh,v];
    if(advance(t.head,-this.length(veh)).blocked){UI.toast(`No room behind ${t.name} for another ${kind==='coach'?'coach':'wagon'}`);return;}t.veh=veh;this.place(t);Drive.refresh();},
  removeCar(tr){const t=tr||this.cur();if(!t)return;if(t.veh.length<=2){UI.toast(`${t.name} has no wagons left`);return;}t.veh.pop();t.poses.length=t.veh.length;this.place(t);Drive.refresh();},
  load(d){this.list=[];this.sel=-1;if(!d)return;for(const o of d){if(!segById(o.head.sid))continue;const veh=o.cons?[...this.consist(0,0,o.lt),...o.cons.map(q=>{if(q.w){const v=this.car(q.w,0,q.n);v.fx=q.fx;v.fz=q.fz;v.from=q.from;return v;}return this.car('coach',q.c);})]:this.consist(o.cars,o.livery,o.lt);
    const tr={id:this.nextId++,head:o.head,v:0,throttle:0,brake:0.3,rev:1,veh,dist:0,beat:0,joint:0,whistle:false,auto:false,autoKmh:o.autoKmh||40,derailed:false,slip:false,shake:0,name:o.name||`Train ${this.list.length+1}`};
    this.list.push(tr);this.place(tr);Money.paidTr.add(tr.id);/* already paid for when it was bought (loading a save charged it again before 4.14.0) */}this.sel=this.list.length?0:-1;},
  rerail(){const t=this.cur();if(!t)return;t.derailed=false;t.v=0;t.derailT=0;this.place(t);UI.toast('Back on the rails');}
};
function locoPoint(tr,lx,ly,lz){const p=tr.poses&&tr.poses[0];if(!p)return null;const m=p.m;return[m[12]+m[0]*lx+m[4]*ly+m[8]*lz,m[13]+m[1]*lx+m[5]*ly+m[9]*lz,m[14]+m[2]*lx+m[6]*ly+m[10]*lz];}

// ---- smoke and steam
const Particles={max:2600,n:0,arr:null,
  init(){this.arr=new Float32Array(this.max*12);},
  spawn(x,y,z,vx,vy,vz,life,s0,s1,type){if(!this.arr)this.init();let i=this.n<this.max?this.n++:Math.floor(Math.random()*this.max);const a=this.arr,o=i*12;
    a[o]=x;a[o+1]=y;a[o+2]=z;a[o+3]=vx;a[o+4]=vy;a[o+5]=vz;a[o+6]=0;a[o+7]=life;a[o+8]=s0;a[o+9]=s1;a[o+10]=type;a[o+11]=Math.random();},
  puff(tr,str){if(!P.smoke)return;const S=locoSpec(tr),p=locoPoint(tr,S.chim[0],S.chim[1],0);if(!p)return;const X=tr.poses[0].X,v=tr.v,n=Math.round(2+str*6);
    for(let k=0;k<n;k++)this.spawn(p[0],p[1],p[2],X[0]*v*0.6+(Math.random()-0.5)*1.2,3+str*5+Math.random()*1.5,X[2]*v*0.6+(Math.random()-0.5)*1.2,2.5+Math.random()*2.5+str*2,0.4,1.6+str*3,str>0.15?0:1);},
  drain(tr,dt){if(!P.smoke)return;const S=locoSpec(tr);for(const z of [-S.drain[2],S.drain[2]])if(Math.random()<dt*16){const p=locoPoint(tr,S.drain[0],S.drain[1],z);if(!p)continue;const m=tr.poses[0].m;
    this.spawn(p[0],p[1],p[2],m[8]*z*2.2+(Math.random()-0.5),0.5+Math.random(),m[10]*z*2.2+(Math.random()-0.5),0.9+Math.random()*0.6,0.3,1.8,1);}},
  whistle(tr,dt){if(!P.smoke)return;if(Math.random()<dt*30){const S=locoSpec(tr),p=locoPoint(tr,S.whistle[0],S.whistle[1],0);if(p)this.spawn(p[0],p[1],p[2],(Math.random()-0.5)*0.5,4+Math.random()*2,(Math.random()-0.5)*0.5,0.7+Math.random()*0.4,0.15,1.3,1);}},
  update(dt){if(!this.arr)return;const a=this.arr,wa=P.windDir*Math.PI/180,wx=Math.cos(wa)*P.windStrength*4,wz=Math.sin(wa)*P.windStrength*4;
    for(let i=0;i<this.n;i++){const o=i*12;a[o+6]+=dt;if(a[o+6]>a[o+7]){const l=(this.n-1)*12;for(let k=0;k<12;k++)a[o+k]=a[l+k];this.n--;i--;continue;}
      const dr=Math.min(1,dt*1.4);a[o+3]+=(wx-a[o+3])*dr;a[o+5]+=(wz-a[o+5])*dr;a[o+4]+=((a[o+10]<0.5?0.9:a[o+10]>3.5?-0.85:a[o+10]>2.5?0.4:0.6)-a[o+4])*dr*0.8;if(a[o+10]>3.5){a[o+3]*=0.55;a[o+5]*=0.55;}
      a[o]+=a[o+3]*dt;a[o+1]+=a[o+4]*dt;a[o+2]+=a[o+5]*dt;}}
};
