// Character cards as physical standees in the 3D world.
//
// The face is painted to a canvas only when the character's data changes.
// Everything that animates — burning edges, frost, cracks, the active-turn
// trim, the downed state — is done in the card shader via uniforms, so a
// burning card costs nothing extra on the CPU.
import * as THREE from 'three';
import { NOISE } from './glsl.js';
import { conditionFx, hpState, parseCondition } from '../core/rules.js';
import { hashString } from '../core/util.js';

export const CARD_W = 1.6, CARD_H = 2.4;
const TEX_W = 512, TEX_H = 768;

const INK = '#100f0e', BONE = '#ece4d4', ASH = '#a59d90', EMBER = '#d98a3c';
const TRIM = { player: '#8d9aab', enemy: '#a2463b' };

// ------------------------------------------------------------ painting
const imageCache = new Map();
function loadImage(src) {
  if (!src) return null;
  const key = src.length + ':' + hashString(src.slice(0, 2000) + src.slice(-2000));
  if (imageCache.has(key)) return imageCache.get(key);
  const img = new Image();
  const entry = { img, ready: false, key };
  img.onload = () => { entry.ready = true; entry.onReady?.(); };
  img.src = src;
  imageCache.set(key, entry);
  if (imageCache.size > 120) imageCache.delete(imageCache.keys().next().value);
  return entry;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(ctx, text, maxW, size, weight, family) {
  let s = size;
  do { ctx.font = `${weight} ${s}px ${family}`; s -= 2; } while (ctx.measureText(text).width > maxW && s > 16);
}

const SERIF = '"Cormorant", "Cormorant Garamond", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';

function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/).filter((p) => /[A-Za-z]/.test(p));
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] || '?').slice(0, 2)).toUpperCase();
}

