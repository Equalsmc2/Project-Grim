import assert from 'node:assert/strict';
import {makeSceneSnapshot,normalizeSceneSnapshots,applySceneSnapshot} from '../assets/grim-156/scene-snapshots.js';
import {exportSceneBackup,parseSceneBackup,mergeSceneBackups,MAX_SCENE_BACKUP_BYTES} from '../assets/grim-156/scene-backup.js';
import {createEnvironmentHistoryController,applyEnvironmentHistory} from '../assets/grim-156/environment-history.js';
const makeState=(name,id)=>({environment:{preset:name,ground:name==='Snow'?'snow':'grass',weather:'none',density:.3},sceneId:id,sceneOverrides:{[id]:{name}},mode:'combat',combat:{round:11,activeId:'hero'},characters:[{id:'hero',hp:4,maxHp:30,initiative:19,conditions:['Frozen']}],sceneSnapshots:[]});
const a=makeSceneSnapshot(makeState('Forest','chapel'),'Forest','forest');
const b=makeSceneSnapshot(makeState('Snow','forest'),'Snow','snow');
const text=exportSceneBackup([a,b]);
assert.deepEqual(parseSceneBackup(text).map(s=>s.id),['forest','snow']);
for(const bad of ['{',JSON.stringify({format:'wrong',version:1,scenes:[]}),JSON.stringify({format:'project-grim-scenes',version:7,scenes:[]}),
 JSON.stringify({format:'project-grim-scenes',version:1,scenes:[a,a]}),'a'.repeat(MAX_SCENE_BACKUP_BYTES+1)]){
 assert.throws(()=>parseSceneBackup(bad),'Malformed/duplicate/oversized backup must be rejected');
}
const merged=mergeSceneBackups([a],parseSceneBackup(text));assert.equal(merged.length,2,'Import does not duplicate existing IDs');
const dirty=[a,null,b,{id:'forest',name:'New copy',environment:a.environment,sceneId:'chapel'}];
assert.equal(normalizeSceneSnapshots(dirty).length,2,'Normalization ignores invalid and duplicate snapshots');
assert.equal(normalizeSceneSnapshots(dirty)[0].name,'Snow','Last valid copy wins, maintaining order');
const state=makeState('Forest','chapel');const before=JSON.stringify({combat:state.combat,characters:state.characters,mode:state.mode});
let t=0;
const history=createEnvironmentHistoryController({getState:()=>state,apply:entry=>applyEnvironmentHistory(state,entry),now:()=>t});
// Explicit scene choices remain distinct even if tapped within 100ms.
history.checkpoint('apply-snapshot',{includeScene:true});applySceneSnapshot(state,b);
t+=50;history.checkpoint('apply-snapshot',{includeScene:true});applySceneSnapshot(state,a);
assert.equal(history.undoCount,2);
assert.equal(history.undo(),true);assert.equal(state.sceneId,'forest');
assert.equal(history.undo(),true);assert.equal(state.sceneId,'chapel');
assert.equal(history.redo(),true);assert.equal(state.sceneId,'forest');
assert.equal(JSON.stringify({combat:state.combat,characters:state.characters,mode:state.mode}),before,'History restores scenes without disturbing combat');
history.clear();t+=100;
history.checkpoint('fog',{continuous:true});state.environment.fog=.2;
t+=100;history.checkpoint('fog',{continuous:true});state.environment.fog=.5;
assert.equal(history.undoCount,1,'Continuous slider drag produces one Undo');
history.undo();assert.equal(state.environment.fog,0,'Slider Undo restores start value');
t+=20;history.checkpoint('weather');state.environment.weather='snow';
assert.equal(history.canRedo,false,'New edit clears Redo');
console.log('PASS: scene backup round-trip, strict import, deduplicated merge, discrete Undo, slider coalescing and combat preservation.');
