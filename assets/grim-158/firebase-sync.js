import {firebaseConfig} from './firebase-config.js';
import {getState,subscribe,applyCloudState,updateState} from './state.js';
import {createCloudOutbox} from './cloud-outbox.js';
import {PLAYER_EDIT_FIELDS,applyPlayerEdit,encodePlayerEdit} from './player-fields.js';

// There is deliberately no interactive login. Database rules bind each room
// to its first DM browser on creation; no device-specific rules are generated.
export async function connectCloud({dm=false,player=false,room='grim-demo',status=()=>{},onIdentity=()=>{},onStateLoaded=()=>{},onRoomNeedsUpgrade=()=>{}}){
  const startupUpdatedAt=getState().updatedAt;
  status('Connecting to Firebase…');
  const [{initializeApp,getApps,getApp},{getAuth,signInAnonymously,signOut,onAuthStateChanged},{getDatabase,ref,onValue,set}]=await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js')
  ]);
  const app=getApps().length?getApp():initializeApp(firebaseConfig);
  const auth=getAuth(app),db=getDatabase(app);
  // Firebase persists this anonymous UID for the browser profile. A different
  // profile receives a new private room automatically, not a new set of rules.
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
  const editsRef=ref(db,`grim/playerEdits/${safeRoom}`);
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
  const readyText=dm?`DM device connected · ${safeRoom}`:player?`Player connected · ${safeRoom}`:`Viewer connected · ${safeRoom}`;
  status(readyText);

  let hadLocalEdits=dm&&getState().updatedAt!==startupUpdatedAt;
  const outbox=dm?createCloudOutbox({
    send:next=>set(roomRef,{...next,dmUid:user.uid}),
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
      else if(event.kind==='denied')status('Write denied · one-time project rules may not be installed; local edits kept');
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
  let roomSnapshotReceived=false;
  let roomCreationQueued=false,upgradeReported=false;
  let pendingPlayerEdits=null;
  const absorbPlayerEdits=()=>{
    if(!dm||!roomSnapshotReceived||!pendingPlayerEdits)return;
    const edits=pendingPlayerEdits;
    pendingPlayerEdits=null;
    const cursors=getState().playerEditCursors||{};
    const accepted=[];
    for(const [charId,identities] of Object.entries(edits)){
      if(!identities||typeof identities!=='object')continue;
      for(const [uid,fields] of Object.entries(identities)){
        if(!fields||typeof fields!=='object')continue;
        for(const [field,entry] of Object.entries(fields)){
          if(!PLAYER_EDIT_FIELDS.includes(field)||!entry||typeof entry!=='object')continue;
          const revision=Number(entry.revision);
          const key=`${charId}/${uid}/${field}`;
          if(!Number.isSafeInteger(revision)||revision<=Number(cursors[key]||0))continue;
          accepted.push({key,charId,field,value:entry.value,revision});
        }
      }
    }
    if(!accepted.length)return;
    accepted.sort((a,b)=>a.revision-b.revision);
    // A single atomic DM publication preserves card values and acknowledgements.
    updateState(next=>{
      next.playerEditCursors={...(next.playerEditCursors||{})};
      for(const edit of accepted){
        if(applyPlayerEdit(next,edit.charId,edit.field,edit.value)){
          next.playerEditCursors[edit.key]=edit.revision;
        }
      }
    });
  };
  const unsubscribeData=onValue(roomRef,snapshot=>{
    if(!alive)return;
    roomSnapshotReceived=true;
    const remote=snapshot.exists()?snapshot.val():null;
    if(dm&&remote&&remote.dmUid!==user.uid){
      roomSnapshotReceived=false;
      if(!upgradeReported){
        upgradeReported=true;
        // An older room lacks an owner. Preserve its campaign snapshot when
        // safe, then move to a new room; never claim a different DM's room.
        if(!remote.dmUid&&!hadLocalEdits&&!outbox.hasPending&&!recoveryRequired)applyCloudState(remote,{initial:true});
        status(remote.dmUid?'Previous DM browser owns this room · upgrading privately':'Upgrading older room to permanent security…');
        onRoomNeedsUpgrade({reason:remote.dmUid?'different-owner':'legacy',room:safeRoom});
      }
      return;
    }
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
      if(dm&&!roomCreationQueued&&!recoveryRequired){
        // A new room is claimed in the same atomic write as its initial scene.
        // This requires no Publish button or per-device Firebase rule change.
        roomCreationQueued=true;
        outbox.queue(getState());
        status(`Creating private room automatically · ${safeRoom}`);
      }else status(dm?'Room not published yet':'Waiting for DM to publish a scene');
      onStateLoaded(false);
      if(dm)absorbPlayerEdits();
      return;
    }
    // On reconnection, an old initial echo must never replace a newer local
    // edit that this DM has just successfully sent.
    if(dm&&hadLocalEdits&&Number(remote?.updatedAt)<getState().updatedAt){
      initialSnapshot=false;return;
    }
    applyCloudState(remote,{initial:initialSnapshot});
    initialSnapshot=false;
    onStateLoaded(true);
    if(dm)absorbPlayerEdits();
  },error=>{
    if(alive){status(`Firebase read blocked: ${error.message}`);onStateLoaded(false);}
  });
  const unsubscribeEdits=dm?onValue(editsRef,snapshot=>{
    if(!alive)return;
    pendingPlayerEdits=snapshot.val()||{};
    absorbPlayerEdits();
  },error=>{if(alive)status(`Player edits unavailable · update Firebase rules (${error.code||'read denied'})`);}):()=>{};
  let lastPlayerRevision=0;
  const submitPlayerEdit=async(characterId,field,value)=>{
    if(!alive||!player||!auth.currentUser||!navigator.onLine)throw new Error('Player connection is offline');
    if(!getState().characters.some(c=>c.id===characterId&&c.faction!=='enemy'))throw new Error('This player character is unavailable');
    if(!PLAYER_EDIT_FIELDS.includes(field))throw new Error('This field is DM-only');
    const encoded=encodePlayerEdit(field,value);
    if(encoded===null)throw new Error('Invalid value');
    lastPlayerRevision=Math.max(Date.now(),lastPlayerRevision+1);
    await set(ref(db,`grim/playerEdits/${safeRoom}/${characterId}/${user.uid}/${field}`),{
      value:encoded,revision:lastPlayerRevision
    });
    return lastPlayerRevision;
  };
  const online=()=>{if(alive){if(dm)outbox.resume();status(recoveryRequired?'Unpublished local work found · click Publish to recover':dm?'Reconnected · checking pending edits':'Viewer network restored');}};
  const offline=()=>{if(alive)status('Offline · local view still available');};
  if(typeof window!=='undefined'){
    window.addEventListener('online',online);
    window.addEventListener('offline',offline);
  }
  return {
    getUid:()=>user.uid,
    submitPlayerEdit,
    publish:()=>dm?outbox.flush({force:true}):Promise.resolve(false),
    getSyncStatus:()=>({hasPending:!!outbox?.hasPending,retryAttempt:outbox?.retryAttempt||0}),
    disconnect:()=>{
      alive=false;outbox?.dispose();unsubscribeLocal();unsubscribeData();unsubscribeEdits();
      if(typeof window!=='undefined'){
        window.removeEventListener('online',online);
        window.removeEventListener('offline',offline);
      }
    }
  };
}
