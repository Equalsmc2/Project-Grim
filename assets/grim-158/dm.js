import {nextNavigationIndex} from './presentation-preferences.js';
import {SCENES,CONDITION_OPTIONS,getState,subscribe,updateState,getScene,orderedCharacters,adjustHp,randD20,defaultState,resetDemo,getOptions,setOptions,escapeHtml,prettyTime,isEnemy} from './state.js';
const $=id=>document.getElementById(id);
let section='overview';let selectedId=getState().characters[0]?.id;let cloud=null;let cloudConnecting=null;let cloudEpoch=0;let toastTimer;
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2800);}
function go(to){
 section=to;
 document.querySelectorAll('.nav-button').forEach(b=>{
   const active=b.dataset.section===to;
   b.classList.toggle('active',active);
   if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
 });
 document.querySelectorAll('.dm-section').forEach(el=>el.classList.toggle('active',el.dataset.section===to));
 $('pageTitle').textContent=({overview:'Overview',environment:'Environment',music:'Music library',scene:'Scene controls',combat:'Combat controls',cast:'Card editor',settings:'Connection & Setup'})[to];
 render(getState());
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 window.scrollTo?.({top:0,behavior:reduced?'instant':'smooth'});
}
function switchMode(mode){updateState(s=>{s.mode=mode;},mode==='scene'?'Scene mode presented':'Combat mode presented');toast(`${mode==='scene'?'Scene':'Combat'} now showing on stage`);}
function nextTurn(){updateState(s=>{const order=orderedCharacters(s).filter(c=>!c.hidden);if(!order.length)return;let index=order.findIndex(c=>c.id===s.combat.activeId);if(index===order.length-1||index<0){s.combat.round+=index<0?0:1;s.combat.activeId=order[0].id;}else s.combat.activeId=order[index+1].id;s.mode='combat';},'Initiative advanced');}
function metrics(s){const current=s.characters.find(c=>c.id===s.combat.activeId);const wounded=s.characters.filter(c=>c.hp<c.maxHp).length;$('metrics').innerHTML=[['STAGE',s.mode.toUpperCase(),'Scene or combat'],['COMBATANTS',s.characters.length,`${s.characters.filter(c=>!isEnemy(c)).length} ${s.characters.filter(c=>!isEnemy(c)).length===1?'player':'players'} · ${s.characters.filter(isEnemy).length} ${s.characters.filter(isEnemy).length===1?'enemy':'enemies'}`],['COMBAT ROUND',s.combat.round,`Active: ${current?.name||'None'}`],['WOUNDED',wounded,'Below maximum HP']].map(a=>`<div class="metric"><span>${escapeHtml(a[0])}</span><strong>${escapeHtml(a[1])}</strong><small>${escapeHtml(a[2])}</small></div>`).join('');}
function overview(s){const scene=getScene(s);$('overviewSceneTitle').textContent=scene.name;$('overviewSceneDesc').textContent=scene.description;
 const env=s.environment||{},mus=s.music||{};
 const hour=Math.floor(Number(env.timeOfDay)||0)%24,minute=Math.round(((Number(env.timeOfDay)||0)%1)*60)%60;
 const details=[['GROUND',`${env.ground||'blank'} / ${env.hills||'flat'}`],['WEATHER',env.weather||'none'],['TIME',`${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}${env.cycleEnabled?' · cycling':''}`],['MUSIC',mus.playing?'Playing':'Stopped']];
 const summary=details.map(([label,value])=>`<div class="overview-environment-item"><small>${label}</small><strong>${escapeHtml(value)}</strong></div>`).join('');
 if($('overviewEnvironment').innerHTML!==summary)$('overviewEnvironment').innerHTML=summary;$('activityLog').innerHTML=(s.log||[]).slice(-5).reverse().map(l=>`<div class="activity"><time>${prettyTime(l.time)}</time><span>${escapeHtml(l.text)}</span></div>`).join('')||'<p class="muted">No changes yet.</p>';}
