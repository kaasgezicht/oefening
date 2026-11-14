'use strict';
// ===== render.js
// ===================================================================
// RENDER — the toy diorama. One soft shadow map around the focus point, flat-shaded terrain chunks,
// a model-railway board with a painted fascia on a table, instanced low-poly trees, buildings and
// critters, glassy water, cotton-wool clouds, mist banks, glow and a tilt-shift finish.
// ===================================================================
const Stats={draws:0,tris:0,chunks:0,objs:0,trees:0};
const R={world:null,U:new Float32Array(336),veh:null,sun:{day:1,L:[0,1,0]},tw:0,th:0,vegKey:'',focus:[1024,0,1024],focusDist:600};
const srgb=c=>c.map(v=>Math.pow(Math.max(v,0),2.2));
R.bindSh=function(t){if(!R.rawSmp){R.rawSmp=gl.createSampler();for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.NEAREST],[gl.TEXTURE_MAG_FILTER,gl.NEAREST],[gl.TEXTURE_COMPARE_MODE,gl.NONE],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.samplerParameteri(R.rawSmp,k,v);gl.bindSampler(TU.uShadowRaw,R.rawSmp);}
  bindTU(TU.uShadow,gl.TEXTURE_2D,t);bindTU(TU.uShadowRaw,gl.TEXTURE_2D,t);};
const mixv=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);

// ---------------- sun, moon, sky colours from time, season and weather
function seasonW(){return Weather.seasonW||[0,1,0,0];}
function sunState(){const S=seasonW(),t=P.timeOfDay;
  const rise=6.4*S[0]+5.2*S[1]+6.8*S[2]+8.0*S[3],set=19.6*S[0]+21.4*S[1]+18.4*S[2]+16.4*S[3];
  const elMax=P.sunElevMax*(0.85*S[0]+1.08*S[1]+0.78*S[2]+0.55*S[3])*Math.PI/180;
  let u;if(t>=rise&&t<=set)u=(t-rise)/(set-rise);else{const nl=24-(set-rise);let k=t>set?t-set:t+24-set;u=1+k/nl;}
  const el=u<=1?elMax*Math.sin(Math.PI*u):-0.45*Math.sin(Math.PI*(u-1));
  const az=(u<=1?u:u-1)*Math.PI+P.sunRotate*Math.PI/180+(u>1?Math.PI:0);
  const sun=[Math.cos(az)*Math.cos(el),Math.sin(el),Math.sin(az)*Math.cos(el)];
  const mel=u>1?0.25+0.55*Math.sin(Math.PI*(u-1)):-0.3,maz=az+Math.PI*(u>1?0:1)+0.6;
  const moon=[Math.cos(maz)*Math.cos(mel),Math.sin(mel),Math.sin(maz)*Math.cos(mel)];
  return{sun,moon,u};}
R.atmos=function(){const st=sunState(),E=Weather.eff(),sy=st.sun[1],oc=clamp(E.overcast,0,1);
  const day=smooth(-0.06,0.22,sy),gold=smooth(-0.08,0.04,sy)*(1-smooth(0.08,0.4,sy)),night=1-smooth(-0.14,0.02,sy);
  const dim=1-oc*0.62-E.storm*0.15;
  let sunC=mixv([1.0,0.95,0.86],[1.0,0.62,0.36],gold).map(v=>v*1.45*smooth(-0.04,0.1,sy)*dim);
  const moonUp=smooth(-0.05,0.15,st.moon[1])*night;const moonC=[0.40,0.50,0.80].map(v=>v*0.42*moonUp*(1-oc*0.6));
  const useMoon=sy<0.02;const key=useMoon?st.moon:st.sun;const keyC=useMoon?moonC:sunC;
  const flash=E.flash;
  let skyA=mixv([0.60,0.70,0.92],[0.72,0.58,0.64],gold).map(v=>v*(0.52*day+0.04));
  skyA=mixv(skyA,[0.72,0.75,0.8].map(v=>v*(0.66*day+0.04)),oc*0.8);
  skyA=mixv(skyA,[0.09,0.12,0.25],night*0.9);skyA=skyA.map(v=>v+flash*0.6);
  const gndA=[0.32,0.38,0.22].map((v,i)=>v*(sunC[i]*Math.max(sy,0)*0.4+skyA[i]*0.4)+0.004);
  let zen=mixv([0.34,0.58,0.92],[0.34,0.42,0.76],gold),hor=mixv([0.64,0.80,0.95],[0.99,0.70,0.50],gold);
  const ocZ=[0.60,0.64,0.70].map(v=>v*(0.4+0.6*day)),ocH=[0.76,0.79,0.82].map(v=>v*(0.4+0.6*day));zen=mixv(zen,ocZ,oc*0.9);hor=mixv(hor,ocH,oc*0.85);
  zen=mixv(zen,[0.03,0.05,0.13],night);hor=mixv(hor,[0.10,0.14,0.27],night);
  if(E.storm>0.01){zen=mixv(zen,[0.25,0.27,0.32],E.storm*0.7);hor=mixv(hor,[0.40,0.42,0.46],E.storm*0.6);}
  const fog=srgb(mixv(hor,[0.80,0.86,0.92],0.35*(1-night))).map(v=>v*0.97),fog2=srgb(mixv(hor,[1.0,0.82,0.62],0.5*(gold+0.25*day)));
  return{st,E,day,gold,night,key,keyC,skyA,gndA,zen,hor,fog,fog2,moonUp};};

// ---------------- init
R.init=function(){
  const mp=makeProgram;
  R.pTerrain=mp('terrain',VS_TERRAIN,FS_TERRAIN);R.pPatch=mp('terrain-patch',VS_PATCH,FS_TERRAIN);R.pTerrainSh=mp('terrain-shadow',VS_TERRAIN_SH,FS_DEPTH_T);R.pPatchSh=mp('terrain-patch-shadow',VS_PATCH_SH,FS_DEPTH_T);
  R.pWall=mp('board-edge',VS_WALL,FS_WALL);R.pWallSh=mp('board-edge-shadow',VS_WALL_SH,FS_DEPTH);
  R.pObj=mp('objects',VS_OBJ,FS_OBJ);R.pKit=mp('kit',VS_KIT,FS_KIT(false));R.pKitF=mp('kit-fade',VS_KIT,FS_KIT(true));R.pVeh=mp('vehicles',VS_VEH,FS_VEH);R.pTrack=mp('track',VS_TRACK,FS_TRACK);R.tcTex=tex2D(256,256,gl.R8,gl.RED,gl.UNSIGNED_BYTE,null,gl.LINEAR);bindTU(26,gl.TEXTURE_2D,R.tcTex);
  R.pSky=mp('sky',VS_FS,FS_SKY);R.pWater=mp('water',VS_WATER,FS_WATER);R.pLake=mp('lake-near',VS_LAKE,FS_WATER);Waves.initGL();R.pCloud=mp('clouds',VS_CLOUD,FS_CLOUD);R.pMist=mp('mist',VS_MIST,FS_MIST);
  R.pPart=mp('smoke',VS_PART,FS_PART);R.pPrecip=mp('precipitation',VS_PRECIP,FS_PRECIP);R.pBolt=mp('lightning',VS_BOLT,FS_BOLT);R.pMark=mp('markers',VS_MARK,FS_MARK);
  R.pVCloud=mp('volumetric-clouds',VS_FS,FS_VCLOUD);R.pCComp=mp('cloud-composite',VS_FS,FS_CCOMP);R.pVMist=mp('volumetric-mist',VS_FS,FS_VMIST);R.pStream=mp('streams',VS_STREAM,FS_STREAM);bindTU(TU.uRoad,gl.TEXTURE_2D,tex2D(1,1,gl.RG16F,gl.RG,gl.FLOAT,new Float32Array([4,0]),gl.LINEAR));R.pMComp=mp('mist-composite',VS_FS,FS_MCOMP);R.pBloomDown=mp('bloom-down',VS_FS,FS_BLOOMDOWN);R.pDown=mp('down',VS_FS,FS_DOWN);R.pBlur=mp('blur',VS_FS,FS_BLUR);R.pTone=mp('tonemap',VS_FS,FS_TONEMAP);
  R.ubo=gl.createBuffer();gl.bindBuffer(gl.UNIFORM_BUFFER,R.ubo);gl.bufferData(gl.UNIFORM_BUFFER,R.U.byteLength,gl.DYNAMIC_DRAW);gl.bindBufferBase(gl.UNIFORM_BUFFER,0,R.ubo);
  R.hdr=CAPS.halfRT?{i:gl.RGBA16F,t:gl.HALF_FLOAT}:{i:gl.RGBA8,t:gl.UNSIGNED_BYTE};
  const f1=new Float32Array([0]),f4=new Float32Array([0,0,0,0]),u4=new Uint8Array([160,0,0,0]);
  bindTU(TU.uHeight,gl.TEXTURE_2D,tex2D(1,1,gl.R32F,gl.RED,gl.FLOAT,f1,gl.NEAREST));
  bindTU(TU.uAux,gl.TEXTURE_2D,tex2D(1,1,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,u4));bindTU(TU.uNorm,gl.TEXTURE_2D,tex2D(1,1,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([128,255,128,255])));
  bindTU(TU.uData,gl.TEXTURE_2D,tex2D(1,1,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(4)));
  bindTU(TU.uWaterTex,gl.TEXTURE_2D,tex2D(1,1,gl.RGBA32F,gl.RGBA,gl.FLOAT,f4,gl.NEAREST));
  bindTU(TU.uFields,gl.TEXTURE_2D,R.fieldTex=tex2D(256,2,gl.RGBA32F,gl.RGBA,gl.FLOAT,new Float32Array(256*2*4),gl.NEAREST));
  R.blackTex=tex2D(1,1,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(4));
  R.dummyShadow=R.makeDepthTex(1,1,true);R.bindSh(R.dummyShadow);
  R.dummyDepth=R.makeDepthTex(1,1,false);for(const u of [TU.uDepthCopy,TU.uDepth])bindTU(u,gl.TEXTURE_2D,R.dummyDepth);
  for(const u of [TU.uSrc,TU.uBloom,TU.uDof,TU.uBSrc])bindTU(u,gl.TEXTURE_2D,R.blackTex);
  R.buildObjMeshes();Clouds.initGL();bindTU(TU.uCldTex,gl.TEXTURE_2D,R.blackTex);
  R.instBufs={};R.emptyVao=gl.createVertexArray();
  R.partBuf=gl.createBuffer();R.partVao=gl.createVertexArray();gl.bindVertexArray(R.partVao);gl.bindBuffer(gl.ARRAY_BUFFER,R.partBuf);
  [[0,3,0],[1,4,24],[2,2,40]].forEach(([l,n,o])=>{gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,n,gl.FLOAT,false,48,o);gl.vertexAttribDivisor(l,1);});
  R.mistBuf=gl.createBuffer();R.mistVao=gl.createVertexArray();gl.bindVertexArray(R.mistVao);gl.bindBuffer(gl.ARRAY_BUFFER,R.mistBuf);
  [[0,0],[1,16]].forEach(([l,o])=>{gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,4,gl.FLOAT,false,32,o);gl.vertexAttribDivisor(l,1);});
  R.boltBuf=gl.createBuffer();R.boltVao=gl.createVertexArray();gl.bindVertexArray(R.boltVao);gl.bindBuffer(gl.ARRAY_BUFFER,R.boltBuf);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,4,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,2,gl.FLOAT,false,24,16);
  gl.bindVertexArray(null);
  R.setupShadows();
  Log.info(`renderer ready: ${PROGS.length} programs, ${R.hdr.i===gl.RGBA16F?'half-float':'8-bit'} colour, max MSAA ${CAPS.maxSamples}`);
};
R.makeDepthTex=function(w,h,cmp){scratch();const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);const d32=!cmp;gl.texImage2D(gl.TEXTURE_2D,0,d32?gl.DEPTH_COMPONENT32F:gl.DEPTH_COMPONENT24,w,h,0,gl.DEPTH_COMPONENT,d32?gl.FLOAT:gl.UNSIGNED_INT,null);
  const f=cmp?gl.LINEAR:gl.NEAREST;gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,f);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,f);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  if(cmp){gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL);}
  if(w===1){const f2=fbo([],{isTex:true,t});gl.bindFramebuffer(gl.FRAMEBUFFER,f2);gl.clearDepth(1);gl.clear(gl.DEPTH_BUFFER_BIT);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.deleteFramebuffer(f2);}
  return t;};
R.setupShadows=function(){if(R.shTex){gl.deleteTexture(R.shTex);gl.deleteFramebuffer(R.shFb);R.shTex=null;}
  const res=Math.min(+P.shadowRes,CAPS.maxTex);R.shRes=res;if(!res){R.bindSh(R.dummyShadow);Log.info('shadows off');return;}
  R.shVP=null;R.shTex=R.makeDepthTex(res,res,true);R.shFb=fbo([],{isTex:true,t:R.shTex});R.bindSh(R.shTex);Log.info(`shadow map ${res}×${res}`);};

// ---------------- static object meshes in one buffer (non-indexed flat triangles)
R.buildObjMeshes=function(){const list=[];const add=(k,M)=>{list.push([k,M]);};
  treeMeshes().forEach((t,i)=>{add('t'+i+'n',t.near);add('t'+i+'f',t.far);});
  R.houseDefs=houseMeshes();R.houseDefs.forEach((h,i)=>add('h'+i,h.M));
  R.houseDefs.forEach((d,v)=>{const t=KIT_OF[v];if(!t)return;const p=KIT.plots[t];d.kit=t;d.plot=p;d.gx=KIT_GATE[t];d.chim=KIT_CHIM[t];d.r=Math.max(...[[p.x0,p.z0],[p.x1,p.z0],[p.x1,p.z1],[p.x0,p.z1]].map(q=>Math.hypot(q[0],q[1])));});
  R.buildKitMeshes();
  const wm=windmillMeshes();R.millHub=wm.hub;add('millBody',wm.body);add('millSails',wm.sails);
  add('lamp',lampMesh());add('sawWheel',sawWheelMesh());add('plankCarry',plankCarryMesh());add('leafpatch',leafPatchMesh());add('leafpile',leafPileMesh());add('leafbag',leafBagMesh());for(const k of PEOPLE)add('pp_'+k,peopleMesh(k));add('pp_far',peopleFarMesh());for(let k=0;k<3;k++)add('site'+k,siteMesh(k));add('culvert',culvertMesh());add('bank',bankMesh());add('workshop',workshopMesh());for(const k of ['gold','silver','diamond'])add('mine_'+k,mineMesh(k));add('slotmark',slotMarkMesh());add('lorry',lorryMesh());add('sawmill',sawmillMesh());add('bakery',bakeryMesh());add('restaurant',restaurantMesh());add('stall',stallMesh());add('stationhall',stationHallMesh());add('bus',busMesh());add('busstop',busStopMesh());add('castle',castleMesh());for(let v=0;v<3;v++)add('balloon'+v,balloonMesh(v));add('castle2',hohenzollernMesh());add('barn',barnMesh());add('shed',shedMesh());add('silo',siloMesh());add('harrow',harrowMesh());add('trailer',trailerMesh());add('bale',baleMesh());add('seated',seatedMesh());add('dooropen',doorOpenMesh());add('steamer',steamerMesh());add('sternwheel',sternwheelMesh());add('parasol',parasolMesh());add('towel',towelMesh());add('lier',lierMesh());add('swimmer',swimmerMesh());add('shoveler',shovelerMesh());add('xbuck',xbuckMesh());add('boom',boomMesh());add('tractor',tractorMesh());add('combine',combineMesh());add('plough',ploughMesh());add('drill',drillMesh());add('horse',horseMesh());add('fence',fenceMesh());add('person',personMesh());add('skater',skaterMesh(0));add('hockeyP',skaterMesh(1));add('speedskater',speedSkaterMesh());add('hgoal',goalMesh());add('puck',puckMesh());add('sled',sledMesh());add('sledder',sledderMesh());add('sheep',sheepMesh());add('cow',cowMesh2());add('duck',duckMesh());add('swan',swanMesh());
  add('rowboat',rowboatMesh());add('sailboat',sailboatMesh());add('birdD',birdMesh(true));add('birdL',birdMesh(false));add('cloud',cloudMesh());
  let total=0;for(const [,M] of list)total+=M.n;const V=new Float32Array(total*10);R.mesh={};let o=0;
  for(const [k,M] of list){V.set(M.v,o*10);let r=0;for(let i=0;i<M.n*10;i+=10)r=Math.max(r,M.v[i]*M.v[i]+M.v[i+1]*M.v[i+1]+M.v[i+2]*M.v[i+2]);R.mesh[k]={first:o,count:M.n,r:Math.sqrt(r)+1.5};o+=M.n;}// r: bounding radius about the origin (+ room for poses and sway)
  R.objVao=gl.createVertexArray();gl.bindVertexArray(R.objVao);R.objVbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,R.objVbo);gl.bufferData(gl.ARRAY_BUFFER,V,gl.STATIC_DRAW);
  [[0,3,0],[1,3,12],[2,3,24],[3,1,36]].forEach(([l,n,off])=>{gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,n,gl.FLOAT,false,40,off);});
  gl.enableVertexAttribArray(4);gl.enableVertexAttribArray(5);gl.vertexAttribDivisor(4,1);gl.vertexAttribDivisor(5,1);gl.bindVertexArray(null);
  Log.info(`low-poly meshes: ${list.length} models, ${(total/3)|0} triangles (${list.filter(([k])=>k[0]==='t'&&k.endsWith('n')).map(([k,M])=>k+' '+M.n/3).join(', ')})`);};
R.buildKitMeshes=function(){const t0=performance.now(),parts=[];R.kitMesh={};let total=0;
  R.kitBound={};for(const t of KIT_TYPES){R.kitMesh[t]=[];for(let l=0;l<4;l++){KIT.build(t,{game:true,lod:[0,0.5,1,2][l]});const a=new Float32Array(KIT.VB);a.cl=KIT.CL.slice();parts.push(a);R.kitMesh[t].push({first:total,count:a.length/16});total+=a.length/16;
    if(l===0){let y0=1e9,y1=-1e9;for(let i=0;i<a.length;i+=16){y0=Math.min(y0,a[i+1]);y1=Math.max(y1,a[i+1]);}const ym=(y0+y1)/2;let r=0;for(let i=0;i<a.length;i+=16)r=Math.max(r,a[i]*a[i]+(a[i+1]-ym)*(a[i+1]-ym)+a[i+2]*a[i+2]);R.kitBound[t]=[ym,Math.sqrt(r)+1];}}}// bounding sphere per type (for culling)
  // packed 32-byte vertices: position f32x3 | normal s8x4 | colour u8x3 + material u8 | uv s16x2 | half-size u16x2 (/16 m) | seed, aux u8x2
  KIT.VB.length=0;const V=R.packKit(parts,total);R.kitVao=R.kitVaoOf(V);R.kitVbo=R.kitVao.vbo;
  Log.info(`building kit: ${KIT_TYPES.map(t=>t+' '+R.kitMesh[t].map(m=>(m.count/3/1000).toFixed(1)+'k').join('/')).join(', ')} triangles (LOD 0/1/2), ${(V.byteLength/1048576).toFixed(1)} MB, built in ${(performance.now()-t0).toFixed(0)} ms`);};
