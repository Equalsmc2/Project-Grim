import * as THREE from './vendor/three.module.js';

// Camera framing: fit the arena once from the neutral, front-facing view.
// IMPORTANT: never fit again for yaw. Fitting rotated corners forced the
// camera farther away as the user orbited, producing a tiny diamond stage.
// A modest orbit arc preserves the wide rectangle and legible world anchors.
const point = new THREE.Vector3();
const BASE_ELEVATION = 28;
const BASE_RADIUS = 18;
export const MAX_ORBIT_DEGREES = 14;
export const MIN_CAMERA_ZOOM = 1;
export const MAX_CAMERA_ZOOM = 1.5;
export function fitBattlefieldCamera(camera, {
  width, height, yaw=0, pitch=0, zoom=1, fieldWidth=35, fieldDepth=19,
}={}) {
  width=Math.max(1,width||1);
  height=Math.max(1,height||1);
  const aspect=width/height;
  camera.clearViewOffset();
  camera.aspect=aspect;
  camera.fov=aspect<1?44:38;
  camera.updateProjectionMatrix();

  // Measure the default battlefield orientation ONLY. This distance depends
  // on viewport dimensions, never on camera rotation or active combatant.
  camera.position.set(0,BASE_ELEVATION,BASE_RADIUS);
  camera.lookAt(0,0,0);
  camera.updateMatrixWorld();
  let maxX=0,maxY=0;
  for (const x of [-fieldWidth/2,fieldWidth/2]) {
    for (const z of [-fieldDepth/2,fieldDepth/2]) {
      point.set(x,0,z).project(camera);
      maxX=Math.max(maxX,Math.abs(point.x));
      maxY=Math.max(maxY,Math.abs(point.y));
    }
  }
  const fit=Math.max(1,maxX/.94,maxY/.81);
  const orbit=Math.max(-MAX_ORBIT_DEGREES,Math.min(MAX_ORBIT_DEGREES,yaw*180/Math.PI))*Math.PI/180;
  const zoomFactor=Math.max(MIN_CAMERA_ZOOM,Math.min(MAX_CAMERA_ZOOM,Number(zoom)||1));
  const r=BASE_RADIUS*fit/zoomFactor;
  const y=(BASE_ELEVATION+Math.max(-8,Math.min(8,pitch))*.65)*fit/zoomFactor;
  camera.position.set(Math.sin(orbit)*r,y,Math.cos(orbit)*r);
  camera.lookAt(0,0,0);
  camera.updateMatrixWorld();
}
