import * as T from './vendor/three.module.js';
import {calculateCameraPose,applyCameraPose,MIN_CAMERA_ZOOM,MAX_CAMERA_ZOOM} from './camera-frame.js';
import {cardPixelSize,worldHeightForPixels,CARD_WIDTH_PX,CARD_HEIGHT_PX} from './native-cards.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
// Zoom is constrained by the actual projected card rectangles (not just their
// ground anchors). This means a close-up cannot silently crop outer cards.
export function clampZoomToCards({requestedZoom=1,anchors=[],width=1536,height=864,mode='ground',yaw=0,pitch=0,fieldWidth=32,fieldDepth=20,env={},landscapeHeight=()=>0}={}){
 const requested=clamp(Number(requestedZoom)||1,MIN_CAMERA_ZOOM,MAX_CAMERA_ZOOM);
 if(!anchors?.length||width<1||height<1)return requested;
 const camera=new T.PerspectiveCamera(40,width/height,.1,240);
 const basis=new T.Vector3(),center=new T.Vector3(),point=new T.Vector3(),forward=new T.Vector3(),offset=new T.Vector3();
 const yawDegrees=yaw*180/Math.PI;
 // Allow room for the built-in gentle cinematic sway; don't force aggressive
 // retreat. Other orbit angles are evaluated when the user rotates manually.
 const views=mode==='ground'?[yawDegrees, Math.min(12,yawDegrees+12),Math.max(-12,yawDegrees-12)]:[yawDegrees];
 function fits(z){
  for(const deg of views){
   const pose=calculateCameraPose({width,height,mode,yaw:deg*Math.PI/180,pitch,zoom:z,fieldWidth,fieldDepth});
   applyCameraPose(camera,pose);
   forward.set(0,0,-1).applyQuaternion(camera.quaternion);
   for(const a of anchors){
    const ground=landscapeHeight(a.x,a.z,fieldWidth,fieldDepth,env.seed,env.variation,env.hills);
    const hover=a.active?1.28:1.02;
    point.set(a.x,ground+hover,a.z);
    const distance=camera.position.distanceTo(point);
    const pix=cardPixelSize(width,a.layout?.scale??.72,distance);
    offset.copy(point).sub(camera.position);
    const depth=Math.max(.1,offset.dot(forward));
    const h=worldHeightForPixels(pix.height,height,depth,camera.fov);
    const w=h*CARD_WIDTH_PX/CARD_HEIGHT_PX;
    center.set(a.x,ground+hover+h*.5,a.z);
    for(const sx of [-1,1])for(const sy of [-1,1]){
     basis.set(sx*w*.5,sy*h*.5,0).applyQuaternion(camera.quaternion).add(center).project(camera);
     if(!Number.isFinite(basis.x)||!Number.isFinite(basis.y)||basis.z>1||Math.abs(basis.x)>.96||basis.y>.87||basis.y<-.88)return false;
    }
   }
  }
  return true;
 }
 if(fits(requested))return requested;
 if(!fits(MIN_CAMERA_ZOOM))return MIN_CAMERA_ZOOM;
 let lo=MIN_CAMERA_ZOOM,hi=requested;
 for(let i=0;i<12;i++){
  const mid=(lo+hi)/2;
  if(fits(mid))lo=mid;else hi=mid;
 }
 return Math.floor(lo*1000)/1000;
}
