import {orderedCharacters,isEnemy} from './state.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
// Every character owns one real battlefield coordinate. Never derive the
// position from the viewport or current camera view: orbiting and new turns
// must NOT move the character around the ground.
export function planFormation(s,visible,combat,w,h){
  const initiativeList=orderedCharacters(s).filter(c=>visible.some(v=>v.id===c.id));
  const ranks=new Map(initiativeList.map((c,i)=>[c.id,i+1]));
  const enemies=initiativeList.filter(isEnemy), players=initiativeList.filter(c=>!isEnemy(c));
  const hasBoth=enemies.length>0&&players.length>0;
  const placements=new Map();
  const userScale=clamp(Number(s.presentation?.cardScale)||1,.5,1.25);
  const maxPerRow=w<520?2:w<800?3:7;
  const playerZ=hasBoth?5.4:1.8, enemyZ=hasBoth?-5.5:-1.8;
  function placeTeam(team,side){
    if(!team.length)return;
    const rows=Math.ceil(team.length/maxPerRow);
    const perRow=Math.ceil(team.length/rows);
    const worldStep=perRow<=1?0:Math.min(7.5,26/(perRow-1));
    const fallbackScale=clamp(Math.min((rows>1?.59:.78)*userScale, w/(Math.max(1,perRow)*245)),.43,.88);
    const screenStep=perRow>1?Math.min(235*fallbackScale,(w-28-188*fallbackScale)/(perRow-1)):0;
    team.forEach((c,i)=>{
      const row=Math.floor(i/perRow), col=i%perRow;
      const rowCount=Math.min(perRow,team.length-row*perRow);
      const x=(col-(rowCount-1)/2)*worldStep;
      // Extra ranks stay on their own side in staggered rows, all on terrain.
      // For large rosters, stagger extra rows within the same side of the
      // battlefield; their physical positions stay deterministic.
      const rowBase=rows>1?(side==='enemy'?-3.6:3.6):(side==='enemy'?enemyZ:playerZ);
      const z=rowBase+(side==='enemy'?-row:row)*3.9;
      const fallbackX=w/2+(col-(rowCount-1)/2)*screenStep;
      const fallbackY=(side==='enemy'?h*.36:h*.72)+(row-(rows-1)/2)*135;
      const active=combat&&s.combat.activeId===c.id;
      placements.set(c.id,{
        x:fallbackX,y:fallbackY,scale:fallbackScale,
        // Fixed physical coordinates independent of camera and active turn.
        worldX:x,worldZ:clamp(z,-8.0,8.0),
        side,active,rank:ranks.get(c.id),index:i,row
      });
    });
  }
  placeTeam(enemies,'enemy');placeTeam(players,'player');
  return {placements,enemies,players,hasBoth};
}

