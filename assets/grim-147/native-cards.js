import * as T from './vendor/three.module.js';

// Cards live in the same WebGL scene and depth buffer as scenery. Grim 1.4.7
// keeps that real depth behavior, but restores a richer laminated-card look.
export const CARD_WIDTH_PX = 174;
export const CARD_HEIGHT_PX = 240;
export const TEXTURE_WIDTH = 696;
export const TEXTURE_HEIGHT = 960;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const clean = s => String(s ?? '');
const has2D = ctx => !!ctx && typeof ctx.fillRect === 'function';

function hashString(value=''){
  let h = 2166136261 >>> 0;
  for(let i=0;i<value.length;i++){
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed){
  let s = (seed || 1) >>> 0;
  return ()=>{
    s = Math.imul(s, 1664525) + 1013904223 | 0;
    return ((s >>> 0) / 4294967296);
  };
}
function parseConditions(list=[]){
  const lower = list.map(x => clean(x).toLowerCase());
  const burning = lower.some(x => /burn|fire|ignite|flame/.test(x));
  const frozen = lower.some(x => /frozen|freeze|frost|ice|cold/.test(x));
  return { burning, frozen };
}
function hpRatio(data){ return clamp((Number(data.hp)||0) / Math.max(1, Number(data.maxHp)||1), 0, 1); }
export function damageSeverity(ratio){return clamp((.80-clamp(ratio,0,1))/.80,0,1);}
export function shatterProgress(elapsedMs){return clamp(Number(elapsedMs)/1350,0,1);}
function damageTier(ratio){
  if(ratio <= 0) return 5;
  if(ratio < .10) return 4;
  if(ratio < .25) return 3;
  if(ratio < .50) return 2;
  if(ratio < .75) return 1;
  return 0;
}

export function cardVisualData(c, place, combat){
  const conditions = Array.isArray(c.conditions) ? c.conditions.slice(0, 4).map(clean) : [];
  const effects = parseConditions(conditions);
  const data = {
    id: clean(c.id),
    name: clean(c.name),
    className: clean(c.className),
    ancestry: clean(c.ancestry),
    portrait: clean(c.portrait),
    symbol: clean(c.symbol || '✦'),
    level: Math.max(1, Number(c.level) || 1),
    hp: Math.max(0, Number(c.hp) || 0),
    maxHp: Math.max(1, Number(c.maxHp) || 1),
    ac: Number(c.ac) || 0,
    initiative: Number(c.initiative) || 0,
    conditions,
    enemy: place.side === 'enemy',
    active: !!place.active,
    rank: Number(place.rank) || 1,
    combat: !!combat,
    burning: effects.burning,
    frozen: effects.frozen
  };
  data.hpRatio = hpRatio(data);
  data.damageTier = damageTier(data.hpRatio);
  data.damageSeverity = damageSeverity(data.hpRatio);
  data.dead = data.hp <= 0;
  return data;
}

export function cardPixelSize(viewWidth, cardScale, perspectiveDistance = 30){
  const responsive = viewWidth < 520 ? .39 : viewWidth < 800 ? .47 : viewWidth < 1100 ? .53 : .60;
  const perspective = clamp(Math.pow(30 / Math.max(perspectiveDistance, 1), .20), .92, 1.06);
  const scale = clamp(responsive * ((Number(cardScale) || .72) / .72) * perspective, .32, .76);
  return { width: CARD_WIDTH_PX * scale, height: CARD_HEIGHT_PX * scale, scale };
}

export function worldHeightForPixels(pixelHeight, viewportHeight, depth, fovDegrees){
  return Math.max(.01, 2 * Math.max(.01, depth) * Math.tan(fovDegrees * Math.PI / 360) * pixelHeight / Math.max(1, viewportHeight));
}

function rounded(ctx, x, y, w, h, r){
  const a = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + a, y);
  ctx.lineTo(x + w - a, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + a);
  ctx.lineTo(x + w, y + h - a);
  ctx.quadraticCurveTo(x + w, y + h, x + w - a, y + h);
  ctx.lineTo(x + a, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - a);
  ctx.lineTo(x, y + a);
  ctx.quadraticCurveTo(x, y, x + a, y);
  ctx.closePath();
}
function fitText(ctx, value, maxWidth, size = 16, min = 9){
  let t = clean(value);
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  while(ctx.measureText(t).width > maxWidth && size > min){ size -= .5; ctx.font = `700 ${size}px system-ui, sans-serif`; }
  if(ctx.measureText(t).width > maxWidth){ while(t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1); t += '…'; }
  return t;
}
function capsule(ctx, x, y, w, h, fill, stroke){
  rounded(ctx, x, y, w, h, Math.min(12, h/2));
  ctx.fillStyle = fill; ctx.fill();
  if(stroke){ ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}
function drawPortrait(ctx, data, portrait){
  rounded(ctx, 10, 27, 154, 112, 8);
  ctx.fillStyle = data.enemy ? '#212124' : '#171d1f';
  ctx.fill();
  ctx.save();
  rounded(ctx, 10, 27, 154, 112, 8);ctx.clip();
  if(portrait && portrait.complete && portrait.naturalWidth){
    const ratio = Math.max(154 / portrait.naturalWidth, 112 / portrait.naturalHeight);
    const pw = portrait.naturalWidth * ratio, ph = portrait.naturalHeight * ratio;
    ctx.drawImage(portrait, 10 + (154 - pw) / 2, 27 + (112 - ph) / 2, pw, ph);
  } else {
    const art = ctx.createLinearGradient(10, 27, 164, 139);
    art.addColorStop(0, data.enemy ? '#5a4f57' : '#425456');
    art.addColorStop(.55, data.enemy ? '#312b30' : '#263133');
    art.addColorStop(1, '#101214');
    ctx.fillStyle = art; ctx.fillRect(10, 27, 154, 112);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.font = '700 30px system-ui, sans-serif';
    ctx.fillText(data.symbol, 87, 81);
    ctx.font = '700 9px monospace';
    ctx.fillText(data.enemy ? 'NPC' : 'PC', 87, 117);
    ctx.textAlign = 'left';
  }
  const vignette = ctx.createLinearGradient(0, 27, 0, 139);
  vignette.addColorStop(0, 'rgba(0,0,0,.05)');
  vignette.addColorStop(.7, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,.45)');
  ctx.fillStyle = vignette; ctx.fillRect(10, 27, 154, 112);
  ctx.restore();
}
function drawStatBlock(ctx, x, y, label, value, accent='#d8dedf'){
  capsule(ctx, x, y, 48, 37, 'rgba(255,255,255,.035)', 'rgba(255,255,255,.06)');
  ctx.fillStyle = '#a7afb3';
  ctx.font = '700 8px monospace';
  ctx.fillText(label, x + 8, y + 11);
  ctx.fillStyle = accent;
  ctx.font = '700 16px system-ui, sans-serif';
  ctx.fillText(value, x + 8, y + 28);
}
// Stable fracture topology: the same cracks extend as health falls, rather
// than regenerating random patterns whenever a threshold is crossed.
function drawWearAndCracks(ctx,data){
  const severity=data.damageSeverity ?? damageSeverity(data.hpRatio);
  if(severity<=0)return;
  const rand=rng(hashString(data.id)^0x6c8e9cf5);
  const count=22, roots=[{x:17+rand()*15,y:42+rand()*48},{x:151-rand()*14,y:121+rand()*38},{x:34+rand()*100,y:193+rand()*17}];
  ctx.save();
  // Stress whitening and fine edge abrasions. The micro-scratches progressively
  // appear, but their location never changes between HP updates.
  for(let i=0;i<30;i++){
    const x=10+rand()*151,y=28+rand()*201;
    const len=3+rand()*15;
    if((i+.5)/30>severity*1.08)continue;
    ctx.fillStyle=`rgba(238,243,250,${(.055+severity*.13).toFixed(3)})`;
    ctx.fillRect(x,y,len,.65+rand()*1.1);
  }
  for(let i=0;i<count;i++){
    const root=roots[i%roots.length];
    const angle=rand()*Math.PI*2;
    const length=23+rand()*96;
    const bend=(rand()-.5)*.8;
    const reveal=clamp(severity*(1.55+rand()*.9)-i/count*.55,0,1);
    if(reveal<=0)continue;
    const ray=length*reveal;
    const x1=root.x+Math.cos(angle)*ray*.45;
    const y1=root.y+Math.sin(angle+bend)*ray*.45;
    const x2=clamp(root.x+Math.cos(angle+bend)*ray,7,167);
    const y2=clamp(root.y+Math.sin(angle)*ray,7,233);
    ctx.strokeStyle=`rgba(15,20,26,${(.21+severity*.37).toFixed(3)})`;
    ctx.lineWidth=severity>.65?2.7:1.85;
    ctx.beginPath();ctx.moveTo(root.x+.6,root.y+.7);ctx.lineTo(x1+1.1,y1+1.1);ctx.lineTo(x2+1.1,y2+1.1);ctx.stroke();
    ctx.strokeStyle=`rgba(243,250,255,${(.16+severity*.57).toFixed(3)})`;
    ctx.lineWidth=.75+severity*.72;
    ctx.beginPath();ctx.moveTo(root.x,root.y);ctx.lineTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
    if(severity>.36 && i%3===0){
      const branch=(severity-.32)*18;
      ctx.strokeStyle=`rgba(230,240,255,${(.12+severity*.37).toFixed(3)})`;
      ctx.lineWidth=.7;
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(clamp(x1+Math.cos(angle+1.2)*branch,7,167),clamp(y1+Math.sin(angle+1.2)*branch,7,233));ctx.stroke();
    }
  }
  if(severity>.56){
    const edge=ctx.createLinearGradient(0,0,174,0);
    edge.addColorStop(0,`rgba(239,245,255,${(severity-.5)*.28})`);
    edge.addColorStop(.15,'rgba(255,255,255,0)');
    edge.addColorStop(.85,'rgba(255,255,255,0)');
    edge.addColorStop(1,`rgba(239,245,255,${(severity-.5)*.28})`);
    ctx.fillStyle=edge;rounded(ctx,4,4,166,232,10);ctx.fill();
  }
  if(data.dead){
    // Broken laminate corners reveal the dark card substrate. The stats remain
    // visible even after the optional one-shot physical shard burst finishes.
    const chips=rng(hashString(data.id)^0xb71a6a0f);
    ctx.globalCompositeOperation='destination-out';
    for(let i=0;i<6;i++){
      const left=i%2===0, x=left?3:171,y=23+chips()*184,d=7+chips()*10;
      ctx.beginPath();ctx.moveTo(x,y-d);ctx.lineTo(x+(left?d:-d),y-2);ctx.lineTo(x+(left?d*.6:-d*.6),y+d);ctx.lineTo(x,y+d*1.2);ctx.closePath();ctx.fill();
    }
    ctx.globalCompositeOperation='source-over';
    ctx.strokeStyle='rgba(255,255,255,.62)';ctx.lineWidth=1.75;
    rounded(ctx,7,7,160,226,8);ctx.stroke();
  }
  ctx.restore();
}
// Flames are an edge-bound iridescent laminate treatment, not a full opaque
// screen overlay. Two warm ribbons climb the portrait while tiny embers dance.
function drawBurnEffect(ctx,data,t){
 if(!data.burning)return;
 const rand=rng(hashString(data.id)^0xf1ae3a7);
 const intensity=data.active?1.18:1;
 ctx.save();rounded(ctx,5,5,164,230,9);ctx.clip();
 const warm=ctx.createLinearGradient(0,22,174,210);
 warm.addColorStop(0,'rgba(255,170,47,.18)');
 warm.addColorStop(.38,'rgba(255,100,35,.03)');
 warm.addColorStop(.76,'rgba(255,235,110,.04)');
 warm.addColorStop(1,'rgba(255,74,21,.16)');
 ctx.fillStyle=warm;ctx.fillRect(5,5,164,230);
 for(let side=0;side<2;side++){
   const left=side===0;
   for(let i=0;i<8;i++){
     const phase=(t*.00115 + i*.29 + (left?0:.41)) % 1;
     const y=210-phase*184;
     const x=left?10+rand()*10:164-rand()*10;
     const tip=x+(left?1:-1)*(5+Math.sin(phase*13+i)*5);
     ctx.beginPath();ctx.moveTo(x,y+13);ctx.quadraticCurveTo(tip,y+2,tip+(left?3:-3),y-16-rand()*7);ctx.quadraticCurveTo(x+(left?5:-5),y-5,x,y+13);
     ctx.fillStyle=`rgba(255,${Math.round(115+phase*95)},${Math.round(32+phase*78)},${(.065+phase*.18)*intensity})`;ctx.fill();
   }
 }
 const stripe=(t*.05+hashString(data.id)%210)%260-70;
 const foil=ctx.createLinearGradient(stripe,20,stripe+56,215);
 foil.addColorStop(0,'rgba(255,70,15,0)');foil.addColorStop(.46,'rgba(255,200,77,.20)');foil.addColorStop(.52,'rgba(255,250,158,.26)');foil.addColorStop(.6,'rgba(255,112,35,.10)');foil.addColorStop(1,'rgba(255,70,15,0)');
 ctx.fillStyle=foil;ctx.fillRect(7,26,160,112);
 ctx.strokeStyle=`rgba(255,${Math.round(131+44*Math.sin(t*.005))},68,${.52*intensity})`;ctx.lineWidth=2.3;
 rounded(ctx,6,6,162,228,9);ctx.stroke();
 for(let i=0;i<12;i++){
  const y=29+((i*47+t*.031)%183),x=11+((i*71+hashString(data.id))%151);
  const r=.6+(i%3)*.42;ctx.fillStyle=`rgba(255,${160+i*6},65,${.14+(.22*(1-(y-29)/183))})`;ctx.fillRect(x,y,r,r);
 }
 ctx.restore();
}
// Frost grows from the laminate's edge, forming branched crystals and a
// pearlescent blue shine. Art remains recognizable; the data panel stays clear.
function drawFreezeEffect(ctx,data,t){
 if(!data.frozen)return;
 const rand=rng(hashString(data.id)^0x77aa33ff);
 ctx.save();rounded(ctx,5,5,164,230,9);ctx.clip();
 const icy=ctx.createLinearGradient(0,0,174,240);
 icy.addColorStop(0,'rgba(230,251,255,.42)');
 icy.addColorStop(.32,'rgba(183,223,252,.09)');
 icy.addColorStop(.73,'rgba(115,200,247,.04)');
 icy.addColorStop(1,'rgba(238,253,255,.29)');
 ctx.fillStyle=icy;ctx.fillRect(6,6,162,228);
 // Stable crystal branches grow inward from both sides of the portrait.
 for(let side=0;side<2;side++)for(let i=0;i<24;i++){
   const fromLeft=side===0;
   const x=fromLeft?7:167;
   const y=13+(i*23+rand()*27)%216;
   const len=5+rand()*22;
   const dir=fromLeft?1:-1;
   ctx.lineWidth=.5+rand()*1.1;
   ctx.strokeStyle=`rgba(219,248,255,${.19+rand()*.44})`;
   ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dir*len,y+(rand()-.5)*6);ctx.stroke();
   const branchX=x+dir*len*.55;
   ctx.beginPath();ctx.moveTo(branchX,y);ctx.lineTo(branchX+dir*len*.3,y-5-rand()*4);ctx.moveTo(branchX,y);ctx.lineTo(branchX+dir*len*.3,y+5+rand()*4);ctx.stroke();
 }
 const sparkle=(Math.sin(t*.0028)+1)*.5;
 ctx.strokeStyle=`rgba(240,252,255,${.35+sparkle*.36})`;ctx.lineWidth=2;
 rounded(ctx,6,6,162,228,9);ctx.stroke();
 const top=ctx.createLinearGradient(0,26,0,52);
 top.addColorStop(0,`rgba(248,255,255,${.48+sparkle*.13})`);
 top.addColorStop(1,'rgba(205,241,255,0)');
 ctx.fillStyle=top;ctx.fillRect(10,27,154,26);
 for(let i=0;i<13;i++){
   const x=15+(i*73)%143,y=31+(i*41)%96;
   ctx.fillStyle=`rgba(246,255,255,${(.10+sparkle*.14).toFixed(3)})`;ctx.fillRect(x,y,1.2,1.2);
 }
 ctx.restore();
}
function drawStatusLabel(ctx, text, x, y, fill, stroke, color){
  const pad = 7;
  ctx.font = '700 8px monospace';
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  capsule(ctx, x, y, w, 16, fill, stroke);
  ctx.fillStyle = color;
  ctx.fillText(text, x + pad, y + 10.6);
  return w;
}
function drawLaminateGloss(ctx, data, t){
  ctx.save();
  rounded(ctx, 4, 4, 166, 232, 11);ctx.clip();
  const sweep = (Math.sin(t * .0018 + hashString(data.id) * .00001) + 1) * .5;
  const x = -50 + sweep * 180;
  const grad = ctx.createLinearGradient(x, 0, x + 50, 240);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(.45, `rgba(255,255,255,${data.active ? .18 : .11})`);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 174, 240);
  const corner = ctx.createLinearGradient(0, 0, 174, 240);
  corner.addColorStop(0, 'rgba(255,255,255,.12)');
  corner.addColorStop(.18, 'rgba(255,255,255,0)');
  corner.addColorStop(1, 'rgba(255,255,255,.02)');
  ctx.fillStyle = corner; ctx.fillRect(4, 4, 166, 232);
  ctx.restore();
}

