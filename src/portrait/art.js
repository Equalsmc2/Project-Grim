// Project Grim portrait painter.
//
// A portrait is a 16-character recipe code ("v1-" + 16 base-36 digits), the
// same format the 1.5.8 avatar studio used and that the Firebase rules accept
// from players. Each digit now packs two features (mixed radix), so the code
// carries fantasy ancestry features — pointed and long ears, horns, tusks,
// beards, hoods, glowing eyes, unusual skin — without changing its format.
// Old codes decode to the base variant of every feature.
import { spline, sym } from './geometry.js';

export const PORTRAIT_VERSION = 7;

// ------------------------------------------------------------ palettes
export const PALETTES = {
  skin: [['Porcelain', '#f3d9bd'], ['Fair', '#e8c3a1'], ['Warm', '#d9a87f'], ['Olive', '#bd906a'], ['Brown', '#946446'], ['Deep', '#6e4632'], ['Umber', '#4f3226'], ['Slate', '#a9a7a6'],
    ['Ashen', '#8c8984'], ['Orc green', '#7c8f5a'], ['Goblin green', '#9aa65a'], ['Sea blue', '#6f8fa6'], ['Lavender', '#9b8ab0'], ['Infernal', '#a5533f']],
  hairColor: [['Black', '#28292c'], ['Charcoal', '#48474a'], ['Brown', '#664736'], ['Chestnut', '#9a6042'], ['Copper', '#bb704d'], ['Gold', '#d9b45e'], ['Blond', '#e8d39a'], ['White', '#ece8e3'], ['Silver', '#a4a5ae'], ['Rose', '#ba7d83'], ['Blue', '#657f9c'], ['Violet', '#8b7c9f'],
    ['Crimson', '#8e2f2f'], ['Ember', '#c25a2a'], ['Moss', '#556b3a'], ['Ash blond', '#b5ab92'], ['Raven', '#1c2230'], ['Bone', '#d9d2c3']],
  eyeColor: [['Dark', '#3a302b'], ['Brown', '#7a5039'], ['Amber', '#c28a47'], ['Hazel', '#7a8656'], ['Green', '#4b8069'], ['Blue', '#5383a9'], ['Gray', '#848d92'], ['Violet', '#8d76a6'],
    ['Blood', '#b8352a'], ['Gold', '#d6a43a'], ['Ice', '#a9d3ea'], ['Pale', '#d9d4ca']],
  backdrop: [['Paper', '#cfc7b7'], ['White', '#e6e2da'], ['Fog', '#a9a8a4'], ['Night', '#34343a'], ['Sand', '#b9a68a'], ['Mist', '#9fb0b0'],
    ['Ember', '#6a2f1c'], ['Crypt', '#232a3a'], ['Moss', '#2f3a28'], ['Wine', '#4a1f28'], ['Storm', '#38424f'], ['Abyss', '#141418']],
  outfitColor: [['Ink', '#292b30'], ['Ash', '#696970'], ['Ivory', '#d9d4c7'], ['Brown', '#7c6254'], ['Wine', '#914d55'], ['Forest', '#587163'], ['Navy', '#576980'], ['Ochre', '#bf9b56'],
    ['Crimson', '#7a2a2a'], ['Teal', '#2f5d5a'], ['Plum', '#4e3550'], ['Bone', '#cfc6b4']],
  metal: [['Iron', '#8d9196'], ['Brass', '#c39a52'], ['Silver', '#d4d6da']],
};

/** Features: [key, label, options|palette]. Order defines the maker's tabs. */
export const FEATURES = {
  hair: ['Hair', ['Shaved', 'Short bob', 'Long straight', 'Long waves', 'Shag', 'Ponytail', 'Twin tails', 'Braid', 'Cropped', 'Shoulder length']],
  horns: ['Horns', ['None', 'Swept horns', 'Ram horns']],
  fringe: ['Fringe', ['Hairline', 'Soft sweep', 'Straight', 'Curtain', 'Side swept', 'Choppy', 'Spikes', 'Long fringe', 'Curls', 'Asymmetric']],
  headwear: ['Headwear', ['None', 'Hood', 'Circlet']],
  sides: ['Side locks', ['None', 'Short', 'Long', 'Curled', 'Asymmetric', 'Framing', 'Braided', 'Wisps']],
  earring: ['Earrings', ['None', 'Studs', 'Hoops', 'Drops']],
  hairColor: ['Hair colour', 'hairColor'],
  eyes: ['Eye shape', ['Almond', 'Round', 'Soft', 'Sharp', 'Sleepy', 'Bright', 'Narrow', 'Closed']],
  eyeGlow: ['Eye magic', ['None', 'Glowing', 'Milky', 'Mismatched']],
  iris: ['Iris', ['Classic', 'Large', 'Small', 'Slit', 'Shimmer', 'Open']],
  eyeColor: ['Eye colour', 'eyeColor'],
  brows: ['Brows', ['Natural', 'Straight', 'Raised', 'Determined', 'Soft', 'None', 'Arched', 'Short']],
  face: ['Face shape', ['Oval', 'Round', 'Square', 'Pointed']],
  ears: ['Ears', ['Human', 'Half-elf', 'Elf', 'Long elf', 'Goblin', 'Feline', 'Broad']],
  skin: ['Skin', 'skin'],
  nose: ['Nose', ['Small', 'Button', 'Curved', 'Strong', 'Flat']],
  beard: ['Beard', ['None', 'Stubble', 'Moustache', 'Goatee', 'Full beard', 'Braided beard']],
  mouth: ['Mouth', ['Neutral', 'Small smile', 'Big smile', 'Pout', 'Open', 'Grin', 'Serious', 'Frown']],
  tusks: ['Fangs & tusks', ['None', 'Fangs', 'Tusks', 'Great tusks']],
  marks: ['Marks', ['None', 'Freckles', 'Blush', 'Scar', 'Beauty mark', 'Eyepatch', 'Glasses', 'Earring']],
  paint: ['Paint', ['None', 'War paint', 'Tattoo', 'Runes']],
  backdrop: ['Backdrop', 'backdrop'],
  aura: ['Aura', ['None', 'Arcane circle', 'Embers']],
  outfit: ['Outfit', ['Travel coat', 'Tunic', 'High collar', 'Armor', 'Cloak', 'Scholar', 'Scarf', 'Simple']],
  trim: ['Trim', ['None', 'Fur collar', 'Gilded edge', 'Strap']],
  outfitColor: ['Outfit colour', 'outfitColor'],
  metal: ['Metal', 'metal'],
};
export const GROUPS = [
  { id: 'lineage', label: 'Lineage', keys: ['skin', 'ears', 'horns', 'tusks', 'face'] },
  { id: 'eyes', label: 'Eyes', keys: ['eyes', 'eyeColor', 'eyeGlow', 'iris', 'brows'] },
  { id: 'hair', label: 'Hair', keys: ['hair', 'fringe', 'sides', 'hairColor', 'beard'] },
  { id: 'face', label: 'Face', keys: ['nose', 'mouth', 'marks', 'paint'] },
  { id: 'attire', label: 'Attire', keys: ['outfit', 'outfitColor', 'trim', 'metal', 'headwear', 'earring'] },
  { id: 'scene', label: 'Backdrop', keys: ['backdrop', 'aura'] },
];
export const optionCount = (key) => { const o = FEATURES[key][1]; return Array.isArray(o) ? o.length : PALETTES[o].length; };
export const optionLabels = (key) => { const o = FEATURES[key][1]; return Array.isArray(o) ? o : PALETTES[o].map((p) => p[0]); };

