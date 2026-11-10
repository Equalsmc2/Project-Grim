import {getState,updateState,subscribe,escapeHtml} from './state.js';
import {MUSIC_CATALOG} from './music-catalog.js';
import {TRACKS,TRACK_MAP,playlistTracks,resolveMusic,formatDuration,createMusicPlayer} from './music-playback.js';
import {getMusicPlaybackUrl,importMusicArchives,musicArchiveStatus,clearMusicArchives} from './music-local.js';

const $=id=>document.getElementById(id);
const albums=new Map(MUSIC_CATALOG.albums.map(a=>[a.id,a]));
const folders=[{id:'all',name:'All tracks',type:'all',count:TRACKS.length},
 ...MUSIC_CATALOG.albums.map(a=>({id:'album:'+a.id,name:a.name,type:'album',count:a.tracks})),
 ...MUSIC_CATALOG.folders.map(f=>({id:'mood:'+f.id,name:f.name,type:'mood',count:TRACKS.filter(t=>t.folder===f.id).length})),
 {id:'favorites',name:'Favorites',type:'favorites',count:0}];
let currentFolder='all',query='',favorites=new Set(),preview=null,previewSource=null,previewToken=0,monitorEnabled=false,shuffle=false,renderedTracksKey=null;
try{favorites=new Set(JSON.parse(localStorage.getItem('grim:music:favorites')||'[]').filter(x=>TRACK_MAP.has(x)));}catch{}
try{shuffle=localStorage.getItem('grim:music:shuffle')==='1';}catch{}
const monitor=createMusicPlayer({onStatus:(type,t)=>{
 if(type==='missing')$('musicNotice').textContent='Track unavailable. Load its soundtrack ZIP into this browser, or install it on a private local server.';
 else if(type==='unsupported')$('musicNotice').textContent='This browser cannot decode the selected audio. Try Chrome or Edge.';
 else if(type==='blocked')$('musicNotice').textContent='Browser blocked playback; click Monitor again.';
 else if(type==='playing')$('musicNotice').textContent='DM monitor on · shared stage remains independently controlled';
}});
const favoritesList=()=>[...favorites];
const allForFolder=()=>playlistTracks(currentFolder,favoritesList());
const labelForFolder=f=>folders.find(x=>x.id===f)?.name||'All tracks';
function selectFolder(folder){
 currentFolder=folders.some(f=>f.id===folder)?folder:'all';
 renderFolders();renderTracks();
}
function renderFolders(){
 const el=$('musicFolders');
 const groups=[['LIBRARY',folders.filter(f=>f.type==='all'||f.type==='album')],['BY SCENE',folders.filter(f=>f.type==='mood')],['PERSONAL',folders.filter(f=>f.type==='favorites')]];
 el.innerHTML=groups.map(([label,rows])=>`<div class="music-group-label">${label}</div>`+rows.map(f=>`<button class="music-folder ${f.id===currentFolder?'selected':''}" data-folder="${f.id}" aria-pressed="${f.id===currentFolder}"><span>${escapeHtml(f.name)}</span><small>${f.type==='favorites'?favorites.size:f.count}</small></button>`).join('')).join('');
}
function renderTracks(){
 const list=allForFolder().filter(t=>[t.title,albums.get(t.album)?.name,t.folder].some(x=>x?.toLowerCase().includes(query)));
 $('musicFolderTitle').textContent=labelForFolder(currentFolder);
 $('musicCount').textContent=`${list.length} tracks`;
 const now=resolveMusic(getState().music);
 const renderKey=JSON.stringify([currentFolder,query,[...favorites].sort(),now.track?.id]);
 if(renderKey===renderedTracksKey)return;
 renderedTracksKey=renderKey;
 $('musicTracks').innerHTML=list.map(t=>`<div class="music-track ${now.track?.id===t.id?'now':''}" data-track="${escapeHtml(t.id)}">
 <button type="button" class="music-track-play" data-play="${escapeHtml(t.id)}" title="Play ${escapeHtml(t.title)} on stage"><span class="music-track-no">${String(t.number).padStart(2,'0')}</span><span class="music-track-info"><strong>${escapeHtml(t.title)}</strong><small>${escapeHtml(albums.get(t.album)?.name||'')} · ${escapeHtml(t.folder.replaceAll('-',' '))}</small></span></button>
 <span class="music-track-time">${formatDuration(t.duration)}</span>
 <button type="button" class="music-track-action" data-preview="${escapeHtml(t.id)}" title="Preview locally without changing the stage" aria-label="Preview ${escapeHtml(t.title)} locally">▶</button>
 <button type="button" class="music-track-action ${favorites.has(t.id)?'favorite':''}" data-fav="${escapeHtml(t.id)}" aria-label="${favorites.has(t.id)?'Remove from':'Add to'} favorites" title="Favorite">${favorites.has(t.id)?'★':'☆'}</button>
 </div>`).join('')||'<p class="music-empty">No tracks found in this folder.</p>';
}
function change(next,description){updateState(s=>{s.music={...s.music,...next};},description);}
function publishTrack(track){
 const playlist=currentFolder==='all'?'all':currentFolder;
 change({trackId:track.id,playlist,playing:true,startedAt:Date.now(),pausedAt:0},`Music: ${track.title}`);
 renderTracks();
}
function chooseAdjacent(dir){
 const s=getState(),m=s.music,position=resolveMusic(m),list=position.list||allForFolder();
 if(!list.length)return;
 const idx=position.index??Math.max(0,list.findIndex(x=>x.id===m?.trackId));
 const target=shuffle?list[Math.floor(Math.random()*list.length)]:list[(idx+dir+list.length)%list.length];
 if(target)change({trackId:target.id,playing:true,startedAt:Date.now(),pausedAt:0},`Music: ${target.title}`);
}
async function cuePreview(track){
 const token=++previewToken;
 if(preview){preview.pause();preview.removeAttribute('src');preview.load();preview=null;}
 if(previewSource){previewSource.release();previewSource=null;}
 if(!track){$('musicPreviewState').textContent='Preview stopped';return;}
 $('musicPreviewState').textContent='Loading '+track.title+'…';
 try{
  const source=await getMusicPlaybackUrl(track);
  if(token!==previewToken){source.release();return;}
  previewSource=source;
  const audio=new Audio();audio.src=source.url;audio.volume=.55;audio.preload='metadata';
  preview=audio;
  $('musicPreviewState').textContent='Previewing '+track.title;
  audio.onended=()=>{if(preview===audio)cuePreview(null);};
  audio.onerror=()=>{if(preview===audio){cuePreview(null);$('musicPreviewState').textContent='Track unavailable · load its ZIP';}};
  await audio.play();
 }catch(error){
  if(token===previewToken){cuePreview(null);$('musicPreviewState').textContent=error?.name==='NotAllowedError'?'Click Preview to allow sound':'Cannot play this track: '+(error?.message||'unknown error');}
 }
}
async function refreshMusicImports(){
 try{
  const status=await musicArchiveStatus();
  $('musicLocalStatus').textContent=status.tracks+' / '+TRACKS.length+' tracks stored in this browser';
 }catch(error){$('musicLocalStatus').textContent='Local music storage unavailable: '+(error?.message||error);}
}
function bindMusicImports(){
 const input=$('musicArchiveInput'),clear=$('musicArchiveClear'),status=$('musicLocalStatus');
 input.addEventListener('change',async()=>{
  if(!input.files?.length)return;
  input.disabled=true;clear.disabled=true;
  try{
   const result=await importMusicArchives(input.files,message=>{status.textContent=message;});
   await refreshMusicImports();
   const message=result.albums.length?'Loaded '+result.tracks+' tracks ('+result.albums.join(', ')+')':'No soundtracks loaded';
   $('musicNotice').textContent=message+(result.errors.length?' · '+result.errors.join('; '):'');
   if(monitorEnabled){monitor.disable();monitor.enable();monitor.sync(getState().music);}
  }catch(error){$('musicNotice').textContent='Import failed: '+(error?.message||String(error));}
  finally{input.value='';input.disabled=false;clear.disabled=false;}
 });
 clear.addEventListener('click',async()=>{
  if(!window.confirm('Remove locally stored soundtrack ZIPs from this browser?'))return;
  try{await clearMusicArchives();await refreshMusicImports();$('musicNotice').textContent='Local soundtrack ZIPs removed.';}
  catch(error){$('musicNotice').textContent='Cannot clear local music: '+(error?.message||String(error));}
 });
 refreshMusicImports();
}
function renderNow(){
 const state=getState(),m=state.music||{},position=resolveMusic(m),selected=TRACK_MAP.get(m.trackId),shown=position.track||selected;
 $('musicNowTitle').textContent=shown?.title||'Nothing playing';
 $('musicNowAlbum').textContent=shown?albums.get(shown.album)?.name:'Select a track to begin';
 $('musicNowTime').textContent=shown?`${formatDuration(position.offset)} / ${formatDuration(shown.duration)}`:'0:00 / 0:00';
 if(document.activeElement!==$('musicProgress'))$('musicProgress').value=shown?Math.round(position.offset/Math.max(1,shown.duration)*1000):0;
 $('musicTogglePlay').textContent=m.playing?'Ⅱ Pause':'▶ Play';
 $('musicRepeat').textContent='Repeat: '+(m.repeat==='one'?'One':m.repeat==='off'?'Off':'Folder');
 $('musicVolume').value=Math.round((m.volume??.52)*100);
 $('musicVolumeValue').textContent=Math.round((m.volume??.52)*100)+'%';
 $('musicShuffle').setAttribute('aria-pressed',String(shuffle));
 $('musicShuffle').classList.toggle('selected',shuffle);
}
export function initMusicLibrary(){
 bindMusicImports();
 $('musicSearch').addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();renderTracks();});
 $('musicFolders').addEventListener('click',e=>{const b=e.target.closest('[data-folder]');if(b)selectFolder(b.dataset.folder);});
 $('musicTracks').addEventListener('click',e=>{
  const play=e.target.closest('[data-play]'),fav=e.target.closest('[data-fav]'),pre=e.target.closest('[data-preview]');
  if(fav){const id=fav.dataset.fav;if(favorites.has(id))favorites.delete(id);else favorites.add(id);try{localStorage.setItem('grim:music:favorites',JSON.stringify(favoritesList()));}catch{}renderFolders();renderTracks();return;}
  if(pre){const track=TRACK_MAP.get(pre.dataset.preview);if(track)cuePreview(track);return;}
  const track=TRACK_MAP.get(play?.dataset.play);if(track)publishTrack(track);
 });
 $('musicPreviewStop').addEventListener('click',()=>cuePreview(null));
 $('musicTogglePlay').addEventListener('click',()=>{
  const m=getState().music;if(!m?.trackId){const first=allForFolder()[0];if(first)publishTrack(first);return;}
  if(m.playing){const elapsed=Math.max(0,(Date.now()-m.startedAt)/1000);change({playing:false,pausedAt:elapsed},'Music paused');}
  else change({playing:true,startedAt:Date.now()-Math.max(0,m.pausedAt)*1000,pausedAt:0},'Music playing');
 });
 $('musicStop').addEventListener('click',()=>change({playing:false,pausedAt:0},'Music stopped'));
 $('musicNext').addEventListener('click',()=>chooseAdjacent(1));
 $('musicPrev').addEventListener('click',()=>chooseAdjacent(-1));
 $('musicShuffle').addEventListener('click',()=>{shuffle=!shuffle;try{localStorage.setItem('grim:music:shuffle',shuffle?'1':'0');}catch{}renderNow();});
 $('musicRepeat').addEventListener('click',()=>{const m=getState().music;const next={all:'one',one:'off',off:'all'}[m.repeat]||'all';change({repeat:next},'Music repeat changed');});
 $('musicVolume').addEventListener('input',e=>change({volume:Number(e.target.value)/100}));
 $('musicProgress').addEventListener('change',e=>{
  const pos=resolveMusic(getState().music),track=pos.track||TRACK_MAP.get(getState().music?.trackId);
  if(!track)return;
  const offset=Math.max(0,Math.min(track.duration-.5,Number(e.target.value)/1000*track.duration));
  change({trackId:track.id,startedAt:Date.now()-offset*1000,pausedAt:offset},'Music seek');
 });
 $('musicMonitor').addEventListener('change',e=>{
  monitorEnabled=e.target.checked;
  if(monitorEnabled){monitor.enable();monitor.sync(getState().music);}
  else monitor.disable();
 });
 subscribe(s=>{renderNow();monitor.sync(s.music);if(document.querySelector('.dm-section[data-section="music"]')?.classList.contains('active'))renderTracks();});
 setInterval(()=>{if(document.hidden)return;renderNow();if(monitorEnabled)monitor.sync(getState().music);},850);
 window.addEventListener('pagehide',()=>{monitor.dispose();cuePreview(null);});
 renderFolders();renderTracks();renderNow();
}
