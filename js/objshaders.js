'use strict';
// ===== objshaders.js — shaders for the instanced low-poly objects and the building kit
const VS_OBJ=GLSL_HEAD+GLSL_BASE+`
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNrm;layout(location=2) in vec3 aCol;layout(location=3) in float aMat;
layout(location=4) in vec4 iA;layout(location=5) in vec4 iB;
uniform int uPass;uniform int uKind;
out vec3 vW;out vec3 vN;out vec3 vC;flat out float vMat;flat out float vHash;flat out float vTint;
void main(){vec3 p=aPos,n=aNrm;int m=int(aMat+.5);float t=uCamPos.w,hs=iB.z;
  if(m==1&&(uKind==1||uKind==4)){float bare=clamp(uSeason.w*1.3-.15+(hs-.5)*.2,0.,1.);p*=1.-bare*.999;}
  if(m==1&&uKind==2){p*=1.-clamp(uSeason.w*1.2-.3,0.,1.)*.4;}
  if(m==3){p*=smoothstep(.35,.75,uSeason.x)*step(hs,.45);}
  if(m==11){float a=t*iB.w+hs*6.283,c=cos(a),s=sin(a);p.yz=vec2(c*p.y-s*p.z,s*p.y+c*p.z);n.yz=vec2(c*n.y-s*n.z,s*n.y+c*n.z);}
  if(m==13){float f=sin(t*(9.+hs*4.)+hs*40.)*.9*iB.w;p.y+=f*abs(p.z);}
  if(uKind==13){p.y+=abs(sin(t*9.+hs*20.))*.1*step(.01,iB.w);}
  if(uKind==15&&iB.w>.01){float sw=sin(t*iB.w+hs*40.),rl=sw*(.05+iB.y*.22),cr=cos(rl),sr=sin(rl);if(p.y<.5)p.z+=sign(p.z)*max(0.,sw*sign(p.z))*.13*(1.-p.y*2.);
    p.yz=vec2(cr*p.y-sr*p.z,sr*p.y+cr*p.z);n.yz=vec2(cr*n.y-sr*n.z,sr*n.y+cr*n.z);}
  if(uKind>=17&&uKind<=19){vec2 pv=uKind==17?vec2(1.,1.25):uKind==18?vec2(.86,1.5):vec2(.5,.86);float lt=uKind==17?.66:uKind==18?.92:.5;
    if(p.x>pv.x&&p.y>lt){float a=-iB.y*(uKind==18?1.2:uKind==17?.9:.75)+sin(t*1.7+hs*20.)*.04*iB.y;vec2 q=p.xy-pv;float c=cos(a),s=sin(a);p.xy=pv+vec2(c*q.x-s*q.y,s*q.x+c*q.y);n.xy=vec2(c*n.x-s*n.y,s*n.x+c*n.y);}
    if(iB.w>.01&&p.y<lt){float ph=t*iB.w+hs*30.+(p.x>0.?0.:3.1416)+(p.z>0.?3.1416:0.);p.x+=sin(ph)*(lt-p.y)*.42;}}
  if(uKind==21){float a=iB.y*1.45,c=cos(a),s=sin(a);p.xy=vec2(c*p.x-s*p.y,s*p.x+c*p.y);n.xy=vec2(c*n.x-s*n.y,s*n.x+c*n.y);}
  if(uKind==16){float a=(iB.y-.5)*2.,c=cos(a),s=sin(a);p.xy=vec2(c*p.x-s*p.y,s*p.x+c*p.y);n.xy=vec2(c*n.x-s*n.y,s*n.x+c*n.y);}
  if(uKind==14){p.y+=sin(t*1.6+hs*30.)*.08;float r=sin(t*1.2+hs*11.)*.05;p.yz=vec2(cos(r)*p.y-sin(r)*p.z,sin(r)*p.y+cos(r)*p.z);}
  if(uKind==22){int part=m/10;float pose=floor(iB.y*10.+.5),ph=t*iB.w+hs*40.,sw=sin(ph),mv=step(.01,iB.w);
    if(part==3||part==4){float sd=part==3?1.:-1.,ka=pose==1.?-1.5:pose==6.?-1.45:-.7*max(0.,-sw*sd)*mv,ha=pose==1.?.12:pose==6.?1.45:sw*.48*sd*mv;
      if(p.y<.53){vec2 q=p.xy-vec2(0.,.52);float c=cos(ka),s=sin(ka);p.xy=vec2(0.,.52)+vec2(c*q.x-s*q.y,s*q.x+c*q.y);n.xy=vec2(c*n.x-s*n.y,s*n.x+c*n.y);}
      vec2 q=p.xy-vec2(0.,.92);float c=cos(ha),s=sin(ha);p.xy=vec2(0.,.92)+vec2(c*q.x-s*q.y,s*q.x+c*q.y);n.xy=vec2(c*n.x-s*n.y,s*n.x+c*n.y);}
    if(part==5||part==6){float sd=part==5?1.:-1.,a=-sw*.42*sd*mv;
      if(pose==1.)a=.85+sin(t*3.1+hs*9.+sd)*.25;else if(pose==2.)a=.75+sin(t*2.2+hs*7.)*.45;else if(pose==3.)a=part==6?1.0+sin(t*.8+hs)*.08:.15;
      else if(pose==4.)a=.5+sin(t*3.+hs*5.)*.3*sd;else if(pose==5.)a=part==6?.2+.55*max(0.,sin(t*1.5+hs*11.)):.06;else if(pose==6.)a=.35;else if(pose==8.)a=part==6?.8+.8*abs(sin(t*4.4+hs*9.)):.5;else if(pose==9.)a=part==6?2.7+sin(t*5.+hs)*.12:.12;else if(pose==7.)a=-sw*.9*sd*mv;
      vec2 q=p.xy-vec2(0.,1.4);float c=cos(a),s=sin(a);p.xy=vec2(0.,1.4)+vec2(c*q.x-s*q.y,s*q.x+c*q.y);n.xy=vec2(c*n.x-s*n.y,s*n.x+c*n.y);}
    float lean=pose==1.?-.42:pose==2.?-.28:pose==3.?-.12:pose==4.?-.22:pose==7.?-.15:0.;if(lean!=0.&&part!=3&&part!=4&&p.y>.86){vec2 q=p.xy-vec2(0.,.92);float c=cos(lean),s=sin(lean);p.xy=vec2(0.,.92)+vec2(c*q.x-s*q.y,s*q.x+c*q.y);n.xy=vec2(c*n.x-s*n.y,s*n.x+c*n.y);}
    if(pose==1.)p.y-=.4;else if(pose==6.)p.y-=.44;else if(pose==7.)p.y+=abs(sin(ph))*.16*mv;else p.y+=abs(sw)*.025*mv;}
  vec3 sp=p*iA.w;
  if((m==1||m==3)&&uKind<=4){float sway=sp.y*.012*uWind.y*(sin(t*1.7+hs*13.)+.6*sin(t*2.9+hs*7.));sp.xz+=normalize(uWind.xz+1e-4)*sway;}
  float c=cos(iB.x),s=sin(iB.x);sp=vec3(c*sp.x-s*sp.z,sp.y,s*sp.x+c*sp.z);n=vec3(c*n.x-s*n.z,n.y,s*n.x+c*n.z);
  vec3 W=iA.xyz+sp;vW=W;vN=n;vC=aCol;vMat=aMat;vHash=hs;vTint=iB.y;
  gl_Position=(uPass==1?uLightVP:uViewProj)*vec4(W,1.);}`;
// detailed buildings from the building kit: same placement as objects (iA, iB), plus face uv/half-size and seed for the procedural materials
const KIT_TYPES=['cottage','shop','farmhouse','tavern','church','culvert','culvertPipe','station','stationTown','plat0','plat1','plat2','plat3','plat4','plat5','platEa','platEb','fbT1','fbT2','shelter','sawmillA','sawmillB','farmHouse','farmBarn','farmShed','farmYard','grainTower','grainArm'],KIT_OF=['cottage','shop','farmhouse','church','tavern','cottage'];
const KIT_WORK={cottage:[[-4.15,-0.4,1,Math.PI],[-5.6,2.3,2,-Math.PI/2],[2.2,-3.95,1,Math.PI/2],[-2.2,-3.95,3,Math.PI/2]],farmhouse:[[3.88,-9.3,1,0],[5.0,-5.8,2,-Math.PI/2],[8.05,-8.0,3,Math.PI]],
  shop:[[5.3,-2.0,1,0],[6.9,2.1,3,-Math.PI/2]],tavern:[[3.4,-5.0,3,Math.PI/2]]};
const KIT_CHIM={cottage:[-3.88,8.7,0.93],shop:[-4.55,11.2,0.15],farmhouse:[1.6,10.4,0.33],tavern:[-5.6,12.3,1.1]},KIT_GATE={cottage:0,shop:-0.4,farmhouse:0.3,tavern:0,church:0};
const VS_KIT=GLSL_HEAD+GLSL_BASE+`
layout(location=0) in vec3 aPos;layout(location=1) in vec4 aNrm;layout(location=2) in vec3 aCol;layout(location=3) in float aMat;layout(location=4) in vec4 iA;layout(location=5) in vec4 iB;layout(location=6) in vec2 aUV;layout(location=8) in vec2 aHSq;layout(location=7) in vec2 aS;layout(location=9) in float aPd;
invariant gl_Position;uniform int uPass;uniform float uBackSkip;out vec3 vW;out vec3 vN;out vec2 vUV;flat out vec2 vHS;flat out vec3 vC;flat out int vM;flat out float vSeed;flat out float vAux;flat out float vHash;out float vY;flat out float vFade;
void main(){float bare=0.;vFade=iB.w;if(int(aMat+.5)==1&&aS.y>.8)bare=clamp(uSeason.w*1.3-.15+(fract(aS.x*7.)-.5)*.2,0.,1.);else if(int(aMat+.5)==1&&aS.y>.5)bare=clamp(uSeason.w*1.5+uSeason.z*.35-.1,0.,1.);
  vec3 p=aPos*mix(1.,.001,bare)*iA.w;float c=cos(iB.x),s=sin(iB.x);p=vec3(c*p.x-s*p.z,p.y,s*p.x+c*p.z);vN=vec3(c*aNrm.x-s*aNrm.z,aNrm.y,s*aNrm.x+c*aNrm.z);
  vW=iA.xyz+p;vUV=aUV;vHS=aHSq*16.;vC=aCol;vM=int(aMat+.5);vSeed=aS.x;vAux=aS.y;vHash=iB.z;vY=aPos.y;gl_Position=(uPass==1?uLightVP:uViewProj)*vec4(vW,1.);
  // the far sides of closed blocks (flag in aNrm.w) are never seen: their triangles are moved out of view before any pixel work.
  // The test uses only values that are the same for every corner of the face (its normal and plane constant aPd, the instance, the
  // camera), so a face goes or stays as a whole; it must be 10 cm behind the face's plane, which covers the rounding of the stored values.
  if(uPass!=1&&uBackSkip>.5&&aNrm.w>.5&&dot(vN,uCamPos.xyz-iA.xyz)-aPd*iA.w/256.<-.1*iA.w)gl_Position=vec4(2.,2.,2.,1.);}`;
