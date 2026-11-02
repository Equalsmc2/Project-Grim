import * as T from './vendor/three.module.js';
import {CARD_WIDTH_PX,CARD_HEIGHT_PX,cardPixelSize,worldHeightForPixels} from './native-cards.js';

// Final safety net for the ACTUAL camera, after camera presets, zoom, manual
// orbit, cinematic dolly and any intermediate transition frame have run.
// It never moves cards from their world anchors and never changes the camera
// heading: the camera is pulled straight back only when a card would crop.
// This avoids relying on a minimum zoom value that might still crop cards.
export function fitAllCardsInView(camera,anchors,width,height,env,landscapeHeight,{
  left=-.92,right=.92,top=.80,bottom=-.79,maxRetreat=16000
}={}){
  if(!anchors?.length || width<1 || height<1)return {retreat:0,fits:true};
  const saved=camera.position.clone();
  const backward=new T.Vector3(0,0,1).applyQuaternion(camera.quaternion);
  const center=new T.Vector3(),relative=new T.Vector3(),point=new T.Vector3();
  const corner=new T.Vector3(),local=new T.Vector3();
  const rightDir=new T.Vector3(1,0,0).applyQuaternion(camera.quaternion);
  const upDir=new T.Vector3(0,1,0).applyQuaternion(camera.quaternion);
  const forward=new T.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
  const over=.0001;
  function fitsAt(retreat){
    camera.position.copy(saved).addScaledVector(backward,retreat);
    camera.updateMatrixWorld(true);
    for(const a of anchors){
      const ground=landscapeHeight(a.x,a.z,env.terrainWidth,env.terrainDepth,env.seed,env.variation,env.hills);
      const hover=a.active?1.28:1.02;
      point.set(a.x,ground+hover,a.z);
      const distance=camera.position.distanceTo(point);
      const pix=cardPixelSize(width,a.layout?.scale??.72,distance);
      relative.copy(point).sub(camera.position);
      const depth=relative.dot(forward);
      if(depth<=camera.near+.03)return false;
      const cardH=worldHeightForPixels(pix.height,height,depth,camera.fov);
      const cardW=cardH*CARD_WIDTH_PX/CARD_HEIGHT_PX;
      center.set(a.x,ground+hover+cardH*.5,a.z);
      for(const sx of [-1,1])for(const sy of [-1,1]){
        corner.copy(center).addScaledVector(rightDir,sx*cardW*.5).addScaledVector(upDir,sy*cardH*.5).project(camera);
        if(!Number.isFinite(corner.x)||!Number.isFinite(corner.y)||!Number.isFinite(corner.z)
          ||corner.x<left-over||corner.x>right+over||corner.y<bottom-over||corner.y>top+over
          ||corner.z < -1 || corner.z>1)return false;
      }
    }
    return true;
  }
  if(fitsAt(0))return {retreat:0,fits:true};
  let low=0,high=1;
  while(high<maxRetreat&&!fitsAt(high)){low=high;high*=2;}
  high=Math.min(high,maxRetreat);
  if(!fitsAt(high)){
    // Pathological viewport / roster: still keep the best available camera,
    // never silently restore the original known-clipped camera position.
    return {retreat:high,fits:false};
  }
  for(let i=0;i<16;i++){
    const middle=(low+high)/2;
    if(fitsAt(middle))high=middle;else low=middle;
  }
  fitsAt(high+.015);
  return {retreat:high+.015,fits:true};
}