export function paintCard(ctx, data, portrait = null, timeMs = 0){
  const w = CARD_WIDTH_PX, h = CARD_HEIGHT_PX;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.imageSmoothingEnabled = true;

  const shell = ctx.createLinearGradient(0, 0, 0, h);
  shell.addColorStop(0, data.enemy ? '#141215' : '#111516');
  shell.addColorStop(1, data.enemy ? '#0b0b0c' : '#0c0f10');
  rounded(ctx, 2, 2, w - 4, h - 4, 9); ctx.fillStyle = shell; ctx.fill();
  ctx.strokeStyle = data.active ? '#ffffff' : data.enemy ? '#8d8e92' : '#8aa4a0';
  ctx.lineWidth = data.active ? 3 : 1.6; ctx.stroke();

  const inner = ctx.createLinearGradient(0, 0, w, h);
  inner.addColorStop(0, data.enemy ? '#1d1c20' : '#172022');
  inner.addColorStop(.55, data.enemy ? '#141317' : '#13181a');
  inner.addColorStop(1, '#0d1011');
  rounded(ctx, 6, 6, w - 12, h - 12, 7); ctx.fillStyle = inner; ctx.fill();

  capsule(ctx, 10, 10, 86, 13, data.enemy ? 'rgba(219,221,225,.08)' : 'rgba(185,220,212,.08)', 'rgba(255,255,255,.08)');
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = '700 8px monospace';
  ctx.fillStyle = data.enemy ? '#f0f1f3' : '#c7e3dd';
  ctx.fillText(data.enemy ? '◆ ENEMY / NPC' : '● PLAYER / PC', 16, 16.8);
  capsule(ctx, 130, 10, 34, 13, 'rgba(255,255,255,.045)', 'rgba(255,255,255,.07)');
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e5e6e7';
  ctx.fillText(`LV ${data.level}`, 147, 16.8);
  ctx.textAlign = 'left';

  drawPortrait(ctx, data, portrait);

  const artFrame = ctx.createLinearGradient(10, 27, 10, 139);
  artFrame.addColorStop(0, 'rgba(255,255,255,.08)');
  artFrame.addColorStop(1, 'rgba(255,255,255,.02)');
  ctx.strokeStyle = artFrame; ctx.lineWidth = 1.2;
  rounded(ctx, 10, 27, 154, 112, 8); ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 16px system-ui, sans-serif';
  const nm = fitText(ctx, data.name, 154, 16, 10);
  ctx.fillText(nm, 11, 156);
  ctx.fillStyle = '#aeb7bb';
  ctx.font = '11px system-ui, sans-serif';
  const role = clean(data.ancestry) + (data.ancestry && data.className ? ' · ' : '') + clean(data.className);
  let sub = role; while(ctx.measureText(sub).width > 154 && sub.length > 2) sub = sub.slice(0, -2) + '…';
  ctx.fillText(sub, 11, 172);

  ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(10, 179, 154, 1);
  drawStatBlock(ctx, 10, 186, 'HP', `${data.hp}/${data.maxHp}`, data.hpRatio < .25 ? '#ffd4d4' : '#eef1f1');
  drawStatBlock(ctx, 63, 186, 'AC', String(data.ac), '#eef1f1');
  drawStatBlock(ctx, 116, 186, data.combat ? 'INIT' : 'LVL', String(data.combat ? data.initiative : data.level), '#eef1f1');

  let pillX = 10;
  const statusFill = data.enemy ? 'rgba(255,255,255,.045)' : 'rgba(255,255,255,.04)';
  const statusStroke = 'rgba(255,255,255,.08)';
  pillX += drawStatusLabel(ctx, `TURN ${String(data.rank).padStart(2, '0')}`, pillX, 225, statusFill, statusStroke, '#d7dddd') + 4;
  if(data.burning) pillX += drawStatusLabel(ctx, 'FIRE', pillX, 225, 'rgba(255,110,45,.14)', 'rgba(255,171,101,.45)', '#ffd0b1') + 4;
  if(data.frozen) pillX += drawStatusLabel(ctx, 'ICE', pillX, 225, 'rgba(180,230,255,.16)', 'rgba(204,241,255,.36)', '#ebf8ff') + 4;
  ctx.textAlign = 'right';
  ctx.fillStyle = data.dead ? '#ffbaba' : data.active ? '#ffffff' : '#d8d7d0';
  ctx.font = '700 8px monospace';
  // Keep the right-side footer short when status tags are present.
  if(data.dead) ctx.fillText('0 HP', 164, 233);
  else if(data.active && !data.burning && !data.frozen) ctx.fillText('ACTIVE', 164, 233);
  ctx.textAlign = 'left';

  if(data.hpRatio < .25 && !data.dead){
    const alert = ctx.createLinearGradient(0, 0, 174, 0);
    alert.addColorStop(0, 'rgba(255,120,120,.00)');
    alert.addColorStop(.5, 'rgba(255,120,120,.15)');
    alert.addColorStop(1, 'rgba(255,120,120,.00)');
    ctx.fillStyle = alert; ctx.fillRect(7, 181, 160, 42);
  }

  drawFreezeEffect(ctx, data, timeMs);
  drawBurnEffect(ctx, data, timeMs);
  drawLaminateGloss(ctx, data, timeMs);
  // Fractures belong to the uppermost vinyl layer: cracks and chips must
  // remain visible over any foil or frost finish.
  drawWearAndCracks(ctx, data);

  if(data.active){
    ctx.strokeStyle = 'rgba(255,255,255,.96)';
    ctx.lineWidth = 2.4;
    rounded(ctx, 6, 6, w - 12, h - 12, 7); ctx.stroke();
  }
  ctx.restore();
}

