// Shared GLSL snippets. Value noise + fbm + voronoi, cheap enough for terrain
// and card shaders on integrated GPUs.
export const NOISE = /* glsl */ `
float g_hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 g_hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float g_noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(g_hash12(i), g_hash12(i + vec2(1,0)), u.x), mix(g_hash12(i + vec2(0,1)), g_hash12(i + vec2(1,1)), u.x), u.y);
}
float g_fbm(vec2 p){
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++){ v += a * g_noise(p); p = r * p * 2.03; a *= 0.5; }
  return v;
}
// Returns (distance to nearest edge, cell id hash)
vec2 g_voronoi(vec2 x){
  vec2 n = floor(x), f = fract(x);
  vec2 mg, mr; float md = 8.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 g = vec2(float(i), float(j));
    vec2 o = g_hash22(n + g);
    vec2 r = g + o - f;
    float d = dot(r, r);
    if (d < md){ md = d; mr = r; mg = g; }
  }
  md = 8.0;
  for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++){
    vec2 g = mg + vec2(float(i), float(j));
    vec2 o = g_hash22(n + g);
    vec2 r = g + o - f;
    if (dot(mr - r, mr - r) > 0.00001) md = min(md, dot(0.5 * (mr + r), normalize(r - mr)));
  }
  return vec2(md, g_hash12(n + mg));
}
`;

/** JS mirror of the value noise so CPU height queries match the mesh. */
export function makeNoise(seed = 1) {
  const s = (seed % 9973) * 1.37;
  const hash = (x, y) => {
    let h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453123;
    return h - Math.floor(h);
  };
  const noise = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };
  const fbm = (x, y, oct = 4) => {
    let v = 0, a = 0.5, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) {
      v += a * noise(x * f + i * 17.3, y * f - i * 9.1);
      norm += a; a *= 0.5; f *= 2.03;
    }
    return v / norm;
  };
  return { noise, fbm };
}
