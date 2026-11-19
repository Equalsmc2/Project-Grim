import {subscribe} from './state.js';
import {getActiveBattleMap} from './battle-map-state.js';
import {createBattleMap3D} from './battle-map-3d.js';

const app=document.getElementById('stageApp');
const root=document.getElementById('battleMapStage');
let viewer=null;
export function getBattleWorld(){return viewer;}

if(app&&root)subscribe(state=>{
  const map=state.mode==='combat'&&state.battleMaps?.enabled?getActiveBattleMap(state):null;
  app.classList.toggle('battle-map-active',!!map);
  root.hidden=!map;
  if(!map){
    viewer?.dispose();viewer=null;root.replaceChildren();
    return;
  }
  if(!viewer){
    root.innerHTML='<div class="battle-stage-topline"><strong></strong><span>3D TABLETOP · 5 FT SQUARES</span></div><div class="battle-stage-canvas" id="battleStageCanvas"></div>';
    viewer=createBattleMap3D(document.getElementById('battleStageCanvas'));
    viewer.setView('ground');
  }
  root.querySelector('.battle-stage-topline strong').textContent=map.name;
  root.setAttribute('aria-label',`${map.name} 3D battle map`);
  viewer.setMap(map,state.characters,state.combat.activeId,state.presentation.cardScale);
});

window.addEventListener('pagehide',()=>{viewer?.dispose();viewer=null;});
