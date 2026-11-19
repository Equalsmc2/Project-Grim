/*
 * Project Grim portrait atelier — original, code-drawn fantasy character art.
 * Each silhouette is a hand-authored vector path. No generated/raster assets.
 * The 240 x 320 drawing is deliberately independent of the maker's UI.
 * All layers share a single face, temple, eye, and neck coordinate system.
 */

const backStyles = [
  '',
  // Bob: follows the cheeks, then turns inward near the nape.
  'M64 141 Q58 92 85 76 Q114 57 148 70 Q182 78 184 135 Q197 165 191 198 Q184 220 164 231 L153 219 Q165 188 162 166 L78 166 Q82 206 87 219 L66 232 Q43 213 47 185 Q45 154 64 141Z',
  // Long hair: narrow hanging sheets with tapered, deliberately uneven ends.
  'M62 143 Q55 95 86 75 Q115 59 150 70 Q181 79 183 141 Q189 202 196 300 Q182 295 175 305 L166 290 L159 167 L79 167 L75 293 L64 306 L56 290 L43 299 Q50 222 55 179Z',
  // Waves: continuous S-curves instead of disconnected circular blobs.
  'M63 142 Q56 91 87 76 Q120 59 150 72 Q181 82 183 143 Q201 176 189 199 Q204 225 190 244 Q198 263 178 292 L166 284 Q178 266 165 247 Q176 226 163 208 L160 164 L79 164 Q68 203 80 218 Q64 243 78 258 Q69 276 59 292 Q39 267 50 244 Q38 221 52 200 Q41 175 63 142Z',
  // Shag: crisp layered ends with a ragged outside contour.
  'M62 143 Q51 91 84 74 Q119 55 153 72 Q187 87 181 139 L194 164 L180 170 L194 194 L174 190 L180 224 L158 211 L162 166 L79 164 L72 219 L54 236 L58 202 L42 211 L53 182 L42 185Z',
  // Ponytail tucked behind the far shoulder.
  'M63 144 Q55 94 86 76 Q118 58 151 71 Q183 82 183 138 L171 167 L77 167Z M170 136 Q193 133 201 157 Q210 184 198 212 Q201 237 184 270 Q166 263 172 245 Q181 216 174 190 L162 164Z',
  // Twin tails: slim tied sections follow real hair growth at both temples.
  'M62 143 Q54 94 88 76 Q118 58 150 71 Q182 82 184 141 L168 167 L74 167Z M66 151 Q49 156 46 178 Q40 204 52 223 Q49 242 56 257 Q72 237 68 213 Q77 191 73 173Z M174 151 Q191 156 194 178 Q200 204 188 223 Q191 242 184 257 Q168 237 172 213 Q163 191 167 173Z',
  // Braided on one side: scalloped links with a gently tapering end.
  'M62 142 Q55 94 88 76 Q119 58 151 72 Q181 84 184 142 L169 174 L75 172Z M178 155 Q194 164 185 180 Q197 193 183 205 Q195 216 181 229 Q190 240 177 250 Q186 262 174 275 L167 279 Q170 259 161 246 Q170 226 161 210 Q169 191 163 176Z',
  // Cropped: little volume at the nape but still a real silhouette.
  'M66 143 Q60 95 90 78 Q122 63 150 76 Q177 89 180 144 L169 163 Q152 156 137 159 L87 159 L72 166Z',
  // Shoulder-length: uneven tips land against the coat rather than floating.
  'M62 142 Q56 93 87 76 Q119 58 151 72 Q183 84 183 141 Q193 205 189 261 L174 279 L160 266 L160 167 L80 167 L80 270 L66 279 L50 263 Q45 209 62 142Z'
];