function makeFoilMap(){
  const c = document.createElement('canvas');
  c.width = 96; c.height = 192;
  const ctx = c.getContext('2d');
  if(!has2D(ctx)) return new T.CanvasTexture(c);
  const g = ctx.createLinearGradient(0, 0, 96, 192);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(.33, 'rgba(255,255,255,.12)');
  g.addColorStop(.48, 'rgba(255,255,255,.45)');
  g.addColorStop(.62, 'rgba(255,255,255,.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 96, 192);
  for(let i=0;i<5;i++){
    ctx.fillStyle = `rgba(255,255,255,${i===2 ? .20 : .06})`; 
    ctx.fillRect(i * 20 - 6, 0, 5, 192);
  }
  const tex = new T.CanvasTexture(c);
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.repeat.set(1.25, 1.0);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}

export function createNativeCardLayer(scene, { onError = () => {}, onChange = () => {} } = {}){
  const group = new T.Group(); group.name = 'GRIM_NATIVE_CARDS'; scene.add(group);
  const entries = new Map(); let available = true;
  const faceGeometry = new T.PlaneGeometry(1, 1);
  const shellGeometry = new T.BoxGeometry(1.045, 1.045, .038);
  const cameraForward = new T.Vector3(), fromCamera = new T.Vector3(), groundPoint = new T.Vector3();
  let lastAnimatedAt = 0;
  const SHATTER_DURATION = 1350;
  const SHATTER_COLS = 4, SHATTER_ROWS = 3;

  function disposeMaterial(material){
    if(Array.isArray(material)) material.forEach(disposeMaterial);
    else material?.dispose?.();
  }
  function disposeShatter(entry){
    const fx=entry.shatter;
    if(!fx)return;
    entry.root.remove(fx.group);
    for(const shard of fx.shards) shard.mesh.geometry.dispose();
    fx.material.dispose();
    entry.shatter=null;
  }
  function disposeEntry(entry){
    entry.alive = false;
    if(entry.image) entry.image.onload = entry.image.onerror = null;
    disposeShatter(entry);
    group.remove(entry.root);
    disposeMaterial(entry.root.userData.shellMaterial);
    disposeMaterial(entry.faceMesh.material);
    disposeMaterial(entry.foilMesh.material);
    entry.texture.dispose();
    entry.foilTexture.dispose();
  }
  function triangleGeometry(points){
    const geo=new T.BufferGeometry();
    const center={x:points.reduce((sum,p)=>sum+p[0],0)/3,y:points.reduce((sum,p)=>sum+p[1],0)/3};
    const position=[],uv=[];
    for(const [x,y] of points){
      position.push(x-center.x,y-center.y,0);
      uv.push(x+.5,y+.5);
    }
    geo.setAttribute('position',new T.Float32BufferAttribute(position,3));
    geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    geo.computeVertexNormals();
    return {geo,center};
  }
  function beginShatter(entry,now){
    disposeShatter(entry);
    const id=entry.data.id;
    const rand=rng(hashString(id)^0x7f5e6913);
    const material=new T.MeshBasicMaterial({map:entry.texture,side:T.DoubleSide,transparent:true,depthTest:true,depthWrite:false,alphaTest:.04,toneMapped:false,fog:false,opacity:.92});
    const fragments=new T.Group();fragments.name='GRIM_SHATTER_'+id;
    const shards=[];
    for(let row=0;row<SHATTER_ROWS;row++)for(let col=0;col<SHATTER_COLS;col++){
      const x0=col/SHATTER_COLS-.5,x1=(col+1)/SHATTER_COLS-.5;
      const y0=row/SHATTER_ROWS-.5,y1=(row+1)/SHATTER_ROWS-.5;
      const verts=[[[x0,y0],[x1,y0],[x1,y1]],[[x0,y0],[x1,y1],[x0,y1]]];
      for(const triangle of verts){
        const {geo,center}=triangleGeometry(triangle);
        const mesh=new T.Mesh(geo,material);
        mesh.position.set(center.x,center.y,.044);
        mesh.frustumCulled=false;
        fragments.add(mesh);
        const angle=Math.atan2(center.y,center.x)+(rand()-.5)*1.3;
        const speed=.18+rand()*.52;
        shards.push({mesh,x:center.x,y:center.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed+.24,twist:(rand()-.5)*3,tilt:(rand()-.5)*1.5,delay:rand()*.10});
      }
    }
    entry.root.add(fragments);
    entry.shatter={group:fragments,shards,material,start:now};
    onChange();
  }
  function animateShatter(entry,now){
    if(!entry.shatter)return false;
    const fx=entry.shatter;
    const elapsed=Math.max(0,now-fx.start),p=shatterProgress(elapsed);
    fx.material.opacity=.92*(1-clamp((p-.35)/.65,0,1));
    for(const shard of fx.shards){
      const q=clamp((p-shard.delay)/(1-shard.delay),0,1);
      const m=shard.mesh;
      m.position.set(shard.x+shard.vx*q,shard.y+shard.vy*q-.39*q*q,.045+.12*q);
      m.rotation.set(shard.tilt*q,shard.twist*q,shard.twist*q*.8);
      m.scale.setScalar(1-q*.42);
    }
    if(elapsed>=SHATTER_DURATION){disposeShatter(entry);return false;}
    return true;
  }
  function renderTexture(entry, timeMs = 0){
    const ctx = entry.canvas.getContext('2d');
    if(!has2D(ctx)){ onError('Canvas 2D unavailable'); return; }
    ctx.setTransform(TEXTURE_WIDTH / CARD_WIDTH_PX, 0, 0, TEXTURE_HEIGHT / CARD_HEIGHT_PX, 0, 0);
    paintCard(ctx, entry.data, entry.image, timeMs);
    entry.texture.needsUpdate = true;
    onChange();
  }
  function updateFoil(entry, timeMs = 0){
    const d = entry.data;
    const mat = entry.foilMesh.material;
    entry.foilTexture.offset.x = ((timeMs * (d.burning ? .00038 : d.frozen ? .00016 : .00010)) + entry.foilPhase) % 1;
    entry.foilTexture.offset.y = ((timeMs * .00005) + entry.foilPhase * .25) % 1;
    if(d.burning){
      mat.opacity = d.active ? .30 : .23;
      mat.color.setRGB(1, .55 + .08*Math.sin(timeMs*.004), .18);
    }else if(d.frozen){
      mat.opacity = d.active ? .24 : .18;
      mat.color.setRGB(.78, .92, 1);
    }else if(d.active){
      mat.opacity = .16;
      mat.color.setRGB(1, 1, 1);
    }else{
      mat.opacity = .10;
      mat.color.setRGB(.96, .98, 1);
    }
    if(d.dead) mat.opacity *= .55;
  }
  function createEntry(data, id){
    const canvas = document.createElement('canvas');
    canvas.width = TEXTURE_WIDTH; canvas.height = TEXTURE_HEIGHT;
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = 4;
    const faceMaterial = new T.MeshBasicMaterial({ map: texture, side: T.DoubleSide, depthTest: true, depthWrite: true, transparent: false, alphaTest: .04, toneMapped: false, fog: false });
    const faceMesh = new T.Mesh(faceGeometry, faceMaterial); faceMesh.name = 'GRIM_CARD_FACE_' + id;
    const shellMaterial = new T.MeshStandardMaterial({ color: data.enemy ? 0x1d1c1f : 0x182022, roughness: .88, metalness: .10 });
    const shellMesh = new T.Mesh(shellGeometry, shellMaterial); shellMesh.position.z = -.004; shellMesh.castShadow = false; shellMesh.receiveShadow = false;
    const foilTexture = makeFoilMap();
    const foilMaterial = new T.MeshBasicMaterial({ map: foilTexture, transparent: true, opacity: .12, blending: T.AdditiveBlending, depthTest: true, depthWrite: false, toneMapped: false, side: T.DoubleSide, fog: false });
    const foilMesh = new T.Mesh(faceGeometry, foilMaterial); foilMesh.position.z = .026;
    const root = new T.Group(); root.name = 'GRIM_CARD_' + id; root.userData.combatantId = id; root.userData.shellMaterial = shellMaterial; root.frustumCulled = false;
    root.material = faceMaterial;
    faceMesh.position.z = .02;
    root.add(shellMesh, faceMesh, foilMesh); group.add(root);
    return { root, mesh: root, faceMesh, shellMesh, foilMesh, texture, foilTexture, canvas, signature: '', data, alive: true, image: null, foilPhase: (hashString(id) % 997) / 997, lastAnimatedPaint: 0, shatter: null };
  }

  function setCards(anchors, characters, combat){
    if(!available) return;
    const lookup = new Map((characters || []).map(c => [clean(c.id), c]));
    const used = new Set();
    for(const a of anchors){
      const c = lookup.get(clean(a.id)); if(!c) continue;
      const data = cardVisualData(c, a.layout, combat); const id = clean(a.id);
      used.add(id);
      const signature = JSON.stringify(data);
      let entry = entries.get(id);
      if(!entry){ entry = createEntry(data, id); entries.set(id, entry); }
      if(entry.signature !== signature){
        const previousHp=entry.data.hp;
        const isNew=entry.signature==='';
        entry.signature = signature; entry.data = data;
        if(!isNew && previousHp>0 && data.dead){
          beginShatter(entry,typeof performance!=='undefined'?performance.now():Date.now());
        }else if(!data.dead && entry.shatter){
          // A healed/revived character gets their intact card back immediately.
          disposeShatter(entry);
        }
        entry.image && (entry.image.onload = entry.image.onerror = null);
        entry.image = null;
        renderTexture(entry, typeof performance !== 'undefined' ? performance.now() : 0);
        if(/^data:image\/(png|jpeg|webp);base64,[\w+/=]+$/.test(data.portrait) && typeof Image !== 'undefined'){
          const image = new Image(); entry.image = image;
          image.onload = () => { if(entry.alive && entry.image === image) renderTexture(entry, typeof performance !== 'undefined' ? performance.now() : 0); };
          image.onerror = () => { if(entry.alive && entry.image === image){ entry.image = null; renderTexture(entry, typeof performance !== 'undefined' ? performance.now() : 0); } };
          image.src = data.portrait;
        }
        entry.shellMesh.material.color.setHex(data.enemy ? 0x1d1c1f : 0x182022);
      }
      entry.anchor = a;
      updateFoil(entry, typeof performance !== 'undefined' ? performance.now() : 0);
    }
    for(const [id, entry] of entries) if(!used.has(id)){ disposeEntry(entry); entries.delete(id); }
  }

  function update(camera, viewportWidth, viewportHeight, env, landscapeHeight, frameTime){
    if(!available) return;
    const camQuaternion = camera.quaternion;
    const now = Number.isFinite(frameTime) ? frameTime : typeof performance !== 'undefined' ? performance.now() : Date.now();
    cameraForward.set(0, 0, -1).applyQuaternion(camQuaternion);
    const doAnimatedPass = now - lastAnimatedAt > 84;
    if(doAnimatedPass) lastAnimatedAt = now;
    for(const entry of entries.values()){
      const a = entry.anchor;
      const ground = landscapeHeight(a.x, a.z, env.terrainWidth, env.terrainDepth, env.seed, env.variation, env.hills);
      const reducedMotion=typeof window!=='undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const bob = entry.data.active && !reducedMotion ? Math.sin(now * .0034 + entry.foilPhase * 6.28) * .032 : 0;
      const hover = (a.active ? 1.28 : 1.02) + bob;
      const distance = camera.position.distanceTo(groundPoint.set(a.x, ground + hover, a.z));
      const pix = cardPixelSize(viewportWidth, a.layout.scale, distance);
      fromCamera.set(a.x - camera.position.x, ground + hover - camera.position.y, a.z - camera.position.z);
      const depth = Math.max(.1, fromCamera.dot(cameraForward));
      const h = worldHeightForPixels(pix.height, viewportHeight, depth, camera.fov);
      const w = h * CARD_WIDTH_PX / CARD_HEIGHT_PX;
      entry.root.scale.set(w, h, 1);
      entry.root.position.set(a.x, ground + hover + h * .5, a.z);
      entry.root.quaternion.copy(camQuaternion);
      entry.root.visible = true;
      updateFoil(entry, now);
      if(entry.shatter){
        if(reducedMotion){disposeShatter(entry);}else animateShatter(entry,now);
      }
      if(doAnimatedPass && !reducedMotion && (entry.data.burning || entry.data.frozen)){
        if(now - entry.lastAnimatedPaint > 92){entry.lastAnimatedPaint=now;renderTexture(entry,now);}
      }
    }
  }

  function needsAnimation(now=typeof performance!=='undefined'?performance.now():Date.now()){
    if(!available)return false;
    const reducedMotion=typeof window!=='undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if(reducedMotion)return [...entries.values()].some(entry=>!!entry.shatter);
    for(const entry of entries.values()){
      if(entry.data.burning || entry.data.frozen)return true;
      if(entry.shatter)return true;
    }
    return false;
  }
  function dispose(){
    available = false;
    for(const e of entries.values()) disposeEntry(e);
    entries.clear(); scene.remove(group); faceGeometry.dispose(); shellGeometry.dispose();
  }
  return { setCards, update, needsAnimation, dispose, group, entries, get count(){ return entries.size; } };
}
