import assert from 'node:assert/strict';
import * as T from '../assets/grim-158/vendor/three.module.js';
import {createNativeCardLayer,TEXTURE_WIDTH,TEXTURE_HEIGHT} from '../assets/grim-158/native-cards.js';

// Recreates the exact expensive case: many persistent Burning/Frozen cards
// across 3 seconds of animation with an unchanged roster and camera.
let canvasCreations=0;
const mockContext={
  clearRect(){}, setTransform(){}, save(){}, restore(){},beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},fill(){},stroke(){},clip(){},fillRect(){},fillText(){},lineTo(){},drawImage(){},
  createLinearGradient(){return {addColorStop(){}}},measureText(str){return {width:String(str).length*7}}
};
globalThis.document={createElement(type){assert.equal(type,'canvas');canvasCreations++;return {width:0,height:0,getContext(){return mockContext;}};}};
globalThis.window={matchMedia(){return {matches:false}}};
const scene=new T.Scene();let uploads=0;
const layer=createNativeCardLayer(scene,{onChange(){uploads++;}});
const characters=Array.from({length:16},(_,i)=>({id:`unit-${i}`,name:`Unit ${i}`,conditions:[i%2?'Frozen':'Burning 2'],hp:20,maxHp:30,initiative:30-i,ac:17,level:3}));
const anchors=characters.map((c,i)=>({id:c.id,x:(i%8-3.5)*2.2,z:i<8?-3:3,active:i===0,layout:{scale:.72,side:i<8?'enemy':'player',rank:i+1,active:i===0}}));
layer.setCards(anchors,characters,true);
assert.equal(uploads,16,'Exactly one paint/upload per initial card');
assert(TEXTURE_WIDTH===480 && TEXTURE_HEIGHT===804,'3x card textures save GPU memory while remaining sharp');
const camera=new T.PerspectiveCamera(42,1600/900,.1,140);
camera.position.set(0,12,27);camera.lookAt(0,0,0);camera.updateMatrixWorld();
const env={terrainWidth:32,terrainDepth:20,seed:7301,variation:.2,hills:'small'};
layer.update(camera,1600,900,env,()=>0,100,.95);
const before=layer.getPerformanceStats();
const start=performance.now();
for(let f=0;f<180;f++)layer.animate(100+f*16.667);
const elapsed=performance.now()-start;
const after=layer.getPerformanceStats();
assert.equal(uploads,16,'No canvas repaints or GPU texture uploads during status animation');
assert.equal(after.texturePaints,before.texturePaints,'Canvas uploads frozen during animated FX');
assert.equal(after.layoutUpdates,before.layoutUpdates,'Card-only animation does not recalculate camera projection');
assert(after.foilUpdates>before.foilUpdates,'Burning/frost finish is still animated through foil layer');
characters[0].hp=7;
layer.setCards(anchors,characters,true);
assert.equal(uploads,17,'Changing a stat repaints only the changed card');
assert.equal(layer.entries.get('unit-0').data.hp,7);
let portraitDecodes=0;
globalThis.Image=class {constructor(){portraitDecodes++;this.complete=false;this.naturalWidth=120;this.naturalHeight=190;}set src(value){this._src=value;}get src(){return this._src;}};
characters[0].portrait='data:image/png;base64,aGVsbG8=';
layer.setCards(anchors,characters,true);
const existingPortrait=layer.entries.get('unit-0').image;
assert.equal(portraitDecodes,1,'One portrait image decoder allocated for first portrait change');
characters[0].hp=6;layer.setCards(anchors,characters,true);
assert.equal(portraitDecodes,1,'Subsequent HP changes must not decode same portrait again');
assert.equal(layer.entries.get('unit-0').image,existingPortrait,'Decoded portrait is retained');
layer.dispose();
assert.equal(layer.count,0);
console.log(`PASS: 16 affected cards × 180 simulated frames, 0 animation canvas/GPU texture uploads, targeted HP updates and cached portraits; ${elapsed.toFixed(1)}ms CPU mock time; ${canvasCreations} canvases.`);