// packed 32-byte vertices: position f32x3 | normal s8x4 | colour u8x3 + material u8 | uv s16x2 | half-size u16x2 (/16 m) | seed, aux u8x2
R.packKit=function(parts,total){const AB=new ArrayBuffer(total*32),f32=new Float32Array(AB),i8=new Int8Array(AB),u8=new Uint8Array(AB),i16=new Int16Array(AB),u16=new Uint16Array(AB);let v=0;
  const q8=x=>Math.max(-127,Math.min(127,Math.round(x*127))),u8c=x=>Math.max(0,Math.min(255,Math.round(x*255)));
  for(const a of parts){const v0=v;for(let k=0;k<a.length;k+=16,v++){f32[v*8]=a[k];f32[v*8+1]=a[k+1];f32[v*8+2]=a[k+2];const b=v*32;i8[b+12]=q8(a[k+3]);i8[b+13]=q8(a[k+4]);i8[b+14]=q8(a[k+5]);
    u8[b+16]=u8c(a[k+6]);u8[b+17]=u8c(a[k+7]);u8[b+18]=u8c(a[k+8]);u8[b+19]=a[k+9];i16[v*16+10]=Math.round(Math.max(-1,Math.min(1,a[k+10]))*32767);i16[v*16+11]=Math.round(Math.max(-1,Math.min(1,a[k+11]))*32767);
    u16[v*16+12]=Math.min(65535,Math.round(a[k+12]/16*65535));u16[v*16+13]=Math.min(65535,Math.round(a[k+13]/16*65535));u8[b+28]=u8c(a[k+14]);u8[b+29]=u8c(a[k+15]);}
    /* closed boxes: a flag in the normal's spare byte and the face's plane constant (n·p, 1/256 m) in the two spare bytes at 30. Every
       corner of a face gets the same constant, so the shader's far-side test gives the same answer for all of them. Not for foliage
       (it shrinks in winter) or faces more than 120 m from the model's origin. */
    const cl=a.cl||[];for(let c=0;c<cl.length;c+=2)for(let q=v0+cl[c]/16,e=v0+cl[c+1]/16;q<e;q+=6){if(u8[q*32+19]===1)continue;const b=q*32,d=(i8[b+12]*f32[q*8]+i8[b+13]*f32[q*8+1]+i8[b+14]*f32[q*8+2])/127;if(Math.abs(d)>120)continue;
      const dq=Math.round(d*256);for(let j=0;j<6;j++){i8[(q+j)*32+15]=127;i16[(q+j)*16+15]=dq;}}}
  return AB;};
R.kitVaoOf=function(V){const vao=gl.createVertexArray();gl.bindVertexArray(vao);const vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.bufferData(gl.ARRAY_BUFFER,V,gl.STATIC_DRAW);vao.vbo=vbo;
  [[0,3,gl.FLOAT,false,0],[1,4,gl.BYTE,true,12],[2,3,gl.UNSIGNED_BYTE,true,16],[3,1,gl.UNSIGNED_BYTE,false,19],[6,2,gl.SHORT,true,20],[8,2,gl.UNSIGNED_SHORT,true,24],[7,2,gl.UNSIGNED_BYTE,true,28],[9,1,gl.SHORT,false,30]].forEach(([l,n,ty,nm,off])=>{gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,n,ty,nm,32,off);});
  gl.enableVertexAttribArray(4);gl.enableVertexAttribArray(5);gl.vertexAttribDivisor(4,1);gl.vertexAttribDivisor(5,1);gl.bindVertexArray(null);return vao;};
// detailed buildings: LOD by distance (instances from Life, 'kit_<type>_<lod>'); the shadow pass uses one level coarser
R.drawKit=function(pass){if(!R.kitVao)return;R.camPlanes=Cam.planes;const p=R.pKit;gl.useProgram(p.p);gl.uniform1i(p.u('uPass'),pass);gl.bindVertexArray(R.kitVao);
  gl.uniform1f(p.u('uBackSkip'),+P.optBackface!==0?1:0);gl.uniform1f(p.u('uFlat'),R.skip.kitFlat?1:0);
  // depth first (experimental): the buildings' depth is laid down with a trivial shader, then the costly material shader runs once per visible pixel
  const pre=pass===0&&+P.optPrepass===1;
  for(let step=pre?0:1;step<2;step++){if(pre){if(step===0){gl.colorMask(false,false,false,false);gl.uniform1i(p.u('uPass'),2);}else{gl.colorMask(true,true,true,true);gl.uniform1i(p.u('uPass'),0);gl.depthFunc(gl.LEQUAL);}}
  for(let l=0;l<4;l++)for(const t of KIT_TYPES){const b=R.instBufs['kit_'+t+'_'+l];if(!b||!b.n)continue;const m=R.kitMesh[t][pass===1?Math.min(3,l+1):l];
    if(pass===0&&R.skip['kit'+l])continue;let buf=b.buf,n=b.n;if(+P.optCull!==0&&R.kitBound&&R.kitBound[t]){const c=R.cullInst(b,R.kitBound[t][0],R.kitBound[t][1],pass===1?R.shPl:R.camPlanes,pass);if(c){buf=c.buf;n=c.n;}}if(!n)continue;
    gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.vertexAttribPointer(4,4,gl.FLOAT,false,32,0);gl.vertexAttribPointer(5,4,gl.FLOAT,false,32,16);gl.drawArraysInstanced(gl.TRIANGLES,m.first,m.count,n);Stats.draws++;Stats.tris+=m.count/3*n;}
  }if(pre)gl.depthFunc(gl.LESS);
  {const q=R.pKitF;gl.useProgram(q.p);gl.uniform1i(q.u('uPass'),pass);gl.uniform1f(q.u('uBackSkip'),+P.optBackface!==0?1:0);gl.uniform1f(q.u('uFlat'),R.skip.kitFlat?1:0);
    for(let l=0;l<4;l++)for(const t of KIT_TYPES){const b=R.instBufs['kit_'+t+'_'+l+'f'];if(!b||!b.n)continue;const m=R.kitMesh[t][pass===1?Math.min(3,l+1):l];if(pass===0&&R.skip['kit'+l])continue;
      let buf=b.buf,n=b.n;if(+P.optCull!==0&&R.kitBound&&R.kitBound[t]){const c=R.cullInst(b,R.kitBound[t][0],R.kitBound[t][1],pass===1?R.shPl:R.camPlanes,pass);if(c){buf=c.buf;n=c.n;}}if(!n)continue;
      gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.vertexAttribPointer(4,4,gl.FLOAT,false,32,0);gl.vertexAttribPointer(5,4,gl.FLOAT,false,32,16);gl.drawArraysInstanced(gl.TRIANGLES,m.first,m.count,n);Stats.draws++;Stats.tris+=m.count/3*n;}
    gl.useProgram(p.p);}
  if(R.bridgeKit){const BK=R.bridgeKit,cp=Cam.pos||[0,0,0];gl.bindVertexArray(BK.vao);gl.bindBuffer(gl.ARRAY_BUFFER,BK.ib);
    BK.list.forEach((e,i)=>{const d=Math.hypot(e.x-cp[0],e.z-cp[2]);if(d>1800||(pass!==1&&R.camPlanes&&!boxVisible(R.camPlanes,e.x-e.r,-1e4,e.z-e.r,e.x+e.r,1e4,e.z+e.r)))return;const m=e.lod[d<170&&pass!==1?0:1];
      gl.vertexAttribPointer(4,4,gl.FLOAT,false,32,i*32);gl.vertexAttribPointer(5,4,gl.FLOAT,false,32,i*32+16);gl.drawArraysInstanced(gl.TRIANGLES,m.first,m.count,1);Stats.draws++;Stats.tris+=m.count/3;});}
  gl.useProgram(R.pObj.p);gl.uniform1i(R.pObj.u('uPass'),pass);gl.bindVertexArray(R.objVao);};
// view culling of instances: instances whose bounding sphere (centre ym·scale above the instance, radius r·scale) lies outside the
// camera's view (camera pass) or outside the shadow map's box (shadow pass: the light's planes) are left out. Nothing outside either
// can reach the picture, so it is the same picture with less vertex work.
R.cullInst=function(b,ym,r,pl,pass){const n=b.n,D=b.cpu;if(!D||n<1||!pl)return null;if(pass===1){const par=b;b=par.sh||(par.sh={n:0});b.n=n;b.cpu=D;b.cver=par.cver;}// the shadow pass keeps its own cached subset and buffer
  // unchanged instances, view and bounds (a still camera): the last result stands
  const L=b.cl||(b.cl=new Float64Array(27));let same=L[24]===b.cver&&L[25]===r&&L[26]===ym;if(same)for(let j=0;j<6&&same;j++){const p=pl[j];if(L[j*4]!==p[0]||L[j*4+1]!==p[1]||L[j*4+2]!==p[2]||L[j*4+3]!==p[3])same=false;}
  if(same)return b.clr;for(let j=0;j<6;j++){const p=pl[j];L[j*4]=p[0];L[j*4+1]=p[1];L[j*4+2]=p[2];L[j*4+3]=p[3];}L[24]=b.cver;L[25]=r;L[26]=ym;b.clr=R.cullDo(b,ym,r,pl);return b.clr;};
R.cullDo=function(b,ym,r,pl){const n=b.n,D=b.cpu;let k=0;const V=b.vcpu&&b.vcpu.length>=n*8?b.vcpu:(b.vcpu=new Float32Array(Math.max(n,16)*8));
  const a0=pl[0],a1=pl[1],a2=pl[2],a3=pl[3],a4=pl[4],a5=pl[5];/* the six planes unrolled, the 8 floats copied one by one (no per-instance objects) */
  for(let i=0;i<n;i++){const o=i*8,sc=D[o+3]||1,x=D[o],y=D[o+1]+ym*sc,z=D[o+2],rr=-r*sc;
    if(a0[0]*x+a0[1]*y+a0[2]*z+a0[3]<rr||a1[0]*x+a1[1]*y+a1[2]*z+a1[3]<rr||a2[0]*x+a2[1]*y+a2[2]*z+a2[3]<rr||a3[0]*x+a3[1]*y+a3[2]*z+a3[3]<rr||a4[0]*x+a4[1]*y+a4[2]*z+a4[3]<rr||a5[0]*x+a5[1]*y+a5[2]*z+a5[3]<rr)continue;
    const q=k*8;V[q]=D[o];V[q+1]=D[o+1];V[q+2]=D[o+2];V[q+3]=D[o+3];V[q+4]=D[o+4];V[q+5]=D[o+5];V[q+6]=D[o+6];V[q+7]=D[o+7];k++;}
  if(k===n)return null;if(!b.vbuf){b.vbuf=gl.createBuffer();b.vcap=0;}gl.bindBuffer(gl.ARRAY_BUFFER,b.vbuf);if(k){const bytes=k*32;if(bytes>b.vcap){b.vcap=Math.ceil(Math.max(bytes,n*32)*1.3);gl.bufferData(gl.ARRAY_BUFFER,b.vcap,gl.DYNAMIC_DRAW);}gl.bufferSubData(gl.ARRAY_BUFFER,0,V.subarray(0,k*8));}
  return{buf:b.vbuf,n:k};};
R.drawVehGlass=function(p){if(!R.veh||!R.drawTrainsFn)return;gl.useProgram(p.p);gl.uniform1i(p.u('uPass'),0);gl.uniform3f(p.u('uLamp'),1,1,1);gl.uniform2f(p.u('uOcc'),0,0);
  gl.uniform1i(p.u('uGlass'),1);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);R.drawTrainsFn();gl.depthMask(true);gl.disable(gl.BLEND);gl.uniform1i(p.u('uGlass'),0);gl.bindVertexArray(null);};
// the station ghost: the real building model, see-through green (red when it cannot stand). Depth first so only its nearest surface shows
R.drawGhost=function(){const g=R.ghost;if(!g||!R.kitVao||!R.kitMesh[g.type])return;const p=R.pKit,m=R.kitMesh[g.type][1];if(!R.ghostBuf)R.ghostBuf=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,R.ghostBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([g.x,g.y,g.z,1,g.rot,0.5,0.5,0]),gl.DYNAMIC_DRAW);
  gl.useProgram(p.p);gl.uniform1i(p.u('uPass'),2);gl.uniform1f(p.u('uBackSkip'),0);gl.uniform1f(p.u('uFlat'),0);gl.bindVertexArray(R.kitVao);gl.bindBuffer(gl.ARRAY_BUFFER,R.ghostBuf);
  gl.vertexAttribPointer(4,4,gl.FLOAT,false,32,0);gl.vertexAttribPointer(5,4,gl.FLOAT,false,32,16);
  gl.colorMask(false,false,false,false);gl.depthMask(true);gl.depthFunc(gl.LESS);gl.drawArraysInstanced(gl.TRIANGLES,m.first,m.count,1);
  gl.colorMask(true,true,true,true);gl.depthMask(false);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  gl.uniform1i(p.u('uPass'),0);gl.uniform4f(p.u('uGhost'),g.ok?0.25:0.95,g.ok?0.95:0.2,g.ok?0.35:0.15,0.62);gl.drawArraysInstanced(gl.TRIANGLES,m.first,m.count,1);
  gl.uniform4f(p.u('uGhost'),0,0,0,0);gl.disable(gl.BLEND);gl.depthMask(true);gl.depthFunc(gl.LESS);gl.bindVertexArray(null);};
// instance buffers (8 floats: x y z scale | rot tint hash anim)
R.inst=function(key,data,n){let b=R.instBufs[key];if(!b){b=R.instBufs[key]={buf:gl.createBuffer(),cap:0,n:0};}
  b.n=n;b.cpu=data;b.cver=(b.cver|0)+1;if(!n)return b;gl.bindBuffer(gl.ARRAY_BUFFER,b.buf);const bytes=n*32;
  if(bytes>b.cap){b.cap=Math.ceil(bytes*1.3);gl.bufferData(gl.ARRAY_BUFFER,b.cap,gl.DYNAMIC_DRAW);}gl.bufferSubData(gl.ARRAY_BUFFER,0,data.subarray(0,n*8));return b;};
R.drawObj=function(meshKey,kind,b,pass,prog){if(!b||!b.n)return;const m=R.mesh[meshKey];const p=prog||R.pObj;let buf=b.buf,n=b.n;
  // camera pass: leave out instances outside the view (birds fly far from their anchor, they are kept)
  if(!prog&&kind!==12&&+P.optCull!==0&&m.r&&m.count*b.n>=45000){const pl=pass===1?R.shPl:Cam.planes;/* only buffers of 15 000 triangles or more: below that, drawing costs less than sorting out */if(pl){const c=R.cullInst(b,0,m.r,pl,pass);if(c){buf=c.buf;n=c.n;}if(!n)return;}}
  gl.uniform1i(p.u('uKind'),kind);gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.vertexAttribPointer(4,4,gl.FLOAT,false,32,0);gl.vertexAttribPointer(5,4,gl.FLOAT,false,32,16);
  gl.drawArraysInstanced(gl.TRIANGLES,m.first,m.count,n);Stats.draws++;Stats.tris+=m.count/3*n;Stats.objs+=n;};

// ---------------- world upload
R.computeRenderHeights=function(T){const N=T.N,H=T.H,s=P.terrainSmooth;if(!T.Hr||T.Hr.length!==N*N)T.Hr=new Float32Array(N*N);
  const blur=(src,r)=>{const A=new Float32Array(N*N),B=new Float32Array(N*N);
    for(let j=0;j<N;j++){let acc=0;const row=j*N;for(let i=-r;i<=r;i++)acc+=src[row+clamp(i,0,N-1)];for(let i=0;i<N;i++){A[row+i]=acc/(2*r+1);acc+=src[row+Math.min(i+r+1,N-1)]-src[row+Math.max(i-r,0)];}}
    for(let i=0;i<N;i++){let acc=0;for(let j=-r;j<=r;j++)acc+=A[clamp(j,0,N-1)*N+i];for(let j=0;j<N;j++){B[j*N+i]=acc/(2*r+1);acc+=A[Math.min(j+r+1,N-1)*N+i]-A[Math.max(j-r,0)*N+i];}}return B;};
  const S=blur(blur(H,2),1);const keep=new Float32Array(N*N),M=T.trackMask,Wt=T.water,TM=T.tunMask;
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){let k=0;for(let dj=-2;dj<=2;dj++)for(let di=-2;di<=2;di++){const ii=clamp(i+di,0,N-1),jj=clamp(j+dj,0,N-1),n=jj*N+ii;
      if(M&&M[n]>0)k=Math.max(k,M[n]/255*(1-Math.max(Math.abs(di),Math.abs(dj))*0.25));if(Wt&&Wt[n*4+3]>0)k=Math.max(k,1-Math.max(Math.abs(di),Math.abs(dj))*0.3);if(TM&&TM[n]>0)k=Math.max(k,TM[n]/255*(1-Math.max(Math.abs(di),Math.abs(dj))*0.2));}
    keep[j*N+i]=k;}
  const flat=T.flatMask;for(let n=0;n<N*N;n++){const w=s*(1-keep[n]);T.Hr[n]=flat&&flat[n]&&keep[n]<0.05?T.flatH[n]:H[n]+(S[n]-H[n])*w;}
  R.clearTrackBed(T);
};
// The ground is drawn from corner heights (each the mean of the 4 cells around it) in triangles one cell (8 m) wide, so near a cutting
// the drawn surface between the bed cells and the raised cells beside them can rise over the ballast even though every bed cell is at
// formation level. This pass checks the drawn surface exactly as the GPU builds it, on a dense grid along every piece of open track,
// and digs the corners of any triangle that pokes above the ballast down until it clears (render heights only, never raised).
// drawn ground height exactly as the GPU builds it at full detail (corner means of the render heights, two triangles per cell)
R.drawnH=function(T,x,z){const N=T.N,cs=T.cs,Hr=T.Hr||T.H,hAt=(i,j)=>Hr[clamp(j,0,N-1)*N+clamp(i,0,N-1)],cH=(gx,gz)=>0.25*(hAt(gx-1,gz-1)+hAt(gx,gz-1)+hAt(gx-1,gz)+hAt(gx,gz));
  const fx=x/cs,fz=z/cs,i=Math.floor(fx),j=Math.floor(fz),u=fx-i,v=fz-j;if(u+v<=1){const a=cH(i,j);return a+(cH(i+1,j)-a)*u+(cH(i,j+1)-a)*v;}const d=cH(i+1,j+1);return d+(cH(i,j+1)-d)*(1-u)+(cH(i+1,j)-d)*(1-v);};
R.trackBedAllowed=(e)=>{const a=Math.abs(e);return a<=1.6?0.2:Math.min(0.2,0.36-(a-1.8)*1.15+0.12);};// above formation level, by offset from the centre line
R.clearTrackBed=function(T,segs){const N=T.N,cs=T.cs,Hr=T.Hr;if(!Hr||typeof Track==='undefined')return 0;segs=segs||Track.segs;if(!segs.length)return 0;
  const hAt=(i,j)=>Hr[clamp(j,0,N-1)*N+clamp(i,0,N-1)],cH=(gx,gz)=>0.25*(hAt(gx-1,gz-1)+hAt(gx,gz-1)+hAt(gx-1,gz)+hAt(gx,gz));
  // a corner is the mean of 4 cells: take the height off the cells that stand highest above their own bed level first (the cutting side),
  // so the bed cells it shares with its neighbours stay put, also on a steep grade where the uphill bed cells are simply higher
  const BY=T.bedY,ex4=new Float32Array(4),ks=[0,0,0,0];
  const lower=(gx,gz,d)=>{let m=0,refS=0,refN=0;for(const [i,j] of [[gx-1,gz-1],[gx,gz-1],[gx-1,gz],[gx,gz]]){const k=clamp(j,0,N-1)*N+clamp(i,0,N-1);ks[m++]=k;if(BY&&BY[k]===BY[k]){refS+=BY[k];refN++;}}
    const ref0=refN?refS/refN:0;for(let q=0;q<4;q++){const k=ks[q],r=BY&&BY[k]===BY[k]?BY[k]:refN?ref0:Hr[k];ex4[q]=Hr[k]-r;}
    // water-filling: find the level L of "height above bed" so that cutting everything above L down to it removes 4·d
    let need=d*4,lo=-50,hi=50;for(let q=0;q<4;q++)hi=Math.max(hi,ex4[q]);for(let it=0;it<30;it++){const L=(lo+hi)/2;let take=0;for(let q=0;q<4;q++)take+=Math.max(0,ex4[q]-L);if(take>need)lo=L;else hi=L;}
    for(let q=0;q<4;q++){const c=Math.max(0,ex4[q]-hi);Hr[ks[q]]-=c;}};
  const pts=[];for(const s of segs){if(s.pend)continue;const step=Math.min(1,cs/8);for(let t=0;t<=s.L+1e-6;t+=step){const tc=Math.min(t,s.L),sp=spanAt(s,tc);if(sp)continue;
      // near a tunnel mouth the portal block covers the ground; leave that to the portal carve
      if(s.spans&&s.spans.some(q=>q[2]==='t'&&tc>q[0]-6&&tc<q[1]+6))continue;const q=segPoint(s,tc),yF=segY(s,tc)-FORMATION_DROP,c=-Math.sin(q[2]),sn=Math.cos(q[2]);
      for(let e=-2.4;e<=2.41;e+=0.4)pts.push(q[0]+c*e,q[1]+sn*e,yF+R.trackBedAllowed(e));}}
  const t0=performance.now();let dug=0,pass=0;for(;pass<8;pass++){let bad=0;
    for(let k=0;k<pts.length;k+=3){const fx=pts[k]/cs,fz=pts[k+1]/cs,i=Math.floor(fx),j=Math.floor(fz),u=fx-i,v=fz-j;if(i<0||j<0||i>=N||j>=N)continue;
      const a=cH(i,j),b=cH(i+1,j),c=cH(i,j+1),d=cH(i+1,j+1);let y,tri;
      if(u+v<=1){y=a+(b-a)*u+(c-a)*v;tri=[[i,j,1-u-v],[i+1,j,u],[i,j+1,v]];}else{y=d+(c-d)*(1-u)+(b-d)*(1-v);tri=[[i+1,j+1,u+v-1],[i,j+1,1-u],[i+1,j,1-v]];}
      // clear this point by lowering the corners that stand above its allowed height, the biggest contributor first, and never below that
      // height: the corners out in the cutting come down, corners already on the bed stay, and nothing is dug deeper than the bed needs
      const A=pts[k+2]-0.02;let ex=y-A;if(ex>0.025){bad++;for(const t of tri)t.push(cH(t[0],t[1]));tri.sort((p,q)=>q[2]*(q[3]-A)-p[2]*(p[3]-A));
        for(const [gx,gz,w,h] of tri){if(ex<=0)break;if(w<1e-3||h<=A)continue;const r=Math.min(h-A,ex/w);lower(gx,gz,r);ex-=w*r;dug+=r;}}}
    if(!bad)break;}
  if(dug>0)Log.info(`track bed: drawn ground dug down along the track (${pass} passes, ${pts.length/3} points, ${(performance.now()-t0).toFixed(0)} ms)`);return dug;};
