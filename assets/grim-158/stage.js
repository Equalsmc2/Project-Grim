import {createMusicPlayer,resolveMusic} from './music-playback.js';
import {importMusicArchives,musicArchiveStatus} from './music-local.js';
import {normalizeGraphicsQuality} from './graphics-quality.js';
import {normalizeMotionChoice,reduceMotion,MOTION_STORAGE_KEY} from './presentation-preferences.js';
import {AMBIENCE_TRACKS,createAmbiencePlayer} from './ambience.js';
import {getState,subscribe,getScene,orderedCharacters,getOptions,updateState,escapeHtml,isEnemy} from './state.js';
import {planFormation} from './formation.js';
import {MAX_ORBIT_DEGREES,MIN_CAMERA_ZOOM,MAX_CAMERA_ZOOM,DEFAULT_CAMERA_VIEW} from './camera-frame.js';
const $=id=>document.getElementById(id);
const app=$('stageApp');
const stage=$('stageMain');
let yaw=0,pitch=0,zoom=1,viewMode=DEFAULT_CAMERA_VIEW,lastSignature='',lastInitiativeSignature='',world=null;
const qualityControl=$('stageQuality');
let localGraphics='balanced';
try{localGraphics=normalizeGraphicsQuality(localStorage.getItem('grim:quality:v1'));}catch{}
if(qualityControl){qualityControl.value=localGraphics;qualityControl.addEventListener('change',()=>{localGraphics=normalizeGraphicsQuality(qualityControl.value);try{localStorage.setItem('grim:quality:v1',localGraphics);}catch{}world?.setQuality(localGraphics);});}
const motionControl=$('stageMotion');
let motionChoice='system';
try{motionChoice=normalizeMotionChoice(localStorage.getItem(MOTION_STORAGE_KEY));}catch{}
const systemMotion=typeof window.matchMedia==='function'?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
const isReducedMotion=()=>reduceMotion(motionChoice,systemMotion?.matches);
function applyMotion(){
  const reduced=isReducedMotion();
  app.classList.toggle('grim-reduced-motion',reduced);
  document.documentElement.classList.toggle('grim-motion-full',motionChoice==='full');
  if(motionControl)motionControl.value=motionChoice;
  world?.setReducedMotion(reduced);
}
if(motionControl)motionControl.addEventListener('change',()=>{
  motionChoice=normalizeMotionChoice(motionControl.value);
  try{localStorage.setItem(MOTION_STORAGE_KEY,motionChoice);}catch{}
  applyMotion();
});
systemMotion?.addEventListener?.('change',()=>{if(motionChoice==='system')applyMotion();});
applyMotion();
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const safeImg=x=>typeof x==='string'&&/^data:image\/(png|jpeg|webp);base64,[\w+/=]+$/.test(x)?x:'';

// Turn order is global. Each team independently runs highest initiative on
// the LEFT to lowest on the RIGHT, keeping enemies across from the party.