const FS_KIT=(fade)=>GLSL_HEAD+GLSL_COMMON+`
flat in float vFade;
in vec3 vW;in vec3 vN;in vec2 vUV;flat in vec2 vHS;flat in vec3 vC;flat in int vM;flat in float vSeed;flat in float vAux;flat in float vHash;in float vY;uniform int uPass;uniform float uFlat;uniform vec4 uGhost;`+FS_OUT+`
#define uL uSunDir.xyz
const float uMoss=1.;
`+KIT.GLSL.NOISE+KIT.GLSL.MATS.replace('float y=vW.y;','float y=vY;')+`
void main(){`+(fade?`/* detail levels fade into each other: the finer copy keeps the pixels below u of a screen-space noise, the coarser one the rest */
  {float u=abs(vFade)-1.,d=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));if(vFade>0.?d>=u:d<u)discard;}`:'')+`if(uPass>=1){o=vec4(0);return;}
  vec3 Ng=normalize(vN),V=normalize(uCamPos.xyz-vW);if(dot(Ng,V)<0.)Ng=-Ng;gN=Ng;
  if(uFlat>.5){o=vec4(fogc(L(vC)*(uSunCol.rgb*.5+ambient(Ng)),vW),1.);return;}// benchmark test only: the cost of the building materials
  int m=vM;vec2 q=vUV*vHS;if(m==9)q=vW.xz;if(m==23){q=vec2(dot(vW.xz,normalize(vec2(-Ng.z,Ng.x)+1e-5)),vW.y);m=21;}if(m==24)q=abs(Ng.y)>.7?vW.xz*.62:vec2(dot(vW.xz,normalize(vec2(-Ng.z,Ng.x)+1e-5)),vW.y);vec3 Nd=Ng;float hc=0.;
  float fade=smoothstep(140.,60.,length(uCamPos.xyz-vW));
  if(m>=4&&m!=13&&fade>0.){vec3 dp1=dFdx(vW),dp2=dFdy(vW);vec2 du1=dFdx(q),du2=dFdy(q);vec3 p2=cross(dp2,Ng),p1=cross(Ng,dp1);vec3 T=p2*du1.x+p1*du2.x,Bv=p2*du1.y+p1*du2.y;
    float iv=inversesqrt(max(max(dot(T,T),dot(Bv,Bv)),1e-12));T*=iv;Bv*=iv;float ep=.0025;hc=hgt(m,q);float hx=(hgt(m,q+vec2(ep,0))-hc)/ep,hy=(hgt(m,q+vec2(0,ep))-hc)/ep;
    Nd=normalize(Ng-(T*hx+Bv*hy)*1.2*fade);}
  vec3 alb=albedo(m,q,vC);alb=weather(m,alb,Nd,q);if(m==5)alb*=mix(vec3(1.),vec3(1.05,.98,.88),fract(vHash*7.3));
  vec3 A=L(clamp(alb,0.,1.));
  if(m==1&&vAux>.8){float h=fract(vSeed*13.7+vHash*3.1);vec3 au=h<.3?vec3(.95,.55,.15):h<.6?vec3(.85,.3,.12):h<.85?vec3(.95,.78,.25):vec3(.6,.55,.2);A=mix(A,L(au)*.8,uSeason.z*.85);A*=mix(vec3(1.),vec3(1.08,1.12,.82),uSeason.x*.6);}
  if(m==13||(m==1&&vAux>.5&&vAux<.8))A*=mix(vec3(1.),vec3(1.15,.95,.55),clamp(uSeason.z*.5+uSeason.w*.8,0.,1.));
  float up=smoothstep(.45,.85,Ng.y);A=mix(A,snowCol(Ng),clamp(uWx.w*up*(m==1||m==13?.6:1.),0.,1.));
  float sh=shadowAt(vW,Ng)*cloudSh(vW);vec3 col;
  if(m==1||m==13){float w=clamp(dot(Nd,uL)*.6+.42,0.,1.);if(m==13)A*=mix(.5,1.2,vUV.y*.5+.5);float l=(smoothstep(.3,.6,w)*.75+w*.25)*mix(.3,1.,sh);col=A*(uSunCol.rgb*l+ambient(Nd));}
  else if(m==2){vec2 u=vUV;vec3 inn=mix(vec3(1.,.55,.22),vec3(1.,.84,.52),smoothstep(-1.,.7,u.y));float cur=smoothstep(.48,.6,abs(u.x));inn=mix(inn,vec3(.7,.22,.16)*(.75+.25*sin(u.x*38.)),cur*.9);
    inn=mix(inn,vec3(.5,.3,.18),smoothstep(-.55,-.85,u.y)*.6);col=L(inn)*(.35+2.6*uMisc.x)+ambient(Ng)*(smoothstep(.1,1.,u.y)*.25)*(1.-uMisc.x);col*=1.-smoothstep(.75,1.,max(abs(u.x),abs(u.y)))*.4;}
  else if(m==3)col=L(vC)*(.45+3.*uMisc.x);
  else if(m==22){vec3 sg=L(stainedC(q)),Rf=reflect(-V,Ng);col=sg*(uSunCol.rgb*.1*max(dot(Ng,uL),0.)+ambient(Ng)*.4+.04+2.6*uMisc.x)+L(mix(uSkyH.rgb,uSkyZ.rgb,clamp(Rf.y*1.5,0.,1.)))*.12*(1.-uMisc.x);}
  else{float nl=dot(Nd,uL),ramp=smoothstep(-.03,.16,nl)*.6+smoothstep(.38,.6,nl)*.4,lit=ramp*smoothstep(.25,.75,sh)*smoothstep(-.2,.05,dot(Ng,uL));
    float cav=(m==4||m==18||m==20||m==21||m==24||m==8||m==6||m==16||m==19)?mix(.72,1.,smoothstep(-.002,.01,hc+.002)):1.;col=A*(uSunCol.rgb*lit+ambient(Nd)*cav);}
  if(uGhost.a>0.){/* station ghost: the lit building tinted green (red when it cannot stand), see-through, brighter at the rim */float rim=pow(1.-max(dot(Ng,V),0.),2.);vec3 gc=mix(col*.6,uGhost.rgb,.5)+uGhost.rgb*.22*rim;o=vec4(gc*uGhost.a,uGhost.a);return;}
  o=vec4(fogc(col,vW),1.);}`;
const FS_OBJ=GLSL_HEAD+GLSL_COMMON+`
in vec3 vW;in vec3 vN;in vec3 vC;flat in float vMat;flat in float vHash;flat in float vTint;uniform int uPass;uniform int uKind;`+FS_OUT+`
vec3 pick4(float h,vec3 a,vec3 b,vec3 c,vec3 d){return h<.25?a:h<.5?b:h<.75?c:d;}
void main(){if(uPass==1){o=vec4(0);return;}
  vec3 N=normalize(vN);if(!gl_FrontFacing)N=-N;int m=int(vMat+.5);vec4 S=uSeason;float h=vHash;vec3 c=L(vC);vec3 em=vec3(0);float snowy=1.;
  if(m==1){vec3 f;
    if(uKind==0||uKind==3)f=mix(vec3(.22,.48,.30),vec3(.30,.54,.27),h)*(1.-S.w*.12);
    else if(uKind==4)f=vec3(.66,.86,.36)*S.x+vec3(.52,.77,.30)*S.y+mix(vec3(.98,.82,.28),vec3(.95,.66,.22),h)*S.z+vec3(.55,.5,.3)*S.w;
    else{vec3 au=pick4(h,vec3(.95,.56,.18),vec3(.88,.30,.18),vec3(.97,.78,.26),vec3(.62,.62,.25));
      f=mix(vec3(.58,.82,.34),vec3(.46,.76,.30),h)*S.x+mix(vec3(.38,.66,.25),vec3(.30,.58,.22),h)*S.y+au*S.z+vec3(.5,.45,.3)*S.w;if(uKind==2)f*=.85;}
    c=L(f)*vC*(.9+vTint*.2);}
  else if(m==2)c=L(vC)*(.9+vTint*.15);
  else if(m==3)c=L(h<.2?vec3(.99,.80,.88):vec3(.99,.97,.95));
  else if(m==4){float k=fract(h*7.13);c=L(k<.16?vec3(.97,.91,.79):k<.30?vec3(.96,.96,.93):k<.44?vec3(.99,.88,.62):k<.58?vec3(.72,.84,.92):k<.72?vec3(.96,.72,.60):k<.86?vec3(.76,.89,.77):vec3(.72,.38,.30));snowy=.2;}
  else if(m==5){float k=fract(h*3.71);c=L(k<.3?vec3(.82,.38,.25):k<.5?vec3(.35,.40,.48):k<.7?vec3(.58,.38,.27):k<.85?vec3(.74,.24,.19):vec3(.27,.52,.54));}
  else if(m==6){float on=step(fract(vC.r*13.7+h*7.3),uMisc.x);c=L(vec3(.24,.30,.38));em=L(vec3(1.,.78,.42))*on*2.6;snowy=0.;}
  else if(m==7){c=L(mix(vec3(.45,.28,.18),vec3(.25,.42,.35),step(.6,fract(h*5.3))));snowy=0.;}
  else if(m==8)c=L(vec3(.62,.34,.27));
  else if(m==9){c=L(vec3(.95,.92,.80));em=L(vec3(1.,.82,.5))*uMisc.x*5.;snowy=0.;}
  else if(m==10){c=L(vec3(.96,.95,.91));snowy=.3;}
  else if(m==12)c=L(vec3(.93,.89,.80));
  else if(m==15)c=L(pick4(fract(h*5.1),vec3(.85,.25,.22),vec3(.25,.45,.80),vec3(.98,.80,.25),vec3(.35,.65,.38)));
  else if(m==16)c=L(pick4(fract(h*9.7),vec3(.22,.24,.35),vec3(.40,.30,.22),vec3(.30,.30,.32),vec3(.55,.45,.35)));
  else if(m==17)c=L(fract(h*3.3)<.5?vec3(.96,.80,.66):vec3(.72,.52,.38));
  else if(m==18)c=L(pick4(fract(h*13.7),vec3(.85,.15,.2),vec3(.95,.55,.1),vec3(.2,.35,.8),vec3(.92,.92,.94)));
  else if(m==19)c=L(pick4(fract(h*7.9),vec3(.45,.28,.16),vec3(.22,.14,.09),vec3(.62,.58,.54),vec3(.88,.84,.76)));// horse coats
  else if(m==20)c=L(pick4(fract(h*5.3),vec3(.80,.12,.10),vec3(.20,.50,.20),vec3(.15,.35,.75),vec3(.95,.55,.10)));// machine paint
  if(uKind==22){int pal=m-(m/10)*10;float hh=vHash;
    if(pal==0)c=L(fract(hh*7.13)<.5?pick4(fract(hh*3.7),vec3(.84,.78,.64),vec3(.48,.35,.24),vec3(.36,.45,.27),vec3(.6,.22,.18)):pick4(fract(hh*5.3),vec3(.27,.36,.55),vec3(.76,.58,.28),vec3(.5,.5,.48),vec3(.64,.37,.22)));
    else if(pal==1)c=L(pick4(fract(hh*11.3),vec3(.3,.22,.16),vec3(.36,.37,.4),vec3(.2,.22,.3),vec3(.52,.42,.3)))*(fract(hh*2.9)<.5?1.:1.15);
    else if(pal==2)c=L(pick4(fract(hh*17.1),vec3(.96,.8,.68),vec3(.9,.72,.58),vec3(.78,.58,.44),vec3(.6,.42,.3)));
    else if(pal==3)c=L(pick4(fract(hh*23.7),vec3(.85,.7,.42),vec3(.45,.3,.18),vec3(.25,.17,.11),vec3(.12,.1,.09)));
    else if(pal==4)c=L(pick4(fract(hh*29.3),vec3(.92,.9,.84),vec3(.66,.2,.17),vec3(.3,.4,.62),vec3(.42,.32,.22)));
    else if(pal==5)c=L(vec3(.24,.16,.11));else if(pal==6)c=L(vec3(.9,.87,.8));else if(pal==7)c=L(vec3(.45,.3,.18));else c=L(vC);snowy=0.;}
  if(uKind==5)c*=.8+.35*vTint;
  if(uKind<=5||uKind==10||uKind==11){float up=smoothstep(.45,.8,N.y);c=mix(c,snowCol(N),clamp(uWx.w*snowy*up*(uKind==5?1.2:1.),0.,1.));}
  float oao=(uKind==12||uKind==14)?1.:mix(.6,1.,smoothstep(0.,2.2,vW.y-terrainH(vW.xz)));if(m==1)oao*=.72+.28*smoothstep(-.4,.7,N.y);
  vec3 col=lightS(c,N,vW,oao,shadowAt(vW,N),m==1?.66:.8)+em;
  o=vec4(fogc(col,vW),1.);}`;

// ---------------- rolling stock, signals, stations, the model table (per-draw model matrix)
const VS_VEH=GLSL_HEAD+`
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNrm;layout(location=2) in vec3 aCol;layout(location=3) in vec4 aAnim;layout(location=4) in float aMat;
uniform mat4 uModel;uniform float uDist;uniform int uPass;uniform int uGlass;uniform vec4 uG1;uniform vec4 uG2;uniform vec4 uG3;
out vec3 vW;out vec3 vN;out vec3 vC;flat out float vMat;out vec3 vL;
void main(){vec3 p=aPos,n=aNrm;int ty=int(aAnim.x+.5);
  if(ty==1){float a=-uDist/aAnim.w,c=cos(a),s=sin(a);vec2 d=p.xy-aAnim.yz;p.xy=aAnim.yz+vec2(c*d.x-s*d.y,s*d.x+c*d.y);n.xy=vec2(c*n.x-s*n.y,s*n.x+c*n.y);}
  else if(ty==2||ty==3){float a=-uDist/aAnim.w+(ty==3?1.5708:0.);p.x+=cos(a)*aAnim.y;p.y+=sin(a)*aAnim.y;}
  else if(ty>=4){/* Walschaerts valve gear (see G01): main rod, crosshead, eccentric rod, expansion link, radius rod, combination lever, valve spindle */
    float a=-uDist/aAnim.w+aAnim.y*1.5708;vec2 C=uG1.xy,Pp=C+uG1.z*vec2(cos(a),sin(a));float Lr=uG1.w,xX=Pp.x+sqrt(max(Lr*Lr-(Pp.y-C.y)*(Pp.y-C.y),0.)),d1=xX-(C.x+Lr);
    vec2 A=C+uG2.x*vec2(cos(a+uG2.y),sin(a+uG2.y)),B0=vec2(uG2.z,uG2.w-uG3.x);float Le=length(B0-C),Bx=A.x+sqrt(max(Le*Le-(A.y-B0.y)*(A.y-B0.y),0.)),ph=asin(clamp((Bx-B0.x)/uG3.x,-1.,1.)),d2=-uG3.y*sin(ph);
    float th=0.;vec2 o=vec2(0),q=vec2(0);
    if(ty==4){th=asin(clamp((C.y-Pp.y)/Lr,-1.,1.));o=C;q=Pp;}else if(ty==6){th=atan(B0.y-A.y,Bx-A.x)-atan(B0.y-C.y,B0.x-C.x);o=C;q=A;}else if(ty==7){th=ph;o=uG2.zw;q=o;}
    if(ty==4||ty==6||ty==7){float c=cos(th),s=sin(th);vec2 d=p.xy-o;p.xy=q+vec2(c*d.x-s*d.y,s*d.x+c*d.y);n.xy=vec2(c*n.x-s*n.y,s*n.x+c*n.y);}
    else if(ty==5)p.x+=d1;else if(ty==8)p.x+=d2;else{float h=ty==9?p.y:aAnim.z;p.x+=mix(d1,d2,clamp((h-uG3.z)/(uG3.w-uG3.z),0.,1.));}}
  vec4 w=uModel*vec4(p,1.);vW=w.xyz;vN=mat3(uModel)*n;vC=aCol;vMat=aMat;vL=p;gl_Position=(uPass==1?uLightVP:uViewProj)*w;
  // glass and solid parts are drawn in separate passes: the triangles of the other kind leave the view here (a material is per triangle),
  // so the fragment shader needs no discard and the GPU can reject hidden pixels early
  int mm=int(aMat+.5);bool gs=mm==2||mm==12||mm==13;/* 12: the plane's propeller disc, see-through like glass */if(uPass==1?gs:((uGlass==2&&gs)||(uGlass==1&&!gs)))gl_Position=vec4(2.,2.,2.,1.);}`;
