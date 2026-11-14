'use strict';
// ===== buildings/farmhouse.js — the farmhouse (reference sheet #5): two-storey half-timbered house on a fieldstone base with a long
// bendy wood-shingle roof and a covered veranda, an attached plank barn (big doors, one open on the hay; hayloft with pulley),
// an open lean-to shed with firewood and a cart, a fenced vegetable garden with a scarecrow, a farmyard with chickens, hay bales,
// a trough and a wheelbarrow, split-rail fences, fruit trees.
KIT.models.farmhouse=function(K,opt){
const {box,B,beam,cyl,ico,quad,tri,fp,fb,tuft,flower,rnd,rr,pick}=K,{add,sub,mul,norm,rot,clamp,mix3}=K.v,C=K.C;
const timber=[0.33,0.22,0.14],plaster=[0.88,0.8,0.64],mortar=C.mortar,iron=C.iron,stonePal=C.stone,wood=[0.5,0.36,0.23],woodD=[0.4,0.28,0.18],barnA=[0.46,0.33,0.22],barnB=[0.38,0.27,0.18],straw=[0.86,0.72,0.42];
const shing={pal:[[0.6,0.43,0.28],[0.54,0.39,0.26],[0.66,0.48,0.31],[0.5,0.37,0.26],[0.58,0.46,0.34]]};
// ---------------- house
const X0=-4.5,X1=4.5,Z0=-3.25,Z1=3.25,H1=2.9,H2=5.4,SB=0.95;
const G=K.walls(X0,X1,Z0,Z1),U=K.walls(X0,X1,Z0,Z1);
B(0,H2/2,0,X1-X0,H2,Z1-Z0,plaster,5,0,0.11);B(0,SB/2,0,X1-X0+0.02,SB,Z1-Z0+0.02,mortar,8,0,0.31);
const doorU=0.3;K.stones(G.front,-4.58,4.58,0,SB,{skip:(u,y)=>Math.abs(u-doorU)<0.62});K.stones(G.right,-3.3,3.3,0,SB);K.stones(G.back,-4.58,4.58,0,SB);
for(const f of [G.front,G.back])for(const e of [-1,1])for(let y=SB,k=0;y<H1-0.2;y+=0.33,k++){const l=k%2?0.55:0.32;fb(f,e*(f.half-l/2+0.04),y+0.155,0.035,l,0.29,0.12,stonePal[k%6],8);}
const T=(f,u0,y0,u1,y1,w)=>beam(fp(f,u0,y0,0.03),fp(f,u1,y1,0.03),f.n,0.08,w||0.13,timber,6);
const post=(f,u,y0,y1)=>fb(f,u,(y0+y1)/2,0.03,0.15,y1-y0,0.08,timber,6),rail=(f,u0,u1,y,h)=>fb(f,(u0+u1)/2,y,0.032,u1-u0,h||0.14,0.085,timber,6);
function frame(f,u0,u1,y0,y1,posts,braces){rail(f,u0,u1,y0+0.08,0.16);rail(f,u0,u1,y1-0.09,0.18);for(const u of posts)post(f,u,y0+0.12,y1-0.15);for(const [a,b] of braces||[])T(f,a,y0+0.16,b,y1-0.2);}
const win=(f,u,y0,w,h,o)=>K.win(f,u,y0,w,h,{cols:2,rows:2,box:o&&o.box,frame:timber});
frame(G.front,X0,X1,SB,H1,[-4.0,-2.9,-1.65,-0.35,0.95,1.75,2.9,4.0],[[-4.0,-2.95]]);win(G.front,-2.3,1.2,0.95,1.1);win(G.front,2.35,1.2,0.95,1.1);
frame(G.right,Z0,Z1,SB,H1,[-3.15,-1.6,-0.4,0.4,1.6,3.15],[[-3.15,-1.65]]);win(G.right,-1.0,1.2,0.9,1.1,{box:true});win(G.right,1.0,1.2,0.9,1.1,{box:true});
frame(G.back,X0,X1,SB,H1,[-4.4,-2,0,2,4.4],[]);win(G.back,-1,1.2,0.9,1.1);
frame(U.front,X0,X1,H1,H2,[-4.4,-3.1,-1.9,-0.6,0.6,1.9,3.1,4.4],[[-4.4,-3.15],[4.4,3.15]]);for(const u of [-2.5,0,2.5])win(U.front,u,H1+0.8,0.95,1.05,{box:true});
for(const u of [-1.25,1.25])T(U.front,u-0.55,H1+0.2,u+0.55,H1+0.68,0.11),T(U.front,u-0.55,H1+0.68,u+0.55,H1+0.2,0.11);
frame(U.right,Z0,Z1,H1,H2,[-3.15,-1.6,-0.45,0.45,1.6,3.15],[[-3.15,-1.65],[3.15,1.65]]);win(U.right,0,H1+0.8,0.9,1.05,{box:true});
frame(U.back,X0,X1,H1,H2,[-4.4,-2,0,2,4.4],[]);frame(U.left,Z0,Z1,H1,H2,[-3.15,-1,1,3.15],[]);win(U.left,0,H1+0.85,0.8,0.95);
// door
{const f=G.front,u=doorU,dw=1.0,dh=2.1,yb=0.32;fb(f,u,yb+dh/2,0.004,dw+0.1,dh,0.008,[0.07,0.05,0.04],0);for(let k=0;k<5;k++)fb(f,u-dw/2+dw*(k+0.5)/5,yb+dh/2,0.03,dw/5-0.012,dh-0.02,0.045,mix3([0.36,0.42,0.3],[0.32,0.38,0.27],rnd()),6);
  T(f,u-0.4,yb+0.3,u+0.4,yb+1.7,0.1);for(const y of [yb+0.3,yb+1.75])fb(f,u,y,0.06,dw-0.08,0.1,0.02,[0.3,0.36,0.25],6);cyl(fp(f,u+0.33,yb+1.0,0.07),fp(f,u+0.33,yb+1.0,0.1),0.05,0.05,8,iron,11);
  for(const e of [-1,1])fb(f,u+e*(dw/2+0.07),yb+dh/2+0.05,0.06,0.14,dh+0.12,0.14,timber,6);fb(f,u,yb+dh+0.1,0.06,dw+0.36,0.16,0.14,timber,6);}
// veranda: decking on stone footings, posts with knee braces, lean-to shingle roof, railing, step
{const z0=Z0,z1=Z0-2.0,x0=-3.9,x1=3.9,dy=0.32;for(let x=x0;x<x1;x+=0.21)B(x+0.1,dy,(z0+z1)/2,0.19,0.05,z0-z1,mix3([0.55,0.42,0.29],[0.47,0.35,0.24],rnd()),6);
  for(const x of [x0,0.3-0.75,0.3+0.75,x1])for(const z of [z1+0.1,(z0+z1)/2])box([x,0.15,z],[0.14,0,0],[0,0.15,0],[0,0,0.14],pick(stonePal),8);
  for(const x of [x0+0.05,-1.6,0.3-0.62,0.3+0.62,2.15,x1-0.05]){beam([x,dy,z1+0.12],[x,2.42,z1+0.12],[1,0,0],0.14,0.14,wood,6);beam([x,2.1,z1+0.12],[x,2.4,z1+0.42],[1,0,0],0.09,0.09,wood,6);}
  beam([x0-0.1,2.44,z1+0.12],[x1+0.1,2.44,z1+0.12],[0,1,0],0.16,0.14,wood,6);
  for(const [a,b] of [[x0+0.05,-1.6],[-1.6,0.3-0.62],[0.3+0.62,2.15],[2.15,x1-0.05]]){beam([a,dy+0.85,z1+0.12],[b,dy+0.85,z1+0.12],[0,1,0],0.08,0.07,wood,6);for(let x=a+0.18;x<b-0.1;x+=0.18)beam([x,dy+0.05,z1+0.12],[x,dy+0.82,z1+0.12],[0,0,1],0.04,0.04,woodD,6);}
  fb(G.front,doorU,0.15,2.2,1.4,0.3,0.5,pick(stonePal),8);
  const S=(u,t,o)=>{const k=t/2.15;return[u,2.42+0.55*k+o*0.96,z1-0.25+2.27*k+o*0.26-0.04*Math.sin(Math.PI*(u-x0+0.3)/(x1-x0+0.6))*k];},L=2.15;
  for(let i=0;i<10;i++)quad(S(x0-0.3+(x1-x0+0.6)*i/10,0,0),S(x0-0.3+(x1-x0+0.6)*(i+1)/10,0,0),S(x0-0.3+(x1-x0+0.6)*(i+1)/10,L,0),S(x0-0.3+(x1-x0+0.6)*i/10,L,0),null,[0.24,0.18,0.13],12,0.5);
  K.shingles(S,x0-0.3,x1+0.3,L,null,shing);beam(S(x0-0.3,-0.02,-0.03),S(x1+0.3,-0.02,-0.03),[0,1,0],0.16,0.05,timber,6);
  // veranda life: bench, rocking chair, crates, a hanging lantern, flower pots, a milk churn
  for(const dz of [-0.1,0,0.1])B(-2.4,dy+0.45,Z0-0.4+dz,1.5,0.05,0.1,wood,6);for(const e of [-0.65,0.65])B(-2.4+e,dy+0.22,Z0-0.4,0.06,0.44,0.32,woodD,6);
  {const cx=2.4,cz=-4.4;for(const e of [-0.24,0.24]){const p=[cx+e,dy+0.06,cz];beam(add(p,[0,0,-0.35]),add(p,[0,0,0.35]),[0,1,0],0.05,0.04,woodD,6);beam(add(p,[0,0.04,0]),add(p,[0,0.45,0.05]),[1,0,0],0.04,0.04,woodD,6);beam(add(p,[0,0.45,0.15]),add(p,[0,1.0,0.32]),[1,0,0],0.04,0.04,woodD,6);}
    B(cx,dy+0.47,cz+0.02,0.52,0.05,0.42,wood,6);B(cx,dy+0.78,cz+0.24,0.52,0.5,0.04,wood,6,0);}
  K.crate(3.3,dy,-3.65,0.48,0.2);cyl([-3.4,dy,-3.7],[-3.4,dy+0.55,-3.7],0.17,0.15,12,[0.68,0.7,0.72],11,[0.55,0.57,0.6],11,undefined,true);cyl([-3.4,dy+0.55,-3.7],[-3.4,dy+0.68,-3.7],0.09,0.1,10,[0.68,0.7,0.72],11,[0.4,0.42,0.44],11,undefined,true);
  cyl([0.3-0.62,2.2,z1+0.12],[0.3-0.62,1.95,z1+0.12],0.01,0.01,4,iron,11);B(0.3-0.62,1.8,z1+0.12,0.16,0.24,0.16,[1,0.85,0.55],3);B(0.3-0.62,1.94,z1+0.12,0.2,0.04,0.2,iron,11);
  for(const x of [-0.8,1.4])K.pot(x,-5.45);}
// roof: long bendy shingle roof, gable timbering, chimney through the ridge
const chimSkip=P=>Math.abs(P[0]-1.6)<0.45&&P[2]>-0.1&&P[2]<0.75;
const mr=K.roof({c:[0,0],dir:[1,0],halfLen:4.5,half:3.25,H:H2,rise:3.8,ov:0.45,gov:0.42,th:0.14,sag:0.4,flare:0.24,nx:28,rafters:0.6,skip:chimSkip,cover:shing,mossClumps:45});
K.gableFan(mr,-1,plaster);K.gableFan(mr,1,plaster);
for(const e of [-1,1]){const f=e<0?U.left:U.right,uz=z=>f.t[2]*z,yU=z=>mr.under(e*4.5,z)-0.04;rail(f,Z0,Z1,H2+0.07,0.16);rail(f,uz(-1.9),uz(1.9),H2+1.9,0.15);
  for(const z of [-2.3,-1.0,1.0,2.3])T(f,uz(z),H2+0.12,uz(z),yU(z),0.14);T(f,0,H2+1.95,0,yU(0),0.14);for(const s of [-1,1])T(f,uz(s*0.15),H2+1.98,uz(s*1.0),H2+2.8,0.11);
  K.win(f,0,H2+0.55,0.75,0.85,{frame:timber,cols:2,rows:2});}
K.chimney({base:[1.2,2.0,-0.05,0.7],bt:7.6,stack:[1.24,1.96,-0.01,0.66],top:9.9,lean:[0.006,0.004],clad:[],pots:[0]});
// ---------------- barn on the left: stone plinth, vertical boards, big doors (one open on the hay), hayloft
const BX0=-10.6,BX1=X0,BZ0=-3.0,BZ1=3.0,BH=3.4,BP=0.5,bw=K.walls(BX0,BX1,BZ0,BZ1),bcx=(BX0+BX1)/2;
const doorH=2.98,doorW=2.8;B(bcx,BH/2,1.35,BX1-BX0-0.1,BH,3.2,[0.09,0.07,0.05],0);B(bcx,0.01,-1.6,BX1-BX0-0.1,0.02,2.7,[0.36,0.29,0.2],10);
for(const f of [bw.back,bw.left])K.stones(f,-f.half-0.05,f.half+0.05,0,BP,{h:[0.14,0.2]});K.stones(bw.front,-bw.front.half-0.05,bw.front.half+0.05,0,BP,{h:[0.14,0.2],skip:u=>Math.abs(u)<doorW/2+0.02});
for(const [u0,u1] of [[-bw.front.half,-doorW/2-0.03],[doorW/2+0.03,bw.front.half]])fb(bw.front,(u0+u1)/2,(BP+BH)/2,-0.02,u1-u0,BH-BP,0.02,[0.09,0.07,0.05],0);for(const f of [bw.back,bw.left])fb(f,0,(BP+BH)/2,-0.02,f.half*2,BH-BP,0.02,[0.09,0.07,0.05],0);
function planks(f,u0,u1,y0,top,skip){for(let u=u0;u<u1-0.04;u+=0.235){const w=Math.min(0.225,u1-u),uc=u+w/2;if(skip&&skip(uc))continue;const yt=typeof top==='function'?top(uc):top;if(yt<=y0+0.05)continue;
    fb(f,uc,(y0+yt)/2,0.03,w-0.018,yt-y0,0.035,mix3(barnA,barnB,rnd()),6);}fb(f,(u0+u1)/2,y0+0.12,0.06,u1-u0,0.12,0.04,woodD,6);}
planks(bw.front,-bw.front.half,bw.front.half,BP,BH,uc=>Math.abs(uc)<doorW/2+0.04);fb(bw.front,0,BH-0.1,0.07,doorW+0.4,0.2,0.08,woodD,6);
planks(bw.back,-bw.back.half,bw.back.half,BP,BH);planks(bw.left,-bw.left.half,bw.left.half,BP,BH);
for(const f of [bw.front,bw.back])for(const u of [-f.half+0.1,f.half-0.1])fb(f,u,(BP+BH)/2,0.07,0.16,BH-BP,0.08,woodD,6);
// door leaves: left closed with a Z brace, right swung open; dark interior with hay
{const f=bw.front,hw=doorW/2,y0=0.02;for(let k=0;k<6;k++)fb(f,-hw+0.12+k*0.233,y0+doorH/2,0.05,0.22,doorH,0.04,mix3(barnA,barnB,rnd()),6);
  for(const y of [y0+0.35,y0+doorH-0.35])fb(f,-hw/2,y,0.085,hw-0.05,0.14,0.03,woodD,6);T({...f,o:fp(f,0,0,0.055)},-hw+0.1,y0+0.4,-0.08,y0+doorH-0.4,0.12);
  const hinge=fp(f,hw,0,0.04),a=1.2,d=norm([Math.cos(a)*f.t[0]+Math.sin(a)*f.n[0],0,Math.cos(a)*f.t[2]+Math.sin(a)*f.n[2]]);
  for(let k=0;k<6;k++){const c=add(hinge,mul(d,0.12+k*0.233));box([c[0],y0+doorH/2,c[2]],mul(d,0.11),[0,doorH/2,0],mul(norm(K.v.cross(d,[0,1,0])),0.02),mix3(barnA,barnB,rnd()),6);}
  for(const y of [y0+0.35,y0+doorH-0.35]){const c=add(hinge,mul(d,hw/2));box([c[0],y,c[2]],mul(d,hw/2-0.03),[0,0.07,0],mul(norm(K.v.cross(d,[0,1,0])),0.035),woodD,6);}
  for(let k=0;k<4;k++)for(let j=0;j<3-Math.floor(k/2);j++)B(bcx+rr(-1.1,1.1),0.22+j*0.42,BZ0+0.9+k*0.5,1.0,0.4,0.48,mix3(straw,[0.78,0.64,0.36],rnd()),6,rr(-0.2,0.2));
  for(let k=0;k<60;k++)beam([bcx+rr(-1.6,1.6),0.03,BZ0-rr(0,0.9)],[bcx+rr(-1.6,1.6),0.03,BZ0-rr(0,0.9)].map((v,i)=>i===1?0.035:v),[0,1,0],0.012,0.01,straw,6);}
// barn roof (lower ridge, butts against the house) with the left gable boarded, an open hayloft door and a pulley beam
const br=K.roof({c:[bcx,0],dir:[1,0],halfLen:(BX1-BX0)/2,half:3.0,H:BH,rise:2.9,ov:0.4,gov:0.4,th:0.13,sag:0.3,flare:0.2,phase:2.2,nx:22,ends:[-1],cover:shing,mossClumps:30});
{const f=bw.left,yU=uc=>br.under(-(BX1-BX0)/2,-uc)-0.03;planks(f,-3.0,3.0,BH,yU);fb(f,0,BH+0.06,0.06,6.0,0.14,0.05,woodD,6);
  B(BX0-0.07,BH+0.95,0,0.02,1.25,1.0,[0.06,0.05,0.04],0);for(let k=0;k<4;k++)B(BX0-0.2,BH+0.3+k*0.22,rr(-0.35,0.35),0.6,0.2,0.4,straw,6,rr(-0.3,0.3));
  const hg=[BX0-0.03,BH+0.4,0.55];hg[0]=BX0-0.09;for(let k=0;k<4;k++)box(add(hg,[0,0.55,0.12+k*0.24]),[0.02,0,0],[0,0.55,0],[0,0,0.11],mix3(barnA,barnB,rnd()),6);
  beam([BX0+0.3,br.under(-(BX1-BX0)/2,0)-0.25,0],[BX0-0.9,br.under(-(BX1-BX0)/2,0)-0.25,0],[0,1,0],0.16,0.16,woodD,6);cyl([BX0-0.75,BH+2.2,0],[BX0-0.75,BH+1.95,0],0.09,0.09,10,woodD,6,woodD,14);cyl([BX0-0.75,BH+1.95,0],[BX0-0.75,BH+0.8,0],0.012,0.012,4,[0.62,0.54,0.4],0);}
// ---------------- open lean-to shed on the right with firewood and a cart
{const sx0=X1,sx1=X1+2.8,z0=-2.6,z1=2.6;for(const z of [z0,0,z1])beam([sx1,0,z],[sx1,2.05,z],[0,0,1],0.14,0.14,wood,6);beam([sx1,2.08,z0-0.2],[sx1,2.08,z1+0.2],[1,0,0],0.16,0.14,wood,6);
  const S=(u,t,o)=>{const k=t/2.95;return[sx1+0.25-(sx1+0.25-sx0)*k-o*0.21,2.05+0.65*k+o*0.98,u];},L=2.95;for(let i=0;i<8;i++)quad(S(z0-0.3+(z1-z0+0.6)*i/8,0,0),S(z0-0.3+(z1-z0+0.6)*(i+1)/8,0,0),S(z0-0.3+(z1-z0+0.6)*(i+1)/8,L,0),S(z0-0.3+(z1-z0+0.6)*i/8,L,0),null,[0.24,0.18,0.13],12,0.5);
  K.shingles(S,z0-0.3,z1+0.3,L,null,shing);
  for(let r=0;r<6;r++)for(let k=0;k<12-(r>3?2:0);k++){const z=0.1+k*0.21+(r%2)*0.1,y=0.13+r*0.24,rr2=rr(0.09,0.12);cyl([sx0+0.12,y,z],[sx0+0.95+rr(-0.06,0.06),y,z],rr2,rr2,8,[0.38,0.29,0.21],15,[0.76,0.6,0.42],14);}
  // hand cart
  {const cx=sx0+1.45,cz=-1.3;for(let k=0;k<4;k++)B(cx,0.62,cz-0.45+k*0.3,1.1,0.04,0.28,mix3(wood,woodD,rnd()),6);for(const e of [-1,1])B(cx+e*0.55,0.78,cz,0.04,0.3,1.2,woodD,6);
    for(const e of [-1,1]){const hc=[cx+e*0.62,0.42,cz],n=12,R=0.4;for(let k=0;k<n;k++){const a0=k/n*6.283,a1=(k+1)/n*6.283;beam(add(hc,[0,Math.sin(a0)*R,Math.cos(a0)*R]),add(hc,[0,Math.sin(a1)*R,Math.cos(a1)*R]),[1,0,0],0.07,0.05,wood,6);}
      for(let k=0;k<6;k++){const a=k/6*6.283;beam(hc,add(hc,[0,Math.sin(a)*0.37,Math.cos(a)*0.37]),[1,0,0],0.035,0.03,wood,6);}cyl(add(hc,[-0.05,0,0]),add(hc,[0.05,0,0]),0.07,0.07,8,woodD,6,woodD,14);}
    for(const e of [-1,1])beam([cx+e*0.4,0.6,cz-0.6],[cx+e*0.3,0.08,cz-1.9],[0,1,0],0.06,0.05,wood,6);}}
// ---------------- grounds: lane, farmyard, path, garden, fences, animals, trees
B(0,-0.5,0,180,1.0,180,[0.42,0.56,0.27],9,0,0);
box([0,0.012,-14.8],[34,0,0],[0,0.012,0],[0,0,1.9],[0.6,0.5,0.37],17,0.5);for(let k=0;k<100;k++)ico([rr(-32,32),0.03,-14.8+rr(-1.9,1.9)],rr(0.04,0.1),pick(stonePal),0,{sy:0.45,jit:0.2});
for(let k=0;k<160;k++)tuft(rr(-32,32),-14.8+(rnd()<0.5?rr(-2.1,-1.6):rr(1.6,2.1)),6,rr(0.12,0.3));
// farmyard: trodden earth before the barn, scattered straw, puddle
K.patch(-7.4,-7.6,4.3,4.9,[0.5,0.41,0.29],10,0.008);K.patch(-6.6,-4.4,2.6,1.6,[0.46,0.37,0.26],10,0.012);K.patch(0.3,-6.0,1.4,0.9,[0.5,0.41,0.29],10,0.006);
for(let k=0;k<4;k++){const a=rnd()*6.28,d=rr(0,0.3);cyl([-6.4+Math.cos(a)*d,0,-8.3+Math.sin(a)*d],[-6.4+Math.cos(a)*d,0.016,-8.3+Math.sin(a)*d],rr(0.35,0.55),rr(0.3,0.5),12,[0.3,0.27,0.22],10,[0.24,0.26,0.24],0);}
for(let k=0;k<140;k++){const x=rr(-11.2,-3.8),z=rr(-11.8,-3.1),a=rnd()*6.28,l=rr(0.08,0.2);beam([x,0.025,z],[x+Math.cos(a)*l,0.025,z+Math.sin(a)*l],[0,1,0],0.01,0.008,mix3(straw,[0.7,0.58,0.34],rnd()),6);}
// hay bales, pitchfork, trough, wheelbarrow
for(const [x,z,ry,y] of [[-9.6,-5.6,0.2,0],[-9.4,-6.8,-0.1,0],[-9.5,-6.2,0.4,0.42],[-4.9,-10.4,0.9,0]]){B(x,y+0.21,z,1.0,0.42,0.5,mix3(straw,[0.8,0.66,0.38],rnd()),6,ry);for(const e of [-0.25,0.25]){const c=Math.cos(ry),s=Math.sin(ry);B(x+c*e,y+0.21,z+s*e,0.02,0.43,0.51,[0.55,0.45,0.3],0,ry);}}
beam([-9.3,0.42,-6.2],[-8.6,1.65,-6.4],[0,0,1],0.03,0.03,[0.62,0.48,0.32],6);for(const e of [-1,0,1])beam([-8.6+e*0.0,1.65,-6.4+e*0.05],[-8.45,1.95,-6.45+e*0.07],[1,0,0],0.012,0.012,iron,11);
{const tx=-6.2,tz=-4.2;B(tx,0.3,tz,1.6,0.6,0.55,wood,6,0.05);B(tx,0.52,tz,1.48,0.04,0.43,[0.2,0.3,0.34],2,0.05);for(const e of [-0.7,0.7])B(tx+e,0.35,tz,0.08,0.7,0.65,woodD,6,0.05);}
{const wx=-3.3,wz=-8.6,ry=0.6,c=Math.cos(ry),s=Math.sin(ry),L=(a,y,b)=>[wx+c*a-s*b,y,wz+s*a+c*b];beam(L(-0.5,0.45,-0.3),L(0.45,0.55,-0.3),[0,0,1],0.05,0.05,wood,6);beam(L(-0.5,0.45,0.3),L(0.45,0.55,0.3),[0,0,1],0.05,0.05,wood,6);
  for(const b2 of [-0.3,0.3])beam(L(0.45,0.55,b2),L(1.1,0.75,b2*0.8),[0,1,0],0.05,0.05,wood,6);B(...L(-0.05,0.62,0),0.9,0.3,0.6,mix3(wood,woodD,0.5),6,ry);B(...L(-0.05,0.78,0),0.8,0.05,0.5,[0.45,0.34,0.22],10,ry);
  cyl(L(-0.65,0.25,-0.08),L(-0.65,0.25,0.08),0.24,0.24,12,woodD,6,woodD,14);for(const b2 of [-0.22,0.22])beam(L(-0.4,0.5,b2),L(-0.3,0.02,b2),[0,1,0],0.04,0.04,wood,6);}
// chickens pecking around the yard
function chicken(x,z,ry,col,peck){const c=Math.cos(ry),s=Math.sin(ry),L=(a,y,b)=>[x+c*a-s*b,y,z+s*a+c*b];ico(L(0,0.2,0),0.12,col,0,{detail:1,sy:0.8});ico(L(-0.13,0.27,0),0.07,col.map(v=>v*0.9),0,{sy:1.2});
  const hy=peck?0.16:0.33,hx=peck?0.17:0.12;ico(L(hx,hy,0),0.055,col,0,{detail:1});B(...L(hx+0.01,hy+0.05,0),0.06,0.04,0.015,[0.85,0.15,0.12],0,ry);B(...L(hx+0.06,hy-0.005,0),0.04,0.015,0.02,[0.95,0.7,0.2],0,ry);
  B(...L(hx+0.035,hy-0.04,0),0.02,0.03,0.012,[0.85,0.15,0.12],0,ry);for(const e of [-0.04,0.04])cyl(L(0,0.12,e),L(0.01,0,e),0.008,0.008,4,[0.95,0.7,0.2],0);}
for(const [x,z,ry,cl,pk] of [[-7.0,-6.3,0.5,0,1],[-6.4,-7.0,2.1,1,0],[-7.8,-7.6,-0.8,0,1],[-5.6,-6.0,3.0,2,1],[-8.3,-5.0,1.2,1,0],[-4.6,-7.2,0.1,0,1],[-6.9,-9.0,-2.2,2,0]])
  chicken(x,z,ry,[[0.95,0.93,0.88],[0.62,0.36,0.2],[0.25,0.22,0.2]][cl],pk);
// path from the lane to the veranda: rounded stepping stones
for(let z=-12.8,k=0;z<-5.6;z+=0.5,k++){const dx=(k%2?0.13:-0.13);const s=rr(0.42,0.5),ang=rr(-0.25,0.25);box([0.3+dx+rr(-0.03,0.03),0.04,z+rr(-0.03,0.03)],rot([s/2,0,0],[0,1,0],ang),[0,0.04,0],rot([0,0,rr(0.17,0.21)],[0,1,0],ang),pick(stonePal),8);}
// fenced vegetable garden with a scarecrow
{const gx0=1.6,gx1=8.6,gz0=-12.2,gz1=-6.4;box([(gx0+gx1)/2,0.03,(gz0+gz1)/2],[(gx1-gx0)/2,0,0],[0,0.03,0],[0,0,(gz1-gz0)/2],[0.34,0.24,0.15],10,0.3);
  for(let r=0;r<6;r++){const x=gx0+0.7+r*1.05;box([x,0.1,(gz0+gz1)/2],[0.28,0,0],[0,0.05,0],[0,0,(gz1-gz0)/2-0.4],[0.3,0.21,0.14],10);
    for(let z=gz0+0.6;z<gz1-0.5;z+=0.55){const p=[x,0.17,z+rr(-0.05,0.05)];
      if(r===0||r===3){ico(p,0.17,[0.48,0.66,0.36],1,{detail:1,sy:0.75,jit:0.15});for(let j=0;j<5;j++){const a=j*1.26;ico(add(p,[Math.cos(a)*0.16,-0.03,Math.sin(a)*0.16]),0.1,[0.4,0.6,0.32],1,{sy:0.35});}}
      else if(r===1)for(let j=0;j<5;j++)cyl(p,add(p,[rr(-0.07,0.07),rr(0.15,0.26),rr(-0.07,0.07)]),0.012,0.004,4,[0.36,0.6,0.22],13);
      else if(r===2)ico(p,0.14,[0.58,0.78,0.38],1,{detail:1,sy:0.6,jit:0.3});
      else if(r===4&&z<gz1-1.2){if(rnd()<0.6){ico([x,0.2,z],0.2,[0.92,0.5,0.14],0,{detail:1,sy:0.75,jit:0.05});cyl([x,0.33,z],[x+0.02,0.38,z],0.02,0.015,5,[0.4,0.34,0.2],6);}ico([x+0.2,0.12,z+0.15],0.18,[0.3,0.5,0.22],1,{sy:0.4,jit:0.3});}
      else if(r===5)ico(p,0.12,[0.32,0.55,0.25],1,{detail:1,jit:0.3});}}
  const sc=[gx0+3.7,0,gz0+2.6];beam(sc,add(sc,[0,1.75,0]),[1,0,0],0.06,0.06,wood,6);beam(add(sc,[-0.65,1.3,0]),add(sc,[0.65,1.3,0]),[0,1,0],0.05,0.05,wood,6);B(sc[0],1.15,sc[2],0.62,0.55,0.22,[0.62,0.24,0.2],0);
  B(sc[0],0.75,sc[2],0.4,0.35,0.2,[0.3,0.36,0.5],0);ico(add(sc,[0,1.68,0]),0.15,straw,6,{detail:1});cyl(add(sc,[0,1.78,0]),add(sc,[0,1.8,0]),0.3,0.3,14,[0.7,0.58,0.36],6,[0.7,0.58,0.36],6);cyl(add(sc,[0,1.8,0]),add(sc,[0,1.98,0]),0.14,0.12,10,[0.7,0.58,0.36],6,[0.66,0.54,0.33],6);
  for(const e of [-1,1])for(let k=0;k<4;k++)beam(add(sc,[e*0.62,1.3,0]),add(sc,[e*rr(0.72,0.8),rr(1.15,1.35),rr(-0.1,0.1)]),[0,0,1],0.015,0.015,straw,6);
  const fence=(a,b)=>{const n=Math.max(1,Math.round(Math.hypot(b[0]-a[0],b[1]-a[1])/1.4));for(let k=0;k<=n;k++){const x=a[0]+(b[0]-a[0])*k/n,z=a[1]+(b[1]-a[1])*k/n;box([x,0.45,z],[0.05,0,0],[0,0.45,0],[0,0,0.05],mix3(woodD,[0.48,0.4,0.32],rnd()),6);}
    for(const y of [0.3,0.7])beam([a[0],y+rr(-0.03,0.03),a[1]],[b[0],y+rr(-0.03,0.03),b[1]],[0,1,0],0.07,0.05,mix3(wood,[0.56,0.46,0.35],rnd()),6);};
  fence([gx0,gz1],[gx1,gz1]);fence([gx1,gz1],[gx1,gz0]);fence([gx1,gz0],[gx0,gz0]);fence([gx0,gz0],[gx0,gz1-1.2]);
  for(let k=0;k<40;k++){const t=rnd();tuft(gx0+(gx1-gx0)*t,(rnd()<0.5?gz0:gz1)+rr(-0.12,0.12),6,rr(0.2,0.4));}}
// split-rail fence around the farm, bushes, fruit trees, grass, flowers
{const rail=(a,b)=>{for(const y of [0.5,0.9])beam([a[0],y+rr(-0.04,0.04),a[1]],[b[0],y+rr(-0.04,0.04),b[1]],[0,1,0],rr(0.08,0.11),rr(0.06,0.08),mix3([0.48,0.39,0.3],[0.56,0.46,0.35],rnd()),6);};
  const line=(a,b)=>{const n=Math.max(1,Math.round(Math.hypot(b[0]-a[0],b[1]-a[1])/1.85));for(let k=0;k<n;k++){const p=[a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n],q=[a[0]+(b[0]-a[0])*(k+1)/n,a[1]+(b[1]-a[1])*(k+1)/n];rail(p,q);
      const ang=rnd();box([p[0],0.55,p[1]],rot([0.065,0,0],[0,1,0],ang),[0,0.55,0],rot([0,0,0.065],[0,1,0],ang),mix3([0.42,0.34,0.27],[0.5,0.42,0.33],rnd()),6);for(let j=0;j<4;j++)tuft(p[0]+rr(-0.15,0.15),p[1]+rr(-0.15,0.15),7,rr(0.2,0.4));}};
  line([-12.6,-12.9],[-1.2,-12.9]);line([-12.6,-12.9],[-12.6,6]);line([10.6,-12.9],[10.6,6]);line([9.2,-12.9],[10.6,-12.9]);}
for(const [x,z,r,b] of [[-4.3,-3.5,0.45,1],[4.9,-3.4,0.5,0],[-11.4,2.5,0.8,0],[8.6,3.8,0.7,1],[-1.6,-6.2,0.4,1],[9.6,-3.0,0.75,0]])K.bush(x,z,r,mix3([0.22,0.42,0.18],[0.3,0.52,0.22],rnd()),b?[[0.95,0.75,0.85],[0.98,0.96,0.92],[0.6,0.62,0.92]]:null);
K.ivy(X1+0.02,-2.9,1,0,2.4,5);K.ivy(BX0-0.02,-2.4,-1,0,2.6,6);
for(const [x,z,s,ap] of [[-14,-3,1.3,1],[-8.5,7,1.4,0],[-1,8.5,1.5,1],[6.5,8,1.3,1],[13,0,1.4,0],[14.5,-9,1.2,0],[-16,6,1.5,0],[2,14,1.6,0],[11,11,1.3,1]])K.tree(x,z,s,{apples:!!ap});
const inHouse=(x,z)=>(x>BX0-0.3&&x<X1+3.1&&z>-5.4&&z<3.4),inYard=(x,z)=>x>-11.5&&x<-3.6&&z>-12.1&&z<-3.0,inGarden=(x,z)=>x>1.5&&x<8.7&&z>-12.3&&z<-6.3,onPath=(x,z)=>Math.abs(x-0.3)<0.55&&z<-5.3&&z>-13.1;
K.grass(4300,-18,18,-12.9,16,(x,z)=>inHouse(x,z)||inYard(x,z)||inGarden(x,z)||onPath(x,z));
for(let k=0;k<150;k++){const x=rr(-12,12),z=rr(-12.5,12);if(inHouse(x,z)||inYard(x,z)||inGarden(x,z)||onPath(x,z))continue;flower(x,0,z,rnd()<0.6?[0.98,0.97,0.94]:[0.99,0.85,0.25],rr(0.08,0.16));}
for(let k=0;k<200;k++){const x=rnd()<0.5?rr(-11.6,-11.0):rr(-4.0,-3.6),z=rr(-12,-3.1);tuft(x,z,5,rr(0.1,0.22));}
return{target:[-2.6,2.6,-4.0],dist:42,dir:[-0.6,0.52,-0.6],shadowC:[-2,2,-4],shadowR:22,haze:[44,110]};};
