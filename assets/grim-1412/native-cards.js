import * as T from './vendor/three.module.js';

// Cards live in the same WebGL scene and depth buffer as scenery. Grim 1.4.8
// keeps that real depth behavior, but restores a richer laminated-card look.
export const CARD_WIDTH_PX = 160;
export const CARD_HEIGHT_PX = 268;
export const TEXTURE_WIDTH = 480;
export const TEXTURE_HEIGHT = 804;
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
// Small, branching fractures in the *laminate* of the art window. A few
// stable impact points extend continuously as HP falls; no all-over scribbles.
export function fractureLayout(id, severity){
  const amount=clamp(Number(severity)||0,0,1);
  if(amount<.015)return [];
  const rand=rng(hashString(clean(id))^0xa4d9e611);
  const impacts=[
    {x:27+rand()*13,y:69+rand()*29,threshold:.015},
    {x:112+rand()*19,y:127+rand()*27,threshold:.33},
    {x:53+rand()*57,y:59+rand()*24,threshold:.69}
  ];
  const paths=[];
  for(let k=0;k<impacts.length;k++){
    const root=impacts[k];
    const grow=clamp((amount-root.threshold)/(1-root.threshold),0,1);
    if(grow<=0)continue;
    const spin=rand()*Math.PI*2;
    const count=k===0?6:5;
    for(let n=0;n<count;n++){
      const ang=spin+(n*2*Math.PI/count)+(rand()-.5)*.24;
      const full=(11+rand()*31)*(k===0?1.06:.79);
      const len=full*(.08+grow*.92);
      const one=ang+(rand()-.5)*.26;
      const two=one+(rand()-.5)*.38;
      const pts=[[root.x,root.y]];
      const segs=3;
      for(let m=1;m<=segs;m++){
        const t=m/segs;
        const bend=t<.6?ang:two;
        const x=root.x+Math.cos(bend)*len*t;
        const y=root.y+Math.sin(bend)*len*t;
        pts.push([clamp(x,12,147),clamp(y,45,181)]);
      }
      paths.push({points:pts,opacity:.3+grow*.42,width:.76+grow*.32});
      // Hairline branching; never use full-height straight cross-card strokes.
      if(grow>.48 && n%2===0){
        const center=pts[2],branchA=ang+(n%3===0?1.05:-1.05);
        const branchLen=(grow-.4)*(8+rand()*12);
        paths.push({points:[center,[clamp(center[0]+Math.cos(branchA)*branchLen,12,147),clamp(center[1]+Math.sin(branchA)*branchLen,45,181)]],opacity:.2+grow*.3,width:.5});
      }
    }
  }
  return paths;
}
function drawWearAndCracks(ctx,data){
 const severity=data.damageSeverity ?? damageSeverity(data.hpRatio);
 if(severity<=0)return;
 ctx.save();
 // A very small amount of real edge stress is enough to suggest laminate wear.
 const rand=rng(hashString(data.id)^0x7b6175d1);
 ctx.lineWidth=.55;
 for(let i=0;i<Math.floor(8*severity);i++){
   const side=i%2?151:9,y=39+rand()*146,len=2+rand()*7;
   ctx.strokeStyle=`rgba(231,243,245,${(.17+severity*.22).toFixed(3)})`;
   ctx.beginPath();ctx.moveTo(side,y);ctx.lineTo(side+(side===9?len:-len),y+(rand()-.5)*3);ctx.stroke();
 }
 // Cracks belong to the portrait laminate, not the information panel.
 ctx.save();rounded(ctx,11,43,138,141,8);ctx.clip();
 const paths=fractureLayout(data.id,severity);
 for(const path of paths){
   const pts=path.points;
   ctx.beginPath();ctx.moveTo(pts[0][0]+.65,pts[0][1]+.75);
   for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0]+.65,pts[i][1]+.75);
   ctx.strokeStyle=`rgba(9,18,23,${(path.opacity*.62).toFixed(3)})`;
   ctx.lineWidth=path.width+1.05;ctx.stroke();
   ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
   for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);
   ctx.strokeStyle=`rgba(226,248,252,${(path.opacity*.81).toFixed(3)})`;
   ctx.lineWidth=path.width;ctx.stroke();
 }
 // Tiny stress halos around impact points make critical damage read as
 // fractured glass at a distance without crossing the information strip.
 if(severity>.47){
   const r=rng(hashString(data.id)^0xa4d9e611);
   const sites=[[27+r()*13,69+r()*29],[112+r()*19,127+r()*27]];
   for(let i=0;i<sites.length;i++){
     if(i===1 && severity<.68)continue;
     const [cx,cy]=sites[i],grow=severity*(i===0?1:.7);
     const radius=5+grow*6;
     const n=7;
     ctx.strokeStyle=`rgba(229,247,252,${(.11+grow*.20).toFixed(3)})`;
     ctx.lineWidth=.6;
     ctx.beginPath();
     for(let j=0;j<=n;j++){
       const a=j/n*Math.PI*1.58-.4;
       const x=cx+Math.cos(a)*radius,y=cy+Math.sin(a)*radius*.72;
       if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
     }
     ctx.stroke();
   }
 }
 ctx.restore();
 if(data.dead){
   // At 0 HP, break the *physical edge* but keep name and HP legible.
   const chips=rng(hashString(data.id)^0xf0cc1d9);
   ctx.globalCompositeOperation='destination-out';
   for(let i=0;i<4;i++){
     const x=i%2?159:1, y=38+chips()*138, d=4+chips()*5;
     ctx.beginPath();ctx.moveTo(x,y-d);ctx.lineTo(x+(i%2?-d:d),y);ctx.lineTo(x,y+d);ctx.closePath();ctx.fill();
   }
   ctx.globalCompositeOperation='source-over';
   ctx.strokeStyle='rgba(228,245,248,.32)';ctx.lineWidth=.65;
   rounded(ctx,5,5,150,258,13);ctx.stroke();
 }
 ctx.restore();
}
// Fire is visually unmistakable at battlefield scale: a warm luminous rim,
// inward flame tongues, glowing embers and a moving bronze/gold foil sweep.
function drawBurnEffect(ctx,data,t){
 if(!data.burning)return;
 const active=data.active?1.15:1;
 const time=t*.001;
 const flicker=.85+.15*Math.sin(time*5.5);
 ctx.save();rounded(ctx,2,2,156,264,15);ctx.clip();
 // Warm tint in the illustration, not on the stats or name.
 const glow=ctx.createLinearGradient(9,43,151,183);
 glow.addColorStop(0,`rgba(255,118,29,${.18*flicker})`);
 glow.addColorStop(.5,'rgba(250,90,30,.035)');
 glow.addColorStop(1,`rgba(255,193,70,${.13*flicker})`);
 ctx.fillStyle=glow;ctx.fillRect(11,43,138,141);
 // A broad foil highlight crosses the portrait as the card animates.
 ctx.save();rounded(ctx,11,43,138,141,8);ctx.clip();
 const phase=(Math.sin(time*1.45+hashString(data.id)*.0001)+1)*.5;
 const offset=-45+phase*162;
 const gold=ctx.createLinearGradient(offset,42,offset+52,183);
 gold.addColorStop(0,'rgba(254,84,15,0)');
 gold.addColorStop(.48,`rgba(255,150,44,${.27*active})`);
 gold.addColorStop(.53,`rgba(255,235,114,${.36*active})`);
 gold.addColorStop(1,'rgba(254,84,15,0)');
 ctx.fillStyle=gold;ctx.fillRect(11,43,138,141);
 ctx.restore();
 // Flame contours rise along both sides without hiding the middle of the art.
 for(let side=0;side<2;side++){
   const sign=side===0?1:-1,base=side===0?5:155;
   for(let i=0;i<9;i++){
     const y=44+i*18;
     const wave=Math.sin(time*3.4+i*1.1+side*2.4);
     const reach=(3+i%3*2+wave*1.4)*active;
     ctx.beginPath();ctx.moveTo(base,y+11);
     ctx.quadraticCurveTo(base+sign*(reach+3),y+1,base+sign*(reach*.45),y-11-wave*4);
     ctx.quadraticCurveTo(base+sign*2,y+1,base,y+11);
     ctx.fillStyle=`rgba(255,${Math.round(118+75*(i%3)/3)},${Math.round(32+35*(i%2))},${(.42+.14*Math.sin(time*4+i))*flicker})`;
     ctx.fill();
   }
 }
 ctx.lineWidth=2.6;
 ctx.strokeStyle=`rgba(255,${Math.round(133+50*flicker)},58,${.72*active})`;
 rounded(ctx,4.2,4.2,151.6,259.6,14);ctx.stroke();
 ctx.lineWidth=.8;
 ctx.strokeStyle='rgba(255,233,155,.72)';
 rounded(ctx,7,7,146,254,12);ctx.stroke();
 const embers=rng(hashString(data.id)^0xf11a7e);
 for(let i=0;i<13;i++){
   const y=43+((embers()*130-time*19+i*13)%137+137)%137;
   const x=i%2?9+embers()*22:151-embers()*22;
   const r=.7+embers()*1.6;
   ctx.fillStyle=`rgba(255,${170+(i%3)*20},95,${.46+flicker*.22})`;
   ctx.fillRect(x,y,r,r);
 }
 ctx.restore();
}
// Frost uses translucent crystalline threads concentrated near the frame.
function drawFreezeEffect(ctx,data,t){
 if(!data.frozen)return;
 const rand=rng(hashString(data.id)^0x773af333);
 ctx.save();rounded(ctx,3,3,154,262,14);ctx.clip();
 const icy=ctx.createLinearGradient(0,30,160,194);
 icy.addColorStop(0,'rgba(222,247,255,.30)');
 icy.addColorStop(.35,'rgba(198,232,255,.075)');
 icy.addColorStop(1,'rgba(245,251,255,.13)');
 ctx.fillStyle=icy;ctx.fillRect(8,43,144,141);
 for(let edge=0;edge<2;edge++)for(let i=0;i<19;i++){
   const x=edge?153:7,y=29+i*10+rand()*6;
   const sign=edge?-1:1,length=5+rand()*13;
   ctx.strokeStyle=`rgba(222,249,255,${(.23+rand()*.35).toFixed(3)})`;
   ctx.lineWidth=.65+rand()*.55;
   ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+sign*length,y-2);
   ctx.moveTo(x+sign*length*.65,y-2);ctx.lineTo(x+sign*length*.84,y-6);
   ctx.moveTo(x+sign*length*.45,y-1);ctx.lineTo(x+sign*length*.64,y+5);ctx.stroke();
 }
 const glint=.66+.34*Math.sin(t*.003);
 ctx.strokeStyle=`rgba(234,252,255,${glint})`;ctx.lineWidth=1.7;
 rounded(ctx,5,5,150,258,13);ctx.stroke();
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
function drawLaminateGloss(ctx,data,t){
 ctx.save();rounded(ctx,5,5,150,258,13);ctx.clip();
 const phase=(Math.sin(t*.0016+hashString(data.id)*.00001)+1)*.5;
 const x=-55+phase*190;
 const grad=ctx.createLinearGradient(x,0,x+49,268);
 grad.addColorStop(0,'rgba(255,255,255,0)');
 grad.addColorStop(.46,`rgba(255,255,255,${data.active?.13:.07})`);
 grad.addColorStop(1,'rgba(255,255,255,0)');
 ctx.fillStyle=grad;ctx.fillRect(6,6,148,256);
 ctx.restore();
}

