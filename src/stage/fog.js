// Height fog for every built-in material. Fog thickens in valleys and near
// the ground and thins with altitude, which reads far more atmospheric than
// uniform distance fog. Installed once, before any material compiles.
import * as THREE from 'three';

let installed = false;
export const FOG_PARAMS = { base: 0.0, falloff: 0.11 };

export function installHeightFog() {
  if (installed) return;
  installed = true;
  const C = THREE.ShaderChunk;
  C.fog_pars_vertex = `#ifdef USE_FOG\n varying float vFogDepth;\n varying vec3 vFogWorld;\n#endif`;
  C.fog_vertex = `#ifdef USE_FOG
  vFogDepth = - mvPosition.z;
  vec4 fogW = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    fogW = instanceMatrix * fogW;
  #endif
  vFogWorld = (modelMatrix * fogW).xyz;
#endif`;
  C.fog_pars_fragment = `#ifdef USE_FOG
  uniform vec3 fogColor;
  varying float vFogDepth;
  varying vec3 vFogWorld;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
#endif`;
  C.fog_fragment = `#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogDist = length(vFogWorld - cameraPosition);
    float hfac = exp(-max(vFogWorld.y - ${FOG_PARAMS.base.toFixed(2)}, 0.0) * ${FOG_PARAMS.falloff.toFixed(3)});
    float fogFactor = 1.0 - exp(-fogDensity * fogDensity * fogDist * fogDist * (0.35 + 0.65 * hfac) - fogDensity * 0.35 * fogDist * hfac);
  #else
    float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
  #endif
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, clamp(fogFactor, 0.0, 1.0));
#endif`;
}
