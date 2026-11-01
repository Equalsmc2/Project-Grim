import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FIELD_WIDTH,FIELD_DEPTH,calculateCameraPose} from '../assets/grim-130/camera-frame.js';
const source=readFileSync(new URL('../assets/grim-130/world.js',import.meta.url),'utf8');
assert.equal(FIELD_WIDTH,32);
assert.equal(FIELD_DEPTH,20);
assert(FIELD_WIDTH>FIELD_DEPTH,'Terrain is a rectangle');
assert(source.includes('fieldWidth=FIELD_WIDTH,fieldDepth=FIELD_DEPTH'),'3D geometry uses shared dimensions');
assert(!source.includes('root.scale.z='),'World dimensions are never distorted by nonuniform scaling');
assert(source.includes('const tw=Math.max(fieldWidth*3.7,112)'),'The continuous terrain extends beyond the playable arena');
for(const [width,height] of [[1920,960],[1536,870],[1366,700],[1024,690]]){
 const neutral=calculateCameraPose({width,height});
 const turned=calculateCameraPose({width,height,yaw:20*Math.PI/180});
 assert(Math.abs(neutral.distance-turned.distance)<1e-8,'Orbit must not zoom out');
}
console.log('PASS: 32×20 playable region, continuous extended terrain, no stretching and no orbit pullback.');
