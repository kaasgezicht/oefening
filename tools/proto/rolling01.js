// ---- DB class 01 Pacific (2'C1'h2, as 01 118) with its 2'2' T32 tender, and the two-axle HEA-style grain hopper (user's photos, Nov 2026).
// Real size: loco 14.6 m + tender 8.6 m over buffers (+0.7 m coupling = 23.9 m), driving wheels 2.0 m, bogie wheels 1.0 m, trailing 1.25 m.
// Moving parts (vertex anim types in VS_VEH): 1 turns with its wheel; 2/3 coupling rods (crank circle, left/right); 4 main rod; 5 crosshead,
// piston rod and union link; 6 eccentric rod; 7 expansion link; 8 radius rod; 9 combination lever (shear between union link and radius rod);
// 10 valve spindle (rigid, at the lever's height aAnim.z). aAnim.y = side (0 or 1 = a quarter turn later), aAnim.w = driving wheel radius.
// The rest geometry is built with every crank pin at its axle centre (the shader puts it on its circle), the cranked parts of a wheel at their
// angle for the wheel's side (phase 0 on +z, a quarter turn on -z).
const G01={cx:-1.3,cy:1.0,r:0.33,L:3.3,e:0.2,off:-1.5708,piv:[0.25,1.78],foot:0.42,die:0.26,yb:0.72,yt:1.98,R:1.0,drv:[1.0,-1.3,-3.6],bog:[5.65,3.45],trail:-6.05};
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
  for(let k=0;k<nsp;k++){const q=ph+k/nsp*6.28318,c=Math.cos(q),s=Math.sin(q),r0=R*0.2,r1=R*0.82,rm=(r0+r1)/2,tw=R*(o.drvR?0.055:0.08);
    vob(M,[x+c*rm,y+s*rm,z+sg*0.02],[c*(r1-r0)/2,s*(r1-r0)/2,0],[-s*tw/2,c*tw/2,0],[0,0,0.045],rc,0,An);}
  vcylN(M,[x,y,z-0.11*sg],[x,y,z+sg*(w/2+0.06)],R*0.2,R*0.18,14,rc,0,An);vcylN(M,[x,y,z+sg*(w/2+0.06)],[x,y,z+sg*(w/2+0.1)],R*0.1,R*0.08,10,[0.3,0.29,0.29],1,An);
  if(o.cw){const q0=ph+Math.PI-o.cw/2,q1=ph+Math.PI+o.cw/2;vring(M,x,y,zo+sg*0.03,R*0.3,R*0.8,q0,q1,8,sg,rc,0,An);vring(M,x,y,zo-sg*0.07,R*0.3,R*0.8,q0,q1,8,-sg,rc,0,An);
    for(const [q,e] of [[q0,-1],[q1,1]]){const c=Math.cos(q),s=Math.sin(q);vob(M,[x+c*R*0.55,y+s*R*0.55,zo-sg*0.02],[c*R*0.25,s*R*0.25,0],[-s*0.01,c*0.01,0],[0,0,0.05],rc,0,An);}}
  if(o.crank){const c=Math.cos(ph),s=Math.sin(ph),px=x+c*o.crank,py=y+s*o.crank;vcylN(M,[px,py,zo],[px,py,zo+sg*0.07],0.17,0.17,12,rc,0,An);vcylN(M,[px,py,zo+sg*0.07],[px,py,zo+sg*(o.pin||0.2)],0.075,0.075,10,[0.62,0.63,0.66],1,An);}}
// the seven-segment number plate figures ("01 118"): plate centre c in the plane facing n (+x front or ±z side), figure height h
function vplate(M,c,face,txt,h,plate,fig){const W=txt.length*h*0.62+h*0.5,u=face==='x'?[0,0,-1]:face==='z'?[1,0,0]:[-1,0,0],n=face==='x'?[1,0,0]:face==='z'?[0,0,1]:[0,0,-1],P=(a,b,o)=>[c[0]+u[0]*a+n[0]*o,c[1]+b,c[2]+u[2]*a+n[2]*o];
  vob(M,P(0,0,-0.01),[u[0]*W/2,0,u[2]*W/2],[0,h*0.8,0],[n[0]*0.012,0,n[2]*0.012],plate,3);vob(M,P(0,0,-0.005),[u[0]*(W/2+0.02),0,u[2]*(W/2+0.02)],[0,h*0.8+0.02,0],[n[0]*0.008,0,n[2]*0.008],fig,1);
  const SEG={0:'abcdef',1:'bc',8:'abcdefg'},sw=h*0.42,st=h*0.09;let a=-W/2+h*0.45;for(const ch of txt){if(ch===' '){a+=h*0.3;continue;}const S=SEG[ch]||'';
    const bar=(x0,y0,x1,y1)=>vob(M,P(a+(x0+x1)/2,(y0+y1)/2,0.008),[u[0]*(Math.abs(x1-x0)/2+st/2),0,u[2]*(Math.abs(x1-x0)/2+st/2)],[0,Math.abs(y1-y0)/2+st/2,0],[n[0]*0.006,0,n[2]*0.006],fig,1);
    if(S.includes('a'))bar(0,h/2,sw,h/2);if(S.includes('g'))bar(0,0,sw,0);if(S.includes('d'))bar(0,-h/2,sw,-h/2);if(S.includes('b'))bar(sw,0,sw,h/2);if(S.includes('c'))bar(sw,-h/2,sw,0);if(S.includes('f'))bar(0,0,0,h/2);if(S.includes('e'))bar(0,-h/2,0,0);a+=h*0.62;}}
