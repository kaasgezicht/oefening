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
    const pts=[[3.9,RB],[4.3,RB-0.06],[4.62,RB-0.25],[4.9,RB-0.52],[5.2,1.62],[7.0,1.58]];for(let i=0;i+1<pts.length;i++){const a=pts[i],b=pts[i+1];vbar(M,a,b,zz,0.05,0.5,BK2,3);vbar(M,[a[0],a[1]-0.08],[b[0],b[1]-0.08],z*1.565,0.14,0.025,RD,0);}}
  vbox(M,[6.1,1.6,0],[2.2,0.05,2.1],BK2,3);vbox(M,[7.0,1.42,0],[0.2,0.3,2.9],RD,0);
  // ---- Wagner smoke deflectors (rounded top front corner), their stays and the hand holes
  for(const z of [-1,1]){const zz=z*1.53,X0=4.55,X1=7.15,Y0=1.66,Y1=4.08,rc=0.5,P=[[X0,Y0],[X1,Y0],[X1,Y1-rc]];for(let k=1;k<=6;k++){const q=k/6*Math.PI/2;P.push([X1-rc+Math.cos(q)*rc,Y1-rc+Math.sin(q)*rc]);}P.push([X0,Y1]);
    for(let i=1;i+1<P.length;i++){vt(M,[P[0][0],P[0][1],zz],[P[i][0],P[i][1],zz],[P[i+1][0],P[i+1][1],zz],[0,0,z],BK,3);vt(M,[P[0][0],P[0][1],zz-z*0.02],[P[i+1][0],P[i+1][1],zz-z*0.02],[P[i][0],P[i][1],zz-z*0.02],[0,0,-z],BK,3);}
    for(let i=2;i+1<P.length;i++)vbar(M,P[i],P[i+1],zz-z*0.01,0.035,0.05,BK2,3);vbox(M,[(X0+X1)/2,Y1,zz-z*0.01],[X1-X0-rc,0.035,0.05],BK2,3);
    for(const x of [4.9,6.6])vbox(M,[x,3.3,z*1.27],[0.06,0.06,0.5],BK,3);for(const x of [5.6,6.0])vbox(M,[x,2.3,zz+z*0.004],[0.3,0.12,0.004],[0.02,0.02,0.02],3);}
  // ---- boiler: barrel with cladding bands, the wide firebox down to the running board behind the drivers, washout covers, pipes, handrails
  vcylN(M,[C0,BY,0],[4.75,BY,0],BR0,BR0,32,BK,1);for(const x of [-3.9,-2.2,-0.6,1.0,2.6,4.1])vcylN(M,[x-0.025,BY,0],[x+0.025,BY,0],BR0+0.012,BR0+0.012,32,[0.17,0.17,0.18],1,null,false);
  vbox(M,[(C0-3.3)/2,RB+0.45,0],[C0+3.3,0.9,2.1],BK,1);for(const z of [-1,1]){vbox(M,[(C0-3.3)/2,RB+0.9,z*0.99],[C0+3.3,0.06,0.14],BK2,1);
    for(const x of [-3.6,-4.15,-4.7]){vcylN(M,[x,3.6,z*0.8],[x,3.75,z*0.92],0.17,0.12,12,BK,1);}
    vcylN(M,[C0,3.55,z*0.9],[6.4,3.55,z*0.9],0.022,0.022,6,ST,1);for(const x of [-4.5,-2.0,0.5,3.0,5.6])vbox(M,[x,3.53,z*0.95],[0.03,0.03,0.12],ST,1);
    vcylN(M,[C0,2.62,z*1.0],[4.4,2.62,z*1.0],0.045,0.045,8,BK2,1);vcylN(M,[C0,2.8,z*0.98],[3.0,2.8,z*0.98],0.03,0.03,6,BK2,1);vcylN(M,[-1.0,3.95,z*0.45],[-1.6,3.25,z*0.94],0.04,0.04,8,BK2,1);
    vcylN(M,[2.2,3.9,z*0.4],[2.2,2.4,z*1.0],0.03,0.03,6,BK2,1);vcylN(M,[2.2,2.4,z*1.0],[1.6,1.25,z*1.05],0.03,0.03,6,BK2,1);
    // the tall black box beside the firebox at the cab front (injector / feed-water pump housing), with a rounded top
    vbox(M,[C0+0.38,3.1,z*1.25],[0.62,1.3,0.36],BK,1);vcylN(M,[C0+0.07,3.75,z*1.25],[C0+0.69,3.75,z*1.25],0.18,0.18,12,BK,1);}
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
  for(const z of [-1,1]){const zz=z*UZ;vbox(M,[0.85,TY1+0.3,zz],[4.4,0.6,0.05],BK,3);vbox(M,[0.85,UY-0.04,zz],[4.4,0.08,0.06],BK2,3);vbox(M,[0.85,TY1+0.62,zz],[4.4,0.05,0.06],BK2,3);
    for(let x=-1.25;x<=3.0;x+=0.32)vbox(M,[x,TY1+0.95,zz],[0.07,0.62,0.05],BK,3);for(let x=-1.25;x<=3.0;x+=0.32)vbox(M,[x,TY1+0.95,zz-z*0.08],[0.07,0.62,0.04],BK2,3);}
  vbox(M,[3.05,(TY1+UY)/2,0],[0.06,UY-TY1,2*UZ],BK,3);vbox(M,[3.08,TY1+0.3,0],[0.04,0.5,0.7],[0.25,0.2,0.15],6);vbox(M,[0.85,TY1+0.06,0],[4.4,0.06,2*UZ-0.1],CO,3);
  for(let k=0;k<30;k++){const x=-1.0+((k*0.618)%1)*3.9,z=((k*0.371)%1-0.5)*1.8,r=0.32+((k*0.29)%1)*0.25;vob(M,[x,TY1+0.15+r*0.45,z],[r,0,r*0.3],[0,r*0.45,0],[-r*0.3,0,r],CO,3);}
  vbox(M,[T1+0.05,2.4,0],[0.1,1.6,2.0],BK,3);vbox(M,[T1+0.1,2.3,0],[0.04,0.7,0.8],[0.25,0.2,0.15],6);for(const z of [-1,1])vbox(M,[3.3,TY1+0.2,z*1.25],[0.6,0.35,0.45],BK,3);
  // rear wall: number plate up on the rear box, a lamp on top, two lamps lower down, two door panels, warning plates, the ladder, handrails
  vplate(M,[T0-0.01,UY-0.4,0],'-x','01 118',0.17,[0.05,0.05,0.05],GD);
  for(const [y,z] of [[UY+0.18,0.75],[2.25,1.05],[2.25,-1.05]]){vbox(M,[T0-0.12,y,z],[0.24,0.28,0.28],BK,3);vcylN(M,[T0-0.24,y,z],[T0-0.27,y,z],0.12,0.12,14,[1,0.92,0.75],4);vcylN(M,[T0-0.24,y,z],[T0-0.28,y,z],0.135,0.135,14,BK2,1,null,false);}
  for(const z of [-0.45,0.45]){const P=(y,zz)=>[T0-0.012,y,zz];for(const [a,b,c,d] of [[1.6,2.85,z-0.4,z+0.4]]){vbox(M,[T0-0.01,(a+b)/2,c],[0.02,b-a,0.03],BK2,1);vbox(M,[T0-0.01,(a+b)/2,d],[0.02,b-a,0.03],BK2,1);vbox(M,[T0-0.01,a,z],[0.02,0.03,0.8],BK2,1);vbox(M,[T0-0.01,b,z],[0.02,0.03,0.8],BK2,1);}}
  for(const z of [1.18,-1.18])vsign(M,T0-0.012,2.85,z,-1,0.0,0.0,YL,YL,[]);for(const z of [1.18,-1.18]){vob(M,[T0-0.012,2.9,z],[0.006,0,0],[0,0.15,0],[0,0,0.22],YL,0);vob(M,[T0-0.016,2.9,z],[0.004,0,0],[0,0.08,0],[0,0,0.03],[0.05,0.05,0.05],0);}
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
