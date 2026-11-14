'use strict';
// ===== shaders.js
// ===================================================================
// SHADERS — toy diorama look: flat-shaded low-poly facets, soft warm key light, big sky ambient,
// soft shadows, gentle haze, lamps that glow at night, tilt-shift and bloom in the post pass.
// All colours are written in sRGB and turned linear with L() so palettes read like a paint box.
// ===================================================================
const GLSL_HEAD=`#version 300 es
precision highp float;precision highp int;precision highp sampler2DShadow;
layout(std140) uniform Frame{mat4 uViewProj;mat4 uView;mat4 uLightVP;vec4 uCamPos;vec4 uSunDir;vec4 uSunCol;vec4 uSkyAmb;vec4 uGndAmb;vec4 uFogCol;vec4 uFogCol2;
  vec4 uWorld;vec4 uWind;vec4 uWx;vec4 uWx2;vec4 uSeason;vec4 uLook;vec4 uWater;vec4 uSkyZ;vec4 uSkyH;vec4 uMoon;vec4 uSunTrue;vec4 uTable;vec4 uMisc;vec4 uMisc2;
  vec4 uLightP[24];vec4 uLightC[24];vec4 uBolt;vec4 uCld;vec4 uCld2;};
`;
// uSunDir: key light (sun by day, moon at night) xyz, w = day 0..1 | uSunCol: key colour, w = night 0..1
// uSkyAmb w = valley shading | uGndAmb w = shadow softness | uFogCol w = density, uFogCol2 = toward the sun
// uWorld: W, N, cs, maxH | uWind: x,z dir*speed, y strength, w gust | uWx: rain, snow, wet, snowCover | uWx2: mist, flash, mistTop, overcast
// uSeason: spring, summer, autumn, winter | uLook: grassHue, rockSlope(1-cos), snowLine y, sand | uWater: green, waves, foam, ice
// uSkyZ/uSkyH: zenith/horizon, w stars/sun size | uMoon: dir, brightness | uSunTrue: sun dir, w sun above horizon
// uTable: board bottom y, floor y, table on, fascia kind | uMisc: windows lit, lightning, -, rainbow | uMisc2: lights n, -, shadow normal bias, 1/shadowRes
const GLSL_BASE=`
uniform sampler2D uHeight;uniform sampler2D uNorm;uniform sampler2D uShadowRaw;uniform sampler2D uCloudMap;uniform sampler2D uAux;uniform sampler2D uData;uniform sampler2D uWaterTex;uniform sampler2DShadow uShadow;uniform sampler2D uFields;
vec3 L(vec3 c){return c*c*(c*.31+.69);}
float hash12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float hash11(float p){p=fract(p*.1031);p*=p+33.33;p*=p+p;return fract(p);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=hash12(i),b=hash12(i+vec2(1,0)),c=hash12(i+vec2(0,1)),d=hash12(i+vec2(1,1));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float hAt(ivec2 c){int N=int(uWorld.y);c=clamp(c,ivec2(0),ivec2(N-1));return texelFetch(uHeight,c,0).r;}
float cornerH(ivec2 g){return .25*(hAt(g-ivec2(1))+hAt(g-ivec2(0,1))+hAt(g-ivec2(1,0))+hAt(g));}
float terrainH(vec2 xz){vec2 f=xz/uWorld.z-.5;vec2 i=floor(f);f-=i;ivec2 c=ivec2(i);return mix(mix(hAt(c),hAt(c+ivec2(1,0)),f.x),mix(hAt(c+ivec2(0,1)),hAt(c+ivec2(1,1)),f.x),f.y);}
`;
const GLSL_LIGHT=`
const vec2 PD[8]=vec2[8](vec2(-.61,-.33),vec2(.47,-.63),vec2(.87,.21),vec2(.08,.96),vec2(-.85,.48),vec2(-.19,-.97),vec2(.30,.34),vec2(-.36,.05));
float shadowAt(vec3 W,vec3 N){if(uMisc2.w<=0.)return 1.;float tx=uMisc2.z,nl=clamp(dot(N,uSunDir.xyz),0.,1.);
  vec4 s=uLightVP*vec4(W+N*tx*(.3+.8*(1.-nl)),1.);vec3 p=s.xyz/s.w*.5+.5;
  if(p.x<=0.||p.y<=0.||p.x>=1.||p.y>=1.||p.z>=1.)return 1.;
  float tn=min(sqrt(max(1.-nl*nl,0.))/max(nl,.1),4.),uvm=uMisc2.w/tx,rmax=tx*(2.+uGndAmb.w*6.);
  float a=hash12(gl_FragCoord.xy)*6.283;mat2 rot=mat2(cos(a),sin(a),-sin(a),cos(a));
  float zr=p.z-(.05+tx*.3+rmax*tn*.4)*uMisc.z,bs=0.,bn=0.;
  for(int i=0;i<6;i++){float z=texture(uShadowRaw,p.xy+rot*PD[i]*rmax*uvm).r;if(z<zr){bs+=z;bn+=1.;}}
  if(bn<.5)return 1.;
  float dm=(p.z-bs/bn)/uMisc.z,ls=.014+uGndAmb.w*.035+uWx2.w*.12;
  float rw=clamp(dm*ls,tx*.6,rmax),r=rw*uvm,sum=0.;float bias=(.04+tx*.2+rw*tn*.5)*uMisc.z;
  for(int i=0;i<8;i++)sum+=texture(uShadow,vec3(p.xy+rot*PD[i]*r,p.z-bias));
  vec2 e=min(p.xy,1.-p.xy);return mix(1.,sum*.125,smoothstep(0.,.05,min(e.x,e.y)));}
vec3 ambient(vec3 N){vec2 sd=normalize(uSunDir.xz+1e-4);return mix(uGndAmb.rgb,uSkyAmb.rgb,N.y*.5+.5)*(1.+.22*dot(N.xz,sd)*uSunDir.w);}
uniform sampler2D uLampMap;
vec3 pools(vec3 W,vec3 N){vec3 s=texture(uLampMap,W.xz/uWorld.x).rgb*clamp(uMisc.x,0.,1.)*(max(N.y,0.)*.7+.3);int n=int(uMisc2.x);for(int i=0;i<24;i++){if(i>=n)break;vec3 d=uLightP[i].xyz-W;float r=uLightP[i].w;float dd=dot(d,d);if(dd>r*r)continue;
  float l=sqrt(dd)+1e-3;float a=1.-l/r;a*=a;s+=uLightC[i].rgb*a*(max(dot(N,d/l),0.)*.75+.25);}return s;}
float cloudSh(vec3 W){if(uCld.y<=0.)return 1.;vec3 L=uSunDir.xyz;vec3 p=W+L*max(uCld.x+uCld.y*.3-W.y,0.)/max(L.y,.15);
  float m=texture(uCloudMap,(p.xz+uCld.z)*uCld.w).r;return 1.-clamp(m*1.5-.12,0.,.82)*min(uCld2.w,1.2);}
vec3 lightS(vec3 alb,vec3 N,vec3 W,float ao,float sh,float rough){float nl=dot(N,uSunDir.xyz);float d=clamp(nl*1.08+.02,0.,1.)*sh*cloudSh(W);
  vec3 V=normalize(uCamPos.xyz-W);rough=mix(rough,rough*.45,uWx.z);vec3 Hh=normalize(V+uSunDir.xyz);float nh=max(dot(N,Hh),0.),nv=max(dot(N,V),0.);
  float sp=exp2(10.*(1.-rough)+1.),F=.04+.96*pow(1.-max(dot(V,Hh),0.),5.);vec3 spec=uSunCol.rgb*(sp+8.)*.04*pow(nh,sp)*F*d;
  float Fv=(.04+.96*pow(1.-nv,5.))*(1.-rough)*(1.-rough);vec3 env=mix(L(uSkyH.rgb),L(uSkyZ.rgb),clamp(reflect(-V,N).y,0.,1.))*(.2+.8*uSunDir.w);
  return alb*(uSunCol.rgb*d+ambient(N)*ao+pools(W,N))*(1.-Fv)+spec+env*Fv*ao;}
vec3 light(vec3 alb,vec3 N,vec3 W,float ao,float sh){return lightS(alb,N,W,ao,sh,.82);}
vec3 lightD(vec3 alb,vec3 N,vec3 W,float ao,float sh){return lightS(alb,N,W,ao,sh,1.);}
vec3 fogc(vec3 c,vec3 W){vec3 v=W-uCamPos.xyz;float d=length(v);vec3 vd=v/max(d,1e-3);
  float hs=160.,y0=max(uCamPos.y,0.),y1=max(W.y,0.),dy=y1-y0;float hf=abs(dy)>1.?(exp(-y0/hs)-exp(-y1/hs))*hs/dy:exp(-y0/hs);
  float f=1.-exp(-d*uFogCol.w*(.25+1.2*hf));
  float yb=uWx2.z-40.,a0=max(uCamPos.y-yb,0.)/22.,a1=max(W.y-yb,0.)/22.;float I=d*(abs(a1-a0)>1e-3?(exp(-a0)-exp(-a1))/(a1-a0):exp(-a0));
  vec2 mp=mix(uCamPos.xz,W.xz,.6);float bk=.35+.9*vnoise(mp/340.+uCamPos.w*vec2(.004,.003))*vnoise(mp/120.-uCamPos.w*.006);
  float m=(1.-exp(-uWx2.x*.012*I*bk))/.55;
  vec3 fc=mix(uFogCol.rgb,uFogCol2.rgb,pow(max(dot(vd,uSunTrue.xyz),0.),5.)*uSunTrue.w);
  return mix(c,fc,clamp(f+m*.55,0.,.97));}
vec3 snowCol(vec3 N){return L(vec3(.94,.96,1.))*(.92+.08*N.y);}
`;
const GLSL_COMMON=GLSL_BASE+GLSL_LIGHT;
const FS_OUT=`layout(location=0) out vec4 o;`;

