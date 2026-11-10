import {normalizeSceneSnapshots,MAX_SCENE_SNAPSHOTS} from './scene-snapshots.js';

export const SCENE_BACKUP_FORMAT='project-grim-scenes';
export const SCENE_BACKUP_VERSION=1;
export const MAX_SCENE_BACKUP_BYTES=256*1024;
export function exportSceneBackup(snapshots){
  return JSON.stringify({format:SCENE_BACKUP_FORMAT,version:SCENE_BACKUP_VERSION,
    exportedAt:new Date().toISOString(),scenes:normalizeSceneSnapshots(snapshots)},null,2);
}
export function parseSceneBackup(content){
  if(typeof content!=='string'||content.length>MAX_SCENE_BACKUP_BYTES)throw new Error('Scene backup exceeds the allowed size');
  let input;
  try{input=JSON.parse(content);}catch{throw new Error('This is not valid JSON');}
  if(!input||Array.isArray(input)||input.format!==SCENE_BACKUP_FORMAT||input.version!==SCENE_BACKUP_VERSION||!Array.isArray(input.scenes)){
    throw new Error('This is not a Project Grim scenes backup');
  }
  if(input.scenes.length>MAX_SCENE_SNAPSHOTS)throw new Error('Too many scenes in the backup');
  const scenes=normalizeSceneSnapshots(input.scenes);
  if(scenes.length!==input.scenes.length)throw new Error('Backup contains missing or duplicate scene IDs');
  return scenes;
}
export function mergeSceneBackups(existing,imported){
  // Existing scenes retain their saved order; an imported scene with a matching
  // ID replaces the older one. Most recent 12 are kept, matching the editor.
  return normalizeSceneSnapshots([...normalizeSceneSnapshots(existing),...normalizeSceneSnapshots(imported)]);
}