// Digit packing: [low feature, low radix, high feature]
const DIGITS = [
  ['hair', 10, 'horns'], ['fringe', 10, 'headwear'], ['sides', 8, 'earring'], ['hairColor', 18, null],
  ['eyes', 8, 'eyeGlow'], ['iris', 6, null], ['eyeColor', 12, null], ['brows', 8, null],
  ['face', 4, 'ears'], ['skin', 14, null], ['nose', 5, 'beard'], ['mouth', 8, 'tusks'],
  ['marks', 8, 'paint'], ['backdrop', 12, 'aura'], ['outfit', 8, 'trim'], ['outfitColor', 12, 'metal'],
];
export const DEFAULT_RECIPE = { hair: 2, horns: 0, fringe: 1, headwear: 0, sides: 1, earring: 0, hairColor: 2, eyes: 0, eyeGlow: 0, iris: 0, eyeColor: 0, brows: 0, face: 0, ears: 0, skin: 1, nose: 0, beard: 0, mouth: 1, tusks: 0, marks: 0, paint: 0, backdrop: 3, aura: 0, outfit: 0, trim: 0, outfitColor: 0, metal: 0 };

export const isCode = (v) => typeof v === 'string' && /^v1-[0-9a-z]{16}$/.test(v);
export function decode(code) {
  const r = { ...DEFAULT_RECIPE };
  if (!isCode(code)) return r;
  DIGITS.forEach(([lo, radix, hi], i) => {
    const d = parseInt(code.charAt(3 + i), 36);
    r[lo] = (d % radix) % optionCount(lo);
    if (hi) r[hi] = Math.floor(d / radix) % optionCount(hi);
  });
  return r;
}
export function encode(recipe) {
  const r = { ...DEFAULT_RECIPE, ...recipe };
  return 'v1-' + DIGITS.map(([lo, radix, hi]) => {
    const v = (Math.max(0, Math.min(optionCount(lo) - 1, r[lo] | 0))) + (hi ? Math.max(0, Math.min(optionCount(hi) - 1, r[hi] | 0)) * radix : 0);
    return Math.min(35, v).toString(36);
  }).join('');
}
export function randomRecipe(rand = Math.random, lock = {}) {
  const r = {};
  for (const k of Object.keys(FEATURES)) r[k] = Math.floor(rand() * optionCount(k));
  // Keep the exotic options occasional so random faces stay plausible.
  if (rand() < 0.7) r.horns = 0;
  if (rand() < 0.65) r.tusks = 0;
  if (rand() < 0.6) r.eyeGlow = 0;
  if (rand() < 0.55) r.paint = 0;
  if (rand() < 0.6) r.beard = 0;
  if (rand() < 0.55) r.ears = Math.floor(rand() * 3);
  if (rand() < 0.7) r.skin = Math.floor(rand() * 8);
  if (rand() < 0.75) r.headwear = 0;
  if (rand() < 0.5) r.marks = 0;
  return { ...r, ...lock };
}