// ---------------- terrain: flat facets, paint-box palette, crisp farm fields
const VS_TERRAIN=GLSL_HEAD+GLSL_BASE+`
layout(location=0) in vec3 aG;uniform vec4 uChunk;out vec3 vW;
void main(){int N=int(uWorld.y);ivec2 g=clamp(ivec2(uChunk.xy+aG.xy*uChunk.z+.5),ivec2(0),ivec2(N));float h=cornerH(g);
  vec3 W=vec3(float(g.x)*uWorld.z,h,float(g.y)*uWorld.z);
  if(aG.z>.5){W.y-=4.+uChunk.w*2.;if(g.x==0)W.x+=.6;if(g.y==0)W.z+=.6;if(g.x==N)W.x-=.6;if(g.y==N)W.z-=.6;}
  vW=W;gl_Position=uViewProj*vec4(W,1.);}`;
// fine terrain patches (culvert trenches): positions given, shaded by the terrain fragment shader
const VS_PATCH=GLSL_HEAD+GLSL_BASE+`
layout(location=0) in vec3 aP;out vec3 vW;
void main(){vW=aP;gl_Position=uViewProj*vec4(aP,1.);}`;
const VS_TERRAIN_SH=GLSL_HEAD+GLSL_BASE+`
layout(location=0) in vec3 aG;uniform vec4 uChunk;out vec3 vW;
void main(){int N=int(uWorld.y);ivec2 g=clamp(ivec2(uChunk.xy+aG.xy*uChunk.z+.5),ivec2(0),ivec2(N));float h=cornerH(g);
  vec3 W=vec3(float(g.x)*uWorld.z,h-(aG.z>.5?6.:0.),float(g.y)*uWorld.z);vW=W;gl_Position=uLightVP*vec4(W,1.);}`;
