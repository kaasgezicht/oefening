// Prototype: cel-shaded diorama cottage with a garden, rendered standalone with the game's own mesh helpers (oBox, oOBox, oTri, oIco, oLimb, oPrism).
// mat field = class: 0 man-made (toon bands + ink), 1 nature (soft light, no ink), 2 glass, 3 lantern glass
(function(){
const SZ=+(window.CEL_SIZE||2400);
const cv=document.createElement('canvas');cv.id='cel';cv.width=SZ;cv.height=SZ;cv.style.cssText=`position:fixed;left:0;top:0;width:${SZ}px;height:${SZ}px;z-index:999`;document.body.appendChild(cv);
const g=cv.getContext('webgl2',{antialias:false,preserveDrawingBuffer:true});

// ---------------- the cottage
function celCottage(o){o=o||{};const M=omesh();const RT=o.roof||'tile';
  const W=7.6,D=6.2,H=3.1,RISE=3.7,OV=RT==='thatch'?0.62:0.42,GOV=RT==='thatch'?0.45:0.34,PL=0.35,thk=RT==='thatch'?0.42:RT==='tile'?0.16:0.2;
  const brick=[0.78,0.39,0.27],brickD=[0.52,0.25,0.19],mortar=[0.95,0.92,0.84],white=[0.96,0.95,0.91],tile=[0.80,0.37,0.21],tile2=[0.73,0.32,0.19],tile3=[0.84,0.42,0.24],ridge=[0.46,0.21,0.15],
    green=o.trim||[0.13,0.40,0.31],greenL=(o.trim||[0.13,0.40,0.31]).map(v=>Math.min(1,v*1.25+0.04)),glass=[0.17,0.26,0.40],stone=[0.80,0.77,0.70],wood=[0.55,0.37,0.22],woodD=[0.42,0.28,0.17],zinc=[0.47,0.5,0.52],gold=[0.95,0.77,0.35],
    soil=[0.38,0.26,0.17],leaf=[0.30,0.55,0.26],leafD=[0.22,0.43,0.2],grass=[0.43,0.60,0.30],grass2=[0.39,0.54,0.28],terra=[0.76,0.38,0.24];
  const B=(x,y,z,sx,sy,sz,c,m,r)=>oBox(M,x,y,z,sx,sy,sz,c,m||0,r);
  // faces: o = point on the wall plane, n = outward normal, t = tangent along the wall
  const FZm={o:[0,0,-D/2],n:[0,0,-1],t:[-1,0,0]},FZp={o:[0,0,D/2],n:[0,0,1],t:[1,0,0]},FXm={o:[-W/2,0,0],n:[-1,0,0],t:[0,0,-1]},FXp={o:[W/2,0,0],n:[1,0,0],t:[0,0,1]};
  const fp=(f,u,y,off)=>[f.o[0]+f.t[0]*u+f.n[0]*off,y,f.o[2]+f.t[2]*u+f.n[2]*off];
  const fb=(f,u,y,off,sx,sy,sz,col,m)=>{const c=fp(f,u,y,off);oOBox(M,c,[f.t[0]*sx/2,0,f.t[2]*sx/2],[0,sy/2,0],[f.n[0]*sz/2,0,f.n[2]*sz/2],col,m||0);};
  const pal=[[0.92,0.2,0.22],[0.98,0.55,0.7],[0.99,0.82,0.25],[0.62,0.38,0.82],[0.98,0.97,0.94],[0.99,0.5,0.2]];let sd=3;const rnd=()=>{sd=(sd*16807)%2147483647;return(sd&65535)/65536;};
  const flower=(x,y,z,col,h)=>{h=h||0.32;oLimb(M,[x,y,z],[x,y+h,z],0.014,0.014,4,leafD,1,false);oIco(M,x,y+h+0.03,z,0.075,col,1,{seed:(rnd()*99)|0});};
  // walls: brick plinth, brick walls, a white stone band, white eaves board
  const wc=o.wallCol||brick,wm=o.wallMat===undefined?5:o.wallMat;B(0,PL/2,0,W+0.14,PL,D+0.14,o.plinth||[0.55,0.52,0.48],8);B(0,PL+(H-PL)/2,0,W,H-PL,D,wc,wm);if(o.band)B(0,2.74,0,W+0.03,0.12,D+0.03,mortar);B(0,H-0.07,0,W+0.1,0.14,D+0.1,white);
  for(const e of [-1,1]){const x=e*W/2;oTri(M,[x,H,-D/2],[x,H,D/2],[x,H+RISE,0],o.gableCol||wc,o.gableMat===undefined?wm:o.gableMat);}
  // window: glass, white frame and cross, brick lintel, stone sill, hourglass shutters, flower box
  const win=(f,u,y0,w,h,o)=>{o=o||{};const yc=y0+h/2,fw=0.09;fb(f,u,yc,0.012,w-0.06,h-0.06,0.024,glass,2);
    fb(f,u,y0+h-fw/2,0.035,w,fw,0.07,white);fb(f,u,y0+fw/2,0.035,w,fw,0.07,white);fb(f,u-w/2+fw/2,yc,0.035,fw,h-2*fw,0.07,white);fb(f,u+w/2-fw/2,yc,0.035,fw,h-2*fw,0.07,white);
    fb(f,u,yc,0.03,0.05,h-2*fw,0.05,white);fb(f,u,y0+h*0.62,0.03,w-2*fw,0.05,0.05,white);
    if(!o.noLintel)fb(f,u,y0+h+0.11,0.016,w+0.26,0.2,0.032,brickD);fb(f,u,y0-0.045,0.085,w+0.18,0.09,0.17,stone);
    if(o.shut)for(const e of [-1,1]){const su=u+e*(w/2+0.26),x0=su-0.17,x1=su+0.17,ya=y0+0.07,yb=y0+h-0.07,off=0.062;fb(f,su,yc,0.03,0.46,h,0.06,green);
      oTri(M,fp(f,x0,yb,off),fp(f,x1,yb,off),fp(f,su,yc,off),white,0);oTri(M,fp(f,x0,ya,off),fp(f,su,yc,off),fp(f,x1,ya,off),white,0);
      for(const y of [y0+0.25,y0+h-0.25])fb(f,u+e*(w/2+0.06),y,0.05,0.16,0.05,0.02,[0.15,0.15,0.16]);}
    if(o.box){fb(f,u,y0-0.21,0.2,w+0.06,0.22,0.27,wood);fb(f,u,y0-0.105,0.2,w-0.06,0.02,0.2,soil);
      for(let k=0;k<7;k++){const q=fp(f,u-w/2+0.12+k*(w-0.24)/6,0,0.22);oIco(M,q[0],y0-0.08,q[2],0.11,leaf,1,{seed:k+1});flower(q[0],y0-0.12,q[2],pal[(k*2+(u>0?1:0))%pal.length],0.16);}}};
  // front (z-): two shuttered windows with flower boxes, the door with transom, canopy, lantern, step
  win(FZm,-2.45,0.95,1.1,1.3,{shut:true,box:true});win(FZm,2.45,0.95,1.1,1.3,{shut:true,box:true});
  {const f=FZm,u=0,yb=PL,dw=0.96,dh=2.1;fb(f,u,yb+dh/2,0.02,dw,dh,0.04,green);for(const a of [-0.22,0.22])for(const y of [yb+0.55,yb+1.45])fb(f,u+a,y,0.045,0.32,0.62,0.02,greenL);
    fb(f,u+0.34,yb+1.05,0.07,0.07,0.07,0.06,gold);fb(f,u,yb+0.98,0.048,0.3,0.05,0.014,gold);fb(f,u,yb+dh+0.2,0.012,dw,0.36,0.024,glass,2);for(const a of [-0.16,0.16])fb(f,u+a,yb+dh+0.2,0.03,0.04,0.36,0.04,white);
    for(const e of [-1,1])fb(f,u+e*(dw/2+0.05),yb+(dh+0.45)/2,0.06,0.1,dh+0.45,0.12,white);fb(f,u,yb+dh+0.43,0.06,dw+0.2,0.1,0.12,white);fb(f,u,yb+dh+0.02,0.05,dw,0.06,0.1,white);
    fb(f,u,0.1,0.3,1.5,0.2,0.62,stone);if(RT!=='thatch'){fb(f,u,yb+dh+0.78,0.38,1.75,0.1,0.76,white);fb(f,u,yb+dh+0.84,0.38,1.79,0.03,0.8,zinc);}
    if(RT!=='thatch')for(const e of [-1,1])oLimb(M,fp(f,u+e*0.78,yb+dh+0.42,0.03),fp(f,u+e*0.78,yb+dh+0.74,0.66),0.035,0.035,4,white,0);
    fb(f,u+0.98,yb+2.05,0.13,0.05,0.05,0.26,[0.12,0.12,0.13]);fb(f,u+0.98,yb+1.86,0.25,0.2,0.28,0.2,[1,0.86,0.5],3);fb(f,u+0.98,yb+2.04,0.25,0.26,0.05,0.26,[0.12,0.12,0.13]);
    fb(f,u-0.95,yb+1.9,0.02,0.24,0.17,0.02,[0.16,0.3,0.62]);}
  // sides and back
  for(const a of [-1.4,1.4]){win(FXm,a,0.95,1.0,1.25,{shut:true});win(FXp,a,0.95,1.0,1.25,{shut:true});win(FZp,a*1.7,0.95,1.1,1.25,{});}
  // round attic windows in the gables, with a white "makelaar" board at each apex
  for(const e of [-1,1]){const x=e*W/2,yc=H+1.25;oLimb(M,[x,yc,0],[x+e*0.03,yc,0],0.36,0.36,14,glass,2);oLimb(M,[x,yc,0],[x+e*0.075,yc,0],0.43,0.43,14,white,0,false);
    B(x+e*0.05,yc,0,0.04,0.74,0.05,white);B(x+e*0.05,yc,0,0.04,0.05,0.74,white);B(x+e*(GOV+0.07),H+RISE-0.5,0,0.05,1.15,0.24,white);}
  // roof: slabs, nine rows of tiles (segments in a running bond, with a lip at each row's lower edge), ridge, white bargeboards, zinc gutters
  const tan=RISE/(D/2),eY=H-OV*tan;
  for(const s of [-1,1]){const A=[0,eY,s*(D/2+OV)],Bp=[0,H+RISE,0],ax=[0,Bp[1]-A[1],Bp[2]-A[2]],L=Math.hypot(ax[1],ax[2]),a=[0,ax[1]/L,ax[2]/L],n=[0,Math.abs(a[2]),s*a[1]];
    const P=(t,o,x)=>[x||0,A[1]+a[1]*t+n[1]*o,A[2]+a[2]*t+n[2]*o],hx=W/2+GOV;
    oOBox(M,P(L/2+0.05,thk/2),[hx,0,0],[0,a[1]*(L/2+0.05),a[2]*(L/2+0.05)],[0,n[1]*thk/2,n[2]*thk/2],RT==='tile'?[0.36,0.2,0.15]:o.roofCol,RT==='tile'?0:RT==='thatch'?7:4);
    if(RT==='thatch'){const rc=o.roofCol.map(v=>v*0.92);oLimb(M,P(0.02,thk*0.5,-hx-0.05),P(0.02,thk*0.5,hx+0.05),thk*0.62,thk*0.62,10,rc,7);
      for(const e of [-1,1])oLimb(M,P(0,thk*0.5,e*hx),P(L+0.05,thk*0.5,e*hx),thk*0.55,thk*0.5,10,rc,7);}
    if(RT==='thatch')oOBox(M,P(0.05,thk*0.55),[hx+0.04,0,0],[0,a[1]*0.12,a[2]*0.12],[0,n[1]*thk*0.6,n[2]*thk*0.6],o.roofCol.map(v=>v*0.8),7);
    const nR=RT==='tile'?9:0;for(let i=0;i<nR;i++){const t0=i*L/nR,t1=(i+1)*L/nR,sl=1.05,ofs=(i%2)*sl/2;
      for(let x0=-hx-ofs;x0<hx;x0+=sl){const xa=Math.max(-hx,x0),xb=Math.min(hx,x0+sl);if(xb-xa<0.05)continue;const k=Math.round((x0+20)/sl)+i*3,col=[tile,tile2,tile3][k%3];
        oOBox(M,P((t0+t1)/2,thk+0.03,(xa+xb)/2),[(xb-xa)/2,0,0],[0,a[1]*(t1-t0)/2,a[2]*(t1-t0)/2],[0,n[1]*0.03,n[2]*0.03],col,0);}
      oOBox(M,P(t0+0.03,thk+0.07),[hx,0,0],[0,a[1]*0.06,a[2]*0.06],[0,n[1]*0.04,n[2]*0.04],[0.62,0.27,0.16],0);}
    if(RT!=='thatch')for(const e of [-1,1])oOBox(M,P(L/2,thk*0.6,e*(hx+0.03)),[0.035,0,0],[0,a[1]*(L/2+0.04),a[2]*(L/2+0.04)],[0,n[1]*0.17,n[2]*0.17],o.barge||white,0);
    if(RT!=='thatch')B(0,eY-0.06,s*(D/2+OV+0.06),W+2*GOV+0.1,0.12,0.15,zinc);}
  if(RT==='thatch')oOBox(M,[0,H+RISE+thk*0.85,0],[W/2+GOV+0.02,0,0],[0,0.3,0.3],[0,0.3,-0.3],o.ridgeCol||[0.42,0.36,0.24],7);
  else oOBox(M,[0,H+RISE+thk+0.04,0],[W/2+GOV+0.05,0,0],[0,0.13,0.13],[0,0.13,-0.13],RT==='tile'?ridge:(o.ridgeCol||[0.35,0.3,0.26]),RT==='tile'?0:6);
  // dormer above the door
  if(RT!=='thatch'){B(0,4.68,-1.42,1.7,1.26,1.6,zinc);const f={o:[0,0,-2.22],n:[0,0,-1],t:[-1,0,0]};fb(f,0,4.68,0.0,1.74,1.3,0.02,white);win(f,0,4.35,0.86,0.74,{noLintel:true});
    oTri(M,[-0.85,5.31,-2.225],[0.85,5.31,-2.225],[0,5.86,-2.225],white,0);
    for(const e of [-1,1]){const A=[e*1.0,5.2,0],Bq=[0,5.95,0],L=Math.hypot(Bq[0]-A[0],Bq[1]-A[1]),a=[(Bq[0]-A[0])/L,(Bq[1]-A[1])/L,0],n=[e*a[1],Math.abs(a[0]),0];
      oOBox(M,[(A[0]+Bq[0])/2+n[0]*0.06,(A[1]+Bq[1])/2+n[1]*0.06,-1.4],[a[0]*(L/2+0.03),a[1]*(L/2+0.03),0],[0,0,0.98],[n[0]*0.06,n[1]*0.06,0],RT==='tile'?tile2:o.roofCol,RT==='tile'?0:4);
      oOBox(M,[(A[0]+Bq[0])/2+n[0]*0.08,(A[1]+Bq[1])/2+n[1]*0.08,-2.4],[a[0]*(L/2+0.04),a[1]*(L/2+0.04),0],[0,0,0.03],[n[0]*0.12,n[1]*0.12,0],white,0);}}
  // chimney with a white band, cap and pot
  B(1.9,6.15,0.9,0.62,2.3,0.62,o.chimCol||brick,o.chimMat===undefined?5:o.chimMat);B(1.9,6.95,0.9,0.7,0.1,0.7,mortar);B(1.9,7.36,0.9,0.8,0.1,0.8,stone);oPrism(M,1.9,0.9,0.13,0.11,7.41,7.8,10,terra,0);
  // downpipe at the front-left corner into a rain barrel
  {const px=-W/2+0.2,pz=-D/2-0.13;oLimb(M,[px,1.0,pz],[px,eY-0.1,pz],0.055,0.055,8,zinc,0);oLimb(M,[px,eY-0.1,pz],[px,eY-0.1,-(D/2+OV+0.06)],0.055,0.055,8,zinc,0);
    oPrism(M,px-0.05,pz-0.42,0.33,0.36,0,0.86,14,wood,0);for(const y of [0.18,0.64])oPrism(M,px-0.05,pz-0.42,0.37,0.37,y,y+0.06,14,[0.2,0.2,0.22],0);oPrism(M,px-0.05,pz-0.42,0.3,0.3,0.86,0.87,14,[0.2,0.32,0.42],2);}
  // ---------------- garden
  B(0,-0.05,0,140,0.1,140,grass2,1);for(let i=0;i<10;i++)B(-7.6+(i+0.5)*1.52,0.03,-0.75,1.52,0.06,15.6,i%2?grass:[0.47,0.64,0.32],1);
  // street, kerb and tiled pavement in front
  for(let z=-10.45;z>-15;z-=0.42)for(let x=-24+((Math.round(z*10))%2?0.3:0);x<24;x+=0.6){const k=(Math.round(x*7+z*13)%3+3)%3;B(x,0.02,z,0.57,0.06,0.39,[[0.58,0.56,0.53],[0.54,0.52,0.5],[0.62,0.6,0.56]][k],0);}
  B(0,0.07,-10.2,48,0.16,0.2,stone);for(let x=-24;x<24;x+=0.6)for(const z of [-9.85,-9.25])B(x+0.3,0.05,z,0.58,0.06,0.58,(Math.round(x/0.6)+(z<-9.5?1:0))%2?[0.72,0.68,0.62]:[0.67,0.63,0.58],0);
  // picket fence with an open gate
  for(let x=-7.5;x<=7.51;x+=0.2){if(Math.abs(x)<0.65)continue;B(x,0.5,-8.55,0.075,0.8,0.035,white);oPrism(M,x,-8.55,0.054,0,0.9,1.0,4,white,0,0.785);}
  for(const [xa,xb] of [[-7.6,-0.6],[0.6,7.6]])for(const y of [0.3,0.74])B((xa+xb)/2,y,-8.51,xb-xa,0.07,0.04,white);
  for(const x of [-7.55,-5,-2.5,-0.68,0.68,2.5,5,7.55]){B(x,0.6,-8.53,0.12,1.2,0.12,white);B(x,1.22,-8.53,0.16,0.05,0.16,white);}
  {const ang=Math.PI-0.55,d=[Math.cos(ang),Math.sin(ang)],hx=0.62,hz=-8.55;for(let i=0;i<6;i++){const x=hx+d[0]*(0.12+0.2*i),z=hz+d[1]*(0.12+0.2*i);B(x,0.5,z,0.075,0.8,0.035,white,0,ang);oPrism(M,x,z,0.054,0,0.9,1.0,4,white,0,ang+0.785);}
    for(const y of [0.3,0.74])oOBox(M,[hx+d[0]*0.62,y,hz+d[1]*0.62+0.03],[d[0]*0.62,0,d[1]*0.62],[0,0.035,0],[-d[1]*0.02,0,d[0]*0.02],white,0);}
  // mailbox at the gate
  B(1.05,0.55,-8.82,0.09,1.1,0.09,woodD);B(1.05,1.18,-8.82,0.4,0.28,0.26,[0.75,0.16,0.13]);B(1.05,1.33,-8.82,0.44,0.04,0.3,[0.62,0.12,0.1]);
  // hedges along the sides and back: clipped boxes with bumps
  for(const [cx,cz,sx,sz] of [[-7.75,-0.75,0.7,15.6],[7.75,-0.75,0.7,15.6],[0,7.4,16.2,0.7]]){B(cx,0.62,cz,sx,1.2,sz,[0.25,0.47,0.22],1);
    const n=Math.round(Math.max(sx,sz)/0.85);for(let k=0;k<n;k++){const u=(k+0.5)/n-0.5;oIco(M,cx+(sx>sz?u*sx:0),1.18,cz+(sz>sx?u*sz:0),0.42,k%2?[0.27,0.5,0.24]:[0.23,0.44,0.2],1,{detail:1,jit:0.12,sy:0.6,seed:k+9});}}
  // stepping stones from the gate to the step
  for(let i=0;i<7;i++){const z=-8.1+i*0.66,x=Math.sin(i*1.7)*0.12;B(x,0.075,z,0.74-0.06*(i%2),0.05,0.46,[[0.78,0.74,0.66],[0.72,0.69,0.62],[0.82,0.78,0.7]][i%3],0,Math.sin(i*2.3)*0.12);}
  // flower beds along the facade, with a row of white edging stones
  for(const e of [-1,1]){const cx=e*2.35;B(cx,0.08,-3.58,3.4,0.1,0.8,soil);for(let x=cx-1.6;x<=cx+1.61;x+=0.2)B(x,0.11,-4.0,0.16,0.12,0.08,[0.92,0.9,0.85]);
    for(let k=0;k<16;k++){const x=cx-1.5+rnd()*3.0,z=-3.85+rnd()*0.5;oIco(M,x,0.17,z,0.15,k%2?leaf:leafD,1,{seed:k+30});flower(x,0.13,z,pal[(k+e+6)%pal.length],0.2+rnd()*0.22);}}
  // lavender along the inside of the fence, bushes by the gate
  for(let x=-7.0;x<7.1;x+=0.52){if(Math.abs(x)<1.6)continue;oIco(M,x,0.22,-8.1,0.2,leafD,1,{seed:(x*10)|0,sy:0.7});oIco(M,x,0.48,-8.1,0.16,[0.58,0.47,0.78],1,{detail:1,sy:1.5,jit:0.1,seed:((x*10)|0)+3});}
  for(const e of [-1,1])oIco(M,e*1.35,0.5,-7.75,0.52,[0.2,0.42,0.22],1,{detail:1,sy:0.85,jit:0.12,seed:e>0?4:5});
  // vegetable patch on the left: wooden edging, soil, cabbages, a bean tepee
  {const cx=-6.05,cz=-0.4;B(cx,0.12,cz,2.6,0.14,4.2,soil);for(const [x,z,sx,sz] of [[cx,cz-2.12,2.72,0.08],[cx,cz+2.12,2.72,0.08],[cx-1.32,cz,0.08,4.3],[cx+1.32,cz,0.08,4.3]])B(x,0.15,z,sx,0.22,sz,woodD);
    for(let r=0;r<3;r++)for(let k=0;k<5;k++)oIco(M,cx-0.8+r*0.8,0.3,cz-1.6+k*0.7,0.24,r===1?[0.55,0.7,0.35]:[0.4,0.6,0.3],1,{detail:1,sy:0.7,jit:0.15,seed:r*7+k});
    const tp=[cx+0.9,2.2,cz+1.55];for(const [dx,dz] of [[-0.35,-0.35],[0.35,-0.35],[0.35,0.35],[-0.35,0.35]]){const b=[cx+0.9+dx,0.18,cz+1.55+dz];oLimb(M,b,tp,0.025,0.02,4,wood,0);
      for(let t=0.15;t<0.9;t+=0.17)oIco(M,b[0]+(tp[0]-b[0])*t,b[1]+(tp[1]-b[1])*t,b[2]+(tp[2]-b[2])*t,0.11,leaf,1,{seed:(t*100)|0});}}
  // apple tree at the back left, with a bench under it
  {const x=-5.2,z=4.4;oLimb(M,[x,0,z],[x+0.1,2.1,z],0.19,0.13,7,[0.45,0.31,0.2],1);oLimb(M,[x+0.1,1.8,z],[x+0.9,2.7,z+0.3],0.09,0.06,6,[0.45,0.31,0.2],1);oLimb(M,[x+0.05,1.9,z],[x-0.8,2.8,z-0.2],0.09,0.06,6,[0.45,0.31,0.2],1);
    for(const [dx,dy,dz,r,c] of [[0,3.2,0,1.45,[0.33,0.58,0.27]],[0.9,2.9,0.3,1.05,[0.28,0.52,0.24]],[-0.85,2.95,-0.3,1.1,[0.3,0.55,0.25]],[0.1,3.9,0.1,0.95,[0.36,0.62,0.29]]])oIco(M,x+dx,dy,z+dz,r,c,1,{detail:1,jit:0.14,seed:(r*10)|0});
    for(let k=0;k<14;k++){const a=k*2.4,el=0.2+(k%4)*0.18,r=1.42;oIco(M,x+Math.cos(a)*Math.cos(el)*r,3.1+Math.sin(el)*r*0.8-0.3,z+Math.sin(a)*Math.cos(el)*r,0.1,[0.86,0.16,0.14],0,{seed:k});}
    B(x+0.6,0.47,z-1.5,1.6,0.06,0.44,wood,0,0.3);B(x+0.66,0.8,z-1.3,1.6,0.4,0.05,wood,0,0.3);for(const e of [-0.68,0.68])B(x+0.6+Math.cos(0.3)*e,0.23,z-1.5+Math.sin(0.3)*e,0.06,0.46,0.4,woodD,0,0.3);}
  if(o.timber){const tb=o.timberCol||[0.22,0.15,0.1];for(const f of [FZm,FXm,FXp,FZp]){const half=(f===FZm||f===FZp?W:D)/2;
      for(const u of (f===FZm?[-half+0.1,-3.25,-1.65,-0.68,0.68,1.65,3.25,half-0.1]:[-half+0.1,-2.1,-0.7,0.7,2.1,half-0.1]))fb(f,u,(PL+H)/2,0.025,0.16,H-PL,0.05,tb,6);
      for(const y of [PL+0.08,0.78,2.42,H-0.12])fb(f,0,y,0.03,half*2,0.15,0.06,tb,6);
      const br=(u0,u1,y0,y1)=>{const p0=fp(f,u0,y0,0.03),p1=fp(f,u1,y1,0.03),c=[(p0[0]+p1[0])/2,(p0[1]+p1[1])/2,(p0[2]+p1[2])/2],dx=p1[0]-p0[0],dy=p1[1]-p0[1],dz=p1[2]-p0[2],l=Math.hypot(dx,dy,dz);
        oOBox(M,c,[dx/2,dy/2,dz/2],[f.n[0]*0.03,0,f.n[2]*0.03],[(-dy*f.t[0])/l*0.07,(Math.hypot(dx,dz))/l*0.07,(-dy*f.t[2])/l*0.07],tb,6);};
      if(f!==FZm){br(-half+0.1,-half+1.3,0.8,2.4);br(half-0.1,half-1.3,0.8,2.4);}}
    for(const e of [-1,1]){const x=e*(W/2+0.03);for(const z of [-2.3,-1.0,1.0,2.3]){const yt=H+RISE*(1-Math.abs(z)/(D/2))-0.1;B(x,(H+yt)/2,z,0.06,yt-H,0.15,tb,6);}B(x,H+0.08,0,0.07,0.15,D,tb,6);B(x,H+1.6,0,0.07,0.14,D*0.56,tb,6);}}
  // woodpile against the right gable with a chopping block and axe
  {const x=-(W/2+0.48);for(let r=0;r<4;r++)for(let k=0;k<7-r;k++){const z=-1.9+k*0.34+r*0.17+(r%2)*0.02,y=0.2+r*0.29;oLimb(M,[x-0.42,y,z],[x+0.42,y,z],0.15,0.15,7,[0.5,0.36,0.22],0);}
    B(x,1.45,-0.75,1.15,0.06,2.75,[0.5,0.4,0.3],6);oPrism(M,x-0.9,-3.4,0.3,0.3,0,0.5,9,[0.52,0.38,0.24],6);oLimb(M,[x-0.9,0.5,-3.4],[x-1.2,0.95,-3.25],0.03,0.03,4,[0.6,0.45,0.28],0);B(x-0.9,0.52,-3.38,0.06,0.16,0.22,[0.4,0.42,0.45],0,0.5);}
  // birdbath on the front lawn, a garden bench by the right bed
  oPrism(M,-4.6,-6.0,0.16,0.11,0.06,0.72,10,stone,0);oPrism(M,-4.6,-6.0,0.3,0.44,0.72,0.88,14,stone,0);oPrism(M,-4.6,-6.0,0.37,0.37,0.88,0.885,14,[0.45,0.65,0.8],2);
  B(4.6,0.48,-6.2,1.6,0.06,0.44,wood);B(4.6,0.82,-6.0,1.6,0.42,0.05,wood);for(const e of [-0.7,0.7])B(4.6+e,0.24,-6.2,0.06,0.46,0.4,woodD);
  return M;}

// ---------------- cozy cottage: stone base, timber frame over plaster, bendy shingle roof, stone chimney, porch, rustic garden
function celCozy(o){o=o||{};const M=omesh();
  const W=7.0,D=5.6,H=3.0,RISE=3.9,OV=0.42,GOV=0.36,PL=0.3,thk=0.24,SB=1.15;
  const plaster=[0.93,0.86,0.70],timber=[0.33,0.21,0.13],stone=[0.76,0.69,0.58],stoneD=[0.63,0.57,0.49],shing=o.roofCol||[0.74,0.53,0.33],under=[0.36,0.25,0.16],
    wood=[0.55,0.38,0.22],woodD=[0.40,0.27,0.16],glow=[1.0,0.74,0.38],iron=[0.16,0.15,0.15],leaf=[0.32,0.55,0.25],leafD=[0.22,0.42,0.19],soil=[0.36,0.25,0.16],terra=[0.74,0.40,0.25];
  const pal=[[0.93,0.22,0.24],[0.98,0.58,0.72],[0.99,0.84,0.3],[0.62,0.4,0.84],[0.98,0.97,0.94],[0.99,0.52,0.22]];let sd=11;const rnd=()=>{sd=(sd*16807)%2147483647;return(sd&65535)/65536;};
  const B=(x,y,z,sx,sy,sz,c,m,r)=>oBox(M,x,y,z,sx,sy,sz,c,m||0,r);
  const FZm={o:[0,0,-D/2],n:[0,0,-1],t:[-1,0,0]},FZp={o:[0,0,D/2],n:[0,0,1],t:[1,0,0]},FXm={o:[-W/2,0,0],n:[-1,0,0],t:[0,0,-1]},FXp={o:[W/2,0,0],n:[1,0,0],t:[0,0,1]};
  const fp=(f,u,y,off)=>[f.o[0]+f.t[0]*u+f.n[0]*off,y,f.o[2]+f.t[2]*u+f.n[2]*off];
  const fb=(f,u,y,off,sx,sy,sz,col,m)=>{const c=fp(f,u,y,off);oOBox(M,c,[f.t[0]*sx/2,0,f.t[2]*sx/2],[0,sy/2,0],[f.n[0]*sz/2,0,f.n[2]*sz/2],col,m||0);};
  const beam=(p0,p1,f,w,col)=>{const c=[(p0[0]+p1[0])/2,(p0[1]+p1[1])/2,(p0[2]+p1[2])/2],dx=p1[0]-p0[0],dy=p1[1]-p0[1],dz=p1[2]-p0[2],l=Math.hypot(dx,dy,dz),h=Math.hypot(dx,dz);
    oOBox(M,c,[dx/2,dy/2,dz/2],[f.n[0]*0.035,0,f.n[2]*0.035],[(-dy*(dx/(h||1)))/l*w/2,h/l*w/2,(-dy*(dz/(h||1)))/l*w/2],col||timber,6);};
  const flower=(x,y,z,col,h)=>{oLimb(M,[x,y,z],[x,y+h,z],0.014,0.014,4,leafD,1,false);oIco(M,x,y+h+0.03,z,0.075,col,1,{seed:(rnd()*99)|0});};
  // the bendy roof surface: ridge sags in the middle, eave corners flare up, edges wobble a little
  const tan=RISE/(D/2),eY=H-OV*tan,hx=W/2+GOV;
  const S=s=>{const A0=[eY,s*(D/2+OV)],B0=[H+RISE,0],L=Math.hypot(B0[0]-A0[0],B0[1]-A0[1]),a=[(B0[0]-A0[0])/L,(B0[1]-A0[1])/L],n=[Math.abs(a[1]),s*a[0]];return{s,A0,L,a,n};};
  const rp=(R,x,t,o)=>{const u=x/hx,v=t/R.L,dy=-0.3*(1-u*u)*Math.pow(v,1.1)+0.2*u*u*(1-v)*(1-v)+0.05*Math.sin(u*4.2+R.s*1.3)*(1-v)*(1-v);return[x,R.A0[0]+R.a[0]*t+R.n[0]*o+dy,R.A0[1]+R.a[1]*t+R.n[1]*o];};
  const roofUnder=(x,z)=>{const R=S(z<0?-1:1),t=(z-R.A0[1])/R.a[1];return rp(R,x,clamp(t,0,R.L),0)[1];};
  // walls: plaster box, fieldstone base, stone quoins at the corners
  B(0,PL/2,0,W+0.2,PL,D+0.2,stoneD,8);B(0,(PL+H)/2,0,W,H-PL,D,plaster,0);B(0,(PL+SB)/2,0,W+0.1,SB-PL,D+0.1,stone,8);
  for(const ex of [-1,1])for(const ez of [-1,1])for(let y=SB,k=0;y<H-0.1;y+=0.36,k++){const a=k%2?0.62:0.4,b=k%2?0.4:0.62;B(ex*(W/2-a/2+0.05),y+0.17,ez*(D/2-b/2+0.05),a,0.34,b,k%2?stone:stoneD,8);}
  // gables: plaster fan up to the curved roof underside, timber posts, collar beam and braces, a small gable window
  for(const e of [-1,1]){const x=e*W/2,pts=[];for(let k=0;k<=10;k++){const z=-D/2+D*k/10;pts.push([x,Math.min(roofUnder(x,z),H+RISE)-0.02,z]);}
    const cen=[x,H+RISE*0.35,0];oTri(M,[x,H,-D/2],pts[0],cen,plaster,0);oTri(M,pts[10],[x,H,D/2],cen,plaster,0);oTri(M,[x,H,D/2],[x,H,-D/2],cen,plaster,0);for(let k=0;k<10;k++)oTri(M,pts[k],pts[k+1],cen,plaster,0);
    const f=e<0?FXm:FXp,yU=z=>roofUnder(x,z)-0.04;for(const z of [-1.3,1.3])beam(fp(f,-e*0+(f.t[2]<0?-z:z),H,0.03),fp(f,(f.t[2]<0?-z:z),yU(z),0.03),f,0.16);
    beam(fp(f,0,H+2.0,0.03),fp(f,0,yU(0),0.03),f,0.16);fb(f,0,H+1.95,0.03,2*1.1+0.6,0.15,0.07,timber,6);fb(f,0,H+0.06,0.03,D,0.16,0.07,timber,6);
    for(const z of [-1,1])beam(fp(f,z*0.2,H+2.0,0.03),fp(f,z*1.25,H+2.9,0.03),f,0.13);
    gwin(f,0,H+0.75,0.75,0.8);}
  // windows: dark timber frames, six warm-lit panes, timber lintel, sill and flower box
  function gwin(f,u,y0,w,h,box){const yc=y0+h/2,fw=0.09;fb(f,u,yc,0.012,w-0.06,h-0.06,0.024,glow,3);
    fb(f,u,y0+h-fw/2,0.04,w,fw,0.08,timber,6);fb(f,u,y0+fw/2,0.04,w,fw,0.08,timber,6);for(const e of [-1,1])fb(f,u+e*(w/2-fw/2),yc,0.04,fw,h-2*fw,0.08,timber,6);
    for(const k of [-1,1])fb(f,u+k*(w-2*fw)/6,yc,0.03,0.045,h-2*fw,0.05,timber,6);fb(f,u,y0+h*0.52,0.03,w-2*fw,0.045,0.05,timber,6);
    fb(f,u,y0-0.05,0.09,w+0.22,0.1,0.18,wood,6);fb(f,u,y0+h+0.08,0.035,w+0.3,0.16,0.07,timber,6);
    if(box){fb(f,u,y0-0.24,0.21,w+0.04,0.24,0.28,woodD,6);for(let k=0;k<6;k++){const q=fp(f,u-w/2+0.12+k*(w-0.24)/5,0,0.23);oIco(M,q[0],y0-0.1,q[2],0.12,leaf,1,{seed:k+2});flower(q[0],y0-0.14,q[2],pal[(k*2+(u>0?1:0))%pal.length],0.15);}}}
  // half-timber frame on the long walls and sides (sill beam on the stone, top plate, posts, braces)
  for(const f of [FZm,FZp,FXm,FXp]){const half=(f===FZm||f===FZp?W:D)/2;fb(f,0,SB+0.07,0.06,half*2+0.08,0.15,0.08,timber,6);fb(f,0,H-0.08,0.04,half*2,0.16,0.08,timber,6);
    const posts=f===FZm||f===FZp?[-3.2,-1.42,-0.62,0.62,1.42,3.2]:[-2.5,-0.45,0.45,2.5];for(const u of posts)fb(f,u,(SB+H)/2,0.04,0.15,H-SB,0.08,timber,6);
    for(const e of [-1,1]){const u0=e*(f===FZm||f===FZp?3.2:2.5),u1=e*(f===FZm||f===FZp?2.55:1.75);beam(fp(f,u0,SB+0.12,0.04),fp(f,u1,H-0.12,0.04),f,0.13);}}
  gwin(FZm,-2.15,1.35,1.0,1.05,true);gwin(FZm,2.15,1.35,1.0,1.05,true);gwin(FXm,-1.35,1.35,0.9,1.0,true);gwin(FXm,1.45,1.35,0.9,1.0,false);gwin(FXp,0,1.35,0.9,1.0,false);gwin(FZp,-1.5,1.35,0.9,1.0,false);gwin(FZp,1.5,1.35,0.9,1.0,false);
  // plank door with iron straps, stone steps, lantern
  {const f=FZm,yb=PL,dw=0.95,dh=2.0;fb(f,0,yb+dh/2,0.02,dw,dh,0.04,[0.45,0.29,0.17],6);for(const y of [yb+0.4,yb+1.55])fb(f,0,y,0.05,dw-0.08,0.07,0.015,iron);fb(f,0.3,yb+1.0,0.06,0.07,0.07,0.06,[0.85,0.68,0.3]);
    for(const e of [-1,1])fb(f,e*(dw/2+0.06),yb+dh/2+0.05,0.05,0.13,dh+0.1,0.1,timber,6);fb(f,0,yb+dh+0.06,0.05,dw+0.3,0.14,0.1,timber,6);
    fb(f,0,0.12,0.32,1.5,0.24,0.62,stone,8);fb(f,0,0.06,0.72,1.8,0.12,0.4,stoneD,8);
    fb(f,-0.85,yb+1.8,0.12,0.05,0.05,0.24,iron);fb(f,-0.85,yb+1.6,0.25,0.2,0.3,0.2,glow,3);fb(f,-0.85,yb+1.78,0.25,0.26,0.05,0.26,iron);
    // porch: two posts and a little bendy gable roof over the door
    const pz=-D/2-1.15;for(const e of [-1,1]){oLimb(M,[e*0.82,0,pz],[e*0.8,2.45,pz],0.08,0.07,6,wood,6);beam([e*0.8,2.2,pz],[e*0.8,2.45,pz+0.5],FXm,0.1,wood);}
    B(0,2.48,pz+0.55,1.85,0.14,1.4,timber,6);
    for(const e of [-1,1]){const A=[e*1.15,2.5],T=[0,3.25];const L=Math.hypot(T[0]-A[0],T[1]-A[1]);const NQ=4,NZ=5;for(let i=0;i<NQ;i++)for(let k=0;k<NZ;k++){
        const P=(ii,kk,oo)=>{const t=ii/NQ,z=pz-0.35+(-D/2+0.3-(pz-0.35))*kk/NZ;const sag=-0.08*Math.sin(Math.PI*kk/NZ)*t;return[A[0]+(T[0]-A[0])*t+e*0.17*oo,A[1]+(T[1]-A[1])*t+0.12*oo*0+oo*0.1+sag,z];};
        oQuad(M,P(i,k,1),P(i+1,k,1),P(i+1,k+1,1),P(i,k+1,1),shing,4);oQuad(M,P(i,k,0),P(i,k+1,0),P(i+1,k+1,0),P(i+1,k,0),under,6);}
      oQuad(M,[A[0],A[1],pz-0.35],[A[0],A[1],-D/2+0.3],[A[0]+e*0.17,A[1]+0.1,-D/2+0.3],[A[0]+e*0.17,A[1]+0.1,pz-0.35],shing.map(v=>v*0.7),4);}
    oTri(M,[-1.1,2.52,pz-0.3],[1.1,2.52,pz-0.3],[0,3.2,pz-0.3],plaster,0);beam([-1.1,2.55,pz-0.33],[0,3.22,pz-0.33],FZm,0.14);beam([1.1,2.55,pz-0.33],[0,3.22,pz-0.33],FZm,0.14);}
  // main roof: bendy shingled top, timber underside, thick edges, curved ridge cap, dark bargeboards
  for(const s of [-1,1]){const R=S(s),NX=20,NT=10,xs=i=>-hx+2*hx*i/NX,ts=j=>R.L*j/NT+(j===NT?0.06:0);
    for(let i=0;i<NX;i++)for(let j=0;j<NT;j++){oQuad(M,rp(R,xs(i),ts(j),thk),rp(R,xs(i+1),ts(j),thk),rp(R,xs(i+1),ts(j+1),thk),rp(R,xs(i),ts(j+1),thk),shing,4);
      oQuad(M,rp(R,xs(i),ts(j),0),rp(R,xs(i),ts(j+1),0),rp(R,xs(i+1),ts(j+1),0),rp(R,xs(i+1),ts(j),0),under,6);}
    for(let i=0;i<NX;i++)oQuad(M,rp(R,xs(i),0,0),rp(R,xs(i+1),0,0),rp(R,xs(i+1),0,thk),rp(R,xs(i),0,thk),shing.map(v=>v*0.72),4);
    for(const i of [0,NX])for(let j=0;j<NT;j++){const x=xs(i);oQuad(M,rp(R,x,ts(j),0),rp(R,x,ts(j+1),0),rp(R,x,ts(j+1),thk),rp(R,x,ts(j),thk),timber,6);
      const p0=rp(R,x,ts(j),thk*0.5),p1=rp(R,x,ts(j+1),thk*0.5),sx=Math.sign(x);oOBox(M,[(p0[0]+p1[0])/2+sx*0.04,(p0[1]+p1[1])/2,(p0[2]+p1[2])/2],[0.035,0,0],[(p1[0]-p0[0])/2,(p1[1]-p0[1])/2+0.01,(p1[2]-p0[2])/2],[0,R.n[0]*0.2,R.n[1]*0.2],timber,6);}}
  {const R=S(-1);for(let i=0;i<14;i++){const x0=-hx-0.05+(2*hx+0.1)*i/14,x1=-hx-0.05+(2*hx+0.1)*(i+1)/14,p0=rp(R,clamp(x0,-hx,hx),R.L,thk),p1=rp(R,clamp(x1,-hx,hx),R.L,thk);
    oOBox(M,[(x0+x1)/2,(p0[1]+p1[1])/2+0.06,0],[(x1-x0)/2+0.02,(p1[1]-p0[1])/2,0],[0,0.15,0.15],[0,0.15,-0.15],shing.map(v=>v*0.62),4);}}
  // stone chimney against the left gable, tapering, leaning a touch, with cap and pot
  {const x=-W/2-0.42,z=0.9;B(x,0.9,z,0.95,1.8,1.25,stone,8);oOBox(M,[x+0.04,1.8+0.35,z],[0.47,0,0],[0,0.36,0],[0,0,0.62],stoneD,8);
    oOBox(M,[x+0.06,(2.5+H+RISE+1.2)/2,z],[0.36,0,0],[0.03,(H+RISE+1.2-2.5)/2,0],[0,0,0.4],stone,8);const top=H+RISE+1.2;oOBox(M,[x+0.11,top+0.07,z],[0.46,0,0],[0,0.07,0],[0,0,0.5],stoneD,8);
    oPrism(M,x+0.11,z,0.14,0.12,top+0.14,top+0.55,10,terra,0);}
  // ---------------- garden
  B(0,-0.05,0,140,0.1,140,[0.40,0.55,0.28],1);B(0,0.03,-0.6,15,0.06,15,[0.45,0.62,0.30],1);
  B(0,0.03,-11.6,48,0.06,3.6,[0.66,0.56,0.41],1);for(let k=0;k<60;k++)oIco(M,(rnd()-0.5)*40,0.06,-11.6+(rnd()-0.5)*3.2,0.08+rnd()*0.1,[0.62,0.58,0.52],0,{sy:0.4,seed:k});
  // irregular stone path from the lane to the steps
  for(let k=0;k<26;k++){const z=-9.6+k*0.24+rnd()*0.1,x=(rnd()-0.5)*1.0,r=0.16+rnd()*0.12;oIco(M,x,0.06,z,r,[[0.76,0.71,0.62],[0.68,0.63,0.55],[0.82,0.77,0.68]][k%3],0,{sy:0.28,jit:0.18,seed:k+70});}
  // rustic split-rail fence with a gap for the path
  {const posts=[];for(let x=-7.4;x<=7.41;x+=1.85)posts.push([x,-9.2]);for(let z=-7.35;z<=6.6;z+=1.85){posts.push([-7.4,z]);posts.push([7.4,z]);}
    for(const [x,z] of posts){if(Math.abs(x)<0.8&&z<-9)continue;oLimb(M,[x,0,z],[x+(rnd()-0.5)*0.08,1.05,z+(rnd()-0.5)*0.08],0.075,0.065,6,woodD,6);}
    const rail=(a,b)=>{for(const y of [0.48,0.88])oLimb(M,[a[0],y+(rnd()-0.5)*0.06,a[1]],[b[0],y+(rnd()-0.5)*0.06,b[1]],0.045,0.045,5,wood,6);};
    for(let x=-7.4;x<7.3;x+=1.85){if(x<0.8&&x+1.85>-0.8)continue;rail([x,-9.2],[x+1.85,-9.2]);}rail([-0.75,-9.2],[-0.75+0.1,-9.2]);
    for(const e of [-1,1])for(let z=-9.2;z<6.5;z+=1.85)rail([e*7.4,z],[e*7.4,Math.min(z+1.85,6.6)]);}
  // flower beds along the front, bushes hugging the walls, pots and barrels by the door, crates
  for(const e of [-1,1]){const cx=e*2.2;B(cx,0.08,-3.2,2.9,0.1,0.75,soil);for(let k=0;k<14;k++){const x=cx-1.3+rnd()*2.6,z=-3.45+rnd()*0.5;oIco(M,x,0.17,z,0.16,k%2?leaf:leafD,1,{seed:k+40});flower(x,0.13,z,pal[(k+e+6)%pal.length],0.2+rnd()*0.25);}}
  for(const [x,z,r] of [[-3.9,-3.4,0.6],[3.9,-3.3,0.55],[-4.0,2.9,0.7],[3.85,-1.0,0.5],[-1.2,-4.6,0.35],[1.25,-4.65,0.32]])oIco(M,x,r*0.7,z,r,[[0.26,0.5,0.23],[0.3,0.55,0.25],[0.22,0.45,0.2]][Math.round(r*10)%3],1,{detail:1,sy:0.8,jit:0.14,seed:(r*100)|0});
  const barrel=(x,z,r,h)=>{oPrism(M,x,z,r,r*1.06,0,h,12,wood,6);for(const y of [h*0.18,h*0.78])oPrism(M,x,z,r*1.09,r*1.09,y,y+0.05,12,iron,0);oPrism(M,x,z,r*0.95,r*0.95,h,h+0.01,12,woodD,6);};
  barrel(1.25,-3.85,0.3,0.8);barrel(1.75,-3.6,0.26,0.7);B(-1.45,0.25,-3.95,0.5,0.5,0.5,wood,6,0.3);B(-1.4,0.68,-3.95,0.38,0.36,0.38,woodD,6,0.6);
  for(const [x,z] of [[-0.95,-3.75],[0.95,-3.8]]){oPrism(M,x,z,0.16,0.21,0,0.32,10,terra,0);oIco(M,x,0.42,z,0.18,leaf,1,{seed:(x*10)|0});flower(x,0.38,z,pal[x<0?0:2],0.12);}
  // dense planting: bushes along the fence, grass tufts, flower clumps, trees outside the plot
  for(let k=0;k<26;k++){const side=k%3,u=rnd();const x=side===0?-7.4+u*14.8:side===1?-6.9:6.9,z=side===0?6.3:-8.4+u*14.5;if(side===0&&Math.abs(x)<1.5)continue;if(side===1&&z>-2&&z<2)continue;
    const r=0.35+rnd()*0.45;oIco(M,x+(rnd()-0.5)*0.4,r*0.7,z,r,[[0.26,0.5,0.23],[0.32,0.57,0.26],[0.22,0.44,0.2],[0.36,0.55,0.24]][k%4],1,{detail:1,sy:0.85,jit:0.16,seed:k+200});
    if(k%3===0)flower(x+0.3,0.1,z+0.3,pal[k%pal.length],0.3);}
  for(let k=0;k<70;k++){const x=(rnd()-0.5)*14,z=-8.8+rnd()*15;if(Math.abs(x)<4.2&&z>-4.4&&z<3.4)continue;if(Math.abs(x)<0.8&&z<-3.5)continue;oIco(M,x,0.12,z,0.09+rnd()*0.08,[[0.38,0.6,0.27],[0.3,0.52,0.22]][k%2],1,{sy:1.8,jit:0.3,seed:k+300});
    if(k%5===0)flower(x+0.1,0.06,z,pal[k%pal.length],0.22);}
  for(const [x,z,s] of [[-9.5,2,1.3],[9.8,-2,1.1],[-2.5,9.8,1.4],[6.5,9,1.2],[-9.8,-6,1.0]]){oLimb(M,[x,0,z],[x+0.1,2.0*s,z],0.2*s,0.13*s,7,[0.45,0.31,0.2],1);
    for(const [dx,dy,dz,r,c] of [[0,3.2,0,1.45,[0.31,0.55,0.26]],[0.9,2.9,0.3,1.05,[0.27,0.5,0.23]],[-0.85,2.95,-0.3,1.1,[0.33,0.57,0.27]],[0.1,3.9,0.1,0.95,[0.36,0.6,0.28]]])oIco(M,x+dx*s,dy*s,z+dz*s,r*s,c,1,{detail:1,jit:0.14,seed:((r+x+z)*10)|0});}
  // woodpile against the right of the chimney with a lean-to and a chopping block
  {const x=-W/2-0.45;for(let r=0;r<4;r++)for(let k=0;k<6-r;k++){const z=-1.9+k*0.34+r*0.17,y=0.18+r*0.29;oLimb(M,[x-0.4,y,z],[x+0.4,y,z],0.15,0.15,7,[0.52,0.37,0.22],6);}
    B(x-0.05,1.45,-1.05,1.1,0.06,2.4,woodD,6);oPrism(M,x-1.0,-3.0,0.3,0.3,0,0.5,9,wood,6);oLimb(M,[x-1.0,0.5,-3.0],[x-1.3,0.95,-2.85],0.03,0.03,4,[0.62,0.46,0.28],0);}
  // vegetable patch and trees
  {const cx=-5.6,cz=-0.2;B(cx,0.12,cz,2.4,0.14,3.6,soil);for(const [x,z,sx,sz] of [[cx,cz-1.82,2.5,0.08],[cx,cz+1.82,2.5,0.08],[cx-1.22,cz,0.08,3.7],[cx+1.22,cz,0.08,3.7]])B(x,0.15,z,sx,0.22,sz,woodD,6);
    for(let r=0;r<3;r++)for(let k=0;k<5;k++)oIco(M,cx-0.75+r*0.75,0.3,cz-1.4+k*0.7,0.22,r===1?[0.55,0.7,0.35]:[0.4,0.6,0.3],1,{detail:1,sy:0.7,jit:0.15,seed:r*7+k});}
  for(const [x,z,s] of [[-5.3,4.4,1],[4.6,4.2,1.2],[1.6,5.6,0.9]]){oLimb(M,[x,0,z],[x+0.1,2.0*s,z],0.2*s,0.13*s,7,[0.45,0.31,0.2],1);
    for(const [dx,dy,dz,r,c] of [[0,3.2,0,1.45,[0.33,0.58,0.27]],[0.9,2.9,0.3,1.05,[0.28,0.52,0.24]],[-0.85,2.95,-0.3,1.1,[0.3,0.55,0.25]],[0.1,3.9,0.1,0.95,[0.36,0.62,0.29]]])oIco(M,x+dx*s,dy*s,z+dz*s,r*s,c,1,{detail:1,jit:0.14,seed:((r+x)*10)|0});}
  return M;}

// ---------------- GL
function sh(t,s){const x=g.createShader(t);g.shaderSource(x,s);g.compileShader(x);if(!g.getShaderParameter(x,g.COMPILE_STATUS))throw new Error(g.getShaderInfoLog(x)+'\n'+s);return x;}
function prog(vs,fs){const p=g.createProgram();g.attachShader(p,sh(g.VERTEX_SHADER,vs));g.attachShader(p,sh(g.FRAGMENT_SHADER,fs));g.linkProgram(p);if(!g.getProgramParameter(p,g.LINK_STATUS))throw new Error(g.getProgramInfoLog(p));return p;}
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],cr=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],norm=a=>{const l=Math.hypot(...a);return a.map(v=>v/l);};
function look(e,c,u){const z=norm(sub(e,c)),x=norm(cr(u,z)),y=cr(z,x);return[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,e),-dot(y,e),-dot(z,e),1];}
function persp(f,a,n,fa){const t=1/Math.tan(f/2);return[t/a,0,0,0,0,t,0,0,0,0,(fa+n)/(n-fa),-1,0,0,2*fa*n/(n-fa),0];}
function ortho(l,r,b,t,n,f){return[2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1];}
function mul(a,b){const o=new Array(16).fill(0);for(let i=0;i<4;i++)for(let j=0;j<4;j++)for(let k=0;k<4;k++)o[j*4+i]+=a[k*4+i]*b[j*4+k];return o;}

