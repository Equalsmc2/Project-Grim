import {test,expect} from '../qa/fixtures.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {deflateRawSync} from 'node:zlib';

// Small, synthetic ZIP using an existing test audio file; no commercial soundtrack in CI.
function musicZip(filename,bytes,method=0){
 const name=Buffer.from(filename,'utf8'),local=Buffer.alloc(30),central=Buffer.alloc(46),end=Buffer.alloc(22);
 const packed=method===8?deflateRawSync(bytes):bytes,size=bytes.length;
 local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(method,8);
 local.writeUInt32LE(packed.length,18);local.writeUInt32LE(size,22);local.writeUInt16LE(name.length,26);
 central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(method,10);
 central.writeUInt32LE(packed.length,20);central.writeUInt32LE(size,24);central.writeUInt16LE(name.length,28);
 end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);
 end.writeUInt32LE(central.length+name.length,12);
 end.writeUInt32LE(local.length+name.length+packed.length,16);
 return Buffer.concat([local,name,packed,central,name,end]);
}
for(const method of [0,8])test('personal soundtrack ZIP '+(method===0?'stored':'deflate')+' imports, resolves MP3 bytes, and persists between pages',async({page},testInfo)=>{
 const file=fs.readFileSync(path.resolve(import.meta.dirname,'../../assets/audio/desert.mp3'));
 const mock={
  albums:[{id:'dark-souls',name:'Dark Souls',expectedTracks:1}],
  tracks:[{id:'dark-souls:01',album:'dark-souls',sourceEntry:'01 - Prologue.mp3',bytes:file.length}]
 };
 await page.route('**/assets/music/import-manifest.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(mock)}));
 await page.goto('/dm.html');
 await page.locator('#dmNav [data-section="music"]').click();
 await expect(page.locator('#musicCount')).toContainText('276');
 await page.locator('#musicArchiveInput').setInputFiles({name:'personal-album(3).zip',mimeType:'application/zip',buffer:musicZip('01 - Prologue.mp3',file,method)});
 await expect(page.locator('#musicLocalStatus')).toContainText('1 / 276 tracks');
 await expect(page.locator('#musicNotice')).toContainText('Loaded 1 tracks');
 const verify=async(target)=>{
  const info=await target.evaluate(async()=>{
   const {getMusicPlaybackUrl}=await import('/assets/grim-158/music-local.js');
   const result=await getMusicPlaybackUrl({id:'dark-souls:01',album:'dark-souls',file:'assets/music/dark-souls/01-prologue.mp3'});
   const body=await fetch(result.url).then(r=>r.arrayBuffer());
   const bytes=Array.from(new Uint8Array(body).slice(0,16));result.release();
   return {count:body.byteLength,bytes,local:result.local};
  });
  expect(info.local).toBe(true);
  expect(info.count).toBe(file.length);
  expect(info.bytes).toEqual(Array.from(file.slice(0,16)));
 };
 await verify(page);
 // The DM selects a shared cue; the Stage must really decode/play the local Blob after a click.
 await page.locator('[data-play="dark-souls:01"]').click();
 const stage=await page.context().newPage();
 await stage.addInitScript(()=>{
  const NativeAudio=window.Audio;
  window.__musicBlobPlayed=false;window.__musicAudioLog=[];
  window.Audio=function(...args){
   const audio=new NativeAudio(...args),play=audio.play.bind(audio);
   audio.addEventListener('playing',()=>{window.__musicAudioLog.push('playing '+audio.currentSrc);if(audio.currentSrc.startsWith('blob:'))window.__musicBlobPlayed=true;});
   audio.addEventListener('error',()=>window.__musicAudioLog.push('error '+audio.error?.code));
   audio.play=function(){window.__musicAudioLog.push('play '+audio.src);const result=play();Promise.resolve(result).then(()=>window.__musicAudioLog.push('resolved')).catch(e=>window.__musicAudioLog.push('reject '+e.name+' '+e.message));return result;};
   return audio;
  };
 });
 await stage.goto('/?webgl=0');
 await verify(stage);
 await stage.locator('#stageSoundToggle').click();
 await expect.poll(()=>stage.evaluate(()=>window.__musicBlobPlayed||window.__musicAudioLog.some(x=>x.startsWith('reject NotSupportedError'))),{timeout:10000}).toBe(true);
 const sound=await stage.evaluate(()=>({played:window.__musicBlobPlayed,logs:window.__musicAudioLog,label:document.querySelector('#stageSoundLabel')?.textContent}));
 if(!sound.played){
  // Windows Playwright WebKit lacks the MP3 decoder used by this fixture.
  // The ZIP was correctly resolved, but real Safari playback is not proved by this test.
  expect(testInfo.project.name).toBe('mobile-webkit');
  expect(process.platform).toBe('win32');
  expect(sound.logs.some(x=>x.startsWith('play blob:'))).toBe(true);
  expect(sound.logs.some(x=>x.startsWith('reject NotSupportedError'))).toBe(true);
  expect(sound.label).toContain('cannot decode');
  testInfo.annotations.push({type:'codec-limitation',description:'Windows Playwright WebKit cannot decode MP3; blob extraction and persistence verified, playback only confirmed by Chromium.'});
 }
 await stage.close();
 await page.reload();
 await page.locator('#dmNav [data-section="music"]').click();
 await expect(page.locator('#musicLocalStatus')).toContainText('1 / 276 tracks');
 await verify(page);
});