const VS_PATCH_SH=GLSL_HEAD+GLSL_BASE+`
layout(location=0) in vec3 aP;out vec3 vW;void main(){vW=aP;gl_Position=uLightVP*vec4(aP,1.);}`;
const FS_DEPTH=GLSL_HEAD+`out vec4 o;void main(){o=vec4(0);}`;
const FS_DEPTH_T=GLSL_HEAD+GLSL_BASE+`in vec3 vW;uniform vec4 uChunk;uniform sampler2D uPatch;out vec4 o;
void main(){if(uChunk.w==0.&&texelFetch(uPatch,clamp(ivec2(floor(vW.xz/uWorld.z)),ivec2(0),ivec2(int(uWorld.y)-1)),0).r>.5)discard;o=vec4(0);}`;
const GLSL_FIELDS=`
// farm fields: id map (nearest) + exact rotated rectangles so edges are crisp, not stair-stepped
bool inField(float id,vec2 xz,out vec2 lp,out vec4 a,out vec4 b){a=vec4(0);b=vec4(0);lp=vec2(0);if(id<.5)return false;int k=int(id+.5);a=texelFetch(uFields,ivec2(k,0),0);b=texelFetch(uFields,ivec2(k,1),0);
  vec2 d=xz-a.xy;float c=cos(b.x),s=sin(b.x);lp=vec2(c*d.x+s*d.y,-s*d.x+c*d.y);return abs(lp.x)<a.z&&abs(lp.y)<a.w;}
vec3 cropCol(float crop,vec2 lp,vec4 a,float fj,float hsh){vec4 S=uSeason;float row=step(.5,fract(lp.x/3.2));float row2=step(.5,fract(lp.x/2.2));vec3 c;
  if(crop<.5){c=L(vec3(.56,.76,.30))*S.x+L(vec3(.93,.79,.38))*S.y+L(vec3(.82,.70,.45))*S.z+L(vec3(.56,.44,.32))*S.w;c*=.93+.1*row;}
  else if(crop<1.5){c=L(vec3(.56,.40,.28))*(.88+.14*row2);c=mix(c,L(vec3(.50,.70,.30))*(.9+.1*row2),S.x*.55*row2);}
  else if(crop<2.5){c=L(vec3(.52,.76,.32))*S.x+L(vec3(.48,.72,.28))*S.y+L(vec3(.62,.66,.34))*S.z+L(vec3(.50,.52,.36))*S.w;}
  else if(crop<3.5){float band=floor(lp.x/5.);float hb=hash11(band+hsh*91.);vec3 tul=hb<.25?vec3(.92,.20,.22):hb<.5?vec3(.98,.80,.20):hb<.75?vec3(.96,.48,.66):vec3(.98,.95,.92);
    vec3 green=vec3(.45,.66,.28);c=L(mix(green,tul,row*.85))*S.x+L(green)*S.y+L(vec3(.55,.42,.30))*(S.z+S.w);}
  else if(crop<4.5){c=L(vec3(.50,.68,.30))*S.x+L(vec3(.30,.55,.20))*S.y*(.9+.12*row2)+L(vec3(.78,.66,.36))*S.z*(.9+.1*row2)+L(vec3(.55,.45,.33))*S.w;}
  else{c=L(vec3(.98,.86,.18))*S.x*(.92+.1*row)+L(vec3(.44,.66,.28))*S.y+L(vec3(.60,.48,.32))*(S.z+S.w);}
  float edge=min(a.z-abs(lp.x),a.w-abs(lp.y));c=mix(L(vec3(.30,.50,.22))*(1.-S.w*.3),c,step(1.1,edge));return c*(1.+fj*.05);}
`;
const GLSL_FIELDWORK=`
vec3 soilCol(float k,vec2 lp,float fj){if(k<1.5){float fu=fract(lp.x/.45);return L(vec3(.42,.30,.21))*(.76+.34*smoothstep(.1,.5,fu)*smoothstep(.95,.55,fu))*(1.+fj*.06);}
  if(k<2.5){vec3 s=L(vec3(.80,.70,.42))*(.86+.18*step(.5,fract(lp.x/.6)));return mix(s,L(vec3(.62,.52,.34)),.35*step(.8,fract(lp.x/4.)));}
  return L(vec3(.50,.38,.27))*(.93+.07*step(.5,fract(lp.x/.25)));}
vec3 fieldCol(vec4 b,vec2 lp,vec4 a,float fj){vec3 base=cropCol(b.y,lp,a,fj,b.z);float w=b.w;if(w<.5)return base;
  float bs=floor(w/1000.),r=w-bs*1000.,tg=floor(r/100.),p=clamp((r-tg*100.)/99.,0.,1.),lanes=max(1.,ceil(2.*a.z/4.)),fl=p*lanes,cur=floor(fl),al=fract(fl),li=floor((lp.x+a.z)/4.);
  float along=mod(cur,2.)>.5?(a.w-lp.y):(lp.y+a.w);bool wk=p>.995||li<cur||(li==cur&&along<al*2.*a.w);float k=wk?tg:bs;if(k<.5)return base;
  vec3 c=soilCol(k,lp,fj);float edge=min(a.z-abs(lp.x),a.w-abs(lp.y));return mix(L(vec3(.30,.50,.22))*(1.-uSeason.w*.3),c,step(1.1,edge));}
`;
/* FS_TERRAIN_LO (Ground detail: Simple) is the same shader with TLO defined: no grass tufts, flowers, pebbles, ruts or puddles, a plain forest edge */
const FS_TERRAIN=GLSL_HEAD+GLSL_COMMON+GLSL_FIELDS+GLSL_FIELDWORK+`
uniform sampler2D uRoad;uniform float uRoadClear;uniform float uGrassVar;
vec3 setts(vec2 p){vec2 i=floor(p),f=fract(p);float d1=9.,d2=9.,id=0.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 o2=vec2(x,y);vec2 h=fract(sin(vec2(dot(i+o2,vec2(127.1,311.7)),dot(i+o2,vec2(269.5,183.3))))*43758.5453);vec2 r=o2+.08+h*.84-f;float d=dot(r,r);if(d<d1){d2=d1;d1=d;id=h.x;}else if(d<d2)d2=d;}return vec3(sqrt(d2)-sqrt(d1),id,sqrt(d1));}
in vec3 vW;uniform float uStep;uniform vec4 uChunk;uniform sampler2D uPatch;`+FS_OUT+`
float rn(vec2 p,float a){float c=cos(a),s=sin(a);return vnoise(mat2(c,-s,s,c)*p);}// value noise turned, so no octave lines up with the 8 m grid
void main(){vec3 W=vW;
  // a cell replaced by a finer patch (a culvert trench): the full-detail terrain leaves it open, the patch fills it exactly
  if(uChunk.w==0.&&texelFetch(uPatch,clamp(ivec2(floor(W.xz/uWorld.z)),ivec2(0),ivec2(int(uWorld.y)-1)),0).r>.5)discard;
  vec3 N=normalize(cross(dFdx(W),dFdy(W)));if(N.y<0.)N=-N;
  vec2 uv=W.xz/uWorld.x;vec4 aux=texture(uAux,uv);if(aux.a>.95)discard;vec4 dat=texture(uData,uv);
  float wet=dat.r,shore=dat.b,forest=dat.a,tm=aux.a/.9;
  vec2 cg=W.xz/uStep;vec2 ci=floor(cg);vec2 cf=cg-ci;float tri=step(1.,cf.x+cf.y);float fj=hash12(ci*1.37+tri*17.1)-.5;
  vec3 Ns=normalize(texture(uNorm,uv).xyz*2.-1.);float slope=mix(1.-Ns.y,1.-N.y,.2),alt=W.y/uWorld.w;vec4 S=uSeason;
  float n1=rn(W.xz/110.,.6),n2=rn(W.xz/31.+7.3,1.1);
  // forest shade: the 8 m forest map read four times around a wandering point, so its edge is a soft, irregular line, not cell steps
#ifndef TLO
  {vec2 wo=(vec2(rn(W.xz/26.,.4),rn(W.xz/26.+4.1,1.3))-.5)*uWorld.z*1.8,fu=(W.xz+wo)/uWorld.x;float px=uWorld.z/uWorld.x*.8;
    forest=(texture(uData,fu+vec2(px,0)).a+texture(uData,fu-vec2(px,0)).a+texture(uData,fu+vec2(0,px)).a+texture(uData,fu-vec2(0,px)).a)*.25;}
#endif
  vec3 g0=vec3(.56,.76,.34)*S.x+vec3(.47,.68,.30)*S.y+vec3(.68,.64,.32)*S.z+vec3(.56,.55,.40)*S.w;
  g0=mix(g0,g0*vec3(1.12,1.,.78),clamp(uLook.x,0.,1.));g0=mix(g0,g0*vec3(.82,1.05,.9),clamp(-uLook.x,0.,1.));
  // grass colour at three scales (uGrassVar): regions lush or dry (km), meadow patches (tens of metres), tufts (metres, faded out where a pixel covers them)
#ifdef TLO
  // Ground detail: Simple: one broad noise for lush and dry regions instead of the three-scale grass
  vec3 c=L(g0*mix(vec3(1.),vec3(1.12,1.,.76),clamp(rn(W.xz/900.+vec2(3.7,1.1),.3)*1.6-.6,0.,1.)*.6*uGrassVar))*(.9+.16*n1);
#else
  vec3 c;{vec2 gp=W.xz;float fw=length(fwidth(gp));
    float reg=rn(gp/1500.+vec2(3.7,1.1),.3)*.6+rn(gp/560.+9.2,.9)*.4,hue=rn(gp/230.+vec2(1.3,5.1),1.4);
    vec2 wq=gp/34.+vec2(rn(gp/21.,.7),rn(gp/21.+5.3,1.9))*1.7;float pt=(rn(wq,.5)*.5+rn(wq*2.1+2.,1.2)*.3+rn(wq*4.3+7.,2.1)*.2-.5)*(1.-smoothstep(4.,14.,fw));
    float clump=(rn(gp/2.3+vec2(rn(gp/.9,.8),0.)*.6,.35)*.6+rn(gp/1.1+3.,1.7)*.4-.5)*(1.-smoothstep(.3,1.2,fw)),straw=smoothstep(.6,.86,rn(gp/.75+3.1,.9))*(1.-smoothstep(.1,.4,fw));
    float sunny=dot(Ns.xz,vec2(.6,-.8))*smoothstep(.02,.18,1.-Ns.y);// slopes that face the sun dry out
    float dry=clamp((reg-.5)*2.2+sunny*1.6+pt*1.5-wet*.8-forest*.5,-1.,1.)*uGrassVar*(1.+S.z*.5);
    vec3 gc=g0*mix(vec3(1.),dry>0.?vec3(1.15,1.0,.74):vec3(.8,.99,.9),min(abs(dry),1.)*.72);
    gc=mix(gc,gc*vec3(1.07,1.02,.84),clamp((hue-.5)*1.8*uGrassVar,-.7,.7));
    gc*=1.-clump*.3*uGrassVar;gc=mix(gc,gc*vec3(1.22,1.12,.66),straw*.45*uGrassVar*(1.-S.w));// lusher and paler tufts, straw flecks
    c=L(gc)*(.9+.16*n1)*(1.+pt*.24*uGrassVar);}
#endif
  c=mix(c,L(vec3(.38,.57,.25)*(1.-S.z*.1)+vec3(.12,.04,0)*S.z),smoothstep(.15,.75,forest)*.5);
  c=mix(c,L(vec3(.40,.62,.30)),clamp(wet*1.3-.3,0.,1.)*.45*(1.-S.w*.5));
  c=mix(c,L(vec3(.66,.68,.38)),smoothstep(.5,.72,alt+n2*.06)*(1.-S.w*.4));
#ifndef TLO
  {vec2 fq=W.xz/.42,fc=floor(fq);float fl=hash12(fc),near=1.-smoothstep(.06,.18,length(fwidth(W.xz)));// spring flowers: small dots in the grass up close
    if(S.x>.25&&fl<.06*S.x*(1.-forest)&&slope<.2&&length(fract(fq)-.5-(hash12(fc+3.1)-.5)*.4)<.16)c=mix(c,L(fl<.025?vec3(.98,.90,.40):vec3(.97,.97,.95)),near);}
#endif
  ivec2 tc=ivec2(W.xz/uWorld.z);float fid=texelFetch(uAux,tc,0).g*255.;vec2 lp;vec4 fa,fb;bool hit=inField(fid,W.xz,lp,fa,fb);
  if(!hit){for(int k=0;k<4;k++){ivec2 o2=k==0?ivec2(1,0):k==1?ivec2(-1,0):k==2?ivec2(0,1):ivec2(0,-1);float f2=texelFetch(uAux,tc+o2,0).g*255.;if(abs(f2-fid)>.5&&inField(f2,W.xz,lp,fa,fb)){hit=true;break;}}}
  if(hit&&slope<.3)c=fieldCol(fb,lp,fa,fj);
  c=mix(c,L(vec3(.78,.70,.56))*(1.+fj*.06),smoothstep(.45,.75,aux.b));
  c=mix(c,L(vec3(.92,.84,.62))*(1.+fj*.05),smoothstep(.45,.8,shore)*min(uLook.w,1.)*smoothstep(.35,.15,slope));
  c=mix(c,L(vec3(.66,.52,.36))*(1.+fj*.08),smoothstep(.2,.7,tm)*.85);
#ifdef TLO
  float n3=.5;
#else
  float n3=vnoise(W.xz/5.3+3.1);
#endif
 float rk=smoothstep(uLook.y-.07,uLook.y+.06,slope+n2*.05+(n3-.5)*.07);float band=smoothstep(.3,.7,sin(W.y*.16+n1*5.)*.5+.5);
  vec3 rock=mix(L(vec3(.62,.58,.54)),L(vec3(.70,.66,.60)),band)*(1.+fj*.14);rock=mix(rock,L(vec3(.56,.52,.50)),smoothstep(.6,1.,alt)*.3);
  c=mix(c,rock,rk);
  {vec2 f=W.xz/uWorld.z-.5;vec2 i0=floor(f);f-=i0;ivec2 c0=ivec2(i0);int NM=int(uWorld.y)-1;float pr=0.,lv=0.;
    for(int k=0;k<4;k++){ivec2 o2=ivec2(k&1,k>>1);vec4 w=texelFetch(uWaterTex,clamp(c0+o2,ivec2(0),ivec2(NM)),0);float wg=(o2.x==1?f.x:1.-f.x)*(o2.y==1?f.y:1.-f.y);pr+=step(.5,w.a)*wg;lv+=w.r*wg;}
    float under=smoothstep(0.,.5,lv-W.y);c=mix(c,L(vec3(.50,.50,.38))*(1.+fj*.05),smoothstep(.15,.7,pr)*under*.65);c*=1.-.16*smoothstep(.05,.5,pr)*(1.-under)*(1.-rk);}
  // cobbled roads: signed distance to the road edge from a world texture, so roads lie in the ground and merge cleanly
  float rcov=0.,rdd=4.;{vec2 rdv=texture(uRoad,W.xz/uWorld.x).rg;float rd=rdv.r;rdd=rd;if(rd<.5&&rdv.g>.5){// gravel: pebbly, two wheel ruts, a little grass on the crown
    float fw=fwidth(rd)+.03,cov=1.-smoothstep(-fw,fw,rd),pb=vnoise(W.xz*6.)*.6+vnoise(W.xz*17.)*.4;vec3 gv=L(mix(vec3(.50,.45,.37),vec3(.66,.60,.50),pb));
    gv*=1.-.22*smoothstep(.18,0.,abs(rd+.42));gv=mix(gv,L(vec3(.36,.46,.22)),smoothstep(-1.15,-1.35,rd)*.55);gv*=1.-uWx.z*.25;c=mix(c,gv,cov);rcov=cov*.5;}

#ifdef TLO
  else if(rd<.5){float fw=fwidth(rd)+.04,cov=1.-smoothstep(-fw-.05,fw+.05,rd);vec3 sa=L(vec3(.68,.59,.44))*(1.-.14*smoothstep(-.45,0.,rd));c=mix(c,sa,cov);rcov=cov;}
#else
  else if(rd<.5){// packed sand: a ragged edge where the grass creeps in, worn wheel ruts, a grassy crown on wide roads, scattered pebbles, puddles when wet
    float wob=(vnoise(W.xz*.8)-.5)*.42+(vnoise(W.xz*3.3)-.5)*.16,e=rd+wob,fw=fwidth(rd)+.04,cov=1.-smoothstep(-fw-.08,fw+.08,e);
    float m1=vnoise(W.xz*.9),m2=vnoise(W.xz*5.),m3=vnoise(W.xz*19.);vec3 sa=L(mix(vec3(.62,.53,.39),vec3(.74,.65,.49),m1))*(.88+.14*m2)*(.93+.1*m3);
    float rut=smoothstep(.24,.04,abs(rd+.62+(vnoise(W.xz*.5)-.5)*.12))*smoothstep(-.25,-.45,rd);sa*=1.-.2*rut;sa=mix(sa,L(vec3(.52,.44,.33)),rut*.35);
    sa=mix(sa,L(vec3(.40,.52,.24))*(.85+.3*m2),smoothstep(-1.15,-1.45,rd)*smoothstep(.35,.6,vnoise(W.xz*2.6))*.75);
    sa*=1.-.14*smoothstep(-.45,0.,e);sa=mix(sa,L(vec3(.40,.36,.30)),smoothstep(.25,.6,m2)*.12);
    {vec2 pp=W.xz/.11;vec3 p3=setts(pp);float near=1.-smoothstep(.3,1.,length(fwidth(pp)));float pb=step(.88,p3.y)*smoothstep(.3,.18,p3.z)*near;sa=mix(sa,L(mix(vec3(.5,.47,.42),vec3(.64,.6,.53),fract(p3.y*13.))),pb*.6);}
    float pud=smoothstep(.52,.66,vnoise(W.xz*.45+3.))*max(rut,smoothstep(-.3,-.8,rd)*.5)*clamp(uWx.z*1.4,0.,1.);sa=mix(sa*(1.-uWx.z*.3),L(vec3(.32,.34,.36)),pud*.7);
    c=mix(c,sa,cov);rcov=cov;}
#endif
  }
  float cap=smoothstep(uLook.z-25.,uLook.z+10.,W.y+n2*35.)*smoothstep(.9,.45,slope);
  float sw=uWx.w*1.45-slope*.95-n2*.45-n1*.3,sc=max(cap,smoothstep(0.,.22,sw));// snow builds up in patches, flats first
  float clr=smoothstep(-.1,.1,uRoadClear*1.25-vnoise(W.xz/55.)*.9-.12);sc*=1.-rcov*clr*smoothstep(-.3,-.6,rdd)*.93;sc=max(sc,min(uWx.w*1.4,1.)*clr*smoothstep(-.75,-.4,rdd)*smoothstep(.7,.15,rdd));// shovelled lanes, banks at the edges
  c=mix(c,snowCol(N)*(1.+fj*.03),clamp(sc,0.,1.));
  c*=1.-uWx.z*.22*(1.-sc);
  float ao=mix(1.,aux.r*1.6,uSkyAmb.w*.8)*(1.-forest*.12);
  vec3 col=lightS(c,N,W,ao,shadowAt(W,N),mix(mix(.92,.7,rk),.5,clamp(sc,0.,1.)));
  o=vec4(fogc(col,W),1.);}`;

