/* Tactical measurement and DM-built cover placed directly into the live scene.
 * This module does not create a camera, world, stage, or separate ground plane.
 * Every grid line follows the same height function as the existing terrain.
 */
import * as T from './vendor/three.module.js';
import {landscapeHeight} from './world-foundations.js';

const sample=(x,z,w,d,e)=>landscapeHeight(x,z,w,d,e.seed,e.variation,e.hills);
export function tacticalCellSize(map,fieldWidth,fieldDepth){
 return Math.min((fieldWidth-3)/map.width,(fieldDepth-3)/map.height);
}
export function tacticalCellCenter(map,cellSize,x,y){
 return {x:(x+.5-map.width*.5)*cellSize,z:(y+.5-map.height*.5)*cellSize};
}

export function createSceneTacticalOverlay(map,fieldWidth,fieldDepth,env){
 const cellSize=tacticalCellSize(map,fieldWidth,fieldDepth);
 const group=new T.Group();group.name='Tactical overlay (live world)';
 const startX=-map.width*cellSize*.5,startZ=-map.height*cellSize*.5;
 const positions=[],edgePositions=[];
 const addSegment=(out,ax,az,bx,bz)=>{
  const parts=Math.max(1,Math.ceil(Math.hypot(bx-ax,bz-az)/(cellSize*.24)));
  for(let j=0;j<parts;j++){
   const t=j/parts,u=(j+1)/parts;
   const x0=ax+(bx-ax)*t,z0=az+(bz-az)*t,x1=ax+(bx-ax)*u,z1=az+(bz-az)*u;
   out.push(x0,sample(x0,z0,fieldWidth,fieldDepth,env)+.095,z0,x1,sample(x1,z1,fieldWidth,fieldDepth,env)+.095,z1);
  }
 };
 for(let x=0;x<=map.width;x++)addSegment(x===0||x===map.width?edgePositions:positions,startX+x*cellSize,startZ,startX+x*cellSize,startZ+map.height*cellSize);
 for(let y=0;y<=map.height;y++)addSegment(y===0||y===map.height?edgePositions:positions,startX,startZ+y*cellSize,startX+map.width*cellSize,startZ+y*cellSize);
 const materials=[];
 const addLines=(coordinates,color,opacity)=>{
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(coordinates,3));
  const material=new T.LineBasicMaterial({color,transparent:true,opacity:0,depthWrite:false,depthTest:true});
  const lines=new T.LineSegments(geometry,material);lines.frustumCulled=false;lines.renderOrder=8;
  group.add(lines);materials.push({material,opacity});
 };
 addLines(positions,0xe4e9e8,.48);addLines(edgePositions,0xfff1bd,.83);

 const tiles=new Map();
 for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++){
  const code=map.rows[y]?.[x]||'.';if(code==='.')continue;
  if(!tiles.has(code))tiles.set(code,[]);
  tiles.get(code).push(tacticalCellCenter(map,cellSize,x,y));
 }
 const dummy=new T.Object3D();
 function instanced(codes,geometry,color,setup,{transparent=false,opacity=1}={}){
  const points=codes.flatMap(code=>tiles.get(code)||[]);
  if(!points.length){geometry.dispose();return;}
  const material=new T.MeshStandardMaterial({color,roughness:.92,flatShading:true,transparent,opacity});
  const mesh=new T.InstancedMesh(geometry,material,points.length);
  points.forEach(({x,z},i)=>{
   dummy.position.set(x,sample(x,z,fieldWidth,fieldDepth,env),z);
   dummy.rotation.set(0,0,0);dummy.scale.setScalar(cellSize);setup(dummy,x,z);
   dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=!transparent;mesh.receiveShadow=true;group.add(mesh);
 }
 instanced(['#'],new T.BoxGeometry(.98,1.25,.98),0x77746e,d=>{d.position.y+=cellSize*.62;});
 instanced(['O'],new T.DodecahedronGeometry(.49,0),0x5a5c5a,d=>{d.position.y+=cellSize*.43;d.scale.y*=.85;});
 instanced(['T'],new T.CylinderGeometry(.12,.19,1.15,7),0x64513d,d=>{d.position.y+=cellSize*.58;});
 instanced(['T'],new T.IcosahedronGeometry(.52,1),0x587155,d=>{d.position.y+=cellSize*1.25;d.scale.x*=1.15;});
 instanced(['R'],new T.IcosahedronGeometry(.48,0),0x82837e,d=>{d.position.y+=cellSize*.36;d.scale.y*=.73;d.rotation.y=(d.position.x+d.position.z)*.29;});
 instanced(['B'],new T.IcosahedronGeometry(.42,1),0x6b845b,d=>{d.position.y+=cellSize*.24;d.scale.y*=.58;});
 instanced(['L'],new T.CylinderGeometry(.18,.22,.88,7),0x6c513d,d=>{d.position.y+=cellSize*.20;d.rotation.z=Math.PI*.5;});
 instanced(['P'],new T.CylinderGeometry(.26,.33,1.36,8),0x888680,d=>{d.position.y+=cellSize*.68;});
 instanced(['U'],new T.BoxGeometry(.86,.7,.58),0x77756f,d=>{d.position.y+=cellSize*.34;d.rotation.y=.24;});
 instanced(['G'],new T.BoxGeometry(.46,.75,.15),0x9b9892,d=>{d.position.y+=cellSize*.38;});
 instanced(['M'],new T.IcosahedronGeometry(.50,1),0x9b8d79,d=>{d.position.y+=cellSize*.13;d.scale.y*=.28;});

 // Difficult ground and water are surface markings, not replacement terrain.
 for(const [code,color] of [[':',0xbea46c],['~',0x77afcb]]){
  const points=tiles.get(code)||[];if(!points.length)continue;
  const vertices=[];
  for(const {x,z} of points){
   const r=cellSize*.47;
   const corners=[[-r,-r],[r,-r],[r,r],[-r,r]];
   const at=([dx,dz])=>[x+dx,sample(x+dx,z+dz,fieldWidth,fieldDepth,env)+.075,z+dz];
   const a=at(corners[0]),b=at(corners[1]),c=at(corners[2]),d=at(corners[3]);
   vertices.push(...a,...b,...c,...a,...c,...d);
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();
  const mesh=new T.Mesh(geo,new T.MeshBasicMaterial({color,transparent:true,opacity:.29,side:T.DoubleSide,depthWrite:false}));
  mesh.renderOrder=7;group.add(mesh);
 }
 return {group,materials,cellSize};
}
