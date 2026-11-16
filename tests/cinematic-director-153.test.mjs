import assert from 'node:assert/strict';
import {cinematicTargets,springCinematicValue} from '../assets/grim-158/cinematic-director.js';
const tolerance=1e-10;
for(const style of ['follow','orbit','sweep'])for(const strength of [.4,1.5,2.4]){
 for(const x of [-100,-30,-6,0,2,6,30,100,Infinity,NaN]){
  for(const phase of [0,.3,1,6.2,8.7,23.8]){
   const t=cinematicTargets(phase,x,{style,strength});
   assert(Number.isFinite(t.desiredYaw)&&Number.isFinite(t.desiredPitch)&&Number.isFinite(t.desiredGlide));
   assert(Math.abs(t.desiredYaw)<=12*Math.PI/180+tolerance,'Camera yaw must respect its framing limit');
   assert(Math.abs(t.desiredGlide)<=2.4+tolerance,'Horizontal movement must respect its framing limit');
   assert(Math.abs(t.desiredPitch)<=2+tolerance,'Vertical camera movement must remain gentle');
  }
 }
}
const neutral=cinematicTargets(0,0);
assert.equal(neutral.desiredYaw,0);
assert.equal(neutral.desiredGlide,0);
assert(cinematicTargets(Math.PI/2,0).desiredYaw>4*Math.PI/180,'Default movement should be visibly stronger than the old orbit');
assert(cinematicTargets(Math.PI/2,0,{strength:2.4}).desiredYaw>cinematicTargets(Math.PI/2,0,{strength:.4}).desiredYaw,'Movement strength must work');
assert(cinematicTargets(Math.PI/2,0,{style:'sweep'}).desiredYaw>cinematicTargets(Math.PI/2,0,{style:'orbit'}).desiredYaw,'Shot styles must have distinct movement');
assert.notDeepEqual(cinematicTargets(.7,6),cinematicTargets(.7,-6),'Follow mode should favor active turn position');
assert.deepEqual(cinematicTargets(.7,5),cinematicTargets(.7,5),'Cinematic positioning remains deterministic');
// A turn switch should not teleport the camera: velocity builds and brakes.
let v=0,value=0,peakStep=0;
for(let frame=0;frame<600;frame++){
 const target=frame<120?10:frame<270?-10:4;
 const dt=frame%3===0?.033:.016;
 const next=springCinematicValue(value,target,v,dt,{response:.85,maxSpeed:5});
 peakStep=Math.max(peakStep,Math.abs(next.value-value));
 assert(Number.isFinite(next.value)&&Number.isFinite(next.velocity));
 assert(Math.abs(next.value-value)<=5*dt+tolerance,'Director must respect physical motion speed');
 value=next.value;v=next.velocity;
}
assert(peakStep>0&&Math.abs(value-4)<.03,'Camera should smoothly settle after rapid turn changes');
assert.deepEqual(springCinematicValue(1,3,0,0),{value:1,velocity:0},'Zero delta must not move the camera');
const simulate=frameDt=>{
 let position=0,speed=0;
 for(let elapsed=0;elapsed<3-1e-8;elapsed+=frameDt){
  const step=springCinematicValue(position,7,speed,Math.min(frameDt,3-elapsed),{response:.9,maxSpeed:4});
  position=step.value;speed=step.velocity;
 }
 return position;
};
assert(Math.abs(simulate(1/60)-simulate(1/15))<.08,'Low frame rate must not make camera motion unnaturally slow');
console.log('PASS: cinematic director, continuous edges, turn-change damping, velocity limits and deterministic paths.');
