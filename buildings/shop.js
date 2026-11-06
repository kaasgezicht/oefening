// ===== buildings/shop.js — the merchant's shop (reference sheet #3): two storeys, jettied half-timbered upper floor on a fieldstone ground
// floor, blue-grey slate roof with a front dormer, tall stone chimney, an open shop front with counter and shelves under a red-and-white
// striped awning, a market stall with produce, crates, sacks, baskets and barrels, a hanging sign with scales, cobbled forecourt.
KIT.models.shop=function(K,opt){
const {box,B,beam,cyl,ico,quad,tri,fp,fb,tuft,flower,rnd,rr,pick}=K,{add,sub,mul,norm,rot,clamp,mix3}=K.v,C=K.C;
const timber=[0.3,0.2,0.13],plaster=[0.9,0.83,0.68],mortar=C.mortar,iron=C.iron,stonePal=C.stone,wood=[0.5,0.36,0.23],woodD=[0.4,0.28,0.18];
const slate={mat:18,pal:[[0.36,0.39,0.46],[0.32,0.35,0.42],[0.4,0.43,0.5],[0.3,0.32,0.37],[0.38,0.4,0.44]],exp:0.15,len:0.28,th:0.016,w:[0.2,0.3],wideP:0.05,phi:[0.05,0.08],gap:0.012,missing:0.006,fresh:[0.44,0.47,0.54],aged:[0.42,0.4,0.36],agedP:0.92,yaw:0.04};
const red=[0.78,0.16,0.14],cream=[0.95,0.9,0.8];
const X0=-4.2,X1=4.2,Z0=-3.0,Z1=3.0,H1=2.9,H2=5.5,SB=0.9,JET=0.35;
const G=K.walls(X0,X1,Z0,Z1),U=K.walls(X0,X1,Z0-JET,Z1);
B(0,(H1+H2)/2,-JET/2,X1-X0,H2-H1,Z1-Z0+JET,plaster,5,0,0.12);B(0,SB/2,0,X1-X0+0.02,SB,Z1-Z0+0.02,mortar,8,0,0.31);
// shop opening (front, u -3.3..1.0) and door (u 2.2)
const so0=-3.3,so1=1.0,doorU=2.3,ID=1.5;
B(0,H1/2,(Z0+ID+Z1)/2,X1-X0,H1,Z1-Z0-ID,plaster,5,0,0.11);B((X0+so0)/2,H1/2,Z0+ID/2,so0-X0,H1,ID,plaster,5,0,0.11);B((so1+X1)/2,H1/2,Z0+ID/2,X1-so1,H1,ID,plaster,5,0,0.11);
K.stones(G.front,X0-0.08,X1+0.08,0,SB,{skip:(u,y)=>(u>so0-0.05&&u<so1+0.05)||Math.abs(u-doorU)<0.6});K.stones(G.left,-3.08,3.08,0,SB);K.stones(G.right,-3.08,3.08,0,SB);K.stones(G.back,X0-0.08,X1+0.08,0,SB);
const T=(f,u0,y0,u1,y1,w)=>beam(fp(f,u0,y0,0.03),fp(f,u1,y1,0.03),f.n,0.08,w||0.13,timber,6);
const post=(f,u,y0,y1)=>fb(f,u,(y0+y1)/2,0.03,0.15,y1-y0,0.08,timber,6),rail=(f,u0,u1,y,h)=>fb(f,(u0+u1)/2,y,0.032,u1-u0,h||0.14,0.085,timber,6);
function frame(f,u0,u1,y0,y1,posts,braces){rail(f,u0,u1,y0+0.08,0.16);rail(f,u0,u1,y1-0.09,0.18);for(const u of posts)post(f,u,y0+0.12,y1-0.15);for(const [a,b] of braces||[])T(f,a,y0+0.16,b,y1-0.2);}
const xcross=(f,uc,w,y0,y1)=>{T(f,uc-w/2,y0,uc+w/2,y1,0.11);T(f,uc-w/2,y1,uc+w/2,y0,0.11);};
const win=(f,u,y0,w,h,o)=>K.win(f,u,y0,w,h,{cols:o&&o.cols||2,rows:2,box:o&&o.box,frame:timber});
// ---- open shop front: dark interior, shelves with jars and bolts of cloth, counter, heavy lintel
{const f=G.front;const back=K.face([0,0,Z0+ID],[0,0,-1],[1,0,0],4);fb(back,(so0+so1)/2,H1/2,0.004,so1-so0,H1,0.008,[0.2,0.15,0.11],6);B((so0+so1)/2,0.01,Z0+ID/2,so1-so0,0.02,ID,[0.3,0.22,0.15],12);B((so0+so1)/2,H1-0.02,Z0+ID/2,so1-so0,0.04,ID,[0.25,0.18,0.12],12);
  for(const y of [1.35,1.85,2.35]){fb(back,(so0+so1)/2,y,0.02,so1-so0-0.2,0.04,0.3,wood,6);for(let x=so0+0.25;x<so1-0.2;x+=rr(0.14,0.22)){const k=rnd();if(k<0.5)cyl(fp(back,x,y+0.02,0.15),fp(back,x,y+0.2,0.15),0.055,0.05,8,pick([[0.7,0.5,0.25],[0.3,0.5,0.6],[0.8,0.75,0.6],[0.5,0.25,0.18]]),0,[0.5,0.4,0.3],6,undefined,true);
      else fb(back,x,y+0.1,0.15,0.12,0.16,0.22,pick([[0.62,0.2,0.18],[0.25,0.38,0.55],[0.85,0.78,0.6],[0.3,0.48,0.3]]),6);}}
  B((so0+so1)/2,0.5,Z0-0.12,so1-so0-0.1,1.0,0.5,mix3(wood,woodD,0.5),6);B((so0+so1)/2,1.03,Z0-0.15,so1-so0,0.07,0.62,[0.55,0.4,0.26],6);
  for(let x=so0+0.2;x<so1-0.1;x+=0.32)fb(f,x,0.5,0.38,0.29,0.9,0.03,mix3(wood,woodD,rnd()),6);
  fb(f,(so0+so1)/2,H1-0.2,0.05,so1-so0+0.4,0.26,0.14,timber,6);for(const u of [so0-0.08,so1+0.08])fb(f,u,(SB+H1)/2,0.05,0.18,H1-SB,0.12,timber,6);
  // goods on the counter: baskets of apples, cheese, loaves, a scale
  const top=1.07;for(const [x,col,r] of [[-2.9,[0.85,0.18,0.14],0.06],[-2.35,[0.95,0.8,0.25],0.055],[0.55,[0.55,0.75,0.25],0.06]]){cyl([x,top,Z0-0.15],[x,top+0.14,Z0-0.15],0.17,0.22,10,[0.62,0.46,0.26],6,[0.5,0.36,0.2],6,undefined,true);
    for(let k=0;k<9;k++)ico([x+rr(-0.12,0.12),top+0.15+rr(0,0.06),Z0-0.15+rr(-0.12,0.12)],r,col.map(v=>v*rr(0.85,1.1)),0,{detail:1});}
  for(const x of [-1.7,-1.35])cyl([x,top,Z0-0.12],[x,top+0.14,Z0-0.12],0.14,0.14,14,[0.95,0.8,0.35],0,[0.97,0.85,0.45],0,undefined,true);
  for(let k=0;k<3;k++){const x=-0.75+k*0.25;ico([x,top+0.07,Z0-0.18],0.12,[0.78,0.55,0.28],0,{sy:0.55,detail:1});}
  cyl([0.05,top,Z0-0.2],[0.05,top+0.4,Z0-0.2],0.02,0.02,6,[0.8,0.62,0.3],11);beam([-0.18,top+0.4,Z0-0.2],[0.28,top+0.4,Z0-0.2],[0,1,0],0.02,0.02,[0.8,0.62,0.3],11);
  for(const x of [-0.18,0.28])cyl([x,top+0.22,Z0-0.2],[x,top+0.25,Z0-0.2],0.07,0.08,10,[0.8,0.62,0.3],11,[0.75,0.58,0.28],11,undefined,true);}
// door with a small window
{const f=G.front,dw=0.95,dh=2.05,yb=0.2;fb(f,doorU,yb+dh/2,0.004,dw+0.1,dh,0.008,[0.07,0.05,0.04],0);for(let k=0;k<4;k++)fb(f,doorU-dw/2+dw*(k+0.5)/4,yb+dh/2,0.03,dw/4-0.012,dh-0.02,0.045,mix3([0.3,0.36,0.46],[0.27,0.32,0.42],rnd()),6);
  fb(f,doorU,yb+1.55,0.055,0.4,0.3,0.01,C.glow,2);cyl(fp(f,doorU+0.33,yb+1.0,0.07),fp(f,doorU+0.33,yb+1.0,0.1),0.05,0.05,8,iron,11);
  for(const e of [-1,1])fb(f,doorU+e*(dw/2+0.07),yb+dh/2+0.05,0.06,0.14,dh+0.12,0.14,timber,6);fb(f,doorU,yb+dh+0.1,0.06,dw+0.36,0.16,0.14,timber,6);fb(f,doorU,0.1,0.35,1.3,0.2,0.5,pick(stonePal),8);}
frame(G.front,X0,X1,SB,H1,[-4.1,1.55,3.0,4.1],[[4.1,3.05]]);
frame(G.left,-3,3,SB,H1,[-2.9,-1.4,-0.3,1.4,2.9],[[-2.9,-1.45]]);win(G.left,0.65,1.2,0.9,1.1,{box:true});
frame(G.right,-3,3,SB,H1,[-2.9,-1.2,1.2,2.9],[]);win(G.right,0,1.2,0.9,1.1);frame(G.back,X0,X1,SB,H1,[-4.1,-2,0,2,4.1],[]);win(G.back,-1,1.2,0.9,1.1);
frame(U.front,X0,X1,H1,H2,[-4.1,-2.9,-1.8,-0.55,0.55,1.8,2.9,4.1],[[-4.1,-2.95],[4.1,2.95]]);for(const u of [-2.35,0,2.35]){win(U.front,u,H1+0.85,0.95,1.05,{box:true});xcross(U.front,u,0.95,H1+0.2,H1+0.73);}
frame(U.left,-3.35,3.0,H1,H2,[-3.25,-1.5,-0.3,1.5,2.9],[[2.9,1.55]]);win(U.left,-0.9,H1+0.85,0.9,1.05,{box:true});xcross(U.left,-0.9,0.9,H1+0.2,H1+0.73);
frame(U.right,-3.35,3.0,H1,H2,[-3.25,-1.2,1.2,2.9],[]);win(U.right,0,H1+0.85,0.9,1.05);frame(U.back,X0,X1,H1,H2,[-4.1,-2,0,2,4.1],[]);
{const f=U.front;fb(f,0,H1+0.12,0.05,X1-X0+0.1,0.24,0.12,timber,6);B(0,H1-0.025,Z0-JET/2,X1-X0,0.05,JET,[0.3,0.22,0.15],12);for(let x=X0+0.2;x<X1;x+=0.42)B(x,H1-0.11,Z0-JET/2-0.03,0.12,0.13,JET+0.1,timber,6);}
// ---- striped awning on iron rods and two front posts, scalloped valance
{const ax0=so0-0.35,ax1=so1+0.35,zw=Z0-0.02,zf=Z0-1.9,yw=2.55,yf=2.0,N=Math.round((ax1-ax0)/0.36),P=(x,t,o)=>{const sag=-0.07*Math.sin(Math.PI*t);return[x,yw+(yf-yw)*t+sag+(o||0),zw+(zf-zw)*t];};
  for(let k=0;k<N;k++){const xa=ax0+(ax1-ax0)*k/N,xb=ax0+(ax1-ax0)*(k+1)/N,col=k%2?cream:red;for(let j=0;j<4;j++)quad(P(xa,j/4),P(xb,j/4),P(xb,(j+1)/4),P(xa,(j+1)/4),null,col,6,0.3+k*0.01);
    const a=P(xa,1),b=P(xb,1),m=add(mul(add(a,b),0.5),[0,-0.24,0]);quad(a,b,add(b,[0,-0.14,0]),add(a,[0,-0.14,0]),null,col,6,0.5+k*0.01);tri(add(a,[0,-0.14,0]),add(b,[0,-0.14,0]),m,col,6);}
  for(const x of [ax0+0.05,ax1-0.05]){beam([x,0,zf+0.05],[x,yf-0.02,zf+0.05],[1,0,0],0.1,0.1,wood,6);beam([x,2.5,zw-0.02],[x,yf+0.08,zf+0.1],[1,0,0],0.03,0.03,iron,11);}
  beam([ax0,yf-0.02,zf+0.05],[ax1,yf-0.02,zf+0.05],[0,1,0],0.07,0.06,wood,6);}
// ---- market stall goods in front: crates of produce, sacks, barrels, baskets, a sandwich board
{const crate=(x,z,s,ry,fill,col)=>{K.crate(x,0,z,s,ry);if(fill==='ico')for(let k=0;k<14;k++)ico([x+rr(-s*0.35,s*0.35),s+0.02,z+rr(-s*0.35,s*0.35)],rr(0.055,0.07),col.map(v=>v*rr(0.85,1.12)),fill==='ico'&&col[1]>0.5?1:0,{detail:1});
    else if(fill==='carrot')for(let k=0;k<10;k++){const p=[x+rr(-s*0.35,s*0.35),s,z+rr(-s*0.35,s*0.35)];cyl(p,add(p,[rr(-0.1,0.1),0.05,rr(-0.1,0.1)]),0.03,0.01,6,[0.95,0.5,0.15],0);for(let j=0;j<3;j++)cyl(p,add(p,[rr(-0.05,0.05),0.14,rr(-0.05,0.05)]),0.008,0.003,4,[0.35,0.6,0.22],13);}};
  crate(-3.0,-5.3,0.5,0.1,'ico',[0.85,0.18,0.14]);crate(-2.42,-5.25,0.5,-0.05,'ico',[0.55,0.78,0.3]);crate(-1.85,-5.3,0.5,0.08,'carrot');crate(-2.7,-5.85,0.45,0.3,'ico',[0.95,0.75,0.2]);
  crate(0.45,-5.3,0.5,-0.1,'ico',[0.5,0.25,0.55]);crate(0.95,-5.6,0.45,0.25,'ico',[0.9,0.55,0.15]);
  for(const [x,z,c] of [[-0.9,-5.1,[0.8,0.68,0.48]],[-0.45,-5.25,[0.75,0.63,0.44]],[-0.68,-5.6,[0.82,0.7,0.5]]]){ico([x,0.3,z],0.28,c,6,{detail:1,sy:1.2,jit:0.08});cyl([x,0.62,z],[x,0.72,z],0.07,0.04,6,c.map(v=>v*0.9),6);}
  K.barrel(-4.0,-4.6,0.3,0.8);K.barrel(-3.75,-5.2,0.26,0.72);K.barrel(1.7,-4.9,0.3,0.82);for(let k=0;k<12;k++)ico([1.7+rr(-0.18,0.18),0.86,-4.9+rr(-0.18,0.18)],0.06,[0.85,0.2,0.15],0,{detail:1});
  for(const [x,z] of [[-1.3,-4.6],[2.9,-4.4]]){cyl([x,0,z],[x,0.28,z],0.2,0.26,12,[0.62,0.46,0.26],6,[0.5,0.36,0.2],6,undefined,true);for(let k=0;k<7;k++)ico([x+rr(-0.14,0.14),0.33,z+rr(-0.14,0.14)],0.07,pick(C.flowers),1,{detail:1});}
  // sandwich board with a chalked sign
  {const x=3.3,z=-5.6;for(const e of [-1,1]){const tp=[x,1.0,z],bt=[x,0,z+e*0.35];beam(tp,bt,[1,0,0],0.55,0.04,wood,6);}box([x,0.62,z-0.18],[0.22,0,0],[0,0.2,0.07],[0,-0.024,0.065],[0.12,0.13,0.12],0);for(let k=0;k<3;k++)box([x,0.7-k*0.09,z-0.215],[0.13-k*0.02,0,0],[0,0.012,0.004],[0,-0.003,0.01],[0.9,0.88,0.8],0);}}
// ---- hanging sign with scales, from the corner above the door
{const sx=X1-0.05,y=4.25,sz=Z0-JET;beam([sx,y,sz],[sx,y,sz-1.1],[1,0,0],0.05,0.06,iron,11);beam([sx,y-0.55,sz],[sx,y-0.02,sz-0.75],[1,0,0],0.04,0.04,iron,11);
  for(const z of [-0.4,-0.95])cyl([sx,y-0.02,sz+z],[sx,y-0.2,sz+z],0.01,0.01,4,iron,11);const cz=sz-0.68,cy=y-0.58;B(sx,cy,cz,0.06,0.66,0.9,[0.28,0.2,0.36],6);
  for(const e of [-1,1]){B(sx,cy+e*0.34,cz,0.08,0.05,0.95,[0.78,0.6,0.25],6);B(sx,cy,cz+e*0.47,0.08,0.72,0.05,[0.78,0.6,0.25],6);}
  for(const e of [-1,1]){const x=sx+e*0.045,g=[0.95,0.78,0.3];B(x,cy,cz,0.02,0.42,0.03,g,0);B(x,cy+0.18,cz,0.02,0.03,0.5,g,0);for(const s of [-1,1]){B(x,cy+0.06,cz+s*0.22,0.02,0.02,0.18,g,0);for(const s2 of [-1,1])beam([x,cy+0.18,cz+s*0.24],[x,cy+0.07,cz+s*0.24+s2*0.08],[1,0,0],0.02,0.012,g,0);}}}
// ---- roof: slate, a front dormer, chimney on the left gable
const chimSkip=P=>(P[0]<-4.05&&P[2]>-0.6&&P[2]<0.9);
const mr=K.roof({c:[0,-JET/2],dir:[1,0],halfLen:4.2,half:(Z1-Z0+JET)/2,H:H2,rise:4.3,ov:0.42,gov:0.38,th:0.14,sag:0.3,flare:0.22,nx:26,rafters:0.6,skip:chimSkip,cover:slate,mossClumps:18,ridgeMoss:0.15});
K.gableFan(mr,-1,plaster);K.gableFan(mr,1,plaster);
for(const e of [-1,1]){const f=e<0?U.left:U.right,uz=z=>f.t[2]*(z+JET/2),yU=z=>mr.under(e*4.2,z+JET/2)-0.04;rail(f,-3.35,3.35,H2+0.07,0.16);rail(f,uz(-1.8),uz(1.5),H2+2.0,0.15);
  for(const z of [-2.2,-1.0,1.0,2.2])if(!(e<0&&z>-0.7&&z<1.0))T(f,uz(z),H2+0.12,uz(z),yU(z),0.14);T(f,uz(-0.17),H2+2.05,uz(-0.17),yU(-0.17),0.14);K.win(f,uz(e<0?-1.6:-0.17),H2+0.6,0.65,0.8,{frame:timber,cols:2,rows:2});}
{const dx=0.0,zf=-2.7,Sl=mr.slope(-1),yb=mr.rp(Sl,dx,(zf+JET/2-Sl.A0[1])/Sl.a[1],0)[1]-0.25,yt=yb+1.45;B(dx,(yb+yt)/2,(zf-0.6)/2,1.7,yt-yb,-0.6-zf,plaster,5);
  const f=K.face([dx,0,zf],[0,0,-1],[1,0,0],0.85);for(const e of [-1,1])post(f,e*0.78,yb+0.05,yt-0.05);rail(f,-0.85,0.85,yt-0.08,0.14);K.win(f,0,yb+0.32,0.85,0.88,{frame:timber,cols:3,rows:2,box:true});
  const dr=K.roof({c:[dx,(zf-0.6)/2],dir:[0,-1],halfLen:(-0.6-zf)/2,half:0.85,H:yt,rise:1.0,ov:0.16,gov:0.24,th:0.1,sag:0.06,flare:0.06,nx:6,ends:[1],cover:slate,ridgeMoss:0});K.gableFan(dr,1,plaster);}
K.chimney({base:[X0-0.95,X0,-0.65,0.95],bt:2.4,stack:[X0-0.72,X0+0.03,-0.35,0.65],top:H2+4.3+1.4,lean:[-0.008,0.004],clad:['x-','z-','z+']});
// ---- grounds: cobbled forecourt, lane, side garden with picket fence, planting
B(0,-0.5,0,180,1.0,180,[0.42,0.56,0.27],9,0,0);
K.patch(-0.4,-6.4,6.4,3.4,[0.6,0.56,0.5],19,0.02,{n:48});
box([0,0.012,-11.6],[34,0,0],[0,0.012,0],[0,0,1.9],[0.6,0.5,0.37],17,0.5);for(let k=0;k<100;k++)ico([rr(-32,32),0.03,-11.6+rr(-1.9,1.9)],rr(0.04,0.1),pick(stonePal),0,{sy:0.45,jit:0.2});
for(let k=0;k<160;k++)tuft(rr(-32,32),-11.6+(rnd()<0.5?rr(-2.1,-1.6):rr(1.6,2.1)),6,rr(0.12,0.3));
// side garden on the right: white pickets, herbs and flowers, a bench
{const gx0=4.6,gx1=9.0,gz0=-5.6,gz1=2.5;for(let z=gz0;z<=gz1;z+=0.2){B(gx1,0.42,z,0.035,0.75,0.075,[0.92,0.9,0.85],0);oP(gx1,z);}for(let x=gx0+0.9;x<=gx1;x+=0.2){B(x,0.42,gz0,0.075,0.75,0.035,[0.92,0.9,0.85],0);oP(x,gz0);}
  function oP(x,z){K.cyl([x,0.8,z],[x,0.88,z],0.04,0.0,4,[0.92,0.9,0.85],0);}
  for(const y of [0.25,0.62]){B(gx1+0.03,y,(gz0+gz1)/2,0.03,0.06,gz1-gz0,[0.92,0.9,0.85],0);B((gx0+0.9+gx1)/2,y,gz0+0.03,gx1-gx0-0.9,0.06,0.03,[0.92,0.9,0.85],0);}
  K.patch(6.9,-1.6,1.6,3.3,[0.34,0.24,0.15],10,0.03,{n:30});for(let k=0;k<40;k++){const x=rr(5.6,8.2),z=rr(-4.6,1.6);ico([x,0.14,z],rr(0.1,0.18),mix3([0.24,0.45,0.18],[0.38,0.6,0.26],rnd()),1,{detail:1,jit:0.25,sy:0.8});if(k%2)flower(x,0.1,z,pick(C.flowers),rr(0.15,0.35));}
  for(const dz of [-0.1,0,0.1])B(5.0,0.46,1.6+dz,0.11,0.05,1.5,wood,6);for(const e of [-0.6,0.6])B(5.0,0.22,1.6+e,0.34,0.44,0.07,woodD,6);}
for(const [x,z,r,b] of [[-4.6,-3.5,0.5,1],[-5.4,3.0,0.8,0],[4.7,3.2,0.6,1],[-6.4,-1.8,0.7,1]])K.bush(x,z,r,mix3([0.22,0.42,0.18],[0.3,0.52,0.22],rnd()),b?[[0.95,0.75,0.85],[0.98,0.96,0.92],[0.6,0.62,0.92]]:null);
K.ivy(X0-0.97,-0.4,-1,0,2.6,6);K.ivy(X0-0.02,2.6,-1,0,3.5,6);
for(const [x,z,s,ap] of [[-9,2,1.4,0],[-4,8.5,1.5,1],[4,8,1.3,0],[10,5,1.4,1],[-11,-5,1.2,0],[12,-4,1.3,0],[0,13,1.6,0]])K.tree(x,z,s,{apples:!!ap});
const inHouse=(x,z)=>x>X0-1.1&&x<X1+0.1&&z>Z0-2.1&&z<Z1+0.1,inYard=(x,z)=>Math.hypot((x+0.4)/6.2,(z+6.4)/3.3)<1,inGarden=(x,z)=>x>4.5&&x<9.1&&z>-5.7&&z<2.6;
K.grass(3800,-17,17,-9.6,15,(x,z)=>inHouse(x,z)||inYard(x,z)||inGarden(x,z));
for(let k=0;k<130;k++){const x=rr(-12,12),z=rr(-9.4,12);if(inHouse(x,z)||inYard(x,z)||inGarden(x,z))continue;flower(x,0,z,rnd()<0.6?[0.98,0.97,0.94]:[0.99,0.85,0.25],rr(0.08,0.16));}
return{target:[-0.4,3.2,-2.6],dist:33,dir:[-0.6,0.5,-0.62],shadowC:[0,2.5,-2],shadowR:18,haze:[36,95]};};
