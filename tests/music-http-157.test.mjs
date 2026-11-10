import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import net from 'node:net';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const reserve=net.createServer();await new Promise(resolve=>reserve.listen(0,'127.0.0.1',resolve));
const port=reserve.address().port;await new Promise(resolve=>reserve.close(resolve));
const processServer=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port)}});
let alive=true;processServer.once('exit',()=>alive=false);
function get(url,headers={}){return new Promise((resolve,reject)=>{http.get({host:'127.0.0.1',port,path:url,headers},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));}).on('error',reject);});}
try {
 let ready=false;
 for(let i=0;i<50;i++){
  try{const r=await get('/');if(r.status===200){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,35));
 }
 assert(ready,'Local preview server did not start');
 const asset=await get('/assets/music/catalog.json');assert.equal(asset.status,200);
 assert.equal(JSON.parse(asset.body).tracks.length,276);
 const r=await get('/assets/audio/rain.mp3',{Range:'bytes=0-31'});
 assert.equal(r.status,206);assert.equal(r.body.length,32);assert.match(r.headers['content-range'],/^bytes 0-31\//);
 assert.equal(r.headers['accept-ranges'],'bytes');
 const missing=await get('/assets/music/dark-souls/01-prologue.mp3');assert.equal(missing.status,404,'Audio is not publicly bundled');
 const privateFile=await get('/.gitignore');assert.equal(privateFile.status,404);
 console.log('PASS: local music catalog, HTTP range seeking, private soundtrack default, non-public files blocked.');
} finally {processServer.kill('SIGTERM');if(alive)await Promise.race([once(processServer,'exit'),new Promise(resolve=>setTimeout(resolve,1000))]);}
