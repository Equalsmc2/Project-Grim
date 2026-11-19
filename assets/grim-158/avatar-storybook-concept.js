/*
 * One-character art-direction study for Project Grim's portrait atelier.
 * Intentionally separate from the production avatar renderer. The existing
 * 16-part recipe, its version, and all saved portraits remain untouched.
 *
 * Every visible mark is authored SVG artwork (no image generation/assets).
 */
import {AVATAR_PALETTES,normalizeAvatar} from './avatar-art.js';

export const MARA_STUDY=Object.freeze({
  hairBack:5,bangs:8,sides:4,hairColor:3,
  eyes:3,iris:0,eyeColor:3,brows:3,
  face:3,skin:2,nose:3,mouth:1,
  extras:3,backdrop:4,outfit:0,outfitColor:5
});

const blend=(first,second,amount)=>'#'+[1,3,5].map(i=>{
  const a=parseInt(first.slice(i,i+2),16),b=parseInt(second.slice(i,i+2),16);
  return Math.round(a*(1-amount)+b*amount).toString(16).padStart(2,'0');
}).join('');

export function renderStorybookMaraSvg(recipe=MARA_STUDY){
  const a=normalizeAvatar(recipe);
  const skin=AVATAR_PALETTES.skin[a.skin][1],hair=AVATAR_PALETTES.hairColor[a.hairColor][1];
  const coat=AVATAR_PALETTES.outfitColor[a.outfitColor][1],eye=AVATAR_PALETTES.eyeColor[a.eyeColor][1];
  const skinLight=blend(skin,'#fff0d5',.32),skinDark=blend(skin,'#713d38',.33);
  const skinMid=blend(skin,'#a96851',.17),skinLine=blend(skin,'#29252d',.65);
  const skinLuma=[1,3,5].reduce((sum,i)=>sum+parseInt(skin.slice(i,i+2),16),0)/3;
  const skinDetail=skinLuma<125?blend(skin,'#f1c49e',.48):skinDark;
  const lipColor=skinLuma<125?blend(skin,'#dca998',.44):blend(skin,'#734443',.48);
  const hairLight=blend(hair,'#ebae83',.27),hairShade=blend(hair,'#161e2b',.43);
  const hairInk=blend(hair,'#171e26',.78),coatLight=blend(coat,'#ced7c4',.20);
  const coatDark=blend(coat,'#11151b',.44),irisLight=blend(eye,'#e7d3a6',.24);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 640" width="480" height="640" role="img" aria-label="Hand-inked fantasy portrait of Mara Voss">
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2=".91" y2="1">
      <stop stop-color="#dcd6c7"/><stop offset=".55" stop-color="#c9c8bb"/><stop offset="1" stop-color="#b4bdb5"/>
    </linearGradient>
    <linearGradient id="coat" x1="0" y1="0" x2="1" y2=".9">
      <stop stop-color="${coatLight}"/><stop offset=".48" stop-color="${coat}"/><stop offset="1" stop-color="${coatDark}"/>
    </linearGradient>
    <clipPath id="faceClip"><path d="M173 246 C181 208 217 186 268 190 C319 196 340 230 344 284 Q351 323 337 370 C328 418 302 453 266 474 Q246 486 229 470 C191 454 160 421 154 370 Q145 313 157 276Z"/></clipPath>
    <pattern id="flecks" width="43" height="51" patternUnits="userSpaceOnUse"><path d="M9 14 l2 -5 M32 33 l3 -7" stroke="#464d49" stroke-width=".7" opacity=".22"/><circle cx="18" cy="40" r=".7" fill="#59655c" opacity=".29"/></pattern>
  </defs>

  <!-- A restrained wash and scratched, uneven frame. -->
  <path fill="url(#paper)" d="M0 0H480V640H0Z"/>
  <path d="M25 66 Q119 35 173 63 Q246 44 343 68 Q401 113 424 206 Q446 323 423 459 Q412 553 454 625 L39 631 Q71 557 52 490 Q19 391 45 282 Q24 143 25 66Z" fill="#798984" opacity=".19"/>
  <path d="M28 206 Q51 119 106 96 M384 75 Q437 178 433 244 M45 478 Q31 544 17 592" stroke="#ede5d1" stroke-width="8" fill="none" opacity=".39" stroke-linecap="round"/>
  <path fill="url(#flecks)" d="M0 0H480V640H0Z"/>
  <path d="M25 29 Q233 23 458 26 M20 611 Q226 616 459 607" stroke="#424b49" stroke-width="2" opacity=".36" fill="none"/>

  <!-- The inked back silhouette and windswept hair. -->
  <path d="M159 206 C148 169 167 125 205 115 Q255 90 301 111 C344 127 359 166 354 217 Q380 268 373 321 C392 363 373 411 398 460 Q380 449 372 445 C386 480 377 498 364 517 Q352 485 345 477 C329 505 318 524 287 541 L166 536 Q139 500 135 458 Q109 432 123 390 Q102 353 126 304 Q105 244 159 206Z" fill="${hairShade}" stroke="${hairInk}" stroke-width="6" stroke-linejoin="round"/>
  <path d="M339 207 Q363 279 352 341 Q371 420 362 464 M150 284 Q125 337 148 393 Q134 448 163 493" stroke="${hairLight}" opacity=".43" stroke-width="7" stroke-linecap="round" fill="none"/>
  <path d="M366 408 C394 424 405 457 390 475 Q375 468 371 455 M145 393 C121 414 117 446 134 469" stroke="${hairInk}" stroke-width="3.4" fill="none"/>

  <!-- Coat is a real silhouette with overlapping lapels, not a flat semicircle. -->
  <path d="M36 641 C48 581 67 539 111 517 Q155 492 206 484 L281 478 Q354 482 396 530 Q436 565 451 640Z" fill="url(#coat)" stroke="#252b2c" stroke-width="7" stroke-linejoin="round"/>
  <path d="M111 518 Q76 558 76 641 L151 641 L185 504Z" fill="${coatDark}" opacity=".83"/>
  <path d="M361 510 Q412 542 425 641 L350 641 Q353 565 333 499Z" fill="${coatDark}" opacity=".73"/>
  <path d="M114 529 Q128 551 154 563 L130 592 L168 641 M365 531 Q353 554 330 572 L348 599 L318 641" stroke="#1b292a" stroke-width="5" fill="none"/>
  <path d="M122 537 Q132 553 156 565 M353 537 Q347 554 330 564" stroke="${coatLight}" stroke-width="2.3" opacity=".67" fill="none"/>
  <path d="M77 605 Q91 576 104 564 M406 599 Q395 567 384 557" stroke="#c2d0b7" stroke-width="2.5" opacity=".42" fill="none" stroke-linecap="round"/>
  <path d="M53 616 Q80 608 104 619 M370 625 Q391 613 424 620" stroke="#1a2728" stroke-width="3" fill="none" opacity=".55"/>

  <!-- Asymmetrical neck, collar and a folded, travel-worn scarf. -->
  <path d="M207 429 Q225 454 229 490 L203 525 Q251 559 302 522 L288 487 Q297 451 311 425Z" fill="${skinDark}" stroke="${skinLine}" stroke-width="4.5"/>
  <path d="M227 474 Q249 489 279 468 L288 486 Q261 503 233 503Z" fill="${skinLight}" opacity=".45"/>
  <path d="M190 491 Q221 512 247 525 Q285 512 309 489 L329 509 Q302 554 248 564 Q200 556 172 518Z" fill="#a35c4e" stroke="#302c32" stroke-width="5.5" stroke-linejoin="round"/>
  <path d="M206 503 Q235 528 260 532 Q288 522 306 506 L315 515 Q290 541 245 543 Q224 537 206 524Z" fill="#c08364"/>
  <path d="M189 516 Q228 553 267 554 Q287 554 305 546 M208 525 Q231 540 248 543" stroke="#492f34" stroke-width="3" fill="none"/>
  <path d="M294 543 Q307 570 292 597 Q280 571 274 560Z" fill="#6f4540" stroke="#382d31" stroke-width="3"/>
  <path d="M191 495 L171 513 L189 574 L213 560 M317 488 L335 519 L318 582 L296 565" fill="${coatDark}" stroke="#262e30" stroke-width="4"/>
  <path d="M178 522 L193 564 M324 519 L308 561" stroke="${coatLight}" opacity=".6" stroke-width="2.5"/>
  <path d="M163 612 l-5 15 M180 607 l-6 16 M318 605 l7 20 M332 597 l9 18" stroke="#c3b8a2" opacity=".38" stroke-width="1.5"/>

  <!-- Ear, face and organic painted planes. -->
  <path d="M341 302 Q355 280 366 300 C381 322 367 355 349 356 L335 341Z" fill="${skinMid}" stroke="${skinLine}" stroke-width="4"/>
  <path d="M351 308 Q370 310 360 331 Q353 326 349 340" stroke="${skinDetail}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M173 246 C181 208 217 186 268 190 C319 196 340 230 344 284 Q351 323 337 370 C328 418 302 453 266 474 Q246 486 229 470 C191 454 160 421 154 370 Q145 313 157 276Z" fill="${skin}" stroke="${skinLine}" stroke-width="5.4" stroke-linejoin="round"/>
  <g clip-path="url(#faceClip)">
    <path d="M303 217 Q341 247 337 317 Q346 404 281 467 L248 489 Q298 414 299 354 Q315 282 303 217Z" fill="${skinDark}" opacity=".59"/>
    <path d="M166 279 Q183 249 206 238 Q181 310 183 355 Q189 406 214 449 Q163 419 151 371Z" fill="${skinLight}" opacity=".62"/>
    <path d="M196 401 Q224 442 260 453 Q283 444 303 422 Q292 463 256 477 Q219 465 196 401Z" fill="${skinMid}" opacity=".33"/>
  <path d="M179 358 Q194 363 206 369 M326 353 Q333 358 337 369" stroke="${skinDetail}" stroke-width="2" opacity=".43" fill="none"/>
  <path d="M209 367 l3 2 M218 373 l2 1 M230 371 l2 1 M311 372 l3 2" stroke="${skinDetail}" opacity=".57" stroke-width="2.4" stroke-linecap="round"/>
  </g>

  <!-- Eyes are not mirrored: lids, gaze and brow pressure vary naturally. -->
  <path d="M183 322 C196 310 223 304 243 313 Q250 319 247 325 C230 340 203 341 184 331Z" fill="#f3e9d7" stroke="#302b31" stroke-width="3.3" stroke-linejoin="round"/>
  <path d="M276 313 Q297 300 322 305 Q333 311 332 317 Q314 329 291 329 Q278 324 276 313Z" fill="#f3e9d7" stroke="#302b31" stroke-width="3"/>
  <path d="M183 321 Q209 305 242 313 M277 312 Q303 299 329 308" stroke="#24252b" stroke-width="5" fill="none" stroke-linecap="round"/>
  <ellipse cx="219" cy="325" rx="10.5" ry="13" fill="#2e3535"/><ellipse cx="302" cy="316" rx="9" ry="11.5" fill="#293136"/>
  <ellipse cx="220" cy="324" rx="7" ry="9.4" fill="${eye}"/><ellipse cx="303" cy="315" rx="6.4" ry="8" fill="${eye}"/>
  <path d="M216 325 q4 -6 8 0 q-4 9 -8 0 M300 315 q3 -5 6 0 q-3 8 -6 0" fill="${irisLight}"/>
  <circle cx="221" cy="322" r="2.7" fill="#fff5df"/><circle cx="304" cy="313" r="2.2" fill="#fff5df"/>
  <path d="M186 331 Q214 346 241 329 M280 325 Q303 336 326 320" stroke="${skinDark}" stroke-width="1.8" opacity=".63" fill="none"/>
  <path d="M178 293 C199 280 224 279 245 286" stroke="${hairInk}" stroke-width="7" fill="none" stroke-linecap="round"/>
  <path d="M278 280 C297 268 316 269 329 277" stroke="${hairInk}" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M190 296 Q217 283 238 290 M281 284 Q300 274 321 282" stroke="${hairLight}" stroke-width="1.7" opacity=".38" fill="none"/>

  <!-- A real nose bridge, slightly crooked smile, and a worked-in old scar. -->
  <path d="M270 318 Q267 345 260 368 Q256 374 267 378 L277 378" stroke="${skinDetail}" stroke-width="3.9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M279 372 q8 4 5 10" stroke="${skinLight}" stroke-width="3" fill="none" opacity=".85"/>
  <path d="M237 413 Q253 423 269 417 Q282 414 289 407" stroke="${lipColor}" stroke-width="4.1" fill="none" stroke-linecap="round"/>
  <path d="M245 423 Q268 429 282 415" stroke="${skinLight}" stroke-width="2.5" fill="none" opacity=".68"/>
  <path d="M235 395 Q257 390 278 396" stroke="${skinDark}" opacity=".16" stroke-width="4" fill="none"/>
  <path d="M321 345 L309 360 L321 371 L314 384" stroke="#854e49" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M318 344 l-6 12 M315 368 l-3 10" stroke="${skinLight}" stroke-width="1.9" opacity=".73"/>

  <!-- The forehead is grown over by distinct tapered locks, never a helmet. -->
  <path d="M152 269 C147 229 145 198 161 165 Q178 129 218 122 Q255 111 293 123 Q337 128 354 173 Q369 212 352 267 Q345 238 332 220 Q319 232 306 240 Q303 212 291 205 Q273 232 247 244 Q226 252 209 264 Q198 270 179 269 Q172 291 159 322 Q148 297 152 269Z" fill="${hair}" stroke="${hairInk}" stroke-width="6.5" stroke-linejoin="round"/>
  <path d="M163 237 Q178 168 224 147 Q261 128 296 144 Q268 151 248 174 Q225 205 191 216 Q183 239 163 259Z" fill="${hairLight}" opacity=".47"/>
  <path d="M296 143 Q334 148 346 182 Q347 211 329 234 Q314 215 301 205 Q317 179 296 143Z" fill="${hairShade}" opacity=".73"/>
  <path d="M167 240 Q205 229 231 197 Q253 175 278 163 M207 251 Q238 241 262 216 M299 164 Q316 183 310 211" stroke="${hairInk}" stroke-width="3.6" fill="none" stroke-linecap="round" opacity=".70"/>
  <path d="M175 202 Q206 146 259 138 M220 154 Q246 137 275 141 M321 160 Q340 177 338 199" stroke="${hairLight}" stroke-width="3.3" fill="none" stroke-linecap="round" opacity=".83"/>
  <path d="M149 257 Q129 302 139 351 C142 376 129 396 115 414 Q141 415 156 396 Q180 371 173 324 Q168 296 179 262Z" fill="${hairShade}" stroke="${hairInk}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M151 286 Q139 343 153 377" stroke="${hairLight}" stroke-width="3" opacity=".50" fill="none"/>
  <path d="M345 236 C367 271 360 316 348 349 Q342 387 366 418 Q346 419 328 401 C313 376 319 351 331 325 Q343 285 327 254Z" fill="${hair}" stroke="${hairInk}" stroke-width="5.5" stroke-linejoin="round"/>
  <path d="M341 270 Q356 307 339 348 Q335 374 350 393" stroke="${hairLight}" stroke-width="3.2" opacity=".6" fill="none"/>
  <path d="M359 429 Q380 460 368 484 Q358 470 359 457" fill="${hairShade}" stroke="${hairInk}" stroke-width="3.2"/>
  <path d="M161 170 Q178 145 202 138 M351 206 Q359 224 356 244" stroke="#262d32" opacity=".39" stroke-width="2" stroke-linecap="round" fill="none"/>

  <!-- A few economical scratched marks, like dry brush on worn paper. -->
  <path d="M99 470 l24 -17 M102 484 l20 -10 M397 501 l-14 -12 M405 514 l-17 -9" stroke="#5d6f68" stroke-width="1.6" opacity=".43"/>
  <path d="M60 530 L66 515 M50 552 L57 543 M424 459 L435 453" stroke="#eee6d5" stroke-width="2" opacity=".56"/>
</svg>`;
}
