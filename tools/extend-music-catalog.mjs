// Regenerate the private soundtrack metadata. No audio is stored in this repository.
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const catalogFile=path.join(root,'assets/music/catalog.json');
const manifestFile=path.join(root,'assets/music/import-manifest.json');
const catalog=JSON.parse(fs.readFileSync(catalogFile,'utf8'));
const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
const rows="hollow-knight\n01|Enter Hallownest|89.7|3666096|story\n02|Dirtmouth|115.0|4676512|sanctuary\n03|Crossroads|147.9|5992039|exploration\n04|False Knight|184.7|7462210|bosses\n05|Greenpath|217.0|8756839|exploration\n06|Hornet|166.8|6746455|combat\n07|Reflection|99.1|4042259|story\n08|Mantis Lords|105.9|4310798|bosses\n09|City of Tears|178.8|7227108|tension\n10|Dung Defender|127.1|5162390|combat\n11|Crystal Peak|248.3|10009671|dungeons\n12|Fungal Wastes|184.4|7452806|exploration\n13|Decisive Battle|125.9|5110145|combat\n14|Soul Sanctum|270.8|10908284|dungeons\n15|Resting Grounds|132.4|5372414|sanctuary\n16|Queen's Gardens|106.2|4326471|exploration\n17|The White Lady|79.6|3261720|story\n18|Broken Vessel|119.3|4849965|bosses\n19|Kingdom's Edge|142.0|5754847|exploration\n20|Nosk|110.1|4479026|tension\n21|Dream|121.5|4934602|tension\n22|Dream Battle|145.1|5881280|combat\n23|White Palace|259.0|10435990|dungeons\n24|Sealed Vessel|345.0|13877884|bosses\n25|Radiance|137.9|5592888|bosses\n26|Hollow Knight|96.9|3951353|bosses\ndragon-quest\n01|Overture March|241.9|5544399|story|I\n02|Château Ladutorm|208.2|4813038|sanctuary|I\n03|People|217.8|5027048|sanctuary|I\n04|Unknown World|129.9|3044677|exploration|I\n05|Fight|134.6|3140934|combat|I\n06|Dungeons|223.4|5107268|dungeons|I\n07|King Dragon|190.3|4280600|bosses|I\n08|Finale|164.8|3738372|story|I\n09|Dragon Quest March|102.4|2334840|story|II\n10|Only Lonely Boy|164.2|3644789|exploration|II\n11|Pastoral - Catastrophe|203.7|4672719|tension|II\n12|Château|185.5|4369117|sanctuary|II\n13|Town|212.6|4932520|sanctuary|II\n14|Fright in Dungeon - Devil's Tower|244.7|5683557|dungeons|II\n15|Requiem|131.3|3051300|story|II\n16|Endless World|346.0|7959772|exploration|II\n17|Beyong the Waves|136.4|3244008|exploration|II\n18|Deathfight - Dead or Alive|238.6|5555188|bosses|II\n19|My Road My Journey|252.0|5797749|story|II\nother\n01|Dance with STEEL BALL RUN|287.3|4530419|combat".trim().split('\n');
const albumDefs={
 'hollow-knight':{name:'Hollow Knight',originalArchive:'hollow-knight-original-soundtrack_2017.zip'},
 'dragon-quest':{name:'Dragon Quest I & II',originalArchive:'dqiiss.zip'},
 'other':{name:'Other',originalArchive:'Other.zip'}
};
const slug=s=>s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
let album=null;
for(const line of rows){
 if(albumDefs[line]){album=line;continue;}
 if(!album)throw new Error('Missing album for: '+line);
 const [number,title,duration,bytes,folder,discHint]=line.split('|');
 const id=album+':'+number;
 const file='assets/music/'+album+'/'+number+'-'+slug(title)+'.mp3';
 let sourceEntry;
 if(album==='hollow-knight')sourceEntry=number+' - '+title+'.mp3';
 if(album==='dragon-quest')sourceEntry=number+' - Koichi Sugiyama - Dragon Quest '+discHint+' - '+title+'.mp3';
 if(album==='other')sourceEntry='Other/'+title+'.mp3';
 const t={id,title,album,disc:discHint||'1',number:Number(number),duration:Number(duration),folder,file};
 if(!catalog.tracks.some(v=>v.id===id))catalog.tracks.push(t);
 const m={id,album,file,sourceEntry,bytes:Number(bytes)};
 if(!manifest.tracks.some(v=>v.id===id))manifest.tracks.push(m);
}
for(const [id,def] of Object.entries(albumDefs)){
 const tracks=catalog.tracks.filter(t=>t.album===id).length;
 if(!catalog.albums.some(a=>a.id===id))catalog.albums.push({id,name:def.name,tracks});
 if(!manifest.albums.some(a=>a.id===id))manifest.albums.push({id,name:def.name,originalArchive:def.originalArchive,expectedTracks:tracks});
}
const ids=catalog.tracks.map(t=>t.id);
if(new Set(ids).size!==ids.length)throw new Error('Duplicate track IDs');
if(manifest.tracks.length!==catalog.tracks.length)throw new Error('Manifest count mismatch');
for(const track of catalog.tracks)if(!manifest.tracks.some(m=>m.id===track.id))throw new Error('Missing import track: '+track.id);
fs.writeFileSync(catalogFile,JSON.stringify(catalog,null,2)+'\n');
fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(root,'assets/grim-158/music-catalog.js'),'export const MUSIC_CATALOG = '+JSON.stringify(catalog)+';\n');
console.log('Catalog/manifest updated:',catalog.albums.length,'albums,',catalog.tracks.length,'tracks');
