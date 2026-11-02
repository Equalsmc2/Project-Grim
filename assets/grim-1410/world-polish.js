// Pure procedural helpers: reproducible clusters, readable encounter lanes and
// responsive weather accumulation. No Three.js or DOM required.
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const weatherClass=type=>type==='rain'||type==='thunderstorm'?'wet':type==='snow'||type==='blizzard'?'snow':type==='dust'||type==='sandstorm'?'sand':'dry';
export function accumulationTarget(e,intensity=e.intensity){
 const manual=clamp(Number(e.accumulation)||0);
 const weather=weatherClass(e.weather);
 const amount=clamp(Number(intensity)||0);
 return weather==='dry'?{wet:0,snow:0,sand:0}:
  {wet:weather==='wet'?clamp(manual*.85+amount*.32):0,
   snow:weather==='snow'?clamp(manual*.85+amount*.36):0,
   sand:weather==='sand'?clamp(manual*.85+amount*.25):0};
}
export function pathDistance(x,z,e){
 if(!e.path)return Infinity;
 const a=(Number(e.pathAngle)||0)*Math.PI/180;
 // Inverse of the path's world-space rotation.
 const dx=x-(Number(e.pathX)||0),dz=z-(Number(e.pathZ)||0);
 return Math.abs(Math.cos(a)*dx-Math.sin(a)*dz);
}
export function clearForCombat(x,z,w,d){
 // Protect both character rows, allowing terrain to remain visible between.
 return Math.abs(x)<w*.40&&Math.abs(Math.abs(z)-d*.26)<Math.min(2.4,d*.13);
}
export function allowProp(x,z,e,w,d,{far=false}={}){
 if(!far&&clearForCombat(x,z,w,d))return false;
 if(pathDistance(x,z,e)<(Number(e.pathWidth)||2)*.5+1.3)return false;
 return true;
}
export function clusteredProps(e,rng,w,d){
 const types={forest:['tree','tree','bush','tuft','log','rock'],rocks:['rock','rock','rock','bush'],ruins:['pillar','pillar','ruin','rock','grave'],snow:['mound','rock','tree'],grass:['tuft','tuft','bush'],bushes:['bush','bush','tuft'],logs:['log','log','rock'],graves:['grave','grave','rock'],mixed:['tree','bush','log','tuft','rock','pillar','ruin','grave','mound']}[e.props]||['rock'];
 const density=clamp(Number(e.density)||0);if(!density)return {};
 const spots=Object.fromEntries([...new Set(types)].map(name=>[name,[]]));
 const clusterCount=Math.max(1,Math.round(density*12));
 const centers=[];
 for(let i=0;i<clusterCount;i++){
  const far=i>=clusterCount*.45;
  const x=far?(rng()-.5)*w*3.2:(rng()-.5)*(w-2);
  const z=far?-(d*.6+rng()*d*2):(rng()-.5)*(d-2);
  centers.push({x,z,far,type:types[Math.floor(rng()*types.length)],radius:far?3+rng()*6:1.4+rng()*2.6});
 }
 const amount=Math.round(density*215);
 for(let i=0;i<amount;i++){
  const c=centers[i%centers.length];
  const r=Math.sqrt(rng())*c.radius,a=rng()*Math.PI*2;
  const x=c.x+Math.cos(a)*r,z=c.z+Math.sin(a)*r;
  const far=Math.abs(x)>w*.5||Math.abs(z)>d*.5;
  if(!far&&(Math.abs(x)>w*.5-1||Math.abs(z)>d*.5-1))continue;
  if(!allowProp(x,z,e,w,d,{far}))continue;
  // Each cluster is mostly homogeneous; sparse satellite details vary it.
  const name=rng()<.82?c.type:types[Math.floor(rng()*types.length)];
  spots[name].push({x,z,s:(far?.8:.6)+rng()*(far?1.15:.75),far});
 }
 return spots;
}