R.sampleHr=(T,x,z)=>sampleH(T,x,z,T.Hr||T.H);
// water surface for drawing: the flat level is carried a few cells onto the bank (where the ground stands above it),
// so the shoreline is cut by the ground contour instead of a 4 m staircase of sloping edge triangles
R.waterRender=function(T){const N=T.N,Wt=T.water,H=T.Hr||T.H,out=Float32Array.from(Wt),set=new Uint8Array(N*N),wv=new Float32Array(N*N),SH=T.shore;let nLake=0;
  // A: dry 0 | bank 0.1+0.3·w | lake 1 | river 2 | fall 3 (w = how much the cell rises when rivers swell)
  for(let n=0;n<N*N;n++){const a=Wt[n*4+3];if(a>0){set[n]=1;const riv=SH?SH[n]<0.99:true;wv[n]=riv?1:0;if(!riv&&a<=1.5)nLake++;out[n*4+3]=a>1.5?3:riv?2:1;}else{out[n*4]=H[n]-30;out[n*4+3]=0;}}
  for(let pass=0;pass<3;pass++){const add=[];
    for(let j=1;j<N-1;j++)for(let i=1;i<N-1;i++){const n=j*N+i;if(set[n])continue;let s=0,c=0;
      let w=0;for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const m=n+dj*N+di;if(set[m]){s+=out[m*4];w+=wv[m];c++;}}
      if(c&&H[n]>=s/c-0.05)add.push(n,s/c,w/c);}
    for(let q=0;q<add.length;q+=3){const n=add[q];out[n*4]=add[q+1];wv[n]=add[q+2];out[n*4+3]=0.1+0.3*add[q+2];set[n]=1;}}
  const fx=new Float32Array(N*N),fz=new Float32Array(N*N),cs=T.cs,lv=(m,c)=>Wt[m*4+3]>0?out[m*4]:c;
  for(let j=1;j<N-1;j++)for(let i=1;i<N-1;i++){const n=j*N+i;if(Wt[n*4+3]<=0)continue;const c=out[n*4];fx[n]=-(lv(n+1,c)-lv(n-1,c))/(2*cs);fz[n]=-(lv(n+N,c)-lv(n-N,c))/(2*cs);}
  for(let j=1;j<N-1;j++)for(let i=1;i<N-1;i++){const n=j*N+i;if(Wt[n*4+3]<=0){out[n*4+1]=0;out[n*4+2]=0;continue;}let ax=0,az=0,k=0;
    for(const m of [n,n,n-1,n+1,n-N,n+N])if(Wt[m*4+3]>0){ax+=fx[m];az+=fz[m];k++;}out[n*4+1]=ax/k;out[n*4+2]=az/k;}
  R.hasLake=nLake>0;return out;};
// smoothed ground normals (from the render heights) so rock/grass/snow follow the land, not single facets
R.makeNorm=function(T){const N=T.N,H=T.Hr||T.H,cs=T.cs;if(!R.normData||R.normData.length!==N*N*4)R.normData=new Uint8Array(N*N*4);const A=R.normData;
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){const l=H[j*N+Math.max(i-1,0)],r=H[j*N+Math.min(i+1,N-1)],d=H[Math.max(j-1,0)*N+i],u=H[Math.min(j+1,N-1)*N+i];
    const nx=(l-r)/(2*cs),nz=(d-u)/(2*cs),L=Math.hypot(nx,1,nz),n=(j*N+i)*4;A[n]=Math.round((nx/L*0.5+0.5)*255);A[n+1]=Math.round((0.5/L+0.5)*255);A[n+2]=Math.round((nz/L*0.5+0.5)*255);A[n+3]=255;}
  return A;};
R.subNorm=function(T){scratch();gl.bindTexture(gl.TEXTURE_2D,R.nTex);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,T.N,T.N,gl.RGBA,gl.UNSIGNED_BYTE,R.makeNorm(T));};
R.makeAux=function(T){const N=T.N,Hr=T.Hr;if(!R.auxData||R.auxData.length!==N*N*4)R.auxData=new Uint8Array(N*N*4);const A=R.auxData;
  // valley shading: height minus a wide blur (ridges bright, hollows dark)
  const r=12,tmp=new Float32Array(N*N),bl=new Float32Array(N*N);
  for(let j=0;j<N;j++){let acc=0;for(let i=-r;i<=r;i++)acc+=Hr[j*N+clamp(i,0,N-1)];for(let i=0;i<N;i++){tmp[j*N+i]=acc/(2*r+1);acc+=Hr[j*N+Math.min(i+r+1,N-1)]-Hr[j*N+Math.max(i-r,0)];}}
  for(let i=0;i<N;i++){let acc=0;for(let j=-r;j<=r;j++)acc+=tmp[clamp(j,0,N-1)*N+i];for(let j=0;j<N;j++){bl[j*N+i]=acc/(2*r+1);acc+=tmp[Math.min(j+r+1,N-1)*N+i]-tmp[Math.max(j-r,0)*N+i];}}
  const fid=T.fieldId,path=T.pathMask,M=T.trackMask,hole=T.hole;
  for(let n=0;n<N*N;n++){A[n*4]=Math.round(clamp(0.625+(Hr[n]-bl[n])*0.011,0.3,1)*255);A[n*4+1]=fid?fid[n]:0;A[n*4+2]=path?path[n]:0;
    A[n*4+3]=hole&&hole[n]?255:Math.round((M?M[n]:0)*0.9);}
  return A;};
R.uploadWorld=function(T){const t0=performance.now();R.world=T;const N=T.N;
  if(!T.Hr)R.computeRenderHeights(T);
  const rep=(unit,old,t)=>{if(old)gl.deleteTexture(old);bindTU(unit,gl.TEXTURE_2D,t);return t;};
  R.hTex=rep(TU.uHeight,R.hTex,tex2D(N,N,gl.R32F,gl.RED,gl.FLOAT,T.Hr,gl.NEAREST));
  R.aTex=rep(TU.uAux,R.aTex,tex2D(N,N,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,R.makeAux(T),gl.LINEAR));R.patchMask=new Uint8Array(N*N);R.patches=null;R.pTex=rep(TU.uPatch,R.pTex,tex2D(N,N,gl.R8,gl.RED,gl.UNSIGNED_BYTE,R.patchMask,gl.NEAREST));R.nTex=rep(TU.uNorm,R.nTex,tex2D(N,N,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,R.makeNorm(T),gl.LINEAR));
  R.dTex=rep(TU.uData,R.dTex,tex2D(N,N,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,T.data,gl.LINEAR));
  {const wd=R.waterRender(T);R._wLast=wd;R.wTex=rep(TU.uWaterTex,R.wTex,tex2D(N,N,gl.RGBA32F,gl.RGBA,gl.FLOAT,wd,gl.NEAREST));}
  R.uploadFields(T);R.chunkBounds(T);R.buildBoard(T);R.uploadVeg(T);R.rebuildTrackMesh();Life.uploaded=false;
  Log.info(`world uploaded in ${(performance.now()-t0).toFixed(0)} ms: ${R.chunks.length} chunks (${R.waterChunks.length} with water), board ${R.yb.toFixed(0)} m`);};
R.setFieldWork=function(k,f){const w=(f.base||f.tgt)?f.base*1000+f.tgt*100+clamp(f.p,0,1)*99:0;scratch();gl.bindTexture(gl.TEXTURE_2D,R.fieldTex);gl.texSubImage2D(gl.TEXTURE_2D,0,k+1,1,1,1,gl.RGBA,gl.FLOAT,new Float32Array([f.a,f.crop,f.seed,w]));};
R.uploadFields=function(T){const F=new Float32Array(256*2*4);const L=T.fields||[];for(let k=0;k<L.length&&k<255;k++){const f=L[k],i=k+1;if(!Life.farmOn(f))continue;F.set([f.x,f.z,f.hx,f.hz],i*4);F.set([f.a,f.crop,f.seed,0],(256+i)*4);}
  scratch();gl.bindTexture(gl.TEXTURE_2D,R.fieldTex);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,256,2,gl.RGBA,gl.FLOAT,F);};
// after Life regenerates: new fields, paths and flattened plots
R.refreshGround=function(T){R.computeRenderHeights(T);scratch();gl.bindTexture(gl.TEXTURE_2D,R.hTex);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,T.N,T.N,gl.RED,gl.FLOAT,T.Hr);
  gl.bindTexture(gl.TEXTURE_2D,R.aTex);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,T.N,T.N,gl.RGBA,gl.UNSIGNED_BYTE,R.makeAux(T));R.subNorm(T);R.uploadFields(T);R.chunkBounds(T);R.uploadVeg(T);};
R.chunkBounds=function(T){R.buildStreams(T);if(Life.T===T)Life.roadsDirty=true;const N=T.N,H=T.Hr||T.H;const CN=16,cw=T.W/CN,cells=N/CN;R.cw=cw;R.cells=cells;R.chunks=[];R.waterChunks=[];R.gridBase=Math.min(64,cells);
  for(let cj=0;cj<CN;cj++)for(let ci=0;ci<CN;ci++){let mn=1e9,mx=-1e9,wmn=1e9,wmx=-1e9,wet=false;
    for(let j=Math.max(cj*cells-1,0);j<=Math.min((cj+1)*cells,N-1);j++)for(let i=Math.max(ci*cells-1,0);i<=Math.min((ci+1)*cells,N-1);i++){const k=j*N+i,h=H[k];if(h<mn)mn=h;if(h>mx)mx=h;
      if(T.water[k*4+3]>0){wet=true;const w=T.water[k*4];if(w<wmn)wmn=w;if(w>wmx)wmx=w;}}
    const c={x:ci*cw,z:cj*cw,gx:ci*cells,gz:cj*cells,y0:mn-12,y1:mx+2};R.chunks.push(c);if(wet)R.waterChunks.push({x:c.x,z:c.z,gx:c.gx,gz:c.gz,y0:wmn-4,y1:wmx+2});}
  let mn=1e9;for(let n=0;n<N*N;n++)mn=Math.min(mn,H[n]);R.yb=mn-25;R.yFloor=R.yb-700;};
// ---- streams: ribbons on the terrain (heights from the drawn terrain triangles in VS_STREAM); the D8 path is rounded off with two
// Chaikin passes and resampled every ~3 m; built twice as wide as the base stream so floods can widen them in the shader.
// Pieces of up to 48 points with a bounding box, so only streams in view and within 3 km are drawn.
// Vertex: pos3, u (-1..1 across), s (m along), half-width, kind+slope
R.buildStreams=function(T){if(R.stVao){gl.deleteVertexArray(R.stVao);gl.deleteBuffer(R.stVb);gl.deleteBuffer(R.stIb);R.stVao=null;}R.stCount=0;R.stPieces=[];const S=T.streams;if(!S||!S.length)return;
  const V=[],I=[],H=T.Hr||T.H,rw=P.riverWidth;let base=0;const C=[],SS=[];
  const chaikin=pt=>{const n=pt.length;if(n<3)return pt;const q=[pt[0]];for(let i=0;i<n-1;i++){const a=pt[i],b=pt[i+1];q.push([a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25,a[2]],[a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75,b[2]]);}q.push(pt[n-1]);return q;};
  for(const s of S){let pt=[];for(let i=0;i<s.length/3;i++)pt.push([s[i*3],s[i*3+1],s[i*3+2]]);pt=chaikin(chaikin(pt));
    {const step=[4.5,3,1.6][clamp(+P.riverQ||0,0,2)]||3,q=[pt[0]];let acc=0;for(let i=1;i<pt.length;i++){acc+=Math.hypot(pt[i][0]-pt[i-1][0],pt[i][1]-pt[i-1][1]);if(acc>=step||i===pt.length-1){q.push(pt[i]);acc=0;}}pt=q;}
    const n=pt.length;if(n<2)continue;SS.push(base/2,n);
    let sd=0;for(let i=0;i<n;i++){const a=pt[Math.max(i-1,0)],b=pt[Math.min(i+1,n-1)];let dx=b[0]-a[0],dz=b[1]-a[1];const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;
      if(i>0)sd+=Math.hypot(pt[i][0]-pt[i-1][0],pt[i][1]-pt[i-1][1]);const ar=Math.abs(pt[i][2]),kind=pt[i][2]>0?1:0;
      const w=kind?clamp(rw*6.5*Math.sqrt(ar),0.7,3.2):clamp(0.35+ar*40,0.35,0.9),hw=w*0.5*(kind?1.8:1.4)*(0.35+0.65*Math.min(1,sd/15));
      const sl=clamp(Math.abs(sampleH(T,b[0],b[1],H)-sampleH(T,a[0],a[1],H))/l,0,0.99);
      C.push(pt[i][0],pt[i][1],dx,dz,hw,kind);for(const u of [-1,1]){const x=pt[i][0]-dz*hw*u,z=pt[i][1]+dx*hw*u;V.push(x,0,z,u,sd,hw,kind+sl*0.99,0);}}
    for(let i0=0;i0<n-1;i0+=48){const i1=Math.min(n-1,i0+48),first=I.length;let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,z0=1e9,z1=-1e9;
      for(let i=i0;i<i1;i++){const a=base+i*2;I.push(a,a+1,a+2,a+1,a+3,a+2);}
      for(let i=i0;i<=i1;i++){const x=pt[i][0],z=pt[i][1],y=sampleH(T,x,z,H);x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,z);z1=Math.max(z1,z);y0=Math.min(y0,y);y1=Math.max(y1,y);}
      R.stPieces.push({first,count:I.length-first,b:[x0-4,y0-6,z0-4,x1+4,y1+6,z1+4]});}
    base+=n*2;}
  R.stDropK=null;R.stFL=null;R.stC=Float32Array.from(C);R.stSS=SS;R.stHid=new Uint8Array(C.length/6);R.stCol=new Uint8Array(C.length/6);R.stV=new Float32Array(V);R.stGrid=new Map();for(let k=0;k<C.length/6;k++){const key=Math.floor(C[k*6]/24)+','+Math.floor(C[k*6+1]/24);if(!R.stGrid.has(key))R.stGrid.set(key,[]);R.stGrid.get(key).push(k);}
  R.stVao=gl.createVertexArray();gl.bindVertexArray(R.stVao);R.stVb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,R.stVb);gl.bufferData(gl.ARRAY_BUFFER,R.stV,gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,32,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,4,gl.FLOAT,false,32,12);gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,1,gl.FLOAT,false,32,28);
  R.stIb=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,R.stIb);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array(I),gl.STATIC_DRAW);gl.bindVertexArray(null);R.stCount=I.length;
  Log.info(`streams: ${S.length} paths, ${V.length/8} verts, ${R.stPieces.length} pieces`);if(Life.T===T&&Life.houses)Life.applyCulverts(null);};
// changed ribbon points (culvert flag, ditch drop) uploaded in contiguous runs
R.uploadStreamPts=function(ks){if(!ks.length||!R.stVb)return;ks.sort((a,b)=>a-b);gl.bindBuffer(gl.ARRAY_BUFFER,R.stVb);const V=R.stV;
  for(let i=0;i<ks.length;){let j=i;while(j+1<ks.length&&ks[j+1]-ks[j]<=8)j++;const v0=ks[i]*2,v1=ks[j]*2+1;gl.bufferSubData(gl.ARRAY_BUFFER,v0*32,V.subarray(v0*8,(v1+1)*8));i=j+1;}};
// trees, bushes and rocks standing where a culvert ditch is dug go
R.sinkVeg=function(T,ts){if(!ts.length)return;let n=0;const CN=16,cw=T.W/CN;
  for(const t of ts){const rr=t.ext,c0=clamp(Math.floor((t.fx-rr)/cw),0,CN-1),c1=clamp(Math.floor((t.fx+rr)/cw),0,CN-1),r0=clamp(Math.floor((t.fz-rr)/cw),0,CN-1),r1=clamp(Math.floor((t.fz+rr)/cw),0,CN-1);
    for(const B of R.vegB||[]){const D=B.data;for(let cj=r0;cj<=r1;cj++)for(let ci=c0;ci<=c1;ci++){const ch=cj*CN+ci;for(let k=B.start[ch];k<B.start[ch+1];k++){const x=D[k*8],z=D[k*8+2];if(!(D[k*8+3]>0)||Math.abs(x-t.fx)>rr||Math.abs(z-t.fz)>rr)continue;if(Life.trenchDepth([t],x,z)>0.08){D[k*8+3]=0;B.orig[k]=0;n++;}}}}
    for(const arr of [...((T.veg&&T.veg.trees)||[]),(T.veg&&T.veg.rocks)||[]])for(let k=0;k+3<arr.length;k+=8)if(arr[k+3]>0&&Math.abs(arr[k]-t.fx)<rr&&Math.abs(arr[k+2]-t.fz)<rr&&Life.trenchDepth([t],arr[k],arr[k+2])>0.08){arr[k+3]=0;n++;}}
  if(n){R.vegKey='';}};
// streams that run under a village plot, street or square: the ribbon points collapse (only the changed vertices are uploaded)
R.setStreamHidden=function(list){if(!list.length||!R.stVb)return;const V=R.stV;let v0=1e9,v1=-1;
  for(const [k,h] of list){V[(k*2)*8+7]=h;V[(k*2+1)*8+7]=h;v0=Math.min(v0,k*2);v1=Math.max(v1,k*2+1);}
  gl.bindBuffer(gl.ARRAY_BUFFER,R.stVb);gl.bufferSubData(gl.ARRAY_BUFFER,v0*32,V.subarray(v0*8,(v1+1)*8));};