function cardHTML(c,s,p){
  const enemy=p.side==='enemy',combat=s.mode==='combat';
  const statuses=(c.conditions||[]).map(x=>String(x).toLowerCase());
  const burning=statuses.some(x=>/burn|fire|ignite|flame/.test(x));
  const frozen=statuses.some(x=>/frozen|freeze|frost|ice|cold/.test(x));
  const img=safeImg(c.portrait);
  const art=img?`<img src="${img}" alt="Portrait of ${escapeHtml(c.name)}">`:`<span class="card-placeholder">${enemy?'NPC':'PC'} ${String(p.index+1).padStart(2,'0')}</span>`;
  return `<div class="card-position ${enemy?'enemy-position':'player-position'}" data-faction="${p.side}" data-combatant-id="${escapeHtml(c.id)}" data-turn-rank="${p.rank}" data-world-x="${p.worldX}" data-world-z="${p.worldZ}" style="--px:${p.x}px;--py:${p.y}px;--unit-scale:${p.scale};--depth:${enemy?0:1}">
     <span class="rank-marker" aria-label="Initiative order ${p.rank}">TURN ${String(p.rank).padStart(2,'0')}</span>
     <article class="lam-card ${enemy?'enemy-card':'player-card'}${p.active?' active':''}${burning?' burning-card':''}${frozen?' frozen-card':''}" aria-label="${escapeHtml(c.name)} ${enemy?'enemy':'player'} card">
      <div class="card-back"></div><div class="card-bevel"></div><div class="card-face"><div class="card-inner"><div class="card-topline"><span>${enemy?'◆ ENEMY / NPC':'● PLAYER / PC'}</span><span>LVL ${Number(c.level)||1}</span></div><div class="card-art"><span class="card-art-mark">${escapeHtml(c.symbol||'✦')}</span>${art}</div><h3 class="card-character-name">${escapeHtml(c.name)}</h3><p class="card-class">${escapeHtml(c.ancestry)} · ${escapeHtml(c.className)}</p><div class="card-divider"></div><div class="card-stats"><div class="stat-sm"><small>HP</small>${Math.max(0,Number(c.hp)||0)}/${Math.max(1,Number(c.maxHp)||1)}</div><div class="stat-sm"><small>AC</small>${Number(c.ac)||0}</div><div class="stat-sm"><small>${combat?'INIT':'LVL'}</small>${combat?Number(c.initiative)||0:Number(c.level)||1}</div></div></div></div>
      ${combat&&c.conditions?.length?`<div class="card-conditions">${c.conditions.slice(0,2).map(k=>`<span class="condition-ribbon">${escapeHtml(k)}</span>`).join('')}</div>`:''}
      ${p.active?`<div class="turn-marker">ACTIVE TURN</div>`:''}
     </article>
   </div>`;
}

function render(s){
  const scene=getScene(s),combat=s.mode==='combat';
  app.dataset.palette=scene.palette;
  $('chapterLabel').textContent=combat?`BATTLEFIELD / ${viewMode==='ground'?'GROUND VIEW':viewMode==='overhead'?'OVERHEAD VIEW':'TACTICAL VIEW'}`:scene.kicker;
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
  if(world){world.update(s.environment);world.setCards(layout.placements,chars,combat);}
  updateCinematicUI(s.environment?.cinematicPan);
  if(combat){
    $('roundDisplay').textContent=s.combat.round;
    const current=s.characters.find(c=>c.id===s.combat.activeId);
    $('turnDisplay').textContent=current?`${isEnemy(current)?'◆ ENEMY':'● PLAYER'} · ${current.name}'s turn`:'No active character';
    const initiativeSignature=JSON.stringify([s.combat.activeId,...s.characters.filter(c=>!c.hidden).map(c=>[c.id,c.name,c.faction,c.initiative])]);
    if(initiativeSignature!==lastInitiativeSignature){
      $('initiativeTrack').innerHTML=orderedCharacters(s).filter(c=>!c.hidden).map(c=>`<span class="initiative-chip ${isEnemy(c)?'enemy-chip':'player-chip'}${current?.id===c.id?' active':''}"><b>${escapeHtml(c.initiative)}</b> ${isEnemy(c)?'◆':'●'} ${escapeHtml(c.name)}</span>`).join('');
      lastInitiativeSignature=initiativeSignature;
    }
  }
}
const autoPanButton=$('autoPanToggle');
function updateCinematicUI(on){if(!autoPanButton)return;autoPanButton.classList.toggle('active',!!on);autoPanButton.setAttribute('aria-pressed',String(!!on));autoPanButton.textContent=on?'◉ Auto pan':'○ Auto pan';}
if(autoPanButton)autoPanButton.addEventListener('click',()=>updateState(s=>{s.environment.cinematicPan=!s.environment.cinematicPan;}));


subscribe(render);
window.addEventListener('resize',()=>{world?.resize();lastSignature='';render(getState());});
function updateCamera(){world?.orbit(yaw,pitch);const node=$('room3d');node.style.setProperty('--camera-yaw',yaw+'deg');node.style.setProperty('--camera-pitch',pitch+'deg');}
function changeZoom(next){zoom=clamp(Number(next)||1,.9,MAX_CAMERA_ZOOM);if(world)zoom=world.zoomTo(zoom);if(world)$('worldStatus').textContent=`3D WORLD · ${Math.round(zoom*100)}%`; }

