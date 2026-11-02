import assert from 'node:assert/strict';
import {cardVisualData, paintCard} from '../assets/grim-148/native-cards.js';

function fakeCanvas(){
  const ctx = {
    clearRect(){}, setTransform(){}, save(){}, restore(){}, beginPath(){}, moveTo(){}, lineTo(){}, quadraticCurveTo(){}, closePath(){}, fill(){}, stroke(){}, clip(){}, fillRect(){}, fillText(){},
    createLinearGradient(){ return { addColorStop(){} }; },
    measureText(s){ return { width: String(s).length * 8 }; }
  };
  return { getContext(type){ assert.equal(type,'2d'); return ctx; } };
}
const canvas = fakeCanvas();
const ctx = canvas.getContext('2d');

const burning = cardVisualData({id:'burn',name:'Pyre',hp:9,maxHp:40,conditions:['Burning 2'],initiative:14,ac:18,level:4,className:'Wizard',ancestry:'Human'}, {side:'player',rank:1,active:true}, true);
assert.equal(burning.burning, true);
assert.equal(burning.frozen, false);
assert.equal(burning.damageTier >= 3, true);
paintCard(ctx, burning, null, 500);

const frozen = cardVisualData({id:'ice',name:'Frost Ghoul',hp:0,maxHp:30,conditions:['Frozen'],initiative:10,ac:15,level:2,className:'Undead',ancestry:'Ghoul'}, {side:'enemy',rank:2,active:false}, true);
assert.equal(frozen.frozen, true);
assert.equal(frozen.dead, true);
paintCard(ctx, frozen, null, 500);
console.log('PASS: premium card FX condition parsing, heavy-damage cracking and zero-HP shatter rendering paths.');
