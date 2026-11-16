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
export const AVATAR_ART_VERSION=2;
export const AVATAR_KEYS=AVATAR_GROUPS.flatMap(g=>g.parts.map(p=>p.key));
const bounds=Object.fromEntries(AVATAR_GROUPS.flatMap(g=>g.parts.map(p=>[p.key,p.palette?AVATAR_PALETTES[p.palette].length:p.choices.length])));
export const DEFAULT_AVATAR={hairBack:2,bangs:1,sides:1,hairColor:2,eyes:0,iris:0,eyeColor:0,brows:0,face:0,skin:1,nose:0,mouth:1,extras:0,backdrop:0,outfit:0,outfitColor:0};
const hairBack=[
 '',
 'M62 95 Q72 55 118 50 Q171 46 184 99 L184 201 Q177 236 160 244 L155 163 L82 164 L77 232 Q56 204 62 95Z',
 'M53 98 Q63 49 116 43 Q180 42 188 99 L194 272 L169 276 L161 181 L77 180 L68 278 L42 273Z',
 'M57 94 Q66 47 115 44 Q178 38 185 101 Q196 143 189 184 Q209 221 190 265 Q194 288 179 290 L160 253 Q164 215 152 180 L88 180 Q71 233 83 268 L58 291 Q40 275 52 253 Q30 223 52 182Z',
 'M52 103 Q66 44 113 47 Q159 27 190 91 L200 151 L182 140 L192 217 L167 202 L163 257 L139 220 L82 213 L63 254 L58 197 L42 212 L51 162 L36 178Z',
 'M57 99 Q74 45 117 45 Q171 41 185 91 L179 140 L152 138 L75 147Z M175 99 Q208 116 209 170 Q220 209 201 242 Q183 229 184 191 Q165 162 175 99Z',
 'M55 97 Q66 44 120 44 Q174 44 186 102 L169 157 L69 159Z M51 123 Q19 137 21 203 Q25 238 41 257 Q63 244 60 212 L68 155Z M186 124 Q218 138 219 199 Q221 237 198 259 Q178 240 183 209 L176 156Z',
 'M58 99 Q73 44 120 44 Q173 44 183 96 L174 180 L74 187Z M179 134 Q201 160 188 185 Q206 206 190 230 Q199 251 176 273 L160 281 Q168 244 166 214 Q171 169 179 134Z',
 'M70 87 Q85 50 123 47 Q170 53 178 89 L178 135 L65 145Z',
 'M54 97 Q67 46 117 43 Q180 39 188 98 L185 238 Q173 268 159 276 L158 171 L82 171 L79 271 L61 266 Q50 244 54 97Z'
];
const bangs=[
 '',
 'M59 130 Q59 58 120 53 Q176 54 183 124 Q162 109 150 83 Q151 133 133 148 L127 108 Q119 150 103 155 L111 107 Q89 148 74 154 L78 113Z',
 'M57 137 Q55 61 119 51 Q181 54 185 138 L177 143 L166 121 L157 147 L148 120 L137 149 L126 119 L117 151 L104 120 L91 151 L81 119 L65 147Z',
 'M54 116 Q70 49 120 48 Q166 48 189 115 L169 130 Q149 87 132 84 L126 130 L116 94 Q93 93 72 139 L56 142Z',
 'M59 110 Q66 53 118 49 Q178 47 186 107 L184 154 Q154 156 133 114 Q115 121 92 144 L62 166Z',
 'M52 120 Q57 52 120 47 Q177 47 190 121 L177 153 L161 123 L151 160 L135 128 L118 171 L109 130 L91 158 L78 128 L62 159 L49 140Z',
 'M65 108 Q72 61 120 52 Q166 56 179 105 L167 114 L164 100 L149 119 L145 99 L132 117 L122 96 L108 118 L98 98 L82 119Z',
 'M53 96 Q69 40 121 48 Q177 44 187 107 L172 174 L153 157 L139 206 L127 162 L106 195 L93 149 L65 189 L55 154Z',
 'M57 119 Q64 57 119 51 Q176 53 185 118 Q160 99 145 120 Q133 140 117 147 Q132 112 113 110 Q101 124 85 139 L82 117 L64 150Z',
 'M54 121 Q63 54 119 49 Q178 48 188 115 L184 180 Q157 170 154 128 Q135 152 127 155 L128 112 Q101 138 66 145 L66 169 L54 158Z'
];
const sideHair=[
 '',
 'M65 119 Q48 132 54 176 L68 200 Q73 176 72 143Z M177 119 Q192 144 184 180 L173 200 Q168 173 171 143Z',
 'M64 117 Q46 129 54 190 L41 251 L65 243 Q79 202 73 141Z M177 117 Q199 144 190 195 L202 254 L174 247 Q162 211 169 143Z',
 'M67 122 Q45 129 48 166 Q37 176 49 195 Q42 215 60 229 Q78 210 68 191 Q81 172 70 147Z M174 123 Q194 131 191 158 Q206 174 190 195 Q196 215 177 231 Q162 216 173 194 Q161 173 174 149Z',
 'M62 114 Q41 142 51 189 L40 252 Q70 247 78 208 L78 141Z M181 129 Q193 148 184 180 L171 189Z',
 'M65 111 Q45 133 53 169 L45 224 L67 234 Q77 201 78 154Z M174 112 Q197 131 191 169 L196 225 L172 233 Q165 196 164 155Z',
 'M62 122 Q46 135 51 174 L54 230 L72 231 L71 141Z M180 123 Q193 137 190 176 L189 231 L172 230 L173 141Z',
 'M59 120 Q43 150 52 172 L46 201 L66 196 L71 147Z M183 124 Q195 150 185 174 L194 198 L172 197 L170 145Z'
];
const faceShapes=[
 // All silhouettes share a crown, cheek line, jaw center and the same feature anchors.
 'M120 89 C158 87 182 119 178 170 C177 202 157 232 120 251 C83 232 63 202 62 170 C58 119 82 87 120 89Z',
 'M120 89 C162 88 185 122 183 171 C181 215 156 239 120 246 C84 239 59 215 57 171 C55 122 78 88 120 89Z',
 'M120 88 C158 86 181 112 181 143 L177 205 Q157 238 120 250 Q83 238 63 205 L59 143 C59 112 82 86 120 88Z',
 'M120 88 C160 88 184 120 181 170 C178 211 152 242 120 256 C88 242 62 211 59 170 C56 120 80 88 120 88Z'
];
const eyeShapes=[
 'M-19 0 Q-3 -12 19 -2 Q6 9 -10 8 Q-19 6 -19 0Z',
 'M-17 -1 C-15 -14 13 -16 18 -1 C20 12 -15 13 -17 -1Z',
 'M-19 0 Q-1 -8 19 -1 Q5 8 -14 7Z',
 'M-22 2 Q0 -16 21 -7 Q9 9 -22 2Z',
 'M-20 -3 Q-2 2 20 -3 Q5 9 -17 4Z',
 'M-19 -2 Q0 -19 19 -1 Q9 13 -13 11Z',
 'M-20 1 Q0 -6 20 -1 Q4 5 -20 1Z',
 ''
];
const browPaths=[
 'M-18 0 Q0 -7 18 -1','M-19 1 L19 1','M-19 0 Q0 -12 19 -4',
 'M-18 4 L18 -4','M-18 0 Q0 -4 18 0','',
 'M-18 2 Q0 -14 18 2','M-12 0 L12 -2'
];
function path(d,fill,extra=''){return d?'<path d="'+d+'" fill="'+fill+'" '+extra+'/>':'';}
function line(d,stroke,width=2){return '<path d="'+d+'" fill="none" stroke="'+stroke+'" stroke-width="'+width+'" stroke-linecap="round" stroke-linejoin="round"/>';}
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
 const a=normalizeAvatar(value),skin=AVATAR_PALETTES.skin[a.skin][1],
 hair=AVATAR_PALETTES.hairColor[a.hairColor][1],iris=AVATAR_PALETTES.eyeColor[a.eyeColor][1],
 coat=AVATAR_PALETTES.outfitColor[a.outfitColor][1],back=AVATAR_PALETTES.backdrop[a.backdrop][1],
 edge='#383334',light='#f8f7f3',dark='#282729';
 const pieces=['<svg xmlns="http://www.w3.org/2000/svg" width="320" height="430" viewBox="0 0 240 320" aria-hidden="true">'];
 pieces.push('<rect width="240" height="320" fill="'+back+'"/>');
 // Hair behind neck and shoulders.
 pieces.push('<g id="avatar-back-hair" transform="translate(0 32) scale(1 .83)">'+path(hairBack[a.hairBack],hair)+'</g>');
 pieces.push(path('M100 220 L140 220 L146 259 Q124 281 96 258Z',skin));
 pieces.push(path('M18 320 Q22 275 69 258 L100 246 L120 264 L140 246 L172 258 Q221 273 222 320Z',coat));
 if(a.outfit===0)pieces.push(path('M78 257 L118 287 L99 320 L70 271Z M162 257 L122 287 L141 320 L171 271Z',dark));
 if(a.outfit===1)pieces.push(line('M81 267 Q120 305 159 267',light,3));
 if(a.outfit===2)pieces.push(path('M76 252 L100 251 L117 285 L98 320 L77 320Z M164 252 L140 251 L123 285 L142 320 L163 320Z',dark));
 if(a.outfit===3)pieces.push(path('M32 290 L81 259 L98 280 L85 320 L30 320Z M208 290 L159 259 L142 280 L155 320 L210 320Z','#aaa6a3'));
 if(a.outfit===4)pieces.push(path('M68 251 Q120 282 173 251 L216 320 L24 320Z',coat)+line('M68 251 Q120 284 173 251',light,2));
 if(a.outfit===5)pieces.push(path('M94 253 L120 295 L144 253 L158 264 L120 320 L81 264Z',light));
 if(a.outfit===6)pieces.push(path('M86 250 Q118 275 152 250 Q171 268 164 284 Q118 308 75 282Z',hair));
 if(a.outfit===7)pieces.push(path('M110 264 L120 285 L130 264Z',light));
 // Ears and facial silhouette.
 pieces.push('<ellipse cx="61" cy="175" rx="10" ry="16" fill="'+skin+'"/><ellipse cx="179" cy="175" rx="10" ry="16" fill="'+skin+'"/>');
 pieces.push(path(faceShapes[a.face],skin));
 // Subtle non-photorealistic contour marks.
 pieces.push(line('M68 178 Q63 182 69 187',edge,.7)+line('M172 178 Q177 182 171 187',edge,.7));
 // A small scalp-cap gives exposed-forehead styles a natural hairline.
 if(a.bangs===0&&a.hairBack>0)pieces.push(path('M61 133 Q58 73 120 67 Q180 73 179 133 L170 116 Q150 121 137 102 Q109 118 89 112 L67 137Z',hair));
 // Eyebrows, each separately positioned; they are partly hidden by the fringe.
 if(browPaths[a.brows])for(const x of [91,149])pieces.push('<g transform="translate('+x+' 151) scale(.87 .83)">'+line(browPaths[a.brows],hair,2.9)+'</g>');
 // Eye whites are the masks for pupils; the fringe cannot cover their centers.
 // Versioned, per-recipe clip identifiers avoid collisions between option thumbnails.
 for(const x of [91,149]){
  pieces.push('<g id="avatar-eye-'+x+'" transform="translate('+x+' 172) scale(.88 .88)">');
  if(a.eyes===7){pieces.push(line('M-18 0 Q0 8 18 0',edge,2.4));}
  else{
   const shape=eyeShapes[a.eyes],clipId='grimEye'+encodeAvatar(a).slice(3)+'x'+x;
   pieces.push('<defs><clipPath id="'+clipId+'"><path d="'+shape+'"/></clipPath></defs>');
   pieces.push(path(shape,light,'stroke="'+edge+'" stroke-width="1.6"'));
   pieces.push('<g clip-path="url(#'+clipId+')">');
   const radius=Math.min([7.5,10.5,5.5,7.5,7,8.5][a.iris]||7,[8,11,6,8,4,11,3][a.eyes]);
   const cy=a.eyes===4?0:1;
   if(a.iris===3)pieces.push('<ellipse cx="0" cy="'+cy+'" rx="3.1" ry="'+(radius+2)+'" fill="'+iris+'"/>');
   else pieces.push('<circle cx="0" cy="'+cy+'" r="'+radius+'" fill="'+iris+'"/>');
   pieces.push('<ellipse cx="0" cy="'+(cy+1)+'" rx="'+(a.iris===3?1.7:2.8)+'" ry="'+Math.min(4.5,radius)+'" fill="'+dark+'"/>');
   if(a.iris!==5)pieces.push('<circle cx="-2.5" cy="-2.8" r="2" fill="'+light+'"/>');
   pieces.push('</g>');
   pieces.push(line('M-19 -2 Q-2 -13 19 -3',edge,a.eyes===5?2.8:2.1));
   if(a.eyes===3||a.eyes===5)pieces.push(line('M-18 -2 L-22 -6',edge,1.6));
  }
  pieces.push('</g>');
 }
 const noses=['M120 189 l-2 6 l3 0','M119 195 l2 0','M119 190 q-4 6 2 6','M118 188 l-1 7 l4 1',''][a.nose];
 if(noses)pieces.push(line(noses,'#886c5d',1.8));
 const mouths=[
 'M113 218 Q120 220 127 218','M112 215 Q120 222 128 215','M110 213 Q120 227 130 213','M114 220 Q120 217 126 220',
 'M114 215 Q120 210 126 215 Q120 225 114 215Z','M110 215 Q120 225 130 215 M112 217 L128 217',
 'M112 219 L128 219','M112 224 Q120 215 128 224'
 ];
 pieces.push(a.mouth===4?path(mouths[a.mouth],'#8e6263'):line(mouths[a.mouth],'#875c59',1.9));
 if(a.extras===1)for(const x of [75,80,85,153,159,164])pieces.push('<circle cx="'+x+'" cy="'+(196+(x%3)*4)+'" r="1.8" fill="#ad7966"/>');
 if(a.extras===2)pieces.push('<ellipse cx="83" cy="202" rx="14" ry="6" fill="#d79d9d" opacity=".48"/><ellipse cx="157" cy="202" rx="14" ry="6" fill="#d79d9d" opacity=".48"/>');
 if(a.extras===3)pieces.push(line('M154 194 l14 12 M157 204 l9 -5','#8f5751',2));
 if(a.extras===4)pieces.push('<circle cx="150" cy="211" r="2.4" fill="'+edge+'"/>');
 if(a.extras===5)pieces.push('<rect x="128" y="157" width="40" height="33" rx="11" fill="'+dark+'"/>'+line('M130 161 L110 152',edge,2));
 if(a.extras===6)pieces.push('<rect x="68" y="160" width="48" height="33" rx="8" fill="none" stroke="'+edge+'" stroke-width="3"/><rect x="124" y="160" width="48" height="33" rx="8" fill="none" stroke="'+edge+'" stroke-width="3"/>'+line('M116 172 L124 172',edge,3));
 if(a.extras===7)pieces.push('<circle cx="59" cy="196" r="5" fill="none" stroke="#b69b5f" stroke-width="3"/><circle cx="181" cy="196" r="5" fill="none" stroke="#b69b5f" stroke-width="3"/>');
 // Front hair layers sit on top of the face, like real paper cutouts.
 pieces.push('<g id="avatar-side-hair" transform="translate(120 24) scale(1.06 .84) translate(-120 0)">'+path(sideHair[a.sides],hair)+'</g>');
 pieces.push('<g id="avatar-fringe" transform="translate(0 44) scale(1 .58)">'+path(bangs[a.bangs],hair)+'</g>');
 // Hair, eyes and facial features share fixed anchors across every option.
 pieces.push('</svg>');
 return pieces.join('');
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
