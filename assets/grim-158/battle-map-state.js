/*
 * Project Grim tactical maps. Pure, bounded state shared by the DM, TV stage,
 * and phone sheets. Each square represents five feet; this is positioning,
 * not an automatic Pathfinder movement/action economy.
 */
export const MAP_MIN_WIDTH=6;
export const MAP_MAX_WIDTH=36;
export const MAP_MIN_HEIGHT=6;
export const MAP_MAX_HEIGHT=24;
export const MAP_LIMIT=12;
export const TERRAIN=[
  {key:'floor',code:'.',label:'Floor',blocked:false},
  {key:'wall',code:'#',label:'Wall',blocked:true},
  {key:'difficult',code:':',label:'Difficult',blocked:false},
  {key:'water',code:'~',label:'Water',blocked:false},
  {key:'cover',code:'O',label:'Solid cover',blocked:true},
  {key:'tree',code:'T',label:'Tree',blocked:true},
  {key:'rock',code:'R',label:'Rock',blocked:true},
  {key:'bush',code:'B',label:'Bush',blocked:false},
  {key:'log',code:'L',label:'Fallen log',blocked:true},
  {key:'pillar',code:'P',label:'Pillar',blocked:true},
  {key:'ruin',code:'U',label:'Ruined stone',blocked:true},
  {key:'grave',code:'G',label:'Gravestone',blocked:true},
  {key:'mound',code:'M',label:'Mound',blocked:false}
];
const byKey=new Map(TERRAIN.map(type=>[type.key,type]));
const byCode=new Map(TERRAIN.map(type=>[type.code,type]));
export const MAP_STEPS={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]};
const int=(value,fallback,min,max)=>Number.isInteger(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback;
const cleanId=value=>String(value||'').replace(/[^a-z0-9-]/gi,'').slice(0,60);
const goodPosition=(value,width,height)=>value&&Number.isInteger(value.x)&&Number.isInteger(value.y)&&value.x>=0&&value.y>=0&&value.x<width&&value.y<height;

export function createBattleMap({id='starter',name='Battlefield',width=16,height=12}={}){
  width=int(width,16,MAP_MIN_WIDTH,MAP_MAX_WIDTH);
  height=int(height,12,MAP_MIN_HEIGHT,MAP_MAX_HEIGHT);
  return {id:cleanId(id)||'starter',name:String(name||'Battlefield').trim().slice(0,48)||'Battlefield',width,height,rows:Array.from({length:height},()=>'.'.repeat(width)),positions:{}};
}
export function defaultBattleMaps(){return {enabled:false,activeId:'starter',maps:[createBattleMap()]};}

export function normalizeBattleMaps(candidate,characters=[]){
  const known=new Set(characters.map(c=>String(c.id)));
  const seen=new Set();
  const maps=[];
  for(const [index,raw] of (Array.isArray(candidate?.maps)?candidate.maps:[]).slice(0,MAP_LIMIT).entries()){
    if(!raw||typeof raw!=='object')continue;
    const width=int(raw.width,16,MAP_MIN_WIDTH,MAP_MAX_WIDTH),height=int(raw.height,12,MAP_MIN_HEIGHT,MAP_MAX_HEIGHT);
    const id=cleanId(raw.id)||`battle-${index}`;
    if(seen.has(id))continue;
    seen.add(id);
    const rows=Array.from({length:height},(_,y)=>{
      const source=typeof raw.rows?.[y]==='string'?raw.rows[y]:'';
      return Array.from({length:width},(_,x)=>byCode.has(source[x])?source[x]:'.').join('');
    });
    const positions={};
    if(raw.positions&&typeof raw.positions==='object')for(const [charId,value] of Object.entries(raw.positions)){
      if(known.has(charId)&&goodPosition(value,width,height))positions[charId]={x:value.x,y:value.y};
    }
    maps.push({id,name:String(raw.name||'Battlefield').trim().slice(0,48)||'Battlefield',width,height,rows,positions});
  }
  if(!maps.length)maps.push(createBattleMap());
  const activeId=maps.some(map=>map.id===candidate?.activeId)?candidate.activeId:maps[0].id;
  return {enabled:!!candidate?.enabled,activeId,maps};
}

export function getActiveBattleMap(state){return state.battleMaps?.maps?.find(map=>map.id===state.battleMaps.activeId)||state.battleMaps?.maps?.[0]||null;}
export function tileAt(map,x,y){return x<0||y<0||x>=map.width||y>=map.height?'#':map.rows[y]?.[x]||'.';}
export function tileType(map,x,y){return byCode.get(tileAt(map,x,y))||byKey.get('floor');}
export function isBlocked(map,x,y){return tileType(map,x,y).blocked;}

// Explicitly placed pieces take priority. Other cards are given stable,
// non-overlapping fallback cells until the DM deliberately positions them.
export function getBattlePositions(map,characters=[]){
  const positions=new Map(),taken=new Set();
  const key=(x,y)=>`${x}:${y}`;
  for(const c of characters){
    const pos=map.positions?.[c.id];
    if(goodPosition(pos,map.width,map.height)&&!isBlocked(map,pos.x,pos.y)&&!taken.has(key(pos.x,pos.y))){
      positions.set(c.id,{x:pos.x,y:pos.y});taken.add(key(pos.x,pos.y));
    }
  }
  let friend=0,foe=0;
  for(const c of characters){
    if(positions.has(c.id))continue;
    const enemy=c.faction==='enemy',rank=enemy?foe++:friend++;
    const anchor={x:enemy?map.width-3:2,y:Math.min(map.height-2,2+rank*2)};
    let best=null,bestDistance=Infinity;
    for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++){
      if(isBlocked(map,x,y)||taken.has(key(x,y)))continue;
      const distance=Math.abs(anchor.x-x)+Math.abs(anchor.y-y);
      if(distance<bestDistance){best={x,y};bestDistance=distance;}
    }
    if(best){positions.set(c.id,best);taken.add(key(best.x,best.y));}
  }
  return positions;
}

