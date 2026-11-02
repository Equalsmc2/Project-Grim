// Run: node tests/world-anchor.test.mjs
import assert from 'node:assert/strict';
import * as THREE from '../assets/grim-1410/vendor/three.module.js';
const storage=new Map();
globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
globalThis.window={addEventListener:()=>{}};
globalThis.BroadcastChannel=class{postMessage(){}};
const {planFormation}=await import('../assets/grim-1410/formation.js');
const roster=[
 {id:'enemy2',name:'Enemy 2',faction:'enemy',initiative:9},
 {id:'pc4',name:'PC 4',faction:'player',initiative:10},
 {id:'pc1',name:'PC 1',faction:'player',initiative:27},
 {id:'enemy1',name:'Enemy 1',faction:'enemy',initiative:23},
 {id:'pc3',name:'PC 3',faction:'player',initiative:14},
 {id:'pc2',name:'PC 2',faction:'player',initiative:22},
];
const state={characters:roster,combat:{activeId:'pc1'},presentation:{cardScale:1}};
const layout=planFormation(state,roster,true,1536,960).placements;
assert(layout.get('enemy1').worldX<layout.get('enemy2').worldX,'enemy initiative is left to right');
assert(layout.get('pc1').worldX<layout.get('pc2').worldX&&layout.get('pc2').worldX<layout.get('pc3').worldX&&layout.get('pc3').worldX<layout.get('pc4').worldX,'player initiative is left to right');
for(const id of ['pc1','pc2','pc3','pc4'])assert(layout.get(id).worldZ>0,'PCs stay near side');
for(const id of ['enemy1','enemy2'])assert(layout.get(id).worldZ<0,'enemies stay far side');
// Spotlight may change appearance, but not the physical anchor.
const state2={...state,combat:{activeId:'pc3'}};
const layout2=planFormation(state2,roster,true,1536,960).placements;
for(const c of roster)assert.deepEqual([layout.get(c.id).worldX,layout.get(c.id).worldZ],[layout2.get(c.id).worldX,layout2.get(c.id).worldZ],`fixed anchor for ${c.id}`);
// Check that projecting the same physical marker through orbiting cameras
// really moves the marker in screen space, without moving its world position.
function cameraFor(w,h,yawD){
 const yaw=yawD*Math.PI/180,camera=new THREE.PerspectiveCamera(42,w/h,.1,140);
 camera.position.set(Math.sin(yaw)*26,24,Math.cos(yaw)*26);
 camera.lookAt(0,0,0);camera.updateMatrixWorld();return camera;
}
function screen(camera,w,h,p){const v=new THREE.Vector3(p.worldX,.96,p.worldZ).project(camera);return [(v.x+1)*w/2,(1-v.y)*h/2];}
const initial=screen(cameraFor(1536,960,0),1536,960,layout.get('pc1'));
const rotated=screen(cameraFor(1536,960,30),1536,960,layout.get('pc1'));
assert(Math.hypot(rotated[0]-initial[0],rotated[1]-initial[1])>30,'card follows camera orbit');
for(const [w,h] of [[1536,960],[1366,768],[1024,768],[390,844]]){
 const l=planFormation(state,roster,true,w,h).placements;
 for(const [id,p] of l){
  assert(Math.abs(p.worldX)<16,`${id} marker within terrain width at ${w}`);
  assert(Math.abs(p.worldZ)<10,`${id} marker within terrain depth at ${w}`);
 }
}
const extra=Array.from({length:12},(_,i)=>({id:'extra'+i,faction:'player',initiative:100-i}));
const many=planFormation({characters:extra,combat:{activeId:'extra0'},presentation:{cardScale:1}},extra,true,1536,960).placements;
assert.equal(new Set([...many.values()].map(p=>p.worldZ)).size,2,'large teams occupy two physical rows');
console.log('PASS: team initiative order; fixed 3D anchors; camera projection/orbit; terrain boundaries; responsive formations; large-roster rows.');
