// Per-viewer accessibility preferences: never broadcast over campaign/Firebase.
export const MOTION_VALUES=Object.freeze(['system','reduce','full']);
export const MOTION_STORAGE_KEY='grim:motion:v1';
export function normalizeMotionChoice(value){
  return MOTION_VALUES.includes(value)?value:'system';
}
export function reduceMotion(choice,systemPreference=false){
  const selected=normalizeMotionChoice(choice);
  return selected==='reduce'||(selected==='system'&&!!systemPreference);
}
export function smoothScrollBehavior(reduced){return reduced?'instant':'smooth';}
export function nextNavigationIndex(current,step,count){
  if(!Number.isInteger(count)||count<=0)return -1;
  return ((current+step)%count+count)%count;
}
