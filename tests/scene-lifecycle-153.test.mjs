// Regression: failed environment generation must not destroy the displayed
// stage or the GPU card layer. Repeated switches must release old resources.
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,cpSync,writeFileSync,readFileSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {disposeSceneGraph,commitSceneGroup} from '../assets/grim-158/scene-resources.js';

let geoCalls=0,matCalls=0,texCalls=0,instanceCalls=0;
const sharedGeo={dispose(){geoCalls++;}};
const sharedTex={dispose(){texCalls++;}};
const retained={dispose(){throw new Error('Retained texture must not be disposed');}};
const sharedMat={map:sharedTex,normalMap:sharedTex,alphaMap:retained,dispose(){matCalls++;}};
const object={geometry:sharedGeo,material:sharedMat,isInstancedMesh:true,dispose(){instanceCalls++;}};
const graph={traverse(fn){fn(object);fn(object);}};
const stats=disposeSceneGraph(graph,{retainTextures:[retained]});
assert.deepEqual(stats,{geometries:1,materials:1,textures:1,instances:2});
assert.equal(geoCalls,1);assert.equal(matCalls,1);assert.equal(texCalls,1);
const operations=[];
const scene={add(v){operations.push(['add',v]);},remove(v){operations.push(['remove',v]);}};
const previous={traverse(){}};const next={traverse(){}};
commitSceneGroup(scene,previous,next);
assert.deepEqual(operations,[['add',next],['remove',previous]],'The replacement must be installed before the previous scene is removed');

const source=path.resolve('assets/grim-158');
const tmp=mkdtempSync(path.join(os.tmpdir(),'grim153-lifecycle-'));
const fakeRenderer=`
export * from './vendor/three.module.js';
export class WebGLRenderer{
 constructor(){this.domElement={setAttribute(){},addEventListener(){},remove(){}};this.shadowMap={};this.info={render:{calls:2,triangles:10},memory:{geometries:10}};this.pixelRatio=1;globalThis.testRenderer=this;}
 setPixelRatio(n){this.pixelRatio=n;}getPixelRatio(){return this.pixelRatio;}
 setClearColor(){}setSize(){}render(scene){this.scene=scene;this.renders=(this.renders||0)+1;}dispose(){}
}
`;
let frameId=0,scheduled=new Map(),injectFailure=false;
const context={clearRect(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},stroke(){},fill(){},save(){},restore(){},clip(){},setTransform(){},fillText(){},measureText(t){return {width:String(t).length*7}},createRadialGradient(){return {addColorStop(){}}},createLinearGradient(){return {addColorStop(){}}}};
const classList={add(){},remove(){},toggle(){}};
const stageApp={classList};
globalThis.document={hidden:false,createElement(type){
  if(injectFailure){injectFailure=false;throw new Error('Injected canvas initialization failure');}
  if(type==='canvas')return {width:128,height:128,getContext(){return context}};
  return {};
},getElementById(){return stageApp},querySelector(){return null},addEventListener(){},removeEventListener(){}};
globalThis.window={matchMedia(){return {matches:true}},grim3DStats:null};
globalThis.requestAnimationFrame=cb=>{const id=++frameId;scheduled.set(id,cb);return id;};
globalThis.cancelAnimationFrame=id=>scheduled.delete(id);
globalThis.devicePixelRatio=1;
globalThis.CSS={escape:x=>x,supports:()=>false};
const flush=time=>{const events=[...scheduled.values()];scheduled.clear();for(const f of events)f(time);};
try{
 cpSync(source,tmp,{recursive:true});
 writeFileSync(path.join(tmp,'fake-three-test.js'),fakeRenderer);
 const js=readFileSync(path.join(tmp,'world.js'),'utf8').replace("from './vendor/three.module.js'","from './fake-three-test.js'");
 writeFileSync(path.join(tmp,'world-test.mjs'),js);
 const {createWorld}=await import(pathToFileURL(path.join(tmp,'world-test.mjs')).href);
 const {normalizeEnvironment,ENV_DEFAULT,PRESETS}=await import(pathToFileURL(path.join(tmp,'environment-state.js')).href);
 const host={appendChild(){},classList},stage={clientWidth:1440,clientHeight:800};
 const world=createWorld(host,stage);
 try{
  assert.equal(world.update(normalizeEnvironment({...ENV_DEFAULT,...PRESETS.Forest,preset:'Forest'})),true);
  flush(100);
  const rendererScene=globalThis.testRenderer.scene;
  const oldRoot=rendererScene.children.find(o=>o.isGroup && o.children.some(m=>m.isMesh && m.geometry?.type==='PlaneGeometry' && m.geometry.parameters?.width>100));
  assert(oldRoot,'Forest terrain must render before an injected failure');
  const actor={id:'hero',name:'Hero',hp:30,maxHp:40,ac:15,initiative:20,level:2};
  world.setCards(new Map([['hero',{worldX:0,worldZ:3,side:'player',rank:1,scale:.72,active:true}]]),[actor],true);
  const native=rendererScene.children.find(o=>o.name==='GRIM_NATIVE_CARDS');
  const card=native.children[0];
  const oldBackground=rendererScene.background,oldFog=rendererScene.fog;
  injectFailure=true;
  const savedError=console.error;let reported=0;
  console.error=()=>{reported++;};
  let failed;
  try{failed=world.update(normalizeEnvironment({...ENV_DEFAULT,...PRESETS.Ruins,preset:'Ruins'}));}
  finally{console.error=savedError;}
  assert.equal(failed,false,'Failed preset should report failure without crashing the stage');
  assert.equal(reported,1,'Failure should produce one diagnostic');
  assert(rendererScene.children.includes(oldRoot),'Old terrain must survive a failed scene build');
  assert.equal(rendererScene.background,oldBackground,'Sky must roll back');
  assert.equal(rendererScene.fog,oldFog,'Fog must roll back');
  assert.equal(native.children[0],card,'Card mesh must not be destroyed');
  assert.equal(world.update(normalizeEnvironment({...ENV_DEFAULT,...PRESETS.Ruins,preset:'Ruins'})),true,'Subsequent valid preset must recover');
  flush(200);
  assert(!rendererScene.children.includes(oldRoot),'Successful commit must remove old terrain');
  assert.equal(native.children[0],card,'Native card persists through recovery');
  for(let i=0;i<10;i++){
    assert(world.update(normalizeEnvironment({...ENV_DEFAULT,...PRESETS[i%2?'Snowfield':'Blank test stage'],preset:i%2?'Snowfield':'Blank test stage'})));
    flush(300+i*40);
    const worldGroups=rendererScene.children.filter(o=>o.isGroup&&o.children.some(c=>c.isMesh&&c.geometry?.type==='PlaneGeometry' && c.geometry.parameters?.width>100));
    assert.equal(worldGroups.length,1,'Repeated presets may not accumulate terrain groups');
  }
  console.log('PASS: idempotent GPU cleanup, atomic scene switching, rollback after partial failure, card persistence, and recovery over 10 rebuilds.');
 }finally{world.dispose();}
}finally{rmSync(tmp,{recursive:true,force:true});}
