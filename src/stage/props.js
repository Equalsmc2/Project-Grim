// Procedural scenery: faceted "diorama" props built from primitives, coloured
// per vertex, merged per kind and drawn with instancing. One shared material
// handles wind sway, snow cover and wetness for all of them.
//
// Two sources place props:
//   1. The battle map: tree/rock/wall/pillar/... squares become real scenery
//      standing on that square (visible in cinematic AND tactical views).
//   2. A seeded decorative scatter around the encounter area.
import * as THREE from 'three';
import { rng } from '../core/util.js';

// ------------------------------------------------------------ geometry kit
const C = (hex) => new THREE.Color(hex);
const ni = (g) => (g.index ? g.toNonIndexed() : g);

function colored(geo, color, jitter = 0, rand = Math.random, shadeY = 0) {
  geo = ni(geo);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    const k = 1 + (rand() - 0.5) * jitter;
    for (let j = 0; j < 3; j++) {
      const y = pos.getY(i + j);
      c.copy(color).multiplyScalar(k * (1 + shadeY * y));
      col.set([c.r, c.g, c.b], (i + j) * 3);
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

function jitterVerts(geo, amount, rand) {
  const pos = geo.attributes.position;
  const map = new Map();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    if (!map.has(key)) map.set(key, [(rand() - 0.5) * amount, (rand() - 0.5) * amount * 0.6, (rand() - 0.5) * amount]);
    const d = map.get(key);
    pos.setXYZ(i, pos.getX(i) + d[0], pos.getY(i) + d[1], pos.getZ(i) + d[2]);
  }
  return geo;
}

function merge(geos) {
  let count = 0;
  for (const g of geos) count += g.attributes.position.count;
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), sway = new Float32Array(count);
  let o = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, o * 3);
    col.set(g.attributes.color.array, o * 3);
    if (g.userData.sway !== undefined) sway.fill(g.userData.sway, o, o + g.attributes.position.count);
    else for (let i = 0; i < g.attributes.position.count; i++) sway[o + i] = Math.max(0, g.attributes.position.getY(i));
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setAttribute('aSway', new THREE.BufferAttribute(sway, 1));
  out.computeVertexNormals();
  out.computeBoundingSphere();
  return out;
}
const T = (geo, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {}) => {
  geo.scale(sx, sy, sz); geo.rotateX(rx); geo.rotateY(ry); geo.rotateZ(rz); geo.translate(x, y, z); return geo;
};
const rigid = (g) => { g.userData.sway = 0; return g; };

