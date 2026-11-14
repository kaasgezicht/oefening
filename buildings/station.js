'use strict';
// ===== buildings/station.js — Victorian brick railway stations (user's two reference images, Nov 2026: "Ravenbrook").
// Local frame: the track runs along x through the origin (rail top y = 0); the platform is z 1.5..5.7 (top y = 1.0) and is drawn
// from 4 m platform pieces (plat*) so it can follow curves and grow; the building stands behind it (z >= 5.8) and faces the track (-z).
// station: the default one: two-storey red brick house with a big cross gable over the platform (paired arched windows, ornate
// bargeboards, finial), a one-storey wing with its own small gable, cream stone quoins and dressings, slate roofs with iron cresting,
// tall chimneys; a slate canopy on cast iron columns with spandrel brackets and a dagged valance, a hanging clock, a name board,
// gas lamps, benches, planters and hanging baskets, a luggage cart with trunks, a notice board, a low wall with railings, and a
// green lattice footbridge over the line.
// stationTown: the grand one for a town at its largest: a long two-storey range with three cross gables, dormers with pinnacles,
// and a square clock tower (clocks on four sides, slate spire with lucarnes and a cross) in the middle.
(function(){
const STONE=[0.86,0.79,0.62],STONE2=[[0.86,0.79,0.62],[0.82,0.74,0.57],[0.88,0.82,0.66],[0.8,0.72,0.55]],BRICK=[0.6,0.27,0.18],BRICK2=[0.5,0.22,0.15],
  IRON=[0.13,0.21,0.18],CREAM=[0.9,0.84,0.66],PAVE=[0.58,0.4,0.3],WOOD=[0.46,0.3,0.18],DOOR=[0.36,0.16,0.12],BLUE=[0.1,0.18,0.42],GOLD=[0.86,0.68,0.26];
const SLATE={mat:18,pal:[[0.3,0.32,0.37],[0.27,0.29,0.34],[0.34,0.36,0.41],[0.25,0.26,0.3],[0.32,0.33,0.36]],exp:0.15,len:0.28,th:0.016,w:[0.2,0.3],wideP:0.05,phi:[0.05,0.08],gap:0.012,missing:0.003,fresh:[0.4,0.42,0.48],aged:[0.4,0.38,0.34],agedP:0.95,yaw:0.03};
const PY=1.0;// platform top

// ---------------- shared pieces
function kitOf(K){const {box,B,beam,cyl,ico,quad,tri,flower,fp,fb,rnd,rr,pick}=K,{add,sub,mul,norm,mix3}=K.v;
  const P={};
  // gas lamp post on the platform (or ground y0): fluted base, slim shaft, ladder bar, lantern with glow panes and a cap
  P.lamp=(x,y0,z,h)=>{h=h||3.4;cyl([x,y0,z],[x,y0+0.45,z],0.15,0.11,8,IRON,11);cyl([x,y0+0.45,z],[x,y0+h,z],0.06,0.045,8,IRON,11);B(x,y0+h-0.55,z,0.5,0.04,0.04,IRON,11);
    B(x,y0+h+0.22,z,0.28,0.4,0.28,[1,0.86,0.55],3);for(const e of [-1,1])for(const e2 of [-1,1])B(x+e*0.14,y0+h+0.22,z+e2*0.14,0.035,0.44,0.035,IRON,11);
    cyl([x,y0+h+0.42,z],[x,y0+h+0.62,z],0.24,0.03,4,IRON,11);cyl([x,y0+h-0.02,z],[x,y0+h+0.03,z],0.2,0.2,4,IRON,11);};
  // lantern hanging from the canopy beam on a rod
  P.lantern=(x,y,z,yTop)=>{cyl([x,yTop,z],[x,y+0.3,z],0.015,0.015,4,IRON,11);B(x,y,z,0.26,0.36,0.26,[1,0.86,0.55],3);for(const e of [-1,1])for(const e2 of [-1,1])B(x+e*0.13,y,z+e2*0.13,0.03,0.4,0.03,IRON,11);cyl([x,y+0.18,z],[x,y+0.36,z],0.2,0.03,4,IRON,11);B(x,y-0.2,z,0.12,0.05,0.12,IRON,11);};
  // stone steps from the ground (y -0.2) up to a door at floor level PY in a back wall at z zb (door centre x)
  P.steps=(x,zb)=>{const n=4,hh=(PY+0.2)/n;for(let k=0;k<n;k++){const d=(n-k)*0.32;B(x,-0.2+hh*(k+0.5),zb+d/2,2.2-k*0.1,hh,d,pick(STONE2),8);}
    for(const e of [-1,1])B(x+e*1.2,(PY-0.2)/2+0.05,zb+0.7,0.22,PY+0.3,1.4,STONE,8);};
  // bench: wooden slats on cast iron ends, facing -z (dir 1) or +z (dir -1)
  P.bench=(x,y0,z,len,dir)=>{dir=dir||1;for(const dz of [-0.13,0,0.13])B(x,y0+0.45,z+dz*dir,len,0.04,0.11,WOOD,6);for(const dy of [0.66,0.8])B(x,y0+dy,z+0.22*dir,len,0.09,0.035,WOOD,6);
    for(const e of [-1,1]){const ex=x+e*(len/2-0.12);B(ex,y0+0.22,z,0.06,0.44,0.42,IRON,11);B(ex,y0+0.6,z+0.2*dir,0.06,0.5,0.06,IRON,11);B(ex,y0+0.5,z-0.02*dir,0.06,0.05,0.44,IRON,11);}};
  // planter tub with flowers
  P.planter=(x,y0,z,r)=>{r=r||0.32;cyl([x,y0,z],[x,y0+0.42,z],r*0.82,r,10,[0.42,0.28,0.18],16,[0.3,0.22,0.15],10);for(let k=0;k<7;k++){const a=k*0.9,rr2=k?r*0.55:0;ico([x+Math.cos(a)*rr2,y0+0.5,z+Math.sin(a)*rr2],0.16,mix3([0.25,0.46,0.18],[0.4,0.56,0.22],rnd()),1,{detail:1,sy:0.8,jit:0.25});}
    for(let k=0;k<8;k++){const a=rnd()*6.28,d=rnd()*r*0.8;flower(x+Math.cos(a)*d,y0+0.5,z+Math.sin(a)*d,pick(K.C.flowers),0.18);}};
  // hanging basket: chains, a moss ball with trailing green and flowers
  P.basket=(x,y,z)=>{cyl([x,y+0.55,z],[x,y,z],0.008,0.008,4,IRON,11);ico([x,y-0.12,z],0.22,[0.28,0.48,0.2],1,{detail:1,sy:0.75,jit:0.3});
    for(let k=0;k<10;k++){const a=k*0.63;flower(x+Math.cos(a)*0.17,y-0.14,z+Math.sin(a)*0.17,pick(K.C.flowers),0.08);if(k%3===0)ico([x+Math.cos(a)*0.2,y-0.3,z+Math.sin(a)*0.2],0.07,[0.25,0.45,0.18],1);}};
  // luggage cart with trunks
  P.cart=(x,y0,z,ry)=>{const c=Math.cos(ry||0),s=Math.sin(ry||0),T=(a,b)=>[x+c*a-s*b,z+s*a+c*b];
    {const q=T(0,0);B(q[0],y0+0.55,q[1],1.9,0.08,0.9,WOOD,6,ry);}for(const [a,b] of [[-0.7,-0.48],[0.7,-0.48],[-0.7,0.48],[0.7,0.48]]){const q=T(a,b),n=[-s,0,c];cyl([q[0]-n[0]*0.03,y0+0.28,q[1]-n[2]*0.03],[q[0]+n[0]*0.03,y0+0.28,q[1]+n[2]*0.03],0.28,0.28,12,IRON,11,IRON,11);}
    {const q=T(-1.05,0);beam([q[0],y0+0.6,q[1]],[q[0]-c*0.5,y0+1.0,q[1]-s*0.5],[0,0,1],0.05,0.05,IRON,11);}
    const tk=[[-0.45,-0.18,0.8,0.42,0.5,[0.45,0.25,0.14]],[0.42,-0.15,0.7,0.36,0.48,[0.34,0.2,0.12]],[-0.1,0.2,0.9,0.36,0.4,[0.52,0.32,0.18]],[0.0,-0.05,0.6,0.3,0.36,[0.4,0.28,0.2]]];
    tk.forEach(([a,b,l,h,w,col],i)=>{const q=T(a,b),yy=y0+0.59+(i===3?0.45:0)+h/2;B(q[0],yy,q[1],l,h,w,col,6,ry);B(q[0],yy,q[1],l+0.02,0.05,w+0.02,[0.25,0.16,0.1],6,ry);for(const e of [-1,1]){const q2=T(a+e*l*0.3,b);B(q2[0],yy,q2[1],0.05,h+0.02,w+0.02,[0.2,0.14,0.08],6,ry);}});};
  // round-arched window: glass, stone jambs and sill, voussoirs alternating stone and dark brick, keystone; o.pair: two lights under one arch
  P.arch=(f,u,y0,w,h,o)=>{o=o||{};const r=w/2,ys=y0+h-r,dep=o.dep||0.18;fb(f,u,(y0+ys)/2,0.01,w,ys-y0,0.01,K.C.glow,2);
    const N=8;for(let k=0;k<N;k++){const a0=Math.PI*k/N,a1=Math.PI*(k+1)/N,Pp=a=>fp(f,u+Math.cos(a)*r,ys+Math.sin(a)*r,0.012),c=fp(f,u,ys,0.012);tri(c,Pp(a0),Pp(a1),K.C.glow,2);}
    // frame bars
    fb(f,u,(y0+ys)/2,0.04,0.05,ys-y0,0.04,CREAM,0);for(const yy of [y0+(ys-y0)*0.33,y0+(ys-y0)*0.66,ys])fb(f,u,yy,0.04,w,0.04,0.04,CREAM,0);
    if(o.pair){const m=fp(f,u,0,0);B(m[0],(y0+ys)/2,m[2],0.16,ys-y0,0.16,STONE,8);}
    for(const e of [-1,1]){fb(f,u+e*(r+0.09),(y0+ys)/2,0.04,0.18,ys-y0,dep,pick(STONE2),8);}
    const NV=o.nv||9,rv=r+0.12;for(let k=0;k<NV;k++){const a=Math.PI*(k+0.5)/NV,c=fp(f,u+Math.cos(a)*rv,ys+Math.sin(a)*rv,0.04),Tt=add(mul(f.t,-Math.sin(a)),[0,Math.cos(a),0]),Rd=add(mul(f.t,Math.cos(a)),[0,Math.sin(a),0]),kst=k===(NV>>1);
      box(c,mul(Tt,Math.PI*rv/NV/2-0.01),mul(Rd,kst?0.17:0.13),mul(f.n,dep/2+(kst?0.03:0)),kst||k%2===0?pick(STONE2):BRICK2,kst||k%2===0?8:24);}
    fb(f,u,y0-0.07,0.06,w+0.42,0.14,dep+0.12,STONE,8);};
  // pointed-arch double door with fanlight under a stone surround
  P.door=(f,u,y0,w,h)=>{const r=w/2,ys=y0+h-r;fb(f,u,(y0+ys)/2,0.01,w,ys-y0,0.02,DOOR,6);for(const e of [-1,1])for(let k=0;k<3;k++)fb(f,u+e*w*(0.12+k*0.13),(y0+ys)/2-0.1,0.03,0.03,ys-y0-0.5,0.03,[0.26,0.11,0.08],6);
    const N=8;for(let k=0;k<N;k++){const a0=Math.PI*k/N,a1=Math.PI*(k+1)/N,Pp=a=>fp(f,u+Math.cos(a)*r,ys+Math.sin(a)*r,0.012),c=fp(f,u,ys,0.012);tri(c,Pp(a0),Pp(a1),K.C.glow,2);}
    fb(f,u,ys,0.03,w,0.06,0.04,STONE,8);for(const e of [-1,1])fb(f,u+e*(r+0.1),(y0+ys)/2,0.04,0.2,ys-y0,0.22,pick(STONE2),8);
    const NV=9,rv=r+0.13;for(let k=0;k<NV;k++){const a=Math.PI*(k+0.5)/NV,c=fp(f,u+Math.cos(a)*rv,ys+Math.sin(a)*rv,0.05),Tt=add(mul(f.t,-Math.sin(a)),[0,Math.cos(a),0]),Rd=add(mul(f.t,Math.cos(a)),[0,Math.sin(a),0]);
      box(c,mul(Tt,Math.PI*rv/NV/2-0.01),mul(Rd,0.14),mul(f.n,0.13),k%2===0?pick(STONE2):BRICK2,k%2===0?8:24);}};
  // a brick block from y0 to y1 with stone quoins and a stone plinth band; returns its walls
  P.block=(x0,x1,z0,z1,y0,y1,o)=>{o=o||{};B((x0+x1)/2,(y0+y1)/2,(z0+z1)/2,x1-x0,y1-y0,z1-z0,o.col||BRICK,24);const F=K.walls(x0,x1,z0,z1);
    const faces=o.faces||[F.front,F.back,F.left,F.right];
    for(const f of faces){fb(f,0,y0+0.25,0.04,f.half*2+0.1,0.5,0.1,STONE,8);if(o.bands)for(const yb of o.bands)fb(f,0,yb,0.04,f.half*2+0.08,0.16,0.1,STONE,8);
      if(K.lod<2)for(const e of [-1,1])for(let y=y0+0.5,k=0;y<y1-0.12;y+=0.36,k++){const l=k%2?0.3:0.52,hh=Math.min(0.34,y1-y);fb(f,e*(f.half-l/2+0.03),y+hh/2,0.025,l,hh-0.02,0.1,pick(STONE2),8);}}
    return F;};
  // brick gable triangle over a wall face from yb (width = 2*half) to the apex at ya
  P.gable=(f,half,yb,ya,col)=>{const a=fp(f,-half,yb,0.002),b=fp(f,half,yb,0.002),c=fp(f,0,ya,0.002);tri(a,b,c,col||BRICK,24);const a2=fp(f,-half,yb,-0.3),b2=fp(f,half,yb,-0.3),c2=fp(f,0,ya,-0.3);tri(b2,a2,c2,col||BRICK,24);};
  // decorative bargeboard: cream board under the verge with a drop finial and a spike at the apex
  P.barge=(rf,end,o)=>{o=o||{};const u=end*(rf.hx+0.04),Sf=rf.slope(-1),Sb=rf.slope(1);
    for(const Sl of [Sf,Sb]){const n=K.lod>=1?3:8;for(let j=0;j<n;j++){const p0=rf.rp(Sl,u,Sl.L*j/n,-0.14),p1=rf.rp(Sl,u,Sl.L*(j+1)/n,-0.14);beam(p0,add(p1,[0,0,0]),[0,1,0],0.06,0.32,CREAM,0);
        if(K.lod<1){const m=mul(add(p0,p1),0.5);ico([m[0],m[1]-0.24,m[2]],0.07,CREAM,0);}}}
    const top=rf.rp(Sf,u,Sf.L,0.1);cyl(add(top,[0,-0.6,0]),add(top,[0,0.15,0]),0.07,0.06,6,CREAM,0);cyl(add(top,[0,0.1,0]),add(top,[0,o.spike||1.3,0]),0.06,0.012,6,IRON,11);
    ico(add(top,[0,0.35,0]),0.09,IRON,11);};
  // iron cresting along a ridge (rf from K.roof)
  P.crest=(rf,x0,x1)=>{if(K.lod>=2)return;const Sf=rf.slope(-1);const a=rf.rp(Sf,x0,Sf.L,0.16),b=rf.rp(Sf,x1,Sf.L,0.16);beam(a,b,[0,1,0],0.04,0.04,IRON,11);
    const n=Math.round((x1-x0)/0.3);for(let k=0;k<=n;k++){const p=rf.rp(Sf,x0+(x1-x0)*k/n,Sf.L,0.16);cyl(p,add(p,[0,k%2?0.22:0.34,0]),0.016,0.008,4,IRON,11);if(k%4===0)ico(add(p,[0,0.36,0]),0.035,IRON,11);}};
  // brick chimney stack with a corbelled stone cap and pots
  P.chimney=(x,z,y0,y1,w,d,pots)=>{B(x,(y0+y1)/2,z,w,y1-y0,d,BRICK,24);B(x,y1-0.5,z,w+0.12,0.12,d+0.12,STONE,8);B(x,y1+0.06,z,w+0.22,0.12,d+0.22,STONE,8);B(x,y1-0.18,z,w+0.06,0.36,d+0.06,BRICK2,24);
    for(let k=0;k<(pots||2);k++){const px=x+(k-((pots||2)-1)/2)*w/(pots||2);cyl([px,y1+0.12,z],[px,y1+0.6,z],0.12,0.1,10,[0.66,0.36,0.23],0,[0.08,0.06,0.05],0);}};
  // a slate gable roof with bargeboards (ridge along dir) — K.roof with station defaults
  P.roof=(c,dir,halfLen,half,H,rise,o)=>K.roof(Object.assign({c,dir,halfLen,half,H,rise,ov:0.35,gov:0.3,th:0.14,sag:0.05,flare:0.06,wob:0.01,nx:Math.max(8,Math.round(halfLen*3)),cover:SLATE,trim:CREAM,mossClumps:6,ridgeMoss:0.03},o||{}));
  // the canopy over the platform: slate roof, cast iron columns with capitals and spandrel brackets, beams to the wall, a dagged valance
  P.canopy=(x0,x1,zf,zb,o)=>{o=o||{};const H=o.H||4.7,half=(zb-zf)/2,zc=(zf+zb)/2,rf=P.roof([(x0+x1)/2,zc],[1,0],(x1-x0)/2,half,H,0.9,{ov:0.25,gov:0.15,mossClumps:4});
    const eY=rf.eY,zE=zf-0.25;// eave line at the front
    // columns every ~4 m
    const n=Math.max(2,Math.round((x1-x0)/4)),cz=zf+0.35;const cols=[];for(let k=0;k<=n;k++){const x=x0+0.3+(x1-x0-0.6)*k/n;cols.push(x);
      cyl([x,PY,cz],[x,PY+0.35,cz],0.14,0.11,8,IRON,11);cyl([x,PY+0.35,cz],[x,H-0.25,cz],0.075,0.065,8,IRON,11);cyl([x,H-0.4,cz],[x,H-0.18,cz],0.08,0.16,8,IRON,11);
      beam([x,H-0.12,cz],[x,H-0.12,zb+0.02],[0,1,0],0.12,0.1,IRON,11);
      // spandrel brackets: quarter arcs from the column to the eave beam both ways along the track, and toward the wall
      if(K.lod<2)for(const [dx,dz] of [[1,0],[-1,0],[0,1]]){const R=0.85,N=K.lod>=1?3:6;for(let j=0;j<N;j++){const a0=Math.PI/2*j/N,a1=Math.PI/2*(j+1)/N,P0=[x+dx*(R-R*Math.cos(a0)),H-0.15-R+R*Math.sin(a0)*1,cz+dz*(R-R*Math.cos(a0))],P1=[x+dx*(R-R*Math.cos(a1)),H-0.15-R+R*Math.sin(a1),cz+dz*(R-R*Math.cos(a1))];
          beam(P0,P1,[dz,0,-dx],0.045,0.045,IRON,11);}if(K.lod<1)ico([x+dx*0.28,H-0.45,cz+dz*0.28],0.07,IRON,11);}}
    beam([x0,H-0.12,cz],[x1,H-0.12,cz],[0,1,0],0.16,0.12,IRON,11);
    // valance: cream boards with pointed drops along the front and both ends
    const val=(a,b,y)=>{const L=Math.hypot(b[0]-a[0],b[2]-a[2]),d=[(b[0]-a[0])/L,0,(b[2]-a[2])/L],nn=[-d[2],0,d[0]];beam([a[0],y-0.07,a[2]],[b[0],y-0.07,b[2]],[0,1,0],0.16,0.04,CREAM,0);
      if(K.lod>=2)return;if(K.lod>=1){beam([a[0],y-0.3,a[2]],[b[0],y-0.3,b[2]],[0,1,0],0.3,0.03,CREAM,0);return;}
      const m=Math.floor(L/0.26);for(let k=0;k<m;k++){const t=(k+0.5)/m*L,p=[a[0]+d[0]*t,y,a[2]+d[2]*t],w=0.11;quad([p[0]-d[0]*w,y-0.12,p[2]-d[2]*w],[p[0]+d[0]*w,y-0.12,p[2]+d[2]*w],[p[0]+d[0]*w,y-0.34,p[2]+d[2]*w],[p[0]-d[0]*w,y-0.34,p[2]-d[2]*w],nn,CREAM,0);
        tri([p[0]-d[0]*w,y-0.34,p[2]-d[2]*w],[p[0]+d[0]*w,y-0.34,p[2]+d[2]*w],[p[0],y-0.5,p[2]],CREAM,0);}};
    val([x0-0.15,0,zE],[x1+0.15,0,zE],eY+0.02);for(const xe of [x0-0.15,x1+0.15])val([xe,0,zE],[xe,0,zb],eY+0.02);
    return {rf,cols,H,cz};};
  // clock: a two-faced drum hanging from a bracket, faces looking along +-x (o.axis 'z' turns it to face +-z)
  P.clock=(x,y,z,r,o)=>{o=o||{};const ax=o.axis==='z'?[0,0,1]:[1,0,0],tk=o.depth||0.14,a=[x-ax[0]*tk,y,z-ax[2]*tk],b=[x+ax[0]*tk,y,z+ax[2]*tk];
    cyl(a,b,r+0.06,r+0.06,20,IRON,11,o.single?IRON:null,11);for(const s of o.single?[o.sgn||1]:[-1,1]){const c=[x+ax[0]*(tk+0.01)*s,y,z+ax[2]*(tk+0.01)*s],u=o.axis==='z'?[1,0,0]:[0,0,1];
      cyl(c,[c[0]+ax[0]*0.015*s,y,c[2]+ax[2]*0.015*s],r,r,20,[0.95,0.92,0.82],0,[0.95,0.92,0.82],0);
      if(K.lod<2)for(let k=0;k<12;k++){const an=k/12*Math.PI*2,p=[c[0]+ax[0]*0.03*s+u[0]*Math.cos(an)*r*0.82,y+Math.sin(an)*r*0.82,c[2]+ax[2]*0.03*s+u[2]*Math.cos(an)*r*0.82];box(p,mul(u,k%3?0.012:0.022),[0,k%3?0.03:0.05,0],mul(ax,0.006),[0.08,0.07,0.06],0);}
      const hc=[c[0]+ax[0]*0.035*s,y,c[2]+ax[2]*0.035*s];beam(hc,[hc[0]+u[0]*r*0.05,y+r*0.5,hc[2]+u[2]*r*0.05],ax,0.035,0.01,[0.06,0.05,0.05],0);beam(hc,[hc[0]+u[0]*r*0.62*s,y-r*0.2,hc[2]+u[2]*r*0.62*s],ax,0.025,0.01,[0.06,0.05,0.05],0);}};
  // name board: blue with a gold border and gold "lettering" (blocks of letter strokes), facing f.n
  P.board=(f,u,y,w,h)=>{fb(f,u,y,0.02,w,h,0.06,BLUE,0);for(const e of [-1,1]){fb(f,u,y+e*(h/2-0.03),0.06,w,0.05,0.03,GOLD,11);fb(f,u+e*(w/2-0.03),y,0.06,0.05,h,0.03,GOLD,11);}
    if(K.lod<1){let x=-w/2+0.25;const lh=h*0.42;let k=0;while(x<w/2-0.3){const lw=k===0?0.14:rr(0.07,0.12);fb(f,u+x,y,0.065,0.025,lh*(k===0?1.15:1),0.01,GOLD,0);if(rnd()<0.7)fb(f,u+x+lw/2,y+(rnd()<0.5?lh/2:-lh/2+0.01)*(k===0?1.1:1),0.065,lw,0.025,0.01,GOLD,0);if(rnd()<0.5)fb(f,u+x+lw,y,0.065,0.025,lh*rr(0.5,1),0.01,GOLD,0);x+=lw+0.11;k++;}}};
  // lattice girder side between two points (top chord at +hgt): chords and X lattice
  P.lattice=(a,b,hgt,o)=>{o=o||{};const L=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]),d=norm(sub(b,a)),side=norm([-d[2],0,d[0]]);beam(a,b,side,0.07,0.09,IRON,11);beam(add(a,[0,hgt,0]),add(b,[0,hgt,0]),side,0.09,0.07,IRON,11);
    if(K.lod>=2)return;const st=K.lod>=1?0.9:0.42,n=Math.max(2,Math.round(L/st));for(let k=0;k<n;k++){const p0=add(a,mul(sub(b,a),k/n)),p1=add(a,mul(sub(b,a),(k+1)/n));beam(p0,add(p1,[0,hgt,0]),side,0.035,0.02,IRON,11);beam(add(p0,[0,hgt,0]),p1,side,0.035,0.02,IRON,11);
      if(k%4===0)beam(p0,add(p0,[0,hgt,0]),side,0.05,0.05,IRON,11);}};
  // footbridge over the line at x xa..xb (deck at yd), from the platform (z zp) to a landing beyond the far side (z zf); stairs run toward -x
  P.footbridge=(xa,xb,zp,zf,yd,stairL,farY)=>{farY=farY===undefined?-0.2:farY;const w=xb-xa,xm=(xa+xb)/2,hh=1.15;
    // span: deck, two lattice sides, roof-less
    B(xm,yd-0.08,(zp+zf)/2,w,0.16,zp-zf,[0.32,0.3,0.28],12);B(xm,yd-0.3,(zp+zf)/2,w-0.2,0.3,zp-zf,IRON,11);
    for(const x of [xa+0.05,xb-0.05])P.lattice([x,yd,zf],[x,yd,zp],hh);
    // towers: four iron columns under each end with a lamp on top of the corner posts
    for(const z of [zp-0.4,zf+0.4])for(const x of [xa+0.1,xb-0.1]){const yb=z>0?PY:farY;cyl([x,yb,z],[x,yd,z],0.1,0.1,8,IRON,11);cyl([x,yd,z],[x,yd+hh+0.25,z],0.08,0.08,8,IRON,11);ico([x,yd+hh+0.32,z],0.1,IRON,11);}
    P.lamp(xb-0.1,yd+hh+0.3,zp-0.4,0.9);P.lamp(xb-0.1,yd+hh+0.3,zf+0.4,0.9);
    // stairs: platform side (z zp-1.2..zp) from (xa-stairL, PY) to (xa, yd); far side same at zf..zf+1.2 down to ground
    for(const [zz0,zz1,yb] of [[zp-1.25,zp-0.05,PY],[zf+0.05,zf+1.25,farY]]){const x0=xa-stairL,n=Math.round((yd-yb)/0.19),run=stairL/n;
      for(let k=0;k<n;k++){const x=x0+run*(k+0.5),y=yb+(yd-yb)*(k+1)/n;B(x,y-0.03,(zz0+zz1)/2,run+0.02,0.06,zz1-zz0,[0.34,0.32,0.3],12);if(K.lod<1)B(x+run/2-0.01,y-0.12,(zz0+zz1)/2,0.03,0.18,zz1-zz0,IRON,11);}
      for(const z of [zz0,zz1]){beam([x0,yb,z],[xa,yd,z],[0,0,1],0.22,0.06,IRON,11);P.lattice([x0,yb+0.05,z],[xa,yd+0.05,z],0.95);}
      // landing at the top joins the span; a post at the foot
      B(xa-0.0,yd-0.06,(zz0+zz1)/2,0.3,0.12,zz1-zz0,[0.34,0.32,0.3],12);cyl([x0,yb,zz0],[x0,yb+1.3,zz0],0.07,0.07,8,IRON,11);cyl([x0,yb,zz1],[x0,yb+1.3,zz1],0.07,0.07,8,IRON,11);
      cyl([(x0+xa)/2,yb,zz0],[(x0+xa)/2,(yb+yd)/2,zz0],0.08,0.08,8,IRON,11);cyl([(x0+xa)/2,yb,zz1],[(x0+xa)/2,(yb+yd)/2,zz1],0.08,0.08,8,IRON,11);}};
  // footbridge with several stairs: span x xa..xb from z zA down to zB (deck yd); stairs [[z0,z1,yFoot],...] each rise from xa-stairL to xa;
  // iron columns under the span beside every stair, a lamp on the corner posts at both ends of the span
  P.footbridgeN=(xa,xb,zA,zB,yd,stairL,stairs)=>{const w=xb-xa,xm=(xa+xb)/2,hh=1.15;
    B(xm,yd-0.08,(zA+zB)/2,w,0.16,zA-zB,[0.32,0.3,0.28],12);B(xm,yd-0.3,(zA+zB)/2,w-0.2,0.3,zA-zB,IRON,11);
    for(const x of [xa+0.05,xb-0.05])P.lattice([x,yd,zB],[x,yd,zA],hh);
    for(const st of stairs){const zc=(st[0]+st[1])/2,zcol=st[0]>0?st[0]-0.15:st[1]+0.15;for(const x of [xa+0.1,xb-0.1]){cyl([x,st[2],zcol],[x,yd,zcol],0.1,0.1,8,IRON,11);}}
    for(const z of [zA-0.3,zB+0.3])for(const x of [xa+0.1,xb-0.1]){cyl([x,yd,z],[x,yd+hh+0.25,z],0.08,0.08,8,IRON,11);ico([x,yd+hh+0.32,z],0.1,IRON,11);}
    P.lamp(xb-0.1,yd+hh+0.3,zA-0.3,0.9);P.lamp(xb-0.1,yd+hh+0.3,zB+0.3,0.9);
    for(const [zz0,zz1,yb] of stairs){const x0=xa-stairL,n=Math.round((yd-yb)/0.19),run=stairL/n;
      for(let k=0;k<n;k++){const x=x0+run*(k+0.5),y=yb+(yd-yb)*(k+1)/n;B(x,y-0.03,(zz0+zz1)/2,run+0.02,0.06,zz1-zz0,[0.34,0.32,0.3],12);if(K.lod<1)B(x+run/2-0.01,y-0.12,(zz0+zz1)/2,0.03,0.18,zz1-zz0,IRON,11);}
      for(const z of [zz0,zz1]){beam([x0,yb,z],[xa,yd,z],[0,0,1],0.22,0.06,IRON,11);P.lattice([x0,yb+0.05,z],[xa,yd+0.05,z],0.95);}
      B(xa,yd-0.06,(zz0+zz1)/2,0.3,0.12,zz1-zz0,[0.34,0.32,0.3],12);cyl([x0,yb,zz0],[x0,yb+1.3,zz0],0.07,0.07,8,IRON,11);cyl([x0,yb,zz1],[x0,yb+1.3,zz1],0.07,0.07,8,IRON,11);
      cyl([(x0+xa)/2,yb,zz0],[(x0+xa)/2,(yb+yd)/2,zz0],0.08,0.08,8,IRON,11);cyl([(x0+xa)/2,yb,zz1],[(x0+xa)/2,(yb+yd)/2,zz1],0.08,0.08,8,IRON,11);}};
  // a low brick wall with stone-capped pillars and iron railings between (along x at z, from x0 to x1, base y0)
  P.wall=(x0,x1,z,y0)=>{B((x0+x1)/2,y0+0.3,z,x1-x0,0.6,0.32,BRICK,24);B((x0+x1)/2,y0+0.64,z,x1-x0+0.04,0.08,0.4,STONE,8);
    const n=Math.max(1,Math.round((x1-x0)/2.4));for(let k=0;k<=n;k++){const x=x0+(x1-x0)*k/n;B(x,y0+0.55,z,0.44,1.1,0.44,BRICK,24);B(x,y0+1.14,z,0.54,0.08,0.54,STONE,8);ico([x,y0+1.3,z],0.15,STONE,8);}
    if(K.lod<2)for(let k=0;k<n;k++){const a=x0+(x1-x0)*k/n+0.3,b=x0+(x1-x0)*(k+1)/n-0.3;for(const yy of [0.82,1.4])B((a+b)/2,y0+yy,z,b-a,0.035,0.035,IRON,11);
      if(K.lod<1)for(let x=a;x<=b;x+=0.14){cyl([x,y0+0.68,z],[x,y0+1.5,z],0.012,0.012,4,IRON,11);cyl([x,y0+1.5,z],[x,y0+1.62,z],0.025,0.002,4,IRON,11);}}};
  // notice board with a little slate roof on two posts
  P.notice=(x,y0,z)=>{for(const e of [-0.55,0.55])B(x+e,y0+0.9,z,0.08,1.8,0.08,WOOD,6);B(x,y0+1.25,z,1.2,0.9,0.08,[0.35,0.24,0.15],6);B(x,y0+1.25,z-0.045,1.05,0.75,0.01,[0.92,0.9,0.8],0);
    for(let k=0;k<4;k++)B(x-0.3+(k%2)*0.55,y0+1.05+(k>>1)*0.38,z-0.05,0.36,0.26,0.01,[0.98,0.96,0.88],0);
    const a=[x-0.75,y0+1.95,z-0.35],b=[x+0.75,y0+1.95,z-0.35],c=[x+0.75,y0+2.2,z],d=[x-0.75,y0+2.2,z];quad(a,b,c,d,null,[0.3,0.32,0.37],18);quad([x-0.75,y0+2.2,z],[x+0.75,y0+2.2,z],[x+0.75,y0+1.95,z+0.35],[x-0.75,y0+1.95,z+0.35],null,[0.3,0.32,0.37],18);};
  return P;}
