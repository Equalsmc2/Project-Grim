import {getState,subscribe,getScene,orderedCharacters,getOptions,escapeHtml,isEnemy} from './state.js';
const $=id=>document.getElementById(id);
const app=$('stageApp');
let yaw=0,pitch=0,lastSignature='';
const safeImg=x=>typeof x==='string'&&/^data:image\/(png|jpeg|webp);base64,[\w+/=]+$/.test(x)?x:'';
// Two independent formations: enemies in the far/upper line, PCs near/below.
// Layout is derived from visible cards, never initiative order, so combat turns
// cannot reorder cards or accidentally mix teams.
function clamp(x,min,max){return Math.min(max,Math.max(min,x));}
function makeFormation(characters,s,combat){
  const placements=new Map();
  const enemy=characters.filter(isEnemy), players=characters.filter(c=>!isEnemy(c));
  const hasBoth=enemy.length>0&&players.length>0;
  const width=Math.min(1180,innerWidth), available=Math.max(240,width-(innerWidth<690?26:84));
  // Card rows must leave vertical room for the initiative HUD below.
  const heightCap=clamp(.70+(innerHeight-768)*.00085,.45,1.14);
  const screenCap=innerWidth<690?.56:innerWidth<900?.72:1.16;
  const userScale=clamp(Number(s.presentation?.cardScale)||1,.5,1.25);
  const baseScale=Math.min(heightCap,screenCap,userScale);
  const bandGap=clamp(innerHeight*(innerWidth<690?.24:.30),175,305);
  for(const [type,group] of [['enemy',enemy],['player',players]]){
    if(!group.length)continue;
    // Keep small/medium encounters in a single readable row. Very large
    // rosters break into staggered rows *within their own side*.
    const rowLimit=innerWidth<690?4:innerWidth<1024?8:9;
    const rows=group.length>rowLimit?2:1;
    const perRow=Math.ceil(group.length/rows);
    const desired=(available-16*(perRow-1))/(197*perRow);
    const scale=clamp(Math.min(baseScale,desired,rows>1?Math.min(.48,.40+Math.max(0,innerHeight-768)*.00042):1.2),.40,1.2);
    const step=perRow<=1?0:Math.min(225*scale+18,(available-197*scale)/(perRow-1));
    const rowStep=rows>1?292*scale+12:0;
    const groupGap=rows>1?rowStep*2+14:bandGap;
    for(let i=0;i<group.length;i++){
      const row=Math.floor(i/perRow), inRow=i%perRow;
      const rowCount=Math.min(perRow,group.length-row*perRow);
      const x=(inRow-(rowCount-1)/2)*step;
      let y=(hasBoth?(type==='enemy'?-groupGap/2:groupGap/2):0);
      if(rows>1){y+=(row-(rows-1)/2)*rowStep; if(type==='player')y-=18;}
      // Focus moves slightly *toward* the opposing line without changing sides.
      const active=combat&&s.combat.activeId===group[i].id;
      if(active&&hasBoth)y+=type==='enemy'?20:-20;
      const z=(type==='enemy'?-48:18)+(active?95:0);
      const turn=(inRow-(rowCount-1)/2)*(type==='enemy'?3:-3);
      placements.set(group[i].id,{x,y,z,scale,turn,side:type,index:i});
    }
  }
  return {placements,hasBoth};
}
function cardHTML(c,s,place){
  const combat=s.mode==='combat',active=combat&&s.combat.activeId===c.id;
  const {x,y,z,turn,scale,side,index}=place;
  const enemy=side==='enemy';
  const p=safeImg(c.portrait);
  const art=p?`<img src="${p}" alt="Portrait of ${escapeHtml(c.name)}">`:`<span class="card-placeholder">${enemy?'NPC':'PC'} ${String(index+1).padStart(2,'0')}</span>`;
  return `<div class="card-position ${enemy?'enemy-position':'player-position'}${c.hidden?' is-hidden':''}" data-faction="${side}" style="--px:${x}px;--py:${y}px;--pz:${z}px;--rotation:${turn}deg;--card-s:${scale}">
   <article class="lam-card ${enemy?'enemy-card':'player-card'}${active?' active':''}" aria-label="${escapeHtml(c.name)} card"><div class="card-back"></div><div class="card-bevel"></div><div class="card-face"><div class="card-inner"><div class="card-topline"><span>${enemy?'◆ ENEMY / NPC':'● PLAYER / PC'}</span><span>LVL ${Number(c.level)||1}</span></div><div class="card-art"><span class="card-art-mark">${escapeHtml(c.symbol||'✦')}</span>${art}</div><h3 class="card-character-name">${escapeHtml(c.name)}</h3><p class="card-class">${escapeHtml(c.ancestry)} · ${escapeHtml(c.className)}</p><div class="card-divider"></div><div class="card-stats"><div class="stat-sm"><small>HP</small>${Math.max(0,c.hp)}/${c.maxHp}</div><div class="stat-sm"><small>AC</small>${c.ac}</div><div class="stat-sm"><small>${combat?'INIT':'LEVEL'}</small>${combat?c.initiative:c.level}</div></div></div></div>
   ${combat&&c.conditions?.length?`<div class="card-conditions">${c.conditions.slice(0,3).map(k=>`<span class="condition-ribbon">${escapeHtml(k)}</span>`).join('')}</div>`:''}
   ${active?`<div class="turn-marker">${enemy?'◆ ENEMY TURN':'● PLAYER TURN'}</div>`:''}</article></div>`;
}
function render(s){
 const scene=getScene(s),combat=s.mode==='combat';
 app.dataset.palette=scene.palette;
 $('chapterLabel').textContent=scene.kicker;
 $('stageModeLabel').textContent=combat?'COMBAT MODE':'SCENE MODE';
  $('sceneTitle').textContent=scene.name;
 $('sceneDescription').textContent=scene.description;
 $('sceneAmbience').textContent=scene.ambience;
 $('sceneFooter').textContent=scene.name.toUpperCase();
 $('sceneInfo').hidden=combat;
 $('combatInfo').hidden=!combat;
 const chars=s.characters.filter(c=>!c.hidden&&(combat||s.presentation?.showSceneCards));
 const formation=makeFormation(chars,s,combat);
 $('formationVersus').hidden=!combat||!formation.hasBoth;
 const signature=JSON.stringify([chars,s.mode,s.combat.activeId,s.presentation.cardScale,innerWidth,innerHeight]);
 if(signature!==lastSignature){$('cardPositions').innerHTML=chars.map(c=>cardHTML(c,s,formation.placements.get(c.id))).join('');lastSignature=signature;}
 if(combat){$('roundDisplay').textContent=s.combat.round;const current=s.characters.find(c=>c.id===s.combat.activeId);$('turnDisplay').textContent=current?`${isEnemy(current)?'◆ ENEMY':'● PLAYER'} · ${current.name}'s turn`:'No active character';$('initiativeTrack').innerHTML=orderedCharacters(s).filter(c=>!c.hidden).map(c=>`<span class="initiative-chip ${isEnemy(c)?'enemy-chip':'player-chip'}${current?.id===c.id?' active':''}"><b>${escapeHtml(c.initiative)}</b> ${isEnemy(c)?'◆':'●'} ${escapeHtml(c.name)}</span>`).join('');}
 app.classList.toggle('scene-mode',!combat);
 let hiddenByViewer=false;try{hiddenByViewer=localStorage.getItem('grim:hideHud')==='true';}catch{}
 app.classList.toggle('ui-hidden',!s.presentation.showHud||hiddenByViewer);
}
subscribe(render);
window.addEventListener('resize',()=>{lastSignature='';render(getState());});
function updateCamera(){const node=$('room3d');node.style.setProperty('--camera-yaw',yaw+'deg');node.style.setProperty('--camera-pitch',pitch+'deg');}
window.addEventListener('mousemove',e=>{const x=e.clientX/innerWidth-.5,y=e.clientY/innerHeight-.5;document.querySelectorAll('.lam-card').forEach(card=>{card.style.setProperty('--tilt-y',`${x*7}deg`);card.style.setProperty('--tilt-x',`${-y*4}deg`);card.style.setProperty('--shine',`${x*12}%`);});},{passive:true});
function hudToggle(){try{const v=!(localStorage.getItem('grim:hideHud')==='true');localStorage.setItem('grim:hideHud',v?'true':'false');}catch{app.classList.toggle('ui-hidden');return;}render(getState());}
$('toggleHud').onclick=hudToggle;
$('fullscreen').onclick=()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.();};
window.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(key==='h')hudToggle();else if(key==='f')$('fullscreen').click();else if(e.key==='ArrowLeft'){yaw=Math.max(-24,yaw-6);updateCamera();}else if(e.key==='ArrowRight'){yaw=Math.min(24,yaw+6);updateCamera();}else if(e.key==='ArrowUp'){pitch=Math.max(-9,pitch-3);updateCamera();}else if(e.key==='ArrowDown'){pitch=Math.min(9,pitch+3);updateCamera();}else if(key==='0'){yaw=0;pitch=0;updateCamera();}});
async function launchFirebase(){const q=new URLSearchParams(location.search);const opts=getOptions();const online=q.get('online')==='1'||opts.online;if(!online)return;const room=q.get('room')||opts.room;
 try{const {connectCloud}=await import('./firebase-sync.js');await connectCloud({room,status:m=>$('syncStatus').textContent=m.toUpperCase()});}
 catch(e){$('syncStatus').textContent='LOCAL · FIREBASE UNAVAILABLE';console.warn('Firebase connection failed',e);}}
launchFirebase();