export function paintCard(ctx, d, portrait) {
  const enemy = d.faction === 'enemy';
  const trim = TRIM[enemy ? 'enemy' : 'player'];
  ctx.clearRect(0, 0, TEX_W, TEX_H);
  // Body
  rr(ctx, 4, 4, TEX_W - 8, TEX_H - 8, 30);
  const body = ctx.createLinearGradient(0, 0, 0, TEX_H);
  body.addColorStop(0, '#1b1916');
  body.addColorStop(1, '#0d0c0b');
  ctx.fillStyle = body;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = trim;
  ctx.stroke();
  rr(ctx, 16, 16, TEX_W - 32, TEX_H - 32, 22);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(236,228,212,.22)';
  ctx.stroke();

  // Portrait window
  const px = 28, py = 28, pw = TEX_W - 56, ph = 452;
  ctx.save();
  rr(ctx, px, py, pw, ph, 16);
  ctx.clip();
  if (portrait?.ready) {
    const img = portrait.img;
    const s = Math.max(pw / img.width, ph / img.height);
    const w = img.width * s, h = img.height * s;
    ctx.drawImage(img, px + (pw - w) / 2, py + (ph - h) * 0.35, w, h);
  } else {
    const g = ctx.createRadialGradient(TEX_W / 2, py + ph * 0.42, 20, TEX_W / 2, py + ph * 0.45, ph * 0.75);
    g.addColorStop(0, enemy ? '#3a2220' : '#262b33');
    g.addColorStop(1, '#0e0d0c');
    ctx.fillStyle = g;
    ctx.fillRect(px, py, pw, ph);
    // Sigil: concentric rings and a rotated square
    ctx.strokeStyle = enemy ? 'rgba(200,110,95,.28)' : 'rgba(170,185,205,.25)';
    ctx.lineWidth = 2;
    for (const r of [150, 118]) { ctx.beginPath(); ctx.arc(TEX_W / 2, py + ph * 0.45, r, 0, Math.PI * 2); ctx.stroke(); }
    ctx.save();
    ctx.translate(TEX_W / 2, py + ph * 0.45);
    ctx.rotate(Math.PI / 4);
    ctx.strokeRect(-84, -84, 168, 168);
    ctx.restore();
    ctx.fillStyle = enemy ? '#d9a197' : '#c9d2dd';
    ctx.font = `600 120px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(d.symbol || initials(d.name), TEX_W / 2, py + ph * 0.46);
  }
  const fade = ctx.createLinearGradient(0, py + ph * 0.6, 0, py + ph);
  fade.addColorStop(0, 'rgba(13,12,11,0)');
  fade.addColorStop(1, 'rgba(13,12,11,.92)');
  ctx.fillStyle = fade;
  ctx.fillRect(px, py, pw, ph);
  ctx.restore();
  rr(ctx, px, py, pw, ph, 16);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(236,228,212,.18)';
  ctx.stroke();

  // Top badges
  ctx.textBaseline = 'middle';
  if (d.combat && d.rank) {
    ctx.fillStyle = 'rgba(13,12,11,.82)';
    rr(ctx, 40, 40, 74, 50, 12); ctx.fill();
    ctx.strokeStyle = d.active ? EMBER : 'rgba(236,228,212,.3)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = d.active ? EMBER : BONE;
    ctx.font = `700 28px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(d.initiative), 77, 66);
  }
  ctx.fillStyle = 'rgba(13,12,11,.82)';
  rr(ctx, TEX_W - 118, 40, 78, 50, 12); ctx.fill();
  ctx.fillStyle = ASH; ctx.font = `600 15px ${SANS}`; ctx.textAlign = 'center';
  ctx.fillText('LEVEL', TEX_W - 79, 56);
  ctx.fillStyle = BONE; ctx.font = `700 22px ${SANS}`;
  ctx.fillText(String(d.level), TEX_W - 79, 77);

  // Conditions over the bottom of the portrait
  const conds = (d.conditions || []).map((c) => parseCondition(c));
  if (conds.length) {
    ctx.font = `600 19px ${SANS}`;
    let x = 40, y = py + ph - 46;
    const shown = conds.slice(0, 4);
    for (const c of shown) {
      const label = c.value ? `${c.name} ${c.value}` : c.name;
      const w = ctx.measureText(label).width + 24;
      if (x + w > TEX_W - 40) break;
      ctx.fillStyle = c.fx === 'burning' ? 'rgba(160,60,20,.9)' : c.fx === 'frozen' ? 'rgba(60,100,140,.9)' : 'rgba(30,28,26,.9)';
      rr(ctx, x, y, w, 32, 9); ctx.fill();
      ctx.strokeStyle = 'rgba(236,228,212,.25)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = BONE; ctx.textAlign = 'left';
      ctx.fillText(label, x + 12, y + 17);
      x += w + 8;
    }
    if (conds.length > shown.length) { ctx.fillStyle = ASH; ctx.textAlign = 'left'; ctx.fillText(`+${conds.length - shown.length}`, x + 4, y + 17); }
  }

  // Name and lineage
  ctx.textAlign = 'center';
  ctx.fillStyle = BONE;
  fitText(ctx, d.name, TEX_W - 90, 54, 600, SERIF);
  ctx.fillText(d.name, TEX_W / 2, 522);
  ctx.fillStyle = ASH;
  ctx.font = `500 18px ${SANS}`;
  const line = [d.ancestry, d.className].filter(Boolean).join('  ·  ').toUpperCase();
  ctx.fillText(line.length > 40 ? line.slice(0, 39) + '…' : line, TEX_W / 2, 560);
  // Ornamental divider
  ctx.strokeStyle = trim;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(70, 590); ctx.lineTo(TEX_W / 2 - 14, 590); ctx.moveTo(TEX_W / 2 + 14, 590); ctx.lineTo(TEX_W - 70, 590); ctx.stroke();
  ctx.save(); ctx.translate(TEX_W / 2, 590); ctx.rotate(Math.PI / 4);
  ctx.fillStyle = enemy ? trim : 'transparent'; ctx.strokeStyle = trim;
  ctx.fillRect(-5, -5, enemy ? 10 : 0, enemy ? 10 : 0); ctx.strokeRect(-5, -5, 10, 10);
  ctx.restore();

  // Stats
  const hp = hpState(d);
  const barX = 44, barY = 650, barW = TEX_W - 88;
  ctx.textAlign = 'left';
  ctx.fillStyle = ASH; ctx.font = `600 16px ${SANS}`;
  ctx.fillText('HP', barX, 620);
  ctx.fillStyle = BONE; ctx.font = `700 34px ${SANS}`;
  const hpText = `${hp.hp}`;
  ctx.fillText(hpText, barX + 34, 620);
  const hpW = ctx.measureText(hpText).width;
  ctx.fillStyle = ASH; ctx.font = `500 22px ${SANS}`;
  ctx.fillText(`/ ${hp.max}`, barX + 40 + hpW, 623);
  if (d.tempHp > 0) {
    const tx = barX + 40 + hpW + ctx.measureText(`/ ${hp.max}`).width + 12;
    ctx.fillStyle = '#7fb3b0'; ctx.font = `700 22px ${SANS}`;
    ctx.fillText(`+${d.tempHp}`, tx, 622);
  }
  // HP bar
  rr(ctx, barX, barY, barW, 12, 6); ctx.fillStyle = 'rgba(236,228,212,.1)'; ctx.fill();
  if (hp.ratio > 0) {
    rr(ctx, barX, barY, Math.max(12, barW * hp.ratio), 12, 6);
    ctx.fillStyle = hp.critical ? '#b4412f' : hp.bloodied ? '#c27a35' : enemy ? '#a85a4c' : '#c9d0c2';
    ctx.fill();
  }
  if (d.tempHp > 0) { rr(ctx, barX, barY - 5, Math.min(barW, (barW * d.tempHp) / hp.max), 3, 2); ctx.fillStyle = '#7fb3b0'; ctx.fill(); }
  // AC + Init
  const stat = (label, value, x) => {
    ctx.textAlign = 'center';
    ctx.fillStyle = ASH; ctx.font = `600 15px ${SANS}`; ctx.fillText(label, x, 692);
    ctx.fillStyle = BONE; ctx.font = `700 30px ${SANS}`; ctx.fillText(String(value), x, 724);
  };
  stat('AC', d.ac, TEX_W * 0.25);
  stat(d.combat ? 'INIT' : 'PERC', d.combat ? d.initiative : d.perception, TEX_W * 0.5);
  stat(enemy ? 'FOE' : 'HERO', enemy ? '◆' : '●', TEX_W * 0.75);
}