KIT.stationKit=kitOf;

// ---------------- the station buildings
function build(K,opt,town){const {B,beam,cyl,ico,quad,tri,fp,fb,rnd,rr,pick,tuft}=K,P=kitOf(K);
  // ---- main two-storey block
  const G1=PY+3.9,G2=PY+7.4;// first floor level, eaves
  const parts=[];
  const brickHouse=(x0,x1,z0,z1,eav,rise,o)=>{o=o||{};const F=P.block(x0,x1,z0,z1,-1.0,eav,{bands:o.band?[o.band]:[]});
    const rf=P.roof([(x0+x1)/2,(z0+z1)/2],[1,0],(x1-x0)/2,(z1-z0)/2,eav,rise,{skip:o.skip,ends:o.ends||[-1,1]});
    for(const e of o.ends||[-1,1]){P.gable(e<0?F.left:F.right,(z1-z0)/2,eav,eav+rise);P.barge(rf,e);}
    P.crest(rf,-rf.hl+0.4,rf.hl-0.4);parts.push({x0,x1,z0,z1,eav,rise,rf,F});return{F,rf};};
  // a cross gable facing the platform: front wall (z zf) from x0..x1, ridge back to zr; returns its front face
  const crossGable=(xc,hw,zf,zr,eav,rise,o)=>{o=o||{};const F=P.block(xc-hw,xc+hw,zf,zr,-1.0,eav,{bands:o.band?[o.band]:[],faces:o.faces});
    const rf=P.roof([xc,(zf+zr)/2],[0,1],(zr-zf)/2,hw,eav,rise,{ends:[-1],nx:Math.round((zr-zf)*3)});P.gable(F.front,hw,eav,eav+rise);P.barge(rf,-1,{spike:o.spike||1.6});
    return{F,rf};};
  // main-roof slates hidden only where a cross gable's roof lies over them: [xc, half width, front z limit, cross eave, cross rise]
  const skipIn=list=>Pt=>list.some(([xc,hw,zm,ev,ri,z0])=>Math.abs(Pt[0]-xc)<hw+0.3&&Pt[2]<zm&&Pt[2]>(z0||-99)&&Pt[1]<ev+ri*(1-Math.max(0,Math.abs(Pt[0]-xc)-0.0)/(hw+0.35))+0.12);
  let nameX,clockX,fbX0,fbX1;
  if(!town){
    // default: main house x -5.5..5.5, z 6..12.4; cross gable x -2.7..2.7 out to z 5.7; wing x -14..-5.5 (one storey) with a small gable
    const main=brickHouse(-5.5,5.5,6.0,12.4,G2,4.6,{band:G1,skip:skipIn([[0,2.7,9.6,PY+7.8,3.9]])});
    const cg=crossGable(0,2.7,5.7,9.4,G2+0.4,3.9,{band:G1});
    // ground floor: arched door and windows under the canopy; first floor: a big paired arched window in the cross gable, side windows
    P.door(cg.F.front,0,PY,1.7,3.0);for(const u of [-1.7,1.7])P.arch(cg.F.front,u,PY+0.8,0.9,2.3);
    P.arch(cg.F.front,-0.62,G1+0.5,1.0,2.6,{});P.arch(cg.F.front,0.62,G1+0.5,1.0,2.6,{});fb(cg.F.front,0,G1+0.4,0.08,2.8,0.16,0.22,STONE,8);
    P.arch(cg.F.front,0,G2+1.0,0.7,1.3,{nv:7});
    for(const u of [-4.3,4.3]){P.arch(main.F.front,u,PY+0.8,1.0,2.3);P.arch(main.F.front,u,G1+0.6,0.9,2.1);}
    for(const u of [-3.5,3.5])P.arch(main.F.back,u,PY+0.8,1.0,2.3);for(const u of [-3.5,0,3.5])P.arch(main.F.back,u,G1+0.6,0.9,2.1);P.door(main.F.back,0,PY,1.6,2.9);P.steps(0,12.4);
    for(const f of [main.F.right])for(const u of [-1.6,1.6]){P.arch(f,u,PY+0.8,1.0,2.3);P.arch(f,u,G1+0.6,0.9,2.1);}
    P.arch(main.F.right,0,G2+0.6,0.8,1.6,{nv:7});P.arch(main.F.left,0,G2+0.6,0.8,1.6,{nv:7});
    P.chimney(-3.6,10.6,G2,G2+6.4,0.9,0.7,3);P.chimney(3.8,7.6,G2,G2+6.0,0.9,0.7,2);
    // wing
    const EW=PY+4.4,wing=brickHouse(-14.0,-5.5,6.4,11.8,EW,3.2,{ends:[-1],skip:skipIn([[-10,1.5,9.0,PY+4.7,2.6]])});
    const wg=crossGable(-10.0,1.5,6.1,8.8,EW+0.3,2.6,{});P.arch(wg.F.front,0,EW+0.45,0.6,1.15,{nv:7});P.arch(wg.F.front,0,PY+0.8,1.2,2.4);
    for(const u of [-6.4,-1.8,2.2])P.arch(wing.F.front,u,PY+0.8,1.0,2.3);P.arch(wing.F.left,0.0,PY+0.8,1.0,2.3);for(const u of [-2.5,0.8,3.2])P.arch(wing.F.back,u,PY+0.8,1.0,2.3);
    P.chimney(-12.6,9.0,EW,EW+4.2,0.8,0.6,2);
    // dormers on the main roof front
    nameX=-12.4;clockX=2.6;fbX0=17.4;fbX1=19.6;
    const cn=P.canopy(-14.6,11.5,1.9,6.0,{H:PY+3.75});
    for(const k of [1,3,5])if(cn.cols[k]!==undefined)P.basket(cn.cols[k],PY+3.0,cn.cz);
    P.clock(clockX,PY+3.0,cn.cz+0.1,0.42);beam([clockX,PY+3.55,cn.cz+0.1],[clockX,cn.H-0.12,cn.cz+0.1],[1,0,0],0.06,0.06,IRON,11);
    for(const x of [-7.6,7.6])P.bench(x,PY,5.2,1.9,1);P.bench(-2.0+11.0,PY,5.2,1.8,1);
    for(const x of [-4.5,4.0,-12.6])P.planter(x,PY,5.25,0.32);
    P.cart(-1.0,PY,3.6,0.08);P.notice(-16.6,PY,5.3);P.wall(-21.5,-15.2,5.55,PY);
    P.lamp(-18.2,PY,4.6,3.2);P.lamp(13.0,PY,2.75,3.2);for(const x of [-9,0,6])P.lantern(x,PY+2.7,3.9,PY+3.6);
    // name boards: on the canopy end and on a pair of posts at the platform end
    {const f=K.face([nameX,0,1.62],[0,0,-1],[1,0,0],1);P.board(f,0,PY+4.05,2.6,0.48);}
    {const f=K.face([-19.2,0,4.4],[0,0,-1],[1,0,0],1);for(const e of [-1.2,1.2])B(-19.2+e,PY+1.1,4.45,0.09,2.2,0.09,IRON,11);P.board(f,0,PY+2.0,2.7,0.55);}
  }else{
    // town: long main range x -14..14 (two storeys), wings x -22..-14 and 14..20; three cross gables; clock tower at x 2.5
    const T0=2.5,TW=2.3;
    const main=brickHouse(-14,14,6.0,13.4,G2+0.6,5.0,{band:G1,skip:skipIn([[-6.8,2.8,10.2,G2+1.0,4.3],[T0,TW-0.25,10.0,99,0,5.6],[10.2,1.8,9.8,G2+0.7,3.2],[-1.2,0.6,8.3,G2+2.4,1.0,6.4],[6.0,0.6,8.3,G2+2.4,1.0,6.4]])});
    const g1=crossGable(-6.8,2.8,5.6,10.0,G2+1.0,4.3,{band:G1});P.door(g1.F.front,0,PY,1.8,3.1);for(const u of [-1.8,1.8])P.arch(g1.F.front,u,PY+0.8,0.9,2.4);
    P.arch(g1.F.front,-0.66,G1+0.5,1.05,2.9);P.arch(g1.F.front,0.66,G1+0.5,1.05,2.9);fb(g1.F.front,0,G1+0.4,0.08,3.0,0.16,0.22,STONE,8);P.arch(g1.F.front,0,G2+1.4,0.8,1.5,{nv:7});
    const g3=crossGable(10.2,1.8,5.8,9.6,G2+0.7,3.2,{band:G1});P.arch(g3.F.front,0,PY+0.8,1.1,2.4);P.arch(g3.F.front,0,G1+0.6,1.0,2.4);P.arch(g3.F.front,0,G2+0.9,0.6,1.2,{nv:7});
    for(const u of [-12.2,-2.0,6.6,12.6]){P.arch(main.F.front,u,PY+0.8,1.0,2.4);P.arch(main.F.front,u,G1+0.6,0.95,2.2);}
    for(let u=-12;u<=12;u+=3){if(Math.abs(u-6.8)>1.5)P.arch(main.F.back,u,PY+0.8,1.0,2.3);P.arch(main.F.back,u,G1+0.6,0.9,2.1);}P.door(main.F.back,6.8,PY,1.7,3.0);P.steps(-6.8,13.4);
    // dormers with pinnacles on the front slope
    for(const x of [-1.2,6.0]){const zf=6.6,y0=G2+0.9;P.block(x-0.8,x+0.8,zf,zf+1.6,y0-0.6,y0+1.5,{faces:[]});const rf=P.roof([x,zf+0.8],[0,1],0.8,0.8,y0+1.5,1.0,{ends:[-1],nx:6,ov:0.15,gov:0.15});
      const f=K.face([x,0,zf],[0,0,-1],[1,0,0],0.8);P.gable(f,0.8,y0+1.5,y0+2.5);P.barge(rf,-1,{spike:0.9});P.arch(f,0,y0-0.1,0.6,1.3,{nv:7});
      for(const e of [-1,1]){cyl([x+e*0.85,y0+1.5,zf],[x+e*0.85,y0+2.4,zf],0.09,0.02,4,STONE,8);}}
    P.chimney(-11.4,11.2,G2+0.6,G2+7.6,1.0,0.7,3);P.chimney(-2.4,11.6,G2+0.6,G2+7.9,0.9,0.7,2);P.chimney(8.0,11.4,G2+0.6,G2+7.6,1.0,0.7,3);P.chimney(12.4,8.0,G2+0.6,G2+6.8,0.8,0.6,2);
    // wings
    const EW=PY+5.0,wl=brickHouse(-22,-14,6.4,12.6,EW,3.6,{ends:[-1],skip:skipIn([[-18,2.0,9.8,PY+5.4,3.0]])});const wg=crossGable(-18,2.0,6.0,9.6,EW+0.4,3.0,{});
    P.arch(wg.F.front,-0.5,PY+0.8,0.9,2.3);P.arch(wg.F.front,0.5,PY+0.8,0.9,2.3);P.arch(wg.F.front,0,EW+0.5,0.7,1.4,{nv:7});for(const u of [-3.2,3.2])P.arch(wl.F.front,-u,PY+0.8,1.0,2.3);P.arch(wl.F.left,0,PY+0.8,1.0,2.3);
    const wr=brickHouse(14,19.5,6.6,12.4,G2-0.2,4.0,{band:G1,ends:[1]});for(const u of [-1.4,1.4]){P.arch(wr.F.right,u,PY+0.8,1.0,2.3);P.arch(wr.F.right,u,G1+0.6,0.9,2.1);}P.arch(wr.F.front,0,PY+0.8,1.0,2.3);P.arch(wr.F.front,0,G1+0.6,0.9,2.1);
    P.chimney(-19.6,10.6,EW,EW+4.6,0.8,0.6,2);P.chimney(17.6,10.8,G2-0.2,G2+5.0,0.8,0.6,2);
    // the clock tower: square brick shaft with stone quoins rising from the front of the main range, belfry stage with clocks, slate spire
    {const z0=5.5,z1=z0+2*TW,y1=PY+17.2,F=P.block(T0-TW,T0+TW,z0,z1,-1.0,y1,{bands:[G1,G2+0.6,PY+12.2]});
      P.door(F.front,0,PY,1.6,3.0);P.arch(F.front,0,G1+0.6,1.0,2.4);P.arch(F.front,-0.5,G2+1.0,0.7,2.0,{nv:7});P.arch(F.front,0.5,G2+1.0,0.7,2.0,{nv:7});
      const yc=PY+14.6;for(const [f,ax,sg] of [[F.front,'z',-1],[F.back,'z',1],[F.left,'x',-1],[F.right,'x',1]]){const c=fp(f,0,yc,0.02);P.clock(c[0],yc,c[2],1.15,{axis:ax,single:true,depth:0.08,sgn:sg});
        // stone surround and a small gable over each clock
        const a=fp(f,-1.6,yc+1.5,0.12),b=fp(f,1.6,yc+1.5,0.12),cc=fp(f,0,yc+3.0,0.12);tri(a,b,cc,STONE,8);const a2=fp(f,-1.6,yc+1.5,-0.2),b2=fp(f,1.6,yc+1.5,-0.2),c2=fp(f,0,yc+3.0,-0.2);tri(b2,a2,c2,BRICK,24);
        fb(f,0,yc-1.5,0.08,3.2,0.18,0.24,STONE,8);for(const e of [-1,1])fb(f,e*1.45,yc,0.06,0.22,2.9,0.2,STONE,8);}
      for(const e of [-1,1])for(const e2 of [-1,1]){const x=T0+e*TW,z=(z0+z1)/2+e2*TW;cyl([x,y1,z],[x,y1+2.4,z],0.22,0.04,4,STONE,8);ico([x,y1+2.45,z],0.08,IRON,11);}
      // spire: a steep square slate pyramid with lucarnes, a finial and a cross
      const sh=9.5,top=[T0,y1+sh,(z0+z1)/2],c4=[[T0-TW-0.15,z0-0.15],[T0+TW+0.15,z0-0.15],[T0+TW+0.15,z1+0.15],[T0-TW-0.15,z1+0.15]];
      B(T0,y1+0.12,(z0+z1)/2,2*TW+0.5,0.24,2*TW+0.5,STONE,8);
      for(let k=0;k<4;k++){const a=c4[k],b=c4[(k+1)%4];const A=[a[0],y1+0.24,a[1]],Bp=[b[0],y1+0.24,b[1]];const N=K.lod>=1?2:6;
        for(let j=0;j<N;j++){const t0=j/N,t1=(j+1)/N,l=(p,t)=>[p[0]+(top[0]-p[0])*t,p[1]+(top[1]-p[1])*t,p[2]+(top[2]-p[2])*t];quad(l(A,t0),l(Bp,t0),l(Bp,t1),l(A,t1),null,j%2?[0.28,0.3,0.35]:[0.31,0.33,0.38],18);}
        // lucarne: a little gabled window half way up each face
        const mid=[(a[0]+b[0])/2,y1+0.24,(a[1]+b[1])/2],out=K.v.norm([mid[0]-T0,0,mid[2]-(z0+z1)/2]),lp=[mid[0]-out[0]*0.9,y1+2.4,mid[2]-out[2]*0.9];
        const tg=[-out[2],0,out[0]];const fl=K.face([lp[0],0,lp[2]],out,tg,0.45);fb(fl,0,y1+2.6,-0.25,0.9,1.1,0.8,STONE,8);fb(fl,0,y1+2.55,0.16,0.45,0.75,0.02,K.C.glow,2);
        const g0=fp(fl,-0.5,y1+3.15,0.18),g1=fp(fl,0.5,y1+3.15,0.18),g2=fp(fl,0,y1+3.75,0.18);tri(g0,g1,g2,STONE,8);cyl(g2,K.v.add(g2,[0,0.4,0]),0.04,0.01,4,IRON,11);}
      cyl([top[0],top[1]-0.3,top[2]],[top[0],top[1]+1.6,top[2]],0.08,0.03,6,IRON,11);ico([top[0],top[1]+0.3,top[2]],0.16,GOLD,11);B(top[0],top[1]+1.3,top[2],0.07,0.75,0.07,IRON,11);B(top[0],top[1]+1.42,top[2],0.42,0.07,0.07,IRON,11);}
    nameX=-20.4;clockX=-2.0;fbX0=20.0;fbX1=22.2;
    const cn=P.canopy(-22.6,13.0,1.9,6.0,{H:PY+3.9});for(const k of [1,3,5,7,9])if(cn.cols[k]!==undefined)P.basket(cn.cols[k],PY+3.1,cn.cz);
    P.clock(clockX,PY+3.1,cn.cz+0.1,0.42);beam([clockX,PY+3.65,cn.cz+0.1],[clockX,cn.H-0.12,cn.cz+0.1],[1,0,0],0.06,0.06,IRON,11);
    for(const x of [-15.6,-11.0,3.0,7.4])P.bench(x,PY,5.2,1.9,1);for(const x of [-13.2,-9.0,0.6,5.6,9.4])P.planter(x,PY,5.25,0.32);
    P.cart(-3.6,PY,3.6,-0.06);P.cart(8.6,PY,3.7,0.12);
    P.lamp(14.6,PY,2.75,3.2);for(const x of [-17,-8,1,9])P.lantern(x,PY+2.8,3.9,PY+3.75);
    {const f=K.face([nameX,0,1.62],[0,0,-1],[1,0,0],1);P.board(f,0,PY+4.2,2.8,0.5);}

  }
  // ground behind the building: a gravel forecourt strip and a few shrubs
  if(K.lod<2){const zb=town?13.4:12.4;for(let k=0;k<(town?10:6);k++){const x=rr(town?-20:-12,town?18:8),z=zb+rr(0.6,1.6);ico([x,0.1,z],rr(0.35,0.6),mix3([0.2,0.36,0.14],[0.32,0.46,0.2],rnd()),1,{detail:1,sy:0.8,jit:0.3});}}
  // preview only: rails, ballast, ground and the platform pieces under the station
  if(!opt.game){if(town)P.footbridgeN(fbX0,fbX1,5.65,-5.65,PY+5.7,7.0,[[4.4,5.6,PY],[-5.6,-4.4,PY]]);const L=town?36:24;for(let x=-L;x<L;x+=4.1)KIT.platPiece(K,x+2.05,Math.abs(x+2.05)>(town?23:15)?2:0);
    B(0,-0.55,0,2*L,0.36,3.6,[0.55,0.52,0.48],10);for(const e of [-1,1])B(0,-0.08,e*0.72,2*L,0.15,0.07,[0.45,0.4,0.36],11);for(let x=-L;x<L;x+=0.62)B(x,-0.28,0,0.24,0.12,2.5,[0.36,0.24,0.15],6);
    B(0,-0.7,8,2*L+6,0.2,36,[0.36,0.5,0.24],9);}
  return town?{target:[0,7.5,4],dist:72,dir:[-0.55,0.45,-0.7],shadowC:[0,6,4],shadowR:42,haze:[90,220]}:{target:[2,5.5,4],dist:52,dir:[-0.55,0.45,-0.7],shadowC:[0,5,4],shadowR:30,haze:[70,180]};}