// the arrays are kept and refilled (allocating ~50 MB on every rebuild caused second-long garbage-collection stalls)
R.buildRoads=function(T){const RS=T.W>4096?3072:2048,W=T.W,px=W/RS,same=R.roadD&&R.roadRS===RS,D=same?R.roadD.fill(4):new Float32Array(RS*RS).fill(4),KD=same?R.roadK.fill(0):new Uint8Array(RS*RS),RL=Life.roads||[];let kind=0;R.roadD=D;R.roadK=KD;R.roadRS=RS;
  const seg=(x0,z0,x1,z1,w)=>{const m=w+4,i0=Math.max(0,Math.floor((Math.min(x0,x1)-m)/px)),i1=Math.min(RS-1,Math.ceil((Math.max(x0,x1)+m)/px)),j0=Math.max(0,Math.floor((Math.min(z0,z1)-m)/px)),j1=Math.min(RS-1,Math.ceil((Math.max(z0,z1)+m)/px));
    const ex=x1-x0,ez=z1-z0,ll=ex*ex+ez*ez||1e-6;for(let j=j0;j<=j1;j++){const z=(j+0.5)*px;for(let i=i0;i<=i1;i++){const x=(i+0.5)*px,t=clamp(((x-x0)*ex+(z-z0)*ez)/ll,0,1),d=Math.hypot(x-x0-ex*t,z-z0-ez*t)-w,k=j*RS+i;if(d<D[k]){D[k]=d;KD[k]=kind;}}}};
  for(const r of RL){kind=r.kind|0;if(r.disc){const [cx,cz,rr]=r.disc;seg(cx,cz,cx,cz,rr);continue;}const p=r.p;for(let i=0;i+3<p.length;i+=2)seg(p[i],p[i+1],p[i+2],p[i+3],r.w);}
  for(let k=0;k<D.length;k++){if(D[k]<0.5){const x=((k%RS)+0.5)*px,z=(((k/RS)|0)+0.5)*px,w=sampleWater(T,x,z);if(w[1]>0&&w[0]>R.sampleHr(T,x,z)-0.2)D[k]=4;}}
  // the upload buffer still holds what the texture has: note the rectangle that changed, and upload only that
  const fresh=!(R.roadH16&&R.roadH16.length===RS*RS*2),H16=fresh?(R.roadH16=new Float32Array(RS*RS*2)):R.roadH16;let ci0=RS,ci1=-1,cj0=RS,cj1=-1;
  for(let j=0;j<RS;j++){let rowCh=false;for(let i=0;i<RS;i++){const k=j*RS+i;if(H16[k*2]!==D[k]||H16[k*2+1]!==KD[k]){H16[k*2]=D[k];H16[k*2+1]=KD[k];if(i<ci0)ci0=i;if(i>ci1)ci1=i;rowCh=true;}}if(rowCh){if(j<cj0)cj0=j;cj1=j;}}
  // reuse the texture while its size is unchanged (it used to be re-created on every road rebuild: .w was never set, so each rebuild leaked 16 MB of GPU memory)
  const tu=performance.now();if(!R.roadTex||R.roadTex.w!==RS||fresh){if(R.roadTex)gl.deleteTexture(R.roadTex);R.roadTex=tex2D(RS,RS,gl.RG16F,gl.RG,gl.FLOAT,H16,gl.LINEAR);R.roadTex.w=RS;}
  else if(ci1>=0){scratch();gl.bindTexture(gl.TEXTURE_2D,R.roadTex);const w=ci1-ci0+1,h=cj1-cj0+1;if(w===RS)gl.texSubImage2D(gl.TEXTURE_2D,0,0,cj0,RS,h,gl.RG,gl.FLOAT,H16.subarray(cj0*RS*2,(cj1+1)*RS*2));
    else{const S2=new Float32Array(w*h*2);for(let j=0;j<h;j++)S2.set(H16.subarray(((cj0+j)*RS+ci0)*2,((cj0+j)*RS+ci1+1)*2),j*w*2);gl.texSubImage2D(gl.TEXTURE_2D,0,ci0,cj0,w,h,gl.RG,gl.FLOAT,S2);}}
  bindTU(TU.uRoad,gl.TEXTURE_2D,R.roadTex);Log.info(`roads: ${RL.length} pieces in a ${RS}² distance field (${px.toFixed(2)} m/texel), upload ${(performance.now()-tu).toFixed(0)} ms`);};
// a few new road pieces (garden paths) stamped into the kept distance field; only the touched patch is uploaded
R.addRoadPieces=function(T,pieces){if(!R.roadD||!R.roadTex||R.roadRS!==(T.W>4096?3072:2048))return false;const RS=R.roadRS,px=T.W/RS,D=R.roadD,KD=R.roadK,H16=R.roadH16&&R.roadH16.length===RS*RS*2?R.roadH16:null;/* the full-upload buffer is kept in step with the texture */let bi0=RS,bi1=-1,bj0=RS,bj1=-1;
  const seg=(x0,z0,x1,z1,w,kind)=>{const m=w+4,i0=Math.max(0,Math.floor((Math.min(x0,x1)-m)/px)),i1=Math.min(RS-1,Math.ceil((Math.max(x0,x1)+m)/px)),j0=Math.max(0,Math.floor((Math.min(z0,z1)-m)/px)),j1=Math.min(RS-1,Math.ceil((Math.max(z0,z1)+m)/px));
    bi0=Math.min(bi0,i0);bi1=Math.max(bi1,i1);bj0=Math.min(bj0,j0);bj1=Math.max(bj1,j1);const ex=x1-x0,ez=z1-z0,ll=ex*ex+ez*ez||1e-6;
    for(let j=j0;j<=j1;j++){const z=(j+0.5)*px;for(let i=i0;i<=i1;i++){const x=(i+0.5)*px,t=clamp(((x-x0)*ex+(z-z0)*ez)/ll,0,1),d=Math.hypot(x-x0-ex*t,z-z0-ez*t)-w,k=j*RS+i;if(d<D[k]){const wt=sampleWater(T,x,z);if(d<0.5&&wt[1]>0&&wt[0]>R.sampleHr(T,x,z)-0.2)continue;D[k]=d;KD[k]=kind;}}}};
  for(const r of pieces){const p=r.p;for(let i=0;i+3<p.length;i+=2)seg(p[i],p[i+1],p[i+2],p[i+3],r.w,r.kind|0);}
  if(bi1<bi0)return true;const w=bi1-bi0+1,h=bj1-bj0+1,S=new Float32Array(w*h*2);for(let j=0;j<h;j++)for(let i=0;i<w;i++){const k=(bj0+j)*RS+bi0+i,o=(j*w+i)*2;S[o]=D[k];S[o+1]=KD[k];if(H16){H16[k*2]=D[k];H16[k*2+1]=KD[k];}}
  scratch();gl.bindTexture(gl.TEXTURE_2D,R.roadTex);gl.texSubImage2D(gl.TEXTURE_2D,0,bi0,bj0,w,h,gl.RG,gl.FLOAT,S);bindTU(TU.uRoad,gl.TEXTURE_2D,R.roadTex);return true;};
// medieval stone bridges from the building kit (buildings/bridge.js), one instance each, two levels of detail (close: LOD 0, else LOD 2)
// medieval stone bridges from the building kit (buildings/bridge.js), one instance each, two levels of detail (close: LOD 0, else LOD 2).
// Each bridge's packed geometry is cached by its place and size, so rebuilding the roads only builds the bridges that are new.
R.bridgeCache=new Map();
R.buildBridges=function(BL){if(R.bridgeKit){gl.deleteBuffer(R.bridgeKit.vao.vbo);gl.deleteVertexArray(R.bridgeKit.vao);gl.deleteBuffer(R.bridgeKit.ib);R.bridgeKit=null;}R.bridgeMesh=null;if(!BL||!BL.length)return;
  const T=R.world,parts=[],list=[],inst=new Float32Array(BL.length*8),used=new Set();let total=0,built=0;const t0=performance.now();
  BL.forEach((b,i)=>{const p=b.pts,dx0=p[p.length-1][0]-p[0][0],dz0=p[p.length-1][2]-p[0][2],l=Math.hypot(dx0,dz0)||1,dx=dx0/l,dz=dz0/l,L=b.len,cx=b.cx,cz=b.cz;
    const gs=[];let y0=1e9;for(let u=-L/2-1;u<=L/2+1.01;u+=0.5){const y=R.sampleHr(T,cx+dx*u,cz+dz*u);gs.push([u,y]);y0=Math.min(y0,y);}y0-=0.2;
    const key=[cx,cz,L,b.w,y0,p[0][1],p[p.length>>1][1],dx].map(q=>q.toFixed(2)).join(',');used.add(key);let c=R.bridgeCache.get(key);
    if(!c){const deck=p.map(q=>[(q[0]-cx)*dx+(q[2]-cz)*dz,q[1]-y0]).sort((a,c2)=>a[0]-c2[0]),ground=gs.map(([u,y])=>[u,y-y0]);
      const spec={L,w:b.w,deck,ground,water:b.lvl>-1e8?b.lvl-y0:null,sw:b.sw||0,seed:7+((cx*13+cz*7)|0)%997};c={lod:[]};
      for(const lod of [0,2]){const a=KIT.bridge(spec,lod),n=a.length/16;c.lod.push({ab:R.packKit([a],n),n});}KIT.VB.length=0;R.bridgeCache.set(key,c);built++;}
    const e={x:cx,z:cz,r:L/2+3,lod:[]};for(const q of c.lod){parts.push(q.ab);e.lod.push({first:total,count:q.n});total+=q.n;}list.push(e);inst.set([cx,y0,cz,1,Math.atan2(dz,dx),0.5,(i*0.618)%1,0],i*8);});
  for(const k of [...R.bridgeCache.keys()])if(!used.has(k))R.bridgeCache.delete(k);
  const AB=new Uint8Array(total*32);let o=0;for(const ab of parts){AB.set(new Uint8Array(ab),o);o+=ab.byteLength;}
  const vao=R.kitVaoOf(AB.buffer),ib=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,ib);gl.bufferData(gl.ARRAY_BUFFER,inst,gl.STATIC_DRAW);
  R.bridgeKit={vao,ib,list};Log.info(`bridges: ${BL.length} in stone (${built} new), ${(total/3/1000).toFixed(0)}k triangles, ${(performance.now()-t0).toFixed(0)} ms`);};
R.buildCrossings=function(XL){if(R.xingMesh){gl.deleteVertexArray(R.xingMesh.vao);R.xingMesh=null;}if(!XL||!XL.length)return;const M=vmesh(),wd=[0.42,0.32,0.22],wd2=[0.36,0.27,0.19];
  for(const q of XL){const rx=Math.cos(q.rh),rz=Math.sin(q.rh),nx=-rz,nz=rx,hw=q.w+0.3,hl=2.9,top=q.y+0.1,bot=q.y-0.45;
    for(let k=0;k<8;k++){const u0=-hl+k*(2*hl/8)+0.03,u1=-hl+(k+1)*(2*hl/8)-0.03,P0=[q.x+rx*u0-nx*hw,top,q.z+rz*u0-nz*hw],P1=[q.x+rx*u1-nx*hw,top,q.z+rz*u1-nz*hw],P2=[q.x+rx*u1+nx*hw,top,q.z+rz*u1+nz*hw],P3=[q.x+rx*u0+nx*hw,top,q.z+rz*u0+nz*hw];
      vq(M,P0,P1,P2,P3,[0,1,0],k%2?wd:wd2,0);}
    const C=[[-hl,-hw],[hl,-hw],[hl,hw],[-hl,hw]].map(([u,w])=>[q.x+rx*u+nx*w,q.z+rz*u+nz*w]);for(let k=0;k<4;k++){const a=C[k],b=C[(k+1)%4],ex=b[0]-a[0],ez=b[1]-a[1],el=Math.hypot(ex,ez)||1;
      vq(M,[a[0],bot,a[1]],[b[0],bot,b[1]],[b[0],top,b[1]],[a[0],top,a[1]],[ez/el,0,-ex/el],wd2,0);}}
  R.xingMesh=R.uploadVeh(M);Log.info(`level crossings: ${XL.length}`);};
R.buildDocks=function(DL){if(R.dockMesh){gl.deleteVertexArray(R.dockMesh.vao);R.dockMesh=null;}if(!DL||!DL.length)return;const M=vmesh(),T=R.world,wd=[0.52,0.38,0.25],wd2=[0.40,0.29,0.19],dk=[0.2,0.15,0.11],wh=[0.92,0.9,0.85],rd=[0.7,0.18,0.12];
  const nrm=(a,b,c)=>{const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];let x=uy*vz-uz*vy,y=uz*vx-ux*vz,z=ux*vy-uy*vx;const l=Math.hypot(x,y,z)||1;return[x/l,y/l,z/l];};
  const obox=(c,f,hl,hw,hh,col)=>{const l=[-f[1],f[0]],P=(a,b,d)=>[c[0]+f[0]*a*hl+l[0]*b*hw,c[1]+d*hh,c[2]+f[1]*a*hl+l[1]*b*hw],Q=(p,q,r,t)=>vq(M,p,q,r,t,nrm(p,q,r),col,0);
    const v=[P(-1,-1,-1),P(1,-1,-1),P(1,1,-1),P(-1,1,-1),P(-1,-1,1),P(1,-1,1),P(1,1,1),P(-1,1,1)];Q(v[4],v[5],v[6],v[7]);Q(v[3],v[2],v[1],v[0]);Q(v[0],v[1],v[5],v[4]);Q(v[1],v[2],v[6],v[5]);Q(v[2],v[3],v[7],v[6]);Q(v[3],v[0],v[4],v[7]);};
  for(const d of DL){const f=[d.nx,d.nz],sd=[-d.nz,d.nx],y=d.lvl+0.9,L0=-3,L1=d.L+3,at=(u,w)=>[d.sx+f[0]*u+sd[0]*w,d.sz+f[1]*u+sd[1]*w];
    for(let u=L0;u<L1;u+=0.6){const c=at(u+0.3,0);obox([c[0],y,c[1]],f,0.27,1.6,0.05,(Math.round(u/0.6)%3===0)?wd2:wd);}
    for(const w of [-1.4,1.4])for(let u=L0+0.5;u<=L1;u+=3){const c=at(u,w),gy=R.sampleHr(T,c[0],c[1])-0.8;obox([c[0],(y+gy)/2,c[1]],f,0.13,0.13,(y-gy)/2+0.05,dk);}
    for(const w of [-1.55,1.55]){const cA=at((L0+L1)/2,w);obox([cA[0],y-0.25,cA[1]],f,(L1-L0)/2,0.06,0.12,wd2);}
    for(const w of [-1.5,1.5]){const u1=w>0?L1-14:L1;for(let u=L0+1;u<=u1;u+=2){const c=at(u,w);obox([c[0],y+0.55,c[1]],f,0.04,0.04,0.5,wd2);}const cR=at((L0+1+u1)/2,w);obox([cR[0],y+1.02,cR[1]],f,(u1-L0-1)/2,0.04,0.04,wd);}
    for(const u of [L1-1,L1-7,L1-13]){const c=at(u,1.35);obox([c[0],y+0.3,c[1]],f,0.13,0.13,0.25,dk);}
    for(const u of [L1-0.5,L0+2]){const c=at(u,-1.45);obox([c[0],y+1.4,c[1]],f,0.05,0.05,1.4,dk);obox([c[0],y+2.95,c[1]],f,0.16,0.16,0.18,[1,0.85,0.5]);}
    const hc=at(-6.5,-1.5),hy=d.sy;obox([hc[0],hy+1.2,hc[1]],f,1.4,1.1,1.25,wh);obox([hc[0],hy+2.65,hc[1]],f,1.65,1.35,0.2,rd);obox([hc[0],hy+3.0,hc[1]],f,1.2,0.9,0.18,rd);
    const dc=at(-5.1,-1.5);obox([dc[0],hy+0.95,dc[1]],f,0.03,0.45,0.95,dk);const sg=at(-1.5,1.8);obox([sg[0],hy+1.1,sg[1]],f,0.05,0.05,1.1,dk);obox([sg[0],hy+2.1,sg[1]],f,0.04,0.6,0.25,wh);}
  R.dockMesh=R.uploadVeh(M);Log.info(`docks: ${DL.length}`);};
// lamp light map: every street lantern's pool of light, rasterised once into a world texture (sampled by pools())
// the night glow of street lamps on the ground (1024² RGBA16F). Rebuilt only where lamps came or went: a full upload converts 4 million
// floats to half precision on the CPU (seconds on some drivers), and the village code asks for the map on every village update
R.buildLampMap=function(T,LM){const RS=1024,px=T.W/RS,r=18,col=[1.6,1.05,0.55];const keyOf=l=>Math.round(l.x*10)+','+Math.round(l.z*10);
  const now=new Map();for(const l of LM)now.set(keyOf(l),l);const prev=R._lmSet;let bb=null;
  if(R.lampTex&&prev&&R._lmW===T.W){const grow=l=>{const a=[l.x-r,l.z-r,l.x+r,l.z+r];bb=bb?[Math.min(bb[0],a[0]),Math.min(bb[1],a[1]),Math.max(bb[2],a[2]),Math.max(bb[3],a[3])]:a;};
    for(const [k,l] of now)if(!prev.has(k))grow(l);for(const [k,l] of prev)if(!now.has(k))grow(l);if(!bb){R._lmSet=now;return;}}
  R._lmSet=now;R._lmW=T.W;const D=R._lmD||(R._lmD=new Float32Array(RS*RS*4));
  const i0=bb?Math.max(0,Math.floor(bb[0]/px)-1):0,i1=bb?Math.min(RS-1,Math.ceil(bb[2]/px)+1):RS-1,j0=bb?Math.max(0,Math.floor(bb[1]/px)-1):0,j1=bb?Math.min(RS-1,Math.ceil(bb[3]/px)+1):RS-1;
  for(let j=j0;j<=j1;j++)D.fill(0,(j*RS+i0)*4,(j*RS+i1+1)*4);
  for(const l of LM){if(l.x+r<i0*px||l.x-r>(i1+1)*px||l.z+r<j0*px||l.z-r>(j1+1)*px)continue;const a0=Math.max(i0,Math.floor((l.x-r)/px)),a1=Math.min(i1,Math.ceil((l.x+r)/px)),b0=Math.max(j0,Math.floor((l.z-r)/px)),b1=Math.min(j1,Math.ceil((l.z+r)/px));
    for(let j=b0;j<=b1;j++)for(let i=a0;i<=a1;i++){const d=Math.hypot((i+0.5)*px-l.x,(j+0.5)*px-l.z);if(d>=r)continue;let a=1-d/r;a*=a;const k=(j*RS+i)*4;D[k]+=col[0]*a;D[k+1]+=col[1]*a;D[k+2]+=col[2]*a;}}
  if(!R.lampTex)R.lampTex=tex2D(RS,RS,gl.RGBA16F,gl.RGBA,gl.FLOAT,D,gl.LINEAR);
  else{scratch();gl.bindTexture(gl.TEXTURE_2D,R.lampTex);const w=i1-i0+1,h=j1-j0+1;if(w===RS)gl.texSubImage2D(gl.TEXTURE_2D,0,0,j0,RS,h,gl.RGBA,gl.FLOAT,D.subarray(j0*RS*4,(j1+1)*RS*4));
    else{const S2=new Float32Array(w*h*4);for(let j=0;j<h;j++)S2.set(D.subarray(((j0+j)*RS+i0)*4,((j0+j)*RS+i1+1)*4),j*w*4);gl.texSubImage2D(gl.TEXTURE_2D,0,i0,j0,w,h,gl.RGBA,gl.FLOAT,S2);}}
  bindTU(TU.uLampMap,gl.TEXTURE_2D,R.lampTex);};
