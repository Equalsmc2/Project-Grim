import {CONDITION_OPTIONS,getState,getOptions,subscribe,updateState,escapeHtml} from './state.js';
import {PLAYER_NUMBER_FIELDS,PLAYER_TEXT_FIELDS,normalizePlayerEdit,applyPlayerEdit} from './player-fields.js';
import {openAvatarMaker,refreshAvatarArt} from './avatar-maker.js';
import {AVATAR_ART_VERSION} from './avatar-art.js';

const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search),options=getOptions();
const online=params.get('online')==='1'||(params.get('online')!=='0'&&options.online);
const room=String(params.get('room')||options.room||'grim-demo').toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,60)||'grim-demo';
const selectionKey=`grim:player:selected:${room}`;
let selectedId='';try{selectedId=localStorage.getItem(selectionKey)||'';}catch{}
let cloud=null,ready=!online,connectionLabel='',connectionKind='warning';
let expandedConditions=!matchMedia('(max-width:600px)').matches;
let expandedProfile=!matchMedia('(max-width:600px)').matches;
const pending=new Map(),writeChains=new Map();
const playerCharacters=()=>getState().characters.filter(c=>c.faction!=='enemy');
const valueFor=(c,field)=>pending.get(`${c.id}/${field}`)?.value??c[field];
const initial=(name)=>String(name||'').trim().charAt(0).toUpperCase()||'◇';
const portrait=c=>typeof c.portrait==='string'&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(c.portrait);
const visual=c=>portrait(c)?`<img src="${c.portrait}" alt="">`:escapeHtml(initial(c.name));

