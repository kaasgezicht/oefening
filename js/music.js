'use strict';
// ===== music.js
// ===================================================================
// MUSIC — generated as it plays, with native Web Audio nodes only. A style is picked from the
// season, time of day and weather (spring mornings pastoral, summer days a folk waltz, autumn and
// rain gentle piano, winter a music box, nights and mist ambient pads). 4-bar phrases with a motif
// that repeats and varies, diatonic chord progressions, soft reverb.
// ===================================================================
const MODES={ionian:[0,2,4,5,7,9,11],dorian:[0,2,3,5,7,9,10],aeolian:[0,2,3,5,7,8,10],mixolydian:[0,2,4,5,7,9,10],lydian:[0,2,4,6,7,9,11],phrygian:[0,1,3,5,7,8,10]};
const MSTYLES={
  pastoral:{meter:4,bpm:92,modes:['ionian','mixolydian'],prog:[[0,3,4,0],[0,5,3,4],[0,4,5,3],[3,4,0,0]],mel:'flute',acc:'arp',rest:0.22,rev:0.32,octM:72,
    rhythms:[[0,2,4,6],[0,3,4,6],[0,2,3,4,6],[0,4,6],[0,1,2,4,6]]},
  waltz:{meter:3,bpm:138,modes:['ionian','lydian','mixolydian'],prog:[[0,4,4,0],[0,3,4,0],[0,5,1,4],[0,0,3,4]],mel:'reed',acc:'oompah',rest:0.15,rev:0.22,octM:72,
    rhythms:[[0,2,4],[0,3,4],[0,4],[0,1,2,4],[0]]},
  piano:{meter:4,bpm:70,modes:['aeolian','dorian'],prog:[[0,5,2,6],[0,3,6,2],[0,6,5,4],[5,3,0,4]],mel:'piano',acc:'broken',rest:0.35,rev:0.45,octM:72,
    rhythms:[[0,3,4],[0,2,4,6],[0,4],[0,6],[0,2,3,6]]},
  musicbox:{meter:3,bpm:80,modes:['ionian','lydian'],prog:[[0,3,4,0],[0,5,3,4],[0,4,0,4]],mel:'box',acc:'twinkle',rest:0.28,rev:0.5,octM:84,penta:true,
    rhythms:[[0,2,4],[0,1,2,4],[0,4],[0,2],[0,3,4]]},
  ambient:{meter:4,bpm:54,modes:['aeolian','dorian','lydian'],prog:[[0,5,3,4],[0,3,5,6],[0,6,3,0]],mel:'bell',acc:'pad',rest:0.62,rev:0.7,octM:72,barsPerChord:2,
    rhythms:[[0],[0,4],[2],[0,6],[4]]}};