function scenes(s){$('sceneSelector').innerHTML=SCENES.map(sc=>`<button class="scene-choice ${sc.id===s.sceneId?'selected':''}" data-scene="${sc.id}"><small>${escapeHtml(sc.kicker)}</small><strong>${escapeHtml((s.sceneOverrides[sc.id]||{}).name||sc.name)}</strong></button>`).join('');const sc=getScene(s);
 $('sceneLayoutPreview').dataset.palette=sc.palette;
 $('scenePreviewKicker').textContent=sc.kicker;
 $('scenePreviewTitle').textContent=sc.name;
 $('scenePreviewDescription').textContent=sc.description;
 $('scenePreviewAmbient').textContent=sc.ambience;
 if(document.activeElement!==$('sceneNameInput'))$('sceneNameInput').value=sc.name;
 if(document.activeElement!==$('sceneAmbientInput'))$('sceneAmbientInput').value=sc.ambience;
 if(document.activeElement!==$('sceneDescInput'))$('sceneDescInput').value=sc.description;
}
function renderCombat(s){$('dmRound').textContent=s.combat.round;const current=s.characters.find(c=>c.id===s.combat.activeId);$('dmTurn').textContent=current?`${isEnemy(current)?'◆ ENEMY':'● PLAYER'} · ${current.name}`:'No active turn';
 $('rosterCounts').textContent=`${s.characters.filter(c=>!isEnemy(c)).length} PLAYER · ${s.characters.filter(isEnemy).length} ENEMY`;
 $('combatRows').innerHTML=orderedCharacters(s).map(c=>{
 const pct=Math.round(Math.max(0,Math.min(100,c.hp/Math.max(1,c.maxHp)*100)));
 return `<div class="combat-row ${isEnemy(c)?'enemy-row':'player-row'}${c.id===s.combat.activeId?' active':''}${c.hidden?' muted':''}" data-id="${escapeHtml(c.id)}">
  <div class="initiative-number">${Number(c.initiative)||0}</div>
  <div class="character-caption"><span class="faction-chip ${isEnemy(c)?'is-enemy':'is-player'}">${isEnemy(c)?'◆ ENEMY':'● PLAYER'}</span><strong>${escapeHtml(c.name)}</strong><small>${escapeHtml(c.ancestry)} · ${escapeHtml(c.className)}</small></div>
  <div class="tiny-stat"><span>AC </span><b>${Number(c.ac)||10}</b><small style="display:block;margin-top:5px">${c.tempHp?`+${c.tempHp} TEMP HP`:''}</small></div>
  <div class="hp-cell"><div class="hp-meta"><span>HIT POINTS</span><strong>${c.hp} / ${c.maxHp}</strong></div><div class="hp-progress"><i class="${pct<=30?'low':''}" style="width:${pct}%"></i></div><div class="hp-buttons"><button aria-label="Damage ${escapeHtml(c.name)} by 5" data-hp="-5" data-id="${c.id}">−5</button><button aria-label="Damage ${escapeHtml(c.name)} by 1" data-hp="-1" data-id="${c.id}">−1</button><button aria-label="Heal ${escapeHtml(c.name)} by 1" data-hp="1" data-id="${c.id}">+1</button><button aria-label="Heal ${escapeHtml(c.name)} by 5" data-hp="5" data-id="${c.id}">+5</button></div></div>
  <div class="conditions-cell"><div class="condition-tags">${c.conditions?.length?c.conditions.map((x,i)=>`<button class="cond-tag" title="Click to remove" aria-label="Remove ${escapeHtml(x)} from ${escapeHtml(c.name)}" data-remove-condition="${i}" data-id="${c.id}">${escapeHtml(x)} ×</button>`).join(''):'<span class="no-conditions">No conditions</span>'}</div><div class="condition-edit"><select aria-label="Add condition to ${escapeHtml(c.name)}" id="condition-${escapeHtml(c.id)}"><option value="">Add a condition…</option>${CONDITION_OPTIONS.map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join('')}</select><button data-add-condition="${c.id}" title="Add selected condition" aria-label="Add selected condition to ${escapeHtml(c.name)}">+</button></div></div>
  <div class="select-cell"><button class="select-button" data-focus="${c.id}">${c.id===s.combat.activeId?'✦ ACTIVE':'SPOTLIGHT →'}</button><button class="edit-combatant" data-edit-combatant="${c.id}">Edit</button></div></div>`;}).join('')||'<p class="muted">Add a player or enemy to start an encounter.</p>';
}
function updateCastPreview(s){
 const c=s.characters.find(c=>c.id===selectedId);
 if(!c||!$('castLiveShell'))return;
 $('castLiveShell').dataset.faction=isEnemy(c)?'enemy':'player';
 $('castLiveName').textContent=c.name;
 $('castLiveType').textContent=isEnemy(c)?'◆ ENEMY CARD':'● PLAYER CARD';
 $('castLiveInfo').textContent=`${c.ancestry} · ${c.className} · LVL ${c.level}${c.hidden?' · HIDDEN':''}`;
 $('castLiveHp').textContent=`HP ${c.hp}/${c.maxHp}`;
 $('castLiveAc').textContent=`AC ${c.ac}`;
 $('castLiveInit').textContent=`INIT ${c.initiative}`;
 const art=$('castLiveArt');
 const image=art.querySelector('img');
 if(c.portrait?.startsWith('data:image/')){if(!image||image.src!==c.portrait)art.innerHTML=`<img alt="" src="${c.portrait}">`;}
 else art.textContent=String(s.characters.indexOf(c)+1).padStart(2,'0');
}
function cast(s){if(!s.characters.some(c=>c.id===selectedId))selectedId=s.characters[0]?.id;
 $('castCounts').textContent=`${s.characters.filter(c=>!isEnemy(c)).length} ${s.characters.filter(c=>!isEnemy(c)).length===1?'player':'players'} · ${s.characters.filter(isEnemy).length} ${s.characters.filter(isEnemy).length===1?'enemy':'enemies'}`;
 $('castList').innerHTML=s.characters.map(c=>`<button class="cast-entry ${isEnemy(c)?'enemy-entry':'player-entry'}${c.id===selectedId?' active':''}" data-select-cast="${escapeHtml(c.id)}"><span class="cast-avatar">${c.portrait?.startsWith('data:image/')?`<img src="${c.portrait}" alt="">`:String(s.characters.indexOf(c)+1).padStart(2,'0')}</span><span><em class="faction-chip ${isEnemy(c)?'is-enemy':'is-player'}">${isEnemy(c)?'◆ ENEMY':'● PLAYER'}</em><strong>${escapeHtml(c.name)}</strong><small>${escapeHtml(c.ancestry)} · ${escapeHtml(c.className)} · LVL ${c.level}${c.hidden?' · HIDDEN':''}</small></span></button>`).join('');
 const c=s.characters.find(c=>c.id===selectedId);if(!c){$('castEditor').innerHTML='<p class="muted">Add a character to begin editing.</p>';return;}
 // Never destroy a focused editor field on a keystroke.
 if($('castEditor').contains(document.activeElement)&&document.activeElement?.matches('input,textarea,select')){updateCastPreview(s);return;}
 $('castEditor').innerHTML=`<div class="cast-portrait-zone"><div class="portrait-preview">${c.portrait?.startsWith('data:image/')?`<img src="${c.portrait}" alt="${escapeHtml(c.name)} portrait">`:String(s.characters.indexOf(c)+1).padStart(2,'0')}</div><div><label for="portraitUpload">↑ Upload portrait<input id="portraitUpload" type="file" accept="image/png,image/jpeg,image/webp"></label><p>Optional image. Without one, the card stays a neutral numbered placeholder.</p></div></div>
 <label class="field faction-field"><span>Combatant type</span><select id="combatantFaction"><option value="player"${!isEnemy(c)?' selected':''}>Player character</option><option value="enemy"${isEnemy(c)?' selected':''}>Enemy / NPC</option></select></label>
 <div class="cast-edit-grid">
 <label class="field"><span>Display name</span><input data-edit="name" maxlength="48" value="${escapeHtml(c.name)}"></label>
 <label class="field"><span>Ancestry</span><input data-edit="ancestry" maxlength="35" value="${escapeHtml(c.ancestry)}"></label>
 <label class="field"><span>Class</span><input data-edit="className" maxlength="35" value="${escapeHtml(c.className)}"></label>
 <label class="field"><span>Level</span><input type="number" data-edit="level" min="1" max="20" value="${c.level}"></label>
 <label class="field"><span>Maximum HP</span><input type="number" data-edit="maxHp" min="1" max="9999" value="${c.maxHp}"></label>
 <label class="field"><span>Current HP</span><input type="number" data-edit="hp" min="0" max="9999" value="${c.hp}"></label>
 <label class="field"><span>Temporary HP</span><input type="number" data-edit="tempHp" min="0" max="9999" value="${c.tempHp||0}"></label>
 <label class="field"><span>Armor Class</span><input type="number" data-edit="ac" min="0" max="99" value="${c.ac}"></label>
 <label class="field"><span>Initiative</span><input type="number" data-edit="initiative" min="-100" max="150" value="${c.initiative}"></label>
 <label class="field"><span>Perception modifier</span><input type="number" data-edit="perception" min="-20" max="80" value="${c.perception||0}"></label>
 </div><label class="toggle-line"><input id="hiddenCharacter" type="checkbox"${c.hidden?' checked':''}><span>Hide this card from the stage</span></label>
 <div class="cast-footer"><button class="danger" id="removeCharacter">Remove character</button><span class="helper">Edits sync to the stage automatically.</span></div>
 <div class="cast-live-shell" id="castLiveShell"><span class="eyebrow">CARD / STAGE PREVIEW</span><div class="cast-live-card"><div class="cast-live-art" id="castLiveArt"></div><div class="cast-live-copy"><small id="castLiveType" class="faction-preview-label">PLAYER CARD</small><strong id="castLiveName"></strong><span id="castLiveInfo"></span><div class="cast-live-stats"><span id="castLiveHp"></span><span id="castLiveAc"></span><span id="castLiveInit"></span></div></div></div></div>`;
 updateCastPreview(s);
}
function settings(s){const opts=getOptions();$('cardScale').value=Math.round((s.presentation.cardScale||1)*100);$('cardScaleValue').textContent=Math.round((s.presentation.cardScale||1)*100)+'%';$('showHudCheck').checked=s.presentation.showHud!==false;$('sceneCardsCheck').checked=!!s.presentation.showSceneCards;if(document.activeElement!==$('roomInput'))$('roomInput').value=opts.room;$('firebaseCheck').checked=!!opts.online;$('dmIdentityPanel').hidden=!opts.online;}
function render(s){
 // Only rebuild the visible workspace. A weather slider should not recreate
 // hidden combat rows, roster portraits or the overview activity log.
 if(section==='overview'){metrics(s);overview(s);}
 else if(section==='scene')scenes(s);
 else if(section==='music'){}
 else if(section==='combat')renderCombat(s);
 else if(section==='cast')cast(s);
 else if(section==='settings')settings(s);
}
subscribe(render);
// Give ordinary navigation buttons a screen-reader current-page state.
// Arrow keys work within the menu; Tab continues to work normally.
document.querySelectorAll('.dm-sidebar [data-section]').forEach(button=>{
 const target=button.dataset.section;
 button.setAttribute('aria-controls','dm-panel-'+target);
 if(target==='overview')button.setAttribute('aria-current','page');
});
document.querySelectorAll('.dm-section[data-section]').forEach(panel=>{
 panel.id='dm-panel-'+panel.dataset.section;
 panel.setAttribute('aria-label',({overview:'Overview',scene:'Scene director',environment:'Environment',music:'Music library',combat:'Combat controls',cast:'Combatant cards',settings:'Connection settings'})[panel.dataset.section]);
});
const mainMenu=$('dmNav');
mainMenu.addEventListener('keydown',event=>{
 if(!['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 const buttons=[...mainMenu.querySelectorAll('button[data-section]')];
 const current=buttons.indexOf(document.activeElement);
 if(current<0)return;
 event.preventDefault();
 const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:nextNavigationIndex(current,['ArrowDown','ArrowRight'].includes(event.key)?1:-1,buttons.length);
 buttons[next].focus();go(buttons[next].dataset.section);
});
// Navigation / mode commands
$('dmNav').onclick=e=>{const b=e.target.closest('[data-section]');if(b)go(b.dataset.section);};
document.querySelector('.dm-sidebar .side-nav:nth-of-type(2)')?.addEventListener('click',e=>{const b=e.target.closest('[data-section]');if(b)go(b.dataset.section);});
document.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>go(b.dataset.goto));
$('openStage').onclick=()=>window.open('index.html','_blank','noopener');
$('liveSceneButton').onclick=()=>switchMode('scene');
$('liveCombatButton').onclick=()=>switchMode('combat');
$('overviewScene').onclick=()=>switchMode('scene');
$('overviewCombat').onclick=()=>switchMode('combat');
$('startCombat').onclick=()=>{switchMode('combat');go('combat');};
$('overviewNext').onclick=nextTurn;
$('publishScene').onclick=()=>switchMode('scene');
$('publishCombat').onclick=()=>switchMode('combat');
// Scene presets & live copy
$('sceneSelector').onclick=e=>{const b=e.target.closest('[data-scene]');if(!b)return;updateState(s=>{s.sceneId=b.dataset.scene;},`Scene selected: ${SCENES.find(x=>x.id===b.dataset.scene)?.name||b.dataset.scene}`);};
const sceneFields={sceneNameInput:'name',sceneAmbientInput:'ambience',sceneDescInput:'description'};
for(const [id,field]of Object.entries(sceneFields))$(id).addEventListener('input',e=>updateState(s=>{s.sceneOverrides[s.sceneId]??={};s.sceneOverrides[s.sceneId][field]=e.target.value;}));
// Combat controls
$('roundMinus').onclick=()=>updateState(s=>s.combat.round=Math.max(1,s.combat.round-1),'Round moved back');
$('roundPlus').onclick=()=>updateState(s=>s.combat.round+=1,'Round advanced');
$('nextTurn').onclick=nextTurn;
$('rollInit').onclick=()=>{updateState(s=>{for(const c of s.characters){c.initiative=randD20()+(Number(c.perception)||0);}s.combat.activeId=orderedCharacters(s)[0]?.id||null;s.combat.round=1;s.mode='combat';},'Rolled initiative (d20 + Perception modifier)');toast('Initiative rolled. Manually edit in Cast if needed.');};
$('combatRows').onclick=e=>{const b=e.target.closest('button');if(!b)return;const id=b.dataset.id||b.dataset.focus||b.dataset.addCondition||b.dataset.editCombatant;if(!id)return;
 if(b.dataset.editCombatant){selectedId=id;go('cast');return;}
 if(b.dataset.hp!==undefined){const v=Number(b.dataset.hp);updateState(s=>{const c=s.characters.find(c=>c.id===id);if(c)adjustHp(c,v);},`${v<0?'Damage':'Healing'} ${Math.abs(v)} · ${getState().characters.find(c=>c.id===id)?.name||id}`);}
 if(b.dataset.focus){updateState(s=>{s.combat.activeId=id;s.mode='combat';},`Spotlight: ${getState().characters.find(c=>c.id===id)?.name||id}`);}
 if(b.dataset.removeCondition!==undefined){const idx=Number(b.dataset.removeCondition);updateState(s=>{const c=s.characters.find(c=>c.id===id);c?.conditions.splice(idx,1);},'Condition removed');}
 if(b.dataset.addCondition){const input=document.getElementById('condition-'+id);let val=input?.value;if(!val)return;const numbered=['Frightened','Stunned','Dying','Wounded','Slowed','Sickened','Clumsy','Enfeebled','Drained'];if(numbered.includes(val))val+=' 1';updateState(s=>{const c=s.characters.find(c=>c.id===id);if(c&&!c.conditions.includes(val))c.conditions.push(val);},`${val} applied`);}
};
// Cast / portrait editor
$('castList').onclick=e=>{const b=e.target.closest('[data-select-cast]');if(b){selectedId=b.dataset.selectCast;render(getState());}};
function addCombatant(faction,{edit=false}={}){
 const enemy=faction==='enemy',id=(enemy?'enemy-':'player-')+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,5);
 const count=getState().characters.filter(c=>isEnemy(c)===enemy).length+1;
 updateState(s=>{s.characters.push({id,faction:enemy?'enemy':'player',name:enemy?`Enemy ${String(count).padStart(2,'0')}`:`Player ${String(count).padStart(2,'0')}`,ancestry:enemy?'Creature':'Human',className:enemy?'NPC':'Fighter',level:1,maxHp:enemy?18:20,hp:enemy?18:20,tempHp:0,ac:enemy?15:16,initiative:enemy?12:10,perception:enemy?5:4,conditions:[],accent:enemy?'enemy':'gold',symbol:enemy?'◆':'●',portrait:'',hidden:false});if(enemy&&s.mode==='scene')s.mode='combat';},`${enemy?'Enemy':'Player'} added`);
 selectedId=id;if(edit)go('cast');else render(getState());toast(`${enemy?'Enemy':'Player'} card added`);
}
$('addCharacter').onclick=()=>addCombatant('player',{edit:true});
$('addEnemyCast').onclick=()=>addCombatant('enemy',{edit:true});
$('addEnemyCombat').onclick=()=>addCombatant('enemy');
const numericFields=new Set(['level','maxHp','hp','tempHp','ac','initiative','perception']);
$('castEditor').addEventListener('input',e=>{const key=e.target.dataset.edit;if(!key)return;let val=numericFields.has(key)?Number(e.target.value):e.target.value;updateState(s=>{const c=s.characters.find(c=>c.id===selectedId);if(!c)return;c[key]=val;if(key==='maxHp'){c.maxHp=Math.max(1,c.maxHp);c.hp=Math.min(c.hp,c.maxHp);}if(key==='hp')c.hp=Math.max(0,Math.min(c.maxHp,c.hp));if(key==='tempHp')c.tempHp=Math.max(0,c.tempHp);});});
$('castEditor').addEventListener('change',e=>{if(e.target.id==='combatantFaction'){const faction=e.target.value==='enemy'?'enemy':'player';updateState(s=>{const c=s.characters.find(c=>c.id===selectedId);if(c)c.faction=faction;},'Combatant changed to '+faction);render(getState());return;}
 if(e.target.id==='hiddenCharacter'){updateState(s=>{const c=s.characters.find(c=>c.id===selectedId);if(c)c.hidden=e.target.checked;},'Card visibility changed');return;}
 if(e.target.id==='portraitUpload'&&e.target.files?.[0]){const f=e.target.files[0];if(!f.type.startsWith('image/')){toast('Choose a PNG, JPG or WebP image');return;}
 const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');canvas.width=320;canvas.height=430;const scale=Math.max(320/img.width,430/img.height),w=img.width*scale,h=img.height*scale;ctx.drawImage(img,(320-w)/2,(430-h)/2,w,h);const jpeg=canvas.toDataURL('image/jpeg',.73);updateState(s=>{const c=s.characters.find(c=>c.id===selectedId);if(c)c.portrait=jpeg;},'Portrait uploaded');toast('Portrait added to 3D card');};img.src=reader.result;};reader.readAsDataURL(f);}
 });
$('castEditor').addEventListener('click',e=>{if(e.target.id!=='removeCharacter')return;const c=getState().characters.find(c=>c.id===selectedId);if(!c)return;if(!confirm(`Remove ${c.name} from this prototype?`))return;updateState(s=>{s.characters=s.characters.filter(x=>x.id!==selectedId);if(s.combat.activeId===selectedId)s.combat.activeId=orderedCharacters(s)[0]?.id||null;},'Character removed');selectedId=getState().characters[0]?.id;render(getState());});
// Settings
$('cardScale').oninput=e=>updateState(s=>s.presentation.cardScale=Number(e.target.value)/100);
$('showHudCheck').onchange=e=>updateState(s=>s.presentation.showHud=e.target.checked);
$('sceneCardsCheck').onchange=e=>updateState(s=>s.presentation.showSceneCards=e.target.checked);
$('resetDemo').onclick=()=>{if(!confirm('Reset the sample scene, roster and combat state? This cannot be undone.'))return;resetDemo();selectedId=getState().characters[0]?.id;toast('Demo restored');};
function newOnlineRoom(){
  const bytes=new Uint8Array(10);crypto.getRandomValues(bytes);
  return 'grim-'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
function clearCloud(){
  ++cloudEpoch;
  cloud?.disconnect();cloud=null;cloudConnecting=null;
  $('dmUid').value='';
}
async function copyText(str,label){
  try{await navigator.clipboard.writeText(str);toast(label+' copied');}
  catch{window.prompt('Copy '+label+':',str);}
}
$('roomInput').onchange=e=>{
  setOptions({room:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,60)||'grim-demo'});
  toast('Room saved');
  if(getOptions().online){clearCloud();void startCloud();}
};
$('firebaseCheck').onchange=e=>{
  const online=!!e.target.checked;
  const old=getOptions();
  // Never publish a first online session to the publicly guessable demo room.
  setOptions({online,room:online&&old.room==='grim-demo'?newOnlineRoom():old.room});
  if(online)void startCloud();
  else{
    clearCloud();
    $('dmSyncStatus').textContent='LOCAL · SYNC READY';
    $('sideStatus').textContent='LOCAL STAGE ACTIVE';
    $('cloudHelp').textContent='Browser tabs sync automatically without Firebase.';
  }
  settings(getState());
};
$('copyDmUid').onclick=()=>{
  if(!cloud?.getUid())return toast('Enable Firebase first');
  void copyText(cloud.getUid(),'DM browser ID');
};
$('copyFirebaseRules').onclick=()=>{
  const uid=cloud?.getUid();
  if(!uid){toast('Enable Firebase and let your device connect first');return;}
  const data={rules:{'.read':false,'.write':false,grim:{rooms:{'$roomId':{
    '.read':'auth != null',
    '.write':`auth != null && auth.uid === '${uid}'`,
    '.validate':"newData.hasChildren(['mode', 'sceneId', 'characters'])"
  }}}}};
  void copyText(JSON.stringify(data,null,2),'secure Firebase rules');
};
$('forcePublish').onclick=async()=>{
  if(!cloud&&getOptions().online)await startCloud();
  if(cloud){const ok=await cloud.publish();if(ok)toast('Firebase updated');else toast('Firebase rejected the update; check rules');}
  else toast('Enable Firebase first');
};
$('copyStageLink').onclick=()=>{
  const opts=getOptions();const url=new URL('index.html',location.href);
  url.searchParams.set('online','1');url.searchParams.set('room',opts.room);
  void copyText(url.toString(),'online stage URL');
};
async function startCloud(){
  if(cloud)return cloud;
  if(cloudConnecting)return cloudConnecting;
  const opts=getOptions();if(!opts.online)return null;
  const currentEpoch=++cloudEpoch;
  const status=m=>{
    if(currentEpoch!==cloudEpoch)return;
    $('dmSyncStatus').textContent=m.toUpperCase();
    $('sideStatus').textContent=m.toUpperCase();
    $('cloudHelp').textContent=m;
  };
  cloudConnecting=(async()=>{
    try{
      const {connectCloud}=await import('./firebase-sync.js');
      const instance=await connectCloud({dm:true,room:opts.room,status,onIdentity:uid=>{
        if(currentEpoch===cloudEpoch)$('dmUid').value=uid;
      }});
      if(currentEpoch!==cloudEpoch){instance.disconnect();return null;}
      cloud=instance;
      return cloud;
    }catch(e){
      status(`Firebase unavailable: ${e.message}`);
      console.error(e);
      toast('Firebase is unavailable; local mode still works');
      return null;
    }
  })();
  try{return await cloudConnecting;}finally{
    if(currentEpoch===cloudEpoch)cloudConnecting=null;
  }
}
if(getOptions().online)void startCloud();
// Hotkeys on DM page: F5 browser remains native. C = combat, S = scene, N = next turn, when not editing.
window.addEventListener('keydown',e=>{if(e.target?.closest?.('input,textarea,select,button,a,[contenteditable]')||e.ctrlKey||e.metaKey||e.altKey)return;switch(e.key.toLowerCase()){case'c':switchMode('combat');break;case's':switchMode('scene');break;case'n':nextTurn();break;}});
render(getState());
