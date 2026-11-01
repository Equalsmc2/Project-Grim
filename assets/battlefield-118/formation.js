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
  const fieldW=clamp(Number(s.environment?.terrainWidth)||32,18,48);
  const fieldD=clamp(Number(s.environment?.terrainDepth)||20,12,36);
  const halfD=fieldD/2;
  const maxPerRow=w<520?2:w<800?3:7;
  const playerZ=hasBoth?fieldD*.26:2.2, enemyZ=hasBoth?-fieldD*.26:-2.2;
  function placeTeam(team,side){
    if(!team.length)return;
    const rows=Math.ceil(team.length/maxPerRow);
    const perRow=Math.ceil(team.length/rows);
    const worldStep=perRow<=1?0:Math.min(6.4,(fieldW-8)/(perRow-1));
    const fallbackScale=clamp(Math.min((rows>1?.55:.72)*userScale, w/(Math.max(1,perRow)*270)),.40,.78);
    const screenStep=perRow>1?Math.min(220*fallbackScale,(w-28-184*fallbackScale)/(perRow-1)):0;
    const rowStep=Math.max(2.7,Math.min(3.7,fieldD*.16));
    team.forEach((c,i)=>{
      const row=Math.floor(i/perRow), col=i%perRow;
      const rowCount=Math.min(perRow,team.length-row*perRow);
      const x=(col-(rowCount-1)/2)*worldStep;
      const rowBase=rows>1?(side==='enemy'?-fieldD*.17:fieldD*.17):(side==='enemy'?enemyZ:playerZ);
      const z=rowBase+(side==='enemy'?-row:row)*rowStep;
      const fallbackX=w/2+(col-(rowCount-1)/2)*screenStep;
      const fallbackY=(side==='enemy'?h*.34:h*.71)+(row-(rows-1)/2)*130;
      const active=combat&&s.combat.activeId===c.id;
      placements.set(c.id,{
        x:fallbackX,y:fallbackY,scale:fallbackScale,
        worldX:clamp(x,-fieldW/2+1.1,fieldW/2-1.1),worldZ:clamp(z,-halfD+1.2,halfD-1.2),
        side,active,rank:ranks.get(c.id),index:i,row
      });
    });
  }
  placeTeam(enemies,'enemy');placeTeam(players,'player');
  return {placements,enemies,players,hasBoth};
}