const FS_VEH=GLSL_HEAD+GLSL_COMMON+`
uniform int uPass;uniform int uGlass;uniform vec3 uLamp;uniform vec2 uOcc;in vec3 vW;in vec3 vN;in vec3 vC;flat in float vMat;in vec3 vL;`+FS_OUT+`
float person(vec2 q){return 1.-smoothstep(0.,.025,min(length(q-vec2(0.,.12))-.11,length(vec2(q.x/.22,(q.y+.24)/.17))*.17-.17));}
void main(){int m0=int(vMat+.5);if(uPass==1){o=vec4(0);return;}
  vec3 V=normalize(uCamPos.xyz-vW);vec3 N=normalize(vN);if(dot(N,V)<0.)N=-N;int m=int(vMat+.5);bool pg=m==13;if(pg)m=2;/* 13: the plane's cabin glass: like glass, more reflective, no lamplight */vec3 c=L(vC);vec3 em=vec3(0);float sil=0.;
  if(m==2&&uOcc.x>0.&&abs(vL.z)>1.39){float wi=floor((vL.x+6.97)/1.74),sd=sign(vL.z),wx=-6.1+wi*1.74;// coach windows: who sits where is a hash of window, side and train
    for(int k=0;k<2;k++){float h=fract(sin(wi*12.9898+sd*78.233+uOcc.y*37.71+float(k)*5.17)*43758.5453);if(h<uOcc.x)sil=max(sil,person(vec2(vL.x-wx-(float(k)-.5)*.5-(fract(h*7.)-.5)*.12,vL.y-2.55)));}
    c=mix(c,L(vec3(.10,.09,.08)),sil*.85);}
  if(m==5){float pl=fract(vW.x*.035+floor(vW.z*.06)*.37);c*=.86+.18*smoothstep(.0,.08,pl)*smoothstep(1.,.92,pl);}
  if(m==6){float pl=fract(vW.z*.012);float r=hash11(floor(vW.z*.012));c*=(.82+.2*r)*(.9+.1*smoothstep(0.,.02,pl));}
  if(m==8){vec3 g=floor(vL*vec3(26.,44.,26.));float h=hash12(g.xz+g.y*1.73);c*=.78+.34*h;c*=.92+.08*vnoise(vL.xz*3.);}/* grain: single kernels, light and dark */
  if(m==9){vec2 uv=vec2(vL.x+vL.z*.37,vL.y);float n=vnoise(uv*1.4)*.6+vnoise(uv*4.3)*.4;c=mix(c,L(vec3(.45,.38,.34)),smoothstep(.6,.8,n)*.45);
    c*=.86+.14*vnoise(vec2(vL.x*7.,vL.y*.5));c*=mix(.82,1.,smoothstep(1.2,2.6,vL.y));}/* weathered hopper: grey patches, streaks, grime low down */
  float onBoard=step(0.,vW.x)*step(vW.x,uWorld.x)*step(0.,vW.z)*step(vW.z,uWorld.x);
  float inside=smoothstep(2.5,4.5,terrainH(vW.xz)-vW.y)*onBoard;
  float sh=shadowAt(vW,N)*(1.-inside);
  vec3 col=lightS(c,N,vW,1.-inside*.85,sh,m<=2||m==11?1.:m==10?.3:.72);
  if(m==7)col=c*(ambient(N)*1.5+uSunCol.rgb*.22+vec3(1.,.82,.55)*uMisc.x*.9);// interiors: soft daylight through the windows, warm lamplight at night
  if(m<=2){vec3 R=reflect(-V,N);float F=pow(1.-max(dot(N,V),0.),4.)*(m==2?.7:.25);col+=mix(L(uSkyH.rgb),L(uSkyZ.rgb),clamp(R.y,0.,1.))*F*(.3+.7*uSunDir.w)*(1.-inside);
    float sp=pow(max(dot(R,uSunDir.xyz),0.),m==1?30.:60.)*sh;col+=uSunCol.rgb*sp*(m==2?.6:.35);}
  {vec3 R=reflect(-V,N);float cv=max(dot(N,V),0.),sd=max(dot(R,uSunDir.xyz),0.),day=.3+.7*uSunDir.w;
    vec3 env=mix(L(uSkyH.rgb),L(uSkyZ.rgb),clamp(R.y*1.4,0.,1.));env=mix(L(vec3(.20,.22,.14))*day*.6,env,smoothstep(-.2,.04,R.y));// sky above, the land below the horizon
    if(m==11){float F=.04+.96*pow(1.-cv,5.);col+=env*(F*.85+.06)*day;col+=uSunCol.rgb*(pow(sd,160.)*2.2+pow(sd,18.)*.08)*sh;}// glossy paint: a clear coat over the colour
    if(m==10){float F=.65+.35*pow(1.-cv,3.);col=col*.35+env*c*1.6*F*day+env*.25*day;col+=uSunCol.rgb*(pow(sd,90.)*3.+pow(sd,10.)*.15)*sh;}}// chrome: mostly the reflection, tinted by its colour
  if(m==2&&!pg)em=L(vec3(1.,.80,.48))*uMisc.x*1.8*(1.-sil*.85);
  if(m==12){float a=uOcc.x;o=vec4(fogc(col*.8,vW)*a,a);return;}
  if(m==4)em=vC*uLamp*(1.2+4.*uSunCol.w);
  if(uGlass==1){float F=pow(1.-max(dot(N,V),0.),4.),a=pg?clamp(.32+.6*F,0.,.95):clamp(.14+.75*F+uMisc.x*.1,0.,.95);if(pg)col+=mix(L(uSkyH.rgb),L(uSkyZ.rgb),.5)*.35*(.3+.7*uSunDir.w);o=vec4(fogc(col*.6+em*.35,vW)*a,a);return;}
  o=vec4(fogc(col+em,vW),1.);}`;

// ---------------- track: ballast, sleepers, rails, stone viaducts and tunnel portals
const VS_TRACK=GLSL_HEAD+`
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNrm;layout(location=2) in vec2 aUV;layout(location=3) in float aMat;
uniform int uPass;out vec3 vW;out vec3 vN;out vec2 vUV;flat out float vMat;
void main(){vW=aPos;vN=aNrm;vUV=aUV;vMat=aMat;gl_Position=(uPass==1?uLightVP:uViewProj)*vec4(aPos,1.);}`;
const FS_TRACK=GLSL_HEAD+GLSL_COMMON+`
uniform sampler2D uTrackClear;uniform int uPass;uniform vec4 uTint;in vec3 vW;in vec3 vN;in vec2 vUV;flat in float vMat;`+FS_OUT+`
void main(){if(uPass==1){o=vec4(0);return;}
  vec3 N=normalize(vN);if(!gl_FrontFacing)N=-N;int m=int(vMat+.5);vec3 c;
  if(m==0){float g=hash12(floor(vUV*7.));c=L(vec3(.66,.62,.58))*(.82+.3*g);}
  else if(m==1)c=L(vec3(.48,.32,.22))*(.9+.2*hash11(floor(vW.x*3.1+vW.z*2.3)));
  else if(m==2)c=L(N.y>.9?vec3(.86,.86,.88):vec3(.48,.36,.30));
  else if(m==3||m==5){vec2 b=vUV*vec2(1.,1.8);b.x+=floor(b.y)*.5;vec2 f=fract(b);float mort=step(.06,f.x)*step(.08,f.y);float r=hash12(floor(b));
    c=L(m==5?vec3(.86,.80,.70):vec3(.80,.70,.58))*(.86+.18*r);c=mix(L(vec3(.62,.56,.48)),c,mort);}
  else if(m==6){vec2 b=vUV*vec2(2.2,4.4);b.x+=floor(b.y)*.5;vec2 f=fract(b);float mort=step(.07,f.x)*step(.12,f.y),r=hash12(floor(b));c=L(mix(vec3(.46,.22,.16),vec3(.58,.31,.22),r))*(.9+.15*hash12(floor(b)+7.));c=mix(L(vec3(.72,.68,.62)),c,mort);}
  else if(m==7){float r=hash12(floor(vW.xz*1.3+vW.y*2.1));c=L(vec3(.26,.36,.32))*(.92+.1*r);c=mix(c,L(vec3(.42,.26,.16)),smoothstep(.75,1.,vnoise(vW.xz*.7+vW.y*1.3))*.35);}
  else if(m==8){float band=smoothstep(.0,.04,abs(fract(vW.y/1.2)-.5)-.47);c=L(vec3(.70,.69,.66))*(.94+.08*hash12(floor(vW.xz*.8)))*(1.-band*.08);c=mix(c,L(vec3(.48,.47,.44)),smoothstep(.55,1.,vnoise(vW.xz*.25+vW.y*.6))*.3);}
  else if(m==9){float gr2=vnoise(vec2(dot(vW.xz,vec2(.7,.7))*.6,vW.y*7.));c=L(vec3(.44,.36,.27))*(.8+.3*gr2);c=mix(c,L(vec3(.50,.48,.44)),.25);}
  else c=L(vec3(.36,.33,.30));
  float inside=m==4?.85:smoothstep(2.5,5.,terrainH(vW.xz)-vW.y);
  float up=smoothstep(.5,.8,N.y),tcl=texture(uTrackClear,vW.xz/uWorld.x).r;c=mix(c,snowCol(N),clamp(uWx.w*1.2,0.,1.)*up*(m==2?(1.-tcl)*.9:1.-tcl*.85)*(1.-inside));
  vec3 col=light(c,N,vW,1.-inside*.9,shadowAt(vW,N)*(1.-inside));
  col=mix(col,L(uTint.rgb)*1.2,uTint.a);o=vec4(fogc(col,vW),1.);}`;

// ---------------- sky: gradient, sun, moon, stars, rainbow, lightning glow
const FS_SKY=GLSL_HEAD+`
uniform mat4 uInvVP;in vec2 vUV;`+FS_OUT+`
vec3 L(vec3 c){return c*c*(c*.31+.69);}
float h12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
void main(){vec4 a=uInvVP*vec4(vUV*2.-1.,1.,1.);vec3 d=normalize(a.xyz/a.w-uCamPos.xyz);float h=d.y;
  float hz=max(h,0.);vec3 c=mix(L(uSkyH.rgb),L(uSkyZ.rgb),pow(clamp(hz*1.25,0.,1.),.5));
  float haze=exp(-hz*9.);c=mix(c,uFogCol.rgb,haze*.6);c=mix(c,uFogCol.rgb,smoothstep(.02,-.25,h));
  float sd=dot(d,uSunTrue.xyz),ms=max(sd,0.);c+=uFogCol2.rgb*(pow(ms,5.)*.3+pow(ms,48.)*.5)*uSunTrue.w*(.5+.5*haze)*(1.-uWx2.w*.6);
  c+=vec3(1.,.92,.75)*smoothstep(.99955,.9998,sd)*14.*uSunTrue.w*(1.-uWx2.w*.9);
  float md=dot(d,uMoon.xyz);float disc=smoothstep(.99935,.99965,md);float ph=smoothstep(.99935,.99965,dot(d,normalize(uMoon.xyz+vec3(.012,.004,0))));
  c+=vec3(.95,.95,.88)*disc*(1.-ph*.75)*3.*uMoon.w+vec3(.25,.3,.45)*pow(max(md,0.),40.)*.25*uMoon.w;
  if(uSkyZ.w>0.&&h>0.){vec3 q=floor(d*260.);float s=h12(q.xy*.71+q.z*3.17);float st=step(.9972,s)*(.6+.4*sin(uCamPos.w*3.+s*400.));c+=vec3(.9,.92,1.)*st*uSkyZ.w*smoothstep(0.,.15,h)*1.5;}
  if(uMisc.w>0.){float ang=acos(clamp(dot(d,-uSunTrue.xyz),-1.,1.));float x=(ang-.733)/.045;if(abs(x)<1.&&h>0.){vec3 rb=clamp(vec3(1.3-abs(x*2.-1.),1.-abs(x)*1.2,1.3-abs(x*2.+1.)),0.,1.);
    c=mix(c,c+L(rb)*.5,uMisc.w*(1.-abs(x))*smoothstep(0.,.08,h));}}
  c+=vec3(.75,.78,1.)*uWx2.y*.8;
  o=vec4(c,1.);}`;
