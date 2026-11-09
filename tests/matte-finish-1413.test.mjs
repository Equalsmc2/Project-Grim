import assert from 'node:assert/strict';
import * as T from '../assets/grim-156/vendor/three.module.js';
import {createNativeCardLayer,cardVisualData} from '../assets/grim-156/native-cards.js';

const mockContext={
 clearRect(){},setTransform(){},save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},fill(){},stroke(){},clip(){},fillRect(){},fillText(){},drawImage(){},
 createLinearGradient(){return {addColorStop(){}};},measureText(str){return {width:String(str).length*7}}
};
globalThis.document={createElement(type){assert.equal(type,'canvas');return {width:0,height:0,getContext(){return mockContext;}};}};
globalThis.window={matchMedia(){return {matches:false}}};
const scene=new T.Scene();let paints=0;
const layer=createNativeCardLayer(scene,{onChange(){paints++;}});
const chars=[
 {id:'matte',name:'Matte',hp:42,maxHp:42,conditions:[]},
 {id:'active',name:'Active',hp:42,maxHp:42,conditions:[]},
 {id:'flame',name:'Flame',hp:28,maxHp:42,conditions:['Burning 2']},
 {id:'ice',name:'Ice',hp:29,maxHp:42,conditions:['Frozen']}
];
const anchors=chars.map((c,i)=>({id:c.id,x:(i-1.5)*2,z:0,active:i===1,layout:{scale:.72,side:'player',rank:i+1,active:i===1}}));
layer.setCards(anchors,chars,true);
assert.equal(layer.count,4);
assert.equal(paints,4);
function entry(id){return layer.entries.get(id);}
assert.equal(entry('matte').foilMesh.material.opacity,0,'Matte card has no transparent foil veil');
assert.equal(entry('matte').foilMesh.visible,false,'Matte card skips useless transparent draw');
assert(entry('active').foilMesh.material.opacity>0 && entry('active').foilMesh.material.opacity<.11,'Active only catches restrained specular light');
assert(entry('flame').foilMesh.material.opacity>.12 && entry('flame').foilMesh.material.opacity<.24,'Burning stays distinct but not washed out');
assert(entry('ice').foilMesh.material.opacity>.10 && entry('ice').foilMesh.material.opacity<.19,'Frost stays distinct but not washed out');
assert(cardVisualData(chars[2],anchors[2].layout,true).burning);
assert(cardVisualData(chars[3],anchors[3].layout,true).frozen);
for(let f=0;f<150;f++)layer.animate(f*16.67);
assert.equal(paints,4,'Animated foil must not redraw card textures');
assert(entry('flame').foilMesh.visible && entry('ice').foilMesh.visible);
chars[0].hp=12;
layer.setCards(anchors,chars,true);
assert.equal(paints,5,'Changed HP repaints affected card only');
layer.dispose();
assert.equal(layer.count,0);
console.log('PASS: matte inactive finish, restrained active foil, distinct Burning/Frost, no animated uploads, HP updates, resource cleanup.');
