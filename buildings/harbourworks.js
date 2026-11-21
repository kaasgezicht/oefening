'use strict';
// ===== buildings/harbourworks.js — the coal harbour's machinery and the collier in the village houses' kit (4.52.0, the user: "make it
// detailed: rivets, lattice detail and painted machinery houses"). Riveted iron is its own material (K.M.rivet, 25: snap-head rivets
// along every plate edge and seam, drawn by the shader as relief), machinery houses are corrugated iron (K.M.corr, 26) on timber sills
// with painted window frames, slate-grey corrugated roofs, ventilators and stove pipes.
// Every model is written in the harbour's local frame (x along the quay, y inland, z up from the deck; see js/harbor.js) relative to
// its origin O; works(K, O) turns those coordinates into the kit's (x → −x, y → z, z → y: the harbour's kit rotation).
//  portGantry: the travelling portal gantry over the freight siding (4.55: on wheeled bogies on two rails; laced lattice legs, plate girders with stiffeners and
//              crab rails, lattice end girders, knee braces with gusset plates, tie rods, a walkway with handrails, a caged ladder) and
//              the riveted receiving hopper under it on its trestle, with the grate, the feeder and the tail of the belt.
//  portBelt:   the belt conveyor: lattice side trusses up the incline and along the quay, troughed idlers, the belt, a walkway, braced
//              trestle bents, the steam engine house at the tail, the elevated head house, and the shiploader's rails with buffers.
//  portCrab:   the gantry's crab (moves): end carriages with flanged wheels, cross girders, the winding house on top, the driver's cab
//              hanging below, rope sheaves.
//  portLoader: the travelling shiploader (moves): bogies, laced portal legs, plate portal girders, a chequer-plate deck with rails,
//              the machinery house, the A-frame with its stays, the lattice boom with its belt, the tripper, the counterweight, the
//              transfer hopper and the telescopic chute.
//  portWagon:  a Victorian coal wagon (moves), its coal drawn by PortCoal so it can go down as the grab empties it.
//  portShip:   the collier (moves with the swell; later it sails): a riveted hull with sheer, raked stem and counter stern, red bottom,
//              forecastle and poop, bulwarks with a teak capping rail, open hatches with coamings and coal in the holds, two masts with
//              shrouds and ratlines, stays and topped derricks, the bridge deckhouse with portholes, the wheelhouse and its wings, a raked
//              buff funnel with a black top, cowl ventilators, lifeboats on davits, a windlass, anchors, a rudder, the ensign.
(function(){
const GREEN=[0.2,0.3,0.23],GREEN2=[0.15,0.23,0.18],OXIDE=[0.47,0.17,0.12],CREAM=[0.86,0.8,0.64],ROOFG=[0.42,0.44,0.45],IRON=[0.2,0.2,0.21],GREY=[0.46,0.46,0.45],
  STONE=[0.6,0.58,0.54],TIMBER=[0.36,0.24,0.14],RUBBER=[0.09,0.09,0.09],COAL=[0.07,0.07,0.08],BLACK=[0.085,0.085,0.09],RED=[0.48,0.13,0.09],WHITE=[0.9,0.88,0.82],
  BUFF=[0.8,0.63,0.36],TEAK=[0.46,0.3,0.17],DECK=[0.55,0.46,0.33],MAST=[0.74,0.6,0.38],BRASS=[0.72,0.55,0.25],DARK=[0.04,0.04,0.04],ROPE=[0.3,0.26,0.2];
const RV=25,CO=26,ME=11,PA=0,WO=6,GL=2,DK=12,ST=8,GW=3;
// ---- the ironwork toolkit: everything in harbour-local coordinates relative to O
function works(K,O){const {add,sub,mul,norm,cross,len}=K.v,p=(x,y,z)=>[O[0]-x,z-O[2],y-O[1]],d=(x,y,z)=>[-x,z,y];
  const W={K,p,d};
  W.bx=(x0,x1,y0,y1,z0,z1,col,m)=>K.box(p((x0+x1)/2,(y0+y1)/2,(z0+z1)/2),[(x1-x0)/2,0,0],[0,(z1-z0)/2,0],[0,0,(y1-y0)/2],col,m==null?RV:m);
  W.ob=(c,X,Y,Z,col,m)=>K.box(p(...c),d(...X),d(...Y),d(...Z),col,m==null?RV:m);/* oriented box: centre and half axes */
  W.bm=(a,b,side,w,t,col,m)=>K.beam(p(...a),p(...b),d(...side),w,t,col,m==null?RV:m);
  W.cy=(a,b,r0,r1,n,col,m,cap)=>K.cyl(p(...a),p(...b),r0,r1,n,col,m==null?ME:m,cap?col:undefined,cap?(m==null?ME:m):undefined);
  W.qd=(a,b,c,e,col,m)=>K.quad(p(...a),p(...b),p(...c),p(...e),null,col,m==null?RV:m);
  W.ic=(c,r,col,m,o)=>K.ico(p(...c),r,col,m==null?ME:m,o);
  // a flat bar between two points, its broad face toward nrm
  W.flat=(a,b,nrm,wd,col)=>W.bm(a,b,nrm,0.022,wd||0.09,col);
  // a lattice girder in the vertical plane through a → b (the bottom chord; the top chord H above): channel chords, verticals at the
  // panel points, a double (X) lattice of flat bars in every panel, gusset plates at the nodes
  W.lattice=(a,b,H,col,o)=>{o=o||{};const L=len(sub(b,a)),al=norm(sub(b,a)),side=norm(cross(al,[0,0,1])),n=Math.max(1,Math.round(L/(o.panel||H))),up=[0,0,H];
    const at=k=>add(a,mul(sub(b,a),k/n)),cw=o.chord||0.22;
    W.bm(a,b,[0,0,1],cw,0.12,col);W.bm(add(a,up),add(b,up),[0,0,1],cw,0.12,col);
    for(let k=0;k<=n;k++){const q=at(k);W.bm(q,add(q,up),al,0.13,0.05,col);if(!o.noGusset)for(const e of [-1,1])W.ob(add(add(q,mul(up,e<0?0.12/H:1-0.12/H)),mul(side,0.07)),mul(al,k===0||k===n?0.16:0.26),[0,0,0.22],mul(side,0.008),col);}
    for(let k=0;k<n;k++){const q0=at(k),q1=at(k+1);W.flat(add(q0,[0,0,0.08]),add(q1,[0,0,H-0.08]),side,0.08,col);W.flat(add(q1,[0,0,0.08]),add(q0,[0,0,H-0.08]),side,0.08,col);}
    return{side,al};};
  // a plate girder along a → b (horizontal, a and b on its top): web, flanges, flange angles, stiffeners every 1.2 m, end plates
  W.pgirder=(a,b,H,bf,col)=>{const L=len(sub(b,a)),al=norm(sub(b,a)),side=norm(cross(al,[0,0,1])),c=mul(add(a,b),0.5);
    W.ob(add(c,[0,0,-H/2]),mul(al,L/2),[0,0,H/2-0.03],mul(side,0.011),col);
    for(const z of [-0.015,-H+0.015])W.ob(add(c,[0,0,z]),mul(al,L/2),[0,0,0.015],mul(side,bf/2),col);
    for(const z of [-0.07,-H+0.07])for(const e of [-1,1])W.ob(add(add(c,[0,0,z]),mul(side,e*0.05)),mul(al,L/2),[0,0,0.04],mul(side,0.04),col);
    for(let s=0;s<=L+0.01;s+=Math.min(1.2,L)){const q=add(a,mul(al,s));for(const e of [-1,1])W.ob(add(add(q,[0,0,-H/2]),mul(side,e*0.06)),mul(al,0.012),[0,0,H/2-0.04],mul(side,0.05),col);}};
  // a laced lattice column (a tower) at (x, y): four corner angles, zigzag lacing on each face, batten plates, cap and base plates
  W.tower=(x,y,z0,z1,w,col,o)=>{o=o||{};const h=w/2;for(const sx of [-1,1])for(const sy of [-1,1]){W.bx(x+sx*h-(sx>0?0.1:0),x+sx*h+(sx<0?0.1:0),y+sy*h-0.011,y+sy*h+0.011,z0,z1,col);W.bx(x+sx*h-0.011,x+sx*h+0.011,y+sy*h-(sy>0?0.1:0),y+sy*h+(sy<0?0.1:0),z0,z1,col);}
    const pt=o.pitch||w*1.1;
    for(const sx of [-1,1]){let k=0;for(let z=z0+0.3;z+pt<=z1-0.25;z+=pt,k++){const a=[x+sx*h,y+(k%2?h:-h)*0.9,z],b=[x+sx*h,y+(k%2?-h:h)*0.9,z+pt];W.flat(a,b,[1,0,0],0.07,col);}}
    for(const sy of [-1,1]){let k=0;for(let z=z0+0.3+pt/2;z+pt<=z1-0.25;z+=pt,k++){const a=[x+(k%2?h:-h)*0.9,y+sy*h,z],b=[x+(k%2?-h:h)*0.9,y+sy*h,z+pt];W.flat(a,b,[0,1,0],0.07,col);}}
    for(const z of [z0+0.15,z1-0.15]){for(const sx of [-1,1])W.bx(x+sx*h-0.012,x+sx*h+0.012,y-h,y+h,z-0.14,z+0.14,col);for(const sy of [-1,1])W.bx(x-h,x+h,y+sy*h-0.012,y+sy*h+0.012,z-0.14,z+0.14,col);}
    W.bx(x-h-0.06,x+h+0.06,y-h-0.06,y+h+0.06,z1-0.03,z1,col);if(!o.noBase){W.bx(x-h-0.15,x+h+0.15,y-h-0.15,y+h+0.15,z0,z0+0.04,col);for(const sx of [-1,1])for(const sy of [-1,1])W.cy([x+sx*(h+0.08),y+sy*(h+0.08),z0+0.04],[x+sx*(h+0.08),y+sy*(h+0.08),z0+0.1],0.03,0.03,6,IRON,ME,1);}};
  // handrail a → b at height h: posts every ~1.2 m, a top rail, a knee rail and a toe plate
  W.rail=(a,b,h,col,o)=>{o=o||{};const L=len(sub(b,a)),n=Math.max(1,Math.round(L/1.2)),al=norm(sub(b,a)),side=norm(cross(al,[0,0,1]));for(let k=0;k<=n;k++){const q=add(a,mul(sub(b,a),k/n));W.cy(q,add(q,[0,0,h]),0.022,0.022,6,col,ME);}
    W.cy(add(a,[0,0,h]),add(b,[0,0,h]),0.024,0.024,6,col,ME);W.cy(add(a,[0,0,h*0.5]),add(b,[0,0,h*0.5]),0.018,0.018,5,col,ME);if(!o.noToe)W.ob(add(mul(add(a,b),0.5),[0,0,0.07]),mul(al,L/2),[0,0,0.07],mul(side,0.006),col);};
  // an iron ladder from (x, y, z0) to z1, its rungs across 'across', the stiles standing off the face by 'off'; safety hoops above 2.5 m
  W.ladder=(x,y,z0,z1,across,out,col,hoops)=>{const a=across,o=out;for(const e of [-0.22,0.22])W.bm([x+a[0]*e,y+a[1]*e,z0],[x+a[0]*e,y+a[1]*e,z1+0.9],o,0.06,0.016,col);
    for(let z=z0+0.3;z<z1+0.2;z+=0.3)W.cy([x-a[0]*0.22,y-a[1]*0.22,z],[x+a[0]*0.22,y+a[1]*0.22,z],0.012,0.012,4,col,ME);
    if(hoops)for(let z=z0+2.5;z<z1+0.5;z+=0.9){let pr=null;for(let k=0;k<=8;k++){const t=Math.PI*k/8,q=[x+a[0]*Math.cos(t)*0.36+o[0]*Math.sin(t)*0.55,y+a[1]*Math.cos(t)*0.36+o[1]*Math.sin(t)*0.55,z];if(pr)W.bm(pr,q,[0,0,1],0.05,0.012,col);pr=q;}}};
  // a window on a wall: glass (lit at night) behind a painted frame with glazing bars and a sill; f = outward normal of the wall
  W.window=(c,f,w,h,o)=>{o=o||{};const t=norm(cross([0,0,1],f)),fr=o.frame||CREAM,off=o.off||0.03,cc=add(c,mul(f,off));W.ob(cc,mul(t,w/2),[0,0,h/2],mul(f,0.005),[0.5,0.6,0.66],GL);
    for(const e of [-1,1]){W.ob(add(cc,mul(t,e*(w/2+0.03))),mul(t,0.035),[0,0,h/2+0.06],mul(f,0.03),fr,PA);W.ob(add(cc,[0,0,e*(h/2+0.03)]),mul(t,w/2+0.06),[0,0,0.035],mul(f,0.03),fr,PA);}
    const nx=o.nx||3,ny=o.ny||2;for(let k=1;k<nx;k++)W.ob(add(cc,mul(t,-w/2+w*k/nx)),mul(t,0.012),[0,0,h/2],mul(f,0.018),fr,PA);for(let k=1;k<ny;k++)W.ob(add(cc,[0,0,-h/2+h*k/ny]),mul(t,w/2),[0,0,0.012],mul(f,0.018),fr,PA);
    W.ob(add(add(cc,[0,0,-h/2-0.09]),mul(f,0.04)),mul(t,w/2+0.12),[0,0,0.03],mul(f,0.07),fr,PA);};
  W.door=(c,f,w,h,col)=>{const t=norm(cross([0,0,1],f)),cc=add(c,mul(f,0.03));W.ob(add(cc,[0,0,h/2]),mul(t,w/2),[0,0,h/2],mul(f,0.02),col||OXIDE,WO);
    for(let k=1;k<Math.round(w/0.15);k++)W.ob(add(add(cc,mul(t,-w/2+k*w/Math.round(w/0.15))),[0,0,h/2]),mul(t,0.006),[0,0,h/2-0.04],mul(f,0.026),[0.18,0.08,0.06],WO);
    for(const z of [0.35,h/2,h-0.35])W.ob(add(add(cc,[0,0,z]),mul(f,0.01)),mul(t,w/2-0.04),[0,0,0.06],mul(f,0.026),col||OXIDE,WO);
    for(const e of [-1,1])W.ob(add(cc,add(mul(t,e*(w/2+0.04)),[0,0,h/2])),mul(t,0.04),[0,0,h/2+0.04],mul(f,0.035),CREAM,PA);W.ob(add(cc,[0,0,h+0.04]),mul(t,w/2+0.08),[0,0,0.04],mul(f,0.035),CREAM,PA);
    W.ic(add(add(cc,mul(t,w/2-0.15)),add([0,0,h*0.5],mul(f,0.04))),0.035,BRASS,ME);};
  // a machinery house: corrugated iron walls on a timber sill, painted corner flashings, windows and a door, a pitched corrugated
  // roof (ridge along the longer side) with bargeboards and a ridge roll, a louvred ventilator and a stove pipe
  W.house=(x0,x1,y0,y1,z0,h,o)=>{o=o||{};const wall=o.wall||OXIDE,roof=o.roof||ROOFG,zt=z0+h,rx=(x1-x0)>=(y1-y0),T=0.04;
    W.bx(x0-0.06,x1+0.06,y0-0.06,y1+0.06,z0,z0+0.18,TIMBER,WO);
    W.bx(x0,x1,y0,y0+T,z0+0.18,zt,wall,CO);W.bx(x0,x1,y1-T,y1,z0+0.18,zt,wall,CO);W.bx(x0,x0+T,y0+T,y1-T,z0+0.18,zt,wall,CO);W.bx(x1-T,x1,y0+T,y1-T,z0+0.18,zt,wall,CO);
    for(const [cx,cy2] of [[x0,y0],[x1,y0],[x0,y1],[x1,y1]])W.bx(cx-0.07,cx+0.07,cy2-0.07,cy2+0.07,z0+0.18,zt,CREAM,PA);
    W.bx(x0-0.05,x1+0.05,y0-0.05,y1+0.05,zt-0.14,zt,CREAM,PA);
    const fw=o.win||[];for(const [face,u,ww,wh,wz] of fw){const f=face==='-y'?[0,-1,0]:face==='+y'?[0,1,0]:face==='-x'?[-1,0,0]:[1,0,0],c=face==='-y'?[u,y0,wz]:face==='+y'?[u,y1,wz]:face==='-x'?[x0,u,wz]:[x1,u,wz];W.window(c,f,ww,wh,{nx:ww>0.9?3:2,ny:2});}
    if(o.door){const [face,u,dw,dh]=o.door,f=face==='-y'?[0,-1,0]:face==='+y'?[0,1,0]:face==='-x'?[-1,0,0]:[1,0,0],c=face==='-y'?[u,y0,z0+0.18]:face==='+y'?[u,y1,z0+0.18]:face==='-x'?[x0,u,z0+0.18]:[x1,u,z0+0.18];W.door(c,f,dw,dh,o.doorCol);}
    // the roof: two corrugated slopes with an overhang, the gable infill, bargeboards, a ridge roll and gutters
    const rise=o.rise||((rx?(y1-y0):(x1-x0))*0.3),ov=0.3;void len;
    const half=(rx?(y1-y0):(x1-x0))/2,hw=half+ov,zE=zt-rise*ov/half,zR=zt+rise,dz=zR-zE,sl=Math.hypot(hw,dz);
    // one slope e of the roof: a slab from the eave (overhanging) to the ridge; A = the ridge axis, C = across it
    const slope=(e,cA,lenA,A,C)=>{W.ob([cA[0]+C[0]*e*hw/2,cA[1]+C[1]*e*hw/2,(zE+zR)/2],[A[0]*lenA,A[1]*lenA,0],[-C[0]*e*hw/2,-C[1]*e*hw/2,dz/2],[C[0]*e*dz/sl*0.025,C[1]*e*dz/sl*0.025,hw/sl*0.025],roof,CO);
      W.bm([cA[0]+C[0]*e*hw-A[0]*lenA,cA[1]+C[1]*e*hw-A[1]*lenA,zE-0.06],[cA[0]+C[0]*e*hw+A[0]*lenA,cA[1]+C[1]*e*hw+A[1]*lenA,zE-0.06],[0,0,1],0.1,0.1,GREY,ME);};
    if(rx){const ym=(y0+y1)/2,c=[(x0+x1)/2,ym],lA=(x1-x0)/2+ov;for(const e of [-1,1])slope(e,c,lA,[1,0],[0,1]);
      for(const x of [x0,x1]){W.qd([x,y0,zt],[x,y1,zt],[x,ym,zR],[x,ym,zR],wall,CO);const xo=x+(x<x1?-ov-0.02:ov+0.02);for(const e of [-1,1])W.bm([xo,ym+e*hw,zE],[xo,ym,zR+0.02],[1,0,0],0.04,0.2,CREAM,PA);}
      W.cy([x0-ov,ym,zR+0.03],[x1+ov,ym,zR+0.03],0.07,0.07,8,roof,ME);}
    else{const xm=(x0+x1)/2,c=[xm,(y0+y1)/2],lA=(y1-y0)/2+ov;for(const e of [-1,1])slope(e,c,lA,[0,1],[1,0]);
      for(const y of [y0,y1]){W.qd([x0,y,zt],[x1,y,zt],[xm,y,zR],[xm,y,zR],wall,CO);const yo=y+(y<y1?-ov-0.02:ov+0.02);for(const e of [-1,1])W.bm([xm+e*hw,yo,zE],[xm,yo,zR+0.02],[0,1,0],0.04,0.2,CREAM,PA);}
      W.cy([xm,y0-ov,zR+0.03],[xm,y1+ov,zR+0.03],0.07,0.07,8,roof,ME);}
    // ventilator on the ridge and a stove pipe with a cowl
    const vx=rx?x0+(x1-x0)*0.3:(x0+x1)/2,vy=rx?(y0+y1)/2:y0+(y1-y0)*0.3,vz=zt+rise;W.bx(vx-0.35,vx+0.35,vy-0.35,vy+0.35,vz-0.1,vz+0.45,wall,CO);for(let z=vz;z<vz+0.4;z+=0.12)for(const e of [-1,1]){W.bx(vx-0.37,vx+0.37,vy+e*0.36-0.02,vy+e*0.36+0.02,z,z+0.06,CREAM,PA);}
    W.bx(vx-0.5,vx+0.5,vy-0.5,vy+0.5,vz+0.45,vz+0.52,roof,CO);
    if(o.pipe!==false){const px=rx?x0+(x1-x0)*0.78:x0+(x1-x0)*0.75,py=rx?y0+(y1-y0)*0.7:y0+(y1-y0)*0.78;W.cy([px,py,zt],[px,py,zt+rise+1.3],0.09,0.09,8,IRON,ME);W.cy([px,py,zt+rise+1.3],[px,py,zt+rise+1.55],0.2,0.04,8,IRON,ME);W.cy([px,py,zt+rise*0.5],[px,py,zt+rise*0.5+0.06],0.14,0.14,8,IRON,ME);}};
  return W;}
KIT.works=works;KIT.WORKS={GREEN,OXIDE,CREAM,ROOFG,IRON,GREY,STONE,TIMBER,COAL,BLACK,RED,WHITE,BUFF};

// ---- the portal gantry and the receiving hopper (origin: harbour x 20, y 20, deck)
KIT.models.portGantry=function(K){K.seed(601);const W=works(K,[20,20,0]);
  /* 4.55: the gantry travels along the siding on two rails (y 11 and 29): a bogie with two flanged wheels under each leg */
  for(const x of [16,24])for(const y of [11,29]){W.tower(x,y,1.0,9.4,0.8,GREEN);W.bx(x-0.95,x+0.95,y-0.32,y+0.32,0.55,1.0,GREEN2,RV);W.bx(x-0.55,x+0.55,y-0.5,y+0.5,0.95,1.05,GREEN,RV);
    for(const dx of [-0.55,0.55]){W.cy([x+dx,y-0.16,0.56],[x+dx,y+0.16,0.56],0.3,0.3,14,IRON,ME,1);W.cy([x+dx,y+0.16,0.56],[x+dx,y+0.2,0.56],0.36,0.36,14,IRON,ME,1);}
    for(const dx of [-1.0,1.0])W.bx(x+dx-0.06,x+dx+0.06,y-0.25,y+0.25,0.4,0.9,RED,PA);}
  for(const x of [16,24]){W.pgirder([x,10.3,10.4],[x,29.7,10.4],1.0,0.46,GREEN);W.bx(x-0.035,x+0.035,10.4,29.6,10.4,10.47,IRON,ME);W.bx(x-0.08,x+0.08,10.4,29.6,10.4,10.42,IRON,ME);/* the crab rail on its sole plate */
    for(const y of [10.45,29.55]){W.bx(x-0.22,x+0.22,y-0.15,y+0.15,10.4,10.85,RED,PA);W.cy([x,y+(y<20?0.15:-0.15),10.65],[x,y+(y<20?0.35:-0.35),10.65],0.11,0.11,8,TIMBER,WO,1);}
    // knee braces from the legs up to the girders, lattice with gussets
    for(const [y,y2] of [[11,14.2],[29,25.8]]){W.flat([x,y+(y2>y?0.4:-0.4),6.3],[x,y2,9.42],[1,0,0],0.16,GREEN);W.flat([x,y+(y2>y?0.4:-0.4),5.9],[x,y2+(y2>y?0.5:-0.5),9.42],[1,0,0],0.12,GREEN);
      for(const e of [-1,1])W.ob([x+e*0.03,y2+(y2>y?-0.25:0.25),9.12],[0,0.42,0],[0,0,0.26],[0.008,0,0],GREEN);}}
  // end frames: lattice girders across under the plate girders, portal knees, crossed tie rods with turnbuckles
  for(const y of [11,29]){W.lattice([15.6,y,8.4],[24.4,y,8.4],1.0,GREEN,{panel:1.1});
    for(const [x,xi] of [[16,18.6],[24,21.4]]){W.flat([x+(xi>x?0.4:-0.4),y,6.2],[xi,y,8.42],[0,1,0],0.15,GREEN);W.ob([xi+(xi>x?-0.25:0.25),y+0.03,8.15],[0.4,0,0],[0,0,0.25],[0,0.008,0],GREEN);}
    for(const [xa,xb] of [[16.4,23.6],[23.6,16.4]]){W.cy([xa,y,1.2],[xb,y,8.2],0.028,0.028,6,IRON,ME);}W.cy([19.6,y,4.5],[20.4,y,4.95],0.06,0.06,8,IRON,ME);}
  // a walkway outside the east girder with brackets, grating and a handrail; the caged ladder up the south-east leg
  W.bx(24.25,25.15,10.6,29.4,9.36,9.42,GREY,RV);for(let y=11;y<=29;y+=1.8)W.flat([24.25,y,9.36],[25.1,y,8.6],[0,1,0],0.12,GREEN);
  W.rail([25.12,10.6,9.42],[25.12,29.4,9.42],1.05,GREEN);for(let y=10.9;y<29.4;y+=0.3)W.bx(24.3,25.1,y,y+0.03,9.42,9.44,IRON,ME);
  W.ladder(24.9,11,0.4,9.4,[0,1,0],[1,0,0],GREEN,true);
  return{};};

// ---- the receiving hopper and the gantry's rails (fixed; origin harbour x 20, y 16, deck)
KIT.models.portHopper=function(K){K.seed(607);const W=works(K,[20,16,0]);
  // the receiving hopper: a riveted tapering bin (17..23 × 13..19, outlet 2 × 2 m at z 1.4, top 4), stiffening ribs, top angle, grate,
  // on four plate legs with bracing; a heap of coal under the grate; the feeder box and chute onto the belt tail
  {const x0=17,x1=23,y0=13,y1=19,z0=1.4,z1=4,a=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]],b=[[19,15],[21,15],[21,17],[19,17]];
    for(let k=0;k<4;k++){const k2=(k+1)%4;W.qd([b[k][0],b[k][1],z0],[b[k2][0],b[k2][1],z0],[a[k2][0],a[k2][1],z1],[a[k][0],a[k][1],z1],GREEN2,RV);
      for(const f of [0.25,0.5,0.75]){const pa=[b[k][0]+(b[k2][0]-b[k][0])*f,b[k][1]+(b[k2][1]-b[k][1])*f,z0+0.05],pb=[a[k][0]+(a[k2][0]-a[k][0])*f,a[k][1]+(a[k2][1]-a[k][1])*f,z1-0.05];
        const out=[(pa[0]+pb[0])/2-20,(pa[1]+pb[1])/2-16,0],ol=Math.hypot(out[0],out[1]),o2=[out[0]/ol*0.06,out[1]/ol*0.06,0];W.flat([pa[0]+o2[0],pa[1]+o2[1],pa[2]],[pb[0]+o2[0],pb[1]+o2[1],pb[2]],[out[0]/ol,out[1]/ol,0.3],0.09,GREEN2);}}
    W.bx(x0-0.12,x1+0.12,y0-0.12,y0+0.02,z1-0.12,z1+0.02,GREEN);W.bx(x0-0.12,x1+0.12,y1-0.02,y1+0.12,z1-0.12,z1+0.02,GREEN);W.bx(x0-0.12,x0+0.02,y0,y1,z1-0.12,z1+0.02,GREEN);W.bx(x1-0.02,x1+0.12,y0,y1,z1-0.12,z1+0.02,GREEN);
    for(let x=x0+0.3;x<x1-0.1;x+=0.3)W.bx(x-0.02,x+0.02,y0,y1,z1-0.06,z1,IRON,ME);for(let y=y0+1;y<y1;y+=1)W.bx(x0,x1,y-0.03,y+0.03,z1-0.1,z1,IRON,ME);
    for(let k=0;k<26;k++){const t=k/26*6.283,r=0.5+(k%5)*0.45;W.ic([20+Math.cos(t)*r*1.1,16+Math.sin(t)*r*1.1,z1-0.55-(r>1.5?0:0.25)],0.35+0.15*((k*7)%3),COAL,PA,{jit:0.35,sy:0.6});}
    for(const [lx,ly] of [[17.6,13.6],[22.4,13.6],[17.6,18.4],[22.4,18.4]]){W.bx(lx-0.18,lx+0.18,ly-0.02,ly+0.02,0,z1-0.15,GREEN);W.bx(lx-0.02,lx+0.02,ly-0.18,ly+0.18,0,z1-0.15,GREEN);W.bx(lx-0.3,lx+0.3,ly-0.3,ly+0.3,0,0.03,IRON);}
    for(const [p0,p1] of [[[17.6,13.6,0.3],[22.4,13.6,2.6]],[[22.4,13.6,0.3],[17.6,13.6,2.6]],[[17.6,18.4,0.3],[22.4,18.4,2.6]],[[22.4,18.4,0.3],[17.6,18.4,2.6]],[[17.6,13.6,0.3],[17.6,18.4,2.6]],[[17.6,18.4,0.3],[17.6,13.6,2.6]]])W.flat(p0,p1,[0,1,0],0.08,GREEN);
    W.bx(19,21,15,17,0.95,z0,GREEN2);W.bx(19.2,23.2,15.3,16.7,0.85,1.05,GREEN2);for(const e of [15.3,16.7])W.bx(19.2,23.2,e-0.02,e+0.02,1.05,1.35,GREEN2);
    W.cy([23.4,15.2,1.45],[23.4,16.8,1.45],0.32,0.32,14,IRON,ME,1);for(const e of [15.05,16.95])W.bx(22.9,23.9,e-0.05,e+0.05,0,1.7,GREEN);}
  for(const y of [11,29]){W.bx(5,41,y-0.32,y+0.32,-0.05,0.1,[0.56,0.55,0.52],ST);W.bx(5,41,y-0.04,y+0.04,0.1,0.26,IRON,ME);W.bx(5,41,y-0.09,y+0.09,0.1,0.14,IRON,ME);
    for(const x of [4.4,41.6]){const e=x<20?-1:1;W.bx(x-0.42,x+0.42,y-0.6,y+0.6,0,1.0,RED,RV);W.bx(x-0.46,x+0.46,y-0.65,y+0.65,1.0,1.08,IRON);W.bx(x-e*0.42-0.12,x-e*0.42+0.12,y-0.4,y+0.4,0.35,0.85,TIMBER,WO);}}
  return{};};

