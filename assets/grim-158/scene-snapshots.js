import {normalizeEnvironment} from './environment-state.js';
export const MAX_SCENE_SNAPSHOTS=12;
const clean=x=>String(x??'').trim().replace(/[\x00-\x1f\x7f]/g,' ').slice(0,44);
export function normalizeSceneSnapshots(raw){
  if(!Array.isArray(raw))return [];
  const valid=raw.filter(v=>v&&typeof v==='object'&&!Array.isArray(v)&&typeof v.id==='string'&&clean(v.id));
  const unique=new Set();
  return valid.reverse().filter(v=>{const id=clean(v.id);if(unique.has(id))return false;unique.add(id);return true;}).slice(0,MAX_SCENE_SNAPSHOTS).reverse().map(v=>({
    id:clean(v.id).slice(0,50), name:clean(v.name)||'Untitled scene',
    environment:normalizeEnvironment(v.environment),
    sceneId:clean(v.sceneId||'chapel').slice(0,24),
    sceneOverride: v.sceneOverride&&typeof v.sceneOverride==='object'?{
      name:clean(v.sceneOverride.name).slice(0,85),
      description:String(v.sceneOverride.description||'').slice(0,350),
      ambience:String(v.sceneOverride.ambience||'').slice(0,110)
    }:null,
    createdAt:Math.max(0,Math.min(Date.now(),Number(v.createdAt)||0))
  })).filter(v=>v.id);
}
export function makeSceneSnapshot(state,name,id=`snap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`){
 const sceneId=String(state.sceneId||'chapel');
 return normalizeSceneSnapshots([{id,name:name||state.environment?.preset||'Scene',environment:state.environment,sceneId,sceneOverride:state.sceneOverrides?.[sceneId]||null,createdAt:Date.now()}])[0];
}
export function insertSceneSnapshot(existing,snapshot){
 const list=normalizeSceneSnapshots(existing).filter(s=>s.id!==snapshot.id);
 list.push(snapshot);
 return normalizeSceneSnapshots(list);
}
export function applySceneSnapshot(state,snapshot){
 state.environment=normalizeEnvironment(snapshot.environment);
 state.sceneId=snapshot.sceneId;
 state.sceneOverrides??={};
 if(snapshot.sceneOverride)state.sceneOverrides[snapshot.sceneId]={...snapshot.sceneOverride};
 else delete state.sceneOverrides[snapshot.sceneId];
 // Intentionally leave state.mode, combat round, cards, current HP, initiative, and active turn untouched.
}
