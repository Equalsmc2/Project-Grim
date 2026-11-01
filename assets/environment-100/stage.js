import {getState,subscribe,getScene,orderedCharacters,getOptions,escapeHtml,isEnemy} from './state.js';
const $=id=>document.getElementById(id);
const app=$('stageApp');
const stage=$('stageMain');
let yaw=0,pitch=0,lastSignature='',world=null;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const safeImg=x=>typeof x==='string'&&/^data:image\/(png|jpeg|webp);base64,[\w+/=]+$/.test(x)?x:'';

// Turn order is global. Each team independently runs highest initiative on
// the LEFT to lowest on the RIGHT, keeping enemies across from the party.
function planFormation(s,visible,combat){
  const w=stage.clientWidth||innerWidth,h=stage.clientHeight||innerHeight;
  const initiativeList=orderedCharacters(s).filter(c=>visible.some(v=>v.id===c.id));
  const ranks=new Map(initiativeList.map((c,i)=>[c.id,i+1]));
  const enemies=initiativeList.filter(isEnemy),players=initiativeList.filter(c=>!isEnemy(c));
  const hasBoth=enemies.length>0&&players.length>0;
  const placements=new Map();
  const userScale=clamp(Number(s.presentation?.cardScale)||1,.5,1.25);
  const heightScale=clamp(h/925,.54,1.03);
  const maxPerRow=w>=1300?7:w>=1000?6:w>=730?5:w>=480?4:3;
  const sideWidth=Math.min(w-24,w>=1250?1120:w>=730?w*.91:w*.94);
  function placeTeam(team,side){
    if(!team.length)return;
    const rows=Math.ceil(team.length/maxPerRow);
    const perRow=Math.ceil(team.length/rows);
    const compact=rows>1?(w<700?.50:.67):1;
    const scale=clamp(Math.min(userScale*.90,heightScale*.92,sideWidth/(perRow*204),compact),.34,1.03);
    const cardWidth=188*scale;
    const step=perRow>1?Math.min(203*scale, (sideWidth-cardWidth)/(perRow-1)):0;
    const rowGap=rows>1?Math.min(264*scale+16,h*.205):0;
    // Opposing banks are equally balanced about the center of the battlefield.
    const anchorY = hasBoth ? (side==='enemy'?h*.325:h*.705) : h*.52;
    const teamHeight=Math.max(0,rows-1)*rowGap;
    team.forEach((c,i)=>{
      const row=Math.floor(i/perRow),col=i%perRow;
      const rowCount=Math.min(perRow,team.length-row*perRow);
      const x=w/2+(col-(rowCount-1)/2)*step;
      let y=anchorY+(row-(rows-1)/2)*rowGap;
      // A spotlight raises the card, not its logical place in initiative.
      const active=combat&&s.combat.activeId===c.id;
      if(active)y-=12;
      placements.set(c.id,{x,y,scale,side,active,rank:ranks.get(c.id),index:i});
    });
  }
  placeTeam(enemies,'enemy');placeTeam(players,'player');
  return {placements,enemies,players,hasBoth};
}

function cardHTML(c,s,p){
  const enemy=p.side==='enemy',combat=s.mode==='combat';
  const img=safeImg(c.portrait);
  const art=img?`<img src="${img}" alt="Portrait of ${escapeHtml(c.name)}">`:`<span class="card-placeholder">${enemy?'NPC':'PC'} ${String(p.index+1).padStart(2,'0')}</span>`;
  return `<div class="card-position ${enemy?'enemy-position':'player-position'}" data-faction="${p.side}" data-combatant-id="${escapeHtml(c.id)}" data-turn-rank="${p.rank}" style="--px:${p.x}px;--py:${p.y}px;--unit-scale:${p.scale};--depth:${enemy?0:1}">
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
  const layout=planFormation(s,chars,combat);
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
window.addEventListener('mousemove',e=>{const x=e.clientX/innerWidth-.5,y=e.clientY/innerHeight-.5;document.querySelectorAll('.lam-card').forEach(card=>{card.style.setProperty('--tilt-y',`${x*4}deg`);card.style.setProperty('--tilt-x',`${-y*2}deg`);});},{passive:true});
function hudToggle(){try{const v=!(localStorage.getItem('grim:hideHud')==='true');localStorage.setItem('grim:hideHud',v?'true':'false');}catch{app.classList.toggle('ui-hidden');return;}render(getState());}
$('toggleHud').onclick=hudToggle;
$('fullscreen').onclick=()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.();};
window.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(key==='h')hudToggle();else if(key==='f')$('fullscreen').click();else if(e.key==='ArrowLeft'){yaw=Math.max(-16,yaw-4);updateCamera();}else if(e.key==='ArrowRight'){yaw=Math.min(16,yaw+4);updateCamera();}else if(e.key==='ArrowUp'){pitch=Math.max(-7,pitch-2);updateCamera();}else if(e.key==='ArrowDown'){pitch=Math.min(7,pitch+2);updateCamera();}else if(key==='0'){yaw=0;pitch=0;updateCamera();}});
async function launchFirebase(){const q=new URLSearchParams(location.search);const opts=getOptions();const online=q.get('online')==='1'||opts.online;if(!online)return;const room=q.get('room')||opts.room;
 try{const {connectCloud}=await import('./firebase-sync.js');await connectCloud({room,status:m=>$('syncStatus').textContent=m.toUpperCase()});}
 catch(e){$('syncStatus').textContent='LOCAL · FIREBASE UNAVAILABLE';console.warn('Firebase connection failed',e);}}
launchFirebase();

async function launchWorld(){
 try {
  if(new URLSearchParams(location.search).get('webgl')==='0')throw new Error('Fallback requested');
  const {createWorld}=await import('./world.js');world=createWorld($('worldCanvas'),stage);
  app.classList.add('webgl-ready');$('worldStatus').textContent='3D WORLD';render(getState());
 }catch(error){world?.dispose();world=null;app.classList.remove('webgl-ready');$('worldCanvas').replaceChildren();$('worldStatus').textContent='2D FALLBACK · 3D unavailable';console.warn('3D fallback:',error.message);}
}
launchWorld();
window.addEventListener('pagehide',()=>world?.dispose());
