'use strict';
// ===== buildings/sawmill.js — the water-powered sawmill (user's reference picture, Nov 2026): a two-storey mill on a rubble-stone
// foundation, red brick ground floor with round-arched windows and an arched log door, a board-and-batten timber upper floor and gables
// with fretwork bargeboards and finials, a steep shingle roof with a louvred ventilator, a tall iron engine stack, a lean-to log shed;
// an overshot water wheel (drawn separately so it turns: Life adds it) in a stone wheel pit, fed by a timber flume on trestles from a
// weir upstream on the brook, the tailrace back to the brook; a jack ladder bringing logs up into the shed; log decks, stacked sawn
// timber with stickers, sawhorses with a log, a rail fence along the bank.
// Frame: the mill's plot centre at the origin, +x the road and brook side (the brook runs along z about 28 m out), the loading sides
// -x and ±z stay clear beyond 20 m / 15 m for the wood-mill stations. dir = +1: the brook comes from +z (upstream), -1 from -z.
(function(){
const STONE=[[0.62,0.6,0.56],[0.55,0.53,0.5],[0.68,0.65,0.6],[0.5,0.49,0.47]],BRICK=[0.6,0.28,0.19],WOOD=[0.47,0.34,0.24],WOODD=[0.36,0.26,0.18],WOODL=[0.6,0.46,0.32],
  IRON=[0.16,0.16,0.17],WATER=[0.2,0.33,0.34],SOIL=[0.47,0.39,0.29],DUST=[0.7,0.58,0.4],BARK=[0.38,0.27,0.18],END=[0.78,0.62,0.4],PLANK=[0.82,0.66,0.45];
const PY=0;// ground
function mill(K,opt,dir){const {B,beam,cyl,ico,quad,tri,fp,fb,rnd,rr,pick}=K,{add,mul,norm}=K.v,ST=KIT.stationKit(K);
  const X0=1.5,X1=11.5,Z0=-7,Z1=5,FL=1.1,G1=4.3,EV=7.6;// walls, foundation top, upper floor, eaves
  // ---- foundation: rubble stone, with the wheel pit on the +x side
  const F=K.walls(X0,X1,Z0,Z1);B((X0+X1)/2,FL/2-0.2,(Z0+Z1)/2,X1-X0+0.3,FL+0.4,Z1-Z0+0.3,STONE[1],8);
  if(K.lod<2)for(const f of [F.front,F.back,F.left,F.right])K.stones(f,-f.half-0.15,f.half+0.15,-0.2,FL,{pal:STONE,h:[0.22,0.32],l:[0.35,0.7]});
  // ---- brick ground floor with round-arched windows, the log door (left gable) and a plank door
  B((X0+X1)/2,(FL+G1)/2,(Z0+Z1)/2,X1-X0,G1-FL,Z1-Z0,BRICK,24);fb(F.front,0,G1-0.08,0.05,X1-X0+0.12,0.16,0.12,STONE[2],8);fb(F.back,0,G1-0.08,0.05,X1-X0+0.12,0.16,0.12,STONE[2],8);
  for(const f of [F.left,F.right])fb(f,0,G1-0.08,0.05,f.half*2+0.12,0.16,0.12,STONE[2],8);
  for(const u of [-3.5,-1,1.5,4])ST.arch(F.right,u,FL+0.7,0.9,2.0,{nv:7});for(const u of [-3,3])ST.arch(F.front,u,FL+0.7,0.9,2.0,{nv:7});
  ST.door(F.front,0,FL,1.8,2.6);ST.arch(F.back,-2.5,FL+0.7,0.9,2.0,{nv:7});ST.door(F.back,2.2,FL,1.4,2.3);
  // ---- timber upper floor: boards with battens, small-paned windows, a loft door with a hoist beam in the front gable
  B((X0+X1)/2,(G1+EV)/2,(Z0+Z1)/2,X1-X0+0.12,EV-G1,Z1-Z0+0.12,WOOD,6);
  const battens=(f,y0,y1)=>{if(K.lod>=2)return;for(let u=-f.half+0.25;u<f.half;u+=K.lod>=1?0.9:0.45)fb(f,u,(y0+y1)/2,0.07,0.07,y1-y0,0.05,WOODD,6);};
  for(const f of [F.front,F.back,F.left,F.right])battens(f,G1,EV);
  for(const u of [-3.5,0,3.5])K.win(F.right,u,G1+0.8,0.9,1.4,{cols:2,rows:3,frame:[0.86,0.82,0.7]});for(const u of [-3.5,3.5])K.win(F.left,u,G1+0.8,0.9,1.4,{cols:2,rows:3,frame:[0.86,0.82,0.7]});
  K.win(F.front,-2.8,G1+0.8,0.9,1.4,{cols:2,rows:3,frame:[0.86,0.82,0.7]});fb(F.front,1.6,G1+1.35,0.04,1.3,2.2,0.08,WOODD,6);fb(F.front,1.6,G1+1.35,0.08,1.4,0.1,0.1,WOODL,6);
  beam(fp(F.front,1.6,EV+0.6,0),fp(F.front,1.6,EV+0.6,1.6),[0,1,0],0.18,0.18,WOODD,6);cyl(fp(F.front,1.6,EV+0.45,1.45),fp(F.front,1.6,G1+2.8,1.45),0.012,0.012,4,[0.6,0.55,0.45],0);
  K.win(F.back,0,G1+0.8,0.9,1.4,{cols:2,rows:3,frame:[0.86,0.82,0.7]});
  // ---- roof: steep shingles, ridge along z; timber gables with fretwork bargeboards and finials, a round window high up
  const rf=K.roof({c:[(X0+X1)/2,(Z0+Z1)/2],dir:[0,1],halfLen:(Z1-Z0)/2,half:(X1-X0)/2,H:EV,rise:4.6,ov:0.55,gov:0.5,th:0.14,sag:0.12,flare:0.12,nx:30,mossClumps:20,ridgeMoss:0.08,trim:WOODD});
  for(const e of [-1,1]){const f=e<0?F.front:F.back;const a=fp(f,-(X1-X0)/2,EV,0.002),b=fp(f,(X1-X0)/2,EV,0.002),c=fp(f,0,EV+4.6,0.002);tri(a,b,c,WOOD,6);
    if(K.lod<2)for(let u=-(X1-X0)/2+0.3;u<(X1-X0)/2;u+=K.lod>=1?0.9:0.45){const top=EV+4.6*(1-Math.abs(u)/((X1-X0)/2))-0.1;if(top>EV+0.1)fb(f,u,(EV+top)/2,0.07,0.07,top-EV,0.05,WOODD,6);}
    KIT.stationKit(K).barge(rf,e,{spike:1.1});const rc=fp(f,0,EV+2.4,0.06);cyl(rc,fp(f,0,EV+2.4,0.0),0.45,0.45,14,[0.25,0.22,0.2],2,[0.25,0.22,0.2],2);
    // fretwork: a scalloped board under the bargeboards
    if(K.lod<1)for(let k=0;k<10;k++){const u=(k+0.5)/10*(X1-X0)-(X1-X0)/2,y=EV+4.6*(1-Math.abs(u)/((X1-X0)/2))-0.55;ico(fp(f,u,y,0.22),0.09,[0.5,0.38,0.27],6,{sy:0.6});}}
  // louvred ventilator on the ridge, with its own little roof and a finial
  {const vx=(X0+X1)/2,vz=Z0+3.5,y0=EV+4.2;B(vx,y0+0.7,vz,1.8,1.6,1.6,WOOD,6);if(K.lod<2)for(let k=0;k<5;k++)for(const e of [-1,1]){B(vx+e*0.91,y0+0.25+k*0.28,vz,0.04,0.1,1.4,WOODD,6,0);B(vx,y0+0.25+k*0.28,vz+e*0.81,1.6,0.1,0.04,WOODD,6,0);}
    const r2=K.roof({c:[vx,vz],dir:[0,1],halfLen:0.8,half:0.9,H:y0+1.5,rise:0.9,ov:0.25,gov:0.2,th:0.08,sag:0,flare:0,nx:6,trim:WOODD});cyl([vx,y0+2.4,vz],[vx,y0+3.3,vz],0.05,0.01,6,IRON,11);}
  // tall iron engine stack (steam engine for low water) with a cap
  {const sx=X0+2.6,sz=Z1-2.2;cyl([sx,EV+1.5,sz],[sx,EV+9.5,sz],0.32,0.28,12,IRON,11);cyl([sx,EV+9.5,sz],[sx,EV+9.9,sz],0.42,0.42,12,IRON,11);for(const y of [EV+3.5,EV+6.5])cyl([sx,y,sz],[sx,y+0.12,sz],0.36,0.36,12,IRON,11);}
  // ---- lean-to log shed on -x: posts, a shingle roof sloping out, the jack ladder brings logs up into it
  {const x0=-3,x1=X0,z0=-5,z1=3,h0=3.6,h1=2.6;for(const z of [z0,(z0+z1)/2,z1])beam([x0+0.15,0,z],[x0+0.15,h1,z],[1,0,0],0.2,0.2,WOODD,6);
    B((x0+x1)/2,0.5,(z0+z1)/2,x1-x0,0.1,z1-z0,WOODL,12);B((x0+x1)/2,0.25,(z0+z1)/2,x1-x0,0.5,z1-z0,STONE[0],8);
    quad([x0-0.4,h1-0.15,z0-0.3],[x0-0.4,h1-0.15,z1+0.3],[x1,h0,z1+0.3],[x1,h0,z0-0.3],null,[0.52,0.4,0.3],4);quad([x1,h0-0.12,z0-0.3],[x1,h0-0.12,z1+0.3],[x0-0.4,h1-0.27,z1+0.3],[x0-0.4,h1-0.27,z0-0.3],null,[0.4,0.29,0.19],12);
    beam([x0+0.15,h1-0.05,z0],[x0+0.15,h1-0.05,z1],[0,1,0],0.2,0.2,WOODD,6);}
  // jack ladder: inclined timber slide on trestles from the log deck up to the shed floor, logs on it
  {const a=[-15,0.25,-1],b=[-2.6,1.4,-1];for(const e of [-0.55,0.55])beam([a[0],a[1],a[2]+e],[b[0],b[1],b[2]+e],[0,1,0],0.16,0.22,WOODD,6);
    for(let t=0.15;t<1;t+=0.2){const p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,-1];for(const e of [-0.55,0.55])beam([p[0],0,p[2]+e],[p[0],p[1],p[2]+e],[1,0,0],0.14,0.14,WOODD,6);beam([p[0],p[1]*0.5,-1.55],[p[0],p[1]*0.5,-0.45],[0,1,0],0.1,0.1,WOODD,6);}
    for(const [t,L] of [[0.18,3.6],[0.5,4.2],[0.8,3.4]]){const p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t+0.36,-1];cyl([p[0]-L/2*0.995,p[1]-L/2*0.093,p[2]],[p[0]+L/2*0.995,p[1]+L/2*0.093,p[2]],0.3,0.28,10,BARK,15,END,14);}}
  // ---- the wheel pit by the +x wall (the wheel itself turns: drawn by the game) and the tailrace to the brook
  const WX=X1+0.85,WZ=-1,WR=3.2;// wheel centre x, z, radius (hub height WR+0.05)
  // a raised stone wheel pit (water 0.3 m up, the wheel dips into it) and the raised tailrace channel to the brook at x 27
  B(WX,0.05,WZ,2.3,0.3,2*WR+1.4,STONE[1],8);B(WX,0.32,WZ,1.7,0.04,2*WR+0.9,WATER,0);for(const e of [-1,1])B(WX+e*1.05,0.4,WZ,0.3,0.8,2*WR+1.4,STONE[0],8);for(const e of [-1,1])B(WX,0.4,WZ+e*(WR+0.6),2.3,0.8,0.3,STONE[0],8);
  {const xa=WX+1.2,xb=21.6,xm=(xa+xb)/2,L=xb-xa;for(const e of [-1,1])B(xm,0.25,WZ+e*0.95,L,0.6,0.3,STONE[2],8);B(xm,0.0,WZ,L,0.1,1.9,STONE[3],8);B(xm,0.22,WZ,L,0.04,1.6,WATER,0);
    B(WX+1.05,0.22,WZ,0.3,0.04,1.6,WATER,0);}
  // axle bearing on the wall
  cyl([X1+0.02,WR,WZ],[X1+0.25,WR,WZ],0.35,0.35,10,STONE[2],8,STONE[2],8);
  // ---- the flume: a timber trough on trestles from the weir upstream (x 26.5, z 22·dir) to over the wheel; water in it
  {const yI=6.95,yW=6.7,I=[26.5,yI,22*dir],K1=[WX,yW+0.12,9*dir],Wt=[WX,yW,WZ+0.4*dir],segs=[[I,K1],[K1,Wt]];
    for(const [a,b] of segs){const L=Math.hypot(b[0]-a[0],b[2]-a[2]),d=[(b[0]-a[0])/L,0,(b[2]-a[2])/L],n=[-d[2],0,d[0]];
      // trough: floor and two sides, water surface
      beam(a,b,[0,1,0],0.12,1.1,WOOD,6);for(const e of [-1,1])beam(add(a,[n[0]*0.55*e,0.35,n[2]*0.55*e]),add(b,[n[0]*0.55*e,0.35,n[2]*0.55*e]),n,0.6,0.08,WOOD,6);
      beam(add(a,[0,0.18,0]),add(b,[0,0.18,0]),[0,1,0],0.02,0.98,WATER,0);
      // trestle bents every 3 m: two raking legs and a cross tie (legs run on into the ground)
      for(let t=1.5;t<L;t+=3){const p=[a[0]+d[0]*t,a[1]+(b[1]-a[1])*t/L,a[2]+d[2]*t];if(Math.abs(p[0]-WX)<2&&Math.abs(p[2]-WZ)<WR+1)continue;// none over the wheel
        for(const e of [-1,1]){beam([p[0]+n[0]*0.5*e,p[1]-0.1,p[2]+n[2]*0.5*e],[p[0]+n[0]*0.5*e,-8,p[2]+n[2]*0.5*e],d,0.16,0.16,WOODD,6);}
        beam([p[0]-n[0]*0.62,p[1]*0.45,p[2]-n[2]*0.62],[p[0]+n[0]*0.62,p[1]*0.45,p[2]+n[2]*0.62],[0,1,0],0.1,0.12,WOODD,6);
        if(K.lod<1){beam([p[0]-n[0]*0.5,p[1]*0.75,p[2]-n[2]*0.5],[p[0]+n[0]*0.5,0.5,p[2]+n[2]*0.5],[0,1,0],0.08,0.08,WOODD,6);}}}
    // the weir across the brook at the intake, with a sluice gate
    B(I[0]+0.4,-2.6,I[2],5,6.6,0.6,STONE[0],8);B(I[0],yI-0.4,I[2],1.3,1.1,0.3,WOODD,6);beam([I[0]-0.7,yI-1,I[2]],[I[0]-0.7,yI+1.2,I[2]],[1,0,0],0.12,0.12,WOODD,6);beam([I[0]+0.7,yI-1,I[2]],[I[0]+0.7,yI+1.2,I[2]],[1,0,0],0.12,0.12,WOODD,6);
    beam([I[0],-6,I[2]],[I[0],yI-0.2,I[2]],[1,0,0],0.5,0.3,WOODD,6);}
  // ---- yard: dirt and sawdust, log decks on the -x side, stacked sawn timber by ±z, sawhorses with a log, a cart, tools
  if(K.lod<2){K.patch(2,0,21,14.5,SOIL,10,0.012);K.patch(-5,4,5,3,DUST,10,0.02);K.patch(15,-6,3,2.2,DUST,10,0.02);}
  const logPile=(x,z,n,L,ry)=>{const c=Math.cos(ry),s=Math.sin(ry);let k=0;for(let row=0;row<3&&k<n;row++)for(let i=0;i<4-row&&k<n;i++,k++){const off=(i-(3-row)/2)*0.62,r=rr(0.26,0.32),y=r+row*0.52;
      const px=x-s*off,pz=z+c*off;cyl([px-c*L/2,y,pz-s*L/2],[px+c*L/2,y,pz+s*L/2],r,r*0.95,10,BARK,15,END,14);}
    for(const e of [-1,1])beam([x-c*L*0.35*e-s*1.6,0.12,z-s*L*0.35*e+c*1.6],[x-c*L*0.35*e+s*1.6,0.12,z-s*L*0.35*e-c*1.6],[0,1,0],0.14,0.16,WOODD,6);};
  logPile(-12,-9,9,5.5,0);logPile(-12,8.5,8,5,0);logPile(-6.5,-11.5,6,4.4,0.05);
  const lumber=(x,z,ry,len,w,h)=>{const c=Math.cos(ry),s=Math.sin(ry),n=Math.round(h/0.22);for(const e of [-1,1])B(x+c*e*len*0.38,0.08,z+s*e*len*0.38,0.2,0.16,w+0.2,WOODD,6,ry);
      for(let k=0;k<n;k++){const y=0.16+k*0.22;B(x,y+0.08,z,len,0.14,w,mix(PLANK,[0.72,0.56,0.38],rnd()*0.6),12,ry);if(k<n-1&&K.lod<2)for(const e of [-1,0,1])B(x+c*e*len*0.4,y+0.19,z+s*e*len*0.4,0.06,0.06,w+0.08,WOODD,6,ry);}};
  lumber(-1,11.2,0,4.8,1.6,1.4);lumber(4.5,11.4,0,4.8,1.6,1.8);lumber(10.5,11.2,0,4.2,1.6,1.1);lumber(2,-11.6,0,4.8,1.6,1.6);lumber(8,-11.4,0,4.2,1.5,1.2);
  // sawhorses with a log and a bucksaw, a hand cart, crates and a barrel
  {const sx=-1.5,sz=-8.6;for(const e of [-1,1]){const x=sx+e*1.0;for(const f of [-1,1])beam([x-0.35,0,sz+f*0.3],[x+0.35*0+0.0,0.85,sz],[0,0,1],0.07,0.07,WOODD,6);for(const f of [-1,1])beam([x+0.35,0,sz+f*0.3],[x,0.85,sz],[0,0,1],0.07,0.07,WOODD,6);}
    cyl([sx-1.8,1.1,sz],[sx+1.8,1.1,sz],0.24,0.23,10,BARK,15,END,14);beam([sx+0.4,1.4,sz-0.35],[sx+0.4,0.8,sz-0.35],[1,0,0],0.04,0.5,[0.55,0.55,0.58],11);}
  {const cx=9.5,cz=-9.2;B(cx,0.75,cz,2.2,0.08,1.1,WOODL,6,0.3);for(const e of [-1,1])cyl([cx-0.05,0.42,cz+e*0.62],[cx+0.05,0.42,cz+e*0.62],0.42,0.42,12,WOODD,6,WOODD,6);beam([cx+1.0,0.78,cz+0.2],[cx+2.3,0.5,cz+0.6],[0,1,0],0.06,0.06,WOODD,6);
    for(let k=0;k<4;k++)B(cx+0.1,0.86+k*0.08,cz,2.0,0.07,0.9,PLANK,12,0.3);}
  K.crate(14.5,0,6.2,0.7,0.2);K.crate(15.1,0,7,0.6,0.5);K.barrel(14.2,7.6,0.32,0.8);K.barrel(-3.8,-6.4,0.32,0.8);
  // ---- rail fence along the bank (gaps where the tailrace, the flume and the road pass)
  if(K.lod<2){const fx=21.5;for(let z=-15;z<15;z+=2.5){if(Math.abs(z-WZ)<2.2||Math.abs(z+13*dir)<4||Math.abs(z-9*dir)<1.2)continue;beam([fx,0,z],[fx,1.2,z],[1,0,0],0.12,0.12,WOODD,6);
      if(z+2.5<15&&!(Math.abs(z+1.25-WZ)<2.2||Math.abs(z+1.25+13*dir)<4))for(const y of [0.55,1.05])beam([fx,y,z],[fx,y,z+2.5],[0,1,0],0.08,0.1,WOOD,6);}}
  // a few bushes on the bank and a birch
  if(K.lod<2){for(const [x,z] of [[19,13],[23,-14],[18,-15]])K.bush(x,z,0.8);}
  if(!opt.game){KIT.sawWheel(K,WX,WR+0.05,WZ,WR);B(28,-0.3,0,4,0.1,80,WATER,0);B(2,-0.2,0,48,0.2,34,[0.36,0.5,0.24],9);}
  return{target:[6,4,0],dist:46,dir:[0.55,0.42,-0.72],shadowC:[6,4,0],shadowR:32,haze:[60,170]};}
