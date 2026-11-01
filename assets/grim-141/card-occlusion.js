// Project Grim: depth-aware silhouettes for crisp HTML combat cards.
// Props and terrain are real Three.js geometry, but cards are HTML. Project
// nearby solid props into masks so closer objects naturally cover the cards.
// Pure geometry helpers live here so occlusion can be regression-tested.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export function makeOccluderSpecs(grouped, heightAt){
 const specs=[];
 for(const [kind,items] of Object.entries(grouped||{})){
  if(!['tree','rock','bush','log','pillar','ruin','grave','mound'].includes(kind))continue;
  for(const p of items){
   if(!Number.isFinite(p.x)||!Number.isFinite(p.z)||!Number.isFinite(p.s))continue;
   specs.push({kind,x:p.x,z:p.z,s:p.s,y:heightAt(p.x,p.z)});
  }
 }
 return specs;
}

function convexHull(points){
 const a=points.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)).sort((a,b)=>a.x-b.x||a.y-b.y);
 if(a.length<3)return a;
 const cross=(o,p,q)=>(p.x-o.x)*(q.y-o.y)-(p.y-o.y)*(q.x-o.x);
 const lo=[],up=[];
 for(const p of a){while(lo.length>1&&cross(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p);}
 for(let i=a.length-1;i>=0;i--){const p=a[i];while(up.length>1&&cross(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p);}
 lo.pop();up.pop();return lo.concat(up);
}
function silhouettePoints(spec,project){
 const {kind,x,z,s,y}=spec,paths=[];
 const box=(w,d,low,high)=>{
  const pts=[];
  for(const yy of [low,high])for(const xx of [-w,w])for(const zz of [-d,d])pts.push(project(x+xx,y+yy,z+zz));
  paths.push(convexHull(pts));
 };
 const rounded=(rx,ry,rz,height)=>{
  const pts=[];
  for(let i=0;i<12;i++){
   const a=i*Math.PI/6;
   pts.push(project(x+Math.cos(a)*rx,y+height+Math.sin(a)*ry,z+Math.sin(a)*rz));
   pts.push(project(x+Math.cos(a)*rx,y+height-Math.sin(a)*ry,z-Math.sin(a)*rz));
  }
  paths.push(convexHull(pts));
 };
 if(kind==='tree'){
  box(.17*s,.17*s,.12*s,1.55*s);
  for(const [base,top,r] of [[1.175,3.425,.86],[2.375,4.125,.73]]){
   // The cones' footprint expands in both world horizontal axes. Convex hull
   // gives a convincing triangular silhouette at oblique camera angles.
   const pts=[project(x,y+top*s,z)];
   for(let i=0;i<8;i++){
    const a=i*Math.PI/4;pts.push(project(x+Math.cos(a)*r*s,y+base*s,z+Math.sin(a)*r*s));
   }
   paths.push(convexHull(pts));
  }
 }else if(kind==='pillar')box(.40*s,.40*s,0,2.25*s);
 else if(kind==='ruin')box(.65*s,.35*s,0,1.0*s);
 else if(kind==='grave')box(.29*s,.1*s,0,1.0*s);
 else if(kind==='rock')rounded(.59*s,.36*s,.70*s,.23*s);
 else if(kind==='bush')rounded(.70*s,.39*s,.50*s,.37*s);
 else if(kind==='mound')rounded(.75*s,.26*s,.75*s,.22*s);
 else if(kind==='log')box(.85*s,.24*s,0,.48*s);
 return paths.filter(path=>path.length>=3);
}
export function projectOccluders(specs,project,depthOf){
 return specs.map(spec=>{
  const paths=silhouettePoints(spec,project);
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const path of paths)for(const p of path){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
  return {...spec,paths,minX,minY,maxX,maxY,depth:depthOf(spec.x,spec.y+spec.s*.8,spec.z)};
 }).filter(p=>Number.isFinite(p.minX)&&Number.isFinite(p.depth)&&p.depth>.1);
}
export function foregroundForCard(projected,card){
 // Depth is signed forward camera distance, not world z. That makes this work
 // for all orbit directions and Ground, Tactical and Top views.
 const {left,top,right,bottom,depth}=card;
 return projected.filter(o=>o.depth<depth-.07&&o.maxX>left&&o.minX<right&&o.maxY>top&&o.minY<bottom);
}
export function paintOcclusionMask(ctx,foreground,card,canvas){
 ctx.clearRect(0,0,canvas.width,canvas.height);
 if(!foreground.length)return false;
 ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.save();ctx.globalCompositeOperation='destination-out';ctx.fillStyle='#000';
 const xScale=canvas.width/(card.right-card.left),yScale=canvas.height/(card.bottom-card.top);
 // A light feather softens the coarse low-poly silhouettes as they cross text.
 ctx.filter='blur(0.6px)';
 for(const o of foreground)for(const path of o.paths){
  ctx.beginPath();path.forEach((p,i)=>{const x=(p.x-card.left)*xScale,y=(p.y-card.top)*yScale;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
  ctx.closePath();ctx.fill();
 }
 ctx.restore();return true;
}