const FS_VCLOUD=GLSL_HEAD+GLSL_BASE+`
precision highp sampler3D;uniform sampler3D uNoise3;uniform sampler2D uDepthCopy;uniform mat4 uInvVP;uniform vec2 uNF;uniform float uSteps;in vec2 vUV;`+FS_OUT+`
float lin(float d){float z=d*2.-1.;return 2.*uNF.x*uNF.y/(uNF.y+uNF.x-z*(uNF.y-uNF.x));}
vec2 cloudD(vec3 p,bool det){vec4 cm=texture(uCloudMap,(p.xz+uCld.z)*uCld.w);float cov=cm.r;if(cov<.015)return vec2(0);
  float base=uCld.x+max(0.,cm.b*uWorld.w+40.-uCld.x)*.6,th=uCld.y*(.35+.65*cov)*(1.+cm.g*.9);float hn=(p.y-base)/th;if(hn<0.||hn>1.)return vec2(0);
  float prof=smoothstep(0.,.1,hn)*smoothstep(1.,.4,hn)*(1.-.3*hn);vec3 q=p+vec3(uCld2.x,-uCamPos.w*.6,uCld2.y);
  float sh=texture(uNoise3,q*(1./1150.)).r;float d=clamp((sh*prof-(1.-cov))/max(cov,.08),0.,1.);
  if(det&&d>0.){float e=texture(uNoise3,q*(1./240.)).g;d=clamp(d-(1.-e)*.32*(1.-hn*.6),0.,1.);}
  vec2 o2=max(-p.xz-uCld.z,p.xz-uCld.z-uWorld.x);return vec2(d*uCld2.w*smoothstep(1800.,0.,max(o2.x,o2.y)),hn);}
float hgN(float mu,float g){return(1.-g*g)/pow(1.+g*g-2.*g*mu,1.5);}
void main(){vec4 a=uInvVP*vec4(vUV*2.-1.,1.,1.);vec3 rd=normalize(a.xyz/a.w-uCamPos.xyz),ro=uCamPos.xyz;
  float lo=uCld.x,hi=uCld.x+max(0.,uWorld.w+40.-uCld.x)*.6+uCld.y*1.9;float t0,t1;
  if(abs(rd.y)<1e-4){if(ro.y<lo||ro.y>hi){o=vec4(0);return;}t0=0.;t1=7000.;}else{float ta=(lo-ro.y)/rd.y,tb=(hi-ro.y)/rd.y;t0=max(min(ta,tb),0.);t1=max(ta,tb);}
  vec3 fw=-vec3(uView[0][2],uView[1][2],uView[2][2]);float zs=texture(uDepthCopy,vUV).r;if(zs<1.)t1=min(t1,lin(zs)/max(dot(rd,fw),.05));t1=min(t1,t0+7000.);
  if(t1<=t0){o=vec4(0);return;}
  vec3 L=uSunDir.xyz;float mu=dot(rd,L),ph=mix(hgN(mu,.62),hgN(mu,-.25),.4)*.8;float dk=uCld2.z;
  float ds=(t1-t0)/uSteps,t=t0+ds*fract(52.98*fract(dot(gl_FragCoord.xy,vec2(.0671,.00584)))),T=1.,fd=0.;vec3 C=vec3(0);
  for(int i=0;i<64;i++){if(float(i)>=uSteps||T<.03)break;vec3 p=ro+rd*t;vec2 dh=cloudD(p,true);
    if(dh.x>.002){if(fd==0.)fd=t;float od=0.;for(int j=1;j<=3;j++){float sl=float(j*j)*16.;od+=cloudD(p+L*sl,false).x*sl;}od*=.06;
      vec3 sun=uSunCol.rgb*(exp(-od)+.3*exp(-od*.25))*ph;vec3 amb=uSkyAmb.rgb*(.45+.75*dh.y)*1.4+uGndAmb.rgb*(1.-dh.y)*.6;
      vec3 db=p-uBolt.xyz;vec3 fl=vec3(.75,.8,1.)*uBolt.w*9./(1.+dot(db,db)/90000.);
      vec3 S=(sun+amb)*(1.-dk*.55)+fl;float sg=dh.x*.06,dT=exp(-sg*ds);C+=T*S*(1.-dT);T*=dT;}
    t+=ds;}
  if(fd>0.){float f=1.-exp(-fd*uFogCol.w*.45);C=mix(C,uFogCol.rgb*(1.-T),f*.9);}
  o=vec4(C,1.-T);}`;
// ---------------- volumetric mist banks: a 128² mist map (R bank density, G floor = smoothed ground/water, B thickness)
// fills the valleys from the floor up; raymarched at low res, lit once at the density-weighted point, bilateral upsample
const FS_VMIST=GLSL_HEAD+GLSL_COMMON+`
precision highp sampler3D;uniform sampler3D uNoise3;uniform sampler2D uMistMap;uniform sampler2D uDepthCopy;uniform mat4 uInvVP;uniform vec2 uNF;uniform vec4 uMist;in vec2 vUV;`+FS_OUT+`
float lin(float d){float z=d*2.-1.;return 2.*uNF.x*uNF.y/(uNF.y+uNF.x-z*(uNF.y-uNF.x));}
float hgN(float mu,float g){return(1.-g*g)/pow(1.+g*g-2.*g*mu,1.5);}
vec2 mistD(vec3 p){vec2 uv=p.xz*uMist.z;if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.)return vec2(0);vec4 m=texture(uMistMap,uv);if(m.r<.01)return vec2(0);
  float th=max(m.b,2.),h=max(p.y-m.g,0.)/th;if(h>3.)return vec2(0);float v=exp(-h)*smoothstep(3.,2.,h)*m.r;
  vec3 q=(p-vec3(uWind.x,-.4,uWind.y)*uCamPos.w*.15)*(1./80.);float n=texture(uNoise3,q).r,e=texture(uNoise3,q*3.3+.37).g;
  return vec2(clamp(v*1.5-(1.-n)*.45-(1.-e)*.18,0.,1.),clamp(h/2.,0.,1.));}
void main(){vec4 a=uInvVP*vec4(vUV*2.-1.,1.,1.);vec3 rd=normalize(a.xyz/a.w-uCamPos.xyz),ro=uCamPos.xyz;float t0,t1;
  if(abs(rd.y)<1e-4){if(ro.y<uMist.x||ro.y>uMist.y){o=vec4(0);return;}t0=0.;t1=3000.;}else{float ta=(uMist.x-ro.y)/rd.y,tb=(uMist.y-ro.y)/rd.y;t0=max(min(ta,tb),0.);t1=max(ta,tb);}
  vec3 fw=-vec3(uView[0][2],uView[1][2],uView[2][2]);float zs=texture(uDepthCopy,vUV).r;if(zs<1.)t1=min(t1,lin(zs)/max(dot(rd,fw),.05));t1=min(t1,t0+3000.);
  if(zs<1.&&rd.y<-.03){vec3 ph=ro+rd*t1;vec4 m=texture(uMistMap,clamp(ph.xz*uMist.z,0.,1.));float top=max(m.g+3.*max(m.b,2.),ph.y)+30.;t0=max(t0,t1-(top-ph.y)/(-rd.y));}// march only the last stretch above the ground
  if(t1<=t0){o=vec4(0);return;}
  float Ls=t1-t0,N=uMist.w,jit=fract(52.98*fract(dot(gl_FragCoord.xy,vec2(.0671,.00584)))),T=1.,acc=0.,hw=0.;vec3 pw=vec3(0);
  for(int i=0;i<32;i++){if(float(i)>=N||T<.02)break;float ds=Ls/N,t=t0+ds*(float(i)+jit);
    vec3 p=ro+rd*t;vec2 d=mistD(p);if(d.x>.002){float al=1.-exp(-d.x*.05*ds),w=T*al;acc+=w;pw+=p*w;hw+=d.y*w;T*=1.-al;}}
  if(acc<.003){o=vec4(0);return;}
  pw/=acc;hw/=acc;vec3 up=vec3(0,1,0);float sh=shadowAt(pw,up)*cloudSh(pw);float mu=dot(rd,uSunDir.xyz);float ph=.55+hgN(mu,.6)*.12;
  vec3 col=L(vec3(.96,.97,.98))*(uSunCol.rgb*ph*sh*mix(.5,1.,hw)*(1.-uWx2.w*.5)*.6+ambient(up)+pools(pw,up)*.6)+vec3(.8,.85,1.)*uWx2.y*1.2;
  float dist=length(pw-ro),f=clamp(1.-exp(-dist*uFogCol.w*.6),0.,.9);col=mix(col*acc,uFogCol.rgb*acc,f);
  o=vec4(col,acc);}`;
const FS_MCOMP=`#version 300 es
precision highp float;uniform sampler2D uCldTex;uniform sampler2D uDepthCopy;uniform vec2 uNF;in vec2 vUV;out vec4 o;
float lin(float d){float z=d*2.-1.;return 2.*uNF.x*uNF.y/(uNF.y+uNF.x-z*(uNF.y-uNF.x));}
void main(){vec2 ls=vec2(textureSize(uCldTex,0)),p=vUV*ls-.5,i=floor(p),f=p-i;float zc=lin(texture(uDepthCopy,vUV).r);vec4 s=vec4(0);float ws=0.;
  for(int k=0;k<4;k++){vec2 c=vec2(float(k&1),float(k>>1));vec2 uv=(i+c+.5)/ls;float z=lin(texture(uDepthCopy,uv).r);
    float bw=mix(1.-f.x,f.x,c.x)*mix(1.-f.y,f.y,c.y),w=bw*(exp(-abs(z-zc)/(zc*.04+.3))+1e-3);s+=texture(uCldTex,uv)*w;ws+=w;}
  o=s/max(ws,1e-5);}`;
// ---------------- streams & run-off: draped ribbons, width/visibility follow rain and flood
// the ribbon height comes from the very terrain triangle drawn under it (same chunk detail level, same diagonal), so it never sinks or floats
const VS_STREAM=GLSL_HEAD+GLSL_BASE+`
layout(location=0) in vec3 aP;layout(location=1) in vec4 aB;layout(location=2) in float aHid;out vec3 vW;out vec4 vB;out float vHid;uniform vec4 uCL[64];uniform float uGB;
float lodH(vec2 xz){float cells=uWorld.y/16.;vec2 g=xz/uWorld.z;ivec2 ci=clamp(ivec2(floor(g/cells)),ivec2(0),ivec2(15));int k=ci.y*16+ci.x;
  float n=max(2.,floor(uGB/exp2(uCL[k>>2][k&3])+.5)),S=cells/n;vec2 q=g/S,i=floor(q),f=q-i;
  float ha=cornerH(ivec2(i*S+.5)),hb=cornerH(ivec2((i+vec2(1,0))*S+.5)),hc=cornerH(ivec2((i+vec2(0,1))*S+.5)),hd=cornerH(ivec2((i+1.)*S+.5));
  return f.x+f.y<=1.?ha+(hb-ha)*f.x+(hc-ha)*f.y:hd+(hc-hd)*(1.-f.x)+(hb-hd)*(1.-f.y);}
void main(){vec3 p=aP;float d=length(uCamPos.xz-p.xz);p.y=lodH(p.xz)+.05+d*.0005-aP.y;vW=p;vB=aB;vHid=aHid;gl_Position=uViewProj*vec4(p,1.);}`;// aP.y: how far the water lies below the drawn ground (a culvert trench)
// streams: clear water over a pebbly bed (deeper and bluer in the middle, like the lakes), sky reflection with Fresnel, sun glints,
// ripples dragged downstream, foam on steep riffles and along the banks; perennial streams get a damp bank of dark soil and pebbles
const FS_STREAM=GLSL_HEAD+GLSL_COMMON+`
uniform vec4 uFlood;in vec3 vW;in vec4 vB;in float vHid;`+FS_OUT+`
void main(){if(vHid>.5)discard;float kind=floor(vB.w),sl=fract(vB.w),hw=vB.z,u=vB.x,s=vB.y,d=abs(u)*hw,t=uCamPos.w,wet=max(uWx.x*1.2,uFlood.x);bool st=kind>.5;
  float wd=st?hw/1.8*(1.+uFlood.x*.7):hw/1.4*smoothstep(.15,.7,wet);float vis=st?1.:smoothstep(.15,.6,wet)*uFlood.y;
  wd*=.82+.36*vnoise(vec2(u*.3+s*.07,s*.22));float x=d/max(wd,.04);
  float ba=st?smoothstep(1.75,1.0,x+.35*(vnoise(vec2(s*.9,u*2.))-.5)):0.,aw=smoothstep(1.,.86,x);if(aw*vis<.005&&ba*vis<.005)discard;
  float sh=shadowAt(vW,vec3(0,1,0))*cloudSh(vW);vec3 V=normalize(uCamPos.xyz-vW);
  vec2 bp=vec2(s,u*hw);float pq=vnoise(bp*5.5),pq2=vnoise(bp*14.);
  vec3 bank=mix(L(vec3(.27,.23,.18)),L(vec3(.48,.46,.42)),smoothstep(.55,.72,pq))*(.8+.3*pq2);bank=mix(bank,L(vec3(.34,.43,.2)),smoothstep(1.15,1.65,x)*.65);
  bank=mix(bank,snowCol(vec3(0,1,0)),clamp(uWx.w*1.3,0.,1.)*smoothstep(1.05,1.4,x));vec3 bankL=lightD(bank,vec3(0,1,0),vW,1.,sh);
  vec3 col=bankL;
  if(aw>.001){float sp=(1.1+sl*7.)*(1.+uFlood.x*.6);vec2 f1=vec2(u*hw*2.6,s*.9-t*sp),f2=vec2(u*hw*5.+1.7,s*2.-t*sp*1.35),f3=vec2(u*hw*11.,s*4.2-t*sp*1.9);
    // river quality (uFlood.z): low skips the finest ripple layer, high adds a fourth, finer one (each layer: 3 noise lookups)
    float q=uFlood.z,h1=vnoise(f1),h2=vnoise(f2),h3=q>.5?vnoise(f3):.5,e=.15;
    vec2 g=vec2(vnoise(f1+vec2(e,0))-h1,vnoise(f1+vec2(0,e))-h1)*2.4+vec2(vnoise(f2+vec2(e,0))-h2,vnoise(f2+vec2(0,e))-h2)*1.3;
    if(q>.5)g+=vec2(vnoise(f3+vec2(e,0))-h3,vnoise(f3+vec2(0,e))-h3)*.6;
    if(q>1.5){vec2 f4=vec2(u*hw*23.+4.1,s*8.5-t*sp*2.6);float h4=vnoise(f4);g+=vec2(vnoise(f4+vec2(e,0))-h4,vnoise(f4+vec2(0,e))-h4)*.32;}
    vec3 N=normalize(vec3(g.x*(.5+sl),1.,g.y*(.5+sl)));float dep=1.-x*x,dd=dep*clamp(wd*.55,.2,1.);
    vec2 bq=bp+g*.18*dep;float b1=vnoise(bq*5.5),b2=vnoise(bq*15.);
    vec3 bed=mix(L(vec3(.40,.36,.28)),L(vec3(.55,.52,.45)),smoothstep(.5,.72,b1))*(.75+.35*b2);bed=mix(bed,L(vec3(.24,.31,.16)),smoothstep(.62,.82,vnoise(bq*1.2))*.45);
    vec3 shallow=mix(L(vec3(.30,.66,.66)),L(vec3(.38,.64,.48)),uWater.x),deep=mix(L(vec3(.04,.18,.30)),L(vec3(.06,.22,.20)),uWater.x);
    vec3 body=mix(bed*.45+shallow*.55,deep*1.25,smoothstep(0.,1.,dd*.8+.25));body=mix(body,L(vec3(.50,.42,.29)),st?uFlood.x*.6:.7);
    float ca=smoothstep(.6,.78,h3*.6+h2*.4)*.35*(1.-dd);vec3 wc=lightD(body*(1.+ca),vec3(0,1,0),vW,1.,sh);
    vec3 Rf=reflect(-V,N);Rf.y=abs(Rf.y);float F=.02+.98*pow(1.-max(dot(N,V),0.),5.);vec3 sky=mix(L(uSkyH.rgb),L(uSkyZ.rgb),clamp(Rf.y*1.6,0.,1.))*(.3+.7*uSunDir.w);
    wc=mix(wc,sky,clamp(F,0.,1.)*.9);wc+=uSunCol.rgb*pow(max(dot(Rf,uSunDir.xyz),0.),160.)*4.*sh;
    float fo=clamp(smoothstep(.78,.95,h3*.7+h2*.3)*smoothstep(.25,.7,sl)*(st?.8:.4)+smoothstep(.86,1.,x)*smoothstep(.68,.85,h3)*.35,0.,1.);
    wc=mix(wc,lightD(L(vec3(.93,.95,.96)),vec3(0,1,0),vW,1.,sh),fo*.85);wc=mix(wc,lightD(L(vec3(.82,.90,.95)),vec3(0,1,0),vW,1.,sh),uWater.w);
    col=mix(bankL,wc,aw);}
  float a=max(aw,ba*.9)*vis;o=vec4(fogc(col,vW)*a,a);}`;