const Music={ctx:null,bus:null,started:false,nextT:0,step:0,bar:0,style:'pastoral',key:0,mode:'ionian',prog:null,phrase:null,lastStyle:'',dark:false,
  start(){if(this.started||!Sfx.ctx)return;const c=this.ctx=Sfx.ctx;this.started=true;
    this.bus=c.createGain();this.bus.gain.value=0;const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=9000;this.lp=lp;this.bus.connect(lp);lp.connect(Sfx.master);
    this.rev=c.createConvolver();this.rev.buffer=this.impulse(2.9);this.revG=c.createGain();this.revG.gain.value=0.35;this.send=c.createGain();this.send.gain.value=1;
    this.send.connect(this.rev);this.rev.connect(this.revG);this.revG.connect(lp);
    this.nextT=c.currentTime+0.2;this.timer=setInterval(()=>this.tick(),60);Log.info('music started');},
  impulse(sec){const c=this.ctx,n=Math.floor(c.sampleRate*sec),b=c.createBuffer(2,n,c.sampleRate);for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<n;i++){const t=i/n;d[i]=(Math.random()*2-1)*Math.pow(1-t,2.4)*(t<0.01?t/0.01:1);}}return b;},
  mood(){const h=P.timeOfDay,E=Weather.eff(),S=P.season;const tod=h<5||h>=21.5?'night':h<8.5?'dawn':h<17.5?'day':'dusk';
    const wx=E.storm>0.5?'storm':E.rain>0.3?'rain':E.snow>0.3?'snow':E.mist>0.7?'mist':'fair';
    let st;if(P.musicStyle!=='auto')st=P.musicStyle;else if(wx==='storm')st='ambient';else if(tod==='night')st=S==='winter'?'musicbox':'ambient';
    else if(wx==='rain')st='piano';else if(wx==='snow')st='musicbox';else if(wx==='mist')st='ambient';else if(tod==='dawn')st='pastoral';
    else if(tod==='dusk')st=S==='autumn'||S==='winter'?'piano':'pastoral';else st={spring:'pastoral',summer:'waltz',autumn:'piano',winter:'musicbox'}[S];
    return{st,dark:wx==='storm'||(tod==='night'&&wx!=='fair'),tod,wx};},
  stepDur(){const s=MSTYLES[this.style];return 60/(s.bpm*P.musicTempo)/2;},
  tick(){const c=this.ctx;if(!c)return;let duck=1;if(P.musicDuck){let wh=false,near=0;const cp=Cam.pos||[0,0,0];
      for(const tr of Trains.list){if(tr.whistle)wh=true;const p0=tr.poses&&tr.poses[0];if(p0&&Math.abs(tr.v||0)>1)near=Math.max(near,1-clamp((Math.hypot(p0.c[0]-cp[0],p0.c[1]-cp[1],p0.c[2]-cp[2])-15)/60,0,1));}
      duck=(wh?0.5:1)*(1-0.35*near)*(R.A&&R.A.night>0.5?0.85:1);}
    const want=P.music&&Sfx.on?P.musicVol*0.42*duck:0;this.bus.gain.setTargetAtTime(want,c.currentTime,0.6);
    if(want<=0){this.nextT=c.currentTime+0.2;return;}
    if(this.nextT<c.currentTime-0.5)this.nextT=c.currentTime+0.05;
    while(this.nextT<c.currentTime+0.3){this.playStep(this.nextT);this.nextT+=this.stepDur();}},
  newPhrase(){const m=this.mood();const S=MSTYLES[m.st];
    if(m.st!==this.style||!this.prog||Math.random()<0.15){this.style=m.st;this.mode=m.dark?(Math.random()<0.5?'phrygian':'aeolian'):S.modes[Math.floor(Math.random()*S.modes.length)];
      if(m.st!==this.lastStyle||Math.random()<0.3)this.key=[0,2,5,7,-3,-5,3][Math.floor(Math.random()*7)];this.lastStyle=m.st;Log.info(`music: ${m.st} in ${this.mode} (${m.tod}, ${m.wx}, ${P.season})`);}
    this.dark=m.dark;this.prog=S.prog[Math.floor(Math.random()*S.prog.length)];this.revG.gain.setTargetAtTime(S.rev*(m.dark?1.3:1),this.ctx.currentTime,1);
    this.lp.frequency.setTargetAtTime(m.wx==='rain'||m.wx==='storm'?2600:m.tod==='night'?4200:9000,this.ctx.currentTime,2);
    // melody plan: motif, variation, motif, cadence
    const motif=S.rhythms[Math.floor(Math.random()*S.rhythms.length)].map((s,i)=>({s,mv:i===0?0:Math.round((Math.random()-0.5)*4)}));
    const alt=S.rhythms[Math.floor(Math.random()*S.rhythms.length)].map((s,i)=>({s,mv:i===0?0:Math.round((Math.random()-0.5)*3)}));
    this.phrase=[motif,Math.random()<0.5?motif.map(n=>({s:n.s,mv:n.mv+(Math.random()<0.4?1:0)})):alt,motif,[{s:0,mv:0,long:true}]];this.mel=this.mel||2;},
  deg(d,oct){const sc=MODES[this.mode];const o=Math.floor(d/7),i=((d%7)+7)%7;return this.key+sc[i]+12*o+(oct||60);},
  hz(m){return 440*Math.pow(2,(m-69)/12);},
  playStep(t){const S=MSTYLES[this.style],spb=S.meter*2;if(this.step%spb===0){if(this.bar%4===0)this.newPhrase();}
    const bpc=S.barsPerChord||1,chordDeg=this.prog[Math.floor(this.bar/bpc)%this.prog.length],st=this.step%spb,beat=st/2;
    const ch=[chordDeg,chordDeg+2,chordDeg+4],d=this.stepDur(),acc=S.acc;const vel=this.dark?0.7:1;
    // bass and accompaniment
    if(acc==='arp'){if(st===0)this.inst('bass',t,this.hz(this.deg(chordDeg,36)),0.5,d*4);const pat=[0,1,2,1,3,1,2,1];const n=pat[st%8];this.inst('pluck',t,this.hz(this.deg(n===3?chordDeg+7:ch[n],60)),0.22*vel,d*1.8);}
    else if(acc==='oompah'){if(st===0)this.inst('bass',t,this.hz(this.deg(chordDeg,36)),0.55,d*1.6);if(st===2||st===4)for(const q of ch)this.inst('reedS',t,this.hz(this.deg(q,60)),0.09,d*0.9);}
    else if(acc==='broken'){if(st===0)this.inst('piano',t,this.hz(this.deg(chordDeg,36)),0.35,d*8);const pat=[0,2,1,2,0,2,1,2];this.inst('piano',t,this.hz(this.deg(ch[pat[st%8]],48)),0.16*vel,d*3);}
    else if(acc==='twinkle'){if(st===0)this.inst('bell',t,this.hz(this.deg(chordDeg,48)),0.18,d*6);const pat=[0,1,2,3,2,1];const n=pat[st%6];this.inst('box',t,this.hz(this.deg(n===3?chordDeg+7:ch[n],72)),0.13*vel,d*2);}
    else if(acc==='pad'){if(st===0&&this.bar%bpc===0)this.pad(t,ch.map(q=>this.hz(this.deg(q,48))),d*spb*bpc);if(st===0&&this.bar%bpc===0)this.inst('bass',t,this.hz(this.deg(chordDeg,36)),0.25,d*spb*bpc*0.9);}
    // melody
    const pb=this.phrase[this.bar%4];if(pb)for(const n of pb){if(n.s!==st)continue;if(!n.long&&Math.random()<S.rest*(this.dark?1.3:1))continue;
      let m=this.mel+n.mv;if(beat===0||n.long){const tgt=ch.map(q=>q+7*Math.round((m-q)/7));m=tgt.reduce((a,b)=>Math.abs(b-m)<Math.abs(a-m)?b:a);}
      m=clamp(m,-2,11);if(S.penta){const i=((m%7)+7)%7;if(i===3||i===6)m+=1;}this.mel=m;
      const next=pb.find(q=>q.s>n.s);const len=n.long?d*spb*0.95:((next?next.s:spb)-n.s)*d;this.inst(S.mel,t,this.hz(this.deg(m,S.octM-(this.dark?12:0))),(n.long?0.24:0.2)*vel,len);}
    this.step++;if(this.step%spb===0)this.bar++;},
  env(g,t,a,peak,dec,sus,rel,dur){g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.setTargetAtTime(peak*sus,t+a,dec);g.gain.setTargetAtTime(0.0001,t+Math.max(a,dur),rel);},
  out(g,dry,wet){g.connect(this.bus);const s=this.ctx.createGain();s.gain.value=wet;g.connect(s);s.connect(this.send);},
  osc(type,f,t,stop,det){const o=this.ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);if(det)o.detune.value=det;o.start(t);o.stop(stop);return o;},
  inst(kind,t,f,v,dur){const c=this.ctx,g=c.createGain(),end=t+dur+2.5;
    if(kind==='pluck'){const o=this.osc('sawtooth',f,t,end,-4),o2=this.osc('triangle',f*2,t,end,3),lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(3200,t);lp.frequency.exponentialRampToValueAtTime(380,t+0.35);
      o.connect(lp);o2.connect(lp);lp.connect(g);this.env(g,t,0.004,v,0.25,0.15,0.2,dur);this.out(g,1,0.3);}
    else if(kind==='flute'){const o=this.osc('sine',f,t,end),o2=this.osc('triangle',f,t,end),lfo=this.osc('sine',5.2,t,end),lg=c.createGain();lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(f*0.006,t+0.3);lfo.connect(lg);lg.connect(o.frequency);lg.connect(o2.frequency);
      const m=c.createGain();m.gain.value=0.35;o2.connect(m);m.connect(g);o.connect(g);this.env(g,t,0.06,v,0.4,0.8,0.12,dur*0.92);this.out(g,1,0.45);}
    else if(kind==='reed'||kind==='reedS'){const o=this.osc('square',f,t,end,-5),o2=this.osc('square',f,t,end,6),lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1600;lp.Q.value=0.7;
      const m=c.createGain();m.gain.value=0.5;o.connect(m);o2.connect(m);m.connect(lp);lp.connect(g);this.env(g,t,kind==='reedS'?0.01:0.03,v*0.55,0.3,0.75,0.06,dur*0.9);this.out(g,1,0.25);}
    else if(kind==='piano'){for(const [h,a,dc] of [[1,1,1.6],[2,0.35,0.9],[3,0.12,0.5]]){const o=this.osc('sine',f*h,t,end,h===2?2:0),gg=c.createGain();gg.gain.setValueAtTime(0.0001,t);gg.gain.linearRampToValueAtTime(v*a,t+0.004);gg.gain.setTargetAtTime(0.0001,t+0.004,dc*Math.min(1,dur));o.connect(gg);gg.connect(g);}
      g.gain.value=1;g.gain.setTargetAtTime(0.0001,t+dur,0.25);this.out(g,1,0.5);}
    else if(kind==='box'||kind==='bell'){const ratio=kind==='box'?3.5:2.76,o=this.osc('sine',f,t,end),mo=this.osc('sine',f*ratio,t,end),mg=c.createGain();mg.gain.setValueAtTime(f*(kind==='box'?1.6:2.4),t);mg.gain.setTargetAtTime(0,t,kind==='box'?0.08:0.35);
      mo.connect(mg);mg.connect(o.frequency);o.connect(g);g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(v,t+0.003);g.gain.setTargetAtTime(0.0001,t+0.003,kind==='box'?0.35:0.9);this.out(g,1,0.6);}
    else if(kind==='bass'){const o=this.osc('triangle',f,t,end),o2=this.osc('sine',f/2,t,end),lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=700;o.connect(lp);o2.connect(lp);lp.connect(g);this.env(g,t,0.012,v*0.6,0.25,0.5,0.1,dur*0.85);this.out(g,1,0.1);}
    setTimeout(()=>{try{g.disconnect();}catch(e){}},(end-c.currentTime+0.3)*1000);},
  pad(t,fs,dur){const c=this.ctx,g=c.createGain(),lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(500,t);lp.frequency.linearRampToValueAtTime(this.dark?650:1100,t+dur*0.5);lp.frequency.linearRampToValueAtTime(500,t+dur);
    const end=t+dur+3;for(const f of fs)for(const det of [-8,7]){const o=this.osc('sawtooth',f,t,end,det);o.connect(lp);}lp.connect(g);
    g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(0.05,t+1.6);g.gain.setValueAtTime(0.05,t+dur-0.2);g.gain.setTargetAtTime(0.0001,t+dur-0.2,0.9);this.out(g,1,0.8);
    setTimeout(()=>{try{g.disconnect();}catch(e){}},(end-c.currentTime+0.3)*1000);}
};
