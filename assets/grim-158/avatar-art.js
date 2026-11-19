import {drawIllustratedAvatar} from './avatar-illustration.js';

/*
 * Project Grim's flat-paper portrait kit.
 * Every visible feature is an authored SVG ellipse, line or path. No external
 * image files, remote art, model weights, random image services or fonts.
 */
export const AVATAR_PALETTES={
  skin:[['Porcelain','#f6ddbf'],['Fair','#eac5a4'],['Warm','#dbab84'],['Olive','#bf936c'],['Brown','#986747'],['Deep','#704733'],['Umber','#523427'],['Slate','#aaa9a8']],
  hairColor:[['Black','#28292c'],['Charcoal','#48474a'],['Brown','#664736'],['Chestnut','#9a6042'],['Copper','#bb704d'],['Gold','#eac76a'],['Blond','#f3de9b'],['White','#ece8e3'],['Silver','#a4a5ae'],['Rose','#ba7d83'],['Blue','#657f9c'],['Violet','#8b7c9f']],
  eyeColor:[['Dark','#302b29'],['Brown','#765039'],['Amber','#c28a47'],['Hazel','#778456'],['Green','#4b8069'],['Blue','#5383a9'],['Gray','#848d92'],['Violet','#8d76a6']],
  outfitColor:[['Ink','#292b30'],['Ash','#696970'],['Ivory','#e9e7e1'],['Brown','#7c6254'],['Wine','#914d55'],['Forest','#587163'],['Navy','#576980'],['Ochre','#bf9b56']],
  backdrop:[['Paper','#eeeeea'],['White','#fafafa'],['Fog','#d1d0ce'],['Night','#3b3b3e'],['Sand','#e9dfd0'],['Mist','#c8d5d5']]
};
export const AVATAR_GROUPS=[
 {id:'hair',label:'Hair',parts:[
  {key:'hairBack',label:'Back hair',choices:['None','Short bob','Long straight','Long waves','Shag','Ponytail','Twin tails','Braid','Cropped','Shoulder length']},
  {key:'bangs',label:'Fringe / bangs',choices:['Exposed','Soft sweep','Straight','Curtain','Side swept','Choppy','Short spikes','Long fringe','Parted curls','Asymmetric']},
  {key:'sides',label:'Side strands',choices:['None','Short','Long','Curled','Asymmetric','Face framing','Braided','Wisps']},
  {key:'hairColor',label:'Hair color',palette:'hairColor'}]},
 {id:'eyes',label:'Eyes',parts:[
  {key:'eyes',label:'Eye shape',choices:['Almond','Round','Soft','Sharp','Sleepy','Bright','Narrow','Closed']},
  {key:'iris',label:'Iris style',choices:['Classic','Large','Small','Slit','Shimmer','Open']},
  {key:'eyeColor',label:'Eye color',palette:'eyeColor'},
  {key:'brows',label:'Eyebrows',choices:['Natural','Straight','Raised','Determined','Soft','None','Arched','Short']}]},
 {id:'face',label:'Face',parts:[
  {key:'face',label:'Face shape',choices:['Oval','Round','Soft square','Pointed']},
  {key:'skin',label:'Skin tone',palette:'skin'},
  {key:'nose',label:'Nose',choices:['Tiny','Dot','Curve','Bridge','None']},
  {key:'mouth',label:'Mouth',choices:['Neutral','Small smile','Big smile','Pout','Open','Grin','Serious','Frown']}]},
 {id:'details',label:'Details',parts:[
  {key:'extras',label:'Extras',choices:['None','Freckles','Blush','Scar','Beauty mark','Eyepatch','Glasses','Earrings']},
  {key:'backdrop',label:'Backdrop',palette:'backdrop'}]},
 {id:'clothes',label:'Clothes',parts:[
  {key:'outfit',label:'Outfit shape',choices:['Travel coat','Tunic','High collar','Armor','Cloak','Scholar','Scarf','Simple']},
  {key:'outfitColor',label:'Clothing color',palette:'outfitColor'}]}
];
// Bump when the SVG geometry changes so saved portraits are redrawn automatically.
export const AVATAR_ART_VERSION=6;
export const AVATAR_KEYS=AVATAR_GROUPS.flatMap(g=>g.parts.map(p=>p.key));
const bounds=Object.fromEntries(AVATAR_GROUPS.flatMap(g=>g.parts.map(p=>[p.key,p.palette?AVATAR_PALETTES[p.palette].length:p.choices.length])));
export const DEFAULT_AVATAR={hairBack:2,bangs:1,sides:1,hairColor:2,eyes:0,iris:0,eyeColor:0,brows:0,face:0,skin:1,nose:0,mouth:1,extras:0,backdrop:0,outfit:0,outfitColor:0};
export function normalizeAvatar(value){
 let o={...DEFAULT_AVATAR};
 if(typeof value==='string'){
  if(!/^v1-[0-9a-z]{16}$/.test(value))return o;
  AVATAR_KEYS.forEach((key,i)=>{o[key]=parseInt(value.charAt(i+3),36);});
 }else if(value&&typeof value==='object'){
  AVATAR_KEYS.forEach(key=>{if(key in value)o[key]=value[key];});
 }
 for(const key of AVATAR_KEYS){const n=Number(o[key]);o[key]=Number.isInteger(n)&&n>=0&&n<bounds[key]?n:DEFAULT_AVATAR[key];}
 return o;
}
export function encodeAvatar(value){
 const o=normalizeAvatar(value);
 return 'v1-'+AVATAR_KEYS.map(k=>o[k].toString(36)).join('');
}
export function isAvatarCode(value){return typeof value==='string'&&/^v1-[0-9a-z]{16}$/.test(value);}
export function randomAvatar(){
 const values={},bits=new Uint32Array(AVATAR_KEYS.length);
 if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(bits);
 else AVATAR_KEYS.forEach((key,i)=>{bits[i]=Math.floor(Math.random()*4294967295);});
 AVATAR_KEYS.forEach((key,i)=>{values[key]=bits[i]%bounds[key];});
 return normalizeAvatar(values);
}
export function renderAvatarSvg(value){
 const avatar=normalizeAvatar(value);
 return drawIllustratedAvatar(avatar,AVATAR_PALETTES,encodeAvatar(avatar));
}
export async function renderAvatarPng(value){
 const svg=renderAvatarSvg(value);
 const image=new Image();
 const url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
 await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('Could not draw the portrait'));image.src=url;});
 const canvas=document.createElement('canvas');
 canvas.width=320;canvas.height=430;
 const ctx=canvas.getContext('2d');
 if(!ctx)throw new Error('Portrait canvas is unavailable');
 ctx.drawImage(image,0,0,320,430);
 return canvas.toDataURL('image/png');
}
