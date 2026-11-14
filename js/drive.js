'use strict';
// ===== drive.js
// ===================================================================
// DRIVING — regulator, brake, reverser, whistle, auto driver, camera modes
// ===================================================================
const CAMS=[['follow','Follow'],['chase','Chase'],['cab','Cab'],['coach','Coach seat'],['trackside','Trackside'],['free','Free']];
const Drive={locoKind:"std",placing:false,ghost:null,listOpen:false,
  // ---- place a train by dragging it onto the track
  startPlace(){if(!Track.segs.length){UI.toast('Build some track first');return;}this.placing=true;this.ghost=null;this.listOpen=false;this.refresh();
    $('#driveInfo').textContent='Drag along the track to place the locomotive, then let go. Then add wagons in the list.';},
  fit(x,z){const near=Net.nearestOnTrack(x,z,Math.max(25,Cam.dist*0.05));if(!near)return null;const veh=Trains.consist(0,0,Drive.locoKind),L=Trains.length(veh)+16;// room for a first wagon
    for(const dir of [1,-1]){const h={sid:near.seg.id,t:near.t,dir};let head=h;const b=advance(h,-L);if(b.blocked){const f=advance(b.pos,L+1);if(f.blocked||advance(f.pos,-L).blocked)continue;head=f.pos;}
      return{head,veh,L};}return null;},
  down(e){if(!this.placing)return false;this.move(e);return true;},
  move(e){const h=Cam.pick(e.clientX,e.clientY);if(!h)return;this.ghost=this.fit(h[0],h[2]);$('#driveInfo').textContent=this.ghost?'Let go to place the locomotive here.':'No room here: drag onto a longer stretch of track.';},
  up(e){if(!this.placing)return;const g=this.ghost;this.placing=false;this.ghost=null;if(g){Trains.add(g.head,g.veh.slice(0,2));Trains.sel=Trains.list.length-1;this.listOpen=true;UI.toast('Locomotive placed: add wagons below, one at a time');}else UI.toast('Locomotive not placed');this.refresh();},
  cancel(){},
  markers(){const out=[];if(this.ghost){let off=0;for(const v of this.ghost.veh){const p=posInfo(advance(this.ghost.head,-(off+v.len/2)).pos);if(p)out.push([p.x,p.y,p.z,p.h,3]);off+=v.len+COUPLE;}}
    for(const n of Net.junctions()){const J=Net.junction(n.id);if(!J)continue;const b=J.branches[(n.sw|0)];out.push([n.x,n.y,n.z,Net.leaveDir(b,n.id),2]);}return out;},
  tap(e){const ti=pickTrain(e.clientX,e.clientY);if(ti>=0&&ti!==Trains.sel){Trains.sel=ti;this.refresh&&this.refresh();UI.toast(`${Trains.list[ti].name} selected`);return;}const h=Cam.pick(e.clientX,e.clientY);if(!h)return;let best=null,bd=Math.max(12,Cam.dist*0.03);for(const n of Net.junctions()){const d=Math.hypot(n.x-h[0],n.z-h[2]);if(d<bd){bd=d;best=n;}}
    if(best){Net.flip(best);return;}
    let bt=null,bt2=Math.max(12,Cam.dist*0.03);Trains.list.forEach((t,i)=>{if(!t.poses)return;for(const p of t.poses){if(!p)continue;const d=Math.hypot(p.c[0]-h[0],p.c[2]-h[2]);if(d<bt2){bt2=d;bt=i;}}});if(bt!==null){Trains.sel=bt;this.refresh();}},
  list(){const el=$('#trainList');el.innerHTML='';for(const [i,t] of Trains.list.entries()){const r=document.createElement('div');r.className='trow'+(i===Trains.sel?' on':'');
      const dst=t.auto?Net.destOf(t):null;r.innerHTML=`<div><b>${esc(t.name)}</b><span>${Math.abs(t.v*3.6).toFixed(0)} km/h, ${esc(t.status||'Standing')}${dst?' → '+esc(dst.name):''}</span></div>`;
      const go=document.createElement('button');go.className='ic';go.innerHTML=svgIcon('goTo')+'<span class="cap"></span><span class="v" hidden></span>';setCap(go,'Go to '+t.name);go.onclick=()=>{Trains.sel=i;if(Cam.mode==='free')Cam.setMode('follow');this.listOpen=false;this.refresh();};
      const au=document.createElement('button');au.className='ic'+(t.auto?' on':'');au.innerHTML=svgIcon('auto')+'<span class="cap"></span><span class="v" hidden></span>';setCap(au,t.auto?'Autopilot on':'Autopilot off');au.setAttribute('aria-pressed',t.auto?'true':'false');au.onclick=()=>{t.auto=!t.auto;if(t.auto&&!t.rev)t.rev=1;this.list();};
      const ds=document.createElement('select');ds.className='dsel';ds.title='Destination';const rch=Net.reachSegs(t.head.sid),stR=Track.stations.filter(q=>rch.has(q.sid));if(t.destId!=null&&!stR.some(q=>q.id===t.destId))t.destId=null;ds.innerHTML='<option value="">Next station in turn</option>'+stR.map(q=>`<option value="${+q.id}">${esc(q.name)}</option>`).join('');ds.value=t.destId!=null?String(t.destId):'';
      ds.onchange=()=>{t.destId=ds.value?+ds.value:null;t.lastStation=null;ds.blur();this.list();};if(stR.length>1)r.append(go,au,ds);else r.append(go,au);el.appendChild(r);
      if(i===Trains.sel){// wagon editor: add a wagon of a kind at the rear, or take the last one off
        const ed=document.createElement('div');ed.className='wed';const IC={coach:'🚃',wood:'🪵',grain:'🌾',produce:'🥕',mail:'✉️'};for(const k in ORE)IC[k]=ORE[k].icon;
        const kinds=[['coach','Add a passenger coach'],['wood','Add a timber wagon'],['grain','Add a grain hopper'],['produce','Add a covered van (produce)'],['mail','Add a mail van'],...Object.keys(ORE).map(k=>[k,`Add an ore hopper (${ORE[k].name.toLowerCase()} ore)`])];
        {const lk=document.createElement('div');lk.className='wed';for(const [k,S] of Object.entries(LOCOS)){const b=document.createElement('button');b.className='wadd'+(((t.veh[0].lt||'std')===k)?' on':'');b.title=b.ariaLabel=S.name;b.textContent=k==='std'?'🚂 Green':'🚂 01';b.onclick=()=>{if((t.veh[0].lt||'std')!==k&&Trains.setLoco(t,k)){Drive.locoKind=k;UI.toast(S.name);}this.list();};lk.appendChild(b);}el.appendChild(lk);}
        const cars=t.veh.slice(2),Lm=Math.round(this.trainLen?this.trainLen(t):Trains.length(t.veh));
        ed.innerHTML=`<div class="cons" title="The train from the locomotive back">🚂${cars.map(q=>`<i>${q.k==='coach'?IC.coach:IC[q.ctype]||'▫️'}</i>`).join('')}<small>${cars.length?Lm+' m':'no wagons yet'}</small></div>`;
        for(const [k,lab] of kinds){const b=document.createElement('button');b.className='wadd';b.title=lab;b.setAttribute('aria-label',lab);b.innerHTML=`+${IC[k]}`;b.onclick=()=>{Trains.addCar(t,k);this.list();};ed.appendChild(b);}
        const rm=document.createElement('button');rm.className='wadd';rm.title=rm.ariaLabel='Take the last wagon off';rm.innerHTML='−';rm.disabled=t.veh.length<=2;rm.onclick=()=>{Trains.removeCar(t);this.list();};ed.appendChild(rm);el.appendChild(ed);}}
    if(!Trains.list.length)el.innerHTML='<p class="hint">No trains yet. Tap the add-locomotive button and drag it onto the track, then add wagons here.</p>';},
  active:false,
  enter(){this.active=true;if(!Trains.list.length)this.startPlace();$('#bar').classList.add('hide');$('#driveBar').hidden=false;
    if(!Sfx.on)Sfx.start();Sfx.syncBtn();this.refresh();},
  exit(){this.active=false;this.cinema(false);$('#driveBar').hidden=true;$('#bar').classList.remove('hide');const t=Trains.cur();if(t){t.whistle=false;Sfx.whistle(t,false);}Cam.setMode('free');},
  refresh(){if(!this.active)return;$('#trainList').hidden=!this.listOpen;$('#dList').classList.toggle('on',this.listOpen);if(this.listOpen)this.list();$('#dAdd').classList.toggle('on',this.placing);
    const t=Trains.cur();$('#driveCtl').hidden=!t;if(!t)return;
    $('#dThrottle').value=Math.round(t.throttle*100);$('#dBrake').value=Math.round(t.brake*100);
    for(const b of document.querySelectorAll('#driveBar [data-rev]'))b.classList.toggle('on',+b.dataset.rev===t.rev);
    $('#dAuto').classList.toggle('on',t.auto);setCap($('#dAuto'),'Autopilot',t.auto?`${t.autoKmh} km/h`:'');
    setCap($('#dCam'),'Camera',CAMS.find(c=>c[0]===Cam.mode)[1]);$('#dRerail').hidden=!t.derailed;$('#dNext').hidden=Trains.list.length<2;},
  tick(){if(!this.active)return;const ae=document.activeElement;if(this.listOpen&&(this.lt=(this.lt||0)+1)%30===0&&!(ae&&ae.tagName==='SELECT'&&ae.closest('#trainList')))this.list();const t=Trains.cur();if(!t||this.placing)return;const kmh=t.v*3.6,g=t.poses&&t.poses[0]?t.poses[0].grade*100:0;
    const sp=Math.abs(kmh).toFixed(0),se=$('#dSpeed');if(se.textContent!==sp)se.textContent=sp;
    const di=$('#driveInfo'),dt=`${t.name}${t.rev<0?', reversing':''}, grade ${g>=0?'+':''}${g.toFixed(1)}%${t.slip?', wheels slipping!':''}, ${t.status||'standing'}${t.pax&&t.pax.length?`, ${t.pax.length} passenger${t.pax.length>1?'s':''}`:''}`;if(di.textContent!==dt)di.textContent=dt;
    if(t.auto){$('#dThrottle').value=Math.round(t.throttle*100);$('#dBrake').value=Math.round(t.brake*100);}},
  setRev(r){const t=Trains.cur();if(!t)return;if(Math.abs(t.v)>1&&Math.sign(r)!==Math.sign(t.v)&&r!==0){UI.toast('Stop first before reversing');return;}t.rev=r;this.refresh();},
  cinema(on){this.cine=!!on&&this.active;$('#driveBar').hidden=this.cine||!this.active;$('#cine').hidden=!this.cine;document.body.classList.toggle('cine',this.cine);
    if(this.cine){const c=CAMS.find(q=>q[0]===Cam.mode);setCap($('#cineCam'),c?c[1]:'Camera');}},
  cycleCam(){const i=CAMS.findIndex(c=>c[0]===Cam.mode);Cam.setMode(CAMS[(i+1)%CAMS.length][0]);this.refresh();},
  bind(){
    $('#dThrottle').oninput=e=>{const t=Trains.cur();if(t){t.throttle=e.target.value/100;t.auto=false;this.refresh();}};
    $('#dBrake').oninput=e=>{const t=Trains.cur();if(t){t.brake=e.target.value/100;t.auto=false;this.refresh();}};
    for(const b of document.querySelectorAll('#driveBar [data-rev]'))b.onclick=()=>this.setRev(+b.dataset.rev);
    const w=$('#dWhistle'),on=v=>{const t=Trains.cur();if(!t)return;if(!Sfx.on)Sfx.start();t.whistle=v;Sfx.whistle(t,v);w.classList.toggle('on',v);};
    w.addEventListener('pointerdown',e=>{e.preventDefault();w.setPointerCapture(e.pointerId);on(true);});for(const ev of ['pointerup','pointercancel'])w.addEventListener(ev,()=>on(false));
    $('#dAuto').onclick=()=>{const t=Trains.cur();if(!t)return;t.auto=!t.auto;t.autoKmh=P.autoSpeed;if(t.auto&&t.rev===0)t.rev=1;this.refresh();};
    // tap: next camera; hold 500 ms: hide the controls and keep this camera (a small camera / exit pair stays on screen)
    {const dc=$('#dCam');let ht=null,held=false;dc.onpointerdown=()=>{held=false;clearTimeout(ht);ht=setTimeout(()=>{held=true;this.cinema(true);},500);};
      dc.onpointerup=dc.onpointerleave=dc.onpointercancel=()=>clearTimeout(ht);dc.oncontextmenu=e=>e.preventDefault();dc.onclick=()=>{if(held){held=false;return;}this.cycleCam();};}
    $('#cineCam').onclick=()=>{this.cycleCam();this.cinema(true);};$('#cineExit').onclick=()=>this.cinema(false);
    $('#dNext').onclick=()=>{Trains.sel=(Trains.sel+1)%Trains.list.length;this.refresh();};
    $('#dAdd').onclick=()=>this.startPlace();$('#dList').onclick=()=>{this.listOpen=!this.listOpen;this.refresh();};$('#dRemove').onclick=()=>{const t=Trains.cur();if(t&&confirm(`Remove ${t.name}?`)){Trains.remove();this.refresh();}};
    $('#dRerail').onclick=()=>{Trains.rerail();this.refresh();};$('#dDone').onclick=()=>this.exit();
  }
};
