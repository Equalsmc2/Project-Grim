// Sky dome: gradient, sun and moon discs, stars, drifting procedural clouds
// and lightning flashes. The horizon colour equals the fog colour so the
// landscape dissolves into the sky without a seam.
import * as THREE from 'three';
import { NOISE } from './glsl.js';

export function createSky() {
  const uniforms = {
    uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uFog: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunCol: { value: new THREE.Color() }, uNight: { value: 0 }, uCloud: { value: 0.2 }, uTime: { value: 0 },
    uWind: { value: new THREE.Vector2(1, 0) }, uFlash: { value: 0 }, uHaze: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main(){
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      uniform vec3 uZenith, uHorizon, uFog, uSunDir, uMoonDir, uSunCol;
      uniform float uNight, uCloud, uTime, uFlash, uHaze; uniform vec2 uWind;
      ${NOISE}
      void main(){
        vec3 d = normalize(vDir);
        float el = d.y;
        float t = pow(clamp(el, 0.0, 1.0), 0.45);
        vec3 col = mix(uHorizon, uZenith, t);
        col = mix(col, uFog, smoothstep(0.08, -0.05, el));
        // Sun glow and disc
        float sd = max(dot(d, uSunDir), 0.0);
        col += uSunCol * (pow(sd, 8.0) * 0.25 + pow(sd, 64.0) * 0.6) * (1.0 - uNight) * (1.0 - uCloud * 0.7);
        col += uSunCol * smoothstep(0.9993, 0.9997, sd) * 3.0 * (1.0 - uNight) * (1.0 - uCloud * 0.95);
        // Moon
        float md = max(dot(d, uMoonDir), 0.0);
        float moon = smoothstep(0.99935, 0.99955, md);
        float crater = g_noise(d.xy * 900.0) * 0.25;
        col += vec3(0.85, 0.9, 1.0) * (moon * (0.9 - crater) + pow(md, 120.0) * 0.18) * uNight * (1.0 - uCloud * 0.8);
        // Stars
        vec3 sp = d * 220.0;
        float star = step(0.9965, g_hash12(floor(sp.xz + sp.y * 13.0)));
        float tw = 0.6 + 0.4 * sin(uTime * 2.0 + g_hash12(floor(sp.xz)) * 40.0);
        col += vec3(0.9, 0.93, 1.0) * star * tw * uNight * smoothstep(0.05, 0.3, el) * (1.0 - uCloud);
        // Clouds on a virtual plane
        if (el > -0.02) {
          vec2 cp = d.xz / max(el + 0.12, 0.05) * 1.4 + uWind * uTime * 0.012;
          float c = g_fbm(cp * 0.55);
          c = smoothstep(1.0 - uCloud * 0.95 - 0.15, 1.08 - uCloud * 0.5, c + uCloud * 0.32);
          vec3 lit = mix(uHorizon * 1.05, uSunCol * 0.9 + uHorizon * 0.4, (1.0 - uNight) * clamp(dot(d, uSunDir) * 0.5 + 0.5, 0.0, 1.0) * 0.6);
          vec3 cc = mix(lit, uFog * 0.75, 0.35 + uCloud * 0.4);
          cc = mix(cc, vec3(0.04, 0.05, 0.07), uNight * 0.65);
          col = mix(col, cc, c * smoothstep(-0.02, 0.12, el) * 0.92);
        }
        col = mix(col, uFog, uHaze * smoothstep(0.5, 0.0, el));
        col += vec3(0.75, 0.8, 1.0) * uFlash * (0.5 + 0.5 * smoothstep(0.0, 0.5, el));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  mesh.name = 'sky';
  return { mesh, uniforms, dispose() { mesh.geometry.dispose(); material.dispose(); } };
}
