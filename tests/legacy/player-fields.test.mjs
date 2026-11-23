import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
globalThis.window={addEventListener:()=>{}};
globalThis.BroadcastChannel=undefined;
const {normalizePlayerEdit,encodePlayerEdit,applyPlayerEdit,playerRules}=await import('../../assets/grim-158/player-fields.js');

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
assert(!rules.rooms.$roomId['.validate'].includes('characters'),'Empty campaigns are allowed before the first player character exists');
assert.equal(rules.playerEdits.$roomId['.read'],'auth != null','The DM can subscribe to player edits before a new room is published');
assert(rules.playerEdits.$roomId.$characterId.$uid.$field['.write'].includes("root.child('grim/rooms').child($roomId).exists()"),'Players cannot write edits into nonexistent rooms');
assert(!rules.rooms.$roomId['.write'].includes('REPLACE_WITH'),'No device-specific rules remain');
assert.equal(rules.playerEdits.$roomId.$characterId.$uid.$field['.write'].includes('auth.uid === $uid'),true);
assert(rules.playerEdits.$roomId.$characterId.$uid.$field['.validate'].includes('newData.hasChildren'));
assert.deepEqual(withoutV2Chat(JSON.parse(readFileSync('firebase-rtdb.rules.json','utf8'))),playerRules(),'The deployable rules match the UI and validated field whitelist');
assert.equal(JSON.parse(readFileSync('firebase.json','utf8')).auth?.providers?.anonymous,true,'Anonymous Firebase sign-in is enabled for login-free player sheets');
console.log('PASS: player sheet field validation, enemy/DM isolation, numbered conditions, and scoped Firebase rules.');

// 2.0 adds an independent, append-only player chat path; the 1.5.8 paths must stay identical.
function withoutV2Chat(r){const c=JSON.parse(JSON.stringify(r));delete c.rules.grim.chat;delete c.rules.grim.claims;delete c.rules.grim.tables;
 // 2.0.1 binds player edits to a character claim; everything else in the 1.5.8 condition must be unchanged.
 const f=c.rules.grim.playerEdits.$roomId.$characterId.$uid.$field;f['.write']=f['.write'].replace(" root.child('grim/claims').child($roomId).child($characterId).child('uid').val() === auth.uid &&",'');
 c.rules.grim={rooms:c.rules.grim.rooms,playerEdits:c.rules.grim.playerEdits};return c;}