function loco01Mesh(){const M=vmesh(),G=G01,BK=[0.075,0.075,0.08],BK2=[0.11,0.11,0.12],RD=[0.66,0.1,0.08],ST=[0.6,0.61,0.64],ST2=[0.42,0.42,0.44],BR=[0.85,0.68,0.32],CR=[0.92,0.9,0.84],LMP=COL.lamp,GL=COL.glass,BY=2.95,BR0=0.98;// boiler axis, radius
  // ---- frames (bar frames, red) with the cut-outs between the axleboxes, buffer beam, drag box at the back
  for(const z of [-0.6,0.6]){vbox(M,[0.2,1.55,z],[13.6,0.5,0.1],RD,0);vbox(M,[4.6,1.12,z],[4.6,0.36,0.1],RD,0);vbox(M,[-2.0,1.15,z],[6.4,0.3,0.1],RD,0);vbox(M,[-6.1,1.15,z],[1.6,0.4,0.1],RD,0);}
  for(const x of [5.0,2.6,-0.15,-2.45,-4.8])vbox(M,[x,1.5,0],[0.14,0.6,1.2],RD,0);
  vbox(M,[7.0,1.12,0],[0.18,0.5,3.0],RD,0);vbox(M,[-7.15,1.12,0],[0.24,0.5,2.8],RD,0);for(const z of [-1.0,1.0])vbox(M,[7.08,1.12,z*1.35],[0.06,0.5,0.2],BK,3);
  // buffers: housing, plunger and head; screw coupling and hook; brake pipes
  for(const xs of [1,-1])for(const z of [-0.875,0.875]){const x0=xs>0?7.09:-7.27,d=xs;vcylN(M,[x0,1.06,z],[x0+d*0.22,1.06,z],0.17,0.15,12,BK,3);vcylN(M,[x0+d*0.22,1.06,z],[x0+d*0.46,1.06,z],0.085,0.085,10,ST,1);
    vcylN(M,[x0+d*0.46,1.06,z],[x0+d*0.5,1.06,z],0.22,0.22,16,ST2,1);if(xs<0&&false)break;}
  vbox(M,[7.25,1.0,0],[0.3,0.14,0.12],BK,3);vbar(M,[7.3,1.0],[7.5,0.95],0,0.1,0.1,BK,3);for(const z of [-0.35,0.35]){vcylN(M,[7.12,1.0,z],[7.32,0.6,z*1.2],0.035,0.035,6,BK,3);vcylN(M,[7.32,0.6,z*1.2],[7.36,0.55,z*1.2],0.05,0.05,6,RD,0);}
  // ---- running boards: high along the boiler (red edge strip), dropping in a curve at the front to the buffer beam
  for(const z of [-1,1]){const zz=z*1.32;vbox(M,[-1.0,2.18,zz],[8.4,0.05,0.5],BK2,3);vbox(M,[-1.0,2.1,z*1.565],[8.4,0.13,0.025],RD,0);
    const pts=[[3.2,2.18],[3.6,2.12],[3.95,1.95],[4.25,1.72],[4.55,1.55],[7.05,1.5]];for(let i=0;i+1<pts.length;i++){const a=pts[i],b=pts[i+1];vbar(M,a,b,zz,0.05,0.5,BK2,3);vbar(M,[a[0],a[1]-0.08],[b[0],b[1]-0.08],z*1.565,0.13,0.025,RD,0);}}
  vbox(M,[5.8,1.53,0],[2.5,0.05,2.1],BK2,3);
  // ---- Wagner smoke deflectors: tall plates beside the smokebox, with their stays to the smokebox and a hand hole
  for(const z of [-1,1]){const zz=z*1.52,poly=[[4.2,1.66],[6.85,1.58],[6.85,3.4],[6.55,3.95],[4.2,3.95]];
    vq(M,[4.2,1.66,zz],[6.85,1.58,zz],[6.85,3.4,zz],[4.2,3.4,zz],[0,0,z],BK,3);vq(M,[4.2,3.4,zz],[6.85,3.4,zz],[6.55,3.95,zz],[4.2,3.95,zz],[0,0,z],BK,3);
    vq(M,[4.2,1.66,zz-z*0.02],[4.2,3.4,zz-z*0.02],[6.85,3.4,zz-z*0.02],[6.85,1.58,zz-z*0.02],[0,0,-z],BK,3);vq(M,[4.2,3.4,zz-z*0.02],[4.2,3.95,zz-z*0.02],[6.55,3.95,zz-z*0.02],[6.85,3.4,zz-z*0.02],[0,0,-z],BK,3);
    vbar(M,[6.85,3.4],[6.55,3.95],zz-z*0.01,0.04,0.05,BK2,3);vbox(M,[5.5,3.95,zz-z*0.01],[2.7,0.04,0.05],BK2,3);
    for(const x of [4.6,6.2])vbox(M,[x,3.15,z*1.25],[0.06,0.06,0.5],BK,3);vbox(M,[5.9,2.3,zz+z*0.004],[0.36,0.13,0.004],[0.02,0.02,0.02],3);}
  // ---- boiler: barrel with cladding bands and handrails, smokebox with the round door, central handwheel, hinges, number plate
  vcylN(M,[-2.55,BY,0],[4.4,BY,0],BR0,BR0,32,BK,3);for(const x of [-1.6,-0.1,1.4,2.9])vcylN(M,[x-0.025,BY,0],[x+0.025,BY,0],BR0+0.012,BR0+0.012,32,[0.2,0.2,0.21],1,null,false);
  vcylN(M,[4.4,BY,0],[6.62,BY,0],1.02,1.02,32,BK2,3);vcylN(M,[4.36,BY,0],[4.46,BY,0],1.05,1.05,32,BK,3,null,false);vbox(M,[5.5,1.95,0],[2.2,0.25,1.6],BK2,3);
  vcylN(M,[6.62,BY,0],[6.68,BY,0],1.03,1.03,32,BK,3);vcylN(M,[6.68,BY,0],[6.76,BY,0],0.9,0.86,32,BK,3);vcylN(M,[6.76,BY,0],[6.8,BY,0],0.2,0.2,14,BK2,1);
  for(let k=0;k<4;k++){const q=k*Math.PI/2+0.4;vbar(M,[6.81,BY],[6.81,BY],0,0.0,0.0,BK,3);vob(M,[6.81,BY+Math.sin(q)*0.15,Math.cos(q)*0.15],[0.02,0,0],[0,Math.sin(q)*0.15,0],[0,0,0.03],ST2,1);}
  vcylN(M,[6.8,BY,0],[6.86,BY,0],0.05,0.05,8,ST,1);vcylN(M,[6.84,BY,0],[6.86,BY,0],0.28,0.28,16,ST2,1,null,false);for(let k=0;k<6;k++){const q=k/6*6.283;vob(M,[6.85,BY+Math.sin(q)*0.14,Math.cos(q)*0.14],[0.01,0,0],[0,Math.sin(q)*0.14,0],[0,0,Math.cos(q)*0.015+0.012],ST2,1);}
  for(const y of [BY+0.55,BY-0.55])vbox(M,[6.79,y,-0.45],[0.03,0.07,0.75],BK2,1);vbox(M,[6.79,BY,-0.92],[0.06,1.3,0.08],BK2,1);
  for(let k=0;k<12;k++){const q=k/12*6.283;vcylN(M,[6.68,BY+Math.sin(q)*0.95,Math.cos(q)*0.95],[6.71,BY+Math.sin(q)*0.95,Math.cos(q)*0.95],0.025,0.025,6,BK2,1);}
  vplate(M,[6.8,BY-0.55,0],'x','01 118',0.13,[0.05,0.05,0.05],CR);
  for(const z of [-0.9,0.9]){vcylN(M,[-2.4,3.6,z],[6.2,3.6,z],0.022,0.022,6,ST,1);for(const x of [-1.8,0.6,3.0,5.4])vbox(M,[x,3.58,z*0.97],[0.03,0.03,0.12],ST,1);}
  vcylN(M,[6.6,3.98,-0.35],[6.6,3.98,0.35],0.022,0.022,6,ST,1);
  // chimney (stovepipe with a lip), the feed-water dome, sand dome and steam dome with safety valves, the whistle, pipes along the boiler
  vcylN(M,[5.55,3.7,0],[5.55,4.52,0],0.36,0.34,20,BK,3);vcylN(M,[5.55,4.52,0],[5.55,4.6,0],0.4,0.4,20,BK,3);vcylN(M,[5.55,4.0,0],[5.55,4.6,0],0.3,0.3,16,[0.03,0.03,0.03],3,null,false);
  vcylN(M,[3.65,3.75,0],[3.65,4.05,0],0.32,0.3,18,BK,3);vcylN(M,[3.65,4.05,0],[3.65,4.12,0],0.2,0.12,14,BK,3);
  for(const [x,r,h] of [[1.9,0.48,0.62],[0.05,0.52,0.66]]){vcylN(M,[x,3.6,0],[x,3.82+h*0.55,0],r,r*0.97,20,BK,3);vcylN(M,[x,3.82+h*0.55,0],[x,3.82+h*0.7,0],r*0.97,r*0.72,20,BK,3);vcylN(M,[x,3.82+h*0.7,0],[x,3.82+h*0.74,0],r*0.72,r*0.3,20,BK,3);}
  for(const z of [-0.14,0.14]){vcylN(M,[-1.1,3.88,z],[-1.1,4.22,z],0.07,0.06,10,BR,1);vcylN(M,[-1.1,4.22,z],[-1.1,4.3,z],0.09,0.09,10,BR,1);}
  vcylN(M,[-1.7,3.9,0.25],[-1.7,4.3,0.25],0.04,0.04,8,BR,1);vcylN(M,[-1.7,4.3,0.25],[-1.7,4.52,0.25],0.09,0.08,12,BR,1);vcylN(M,[-1.7,4.52,0.25],[-1.7,4.56,0.25],0.11,0.02,12,BR,1);
  for(const z of [-1,1]){vcylN(M,[-2.3,2.35,z*0.86],[4.3,2.35,z*0.86],0.045,0.045,8,BK2,1);vcylN(M,[1.9,3.9,z*0.4],[1.9,2.3,z*1.0],0.03,0.03,6,BK2,1);vcylN(M,[1.9,2.3,z*1.0],[1.4,1.2,z*1.05],0.03,0.03,6,BK2,1);
    vcylN(M,[0.05,3.95,z*0.45],[-0.6,3.2,z*0.95],0.04,0.04,8,BK2,1);vcylN(M,[-0.6,3.2,z*0.95],[-2.3,3.2,z*0.95],0.04,0.04,8,BK2,1);}
  // air pump (two-stage, on the right beside the smokebox), feed pump on the left, lubricator boxes on the running board
  vcylN(M,[3.75,2.2,-1.38],[3.75,3.25,-1.38],0.19,0.19,14,BK,3);vcylN(M,[3.75,3.25,-1.38],[3.75,3.85,-1.38],0.14,0.14,14,BK,3);vcylN(M,[3.75,3.85,-1.38],[3.75,3.95,-1.38],0.17,0.17,14,BK2,1);
  vcylN(M,[3.75,2.65,-1.38],[3.75,2.72,-1.38],0.22,0.22,14,BK2,1);vcylN(M,[3.75,3.4,-1.38],[4.4,3.4,-1.05],0.03,0.03,6,BK2,1);
  vbox(M,[3.6,2.65,1.38],[0.55,0.75,0.32],BK,3);vcylN(M,[3.6,2.3,1.38],[3.6,3.15,1.38],0.15,0.15,12,BK2,1);
  for(const z of [-1.28,1.28])vbox(M,[2.7,2.4,z],[0.55,0.4,0.3],BK,3);
  // headlamps (two low beside the smokebox door, one high above it) and the lamp irons
  for(const [x,y,z] of [[6.95,1.78,1.15],[6.95,1.78,-1.15],[6.72,4.2,0]]){vbox(M,[x-0.08,y,z],[0.26,0.3,0.3],BK,3);vcylN(M,[x+0.05,y,z],[x+0.08,y,z],0.12,0.12,14,LMP,4);vcylN(M,[x+0.05,y,z],[x+0.09,y,z],0.135,0.135,14,BK2,1,null,false);vbox(M,[x-0.08,y+0.2,z],[0.14,0.1,0.14],BK,3);}
  // ---- cylinders (lagged, with covers), valve chests, slide bars; the cylinder drain cocks below
  for(const z of [-1,1]){const zc=z*1.1;vcylN(M,[3.95,1.05,zc],[5.15,1.05,zc],0.4,0.4,20,BK,3);for(const x of [3.95,5.15])vcylN(M,[x-0.05,1.05,zc],[x+0.05,1.05,zc],0.44,0.44,20,BK2,1);vcylN(M,[5.2,1.05,zc],[5.28,1.05,zc],0.3,0.24,16,BK2,1);
    vcylN(M,[3.9,1.75,zc],[5.2,1.75,zc],0.26,0.26,16,BK,3);for(const x of [3.9,5.2])vcylN(M,[x-0.04,1.75,zc],[x+0.04,1.75,zc],0.29,0.29,16,BK2,1);vbox(M,[4.55,1.4,zc],[1.2,0.4,0.4],BK,3);
    vcylN(M,[5.24,1.75,zc],[5.42,1.75,zc],0.07,0.07,10,BK2,1);vcylN(M,[3.95,0.68,zc],[3.95,0.55,zc],0.03,0.03,6,ST2,1);vcylN(M,[5.1,0.68,zc],[5.1,0.55,zc],0.03,0.03,6,ST2,1);
    for(const y of [0.88,1.22])vbox(M,[2.75,y,zc],[2.4,0.08,0.12],ST,1);vbox(M,[3.85,1.05,zc],[0.16,0.6,0.5],BK2,1);vbox(M,[1.7,1.05,zc*0.95],[0.12,0.55,0.36],RD,0);}
  // ---- wheels: bogie (2 axles, 1.0 m), coupled (3 axles, 2.0 m) with counterweights and crank bosses, trailing axle (1.25 m)
  for(const x of G.bog){vcylN(M,[x,0.5,-0.8],[x,0.5,0.8],0.07,0.07,8,BK,3,[1,x,0.5,0.5]);for(const z of [-0.72,0.72])vspoked(M,x,0.5,z,0.5,12,{w:0.13,seg:22});}
  for(const z of [-1,1]){vbox(M,[4.55,0.55,z*0.98],[2.9,0.22,0.08],RD,0);for(const x of G.bog){vbox(M,[x,0.5,z*0.98],[0.36,0.36,0.14],RD,0);}vbox(M,[4.55,0.82,z*0.98],[1.2,0.1,0.12],BK,3);}
  vbox(M,[4.55,0.75,0],[0.5,0.25,1.8],RD,0);
  G.drv.forEach((x,i)=>{vcylN(M,[x,1.0,-0.8],[x,1.0,0.8],0.1,0.1,10,BK,3,[1,x,1.0,1.0]);for(const z of [-0.72,0.72]){const ph=z>0?0:Math.PI/2;vspoked(M,x,1.0,z,1.0,18,{w:0.14,seg:36,drvR:1.0,cw:i===1?1.6:1.0,crank:G.r,ph,pin:i===1?0.32:0.2});}});
  {const x=G.trail;vcylN(M,[x,0.625,-0.8],[x,0.625,0.8],0.08,0.08,8,BK,3,[1,x,0.625,0.625]);for(const z of [-0.72,0.72])vspoked(M,x,0.625,z,0.625,14,{w:0.13,seg:24});
    for(const z of [-1,1]){vbox(M,[x,0.65,z*1.0],[0.42,0.42,0.16],RD,0);vbar(M,[x-0.4,0.95],[x-2.2,1.2],z*0.85,0.2,0.08,RD,0);vbox(M,[x,1.0,z*1.0],[1.1,0.1,0.1],BK,3);}}
  // brake shoes and hangers on the coupled wheels, sand pipes to the rails
  for(const x of G.drv)for(const z of [-0.72,0.72]){vbar(M,[x-1.0,0.9],[x-1.08,1.25],z,0.12,0.1,BK,3);vbar(M,[x-1.08,1.25],[x-1.0,1.7],z,0.05,0.05,BK,3);vcylN(M,[x+0.4,1.7,z*1.05],[x+0.92,0.18,z],0.025,0.025,6,BK2,1);}
  // axlebox wedges and springs under the frames
  for(const x of G.drv)for(const z of [-0.6,0.6]){vbox(M,[x,1.0,z],[0.42,0.48,0.16],RD,0);vbox(M,[x,0.62,z],[1.1,0.1,0.14],BK,3);}
  // ---- coupling rods (type 2/3), main rod (4), crosshead + piston rod + union link (5), return crank (1), eccentric rod (6), expansion link (7),
  //      radius rod (8), combination lever (9) and valve spindle (10); every part carries its side
  for(const z of [-1,1]){const sd=z>0?0:1,ty=z>0?2:3,ph=z>0?0:Math.PI/2,zr=z*0.98,Wr=[0,G.r,0,G.R];
    vbar(M,[G.drv[0],1.0],[G.drv[2],1.0],zr,0.16,0.07,ST,1,[ty,G.r,0,G.R]);for(const x of G.drv)vcylN(M,[x,1.0,zr-0.05*z],[x,1.0,zr+0.05*z],0.15,0.15,12,ST,1,[ty,G.r,0,G.R]);
    const zm=z*1.1,A4=[4,sd,0,G.R],xc=G.cx+G.L;vbar(M,[G.cx,G.cy],[xc,G.cy],zm,0.2,0.07,ST,1,A4);vcylN(M,[G.cx,G.cy,zm-0.05*z],[G.cx,G.cy,zm+0.05*z],0.19,0.19,14,ST,1,A4);vcylN(M,[xc,G.cy,zm-0.05*z],[xc,G.cy,zm+0.05*z],0.12,0.12,10,ST,1,A4);
    const A5=[5,sd,0,G.R];vbox(M,[xc+0.05,G.cy,z*1.1],[0.45,0.28,0.2],ST2,1,A5);vcylN(M,[xc+0.25,G.cy,z*1.1],[3.95,G.cy,z*1.1],0.05,0.05,10,ST,1,A5);vbox(M,[xc+0.05,0.8,z*1.15],[0.08,0.32,0.06],ST2,1,A5);
    vbar(M,[xc+0.05,G.yb],[2.45,G.yb],z*1.2,0.07,0.05,ST,1,A5);
    {const rc=[G.cx+Math.cos(ph+G.off)*G.e,G.cy+Math.sin(ph+G.off)*G.e],pn=[G.cx+Math.cos(ph)*G.r,G.cy+Math.sin(ph)*G.r];vbar(M,pn,rc,z*1.2,0.13,0.07,ST,1,[1,G.cx,G.cy,G.R]);vcylN(M,[rc[0],rc[1],z*1.17],[rc[0],rc[1],z*1.27],0.07,0.07,10,ST,1,[1,G.cx,G.cy,G.R]);}
    const A6=[6,sd,0,G.R],B0=[G.piv[0],G.piv[1]-G.foot];vbar(M,[G.cx,G.cy],B0,z*1.25,0.09,0.05,ST,1,A6);
    const A7=[7,sd,0,G.R];vbar(M,[G.piv[0],G.piv[1]-G.foot-0.05],[G.piv[0],G.piv[1]+0.45],z*1.25,0.14,0.07,ST,1,A7);vcylN(M,[G.piv[0],G.piv[1],z*1.2],[G.piv[0],G.piv[1],z*1.32],0.06,0.06,8,ST2,1);
    vbox(M,[G.piv[0]+0.35,G.piv[1],z*1.3],[0.7,0.14,0.06],BK,3);
    const A8=[8,sd,0,G.R];vbar(M,[G.piv[0],G.piv[1]+G.die],[2.45,G.yt],z*1.3,0.08,0.05,ST,1,A8);
    vbar(M,[2.45,G.yb-0.05],[2.45,G.yt+0.12],z*1.25,0.1,0.06,ST,1,[9,sd,0,G.R]);
    vcylN(M,[2.45,1.75,z*1.15],[3.9,1.75,z*1.15],0.035,0.035,8,ST,1,[10,sd,1.75,G.R]);vbox(M,[2.55,1.75,z*1.15],[0.2,0.1,0.1],ST2,1,[10,sd,1.75,G.R]);
    // reversing reach rod from the cab to the lifting arm
    vcylN(M,[-2.6,2.3,z*1.28],[0.25,2.1,z*1.28],0.025,0.025,6,RD,0);}
  // ---- cab: front wall with spectacle windows, side walls with two windows, curved roof with a vent, steps; firebox under it
  const C0=-2.55,C1=-5.55,cy0=2.2,cy1=4.05;vbox(M,[C0-1.0,2.6,0],[2.3,0.9,2.0],BK2,3);
  vbox(M,[C0-0.03,cy0+0.9,0],[0.06,1.8,2.98],BK,3);vbox(M,[C0-0.03,cy1-0.2,0],[0.06,0.4,2.98],BK,3);for(const z of [-1,1]){vbox(M,[C0-0.03,3.62,z*0.28],[0.06,0.44,0.36],BK,3);vbox(M,[C0-0.03,3.62,z*1.37],[0.06,0.44,0.22],BK,3);vbox(M,[C0-0.02,3.62,z*0.83],[0.03,0.44,0.74],GL,2);vbox(M,[C0+0.0,3.62,z*0.83],[0.03,0.48,0.78],BK2,1);}
  for(const z of [-1,1]){const zz=z*1.49;vbox(M,[(C0+C1)/2,cy0+0.62,zz],[3.0,1.25,0.04],BK,3);vbox(M,[(C0+C1)/2,cy1-0.12,zz],[3.0,0.24,0.04],BK,3);
    for(const [a,b] of [[C0,C0-0.2],[C0-1.05,C0-1.3],[C0-2.1,C1]])vbox(M,[(a+b)/2,3.45,zz],[Math.abs(a-b),0.5,0.04],BK,3);for(const x of [C0-0.62,C0-1.7]){vbox(M,[x,3.45,zz],[0.85,0.5,0.02],GL,2);vbox(M,[x,3.45,zz+z*0.01],[0.88,0.53,0.02],BK2,1);}
    vplate(M,[C0-1.5,2.55,zz+z*0.03],z>0?'z':'-z','01 118',0.1,[0.05,0.05,0.05],CR);vbox(M,[C0-2.2,2.55,zz+z*0.02],[0.3,0.22,0.01],CR,0);vbox(M,[C0-2.2,2.55,zz+z*0.025],[0.24,0.16,0.01],[0.05,0.05,0.05],3);
    vcylN(M,[C1+0.05,2.4,z*1.55],[C1+0.05,3.6,z*1.55],0.02,0.02,6,ST,1);vcylN(M,[C0-0.05,2.4,z*1.55],[C0-0.05,3.6,z*1.55],0.02,0.02,6,ST,1);
    for(const y of [1.4,1.85])vbox(M,[C1+0.25,y,z*1.48],[0.4,0.04,0.25],BK2,3);vbox(M,[C1+0.25,1.62,z*1.6],[0.04,0.5,0.03],BK2,3);}
  vbox(M,[C1+0.03,3.0,0],[0.06,1.9,2.98],BK,3);vbox(M,[(C0+C1)/2,cy0+0.02,0],[3.0,0.06,2.98],[0.3,0.24,0.18],7);
  for(let k=0;k<10;k++){const a0=-1+k/10*2,a1=-1+(k+1)/10*2,y=a=>cy1+0.32*(1-a*a),zz=a=>a*1.56;vq(M,[C0+0.12,y(a0),zz(a0)],[C0+0.12,y(a1),zz(a1)],[C1-0.15,y(a1),zz(a1)],[C1-0.15,y(a0),zz(a0)],[0,1,-(a0+a1)],[0.12,0.12,0.13],3);
    vq(M,[C0+0.12,y(a0)-0.05,zz(a0)],[C1-0.15,y(a0)-0.05,zz(a0)],[C1-0.15,y(a1)-0.05,zz(a1)],[C0+0.12,y(a1)-0.05,zz(a1)],[0,-1,0],[0.3,0.24,0.18],7);}
  for(const x of [C0+0.12,C1-0.15]){const sg=x>C1?1:-1;for(let k=0;k<10;k++){const a0=-1+k/10*2,a1=-1+(k+1)/10*2;vq(M,[x,cy1-0.05,a0*1.56],[x,cy1-0.05,a1*1.56],[x,cy1+0.32*(1-a1*a1),a1*1.56],[x,cy1+0.32*(1-a0*a0),a0*1.56],[sg,0,0],[0.12,0.12,0.13],3);}}
  vbox(M,[-4.0,4.4,0],[1.0,0.12,0.7],[0.12,0.12,0.13],3);
  // inside: the backhead with the firedoor glow, gauges, regulator, the driver's and fireman's seats
  vbox(M,[C0-0.12,3.0,0],[0.14,1.5,1.7],BK2,7);vbox(M,[C0-0.2,2.65,0],[0.04,0.36,0.5],[1,0.45,0.12],4);for(const z of [-0.35,0.35])vcylN(M,[C0-0.19,3.55,z],[C0-0.22,3.55,z],0.1,0.1,12,[0.9,0.88,0.8],7);
  vbox(M,[C0-0.3,3.3,0.15],[0.06,0.06,0.6],BR,1);for(const z of [-1,1])vbox(M,[C0-1.6,2.75,z*1.15],[0.5,0.08,0.45],[0.35,0.25,0.18],7);
  // drawbar plate at the rear, tender gangway
  vbox(M,[-6.9,2.2,0],[0.6,0.06,2.0],BK2,3);
  return M;}
