import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const temp=mkdtempSync(path.join(tmpdir(),'grim-firebase-154-'));
const src=path.resolve('assets/grim-156');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
  cpSync(path.join(src,'cloud-outbox.js'),path.join(temp,'cloud-outbox.js'));
  writeFileSync(path.join(temp,'package.json'),JSON.stringify({type:'module'}));
  writeFileSync(path.join(temp,'firebase-config.js'),`export const firebaseConfig={projectId:'local-test'};`);
  writeFileSync(path.join(temp,'mock-app.js'),`export const initializeApp=x=>x;export const getApps=()=>[];export const getApp=()=>({});`);
  writeFileSync(path.join(temp,'mock-auth.js'),`
    const auth={currentUser:{uid:'test-dm',isAnonymous:true}};
    export const getAuth=()=>auth;
    export const signInAnonymously=async()=>({user:auth.currentUser});
    export const signOut=async()=>{};
    export const onAuthStateChanged=(_,cb)=>{queueMicrotask(()=>cb(auth.currentUser));return()=>{};};
  `);
  writeFileSync(path.join(temp,'mock-db.js'),`
    export const getDatabase=()=>({});
    export const ref=(_,p)=>p;
    export const onValue=(_,cb)=>{globalThis._mockCloudRead=cb;queueMicrotask(()=>cb({exists:()=>true,val:()=>({updatedAt:10,mode:'combat',sceneId:'chapel',characters:[]})}));return()=>{};};
    export const set=async(_,s)=>{globalThis._mockSent.push(s);if(globalThis._mockFailures>0){globalThis._mockFailures--;throw Object.assign(new Error('Connection lost'),{code:'unavailable'});}};
  `);
  writeFileSync(path.join(temp,'state.js'),`
    let state={updatedAt:20,mode:'combat',sceneId:'chapel',characters:[]};
    const listeners=new Set();
    export const getState=()=>state;
    export const subscribe=fn=>{listeners.add(fn);return()=>listeners.delete(fn);};
    export const applyCloudState=(next)=>{state=next;globalThis._mockReads.push(next.updatedAt);};
    export function change(rev){state={...state,updatedAt:rev};for(const fn of listeners)fn(state,'local');}
  `);
  let code=readFileSync(path.join(src,'firebase-sync.js'),'utf8')
    .replace('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js','./mock-app.js')
    .replace('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js','./mock-auth.js')
    .replace('https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js','./mock-db.js');
  writeFileSync(path.join(temp,'firebase-sync.js'),code);
  const mod=await import(pathToFileURL(path.join(temp,'firebase-sync.js')).href);
  const state=await import(pathToFileURL(path.join(temp,'state.js')).href);
  globalThis._mockSent=[];globalThis._mockReads=[];globalThis._mockFailures=1;
  const saved=new Map();
  globalThis.localStorage={getItem:key=>saved.get(key)||null,setItem:(key,val)=>saved.set(key,val),removeItem:key=>saved.delete(key)};
  const status=[];
  globalThis.window={addEventListener(){},removeEventListener(){}};
  const dm=await mod.connectCloud({dm:true,room:'my-private-room',status:x=>status.push(x)});
  await wait(0);
  assert.equal(state.getState().updatedAt,10,'First cloud state is authoritative before any local edits');
  state.change(50);
  globalThis._mockCloudRead({exists:()=>true,val:()=>({updatedAt:12,mode:'combat',sceneId:'old',characters:[]})});
  assert.equal(state.getState().updatedAt,50,'Pending local edits protected against remote state');
  await wait(245);
  assert(status.some(x=>x.includes('retry')),'Transient write failure is visible to DM');
  state.change(51);
  await wait(255);
  assert.equal(globalThis._mockSent.at(-1).updatedAt,51,'Latest local edits sync after a failed write');
  globalThis._mockCloudRead({exists:()=>true,val:()=>({updatedAt:13,mode:'combat',sceneId:'old',characters:[]})});
  assert.equal(state.getState().updatedAt,51,'Stale first-connection cloud echo cannot roll back a successful local write');
  assert.equal(dm.getSyncStatus().hasPending,false);
  const count=globalThis._mockSent.length;
  dm.disconnect();
  state.change(52);await wait(220);
  assert.equal(globalThis._mockSent.length,count,'Disconnect prevents further DM writes');
  // Simulate reopening the DM with a previous-session unsynced revision.
  saved.set('grim:cloud-unsynced:my-private-room',JSON.stringify({uid:'test-dm',revision:52,at:Date.now()}));
  const resumedStatus=[];
  const resumed=await mod.connectCloud({dm:true,room:'my-private-room',status:x=>resumedStatus.push(x)});
  await wait(0);
  assert.equal(state.getState().updatedAt,52,'Reconnect preserves unsynced local state rather than silently loading old cloud data');
  assert(resumedStatus.some(x=>x.includes('Unpublished local work found')),'DM is told to Publish after reconnect');
  assert.equal(await resumed.publish(),true,'Manual Publish recovers previous-session edits');
  assert.equal(saved.has('grim:cloud-unsynced:my-private-room'),false,'Successful Publish clears recovery marker');
  const afterRecovery=globalThis._mockSent.length;
  resumed.disconnect();
  const viewer=await mod.connectCloud({dm:false,room:'my-private-room'});
  await wait(0);state.change(53);await wait(230);
  assert.equal(globalThis._mockSent.length,afterRecovery,'Viewer cannot publish local state');
  viewer.disconnect();
  console.log('PASS: simulated anonymous Firebase DM/viewer connection, transient failure, remote echo protection, eventual publication and disconnect.');
}finally{rmSync(temp,{recursive:true,force:true});delete globalThis.window;delete globalThis.localStorage;}