function conifer(rand, { foliage = 0x2e4128, tall = 1 } = {}) {
  const parts = [rigid(colored(T(new THREE.CylinderGeometry(0.09, 0.16, 1.4 * tall, 6), { y: 0.7 * tall }), C(0x4a3626), 0.1, rand))];
  const tiers = 4 + Math.floor(rand() * 2);
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const r = (1.25 - t * 0.85) * (0.9 + rand() * 0.2);
    const h = 1.5 - t * 0.5;
    const g = jitterVerts(ni(new THREE.ConeGeometry(r, h, 7, 1)), 0.18, rand);
    T(g, { y: (0.9 + t * 3.3) * tall + h / 2, ry: rand() * 6 });
    parts.push(colored(g, C(foliage).multiplyScalar(0.8 + t * 0.35), 0.18, rand, 0.04));
  }
  return parts;
}
function broadleaf(rand, { foliage = 0x4a5d2a } = {}) {
  const parts = [rigid(colored(T(new THREE.CylinderGeometry(0.12, 0.2, 2.2, 6), { y: 1.1, rz: (rand() - 0.5) * 0.15 }), C(0x4b3829), 0.1, rand))];
  const blobs = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < blobs; i++) {
    const r = 0.8 + rand() * 0.6;
    const g = jitterVerts(ni(new THREE.IcosahedronGeometry(r, 1)), 0.25, rand);
    T(g, { x: (rand() - 0.5) * 1.4, y: 2.4 + rand() * 1.3, z: (rand() - 0.5) * 1.4, sy: 0.8 });
    parts.push(colored(g, C(foliage).multiplyScalar(0.8 + rand() * 0.35), 0.2, rand, 0.05));
  }
  return parts;
}
function deadTree(rand) {
  const bark = C(0x3c3129);
  const parts = [rigid(colored(T(new THREE.CylinderGeometry(0.08, 0.2, 3.2, 5), { y: 1.6, rz: (rand() - 0.5) * 0.2 }), bark, 0.15, rand))];
  for (let i = 0; i < 4; i++) {
    const g = T(new THREE.CylinderGeometry(0.03, 0.07, 1.3, 4), { y: 0.65 });
    T(g, { rz: 0.6 + rand() * 0.6, ry: rand() * 6.28, y: 1.6 + rand() * 1.4 });
    parts.push(colored(g, bark, 0.15, rand));
  }
  return parts;
}
function rock(rand, { color = 0x6a6760, scale = 1 } = {}) {
  const g = jitterVerts(ni(new THREE.IcosahedronGeometry(0.55 * scale, 1)), 0.28 * scale, rand);
  T(g, { y: 0.25 * scale, sx: 1 + rand() * 0.5, sy: 0.55 + rand() * 0.35, sz: 1 + rand() * 0.4, ry: rand() * 6 });
  return [rigid(colored(g, C(color), 0.22, rand, 0.12))];
}
function bush(rand, { foliage = 0x3f5326 } = {}) {
  const parts = [];
  for (let i = 0; i < 4; i++) {
    const g = jitterVerts(ni(new THREE.IcosahedronGeometry(0.32 + rand() * 0.2, 0)), 0.12, rand);
    T(g, { x: (rand() - 0.5) * 0.6, y: 0.28 + rand() * 0.15, z: (rand() - 0.5) * 0.6 });
    parts.push(colored(g, C(foliage).multiplyScalar(0.8 + rand() * 0.4), 0.2, rand));
  }
  return parts;
}
function grassTuft(rand, { color = 0x5d6b33 } = {}) {
  const parts = [];
  const blades = 5;
  for (let i = 0; i < blades; i++) {
    const h = 0.18 + rand() * 0.2;
    const g = new THREE.BufferGeometry();
    const w = 0.05;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-w, 0, 0, w, 0, 0, (rand() - 0.5) * 0.12, h, (rand() - 0.5) * 0.12]), 3));
    T(g, { ry: rand() * 3.14, x: (rand() - 0.5) * 0.25, z: (rand() - 0.5) * 0.25 });
    parts.push(colored(g, C(color).multiplyScalar(0.95 + rand() * 0.35), 0, rand, 1.6));
  }
  return parts;
}
function log(rand) {
  const g = T(new THREE.CylinderGeometry(0.22, 0.25, 2.1, 7), { rz: Math.PI / 2, y: 0.2 });
  const caps = T(new THREE.CylinderGeometry(0.17, 0.17, 2.12, 7, 1, true), { rz: Math.PI / 2, y: 0.2 });
  return [rigid(colored(g, C(0x4d3a28), 0.15, rand)), rigid(colored(caps, C(0x6d563f), 0.1, rand))];
}
function stump(rand) { return [rigid(colored(T(new THREE.CylinderGeometry(0.26, 0.32, 0.45, 7), { y: 0.2 }), C(0x4d3a28), 0.15, rand))]; }
const STONE = 0x6b6862;
function pillar(rand, { broken = false } = {}) {
  const h = broken ? 1.2 + rand() * 0.9 : 3;
  const parts = [
    rigid(colored(T(new THREE.BoxGeometry(0.85, 0.25, 0.85), { y: 0.12 }), C(STONE), 0.15, rand)),
    rigid(colored(T(jitterVerts(ni(new THREE.CylinderGeometry(0.3, 0.33, h, 8)), 0.03, rand), { y: 0.25 + h / 2 }), C(STONE), 0.12, rand, 0.03)),
  ];
  if (!broken) parts.push(rigid(colored(T(new THREE.BoxGeometry(0.8, 0.22, 0.8), { y: 0.25 + h + 0.11 }), C(STONE), 0.15, rand)));
  return parts;
}
function wallBlock(rand, { height = 1.7, ruined = false } = {}) {
  const parts = [];
  const rows = ruined ? 2 : 4;
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < 2; k++) {
      if (ruined && rand() < 0.35) continue;
      const g = T(new THREE.BoxGeometry(0.5 - 0.02, height / 4 - 0.03, 0.96), { x: -0.25 + k * 0.5 + (r % 2 ? 0.04 : -0.04), y: (r + 0.5) * (height / 4) });
      parts.push(rigid(colored(jitterVerts(ni(g), 0.03, rand), C(STONE).multiplyScalar(0.85 + rand() * 0.25), 0.1, rand)));
    }
  }
  if (!parts.length) parts.push(rigid(colored(T(new THREE.BoxGeometry(0.9, 0.35, 0.9), { y: 0.17 }), C(STONE), 0.1, rand)));
  return parts;
}
function grave(rand) {
  const g = new THREE.CylinderGeometry(0.32, 0.32, 0.12, 10, 1, false, 0, Math.PI);
  T(g, { rx: Math.PI / 2, rz: Math.PI / 2, y: 0.62 });
  const slab = T(new THREE.BoxGeometry(0.64, 0.62, 0.12), { y: 0.31 });
  const mound = T(new THREE.SphereGeometry(0.45, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), { sz: 1.7, sy: 0.35, z: 0.55 });
  const tilt = (rand() - 0.5) * 0.25;
  return [
    rigid(colored(T(slab, { rz: tilt }), C(0x77746d), 0.12, rand)),
    rigid(colored(T(g, { rz: tilt }), C(0x77746d), 0.12, rand)),
    rigid(colored(mound, C(0x4a3d2e), 0.15, rand)),
  ];
}
function moundGeo(rand, { color = 0x5a4a37 } = {}) {
  return [rigid(colored(jitterVerts(ni(T(new THREE.SphereGeometry(0.55, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), { sy: 0.45 })), 0.08, rand), C(color), 0.15, rand))];
}
function barricade(rand) {
  const parts = [];
  for (let i = 0; i < 3; i++) parts.push(rigid(colored(T(new THREE.BoxGeometry(0.95, 0.16, 0.2), { y: 0.18 + i * 0.22, rz: (rand() - 0.5) * 0.12 }), C(0x5c4631), 0.15, rand)));
  parts.push(rigid(colored(T(new THREE.BoxGeometry(0.12, 0.85, 0.12), { x: -0.38, y: 0.42 }), C(0x4a3826), 0.1, rand)));
  parts.push(rigid(colored(T(new THREE.BoxGeometry(0.12, 0.85, 0.12), { x: 0.38, y: 0.42 }), C(0x4a3826), 0.1, rand)));
  return parts;
}
function pebbles(rand, { color = 0x6a665e } = {}) {
  const parts = [];
  for (let i = 0; i < 4; i++) {
    const g = T(new THREE.IcosahedronGeometry(0.06 + rand() * 0.07, 0), { x: (rand() - 0.5) * 0.7, z: (rand() - 0.5) * 0.7, y: 0.03, sy: 0.6 });
    parts.push(rigid(colored(g, C(color), 0.25, rand)));
  }
  return parts;
}

