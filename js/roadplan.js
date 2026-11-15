'use strict';
// ===== roadplan.js
// ===================================================================
// COUNTRY ROADS BETWEEN VILLAGES, planned in separate steps (each one checkable on its own):
//   1. route    the way across the map only: an A* over a grid that likes gentle ground, long straight legs and the roads already laid,
//               and dislikes steep ground (it costs about what a bridge or tunnel would), so it detours round a valley head when that
//               is not much longer and switches back up a long slope. No structures here.
//   2. shape    the route as a driver sees it: straight legs (the grid path simplified) joined by circular curves, sampled every 2 m.
//               Every sample knows how far it is from the nearest curve (bridges and tunnels only on the straight).
//   3. profile  the road's height along it: a dynamic programme over heights every 4 m (grade at most 10%) that weighs earthworks
//               (cut and fill grow with the square of their depth), bridges (6/m, where the road stands 6.5 m or more over the ground or
//               over water) and tunnels (14/m, where it runs 11 m or more under it, plus the two portals), then smoothed.
//   4. labels   each 2 m sample is open (0), bridge (1) or tunnel (2); runs too short to be worth it go back to open. A tunnel whose
//               portal area would cut into another road at another level is forbidden there and the profile is done again.
// The result per piece of new road: p (the polyline, a structure is one straight segment), sf/sy (per segment: 0 road, 1 bridge,
// 2 tunnel; end heights of a structure) and prof {X,Z,Y,K} (the 2 m profile everything downstream reads: earthworks, road surfaces,
// tunnels, the vehicles' heights). Where the route runs along a road already laid, no new road is made: the new pieces end on it, at its
// height (a junction).
// ===================================================================
const RoadPlan={GMAX:0.10,
  /* costs per metre (see 3.) and the thresholds that make a sample a bridge or a tunnel */
  BR_D:6.5,TU_D:-11,
  plan(L,a,b,o){o=o||{};const T=L.T,net=(o.net||[]).filter(r=>r.prof),G=this.grid(L,T,a,b,net);if(!G)return null;
    const cells=this.route(G,a,b);if(!cells)return null;
    const pieces=[],route=[];for(const q of this.split(G,cells,a,b,net)){const pc=this.piece(L,T,G,q,net,pieces);if(!pc){Log.warn(`road plan: a piece of ${q.pts.length} points from ${q.pts[0].map(v=>v|0)} has no profile (${this.why||'?'})`);return null;}if(pc){pieces.push(pc);for(let i=0;i<pc.prof.X.length;i+=4)route.push([pc.prof.X[i],pc.prof.Z[i]]);}}
    route.unshift([a[0],a[1]]);route.push([b[0],b[1]]);return{pieces,route};},
  // ---- the planning grid: ground heights, water, houses, the network laid so far
  grid(L,T,a,b,net){const d0=Math.hypot(b[0]-a[0],b[1]-a[1]),M=clamp(d0*0.35+250,300,900),x0=Math.min(a[0],b[0])-M,z0=Math.min(a[1],b[1])-M,W=Math.abs(a[0]-b[0])+2*M,Hh=Math.abs(a[1]-b[1])+2*M;
    const cs=clamp(Math.sqrt(W*Hh/95000),6,18),nx=Math.ceil(W/cs),nz=Math.ceil(Hh/cs),n=nx*nz,hh=new Float32Array(n),wlv=new Float32Array(n),kind=new Int8Array(n),noise=new Float32Array(n),dsc=new Uint8Array(n);
    const seed=(P.seed|0)*0.013,vn=(x,z)=>{const xi=Math.floor(x),zi=Math.floor(z),fx=x-xi,fz=z-zi,h=(i,j)=>{const q=Math.sin(i*127.1+j*311.7+seed)*43758.5453;return q-Math.floor(q);},u=fx*fx*(3-2*fx),w=fz*fz*(3-2*fz);return h(xi,zi)*(1-u)*(1-w)+h(xi+1,zi)*u*(1-w)+h(xi,zi+1)*(1-u)*w+h(xi+1,zi+1)*u*w;};
    for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const x=x0+(i+0.5)*cs,z=z0+(j+0.5)*cs,k=j*nx+i;if(x<12||z<12||x>T.W-12||z>T.W-12){kind[k]=-1;continue;}hh[k]=sampleH(T,x,z,T.H);noise[k]=vn(x/90,z/90)*0.5;
      const w=sampleWater(T,x,z);if(w[1]>0&&w[0]>hh[k]+0.15){kind[k]=1;wlv[k]=w[0];}}/* 0 land, 1 water, 2 not here (a house, a tunnel mouth of another road), -1 off the board */
    const id=(x,z)=>clamp(Math.floor((z-z0)/cs),0,nz-1)*nx+clamp(Math.floor((x-x0)/cs),0,nx-1),inG=(x,z)=>x>=x0&&z>=z0&&x<x0+nx*cs&&z<z0+nz*cs;
    for(const h of L.houses){if(h.gone)continue;const r=h.r+2;for(let j=Math.floor((h.z-r-z0)/cs);j<=Math.floor((h.z+r-z0)/cs);j++)for(let i=Math.floor((h.x-r-x0)/cs);i<=Math.floor((h.x+r-x0)/cs);i++)if(i>=0&&j>=0&&i<nx&&j<nz&&kind[j*nx+i]===0)kind[j*nx+i]=2;}
    // the open road of the network is cheap to follow (and a junction there); round its tunnels nothing at another level
    const near=new Map();for(let ri=0;ri<net.length;ri++){const pr=net[ri].prof;for(let s=0;s<pr.X.length;s++){if(pr.K[s]!==0||!inG(pr.X[s],pr.Z[s]))continue;const k=id(pr.X[s],pr.Z[s]);if(kind[k]===-1)continue;dsc[k]=1;if(kind[k]===2)kind[k]=0;const d=Math.hypot(pr.X[s]-(x0+((k%nx)+0.5)*cs),pr.Z[s]-(z0+(((k/nx)|0)+0.5)*cs)),q=near.get(k);if(!q||d<q[2])near.set(k,[ri,s,d]);}}
    for(const t of this.tunnelsOf(net)){const D=roadPortalDims(T.cs),pad=D.A+30,bx0=Math.min(t.ax,t.bx)-pad,bx1=Math.max(t.ax,t.bx)+pad,bz0=Math.min(t.az,t.bz)-pad,bz1=Math.max(t.az,t.bz)+pad;
      for(let j=Math.max(0,Math.floor((bz0-z0)/cs));j<=Math.min(nz-1,Math.floor((bz1-z0)/cs));j++)for(let i=Math.max(0,Math.floor((bx0-x0)/cs));i<=Math.min(nx-1,Math.floor((bx1-x0)/cs));i++){const k=j*nx+i;if(kind[k]!==0||dsc[k])continue;
        const x=x0+(i+0.5)*cs,z=z0+(j+0.5)*cs,u=(x-t.ax)*t.dx+(z-t.az)*t.dz,v=Math.abs(-(x-t.ax)*t.dz+(z-t.az)*t.dx);if(u<-pad||u>t.L+pad||v>D.fw+12)continue;
        const dh=hh[k]-(t.ay+(t.by-t.ay)*clamp(u/t.L,0,1));if(Math.abs(dh)>3+0.12*Math.max(0,-u,u-t.L)&&dh<20)kind[k]=2;}}
    // free round both ends (a village street end may sit among houses)
    for(const p of [a,b]){const rr=Math.ceil(40/cs),k0=id(p[0],p[1]),ci=k0%nx,cj=(k0/nx)|0;for(let dj=-rr;dj<=rr;dj++)for(let di=-rr;di<=rr;di++){const ii=ci+di,jj=cj+dj;if(ii>=0&&jj>=0&&ii<nx&&jj<nz&&kind[jj*nx+ii]===2)kind[jj*nx+ii]=0;}if(kind[k0]!==-1)kind[k0]=0;}
    return{x0,z0,cs,nx,nz,n,hh,wlv,kind,noise,dsc,near,id,inG,blocked:(x,z)=>{if(!inG(x,z))return true;const kk=kind[id(x,z)];return kk===2||kk===-1;}};},
  /* a road with no plan (the lane up to a castle): a 2 m profile on the ground, smoothed, all open */
  groundProfile(T,r){const P=r.p,X=[],Z=[],C=[];for(let i=0;i+3<P.length;i+=2){const L=Math.hypot(P[i+2]-P[i],P[i+3]-P[i+1]),m=Math.max(1,Math.ceil(L/2));for(let q=0;q<m;q++){X.push(P[i]+(P[i+2]-P[i])*q/m);Z.push(P[i+1]+(P[i+3]-P[i+1])*q/m);C.push(1);}}
    X.push(P[P.length-2]);Z.push(P[P.length-1]);C.push(1);const n=X.length,G=X.map((x,s)=>sampleH(T,x,Z[s],T.H)),Y=G.slice();
    for(let it=0;it<3;it++){const Y0=Y.slice();for(let s=1;s<n-1;s++){let a=0,c=0;for(let q=Math.max(0,s-8);q<=Math.min(n-1,s+8);q++){a+=Y0[q];c++;}Y[s]=a/c;}}return{X,Z,Y,K:new Array(n).fill(0),C};},
  tunnelsOf(roads){const out=[];for(const r of roads){const pr=r.prof;if(!pr)continue;for(let s=0;s<pr.K.length;){if(pr.K[s]!==2){s++;continue;}let e=s;while(e+1<pr.K.length&&pr.K[e+1]===2)e++;const L=Math.hypot(pr.X[e]-pr.X[s],pr.Z[e]-pr.Z[s])||1;
      out.push({ax:pr.X[s],az:pr.Z[s],ay:pr.Y[s],bx:pr.X[e],bz:pr.Z[e],by:pr.Y[e],dx:(pr.X[e]-pr.X[s])/L,dz:(pr.Z[e]-pr.Z[s])/L,L,w:r.w||ROAD_HW});s=e+1;}}return out;},
  // ---- 1. the route: grid cells from a to b
  route(G,a,b){const {nx,nz,n,cs,hh,wlv,kind,noise,dsc,id}=G,s0=id(a[0],a[1]),s1=id(b[0],b[1]);
    const DIR=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1],[2,1],[1,2],[-1,2],[-2,1],[-2,-1],[-1,-2],[1,-2],[2,-1]],ANG=DIR.map(d=>Math.atan2(d[1],d[0]));
    const g=new Float32Array(n).fill(1e30),from=new Int32Array(n).fill(-1),din=new Int8Array(n).fill(-1),jmp=new Uint8Array(n),closed=new Uint8Array(n),heap=new MinHeap(n*6),ex=s1%nx,ez=(s1/nx)|0,hx=k=>Math.hypot((k%nx)-ex,((k/nx)|0)-ez)*cs;
    /* a change of heading costs (more for a sharper one): long legs with a hairpin at each end on a slope, not a zig-zag */
    const turnC=(p,q)=>{if(p<0)return 0;const t=Math.abs(wrapPi(ANG[p]-ANG[q]));return t<0.01?0:cs*(0.35+1.1*t/Math.PI*4);};
    const relax=(k,m,c,q,j)=>{const ng=g[k]+c;if(ng<g[m]){g[m]=ng;from[m]=k;din[m]=q;jmp[m]=j;if(heap.n<heap.i.length)heap.push(m,ng+hx(m)*1.02);}};
    g[s0]=0;heap.push(s0,hx(s0));let it=0;
    while(heap.n&&it++<500000){const k=heap.pop();if(closed[k])continue;closed[k]=1;if(k===s1)break;const ki=k%nx,kj=(k/nx)|0,hk=hh[k];
      for(let q=0;q<16;q++){const [di,dj]=DIR[q],ii=ki+di,jj=kj+dj;if(ii<0||jj<0||ii>=nx||jj>=nz)continue;const m=jj*nx+ii,km=kind[m];if(km===2||km===-1||closed[m])continue;
        if(q>=8){const mi=ki+Math.round(di/2),mj=kj+Math.round(dj/2),kk=kind[mj*nx+mi];if(kk===2||kk===-1)continue;}/* a knight move must not jump a house */
        const Lm=Math.hypot(di,dj)*cs,gr=Math.abs(hh[m]-hk)/Lm;
        /* per metre: 1 on easy ground, dearer to 10%; steeper costs what a structure would (it becomes one, or deep earthworks, in 3.);
           water a bridge */
        let c=1+noise[m]*0.4+(gr>0.05?110*(gr-0.05)*(gr-0.05):0);if(gr>this.GMAX)c+=4+30*(gr-this.GMAX);if(km===1||kind[k]===1)c+=9;
        if(dsc[m])c*=0.45;relax(k,m,Lm*c+turnC(din[k],q),q,0);}
      /* straight crossings: where the next step is steep or wet, a straight leg (up to 400 m) to a cell within the grade, costed the way
         3. will cost it (earthworks, or a bridge or tunnel per metre plus each one's ends). This step only promises the leg is straight;
         3. decides what it becomes */
      for(let q=0;q<8;q++){const [di,dj]=DIR[q],i1=ki+di,j1=kj+dj;if(i1<0||j1<0||i1>=nx||j1>=nz)continue;const m1=j1*nx+i1,step=Math.hypot(di,dj)*cs;if(!(Math.abs(hh[m1]-hk)/step>this.GMAX||kind[m1]===1))continue;
        const smax=Math.floor(400/step);for(let s=3;s<=smax;s+=(s<12?1:s<24?2:3)){const ii=ki+di*s,jj=kj+dj*s;if(ii<0||jj<0||ii>=nx||jj>=nz)break;const e=jj*nx+ii;
          let ok=true;for(let t=1;t<=s;t++){const c=(kj+dj*t)*nx+ki+di*t,kc=kind[c];if(kc===2||kc===-1||dsc[c]){ok=false;break;}}if(!ok)break;if(kind[e]!==0||closed[e])continue;
          const he=hh[e],span=s*step;if(Math.abs(he-hk)/span>this.GMAX)continue;let sum=0,ent=0,pk=0;
          for(let t=1;t<s;t++){const c=(kj+dj*t)*nx+ki+di*t,y=hk+(he-hk)*t/s,d=y-hh[c];let f,kk;
            if(kind[c]===1){if(y<wlv[c]+3){f=40;kk=0;}else{f=6;kk=1;}}else if(d>=this.BR_D){f=Math.min(0.08*d*d,6+0.04*d);kk=f<0.08*d*d?1:0;}else if(d<=this.TU_D){f=Math.min(0.07*d*d,14);kk=f<0.07*d*d?2:0;}else{f=0.08*d*d;kk=0;}
            if(kk&&kk!==pk)ent+=kk===1?50:350;pk=kk;sum+=f;}
          relax(k,e,span*(1+noise[e]*0.4)+sum*step+ent+turnC(din[k],q),q,1);}}}
    if(from[s1]<0&&s1!==s0)return null;const cells=[];for(let k=s1;k>=0;k=from[k]){cells.push(k);if(k===s0)break;}cells.reverse();cells.jmp=cells.map(k=>jmp[k]);return cells;},
  // the route in pieces: where it runs on the network it is not built again; each new piece ends on the network (a junction at that
  // road's height) or at a village street end (at the ground)
  split(G,cells,a,b,net){const {x0,z0,cs,nx,dsc,near}=G,cxz=k=>[x0+((k%nx)+0.5)*cs,z0+(((k/nx)|0)+0.5)*cs],out=[];let cur=null;
    const anchor=k=>{const q=near.get(k);if(!q)return null;const pr=net[q[0]].prof;return{p:[pr.X[q[1]],pr.Z[q[1]]],y:pr.Y[q[1]]};};
    for(let i=0;i<cells.length;i++){const k=cells[i],first=i===0,last=i===cells.length-1,on=dsc[k]&&!first&&!last;
      if(!on){if(!cur){const an=first?null:anchor(cells[i-1]);cur={pts:[first?[a[0],a[1]]:(an?an.p:cxz(cells[i-1]))],fix:[0],y0:first?null:(an?an.y:null)};if(first)continue;}cur.pts.push(last?[b[0],b[1]]:cxz(k));cur.fix.push(cells.jmp[i]);if(last){out.push(cur);cur=null;}}
      else if(cur){const an=anchor(k);cur.pts.push(an?an.p:cxz(k));cur.fix.push(0);cur.y1=an?an.y:null;out.push(cur);cur=null;}}
    return out.filter(q=>{let l=0;for(let i=1;i<q.pts.length;i++)l+=Math.hypot(q.pts[i][0]-q.pts[i-1][0],q.pts[i][1]-q.pts[i-1][1]);return l>12;});},
  // ---- one new piece: 2. shape, 3. profile, 4. labels (and the tunnel check, which may send it back to 3.)
  piece(L,T,G,q,net,done){const S=this.shape(G,q.pts,q.fix);if(!S||S.X.length<4){this.why='too short';return null;}const n=S.X.length;
    const gr=new Float32Array(n),wl=new Float32Array(n).fill(-1e9);for(let s=0;s<n;s++){gr[s]=sampleH(T,S.X[s],S.Z[s],T.H);const w=sampleWater(T,S.X[s],S.Z[s]);if(w[1]>0&&w[0]>gr[s]+0.15)wl[s]=w[0];}
    const y0=q.y0!=null?q.y0:gr[0],y1=q.y1!=null?q.y1:gr[n-1],noTun=new Uint8Array(n),D=roadPortalDims(T.cs);let P=null;
    const others=net.concat(done.map(d=>({prof:d.prof,w:ROAD_HW})));
    for(let tries=0;tries<6;tries++){P=this.profile(S,gr,wl,y0,y1,noTun,D);if(!P)return null;const bad=this.tunnelClash(S,P,others,D);if(!bad.length)break;for(const [s,e] of bad)for(let k=Math.max(0,s);k<=Math.min(n-1,e);k++)noTun[k]=1;}
    return this.emit(S,P);},
  // ---- 2. straight legs and circular curves, sampled every 2 m
  shape(G,pts,fix){fix=fix||pts.map(()=>0);const tol=G.cs*0.55,clear=(A,B)=>{const l=Math.hypot(B[0]-A[0],B[1]-A[1]),m=Math.ceil(l/(G.cs*0.4));for(let k=1;k<m;k++){const x=A[0]+(B[0]-A[0])*k/m,z=A[1]+(B[1]-A[1])*k/m;if(G.blocked(x,z))return false;}return true;};
    // simplified: the longest straight legs that stay within about half a cell of the grid path and clear of houses
    const V=[pts[0]],VF=[0];let i=0;while(i<pts.length-1){let j=i+1;if(fix[i+1]){V.push(pts[i+1]);VF.push(1);i=i+1;continue;}/* a straight crossing stays as it is */let cmax=Math.min(pts.length-1,i+60);for(let c=i+2;c<=cmax;c++)if(fix[c]){cmax=c-1;break;}for(let c=cmax;c>i+1;c--){const A=pts[i],B=pts[c],ex=B[0]-A[0],ez=B[1]-A[1],ll=Math.hypot(ex,ez)||1;let ok=true;
        for(let m=i+1;m<c&&ok;m++){const d=Math.abs((pts[m][0]-A[0])*ez-(pts[m][1]-A[1])*ex)/ll;if(d>tol)ok=false;}if(ok&&clear(A,B)){j=c;break;}}V.push(pts[j]);VF.push(0);i=j;}
    // curves: a radius of 90 m where the legs allow it, down to a hairpin's few metres
    const prims=[];let cur=V[0];for(let k=1;k<V.length;k++){const A=V[k-1],B=V[k];if(k===V.length-1){prims.push({t:0,a:cur,b:B});break;}const C=V[k+1];
      const l1=Math.hypot(B[0]-A[0],B[1]-A[1]),l2=Math.hypot(C[0]-B[0],C[1]-B[1]),u1=[(B[0]-A[0])/l1,(B[1]-A[1])/l1],u2=[(C[0]-B[0])/l2,(C[1]-B[1])/l2],cr=u1[0]*u2[1]-u1[1]*u2[0],th=Math.acos(clamp(u1[0]*u2[0]+u1[1]*u2[1],-1,1));
      if(th<0.02){continue;}const avail1=VF[k]?0.5:k===1?l1*0.9:l1*0.48,used1=Math.hypot(cur[0]-B[0],cur[1]-B[1]),tmax=Math.min(Math.min(avail1,used1),VF[k+1]?0.5:k+1===V.length-1?l2*0.9:l2*0.48),R=Math.min(90,tmax/Math.tan(Math.min(th,3.1)/2)),t=R*Math.tan(Math.min(th,3.1)/2);
      const T1=[B[0]-u1[0]*t,B[1]-u1[1]*t],T2=[B[0]+u2[0]*t,B[1]+u2[1]*t],sg=cr>0?1:-1,nrm=[-u1[1]*sg,u1[0]*sg],c=[T1[0]+nrm[0]*R,T1[1]+nrm[1]*R];
      prims.push({t:0,a:cur,b:T1});prims.push({t:1,c,R,a0:Math.atan2(T1[1]-c[1],T1[0]-c[0]),da:sg*th});cur=T2;}
    const X=[],Z=[],C=[];let carry=0;const put=(x,z,cv)=>{X.push(x);Z.push(z);C.push(cv);};put(V[0][0],V[0][1],0);
    for(const p of prims){const len=p.t?Math.abs(p.R*p.da):Math.hypot(p.b[0]-p.a[0],p.b[1]-p.a[1]);let s=2-carry;for(;s<=len+1e-6;s+=2){if(p.t){const an=p.a0+p.da*(s/len);put(p.c[0]+Math.cos(an)*p.R,p.c[1]+Math.sin(an)*p.R,1);}else{const f=s/len;put(p.a[0]+(p.b[0]-p.a[0])*f,p.a[1]+(p.b[1]-p.a[1])*f,0);}}carry=len-(s-2);}
    const E=V[V.length-1];if(Math.hypot(E[0]-X[X.length-1],E[1]-Z[Z.length-1])>0.3)put(E[0],E[1],0);else{X[X.length-1]=E[0];Z[Z.length-1]=E[1];}
    // how far (along the road) each sample is from the nearest curve
    const n=X.length,SD=new Float32Array(n).fill(1e9);let last=-1e9;for(let s=0;s<n;s++){if(C[s])last=s;SD[s]=(s-last)*2;}last=1e9;for(let s=n-1;s>=0;s--){if(C[s])last=s;SD[s]=Math.min(SD[s],(last-s)*2);}
    return{X,Z,C,SD};},
  // ---- 3. the height profile (dynamic programme every 4 m over heights 0.2 m apart, grade at most 10%), then smoothed, then labelled
  profile(S,gr,wl,y0,y1,noTun,D){this.dead=null;const n=S.X.length,st=2,m=Math.floor((n-1)/st)+1,res=0.4,lo=-150,hi=150,NS=Math.round((hi-lo)/res)+1,dj=Math.floor(this.GMAX*st*2/res+1e-6),INF=1e30;
    const idx=i=>Math.min(n-1,i*st),base=new Int32Array(m);/* the heights tried: ±150 m round the ground smoothed over ±200 m (a road over a deep gorge stays near the rims) */{const cg=new Float64Array(m+1);for(let i=0;i<m;i++)cg[i+1]=cg[i]+gr[idx(i)];for(let i=0;i<m;i++){const a=Math.max(0,i-50),b=Math.min(m,i+51);base[i]=Math.round(((cg[b]-cg[a])/(b-a)+lo)/res);}}
    const tunOK=new Uint8Array(m),brOK=new Uint8Array(m);for(let i=0;i<m;i++){const s=idx(i);tunOK[i]=S.SD[s]>=D.A+8&&!noTun[s]&&i>0&&i<m-1?1:0;brOK[i]=S.SD[s]>=3&&i>0&&i<m-1?1:0;}
    /* per sample (4 m): the kind a height makes (1 bridge, 2 tunnel, 0 open) and what it costs */
    /* where a structure may not stand (on a curve, at the ends, a forbidden tunnel) the road stays open: an embankment, a causeway
       through the water or a deep cutting, dear enough to be the last resort */
    const kindOf=(i,y)=>{const s=idx(i),d=y-gr[s],wet=wl[s]>-1e8;if(brOK[i]&&(d>=this.BR_D||(wet&&wl[s]-gr[s]>1.2&&y>=wl[s]+3)))return 1;if(d<=this.TU_D&&tunOK[i]&&!wet)return 2;return 0;};
    const cost=(i,y,k)=>{const s=idx(i),d=y-gr[s],wet=wl[s]>-1e8;if(k===1){if(wet&&y<wl[s]+3)return INF;return 4*(6+0.04*d+(d>70?(d-70)*2:0));}if(k===2)return 4*14;
      if(wet){const deep=wl[s]-gr[s]>1.2;if(y<wl[s]+(deep?0.5:-0.3))return INF;return 4*((deep?30:4)+0.08*d*d);}/* a ford or culvert over a shallow stream, a causeway through deeper water */return 4*(d>0?0.08:0.07)*d*d;};
    const ENTER=[[0,50,350],[0,0,INF],[0,INF,0]];/* from kind (row) to kind (column): a bridge 50, a tunnel's two portals 350; no bridge straight into a tunnel */
    let prev=new Float64Array(NS).fill(INF),curr=new Float64Array(NS);const back=new Int8Array(m*NS);
    {const j0=Math.round(y0/res)-base[0];for(let j=0;j<NS;j++){const y=(base[0]+j)*res;prev[j]=Math.abs(y-y0)<res*0.6?0:(j===clamp(j0,0,NS-1)?0:INF);}}
    for(let i=1;i<m;i++){const off=base[i]-base[i-1];for(let j=0;j<NS;j++){const y=(base[i]+j)*res,k=kindOf(i,y),c=cost(i,y,k);if(c>=INF){curr[j]=INF;back[i*NS+j]=0;continue;}let bv=INF,bd=0;
        for(let d=-dj;d<=dj;d++){const jp=j+off+d;if(jp<0||jp>=NS)continue;const pv=prev[jp];if(pv>=INF)continue;const kp=kindOf(i-1,(base[i-1]+jp)*res),e=ENTER[kp][k];if(e>=INF)continue;const v=pv+e;if(v<bv){bv=v;bd=d;}}
        curr[j]=bv+c;back[i*NS+j]=bd;}{let any=false;for(let j=0;j<NS;j++)if(curr[j]<INF){any=true;break;}if(!any&&this.dead==null)this.dead=i+' at '+S.X[idx(i)].toFixed(0)+','+S.Z[idx(i)].toFixed(0)+' g'+gr[idx(i)].toFixed(1)+' wl'+wl[idx(i)].toFixed(1)+' C'+S.C[idx(i)];}const t=prev;prev=curr;curr=t;}
    let bj=-1,bv=INF;for(let j=0;j<NS;j++){if(prev[j]>=INF)continue;const y=(base[m-1]+j)*res,v=prev[j]+Math.abs(y-y1)*400;if(v<bv){bv=v;bj=j;}}if(bj<0){this.why=`no height reaches the end (dead at sample ${this.dead}/${m})`;return null;}
    const Yd=new Float32Array(m),Kd=new Uint8Array(m);for(let i=m-1,j=bj;i>=0;i--){Yd[i]=(base[i]+j)*res;Kd[i]=kindOf(i,Yd[i]);if(i>0)j=j+(base[i]-base[i-1])+back[i*NS+j];}
    // to 2 m samples; structures straight between their ends, the open road smoothed over about 30 m and held to 10.5%
    const Y=new Float32Array(n),K=new Uint8Array(n);for(let s=0;s<n;s++){const f=s/st,i=Math.min(m-1,Math.floor(f)),u=f-i;Y[s]=i+1<m?Yd[i]*(1-u)+Yd[i+1]*u:Yd[i];K[s]=Kd[Math.min(m-1,Math.round(f))];}
    K[0]=0;K[n-1]=0;Y[0]=y0;Y[n-1]=y1;
    this.cleanRuns(K,wl);
    const fix=new Uint8Array(n);fix[0]=fix[n-1]=1;for(let s=0;s<n;s++)if(K[s]){fix[s]=1;if(s>0)fix[s-1]=1;if(s<n-1)fix[s+1]=1;}
    for(let s=0;s<n;){if(!K[s]){s++;continue;}let e=s;while(e+1<n&&K[e+1]===K[s])e++;for(let q=s+1;q<e;q++)Y[q]=Y[s]+(Y[e]-Y[s])*(q-s)/(e-s);s=e+1;}
    for(let it=0;it<3;it++){const Y0=Y.slice();for(let s=0;s<n;s++){if(fix[s])continue;let a=0,c=0;for(let q=Math.max(0,s-7);q<=Math.min(n-1,s+7);q++){a+=Y0[q];c++;}Y[s]=a/c;}}
    const Gs=0.105*2;for(let pass=0;pass<2;pass++){for(let s=1;s<n;s++)if(!fix[s])Y[s]=clamp(Y[s],Y[s-1]-Gs,Y[s-1]+Gs);for(let s=n-2;s>=0;s--)if(!fix[s])Y[s]=clamp(Y[s],Y[s+1]-Gs,Y[s+1]+Gs);}
    return{Y,K};},
  /* 4. runs not worth a structure: a tunnel under 40 m becomes a deep cutting, a dry bridge under 8 m an embankment */
  cleanRuns(K,wl){const n=K.length;for(let s=0;s<n;){if(!K[s]){s++;continue;}let e=s;while(e+1<n&&K[e+1]===K[s])e++;const len=(e-s)*2;let wet=false;for(let q=s;q<=e;q++)if(wl[q]>-1e8)wet=true;
      if(e===s||(K[s]===2&&len<40)||(K[s]===1&&len<8&&!wet))for(let q=s;q<=e;q++)K[q]=0;s=e+1;}},
  /* a tunnel's portal areas (apron, block, and 15 m round them) must not hold an open road at another level: its own further along, or
     any road already laid. Returns the clashing tunnel runs [start sample, end sample] */
  tunnelClash(S,P,others,D){const n=S.X.length,bad=[];for(let s=0;s<n;){if(P.K[s]!==2){s++;continue;}let e=s;while(e+1<n&&P.K[e+1]===2)e++;
      const ax=S.X[s],az=S.Z[s],bx=S.X[e],bz=S.Z[e],L=Math.hypot(bx-ax,bz-az)||1,dx=(bx-ax)/L,dz=(bz-az)/L,ya=P.Y[s],yb=P.Y[e],reach=D.A+15,wide=D.fw+10;
      const hit=(x,z,y)=>{const u=(x-ax)*dx+(z-az)*dz;if(u<-reach||u>L+reach)return false;if(u>D.dep+15&&u<L-D.dep-15)return false;/* over the middle of the tube: deep enough */const v=Math.abs(-(x-ax)*dz+(z-az)*dx);if(v>wide)return false;return Math.abs(y-(ya+(yb-ya)*clamp(u/L,0,1)))>3;};
      let clash=false;const away=Math.ceil((reach+30)/2);for(let q=0;q<n&&!clash;q++){if(P.K[q]!==0||(q>s-away&&q<e+away))continue;if(hit(S.X[q],S.Z[q],P.Y[q]))clash=true;}
      for(const r of others){if(clash)break;const pr=r.prof;for(let q=0;q<pr.X.length;q++)if(pr.K[q]===0&&hit(pr.X[q],pr.Z[q],pr.Y[q])){clash=true;break;}}
      if(clash)bad.push([s-15,e+15]);
      /* a bridge ending at the mouth: the portal needs its apron (and a little more) of open road in front, so it moves into the hill */
      const gap=Math.ceil((D.A+6)/2);for(let q=s-1;q>=Math.max(0,s-gap);q--)if(P.K[q]===1){bad.push([q,s+gap]);break;}for(let q=e+1;q<=Math.min(n-1,e+gap);q++)if(P.K[q]===1){bad.push([e-gap,q]);break;}
      s=e+1;}return bad;},
  // the piece for the road list: polyline (a structure one straight segment), labels per segment, the 2 m profile
  emit(S,P){const n=S.X.length,K=P.K,Y=P.Y,p=[S.X[0],S.Z[0]],sf=[],sy=[];let last=0;const add=(s,f,y)=>{p.push(S.X[s],S.Z[s]);sf.push(f);sy.push(y);last=s;};
    for(let s=1;s<n;){const f=K[s-1]&&K[s]===K[s-1]?K[s]:0;
      if(f){let e=s;while(e+1<n&&K[e+1]===f)e++;if(last!==s-1)add(s-1,0,null);add(e,f,[Y[s-1],Y[e]]);s=e+1;continue;}
      if(S.C[s]||s===n-1||s-last>=4||(s+1<n&&K[s+1]))add(s,0,null);s++;}/* the open road: every sample on a curve, every 8 m on the straight */
    return{p,sf,sy,prof:{X:S.X.slice(),Z:S.Z.slice(),Y:Array.from(Y),K:Array.from(K),C:S.C.slice()}};}};
