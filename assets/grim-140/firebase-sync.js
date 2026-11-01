import {firebaseConfig} from './firebase-config.js';
import {getState,subscribe,applyCloudState} from './state.js';

// There is deliberately no interactive login. Both DM and viewers use Firebase
// anonymous authentication. Database rules, NOT the existence of dm.html,
// decide which anonymous UID may write to a room.
export async function connectCloud({dm=false,room='grim-demo',status=()=>{},onIdentity=()=>{}}){
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
  let alive=true,pending=null,writing=false,writeTimer=null;
  const canWrite=()=>alive&&dm&&!!auth.currentUser;
  const readyText=dm?`DM device connected · ${safeRoom}`:`Viewer connected · ${safeRoom}`;
  status(readyText);

  // Only DM-side local edits go to Firebase. Viewer pages can never push updates
  // through the application, and Firebase rules independently enforce writer UID.
  async function publish(){
    if(writeTimer!==null){clearTimeout(writeTimer);writeTimer=null;}
    if(!canWrite()){status('Firebase connection unavailable');return false;}
    if(!pending)pending=getState();
    if(writing)return true;
    writing=true;
    let success=true;
    try{
      while(pending&&canWrite()){
        const next=pending;
        pending=null;
        try{
          await set(roomRef,next);
          if(alive)status(`Firebase live · ${safeRoom}`);
        }catch(error){
          // Drop the rejected write; the DM can retry after publishing rules.
          pending=null;
          success=false;
          if(alive)status(error?.code==='PERMISSION_DENIED'||error?.code==='permission_denied'
            ?'Write denied: install your DM device rules'
            :`Firebase write failed: ${error.message}`);
        }
      }
    }finally{writing=false;}
    return success;
  }
  // Changes appear in local tabs immediately. Coalesce fast slider drags into
  // one cloud snapshot after a short idle window, rather than writing every
  // mouse movement. Explicit Publish still bypasses this delay.
  const unsubscribeLocal=subscribe((next,source)=>{
    if(source==='local'&&canWrite()){
      pending=next;
      if(writeTimer!==null)clearTimeout(writeTimer);
      writeTimer=setTimeout(()=>{writeTimer=null;void publish();},190);
    }
  });
  let initialSnapshot=true;
  const unsubscribeData=onValue(roomRef,snapshot=>{
    if(!alive)return;
    if(!snapshot.exists()){
      status(dm?'Room is empty · publish when rules are installed':'Waiting for DM to publish a scene');
      return;
    }
    applyCloudState(snapshot.val(),{initial:initialSnapshot});
    initialSnapshot=false;
  },error=>{
    if(alive)status(`Firebase read blocked: ${error.message}`);
  });
  return {
    getUid:()=>user.uid,
    publish:()=>{pending=getState();return publish();},
    disconnect:()=>{alive=false;pending=null;if(writeTimer!==null)clearTimeout(writeTimer);writeTimer=null;unsubscribeLocal();unsubscribeData();}
  };
}