// Fringe paths are LOCKS, not copies of the entire scalp. This is the most
// important distinction from the original helmet-like portrait geometry.
const fringeStyles = [
  '',
  'M73 115 Q103 100 147 105 Q142 127 125 140 Q103 155 78 158 Q91 136 103 120 Q88 131 73 137Z M144 108 Q157 110 168 126 L174 150 Q160 143 156 127Z',
  'M71 114 Q114 104 172 115 L171 142 Q150 144 140 149 L129 146 Q113 151 103 146 Q87 149 70 144Z',
  'M70 111 Q98 102 119 113 Q116 137 85 153 L67 153 Q79 133 91 122Z M124 113 Q147 101 171 113 L175 151 Q147 143 127 126Z',
  'M72 109 Q115 98 171 110 Q156 141 119 149 Q95 159 72 153 Q106 134 119 119 Q97 133 72 137Z',
  'M68 113 Q106 99 145 108 Q140 124 123 134 L118 156 L105 141 L88 152 Q86 133 77 142 L68 145Z M143 108 Q159 113 174 128 L171 145 Q161 129 149 128Z',
  'M70 111 Q107 104 164 111 L175 135 Q156 132 151 140 L139 132 L127 146 L115 134 L98 145 L91 131 L77 144Z',
  'M70 110 Q118 99 173 113 L168 147 Q154 143 146 133 L139 162 Q126 145 120 143 L107 163 Q98 146 89 144 L71 155Z',
  'M70 113 Q98 101 119 116 Q113 135 91 148 Q74 155 65 148 Q86 128 103 121Z M130 114 Q155 100 174 118 Q174 146 163 153 Q150 139 130 130Z',
  'M69 110 Q116 98 172 112 L177 145 Q155 145 149 132 Q138 149 119 154 L121 122 Q97 145 70 148Z'
];

// The short/long/curled choices all attach at x~68/172, y~128, and lie
// forward of the same face edge. None is individually transformed or scaled.
const sideStyles = [
  '',
  'M66 126 Q56 145 60 168 Q59 180 67 190 Q74 172 73 150 L76 130Z M174 126 Q184 145 180 168 Q181 180 173 190 Q166 172 167 150 L164 130Z',
  'M67 125 Q54 146 59 177 Q57 210 45 239 Q61 241 70 225 Q77 197 72 158 L77 130Z M173 125 Q186 146 181 177 Q183 210 195 239 Q179 241 170 225 Q163 197 168 158 L163 130Z',
  'M67 126 Q54 144 62 163 Q54 176 64 188 Q58 199 67 216 Q80 201 72 188 Q81 176 73 161 L77 132Z M173 126 Q186 144 178 163 Q186 176 176 188 Q182 199 173 216 Q160 201 168 188 Q159 176 167 161 L163 132Z',
  'M67 126 Q54 145 57 169 Q56 200 40 250 Q61 246 70 228 Q79 200 72 160 L77 130Z M173 128 Q183 143 180 166 L171 183 L166 154 L163 131Z',
  'M68 126 Q58 149 63 180 Q59 201 53 223 Q69 224 74 205 Q79 177 73 152 L78 130Z M172 126 Q182 149 177 180 Q181 201 187 223 Q171 224 166 205 Q161 177 167 152 L162 130Z',
  'M66 127 Q57 143 64 162 Q58 173 65 187 Q59 200 68 215 Q77 204 73 191 Q80 178 72 164 L77 129Z M174 127 Q183 143 176 162 Q182 173 175 187 Q181 200 172 215 Q163 204 167 191 Q160 178 168 164 L163 129Z',
  'M68 126 Q62 142 64 160 L60 184 Q66 181 72 171 L75 130Z M172 126 Q178 142 176 160 L180 184 Q174 181 168 171 L165 130Z'
];

