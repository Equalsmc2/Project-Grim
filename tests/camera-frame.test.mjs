import assert from 'node:assert/strict';
import * as THREE from '../assets/framing-116/vendor/three.module.js';
import {fitBattlefieldCamera} from '../assets/framing-116/camera-frame.js';
function projectArea(width,height,{yaw=0,pitch=0,zoom=1}={}) {
 const camera=new THREE.PerspectiveCamera(44,width/height,.1,140);
 fitBattlefieldCamera(camera,{width,height,yaw,pitch,zoom});
 const corners=[];
 for (const x of [-17.5,17.5]) for (const z of [-9.5,9.5]) {
  const p=new THREE.Vector3(x,0,z).project(camera);
  corners.push({x:(p.x+1)*width/2,y:(1-p.y)*height/2});
 }
 return {camera,corners,spanX:Math.max(...corners.map(p=>p.x))-Math.min(...corners.map(p=>p.x)),spanY:Math.max(...corners.map(p=>p.y))-Math.min(...corners.map(p=>p.y))};
}
for (const [width,height] of [[1920,1000],[1536,900],[1366,710],[1280,660],[1024,700]]) {
 const {corners,spanX,spanY}=projectArea(width,height);
 assert(spanX>width*.9 && spanX<width,'terrain fills landscape width');
 assert(spanY>height*(width>1100?.66:.55),'terrain uses meaningful stage height');
 for(const corner of corners)assert(corner.x>=0 && corner.x<=width && corner.y>=0 && corner.y<=height,'default frame shows all terrain corners');
 console.log(`${width}x${height}: arena ${Math.round(spanX)}×${Math.round(spanY)} (${Math.round(100*spanX/width)}% × ${Math.round(100*spanY/height)}% viewport)`);
}
const normal=projectArea(1366,710);
const closer=projectArea(1366,710,{zoom:1.25});
assert(closer.spanX>normal.spanX*1.18,'manual zoom has a visible effect after auto-fit');
assert(projectArea(1366,710,{yaw:.45}).spanX>0,'orbit camera still projects terrain');
console.log('PASS: camera framing, real manual zoom, landscape aspect and orbit');