function status(message,kind='ready'){
  connectionLabel=message;connectionKind=kind;
  const node=$('playerStatus');node.dataset.status=kind;node.querySelector('span').textContent=message;
}
function currentCharacter(){return playerCharacters().find(c=>c.id===selectedId);}
function render(){
  const characters=ready?playerCharacters():[];
  if(!characters.some(c=>c.id===selectedId))selectedId=characters[0]?.id||'';
  $('playerCount').textContent=String(characters.length);
  $('playerCharacters').innerHTML=characters.map(c=>{
    const active=c.id===selectedId;
    return `<button type="button" class="player-character-choice" data-character="${escapeHtml(c.id)}" aria-pressed="${active}" aria-label="Select ${escapeHtml(c.name)}"><span class="player-avatar">${visual(c)}</span><span class="player-choice-copy"><strong>${escapeHtml(c.name)}</strong><small>${escapeHtml(c.className||'Adventurer')} · LEVEL ${Number(c.level)||1}</small></span><span class="player-choice-chevron" aria-hidden="true">${active?'◆':'›'}</span></button>`;
  }).join('');
  if(!ready){
    $('playerSheet').innerHTML='<div class="player-empty"><span class="player-empty-symbol" aria-hidden="true">◇</span><h2>Connecting to the table</h2><p>Waiting for your DM’s characters to load. Keep this page open.</p></div>';
    return;
  }
  const c=currentCharacter();
  if(!c){
    $('playerSheet').innerHTML='<div class="player-empty"><span class="player-empty-symbol" aria-hidden="true">◇</span><h2>No player characters yet</h2><p>Ask your DM to add a player under Combatant cards. The new character will appear automatically.</p></div>';
    return;
  }
  // Background cloud updates must not throw away a mobile keyboard mid-edit.
  if($('playerSheet').contains(document.activeElement)&&document.activeElement?.matches('input'))return;
  const hp=Number(valueFor(c,'hp'))||0,maxHp=Math.max(1,Number(valueFor(c,'maxHp'))||1),pct=Math.max(0,Math.min(100,Math.round(hp/maxHp*100)));
  const cond=normalizePlayerEdit('conditions',valueFor(c,'conditions'));
  const activeCondition=name=>cond.find(value=>value===name||value.startsWith(name+' '));
  const numberField=(field)=>{
    const def=PLAYER_NUMBER_FIELDS[field];
    return `<div class="player-stat"><label for="p-${field}">${def.label}</label><input id="p-${field}" data-field="${field}" type="number" inputmode="numeric" min="${def.min}" max="${def.max}" step="1" value="${escapeHtml(valueFor(c,field)??0)}" aria-label="${def.label}"></div>`;
  };
  const profileField=(field,label)=>`<div class="player-profile-field"><label for="p-${field}">${label}</label><input id="p-${field}" data-field="${field}" maxlength="${PLAYER_TEXT_FIELDS[field]}" value="${escapeHtml(valueFor(c,field)||'')}" aria-label="${label}"></div>`;
  $('playerSheet').innerHTML=`
    <div class="player-sheet-hero"><div class="player-hero-row"><div class="player-hero-art">${visual(c)}</div><div class="player-hero-copy"><span class="player-kicker">PLAYER CHARACTER · LIVE SHEET</span><h2>${escapeHtml(valueFor(c,'name'))}</h2><p>${escapeHtml(valueFor(c,'ancestry')||'Adventurer')} · ${escapeHtml(valueFor(c,'className')||'Adventurer')}</p><div class="player-hero-tags"><span>LEVEL ${escapeHtml(valueFor(c,'level'))}</span><span>${c.hidden?'HIDDEN FROM STAGE':'ON THE PARTY ROSTER'}</span></div><div class="player-hero-tools"><button type="button" data-open-maker="1" aria-label="Make a portrait for this character">Make portrait</button></div></div></div></div>
    <div class="player-sheet-body"><section aria-label="Hit point controls"><div class="player-section-title"><h3>Hit points</h3><small>Update your HP quickly</small></div><div class="player-health-card"><div class="player-health-top"><div class="player-health-total">${hp} <span>/ ${maxHp} HP</span></div><strong class="player-health-percent">${pct}%</strong></div><div class="player-health-track" role="progressbar" aria-label="Current hit points" aria-valuenow="${hp}" aria-valuemin="0" aria-valuemax="${maxHp}"><i class="${pct<=30?'low':''}" style="width:${pct}%"></i></div><div class="player-hp-actions"><button type="button" data-hp-step="-5" aria-label="Subtract five hit points">− 5</button><button type="button" data-hp-step="-1" aria-label="Subtract one hit point">− 1</button><button type="button" data-hp-step="1" aria-label="Add one hit point">+ 1</button><button type="button" data-hp-step="5" aria-label="Add five hit points">+ 5</button></div></div></section>
      <section aria-label="Character statistics"><div class="player-section-title"><h3>Character values</h3><small>Tap a value to edit</small></div><div class="player-stats-grid">${['hp','maxHp','tempHp','ac','initiative','perception','level'].map(numberField).join('')}</div></section>
      <details class="player-detail-section" data-expand="conditions" ${expandedConditions?'open':''}><summary class="player-section-title"><h3>Conditions</h3><small>${cond.length?`${cond.length} active · `:''}Tap to ${expandedConditions?'collapse':'expand'} <span aria-hidden="true">⌄</span></small></summary><div class="player-conditions">${CONDITION_OPTIONS.map(name=>`<button type="button" class="player-condition" data-condition="${escapeHtml(name)}" aria-pressed="${!!activeCondition(name)}">${escapeHtml(activeCondition(name)||name)}${activeCondition(name)?' ✓':''}</button>`).join('')}</div></details>
      <details class="player-detail-section" data-expand="profile" ${expandedProfile?'open':''}><summary class="player-section-title"><h3>Character details</h3><small>Shown on your stage card <span aria-hidden="true">⌄</span></small></summary><div class="player-profile-fields">${profileField('name','Name')}${profileField('ancestry','Ancestry')}${profileField('className','Class')}</div></details>
      <p class="player-sheet-hint">${online?'Changes are sent to your room. Your DM needs to be connected for them to appear on the stage.':'Local preview: edits sync between tabs on this device. Ask your DM for an online player link to use a separate phone.'} The DM controls combat turns, scene, and character creation. You can make your own portrait.</p>
    </div>`;
}