R.drawStreams=function(cam){if(!R.stCount)return;const p=R.pStream;gl.useProgram(p.p);gl.uniform4f(p.u('uFlood'),Weather.flood||0,P.runoff,+P.riverQ||0,0);
  const CL=R.stCL||(R.stCL=new Float32Array(256));R.chunks.forEach((c,k)=>{CL[k]=R.chunkLod(c,cam);});gl.uniform4fv(p.u('uCL'),CL);gl.uniform1f(p.u('uGB'),R.gridBase);
  gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-1,-4);gl.bindVertexArray(R.stVao);
  let f0=-1,f1=-1;const flush=()=>{if(f0>=0){gl.drawElements(gl.TRIANGLES,f1-f0,gl.UNSIGNED_INT,f0*4);Stats.draws++;Stats.tris+=(f1-f0)/3;}f0=-1;};
  for(const q of R.stPieces){const b=q.b,dx=Math.max(b[0]-cam.pos[0],0,cam.pos[0]-b[3]),dz=Math.max(b[2]-cam.pos[2],0,cam.pos[2]-b[5]);
    if(Math.hypot(dx,dz)>3000||!boxVisible(cam.planes,b[0],b[1],b[2],b[3],b[4],b[5])){flush();continue;}if(f0>=0&&f1===q.first)f1+=q.count;else{flush();f0=q.first;f1=q.first+q.count;}}flush();
  gl.bindVertexArray(null);gl.disable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(0,0);};
// ---- the board edge, table, legs and floor
R.buildBoard=function(T){const N=T.N;
  if(R.wallN!==N){R.wallN=N;const V=[],I=[];let base=0;for(let side=0;side<4;side++){for(let k=0;k<=N;k++){V.push(k/N,1,side,k/N,0,side);}for(let k=0;k<N;k++){const a=base+k*2;I.push(a,a+1,a+2,a+1,a+3,a+2);}base+=(N+1)*2;}
    if(!R.wallVao){R.wallVao=gl.createVertexArray();R.wallVb=gl.createBuffer();R.wallIb=gl.createBuffer();}
    gl.bindVertexArray(R.wallVao);gl.bindBuffer(gl.ARRAY_BUFFER,R.wallVb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(V),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,12,0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,R.wallIb);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array(I),gl.STATIC_DRAW);gl.bindVertexArray(null);R.wallCount=I.length;}
  const W=T.W,yb=R.yb,M=vmesh(),m=34,th=10,wood=[0.50,0.33,0.21],yF=R.yFloor;
  vbox(M,[W/2,yb-th/2,W/2],[W+2*m,th,W+2*m],wood,5);vbox(M,[W/2,yb-th-1.5,W/2],[W+2*m-8,3,W+2*m-8],[0.36,0.24,0.16],5);
  for(const x of [-m+22,W+m-22])for(const z of [-m+22,W+m-22])vbox(M,[x,(yb-th+yF)/2,z],[34,yb-th-yF,34],[0.42,0.28,0.18],5);
  const F=30000;vq(M,[W/2-F,yF,W/2-F],[W/2-F,yF,W/2+F],[W/2+F,yF,W/2+F],[W/2+F,yF,W/2-F],[0,1,0],[0.56,0.42,0.30],6);
  if(R.tableMesh){gl.deleteVertexArray(R.tableMesh.vao);}R.tableMesh=R.uploadVeh(M);};
R.uploadVeh=function(M){const vao=gl.createVertexArray();gl.bindVertexArray(vao);const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(M.v),gl.STATIC_DRAW);
  [[0,3,0],[1,3,12],[2,3,24],[3,4,36],[4,1,52]].forEach(([l,n,o])=>{gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,n,gl.FLOAT,false,56,o);});
  const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array(M.i),gl.STATIC_DRAW);gl.bindVertexArray(null);return{vao,count:M.i.length};};
R.buildVehicleMeshes=function(ms){R.veh=ms.map(M=>R.uploadVeh(M));Log.info(`rolling stock meshes: ${ms.map(m=>m.i.length/3).join(', ')} tris`);};

// ---- vegetation: instances bucketed by chunk; near/far lists rebuilt when the view changes
R.uploadVeg=function(T){const CN=16,cw=T.W/CN;R.vegB=[];const sets=[...T.veg.trees,T.veg.rocks];
  sets.forEach((arr,type)=>{const n=arr.length/8,cnt=new Int32Array(CN*CN+1),ck=new Int32Array(n);
    for(let k=0;k<n;k++){const c=clamp(Math.floor(arr[k*8+2]/cw),0,CN-1)*CN+clamp(Math.floor(arr[k*8]/cw),0,CN-1);ck[k]=c;cnt[c+1]++;}
    for(let c=0;c<CN*CN;c++)cnt[c+1]+=cnt[c];const pos=cnt.slice(),out=new Float32Array(arr.length);
    for(let k=0;k<n;k++){const d=pos[ck[k]]++;out.set(arr.subarray(k*8,k*8+8),d*8);const x=out[d*8],z=out[d*8+2];out[d*8+1]+=R.sampleHr(T,x,z)-sampleH(T,x,z);}
    const ymax=new Float32Array(CN*CN);for(let c=0;c<CN*CN;c++){let y=-1e9;for(let k=cnt[c];k<cnt[c+1];k++)y=Math.max(y,out[k*8+1]+out[k*8+3]);ymax[c]=y;}
    {let sd=(P.seed|0)*7+type*131+17;const rnd=()=>{sd=(sd*1103515245+12345)&0x7fffffff;return sd/0x7fffffff;};const tmp=new Float32Array(8);// shuffle inside each chunk so a thinned prefix is an even sample
      for(let c=0;c<CN*CN;c++)for(let k=cnt[c+1]-1;k>cnt[c];k--){const j=cnt[c]+Math.floor(rnd()*(k-cnt[c]+1));tmp.set(out.subarray(k*8,k*8+8));out.copyWithin(k*8,j*8,j*8+8);out.set(tmp,j*8);}}
    R.vegB.push({data:out,start:cnt,ymax,orig:Float32Array.from({length:n},(_,k)=>out[k*8+3])});});
  R.applyVegMask(T);};
R.applyVegMask=function(T){if(!R.vegB)return;const N=T.N,cs=T.cs,M=T.trackMask;let hid=0;
  for(const B of R.vegB){const D=B.data,n=D.length/8;for(let k=0;k<n;k++){const x=D[k*8],z=D[k*8+2];let s=B.orig[k];
    if(M&&s>0){const i=(x/cs)|0,j=(z/cs)|0;let m=0;for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const ii=clamp(i+di,0,N-1),jj=clamp(j+dj,0,N-1);m=Math.max(m,M[jj*N+ii]);}if(m>30){s=0;hid++;}}
    D[k*8+3]=s;}}R.vegKey='';if(hid)Log.info(`${hid} trees/rocks cleared for the track`);};
R.updateVegLists=function(cam,force){if(!R.vegB)return;const T=R.world,CN=16,cw=T.W/CN,pl=cam.planesWide||cam.planes;let key='';
  const near=P.treeLod,far=P.treeDist;const vis=[],fr=[];
  for(let c=0;c<CN*CN;c++){const x0=(c%CN)*cw,z0=Math.floor(c/CN)*cw,ch=R.chunks[c];if(!ch){vis.push(0);fr.push(0);continue;}
    if(!boxVisible(pl,x0-40,ch.y0,z0-40,x0+cw+40,Math.max(ch.y1+40,ch.y0+60),z0+cw+40)){vis.push(0);fr.push(0);continue;}
    const dx=Math.max(x0-cam.pos[0],0,cam.pos[0]-x0-cw),dz=Math.max(z0-cam.pos[2],0,cam.pos[2]-z0-cw),d=Math.hypot(dx,dz,Math.max(0,cam.pos[1]-ch.y1)*0.5);
    const r=d<near?1:d<far?2:0;vis.push(r);fr.push(r===2?clamp(Math.pow(near*1.6/Math.max(d,1),1.5),0.1,1):1);}
  // thinning per chunk, then one global factor so the total stays inside the plant budget
  let tot=0;R.vegB.forEach((B,type)=>{for(let c=0;c<vis.length;c++)if(vis[c]&&!(type===5&&vis[c]===2))tot+=(B.start[c+1]-B.start[c])*fr[c]*(type===2&&vis[c]===2?0.6:1);});
  const g=Math.max(0.15,Math.min(1,(P.vegBudget||70000)/Math.max(tot,1)));
  for(let c=0;c<vis.length;c++)key+=vis[c]+(vis[c]?String.fromCharCode(97+Math.round(fr[c]*g*20)):'');key+=Math.round(g*40);
  if(key===R.vegKey&&!force)return;R.vegKey=key;R.vegShown=Math.round(tot*g);R.vegScr=R.vegScr||{};
  R.vegB.forEach((B,type)=>{for(const ring of [1,2]){if(type===5&&ring===2)continue;const id='veg'+type+'_'+ring,keep=c=>Math.round((B.start[c+1]-B.start[c])*Math.min(1,fr[c]*g*(type===2&&ring===2?0.6:1)));
      let n=0;for(let c=0;c<vis.length;c++)if(vis[c]===ring)n+=keep(c);
      let a=R.vegScr[id];if(!a||a.length<Math.max(n,1)*8)a=R.vegScr[id]=new Float32Array(Math.ceil(Math.max(n,1)*1.4)*8);let o=0;
      for(let c=0;c<vis.length;c++)if(vis[c]===ring){const s=B.start[c],k=keep(c);if(!k)continue;a.set(B.data.subarray(s*8,(s+k)*8),o*8);
        const f=fr[c]*g;if(f<0.98){const sc=Math.min(1.45,Math.pow(f,-0.25));for(let q=o;q<o+k;q++)a[q*8+3]*=sc;}o+=k;}
      R.inst(id,a,n);}});};
R.drawVeg=function(pass){if(!P.treesOn||!R.vegB)return;for(let t=0;t<6;t++){R.drawObj('t'+t+'n',t,R.instBufs['veg'+t+'_1'],pass);if(t<5)R.drawObj('t'+t+'f',t,R.instBufs['veg'+t+'_2'],pass);}};

// ---- a village plot levelled while playing: upload just that patch of heights and normals, widen the chunk bounds
R.patchTerrain=function(T,i0,j0,i1,j1){R.terrVer=(R.terrVer|0)+1;const N=T.N,cs=T.cs,H=T.Hr;i0=Math.max(0,i0-1);j0=Math.max(0,j0-1);i1=Math.min(N-1,i1+1);j1=Math.min(N-1,j1+1);const w=i1-i0+1,h=j1-j0+1;
  const Hs=new Float32Array(w*h);for(let j=0;j<h;j++)Hs.set(H.subarray((j0+j)*N+i0,(j0+j)*N+i0+w),j*w);scratch();gl.bindTexture(gl.TEXTURE_2D,R.hTex);gl.texSubImage2D(gl.TEXTURE_2D,0,i0,j0,w,h,gl.RED,gl.FLOAT,Hs);
  const A=R.normData,Ns=new Uint8Array(w*h*4);for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const l=H[j*N+Math.max(i-1,0)],r=H[j*N+Math.min(i+1,N-1)],d=H[Math.max(j-1,0)*N+i],u=H[Math.min(j+1,N-1)*N+i];
    const nx=(l-r)/(2*cs),nz=(d-u)/(2*cs),L=Math.hypot(nx,1,nz),o=((j-j0)*w+(i-i0))*4,q=[Math.round((nx/L*0.5+0.5)*255),Math.round((0.5/L+0.5)*255),Math.round((nz/L*0.5+0.5)*255),255];Ns.set(q,o);if(A)A.set(q,(j*N+i)*4);}
  gl.bindTexture(gl.TEXTURE_2D,R.nTex);gl.texSubImage2D(gl.TEXTURE_2D,0,i0,j0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,Ns);
  const cells=R.cells;for(const c of R.chunks||[]){if(c.gx>i1||c.gx+cells<i0||c.gz>j1||c.gz+cells<j0)continue;for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const y=H[j*N+i];c.y0=Math.min(c.y0,y-12);c.y1=Math.max(c.y1,y+2);}}};
// trees and rocks inside a new plot (plus a margin) taken away, in the drawn lists and the world data
R.clearVegRect=function(T,Q,m){let n=0;const rr=Math.max(-Q.x0,Q.x1,-Q.z0,Q.z1)+m+2;
  const CN=16,cw=T.W/CN,c0=clamp(Math.floor((Q.x-rr)/cw),0,CN-1),c1=clamp(Math.floor((Q.x+rr)/cw),0,CN-1),r0=clamp(Math.floor((Q.z-rr)/cw),0,CN-1),r1=clamp(Math.floor((Q.z+rr)/cw),0,CN-1);
  for(const B of R.vegB||[]){const D=B.data;for(let cj=r0;cj<=r1;cj++)for(let ci=c0;ci<=c1;ci++){const ch=cj*CN+ci;for(let k=B.start[ch];k<B.start[ch+1];k++){const x=D[k*8],z=D[k*8+2];if(Math.abs(x-Q.x)>rr||Math.abs(z-Q.z)>rr||!(D[k*8+3]>0))continue;if(VG.inRect(Q,x,z,m)){D[k*8+3]=0;B.orig[k]=0;n++;}}}}
  for(const arr of [...((T.veg&&T.veg.trees)||[]),(T.veg&&T.veg.rocks)||[]])for(let k=0;k+3<arr.length;k+=8)if(Math.abs(arr[k]-Q.x)<rr&&Math.abs(arr[k+2]-Q.z)<rr&&VG.inRect(Q,arr[k],arr[k+2],m))arr[k+3]=0;
  R.vegKey='';return n;};
// ---- after track edits: new heights, mask, holes, trees and houses on the bed hidden
// upload only the rectangle of a float texture that changed since the last upload (kept as R[key]): a track or station changes a small
// part of the 8 km map, the full 16 MB water texture took seconds to send on every edit
R.subRect=function(tex,N,ch,data,key){const tS=performance.now(),old=R[key];R[key]=data;scratch();gl.bindTexture(gl.TEXTURE_2D,tex);
  if(!old||old.length!==data.length){gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,N,N,gl.RGBA,gl.FLOAT,data);return;}
  let i0=N,i1=-1,j0=N,j1=-1;for(let j=0;j<N;j++){const r=j*N*ch;let a=-1,b=-1;for(let k=0;k<N*ch;k++)if(old[r+k]!==data[r+k]){if(a<0)a=k;b=k;}if(a>=0){if(j<j0)j0=j;j1=j;i0=Math.min(i0,(a/ch)|0);i1=Math.max(i1,(b/ch)|0);}}
  if(i1<0)return;const w=i1-i0+1,h=j1-j0+1;Log.info(`texture update ${key}: ${w}×${h} of ${N}² (diff found in ${(performance.now()-tS).toFixed(0)} ms)`);if(w===N){gl.texSubImage2D(gl.TEXTURE_2D,0,0,j0,N,h,gl.RGBA,gl.FLOAT,data.subarray(j0*N*ch,(j1+1)*N*ch));return;}
  const S2=new Float32Array(w*h*ch);for(let j=0;j<h;j++)S2.set(data.subarray(((j0+j)*N+i0)*ch,((j0+j)*N+i1+1)*ch),j*w*ch);gl.texSubImage2D(gl.TEXTURE_2D,0,i0,j0,w,h,gl.RGBA,gl.FLOAT,S2);};
R.updateTerrain=function(T){R.terrVer=(R.terrVer|0)+1;R.computeRenderHeights(T);scratch();
  gl.bindTexture(gl.TEXTURE_2D,R.hTex);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,T.N,T.N,gl.RED,gl.FLOAT,T.Hr);
  gl.bindTexture(gl.TEXTURE_2D,R.aTex);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,T.N,T.N,gl.RGBA,gl.UNSIGNED_BYTE,R.makeAux(T));R.subNorm(T);R.subRect(R.wTex,T.N,4,R.waterRender(T),'_wLast');
  R.chunkBounds(T);R.applyVegMask(T);Life.applyTrackMask(T);R.rebuildTrackMesh();if(Life.T===T)Life.applyCulverts();};

// ---- track meshes (format: pos3 nrm3 uv2 mat1)
R.trackBuf=function(store,mesh){if(!store.vao){store.vao=gl.createVertexArray();store.vb=gl.createBuffer();store.ib=gl.createBuffer();gl.bindVertexArray(store.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER,store.vb);[[0,3,0],[1,3,12],[2,2,24],[3,1,32]].forEach(([l,n,o])=>{gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,n,gl.FLOAT,false,36,o);});
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,store.ib);gl.bindVertexArray(null);}
  gl.bindVertexArray(null);gl.bindBuffer(gl.ARRAY_BUFFER,store.vb);gl.bufferData(gl.ARRAY_BUFFER,mesh.v,gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,store.ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.i,gl.DYNAMIC_DRAW);store.count=mesh.i.length;};
R.track={};R.pend={count:0};R.preview={count:0};R.xPend={count:0};R.xPrev={count:0};
R.rebuildTrackMesh=function(){try{if(Life.T)Life.xingDirty=true;}catch(e){}R.trackBuf(R.track,buildTrackMesh(Track.segs.filter(s=>!s.pend)));const pe=Track.segs.filter(s=>s.pend);
  if(pe.length){const m=buildTrackMesh(pe,true);R.trackBuf(R.pend,m);R.trackBuf(R.xPend,{v:m.xv,i:m.xi});}else{R.pend.count=0;R.xPend.count=0;}};
R.setPreview=function(pieces,ok,warn){R.previewSegs=pieces||null;if(!pieces){R.preview.count=0;R.xPrev.count=0;return;}const m=buildTrackMesh(pieces,true);R.trackBuf(R.preview,m);R.trackBuf(R.xPrev,{v:m.xv,i:m.xi});
  R.preview.tint=ok?(warn?[0.98,0.72,0.2,0.45]:[0.35,0.88,0.42,0.45]):[0.98,0.25,0.2,0.55];};
R.drawTrack=function(pass,xray){const p=R.pTrack;gl.useProgram(p.p);gl.uniform1i(p.u('uPass'),pass);
  const dr=(b,tint)=>{if(!b.count)return;gl.uniform4f(p.u('uTint'),...tint);gl.bindVertexArray(b.vao);gl.drawElements(gl.TRIANGLES,b.count,gl.UNSIGNED_INT,0);Stats.draws++;Stats.tris+=b.count/3;};
  if(pass===1){dr(R.track,[0,0,0,0]);gl.bindVertexArray(null);return;}
  if(!xray){dr(R.track,[0,0,0,0]);const pulse=0.25+0.12*Math.sin(App.time*4);dr(R.pend,[0.35,0.7,1,pulse]);if(R.preview.count)dr(R.preview,R.preview.tint);}
  else if(R.xPend.count||R.preview.count){gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendColor(0,0,0,0.3);gl.blendFunc(gl.CONSTANT_ALPHA,gl.ONE_MINUS_CONSTANT_ALPHA);
    if(R.preview.count)dr(R.preview,R.preview.tint.map((v,i)=>i===3?0.75:v));gl.blendColor(0,0,0,0.55);dr(R.xPend,[0.35,0.7,1,0.85]);dr(R.xPrev,[0.35,0.7,1,0.85]);gl.disable(gl.BLEND);gl.enable(gl.DEPTH_TEST);}
  gl.bindVertexArray(null);};

