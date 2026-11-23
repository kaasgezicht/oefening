'use strict';
// ===== buildings/harbour.js — the freight harbour's buildings in the village houses' kit (4.51.0, the user: "the same detail as the
// houses, Victorian, textured brick, detailed roofs, not blocky"). Built with the Victorian station toolkit (KIT.stationKit: brick
// blocks with stone quoins and plinths, round-arched windows with voussoirs and keystones, slate roofs with single slates, bargeboards,
// iron cresting, chimneys with pots, gas lamps). Each model stands at the origin, ground y = 0, its front toward −z.
//  portWareA: a three-storey brick warehouse, 22 × 16 m: three timber loading doors with iron straps under segmental arches, arched
//             windows on every floor, a stack of hoist doors over the middle with a cathead beam, pulley and chain, stone bands, a
//             slate roof with cresting and a chimney.
//  portWareB: a two-storey warehouse, 16 × 12 m, with a slate canopy on cast iron columns over its loading doors.
//  portShed:  the train shed over the two harbour tracks (rail top y = 0, the tracks at z ±3.6): cast iron columns with capitals and
//             spandrel brackets, lattice trusses, a slate roof with a glazed lantern along the ridge, glazed gable screens.
//  portQuay / portQuayL: 10 m of quay (the face at z = 0, the sea toward −z, the quay deck top y = 0): granite coping, ashlar courses
//             down to the sea floor, timber fenders with iron bands and a waler, a cast iron bollard, big stone flags; L adds an iron
//             ladder and a gas lamp.
//  portPave:  a 10 × 10 m patch of cobbled yard. portPier: a brick pier with a stone cap under the deck. portStilt: four timber
//             piles with cross braces and a cap beam.
(function(){
const PIER_H=14;
function parts(K){const P=KIT.stationKit(K),S=KIT.SK,{box,B,beam,cyl,ico,quad,fp,fb,rnd,rr,pick}=K,{add,mul}=K.v;return{P,S,box,B,beam,cyl,ico,quad,fp,fb,rnd,rr,pick,add,mul};}
const TIMBER=[0.34,0.22,0.13],STRAP=[0.12,0.12,0.12],GLASS=[0.55,0.66,0.72],GRANITE=[[0.62,0.6,0.57],[0.58,0.56,0.54],[0.66,0.64,0.6],[0.55,0.54,0.52]];
// a pair of plank doors with iron straps and hinges under a segmental brick arch with a stone keystone
function loadDoor(K,f,u,y0,w,h){const {fb,fp,box,pick}=parts(K),{add,mul}=K.v,S=KIT.SK;fb(f,u,y0+h/2,0.02,w,h,0.06,TIMBER,6);
  for(let k=1;k<Math.round(w/0.18);k++)fb(f,u-w/2+k*w/Math.round(w/0.18),y0+h/2,0.055,0.015,h-0.1,0.01,[0.24,0.15,0.09],6);
  fb(f,u,y0+h/2,0.06,0.04,h,0.02,[0.2,0.13,0.08],6);for(const y of [y0+0.4,y0+h/2,y0+h-0.4])for(const e of [-1,1])fb(f,u+e*w/4,y,0.07,w/2-0.15,0.08,0.02,STRAP,11);
  const N=9,r=w/2+0.25;for(let k=0;k<N;k++){const a=Math.PI*(0.15+0.7*(k+0.5)/N),c=fp(f,u+Math.cos(a)*r,y0+h-0.25+Math.sin(a)*r*0.45,0.04),Tt=add(mul(f.t,-Math.sin(a)),[0,Math.cos(a),0]),Rd=add(mul(f.t,Math.cos(a)),[0,Math.sin(a),0]);
    box(c,mul(Tt,0.17),mul(Rd,0.18),mul(f.n,0.08),k===(N>>1)?pick(S.STONE2):S.BRICK2,k===(N>>1)?8:24);}
  for(const e of [-1,1])fb(f,u+e*(w/2+0.12),y0+h/2,0.03,0.22,h,0.12,pick(S.STONE2),8);fb(f,u,y0-0.04,0.03,w+0.4,0.1,0.25,pick(S.STONE2),8);}
// a warehouse: brick block, stone bands per floor, windows, loading doors, the hoist stack, roof with bargeboards, cresting, chimney
function warehouse(K,W,D,floors,fh,o){o=o||{};const {P,S,B,beam,cyl,ico,fp,fb}=parts(K),x0=-W/2,x1=W/2,z0=-D/2,z1=D/2,eav=floors*fh,bands=[];for(let k=1;k<floors;k++)bands.push(k*fh);
  const F=P.block(x0,x1,z0,z1,-0.3,eav,{bands});fb(F.front,0,eav-0.15,0.06,W+0.3,0.3,0.2,S.STONE,8);fb(F.back,0,eav-0.15,0.06,W+0.3,0.3,0.2,S.STONE,8);
  const doors=o.doors||[-W/3,0,W/3],dw=2.6,dh=Math.min(3.1,fh-0.5);for(const u of doors)loadDoor(K,F.front,u,0,dw,dh);
  const bays=[];for(let u=x0+1.8;u<=x1-1.7;u+=2.8)bays.push(u);
  for(const u of bays){for(let f=0;f<floors;f++){const y=f*fh+0.9,h=fh-1.6;if(f===0&&doors.some(d=>Math.abs(d-u)<2.2))continue;if(f>0&&Math.abs(u)<1.3)continue;P.arch(F.front,u,y,1.0,h,{dep:0.16});}
    for(let f=0;f<floors;f++)P.arch(F.back,u,f*fh+0.9,1.0,fh-1.6,{dep:0.16});}
  for(const sd of [F.left,F.right])for(let u=-D/2+2;u<=D/2-1.9;u+=3)for(let f=0;f<floors;f++)P.arch(sd,u,f*fh+0.9,1.0,fh-1.6,{dep:0.16});
  // the hoist doors up the middle, a cathead beam with a pulley, a chain and a hook
  for(let f=1;f<floors;f++){fb(F.front,0,f*fh+1.3,0.02,1.5,2.2,0.06,TIMBER,6);fb(F.front,0,f*fh+0.25,0.18,1.9,0.12,0.5,S.STONE,8);for(const e of [-1,1])fb(F.front,e*0.95,f*fh+1.3,0.04,0.16,2.4,0.1,S.STONE,8);
    for(const e of [-1,1])fb(F.front,0,f*fh+0.9,0.35,1.5,0.05,0.04,S.IRON,11);}
  {const yb=eav-0.6,a=fp(F.front,0,yb,-0.2),b=fp(F.front,0,yb,1.6);beam(a,b,[0,1,0],0.28,0.3,TIMBER,6);cyl(add2(b,[0,-0.25,0]),add2(b,[0,-0.25,0.001]),0.22,0.22,10,S.IRON,11);
    const top=add2(b,[0,-0.45,0]),bot=add2(b,[0,-(eav-fh-0.4),0]);cyl(top,bot,0.025,0.025,4,S.IRON,11);ico(bot,0.12,S.IRON,11);}
  // roof: slates, gable ends in brick with bargeboards, cresting, a chimney
  const rise=o.rise||D*0.3,rf=P.roof([0,0],[1,0],W/2,D/2,eav,rise,{nx:Math.round(W*2.6)});P.gable(F.left,D/2,eav,eav+rise);P.gable(F.right,D/2,eav,eav+rise);
  P.barge(rf,-1,{spike:0.9});P.barge(rf,1,{spike:0.9});P.crest(rf,-W/2+0.6,W/2-0.6);P.chimney(W/2-2.5,D/4,eav,eav+rise+1.6,0.9,0.7,2);
  // a little round window in each gable
  for(const sd of [F.left,F.right]){const c=fp(sd,0,eav+rise*0.45,0.02);cyl(c,fp(sd,0,eav+rise*0.45,0.08),0.55,0.55,14,S.STONE,8);cyl(fp(sd,0,eav+rise*0.45,0.08),fp(sd,0,eav+rise*0.45,0.09),0.42,0.42,14,K.C.glow,2);}
  return{F,eav,rf};}
const add2=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
KIT.models.portWareA=function(K){K.seed(311);warehouse(K,22,16,3,3.6,{rise:4.6});return{};};
KIT.models.portWareB=function(K){K.seed(512);const {P,S}=parts(K),w=warehouse(K,16,12,2,3.7,{doors:[-4,4],rise:3.8});
  P.canopy(-7.6,7.6,-6-3.2,-6,{H:3.9});void w;void S;return{};};
// the train shed: two tracks at z ±3.6, columns on the outer platform edges (z ±9.2), lattice trusses, slate roof, glazed lantern, glazed ends
KIT.models.portShed=function(K){K.seed(77);const {P,S,B,beam,cyl,quad}=parts(K),L=28,ZC=9.2,H=7.4,rise=4.4,Y0=S.PY;
  const cols=[];for(let x=-L;x<=L+0.01;x+=7)cols.push(x);
  for(const x of cols)for(const z of [-ZC,ZC]){cyl([x,Y0,z],[x,Y0+0.5,z],0.2,0.15,10,S.IRON,11);cyl([x,Y0+0.5,z],[x,H-0.35,z],0.1,0.09,10,S.IRON,11);for(const y of [Y0+0.6,H-0.9])cyl([x,y,z],[x,y+0.08,z],0.14,0.14,10,S.IRON,11);
    cyl([x,H-0.45,z],[x,H-0.15,z],0.1,0.22,10,S.IRON,11);}
  // eaves girders along the columns with spandrel arcs
  for(const z of [-ZC,ZC]){beam([-L,H-0.08,z],[L,H-0.08,z],[0,1,0],0.3,0.16,S.IRON,11);for(let k=0;k<cols.length-1;k++){const xa=cols[k],xb=cols[k+1],n=8;for(let j=0;j<n;j++){const f0=j/n,f1=(j+1)/n,ya=H-0.25-1.2*Math.sin(Math.PI*f0),yb=H-0.25-1.2*Math.sin(Math.PI*f1);
      if(f0<0.3||f1>0.7)beam([xa+(xb-xa)*f0,ya,z],[xa+(xb-xa)*f1,yb,z],[0,0,1],0.05,0.06,S.IRON,11);}}}
  // trusses at every column pair: rafters, a tie, posts and diagonals
  const yR=z=>H+rise*(1-Math.abs(z)/ZC);
  for(const x of cols){beam([x,H,-ZC],[x,H+rise,0],[1,0,0],0.12,0.22,S.IRON,11);beam([x,H,ZC],[x,H+rise,0],[1,0,0],0.12,0.22,S.IRON,11);beam([x,H+0.2,-ZC],[x,H+0.2,ZC],[1,0,0],0.06,0.1,S.IRON,11);
    for(let k=1;k<6;k++){const z=-ZC+ZC*k/3;if(Math.abs(z)>ZC-0.1)continue;beam([x,H+0.2,z],[x,yR(z)-0.1,z],[1,0,0],0.05,0.06,S.IRON,11);const z2=z+(z<0?ZC/3:-ZC/3);beam([x,H+0.2,z],[x,yR(z2)-0.1,z2],[1,0,0],0.04,0.05,S.IRON,11);}}
  // the slate roof, the glazed lantern on the ridge (glass with iron bars, its own small slate cap), glazed gable screens
  const rf=P.roof([0,0],[1,0],L+0.4,ZC,H,rise,{ov:0.4,gov:0.5,nx:Math.round(L*5),mossClumps:3});P.crest(rf,-L,L);void rf;
  for(const sd of [-1,1]){const zz=sd*1.6;for(let x=-L+0.2;x<L;x+=1.4){quad([x,H+rise+0.15,zz],[x+1.3,H+rise+0.15,zz],[x+1.3,H+rise+1.2,zz*0.9],[x,H+rise+1.2,zz*0.9],[0,0.3,sd],GLASS,2);B(x,H+rise+0.68,zz,0.06,1.1,0.06,S.IRON,11);}}
  for(const sd of [-1,1])quad([-L-0.2,H+rise+1.15,sd*2.0],[L+0.2,H+rise+1.15,sd*2.0],[L+0.2,H+rise+1.8,0],[-L-0.2,H+rise+1.8,0],[0,0.95,sd*0.3],[0.42,0.45,0.47],11);/* the lantern's zinc cap */
  for(const x of [-L-0.3,L+0.3]){const n=12;for(let k=0;k<n;k++){const z0=-ZC+2*ZC*k/n,z1=-ZC+2*ZC*(k+1)/n,ya=yR(z0)-0.15,yb=yR(z1)-0.15;quad([x,H+0.2,z0],[x,H+0.2,z1],[x,yb,z1],[x,ya,z0],[x<0?-1:1,0,0],GLASS,2);B(x,(H+0.2+Math.min(ya,yb))/2+0.5,z0,0.08,Math.max(0.5,Math.min(ya,yb)-H),0.06,S.IRON,11);}
    beam([x,H+0.1,-ZC],[x,H+0.1,ZC],[1,0,0],0.1,0.25,S.CREAM,0);for(let k=0;k<Math.round(2*ZC/0.5);k++){const z=-ZC+0.25+k*0.5;B(x,H-0.25,z,0.05,0.5,0.32,S.CREAM,0);}}
  return{};};
// 10 m of quay
function quay(K,ladder){const {B,beam,cyl,ico,pick,rr}=parts(K),S=KIT.SK;
  for(let x=-5;x<5;){const l=Math.min(rr(0.9,1.7),5-x);B(x+l/2,-0.14,-0.05+0.35,l-0.02,0.28,0.8,pick(GRANITE),8);x+=l;}
  for(let y=-0.28,k=0;y>-8;k++){const h=rr(0.42,0.58);let x=-5+(k%2?0.4:0);while(x<5){const l=Math.min(rr(0.8,1.5),5-x);if(l>0.1)B(x+l/2,y-h/2,0.2,l-0.03,h-0.03,0.42,pick(S.STONE2),8);x+=l;}if(k%2)B(-4.8,y-h/2,0.2,0.4,h-0.03,0.42,pick(S.STONE2),8);y-=h;}
  B(0,-4,1.2,10,8,1.6,S.STONE2[1],8);
  for(let x=-5;x<5;x+=2){for(let z=1;z<15;z+=1.5)B(x+1,-0.08,z+0.75,1.96,0.16,1.46,pick(GRANITE),8);}
  for(const x of [-2.5,2.5]){B(x,-3,-0.42,0.32,6.6,0.32,TIMBER,6);for(const y of [-5.5,-3.5,-1.5])B(x,y,-0.42,0.36,0.1,0.36,STRAP,11);}
  B(0,-1.2,-0.62,10,0.3,0.24,TIMBER,6);
  cyl([0,0,0.9],[0,0.55,0.9],0.2,0.16,12,S.IRON,11);cyl([0,0.55,0.9],[0,0.66,0.9],0.3,0.3,12,S.IRON,11);ico([0,0.7,0.9],0.12,S.IRON,11);
  if(ladder){for(const e of [-0.25,0.25])B(3.8+e,-3,-0.15,0.05,6.4,0.05,S.IRON,11);for(let y=-6;y<0.2;y+=0.3)B(3.8,y,-0.15,0.5,0.04,0.04,S.IRON,11);for(const e of [-0.25,0.25])beam([3.8+e,0.1,-0.15],[3.8+e,1.0,0.3],[1,0,0],0.04,0.04,S.IRON,11);
    KIT.stationKit(K).lamp(-3.5,0,13.8,3.6);}}
KIT.models.portQuay=function(K){K.seed(41);quay(K,false);return{};};
KIT.models.portQuayL=function(K){K.seed(42);quay(K,true);return{};};
KIT.models.portPave=function(K){K.seed(9);const {B}=parts(K);B(0,0.01,0,10,0.02,10,[0.5,0.47,0.43],19);return{};};
KIT.models.portPier=function(K){K.seed(13);const {B,pick}=parts(K),S=KIT.SK;B(0,-PIER_H/2-0.9,0,1.8,PIER_H,1.8,S.BRICK,24);B(0,-0.75,0,2.2,0.3,2.2,pick(S.STONE2),8);for(let y=-3;y>-PIER_H;y-=3)B(0,y,0,1.95,0.18,1.95,pick(S.STONE2),8);return{};};
KIT.models.portStilt=function(K){K.seed(14);const {B,beam}=parts(K);for(const [x,z] of [[-0.9,-0.9],[0.9,-0.9],[-0.9,0.9],[0.9,0.9]])B(x,-PIER_H/2-0.6,z,0.36,PIER_H,0.36,TIMBER,6);
  for(const z of [-0.9,0.9]){beam([-0.9,-1.2,z],[0.9,-4,z],[0,0,1],0.12,0.14,TIMBER,6);beam([0.9,-4.4,z],[-0.9,-7.2,z],[0,0,1],0.12,0.14,TIMBER,6);}B(0,-0.75,0,2.4,0.3,0.4,TIMBER,6);B(0,-0.75,0,0.4,0.3,2.4,TIMBER,6);return{};};
})();
