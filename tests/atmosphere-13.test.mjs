import assert from 'node:assert/strict';
import {normalizeEnvironment} from '../assets/grim-144/environment-state.js';
import {ATMOSPHERE_PRESETS,effectiveTime,lightAt,skyAt,isPrecipitation,smoothValue} from '../assets/grim-144/atmosphere.js';
import {readFileSync} from 'node:fs';
for(const preset of Object.keys(ATMOSPHERE_PRESETS)){
 const e=normalizeEnvironment({...ATMOSPHERE_PRESETS[preset],atmospherePreset:preset});
 assert.equal(e.atmospherePreset,preset);
 assert(e.timeOfDay>=0&&e.timeOfDay<=24);
 assert(e.cloudCover>=0&&e.cloudCover<=1);
}
assert.equal(effectiveTime({timeOfDay:12,cycleEnabled:false}),12);
assert.equal(effectiveTime({timeOfDay:12,cycleEnabled:true,cycleSpeed:24,timeEpoch:1000},1000+3600000),12);
assert.equal(effectiveTime({timeOfDay:12,cycleEnabled:true,cycleSpeed:24,timeEpoch:1000},1000+1800000),0);
assert(lightAt(12).direct>lightAt(0).direct,'Midday direct lighting is stronger than midnight');
assert(lightAt(0).moon>lightAt(12).moon,'Moonlighting rises at night');
assert(lightAt(12,1,'thunderstorm',1).direct<lightAt(12,0,'none',0).direct,'Storms dim direct sunlight');
assert(skyAt(12).top[2]>skyAt(0).top[2],'Noon blue sky is brighter than night');
assert(isPrecipitation({weather:'blizzard',intensity:.8}));
assert(isPrecipitation({weather:'sandstorm',intensity:.8}));
assert(isPrecipitation({weather:'thunderstorm',intensity:.8}));
assert(!isPrecipitation({weather:'none',intensity:1}));
assert(smoothValue(0,1,1)>0&&smoothValue(0,1,1)<1);
const legacy=normalizeEnvironment({ground:'stone',weather:'rain',timeOfDay:18,cloudCover:3,cycleEnabled:true});
assert.equal(legacy.cloudCover,1);assert.equal(legacy.cycleEnabled,true);assert.equal(legacy.ground,'stone');
const world=readFileSync(new URL('../assets/grim-144/world.js',import.meta.url),'utf8');
for(const feature of ['sunBody','moonBody','starMesh','cloudMesh','scene.fog.density','weatherSystems','updateLighting(dt,t)','isPrecipitation(env)','terrainSignature'])assert(world.includes(feature),feature);
const editor=readFileSync(new URL('../assets/grim-144/environment-editor.js',import.meta.url),'utf8');
assert(editor.includes('Atmosphere')&&editor.includes('atmo-preset')&&editor.includes('cycleEnabled'));
console.log('PASS: 1.3 sky, daylight/moonlight, storm effects, presets, smooth interpolation, compatibility and editor wiring.');
