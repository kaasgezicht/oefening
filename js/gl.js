'use strict';
// ===== gl.js
// ===================================================================
// GL LAYER — math, context, capability probe, program/texture helpers
// ===================================================================
const M4={
  ident(){const m=new Float32Array(16);m[0]=m[5]=m[10]=m[15]=1;return m;},
  mul(a,b,o){o=o||new Float32Array(16);const r=new Float32Array(16);
    for(let c=0;c<4;c++)for(let rr=0;rr<4;rr++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+rr]*b[c*4+k];r[c*4+rr]=s;}o.set(r);return o;},
  persp(fovy,asp,n,f){const t=1/Math.tan(fovy/2),m=new Float32Array(16);m[0]=t/asp;m[5]=t;m[10]=(f+n)/(n-f);m[11]=-1;m[14]=2*f*n/(n-f);return m;},
  ortho(l,r,b,t,n,f){const m=new Float32Array(16);m[0]=2/(r-l);m[5]=2/(t-b);m[10]=-2/(f-n);m[12]=-(r+l)/(r-l);m[13]=-(t+b)/(t-b);m[14]=-(f+n)/(f-n);m[15]=1;return m;},
  lookAt(e,c,u){let zx=e[0]-c[0],zy=e[1]-c[1],zz=e[2]-c[2];let l=Math.hypot(zx,zy,zz);zx/=l;zy/=l;zz/=l;
    let xx=u[1]*zz-u[2]*zy,xy=u[2]*zx-u[0]*zz,xz=u[0]*zy-u[1]*zx;l=Math.hypot(xx,xy,xz);xx/=l;xy/=l;xz/=l;
    const yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;const m=new Float32Array(16);
    m[0]=xx;m[1]=yx;m[2]=zx;m[4]=xy;m[5]=yy;m[6]=zy;m[8]=xz;m[9]=yz;m[10]=zz;
    m[12]=-(xx*e[0]+xy*e[1]+xz*e[2]);m[13]=-(yx*e[0]+yy*e[1]+yz*e[2]);m[14]=-(zx*e[0]+zy*e[1]+zz*e[2]);m[15]=1;return m;},
  inv(m){const a=m,o=new Float32Array(16);
    const b00=a[0]*a[5]-a[1]*a[4],b01=a[0]*a[6]-a[2]*a[4],b02=a[0]*a[7]-a[3]*a[4],b03=a[1]*a[6]-a[2]*a[5],b04=a[1]*a[7]-a[3]*a[5],b05=a[2]*a[7]-a[3]*a[6],
      b06=a[8]*a[13]-a[9]*a[12],b07=a[8]*a[14]-a[10]*a[12],b08=a[8]*a[15]-a[11]*a[12],b09=a[9]*a[14]-a[10]*a[13],b10=a[9]*a[15]-a[11]*a[13],b11=a[10]*a[15]-a[11]*a[14];
    let d=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;if(!d)return o;d=1/d;
    o[0]=(a[5]*b11-a[6]*b10+a[7]*b09)*d;o[1]=(a[2]*b10-a[1]*b11-a[3]*b09)*d;o[2]=(a[13]*b05-a[14]*b04+a[15]*b03)*d;o[3]=(a[10]*b04-a[9]*b05-a[11]*b03)*d;
    o[4]=(a[6]*b08-a[4]*b11-a[7]*b07)*d;o[5]=(a[0]*b11-a[2]*b08+a[3]*b07)*d;o[6]=(a[14]*b02-a[12]*b05-a[15]*b01)*d;o[7]=(a[8]*b05-a[10]*b02+a[11]*b01)*d;
    o[8]=(a[4]*b10-a[5]*b08+a[7]*b06)*d;o[9]=(a[1]*b08-a[0]*b10-a[3]*b06)*d;o[10]=(a[12]*b04-a[13]*b02+a[15]*b00)*d;o[11]=(a[9]*b02-a[8]*b04-a[11]*b00)*d;
    o[12]=(a[5]*b07-a[4]*b09-a[6]*b06)*d;o[13]=(a[0]*b09-a[1]*b07+a[2]*b06)*d;o[14]=(a[13]*b01-a[12]*b03-a[14]*b00)*d;o[15]=(a[8]*b03-a[9]*b01+a[10]*b00)*d;return o;},
  xform(m,x,y,z,w){return[m[0]*x+m[4]*y+m[8]*z+m[12]*w,m[1]*x+m[5]*y+m[9]*z+m[13]*w,m[2]*x+m[6]*y+m[10]*z+m[14]*w,m[3]*x+m[7]*y+m[11]*z+m[15]*w];}
};
function frustumPlanes(m){const p=[];const r=(a,b,c,d)=>{const l=Math.hypot(a,b,c);p.push([a/l,b/l,c/l,d/l]);};
  r(m[3]+m[0],m[7]+m[4],m[11]+m[8],m[15]+m[12]);r(m[3]-m[0],m[7]-m[4],m[11]-m[8],m[15]-m[12]);
  r(m[3]+m[1],m[7]+m[5],m[11]+m[9],m[15]+m[13]);r(m[3]-m[1],m[7]-m[5],m[11]-m[9],m[15]-m[13]);
  r(m[3]+m[2],m[7]+m[6],m[11]+m[10],m[15]+m[14]);r(m[3]-m[2],m[7]-m[6],m[11]-m[10],m[15]-m[14]);return p;}
