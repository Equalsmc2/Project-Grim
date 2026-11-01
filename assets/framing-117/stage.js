import {getState,subscribe,getScene,orderedCharacters,getOptions,escapeHtml,isEnemy} from './state.js';
import {planFormation} from './formation.js';
import {MAX_ORBIT_DEGREES,MIN_CAMERA_ZOOM,MAX_CAMERA_ZOOM} from './camera-frame.js';
const $=id=>document.getElementById(id);
const app=$('stageApp');
const stage=$('stageMain');
let yaw=0,pitch=0,zoom=1,lastSignature='',world=null;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const safeImg=x=>typeof x==='string'&&/^data:image\/(png|jpeg|webp);base64,[\w+/=]+$/.test(x)?x:'';

// Turn order is global. Each team independently runs highest initiative on
// the LEFT to lowest on the RIGHT, keeping enemies across from the party.

function cardHTML(c,s,p){
  const enemy=p.side==='enemy',combat=s.mode==='combat';
  const img=safeImg(c.portrait);
  const art=img?`<img src="${img}" alt="Portrait of ${escapeHtml(c.name)}">`:`<span class="card-placeholder">${enemy?'NPC':'PC'} ${String(p.index+1).padStart(2,'0')}</span>`;
  return `<div class="card-position ${enemy?'enemy-position':'player-position'}" data-faction="${p.side}" data-combatant-id="${escapeHtml(c.id)}" data-turn-rank="${p.rank}" data-world-x="${p.worldX}" data-world-z="${p.worldZ}" style="--px:${p.x}px;--py:${p.y}px;--unit-scale:${p.scale};--depth:${enemy?0:1}">
     <span class="rank-marker" aria-label="Initiative order ${p.rank}">TURN ${String(p.rank).padStart(2,'0')}</span>
     <article class="lam-card ${enemy?'enemy-card':'player-card'}${p.active?' active':''}" aria-label="${escapeHtml(c.name)} ${enemy?'enemy':'player'} card">
      <div class="card-back"></div><div class="card-bevel"></div><div class="card-face"><div class="card-inner"><div class="card-topline"><span>${enemy?'◆ ENEMY / NPC':'● PLAYER / PC'}</span><span>LVL ${Number(c.level)||1}</span></div><div class="card-art"><span class="card-art-mark">${escapeHtml(c.symbol||'✦')}</span>${art}</div><h3 class="card-character-name">${escapeHtml(c.name)}</h3><p class="card-class">${escapeHtml(c.ancestry)} · ${escapeHtml(c.className)}</p><div class="card-divider"></div><div class="card-stats"><div class="stat-sm"><small>HP</small>${Math.max(0,Number(c.hp)||0)}/${Math.max(1,Number(c.maxHp)||1)}</div><div class="stat-sm"><small>AC</small>${Number(c.ac)||0}</div><div class="stat-sm"><small>${combat?'INIT':'LVL'}</small>${combat?Number(c.initiative)||0:Number(c.level)||1}</div></div></div></div>
      ${combat&&c.conditions?.length?`<div class="card-conditions">${c.conditions.slice(0,2).map(k=>`<span class="condition-ribbon">${escapeHtml(k)}</span>`).join('')}</div>`:''}
      ${p.active?`<div class="turn-marker">ACTIVE TURN</div>`:''}
     </article>
   </div>`;
}