// ------------------------------------------------------------ biomes
const FOLIAGE = {
  grass: { conifer: 0x2b3d26, leaf: 0x4b5e2a, bush: 0x3e5226, tuft: 0x6b7a3a },
  leaves: { conifer: 0x2e3a24, leaf: 0x9a5524, bush: 0x7d4a22, tuft: 0x7a6a33 },
  snow: { conifer: 0x26372c, leaf: 0x4b5a3c, bush: 0x3a4a34, tuft: 0x8b9178 },
  sand: { conifer: 0x3b4a2c, leaf: 0x6b6b38, bush: 0x6a6a3a, tuft: 0x9a8f55 },
  dirt: { conifer: 0x2b3a26, leaf: 0x4f5a2c, bush: 0x46502a, tuft: 0x5f6233 },
  stone: { conifer: 0x2b3a26, leaf: 0x495a2c, bush: 0x3e5026, tuft: 0x5a6634 },
  blank: { conifer: 0x404044, leaf: 0x48484c, bush: 0x444448, tuft: 0x4a4a4e },
};
const ROCK = { sand: 0x8c7556, snow: 0x5f636b, blank: 0x55555a };

const SCATTER = {
  forest: [['conifer', 5], ['broadleaf', 3], ['bush', 3], ['rock', 1.5], ['log', 0.6], ['stump', 0.6]],
  rocks: [['rock', 5], ['boulder', 2], ['bush', 1], ['deadTree', 0.4]],
  ruins: [['pillarBroken', 2], ['ruin', 3], ['rock', 2], ['pillar', 0.6], ['grave', 0.5], ['bush', 1]],
  snow: [['conifer', 5], ['rock', 2], ['snowMound', 2], ['deadTree', 0.8]],
  grass: [['bush', 3], ['rock', 1], ['broadleaf', 1]],
  bushes: [['bush', 5], ['rock', 1]],
  logs: [['log', 3], ['stump', 2], ['bush', 1], ['conifer', 1]],
  graves: [['grave', 4], ['deadTree', 2], ['rock', 1.5], ['bush', 0.6]],
  mixed: [['conifer', 3], ['broadleaf', 2], ['bush', 2.5], ['rock', 2], ['log', 0.6], ['ruin', 0.4], ['deadTree', 0.4]],
};