function mix3(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}

// ---------------- platform pieces (4.1 m, centred on x): v 0 plain, 1 with a lamp, 2 with a back railing, 3 railing + lamp + bench + planter
KIT.platPiece=function(K,x,v){const {B,cyl}=K,P=kitOf(K);const L=4.1;
  const zb=v===0?6.5:5.7;// plain pieces (along the building) reach under its front wall, so a curved platform leaves no gap
  B(x,-0.1,(1.62+zb)/2,L,2.08,zb-1.62,BRICK,24);// body (y -1.14..0.94) faced in brick on the track side
  B(x,0.965,(1.94+zb)/2,L,0.07,zb-1.94,PAVE,24);// paving (bricks laid flat)
  B(x,0.95,1.74,L,0.13,0.5,STONE,8);B(x,1.018,1.56,L,0.008,0.14,[0.95,0.93,0.86],0);// coping with a white edge line
  if(v>=4){B(x,0.95,5.58,L,0.13,0.5,STONE,8);B(x,1.018,5.76,L,0.008,0.14,[0.95,0.93,0.86],0);if(v===5){P.lamp(x+0.9,PY,3.62,3.2);P.bench(x-0.9,PY,3.62,1.7,1);}return;}
  if(v===1||v===3)P.lamp(x+0.2,PY,5.15,3.2);
  if(v>=2){for(const xx of [x-L/2+0.06,x])B(xx,PY+0.55,5.6,0.08,1.1,0.08,IRON,11);for(const yy of [0.5,1.05])B(x,PY+yy,5.6,L,0.04,0.04,IRON,11);
    if(K.lod<1)for(let xx=x-L/2+0.2;xx<x+L/2;xx+=0.2)B(xx,PY+0.55,5.6,0.018,1.0,0.018,IRON,11);}
  if(v===3){P.bench(x-1.0,PY,5.05,1.7,1);P.planter(x+1.2,PY,5.15,0.28);}};