// ---- the belt conveyor and its houses, the shiploader rails (origin: harbour x 47, y 16, deck)
const zA=x=>x<=40?1.4+(x-23)/17*5.6:7;
KIT.models.portBelt=function(K){K.seed(602);const W=works(K,[47,16,0]);
  // side trusses up the incline and along the quay
  for(const y of [15,17]){W.lattice([23.6,y,zA(23.6)],[40,y,7],1.1,GREEN,{panel:1.2});W.lattice([40,y,7],[70,y,7],1.1,GREEN,{panel:1.25});}
  // cross members, troughed idlers every 1.2 m, return idlers, the belt (troughed on top, flat underneath)
  for(let x=24;x<=70;x+=1.2){const z=zA(x);W.bx(x-0.06,x+0.06,15,17,z-0.11,z+0.01,GREEN);W.cy([x,15.62,z+0.2],[x,16.38,z+0.2],0.06,0.06,8,IRON,ME);for(const e of [-1,1])W.cy([x,16+e*0.38,z+0.2],[x,16+e*0.62,z+0.36],0.06,0.06,8,IRON,ME);
    for(const e of [15.45,16.55])W.bx(x-0.04,x+0.04,e-0.04,e+0.04,z,z+0.2,GREEN);if(Math.round(x*10)%24===0)W.cy([x,15.4,z-0.05],[x,16.6,z-0.05],0.05,0.05,8,IRON,ME);}
  {const segs=[[23.6,40],[40,70]];for(const [xa,xb] of segs){const za=zA(xa),zb=zA(xb);W.qd([xa,15.62,za+0.27],[xb,15.62,zb+0.27],[xb,16.38,zb+0.27],[xa,16.38,za+0.27],RUBBER,PA);
      for(const e of [-1,1])W.qd([xa,16+e*0.38,za+0.27],[xb,16+e*0.38,zb+0.27],[xb,16+e*0.66,zb+0.43],[xa,16+e*0.66,za+0.43],RUBBER,PA);W.qd([xa,15.45,za+0.0],[xb,15.45,zb+0.0],[xb,16.55,zb+0.0],[xa,16.55,za+0.0],RUBBER,PA);}}
  // walkway on the north side: brackets, chequer plate, a handrail
  {const seg=(xa,xb)=>{const za=zA(xa),zb=zA(xb);W.qd([xa,17.05,za+0.02],[xb,17.05,zb+0.02],[xb,17.85,zb+0.02],[xa,17.85,za+0.02],GREY,RV);W.rail([xa,17.85,za+0.02],[xb,17.85,zb+0.02],1.0,GREEN,{noToe:true});};seg(23.8,40);seg(40,70);
    for(let x=24.5;x<70;x+=2.4)W.flat([x,17.05,zA(x)],[x,17.8,zA(x)-0.6],[1,0,0],0.1,GREEN);}
  // trestle bents: two laced posts each, a cap girder, crossed bracing
  for(const x of [29,34.5,45,55,65]){const z=zA(x)-0.12;for(const y of [14.7,17.3])W.tower(x,y,0,z,0.4,GREEN,{pitch:0.55});W.bx(x-0.25,x+0.25,14.4,17.6,z-0.25,z,GREEN);
    W.cy([x,14.9,0.4],[x,17.1,z-0.4],0.026,0.026,6,IRON,ME);W.cy([x,17.1,0.4],[x,14.9,z-0.4],0.026,0.026,6,IRON,ME);for(const y of [14.7,17.3])W.bx(x-0.45,x+0.45,y-0.45,y+0.45,-0.3,0.12,STONE,ST);}
  // the head house at the end of the level run, on a platform over four laced legs, a ladder down; the head pulley
  {const x0=68.4,x1=72.6,y0=13.8,y1=18.2,zf=7.0;for(const [x,y] of [[68.8,14.2],[72.2,14.2],[68.8,17.8],[72.2,17.8]]){W.tower(x,y,0,zf,0.42,GREEN,{pitch:0.6});W.bx(x-0.45,x+0.45,y-0.45,y+0.45,-0.3,0.12,STONE,ST);}
    W.bx(x0-0.3,x1+0.3,y0-0.3,y1+0.3,zf,zf+0.12,GREY,RV);W.pgirder([x0-0.3,y0,zf],[x1+0.3,y0,zf],0.5,0.25,GREEN);W.pgirder([x0-0.3,y1,zf],[x1+0.3,y1,zf],0.5,0.25,GREEN);
    W.rail([x0-0.3,y0-0.3,zf+0.12],[x1+0.3,y0-0.3,zf+0.12],1.0,GREEN);W.rail([x1+0.3,y0-0.3,zf+0.12],[x1+0.3,y1+0.3,zf+0.12],1.0,GREEN);
    W.house(x0+0.2,x1,y0,y1,zf+0.12,2.6,{wall:OXIDE,win:[['-y',70.4,1.1,0.9,zf+1.6],['+y',70.4,1.1,0.9,zf+1.6],['+x',16,1.1,0.9,zf+1.6]],door:['-x',15.0,0.9,2.0]});
    W.cy([68.2,15.4,7.3],[68.2,16.6,7.3],0.34,0.34,14,IRON,ME,1);W.ladder(73.1,15.2,0,zf+0.12,[0,1,0],[1,0,0],GREEN,true);}
  // the tail engine house beside the hopper (a little steam engine drives the belt): sill on a brick plinth, windows, door, a tall
  // stove chimney with a cap; the drive shaft out to the tail pulley
  {const x0=25.2,x1=29.6,y0=17.9,y1=20.7;W.bx(x0-0.15,x1+0.15,y0-0.15,y1+0.15,-0.3,0.3,[0.55,0.28,0.22],24);
    W.house(x0,x1,y0,y1,0.3,3.0,{wall:GREEN2,win:[['-y',26.5,1.0,1.0,1.8],['-y',28.4,1.0,1.0,1.8],['+x',19.3,0.9,1.0,1.8],['+y',27.4,1.0,1.0,1.8]],door:['-x',19.3,0.95,2.1],pipe:false});
    W.cy([28.9,20.2,3.3],[28.9,20.2,6.6],0.16,0.14,10,IRON,ME);W.cy([28.9,20.2,6.6],[28.9,20.2,6.9],0.26,0.2,10,IRON,ME);for(const z of [4.3,5.5])W.cy([28.9,20.2,z],[28.9,20.2,z+0.06],0.2,0.2,10,IRON,ME);
    W.cy([24.6,16,1.45],[25.2,18.6,1.45],0.06,0.06,8,IRON,ME);W.bx(24.4,24.8,15.8,16.2,0,1.6,GREEN);}
  // the shiploader rails: granite bed, rail on sole plates, buffer stops with timber blocks
  for(const y of [2,12]){W.bx(34,72,y-0.32,y+0.32,-0.05,0.1,[0.56,0.55,0.52],ST);W.bx(34,72,y-0.04,y+0.04,0.1,0.26,IRON,ME);W.bx(34,72,y-0.09,y+0.09,0.1,0.14,IRON,ME);
    for(const x of [33.4,72.6]){const e=x<50?-1:1;W.bx(x-0.42,x+0.42,y-0.6,y+0.6,0,1.0,RED,RV);W.bx(x-0.46,x+0.46,y-0.65,y+0.65,1.0,1.08,IRON);W.bx(x-e*0.42-0.12,x-e*0.42+0.12,y-0.4,y+0.4,0.35,0.85,TIMBER,WO);}}
  return{};};

