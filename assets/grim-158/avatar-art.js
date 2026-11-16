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
export const AVATAR_ART_VERSION=3;
export const AVATAR_KEYS=AVATAR_GROUPS.flatMap(g=>g.parts.map(p=>p.key));
const bounds=Object.fromEntries(AVATAR_GROUPS.flatMap(g=>g.parts.map(p=>[p.key,p.palette?AVATAR_PALETTES[p.palette].length:p.choices.length])));
export const DEFAULT_AVATAR={hairBack:2,bangs:1,sides:1,hairColor:2,eyes:0,iris:0,eyeColor:0,brows:0,face:0,skin:1,nose:0,mouth:1,extras:0,backdrop:0,outfit:0,outfitColor:0};
// Hair lives in ONE coordinate system. The scalp, crown, temples and fringe
// meet at shared anchors instead of each layer being scaled independently.
const hairBack=[
 '',
 'M62 130 Q56 88 84 78 Q120 62 157 79 Q186 88 183 131 L188 197 Q184 220 169 230 L154 234 L165 167 L76 166 L84 233 L65 229 Q51 216 52 196Z',
 'M61 130 Q52 87 84 77 Q120 63 159 78 Q189 90 183 135 L193 278 Q179 288 165 282 L160 170 L80 170 L73 284 Q58 290 46 279Z',
 'M60 126 Q57 84 89 74 Q123 62 157 77 Q187 88 184 130 Q194 159 184 182 Q204 214 187 243 Q194 266 175 280 Q158 282 163 257 L160 173 L81 173 L78 257 Q83 280 64 283 Q47 267 55 242 Q39 217 56 186Z',
 'M61 132 Q48 87 88 78 Q120 59 159 78 Q186 94 181 131 L192 153 L182 170 L193 201 L176 194 L181 223 L159 211 L158 175 L79 174 L75 220 L57 233 L60 199 L46 209 L55 172 L45 180Z',
 'M63 134 Q57 82 92 78 Q127 62 159 78 Q187 94 182 132 L169 168 L76 167Z M179 135 Q199 137 203 171 Q214 202 198 226 Q193 244 179 262 Q168 246 176 219 Q181 181 170 168Z',
 'M61 134 Q54 84 89 77 Q120 61 158 77 Q188 90 184 136 L174 170 L70 171Z M64 143 Q47 143 47 168 Q42 189 50 208 Q47 231 56 245 Q73 233 68 207 Q76 185 72 162 L75 145Z M176 143 Q193 143 193 168 Q198 189 190 208 Q193 231 184 245 Q167 233 172 207 Q164 185 168 162 L165 145Z',
 'M63 135 Q52 89 89 78 Q123 63 159 79 Q185 91 183 134 L171 174 L72 174Z M182 151 Q196 159 183 177 Q199 191 184 210 Q199 225 180 239 Q193 252 176 269 Q164 278 161 270 Q176 245 165 225 Q171 200 165 176Z',
 'M65 132 Q61 91 91 80 Q119 68 150 80 Q176 91 180 134 L167 165 L78 164Z',
 'M62 133 Q52 86 86 77 Q120 63 155 76 Q189 88 184 135 L187 247 Q183 262 170 269 L158 276 L164 169 L78 170 L80 275 L61 268 Q52 254 53 238Z'
];
const bangs=[
 '',
 'M60 135 Q57 94 83 82 Q121 63 154 80 Q178 91 182 134 Q164 130 150 111 Q147 129 128 139 Q110 148 87 151 L92 116 Q76 132 60 135Z',
 'M60 133 Q56 91 85 80 Q121 64 158 80 Q184 93 182 135 L177 146 Q158 145 147 141 L142 149 Q126 146 117 149 L109 143 Q92 149 76 145 L64 148Z',
 'M60 135 Q57 91 86 80 Q119 65 151 78 Q183 90 183 135 L166 143 Q151 119 133 113 Q125 124 120 143 Q113 121 104 114 Q86 116 74 147 L61 141Z',
 'M60 128 Q62 87 90 78 Q122 62 155 79 Q181 92 183 134 Q157 135 139 117 Q119 139 97 148 Q77 157 61 151Z',
 'M61 133 Q55 89 86 79 Q120 63 158 80 Q184 92 183 139 L170 148 Q157 128 151 131 L145 153 Q130 142 124 145 L114 157 Q105 139 96 141 L83 151 Q76 137 68 143 L62 148Z',
 'M62 132 Q59 93 87 82 Q121 68 157 83 Q183 95 181 133 Q174 131 170 139 L162 132 Q149 137 142 144 L136 131 Q124 144 113 145 L109 133 Q91 145 77 146Z',
 'M60 132 Q56 91 87 79 Q121 63 156 81 Q183 95 182 136 L169 155 Q160 138 148 136 L139 162 L125 142 L112 160 L99 139 L78 158 L62 148Z',
 'M61 134 Q58 91 86 80 Q118 64 151 79 Q181 90 182 135 Q166 129 155 130 Q144 145 128 145 Q138 125 119 116 Q103 119 93 140 Q76 143 62 149Z',
 'M61 136 Q57 90 87 79 Q120 64 154 79 Q183 91 184 138 L177 153 Q157 147 154 132 Q145 141 127 147 L128 120 Q106 142 81 149 L63 150Z'
];
const sideHair=[
 '',
 'M62 128 Q52 149 56 174 Q56 190 66 201 Q73 183 70 163 L74 137Z M177 128 Q187 149 183 174 Q183 190 174 201 Q167 183 170 163 L166 137Z',
 'M62 128 Q50 149 56 185 Q56 210 46 241 Q61 243 68 227 Q76 205 72 164 L76 138Z M178 128 Q190 149 184 185 Q184 211 195 241 Q178 243 171 227 Q164 205 169 164 L164 138Z',
 'M61 131 Q49 145 57 165 Q49 181 60 193 Q54 210 67 226 Q77 211 69 195 Q79 181 70 164 L73 140Z M180 131 Q191 144 184 165 Q192 181 180 193 Q187 210 174 226 Q163 211 171 195 Q162 181 171 164 L168 140Z',
 'M62 127 Q48 148 56 182 Q52 216 40 252 Q64 248 70 226 Q79 200 72 159 L76 137Z M180 128 Q187 145 181 168 L172 188 Q168 173 169 150Z',
 'M61 126 Q50 142 56 172 L51 219 Q61 228 70 217 Q74 198 72 167 L77 135Z M180 126 Q191 144 184 172 L189 219 Q179 228 170 217 Q166 199 170 166 L165 135Z',
 'M62 130 Q54 144 58 166 L58 195 Q60 212 67 231 L72 220 Q69 203 70 181 L73 141Z M177 130 Q187 144 183 166 L183 195 Q180 213 174 231 L169 220 Q173 203 171 181 L167 141Z',
 'M64 127 Q51 146 59 161 L54 190 Q60 187 67 177 L73 141Z M177 127 Q190 145 181 162 L187 190 Q177 186 173 177 L168 141Z'
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
function blend(a,b,weight){return '#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-weight)+parseInt(b.slice(i,i+2),16)*weight).toString(16).padStart(2,'0')).join('');}
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
 edge='#383334',light='#f8f7f3',dark='#282729',hairEdge=blend(hair,'#252024',.28),browColor=blend(hair,'#3d302e',.50),
 skinBright=(parseInt(skin.slice(1,3),16)+parseInt(skin.slice(3,5),16)+parseInt(skin.slice(5,7),16))/3,
 faceInk=skinBright>151?blend(skin,edge,.62):blend(skin,'#deb6a5',.68);
 const pieces=['<svg xmlns="http://www.w3.org/2000/svg" width="320" height="430" viewBox="0 0 240 320" aria-hidden="true">'];
 pieces.push('<rect width="240" height="320" fill="'+back+'"/>');
 // Hair behind neck and shoulders.
 pieces.push('<g id="avatar-back-hair">'+path(hairBack[a.hairBack],hair,'stroke="'+hairEdge+'" stroke-width=".6" stroke-linejoin="round"')+'</g>');
 pieces.push(path('M100 220 L140 220 L146 259 Q124 281 96 258Z',skin));
 pieces.push(path('M18 320 Q22 275 69 258 L100 246 L120 264 L140 246 L172 258 Q221 273 222 320Z',coat));
 if(a.outfit===0)pieces.push(path('M78 257 L118 287 L99 320 L70 271Z M162 257 L122 287 L141 320 L171 271Z',dark));
 if(a.outfit===1)pieces.push(path('M100 249 L120 266 L140 249 L133 264 L120 281 L107 264Z',blend(coat,light,.75))+line('M88 261 Q104 273 120 286 Q136 273 152 261',blend(coat,light,.45),1.6));
 if(a.outfit===2)pieces.push(path('M76 252 L100 251 L117 285 L98 320 L77 320Z M164 252 L140 251 L123 285 L142 320 L163 320Z',dark));
 if(a.outfit===3)pieces.push(path('M32 290 L81 259 L98 280 L85 320 L30 320Z M208 290 L159 259 L142 280 L155 320 L210 320Z','#aaa6a3'));
 if(a.outfit===4)pieces.push(path('M68 251 Q120 282 173 251 L216 320 L24 320Z',coat));
 if(a.outfit===5)pieces.push(path('M94 253 L120 295 L144 253 L158 264 L120 320 L81 264Z',light));
 if(a.outfit===6)pieces.push(path('M86 250 Q118 275 152 250 Q171 268 164 284 Q118 308 75 282Z',blend(coat,light,.36)));
 if(a.outfit===7)pieces.push(path('M110 264 L120 285 L130 264Z',light));
 // Ears and facial silhouette.
 pieces.push('<ellipse cx="61" cy="175" rx="10" ry="16" fill="'+skin+'"/><ellipse cx="179" cy="175" rx="10" ry="16" fill="'+skin+'"/>');
 pieces.push(path(faceShapes[a.face],skin));
 // Subtle non-photorealistic contour marks.
 pieces.push(line('M68 178 Q63 182 69 187',edge,.7)+line('M172 178 Q177 182 171 187',edge,.7));
 // A small scalp-cap gives exposed-forehead styles a natural hairline.
 if(a.bangs===0&&a.hairBack>0)pieces.push(path('M60 134 Q57 93 87 80 Q121 65 156 80 Q181 94 181 134 Q160 128 151 116 Q139 132 120 134 Q102 132 89 117 Q74 132 60 134Z',hair));
 // Eyebrows, each separately positioned; they are partly hidden by the fringe.
 if(browPaths[a.brows])for(const x of [91,149])pieces.push('<g transform="translate('+x+' 151) scale(.87 .83)">'+line(browPaths[a.brows],browColor,2.6)+'</g>');
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
 if(noses)pieces.push(line(noses,faceInk,1.8));
 const mouths=[
 'M113 218 Q120 220 127 218','M112 215 Q120 222 128 215','M110 213 Q120 227 130 213','M114 220 Q120 217 126 220',
 'M114 215 Q120 210 126 215 Q120 225 114 215Z','M110 215 Q120 225 130 215 M112 217 L128 217',
 'M112 219 L128 219','M112 224 Q120 215 128 224'
 ];
 pieces.push(a.mouth===4?path(mouths[a.mouth],faceInk):line(mouths[a.mouth],faceInk,1.8));
 if(a.extras===1)for(const x of [75,80,85,153,159,164])pieces.push('<circle cx="'+x+'" cy="'+(196+(x%3)*4)+'" r="1.8" fill="#ad7966"/>');
 if(a.extras===2)pieces.push('<ellipse cx="83" cy="202" rx="14" ry="6" fill="#d79d9d" opacity=".48"/><ellipse cx="157" cy="202" rx="14" ry="6" fill="#d79d9d" opacity=".48"/>');
 if(a.extras===3)pieces.push(line('M154 194 l14 12 M157 204 l9 -5','#8f5751',2));
 if(a.extras===4)pieces.push('<circle cx="150" cy="211" r="2.4" fill="'+edge+'"/>');
 if(a.extras===5)pieces.push(line('M136 166 Q103 145 65 147',edge,2.5)+path('M135 161 Q149 154 164 163 Q171 173 164 185 Q149 192 135 184 Q130 173 135 161Z',dark,'stroke="'+blend(dark,light,.34)+'" stroke-width="1.4"')+line('M140 164 Q151 160 159 166',blend(dark,light,.34),1.3));
 if(a.extras===6)pieces.push(path('M72 164 Q90 160 110 164 L109 180 Q91 190 74 182Z M130 164 Q150 160 168 164 L166 182 Q149 190 131 180Z','none','stroke="'+edge+'" stroke-width="2.6" stroke-linejoin="round"')+line('M110 167 Q120 162 130 167',edge,2)+line('M72 167 L62 163',edge,2)+line('M168 167 L179 163',edge,2));
 if(a.extras===7)pieces.push('<circle cx="61" cy="189" r="3.4" fill="none" stroke="#b69b5f" stroke-width="2.5"/><circle cx="179" cy="189" r="3.4" fill="none" stroke="#b69b5f" stroke-width="2.5"/>');
 // Front hair layers sit on top of the face, like real paper cutouts.
 pieces.push('<g id="avatar-side-hair">'+path(sideHair[a.sides],hair,'stroke="'+hairEdge+'" stroke-width=".5" stroke-linejoin="round"')+'</g>');
 pieces.push('<g id="avatar-fringe">'+path(bangs[a.bangs],hair,'stroke="'+hairEdge+'" stroke-width=".5" stroke-linejoin="round"')+'</g>');
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
