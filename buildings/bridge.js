// ===== buildings/bridge.js — medieval stone road bridge, built per crossing from a spec (the game calls KIT.bridge for every bridge).
// Local frame: the road runs along x (u = -L/2..L/2), across is z, y = 0 at the stream bed. s = {L, w (half road width), deck:[[u,y]..],
// ground:[[u,y]..], water (y or null), sw (stream width, 0 for rivers)}. One round arch over a stream, a row of arches on piers with
// cutwaters over a river; fieldstone spandrels and parapets (material 23: stone courses aligned in the world, so they run on across the
// strips), a dressed voussoir ring with a keystone, an arch barrel, coping stones following the hump, a string course, end pillars, sand deck.
(function(){const K=KIT;
K.bridgeGeo=function(s){const {box,B,beam,quad,ico,tuft,rr,pick}=K,{clamp,mix3}=K.v;
  const L=s.L,hw=s.w+0.08,ext=hw+0.42,PH=0.78;const I=(A,u)=>{if(u<=A[0][0])return A[0][1];for(let i=1;i<A.length;i++)if(u<=A[i][0]){const t=(u-A[i-1][0])/(A[i][0]-A[i-1][0]);return A[i-1][1]+(A[i][1]-A[i-1][1])*t;}return A[A.length-1][1];};
  const deck=u=>I(s.deck,u),gnd=u=>I(s.ground,u),wl=s.water==null?null:s.water;
  const st=[[0.6,0.58,0.53],[0.54,0.52,0.48],[0.64,0.61,0.55],[0.57,0.54,0.48],[0.59,0.56,0.51],[0.52,0.5,0.47]],wall=[0.58,0.55,0.5],dressed=[[0.7,0.66,0.58],[0.66,0.62,0.55],[0.73,0.69,0.6]];
  // arches
  const A=[];const mk=(c,S)=>{let ys=Math.max(gnd(c)+0.15,wl!=null?wl+0.25:-1e9);const crown=deck(c)-0.55;let f=Math.min(S/2,crown-ys);if(f<0.55){f=0.55;ys=crown-0.55;}const R=(S*S/4+f*f)/(2*f);A.push({c,S,ys,f,R,yc:ys+f-R});};
  if(s.sw>0)mk(0,clamp(s.sw*1.5+1.4,2.2,L-1.8));else{const n=Math.max(1,Math.round((L-3)/9)),pier=1.4,S=(L-3-(n-1)*pier)/n;for(let i=0;i<n;i++)mk(-L/2+1.5+S/2+i*(S+pier),S);}
  const archY=u=>{for(const a of A)if(Math.abs(u-a.c)<a.S/2)return a.yc+Math.sqrt(Math.max(0,a.R*a.R-(u-a.c)*(u-a.c)));return null;};
  const bot=u=>{const y=archY(u);return y!=null?y:Math.min(gnd(u)-0.9,(A[0]?A[0].ys:0)-0.3);};
  // spandrel and parapet outer faces, inner parapet faces, end faces
  const du=K.lod>=2?1.0:0.35;for(const e of [-1,1]){for(let u=-L/2;u<L/2-1e-6;u+=du){const u1=Math.min(u+du,L/2),t0=deck(u)+PH,t1=deck(u1)+PH,b0=bot(u),b1=bot(u1+(u1>=L/2?-1e-4:0));
      quad([u,b0,e*ext],[u1,b1,e*ext],[u1,t1,e*ext],[u,t0,e*ext],[0,0,e],wall,23,0.3);
      quad([u1,deck(u1)-0.02,e*hw],[u,deck(u)-0.02,e*hw],[u,t0,e*hw],[u1,t1,e*hw],[0,0,-e],wall,23,0.31);}
    const ue=e*L/2;quad([ue,bot(ue-e*1e-3),-ext],[ue,bot(ue-e*1e-3),ext],[ue,deck(ue)+PH,ext],[ue,deck(ue)+PH,-ext],[e,0,0],wall,23,0.32);}
  // arch barrels and voussoir rings
  for(const a of A){const a0=Math.asin(clamp(a.S/2/a.R,0,1)),N=K.lod>=2?6:Math.max(8,Math.ceil(a.R*(2*a0)/0.3));
    const P=(k,r)=>{const ang=-a0+2*a0*k/N;return[a.c+Math.sin(ang)*r,a.yc+Math.cos(ang)*r];};
    for(let k=0;k<N;k++){const p0=P(k,a.R),p1=P(k+1,a.R),nx=-(p0[0]+p1[0])/2+a.c,ny=-(p0[1]+p1[1])/2+a.yc,nl=Math.hypot(nx,ny)||1;
      quad([p0[0],p0[1],-ext],[p1[0],p1[1],-ext],[p1[0],p1[1],ext],[p0[0],p0[1],ext],[nx/nl,ny/nl,0],[0.5,0.48,0.44],21,0.4+k*0.01,[Math.hypot(p1[0]-p0[0],p1[1]-p0[1])/2,ext]);
      for(const e of [-1,1]){const q0=P(k+0.06,a.R+0.22),q1=P(k+0.94,a.R+0.22),key=k===(N>>1),r=key?0.3:0.22;const c=[(q0[0]+q1[0])/2,(q0[1]+q1[1])/2,e*(ext+0.04)],tx=[(q1[0]-q0[0])/2,(q1[1]-q0[1])/2,0],rl=Math.hypot(c[0]-a.c,c[1]-a.yc)||1;
        box(c,tx,[(c[0]-a.c)/rl*r,(c[1]-a.yc)/rl*r,0],[0,0,0.07+(key?0.03:0)],pick(dressed),8);}}
    // springing stones and, on rivers, piers with cutwaters
    for(const e of [-1,1])for(const sd of [-1,1]){const u=a.c+sd*a.S/2;B(u-sd*0.05,a.ys-0.15,e*(ext+0.03),0.5,0.3,0.12,pick(dressed),8);}}
  if(!(s.sw>0))for(let i=0;i<A.length-1;i++){const c=(A[i].c+A[i].S/2+A[i+1].c-A[i+1].S/2)/2,yb=gnd(c)-0.8,yt=Math.min(A[i].ys,A[i+1].ys)+0.35;
    for(const e of [-1,1]){B(c,(yb+yt)/2,e*ext,0.98,yt-yb,0.98,wall,23,Math.PI/4);B(c,yt+0.12,e*ext,0.7,0.24,0.7,pick(dressed),8,Math.PI/4);}}
  // deck: packed sand with ruts, following the hump
  for(let u=-L/2;u<L/2-1e-6;u+=0.5){const u1=Math.min(u+0.5,L/2);quad([u,deck(u),-hw],[u1,deck(u1),-hw],[u1,deck(u1),hw],[u,deck(u),hw],null,[0.64,0.56,0.43],17,0.5,[(u1-u)/2,hw]);}
  // coping stones and the string course, following the hump; end pillars with caps
  for(const e of [-1,1]){for(let u=-L/2+0.3;u<L/2-0.35;u+=0.56){const u1=u+0.53,y0=deck(u)+PH+0.07,y1=deck(u1)+PH+0.07;beam([u,y0,e*(hw+0.21)],[u1,y1,e*(hw+0.21)],[0,0,1],0.56,0.13+rr(-0.01,0.02),pick(dressed),8);}
    if(K.lod<2)for(let u=-L/2;u<L/2-0.3;u+=0.6){const u1=Math.min(u+0.6,L/2);beam([u,deck(u)-0.12,e*(ext+0.05)],[u1,deck(u1)-0.12,e*(ext+0.05)],[0,1,0],0.15,0.1,pick(dressed),8);}
    for(const sd of [-1,1]){const u=sd*(L/2-0.28),y=deck(u);B(u,y+0.55,e*(hw+0.21),0.6,1.1,0.62,wall,23);B(u,y+1.15,e*(hw+0.21),0.72,0.14,0.74,pick(dressed),8);if(K.lod<2)ico([u,y+1.28,e*(hw+0.21)],0.16,pick(dressed),8,{detail:1,sy:0.8});}}
  // a few stones sticking out, moss on the coping, grass at the abutments (close-up only)
  if(K.lod===0){for(let k=0;k<26;k++){const e=k%2?1:-1,u=rr(-L/2+0.4,L/2-0.4),y0=bot(u)+0.2,y1=deck(u)+PH-0.1;if(y1-y0<0.3)continue;B(u,rr(y0,y1),e*(ext+0.03),rr(0.22,0.45),rr(0.14,0.24),0.08,pick(st),8);}
    for(let k=0;k<14;k++){const e=k%2?1:-1,u=rr(-L/2+0.3,L/2-0.3);ico([u,deck(u)+PH+0.15,e*(hw+0.21)+rr(-0.2,0.2)],rr(0.05,0.1),mix3([0.24,0.38,0.12],[0.42,0.52,0.18],rr(0,1)),1,{sy:0.45,jit:0.3,detail:1});}
    for(const sd of [-1,1])for(const e of [-1,1])for(let k=0;k<8;k++){const u=sd*(L/2+rr(-0.2,0.5)),z=e*(ext+rr(0,0.5));tuft(u,z,6,rr(0.18,0.4),gnd(u)-0.02);}}
  return A;};
K.bridge=function(s,lod){K.VB.length=0;K.plot=null;K.lod=lod||0;K.aux=0;K.seed(s.seed||11);K.bridgeGeo(s);return Float32Array.from(K.VB);};
// preview for tools/render_building.js: a 9 m stream bridge and a three-arch river bridge on a ground plane
K.models.bridge=function(K2,opt){const g=u=>-0.4+0.0*u,mkS=(L,sw,water,dy)=>{const deck=[],ground=[];for(let u=-L/2;u<=L/2+1e-6;u+=0.5){const t=(u+L/2)/L;deck.push([u,2.0+dy*t+0.35*Math.sin(Math.PI*t)]);ground.push([u,Math.abs(u)<sw*0.8+0.6?0:1.6]);}return{L,w:1.9,deck,ground,water,sw};};
  K.bridgeGeo(mkS(9,2.2,null,0.2));K.B(0,-0.5,0,160,1.0,160,[0.42,0.56,0.27],9,0,0);return{target:[0,1.6,0],dist:17,dir:[-0.55,0.32,-0.78],shadowC:[0,1,0],shadowR:10,haze:[40,120]};};
// ---- a culvert mouth where a stream goes into a pipe under a garden or a square (faces +x, the open water; scaled to the stream in the
// game): fieldstone headwall with a round hole, a dark pipe going in, a ring of dressed stones, coping stones, low wing walls, apron stones
K.plots.culvert={x0:-2,x1:2,z0:-2,z1:2};
K.models.culvert=function(K2,opt){const {box,B,beam,quad,cyl,ico,tuft,rr,pick}=K;const R=0.45,cy=0.45,TOP=1.05,HW=1.25,wall=[0.56,0.54,0.5],dressed=[[0.68,0.64,0.57],[0.63,0.6,0.54],[0.71,0.67,0.59]];
  const dz=K.lod>=2?0.5:0.12;for(let z=-HW;z<HW-1e-6;z+=dz){const z1=Math.min(z+dz,HW),zc=(z+z1)/2,h=Math.abs(zc)<R?Math.sqrt(R*R-zc*zc):0;
    if(h>0){quad([0,0,z],[0,0,z1],[0,cy-h,z1],[0,cy-h,z],[1,0,0],wall,23,0.3);quad([0,cy+h,z],[0,cy+h,z1],[0,TOP,z1],[0,TOP,z],[1,0,0],wall,23,0.3);}
    else quad([0,0,z],[0,0,z1],[0,TOP,z1],[0,TOP,z],[1,0,0],wall,23,0.3);}
  B(-0.35,TOP/2,0,0.7,TOP,HW*2,wall,23);// the wall's body behind the face (its front is cut by the face above)
  cyl([0.01,cy,0],[-0.75,cy,0],R,R,16,[0.12,0.11,0.1],0,[0.03,0.03,0.03],0);
  const N=K.lod>=2?8:14;for(let k=0;k<N;k++){const a=(k+0.5)/N*Math.PI*2,c=[0.04,cy+Math.sin(a)*(R+0.11),Math.cos(a)*(R+0.11)];box(c,[0,0,0].map((_,i)=>[0.07,0,0][i]),[0,Math.sin(a)*0.11,Math.cos(a)*0.11],[0,Math.cos(a)*(Math.PI*(R+0.11)/N-0.012),-Math.sin(a)*(Math.PI*(R+0.11)/N-0.012)],pick(dressed),8);}
  for(let z=-HW-0.05;z<HW;z+=0.5)beam([0.02,TOP+0.06,z],[0.02,TOP+0.06,Math.min(z+0.48,HW+0.05)],[1,0,0],0.5,0.12,pick(dressed),8);
  for(const e of [-1,1]){B(0.38,0.32,e*(HW+0.2),0.95,0.64,0.32,wall,23,e*0.55);B(0.38,0.68,e*(HW+0.2),1.0,0.08,0.38,pick(dressed),8,e*0.55);}
  if(K.lod<2)for(let k=0;k<7;k++)B(rr(0.15,0.8),0.02,rr(-0.6,0.6),rr(0.25,0.4),0.06,rr(0.2,0.35),pick(dressed),8,rr(0,3));
  if(K.lod===0){for(let k=0;k<8;k++)ico([rr(-0.1,0.1),TOP+0.14,rr(-HW,HW)],rr(0.05,0.09),[0.3,0.44,0.15],1,{sy:0.45,jit:0.3,detail:1});for(let k=0;k<10;k++)tuft(rr(-0.6,-0.1),rr(-HW-0.4,HW+0.4),6,rr(0.15,0.35),TOP);}
  return{target:[0.3,0.5,0],dist:5,dir:[0.8,0.35,-0.5],shadowC:[0,0.5,0],shadowR:4,haze:[30,90]};};
})();
