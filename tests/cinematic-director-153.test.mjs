import assert from 'node:assert/strict';
import {cinematicTargets} from '../assets/grim-158/cinematic-director.js';
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
console.log('PASS: cinematic director, visible motion, strength/style choices, framing limits and determinism.');
