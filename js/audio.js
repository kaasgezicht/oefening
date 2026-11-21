'use strict';
// ===== audio.js
// ===================================================================
// SOUND (step 15) — native Web Audio nodes only (no worklets: blocked on the user's host before).
// Chuffs synced to the wheels, a three-chime whistle, rail joint clicks under every axle,
// flange squeal in tight curves, buffer/derail crashes, wind and birds.
// ===================================================================
const Sfx={ctx:null,on:false,master:null,noise:null,trainNodes:new Map(),
  start(){if(this.ctx){if(this.ctx.state==='suspended')this.ctx.resume();this.on=true;return;}
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC){UI.toast('No audio in this browser');return;}
    const c=this.ctx=new AC();this.on=true;
    this.master=c.createGain();this.master.gain.value=P.volume;const comp=c.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;this.master.connect(comp);comp.connect(c.destination);
    const n=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=n.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;this.noise=n;
    // wind bed
    const w=c.createBufferSource();w.buffer=n;w.loop=true;const wl=c.createBiquadFilter();wl.type='lowpass';wl.frequency.value=380;this.windG=c.createGain();this.windG.gain.value=0;
    w.connect(wl);wl.connect(this.windG);this.windG.connect(this.master);w.start();
    Log.info(`audio started at ${c.sampleRate} Hz`);Music.start();},
  stop(){if(this.ctx)this.ctx.suspend();this.on=false;},
  /* the speaker cycles: sound and music → sound only → off. The choice is kept on this device; buttons that wake the audio up
     (Build, Drive, the whistle) only do so when it is not off, and never bring the music back by themselves */
  pref(){if(this._pref)return this._pref;try{this._pref=localStorage.getItem('trein.sound')||'all';}catch(e){this._pref='all';}return this._pref;},
  setPref(m){this._pref=m;try{localStorage.setItem('trein.sound',m);}catch(e){}},
  mode(){return!this.on?'off':P.music?'all':'sfx';},
  toggle(){const m=this.mode();if(m==='all'){P.music=0;this.setPref('sfx');UI.toast('Sound on, music off');}else if(m==='sfx'){this.stop();this.setPref('off');UI.toast('Sound off');}
    else{P.music=1;this.setPref('all');this.start();UI.toast('Sound and music on');}UI.refresh&&UI.refresh('music');this.syncBtn();},
  autoStart(){if(this.on||this.pref()==='off')return;if(this.pref()==='sfx')P.music=0;this.start();this.syncBtn();},
  syncBtn(){const b=$('#btnSound');if(!b)return;const m=this.mode();setIcon(b,m==='off'?'soundOff':m==='sfx'?'musicOff':'soundOn');setCap(b,m==='off'?'Sound off':m==='sfx'?'Sound, no music':'Sound and music');b.setAttribute('aria-pressed',m!=='off'?'true':'false');b.title=m==='off'?'Sound off (tap: sound and music)':m==='sfx'?'Sound without music (tap: off)':'Sound and music (tap: sound only)';},
  // distance and pan relative to the camera
  spatial(p){if(!p)return[0,0];const dx=p[0]-Cam.pos[0],dy=p[1]-Cam.pos[1],dz=p[2]-Cam.pos[2],d=Math.hypot(dx,dy,dz);
    const r=Cam.right||[1,0,0];const pan=clamp((dx*r[0]+dz*r[2])/Math.max(d,1),-1,1)*0.8;return[1/(1+d/35),pan];},
  out(vol,pan){const c=this.ctx,g=c.createGain();g.gain.value=vol;const p=c.createStereoPanner();p.pan.value=pan;g.connect(p);p.connect(this.master);return g;},
  /* aircraft engines (4.43), built once and kept running while flying: piston planes a nine-cylinder radial (a saw and a square at the
     firing rate through a low-pass that opens with the throttle) plus propeller and wind noise; the helicopter a turbine whine and
     the rotor's thump (low noise beaten at the blade-passing rate). Louder inside, quieter from far away */
  plane(pl,dt){if(!this.on||!this.ctx||!pl.st)return;const c=this.ctx,t=c.currentTime;if(!this.pe){const out=c.createGain();out.gain.value=0;const pan=c.createStereoPanner();out.connect(pan);pan.connect(this.master);
      const lp=c.createBiquadFilter();lp.type='lowpass';lp.Q.value=2;const o1=c.createOscillator(),o2=c.createOscillator();o1.type='sawtooth';o2.type='square';const g1=c.createGain(),g2=c.createGain();g1.gain.value=0.5;g2.gain.value=0.25;o1.connect(g1);o2.connect(g2);g1.connect(lp);g2.connect(lp);
      const eng=c.createGain();lp.connect(eng);eng.connect(out);const nz=c.createBufferSource();nz.buffer=this.noise;nz.loop=true;const bp=c.createBiquadFilter();bp.type='bandpass';bp.Q.value=0.7;const wg=c.createGain();wg.gain.value=0;nz.connect(bp);bp.connect(wg);wg.connect(out);
      const rl=c.createBiquadFilter();rl.type='lowpass';rl.frequency.value=180;const rg=c.createGain();rg.gain.value=0;const am=c.createGain();am.gain.value=0;const lfo=c.createOscillator();lfo.type='sine';const lg=c.createGain();lg.gain.value=0.5;lfo.connect(lg);lg.connect(am.gain);
      nz.connect(rl);rl.connect(am);am.connect(rg);rg.connect(out);const tw=c.createOscillator();tw.type='sine';const tg=c.createGain();tg.gain.value=0;tw.connect(tg);tg.connect(out);
      for(const o of [o1,o2,lfo,tw,nz])o.start();this.pe={out,pan,lp,o1,o2,eng,bp,wg,rg,am,lfo,tw,tg};}
    const E=this.pe,heli=pl.kind==='heli',cab=pl.cam==='cockpit'||pl.cam==='nose',[v,pn]=this.spatial(pl.st.p),vol=(cab?0.55:0.4)*clamp(v*6,0.05,1)*(pl.paused||pl.crashed?0:1),k=Math.min(1,dt*6+0.05),set=(a,x)=>a.setTargetAtTime(x,t,0.08);
    set(E.out.gain,vol);E.pan.pan.setTargetAtTime(cab?0:pn,t,0.1);const V=pl.V||0;
    if(heli){const ro=pl.rot||0,bl=ro*5.8*4;set(E.eng.gain,0);set(E.lfo.frequency,Math.max(1,bl));set(E.am.gain,0.5*ro);set(E.rg.gain,1.6*ro);set(E.tw.frequency,2600+ro*2400+(pl.T||0)/PLH.m*60);set(E.tg.gain,0.05*ro);set(E.wg.gain,Math.min(0.5,V*V/4000));set(E.bp.frequency,900);}
    else if(pl.kind==='cl415'){/* turboprops: the propellers' deep buzz (blade passing, about 80 Hz); no turbine whine (it was a shrill tone on phones, 4.46) */const th=pl.ctl.thr,f=68+th*22;set(E.o1.frequency,f);set(E.o2.frequency,f*0.5);set(E.lp.frequency,220+th*500);set(E.eng.gain,0.55+th*0.45);set(E.rg.gain,0);set(E.tg.gain,0);set(E.wg.gain,Math.min(0.7,0.1+V*V/5000));set(E.bp.frequency,450+V*10);}
    else{const rpm=pl.rpm(),f=rpm/60*4.5,th=pl.ctl.thr;set(E.o1.frequency,f);set(E.o2.frequency,f/2);set(E.lp.frequency,250+th*1100+rpm*0.1);set(E.eng.gain,0.6+th*0.5);set(E.rg.gain,0);set(E.tg.gain,0);
      set(E.wg.gain,Math.min(0.7,0.08+V*V/5000));set(E.bp.frequency,500+V*12);}},
  planeStop(){if(!this.pe||!this.ctx)return;this.pe.out.gain.setTargetAtTime(0,this.ctx.currentTime,0.15);},
  /* a short bright two-note chime (mission complete) */
  chime(){if(!this.on||!this.ctx)return;const c=this.ctx,t=c.currentTime;[[784,0],[1175,0.13],[1568,0.26]].forEach(([f,d])=>{const o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(0,t+d);g.gain.linearRampToValueAtTime(0.18,t+d+0.02);g.gain.exponentialRampToValueAtTime(0.001,t+d+0.6);o.connect(g);g.connect(this.master);o.start(t+d);o.stop(t+d+0.7);});},
  burst(dur,t0){const s=this.ctx.createBufferSource();s.buffer=this.noise;s.start(t0,Math.random()*1.5,dur+0.05);return s;},
  chuff(tr,str){if(!this.on||P.chuffVol<=0)return;const [v,pan]=this.spatial(locoPoint(tr,4.5,3.5,0));if(v<0.01)return;const c=this.ctx,t=c.currentTime;
    const sp=Math.abs(tr.v),dur=clamp(0.32-sp*0.006,0.07,0.3),amp=(0.18+0.8*str)*v*P.chuffVol*(tr.poses[0].inTunnel?1.8:1);
    const s=this.burst(dur,t),bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=500+sp*25+str*400;bp.Q.value=0.9;const g=c.createGain();
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(amp,t+0.008);g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    s.connect(bp);bp.connect(g);g.connect(this.out(1,pan));
    const o=c.createOscillator();o.frequency.setValueAtTime(95,t);o.frequency.exponentialRampToValueAtTime(45,t+0.12);const og=c.createGain();og.gain.setValueAtTime(amp*0.6,t);og.gain.exponentialRampToValueAtTime(0.001,t+0.14);
    o.connect(og);og.connect(this.out(1,pan));o.start(t);o.stop(t+0.16);},
  joints(tr){if(!this.on||P.clickVol<=0||Math.abs(tr.v)<0.6)return;const c=this.ctx,sp=Math.abs(tr.v);let off=0;
    for(const v of tr.veh){for(const pv of [v.pf,v.pr])for(const ax of [-1,1]){const dist=off+v.len/2-pv+ax*1.0;if(dist<0)continue;const t=c.currentTime+dist/sp;if(t-c.currentTime>3)continue;
        const p=tr.poses&&tr.poses[0]?tr.poses[0].c:null;const [vol,pan]=this.spatial(p);if(vol<0.02)continue;
        const s=this.burst(0.05,t),hp=c.createBiquadFilter();hp.type='bandpass';hp.frequency.value=1800+Math.random()*900;hp.Q.value=2;const g=c.createGain();
        g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.35*vol*P.clickVol,t+0.003);g.gain.exponentialRampToValueAtTime(0.0005,t+0.05);
        s.connect(hp);hp.connect(g);g.connect(this.out(1,pan));}off+=v.len+COUPLE;}},
  // the conductor's pea whistle: a short trilled high note, quieter with distance
  guard(x,y,z){if(!this.ctx||!this.on)return;const c=this.ctx,t=c.currentTime,cp=Cam.pos||[x,y,z],d=Math.hypot(x-cp[0],y-cp[1],z-cp[2]),vol=0.12/(1+d/25);if(vol<0.004)return;
    const o=c.createOscillator(),g=c.createGain(),lfo=c.createOscillator(),lg=c.createGain();o.type='sine';o.frequency.value=2900;lfo.frequency.value=28;lg.gain.value=180;lfo.connect(lg);lg.connect(o.frequency);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+0.03);g.gain.setValueAtTime(vol,t+0.55);g.gain.linearRampToValueAtTime(0,t+0.7);o.connect(g);g.connect(this.master||c.destination);o.start(t);lfo.start(t);o.stop(t+0.75);lfo.stop(t+0.75);},
  whistle(tr,on){if(!this.ctx||!this.on)return;let w=this.trainNodes.get(tr.id);const c=this.ctx,t=c.currentTime;
    if(on&&!w){const g=c.createGain();g.gain.value=0;const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1400*P.whistlePitch;bp.Q.value=1.2;
      const oscs=[1,1.26,1.5].map(r=>{const o=c.createOscillator();o.type='sawtooth';o.frequency.value=520*r*P.whistlePitch;o.connect(bp);o.start();return o;});
      const br=c.createBufferSource();br.buffer=this.noise;br.loop=true;const bh=c.createBiquadFilter();bh.type='highpass';bh.frequency.value=2500;const bg=c.createGain();bg.gain.value=0.25;br.connect(bh);bh.connect(bg);bg.connect(g);br.start();
      bp.connect(g);const pn=c.createStereoPanner();g.connect(pn);pn.connect(this.master);w={g,oscs,br,pn};this.trainNodes.set(tr.id,w);
      g.gain.setTargetAtTime(0.22*P.whistleVol,t,0.04);for(const o of oscs)o.frequency.setTargetAtTime(o.frequency.value*1.01,t,0.2);}
    else if(!on&&w){w.g.gain.setTargetAtTime(0,t,0.08);const ww=w;setTimeout(()=>{ww.oscs.forEach(o=>o.stop());ww.br.stop();},600);this.trainNodes.delete(tr.id);}},
  trainLoop(tr,Rr){if(!this.on)return;const c=this.ctx;const p=tr.poses&&tr.poses[0]?tr.poses[0].c:null;const [v,pan]=this.spatial(p);
    const w=this.trainNodes.get(tr.id);if(w){w.g.gain.setTargetAtTime(0.22*P.whistleVol*Math.max(v,0.05)*3,c.currentTime,0.05);w.pn.pan.value=pan;}
  },
  crash(tr){if(!this.on)return;const c=this.ctx,t=c.currentTime,[v,pan]=this.spatial(tr.poses&&tr.poses[0]?tr.poses[0].c:null);
    const s=this.burst(0.9,t),lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;const g=c.createGain();g.gain.setValueAtTime(0.9*Math.max(v,0.2),t);g.gain.exponentialRampToValueAtTime(0.001,t+0.9);
    s.connect(lp);lp.connect(g);g.connect(this.out(1,pan));},
  rain(amt){if(!this.on||!this.ctx)return;const c=this.ctx;if(!this.rainG){const s=c.createBufferSource();s.buffer=this.noise;s.loop=true;const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=2600;bp.Q.value=0.5;
      const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=7000;this.rainG=c.createGain();this.rainG.gain.value=0;s.connect(bp);bp.connect(lp);lp.connect(this.rainG);this.rainG.connect(this.master);s.start();}
    this.rainG.gain.setTargetAtTime(0.09*Math.min(amt,1.3)*P.ambVol,c.currentTime,0.8);},
  thunder(delay,str){if(!this.on||!this.ctx)return;const c=this.ctx,t=c.currentTime+delay,dur=3+str*3;const s=this.burst(dur,t),lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(900,t);lp.frequency.exponentialRampToValueAtTime(90,t+dur);
    const g=c.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.7*str*P.ambVol,t+0.05+Math.random()*0.3);g.gain.exponentialRampToValueAtTime(0.001,t+dur);s.connect(lp);lp.connect(g);g.connect(this.out(1,Math.random()*1.2-0.6));},
  // water on a fire: a steam hiss (high-passed noise swelling and dying away), louder the more was hit and the closer it is
  hiss(vol){if(!this.on||!this.ctx||vol<0.02)return;const c=this.ctx,t=c.currentTime,s=this.burst(2.6,t),hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.setValueAtTime(1800,t);hp.frequency.linearRampToValueAtTime(3800,t+2.4);
    const g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.35*Math.min(1,vol),t+0.15);g.gain.exponentialRampToValueAtTime(0.001,t+2.5);s.connect(hp);hp.connect(g);g.connect(this.master);},
  clunk(){if(!this.on)return;const c=this.ctx,t=c.currentTime,o=c.createOscillator();o.frequency.setValueAtTime(180,t);o.frequency.exponentialRampToValueAtTime(70,t+0.1);
    const g=c.createGain();g.gain.setValueAtTime(0.25,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.15);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+0.16);},
  update(dt){if(!this.on||!this.ctx)return;this.master.gain.value=P.volume;
    this.windG.gain.setTargetAtTime(0.05*P.windStrength*P.ambVol*(0.6+0.4*Math.sin(App.time*0.3)),this.ctx.currentTime,0.5);
    // night: crickets in the warm months, an owl now and then
    const nightA=R.sun&&R.sun.night||0,E=Weather.cur;
    if(P.ambVol>0&&nightA>0.5&&E.rain<0.2&&(P.season==='summer'||P.season==='spring')&&Math.random()<dt*2.2){const c=this.ctx,t=c.currentTime,f=4200+Math.random()*700,o=c.createOscillator(),g=c.createGain(),pn=c.createStereoPanner();o.frequency.value=f;
      for(let i=0;i<3;i++){const t0=t+i*0.045;g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(0.012*P.ambVol,t0+0.008);g.gain.linearRampToValueAtTime(0,t0+0.03);}pn.pan.value=Math.random()*1.8-0.9;o.connect(g);g.connect(pn);pn.connect(this.master);o.start(t);o.stop(t+0.2);}
    if(P.ambVol>0&&nightA>0.6&&E.rain<0.2&&Math.random()<dt*0.04){const c=this.ctx,t=c.currentTime;for(const [d,f,l] of [[0,410,0.35],[0.55,380,0.6]]){const o=c.createOscillator(),g=c.createGain(),lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;o.frequency.setValueAtTime(f,t+d);o.frequency.linearRampToValueAtTime(f*0.92,t+d+l);
      g.gain.setValueAtTime(0,t+d);g.gain.linearRampToValueAtTime(0.03*P.ambVol,t+d+0.06);g.gain.linearRampToValueAtTime(0,t+d+l);o.connect(lp);lp.connect(g);g.connect(this.master);o.start(t+d);o.stop(t+d+l+0.05);}}
    // birds by day, now and then
    if(P.ambVol>0&&R.sun&&R.sun.day>0.3&&E.rain<0.3&&Math.random()<dt*0.5){const c=this.ctx,t=c.currentTime;const o=c.createOscillator(),g=c.createGain();const f=2400+Math.random()*1800,n=2+Math.floor(Math.random()*4);
      for(let i=0;i<n;i++){const t0=t+i*0.11;o.frequency.setValueAtTime(f,t0);o.frequency.exponentialRampToValueAtTime(f*(1.3+Math.random()*0.4),t0+0.06);g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(0.025*P.ambVol,t0+0.01);g.gain.linearRampToValueAtTime(0,t0+0.07);}
      const pn=c.createStereoPanner();pn.pan.value=Math.random()*1.6-0.8;o.connect(g);g.connect(pn);pn.connect(this.master);o.start(t);o.stop(t+n*0.11+0.1);}}
};
