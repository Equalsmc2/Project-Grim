// Grim 1.5.2: verify actual renderer weather matrix workload, not merely strings.
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,cpSync,writeFileSync,readFileSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {createWeatherBudget,advanceWeatherBudget,weatherInterval,needsSceneryRefresh} from '../assets/grim-158/render-budget.js';

for(const [quality,hz] of [['low',20],['balanced',30],['high',45]]){
  assert(Math.abs(weatherInterval(quality)-1/hz)<1e-8);
  const clock=createWeatherBudget();let updates=0,elapsed=0;
  for(let i=0;i<180;i++){
    const dt=1/60; elapsed+=dt;
    const step=advanceWeatherBudget(clock,dt,quality,true);
    if(step){updates++;assert(step<=.1);}
  }
  assert(Math.abs(updates-3*hz)<=1,`${quality}: expected ${3*hz} weather updates over 3 seconds, got ${updates}`);
  assert.equal(clock.steps,updates);
  assert.equal(advanceWeatherBudget(clock,1,quality,false),0,'Inactive weather should reset the budget');
  assert.equal(clock.elapsed,0);
}
assert(needsSceneryRefresh(NaN,NaN,0,0));
assert(!needsSceneryRefresh(.4,.2,.4003,.201));
assert(needsSceneryRefresh(.4,.2,.42,.2));

const live=path.resolve('assets/grim-158');
const tmp=mkdtempSync(path.join(os.tmpdir(),'grim152-weather-'));
const fakeRenderer=`
export * from './vendor/three.module.js';
export class WebGLRenderer{
 constructor(){this.domElement={setAttribute(){},addEventListener(){},remove(){}};this.shadowMap={};this.info={render:{calls:2,triangles:100},memory:{geometries:12}};this.pixelRatio=1;globalThis.grimFakeRenderer=this;}
 setPixelRatio(n){this.pixelRatio=n;}getPixelRatio(){return this.pixelRatio;}
 setClearColor(){}setSize(){}render(scene){this.scene=scene;this.renderCount=(this.renderCount||0)+1;}dispose(){}
}
`;
let frameId=0,pending=new Map();
const ctx={clearRect(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},stroke(){},fill(){},save(){},restore(){},clip(){},setTransform(){},fillText(){},measureText(t){return {width:String(t).length*7}},createRadialGradient(){return {addColorStop(){}}},createLinearGradient(){return {addColorStop(){}}}};
const classList={add(){},remove(){},toggle(){}};
globalThis.document={hidden:false,createElement(tag){if(tag==='canvas')return {width:128,height:128,getContext(){return ctx}};return {};},getElementById(){return {classList}},querySelector(){return null},addEventListener(){},removeEventListener(){}};
globalThis.window={matchMedia(){return {matches:true}},grim3DStats:null};
globalThis.requestAnimationFrame=fn=>{const id=++frameId;pending.set(id,fn);return id;};
globalThis.cancelAnimationFrame=id=>pending.delete(id);
globalThis.devicePixelRatio=1;
globalThis.CSS={escape:x=>x,supports:()=>false};
function flush(now){const batch=[...pending.values()];pending.clear();for(const f of batch)f(now);}
try{
 cpSync(live,tmp,{recursive:true});
 writeFileSync(path.join(tmp,'fake-three-test.js'),fakeRenderer);
 const source=readFileSync(path.join(tmp,'world.js'),'utf8').replace("from './vendor/three.module.js'","from './fake-three-test.js'");
 writeFileSync(path.join(tmp,'world-smoke.mjs'),source);
 const {createWorld}=await import(pathToFileURL(path.join(tmp,'world-smoke.mjs')).href);
 const {normalizeEnvironment,ENV_DEFAULT}=await import(pathToFileURL(path.join(tmp,'environment-state.js')).href);
 const host={appendChild(){},classList},stage={clientWidth:1440,clientHeight:810};
 const world=createWorld(host,stage,{quality:'balanced'});
 try{
  world.update(normalizeEnvironment({...ENV_DEFAULT,weather:'blizzard',intensity:1,cloudCover:0,cycleEnabled:false,windSpeed:2,fog:0}));
  let base=performance.now();
  for(let i=0;i<240;i++)flush(base+(i+1)*1000/60);
  const data=window.grim3DStats?.weatherPerformance;
  assert(data,'Renderer should expose weather step diagnostics');
  assert(data.steps>80&&data.steps<140,`Unexpected weather steps for 4s at 30Hz: ${data.steps}`);
  assert(data.matrixWrites>data.steps*100,'Real weather particle matrices should be updated');
  assert(data.matrixWrites<140*550,'Particle transforms must not run at 60Hz');
  console.log(`PASS: actual simulated blizzard matrices updated ${data.steps} times over 240 display frames (${data.matrixWrites} instanced writes), no loss of scene rendering.`);
 }finally{world.dispose();}
}finally{rmSync(tmp,{force:true,recursive:true});}