// platform end ramp (4.1 m): paving slopes from platform height down to the ground, brick side walls, a handrail on the back edge;
// a: falls toward +x, b: toward -x
KIT.platRamp=function(K,dir){const {B,quad,tri}=K,P=kitOf(K),L=4.1,y1=PY+0.02,y0=-0.16,X=u=>u*dir;// u from -L/2 (top) to L/2 (bottom)
  const top=(u,z)=>[X(u),y1+(y0-y1)*(u+L/2)/L,z];quad(top(-L/2,1.5),top(-L/2,5.7),top(L/2,5.7),top(L/2,1.5),null,PAVE,24);
  for(const z of [1.5,5.7]){const a=top(-L/2,z),b=top(L/2,z),c=[X(L/2),-1.0,z],d=[X(-L/2),-1.0,z];quad(a,b,c,d,null,z<3?BRICK:BRICK2,24);quad(b,a,d,c,null,BRICK,24);}
  quad(top(-L/2,1.5),top(L/2,1.5),top(L/2,1.62),top(-L/2,1.62),null,STONE,8);
  for(const u of [-L/2+0.1,0,L/2-0.1]){const p=top(u,5.55);B(p[0],p[1]+0.5,p[2],0.07,1.0,0.07,IRON,11);}const a=top(-L/2,5.55),b=top(L/2,5.55);K.beam([a[0],a[1]+1.0,a[2]],[b[0],b[1]+1.0,b[2]],[0,0,1],0.05,0.05,IRON,11);};
