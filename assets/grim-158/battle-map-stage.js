import {subscribe,escapeHtml} from './state.js';
import {getActiveBattleMap,getBattlePositions,tileType} from './battle-map-state.js';

const app=document.getElementById('stageApp');
const root=document.getElementById('battleMapStage');
let lastSignature='';
function fitBoard(){
  const viewport=root?.querySelector('.battle-stage-scroll'),grid=root?.querySelector('.battle-stage-grid');
  if(!viewport||!grid)return;
  const width=Number(grid.dataset.width),height=Number(grid.dataset.height);
  const cell=Math.max(1,Math.min((viewport.clientWidth-6)/width,(viewport.clientHeight-6)/height));
  grid.style.width=`${Math.floor(width*cell)}px`;
  grid.style.height=`${Math.floor(height*cell)}px`;
}
window.addEventListener('resize',fitBoard);

if(app&&root)subscribe(state=>{
  const active=state.mode==='combat'&&state.battleMaps?.enabled;
  const map=active&&getActiveBattleMap(state);
  app.classList.toggle('battle-map-active',!!map);
  root.hidden=!map;
  if(!map){lastSignature='';return;}
  const characters=state.characters.filter(c=>!c.hidden);
  const positions=getBattlePositions(map,state.characters);
  const signature=JSON.stringify([map,state.combat.activeId,characters.map(c=>[c.id,c.name,c.faction,c.portrait,c.hp,c.maxHp,c.conditions]),[...positions]]);
  if(lastSignature===signature)return;
  lastSignature=signature;
  const occupants=new Map();
  for(const c of characters){const pos=positions.get(c.id);if(pos)occupants.set(`${pos.x}:${pos.y}`,c);}
  const current=state.combat.activeId;
  let cells='';
  for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++){
    const tile=tileType(map,x,y),c=occupants.get(`${x}:${y}`);
    const image=c?.portrait&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(c.portrait)?`<img src="${c.portrait}" alt="">`:'';
    const token=c?`<div class="battle-stage-token ${c.faction==='enemy'?'is-enemy':'is-friendly'} ${c.id===current?'is-current':''}" title="${escapeHtml(c.name)}">${image||`<span>${escapeHtml(c.name.slice(0,2).toUpperCase())}</span>`}<small>${escapeHtml(c.name)}</small></div>`:'';
    cells+=`<div class="battle-stage-cell battle-terrain-${tile.key}" role="gridcell" aria-label="${x+1}, ${y+1}: ${tile.label}${c?', '+escapeHtml(c.name):''}">${token}</div>`;
  }
  root.innerHTML=`<div class="battle-stage-topline"><strong>${escapeHtml(map.name)}</strong><span>${map.width} × ${map.height} · 5 FT GRID</span></div><div class="battle-stage-scroll"><div class="battle-stage-grid" role="grid" aria-label="${escapeHtml(map.name)} tactical battle map" data-width="${map.width}" data-height="${map.height}" style="--map-width:${map.width};--map-height:${map.height}">${cells}</div></div>`;
  fitBoard();
});