// T32 tender on two bogies: tank with a rounded top edge, the coal space at the front with raised side sheets, tool boxes, water filler,
// ladder at the back, red bogies and buffer beam, two tail lamps
function tender01Mesh(){const M=vmesh(),BK=[0.075,0.075,0.08],BK2=[0.11,0.11,0.12],RD=[0.66,0.1,0.08],ST=[0.6,0.61,0.64],ST2=[0.42,0.42,0.44],CO=[0.05,0.05,0.055],L0=-4.3,L1=4.3;
  vbox(M,[0,1.42,0],[8.4,0.34,2.55],RD,0);for(const x of [L1-0.12,L0+0.12])vbox(M,[x,1.12,0],[0.24,0.5,2.9],RD,0);
  vbox(M,[-0.15,2.55,0],[7.9,1.95,2.96],BK,3);for(const z of [-1,1]){vcylN(M,[-4.1,3.52,z*1.33],[3.8,3.52,z*1.33],0.16,0.16,10,BK,3);vbox(M,[-0.15,3.55,z*1.1],[7.9,0.3,0.5],BK,3);
    for(const x of [-3.2,-1.5,0.2,1.9])vbox(M,[x,2.5,z*1.485],[0.05,1.7,0.02],BK2,3);vbox(M,[-0.15,1.62,z*1.49],[7.9,0.08,0.03],BK2,3);vplate(M,[-2.6,2.3,z*1.5],z>0?'z':'-z','01 118',0.07,[0.05,0.05,0.05],[0.92,0.9,0.84]);}
  vbox(M,[-2.0,3.62,0],[4.4,0.12,2.4],BK,3);vcylN(M,[-2.8,3.68,0],[-2.8,3.95,0],0.32,0.32,14,BK,3);vcylN(M,[-2.8,3.95,0],[-2.8,4.0,0],0.36,0.36,14,BK2,1);
  // coal space: side sheets raised, coal heaped, the shovel plate and the doors at the front, tool boxes
  for(const z of [-1,1]){vq(M,[3.85,3.55,z*1.48],[0.0,3.55,z*1.48],[0.0,4.25,z*1.48],[3.4,4.25,z*1.48],[0,0,z],BK,3);vq(M,[3.85,3.55,z*1.44],[3.4,4.25,z*1.44],[0.0,4.25,z*1.44],[0.0,3.55,z*1.44],[0,0,-z],BK,3);
    vbox(M,[1.7,4.27,z*1.46],[3.4,0.05,0.07],BK2,3);vbox(M,[3.3,4.05,z*1.05],[0.6,0.4,0.6],BK,3);}
  vbox(M,[0.0,3.9,0],[0.06,0.75,2.9],BK,3);vbox(M,[1.7,3.58,0],[3.4,0.06,2.85],CO,3);
  for(let k=0;k<26;k++){const x=0.3+((k*0.618)%1)*3.0,z=((k*0.371)%1-0.5)*2.4,r=0.35+((k*0.29)%1)*0.3;vob(M,[x,3.6+r*0.4,z],[r,0,r*0.3],[0,r*0.45,0],[-r*0.3,0,r],CO,3);}
  vbox(M,[4.1,2.85,0],[0.08,1.3,1.4],BK,3);vbox(M,[4.12,2.6,0],[0.04,0.6,0.8],[0.25,0.2,0.15],6);
  // rear: ladder, lamps, handrails
  for(const z of [-0.45,-0.05]){vcylN(M,[-4.18,1.6,z],[-4.18,3.6,z],0.02,0.02,6,ST2,1);}for(let y=1.7;y<3.6;y+=0.3)vcylN(M,[-4.18,y,-0.45],[-4.18,y,-0.05],0.016,0.016,5,ST2,1);
  for(const z of [-1.0,1.0]){vbox(M,[-4.18,1.85,z],[0.18,0.24,0.24],BK,3);vcylN(M,[-4.27,1.85,z],[-4.29,1.85,z],0.09,0.09,12,[0.8,0.15,0.1],4);}
  for(const z of [-0.875,0.875]){vcylN(M,[L0-0.02,1.06,z],[L0-0.24,1.06,z],0.17,0.15,12,BK,3);vcylN(M,[L0-0.24,1.06,z],[L0-0.46,1.06,z],0.085,0.085,10,ST,1);vcylN(M,[L0-0.46,1.06,z],[L0-0.5,1.06,z],0.22,0.22,16,ST2,1);}
  for(const z of [-1,1]){vcylN(M,[3.95,1.6,z*1.5],[3.95,3.2,z*1.5],0.02,0.02,6,ST,1);vcylN(M,[-4.05,1.6,z*1.5],[-4.05,3.2,z*1.5],0.02,0.02,6,ST,1);for(const y of [1.3,1.75])vbox(M,[3.9,y,z*1.45],[0.4,0.04,0.25],BK2,3);}
  // bogies: plate frames (red) with axleboxes and springs, spoked wheels
  for(const bx of [2.6,-2.6]){for(const z of [-1,1]){vbox(M,[bx,0.62,z*0.98],[2.7,0.3,0.08],RD,0);vbox(M,[bx,0.85,z*0.98],[1.0,0.16,0.1],RD,0);for(const e of [-0.95,0.95]){vbox(M,[bx+e,0.5,z*0.98],[0.32,0.34,0.16],RD,0);vbox(M,[bx+e,0.78,z*1.06],[0.8,0.08,0.1],BK,3);}}
    vbox(M,[bx,0.95,0],[0.5,0.3,1.9],RD,0);vbox(M,[bx,1.2,0],[0.9,0.12,1.2],RD,0);
    for(const e of [-0.95,0.95]){const x=bx+e;vcylN(M,[x,0.5,-0.8],[x,0.5,0.8],0.07,0.07,8,BK,3,[1,x,0.5,0.5]);for(const z of [-0.72,0.72])vspoked(M,x,0.5,z,0.5,12,{w:0.13,seg:22});}}
  vbox(M,[0,1.05,0],[2.6,0.4,1.4],BK2,3);
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
function grainHeapMesh(){const M=vmesh(),nx=36,nz=12,X0=-4.32,X1=4.32,Z=1.36,col=(x,z)=>{const h=Math.sin(x*12.9898+z*78.233)*43758.5453%1;return[0.86+0.06*h,0.71+0.05*h,0.42+0.04*h];};
  const H=(x,z)=>{const pk=Math.max(0,1-Math.pow(Math.abs(x-1.75)/2.9,1.6)-Math.pow(Math.abs(z)/1.9,2)*0.8),pk2=Math.max(0,1-Math.pow(Math.abs(x+1.75)/2.9,1.6)-Math.pow(Math.abs(z)/1.9,2)*0.8);
    return Math.max(pk,pk2)*0.85+0.15+0.04*Math.sin(x*3.1+z*5.7)*Math.sin(x*1.7-z*2.3);};
  const P=(i,j)=>{const x=X0+(X1-X0)*i/nx,z=-Z+2*Z*j/nz;return[x,H(x,z),z];};
  for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){const a=P(i,j),b=P(i+1,j),c=P(i+1,j+1),d=P(i,j+1),e1=[c[0]-a[0],c[1]-a[1],c[2]-a[2]],e2=[d[0]-b[0],d[1]-b[1],d[2]-b[2]];
    let n=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]];const l=Math.hypot(...n);n=n.map(v=>v/l);if(n[1]<0)n=n.map(v=>-v);
    vq(M,a,d,c,b,n,col(a[0],a[2]),8);}
  return M;}
