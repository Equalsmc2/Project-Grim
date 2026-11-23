import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  createBattleMap,defaultBattleMaps,normalizeBattleMaps,getBattlePositions,TERRAIN,tileType,
  paintBattleTile,placeBattleToken,moveBattleToken,canMoveBattleToken,resizeBattleMap
} from '../../assets/grim-158/battle-map-state.js';
import {buildBattleGeometry,worldCell,cellAtWorld} from '../../assets/grim-158/battle-map-geometry.js';
import {disposeSceneGraph} from '../../assets/grim-158/scene-resources.js';

globalThis.window={addEventListener(){}};
globalThis.localStorage={getItem:()=>null,setItem(){}};
globalThis.BroadcastChannel=undefined;
const {applyPlayerEdit,normalizePlayerEdit,playerRules}=await import('../../assets/grim-158/player-fields.js');

const characters=[{id:'ally',name:'Ally',faction:'player'},{id:'foe',name:'Foe',faction:'enemy'}];
const campaign={mode:'combat',battleMaps:defaultBattleMaps(),characters};
campaign.battleMaps.enabled=true;
const map=campaign.battleMaps.maps[0];
assert.equal(placeBattleToken(campaign,'ally',3,3),true);
assert.equal(placeBattleToken(campaign,'foe',5,3),true);
assert.equal(placeBattleToken(campaign,'foe',3,3),false,'tokens cannot overlap');
assert.equal(paintBattleTile(campaign,4,3,'wall'),true);
assert.equal(canMoveBattleToken(campaign,'ally','right'),false,'walls block movement');
assert.equal(moveBattleToken(campaign,'ally','right',{playerOnly:true}),false);
assert.equal(applyPlayerEdit(campaign,'ally','mapMove','right'),true,'blocked movement acknowledged');
assert.deepEqual(map.positions.ally,{x:3,y:3});
assert.equal(paintBattleTile(campaign,4,3,'floor'),true);
assert.equal(moveBattleToken(campaign,'ally','right',{playerOnly:true}),true);
assert.deepEqual(map.positions.ally,{x:4,y:3});
assert.equal(moveBattleToken(campaign,'ally','right'),false,'another piece blocks movement');
assert.equal(applyPlayerEdit(campaign,'foe','mapMove','left'),false,'phone cannot move enemy');
assert.equal(moveBattleToken(campaign,'ally','up',{playerOnly:true}),true);
assert.deepEqual(map.positions.ally,{x:4,y:2});
assert.equal(moveBattleToken(campaign,'ally','left',{playerOnly:true}),true);
assert.equal(moveBattleToken(campaign,'ally','down',{playerOnly:true}),true);
assert.deepEqual(map.positions.ally,{x:3,y:3});
assert.equal(paintBattleTile(campaign,4,3,'cover'),true);
assert.equal(canMoveBattleToken(campaign,'ally','right'),false,'solid cover blocks movement');
assert.equal(placeBattleToken(campaign,'ally',-1,0),false,'cannot place off board');
assert.equal(moveBattleToken(campaign,'ally','teleport'),false,'unknown direction rejected');
assert.equal(normalizePlayerEdit('mapMove','teleport'),null);
assert.equal(normalizePlayerEdit('mapMove','down'),'down');
for(const [key,blocked] of [['tree',true],['rock',true],['log',true],['pillar',true],['ruin',true],['grave',true],['bush',false],['mound',false]]){
  const testMap=createBattleMap({width:8,height:8});
  const state={characters:[],battleMaps:{enabled:true,activeId:testMap.id,maps:[testMap]},mode:'combat'};
  assert.equal(paintBattleTile(state,4,4,key),true);
  assert.equal(tileType(testMap,4,4).blocked,blocked,`${key} collision matches geometry`);
  const geometry=buildBattleGeometry(testMap);
  assert.ok(geometry.group.children.some(child=>child.isInstancedMesh),'3D obstacle meshes exist');
  const position=worldCell(testMap,4,4);
  assert.deepEqual(cellAtWorld(testMap,position.x,position.z),{x:4,y:4});
  disposeSceneGraph(geometry.group);
}
assert.equal(new Set(TERRAIN.map(item=>item.code)).size,TERRAIN.length,'every 3D asset has a unique map code');
campaign.mode='scene';assert.equal(moveBattleToken(campaign,'ally','up'),false,'cannot move in scene mode');
campaign.mode='combat';campaign.battleMaps.enabled=false;
assert.equal(moveBattleToken(campaign,'ally','up'),false,'cannot move unpublished map');
campaign.battleMaps.enabled=true;
assert.equal(resizeBattleMap(campaign,9,7),true);
assert.equal(map.rows.length,7);
assert.equal(map.rows[0].length,9);
assert.equal(map.positions.ally.x,3);
assert.equal(createBattleMap({width:999,height:999}).width,36,'map size bounded');
assert.equal(createBattleMap({width:999,height:999}).height,24);

campaign.battleMaps.maps.push(createBattleMap({id:'second',name:'Dungeon'}));
campaign.battleMaps.activeId='second';
assert.equal(getBattlePositions(campaign.battleMaps.maps[1],characters).size,2);
const normalized=normalizeBattleMaps(campaign.battleMaps,characters);
assert.equal(normalized.maps.length,2);
assert.equal(normalized.activeId,'second');
assert.deepEqual(normalizeBattleMaps({enabled:true,maps:[{id:'bad',width:1000,height:1000,rows:['?'],positions:{hacker:{x:0,y:0}}}]},characters).maps[0].positions,{},'unknown tokens removed');
const path=new URL('../../firebase-rtdb.rules.json',import.meta.url);
const installedRules=withoutV2Chat(JSON.parse(readFileSync(path,'utf8')));
assert.deepEqual(playerRules(),installedRules,'Firebase rules must agree with client edit validation');
console.log('Battle-map data, grid movement, DM edits, and Firebase rule parity passed.');

// 2.0 adds an independent, append-only player chat path; the 1.5.8 paths must stay identical.
function withoutV2Chat(r){const c=JSON.parse(JSON.stringify(r));delete c.rules.grim.chat;delete c.rules.grim.claims;delete c.rules.grim.tables;
 // 2.0.1 binds player edits to a character claim; everything else in the 1.5.8 condition must be unchanged.
 const f=c.rules.grim.playerEdits.$roomId.$characterId.$uid.$field;f['.write']=f['.write'].replace(" root.child('grim/claims').child($roomId).child($characterId).child('uid').val() === auth.uid &&",'');
 c.rules.grim={rooms:c.rules.grim.rooms,playerEdits:c.rules.grim.playerEdits};return c;}
