import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../assets/rectangle-112/vendor/three.module.js';
const source=readFileSync(new URL('../assets/rectangle-112/world.js',import.meta.url),'utf8');
assert.match(source,/FIELD_W=35, FIELD_D=19/,'The 3D terrain dimensions must remain a wide rectangle');
assert.match(source,/root\.scale\.set\(1,1,1\)/,'The scene must not apply nonuniform world scaling');
assert.doesNotMatch(source,/root\.scale\.set\([^\n]*1\.6/,'Terrain depth must never be multiplied by 1.6');
for(const [width,height] of [[1536,960],[1366,768],[1024,768],[390,844]]){
 const camera=new T.PerspectiveCamera(44,1,.1,140);const aspect=width/height;
 camera.aspect=aspect;camera.fov=aspect<1?48:42;camera.updateProjectionMatrix();
 const initialFit=Math.max(1,.93/aspect);
 camera.position.set(0,24*initialFit,26*initialFit);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 for(let i=0;i<5;i++){
  let maxX=0,maxY=0;
  for(const x of [-17.5,17.5])for(const z of [-9.5,9.5]){
   const q=new T.Vector3(x,0,z).project(camera);
   maxX=Math.max(maxX,Math.abs(q.x));maxY=Math.max(maxY,Math.abs(q.y));
  }
  const oversize=Math.max(maxX/.965,maxY/.73);
  if(oversize<=1.001)break;
  camera.position.multiplyScalar(oversize*1.01);camera.updateMatrixWorld();
 }
 const p=(x,z)=>{const v=new T.Vector3(x,0,z).project(camera);return {x:(v.x+1)*width/2,y:(1-v.y)*height/2};};
 const farLeft=p(-17.5,-9.5),farRight=p(17.5,-9.5),nearLeft=p(-17.5,9.5),nearRight=p(17.5,9.5);
 const nearWidth=nearRight.x-nearLeft.x,farWidth=farRight.x-farLeft.x,depth=nearLeft.y-farLeft.y;
 assert(nearWidth>2*depth,`${width}x${height}: arena must look rectangular`);
 assert(nearLeft.x>=-1 && nearRight.x<=width+1,'Arena horizontal edges stay framed');
 assert(farLeft.y>=-1 && nearLeft.y<=height+1,'Arena vertical edges stay framed');
 console.log(`${width}x${height}: far=${farWidth.toFixed(0)}px near=${nearWidth.toFixed(0)}px depth=${depth.toFixed(0)}px, projected ratio=${(nearWidth/depth).toFixed(2)}:1`);
}
console.log('PASS: wide physical terrain, no axis stretching, corners framed.');