const faceShapes = [
  'M120 97 C153 93 178 118 176 161 C177 188 168 215 150 232 Q134 248 120 251 Q106 248 90 232 C72 215 63 188 64 161 C62 118 87 93 120 97Z',
  'M120 98 C155 95 180 123 180 166 Q182 211 154 235 Q138 248 120 249 Q102 248 86 235 Q58 212 60 166 C60 124 85 95 120 98Z',
  'M120 97 Q158 94 177 124 L178 194 Q168 224 145 238 L120 250 L95 238 Q72 225 62 194 L63 124 Q82 94 120 97Z',
  'M120 96 C157 94 181 122 178 166 C177 200 164 227 144 244 L120 257 L96 244 C76 227 63 201 62 166 C59 122 83 94 120 96Z'
];

const eyeShapes = [
  'M-19 1 Q-5 -11 19 -3 Q9 9 -11 8 Q-19 6 -19 1Z',
  'M-18 -1 C-16 -16 14 -17 19 -1 C20 13 -14 14 -18 -1Z',
  'M-19 1 Q0 -7 19 -1 Q4 8 -13 7Z',
  'M-21 3 Q-2 -14 21 -7 Q8 6 -21 3Z',
  'M-19 -2 Q-2 2 20 -3 Q7 8 -15 5Z',
  'M-19 -2 Q-1 -19 18 -2 Q10 13 -12 11Z',
  'M-19 1 Q0 -7 20 -1 Q3 5 -19 1Z',
  ''
];

const browShapes = [
  'M-17 1 Q0 -6 17 0', 'M-18 1 L18 1', 'M-18 1 Q-3 -11 17 -4',
  'M-18 4 L18 -3', 'M-17 0 Q0 -3 17 1', '',
  'M-17 2 Q0 -13 17 2', 'M-11 1 L11 -1'
];

const fringeTexture = [
  '', 'M87 121 Q116 103 135 111 M153 114 Q160 124 162 133',
  'M83 121 Q102 114 120 118 M137 119 Q153 121 163 123',
  'M99 117 Q101 131 84 144 M137 116 Q156 124 163 140',
  'M85 119 Q108 107 140 115 M119 128 Q100 145 79 146',
  'M83 117 Q103 115 118 124 M141 118 Q156 124 163 136',
  'M85 116 L90 130 M118 115 L116 133 M149 117 L146 131',
  'M85 116 Q109 113 119 127 M145 119 L138 146',
  'M91 119 Q100 129 78 142 M143 117 Q153 128 163 143',
  'M83 116 Q105 110 121 117 M141 119 Q143 132 133 143'
];

const svgPath = (d, fill, extra='') => d ? `<path d="${d}" fill="${fill}" ${extra}/>` : '';
const inkLine = (d, color, width=1.5, extra='') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;

function tint(hex, toward, strength) {
  return '#'+[1,3,5].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*(1-strength)+parseInt(toward.slice(i,i+2),16)*strength).toString(16).padStart(2,'0')).join('');
}

