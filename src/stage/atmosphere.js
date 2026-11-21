// Time-of-day lighting model. Keyframes are art-directed, then interpolated;
// weather and cloud cover desaturate and darken them.
import * as THREE from 'three';

const K = (h, zenith, horizon, sun, sunI, hemiSky, hemiGround, hemiI, fog, exposure) => ({ h, zenith, horizon, sun, sunI, hemiSky, hemiGround, hemiI, fog, exposure });
// Colors in sRGB hex; converted once.
const KEYS = [
  K(0, 0x05070d, 0x111725, 0x8aa2d8, 0.32, 0x26324c, 0x0b0c10, 0.42, 0x0f141f, 1.05),
  K(4.6, 0x080b14, 0x1b2033, 0x8aa2d8, 0.28, 0x2a3350, 0x0d0e12, 0.42, 0x141927, 1.05),
  K(5.6, 0x1b2340, 0x8e6a62, 0xffa070, 0.6, 0x5a5a78, 0x2a2420, 0.55, 0x5b4c52, 1.0),
  K(6.6, 0x40619a, 0xe0a678, 0xffbd85, 1.6, 0x8f99b5, 0x4a3e30, 0.7, 0x9b8a82, 0.95),
  K(9, 0x3f6fae, 0xa9c3da, 0xfff1dc, 2.6, 0xa9bfd9, 0x52493a, 0.85, 0xa5b5c4, 0.9),
  K(13, 0x386cb0, 0xb3cbe0, 0xfff7ea, 3.0, 0xb4c8e0, 0x56503f, 0.9, 0xadbdcc, 0.88),
  K(16.5, 0x3d68a5, 0xb7c3cf, 0xffe9c8, 2.5, 0xa7b5cb, 0x55493a, 0.82, 0xa9b3bd, 0.9),
  K(18.2, 0x34477a, 0xe39a64, 0xff9850, 1.7, 0x8a7f95, 0x4a3628, 0.7, 0xa47a62, 0.95),
  K(19.2, 0x1d2244, 0x8a4a48, 0xff7445, 0.7, 0x4d4466, 0x261c1a, 0.55, 0x4f3a44, 1.0),
  K(20.3, 0x0a0d1b, 0x232540, 0x8aa2d8, 0.3, 0x2a3150, 0x0d0e12, 0.45, 0x181b2b, 1.05),
  K(24, 0x05070d, 0x111725, 0x8aa2d8, 0.32, 0x26324c, 0x0b0c10, 0.42, 0x0f141f, 1.05),
];
const COLOR_KEYS = ['zenith', 'horizon', 'sun', 'hemiSky', 'hemiGround', 'fog'];
const keys = KEYS.map((k) => {
  const o = { ...k };
  for (const c of COLOR_KEYS) o[c] = new THREE.Color(k[c]);
  return o;
});

const tmp = new THREE.Color();
const grey = new THREE.Color();

/**
 * Returns lighting for an hour (0-24) adjusted by cloud cover, fog and weather.
 * The result object is reused; copy values you need to keep.
 */
const out = { zenith: new THREE.Color(), horizon: new THREE.Color(), sun: new THREE.Color(), hemiSky: new THREE.Color(), hemiGround: new THREE.Color(), fog: new THREE.Color(), sunI: 1, hemiI: 1, exposure: 1, night: 0, sunDir: new THREE.Vector3(), moonDir: new THREE.Vector3(), lightDir: new THREE.Vector3() };
export function sampleAtmosphere(hour, { cloud = 0, fog = 0, storm = 0, tint = null } = {}) {
  hour = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1].h <= hour) i++;
  const a = keys[i], b = keys[i + 1];
  const t = (hour - a.h) / Math.max(0.001, b.h - a.h);
  const s = t * t * (3 - 2 * t);
  for (const c of COLOR_KEYS) out[c].copy(a[c]).lerp(b[c], s);
  out.sunI = a.sunI + (b.sunI - a.sunI) * s;
  out.hemiI = a.hemiI + (b.hemiI - a.hemiI) * s;
  out.exposure = a.exposure + (b.exposure - a.exposure) * s;

  // Sun path: rises at 6, sets at 18, peaks ~62°. Moon is opposite.
  const ang = ((hour - 6) / 12) * Math.PI;
  out.sunDir.set(Math.cos(ang) * 0.85, Math.sin(ang) * 0.88, -0.35).normalize();
  out.moonDir.set(-Math.cos(ang) * 0.8, -Math.sin(ang) * 0.75 + 0.05, -0.5).normalize();
  if (out.moonDir.y < 0.15) out.moonDir.y = 0.15 + (0.15 - out.moonDir.y) * 0.3;
  out.moonDir.normalize();
  out.night = THREE.MathUtils.clamp((0.12 - out.sunDir.y) / 0.3, 0, 1);
  out.lightDir.copy(out.night > 0.5 ? out.moonDir : out.sunDir);
  if (out.lightDir.y < 0.12) { out.lightDir.y = 0.12; out.lightDir.normalize(); }

  // Overcast: flatten towards grey, weaken direct sun, strengthen ambient.
  const overcast = Math.min(1, cloud * 0.85 + storm * 0.5);
  if (overcast > 0) {
    for (const c of ['zenith', 'horizon', 'fog']) {
      const l = out[c].r * 0.3 + out[c].g * 0.55 + out[c].b * 0.15;
      grey.setRGB(l, l * 1.02, l * 1.06);
      out[c].lerp(grey, overcast * 0.75);
      out[c].multiplyScalar(1 - overcast * 0.35);
    }
    out.sunI *= 1 - overcast * 0.78;
    out.hemiI *= 1 + overcast * 0.15;
  }
  if (fog > 0) out.horizon.lerp(out.fog, Math.min(1, fog * 1.2));
  if (tint) { tmp.set(tint); out.fog.lerp(tmp, 0.5); out.horizon.lerp(tmp, 0.45); out.zenith.lerp(tmp, 0.25); }
  return out;
}
