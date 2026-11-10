import assert from 'node:assert/strict';
import * as T from '../assets/grim-158/vendor/three.module.js';
import {createNativeCardLayer} from '../assets/grim-158/native-cards.js';

// Old per-card CSS silhouette occlusion (grim-144) was replaced by actual
// depth-tested meshes. Verify the current scene geometry instead.
function fakeCanvas(){
  const ctx={
    clearRect(){},setTransform(){},save(){},restore(){},beginPath(){},
    moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},
    fill(){},stroke(){},clip(){},fillRect(){},fillText(){},
    createLinearGradient(){return {addColorStop(){}};},
    measureText(s){return {width:String(s).length*8};}
  };
  return {width:0,height:0,getContext(type){assert.equal(type,'2d');return ctx;}};
}
globalThis.document={createElement(type){assert.equal(type,'canvas');return fakeCanvas();}};
const scene=new T.Scene();
const cards=createNativeCardLayer(scene);
const layout={side:'player',scale:.72,rank:1,active:true};
const actors=[{id:'test',name:'Test',faction:'player',initiative:1,hp:10,maxHp:10,ac:10,level:1,className:'Fighter',ancestry:'Human'}];
cards.setCards([{id:'test',x:0,z:0,active:true,layout}],actors,true);
const entry=cards.entries.get('test');
assert(entry,'A real current-version native card must be created');
assert(entry.faceMesh.material.depthTest && entry.faceMesh.material.depthWrite,
  'Card face must participate in the shared Three.js depth buffer');
const camera=new T.PerspectiveCamera(42,1400/900,.1,140);
camera.position.set(0,5,18);
camera.lookAt(0,1,0);
camera.updateMatrixWorld(true);
cards.update(camera,1400,900,{terrainWidth:32,terrainDepth:20,seed:1,variation:0,hills:'flat'},()=>0);
scene.updateMatrixWorld(true);
const target=entry.faceMesh.getWorldPosition(new T.Vector3());
const ray=new T.Raycaster(camera.position,target.clone().sub(camera.position).normalize());
const cardHit=ray.intersectObject(entry.faceMesh)[0];
assert(cardHit,'Center ray must intersect the positioned card face');
const front=new T.Mesh(new T.BoxGeometry(2,3,.35),new T.MeshBasicMaterial());
front.position.copy(camera.position).lerp(target,.45);
front.updateMatrixWorld(true);
const frontHit=ray.intersectObject(front)[0];
assert(frontHit && frontHit.distance<cardHit.distance,
  'A foreground mesh intersects the sightline before the card');
const behind=new T.Mesh(new T.BoxGeometry(2,3,.35),new T.MeshBasicMaterial());
behind.position.copy(target).addScaledVector(ray.ray.direction,4);
behind.updateMatrixWorld(true);
const behindHit=ray.intersectObject(behind)[0];
assert(behindHit && behindHit.distance>cardHit.distance,
  'Background geometry intersects the sightline after the card');
const frontOrder=ray.intersectObjects([entry.faceMesh,front]);
const backOrder=ray.intersectObjects([entry.faceMesh,behind]);
assert.equal(frontOrder[0].object,front,'Foreground geometry wins the depth ordering');
assert.equal(backOrder[0].object,entry.faceMesh,'Card wins the depth ordering against rear geometry');
cards.dispose();
front.geometry.dispose();front.material.dispose();
behind.geometry.dispose();behind.material.dispose();
console.log('PASS: current native card depth flags and foreground/background ray intersection ordering.');