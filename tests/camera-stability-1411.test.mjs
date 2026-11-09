import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import * as T from '../assets/grim-156/vendor/three.module.js';
import {calculateCameraPose,applyCameraPose,MIN_CAMERA_ZOOM} from '../assets/grim-156/camera-frame.js';
import {clampZoomToCards} from '../assets/grim-156/camera-guard.js';

const temp=mkdtempSync(path.join(os.tmpdir(),'grim-camera-stability-'));
const active=path.resolve('assets/grim-156');
const fakeRenderer=`export * from './vendor/three.module.js';export class WebGLRenderer{
 constructor(){this.domElement={setAttribute(){},addEventListener(){},remove(){}};this.shadowMap={};this.info={render:{calls:1,triangles:10},memory:{geometries:5}};globalThis.fakeGrimRenderer=this;}
 setPixelRatio(x){this.dpr=x;}getPixelRatio(){return this.dpr||1;}setClearColor(){}setSize(){}
 render(scene,camera){this.scene=scene;this.camera=camera;this.renderCount=(this.renderCount||0)+1;}dispose(){}
}`;
let nextId=0;const pending=new Map();
const ctx={clearRect(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},stroke(){},fill(){},save(){},restore(){},clip(){},setTransform(){},fillText(){},measureText(t){return {width:String(t).length*7}},createRadialGradient(){return {addColorStop(){}}},createLinearGradient(){return {addColorStop(){}}}};
const classList={add(){},remove(){},toggle(){}};
const stageApp={classList};
globalThis.document={hidden:false,createElement(t){if(t==='canvas')return {width:64,height:64,getContext(){return ctx}};return {}},getElementById(){return stageApp},querySelector(){return null},addEventListener(){},removeEventListener(){}};
globalThis.window={matchMedia(){return {matches:true}}};
globalThis.requestAnimationFrame=cb=>{const id=++nextId;pending.set(id,cb);return id;};
globalThis.cancelAnimationFrame=id=>pending.delete(id);
globalThis.devicePixelRatio=1;
globalThis.CSS={escape:x=>x,supports:()=>false};
const flush=now=>{const work=[...pending.values()];pending.clear();for(const fn of work)fn(now);};

try{
 cpSync(active,temp,{recursive:true});
 writeFileSync(path.join(temp,'fake-three.js'),fakeRenderer);
 const src=readFileSync(path.join(temp,'world.js'),'utf8').replace("from './vendor/three.module.js'","from './fake-three.js'");
 writeFileSync(path.join(temp,'world-smoke.mjs'),src);
 const {createWorld}=await import(pathToFileURL(path.join(temp,'world-smoke.mjs')).href);
 const {normalizeEnvironment,ENV_DEFAULT}=await import(pathToFileURL(path.join(temp,'environment-state.js')).href);
 const width=1920,height=930;
 const env=normalizeEnvironment({...ENV_DEFAULT,ground:'grass',hills:'small',density:0});
 const world=createWorld({appendChild(){},classList},{clientWidth:width,clientHeight:height});
 try{
  world.update(env);flush(100);
  const actors=Array.from({length:12},(_,i)=>({id:'char'+i,name:'Actor '+i,faction:i<5?'enemy':'player',initiative:20-i,hp:25,maxHp:30,level:2,ac:18,conditions:[]}));
  const anchors=new Map(actors.map((a,i)=>[a.id,{worldX:(i%6-2.5)*5.3,worldZ:i<6?-5.2:5.2,active:i===0,scale:.72,side:a.faction,rank:i+1}]));
  let baseline;
  for(let j=0;j<20;j++){
   world.setCards(anchors,actors,true);flush(250+j*30);
   const camera=globalThis.fakeGrimRenderer.camera;
   const dist=camera.position.length();
   if(baseline===undefined)baseline=dist;
   assert(Math.abs(dist-baseline)<.002,`camera drifted on repeated update: first=${baseline}, now=${dist}`);
   assert(dist<100,`camera retreated too far: ${dist}`);
  }
  assert(MIN_CAMERA_ZOOM>=.7,'old six-percent zoom is prohibited');
  const requested=clampZoomToCards({requestedZoom:1,anchors:[...anchors].map(([id,p])=>({id,x:p.worldX,z:p.worldZ,layout:p,active:p.active})),width,height,mode:'ground',env,landscapeHeight:()=>0});
  assert(requested>=.7,'crowded roster must not trigger extreme zoom-out');
  console.log(`PASS: stable camera through 20 repeated live card updates, finite distance ${baseline.toFixed(1)}, and safe zoom floor.`);
 }finally{world.dispose();}
}finally{rmSync(temp,{recursive:true,force:true});}
