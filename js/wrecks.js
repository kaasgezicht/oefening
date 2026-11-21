'use strict';
// ===== wrecks.js
// ===================================================================
// WRECKS ON THE SEA FLOOR (4.58.0; the user: "add wreckages to the sea floor, one every 4 square kilometers", and they hold fish).
// One per 4 km² of sea: the map is cut into 2 km squares and each square that is mostly sea gets one, at a random spot 6–70 m deep,
// clear of the harbours. A mix of a wooden sailing ship, a steamer and a small fishing boat (models in buildings/wrecks.js), turned,
// tilted and half buried. Each is also a fishing spot (Fish.G with wreck:true, r 70, a better price): the boats' compass shows the
// nearest two. Drawn as static kit instances (Life.kitInst0) within 1.5 km of the camera.
// ===================================================================
const Wrecks={L:[],
  KIND:[['wreckSail',0.45,2.9],['wreckSteam',0.3,2.9],['wreckTrawl',0.25,0.9]],/* model, share, height of the model's sand line above its origin */
  init(){this.L=[];const T=App.T;if(!T||T.sea==null)return;const W=T.W,sea=T.sea,Hs=(x,z)=>R.sampleHr(T,x,z),rng=mulberry32((P.seed|0)*911+5),C=2000;
    const isSea=(x,z)=>x>60&&z>60&&x<W-60&&z<W-60&&Hs(x,z)<sea-6;
    for(let cz=0;cz<W;cz+=C)for(let cx=0;cx<W;cx+=C){let sea0=0;for(let k=0;k<16;k++)if(isSea(cx+(k%4+0.5)*C/4,cz+((k/4|0)+0.5)*C/4))sea0++;if(sea0<6){rng();continue;}
      /* shallow water first (5–13 m: the sea shows its floor only that deep), else anywhere 6–70 m deep (unseen, but the fish are there) */
      const ok=(x,z)=>{if(x<60||z<60||x>W-60||z>W-60)return false;if(Coast.H.some(h=>Math.hypot(h.x-x,h.z-z)<350)||(typeof Port!=='undefined'&&Port.S.some(s=>Math.hypot(s.x-x,s.z-z)<400)))return false;
        for(let a=0;a<6;a++){const q=Hs(x+Math.cos(a)*16,z+Math.sin(a)*16);if(Math.abs(q-Hs(x,z))>4||q>sea-3)return false;}return true;};
      const sh=[];for(let gz=cz+25;gz<cz+C;gz+=50)for(let gx=cx+25;gx<cx+C;gx+=50){const d=sea-Hs(gx,gz);if(d>=5&&d<=13)sh.push([gx,gz]);}
      let spot=null;for(let k=0;k<30&&sh.length&&!spot;k++){const q=sh[Math.floor(rng()*sh.length)],x=q[0]+(rng()-0.5)*40,z=q[1]+(rng()-0.5)*40,d=sea-Hs(x,z);if(d>=5&&d<=13&&ok(x,z))spot={x,z};}
      for(let k=0;k<40&&!spot;k++){const x=cx+rng()*C,z=cz+rng()*C,d=sea-Hs(x,z);if(d>=6&&d<=70&&ok(x,z))spot={x,z};}
      if(!spot)continue;let u=rng(),ki=0;for(;ki<this.KIND.length-1;ki++){if(u<this.KIND[ki][1])break;u-=this.KIND[ki][1];}const [t,,lift]=this.KIND[ki];
      const roll=t==='wreckTrawl'?(rng()<0.5?-1:1)*(1.0+rng()*0.3):(rng()-0.5)*0.5,pitch=(rng()-0.5)*0.12;
      this.L.push({x:spot.x,z:spot.z,y:Hs(spot.x,spot.z)+lift*Math.cos(roll)-0.3,rot:rng()*6.283,t,pr:Fish.pk(pitch,roll),hash:rng()});}
    Log.info(`wrecks: ${this.L.length} on the sea floor`);},
  /* fishing spots over them (added to Fish.G after the grounds, so saved indices of the grounds stay the same) */
  grounds(rng){return this.L.map(w=>{const fish=['cod','plaice','mackerel','herring'][Math.floor(rng()*4)];return{x:w.x,z:w.z,r:70,stock:0.85+rng()*0.15,fish,price:Math.round({herring:18,mackerel:22,cod:30,plaice:26}[fish]*1.3),h:null,wreck:true};});},
  kitPut(put){const cp=Cam.pos||[0,0,0];for(const w of this.L){if(Math.abs(w.x-cp[0])>1500||Math.abs(w.z-cp[2])>1500)continue;put(w.t,{x:w.x,y:w.y,z:w.z,rot:w.rot,hash:w.hash,pr:w.pr});}}};
