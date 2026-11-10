import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {MUSIC_CATALOG} from '../assets/grim-158/music-catalog.js';
import {TRACKS,TRACK_MAP,normalizeMusic,playlistTracks,resolveMusic,formatDuration,musicSource,createMusicPlayer} from '../assets/grim-158/music-playback.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const groups=new Map(MUSIC_CATALOG.albums.map(a=>[a.id,a]));
assert.equal(MUSIC_CATALOG.albums.length,4);
assert.equal(TRACKS.length,230);
assert.equal(TRACK_MAP.size,TRACKS.length,'All tracks have unique stable IDs');
for(const a of MUSIC_CATALOG.albums)assert.equal(TRACKS.filter(t=>t.album===a.id).length,a.tracks);
assert.deepEqual(MUSIC_CATALOG.albums.map(x=>x.tracks),[23,67,86,54]);
for(const t of TRACKS){
 assert(groups.has(t.album));
 assert(t.duration>=0 && Number.isFinite(t.duration));
 assert(/^assets\/music\/[a-z-]+\/[a-z0-9-]+\.mp3$/.test(t.file));
 assert(!!t.title && !!t.id && !!t.folder);
 assert(musicSource(t).includes(t.file));
}
assert.equal(playlistTracks('album:elden-ring').length,67);
assert(playlistTracks('mood:bosses').length>25);
assert.equal(playlistTracks('favorites',[TRACKS[1].id]).length,1);
assert.equal(formatDuration(142),'2:22');
assert.equal(normalizeMusic({trackId:'injected',volume:90}).trackId,null);
assert.equal(normalizeMusic({trackId:TRACKS[0].id,playing:true,volume:90}).volume,1);
const ids=TRACKS.filter(t=>t.album==='dark-souls');
const a=ids[0],b=ids[1];
const sample={trackId:a.id,playlist:'album:dark-souls',playing:true,startedAt:100000,volume:.4,repeat:'all'};
assert.equal(resolveMusic(sample,100000).track.id,a.id);
assert.equal(resolveMusic(sample,100000+Math.ceil((a.duration+5)*1000)).track.id,b.id);
assert.equal(resolveMusic({...sample,repeat:'one'},100000+Math.ceil((a.duration+5)*1000)).track.id,a.id);
assert.equal(resolveMusic({...sample,playing:false,pausedAt:30},100000+999999).offset,30);
assert.equal(resolveMusic({...sample,repeat:'off'},100000+100000000).track,null);
const html=readFileSync(path.join(root,'dm.html'),'utf8');
const stage=readFileSync(path.join(root,'assets/grim-158/stage.js'),'utf8');
assert(html.includes('data-section="music"') && html.includes('musicTracks') && html.includes('musicFolders'));
assert(html.includes('initMusicLibrary'));
assert(stage.includes('createMusicPlayer') && stage.includes('stageMusic.sync(s.music)'));
const state=readFileSync(path.join(root,'assets/grim-158/state.js'),'utf8');
assert(state.includes('music:normalizeMusic(candidate.music)') && state.includes('music:normalizeMusic()'));
const git=readFileSync(path.join(root,'.gitignore'),'utf8');
assert(git.includes('/assets/music/*/*.mp3'));
const hosting=JSON.parse(readFileSync(path.join(root,'firebase.json'),'utf8'));
assert(hosting.hosting.ignore.includes('assets/music/**'));
for(const f of ['IMPORT-MUSIC.bat','tools/import_music.ps1','assets/music/import-manifest.json'])assert(existsSync(path.join(root,f)));
const manifest=JSON.parse(readFileSync(path.join(root,'assets/music/import-manifest.json'),'utf8'));
assert.equal(manifest.tracks.length,230);
assert.equal(new Set(manifest.tracks.map(t=>t.file)).size,230);

// Simulated HTMLAudioElement playback: track changes must not upload or rebuild catalog.
const queue=[],instances=[];
globalThis.requestAnimationFrame=fn=>{queue.push(fn);return queue.length;};
globalThis.cancelAnimationFrame=()=>{queue.length=0;};
globalThis.Audio=class{
 constructor(){this.currentTime=0;this.volume=0;this.readyState=1;this.duration=600;this.paused=true;this.handlers={};instances.push(this);}
 addEventListener(type,fn){this.handlers[type]=fn;}
 play(){this.paused=false;return Promise.resolve();}
 pause(){this.paused=true;}
 removeAttribute(){}
 load(){}
};
const statuses=[];
const player=createMusicPlayer({onStatus:(type)=>statuses.push(type),fadeMs:0});
player.sync({...sample,startedAt:Date.now(),volume:.4});
assert.equal(instances.length,0,'Do not load audio before a user gesture');
player.enable();await Promise.resolve();await Promise.resolve();
assert.equal(instances.length,1);
assert.equal(player.currentTrack,a.id);
player.sync({...sample,trackId:b.id,startedAt:Date.now(),volume:.7});
await Promise.resolve();await Promise.resolve();
assert.equal(player.currentTrack,b.id);
assert.equal(instances.length,2);
player.disable();assert.equal(player.currentTrack,null);
player.dispose();
console.log('PASS: 230 catalogued songs, 4 games, scene folders, stable IDs, shared playback clock, gesture-gating, installer and private-by-default media deployment.');