// ---- the gantry's crab (origin: harbour x 20, its own y, z 10.47 the rail top)
KIT.models.portCrab=function(K){K.seed(603);const W=works(K,[20,0,10.47]),zb=10.47;
  for(const x of [16,24]){W.bx(x-0.28,x+0.28,-1.95,1.95,zb+0.5,zb+1.05,GREEN,RV);for(const y of [-1.3,1.3]){W.cy([x-0.1,y,zb+0.34],[x+0.1,y,zb+0.34],0.34,0.34,14,IRON,ME,1);W.cy([x+(x<20?0.1:-0.1),y,zb+0.34],[x+(x<20?0.13:-0.13),y,zb+0.34],0.4,0.4,14,IRON,ME,1);W.bx(x-0.3,x+0.3,y-0.22,y+0.22,zb+0.2,zb+0.55,GREEN2,RV);}
    for(const y of [-2,2])W.bx(x-0.18,x+0.18,y-0.08,y+0.08,zb+0.5,zb+0.95,TIMBER,WO);}
  for(const y of [-1.25,1.25])W.pgirder([15.8,y,zb+1.15],[24.2,y,zb+1.15],0.7,0.3,GREEN);
  W.bx(16.2,23.8,-1.85,1.85,zb+1.15,zb+1.22,GREY,RV);
  W.house(17.0,22.6,-1.55,1.55,zb+1.22,2.4,{wall:OXIDE,win:[['-y',18.4,1.0,0.8,zb+2.4],['-y',21.2,1.0,0.8,zb+2.4],['+y',18.4,1.0,0.8,zb+2.4],['+y',21.2,1.0,0.8,zb+2.4],['-x',0,0.8,0.8,zb+2.4]],door:['+x',0.2,0.8,1.9]});
  W.rail([16.3,-1.8,zb+1.22],[23.7,-1.8,zb+1.22],0.95,GREEN);W.rail([16.3,1.8,zb+1.22],[23.7,1.8,zb+1.22],0.95,GREEN);
  for(const x of [19.4,20.6]){W.cy([x,-0.35,zb+0.2],[x,0.35,zb+0.2],0.3,0.3,12,IRON,ME,1);W.bx(x-0.05,x+0.05,-0.45,0.45,zb,zb+1.15,GREEN2);}
  // the driver's cab hanging under the frame
  {const x0=21.9,x1=23.4,y0=-1.2,y1=1.2,z0=zb-2.3,z1=zb-0.05;W.bx(x0,x1,y0,y1,z0,z0+0.06,GREEN2);W.bx(x0,x1,y0,y1,z1-0.06,z1,GREEN2);
    for(const [cx,cy2] of [[x0,y0],[x1,y0],[x0,y1],[x1,y1]])W.bx(cx-0.05,cx+0.05,cy2-0.05,cy2+0.05,z0,z1,CREAM,PA);
    W.bx(x0,x1,y0,y0+0.03,z0,z0+0.95,OXIDE,CO);W.bx(x0,x1,y1-0.03,y1,z0,z0+0.95,OXIDE,CO);W.bx(x1-0.03,x1,y0,y1,z0,z0+0.95,OXIDE,CO);W.bx(x0,x0+0.03,y0,y1,z0,z0+0.95,OXIDE,CO);
    W.window([(x0+x1)/2,y0,z0+1.55],[0,-1,0],1.3,1.0,{nx:2,ny:1});W.window([(x0+x1)/2,y1,z0+1.55],[0,1,0],1.3,1.0,{nx:2,ny:1});W.window([x1,0,z0+1.55],[1,0,0],2.2,1.0,{nx:3,ny:1});W.window([x0,0,z0+1.55],[-1,0,0],2.2,1.0,{nx:3,ny:1});
    W.bx(x0+0.1,x1-0.1,y0+0.1,y1-0.1,z0+0.05,z0+0.1,[0.3,0.3,0.3],RV);for(const [cx,cy2] of [[x0+0.1,y0+0.1],[x1-0.1,y0+0.1],[x0+0.1,y1-0.1],[x1-0.1,y1-0.1]])W.flat([cx,cy2,z1],[cx,cy2,zb+0.6],[1,0,0],0.1,GREEN);}
  return{};};

