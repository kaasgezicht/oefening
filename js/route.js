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
  const w=prefer==='direct'?{earth:0.18,tunnel:2.2,bridge:1.8,curve:0.12,heur:1.6}:{earth:0.6,tunnel:7,bridge:5,curve:0.35,heur:1.35};
  const gx=b.x,gz=b.z,gh=b.node?wrapPi(b.node.h+Math.PI):null;
  const CELL=7,NH=36,key=(x,z,h)=>((Math.round(x/CELL)*1000+Math.round(z/CELL))*NH)+((Math.round(wrapPi(h)/(2*Math.PI)*NH)+NH)%NH);
  const nodes=[],best=new Map(),heap=new MinHeap(400000);
  const H=(x,z)=>Math.hypot(gx-x,gz-z);
  const push=(n)=>{nodes.push(n);const id=nodes.length-1;heap.push(id,n.g+w.heur*H(n.x,n.z));};
  const g0=(x,z)=>ground0(x,z)+FORMATION_DROP;
  if(a.node)push({x:a.x,z:a.z,h:a.h,y:a.y,g:0,k:0,p:-1});
  else for(let i=0;i<24;i++)push({x:a.x,z:a.z,h:i/24*2*Math.PI,y:a.y,g:0,k:0,p:-1});
  let found=-1,join=null,exp=0,last=performance.now();const LIM=90000;
  const okJoin=(bb,d)=>bb&&bb.length&&bb.every(q=>Math.abs(q.k)<=1/Rmin*1.02&&Math.abs(q.k*q.L)<2.2)&&bb.reduce((s,q)=>s+q.L,0)<d*1.6+20;
  while(heap.n&&exp<LIM){
    const id=heap.pop(),n=nodes[id];if(n.closed)continue;n.closed=true;exp++;
    const d=H(n.x,n.z);
    if(d<STEP*2.2&&exp>1){
      if(gh!==null){const bb=biarc(n.x,n.z,n.h,gx,gz,gh);if(okJoin(bb,d)){found=id;join=bb;break;}}
      else if(d<STEP*1.05){const ac=arcThrough(n.x,n.z,n.h,gx,gz);if(ac&&Math.abs(ac.k)<=1/Rmin){found=id;join=[{x0:n.x,z0:n.z,h0:n.h,k:ac.k,L:ac.L}];break;}}}
    for(const k of KS){const pc={x0:n.x,z0:n.z,h0:n.h,k,L:STEP},e=segPoint(pc,STEP);
      if(e[0]<M||e[1]<M||e[0]>W-M||e[1]>W-M)continue;const m=segPoint(pc,STEP/2);
      const gm=g0(m[0],m[1]),ge=g0(e[0],e[1]);const y1=clamp(ge,n.y-gmax*STEP,n.y+gmax*STEP),ym=(n.y+y1)/2;
      let cost=STEP+w.curve*Math.abs(k)*Rmin*STEP+(k!==n.k?3:0)+(Math.sign(k)*Math.sign(n.k)<0?6:0);
      for(const [yy,gg,q] of [[ym,gm,m],[y1,ge,e]]){const dd=yy-gg,wt=waterAt0(q[0],q[1]);let c;
        if(wt[1]>0){if(!P.trackBridges){c=Infinity;}else c=w.bridge*STEP/2;}
        else if(dd>0)c=dd<P.bridgeMin||!P.trackBridges?dd*dd*w.earth*STEP/8:w.bridge*STEP/2+dd*0.3;
        else c=-dd<P.tunnelMin||!P.trackTunnels?dd*dd*w.earth*STEP/8:w.tunnel*STEP/2;
        cost+=c;}
      if(!isFinite(cost))continue;
      const ng=n.g+cost,kk=key(e[0],e[1],e[2]);const prev=best.get(kk);if(prev!==undefined&&prev<=ng)continue;best.set(kk,ng);
      push({x:e[0],z:e[1],h:e[2],y:y1,g:ng,k,p:id});}
    if(performance.now()-last>18){progress&&progress(exp/LIM,d);await new Promise(r=>setTimeout(r,0));last=performance.now();}
  }
  Log.info(`route search: ${exp} steps, ${found>=0?'found':'no route'} (${prefer})`);
  if(found<0)return null;
  const ks=[];for(let i=found;nodes[i].p>=0;i=nodes[i].p)ks.push(nodes[i].k);ks.reverse();
  let st=nodes[found];while(st.p>=0)st=nodes[st.p];
  // merge equal steps into longer pieces
  const pieces=[];let x=st.x,z=st.z,h=st.h;
  for(let i=0;i<ks.length;){let j=i;while(j<ks.length&&ks[j]===ks[i])j++;const p={x0:x,z0:z,h0:h,k:ks[i],L:STEP*(j-i)};pieces.push(p);const e=segPoint(p,p.L);x=e[0];z=e[1];h=e[2];i=j;}
  for(const q of join)if(q.L>0.4)pieces.push(q);
  return{pieces,h0:st.h};
}
