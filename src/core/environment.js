// Environment (terrain, sky, weather) settings. Keys and ranges are kept
// compatible with 1.5.8 saves; the new renderer interprets them.
import { clamp, isObj } from './util.js';

export const GROUNDS = ['blank', 'grass', 'stone', 'dirt', 'sand', 'snow', 'leaves'];
export const HILLS = ['flat', 'small', 'mid', 'mountains'];
export const WEATHERS = ['none', 'rain', 'snow', 'leaves', 'dust', 'blizzard', 'sandstorm', 'thunderstorm'];
export const PROP_SETS = ['mixed', 'forest', 'rocks', 'ruins', 'snow', 'grass', 'bushes', 'logs', 'graves'];
export const AMBIENCES = ['none', 'wind', 'storm', 'desert', 'blizzard', 'rain'];
export const DIRECTOR_STYLES = ['follow', 'orbit', 'sweep'];

export const ENV_DEFAULT = Object.freeze({
  preset: 'Blank test stage', ground: 'blank', hills: 'mid',
  timeOfDay: 12, cycleEnabled: false, cycleSpeed: 24, timeEpoch: 0,
  cloudCover: 0.18, accumulation: 0, atmospherePreset: 'Custom',
  ambience: 'none', ambienceVolume: 0.55,
  cinematicPan: false, cinematicSpeed: 1, cinematicStrength: 1.5, cinematicStyle: 'follow',
  variation: 0.35, path: false, pathX: 0, pathZ: 0, pathAngle: 0, pathWidth: 2, pathEdge: 0.4,
  weather: 'none', intensity: 0.5, sway: 0.5, windAngle: 35, windSpeed: 1, fog: 0, density: 0, props: 'mixed',
  terrainWidth: 32, terrainDepth: 20, seed: 7301,
});

const RANGES = {
  variation: [0, 1], pathX: [-7, 7], pathZ: [-4, 4], pathAngle: [-180, 180], pathWidth: [0.5, 6], pathEdge: [0, 1],
  intensity: [0, 1], sway: [0, 1], windAngle: [0, 360], windSpeed: [0, 5], fog: [0, 1], density: [0, 1],
  terrainWidth: [18, 48], terrainDepth: [12, 36], timeOfDay: [0, 24], cycleSpeed: [1, 96], timeEpoch: [0, 9999999999999],
  cloudCover: [0, 1], accumulation: [0, 1], ambienceVolume: [0, 1], cinematicSpeed: [0.35, 2.5], cinematicStrength: [0.4, 2.4],
  seed: [1, 2147483647],
};
const ENUMS = { ground: GROUNDS, hills: HILLS, weather: WEATHERS, props: PROP_SETS, ambience: AMBIENCES, cinematicStyle: DIRECTOR_STYLES };

export const PRESETS = {
  'Blank test stage': { ground: 'blank', hills: 'flat', density: 0, weather: 'none', path: false },
  Forest: { ground: 'grass', hills: 'small', props: 'forest', density: 0.55, weather: 'none', fog: 0.15 },
  Snowfield: { ground: 'snow', hills: 'mid', props: 'snow', weather: 'snow', density: 0.3, fog: 0.15, accumulation: 0.7 },
  Desert: { ground: 'sand', hills: 'small', props: 'rocks', weather: 'dust', density: 0.25, windSpeed: 2 },
  'Stone Road / Path': { ground: 'grass', hills: 'small', props: 'rocks', path: true, pathWidth: 2.5, density: 0.25 },
  Ruins: { ground: 'stone', hills: 'flat', props: 'ruins', density: 0.5, fog: 0.2 },
  'Autumn Field': { ground: 'leaves', hills: 'small', props: 'forest', weather: 'leaves', density: 0.35, path: true },
  Graveyard: { ground: 'dirt', hills: 'small', props: 'graves', density: 0.45, fog: 0.45, timeOfDay: 22 },
};

export const ATMOSPHERES = {
  'Clear Day': { timeOfDay: 12, cloudCover: 0.15, fog: 0.05, weather: 'none' },
  'Golden Dusk': { timeOfDay: 18.4, cloudCover: 0.3, fog: 0.15 },
  'Moonlit Night': { timeOfDay: 23, cloudCover: 0.2, fog: 0.2 },
  Overcast: { timeOfDay: 13, cloudCover: 0.85, fog: 0.25 },
  'Dense Fog': { fog: 0.85, cloudCover: 0.7 },
  Blizzard: { weather: 'blizzard', intensity: 0.8, windSpeed: 3.5, fog: 0.5, cloudCover: 0.9, accumulation: 0.8, ambience: 'blizzard' },
  Sandstorm: { weather: 'sandstorm', intensity: 0.8, windSpeed: 4, fog: 0.45, ambience: 'desert' },
  Thunderstorm: { weather: 'thunderstorm', intensity: 0.8, windSpeed: 2.5, cloudCover: 1, fog: 0.3, timeOfDay: 16, ambience: 'storm' },
};

export function normalizeEnvironment(value) {
  const e = { ...ENV_DEFAULT, ...(isObj(value) ? value : {}) };
  for (const [key, [lo, hi]] of Object.entries(RANGES)) {
    const n = Number(e[key]);
    e[key] = Number.isFinite(n) ? clamp(n, lo, hi) : ENV_DEFAULT[key];
  }
  for (const [key, allowed] of Object.entries(ENUMS)) if (!allowed.includes(e[key])) e[key] = ENV_DEFAULT[key];
  e.path = !!e.path;
  e.cycleEnabled = !!e.cycleEnabled;
  e.cinematicPan = !!e.cinematicPan;
  if (typeof e.preset !== 'string') e.preset = 'Custom';
  if (typeof e.atmospherePreset !== 'string') e.atmospherePreset = 'Custom';
  for (const k of Object.keys(e)) if (!(k in ENV_DEFAULT)) delete e[k];
  return e;
}

/** Loading a biome never resets camera-director choices or the seed. */
export function withPreset(current, name) {
  const prev = normalizeEnvironment(current);
  if (!Object.hasOwn(PRESETS, name)) return prev;
  return normalizeEnvironment({
    ...ENV_DEFAULT, ...PRESETS[name], preset: name, seed: prev.seed,
    cinematicPan: prev.cinematicPan, cinematicSpeed: prev.cinematicSpeed,
    cinematicStrength: prev.cinematicStrength, cinematicStyle: prev.cinematicStyle,
    terrainWidth: prev.terrainWidth, terrainDepth: prev.terrainDepth,
  });
}

export function withAtmosphere(current, name) {
  const prev = normalizeEnvironment(current);
  if (!Object.hasOwn(ATMOSPHERES, name)) return prev;
  return normalizeEnvironment({ ...prev, ...ATMOSPHERES[name], atmospherePreset: name });
}

/** Effective time of day, honoring the optional automatic cycle. */
export function effectiveTime(env, now = Date.now()) {
  if (!env.cycleEnabled || !env.timeEpoch) return env.timeOfDay;
  const hours = ((now - env.timeEpoch) / 3600000) * env.cycleSpeed;
  return (((env.timeOfDay + hours) % 24) + 24) % 24;
}