function edit(field,value,portrait){
  const c=currentCharacter();if(!c||!ready)return;
  const normalized=normalizePlayerEdit(field,value);
  if(normalized===null){status('Enter a valid value before saving','warning');render();return;}
  if(!online){
    updateState(next=>{if(applyPlayerEdit(next,c.id,field,normalized)&&field==='avatar'){const updated=next.characters.find(item=>item.id===c.id);if(updated){updated.portrait=portrait;updated.portraitAvatar=normalized;updated.portraitArtVersion=AVATAR_ART_VERSION;}}});
    status('Saved locally · stage tabs updated');
    return;
  }
  if(!cloud){status('Not connected yet. Please try again.','warning');return;}
  const key=`${c.id}/${field}`;
  pending.set(key,{value:normalized});
  status('Sending change to your DM…','warning');render();
  const previous=writeChains.get(key)||Promise.resolve();
  const next=previous.catch(()=>{}).then(()=>cloud.submitPlayerEdit(c.id,field,normalized));
  writeChains.set(key,next);
  void next.then(()=>{
    if(writeChains.get(key)===next)status('Saved to the room · awaiting DM');
  }).catch(error=>{
    if(writeChains.get(key)!==next)return;
    pending.delete(key);
    status('Could not save: '+(String(error.message).includes('PERMISSION_DENIED')?'ask your DM to publish the updated Firebase rules':error.message),'error');
    render();
  });
}

$('playerCharacters').addEventListener('click',event=>{
  const button=event.target.closest('[data-character]');if(!button)return;
  selectedId=button.dataset.character;
  try{localStorage.setItem(selectionKey,selectedId);}catch{}
  render();
});
$('playerSheet').addEventListener('click',event=>{
  const creator=event.target.closest('[data-open-maker]');
  if(creator){
    const c=currentCharacter();if(!c)return;
    openAvatarMaker({name:c.name,initial:valueFor(c,'avatar')||'',onSave:async({code,portrait})=>edit('avatar',code,portrait)});
    return;
  }
  const step=event.target.closest('[data-hp-step]');
  if(step){const c=currentCharacter();if(c)edit('hp',Number(valueFor(c,'hp'))+Number(step.dataset.hpStep));return;}
  const chip=event.target.closest('[data-condition]');
  if(chip){const c=currentCharacter();if(!c)return;const names=normalizePlayerEdit('conditions',valueFor(c,'conditions'));const name=chip.dataset.condition;const active=names.some(n=>n===name||n.startsWith(name+' '));const numbered=/^(Frightened|Stunned|Dying|Wounded|Slowed|Sickened|Clumsy|Enfeebled|Drained)$/.test(name);edit('conditions',active?names.filter(n=>n!==name&&!n.startsWith(name+' ')):[...names,numbered?`${name} 1`:name]);}
});
$('playerSheet').addEventListener('change',event=>{
  const field=event.target.dataset.field;
  if(field)edit(field,event.target.value);
});
$('playerSheet').addEventListener('toggle',event=>{
  const details=event.target;
  if(details.dataset?.expand==='conditions')expandedConditions=details.open;
  if(details.dataset?.expand==='profile')expandedProfile=details.open;
},true);
$('playerSheet').addEventListener('focusout',event=>{
  if(event.target.matches('input'))setTimeout(render,0);
});
subscribe((state)=>{
  for(const [key,entry] of pending){
    const index=key.lastIndexOf('/'),id=key.slice(0,index),field=key.slice(index+1);
    const character=state.characters.find(c=>c.id===id&&c.faction!=='enemy');
    if(!character){pending.delete(key);continue;}
    const received=normalizePlayerEdit(field,character[field]);
    if(JSON.stringify(received)===JSON.stringify(entry.value))pending.delete(key);
  }
  render();
});

$('playerRoom').textContent=online?`ROOM · ${room.toUpperCase()}`:'LOCAL TABLE';
const stageUrl=new URL('index.html',location.href);
if(online){stageUrl.searchParams.set('online','1');stageUrl.searchParams.set('room',room);}
else{stageUrl.searchParams.delete('online');stageUrl.searchParams.delete('room');}
document.querySelector('.player-stage-link').href=stageUrl.href;
if(!online){status('Local mode · edits sync on this device','warning');render();refreshAvatarArt();}
else{
  status('Connecting to your DM’s room…','warning');render();
  try{
    const {connectCloud}=await import('./firebase-sync.js');
    cloud=await connectCloud({dm:false,player:true,room,
      status:message=>{if(!ready||/blocked|offline|unavailable/i.test(message))status(message,/blocked|unavailable/i.test(message)?'error':'warning');},
      onStateLoaded:exists=>{
        ready=exists;
        if(exists)status('Connected · sheet updates are live');
        else status('Waiting for your DM to publish this room','warning');
        render();
      }
    });
  }catch(error){status(`Could not connect to this room: ${error.message}`,'error');console.error(error);}
}