export function drawIllustratedAvatar(a, palettes, code) {
  const skin=palettes.skin[a.skin][1], hair=palettes.hairColor[a.hairColor][1];
  const iris=palettes.eyeColor[a.eyeColor][1], coat=palettes.outfitColor[a.outfitColor][1], background=palettes.backdrop[a.backdrop][1];
  const ink='#353036', dark='#242328', cream='#fbf7ee';
  const skinLuma=([1,3,5].reduce((sum,i)=>sum+parseInt(skin.slice(i,i+2),16),0))/3;
  const skinShade=tint(skin,'#5a393a',.16),skinLit=tint(skin,'#fff9ef',.24),
    skinInk=skinLuma>155?tint(skin,'#654c4c',.68):tint(skin,'#f7c9b3',.68),
    hairShade=tint(hair,'#211d26',.23),hairHighlight=tint(hair,'#fffaf1',.18),
    hairContour=tint(hair,'#17151c',.39),coatShade=tint(coat,'#111319',.32),coatLit=tint(coat,'#eee8e1',.24),
    sclera='#fbf9f3',eyeContour='#35343a',browTint=tint(hair,'#3c3030',.55);
  const id='gr'+code.slice(3);
  const hasHair=a.hairBack!==0||a.bangs!==0||a.sides!==0;
  const face=faceShapes[a.face];
  const p=[`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="430" viewBox="0 0 240 320" aria-hidden="true">`,
    `<rect width="240" height="320" fill="${background}"/>`];

  // Hair at the back is drawn before the neck and skin silhouette.
  p.push(`<g id="avatar-back-hair">${svgPath(backStyles[a.hairBack],hair,`stroke="${hairContour}" stroke-width=".65" stroke-linejoin="round"`)}</g>`);
  if(a.hairBack===3||a.hairBack===2||a.hairBack===9){
    p.push(inkLine('M59 187 Q54 235 60 276 M180 188 Q187 231 177 276',hairShade,1,'opacity=".34"'));
  }
  p.push(svgPath('M103 221 L137 221 L143 260 Q121 276 97 259Z',skin));
  p.push(svgPath('M135 222 L144 258 Q130 269 118 264 Q131 250 128 224Z',skinShade,'opacity=".55"'));
  p.push(svgPath('M21 320 Q24 285 63 263 L101 245 Q120 259 139 245 L176 263 Q216 284 219 320Z',coat));
  p.push(svgPath('M171 263 Q206 280 219 320 L165 320 Q183 294 171 263Z',coatShade,'opacity=".42"'));
  p.push(inkLine('M38 301 Q45 280 70 270',coatLit,1.1,'opacity=".55"'));
  p.push(inkLine('M201 301 Q193 279 171 270',coatShade,1.2,'opacity=".6"'));

  // Eight outfit silhouettes are complete designs, not recolored X patterns.
  if(a.outfit===0){
    p.push(svgPath('M99 245 L120 264 L141 245 L137 285 L121 306 L103 284Z',coatShade));
    p.push(svgPath('M87 250 L113 278 L101 320 L69 265Z M153 250 L127 278 L139 320 L171 265Z',coatShade));
    p.push(inkLine('M76 262 L111 295 M164 262 L130 295',coatLit,1.2,'opacity=".75"'));
    p.push('<circle cx="121" cy="302" r="2" fill="'+coatLit+'"/>');
  }
  if(a.outfit===1){
    p.push(svgPath('M96 247 L120 266 L144 247 L134 265 L120 279 L106 265Z',coatLit));
    p.push(inkLine('M82 261 Q100 274 120 289 Q140 274 158 261',coatShade,1.5));
    p.push(inkLine('M95 292 L87 320 M145 292 L154 320',coatLit,1.3,'opacity=".65"'));
  }
  if(a.outfit===2){
    p.push(svgPath('M84 254 Q100 242 106 247 L120 269 L134 247 Q147 241 157 254 L147 298 L121 311 L93 298Z',coatShade));
    p.push(svgPath('M104 244 L120 271 L136 244 L132 280 L120 289 L108 280Z',coatLit));
    p.push(inkLine('M91 259 L99 294 M149 259 L142 294',coatLit,1.2));
  }
  if(a.outfit===3){
    const steel=tint(coat,'#c7c4c1',.65);
    p.push(svgPath('M35 280 Q55 259 77 261 L95 281 L82 315 L30 319Z M205 280 Q185 259 163 261 L145 281 L158 315 L210 319Z',steel));
    p.push(svgPath('M80 275 L110 265 L120 287 L130 265 L160 275 L151 320 L89 320Z',coatShade));
    p.push(inkLine('M48 278 Q66 270 81 284 M192 278 Q174 270 159 284',ink,1.3));
    p.push(inkLine('M100 286 L118 297 L138 286',steel,1.3));
  }
  if(a.outfit===4){
    p.push(svgPath('M79 254 Q118 275 161 254 Q200 269 221 320 L19 320 Q41 269 79 254Z',coatShade,'opacity=".72"'));
    p.push(svgPath('M81 254 Q115 278 159 255 Q142 278 120 285 Q99 279 81 254Z',coatLit));
    p.push('<circle cx="120" cy="273" r="4" fill="'+tint(coat,'#b6a28e',.66)+'"/>');
    p.push(inkLine('M70 273 L49 320 M170 273 L193 320',coatLit,1,'opacity=".52"'));
  }
  if(a.outfit===5){
    p.push(svgPath('M96 248 L120 279 L144 248 L145 274 L122 312 L94 274Z',cream));
    p.push(svgPath('M84 250 L113 285 L101 320 L72 271Z M156 250 L127 285 L139 320 L169 271Z',coatShade));
    p.push(svgPath('M117 284 L123 284 L127 320 L114 320Z',coatShade));
    p.push(inkLine('M80 258 L106 290 M160 258 L134 290',coatLit,1.25));
  }
  if(a.outfit===6){
    // A wrapped cowl with a soft hanging fold; no abrupt dark rectangle.
    p.push(svgPath('M85 249 Q105 264 123 261 Q146 261 155 249 Q158 260 151 269 Q136 279 119 278 Q101 277 89 267Z',coatLit));
    p.push(svgPath('M125 263 Q142 261 153 252 Q158 265 149 280 Q143 292 141 306 Q133 296 133 284 Q137 274 125 263Z',coatShade,'opacity=".65"'));
    p.push(inkLine('M94 266 Q120 278 150 265',coatShade,1.05,'opacity=".42"'));
  }
  if(a.outfit===7){
    p.push(svgPath('M105 246 L120 270 L135 246 L128 284 L120 297 L112 284Z',coatShade));
    p.push(inkLine('M75 264 Q101 278 105 302 M165 264 Q139 278 135 302',coatLit,1.1,'opacity=".58"'));
  }

  // Narrow ears are integrated with the cheekline, not big protruding discs.
  p.push(`<ellipse cx="64" cy="175" rx="8" ry="13" fill="${skin}"/><ellipse cx="176" cy="175" rx="8" ry="13" fill="${skin}"/>`);
  p.push(inkLine('M61 172 Q57 180 65 185 M179 172 Q183 180 175 185',skinShade,1.2,'opacity=".72"'));
  p.push(`<defs><clipPath id="${id}Face">${svgPath(face,'white')}</clipPath></defs>`);
  p.push(svgPath(face,skin));
  p.push(`<g clip-path="url(#${id}Face)">`);
  // Delicate cheek planes; avoid the broad angular wedge down the entire face.
  p.push(svgPath('M157 128 C172 148 174 179 165 207 C159 221 146 235 129 244 C149 224 157 201 157 181Z',skinShade,'opacity=".23"'));
  p.push(svgPath('M69 142 C74 126 83 118 88 119 C79 143 77 172 75 187 C70 182 68 164 69 142Z',skinLit,'opacity=".28"'));
  p.push(svgPath('M87 226 Q105 240 120 242 Q142 238 153 226 Q145 247 120 250 Q96 245 87 226Z',skinShade,'opacity=".11"'));
  p.push('</g>');

  // Brows have their own gestures and are not a single recolored straight bar.
  if(browShapes[a.brows])for(const x of [92,148])p.push(`<g transform="translate(${x} 150) scale(.86 .86)">${inkLine(browShapes[a.brows],browTint,2.35)}</g>`);

  for(const x of [92,148]){
    p.push(`<g id="avatar-eye-${x}" transform="translate(${x} 174) scale(.88 .91)">`);
    if(a.eyes===7){
      p.push(inkLine('M-17 -1 Q0 7 17 -1',eyeContour,2.15));
      p.push(inkLine('M-10 4 Q1 7 12 3',skinShade,.8,'opacity=".55"'));
    }else{
      const shape=eyeShapes[a.eyes],eid=`${id}eye${x}`;
      p.push(`<defs><clipPath id="${eid}">${svgPath(shape,'white')}</clipPath></defs>`);
      // A single upper lid defines the eye. A second thick outline made
      // lashes look like overlapping marker strokes at portrait size.
      p.push(svgPath(shape,sclera));
      p.push(`<g clip-path="url(#${eid})">`);
      const radius=Math.min([7,9.4,5,7,6.7,8.3][a.iris]||7,[8,10,6.5,7,4,10,3.5][a.eyes]);
      const pupilY=a.eyes===4?0:1;
      p.push(svgPath('M-20 -11 Q0 -14 20 -10 L20 -1 Q0 -3 -20 0Z',tint(skin,'#6c6266',.45),'opacity=".23"'));
      if(a.iris===3){p.push(`<ellipse cx="0" cy="${pupilY}" rx="${radius*.60}" ry="${radius+1}" fill="${iris}"/>`);}
      else p.push(`<circle cx="0" cy="${pupilY}" r="${radius}" fill="${iris}"/>`);
      p.push(`<circle cx="0" cy="${pupilY}" r="${Math.max(2.5,radius-1.5)}" fill="none" stroke="${tint(iris,'#282129',.45)}" stroke-width=".9"/>`);
      p.push(`<ellipse cx="0" cy="${pupilY+1}" rx="${a.iris===3?1.5:2.7}" ry="${Math.min(radius*.7,4.7)}" fill="${dark}"/>`);
      if(a.iris!==5){p.push('<circle cx="-2.6" cy="-3.1" r="2.4" fill="#fffdfa"/>');p.push('<circle cx="3.8" cy="4.1" r=".85" fill="#fffaf6" opacity=".75"/>');}
      p.push('</g>');
      p.push(inkLine('M-19 0 Q-6 -13 19 -3',eyeContour,a.eyes===5?2.3:1.9));
      p.push(inkLine('M-15 6 Q1 11 14 5',skinShade,.75,'opacity=".27"'));
      if(a.eyes===3||a.eyes===5)p.push(inkLine('M-17 0 l-4 -4',eyeContour,1.4));
    }
    p.push('</g>');
  }

  const noses=['M119 190 q-3 6 2 7','M120 196 l2 0','M119 191 q-5 7 3 7','M119 187 q-3 8 2 10',''][a.nose];
  if(noses)p.push(inkLine(noses,skinInk,1.55));
  if(a.nose===3)p.push(inkLine('M123 198 l2 -1',skinShade,1));
  const mouths=[
    'M113 216 Q120 218 127 216', 'M113 215 Q120 221 127 215',
    'M111 212 Q120 228 129 212', 'M115 219 Q120 215 125 219',
    'M114 215 Q119 209 126 215 Q121 222 114 215Z',
    'M111 214 Q120 226 129 214 M114 218 L126 218',
    'M113 220 L127 220', 'M113 225 Q120 215 127 225'
  ];
  p.push(a.mouth===4?svgPath(mouths[a.mouth],skinInk):inkLine(mouths[a.mouth],skinInk,1.6));
  if(a.mouth===1||a.mouth===2)p.push(inkLine('M115 226 Q120 228 125 226',skinLit,.95,'opacity=".7"'));
  if(a.extras===1){
    const freck=tint(skin,'#593b3b',.52);
    for(const [x,y] of [[80,194],[86,198],[92,193],[149,194],[155,199],[161,194]])p.push(`<circle cx="${x}" cy="${y}" r="1.5" fill="${freck}" opacity=".74"/>`);
  }
  if(a.extras===2)p.push('<ellipse cx="84" cy="201" rx="13" ry="5" fill="#d38b8e" opacity=".38"/><ellipse cx="156" cy="201" rx="13" ry="5" fill="#d38b8e" opacity=".38"/>');
  if(a.extras===3)p.push(inkLine('M155 194 l12 11 M159 201 l7 -4',tint(skin,'#9a4147',.70),1.9));
  if(a.extras===4)p.push('<circle cx="152" cy="212" r="2.1" fill="'+skinInk+'"/>');

  // The scalp is one continuous, softly rounded mass. No visible construction
  // line between the crown and the separately selected fringe pieces.
  if(hasHair){
    const scalp='M60 143 C54 118 61 92 81 75 C103 56 137 58 159 73 C181 87 188 111 181 142 C175 145 172 130 163 123 C147 112 138 117 127 122 C108 130 96 123 84 117 C74 127 70 139 60 143Z';
    p.push(`<defs><clipPath id="${id}Scalp">${svgPath(scalp,'white')}</clipPath></defs>`);
    // Never stroke the hidden lower edge of the scalp: a continuous outline
    // there makes every hairstyle resemble a helmet sitting on the forehead.
    p.push(svgPath(scalp,hair));
    p.push(`<g clip-path="url(#${id}Scalp)">`);
    p.push(svgPath('M150 69 C174 84 184 105 182 131 C171 118 171 93 150 69Z',hairShade,'opacity=".20"'));
    p.push(inkLine('M78 95 Q94 78 122 76',hairHighlight,2.2,'opacity=".48"'));
    p.push('</g>');
  }

  const fringe=fringeStyles[a.bangs];
  p.push(`<g id="avatar-fringe">`);
  if(fringe){
    p.push(`<defs><clipPath id="${id}Fringe">${svgPath(fringe,'white')}</clipPath></defs>`);
    p.push(svgPath(fringe,hair));
    p.push(`<g clip-path="url(#${id}Fringe)">`);
    p.push(svgPath('M126 92 Q178 98 185 153 L141 157 Q145 116 126 92Z',hairShade,'opacity=".20"'));
    p.push(inkLine(fringeTexture[a.bangs],hairHighlight,1.15,'opacity=".46"'));
    p.push('</g>');
  }
  p.push('</g>');

  const side=sideStyles[a.sides];
  p.push('<g id="avatar-side-hair">');
  if(side){
    p.push(svgPath(side,hair));
    if(a.sides===2||a.sides===4||a.sides===5)p.push(inkLine('M65 151 Q66 179 60 209 M175 151 Q174 179 181 209',hairHighlight,1,'opacity=".35"'));
    if(a.sides===3||a.sides===6)p.push(inkLine('M65 156 Q69 165 65 175 M175 156 Q171 165 175 175',hairShade,1.05,'opacity=".35"'));
  }
  p.push('</g>');

  // Accessories are drawn last, so eyewear and earrings do not disappear
  // behind a new hairstyle. The strap remains deliberately thin.
  if(a.extras===5){
    // The strap disappears beneath the hair at the temple, while the soft
    // oval patch follows the actual eye position.
    p.push(inkLine('M136 169 Q113 157 93 158',tint(skin,'#303034',.72),1.4,'opacity=".72"'));
    p.push(svgPath('M135 165 C142 159 158 159 165 167 C169 173 166 183 160 187 C150 191 138 188 134 182 C131 177 132 170 135 165Z',dark,`stroke="${coatLit}" stroke-width=".9"`));
    p.push(inkLine('M139 167 Q150 163 160 169',coatLit,.7,'opacity=".42"'));
  }
  if(a.extras===6){
    p.push(svgPath('M72 165 Q89 160 110 165 L108 181 Q90 188 74 181Z M130 165 Q150 160 168 165 L166 181 Q149 188 132 181Z','none',`stroke="${eyeContour}" stroke-width="1.9" stroke-linejoin="round"`));
    p.push(inkLine('M110 167 Q120 163 130 167',eyeContour,2));
    p.push(inkLine('M72 168 L65 165 M168 168 L175 165',eyeContour,1.65));
  }
  if(a.extras===7){
    p.push('<circle cx="64" cy="188" r="3.2" fill="none" stroke="#bfa06f" stroke-width="2"/>');
    p.push('<circle cx="176" cy="188" r="3.2" fill="none" stroke="#bfa06f" stroke-width="2"/>');
  }
  p.push('</svg>');
  return p.join('');
}