// the overshot wheel (also used for the game's turning wheel, built around its hub): two rims with spokes, buckets between, a hub
KIT.sawWheel=function(K,cx,cy,cz,R){const {B,beam,cyl}=K,W2=0.62,sp=8,nb=28;
  for(const e of [-1,1]){const x=cx+e*W2;for(let k=0;k<nb;k++){const a0=k/nb*6.2832,a1=(k+1)/nb*6.2832;beam([x,cy+Math.sin(a0)*R,cz+Math.cos(a0)*R],[x,cy+Math.sin(a1)*R,cz+Math.cos(a1)*R],[1,0,0],0.08,0.22,WOODD,6);}
    for(let k=0;k<sp;k++){const a=k/sp*6.2832+0.2;beam([x,cy,cz],[x,cy+Math.sin(a)*R,cz+Math.cos(a)*R],[1,0,0],0.07,0.16,WOOD,6);}}
  for(let k=0;k<nb;k++){const a=(k+0.5)/nb*6.2832,c=[cx,cy+Math.sin(a)*(R-0.18),cz+Math.cos(a)*(R-0.18)],t=[0,Math.cos(a),-Math.sin(a)];
    K.box(c,[W2,0,0],K.v.mul(t,0.05),K.v.mul([0,Math.sin(a),Math.cos(a)],0.26),WOODL,6);}
  cyl([cx-W2-0.3,cy,cz],[cx+W2+0.15,cy,cz],0.28,0.28,10,IRON,11,IRON,11);cyl([cx-W2-1.0,cy,cz],[cx-W2-0.3,cy,cz],0.12,0.12,8,IRON,11,IRON,11);
  // the inner drum the buckets sit on
  cyl([cx-W2,cy,cz],[cx+W2,cy,cz],R-0.42,R-0.42,nb,WOODD,6);};
function mix(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
KIT.models.sawmillA=function(K,opt){return mill(K,opt,1);};
KIT.models.sawmillB=function(K,opt){return mill(K,opt,-1);};
// where the game draws the turning wheel and the flume's water falls (mill frame)
KIT.SAW={wheel:[12.35,3.25,-1],wheelR:3.2,stack:[4.1,17.5,2.8],flumeEnd:[12.35,6.9,-0.6]};
Object.assign(KIT.plots,{sawmillA:{x0:-22,x1:30,z0:-17,z1:26},sawmillB:{x0:-22,x1:30,z0:-26,z1:17}});
})();
