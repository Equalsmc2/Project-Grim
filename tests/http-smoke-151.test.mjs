import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import http from 'node:http';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const port=await new Promise((resolve,reject)=>{
 const s=createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});
});
const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
let output='';child.stdout.on('data',b=>output+=b.toString());child.stderr.on('data',b=>output+=b.toString());
const origin=`http://127.0.0.1:${port}`;
function raw(pathName,method='GET'){
 return new Promise((resolve,reject)=>{
  const req=http.request({host:'127.0.0.1',port,path:pathName,method},res=>{
   const chunks=[];res.on('data',part=>chunks.push(part));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));
  });req.on('error',reject);req.end();
 });
}
try{
 let online=false;
 for(let i=0;i<45;i++){
  if(child.exitCode!==null)break;
  try{const r=await raw('/','HEAD');if(r.status===200){online=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,45));
 }
 assert(online,`Local preview server failed to start: ${output}`);
 for(const [target,mime] of [['/','text/html'],['/dm.html','text/html'],['/assets/grim-156/stage.js','text/javascript'],['/assets/grim-156/styles.css','text/css'],['/assets/audio/rain.mp3','audio/mpeg']]){
  const r=await raw(target,'HEAD');
  assert.equal(r.status,200,`Missing response: ${target}`);
  assert(r.headers['content-type'].startsWith(mime),`Wrong MIME for ${target}`);
  assert.equal(r.body.length,0);
 }
 const page=await raw('/');assert(page.body.toString().includes('VISUAL QA 1.5.6'));
 assert.equal((await raw('/%ZZ')).status,400,'Malformed percent encoding returns 400 instead of crashing server');
 for(const bad of ['/.env','/.git/config','/README.md','/tests/state.test.cjs','/%2e%2e/%2eenv','/assets/%2e%2e/%2eenv']){
  assert.equal((await raw(bad)).status,404,`Sensitive or out-of-scope file exposed: ${bad}`);
 }
 assert.equal((await raw('/','POST')).status,405);
 assert.equal((await raw('/','HEAD')).status,200,'Server survives malformed requests');
 console.log('PASS: real HTTP stage/DM/assets/audio, MIME headers, HEAD behavior, malformed URL resilience, private-file blocking.');
}finally{child.kill('SIGTERM');}