// ---- the travelling shiploader (origin: harbour x = its position, y 0, deck)
KIT.models.portLoader=function(K){K.seed(604);const W=works(K,[0,0,0]);
  for(const y of [2,12]){W.bx(-4.3,4.3,y-0.34,y+0.34,0.42,1.12,GREEN,RV);for(const x of [-3.3,-1.1,1.1,3.3]){W.cy([x,y-0.12,0.37],[x,y+0.12,0.37],0.36,0.36,14,IRON,ME,1);W.cy([x,y+0.12,0.37],[x,y+0.16,0.37],0.42,0.42,14,IRON,ME,1);W.bx(x-0.2,x+0.2,y-0.42,y+0.42,0.25,0.55,GREEN2);}
    for(const x of [-4.45,4.45]){W.cy([x,y-0.25,0.8],[x+(x<0?-0.35:0.35),y-0.25,0.8],0.06,0.06,6,IRON,ME);W.cy([x+(x<0?-0.35:0.35),y-0.25,0.8],[x+(x<0?-0.42:0.42),y-0.25,0.8],0.16,0.16,10,IRON,ME,1);}}
  for(const x of [-3.5,3.5])for(const y of [2,12])W.tower(x,y,1.12,7.0,0.7,GREEN,{noBase:true});
  for(const x of [-3.5,3.5]){W.pgirder([x,1.1,7.9],[x,12.9,7.9],0.9,0.36,GREEN);W.cy([x,2.4,1.5],[x,11.6,6.6],0.03,0.03,6,IRON,ME);W.cy([x,11.6,1.5],[x,2.4,6.6],0.03,0.03,6,IRON,ME);}
  for(const y of [2,12]){W.lattice([-3.15,y,6.1],[3.15,y,6.1],0.9,GREEN,{panel:1.05});for(const [x,xi] of [[-3.5,-1.6],[3.5,1.6]])W.flat([x,y,5.2],[xi,y,6.12],[0,1,0],0.14,GREEN);}
  W.bx(-4.3,4.3,0.9,13.1,7.9,8.0,GREY,RV);W.rail([-4.3,0.9,8.0],[4.3,0.9,8.0],1.05,GREEN);W.rail([-4.3,0.9,8.0],[-4.3,13.1,8.0],1.05,GREEN);W.rail([4.3,0.9,8.0],[4.3,13.1,8.0],1.05,GREEN);
  W.ladder(-3.95,3.0,1.12,8.0,[0,1,0],[-1,0,0],GREEN,true);
  W.house(-2.6,2.6,4.6,10.4,8.0,2.7,{wall:OXIDE,win:[['-y',-1.2,1.1,0.9,9.6],['-y',1.2,1.1,0.9,9.6],['-x',6.4,1.0,0.9,9.6],['-x',8.8,1.0,0.9,9.6],['+x',6.4,1.0,0.9,9.6],['+x',8.8,1.0,0.9,9.6]],door:['+y',1.4,0.85,2.0]});
  // the A-frame and its stays
  const apex=[0,7.0,15.6];for(const [x,y] of [[-3.6,1.4],[3.6,1.4],[-3.6,12.6],[3.6,12.6]]){W.bm([x,y,8.0],apex,[0,1,0],0.22,0.16,GREEN);W.bx(x-0.25,x+0.25,y-0.25,y+0.25,8.0,8.12,GREEN);}
  W.cy([-0.4,7.0,15.6],[0.4,7.0,15.6],0.28,0.28,12,IRON,ME,1);W.bx(-0.5,0.5,6.6,7.4,15.3,15.5,GREEN);
  for(const x of [-0.65,0.65]){W.cy([x*0.5,7.0,15.5],[x,-7.9,12.05],0.035,0.035,6,IRON,ME);W.cy([x*0.5,7.0,15.5],[x,-1.8,11.45],0.035,0.035,6,IRON,ME);W.cy([x*0.5,7.0,15.5],[x*1.6,17.3,10.8],0.035,0.035,6,IRON,ME);}
  // the lattice boom from behind the tripper out over the ship: two trusses, bracing, the belt and its idlers, a walkway
  const bz=y=>9.4+(16.5-y)/24.5*1.8;
  for(const x of [-0.65,0.65])W.lattice([x,16.5,bz(16.5)],[x,-8.2,bz(-8.2)],0.85,GREEN,{panel:1.0,noGusset:true});
  for(let y=16;y>-8.2;y-=1.0){const z=bz(y);W.bx(-0.65,0.65,y-0.04,y+0.04,z-0.08,z+0.02,GREEN);W.cy([-0.42,y,z+0.16],[0.42,y,z+0.16],0.05,0.05,8,IRON,ME);}
  W.qd([-0.45,16.3,bz(16.3)+0.24],[-0.45,-8,bz(-8)+0.24],[0.45,-8,bz(-8)+0.24],[0.45,16.3,bz(16.3)+0.24],RUBBER,PA);
  for(let k=0;k<12;k++){const y=15-k*2,z=bz(y);W.cy([-0.65,y,z+0.85],[0.65,y-1,z+0.85],0.02,0.02,4,IRON,ME);}
  W.qd([0.7,15,bz(15)],[0.7,-7,bz(-7)],[1.3,-7,bz(-7)],[1.3,15,bz(15)],GREY,RV);W.rail([1.3,15,bz(15)],[1.3,-7,bz(-7)],1.0,GREEN,{noToe:true});for(let y=14;y>-7;y-=2.4)W.flat([0.7,y,bz(y)],[1.3,y,bz(y)-0.5],[0,1,0],0.08,GREEN);
  // counterweight on the boom's tail, the tripper riding on the belt gallery, the transfer hopper, the telescopic chute
  W.bx(-1.4,1.4,16.6,18.3,9.0,10.9,[0.34,0.33,0.31],RV);W.bx(-1.45,1.45,16.55,18.35,10.9,11.0,GREEN);
  for(const x of [-2.2,2.2])for(const y of [14.95,17.05]){W.bx(x-0.12,x+0.12,y-0.12,y+0.12,8.25,9.5,GREEN);W.cy([x-0.08,y,8.2],[x+0.08,y,8.2],0.13,0.13,10,IRON,ME,1);}
  for(const y of [14.95,17.05])W.pgirder([-2.4,y,9.6],[2.4,y,9.6],0.35,0.2,GREEN);W.lattice([-1.1,13.2,8.1],[-1.1,16.4,9.55],0.6,GREEN,{panel:0.8,noGusset:true});W.lattice([1.1,13.2,8.1],[1.1,16.4,9.55],0.6,GREEN,{panel:0.8,noGusset:true});
  W.cy([-0.8,16.2,9.75],[0.8,16.2,9.75],0.3,0.3,12,IRON,ME,1);W.cy([-0.8,13.4,8.45],[0.8,13.4,8.45],0.22,0.22,12,IRON,ME,1);
  {const a=[[-1.6,-9.6],[1.6,-9.6],[1.6,-6.4],[-1.6,-6.4]],b=[[-0.55,-8.55],[0.55,-8.55],[0.55,-7.45],[-0.55,-7.45]];for(let k=0;k<4;k++){const k2=(k+1)%4;W.qd([b[k][0],b[k][1],9.7],[b[k2][0],b[k2][1],9.7],[a[k2][0],a[k2][1],11.7],[a[k][0],a[k][1],11.7],GREEN2,RV);}
    W.bx(-1.7,1.7,-9.7,-9.5,11.6,11.8,GREEN);W.bx(-1.7,1.7,-6.5,-6.3,11.6,11.8,GREEN);W.bx(-1.7,-1.5,-9.6,-6.4,11.6,11.8,GREEN);W.bx(1.5,1.7,-9.6,-6.4,11.6,11.8,GREEN);}
  {const secs=[[9.7,6.7,0.5],[6.9,3.9,0.44],[4.1,0.6,0.38]];for(const [za,zb2,r] of secs){W.cy([0,-8,za],[0,-8,zb2],r,r,14,GREEN2,RV);for(const z of [za-0.1,zb2+0.08])W.cy([0,-8,z],[0,-8,z+0.08],r+0.05,r+0.05,14,GREEN,ME);}
    for(const e of [-1,1])W.cy([e*0.62,-8,11.6],[e*0.47,-8,1.2],0.015,0.015,4,IRON,ME);W.cy([0,-8,0.7],[0,-8,0.6],0.44,0.5,14,IRON,ME);}
  W.cy([0.9,-8.6,11.8],[0.9,-8.6,12.9],0.03,0.03,6,IRON,ME);W.cy([0.9,-8.6,12.9],[0.9,-8.6,13.25],0.14,0.1,8,[1,0.85,0.55],GW);
  return{};};