function boxVisible(pl,x0,y0,z0,x1,y1,z1){for(const p of pl){const x=p[0]>0?x1:x0,y=p[1]>0?y1:y0,z=p[2]>0?z1:z0;if(p[0]*x+p[1]*y+p[2]*z+p[3]<0)return false;}return true;}

let gl=null;const CAPS={};
function initGL(canvas){
  gl=canvas.getContext('webgl2',{antialias:false,alpha:false,depth:true,stencil:false,powerPreference:'high-performance',preserveDrawingBuffer:false});
  if(!gl)throw new Error('WebGL2 is not available in this browser');
  const ext=n=>gl.getExtension(n);
  CAPS.floatRT=!!ext('EXT_color_buffer_float');
  CAPS.halfRT=CAPS.floatRT||!!ext('EXT_color_buffer_half_float');
  CAPS.floatLinear=!!ext('OES_texture_float_linear');
  CAPS.aniso=ext('EXT_texture_filter_anisotropic');
  CAPS.timer=!!ext('EXT_disjoint_timer_query_webgl2');
  const dbg=ext('WEBGL_debug_renderer_info');
  CAPS.renderer=dbg?gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
  CAPS.vendor=dbg?gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR);
  CAPS.maxTex=gl.getParameter(gl.MAX_TEXTURE_SIZE);CAPS.maxLayers=gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS);
  CAPS.vtxUnits=gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);CAPS.fragUnits=gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
  CAPS.maxSamples=gl.getParameter(gl.MAX_SAMPLES);CAPS.maxDraw=gl.getParameter(gl.MAX_DRAW_BUFFERS);
  CAPS.hp=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT).precision;
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();Log.err('WebGL context LOST');if(App.ctxLost)return;App.ctxLost=true;
    try{const sn=Bench.on&&Bench.backup?{...Bench.backup}:snapshot();if(+sn.params.shadowRes>2048)sn.params.shadowRes=2048;sn.recoverLog=Log.lines?Log.lines.slice(-60):[];localStorage.setItem('trein.recover',JSON.stringify(sn));}catch(err){}
    try{UI.toast('The phone reset the graphics — your game is saved');}catch(err){}
    setTimeout(()=>{if(App.ctxBack)return;$('#errMsg').textContent='The phone reset the graphics. Your game is saved. Tap Restart. If that fails, close this tab completely (or force-stop Chrome) and open the file again.';$('#err').hidden=false;
      if(!$('#errRestart')){const rb=document.createElement('button');rb.id='errRestart';rb.textContent='Restart';rb.style.marginLeft='8px';rb.onclick=()=>location.reload();$('#errLog').after(rb);}},4000);},false);
  canvas.addEventListener('webglcontextrestored',()=>{App.ctxBack=true;Log.warn('WebGL context restored');location.reload();},false);
}
async function probeEnvironment(){
  Log.info(`Trein ${VERSION} — ${navigator.userAgent}`);
  Log.info(`screen ${screen.width}x${screen.height} dpr ${devicePixelRatio} viewport ${innerWidth}x${innerHeight} touch ${IS_TOUCH} cores ${navigator.hardwareConcurrency} mem ${navigator.deviceMemory||'?'}GB`);
  Log.info(`GPU ${CAPS.vendor} / ${CAPS.renderer}`);
  Log.info(`GL maxTex ${CAPS.maxTex} layers ${CAPS.maxLayers} vtxUnits ${CAPS.vtxUnits} fragUnits ${CAPS.fragUnits} drawBuffers ${CAPS.maxDraw} highp bits ${CAPS.hp}`);
  Log.info(`ext floatRT ${CAPS.floatRT} halfRT ${CAPS.halfRT} floatLinear ${CAPS.floatLinear} aniso ${!!CAPS.aniso} gpuTimer ${CAPS.timer}`);
  Log.info(`ext list: ${gl.getSupportedExtensions().join(',')}`);
  // environment features later steps rely on (the groovebox host blocked AudioWorklet modules)
  let ls=false;try{localStorage.setItem('trein.t','1');localStorage.removeItem('trein.t');ls=true;}catch(e){}
  let worker=false;try{const u=URL.createObjectURL(new Blob(['postMessage(1)'],{type:'text/javascript'}));const w=new Worker(u);
    worker=await new Promise(r=>{const t=setTimeout(()=>r(false),1500);w.onmessage=()=>{clearTimeout(t);r(true);};w.onerror=()=>{clearTimeout(t);r(false);};});w.terminate();URL.revokeObjectURL(u);}catch(e){worker=false;}
  CAPS.blobWorker=worker;
  const AC=window.AudioContext||window.webkitAudioContext;
  Log.info(`env localStorage ${ls} blobWorker ${worker} AudioContext ${!!AC} audioWorklet ${!!(AC&&AC.prototype&&'audioWorklet' in AC.prototype)} secure ${window.isSecureContext} proto ${location.protocol}`);
}

