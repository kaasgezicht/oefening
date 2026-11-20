'use strict';
// ===== heli.js
// ===================================================================
// A twin-engine rescue helicopter (4.35.0), modelled from the user's five photos of orange coast-guard helicopters of the Dolphin type: an
// orange-red body, a big black radome on the nose, a wrap-round windscreen with black frames, a cockpit door and a sliding cabin door with
// windows, a thin white line along the sill, the engine fairing ("doghouse") on top with round intakes and black exhausts behind, a rescue
// hoist on an arm over the right-hand door (an orange pod with a black end), a slanted white band with a thin blue stripe on the tail
// boom, a shrouded tail rotor (fenestron: a white duct with a fan of ten blades) under a swept fin with the number 6550, a tailplane with
// end plates, fixed tricycle gear (twin nose wheels, single main wheels on legs from the sponsons), a four-blade main rotor with
// white-and-black tips, a black sensor ball and a searchlight under the chin, and two crew in the cockpit.
// Real sizes: rotor 11.9 m across, 11.6 m long, about 4 t. Body frame as the planes: x forward, y up, z right, origin at the centre of
// mass, 1.25 m above the ground on its wheels. Measures in the code: d = metres back from the nose tip, h = metres above the ground.
// It takes off from airstrips; it flies on the same controls as the planes: the left slider is the collective (with Assist: the middle
// holds the height, up climbs, down sinks), the stick tilts it (Assist: let go and it levels and stops over the ground), the rudder
// buttons turn it.
// ===================================================================
const PLH={m:4000,I:[9000,26000,22000],eye:[2.3,0.3,0.36],wheels:[[2.95,-1.25,0],[-0.95,-1.25,-1.08],[-0.95,-1.25,1.08]],hub:[0,2.22,0],rotorR:5.95,fan:[-6.2,0.3,0],
  chase:[17,5.2],wing:[-1.6,1.0,-6.5],cg:1.25};