// ---- a Victorian coal wagon on the siding (moves; origin: its centre on the rail top): a planked timber body with iron corner plates
// and strapping, a side door, solebars, W-irons with axleboxes, spoked wheels, buffers, a coupling, the brake lever; the coal is drawn
// separately (PortCoal) so it can go down as the grab empties the wagon
KIT.models.portWagon=function(K){K.seed(606);const W=works(K,[0,0,0]),{bx,cy}=W,BODY=[0.56,0.24,0.15],X=2.8,Y=1.15,z0=1.12,z1=2.4;
  for(const e of [-1,1]){bx(-X-0.3,X+0.3,e*1.05-0.07,e*1.05+0.07,0.72,1.08,BLACK,RV);for(const x of [-1.45,1.45]){bx(x-0.42,x+0.42,e*1.0-0.02,e*1.0+0.02,0.32,0.78,BLACK,RV);bx(x-0.14,x+0.14,e*1.0-0.12,e*1.0+0.06,0.36,0.62,BLACK,ME);
      cy([x,e*0.72-0.06,0.46],[x,e*0.72+0.06,0.46],0.46,0.46,16,IRON,ME,1);cy([x,e*0.72-0.075,0.46],[x,e*0.72+0.075,0.46],0.13,0.13,10,IRON,ME,1);for(let k=0;k<8;k++){const a=k*Math.PI/4;W.bm([x,e*0.72,0.46],[x+Math.cos(a)*0.4,e*0.72,0.46+Math.sin(a)*0.4],[0,1,0],0.05,0.06,IRON,ME);}
      cy([x,e*0.72+(e>0?0.06:-0.06),0.46],[x,e*0.72+(e>0?0.07:-0.07),0.46],0.52,0.52,16,IRON,ME,1);}
    for(const x of [-X-0.3,X+0.3]){const sx=x<0?-1:1;cy([x,e*0.85,0.95],[x+sx*0.3,e*0.85,0.95],0.07,0.07,8,IRON,ME);cy([x+sx*0.3,e*0.85,0.95],[x+sx*0.36,e*0.85,0.95],0.2,0.2,12,IRON,ME,1);}}
  for(const x of [-X-0.3,X+0.3])bx(x-0.08,x+0.08,-1.15,1.15,0.72,1.08,RED,RV);bx(-X,X,-1.0,1.0,1.04,1.12,BLACK,RV);
  W.cy([X+0.3,0,0.9],[X+0.62,0,0.9],0.05,0.05,6,IRON,ME);for(let k=0;k<3;k++)W.ic([X+0.7+k*0.12,0,0.82-k*0.06],0.05,IRON,ME);
  // the body: planks (side, ends), the top rail, corner plates, strapping, the side door with its hinges
  for(const e of [-1,1]){bx(-X,X,e*Y-0.04,e*Y+0.04,z0,z1,BODY,WO);for(let z=z0+0.2;z<z1;z+=0.2)bx(-X,X,e*(Y+0.045)-0.005,e*(Y+0.045)+0.005,z-0.01,z+0.01,[0.25,0.16,0.1],WO);
    bx(-X-0.02,X+0.02,e*Y-0.07,e*Y+0.07,z1-0.08,z1+0.04,BLACK,RV);for(const x of [-X+0.12,X-0.12])bx(x-0.12,x+0.12,e*(Y+0.05)-0.01,e*(Y+0.05)+0.01,z0,z1,BLACK,RV);
    for(const x of [-1.9,-0.9,0.9,1.9])bx(x-0.04,x+0.04,e*(Y+0.055)-0.01,e*(Y+0.055)+0.01,z0,z1,BLACK,RV);
    bx(-0.7,0.7,e*(Y+0.06)-0.01,e*(Y+0.06)+0.01,z0+0.1,z1-0.1,[0.38,0.25,0.15],WO);for(const z of [z0+0.35,z1-0.35])bx(-0.66,0.66,e*(Y+0.075)-0.01,e*(Y+0.075)+0.01,z-0.04,z+0.04,BLACK,RV);
    bx(-0.75,0.75,e*(Y+0.06)-0.015,e*(Y+0.06)+0.015,z0-0.05,z0+0.05,BLACK,RV);W.ic([0.55,e*(Y+0.09),z0+0.55],0.04,IRON,ME);}
  for(const x of [-X,X]){bx(x-0.04,x+0.04,-Y,Y,z0,z1,BODY,WO);for(let z=z0+0.2;z<z1;z+=0.2)bx(x+(x<0?-0.045:0.045)-0.005,x+(x<0?-0.045:0.045)+0.005,-Y,Y,z-0.01,z+0.01,[0.25,0.16,0.1],WO);bx(x-0.07,x+0.07,-Y-0.02,Y+0.02,z1-0.08,z1+0.04,BLACK,RV);
    for(const y of [-0.6,0.6])bx(x+(x<0?-0.055:0.055)-0.01,x+(x<0?-0.055:0.055)+0.01,y-0.04,y+0.04,z0,z1,BLACK,RV);}
  bx(-X+0.05,X-0.05,-Y+0.05,Y-0.05,z0,z0+0.05,[0.12,0.1,0.08],WO);
  // the brake: a lever along the solebar, the block on the wheel
  W.bm([-1.0,-1.17,0.95],[1.7,-1.17,0.62],[0,1,0],0.04,0.06,IRON,ME);bx(1.66,1.76,-1.2,-1.12,0.5,0.75,[0.85,0.85,0.8],PA);bx(-1.05,-0.88,-1.02,-0.94,0.3,0.62,TIMBER,WO);
  return{};};