// ---------------- board edge: soil cross-section above a painted fascia
const VS_WALL=GLSL_HEAD+GLSL_BASE+`
layout(location=0) in vec3 aE;out vec3 vW;out float vD;flat out vec3 vN;
void main(){int N=int(uWorld.y);int side=int(aE.z+.5);float t=aE.x;int gi=int(t*float(N)+.5);ivec2 g;vec3 n;
  if(side==0){g=ivec2(gi,0);n=vec3(0,0,-1);}else if(side==1){g=ivec2(N,gi);n=vec3(1,0,0);}else if(side==2){g=ivec2(N-gi,N);n=vec3(0,0,1);}else{g=ivec2(0,N-gi);n=vec3(-1,0,0);}
  float top=cornerH(g);vec3 p=vec3(float(g.x)*uWorld.z,0.,float(g.y)*uWorld.z);p.y=aE.y>.5?top:uTable.x;vD=top-p.y;vW=p;vN=n;gl_Position=uViewProj*vec4(p,1.);}`;
const VS_WALL_SH=GLSL_HEAD+GLSL_BASE+`
layout(location=0) in vec3 aE;
void main(){int N=int(uWorld.y);int side=int(aE.z+.5);int gi=int(aE.x*float(N)+.5);ivec2 g;
  if(side==0)g=ivec2(gi,0);else if(side==1)g=ivec2(N,gi);else if(side==2)g=ivec2(N-gi,N);else g=ivec2(0,N-gi);
  vec3 p=vec3(float(g.x)*uWorld.z,aE.y>.5?cornerH(g):uTable.x,float(g.y)*uWorld.z);gl_Position=uLightVP*vec4(p,1.);}`;
