'use strict';
// ===== bio.js
// ===================================================================
// BIOLUMINESCENT ALGAE (4.62.0; the user: "add a chance of realistic bioluminescent algae in the sea in the summer"; "1 in 4 nights").
// Like a Noctiluca bloom: on about one summer day in four (decided per game day, from the day number and the world seed) the algae bloom
// in patches along parts of the coast (a few hundred metres across, in water up to ~40 m deep). By day the bloom shows as faint
// rust-brown streaks; at night the water there lights up blue-green only where it is disturbed: in the breaking waves along the shore,
// in whitecaps, round boats and ships under way (bow wave and wake), where whales and dolphins surface and dive, where a fish jumps, and
// where a seaplane lands or taxis. Calm water stays dark, with a faint flicker. Drawn in FS_WATER (uBioP, uBio[8]).
// Setting: Sky → "Glowing algae in summer" (on).
// ===================================================================
const Bio={glow:0,tint:0,day:-1,bloom:false,force:false,D:new Float32Array(32),P:[0,0,0,0],
  /* is there a bloom today? (summer, 1 in 4, the same answer all day) */
  bloomToday(){if(this.force)return true;if(!+P.bioGlow||P.season!=='summer')return false;const d=(typeof Weather!=='undefined'?Weather.days:0)|0,v=Math.sin(d*12.9898+(P.seed|0)*0.7311+3.1)*43758.5453;return v-Math.floor(v)<0.25;},
  update(dt){const T=App.T;if(!T||T.sea==null){this.glow=this.tint=0;return;}const d=(typeof Weather!=='undefined'?Weather.days:0)|0;
    if(d!==this.day||this.force!==this._f){this.day=d;this._f=this.force;const was=this.bloom;this.bloom=this.bloomToday();if(this.bloom&&!was&&!this.force)Log.info('the sea is blooming tonight: glowing algae along the coast');
      this.P=[0,0,(d*37)%97+((P.seed|0)%13),(d*53)%89];/* where the patches lie moves from day to day */}
    const h=+P.timeOfDay||12;
    /* dark from dusk to dawn: 0 by day, 1 from 22:00 to 4:00, ramping over the twilight */
    const dk=h>=12?clamp((h-20.6)/1.4,0,1):clamp((4.8-h)/1.2,0,1),b=this.bloom?1:0;
    this.glow+=(b*dk-this.glow)*Math.min(1,dt*0.5);this.tint+=(b*(1-dk)-this.tint)*Math.min(1,dt*0.5);
    if(this.glow<0.01){this.D.fill(0);return;}
    // the disturbances near the camera: boats, ships, whales, dolphins, jumping fish, a seaplane on the water
    const cp=Cam.pos||[0,0,0],L=[],add=(x,z,r,s)=>{const dd=Math.hypot(x-cp[0],z-cp[2]);if(dd<900&&s>0.05)L.push([dd,x,z,r,s]);};
    if(typeof Coast!=='undefined'&&Coast.H)for(const hb of Coast.H)for(const bt of hb.boats||[]){if(bt.x==null)continue;const v=Math.abs(bt.v||bt.sp||0),hd=bt.hd||0;if(v<0.3){add(bt.x,bt.z,4,0.12);continue;}/* moored: a faint glow where the hull knocks */add(bt.x+Math.cos(hd)*4,bt.z+Math.sin(hd)*4,4+v*0.5,clamp(0.4+v/4,0,1));add(bt.x-Math.cos(hd)*(6+v*2),bt.z-Math.sin(hd)*(6+v*2),5+v*1.8,clamp(0.3+v/5,0,1));/* the bow wave and the wake */}
    if(typeof Ships!=='undefined')for(const s of Ships.list){if(s.x==null)continue;const v=Math.abs(s.v||0),hd=s.hd!=null?s.hd:(s.h||0);if(v<0.3)continue;add(s.x+Math.cos(hd)*12,s.z+Math.sin(hd)*12,6+v,clamp(0.4+v/5,0,1));add(s.x-Math.cos(hd)*(18+v*3),s.z-Math.sin(hd)*(18+v*3),9+v*2.5,clamp(0.3+v/6,0,1));}
    if(typeof Sea!=='undefined'){for(const w of Sea.whales)if(w.y>-3)add(w.x,w.z,9,clamp(1-Math.abs(w.y)/3,0,1));for(const pd of Sea.pods)for(const m of pd.m||[])if(m.y>-1.5)add(pd.x+(m.ox||0),pd.z+(m.oz||0),3.5,0.8);for(const sc of Sea.schools)for(const j of sc.jumps||[])add(j.x!=null?j.x:sc.x,j.z!=null?j.z:sc.z,2.5,0.9);}
    if(typeof Plane!=='undefined'&&Plane.on&&Plane.st){const p=Plane.st.p,v=Math.hypot(Plane.st.v[0],Plane.st.v[2]);if(p[1]-T.sea<3&&v>0.5)add(p[0],p[2],6+v*0.4,clamp(v/10,0.3,1));}
    L.sort((a,c)=>a[0]-c[0]);this.D.fill(0);L.slice(0,8).forEach((q,i)=>this.D.set([q[1],q[2],q[3],q[4]],i*4));},
  uniforms(p){const u=p.u('uBioP');if(u==null)return;gl.uniform4f(u,this.glow*(this.force===2&&this.glow>0.5?2:1),this.tint,this.P[2],this.P[3]);const ud=p.u('uBio');if(ud!=null)gl.uniform4fv(ud,this.D);}};
