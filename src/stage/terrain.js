// Terrain: one continuous heightfield. The encounter area (the active battle
// map, one unit per 5-ft square) is gently undulating; the landscape around
// it rises into hills and fades into fog. All ground appearance — ground
// type blending, wetness, snow, paths, water/difficult squares and the
// tactical grid — is computed in the terrain shader, so slider changes never
// rebuild geometry.
import * as THREE from 'three';
import { NOISE, makeNoise } from './glsl.js';

export const GROUND_PALETTES = {
  blank: { c0: 0x3b3b3e, c1: 0x434346, c2: 0x313133, rock: 0x4a4a4d, path: 0x2d2d2f, detail: 0.15 },
  grass: { c0: 0x46552a, c1: 0x5a6731, c2: 0x353f20, rock: 0x5d5a52, path: 0x5f4f3a, detail: 1 },
  stone: { c0: 0x55524d, c1: 0x625f58, c2: 0x45433f, rock: 0x5f5c57, path: 0x3e3b37, detail: 1 },
  dirt: { c0: 0x574533, c1: 0x67523b, c2: 0x45372a, rock: 0x5b5650, path: 0x3e3226, detail: 1 },
  sand: { c0: 0xae946a, c1: 0xbea476, c2: 0x977d57, rock: 0x8f7a5e, path: 0x8a7350, detail: 0.8 },
  snow: { c0: 0xd3d9e0, c1: 0xe4e9ee, c2: 0xbcc4ce, rock: 0x5c606a, path: 0x9da3ab, detail: 0.7 },
  leaves: { c0: 0x5e4325, c1: 0x7d5022, c2: 0x463420, rock: 0x5b5750, path: 0x4e3d2b, detail: 1 },
};

const HILLS = {
  flat: { inner: 0.04, outer: 1.2 },
  small: { inner: 0.22, outer: 4.5 },
  mid: { inner: 0.32, outer: 10 },
  mountains: { inner: 0.42, outer: 22 },
};

export const TERRAIN_SIZE = 320;

/** Height function shared by geometry, props and cards. */
export function makeHeightField({ seed = 1, hills = 'mid', mapW = 32, mapH = 20, path = null }) {
  const { fbm } = makeNoise(seed);
  const h = HILLS[hills] || HILLS.mid;
  const hw = mapW / 2 + 1.5, hh = mapH / 2 + 1.5;
  const pathDir = path ? new THREE.Vector2(Math.cos((path.angle * Math.PI) / 180), Math.sin((path.angle * Math.PI) / 180)) : null;
  return function heightAt(x, z) {
    const dx = Math.max(Math.abs(x) - hw, 0), dz = Math.max(Math.abs(z) - hh, 0);
    const d = Math.hypot(dx, dz);
    let inner = (fbm(x * 0.09 + 3.1, z * 0.09 - 1.7, 3) - 0.5) * 2 * h.inner;
    if (pathDir) {
      const px = x - path.x, pz = z - path.z;
      const across = Math.abs(px * -pathDir.y + pz * pathDir.x);
      inner *= THREE.MathUtils.smoothstep(across, path.width * 0.5, path.width * 0.5 + 2);
    }
    // Keep the foreground (camera side, +Z) low so hills never block the cinematic view.
    const front = z > hh ? THREE.MathUtils.smoothstep(d, 28, 70) : 1;
    const rise = THREE.MathUtils.smoothstep(d, 0, 26) * front;
    const n = fbm(x * 0.022 + 11.3, z * 0.022 - 4.2, 4);
    const ridge = 1 - Math.abs(fbm(x * 0.012 - 7.7, z * 0.012 + 2.9, 3) * 2 - 1);
    const far = THREE.MathUtils.smoothstep(Math.hypot(x, z), 55, 140);
    const outer = (Math.pow(n, 1.4) * 1.3 * rise + ridge * ridge * far * 1.6) * h.outer;
    // The far side of the encounter rises gently, so foes stand on higher ground.
    const tilt = THREE.MathUtils.clamp(-z, -hh, hh) * 0.075;
    return inner + outer + tilt;
  };
}

