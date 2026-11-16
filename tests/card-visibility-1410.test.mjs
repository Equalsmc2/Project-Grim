import assert from 'node:assert/strict';
import * as T from '../assets/grim-158/vendor/three.module.js';
import {calculateCameraPose,applyCameraPose} from '../assets/grim-158/camera-frame.js';
import {fitAllCardsInView} from '../assets/grim-158/card-framing.js';
import {cardPixelSize,worldHeightForPixels,CARD_WIDTH_PX,CARD_HEIGHT_PX} from '../assets/grim-158/native-cards.js';

const env={terrainWidth:32,terrainDepth:20,hills:'flat',seed:7301,variation:0};
const terrain=()=>0;
const right=new T.Vector3(),up=new T.Vector3(),front=new T.Vector3(),p=new T.Vector3(),tmp=new T.Vector3(),corner=new T.Vector3();
function actualBounds(camera,anchors,width,height,scale=1){
 camera.updateMatrixWorld(true);
 right.set(1,0,0).applyQuaternion(camera.quaternion);
 up.set(0,1,0).applyQuaternion(camera.quaternion);
 front.set(0,0,-1).applyQuaternion(camera.quaternion);
 let minX=1000,maxX=-1000,minY=1000,maxY=-1000;
 for(const a of anchors){
  const hover=a.active?1.28:1.02;
  const distance=camera.position.distanceTo(p.set(a.x,hover,a.z));
  const pix=cardPixelSize(width,a.layout.scale,distance);
  const depth=tmp.copy(p).sub(camera.position).dot(front);
  const h=worldHeightForPixels(pix.height*scale,height,depth,camera.fov),w=h*CARD_WIDTH_PX/CARD_HEIGHT_PX;
  p.y+=h*.5;
  for(const sx of [-1,1])for(const sy of [-1,1]){
   corner.copy(p).addScaledVector(right,sx*w*.5).addScaledVector(up,sy*h*.5).project(camera);
   minX=Math.min(minX,corner.x);maxX=Math.max(maxX,corner.x);minY=Math.min(minY,corner.y);maxY=Math.max(maxY,corner.y);
  }
 }
 return {minX,maxX,minY,maxY};
}
const roster=(count,z=4)=>Array.from({length:count},(_,i)=>({id:String(i),x:count===1?0:-13+i*26/(count-1),z:(i%2?-z:z),active:i===0,layout:{scale:.72}}));
let checked=0;
for(const [w,h] of [[1920,920],[1536,850],[1280,700],[1024,620],[390,710],[320,520]]){
 for(const mode of ['ground','tactical','overhead']){
  for(const yaw of [-18,0,18]){
   for(const count of [1,4,7,14]){
    const actors=roster(count);
    const camera=new T.PerspectiveCamera(40,w/h,.1,22000);
    applyCameraPose(camera,calculateCameraPose({width:w,height:h,mode,yaw:yaw*Math.PI/180,pitch:7,zoom:1.45}));
    // Simulate the cinematic dolly/sideways glide as well.
    camera.position.x+=.55;
    camera.updateMatrixWorld(true);
    const result=fitAllCardsInView(camera,actors,w,h,env,terrain);
    assert(result.fits,`fit failed at ${w}x${h}/${mode}/${yaw}/${count}`);
    const b=actualBounds(camera,actors,w,h,result.scale);
    assert(b.minX>=-.925&&b.maxX<=.925&&b.minY>=-.795&&b.maxY<=.805,`out of frame ${w}x${h}/${mode}/${yaw}/${count} -> ${JSON.stringify(b)}`);
    checked++;
   }
  }
 }
}
// Already-safe camera must be preserved, preventing gratuitous zoom-outs.
const cam=new T.PerspectiveCamera(40,16/9,.1,22000);
applyCameraPose(cam,calculateCameraPose({width:1536,height:864,mode:'tactical',zoom:1}));
const before=cam.position.clone();
const fitted=fitAllCardsInView(cam,roster(1),1536,864,env,terrain);
assert.equal(fitted.retreat,0);assert(cam.position.distanceTo(before)<1e-9);
// Edge-of-stage pans used to switch between fixed card sizes (.94, .88, ...)
// in one frame. Track a crowded formation through tiny yaw increments.
let previous=null,maxScaleChange=0,maxRetreatChange=0,scaleVaries=false;
for(let index=0;index<=192;index++){
 const yaw=(-12+index*.125)*Math.PI/180;
 const camera=new T.PerspectiveCamera(40,390/710,.1,22000);
 applyCameraPose(camera,calculateCameraPose({width:390,height:710,mode:'ground',yaw,pitch:1,zoom:1.3}));
 camera.position.x+=.55;
 const shot=fitAllCardsInView(camera,roster(14),390,710,env,terrain);
 assert(shot.fits,'Every card must stay visible during a slow camera pan');
 if(previous){
  maxScaleChange=Math.max(maxScaleChange,Math.abs(previous.scale-shot.scale));
  maxRetreatChange=Math.max(maxRetreatChange,Math.abs(previous.retreat-shot.retreat));
  scaleVaries||=Math.abs(previous.scale-shot.scale)>1e-6;
 }
 previous=shot;
}
assert(maxScaleChange<.025,`Card sizes jumped during a tiny pan: ${maxScaleChange}`);
assert(maxRetreatChange<1.2,`Camera retreat jumped during a tiny pan: ${maxRetreatChange}`);
assert(scaleVaries,'This scenario should exercise continuous card scaling');
const shiftActors=roster(7);
const turnFit=activeId=>{
 const camera=new T.PerspectiveCamera(40,1536/864,.1,22000);
 applyCameraPose(camera,calculateCameraPose({width:1536,height:864,mode:'ground',yaw:9*Math.PI/180}));
 return fitAllCardsInView(camera,shiftActors.map(a=>({...a,active:a.id===activeId})),1536,864,env,terrain);
};
assert.deepEqual(turnFit('0'),turnFit('6'),'Active turn changes must not snap camera retreat or card scale');
console.log(`PASS: ${checked} camera/roster/viewport scenarios keep every adaptive native card in bounds during zoom, orbit and cinematic glide.`);