// ------------------------------------------------------------ material
const shared = { body: null, base: null, ring: null, glass: null };
function sharedMaterials() {
  if (shared.body) return shared;
  shared.body = new THREE.MeshStandardMaterial({ color: 0x0f0e0d, roughness: 0.55, metalness: 0.3 });
  shared.base = new THREE.MeshStandardMaterial({ color: 0x1a1816, roughness: 0.45, metalness: 0.6 });
  shared.glass = new THREE.MeshStandardMaterial({ color: 0x2a2725, roughness: 0.2, metalness: 0.2, emissive: 0x3a2a20, emissiveIntensity: 0.4, side: THREE.DoubleSide, transparent: true });
  return shared;
}

function cardMaterial(texture) {
  const u = {
    uTime: { value: 0 }, uBurn: { value: 0 }, uFrost: { value: 0 }, uDamage: { value: 0 }, uActive: { value: 0 },
    uDown: { value: 0 }, uSeed: { value: Math.random() * 50 }, uSelected: { value: 0 }, uGhost: { value: 0 }, uEnemy: { value: 0 },
  };
  const m = new THREE.MeshStandardMaterial({ map: texture, emissiveMap: texture, emissive: 0xffffff, emissiveIntensity: 0.42, roughness: 0.72, metalness: 0.05, transparent: true });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uTime, uBurn, uFrost, uDamage, uActive, uDown, uSeed, uSelected, uGhost, uEnemy;
${NOISE}`)
      .replace('#include <emissivemap_fragment>', /* glsl */ `#include <emissivemap_fragment>
  vec2 cuv = vMapUv;
  float aspect = ${(CARD_W / CARD_H).toFixed(4)};
  float edge = min(min(cuv.x, 1.0 - cuv.x) * aspect, min(cuv.y, 1.0 - cuv.y));
  // Cracks spread over the portrait as HP falls.
  if (uDamage > 0.01) {
    vec2 vq = g_voronoi(cuv * vec2(3.0, 4.5) + uSeed);
    float spread = smoothstep(uDamage * 1.15, uDamage * 1.15 - 0.25, g_noise(cuv * 2.3 + uSeed * 1.7));
    float crack = (1.0 - smoothstep(0.0, 0.012 + uDamage * 0.01, vq.x)) * spread;
    float fine = (1.0 - smoothstep(0.0, 0.006, g_voronoi(cuv * vec2(9.0, 13.0) - uSeed).x)) * spread * step(0.55, uDamage);
    float c = max(crack, fine * 0.7);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.02), c * 0.85);
    totalEmissiveRadiance = mix(totalEmissiveRadiance, vec3(0.0), c * 0.9);
    totalEmissiveRadiance += vec3(0.6, 0.55, 0.5) * c * 0.06;
  }
  // Burning: charred, glowing edges licked by animated flame noise.
  if (uBurn > 0.01) {
    float n = g_fbm(cuv * vec2(5.0, 3.0) + vec2(uSeed, -uTime * 0.9));
    float lick = (1.0 - cuv.y) * (1.0 - cuv.y) * 0.07 + 0.012;
    float reach = lick + n * 0.035;
    float band = smoothstep(reach, reach * 0.35, edge) * smoothstep(0.0, 0.004, edge);
    float charV = smoothstep(reach + 0.05, reach * 0.5, edge) * uBurn;
    diffuseColor.rgb *= 1.0 - charV * 0.7;
    totalEmissiveRadiance *= 1.0 - charV * 0.55;
    float flicker = 0.8 + 0.2 * sin(uTime * 11.0 + n * 10.0);
    vec3 flame = mix(vec3(0.9, 0.18, 0.02), vec3(1.0, 0.62, 0.2), smoothstep(0.3, 0.8, n));
    totalEmissiveRadiance += flame * band * 1.35 * uBurn * flicker;
    totalEmissiveRadiance += vec3(0.5, 0.15, 0.02) * smoothstep(0.25, 0.0, edge) * 0.08 * uBurn;
  }
  // Frozen: crystalline frost creeping in from the edges.
  if (uFrost > 0.01) {
    vec2 fv = g_voronoi(cuv * vec2(7.0, 10.0) + uSeed * 0.3);
    float reach = 0.035 + 0.07 * uFrost + g_noise(cuv * 6.0 + uSeed) * 0.05;
    float rim = smoothstep(reach, reach * 0.2, edge);
    float crystal = (1.0 - smoothstep(0.0, 0.03, fv.x)) * rim;
    vec3 ice = vec3(0.78, 0.88, 0.97);
    diffuseColor.rgb = mix(diffuseColor.rgb, ice, rim * 0.45 * uFrost + crystal * 0.3);
    totalEmissiveRadiance = mix(totalEmissiveRadiance, ice * 0.5, rim * 0.4 * uFrost);
    totalEmissiveRadiance += ice * crystal * 0.25 * (0.7 + 0.3 * sin(uTime * 2.0 + fv.y * 20.0));
  }
  // Active turn: a slow ember line traced inside the trim.
  if (uActive > 0.01) {
    float line = 1.0 - smoothstep(0.0, 0.006, abs(edge - 0.022));
    float travel = 0.65 + 0.35 * sin(uTime * 1.6 + (cuv.x + cuv.y) * 6.0);
    totalEmissiveRadiance += vec3(1.0, 0.55, 0.2) * line * 1.6 * uActive * travel;
  }
  if (uSelected > 0.01) {
    float line = 1.0 - smoothstep(0.0, 0.007, abs(edge - 0.008));
    totalEmissiveRadiance += vec3(0.95, 0.92, 0.85) * line * uSelected;
  }
  // Downed: drained of colour (and faintly bloodied for foes).
  if (uDown > 0.01) {
    float l = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(l) * mix(vec3(0.7), vec3(0.85, 0.55, 0.5), uEnemy), uDown * 0.85);
    totalEmissiveRadiance *= 1.0 - uDown * 0.6;
  }
  diffuseColor.a *= 1.0 - uGhost * 0.55;