const FS_CCOMP=`#version 300 es
precision highp float;uniform sampler2D uCldTex;in vec2 vUV;out vec4 o;void main(){o=texture(uCldTex,vUV);}`;
const VS_FS=`#version 300 es
out vec2 vUV;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vUV=p;gl_Position=vec4(p*2.-1.,1.,1.);}`;

// ---------------- water: depth-tinted, faceted ripples, shore foam, ice in winter
// ---------------- FFT waves for lakes (Tessendorf, JONSWAP fetch-limited wind sea; ported from the ocean tank)
const WGL=`#version 300 es
precision highp float;precision highp int;precision highp sampler2DArray;
const float PI=3.14159265359;const float G=9.81;const float STEN=7.28e-5;
vec2 cmul(vec2 a,vec2 b){return vec2(a.x*b.x-a.y*b.y,a.x*b.y+a.y*b.x);}
`;
const FS_WINIT=WGL+`uniform sampler2D uGN;uniform int uN;uniform float uL[3];uniform float uKmin[3];uniform float uKmax[3];uniform float uWDep,uAmp;uniform vec4 uWs,uWs2;out vec4 o;
float lgam(float x){float a=0.;for(int i=0;i<8;i++){if(x<8.){a-=log(x);x+=1.;}}return a+(x-.5)*log(x)-x+.91893853+1./(12.*x)-1./(360.*x*x*x);}
float cos2s(float th,float s){s=max(s,1e-3);float q=exp(lgam(s+1.)-lgam(s+.5))/(2.*sqrt(PI));return q*pow(max(abs(cos(th*.5)),1e-6),2.*s);}
float jonswap(float w,float al,float wp,float ga){if(w<1e-4)return 0.;float sg=w<=wp?.07:.09;float r=exp(-(w-wp)*(w-wp)/(2.*sg*sg*wp*wp));return al*G*G/pow(w,5.)*exp(-1.25*pow(wp/w,4.))*pow(ga,r);}
float tma(float w){float x=w*sqrt(uWDep/G);return x<=1.?.5*x*x:(x<2.?1.-.5*(2.-x)*(2.-x):1.);}
float hasselS(float w,float wp,float U){float r=w/wp;if(r<=1.)return 6.97*pow(r,4.06);return 9.77*pow(r,clamp(-2.33-1.45*(U*wp/G-1.17),-6.,-1.));}
float adiff(float a,float b){return atan(sin(a-b),cos(a-b));}
void main(){ivec2 id=ivec2(gl_FragCoord.xy);int c=id.y/uN;int ly=id.y-c*uN;int nx=id.x<uN/2?id.x:id.x-uN;int nz=ly<uN/2?ly:ly-uN;
  float dk=2.*PI/uL[c];vec2 k=vec2(float(nx),float(nz))*dk;float kl=length(k);o=vec4(0.);if(kl<1e-6)return;
  float th=tanh(min(kl*uWDep,20.));float w=sqrt((G*kl+STEN*kl*kl*kl)*th);
  float dw=((G+3.*STEN*kl*kl)*th+(G*kl+STEN*kl*kl*kl)*uWDep*(1.-th*th))/(2.*w);o.z=w;
  if(id.x==uN/2||ly==uN/2||kl<uKmin[c]||kl>=uKmax[c])return;
  float s=hasselS(w,uWs.y,uWs2.x)*uWs2.y;float Sw=jonswap(w,uWs.x,uWs.y,uWs.z)*cos2s(adiff(atan(k.y,k.x),uWs.w),s);
  float Sk=Sw*tma(w)*dw/kl;vec2 xi=texelFetch(uGN,id,0).xy;o.xy=xi*(.5*dk*sqrt(max(Sk,0.)))*uAmp;}`;
const FS_WTIME=WGL+`uniform sampler2D uH0;uniform int uN;uniform float uL[3];uniform float uT;layout(location=0) out vec4 o0;layout(location=1) out vec4 o1;
vec2 pk(vec2 a,vec2 b){return vec2(a.x-b.y,a.y+b.x);}
void main(){ivec2 id=ivec2(gl_FragCoord.xy);int c=id.y/uN;int ly=id.y-c*uN;int nx=id.x<uN/2?id.x:id.x-uN;int nz=ly<uN/2?ly:ly-uN;
  vec2 k=vec2(float(nx),float(nz))*(2.*PI/uL[c]);float kl=length(k);vec4 a=texelFetch(uH0,id,0);vec4 b=texelFetch(uH0,ivec2((uN-id.x)&(uN-1),c*uN+((uN-ly)&(uN-1))),0);
  float ph=a.z*uT;vec2 e=vec2(cos(ph),sin(ph));vec2 h=cmul(a.xy,vec2(e.x,-e.y))+cmul(vec2(b.x,-b.y),e);vec2 kn=kl>1e-6?k/kl:vec2(0.);vec2 ih=vec2(-h.y,h.x);
  vec2 Dx=kn.x*ih,Dz=kn.y*ih,hx=k.x*ih,hz=k.y*ih,Dxx=-(k.x*kn.x)*h,Dzz=-(k.y*kn.y)*h,Dxz=-(k.x*kn.y)*h;
  o0=vec4(pk(h,Dx),pk(Dz,hx));o1=vec4(pk(hz,Dxx),pk(Dzz,Dxz));}`;
const FS_WFFT=WGL+`uniform sampler2D uA;uniform sampler2D uB;uniform int uN,uSub,uHor;layout(location=0) out vec4 oA;layout(location=1) out vec4 oB;
void main(){ivec2 id=ivec2(gl_FragCoord.xy);int c=id.y/uN;int ly=id.y-c*uN;int idx=uHor==1?id.x:ly;int hs=uSub/2;int ev=(idx/uSub)*hs+(idx%hs);int od=ev+uN/2;
  float an=2.*PI*float(idx%uSub)/float(uSub);vec2 tw=vec2(cos(an),sin(an));ivec2 pe=uHor==1?ivec2(ev,id.y):ivec2(id.x,c*uN+ev);ivec2 po=uHor==1?ivec2(od,id.y):ivec2(id.x,c*uN+od);
  vec4 e=texelFetch(uA,pe,0),q=texelFetch(uA,po,0);oA=vec4(e.xy+cmul(tw,q.xy),e.zw+cmul(tw,q.zw));
  e=texelFetch(uB,pe,0);q=texelFetch(uB,po,0);oB=vec4(e.xy+cmul(tw,q.xy),e.zw+cmul(tw,q.zw));}`;
const FS_WASM=WGL+`uniform sampler2D uF0,uF1;uniform sampler2DArray uPrev;uniform int uN,uC;uniform float uLam,uDecay,uFoamTh,uFoamGain;layout(location=0) out vec4 o0;layout(location=1) out vec4 o1;
void main(){ivec2 id=ivec2(gl_FragCoord.xy);ivec2 ia=ivec2(id.x,uC*uN+id.y);vec4 a=texelFetch(uF0,ia,0),b=texelFetch(uF1,ia,0);
  float Dxx=uLam*b.y,Dzz=uLam*b.z,Dxz=uLam*b.w;float J=(1.+Dxx)*(1.+Dzz)-Dxz*Dxz;float prev=texelFetch(uPrev,ivec3(id,uC),0).w;float inj=clamp((uFoamTh-J)*uFoamGain,0.,1.);
  o0=vec4(uLam*a.y,a.x,uLam*a.z,max(prev*uDecay,inj));o1=vec4(a.w,b.x,Dxx,Dzz);}`;
// wave displacement for the water meshes, low-passed to what the mesh spacing can carry
const WAVE_GL=`
precision highp sampler2DArray;uniform sampler2DArray uWDisp;uniform vec4 uWaveA,uWL;
vec3 waveD(vec2 p,float spc){vec3 d=vec3(0);int nc=int(uWaveA.w);for(int c=0;c<3;c++){if(c>=nc)break;float lod=log2(max(spc*2./(uWL[c]/uWL.w),1.));d+=textureLod(uWDisp,vec3(p/uWL[c],float(c)),lod).xyz;}return d;}
`;
const VS_LAKE=GLSL_HEAD+GLSL_BASE+WAVE_GL+`
layout(location=0) in vec2 aQ;uniform vec4 uLakeP;uniform vec2 uSpc2;out vec3 vW;out float vL;out float vFall;out vec2 vP;out float vLake;out float vH;
void main(){vec2 p=uLakeP.xy+(aQ*2.-1.)*uLakeP.z;vec2 f=p/uWorld.z-.5;vec2 i0=floor(f);f-=i0;ivec2 c=ivec2(i0);int M=int(uWorld.y)-1;float sw=0.,sl=0.,bl=0.;
  for(int k=0;k<4;k++){ivec2 o2=ivec2(k&1,k>>1);vec4 w=texelFetch(uWaterTex,clamp(c+o2,ivec2(0),ivec2(M)),0);float b=(o2.x==1?f.x:1.-f.x)*(o2.y==1?f.y:1.-f.y);float lk=w.a>.75&&w.a<1.5?1.:0.;sw+=b*lk;sl+=b*lk*w.r;bl+=b*w.r;}
  float l=sw>1e-4?sl/sw:bl;vLake=sw;vFall=0.;vL=l;vP=p;vec3 W=vec3(p.x,l,p.y);
  float e=clamp((uLakeP.z-max(abs(p.x-uLakeP.x),abs(p.y-uLakeP.y)))/(uLakeP.z*.3),0.,1.);
  float fd=step(.01,sw)*clamp((l-terrainH(p))/2.,0.,1.)*(1.-uWater.w);vec3 d=uWaveA.x>0.?waveD(p,mix(uSpc2.x,uSpc2.y,e))*fd:vec3(0);
  W+=d;vH=d.y;vW=W;gl_Position=uViewProj*vec4(W,1.);}`;

