'use strict';
// ===== explore.js
// ===================================================================
// EXPLORATION MODE (a new-game option): the world lies under mist, except round your first village. Every vehicle clears the mist
// within a radius as it goes (buses, lorries, trains, and the plane, wider the higher it flies). A village whose centre comes out of
// the mist is discovered: it gets a bus stop on its street, its name and upgrades show, and buses on "all stops" serve it.
// The explored land is a coarse mask (16 m cells, at most 1024²) kept as a texture; the tone-map pass turns every unexplored pixel
// (from the depth buffer's world position) into drifting mist, so the 3D view and the map are covered alike. Saved run-length coded.
// ===================================================================
def('exploreMode',{tab:'life',label:'Exploration mode (mist until explored; chosen at New game)',kind:'check',def:0,apply:'live'});
def('exploreRadius',{tab:'life',label:'Exploration: mist clears within',min:100,max:2000,step:50,def:500,unit:' m',apply:'live'});
const Explore={N:0,cs:1,M:null,tex:null,dirty:null,known:new Set(),t:0,pending:null,fresh:false,W:0,
  on(){return!!(+P.exploreMode&&App.T&&this.M);},
  cell(x,z){const N=this.N;return[clamp(Math.floor(x/this.cs),0,N-1),clamp(Math.floor(z/this.cs),0,N-1)];},
  seen(x,z){if(!this.on())return true;const [i,j]=this.cell(x,z);return this.M[j*this.N+i]>127;},
  vKnown(v){return!this.on()||this.known.has(v.name);},
  /* after every generation: a fresh mask (new game or the mode just switched on), or the saved one */
  worldReady(T){if(!+P.exploreMode){this.M=null;return;}const W=T.W,N=clamp(Math.round(W/16),128,1024);
    const keep=this.M&&this.W===W&&this.N===N&&!this.pending;if(!keep){this.N=N;this.cs=W/N;this.W=W;this.M=new Uint8Array(N*N);this.known=new Set();this.dirty=[0,0,N-1,N-1];}
    if(this.pending&&this.pending.N===N){let k=0,v=0;for(const run of this.pending.rle){this.M.fill(v,k,Math.min(N*N,k+run));k+=run;v=v?0:255;}this.known=new Set(this.pending.known||[]);this.dirty=[0,0,N-1,N-1];}
    this.pending=null;
    const V=Life.villages||[];if(!V.length)return;
    if(!this.known.size){const v0=V[0];this.stamp(v0.x,v0.z,Math.max(+P.exploreRadius,v0.R+220));this.discover(v0,true);if(this.fresh)setTimeout(()=>this.intro(v0),900);}
    else for(const v of V)if(this.known.has(v.name))this.autoStop(v);
    this.fresh=false;},
  serialize(){if(!this.M)return null;const out=[];let v=0,run=0;for(let k=0;k<this.M.length;k++){const b=this.M[k]>127?255:0;if(b===v)run++;else{out.push(run);run=1;v=b;}}out.push(run);return{N:this.N,rle:out,known:[...this.known]};},
  /* clears a soft-edged disc */
  stamp(x,z,r){const N=this.N,cs=this.cs,i0=Math.max(0,Math.floor((x-r)/cs)),i1=Math.min(N-1,Math.ceil((x+r)/cs)),j0=Math.max(0,Math.floor((z-r)/cs)),j1=Math.min(N-1,Math.ceil((z+r)/cs));if(i0>i1||j0>j1)return;
    let ch=false;for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const d=Math.hypot((i+0.5)*cs-x,(j+0.5)*cs-z),v=Math.round(255*clamp((r-d)/(r*0.22),0,1)),k=j*N+i;if(v>this.M[k]){this.M[k]=v;ch=true;}}
    if(ch){const D=this.dirty;this.dirty=D?[Math.min(D[0],i0),Math.min(D[1],j0),Math.max(D[2],i1),Math.max(D[3],j1)]:[i0,j0,i1,j1];}},
  update(dt){if(+P.exploreMode&&!this.M&&App.T&&!App.busy)this.worldReady(App.T);/* switched on in Settings mid-game */if(!this.on())return;this.t-=dt;if(this.t>0)return;this.t=0.25;const r=+P.exploreRadius||500;
    for(const b of Buses.list)this.stamp(b.x,b.z,r);
    for(const tr of Trains.list){const p=tr.poses&&tr.poses[0];if(p)this.stamp(p.c[0],p.c[2],r);}
    if(typeof Plane!=='undefined'&&Plane.on&&Plane.st){const p=Plane.st.p,agl=p[1]-R.sampleHr(App.T,p[0],p[2]);this.stamp(p[0],p[2],r*(1+clamp(agl/400,0,1.5)));}/* higher, further */
    for(const v of Life.villages||[])if(!this.known.has(v.name)&&this.seen(v.x,v.z))this.discover(v);},
  discover(v,first){this.known.add(v.name);this.stamp(v.x,v.z,v.R+220);/* the whole village comes out of the mist */this.autoStop(v);if(first)return;
    Log.info(`explored: ${v.name} discovered`);const n=this.known.size,all=(Life.villages||[]).length;
    Banner.show(`You discovered ${v.name}!`,`A ${esc((Life.LEVELS[v.level|0]||{name:'village'}).name.toLowerCase())} with ${v.houses.length} houses. It has a bus stop now: buses and lorries on <i>all stops</i> will serve it, and you can build a station and run trains there.${n===2?'<br><b>Now:</b> tap Back to stop driving; your lorry then runs between the two villages by itself and earns money. Buy more to earn faster.':''}<br><small>${n} of ${all} villages discovered.</small>`,()=>{Cam.mode='free';Cam.flyTo([v.x,R.sampleHr(R.world,v.x,v.z),v.z],Math.max(160,v.R*3));});},
  /* a bus stop on the village street nearest the centre, unless it has one */
  autoStop(v){if(Buses.stops.some(s=>Math.hypot(s.x-v.x,s.z-v.z)<v.R+40))return;const q=Roads.nearestRoad(v.x,v.z,v.R+80);if(!q)return;
    const s={id:Buses.nextId++,x:q.x-q.dz*(q.w+1.6),z:q.z+q.dx*(q.w+1.6),rx:q.x,rz:q.z,rot:Math.atan2(q.dz,q.dx),v,name:v.name,waiting:0};Buses.stops.push(s);Buses.stopAdded(s);},
  intro(v){Banner.show('Exploration',`You start in <b>${esc(v.name)}</b>; the rest of the world is hidden in mist, and a village alone earns nothing: you need other villages to carry people and goods to.<ul><li><b>Buy a lorry</b>: Build → Roads → <b>Add lorry</b>, then tap a road in ${esc(v.name)} and tick ${esc(v.name)} as its first destination.</li><li>Tap it, choose <b>Drive</b>, and follow the country road out of the village. The mist lifts ${Math.round(+P.exploreRadius)} m round every vehicle (Settings → Life).</li><li><b>Find another village</b>: it is discovered when you reach it and gets a stop. Your lorry and buses then run between the villages you know and <b>earn money</b>.</li><li>Use the money for more lorries and buses, stations and trains, and explore further. Trains and the plane clear the mist too.</li></ul>`,null);
    const el=$('#banner');if(el){clearTimeout(Banner.t);Banner.t=setTimeout(()=>Banner.hide(),45000);}},
  /* the mask texture, updated where it changed */
  bindGL(){if(!this.M)return false;const N=this.N;if(!this.tex||this.texN!==N){if(this.tex)gl.deleteTexture(this.tex);this.tex=gl.createTexture();this.texN=N;gl.activeTexture(gl.TEXTURE0+TU.uExplore);gl.bindTexture(gl.TEXTURE_2D,this.tex);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.R8,N,N,0,gl.RED,gl.UNSIGNED_BYTE,this.M);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.pixelStorei(gl.UNPACK_ALIGNMENT,4);this.dirty=null;}
    else{gl.activeTexture(gl.TEXTURE0+TU.uExplore);gl.bindTexture(gl.TEXTURE_2D,this.tex);const D=this.dirty;if(D){const w=D[2]-D[0]+1,h=D[3]-D[1]+1;gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.pixelStorei(gl.UNPACK_ROW_LENGTH,N);gl.pixelStorei(gl.UNPACK_SKIP_PIXELS,D[0]);gl.pixelStorei(gl.UNPACK_SKIP_ROWS,D[1]);
        gl.texSubImage2D(gl.TEXTURE_2D,0,D[0],D[1],w,h,gl.RED,gl.UNSIGNED_BYTE,this.M);gl.pixelStorei(gl.UNPACK_ROW_LENGTH,0);gl.pixelStorei(gl.UNPACK_SKIP_PIXELS,0);gl.pixelStorei(gl.UNPACK_SKIP_ROWS,0);gl.pixelStorei(gl.UNPACK_ALIGNMENT,4);this.dirty=null;}}
    return true;}};