export function paintBattleTile(state,x,y,terrain){
  const map=getActiveBattleMap(state),type=byKey.get(terrain);
  if(!map||!type||!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=map.width||y>=map.height)return false;
  if(type.blocked&&[...getBattlePositions(map,state.characters||[]).values()].some(pos=>pos.x===x&&pos.y===y))return false;
  if(tileAt(map,x,y)===type.code)return false;
  map.rows[y]=map.rows[y].slice(0,x)+type.code+map.rows[y].slice(x+1);
  return true;
}

export function resizeBattleMap(state,width,height){
  const map=getActiveBattleMap(state);if(!map)return false;
  width=int(width,map.width,MAP_MIN_WIDTH,MAP_MAX_WIDTH);
  height=int(height,map.height,MAP_MIN_HEIGHT,MAP_MAX_HEIGHT);
  if(width===map.width&&height===map.height)return false;
  map.rows=Array.from({length:height},(_,y)=>(map.rows[y]||'').slice(0,width).padEnd(width,'.'));
  map.width=width;map.height=height;
  for(const [id,pos] of Object.entries(map.positions))if(!goodPosition(pos,width,height))delete map.positions[id];
  return true;
}

export function placeBattleToken(state,characterId,x,y){
  const map=getActiveBattleMap(state),characters=state.characters||[];
  if(!map||!characters.some(c=>c.id===characterId)||!Number.isInteger(x)||!Number.isInteger(y)||isBlocked(map,x,y))return false;
  if([...getBattlePositions(map,characters)].some(([id,pos])=>id!==characterId&&pos.x===x&&pos.y===y))return false;
  map.positions[characterId]={x,y};
  return true;
}

export function moveBattleToken(state,characterId,direction,{playerOnly=false}={}){
  const map=getActiveBattleMap(state),character=state.characters?.find(c=>c.id===characterId),step=MAP_STEPS[direction];
  if(!map||!character||!step||!state.battleMaps.enabled||state.mode!=='combat'||playerOnly&&character.faction==='enemy')return false;
  const positions=getBattlePositions(map,state.characters),from=positions.get(characterId);
  if(!from)return false;
  const x=from.x+step[0],y=from.y+step[1];
  if(isBlocked(map,x,y)||[...positions].some(([id,pos])=>id!==characterId&&pos.x===x&&pos.y===y))return false;
  map.positions[characterId]={x,y};
  return true;
}

export function canMoveBattleToken(state,characterId,direction){
  const map=getActiveBattleMap(state),step=MAP_STEPS[direction],positions=map&&getBattlePositions(map,state.characters||[]),from=positions?.get(characterId);
  if(!map||!step||!from||!state.battleMaps?.enabled||state.mode!=='combat')return false;
  const x=from.x+step[0],y=from.y+step[1];
  return !isBlocked(map,x,y)&&![...positions].some(([id,p])=>id!==characterId&&p.x===x&&p.y===y);
}
