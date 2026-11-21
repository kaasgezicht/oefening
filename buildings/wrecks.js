'use strict';
// ===== buildings/wrecks.js — wrecks on the sea floor (4.58.0, the user: "add wreckages to the sea floor, one every 4 km²"; they also
// hold fish). Three kinds, in the house kit, weathered: weed and barnacle growths, broken planking, rust.
//  wreckSail:  a wooden sailing ship (26 m): keel, ribs standing bare along one side, planking left on the other and low down, the stern
//              post, deck beams here and there, the main mast fallen across, spars, two cannon and an anchor, loose timbers.
//  wreckSteam: a small steamer (36 m) in riveted plate, broken open amidships: the boiler showing in the gap, the funnel and the mast
//              fallen beside her, a collapsed deckhouse, portholes, rust.
//  wreckTrawl: a small wooden fishing boat (12 m) with its wheelhouse and mast (laid on its side by the instance's roll).
// Model frame (like the fishing boats): x to starboard, y up (y 0 = the gunwale amidships), z aft (bow to −z). Js/wrecks.js places them
// with the keel in the sand (the instance's y), turned and tilted (pitch and roll packed in iB.y).
(function(){
const WOOD=[0.24,0.19,0.13],WOOD2=[0.3,0.24,0.16],DARKW=[0.16,0.13,0.1],WEED=[0.17,0.29,0.15],WEED2=[0.24,0.33,0.17],BARN=[0.52,0.5,0.44],
  RUST=[0.36,0.19,0.1],RUST2=[0.44,0.25,0.13],IRON=[0.17,0.17,0.17],PAINT=[0.2,0.22,0.24],SAND=[0.58,0.53,0.42];
function kitW(K){const W=KIT.works(K,[0,0,0]),P=(x,y,z)=>[-x,z,y];
  return{W,P,bb:(x0,x1,y0,y1,z0,z1,col,m)=>W.bx(-x1,-x0,z0,z1,y0,y1,col,m),bm:(a,b,sd,w,t,col,m)=>W.bm(P(...a),P(...b),P(...sd),w,t,col,m),cy:(a,b,r0,r1,n,col,m,cap)=>W.cy(P(...a),P(...b),r0,r1,n,col,m,cap),
    qd:(a,b,c,d,col,m)=>W.qd(P(...a),P(...b),P(...c),P(...d),col,m),ic:(c,r,col,m,o)=>W.ic(P(...c),r,col,m,o)};}
// a hull's lines: half-beam at (z, t) where t 0 = keel, 1 = gunwale; the section is a rounded U, narrowing to the bow and a little aft
function lines(len,beam,depth,bowF){const z0=-len/2,z1=len/2;
  const hb=z=>{const s=(z-z0)/len;let f=s<0.35?Math.pow(Math.sin(s/0.35*Math.PI/2),bowF||0.9):1;if(s>0.8)f*=1-0.35*Math.pow((s-0.8)/0.2,1.6);return beam*f;};
  const P=(z,t,e)=>{const a=t*Math.PI/2;return[e*hb(z)*Math.pow(Math.sin(a),0.7),-depth*Math.cos(a),z];};return{z0,z1,hb,P};}
// weed and barnacles: blobs along a line of points
function growth(H,pts,r,n,rng){for(let k=0;k<n;k++){const p=pts[Math.floor(rng()*pts.length)];H.ic([p[0]+(rng()-0.5)*0.6,p[1]+(rng()-0.5)*0.3,p[2]+(rng()-0.5)*0.6],r*(0.5+rng()*0.7),rng()<0.6?WEED:rng()<0.5?WEED2:BARN,0,{sy:0.6,jit:0.35});}}
function sandBank(H,len,beam,rng){/* drifted sand banked against the hull (a low mound under it) */for(let k=0;k<9;k++){const z=-len/2+len*(k+0.5)/9;H.ic([(rng()-0.5)*beam*0.6,-2.9,z],beam*1.2,SAND,0,{sy:0.25,jit:0.3});}}

// ---- the sailing ship
KIT.models.wreckSail=function(K){K.seed(1201);const H=kitW(K),rng=K.rr?()=>K.rr(0,1):Math.random,{bb,bm,cy,qd,ic}=H,len=26,depth=3.4,Lh=lines(len,3.7,depth,0.8),{z0,z1,P}=Lh;
  sandBank(H,len,3.7,rng);
  bm([0,-depth,z0+0.6],[0,-depth,z1],[1,0,0],0.4,0.5,DARKW,6);/* the keel */bm([0,-depth,z1],[0,0.6,z1+0.4],[1,0,0],0.35,0.4,DARKW,6);/* stern post */bm([0,-depth+0.4,z0+0.6],[0,0.9,z0-0.8],[1,0,0],0.3,0.35,DARKW,6);/* stem */
  const NR=22,ribs=[];for(let i=0;i<=NR;i++)ribs.push(z0+1.2+(len-2.2)*i/NR);
  for(const z of ribs){for(const e of [-1,1]){const top=e>0?(rng()<0.3?0.55:0.92):(rng()<0.5?0.5:1);let pr=P(z,0,e);for(let k=1;k<=6;k++){const t=k/6*top,q=P(z,t,e);bm(pr,q,[0,0,1],0.22,0.24,k%2?WOOD:WOOD2,6);pr=q;}}}
  // planking: the starboard side whole low down and in patches higher up; the port side only along the turn of the bilge
  for(let i=0;i<NR;i++){const za=ribs[i],zb=ribs[i+1];for(let r=0;r<6;r++){const ta=r/6,tb=(r+1)/6;
      for(const e of [-1,1]){const keep=e>0?(r<3||rng()<0.55):(r<2&&rng()<0.75);if(!keep)continue;const a=P(za,ta,e),b=P(zb,ta,e),c=P(zb,tb,e),d=P(za,tb,e);if(e>0)qd(a,b,c,d,rng()<0.5?WOOD:WOOD2,6);else qd(d,c,b,a,rng()<0.5?WOOD:WOOD2,6);}}}
  // deck beams where they still hold, a broken hatch coaming
  for(let i=2;i<NR;i+=3)if(rng()<0.6){const z=ribs[i],a=P(z,0.92,-1),b=P(z,0.92,1);bm([a[0]*0.98,a[1],z],[b[0]*0.98,b[1],z],[0,0,1],0.25,0.28,WOOD2,6);}
  bb(-1.2,1.2,-0.4,0.25,-1.5,1.5,DARKW,6);
  // the fallen main mast across the hull and out onto the sand, a yard beside it, the bowsprit pointing down
  cy([-1.2,-0.4,-3],[9.5,-2.7,-11],0.32,0.24,8,WOOD2,6);cy([2.5,-2.5,-12],[-6,-2.9,-15.5],0.17,0.13,6,WOOD,6);cy([0,0.6,z0-0.5],[0,-1.6,z0-5],0.22,0.15,6,WOOD,6);
  // cannon and an anchor on the sand
  for(const [x,z,a] of [[3.6,-2,0.5],[-4.4,5,-0.9]]){const c=[x,-2.75,z],e=[x+Math.cos(a)*2.2,-2.7,z+Math.sin(a)*2.2];cy(c,e,0.24,0.17,10,IRON,11);cy([c[0]-Math.cos(a)*0.15,c[1],c[2]-Math.sin(a)*0.15],c,0.3,0.28,10,IRON,11);}
  {const a=[-2.5,-2.85,z0-3],b=[-2.5,-2.85,z0-6.2];bm(a,b,[1,0,0],0.16,0.16,IRON,11);bm([b[0]-1.1,b[1],b[2]+0.6],[b[0]+1.1,b[1],b[2]+0.6],[0,1,0],0.14,0.14,IRON,11);bm([a[0]-0.8,a[1],a[2]],[a[0]+0.8,a[1],a[2]],[0,1,0],0.14,0.14,IRON,11);}
  for(let k=0;k<7;k++){const x=(rng()-0.5)*14,z=(rng()-0.5)*30,a=rng()*3.1,l=1.5+rng()*3;bm([x,-2.85,z],[x+Math.cos(a)*l,-2.8,z+Math.sin(a)*l],[0,1,0],0.25,0.08,rng()<0.5?WOOD:DARKW,6);}
  growth(H,ribs.flatMap(z=>[P(z,0.3,1),P(z,0.6,-1),P(z,0.1,1)]),0.35,40,rng);void ic;};

// ---- the steamer: riveted plate, broken open amidships
KIT.models.wreckSteam=function(K){K.seed(1202);const H=kitW(K),rng=K.rr?()=>K.rr(0,1):Math.random,{bb,bm,cy,qd}=H,len=36,depth=4.4,Lh=lines(len,3.8,depth,1.1),{z0,z1,P}=Lh;
  sandBank(H,len,3.8,rng);
  const NS=24,zs=[];for(let i=0;i<=NS;i++)zs.push(z0+0.4+(len-0.8)*i/NS);const gap=[11,12,13];/* the break: sections missing on the port side and the deck */
  for(let i=0;i<NS;i++){const za=zs[i],zb=zs[i+1];for(let r=0;r<5;r++){const ta=r/5,tb=(r+1)/5;
      for(const e of [-1,1]){if(gap.includes(i)&&(e<0||r>1))continue;if(e<0&&(i===10||i===14)&&r>2)continue;const a=P(za,ta,e),b=P(zb,ta,e),c=P(zb,tb,e),d=P(za,tb,e),col=rng()<0.35?RUST2:r>2?PAINT:RUST;if(e>0)qd(a,b,c,d,col,25);else qd(d,c,b,a,col,25);}}}
  // bow and stern closed with plates, the deck (missing over the break), a rubbing strake
  {const n=6;for(let r=0;r<n;r++){const ta=r/n,tb=(r+1)/n;const A=P(z0+0.4,ta,-1),B=P(z0+0.4,ta,1),C=P(z0+0.4,tb,1),D=P(z0+0.4,tb,-1);qd(A,B,C,D,RUST,25);const E=P(z1-0.4,ta,1),F=P(z1-0.4,ta,-1),G=P(z1-0.4,tb,-1),J=P(z1-0.4,tb,1);qd(E,F,G,J,RUST,25);}}
  for(let i=0;i<NS;i++){if(gap.includes(i)||i===10||i===14)continue;const za=zs[i],zb=zs[i+1],a=P(za,1,-1),b=P(za,1,1),c=P(zb,1,1),d=P(zb,1,-1);qd([a[0],0,za],[b[0],0,za],[c[0],0,zb],[d[0],0,zb],rng()<0.5?RUST:[0.3,0.24,0.18],12);}
  for(const e of [-1,1])bm(P(z0+1,1,e),P(z1-1,1,e),[0,1,0],0.18,0.2,IRON,11);
  // the boiler in the gap, the funnel and the mast fallen to starboard, the deckhouse collapsed, portholes
  cy([0,-2.6,zs[11]+0.4],[0,-2.6,zs[13]+1],1.6,1.6,14,RUST2,25,true);
  cy([2.5,-1.2,zs[12]],[8.5,-3.2,zs[12]+3],0.9,0.9,12,[0.12,0.1,0.09],25,true);bb(2.2,3,-1.4,-0.6,zs[12]-0.9,zs[12]+0.9,RUST,25);
  cy([0.5,0,-8],[7.5,-3.3,-17],0.18,0.12,6,IRON,11);
  bb(-2.2,1.4,0,1.8,zs[16],zs[19],PAINT,25);bb(-2.4,1.2,1.8,2.0,zs[16]-0.2,zs[19]+0.2,RUST,25);bb(-0.6,2.4,0,0.9,zs[18],zs[19],RUST2,25);
  for(let i=1;i<NS;i+=2){if(gap.includes(i))continue;for(const e of [-1,1]){const p=P(zs[i],0.85,e);cy([p[0]*1.005,p[1],p[2]],[p[0]*1.005+e*0.05,p[1],p[2]],0.17,0.17,8,[0.05,0.05,0.06],11,true);}}
  cy([0,-depth+0.4,z1+0.1],[0,-depth+0.4,z1+0.6],0.12,0.12,6,IRON,11);for(let k=0;k<4;k++){const a=k*1.571+0.3;bm([0,-depth+0.4,z1+0.5],[Math.cos(a)*1.1,-depth+0.4+Math.sin(a)*1.1,z1+0.5],[0,0,1],0.5,0.06,[0.33,0.27,0.16],11);}/* the propeller */
  for(let k=0;k<6;k++){const x=(rng()-0.5)*16,z=(rng()-0.5)*36,a=rng()*3.1,l=1+rng()*2.5;bm([x,-2.85,z],[x+Math.cos(a)*l,-2.8,z+Math.sin(a)*l],[0,1,0],0.6,0.05,RUST,25);}
  growth(H,zs.flatMap(z=>[P(z,0.4,1),P(z,0.7,-1),[0,0.1,z]]),0.4,46,rng);};

// ---- the small fishing boat (laid on her side by the instance)
KIT.models.wreckTrawl=function(K){K.seed(1203);const H=kitW(K),rng=K.rr?()=>K.rr(0,1):Math.random,{bb,bm,cy,qd}=H,len=12,depth=1.9,Lh=lines(len,2.1,depth,0.9),{z0,z1,P}=Lh;
  const NS=12,zs=[];for(let i=0;i<=NS;i++)zs.push(z0+0.3+(len-0.6)*i/NS);
  for(let i=0;i<NS;i++){const za=zs[i],zb=zs[i+1];for(let r=0;r<4;r++){const ta=r/4,tb=(r+1)/4;for(const e of [-1,1]){if(e<0&&i>=5&&i<=7&&r>=1)continue;/* stove in on the port side */const a=P(za,ta,e),b=P(zb,ta,e),c=P(zb,tb,e),d=P(za,tb,e),col=r===3?[0.42,0.4,0.36]:r>1?[0.2,0.3,0.34]:[0.34,0.16,0.1];if(e>0)qd(a,b,c,d,col,6);else qd(d,c,b,a,col,6);}}}
  {const n=4;for(let r=0;r<n;r++){const ta=r/n,tb=(r+1)/n;const E=P(z1-0.3,ta,1),F=P(z1-0.3,ta,-1),G=P(z1-0.3,tb,-1),J=P(z1-0.3,tb,1);qd(E,F,G,J,[0.2,0.3,0.34],6);}}
  for(let i=0;i<NS;i++){const za=zs[i],zb=zs[i+1],a=P(za,1,-1),b=P(za,1,1),c=P(zb,1,1),d=P(zb,1,-1);qd([a[0],-0.25,za],[b[0],-0.25,za],[c[0],-0.25,zb],[d[0],-0.25,zb],WOOD2,6);}
  bm([0,-depth,z0+0.3],[0,-depth,z1],[1,0,0],0.18,0.22,DARKW,6);
  bb(-0.9,0.9,-0.25,1.6,-2.6,-0.6,[0.5,0.48,0.42],6);bb(-1,1,1.6,1.75,-2.75,-0.45,[0.3,0.12,0.08],6);for(const z of [-2.3,-1.6,-0.9])for(const e of [-1,1])bb(e*0.9-0.02,e*0.9+0.02,0.75,1.25,z-0.22,z+0.22,[0.06,0.07,0.08],11);
  cy([0,-0.25,-3.6],[0,4.4,-3.6],0.09,0.07,6,[0.3,0.3,0.28],11);bm([0,3.3,-3.6],[0,2.2,1.5],[1,0,0],0.07,0.07,[0.3,0.3,0.28],11);
  for(let k=0;k<4;k++)bb(-0.3+rng()*0.8,0.3+rng()*0.8,-0.2,0.25,1+k*0.9,1.5+k*0.9,[0.2,0.38,0.62],0);
  growth(H,zs.flatMap(z=>[P(z,0.5,1),P(z,0.2,-1)]),0.25,18,rng);};
})();
