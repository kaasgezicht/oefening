'use strict';
// ===== buildings/farm.js — the farm with a grain tower (user's reference picture, Nov 2026), second build (4.11.0).
// Kit models, each with its own plot and detail levels (the game places them in the farm's frame, see Life.farmParts):
//   farmHouse  — a red-brick Victorian farmhouse: two storeys, a slate main roof with two front gables (white fretwork bargeboards),
//                green shutters, three brick chimneys with pots, a slate-roofed veranda with white posts, brackets and railings,
//                climbing roses, flower tubs, steps;
//   farmBarn   — the brick outbuilding behind the yard: slate roof, green double doors, windows, a lamp, barrels and crates;
//   farmShed   — the open timber tractor shed: posts on stone pads, braces, king-post trusses, slate roof, boarded back and left end,
//                the red tractor, stacked crates, barrels, sacks, two ladders, a workbench;
//   farmYard   — the ground between them: trodden yard and paths, picket fence round the front garden, rail fences, a field gate,
//                flower beds, a bird bath, a hand cart, a water pump with a trough, trees;
//   grainTower — the grain elevator beside the farm's station: stone plinth, brick base with green doors and lamps, a braced timber
//                stage, a railed gallery, a board cabin under a slate pyramid roof, the louvred cupola with a weathervane, a brick
//                lean-to, the steel silo on its trestle, the arm's machine house, and the cobbled loading apron with a low brick wall
//                and posts along the track (the farm station has no platform: it only loads grain);
//   grainArm   — the loading arm alone (the game turns and stretches it).
// Frames: front = -z everywhere. grainTower: tower centre at the origin, the track runs along x at z = -KIT.GRAIN.track.
(function(){
const BRICK=[0.62,0.31,0.21],BRICKD=[0.52,0.26,0.18],SLATE={pal:[[0.27,0.27,0.31],[0.23,0.23,0.27],[0.31,0.3,0.34],[0.25,0.25,0.28],[0.29,0.27,0.3]],fresh:[0.32,0.32,0.36],aged:[0.21,0.21,0.24],missing:0,w:[0.3,0.44],exp:0.27,len:0.5,wideP:0},
  SLC=[0.27,0.27,0.31],WHITE=[0.9,0.88,0.82],GREEN=[0.2,0.34,0.22],GREEND=[0.15,0.25,0.17],WOOD=[0.55,0.4,0.26],WOODD=[0.36,0.26,0.17],WOODL=[0.66,0.5,0.33],IRON=[0.18,0.18,0.2],
  STEEL=[0.58,0.59,0.62],STONE=[0.64,0.61,0.55],STONED=[0.5,0.48,0.45],RED=[0.66,0.14,0.11],TYRE=[0.12,0.12,0.13],DIRT=[0.58,0.47,0.34],DIRT2=[0.5,0.41,0.3],COB=[0.56,0.51,0.45];
const FLOW=[[0.85,0.3,0.35],[0.95,0.8,0.4],[0.9,0.6,0.75],[0.75,0.5,0.85],[0.95,0.95,0.9]];
KIT.GRAIN={pivot:[0,9.1,-3.7],reach:8,tipY:4.55,track:11.7,swing:6.6};
// the farm's parts in the farm frame (x right, front = -z): where the game puts each model
KIT.FARM={house:[11,10.5],barn:[-7.5,12],shed:[13,-9],yard:[0,0]};/* all parts are built mirrored in x (see mirror): positions here are the mirrored ones */
Object.assign(KIT.plots,{farmHouse:{x0:-10.5,x1:10.5,z0:-8.5,z1:5},farmBarn:{x0:-6,x1:6,z0:-5.5,z1:4},farmShed:{x0:-8,x1:8,z0:-6,z1:5},farmYard:{x0:-27,x1:27,z0:-19,z1:19},
  grainTower:{x0:-10,x1:10,z0:-10.2,z1:8},grainArm:{x0:-4,x1:4,z0:-12,z1:3},farmAll:null});
// move everything built since vertex float v0 to (ox,oz), turned ry about y
// mirror everything built since vertex float v0 in x (triangles re-wound so they still face out)
function mirror(K,v0){const V=K.VB;for(let i=v0;i<V.length;i+=16){V[i]=-V[i];V[i+3]=-V[i+3];}for(let i=v0;i+48<=V.length;i+=48)for(let k=0;k<16;k++){const t=V[i+16+k];V[i+16+k]=V[i+32+k];V[i+32+k]=t;}}
function place(K,v0,ox,oz,ry){const V=K.VB,c=Math.cos(ry||0),s=Math.sin(ry||0);for(let i=v0;i<V.length;i+=16){const x=V[i],z=V[i+2],nx=V[i+3],nz=V[i+5];V[i]=ox+c*x-s*z;V[i+2]=oz+s*x+c*z;V[i+3]=c*nx-s*nz;V[i+5]=s*nx+c*nz;}}
// a roof plane laid with slates: e0,e1 the eave corners (left, right), r0,r1 the top corners; tiles from the eave up; deck and soffit under it
function slab(K,e0,e1,r1,r0,cover,trim){const {quad,beam}=K,{add,sub,mul,norm,cross}=K.v,lerp=(a,b,t)=>add(a,mul(sub(b,a),t));
  const L=Math.hypot(...sub(lerp(r0,r1,0.5),lerp(e0,e1,0.5))),W0=Math.hypot(...sub(e1,e0)),N0=norm(cross(sub(e1,e0),sub(r0,e0))),N=N0[1]<0?mul(N0,-1):N0;
  const S=(u,t,o)=>{const f=t/L,a=lerp(e0,r0,f),b=lerp(e1,r1,f),w=Math.hypot(...sub(b,a)),q=lerp(a,b,clamp01(0.5+u/W0));return add(q,mul(N,o));};
  const pal=cover.pal||K.C.shingle,deck=K.lod>=1?K.farRoof([(pal[0][0]+pal[2][0])/2,(pal[0][1]+pal[2][1])/2,(pal[0][2]+pal[2][2])/2]):[0.2,0.17,0.15];
  quad(add(e0,mul(N,0.0)),add(e1,mul(N,0.0)),add(r1,mul(N,0.0)),add(r0,mul(N,0.0)),N,deck,K.lod>=1?20:12,0.5);quad(add(e0,mul(N,-0.1)),add(r0,mul(N,-0.1)),add(r1,mul(N,-0.1)),add(e1,mul(N,-0.1)),mul(N,-1),[0.4,0.3,0.21],12,0.6);
  if(trim)beam(add(e0,mul(N,-0.05)),add(e1,mul(N,-0.05)),N,0.2,0.06,trim,6);
  K.shingles((u,t,o)=>S(u,t,o),-W0/2+0.02,W0/2-0.02,L,null,cover);return{N,S,L};}
const clamp01=x=>x<0?0:x>1?1:x;
// a hipped/pyramid roof over the rectangle x0..x1, z0..z1 (eaves at y0, ov overhang) rising to an apex or a short ridge along x
function hip(K,x0,x1,z0,z1,y0,rise,ov,cover,ridgeCol){const cx=(x0+x1)/2,cz=(z0+z1)/2,hx=(x1-x0)/2+ov,hz=(z1-z0)/2+ov,rl=Math.max(0,hx-hz),top=y0+rise,ey=y0-ov*rise/Math.min(hx,hz)*0.6;
  const A=[cx-hx,ey,cz-hz],B=[cx+hx,ey,cz-hz],C=[cx+hx,ey,cz+hz],D=[cx-hx,ey,cz+hz],R0=[cx-rl,top,cz],R1=[cx+rl,top,cz];
  slab(K,A,B,R1,R0,cover);slab(K,C,D,R0,R1,cover);slab(K,B,C,R1,R1,cover);slab(K,D,A,R0,R0,cover);
  const rc=ridgeCol||[0.22,0.22,0.25];for(const [p,q] of [[A,R0],[B,R1],[C,R1],[D,R0]])K.beam([p[0],p[1]+0.06,p[2]],[q[0],q[1]+0.06,q[2]],[0,1,0],0.16,0.1,rc,20);if(rl>0)K.beam([R0[0],top+0.06,cz],[R1[0],top+0.06,cz],[0,1,0],0.18,0.12,rc,20);}
function railFence(K,pts,h,col){const {B,beam}=K;for(let i=0;i<pts.length;i++){const p=pts[i];B(p[0],h/2,p[1],0.15,h,0.15,col,6);if(i+1<pts.length){const q=pts[i+1],L=Math.hypot(q[0]-p[0],q[1]-p[1]),n=Math.max(1,Math.round(L/2.4));
    for(let k=1;k<n;k++)B(p[0]+(q[0]-p[0])*k/n,h/2,p[1]+(q[1]-p[1])*k/n,0.13,h,0.13,col,6);for(const y of [h*0.42,h*0.85])beam([p[0],y,p[1]],[q[0],y,q[1]],[0,1,0],0.1,0.05,col,6);}}}
function picket(K,a,b,h){const {B,beam}=K,L=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(2,Math.round(L/0.26)),ry=-Math.atan2(b[1]-a[1],b[0]-a[0]);for(const y of [h*0.3,h*0.72])beam([a[0],y,a[1]],[b[0],y,b[1]],[0,1,0],0.07,0.04,WHITE,0);
  for(let k=0;k<=n;k++){const t=k/n,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;if(K.lod<1){B(x,h*0.47,z,0.08,h*0.94,0.025,WHITE,0,ry);B(x,h*0.97,z,0.05,0.06,0.025,WHITE,0,ry);}}if(K.lod>=1)B((a[0]+b[0])/2,h*0.5,(a[1]+b[1])/2,L,h*0.6,0.03,WHITE,0,ry);
  for(const p of [a,b]){B(p[0],h*0.56,p[1],0.13,h*1.12,0.13,WHITE,0);B(p[0],h*1.14,p[1],0.18,0.05,0.18,WHITE,0);}}
// a sash window with green shutters and a white head and sill
function win2(K,f,u,y,w,h,sh){const {fb}=K;K.win(f,u,y,w,h,{cols:2,rows:3,frame:WHITE});fb(f,u,y+h+0.1,0.04,w+0.36,0.16,0.1,STONE,8);
  if(sh!==false)for(const e of [-1,1]){fb(f,u+e*(w/2+0.27),y+h/2,0.05,0.44,h+0.04,0.05,GREEN,0);if(K.lod<1)for(let k=1;k<6;k++)fb(f,u+e*(w/2+0.27),y+h*k/6,0.08,0.4,0.025,0.02,GREEND,0);}}
function door2(K,f,u,y0,w,h,col){const {fb}=K;fb(f,u,y0+h/2,0.03,w,h,0.08,col||GREEN,0);if(K.lod<1){fb(f,u,y0+h*0.3,0.07,w-0.16,0.06,0.02,GREEND,0);fb(f,u,y0+h*0.7,0.07,w-0.16,0.06,0.02,GREEND,0);fb(f,u+w*0.32,y0+h*0.48,0.09,0.05,0.12,0.05,[0.8,0.65,0.3],1);}
  fb(f,u,y0+h+0.09,0.05,w+0.3,0.18,0.12,WHITE,0);for(const e of [-1,1])fb(f,u+e*(w/2+0.07),y0+h/2,0.05,0.12,h,0.1,WHITE,0);}
// a brick gable filling over a wall (in the plane of face f, from the eaves at y0 up to the ridge rise above, wall half-width hw)
function gable(K,f,hw,y0,rise,col){const {tri,fp}=K;tri(fp(f,-hw,y0,0.001),fp(f,hw,y0,0.001),fp(f,0,y0+rise,0.001),col||BRICK,24);tri(fp(f,hw,y0,-0.08),fp(f,-hw,y0,-0.08),fp(f,0,y0+rise,-0.08),col||BRICK,24);}
// white fretwork bargeboards under a gable's edges and a finial at the top (face f, wall half-width hw, eaves y0, rise, overhang ov)
function fret(K,f,hw,y0,rise,ov){const {fp,ico,beam,cyl}=K,a=fp(f,-hw-ov,y0-0.25,0.42),b=fp(f,hw+ov,y0-0.25,0.42),t=fp(f,0,y0+rise+0.05,0.42);
  for(const [p,q] of [[a,t],[b,t]]){beam(p,q,f.n,0.32,0.06,WHITE,0);if(K.lod<1)for(let k=1;k<12;k++){const s=k/12,P=[p[0]+(q[0]-p[0])*s,p[1]+(q[1]-p[1])*s-0.24,p[2]+(q[2]-p[2])*s];ico(P,0.07,WHITE,0,{sy:0.8});}}
  cyl([t[0],t[1]-0.2,t[2]],[t[0],t[1]+0.6,t[2]],0.06,0.03,6,WHITE,0);if(K.lod<1)ico([t[0],t[1]+0.62,t[2]],0.07,WHITE,0);}
// ---------------- the farmhouse (front = -z): main block x -7..7, z -3.5..3.5 with two front gables; veranda in front and round the right
function house(K){const {B,beam,cyl,quad,tri,fp,fb}=K,X0=-7,X1=7,Z0=-3.5,Z1=3.5,FL=0.6,EV=6.1,RISE=3.6,F=K.walls(X0,X1,Z0,Z1);
  B(0,(FL+EV)/2,0,X1-X0,EV-FL,Z1-Z0,BRICK,24);B(0,FL/2,0,X1-X0+0.2,FL,Z1-Z0+0.2,STONE,8);B(0,(FL+EV)/2,0,X1-X0-0.4,EV-FL-0.2,Z1-Z0-0.4,[0.3,0.24,0.18],7);
  for(const f of [F.front,F.back,F.left,F.right]){fb(f,0,3.35,0.03,f.half*2+0.1,0.14,0.07,STONE,8);fb(f,0,EV-0.12,0.04,f.half*2+0.12,0.24,0.12,BRICKD,24);}
  // stone quoins at the corners
  if(K.lod<1)for(const [x,z] of [[X0,Z0],[X1,Z0],[X0,Z1],[X1,Z1]])for(let k=0;k<12;k++){const y=FL+0.25+k*0.45,l=k%2?0.32:0.5;B(x+(x<0?l/2-0.03:-l/2+0.03),y,z+(z<0?-0.03:0.03),l,0.26,0.1,STONE,8);B(x+(x<0?-0.03:0.03),y,z+(z<0?(k%2?0.25:0.16):-(k%2?0.25:0.16)),0.1,0.26,k%2?0.5:0.32,STONE,8);}
  // front: two gabled bays (x -4 and +3.2) stand 0.5 m proud, each with a bay of windows; the door between them
  const bays=[-4.2,3.0],BW=2.1,BP=0.5;
  for(const bx of bays){B(bx,(FL+EV)/2,Z0-BP/2+0.01,2*BW,EV-FL,BP,BRICK,24);B(bx,FL/2,Z0-BP/2,2*BW+0.2,FL,BP+0.2,STONE,8);const Fb=K.face([bx,0,Z0-BP],[0,0,-1],[1,0,0],BW);
    win2(K,Fb,0,FL+0.85,1.2,1.75);win2(K,Fb,0,3.75,1.1,1.55);fb(Fb,0,3.35,0.03,2*BW+0.1,0.14,0.07,STONE,8);
    gable(K,Fb,BW+0.04,EV,2.6);K.win(Fb,0,EV+0.45,0.6,0.95,{cols:1,rows:2,frame:WHITE});fb(Fb,0,EV+1.42,0.04,0.8,0.14,0.08,STONE,8);
    K.roof({c:[bx,(Z0-BP+0.6)/2+0.4],dir:[0,1],halfLen:(0.6-(Z0-BP))/2+0.4,half:BW,H:EV,rise:2.6,ov:0.38,gov:0.42,th:0.12,sag:0.03,flare:0.03,wob:0.01,nx:10,ends:[-1],ridgeMoss:0,cover:SLATE,trim:WHITE});
    fret(K,Fb,BW,EV,2.6,0.02);}
  door2(K,F.front,-0.6,FL,1.15,2.3);win2(K,F.front,5.6,FL+0.85,1.0,1.75);win2(K,F.front,-0.6,3.75,1.0,1.55);win2(K,F.front,5.6,3.75,1.0,1.55);
  for(const u of [-4.8,-1.6,1.6,4.8]){win2(K,F.back,u,FL+0.85,1.0,1.75);win2(K,F.back,u,3.75,1.0,1.55);}
  for(const f of [F.left,F.right])for(const u of [-1.5,1.5]){win2(K,f,u,FL+0.85,0.95,1.75);win2(K,f,u,3.75,0.95,1.55);}
  // main roof: ridge along x, gables at both ends with fretwork
  K.roof({c:[0,0],dir:[1,0],halfLen:7,half:3.5,H:EV,rise:RISE,ov:0.5,gov:0.45,th:0.14,sag:0.04,flare:0.03,wob:0.01,nx:28,ridgeMoss:0,cover:SLATE,trim:WHITE});
  gable(K,F.left,3.5,EV,RISE);gable(K,F.right,3.5,EV,RISE);fret(K,F.left,3.5,EV,RISE,0.05);fret(K,F.right,3.5,EV,RISE,0.05);
  for(const f of [F.left,F.right])K.win(f,0,EV+0.6,0.7,1.1,{cols:1,rows:2,frame:WHITE});
  // three chimneys: one at each end on the ridge, one tall stack at the back right
  for(const [x,z,h] of [[-6.2,0,2.4],[6.2,0,2.4],[2.2,1.6,2.9]]){const y0=EV+RISE*(1-Math.abs(z)/3.5)-0.6;B(x,y0+h/2,z,0.95,h,0.8,BRICKD,24);B(x,y0+h+0.06,z,1.12,0.14,0.97,STONE,8);B(x,y0+h-0.3,z,1.02,0.1,0.87,BRICKD,24);
    for(const e of [-0.24,0.24]){cyl([x+e,y0+h+0.12,z],[x+e,y0+h+0.52,z],0.13,0.11,8,[0.66,0.36,0.25],18);cyl([x+e,y0+h+0.5,z],[x+e,y0+h+0.56,z],0.15,0.15,8,[0.6,0.32,0.22],18);}}
  // veranda: deck, white posts with brackets, rails with balusters, slate lean-to roof against the house (front, and round the right end)
  const VZ=-6.4,VX=9.3,VY0=FL-0.05,VH=2.8,VH2=3.32;
  B((X0+VX)/2,VY0/2,(VZ+Z0)/2,VX-X0,VY0,Z0-VZ,WOODL,12);B((X1+VX)/2,VY0/2,(Z0+1.5)/2,VX-X1,VY0,1.5-Z0,WOODL,12);if(K.lod<1)for(let x=X0+0.2;x<VX;x+=0.18)B(x,VY0+0.005,(VZ+Z0)/2,0.02,0.01,Z0-VZ,[0.5,0.38,0.25],12);
  const posts=[[X0+0.12,VZ+0.12],[-2.2,VZ+0.12],[0.95,VZ+0.12],[4.4,VZ+0.12],[VX-0.12,VZ+0.12],[VX-0.12,-2.0],[VX-0.12,1.38]];
  for(const [x,z] of posts){B(x,(VY0+VH)/2,z,0.16,VH-VY0,0.16,WHITE,0);B(x,VY0+0.1,z,0.24,0.2,0.24,WHITE,0);if(K.lod<2){const fx=z<VZ+0.5;for(const e of [-1,1])beam([x,VH-0.12,z],[x+(fx?e*0.5:0),VH-0.6,z+(fx?0:e*0.5)],[0,1,0],0.06,0.05,WHITE,0);}}
  beam([X0,VH-0.06,VZ+0.12],[VX,VH-0.06,VZ+0.12],[0,1,0],0.22,0.12,WHITE,0);beam([VX-0.12,VH-0.06,VZ],[VX-0.12,VH-0.06,1.5],[0,1,0],0.22,0.12,WHITE,0);
  if(K.lod<1){for(let x=X0+0.4;x<VX;x+=0.36)B(x,VH-0.2,VZ+0.12,0.04,0.2,0.04,WHITE,0);}
  slab(K,[X0-0.3,VH,VZ-0.35],[VX+0.35,VH,VZ-0.35],[VX+0.35,VH2,Z0],[X0-0.3,VH2,Z0],SLATE,WHITE);
  slab(K,[VX+0.35,VH,1.85],[X1,VH2,1.85],[X1,VH2,Z0],[VX+0.35,VH,VZ-0.35],SLATE,null);
  const rail=(a,b)=>{beam([a[0],VY0+0.95,a[1]],[b[0],VY0+0.95,b[1]],[0,1,0],0.09,0.07,WHITE,0);beam([a[0],VY0+0.12,a[1]],[b[0],VY0+0.12,b[1]],[0,1,0],0.07,0.06,WHITE,0);
    const L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(K.lod<1){const n=Math.round(L/0.16);for(let k=1;k<n;k++)B(a[0]+(b[0]-a[0])*k/n,VY0+0.53,a[1]+(b[1]-a[1])*k/n,0.035,0.8,0.035,WHITE,0);}else B((a[0]+b[0])/2,VY0+0.53,(a[1]+b[1])/2,Math.abs(b[0]-a[0])+0.03,0.7,Math.abs(b[1]-a[1])+0.03,WHITE,0);};
  rail(posts[0],posts[1]);rail([0.95+0.12,VZ+0.12],posts[3]);rail(posts[3],posts[4]);rail(posts[4],posts[5]);rail(posts[5],posts[6]);
  for(let k=0;k<4;k++)B(-0.6,VY0-0.14*(k+1)+0.07,VZ-0.2-k*0.3,3.0,0.14,0.32,STONE,8);
  // on the veranda: a bench, rocking chair, tubs of flowers; climbing roses up the bay and over the porch
  B(2.6,VY0+0.45,Z0-0.45,1.6,0.08,0.45,WOODD,6);B(2.6,VY0+0.8,Z0-0.22,1.6,0.5,0.06,WOODD,6);for(const e of [-0.7,0.7])B(2.6+e,VY0+0.22,Z0-0.45,0.08,0.44,0.44,WOODD,6);
  for(const [x,z] of [[-2.4,VZ+0.5],[1.2,VZ+0.5],[VX-0.5,-5.6]]){cyl([x,VY0,z],[x,VY0+0.45,z],0.26,0.3,10,[0.62,0.36,0.25],18);K.bush(x,z,0.34,[0.3,0.5,0.22],FLOW);}
  if(K.lod<2)for(let k=0;k<11;k++){const x=-6.2+((k*37)%7)*0.18,y=0.7+k*0.48;K.ico([x,y,Z0-BP-0.25],0.32,k%3?[0.26,0.46,0.2]:[0.88,0.36,0.46],1,{detail:1,jit:0.25});}
  for(const [x,z,r] of [[-6.6,VZ-0.8,0.5],[-4.5,VZ-0.7,0.45],[3.5,VZ-0.75,0.45],[6.8,VZ-0.8,0.5],[8.5,VZ-0.8,0.42]])K.bush(x,z,r,[0.28,0.48,0.22],FLOW);
  return{target:[0,4,-2],dist:30,dir:[0.5,0.45,-0.75]};}
// ---------------- the outbuilding (front = -z): brick, slate roof, green double doors
function barn(K){const {B,fb}=K,X0=-5,X1=5,Z0=-3.25,Z1=3.25,EV=3.6,RISE=2.6,F=K.walls(X0,X1,Z0,Z1);B(0,EV/2,0,X1-X0,EV,Z1-Z0,BRICK,24);B(0,0.25,0,X1-X0+0.16,0.5,Z1-Z0+0.16,STONE,8);
  for(const f of [F.front,F.back,F.left,F.right])fb(f,0,EV-0.1,0.04,f.half*2+0.1,0.2,0.1,BRICKD,24);
  for(const e of [-1,1]){fb(F.front,1.2+e*0.72,1.45,0.03,1.38,2.8,0.08,GREEN,0);if(K.lod<1){fb(F.front,1.2+e*0.72,0.7,0.07,1.25,0.1,0.03,GREEND,0);fb(F.front,1.2+e*0.72,2.25,0.07,1.25,0.1,0.03,GREEND,0);K.beam(fp2(F.front,1.2+e*0.72-0.55,0.75),fp2(F.front,1.2+e*0.72+0.55,2.2),F.front.n,0.1,0.03,GREEND,0);}}
  fb(F.front,1.2,2.98,0.05,3.3,0.2,0.12,STONE,8);win2(K,F.front,-3.0,1.25,0.95,1.3);win2(K,F.right,0,1.25,0.95,1.3,false);win2(K,F.left,0,1.25,0.95,1.3,false);win2(K,F.back,-2.2,1.25,0.95,1.3,false);win2(K,F.back,2.2,1.25,0.95,1.3,false);
  fb(F.front,3.9,2.85,0.25,0.14,0.3,0.14,IRON,11);fb(F.front,3.9,2.62,0.25,0.24,0.26,0.24,K.C.glow,3);
  K.roof({c:[0,0],dir:[1,0],halfLen:5,half:3.25,H:EV,rise:RISE,ov:0.45,gov:0.4,th:0.13,sag:0.05,flare:0.03,wob:0.01,nx:20,ridgeMoss:0,cover:SLATE,trim:WOODD});
  gable(K,F.left,3.25,EV,RISE);gable(K,F.right,3.25,EV,RISE);K.win(F.left,0,EV+0.4,0.6,0.8,{cols:1,rows:2,frame:WHITE});
  for(const [x,z,r] of [[-1.6,-4.0,0.38],[-0.8,-4.2,0.38],[-1.2,-4.8,0.36],[4.6,-0.5,0.38]])K.barrel(x,z,r,0.95);K.crate(3.6,0,-4.0,0.85,0.2);K.crate(4.4,0,-3.8,0.7,-0.3);K.crate(3.9,0.85,-3.9,0.6,0.5);K.crate(-4.2,0,-4.0,0.8,0.1);
  return{target:[0,2.5,-1],dist:20,dir:[0.5,0.45,-0.75]};}
function fp2(f,u,y){return[f.o[0]+f.t[0]*u+f.n[0]*0.08,y,f.o[2]+f.t[2]*u+f.n[2]*0.08];}
// ---------------- the old red tractor (nose to +x), its rear axle at the origin; the wheels stay as discs at every detail level
function tractor(K){const {B,cyl,beam}=K;const far=K.lod>=2;for(const e of [-1,1]){if(far){B(0,0.78,e*0.9,1.5,1.5,0.32,TYRE,0);B(2.1,0.42,e*0.72,0.82,0.82,0.24,TYRE,0);}else{cyl([0,0.78,e*0.72],[0,0.78,e*1.06],0.78,0.78,16,TYRE,0,TYRE,0);cyl([0,0.78,e*1.06],[0,0.78,e*1.1],0.42,0.42,12,RED,0,RED,0);
    cyl([2.1,0.42,e*0.6],[2.1,0.42,e*0.82],0.42,0.42,12,TYRE,0,TYRE,0);cyl([2.1,0.42,e*0.82],[2.1,0.42,e*0.85],0.2,0.2,10,RED,0,RED,0);}
    B(0,1.62,e*0.9,1.6,0.07,0.44,RED,0);B(-0.75,1.25,e*0.9,0.07,0.75,0.44,RED,0);}
  B(0.45,0.98,0,1.5,0.56,0.64,RED,0);B(1.65,1.2,0,1.55,0.66,0.62,RED,0);B(2.44,1.18,0,0.07,0.58,0.52,[0.25,0.25,0.26],11);B(2.1,0.5,0,0.22,0.22,1.3,IRON,11);B(0,0.78,0,0.26,0.26,1.6,IRON,11);
  cyl([1.5,1.52,0.2],[1.5,2.3,0.2],0.06,0.05,6,IRON,11);B(-0.25,1.45,0,0.52,0.1,0.52,[0.2,0.2,0.2],0);B(-0.52,1.72,0,0.08,0.5,0.48,[0.2,0.2,0.2],0);
  beam([0.5,1.28,0],[0.2,1.82,0],[0,0,1],0.05,0.05,IRON,11);cyl([0.2,1.82,-0.02],[0.16,1.86,0.02],0.24,0.24,10,IRON,11);for(const e of [-1,1])cyl([2.46,1.32,e*0.2],[2.49,1.32,e*0.2],0.09,0.09,8,[1,0.9,0.6],3,[1,0.9,0.6],3);}
// ---------------- the open tractor shed (front = -z, open at the front and the right end): posts, braces, trusses, slate roof
function shed(K){const {B,beam,tri}=K,X0=-7,X1=7,Z0=-4,Z1=4,EV=3.4,RISE=2.7;
  const PX=[X0+0.15,-2.35,2.35,X1-0.15];
  for(const x of PX)for(const z of [Z0+0.15,Z1-0.15]){B(x,EV/2,z,0.26,EV,0.26,WOODD,6);B(x,0.12,z,0.48,0.24,0.48,STONE,8);if(K.lod<2)for(const e of [-1,1])if(x+e*0.9>X0&&x+e*0.9<X1)beam([x,EV-0.95,z],[x+e*0.95,EV-0.08,z],[0,0,1],0.13,0.13,WOODD,6);}
  for(const z of [Z0+0.15,Z1-0.15])beam([X0-0.1,EV-0.11,z],[X1+0.1,EV-0.11,z],[0,1,0],0.24,0.24,WOODD,6);
  // king-post trusses on every post line: tie beam, two rafters, a king post and two struts
  for(const x of PX){beam([x,EV,Z0],[x,EV,Z1],[0,1,0],0.22,0.2,WOODD,6);beam([x,EV+RISE-0.45,0],[x,EV+0.05,0],[1,0,0],0.17,0.17,WOODD,6);
    for(const e of [-1,1]){beam([x,EV-0.02,e*(Z1-0.1)],[x,EV+RISE-0.42,0],[1,0,0],0.18,0.15,WOODD,6);if(K.lod<2)beam([x,EV+0.15,e*0.12],[x,EV+RISE*0.55,e*1.75],[1,0,0],0.12,0.12,WOODD,6);}}
  K.roof({c:[0,0],dir:[1,0],halfLen:7,half:4,H:EV,rise:RISE,ov:0.6,gov:0.55,th:0.12,sag:0.05,flare:0.04,wob:0.012,nx:26,ridgeMoss:0,cover:SLATE,trim:WOODD});
  // boarded back wall (+z) to the eaves and the left gable end, both with battens
  B(0,EV/2,Z1-0.04,X1-X0-0.2,EV,0.07,WOOD,6);B(X0+0.04,EV/2,0,0.07,EV,Z1-Z0-0.2,WOOD,6);tri([X0+0.04,EV,Z0],[X0+0.04,EV,Z1],[X0+0.04,EV+RISE,0],WOOD,6);tri([X0-0.02,EV,Z1],[X0-0.02,EV,Z0],[X0-0.02,EV+RISE,0],WOOD,6);
  if(K.lod<2){for(let x=X0+0.45;x<X1;x+=0.5)B(x,EV/2,Z1+0.0,0.06,EV,0.04,WOODD,6);for(let z=Z0+0.45;z<Z1;z+=0.5){const h=EV+RISE*(1-Math.abs(z)/Z1);B(X0-0.02,h/2,z,0.04,h,0.06,WOODD,6);}}
  // inside: the tractor facing out to the right, crates stacked high at the back left, barrels, sacks, a workbench, two ladders
  {const v0=K.VB.length;tractor(K);place(K,v0,1.2,-0.6,-0.18);}
  for(const [x,z,y,s,r] of [[-6.1,3.0,0,0.9,0.1],[-5.1,3.2,0,0.85,-0.15],[-6.0,3.05,0.9,0.8,0.3],[-5.15,3.1,0.85,0.75,0.0],[-5.6,3.1,1.65,0.7,0.2],[-4.1,3.25,0,0.75,0.25],[-6.2,1.8,0,0.85,0],[-6.1,1.85,0.85,0.7,-0.2],[-3.2,3.3,0,0.7,0.1],[-6.2,0.7,0,0.8,0.3]])K.crate(x,y,z,s,r);
  K.barrel(-5.9,-2.6,0.4,1.0);K.barrel(-5.0,-3.1,0.4,1.0);K.barrel(-6.0,-1.6,0.37,0.92);K.barrel(-2.2,3.3,0.38,0.95);
  for(const [x,z] of [[-3.6,2.0],[-2.8,2.3],[-3.2,1.5]])K.ico([x,0.3,z],0.42,[0.8,0.7,0.52],0,{sy:0.65,detail:1,jit:0.1});
  B(0.6,0.95,3.45,2.4,0.08,0.75,WOODL,6);for(const [x,z] of [[-0.5,3.15],[1.7,3.15],[-0.5,3.75],[1.7,3.75]])B(x,0.46,z,0.08,0.92,0.08,WOODD,6);K.crate(0.2,0.99,3.4,0.4,0.2);
  for(const lx of [4.4,5.3]){for(const e of [-0.22,0.22])beam([lx+e,0,Z1-1.35],[lx+e,3.3,Z1-0.32],[1,0,0],0.07,0.07,WOODL,6);if(K.lod<2)for(let k=1;k<10;k++)beam([lx-0.22,k*0.33,Z1-1.35+k*0.1],[lx+0.22,k*0.33,Z1-1.35+k*0.1],[0,1,0],0.045,0.045,WOODL,6);}
  return{target:[0,2,-1],dist:24,dir:[0.4,0.4,-0.8]};}
// ---------------- the yard and garden (farm frame: house at KIT.FARM.house etc.)
function yard(K){const {B,cyl,beam}=K,FA=KIT.FARM;
  // trodden earth: the yard, the paths to the house steps, the barn doors, the shed; grass edges stay
  K.patch(3,-3,12,9,DIRT,10,0.012);K.patch(4,-4,7,5,DIRT2,10,0.016);K.patch(-12.4,-9,8.2,4.8,DIRT,10,0.014);K.patch(8.5,6.5,5,2.6,DIRT,10,0.016);K.patch(2,-16,3,4,DIRT,10,0.013);
  K.patch(-11.6,1.0,1.4,2.6,COB,19,0.018);K.patch(-6,-1.4,4,1.3,DIRT,10,0.015);K.dirt(6,-6,2.2);K.dirt(-2,-4,1.8);K.dirt(10,-2,1.5);
  // front garden with a white picket fence, flower beds along it, the bird bath and a bench
  picket(K,[-22,3.2],[-12.4,3.2],1.0);picket(K,[-10.8,3.2],[-1.0,3.2],1.0);picket(K,[-22,3.2],[-22,15.5],1.0);picket(K,[-1.0,3.2],[-1.0,4.6],1.0);
  for(let k=0;k<12;k++){const x=-21.2+k*0.85,z=4.0+((k*7)%3)*0.15;if(x>-12.6&&x<-10.4)continue;K.bush(x,z,0.32+((k*13)%5)*0.04,[0.28,0.48,0.22],FLOW);}
  for(let k=0;k<6;k++)K.bush(-9.8+k*1.4,4.1,0.32,[0.28,0.48,0.22],FLOW);for(let k=0;k<7;k++)K.bush(-21.2,5.0+k*1.4,0.36,[0.28,0.48,0.22],FLOW);
  cyl([-17,0,1.6],[-17,0.75,1.6],0.13,0.1,8,STONE,8);cyl([-17,0.75,1.6],[-17,0.92,1.6],0.2,0.52,12,STONE,8,STONED,8);cyl([-17,0.92,1.6],[-17,0.94,1.6],0.46,0.46,12,[0.4,0.55,0.62],2);
  B(-14.2,0.45,1.5,1.5,0.07,0.45,WOODD,6);B(-14.2,0.75,1.72,1.5,0.4,0.05,WOODD,6);for(const e of [-0.65,0.65])B(-14.2+e,0.22,1.5,0.07,0.44,0.42,STONE,8);
  // rail fence along the front with the field gate, and down the right side
  railFence(K,[[-23,2.4],[-23,-8],[-23,-17.2],[-14,-17.2],[-4.5,-17.2],[0.2,-17.2]],1.15,WOODD);railFence(K,[[4.0,-17.2],[5.5,-17.2]],1.15,WOODD);
  {const g0=0.2,g1=4.0;for(let k=0;k<5;k++)beam([g0+0.1,0.25+k*0.2,-17.2],[g1-0.1,0.25+k*0.2,-17.2],[0,1,0],0.07,0.05,WOODL,6);beam([g0+0.1,0.25,-17.2],[g1-0.1,1.05,-17.2],[0,1,0],0.08,0.05,WOODL,6);for(const x of [g0,g1])B(x,0.65,-17.2,0.18,1.3,0.18,WOODD,6);}
  // water pump with a trough, a hand cart, a wheelbarrow, sacks and crates by the yard
  {const px=10.5,pz=4.6;cyl([px,0,pz],[px,1.25,pz],0.12,0.1,8,IRON,11);cyl([px,1.25,pz],[px,1.4,pz],0.15,0.15,8,IRON,11);beam([px,1.32,pz],[px+0.55,1.6,pz],[0,0,1],0.05,0.05,IRON,11);beam([px,1.0,pz],[px-0.35,0.9,pz],[0,0,1],0.06,0.06,IRON,11);
    B(px-0.9,0.3,pz,1.4,0.6,0.6,STONED,8);B(px-0.9,0.56,pz,1.25,0.05,0.45,[0.35,0.5,0.55],2);}
  {const cx=14,cz=6.5;B(cx,0.75,cz,1.8,0.1,1.05,WOOD,6);for(const e of [-1,1]){B(cx,0.95,cz+e*0.52,1.8,0.35,0.05,WOOD,6);cyl([cx-0.1,0.5,cz+e*0.6],[cx-0.1,0.5,cz+e*0.66],0.5,0.5,12,WOODD,6,WOODD,6);}beam([cx+0.9,0.75,cz-0.3],[cx+2.0,0.35,cz-0.3],[0,1,0],0.06,0.06,WOOD,6);beam([cx+0.9,0.75,cz+0.3],[cx+2.0,0.35,cz+0.3],[0,1,0],0.06,0.06,WOOD,6);}
  K.crate(-3.0,0,-14.5,0.85,0.2);K.crate(-2.2,0,-14.8,0.75,-0.1);K.barrel(-3.8,-15.2,0.38,0.95);
  // trees round the back and the left
  for(const [x,z,s] of [[-24,16.5,2.0],[-14,18,2.1],[-4,17.6,1.8],[17.5,16.5,1.9],[-25.5,-6,1.6],[21,17.5,1.6]])K.tree(x,z,s);
  for(const [x,z,r] of [[-24.5,10,1.0],[-25,2,0.9],[20,15,0.9],[14.5,16.5,0.8]])K.bush(x,z,r,[0.26,0.46,0.2]);}
const M=fn=>(K,opt)=>{const v0=K.VB.length;const c=fn(K,opt);mirror(K,v0);return c;};
KIT.models.farmHouse=function(K,opt){const c=M(house)(K);if(!opt.game)K.B(0,-0.2,-2,26,0.36,20,[0.42,0.5,0.28],9);return c;};
KIT.models.farmBarn=function(K,opt){const c=M(barn)(K);if(!opt.game)K.B(0,-0.2,0,16,0.36,14,[0.42,0.5,0.28],9);return c;};
KIT.models.farmShed=function(K,opt){const c=M(shed)(K);if(!opt.game)K.B(0,-0.2,0,18,0.36,14,[0.42,0.5,0.28],9);return c;};
KIT.models.farmYard=function(K,opt){M(yard)(K);if(!opt.game)K.B(0,-0.2,0,54,0.36,38,[0.42,0.5,0.28],9);return{target:[0,2,0],dist:62,dir:[0.4,0.62,-0.68]};};
// ---------------- the grain tower (the track side = -z): stands on a cobbled loading apron with a low brick wall along the track
function tower(K){const {B,beam,cyl,quad,fb,fp,tri}=K,HB=6.2,HT=10.4,HC=13.2,W0=3.25,W1=3.45,F=K.walls(-W0,W0,-W0,W0),T=K.walls(-W1,W1,-W1,W1),TZ=-KIT.GRAIN.track,AW=TZ+2.25;
  // the loading apron: cobbles from the tower to the wall at the track, a stone kerb, the wall with a coping and posts, steps down at the ends
  B(0,-0.15,(AW+W0+4.4)/2,19.6,0.3,W0+4.4-AW,COB,19);B(0,-1.8,(AW+W0+4.4)/2,19.5,3.0,W0+4.4-AW-0.1,STONED,8);/* cobbles on a stone base that reaches down into the ground */if(K.lod<1)for(let k=0;k<70;k++){const x=-9.5+((k*0.618)%1)*19,z=AW+0.3+((k*0.371)%1)*(W0-AW+0.8);B(x,0.005,z,0.5+((k*0.29)%1)*0.4,0.012,0.35,k%2?[0.5,0.46,0.41]:[0.6,0.56,0.5],19,((k*0.41)%1)*3);}
  B(0,0.35,AW-0.12,19.8,0.7,0.36,BRICK,24);B(0,0.74,AW-0.12,20,0.08,0.46,STONE,8);B(0,-0.6,AW-0.12,19.8,1.2,0.34,BRICKD,24);
  for(let x=-9.6;x<=9.61;x+=2.4){B(x,1.15,AW-0.12,0.14,0.8,0.14,IRON,11);cyl([x,1.55,AW-0.12],[x,1.65,AW-0.12],0.09,0.04,6,IRON,11);}for(const y of [1.05,1.45])B(0,y,AW-0.12,19.2,0.05,0.05,IRON,11);
  for(const e of [-1,1]){B(e*9.9,0.35,(AW+3)/2,0.36,0.7,3-AW,BRICK,24);B(e*9.9,0.74,(AW+3)/2,0.46,0.08,3-AW,STONE,8);B(e*9.9,-1.4,(AW+3)/2,0.34,2.8,3-AW,BRICKD,24);}
  // brick base on a stone plinth with quoins, a stone band, the green double doors under a lamp each side, arched windows
  B(0,HB/2,0,2*W0,HB,2*W0,BRICK,24);B(0,0.35,0,2*W0+0.24,0.7,2*W0+0.24,STONE,8);for(const f of [F.front,F.back,F.left,F.right]){fb(f,0,HB-0.1,0.05,2*W0+0.12,0.22,0.12,STONE,8);fb(f,0,3.55,0.04,2*W0+0.08,0.16,0.08,STONE,8);}
  if(K.lod<1)for(const [x,z] of [[-W0,-W0],[W0,-W0],[-W0,W0],[W0,W0]])for(let k=0;k<11;k++){const y=0.95+k*0.48,l=k%2?0.3:0.5;B(x+(x<0?l/2-0.03:-l/2+0.03),y,z+(z<0?-0.03:0.03),l,0.28,0.1,STONE,8);B(x+(x<0?-0.03:0.03),y,z+(z<0?(k%2?0.22:0.15):-(k%2?0.22:0.15)),0.1,0.28,k%2?0.44:0.3,STONE,8);}
  for(const e of [-1,1]){fb(F.front,e*0.64,2.1,0.03,1.24,2.8,0.08,GREEN,0);if(K.lod<1){fb(F.front,e*0.64,0.85,0.07,1.12,0.1,0.03,GREEND,0);fb(F.front,e*0.64,3.3,0.07,1.12,0.1,0.03,GREEND,0);K.beam(fp2(F.front,e*0.64-0.5,0.9),fp2(F.front,e*0.64+0.5,3.25),F.front.n,0.1,0.03,GREEND,0);}
    fb(F.front,e*2.2,3.15,0.25,0.14,0.32,0.14,IRON,11);fb(F.front,e*2.2,2.9,0.25,0.25,0.28,0.25,K.C.glow,3);cyl(fp(F.front,e*2.2,3.3,0.1),fp(F.front,e*2.2,3.3,0.4),0.03,0.03,5,IRON,11);}
  fb(F.front,0,3.62,0.06,3.0,0.22,0.12,STONE,8);K.win(F.front,0,4.4,0.75,1.15,{cols:2,rows:2,frame:WHITE});fb(F.front,0,5.65,0.05,0.95,0.16,0.08,STONE,8);
  for(const f of [F.left,F.right,F.back]){K.win(f,0,1.6,0.8,1.2,{cols:2,rows:2,frame:WHITE});K.win(f,0,4.3,0.8,1.15,{cols:2,rows:2,frame:WHITE});}
  // the timber stage: dark boards, a heavy frame and crossed braces on every face, iron straps at the corners
  B(0,(HB+HT)/2,0,2*W1,HT-HB,2*W1,WOOD,6);
  for(const f of [T.front,T.back,T.left,T.right]){for(const u of [-W1+0.12,0,W1-0.12])fb(f,u,(HB+HT)/2,0.05,0.24,HT-HB,0.1,WOODD,6);for(const y of [HB+0.12,(HB+HT)/2,HT-0.12])fb(f,0,y,0.05,2*W1,0.22,0.1,WOODD,6);
    if(K.lod<2)for(const e of [-1,1])for(const [ya,yb] of [[HB+0.22,(HB+HT)/2-0.11],[(HB+HT)/2+0.11,HT-0.22]]){const u0=e*0.14,u1=e*(W1-0.24);beam(fp(f,u0,ya,0.07),fp(f,u1,yb,0.07),f.n,0.12,0.05,WOODD,6);beam(fp(f,u1,ya,0.07),fp(f,u0,yb,0.07),f.n,0.12,0.05,WOODD,6);}
    if(K.lod<1)for(let u=-W1+0.4;u<W1;u+=0.4)fb(f,u,(HB+HT)/2,0.015,0.03,HT-HB,0.03,WOODD,6);
    if(f!==T.front)K.win(f,-1.6,HB+2.4,0.6,0.8,{cols:1,rows:2,frame:WHITE});}
  // the gallery: a deck on brackets with a railing all round
  const G=4.35;B(0,HT+0.08,0,2*G,0.16,2*G,WOODL,12);for(const f of [T.front,T.back,T.left,T.right])for(const u of [-2.6,0,2.6])beam(fp(f,u,HT-0.95,0.02),fp(f,u,HT,G-W1-0.1),f.t,0.12,0.12,WOODD,6);
  {const c=[[-G,-G],[G,-G],[G,G],[-G,G]];for(let i=0;i<4;i++){const a=c[i],b=c[(i+1)%4];for(let k=0;k<6;k++){const t=k/6;B(a[0]+(b[0]-a[0])*t,HT+0.62,a[1]+(b[1]-a[1])*t,0.1,1.1,0.1,WOODD,6);}
      for(const y of [HT+0.6,HT+1.13])beam([a[0],y,a[1]],[b[0],y,b[1]],[0,1,0],0.08,0.07,WOODD,6);if(K.lod<1){const L=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let k=1;k<Math.round(L/0.3);k++){const t=k/Math.round(L/0.3);B(a[0]+(b[0]-a[0])*t,HT+0.4,a[1]+(b[1]-a[1])*t,0.04,0.5,0.04,WOODD,6);}}}}
  // the cabin: boards and battens, windows all round, a door onto the gallery
  const WC=2.75,C=K.walls(-WC,WC,-WC,WC);B(0,(HT+HC)/2,0,2*WC,HC-HT,2*WC,WOODL,6);
  for(const f of [C.front,C.back,C.left,C.right]){for(const u of [-1.3,1.3])K.win(f,u,HT+1.0,0.8,1.15,{cols:2,rows:2,frame:WHITE});for(const u of [-WC+0.08,WC-0.08])fb(f,u,(HT+HC)/2,0.04,0.18,HC-HT,0.08,WOODD,6);fb(f,0,HC-0.1,0.04,2*WC,0.2,0.08,WOODD,6);fb(f,0,HT+0.25,0.04,2*WC,0.16,0.08,WOODD,6);
    if(K.lod<1)for(let u=-WC+0.35;u<WC;u+=0.35)if(Math.abs(Math.abs(u)-1.3)>0.5)fb(f,u,(HT+HC)/2,0.02,0.04,HC-HT,0.03,WOODD,6);}
  fb(C.back,0,HT+1.15,0.03,0.9,1.9,0.06,GREEN,0);
  // the slate pyramid roof (real slates), the louvred cupola with its own pyramid roof, the weathervane
  hip(K,-WC,WC,-WC,WC,HC,2.9,0.75,SLATE);
  const CY=HC+2.25,CW=0.7;B(0,CY+0.55,0,2*CW,1.1,2*CW,WOODL,6);for(const [dx,dz] of [[-1,-1],[1,-1],[1,1],[-1,1]])B(dx*(CW-0.05),CY+0.55,dz*(CW-0.05),0.12,1.12,0.12,WOODD,6);
  if(K.lod<2)for(let k=0;k<4;k++)for(const [dx,dz] of [[0,1],[0,-1],[1,0],[-1,0]])B(dx*(CW+0.01),CY+0.22+k*0.22,dz*(CW+0.01),dx?0.04:1.1,0.07,dz?0.04:1.1,WOODD,6);
  hip(K,-CW,CW,-CW,CW,CY+1.1,0.85,0.28,SLATE);cyl([0,CY+1.9,0],[0,CY+3.2,0],0.035,0.02,6,IRON,11);cyl([0,CY+2.4,0],[0,CY+2.45,0],0.08,0.08,6,IRON,11);
  beam([-0.6,CY+2.85,0],[0.6,CY+2.85,0],[0,1,0],0.05,0.02,IRON,11);tri([0.6,CY+2.75,0],[0.6,CY+2.95,0],[0.85,CY+2.85,0],IRON,11);B(-0.12,CY+3.08,0,0.4,0.26,0.02,IRON,11);
  for(const [x,z] of [[0,0.45],[0,-0.45],[0.45,0],[-0.45,0]])beam([0,CY+2.62,0],[x,CY+2.62,z],[0,1,0],0.02,0.02,IRON,11);
  // brick lean-to on the left with its own green door and a slate roof (real slates)
  {const x0=-W0-3.8,x1=-W0,z0=-1.6,z1=2.6,h0=3.6,h1=2.6;B((x0+x1)/2,h1/2,(z0+z1)/2,x1-x0,h1,z1-z0,BRICK,24);B((x0+x1)/2,0.22,(z0+z1)/2,x1-x0+0.12,0.44,z1-z0+0.12,STONE,8);
    for(const z of [z0,z1]){const sg=z<0?-1:1;tri([x0,h1,z+sg*0.001],[x1,h1,z+sg*0.001],[x1,h0,z+sg*0.001],BRICK,24);}
    slab(K,[x0-0.35,h1-0.08,z0-0.35],[x0-0.35,h1-0.08,z1+0.35],[x1,h0+0.1,z1+0.35],[x1,h0+0.1,z0-0.35],SLATE,WOODD);
    const L=K.face([(x0+x1)/2,0,z0],[0,0,-1],[1,0,0],(x1-x0)/2);door2(K,L,0.4,0.44,1.05,2.0);fb(L,-1.25,2.85,0.25,0.13,0.28,0.13,IRON,11);fb(L,-1.25,2.62,0.25,0.22,0.24,0.22,K.C.glow,3);
    K.win(K.face([x0,0,(z0+z1)/2],[-1,0,0],[0,0,-1],(z1-z0)/2),0,1.1,0.7,0.9,{cols:2,rows:2,frame:WHITE});}
  // the steel silo on a trestle behind on the right, a catwalk to the tower, the feed pipe into the stage
  {const sx=W0+2.7,sz=1.6,r=1.6,y0=3.3,y1=8.0;for(const [dx,dz] of [[-1,-1],[1,-1],[1,1],[-1,1]])B(sx+dx*1.25,y0/2,sz+dz*1.25,0.22,y0,0.22,WOODD,6);
    if(K.lod<2)for(const e of [-1,1]){beam([sx-1.25,0.3,sz+e*1.25],[sx+1.25,y0-0.3,sz+e*1.25],[0,0,1],0.1,0.1,WOODD,6);beam([sx+1.25,0.3,sz+e*1.25],[sx-1.25,y0-0.3,sz+e*1.25],[0,0,1],0.1,0.1,WOODD,6);beam([sx+e*1.25,0.3,sz+1.25],[sx+e*1.25,y0-0.3,sz-1.25],[1,0,0],0.1,0.1,WOODD,6);}
    B(sx,y0+0.08,sz,3.0,0.16,3.0,WOODL,12);cyl([sx,y0+0.16,sz],[sx,y1,sz],r,r,20,STEEL,11,STEEL,11,undefined,true);for(const y of [y0+0.6,(y0+y1)/2,y1-0.35])cyl([sx,y,sz],[sx,y+0.1,sz],r+0.04,r+0.04,20,[0.44,0.45,0.48],11);
    if(K.lod<1)for(let k=0;k<16;k++){const q=k/16*6.283;cyl([sx+Math.cos(q)*(r+0.01),y0+0.2,sz+Math.sin(q)*(r+0.01)],[sx+Math.cos(q)*(r+0.01),y1,sz+Math.sin(q)*(r+0.01)],0.025,0.025,4,[0.5,0.51,0.54],11);}
    cyl([sx,y1,sz],[sx,y1+1.0,sz],r+0.05,0.28,20,[0.5,0.51,0.54],11,undefined,undefined,undefined,true);cyl([sx,y1+1.0,sz],[sx,y1+1.25,sz],0.28,0.28,10,[0.45,0.46,0.5],11);
    cyl([sx-r+0.25,y1-0.4,sz],[W1-0.05,HB+2.4,sz-0.4],0.17,0.17,8,STEEL,11);for(const y of [1.4,3.0])B(sx,y,sz-1.25-0.06,2.5,0.06,0.06,WOODD,6);
    B((W1+sx-r)/2+0.1,y0+0.1,sz-0.9,sx-r-W1+0.4,0.08,0.8,WOODL,12);for(const z of [sz-1.3,sz-0.5])B((W1+sx-r)/2+0.1,y0+0.6,z,sx-r-W1+0.4,0.05,0.05,IRON,11);}
  // the arm's machine house on the track side with its big sheave and the drive belt
  const Pv=KIT.GRAIN.pivot;B(0,Pv[1]-0.1,-W1-0.48,1.8,1.8,0.96,WOODD,6);slab(K,[-1.05,Pv[1]+0.85,-W1-1.05],[1.05,Pv[1]+0.85,-W1-1.05],[1.05,Pv[1]+1.15,-W1],[-1.05,Pv[1]+1.15,-W1],SLATE,null);
  cyl([-0.98,Pv[1],-W1-0.48],[-1.18,Pv[1],-W1-0.48],0.88,0.88,18,IRON,11,[0.3,0.3,0.32],11);cyl([-0.5,Pv[1],-W1-0.48],[-0.98,Pv[1],-W1-0.48],0.12,0.12,6,IRON,11);
  if(K.lod<2)for(let k=0;k<6;k++){const q=k/6*Math.PI;beam([-1.19,Pv[1]+Math.cos(q)*0.8,-W1-0.48+Math.sin(q)*0.8],[-1.19,Pv[1]-Math.cos(q)*0.8,-W1-0.48-Math.sin(q)*0.8],[1,0,0],0.06,0.03,IRON,11);}
  // on the apron: crates, sacks and barrels by the doors, a sack barrow, a bench
  K.barrel(-2.1,-W0-1.1,0.4,1.0);K.barrel(-2.8,-W0-1.5,0.4,1.0);K.barrel(-2.3,-W0-2.0,0.38,0.95);K.crate(2.0,0,-W0-1.2,0.85,0.2);K.crate(2.9,0,-W0-1.0,0.75,-0.3);K.crate(2.4,0.85,-W0-1.1,0.65,0.4);K.crate(5.2,0,-W0-0.9,0.8,0.1);
  for(const [x,z] of [[3.6,-W0-2.0],[4.1,-W0-2.4],[3.7,-W0-2.6]])K.ico([x,0.3,z],0.4,[0.8,0.7,0.52],0,{sy:0.65,detail:1,jit:0.1});
  for(const [x,z] of [[-8.0,-W0-0.5],[7.6,1.6],[-7.5,3.0]])K.bush(x,z,0.6,[0.28,0.48,0.22],FLOW);}
function arm(K){const {B,beam,cyl}=K,G=KIT.GRAIN,py=G.pivot[1],R0=G.reach,ty=G.tipY+1.25,N=7,A=(t,top,e)=>[e*0.38*(1-0.35*t),py+(ty-py)*t+(top?0.75-0.3*t:0),-R0*t];
  cyl([0,py-1.1,0],[0,py+1.2,0],0.2,0.2,8,IRON,11);
  for(const e of [-1,1]){beam(A(0,1,e),A(1,1,e),[0,1,0],0.09,0.09,STEEL,11);beam(A(0,0,e),A(1,0,e),[0,1,0],0.09,0.09,STEEL,11);
    for(let k=0;k<=N;k++){beam(A(k/N,0,e),A(k/N,1,e),[1,0,0],0.06,0.06,STEEL,11);if(k<N&&K.lod<2)beam(A(k/N,k%2?1:0,e),A((k+1)/N,k%2?0:1,e),[1,0,0],0.05,0.05,STEEL,11);}}
  for(let k=0;k<=N;k++)for(const top of [0,1])beam(A(k/N,top,-1),A(k/N,top,1),[0,1,0],0.05,0.05,STEEL,11);
  cyl([0,py+0.3,0],[0,ty+0.35,-R0],0.2,0.2,8,[0.45,0.46,0.5],11,undefined,undefined,undefined,true);
  B(0,ty+0.2,-R0,0.95,0.9,0.95,[0.47,0.48,0.52],11);cyl([0,ty-0.25,-R0],[0,ty-0.95,-R0],0.48,0.2,10,[0.42,0.43,0.47],11,undefined,undefined,undefined,true);cyl([0,ty-0.95,-R0],[0,G.tipY,-R0],0.2,0.17,8,IRON,11);
  for(const e of [-1,1])cyl([0,py+1.2,0],A(0.72,1,e),0.025,0.025,4,IRON,11);}
KIT.models.grainTower=function(K,opt){tower(K);if(!opt.game){const v0=K.VB.length;arm(K);place(K,v0,KIT.GRAIN.pivot[0],KIT.GRAIN.pivot[2],0);K.B(0,-0.2,-3,26,0.36,26,[0.42,0.5,0.28],9);}return{target:[0,7,-3],dist:42,dir:[0.6,0.45,-0.66]};};
KIT.models.grainArm=function(K,opt){arm(K);return{target:[0,7,-4],dist:22,dir:[0.8,0.3,-0.5]};};
// the whole farm as in the picture (for looking at it only): every part where the game puts it, the tower at the front right, track
KIT.models.farmAll=function(K,opt){const FA=KIT.FARM,{B}=K,put=(fn,p,ry,mir)=>{const v0=K.VB.length;const pl=K.plot;K.plot=null;fn(K);K.plot=pl;if(mir)mirror(K,v0);place(K,v0,p[0],p[1],ry||0);};
  put(yard,[0,0],0,1);put(house,FA.house,0,1);put(barn,FA.barn,0,1);put(shed,FA.shed,0,1);const TX=-14.5,TZ0=-10.6;put(tower,[TX,TZ0]);{const v0=K.VB.length;arm(K);place(K,v0,TX,TZ0+KIT.GRAIN.pivot[2],0.45);}
  const tz=TZ0-KIT.GRAIN.track;B(0,-0.25,0,60,0.4,46,[0.42,0.5,0.28],9);B(0,0.1,tz,60,0.24,3.4,[0.5,0.47,0.43],10);for(const e of [-0.72,0.72])B(0,0.3,tz+e,60,0.14,0.08,IRON,11);for(let x=-29.5;x<30;x+=0.7)B(x,0.2,tz,0.24,0.1,2.4,WOODD,6);
  return{target:[-2,3,-6],dist:84,dir:[0.45,0.62,-0.64]};};
})();
