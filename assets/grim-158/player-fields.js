import {CONDITION_OPTIONS} from './state.js';
import {isAvatarCode} from './avatar-art.js';
import {MAP_STEPS,moveBattleToken} from './battle-map-state.js';

// Only these card values are editable on a shared player sheet. In particular,
// faction, hidden, combat turns, presentation, and scene data are DM-owned.
export const PLAYER_NUMBER_FIELDS={
  level:{label:'Level',min:1,max:20},
  maxHp:{label:'Maximum HP',min:1,max:9999},
  hp:{label:'Current HP',min:0,max:9999},
  tempHp:{label:'Temporary HP',min:0,max:9999},
  ac:{label:'Armor class',min:0,max:99},
  initiative:{label:'Initiative',min:-100,max:150},
  perception:{label:'Perception',min:-20,max:80}
};
export const PLAYER_TEXT_FIELDS={name:48,ancestry:35,className:35};
export const PLAYER_EDIT_FIELDS=[...Object.keys(PLAYER_NUMBER_FIELDS),...Object.keys(PLAYER_TEXT_FIELDS),'conditions','avatar','mapMove'];

export function normalizePlayerEdit(field,value){
  if(field==='avatar')return isAvatarCode(value)?value:null;
  if(field==='mapMove')return typeof value==='string'&&Object.hasOwn(MAP_STEPS,value)?value:null;
  if(field in PLAYER_TEXT_FIELDS){
    const clean=String(value??'').trim().slice(0,PLAYER_TEXT_FIELDS[field]);
    return clean.length?clean:null;
  }
  if(field==='conditions'){
    const names=Array.isArray(value)?value:String(value??'').split(',');
    return [...new Set(names.map(x=>String(x).trim()).filter(x=>CONDITION_OPTIONS.includes(x)||/^(Frightened|Stunned|Dying|Wounded|Slowed|Sickened|Clumsy|Enfeebled|Drained) [1-4]$/.test(x)))].slice(0,CONDITION_OPTIONS.length);
  }
  const config=PLAYER_NUMBER_FIELDS[field];
  if(!config||value===''||value===null||value===undefined||!Number.isFinite(Number(value)))return null;
  return Math.max(config.min,Math.min(config.max,Math.trunc(Number(value))));
}

export function applyPlayerEdit(state,characterId,field,value){
  const character=state.characters?.find(c=>c.id===characterId&&c.faction!=='enemy');
  if(!character)return false;
  const clean=normalizePlayerEdit(field,value);
  if(clean===null)return false;
  if(field==='mapMove'){
    // Even a blocked step is acknowledged. Otherwise an old Firebase command
    // would be replayed every time another campaign field changes.
    moveBattleToken(state,characterId,clean,{playerOnly:true});
    return true;
  }
  if(field==='conditions')character.conditions=clean;
  else{
    character[field]=clean;
    if(field==='maxHp')character.hp=Math.min(Number(character.hp)||0,clean);
    if(field==='hp')character.hp=Math.min(clean,Math.max(1,Number(character.maxHp)||1));
  }
  return true;
}

// Firebase stores conditions as a short CSV string; the DM applies the same
// whitelist on receipt. This keeps validation small and blocks extra fields.
export function encodePlayerEdit(field,value){
  const normalized=normalizePlayerEdit(field,value);
  if(normalized===null)return null;
  return field==='conditions'?normalized.join(','):normalized;
}

// These project-wide rules are installed once. Each newly created room then
// binds itself to the DM's anonymous UID on its first successful write.
// They never contain a browser-specific UID or require per-room rule edits.
export function playerRules(){
  const known=PLAYER_EDIT_FIELDS.map(f=>`$field === '${f}'`).join(' || ');
  return {rules:{'.read':false,'.write':false,grim:{
    rooms:{'$roomId':{
      '.read':'auth != null',
      '.write':"auth != null && ((!data.exists() && newData.child('dmUid').val() === auth.uid) || (data.child('dmUid').val() === auth.uid && newData.child('dmUid').val() === auth.uid))",
      // Firebase omits empty arrays; a DM must be able to start with zero PCs.
      '.validate':"newData.hasChildren(['dmUid', 'mode', 'sceneId']) && newData.child('dmUid').isString()"
    }},
    playerEdits:{'$roomId':{
      // The DM subscribes before an empty room is created; reading must work
      // immediately, while writing is restricted to existing private rooms.
      '.read':"auth != null",
      '$characterId':{'$uid':{'$field':{
        '.write':`auth != null && root.child('grim/rooms').child($roomId).exists() && auth.uid === $uid && (${known}) && newData.exists() && (!data.exists() || newData.child('revision').val() > data.child('revision').val())`,
        '.validate':"newData.hasChildren(['revision', 'value']) && newData.child('revision').isNumber() && newData.child('revision').val() > 0 && newData.child('revision').val() < 9000000000000000 && ($field === 'avatar' ? (newData.child('value').isString() && newData.child('value').val().matches(/^v1-[0-9a-z]{16}$/)) : ($field === 'mapMove' ? (newData.child('value').isString() && newData.child('value').val().matches(/^(up|down|left|right)$/)) : ($field === 'conditions' ? (newData.child('value').isString() && newData.child('value').val().length <= 220) : (($field === 'name' || $field === 'ancestry' || $field === 'className') ? (newData.child('value').isString() && newData.child('value').val().length > 0 && newData.child('value').val().length <= 48) : (newData.child('value').isNumber() && newData.child('value').val() >= -100 && newData.child('value').val() <= 9999)))))"
      }}}
    }}
  }}};
}
