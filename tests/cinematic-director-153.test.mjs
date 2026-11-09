import assert from 'node:assert/strict';
import {cinematicTargets} from '../assets/grim-156/cinematic-director.js';
const tolerance=1e-10;
for(const x of [-100,-30,-6,0,2,6,30,100,Infinity,NaN]){
 for(const phase of [0,.3,1,6.2,8.7,23.8]){
  const t=cinematicTargets(phase,x);
  assert(Number.isFinite(t.desiredYaw)&&Number.isFinite(t.desiredPitch)&&Number.isFinite(t.desiredGlide));
  assert(Math.abs(t.desiredYaw)<=7*Math.PI/180+tolerance,'Cinematic orbit must remain restrained');
  assert(Math.abs(t.desiredGlide)<=.89+tolerance,'Horizontal movement must remain limited');
 }
}
const neutral=cinematicTargets(0,0);
assert.equal(neutral.desiredYaw,0);
assert.equal(neutral.desiredGlide,0);
assert.deepEqual(cinematicTargets(.7,5),cinematicTargets(.7,5),'Cinematic positioning remains deterministic');
console.log('PASS: isolated cinematic director, deterministic turns, restrained orbit and lateral movement.');
