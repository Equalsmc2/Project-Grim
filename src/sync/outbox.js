// Reliability boundary for Firebase writes. No Firebase imports or DOM globals:
// this can be tested with a deterministic fake network and fake clock.
export const isPermissionFailure = error => /permission[_-]?denied/i.test(String(error?.code || ''));
export const retryDelay = (attempt, base=900, ceiling=30000) =>
  Math.min(ceiling, base * 2 ** Math.min(10, Math.max(0, attempt - 1)));

export function createCloudOutbox({send,readState,canWrite=()=>true,onStatus=()=>{},
  setTimer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id),
  debounceMs=190,retryBase=900,retryMax=30000}={}){
  if(typeof send!=='function'||typeof readState!=='function')throw new TypeError('Cloud outbox requires send and readState');
  let alive=true,pending=null,timer=null,activeFlush=null,attempt=0,lastFailure=null;
  const clear=()=>{if(timer!==null){clearTimer(timer);timer=null;}};
  function schedule(ms){
    if(!alive||pending===null)return;
    clear();
    timer=setTimer(()=>{timer=null;void flush();},ms);
  }
  function queue(snapshot){
    if(!alive)return;
    pending=snapshot;
    if(activeFlush===null)schedule(debounceMs);
    onStatus({kind:'pending'});
  }
  function flush({force=false}={}){
    if(!alive)return Promise.resolve(false);
    if(force){pending=readState();clear();}
    if(activeFlush!==null)return activeFlush;
    if(pending===null)return Promise.resolve(true);
    if(!canWrite()){
      onStatus({kind:'offline'});
      return Promise.resolve(false);
    }
    clear();
    activeFlush=(async()=>{
      while(alive&&pending!==null){
        if(!canWrite()){
          onStatus({kind:'offline'});
          return false;
        }
        const snapshot=pending;
        pending=null;
        try{
          await send(snapshot);
          attempt=0;lastFailure=null;
          if(alive)onStatus({kind:'sent',snapshot});
        }catch(error){
          if(!alive)return false;
          // Another local edit may have arrived during the failed write.
          // Never roll it back to an older snapshot.
          if(pending===null)pending=snapshot;
          attempt+=1;lastFailure=error;
          const denied=isPermissionFailure(error);
          const delay=denied?null:retryDelay(attempt,retryBase,retryMax);
          onStatus({kind:denied?'denied':'retry',error,delay,attempt});
          if(delay!==null)schedule(delay);
          return false;
        }
      }
      return alive&&pending===null;
    })();
    activeFlush.finally(()=>{
      activeFlush=null;
      // A new change may arrive between the final send and settled flush.
      // A failure already scheduled its own retry; do not defeat backoff.
      if(alive&&pending!==null&&timer===null&&lastFailure===null)schedule(0);
    });
    return activeFlush;
  }
  function resume(){if(!alive||pending===null)return;lastFailure=null;attempt=0;schedule(0);}
  function dispose(){alive=false;pending=null;clear();}
  return {queue,flush,resume,dispose,
    get hasPending(){return pending!==null||activeFlush!==null;},
    get hasUnsent(){return pending!==null;},
    get isWriting(){return activeFlush!==null;},
    get retryAttempt(){return attempt;},
    get lastError(){return lastFailure;}};
}
