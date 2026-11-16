import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 AVATAR_GROUPS,AVATAR_KEYS,AVATAR_PALETTES,AVATAR_ART_VERSION,DEFAULT_AVATAR,
 normalizeAvatar,encodeAvatar,isAvatarCode,renderAvatarSvg,randomAvatar
} from '../assets/grim-158/avatar-art.js';
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
globalThis.window={addEventListener:()=>{}};
globalThis.BroadcastChannel=undefined;
const {normalizePlayerEdit,playerRules}=await import('../assets/grim-158/player-fields.js');

assert.equal(AVATAR_KEYS.length,16);
assert.equal(AVATAR_ART_VERSION,2,'Artwork version triggers automatic refresh of earlier portraits');
const hair=AVATAR_GROUPS.find(group=>group.id==='hair');
const eyes=AVATAR_GROUPS.find(group=>group.id==='eyes');
assert(hair.parts.find(part=>part.key==='hairBack').choices.length>=8,'Separate back hairstyles');
assert(hair.parts.find(part=>part.key==='bangs').choices.length>=8,'Multiple bangs');
assert(hair.parts.find(part=>part.key==='sides').choices.length>=6,'Separate side layers');
assert(eyes.parts.find(part=>part.key==='eyes').choices.length>=8,'Multiple eye shapes');
assert(eyes.parts.find(part=>part.key==='iris').choices.length>=6,'Multiple iris styles');
assert(eyes.parts.find(part=>part.key==='brows').choices.length>=6,'Separate eyebrows');
for(const group of AVATAR_GROUPS){
 for(const part of group.parts){
  const count=part.palette?AVATAR_PALETTES[part.palette].length:part.choices.length;
  for(let i=0;i<count;i++){
   const avatar={...DEFAULT_AVATAR,[part.key]:i};
   const code=encodeAvatar(avatar);
   assert(isAvatarCode(code),'All options serialize to a 19-character safe code');
   assert.equal(normalizeAvatar(code)[part.key],i,'Option survives round trip');
  }
 }
}
const base=renderAvatarSvg(DEFAULT_AVATAR);
assert(base.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
assert(base.endsWith('</svg>'));
assert(base.includes('avatar-back-hair')&&base.includes('avatar-fringe')&&base.includes('avatar-side-hair'),'Independent hair layers keep stable anchors');
assert(base.includes('clipPath')&&base.includes('avatar-eye-91')&&base.includes('avatar-eye-149'),'Eyes use centered masks so pupil shapes cannot overrun the eyelids');
assert(!/<(?:image|foreignObject|script|use|text)\b|<style|xlink:href=/i.test(base),'Artwork must only use hand-built SVG shapes and no remote assets');
for(const key of ['hairBack','bangs','sides','eyes','iris','brows','face','outfit']){
 const variants=AVATAR_GROUPS.flatMap(g=>g.parts).find(part=>part.key===key).choices.length;
 assert([...Array(variants).keys()].some(i=>renderAvatarSvg({...DEFAULT_AVATAR,[key]:i})!==base),'Each part must visibly alter the drawing: '+key);
}
assert.equal(normalizePlayerEdit('avatar',encodeAvatar(DEFAULT_AVATAR)),encodeAvatar(DEFAULT_AVATAR));
assert.equal(normalizePlayerEdit('avatar','<svg onload=alert(1)>'),null);
assert.equal(normalizePlayerEdit('avatar','v1-xxxxxxxxxxxxxxxxxxxxxx'),null);
const code=encodeAvatar(randomAvatar());
assert.equal(code.length,19);
const fieldRules=playerRules().rules.grim.playerEdits.$roomId.$characterId.$uid.$field;
assert(fieldRules['.write'].includes("$field === 'avatar'"));
assert(fieldRules['.validate'].includes('matches(/^v1-[0-9a-z]{16}$/)'));
assert.deepEqual(JSON.parse(readFileSync('firebase-rtdb.rules.json','utf8')),playerRules(),'Committed rules match generated rules');
const dm=readFileSync('assets/grim-158/dm.js','utf8');
const player=readFileSync('assets/grim-158/player.js','utf8');
const sync=readFileSync('assets/grim-158/firebase-sync.js','utf8');
assert(dm.includes('openAvatarMaker')&&player.includes('openAvatarMaker'),'DM and player share one maker');
assert(sync.includes('repairAvatarPortraits'),'Online player avatar recipe becomes a stage-compatible PNG');
console.log('PASS: hand-built shape options, hair/eye layers, safe serialization, rules, DM/player stage sync.');