// ---------------- per-frame uniforms
R.fillUBO=function(cam,A,lightVP){const U=R.U,T=R.world,E=A.E;
  U.set(cam.vp,0);U.set(cam.view,16);U.set(lightVP||M4.ident(),32);
  U.set([cam.pos[0],cam.pos[1],cam.pos[2],App.time],48);
  U.set([...A.key,A.day],52);U.set([...A.keyC,A.night],56);
  U.set([...A.skyA,P.aoStrength],60);U.set([...A.gndA,P.shadowSoft],64);
  const fd=(0.00018+E.overcast*0.0002+E.rain*0.00035+E.snow*0.0004)*P.fogDensity;
  U.set([...A.fog,fd],68);U.set([...A.fog2,0],72);
  U.set([T?T.W:2048,T?T.N:512,T?T.cs:4,P.maxHeight],76);
  const wa=P.windDir*Math.PI/180,ws=E.wind;U.set([Math.cos(wa)*ws*8,ws,Math.sin(wa)*ws*8,0],80);
  U.set([E.rain,E.snow,E.wet,E.snowCover],84);U.set([E.mist,E.flash,E.mistTop,E.overcast],88);
  U.set(seasonW(),92);
  /* snow line: a share of the land's height, measured on the real top when big mountains rise far above "Mountain height" */
  if(T&&T.hTop===undefined){let m=0;for(let k=0;k<T.H.length;k+=7)if(T.H[k]>m)m=T.H[k];T.hTop=m;}
  U.set([P.grassHue,1-Math.cos(P.grassMaxSlope*Math.PI/180),P.snowLine*Math.max(P.maxHeight,T&&T.hTop>P.maxHeight*1.25?T.hTop*0.8:0),P.sandShore],96);
  U.set([P.waterGreen,P.waveStrength,P.foam,E.ice],100);
  U.set([...A.zen,clamp(A.night*1.3-0.2,0,1)*(1-E.overcast)],104);U.set([...A.hor,1],108);
  U.set([...A.st.moon,A.moonUp],112);U.set([...A.st.sun,smooth(-0.05,0.02,A.st.sun[1])],116);
  U.set([R.yb||0,R.yFloor||-700,P.tableOn,P.fascia==='wood'?1:P.fascia==='black'?2:0],120);
  U.set([P.lampsOn?Life.windowsLit(A):0,E.flash,1/6400,E.rainbow],124);
  // light pools: lamps, stations and headlights near the focus
  const lights=A.night>0.05&&P.lampsOn?Life.lights(R.focus,Math.min(24,P.nightLights)):[];const k=A.night;
  for(let i=0;i<24;i++){const l=lights[i];if(l){U.set([l[0],l[1],l[2],l[3]],132+i*4);U.set([l[4]*k,l[5]*k,l[6]*k,0],228+i*4);}}
  const res=R.shRes&&A.keyUp?R.shRes:0;
  U.set([lights.length,0,res?R.shTexel:0,res?1/res:0],128);U.set(Weather.boltU(),324);U.set([Clouds.base,Clouds.thick,Clouds.M,Clouds.inv],328);U.set([-Clouds.off[0],-Clouds.off[1],E.dark+E.storm*0.3,Clouds.dens],332);
  gl.bindBuffer(gl.UNIFORM_BUFFER,R.ubo);gl.bufferSubData(gl.UNIFORM_BUFFER,0,U);};
R.lightMatrix=function(A){const F=R.focus,Lr=clamp(R.focusDist*0.95,140,1500)*(1+0.25*Math.abs(A.key[0]));let L=A.key;if(L[1]<0.08)L=[L[0],0.08,L[2]];const l=Math.hypot(...L);L=L.map(v=>v/l);
  const eye=[F[0]+L[0]*3000,F[1]+L[1]*3000,F[2]+L[2]*3000],up=Math.abs(L[1])>0.95?[1,0,0]:[0,1,0];let view=M4.lookAt(eye,F,up);
  const res=R.shRes||1024,tex=2*Lr/res;const c=M4.xform(view,F[0],F[1],F[2],1);const sx=Math.round(c[0]/tex)*tex-c[0],sy=Math.round(c[1]/tex)*tex-c[1];
  view[12]+=sx;view[13]+=sy;R.shTexel=tex;return M4.mul(M4.ortho(-Lr,Lr,-Lr,Lr,100,6500),view);};

// ---------------- targets
R.ensureTargets=function(w,h){const ms=Math.min(+P.msaa||0,CAPS.maxSamples||0);if(R.tw===w&&R.th===h&&R.ms===ms)return;
  R.tw=w;R.th=h;R.ms=ms;
  for(const k of ['rbC','rbD'])if(R[k])gl.deleteRenderbuffer(R[k]);for(const k of ['colTex','depTex'])if(R[k])gl.deleteTexture(R[k]);for(const k of ['mainFb','colFb','depFb'])if(R[k])gl.deleteFramebuffer(R[k]);
  const mk=(fmt)=>{const r=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,r);if(ms>0)gl.renderbufferStorageMultisample(gl.RENDERBUFFER,ms,fmt,w,h);else gl.renderbufferStorage(gl.RENDERBUFFER,fmt,w,h);return r;};
  R.rbC=mk(R.hdr.i);R.rbD=mk(gl.DEPTH_COMPONENT32F);
  R.mainFb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,R.mainFb);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.RENDERBUFFER,R.rbC);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,R.rbD);
  let st=gl.checkFramebufferStatus(gl.FRAMEBUFFER);if(st!==gl.FRAMEBUFFER_COMPLETE){Log.warn('multisampled float target refused (0x'+st.toString(16)+'), using 8-bit');R.hdr={i:gl.RGBA8,t:gl.UNSIGNED_BYTE};gl.deleteRenderbuffer(R.rbC);R.rbC=mk(gl.RGBA8);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.RENDERBUFFER,R.rbC);}
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  R.colTex=tex2D(w,h,R.hdr.i,gl.RGBA,R.hdr.t,null,gl.LINEAR);R.colFb=fbo([R.colTex]);
  if(R.sceneTex){gl.deleteTexture(R.sceneTex);gl.deleteFramebuffer(R.sceneFb);}R.sceneTex=tex2D(w,h,R.hdr.i,gl.RGBA,R.hdr.t,null,gl.LINEAR);R.sceneFb=fbo([R.sceneTex]);
  R.depTex=R.makeDepthTex(w,h,false);R.depFb=fbo([],{isTex:true,t:R.depTex});
  const qw=Math.max(16,w>>2),qh=Math.max(16,h>>2);for(const k of ['bA','bB','dA','dB']){if(R[k]){gl.deleteTexture(R[k]);gl.deleteFramebuffer(R[k+'f']);}R[k]=tex2D(qw,qh,R.hdr.i,gl.RGBA,R.hdr.t,null,gl.LINEAR);R[k+'f']=fbo([R[k]]);}
  R.qw=qw;R.qh=qh;Log.info(`render target ${w}×${h}, MSAA ${ms||'off'}`);};

// ---------------- frame
R.frame=function(cam,time){if(R._kl!==+P.kitLod){R._kl=+P.kitLod;Life.kitDirty=true;}Stats.draws=Stats.tris=Stats.chunks=Stats.objs=0;const T=R.world,S=R.skip;// S: categories left out (cost measurement by ablation, tools/bench.js)
  const tr=Trains.cur();const fp=Cam.mode!=='free'&&tr&&tr.poses&&tr.poses[0]?tr.poses[0].c:Cam.target;R.focus=[fp[0],fp[1],fp[2]];R.focusDist=Math.hypot(fp[0]-cam.pos[0],fp[1]-cam.pos[1],fp[2]-cam.pos[2]);
  const A=R.atmos();A.keyUp=A.key[1]>0.02&&(A.day>0.01||A.moonUp>0.05);R.sun={day:A.day,L:A.st.sun,night:A.night};R.A=A;
  // shadows every other frame (experimental): in between, the last shadow map is sampled with the light matrix it was drawn with
  let lightVP=R.lightMatrix(A);R.frameNo=(R.frameNo|0)+1;const shReuse=+P.optShadowHalf===1&&!!R.shVP&&(R.frameNo&1)===1&&R.shKeyUp;if(shReuse)lightVP=R.shVP;else R.shVP=lightVP;
  R.fillUBO(cam,A,lightVP);if(T&&!R.benchStill)Waves.step();// (benchmark frames keep the waves still, so two renders compare exactly)
  if(T){R.updateVegLists(cam);R.pm('vegLists');Life.prepare(cam,A);}R.pm('prepare');
  gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);
  // shadow map
  R.shKeyUp=A.keyUp;if(T&&R.shFb&&A.keyUp&&!S.shadow&&!shReuse){gl.bindFramebuffer(gl.FRAMEBUFFER,R.shFb);gl.viewport(0,0,R.shRes,R.shRes);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);gl.depthMask(true);
    gl.clearDepth(1);gl.clear(gl.DEPTH_BUFFER_BIT);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1.6,4);
    R.bindSh(R.dummyShadow);
    R.shPl=frustumPlanes(lightVP);R.drawTerrain(cam,1,R.shPl);R.drawWall(1);R.drawTrack(1);R.pm('sh-terrain');
    gl.useProgram(R.pObj.p);gl.uniform1i(R.pObj.u('uPass'),1);gl.bindVertexArray(R.objVao);R.drawVeg(1);R.pm('sh-veg');Life.draw(1);R.pm('sh-life');R.drawKit(1);R.pm('sh-kit');
    R.drawVehicles(1);R.pm('sh-veh');
    gl.disable(gl.POLYGON_OFFSET_FILL);R.bindSh(R.shTex);}
  // opaque scene
  gl.bindFramebuffer(gl.FRAMEBUFFER,R.mainFb);gl.viewport(0,0,R.tw,R.th);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);gl.depthMask(true);
  gl.clearColor(0,0,0,1);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  R.pm('clear');if(T){
    // opaque things nearest-first: with the terrain (the costliest shader, most of the screen) drawn last, the ground hidden behind
    // buildings, trains, trees and people is rejected by the depth test before it is shaded (P.optOrder; the old order otherwise)
    const ord=+P.optOrder!==0,terr=()=>{if(!S.terrain)R.drawTerrain(cam,0,cam.planes);R.pm('terrain');if(!S.track){R.drawWall(0);R.drawTrack(0);}R.pm('track');};
    if(!ord)terr();if(!S.vehicles)R.drawVehicles(0,ord?'o':undefined);R.pm('vehicles');
    gl.useProgram(R.pObj.p);gl.uniform1i(R.pObj.u('uPass'),0);gl.bindVertexArray(R.objVao);if(!S.kit&&ord)R.drawKit(0);R.pm('kit');if(!S.life)Life.draw(0);R.pm('life');if(!S.veg)R.drawVeg(0);R.pm('veg');if(!S.kit&&!ord)R.drawKit(0);R.pm('kit');gl.bindVertexArray(null);
    if(ord){terr();if(!S.vehicles)R.drawVehicles(0,'g');gl.useProgram(R.pObj.p);gl.bindVertexArray(null);}}
  if(!S.sky){gl.depthFunc(gl.LEQUAL);gl.depthMask(false);gl.useProgram(R.pSky.p);gl.uniformMatrix4fv(R.pSky.u('uInvVP'),false,cam.invVP);fsTri();gl.depthMask(true);gl.depthFunc(gl.LESS);}R.pm('sky');if(T&&R.ghost)R.drawGhost();
  // depth copy for soft water, clouds, mist and smoke
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER,R.mainFb);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,R.depFb);gl.blitFramebuffer(0,0,R.tw,R.th,0,0,R.tw,R.th,gl.DEPTH_BUFFER_BIT,gl.NEAREST);
  if(T&&P.waterOn&&+P.reflQuality>0&&R.waterChunks.length){gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,R.sceneFb);gl.blitFramebuffer(0,0,R.tw,R.th,0,0,R.tw,R.th,gl.COLOR_BUFFER_BIT,gl.NEAREST);bindTU(TU.uSceneCol,gl.TEXTURE_2D,R.sceneTex);}
  gl.bindFramebuffer(gl.FRAMEBUFFER,R.mainFb);bindTU(TU.uDepthCopy,gl.TEXTURE_2D,R.depTex);R.pm('copies');
  if(T){gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    if(P.waterOn){gl.depthMask(false);if(!S.water)R.drawWater(cam);R.pm('water');if(!S.streams)R.drawStreams(cam);R.pm('streams');gl.depthMask(true);}
    if(!S.clouds)R.drawVolClouds(cam);R.pm('clouds');if(!S.mist)R.drawVolMist(cam);R.pm('mist');gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);if(!(+P.mistQuality>0))R.drawMist();R.drawParticles();R.drawPrecip(cam);R.drawBolt();gl.depthMask(true);gl.disable(gl.BLEND);R.pm('particles');
    R.drawTrack(0,true);if(Build.active)R.drawMarkers(Build.markers());else if(Drive.active)R.drawMarkers(Drive.markers());}
  bindTU(TU.uDepthCopy,gl.TEXTURE_2D,R.dummyDepth);
  // resolve
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER,R.mainFb);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,R.colFb);gl.blitFramebuffer(0,0,R.tw,R.th,0,0,R.tw,R.th,gl.COLOR_BUFFER_BIT,gl.NEAREST);
  // the scene buffer's colour and depth are not needed after this copy (cleared next frame): a tile-based phone GPU then need not write them back to memory
  if(+P.optInvalidate!==0)gl.invalidateFramebuffer(gl.READ_FRAMEBUFFER,[gl.COLOR_ATTACHMENT0,gl.DEPTH_ATTACHMENT]);
  R.pm('resolve');R.post(cam,A);R.pm('post');};
// ---- on-phone measurement (Settings → Experimental → Measure on this phone): the current view rendered repeatedly with each switch and
// with each part left out, timed with GPU fences (the GPU's own time, not the browser's), shown as a table to screenshot
const PhoneBench={busy:false,
  async run(){if(this.busy||!App.T)return;this.busy=true;const out=$('#benchOut'),say=t=>{if(out)out.textContent=t;};const keep={};const K=8,REP=3,ids=['optCull','optOrder','optInvalidate','optBackface','optPrepass','optShadowHalf','fxUpscale','dbgWater','kitLod','maxDpr','bloom','bokeh'];
    for(const k of ids)keep[k]=P[k];App.hold=true;const lines=[];let gpu='';try{const e=gl.getExtension('WEBGL_debug_renderer_info');gpu=e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'';}catch(e){}
    const set=o=>{for(const k of ids)P[k]=0;P.kitLod=keep.kitLod;P.maxDpr=keep.maxDpr;P.bloom=keep.bloom;P.bokeh=keep.bokeh;Object.assign(P,o);Life.kitDirty=true;resizeCanvas();R.ensureTargets(R.rtW||gl.canvas.width,R.rtH||gl.canvas.height);};
    // one timing: K frames between two GPU fences; each line is the median of REP timings, with the spread (highest - lowest) after it
    const once=async()=>{R.frame(Cam,App.time);await R.benchFence();const t0=performance.now();for(let k=0;k<K;k++)R.frame(Cam,App.time);await R.benchFence();return(performance.now()-t0)/K;};
    const time=async(o,sk)=>{set(o);R.skip=sk||{};const a=[];for(let r=0;r<REP;r++)a.push(await once());R.skip={};a.sort((x,y)=>x-y);return[a[REP>>1],a[REP-1]-a[0]];};
    const on={optCull:1,optOrder:1,optInvalidate:1,optBackface:1},kl=+keep.kitLod||1;
    // the real game loop just before measuring: frame time, CPU time, screen and render size
    const pf=App.perf,fa=pf.fr.slice(-120),favg=fa.reduce((x,y)=>x+y,0)/Math.max(1,fa.length),fw=Math.max(...fa);
    const live=`game loop: ${(1000/favg).toFixed(0)} fps (${favg.toFixed(1)} ms, worst ${fw.toFixed(0)} ms) · cpu ${(pf.cpu||0).toFixed(1)} ms · ${App.ff||1}× · screen ${innerWidth}×${innerHeight} @${(devicePixelRatio||1).toFixed(2)} → canvas ${gl.canvas.width}×${gl.canvas.height} → render ${R.tw}×${R.th}`;
    const qs='settings: '+['renderScale','maxDpr','msaa','shadowRes','kitLod','vegBudget','treeDist','treeLod','terrainLod','peopleLod','cloudQuality','mistQuality','reflQuality','riverQ','bloom','bokeh','fxUpscale','labelRate','ffDetail','autoRes','frameCap'].map(k=>k+'='+P[k]).join(' ');
    const runs=[['all switches off',{}],['+ skip outside view',{optCull:1}],['+ near things first',{optCull:1,optOrder:1,optInvalidate:1}],['+ far sides skipped (=default)',on],['default + buildings depth-1st',{...on,optPrepass:1}],['default + shadows 2nd frame',{...on,optShadowHalf:1}],['default + sharper upscaling',{...on,fxUpscale:1}],
      ['test: plain building shader',on,{kitFlat:1}],['test: building detail 1/2 dist',{...on,kitLod:kl*0.5}],['test: building detail 1/4 dist',{...on,kitLod:kl*0.25}],['test: no glow, no blur',{...on,bloom:0,bokeh:0}],['test: pixel density 1×',{...on,maxDpr:1}]];
    try{say('Measuring… (about a minute)');let b0=null;
      for(const [nm,o,sk] of runs){const [ms,sp]=await time(o,sk);if(b0===null)b0=ms;lines.push(`${nm.padEnd(31)}${ms.toFixed(1).padStart(6)} ms ${((ms/b0-1)*100).toFixed(0).padStart(4)}%  ±${(sp/2).toFixed(1)}`);say(lines.join('\n')+'\n…');}
      lines.push('cost of each part (default switches):');const [ref,rsp]=await time(on);
      for(const [c,nm] of [['shadow','shadows'],['terrain','ground'],['track','track'],['vehicles','trains, bridges'],['veg','trees'],['life','people, objects'],['kit','buildings (all)'],['kit0','  buildings full detail'],['kit1','  buildings without roof tiles'],['kit2','  buildings far'],['kit3','  buildings farthest'],['sky','sky'],['water','lakes, rivers'],['streams','streams'],['clouds','clouds'],['mist','mist']]){
        const [ms,sp]=await time(on,{[c]:1});lines.push(`  ${nm.padEnd(18)}${(ref-ms).toFixed(1).padStart(6)} ms  ±${((sp+rsp)/2).toFixed(1)}`);say(lines.join('\n')+'\n…');}
      set(keep);R.frame(Cam,App.time);lines.unshift(`v${VERSION.split(' ')[0]} · ${gpu||'GPU'} · ${R.tw}×${R.th} · ${(Stats.tris/1e6).toFixed(2)}M tris · ${P.preset}`,live,qs,navigator.userAgent);}
    catch(e){lines.push('stopped: '+e.message);}finally{set(keep);R.benchStill=false;App.hold=false;this.busy=false;}
    say(lines.join('\n'));Log.info('phone benchmark:\n'+lines.join('\n'));},
  // copy the measurement text so it can be pasted into a message
  async copy(){const out=$('#benchOut'),t=out?out.textContent.trim():'';if(!t){if(out)out.textContent='Measure first, then copy.';return;}
    let ok=false;try{await navigator.clipboard.writeText(t);ok=true;}catch(e){}
    if(!ok){const ta=document.createElement('textarea');ta.value=t;ta.style.cssText='position:fixed;left:0;top:0;opacity:0';document.body.appendChild(ta);ta.focus();ta.select();try{ok=document.execCommand('copy');}catch(e){}ta.remove();}
    const b=[...document.querySelectorAll('button')].find(x=>x.textContent==='Copy results'||x.textContent==='Copied ✓'||x.textContent==='Copy failed');if(b){b.textContent=ok?'Copied ✓':'Copy failed';setTimeout(()=>b.textContent='Copy results',1600);}}};
// ---- benchmark hooks (used by the test harness only): App.hold stops the loop; R.benchFrame renders one frame at a fixed time and,
// with prof, times every pass (gl.finish between passes, so only for measuring)
// GPU time per pass with EXT_disjoint_timer_query_webgl2 (gl.finish and 1-pixel reads do not wait for the GPU in Chrome): R.pm(name)
// closes the running query and opens the next; R.benchFrame renders one frame at a fixed time (the loop is held by App.hold) and
// R.benchRead() collects the results once the GPU has them (poll it: null until ready). CPU time of the JS work is measured directly.
R.skip={};R.pm=function(n){if(!R.prof)return;const P2=R.prof,t=performance.now();P2.cpu.push([n,t]);const X=R.tq;if(!X)return;if(P2.q){gl.endQuery(X.TIME_ELAPSED_EXT);P2.gpu.push([n,P2.q]);P2.q=null;}if(n==='end')return;const q=gl.createQuery();gl.beginQuery(X.TIME_ELAPSED_EXT,q);P2.q=q;};// each mark names the work since the previous one
R.benchFrame=function(t,prof){R.benchStill=true;resizeCanvas();for(let k=0;k<6;k++)Cam.update(0.25);R.expo=null;R.lastE=null;R.ensureTargets(R.rtW||gl.canvas.width,R.rtH||gl.canvas.height);
  if(R.tq===undefined)R.tq=gl.getExtension('EXT_disjoint_timer_query_webgl2')||null;
  R.prof=prof?{cpu:[],gpu:[],q:null}:null;const t0=performance.now();R.pm('start');R.frame(Cam,t);R.pm('end');const ms=performance.now()-t0,pr=R.prof;R.prof=null;
  const cpu={};if(pr)for(let i=1;i<pr.cpu.length;i++){const k=pr.cpu[i][0];cpu[k]=(cpu[k]||0)+pr.cpu[i][1]-pr.cpu[i-1][1];}R.lastProf=pr;
  return{ms,draws:Stats.draws,tris:Stats.tris,objs:Stats.objs,chunks:Stats.chunks,cpu};};