// ---- shaders
// Texture unit plan (bound once, shared by every program)
const TU={uPatch:28,uCloudMap:14,uNoise3:15,uCldTex:16,uMistMap:17,uSceneCol:18,uWDisp:19,uWDeriv:21,uRoad:25,uTrackClear:26,uLampMap:27,uShadowRaw:13,uNorm:12,uHeight:0,uAux:1,uData:2,uWaterTex:3,uShadow:4,uFields:5,uDepthCopy:6,uSrc:7,uBloom:8,uDof:9,uDepth:10,uBSrc:11};
const PROGS=[];
// Texture reads at full precision in every shader. WebGL2 gives sampler2D LOW precision unless told otherwise; desktop GPUs ignore that,
// phone GPUs (Mali) do not: the scene depth, terrain heights and water levels then arrive rounded to about 3 digits (bands in the lakes,
// stripes in the shore foam, on the phone only). The line is put after #version in every shader.
const SAMP_HI='precision highp sampler2D;precision highp sampler3D;precision highp sampler2DArray;precision highp sampler2DShadow;precision highp samplerCube;\n';
// Test mode (open the file with ?lowp=1): shows what a phone GPU does WITHOUT that line, on any machine: every sampler2D read is
// rounded to a 16-bit float (10 bits of mantissa), as a mediump value is on Mali.
const LOWP_SIM=/[?&]lowp=1/.test(location.search);
const LOWP_GLSL=t=>SAMP_HI+`precision highp float;precision highp int;
float q16(float x){if(x==0.)return 0.;float m=exp2(floor(log2(abs(x)))-10.);return floor(x/m+.5)*m;}
vec4 q16(vec4 v){return vec4(q16(v.x),q16(v.y),q16(v.z),q16(v.w));}
vec4 lpTex(sampler2D s,vec2 u){return q16(texture(s,u));}`+(t?`vec4 lpTex(sampler2D s,vec2 u,float b){return q16(texture(s,u,b));}`:``)+`
vec4 lpTex(sampler3D s,vec3 u){return texture(s,u);}vec4 lpTex(sampler2DArray s,vec3 u){return texture(s,u);}float lpTex(sampler2DShadow s,vec3 u){return texture(s,u);}
vec4 lpFetch(sampler2D s,ivec2 c,int l){return q16(texelFetch(s,c,l));}vec4 lpFetch(sampler2DArray s,ivec3 c,int l){return texelFetch(s,c,l);}
vec4 lpLod(sampler2D s,vec2 u,float l){return q16(textureLod(s,u,l));}vec4 lpLod(sampler2DArray s,vec3 u,float l){return textureLod(s,u,l);}vec4 lpLod(sampler3D s,vec3 u,float l){return textureLod(s,u,l);}
#define texture lpTex
#define texelFetch lpFetch
#define textureLod lpLod
`;
function shaderHead(type,src){if(src.slice(0,15)!=='#version 300 es')return src;const i=src.indexOf('\n');return src.slice(0,i+1)+(LOWP_SIM?LOWP_GLSL(type===gl.FRAGMENT_SHADER):SAMP_HI)+src.slice(i+1);}
function compile(type,src,name){src=shaderHead(type,src);const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const log=gl.getShaderInfoLog(s);const ls=src.split('\n');
    const m=/0:(\d+)/.exec(log);let ctx='';if(m){const ln=+m[1];for(let i=Math.max(1,ln-3);i<=Math.min(ls.length,ln+2);i++)ctx+=`\n${i===ln?'>>':'  '}${i}: ${ls[i-1]}`;}
    Log.err(`shader ${name} (${type===gl.VERTEX_SHADER?'vs':'fs'}) failed: ${log}${ctx}`);throw new Error('shader compile failed: '+name);}
  return s;}
