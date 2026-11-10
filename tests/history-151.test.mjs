import assert from 'node:assert/strict';
import {captureEnvironmentHistory,applyEnvironmentHistory} from '../assets/grim-158/environment-history.js';
import {makeSceneSnapshot,applySceneSnapshot} from '../assets/grim-158/scene-snapshots.js';
import {normalizeEnvironment} from '../assets/grim-158/environment-state.js';

const state={
 sceneId:'chapel',sceneOverrides:{chapel:{name:'Original chapel',description:'C',ambience:'Quiet'},forest:{name:'Canopy'}},
 environment:normalizeEnvironment({ground:'stone',weather:'none'}),
 mode:'combat',combat:{round:8,activeId:'hero'},characters:[{id:'hero',hp:2,maxHp:45,conditions:['Burning'],initiative:17}],
 sceneSnapshots:[{id:'existing'}]
};
const combatBefore=JSON.stringify([state.combat,state.characters,state.mode,state.sceneSnapshots]);
const envHistory=captureEnvironmentHistory(state);
state.environment.ground='snow';
applyEnvironmentHistory(state,envHistory);
assert.equal(state.environment.ground,'stone');
assert.equal(state.sceneId,'chapel');
const snapshot=makeSceneSnapshot({...state,sceneId:'forest',environment:normalizeEnvironment({ground:'grass',weather:'rain'}),sceneOverrides:{forest:{name:'Forest restored',description:'Trees'}}},'Forest','scene-2');
const before=captureEnvironmentHistory(state,{includeScene:true});
applySceneSnapshot(state,snapshot);
assert.equal(state.sceneId,'forest');
assert.equal(state.environment.ground,'grass');
const after=captureEnvironmentHistory(state,{includeScene:true});
applyEnvironmentHistory(state,before);
assert.equal(state.sceneId,'chapel','Undo of scene application must restore scene selection');
assert.equal(state.sceneOverrides.chapel.name,'Original chapel');
assert.equal(state.environment.ground,'stone');
applyEnvironmentHistory(state,after);
assert.equal(state.sceneId,'forest','Redo should restore the selected scene');
assert.equal(state.sceneOverrides.forest.name,'Forest restored');
assert.equal(JSON.stringify([state.combat,state.characters,state.mode,state.sceneSnapshots]),combatBefore,'Undo and redo must never alter combat or saved snapshots');
console.log('PASS: environment history and snapshot undo/redo preserve scene identity, labels, roster and combat state.');
