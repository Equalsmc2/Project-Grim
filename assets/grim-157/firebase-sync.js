import {firebaseConfig} from './firebase-config.js';
import {getState,subscribe,applyCloudState} from './state.js';
import {createCloudOutbox} from './cloud-outbox.js';

// There is deliberately no interactive login. Both DM and viewers use Firebase
// anonymous authentication. Database rules, NOT the existence of dm.html,
// decide which anonymous UID may write to a room.
export async function connectCloud({dm=false,room='grim-demo',status=()=>{},onIdentity=()=>{}}){
  const startupUpdatedAt=getState().updatedAt;
  status('Connecting to Firebase…');
  const [{initializeApp,getApps,getApp},{getAuth,signInAnonymously,signOut,onAuthStateChanged},{getDatabase,ref,onValue,set}]=await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js')
  ]);
  const app=getApps().length?getApp():initializeApp(firebaseConfig);
  const auth=getAuth(app),db=getDatabase(app);
  // Firebase persists this anonymous UID for this browser profile. Clearing the
  // browser profile may require installing fresh DM rules for the new UID.
  const prior=await new Promise((resolve,reject)=>{
    let unsubscribe=()=>{};
    unsubscribe=onAuthStateChanged(auth,user=>{unsubscribe();resolve(user);},reject);
  });
  // An older Grim preview might have left a password account signed in.
  // This release always uses an anonymous identity, with no login UI.
  if(prior&&!prior.isAnonymous)await signOut(auth);
  const user=prior?.isAnonymous?prior:(await signInAnonymously(auth)).user;
  onIdentity(user.uid);

  const safeRoom=String(room).toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,60)||'grim-demo';
  const roomRef=ref(db,`grim/rooms/${safeRoom}`);
  // Only a small revision marker is stored; the full campaign is already
  // persisted by state.js. Never silently replay old unsynced work on reload.
  const pendingKey=`grim:cloud-unsynced:${safeRoom}`;
  const readMarker=()=>{try{return JSON.parse(localStorage.getItem(pendingKey)||'null');}catch{return null;}};
  const writeMarker=()=>{try{localStorage.setItem(pendingKey,JSON.stringify({uid:user.uid,revision:getState().updatedAt,at:Date.now()}));}catch{}};
  const clearMarker=()=>{try{localStorage.removeItem(pendingKey);}catch{}};
  const marker=dm?readMarker():null;
  let recoveryRequired=!!(marker&&marker.uid===user.uid&&Number(marker.revision)<=getState().updatedAt);
  let alive=true;
  const canWrite=()=>alive&&dm&&!!auth.currentUser&&typeof navigator!=='undefined'&&navigator.onLine!==false;
  const readyText=dm?`DM device connected · ${safeRoom}`:`Viewer connected · ${safeRoom}`;
  status(readyText);

  let hadLocalEdits=dm&&getState().updatedAt!==startupUpdatedAt;
  const outbox=dm?createCloudOutbox({
    send:next=>set(roomRef,next),
    readState:()=>getState(),
    canWrite,
    onStatus:event=>{
      if(!alive)return;
      if(event.kind==='pending'){
        recoveryRequired=false;writeMarker();status(`Unsynced DM changes · ${safeRoom}`);
      }else if(event.kind==='sent'){
        if(!outbox.hasUnsent&&Number(event.snapshot?.updatedAt)>=getState().updatedAt){
          recoveryRequired=false;clearMarker();
        }
        status(`Firebase live · ${safeRoom}`);
      }
      else if(event.kind==='offline')status('Offline · local changes retained');
      else if(event.kind==='denied')status('Write denied · check Firebase DM rules; edits kept locally');
      else if(event.kind==='retry')status(`Sync interrupted · retry in ${Math.ceil(event.delay/1000)}s`);
    }
  }):null;

  // Protect DM edits made while anonymous authentication was establishing.
  if(dm&&getState().updatedAt!==startupUpdatedAt)outbox.queue(getState());

  // Local DM edits remain immediate. Only the newest complete state is queued,
  // serialized and retried after transient failures. A failed write is never
  // silently discarded and a remote echo must not overwrite unsent local edits.
  const unsubscribeLocal=subscribe((next,source)=>{
    if(source==='local'&&dm&&alive){hadLocalEdits=true;outbox.queue(next);}
  });
  let initialSnapshot=true;
  const unsubscribeData=onValue(roomRef,snapshot=>{
    if(!alive)return;
    if(dm&&recoveryRequired){
      initialSnapshot=false;
      status('Unpublished local work found · click Publish to recover');
      return;
    }
    if(dm&&outbox.hasPending){
      initialSnapshot=false;
      status(`Unsynced DM changes · ${safeRoom}`);
      return;
    }
    if(!snapshot.exists()){
      status(dm?'Room is empty · publish when rules are installed':'Waiting for DM to publish a scene');
      return;
    }
    // On reconnection, an old initial echo must never replace a newer local
    // edit that this DM has just successfully sent.
    const remote=snapshot.val();
    if(dm&&hadLocalEdits&&Number(remote?.updatedAt)<getState().updatedAt){
      initialSnapshot=false;return;
    }
    applyCloudState(remote,{initial:initialSnapshot});
    initialSnapshot=false;
  },error=>{
    if(alive)status(`Firebase read blocked: ${error.message}`);
  });
  const online=()=>{if(alive){if(dm)outbox.resume();status(recoveryRequired?'Unpublished local work found · click Publish to recover':dm?'Reconnected · checking pending edits':'Viewer network restored');}};
  const offline=()=>{if(alive)status('Offline · local view still available');};
  if(typeof window!=='undefined'){
    window.addEventListener('online',online);
    window.addEventListener('offline',offline);
  }
  return {
    getUid:()=>user.uid,
    publish:()=>dm?outbox.flush({force:true}):Promise.resolve(false),
    getSyncStatus:()=>({hasPending:!!outbox?.hasPending,retryAttempt:outbox?.retryAttempt||0}),
    disconnect:()=>{
      alive=false;outbox?.dispose();unsubscribeLocal();unsubscribeData();
      if(typeof window!=='undefined'){
        window.removeEventListener('online',online);
        window.removeEventListener('offline',offline);
      }
    }
  };
}