function selectCameraView(mode){
 if(!['tactical','ground','overhead'].includes(mode))return;
 viewMode=mode;yaw=0;pitch=0;zoom=1;
 world?.setView(mode);
 document.querySelectorAll('[data-camera-view]').forEach(btn=>{
   const selected=btn.dataset.cameraView===mode;
   btn.classList.toggle('active',selected);
   btn.setAttribute('aria-pressed',String(selected));
 });
 const names={tactical:'TACTICAL',ground:'GROUND VIEW',overhead:'OVERHEAD'};
 if(world)$('worldStatus').textContent=`3D WORLD · ${names[mode]}`;
 $('chapterLabel').textContent=`BATTLEFIELD / ${names[mode]}`;
}
document.querySelectorAll('[data-camera-view]').forEach(btn=>btn.addEventListener('click',()=>selectCameraView(btn.dataset.cameraView)));
let tiltFrame=0,tiltX=0,tiltY=0;
window.addEventListener('mousemove',e=>{
  // Native cards are GPU billboards: do not touch invisible fallback HTML
  // on every mousemove while WebGL is active.
  if(world||isReducedMotion())return;
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
 if(e.ctrlKey||e.metaKey||e.altKey||e.target?.closest?.('input,select,textarea,[contenteditable]'))return;
 if(key==='h')hudToggle();
 else if(key==='c'){e.preventDefault();autoPanButton?.click();}
 else if(key==='f')$('fullscreen').click();
 else if(e.key==='ArrowLeft'){e.preventDefault();({yaw,pitch}=world?.getOrbit()||{yaw,pitch});yaw=Math.max(-(viewMode==='ground'?20:MAX_ORBIT_DEGREES),yaw-3);updateCamera();}
 else if(e.key==='ArrowRight'){e.preventDefault();({yaw,pitch}=world?.getOrbit()||{yaw,pitch});yaw=Math.min(viewMode==='ground'?20:MAX_ORBIT_DEGREES,yaw+3);updateCamera();}
 else if(e.key==='ArrowUp'){e.preventDefault();({yaw,pitch}=world?.getOrbit()||{yaw,pitch});pitch=Math.max(-10,pitch-3);updateCamera();}
 else if(e.key==='ArrowDown'){e.preventDefault();({yaw,pitch}=world?.getOrbit()||{yaw,pitch});pitch=Math.min(10,pitch+3);updateCamera();}
 else if(['1','2','3'].includes(key)){selectCameraView(({1:'tactical',2:'ground',3:'overhead'})[key]);}
 else if(key==='0'){selectCameraView(DEFAULT_CAMERA_VIEW);updateCamera();}
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
  ({yaw,pitch}=world.getOrbit());
  world.pauseCinematic();
  cameraDrag={id:e.pointerId,x:e.clientX,y:e.clientY};
  stage.setPointerCapture?.(e.pointerId);
});
stage.addEventListener('pointermove',e=>{
  if(!cameraDrag||e.pointerId!==cameraDrag.id)return;
  const dx=e.clientX-cameraDrag.x,dy=e.clientY-cameraDrag.y;
  cameraDrag.x=e.clientX;cameraDrag.y=e.clientY;
  const orbitLimit=viewMode==='ground'?20:viewMode==='overhead'?35:MAX_ORBIT_DEGREES;
  yaw=clamp(yaw+dx*.095,-orbitLimit,orbitLimit);
  pitch=clamp(pitch-dy*.085,-10,10);
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
  const {createWorld}=await import('./world.js');world=createWorld($('worldCanvas'),stage,{quality:localGraphics,reducedMotion:isReducedMotion()});
  app.classList.add('webgl-ready');applyMotion();selectCameraView(viewMode);render(getState());
 }catch(error){world?.dispose();world=null;app.classList.remove('webgl-ready','native-cards-ready');$('worldCanvas').replaceChildren();$('worldStatus').textContent='2D FALLBACK · 3D unavailable';console.warn('3D fallback:',error.message);}
}
launchWorld();
window.addEventListener('pagehide',()=>{if(tiltFrame)cancelAnimationFrame(tiltFrame);world?.dispose();});

