import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
globalThis.window={addEventListener:()=>{}};
globalThis.BroadcastChannel=undefined;
const {normalizePlayerEdit,encodePlayerEdit,applyPlayerEdit,playerRules}=await import('../assets/grim-158/player-fields.js');

assert.equal(normalizePlayerEdit('hp',-2),0);
assert.equal(normalizePlayerEdit('level',50),20);
assert.equal(normalizePlayerEdit('ac','not a number'),null);
assert.equal(normalizePlayerEdit('name',''),null);
assert.equal(normalizePlayerEdit('name','x'.repeat(100)).length,48);
assert.deepEqual(normalizePlayerEdit('conditions',['Frightened 1','Prone','not-an-option']),['Frightened 1','Prone']);
assert.equal(encodePlayerEdit('conditions',['Prone','Frightened 1']),'Prone,Frightened 1');

const campaign={characters:[
  {id:'hero',faction:'player',hp:12,maxHp:20,conditions:['Frightened 1']},
  {id:'enemy',faction:'enemy',hp:10,maxHp:10}
]};
assert.equal(applyPlayerEdit(campaign,'enemy','hp',0),false,'Enemies must not be editable');
assert.equal(applyPlayerEdit(campaign,'hero','mode','combat'),false,'DM settings must not be editable');
assert.equal(applyPlayerEdit(campaign,'hero','maxHp',10),true);
assert.equal(campaign.characters[0].hp,10,'HP clamps if maximum decreases');
assert.equal(applyPlayerEdit(campaign,'hero','conditions',['Prone','Frightened 1']),true);
assert.deepEqual(campaign.characters[0].conditions,['Prone','Frightened 1']);

const rules=playerRules().rules.grim;
assert(rules.rooms.$roomId['.write'].includes("newData.child('dmUid').val() === auth.uid"),'New rooms are claimed by their first DM');
assert(rules.rooms.$roomId['.write'].includes("data.child('dmUid').val() === auth.uid"),'Updates require the existing DM');
assert(!rules.rooms.$roomId['.write'].includes('REPLACE_WITH'),'No device-specific rules remain');
assert.equal(rules.playerEdits.$roomId.$characterId.$uid.$field['.write'].includes('auth.uid === $uid'),true);
assert(rules.playerEdits.$roomId.$characterId.$uid.$field['.validate'].includes('newData.hasChildren'));
assert.deepEqual(JSON.parse(readFileSync('firebase-rtdb.rules.json','utf8')),playerRules(),'The deployable rules match the UI and validated field whitelist');
console.log('PASS: player sheet field validation, enemy/DM isolation, numbered conditions, and scoped Firebase rules.');