function makeProgram(name,vs,fs){
  const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,vs,name));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fs,name));gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)){Log.err(`program ${name} link failed: ${gl.getProgramInfoLog(p)}`);throw new Error('link failed '+name);}
  const bi=gl.getUniformBlockIndex(p,'Frame');if(bi!==gl.INVALID_INDEX)gl.uniformBlockBinding(p,bi,0);
  gl.useProgram(p);const n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);
  for(let i=0;i<n;i++){const u=gl.getActiveUniform(p,i);const base=u.name.replace(/\[0\]$/,'');if(TU[base]!==undefined)gl.uniform1i(gl.getUniformLocation(p,u.name),TU[base]);}
  const locs={};const prog={p,name,u:k=>{if(!(k in locs))locs[k]=gl.getUniformLocation(p,k);return locs[k];}};PROGS.push(prog);return prog;}

// all texture creation happens on a scratch unit so it never clobbers the fixed unit plan
const SCRATCH_TU=20;function scratch(){gl.activeTexture(gl.TEXTURE0+SCRATCH_TU);}
function tex2D(w,h,ifmt,fmt,type,data,filter,wrap){scratch();const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
  gl.texImage2D(gl.TEXTURE_2D,0,ifmt,w,h,0,fmt,type,data||null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,filter||gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,(filter===gl.LINEAR_MIPMAP_LINEAR?gl.LINEAR:filter)||gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,wrap||gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,wrap||gl.CLAMP_TO_EDGE);t.w=w;t.h=h;return t;}
function bindTU(unit,target,t){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(target,t);}
function fbo(colors,depth){const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);const bufs=[];
  colors.forEach((c,i)=>{if(c.layer!==undefined)gl.framebufferTextureLayer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0+i,c.tex,0,c.layer);else gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0+i,gl.TEXTURE_2D,c.tex||c,0);bufs.push(gl.COLOR_ATTACHMENT0+i);});
  if(depth){if(depth.isTex)gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,depth.t,0);else gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);}
  gl.drawBuffers(bufs.length?bufs:[gl.NONE]);if(!bufs.length)gl.readBuffer(gl.NONE);
  const st=gl.checkFramebufferStatus(gl.FRAMEBUFFER);if(st!==gl.FRAMEBUFFER_COMPLETE)Log.err('framebuffer incomplete 0x'+st.toString(16));
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);return f;}
function depthRB(w,h){const r=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,r);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,w,h);return r;}
// grid mesh for terrain/water chunks: (u,v,skirt) with a skirt ring
const GRIDS={};
function gridMesh(n){if(GRIDS[n])return GRIDS[n];const v=[],idx=[];const s=n+3;// includes skirt ring
  for(let j=0;j<s;j++)for(let i=0;i<s;i++){const ii=Math.min(Math.max(i-1,0),n),jj=Math.min(Math.max(j-1,0),n);const sk=(i===0||j===0||i===s-1||j===s-1)?1:0;v.push(ii/n,jj/n,sk);}
  for(let j=0;j<s-1;j++)for(let i=0;i<s-1;i++){const a=j*s+i,b=a+1,c=a+s,d=c+1;idx.push(a,c,b,b,c,d);}
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array(idx),gl.STATIC_DRAW);gl.bindVertexArray(null);
  return GRIDS[n]={vao,count:idx.length,tris:idx.length/3};}
let FSTRI=null;function fsTri(){if(!FSTRI){FSTRI=gl.createVertexArray();}gl.bindVertexArray(FSTRI);gl.drawArrays(gl.TRIANGLES,0,3);Stats.draws++;}
