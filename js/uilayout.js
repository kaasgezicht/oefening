'use strict';
// ===== uilayout.js
// ===================================================================
// UI LAYOUT — every on-screen control group can be moved and sized, separately for portrait and landscape (Settings > UI, or
// Edit layout to drag them on the screen). Moving and sizing use the CSS translate and scale properties, which stack on whatever
// transform the element already has, so the normal layout rules stay as they are. Text scales with an element's size; the Text size
// slider scales all UI text on top of that (every font size in the stylesheet is written as size × var(--txt)).
// ===================================================================
const UI_EL=[
  ['hud','#hud','Info: name, clock and money','left top'],
  ['corner','#cornerBox','Time, speed and sound buttons','right top'],
  ['bar','#bar','Main buttons (bottom)','center bottom'],
  ['notes','#upNotes','Notifications','right top'],
  ['build','#buildBar','Build menu','center bottom'],
  ['drive','#driveBar','Train controls','center bottom'],
  ['panels','#vPanel,#rvPanel,#busPanel,#airUI,#airMis','Info panels (village, bus, airstrip)','center bottom'],
  ['toast','#toast','Messages','center bottom'],
  ['compass','#compass','Compass','center top'],
  ['plTop','#plTop','Plane: buttons','left top'],
  ['plLeft','#plLeft','Plane: throttle','left bottom'],
  ['plRight','#plRight','Plane: stick and rudder','right bottom'],
  ['rvTop','#rvTop','Driving: buttons','left top'],
  ['rvStick','#rvStickWrap','Driving: joystick','right bottom']];
def('uiText',{tab:'ui',label:'Text size (all UI text)',min:0.6,max:1.8,step:0.05,def:1,apply:'live'});
for(const [k,,label] of UI_EL)for(const [o,on] of [['p','portrait'],['l','landscape']]){
  def(`ui_${k}_${o}x`,{tab:'ui',label:`left / right (${on})`,head:o==='p'?label:null,min:-600,max:600,step:1,def:0,unit:' px',apply:'live'});
  def(`ui_${k}_${o}y`,{tab:'ui',label:`up / down (${on})`,min:-600,max:600,step:1,def:0,unit:' px',apply:'live'});
  def(`ui_${k}_${o}s`,{tab:'ui',label:`size (${on})`,min:0.5,max:2,step:0.05,def:1,unit:'×',apply:'live'});}
