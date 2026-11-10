import assert from 'node:assert/strict';
import {createCloudOutbox,retryDelay,isPermissionFailure} from '../assets/grim-158/cloud-outbox.js';
const micro=()=>new Promise(resolve=>setImmediate(resolve));
function clock(){
  let id=0;const timers=new Map();
  return {
    setTimer(fn,ms){const n=++id;timers.set(n,{fn,ms});return n;},
    clearTimer(n){timers.delete(n);},
    next(){const x=[...timers.values()].sort((a,b)=>a.ms-b.ms)[0];if(!x)throw new Error('No timer');const k=[...timers].find(([,v])=>v===x)[0];timers.delete(k);x.fn();return x.ms;},
    get count(){return timers.size;}
  };
}
const c=clock(),sent=[],statuses=[];
let failures=1,canWrite=true;
const p=createCloudOutbox({send:async value=>{sent.push(value);if(failures-- > 0)throw Object.assign(new Error('offline'),{code:'unavailable'});},
  readState:()=>({rev:9}),canWrite:()=>canWrite,onStatus:e=>statuses.push(e),
  setTimer:c.setTimer,clearTimer:c.clearTimer,retryBase:100,retryMax:500});
p.queue({rev:1});p.queue({rev:2});
assert.equal(c.count,1,'Rapid DM changes coalesce');
assert.equal(c.next(),190);await micro();
assert.equal(p.hasUnsent,true,'Failure retains an unsent snapshot');
assert.equal(c.count,1,'Transient failure schedules retry');
assert(statuses.some(v=>v.kind==='retry'&&v.delay===100));
p.queue({rev:3}); // newer change replaces failed revision
c.next();await micro();
assert.deepEqual(sent.map(x=>x.rev),[2,3],'Latest edit is retried; failed old state never overwrites it');
assert.equal(p.hasPending,false);
assert.equal(await p.flush({force:true}),true,'Manual Publish sends latest state');
assert.equal(sent.at(-1).rev,9);
canWrite=false;p.queue({rev:10});c.next();await micro();
assert.equal(p.hasUnsent,true,'Offline edits are preserved');
canWrite=true;p.resume();c.next();await micro();
assert.equal(sent.at(-1).rev,10,'Reconnect flushes preserved edits');
p.dispose();p.queue({rev:11});assert.equal(p.hasPending,false);

const d=clock();let allow=false;
const denied=createCloudOutbox({send:async()=>{if(!allow)throw {code:'PERMISSION_DENIED'};},readState:()=>({rev:20}),setTimer:d.setTimer,clearTimer:d.clearTimer});
denied.queue({rev:4});d.next();await micro();
assert.equal(denied.hasUnsent,true);
assert.equal(d.count,0,'Permission denied never enters an automatic retry storm');
allow=true;assert.equal(await denied.flush({force:true}),true,'Explicit Publish retries a denied edit');
assert.equal(denied.hasUnsent,false);denied.dispose();
assert.equal(isPermissionFailure({code:'permission_denied'}),true);
assert.equal(retryDelay(12,100,800),800);
console.log('PASS: cloud outbox debouncing, retained failed writes, newest edit wins, retry, offline resume, permission handling and disconnect.');
