import {getState,subscribe,getScene,orderedCharacters,getOptions,escapeHtml} from './state.js';
import {silhouettes} from './portraits.js';
const $=id=>document.getElementById(id);
const app=$('stageApp');
let yaw=0,pitch=0,lastSignature='';
const safeImg=x=>typeof x==='string'&&/^data:image\/(png|jpeg|webp);base64,[\w+/=]+$/.test(x)?x:'';
function cardHTML(c,s,index,total){
  const combat=s.mode==='combat',active=combat&&s.combat.activeId===c.id;
  const positions=total===1?[0]:Array.from({length:total},(_,i)=>i-(total-1)/2);
  const spacing=innerWidth<670?69:innerWidth<1000?160:total>6?145:total>4?172:230;
  const x=positions[index]*spacing,curve=Math.abs(positions[index])*(total>4?3:6);
  const back=Math.abs(positions[index])*(total>4?20:33);
  const z=active?80:-back;const ry=positions[index]*-5;
  const p=safeImg(c.portrait);
  const pct=Math.round(Math.max(0,Math.min(100,c.hp/Math.max(1,c.maxHp)*100)));
  const art=p?`<img src="${p}" alt="Portrait of ${escapeHtml(c.name)}">`:(silhouettes[c.accent]||silhouettes.gold);
  return `<div class="card-position${c.hidden?' is-hidden':''}" style="--px:${x}px;--py:${curve+(active?-35:0)}px;--pz:${z}px;--rotation:${ry}deg;--card-s:${Math.max(.52,Math.min(1.2,(s.presentation?.cardScale||1)*(total>=7?.67:total>=5?.84:1)))}">
   <article class="lam-card${active?' active':''}" data-accent="${['gold','violet','teal','rose'].includes(c.accent)?c.accent:'gold'}" aria-label="${escapeHtml(c.name)} card"><div class="card-back"></div><div class="card-bevel"></div><div class="card-face"><div class="card-inner"><div class="card-topline"><span>✥ GRIM</span><span>LVL ${Number(c.level)||1}</span></div><div class="card-art"><span class="card-art-mark">${escapeHtml(c.symbol||'✦')}</span>${art}</div><h3 class="card-character-name">${escapeHtml(c.name)}</h3><p class="card-class">${escapeHtml(c.ancestry)} · ${escapeHtml(c.className)}</p><div class="card-divider"></div><div class="card-stats"><div class="stat-sm"><small>HP</small>${Math.max(0,c.hp)}/${c.maxHp}</div><div class="stat-sm"><small>AC</small>${c.ac}</div><div class="stat-sm"><small>${combat?'INIT':'LEVEL'}</small>${combat?c.initiative:c.level}</div></div></div></div>
   ${combat&&c.conditions?.length?`<div class="card-conditions">${c.conditions.slice(0,3).map(k=>`<span class="condition-ribbon">${escapeHtml(k)}</span>`).join('')}</div>`:''}
   ${active?`<div class="turn-marker">✧ ACTIVE TURN ✧</div>`:''}</article></div>`;
}
function render(s){
 const scene=getScene(s),combat=s.mode==='combat';
 app.dataset.palette=scene.palette;
 $('chapterLabel').textContent=scene.kicker;
 $('stageModeLabel').textContent=combat?'COMBAT MODE':'SCENE MODE';
 $('rearSigil').textContent=scene.sigil;
 $('sceneTitle').textContent=scene.name;
 $('sceneDescription').textContent=scene.description;
 $('sceneAmbience').textContent=scene.ambience;
 $('sceneFooter').textContent=scene.name.toUpperCase();
 $('sceneInfo').hidden=combat;
 $('combatInfo').hidden=!combat;
 const chars=s.characters.filter(c=>!c.hidden&&(combat||s.presentation?.showSceneCards)),count=chars.length;
 const signature=JSON.stringify([chars,s.mode,s.combat.activeId,s.presentation.cardScale]);
 if(signature!==lastSignature){$('cardPositions').innerHTML=chars.map((c,i)=>cardHTML(c,s,i,count)).join('');lastSignature=signature;}
 if(combat){$('roundDisplay').textContent=s.combat.round;const current=s.characters.find(c=>c.id===s.combat.activeId);$('turnDisplay').textContent=current?`${current.name}'s turn`:'No active character';$('initiativeTrack').innerHTML=orderedCharacters(s).filter(c=>!c.hidden).map(c=>`<span class="initiative-chip${current?.id===c.id?' active':''}"><b>${escapeHtml(c.initiative)}</b> ${escapeHtml(c.name)}</span>`).join('');}
 app.classList.toggle('scene-mode',!combat);
 app.classList.toggle('ui-hidden',!s.presentation.showHud||localStorage.getItem('grim:hideHud')==='true');
}
subscribe(render);
window.addEventListener('resize',()=>{lastSignature='';render(getState());});
for(let i=0;i<38;i++){const p=document.createElement('span');p.className='dust';p.style.setProperty('--x',`${Math.random()*100}%`);p.style.setProperty('--y',`${Math.random()*100}%`);p.style.setProperty('--dur',`${12+Math.random()*16}s`);p.style.setProperty('--delay',`${Math.random()*-25}s`);$('dustLayer').appendChild(p);}
function updateCamera(){const node=$('room3d');node.style.setProperty('--camera-yaw',yaw+'deg');node.style.setProperty('--camera-pitch',pitch+'deg');}
window.addEventListener('mousemove',e=>{const x=e.clientX/innerWidth-.5,y=e.clientY/innerHeight-.5;document.querySelectorAll('.lam-card').forEach(card=>{card.style.setProperty('--tilt-y',`${x*7}deg`);card.style.setProperty('--tilt-x',`${-y*4}deg`);card.style.setProperty('--shine',`${x*12}%`);});},{passive:true});
function hudToggle(){const v=!(localStorage.getItem('grim:hideHud')==='true');localStorage.setItem('grim:hideHud',v?'true':'false');render(getState());}
$('toggleHud').onclick=hudToggle;
$('fullscreen').onclick=()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.();};
window.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(key==='h')hudToggle();else if(key==='f')$('fullscreen').click();else if(e.key==='ArrowLeft'){yaw=Math.max(-24,yaw-6);updateCamera();}else if(e.key==='ArrowRight'){yaw=Math.min(24,yaw+6);updateCamera();}else if(e.key==='ArrowUp'){pitch=Math.max(-9,pitch-3);updateCamera();}else if(e.key==='ArrowDown'){pitch=Math.min(9,pitch+3);updateCamera();}else if(key==='0'){yaw=0;pitch=0;updateCamera();}});
async function launchFirebase(){const q=new URLSearchParams(location.search);const opts=getOptions();const online=q.get('online')==='1'||opts.online;if(!online)return;const room=q.get('room')||opts.room;
 try{const {connectCloud}=await import('./firebase-sync.js');await connectCloud({room,status:m=>$('syncStatus').textContent=m.toUpperCase()});}
 catch(e){$('syncStatus').textContent='LOCAL · FIREBASE UNAVAILABLE';console.warn('Firebase connection failed',e);}}
launchFirebase();