const VS=`#version 300 es
layout(location=0) in vec3 aP;layout(location=1) in vec3 aN;layout(location=2) in vec3 aC;layout(location=3) in float aM;
uniform mat4 uVP,uLVP;uniform vec3 uL;out vec3 vW,vN;flat out vec3 vC;out vec4 vL;flat out int vM;
void main(){vW=aP;vN=aN;vC=aC;vM=int(aM+.5);vec3 nl=dot(aN,uL)<0.?-aN:aN;vL=uLVP*vec4(aP+nl*.025,1.);gl_Position=uVP*vec4(aP,1.);}`;
const FS=`#version 300 es
precision highp float;precision highp sampler2DShadow;in vec3 vW,vN;flat in vec3 vC;in vec4 vL;flat in int vM;uniform vec3 uEye,uL;uniform sampler2DShadow uSh;uniform vec2 uShT;
layout(location=0) out vec4 oC;layout(location=1) out vec4 oN;
uniform float uMoss;
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
float shadowAt(vec4 l,float bias){vec3 p=l.xyz/l.w*.5+.5;if(p.x<0.||p.y<0.||p.x>1.||p.y>1.)return 1.;float s=0.;for(int i=-1;i<=1;i+=2)for(int j=-1;j<=1;j+=2)s+=texture(uSh,vec3(p.xy+vec2(i,j)*.5*uShT,p.z-bias));return s*.25;}
void main(){vec3 N=normalize(vN),V=normalize(uEye-vW);if(dot(N,V)<0.)N=-N;vec3 Ng=N;vec3 c=vC;float mort=0.;
  // relief: 4 wood shingles, 5 brick, 6 planks/beams, 7 thatch, 8 fieldstone. Tilted normals per course give a cel band per shingle/brick;
  // joints darken; each piece gets its own weathered tint
  if(vM>=4){vec3 t=abs(N.y)>.97?vec3(1,0,0):normalize(cross(vec3(0,1,0),N));vec3 b=normalize(cross(N,t));if(b.y<0.)b=-b;float su=dot(vW,t),sv=dot(vW,b);
    if(vM==4){vec3 th=normalize(cross(vec3(0,1,0),N));float su4=dot(vW,th),sv4=vW.y/.27,r=floor(sv4),f=fract(sv4),w=.36+.16*h2(vec2(r,7.)),s=su4/w+r*.53,id=h2(vec2(r,floor(s)));
      c*=.76+.34*id;if(id>.86)c=mix(c,vec3(dot(c,vec3(.33))),.55);N=normalize(N+vec3(0,.38,0)*(.5-f)+th*(id-.5)*.32);if(f<.14){N=normalize(N*.45+vec3(0,-1,0)*.6);c*=.74;}if(fract(s)<.045)mort=.42;
      if(uMoss>0.){float m=step(.58,vn(vec2(su4*.45,vW.y*.7)+3.))*step(.4,id);c=mix(c,vec3(.3,.44,.17),m*uMoss);}}
    else if(vM==5){float rh=.17,r=floor(sv/rh),f=fract(sv/rh),s=su/.36+r*.5,id=h2(vec2(r,floor(s)));c*=.8+.32*id;float fs=fract(s);N=normalize(N+b*(f-.5)*.5+t*(fs-.5)*.3);if(f<.1||fs<.045)mort=.4;}
    else if(vM==8){float rh=.3,r=floor(sv/rh),f=fract(sv/rh),s=su/(.42+.25*h2(vec2(r,3.)))+h2(vec2(r,1.)),id=h2(vec2(r,floor(s)));c*=.72+.45*id;float fs=fract(s);
      N=normalize(N+b*(f-.5)*.9+t*(fs-.5)*.7);if(f<.11||fs<.06)mort=.5;}
    else if(vM==6){float s=su/.21,id=h2(vec2(floor(s),2.));c*=.78+.34*id;c*=.92+.12*vn(vec2(s*3.,sv*.8));if(fract(s)<.05&&abs(N.y)<.7)mort=.6;}
    else if(vM==7){float rh=.55,r=floor(sv/rh),f=fract(sv/rh),edge=.07+.05*sin(su*1.7+r*2.1);float st=vn(vec2(su*11.,sv*.7+r*3.)),st2=vn(vec2(su*31.,sv*.4));c*=.9+.2*st+.12*st2;c*=mix(.86,1.06,f);
      N=normalize(N+t*(st-.5)*.3);if(f<edge){N=normalize(N*.6-b);c*=.84;}c=mix(c,c*vec3(.86,.9,.78),.6*vn(vec2(su,sv)*.45));}
    if(uMoss>0.&&(vM==7||vM==8)){float m=smoothstep(.52,.85,vn(vec2(su,sv)*.9+7.))*uMoss;c=mix(c,vec3(.36,.47,.2),m*.7);}
    c=mix(c,c*.42+vec3(.55,.52,.47)*(vM==5?.35:0.),mort);}
  float d=dot(N,uL);
  float sh=shadowAt(vL,.0006+.0012*(1.-abs(dot(Ng,uL))));vec3 warm=vec3(1.07,1.,.9),cool=vec3(.56,.61,.84);vec3 col;
  if(vM==1){float l=clamp(d*.85+.25,0.,1.)*mix(.35,1.,sh);col=c*mix(cool*.86,warm,l);col*=.94+.1*N.y;}
  else{float lit=smoothstep(.0,.07,d)*smoothstep(.35,.65,sh);col=c*mix(cool,warm,lit);col*=1.+.07*max(Ng.y,0.)*lit;if(d>.82)col*=1.+.06*lit;col*=mix(.8,1.,smoothstep(0.,.45,vW.y));
    if(vM==2){float st=smoothstep(.70,.74,fract((vW.x*.6+vW.y*.8+vW.z*.6)*.9))*(1.-smoothstep(.80,.84,fract((vW.x*.6+vW.y*.8+vW.z*.6)*.9)));float fr=pow(1.-max(dot(N,V),0.),2.);
      col=mix(c*mix(.75,1.15,lit),vec3(.62,.78,.92),.22+.5*fr)+st*.55;}
    if(vM==3)col=c*1.15;}
  oC=vec4(col,1.);float id=vM==1?0.:.05+.95*fract(sin(dot(floor(c*255.+.5),vec3(1.2989,7.8233,3.7719)))*437.585453);oN=vec4(Ng*.5+.5,id);}`;