// real GPU frame time: wait for a fence before and after K frames (the GPU signals it when everything before it has run); async, the
// page keeps its event loop so the fence status can update
R.benchFence=async function(){const f=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);gl.flush();while(gl.getSyncParameter(f,gl.SYNC_STATUS)!==gl.SIGNALED)await new Promise(r=>setTimeout(r,1));gl.deleteSync(f);};
R.benchThroughput=async function(t,K){R.benchStill=true;resizeCanvas();for(let k=0;k<6;k++)Cam.update(0.25);R.ensureTargets(R.rtW||gl.canvas.width,R.rtH||gl.canvas.height);
  R.expo=null;R.frame(Cam,t);await R.benchFence();const t0=performance.now();for(let k=0;k<K;k++){R.expo=null;R.frame(Cam,t);}await R.benchFence();return(performance.now()-t0)/K;};
R.benchRead=function(){const pr=R.lastProf,X=R.tq;if(!pr||!X)return{};if(gl.getParameter(X.GPU_DISJOINT_EXT))return{disjoint:true};const out={};
  for(const [n,q] of pr.gpu){if(!gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE))return null;}
  for(const [n,q] of pr.gpu){out[n]=(out[n]||0)+gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6;gl.deleteQuery(q);}pr.gpu=[];return out;};
R.chunkLod=function(c,cam){const dx=Math.max(c.x-cam.pos[0],0,cam.pos[0]-c.x-R.cw),dz=Math.max(c.z-cam.pos[2],0,cam.pos[2]-c.z-R.cw),dy=Math.max(c.y0-cam.pos[1],0,cam.pos[1]-c.y1);
  const d=Math.hypot(dx,dz,dy);return d<P.terrainLod?0:d<P.terrainLod*2.2?1:d<P.terrainLod*5?2:3;};
R.drawTerrain=function(cam,pass,pl){const T=R.world;const lo=pass!==1&&+P.terrainQ===0;if(lo&&!R.pTerrainLo){R.pTerrainLo=makeProgram('terrain-lo',VS_TERRAIN,FS_TERRAIN_LO);R.pPatchLo=makeProgram('terrain-patch-lo',VS_PATCH,FS_TERRAIN_LO);}/* Ground detail: Simple compiles the cheap variant the first time */
  const p=pass===1?R.pTerrainSh:lo?R.pTerrainLo:R.pTerrain;gl.useProgram(p.p);if(pass!==1){gl.uniform1f(p.u('uRoadClear'),Life.roadClear==null?1:Life.roadClear);gl.uniform1f(p.u('uGrassVar'),P.grassVar==null?1:+P.grassVar);}
  const list=[];for(const c of R.chunks){if(!boxVisible(pl,c.x,c.y0,c.z,c.x+R.cw,c.y1,c.z+R.cw))continue;list.push([Math.hypot(c.x+R.cw/2-cam.pos[0],c.z+R.cw/2-cam.pos[2]),c]);}
  list.sort((a,b)=>a[0]-b[0]);
  for(const [,c] of list){const dx=Math.max(c.x-cam.pos[0],0,cam.pos[0]-c.x-R.cw),dz=Math.max(c.z-cam.pos[2],0,cam.pos[2]-c.z-R.cw),dy=Math.max(c.y0-cam.pos[1],0,cam.pos[1]-c.y1);
    const lod=R.chunkLod(c,cam);/* same detail in the shadow pass: a coarser shadow terrain lies above the ground in hollows and shadows it */
    const n=Math.max(2,R.gridBase>>lod),g=gridMesh(n);gl.uniform4f(p.u('uChunk'),c.gx,c.gz,R.cells,lod);if(pass===0)gl.uniform1f(p.u('uStep'),T.cs*R.cells/n);
    gl.bindVertexArray(g.vao);gl.drawElements(gl.TRIANGLES,g.count,gl.UNSIGNED_INT,0);Stats.draws++;Stats.tris+=g.tris;Stats.chunks++;}
  if(R.patches&&R.patches.length&&R.patchVao){const q=pass===1?R.pPatchSh:lo?R.pPatchLo:R.pPatch;gl.useProgram(q.p);if(pass!==1){gl.uniform1f(q.u('uRoadClear'),Life.roadClear==null?1:Life.roadClear);gl.uniform1f(q.u('uGrassVar'),P.grassVar==null?1:+P.grassVar);gl.uniform1f(q.u('uStep'),R.patchStep||1);}
    gl.uniform4f(q.u('uChunk'),0,0,R.cells,-1);gl.bindVertexArray(R.patchVao);
    for(const pc of R.patches){const c=R.chunks[pc.chunk];if(!c||R.chunkLod(c,cam)!==0)continue;if(pl&&!boxVisible(pl,pc.b[0],pc.b[1],pc.b[2],pc.b[3],pc.b[4],pc.b[5]))continue;gl.drawArrays(gl.TRIANGLES,pc.first,pc.count);Stats.draws++;}}
  gl.bindVertexArray(null);};
// the culvert trenches as fine terrain patches: each 8 m cell a trench touches is cut out of the full-detail terrain and drawn again from an
// n x n grid that follows the drawn surface exactly at the cell's edges (same corner heights, same triangle split) minus the trench depth
R.buildPatches=function(T,trenches){const N=T.N,cs=T.cs,M=R.patchMask;if(!M)return;M.fill(0);const cells=new Map();
  for(const t of trenches){const ext=t.ext;for(let j=Math.floor((t.fz-ext)/cs);j<=Math.floor((t.fz+ext)/cs);j++)for(let i=Math.floor((t.fx-ext)/cs);i<=Math.floor((t.fx+ext)/cs);i++){if(i<0||j<0||i>=N||j>=N)continue;
      // only cells the trench really reaches
      let hit=false;for(let a=0;a<=4&&!hit;a++)for(let b=0;b<=4&&!hit;b++){if(Life.trenchDepth([t],(i+a/4)*cs,(j+b/4)*cs)>0.02)hit=true;}if(!hit)continue;const k=j*N+i;if(!cells.has(k))cells.set(k,[]);cells.get(k).push(t);}}
  const n=[6,10,16][clamp(+P.riverQ||0,0,2)]||10,V=[],out=[];R.patchStep=cs/n;
  for(const [k,ts] of cells){const i=k%N,j=(k/N)|0,x0=i*cs,z0=j*cs,first=V.length/3,Y=[];let y0=1e9,y1=-1e9;
    for(let b=0;b<=n;b++)for(let a=0;a<=n;a++){const x=x0+a*cs/n,z=z0+b*cs/n,y=R.drawnH(T,x,z)-Life.trenchDepth(ts,x,z);Y.push(y);y0=Math.min(y0,y);y1=Math.max(y1,y);}
    const P3=(a,b)=>[x0+a*cs/n,Y[b*(n+1)+a],z0+b*cs/n];
    // the same diagonal as the terrain grid (a,c,b / b,c,d)
    for(let b=0;b<n;b++)for(let a=0;a<n;a++){const A=P3(a,b),Bq=P3(a+1,b),C=P3(a,b+1),D=P3(a+1,b+1);V.push(...A,...C,...Bq,...Bq,...C,...D);}
    M[k]=255;const chunk=Math.floor(j/R.cells)*16+Math.floor(i/R.cells);out.push({first,count:V.length/3-first,chunk,b:[x0,y0-1,z0,x0+cs,y1+1,z0+cs]});}
  if(R.patchVao){gl.deleteVertexArray(R.patchVao);gl.deleteBuffer(R.patchVb);R.patchVao=null;}R.patches=out;
  if(V.length){R.patchVao=gl.createVertexArray();gl.bindVertexArray(R.patchVao);R.patchVb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,R.patchVb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(V),gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,12,0);gl.bindVertexArray(null);}
  scratch();gl.bindTexture(gl.TEXTURE_2D,R.pTex);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,N,N,gl.RED,gl.UNSIGNED_BYTE,M);};
R.drawWall=function(pass){if(!R.wallVao)return;const p=pass===1?R.pWallSh:R.pWall;gl.useProgram(p.p);gl.bindVertexArray(R.wallVao);gl.drawElements(gl.TRIANGLES,R.wallCount,gl.UNSIGNED_INT,0);Stats.draws++;gl.bindVertexArray(null);};
// part: 'o' opaque only, 'g' the trains' window glass only (blended, after everything opaque), else both
R.drawVehicles=function(pass,part){const p=R.pVeh;gl.useProgram(p.p);gl.uniform1i(p.u('uPass'),pass);gl.uniform3f(p.u('uLamp'),1,1,1);gl.uniform1f(p.u('uDist'),0);
  if(part==='g')return R.drawVehGlass(p);
  if(P.tableOn&&R.tableMesh&&pass===0){gl.uniformMatrix4fv(p.u('uModel'),false,M4.ident());gl.bindVertexArray(R.tableMesh.vao);gl.drawElements(gl.TRIANGLES,R.tableMesh.count,gl.UNSIGNED_INT,0);Stats.draws++;}
  gl.uniform2f(p.u('uOcc'),0,0);for(const bm of [R.bridgeMesh,R.xingMesh,R.dockMesh])if(bm){gl.uniformMatrix4fv(p.u('uModel'),false,M4.ident());gl.bindVertexArray(bm.vao);gl.drawElements(gl.TRIANGLES,bm.count,gl.UNSIGNED_INT,0);Stats.draws++;}
  R.pm('v-static');Net.draw(pass);Crane.draw(pass);R.pm('v-net+crane');if(!R.veh)return;gl.useProgram(p.p);gl.uniform2f(p.u('uOcc'),0,0);gl.uniform1i(p.u('uPass'),pass);gl.uniform3f(p.u('uLamp'),1,1,1);
  gl.uniform4f(p.u('uG1'),G01.cx,G01.cy,G01.r,G01.L);gl.uniform4f(p.u('uG2'),G01.e,G01.off,G01.piv[0],G01.piv[1]);
  const drawTrains=()=>{for(const tr of Trains.list){if(!tr.poses)continue;gl.uniform1f(p.u('uDist'),tr.dist+(tr.slip?App.time*12*Math.sign(tr.throttle*tr.rev||1):0));
    /* the reverser follows the way the wheels last turned */if(tr._ld!==undefined&&Math.abs(tr.dist-tr._ld)>1e-4)tr._gs=Math.sign(tr.dist-tr._ld);tr._ld=tr.dist;gl.uniform4f(p.u('uG3'),G01.foot,G01.die*(tr._gs||1),G01.yb,G01.yt);
    tr.veh.forEach((v,i)=>{const ps=tr.poses[i];if(!ps)return;const m=R.veh[v.mesh];let M=ps.m;if(tr.shake>0){M=M.slice();M[13]+=Math.sin(App.time*60)*0.05*tr.shake;}
      gl.uniformMatrix4fv(p.u('uModel'),false,M);gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,0);Stats.draws++;Stats.tris+=m.count/3;
      if(v.ctype==='wood'&&R.veh[15]){const nr=Crane.rows(v.n);for(let r=0;r<nr;r++){const lm=R.veh[15+r],T=M.slice();const y=CRN.carY+r*CRN.rowDY+CRN.logR;T[12]+=M[4]*y;T[13]+=M[5]*y;T[14]+=M[6]*y;gl.uniformMatrix4fv(p.u('uModel'),false,T);gl.bindVertexArray(lm.vao);gl.drawElements(gl.TRIANGLES,lm.count,gl.UNSIGNED_INT,0);Stats.draws++;}}
      // grain hoppers: the heap of grain rises in the box with the load, heaped above the rim when full
      if(v.ctype==='grain'&&R.veh[36]&&(v.n||0)>0.05){const lm=R.veh[36],T=M.slice(),f=Math.min(1,v.n/20),yb=1.55+1.95*f,h=0.12+0.4*f;T[12]+=M[4]*yb;T[13]+=M[5]*yb;T[14]+=M[6]*yb;T[4]*=h;T[5]*=h;T[6]*=h;gl.uniformMatrix4fv(p.u('uModel'),false,T);gl.bindVertexArray(lm.vao);gl.drawElements(gl.TRIANGLES,lm.count,gl.UNSIGNED_INT,0);Stats.draws++;}
      // ore hoppers: the heaped load rises with the fill
      if(ORE[v.ctype]&&R.veh[22]&&(v.n||0)>0.05){const lm=R.veh[22+['gold','silver','diamond'].indexOf(v.ctype)],T=M.slice(),h=0.12+1.6*Math.min(1,v.n/20);T[12]+=M[4]*1.74;T[13]+=M[5]*1.74;T[14]+=M[6]*1.74;T[4]*=h;T[5]*=h;T[6]*=h;gl.uniformMatrix4fv(p.u('uModel'),false,T);gl.bindVertexArray(lm.vao);gl.drawElements(gl.TRIANGLES,lm.count,gl.UNSIGNED_INT,0);Stats.draws++;}});}};
  gl.uniform2f(p.u('uOcc'),0,0);gl.uniform1i(p.u('uGlass'),pass===0?2:0);drawTrains();Plane.draw(p);RoadVeh.draw(p,pass);R.pm('v-trains');R.drawTrainsFn=drawTrains;
  if(pass===0&&part!=='o'){gl.uniform1i(p.u('uGlass'),1);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);drawTrains();Plane.draw(p);RoadVeh.draw(p,pass);gl.depthMask(true);gl.disable(gl.BLEND);R.pm('v-glass');}
  gl.uniform1i(p.u('uGlass'),0);gl.bindVertexArray(null);};
R.waterU=function(p,cam,near){gl.uniform1f(p.u('uDbg'),+P.dbgWater||0);gl.uniform1f(p.u('uSeaL'),R.world&&R.world.sea!=null?R.world.sea:-1);gl.uniform2f(p.u('uNF'),cam.near,cam.far);
  gl.uniform4f(p.u('uFlood'),Weather.flood||0,P.floodRise,0,0);const fp=R.fallP||(R.fallP=new Float32Array(32));fp.fill(0);const em=R.world&&R.world.emitters;
  if(em&&em.length){const c=cam.pos,l=em.map(e=>[Math.hypot(e[0]-c[0],e[2]-c[2]),e]).sort((a,b)=>a[0]-b[0]).slice(0,8);l.forEach(([,e],i)=>fp.set([e[0],e[1],e[2],Math.min(3,0.6+e[3]*1.2)],i*4));}
  gl.uniform4fv(p.u('uFallP'),fp);const W=Waves;gl.uniform4f(p.u('uWaveA'),W.on?1:0,P.lakeChop,P.lakeFoam,W.NC||0);gl.uniform4f(p.u('uWL'),W.L[0],W.L[1],W.L[2],W.N||64);
  const q=+P.reflQuality;gl.uniform4f(p.u('uRefl'),[0,12,20,32][q]||0,[1,1.6,1.3,1.2][q]||1,0,0);const lp=R.lakePatch;gl.uniform4f(p.u('uLakeP'),lp?lp[0]:0,lp?lp[1]:0,lp?lp[2]:0,near?1:0);};
R.lakeGrid=function(M){const G=R._lg||(R._lg={});if(G[M])return G[M];const v=new Float32Array((M+1)*(M+1)*2),idx=new Uint32Array(M*M*6);let k=0;
  for(let j=0;j<=M;j++)for(let i=0;i<=M;i++){v[k++]=i/M;v[k++]=j/M;}k=0;for(let j=0;j<M;j++)for(let i=0;i<M;i++){const a=j*(M+1)+i;idx.set([a,a+M+1,a+1,a+1,a+M+1,a+M+2],k);k+=6;}
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,v,gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,8,0);
  const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,idx,gl.STATIC_DRAW);gl.bindVertexArray(null);return G[M]={vao,count:idx.length};};
R.drawWater=function(cam){if(!R.waterChunks.length)return;const T=R.world,q=+P.waterModel;R.lakePatch=null;
  // finer lake mesh (real 3D waves) on a square in front of the camera; snapped so its vertices never swim
  if(Waves.on&&q>=2){const Rp=q===3?110:70,M=q===3?192:112,sp=2*Rp/M;let fx=R.focus[0]-cam.pos[0],fz=R.focus[2]-cam.pos[2];const fl=Math.hypot(fx,fz)||1;
    if(cam.pos[1]-R.focus[1]<Rp*2.2){const cx=Math.round((cam.pos[0]+fx/fl*Rp*0.55)/(2*sp))*2*sp,cz=Math.round((cam.pos[2]+fz/fl*Rp*0.55)/(2*sp))*2*sp;R.lakePatch=[cx,cz,Rp,M,sp];}}
  let p=R.pWater;gl.useProgram(p.p);R.waterU(p,cam,false);
  for(const c of R.waterChunks){if(!boxVisible(cam.planes,c.x,c.y0,c.z,c.x+R.cw,c.y1,c.z+R.cw))continue;const d=Math.hypot(c.x+R.cw/2-cam.pos[0],c.z+R.cw/2-cam.pos[2]);
    const lod=d<500?0:1,n=Math.max(2,R.gridBase>>lod),g=gridMesh(n);gl.uniform4f(p.u('uChunk'),c.gx,c.gz,R.cells,lod);gl.uniform1f(p.u('uSpc'),R.cells/n*T.cs);gl.bindVertexArray(g.vao);gl.drawElements(gl.TRIANGLES,g.count,gl.UNSIGNED_INT,0);Stats.draws++;}
  R.pm('w-chunks');
  if(R.lakePatch){const lp=R.lakePatch;p=R.pLake;gl.useProgram(p.p);R.waterU(p,cam,true);gl.uniform2f(p.u('uSpc2'),R.cells/R.gridBase*T.cs,lp[4]);
    const g=R.lakeGrid(lp[3]);gl.bindVertexArray(g.vao);gl.drawElements(gl.TRIANGLES,g.count,gl.UNSIGNED_INT,0);Stats.draws++;Stats.tris+=g.count/3;}
  gl.bindVertexArray(null);};