function makeKinds(ground, seed) {
  const f = FOLIAGE[ground] || FOLIAGE.grass;
  const rockCol = ROCK[ground] || 0x6a6760;
  const variants = (fn, n = 3) => Array.from({ length: n }, (_, i) => merge(fn(rng(seed * 31 + i * 977 + fn.name.length))));
  return {
    conifer: variants((r) => conifer(r, { foliage: f.conifer })),
    broadleaf: variants((r) => broadleaf(r, { foliage: f.leaf })),
    deadTree: variants(deadTree, 2),
    bush: variants((r) => bush(r, { foliage: f.bush })),
    tuft: variants((r) => grassTuft(r, { color: f.tuft }), 2),
    rock: variants((r) => rock(r, { color: rockCol })),
    boulder: variants((r) => rock(r, { color: rockCol, scale: 1.9 }), 2),
    log: variants(log, 1),
    stump: variants(stump, 1),
    pillar: variants((r) => pillar(r), 1),
    pillarBroken: variants((r) => pillar(r, { broken: true }), 2),
    wall: variants((r) => wallBlock(r), 2),
    ruin: variants((r) => wallBlock(r, { ruined: true }), 3),
    grave: variants(grave, 2),
    mound: variants((r) => moundGeo(r), 1),
    snowMound: variants((r) => moundGeo(r, { color: 0xdfe5ec }), 1),
    barricade: variants(barricade, 1),
    pebbles: variants((r) => pebbles(r, { color: rockCol }), 2),
  };
}

// ------------------------------------------------------------ material
export function createPropMaterial() {
  const uniforms = { uTime: { value: 0 }, uWind: { value: new THREE.Vector2(0.5, 0.2) }, uSnow: { value: 0 }, uWet: { value: 0 } };
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0, flatShading: true });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aSway; uniform float uTime; uniform vec2 uWind; varying float vUp;')
      .replace('#include <begin_vertex>', /* glsl */ `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 iPos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        #else
          vec3 iPos = vec3(0.0);
        #endif
        float phase = iPos.x * 0.37 + iPos.z * 0.29;
        float gust = 0.6 + 0.4 * sin(uTime * 0.7 + phase * 0.5);
        float sw = aSway * aSway * 0.045 * length(uWind) * gust;
        transformed.x += sin(uTime * 1.9 + phase) * sw * (0.6 + uWind.x);
        transformed.z += cos(uTime * 1.6 + phase * 1.3) * sw * (0.6 + uWind.y);
      `)
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n vUp = normalize(mat3(modelMatrix) * objectNormal).y;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uSnow, uWet; varying float vUp;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float snowCover = smoothstep(0.5, 0.9, vUp + uSnow * 0.45) * uSnow;
        diffuseColor.rgb = mix(diffuseColor.rgb * (1.0 - uWet * 0.28), vec3(0.88, 0.9, 0.94), snowCover);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.45, uWet * 0.6);');
  };
  material.customProgramCacheKey = () => 'grim-props-v1';
  return { material, uniforms };
}

