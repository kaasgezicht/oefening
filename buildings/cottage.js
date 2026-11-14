'use strict';
// ===== buildings/cottage.js — the cozy cottage (approved style, Nov 2026): fieldstone base with quoins, half-timbered plaster walls,
// bendy wood-shingle roof, leaning stone chimney, porch, rustic garden. ~120k triangles with its garden (the close-up level of detail).
KIT.models.cottage=function(K,opt){
const {box,B,beam,cyl,ico,quad,tri,pv,tuft,flower,blade,fp,fb,rnd,rr}=K,{add,sub,mul,dot,cross,len,norm,neg,clamp,lerp,mix3,rot}=K.v;
const W=7.0,D=5.6,H=3.0,RISE=3.9,OV=0.42,GOV=0.36,SB=1.15,TH=0.13;
const plaster=K.C.plaster,timber=K.C.timber,mortar=K.C.mortar,glow=K.C.glow,iron=K.C.iron,stonePal=K.C.stone;
const F=K.walls(-W/2,W/2,-D/2,D/2);
// ---- walls: plaster core, mortar backing behind the stone base, stones, quoins
B(0,H/2,0,W,H,D,plaster,5,0,0.11);B(0,SB/2,0,W+0.02,SB,D+0.02,mortar,8,0,0.31);
const doorSkip=(u,y)=>Math.abs(u)<0.66&&y<2.4;
K.stones(F.front,-W/2-0.08,W/2+0.08,0,SB,{skip:doorSkip});K.stones(F.back,-W/2-0.08,W/2+0.08,0,SB);K.stones(F.left,-D/2+0.06,D/2-0.06,0,SB);K.stones(F.right,-D/2+0.06,D/2-0.06,0,SB);
for(const f of [F.front,F.back])for(const e of [-1,1])for(let y=SB,k=0;y<H-0.25;y+=0.33,k++){const l=k%2?0.55:0.32;const pc=stonePal[k%6];fb(f,e*(f.half-l/2+0.04),y+0.155,0.035,l,0.29,0.12,pc,8);
  const g=e*f.t[0]>0?F.right:F.left;const l2=k%2?0.32:0.55;fb(g,(f===F.front?-1:1)*(g===F.left?-1:1)*(g.half-l2/2+0.04),y+0.155,0.035,l2,0.29,0.12,pc,8);}
// ---- timber frame (sill on the stones, top plate, posts, rails, braces)
function frame(f,posts,wins){const h=f.half;fb(f,0,SB+0.08,0.03,h*2+0.04,0.16,0.1,timber,6);fb(f,0,H-0.09,0.03,h*2+0.04,0.18,0.1,timber,6);
  for(const u of posts)fb(f,u,(SB+H)/2,0.025,0.15,H-SB-0.2,0.08,timber,6);
  for(const [u0,u1] of wins)fb(f,(u0+u1)/2,2.42,0.025,u1-u0,0.13,0.08,timber,6);}
frame(F.front,[-2.7,-1.5,-0.62,0.62,1.5,2.7],[[-2.7,-1.5],[1.5,2.7]]);frame(F.back,[-2,-1,0,1,2],[]);frame(F.left,[-1.95,-0.75,0.0],[[-1.95,-0.75]]);frame(F.right,[-1,1],[]);
for(const [f,u0,u1] of [[F.back,-3.05,-2],[F.back,3.05,2],[F.right,-2.35,-1],[F.right,2.35,1],[F.left,2.35,0.0],[F.front,-0.62,-1.5],[F.front,0.62,1.5]]){const lo=f===F.front?SB+0.18:SB+0.18;beam(fp(f,u0,lo,0.025),fp(f,u1,f===F.front?SB+0.95:H-0.2,0.025),f.n,0.08,0.13,timber,6);}
// ---- windows: reveal, frame, 3x2 panes over warm curtained glass, sill, flower box with trailing plants
K.win(F.front,-2.1,1.38,1.0,1.0,{box:true});K.win(F.front,2.1,1.38,1.0,1.0,{box:true});K.win(F.left,-1.35,1.38,0.95,0.95,{box:true});K.win(F.back,-1.5,1.38,0.9,0.95);K.win(F.back,1.5,1.38,0.9,0.95);K.win(F.right,0,1.38,0.9,0.95);
// ---- door: frame, planks on a dark backing, iron straps with nails, ring, stone steps, lantern
{const f=F.front,dw=0.96,dh=2.05,yb=0.22;fb(f,0,yb+dh/2,0.004,dw+0.1,dh,0.008,[0.08,0.06,0.05],0);
  for(let k=0;k<6;k++)fb(f,-dw/2+dw*(k+0.5)/6,yb+dh/2,0.03,dw/6-0.012,dh-0.02,0.045,mix3([0.46,0.3,0.19],[0.52,0.34,0.22],rnd()),6);
  for(const y of [yb+0.4,yb+1.62]){fb(f,0,y,0.06,dw-0.06,0.07,0.014,iron,11);for(let k=0;k<6;k++)fb(f,-dw/2+0.08+k*(dw-0.16)/5,y,0.07,0.025,0.025,0.012,[0.12,0.11,0.1],11);}
  cyl(fp(f,0.3,yb+1.02,0.06),fp(f,0.3,yb+1.02,0.09),0.06,0.06,10,iron,11);cyl(fp(f,0.3,yb+0.92,0.08),fp(f,0.3,yb+0.92,0.1),0.075,0.075,12,[0.22,0.2,0.18],11);
  for(const e of [-1,1])fb(f,e*(dw/2+0.07),yb+dh/2+0.05,0.06,0.14,dh+0.12,0.14,timber,6);fb(f,0,yb+dh+0.1,0.06,dw+0.36,0.16,0.14,timber,6);
  for(const [w,d,y,o] of [[1.6,0.62,0.11,0.32],[1.9,0.42,0.05,0.76]])for(let k=0;k<3;k++)fb(f,-w/2+w*(k+0.5)/3+rr(-0.02,0.02),y,o,w/3-0.03,y*2,d,stonePal[(rnd()*6)|0],8);
  fb(f,-0.88,yb+1.86,0.12,0.05,0.05,0.24,iron,11);fb(f,-0.88,yb+1.65,0.25,0.18,0.28,0.18,[1,0.85,0.55],3);for(const e of [-1,1])for(const e2 of [-1,1])fb(f,-0.88+e*0.09,yb+1.65,0.25+e2*0.09,0.02,0.3,0.02,iron,11);
  fb(f,-0.88,yb+1.81,0.25,0.24,0.04,0.24,iron,11);fb(f,-0.88,yb+1.49,0.25,0.22,0.03,0.22,iron,11);}
// ================= roof: bendy wood shingles, rafter tails, moss =================
const chimSkip=P=>P[0]<-W/2+0.05&&P[2]>0.18&&P[2]<1.68;
const rf=K.roof({c:[0,0],dir:[1,0],halfLen:W/2,half:D/2,H,rise:RISE,ov:OV,gov:GOV,th:TH,rafters:0.62,skip:chimSkip,mossClumps:55,cover:{}});
// gables: plaster fan up to the deck underside, timber posts, collar, braces, small window, vent
for(const e of [-1,1]){const x=e*W/2;K.gableFan(rf,e,plaster);
  const f=e<0?F.left:F.right,yU=z=>rf.under(x,z)-0.03,U=z=>f.t[2]*z;
  fb(f,0,H+0.07,0.03,D,0.16,0.1,timber,6);fb(f,0,H+1.95,0.03,2.1,0.15,0.1,timber,6);
  for(const z of [-1.25,1.25])beam(fp(f,U(z),H+0.1,0.025),fp(f,U(z),yU(z),0.025),f.n,0.08,0.15,timber,6);
  beam(fp(f,0,H+1.95,0.025),fp(f,0,yU(0),0.025),f.n,0.08,0.15,timber,6);for(const z of [-1,1])beam(fp(f,U(z*0.18),H+1.98,0.025),fp(f,U(z*1.05),H+2.85,0.025),f.n,0.08,0.12,timber,6);
  K.win(f,0,H+0.62,0.62,0.7);for(let k=0;k<4;k++)fb(f,0,H+2.3+k*0.09,0.05,0.34,0.05,0.02,timber,6);}
// stone chimney against the left gable, leaning a touch, with soot at the top and two pots
K.chimney({base:[-W/2-1.0,-W/2,0.3,1.55],bt:2.0,stack:[-W/2-0.76,-W/2+0.02,0.5,1.35],top:H+RISE+1.25,lean:[-0.016,0.008],clad:['x-','z-','z+']});
// ================= porch over the door =================
{const pz=-D/2-1.15,eyP=2.55,ryP=3.35,ex=1.2;for(const e of [-1,1]){cyl([e*0.85,0,pz],[e*0.84,eyP,pz],0.085,0.075,8,[0.42,0.3,0.19],6);box([e*0.85,0.1,pz],[0.12,0,0],[0,0.1,0],[0,0,0.12],stonePal[0],8);
    beam([e*0.84,eyP-0.45,pz],[e*0.84,eyP-0.05,pz+0.4],[1,0,0],0.1,0.1,timber,6);}
  beam([-1.0,eyP,pz],[1.0,eyP,pz],[0,0,1],0.16,0.14,timber,6);for(const e of [-1,1])beam([e*0.84,eyP,pz],[e*0.84,eyP,-D/2],[1,0,0],0.14,0.12,timber,6);
  for(const e of [-1,1]){const Lp=Math.hypot(ex,ryP-eyP),S=(u,t,o)=>{const k=t/Lp,sag=-0.07*Math.sin(Math.PI*clamp((u-(pz-0.4))/(-D/2+0.35-(pz-0.4)),0,1))*k,nx=e*(ryP-eyP)/Lp,ny=ex/Lp;
      return[e*ex*(1-k)+nx*o,eyP+(ryP-eyP)*k+ny*o+sag,u];};
    for(let i=0;i<5;i++)for(let j=0;j<4;j++){const u0=pz-0.4+(-D/2+0.35-(pz-0.4))*i/5,u1=pz-0.4+(-D/2+0.35-(pz-0.4))*(i+1)/5,t0=Lp*j/4,t1=Lp*(j+1)/4+(j===3?0.04:0);
      quad(S(u0,t0,0),S(u1,t0,0),S(u1,t1,0),S(u0,t1,0),null,[0.24,0.18,0.13],12,0.5);quad(S(u0,t0,-0.09),S(u0,t1,-0.09),S(u1,t1,-0.09),S(u1,t0,-0.09),null,[0.4,0.29,0.19],12,0.6);}
    K.shingles(S,pz-0.42,-D/2+0.35,Lp,null,{exp:0.17,len:0.32});beam(S(pz-0.42,0,-0.04),S(pz-0.42,Lp+0.02,-0.04),[0,0,-1],0.2,0.05,timber,6);}
  for(let x=-0.95;x<0.95;x+=0.32){const c=[x+0.16,ryP+0.08,(pz-0.4-D/2+0.35)/2];}
  {const zf=pz-0.36,yU=x=>eyP+(ryP-eyP)*(1-Math.abs(x)/ex)-0.08;const pts=[];for(let k=0;k<=8;k++){const x=-ex+0.1+(2*ex-0.2)*k/8;pts.push([x,yU(x),zf]);}const c=[0,eyP+0.05,zf];
    for(let k=0;k<8;k++)tri(c,pts[k],pts[k+1],plaster,5,0.17,[[0,-1],[pts[k][0]/ex,(pts[k][1]-eyP)/0.8],[pts[k+1][0]/ex,(pts[k+1][1]-eyP)/0.8]],[ex,0.4]);
    beam([-ex+0.1,eyP+0.04,zf-0.03],[ex-0.1,eyP+0.04,zf-0.03],[0,1,0],0.12,0.06,timber,6);beam([0,eyP+0.05,zf-0.03],[0,ryP-0.08,zf-0.03],[1,0,0],0.12,0.06,timber,6);
    for(const e of [-1,1])beam([e*0.12,eyP+0.1,zf-0.03],[e*0.7,eyP+0.5,zf-0.03],[0,0,1],0.06,0.09,timber,6);}
  // ridge caps on the porch
  for(let z=pz-0.42;z<-D/2+0.3;z+=0.28){for(const e of [-1,1]){const c=[e*0.1,ryP+0.06,z+0.14];box(c,[e*0.13,-0.08,0],[0.012*e*0.5,0.015,0],[0,0,0.15],[0.44,0.36,0.28],4);}}}
// ================= garden =================
B(0,-0.5,0,160,1.0,160,[0.42,0.56,0.27],9,0,0);
// lane with ruts
{const c=[0.6,0.5,0.37];box([0,0.012,-11.6],[30,0,0],[0,0.012,0],[0,0,1.9],c,17,0.5);for(let k=0;k<90;k++)ico([rr(-28,28),0.03,-11.6+rr(-1.9,1.9)],rr(0.04,0.1),stonePal[(rnd()*6)|0],0,{sy:0.45,jit:0.2});
  for(let k=0;k<160;k++){const x=rr(-28,28),z=-11.6+(rnd()<0.5?rr(-2.1,-1.6):rr(1.6,2.1));tuft(x,z,6,rr(0.12,0.3));}}
// cobble path: rounded stones on a dirt strip, from the lane to the steps
{box([0,0.006,-6.6],[0.75,0,0],[0,0.006,0],[0,0,3.3],[0.5,0.4,0.29],10,0.4);for(let z=-9.75;z<-3.75;z+=0.2)for(let x=-0.6;x<0.6;x+=0.22){if(rnd()<0.18)continue;const s=rr(0.13,0.2),ang=rr(-0.4,0.4);
    box([x+rr(-0.04,0.04)+0.11,0.035,z+rr(-0.03,0.03)+0.1],rot([s/2,0,0],[0,1,0],ang),[0,rr(0.025,0.04),0],rot([0,0,rr(0.07,0.1)],[0,1,0],ang),stonePal[(rnd()*6)|0],8);}
  for(let k=0;k<70;k++){const z=rr(-9.8,-3.8),x=(rnd()<0.5?-1:1)*rr(0.62,0.95);tuft(x,z,5,rr(0.1,0.24));}}
// worn dirt patches
for(const [x,z,r] of [[0,-3.85,0.8],[-5.4,-3.0,0.6],[0,-9.3,0.7]])for(let k=0;k<7;k++){const a=rnd()*6.28,d=rr(0,r*0.6),rk=rr(0.25,0.5)*r,h=0.004+k*0.0008;cyl([x+Math.cos(a)*d,0,z+Math.sin(a)*d],[x+Math.cos(a)*d,h,z+Math.sin(a)*d],rk,rk*rr(0.7,1),9,[0.5,0.4,0.28],10,mix3([0.46,0.37,0.26],[0.54,0.43,0.3],rnd()),10);}
// split-rail fence with an open gate
{const posts=[];for(let x=-7.4;x<=7.41;x+=1.85)posts.push([x,-9.2]);for(let z=-7.35;z<=6.6;z+=1.85){posts.push([-7.4,z]);posts.push([7.4,z]);}
  for(const [x,z] of posts){if(Math.abs(x)<0.8&&z<-9)continue;const tl=[rr(-0.05,0.05),0,rr(-0.05,0.05)],ang=rnd();box([x+tl[0]/2,0.55,z+tl[2]/2],rot([0.065,0,0],[0,1,0],ang),[0,0.55,0],rot([0,0,0.065],[0,1,0],ang),mix3([0.42,0.34,0.27],[0.5,0.42,0.33],rnd()),6);
    for(let k=0;k<4;k++)tuft(x+rr(-0.15,0.15),z+rr(-0.15,0.15),7,rr(0.2,0.4));}
  const rail=(a,b)=>{for(const y of [0.5,0.9]){const p0=[a[0],y+rr(-0.04,0.04),a[1]],p1=[b[0],y+rr(-0.04,0.04),b[1]];beam(p0,p1,[0,1,0],rr(0.08,0.11),rr(0.06,0.08),mix3([0.48,0.39,0.3],[0.56,0.46,0.35],rnd()),6);}};
  for(let x=-7.4;x<7.3;x+=1.85){if(x<0.8&&x+1.85>-0.8)continue;rail([x,-9.2],[x+1.85,-9.2]);}
  for(const e of [-1,1])for(let z=-9.2;z<6.5;z+=1.85)rail([e*7.4,z],[e*7.4,Math.min(z+1.85,6.6)]);
  // gate swung open
  {const h=[0.72,-9.2],a=Math.PI-0.9,d=[Math.cos(a),Math.sin(a)];const P=k=>[h[0]+d[0]*k,0,h[1]+d[1]*k];
    for(const y of [0.35,0.85])beam(add(P(0.05),[0,y,0]),add(P(1.3),[0,y,0]),[0,1,0],0.1,0.05,[0.52,0.42,0.32],6);beam(add(P(0.1),[0,0.35,0]),add(P(1.25),[0,0.85,0]),[0,1,0],0.09,0.05,[0.5,0.4,0.3],6);
    for(const k of [0.08,1.27])beam(add(P(k),[0,0.15,0]),add(P(k),[0,1.0,0]),[d[0],0,d[1]],0.09,0.06,[0.48,0.38,0.29],6);}}
// flower beds along the front (soil, leaves, flowers)
for(const e of [-1,1]){const cx=e*2.2;box([cx,0.05,-3.2],[1.45,0,0],[0,0.05,0],[0,0,0.36],[0.33,0.23,0.15],10);for(let k=0;k<12;k++)fb(F.front,cx-1.4+k*0.255,0.07,0.78,0.22,0.12,0.12,stonePal[(rnd()*6)|0],8);
  for(let k=0;k<18;k++){const x=cx-1.3+rnd()*2.6,z=-3.42+rnd()*0.42;ico([x,0.13,z],rr(0.1,0.17),mix3([0.24,0.45,0.18],[0.35,0.58,0.24],rnd()),1,{detail:1,jit:0.25,sy:0.8});
    flower(x,0.1,z,[[0.92,0.2,0.24],[0.98,0.6,0.75],[0.99,0.85,0.3],[0.6,0.4,0.85],[0.98,0.97,0.94],[0.99,0.5,0.2]][k%6],rr(0.18,0.4));}}
// hollyhocks against the wall
for(const x of [-3.2,-1.05,1.05,3.25]){cyl([x,0,-3.02],[x,1.5,-3.0],0.015,0.01,5,[0.3,0.48,0.2],13);for(let y=0.5;y<1.5;y+=0.13)ico([x+rr(-0.06,0.06),y,-3.05],0.06,x<0?[0.95,0.55,0.7]:[0.98,0.95,0.92],1,{sy:0.6});
  for(let y=0.15;y<0.8;y+=0.2)ico([x+rr(-0.1,0.1),y,-3.07],0.09,[0.27,0.48,0.2],1,{sy:0.5});}
// ivy up the front-left corner and the chimney foot
K.ivy(-W/2-0.02,-D/2+0.4,-1,0,2.4,7);K.ivy(-W/2+0.4,-D/2-0.02,0,-1,2.0,5);K.ivy(-W/2-1.03,0.6,-1,0,2.8,8);
// bushes, hydrangea, lavender
for(const [x,z,r,c] of [[-3.95,-3.4,0.6,[0.24,0.46,0.2]],[3.95,-3.3,0.55,[0.28,0.5,0.22]],[-4.1,2.9,0.75,[0.22,0.42,0.18]],[3.9,-1.0,0.5,[0.3,0.52,0.22]],[-1.3,-4.45,0.32,[0.26,0.48,0.2]],[1.3,-4.5,0.3,[0.26,0.48,0.2]],[6.6,-8.4,0.7,[0.24,0.45,0.2]],[-6.6,5.8,0.8,[0.22,0.42,0.18]]]){
  ico([x,r*0.75,z],r,c,1,{detail:2,sy:0.85,jit:0.12});if(rnd()<0.6)for(let k=0;k<6;k++){const a=rnd()*6.28,el=rr(0.1,1.0);ico([x+Math.cos(a)*Math.cos(el)*r,r*0.75+Math.sin(el)*r*0.85,z+Math.sin(a)*Math.cos(el)*r],0.1,[[0.6,0.62,0.92],[0.95,0.75,0.85],[0.98,0.96,0.92]][k%3],1,{detail:1,jit:0.3});}}
for(let x=-6.6;x<6.7;x+=0.42){if(Math.abs(x)<1.2)continue;ico([x,0.18,-8.65],0.17,[0.36,0.5,0.32],1,{sy:0.8,jit:0.2});for(let k=0;k<5;k++)cyl([x+rr(-0.12,0.12),0.15,-8.65+rr(-0.1,0.1)],[x+rr(-0.2,0.2),rr(0.45,0.6),-8.65+rr(-0.15,0.15)],0.022,0.016,5,[0.55,0.45,0.78],1);}
// barrels, crates, pots, bucket by the door
K.barrel(1.3,-3.95,0.3,0.82);K.barrel(1.82,-3.65,0.26,0.72);K.barrel(-W/2-0.25,-D/2-0.55,0.34,0.9);
for(const [x,z,s,ry] of [[-1.5,-4.0,0.5,0.3],[-1.45,-4.0,0.38,0.7]]){const y=x===-1.5?s/2:0.5+s/2;B(x,y,z,s,s,s,[0.55,0.42,0.28],6,ry);for(const e of [-1,1])for(const e2 of [-1,1]){const c=Math.cos(ry),sn=Math.sin(ry),dx=e*s/2,dz=e2*s/2;B(x+c*dx-sn*dz,y,z+sn*dx+c*dz,0.05,s+0.01,0.05,[0.42,0.3,0.2],6,ry);}}
for(const [x,z] of [[-0.9,-3.82],[0.92,-3.86],[2.6,-3.9]]){cyl([x,0,z],[x,0.34,z],0.15,0.21,12,[0.72,0.4,0.26],0,[0.3,0.22,0.15],10,undefined,true);cyl([x,0.32,z],[x,0.38,z],0.23,0.23,12,[0.68,0.38,0.24],0,null,0,undefined,true);
  ico([x,0.48,z],0.2,[0.27,0.5,0.2],1,{detail:1,jit:0.25});for(let k=0;k<3;k++)flower(x+rr(-0.1,0.1),0.42,z+rr(-0.1,0.1),[[0.92,0.2,0.24],[0.99,0.85,0.3],[0.98,0.97,0.94]][k],0.15);}
cyl([2.25,0,-4.25],[2.25,0.3,-4.25],0.13,0.16,12,[0.55,0.56,0.58],11,[0.3,0.32,0.34],11,undefined,true);
// woodpile under a lean-to by the chimney, chopping block with axe
{const x=-W/2-0.5;for(let r=0;r<5;r++)for(let k=0;k<7-r;k++){const z=-2.25+k*0.32+r*0.16+rr(-0.02,0.02),y=0.16+r*0.27,rr2=rr(0.11,0.15);cyl([x-0.42+rr(-0.05,0.05),y,z],[x+0.4+rr(-0.05,0.05),y,z],rr2,rr2,9,[0.36,0.27,0.2],15,[0.75,0.6,0.42],14);}
  for(const z of [-2.5,-0.2])cyl([x-0.55,0,z],[x-0.55,1.62,z],0.06,0.05,6,[0.42,0.3,0.2],6);beam([x-0.62,1.65,-2.6],[x+0.42,1.95,-2.6],[0,0,1],0.04,0.05,timber,6);
  for(let z=-2.62;z<-0.05;z+=0.2)beam([x-0.7,1.62,z+0.1],[x+0.48,1.98,z+0.1],[0,0,1],0.19,0.025,mix3([0.4,0.3,0.21],[0.5,0.39,0.28],rnd()),6);
  cyl([x-1.1,0,-3.1],[x-1.1,0.48,-3.1],0.28,0.28,12,[0.36,0.27,0.2],15,[0.75,0.6,0.42],14);beam([x-1.1,0.5,-3.1],[x-1.35,0.98,-2.95],[0,0,1],0.04,0.035,[0.6,0.46,0.3],6);box([x-1.13,0.53,-3.08],[0.09,0.03,0.05],[0,0.07,0],[0.01,0,-0.012],[0.42,0.44,0.46],11);
  for(let k=0;k<6;k++){const ang=rnd()*3;box([x-1.1+rr(-0.6,0.5),0.025,-3.1+rr(-0.5,0.5)],rot([rr(0.05,0.1),0,0],[0,1,0],ang),[0,0.02,0],rot([0,0,0.03],[0,1,0],ang),[0.7,0.56,0.38],6);}}
// vegetable patch: raised bed, mounded rows, cabbages, carrot tops, bean tepee
{const cx=-5.6,cz=-0.1;box([cx,0.12,cz],[1.15,0,0],[0,0.12,0],[0,0,1.75],[0.33,0.23,0.15],10);
  for(const [x,z,sx,sz] of [[cx,cz-1.8,1.2,0.05],[cx,cz+1.8,1.2,0.05],[cx-1.2,cz,0.05,1.85],[cx+1.2,cz,0.05,1.85]])box([x,0.15,z],[sx,0,0],[0,0.15,0],[0,0,sz],[0.42,0.32,0.22],6);
  for(let r=0;r<3;r++){box([cx-0.75+r*0.75,0.25,cz],[0.18,0,0],[0,0.04,0],[0,0,1.6],[0.3,0.21,0.14],10);for(let k=0;k<6;k++){const p=[cx-0.75+r*0.75,0.33,cz-1.4+k*0.56];
      if(r<2){ico(p,0.17,[0.48,0.66,0.36],1,{detail:1,sy:0.75,jit:0.15});for(let j=0;j<5;j++){const a=j*1.26;ico(add(p,[Math.cos(a)*0.17,-0.03,Math.sin(a)*0.17]),0.11,[0.4,0.6,0.32],1,{sy:0.35});}}
      else for(let j=0;j<5;j++)cyl(p,add(p,[rr(-0.07,0.07),rr(0.15,0.25),rr(-0.07,0.07)]),0.012,0.004,4,[0.36,0.6,0.22],13);}}
  const tp=[cx+0.85,2.1,cz+1.35];for(const [dx,dz] of [[-0.3,-0.3],[0.3,-0.3],[0.3,0.3],[-0.3,0.3]]){const b=[cx+0.85+dx,0.22,cz+1.35+dz];cyl(b,tp,0.022,0.016,5,[0.55,0.43,0.3],6);
    for(let t=0.1;t<0.92;t+=0.08)ico(add(b,mul(sub(tp,b),t)),rr(0.05,0.08),mix3([0.25,0.48,0.18],[0.38,0.58,0.24],rnd()),1,{sy:0.7});}}
// bench under the apple tree
{const x=-4.6,z=4.0;for(const dz of [-0.12,0,0.12])B(x,0.46,z+dz,1.6,0.05,0.11,[0.52,0.4,0.28],6,0.3);for(const dy of [0.7,0.84])B(x+0.05,dy,z+0.22,1.6,0.1,0.04,[0.5,0.38,0.27],6,0.3);
  for(const e of [-0.7,0.7]){const c=Math.cos(0.3),s=Math.sin(0.3);B(x+c*e,0.23,z+s*e,0.07,0.46,0.38,[0.42,0.32,0.22],6,0.3);}}
// trees: bark trunks with branches, lumpy canopies
K.tree(-5.3,4.6,1,{apples:true});K.tree(4.6,4.2,1.2);K.tree(1.6,5.8,0.9);for(const [x,z,s] of [[-9.5,2,1.3],[9.8,-2,1.1],[-2.5,9.8,1.4],[6.5,9.2,1.2],[-13,-9,1.0],[11,6,1.4],[-12,9,1.5]])K.tree(x,z,s);
// grass: tufts everywhere outside the beds, denser along fence, walls and paths
for(let k=0;k<2600;k++){const x=rr(-14,14),z=rr(-9.6,12);if(Math.abs(x)<3.65&&z>-3.0&&z<2.95)continue;if(Math.abs(x)<0.65&&z<-3.6&&z>-9.8)continue;if(x<-4.3&&x>-6.9&&z>-2&&z<1.8)continue;
  if(Math.abs(x)<3.4&&z<-2.9&&z>-3.55)continue;tuft(x,z,rnd()<0.3?6:4,rr(0.08,0.2));}
for(let k=0;k<500;k++){const side=k%4,u=rnd();const x=side<2?(side?-1:1)*rr(3.55,3.8):rr(-3.6,3.6),z=side<2?rr(-2.9,2.9):(side===2?-1:1)*rr(2.85,3.05);tuft(x,z,6,rr(0.15,0.32));}
// a few daisies and dandelions in the grass
for(let k=0;k<120;k++){const x=rr(-7,7),z=rr(-9,6);if(Math.abs(x)<3.7&&z>-3.6&&z<3.2)continue;flower(x,0,z,rnd()<0.6?[0.98,0.97,0.94]:[0.99,0.85,0.25],rr(0.08,0.16));}

return{target:[-0.4,2.4,-1.4],dist:25,dir:[-0.6,0.52,-0.6],shadowC:[0,1.5,-1],shadowR:15};};