const HELI_PARTS={};
function heliMeshes(){
  const OR=[0.93,0.2,0.07],ORd=[0.62,0.12,0.04],BK=[0.035,0.035,0.04],WH=[0.94,0.94,0.93],BL=[0.1,0.18,0.52],GR=[0.24,0.25,0.27],LG=[0.78,0.79,0.8],TY=[0.05,0.05,0.055],
    GLs=[0.18,0.21,0.24],INT=[0.17,0.17,0.18],NAVY=[0.07,0.09,0.17],SUIT=[0.28,0.3,0.22],SKIN=[0.86,0.63,0.5],HELM=[0.92,0.92,0.9],RED=[0.95,0.08,0.04],
    PAINT=11,CHROME=10,MATTE=3,INTM=7,GLASS=13;
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],
    crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],nrm=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l];},lerp=(a,b,t)=>a+(b-a)*t;
  const V=(M,p,n,c,m)=>{M.v.push(p[0],p[1],p[2],n[0],n[1],n[2],c[0],c[1],c[2],0,0,0,1,m);return M.n++;};
  const surf=(M,f,us,vs,paint,o)=>{o=o||{};const nu=us.length,nv=vs.length,P=[],N=[],eu=o.eu||1e-4,ev=o.ev||1e-4;
    for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const u=us[i],v=vs[j],p=f(u,v);let du=sub(f(u+eu,v),f(u-eu,v)),dv=sub(f(u,v+ev),f(u,v-ev));
      if(Math.hypot(...du)<1e-9)du=sub(f(u+eu*50,v),f(u-eu*50,v));if(Math.hypot(...dv)<1e-9)dv=sub(f(u,v+ev*50),f(u,v-ev*50));let n=nrm(crs(du,dv));if(o.flip)n=mul(n,-1);P.push(p);N.push(n);}
    for(let i=0;i+1<nu;i++)for(let j=0;j+1<nv;j++){const pc=paint?paint((us[i]+us[i+1])/2,(vs[j]+vs[j+1])/2):[OR,PAINT];if(!pc)continue;
      const k=[i*nv+j,(i+1)*nv+j,(i+1)*nv+j+1,i*nv+j+1],ix=k.map(q=>V(M,P[q],N[q],pc[0],pc[1]));M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);}};
  const range=(a,b,n)=>{const r=[];for(let i=0;i<=n;i++)r.push(a+(b-a)*i/n);return r;};
  const mono=T=>{T=T.slice().sort((a,b)=>a[0]-b[0]);const n=T.length,xs=T.map(t=>t[0]),ys=T.map(t=>t[1]),d=[],m=new Array(n);for(let i=0;i<n-1;i++)d.push((ys[i+1]-ys[i])/(xs[i+1]-xs[i]));
    m[0]=d[0];m[n-1]=d[n-2];for(let i=1;i<n-1;i++)m[i]=d[i-1]*d[i]<=0?0:(d[i-1]+d[i])/2;for(let i=0;i<n-1;i++){if(d[i]===0){m[i]=m[i+1]=0;continue;}const a=m[i]/d[i],b=m[i+1]/d[i],h=a*a+b*b;if(h>9){const t=3/Math.sqrt(h);m[i]=t*a*d[i];m[i+1]=t*b*d[i];}}
    return x=>{if(x<=xs[0])return ys[0];if(x>=xs[n-1])return ys[n-1];let i=0;while(x>xs[i+1])i++;const h=xs[i+1]-xs[i],t=(x-xs[i])/h,t2=t*t,t3=t2*t;return(2*t3-3*t2+1)*ys[i]+(t3-2*t2+t)*h*m[i]+(-2*t3+3*t2)*ys[i+1]+(t3-t2)*h*m[i+1];};};
  const tube=(M,a,b,r0,r1,n,col,mat,cap)=>{const ax=nrm(sub(b,a)),h=Math.abs(ax[1])<0.9?[0,1,0]:[1,0,0],u=nrm(crs(ax,h)),w=crs(ax,u);
    surf(M,(s,t)=>{const r=lerp(r0,r1,s),c=Math.cos(t),sn=Math.sin(t);return add(add(a,mul(sub(b,a),s)),add(mul(u,c*r),mul(w,sn*r)));},[0,1],range(0,Math.PI*2,n),()=>[col,mat]);
    if(cap)for(const [p,r,sg] of [[a,r0,-1],[b,r1,1]]){const c0=V(M,p,mul(ax,sg),col,mat);for(let k=0;k<n;k++){const t0=k/n*Math.PI*2,t1=(k+1)/n*Math.PI*2,q0=add(p,add(mul(u,Math.cos(t0)*r),mul(w,Math.sin(t0)*r))),q1=add(p,add(mul(u,Math.cos(t1)*r),mul(w,Math.sin(t1)*r)));M.i.push(c0,V(M,q0,mul(ax,sg),col,mat),V(M,q1,mul(ax,sg),col,mat));}}};
  const ball=(M,c,r,s,col,mat,n)=>{n=n||12;s=s||[1,1,1];surf(M,(a,b)=>[c[0]+Math.cos(b)*Math.cos(a)*r*s[0],c[1]+Math.sin(b)*r*s[1],c[2]+Math.cos(b)*Math.sin(a)*r*s[2]],range(0,Math.PI*2,n),range(-Math.PI/2,Math.PI/2,Math.ceil(n/2)),()=>[col,mat],{ev:1e-3});};
  const box=(M,c,h,col,mat)=>{const P=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(v=>[c[0]+v[0]*h[0],c[1]+v[1]*h[1],c[2]+v[2]*h[2]]);
    for(const [f,n] of [[[0,1,2,3],[0,0,-1]],[[5,4,7,6],[0,0,1]],[[4,0,3,7],[-1,0,0]],[[1,5,6,2],[1,0,0]],[[3,2,6,7],[0,1,0]],[[4,5,1,0],[0,-1,0]]]){const ix=f.map(i=>V(M,P[i],n,col,mat));M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);}};
  const quad=(M,a,b,c,d,n,col,mat)=>{const ix=[a,b,c,d].map(p=>V(M,p,n,col,mat));M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);};
  // a flat plate from an outline in (d,h), half-thickness th, at side offset z0 (fin, end plates): two faces and the edges
  const slab=(M,poly,th,col,mat,z0)=>{z0=z0||0;const P=poly.map(([d,h])=>[4.3-d,h-1.25]),n=P.length,c=P.reduce((a,p)=>[a[0]+p[0]/n,a[1]+p[1]/n],[0,0]);
    for(const sd of [-1,1]){const ci=V(M,[c[0],c[1],z0+sd*th],[0,0,sd],col,mat);for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n];M.i.push(ci,V(M,[a[0],a[1],z0+sd*th],[0,0,sd],col,mat),V(M,[b[0],b[1],z0+sd*th],[0,0,sd],col,mat));}}
    for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n],e=nrm([b[1]-a[1],-(b[0]-a[0]),0]),en=[e[0],e[1],0];quad(M,[a[0],a[1],z0-th],[b[0],b[1],z0-th],[b[0],b[1],z0+th],[a[0],a[1],z0+th],en,col,mat);}};
  const X=d=>4.3-d,Y=h=>h-1.25;
  // a crew member seated facing forward (or, with side, facing the right-hand door): flight suit, white helmet, dark visor
  const person=(M,d,z,side)=>{const SU=side?[0.9,0.35,0.12]:SUIT;if(side){box(M,[X(d),Y(1.08),z],[0.18,0.24,0.14],SU,MATTE);ball(M,[X(d),Y(1.48),z+0.02],0.13,[1,1.1,1],HELM,PAINT,12);box(M,[X(d),Y(1.46),z+0.1],[0.1,0.05,0.05],BK,PAINT);
      for(const s2 of [-1,1])box(M,[X(d)+s2*0.12,Y(0.95),z+0.2],[0.05,0.05,0.2],SU,MATTE);return;}
    box(M,[X(d),Y(1.18),z],[0.14,0.24,0.18],SUIT,MATTE);ball(M,[X(d)+0.02,Y(1.58),z],0.13,[1,1.1,1],HELM,PAINT,12);box(M,[X(d)+0.1,Y(1.56),z],[0.05,0.05,0.1],BK,PAINT);
    for(const s2 of [-1,1])box(M,[X(d)+0.22,Y(1.05),z+s2*0.12],[0.22,0.05,0.05],SUIT,MATTE);};

  // ================================================================ the fuselage: superelliptic sections along d
  const top=mono([[0,0.76],[0.06,0.98],[0.2,1.1],[0.55,1.22],[1.0,1.32],[1.25,1.5],[1.6,1.86],[1.95,2.1],[2.4,2.22],[4.6,2.22],[5.4,2.14],[6.4,1.98],[7.6,1.82],[9.0,1.72],[9.8,1.68]]),
    bot=mono([[0,0.76],[0.06,0.56],[0.2,0.44],[0.55,0.36],[1.0,0.38],[1.6,0.44],[2.5,0.5],[4.8,0.52],[5.5,0.64],[6.4,1.05],[7.6,1.26],[9.8,1.36]]),
    hw=mono([[0,0.02],[0.06,0.22],[0.2,0.36],[0.55,0.52],[1.0,0.64],[1.6,0.82],[2.3,0.9],[4.8,0.92],[5.5,0.84],[6.4,0.52],[7.6,0.33],[9.8,0.22]]),
    exf=mono([[0,2],[1.0,2],[1.8,3.2],[5.2,3.2],[6.6,2.4],[9.8,2.2]]);
  const sp=(c,m)=>Math.sign(c)*Math.pow(Math.abs(c),2/m);
  const F=(d,t,ins)=>{ins=ins||0;const tp=top(d)-ins,bt=bot(d)+ins,b=Math.max(0.01,hw(d)-ins),m=exf(d),yc=(tp+bt)/2,a=(tp-bt)/2;return[X(d),Y(yc+a*sp(Math.cos(t),m)),b*sp(Math.sin(t),m)];};
  // the side of the body at (d,h): z out to the skin, for paint drawn on top (the sill line and the lettering)
  const sideZ=(d,h)=>{const tp=top(d),bt=bot(d),m=exf(d),yc=(tp+bt)/2,a=(tp-bt)/2,q=clamp(Math.abs((h-yc)/a),0,1);return hw(d)*Math.pow(Math.max(0,1-Math.pow(q,m)),1/m);};
  const rr=(d,h,d0,d1,h0,h1,r)=>{const cx=clamp(d,d0+r,d1-r),cy=clamp(h,h0+r,h1-r);return Math.hypot(d-cx,h-cy)<=r&&d>=d0&&d<=d1&&h>=h0&&h<=h1;};
  const WIN=[[2.16,2.95,1.33,2.0,0.1],[3.2,4.12,1.38,1.95,0.08]];
  const DOOR=[3.08,4.36,0.95,2.1],inDoor=(d,h,z)=>z>0&&d>DOOR[0]&&d<DOOR[1]&&h>DOOR[2]&&h<DOOR[3];/* the right-hand sliding door */
  const glassAt=(d,h,z)=>{if(d>1.24&&d<2.06&&h>1.3&&(d<1.9||h<top(d)-0.07)&&Math.abs(z)>0.03)return true;for(const w of WIN)if(rr(d,h,...w))return true;return false;};
  const bandF=h=>7.25-(h-1.1)*0.62;// the white band's front edge leans forward at the top
  const paint=(d,t)=>{const p=F(d,t),h=p[1]+1.25,z=p[2];if(glassAt(d,h,z)||inDoor(d,h,z))return null;
    if(d<1.16+Math.max(0,h-0.95)*0.25&&h<1.42)return[BK,MATTE];// the radome
    if(d<2.08&&h>1.18&&d>1.0)return[BK,PAINT];// the windscreen frame
    for(const w of WIN)if(rr(d,h,w[0]-0.035,w[1]+0.035,w[2]-0.035,w[3]+0.035,w[4]+0.03))return[BK,PAINT];// window frames
    const bf=bandF(h);if(d>=bf&&d<bf+0.78)return[WH,PAINT];if(d>=bf+0.78&&d<bf+0.9)return[BL,PAINT];
    if(d>5.0&&d<7.1&&h>top(d)-0.16)return[BK,MATTE];// behind the engines, the boom's top is black
    if([2.08,3.0,3.08,4.36].some(q=>Math.abs(d-q)<0.012)&&h>0.92&&h<2.12)return[ORd,PAINT];// door seams
    return[OR,PAINT];};
  const body=vmesh(),dS=[];for(let d=0;d<9.75;d+=d<1.4||(d>6.2&&d<8.4)?0.02:0.04)dS.push(d);dS.push(9.75,2.08-0.012,2.08+0.012,3.0-0.012,3.0+0.012,3.08-0.012,3.08+0.012,4.36-0.012,4.36+0.012);
  const ds=[...new Set(dS.map(v=>+v.toFixed(4)))].sort((a,b)=>a-b),ts=range(0,Math.PI*2,112);
  surf(body,F,ds,ts,paint,{ev:1e-3});
  const glass=vmesh();surf(glass,F,ds.filter(d=>d>1.2&&d<4.2),ts,(d,t)=>{const p=F(d,t);return glassAt(d,p[1]+1.25,p[2])&&!inDoor(d,p[1]+1.25,p[2])?[GLs,GLASS]:null;},{ev:1e-3});
  // the end of the boom inside the tail rotor's shroud
  {const d=9.75,c0=V(body,[X(d)-0.01,Y((top(d)+bot(d))/2),0],[-1,0,0],OR,PAINT);for(let k=0;k<32;k++){const a=F(d,k/32*Math.PI*2),b=F(d,(k+1)/32*Math.PI*2);body.i.push(c0,V(body,b,[-1,0,0],OR,PAINT),V(body,a,[-1,0,0],OR,PAINT));}}
  // inside: a dark lining, the floor, the panel, seats
  surf(body,(d,t)=>F(d,t,0.05),ds.filter(d=>d>1.15&&d<4.4),ts,(d,t)=>{const p=F(d,t);return glassAt(d,p[1]+1.25,p[2])||inDoor(d,p[1]+1.25,p[2])?null:[INT,INTM];},{ev:1e-3,flip:true});/* open behind the glass and the door */
  box(body,[X(2.8),Y(0.62),0],[1.5,0.03,0.82],INT,INTM);box(body,[X(1.5),Y(1.28),0],[0.09,0.14,0.62],[0.08,0.08,0.09],MATTE);box(body,[X(1.45),Y(1.42),0],[0.16,0.02,0.64],[0.05,0.05,0.06],MATTE);
  for(const z of [-0.38,0.38]){box(body,[X(2.45),Y(0.82),z],[0.25,0.06,0.22],[0.2,0.2,0.22],INTM);box(body,[X(2.72),Y(1.2),z],[0.05,0.38,0.22],[0.2,0.2,0.22],INTM);}
  for(const z of [-0.45,0,0.45])box(body,[X(4.0),Y(0.85),z],[0.22,0.05,0.2],[0.25,0.25,0.27],INTM);
  // the white sill line, on the skin
  for(const sd of [-1,1]){let prv=null;for(let d=1.2;d<=6.3;d+=0.05){const ha=0.9,hb=0.955,za=sideZ(d,ha)+0.008,zb=sideZ(d,hb)+0.008,q=[V(body,[X(d),Y(ha),sd*za],[0,0,sd],WH,PAINT),V(body,[X(d),Y(hb),sd*zb],[0,0,sd],WH,PAINT)];if(prv)body.i.push(prv[0],q[0],q[1],prv[0],q[1],prv[1]);prv=q;}}
  // lettering from a canvas: one quad per run of pixels, laid on the skin; on the left side it reads from the nose back, on the right from the tail forward
  const letter=(text,font,W,H,d0,len,h1,ht,col,zf,M,sides)=>{M=M||body;sides=sides||[-1,1];if(typeof document==='undefined')return;const cv=document.createElement('canvas'),gx=cv.getContext('2d');cv.width=W;cv.height=H;gx.fillStyle='#000';gx.fillRect(0,0,W,H);
    gx.font=font;gx.textBaseline='middle';gx.fillStyle='#f00';gx.fillText(text,2,H/2+1);const dd=gx.getImageData(0,0,W,H).data;
    for(const sd of sides)for(let y=0;y<H;y++){let run=-1;for(let x=0;x<=W;x++){const on=x<W&&dd[(y*W+x)*4]>110;if(on&&run<0)run=x;if(!on&&run>=0){const fd=a=>sd<0?d0+(a/W)*len:d0+len-(a/W)*len,da=fd(run),db=fd(x),ha=h1-y/H*ht,hb=h1-(y+1)/H*ht,
        P4=[[da,ha],[db,ha],[db,hb],[da,hb]].map(([d,h])=>[X(d),Y(h),sd*(zf(d,h)+0.011)]),ix=P4.map(p=>V(M,p,[0,0,sd],col,PAINT));M.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);run=-1;}}}};
  letter('U.S. COAST GUARD','bold 30px Arial',330,40,4.95,1.85,1.72,0.24,NAVY,sideZ);

  const insignia=(M,d,h,sd,zf)=>{const S=(dd,hh,o)=>[X(dd),Y(hh),sd*(zf(dd,hh)+0.011+(o||0))],r=0.17,tri=(a,b,c,col,o)=>{const ix=[a,b,c].map(q=>V(M,S(q[0],q[1],o),[0,0,sd],col,PAINT));M.i.push(...ix);};
    for(const s2 of [-1,1]){const bx=d+s2*r*0.5,ex=d+s2*(r+0.2);for(const [h0,h1,col,o] of [[h-0.085,h+0.085,WH,0],[h-0.035,h+0.035,RED,0.002]]){tri([bx,h0],[ex,h0],[ex,h1],col,o);tri([bx,h0],[ex,h1],[bx,h1],col,o);}}
    for(let k=0;k<24;k++){const a0=k/24*6.283,a1=(k+1)/24*6.283;tri([d,h],[d+Math.cos(a0)*r,h+Math.sin(a0)*r],[d+Math.cos(a1)*r,h+Math.sin(a1)*r],[0.08,0.14,0.42],0.003);}
    for(let k=0;k<5;k++){const a=Math.PI/2+k*1.2566,ai=a+0.6283,R1=r*0.92,R2=R1*0.382;tri([d,h],[d+Math.cos(a)*R1,h+Math.sin(a)*R1],[d+Math.cos(ai)*R2,h+Math.sin(ai)*R2],WH,0.005);tri([d,h],[d+Math.cos(a-0.6283)*R2,h+Math.sin(a-0.6283)*R2],[d+Math.cos(a)*R1,h+Math.sin(a)*R1],WH,0.005);}};
  insignia(body,3.95,1.18,-1,sideZ);
  for(const sd of [-1,1]){tube(body,[X(1.42),Y(1.36),sd*0.22],[X(1.26),Y(1.62),sd*0.36],0.009,0.007,5,BK,MATTE,true);}// wipers
  for(const [d,h,y2] of [[5.3,0.6,0.38],[6.2,0.95,0.78]])slab(body,[[d,h],[d+0.28,h],[d+0.34,y2],[d+0.2,y2]],0.012,BK,MATTE);// belly antennas
  slab(body,[[6.3,2.0],[6.55,2.0],[6.62,2.32],[6.5,2.32]],0.012,BK,MATTE);// antenna on the boom
  for(const h of [0.97,2.12])tube(body,[X(3.0),Y(h),0.925],[X(5.55),Y(h),sideZ(5.55,h)+0.03],0.012,0.012,5,GR,CHROME);// the door's rails
  {const sx=X(DOOR[0]),ex=X(DOOR[1]);for(const [a,b] of [[[DOOR[0],DOOR[2]],[DOOR[0],DOOR[3]]],[[DOOR[1],DOOR[2]],[DOOR[1],DOOR[3]]],[[DOOR[0],DOOR[3]],[DOOR[1],DOOR[3]]],[[DOOR[0],DOOR[2]],[DOOR[1],DOOR[2]]]])
    tube(body,[X(a[0]),Y(a[1]),sideZ(a[0],a[1])-0.01],[X(b[0]),Y(b[1]),sideZ(b[0],b[1])-0.01],0.025,0.025,6,BK,MATTE);}// the door frame
  person(body,3.75,0.42,true);// the hoist operator, on the bench by the door
  for(const sd of [-1,1])for(const d of [2.5,4.0])tube(body,[X(d),Y(0.62),sd*(sideZ(d,0.62)-0.02)],[X(d+0.25),Y(0.62),sd*(sideZ(d+0.25,0.62)-0.02)],0.02,0.02,5,GR,CHROME);// footsteps
  // ================================================================ the engine fairing on top, intakes, exhausts, the hoist
  const dtp=mono([[2.35,2.18],[2.55,2.55],[2.9,2.84],[3.4,2.95],[4.4,2.95],[5.0,2.8],[5.6,2.42],[5.8,2.25]]),dhw=mono([[2.35,0.12],[2.6,0.42],[3.0,0.6],[4.6,0.62],[5.3,0.5],[5.8,0.32]]);
  const G=(d,t)=>{const hb=2.05,ht=dtp(d),b=dhw(d);return[X(d),Y(hb+(ht-hb)*sp(Math.cos(t),3.4)),b*sp(Math.sin(t),3.4)];};
  surf(body,G,range(2.35,5.8,70),range(-Math.PI/2,Math.PI/2,40),(d,t)=>{const p=G(d,t),h=p[1]+1.25;if(d>4.95&&h>2.25)return[BK,MATTE];return[OR,PAINT];},{ev:1e-3});
  for(const sd of [-1,1]){const d=3.95,h=2.6,z=sd*(dhw(d)*0.98);const c=[X(d),Y(h),z],o=[X(d),Y(h),z+sd*0.06];tube(body,c,o,0.21,0.21,20,OR,PAINT);
    {const ci=V(body,o,[0,0,sd],BK,MATTE);for(let k=0;k<20;k++){const a0=k/20*Math.PI*2,a1=(k+1)/20*Math.PI*2;body.i.push(ci,V(body,[o[0]+Math.cos(a0)*0.16,o[1]+Math.sin(a0)*0.16,o[2]],[0,0,sd],BK,MATTE),V(body,[o[0]+Math.cos(a1)*0.16,o[1]+Math.sin(a1)*0.16,o[2]],[0,0,sd],BK,MATTE));}}
    tube(body,[X(5.3),Y(2.48),sd*0.32],[X(6.05),Y(2.4),sd*0.5],0.14,0.15,14,BK,MATTE,true);}
  {const z=1.02;tube(body,[X(3.2),Y(2.62),0.55],[X(3.25),Y(2.56),z],0.07,0.06,10,OR,PAINT,true);tube(body,[X(3.85),Y(2.52),z],[X(3.0),Y(2.52),z],0.16,0.16,16,OR,PAINT,true);ball(body,[X(3.0),Y(2.52),z],0.16,[1,1,1],BK,MATTE,14);
    tube(body,[X(3.4),Y(2.37),z],[X(3.4),Y(1.95),z],0.012,0.012,5,GR,CHROME);ball(body,[X(3.4),Y(1.93),z],0.05,[1,1,1],GR,CHROME,8);}// the hoist, its cable and hook
  // the rotor mast and hub (static part), the cap on top
  tube(body,[0,Y(2.9),0],[0,Y(3.42),0],0.14,0.11,14,GR,CHROME);tube(body,[0,Y(2.88),0],[0,Y(3.05),0],0.52,0.42,24,OR,PAINT,true);// the mast and its fairing
  // ================================================================ the tail: shroud (fenestron), fin, number, tailplane, end plates
  const fc=[X(10.5),Y(1.55)],Ro=0.98,Ri=0.6,wz=0.2;
  {const ring=(r0,r1,col,sd)=>surf(body,(r,a)=>[fc[0]+Math.cos(a)*r,fc[1]+Math.sin(a)*r,sd*wz],[r0,r1],range(0,Math.PI*2,48),()=>[col,PAINT]);for(const sd of [-1,1]){ring(Ri,Ri+0.08,WH,sd);ring(Ri+0.08,Ro,OR,sd);}
    surf(body,(z,a)=>[fc[0]+Math.cos(a)*Ri,fc[1]+Math.sin(a)*Ri,z],[-wz,wz],range(0,Math.PI*2,48),()=>[WH,PAINT],{flip:true});
    surf(body,(z,a)=>[fc[0]+Math.cos(a)*Ro,fc[1]+Math.sin(a)*Ro,z],[-wz,wz],range(0,Math.PI*2,48),()=>[OR,PAINT]);
    for(const a of [0.6,2.6,4.4])box(body,[fc[0]+Math.cos(a)*0.38,fc[1]+Math.sin(a)*0.38,0.05],[Math.abs(Math.cos(a))*0.2+0.015,Math.abs(Math.sin(a))*0.2+0.015,0.012],GR,MATTE);// stator vanes
    ball(body,[fc[0],fc[1],0.07],0.17,[1,1,0.5],LG,PAINT,16);}
  slab(body,[[10.08,2.15],[10.86,3.8],[11.26,3.8],[11.46,1.5],[10.6,1.6]],0.065,OR,PAINT);
  slab(body,[[10.75,0.62],[11.3,0.62],[11.38,0.3],[11.08,0.3]],0.04,OR,PAINT);// the little fin under the shroud
  box(body,[X(9.38),Y(1.38),0],[0.28,0.035,1.46],OR,PAINT);
  for(const sd of [-1,1])slab(body,[[9.0,0.62],[9.68,0.66],[9.86,2.08],[9.4,2.02]],0.035,OR,PAINT,sd*1.48);// end plates
  {const finZ=(d,h)=>0.06;letter('6550','bold 34px Arial',90,40,10.62,0.62,3.32,0.3,BK,finZ);}
  // ================================================================ underneath and on the nose
  for(const sd of [-1,1])ball(body,[X(5.2),Y(0.74),sd*0.8],0.42,[1.05,0.42,0.5],OR,PAINT,16);// sponsons
  ball(body,[X(0.95),Y(0.2),-0.18],0.17,[1,1,1],BK,MATTE,14);tube(body,[X(0.95),Y(0.38),-0.18],[X(0.95),Y(0.3),-0.18],0.05,0.05,8,BK,MATTE);// the sensor ball
  tube(body,[X(1.25),Y(0.3),0.28],[X(1.05),Y(0.27),0.28],0.09,0.09,12,LG,CHROME,true);ball(body,[X(1.04),Y(0.27),0.28],0.08,[0.3,1,1],[1,0.98,0.85],PAINT,10);// searchlight
  for(const sd of [-1,1])tube(body,[X(0.75),Y(0.98),sd*0.5],[X(0.1),Y(1.0),sd*0.62],0.012,0.008,5,BK,MATTE);// air-data probes
  for(const [d,h] of [[6.9,1.04],[8.3,1.2]])tube(body,[X(d),Y(h),-0.5],[X(d),Y(h-0.25),-0.62],0.012,0.012,5,BK,MATTE);tube(body,[X(6.9),Y(0.79),-0.62],[X(8.3),Y(0.95),-0.62],0.012,0.012,5,BK,MATTE);// step rail
  // the gear: twin nose wheels, single main wheels on legs from the sponsons
  const wheel=(M,c,R0,w)=>{surf(M,(a,b)=>{const r=w/2;return[c[0]+Math.cos(a)*(R0-r+r*Math.cos(b)),c[1]+Math.sin(a)*(R0-r+r*Math.cos(b)),c[2]+r*Math.sin(b)];},range(0,Math.PI*2,22),range(0,Math.PI*2,8),()=>[TY,MATTE],{ev:1e-3});
    for(const s2 of [-1,1])surf(M,(r,a)=>[c[0]+Math.cos(a)*r,c[1]+Math.sin(a)*r,c[2]+s2*w*0.42],[0.02,R0-w*0.45],range(0,Math.PI*2,14),()=>[LG,CHROME]);};
  tube(body,[X(1.42),Y(0.62),0],[X(1.42),Y(0.44),0],0.06,0.055,8,LG,CHROME,true);// the nose leg's top (the fork below swivels)
  const noseFork=vmesh();tube(noseFork,[0,0.02,0],[0.06,-0.23,0],0.045,0.04,8,LG,CHROME,true);tube(noseFork,[0.06,-0.23,-0.2],[0.06,-0.23,0.2],0.025,0.025,6,LG,CHROME);
  const noseWheel=vmesh();for(const sd of [-1,1])wheel(noseWheel,[0,0,sd*0.16],0.22,0.12);
  const mainWheel=vmesh();wheel(mainWheel,[0,0,0],0.29,0.16);
  for(const sd of [-1,1]){const ax=[X(5.25),Y(0.29),sd*1.08];tube(body,[X(5.2),Y(0.72),sd*0.95],ax,0.06,0.05,8,LG,CHROME,true);tube(body,[X(4.65),Y(0.62),sd*0.85],[X(5.22),Y(0.36),sd*1.05],0.03,0.03,6,LG,CHROME);
    tube(body,[ax[0],ax[1],sd*1.0],[ax[0],ax[1],sd*1.24],0.03,0.03,6,LG,CHROME);}

  // ================================================================ crew (the pilot on the right is left out in the cockpit view)
  const pilot=vmesh();person(pilot,2.55,0.38);person(body,2.55,-0.38);
  // ================================================================ the main rotor (hub at the origin) and its blur disc; the tail fan
  // the rotor head turns with the blades: a star plate (Starflex), a white dome; each blade (drawn four times) carries its sleeve, pitch horn
  // and pitch link, and feathers about its own span while it flaps about the hub; the swashplate below rises and tilts with the controls
  const hub=vmesh();ball(hub,[0,0.24,0],0.26,[1,0.55,1],WH,PAINT,16);
  for(let k=0;k<4;k++){const a=k*Math.PI/2+Math.PI/4;tube(hub,[0,0.02,0],[Math.cos(a)*0.62,0.02,Math.sin(a)*0.62],0.11,0.05,8,GR,CHROME,true);}
  tube(hub,[0,-0.06,0],[0,0.1,0],0.34,0.34,20,LG,CHROME,true);
  const blade=vmesh(),bX=(r0,r1,c0,c1,th,col,mat)=>{const P=[[r0,-th,-c0/2],[r1,-th,-c1/2],[r1,th,-c1/2],[r0,th,-c0/2],[r0,-th,c0/2],[r1,-th,c1/2],[r1,th,c1/2],[r0,th,c0/2]];
      for(const [f,n] of [[[0,1,2,3],[0,0,-1]],[[5,4,7,6],[0,0,1]],[[3,2,6,7],[0,1,0]],[[4,5,1,0],[0,-1,0]],[[1,5,6,2],[1,0,0]],[[4,0,3,7],[-1,0,0]]]){const ix=f.map(i=>V(blade,P[i],n,col,mat));blade.i.push(ix[0],ix[1],ix[2],ix[0],ix[2],ix[3]);}};
  tube(blade,[0.3,0,0],[0.95,0,0],0.07,0.055,10,LG,CHROME,true);// the sleeve
  box(blade,[0.45,0,0.17],[0.04,0.025,0.1],GR,CHROME);tube(blade,[0.45,-0.01,0.25],[0.45,-0.34,0.25],0.014,0.014,6,GR,CHROME,true);// pitch horn and link
  bX(0.9,5.1,0.4,0.38,0.035,[0.2,0.21,0.23],PAINT);[[5.1,5.3,WH],[5.3,5.5,BK],[5.5,5.7,WH],[5.7,5.95,BK]].forEach(([a0,a1,c],i)=>bX(a0,a1,0.38-i*0.01,0.37-(i+1)*0.01-(a1>5.9?0.06:0),0.03,c,PAINT));
  const swash=vmesh();tube(swash,[0,-0.03,0],[0,0.0,0],0.3,0.3,20,GR,CHROME,true);tube(swash,[0,0.01,0],[0,0.04,0],0.27,0.27,20,LG,CHROME,true);
  const disc=vmesh();surf(disc,(r,a)=>[Math.cos(a)*r,0.02,Math.sin(a)*r],[0.7,5.95],range(0,Math.PI*2,48),()=>[[0.3,0.31,0.33],12]);
  const fanB=vmesh();{const r0=0.17,r1=0.57;quad(fanB,[r0,-0.05,0],[r1,-0.045,0],[r1,0.045,0],[r0,0.05,0],[0,0,1],[0.5,0.51,0.53],CHROME);quad(fanB,[r0,0.05,0],[r1,0.045,0],[r1,-0.045,0],[r0,-0.05,0],[0,0,-1],[0.5,0.51,0.53],CHROME);}
  // the right-hand sliding door: a skin-following panel with its window, frame and the insignia; it slides back along the rails
  const door=vmesh();{const DZ=(d,h)=>sideZ(d,h)+0.015,DF=(d,h)=>[X(d),Y(h),DZ(d,h)],W2=WIN[1];
    surf(door,DF,range(DOOR[0],DOOR[1],32),range(DOOR[2],DOOR[3],28),(d,h)=>rr(d,h,...W2)?[GLs,GLASS]:rr(d,h,W2[0]-0.035,W2[1]+0.035,W2[2]-0.035,W2[3]+0.035,W2[4]+0.03)?[BK,PAINT]:Math.abs(d-DOOR[0])<0.03||Math.abs(d-DOOR[1])<0.03?[ORd,PAINT]:[OR,PAINT],{ev:1e-3});
    surf(door,(d,h)=>[X(d),Y(h),DZ(d,h)-0.03],range(DOOR[0],DOOR[1],8),range(DOOR[2],DOOR[3],8),(d,h)=>rr(d,h,...W2)?null:[INT,INTM],{ev:1e-3,flip:true});
    box(door,[X(3.3),Y(1.55),DZ(3.3,1.55)+0.03],[0.09,0.02,0.02],GR,CHROME);// the handle
    insignia(door,3.95,1.18,1,(d,h)=>DZ(d,h)-0.011+0.003);}
  const beacon=vmesh();ball(beacon,[X(11.0),Y(3.85),0],0.065,[1.4,1,1],RED,4,8);ball(beacon,[X(3.2),Y(0.33),0],0.06,[1.4,1,1],RED,4,8);
  const nav=vmesh();ball(nav,[X(9.5),Y(2.08),1.5],0.04,[1,1,1],[0.1,1,0.2],4,6);ball(nav,[X(9.5),Y(2.08),-1.5],0.04,[1,1,1],[1,0.1,0.05],4,6);ball(nav,[X(11.47),Y(1.55),0],0.04,[1,1,1],[1,1,0.95],4,6);
  const list=[['body',body],['glass',glass],['pilot',pilot],['hub',hub],['blade',blade],['swash',swash],['disc',disc],['fanB',fanB],['noseFork',noseFork],['noseWheel',noseWheel],['mainWheel',mainWheel],['door',door],['beacon',beacon],['nav',nav]];list.forEach(([n],i)=>{HELI_PARTS[n]={i};});return list.map(l=>l[1]);}