export function createTerrain({ quality = 'balanced' } = {}) {
  const uniforms = {
    uC0: { value: new THREE.Color() }, uC1: { value: new THREE.Color() }, uC2: { value: new THREE.Color() },
    uRock: { value: new THREE.Color() }, uPathCol: { value: new THREE.Color() }, uDetail: { value: 1 },
    uLeaves: { value: 0 }, uStone: { value: 0 }, uSand: { value: 0 },
    uWet: { value: 0 }, uSnow: { value: 0 }, uTime: { value: 0 },
    uMap: { value: new THREE.Vector2(32, 20) }, uGrid: { value: 0 }, uFocus: { value: 0 },
    uCells: { value: null },
    uHover: { value: new THREE.Vector3(-1, -1, 0) }, uSelect: { value: new THREE.Vector3(-1, -1, 0) },
    uPath: { value: new THREE.Vector4(0, 0, 1, 0) }, uPathOn: { value: 0 }, uPathWidth: { value: 2 }, uPathEdge: { value: 0.4 },
    uVariation: { value: 0.35 },
  };
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGWorld;\nvarying vec3 vGNormal;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vec4 gW = modelMatrix * vec4(transformed, 1.0); vGWorld = gW.xyz; vGNormal = normalize(mat3(modelMatrix) * objectNormal);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vGWorld; varying vec3 vGNormal;
uniform vec3 uC0, uC1, uC2, uRock, uPathCol; uniform float uDetail, uLeaves, uStone, uSand;
uniform float uWet, uSnow, uTime, uGrid, uFocus, uPathOn, uPathWidth, uPathEdge, uVariation;
uniform vec2 uMap; uniform sampler2D uCells; uniform vec3 uHover, uSelect; uniform vec4 uPath;
${NOISE}
float gRough = 0.92; float gWater = 0.0; vec3 gBump = vec3(0.0);
`)
      .replace('#include <color_fragment>', /* glsl */ `
  vec2 wp = vGWorld.xz;
  float macro = g_fbm(wp * 0.045);
  float mid = g_fbm(wp * 0.21 + 7.3);
  float fine = g_noise(wp * 1.9);
  vec3 ground = mix(uC0, uC1, smoothstep(0.3, 0.7, macro + (mid - 0.5) * 0.6 * uVariation * 2.0));
  ground = mix(ground, uC2, smoothstep(0.55, 0.85, mid) * 0.7 * uDetail);
  ground *= 0.9 + fine * 0.2 * uDetail;
  // Autumn speckle / sand ripples / cobbles depending on ground type.
  if (uLeaves > 0.5) { float sp = g_noise(wp * 3.7); ground = mix(ground, vec3(0.62, 0.23, 0.08), smoothstep(0.72, 0.9, sp) * 0.6); ground = mix(ground, vec3(0.7, 0.5, 0.12), smoothstep(0.78, 0.95, g_noise(wp * 4.3 + 9.0)) * 0.5); }
  if (uSand > 0.5) { ground *= 0.94 + 0.08 * sin(dot(wp, vec2(0.9, 0.4)) * 6.0 + g_noise(wp * 0.6) * 4.0); }
  if (uStone > 0.5) { vec2 vor = g_voronoi(wp * 1.4); ground *= mix(0.62, 1.05, smoothstep(0.02, 0.09, vor.x)) * (0.9 + vor.y * 0.2); gBump.xz += (vor.x < 0.06 ? 1.0 : 0.0) * vec2(0.0); }
  // Slope rock.
  float slope = 1.0 - clamp(vGNormal.y, 0.0, 1.0);
  ground = mix(ground, uRock * (0.85 + fine * 0.3), smoothstep(0.28, 0.5, slope));
  // Path.
  if (uPathOn > 0.5) {
    vec2 pd = vec2(uPath.z, uPath.w); vec2 rel = wp - uPath.xy;
    float across = abs(dot(rel, vec2(-pd.y, pd.x))) + (g_noise(wp * 0.8) - 0.5) * 0.6;
    float edge = 1.0 - smoothstep(uPathWidth * 0.5 - 0.35, uPathWidth * 0.5 + 0.35 + uPathEdge, across);
    vec2 vp = g_voronoi(wp * 2.2);
    vec3 pc = uPathCol * mix(0.65, 1.1, smoothstep(0.03, 0.12, vp.x)) * (0.85 + vp.y * 0.3);
    ground = mix(ground, pc, edge);
  }
  // Encounter-area cells: 0 floor, 1 difficult, 2 water, 3 obstacle footing.
  vec2 cellF = wp + uMap * 0.5;
  bool inMap = cellF.x >= 0.0 && cellF.y >= 0.0 && cellF.x < uMap.x && cellF.y < uMap.y;
  if (inMap) {
    float kind = floor(texture2D(uCells, (floor(cellF) + 0.5) / uMap).r * 255.0 + 0.5);
    vec2 inCell = fract(cellF);
    float soft = smoothstep(0.0, 0.18, min(min(inCell.x, 1.0 - inCell.x), min(inCell.y, 1.0 - inCell.y)));
    if (kind == 1.0) { float rub = g_voronoi(wp * 5.0).x; ground = mix(ground, ground * 0.62 + vec3(0.04, 0.03, 0.02), 0.55 * (0.4 + 0.6 * soft)); ground *= mix(0.75, 1.0, smoothstep(0.02, 0.08, rub)); }
    if (kind == 2.0) { gWater = 0.35 + 0.65 * soft; }
    if (kind == 3.0) { ground *= 0.82; }
  }
  // Wetness: darker, glossier, with puddles in low noise.
  float puddle = smoothstep(0.62, 0.7, g_fbm(wp * 0.16 + 31.0)) * uWet;
  ground *= 1.0 - uWet * 0.32;
  gWater = max(gWater, puddle * 0.8);
  gRough = mix(0.93, 0.5, uWet * 0.6);
  // Snow settles on flat ground first.
  float snowMask = smoothstep(0.35, 0.75, uSnow * 1.25 + (vGNormal.y - 0.85) * 1.6 + (mid - 0.5) * 0.5);
  ground = mix(ground, vec3(0.86, 0.89, 0.93) * (0.95 + fine * 0.07), snowMask);
  gRough = mix(gRough, 0.8, snowMask);
  // Water.
  if (gWater > 0.0) {
    vec3 water = vec3(0.025, 0.045, 0.06);
    ground = mix(ground, water, gWater);
    gRough = mix(gRough, 0.38, gWater);
    float t = uTime * 0.6;
    gBump.xz += (vec2(g_noise(wp * 3.0 + t), g_noise(wp * 3.0 - t + 4.0)) - 0.5) * 0.25 * gWater;
  }
  // Tactical grid, drawn on the ground so it follows the terrain.
  if (uGrid > 0.001) {
    vec2 fw = fwidth(cellF);
    vec2 g = abs(fract(cellF) - 0.5);
    vec2 lines = smoothstep(vec2(0.5) - fw * 1.3, vec2(0.5), g);
    float line = inMap ? max(lines.x, lines.y) : 0.0;
    float far = clamp(1.0 - max(fw.x, fw.y) * 2.5, 0.0, 1.0);
    ground = mix(ground, ground * 0.45, line * 0.6 * uGrid * far);
    ground = mix(ground, vec3(0.93, 0.89, 0.8), line * 0.13 * uGrid * far);
    if (!inMap) ground *= 1.0 - uFocus * 0.28;
    vec2 bd = min(cellF, uMap - cellF);
    float border = inMap ? 1.0 - smoothstep(0.0, 0.08 + fw.x, min(bd.x, bd.y)) : 0.0;
    ground = mix(ground, vec3(0.85, 0.62, 0.32), border * uGrid * 0.7);
  }
  // Hovered and selected squares.
  vec2 cellI = floor(cellF);
  if (uHover.z > 0.0 && cellI == uHover.xy) { vec2 ic = abs(fract(cellF) - 0.5); float ring = smoothstep(0.38, 0.47, max(ic.x, ic.y)); ground = mix(ground, vec3(0.95, 0.92, 0.85), 0.12 * uHover.z + ring * 0.55 * uHover.z); }
  if (uSelect.z > 0.0 && cellI == uSelect.xy) { vec2 ic = abs(fract(cellF) - 0.5); float ring = smoothstep(0.36, 0.46, max(ic.x, ic.y)); ground = mix(ground, vec3(0.95, 0.6, 0.25), 0.15 * uSelect.z + ring * 0.7 * uSelect.z); }
  diffuseColor.rgb = ground;
`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = gRough;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  {
    vec2 wq = vGWorld.xz;
    float e = 0.08;
    float b0 = g_noise(wq * 2.6), bx = g_noise((wq + vec2(e, 0.0)) * 2.6), bz = g_noise((wq + vec2(0.0, e)) * 2.6);
    vec3 pert = vec3(-(bx - b0), 0.0, -(bz - b0)) * (0.9 * uDetail) + gBump;
    normal = normalize(normal + (viewMatrix * vec4(pert, 0.0)).xyz);
  }`);
  };
  material.customProgramCacheKey = () => 'grim-terrain-v1';

  const seg = quality === 'low' ? 150 : quality === 'high' ? 280 : 220;
  let mesh = null;
  let heightAt = () => 0;
  let cellsTex = null;
  const group = new THREE.Group();
  group.name = 'terrain';

  function build({ seed, hills, mapW, mapH, path }) {
    heightAt = makeHeightField({ seed, hills, mapW, mapH, path });
    const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
    geo.computeVertexNormals();
    if (mesh) { group.remove(mesh); mesh.geometry.dispose(); }
    mesh = new THREE.Mesh(geo, material);
    mesh.receiveShadow = true;
    mesh.name = 'ground';
    group.add(mesh);
    uniforms.uMap.value.set(mapW, mapH);
  }

  function setCells(map) {
    const w = map.width, h = map.height;
    const data = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const code = map.rows[y][x];
      const kind = code === ':' ? 1 : code === '~' ? 2 : '#ORPULG'.includes(code) ? 3 : 0;
      data[(y * w + x) * 4] = kind;
    }
    cellsTex?.dispose();
    cellsTex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
    cellsTex.magFilter = THREE.NearestFilter;
    cellsTex.minFilter = THREE.NearestFilter;
    cellsTex.needsUpdate = true;
    uniforms.uCells.value = cellsTex;
  }

  function setGround(ground, env) {
    const p = GROUND_PALETTES[ground] || GROUND_PALETTES.grass;
    uniforms.uC0.value.set(p.c0); uniforms.uC1.value.set(p.c1); uniforms.uC2.value.set(p.c2);
    uniforms.uRock.value.set(p.rock); uniforms.uPathCol.value.set(p.path);
    uniforms.uDetail.value = p.detail;
    uniforms.uLeaves.value = ground === 'leaves' ? 1 : 0;
    uniforms.uStone.value = ground === 'stone' ? 1 : 0;
    uniforms.uSand.value = ground === 'sand' ? 1 : 0;
    uniforms.uVariation.value = env.variation;
    const a = (env.pathAngle * Math.PI) / 180;
    uniforms.uPath.value.set(env.pathX, env.pathZ, Math.cos(a), Math.sin(a));
    uniforms.uPathOn.value = env.path ? 1 : 0;
    uniforms.uPathWidth.value = env.pathWidth;
    uniforms.uPathEdge.value = env.pathEdge;
  }

  return {
    group, uniforms, material,
    build, setCells, setGround,
    heightAt: (x, z) => heightAt(x, z),
    get mesh() { return mesh; },
    dispose() { mesh?.geometry.dispose(); material.dispose(); cellsTex?.dispose(); },
  };
}
