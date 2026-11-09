import {normalizeEnvironment} from './environment-state.js';

const copy=value=>JSON.parse(JSON.stringify(value));
// Scene snapshot application changes the stage scene as well as the atmosphere.
// A regular slider undo must NOT roll back unrelated scene/combat data.
export function captureEnvironmentHistory(state,{includeScene=false}={}){
  const entry={environment:copy(normalizeEnvironment(state.environment))};
  if(includeScene){
    entry.sceneId=String(state.sceneId||'chapel');
    entry.sceneOverrides=copy(state.sceneOverrides||{});
  }
  return entry;
}
export function applyEnvironmentHistory(state,entry){
  state.environment=normalizeEnvironment(entry.environment);
  if(Object.hasOwn(entry,'sceneId')){
    state.sceneId=entry.sceneId;
    state.sceneOverrides=copy(entry.sceneOverrides||{});
  }
  // Combatant HP, conditions, turn order, mode, round and snapshots are left untouched.
}

// A separate command is one Undo step even if it happens immediately after
// another. Only continuous slider drags are coalesced into one history entry.
export function createEnvironmentHistoryController({getState,apply,now=()=>Date.now(),limit=24,windowMs=650}={}){
  if(typeof getState!=='function'||typeof apply!=='function')throw new TypeError('History requires getState and apply');
  const undo=[],redo=[];
  let lastKey='',lastAt=-Infinity;
  const cap=(stack,entry)=>{stack.push(entry);if(stack.length>limit)stack.shift();};
  function checkpoint(key,{continuous=false,includeScene=false}={}){
    const at=now();
    if(!continuous||key!==lastKey||at-lastAt>windowMs){
      cap(undo,captureEnvironmentHistory(getState(),{includeScene}));
      redo.length=0;
    }
    lastKey=continuous?key:'';
    lastAt=at;
  }
  function restore(from,to){
    if(!from.length)return false;
    const entry=from.pop();
    cap(to,captureEnvironmentHistory(getState(),{includeScene:Object.hasOwn(entry,'sceneId')}));
    lastKey='';lastAt=-Infinity;
    apply(entry);
    return true;
  }
  function clear(){undo.length=0;redo.length=0;lastKey='';lastAt=-Infinity;}
  return {checkpoint,undo:()=>restore(undo,redo),redo:()=>restore(redo,undo),clear,
    get canUndo(){return undo.length>0;},get canRedo(){return redo.length>0;},
    get undoCount(){return undo.length;},get redoCount(){return redo.length;}};
}