// ------------------------------------------------------------ placement
const MAP_PROPS = {
  T: (r) => (r() < 0.6 ? 'conifer' : 'broadleaf'),
  R: () => 'boulder',
  '#': () => 'wall',
  U: () => 'ruin',
  P: (r) => (r() < 0.5 ? 'pillar' : 'pillarBroken'),
  G: () => 'grave',
  L: () => 'log',
  B: () => 'bush',
  M: () => 'mound',
  O: () => 'barricade',
};
const MAP_SCALE = { conifer: 0.55, broadleaf: 0.55, boulder: 0.55, bush: 1.1, mound: 1.1, log: 0.45, grave: 1, pillar: 1, pillarBroken: 1, wall: 1, ruin: 1, barricade: 1, deadTree: 0.6 };
const SCATTER_SCALE = { conifer: [0.9, 1.6], broadleaf: [0.85, 1.4], deadTree: [0.8, 1.3], bush: [0.8, 1.5], rock: [0.6, 1.6], boulder: [0.8, 1.5], log: [0.8, 1.2], stump: [0.8, 1.2], pillar: [0.9, 1.1], pillarBroken: [0.8, 1.2], ruin: [0.9, 1.3], grave: [0.9, 1.1], snowMound: [0.8, 2], wall: [1, 1], mound: [0.8, 1.5], barricade: [1, 1] };
const TALL = new Set(['conifer', 'broadleaf', 'deadTree', 'pillar']);

/**
 * Builds every prop instance for the current world.
 * @returns {{group:THREE.Group, obstacles:Array<{x:number,z:number,r:number,kind:string,mesh:THREE.InstancedMesh,index:number,tall:boolean}>}}
 */
