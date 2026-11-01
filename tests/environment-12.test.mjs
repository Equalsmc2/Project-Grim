import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeEnvironment} from '../assets/grim-120/environment-state.js';
import {landscapeHeight} from '../assets/grim-120/world.js';
import {FIELD_WIDTH,FIELD_DEPTH,DEFAULT_CAMERA_VIEW,CAMERA_VIEWS,calculateCameraPose} from '../assets/grim-120/camera-frame.js';
assert.equal(FIELD_WIDTH,32);assert.equal(FIELD_DEPTH,20);
assert.equal(DEFAULT_CAMERA_VIEW,'ground');
assert(CAMERA_VIEWS.ground.elevation>=15&&CAMERA_VIEWS.ground.elevation<25);
for(const dimensions of [[18,12],[32,20],[48,36]]){
 const e=normalizeEnvironment({terrainWidth:dimensions[0],terrainDepth:dimensions[1]});
 assert.equal(e.terrainWidth,dimensions[0]);assert.equal(e.terrainDepth,dimensions[1]);
 const center=landscapeHeight(0,0,...dimensions,7301,.35);
 const rim=landscapeHeight(0,-dimensions[1]*1.6,...dimensions,7301,.35);
 assert(Math.abs(center)<.05,'Playable ground must stay mostly level');
 assert(rim>center+.25,'Distant landscape should rise beyond playable area');
 const pose=calculateCameraPose({width:1536,height:864,fieldWidth:e.terrainWidth,fieldDepth:e.terrainDepth});
 assert(Number.isFinite(pose.distance),'Camera handles resized fields');
}
const e=normalizeEnvironment({ground:'snow',weather:'snow',density:.6,props:'forest'});
assert.equal(e.ground,'snow');assert.equal(e.weather,'snow');
const world=readFileSync(new URL('../assets/grim-120/world.js',import.meta.url),'utf8');
const styles=readFileSync(new URL('../assets/grim-120/styles.css',import.meta.url),'utf8');
for(const word of ['makeTerrain(env,rnd,pal)','addProps(env,rnd,pal)','addWeather(env,rnd)','new T.FogExp2','createSky(pal)','groundShadow','projectCards()'])
 assert(world.includes(word),`World needs ${word}`);
assert(!world.includes('new T.BoxGeometry(fieldWidth,.35,fieldDepth)'),'No physical slab edge');
assert(styles.includes('.webgl-ready .card-position::after{display:none!important}'),'No floating card support poles');
assert(world.includes('weather.instanceMatrix.needsUpdate=true'),'Animated weather remains instanced');
console.log('PASS: 1.2 continuous landscape, 3D environment weather, default camera and ground-anchored cards.');
