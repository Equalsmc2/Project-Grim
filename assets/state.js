export const SCENES = [
  { id:'chapel', name:'The Ashen Chapel', kicker:'ACT I · THE THRESHOLD', description:'The bells have stopped. Somewhere beyond the broken altar, something is still listening.', palette:'violet', ambience:'Candlelit ruins · drifting ash', sigil:'✦' },
  { id:'forest', name:'Blackwood Crossing', kicker:'ACT I · THE WILDERNESS', description:'The last lantern in the valley vanishes behind a wall of ancient pines.', palette:'teal', ambience:'Mist · cold moonlight', sigil:'✧' },
  { id:'archive', name:'The Drowned Archive', kicker:'ACT II · BELOW THE CITY', description:'Water crawls across the marble. Every book on the shelves is open to the same page.', palette:'blue', ambience:'Flooded halls · pale light', sigil:'◇' },
  { id:'court', name:'The Gilded Court', kicker:'ACT II · THE RECKONING', description:'A hundred empty chairs face the throne. An unseen audience waits for judgment.', palette:'amber', ambience:'Dust · dying daylight', sigil:'♜' },
];
export const CONDITION_OPTIONS=['Frightened','Off-guard','Prone','Stunned','Dying','Wounded','Slowed','Sickened','Clumsy','Enfeebled','Drained','Grabbed'];
export const DEMO_CHARACTERS = [
  {id:'mara',name:'Mara Voss',ancestry:'Human',className:'Thaumaturge',level:3,maxHp:46,hp:36,tempHp:0,ac:20,initiative:22,perception:8,conditions:[],accent:'gold',symbol:'✥',portrait:'',hidden:false},
  {id:'ilyra',name:'Ilyra Fen',ancestry:'Elf',className:'Witch',level:3,maxHp:32,hp:32,tempHp:0,ac:17,initiative:18,perception:7,conditions:['Frightened 1'],accent:'violet',symbol:'☽',portrait:'',hidden:false},
  {id:'borin',name:'Borin Ash',ancestry:'Dwarf',className:'Champion',level:3,maxHp:52,hp:48,tempHp:0,ac:22,initiative:16,perception:6,conditions:[],accent:'teal',symbol:'⚔',portrait:'',hidden:false},
  {id:'sable',name:'Sable Quill',ancestry:'Fetchling',className:'Rogue',level:3,maxHp:36,hp:29,tempHp:0,ac:19,initiative:25,perception:9,conditions:[],accent:'rose',symbol:'◆',portrait:'',hidden:false}
];
const KEY='grim:campaign:v1';
const OPTIONS_KEY='grim:options:v1';
const clone=x=>JSON.parse(JSON.stringify(x));
export function defaultState(){return {version:1,updatedAt:Date.now(),campaign:'PROJECT GRIM',subtitle:'A PATHFINDER CAMPAIGN',mode:'scene',sceneId:'chapel',sceneOverrides:{},combat:{round:1,activeId:'sable'},characters:clone(DEMO_CHARACTERS),presentation:{cardScale:1,showHud:true,showSceneCards:false},log:[{id:'intro',time:Date.now(),text:'Prototype ready. Open the DM page to control the stage.'}]};}
function normalize(candidate){if(!candidate||typeof candidate!=='object')return defaultState();let d=defaultState();return {...d,...candidate,mode:candidate.mode==='combat'?'combat':'scene',sceneOverrides:{...d.sceneOverrides,...(candidate.sceneOverrides||{})},combat:{...d.combat,...(candidate.combat||{})},presentation:{...d.presentation,...(candidate.presentation||{})},characters:Array.isArray(candidate.characters)?candidate.characters:d.characters,log:Array.isArray(candidate.log)?candidate.log.slice(-35):d.log};}
let state;
try{state=normalize(JSON.parse(localStorage.getItem(KEY)));}catch{state=defaultState();}
const subscribers=new Set();
const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('project-grim-stage'):null;
const emit=(source)=>{for(let cb of subscribers){try{cb(state,source);}catch(e){console.warn(e);}}};
function incoming(next,source){if(!next||typeof next.updatedAt!=='number'||next.updatedAt<=state.updatedAt)return;state=normalize(next);try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}emit(source);}
if(channel)channel.onmessage=e=>{if(e.data?.type==='update')incoming(e.data.state,'tab');};
window.addEventListener('storage',e=>{if(e.key===KEY&&e.newValue){try{incoming(JSON.parse(e.newValue),'tab');}catch{}}});
export function getState(){return state;}
export function subscribe(cb){subscribers.add(cb);cb(state,'initial');return()=>subscribers.delete(cb);}
export function updateState(change,detail){let next=clone(state);change(next);next.updatedAt=Math.max(Date.now(),state.updatedAt+1);if(detail){next.log=[...(next.log||[]),{id:String(next.updatedAt),time:next.updatedAt,text:detail}].slice(-35);}state=normalize(next);try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){console.warn('Storage full',e);}channel?.postMessage({type:'update',state});emit('local');}
export function applyCloudState(next,{initial=false}={}){
  // The first snapshot is authoritative even if a new browser's sample state
  // has a later Date.now() than the cloud session (a common first-join bug).
  if(initial){
    if(!next||typeof next.updatedAt!=='number')return;
    state=normalize(next);
    try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}
    channel?.postMessage({type:'update',state});
    emit('cloud');
  }else incoming(next,'cloud');
}
export function getScene(s=state){const base=SCENES.find(x=>x.id===s.sceneId)||SCENES[0];return {...base,...(s.sceneOverrides?.[base.id]||{})};}
export function orderedCharacters(s=state){return [...s.characters].sort((a,b)=>(Number(b.initiative)||0)-(Number(a.initiative)||0));}
export function adjustHp(c,amount){amount=Number(amount)||0;if(amount<0){let hit=-amount,shield=Math.min(Math.max(0,c.tempHp||0),hit);c.tempHp-=shield;hit-=shield;c.hp=Math.max(0,Number(c.hp)-hit);}else{c.hp=Math.min(Math.max(1,Number(c.maxHp)),Number(c.hp)+amount);}}
export function randD20(){let bytes=new Uint32Array(1);if(globalThis.crypto?.getRandomValues){globalThis.crypto.getRandomValues(bytes);return bytes[0]%20+1;}return Math.floor(Math.random()*20)+1;}
export function getOptions(){let fallback={online:false,room:'grim-demo'};try{return {...fallback,...JSON.parse(localStorage.getItem(OPTIONS_KEY))}}catch{return fallback;}}
export function setOptions(update){let opts={...getOptions(),...update};localStorage.setItem(OPTIONS_KEY,JSON.stringify(opts));return opts;}
export function escapeHtml(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function prettyTime(time){return new Date(time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});}
export function resetDemo(){const fresh=defaultState();updateState(s=>Object.assign(s,fresh),'Demo reset to its initial state');}
