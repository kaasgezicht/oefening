'use strict';
// ===== route.js
// ===================================================================
// ROUTE PLANNER (Build > Route) — like the rail planners in Factorio / Transport Fever:
// tap a start and a destination, and an A* search over real track pieces (16 m straights and
// curves no tighter than the minimum radius) finds a line that hugs the terrain. Every piece is
// scored by length, curvature, and how much cutting / embankment it would need; deep cuts are
// priced as tunnels and high fills or water as bridges (if those are allowed).
// ===================================================================
async function planRoute(a,b,prefer,progress){
  const T=R.world,Rmin=Math.max(P.minRadius,20),Rg=Math.max(Rmin*2.4,170),STEP=16,gmax=P.maxGrade/100,W=T.W,M=14;
  const KS=[0,1/Rg,-1/Rg,1/Rmin,-1/Rmin];
  /* four ways to weigh a line: scenic (winding round the hills), direct (short, earthworks are cheap), tunnel (straight through the hills on a
     smooth grade: tunnels are cheap, the line does not follow every rise) and surface (hug the ground; tunnels only 10-50 m long, bridges at most 100 m) */
  const w=prefer==='direct'?{earth:0.18,tunnel:2.2,bridge:1.8,curve:0.12,heur:1.6}:prefer==='tunnel'?{earth:0.5,tunnel:0.35,bridge:1.6,curve:0.15,heur:1.6}
    :prefer==='surface'?{earth:1.1,tunnel:2.5,bridge:2.5,curve:0.25,heur:1.3}:{earth:0.6,tunnel:7,bridge:5,curve:0.35,heur:1.35};
  const SURF=prefer==='surface',TUN=prefer==='tunnel',TMAX=50,BMAX=100;
  /* grades: up to GC (3.5%) is free, steeper costs more and more (10% costs about ten times a level step), so a big climb winds round the
     mountain at an easy grade (a spiral on a cone, loops and switchbacks on a ridge) and steep runs are the last resort. The heuristic knows a
     climb needs length (height / HG), so near a mountain the search keeps circling upward instead of rushing at the summit. */
  const GC=Math.min(gmax,0.035),HG=Math.min(gmax,0.045),GW=prefer==='direct'?1.0:prefer==='tunnel'?1.8:2.5;
  const gx=b.x,gz=b.z,gh=b.node?wrapPi(b.node.h+Math.PI):null,gy=b.node?b.node.y:ground0(b.x,b.z)+FORMATION_DROP;
  const CELL=7,NH=36,key=(x,z,h,r,y)=>((((Math.round(x/CELL)*1000+Math.round(z/CELL))*NH)+((Math.round(wrapPi(h)/(2*Math.PI)*NH)+NH)%NH))*16+(r||0))*32+(Math.round(y/5)&31);/* r: how far into a tunnel / over a bridge (surface mode); y: the height band, as one spot may be crossed at two heights */
  const LIM=Math.round(90000+Math.min(170000,Math.abs(gy-a.y)*300));/* a long climb gets a bigger search */
  const nodes=[],best=new Map(),heap=new MinHeap(LIM*6);
  const H=(x,z)=>Math.hypot(gx-x,gz-z),HY=(x,z,y)=>Math.max(H(x,z),Math.abs(gy-y)/HG);
  const push=(n)=>{nodes.push(n);const id=nodes.length-1;heap.push(id,n.g+w.heur*HY(n.x,n.z,n.y));};
  const g0=(x,z)=>ground0(x,z)+FORMATION_DROP,gW=(x,z)=>{const g=g0(x,z),wt=waterAt0(x,z);return wt[1]>0?Math.max(g,wt[0]+3):g;};/* over water the line keeps above it */
  if(a.node)push({x:a.x,z:a.z,h:a.h,y:a.y,g:0,k:0,p:-1,tr:0,br:0});
  else for(let i=0;i<24;i++)push({x:a.x,z:a.z,h:i/24*2*Math.PI,y:a.y,g:0,k:0,p:-1,tr:0,br:0});
  let found=-1,join=null,exp=0,last=performance.now();
  const okJoin=(bb,d)=>bb&&bb.length&&bb.every(q=>Math.abs(q.k)<=1/Rmin*1.02&&Math.abs(q.k*q.L)<2.2)&&bb.reduce((s,q)=>s+q.L,0)<d*1.6+20;
  while(heap.n&&exp<LIM){
    const id=heap.pop(),n=nodes[id];if(n.closed)continue;n.closed=true;exp++;
    const d=H(n.x,n.z);
    if(d<STEP*2.2&&exp>1&&Math.abs(n.y-gy)<=6+gmax*d){/* close, and the height can still be met */
      if(gh!==null){const bb=biarc(n.x,n.z,n.h,gx,gz,gh);if(okJoin(bb,d)){found=id;join=bb;break;}}
      else if(d<STEP*1.05){const ac=arcThrough(n.x,n.z,n.h,gx,gz);if(ac&&Math.abs(ac.k)<=1/Rmin){found=id;join=[{x0:n.x,z0:n.z,h0:n.h,k:ac.k,L:ac.L}];break;}}}
    for(const k of KS){const pc={x0:n.x,z0:n.z,h0:n.h,k,L:STEP},e=segPoint(pc,STEP);
      if(e[0]<M||e[1]<M||e[0]>W-M||e[1]>W-M)continue;const m=segPoint(pc,STEP/2);
      const gm=g0(m[0],m[1]),ge=g0(e[0],e[1]),gwe=gW(e[0],e[1]);
      // the heights this step may end at: following the ground (tunnel mode: lagging it), and on steep ground also at an easy grade
      // (in a cutting, a tunnel, on a bank or a bridge)
      const yF=clamp(TUN?n.y+(gwe-n.y)*0.2:gwe,n.y-gmax*STEP,n.y+gmax*STEP),yC=clamp(gwe,n.y-GC*STEP,n.y+GC*STEP),YS=Math.abs(yF-yC)>0.5?[yF,yC]:[yF];
      const base=STEP+w.curve*Math.abs(k)*Rmin*STEP+(k!==n.k?3:0)+(Math.sign(k)*Math.sign(n.k)<0?6:0);
      for(const y1 of YS){const ym=(n.y+y1)/2,gr=Math.abs(y1-n.y)/STEP;let tr=n.tr,br=n.br,cost=base+(gr>GC?STEP*GW*((gr-GC)/GC)**2:0);
      for(const [yy,gg,q] of [[ym,gm,m],[y1,ge,e]]){const dd=yy-gg,wt=waterAt0(q[0],q[1]);let c;
        let kind=0;/* 1 bridge, 2 tunnel */
        if(wt[1]>0){if(!P.trackBridges){c=Infinity;}else{c=w.bridge*STEP/2;kind=1;}}
        else if(dd>0){if(dd<P.bridgeMin||!P.trackBridges)c=dd*dd*w.earth*STEP/8;else{c=w.bridge*STEP/2+dd*0.3;kind=1;}}
        else{if(-dd<P.tunnelMin||!P.trackTunnels)c=dd*dd*w.earth*STEP/8;else{c=w.tunnel*STEP/2;kind=2;}}
        br=kind===1?br+STEP/2:0;tr=kind===2?tr+STEP/2:0;if(SURF&&(br>BMAX||tr>TMAX))c=Infinity;
        cost+=c;}
      if(!isFinite(cost))continue;
      const ng=n.g+cost,kk=key(e[0],e[1],e[2],SURF?Math.min(3,Math.ceil(tr/16))*4+Math.min(3,Math.ceil(br/34)):0,y1);const prev=best.get(kk);if(prev!==undefined&&prev<=ng)continue;best.set(kk,ng);
      push({x:e[0],z:e[1],h:e[2],y:y1,g:ng,k,p:id,tr,br});}}
    if(performance.now()-last>18){progress&&progress(exp/LIM,d);await new Promise(r=>setTimeout(r,0));last=performance.now();}
  }
  Log.info(`route search: ${exp} steps, ${found>=0?'found':'no route'} (${prefer})`);
  if(found<0)return null;
  const ks=[],ys=[];for(let i=found;nodes[i].p>=0;i=nodes[i].p){ks.push(nodes[i].k);ys.push(nodes[i].y);}ks.reverse();ys.reverse();
  let st=nodes[found];while(st.p>=0)st=nodes[st.p];
  // merge equal steps into longer pieces
  const pieces=[];let x=st.x,z=st.z,h=st.h;
  for(let i=0;i<ks.length;){let j=i;while(j<ks.length&&ks[j]===ks[i])j++;const p={x0:x,z0:z,h0:h,k:ks[i],L:STEP*(j-i)};pieces.push(p);const e=segPoint(p,p.L);x=e[0];z=e[1];h=e[2];i=j;}
  for(const q of join)if(q.L>0.4)pieces.push(q);
  ys.unshift(st.y);
  /* the heights the search chose, by distance along the line (every STEP m): the profile follows these, not the bare ground */
  const tgt=s=>{const f=clamp(s/STEP,0,ys.length-1),i=Math.min(ys.length-2,Math.floor(f));return ys.length<2?ys[0]:lerp(ys[i],ys[i+1],f-i);};
  return{pieces,h0:st.h,tgt};
}
