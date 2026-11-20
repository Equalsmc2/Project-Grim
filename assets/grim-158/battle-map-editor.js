import {getState,subscribe,updateState,escapeHtml} from './state.js';
import {
  TERRAIN,MAP_LIMIT,MAP_MIN_WIDTH,MAP_MAX_WIDTH,MAP_MIN_HEIGHT,MAP_MAX_HEIGHT,
  createBattleMap,getActiveBattleMap,getBattlePositions,tileType,
  paintBattleTile,placeBattleToken,resizeBattleMap
} from './battle-map-state.js';
import {createBattleMap3D} from './battle-map-3d.js?v=2';

const root=document.getElementById('battleMapEditor');
if(root){
  let brush='wall',placingId='',painting=false,lastCell=null,rendered='',preview=null,previewMode='build';
  root.innerHTML=`
    <div class="battle-editor-top">
      <label class="field"><span>Map</span><select id="battleMapSelect" aria-label="Choose saved battle map"></select></label>
      <button type="button" class="button button-secondary" id="battleNewMap">+ New map</button>
      <button type="button" class="button button-secondary" id="battleDeleteMap">Delete</button>
      <button type="button" class="button button-primary" id="battlePresent">Present on stage</button>
    </div>
    <div class="battle-editor-settings">
      <label class="field battle-name"><span>Map name</span><input id="battleMapName" maxlength="48" autocomplete="off"></label>
      <label class="field"><span>Width</span><input id="battleMapWidth" type="number" min="${MAP_MIN_WIDTH}" max="${MAP_MAX_WIDTH}" inputmode="numeric"></label>
      <label class="field"><span>Height</span><input id="battleMapHeight" type="number" min="${MAP_MIN_HEIGHT}" max="${MAP_MAX_HEIGHT}" inputmode="numeric"></label>
      <button type="button" class="button button-secondary" id="battleResize">Resize</button>
    </div>
    <div class="battle-editor-workspace">
      <div class="battle-tools">
        <strong>Build the 3D battlefield</strong>
        <div id="battleBrushes" class="battle-brushes" role="group" aria-label="Terrain paint tools">
          ${TERRAIN.map(t=>`<button type="button" data-brush="${t.key}" class="battle-brush battle-terrain-${t.key}" aria-pressed="false">${t.label}</button>`).join('')}
        </div>
        <label class="field"><span>Or position a card</span><select id="battleTokenSelect"><option value="">Paint terrain</option></select></label>
        <p class="helper">Click or drag in the 3D view or the plan to place pieces. Choose a card to position it. Walls and solid obstacles stop movement.</p>
        <button type="button" class="button button-secondary" id="battleClearTerrain">Clear terrain</button>
      </div>
      <div class="battle-edit-stage">
        <div class="battle-edit-heading"><strong id="battleEditTitle">Battlefield</strong><span id="battleEditSize">16 × 12 · 5 ft squares</span></div>
        <div class="battle-three-preview">
          <div class="battle-three-header">
            <strong>3D encounter</strong>
            <div class="battle-preview-controls" role="group" aria-label="3D camera and building tools">
              <button type="button" class="button button-secondary" data-preview-mode="build" aria-pressed="true">Build</button>
              <button type="button" class="button button-secondary" data-preview-mode="orbit" aria-pressed="false">Rotate</button>
              <button type="button" class="button button-secondary" data-preview-mode="pan" aria-pressed="false">Move camera</button>
              <button type="button" class="button button-secondary" id="battleViewReset">Reset view</button>
            </div>
          </div>
          <div id="battlePreviewViewport" class="battle-three-viewport"></div>
          <div class="battle-view-hint">Drag to use the selected tool · Right/Alt-drag to rotate · Shift/middle-drag to pan · Scroll to zoom</div>
        </div>
        <details class="battle-plan-details">
          <summary>Plan view <span>Open the precise 2D placement grid</span></summary>
          <div id="battleEditBoard" class="battle-edit-board" role="grid" aria-label="Paintable battle map"></div>
        </details>
        <p class="helper" id="battleMapHint">Maps save automatically to the current room. Present the map when the encounter begins.</p>
      </div>
    </div>`;

  const $=id=>root.querySelector('#'+id);
  const board=$('battleEditBoard');
  function render(state){
    const map=getActiveBattleMap(state);if(!map)return;
    const select=$('battleMapSelect');
    const opts=state.battleMaps.maps.map(m=>`<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)}</option>`).join('');
    if(select.innerHTML!==opts)select.innerHTML=opts;
    select.value=map.id;
    if(document.activeElement!==$('battleMapName'))$('battleMapName').value=map.name;
    if(document.activeElement!==$('battleMapWidth'))$('battleMapWidth').value=map.width;
    if(document.activeElement!==$('battleMapHeight'))$('battleMapHeight').value=map.height;
    $('battleDeleteMap').disabled=state.battleMaps.maps.length<=1;
    $('battleNewMap').disabled=state.battleMaps.maps.length>=MAP_LIMIT;
    $('battlePresent').textContent=state.battleMaps.enabled&&state.mode==='combat'?'Hide battle map':'Present on stage';
    $('battlePresent').setAttribute('aria-pressed',String(state.battleMaps.enabled&&state.mode==='combat'));
    $('battleEditTitle').textContent=map.name;
    $('battleEditSize').textContent=`${map.width} × ${map.height} · 5 ft squares`;
    $('battleMapHint').textContent=state.battleMaps.enabled&&state.mode==='combat'?'Battle map is live on the stage. Players can move their selected cards with the arrows on their phones.':'Map is not presented. Editing still saves to the room.';
    $('battleBrushes').querySelectorAll('[data-brush]').forEach(b=>b.setAttribute('aria-pressed',String(!placingId&&b.dataset.brush===brush)));
    const tokenList=state.characters.map(c=>`<option value="${escapeHtml(c.id)}">${c.faction==='enemy'?'◆':'●'} ${escapeHtml(c.name)}</option>`).join('');
    const tokenSelect=$('battleTokenSelect');
    const desired=`<option value="">Paint terrain</option>`+tokenList;
    if(tokenSelect.innerHTML!==desired)tokenSelect.innerHTML=desired;
    if(!state.characters.some(c=>c.id===placingId))placingId='';
    tokenSelect.value=placingId;
    const positions=getBattlePositions(map,state.characters);
    preview?.setMap(map,state.characters,state.combat.activeId,state.presentation.cardScale);
    const cardByCell=new Map();
    for(const c of state.characters){const p=positions.get(c.id);if(p)cardByCell.set(`${p.x}:${p.y}`,c);}
    const signature=JSON.stringify([map.id,map.rows,map.width,map.height,[...cardByCell].map(([key,c])=>[key,c.id,c.name,c.faction])]);
    if(signature===rendered)return;
    rendered=signature;
    board.style.gridTemplateColumns=`repeat(${map.width},minmax(0,1fr))`;
    board.style.aspectRatio=`${map.width} / ${map.height}`;
    let html='';
    for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++){
      const type=tileType(map,x,y),character=cardByCell.get(`${x}:${y}`);
      const occupant=character?`<span class="battle-edit-piece ${character.faction==='enemy'?'is-enemy':'is-player'}" title="${escapeHtml(character.name)}">${escapeHtml(character.name.slice(0,2).toUpperCase())}</span>`:'';
      html+=`<button type="button" tabindex="-1" role="gridcell" class="battle-cell battle-terrain-${type.key}" data-x="${x}" data-y="${y}" title="${type.label} · ${x+1},${y+1}${character?' · '+escapeHtml(character.name):''}" aria-label="Column ${x+1}, row ${y+1}, ${type.label}${character?', '+escapeHtml(character.name):''}">${occupant}</button>`;
    }
    board.innerHTML=html;
  }
  subscribe(render);
  const section=root.closest('.dm-section');
  const activatePreview=()=>{
    if(preview||!section?.classList.contains('active'))return;
    try{
      preview=createBattleMap3D($('battlePreviewViewport'),{
        onCell:(cell,phase)=>{if(phase==='start')lastCell=null;paintTo(cell);}
      });
      preview.setView('tactical');preview.setInteractionMode(previewMode);render(getState());
    }catch(error){
      console.warn('3D editor unavailable:',error);
      $('battlePreviewViewport').textContent='3D preview unavailable on this device. The plan view below still works.';
    }
  };
  const observer=new MutationObserver(activatePreview);
  if(section)observer.observe(section,{attributes:true,attributeFilter:['class']});
  activatePreview();
  window.addEventListener('pagehide',()=>{observer.disconnect();preview?.dispose();preview=null;});
  $('battleMapSelect').onchange=e=>updateState(s=>{s.battleMaps.activeId=e.target.value;});
  $('battleMapName').onchange=e=>updateState(s=>{const map=getActiveBattleMap(s);if(map)map.name=String(e.target.value).trim().slice(0,48)||'Battlefield';});
  $('battleNewMap').onclick=()=>{
    if(getState().battleMaps.maps.length>=MAP_LIMIT)return;
    const id='battle-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6);
    updateState(s=>{
      const map=createBattleMap({id,name:`Map ${s.battleMaps.maps.length+1}`});
      s.battleMaps.maps.push(map);s.battleMaps.activeId=id;s.battleMaps.enabled=false;
    },'New battle map created');
  };
  $('battleDeleteMap').onclick=()=>{
    const state=getState(),map=getActiveBattleMap(state);
    if(!map||state.battleMaps.maps.length<=1||!confirm(`Delete map "${map.name}"?`))return;
    updateState(s=>{s.battleMaps.maps=s.battleMaps.maps.filter(m=>m.id!==map.id);s.battleMaps.activeId=s.battleMaps.maps[0].id;s.battleMaps.enabled=false;},'Battle map deleted');
  };
  $('battlePresent').onclick=()=>{
    const live=getState().battleMaps.enabled&&getState().mode==='combat';
    updateState(s=>{s.battleMaps.enabled=!live;if(!live)s.mode='combat';},live?'Battle map hidden':'Battle map presented');
  };
  $('battleResize').onclick=()=>updateState(s=>{resizeBattleMap(s,Number($('battleMapWidth').value),Number($('battleMapHeight').value));},'Battle map resized');
  $('battleClearTerrain').onclick=()=>{
    if(!confirm('Clear all terrain on this map? Card positions will remain.'))return;
    updateState(s=>{const map=getActiveBattleMap(s);if(map)map.rows=Array.from({length:map.height},()=>'.'.repeat(map.width));},'Battle map terrain cleared');
  };
  $('battleBrushes').onclick=e=>{
    const b=e.target.closest('[data-brush]');if(!b)return;
    brush=b.dataset.brush;placingId='';rendered='';render(getState());
  };
  $('battleTokenSelect').onchange=e=>{placingId=e.target.value;rendered='';render(getState());};
  root.querySelectorAll('[data-preview-mode]').forEach(button=>button.addEventListener('click',()=>{
    previewMode=button.dataset.previewMode;
    preview?.setInteractionMode(previewMode);
    root.querySelectorAll('[data-preview-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.previewMode===previewMode)));
  }));
  $('battleViewReset').onclick=()=>preview?.resetView();

  function cellFromPointer(event){
    const map=getActiveBattleMap(getState());if(!map)return null;
    const rect=board.getBoundingClientRect();
    const x=Math.floor((event.clientX-rect.left)/rect.width*map.width);
    const y=Math.floor((event.clientY-rect.top)/rect.height*map.height);
    return x>=0&&y>=0&&x<map.width&&y<map.height?{x,y}:null;
  }
  function paintTo(target){
    if(!target)return;
    if(lastCell&&lastCell.x===target.x&&lastCell.y===target.y)return;
    const from=lastCell||target;lastCell=target;
    const dx=Math.abs(target.x-from.x),dy=Math.abs(target.y-from.y);
    const n=Math.max(dx,dy)||1;
    updateState(s=>{
      for(let i=0;i<=n;i++){
        const x=Math.round(from.x+(target.x-from.x)*i/n),y=Math.round(from.y+(target.y-from.y)*i/n);
        if(placingId)placeBattleToken(s,placingId,x,y);
        else paintBattleTile(s,x,y,brush);
      }
    });
  }
  board.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    e.preventDefault();painting=true;lastCell=null;
    board.setPointerCapture?.(e.pointerId);
    paintTo(cellFromPointer(e));
  });
  board.addEventListener('pointermove',e=>{if(painting)paintTo(cellFromPointer(e));});
  const stop=()=>{painting=false;lastCell=null;};
  board.addEventListener('pointerup',stop);
  board.addEventListener('pointercancel',stop);
  window.addEventListener('pointerup',stop);
}