// ---- the collier (origin: harbour x 60, y −6.5, the waterline; written in ship coordinates u along it (bow −u, west), v across
// (+v toward the quay = starboard), w up from the waterline)
KIT.models.portShip=function(K){K.seed(605);const W=works(K,[0,0,0]),{bx,cy,qd}=W;const LH=22.5,BH=4.5;
  const sheer=u=>2.5+0.95*Math.pow(Math.max(0,-u-5)/17.5,2)+0.55*Math.pow(Math.max(0,u-5)/17.5,2);
  const sm=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
  const raise=u=>1.9*(1-sm(-17.4,-16.6,u))+1.8*sm(8.6,9.4,u),FC=-16.8,PP=9.0;/* forecastle and poop */
  const topU=u=>sheer(u)+Math.max(raise(u),1.0);/* hull side top: the forecastle / poop sides, or the 1 m bulwark */
  const ub=w=>-LH+(4.6-w)*0.2,us=w=>LH-(w<0?(-w)*0.55:0);
  const hb=(u,w)=>{let f=1;const a=ub(w),b=us(w);if(u<-12){const t=Math.min(1,(-12-u)/(-12-a));f=Math.max(0,1-Math.pow(t,1.7));f=Math.pow(f,1+Math.max(0,2.6-w)/6.6);}
    if(u>9){const t=Math.min(1,(u-9)/(b-9));f*=1-0.62*t*t;if(w<0.5)f*=1-Math.pow(t,1.3)*Math.min(1,(0.5-w)/3)*0.9;}
    const g=w>-2.4?1:1-Math.pow((-2.4-w)/1.6,2)*0.55;return BH*f*g;};
  // hull plating: strakes (rows) by height, panels about 1.2 m long; antifouling red up to the waterline, a white boot line, black above
  const rowsW=[-4,-3.1,-2.2,-1.3,-0.5,0.22,0.36],NS=38;
  const rowAt=(j,s)=>{if(j<rowsW.length){const w=rowsW[j];return[ub(w)+(us(w)-ub(w))*s,w];}const k=j-rowsW.length+1,u0=-LH+2*LH*s;let w=0.36+(topU(u0)-0.36)*k/3;const u=ub(w)+(us(w)-ub(w))*s;w=0.36+(topU(u)-0.36)*k/3;return[u,w];};
  const NR=rowsW.length+3;
  for(let j=0;j<NR-1;j++)for(let i=0;i<NS;i++){const [ua,wa]=rowAt(j,i/NS),[ub2,wb]=rowAt(j,(i+1)/NS),[uc,wc]=rowAt(j+1,(i+1)/NS),[ud,wd]=rowAt(j+1,i/NS);const col=wd<=0.23?RED:wd<=0.37?WHITE:BLACK;
    for(const e of [-1,1]){const P=(u,w)=>[u,e*hb(u,w),w];qd(P(ua,wa),P(ub2,wb),P(uc,wc),P(ud,wd),col,RV);}}
  // the counter stern (transom), the keel and the stem bar, the rudder and its post
  for(let j=0;j<NR-1;j++){const [ua,wa]=rowAt(j,1),[ud,wd]=rowAt(j+1,1);qd([ua,-hb(ua,wa),wa],[ua,hb(ua,wa),wa],[ud,hb(ud,wd),wd],[ud,-hb(ud,wd),wd],wd<=0.23?RED:BLACK,RV);}
  bx(ub(-4),us(-4),-0.12,0.12,-4.15,-3.95,RED);for(let k=0;k<8;k++){const w0=-4+k*(topU(-LH)+4)/8,w1=w0+(topU(-LH)+4)/8;W.bm([ub(w0)-0.02,0,w0],[ub(w1)-0.02,0,w1],[0,1,0],0.16,0.14,w1<0.3?RED:BLACK);}
  bx(21.6,23.2,-0.1,0.1,-3.7,0.6,RED);cy([20.9,0,-3.8],[20.9,0,1.6],0.12,0.12,8,BLACK,RV);
  // decks: the main deck between the breaks, the forecastle and the poop; planked (with a margin plank)
  const deckQ=(u0,u1,h,inset)=>{for(let u=u0;u<u1-0.01;u+=1.2){const u2=Math.min(u1,u+1.2),wa=h(u),wb=h(u2),ha=hb(u,wa)-inset,hb2=hb(u2,wb)-inset;if(ha<=0.05&&hb2<=0.05)continue;qd([u,-Math.max(0.02,ha),wa],[u2,-Math.max(0.02,hb2),wb],[u2,Math.max(0.02,hb2),wb],[u,Math.max(0.02,ha),wa],DECK,DK);}};
  /* the main deck leaves the three hatch openings (u ±2.5, v ±2 around u −16, −7, 2) open */
  const deckS=(u0,u1,h,inset,vi)=>{for(let u=u0;u<u1-0.01;u+=1.2){const u2=Math.min(u1,u+1.2),wa=h(u),wb=h(u2),ha=hb(u,wa)-inset,hb2=hb(u2,wb)-inset;for(const e of [-1,1])qd([u,e*vi,wa],[u2,e*vi,wb],[u2,e*hb2,wb],[u,e*ha,wa],DECK,DK);}};
  {let u=FC;for(const hu of [-16,-7,2]){deckQ(u,hu-2.5,sheer,0.06);deckS(hu-2.5,hu+2.5,sheer,0.06,2);u=hu+2.5;}deckQ(u,PP,sheer,0.06);}deckQ(ub(4)+0.1,FC,u=>sheer(u)+1.9,0.04);deckQ(PP,us(4)-0.02,u=>sheer(u)+1.8,0.04);
  // break bulkheads (white) with doors and portholes
  for(const [u,fwd] of [[FC,1],[PP,-1]]){const w0=sheer(u),w1=w0+(fwd>0?1.9:1.8),h=hb(u,w0)-0.06;qd([u,-h,w0],[u,h,w0],[u,h,w1],[u,-h,w1],WHITE,RV);
    for(const v of [-h*0.55,h*0.55])W.door([u,v,w0],[fwd,0,0],0.8,1.65,TEAK);for(const v of [-h*0.2,h*0.2]){cy([u,v,w0+1.25],[u+fwd*0.05,v,w0+1.25],0.17,0.17,12,BRASS,ME);cy([u+fwd*0.05,v,w0+1.25],[u+fwd*0.055,v,w0+1.25],0.13,0.13,12,[0.3,0.35,0.4],GL);}}
  // bulwarks along the main deck: buff inner face, stays, the teak capping rail; rails on the forecastle and the poop
  for(let u=FC;u<PP-0.01;u+=1.2){const u2=Math.min(PP,u+1.2);for(const e of [-1,1]){const a=hb(u,sheer(u))-0.05,b=hb(u2,sheer(u2))-0.05;qd([u,e*a,sheer(u)],[u2,e*b,sheer(u2)],[u2,e*b,sheer(u2)+1.0],[u,e*a,sheer(u)+1.0],[0.78,0.68,0.5],RV);
      W.flat([u,e*(a-0.02),sheer(u)+0.05],[u,e*(a-0.02),sheer(u)+0.95],[1,0,0],0.1,[0.78,0.68,0.5]);W.bm([u,e*(a+0.03),sheer(u)+1.02],[u2,e*(b+0.03),sheer(u2)+1.02],[0,0,1],0.08,0.24,TEAK,WO);}}
  const deckRail=(u0,u1,h)=>{for(const e of [-1,1]){let pr=null;for(let u=u0;u<=u1+0.01;u+=1.2){const w=h(u),q=[u,e*(hb(u,w)-0.1),w];cy(q,[q[0],q[1],w+1.0],0.025,0.025,6,WHITE,ME);if(pr){cy([pr[0],pr[1],pr[2]+1.0],[q[0],q[1],w+1.0],0.03,0.03,6,TEAK,WO);cy([pr[0],pr[1],pr[2]+0.5],[q[0],q[1],w+0.5],0.018,0.018,5,WHITE,ME);}pr=q;}}};
  deckRail(-20.4,FC,u=>sheer(u)+1.9);deckRail(PP,21.6,u=>sheer(u)+1.8);
  {const w=sheer(21.9)+1.8;for(let v=-1.4;v<=1.41;v+=0.7)cy([21.9,v,w],[21.9,v,w+1.0],0.025,0.025,6,WHITE,ME);cy([21.9,-1.4,w+1.0],[21.9,1.4,w+1.0],0.03,0.03,6,TEAK,WO);}
  // the hatches (open for loading): riveted coamings with a top angle, the hold's dark sides and the coal in it, hatch boards stacked
  for(const hu of [-16,-7,2]){const w0=sheer(hu),u0=hu-2.5,u1=hu+2.5,v0=-2,v1=2;
    bx(u0-0.06,u1+0.06,v0-0.06,v0,w0,w0+0.9,BLACK);bx(u0-0.06,u1+0.06,v1,v1+0.06,w0,w0+0.9,BLACK);bx(u0-0.06,u0,v0,v1,w0,w0+0.9,BLACK);bx(u1,u1+0.06,v0,v1,w0,w0+0.9,BLACK);
    bx(u0-0.14,u1+0.14,v0-0.14,v0+0.02,w0+0.86,w0+0.92,BLACK);bx(u0-0.14,u1+0.14,v1-0.02,v1+0.14,w0+0.86,w0+0.92,BLACK);bx(u0-0.14,u0+0.02,v0,v1,w0+0.86,w0+0.92,BLACK);bx(u1-0.02,u1+0.14,v0,v1,w0+0.86,w0+0.92,BLACK);for(let u=u0+0.6;u<u1;u+=1.2)for(const v of [v0-0.1,v1+0.1])bx(u-0.04,u+0.04,v-0.04,v+0.04,w0,w0+0.8,BLACK);
    qd([u0,v0,w0-3],[u1,v0,w0-3],[u1,v0,w0+0.85],[u0,v0,w0+0.85],DARK,PA);qd([u0,v1,w0-3],[u1,v1,w0-3],[u1,v1,w0+0.85],[u0,v1,w0+0.85],DARK,PA);qd([u0,v0,w0-3],[u0,v1,w0-3],[u0,v1,w0+0.85],[u0,v0,w0+0.85],DARK,PA);qd([u1,v0,w0-3],[u1,v1,w0-3],[u1,v1,w0+0.85],[u1,v0,w0+0.85],DARK,PA);
    for(let k=0;k<14;k++){const a=k*2.4,r=(k%3)*0.6;W.ic([hu+Math.cos(a)*r*1.4,Math.sin(a)*r,w0-1.4+(r<0.5?0.5:0)],0.7+0.2*(k%2),COAL,PA,{jit:0.4,sy:0.55});}
    for(let k=0;k<7;k++)bx(u1+0.4,u1+1.0,-1.6,1.6,w0+0.02+k*0.07,w0+0.08+k*0.07,TIMBER,WO);bx(u1+0.35,u1+1.05,-1.7,1.7,w0+0.52,w0+0.62,[0.22,0.25,0.2],PA);}
  // masts with crosstrees, a crow's nest on the foremast, topped-up derricks, shrouds with ratlines, chainplates, stays
  const masts=[[-19.5,sheer(-19.5)+1.9],[7,sheer(7)]],tops=[];
  for(const [mu,mw] of masts){const t1=mw+12.5,t2=t1+4;cy([mu,0,mw],[mu,0,t1],0.22,0.16,12,MAST,PA);cy([mu,0,t1-1.6],[mu,0,t2],0.11,0.07,10,MAST,PA);W.ic([mu,0,t2+0.05],0.12,MAST,PA);
    bx(mu-0.12,mu+0.12,-1.1,1.1,t1-1.1,t1-0.95,MAST,PA);cy([mu,0,mw+0.6],[mu,0,mw+0.75],0.32,0.32,12,BLACK,ME);cy([mu,0,mw+2],[mu,0,mw+2.1],0.26,0.26,12,BLACK,ME);
    if(mu<0){cy([mu,0,t1-3.2],[mu,0,t1-2.2],0.55,0.6,14,[0.4,0.3,0.2],WO);cy([mu,0,t1-3.25],[mu,0,t1-3.15],0.62,0.62,14,[0.3,0.22,0.14],WO);}
    for(const sd of [-1,1]){const du=sd*0.34;cy([mu+du,0,mw+1.2],[mu+du*1.2,0,mw+9],0.09,0.07,8,MAST,PA);cy([mu+du*1.2,0,mw+9],[mu,0,t1-1.4],0.012,0.012,4,ROPE,PA);bx(mu+du-0.1,mu+du+0.1,-0.1,0.1,mw+1.05,mw+1.25,BLACK);}
    for(const e of [-1,1]){const sh=[];for(const du of [-1.0,0,1.0]){const ww=sheer(mu+du)+(mu<0?1.9:1.0),vv=e*(hb(mu+du,ww)-0.05),a=[mu+du,vv,ww+(mu<0?0.05:0.1)],b=[mu,e*0.18,t1-1.2];cy(a,b,0.016,0.016,4,ROPE,PA);bx(a[0]-0.05,a[0]+0.05,vv-0.02,vv+0.02,ww-0.6,ww+0.15,BLACK);sh.push([a,b]);}
      for(let f=0.08;f<0.7;f+=0.06){const P=(s)=>s[0].map((v,i)=>v+(s[1][i]-v)*f);const p0=P(sh[0]),p2=P(sh[2]);cy(p0,p2,0.008,0.008,3,ROPE,PA);}}
    tops.push([mu,0,t2-0.3]);}
  cy(tops[0],[ub(topU(-LH))+0.1,0,topU(-LH)+0.4],0.018,0.018,4,ROPE,PA);cy(tops[0],tops[1],0.016,0.016,4,ROPE,PA);cy(tops[1],[21.6,0,sheer(21.6)+2.8],0.016,0.016,4,ROPE,PA);
  cy([tops[0][0],0,tops[0][2]-3],[tops[0][0],0,tops[0][2]-2.85],0.07,0.07,6,[1,0.95,0.8],GW);
  // windlass and anchors on the forecastle, hawse pipes, chain, mooring bitts
  {const w=sheer(-20)+1.9;cy([-20.2,-1.3,w+0.45],[-20.2,1.3,w+0.45],0.28,0.28,12,BLACK,ME,1);for(const v of [-0.85,0.85]){cy([-20.2,v-0.12,w+0.45],[-20.2,v+0.12,w+0.45],0.42,0.42,10,BLACK,ME,1);}bx(-20.6,-19.8,-1.5,-1.3,w,w+0.85,BLACK);bx(-20.6,-19.8,1.3,1.5,w,w+0.85,BLACK);
    for(const e of [-1,1]){const u=-21,ww=topU(u)-1.1,vv=e*(hb(u,ww)+0.02);cy([u,vv,ww],[u-0.1,vv+e*0.05,ww-0.05],0.2,0.24,10,BLACK,ME);/* an anchor stowed in its hawse pipe */W.ob([u+0.1,vv+e*0.08,ww-0.7],[0.06,0,0],[0,0,0.65],[0,0.06,0],BLACK,ME);W.ob([u+0.1,vv+e*0.1,ww-1.35],[0.45,0,0.12],[0,0,0.12],[0,0.08,0],BLACK,ME);
      for(let k=0;k<7;k++){const f=k/7;W.ic([-20.2+(u+0.3+20.2)*f,e*0.85+(vv-e*0.85)*f*0.9,w+0.45-0.4*f],0.07,BLACK,ME);}}
    for(const u of [-17.8,PP+0.8,20.2])for(const e of [-1,1]){const ww=u<0?sheer(u)+1.9:u>PP?sheer(u)+1.8:sheer(u);for(const du of [-0.25,0.25])cy([u+du,e*(hb(u,ww)-0.55),ww],[u+du,e*(hb(u,ww)-0.55),ww+0.55],0.11,0.11,10,BLACK,ME,1);}}
  // the bridge deckhouse on the poop: white plating, portholes, teak doors; the bridge deck with rails, the teak wheelhouse with big
  // windows, the bridge wings with dodgers and side lights, the binnacle and the telegraph
  {const wp=sheer(13)+1.8,u0=10,u1=17,v0=-3.1,v1=3.1,h=2.3,wt=wp+h;bx(u0,u1,v0,v1,wp,wt,WHITE);bx(u0-0.08,u1+0.08,v0-0.08,v1+0.08,wt,wt+0.1,WHITE);
    for(let u=u0+0.7;u<u1-0.4;u+=1.1)for(const e of [-1,1]){const v=e*3.1;cy([u,v,wp+1.45],[u,v+e*0.05,wp+1.45],0.17,0.17,12,BRASS,ME);cy([u,v+e*0.05,wp+1.45],[u,v+e*0.055,wp+1.45],0.13,0.13,12,[0.3,0.35,0.4],GL);}
    W.door([u0,-1.6,wp],[-1,0,0],0.8,1.9,TEAK);W.door([u0,1.6,wp],[-1,0,0],0.8,1.9,TEAK);W.door([u1,0,wp],[1,0,0],0.8,1.9,TEAK);for(const v of [-0.4,0.4])W.window([u0,v*2,wp+1.5],[-1,0,0],0.5,0.5,{nx:1,ny:1});
    const bw=wt+0.1;W.rail([u0,-4.4,bw],[u1,-3.2,bw],1.0,WHITE,{noToe:true});W.rail([u0,4.4,bw],[u1,3.2,bw],1.0,WHITE,{noToe:true});W.rail([u1,-3.2,bw],[u1,3.2,bw],1.0,WHITE,{noToe:true});
    bx(u0-0.2,u0+1.6,-4.6,4.6,bw-0.08,bw,DECK,DK);for(const e of [-1,1]){W.flat([u0+0.4,e*4.3,bw-0.1],[u0+0.4,e*3.2,bw-1.0],[1,0,0],0.1,WHITE);bx(u0-0.2,u0+1.6,e*4.6-0.03,e*4.6+0.03,bw,bw+1.05,[0.82,0.78,0.66],PA);
      bx(u0+0.5,u0+0.9,e*4.68-0.12,e*4.68+0.12,bw+0.85,bw+1.25,[0.15,0.15,0.15],ME);W.ic([u0+0.7,e*4.82,bw+1.05],0.09,e<0?[1,0.12,0.08]:[0.1,1,0.3],GW);}
    for(const e of [-1,1])bx(u0-0.22,u0+1.62,e*4.6-0.07,e*4.6+0.07,bw+1.05,bw+1.1,TEAK,WO);bx(u0-0.27,u0-0.17,-4.6,4.6,bw,bw+1.05,[0.82,0.78,0.66],PA);bx(u0-0.3,u0-0.14,-4.65,4.65,bw+1.05,bw+1.1,TEAK,WO);
    const h2=2.1,x0=u0+0.3,x1=u0+3.2,y0=-2.0,y1=2.0;bx(x0,x1,y0,y1,bw,bw+0.85,TEAK,WO);bx(x0,x1,y0,y1,bw+h2-0.35,bw+h2,TEAK,WO);
    for(const [a,b] of [[x0,y0],[x1,y0],[x0,y1],[x1,y1]])bx(a-0.06,a+0.06,b-0.06,b+0.06,bw,bw+h2,TEAK,WO);
    for(let k=0;k<5;k++){const v=y0+0.4+k*0.8;W.window([x0,v,bw+1.3],[-1,0,0],0.62,0.8,{nx:1,ny:1,frame:TEAK});}for(const e of [-1,1])for(const u of [x0+0.7,x0+2.1])W.window([u,e*2.0,bw+1.3],[0,e,0],0.75,0.8,{nx:1,ny:1,frame:TEAK});
    W.window([x1,0,bw+1.3],[1,0,0],1.6,0.8,{nx:2,ny:1,frame:TEAK});bx(x0-0.2,x1+0.2,y0-0.2,y1+0.2,bw+h2,bw+h2+0.08,WHITE);W.rail([x0-0.2,y0-0.2,bw+h2+0.08],[x1+0.2,y0-0.2,bw+h2+0.08],0.8,WHITE,{noToe:true});
    cy([u0+0.1,-3.6,bw],[u0+0.1,-3.6,bw+1.1],0.13,0.11,10,BRASS,ME,1);cy([u0+0.1,3.6,bw],[u0+0.1,3.6,bw+1.0],0.08,0.08,8,BRASS,ME);W.ic([u0+0.1,3.6,bw+1.05],0.16,BRASS,ME);
    // the funnel: raked, buff with a black top and steel bands, a steam pipe with a whistle, stays; the engine-room skylight
    const fa=z=>[14.2+z*0.16,0,wt+z],fr=1.15;cy(fa(0),fa(5.8),fr,fr,18,BUFF,PA);cy(fa(5.8),fa(7.2),fr,fr,18,BLACK,PA,1);cy(fa(0),fa(0.35),fr+0.25,fr+0.06,18,BUFF,PA);
    for(const z of [1.6,3.4,5.0])cy(fa(z),fa(z+0.07),fr+0.03,fr+0.03,18,[0.7,0.55,0.3],PA);
    cy([15.6,0.5,wt],[16.65,0.5,wt+7.3],0.08,0.08,8,BUFF,PA);cy([15.95,0.5,wt+4.9],[16.05,0.5,wt+5.6],0.09,0.06,8,BRASS,ME);
    for(const [a,b] of [[[14.9,0,wt+5],[u0+0.5,-3.0,wt+0.1]],[[14.9,0,wt+5],[u0+0.5,3.0,wt+0.1]],[[15.3,0,wt+5],[u1,-3,wt+0.1]],[[15.3,0,wt+5],[u1,3,wt+0.1]]])cy(a,b,0.014,0.014,4,IRON,ME);
    for(const e of [-1,1]){bx(15.9,16.8,e*0.6-0.55,e*0.6+0.55,wt+0.1,wt+0.55,WHITE);qd([15.9,e*0.05,wt+0.75],[16.8,e*0.05,wt+0.75],[16.8,e*1.15,wt+0.55],[15.9,e*1.15,wt+0.55],[0.16,0.19,0.22],ME);for(const uu of [16.2,16.5])W.bm([uu,e*0.05,wt+0.76],[uu,e*1.15,wt+0.56],[1,0,0],0.03,0.03,WHITE,ME);}
    // cowl ventilators: buff pipes with red-mouthed cowls
    for(const [vu,vv,vw,dir] of [[8.3,-1.6,sheer(8.3),-1],[8.3,1.6,sheer(8.3),-1],[-15.6,-3,sheer(-15.6),1],[-15.6,3,sheer(-15.6),1],[17.4,-2.6,wp,-1],[17.4,2.6,wp,-1]]){
      cy([vu,vv,vw],[vu,vv,vw+1.7],0.2,0.2,10,BUFF,PA);cy([vu,vv,vw+1.65],[vu+dir*0.35,vv,vw+2.05],0.22,0.34,10,BUFF,PA);cy([vu+dir*0.36,vv,vw+2.06],[vu+dir*0.38,vv,vw+2.08],0.3,0.3,10,[0.6,0.12,0.08],PA,1);}
    // lifeboats on davits each side of the poop, aft of the deckhouse
    for(const e of [-1,1]){const bu=19.6,bv=e*(hb(bu,wp)-0.95),bwz=wp+1.5,L=4.2,BB=1.4,D=0.65,ns=8;let prev=null;
      for(let k=0;k<=ns;k++){const s=k/ns,uu=bu-L/2+L*s,half=BB/2*Math.pow(Math.sin(Math.PI*Math.max(0.03,Math.min(0.97,s))),0.6),sec=[[uu,bv-half,bwz],[uu,bv-half*0.75,bwz-D*0.7],[uu,bv,bwz-D],[uu,bv+half*0.75,bwz-D*0.7],[uu,bv+half,bwz]];
        if(prev)for(let r=0;r<4;r++)qd(prev[r],sec[r],sec[r+1],prev[r+1],WHITE,WO);prev=sec;}
      bx(bu-L/2+0.3,bu+L/2-0.3,bv-0.5,bv+0.5,bwz,bwz+0.12,[0.62,0.6,0.52],PA);bx(bu-L/2+0.2,bu+L/2-0.2,bv-0.62,bv+0.62,bwz-0.04,bwz+0.04,TEAK,WO);
      for(const du of [-1.6,1.6]){const base=[bu+du,e*(hb(bu+du,wp)-0.25),wp];let pr=base;for(let k=1;k<=6;k++){const t=k/6,q=[bu+du,base[1]-e*Math.sin(t*1.7)*0.8,wp+t*2.6];W.bm(pr,q,[1,0,0],0.1,0.1,WHITE,ME);pr=q;}cy(pr,[bu+du,bv,bwz+0.1],0.012,0.012,4,ROPE,PA);}}
    // the ensign on its staff at the stern
    const sw=sheer(21.9)+1.8;cy([22.1,0,sw],[22.4,0,sw+3.2],0.035,0.03,6,MAST,PA);qd([22.4,0,sw+3.1],[23.6,0.05,sw+2.95],[23.6,0.05,sw+2.25],[22.4,0,sw+2.4],[0.72,0.1,0.08],PA);qd([22.4,0.01,sw+3.1],[22.9,0.03,sw+3.03],[22.9,0.03,sw+2.75],[22.4,0.01,sw+2.8],[0.14,0.2,0.48],PA);}
  // portholes along the forecastle and poop sides
  for(const [u0,u1] of [[-20.4,-17.6],[9.8,20.6]])for(let u=u0;u<=u1;u+=1.4)for(const e of [-1,1]){const ww=topU(u)-0.95,vv=e*(hb(u,ww)+0.005);cy([u,vv,ww],[u,vv+e*0.04,ww],0.17,0.17,12,BRASS,ME);cy([u,vv+e*0.04,ww],[u,vv+e*0.045,ww],0.12,0.12,12,[0.28,0.33,0.38],GL);}
  return{};};
})();
