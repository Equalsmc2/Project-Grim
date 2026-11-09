import assert from 'node:assert/strict';
import {createAmbiencePlayer} from '../assets/grim-156/ambience.js';
let clock=0, nextRAF=0;
const frames=new Map();
globalThis.performance={now:()=>clock};
globalThis.requestAnimationFrame=cb=>{frames.set(++nextRAF,cb);return nextRAF;};
globalThis.cancelAnimationFrame=id=>frames.delete(id);
class FakeAudio {
 static all=[];
 constructor(){this.volume=0;this.paused=true;this.loop=false;this.preload='';this.src='';this.events={};FakeAudio.all.push(this);}
 addEventListener(event,cb){this.events[event]=cb;}
 play(){this.paused=false;return Promise.resolve();}
 pause(){this.paused=true;}
 removeAttribute(key){if(key==='src')this.src='';}
 load(){}
}
globalThis.Audio=FakeAudio;
async function advance(ms=1200){
 for(let i=0;i<Math.ceil(ms/50);i++){
  clock+=50;
  const calls=[...frames.values()];frames.clear();for(const cb of calls)cb(clock);
  await Promise.resolve();
 }
}
const events=[];
const p=createAmbiencePlayer({onStatus:(type,track)=>events.push([type,track])});
p.sync('wind',.5);
assert.equal(FakeAudio.all.length,0,'Audio must not load before user clicks');
p.enable();
assert.equal(FakeAudio.all.length,1);
assert(FakeAudio.all[0].src.endsWith('/wind.mp3'));
assert(FakeAudio.all[0].loop);
await advance();
assert.equal(FakeAudio.all[0].volume,.5);
p.sync('rain',.2);
assert.equal(FakeAudio.all.length,2);
assert(FakeAudio.all[1].src.endsWith('/rain.mp3'));
await advance();
assert.equal(FakeAudio.all[1].volume,.2);
assert(FakeAudio.all[0].paused,'Superseded track is paused/released');
p.sync('none',.2);await advance();
assert(FakeAudio.all[1].paused,'Off releases active sound');
p.sync('storm',1);await advance();
assert.equal(FakeAudio.all.length,3);
p.disable();
assert(FakeAudio.all[2].paused,'Mute locally stops audio');
p.dispose();
assert(events.some(([type])=>type==='playing'),'Playing state is reported');
console.log('PASS: gesture gating, track selection, volume, crossfade, Off, mute, and lifecycle cleanup.');
