'use strict';
// ===== pad.js
// ===================================================================
// GAME CONTROLLER everywhere (4.45.0). One reader for the Gamepad API that every mode uses:
//  - a virtual controller (Pad.vp) in the standard button order, after the player's own remapping (Settings > Controller), with
//    digital triggers (the GameSir X5 Lite, Switch pads) ramped up while held so gas and brake still feel analogue;
//  - presets for the button names shown in the hints (Xbox, GameSir, PlayStation, Nintendo; "Automatic" picks from the pad's name);
//  - per-mode mappings: the world view and building (sticks move the camera, A taps the ground under the crosshair, hold A to draw
//    track), the map, the boat, and menus and panels (D-pad moves a highlight, A presses, B closes, LB/RB switch tabs, right stick
//    scrolls). Flying and driving keep their own mappings (PlanePad in plane.js, RoadVeh.padPoll) and read the same virtual pad;
//  - a hint strip that always shows what the buttons do in the current mode.
// ===================================================================
const PAD_BTN=['A','B','X','Y','LB','RB','LT','RT','View','Menu','LS','RS','Up','Down','Left','Right','Home'];
const PAD_PRESETS={
  xbox:{name:'Xbox / standard',labels:null,digital:false},
  gamesir:{name:'GameSir X5 Lite (digital triggers)',labels:null,digital:true},
  ps:{name:'PlayStation',labels:{A:'✕',B:'○',X:'□',Y:'△',LB:'L1',RB:'R1',LT:'L2',RT:'R2',View:'Share',Menu:'Options',LS:'L3',RS:'R3'},digital:false},
  switch:{name:'Nintendo (Switch layout)',labels:{A:'B',B:'A',X:'Y',Y:'X',LB:'L',RB:'R',LT:'ZL',RT:'ZR',View:'−',Menu:'+'},digital:true}};
def('padPreset',{tab:'pad',label:'Controller type (button names, triggers)',kind:'select',options:[['auto','Automatic (from the controller name)'],...Object.entries(PAD_PRESETS).map(([k,v])=>[k,v.name])],def:'auto',apply:'live'});
def('padHints',{tab:'pad',label:'Show what the buttons do (hint strip)',kind:'check',def:1,apply:'live'});
def('padCam',{tab:'pad',label:'Camera speed with the sticks',min:0.3,max:3,step:0.1,def:1,unit:'×',apply:'live'});
def('padInvY',{tab:'pad',label:'Invert the right stick up/down (camera tilt)',kind:'check',def:0,apply:'live'});
def('padDead',{tab:'pad',label:'Stick dead zone',min:0.04,max:0.35,step:0.01,def:0.12,apply:'live'});
def('padRamp',{tab:'pad',label:'Digital triggers: time from 0 to full',min:0,max:1.5,step:0.05,def:0.5,unit:' s',apply:'live'});

