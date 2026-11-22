'use strict';
// ===== grass.js
// ===================================================================
// TALL GRASS (4.60.0; the user: "actual tall grass which responds to you driving through it. Scale the detail with quality levels and
// zoom levels"; where: clearings and woodland edges, field edges and verges, meadows and pastures).
// Tufts of bent blades, 0.5–1.1 m tall, drawn round the camera only. The land is cut into 16 m tiles; each tile's tufts are made once
// from a hash of the tile (the same tufts every time) where the ground suits: open meadows in patches, along roads, track, fields and
// the edges of woods, thinner inside woods; never on water, roads, track, fields, village plots or steep rock.
// Interaction: a 1024×1024 texture, 0.5 m a texel, laid over the world repeating every 512 m (the grass is never drawn farther than
// 512/2 m round the camera, so one texel stands for one place). A vehicle that drives over grass writes, under its wheels and body, the
// direction it pushes the blades and the time; the tufts there lie down along that direction and get up again over about 25 seconds.
// A helicopter's downwash bends the grass outward round it while it hovers low (live, no texture).
// Detail: the setting Tall grass (Quality: off, low, medium, high: radius and density), and the field of view (zoomed in, the grass is
// drawn farther). Far tufts are thinned and fade out by size towards the edge, in the shader, so there is no ring where they start.
// Drawn with the objects' shader (uKind 23: VS_OBJ bends them, FS_OBJ colours them by season), so light, shadow and fog match the trees.
// ===================================================================
const Grass={TS:16,TX:1024,TEXEL:0.5,tiles:new Map(),tex:null,data:null,clock:0,dirty:null,last:new Map(),key:'',n:0,
  LV:[null,{R:48,d:0.4,far:0.25},{R:80,d:0.65,far:0.22},{R:125,d:1,far:0.2}],/* per quality level: radius (m), share of the tufts, share kept at the edge */
  level(){return clamp(+P.tallGrass|0,0,3);},
  /* the tuft: blades leaning outward, each three segments, normals tilted up so they light like the ground; height 1 (scaled per tuft) */
  meshes(){const mk=(blades,segs,wid,seedHeads)=>{const M=omesh();let s=7;const rnd=()=>{s=(s*16807)%2147483647;return s/2147483647;};
      for(let b=0;b<blades;b++){const a=b/blades*6.2832+rnd()*0.7,r0=0.02+rnd()*0.12,lean=0.2+rnd()*0.4,h=0.62+rnd()*0.4,w=wid*(0.8+rnd()*0.4),ca=Math.cos(a),sa=Math.sin(a),
          px=-sa,pz=ca,head=seedHeads&&rnd()<0.35;const P=[];
        for(let k=0;k<=segs;k++){const t=k/segs,out=r0+lean*t*t*h,y=h*t*(1-0.18*t*t*lean),ww=w*(1-t*0.85);P.push([[ca*out-px*ww,y,sa*out-pz*ww],[ca*out+px*ww,y,sa*out+pz*ww],t]);}
        const col=t=>[0.55+0.5*t,0.6+0.45*t,0.55+0.4*t],N=[ca*0.35,0.93,sa*0.35];
        const V=(p,t)=>{const c=col(t);M.v.push(p[0],p[1],p[2],N[0],N[1],N[2],c[0],c[1],c[2],1);};
        for(let k=0;k<segs;k++){const [a0,b0,t0]=P[k],[a1,b1,t1]=P[k+1];V(a0,t0);V(b0,t0);V(b1,t1);V(a0,t0);V(b1,t1);V(a1,t1);M.n+=6;}
        if(head){const [a1,b1]=P[segs],m=[(a1[0]+b1[0])/2,(a1[1]+b1[1])/2,(a1[2]+b1[2])/2],tip=[m[0]+ca*0.05,m[1]+0.16,m[2]+sa*0.05],c=[1.25,1.1,0.72];
          for(const sd of [-1,1]){const q=[m[0]+px*0.025*sd,m[1]+0.06,m[2]+pz*0.025*sd];for(const p of [m,q,tip])M.v.push(p[0],p[1],p[2],N[0],N[1],N[2],c[0],c[1],c[2],1);M.n+=3;}}}
      return M;};
    return{near:mk(12,3,0.032,true),far:mk(6,2,0.05,false)};},
  /* how much tall grass the ground at (x,z) carries, 0..1 */
  dens(T,x,z){const N=T.N,cs=T.cs,i=clamp((x/cs)|0,0,N-1),j=clamp((z/cs)|0,0,N-1),k=j*N+i;
    if(T.sea!=null&&T.H[k]<T.sea+0.8)return 0;if(T.water&&T.water[k*4+3]>0&&T.water[k*4]>T.H[k]-0.4)return 0;
    const bad=q=>(T.flatMask&&T.flatMask[q])||(T.trackMask&&T.trackMask[q])||(Life.roadKill&&Life.roadKill[q])||(T.pathMask&&T.pathMask[q]>40)||(T.fieldId&&T.fieldId[q]&&!pas(q));
    const pas=q=>{const f=T.fields&&T.fields[T.fieldId[q]-1];return!!f&&f.crop===2;};/* pastures: grazed, tall grass in patches */
    if(bad(k))return 0;
    const i0=Math.max(0,i-1),i1=Math.min(N-1,i+1),j0=Math.max(0,j-1),j1=Math.min(N-1,j+1),sl=(Math.abs(T.H[j*N+i1]-T.H[j*N+i0])+Math.abs(T.H[j1*N+i]-T.H[j0*N+i]))/(2*cs);
    if(sl>0.85)return 0;const steep=1-clamp((sl-0.45)/0.4,0,1);
    let verge=0;for(let b=j0;b<=j1&&!verge;b++)for(let a=i0;a<=i1;a++)if(bad(b*N+a)){verge=0.95;break;}
    const f=T.data?T.data[k*4+3]/255:0,edge=f>0.02?(f<0.75?clamp(f*3,0,1):0.25):0;
    const nz=(a,b,s)=>{const v=Math.sin(a*12.9898+b*78.233+s)*43758.5453;return v-Math.floor(v);},vn=(x,z,sc,s)=>{const X=x/sc,Z=z/sc,x0=Math.floor(X),z0=Math.floor(Z),u=X-x0,v=Z-z0,su=u*u*(3-2*u),sv=v*v*(3-2*v);
      return(nz(x0,z0,s)*(1-su)+nz(x0+1,z0,s)*su)*(1-sv)+(nz(x0,z0+1,s)*(1-su)+nz(x0+1,z0+1,s)*su)*sv;};
    const meadow=f<0.3?clamp((vn(x,z,55,3.1)*0.7+vn(x,z,17,7.7)*0.3-0.42)*3.2,0,1)*(1-f*2.5):0;
    const tl=(+P.treeLine||0.8)*(+P.maxHeight||600),alt=clamp((tl*1.05-T.H[k])/(tl*0.2),0,1);/* thins out towards the tree line */
    const past=T.fieldId&&T.fieldId[k]?0.2+0.6*clamp((vn(x,z,14,5.3)-0.45)*3,0,1):0;
    return Math.max(verge,edge,meadow,past)*steep*alt;},
  /* one tile's tufts: x,y,z,height, rot,tint,rank,0 (sorted by rank, so a thinned tile is an even sample) */
  tile(T,ti,tj){const key=ti+','+tj;let t=this.tiles.get(key);if(t)return t;const TS=this.TS,out=[];let s=(ti*73856093^tj*19349663^((P.seed|0)*83492791))>>>0;
    const rnd=()=>{s=(s+0x6D2B79F5)|0;let q=Math.imul(s^s>>>15,1|s);q=q+Math.imul(q^q>>>7,61|q)^q;return((q^q>>>14)>>>0)/4294967296;};
    const n=Math.round(TS*TS*1.8);for(let k=0;k<n;k++){const x=ti*TS+rnd()*TS,z=tj*TS+rnd()*TS,u=rnd(),r=rnd(),rot=rnd()*6.2832,tn=rnd(),hh=rnd();if(x<1||z<1||x>T.W-1||z>T.W-1)continue;
      const d=this.dens(T,x,z);if(u>=d)continue;out.push([r,x,R.sampleHr(T,x,z)-0.05,z,(0.5+hh*0.55)*(0.75+0.25*d),rot,tn]);}
    out.sort((a,b)=>a[0]-b[0]);const a=new Float32Array(out.length*8);out.forEach((q,i)=>a.set([q[1],q[2],q[3],q[4],q[5],q[6],q[0],0],i*8));
    t={a,n:out.length};this.tiles.set(key,t);if(this.tiles.size>2600){const it=this.tiles.keys();for(let k=0;k<600;k++)this.tiles.delete(it.next().value);}return t;},
  reset(){this.tiles.clear();this.key='';},
  /* the tiles round the camera into one instance list (when the camera crosses a tile, the level or the view changes) */
  prepare(cam){const T=App.T,lv=this.level();if(!T||!lv||!P.treesOn||!Life.T){this.n=0;return;}const L=this.LV[lv],zf=clamp(Math.tan(25*Math.PI/180)/Math.tan((Cam.fovy||0.87)/2),0.8,2.5);
    const Rr=Math.min(L.R*zf,240),cp=cam.pos,gy=R.sampleHr(T,clamp(cp[0],0,T.W),clamp(cp[2],0,T.W)),hgt=Math.max(0,cp[1]-gy);this.R=Rr;
    if(hgt>Rr){this.n=0;this.key='';return;}const rh=Math.sqrt(Rr*Rr-hgt*hgt),TS=this.TS;
    const key=lv+'|'+Math.round(cp[0]/4)+','+Math.round(cp[2]/4)+'|'+Math.round(rh/4)+'|'+(R.vegVer|0);if(key===this.key)return;this.key=key;
    const i0=Math.floor((cp[0]-rh)/TS),i1=Math.floor((cp[0]+rh)/TS),j0=Math.floor((cp[2]-rh)/TS),j1=Math.floor((cp[2]+rh)/TS),parts=[[],[]],tot=[0,0];let made=0;
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const cx=clamp(cp[0],i*TS,(i+1)*TS),cz=clamp(cp[2],j*TS,(j+1)*TS),d=Math.hypot(cx-cp[0],cz-cp[2],hgt);if(d>Rr)continue;
      if(!frustTile(cam,i*TS,gy-30,j*TS,(i+1)*TS,gy+60,(j+1)*TS))continue;
      if(!this.tiles.has(i+','+j)){if(made>40)continue;made++;}const t=this.tile(T,i,j);if(!t.n)continue;
      const keep=Math.ceil(t.n*L.d*(1-(1-L.far)*Math.pow(clamp(d/Rr,0,1),0.6))),f=d>Rr*0.4?1:0;parts[f].push([t,keep]);tot[f]+=keep;}
    if(made>40)this.key='';/* more tiles to make next frame */
    /* near tiles with the full tuft (9 blades, seed heads), the rest with the light one (5 blades) */
    this.buf=this.buf||[null,null];for(const f of [0,1]){let a=this.buf[f];if(!a||a.length<tot[f]*8)a=this.buf[f]=new Float32Array(Math.ceil(tot[f]*1.3+64)*8);let o=0;
      for(const [t,k] of parts[f]){a.set(t.a.subarray(0,k*8),o*8);o+=k;}R.inst(f?'grassF':'grass',a,tot[f]);}
    this.n=tot[0]+tot[1];},
  /* ---- interaction texture */
  initTex(){if(this.tex)return;const X=this.TX;this.data=new Uint8Array(X*X*4);for(let i=0;i<X*X;i++){this.data[i*4]=128;this.data[i*4+1]=128;}
    this.tex=gl.createTexture();bindTU(TU.uGrassT,gl.TEXTURE_2D,this.tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,X,X,0,gl.RGBA,gl.UNSIGNED_BYTE,this.data);
    for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.NEAREST],[gl.TEXTURE_MAG_FILTER,gl.NEAREST],[gl.TEXTURE_WRAP_S,gl.REPEAT],[gl.TEXTURE_WRAP_T,gl.REPEAT]])gl.texParameteri(gl.TEXTURE_2D,k,v);},
  /* press the grass down in an oriented rectangle (centre x,z, heading rot, half length hl, half width hw), blades pushed along dir */
  stamp(x,z,rot,hl,hw,dir){if(!this.data)return;const X=this.TX,e=this.TEXEL,c=Math.cos(rot),s=Math.sin(rot),ext=Math.abs(c)*hl+Math.abs(s)*hw,eyt=Math.abs(s)*hl+Math.abs(c)*hw;
    const now=this.clock,code=Math.round(now*10)&0xffff,i0=Math.floor((x-ext)/e),i1=Math.floor((x+ext)/e),j0=Math.floor((z-eyt)/e),j1=Math.floor((z+eyt)/e),D=this.data;
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const px=(i+0.5)*e-x,pz=(j+0.5)*e-z,u=px*c+pz*s,v=-px*s+pz*c;if(Math.abs(u)>hl||Math.abs(v)>hw)continue;
      const q=(((j%X)+X)%X*X+((i%X)+X)%X)*4;const old=(D[q+2]|D[q+3]<<8)/10,age=((now-old)%6553.6+6553.6)%6553.6,had=Math.hypot(D[q]-128,D[q+1]-128)>10;
      if(had&&age<2.5)continue;/* pressed a moment ago: keep its time, so it does not spring up and fall again */
      const side=v/hw,dx=dir*c-side*0.55*s,dz=dir*s+side*0.55*c,l=Math.hypot(dx,dz)||1,t=had&&age<25?Math.round((now-0.4)*10)&0xffff:code;
      D[q]=128+Math.round(dx/l*126);D[q+1]=128+Math.round(dz/l*126);D[q+2]=t&255;D[q+3]=t>>8;
      const r=((j%X)+X)%X;if(!this.dirty)this.dirty=[r,r];else{this.dirty[0]=Math.min(this.dirty[0],r);this.dirty[1]=Math.max(this.dirty[1],r);}}
    if(j1-j0>=X)this.dirty=[0,X-1];},
  update(dt){if(!this.level()||!App.T)return;this.initTex();this.clock=(this.clock+dt)%6553.6;const cp=Cam.pos||[0,0,0],R0=(this.R||100)+20;
    for(const b of (typeof Buses!=='undefined'?Buses.list:[])){if(b.x==null||Math.abs(b.x-cp[0])>R0||Math.abs(b.z-cp[2])>R0)continue;const L=this.last.get(b);
      if(L&&Math.hypot(L[0]-b.x,L[1]-b.z)<0.15&&Math.abs(L[2]-b.rot)<0.02)continue;this.last.set(b,[b.x,b.z,b.rot]);
      const ty=RoadVeh.type(b),S=typeof RV_SCALE!=='undefined'?RV_SCALE:0.75,sp=RV[ty]||RV.bus,hl=(sp.len||8)*S/2,hw=(ty==='unimog'?1.15:1.25)*S,dir=(b.v||0)<0||(b.mv||0)<-0.5?-1:1;
      this.stamp(b.x,b.z,b.rot,hl+0.3,hw+0.25,dir);}
    if(this.last.size>200)this.last.clear();
    /* an aircraft rolling on grass (the Beaver on its wheels, the biplane, the helicopter on the ground) */
    if(typeof Plane!=='undefined'&&Plane.on&&Plane.st&&!Plane.crashed){const q=Plane.st.p,h=q[1]-Plane.groundAt(q[0],q[2]),V=Math.hypot(Plane.st.v[0],Plane.st.v[2]);
      if(h<3.2&&V>0.3&&Math.abs(q[0]-cp[0])<R0&&Math.abs(q[2]-cp[2])<R0){const f=Q.rot(Plane.st.q,[1,0,0]);this.stamp(q[0],q[2],Math.atan2(f[2],f[0]),2.6,1.9,1);}}
    if(this.dirty&&this.tex){const X=this.TX,[r0,r1]=this.dirty;bindTU(TU.uGrassT,gl.TEXTURE_2D,this.tex);gl.texSubImage2D(gl.TEXTURE_2D,0,0,r0,X,r1-r0+1,gl.RGBA,gl.UNSIGNED_BYTE,this.data,r0*X*4);this.dirty=null;}},
  /* the helicopter's downwash: centre, radius, strength (0 when none) */
  wash(){if(typeof Plane==='undefined'||!Plane.on||Plane.kind!=='heli'||!Plane.st)return[0,0,0,0];const p=Plane.st.p,g=Plane.groundAt(p[0],p[2]),h=p[1]-g;
    if(h>28)return[0,0,0,0];return[p[0],p[2],9+h*0.5,clamp((Plane.rot||0)*(1.15-h/28),0,1)];},
  draw(pass){if(pass!==0||!this.n||!this.level()||!R.instBufs.grass||!R.instBufs.grassF)return;this.initTex();const p=R.pObj,w=this.wash();bindTU(TU.uGrassT,gl.TEXTURE_2D,this.tex);
    gl.uniform4f(p.u('uGrassP'),this.clock,this.R||100,this.LV[this.level()].far,1);gl.uniform4f(p.u('uGrassW'),w[0],w[1],w[2],w[3]);
    const cu=gl.isEnabled(gl.CULL_FACE);if(cu)gl.disable(gl.CULL_FACE);R.drawObj('grassN',23,R.instBufs.grass,pass);R.drawObj('grassF',23,R.instBufs.grassF,pass);if(cu)gl.enable(gl.CULL_FACE);gl.uniform4f(p.u('uGrassP'),0,0,0,0);}};
/* is the box (tile) in the camera's view */
function frustTile(cam,x0,y0,z0,x1,y1,z1){const pl=cam.planesWide||cam.planes;return !pl||boxVisible(pl,x0,y0,z0,x1,y1,z1);}
