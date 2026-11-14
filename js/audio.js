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
  toggle(){if(this.on)this.stop();else this.start();this.syncBtn();},
  syncBtn(){const b=$('#btnSound');if(!b)return;setIcon(b,this.on?'soundOn':'soundOff');setCap(b,this.on?'Sound on':'Sound off');b.setAttribute('aria-pressed',this.on?'true':'false');},
  // distance and pan relative to the camera
  spatial(p){if(!p)return[0,0];const dx=p[0]-Cam.pos[0],dy=p[1]-Cam.pos[1],dz=p[2]-Cam.pos[2],d=Math.hypot(dx,dy,dz);
    const r=Cam.right||[1,0,0];const pan=clamp((dx*r[0]+dz*r[2])/Math.max(d,1),-1,1)*0.8;return[1/(1+d/35),pan];},
  out(vol,pan){const c=this.ctx,g=c.createGain();g.gain.value=vol;const p=c.createStereoPanner();p.pan.value=pan;g.connect(p);p.connect(this.master);return g;},
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
