// ===== buildings/farm.js — the farmstead with a grain tower (user's reference picture, Nov 2026).
// farmstead: a red-brick Victorian farmhouse (slate roofs, white bargeboards, green shutters, three chimneys, a wrap-round veranda),
//   a brick outbuilding with green doors, an open timber tractor shed with an old red tractor, crates and ladders, a cobbled and
//   trodden yard, picket and rail fences, flower beds, a bird bath, trees.
// grainTower: the grain elevator: brick base with green doors and lamps, a braced timber stage, a railed gallery, a cabin under a
//   slate pyramid roof with a cupola and weathervane, a brick lean-to, a steel silo on a trestle, the arm's machine house.
// grainArm: the loading arm alone (the game turns it): a lattice boom from the machine house down to a hopper head and spout.
// Frames: farmstead: plot centre at the origin, front = -z. grainTower: tower centre at the origin, the track lies along x at
// z = -KIT.GRAIN.track. grainArm: the pivot's foot at the origin, the boom points to -z, the spout hangs KIT.GRAIN.reach out.
(function(){
const BRICK=[0.6,0.3,0.2],BRICKD=[0.5,0.25,0.17],SLATE={pal:[[0.27,0.27,0.31],[0.23,0.23,0.27],[0.31,0.3,0.34],[0.25,0.25,0.28],[0.29,0.27,0.3]],fresh:[0.32,0.32,0.36],aged:[0.21,0.21,0.24],missing:0,w:[0.3,0.44],exp:0.27,len:0.5,wideP:0},SLC=[0.27,0.27,0.31],
  WHITE=[0.9,0.88,0.82],GREEN=[0.23,0.36,0.24],WOOD=[0.55,0.4,0.26],WOODD=[0.38,0.27,0.18],WOODL=[0.68,0.52,0.34],IRON=[0.2,0.2,0.22],STEEL=[0.56,0.57,0.6],
  STONE=[0.62,0.6,0.55],STONED=[0.5,0.48,0.45],RED=[0.62,0.14,0.11],TYRE=[0.13,0.13,0.14],DIRT=[0.58,0.47,0.34],COB=[0.55,0.5,0.44];
KIT.GRAIN={pivot:[0,9.1,-3.7],reach:8,tipY:4.55,track:11.7,swing:6.6};
Object.assign(KIT.plots,{farmstead:{x0:-27,x1:27,z0:-18.5,z1:19},grainTower:{x0:-9,x1:9,z0:-9,z1:7},grainArm:{x0:-4,x1:4,z0:-12,z1:3},farmAll:null});
// move everything built since vertex float v0 to (ox,oz), turned ry about y
function place(K,v0,ox,oz,ry){const V=K.VB,c=Math.cos(ry||0),s=Math.sin(ry||0);for(let i=v0;i<V.length;i+=16){const x=V[i],z=V[i+2],nx=V[i+3],nz=V[i+5];V[i]=ox+c*x-s*z;V[i+2]=oz+s*x+c*z;V[i+3]=c*nx-s*nz;V[i+5]=s*nx+c*nz;}}
// mirror everything built since vertex float v0 in x (triangles re-wound so they still face out)
function mirror(K,v0){const V=K.VB;for(let i=v0;i<V.length;i+=16){V[i]=-V[i];V[i+3]=-V[i+3];}for(let i=v0;i+48<=V.length;i+=48)for(let k=0;k<16;k++){const t=V[i+16+k];V[i+16+k]=V[i+32+k];V[i+32+k]=t;}}
function pyramid(K,cx,cz,half,y0,rise,col,m){const {tri}=K,t=[cx,y0+rise,cz],a=[cx-half,y0,cz-half],b=[cx+half,y0,cz-half],c=[cx+half,y0,cz+half],d=[cx-half,y0,cz+half];tri(b,a,t,col,m);tri(c,b,t,col,m);tri(d,c,t,col,m);tri(a,d,t,col,m);
  K.quad(a,b,c,d,null,WOODD,12);}
function railFence(K,pts,h,col){const {B,beam}=K;for(let i=0;i<pts.length;i++){const p=pts[i];B(p[0],h/2,p[1],0.14,h,0.14,col,6);if(i+1<pts.length){const q=pts[i+1];for(const y of [h*0.45,h*0.85])beam([p[0],y,p[1]],[q[0],y,q[1]],[0,1,0],0.09,0.05,col,6);}}}
function picket(K,a,b,h){const {B,beam}=K,L=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(2,Math.round(L/0.28)),ry=-Math.atan2(b[1]-a[1],b[0]-a[0]);for(const y of [h*0.3,h*0.75])beam([a[0],y,a[1]],[b[0],y,b[1]],[0,1,0],0.06,0.04,WHITE,0);
  if(K.lod<2)for(let k=0;k<=n;k++){const t=k/n;B(a[0]+(b[0]-a[0])*t,h/2,a[1]+(b[1]-a[1])*t,0.09,h,0.03,WHITE,0,ry);}for(const p of [a,b])B(p[0],h*0.55,p[1],0.13,h*1.1,0.13,WHITE,0);}
// ---------------- the farmhouse (front = -z), centre of the main block at the origin
function house(K){const {B,beam,cyl,quad,tri,fp,fb}=K;const X0=-7,X1=7,Z0=-3.5,Z1=3.5,FL=0.55,EV=6.0,RISE=3.3,F=K.walls(X0,X1,Z0,Z1);
  B(0,EV/2,0,14,EV,7,BRICK,24);B(0,FL/2,0,14.16,FL,7.16,STONE,8);for(const f of [F.front,F.back,F.left,F.right])fb(f,0,3.1,0.03,f.half*2+0.08,0.16,0.08,WHITE,0);
  const win=(f,u,y,w,h,sh)=>{K.win(f,u,y,w,h,{cols:2,rows:3,frame:WHITE});if(sh!==false&&K.lod<2)for(const e of [-1,1])fb(f,u+e*(w/2+0.24),y+h/2,0.04,0.42,h,0.05,GREEN,0);fb(f,u,y+h+0.12,0.03,w+0.3,0.2,0.06,WHITE,0);};
  const door=(f,u,w,h)=>{fb(f,u,FL+h/2,0.03,w,h,0.08,GREEN,0);fb(f,u,FL+h+0.1,0.05,w+0.3,0.2,0.1,WHITE,0);for(const e of [-1,1])fb(f,u+e*(w/2+0.08),FL+h/2,0.05,0.14,h,0.1,WHITE,0);};
  // the wing to the front on the left, with the big gable
  const WX0=-6,WX1=-1,WZ0=-6,W=K.walls(WX0,WX1,WZ0,Z0),wc=(WX0+WX1)/2;B(wc,EV/2,(WZ0+Z0)/2,5,EV,Z0-WZ0,BRICK,24);B(wc,FL/2,(WZ0+Z0)/2,5.16,FL,Z0-WZ0+0.16,STONE,8);
  win(W.front,0,FL+0.9,1.1,1.7);win(W.front,0,3.7,1.0,1.5);win(W.left,0,FL+0.9,0.9,1.6);win(W.right,0,3.7,0.8,1.4,false);
  // main block: door and windows under the veranda, a row above; sides and back
  door(F.front,1.2,1.1,2.2);for(const u of [3.4,5.6])win(F.front,u,FL+0.9,1.0,1.7);for(const u of [1.2,5.6])win(F.front,u,3.7,0.95,1.5);
  for(const u of [-4.5,-1.5,1.5,4.5]){win(F.back,u,FL+0.9,1.0,1.7);win(F.back,u,3.7,0.95,1.5);}
  for(const f of [F.left,F.right])for(const u of [-1.6,1.6]){win(f,u,FL+0.9,0.95,1.7);win(f,u,3.7,0.9,1.5);}
  // roofs: main ridge along x, the wing's and the front dormer gable's ridges along z; slate, white bargeboards
  K.roof({c:[0,0],dir:[1,0],halfLen:7,half:3.5,H:EV,rise:RISE,ov:0.5,gov:0.45,th:0.14,sag:0.05,flare:0.04,wob:0.01,nx:26,ridgeMoss:0,cover:SLATE,trim:WHITE});
  tri([X0,EV,Z0],[X0,EV,Z1],[X0,EV+RISE,0],BRICK,24);tri([X1,EV,Z1],[X1,EV,Z0],[X1,EV+RISE,0],BRICK,24);
  for(const [x,z] of [[X0-0.01,0],[X1+0.01,0]])cyl([x-0.02,EV+1.7,z],[x+0.02,EV+1.7,z],0.4,0.4,10,[0.2,0.2,0.22],2,[0.2,0.2,0.22],2);
  K.roof({c:[wc,(WZ0+0)/2],dir:[0,1],halfLen:(0-WZ0)/2,half:2.5,H:EV,rise:2.7,ov:0.45,gov:0.45,th:0.13,sag:0.03,flare:0.03,wob:0.01,nx:14,ends:[-1],ridgeMoss:0,cover:SLATE,trim:WHITE});
  tri([WX1,EV,WZ0],[WX0,EV,WZ0],[wc,EV+2.7,WZ0],BRICK,24);K.win(W.front,0,EV+0.5,0.7,1.0,{cols:2,rows:2,frame:WHITE});
  if(K.lod<1)for(let k=0;k<9;k++){const u=(k+0.5)/9*5-2.5,y=EV+2.7*(1-Math.abs(u)/2.5)-0.42;K.ico(fp(W.front,u,y,0.5),0.08,WHITE,0,{sy:0.6});}
  {const dx=3.4;B(dx,EV+0.55,Z0+0.25,2.6,1.1,0.5,BRICK,24);K.roof({c:[dx,Z0+1.6],dir:[0,1],halfLen:1.7,half:1.5,H:EV+0.2,rise:1.9,ov:0.25,gov:0.12,th:0.1,sag:0,flare:0,wob:0,nx:6,ends:[-1],ridgeMoss:0,cover:SLATE,trim:WHITE});
    tri([dx+1.3,EV+0.2,Z0-0.01],[dx-1.3,EV+0.2,Z0-0.01],[dx,EV+1.85,Z0-0.01],BRICK,24);K.win(F.front,dx,EV-0.35,0.8,1.2,{cols:2,rows:2,frame:WHITE});}
  // three brick chimneys with stone caps and pots
  for(const [x,z] of [[-5.3,0.2],[0.6,0.4],[5.4,-0.2]]){B(x,EV+RISE+0.1,z,0.95,2.4,0.75,BRICKD,24);B(x,EV+RISE+1.36,z,1.15,0.14,0.95,STONE,8);for(const e of [-0.24,0.24])cyl([x+e,EV+RISE+1.42,z],[x+e,EV+RISE+1.85,z],0.14,0.12,8,[0.62,0.34,0.24],18);}
  // the veranda: along the front beside the wing and round the right-hand side; slate lean-to roof on white posts, railings, steps
  const PX0=WX1,PX1=8.7,PZ0=-6.2,PZs=1.2,RY0=3.75,RY1=3.0;
  B((PX0+PX1)/2,FL/2-0.03,(PZ0+Z0)/2,PX1-PX0,FL-0.06,Z0-PZ0,WOODL,12);B((X1+PX1)/2,FL/2-0.03,(Z0+PZs)/2,PX1-X1,FL-0.06,PZs-Z0,WOODL,12);
  const posts=[];for(const x of [PX0+0.15,1.5,3.9,6.3,PX1-0.15])posts.push([x,PZ0+0.15]);for(const z of [-3.8,-1.4,PZs-0.15])posts.push([PX1-0.15,z]);
  for(const [x,z] of posts){B(x,(FL+RY1)/2,z,0.15,RY1-FL,0.15,WHITE,0);if(K.lod<2)for(const e of [-1,1]){beam([x,RY1-0.12,z],[x+(z<PZ0+0.3?e*0.42:0),RY1-0.55,z+(z<PZ0+0.3?0:e*0.42)],[0,1,0],0.05,0.05,WHITE,0);}}
  quad([PX0-0.2,RY1,PZ0-0.3],[PX0-0.2,RY0,Z0],[PX1+0.3,RY0,Z0],[PX1+0.3,RY1,PZ0-0.3],null,SLC,20);quad([PX0-0.2,RY1-0.1,PZ0-0.3],[PX1+0.3,RY1-0.1,PZ0-0.3],[PX1+0.3,RY0-0.1,Z0],[PX0-0.2,RY0-0.1,Z0],null,WHITE,0);
  quad([X1,RY0,Z0],[X1,RY0,PZs+0.3],[PX1+0.3,RY1,PZs+0.3],[PX1+0.3,RY1,Z0],null,SLC,20);quad([X1,RY0-0.1,Z0],[PX1+0.3,RY1-0.1,Z0],[PX1+0.3,RY1-0.1,PZs+0.3],[X1,RY0-0.1,PZs+0.3],null,WHITE,0);
  beam([PX0,RY1-0.08,PZ0+0.15],[PX1,RY1-0.08,PZ0+0.15],[0,1,0],0.22,0.12,WHITE,0);beam([PX1-0.15,RY1-0.08,PZ0],[PX1-0.15,RY1-0.08,PZs],[0,1,0],0.22,0.12,WHITE,0);
  const rail=(a,b)=>{beam([a[0],FL+0.9,a[1]],[b[0],FL+0.9,b[1]],[0,1,0],0.08,0.06,WHITE,0);beam([a[0],FL+0.15,a[1]],[b[0],FL+0.15,b[1]],[0,1,0],0.06,0.05,WHITE,0);if(K.lod<1){const L=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.round(L/0.2);for(let k=1;k<n;k++)B(a[0]+(b[0]-a[0])*k/n,FL+0.52,a[1]+(b[1]-a[1])*k/n,0.035,0.72,0.035,WHITE,0);}};
  rail(posts[0],posts[1]);rail(posts[2],posts[3]);rail(posts[3],posts[4]);rail(posts[4],posts[5]);rail(posts[5],posts[6]);rail(posts[6],posts[7]);
  for(let k=0;k<3;k++)B(2.7,FL-0.09-k*0.18,PZ0-0.2-k*0.32,2.2,0.18,0.34,STONE,8);
  // on the veranda: a bench, tubs of flowers
  B(4.9,FL+0.42,Z0-0.4,1.6,0.08,0.45,WOODD,6);B(4.9,FL+0.75,Z0-0.2,1.6,0.5,0.06,WOODD,6);for(const e of [-0.7,0.7])B(4.9+e,FL+0.2,Z0-0.4,0.08,0.4,0.4,WOODD,6);
  for(const [x,z] of [[-0.4,PZ0+0.5],[7.9,-5.6],[7.9,0.4]]){cyl([x,FL,z],[x,FL+0.4,z],0.26,0.3,10,[0.6,0.36,0.25],18);K.bush(x,z,0.34,[0.3,0.5,0.22],[[0.85,0.3,0.35],[0.95,0.8,0.4],[0.9,0.6,0.75]]);}}
// ---------------- the brick outbuilding (front = -z)
function outb(K){const {B,fb,tri}=K,X0=-4.5,X1=4.5,Z0=-3,Z1=3,EV=3.3,RISE=2.3,F=K.walls(X0,X1,Z0,Z1);B(0,EV/2,0,9,EV,6,BRICK,24);B(0,0.2,0,9.14,0.4,6.14,STONE,8);
  for(const u of [-0.75,0.75]){fb(F.front,u+0.6,1.3,0.03,1.4,2.5,0.08,GREEN,0);if(K.lod<2){fb(F.front,u+0.6,0.6,0.07,1.3,0.1,0.04,[0.17,0.27,0.18],0);fb(F.front,u+0.6,2.0,0.07,1.3,0.1,0.04,[0.17,0.27,0.18],0);}}
  fb(F.front,0.6,2.65,0.05,3.2,0.2,0.1,WHITE,0);K.win(F.front,-3.1,1.3,0.9,1.1,{cols:2,rows:2,frame:WHITE});K.win(F.right,0,1.3,0.9,1.1,{cols:2,rows:2,frame:WHITE});K.win(F.back,-2,1.3,0.9,1.1,{cols:2,rows:2,frame:WHITE});K.win(F.back,2,1.3,0.9,1.1,{cols:2,rows:2,frame:WHITE});
  fb(F.front,3.6,2.6,0.25,0.16,0.3,0.16,IRON,11);fb(F.front,3.6,2.4,0.25,0.22,0.22,0.22,K.C.glow,3);
  K.roof({c:[0,0],dir:[1,0],halfLen:4.5,half:3,H:EV,rise:RISE,ov:0.45,gov:0.4,th:0.13,sag:0.05,flare:0.04,wob:0.01,nx:18,ridgeMoss:0,cover:SLATE,trim:WOODD});
  tri([X0,EV,Z0],[X0,EV,Z1],[X0,EV+RISE,0],BRICK,24);tri([X1,EV,Z1],[X1,EV,Z0],[X1,EV+RISE,0],BRICK,24);
  K.barrel(-2.2,-3.7,0.38,0.95);K.barrel(-1.4,-3.9,0.38,0.95);K.barrel(-1.9,-4.5,0.36,0.9);K.crate(3.2,0,-3.8,0.8,0.2);K.crate(4.0,0,-3.6,0.7,-0.3);K.crate(3.5,0.8,-3.7,0.6,0.5);}
// ---------------- the old red tractor (nose to +x), its rear axle at the origin
function tractor(K){const {B,cyl,beam}=K;for(const e of [-1,1]){cyl([0,0.78,e*0.72],[0,0.78,e*1.06],0.78,0.78,16,TYRE,0,TYRE,0);cyl([0,0.78,e*1.06],[0,0.78,e*1.1],0.4,0.4,12,RED,0,RED,0);
    cyl([2.1,0.42,e*0.6],[2.1,0.42,e*0.82],0.42,0.42,12,TYRE,0,TYRE,0);cyl([2.1,0.42,e*0.82],[2.1,0.42,e*0.85],0.2,0.2,10,RED,0,RED,0);
    B(0,1.62,e*0.9,1.5,0.06,0.42,RED,0);B(-0.72,1.25,e*0.9,0.06,0.75,0.42,RED,0);}
  B(0.45,0.95,0,1.5,0.5,0.62,RED,0);B(1.65,1.18,0,1.5,0.62,0.6,RED,0);B(2.42,1.15,0,0.06,0.55,0.5,[0.25,0.25,0.26],11);B(2.1,0.5,0,0.2,0.2,1.3,IRON,11);B(0,0.78,0,0.25,0.25,1.5,IRON,11);
  cyl([1.5,1.5,0.2],[1.5,2.25,0.2],0.05,0.05,6,IRON,11);B(-0.25,1.42,0,0.5,0.1,0.5,[0.2,0.2,0.2],0);B(-0.5,1.7,0,0.08,0.5,0.46,[0.2,0.2,0.2],0);
  beam([0.5,1.25,0],[0.2,1.8,0],[0,0,1],0.04,0.04,IRON,11);cyl([0.2,1.8,-0.02],[0.16,1.84,0.02],0.22,0.22,10,IRON,11);for(const e of [-1,1])cyl([2.44,1.3,e*0.2],[2.47,1.3,e*0.2],0.08,0.08,8,[1,0.9,0.6],3,[1,0.9,0.6],3);}
// ---------------- the open tractor shed: ridge along x, the +x gable open with its truss showing
function shed(K){const {B,beam,quad,tri}=K,X0=-6.5,X1=6.5,Z0=-4.5,Z1=4.5,EV=3.5,RISE=2.6;
  for(const x of [X0+0.15,-2.2,2.2,X1-0.15])for(const z of [Z0+0.15,Z1-0.15]){B(x,EV/2,z,0.28,EV,0.28,WOODD,6);B(x,0.15,z,0.45,0.3,0.45,STONE,8);if(K.lod<2)for(const e of [-1,1])if(x+e>X0&&x+e<X1)beam([x,EV-0.9,z],[x+e*0.9,EV-0.05,z],[0,0,1],0.12,0.12,WOODD,6);}
  for(const z of [Z0+0.15,Z1-0.15])beam([X0,EV-0.1,z],[X1,EV-0.1,z],[0,1,0],0.24,0.22,WOODD,6);
  for(const x of [X0+0.15,-2.2,2.2,X1-0.15]){beam([x,EV-0.1,Z0],[x,EV-0.1,Z1],[0,1,0],0.2,0.2,WOODD,6);beam([x,EV,0],[x,EV+RISE-0.2,0],[1,0,0],0.16,0.16,WOODD,6);for(const e of [-1,1])beam([x,EV,e*2.4],[x,EV+RISE-0.9,0],[1,0,0],0.12,0.12,WOODD,6);}
  K.roof({c:[0,0],dir:[1,0],halfLen:6.5,half:4.5,H:EV,rise:RISE,ov:0.6,gov:0.5,th:0.13,sag:0.07,flare:0.05,wob:0.015,nx:24,ridgeMoss:0,cover:SLATE,trim:WOODD,rafters:1.1});
  // boarded back gable (-x) and a half-height plank wall along the back (+z)
  tri([X0,EV,Z0],[X0,EV,Z1],[X0,EV+RISE,0],WOOD,6);tri([X0,EV,Z1],[X0,EV,Z0],[X0,EV+RISE,0],WOOD,6);B(X0+0.05,EV/2,0,0.08,EV,Z1-Z0-0.3,WOOD,6);B(0,1.0,Z1-0.1,X1-X0-0.3,2.0,0.08,WOOD,6);
  if(K.lod<2){for(let z=Z0+0.5;z<Z1;z+=0.5)B(X0+0.0,EV/2,z,0.04,EV,0.06,WOODD,6);for(let x=X0+0.6;x<X1;x+=0.6)B(x,1.0,Z1-0.05,0.06,2.0,0.04,WOODD,6);}
  // inside: the tractor, crates, barrels, sacks, ladders against the posts
  {const v0=K.VB.length;tractor(K);place(K,v0,0.6,-0.6,-0.12);}
  K.crate(-5.4,0,2.9,0.9,0.1);K.crate(-4.4,0,3.2,0.8,-0.2);K.crate(-5.0,0.9,3.0,0.7,0.4);K.crate(-3.4,0,3.3,0.7,0.2);K.crate(-5.5,0,1.6,0.8,0);K.barrel(-5.4,-2.8,0.4,1.0);K.barrel(-4.5,-3.3,0.4,1.0);K.barrel(-5.5,-1.7,0.36,0.9);
  for(const [x,z] of [[-2.6,3.0],[-1.6,3.2],[-2.0,2.4]])K.ico([x,0.28,z],0.42,[0.78,0.68,0.5],0,{sy:0.65,detail:1,jit:0.1});
  for(const lx of [4.6,5.5]){for(const e of [-0.22,0.22])beam([lx+e,0,Z1-1.3],[lx+e,3.3,Z1-0.3],[1,0,0],0.06,0.06,WOODL,6);if(K.lod<2)for(let k=1;k<10;k++)beam([lx-0.22,k*0.33,Z1-1.3+k*0.1],[lx+0.22,k*0.33,Z1-1.3+k*0.1],[0,1,0],0.04,0.04,WOODL,6);}}
KIT.models.farmstead=function(K,opt){const {B,cyl}=K;let v0;const m0=K.VB.length;
  v0=K.VB.length;house(K);place(K,v0,-10,9.5,0);
  v0=K.VB.length;outb(K);place(K,v0,8,12,0);
  v0=K.VB.length;shed(K);place(K,v0,-12,-10.5,0);
  // the yard: trodden earth with a cobbled middle, a path to the veranda steps
  K.patch(2,-1,11,8,DIRT,10,0.012);K.patch(3,-2,6,4.5,COB,19,0.02);K.patch(-11,-10.5,7.5,5.2,DIRT,10,0.014);K.patch(-7.3,1.5,1.6,2.6,COB,19,0.018);K.patch(8,7,4,2.6,DIRT,10,0.016);K.dirt(6,-6,2.2);K.dirt(-2,-4,1.8);
  // white picket fence round the front garden, flower beds along the house, a bird bath
  picket(K,[-19.5,2.2],[-9.2,2.2],1.0);picket(K,[-5.4,2.2],[-0.6,2.2],1.0);picket(K,[-19.5,2.2],[-19.5,13.5],1.0);picket(K,[-0.6,2.2],[1.6,5.8],1.0);
  const FL=[[0.85,0.3,0.35],[0.95,0.8,0.4],[0.9,0.6,0.75],[0.75,0.5,0.85]];for(const [x,z,r] of [[-17.6,4.6,0.55],[-18.2,7.4,0.6],[-17.9,10.3,0.5],[-8.6,3.3,0.45],[-3.6,3.0,0.5],[-1.6,3.4,0.42],[-11.6,3.0,0.4]])K.bush(x,z,r,[0.28,0.48,0.22],FL);
  cyl([-14.5,0,3.6],[-14.5,0.75,3.6],0.14,0.1,8,STONE,8);cyl([-14.5,0.75,3.6],[-14.5,0.9,3.6],0.2,0.5,12,STONE,8,STONED,8);
  // climbing roses on the house corner
  if(K.lod<2)for(let k=0;k<9;k++)K.ico([-3.05,0.9+k*0.5,5.9+((k*37)%5)*0.12-0.3],0.34,k%3?[0.26,0.46,0.2]:[0.85,0.35,0.45],1,{detail:1,jit:0.25});
  // rail fences round the yard, a field gate at the front
  railFence(K,[[-4.6,-15.2],[-0.8,-15.2],[3,-15.2]],1.15,WOODD);railFence(K,[[-20.4,-15.4],[-20.4,-10.5]],1.15,WOODD);
  K.barrel(5.5,-9.6,0.4,1.0);K.barrel(6.4,-9.9,0.4,1.0);K.crate(4.2,0,-10,0.9,0.15);K.crate(3.2,0,-10.2,0.8,-0.1);K.crate(3.8,0.9,-10.1,0.7,0.3);
  // a hand cart by the fence
  {const cx=0.5,cz=9.8;B(cx,0.75,cz,1.7,0.1,1.0,WOOD,6);for(const e of [-1,1]){B(cx,0.95,cz+e*0.5,1.7,0.35,0.05,WOOD,6);cyl([cx-0.1,0.5,cz+e*0.56],[cx-0.1,0.5,cz+e*0.62],0.5,0.5,12,WOODD,6,WOODD,6);}}
  K.tree(-23,13.5,1.9);K.tree(-1.5,16.2,2.0);K.tree(-12,17,1.7);
  mirror(K,m0);/* as in the picture: seen from the track, the house and the shed stand on the left, the yard opens to the right */
  if(!opt.game)B(0,-0.2,0,19.9*2,0.36,19.9*2,[0.42,0.5,0.28],9);
  return{target:[2,3,0],dist:62,dir:[0.55,0.62,-0.62]};};
// ---------------- the grain tower (the track side = -z)
function tower(K){const m0=K.VB.length;towerR(K);mirror(K,m0);}
function towerR(K){const {B,beam,cyl,quad,fb,fp}=K,HB=6.2,HT=10.4,HC=13.2,W0=3.25,W1=3.45,F=K.walls(-W0,W0,-W0,W0),T=K.walls(-W1,W1,-W1,W1);
  // brick base on a stone plinth, a stone band, green double doors under a lamp each side, small arched windows
  B(0,HB/2,0,2*W0,HB,2*W0,BRICK,24);B(0,0.35,0,2*W0+0.2,0.7,2*W0+0.2,STONE,8);for(const f of [F.front,F.back,F.left,F.right])fb(f,0,HB-0.1,0.04,2*W0+0.1,0.2,0.1,STONE,8);
  for(const e of [-1,1]){fb(F.front,e*0.62,2.05,0.03,1.2,2.7,0.08,GREEN,0);if(K.lod<2){beam(fp(F.front,e*0.62-0.5,0.8,0.08),fp(F.front,e*0.62+0.5,3.3,0.08),F.front.n,0.1,0.03,[0.17,0.27,0.18],0);fb(F.front,e*0.62,0.8,0.07,1.1,0.1,0.03,[0.17,0.27,0.18],0);fb(F.front,e*0.62,3.3,0.07,1.1,0.1,0.03,[0.17,0.27,0.18],0);}
    fb(F.front,e*2.2,3.3,0.22,0.14,0.3,0.14,IRON,11);fb(F.front,e*2.2,3.05,0.22,0.24,0.26,0.24,K.C.glow,3);}
  fb(F.front,0,3.5,0.05,2.8,0.2,0.1,STONE,8);K.win(F.front,0,4.4,0.8,1.1,{cols:2,rows:2,frame:WHITE});for(const f of [F.left,F.right,F.back]){K.win(f,0,1.6,0.8,1.2,{cols:2,rows:2,frame:WHITE});K.win(f,0,4.3,0.8,1.1,{cols:2,rows:2,frame:WHITE});}
  // the timber stage: boards, a heavy frame with crossed braces on every face
  B(0,(HB+HT)/2,0,2*W1,HT-HB,2*W1,WOOD,6);
  for(const f of [T.front,T.back,T.left,T.right]){for(const u of [-W1+0.12,0,W1-0.12])fb(f,u,(HB+HT)/2,0.05,0.24,HT-HB,0.1,WOODD,6);for(const y of [HB+0.12,(HB+HT)/2,HT-0.12])fb(f,0,y,0.05,2*W1,0.22,0.1,WOODD,6);
    if(K.lod<2)for(const e of [-1,1])for(const [ya,yb] of [[HB+0.2,(HB+HT)/2-0.1],[(HB+HT)/2+0.1,HT-0.2]]){const u0=e*0.15,u1=e*(W1-0.25);beam(fp(f,u0,ya,0.07),fp(f,u1,yb,0.07),f.n,0.12,0.05,WOODD,6);beam(fp(f,u1,ya,0.07),fp(f,u0,yb,0.07),f.n,0.12,0.05,WOODD,6);}
    if(K.lod<1)for(let u=-W1+0.4;u<W1;u+=0.4)fb(f,u,(HB+HT)/2,0.015,0.03,HT-HB,0.03,WOODD,6);}
  // the gallery: a deck on brackets with a railing all round
  const G=4.35;B(0,HT+0.08,0,2*G,0.16,2*G,WOODL,12);for(const f of [T.front,T.back,T.left,T.right])for(const u of [-2.6,0,2.6])beam(fp(f,u,HT-0.9,0.02),fp(f,u,HT,G-W1-0.1),f.t,0.12,0.12,WOODD,6);
  {const c=[[-G,-G],[G,-G],[G,G],[-G,G]];for(let i=0;i<4;i++){const a=c[i],b=c[(i+1)%4];for(let k=0;k<4;k++){const t=k/4;B(a[0]+(b[0]-a[0])*t,HT+0.7,a[1]+(b[1]-a[1])*t,0.1,1.1,0.1,WOODD,6);}
      for(const y of [HT+0.65,HT+1.2])beam([a[0],y,a[1]],[b[0],y,b[1]],[0,1,0],0.08,0.07,WOODD,6);}}
  // the cabin with windows, the slate pyramid roof, the cupola and the weathervane
  const WC=2.7,C=K.walls(-WC,WC,-WC,WC);B(0,(HT+HC)/2,0,2*WC,HC-HT,2*WC,WOODL,6);for(const f of [C.front,C.back,C.left,C.right]){for(const u of [-1.2,1.2])K.win(f,u,HT+1.0,0.8,1.2,{cols:2,rows:2,frame:WHITE});for(const u of [-WC+0.1,WC-0.1])fb(f,u,(HT+HC)/2,0.04,0.2,HC-HT,0.08,WOODD,6);fb(f,0,HC-0.1,0.04,2*WC,0.2,0.08,WOODD,6);}
  pyramid(K,0,0,3.7,HC,2.9,SLC,20);if(K.lod<2)for(let k=1;k<6;k++){const h=3.7*(1-k/6)+0.02,y=HC+2.9*k/6;for(const [dx,dz] of [[0,1],[0,-1],[1,0],[-1,0]])B(dx*h,y,dz*h,dx?0.05:2*h,0.05,dz?0.05:2*h,[0.22,0.22,0.26],20);}
  const CY=HC+2.3;B(0,CY+0.55,0,1.35,1.1,1.35,WOODL,6);if(K.lod<2)for(let k=0;k<4;k++)for(const [dx,dz] of [[0,1],[0,-1],[1,0],[-1,0]])B(dx*0.69,CY+0.25+k*0.22,dz*0.69,dx?0.04:1.0,0.08,dz?0.04:1.0,WOODD,6);
  pyramid(K,0,0,1.0,CY+1.1,0.8,SLC,20);cyl([0,CY+1.8,0],[0,CY+3.1,0],0.035,0.02,6,IRON,11);beam([-0.55,CY+2.75,0],[0.55,CY+2.75,0],[0,1,0],0.05,0.02,IRON,11);B(0.55,CY+2.75,0,0.22,0.2,0.02,IRON,11);B(-0.1,CY+3.02,0,0.34,0.24,0.02,IRON,11);
  // brick lean-to on the left, the steel silo on a trestle on the right with its pipe into the tower
  {const x0=-W0-3.6,x1=-W0,z0=-1.2,z1=3.0,h0=3.4,h1=2.5;B((x0+x1)/2,h1/2,(z0+z1)/2,x1-x0,h1,z1-z0,BRICK,24);quad([x0-0.3,h1-0.05,z0-0.3],[x0-0.3,h1-0.05,z1+0.3],[x1,h0,z1+0.3],[x1,h0,z0-0.3],null,SLC,20);
const L=K.face([(x0+x1)/2,0,z0],[0,0,-1],[1,0,0],(x1-x0)/2);fb(L,0,1.1,0.03,1.1,2.2,0.08,GREEN,0);}
  {const sx=W0+2.6,sz=1.0,r=1.55,y0=3.2,y1=7.6;for(const [dx,dz] of [[-1,-1],[1,-1],[1,1],[-1,1]]){B(sx+dx*1.2,y0/2,sz+dz*1.2,0.2,y0,0.2,WOODD,6);}
    if(K.lod<2)for(const e of [-1,1]){beam([sx-1.2,0.3,sz+e*1.2],[sx+1.2,y0-0.3,sz+e*1.2],[0,0,1],0.1,0.1,WOODD,6);beam([sx+e*1.2,0.3,sz+1.2],[sx+e*1.2,y0-0.3,sz-1.2],[1,0,0],0.1,0.1,WOODD,6);}
    B(sx,y0+0.08,sz,2.9,0.16,2.9,WOODL,12);cyl([sx,y0+0.16,sz],[sx,y1,sz],r,r,18,STEEL,11,STEEL,11,undefined,true);for(const y of [y0+0.5,(y0+y1)/2,y1-0.3])cyl([sx,y,sz],[sx,y+0.1,sz],r+0.04,r+0.04,18,[0.42,0.43,0.46],11);
    cyl([sx,y1,sz],[sx,y1+0.9,sz],r+0.05,0.25,18,[0.48,0.49,0.52],11,undefined,undefined,undefined,true);cyl([sx-r+0.2,y1-0.6,sz],[W1-0.1,HB+2.2,sz],0.16,0.16,8,STEEL,11);}
  // the arm's machine house on the track side with its big sheave
  const Pv=KIT.GRAIN.pivot;B(0,Pv[1]-0.15,-W1-0.45,1.7,1.7,0.9,WOODD,6);cyl([-0.95,Pv[1],-W1-0.45],[-1.15,Pv[1],-W1-0.45],0.85,0.85,16,IRON,11,[0.3,0.3,0.32],11);cyl([-0.5,Pv[1],-W1-0.45],[-0.95,Pv[1],-W1-0.45],0.12,0.12,6,IRON,11);
  // the loading dock in front of the doors, crates and barrels
  B(0,0.25,-W0-1.6,5.2,0.5,3.0,STONED,8);K.barrel(-2.0,-W0-1.2,0.4,1.0,{y:0.5});K.barrel(-1.2,-W0-1.9,0.4,1.0,{y:0.5});K.crate(1.9,0.5,-W0-1.2,0.85,0.2);K.crate(1.3,0.5,-W0-2.2,0.7,-0.3);}
function arm(K){const {B,beam,cyl}=K,G=KIT.GRAIN,py=G.pivot[1],R0=G.reach,ty=G.tipY+1.25,N=7,A=(t,top,e)=>[e*0.38*(1-0.35*t),py+(ty-py)*t+(top?0.75-0.3*t:0),-R0*t];
  cyl([0,py-1.1,0],[0,py+1.2,0],0.2,0.2,8,IRON,11);
  for(const e of [-1,1]){beam(A(0,1,e),A(1,1,e),[0,1,0],0.09,0.09,STEEL,11);beam(A(0,0,e),A(1,0,e),[0,1,0],0.09,0.09,STEEL,11);
    for(let k=0;k<=N;k++){beam(A(k/N,0,e),A(k/N,1,e),[1,0,0],0.06,0.06,STEEL,11);if(k<N&&K.lod<2)beam(A(k/N,k%2?1:0,e),A((k+1)/N,k%2?0:1,e),[1,0,0],0.05,0.05,STEEL,11);}}
  for(let k=0;k<=N;k++)for(const top of [0,1])beam(A(k/N,top,-1),A(k/N,top,1),[0,1,0],0.05,0.05,STEEL,11);
  // the grain pipe inside the boom, the hopper head and the spout
  cyl([0,py+0.3,0],[0,ty+0.35,-R0],0.2,0.2,8,[0.45,0.46,0.5],11,undefined,undefined,undefined,true);
  B(0,ty+0.2,-R0,0.95,0.9,0.95,[0.47,0.48,0.52],11);cyl([0,ty-0.25,-R0],[0,ty-0.95,-R0],0.48,0.2,10,[0.42,0.43,0.47],11,undefined,undefined,undefined,true);cyl([0,ty-0.95,-R0],[0,G.tipY,-R0],0.2,0.17,8,IRON,11);
  // stay cables from the mast
  for(const e of [-1,1])cyl([0,py+1.2,0],A(0.72,1,e),0.025,0.025,4,IRON,11);}
KIT.models.grainTower=function(K,opt){tower(K);if(!opt.game){const v0=K.VB.length;arm(K);place(K,v0,KIT.GRAIN.pivot[0],KIT.GRAIN.pivot[2],0);K.B(0,-0.2,-3,24,0.36,24,[0.42,0.5,0.28],9);}return{target:[0,8,-2],dist:42,dir:[0.6,0.45,-0.66]};};
KIT.models.grainArm=function(K,opt){arm(K);return{target:[0,7,-4],dist:22,dir:[0.8,0.3,-0.5]};};
// the whole farm as in the picture (for looking at it only): the farmstead, the tower at its front right, a stretch of track bed
KIT.models.farmAll=function(K,opt){const cam=KIT.models.farmstead(K,{game:true}),{B}=K;let v0=K.VB.length;tower(K);place(K,v0,-14.5,-10.6,0);v0=K.VB.length;arm(K);place(K,v0,-14.5,-10.6+KIT.GRAIN.pivot[2],-0.5);
  const tz=-10.6-KIT.GRAIN.track;B(0,-0.2,-2,48,0.36,46,[0.42,0.5,0.28],9);B(0,0.1,tz,48,0.24,3.4,[0.5,0.47,0.43],10);for(const e of [-0.72,0.72])B(0,0.3,tz+e,48,0.14,0.08,IRON,11);for(let x=-23.5;x<24;x+=0.7)B(x,0.2,tz,0.24,0.1,2.4,WOODD,6);
  B(2,0.45,tz+3.6,34,0.9,3.6,[0.55,0.33,0.25],24);B(2,0.92,tz+3.6,34.2,0.08,3.8,STONE,8);
  return{target:[0,3,-6],dist:88,dir:[0.35,0.6,-0.72]};};
})();
