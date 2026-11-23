'use strict';
// ===== ships.js
// ===================================================================
// COLLIERS (4.56.0, harbour step 4b part 2; the user: "player-run like buses"). Buy colliers in the store and give each a route: two or
// more of your freight harbours, in order. A collier sails its route over real sea paths (A* on a 64 m sea grid round the islands,
// then straightened), berths alongside the harbour's quay (one ship at a berth, the others wait at anchor off the harbour), and at each
// harbour first unloads what it brought from elsewhere (paid there by sea distance; since 4.57 it goes into that
// harbour's import stock, which its gantry loads into empty hoppers for the processing factories), then takes what the harbour has in stock: the shiploader pours it into the holds (PortCoal). It leaves
// when it is full, or when the stock has run out and it has waited a while. It rides the drawn sea (Sea.surf, slow heave, pitch and roll).
// ===================================================================
const SHIP={price:150000,cap:400,speed:6.5,turn:0.05,unload:2.0,wait:45,cell:64,rate:40,berth:[60,-6.5],approach:[60,-70]};
const Ships={list:[],nextId:1,paths:new Map(),grid:null,gkey:'',panel:null,pending:null,
  key(s){return Math.round(s.x)+','+Math.round(s.z);},
  site(k){return(typeof Port!=='undefined'?Port.S:[]).find(s=>s.built&&this.key(s)===k)||null;},
  built(){return(typeof Port!=='undefined'?Port.S:[]).filter(s=>s.built);},
  name(k){const s=this.site(k);return s?s.v.name:'?';},
  // the berth and the anchorage off it, and the ship's heading there (bow west along the quay: the model's bow is local −x)
  berthPose(s){const p=Port.P(s,SHIP.berth[0],SHIP.berth[1],0);return{x:p[0],z:p[2],hd:Math.atan2(-s.t[1],-s.t[0])};},
  appr(s){const p=Port.P(s,SHIP.approach[0],SHIP.approach[1],0);return[p[0],p[2]];},
  // ---- the sea grid: a cell is open when its middle and four points 40 m round it are 6 m deep or more (inside the map)
  sea(){const T=App.T;if(!T||T.sea==null)return null;const k=T.W+'|'+T.sea+'|'+P.seed;if(this.grid&&this.gkey===k)return this.grid;const C=SHIP.cell,N=Math.ceil(T.W/C),G=new Uint8Array(N*N);
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){const x=(i+0.5)*C,z=(j+0.5)*C;let ok=1;for(const [dx,dz] of [[0,0],[40,0],[-40,0],[0,40],[0,-40]]){const px=x+dx,pz=z+dz;if(px<0||pz<0||px>T.W||pz>T.W)continue;if(R.sampleHr(T,px,pz)>T.sea-6){ok=0;break;}}G[j*N+i]=ok;}
    this.grid={N,C,G};this.gkey=k;this.paths.clear();return this.grid;},
  open(x,z){const g=this.sea();if(!g)return false;const i=Math.floor(x/g.C),j=Math.floor(z/g.C);return i>=0&&j>=0&&i<g.N&&j<g.N&&g.G[j*g.N+i]===1;},
  los(a,b){const d=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.ceil(d/24));for(let k=0;k<=n;k++){const t=k/n;if(!this.open(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t))return false;}return true;},
  // A* over the open cells (8 neighbours), from the cell nearest to a to the one nearest to b, then pulled straight (line of sight)
  path(a,b){const k=`${a[0]|0},${a[1]|0}>${b[0]|0},${b[1]|0}`;if(this.paths.has(k))return this.paths.get(k);const g=this.sea();if(!g)return null;const {N,C,G}=g;
    const cell=p=>{let i=clamp(Math.floor(p[0]/C),0,N-1),j=clamp(Math.floor(p[1]/C),0,N-1);if(G[j*N+i])return j*N+i;for(let r=1;r<8;r++)for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){const ii=i+di,jj=j+dj;if(ii>=0&&jj>=0&&ii<N&&jj<N&&G[jj*N+ii])return jj*N+ii;}return-1;};
    const s0=cell(a),s1=cell(b);if(s0<0||s1<0)return null;const gS=new Float32Array(N*N).fill(1e30),from=new Int32Array(N*N).fill(-1),done=new Uint8Array(N*N),hp=[],h=n=>Math.hypot((n%N)-(s1%N),((n/N)|0)-((s1/N)|0));
    const push=(n,f)=>{hp.push([f,n]);let i=hp.length-1;while(i>0){const p2=(i-1)>>1;if(hp[p2][0]<=hp[i][0])break;[hp[p2],hp[i]]=[hp[i],hp[p2]];i=p2;}},pop=()=>{const t=hp[0],e=hp.pop();if(hp.length){hp[0]=e;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<hp.length&&hp[l][0]<hp[m][0])m=l;if(r<hp.length&&hp[r][0]<hp[m][0])m=r;if(m===i)break;[hp[m],hp[i]]=[hp[i],hp[m]];i=m;}}return t;};
    gS[s0]=0;push(s0,h(s0));let found=false,it=0;while(hp.length&&it++<N*N*2){const [,n]=pop();if(done[n])continue;done[n]=1;if(n===s1){found=true;break;}const i=n%N,j=(n/N)|0;
      for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const ii=i+di,jj=j+dj;if(ii<0||jj<0||ii>=N||jj>=N)continue;const m=jj*N+ii;if(!G[m]||done[m])continue;if(di&&dj&&(!G[j*N+ii]||!G[jj*N+i]))continue;
        const ng=gS[n]+(di&&dj?1.4142:1);if(ng<gS[m]){gS[m]=ng;from[m]=n;push(m,ng+h(m));}}}
    if(!found){this.paths.set(k,null);return null;}const raw=[];for(let n=s1;n>=0;n=from[n]){raw.push([(n%N+0.5)*C,(((n/N)|0)+0.5)*C]);if(n===s0)break;}raw.reverse();raw[0]=[a[0],a[1]];raw.push([b[0],b[1]]);
    const out=[raw[0]];let i=0;while(i<raw.length-1){let j=raw.length-1;while(j>i+1&&!this.los(raw[i],raw[j]))j--;out.push(raw[j]);i=j;}this.paths.set(k,out);return out;},
  // ---- buying and routes
  buy(){if(this.built().length<1){UI.toast('Build a freight harbour first (a harbour town offers it as an upgrade)');return;}if(Money.on()){if(Money.cash<SHIP.price){UI.toast(`Not enough money: a collier costs ${fmtE(SHIP.price)}`);return;}Money.spend(SHIP.price,'Collier');}
    const s=this.built()[0],bp=this.berthPose(s),ap=this.appr(s),n=this.nextId++;const sh={id:n,name:['Collier','Northumbria','Tyne Lass','Black Diamond','Wear Pride','Collier Queen','Seaham','Blyth'][n%8]+(n>8?' '+Math.ceil(n/8):''),
      x:ap[0],z:ap[1],hd:bp.hd,v:0,route:[this.key(s)],leg:0,st:'wait',t:0,cargo:{coal:0,iron:0},from:{},py:null,pt:0,rl:0,earned:0};
    this.list.push(sh);UI.toast(`${sh.name} is yours: give her a route of two or more harbours`);this.openPanel(sh);},
  load(sh){let n=0;for(const t in sh.cargo)n+=sh.cargo[t]||0;return n;},
  at(s){const k=this.key(s);return this.list.find(q=>q.st==='berth'&&q.route[q.leg]===k)||null;},
  // ---- the voyage
  update(dt){if(!this.list.length||!App.T||App.T.sea==null)return;dt=Math.min(dt,0.25)*Math.max(1,Math.min(8,App.ff||1));for(const sh of this.list)this.step(sh,dt);},
  step(sh,dt){const k=sh.route[sh.leg%Math.max(1,sh.route.length)],s=this.site(k);if(!s){if(sh.route.length){sh.route=sh.route.filter(q=>this.site(q));sh.leg=0;}this.ride(sh,dt);return;}
    const bp=this.berthPose(s),ap=this.appr(s);sh.t+=dt;
    if(sh.st==='sail'){if(!sh.path){sh.path=this.path([sh.x,sh.z],ap)||[[sh.x,sh.z],ap];sh.pi=1;}const wp=sh.path[Math.min(sh.pi,sh.path.length-1)],d=Math.hypot(wp[0]-sh.x,wp[1]-sh.z),last=sh.pi>=sh.path.length-1;
      const want=Math.atan2(wp[1]-sh.z,wp[0]-sh.x),da=wrapPi(want-sh.hd);sh.hd=wrapPi(sh.hd+clamp(da,-SHIP.turn*dt,SHIP.turn*dt));const vt=SHIP.speed*(last?clamp(d/120,0.25,1):1)*(Math.abs(da)>0.8?0.4:1);sh.v+=(vt-sh.v)*Math.min(1,dt*0.15);
      sh.x+=Math.cos(sh.hd)*sh.v*dt;sh.z+=Math.sin(sh.hd)*sh.v*dt;if(d<(last?12:60)){if(last){sh.st='wait';sh.t=0;sh.path=null;}else sh.pi++;}}
    else if(sh.st==='wait'){/* at anchor off the harbour until the berth is free */sh.v*=1-Math.min(1,dt*0.3);sh.hd+=wrapPi(bp.hd-sh.hd)*Math.min(1,dt*0.05);if(!this.list.some(q=>q!==sh&&(q.st==='berth'||q.st==='in'||q.st==='out')&&q.route[q.leg]===k)){sh.st='in';sh.t=0;sh.p0=[sh.x,sh.z,sh.hd];}}
    else if(sh.st==='in'||sh.st==='out'){/* tugs: sideways between the anchorage and the berth, turning parallel to the quay (90 s) */const f=clamp(sh.t/90,0,1),e=f*f*(3-2*f),A=sh.st==='in'?sh.p0:[bp.x,bp.z,bp.hd],B=sh.st==='in'?[bp.x,bp.z,bp.hd]:[ap[0],ap[1],bp.hd];
      sh.x=A[0]+(B[0]-A[0])*e;sh.z=A[1]+(B[1]-A[1])*e;sh.hd=A[2]+wrapPi(B[2]-A[2])*e;sh.v=0;if(f>=1){if(sh.st==='in'){sh.st='berth';sh.t=0;sh.idle=0;sh.unl=this.load(sh)>0.5;}else{sh.leg=(sh.leg+1)%sh.route.length;sh.st='sail';sh.path=null;sh.t=0;}}}
    else if(sh.st==='berth'){sh.x=bp.x;sh.z=bp.z;sh.hd=bp.hd;
      if(sh.unl){/* unload what came from another harbour: paid by distance, into the import stock */const L=this.load(sh);if(L>0.01){const a=Math.min(SHIP.unload*dt,L),im=PortCoal.st(s).imp;sh.soldV=sh.soldV||{};for(const t in sh.cargo){const q=a*(sh.cargo[t]||0)/L;sh.cargo[t]=Math.max(0,(sh.cargo[t]||0)-q);im[t]=Math.min(600,(im[t]||0)+q);sh.soldV[t]=(sh.soldV[t]||0)+q;}sh.sold=(sh.sold||0)+a;}/* 4.57: into the harbour's import stock */
        else{sh.unl=false;const km=(sh.fromX!=null?Math.hypot(bp.x-sh.fromX,bp.z-sh.fromZ):0)/1000,V=sh.soldV||{},val=Object.keys(V).reduce((acc,t)=>acc+V[t]*((Goods.T[t]||{rate:80}).rate/80),0)||(sh.sold||0),pay=Math.round(val*km*SHIP.rate*(+P.fareRate||1)/10)*10;/* 4.64: by value: gold, silver and diamonds pay more than coal */if(pay>0&&Money.on()){Money.earn(pay,`${sh.name}: ${Math.round(sh.sold)} t to ${s.v.name}`,bp.x,App.T.sea+6,bp.z);}sh.earned+=pay;if(sh.sold>0.5)Icons.add(bp.x,App.T.sea+8,bp.z,'−'+Object.keys(V).filter(t=>V[t]>=0.5).map(t=>`${Math.round(V[t])} ${(Goods.T[t]||{}).icon||''}`).join(' '));sh.sold=0;sh.soldV={};}}
      else{const c=PortCoal.st(s),st=PortCoal.sum(c.stock);if(this.load(sh)>0.5&&sh.fromX==null){sh.fromX=bp.x;sh.fromZ=bp.z;}
        if(this.load(sh)>=SHIP.cap-0.5||(st<0.05&&(sh.idle=(sh.idle||0)+dt)>SHIP.wait)||sh.route.length<2&&sh.t>20){if(sh.route.length>=2){sh.st='out';sh.t=0;if(this.load(sh)>0.5){sh.fromX=bp.x;sh.fromZ=bp.z;}else sh.fromX=null;}}
        else if(st>=0.05)sh.idle=0;}}
    this.ride(sh,dt);},
  // the hull on the drawn sea: heave, pitch and roll follow the surface under bow, stern and sides, slowly (a 45 m ship)
  ride(sh,dt){const T=App.T,c=Math.cos(sh.hd),s=Math.sin(sh.hd),S=(u,v)=>Sea.on()?Sea.surf(sh.x+c*u-s*v,sh.z+s*u+c*v):T.sea,b=S(20,0),a=S(-20,0),p=S(0,-4),q=S(0,4),k=Math.min(1,dt*0.6);
    const y=(a+b+p+q)/4;sh.py=sh.py==null?y:sh.py+(y-sh.py)*k;sh.pt+=(Math.atan2(b-a,40)-sh.pt)*k;sh.rl+=(Math.atan2(p-q,8)*0.6+(sh.st==='sail'?Math.sin(App.time*0.5+sh.id)*0.015:0)-sh.rl)*k;},
  dynPut(put){const cp=Cam.pos||[0,0,0];for(const sh of this.list){if(Math.hypot(sh.x-cp[0],sh.z-cp[2])>2600)continue;put('portShip',{x:sh.x,y:sh.py==null?App.T.sea:sh.py,z:sh.z,rot:sh.hd,pr:Fish.pk(-sh.rl,sh.pt),hash:0.5});}},
  // ---- the panel: each collier, its route (tap harbours in order), what it carries
  openPanel(sel){let p=this.panel;if(!p){p=this.panel=document.createElement('div');p.id='shipPanel';p.className='fp';document.body.appendChild(p);p.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;this.click(b);});}
    this.sel=sel||this.sel||this.list[0]||null;p.hidden=false;this.refresh();},
  closePanel(){if(this.panel)this.panel.hidden=true;},
  click(b){const a=b.dataset.a,sh=this.list.find(q=>q.id===+b.dataset.id)||this.sel;if(a==='x'){this.closePanel();return;}if(a==='buy'){this.buy();return;}if(a==='sel'){this.sel=sh;this.refresh();return;}
    if(!sh)return;if(a==='stop'){const k=b.dataset.k,i=sh.route.indexOf(k);if(i>=0){sh.route.splice(i,1);if(sh.leg>=sh.route.length)sh.leg=0;}else sh.route.push(k);this.refresh();return;}
    if(a==='go'){const s=this.site(sh.route[sh.leg]);if(s)Cam.flyTo([sh.x,App.T.sea+4,sh.z],180);this.closePanel();return;}
    if(a==='sell'){if(!confirm(`Sell ${sh.name}? You get half the price back.`))return;this.list=this.list.filter(q=>q!==sh);if(Money.on())Money.earn(SHIP.price/2,`${sh.name} sold`);this.sel=this.list[0]||null;this.refresh();}},
  refresh(){const p=this.panel;if(!p||p.hidden)return;const B=this.built(),sh=this.sel,stl={sail:'at sea',wait:'at anchor, waiting for the berth',in:'berthing',out:'leaving the berth',berth:'alongside'};
    p.innerHTML=`<div class="fp-h"><div><b>⚓ Colliers</b><span>${this.list.length} ship${this.list.length===1?'':'s'} · ${fmtE(SHIP.price)} each · ${SHIP.cap} t</span></div><button data-a="x">✕</button></div>`+
      `<div class="fp-note" style="padding:4px 10px">${this.list.map(q=>`<button data-a="sel" data-id="${q.id}"${q===sh?' class="go"':''}>${esc(q.name)}</button>`).join(' ')} <button data-a="buy">+ Buy a collier</button></div>`+
      (sh?`<div class="fp-note" style="padding:6px 10px"><b>${esc(sh.name)}</b>: ${stl[sh.st]||sh.st}${sh.route.length?' · next '+esc(this.name(sh.route[sh.leg%sh.route.length])):''} · ${Math.round(this.load(sh))} / ${SHIP.cap} t aboard${sh.earned?` · earned ${fmtE(sh.earned)}`:''}</div>
        <div class="fp-note" style="padding:4px 10px">Route (tap harbours in the order to visit; at least two): ${B.length?B.map(s=>{const k=this.key(s),i=sh.route.indexOf(k);return`<button data-a="stop" data-k="${k}"${i>=0?' class="go"':''}>${i>=0?(i+1)+'. ':''}${esc(s.v.name)}</button>`;}).join(' '):'no harbours built yet'}</div>
        <div class="fp-note" style="padding:4px 10px">At each harbour she unloads what she brought (sold there until the factories come) and loads that harbour's stock of coal, iron ore, gold, silver and diamonds.</div>
        <div class="rs-b"><button data-a="go">Show her</button><button data-a="sell">Sell</button></div>`:'')+'';},
  // ---- the map: the colliers as dark dots, their routes as dashed sea paths
  mapDraw(g,S){for(const sh of this.list){const R2=sh.route.map(k=>this.site(k)).filter(Boolean);if(R2.length>1){g.setLineDash([3,6]);g.strokeStyle='#1d2a3acc';g.lineWidth=3;g.beginPath();
        for(let i=0;i<R2.length;i++){const a=this.appr(R2[i]),b=this.appr(R2[(i+1)%R2.length]),pth=this.path(a,b)||[a,b];pth.forEach((q,j)=>{const sp=S(q[0],q[1]);if(!sp)return;if(i===0&&j===0)g.moveTo(sp[0],sp[1]);else g.lineTo(sp[0],sp[1]);});}g.stroke();g.setLineDash([]);}
      const q=S(sh.x,sh.z);if(q){g.fillStyle='#1d2a3a';g.strokeStyle='#e8c35a';g.lineWidth=2;g.beginPath();g.arc(q[0],q[1],6,0,6.283);g.fill();g.stroke();}}},
  serialize(){return{n:this.nextId,L:this.list.map(q=>({id:q.id,name:q.name,x:+q.x.toFixed(1),z:+q.z.toFixed(1),hd:+q.hd.toFixed(3),route:q.route,leg:q.leg,st:q.st==='in'||q.st==='out'?'wait':q.st,cargo:Object.fromEntries(Object.entries(q.cargo).filter(e=>e[1]>0.05).map(e=>[e[0],+e[1].toFixed(1)])),fromX:q.fromX,fromZ:q.fromZ,earned:q.earned||0,unl:!!q.unl}))};},
  load_(d){this.list=[];this.nextId=1;this.paths.clear();if(!d||!d.L)return;this.nextId=d.n||1;for(const q of d.L)this.list.push({...q,v:0,t:0,from:{},py:null,pt:0,rl:0,path:null});}};