function render(s){
  const scene=getScene(s),combat=s.mode==='combat';
  app.dataset.palette=scene.palette;
  $('chapterLabel').textContent=combat?'BATTLEFIELD / TACTICAL VIEW':scene.kicker;
  $('stageModeLabel').textContent=combat?'COMBAT MODE':'SCENE MODE';
  $('sceneTitle').textContent=scene.name;
  $('sceneDescription').textContent=scene.description;
  $('sceneAmbience').textContent=scene.ambience;
  $('sceneFooter').textContent=scene.name.toUpperCase();
  $('sceneInfo').hidden=combat;
  $('combatInfo').hidden=!combat;
  app.classList.toggle('scene-mode',!combat);
  let hiddenByViewer=false;try{hiddenByViewer=localStorage.getItem('grim:hideHud')==='true';}catch{}
  app.classList.toggle('ui-hidden',!s.presentation.showHud||hiddenByViewer);
  const chars=s.characters.filter(c=>!c.hidden&&(combat||s.presentation?.showSceneCards));
  const layout=planFormation(s,chars,combat,stage.clientWidth||innerWidth,stage.clientHeight||innerHeight);
  const signature=JSON.stringify([chars,s.mode,s.combat.activeId,s.presentation.cardScale,stage.clientWidth,stage.clientHeight]);
  if(signature!==lastSignature){
    $('cardPositions').innerHTML=chars.slice().sort((a,b)=>layout.placements.get(a.id).rank-layout.placements.get(b.id).rank).map(c=>cardHTML(c,s,layout.placements.get(c.id))).join('');
    lastSignature=signature;
  }
  if(world){world.update(s.environment);world.setCards(layout.placements);}
  if(combat){
    $('roundDisplay').textContent=s.combat.round;
    const current=s.characters.find(c=>c.id===s.combat.activeId);
    $('turnDisplay').textContent=current?`${isEnemy(current)?'◆ ENEMY':'● PLAYER'} · ${current.name}'s turn`:'No active character';
    $('initiativeTrack').innerHTML=orderedCharacters(s).filter(c=>!c.hidden).map(c=>`<span class="initiative-chip ${isEnemy(c)?'enemy-chip':'player-chip'}${current?.id===c.id?' active':''}"><b>${escapeHtml(c.initiative)}</b> ${isEnemy(c)?'◆':'●'} ${escapeHtml(c.name)}</span>`).join('');
  }
}
subscribe(render);
window.addEventListener('resize',()=>{world?.resize();lastSignature='';render(getState());});
function updateCamera(){world?.orbit(yaw,pitch);const node=$('room3d');node.style.setProperty('--camera-yaw',yaw+'deg');node.style.setProperty('--camera-pitch',pitch+'deg');}
function changeZoom(next){zoom=clamp(Number(next)||1,MIN_CAMERA_ZOOM,MAX_CAMERA_ZOOM);world?.zoomTo(zoom);if(world)$('worldStatus').textContent=`3D WORLD · ${Math.round(zoom*100)}%`; }
let tiltFrame=0,tiltX=0,tiltY=0;
window.addEventListener('mousemove',e=>{
  tiltX=e.clientX/innerWidth-.5;tiltY=e.clientY/innerHeight-.5;
  if(tiltFrame)return;
  tiltFrame=requestAnimationFrame(()=>{
    tiltFrame=0;
    document.querySelectorAll('.lam-card').forEach(card=>{
      card.style.setProperty('--tilt-y',`${tiltX*4}deg`);
      card.style.setProperty('--tilt-x',`${-tiltY*2}deg`);
    });
  });
},{passive:true});
function hudToggle(){try{const v=!(localStorage.getItem('grim:hideHud')==='true');localStorage.setItem('grim:hideHud',v?'true':'false');}catch{app.classList.toggle('ui-hidden');return;}render(getState());}
$('toggleHud').onclick=hudToggle;
$('fullscreen').onclick=()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.();};
window.addEventListener('keydown',e=>{
 const key=e.key.toLowerCase();
 if(e.target?.closest?.('input,select,textarea,[contenteditable]'))return;
 if(key==='h')hudToggle();
 else if(key==='f')$('fullscreen').click();
 else if(e.key==='ArrowLeft'){e.preventDefault();yaw=Math.max(-MAX_ORBIT_DEGREES,yaw-3);updateCamera();}
 else if(e.key==='ArrowRight'){e.preventDefault();yaw=Math.min(MAX_ORBIT_DEGREES,yaw+3);updateCamera();}
 else if(e.key==='ArrowUp'){e.preventDefault();pitch=Math.max(-12,pitch-3);updateCamera();}
 else if(e.key==='ArrowDown'){e.preventDefault();pitch=Math.min(12,pitch+3);updateCamera();}
 else if(key==='0'){yaw=0;pitch=0;changeZoom(1);updateCamera();}
 else if(['+','='].includes(key)){e.preventDefault();changeZoom(zoom*1.09);}
 else if(['-','_'].includes(key)){e.preventDefault();changeZoom(zoom/1.09);}
});
stage.addEventListener('wheel',e=>{
 if(!world)return;
 e.preventDefault();
 changeZoom(zoom*Math.exp(-e.deltaY*.0011));
},{passive:false});

// Dragging the open battlefield or using arrow keys rotates the real WebGL
// camera; each HTML card is reprojected from its unchanged 3D ground anchor.
let cameraDrag=null;
stage.addEventListener('pointerdown',e=>{
  if(e.button!==0||!world||e.target.closest('button,a,input,select,textarea'))return;
  cameraDrag={id:e.pointerId,x:e.clientX,y:e.clientY};
  stage.setPointerCapture?.(e.pointerId);
});
stage.addEventListener('pointermove',e=>{
  if(!cameraDrag||e.pointerId!==cameraDrag.id)return;
  const dx=e.clientX-cameraDrag.x,dy=e.clientY-cameraDrag.y;
  cameraDrag.x=e.clientX;cameraDrag.y=e.clientY;
  yaw=clamp(yaw+dx*.07,-MAX_ORBIT_DEGREES,MAX_ORBIT_DEGREES);
  pitch=clamp(pitch-dy*.09,-12,12);
  updateCamera();
});
const endDrag=e=>{if(cameraDrag&&e.pointerId===cameraDrag.id)cameraDrag=null;};
stage.addEventListener('pointerup',endDrag);
stage.addEventListener('pointercancel',endDrag);
async function launchFirebase(){const q=new URLSearchParams(location.search);const opts=getOptions();const online=q.get('online')==='1'||opts.online;if(!online)return;const room=q.get('room')||opts.room;
 try{const {connectCloud}=await import('./firebase-sync.js');await connectCloud({room,status:m=>$('syncStatus').textContent=m.toUpperCase()});}
 catch(e){$('syncStatus').textContent='LOCAL · FIREBASE UNAVAILABLE';console.warn('Firebase connection failed',e);}}
launchFirebase();

async function launchWorld(){
 try {
  if(new URLSearchParams(location.search).get('webgl')==='0')throw new Error('Fallback requested');
  const {createWorld}=await import('./world.js');world=createWorld($('worldCanvas'),stage);
  app.classList.add('webgl-ready');changeZoom(zoom);render(getState());
 }catch(error){world?.dispose();world=null;app.classList.remove('webgl-ready');$('worldCanvas').replaceChildren();$('worldStatus').textContent='2D FALLBACK · 3D unavailable';console.warn('3D fallback:',error.message);}
}
launchWorld();
window.addEventListener('pagehide',()=>{if(tiltFrame)cancelAnimationFrame(tiltFrame);world?.dispose();});