// ---- FFT wave simulation for lakes: spectrum → time evolution → 2×log2(N) FFT passes → per-cascade assemble (+ foam memory)
const Waves={N:0,NC:0,L:[96,24,6],pp:0,on:false,U:-1,key:'',last:0,
  initGL(){const mkP=(n,f)=>makeProgram(n,VS_FS,f);this.pI=mkP('wave-init',FS_WINIT);this.pT=mkP('wave-time',FS_WTIME);this.pF=mkP('wave-fft',FS_WFFT);this.pA=mkP('wave-asm',FS_WASM);
    const set=(p,m)=>{gl.useProgram(p.p);for(const k in m)gl.uniform1i(p.u(k),m[k]);};set(this.pI,{uGN:22});set(this.pT,{uH0:22});set(this.pF,{uA:22,uB:23});set(this.pA,{uF0:22,uF1:23,uPrev:24});
    this.dummy=this.arr(1,1);bindTU(TU.uWDisp,gl.TEXTURE_2D_ARRAY,this.dummy);bindTU(TU.uWDeriv,gl.TEXTURE_2D_ARRAY,this.dummy);},
  arr(N,NC){scratch();const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D_ARRAY,t);gl.texStorage3D(gl.TEXTURE_2D_ARRAY,Math.log2(N)+1,gl.RGBA16F,N,N,NC);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_T,gl.REPEAT);return t;},
  free(){for(const t of [this.gn,this.h0,this.A0,this.A1,this.B0,this.B1,this.disp&&this.disp[0],this.disp&&this.disp[1],this.deriv])if(t)gl.deleteTexture(t);
    for(const f of [this.fbH0,this.fbA,this.fbB,...(this.fbAsm?this.fbAsm.flat():[])])if(f)gl.deleteFramebuffer(f);},
  build(N,NC){this.free();this.N=N;this.NC=NC;const H=N*NC,FT=CAPS.floatRT?gl.RGBA32F:gl.RGBA16F,r=N===64?0.25:0.18;this.L=[96,96*r,96*r*r];
    let sd=987654321;const rnd=()=>{sd=(Math.imul(sd,1664525)+1013904223)>>>0;return sd/4294967296;};const nz=new Float32Array(N*H*4);
    for(let i=0;i<N*H;i++){const u1=Math.max(rnd(),1e-9),u2=rnd(),rr=Math.sqrt(-2*Math.log(u1));nz[i*4]=rr*Math.cos(6.2831853*u2);nz[i*4+1]=rr*Math.sin(6.2831853*u2);}
    this.gn=tex2D(N,H,gl.RGBA32F,gl.RGBA,gl.FLOAT,nz,gl.NEAREST);const mk=()=>tex2D(N,H,FT,gl.RGBA,gl.FLOAT,null,gl.NEAREST);
    this.h0=mk();this.fbH0=fbo([this.h0]);this.A0=mk();this.A1=mk();this.B0=mk();this.B1=mk();this.fbA=fbo([this.A0,this.A1]);this.fbB=fbo([this.B0,this.B1]);
    this.disp=[this.arr(N,NC),this.arr(N,NC)];this.deriv=this.arr(N,NC);
    this.fbAsm=[0,1].map(pp=>[...Array(NC)].map((_,c)=>fbo([{tex:this.disp[pp],layer:c},{tex:this.deriv,layer:c}])));
    for(const f of this.fbAsm.flat()){gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.viewport(0,0,N,N);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);}
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);this.pp=0;this.cur=this.disp[0];this.U=-1;this.key='';Log.info(`waves: FFT ${N}² × ${NC} cascades, L ${this.L.map(l=>l.toFixed(1)).join('/')} m`);},
  // fetch-limited JONSWAP wind sea: the wind sets the peak, the fetch setting how sea-like it gets
  init(U,F){const g=9.81,N=this.N,NC=this.NC,L=this.L,wpMin=Math.sqrt(4*Math.PI*g/L[0]),wp=Math.max(22*Math.pow(g*g/(U*F),1/3),wpMin),alpha=0.076*Math.pow(U*U/(F*g),0.22);
    const nyq=L.map(l=>Math.PI*N/l),b1=0.6*nyq[0],b2=0.6*nyq[1],kmin=[0,b1,b2],kmax=[b1,NC>2?b2:1e9,1e9];
    const p=this.pI;gl.useProgram(p.p);bindTU(22,gl.TEXTURE_2D,this.gn);gl.uniform1i(p.u('uN'),N);gl.uniform1fv(p.u('uL'),L);gl.uniform1fv(p.u('uKmin'),kmin);gl.uniform1fv(p.u('uKmax'),kmax);
    gl.uniform1f(p.u('uWDep'),25);gl.uniform1f(p.u('uAmp'),P.lakeWaves);gl.uniform4f(p.u('uWs'),alpha,wp,3.3,P.windDir*Math.PI/180);gl.uniform4f(p.u('uWs2'),U,1,0,1);
    gl.bindFramebuffer(gl.FRAMEBUFFER,this.fbH0);gl.viewport(0,0,N,N*NC);fsTri();},
  step(){const q=+P.waterModel;if(q<1||!CAPS.halfRT||!R.hasLake||!P.waterOn){if(this.on){bindTU(TU.uWDisp,gl.TEXTURE_2D_ARRAY,this.dummy);bindTU(TU.uWDeriv,gl.TEXTURE_2D_ARRAY,this.dummy);}this.on=false;return;}
    const cfg=q===1?[64,2]:q===2?[64,3]:[128,3];if(this.N!==cfg[0]||this.NC!==cfg[1])this.build(cfg[0],cfg[1]);this.on=true;
    gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);const N=this.N,H=N*this.NC,E=Weather.eff(),U=1+11*E.wind,k=P.lakeFetch+'/'+P.lakeWaves+'/'+P.windDir;
    if(Math.abs(U-this.U)>0.03*this.U+0.05||k!==this.key){this.U=U;this.key=k;this.init(U,P.lakeFetch*1000);}
    const now=performance.now()/1000,dt=clamp(now-this.last,0,0.2);this.last=now;
    let p=this.pT;gl.useProgram(p.p);bindTU(22,gl.TEXTURE_2D,this.h0);gl.uniform1i(p.u('uN'),N);gl.uniform1fv(p.u('uL'),this.L);gl.uniform1f(p.u('uT'),now%3600);
    gl.bindFramebuffer(gl.FRAMEBUFFER,this.fbA);gl.viewport(0,0,N,H);fsTri();
    p=this.pF;gl.useProgram(p.p);gl.uniform1i(p.u('uN'),N);let s=0;
    for(const hor of [1,0])for(let sub=2;sub<=N;sub*=2){bindTU(22,gl.TEXTURE_2D,s?this.B0:this.A0);bindTU(23,gl.TEXTURE_2D,s?this.B1:this.A1);gl.uniform1i(p.u('uSub'),sub);gl.uniform1i(p.u('uHor'),hor);
      gl.bindFramebuffer(gl.FRAMEBUFFER,s?this.fbA:this.fbB);fsTri();s^=1;}
    const cur=this.pp,prev=cur^1;p=this.pA;gl.useProgram(p.p);bindTU(22,gl.TEXTURE_2D,s?this.B0:this.A0);bindTU(23,gl.TEXTURE_2D,s?this.B1:this.A1);bindTU(24,gl.TEXTURE_2D_ARRAY,this.disp[prev]);
    gl.uniform1i(p.u('uN'),N);gl.uniform1f(p.u('uLam'),P.lakeChop);gl.uniform1f(p.u('uDecay'),Math.exp(-dt/2.2));gl.uniform1f(p.u('uFoamTh'),0.2+0.3*P.lakeFoam);gl.uniform1f(p.u('uFoamGain'),3);gl.viewport(0,0,N,N);
    for(let c=0;c<this.NC;c++){gl.uniform1i(p.u('uC'),c);gl.bindFramebuffer(gl.FRAMEBUFFER,this.fbAsm[cur][c]);fsTri();}
    bindTU(24,gl.TEXTURE_2D_ARRAY,this.dummy);scratch();for(const t of [this.disp[cur],this.deriv]){gl.bindTexture(gl.TEXTURE_2D_ARRAY,t);gl.generateMipmap(gl.TEXTURE_2D_ARRAY);}
    this.cur=this.disp[cur];this.pp=prev;bindTU(TU.uWDisp,gl.TEXTURE_2D_ARRAY,this.cur);bindTU(TU.uWDeriv,gl.TEXTURE_2D_ARRAY,this.deriv);gl.bindFramebuffer(gl.FRAMEBUFFER,null);}};
R.drawClouds=function(pass){const C=Weather.cloudInst;if(!C||!C.n)return;const p=R.pCloud;gl.useProgram(p.p);gl.uniform1i(p.u('uPass'),pass);gl.uniform2f(p.u('uNF'),Cam.near,Cam.far);
  const b=R.inst('clouds',C.data,C.n);gl.bindVertexArray(R.objVao);R.drawObj('cloud',0,b,pass,p);gl.bindVertexArray(null);};
R.drawMist=function(){const M=Weather.mistInst;if(!M||!M.n)return;const p=R.pMist;gl.useProgram(p.p);gl.uniform2f(p.u('uNF'),Cam.near,Cam.far);
  gl.bindBuffer(gl.ARRAY_BUFFER,R.mistBuf);gl.bufferData(gl.ARRAY_BUFFER,M.data.subarray(0,M.n*8),gl.STREAM_DRAW);gl.bindVertexArray(R.mistVao);gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,M.n);Stats.draws++;gl.bindVertexArray(null);};
R.drawParticles=function(){const n=Particles.n;if(!n)return;gl.bindBuffer(gl.ARRAY_BUFFER,R.partBuf);gl.bufferData(gl.ARRAY_BUFFER,Particles.arr.subarray(0,n*12),gl.STREAM_DRAW);
  const p=R.pPart;gl.useProgram(p.p);gl.uniform2f(p.u('uNF'),Cam.near,Cam.far);const ch=Cam.mode!=='free'&&Cam.mode!=='follow';gl.uniform4f(p.u('uSmk'),ch?P.chaseSmoke:1,ch?6:2.5,+P.smokeQuality>0?1:0,0);gl.bindVertexArray(R.partVao);gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,n);Stats.draws++;gl.bindVertexArray(null);};
R.drawPrecip=function(cam){const E=R.A.E;if(E.rain<0.02&&E.snow<0.02)return;const p=R.pPrecip;gl.useProgram(p.p);
  const B=clamp(R.focusDist*1.1,45,900),f=R.focus;const c=[f[0]*0.6+cam.pos[0]*0.4,f[1]*0.6+cam.pos[1]*0.4+B*0.1,f[2]*0.6+cam.pos[2]*0.4];
  gl.uniform4f(p.u('uBox'),c[0],c[1],c[2],B);gl.bindVertexArray(R.emptyVao);
  for(const [kind,amt,max] of [[0,E.rain,3200],[1,E.snow,7000]]){if(amt<0.02)continue;gl.uniform1f(p.u('uKind'),kind);gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,Math.round(Math.min(1.2,amt)*max));Stats.draws++;}
  gl.bindVertexArray(null);};
R.drawVolClouds=function(cam){if(!(+P.cloudQuality>0)||!Clouds.thick||!R.world)return;const q=+P.cloudQuality,f=[0,0.34,0.5,0.5][q],w=Math.max(32,Math.round(R.tw*f)),h=Math.max(32,Math.round(R.th*f));
  if(!R.cTex||R.cW!==w||R.cH!==h){if(R.cTex){gl.deleteTexture(R.cTex);gl.deleteFramebuffer(R.cFb);}R.cTex=tex2D(w,h,R.hdr.i,gl.RGBA,R.hdr.t,null,gl.LINEAR);R.cFb=fbo([R.cTex]);R.cW=w;R.cH=h;}
  const p=R.pVCloud;gl.bindFramebuffer(gl.FRAMEBUFFER,R.cFb);gl.viewport(0,0,w,h);gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.useProgram(p.p);
  gl.uniformMatrix4fv(p.u('uInvVP'),false,cam.invVP);gl.uniform2f(p.u('uNF'),cam.near,cam.far);gl.uniform1f(p.u('uSteps'),[0,14,24,40][q]);fsTri();
  gl.bindFramebuffer(gl.FRAMEBUFFER,R.mainFb);gl.viewport(0,0,R.tw,R.th);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(R.pCComp.p);
  bindTU(TU.uCldTex,gl.TEXTURE_2D,R.cTex);fsTri();bindTU(TU.uCldTex,gl.TEXTURE_2D,R.blackTex);gl.enable(gl.DEPTH_TEST);};
R.drawVolMist=function(cam){if(!(+P.mistQuality>0)||!Weather.mm||!Weather.mm.on||!R.world)return;const q=+P.mistQuality,f=[0,0.34,0.5,0.5][q],w=Math.max(32,Math.round(R.tw*f)),h=Math.max(32,Math.round(R.th*f));
  if(!R.mTex||R.mW!==w||R.mH!==h){if(R.mTex){gl.deleteTexture(R.mTex);gl.deleteFramebuffer(R.mFb);}R.mTex=tex2D(w,h,R.hdr.i,gl.RGBA,R.hdr.t,null,gl.LINEAR);R.mFb=fbo([R.mTex]);R.mW=w;R.mH=h;}
  const M=Weather.mm,p=R.pVMist;bindTU(TU.uMistMap,gl.TEXTURE_2D,M.tex);gl.bindFramebuffer(gl.FRAMEBUFFER,R.mFb);gl.viewport(0,0,w,h);gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.useProgram(p.p);
  gl.uniformMatrix4fv(p.u('uInvVP'),false,cam.invVP);gl.uniform2f(p.u('uNF'),cam.near,cam.far);gl.uniform4f(p.u('uMist'),M.lo,M.hi,1/R.world.W,[0,10,16,24][q]);fsTri();
  gl.bindFramebuffer(gl.FRAMEBUFFER,R.mainFb);gl.viewport(0,0,R.tw,R.th);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);const c=R.pMComp;gl.useProgram(c.p);gl.uniform2f(c.u('uNF'),cam.near,cam.far);
  bindTU(TU.uCldTex,gl.TEXTURE_2D,R.mTex);fsTri();bindTU(TU.uCldTex,gl.TEXTURE_2D,R.blackTex);gl.enable(gl.DEPTH_TEST);};
// lightning: camera-facing ribbons per channel segment, a wide violet glow and a thin white core, flickering with the return strokes
R.drawBolt=function(){const bl=Weather.bolt;if(!bl)return;const I=boltI(bl);if(I<0.01)return;const V=[],cp=Cam.pos;
  for(const ln of bl.lines){const p=ln.p;for(let i=0;i<p.length-1;i++){const a=p[i],b=p[i+1],d=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],m=[(a[0]+b[0])/2-cp[0],(a[1]+b[1])/2-cp[1],(a[2]+b[2])/2-cp[2]];
    let sx=d[1]*m[2]-d[2]*m[1],sy=d[2]*m[0]-d[0]*m[2],sz=d[0]*m[1]-d[1]*m[0];const sl=Math.hypot(sx,sy,sz)||1,dist=Math.hypot(m[0],m[1],m[2]);sx/=sl;sy/=sl;sz/=sl;
    for(const [kind,w,al] of [[0,Math.max(5,dist*0.012)*ln.w*1.6,0.35*ln.I],[1,Math.max(0.6,dist*0.0022)*ln.w,ln.I]]){const A=I*al,v=(P2,q)=>V.push(P2[0]+sx*w*q,P2[1]+sy*w*q,P2[2]+sz*w*q,A,q,kind);
      v(a,-1);v(a,1);v(b,1);v(a,-1);v(b,1);v(b,-1);}}}
  gl.useProgram(R.pBolt.p);gl.blendFunc(gl.ONE,gl.ONE);gl.bindBuffer(gl.ARRAY_BUFFER,R.boltBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(V),gl.STREAM_DRAW);
  gl.bindVertexArray(R.boltVao);gl.drawArrays(gl.TRIANGLES,0,V.length/6);Stats.draws++;gl.bindVertexArray(null);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);};
R.drawMarkers=function(list){if(!list||!list.length)return;const n=Math.min(24,list.length),mk=new Float32Array(96),ms=new Float32Array(96);
  for(let i=0;i<n;i++){const m=list[i];mk.set([m[0],m[1],m[2],m[3]],i*4);const d=Math.hypot(m[0]-Cam.pos[0],m[1]-Cam.pos[1],m[2]-Cam.pos[2]);ms.set([m[4],Math.max(3.5,d*0.045)*(m[4]>=3?0.7:1),0,0],i*4);}
  const p=R.pMark;gl.useProgram(p.p);gl.uniform4fv(p.u('uMk[0]'),mk);gl.uniform4fv(p.u('uMs[0]'),ms);gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  gl.bindVertexArray(R.emptyVao);for(const beam of [1,0]){gl.uniform1i(p.u('uBeam'),beam);gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,n);Stats.draws++;}
  gl.bindVertexArray(null);gl.disable(gl.BLEND);gl.enable(gl.DEPTH_TEST);};

// ---------------- post: bloom + tilt-shift + tonemap
const GRADES={story:[[.01,.006,.018],1.0,[1.03,1.0,.95],1.0,[.97,.97,1.0],[1.02,1.0,.97],.04],natural:[[0,0,0],1,[1,1,1],1,[1,1,1],[1,1,1],0],
  pastel:[[.07,.065,.075],.88,[1,1,1],.8,[.95,.95,.95],[1.02,1,1.03],.02],vivid:[[0,0,0],1.05,[1,1,1],1.32,[1.06,1.06,1.06],[1,1,1],.05],
  golden:[[.04,.02,0],1.04,[1.1,1,.82],1.1,[.95,1,1.05],[1.06,1,.9],.08],film:[[.045,.04,.05],.93,[1,.98,.94],.82,[.98,1,1.02],[1.03,1,.95],.14],noir:[[0,0,0],1.12,[1,1,1],0,[1.12,1.12,1.12],[1,1,1],.25]};
function gradeParams(){const g=GRADES[P.grade]||GRADES.story;return[[...g[0],g[1]],[...g[2],g[3]],[...g[4],P.gradeAmt],[...g[5],g[6]]];}
R.post=function(cam,A){const qw=R.qw,qh=R.qh;gl.disable(gl.DEPTH_TEST);
  const pass=(fb,prog,src,setup)=>{gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.useProgram(prog.p);bindTU(TU.uBSrc,gl.TEXTURE_2D,src);if(setup)setup(prog);fsTri();};
  gl.viewport(0,0,qw,qh);let bl=R.blackTex,dof=R.blackTex;
  if(P.bloom>0.001){pass(R.bAf,R.pBloomDown,R.colTex,p=>{gl.uniform2f(p.u('uTexel'),1/R.tw,1/R.th);gl.uniform1f(p.u('uThr'),1.25);});
    for(let it=0;it<2;it++){pass(R.bBf,R.pBlur,R.bA,p=>gl.uniform2f(p.u('uDir'),(1+it)/qw,0));pass(R.bAf,R.pBlur,R.bB,p=>gl.uniform2f(p.u('uDir'),0,(1+it)/qh));}bl=R.bA;}
  const bok=P.bokeh*(Cam.mode==='cab'||Cam.mode==='coach'?0.25:1);
  if(bok>0.001){pass(R.dAf,R.pDown,R.colTex,p=>gl.uniform2f(p.u('uTexel'),1/R.tw,1/R.th));
    for(let it=0;it<2;it++){pass(R.dBf,R.pBlur,R.dA,p=>gl.uniform2f(p.u('uDir'),(0.8+it*0.7)/qw,0));pass(R.dAf,R.pBlur,R.dB,p=>gl.uniform2f(p.u('uDir'),0,(0.8+it*0.7)/qh));}dof=R.dA;}
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,gl.canvas.width,gl.canvas.height);bindTU(TU.uBSrc,gl.TEXTURE_2D,R.blackTex);
  const p=R.pTone;gl.useProgram(p.p);bindTU(TU.uSrc,gl.TEXTURE_2D,R.colTex);bindTU(TU.uBloom,gl.TEXTURE_2D,bl);bindTU(TU.uDof,gl.TEXTURE_2D,dof);bindTU(TU.uDepth,gl.TEXTURE_2D,R.depTex);
  gl.uniform4f(p.u('uFocus'),cam.near,cam.far,R.focusDist,bok*0.85);const G=gradeParams();
  gl.uniform4fv(p.u('uGrade0'),G[0]);gl.uniform4fv(p.u('uGrade1'),G[1]);gl.uniform4fv(p.u('uGrade2'),G[2]);gl.uniform4fv(p.u('uGrade3'),G[3]);
  const lum=c=>0.2126*c[0]+0.7152*c[1]+0.0722*c[2],now=performance.now(),dtE=Math.min(0.5,(now-(R.lastE||now))/1000);R.lastE=now;
  const tgt=P.autoExpo?clamp(1.36/(lum(A.keyC)*Math.max(A.key[1],0)*0.9+lum(A.skyA)+0.02),0.75,1+0.6*P.nightBright):(1+A.night*0.55*P.nightBright);R.expo=R.expo?R.expo+(tgt-R.expo)*Math.min(1,dtE*1.2):tgt;
  {const up=gl.canvas.width>R.tw+1;gl.uniform4f(p.u('uUp'),1/R.tw,1/R.th,0.35,up?1:0);}gl.uniform1f(p.u('uExpo'),0.78*Math.pow(2,P.exposure)*R.expo);gl.uniform1f(p.u('uSat'),P.saturation);gl.uniform1f(p.u('uBloomAmt'),P.bloom*0.6);gl.uniform1f(p.u('uVig'),P.vignette*0.6);fsTri();
  bindTU(TU.uDepth,gl.TEXTURE_2D,R.dummyDepth);bindTU(TU.uSrc,gl.TEXTURE_2D,R.blackTex);};
