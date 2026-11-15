'use strict';
// ===== classical.js
// ===================================================================
// CLASSICAL MUSIC — well-known public-domain pieces (composers who died more than a century ago), written out as melody notes and
// chords and played on the music synth (js/music.js instruments) with an accompaniment pattern per piece. The music manager
// (Settings > Sound, or the sky sheet) blocks pieces and generated presets, plays a piece now or skips; the mix setting chooses
// between both kinds alternating, classical only or generated only. Blocked items are remembered on this device (localStorage).
// Notation: tokens "C#5:3" = note, octave, length in units (default 1); "r" a rest; "|" bar lines are only for reading.
// unit = the length of one unit in quarter notes; bar = units per bar; pick = units before the first full bar (chords start after).
// ===================================================================
def('musicMix',{tab:'sound',label:'Music: what plays',kind:'select',options:[['mix','Generated and classical, in turn'],['classical','Classical only'],['gen','Generated only']],def:'mix',apply:'live'});
const PIECES=[
 {id:'ode',title:'Ode to Joy',by:'Beethoven',bpm:104,unit:0.5,bar:8,oct:12,mel:'piano',acc:'alberti',
  m:'F#4:2 F#4:2 G4:2 A4:2|A4:2 G4:2 F#4:2 E4:2|D4:2 D4:2 E4:2 F#4:2|F#4:3 E4:1 E4:4|F#4:2 F#4:2 G4:2 A4:2|A4:2 G4:2 F#4:2 E4:2|D4:2 D4:2 E4:2 F#4:2|E4:3 D4:1 D4:4|E4:2 E4:2 F#4:2 D4:2|E4:2 F#4:1 G4:1 F#4:2 D4:2|E4:2 F#4:1 G4:1 F#4:2 E4:2|D4:2 E4:2 A3:4|F#4:2 F#4:2 G4:2 A4:2|A4:2 G4:2 F#4:2 E4:2|D4:2 D4:2 E4:2 F#4:2|E4:3 D4:1 D4:4',
  c:'D A D A D A D A:2 D:2 A D A A D A D A:2 D:2'},
 {id:'elise',title:'Für Elise',by:'Beethoven',bpm:72,unit:0.25,bar:6,pick:2,mel:'piano',acc:'elise',
  m:'E5 D#5|E5 D#5 E5 B4 D5 C5|A4:2 r C4 E4 A4|B4:2 r E4 G#4 B4|C5:2 r E4 E5 D#5|E5 D#5 E5 B4 D5 C5|A4:2 r C4 E4 A4|B4:2 r E4 C5 B4|A4:4 r:2',
  c:'N Am E Am N Am E Am'},
 {id:'nacht',title:'Eine kleine Nachtmusik',by:'Mozart',bpm:126,unit:0.5,bar:8,mel:'reed',acc:'pulse',
  m:'G5:2 r D5 G5:2 r D5|G5 D5 G5 B5 D6:4|C6:2 r A5 C6:2 r A5|C6 A5 F#5 A5 D5:4|G5:2 r D5 G5:2 r D5|G5 D5 G5 B5 D6:4|C6:2 r A5 C6:2 r A5|C6 A5 F#5 A5 G5:4',
  c:'G G D7 D G G D7 G'},
 {id:'minuet',title:'Minuet in G',by:'J. S. Bach (Petzold)',bpm:116,unit:0.5,bar:6,mel:'box',acc:'waltz',
  m:'D5:2 G4 A4 B4 C5|D5:2 G4:2 G4:2|E5:2 C5 D5 E5 F#5|G5:2 G4:2 G4:2|C5:2 D5 C5 B4 A4|B4:2 C5 B4 A4 G4|F#4:2 G4 A4 B4 G4|A4:6|D5:2 G4 A4 B4 C5|D5:2 G4:2 G4:2|E5:2 C5 D5 E5 F#5|G5:2 G4:2 G4:2|C5:2 D5 C5 B4 A4|B4:2 C5 B4 A4 G4|A4:2 B4 A4 G4 F#4|G4:6',
  c:'G G C G Am G D D G G C G Am G D7 G'},
 {id:'canon',title:'Canon in D',by:'Pachelbel',bpm:66,unit:0.5,bar:8,mel:'flute',acc:'arp',
  m:'F#5:4 E5:4|D5:4 C#5:4|B4:4 A4:4|B4:4 C#5:4|D5:4 C#5:4|B4:4 A4:4|G4:4 F#4:4|G4:4 E4:4|D5:2 F#5:2 A5:2 G5:2|F#5:2 D5:2 F#5:2 E5:2|D5:2 B4:2 D5:2 A5:2|G5:2 B5:2 A5:2 G5:2|F#5:2 D5:2 E5:2 C#6:2|D6:2 F#6:2 A6:2 A5:2|B5:2 G5:2 A5:2 F#5:2|D5:2 D6:2 D6:4',
  c:'D:2 A:2 Bm:2 F#m:2 G:2 D:2 G:2 A:2 D:2 A:2 Bm:2 F#m:2 G:2 D:2 G:2 A:2 D:2 A:2 Bm:2 F#m:2 G:2 D:2 G:2 A:2 D:2 A:2 Bm:2 F#m:2 G:2 D:2 G:2 A:2'},
 {id:'lullaby',title:'Lullaby (Wiegenlied)',by:'Brahms',bpm:76,unit:0.5,bar:6,pick:2,oct:12,mel:'box',acc:'waltz',
  m:'E4 E4|G4:4 E4 E4|G4:4 E4 G4|C5:2 B4:3 A4|A4:2 G4:2 D4 E4|F4:2 D4:2 D4 E4|F4:4 D4 F4|B4 A4 G4:2 B4:2|C5:4 C4 C4|C5:4 A4 F4|G4:4 E4 C4|F4:2 G4:2 A4:2|G4:4 C4 C4|C5:4 A4 F4|G4:4 E4 C4|F4 E4 D4:2 B3:2|C4:6',
  c:'C C G7 G7 G7 G7 G7 C F C F C F C G7 C'},
 {id:'morning',title:'Morning Mood',by:'Grieg',bpm:100,unit:0.5,bar:6,mel:'flute',acc:'pad',
  m:'G5 E5 D5 C5 D5 E5|G5 E5 D5 C5 D5 E5|D5 E5 G5 E5 G5 A5|E5 A5 G5 E5 D5 C5|r:6|G5 E5 D5 C5 D5 E5|G5 E5 D5 C5 D5 E5|D5 E5 G5 E5 G5 A5|E5 A5 G5 E5 D5 C5|C5:6',
  c:'C C F:1.5 Am:1.5 G:1.5 C:1.5 C C C F:1.5 Am:1.5 G:1.5 C:1.5 C'},
 {id:'troll',title:'In the Hall of the Mountain King',by:'Grieg',bpm:132,unit:0.5,bar:8,mel:'reed',acc:'stacc',
  m:'A3 B3 C4 D4 E4 C4 E4:2|D#4 B3 D#4:2 D4 A#3 D4:2|A3 B3 C4 D4 E4 C4 E4 A4|G4 E4 C4 E4 G4:4|A3 B3 C4 D4 E4 C4 E4:2|D#4 B3 D#4:2 D4 A#3 D4:2|A3 B3 C4 D4 E4 C4 E4 A4|G4 E4 C4 E4 A4:4|E4 F#4 G#4 A4 B4 G#4 B4:2|C5 G#4 C5:2 B4 G#4 B4:2|E4 F#4 G#4 A4 B4 G#4 B4 E5|D5 B4 G#4 B4 D5:4',
  c:'Am B7 Am E Am B7 Am Am E E E E'},
 {id:'gymno',title:'Gymnopédie No. 1',by:'Satie',bpm:72,unit:1,bar:3,mel:'piano',acc:'gymno',
  m:'r:3|r:3|r:3|r:3|r F#5 A5|G5 F#5 C#5|B4 C#5 D5|A4:3|F#4:3|F#4:3|F#4:3|F#4:3|r F#5 A5|G5 F#5 C#5|B4 C#5 D5|A4:3|C#5:3|F#5:3|E5:3|E5:3',
  c:'Gmaj7 Dmaj7 Gmaj7 Dmaj7 Gmaj7 Dmaj7 Gmaj7 Dmaj7 Gmaj7 Dmaj7 Gmaj7 Dmaj7 Gmaj7 Dmaj7 Gmaj7 Dmaj7 Gmaj7 Dmaj7 Gmaj7 Dmaj7'},
 {id:'turca',title:'Rondo alla Turca',by:'Mozart',bpm:120,unit:0.25,bar:8,mel:'piano',acc:'alberti',
  m:'B4 A4 G#4 A4 C5:4|D5 C5 B4 C5 E5:4|F5 E5 D#5 E5 B5 A5 G#5 A5|B5 A5 G#5 A5 C6:4|A5:2 C6:2 B5:2 A5:2|G#5:2 A5:2 B5:2 A5:2|G#5:2 A5:2 B5:2 A5:2|G#5:2 F#5:2 E5:4',
  c:'Am Am Am Am Am E Am E'},
 {id:'danube',title:'The Blue Danube',by:'J. Strauss II',bpm:150,unit:1,bar:3,mel:'reed',acc:'waltz',
  m:'r D4 D4|F#4 A4:2|r A5 A5|r F#5 F#5|D4 D4 F#4|A4:3|r A5 A5|r G5 G5|C#4 C#4 E4|B4:3|r B5 B5|r G5 G5|C#4 C#4 E4|B4:3|r B5 B5|r F#5 F#5|D4 D4 F#4|A4:3|r D6 D6|r A5 A5|D4 D4 F#4|A4:3|r D6 D6|r B5 B5|E4 E4 G4|B4:3|B4:2 G#4|A4:3|F#4 A4 D5|D5:3',
  c:'D D D D D D A7 A7 A7 A7 A7 A7 A7 A7 D D D D D D D D G G G G E7 A7 D D'},
 {id:'largo',title:'Largo, "New World"',by:'Dvořák',bpm:56,unit:0.5,bar:8,mel:'flute',acc:'pad',
  m:'F#4:3 A4 A4:4|F#4:3 E4 D4:4|E4:2 F#4:2 A4:2 F#4:2|E4:8|F#4:3 A4 A4:4|F#4:3 E4 D4:4|E4:2 F#4:2 E4:2 D4:2|D4:8',
  c:'D D A A D D A D'},
 {id:'jesu',title:'Jesu, Joy of Man\'s Desiring',by:'J. S. Bach',bpm:64,unit:1/3,bar:9,mel:'flute',acc:'arp3',
  m:'G4 A4 B4 D5 C5 C5 E5 D5 D5|G5 F#5 G5 D5 B4 G4 A4 B4 C5|D5 E5 D5 C5 B4 A4 B4 G4 F#4|G4 A4 D4 F#4 A4 C5 B4 A4 B4|G4 A4 B4 D5 C5 C5 E5 D5 D5|G5 F#5 G5 D5 B4 G4 A4 B4 C5|D5 E5 D5 C5 B4 A4 B4 G4 F#4|E4 F#4 G4 D4 F#4 A4 G4:3',
  c:'G:1 C:1 G:1 G:2 D:1 G:1 D:1 G:1 G:1 D:1 G:1 G:1 C:1 G:1 G:2 D:1 G:1 D:1 G:1 C:1 D:1 G:1'}];
