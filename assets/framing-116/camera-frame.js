import * as THREE from './vendor/three.module.js';

// Camera and terrain use real, unscaled world units. This view favors a
// higher spectator angle so a wide rectangular battlefield fills most of a
// landscape TV instead of becoming a thin strip surrounded by empty black.
// Manual zoom applies AFTER the fit: it is never silently cancelled.
const point = new THREE.Vector3();
export function fitBattlefieldCamera(camera, {
  width, height, yaw=0, pitch=0, zoom=1, fieldWidth=35, fieldDepth=19,
}={}) {
  width=Math.max(1,width||1); height=Math.max(1,height||1);
  const aspect=width/height;
  camera.clearViewOffset();
  camera.aspect=aspect;
  camera.fov=aspect<1?44:38;
  camera.updateProjectionMatrix();
  const orbitFit=1+Math.abs(Math.sin(yaw))*.19;
  const portraitFit=Math.max(1,1.07/aspect);
  const factor=orbitFit*portraitFit;
  camera.position.set(Math.sin(yaw)*14*factor, (28+pitch*.7)*factor, Math.cos(yaw)*14*factor);
  camera.lookAt(0,0,0);
  camera.updateMatrixWorld();
  // Leave some upper clearance for the distant enemy cards and initiative HUD.
  // Use the physical rectangle's four corners, not a guess based on FOV.
  for(let step=0;step<8;step++) {
    let maxX=0,maxY=0;
    for(const x of [-fieldWidth/2,fieldWidth/2]) {
      for(const z of [-fieldDepth/2,fieldDepth/2]) {
        point.set(x,0,z).project(camera);
        maxX=Math.max(maxX,Math.abs(point.x));
        maxY=Math.max(maxY,Math.abs(point.y));
      }
    }
    const scale=Math.max(maxX/.967,maxY/.89);
    if(scale<=1.001) break;
    camera.position.multiplyScalar(scale*1.004);
    camera.updateMatrixWorld();
  }
  const manualZoom=Math.max(.72,Math.min(1.6,Number(zoom)||1));
  camera.position.multiplyScalar(1/manualZoom);
  camera.updateMatrixWorld();
  // Nudge the world down in the actual lens projection. The far-side cards
  // then clear the top initiative HUD without decoupling cards from terrain.
  const frameShift=Math.min(34,Math.round(height*.045));
  camera.setViewOffset(width,height,0,-frameShift,width,height);
  camera.updateMatrixWorld();
}
