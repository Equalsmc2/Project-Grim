// Device-local quality options. Deliberately not stored in the shared campaign:
// a low-power viewer should not reduce everybody else's rendering quality.
export const GRAPHICS_QUALITY = Object.freeze({
  low: Object.freeze({label:'Low', pixelRatio:1, maxPixels:1000000, shadows:false, shadowSize:512, particleScale:.35}),
  balanced: Object.freeze({label:'Balanced', pixelRatio:1.5, maxPixels:2500000, shadows:true, shadowSize:1024, particleScale:.70}),
  high: Object.freeze({label:'High', pixelRatio:2, maxPixels:4800000, shadows:true, shadowSize:1536, particleScale:1})
});
export const DEFAULT_GRAPHICS_QUALITY = 'balanced';
export function normalizeGraphicsQuality(value){return Object.hasOwn(GRAPHICS_QUALITY,value)?value:DEFAULT_GRAPHICS_QUALITY;}
export function graphicsPixelRatio(quality,width,height,deviceRatio=1){
  const p=GRAPHICS_QUALITY[normalizeGraphicsQuality(quality)];
  return Math.max(.6,Math.min(Number(deviceRatio)||1,p.pixelRatio,Math.sqrt(p.maxPixels/Math.max(1,width*height))));
}
export function weatherParticleCount(type,quality){
  const base=type==='rain'||type==='thunderstorm'?750:type==='snow'||type==='blizzard'?550:type==='dust'||type==='sandstorm'?440:320;
  return Math.max(60,Math.round(base*GRAPHICS_QUALITY[normalizeGraphicsQuality(quality)].particleScale));
}
