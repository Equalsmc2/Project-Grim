import {getState,subscribe,getScene,orderedCharacters,getOptions,escapeHtml,isEnemy} from './state.js';
const $=id=>document.getElementById(id);
const app=$('stageApp');
let yaw=0,pitch=0,lastSignature='';
const safeImg=x=>typeof x==='string'&&/^data:image\/(png|jpeg|webp);base64,[\w+/=]+$/.test(x)?x:'';
const clamp=(x,min,max)=>Math.min(max,Math.max(min,x));

function teamPlacements(group,{side,hasBoth,width,height,userScale,combat,activeId}){
  if(!group.length) return [];
  const rowLimit=width<700?4:width<980?5:width<1280?6:7;
  const rows=Math.ceil(group.length/rowLimit);
  const perRow=Math.ceil(group.length/rows);
  const far=side==='enemy';
  const rowSpread = clamp(width<700?64:78,58,86);
  const sideDepth = hasBoth ? (far?-185:150) : 0;
  const sideOffset = hasBoth ? (far?-30:34) : 0;
  const maxScaleFromHeight = clamp(.98 + (height-850)*.00035,.82,1.10);
  const maxScaleFromWidth = width<700?.54:width<980?.68:width<1366?.82:.95;
  const targetSlots = Math.min(perRow, rowLimit);
  const desiredStep = width<700?94:width<980?118:width<1366?138:156;
  const usableWidth = Math.min(width<700?330:width<980?620:width<1366?820:980, width-(width<700?36:120));
  const scaleFromFit = perRow>1 ? (usableWidth - desiredStep*(targetSlots-1)) / 188 : 1.0;
  const scale = clamp(Math.min(userScale,maxScaleFromHeight,maxScaleFromWidth,scaleFromFit), .42, 1.06);
  const step = perRow>1 ? clamp((usableWidth - 188*scale)/(perRow-1), desiredStep*.66, desiredStep) : 0;
  return group.map((c,i)=>{
    const row=Math.floor(i/perRow);
    const inRow=i%perRow;
    const rowCount=Math.min(perRow, group.length-row*perRow);
    const x=(inRow-(rowCount-1)/2)*step;
    const towardCenter = far ? 1 : -1;
    const y=sideDepth + row*rowSpread*(far?-1:1) + sideOffset;
    const active = combat && activeId===c.id;
    const advance = active ? towardCenter*26 : 0;
    const lift = active ? 94 : 44 + row*3;
    const turn = (inRow-(rowCount-1)/2) * (far?2.2:-2.2);
    return {id:c.id,x,y:y+advance,z:lift,turn,scale,side,row,index:i,active};
  });
}

function makeFormation(characters,s,combat){
  const placements=new Map();
  const enemy=characters.filter(isEnemy), players=characters.filter(c=>!isEnemy(c));
  const hasBoth=enemy.length>0 && players.length>0;
  const width=Math.min(innerWidth, 1600), height=Math.min(innerHeight, 1000);
  const userScale=clamp(Number(s.presentation?.cardScale)||1,.5,1.25);
  const specs=[...teamPlacements(enemy,{side:'enemy',hasBoth,width,height,userScale,combat,activeId:s.combat.activeId}), ...teamPlacements(players,{side:'player',hasBoth,width,height,userScale,combat,activeId:s.combat.activeId})];
  specs.forEach(spec=>placements.set(spec.id,spec));
  return {placements,hasBoth};
}

function cardHTML(c,s,place){
  const combat=s.mode==='combat', enemy=place.side==='enemy';
  const p=safeImg(c.portrait);
  const art=p?`<img src="${p}" alt="Portrait of ${escapeHtml(c.name)}">`:`<span class="card-placeholder">${enemy?'NPC':'PC'} ${String(place.index+1).padStart(2,'0')}</span>`;
  return `<div class="card-position ${enemy?'enemy-position':'player-position'}${c.hidden?' is-hidden':''}" data-faction="${place.side}" style="--px:${place.x}px;--py:${place.y}px;--pz:${place.z}px;--rotation:${place.turn}deg;--card-s:${place.scale}">
   <article class="lam-card ${enemy?'enemy-card':'player-card'}${place.active?' active':''}" aria-label="${escapeHtml(c.name)} card"><div class="card-back"></div><div class="card-bevel"></div><div class="card-face"><div class="card-inner"><div class="card-topline"><span>${enemy?'◆ ENEMY / NPC':'● PLAYER / PC'}</span><span>LVL ${Number(c.level)||1}</span></div><div class="card-art"><span class="card-art-mark">${escapeHtml(c.symbol||'✦')}</span>${art}</div><h3 class="card-character-name">${escapeHtml(c.name)}</h3><p class="card-class">${escapeHtml(c.ancestry)} · ${escapeHtml(c.className)}</p><div class="card-divider"></div><div class="card-stats"><div class="stat-sm"><small>HP</small>${Math.max(0,c.hp)}/${c.maxHp}</div><div class="stat-sm"><small>AC</small>${c.ac}</div><div class="stat-sm"><small>${combat?'INIT':'LEVEL'}</small>${combat?c.initiative:c.level}</div></div></div></div>
   ${combat&&c.conditions?.length?`<div class="card-conditions">${c.conditions.slice(0,3).map(k=>`<span class="condition-ribbon">${escapeHtml(k)}</span>`).join('')}</div>`:''}
   ${place.active?`<div class="turn-marker">${enemy?'◆ ENEMY TURN':'● PLAYER TURN'}</div>`:''}</article></div>`;
}