const VS_WATER=GLSL_HEAD+GLSL_BASE+WAVE_GL+`
layout(location=0) in vec3 aG;uniform vec4 uChunk;uniform vec4 uFlood;uniform float uSpc;out vec3 vW;out float vL;out float vFall;out vec2 vP;out float vLake;out float vH;
float lkf(float a){return a>.75&&a<1.5?1.:0.;}
float rw(float a){return a<.05?0.:a<.5?(a-.1)/.3:a<2.5?a-1.:1.;}
float wl(ivec2 c){int N=int(uWorld.y);c=clamp(c,ivec2(0),ivec2(N-1));return texelFetch(uWaterTex,c,0).r;}
float wp(ivec2 c){int N=int(uWorld.y);c=clamp(c,ivec2(0),ivec2(N-1));return texelFetch(uWaterTex,c,0).a;}
void main(){int N=int(uWorld.y);ivec2 g=clamp(ivec2(uChunk.xy+aG.xy*uChunk.z+.5),ivec2(0),ivec2(N));
  float l=.25*(wl(g-ivec2(1))+wl(g-ivec2(0,1))+wl(g-ivec2(1,0))+wl(g));float pr=max(max(wp(g-ivec2(1)),wp(g-ivec2(0,1))),max(wp(g-ivec2(1,0)),wp(g)));
  float a0=wp(g-ivec2(1)),a1=wp(g-ivec2(0,1)),a2=wp(g-ivec2(1,0)),a3=wp(g);
  l+=.25*(rw(a0)+rw(a1)+rw(a2)+rw(a3))*uFlood.x*uFlood.y;vFall=max(max(step(2.5,a0),step(2.5,a1)),max(step(2.5,a2),step(2.5,a3)));
  vec3 W=vec3(float(g.x)*uWorld.z,l,float(g.y)*uWorld.z);float t=uCamPos.w;
  float lw=.25*(lkf(a0)+lkf(a1)+lkf(a2)+lkf(a3));vLake=lw;vP=W.xz;vH=0.;
  W.y+=(sin(W.x*.11+t*1.3)*.5+sin(W.z*.13-t*1.1+W.x*.05)*.5)*.22*uWater.y*(1.-uWater.w)*min(pr,1.)*(1.-lw*uWaveA.x);
  if(uWaveA.x>0.&&lw>0.){vec3 d=waveD(W.xz,uSpc)*lw*clamp((l-terrainH(W.xz))/2.,0.,1.)*(1.-uWater.w);W+=d;vH=d.y;}
  vL=l;vW=W;gl_Position=uViewProj*vec4(W,1.);}`;
const FS_WATER=GLSL_HEAD+GLSL_COMMON+`
in vec3 vW;in float vL;in float vFall;in vec2 vP;in float vLake;in float vH;uniform vec4 uFlood;uniform vec4 uFallP[8];
precision highp sampler2DArray;uniform sampler2DArray uWDisp;uniform sampler2DArray uWDeriv;uniform sampler2D uSceneCol;uniform sampler2D uDepthCopy;
uniform vec4 uWaveA,uWL,uLakeP,uRefl;uniform vec2 uNF;uniform sampler2D uPatch;uniform float uDbg;`+FS_OUT+`
float linZ(float d){float z=d*2.-1.;return 2.*uNF.x*uNF.y/(uNF.y+uNF.x-z*(uNF.y-uNF.x));}
// screen-space reflection: march the reflected ray against the depth copy, take the colour from the pre-water scene copy
vec4 ssr(vec3 P,vec3 Rd){int n=int(uRefl.x);float st=1.5,t=fract(52.98*fract(dot(gl_FragCoord.xy,vec2(.0671,.00584))))*1.5;
  for(int i=0;i<40;i++){if(i>=n)break;t+=st;st*=uRefl.y;vec4 c=uViewProj*vec4(P+Rd*t,1.);if(c.w<=.1)break;vec2 uv=c.xy/c.w*.5+.5;
    if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.)break;float zs=linZ(texture(uDepthCopy,uv).r);
    if(c.w>zs+.05&&c.w-zs<st*.9+.6){float a=t-st,b=t;for(int k=0;k<5;k++){float m=(a+b)*.5;vec4 cm=uViewProj*vec4(P+Rd*m,1.);vec2 um=cm.xy/cm.w*.5+.5;if(cm.w>linZ(texture(uDepthCopy,um).r))b=m;else a=m;}
      vec4 cb=uViewProj*vec4(P+Rd*b,1.);uv=cb.xy/cb.w*.5+.5;vec2 e=smoothstep(0.,.07,uv)*smoothstep(1.,.93,uv);
      vec3 fw=-vec3(uView[0][2],uView[1][2],uView[2][2]);return vec4(texture(uSceneCol,uv).rgb,e.x*e.y*smoothstep(-.02,.1,Rd.y)*smoothstep(.0,.3,dot(Rd,fw)));}}
  return vec4(0);}
// ice cracks: edges of a jittered cell pattern
float crack(vec2 p){vec2 i=floor(p),f=fract(p);float d1=9.,d2=9.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 o2=vec2(x,y);
  vec2 h=fract(sin(vec2(dot(i+o2,vec2(127.1,311.7)),dot(i+o2,vec2(269.5,183.3))))*43758.5453);float d=length(o2+h-f);if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;}
  return 1.-smoothstep(0.,.05,d2-d1);}
vec2 flowAt(vec2 xz){vec2 f=xz/uWorld.z-.5;vec2 i0=floor(f);f-=i0;ivec2 c=ivec2(i0);int M=int(uWorld.y)-1;vec2 r=vec2(0);
  for(int k=0;k<4;k++){ivec2 o2=ivec2(k&1,k>>1);vec4 w=texelFetch(uWaterTex,clamp(c+o2,ivec2(0),ivec2(M)),0);r+=w.gb*(o2.x==1?f.x:1.-f.x)*(o2.y==1?f.y:1.-f.y);}return r;}
// ripples: sum of travelling wave trains, analytic slope (no facets)
vec2 rip(vec2 p,float t,vec2 wd){vec2 g=vec2(0);
  for(int i=0;i<5;i++){float fi=float(i),an=atan(wd.y,wd.x)+(fi-2.)*.55+sin(fi*3.7)*.3,k=.55*pow(1.62,fi),am=.11/pow(1.75,fi);vec2 d=vec2(cos(an),sin(an));
    g+=d*k*am*cos(dot(d,p)*k-t*sqrt(9.8*k)*.6+fi*1.7);}return g;}
uniform float uSeaL;
void main(){vec3 W=vW;vec3 V=normalize(uCamPos.xyz-W);float t=uCamPos.w;
  // a culvert ditch is dug below the water table of a wet cell: water that the natural ground covered stays hidden there
  {ivec2 pc=clamp(ivec2(floor(W.xz/uWorld.z)),ivec2(0),ivec2(int(uWorld.y)-1));if(texelFetch(uPatch,pc,0).r>.5){vec2 g=W.xz/uWorld.z,f=fract(g);ivec2 c=ivec2(floor(g));
    float ha=cornerH(c),hb=cornerH(c+ivec2(1,0)),hc=cornerH(c+ivec2(0,1)),hd=cornerH(c+ivec2(1,1)),gh=f.x+f.y<=1.?ha+(hb-ha)*f.x+(hc-ha)*f.y:hd+(hc-hd)*(1.-f.x)+(hb-hd)*(1.-f.y);if(gh>W.y-.02)discard;}}
  if(uLakeP.z>0.){bool ins=max(abs(vP.x-uLakeP.x),abs(vP.y-uLakeP.y))<uLakeP.z;if(uLakeP.w>.5){if(vLake<.5||!ins)discard;}else if(vLake>=.5&&ins)discard;}
  // depth: the smooth terrain height decides where there is water; near the camera the depth buffer (the ground as drawn) refines it,
  // but only where both agree (a depth copy that reads wrong on some GPUs must never punch holes or bands into a lake)
  float depthT=max(vL-terrainH(W.xz),0.),depth=depthT;float ice=uWater.w*(uSeaL>0.&&abs(vL-uSeaL)<1.?0.:1.),rain=uWx.x;/* the ocean never freezes */
  {vec2 duv=gl_FragCoord.xy/vec2(textureSize(uDepthCopy,0));float zs=texture(uDepthCopy,duv).r;if(zs<1.){vec3 F=-vec3(uView[0][2],uView[1][2],uView[2][2]),Dr=normalize(W-uCamPos.xyz);
      float db=max((linZ(zs)-linZ(gl_FragCoord.z))/max(dot(Dr,F),.05)*max(-Dr.y,.02),0.),nw=1.-smoothstep(150.,400.,length(W-uCamPos.xyz));if(abs(db-depthT)<1.+depthT*.6)depth=mix(depthT,db,nw);}}
  float dsl=length(vec2(dFdx(depth),dFdy(depth)))/max(length(vec2(length(dFdx(W.xz)),length(dFdy(W.xz)))),1e-3);// bottom slope, before any discard
  if(depthT<.005&&depth<.003)discard;
  vec2 fl=flowAt(W.xz);float sp=length(fl);vec2 fdir=sp>1e-5?fl/sp:vec2(0);float v=min(sp*45.,3.)*(1.+rain*.5+uFlood.x*.8);float iceF=ice*(1.-smoothstep(1.5,3.,v)*.8);
  vec2 wd=sp>.002?fdir:normalize(uWind.xz+1e-4);float calm=(.35+.65*uWater.y)*(1.-iceF);
  // flow map: two phases of the ripple field dragged downstream, cross-faded
  // flow map: two phases dragged downstream. Every cycle restarts from a fresh random offset and the cycles are
  // staggered across the surface, so the pattern never visibly loops
  float tp=t*.17+vnoise(W.xz*.021)*1.3,pa=fract(tp),pb=fract(tp+.5),w1=sin(pa*3.14159);w1*=w1;float ca=floor(tp),cb=floor(tp+.5);
  vec2 oa=fract(sin(vec2(ca*12.9898+1.3,ca*78.233+4.1))*43758.5453)*vec2(97.,61.),ob=fract(sin(vec2(cb*39.346+2.7,cb*11.135+8.3))*43758.5453)*vec2(83.,59.);
  vec2 off=fdir*v*5.9;
  vec2 g=(rip(W.xz-off*pa+oa,t,wd)*w1+rip(W.xz-off*pb+ob,t,wd)*(1.-w1))*calm;
  g+=(vec2(vnoise(W.xz*1.7+t*vec2(.9,-.6)),vnoise(W.xz*1.7+vec2(5.)-t*vec2(.7,.8)))-.5)*.25*rain*calm;// rain speckle
  // lakes: FFT wave slopes (Lagrangian sampling at the undisplaced position)
  float lkw=uWaveA.x>0.?clamp(vLake*2.-.5,0.,1.)*(1.-iceF):0.,wf=0.;
  if(lkw>0.){vec4 dv=vec4(0);int nc=int(uWaveA.w);for(int c=0;c<3;c++){if(c>=nc)break;vec3 u=vec3(vP/uWL[c],float(c));dv+=texture(uWDeriv,u);wf+=texture(uWDisp,u).w*(c==2?.5:1.);}
    float sf=clamp(depth/1.5,0.,1.);g=mix(g,vec2(dv.x/max(1.+dv.z,.2),dv.y/max(1.+dv.w,.2))*sf+g*.25,lkw);wf*=sf;}
  g+=((vec2(vnoise(W.xz*.06),vnoise(W.xz*.06+7.))-.5)*.05+(vec2(vnoise(W.xz*.35),vnoise(W.xz*.35+9.))-.5)*.045+(vec2(vnoise(W.xz*1.4+3.),vnoise(W.xz*1.4+5.))-.5)*.02)*iceF;// ice: bump map that ripples the mirror
  vec3 N=normalize(vec3(-g.x,1.,-g.y));
  float th=depth/max(V.y,.12);
  vec3 shallow=mix(L(vec3(.30,.66,.66)),L(vec3(.38,.64,.48)),uWater.x),deep=mix(L(vec3(.04,.18,.30)),L(vec3(.06,.22,.20)),uWater.x);
  shallow=mix(shallow,L(vec3(.55,.48,.34)),max(rain*.35,uFlood.x*.6)*smoothstep(.002,.02,sp));// muddy run-off in rivers when it rains
  float rm=smoothstep(.002,.02,sp);vec3 body=mix(shallow,deep,1.-exp(-depth*.28));body=mix(body,L(vec3(.50,.42,.29)),uFlood.x*.6*rm);body=mix(body,mix(L(vec3(.62,.82,.92)),L(vec3(.32,.55,.70)),1.-exp(-depth*.12)),iceF);float sh=shadowAt(W,vec3(0,1,0));
  vec3 col=body*(uSunCol.rgb*max(uSunDir.y,0.)*.55*sh*cloudSh(W)+ambient(vec3(0,1,0)));
  // reflection: sky gradient, the cloud deck above, sun glint
  vec3 R=reflect(-V,N);R.y=abs(R.y);float F=.02+.98*pow(1.-max(dot(N,V),0.),5.);F=mix(F,.25+.75*pow(1.-max(dot(N,V),0.),4.),iceF);// ice reads as a mirror
  vec3 sky=mix(uFogCol.rgb,mix(L(uSkyH.rgb),L(uSkyZ.rgb),clamp(R.y*1.6,0.,1.)),smoothstep(0.,.25,R.y))*(.3+.7*uSunDir.w);
  if(uCld.y>0.){vec3 cp=W+R*max(uCld.x+uCld.y*.3-W.y,0.)/max(R.y,.06);float cv=texture(uCloudMap,(cp.xz+uCld.z)*uCld.w).r;sky=mix(sky,(uSunCol.rgb*.5+uSkyAmb.rgb*1.4)*(1.-uCld2.z*.6),smoothstep(.2,.7,cv)*.85);}
  if(uRefl.x>0.){vec4 rr=ssr(W+vec3(0,.05,0),R);sky=mix(sky,rr.rgb,rr.a);}
  col=mix(col,sky,F);
  // sun glint: Beckmann lobe widened by the normal variation inside the pixel (no sparkle, no shimmer)
  {vec3 nx=dFdx(N),ny=dFdy(N);float var=mix(.0015+rain*.004+(1.-lkw)*.002,.0004,iceF)+.5*(dot(nx,nx)+dot(ny,ny));float m2=2.*min(var,.3)+.0003;
    vec3 Hh=normalize(uSunDir.xyz+V);float NdH=max(dot(N,Hh),1e-3),c2=NdH*NdH,D=exp(-(1.-c2)/(c2*m2))/(3.14159*m2*c2*c2);
    float Fh=.02+.98*pow(1.-max(dot(V,Hh),0.),5.);col+=uSunCol.rgb*min(Fh*D/(4.*max(dot(N,V),.05)),60.)*step(0.,dot(N,uSunDir.xyz))*sh*cloudSh(W);}
  float a=clamp(mix(.25,1.,1.-exp(-th*.45))+F*.6,0.,1.);
  // foam: shoreline, fast water and rapids (more when it rains)
  float n1=vnoise((W.xz-off*pa+oa)*.8)*w1+vnoise((W.xz-off*pb+ob)*.8)*(1.-w1);n1=.5+(n1-.5)/sqrt(w1*w1+(1.-w1)*(1.-w1));// keep contrast through the cross-fade
  float fw=.3*uWater.z,lace=vnoise(W.xz*1.9+vec2(t*.23,-t*.17))*.6+vnoise(W.xz*5.3-vec2(t*.31,t*.2))*.4;
  float dsh=depth/max(dsl,.012);// metres to the waterline
  float fo=fw>0.?(smoothstep(1.6,.3,dsh+(n1-.5)*.8)*smoothstep(.45,.7,lace)*.75+smoothstep(.35,.0,dsh)*.45)*clamp(uWater.z*1.6,0.,1.):0.;
  fo=max(fo,smoothstep(.6,.95,n1+v*.06-.2)*smoothstep(1.2,3.,v)*.7);
  fo=max(fo,uFlood.x*rm*smoothstep(.5,.8,n1)*.55);// churned streaks in a swollen river
  // plunge pools: churned white water around the foot of each nearby fall
  for(int i=0;i<8;i++){vec4 e=uFallP[i];if(e.w<=0.)continue;float r=3.+e.w*4.*(1.+uFlood.x*.5),d=length(W.xz-e.xz);if(d>r)continue;
    fo=max(fo,smoothstep(r,r*.15,d+(n1-.5)*r*.7)*.95);}
  if(lkw>0.){float pat=vnoise(vP*.9+t*.05)*.6+vnoise(vP*2.7-t*.07)*.4;fo=max(fo,smoothstep(0.,1.,wf*(1.+uWaveA.z*.8)-(1.-pat)*.7)*lkw);// whitecaps
    float back=pow(clamp(dot(-V.xz/max(length(V.xz),1e-4),normalize(uSunDir.xz+1e-5)),0.,1.),3.);col+=L(vec3(.06,.35,.30))*uSunCol.rgb*clamp(vH*.7,0.,1.)*back*(1.-F)*.6*lkw;}// light through crests
  fo*=1.-iceF;
  col=mix(col,lightD(L(vec3(.94,.96,.97)),vec3(0,1,0),W,1.,sh),fo*.85);a=max(a,fo*.9);
  // waterfall curtain: streaks of aerated water sliding down the steep sheet
  float cf=vFall*smoothstep(.15,.45,sp)*(1.-iceF*.7);if(cf>.01){vec2 pp=vec2(-fdir.y,fdir.x);float u=dot(W.xz,pp);
    float st=vnoise(vec2(u*1.6,W.y*.22+t*3.2))*.6+vnoise(vec2(u*4.2+3.,W.y*.55+t*5.5))*.4;
    vec3 wc=lightD(L(vec3(.90,.94,.96)),normalize(vec3(fdir.x,.6,fdir.y)),W,1.,sh);col=mix(col,wc,cf*(.45+.55*smoothstep(.3,.7,st)));a=max(a,cf*(.7+.25*st));}
  a=mix(a,.97,iceF);a*=smoothstep(0.,.1,depth);
  // debug views (Settings > Experimental): the values the water is built from, with fine stripes that show any rounding
  if(uDbg>.5){vec3 dc;if(uDbg<1.5)dc=vec3(clamp(depth/12.,0.,1.),fract(depth*2.),clamp(depth/1.5,0.,1.));else if(uDbg<2.5)dc=vec3(clamp(dsh/20.,0.,1.),fract(dsh),clamp(dsh/3.,0.,1.));
    else if(uDbg<3.5)dc=vec3(fo);else dc=vec3(.5+.5*fdir.x,.5+.5*fdir.y,clamp(v/3.,0.,1.));o=vec4(dc*dc*.8,1.);return;}
  o=vec4(fogc(col,W)*a,a);}`;

