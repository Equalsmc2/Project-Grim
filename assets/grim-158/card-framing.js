import * as T from './vendor/three.module.js';
import {CARD_WIDTH_PX,CARD_HEIGHT_PX,cardPixelSize,worldHeightForPixels} from './native-cards.js';

// This acts on the actual WebGL camera, AFTER zoom, manual orbit, cinematic
// movement and camera transitions. The 1.4.10 framing fallback allowed an
// unlimited camera retreat and zoom as low as 6%, turning the whole world into
// a speck. 1.4.11 instead uses a bounded camera retreat plus an adaptive
// card-only display scale. Physical anchors never move.
export function fitAllCardsInView(camera,anchors,width,height,env,landscapeHeight,{
  left=-.92,right=.92,top=.80,bottom=-.79,
  maxRetreat=width<700?42:width<1100?20:12,
  maxEmergencyRetreat=width<700?90:width<1100?45:35
}={}){
  if(!anchors?.length||width<1||height<1)return {retreat:0,scale:1,fits:true};
  const saved=camera.position.clone();
  const backward=new T.Vector3(0,0,1).applyQuaternion(camera.quaternion);
  const forward=new T.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
  const rightDir=new T.Vector3(1,0,0).applyQuaternion(camera.quaternion);
  const upDir=new T.Vector3(0,1,0).applyQuaternion(camera.quaternion);
  const groundPoint=new T.Vector3(),relative=new T.Vector3();
  const center=new T.Vector3(),corner=new T.Vector3();
  const tolerance=.0001;

  function fitsAt(retreat,scale){
    camera.position.copy(saved).addScaledVector(backward,retreat);
    camera.updateMatrixWorld(true);
    for(const a of anchors){
      const ground=landscapeHeight(a.x,a.z,env.terrainWidth,env.terrainDepth,env.seed,env.variation,env.hills);
      // Reserve both inactive-low and active-high positions for every card.
      // This avoids reframing on turn switches without cropping lower edges.
      for(const hover of [1.02,1.28+.034]){
        groundPoint.set(a.x,ground+hover,a.z);
        const distance=camera.position.distanceTo(groundPoint);
        const pix=cardPixelSize(width,a.layout?.scale??.72,distance);
        relative.copy(groundPoint).sub(camera.position);
        const depth=relative.dot(forward);
        if(depth<=camera.near+.03)return false;
        const h=worldHeightForPixels(pix.height*scale,height,depth,camera.fov);
        const w=h*CARD_WIDTH_PX/CARD_HEIGHT_PX;
        center.copy(groundPoint);center.y+=h*.5;
        for(const sx of [-1,1])for(const sy of [-1,1]){
          corner.copy(center).addScaledVector(rightDir,sx*w*.5).addScaledVector(upDir,sy*h*.5).project(camera);
          if(!Number.isFinite(corner.x)||!Number.isFinite(corner.y)||!Number.isFinite(corner.z)||
            corner.x<left-tolerance||corner.x>right+tolerance||
            corner.y<bottom-tolerance||corner.y>top+tolerance||
            corner.z<-1||corner.z>1)return false;
        }
      }
    }
    return true;
  }
  function findRetreat(scale,limit){
    if(fitsAt(0,scale))return 0;
    if(!fitsAt(limit,scale))return null;
    let lo=0,hi=limit;
    for(let i=0;i<17;i++){
      const mid=(lo+hi)*.5;
      if(fitsAt(mid,scale))hi=mid;else lo=mid;
    }
    return hi+.012;
  }

  // The previous discrete [.94,.88,.82,...] steps snapped every native card
  // smaller when the camera crossed a framing threshold. Solve card scale
  // continuously instead; retreat and scale now change smoothly with orbit.
  const fullSizeRetreat=findRetreat(1,maxRetreat);
  let result;
  if(fullSizeRetreat!==null){
    result={retreat:fullSizeRetreat,scale:1,fits:true};
  }else if(fitsAt(maxRetreat,.18)){
    let low=.18,high=1;
    for(let i=0;i<17;i++){
      const mid=(low+high)*.5;
      if(fitsAt(maxRetreat,mid))low=mid;else high=mid;
    }
    result={retreat:maxRetreat,scale:low,fits:true};
  }else{
    // Keep the same hard retreat bounds for crowded rosters. Below .18 only
    // truly extreme cases are forced to use smaller, still continuous cards.
    const emergencyRetreat=findRetreat(.18,maxEmergencyRetreat);
    if(emergencyRetreat!==null){
      result={retreat:emergencyRetreat,scale:.18,fits:true};
    }else{
      const retreat=maxEmergencyRetreat;
      let low=.005,high=.18;
      if(!fitsAt(retreat,low))result={retreat,scale:low,fits:false};
      else{
        for(let i=0;i<17;i++){
          const mid=(low+high)*.5;
          if(fitsAt(retreat,mid))low=mid;else high=mid;
        }
        result={retreat,scale:low,fits:true};
      }
    }
  }
  camera.position.copy(saved).addScaledVector(backward,result.retreat);
  camera.updateMatrixWorld(true);
  return result;
}
