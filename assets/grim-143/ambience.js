// GRIM 1.4.2 — Local media assets, synced selection, gesture-gated playback.
// Files never enter campaign state or Firebase; only the selected ID and gain do.
export const AMBIENCE_TRACKS=Object.freeze({
 none:Object.freeze({label:'Off / Silence',file:null}),
 wind:Object.freeze({label:'Wind blowing',file:'wind.mp3'}),
 storm:Object.freeze({label:'Thunderstorm · Rain & wind',file:'storm.mp3'}),
 desert:Object.freeze({label:'Desert wind · Sandstorm',file:'desert.mp3'}),
 blizzard:Object.freeze({label:'Blizzard · Snow and wind',file:'blizzard.mp3'}),
 rain:Object.freeze({label:'Gentle rain',file:'rain.mp3'})
});
export function normalizeSelection(id){return Object.hasOwn(AMBIENCE_TRACKS,id)?id:'none';}
export function sourceFor(id){const file=AMBIENCE_TRACKS[normalizeSelection(id)].file;return file?new URL('../audio/'+file,import.meta.url).href:null;}
export const formatGain=v=>`${Math.round(Math.max(0,Math.min(1,Number(v)||0))*100)}%`;

// One source at a time, crossfading on changes. A second HTMLAudioElement
// exists only during a transition; no WebAudio graph or audio dependency.
export function createAmbiencePlayer({onStatus=()=>{},fadeMs=850}={}){
 let enabled=false,desired='none',gain=.55,current=null,previous=null,raf=0,sequence=0,dead=false;
 const status=(type,detail='')=>{if(!dead)onStatus(type,detail);};
 const cleanup=entry=>{if(!entry)return;entry.audio.pause();entry.audio.removeAttribute('src');entry.audio.load();};
 const stopFading=()=>{if(raf)cancelAnimationFrame(raf);raf=0;};
 const endPrevious=()=>{cleanup(previous);previous=null;};
 function ramp(){
  stopFading();const start=performance.now();
  const from=current?current.audio.volume:0;
  const fading=previous,oldVolume=fading?.audio.volume||0;
  const duration=Math.max(0,fadeMs);
  function frame(now){
   const u=duration===0?1:Math.min(1,(now-start)/duration),e=u*u*(3-2*u);
   if(current)current.audio.volume=Math.min(1,Math.max(0,from+(gain-from)*e));
   if(fading)fading.audio.volume=Math.max(0,oldVolume*(1-e));
   if(u<1){raf=requestAnimationFrame(frame);}else{raf=0;endPrevious();}
  }
  raf=requestAnimationFrame(frame);
 }
 function apply(){
  if(dead)return;
  if(!enabled){status('locked',desired);return;}
  if(desired==='none'){
   if(current){endPrevious();previous=current;current=null;ramp();}
   else {endPrevious();status('off');}
   status('off');return;
  }
  if(current?.id===desired){ramp();status(current.audio.paused?'loading':'playing',desired);return;}
  stopFading();endPrevious();previous=current;current=null;
  const audio=new Audio();audio.preload='none';audio.loop=true;audio.volume=0;audio.src=sourceFor(desired);
  audio.addEventListener('error',()=>{if(current?.audio===audio)status('error',desired);});
  const id=desired,token=++sequence;
  current={id,audio};
  status('loading',id);
  let attempt;
  try{attempt=audio.play();}catch(error){attempt=Promise.reject(error);}
  Promise.resolve(attempt).then(()=>{
   if(dead||token!==sequence||current?.audio!==audio)return;
   status('playing',id);ramp();
  }).catch(error=>{
   if(dead||token!==sequence||current?.audio!==audio)return;
   cleanup(current);current=null;
   endPrevious();enabled=false;
   status('blocked',error?.name||'Playback unavailable');
  });
 }
 return {
  sync(id,volume){
   const next=normalizeSelection(id),v=Math.min(1,Math.max(0,Number(volume)||0));
   const changed=desired!==next,volChanged=Math.abs(gain-v)>.001;
   desired=next;gain=v;
   if(changed)apply();else if(volChanged&&enabled){if(current)ramp();else if(desired!=='none')apply();}
   return desired;
  },
  enable(){if(dead)return;enabled=true;apply();},
  disable(){enabled=false;++sequence;stopFading();cleanup(current);current=null;endPrevious();status('locked',desired);},
  get enabled(){return enabled;},get track(){return desired;},
  dispose(){dead=true;++sequence;stopFading();cleanup(current);current=null;endPrevious();}
 };
}
