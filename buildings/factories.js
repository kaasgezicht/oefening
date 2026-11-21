'use strict';
// ===== buildings/factories.js — the processing factories (4.57.0, the user's Victorian set), in the house kit. Each stands on a
// 48 × 36 m plot (model x −24..24, z −18..18, ground y = 0); its goods sidings run along the long sides (z = ±34, Life.sawSlots).
//  factGas:     gasworks (takes coal): a retort house with a louvred ridge ventilator, a big and a small gasholder in column guide
//               frames with lattice girders, a coal store, a purifier house, gas mains, a tall square chimney.
//  factIron:    ironworks (takes iron ore and coal): a blast furnace on its pedestal with iron bands, charging platform, lift tower
//               and bridge, downcomer and dust catcher; three riveted hot-blast stoves; a casting house; a blowing-engine house; a
//               round chimney; ore and coal bins; a slag tip.
//  factMint:    the mint (takes gold and silver): classical stone, rusticated ground floor, tall pedimented windows, a six-column
//               portico with a pediment, cornice and balustrade, slate roof, flag; a walled bullion yard behind.
//  factDiamond: the diamond-cutting works (takes diamonds): a three-storey brick workshop with big multi-pane windows and stone
//               bands, a glazed north-light (sawtooth) cutting shop, a chimney, a walled yard.
(function(){
const IRON=[0.17,0.19,0.2],RED=[0.4,0.17,0.12],DARK=[0.08,0.08,0.09],COALC=[0.07,0.07,0.08],ORE=[0.42,0.22,0.15],SLAG=[0.22,0.2,0.2],PALE=[0.82,0.79,0.72],PALE2=[0.74,0.71,0.64];
function tools(K){const P=KIT.stationKit(K),S=KIT.SK,{B,beam,cyl,ico,quad,tri,fp,fb,pick,rr}=K;
  // a tall brick chimney stack (square, tapering in steps, a stone cap and an iron band)
  const stack=(x,z,h,w)=>{let y=0,ww=w;const n=6;for(let k=0;k<n;k++){const hh=h/n;B(x,y+hh/2,z,ww,hh,ww,S.BRICK,24);y+=hh;ww*=0.94;}B(x,h+0.15,z,ww+0.4,0.3,ww+0.4,S.STONE,8);B(x,h-1.2,z,ww+0.15,0.2,ww+0.15,IRON,11);B(x,0.6,z,w+0.6,1.2,w+0.6,S.STONE,8);};
  const round=(x,z,h,r)=>{cyl([x,0,z],[x,h,z],r,r*0.62,16,S.BRICK,24);cyl([x,h,z],[x,h+0.6,z],r*0.7,r*0.7,16,IRON,11,IRON,11);for(let y=3;y<h;y+=4)cyl([x,y,z],[x,y+0.15,z],r*(1-0.38*y/h)+0.05,r*(1-0.38*y/h)+0.05,16,IRON,11);cyl([x,0,z],[x,1.5,z],r+0.4,r+0.3,16,S.STONE,8);};
  // windows on a face: a row of arched windows every `step` along u between u0 and u1
  const winRow=(f,u0,u1,step,y,w,h)=>{for(let u=u0;u<=u1+0.01;u+=step)P.arch(f,u,y,w,h,{dep:0.2});};
  // a heap of coal or ore (blobs)
  const heap=(x,z,r,col,n)=>{for(let k=0;k<(n||12);k++){const a=k*2.4,d=rr(0,r*0.7);ico([x+Math.cos(a)*d,r*0.25*(1-d/r)+0.2,z+Math.sin(a)*d],rr(r*0.3,r*0.5),col,0,{sy:0.55,jit:0.3});}};
  return{P,S,B,beam,cyl,ico,quad,tri,fp,fb,pick,rr,stack,round,winRow,heap};}
// ---- gasworks
KIT.models.factGas=function(K){K.seed(1101);const T=tools(K),{P,S,B,beam,cyl,ico,fb,stack,winRow,heap}=T;
  // the retort house: brick, tall arched windows, slate roof with a louvred ventilator along the ridge
  {const F=P.block(-22,0,-9,9,0,8,{bands:[4]});winRow(F.front,-9,9,3,1.4,1.4,5.2);winRow(F.back,-9,9,3,1.4,1.4,5.2);winRow(F.left,-6,6,3,1.4,1.4,5.2);
    P.door(F.right,0,0,3,4.6);const rf=P.roof([-11,0],[1,0],11,9,8,4,{nx:30});P.gable(F.left,9,8,12);P.gable(F.right,9,8,12);P.barge(rf,-1,{spike:0.9});P.barge(rf,1,{spike:0.9});
    B(-11,12.6,0,18,1.2,1.6,S.BRICK2,24);for(let y=12.2;y<13.1;y+=0.24)for(const e of [-1,1])B(-11,y,e*0.82,18,0.06,0.12,S.CREAM,0);B(-11,13.3,0,18.6,0.12,2.4,S.SLATE[0]||[0.36,0.39,0.43],18);}
  stack(-19,13,32,2.4);
  // the coal store at the front: low brick walls round a heap
  B(-12,0.9,-14.5,18,1.8,0.4,S.BRICK,24);for(const x of [-21,-3])B(x,0.9,-12.5,0.4,1.8,4.4,S.BRICK,24);heap(-12,-12.5,4,COALC,16);
  // gasholders: a brick tank ring, the bell (riveted, dark red) with its crown, a guide frame of cast-iron columns and lattice girders
  const holder=(cx,cz,r,h,hb,n)=>{cyl([cx,0,cz],[cx,1.6,cz],r+0.5,r+0.5,24,S.BRICK,24,S.STONE,8);cyl([cx,1.6,cz],[cx,hb,cz],r,r,24,RED,25);cyl([cx,hb,cz],[cx,hb+0.7,cz],r,r*0.85,24,RED,25);cyl([cx,hb+0.7,cz],[cx,hb+1.5,cz],r*0.85,0.4,24,RED,25);
    for(let y=3;y<hb;y+=1.4)cyl([cx,y,cz],[cx,y+0.08,cz],r+0.04,r+0.04,24,DARK,11);
    const cols=[];for(let k=0;k<n;k++){const a=k/n*Math.PI*2,x=cx+Math.cos(a)*(r+0.9),z=cz+Math.sin(a)*(r+0.9);cols.push([x,z]);cyl([x,0,z],[x,h,z],0.3,0.24,10,IRON,11);cyl([x,0,z],[x,0.8,z],0.5,0.42,10,IRON,11);cyl([x,h,z],[x,h+0.5,z],0.3,0.55,10,IRON,11);ico([x,h+0.75,z],0.22,IRON,11);}
    for(const y of [h*0.5,h])for(let k=0;k<n;k++){const a=cols[k],b=cols[(k+1)%n];beam([a[0],y,a[1]],[b[0],y,b[1]],[0,1,0],0.5,0.12,IRON,11);beam([a[0],y-0.45,a[1]],[b[0],y-0.45,b[1]],[0,1,0],0.12,0.12,IRON,11);
      for(let q=0;q<4;q++){const t0=q/4,t1=(q+1)/4;beam([a[0]+(b[0]-a[0])*t0,y-0.45,a[1]+(b[1]-a[1])*t0],[a[0]+(b[0]-a[0])*t1,y,a[1]+(b[1]-a[1])*t1],[0,1,0],0.05,0.06,IRON,11);}}};
  holder(11,3,8,17,9,12);holder(18,-11.5,4.2,11,6.5,8);
  // the purifier house and the gas mains
  {const F=P.block(1,8,10,16,0,4.2,{});winRow(F.front,-2,2,2,1,0.9,2.2);P.roof([4.5,13],[1,0],3.5,3,4.2,1.6,{nx:10});P.gable(F.left,3,4.2,5.8);P.gable(F.right,3,4.2,5.8);}
  cyl([0,2.2,4],[3,2.2,4],0.4,0.4,10,IRON,11);cyl([3,2.2,4],[3,1,4],0.4,0.4,10,IRON,11);cyl([4.5,1.2,9.5],[4.5,1.2,6],0.35,0.35,10,IRON,11);cyl([2,1,-6],[15,1,-10],0.35,0.35,10,IRON,11);
  fb({o:[0,0,-18],t:[1,0,0],n:[0,0,-1]},0,0.6,0,46,1.2,0.3,S.BRICK2,24);return{};};
// ---- ironworks
KIT.models.factIron=function(K){K.seed(1102);const T=tools(K),{P,S,B,beam,cyl,ico,heap,round,winRow}=T;
  // the blast furnace: pedestal, banded shell, throat, charging platform with rails, lift tower and bridge, downcomer, dust catcher
  const fx=6,fz=2;B(fx,1.6,fz,10,3.2,10,S.STONE2[0],8);for(const e of [-1,1])B(fx+e*4,1.4,fz-5.2,1.4,2.8,0.6,S.STONE,8);
  cyl([fx,3.2,fz],[fx,8,fz],4.4,4.6,20,S.BRICK2,24);cyl([fx,8,fz],[fx,19,fz],4.6,3.2,20,IRON,25);for(let y=9;y<19;y+=1.6)cyl([fx,y,fz],[fx,y+0.14,fz],4.7-1.4*(y-8)/11,4.7-1.4*(y-8)/11,20,DARK,11);
  cyl([fx,19,fz],[fx,21,fz],3.2,2.2,16,IRON,25);B(fx,21.1,fz,12,0.25,12,[0.3,0.3,0.3],25);for(const [a,b] of [[[fx-6,21.2,fz-6],[fx+6,21.2,fz-6]],[[fx+6,21.2,fz-6],[fx+6,21.2,fz+6]],[[fx+6,21.2,fz+6],[fx-6,21.2,fz+6]],[[fx-6,21.2,fz+6],[fx-6,21.2,fz-6]]])P.lattice(a,b,1.0,{});
  for(const [x,z] of [[fx-5.5,fz-5.5],[fx+5.5,fz-5.5],[fx-5.5,fz+5.5],[fx+5.5,fz+5.5]])cyl([x,3.2,z],[x,21,z],0.25,0.25,8,IRON,11);
  {const lx=-5,lz=2;for(const [x,z] of [[lx-1.2,lz-1.2],[lx+1.2,lz-1.2],[lx-1.2,lz+1.2],[lx+1.2,lz+1.2]])beam([x,0,z],[x,24,z],[1,0,0],0.22,0.22,IRON,11);for(let y=1;y<24;y+=2){for(const e of [-1.2,1.2]){beam([lx-1.2,y,lz+e],[lx+1.2,y+2,lz+e],[0,0,1],0.05,0.1,IRON,11);beam([lx+e,y,lz-1.2],[lx+e,y+2,lz+1.2],[1,0,0],0.05,0.1,IRON,11);}}
    B(lx,24.3,lz,3.2,0.6,3.2,RED,0);B(lx,25.4,lz,2.8,1.6,2.8,RED,26);P.lattice([lx+1.4,20.6,lz-0.8],[fx-6,20.6,fz-0.8],1.2,{});P.lattice([lx+1.4,20.6,lz+0.8],[fx-6,20.6,fz+0.8],1.2,{});}
  cyl([fx,21,fz-1],[fx-2,24,fz-4],0.8,0.8,10,IRON,25);cyl([fx-2,24,fz-4],[fx-8,24,fz-9],0.8,0.8,10,IRON,25);cyl([fx-8,24,fz-9],[fx-8,11,fz-9],0.8,0.8,10,IRON,25);cyl([fx-8,2,fz-9],[fx-8,11,fz-9],2,2,16,IRON,25,IRON,11);cyl([fx-8,11,fz-9],[fx-8,12.5,fz-9],2,0.6,16,IRON,25);
  for(const [x,z] of [[-10.2,-5.5],[-12.4,-11.5]])beam([x,0,z],[x,2,z],[1,0,0],0.3,0.3,IRON,11);
  // hot-blast stoves: riveted cylinders with domes, on a stone base, a hot-blast main to the furnace
  for(const z of [-9,-2,5]){const x=17;cyl([x,0,z],[x,1,z],3,3,18,S.STONE,8);cyl([x,1,z],[x,19,z],2.6,2.6,18,[0.32,0.33,0.33],25);cyl([x,19,z],[x,20.4,z],2.6,1.6,18,[0.32,0.33,0.33],25);cyl([x,20.4,z],[x,21.2,z],1.6,0.3,18,[0.32,0.33,0.33],25);
    for(let y=3;y<19;y+=2.2)cyl([x,y,z],[x,y+0.1,z],2.64,2.64,18,DARK,11);cyl([x-2.6,7,z],[fx+4.5,7,z*0.4+fz*0.6],0.5,0.5,10,IRON,25);}
  cyl([17,8,-11],[17,8,7],0.7,0.7,12,IRON,25);
  // the casting house: an open brick shed on the furnace's front with arched openings and a slate roof
  {const F=P.block(-6,14,-15,-7,0,6,{});for(let u=-8;u<=8;u+=4)P.arch(F.front,u,0,2.8,5,{dep:0.3});P.roof([4,-11],[1,0],10,4,6,2.6,{nx:30});P.gable(F.left,4,6,8.6);P.gable(F.right,4,6,8.6);}
  // the blowing-engine house: tall brick, arched windows, a round chimney beside it
  {const F=P.block(-23,-10,-6,12,0,11,{bands:[5.5]});winRow(F.right,-6,6,3,1.6,1.5,7.4);winRow(F.left,-6,6,3,1.6,1.5,7.4);winRow(F.front,-3,3,3,1.6,1.5,7.4);winRow(F.back,-3,3,3,1.6,1.5,7.4);
    const rf=P.roof([-16.5,3],[0,1],9,6.5,11,4,{nx:28});P.gable(F.front,6.5,11,15);P.gable(F.back,6.5,11,15);P.crest(rf,-8.6,8.6);}
  round(-21,15,36,2.2);
  // ore and coal bins along the front siding, the slag tip at the back
  for(const [x,col] of [[-18,ORE],[-12,ORE],[-6,COALC]]){B(x+2.8,1.2,-16,0.4,2.4,4,S.BRICK,24);heap(x,-16,2.6,col,8);}B(-21.2,1.2,-16,0.4,2.4,4,S.BRICK,24);
  heap(10,15,5,SLAG,18);heap(17,15.5,3.5,SLAG,10);return{};};
// ---- the mint
KIT.models.factMint=function(K){K.seed(1103);const T=tools(K),{P,S,B,cyl,tri,fb,fp}=T;const ST=8;
  B(0,0.25,0,34,0.5,18,PALE2,ST);
  // the rusticated ground floor (stone courses with sunk joints) and the upper floor
  B(0,2.75,0,32,4.5,16,PALE,ST);for(let y=1;y<5;y+=0.75)for(const z of [-8.02,8.02])B(0,y,z,32.1,0.07,0.05,PALE2,ST);for(let x=-15;x<=15;x+=1.5)if(Math.abs(x)>5)B(x,2.75,-8.03,0.05,4.5,0.05,PALE2,ST);
  B(0,8,0,32,6,16,PALE,ST);B(0,5.15,0,32.4,0.3,16.4,PALE2,ST);
  const F=K.walls(-16,16,-8,8);
  // windows: tall, with stone surrounds and alternate triangular and segmental pediments; small ones below
  for(const f of [F.front,F.back])for(let u=-13.5;u<=13.5;u+=3){if(f===F.front&&Math.abs(u)<5)continue;fb(f,u,8,0.02,1.3,3.2,0.05,[0.2,0.24,0.28],2);for(const e of [-1,1])fb(f,u+e*0.8,8,0.06,0.25,3.6,0.12,PALE2,ST);fb(f,u,6.1,0.1,1.9,0.18,0.25,PALE2,ST);
    const c=fp(f,u,10.15,0.12);if((Math.round(u/3)&1)===0){tri([c[0]-f.t[0]*1.1,10.1,c[2]-f.t[2]*1.1],[c[0]+f.t[0]*1.1,10.1,c[2]+f.t[2]*1.1],[c[0],10.7,c[2]],PALE2,ST);}else fb(f,u,10.2,0.12,2.2,0.22,0.25,PALE2,ST);
    fb(f,u,2.8,0.02,1,1.8,0.05,[0.2,0.24,0.28],2);for(let k=-1;k<=1;k++)fb(f,u+k*0.35,2.8,0.05,0.05,1.8,0.04,[0.15,0.15,0.15],11);}
  for(const f of [F.left,F.right])for(let u=-5;u<=5;u+=3.3){fb(f,u,8,0.02,1.3,3.2,0.05,[0.2,0.24,0.28],2);for(const e of [-1,1])fb(f,u+e*0.8,8,0.06,0.25,3.6,0.12,PALE2,ST);}
  // cornice, frieze and balustrade, the slate roof
  B(0,11.15,0,32.8,0.3,16.8,PALE2,ST);B(0,11.45,0,33.2,0.3,17.2,PALE,ST);for(const [z,w] of [[-8.3,32],[8.3,32]]){B(0,11.7,z,w,0.12,0.4,PALE2,ST);B(0,12.55,z,w,0.14,0.42,PALE2,ST);for(let x=-15.7;x<=15.7;x+=0.45)cyl([x,11.75,z],[x,12.5,z],0.1,0.08,6,PALE,ST);}
  for(const [x] of [[-16.3],[16.3]]){B(x,11.7,0,0.4,0.12,16.2,PALE2,ST);B(x,12.55,0,0.42,0.14,16.2,PALE2,ST);for(let z=-7.8;z<=7.8;z+=0.45)cyl([x,11.75,z],[x,12.5,z],0.1,0.08,6,PALE,ST);}
  P.roof([0,0],[1,0],15.4,7.6,11.6,2.6,{nx:40});
  // the portico: steps, six columns with bases and capitals, entablature, pediment with a carved roundel
  for(let k=0;k<4;k++)B(0,0.5+k*0.25,-9.5-k*0.0,11.2-k*0.3,0.25,3+(3-k)*0.6,PALE2,ST);
  for(let k=0;k<6;k++){const x=-5+k*2;cyl([x,1.4,-10],[x,1.8,-10],0.62,0.55,12,PALE2,ST);cyl([x,1.8,-10],[x,9.6,-10],0.45,0.38,14,PALE,ST,null,null,undefined,true);cyl([x,9.6,-10],[x,10.1,-10],0.42,0.65,12,PALE2,ST);B(x,10.25,-10,1.4,0.3,1.4,PALE2,ST);}
  B(0,10.85,-9.3,12.4,0.9,2.4,PALE,ST);B(0,11.45,-9.3,12.8,0.3,2.7,PALE2,ST);tri([-6.4,11.6,-10.6],[6.4,11.6,-10.6],[0,14,-10.6],PALE,ST);tri([6.4,11.6,-8],[-6.4,11.6,-8],[0,14,-8],PALE,ST);
  for(const e of [-1,1]){const a=[e*6.5,11.6,-10.7],b=[0,14.1,-10.7];K.beam(a,b,[0,0,1],0.3,0.35,PALE2,ST);K.beam([e*6.5,11.6,-8],[0,14.1,-8],[0,0,1],0.3,0.35,PALE2,ST);K.quad([e*6.5,11.75,-10.6],[e*6.5,11.75,-7.9],[0,14.25,-7.9],[0,14.25,-10.6],null,[0.36,0.39,0.43],18);}
  cyl([0,12.4,-10.62],[0,12.4,-10.7],0.7,0.7,16,PALE2,ST);cyl([0,12.4,-10.7],[0,12.4,-10.75],0.45,0.45,16,[0.72,0.58,0.3],11);
  B(0,4,-8.08,2.6,4,0.1,[0.24,0.12,0.08],6);
  // the flag, the bullion yard behind with its wall and iron gates
  cyl([0,12.6,4],[0,18.5,4],0.1,0.08,6,[0.55,0.55,0.53],11);K.quad([0,18.4,4],[0,17.2,4],[1.9,17.2,4.05],[1.9,18.4,4.05],null,[0.72,0.1,0.1],0);
  for(const [x0,x1,z0,z1] of [[-16,16,17,17.5],[-16,-15.5,8,17.5],[15.5,16,8,17.5]])B((x0+x1)/2,1.4,(z0+z1)/2,x1-x0,2.8,z1-z0,PALE2,ST);
  for(let x=-3;x<=3;x+=0.25)cyl([x,0,17.25],[x,2.6,17.25],0.03,0.03,4,[0.1,0.1,0.1],11);B(0,0.25,17.25,6.2,0.1,0.1,[0.1,0.1,0.1],11);B(0,2.4,17.25,6.2,0.1,0.1,[0.1,0.1,0.1],11);
  return{};};
// ---- the diamond-cutting works
KIT.models.factDiamond=function(K){K.seed(1104);const T=tools(K),{P,S,B,fb,winRow,stack}=T;
  // the workshop: three storeys, big multi-pane windows (cutters need light), stone bands, slate roof, gables
  {const F=P.block(-18,2,-8,8,0,11,{bands:[3.7,7.4]});for(const f of [F.front,F.back])for(let u=-8;u<=8;u+=2.6)for(const y of [0.9,4.6,8.3]){fb(f,u,y+1.15,0.02,1.9,2.3,0.05,[0.55,0.6,0.62],2);for(let k=-1;k<=1;k++)fb(f,u+k*0.48,y+1.15,0.05,0.05,2.3,0.05,[0.85,0.84,0.8],0);fb(f,u,y+1.15,0.05,1.9,0.05,0.05,[0.85,0.84,0.8],0);fb(f,u,y,0.1,2.2,0.15,0.22,S.STONE,8);fb(f,u,y+2.4,0.06,2.1,0.25,0.12,S.BRICK2,24);}
    winRow(F.left,-4,4,4,1.2,1.2,2.4);P.door(F.right,-5,0,1.8,3.2);
    const rf=P.roof([-8,0],[1,0],10,8,11,3.6,{nx:34});P.gable(F.left,8,11,14.6);P.gable(F.right,8,11,14.6);P.barge(rf,-1,{spike:0.9});P.barge(rf,1,{spike:0.9});P.crest(rf,-9,9);P.chimney(-15,4,11,15.6,0.9,0.7,2);}
  // the cutting shop: brick walls under a north-light roof, steep glazed faces toward +z, slate on the others
  {const x0=2,x1=18,z0=-8,z1=8,h=4.6;P.block(x0,x1,z0,z1,0,h,{});const n=4,w=(z1-z0)/n;for(let k=0;k<n;k++){const za=z0+k*w,zb=za+w;
      K.quad([x0,h,za],[x1,h,za],[x1,h+2.6,zb],[x0,h+2.6,zb],null,[0.36,0.39,0.43],18);K.quad([x1,h,zb],[x0,h,zb],[x0,h+2.6,zb],[x1,h+2.6,zb],null,[0.5,0.6,0.66],2);
      for(let x=x0+1;x<x1;x+=1.2)B(x,h+1.3,zb+0.02,0.06,2.6,0.06,[0.15,0.15,0.15],11);K.tri([x0,h,za],[x0,h,zb],[x0,h+2.6,zb],S.BRICK,24);K.tri([x1,h,zb],[x1,h,za],[x1,h+2.6,zb],S.BRICK,24);}
    const F=K.walls(x0,x1,z0,z1);winRow(F.front,-6,6,3,1,1.3,2.6);}
  stack(15,12,16,1.4);
  // the yard wall and the gate
  for(const [x0,x1,z0,z1] of [[-20,20,-14,-13.6],[-20,-19.6,-14,8],[19.6,20,-14,8]])B((x0+x1)/2,1.1,(z0+z1)/2,x1-x0,2.2,z1-z0,S.BRICK,24);return{};};
// the plot each stands on (Life.factories levels it) and its goods sidings
KIT.FACT={hx:24,hz:18,slots:34};
})();