const Pad={vp:null,raw:null,prev:[],map:null,trig:[0,0],last:-1e9,mode:'',fe:null,focusOn:false,rep:{},held:null,hintKey:'',capt:null,
  now(){return performance.now()/1000;},
  preset(){let k=P.padPreset;if(k==='auto'){const id=(this.raw&&this.raw.id)||'';k=/gamesir/i.test(id)?'gamesir':/054c|playstation|dualsense|dualshock|wireless controller/i.test(id)?'ps':/057e|nintendo|pro controller|joy-con/i.test(id)?'switch':'xbox';}return PAD_PRESETS[k]?k:'xbox';},
  lab(b){const L=PAD_PRESETS[this.preset()].labels;return(L&&L[b])||b;},
  loadMap(){try{this.map=JSON.parse(localStorage.getItem('trein.padmap')||'null');}catch(e){this.map=null;}if(!Array.isArray(this.map)||this.map.length!==PAD_BTN.length)this.map=PAD_BTN.map((_,i)=>i);},
  saveMap(){try{localStorage.setItem('trein.padmap',JSON.stringify(this.map));}catch(e){}},
  gp(){if(!navigator.getGamepads)return null;let any=null;for(const q of navigator.getGamepads()){if(!q||!q.connected)continue;if(q.mapping==='standard')return q;any=any||q;}return any;},
  // the virtual controller: buttons in the standard order after remapping; trigger values ramped on digital pads; raw axes
  read(dt){const g=this.gp();this.raw=g;if(!g){this.vp=null;return null;}if(!this.map)this.loadMap();
    const bv=i=>{const b=g.buttons[i];return b?(typeof b==='object'?(b.value||(b.pressed?1:0)):+b):0;},dig=PAD_PRESETS[this.preset()].digital;
    const B=this.map.map(p=>({pressed:bv(p)>0.5,value:bv(p)}));
    for(const [k,t] of [[6,0],[7,1]]){const r=+P.padRamp||0;if(dig&&r>0){this.trig[t]=B[k].pressed?Math.min(1,this.trig[t]+dt/r):0;B[k].value=this.trig[t];}}
    this.vp={id:g.id,axes:[0,1,2,3].map(i=>g.axes[i]||0),buttons:B};
    if(B.some(b=>b.pressed)||this.vp.axes.some(a=>Math.abs(a)>0.3))this.last=this.now();return this.vp;},
  active(){return!!this.vp&&this.now()-this.last<20;},
  ax(i){const v=this.vp?this.vp.axes[i]:0,dz=+P.padDead||0.12;return Math.abs(v)<dz?0:(v-Math.sign(v)*dz)/(1-dz);},
  pr(i){return!!(this.vp&&this.vp.buttons[i]&&this.vp.buttons[i].pressed);},
  ed(i){return this.pr(i)&&!this.prev[i];},
  // a direction press with auto-repeat (D-pad or a stick pushed in menus): first at once, then after 0.4 s every 0.12 s
  rp(key,on){const t=this.now(),r=this.rep[key];if(!on){delete this.rep[key];return false;}if(!r){this.rep[key]={t:t+0.4};return true;}if(t>=r.t){r.t=t+0.12;return true;}return false;},

  // ---- which mode the controller is in
  panelRoot(){const vis=e=>e&&!e.hidden&&e.getClientRects().length&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden';
    for(const s of ['#padRemap','#misDone','#mainMenu','#panel.open','#storePage','#fleetPanel','#statsPanel','#musicMgr','#rsBoard','#airMis','#plChoose','#vPanel','#busPanel','#rvPanel:not(.min)','#fbPanel','#skySheet']){const e=document.querySelector(s);if(vis(e))return e;}
    if(Plane.on&&Plane.paused){const e=$('#planeUI');if(vis(e))return e;}return null;},
  modeNow(){if(this.capt)return'capture';const pr=this.panelRoot();if(pr)return'ui';if(this.focusOn)return'ui';if(Plane.on)return'fly';if(typeof RoadVeh!=='undefined'&&RoadVeh.drv)return'drive';
    if(typeof Fish!=='undefined'&&Fish.drv)return'boat';if(typeof MapView!=='undefined'&&MapView.on)return'map';if(Build.active)return'build';if(Drive.active)return'trains';return'world';},

  // ---- called once a frame by the main loop
  tick(dt){const vp=this.read(dt);if(!vp){this.hints('');this.cross(false);return;}
    const m=this.modeNow();if(m!==this.mode){this.mode=m;if(m!=='ui')this.setFocus(null);}
    if(m==='capture')this.captureStep();else if(m==='ui')this.uiStep(dt);else if(m==='world'||m==='build'||m==='map'||m==='trains')this.worldStep(dt,m);else if(m==='boat')this.boatStep(dt);
    this.prev=vp.buttons.map(b=>b.pressed);this.hints(m);this.cross((m==='world'||m==='build'||m==='map'||m==='trains')&&this.active());},

  // ---- the world view, building, the map and the train controls: the camera on the sticks, the crosshair for taps
  worldStep(dt,m){const sp=(+P.padCam||1),lx=this.ax(0),ly=this.ax(1),rx=this.ax(2),ry=this.ax(3)*(+P.padInvY?-1:1);
    if(lx||ly){Cam.anim=null;camPan(-lx*dt*620*sp,-ly*dt*620*sp);}
    if(rx)Cam.yaw+=rx*dt*1.9*sp;if(ry)Cam.pitch=clamp(Cam.pitch+ry*dt*1.1*sp,-0.2,1.55);
    const zin=this.vp.buttons[7].value,zout=this.vp.buttons[6].value;if(zin>0.05||zout>0.05){Cam.anim=null;Cam.dist=clamp(Cam.dist*Math.exp((zout-zin)*dt*1.8*sp),8,typeof MapView!=='undefined'&&MapView.on&&App.T?App.T.W*2.4:7000);}
    // A: a tap on the ground under the crosshair; held in building it draws (the crosshair is the finger)
    if(this.ed(0))this.ptr('pointerdown');else if(this.pr(0)&&this.held)this.ptr('pointermove');else if(!this.pr(0)&&this.held)this.ptr('pointerup');
    if(this.ed(12)||this.ed(13)||this.ed(14)||this.ed(15)){this.focusOn=true;this.uiStep(dt,true);return;}/* the D-pad: the highlight goes to the buttons on screen */
    if(m==='build'){if(this.ed(1))$('#btnDone').click();if(this.ed(2))$('#btnUndo').click();if(this.ed(3)){const pl=$('#pPlace');if(pl&&pl.offsetParent)pl.click();}
      if(this.ed(4)||this.ed(5))this.cycle('#buildBar [data-btab]',this.ed(5)?1:-1);if(this.ed(9))$('#btnDone').click();}
    else if(m==='map'){if(this.ed(1)||this.ed(8))$('#mapClose').click();if(this.ed(4)||this.ed(5))this.cycle('#mapTabs button',this.ed(5)?1:-1);}
    else if(m==='trains'){if(this.ed(1)&&Drive.exit)Drive.exit();}
    else{if(this.ed(3))$('#btnBuild').click();if(this.ed(2))$('#btnDrive').click();if(this.ed(8))$('#btnMap').click();if(this.ed(9))$('#btnHome').click();if(this.ed(4))$('#btnSky').click();if(this.ed(5))$('#btnFF').click();}},
  // synthetic pointer events at the screen centre on the 3D view: the game handles them exactly like a finger
  ptr(type){const cv=$('#gl');if(!cv)return;const r=cv.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
    if(type==='pointerdown')this.held={t:this.now()};if(type==='pointerup')this.held=null;
    try{cv.dispatchEvent(new PointerEvent(type,{clientX:x,clientY:y,pointerId:77,pointerType:'touch',isPrimary:true,button:0,buttons:type==='pointerup'?0:1,bubbles:true,cancelable:true}));}catch(e){}},
  cycle(sel,d){const L=[...document.querySelectorAll(sel)].filter(e=>e.offsetParent);if(!L.length)return;let i=L.findIndex(e=>e.classList.contains('on')||e.classList.contains('sel')||e.getAttribute('aria-selected')==='true');L[((i<0?0:i+d)%L.length+L.length)%L.length].click();},

  // ---- the boat: left stick steers, RT/LT ahead and astern (or the left stick up/down), A nets, X sell, B camera, Y leave
  boatStep(dt){const I=Fish.inp,lx=this.ax(0),ly=this.ax(1),g=this.vp.buttons[7].value,b=this.vp.buttons[6].value;
    if(lx||this.act_s){I.steer=lx;this.act_s=!!lx;}if(g>0.05||b>0.05){I.thr=clamp(g-b,-0.5,1);this.act_t=true;}else if(ly){I.thr=clamp(I.thr-ly*dt*0.8,-0.5,1);}else if(this.act_t){this.act_t=false;}
    const click=a=>{const e=document.querySelector(`#fbUI [data-a="${a}"]`);if(e&&e.offsetParent)e.click();};if(this.ed(0))click('net');if(this.ed(2))click('sell');if(this.ed(1))click('cam');if(this.ed(3))click('x');},

  // ---- menus and panels: a highlight moved with the D-pad (or the left stick), A presses, B closes, LB/RB tabs, right stick scrolls
  focusables(root){const L=[];for(const e of (root||document).querySelectorAll('button,input,select,[role=button],.vlabel,a[href]')){if(e.disabled||e.closest('[hidden]'))continue;if(!root&&(e.closest('#panel:not(.open)')||e.closest('#buildBar[hidden]')))continue;
      const r=e.getBoundingClientRect();if(r.width<4||r.height<4||r.right<0||r.bottom<0||r.left>innerWidth||r.top>innerHeight)continue;const st=getComputedStyle(e);if(st.visibility==='hidden'||+st.opacity===0||st.pointerEvents==='none'&&e.tagName!=='BUTTON')continue;L.push(e);}return L;},
  setFocus(e){if(this.fe&&this.fe!==e)this.fe.classList.remove('padfocus');this.fe=e;if(e){e.classList.add('padfocus');try{e.scrollIntoView({block:'nearest',inline:'nearest'});}catch(err){}}else this.focusOn=false;},
  move(dx,dy,L){const c=this.fe&&L.includes(this.fe)?this.fe:null;if(!c){this.setFocus(L[0]||null);return;}const a=c.getBoundingClientRect(),ax=a.left+a.width/2,ay=a.top+a.height/2;let best=null,bs=1e9;
    for(const e of L){if(e===c)continue;const r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,vx=x-ax,vy=y-ay,along=vx*dx+vy*dy;if(along<=4)continue;const side=Math.abs(vx*dy-vy*dx),s=along+side*2.2;if(s<bs){bs=s;best=e;}}
    if(best)this.setFocus(best);},
  uiStep(dt,first){const root=this.panelRoot(),L=this.focusables(root);if(!L.length){this.setFocus(null);return;}if(!this.fe||!L.includes(this.fe))this.setFocus(this.lastFe&&L.includes(this.lastFe)?this.lastFe:L[0]);
    const lx=this.ax(0),ly=this.ax(1),fe=this.fe,range=fe&&fe.tagName==='INPUT'&&fe.type==='range',sel=fe&&fe.tagName==='SELECT';
    const dirs=[['u',12,0,-1,ly<-0.5],['d',13,0,1,ly>0.5],['l',14,-1,0,lx<-0.5],['r',15,1,0,lx>0.5]];
    for(const [k,b,dx,dy,st] of dirs){if(!this.rp(k,this.pr(b)||st))continue;if(first&&!this.pr(b))continue;
      if(dx&&(range||sel)){this.nudge(fe,dx);continue;}this.move(dx,dy,L);}
    const rs=this.ax(3);if(rs&&root){const sc=root.matches('#panel.open')?root.querySelector('.sections')||root:root;sc.scrollTop+=rs*dt*700;}
    if(this.ed(0)&&this.fe){const e=this.fe;if(e.tagName==='INPUT'&&(e.type==='checkbox'||e.type==='radio'))e.click();else if(e.tagName==='SELECT')this.nudge(e,1);else if(!range){e.click();if(e.focus&&e.tagName==='INPUT')e.focus();}if(!root){this.lastFe=e;this.setFocus(null);}}/* a button on the open screen (the bar, a tool): back to the camera after pressing it */
    if(this.ed(1))this.back(root);
    if(this.ed(4)||this.ed(5)){const d=this.ed(5)?1:-1;if(root&&root.id==='panel')this.cycle('#tabs button',d);else if(Build.active)this.cycle('#buildBar [data-btab]',d);else if(typeof MapView!=='undefined'&&MapView.on)this.cycle('#mapTabs button',d);}},
  nudge(e,d){if(e.tagName==='SELECT'){const n=e.options.length;e.selectedIndex=((e.selectedIndex+d)%n+n)%n;}else{const st=+e.step||((+e.max-+e.min)/100);e.value=clamp(+e.value+d*st,+e.min,+e.max);}
    e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));},
  // B: the panel's own close button, else leave the highlight
  back(root){if(!root){this.setFocus(null);return;}if(root.id==='planeUI'){$('#plResume')&&$('#plResume').click();return;}
    const c=root.querySelector('#btnClose,#skyClose,#vpX,#mapClose,[data-a="x"],[data-k="x"],.close,button[aria-label="Close"]')||[...root.querySelectorAll('button')].find(b=>/^\s*(✕|×|Close|Done|Continue)\b/.test(b.textContent));
    if(c)c.click();else root.hidden=true;this.setFocus(null);},

  // ---- the hint strip: what each button does right now
  HINTS:{world:[['LS','move'],['RS','turn / tilt'],['LT','zoom out'],['RT','zoom in'],['A','tap'],['D-pad','buttons'],['Y','build'],['X','trains'],['View','map'],['Menu','menu'],['LB','sky'],['RB','speed']],
    build:[['LS','move'],['RS','turn'],['LT/RT','zoom'],['A','tap · hold to draw'],['X','undo'],['Y','place piece'],['LB/RB','track / stations / roads'],['D-pad','pick tools'],['B','done']],
    map:[['LS','move'],['LT/RT','zoom'],['A','select'],['LB/RB','tabs'],['B','close']],
    trains:[['LS','move'],['LT/RT','zoom'],['A','tap'],['D-pad','controls'],['B','close']],
    ui:[['D-pad','choose'],['A','press'],['B','back / close'],['←→','slider / list'],['LB/RB','tabs'],['RS','scroll']],
    boat:[['LS','steer'],['RT','ahead'],['LT','astern'],['A','nets'],['X','sell'],['B','camera'],['Y','leave']],
    drive:[['LS','steer'],['RT','gas'],['LT','brake'],['A','horn'],['B','camera'],['X','hop'],['Y','get out']],
    fly:[['LS','throttle / rudder'],['RS','pitch / roll'],['LT','brakes'],['A','gear'],['B','camera'],['X','flaps'],['Y','assist'],['Menu','pause'],['View','reset']],
    heli:[['LS','collective / pedals'],['RS','cyclic'],['D-pad ↓↑','winch'],['B','camera'],['Y','assist'],['Menu','pause']],
    capture:[['any button','assign'],['wait','skip']]},
  hints(m){let el=$('#padHints');const show=m&&+P.padHints&&this.active();const k=m==='fly'&&Plane.kind==='heli'?'heli':m==='fly'&&Plane.kind==='cl415'?'fly415':m;
    if(!show){if(el)el.hidden=true;return;}if(!el){el=document.createElement('div');el.id='padHints';document.body.appendChild(el);}
    const key=k+'|'+this.preset();if(this.hintKey!==key){this.hintKey=key;let H=this.HINTS[k==='fly415'?'fly':k]||[];if(k==='fly415')H=[...H.slice(0,3),['RB','drop water'],...H.slice(3)];
      const nm=s=>s.split('/').map(x=>PAD_BTN.includes(x)?this.lab(x):x).join('/');el.innerHTML=H.map(([b,t])=>`<span><b>${esc(nm(b))}</b>${esc(t)}</span>`).join('');}
    el.hidden=false;el.classList.toggle('low',m==='fly'||m==='drive'||m==='boat');},
  cross(on){let el=$('#padCross');if(!on){if(el)el.hidden=true;return;}if(!el){el=document.createElement('div');el.id='padCross';document.body.appendChild(el);}el.hidden=false;el.classList.toggle('held',!!this.held);},

  // ---- remapping (Settings > Controller > Remap buttons): press the button you want for each action in turn
  openRemap(){let el=$('#padRemap');if(!el){el=document.createElement('div');el.id='padRemap';document.body.appendChild(el);
      el.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;const a=t.dataset.a;if(a==='x'){el.hidden=true;this.capt=null;}else if(a==='reset'){this.map=PAD_BTN.map((_,i)=>i);this.saveMap();this.renderRemap();}else if(a==='set'){this.capt={i:+t.dataset.i,t:this.now()};this.renderRemap();}});}
    if(!this.map)this.loadMap();el.hidden=false;this.renderRemap();},
  renderRemap(){const el=$('#padRemap');if(!el)return;const g=this.gp();
    el.innerHTML=`<div class="rv-h"><div><b>🎮 Remap buttons</b><span>${g?esc(g.id.slice(0,48)):'No controller connected: press a button on it'}</span></div><button data-a="x">✕</button></div>`+
      `<div class="pr-list">${PAD_BTN.map((b,i)=>`<button data-a="set" data-i="${i}" class="${this.capt&&this.capt.i===i?'on':''}"><b>${esc(this.lab(b))}</b><span>${this.capt&&this.capt.i===i?'press a button…':'button '+this.map[i]+(this.map[i]!==i?' (changed)':'')}</span></button>`).join('')}</div>`+
      `<div class="pr-f"><span>Choose an action, then press the controller button that should do it.</span><button data-a="reset">Reset to standard</button></div>`;},
  captureStep(){const g=this.raw,c=this.capt;if(!g){return;}if(this.now()-c.t>8){this.capt=null;this.renderRemap();return;}if(this.now()-c.t<0.3)return;
    for(let p=0;p<g.buttons.length;p++){const b=g.buttons[p],on=b&&(typeof b==='object'?b.pressed:b>0.5);if(on&&!this._cprev[p]){this.map[c.i]=p;this.saveMap();this.capt=null;this.renderRemap();UI.toast(`${this.lab(PAD_BTN[c.i])} → controller button ${p}`);break;}}
    this._cprev=g.buttons.map(b=>b&&(typeof b==='object'?b.pressed:b>0.5));},
  _cprev:[],
  // the Remap button in Settings > Controller (added once the settings are built)
  init(){const add=()=>{const s=document.querySelector('.sec[data-tab="pad"]');if(!s){setTimeout(add,500);return;}if(s.querySelector('.padRemapB'))return;
      const d=document.createElement('div');d.className='actions';d.innerHTML='<button class="padRemapB">🎮 Remap buttons…</button><button class="padTestB">Show the hints now</button>';s.insertBefore(d,s.children[1]||null);
      d.querySelector('.padRemapB').onclick=()=>this.openRemap();d.querySelector('.padTestB').onclick=()=>{this.last=this.now();UI.toast(this.gp()?'Controller: '+this.gp().id.slice(0,40):'No controller found: press a button on it first');};};add();
    addEventListener('gamepadconnected',e=>{this.last=this.now();UI.toast(`🎮 Controller connected (${PAD_PRESETS[this.preset()].name}). The strip at the top shows what the buttons do; change it in Settings › Controller`);});}};
Pad.init();