`);
  };
  m.customProgramCacheKey = () => 'grim-card-v1';
  return { material: m, uniforms: u };
}

// ------------------------------------------------------------ geometry
let geoCache = null;
function cardGeometries() {
  if (geoCache) return geoCache;
  const r = 0.1;
  const shape = new THREE.Shape();
  const w = CARD_W, h = CARD_H;
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2); shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r); shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2); shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r); shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const face = new THREE.ShapeGeometry(shape, 6);
  const uv = face.attributes.uv, pos = face.attributes.position;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  face.translate(0, 0, 0.026);
  const body = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1, curveSegments: 6 });
  body.translate(0, 0, -0.02);
  const base = new THREE.CylinderGeometry(0.34, 0.4, 0.08, 24);
  base.translate(0, 0.04, 0);
  const slot = new THREE.BoxGeometry(0.5, 0.06, 0.08);
  slot.translate(0, 0.1, 0);
  const ring = new THREE.RingGeometry(0.5, 0.68, 48);
  ring.rotateX(-Math.PI / 2);
  const blob = new THREE.CircleGeometry(0.75, 24);
  blob.rotateX(-Math.PI / 2);
  const shard = new THREE.BufferGeometry();
  shard.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.12, -0.1, 0, 0.14, -0.08, 0, 0.0, 0.16, 0]), 3));
  shard.computeVertexNormals();
  geoCache = { face, body, base, slot, ring, blob, shard };
  return geoCache;
}

const ringMaterial = (color) => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 }, uAlpha: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: /* glsl */ `
    uniform vec3 uColor; uniform float uTime, uAlpha; varying vec2 vUv;
    void main(){
      vec2 p = vUv - 0.5; float a = atan(p.y, p.x);
      float ticks = smoothstep(0.6, 0.9, sin(a * 18.0 + uTime * 0.8));
      float r = length(p) * 2.0;
      float band = smoothstep(0.74, 0.8, r) * smoothstep(1.0, 0.9, r);
      gl_FragColor = vec4(uColor, (band * 0.55 + ticks * band * 0.45) * uAlpha);
    }`,
});

const blobMaterial = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: 'varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(0.0, 0.0, 0.0, smoothstep(1.0, 0.2, d) * 0.45); }',
});

// ------------------------------------------------------------ embers (burning)
function createEmbers() {
  const n = 36;
  const g = new THREE.BufferGeometry();
  const seeds = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) seeds[i] = Math.random();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uScale: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec3 aSeed; uniform float uTime, uScale; varying float vLife;
      void main(){
        float life = fract(uTime * (0.25 + aSeed.z * 0.25) + aSeed.x);
        vec3 p = vec3((aSeed.x - 0.5) * 1.5, life * 2.8, (aSeed.y - 0.5) * 0.5) * uScale;
        p.x += sin(uTime * 2.0 + aSeed.y * 20.0) * 0.15 * life * uScale;
        vLife = life;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (2.0 + aSeed.z * 3.0) * 60.0 / -mv.z * uScale;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: 'varying float vLife; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(1.0, 0.5, 0.15) * (1.2 - vLife), smoothstep(0.5, 0.0, d) * (1.0 - vLife)); }',
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  return pts;
}

// ------------------------------------------------------------ card object
export function createCard(id) {
  const geos = cardGeometries();
  const mats = sharedMaterials();
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W; canvas.height = TEX_H;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const { material, uniforms } = cardMaterial(texture);

  const root = new THREE.Group();           // ground position
  root.name = `card:${id}`;
  const spin = new THREE.Group();           // yaw billboard
  const pivot = new THREE.Group();          // lean / fall (at the base)
  const holder = new THREE.Group();         // card body, scaled
  root.add(spin); spin.add(pivot); pivot.add(holder);
  const face = new THREE.Mesh(geos.face, material);
  const body = new THREE.Mesh(geos.body, mats.body);
  face.castShadow = false; body.castShadow = true;
  face.userData.cardId = id; body.userData.cardId = id;
  holder.add(body, face);
  const base = new THREE.Mesh(geos.base, mats.base);
  base.castShadow = true; base.receiveShadow = true;
  const slot = new THREE.Mesh(geos.slot, mats.base);
  base.userData.cardId = id;
  spin.add(base, slot);
  const ring = new THREE.Mesh(geos.ring, ringMaterial(0xd98a3c));
  ring.position.y = 0.03; ring.renderOrder = 2;
  const blob = new THREE.Mesh(geos.blob, blobMaterial);
  blob.position.y = 0.02; blob.renderOrder = 1;
  root.add(ring, blob);
  let embers = null;

  const state = {
    id, root, spin, pivot, holder, face, texture, uniforms, canvas,
    signature: '', portrait: null,
    // animated values
    pos: new THREE.Vector3(), goal: new THREE.Vector3(), scale: 1, goalScale: 1,
    fall: 0, goalFall: 0, active: 0, goalActive: 0, ghost: 0, goalGhost: 0, visible: 1, goalVisible: 1,
    hpRatio: 1, down: false, placed: false, selected: 0, goalSelected: 0, hover: 0,
    burning: false, frozen: false, shakeT: 0,
  };

  state.paint = (data, portraitSrc, onRepaint) => {
    const entry = loadImage(portraitSrc);
    const sig = JSON.stringify([data, entry?.key, entry?.ready]);
    if (sig === state.signature) return false;
    state.signature = sig;
    paintCard(ctx, data, entry);
    texture.needsUpdate = true;
    if (entry && !entry.ready) entry.onReady = () => { state.signature = ''; onRepaint?.(); };
    return true;
  };

  state.setFx = (data) => {
    const fx = conditionFx(data.conditions);
    state.burning = fx.has('burning');
    state.frozen = fx.has('frozen');
    uniforms.uEnemy.value = data.faction === 'enemy' ? 1 : 0;
    const hp = hpState(data);
    state.hpRatio = hp.ratio;
    state.down = hp.down;
    if (state.burning && !embers) { embers = createEmbers(); spin.add(embers); }
    if (!state.burning && embers) { spin.remove(embers); embers.geometry.dispose(); embers.material.dispose(); embers = null; }
  };

  state.tick = (dt, time, reduced) => {
    const k = 1 - Math.exp(-dt * 7);
    state.pos.lerp(state.goal, state.placed ? k : 1);
    state.placed = true;
    state.scale += (state.goalScale - state.scale) * k;
    state.fall += (state.goalFall - state.fall) * (1 - Math.exp(-dt * 3.5));
    state.active += (state.goalActive - state.active) * k;
    state.ghost += (state.goalGhost - state.ghost) * k;
    state.visible += (state.goalVisible - state.visible) * (1 - Math.exp(-dt * 5));
    state.selected += (state.goalSelected - state.selected) * k;
    root.position.copy(state.pos);
    if (state.shakeT > 0) {
      state.shakeT = Math.max(0, state.shakeT - dt);
      const a = state.shakeT * 0.12;
      root.position.x += Math.sin(time * 70) * a;
    }
    const s = state.scale * Math.max(0.001, state.visible);
    holder.scale.setScalar(s);
    holder.position.y = (CARD_H / 2) * s + 0.1 * s + (reduced ? 0 : Math.sin(time * 1.4 + uniforms.uSeed.value) * 0.03 * state.active * s);
    base.scale.setScalar(s); slot.scale.setScalar(s); blob.scale.setScalar(s * (1 - state.fall * 0.2));
    ring.scale.setScalar(s);
    ring.material.uniforms.uAlpha.value = Math.max(state.active, state.selected * 0.8) * state.visible;
    ring.material.uniforms.uColor.value.set(state.active > state.selected ? 0xd98a3c : 0xece4d4);
    ring.material.uniforms.uTime.value = time;
    root.visible = state.visible > 0.01;
    uniforms.uTime.value = reduced ? 0 : time;
    uniforms.uBurn.value += ((state.burning ? 1 : 0) - uniforms.uBurn.value) * k;
    uniforms.uFrost.value += ((state.frozen ? 1 : 0) - uniforms.uFrost.value) * k * 0.5;
    const damage = Math.min(1, Math.max(0, (0.8 - state.hpRatio) / 0.8));
    uniforms.uDamage.value += (damage - uniforms.uDamage.value) * k;
    uniforms.uDown.value += ((state.down ? 1 : 0) - uniforms.uDown.value) * k;
    uniforms.uActive.value = state.active;
    uniforms.uSelected.value = state.selected;
    uniforms.uGhost.value = state.ghost;
    if (embers) { embers.material.uniforms.uTime.value = time; embers.material.uniforms.uScale.value = s; embers.position.set(0, 0.2 * s, 0.05); }
  };

  state.dispose = () => {
    texture.dispose(); material.dispose(); ring.material.dispose();
    if (embers) { embers.geometry.dispose(); embers.material.dispose(); }
  };
  return state;
}

// ------------------------------------------------------------ shatter
export function createShatter(scene, card) {
  const geos = cardGeometries();
  const n = 22;
  const mat = sharedMaterials().glass.clone();
  const mesh = new THREE.InstancedMesh(geos.shard, mat, n);
  mesh.frustumCulled = false;
  const origin = card.face.getWorldPosition(new THREE.Vector3());
  const s = card.scale;
  const parts = Array.from({ length: n }, () => ({
    p: origin.clone().add(new THREE.Vector3((Math.random() - 0.5) * CARD_W * s, (Math.random() - 0.5) * CARD_H * s, 0)),
    v: new THREE.Vector3((Math.random() - 0.5) * 3, 1 + Math.random() * 2.5, (Math.random() - 0.2) * 2.5).multiplyScalar(s),
    r: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
    w: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
    k: 0.6 + Math.random() * 0.9,
  }));
  scene.add(mesh);
  let t = 0;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  return {
    tick(dt) {
      t += dt;
      for (let i = 0; i < n; i++) {
        const P = parts[i];
        P.v.y -= 6 * dt;
        P.p.addScaledVector(P.v, dt);
        P.r.x += P.w.x * dt; P.r.y += P.w.y * dt; P.r.z += P.w.z * dt;
        q.setFromEuler(P.r);
        sc.setScalar(P.k * s * Math.max(0, 1 - t / 1.4));
        m4.compose(P.p, q, sc);
        mesh.setMatrixAt(i, m4);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mat.opacity = Math.max(0, 1 - t / 1.4);
      if (t > 1.5) { scene.remove(mesh); mesh.dispose(); mat.dispose(); return false; }
      return true;
    },
  };
}
