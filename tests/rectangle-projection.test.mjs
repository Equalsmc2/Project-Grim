import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FIELD_WIDTH,FIELD_DEPTH,calculateCameraPose} from '../assets/battlefield-118/camera-frame.js';
const source=readFileSync(new URL('../assets/battlefield-118/world.js',import.meta.url),'utf8');
assert.equal(FIELD_WIDTH,30);
assert.equal(FIELD_DEPTH,24);
assert(FIELD_WIDTH>FIELD_DEPTH,'Terrain is a rectangle');
assert(source.includes('FIELD_W=FIELD_WIDTH, FIELD_D=FIELD_DEPTH'),'3D geometry uses shared dimensions');
assert(source.includes('root.scale.set(1,1,1)'),'World dimensions are never distorted by nonuniform scaling');
assert(source.includes('new T.PlaneGeometry(FIELD_W,FIELD_D'),'Actual floor uses field dimensions');
for(const [width,height] of [[1920,960],[1536,870],[1366,700],[1024,690]]){
 const neutral=calculateCameraPose({width,height});
 const turned=calculateCameraPose({width,height,yaw:20*Math.PI/180});
 assert(Math.abs(neutral.distance-turned.distance)<1e-8,'Orbit must not zoom out');
}
console.log('PASS: 30×24 physical battlefield, consistent terrain sizes, no stretching and no orbit pullback.');