const SVS=`#version 300 es
layout(location=0) in vec3 aP;uniform mat4 uLVP;void main(){gl_Position=uLVP*vec4(aP,1.);}`;
const SFS=`#version 300 es
precision mediump float;void main(){}`;
const QVS=`#version 300 es
const vec2 P[3]=vec2[3](vec2(-1,-1),vec2(3,-1),vec2(-1,3));out vec2 vU;void main(){vec2 p=P[gl_VertexID];vU=p*.5+.5;gl_Position=vec4(p,0,1);}`;
// ink: edges where depth, normal or part id changes, wherever a man-made pixel is involved; the line takes a dark version of the local colour
const INK=`#version 300 es
precision highp float;in vec2 vU;uniform sampler2D uC,uN,uD;uniform vec2 uPx;uniform float uNear,uFar,uR;out vec4 o;
float lz(vec2 u){float d=texture(uD,u).r;return uNear*uFar/(uFar-d*(uFar-uNear));}
void main(){vec3 c=texture(uC,vU).rgb;vec4 n0=texture(uN,vU);float z0=lz(vU),dz0=texture(uD,vU).r;float e=0.;vec3 dk=c;
  if(dz0<1.){for(int k=0;k<8;k++){float a=float(k)*.785398;vec2 u=vU+vec2(cos(a),sin(a))*uR*uPx;vec4 n1=texture(uN,u);float z1=lz(u);bool mm=n0.a>0.||n1.a>0.;if(!mm)continue;
    float ed=0.;if(abs(z1-z0)>.012*z0+.02)ed=1.;if(dot(n0.xyz*2.-1.,n1.xyz*2.-1.)<.82)ed=max(ed,.9);if(n0.a>0.&&n1.a>0.&&abs(n0.a-n1.a)>.003)ed=max(ed,.75);
    if(z1+.02<z0&&n1.a==0.&&n0.a>0.)ed=0.;e=max(e,ed);if(ed>0.&&z1<z0)dk=min(dk,texture(uC,u).rgb);}}
  vec3 ink=min(c,dk)*.24+vec3(.03,.02,.025);
  // sky behind everything
  if(dz0>=1.){c=mix(vec3(.84,.9,.94),vec3(.55,.72,.9),smoothstep(.55,1.,vU.y));}
  else{float hz=smoothstep(32.,85.,z0);c=mix(c,vec3(.8,.87,.9),hz*.85);ink=mix(ink,c,hz);}
  o=vec4(mix(c,ink,e),1.);}`;