KIT.models.platEa=function(K,opt){KIT.platRamp(K,1);return{target:[0,0.5,3.5],dist:10,dir:[-0.55,0.45,-0.7]};};
KIT.models.platEb=function(K,opt){KIT.platRamp(K,-1);return{target:[0,0.5,3.5],dist:10,dir:[-0.55,0.45,-0.7]};};
// waiting shelter on a second platform: brick back wall and short side walls, a slate lean-to roof on iron posts with a valance,
// a bench along the back wall, a lamp, a timetable board; 7 m along x, on the platform (z 3.3..5.7)
KIT.models.shelter=function(K,opt){const {B,quad,cyl,beam}=K,P=kitOf(K),x0=-3.5,x1=3.5,zb=5.7,zf=3.5,yb=PY+3.25,yf=PY+2.75;
  B(0,PY+1.6,zb-0.15,x1-x0,3.2,0.3,BRICK,24);for(const x of [x0,x1])B(x,PY+1.4,(zb+zf+0.6)/2,0.3,2.8,zb-zf-0.6,BRICK,24);
  B(0,PY+0.15,zb-0.15,x1-x0+0.06,0.3,0.36,STONE,8);for(const x of [x0,x1])B(x,PY+2.86,(zb+zf+0.6)/2,0.36,0.1,zb-zf-0.5,STONE,8);
  for(const x of [-2.4,0,2.4])B(x,PY+2.1,zb-0.31,1.1,0.9,0.02,K.C.glow,2);
  const r=(x,z,y)=>[x,y,z];quad(r(x0-0.3,zf-0.3,yf-0.05),r(x1+0.3,zf-0.3,yf-0.05),r(x1+0.3,zb+0.15,yb+0.05),r(x0-0.3,zb+0.15,yb+0.05),null,[0.3,0.32,0.37],18);
  quad(r(x1+0.3,zf-0.3,yf-0.15),r(x0-0.3,zf-0.3,yf-0.15),r(x0-0.3,zb+0.15,yb-0.1),r(x1+0.3,zb+0.15,yb-0.1),null,[0.4,0.29,0.19],12);
  for(const x of [x0+0.2,0,x1-0.2]){cyl([x,PY,zf],[x,yf-0.15,zf],0.06,0.05,8,IRON,11);}beam([x0-0.3,yf-0.2,zf],[x1+0.3,yf-0.2,zf],[0,1,0],0.14,0.1,IRON,11);
  if(K.lod<1)for(let x=x0-0.25;x<x1+0.3;x+=0.26){quad([x-0.11,yf-0.2,zf-0.32],[x+0.11,yf-0.2,zf-0.32],[x+0.11,yf-0.45,zf-0.32],[x-0.11,yf-0.45,zf-0.32],[0,0,-1],CREAM,0);K.tri([x-0.11,yf-0.45,zf-0.32],[x+0.11,yf-0.45,zf-0.32],[x,yf-0.6,zf-0.32],CREAM,0);}
  P.bench(-1.4,PY,zb-0.7,2.2,1);P.bench(1.4,PY,zb-0.7,2.2,1);P.lantern(0,PY+2.2,zf+0.4,yf-0.2);
  {const f=K.face([x1+0.16,0,4.6],[1,0,0],[0,0,1],0.5);f;B(x1+0.17,PY+1.6,4.6,0.02,0.8,0.6,[0.92,0.9,0.8],0);}
  if(!opt.game){KIT.platPiece(K,-2.05,2);KIT.platPiece(K,2.05,2);}
  return{target:[0,2,4],dist:14,dir:[-0.55,0.45,-0.7]};};
