'use strict';
// ===== buildings/tavern.js — the tavern (reference sheet #4): two storeys, jettied upper floor, half-timbering with St Andrew's crosses
// over a fieldstone ground floor, a front cross-gable wing, steep bendy red clay-tile roofs with two dormers, a big stone chimney on
// the left gable and a smaller stack on the ridge, double door, hanging sign with a beer mug, cobbled courtyard with trestle tables,
// barrels, a covered well, a cart, a lamp post, a hitching rail and a dry-stone wall.
KIT.models.tavern=function(K,opt){
const {box,B,beam,cyl,ico,quad,tri,fp,fb,tuft,flower,rnd,rr,pick}=K,{add,sub,mul,norm,rot,clamp,mix3}=K.v,C=K.C;
const timber=[0.32,0.21,0.13],plaster=[0.89,0.81,0.65],mortar=C.mortar,iron=C.iron,stonePal=C.stone,wood=[0.5,0.36,0.23],woodD=[0.4,0.28,0.18];
const clay={mat:18,pal:C.clay,exp:0.15,len:0.27,th:0.018,w:[0.22,0.28],wideP:0,phi:[0.06,0.09],gap:0.01,missing:0.006,fresh:[0.84,0.44,0.27],aged:[0.5,0.37,0.31],agedP:0.9,yaw:0.03};
// ---------------- volumes
const X0=-5.2,X1=5.2,Z0=-3.6,Z1=3.6,H1=3.0,H2=5.8,SB=1.1,JET=0.4,WX0=-5.2,WX1=-1.0,WZ=-6.2;
const G=K.walls(X0,X1,Z0,Z1),U=K.walls(X0,X1,Z0-JET,Z1),GW=K.walls(WX0,WX1,WZ,Z0),UW=K.walls(WX0,WX1,WZ-JET,Z0-JET);
B(0,H1/2,0,X1-X0,H1,Z1-Z0,plaster,5,0,0.11);B((WX0+WX1)/2,H1/2,(WZ+Z0)/2,WX1-WX0,H1,Z0-WZ,plaster,5,0,0.12);
B(0,(H1+H2)/2,(Z0-JET+Z1)/2,X1-X0,H2-H1,Z1-Z0+JET,plaster,5,0,0.13);B((WX0+WX1)/2,(H1+H2)/2,(WZ+Z0)/2-JET,WX1-WX0,H2-H1,Z0-WZ,plaster,5,0,0.14);
B(0,SB/2,0,X1-X0+0.02,SB,Z1-Z0+0.02,mortar,8,0,0.31);B((WX0+WX1)/2,SB/2,(WZ+Z0)/2,WX1-WX0+0.02,SB,Z0-WZ+0.02,mortar,8,0,0.32);
// ---------------- fieldstone ground floor
const doorU=1.0,doorSkip=(u,y)=>Math.abs(u-doorU)<0.95&&y<2.6;
K.stones(G.front,WX1-0.02,X1+0.08,0,SB,{skip:doorSkip});K.stones(G.right,-3.68,3.68,0,SB);K.stones(G.back,-5.28,5.28,0,SB);K.stones(G.left,-3.6,3.66,0,SB);
K.stones(GW.front,-2.18,2.18,0,SB);K.stones(GW.left,-1.3,1.3,0,SB);K.stones(GW.right,-1.3,1.36,0,SB);
// ---------------- half-timbering helpers (beams 3 cm proud of the plaster)
const T=(f,u0,y0,u1,y1,w)=>beam(fp(f,u0,y0,0.03),fp(f,u1,y1,0.03),f.n,0.08,w||0.13,timber,6);
const post=(f,u,y0,y1)=>fb(f,u,(y0+y1)/2,0.03,0.15,y1-y0,0.08,timber,6);
const rail=(f,u0,u1,y,h)=>fb(f,(u0+u1)/2,y,0.032,u1-u0,h||0.14,0.085,timber,6);
const xcross=(f,uc,w,y0,y1)=>{T(f,uc-w/2,y0,uc+w/2,y1,0.11);T(f,uc-w/2,y1,uc+w/2,y0,0.11);};
function frame(f,u0,u1,y0,y1,posts,braces){rail(f,u0,u1,y0+0.08,0.16);rail(f,u0,u1,y1-0.09,0.18);for(const u of posts)post(f,u,y0+0.12,y1-0.15);for(const [a,b] of braces||[])T(f,a,y0+0.16,b,y1-0.2);}
// windows with St Andrew's crosses below (upper floor) or plain (ground floor)
const win=(f,u,y0,w,h,o)=>K.win(f,u,y0,w,h,{cols:o&&o.cols||3,rows:2,box:o&&o.box,frame:timber});
// ground floor frame + windows
frame(G.front,WX1,X1,SB,H1,[-0.9,0.0,2.05,2.45,4.35,5.12],[[4.35,5.1]]);win(G.front,3.4,1.3,1.8,1.25,{cols:4,box:true});
frame(G.left,-3.6,3.6,SB,H1,[3.5,2.45,1.35,-0.15,-2.35,-3.35,-3.55],[[3.5,2.6],[-3.5,-2.5]]);win(G.left,1.9,1.3,0.9,1.15,{box:true});win(G.left,-2.85,1.3,0.9,1.15);
frame(G.right,-3.6,3.6,SB,H1,[-3.5,-2.4,-1.3,1.3,2.4,3.5],[]);win(G.right,-1.85,1.3,0.9,1.15);win(G.right,1.85,1.3,0.9,1.15);
frame(G.back,-5.2,5.2,SB,H1,[-5.1,-3,-2,0,1,3,5.1],[]);win(G.back,-2.5,1.3,0.9,1.15);win(G.back,2.0,1.3,0.9,1.15);
frame(GW.front,-2.1,2.1,SB,H1,[-2.05,-1.2,1.2,2.05],[]);win(GW.front,0,1.3,2.1,1.25,{cols:4,box:true});
frame(GW.left,-1.3,1.3,SB,H1,[-1.25,-0.55,0.55,1.25],[]);win(GW.left,0,1.3,0.9,1.15,{box:true});
frame(GW.right,-1.3,1.3,SB,H1,[-1.25,-0.5,0.5,1.25],[]);win(GW.right,0,1.3,0.8,1.15);
// upper floor frame, windows with flower boxes, crosses under the sills
const uy0=H1+0.95,uh=1.15;
frame(U.front,WX1,X1,H1,H2,[-0.95,0.0,1.2,2.3,2.85,3.95,5.12],[[1.2,2.3],[5.1,3.95]]);for(const u of [0.6,3.4]){win(U.front,u,uy0,1.1,uh,{box:true});xcross(U.front,u,1.1,H1+0.2,uy0-0.12);}
frame(U.left,-3.8,3.8,H1,H2,[3.72,2.35,1.25,-0.55,-2.4,-3.72],[]);for(const u of [1.8,-3.0]){win(U.left,u,uy0,0.95,uh,{box:u>0});xcross(U.left,u,0.95,H1+0.2,uy0-0.12);}
frame(U.right,-3.8,3.8,H1,H2,[-3.72,-2.4,-1.3,1.3,2.4,3.72],[]);for(const u of [-1.85,1.85]){win(U.right,u,uy0,0.95,uh);xcross(U.right,u,0.95,H1+0.2,uy0-0.12);}
frame(U.back,-5.2,5.2,H1,H2,[-5.1,-3,-2,0,1,3,5.1],[]);for(const u of [-2.5,2.0])win(U.back,u,uy0,0.95,uh);
frame(UW.front,-2.1,2.1,H1,H2,[-2.05,-1.4,-0.5,0.5,1.4,2.05],[]);for(const u of [-0.95,0.95]){win(UW.front,u,uy0,0.85,uh,{box:true});xcross(UW.front,u,0.85,H1+0.2,uy0-0.12);}
frame(UW.left,-1.3,1.3,H1,H2,[-1.25,-0.5,0.5,1.25],[]);win(UW.left,0,uy0,0.85,uh);frame(UW.right,-1.3,1.3,H1,H2,[-1.25,-0.5,0.5,1.25],[]);win(UW.right,0,uy0,0.8,uh);
// jetties: bressummer, joist ends and soffit under the overhang
for(const [f,x0,x1,z] of [[U.front,WX1,X1,Z0-JET],[UW.front,WX0,WX1,WZ-JET]]){fb(f,f===U.front?(WX1+X1)/2:0,H1+0.12,0.05,x1-x0+0.1,0.24,0.12,timber,6);
  B((x0+x1)/2,H1-0.025,z+JET/2,x1-x0,0.05,JET,[0.3,0.22,0.15],12);for(let x=x0+0.2;x<x1-0.05;x+=0.42)B(x,H1-0.11,z+JET/2-0.03,0.12,0.13,JET+0.1,timber,6);}
// ---------------- double door, steps, lanterns, bench, planters
{const f=G.front,u=doorU,dw=1.6,dh=2.25,yb=0.24;fb(f,u,yb+dh/2,0.004,dw+0.1,dh,0.008,[0.07,0.05,0.04],0);
  for(const e of [-1,1]){for(let k=0;k<4;k++)fb(f,u+e*(dw/4)+(k-1.5)*(dw/8),yb+dh/2,0.03,dw/8-0.012,dh-0.02,0.045,mix3([0.44,0.27,0.16],[0.5,0.32,0.2],rnd()),6);
    for(const y of [yb+0.45,yb+1.75]){fb(f,u+e*dw/4,y,0.06,dw/2-0.12,0.07,0.014,iron,11);for(let k=0;k<5;k++)fb(f,u+e*(0.1+k*0.15),y,0.07,0.025,0.025,0.012,[0.12,0.11,0.1],11);}
    cyl(fp(f,u+e*0.14,yb+1.08,0.08),fp(f,u+e*0.14,yb+1.08,0.1),0.075,0.075,12,[0.22,0.2,0.18],11);}
  for(const e of [-1,1])fb(f,u+e*(dw/2+0.08),yb+dh/2+0.06,0.06,0.16,dh+0.14,0.15,timber,6);fb(f,u,yb+dh+0.12,0.07,dw+0.42,0.2,0.16,timber,6);
  for(const [w,d,y,o] of [[2.1,0.62,0.12,0.32],[2.5,0.45,0.06,0.78]])for(let k=0;k<4;k++)fb(f,u-w/2+w*(k+0.5)/4+rr(-0.02,0.02),y,o,w/4-0.03,y*2,d,pick(stonePal),8);
  for(const e of [-1,1]){const lu=u+e*1.15;fb(f,lu,2.25,0.12,0.05,0.05,0.24,iron,11);fb(f,lu,2.05,0.25,0.18,0.28,0.18,[1,0.85,0.55],3);for(const a of [-1,1])for(const b2 of [-1,1])fb(f,lu+a*0.09,2.05,0.25+b2*0.09,0.02,0.3,0.02,iron,11);
    fb(f,lu,2.21,0.25,0.24,0.04,0.24,iron,11);fb(f,lu,1.89,0.25,0.22,0.03,0.22,iron,11);}
  // bench under the big window
  for(const dz of [-0.1,0,0.1])B(3.4,0.46,Z0-0.42+dz,1.7,0.05,0.1,wood,6);for(const e of [-0.75,0.75])B(3.4+e,0.22,Z0-0.42,0.07,0.44,0.34,woodD,6);
  K.pot(-0.45,Z0-0.4);K.pot(2.4,Z0-0.42);}
// ---------------- roofs (bendy, red clay tiles): main, front wing, two dormers
const chimSkip=P=>(P[0]<-5.05&&P[2]>0.45&&P[2]<1.8)||(Math.abs(P[0]-2.6)<0.42&&P[2]>0.28&&P[2]<1.0);
const mr=K.roof({c:[0,(Z0-JET+Z1)/2],dir:[1,0],halfLen:(X1-X0)/2,half:(Z1-Z0+JET)/2,H:H2,rise:5.0,ov:0.45,gov:0.4,th:0.15,sag:0.36,flare:0.26,nx:30,rafters:0.6,skip:chimSkip,cover:clay,mossClumps:30,ridgeMoss:0.2});
K.gableFan(mr,-1,plaster);K.gableFan(mr,1,plaster);
const wr=K.roof({c:[(WX0+WX1)/2,-4.0],dir:[0,-1],halfLen:2.6,half:(WX1-WX0)/2,H:H2,rise:3.3,ov:0.42,gov:0.4,th:0.15,sag:0.24,flare:0.2,phase:1.7,nx:16,ends:[1],rafters:0.6,cover:clay,mossClumps:10,ridgeMoss:0.2});
K.gableFan(wr,1,plaster);
// gable timbering: main gables (left with the chimney beside a small window), wing front gable with a hoist beam
for(const e of [-1,1]){const f=e<0?U.left:U.right,x=e*X1,yU=z=>mr.under(e*mr.hl,z+0.2)-0.04,uz=z=>f.t[2]*(z+0.2);rail(f,-3.8,3.8,H2+0.07,0.16);rail(f,uz(-2.2),uz(1.8),H2+2.2,0.15);
  for(const z of [-2.6,-1.2,1.2,2.6])if(!(e<0&&z>0.3&&z<1.9))T(f,uz(z),H2+0.12,uz(z),yU(z),0.14);T(f,uz(-0.2),H2+2.25,uz(-0.2),yU(-0.2),0.14);
  for(const s of [-1,1])T(f,uz(-0.2+s*0.15),H2+2.28,uz(-0.2+s*1.1),H2+3.4,0.11);K.win(f,uz(e<0?-1.6:-0.2),H2+0.75,0.7,0.85,{frame:timber,cols:2,rows:2});}
{const f=K.face([(WX0+WX1)/2,0,WZ-JET],[0,0,-1],[1,0,0],2.1),yU=x=>wr.under(2.6,x-(WX0+WX1)/2)-0.04;rail(f,-2.1,2.1,H2+0.07,0.16);for(const u of [-1.3,1.3])T(f,u,H2+0.12,u,yU(u+(WX0+WX1)/2),0.14);
  T(f,0,H2+1.4,0,yU((WX0+WX1)/2),0.14);rail(f,-1.3,1.3,H2+1.4,0.14);K.win(f,0,H2+0.3,0.75,0.9,{frame:timber,cols:2,rows:2});
  beam([(WX0+WX1)/2,H2+2.0,WZ-JET+0.2],[(WX0+WX1)/2,H2+2.0,WZ-JET-0.75],[1,0,0],0.16,0.18,timber,6);cyl([(WX0+WX1)/2,H2+1.92,WZ-JET-0.65],[(WX0+WX1)/2,H2+0.6,WZ-JET-0.65],0.012,0.012,4,[0.6,0.52,0.38],0);}
// dormers on the main front slope
for(const dx of [1.65,3.85]){const zf=-3.25,yb=mr.rp(mr.slope(-1),dx,(zf-(-4.0-0.45))/mr.slope(-1).a[1]+0.0,0)[1]-0.25,yt=yb+1.35;
  B(dx,(yb+yt)/2,(zf-1.0)/2,1.45,yt-yb,-1.0-zf,plaster,5);const f=K.face([dx,0,zf],[0,0,-1],[1,0,0],0.72);for(const e of [-1,1])post(f,e*0.66,yb+0.05,yt-0.05);rail(f,-0.72,0.72,yt-0.08,0.14);
  K.win(f,0,yb+0.3,0.7,0.82,{frame:timber,cols:2,rows:2,box:dx<2});
  const dr=K.roof({c:[dx,(zf-1.0)/2],dir:[0,-1],halfLen:(-1.0-zf)/2,half:0.72,H:yt,rise:0.85,ov:0.16,gov:0.22,th:0.1,sag:0.06,flare:0.05,nx:6,ends:[1],cover:clay,ridgeMoss:0});K.gableFan(dr,1,plaster);}
// chimneys: a big stone one up the left gable, a smaller stack on the ridge
K.chimney({base:[X0-1.05,X0,0.3,1.9],bt:2.7,stack:[X0-0.8,X0+0.03,0.6,1.6],top:H2+5.0+1.0,lean:[-0.01,0.006],clad:['x-','z-','z+']});
K.chimney({base:[2.2,3.0,0.28,1.0],bt:9.3,stack:[2.24,2.96,0.32,0.96],top:11.7,lean:[0.008,0],clad:[],pots:[0]});
// ---------------- hanging sign with a beer mug, on an iron bracket from the wing's corner
{const sx=WX1-0.25,sz0=WZ-JET,y=4.35;beam([sx,y,sz0],[sx,y,sz0-1.15],[1,0,0],0.05,0.06,iron,11);beam([sx,y-0.6,sz0],[sx,y-0.02,sz0-0.8],[1,0,0],0.04,0.04,iron,11);
  cyl([sx,y,sz0-1.15],[sx,y,sz0-1.2],0.05,0.05,8,iron,11);for(const z of [-0.45,-1.0])cyl([sx,y-0.02,sz0+z],[sx,y-0.22,sz0+z],0.01,0.01,4,iron,11);
  const cz=sz0-0.72,cy=y-0.62;B(sx,cy,cz,0.06,0.72,0.95,[0.18,0.3,0.22],6);for(const e of [-1,1]){B(sx,cy+e*0.37,cz,0.08,0.05,1.0,[0.75,0.56,0.24],6);B(sx,cy,cz+e*0.49,0.08,0.78,0.05,[0.75,0.56,0.24],6);}
  for(const e of [-1,1]){const x=sx+e*0.045;B(x,cy-0.03,cz,0.02,0.32,0.24,[0.95,0.72,0.2],0);ico([x,cy+0.15,cz],0.14,[0.98,0.96,0.9],0,{sy:0.55,jit:0.2});B(x,cy-0.02,cz+0.17,0.02,0.18,0.06,[0.95,0.72,0.2],0);B(x,cy-0.03,cz+0.2,0.02,0.24,0.03,[0.85,0.62,0.18],0);}}
// ---------------- courtyard, lane, garden
B(0,-0.5,0,180,1.0,180,[0.42,0.56,0.27],9,0,0);
box([0.4,0.02,-8.2],[7.6,0,0],[0,0.02,0],[0,0,4.6],[0.6,0.56,0.5],19,0.21);
box([0,0.012,-14.6],[34,0,0],[0,0.012,0],[0,0,1.9],[0.6,0.5,0.37],17,0.5);for(let k=0;k<110;k++)ico([rr(-32,32),0.03,-14.6+rr(-1.9,1.9)],rr(0.04,0.1),pick(stonePal),0,{sy:0.45,jit:0.2});
for(let k=0;k<180;k++){const x=rr(-32,32),z=-14.6+(rnd()<0.5?rr(-2.1,-1.6):rr(1.6,2.1));tuft(x,z,6,rr(0.12,0.3));}
// trestle tables with benches, tankards, plates and a candle
function table(x,z,ry){const c=Math.cos(ry),s=Math.sin(ry),L=(lx,ly,lz)=>[x+c*lx-s*lz,ly,z+s*lx+c*lz];
  for(const dz of [-0.26,0,0.26])B(...L(0,0.76,dz),2.1,0.05,0.25,mix3(wood,[0.58,0.42,0.27],rnd()),6,ry);
  for(const lx of [-0.8,0.8])for(const e of [-1,1])beam(L(lx,0,e*0.3),L(lx,0.74,-e*0.3),[c,0,s],0.06,0.07,woodD,6);
  for(const e of [-1,1]){B(...L(0,0.45,e*0.62),2.0,0.05,0.26,wood,6,ry);for(const lx of [-0.75,0.75])B(...L(lx,0.21,e*0.62),0.06,0.42,0.24,woodD,6,ry);}
  for(const [lx,lz] of [[-0.6,-0.18],[-0.2,0.2],[0.35,-0.15],[0.7,0.18]]){const p=L(lx,0.785,lz);cyl(p,add(p,[0,0.15,0]),0.05,0.045,10,[0.52,0.38,0.24],16,[0.95,0.85,0.55],0,undefined,true);ico(add(p,[0,0.16,0]),0.045,[0.98,0.96,0.9],0,{sy:0.5});
    beam(add(p,[c*0.06,0.03,s*0.06]),add(p,[c*0.06,0.12,s*0.06]),[c,0,s],0.02,0.015,iron,11);}
  for(const [lx,lz] of [[0,0],[-0.45,0.05]]){const p=L(lx,0.785,lz);cyl(p,add(p,[0,0.012,0]),0.11,0.12,12,[0.85,0.83,0.78],0,[0.8,0.78,0.72],0,undefined,true);}
  const cp=L(0.15,0.785,0.02);cyl(cp,add(cp,[0,0.1,0]),0.03,0.03,8,[0.95,0.93,0.85],0,[0.9,0.88,0.8],0);ico(add(cp,[0,0.13,0]),0.02,[1,0.8,0.4],3);}
table(2.7,-6.5,0.12);table(5.1,-8.5,-0.2);
// barrels by the wing, two lying on a rack, crates
for(const [x,z,r,h] of [[-5.75,-6.75,0.34,0.92],[-5.15,-7.05,0.3,0.82],[-6.1,-7.4,0.3,0.8]])K.barrel(x,z,r,h);
{const rx=-6.25,rz=-5.0;for(const z of [-0.55,0.55])B(rx,0.18,rz+z,1.2,0.12,0.12,woodD,6);for(const k of [-0.36,0.36])K.barrel(rx+k,rz,0.32,1.05,{lying:true,ry:Math.PI/2,y:0.24});}
K.crate(-0.2,0,-4.6,0.5,0.3);K.crate(-0.15,0.5,-4.6,0.4,0.6);
// covered well: stone ring, posts, winch, bucket, little clay roof
{const wx=-6.6,wz=-9.6,r=0.78;for(let c=0;c<3;c++){const n=14;for(let k=0;k<n;k++){const a=(k+(c%2)*0.5)/n*6.283,ca=Math.cos(a),sa=Math.sin(a),p=[wx+ca*r,0.13+c*0.25,wz+sa*r];
      box(p,[-sa*(Math.PI*r/n)*0.94,0,ca*(Math.PI*r/n)*0.94],[0,0.115,0],[ca*0.16,0,sa*0.16],mix3(pick(stonePal),[0.6,0.58,0.52],0.2),8);}}
  cyl([wx,0.58,wz],[wx,0.6,wz],0.62,0.62,16,[0.34,0.3,0.26],8,[0.1,0.16,0.2],0);
  for(const e of [-1,1])beam([wx+e*0.86,0,wz],[wx+e*0.86,2.25,wz],[0,0,1],0.12,0.12,wood,6);cyl([wx-0.9,1.55,wz],[wx+0.9,1.55,wz],0.08,0.08,10,woodD,6,woodD,14);
  beam([wx+0.9,1.55,wz],[wx+1.05,1.55,wz],[0,1,0],0.05,0.05,iron,11);beam([wx+1.05,1.55,wz],[wx+1.05,1.25,wz],[1,0,0],0.04,0.04,iron,11);
  cyl([wx+0.1,1.5,wz],[wx+0.1,1.0,wz],0.012,0.012,4,[0.62,0.54,0.4],0);cyl([wx+0.1,0.72,wz],[wx+0.1,1.0,wz],0.13,0.15,10,wood,16,woodD,6);
  for(const e of [-1,1]){const S=(u,t,o)=>[wx+u,2.2+t*0.55+o*0.85,wz+e*(0.78-t*0.68)+e*o*0.55];for(let i=0;i<4;i++)quad(S(-0.95+i*0.475,0,0),S(-0.475+i*0.475,0,0),S(-0.475+i*0.475,1.0,0),S(-0.95+i*0.475,1.0,0),null,[0.24,0.18,0.13],12,0.5);
    K.shingles(S,-0.95,0.95,1.0,null,clay);}
  for(let x=-0.98;x<0.95;x+=0.34)cyl([wx+x,2.82,wz],[wx+x+0.36,2.82,wz],0.1,0.09,8,mix3(pick(C.clay),[0.5,0.25,0.18],0.25),18,null,0,undefined,true);}
// cart with two barrels by the right
{const x=6.4,z=-5.2,ry=-0.35,c=Math.cos(ry),s=Math.sin(ry),L=(lx,ly,lz)=>[x+c*lx-s*lz,ly,z+s*lx+c*lz];
  for(let k=0;k<5;k++)B(...L(0,0.92,-0.5+k*0.25),2.2,0.05,0.23,mix3(wood,woodD,rnd()),6,ry);for(const e of [-1,1]){B(...L(0,1.12,e*0.62),2.2,0.3,0.05,woodD,6,ry);B(...L(e*1.08,1.12,0),0.05,0.3,1.25,woodD,6,ry);}
  for(const e of [-1,1]){const hc=L(0,0.6,e*0.78),ax=[-s*e,0,c*e],n=16,R=0.6;cyl(sub(hc,mul(ax,0.08)),add(hc,mul(ax,0.08)),0.11,0.11,10,woodD,6,woodD,14);
    for(let k=0;k<n;k++){const a0=k/n*6.283,a1=(k+1)/n*6.283,P=a=>add(hc,add(mul([c,0,s],Math.cos(a)*R),[0,Math.sin(a)*R,0]));beam(P(a0),P(a1),ax,0.1,0.07,wood,6);}
    for(let k=0;k<8;k++){const a=k/8*6.283;beam(hc,add(hc,add(mul([c,0,s],Math.cos(a)*(R-0.05)),[0,Math.sin(a)*(R-0.05),0])),ax,0.045,0.04,wood,6);}}
  cyl(L(0,0.6,-0.85),L(0,0.6,0.85),0.05,0.05,8,iron,11);for(const e of [-1,1])beam(L(1.0,0.88,e*0.4),L(2.9,0.15,e*0.45),[0,1,0],0.08,0.07,wood,6);
  K.barrel(...L(-0.5,0,0).filter((v,i)=>i!==1),0.3,0.8,{y:0.95});K.barrel(...L(0.4,0,0.1).filter((v,i)=>i!==1),0.28,0.75,{y:0.95});}
// lamp post and hitching rail at the lane
{const lx=-1.6,lz=-11.2;cyl([lx,0,lz],[lx,0.3,lz],0.12,0.1,8,iron,11);cyl([lx,0.3,lz],[lx,2.7,lz],0.045,0.04,8,iron,11);beam([lx,2.6,lz],[lx+0.4,2.6,lz],[0,1,0],0.035,0.035,iron,11);
  B(lx+0.4,2.38,lz,0.22,0.3,0.22,[1,0.85,0.55],3);B(lx+0.4,2.56,lz,0.28,0.05,0.28,iron,11);B(lx+0.4,2.22,lz,0.24,0.03,0.24,iron,11);
  for(const x of [2.6,5.4])beam([x,0,-11.5],[x,1.0,-11.5],[1,0,0],0.13,0.13,woodD,6);beam([2.5,0.95,-11.5],[5.5,0.95,-11.5],[0,1,0],0.12,0.1,wood,6);cyl([4.0,0.95,-11.45],[4.0,0.55,-11.45],0.012,0.012,4,[0.62,0.54,0.4],0);}
// dry-stone wall along the right of the courtyard, capstones on top
{const wx=8.4,z0=-12.6,z1=-3.0,zc=(z0+z1)/2,hl=(z1-z0)/2;B(wx,0.4,zc,0.42,0.8,z1-z0,mortar,8);
  K.stones(K.face([wx+0.21,0,zc],[1,0,0],[0,0,1],hl),-hl,hl,0,0.8);K.stones(K.face([wx-0.21,0,zc],[-1,0,0],[0,0,-1],hl),-hl,hl,0,0.8);
  for(let z=z0;z<z1;z+=0.36)B(wx,0.86,z+0.18,0.55,0.12,0.33,pick(stonePal),8,rr(-0.06,0.06));for(let k=0;k<70;k++)tuft(wx+(rnd()<0.5?-0.3:0.3),rr(z0,z1),6,rr(0.15,0.35));}
// planting: flower bed under the big window, bushes at the corners, ivy, trees, grass
B(3.4,0.05,Z0-0.75,2.0,0.1,0.4,[0.33,0.23,0.15],10);for(let k=0;k<12;k++){const x=2.5+rnd()*1.8,z=Z0-0.82+rnd()*0.25;ico([x,0.13,z],rr(0.1,0.15),mix3([0.24,0.45,0.18],[0.35,0.58,0.24],rnd()),1,{detail:1,jit:0.25,sy:0.8});flower(x,0.1,z,C.flowers[k%6],rr(0.15,0.3));}
for(const [x,z,r,b] of [[5.6,-3.9,0.6,1],[-5.7,-3.9,0.5,0],[-5.75,2.6,0.75,1],[5.7,2.2,0.7,0],[-1.0,-6.9,0.4,1],[7.6,-2.3,0.8,0],[-8.2,-3.0,0.9,1]])K.bush(x,z,r,mix3([0.22,0.42,0.18],[0.3,0.52,0.22],rnd()),b?[[0.95,0.75,0.85],[0.98,0.96,0.92],[0.6,0.62,0.92]]:null);
K.ivy(WX0-0.02,WZ+0.4,-1,0,4.8,9);K.ivy(X0-1.07,0.8,-1,0,3.0,7);K.ivy(X1+0.02,-3.2,1,0,2.6,5);
for(const [x,z,s] of [[-9.5,3,1.4],[9.5,3.2,1.3],[-3,9.5,1.5],[4.5,9.8,1.4],[11.5,-6,1.2],[-12,-8,1.3],[0.5,12,1.6],[-8.8,8.5,1.2],[13,-1,1.4],[15,8,1.5],[10,14,1.3],[6,16,1.4],[17,-9,1.3]])K.tree(x,z,s,{apples:x<-9&&z>0});
const inYard=(x,z)=>x>-7.3&&x<8.1&&z>-12.9&&z<-3.6,inHouse=(x,z)=>(x>X0-1.15&&x<X1+0.1&&z>Z0-0.1&&z<Z1+0.1)||(x>WX0-0.1&&x<WX1+0.1&&z>WZ-0.5&&z<Z0);
K.grass(4200,-18,18,-12.8,16,(x,z)=>inYard(x,z)||inHouse(x,z)||(Math.hypot(x+6.6,z+9.6)<1.0));
for(let k=0;k<500;k++){const x=rr(X0-0.4,X1+0.4),z=rnd()<0.5?Z1+rr(0.05,0.3):rr(Z0,Z1);if(z<Z1&&Math.abs(Math.abs(x)-5.35)>0.15)continue;tuft(x,z,6,rr(0.15,0.32));}
for(let k=0;k<160;k++){const x=rr(-12,12),z=rr(-3,12);if(inHouse(x,z))continue;flower(x,0,z,rnd()<0.6?[0.98,0.97,0.94]:[0.99,0.85,0.25],rr(0.08,0.16));}
// weeds in the courtyard's edges
for(let k=0;k<260;k++){const x=rnd()<0.5?rr(-7.3,-6.6):rr(7.4,8.1),z=rr(-12.8,-3.7);tuft(x,z,4,rr(0.08,0.18),0.04);}
return{target:[-0.2,4.2,-3.6],dist:41,dir:[-0.6,0.52,-0.6],shadowC:[0,3,-3],shadowR:21,haze:[42,110]};};
