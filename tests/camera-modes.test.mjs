import assert from 'node:assert/strict';
import * as T from '../assets/grim-1412/vendor/three.module.js';
import {FIELD_WIDTH,FIELD_DEPTH,DEFAULT_CAMERA_VIEW,CAMERA_VIEWS,MAX_ORBIT_DEGREES,MIN_CAMERA_ZOOM,MAX_CAMERA_ZOOM,calculateCameraPose,applyCameraPose} from '../assets/grim-1412/camera-frame.js';
assert.equal(FIELD_WIDTH,32);
assert.equal(FIELD_DEPTH,20);
assert.equal(DEFAULT_CAMERA_VIEW,'ground');
assert(CAMERA_VIEWS.ground.elevation<25,'Ground mode has a low viewing angle');
assert(CAMERA_VIEWS.tactical.elevation>=35&&CAMERA_VIEWS.tactical.elevation<=50);
assert(CAMERA_VIEWS.overhead.elevation>=70);
assert(MIN_CAMERA_ZOOM>0&&MAX_CAMERA_ZOOM>1);
for(const [width,height] of [[1920,960],[1536,870],[1366,700],[1024,690],[390,760]]){
 const renders={};
 for(const mode of ['tactical','ground','overhead']){
  const opts={width,height,mode};
  const pose=calculateCameraPose(opts);
  const camera=applyCameraPose(new T.PerspectiveCamera(),pose);
  const points=[];
  for(const x of [-16,16])for(const z of [-10,10]){
    const p=new T.Vector3(x,0,z).project(camera);
    points.push({x:(p.x+1)*width/2,y:(1-p.y)*height/2});
  }
  const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x));
  const minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));
  const spanX=maxX-minX,spanY=maxY-minY;
  assert(Number.isFinite(spanX)&&Number.isFinite(spanY)&&spanX>0&&spanY>0);
  if(mode==='tactical'){
   assert(spanX>width*.78,'Tactical ground must occupy most of the available width');
   assert(spanY>height*(width<600?.13:.35),'Tactical ground must have useful depth');
  }
  renders[mode]={spanX,spanY,pose};
 }
 assert(renders.ground.pose.elevation<renders.tactical.pose.elevation);
 assert(renders.overhead.pose.elevation>renders.tactical.pose.elevation);
 console.log(`${width}×${height}: tactical ${Math.round(renders.tactical.spanX)}×${Math.round(renders.tactical.spanY)}, ground ${Math.round(renders.ground.spanX)}×${Math.round(renders.ground.spanY)}`);
}
const baseline=calculateCameraPose({width:1536,height:870});
const rotated=calculateCameraPose({width:1536,height:870,yaw:MAX_ORBIT_DEGREES*Math.PI/180});
assert(Math.abs(rotated.distance-baseline.distance)<1e-8,'Orbit cannot auto-zoom away');
const zoomed=calculateCameraPose({width:1536,height:870,zoom:1.3});
assert(zoomed.distance<baseline.distance,'Zoom-in makes the ground closer');
console.log('PASS: camera presets, rectangular stage, neutral framing, low perspective and stable orbit distance.');