// ------------------------------------------------------------ colour helpers
const hex2 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (rgb) => '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const shade = (h, k) => { const c = hex2(h); return toHex(k >= 0 ? c.map((v) => v + (255 - v) * k) : c.map((v) => v * (1 + k))); };
export const mix = (a, b, t) => { const x = hex2(a), y = hex2(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
const pal = (name, i) => PALETTES[name][i % PALETTES[name].length][1];

// ------------------------------------------------------------ shapes
const FACES = [
  [[0, 60], [34, 66], [46, 92], [47, 118], [43, 145], [33, 166], [16, 180], [0, 184]],
  [[0, 60], [38, 66], [50, 95], [51, 122], [47, 148], [36, 168], [18, 180], [0, 183]],
  [[0, 60], [38, 65], [48, 92], [49, 121], [48, 148], [41, 170], [21, 180], [0, 182]],
  [[0, 60], [35, 67], [46, 92], [46, 116], [39, 144], [26, 166], [10, 182], [0, 188]],
];
const EYE_SHAPES = [
  { w: 13, up: 8, down: 4, tilt: -2 }, { w: 12, up: 9.5, down: 6, tilt: 0 }, { w: 12.5, up: 8, down: 5.5, tilt: 1 },
  { w: 13.5, up: 6.5, down: 3, tilt: -4 }, { w: 13, up: 5, down: 4, tilt: 1 }, { w: 12.5, up: 10, down: 6.5, tilt: -1 },
  { w: 13.5, up: 4.5, down: 2.5, tilt: -2 }, { w: 12.5, up: 0, down: 0, tilt: 0 },
];

let uidSeq = 0;

/** Returns an SVG string. `recipe` may be a code or a decoded object. */
export function renderSvg(input, { size = 256, frame = false, lite = false } = {}) {
  const r = typeof input === 'string' ? decode(input) : { ...DEFAULT_RECIPE, ...input };
  const id = `gp${(uidSeq = (uidSeq + 1) % 1e6)}`;
  const skin = pal('skin', r.skin), hair = pal('hairColor', r.hairColor), eyeC = pal('eyeColor', r.eyeColor);
  const back = pal('backdrop', r.backdrop), cloth = pal('outfitColor', r.outfitColor), metal = pal('metal', r.metal);
  const skinDark = shade(skin, -0.32), skinLight = shade(skin, 0.18), hairDark = shade(hair, -0.45), hairLight = shade(hair, 0.35);
  const ink = mix(hairDark, '#120f0d', 0.55);
  const parts = [];
  const add = (s) => parts.push(s);
  const facePath = sym(FACES[r.face]);

  // ---------- defs
  const defs = `
  <radialGradient id="${id}bg" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="${shade(back, 0.22)}"/><stop offset=".55" stop-color="${back}"/><stop offset="1" stop-color="${shade(back, -0.62)}"/></radialGradient>
  <radialGradient id="${id}skin" cx="40%" cy="38%" r="70%"><stop offset="0" stop-color="${skinLight}"/><stop offset=".55" stop-color="${skin}"/><stop offset="1" stop-color="${shade(skin, -0.22)}"/></radialGradient>
  <linearGradient id="${id}neck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(skin, -0.42)}"/><stop offset=".45" stop-color="${shade(skin, -0.12)}"/><stop offset="1" stop-color="${skin}"/></linearGradient>
  <linearGradient id="${id}hair" x1=".2" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="${hairLight}"/><stop offset=".35" stop-color="${hair}"/><stop offset="1" stop-color="${hairDark}"/></linearGradient>
  <linearGradient id="${id}cloth" x1=".1" y1="0" x2=".9" y2="1"><stop offset="0" stop-color="${shade(cloth, 0.15)}"/><stop offset=".5" stop-color="${cloth}"/><stop offset="1" stop-color="${shade(cloth, -0.5)}"/></linearGradient>
  <linearGradient id="${id}metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(metal, 0.45)}"/><stop offset=".45" stop-color="${metal}"/><stop offset=".55" stop-color="${shade(metal, -0.35)}"/><stop offset="1" stop-color="${shade(metal, 0.1)}"/></linearGradient>
  <radialGradient id="${id}iris" cx="50%" cy="62%" r="60%"><stop offset="0" stop-color="${shade(eyeC, 0.35)}"/><stop offset=".7" stop-color="${eyeC}"/><stop offset="1" stop-color="${shade(eyeC, -0.55)}"/></radialGradient>
  <radialGradient id="${id}iris2" cx="50%" cy="62%" r="60%"><stop offset="0" stop-color="${shade(pal('eyeColor', r.eyeColor + 5), 0.35)}"/><stop offset=".7" stop-color="${pal('eyeColor', r.eyeColor + 5)}"/><stop offset="1" stop-color="${shade(pal('eyeColor', r.eyeColor + 5), -0.55)}"/></radialGradient>
  <radialGradient id="${id}vig" cx="50%" cy="45%" r="72%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
  <linearGradient id="${id}rim" x1="0" y1="0" x2="1" y2="0"><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#ffe9cf" stop-opacity=".55"/></linearGradient>
  <linearGradient id="${id}horn" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#3b302a"/><stop offset=".6" stop-color="#8a7a66"/><stop offset="1" stop-color="#d8ccb6"/></linearGradient>
  <filter id="${id}blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
  <filter id="${id}soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.2"/></filter>
  <filter id="${id}grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${r.skin + r.hair}" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .09 0"/></filter>
  <clipPath id="${id}face"><path d="${facePath}"/></clipPath>`;

  // ---------- backdrop and aura
  add(`<rect width="256" height="256" fill="url(#${id}bg)"/>`);
  if (r.aura === 1) {
    const glow = shade(back, 0.55);
    add(`<g fill="none" stroke="${glow}" opacity=".55"><circle cx="128" cy="112" r="96" stroke-width="1.2"/><circle cx="128" cy="112" r="86" stroke-width=".7" stroke-dasharray="2 5"/><circle cx="128" cy="112" r="104" stroke-width=".6"/>${Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2; return `<line x1="${128 + Math.cos(a) * 88}" y1="${112 + Math.sin(a) * 88}" x2="${128 + Math.cos(a) * 94}" y2="${112 + Math.sin(a) * 94}" stroke-width="${i % 3 ? 0.8 : 1.6}"/>`; }).join('')}</g>`);
  } else if (r.aura === 2) {
    add(`<g filter="url(#${id}blur)" opacity=".75">${[[40, 210, 14], [212, 188, 11], [70, 60, 7], [190, 70, 8], [228, 120, 6], [30, 130, 6]].map(([x, y, s]) => `<circle cx="${x}" cy="${y}" r="${s}" fill="#ff8a3a" opacity=".7"/>`).join('')}</g>`);
    add(`<g fill="#ffc27a">${[[52, 180, 1.4], [196, 150, 1.2], [88, 40, 1], [168, 52, 1.3], [222, 210, 1.1], [24, 98, 1]].map(([x, y, s]) => `<circle cx="${x}" cy="${y}" r="${s}"/>`).join('')}</g>`);
  }

  const bgCount = parts.length;
  // ---------- back hair (behind the head)
  add(backHair(r, id, hair, hairDark));

  // ---------- body and neck
  add(`<path d="M110 160 C111 178 109 194 104 206 L152 206 C147 194 145 178 146 160 Z" fill="url(#${id}neck)"/>`);
  add(outfit(r, id, cloth, metal));

  // ---------- ears
  add(ears(r, id, skin, skinDark));

  // ---------- head
  add(`<path d="${facePath}" fill="url(#${id}skin)"/>`);
  add(`<g clip-path="url(#${id}face)">
    <ellipse cx="160" cy="132" rx="26" ry="52" fill="${skinDark}" opacity=".22" filter="url(#${id}blur)"/>
    <ellipse cx="128" cy="186" rx="40" ry="14" fill="${skinDark}" opacity=".35" filter="url(#${id}blur)"/>
    <ellipse cx="104" cy="140" rx="11" ry="7" fill="#e06a5a" opacity=".1" filter="url(#${id}blur)"/>
    <ellipse cx="152" cy="140" rx="11" ry="7" fill="#e06a5a" opacity=".08" filter="url(#${id}blur)"/>
    ${marksUnder(r, id, skin)}
  </g>`);
  add(`<path d="${facePath}" fill="none" stroke="${shade(skin, -0.5)}" stroke-width="1.1" opacity=".55"/>`);
  add(`<path d="${facePath}" fill="none" stroke="url(#${id}rim)" stroke-width="2.4"/>`);

  // ---------- features
  add(nose(r, skin));
  add(mouth(r, skin));
  add(eyes(r, id, eyeC, ink));
  add(brows(r, hairDark));
  add(beard(r, id, hair, hairDark));

  // ---------- hair over the head
  add(hairCap(r, id, hair, hairDark, hairLight));
  add(sides(r, id, hair, hairDark));
  add(fringe(r, id, hair, hairDark, hairLight));
  add(frontHair(r, id, hair, hairDark));

  // ---------- headwear, horns, accessories
  add(headwear(r, id, cloth, metal));
  add(horns(r, id));
  add(accessories(r, id, metal, ink));

  // Frame the bust a little closer than the drawing grid.
  const figure = parts.splice(bgCount).join('');
  add(`<g transform="translate(128 136) scale(1.13) translate(-128 -128)">${figure}</g>`);
  // ---------- finish: vignette, grain
  add(`<rect width="256" height="256" fill="url(#${id}vig)"/>`);
  if (!lite) add(`<rect width="256" height="256" filter="url(#${id}grain)" style="mix-blend-mode:overlay"/>`);
  if (frame) add(`<rect x="1" y="1" width="254" height="254" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="2"/>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="${size}" height="${size}"><defs>${defs}</defs>${parts.join('')}</svg>`;
}

// ------------------------------------------------------------ parts
function backHair(r, id, hair, hairDark) {
  const f = `fill="url(#${id}hair)" stroke="${shade(hairDark, -0.2)}" stroke-width="1"`;
  const strands = (pts) => `<path d="${spline(pts, false)}" fill="none" stroke="${hairDark}" stroke-width="1.1" opacity=".55"/>`;
  switch (r.hair) {
    case 1: return `<path d="${sym([[0, 40], [44, 46], [62, 84], [64, 130], [58, 168], [44, 178]])}" ${f}/>`;
    case 2: return `<path d="${sym([[0, 40], [46, 46], [64, 90], [68, 150], [72, 214], [66, 256], [40, 256]])}" ${f}/>${strands([[78, 120], [74, 180], [70, 240]])}${strands([[178, 120], [182, 180], [186, 240]])}`;
    case 3: return `<path d="${spline([[128, 38], [178, 48], [194, 92], [188, 128], [200, 160], [190, 196], [204, 230], [190, 256], [66, 256], [52, 230], [66, 196], [56, 160], [68, 128], [62, 92], [78, 48]])}" ${f}/>${strands([[70, 130], [62, 170], [72, 210], [62, 248]])}${strands([[186, 130], [194, 170], [184, 210], [194, 248]])}`;
    case 4: return `<path d="${spline([[128, 36], [176, 44], [196, 80], [190, 104], [200, 128], [186, 146], [194, 170], [176, 180], [170, 196], [86, 196], [80, 180], [62, 170], [70, 146], [56, 128], [66, 104], [60, 80], [80, 44]])}" ${f}/>`;
    case 5: return `<path d="${sym([[0, 40], [46, 46], [60, 84], [60, 120], [52, 140]])}" ${f}/><path d="${spline([[170, 70], [196, 84], [204, 130], [196, 182], [206, 226], [188, 210], [180, 160], [178, 110]])}" ${f}/>${strands([[192, 100], [196, 150], [198, 200]])}`;
    case 6: return `<path d="${sym([[0, 40], [46, 46], [60, 84], [60, 120], [52, 140]])}" ${f}/><path d="${spline([[180, 86], [206, 96], [214, 150], [206, 214], [196, 244], [188, 196], [186, 130]])}" ${f}/><path d="${spline([[76, 86], [50, 96], [42, 150], [50, 214], [60, 244], [68, 196], [70, 130]])}" ${f}/>`;
    case 7: return `<path d="${sym([[0, 40], [46, 46], [60, 84], [60, 120], [52, 140]])}" ${f}/>`;
    case 8: return `<path d="${sym([[0, 40], [44, 46], [56, 84], [55, 112], [48, 124]])}" ${f}/>`;
    case 9: return `<path d="${sym([[0, 40], [46, 46], [62, 88], [64, 140], [66, 196], [58, 214], [40, 206]])}" ${f}/>${strands([[72, 130], [70, 200]])}${strands([[184, 130], [186, 200]])}`;
    default: return '';
  }
}

function hairCap(r, id, hair, hairDark, hairLight) {
  if (r.hair === 0) {
    // Shaved: a faint shadow of stubble on the scalp.
    return `<path d="${spline([[80, 90], [86, 58], [128, 44], [170, 58], [176, 90], [150, 72], [106, 72]])}" fill="${hairDark}" opacity=".28"/>`;
  }
  const vol = [0, 4, 3, 6, 7, 2, 2, 2, 0, 4][r.hair];
  const outer = [[72 - vol * 0.4, 112], [70 - vol * 0.6, 86], [80 - vol * 0.4, 58], [104, 42 - vol * 0.5], [128, 38 - vol], [152, 42 - vol * 0.5], [176 + vol * 0.4, 58], [186 + vol * 0.6, 86], [184 + vol * 0.4, 112]];
  const inner = [[176, 108], [174, 86], [160, 72], [128, 68], [96, 72], [82, 86], [80, 108]];
  const d = spline([...outer, ...inner]);
  const shine = `<path d="${spline([[96, 54], [128, 46], [160, 54]], false)}" fill="none" stroke="${hairLight}" stroke-width="4" stroke-linecap="round" opacity=".35"/>`;
  const strands = [[[100, 48], [92, 70], [86, 96]], [[118, 44], [112, 62]], [[146, 44], [154, 62]], [[160, 50], [168, 72], [174, 98]]]
    .map((p) => `<path d="${spline(p, false)}" fill="none" stroke="${hairDark}" stroke-width="1" opacity=".5"/>`).join('');
  return `<path d="${d}" fill="url(#${id}hair)" stroke="${shade(hairDark, -0.2)}" stroke-width="1"/>${strands}${shine}`;
}

function fringe(r, id, hair, hairDark) {
  const f = `fill="url(#${id}hair)" stroke="${shade(hairDark, -0.2)}" stroke-width="1"`;
  if (r.headwear === 1) return '';
  switch (r.fringe) {
    case 1: return `<path d="${spline([[82, 86], [96, 64], [128, 60], [166, 70], [176, 92], [156, 82], [132, 82], [108, 92], [90, 102]])}" ${f}/>`;
    case 2: return `<path d="M80 98 C82 72 100 60 128 60 C156 60 174 72 176 98 L168 100 L160 96 L150 101 L140 97 L128 101 L116 97 L106 101 L96 97 L88 101 Z" ${f}/>`;
    case 3: return `<path d="${spline([[128, 62], [104, 66], [86, 84], [80, 112], [92, 96], [110, 82], [128, 72]])}" ${f}/><path d="${spline([[128, 62], [152, 66], [170, 84], [176, 112], [164, 96], [146, 82], [128, 72]])}" ${f}/>`;
    case 4: return `<path d="${spline([[80, 92], [94, 64], [128, 58], [166, 66], [178, 92], [166, 88], [148, 92], [126, 100], [104, 112], [88, 116]])}" ${f}/>`;
    case 5: return `<path d="M80 96 C84 70 102 60 128 60 C154 60 172 70 176 96 L170 104 L162 92 L154 106 L146 90 L136 104 L128 90 L118 106 L110 90 L100 104 L92 92 L86 104 Z" ${f}/>`;
    case 6: return `<path d="M82 84 L78 56 L96 70 L100 40 L114 62 L126 30 L136 60 L152 38 L156 66 L176 54 L174 84 C160 72 96 72 82 84 Z" ${f}/>`;
    case 7: return `<path d="${spline([[80, 94], [92, 64], [128, 58], [168, 68], [178, 92], [162, 86], [150, 98], [138, 124], [128, 132], [126, 108], [112, 92], [94, 98]])}" ${f}/>`;
    case 8: return `<g ${f}>${[[92, 82, 12], [108, 72, 12], [128, 68, 13], [148, 72, 12], [164, 82, 12]].map(([x, y, s]) => `<circle cx="${x}" cy="${y}" r="${s}"/>`).join('')}</g><g fill="none" stroke="${hairDark}" stroke-width="1" opacity=".5">${[[92, 82], [108, 72], [128, 68], [148, 72], [164, 82]].map(([x, y]) => `<path d="M${x - 5} ${y} a5 5 0 1 1 5 5"/>`).join('')}</g>`;
    case 9: return `<path d="${spline([[80, 90], [96, 62], [130, 58], [168, 68], [178, 92], [170, 98], [160, 86], [140, 80], [116, 84], [98, 108], [86, 118]])}" ${f}/><path d="${spline([[100, 84], [92, 108], [88, 128]], false)}" fill="none" stroke="${hair}" stroke-width="5" stroke-linecap="round"/>`;
    default: return '';
  }
}

function sides(r, id, hair, hairDark) {
  const f = `fill="url(#${id}hair)" stroke="${shade(hairDark, -0.2)}" stroke-width="1"`;
  if (r.hair === 0 && r.sides === 0) return '';
  const pair = (half) => `<path d="${spline(half)}" ${f}/><path d="${spline(half.map(([x, y]) => [256 - x, y]))}" ${f}/>`;
  switch (r.sides) {
    case 1: return pair([[78, 92], [86, 98], [84, 128], [80, 142], [72, 130], [72, 104]]);
    case 2: return pair([[78, 92], [88, 100], [86, 150], [84, 196], [74, 206], [70, 160], [70, 110]]);
    case 3: return pair([[78, 92], [88, 102], [84, 140], [92, 152], [84, 166], [72, 156], [70, 120]]);
    case 4: return `<path d="${spline([[78, 92], [88, 100], [86, 150], [84, 200], [74, 212], [70, 160], [70, 110]])}" ${f}/><path d="${spline([[178, 92], [170, 98], [172, 124], [180, 132], [186, 110]])}" ${f}/>`;
    case 5: return pair([[80, 90], [92, 104], [94, 140], [100, 176], [90, 190], [80, 150], [72, 110]]);
    case 6: return [74, 182].map((x) => `<g>${Array.from({ length: 6 }, (_, i) => `<ellipse cx="${x}" cy="${110 + i * 13}" rx="6.5" ry="7.5" fill="${i % 2 ? hairDark : hair}" stroke="${shade(hairDark, -0.2)}" stroke-width=".8"/>`).join('')}<circle cx="${x}" cy="${188}" r="3" fill="${shade(hair, 0.3)}"/></g>`).join('');
    case 7: return `<g fill="none" stroke="${hair}" stroke-width="2.4" stroke-linecap="round">${[[84, 96, 80, 150], [90, 98, 88, 140], [172, 96, 176, 150], [166, 98, 168, 140]].map(([a, b, c, d]) => `<path d="M${a} ${b} Q${(a + c) / 2 - 6} ${(b + d) / 2} ${c} ${d}"/>`).join('')}</g>`;
    default: return '';
  }
}

function frontHair(r, id, hair, hairDark) {
  if (r.hair !== 7) return '';
  // Braid over the left shoulder.
  const links = Array.from({ length: 7 }, (_, i) => {
    const y = 120 + i * 17, x = 78 - i * 1.5;
    return `<ellipse cx="${x}" cy="${y}" rx="${10 - i * 0.6}" ry="10" fill="url(#${id}hair)" stroke="${shade(hairDark, -0.2)}" stroke-width="1" transform="rotate(${i % 2 ? 18 : -18} ${x} ${y})"/>`;
  }).join('');
  return `${links}<path d="M64 238 l6 14 l6 -14 z" fill="${hair}" stroke="${hairDark}"/>`;
}

function ears(r, id, skin, skinDark) {
  const fill = `fill="${shade(skin, -0.05)}" stroke="${shade(skin, -0.45)}" stroke-width="1"`;
  const inner = (d) => `<path d="${d}" fill="${shade(skin, -0.28)}" opacity=".7"/>`;
  const shapes = {
    0: [[82, 112], [72, 106], [68, 122], [74, 140], [84, 142]],
    1: [[82, 108], [66, 92], [64, 120], [72, 140], [84, 142]],
    2: [[82, 108], [50, 74], [58, 112], [68, 138], [84, 142]],
    3: [[82, 106], [26, 70], [44, 106], [64, 136], [84, 142]],
    4: [[84, 104], [16, 98], [34, 118], [62, 134], [84, 144]],
    6: [[84, 110], [66, 102], [60, 124], [68, 146], [84, 148]],
  };
  if (r.ears === 5) {
    // Feline ears sit on top of the head.
    const ear = (x, s) => `<path d="M${x - 18 * s} 66 L${x - 4 * s} 18 L${x + 14 * s} 58 Z" fill="${mixHairSkin(r)}" stroke="${shade(skin, -0.45)}"/><path d="M${x - 12 * s} 60 L${x - 4 * s} 30 L${x + 8 * s} 56 Z" fill="${shade(skin, 0.1)}" opacity=".8"/>`;
    return ear(92, 1) + ear(164, -1) + `<path d="${spline(shapes[0])}" ${fill} opacity="0"/>`;
  }
  const pts = shapes[r.ears] || shapes[0];
  const left = spline(pts);
  const right = spline(pts.map(([x, y]) => [256 - x, y]));
  const inL = spline(pts.map(([x, y]) => [x + (82 - x) * 0.35, y + (125 - y) * 0.2]));
  const inR = spline(pts.map(([x, y]) => [256 - (x + (82 - x) * 0.35), y + (125 - y) * 0.2]));
  return `<path d="${left}" ${fill}/>${inner(inL)}<path d="${right}" ${fill}/>${inner(inR)}`;
}
const mixHairSkin = (r) => pal('hairColor', r.hairColor);

function eyes(r, id, eyeC, ink) {
  const s = EYE_SHAPES[r.eyes];
  const out = [];
  for (const side of [-1, 1]) {
    const cx = 128 + side * 21, cy = 124;
    const w = s.w, t = s.tilt * side * -1;
    const lx = cx - w, rx = cx + w;
    const outerY = cy + (side > 0 ? t : -t) * 0.5;
    if (r.eyes === 7) {
      out.push(`<path d="M${lx} ${cy} Q${cx} ${cy + 6} ${rx} ${cy}" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round"/>`);
      out.push(`<path d="M${side > 0 ? rx : lx} ${cy} l${side * 3} 1.5" stroke="${ink}" stroke-width="1.4"/>`);
      continue;
    }
    const upper = `M${lx} ${side < 0 ? outerY : cy} Q${cx} ${cy - s.up * 1.6} ${rx} ${side > 0 ? outerY : cy}`;
    const lens = `${upper} Q${cx} ${cy + s.down * 1.6} ${lx} ${side < 0 ? outerY : cy} Z`;
    const clip = `${id}eye${side}`;
    const irisR = [6.4, 7.4, 5, 6.4, 6.6, 6.8][r.iris];
    const milky = r.eyeGlow === 2;
    const irisFill = r.eyeGlow === 3 && side > 0 ? `url(#${id}iris2)` : `url(#${id}iris)`;
    const pupil = milky ? '' : r.iris === 3 ? `<ellipse cx="${cx}" cy="${cy + 1}" rx="1.3" ry="${irisR * 0.8}" fill="#0b0a09"/>` : `<circle cx="${cx}" cy="${cy + 1}" r="${r.iris === 5 ? 1.8 : 2.8}" fill="#0b0a09"/>`;
    out.push(`<clipPath id="${clip}"><path d="${lens}"/></clipPath>`);
    out.push(`<path d="${lens}" fill="#efe9e0"/>`);
    out.push(`<g clip-path="url(#${clip})">
      <circle cx="${cx}" cy="${cy + 1}" r="${irisR}" fill="${milky ? '#d7d4cc' : irisFill}"/>
      ${pupil}
      ${r.iris === 4 ? `<circle cx="${cx}" cy="${cy + 1}" r="${irisR * 0.7}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".8" stroke-dasharray="1.5 1.5"/>` : ''}
      <path d="${upper} L${rx} ${cy - 20} L${lx} ${cy - 20} Z" fill="#000" opacity=".22"/>
    </g>`);
    if (r.eyeGlow === 1) out.push(`<circle cx="${cx}" cy="${cy + 1}" r="${irisR + 5}" fill="${eyeC}" opacity=".55" filter="url(#${id}blur)"/><circle cx="${cx}" cy="${cy + 1}" r="${irisR * 0.6}" fill="${shade(eyeC, 0.6)}" opacity=".8"/>`);
    out.push(`<circle cx="${cx - 2.2}" cy="${cy - 1.6}" r="1.6" fill="#fff" opacity=".9"/>`);
    out.push(`<path d="${upper}" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>`);
    out.push(`<path d="M${side > 0 ? rx : lx} ${side > 0 ? outerY : outerY} l${side * 4} ${-2.2}" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>`);
    out.push(`<path d="M${lx + 3} ${cy + s.down * 1.1} Q${cx} ${cy + s.down * 1.7} ${rx - 3} ${cy + s.down * 1.1}" fill="none" stroke="${ink}" stroke-width=".8" opacity=".45"/>`);
  }
  return out.join('');
}

function brows(r, color) {
  if (r.brows === 5) return '';
  const b = [
    { lift: 0, arch: 3, w: 3.2 }, { lift: 0, arch: 0.5, w: 3.2 }, { lift: -4, arch: 4, w: 2.8 }, { lift: 2, arch: -1, w: 3.6, angry: true },
    { lift: -1, arch: 2, w: 2.2 }, null, { lift: -2, arch: 6, w: 2.8 }, { lift: 0, arch: 1, w: 3.4, short: true },
  ][r.brows];
  return [-1, 1].map((side) => {
    const inner = 128 + side * 9, outer = 128 + side * (b.short ? 26 : 33), y = 104 + b.lift;
    const innerY = y + (b.angry ? 4 : 1), outerY = y + (b.angry ? -2 : 2);
    const mid = (inner + outer) / 2;
    return `<path d="M${inner} ${innerY} Q${mid} ${y - b.arch - b.w} ${outer} ${outerY} Q${mid} ${y - b.arch + 0.5} ${inner} ${innerY + b.w} Z" fill="${color}"/>`;
  }).join('');
}

function nose(r, skin) {
  const sh = shade(skin, -0.38), hl = shade(skin, 0.3);
  switch (r.nose) {
    case 1: return `<ellipse cx="128" cy="148" rx="5" ry="3.6" fill="${sh}" opacity=".35"/><circle cx="126" cy="146" r="1.3" fill="${hl}" opacity=".7"/>`;
    case 2: return `<path d="M130 124 Q138 140 133 150 Q129 153 124 150" fill="none" stroke="${sh}" stroke-width="1.6" stroke-linecap="round"/><circle cx="127" cy="146" r="1.4" fill="${hl}" opacity=".6"/>`;
    case 3: return `<path d="M126 118 L124 142 Q122 148 126 151 L132 151 Q136 148 134 142 L132 118" fill="${sh}" opacity=".25"/><path d="M122 149 Q128 154 134 149" fill="none" stroke="${sh}" stroke-width="1.5"/><path d="M127 122 L126 144" stroke="${hl}" stroke-width="1.4" opacity=".55"/>`;
    case 4: return `<path d="M119 148 Q128 154 137 148" fill="none" stroke="${sh}" stroke-width="2"/><ellipse cx="128" cy="146" rx="9" ry="4" fill="${sh}" opacity=".2"/>`;
    default: return `<path d="M131 132 Q134 144 130 149 Q127 150 124 148" fill="none" stroke="${sh}" stroke-width="1.4" stroke-linecap="round"/><circle cx="127" cy="145" r="1.2" fill="${hl}" opacity=".6"/>`;
  }
}

function mouth(r, skin) {
  const lip = mix(skin, '#9c4a4a', 0.45), line = shade(lip, -0.5);
  const y = 163;
  const shapes = [
    `<path d="M117 ${y} Q128 ${y + 2} 139 ${y}" stroke="${line}" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M120 ${y + 2} Q128 ${y + 7} 136 ${y + 2}" fill="${lip}" opacity=".55"/>`,
    `<path d="M116 ${y - 1} Q128 ${y + 5} 140 ${y - 1}" stroke="${line}" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M121 ${y + 3} Q128 ${y + 7} 135 ${y + 3}" fill="${lip}" opacity=".5"/>`,
    `<path d="M113 ${y - 3} Q128 ${y + 12} 143 ${y - 3} Q128 ${y + 4} 113 ${y - 3} Z" fill="#3a1d1d"/><path d="M117 ${y - 1} Q128 ${y + 3} 139 ${y - 1}" stroke="#f1ece4" stroke-width="2.4" fill="none"/>`,
    `<path d="M120 ${y} Q128 ${y - 3} 136 ${y} Q128 ${y + 7} 120 ${y} Z" fill="${lip}"/><path d="M120 ${y} Q128 ${y + 1} 136 ${y}" stroke="${line}" stroke-width="1.2" fill="none"/>`,
    `<ellipse cx="128" cy="${y + 2}" rx="7" ry="5" fill="#3a1d1d"/><path d="M121 ${y + 1} Q128 ${y - 3} 135 ${y + 1}" stroke="${line}" stroke-width="1.2" fill="none"/>`,
    `<path d="M114 ${y - 2} Q128 ${y + 8} 142 ${y - 2}" stroke="${line}" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M118 ${y} L138 ${y}" stroke="#ebe5dc" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>`,
    `<path d="M116 ${y + 1} L140 ${y + 1}" stroke="${line}" stroke-width="1.8" stroke-linecap="round"/><path d="M121 ${y + 3} Q128 ${y + 6} 135 ${y + 3}" fill="${lip}" opacity=".4"/>`,
    `<path d="M117 ${y + 3} Q128 ${y - 3} 139 ${y + 3}" stroke="${line}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
  ];
  let s = shapes[r.mouth];
  if (r.tusks === 1) s += `<path d="M122 ${y + 1} l1.6 5 l1.6 -5 Z M131 ${y + 1} l1.6 5 l1.6 -5 Z" fill="#f2ede3"/>`;
  if (r.tusks >= 2) {
    const k = r.tusks === 3 ? 1.7 : 1;
    s += [-1, 1].map((sd) => `<path d="M${128 + sd * 9} ${y + 4} Q${128 + sd * (10 + 3 * k)} ${y - 6 * k} ${128 + sd * (9 + 5 * k)} ${y - 12 * k} Q${128 + sd * (13 + 1 * k)} ${y - 2} ${128 + sd * 13} ${y + 4} Z" fill="#ece3cf" stroke="#8a7d65" stroke-width=".8"/>`).join('');
  }
  return s;
}

function beard(r, id, hair, hairDark) {
  const f = `fill="url(#${id}hair)" stroke="${shade(hairDark, -0.2)}" stroke-width="1"`;
  switch (r.beard) {
    case 1: return `<path d="${sym(FACES[r.face].filter(([, y]) => y > 140).map(([x, y]) => [x, y]).concat([[0, 172]]))}" fill="${hairDark}" opacity=".22" clip-path="url(#${id}face)"/>`;
    case 2: return `<path d="M128 156 Q116 154 108 162 Q114 160 120 163 Q126 160 128 160 Q130 160 136 163 Q142 160 148 162 Q140 154 128 156 Z" ${f}/>`;
    case 3: return `<path d="M128 156 Q116 154 110 161 Q120 160 128 159 Q136 160 146 161 Q140 154 128 156 Z" ${f}/><path d="M118 172 Q128 168 138 172 Q136 192 128 198 Q120 192 118 172 Z" ${f}/>`;
    case 4: return `<path d="${spline([[82, 132], [90, 168], [108, 196], [128, 206], [148, 196], [166, 168], [174, 132], [160, 156], [146, 170], [140, 162], [128, 160], [116, 162], [110, 170], [96, 156]])}" ${f}/><path d="M120 164 Q128 170 136 164" stroke="${shade(hairDark, -0.3)}" fill="none"/>`;
    case 5: return `<path d="${spline([[84, 132], [92, 170], [110, 196], [128, 204], [146, 196], [164, 170], [172, 132], [158, 156], [146, 170], [140, 162], [128, 160], [116, 162], [110, 170], [98, 156]])}" ${f}/>${Array.from({ length: 4 }, (_, i) => `<ellipse cx="128" cy="${210 + i * 10}" rx="${7 - i}" ry="6" fill="url(#${id}hair)" stroke="${shade(hairDark, -0.2)}" stroke-width=".8"/>`).join('')}<rect x="122" y="246" width="12" height="4" rx="1" fill="#b48a4a"/>`;
    default: return '';
  }
}

function marksUnder(r, id, skin) {
  const out = [];
  const dark = shade(skin, -0.45);
  if (r.marks === 1) for (const [x, y] of [[102, 140], [107, 144], [98, 146], [111, 139], [146, 140], [151, 144], [157, 146], [143, 145], [124, 140], [133, 139]]) out.push(`<circle cx="${x}" cy="${y}" r=".9" fill="${dark}" opacity=".55"/>`);
  if (r.marks === 2) out.push(`<ellipse cx="102" cy="144" rx="11" ry="6" fill="#e0605a" opacity=".28" filter="url(#${id}soft)"/><ellipse cx="154" cy="144" rx="11" ry="6" fill="#e0605a" opacity=".28" filter="url(#${id}soft)"/>`);
  if (r.marks === 3) out.push(`<path d="M146 102 L156 146" stroke="${shade(skin, -0.3)}" stroke-width="2.4" stroke-linecap="round"/><path d="M146 102 L156 146" stroke="${shade(skin, 0.25)}" stroke-width=".8" stroke-linecap="round"/>${[110, 120, 130, 140].map((y) => `<path d="M${146 + (y - 102) * 0.23 - 3} ${y} l6 -1" stroke="${shade(skin, -0.3)}" stroke-width="1"/>`).join('')}`);
  if (r.marks === 4) out.push(`<circle cx="146" cy="156" r="1.5" fill="${dark}"/>`);
  if (r.paint === 1) out.push(`<path d="M86 128 L120 132 L118 138 L86 136 Z M170 128 L136 132 L138 138 L170 136 Z" fill="#7a1f1a" opacity=".75"/><path d="M128 150 L128 184" stroke="#7a1f1a" stroke-width="3" opacity=".6"/>`);
  if (r.paint === 2) out.push(`<g fill="none" stroke="#2a3550" stroke-width="1.4" opacity=".7"><path d="M150 108 q10 8 4 18 q-6 8 2 16"/><path d="M106 108 q-10 8 -4 18 q6 8 -2 16"/><path d="M128 66 l0 14 M122 72 l12 0"/></g>`);
  if (r.paint === 3) out.push(`<g fill="none" stroke="#8fd3ff" stroke-width="1.2" opacity=".8"><path d="M124 80 l4 -8 l4 8 z"/><path d="M98 150 l6 -4 l2 6"/><path d="M158 150 l-6 -4 l-2 6"/></g><g fill="#8fd3ff" opacity=".35" filter="url(#${id}soft)"><circle cx="128" cy="77" r="6"/></g>`);
  return out.join('');
}

function outfit(r, id, cloth, metal) {
  const base = `fill="url(#${id}cloth)" stroke="${shade(cloth, -0.6)}" stroke-width="1.2"`;
  const fold = (d) => `<path d="${d}" fill="none" stroke="${shade(cloth, -0.45)}" stroke-width="1.2" opacity=".6"/>`;
  const body = sym([[0, 202], [24, 200], [62, 212], [94, 230], [110, 256], [0, 256]]);
  const out = [`<path d="${body}" ${base}/>`];
  switch (r.outfit) {
    case 0: // Travel coat with lapels
      out.push(`<path d="M104 204 L128 246 L152 204 L162 210 L136 256 L120 256 L94 210 Z" fill="${shade(cloth, -0.35)}"/>`);
      out.push(`<path d="M104 204 L120 236 L112 256 M152 204 L136 236 L144 256" fill="none" stroke="${shade(cloth, 0.25)}" stroke-width="1.2" opacity=".7"/>`);
      out.push(`<circle cx="128" cy="240" r="2.2" fill="url(#${id}metal)"/><circle cx="128" cy="252" r="2.2" fill="url(#${id}metal)"/>`);
      break;
    case 1: // Tunic, laced
      out.push(`<path d="M106 204 Q128 222 150 204" fill="none" stroke="${shade(cloth, -0.5)}" stroke-width="2"/>`);
      out.push(`<path d="M128 214 L128 246" stroke="${shade(cloth, -0.5)}" stroke-width="1.4"/><path d="M123 220 L133 226 M133 220 L123 226 M123 232 L133 238 M133 232 L123 238" stroke="#c8b48a" stroke-width="1"/>`);
      break;
    case 2: // High collar
      out.push(`<path d="M104 176 Q128 186 152 176 L156 210 Q128 222 100 210 Z" ${base}/>`);
      out.push(fold('M110 182 L106 208 M146 182 L150 208'));
      break;
    case 3: // Armor: pauldrons and breastplate
      out.push(`<path d="M100 214 Q128 206 156 214 L160 256 L96 256 Z" fill="url(#${id}metal)" stroke="${shade(metal, -0.6)}" stroke-width="1.2"/>`);
      out.push(`<path d="M128 210 L128 256" stroke="${shade(metal, -0.5)}" stroke-width="1.2"/>`);
      for (const sd of [-1, 1]) out.push(`<path d="${spline([[128 + sd * 50, 206], [128 + sd * 86, 212], [128 + sd * 104, 236], [128 + sd * 92, 246], [128 + sd * 60, 232]])}" fill="url(#${id}metal)" stroke="${shade(metal, -0.6)}" stroke-width="1.2"/><path d="${spline([[128 + sd * 56, 222], [128 + sd * 84, 226], [128 + sd * 98, 240]], false)}" fill="none" stroke="${shade(metal, -0.5)}" stroke-width="1"/>${[0, 1, 2].map((i) => `<circle cx="${128 + sd * (62 + i * 12)}" cy="${214 + i * 4}" r="1.3" fill="${shade(metal, 0.5)}"/>`).join('')}`);
      break;
    case 4: // Cloak with clasp
      out.push(`<path d="${sym([[0, 206], [30, 198], [74, 210], [104, 238], [114, 256], [0, 256]])}" fill="${shade(cloth, -0.15)}" stroke="${shade(cloth, -0.6)}" stroke-width="1.2"/>`);
      out.push(`<path d="M108 206 Q128 238 148 206 L146 256 L110 256 Z" fill="${shade(cloth, -0.55)}"/>`);
      out.push(`<circle cx="128" cy="224" r="6.5" fill="url(#${id}metal)" stroke="${shade(metal, -0.6)}"/><circle cx="128" cy="224" r="2.6" fill="${shade(metal, -0.4)}"/>`);
      out.push(fold('M80 222 Q88 240 86 256 M176 222 Q168 240 170 256'));
      break;
    case 5: // Scholar robe with layered collar and pendant
      out.push(`<path d="M100 204 L128 230 L156 204 L166 214 L128 248 L90 214 Z" fill="${shade(cloth, 0.2)}" stroke="${shade(cloth, -0.5)}"/>`);
      out.push(`<path d="M114 206 Q128 236 142 206" fill="none" stroke="url(#${id}metal)" stroke-width="1.2"/><circle cx="128" cy="236" r="4" fill="url(#${id}metal)"/>`);
      break;
    case 6: // Scarf
      out.push(`<path d="${spline([[98, 186], [128, 196], [158, 186], [164, 204], [128, 216], [92, 204]])}" fill="${shade(cloth, 0.12)}" stroke="${shade(cloth, -0.55)}" stroke-width="1.2"/>`);
      out.push(`<path d="M140 206 L150 250 L136 252 L132 210 Z" fill="${shade(cloth, 0.05)}" stroke="${shade(cloth, -0.55)}"/>`);
      out.push(fold('M106 196 Q128 206 150 196 M108 204 Q128 212 148 204'));
      break;
    default: // Simple
      out.push(`<path d="M110 203 Q128 214 146 203" fill="none" stroke="${shade(cloth, -0.5)}" stroke-width="1.6"/>`);
  }
  if (r.trim === 1) out.push(`<path d="${spline([[70, 214], [92, 200], [128, 208], [164, 200], [186, 214], [176, 226], [150, 216], [128, 222], [106, 216], [80, 226]])}" fill="${mix(cloth, '#b8a48a', 0.6)}" stroke="${shade('#b8a48a', -0.5)}" stroke-width=".8"/>${Array.from({ length: 14 }, (_, i) => `<path d="M${76 + i * 8} ${214 + (i % 2) * 3} l2 6" stroke="${shade('#b8a48a', -0.4)}" stroke-width=".8"/>`).join('')}`);
  if (r.trim === 2) out.push(`<path d="${body}" fill="none" stroke="url(#${id}metal)" stroke-width="2.2"/>`);
  if (r.trim === 3) out.push(`<path d="M86 214 L170 256 L158 256 L80 222 Z" fill="#4a3424" stroke="#2b1e15"/><rect x="118" y="232" width="9" height="8" rx="1" fill="none" stroke="url(#${id}metal)" stroke-width="2" transform="rotate(26 122 236)"/>`);
  return out.join('');
}

function headwear(r, id, cloth, metal) {
  if (r.headwear === 1) {
    const hood = shade(cloth, -0.2);
    return `<path d="${spline([[128, 22], [178, 34], [204, 84], [206, 150], [192, 206], [164, 214], [176, 160], [174, 104], [160, 72], [128, 62], [96, 72], [82, 104], [80, 160], [92, 214], [64, 206], [50, 150], [52, 84], [78, 34]])}" fill="${hood}" stroke="${shade(cloth, -0.65)}" stroke-width="1.2"/><path d="${spline([[96, 72], [128, 62], [160, 72], [174, 104]], false)}" fill="none" stroke="${shade(cloth, -0.7)}" stroke-width="3" opacity=".6"/>`;
  }
  if (r.headwear === 2) return `<path d="M82 92 Q128 74 174 92" fill="none" stroke="url(#${id}metal)" stroke-width="3.4"/><path d="M128 80 l-5 -8 l5 -6 l5 6 z" fill="#8fc6e8" stroke="url(#${id}metal)" stroke-width="1.4"/>`;
  return '';
}

function horns(r, id) {
  if (!r.horns) return '';
  const st = `fill="url(#${id}horn)" stroke="#2b221d" stroke-width="1"`;
  if (r.horns === 1) return [-1, 1].map((s) => `<path d="M${128 + s * 26} 66 Q${128 + s * 40} 30 ${128 + s * 70} 14 Q${128 + s * 48} 40 ${128 + s * 40} 72 Z" ${st}/>`).join('');
  return [-1, 1].map((s) => `<path d="M${128 + s * 34} 70 C${128 + s * 46} 36 ${128 + s * 96} 40 ${128 + s * 90} 86 C${128 + s * 86} 112 ${128 + s * 62} 108 ${128 + s * 64} 92 C${128 + s * 74} 96 ${128 + s * 80} 82 ${128 + s * 72} 68 C${128 + s * 64} 56 ${128 + s * 52} 66 ${128 + s * 48} 78 Z" ${st}/><path d="M${128 + s * 50} 52 l${s * 6} 6 M${128 + s * 66} 48 l${s * 2} 8 M${128 + s * 80} 58 l${-s * 4} 6" stroke="#2b221d" stroke-width="1" opacity=".6"/>`).join('');
}

function accessories(r, id, metal, ink) {
  const out = [];
  if (r.marks === 5) out.push(`<path d="M76 100 L180 118" stroke="#1a1513" stroke-width="2"/><ellipse cx="149" cy="124" rx="13" ry="10" fill="#1d1816" stroke="#0e0b0a"/>`);
  if (r.marks === 6) out.push(`<g fill="none" stroke="${ink}" stroke-width="1.6"><circle cx="107" cy="125" r="11"/><circle cx="149" cy="125" r="11"/><path d="M118 124 Q128 120 138 124"/></g><g fill="#fff" opacity=".12"><circle cx="107" cy="125" r="10"/><circle cx="149" cy="125" r="10"/></g>`);
  const ring = r.marks === 7 ? 2 : r.earring;
  if (ring && r.ears !== 5 && r.headwear !== 1) {
    for (const x of [74, 182]) {
      if (ring === 1) out.push(`<circle cx="${x}" cy="142" r="2.2" fill="url(#${id}metal)"/>`);
      if (ring === 2) out.push(`<circle cx="${x}" cy="148" r="5" fill="none" stroke="url(#${id}metal)" stroke-width="1.6"/>`);
      if (ring === 3) out.push(`<path d="M${x} 142 L${x} 152" stroke="url(#${id}metal)" stroke-width="1"/><path d="M${x} 151 l-3 5 l3 5 l3 -5 z" fill="#a83a3a" stroke="url(#${id}metal)" stroke-width=".8"/>`);
    }
  }
  return out.join('');
}

// ------------------------------------------------------------ raster
/** Renders to a data URL (JPEG by default, small enough to sync). */
export function renderImage(input, { size = 384, type = 'image/jpeg', quality = 0.88 } = {}) {
  const svg = renderSvg(input, { size });
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);
      try { resolve(c.toDataURL(type, quality)); } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error('Portrait could not be drawn'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}
