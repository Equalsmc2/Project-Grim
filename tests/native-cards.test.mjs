import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../assets/grim-1413/vendor/three.module.js';
import {createNativeCardLayer,cardVisualData,cardPixelSize,worldHeightForPixels,CARD_WIDTH_PX,CARD_HEIGHT_PX} from '../assets/grim-1413/native-cards.js';

const sink=[];
function fakeCanvas(){
 const ctx={
  clearRect(){},setTransform(){},save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},fill(){},stroke(){},clip(){},fillRect(){},fillText(){},
  createLinearGradient(){return {addColorStop(){}};},measureText(s){return {width:String(s).length*8};}
 };
 return {width:0,height:0,getContext(type){assert.equal(type,'2d');return ctx;}};
}
globalThis.document={createElement(type){assert.equal(type,'canvas');return fakeCanvas();}};
const scene=new T.Scene();
const cards=createNativeCardLayer(scene,{onChange:()=>sink.push('texture')});
const placement={side:'player',scale:.72,rank:1,active:true};
const players=[{id:'p1',name:'A long character name',faction:'player',initiative:21,hp:32,maxHp:45,ac:20,level:3,className:'Champion',ancestry:'Human',conditions:['Frightened 1'],symbol:'01'},
 {id:'e1',name:'Ghoul',faction:'enemy',initiative:12,hp:14,maxHp:15,ac:16,level:1,className:'Undead',ancestry:'Ghoul'}];
const anchors=[{id:'p1',x:-2,z:4,active:true,layout:placement},{id:'e1',x:1,z:-4,active:false,layout:{...placement,side:'enemy',active:false,rank:2}}];
assert.equal(cardVisualData(players[0],placement,true).name,'A long character name');
assert(cardPixelSize(1536,.72,30).height>80);
assert(worldHeightForPixels(120,800,30,40)>0);
cards.setCards(anchors,players,true);
assert.equal(cards.count,2);
const pc=cards.entries.get('p1');assert(pc,'Player has native mesh');
assert(pc.mesh.material.depthTest && pc.mesh.material.depthWrite && !pc.mesh.material.transparent,'Meshes use genuine shared 3D depth buffer');
assert(pc.mesh.material.alphaTest>0 && pc.mesh.material.fog===false,'Card remains legible in fog and trims its silhouette');
assert(pc.texture.image.width>=CARD_WIDTH_PX*3 && pc.texture.image.height>=CARD_HEIGHT_PX*3,'Texture is sharper than HTML-sized card');
assert(sink.length===2,'Initial upload only for new cards');
const camera=new T.PerspectiveCamera(42,1536/864,.1,140);camera.position.set(0,13,25);camera.lookAt(0,0,0);camera.updateMatrixWorld();
const env={terrainWidth:32,terrainDepth:20,seed:1,variation:.3,hills:'flat'};
cards.update(camera,1536,864,env,()=>0);
const pBefore=pc.mesh.position.clone();assert.equal(pBefore.x,-2);assert.equal(pBefore.z,4);
assert(pc.mesh.scale.y>1 && pc.mesh.scale.x>0,'Card has physical world dimensions');
camera.position.set(9,12,24);camera.lookAt(0,0,0);camera.updateMatrixWorld();
cards.update(camera,1536,864,env,()=>0);
assert.equal(pc.mesh.position.x,pBefore.x,'Orbit does not change world anchor');
assert.equal(pc.mesh.position.z,pBefore.z,'Orbit does not change ground z');
assert(pc.mesh.quaternion.angleTo(camera.quaternion)<1e-6,'Plane continues facing camera');
cards.setCards(anchors,players,true);assert.equal(sink.length,2,'Camera and redundant updates never rerasterize card textures');
players[0].hp=21;cards.setCards(anchors,players,true);assert.equal(sink.length,3,'HP change repaints the card immediately');
cards.setCards(anchors.slice(1),players,true);assert.equal(cards.count,1,'Removed combatants are disposed and detached');
cards.dispose();assert.equal(cards.count,0);assert(!scene.children.includes(cards.group));
const world=readFileSync(new URL('../assets/grim-1413/world.js',import.meta.url),'utf8');
const stage=readFileSync(new URL('../assets/grim-1413/stage.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../assets/grim-1413/styles.css',import.meta.url),'utf8');
assert(!world.includes('cardOcclusionClip(')&&!world.includes('projectOccluders('),'Removed inaccurate CSS silhouette clipping');
assert(world.includes('nativeCards.update(camera,width,height,env,landscapeHeight,time,fitScale)'));
assert(world.includes('nativeCards.dispose()'));
assert(stage.includes('world.setCards(layout.placements,chars,combat)'));
assert(css.includes('.native-cards-ready .card-positions'));
console.log('PASS: native depth-test, textures, card data changes, camera billboarding, world anchors, resource lifecycle and fallback.');