// tilt-shift: blur grows toward the top and bottom of the frame, a light vignette
const TS=`#version 300 es
precision highp float;in vec2 vU;uniform sampler2D uC;uniform vec2 uPx;out vec4 o;
void main(){float b=smoothstep(.16,.48,abs(vU.y-.47))*7.;vec3 s=texture(uC,vU).rgb;float w=1.;
  for(int k=0;k<12;k++){float a=float(k)*2.39996,r=sqrt(float(k)+.5)/3.5*b;vec2 u=vU+vec2(cos(a),sin(a))*r*uPx;s+=texture(uC,u).rgb;w+=1.;}
  vec3 c=s/w;float vg=smoothstep(1.1,.35,length(vU-vec2(.5,.48)));o=vec4(c*mix(.9,1.,vg),1.);}`;

function tex(w,h,ifmt,fmt,type,filt){const t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);g.texImage2D(g.TEXTURE_2D,0,ifmt,w,h,0,fmt,type,null);
  g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,filt);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,filt);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);return t;}

window.CEL={render(opt){opt=opt||{};const M=(opt.house&&opt.house.style==='cozy')?celCozy(opt.house):celCottage(opt.house),nv=M.v.length/10;
  const buf=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,buf);g.bufferData(g.ARRAY_BUFFER,new Float32Array(M.v),g.STATIC_DRAW);const vao=g.createVertexArray();g.bindVertexArray(vao);
  g.enableVertexAttribArray(0);g.vertexAttribPointer(0,3,g.FLOAT,false,40,0);g.enableVertexAttribArray(1);g.vertexAttribPointer(1,3,g.FLOAT,false,40,12);g.enableVertexAttribArray(2);g.vertexAttribPointer(2,3,g.FLOAT,false,40,24);g.enableVertexAttribArray(3);g.vertexAttribPointer(3,1,g.FLOAT,false,40,36);
  const L=norm(opt.sun||[0.32,0.84,-0.44]),tgt=opt.target||[-0.6,1.9,-2.2],dir=norm(opt.dir||[-0.6,0.56,-0.57]),dist=opt.dist||36,eye=[tgt[0]+dir[0]*dist,tgt[1]+dir[1]*dist,tgt[2]+dir[2]*dist];
  const near=1,far=260,VP=mul(persp((opt.fov||30)*Math.PI/180,1,near,far),look(eye,tgt,[0,1,0]));
  const lc=[0,0,-1],LV=look([lc[0]+L[0]*60,lc[1]+L[1]*60,lc[2]+L[2]*60],lc,[0,1,0]),LVP=mul(ortho(-17,17,-17,17,1,140),LV);
  // shadow map
  const SS=2048,sT=tex(SS,SS,g.DEPTH_COMPONENT24,g.DEPTH_COMPONENT,g.UNSIGNED_INT,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_COMPARE_MODE,g.COMPARE_REF_TO_TEXTURE);
  const sF=g.createFramebuffer();g.bindFramebuffer(g.FRAMEBUFFER,sF);g.framebufferTexture2D(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.TEXTURE_2D,sT,0);
  const sp=prog(SVS,SFS);g.useProgram(sp);g.uniformMatrix4fv(g.getUniformLocation(sp,'uLVP'),false,LVP);g.viewport(0,0,SS,SS);g.enable(g.DEPTH_TEST);g.clear(g.DEPTH_BUFFER_BIT);g.drawArrays(g.TRIANGLES,0,nv);
  // main pass: colour + normal/id + depth
  const cT=tex(SZ,SZ,g.RGBA8,g.RGBA,g.UNSIGNED_BYTE,g.LINEAR),nT=tex(SZ,SZ,g.RGBA8,g.RGBA,g.UNSIGNED_BYTE,g.NEAREST),dT=tex(SZ,SZ,g.DEPTH_COMPONENT24,g.DEPTH_COMPONENT,g.UNSIGNED_INT,g.NEAREST);
  const mF=g.createFramebuffer();g.bindFramebuffer(g.FRAMEBUFFER,mF);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,cT,0);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT1,g.TEXTURE_2D,nT,0);g.framebufferTexture2D(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.TEXTURE_2D,dT,0);
  g.drawBuffers([g.COLOR_ATTACHMENT0,g.COLOR_ATTACHMENT1]);g.viewport(0,0,SZ,SZ);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);
  const mp=prog(VS,FS);g.useProgram(mp);const U=n=>g.getUniformLocation(mp,n);g.uniformMatrix4fv(U('uVP'),false,VP);g.uniformMatrix4fv(U('uLVP'),false,LVP);g.uniform3fv(U('uEye'),eye);g.uniform3fv(U('uL'),L);g.uniform2f(U('uShT'),1/SS,1/SS);g.uniform1f(U('uMoss'),opt.moss||0);
  g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,sT);g.uniform1i(U('uSh'),0);g.drawArrays(g.TRIANGLES,0,nv);
  // ink pass to a texture, then tilt-shift to the canvas
  const iT=tex(SZ,SZ,g.RGBA8,g.RGBA,g.UNSIGNED_BYTE,g.LINEAR),iF=g.createFramebuffer();g.bindFramebuffer(g.FRAMEBUFFER,iF);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,iT,0);
  g.disable(g.DEPTH_TEST);const ip=prog(QVS,INK);g.useProgram(ip);const I=n=>g.getUniformLocation(ip,n);
  g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,cT);g.uniform1i(I('uC'),0);g.activeTexture(g.TEXTURE1);g.bindTexture(g.TEXTURE_2D,nT);g.uniform1i(I('uN'),1);g.activeTexture(g.TEXTURE2);g.bindTexture(g.TEXTURE_2D,dT);g.uniform1i(I('uD'),2);
  g.uniform2f(I('uPx'),1/SZ,1/SZ);g.uniform1f(I('uNear'),near);g.uniform1f(I('uFar'),far);g.uniform1f(I('uR'),opt.ink||2.2);g.drawArrays(g.TRIANGLES,0,3);
  g.bindFramebuffer(g.FRAMEBUFFER,null);const tp=prog(QVS,TS);g.useProgram(tp);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,iT);g.uniform1i(g.getUniformLocation(tp,'uC'),0);g.uniform2f(g.getUniformLocation(tp,'uPx'),1/SZ,1/SZ);g.drawArrays(g.TRIANGLES,0,3);
  g.finish();return{tris:nv/3,err:g.getError()};}};
})();
