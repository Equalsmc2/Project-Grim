import assert from 'node:assert/strict';
import * as THREE from '../assets/framing-117/vendor/three.module.js';
import {fitBattlefieldCamera,MAX_ORBIT_DEGREES,MIN_CAMERA_ZOOM,MAX_CAMERA_ZOOM} from '../assets/framing-117/camera-frame.js';

function measure(width,height,opts={}) {
  const camera=new THREE.PerspectiveCamera(38,width/height,.1,140);
  fitBattlefieldCamera(camera,{width,height,...opts});
  const corners=[];
  for(const x of [-17.5,17.5])for(const z of [-9.5,9.5]){
    const p=new THREE.Vector3(x,0,z).project(camera);
    corners.push({x:(p.x+1)*width/2,y:(1-p.y)*height/2});
  }
  const spanX=Math.max(...corners.map(p=>p.x))-Math.min(...corners.map(p=>p.x));
  const spanY=Math.max(...corners.map(p=>p.y))-Math.min(...corners.map(p=>p.y));
  return {camera,corners,spanX,spanY};
}
for(const [width,height] of [[1920,1000],[1536,900],[1366,710],[1280,660],[1024,700],[390,844]]) {
  const {corners,spanX,spanY}=measure(width,height);
  assert(spanX>width*(width<600?.80:.89),'default battlefield remains wide');
  assert(spanY>height*(width>1100?.60:width>600?.50:.15),'stage fills useful vertical space');
  for(const corner of corners) assert(corner.x>=-1&&corner.x<=width+1&&corner.y>=-1&&corner.y<=height+1,'default view fits screen');
  console.log(`${width}x${height}: default ${Math.round(spanX)}x${Math.round(spanY)} (${Math.round(spanX/width*100)}% width)`);
}
const width=1650,height=850;
const base=measure(width,height),rotated=measure(width,height,{yaw:MAX_ORBIT_DEGREES*Math.PI/180});
assert(Math.abs(rotated.camera.position.length()-base.camera.position.length())<1e-8,'orbit does NOT move camera away');
assert(rotated.spanX>base.spanX*.83,'rotated battlefield remains large');
const overshoot=measure(width,height,{yaw:40*Math.PI/180});
assert(Math.abs(overshoot.camera.position.length()-base.camera.position.length())<1e-8,'large input never triggers camera pullback');
assert(Math.abs(overshoot.camera.position.x-rotated.camera.position.x)<1e-8,'orbit input is constrained');
const out=measure(width,height,{zoom:.25});
assert.equal(out.camera.position.length(),base.camera.position.length(),'zoom cannot shrink map below baseline');
assert.equal(MIN_CAMERA_ZOOM,1);
assert.equal(MAX_CAMERA_ZOOM,1.5);
const closer=measure(width,height,{zoom:1.2});
assert(closer.spanX>base.spanX*1.06,'manual zoom in works');
console.log('PASS: no automatic orbit pullback, no default zoom-out, camera remains tightly framed.');
