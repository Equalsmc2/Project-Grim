// GPU weather. Particle positions are a pure function of time evaluated in
// the vertex shader, so precipitation costs no CPU per frame. Particles live
// in a box that follows the camera target and wrap seamlessly.
import * as THREE from 'three';

const KINDS = {
  rain: { count: 5200, box: [70, 26, 70], fall: 22, size: 1, streak: 0.55, color: 0xaebdd0, alpha: 0.38, shape: 0 },
  thunderstorm: { count: 7500, box: [70, 26, 70], fall: 28, size: 1, streak: 0.7, color: 0xb8c4d6, alpha: 0.42, shape: 0 },
  snow: { count: 4200, box: [64, 22, 64], fall: 1.6, size: 0.11, streak: 0, color: 0xf4f7fb, alpha: 0.85, shape: 1 },
  blizzard: { count: 9000, box: [60, 20, 60], fall: 3.5, size: 0.09, streak: 0, color: 0xeef3f8, alpha: 0.8, shape: 1 },
  leaves: { count: 700, box: [60, 16, 60], fall: 1.1, size: 0.22, streak: 0, color: 0xb0612a, alpha: 0.95, shape: 2 },
  dust: { count: 2200, box: [64, 10, 64], fall: 0.1, size: 0.5, streak: 0, color: 0xc9ab7c, alpha: 0.16, shape: 3 },
  sandstorm: { count: 6000, box: [60, 12, 60], fall: 0.2, size: 0.55, streak: 0, color: 0xc49a62, alpha: 0.22, shape: 3 },
};

