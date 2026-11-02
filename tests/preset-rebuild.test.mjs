// Regression for GRIM-144: environment switches must rebuild real Three.js
// scene geometry even after switching through Blank test stage.
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,cpSync,writeFileSync,readFileSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';

const live=path.resolve('assets/grim-144');
const temp=mkdtempSync(path.join(os.tmpdir(),'grim-preset-test-'));
const fakeRenderer=`
export * from './vendor/three.module.js';
export class WebGLRenderer{
 constructor(){this.domElement={setAttribute(){},addEventListener(){},remove(){}};this.shadowMap={};this.info={render:{calls:2,triangles:10},memory:{geometries:10}};this.pixelRatio=1;globalThis.grimFakeRenderer=this;}
 setPixelRatio(x){this.pixelRatio=x;} getPixelRatio(){return this.pixelRatio;}
 setClearColor(){} setSize(){} render(scene){this.scene=scene;this.renderCount=(this.renderCount||0)+1;} dispose(){}
}
`;
let frameId=0,pendingFrames=new Map();
const ctx={clearRect(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},createRadialGradient(){return {addColorStop(){}}}};
const classList={add(){},remove(){},toggle(){}};
const stageApp={classList};
globalThis.document={hidden:false,createElement(type){if(type==='canvas')return {width:64,height:64,getContext(){return ctx}};return {}},getElementById(){return stageApp},querySelector(){return null},addEventListener(){},removeEventListener(){}};
globalThis.window={matchMedia(){return {matches:true}}};
globalThis.requestAnimationFrame=cb=>{const id=++frameId;pendingFrames.set(id,cb);return id;};
globalThis.cancelAnimationFrame=id=>pendingFrames.delete(id);
globalThis.devicePixelRatio=1;
globalThis.CSS={escape:x=>x,supports:()=>false};
const flush=now=>{const batch=[...pendingFrames.values()];pendingFrames.clear();for(const fn of batch)fn(now);};
try{
 cpSync(live,temp,{recursive:true});
 writeFileSync(path.join(temp,'fake-three-test.js'),fakeRenderer);
 const worldSource=readFileSync(path.join(temp,'world.js'),'utf8').replace("from './vendor/three.module.js'","from './fake-three-test.js'");
 writeFileSync(path.join(temp,'world-smoke.mjs'),worldSource);
 const {createWorld}=await import(pathToFileURL(path.join(temp,'world-smoke.mjs')).href);
 const {normalizeEnvironment,ENV_DEFAULT,PRESETS}=await import(pathToFileURL(path.join(temp,'environment-state.js')).href);
 const host={appendChild(){},classList},stage={clientWidth:1500,clientHeight:850};
 const world=createWorld(host,stage);
 try {
  const sequence=['Forest','Blank test stage','Snowfield','Blank test stage','Ruins','Desert','Forest'];
  let now=200;
  for(const preset of sequence){
   world.update(normalizeEnvironment({...ENV_DEFAULT,...PRESETS[preset],preset}));
   now+=200;flush(now);
   assert(globalThis.grimFakeRenderer.renderCount>0,`Renderer did not render after ${preset}`);
   const root=globalThis.grimFakeRenderer.scene.children.find(obj=>obj.isGroup && obj.children.some(child=>child.isMesh&&child.geometry?.type==='PlaneGeometry'));
   assert(root,`Terrain missing after switching to ${preset}`);
   assert(root.children.some(obj=>obj.isMesh&&obj.geometry?.type==='PlaneGeometry'),`No generated floor after ${preset}`);
  }
  console.log('PASS: repeated Forest → Blank → Snowfield → Blank → Ruins → Desert → Forest rebuilds and renders.');
 } finally {world.dispose();}
} finally {rmSync(temp,{force:true,recursive:true});}