const UILayout={sel:null,drag:null,
  orient(){return innerHeight>=innerWidth?'p':'l';},
  /* writes the current orientation's offsets and sizes onto the elements (cheap: only what changed is touched) */
  apply(){const o=this.orient();document.documentElement.style.setProperty('--txt',String(+P.uiText||1));
    for(const [k,sel,,org] of UI_EL){const x=+P[`ui_${k}_${o}x`]||0,y=+P[`ui_${k}_${o}y`]||0,s=+P[`ui_${k}_${o}s`]||1;
      const t=x||y?`${x}px ${y}px`:'',sc=s!==1?String(s):'';
      for(const el of document.querySelectorAll(sel)){if(el.style.translate!==t)el.style.translate=t;if(el.style.scale!==sc)el.style.scale=sc;if(sc&&el.style.transformOrigin!==org)el.style.transformOrigin=org;}}
    if(this.box)this.refreshBox();},
  init(){addEventListener('resize',()=>this.apply());addEventListener('orientationchange',()=>setTimeout(()=>this.apply(),200));
    setInterval(()=>this.apply(),800);/* panels and the compass are made later: they pick up their place within a moment */this.apply();
    // edit mode: grab any control group and drag it; a tap selects it for the size slider. Buttons do not fire while editing.
    const pick=e=>{if(!document.body.classList.contains('uiedit')||e.target.closest('#uiEd'))return null;for(const [k,sel] of UI_EL){const el=e.target.closest(sel);if(el)return{k,el};}return null;};
    document.addEventListener('pointerdown',e=>{const h=pick(e);if(!document.body.classList.contains('uiedit')||e.target.closest('#uiEd'))return;e.preventDefault();e.stopPropagation();
      if(!h)return;const o=this.orient();this.select(h.k);this.drag={k:h.k,id:e.pointerId,x0:e.clientX,y0:e.clientY,px:+P[`ui_${h.k}_${o}x`]||0,py:+P[`ui_${h.k}_${o}y`]||0};},true);
    document.addEventListener('pointermove',e=>{const d=this.drag;if(!d||e.pointerId!==d.id)return;e.preventDefault();e.stopPropagation();const o=this.orient();
      this.set(`ui_${d.k}_${o}x`,Math.round(clamp(d.px+e.clientX-d.x0,-600,600)));this.set(`ui_${d.k}_${o}y`,Math.round(clamp(d.py+e.clientY-d.y0,-600,600)));this.apply();},true);
    const end=e=>{if(this.drag&&e.pointerId===this.drag.id){this.drag=null;e.stopPropagation();}};document.addEventListener('pointerup',end,true);document.addEventListener('pointercancel',end,true);
    document.addEventListener('click',e=>{if(document.body.classList.contains('uiedit')&&!e.target.closest('#uiEd')){e.preventDefault();e.stopPropagation();}},true);},
  set(id,v){P[id]=v;if(UI.refresh)UI.refresh(id);},
  select(k){this.sel=k;this.refreshBox();},
  edit(){const pn=$('#panel');if(pn)pn.classList.remove('open');document.body.classList.add('uiedit');
    if(!this.box){const b=this.box=document.createElement('div');b.id='uiEd';b.innerHTML=`<div class="t"></div><div class="row"><span>Size</span><input type="range" id="uiEdS" min="0.5" max="2" step="0.05"><b id="uiEdSv"></b></div>
      <div class="row"><span>Text</span><input type="range" id="uiEdT" min="0.6" max="1.8" step="0.05"><b id="uiEdTv"></b></div>
      <div class="btns"><button id="uiEdAll">Show all controls</button><button id="uiEdRs">Reset this</button><button id="uiEdRa">Reset all (this orientation)</button><button id="uiEdOk" class="ok">Done</button></div>`;document.body.appendChild(b);
      $('#uiEdS').oninput=e=>{if(!this.sel)return;this.set(`ui_${this.sel}_${this.orient()}s`,+e.target.value);this.apply();};
      $('#uiEdT').oninput=e=>{this.set('uiText',+e.target.value);this.apply();};
      $('#uiEdAll').onclick=()=>{document.body.classList.toggle('uieditall');this.refreshBox();};
      $('#uiEdRs').onclick=()=>{if(!this.sel)return;const o=this.orient();for(const a of 'xys')this.set(`ui_${this.sel}_${o}${a}`,PDEF[`ui_${this.sel}_${o}${a}`].def);this.apply();};
      $('#uiEdRa').onclick=()=>{const o=this.orient();for(const [k] of UI_EL)for(const a of 'xys')this.set(`ui_${k}_${o}${a}`,PDEF[`ui_${k}_${o}${a}`].def);this.apply();};
      $('#uiEdOk').onclick=()=>this.done();}
    this.box.hidden=false;this.sel=this.sel||'bar';this.refreshBox();UI.toast('Drag any control to move it; tap one, then use Size. Separate layouts for portrait and landscape.');},
  done(){document.body.classList.remove('uiedit','uieditall');if(this.box)this.box.hidden=true;this.drag=null;try{App.autosave();}catch(e){}},
  refreshBox(){const b=this.box;if(!b||b.hidden)return;const o=this.orient(),e=UI_EL.find(q=>q[0]===this.sel);
    b.querySelector('.t').textContent=`Edit layout (${o==='p'?'portrait':'landscape'}): ${e?e[2]:'tap a control'}`;
    const s=e?+P[`ui_${e[0]}_${o}s`]||1:1;$('#uiEdS').value=s;$('#uiEdSv').textContent=s.toFixed(2)+'×';$('#uiEdT').value=+P.uiText||1;$('#uiEdTv').textContent=(+P.uiText||1).toFixed(2)+'×';
    $('#uiEdAll').classList.toggle('on',document.body.classList.contains('uieditall'));
    for(const [k,sel] of UI_EL)for(const el of document.querySelectorAll(sel))el.classList.toggle('uiSel',k===this.sel);}};
