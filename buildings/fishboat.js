'use strict';
// ===== buildings/fishboat.js — the harbours' fishing boats in the house kit (4.54.0), after the user's three reference pictures: a 13 m
// steel trawler with a forward wheelhouse, a lattice ladder mast with crosstrees, outrigger booms raised in a V, a net drum and a stern
// gantry on the low working deck aft, trawl doors on the quarters, tyres hung as fenders, rails round the bow, fish boxes, buoys, drums.
// Three liveries: A weathered light blue under white (rust on the plating), B clean navy with a white sheer line, C red under white.
// Model frame: x to starboard, y up from the design waterline, z aft (the bow points to −z, like the houses' fronts); 13 m long.
// The boats move and pitch and roll (js/coast.js: Coast.dynPut, kit instances with pitch and roll packed in iB.y, see VS_KIT).
// fishBoatL holds the lights alone (navigation lights, masthead and stern lights, deck floodlights, the lit wheelhouse windows): it is
// drawn with a boat only while its lights are on.
(function(){
const WHITE=[0.9,0.89,0.85],BLACK=[0.08,0.08,0.09],AF=[0.43,0.18,0.11],RUST=[0.42,0.22,0.12],GREY=[0.42,0.43,0.42],DECK=[0.46,0.4,0.32],RUB=[0.07,0.07,0.07],
  ORANGE=[0.95,0.42,0.08],NETG=[0.16,0.33,0.24],GLASS=[0.1,0.13,0.16],STEEL=[0.55,0.56,0.55],BLUEBOX=[0.18,0.42,0.78];
const LIV={A:{low:[0.42,0.66,0.86],up:WHITE,m:11,inner:[0.86,0.85,0.8]},B:{low:[0.08,0.14,0.36],up:[0.08,0.14,0.36],m:0,stripe:WHITE,inner:[0.9,0.9,0.88]},C:{low:[0.62,0.12,0.1],up:WHITE,m:11,inner:[0.86,0.85,0.8]}};
// ---- the hull's lines
const L0=-6.5,L1=6.5,BH=2.2;
const sOf=z=>(z-L0)/(L1-L0);
const sheer=z=>{const s=sOf(z);return 1.35+0.95*Math.pow(Math.max(0,(0.4-s)/0.4),1.6);};
const deckY=z=>sheer(z)-0.85;
const zBow=y=>L0+(sheer(L0)-y)*0.32,zStern=y=>y<-0.3?L1-(-0.3-y)*1.6:L1;
const hb=(z,y)=>{const s=sOf(z);let f=1;if(s<0.42){f=Math.max(0,1-Math.pow((0.42-s)/0.42,1.9));f=Math.pow(f,1+Math.max(0,0.8-y)*0.9);}
  if(s>0.8)f*=1-0.12*Math.pow((s-0.8)/0.2,2);if(s>0.7&&y<0)f*=1-Math.pow((s-0.7)/0.3,1.5)*Math.min(1,-y/1.2)*0.85;
  const g=y<-0.3?1-Math.pow((-0.3-y)/1.15,2)*0.75:1;return BH*f*g*(1+0.12*Math.max(0,y)*Math.max(0,0.4-s)/0.4);};
function kitW(K){const W=KIT.works(K,[0,0,0]),P=(x,y,z)=>[-x,z,y];
  return{W,P,bb:(x0,x1,y0,y1,z0,z1,col,m)=>W.bx(-x1,-x0,z0,z1,y0,y1,col,m),bm:(a,b,sd,w,t,col,m)=>W.bm(P(...a),P(...b),P(...sd),w,t,col,m),cy:(a,b,r0,r1,n,col,m,cap)=>W.cy(P(...a),P(...b),r0,r1,n,col,m,cap),
    qd:(a,b,c,d,col,m)=>W.qd(P(...a),P(...b),P(...c),P(...d),col,m),ic:(c,r,col,m,o)=>W.ic(P(...c),r,col,m,o),ob:(c,X,Y,Z,col,m)=>W.ob(P(...c),P(...X),P(...Y),P(...Z),col,m),
    rail:(a,b,h,col,o)=>W.rail(P(...a),P(...b),h,col,o)};}
// a window: glass (dark, or lit when `lit`) in a painted frame with a sill; f = the outward normal (x or z axis), u = the in-plane axis
function windowAt(H,c,f,w,h,glassM,frameCol,onlyGlass){const {bb,ob}=H,u=f[0]?[0,0,1]:[1,0,0],o=[c[0]+f[0]*0.03,c[1],c[2]+f[2]*0.03];
  ob([o[0]+f[0]*(onlyGlass?0.012:0),o[1],o[2]+f[2]*(onlyGlass?0.012:0)],[u[0]*w/2,0,u[2]*w/2],[0,h/2,0],[f[0]*0.004,0,f[2]*0.004],glassM===2?[0.5,0.6,0.66]:GLASS,glassM);if(onlyGlass)return;
  for(const e of [-1,1]){ob([o[0]+u[0]*e*(w/2+0.03),o[1],o[2]+u[2]*e*(w/2+0.03)],[u[0]*0.035,0,u[2]*0.035],[0,h/2+0.06,0],[f[0]*0.03,0,f[2]*0.03],frameCol,0);
    ob([o[0],o[1]+e*(h/2+0.03),o[2]],[u[0]*(w/2+0.06),0,u[2]*(w/2+0.06)],[0,0.035,0],[f[0]*0.03,0,f[2]*0.03],frameCol,0);}void bb;}
// the wheelhouse's windows (shared by the boat and its lights model)
const WH={z0:-3.4,z1:-0.6,x:1.3,h:2.4};
function whWindows(H,lit){const yd=deckY(-2),wy=yd+1.75,G=lit?2:0,FR=[0.85,0.84,0.8];
  for(let k=0;k<4;k++)windowAt(H,[-0.96+k*0.64,wy,WH.z0],[0,0,-1],0.54,0.7,G,FR,lit);
  for(const e of [-1,1]){for(const z of [-2.85,-2.05])windowAt(H,[e*WH.x,wy,z],[e,0,0],0.62,0.66,G,FR,lit);}
  for(const x of [-0.75,0.15])windowAt(H,[x,wy,WH.z1],[0,0,1],0.56,0.62,G,FR,lit);}
function boat(K,lv){K.seed(lv==='A'?901:lv==='B'?902:903);const H=kitW(K),{bb,bm,cy,qd,ic,ob,rail}=H,V=LIV[lv],HM=V.m;
  // ---- hull plating: strakes by height, panels along the length
  const rowsY=[-1.45,-1.1,-0.7,-0.3,0.05,0.25,0.6,0.95,1.08],NS=26,NR=rowsY.length+1;
  const rowAt=(j,s)=>{if(j<rowsY.length){const y=rowsY[j];return[zBow(y)+(zStern(y)-zBow(y))*s,y];}const z0=L0+(L1-L0)*s;let y=sheer(z0);const z=zBow(y)+(zStern(y)-zBow(y))*s;y=sheer(z);return[z,y];};
  const colOf=y=>y<0.05?AF:y<0.25?BLACK:y<0.95?V.low:y<1.08?BLACK:V.up;
  for(let j=0;j<NR-1;j++)for(let i=0;i<NS;i++){const [za,ya]=rowAt(j,i/NS),[zb,yb]=rowAt(j,(i+1)/NS),[zc,yc]=rowAt(j+1,(i+1)/NS),[zd,yd]=rowAt(j+1,i/NS),col=colOf(ya+0.01),m=col===V.low||col===V.up?HM:11;
    for(const e of [-1,1]){const Pt=(z,y)=>[e*hb(z,y),y,z];qd(Pt(za,ya),Pt(zb,yb),Pt(zc,yc),Pt(zd,yd),col,m);}}
  // the transom, the keel bar, the skeg, the rudder, the propeller
  for(let j=3;j<NR-1;j++){const [za,ya]=rowAt(j,1),[zd,yd]=rowAt(j+1,1);qd([-hb(za,ya),ya,za],[hb(za,ya),ya,za],[hb(zd,yd),yd,zd],[-hb(zd,yd),yd,zd],colOf(ya+0.01),HM);}
  bm([0,-1.52,zBow(-1.45)],[0,-1.52,4.4],[1,0,0],0.16,0.14,AF,11);for(let k=0;k<6;k++){const y0=-1.45+k*(sheer(L0)+1.45)/6,y1=y0+(sheer(L0)+1.45)/6;bm([0,y0,zBow(y0)-0.04],[0,y1,zBow(y1)-0.04],[1,0,0],0.14,0.12,y1<0.1?AF:y1<1.08?V.low:V.up,11);}
  bb(-0.08,0.08,-1.55,-0.4,4.4,5.6,AF,11);bb(-0.05,0.05,-1.4,0.1,5.9,6.7,RUST,11);cy([0,-0.95,5.6],[0,-0.95,5.75],0.12,0.12,8,[0.6,0.45,0.2],11,1);for(let k=0;k<4;k++){const a=k*Math.PI/2;bm([0,-0.95,5.68],[Math.cos(a)*0.55,-0.95+Math.sin(a)*0.55,5.68],[0,0,1],0.22,0.03,[0.6,0.45,0.2],11);}
  // rub rails (black), the white sheer stripe on livery B
  const strake=(dy,col,w)=>{for(let i=0;i<NS;i++){const z0=L0+0.6+(L1-0.2-L0-0.6)*i/NS,z1=L0+0.6+(L1-0.2-L0-0.6)*(i+1)/NS,y0=sheer(z0)+dy,y1=sheer(z1)+dy;for(const e of [-1,1])bm([e*(hb(z0,y0)+0.04),y0,z0],[e*(hb(z1,y1)+0.04),y1,z1],[0,1,0],w,0.1,col,0);}};
  strake(-0.04,BLACK,0.12);if(V.stripe)strake(-0.3,V.stripe,0.14);
  for(let i=0;i<NS;i++){const z0=-4.6+11*i/NS,z1=-4.6+11*(i+1)/NS;for(const e of [-1,1])bm([e*(hb(z0,1.0)+0.05),1.0,z0],[e*(hb(z1,1.0)+0.05),1.0,z1],[0,1,0],0.12,0.1,RUB,0);}
  // ---- the deck (planks), the bulwarks' inner faces with stanchions and freeing ports, the capping rail
  for(let i=0;i<NS;i++){const z0=L0+0.35+(L1-L0-0.35)*i/NS,z1=L0+0.35+(L1-L0-0.35)*(i+1)/NS,y0=deckY(z0),y1=deckY(z1),w0=hb(z0,y0)-0.08,w1=hb(z1,y1)-0.08;
    qd([-w0,y0,z0],[-w1,y1,z1],[w1,y1,z1],[w0,y0,z0],DECK,12);
    for(const e of [-1,1]){const a0=hb(z0,sheer(z0))-0.06,a1=hb(z1,sheer(z1))-0.06;qd([e*w0,y0,z0],[e*w1,y1,z1],[e*a1,sheer(z1),z1],[e*a0,sheer(z0),z0],V.inner,HM);
      bm([e*a0,sheer(z0)+0.03,z0],[e*a1,sheer(z1)+0.03,z1],[0,1,0],0.12,0.16,GREY,11);if(i%3===1){bm([e*(a0-0.03),y0,z0],[e*(a0-0.03),sheer(z0)-0.03,z0],[0,0,1],0.08,0.06,V.inner,HM);}
      if(i%4===2&&z0>0)bb(e*(a0+0.02)-0.06,e*(a0+0.02)+0.06,y0+0.02,y0+0.2,z0,z0+0.4,BLACK,0);}}
  {const z=L1-0.06;qd([-hb(z,deckY(z))+0.08,deckY(z),z],[hb(z,deckY(z))-0.08,deckY(z),z],[hb(z,sheer(z))-0.06,sheer(z),z],[-hb(z,sheer(z))+0.06,sheer(z),z],V.inner,HM);bm([-hb(z,sheer(z)),sheer(z)+0.03,z],[hb(z,sheer(z)),sheer(z)+0.03,z],[0,1,0],0.12,0.16,GREY,11);}
  // the bow: a pulpit rail on the foredeck, a windlass, an anchor on each bow, fairleads
  {const yb=sheer(-5.6);for(const e of [-1,1]){const pts=[[0,yb,L0+0.4],[e*hb(-5.2,yb)*0.8,yb,-5.2],[e*(hb(-4.2,yb)-0.1),sheer(-4.2),-4.2],[e*(hb(-3.6,sheer(-3.6))-0.1),sheer(-3.6),-3.6]];for(let k=0;k<pts.length-1;k++)rail(pts[k],pts[k+1],0.85,STEEL,{noToe:true});}
    const yw=deckY(-4.6);cy([-0.5,yw+0.35,-4.6],[0.5,yw+0.35,-4.6],0.18,0.18,10,[0.25,0.32,0.28],11,1);for(const e of [-0.6,0.6])cy([e,yw+0.35,-4.6],[e*1.12,yw+0.35,-4.6],0.26,0.26,10,GREY,11,1);bb(-0.75,0.75,yw,yw+0.2,-4.9,-4.3,[0.25,0.32,0.28],11);
    for(const e of [-1,1]){const z=-5.6,y=sheer(z)-0.45,x=e*(hb(z,y)+0.08);ob([x,y-0.4,z],[0,0,0.05],[0,0.42,0],[0.04,0,0],BLACK,11);ob([x,y-0.85,z],[0,0,0.32],[0,0.06,0.1],[0.04,0,0],BLACK,11);cy([e*(hb(z,y)-0.05),y+0.12,z],[x,y+0.08,z],0.1,0.13,8,BLACK,11);}}
  // ---- the wheelhouse: plated walls (livery band below), windows, a side door, a visor, the roof with its gear
  {const yd=deckY(-2),y1=yd+WH.h,x=WH.x;bb(-x,x,yd,y1,WH.z0,WH.z1,WHITE,HM);bb(-x-0.01,x+0.01,yd,yd+0.45,WH.z0-0.01,WH.z1+0.01,V.low,HM);
    bb(-x-0.15,x+0.15,y1,y1+0.1,WH.z0-0.45,WH.z1+0.2,WHITE,HM);bb(-x-0.12,x+0.12,y1-0.05,y1+0.02,WH.z0-0.45,WH.z0,WHITE,HM);/* the roof with a visor over the front windows */
    whWindows(H,false);
    {const e=1,z=-1.15;bb(e*x+0.01,e*x+0.04,yd+0.12,yd+2.0,z-0.38,z+0.38,[0.78,0.77,0.73],HM);cy([e*x+0.05,yd+1.65,z],[e*x+0.07,yd+1.65,z],0.14,0.14,10,GLASS,0);cy([e*x+0.045,yd+1.65,z],[e*x+0.055,yd+1.65,z],0.18,0.18,10,STEEL,11);
      bb(e*x+0.04,e*x+0.08,yd+1.0,yd+1.06,z+0.25,z+0.32,STEEL,11);}
    rail([-x-0.1,y1+0.1,WH.z0-0.35],[x+0.1,y1+0.1,WH.z0-0.35],0.6,STEEL,{noToe:true});for(const e of [-1,1])rail([e*(x+0.1),y1+0.1,WH.z0-0.35],[e*(x+0.1),y1+0.1,WH.z1+0.1],0.6,STEEL,{noToe:true});
    // radar, searchlight, antennas, horn, a life raft canister, the nav light boards, the exhaust stack
    bb(-0.12,0.12,y1+0.1,y1+0.55,-2.3,-2.06,GREY,11);ob([0,y1+0.62,-2.18],[0.95,0,0],[0,0.06,0],[0,0,0.08],[0.9,0.9,0.88],0);
    cy([0.7,y1+0.1,WH.z0-0.2],[0.7,y1+0.42,WH.z0-0.2],0.05,0.05,6,GREY,11);cy([0.7,y1+0.52,WH.z0-0.1],[0.7,y1+0.52,WH.z0-0.42],0.14,0.11,10,GREY,11,1);
    for(const [ax,h] of [[-0.9,2.4],[-0.6,1.8],[0.95,2.0]])cy([ax,y1+0.1,-1.0],[ax,y1+0.1+h,-1.0],0.022,0.012,5,WHITE,0);
    cy([-0.4,y1+0.3,WH.z0-0.1],[-0.4,y1+0.3,WH.z0-0.45],0.06,0.12,8,STEEL,11);cy([0.15,y1+0.32,-1.3],[0.15,y1+0.32,-0.75],0.22,0.22,10,WHITE,0,1);bb(-0.2,0.5,y1+0.1,y1+0.12,-1.4,-0.65,BLACK,0);
    for(const e of [-1,1]){bb(e*(x+0.12)-0.03,e*(x+0.12)+0.03,y1+0.12,y1+0.5,WH.z0-0.1,WH.z0+0.4,BLACK,0);bb(e*(x+0.05)-0.06,e*(x+0.05)+0.06,y1+0.32,y1+0.46,WH.z0+0.05,WH.z0+0.2,[0.15,0.15,0.15],11);}
    cy([-0.95,yd+1.0,WH.z1+0.18],[-0.95,y1+1.4,WH.z1+0.18],0.11,0.11,10,WHITE,HM);cy([-0.95,y1+1.15,WH.z1+0.18],[-0.95,y1+1.42,WH.z1+0.18],0.12,0.12,10,BLACK,11,1);
    // life rings on the wheelhouse sides
    for(const e of [-1,1]){const cx=e*(x+0.06),cyy=yd+1.0,cz=-2.9;for(let k=0;k<12;k++){const a0=k/12*6.283,a1=(k+1)/12*6.283;bm([cx,cyy+Math.sin(a0)*0.3,cz+Math.cos(a0)*0.3],[cx,cyy+Math.sin(a1)*0.3,cz+Math.cos(a1)*0.3],[1,0,0],0.1,0.1,k%3===0?WHITE:ORANGE,0);}}}
  // ---- the lattice ladder mast behind the wheelhouse, its crosstrees and top pole; the outrigger booms raised in a V with their stays
  {const yd=deckY(0),zm=0.1,top=yd+8.6,lg=(e,y)=>[e*(0.45-0.33*(y-yd)/8.6),y,zm+0.3*(y-yd)/8.6];
    for(const e of [-1,1]){bm(lg(e,yd),lg(e,top),[0,0,1],0.1,0.1,STEEL,11);bb(lg(e,yd)[0]-0.12,lg(e,yd)[0]+0.12,yd,yd+0.06,zm-0.12,zm+0.12,STEEL,11);}
    for(let y=yd+0.45;y<top-0.2;y+=0.42){const a=lg(-1,y),b=lg(1,y);cy(a,b,0.025,0.025,5,STEEL,11);}
    for(let y=yd+0.4;y<top-1;y+=1.7){bm(lg(-1,y),lg(1,y+1.7),[0,0,1],0.05,0.05,STEEL,11);}
    bm([0,yd,zm+1.4],lg(0,yd+5.5),[1,0,0],0.08,0.08,STEEL,11);/* a back leg */
    const ct=yd+6.6;bm([-1.0,ct,zm+0.23],[1.0,ct,zm+0.23],[0,1,0],0.08,0.08,STEEL,11);for(const e of [-1,1])bb(e*0.85-0.07,e*0.85+0.07,ct-0.25,ct-0.08,zm+0.12,zm+0.34,[0.15,0.15,0.15],11);
    bb(-0.08,0.08,yd+7.1,yd+7.32,zm-0.02,zm+0.16,[0.15,0.15,0.15],11);cy([0,top,zm+0.3],[0,top+1.5,zm+0.3],0.05,0.03,6,STEEL,11);cy([0,top+1.5,zm+0.3],[0,top+2.4,zm+0.3],0.015,0.01,4,WHITE,0);
    for(const e of [-1,1]){const pv=[e*0.65,yd+1.1,zm+0.35],tip=[e*3.9,yd+8.2,zm+1.3];cy(pv,tip,0.08,0.05,8,V.m===0?WHITE:[0.8,0.79,0.75],11);cy(tip,lg(e,top-0.2),0.012,0.012,4,BLACK,11);cy(tip,[e*(hb(-1.5,sheer(-1.5))-0.1),sheer(-1.5),-1.5],0.012,0.012,4,BLACK,11);
      ic([tip[0],tip[1]-0.08,tip[2]],0.1,STEEL,11);/* the pulley; the wire and its stabiliser weight swing (fishHangW) */
      cy([pv[0],pv[1]-0.25,pv[2]],[pv[0],pv[1]+0.15,pv[2]],0.11,0.11,8,GREY,11);}}
  // ---- the working deck aft: winch, net drum with green net, fish hold hatch, the stern gantry with blocks, trawl doors on the quarters
  {const yw=deckY(1.3);bb(-0.7,0.7,yw,yw+0.55,0.95,1.6,[0.25,0.32,0.28],11);for(const e of [-1,1])cy([e*0.35,yw+0.78,1.3],[e*0.95,yw+0.78,1.3],0.24,0.24,10,RUST,11,1);for(const e of [-1,1])cy([e*0.95,yw+0.78,1.3],[e*1.05,yw+0.78,1.3],0.34,0.34,10,GREY,11,1);
    const yn=deckY(3.0),cyN=yn+1.05;cy([-1.1,cyN,3.0],[1.1,cyN,3.0],0.72,0.72,16,NETG,6,1);for(const e of [-1.18,1.12])cy([e,cyN,3.0],[e+0.06,cyN,3.0],0.98,0.98,16,RUST,11,1);cy([-1.4,cyN,3.0],[1.4,cyN,3.0],0.1,0.1,8,STEEL,11);
    for(let k=0;k<10;k++){const a=k/10*6.283;bm([-1.1,cyN+Math.sin(a)*0.74,3.0+Math.cos(a)*0.74],[1.1,cyN+Math.sin(a)*0.74,3.0+Math.cos(a)*0.74],[0,Math.sin(a),Math.cos(a)],0.04,0.03,[0.1,0.24,0.17],6);}
    for(const e of [-1,1]){bm([e*1.35,yn,2.5],[e*1.35,cyN,3.0],[1,0,0],0.12,0.12,[0.25,0.32,0.28],11);bm([e*1.35,yn,3.5],[e*1.35,cyN,3.0],[1,0,0],0.12,0.12,[0.25,0.32,0.28],11);}
    {const hy=deckY(4.6);bb(-0.75,0.75,hy,hy+0.32,4.15,5.05,[0.25,0.32,0.28],11);bb(-0.65,0.65,hy+0.32,hy+0.36,4.25,4.95,GREY,11);}
    const ys=deckY(6.0),ty=ys+3.6;for(const e of [-1,1]){bm([e*1.75,ys,6.05],[e*1.55,ty,6.15],[0,0,1],0.16,0.16,STEEL,11);bm([e*1.75,ys,4.9],[e*1.6,ty-0.6,6.1],[0,0,1],0.1,0.1,STEEL,11);}
    bm([-1.7,ty,6.15],[1.7,ty,6.15],[0,1,0],0.18,0.18,STEEL,11);for(const e of [-0.7,0.7])bb(e-0.05,e+0.05,ty-0.16,ty-0.08,6.1,6.2,STEEL,11);/* shackles; the blocks swing (fishHangB) */
    // trawl doors hung on the quarters, rust-brown steel plates with a shoe and brackets
    for(const e of [-1,1]){const z=5.0,y=sheer(z)-0.75,x=e*(hb(z,y)+0.12);ob([x,y,z],[0,0,0.75],[0,0.48,0],[0.05,0,0],RUST,25);bb(x-0.06,x+0.06,y-0.52,y-0.44,z-0.75,z+0.75,STEEL,11);for(const dz of [-0.3,0.3])bm([x,y+0.4,z+dz],[e*(hb(z,sheer(z))-0.05),sheer(z)+0.05,z+dz],[0,0,1],0.04,0.04,BLACK,11);}
    // fish boxes, buoys, oil drums, a coil of rope, bollards
    for(const [x,z,y] of [[-1.3,2.0,0],[-1.3,2.0,0.32],[-0.75,2.0,0],[1.3,4.4,0]]){const b=deckY(z)+y;bb(x-0.3,x+0.3,b,b+0.3,z-0.22,z+0.22,BLUEBOX,0);bb(x-0.27,x+0.27,b+0.28,b+0.3,z-0.19,z+0.19,[0.7,0.74,0.78],0);}
    for(const [x,z] of [[1.25,1.9],[1.4,2.3],[-1.45,5.6]])ic([x,deckY(z)+0.3,z],0.3,ORANGE,0);
    for(const [x,z] of [[1.45,5.6],[1.05,5.75]]){const b=deckY(z);cy([x,b,z],[x,b+0.85,z],0.29,0.29,12,[0.2,0.45,0.25],11,1);}
    {const b=deckY(4.6);for(let k=0;k<4;k++)cy([-1.25,b+0.03+k*0.07,4.6],[-1.25,b+0.09+k*0.07,4.6],0.45-k*0.03,0.45-k*0.03,12,[0.72,0.62,0.4],6);}
    for(const [x,z] of [[-1.5,6.1],[1.5,0.6],[-1.5,0.6]]){const b=deckY(z);for(const dz of [-0.15,0.15])cy([x,b,z+dz],[x,b+0.4,z+dz],0.09,0.09,8,BLACK,11,1);}}
  // the tyres hung on the topsides as fenders swing on their ropes (fishTyre, js/fishing.js HANG)
  return{};}
KIT.models.fishBoatA=function(K){return boat(K,'A');};
/* the hanging gear (4.54.1): each model hangs from its origin straight down (-y) and is swung as a pendulum by js/fishing.js (Fish.hang),
   its kit instance pitched and rolled to the rope's direction */
KIT.models.fishHangW=function(K){K.seed(911);const {cy,bb,ic}=kitW(K);cy([0,0,0],[0,-0.55,0],0.012,0.012,4,BLACK,11);ic([0,-0.62,0],0.09,STEEL,11);cy([0,-0.7,0],[0,-2.15,0],0.01,0.01,4,BLACK,11);
  bb(-0.18,0.18,-2.5,-2.15,-0.25,0.25,RUST,25);bb(-0.02,0.02,-2.2,-2.12,-0.2,0.2,STEEL,11);return{};};
KIT.models.fishHangB=function(K){K.seed(912);const {cy,ic,bb}=kitW(K);cy([0,0,0],[0,-0.62,0],0.015,0.015,4,BLACK,11);ic([0,-0.76,0],0.16,STEEL,11);bb(-0.03,0.03,-0.95,-0.88,-0.05,0.05,STEEL,11);cy([0,-0.95,0],[0,-1.1,0.06],0.02,0.02,4,STEEL,11);return{};};
KIT.models.fishTyre=function(K){K.seed(913);const {cy}=kitW(K);cy([0,0,0],[0,-0.42,0],0.015,0.015,4,[0.6,0.55,0.4],6);cy([-0.11,-0.78,0],[0.11,-0.78,0],0.36,0.36,14,RUB,0,1);cy([0.112,-0.78,0],[0.115,-0.78,0],0.17,0.17,10,[0.02,0.02,0.02],0,1);cy([-0.115,-0.78,0],[-0.112,-0.78,0],0.17,0.17,10,[0.02,0.02,0.02],0,1);return{};};
/* where the gear hangs on the boat (model frame) */
KIT.FISH_HANG=(()=>{const L=[],yd=deckY(0),zm=0.1,ys=deckY(6.0),ty=ys+3.6;for(const e of [-1,1])L.push({t:'fishHangW',p:[e*3.9,yd+8.2-0.08,zm+1.3],len:2.3,damp:0.25});
  for(const e of [-0.7,0.7])L.push({t:'fishHangB',p:[e,ty-0.16,6.15],len:0.8,damp:0.35});
  for(const e of [-1,1])for(const z of [-3.2,-0.6,2.0,4.4]){const y=sheer(z);L.push({t:'fishTyre',p:[e*(hb(z,y)+0.02),y+0.02,z],len:0.78,damp:1.6,side:e});}return L;})();
KIT.models.fishBoatB=function(K){return boat(K,'B');};
KIT.models.fishBoatC=function(K){return boat(K,'C');};
// the lights: navigation lights (red to port, green to starboard), the masthead and stern lights, deck floodlights, the lit wheelhouse
KIT.models.fishBoatL=function(K){K.seed(904);const H=kitW(K),{bb,ob}=H,G=3,yd=deckY(-2),y1=yd+WH.h,ym=deckY(0);
  whWindows(H,true);
  for(const [e,col] of [[-1,[1,0.08,0.05]],[1,[0.1,1,0.35]]])bb(e*(WH.x+0.12)-0.025,e*(WH.x+0.12)+0.025,y1+0.33,y1+0.45,WH.z0+0.06,WH.z0+0.19,col,G);/* inside the boards */
  bb(-0.06,0.06,ym+7.13,ym+7.3,0.0,0.03,[1,0.97,0.85],G);bb(-0.07,0.07,sheer(6.4)+0.06,sheer(6.4)+0.2,6.38,6.46,[1,0.97,0.85],G);
  for(const e of [-1,1])ob([e*0.85,ym+6.6-0.26,0.33],[0.06,0,0],[0,0.02,0],[0,0,0.1],[1,0.92,0.7],G);
  bb(-0.3,0.3,deckY(6)+3.42,deckY(6)+3.46,6.0,6.3,[1,0.92,0.7],G);return{};};
})();