function render(s){
  const scene=getScene(s), combat=s.mode==='combat';
  app.dataset.palette=scene.palette;
  $('chapterLabel').textContent=combat?'TACTICAL / OBSERVER VIEW':scene.kicker;
  $('stageModeLabel').textContent=combat?'TACTICAL COMBAT':'SCENE MODE';
  $('sceneTitle').textContent=scene.name;
  $('sceneDescription').textContent=scene.description;
  $('sceneAmbience').textContent=scene.ambience;
  $('sceneFooter').textContent=scene.name.toUpperCase();
  $('sceneInfo').hidden=combat;
  $('combatInfo').hidden=!combat;
  const chars=s.characters.filter(c=>!c.hidden && (combat || s.presentation?.showSceneCards));
  const formation=makeFormation(chars,s,combat);
  $('formationVersus').hidden=!combat || !formation.hasBoth;
  const signature=JSON.stringify([chars,s.mode,s.combat.activeId,s.presentation.cardScale,innerWidth,innerHeight]);
  if(signature!==lastSignature){
    $('cardPositions').innerHTML=chars.map(c=>cardHTML(c,s,formation.placements.get(c.id))).join('');
    lastSignature=signature;
  }
  if(combat){
    $('roundDisplay').textContent=s.combat.round;
    const current=s.characters.find(c=>c.id===s.combat.activeId);
    $('turnDisplay').textContent=current?`${isEnemy(current)?'◆ ENEMY':'● PLAYER'} · ${current.name}'s turn`:'No active character';
    $('initiativeTrack').innerHTML=orderedCharacters(s).filter(c=>!c.hidden).map(c=>`<span class="initiative-chip ${isEnemy(c)?'enemy-chip':'player-chip'}${current?.id===c.id?' active':''}"><b>${escapeHtml(c.initiative)}</b> ${isEnemy(c)?'◆':'●'} ${escapeHtml(c.name)}</span>`).join('');
  }
  app.classList.toggle('scene-mode',!combat);
  let hiddenByViewer=false;try{hiddenByViewer=localStorage.getItem('grim:hideHud')==='true';}catch{}
  app.classList.toggle('ui-hidden',!s.presentation.showHud||hiddenByViewer);
}

subscribe(render);
window.addEventListener('resize',()=>{lastSignature='';render(getState());});
function updateCamera(){const node=$('room3d');node.style.setProperty('--camera-yaw',yaw+'deg');node.style.setProperty('--camera-pitch',pitch+'deg');}
window.addEventListener('mousemove',e=>{const x=e.clientX/innerWidth-.5,y=e.clientY/innerHeight-.5;document.querySelectorAll('.lam-card').forEach(card=>{card.style.setProperty('--tilt-y',`${x*6}deg`);card.style.setProperty('--tilt-x',`${-y*3}deg`);});},{passive:true});
function hudToggle(){try{const v=!(localStorage.getItem('grim:hideHud')==='true');localStorage.setItem('grim:hideHud',v?'true':'false');}catch{app.classList.toggle('ui-hidden');return;}render(getState());}
$('toggleHud').onclick=hudToggle;
$('fullscreen').onclick=()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.();};
window.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(key==='h')hudToggle();else if(key==='f')$('fullscreen').click();else if(e.key==='ArrowLeft'){yaw=Math.max(-18,yaw-4);updateCamera();}else if(e.key==='ArrowRight'){yaw=Math.min(18,yaw+4);updateCamera();}else if(e.key==='ArrowUp'){pitch=Math.max(-8,pitch-2);updateCamera();}else if(e.key==='ArrowDown'){pitch=Math.min(8,pitch+2);updateCamera();}else if(key==='0'){yaw=0;pitch=0;updateCamera();}});
async function launchFirebase(){const q=new URLSearchParams(location.search);const opts=getOptions();const online=q.get('online')==='1'||opts.online;if(!online)return;const room=q.get('room')||opts.room;
 try{const {connectCloud}=await import('./firebase-sync.js');await connectCloud({room,status:m=>$('syncStatus').textContent=m.toUpperCase()});}
 catch(e){$('syncStatus').textContent='LOCAL · FIREBASE UNAVAILABLE';console.warn('Firebase connection failed',e);}}
launchFirebase();
