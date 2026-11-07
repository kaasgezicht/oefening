// ===== buildings/church.js — the village church (user's reference, Nov 2026): plastered nave on a sandstone plinth with sandstone quoins and
// round-arched stained-glass windows, a half-timbered front gable, a sandstone porch with a round-arched double door and steps, a side tower
// (plastered base, half-timbered belfry with louvres and clocks, onion dome, lantern, small onion, cross), slate roof, and a churchyard:
// gravestones, a box hedge, a low sandstone wall with pillars and an iron gate, gravel paths, flower beds, a lamp post, a bench and trees.
KIT.models.church=function(K,opt){
const {box,B,beam,cyl,ico,quad,tri,tuft,flower,fp,fb,rnd,rr,pick}=K,{add,sub,mul,norm,clamp,mix3,rot}=K.v;
const X0=-4.6,X1=4.6,Z0=-7,Z1=8,H=6.2,RISE=5.0,SB=0.6;
const plaster=[0.92,0.88,0.8],timber=[0.4,0.25,0.15],sand=[[0.78,0.6,0.42],[0.72,0.54,0.37],[0.8,0.64,0.46],[0.7,0.52,0.36],[0.76,0.58,0.4],[0.74,0.6,0.44]],sandC=[0.76,0.58,0.4],iron=K.C.iron;
const slate={mat:18,pal:[[0.3,0.32,0.37],[0.27,0.29,0.34],[0.34,0.36,0.41],[0.25,0.26,0.3],[0.32,0.33,0.36]],exp:0.15,len:0.28,th:0.016,w:[0.2,0.3],wideP:0.05,phi:[0.05,0.08],gap:0.012,missing:0.004,fresh:[0.4,0.42,0.48],aged:[0.4,0.38,0.34],agedP:0.94,yaw:0.04};
const F=K.walls(X0,X1,Z0,Z1);
// ---- round-arched window: stained glass (material 22), sandstone jambs, voussoirs with a keystone, sill
function archWin(f,u,y0,w,h,o){o=o||{};const r=w/2,ys=y0+h-r,dep=o.dep||0.16;
  fb(f,u,(y0+ys)/2,0.012,w,ys-y0,0.01,[0.2,0.2,0.25],22);const N=10;for(let k=0;k<N;k++){const a0=Math.PI*k/N,a1=Math.PI*(k+1)/N,P=a=>fp(f,u+Math.cos(a)*r,ys+Math.sin(a)*r,0.018),c=fp(f,u,ys,0.018);
    tri(c,P(a0),P(a1),[0.2,0.2,0.25],22,undefined,[[0,-1+2*(ys-y0)/(h)],[Math.cos(a0),1],[Math.cos(a1),1]],[r,h/2]);}
  for(let x=-r+0.02;x<r;x+=w/3)if(Math.abs(x)>0.05)fb(f,u+x+w/6-0.02,(y0+ys)/2,0.03,0.025,ys-y0,0.02,iron,11);
  for(const e of [-1,1]){let y=y0;let k=0;while(y<ys-0.05){const bh=Math.min(rr(0.26,0.36),ys-y),bw=k%2?0.22:0.34;fb(f,u+e*(r+bw/2-0.02),y+bh/2,0.03,bw,bh-0.02,dep,pick(sand),8);y+=bh;k++;}
    fb(f,u+e*(r+0.02),(y0+ys)/2,0.05,0.08,ys-y0,0.1,sandC,8);}
  const NV=o.nv||9,rv=r+0.14;for(let k=0;k<NV;k++){const a=Math.PI*(k+0.5)/NV,c=fp(f,u+Math.cos(a)*rv,ys+Math.sin(a)*rv,0.03),T=add(mul(f.t,-Math.sin(a)),[0,Math.cos(a),0]),Rd=add(mul(f.t,Math.cos(a)),[0,Math.sin(a),0]),kst=k===(NV>>1);
    box(c,mul(T,Math.PI*rv/NV/2-0.012),mul(Rd,(kst?0.2:0.15)),mul(f.n,dep/2+(kst?0.03:0)),pick(sand),8);}
  fb(f,u,y0-0.07,0.08,w+0.34,0.14,dep+0.16,sandC,8);}
// ---- walls: plaster over a sandstone plinth, quoins at every corner
B((X0+X1)/2,H/2,(Z0+Z1)/2,X1-X0,H,Z1-Z0,plaster,5,0,0.11);
for(const f of [F.front,F.back,F.left,F.right]){K.stones(f,-f.half-0.06,f.half+0.06,0,SB,{pal:sand,h:[0.22,0.3],l:[0.4,0.7],skip:f===F.front?((u,y)=>Math.abs(u)<1.9):null});fb(f,0,SB+0.05,0.05,f.half*2+0.12,0.1,0.14,sandC,8);}
function quoins(f,e,y0,y1){for(let y=y0,k=0;y<y1-0.1;y+=0.4,k++){const l=k%2?0.32:0.58,h=Math.min(0.38,y1-y);fb(f,e*(f.half-l/2+0.05),y+h/2,0.03,l,h-0.02,0.12,pick(sand),8);}}
for(const f of [F.front,F.back,F.left,F.right])for(const e of [-1,1])quoins(f,e,SB+0.1,H);
fb(F.left,0,H-0.12,0.04,F.left.half*2+0.1,0.24,0.18,sandC,8);fb(F.right,0,H-0.12,0.04,F.right.half*2+0.1,0.24,0.18,sandC,8);
// ---- windows: three tall arched ones on the left wall, two on the right (the tower takes the front bay), one in the chancel wall, two flanking the porch
for(const z of [-3.6,0.6,4.6])archWin(F.left,-z,2.0,1.15,3.0);for(const z of [0.6,4.6])archWin(F.right,z,2.0,1.15,3.0);archWin(F.back,0,2.2,1.4,3.3,{nv:11});
for(const x of [-3.0,3.0])archWin(F.front,x,2.4,0.8,1.8,{nv:7});
// ---- slate roof over the nave (ridge along z), half-timbered front gable, plastered back gable with a round window
const rf=K.roof({c:[0,(Z0+Z1)/2],dir:[0,1],halfLen:(Z1-Z0)/2,half:(X1-X0)/2,H,rise:RISE,ov:0.45,gov:0.4,th:0.16,sag:0.22,flare:0.16,nx:30,cover:slate,mossClumps:30,ridgeMoss:0.12,phase:1.3});
for(const e of [-1,1]){K.gableFan(rf,e,plaster);}
{const f=F.front,uE=-rf.hl,yU=x=>rf.under(uE,-x)-0.04;
  for(const y of [H+0.05,H+1.75,H+3.35])if(y<H+RISE-0.6){const w=(1-(y-H)/RISE)*(X1-X0);fb(f,0,y,0.04,w+0.1,0.2,0.12,timber,6);}
  const posts=[-3.6,-2.3,-0.95,0.95,2.3,3.6];for(const x of posts){const top=yU(x);if(top>H+0.3)beam(fp(f,x,H+0.1,0.04),fp(f,x,top,0.04),f.n,0.16,0.12,timber,6);}
  for(const [a,b] of [[-3.6,-2.3],[2.3,3.6]]){beam(fp(f,a,H+0.15,0.03),fp(f,b,H+1.7,0.03),f.n,0.12,0.1,timber,6);beam(fp(f,b,H+0.15,0.03),fp(f,a,H+1.7,0.03),f.n,0.12,0.1,timber,6);}
  for(const [a,b] of [[-2.3,-0.95],[2.3,0.95]]){beam(fp(f,a,H+1.8,0.03),fp(f,b,H+3.3,0.03),f.n,0.12,0.1,timber,6);}
  for(const e of [-1,1])beam(fp(f,e*0.95,H+3.4,0.03),fp(f,0,yU(0)-0.05,0.03),f.n,0.12,0.1,timber,6);
  archWin(f,0,H+0.4,0.7,1.15,{nv:7,dep:0.12});for(const e of [-1,1])archWin(f,e*1.62,H+0.45,0.5,0.95,{nv:5,dep:0.1});}
{const f=F.back;const c=fp(f,0,H+2.0,0.03);cyl(c,fp(f,0,H+2.0,0.0),0.62,0.62,20,[0.2,0.2,0.25],22,[0.2,0.2,0.25],22);for(let k=0;k<12;k++){const a=k/12*Math.PI*2;box(fp(f,Math.cos(a)*0.74,H+2.0+Math.sin(a)*0.74,0.05),mul(add(mul(f.t,-Math.sin(a)),[0,Math.cos(a),0]),0.19),mul(add(mul(f.t,Math.cos(a)),[0,Math.sin(a),0]),0.12),mul(f.n,0.09),pick(sand),8);}}
// ---- sandstone porch with a gable, round-arched double door, steps and a lamp
{const px0=-1.9,px1=1.9,pz0=-8.9,ph=3.7;const PF=K.walls(px0,px1,pz0,Z0);
  for(const f of [PF.front,PF.left,PF.right])K.stones(f,-f.half-0.04,f.half+0.04,0,ph,{pal:sand,h:[0.26,0.36],l:[0.35,0.7],skip:f===PF.front?((u,y)=>Math.abs(u)<0.95&&y<2.95):null});
  B(0,ph/2,(pz0+Z0)/2,px1-px0-0.1,ph,Z0-pz0-0.1,sandC,8);
  const f=PF.front,dw=1.5,dh=2.25,r=dw/2;fb(f,0,dh/2+0.3,-0.25,dw,dh,0.04,[0.06,0.05,0.04],0);
  for(const e of [-1,1])for(let k=0;k<5;k++)fb(f,e*(dw/4+0.005)-dw/4+dw*(k+0.5)/10*(e<0?1:1)+(e>0?dw/2:0),0.3+dh/2,-0.2,dw/10-0.01,dh-0.02,0.06,mix3([0.42,0.27,0.16],[0.5,0.32,0.2],rnd()),6);
  for(let k=0;k<8;k++){const a0=Math.PI*k/8,a1=Math.PI*(k+1)/8,P=a=>fp(f,Math.cos(a)*r,0.3+dh+Math.sin(a)*r,-0.2);tri(fp(f,0,0.3+dh,-0.2),P(a0),P(a1),[0.46,0.3,0.18],6);}
  for(const y of [0.9,2.0])fb(f,0,y,-0.16,dw-0.1,0.07,0.02,iron,11);for(const e of [-1,1])cyl(fp(f,e*0.18,1.45,-0.15),fp(f,e*0.18,1.45,-0.08),0.09,0.09,10,iron,11);
  const rv=r+0.2;for(let k=0;k<11;k++){const a=Math.PI*(k+0.5)/11,c=fp(f,Math.cos(a)*rv,0.3+dh+Math.sin(a)*rv,0.05),T=add(mul(f.t,-Math.sin(a)),[0,Math.cos(a),0]),Rd=add(mul(f.t,Math.cos(a)),[0,Math.sin(a),0]);box(c,mul(T,0.11),mul(Rd,0.2),mul(f.n,0.12),pick(sand),8);}
  for(const e of [-1,1]){fb(f,e*(r+0.12),(0.3+dh)/2+0.15,0.05,0.24,dh,0.24,sandC,8);fb(f,e*(r+0.12),0.3+dh+0.06,0.1,0.34,0.12,0.3,sandC,8);}
  for(let k=0;k<3;k++)fb(f,0,0.1+k*0.1,0.25+(2-k)*0.32,dw+1.0-k*0.2,0.2+k*0.0,0.36+(2-k)*0.0,pick(sand),8);
  const pr=K.roof({c:[0,(pz0+Z0)/2-0.2],dir:[0,1],halfLen:(Z0-pz0)/2+0.2,half:(px1-px0)/2,H:ph,rise:1.5,ov:0.3,gov:0.3,th:0.12,sag:0.06,flare:0.06,nx:8,ends:[-1],cover:slate,ridgeMoss:0});
  {const u=-pr.hl,Nn=8,P=[];for(let k=0;k<=Nn;k++){const w=-pr.half+2*pr.half*k/Nn,y=Math.min(pr.under(u,w),ph+1.5)-0.02;P.push(pr.W2(u-0.02,y,w));}const cen=pr.W2(u-0.02,ph+0.4,0);for(let k=0;k<Nn;k++)tri(P[k],P[k+1],cen,sandC,8,0.4);
    tri(pr.W2(u-0.02,ph,-pr.half),P[0],cen,sandC,8,0.4);tri(P[Nn],pr.W2(u-0.02,ph,pr.half),cen,sandC,8,0.4);tri(pr.W2(u-0.02,ph,pr.half),pr.W2(u-0.02,ph,-pr.half),cen,sandC,8,0.4);
    cyl(pr.W2(u-0.08,ph+0.8,0),pr.W2(u+0.02,ph+0.8,0),0.22,0.22,12,sandC,8,sandC,8);}
  cyl(fp(f,1.6,2.8,0.08),fp(f,1.6,2.8,0.35),0.03,0.03,6,iron,11);B(fp(f,1.6,0,0.35)[0],2.55,fp(f,1.6,0,0.35)[2],0.22,0.32,0.22,[1,0.85,0.55],3);}
// ---- tower on the right front corner: plastered base, half-timbered belfry, clocks, onion dome, lantern, small onion, cross
{const tx0=X1,tx1=X1+4.1,tz0=Z0+0.4,tz1=Z0+4.5,TH1=9.0,TH2=15.4,tc=[(tx0+tx1)/2,(tz0+tz1)/2],hw=(tx1-tx0)/2;const TF=K.walls(tx0,tx1,tz0,tz1);
  B(tc[0],TH2/2,tc[1],tx1-tx0,TH2,tz1-tz0,plaster,5,0,0.21);
  for(const f of [TF.front,TF.back,TF.right]){K.stones(f,-f.half-0.06,f.half+0.06,0,SB+0.1,{pal:sand,h:[0.22,0.3],l:[0.4,0.7]});for(const e of [-1,1])quoins(f,e,SB+0.1,TH1);}
  for(const f of [TF.front,TF.right]){archWin(f,0,3.2,0.55,1.3,{nv:5,dep:0.12});}
  for(const f of [TF.front,TF.back,TF.left,TF.right])fb(f,0,TH1+0.1,0.06,f.half*2+0.2,0.24,0.2,sandC,8);
  // half-timbered belfry: sill, posts, rails, braces, louvred arched opening, clock
  for(const f of [TF.front,TF.back,TF.left,TF.right]){fb(f,0,TH1+0.32,0.06,f.half*2+0.04,0.2,0.12,timber,6);fb(f,0,TH2-0.12,0.06,f.half*2+0.04,0.22,0.12,timber,6);fb(f,0,TH1+2.6,0.05,f.half*2,0.16,0.1,timber,6);
    for(const x of [-hw+0.08,-0.95,0.95,hw-0.08])beam(fp(f,x,TH1+0.4,0.05),fp(f,x,TH2-0.2,0.05),f.n,0.17,0.12,timber,6);
    for(const e of [-1,1]){beam(fp(f,e*(hw-0.1),TH1+0.45,0.04),fp(f,e*0.97,TH1+2.5,0.04),f.n,0.12,0.1,timber,6);beam(fp(f,e*(hw-0.1),TH1+2.7,0.04),fp(f,e*0.97,TH2-0.25,0.04),f.n,0.12,0.1,timber,6);}
    const yb=TH1+2.95,ow=1.0,oh=2.0,r=ow/2;fb(f,0,yb+(oh-r)/2,-0.1,ow,oh-r,0.04,[0.07,0.06,0.06],0);for(let k=0;k<8;k++){const a0=Math.PI*k/8,a1=Math.PI*(k+1)/8,P=a=>fp(f,Math.cos(a)*r,yb+oh-r+Math.sin(a)*r,-0.1);tri(fp(f,0,yb+oh-r,-0.1),P(a0),P(a1),[0.07,0.06,0.06],0);}
    for(let y=yb+0.15;y<yb+oh-r;y+=0.17)box(fp(f,0,y,-0.02),mul(f.t,ow/2-0.02),norm(add([0,0.06,0],mul(f.n,0.03))),mul(norm(add(mul(f.n,1),[0,-0.5,0])),0.06),[0.44,0.32,0.22],6);
    for(const e of [-1,1])fb(f,e*(r+0.05),yb+(oh-r)/2,0.03,0.1,oh-r,0.14,timber,6);
    if(f!==TF.left&&f!==TF.back){const cc=fp(f,0,TH1+1.45,0.1);cyl(cc,fp(f,0,TH1+1.45,0.16),0.62,0.62,24,[0.93,0.9,0.82],0,[0.93,0.9,0.82],0);cyl(fp(f,0,TH1+1.45,0.09),fp(f,0,TH1+1.45,0.15),0.7,0.7,24,[0.2,0.18,0.16],11);
      for(let k=0;k<12;k++){const a=k/12*Math.PI*2;fb(f,Math.cos(a)*0.5,TH1+1.45+Math.sin(a)*0.5,0.17,0.05,0.12,0.01,[0.12,0.1,0.08],0);}
      beam(fp(f,0,TH1+1.45,0.18),fp(f,0.06,TH1+1.85,0.18),f.n,0.05,0.015,[0.1,0.08,0.06],11);beam(fp(f,0,TH1+1.45,0.185),fp(f,0.3,TH1+1.3,0.185),f.n,0.06,0.015,[0.1,0.08,0.06],11);}}
  // hipped slate skirt from the square top to the round drum, then the onion, lantern, small onion and spire
  const y0=TH2+0.05,y1=TH2+1.7,o=0.35,ri=1.15,sq=[[-1,-1],[1,-1],[1,1],[-1,1]];for(let k=0;k<4;k++){const a=sq[k],b=sq[(k+1)%4],P=(s,y,h)=>[tc[0]+s[0]*h,y,tc[1]+s[1]*h];
    quad(P(a,y0,hw+o),P(b,y0,hw+o),P(b,y1,ri),P(a,y1,ri),null,[0.3,0.31,0.35],18,0.6);beam(P(a,y0-0.02,hw+o),P(b,y0-0.02,hw+o),[0,1,0],0.12,0.2,timber,6);}
  const prof=[[y1-0.05,1.12],[y1+0.3,1.36],[y1+0.75,1.55],[y1+1.2,1.5],[y1+1.65,1.18],[y1+2.05,0.72],[y1+2.4,0.36],[y1+2.6,0.22]];const cop=[0.4,0.28,0.2];
  for(let k=0;k<prof.length-1;k++)cyl([tc[0],prof[k][0],tc[1]],[tc[0],prof[k+1][0],tc[1]],prof[k][1],prof[k+1][1],20,mix3(cop,[0.34,0.25,0.18],k/7),11,null,0,undefined,true);
  for(let j=0;j<10;j++){const a=j/10*Math.PI*2;for(let k=0;k<prof.length-1;k++)beam([tc[0]+Math.cos(a)*(prof[k][1]+0.02),prof[k][0],tc[1]+Math.sin(a)*(prof[k][1]+0.02)],[tc[0]+Math.cos(a)*(prof[k+1][1]+0.02),prof[k+1][0],tc[1]+Math.sin(a)*(prof[k+1][1]+0.02)],[-Math.sin(a),0,Math.cos(a)],0.06,0.05,[0.3,0.22,0.16],11);}
  const yl=y1+2.6;for(let k=0;k<6;k++){const a=k/6*Math.PI*2;cyl([tc[0]+Math.cos(a)*0.38,yl,tc[1]+Math.sin(a)*0.38],[tc[0]+Math.cos(a)*0.38,yl+0.75,tc[1]+Math.sin(a)*0.38],0.05,0.05,6,timber,6);}
  cyl([tc[0],yl,tc[1]],[tc[0],yl+0.08,tc[1]],0.5,0.5,12,cop,11,cop,11);cyl([tc[0],yl+0.75,tc[1]],[tc[0],yl+0.85,tc[1]],0.52,0.52,12,cop,11,cop,11);
  const p2=[[yl+0.85,0.42],[yl+1.05,0.52],[yl+1.3,0.48],[yl+1.55,0.28],[yl+1.75,0.1]];for(let k=0;k<p2.length-1;k++)cyl([tc[0],p2[k][0],tc[1]],[tc[0],p2[k+1][0],tc[1]],p2[k][1],p2[k+1][1],14,cop,11,null,0,undefined,true);
  const ys=yl+1.75;cyl([tc[0],ys,tc[1]],[tc[0],ys+1.3,tc[1]],0.04,0.03,6,[0.55,0.45,0.25],11);ico([tc[0],ys+0.35,tc[1]],0.13,[0.72,0.58,0.26],11,{detail:1});
  B(tc[0],ys+1.15,tc[1],0.05,0.7,0.05,[0.6,0.5,0.28],11);B(tc[0],ys+1.25,tc[1],0.42,0.05,0.05,[0.6,0.5,0.28],11);B(tc[0],ys+1.5,tc[1],0.34,0.14,0.03,[0.6,0.5,0.28],11);}
// ================= churchyard =================
B(0,-0.5,0,160,1.0,160,[0.42,0.56,0.27],9,0,0);
const PX0=-12.4,PX1=12.4,PZ0=-14.2,PZ1=12.4;
// gravel paths: gate to porch, round the church
K.patch(0,-11.2,1.5,3.6,[0.6,0.55,0.46],17,0.012);for(const [x,z,rx,rz] of [[-6.1,0.5,1.1,8.2],[6.1,3.8,1.1,5.4],[0,10.2,6.4,1.1],[0,-9.6,6.2,1.0]])K.patch(x,z,rx,rz,[0.58,0.53,0.45],17,0.011);
// low sandstone wall along the front with two pillars, ball finials and an open iron gate; box hedge round the other sides
{const wz=PZ0+0.4;for(const [a,b] of [[PX0,-1.3],[1.3,PX1]]){const f=K.face([(a+b)/2,0,wz],[0,0,-1],[1,0,0],(b-a)/2);K.stones(f,-f.half,f.half,0,0.75,{pal:sand,h:[0.2,0.28],l:[0.35,0.6]});B((a+b)/2,0.37,wz+0.18,b-a,0.74,0.34,sandC,8);
    for(let x=a;x<b;x+=0.6)B(x+0.3,0.81,wz+0.18,0.58,0.12,0.44,pick(sand),8);}
  for(const e of [-1,1]){B(e*1.45,0.75,wz+0.18,0.55,1.5,0.55,sandC,8);B(e*1.45,1.55,wz+0.18,0.65,0.12,0.65,pick(sand),8);ico([e*1.45,1.78,wz+0.18],0.2,pick(sand),8,{detail:1});
    const hx=e*1.15,a=e<0?-0.6:Math.PI+0.6,d=[Math.cos(a),0,Math.sin(a)];for(const y of [0.2,1.2])beam([hx,y,wz+0.18],add([hx,y,wz+0.18],mul(d,1.05)),[0,1,0],0.04,0.04,iron,11);
    for(let k=0;k<=7;k++){const p=add([hx,0,wz+0.18],mul(d,0.05+k*0.14));cyl(p,add(p,[0,1.3+Math.sin(k/7*Math.PI)*0.12,0]),0.012,0.012,4,iron,11);}}
  for(const [x0,z0,x1,z1] of [[PX0,wz+0.6,PX0,PZ1],[PX1,wz+0.6,PX1,PZ1],[PX0,PZ1,PX1,PZ1]]){const L=Math.hypot(x1-x0,z1-z0),n=Math.ceil(L/0.55);
    for(let k=0;k<=n;k++){const t=k/n,x=x0+(x1-x0)*t,z=z0+(z1-z0)*t;ico([x,0.62,z],rr(0.5,0.6),mix3([0.16,0.32,0.14],[0.22,0.4,0.17],rnd()),1,{detail:1,sy:1.3,jit:0.12});}}}
// gravestones: rows either side of the path, some leaning; crosses; moss
{const stone=[[0.62,0.6,0.56],[0.55,0.54,0.52],[0.7,0.66,0.6],[0.48,0.47,0.46],[0.74,0.62,0.48]];
  for(const side of [-1,1])for(let row=0;row<4;row++)for(let k=0;k<3;k++){const x=side*(3.3+k*1.45)+rr(-0.15,0.15),z=-12.0+row*1.6+rr(-0.1,0.1);if(side>0&&x>4.2&&z>-6.9)continue;
    const c=pick(stone),tilt=rr(-0.08,0.08),w=rr(0.45,0.65),h=rr(0.6,1.05),ty=rnd();const up=rot([0,1,0],[1,0,0],tilt);
    if(ty<0.22){beam([x,0,z],add([x,0,z],mul(up,h+0.25)),[1,0,0],0.12,0.1,c,8);beam(add([x-0.28,0,z],mul(up,h-0.05)),add([x+0.28,0,z],mul(up,h-0.05)),[0,1,0],0.12,0.1,c,8);}
    else{box(add([x,0,z],mul(up,h/2)),[w/2,0,0],mul(up,h/2),rot([0,0,0.07],[1,0,0],tilt),c,8);cyl(add([x,0,z+tilt*h],mul(up,h)),add([x,0,z+tilt*h],mul(up,h-0.001)),w/2,w/2,10,c,8);
      cyl(add([x,h,z+tilt*h],[0,0,-0.07]),add([x,h,z+tilt*h],[0,0,0.07]),w/2,w/2,10,c,8,c,8);}
    B(x,0.04,z+0.65,w+0.2,0.08,1.1,mix3([0.3,0.24,0.17],[0.36,0.3,0.22],rnd()),10);if(rnd()<0.6)for(let j=0;j<3;j++)flower(x+rr(-0.25,0.25),0.06,z+rr(0.3,1.0),pick(K.C.flowers),rr(0.12,0.22));
    if(rnd()<0.5)ico([x+rr(-0.2,0.2),h*0.9,z+tilt*h],rr(0.05,0.09),[0.3,0.42,0.16],1,{sy:0.5,jit:0.3});}}
// flower beds either side of the gate, chrysanthemums and hostas
for(const e of [-1,1]){K.patch(e*5.5,-12.7,3.4,0.8,[0.34,0.24,0.16],10,0.02);for(let k=0;k<26;k++){const x=e*5.5+rr(-3,3),z=-12.7+rr(-0.55,0.55);if(rnd()<0.6){ico([x,0.2,z],rr(0.16,0.24),pick([[0.95,0.75,0.2],[0.85,0.3,0.25],[0.95,0.92,0.85],[0.7,0.3,0.55],[0.98,0.55,0.2]]),1,{detail:1,sy:0.8,jit:0.25});}
    else ico([x,0.16,z],rr(0.18,0.26),mix3([0.35,0.5,0.22],[0.55,0.65,0.3],rnd()),1,{detail:1,sy:0.6,jit:0.3});}}
// lamp post by the gate, a bench, a thuja and trees
{const lx=2.3,lz=-12.9;cyl([lx,0,lz],[lx,0.25,lz],0.14,0.12,8,iron,11);cyl([lx,0.25,lz],[lx,2.9,lz],0.05,0.04,8,iron,11);B(lx,3.1,lz,0.26,0.36,0.26,[1,0.86,0.55],3);cyl([lx,3.28,lz],[lx,3.45,lz],0.22,0.02,4,iron,11);
  for(const e of [-1,1])for(const e2 of [-1,1])B(lx+e*0.13,3.1,lz+e2*0.13,0.03,0.38,0.03,iron,11);}
{const x=-9.2,z=-9.6;for(const dz of [-0.12,0,0.12])B(x,0.46,z+dz,1.7,0.05,0.11,[0.5,0.38,0.26],6);for(const dy of [0.72,0.86])B(x,dy,z+0.24,1.7,0.1,0.04,[0.48,0.36,0.25],6);for(const e of [-0.75,0.75])B(x+e,0.23,z,0.07,0.46,0.4,iron,11);}
for(const [x,z] of [[-10.6,-3.2],[10.6,-1.5]]){for(let k=0;k<6;k++)ico([x,0.7+k*0.62,z],0.7-k*0.09,mix3([0.12,0.28,0.14],[0.18,0.34,0.16],rnd()),1,{detail:1,sy:1.2,jit:0.15});}
K.tree(-10.2,8.8,1.25);K.tree(10.0,9.4,1.1);K.tree(9.6,-9.2,1.0);
for(let k=0;k<160;k++){const x=rr(PX0+0.6,PX1-0.6),z=rr(PZ0+0.8,PZ1-0.6);if(x>X0-0.6&&x<X1+4.6&&z>Z0-2.4&&z<Z1+0.6)continue;tuft(x,z,5,rr(0.1,0.24));}
return{target:[1.5,6.0,-2.0],dist:52,dir:[-0.62,0.42,-0.66],shadowC:[1,5,-1],shadowR:26,haze:[60,150]};};
