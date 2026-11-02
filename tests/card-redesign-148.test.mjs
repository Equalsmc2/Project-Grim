import assert from 'node:assert/strict';
import * as T from '../assets/grim-1410/vendor/three.module.js';
import {CARD_WIDTH_PX,CARD_HEIGHT_PX,TEXTURE_WIDTH,TEXTURE_HEIGHT,roundedCardFaceGeometry,roundedCardShape,cardVisualData,paintCard,createNativeCardLayer} from '../assets/grim-1410/native-cards.js';

assert(CARD_HEIGHT_PX/CARD_WIDTH_PX >= 1.60,'Cards should be a tall 1:1.6+ silhouette');
assert.equal(TEXTURE_WIDTH/CARD_WIDTH_PX,TEXTURE_HEIGHT/CARD_HEIGHT_PX,'Texture must have uniform pixel density');
const geometry=roundedCardFaceGeometry();
const uv=geometry.getAttribute('uv');
for(let i=0;i<uv.count;i++){
 assert(uv.getX(i)>=-.0001&&uv.getX(i)<=1.0001,'Face UV X inside texture');
 assert(uv.getY(i)>=-.0001&&uv.getY(i)<=1.0001,'Face UV Y inside texture');
}
assert(geometry.getAttribute('position').count>12,'Rounded edge has several curve vertices');
geometry.dispose();
assert(roundedCardShape(.065) instanceof T.Shape,'Physical bevel uses a rounded outline');
let strokes=0;
const context={
 clearRect(){},setTransform(){},save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},fill(){},stroke(){strokes++},clip(){},fillRect(){},fillText(){},drawImage(){},
 createLinearGradient(){return {addColorStop(){}}},measureText(str){return {width:String(str).length*6.5}}
};
globalThis.document={createElement(type){assert.equal(type,'canvas');return {width:0,height:0,getContext(){return context}}}};
const data=cardVisualData({id:'test',name:'The Last Champion',ancestry:'Human',className:'Fighter',level:5,initiative:22,hp:7,maxHp:49,ac:23,conditions:['Burning','Frozen']},{side:'player',active:true,rank:1,scale:.72},true);
paintCard(context,data,null,500);
assert(strokes>0,'Draws glossy frame and card status effects');
const scene=new T.Scene(), cards=createNativeCardLayer(scene);
cards.setCards([{id:'test',x:0,z:3,active:true,layout:{side:'player',active:true,rank:1,scale:.72}}],[{id:'test',name:'Test',hp:49,maxHp:49,ac:20}],true);
const entry=cards.entries.get('test');
assert.equal(entry.faceMesh.geometry,entry.foilMesh.geometry,'Foil and face share an identical curved silhouette');
assert.equal(entry.shellMesh.geometry.type,'ExtrudeGeometry','Physical 3D card shell should be softly beveled');
assert(entry.mesh.material.depthTest&&entry.mesh.material.depthWrite,'Correct world depth remains enabled');
cards.dispose();
console.log('PASS: 1.4.8 tall silhouette, rounded true geometry, UV alignment, physical bevel, and preserved card FX');