// ===================================================================
// flying it: rotor thrust along the mast, drag, attitude held by the stick (Assist: levels and stops over the ground when let go,
// the collective's middle holds the height), turns coordinated in forward flight, three wheels on the ground
// ===================================================================
const Heli={
  spawn(pl,at){pl.an=null;const c=Cam.target,as=at&&at.n?Air.spawnSpot([at.x,0,at.z]):Air.spawnSpot(c);if(!as){UI.toast('The helicopter starts from an airfield: build an airstrip first (Build → Airstrip)');return false;}
    // on the strip, to one side of its first stretch (flat ground), nose along the runway
    const sx=-Math.sin(as.h),sz=Math.cos(as.h),x=as.x+Math.cos(as.h)*60+sx*8,z=as.z+Math.sin(as.h)*60+sz*8;
    pl.st={p:[x,0,z],v:[0,0,0],q:Q.axis([0,1,0],-as.h),w:[0,0,0]};pl.ctl={thr:0,pitch:0,roll:0,yaw:0,brake:1};pl.parkBrake=true;pl.gear=1;pl.gearPos=1;pl.flaps=0;pl.flapPos=0;pl.bridges=0;pl.prevP=null;pl.crashed=false;pl.on=true;pl.prop=0;pl.fanA=0;pl.rot=0;
    pl.settle();UI.toast(`At airstrip ${as.s.n}: the rotors spin up. Slide the collective (left) above the middle to lift off; the stick tilts it, the rudder buttons turn it`);return true;},
  step(pl,dt){const s=pl.st,c=pl.ctl,K=PLH,m=K.m,g=9.81;if(pl.crashed){s.v=s.v.map(v=>v*Math.max(0,1-dt*2));s.w=s.w.map(v=>v*Math.max(0,1-dt*3));return;}
    pl.rot=Math.min(1,(pl.rot||0)+dt/6);const rho=1.225*Math.exp(-s.p[1]/9000),qi=Q.inv(s.q),U=Q.rot(s.q,[0,1,0]),Fv=Q.rot(s.q,[1,0,0]),Zv=Q.rot(s.q,[0,0,1]);
    const gy=pl.groundAt(s.p[0],s.p[2]),agl=s.p[1]-K.cg-gy,vh=Math.hypot(s.v[0],s.v[2]),vb=Q.rot(qi,s.v),V=Math.hypot(...s.v);
    const eff=(1+0.1*clamp((vh-4)/14,0,1))*(1+0.12*clamp(1-agl/10,0,1))*(rho/1.225),Tmax=1.75*m*g*eff*pl.rot*pl.rot;
    // the collective: with Assist the middle holds the height (a dead band), up climbs and down sinks, up to 9 m/s; without, it is the thrust
    let T;if(pl.easy){let u=(c.thr-0.5)*2;u=Math.abs(u)<0.06?0:(u-Math.sign(u)*0.06)/0.94;const vt=Math.max(u*9,-(0.6+Math.max(0,agl)*0.45));/* near the ground the sink slows to a gentle touchdown */T=c.thr<0.04?0:m*(g+2.4*(vt-s.v[1]))/Math.max(0.5,U[1]);}else T=m*g*(0.1+1.7*c.thr)*eff*pl.rot*pl.rot;
    T=clamp(T,0,Tmax);pl.T=T;
    // drag in the body frame: small along it, large up and down (the rotor disc), the side in between
    const q=0.5*rho,Db=[-q*4.4*Math.abs(vb[0])*vb[0],-q*24*Math.abs(vb[1])*vb[1],-q*9*Math.abs(vb[2])*vb[2]],Dw=Q.rot(s.q,Db);
    let Fw=[U[0]*T+Dw[0],U[1]*T+Dw[1]-m*g,U[2]*T+Dw[2]];
    // attitude: the stick sets the tilt (Assist) or the rate; the rudder the turn rate; in forward flight it turns where it banks and weathercocks
    const pitch=Math.asin(clamp(Fv[1],-1,1)),bank=Math.atan2(-Zv[1],U[1]);let wt;
    if(pl.easy){let pt=c.pitch*0.42,bt=c.roll*0.5;const hf=[Fv[0],0,Fv[2]],hl=Math.hypot(hf[0],hf[2])||1,vf=(s.v[0]*hf[0]+s.v[2]*hf[2])/hl,vr=(-s.v[0]*hf[2]+s.v[2]*hf[0])/hl;
      if(Math.abs(c.pitch)<0.05)pt=clamp(vf*(vh<22?0.045:0.012),-0.3,0.3);if(Math.abs(c.roll)<0.05)bt=clamp(-vr*0.05,-0.3,0.3);/* let go: it levels and stops over the ground */
      wt=[clamp((bt-bank)*2.6,-1.2,1.2),0,clamp((pt-pitch)*2.4,-1,1)];}
    else wt=[c.roll*1.1,0,c.pitch*0.8];
    wt[1]=-c.yaw*0.9+(V>12&&!pl.onG?-g*Math.tan(clamp(bank,-1,1))/Math.max(V,12)*0.95:0)+(V>12?-clamp(vb[2]/V,-0.5,0.5)*1.2:0);
    // the ground: three wheels, springs and dampers, brakes, a castering nose wheel
    let M=[0,0,0],onG=0;const Fg=[0,0,0];
    K.wheels.forEach((cp,i)=>{const wp=Q.rot(s.q,cp),P=[s.p[0]+wp[0],s.p[1]+wp[1],s.p[2]+wp[2]],gy2=pl.groundAt(P[0],P[2]),pen=gy2-P[1];if(pen<=0)return;onG++;
      if(pl.water(P[0],P[2])){pl.crash('In the water: on wheels it sinks');return;}
      const wv=Q.rot(s.q,s.w),rv=[wv[1]*wp[2]-wv[2]*wp[1],wv[2]*wp[0]-wv[0]*wp[2],wv[0]*wp[1]-wv[1]*wp[0]],pv=[s.v[0]+rv[0],s.v[1]+rv[1],s.v[2]+rv[2]];
      if(-pv[1]>4.2){pl.crash('Hard landing');return;}if(Math.abs(bank)>0.45||Math.abs(pitch)>0.5){pl.crash('Rotor strike: it touched down tilted');return;}
      const N=Math.max(0,90000*pen-11000*pv[1]);let hx=[Fv[0],0,Fv[2]],hl=Math.hypot(hx[0],hx[2])||1;hx=[hx[0]/hl,0,hx[2]/hl];const hz=[-hx[2],0,hx[0]];
      const vr=pv[0]*hx[0]+pv[2]*hx[2],vs=pv[0]*hz[0]+pv[2]*hz[2],br=Math.max(c.brake,pl.parkBrake?1:0),mu=i===0?0.03:0.03+br*0.7,Fr=-Math.sign(vr)*Math.min(Math.abs(vr)*9000,mu*N),Fs=-clamp(vs*(i===0?600:9000),-0.8*N,0.8*N);
      const f=[hx[0]*Fr+hz[0]*Fs,N,hx[2]*Fr+hz[2]*Fs];Fg[0]+=f[0];Fg[1]+=f[1];Fg[2]+=f[2];const fb=Q.rot(qi,f);M=[M[0]+cp[1]*fb[2]-cp[2]*fb[1],M[1]+cp[2]*fb[0]-cp[0]*fb[2],M[2]+cp[0]*fb[1]-cp[1]*fb[0]];});
    if(pl.crashed)return;
    // integrate: the rotor flies the attitude (rates ease toward the wanted ones); on the ground with little lift the wheels hold it
    const air=!onG||T>0.75*m*g;for(let k=0;k<3;k++){s.v[k]+=(Fw[k]+Fg[k])/m*dt;s.p[k]+=s.v[k]*dt;}
    for(let k=0;k<3;k++){s.w[k]+=M[k]/K.I[k]*dt;if(air||k===1)s.w[k]+=(wt[k]-s.w[k])*Math.min(1,dt*(k===1?2.5:3.5));}if(onG)s.w=s.w.map(v=>v*(1-dt*2));
    const wq=[0,s.w[0],s.w[1],s.w[2]],dq=Q.mul(s.q,wq);s.q=Q.norm(s.q.map((v,k)=>v+0.5*dq[k]*dt));
    // never through the ground with the body
    const gb=pl.groundAt(s.p[0],s.p[2]);if(s.p[1]<gb+0.55){if(V>9)pl.crash('Crashed into the ground');s.p[1]=gb+0.55;if(s.v[1]<0)s.v[1]=0;}
    const W=App.T.W;if(s.p[0]<-2000||s.p[2]<-2000||s.p[0]>W+2000||s.p[2]>W+2000){s.v=s.v.map(v=>-v);UI.toast('The edge of the world: turned around');}
    if(s.p[1]>gb+4000){s.p[1]=gb+4000;if(s.v[1]>0)s.v[1]=0;}
    if(onG&&!pl.onG)pl.touchV=Math.max(0,-s.v[1]);pl.V=V;pl.onG=onG;pl.onW=0;pl.stall=false;pl.alpha=0;
    // what the linkages show: collective from the thrust, cyclic from the stick plus what the autopilot adds, pedals the same; eased
    const A=pl.an||(pl.an={coll:0,lon:0,lat:0,ped:0,sw:0,wa:0,wn:0,door:1}),ek=Math.min(1,dt*5),err=k=>air?(wt[k]-s.w[k]):0;
    A.coll+=(T/(m*g)-A.coll)*ek;A.lon+=(clamp(c.pitch*0.7+err(2)*0.6,-1,1)-A.lon)*ek;A.lat+=(clamp(c.roll*0.7+err(0)*0.6,-1,1)-A.lat)*ek;A.ped+=(clamp(c.yaw*0.8-err(1)*0.6,-1,1)-A.ped)*ek;
    // wheels: roll with the ground speed, the nose wheels castor toward where they go
    {const hf=[Fv[0],0,Fv[2]],hl=Math.hypot(hf[0],hf[2])||1,vf=(s.v[0]*hf[0]+s.v[2]*hf[2])/hl,vs=(-s.v[0]*hf[2]+s.v[2]*hf[0])/hl;if(onG){A.wa+=vf*dt/0.29;A.wn+=vf*dt/0.22;if(Math.hypot(vf,vs)>0.3)A.sw+=(clamp(Math.atan2(vs,Math.abs(vf))*Math.sign(vf||1),-1,1)-A.sw)*Math.min(1,dt*4);}}
    // the right-hand door slides open once it stands on the ground with the collective down (and for the winch, step 3)
    const want=(onG&&V<0.6&&c.thr<0.45)||pl.winchOpen?1:0;A.door+=clamp(want-A.door,-dt/2.2,dt/2.2);},
  spin(pl,dt){pl.prop=(pl.prop+dt*(pl.rot||0)*5.8*6.283)%6.283;pl.fanA=((pl.fanA||0)+dt*(pl.rot||0)*3.1*6.283)%6.283;},
  rpm(pl){return pl.crashed?0:600+(pl.rot||0)*900+(pl.T||0)/PLH.m*40;},
  draw(pl,p){if(!R.heliMesh)R.heliMesh=heliMeshes().map(m=>R.uploadVeh(m));const M=R.heliMesh,PP=HELI_PARTS,dm=(n,mat)=>{const m=M[PP[n].i];if(!m)return;gl.uniformMatrix4fv(p.u('uModel'),false,mat);gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,0);Stats.draws++;Stats.tris+=m.count/3;};
    const K=PLH,A=pl.an||{coll:0,lon:0,lat:0,ped:0,sw:0,wa:0,wn:0,door:1},ro=pl.rot||0,ax=(v,a)=>Q.axis(v,a),mq=(...q)=>q.reduce((a,b)=>Q.mul(a,b));
    gl.uniform1f(p.u('uDist'),0);dm('body',pl.mat());if(pl.cam!=='cockpit'){dm('pilot',pl.mat());dm('glass',pl.mat());}/* from the pilot's seat the glass is left out (at that angle it would look nearly opaque) */
    // the rotor: hub, then four blades — feathering (collective + cyclic, once per turn) about the span, flapping (coning with the lift,
    // drooping at rest, the disc tilting with the cyclic) about the hub; the swashplate rises with the collective and tilts with the cyclic
    dm('hub',pl.mat(K.hub,ax([0,1,0],-pl.prop)));
    const th0=0.02+0.1*clamp(A.coll,0,1.8),cone=-0.06*(1-ro*ro)+0.045*clamp(A.coll,0,1.8)*ro*ro;
    for(let k=0;k<4;k++){const ps=pl.prop+k*Math.PI/2,c=Math.cos(ps),sn=Math.sin(ps),th=th0-A.lon*0.07*sn+A.lat*0.07*c,be=cone+(A.lon*0.045*c-A.lat*0.045*sn)*ro;
      dm('blade',pl.mat(K.hub,mq(ax([0,1,0],-ps),ax([0,0,1],be),ax([1,0,0],-th))));}
    dm('swash',pl.mat([K.hub[0],K.hub[1]-0.36+A.coll*0.04,K.hub[2]],mq(ax([0,0,1],A.lon*0.08),ax([1,0,0],-A.lat*0.08))));
    // the fenestron's ten blades turn and change pitch with the pedals
    for(let k=0;k<10;k++)dm('fanB',pl.mat(K.fan,mq(ax([0,0,1],(pl.fanA||0)+k*0.6283),ax([1,0,0],0.25+A.ped*0.35))));
    // wheels: the nose fork castors, the wheels roll
    {const pv=[2.88,-0.79,0],sw=ax([0,1,0],-A.sw),ao=Q.rot(sw,[0.06,-0.23,0]);dm('noseFork',pl.mat(pv,sw));dm('noseWheel',pl.mat([pv[0]+ao[0],pv[1]+ao[1],pv[2]+ao[2]],mq(sw,ax([0,0,1],-A.wn))));
      for(const sd of [-1,1])dm('mainWheel',pl.mat([-0.95,-0.96,sd*1.14],ax([0,0,1],-A.wa)));}
    // the sliding door: out a little, then back along its rails
    {const o=clamp(A.door*4,0,1),sl=clamp((A.door-0.2)/0.8,0,1);dm('door',pl.mat([-1.28*sl,0,0.06*o]));}
    // lights: steady position lights, the red anti-collision beacons flash
    dm('nav',pl.mat());const on=((App.time||0)*1.1)%1<0.12;gl.uniform3f(p.u('uLamp'),on?2:0.04,on?2:0.04,on?2:0.04);dm('beacon',pl.mat());gl.uniform3f(p.u('uLamp'),1,1,1);
    const da=clamp((ro-0.35)/0.65,0,1)*0.3;if(da>0.01){gl.uniform2f(p.u('uOcc'),da,0);dm('disc',pl.mat(K.hub));gl.uniform2f(p.u('uOcc'),0,0);}}};