// footbridge over the line, its own piece so its far end can land on the ground (fbG) or on a second platform (fbP); span x -1.1..1.1
// the town station's footbridge: fbT1 over its one track to the platform across (stairs onto both platforms), fbT2 over both tracks with
// stairs onto the building platform, the island platform between the tracks (7.2 m apart) and the outer platform
KIT.models.fbT1=function(K,opt){kitOf(K).footbridgeN(-1.1,1.1,5.65,-5.65,PY+5.7,7.0,[[4.4,5.6,PY],[-5.6,-4.4,PY]]);return{target:[-3,3,0],dist:30,dir:[-0.55,0.45,-0.7]};};
KIT.models.fbT2=function(K,opt){kitOf(K).footbridgeN(-1.1,1.1,5.65,-12.85,PY+5.7,7.0,[[4.4,5.6,PY],[-5.6,-4.4,PY],[-12.8,-11.6,PY]]);return{target:[-3,3,-4],dist:36,dir:[-0.55,0.45,-0.7]};};
KIT.TWIN_G=7.2;
KIT.FB={station:[17.4,19.6],stationTown:[20.0,22.2]};
for(const v of [0,1,2,3,4,5])KIT.models['plat'+v]=function(K,opt){KIT.platPiece(K,0,v);if(!opt.game){K.B(0,-0.55,0,4.1,0.36,3.6,[0.55,0.52,0.48],10);}return{target:[0,1,3],dist:9,dir:[-0.55,0.45,-0.7]};};
KIT.models.station=function(K,opt){return build(K,opt,false);};
KIT.models.stationTown=function(K,opt){return build(K,opt,true);};
Object.assign(KIT.plots,{station:{x0:-22,x1:21,z0:-11,z1:15},stationTown:{x0:-24,x1:23.5,z0:-11,z1:16},plat0:{x0:-2.2,x1:2.2,z0:1.3,z1:7},plat1:{x0:-2.2,x1:2.2,z0:1.3,z1:7},plat2:{x0:-2.2,x1:2.2,z0:1.3,z1:7},plat3:{x0:-2.2,x1:2.2,z0:1.3,z1:7},plat4:{x0:-2.2,x1:2.2,z0:1.3,z1:7},plat5:{x0:-2.2,x1:2.2,z0:1.3,z1:7},fbT1:{x0:-9,x1:2,z0:-7,z1:7},fbT2:{x0:-9,x1:2,z0:-14,z1:7},shelter:{x0:-4.2,x1:4.2,z0:2.9,z1:6.2},platEa:{x0:-2.2,x1:2.2,z0:1.3,z1:6},platEb:{x0:-2.2,x1:2.2,z0:1.3,z1:6},fbP:{x0:-9,x1:2,z0:-11,z1:7}});
})();