export function createWeather() {
  const group = new THREE.Group();
  group.name = 'weather';
  let current = null;
  const uniforms = {
    uTime: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(1, 1, 1) },
    uFall: { value: 1 }, uWind: { value: new THREE.Vector3() }, uSize: { value: 1 }, uStreak: { value: 0.5 },
    uColor: { value: new THREE.Color() }, uAlpha: { value: 0.5 }, uShape: { value: 0 }, uLight: { value: 1 },
    uPixel: { value: 1 }, uFogColor: { value: new THREE.Color() }, uFogDensity: { value: 0.01 },
  };

  function build(kind, quality) {
    if (current) { group.remove(current); current.geometry.dispose(); current.material.dispose(); current = null; }
    const k = KINDS[kind];
    if (!k) return;
    const scale = quality === 'low' ? 0.35 : quality === 'high' ? 1 : 0.65;
    const n = Math.round(k.count * scale);
    const seeds = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { seeds[i * 4] = Math.random(); seeds[i * 4 + 1] = Math.random(); seeds[i * 4 + 2] = Math.random(); seeds[i * 4 + 3] = Math.random(); }
    let geo, mat;
    const common = /* glsl */ `
      uniform float uTime, uFall, uSize, uStreak, uLight, uPixel, uFogDensity; uniform vec3 uCenter, uBox, uWind;
      attribute vec4 aSeed;
      varying float vFade; varying float vSeed;
      vec3 particlePos(){
        vec3 p = aSeed.xyz * uBox;
        float speed = uFall * (0.75 + aSeed.w * 0.5);
        p.y -= uTime * speed;
        p.xz += uWind.xz * uTime * (0.6 + aSeed.w * 0.6);
        p.x += sin(uTime * (0.6 + aSeed.w) + aSeed.y * 30.0) * 0.4 * (1.0 - uStreak);
        p.z += cos(uTime * (0.5 + aSeed.x) + aSeed.z * 30.0) * 0.4 * (1.0 - uStreak);
        vec3 origin = uCenter - uBox * 0.5;
        p = mod(p - origin, uBox) + origin;
        p.y = mod(p.y - uCenter.y + 2.0, uBox.y) + uCenter.y - 2.0;
        return p;
      }
      float edgeFade(vec3 p){
        vec3 q = abs(p - uCenter) / (uBox * 0.5);
        return 1.0 - smoothstep(0.7, 1.0, max(q.x, q.z));
      }`;
    if (k.shape === 0) {
      // Rain streaks: camera-facing quads stretched along velocity.
      const base = new THREE.PlaneGeometry(1, 1);
      geo = new THREE.InstancedBufferGeometry();
      geo.index = base.index;
      geo.attributes.position = base.attributes.position;
      geo.attributes.uv = base.attributes.uv;
      geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
      geo.instanceCount = n;
      mat = new THREE.ShaderMaterial({
        uniforms, transparent: true, depthWrite: false,
        vertexShader: common + /* glsl */ `
          varying vec2 vUv;
          void main(){
            vec3 p = particlePos();
            vec3 vel = normalize(vec3(uWind.x, -uFall, uWind.z));
            vec3 toCam = normalize(cameraPosition - p);
            vec3 side = normalize(cross(vel, toCam));
            float len = uStreak * (0.8 + aSeed.w * 0.6);
            vec3 wp = p + side * position.x * 0.025 + vel * position.y * len;
            vFade = edgeFade(p); vUv = uv;
            float dist = length(cameraPosition - wp);
            vFade *= exp(-dist * uFogDensity * 1.4) * smoothstep(0.5, 3.0, dist);
            gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; uniform float uAlpha, uLight; varying float vFade; varying vec2 vUv;
          void main(){
            float a = smoothstep(0.0, 0.5, vUv.y) * smoothstep(1.0, 0.6, vUv.y) * (1.0 - abs(vUv.x - 0.5) * 2.0);
            gl_FragColor = vec4(uColor * uLight, a * uAlpha * vFade);
          }`,
      });
      current = new THREE.Mesh(geo, mat);
    } else {
      geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
      mat = new THREE.ShaderMaterial({
        uniforms, transparent: true, depthWrite: false,
        vertexShader: common + /* glsl */ `
          varying float vRot;
          void main(){
            vec3 p = particlePos();
            vFade = edgeFade(p); vSeed = aSeed.w; vRot = uTime * (1.0 + aSeed.x * 3.0) + aSeed.y * 6.28;
            vec4 mv = viewMatrix * vec4(p, 1.0);
            float dist = -mv.z;
            vFade *= exp(-dist * uFogDensity * 1.2) * smoothstep(0.3, 2.0, dist);
            gl_PointSize = clamp(uSize * (0.6 + aSeed.z * 0.8) * uPixel * 900.0 / max(dist, 0.1), 1.0, 64.0);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; uniform float uAlpha, uShape, uLight; varying float vFade; varying float vSeed; varying float vRot;
          void main(){
            vec2 c = gl_PointCoord - 0.5;
            float a;
            vec3 col = uColor;
            if (uShape < 1.5) { a = smoothstep(0.5, 0.15, length(c)); }
            else if (uShape < 2.5) {
              float s = sin(vRot), co = cos(vRot);
              vec2 r = mat2(co, -s, s, co) * c;
              r.x *= 2.1;
              a = smoothstep(0.42, 0.32, length(r));
              col = mix(uColor, vec3(0.55, 0.12, 0.05), vSeed) ;
              col = mix(col, vec3(0.6, 0.45, 0.12), step(0.7, vSeed));
            } else { a = smoothstep(0.5, 0.0, length(c)) * 0.8; }
            if (a < 0.01) discard;
            gl_FragColor = vec4(col * uLight, a * uAlpha * vFade);
          }`,
      });
      current = new THREE.Points(geo, mat);
    }
    current.frustumCulled = false;
    current.renderOrder = 5;
    group.add(current);
    uniforms.uBox.value.set(...k.box);
    uniforms.uFall.value = k.fall;
    uniforms.uSize.value = k.size;
    uniforms.uStreak.value = k.streak;
    uniforms.uColor.value.set(k.color);
    uniforms.uAlpha.value = k.alpha;
    uniforms.uShape.value = k.shape;
  }

  let kindKey = '';
  return {
    group, uniforms,
    set({ weather, intensity, windAngle, windSpeed, quality }) {
      const key = `${weather}:${quality}`;
      if (key !== kindKey) { kindKey = key; build(weather, quality); }
      if (!current) return;
      const n = current.geometry.isInstancedBufferGeometry ? current.geometry : null;
      const total = current.geometry.attributes.aSeed.count;
      const visible = Math.max(1, Math.round(total * (0.25 + intensity * 0.75)));
      if (n) n.instanceCount = visible; else current.geometry.setDrawRange(0, visible);
      const a = (windAngle * Math.PI) / 180;
      const gust = weather === 'blizzard' || weather === 'sandstorm' ? 2.6 : weather === 'thunderstorm' ? 1.6 : 1;
      uniforms.uWind.value.set(Math.cos(a) * windSpeed * gust, 0, Math.sin(a) * windSpeed * gust);
    },
    update(time, center, light, pixelRatio, fogDensity) {
      uniforms.uTime.value = time;
      uniforms.uCenter.value.copy(center);
      uniforms.uLight.value = light;
      uniforms.uPixel.value = pixelRatio;
      uniforms.uFogDensity.value = fogDensity;
    },
    get active() { return !!current; },
    dispose() { if (current) { current.geometry.dispose(); current.material.dispose(); } },
  };
}