// ---------------- low-poly clouds (soft where they cut through mountains)
const VS_CLOUD=GLSL_HEAD+`
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNrm;layout(location=4) in vec4 iA;layout(location=5) in vec4 iB;uniform int uPass;
out vec3 vW;flat out vec4 vB;
void main(){vec3 p=aPos;if(p.y<0.)p.y*=.45;p.y*=iB.x;vec3 W=iA.xyz+p*iA.w;vW=W;vB=iB;gl_Position=(uPass==1?uLightVP:uViewProj)*vec4(W,1.);}`;
const FS_CLOUD=GLSL_HEAD+GLSL_COMMON+`
uniform sampler2D uDepthCopy;uniform vec2 uNF;uniform int uPass;in vec3 vW;flat in vec4 vB;`+FS_OUT+`
float lin(float d){float z=d*2.-1.;return 2.*uNF.x*uNF.y/(uNF.y+uNF.x-z*(uNF.y-uNF.x));}
void main(){if(uPass==1){if(vB.w<.5)discard;o=vec4(0);return;}
  vec3 N=normalize(cross(dFdx(vW),dFdy(vW)));if(dot(N,uCamPos.xyz-vW)<0.)N=-N;
  vec2 suv=gl_FragCoord.xy/vec2(textureSize(uDepthCopy,0));float th=lin(texture(uDepthCopy,suv).r)-lin(gl_FragCoord.z);
  float a=clamp(th/14.,0.,1.)*vB.w;if(a<.01)discard;
  vec3 base=mix(L(vec3(1.,.99,.97)),L(vec3(.50,.54,.62)),vB.y);base*=mix(.8,1.,smoothstep(-.6,.6,N.y));
  float nl=dot(N,uSunDir.xyz);vec3 col=base*(uSunCol.rgb*clamp(nl*.7+.35,0.,1.)*(1.-uWx2.w*.6)+ambient(N)*1.1)+vec3(.8,.85,1.)*uWx2.y*1.5*(1.-vB.y*.5);
  o=vec4(fogc(col,vW)*a,a);}`;

// ---------------- soft billboards: mist banks, smoke & steam puffs
const VS_MIST=GLSL_HEAD+`
layout(location=0) in vec4 iA;layout(location=1) in vec4 iB;out vec2 vQ;out vec3 vW;flat out vec4 vB;
void main(){vec2 q=vec2(float(gl_VertexID&1),float(gl_VertexID>>1))*2.-1.;vQ=q;
  vec3 rgt=vec3(uView[0][0],uView[1][0],uView[2][0]);
  vec3 up=vec3(uView[0][1],uView[1][1],uView[2][1]);vec3 W=iA.xyz+rgt*q.x*iA.w+up*q.y*iA.w*mix(iB.z,1.,smoothstep(.3,.9,abs(uView[1][2])));vW=W;vB=iB;gl_Position=uViewProj*vec4(W,1.);}`;
const FS_MIST=GLSL_HEAD+GLSL_COMMON+`
uniform sampler2D uDepthCopy;uniform vec2 uNF;in vec2 vQ;in vec3 vW;flat in vec4 vB;`+FS_OUT+`
float lin(float d){float z=d*2.-1.;return 2.*uNF.x*uNF.y/(uNF.y+uNF.x-z*(uNF.y-uNF.x));}
void main(){float r=length(vQ);if(r>1.)discard;float t=uCamPos.w*.03;
  float n=vnoise(vQ*2.2+vB.y*17.+t)*.6+vnoise(vQ*5.+vB.y*3.-t*1.7)*.4;float a=smoothstep(1.,.25,r)*smoothstep(.25,.7,n+.35-r*.3)*vB.x;
  vec2 suv=gl_FragCoord.xy/vec2(textureSize(uDepthCopy,0));float th=lin(texture(uDepthCopy,suv).r)-lin(gl_FragCoord.z);a*=clamp(th/25.,0.,1.);
  float dc=length(vW-uCamPos.xyz);a*=smoothstep(8.,60.,dc);if(a<.004)discard;
  vec3 col=L(vec3(.96,.97,.98))*(uSunCol.rgb*.45*max(uSunDir.y,0.)+ambient(vec3(0,1,0))*1.05);col=mix(col,uFogCol.rgb,.25);
  o=vec4(col*a,a);}`;
const VS_PART=GLSL_HEAD+`
layout(location=0) in vec3 iP;layout(location=1) in vec4 iL;layout(location=2) in vec2 iT;
out vec2 vQ;out float vA;flat out float vType;out vec3 vW;out vec3 vC;out float vSz;flat out float vSeed;out float vU;
void main(){float age=iL.x,life=iL.y,u=clamp(age/life,0.,1.);vC=iP;vSeed=iT.y;vU=u;vec2 q=vec2(float(gl_VertexID&1),float(gl_VertexID>>1))*2.-1.;vQ=q;
  float sz=mix(iL.z,iL.w,sqrt(u));vec3 rgt=vec3(uView[0][0],uView[1][0],uView[2][0]),up=vec3(uView[0][1],uView[1][1],uView[2][1]);
  if(iT.x>3.5){float an=age*(2.+iT.y*3.)+iT.y*40.,ca=cos(an),sa=sin(an);q=vec2(ca*q.x-sa*q.y,sa*q.x+ca*q.y);q.y*=.35+.65*abs(sin(age*3.1+iT.y*9.));vec3 sway=vec3(sin(age*1.7+iT.y*20.),0,cos(age*1.3+iT.y*11.))*.6;vC=iP+sway;vSz=sz;vW=vC+(rgt*q.x+up*q.y)*sz;vA=1.-smoothstep(.8,1.,u);vType=iT.x;gl_Position=uViewProj*vec4(vW,1.);return;}
  vSz=sz;vW=iP+(rgt*q.x+up*q.y)*sz;vA=smoothstep(0.,.18,u)*(1.-smoothstep(.5,1.,u));vType=iT.x;gl_Position=uViewProj*vec4(vW,1.);}`;
const FS_PART=GLSL_HEAD+GLSL_COMMON+`
precision highp sampler3D;uniform sampler3D uNoise3;uniform sampler2D uDepthCopy;uniform vec2 uNF;uniform vec4 uSmk;
in vec2 vQ;in float vA;flat in float vType;in vec3 vW;in vec3 vC;in float vSz;flat in float vSeed;in float vU;`+FS_OUT+`
float lin(float d){float z=d*2.-1.;return 2.*uNF.x*uNF.y/(uNF.y+uNF.x-z*(uNF.y-uNF.x));}
float hgP(float mu,float g){return(1.-g*g)/pow(1.+g*g-2.*g*mu,1.5);}
void main(){if(vType>3.5){vec2 q=vQ;float lf=abs(q.x)<.95?pow(abs(q.y)/(1.-q.x*q.x*.9+.0001),1.):9.;if(dot(q*vec2(1.,1.7),q*vec2(1.,1.7))>1.||abs(q.y)>.6*(1.-abs(q.x)*.6))discard;
    vec3 lc=L(fract(vSeed*7.3)<.3?vec3(.85,.30,.08):fract(vSeed*7.3)<.6?vec3(.92,.62,.12):fract(vSeed*7.3)<.85?vec3(.70,.22,.10):vec3(.55,.40,.18));lc*=1.-.25*smoothstep(.02,0.,abs(q.y));
    vec3 col=lc*(uSunCol.rgb*.75+ambient(vec3(0,1,0)));o=vec4(fogc(col,vW)*vA,vA);return;}
  float r2=dot(vQ,vQ);if(r2>1.)discard;
  vec3 rgt=vec3(uView[0][0],uView[1][0],uView[2][0]),up=vec3(uView[0][1],uView[1][1],uView[2][1]),fw=cross(rgt,up);
  float zc=sqrt(1.-r2);vec3 N=normalize(rgt*vQ.x+up*vQ.y+fw*zc);int ty=int(vType+.5);float a,lit;
  if(uSmk.z>.5){// billowy: thickness through the puff eroded by the cloud noise volume, churning as it ages
    vec3 q=N*.47+vSeed*17.+vec3(0,-vU*.25,vU*.15);float n=texture(uNoise3,q).r,e=texture(uNoise3,q*2.6+.3).g;
    float d=clamp(zc*1.25-(1.-n)*.75-(1.-e)*.3+.22-vU*.18,0.,1.);a=smoothstep(0.,.55,d)*vA;
    float ns=texture(uNoise3,q+uSunDir.xyz*.12).r-n;// noise gradient toward the sun: lit billows, shaded folds
    lit=clamp(dot(N,uSunDir.xyz)*.5+.5-ns*1.6,0.,1.)*mix(1.,.55,d*(1.-max(dot(N,uSunDir.xyz),0.)));
  }else{a=smoothstep(1.,.7,r2)*vA;lit=clamp(dot(N,uSunDir.xyz)*.8+.25,0.,1.);}
  vec2 suv=gl_FragCoord.xy/vec2(textureSize(uDepthCopy,0));float th=lin(texture(uDepthCopy,suv).r)-lin(gl_FragCoord.z);a*=clamp(th/2.,0.,1.);
  float dc=length(vW-uCamPos.xyz);a*=uSmk.x*smoothstep(uSmk.y,uSmk.y*3.,dc);// see-through in chase view, fade right at the lens
  if(a<.004)discard;
  vec3 alb=ty==0?L(vec3(.40,.40,.42)):ty==2?L(vec3(.80,.80,.82)):ty==3?L(vec3(.93,.95,.97)):L(vec3(.97,.97,.98));
  vec3 V=normalize(uCamPos.xyz-vW);float ph=ty==0?1.:.7+hgP(dot(-V,uSunDir.xyz),.55)*.06;// steam glows when backlit
  vec3 col=alb*(uSunCol.rgb*lit*ph*(1.-uWx2.w*.5)+ambient(N)*(.75+.25*N.y))+vec3(.8,.85,1.)*uWx2.y*1.2;
  a*=ty==1?.75:ty==2?.55:ty==3?.32:.9;o=vec4(fogc(col,vW)*a,a);}`;