export function buildProps({ env, map, heightAt, material, quality }) {
  const kinds = makeKinds(env.ground, env.seed);
  const r = rng(env.seed * 7 + 13);
  const buckets = new Map();
  const obstacles = [];
  const add = (kind, x, z, s, ry, meta = null) => {
    const list = kinds[kind];
    if (!list) return;
    const v = Math.floor(r() * list.length);
    const key = `${kind}:${v}`;
    if (!buckets.has(key)) buckets.set(key, { geo: list[v], items: [] });
    const y = heightAt(x, z) - 0.05;
    buckets.get(key).items.push({ x, y, z, s, ry, meta, kind });
  };
  const W = map.width, H = map.height;
  const hx = W / 2, hz = H / 2;

  // 1. Battle map squares.
  for (let gy = 0; gy < H; gy++) for (let gx = 0; gx < W; gx++) {
    const code = map.rows[gy][gx];
    const pick = MAP_PROPS[code];
    const x = gx - hx + 0.5, z = gy - hz + 0.5;
    if (pick) {
      const kind = pick(r);
      let ry = r() * Math.PI * 2;
      if (kind === 'wall' || kind === 'ruin') ry = (Math.floor(r() * 4) * Math.PI) / 2;
      if (kind === 'log') {
        const horiz = map.rows[gy][gx - 1] === 'L' || map.rows[gy][gx + 1] === 'L';
        ry = horiz ? 0 : Math.PI / 2;
      }
      const s = MAP_SCALE[kind] * (TALL.has(kind) ? 0.9 + r() * 0.25 : 1);
      const cell = [gx, gy];
      add(kind, x + (kind === 'wall' ? 0 : (r() - 0.5) * 0.1), z + (kind === 'wall' ? 0 : (r() - 0.5) * 0.1), s, ry, { map: true, cell });
      obstacles.push({ x, z, r: 0.55, kind, tall: TALL.has(kind) || kind === 'wall', cell });
    } else if (code === ':' && r() < 0.8) add('pebbles', x, z, 1, r() * 6, { map: true });
  }

  // 2. Decorative scatter outside the encounter area.
  const set = SCATTER[env.props] || SCATTER.mixed;
  const totalW = set.reduce((a, [, w]) => a + w, 0);
  const choose = () => { let t = r() * totalW; for (const [k, w] of set) if ((t -= w) <= 0) return k; return set[0][0]; };
  const qualityScale = quality === 'low' ? 0.45 : quality === 'high' ? 1.25 : 0.85;
  const density = env.density;
  const count = Math.round((60 + 520 * density) * qualityScale);
  for (let i = 0; i < count && density > 0; i++) {
    // Rings: dense near the map edge, sparser far away; keep the camera side open.
    const ring = Math.pow(r(), 1.6);
    const ang = r() * Math.PI * 2;
    const rx = hx + 2 + ring * 70, rz = hz + 2 + ring * 70;
    let x = Math.cos(ang) * rx, z = Math.sin(ang) * rz;
    if (Math.abs(x) < hx + 1.2 && Math.abs(z) < hz + 1.2) continue;
    if (z > hz && Math.abs(x) < hx * 0.9 + (z - hz) * 0.6 && z < hz + 40) {
      // Camera corridor: only low props.
      if (r() < 0.75) continue;
      add(r() < 0.5 ? 'rock' : 'bush', x, z, 0.6 + r() * 0.5, r() * 6);
      continue;
    }
    const kind = choose();
    const [lo, hi] = SCATTER_SCALE[kind] || [1, 1];
    add(kind, x, z, lo + r() * (hi - lo), r() * Math.PI * 2);
  }

  // 3. Ground cover: tufts everywhere (incl. inside the map), pebbles on rocky ground.
  const tuftGround = ['grass', 'leaves', 'dirt', 'snow', 'sand'].includes(env.ground);
  if (tuftGround && quality !== 'low') {
    const tufts = Math.round((quality === 'high' ? 2000 : 1100) * (env.ground === 'sand' ? 0.25 : env.ground === 'snow' ? 0.3 : 1));
    for (let i = 0; i < tufts; i++) {
      const inner = r() < 0.45;
      const x = inner ? (r() - 0.5) * W : (r() - 0.5) * (W + 60);
      const z = inner ? (r() - 0.5) * H : (r() - 0.5) * (H + 60);
      const gx = Math.floor(x + hx), gy = Math.floor(z + hz);
      const code = gx >= 0 && gy >= 0 && gx < W && gy < H ? map.rows[gy][gx] : '.';
      if (code === '~' || code === '#') continue;
      add('tuft', x, z, 0.8 + r() * 0.9, r() * 6);
    }
  }
  if (['stone', 'dirt', 'sand', 'blank'].includes(env.ground) || env.props === 'rocks') {
    for (let i = 0; i < 120; i++) add('pebbles', (r() - 0.5) * (W + 30), (r() - 0.5) * (H + 30), 0.8 + r() * 0.6, r() * 6);
  }

  // Build instanced meshes.
  const group = new THREE.Group();
  group.name = 'props';
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  for (const { geo, items } of buckets.values()) {
    const mesh = new THREE.InstancedMesh(geo, material, items.length);
    const kind = items[0].kind;
    mesh.castShadow = kind !== 'tuft' && kind !== 'pebbles';
    mesh.receiveShadow = true;
    mesh.userData.kind = kind;
    mesh.userData.base = [];
    items.forEach((it, i) => {
      e.set(0, it.ry, 0); q.setFromEuler(e); p.set(it.x, it.y, it.z); sc.setScalar(it.s);
      m4.compose(p, q, sc);
      mesh.setMatrixAt(i, m4);
      mesh.userData.base.push(m4.clone());
      if (it.meta?.cell) {
        const ob = obstacles.find((o) => o.cell === it.meta.cell);
        if (ob) { ob.mesh = mesh; ob.index = i; }
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return { group, obstacles, dispose() { for (const list of Object.values(kinds)) for (const g of list) g.dispose(); for (const c of group.children) c.dispose?.(); } };
}