// The 1.4.8 presentation has a true tarot/dossier silhouette (160 x 268),
// a tall portrait window and an open stat strip. Only the effects are remapped
// from the earlier 174 x 240 finish artwork, preserving all 1.4.7 behavior.
export function paintCard(ctx, data, portrait = null, timeMs = 0){
  const w=CARD_WIDTH_PX, h=CARD_HEIGHT_PX;
  ctx.clearRect(0,0,w,h); ctx.save(); ctx.imageSmoothingEnabled=true;
  const exterior=ctx.createLinearGradient(0,0,w,h);
  exterior.addColorStop(0,data.enemy?'#343033':'#364444');
  exterior.addColorStop(.27,'#121719');
  exterior.addColorStop(.78,'#0b0e11');
  exterior.addColorStop(1,data.enemy?'#5b5257':'#3f5352');
  rounded(ctx,1,1,w-2,h-2,15);ctx.fillStyle=exterior;ctx.fill();
  // Double hairline border with spacious corners instead of a hard white box.
  rounded(ctx,2.5,2.5,w-5,h-5,14);
  ctx.strokeStyle=data.active?'rgba(223,242,238,.90)':'rgba(193,207,208,.34)';
  ctx.lineWidth=data.active?1.7:1.15;ctx.stroke();
  const charcoal=ctx.createLinearGradient(0,6,0,h-6);
  charcoal.addColorStop(0,data.enemy?'#252126':'#1d282a');
  charcoal.addColorStop(.42,'#141a1c');
  charcoal.addColorStop(1,'#0b0f12');
  rounded(ctx,6,6,w-12,h-12,11);ctx.fillStyle=charcoal;ctx.fill();
  rounded(ctx,8,8,w-16,h-16,10);ctx.strokeStyle='rgba(222,231,234,.11)';ctx.lineWidth=.65;ctx.stroke();

  // Compact top metal plate, with right-aligned level cartouche.
  rounded(ctx,10,11,102,25,6);
  ctx.fillStyle='rgba(225,236,236,.055)';ctx.fill();
  ctx.strokeStyle='rgba(225,236,236,.13)';ctx.lineWidth=.8;ctx.stroke();
  ctx.font='700 8px monospace';ctx.textBaseline='middle';ctx.textAlign='left';
  ctx.fillStyle=data.enemy?'#dfcfd3':'#b9d9d3';
  ctx.fillText(data.enemy?'◆ ENEMY / NPC':'● PLAYER / PC',17,23);
  rounded(ctx,119,11,31,25,6);ctx.fillStyle='rgba(225,236,236,.055)';ctx.fill();
  ctx.strokeStyle='rgba(225,236,236,.13)';ctx.stroke();
  ctx.textAlign='center';ctx.fillStyle='#eef0ef';ctx.fillText('LV '+data.level,134.5,23);ctx.textAlign='left';

  // Tall portrait and cut-corner inlay: the artwork owns more of the surface.
  const ax=11,ay=43,aw=138,ah=141;
  rounded(ctx,ax-1,ay-1,aw+2,ah+2,9);
  ctx.fillStyle='rgba(202,216,215,.20)';ctx.fill();
  ctx.save();rounded(ctx,ax,ay,aw,ah,8);ctx.clip();
  if(portrait && portrait.complete && portrait.naturalWidth){
    const ratio=Math.max(aw/portrait.naturalWidth,ah/portrait.naturalHeight);
    const iw=portrait.naturalWidth*ratio,ih=portrait.naturalHeight*ratio;
    ctx.drawImage(portrait,ax+(aw-iw)/2,ay+(ah-ih)/2,iw,ih);
  }else{
    const art=ctx.createLinearGradient(ax,ay,ax+aw,ay+ah);
    art.addColorStop(0,data.enemy?'#51464a':'#516467');
    art.addColorStop(.48,data.enemy?'#30272e':'#293538');
    art.addColorStop(1,'#0e1114');ctx.fillStyle=art;ctx.fillRect(ax,ay,aw,ah);
    ctx.textAlign='center';ctx.font='600 40px system-ui,sans-serif';ctx.fillStyle='rgba(231,242,241,.25)';ctx.fillText(data.symbol,w/2,106);
    ctx.font='700 10px monospace';ctx.fillStyle='rgba(231,242,241,.38)';ctx.fillText(data.enemy?'NPC':'PC',w/2,150);ctx.textAlign='left';
  }
  const shade=ctx.createLinearGradient(0,ay,0,ay+ah);
  shade.addColorStop(0,'rgba(0,0,0,.1)');shade.addColorStop(.61,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(0,0,0,.55)');
  ctx.fillStyle=shade;ctx.fillRect(ax,ay,aw,ah);
  ctx.restore();
  rounded(ctx,ax,ay,aw,ah,8);ctx.strokeStyle='rgba(228,235,239,.19)';ctx.lineWidth=1;ctx.stroke();
  // A tiny trapezoid inlay on each side visually breaks up the rigid frame.
  ctx.strokeStyle='rgba(207,220,221,.19)';ctx.lineWidth=1;
  for(const edge of [8,152]){
    ctx.beginPath();ctx.moveTo(edge,58);ctx.lineTo(edge,81);ctx.stroke();
    ctx.beginPath();ctx.moveTo(edge,143);ctx.lineTo(edge,171);ctx.stroke();
  }

  ctx.font='700 17px system-ui,sans-serif';ctx.fillStyle='#f2f4f4';
  const name=fitText(ctx,data.name,138,17,11);ctx.fillText(name,11,202);
  ctx.font='10px system-ui,sans-serif';ctx.fillStyle='#aeb8bb';
  const role=clean(data.ancestry)+(data.ancestry&&data.className?' · ':'')+clean(data.className);
  let subtitle=role;
  while(ctx.measureText(subtitle).width>138&&subtitle.length>2) subtitle=subtitle.slice(0,-2)+'…';
  ctx.fillText(subtitle,11,215);
  ctx.fillStyle='rgba(225,235,233,.17)';ctx.fillRect(11,224,138,1);

  // Three slim columns, NO individual blocky stat boxes.
  const statColumns=[{x:12,label:'HP',val:`${data.hp}/${data.maxHp}`},{x:61,label:'AC',val:String(data.ac)},{x:110,label:data.combat?'INIT':'LVL',val:String(data.combat?data.initiative:data.level)}];
  for(const [i,stat] of statColumns.entries()){
    if(i>0){ctx.fillStyle='rgba(227,235,235,.13)';ctx.fillRect(stat.x-6,230,1,24);}
    ctx.font='700 8px monospace';ctx.fillStyle='#9facb0';ctx.fillText(stat.label,stat.x,234);
    ctx.font='700 16px system-ui,sans-serif';ctx.fillStyle=i===0&&data.hpRatio<.25?'#ffdbdb':'#f0f2f2';
    let val=stat.val;
    if(ctx.measureText(val).width>43){ctx.font='700 13px system-ui,sans-serif';}
    ctx.fillText(val,stat.x,249);
  }
  // A deliberately thin footer plate, with state and turn order separated.
  ctx.fillStyle='rgba(226,233,236,.06)';rounded(ctx,9,255,142,10,3);ctx.fill();
  ctx.font='700 7.6px monospace';ctx.fillStyle='#b5c2c1';ctx.fillText(`TURN ${String(data.rank).padStart(2,'0')}`,14,260.4);
  ctx.textAlign='right';
  ctx.fillStyle=data.dead?'#ffb0ad':data.burning?'#ffb474':data.frozen?'#bfeafa':'#adb9b7';
  const state=data.dead?'SHATTERED':data.burning&&data.frozen?'FIRE / FROST':data.burning?'BURNING':data.frozen?'FROZEN':data.active?'ACTIVE':'';
  ctx.fillText(state,145,260.4);ctx.textAlign='left';

  // All finish effects use actual 160 × 268 native card coordinates.
  // Never reset the canvas transform here: doing so broke the 1.4.8 overlays.
  ctx.save();rounded(ctx,2,2,w-4,h-4,15);ctx.clip();
  drawFreezeEffect(ctx,data,timeMs);
  drawBurnEffect(ctx,data,timeMs);
  drawLaminateGloss(ctx,data,timeMs);
  drawWearAndCracks(ctx,data);
  ctx.restore();
  // Active lighting is a controlled rim, not a blazing rectangle.
  if(data.active){rounded(ctx,4,4,w-8,h-8,13);ctx.strokeStyle='rgba(210,243,237,.72)';ctx.lineWidth=1.15;ctx.stroke();}
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

// One shared rounded silhouette serves both the opaque face and iridescent
// foil. Correct UVs ensure text/portraits aren't stretched at the corners.
export function roundedCardShape(radius=.065){
  const r=clamp(radius,.025,.13), shape=new T.Shape();
  const x=-.5,y=-.5,w=1,h=1;
  shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);
  shape.quadraticCurveTo(x+w,y,x+w,y+r);
  shape.lineTo(x+w,y+h-r);shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  shape.lineTo(x+r,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-r);
  shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);
  return shape;
}
export function roundedCardFaceGeometry(){
  const geo=new T.ShapeGeometry(roundedCardShape(.065),8);
  const pos=geo.getAttribute('position'),uv=geo.getAttribute('uv');
  for(let i=0;i<pos.count;i++)uv.setXY(i,pos.getX(i)+.5,pos.getY(i)+.5);
  uv.needsUpdate=true;
  return geo;
}
export function createNativeCardLayer(scene, { onError = () => {}, onChange = () => {} } = {}){
  const group = new T.Group(); group.name = 'GRIM_NATIVE_CARDS'; scene.add(group);
  const entries = new Map(); let available = true;
  const faceGeometry = roundedCardFaceGeometry();
  const shellGeometry = new T.ExtrudeGeometry(roundedCardShape(.065),{depth:.025,steps:1,bevelEnabled:true,bevelThickness:.007,bevelSize:.006,bevelSegments:2,curveSegments:8});
  const cameraForward = new T.Vector3(), fromCamera = new T.Vector3(), groundPoint = new T.Vector3();
  let texturePaints=0, layoutUpdates=0, foilUpdates=0, shatterUpdates=0;
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
    // Only repaint on actual card-data or portrait changes. Animated finishes
    // use GPU-side foil offsets, not repeated 480×804 canvas uploads.
    paintCard(ctx, entry.data, entry.image, timeMs);
    texturePaints++;
    entry.texture.needsUpdate = true;
    onChange();
  }
  function updateFoil(entry, timeMs = 0){
    foilUpdates++;
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
    const shellMesh = new T.Mesh(shellGeometry, shellMaterial); shellMesh.position.z = -.019; shellMesh.castShadow = false; shellMesh.receiveShadow = false;
    const foilTexture = makeFoilMap();
    const foilMaterial = new T.MeshBasicMaterial({ map: foilTexture, transparent: true, opacity: .12, blending: T.AdditiveBlending, depthTest: true, depthWrite: false, toneMapped: false, side: T.DoubleSide, fog: false });
    const foilMesh = new T.Mesh(faceGeometry, foilMaterial); foilMesh.position.z = .027;
    const root = new T.Group(); root.name = 'GRIM_CARD_' + id; root.userData.combatantId = id; root.userData.shellMaterial = shellMaterial; root.frustumCulled = false;
    root.material = faceMaterial;
    faceMesh.position.z = .02;
    root.add(shellMesh, faceMesh, foilMesh); group.add(root);
    return { root, mesh: root, faceMesh, shellMesh, foilMesh, texture, foilTexture, canvas, signature: '', data, alive: true, image: null, portraitSource: '', foilPhase: (hashString(id) % 997) / 997, lastAnimatedPaint: 0, shatter: null };
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
        // Status/HP changes must not decode the same base64 portrait again.
        // Keep the decoded Image across updates and only replace when the
        // portrait itself changes (or the actor is removed).
        const nextPortrait=/^data:image\/(png|jpeg|webp);base64,[\w+/=]+$/.test(data.portrait) ? data.portrait : '';
        if(entry.portraitSource!==nextPortrait){
          if(entry.image)entry.image.onload=entry.image.onerror=null;
          entry.image=null;entry.portraitSource=nextPortrait;
          if(nextPortrait && typeof Image!=='undefined'){
            const image=new Image();entry.image=image;
            image.onload=()=>{if(entry.alive&&entry.image===image)renderTexture(entry,typeof performance!=='undefined'?performance.now():0);};
            image.onerror=()=>{if(entry.alive&&entry.image===image){entry.image=null;renderTexture(entry,typeof performance!=='undefined'?performance.now():0);}};
            image.src=nextPortrait;
          }
        }
        renderTexture(entry, typeof performance !== 'undefined' ? performance.now() : 0);
        entry.shellMesh.material.color.setHex(data.enemy ? 0x1d1c1f : 0x182022);
      }
      entry.anchor = a;
      updateFoil(entry, typeof performance !== 'undefined' ? performance.now() : 0);
    }
    for(const [id, entry] of entries) if(!used.has(id)){ disposeEntry(entry); entries.delete(id); }
  }

  function update(camera, viewportWidth, viewportHeight, env, landscapeHeight, frameTime, fitScale=1){
    if(!available) return;
    layoutUpdates++;
    const camQuaternion = camera.quaternion;
    const now = Number.isFinite(frameTime) ? frameTime : typeof performance !== 'undefined' ? performance.now() : Date.now();
    cameraForward.set(0, 0, -1).applyQuaternion(camQuaternion);
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
      const h = worldHeightForPixels(pix.height*fitScale, viewportHeight, depth, camera.fov);
      const w = h * CARD_WIDTH_PX / CARD_HEIGHT_PX;
      entry.root.scale.set(w, h, 1);
      entry.root.position.set(a.x, ground + hover + h * .5, a.z);
      entry.root.quaternion.copy(camQuaternion);
      entry.root.visible = true;
      // Camera/layout work runs only when projection changes. The separate
      // animate() path below handles moving foil/shatter without recalculating
      // all card positions or uploading new canvases.
      updateFoil(entry, now);
      if(entry.shatter){
        if(reducedMotion){disposeShatter(entry);}else {shatterUpdates++;animateShatter(entry,now);}
      }
    }
  }

  function animate(now=typeof performance!=='undefined'?performance.now():Date.now()){
    if(!available)return;
    const reducedMotion=typeof window!=='undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    for(const entry of entries.values()){
      if(!reducedMotion && (entry.data.burning || entry.data.frozen)) updateFoil(entry,now);
      if(entry.shatter){
        if(reducedMotion)disposeShatter(entry);
        else {shatterUpdates++;animateShatter(entry,now);}
      }
    }
  }
  // Read-only diagnostics for benchmarking. No per-frame allocations needed.
  function getPerformanceStats(){return {texturePaints,layoutUpdates,foilUpdates,shatterUpdates,cards:entries.size};}
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
  return { setCards, update, animate, needsAnimation, getPerformanceStats, dispose, group, entries, get count(){ return entries.size; } };
}
