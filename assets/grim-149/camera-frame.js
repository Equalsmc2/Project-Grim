import * as THREE from './vendor/three.module.js';

// Every perspective uses the SAME battlefield geometry. The default ratio is
// now 32 × 20, which reads better in the preferred ground-level view while
// still supporting tactical and overhead inspection.
export const FIELD_WIDTH = 32;
export const FIELD_DEPTH = 20;
export const CAMERA_VIEWS = Object.freeze({
  tactical: Object.freeze({elevation: 41, distance: 27.5, fov: 40, targetY: .40, targetZ: -.8, limit: 24}),
  ground: Object.freeze({elevation: 19, distance: 24.2, fov: 40, targetY: 1.05, targetZ: -1.65, limit: 20}),
  overhead: Object.freeze({elevation: 74, distance: 29.8, fov: 42, targetY: 0, targetZ: 0, limit: 28}),
});
export const DEFAULT_CAMERA_VIEW = 'ground';
export const MAX_ORBIT_DEGREES = 24;
export const MIN_CAMERA_ZOOM = .9;
export const MAX_CAMERA_ZOOM = 1.45;
const clamp = (v,a,b)=>Math.min(b,Math.max(a,v));
const tmp = new THREE.Vector3();

export function calculateCameraPose({width=1536,height=864,yaw=0,pitch=0,zoom=1,mode=DEFAULT_CAMERA_VIEW,fieldWidth=FIELD_WIDTH,fieldDepth=FIELD_DEPTH}={}) {
  width=Math.max(width||1,1);height=Math.max(height||1,1);
  const preset=CAMERA_VIEWS[mode]||CAMERA_VIEWS[DEFAULT_CAMERA_VIEW];
  const aspect=width/height;
  const fov=aspect<.85?preset.fov+4:preset.fov;
  const angle=clamp((preset.elevation + clamp(pitch,-11,11))*Math.PI/180, 9*Math.PI/180, 87*Math.PI/180);
  // Portrait view uses more distance because the horizontal field of view is
  // smaller. Desktop views never use the old rotating-corner auto-zoom.
  let dist=preset.distance*Math.max(1,1.14/aspect);
  const target=new THREE.Vector3(0,preset.targetY,preset.targetZ);
  // Fitting from yaw=0 only, for desktop viewport variations. Ground view is
  // the default and intentionally cinematic: its near edge may crop rather
  // than zooming away just to show every corner of the terrain.
  if(mode!=='ground') {
    const cam=new THREE.PerspectiveCamera(fov,aspect,.1,180);
    cam.position.set(0,target.y+Math.sin(angle)*dist,target.z+Math.cos(angle)*dist);
    cam.lookAt(target);cam.updateMatrixWorld();
    let maxX=0,maxY=0;
    for(const x of [-fieldWidth/2,fieldWidth/2])for(const z of [-fieldDepth/2,fieldDepth/2]){
      tmp.set(x,0,z).project(cam);maxX=Math.max(maxX,Math.abs(tmp.x));maxY=Math.max(maxY,Math.abs(tmp.y));
    }
    // Light crop of the near corners is allowed to prioritize the encounter.
    const factor=mode==='tactical'?Math.max(1,maxX/1.11,maxY/1.13):Math.max(1,maxX/1.03,maxY/1.04);
    dist*=factor;
  }
  dist/=clamp(Number(zoom)||1,MIN_CAMERA_ZOOM,MAX_CAMERA_ZOOM);
  const rotated=clamp(yaw,-preset.limit*Math.PI/180,preset.limit*Math.PI/180);
  const horizontal=Math.cos(angle)*dist;
  const position=new THREE.Vector3(Math.sin(rotated)*horizontal,target.y+Math.sin(angle)*dist,target.z+Math.cos(rotated)*horizontal);
  return {position,target,fov,aspect,elevation:angle*180/Math.PI,distance:dist,mode:CAMERA_VIEWS[mode]?mode:DEFAULT_CAMERA_VIEW};
}

export function applyCameraPose(camera,pose) {
  camera.position.copy(pose.position);
  camera.fov=pose.fov;
  camera.aspect=pose.aspect;
  camera.updateProjectionMatrix();
  camera.lookAt(pose.target);
  camera.updateMatrixWorld();
  return camera;
}

export function fitBattlefieldCamera(camera,opts={}) {
  return applyCameraPose(camera,calculateCameraPose(opts));
}
