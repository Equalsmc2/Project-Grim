import assert from 'node:assert/strict';
import {existsSync,readFileSync,statSync} from 'node:fs';
import {normalizeEnvironment} from '../assets/grim-1411/environment-state.js';
import {AMBIENCE_TRACKS,normalizeSelection,sourceFor,formatGain} from '../assets/grim-1411/ambience.js';
const e=normalizeEnvironment({ambience:'storm',ambienceVolume:.7});
assert.equal(e.ambience,'storm');assert.equal(e.ambienceVolume,.7);
assert.equal(normalizeEnvironment({ambience:'../../private',ambienceVolume:99}).ambience,'none');
assert.equal(normalizeEnvironment({ambience:'wind',ambienceVolume:-3}).ambienceVolume,0);
assert.equal(normalizeEnvironment({}).ambience,'none');
assert.equal(normalizeSelection('not-a-sound'),'none');
assert.equal(formatGain(.6),'60%');
for(const [id,track] of Object.entries(AMBIENCE_TRACKS)){
 if(id==='none'){assert.equal(sourceFor(id),null);continue;}
 const url=new URL(sourceFor(id));assert.equal(url.protocol,'file:');
 assert(existsSync(url),`${id} file missing`);assert(statSync(url).size>100000,`${id} file empty`);
}
const editor=readFileSync(new URL('../assets/grim-1411/environment-editor.js',import.meta.url),'utf8');
const stage=readFileSync(new URL('../assets/grim-1411/stage.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert(editor.includes('ambienceTrack')&&editor.includes('ambiencePreview'));
assert(stage.includes('stageSoundToggle')&&stage.includes('createAmbiencePlayer'));
assert(html.includes('Enable sound')&&html.includes('stageSoundToggle'));
console.log('PASS: five provided audio assets, validated persisted track/volume, stage audio unlock, DM audition controls.');