const NOTE_PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const Classical={active:null,genUntil:0,last:'',block:new Set(),
  loadBlock(){try{this.block=new Set(JSON.parse(localStorage.getItem('trein.musicBlock')||'[]'));}catch(e){this.block=new Set();}},
  saveBlock(){try{localStorage.setItem('trein.musicBlock',JSON.stringify([...this.block]));}catch(e){}},
  midi(t){const m=/^([A-G])(#|b)?(-?\d)$/.exec(t);if(!m)return null;return NOTE_PC[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0)+12*(+m[3]+1);},
  chord(s){if(s==='N')return null;const m=/^([A-G])(#|b)?(maj7|m7|m|7|dim)?$/.exec(s);if(!m)return null;const r=NOTE_PC[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0);const q=m[3]||'';
    const iv=q==='m'?[0,3,7]:q==='7'?[0,4,7,10]:q==='maj7'?[0,4,7,11]:q==='m7'?[0,3,7,10]:q==='dim'?[0,3,6]:[0,4,7];return{r,iv};},
  /* the whole piece as timed note events (in units): melody, then bass and accompaniment from the chords */
  build(pc){const ev=[],tok=s=>s.replace(/\|/g,' ').trim().split(/\s+/).filter(Boolean),o=pc.oct||0;let u=0;
    for(const t of tok(pc.m)){const [n,l]=t.split(':'),len=l?+l:1;if(n!=='r'){const m=this.midi(n);if(m!=null)ev.push({u,len,m:m+o,k:pc.mel,v:0.24});}u+=len;}
    const total=u,B=pc.bar,upb=1/pc.unit,beat=Math.max(1,Math.round(upb));let cu=pc.pick||0;
    for(const t of tok(pc.c)){const [n,l]=t.split(':'),len=l?+l*beat:B,ch=this.chord(n);if(ch)this.acc(ev,pc,ch,cu,len,beat);cu+=len;}
    ev.sort((a,b)=>a.u-b.u);return{ev,total:Math.max(total,cu)};},
  acc(ev,pc,ch,u0,len,beat){const at=(o,i)=>ch.r+ch.iv[i%ch.iv.length]+12*(o+Math.floor(i/ch.iv.length)),bass=ch.r+36+(ch.r>4?0:12),push=(u,l,m,k,v)=>{if(u<u0+len-1e-6)ev.push({u,len:l,m,k,v});};
    const A=pc.acc;
    if(A==='waltz'){for(let b=0;b<len;b+=beat){const bi=Math.round(b/beat)%3;if(bi===0)push(u0+b,beat,bass,'bass',0.34);else for(let i=0;i<3;i++)push(u0+b,beat*0.8,at(4,i),pc.mel==='box'?'box':'piano',0.07);}}
    else if(A==='alberti'){const st=Math.max(1,Math.round(beat/2)),pat=[0,2,1,2];let k=0;push(u0,len,bass,'bass',0.3);for(let b=0;b<len;b+=st,k++)push(u0+b,st,at(4,pat[k%4]),'piano',0.08);}
    else if(A==='elise'){push(u0,1,ch.r+36+(ch.r>4?0:12),'piano',0.18);push(u0+1,1,ch.r+43+(ch.r>4?0:12),'piano',0.12);push(u0+2,1,ch.r+48+(ch.r>4?0:12),'piano',0.12);}
    else if(A==='pulse'){for(let b=0;b<len;b+=beat){push(u0+b,beat*0.5,b%(beat*2)===0?bass:bass+7,'bass',0.28);for(let i=0;i<3;i++)push(u0+b+beat/2,beat*0.4,at(4,i),'reedS',0.05);}}
    else if(A==='arp'){push(u0,len,bass,'bass',0.26);const st=Math.max(1,Math.round(beat/2));let k=0;for(let b=0;b<len;b+=st,k++)push(u0+b,st*2,at(3,[0,1,2,3,2,1][k%6]),'pluck',0.1);}
    else if(A==='arp3'){push(u0,len,bass,'bass',0.24);let k=0;for(let b=0;b<len;b+=1,k++)push(u0+b,2,at(3,[0,1,2][k%3]+(k%6>=3?3:0)),'pluck',0.08);}
    else if(A==='pad'){push(u0,len,bass,'bass',0.22);ev.push({u:u0,len,pad:ch.iv.slice(0,3).map(q=>ch.r+q+48)});}
    else if(A==='stacc'){for(let b=0;b<len;b+=beat)push(u0+b,beat*0.4,(b/beat)%2?bass+7:bass,'bass',0.32);}
    else if(A==='gymno'){push(u0,beat*3,ch.r+(ch.r>4?31:43)-12,'bass',0.3);const ns=ch.iv.slice(1).map(q=>ch.r+q+(ch.r>4?43:55)-12);for(const m of ns)push(u0+beat,beat*2,m,'piano',0.06);}},
  items(){return[...Object.keys(MSTYLES).map(k=>({id:'gen:'+k,name:{pastoral:'Pastoral',waltz:'Folk waltz',piano:'Piano',musicbox:'Music box',ambient:'Ambient'}[k]||k,gen:true})),...PIECES.map(p=>({id:'pc:'+p.id,name:p.title,by:p.by,p}))];},
  allowedPieces(){return PIECES.filter(p=>!this.block.has('pc:'+p.id));},
  genAllowed(st){return!this.block.has('gen:'+st);},
  /* starts a piece (a given one, or the next unblocked one at random, not the last again) */
  start(pc,t0){const M=Music,L=this.allowedPieces();if(!pc){if(!L.length)return false;const c=L.filter(p=>p.id!==this.last);pc=(c.length?c:L)[Math.floor(Math.random()*(c.length?c.length:L.length))];}
    const b=this.build(pc);this.active={pc,ev:b.ev,total:b.total,i:0,t0:t0||M.ctx.currentTime+0.4,rep:0,reps:pc.bar*Math.ceil(b.total/pc.bar)<64?2:1};this.last=pc.id;
    M.revG.gain.setTargetAtTime(0.4,M.ctx.currentTime,1);M.lp.frequency.setTargetAtTime(7000,M.ctx.currentTime,1);Log.info(`music: ${pc.title} (${pc.by})`);MusicMgr.refresh();return true;},
  stop(){this.active=null;MusicMgr.refresh();},
  /* schedules the notes falling in the next 0.3 s; at the end, plays it once more (short pieces) or hands back to the generated music */
  tick(now){const A=this.active,M=Music;if(!A)return;const us=60/(A.pc.bpm*P.musicTempo)*A.pc.unit;
    if(A.t0<now-0.5){A.t0=now+0.1;A.i=0;}/* the clock ran ahead (tab hidden): start the round again */
    while(true){if(A.i>=A.ev.length){const end=A.t0+A.total*us;if(end>now+0.3)break;A.rep++;if(A.rep<A.reps){A.t0=end+us*2;A.i=0;continue;}this.active=null;this.genUntil=now+(P.musicMix==='mix'?100+Math.random()*80:2);M.nextT=end+1.5;M.step=0;M.bar=0;MusicMgr.refresh();return;}
      const e=A.ev[A.i],t=A.t0+e.u*us;if(t>now+0.3)break;A.i++;if(t<now-0.05)continue;
      if(e.pad)M.pad(t,e.pad.map(m=>M.hz(m)),e.len*us);else M.inst(e.k,t,M.hz(e.m),e.v,e.len*us*0.95);}},
  /* called by the generated music at each new phrase: time for a piece? */
  want(now){const mix=P.musicMix;if(mix==='gen')return false;if(!this.allowedPieces().length)return false;if(mix==='classical')return true;
    const anyGen=Object.keys(MSTYLES).some(k=>this.genAllowed(k));return!anyGen||now>this.genUntil;}};
// ---- the music manager: now playing, skip, the mix, and every generated preset and piece with a switch (on = may play) and ▶ (play now)
const MusicMgr={el:null,
  open(){if(!this.el){const d=this.el=document.createElement('div');d.id='musicMgr';d.hidden=true;document.body.appendChild(d);}this.el.hidden=false;this.render();},
  close(){if(this.el)this.el.hidden=true;},
  refresh(){if(this.el&&!this.el.hidden)this.render();},
  now(){const A=Classical.active;return A?`${A.pc.title} · ${A.pc.by}`:Music.started?`Generated: ${({pastoral:'Pastoral',waltz:'Folk waltz',piano:'Piano',musicbox:'Music box',ambient:'Ambient'})[Music.style]||Music.style}`:'Not playing (turn the sound on)';},
  render(){const d=this.el,it=Classical.items(),row=q=>`<div class="mm-it${Classical.block.has(q.id)?' off':''}"><label><input type="checkbox" data-id="${q.id}" ${Classical.block.has(q.id)?'':'checked'}><span>${esc(q.name)}${q.by?`<small>${esc(q.by)}</small>`:''}</span></label><button data-play="${q.id}" aria-label="Play now">▶</button></div>`;
    d.innerHTML=`<div class="mg-h"><b>Music</b><button data-a="x" aria-label="Close">✕</button></div><div class="mg-now">♪ ${esc(this.now())}<button data-a="skip">⏭ Skip</button></div>
      <label class="mg-mix">What plays<select data-a="mix">${PDEF.musicMix.options.map(([v,l])=>`<option value="${v}"${P.musicMix===v?' selected':''}>${l}</option>`).join('')}</select></label>
      <div class="mg-s">Generated presets</div>${it.filter(q=>q.gen).map(row).join('')}<div class="mg-s">Classical</div>${it.filter(q=>!q.gen).map(row).join('')}
      <p class="mg-n">Untick a preset or piece to block it. ▶ plays it now. The pieces are public-domain works played on the game's own synth.</p>`;
    d.querySelector('[data-a="x"]').onclick=()=>this.close();
    d.querySelector('[data-a="skip"]').onclick=()=>{if(!Music.started){UI.toast('Turn the sound on first');return;}if(Classical.active){Classical.active=null;Classical.genUntil=Music.ctx.currentTime+60;Music.nextT=Music.ctx.currentTime+0.3;Music.step=0;Music.bar=0;}else{Music.forceNew=true;if(P.musicMix!=='gen')Classical.start(null,Music.ctx.currentTime+0.3);}this.render();};
    d.querySelector('[data-a="mix"]').onchange=e=>{P.musicMix=e.target.value;UI.refresh&&UI.refresh('musicMix');if(P.musicMix==='gen'&&Classical.active)Classical.stop();this.render();};
    for(const c of d.querySelectorAll('input[data-id]'))c.onchange=()=>{const id=c.dataset.id;if(c.checked)Classical.block.delete(id);else Classical.block.add(id);Classical.saveBlock();if(!c.checked&&Classical.active&&id==='pc:'+Classical.active.pc.id)Classical.stop();if(!c.checked&&id==='gen:'+Music.style)Music.forceNew=true;this.render();};
    for(const b of d.querySelectorAll('button[data-play]'))b.onclick=()=>{if(!Music.started){if(!Sfx.on){Sfx.toggle&&Sfx.toggle();}}if(!Music.started){UI.toast('Turn the sound on first');return;}const id=b.dataset.play;
      if(id.startsWith('pc:')){Classical.start(PIECES.find(p=>'pc:'+p.id===id),Music.ctx.currentTime+0.3);}else{Classical.active=null;Music.pin={st:id.slice(4),until:Music.ctx.currentTime+150};Music.forceNew=true;Classical.genUntil=Music.ctx.currentTime+150;Music.nextT=Music.ctx.currentTime+0.3;Music.step=0;Music.bar=0;}this.render();};}};
Classical.loadBlock();