const FS_WALL=GLSL_HEAD+GLSL_COMMON+`
in vec3 vW;in float vD;flat in vec3 vN;`+FS_OUT+`
void main(){vec3 W=vW;float d=vD;float n=vnoise(vec2(W.x+W.z,W.y)*vec2(.05,.12));vec3 c;float fy=W.y-uTable.x;
  int fk=int(uTable.w+.5);vec3 fas=fk==0?vec3(.20,.36,.27):fk==1?vec3(.62,.43,.26):vec3(.10,.10,.11);
  if(fy<16.){c=L(fas);if(fk==1)c*=.9+.1*sin(W.y*3.+(W.x+W.z)*.1);if(fy>14.4)c=L(min(fas*1.35+.08,vec3(1.)));}
  else if(d<.9)c=L(vec3(.47,.72,.28)*(1.-uSeason.w*.2)+vec3(.2,.1,0.)*uSeason.z);
  else if(d<4.+n*2.)c=L(vec3(.42,.29,.19));
  else{float b=sin(W.y*.28+n*5.)*.5+.5,b2=step(.82,fract(W.y*.07+n));c=mix(L(vec3(.56,.44,.33)),L(vec3(.66,.58,.48)),b);c=mix(c,L(vec3(.50,.47,.45)),b2*.7);}
  if(d<.9&&fy>=16.)c=mix(c,snowCol(vec3(0,1,0)),uWx.w);
  vec3 col=light(c,vN,W,1.,shadowAt(W,vN));o=vec4(fogc(col,W),1.);}`;

// ---------------- instanced low-poly objects: trees, rocks, houses, mills, lamps, people, animals, birds, boats
// kinds: 0 spruce 1 broadleaf 2 bush 3 pine 4 birch 5 rock | 10 buildings 11 mill sails 12 birds 13 people/animals 14 floating
const FS_TERRAIN_LO=FS_TERRAIN.replace('\n','\n#define TLO 1\n');
