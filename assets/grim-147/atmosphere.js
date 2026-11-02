// Pure atmosphere model. Keeping these calculations separate makes the sky,
// lighting and weather deterministic from the shared campaign state.
export const ATMOSPHERE_PRESETS = Object.freeze({
  'Clear Day':      {timeOfDay:12.5,cycleEnabled:false,cloudCover:.12,fog:.04,weather:'none',intensity:0,windSpeed:.7},
  'Golden Dusk':    {timeOfDay:18.1,cycleEnabled:false,cloudCover:.35,fog:.12,weather:'none',intensity:0,windSpeed:.5},
  'Moonlit Night':  {timeOfDay:0,cycleEnabled:false,cloudCover:.16,fog:.16,weather:'none',intensity:0,windSpeed:.35},
  'Overcast':       {timeOfDay:13,cycleEnabled:false,cloudCover:.91,fog:.24,weather:'none',intensity:0,windSpeed:1.4},
  'Dense Fog':      {timeOfDay:7,cycleEnabled:false,cloudCover:.65,fog:.92,weather:'none',intensity:0,windSpeed:.3},
  'Blizzard':       {timeOfDay:13,cycleEnabled:false,cloudCover:1,fog:.67,weather:'blizzard',intensity:.93,windSpeed:3.4},
  'Sandstorm':      {timeOfDay:15,cycleEnabled:false,cloudCover:.88,fog:.78,weather:'sandstorm',intensity:.9,windSpeed:3.8},
  'Thunderstorm':   {timeOfDay:15,cycleEnabled:false,cloudCover:1,fog:.42,weather:'thunderstorm',intensity:.82,windSpeed:2.7}
});
export const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
export function effectiveTime(e,now=Date.now()){
 const h=Number(e.timeOfDay)||0;
 if(!e.cycleEnabled)return ((h%24)+24)%24;
 const elapsed=Math.max(0,now-(Number(e.timeEpoch)||now))/3600000;
 return ((h+elapsed*(Number(e.cycleSpeed)||24))%24+24)%24;
}
export function stormStrength(e){
 return ['blizzard','sandstorm','thunderstorm'].includes(e.weather)?clamp(e.intensity):0;
}
export function isPrecipitation(e){return ['rain','snow','leaves','dust','blizzard','sandstorm','thunderstorm'].includes(e.weather) && e.intensity>0;}
export function lightAt(hour,cloud=0,weather='none',intensity=0){
 // From astronomical daylight to warm twilight to moonlight; weather further
 // reduces direct sun and shifts ambient tones without darkening HTML cards.
 const phase=Math.PI*(hour-6)/12;
 const solar=Math.sin(phase);
 const daylight=clamp((solar+.08)/.95);
 const twilight=clamp(1-Math.abs(solar)*5)*(solar>-.25?1:.42);
 const cloudDim=1-clamp(cloud)*.53;
 const storm=['blizzard','sandstorm','thunderstorm'].includes(weather)?clamp(intensity):0;
 const direct=Math.max(.02,2.15*Math.pow(daylight,1.6)*cloudDim*(1-storm*.65));
 const moon=Math.max(0,Math.sin(phase+Math.PI))*.55;
 const ambient=clamp(.25+.95*daylight*(1-cloud*.29-storm*.3)+.15*twilight,.22,1.4);
 return {solar,daylight,twilight,direct,moon,ambient,cloudDim,storm};
}
export function skyAt(hour,cloud=0,weather='none',intensity=0){
 const light=lightAt(hour,cloud,weather,intensity);
 const nightTop=[.009,.018,.055], dayTop=[.09,.28,.58];
 const nightHorizon=[.035,.052,.10],dayHorizon=[.49,.67,.79];
 const warm=[.76,.28,.13];
 const mix=(a,b,t)=>a.map((n,i)=>n+(b[i]-n)*t);
 let top=mix(nightTop,dayTop,light.daylight);
 let horizon=mix(nightHorizon,dayHorizon,light.daylight);
 horizon=mix(horizon,warm,light.twilight*.76);
 let haze=clamp(cloud*.57+light.storm*.33);
 let overcast=weather==='sandstorm'?[.50,.31,.16]:[.25,.29,.33];
 top=mix(top,overcast,haze);horizon=mix(horizon,overcast,haze*.77);
 if(weather==='blizzard'){top=mix(top,[.43,.51,.57],light.storm*.5);horizon=mix(horizon,[.58,.65,.70],light.storm*.5);}
 return {top,horizon,light};
}
export function smoothValue(current,target,dt,seconds=1.5){
 return current+(target-current)*(1-Math.exp(-Math.max(0,dt)*4/seconds));
}