// Browsers block audio autoplay until someone interacts with the stage.
// The sound enable button is deliberately separate from the hidden HUD so
// there is always a way to start playback on a TV or secondary display.
const soundToggle=$('stageSoundToggle'),soundLabel=$('stageSoundLabel');
let stageAudioState=getState(),musicIssue='',musicActuallyPlaying=false;
const stageMusic=createMusicPlayer({onStatus:(kind,track)=>{
 if(kind==='missing')musicIssue='Music unavailable · load its ZIP on this device';
 else if(kind==='unsupported')musicIssue='This browser cannot decode the selected audio';
 else if(kind==='blocked')musicIssue='Click Enable sound to start music';
 else if(kind==='playing'||kind==='loading'||kind==='off')musicIssue='';
 musicActuallyPlaying=kind==='playing';
 syncAmbienceGain();refreshStageSoundLabel();
}});
function syncAmbienceGain(){stageSound.sync(stageAudioState.environment?.ambience||'none',(stageAudioState.environment?.ambienceVolume??.55)*(musicActuallyPlaying?.30:1));}
function refreshStageSoundLabel(){
 const m=resolveMusic(stageAudioState.music),amb=AMBIENCE_TRACKS[stageSound.track]?.label||'Off';
 soundToggle.textContent=stageMusic.enabled||stageSound.enabled?'♫ Mute sound':'▶ Enable sound';
 soundLabel.textContent=musicIssue||(m.track&&stageAudioState.music?.playing?`♫ ${m.track.title}`:stageSound.track!=='none'?amb:'No audio selected');
}

const stageSound=createAmbiencePlayer({onStatus:(type,detail)=>{
 const name=AMBIENCE_TRACKS[stageSound.track]?.label||'Off';
 if(type==='playing'){soundToggle.textContent='♪ Mute sound';soundLabel.textContent=name;}
 else if(type==='loading'){soundLabel.textContent=`Loading ${name}…`;}
 else if(type==='off'){soundLabel.textContent='Ambience off';soundToggle.textContent=stageSound.enabled?'♪ Disable sound':'▶ Enable sound';}
 else if(type==='blocked'){soundLabel.textContent='Click Enable sound to allow audio';soundToggle.textContent='▶ Enable sound';}
 else if(type==='error'){soundLabel.textContent='Audio file unavailable';}
 else if(type==='locked'){soundToggle.textContent='▶ Enable sound';soundLabel.textContent=stageSound.track==='none'?'Ambience off':`${name} · sound disabled`;}
}});
soundToggle.addEventListener('click',()=>{
 if(stageSound.enabled||stageMusic.enabled){stageSound.disable();stageMusic.disable();}
 else {stageSound.enable();stageMusic.enable();stageMusic.sync(getState().music);}
 refreshStageSoundLabel();
});
const stageMusicInput=$('stageMusicArchiveInput');
stageMusicInput.addEventListener('change',async()=>{
 const files=stageMusicInput.files;
 if(!files?.length)return;
 stageMusicInput.disabled=true;
 try{
  const outcome=await importMusicArchives(files,message=>{soundLabel.textContent=message;});
  const status=await musicArchiveStatus();
  musicIssue=outcome.errors.length?outcome.errors.join('; '):'';
  if(!outcome.errors.length)soundLabel.textContent='Loaded '+outcome.tracks+' tracks · '+status.tracks+' stored on this device';
  // Retry a previously missing soundtrack after importing.
  if(outcome.tracks&&stageMusic.enabled){stageMusic.disable();stageMusic.enable();stageMusic.sync(getState().music);}
  setTimeout(refreshStageSoundLabel,2500);
 }catch(error){musicIssue='Could not load ZIP: '+(error?.message||String(error));refreshStageSoundLabel();}
 finally{stageMusicInput.value='';stageMusicInput.disabled=false;}
});
subscribe(s=>{
 stageAudioState=s;stageMusic.sync(s.music);
 syncAmbienceGain();
 refreshStageSoundLabel();
});
const musicClock=setInterval(()=>{if(stageMusic.enabled && stageAudioState.music?.playing){stageMusic.sync(stageAudioState.music);refreshStageSoundLabel();}},850);
window.addEventListener('pagehide',()=>{clearInterval(musicClock);stageSound.dispose();stageMusic.dispose();});
