// Deterministic integration simulation: formation + camera + real native card
// objects + animated statuses + HP/turn changes. Does not fake a browser FPS.
import assert from 'node:assert/strict';
import * as T from '../assets/grim-156/vendor/three.module.js';
import {calculateCameraPose,applyCameraPose} from '../assets/grim-156/camera-frame.js';
import {fitAllCardsInView} from '../assets/grim-156/card-framing.js';
import {createNativeCardLayer} from '../assets/grim-156/native-cards.js';
import {normalizeEnvironment,PRESETS,ENV_DEFAULT} from '../assets/grim-156/environment-state.js';

// formation imports state.js; give it the real browser storage API shape.
const values=new Map();
globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v))};
globalThis.window={addEventListener(){}};
globalThis.BroadcastChannel=undefined;
const {planFormation}=await import('../assets/grim-156/formation.js');
const {orderedCharacters}=await import('../assets/grim-156/state.js');
const ctx={
 clearRect(){},setTransform(){},save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},fill(){},stroke(){},clip(){},fillRect(){},fillText(){},drawImage(){},
 createLinearGradient(){return {addColorStop(){}}},createRadialGradient(){return {addColorStop(){}}},measureText(s){return {width:String(s).length*8}}
};
globalThis.document={createElement(tag){assert.equal(tag,'canvas');return {width:0,height:0,getContext(){return ctx}};}};
const scene=new T.Scene(),cardLayer=createNativeCardLayer(scene);
let checked=0,uploadsBefore=0;
let seed=1136;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
try{
 for(const size of [4,10,16]){
  const characters=Array.from({length:size},(_,i)=>({
   id:`u-${i}`,name:`Unit ${i}`,faction:i<size*.45?'enemy':'player',initiative:size-i,hp:30,maxHp:30,ac:18,level:3,
   conditions:i%3===0?['Burning']:i%3===1?['Frozen']:[]
  }));
  const campaign={mode:'combat',characters,combat:{round:1,activeId:characters[0].id},presentation:{cardScale:1},environment:normalizeEnvironment(ENV_DEFAULT)};
  for(const [width,height] of [[1600,900],[390,740]]){
   for(const mode of ['ground','tactical','overhead']){
    for(let step=0;step<7;step++){
     const preset=Object.keys(PRESETS)[(step+size)%Object.keys(PRESETS).length];
     const environment=normalizeEnvironment({...ENV_DEFAULT,...PRESETS[preset],preset});
     campaign.environment=environment;
     // Realistic battle state changes should trigger only changed card textures.
     const victim=characters[(step*3)%characters.length];
     victim.hp=Math.max(0,30-step*5);
     if(step%2===0)victim.conditions=[step%4===0?'Burning':'Frozen'];
     campaign.combat.activeId=characters[(step+1)%characters.length].id;
     const visible=[...characters],formation=planFormation(campaign,visible,true,width,height);
     const ordered=orderedCharacters(campaign);
     assert.equal(formation.placements.size,characters.length);
     assert.deepEqual([...formation.placements.values()].map(p=>p.rank).sort((a,b)=>a-b),Array.from({length:characters.length},(_,i)=>i+1));
     const anchors=ordered.map(c=>{const l=formation.placements.get(c.id);return{id:c.id,x:l.worldX,z:l.worldZ,active:l.active,layout:l};});
     cardLayer.setCards(anchors,characters,true);
     assert.equal(cardLayer.count,size);
     const camera=new T.PerspectiveCamera(40,width/height,.1,22000);
     const pose=calculateCameraPose({width,height,mode,yaw:(rand()-.5)*.25,zoom:1+rand()*.3,fieldWidth:environment.terrainWidth,fieldDepth:environment.terrainDepth});
     applyCameraPose(camera,pose);
     const fit=fitAllCardsInView(camera,anchors,width,height,environment,()=>0);
     assert(fit.fits,`Card framing failed for ${size} cards, ${mode}, ${width}x${height}, step ${step}`);
     assert(Number.isFinite(camera.position.length())&&camera.position.length()<150,'No runaway camera distance');
     cardLayer.update(camera,width,height,environment,()=>0,step*100,.9);
     cardLayer.animate(step*100+20);
     for(const entry of cardLayer.entries.values()){
       assert(Number.isFinite(entry.mesh.position.x)&&Number.isFinite(entry.mesh.position.z));
       assert(entry.mesh.scale.y>0&&entry.mesh.scale.y<100);
     }
     checked++;
    }
   }
  }
 }
 const counters=cardLayer.getPerformanceStats();
 assert(counters.texturePaints>0&&counters.foilUpdates>0);
 uploadsBefore=counters.texturePaints;
 // 120 FX frames with an unchanged roster must not repaint full cards.
 for(let f=0;f<120;f++)cardLayer.animate(1500+16.667*f);
 assert.equal(cardLayer.getPerformanceStats().texturePaints,uploadsBefore,'Animated burning/frost cannot upload card textures each frame');
 console.log(`PASS: ${checked} real formation/camera/card/status scenarios (up to 16 units), finite framing, stable GPU textures under 120 additional FX frames.`);
}finally{cardLayer.dispose();}
