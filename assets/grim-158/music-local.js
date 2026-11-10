// Personal soundtrack ZIP storage. ZIP bytes stay only in this browser; never sent to Firebase.
// MP3s may also be installed on the private local web server using IMPORT-MUSIC.bat.
const DB_NAME='grim-personal-music';
const STORE='archives';
let databasePromise;
function openDatabase(){
 if(databasePromise)return databasePromise;
 databasePromise=new Promise((resolve,reject)=>{
  if(!('indexedDB' in globalThis)){reject(new Error('This browser does not support local music storage.'));return;}
  const request=indexedDB.open(DB_NAME,1);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:'album'});};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||new Error('Could not open music storage'));
 }).catch(e=>{databasePromise=null;throw e;});
 return databasePromise;
}
async function transaction(mode,operation){
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);
  const request=operation(store);
  tx.oncomplete=()=>resolve(request?.result);
  tx.onabort=()=>reject(request?.error||tx.error||new Error('Music storage failed'));
  tx.onerror=()=>reject(tx.error||new Error('Music storage failed'));
 });
}
const read32=(view,at)=>view.getUint32(at,true);
const read16=(view,at)=>view.getUint16(at,true);
export async function inspectMusicZip(file){
 if(file.size<22)throw new Error('Not a ZIP archive');
 const from=Math.max(0,file.size-65557),tail=new DataView(await file.slice(from).arrayBuffer());
 let eocd=-1;
 for(let pos=tail.byteLength-22;pos>=0;pos--){
  if(read32(tail,pos)===0x06054b50 && pos+22+read16(tail,pos+20)<=tail.byteLength){eocd=pos;break;}
 }
 if(eocd<0)throw new Error('ZIP central directory not found');
 const count=read16(tail,eocd+10),length=read32(tail,eocd+12),offset=read32(tail,eocd+16);
 if(count===65535||length===0xffffffff||offset===0xffffffff)throw new Error('ZIP64 archives are not supported');
 if(length>128*1024*1024||offset+length>file.size)throw new Error('Invalid ZIP directory');
 const directory=new DataView(await file.slice(offset,offset+length).arrayBuffer());
 const decoder=new TextDecoder();
 const entries=[];
 let ptr=0;
 for(let n=0;n<count;n++){
  if(ptr+46>directory.byteLength||read32(directory,ptr)!==0x02014b50)throw new Error('Invalid ZIP entry');
  const filenameLength=read16(directory,ptr+28),extraLength=read16(directory,ptr+30),commentLength=read16(directory,ptr+32);
  const end=ptr+46+filenameLength+extraLength+commentLength;
  if(end>directory.byteLength)throw new Error('Truncated ZIP entry');
  const filename=decoder.decode(new Uint8Array(directory.buffer,ptr+46,filenameLength));
  const method=read16(directory,ptr+10),compressedSize=read32(directory,ptr+20),bytes=read32(directory,ptr+24);
  const localOffset=read32(directory,ptr+42);
  if(localOffset+30>file.size)throw new Error('ZIP entry outside file');
  if(!filename.endsWith('/'))entries.push({filename,method,compressedSize,bytes,localOffset});
  ptr=end;
 }
 return entries;
}
async function loadManifest(){
 const response=await fetch(new URL('../music/import-manifest.json',import.meta.url),{cache:'no-store'});
 if(!response.ok)throw new Error('Music import manifest is missing from the website');
 return response.json();
}
function matchAlbum(entries,manifest){
 // Compare exact source entry, with unique byte-length fallback for CP437-encoded ZIP titles.
 const byName=new Map(entries.map(e=>[e.filename,e]));
 const byBytes=new Map();
 for(const entry of entries){
  if(!byBytes.has(entry.bytes))byBytes.set(entry.bytes,[]);
  byBytes.get(entry.bytes).push(entry);
 }
 const scores=manifest.albums.map(album=>{
  const tracks=manifest.tracks.filter(track=>track.album===album.id);
  const used=new Set(),matched={};
  for(const track of tracks){
   const exact=byName.get(track.sourceEntry);
   const options=byBytes.get(track.bytes)||[];
   const entry=exact?.bytes===track.bytes?exact:options.length===1?options[0]:null;
   if(entry&&!used.has(entry.localOffset)){matched[track.id]=entry;used.add(entry.localOffset);}
  }
  return {album,matched,count:Object.keys(matched).length,expected:tracks.length};
 }).sort((a,b)=>b.count-a.count);
 const best=scores[0];
 if(!best||best.count===0||best.count!==best.expected)return null;
 return best;
}
export async function importMusicArchives(files,onProgress=()=>{}){
 const manifest=await loadManifest();
 const outcome={albums:[],tracks:0,errors:[]};
 for(const file of Array.from(files||[])){
  try{
   if(!/\.zip$/i.test(file.name))throw new Error('Please select a ZIP soundtrack archive');
   onProgress('Reading '+file.name+'…');
   const entries=await inspectMusicZip(file),match=matchAlbum(entries,manifest);
   if(!match)throw new Error('Archive does not match a complete album in the music catalog');
   const mapped={};
   for(const [id,entry] of Object.entries(match.matched)){
    if(entry.method!==0&&entry.method!==8)throw new Error('Unsupported ZIP compression for '+id);
    mapped[id]=entry;
   }
   try{
    await transaction('readwrite',store=>store.put({album:match.album.id,zip:file.slice(0,file.size,'application/zip'),entries:mapped}));
   }catch(blobError){
    // Some WebKit versions fail IndexedDB transactions containing Blob objects.
    // Fall back to a structured-cloneable ArrayBuffer without sending data anywhere.
    const data=await file.arrayBuffer();
    await transaction('readwrite',store=>store.put({album:match.album.id,data,entries:mapped}));
   }
   outcome.albums.push(match.album.name);outcome.tracks+=match.count;
   onProgress('Loaded '+outcome.tracks+' tracks from '+outcome.albums.length+' archive(s)…');
  }catch(error){outcome.errors.push(file.name+': '+(error?.message||String(error)));}
 }
 return outcome;
}
export async function musicArchiveStatus(){
 const records=await transaction('readonly',store=>store.getAll());
 return {albums:records.map(r=>r.album),tracks:records.reduce((n,r)=>n+Object.keys(r.entries).length,0)};
}
export async function clearMusicArchives(){
 await transaction('readwrite',store=>store.clear());
}
async function extractZipEntry(zip,entry){
 const header=new DataView(await zip.slice(entry.localOffset,entry.localOffset+30).arrayBuffer());
 if(header.byteLength!==30||read32(header,0)!==0x04034b50)throw new Error('Corrupt local ZIP header');
 const dataStart=entry.localOffset+30+read16(header,26)+read16(header,28);
 const end=dataStart+entry.compressedSize;
 if(end>zip.size)throw new Error('Truncated soundtrack file');
 const compressed=zip.slice(dataStart,end);
 let blob=compressed;
 if(entry.method===8){
  if(!('DecompressionStream' in globalThis))throw new Error('This browser cannot unpack ZIPs; use Chrome or Edge.');
  blob=await new Response(compressed.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();
 }
 if(blob.size!==entry.bytes)throw new Error('Soundtrack ZIP failed integrity check');
 return new Blob([blob],{type:'audio/mpeg'});
}
export async function getMusicPlaybackUrl(track){
 if(!track||typeof track.file!=='string')throw new Error('Unknown track');
 const record=('indexedDB' in globalThis)?await transaction('readonly',store=>store.get(track.album)):null;
 if(record?.entries?.[track.id]){
  const zip=record.zip||new Blob([record.data],{type:'application/zip'});
  const blob=await extractZipEntry(zip,record.entries[track.id]);
  const url=URL.createObjectURL(blob);
  return {url,release:()=>URL.revokeObjectURL(url),local:true};
 }
 return {url:new URL('../../'+track.file,import.meta.url).href,release:()=>{},local:false};
}