// ---------------- rain streaks and snowflakes in a box around the view
const VS_PRECIP=GLSL_HEAD+`
uniform vec4 uBox;uniform float uKind;out vec2 vQ;out float vA;
float h(float n){return fract(sin(n*12.9898)*43758.5453);}
void main(){float i=float(gl_InstanceID);vec2 q=vec2(float(gl_VertexID&1),float(gl_VertexID>>1))*2.-1.;vQ=q;float B=uBox.w,t=uCamPos.w;
  float sp=uKind<.5?B*.9:B*.1;vec3 p=vec3(h(i),h(i+.37),h(i+.71));
  vec2 w=uWind.xz*(uKind<.5?.05:.2);
  p+=vec3(w.x*t/B,-t*sp/B,w.y*t/B);if(uKind>.5)p.xz+=vec2(sin(t*.7+i),cos(t*.6+i*1.3))*.015;p=fract(p);
  vec3 W=uBox.xyz+(p-.5)*B;
  vec3 rgt=vec3(uView[0][0],uView[1][0],uView[2][0]);
  if(uKind<.5){vec3 dir=normalize(vec3(w.x,-sp,w.y));W+=rgt*q.x*B*.0016+dir*q.y*B*.02;}
  else{vec3 up=vec3(uView[0][1],uView[1][1],uView[2][1]);W+=(rgt*q.x+up*q.y)*B*.0028;}
  vA=1.-smoothstep(.35,.5,length(p.xz-.5));gl_Position=uViewProj*vec4(W,1.);}`;
const FS_PRECIP=GLSL_HEAD+`
uniform float uKind;in vec2 vQ;in float vA;`+FS_OUT+`
void main(){float a=uKind<.5?(1.-abs(vQ.x))*.17:smoothstep(1.,.3,length(vQ))*.9;a*=vA;if(a<.01)discard;
  vec3 c=(uKind<.5?vec3(.7,.75,.85):vec3(1.))*(uSkyAmb.rgb*1.6+uSunCol.rgb*.3+.05);o=vec4(c*a,a);}`;

// ---------------- lightning bolt ribbons
const VS_BOLT=GLSL_HEAD+`
layout(location=0) in vec4 aP;layout(location=1) in vec2 aQ;out float vA;out vec2 vQ;void main(){vA=aP.w;vQ=aQ;gl_Position=uViewProj*vec4(aP.xyz,1.);}`;
const FS_BOLT=GLSL_HEAD+`in float vA;in vec2 vQ;`+FS_OUT+`void main(){float q=abs(vQ.x);vec3 c;
  if(vQ.y<.5){float g=1.-q;c=vec3(.55,.5,1.)*g*g*1.4;}else{float k=smoothstep(1.,.2,q);c=mix(vec3(.8,.82,1.),vec3(1.),k)*k*14.;}
  o=vec4(c*vA,0.);}`;
// ---------------- build / drive markers
const VS_MARK=GLSL_HEAD+`
uniform vec4 uMk[24];uniform vec4 uMs[24];uniform int uBeam;out vec2 vQ;flat out float vSt;
void main(){int i=gl_InstanceID;vec4 m=uMk[i];vec4 st=uMs[i];vec2 q=vec2(float(gl_VertexID&1),float(gl_VertexID>>1))*2.-1.;vQ=q;vSt=st.x;
  float s=st.y;vec3 p;
  if(uBeam==0){vec3 f=vec3(cos(m.w),0.,sin(m.w)),l=vec3(-sin(m.w),0.,cos(m.w));p=m.xyz+vec3(0.,.4,0.)+f*q.x*s+l*q.y*s;}
  else{vec3 rgt=vec3(uView[0][0],uView[1][0],uView[2][0]);p=m.xyz+rgt*q.x*s*.06+vec3(0.,(q.y*.5+.5)*s*1.2,0.);}
  gl_Position=uViewProj*vec4(p,1.);}`;
const FS_MARK=GLSL_HEAD+`
uniform int uBeam;in vec2 vQ;flat in float vSt;`+FS_OUT+`
void main(){int st=int(vSt+.5);vec3 col=st==1?vec3(.35,1.,.45):(st==2?vec3(.35,.7,1.):(st==3?vec3(1.):(st==4?vec3(1.,.3,.2):vec3(1.,.75,.25))));
  float pulse=st==1||st==2?.75+.25*sin(uCamPos.w*6.):1.;float a;
  if(uBeam==1){a=(1.-abs(vQ.x))*(1.-(vQ.y*.5+.5))*.7;}
  else{float r=length(vQ);float ring=smoothstep(.09,.0,abs(r-.82));vec2 q=vQ;float arrow=step(-.15,q.x)*step(q.x,.62)*step(abs(q.y),(.62-q.x)*.75);
    if(st>=3){arrow=0.;ring=smoothstep(.12,.0,abs(r-.5));}a=max(ring,arrow*.9)+step(r,.82)*.12;}
  if(a<.01)discard;o=vec4(col*1.6*pulse*a,a*.9);}`;

// ---------------- post: bloom, tilt-shift, tonemap and colour looks
const FS_BLOOMDOWN=`#version 300 es
precision highp float;uniform sampler2D uBSrc;uniform vec2 uTexel;uniform float uThr;in vec2 vUV;out vec4 o;
void main(){vec3 c=vec3(0);for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++)c+=texture(uBSrc,vUV+vec2(i,j)*uTexel*1.5).rgb;c/=9.;
  float l=max(c.r,max(c.g,c.b));o=vec4(c*max(l-uThr,0.)/max(l,1e-4),1.);}`;
const FS_DOWN=`#version 300 es
precision highp float;uniform sampler2D uBSrc;uniform vec2 uTexel;in vec2 vUV;out vec4 o;
void main(){vec3 c=texture(uBSrc,vUV+uTexel*vec2(-1,-1)).rgb+texture(uBSrc,vUV+uTexel*vec2(1,-1)).rgb+texture(uBSrc,vUV+uTexel*vec2(-1,1)).rgb+texture(uBSrc,vUV+uTexel*vec2(1,1)).rgb;o=vec4(c*.25,1.);}`;
const FS_BLUR=`#version 300 es
precision highp float;uniform sampler2D uBSrc;uniform vec2 uDir;in vec2 vUV;out vec4 o;
void main(){vec3 c=texture(uBSrc,vUV).rgb*.227;c+=(texture(uBSrc,vUV+uDir*1.385).rgb+texture(uBSrc,vUV-uDir*1.385).rgb)*.316;c+=(texture(uBSrc,vUV+uDir*3.231).rgb+texture(uBSrc,vUV-uDir*3.231).rgb)*.07;o=vec4(c,1.);}`;
const FS_TONEMAP=`#version 300 es
precision highp float;uniform sampler2D uSrc;uniform sampler2D uBloom;uniform sampler2D uDof;uniform sampler2D uDepth;
uniform vec4 uFocus;uniform float uExpo;uniform float uSat;uniform float uBloomAmt;uniform vec4 uGrade0;uniform vec4 uGrade1;uniform vec4 uGrade2;uniform vec4 uGrade3;uniform float uVig;
uniform vec4 uUp;// sharper upscaling: xy source texel size, z sharpening, w on
in vec2 vUV;out vec4 o;
// Catmull-Rom bicubic from 9 bilinear taps, clamped to the 4 nearest texels so bright edges (the sun, lit windows) cannot ring
vec3 bicubic(vec2 uv,vec2 ts){vec2 sp=uv/ts,tc=floor(sp-.5)+.5,f=sp-tc;
  vec2 w0=f*(-.5+f*(1.-.5*f)),w1=1.+f*f*(-2.5+1.5*f),w2=f*(.5+f*(2.-1.5*f)),w3=f*f*(-.5+.5*f),w12=w1+w2,t0=(tc-1.)*ts,t3=(tc+2.)*ts,t12=(tc+w2/w12)*ts;
  vec3 r=(texture(uSrc,vec2(t0.x,t0.y)).rgb*w0.x+texture(uSrc,vec2(t12.x,t0.y)).rgb*w12.x+texture(uSrc,vec2(t3.x,t0.y)).rgb*w3.x)*w0.y
        +(texture(uSrc,vec2(t0.x,t12.y)).rgb*w0.x+texture(uSrc,vec2(t12.x,t12.y)).rgb*w12.x+texture(uSrc,vec2(t3.x,t12.y)).rgb*w3.x)*w12.y
        +(texture(uSrc,vec2(t0.x,t3.y)).rgb*w0.x+texture(uSrc,vec2(t12.x,t3.y)).rgb*w12.x+texture(uSrc,vec2(t3.x,t3.y)).rgb*w3.x)*w3.y;
  vec2 b=tc*ts;vec3 a0=texture(uSrc,b).rgb,a1=texture(uSrc,b+vec2(ts.x,0)).rgb,a2=texture(uSrc,b+vec2(0,ts.y)).rgb,a3=texture(uSrc,b+ts).rgb;
  return clamp(r,min(min(a0,a1),min(a2,a3)),max(max(a0,a1),max(a2,a3)));}
float lin(float d){float z=d*2.-1.;return 2.*uFocus.x*uFocus.y/(uFocus.y+uFocus.x-z*(uFocus.y-uFocus.x));}
vec3 aces(vec3 x){return clamp(x*(2.43*x+.03)/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec3 c=uUp.w>.5?bicubic(vUV,uUp.xy):texture(uSrc,vUV).rgb;vec3 sharp=vec3(0);
  // contrast-adaptive sharpening (as AMD's CAS/RCAS): the cross of source texels around, in tone-mapped space, sharpened less where
  // contrast is already high (no halos); the difference is added to the final colour
  if(uUp.w>.5&&uUp.z>0.){vec3 n=aces(texture(uSrc,vUV+vec2(0,uUp.y)).rgb*uExpo),s2=aces(texture(uSrc,vUV-vec2(0,uUp.y)).rgb*uExpo),e=aces(texture(uSrc,vUV+vec2(uUp.x,0)).rgb*uExpo),w2=aces(texture(uSrc,vUV-vec2(uUp.x,0)).rgb*uExpo),m=aces(c*uExpo);
    vec3 mn=min(m,min(min(n,s2),min(e,w2))),mx=max(m,max(max(n,s2),max(e,w2)));vec3 amp=sqrt(clamp(min(mn,1.-mx)/max(mx,1e-3),0.,1.));
    sharp=(m-(n+s2+e+w2)*.25)*amp*uUp.z*2.;}
  if(uFocus.w>0.){float z=lin(texture(uDepth,vUV).r);float coc=clamp(abs(z-uFocus.z)/max(z,1.)*1.25-.18,0.,1.);
    coc=max(coc,smoothstep(.3,.5,abs(vUV.y-.5))*.55);coc*=uFocus.w;c=mix(c,texture(uDof,vUV).rgb,clamp(coc,0.,.8));}
  if(uBloomAmt>0.)c+=texture(uBloom,vUV).rgb*uBloomAmt;
  c*=uExpo;c=aces(c);c=clamp(c+sharp,0.,1.);
  float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,uSat);
  vec3 g=c*uGrade1.rgb*uGrade0.w+uGrade0.rgb;g=pow(max(g,0.),uGrade2.rgb);float gl=dot(g,vec3(.2126,.7152,.0722));g=mix(vec3(gl),g,uGrade1.w);g*=uGrade3.rgb;
  c=mix(c,g,uGrade2.w);
  vec2 v=vUV-.5;c*=1.-dot(v,v)*(uVig+uGrade3.w)*1.1;
  c=pow(max(c,0.),vec3(1./2.2));c+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)/255.;
  o=vec4(c,1.);}`;
