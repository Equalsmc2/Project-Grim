// Project Grim music: deterministic shared playback. No audio bytes in campaign/Firebase.
import {MUSIC_CATALOG} from './music-catalog.js';
import {getMusicPlaybackUrl} from './music-local.js';
export const TRACKS=Object.freeze(MUSIC_CATALOG.tracks);
export const TRACK_MAP=new Map(TRACKS.map(t=>[t.id,t]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function normalizeMusic(value){
 const raw=value&&typeof value==='object'?value:{};
 return {
  trackId:TRACK_MAP.has(raw.trackId)?raw.trackId:null,
  playlist:typeof raw.playlist==='string' && /^((album|mood):[a-z-]+|all|favorites)$/.test(raw.playlist)?raw.playlist:'all',
  playing:raw.playing===true && TRACK_MAP.has(raw.trackId),
  volume:clamp(Number.isFinite(+raw.volume)?+raw.volume:.52,0,1),
  startedAt:clamp(Number(raw.startedAt)||0,0,4102444800000),
  pausedAt:clamp(Number(raw.pausedAt)||0,0,24*3600),
  repeat:['all','one','off'].includes(raw.repeat)?raw.repeat:'all'
 };
}
export function playlistTracks(playlist,favorites=[]){
 if(playlist.startsWith('album:'))return TRACKS.filter(t=>t.album===playlist.slice(6));
 if(playlist.startsWith('mood:'))return TRACKS.filter(t=>t.folder===playlist.slice(5));
 if(playlist==='favorites')return TRACKS.filter(t=>favorites.includes(t.id));
 return TRACKS;
}
export function resolveMusic(music,now=Date.now(),favorites=[]){
 const m=normalizeMusic(music),selected=TRACK_MAP.get(m.trackId);
 if(!selected)return {track:null,offset:0,ended:false};
 let list=playlistTracks(m.playlist,favorites);
 // Favorites are a local DM view: don't base shared stage playback on local favorites.
 if(m.playlist==='favorites')list=[selected];
 if(!list.find(t=>t.id===selected.id))list=[selected];
 const start=list.findIndex(t=>t.id===selected.id);
 let elapsed=m.playing?Math.max(0,(now-m.startedAt)/1000):m.pausedAt;
 if(m.repeat==='one')return {track:selected,offset:elapsed%Math.max(1,selected.duration),ended:false,index:start,list};
 for(let i=0;i<Math.max(1,list.length*3);i++){
  const index=(start+i)%list.length,track=list[index],duration=Math.max(1,track.duration);
  if(elapsed<duration)return {track,offset:elapsed,ended:false,index,list};
  elapsed-=duration;
  if(index===list.length-1){
   if(m.repeat==='off')return {track:null,offset:0,ended:true,index,list};
   // Large time skips should not create an unbounded loop.
   const total=list.reduce((s,t)=>s+Math.max(1,t.duration),0);
   if(total>0)elapsed%=total;
  }
 }
 return {track:selected,offset:0,ended:false,index:start,list};
}
export function musicSource(track){
 if(!track || !TRACK_MAP.has(track.id))return null;
 return new URL('../../'+track.file,import.meta.url).href;
}
export function formatDuration(seconds){
 const s=Math.max(0,Math.floor(Number(seconds)||0));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
}

export function createMusicPlayer({onStatus=()=>{},onProgress=()=>{},fadeMs=600}={}){
 let enabled=false,music=normalizeMusic(),current=null,fading=null,raf=0,disposed=false,seq=0;
 const status=(type,detail)=>{if(!disposed)onStatus(type,detail);};
 function cleanup(entry){if(!entry)return;entry.audio.pause();entry.audio.removeAttribute('src');entry.audio.load?.();entry.release?.();}
 function clearFade(){if(raf)cancelAnimationFrame(raf);raf=0;}
 function stop(){clearFade();cleanup(fading);fading=null;cleanup(current);current=null;}
 function volumeFade(){
  clearFade();const begin=performance.now();const old=fading?.audio.volume||0;const initial=current?.audio.volume||0;
  function step(now){
   const f=fadeMs<=0?1:Math.min(1,Math.max(0,(now-begin)/fadeMs)),smooth=f*f*(3-2*f);
   if(current)current.audio.volume=clamp(initial+(music.volume-initial)*smooth,0,1);
   if(fading)fading.audio.volume=clamp(old*(1-smooth),0,1);
   if(f<1){raf=requestAnimationFrame(step);}else{raf=0;cleanup(fading);fading=null;}
  }
  raf=requestAnimationFrame(step);
 }
 function sync(next,now=Date.now()){
  music=normalizeMusic(next);
  const result=resolveMusic(music,now);
  const nextTrack=music.playing?result.track:null;
  if(!enabled){return result;}
  if(!nextTrack){if(current||fading)stop();status('off');return result;}
  if(current?.id===nextTrack.id){
   current.audio.loop=music.repeat==='one';
   if(Math.abs((current.audio.volume||0)-music.volume)>.002){current.audio.volume=music.volume;}
   // Set position only when a remote edit creates a genuinely different timeline.
   const elapsed=Math.abs((current.audio.currentTime||0)-result.offset);
   if(elapsed>2.5 && current.audio.readyState>=1){try{current.audio.currentTime=result.offset;}catch{}}
   onProgress(result);return result;
  }
  clearFade();cleanup(fading);fading=current;current=null;
  const audio=new Audio();audio.preload='metadata';audio.loop=music.repeat==='one';audio.volume=0;
  const token=++seq;
  current={audio,id:nextTrack.id,release:null,local:false};
  audio.addEventListener('loadedmetadata',()=>{
   if(disposed||token!==seq||current?.audio!==audio)return;
   const offset=resolveMusic(music,Date.now()).offset;
   if(offset>0.2){try{audio.currentTime=Math.min(offset,Math.max(0,(audio.duration||offset)-.3));}catch{}}
  });
  audio.addEventListener('error',()=>{if(current?.audio===audio)status(current.local&&audio.error?.code===4?'unsupported':'missing',nextTrack);});
  status('loading',nextTrack);
  (async()=>{
   const source=await getMusicPlaybackUrl(nextTrack);
   if(disposed||token!==seq||current?.audio!==audio){source.release();return;}
   current.release=source.release;
   current.local=source.local;
   audio.src=source.url;
   await audio.play();
   if(disposed||token!==seq||current?.audio!==audio)return;
   status('playing',nextTrack);volumeFade();
  })().catch(e=>{
   if(disposed||token!==seq||current?.audio!==audio)return;
   if(e?.name==='NotAllowedError'){enabled=false;stop();status('blocked');}
   else if(e?.name==='NotSupportedError')status('unsupported',nextTrack);
   else status('missing',nextTrack);
  });
  onProgress(result);return result;
 }
 return {
  sync,
  enable(){if(disposed)return;enabled=true;sync(music);},
  disable(){enabled=false;++seq;stop();status('locked');},
  dispose(){disposed=true;++seq;stop();},
  get enabled(){return enabled;},
  get selected(){return music.trackId;},
  get currentTrack(){return current?.id||null;}
 };
}
