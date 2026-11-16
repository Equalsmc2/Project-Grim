import {AVATAR_GROUPS,AVATAR_PALETTES,AVATAR_KEYS,AVATAR_ART_VERSION,DEFAULT_AVATAR,normalizeAvatar,encodeAvatar,isAvatarCode,randomAvatar,renderAvatarSvg,renderAvatarPng} from './avatar-art.js';
import {escapeHtml,getState,updateState} from './state.js';

let activeMaker=null;
const artRefreshes=new Set();
const clean=x=>escapeHtml(x);
const partChoices=part=>part.palette?AVATAR_PALETTES[part.palette].map(pair=>pair[0]):part.choices;

// Existing campaigns keep their editable 19-character recipes. Refresh any
// older raster portraits without asking players or DMs to recreate characters.
export function refreshAvatarArt(){
 for(const c of getState().characters||[]){
  if(!isAvatarCode(c.avatar)||c.portraitArtVersion===AVATAR_ART_VERSION&&String(c.portrait||'').startsWith('data:image/png;base64,'))continue;
  const id=c.id,code=c.avatar,key=id+'/'+code;
  if(artRefreshes.has(key))continue;
  artRefreshes.add(key);
  void renderAvatarPng(code).then(portrait=>{
   const current=getState().characters.find(item=>item.id===id);
   if(!current||current.avatar!==code||current.portraitArtVersion===AVATAR_ART_VERSION&&current.portrait===portrait)return;
   updateState(next=>{
    const character=next.characters.find(item=>item.id===id);
    if(character&&character.avatar===code){
     character.portrait=portrait;
     character.portraitAvatar=code;
     character.portraitArtVersion=AVATAR_ART_VERSION;
    }
   },'Handcrafted portrait style updated');
  }).catch(error=>console.warn('Could not redraw saved portrait:',error)).finally(()=>artRefreshes.delete(key));
 }
}

export function openAvatarMaker({name='Character',initial='',onSave}={}){
 if(activeMaker)activeMaker.close(true);
 let values=normalizeAvatar(initial),groupIndex=0,partIndex=0,dirty=false,saving=false;
 const group=()=>AVATAR_GROUPS[groupIndex];
 const part=()=>group().parts[partIndex];
 const previousFocus=document.activeElement;
 const oldOverflow=document.body.style.overflow;
 const shell=document.createElement('div');
 shell.className='grim-maker-overlay';
 shell.innerHTML='<div class="grim-maker-dialog" role="dialog" aria-modal="true" aria-labelledby="grimMakerTitle">'+
   '<div class="grim-maker-heading"><div><span class="grim-maker-kicker">PROJECT GRIM / CHARACTER STUDIO</span><h2 id="grimMakerTitle">Make '+clean(name)+'</h2><p>Build a portrait from simple, layered shapes.</p></div>'+
   '<button type="button" class="grim-maker-close" data-action="close" aria-label="Close character creator">×</button></div>'+
   '<div class="grim-maker-layout"><section class="grim-maker-view" aria-label="Portrait preview">'+
     '<div class="grim-maker-portrait" id="grimMakerPortrait"></div>'+
     '<div class="grim-maker-view-tools"><button type="button" data-action="random" title="Random selection of available shapes">Randomize</button><button type="button" data-action="reset">Reset</button></div>'+
     '<p class="grim-maker-note">Drawn with shapes. No image generator or upload needed.</p></section>'+
   '<section class="grim-maker-controls" aria-label="Appearance options">'+
     '<div class="grim-maker-tabs" id="grimMakerTabs" role="tablist" aria-label="Appearance category"></div>'+
     '<div class="grim-maker-parts" id="grimMakerParts" aria-label="Choose a feature"></div>'+
     '<div class="grim-maker-choice-header"><h3 id="grimMakerPartTitle"></h3><span id="grimMakerPartCount"></span></div>'+
     '<div class="grim-maker-options" id="grimMakerOptions"></div></section></div>'+
   '<div class="grim-maker-footer"><span id="grimMakerMessage" role="status" aria-live="polite">Changes are a preview until you save.</span><div class="grim-maker-footer-actions"><button type="button" data-action="cancel">Cancel</button><button type="button" class="grim-maker-save" data-action="save">Save portrait</button></div></div>'+
 '</div>';
 document.body.appendChild(shell);
 document.body.style.overflow='hidden';
 const query=sel=>shell.querySelector(sel);
 const preview=query('#grimMakerPortrait'),tabs=query('#grimMakerTabs'),parts=query('#grimMakerParts'),options=query('#grimMakerOptions');
 const msg=query('#grimMakerMessage'),save=query('[data-action="save"]');
 function paint(){
   preview.innerHTML=renderAvatarSvg(values);
   tabs.innerHTML=AVATAR_GROUPS.map((item,i)=>'<button type="button" role="tab" data-group="'+i+'" aria-selected="'+(i===groupIndex)+'" tabindex="'+(i===groupIndex?'0':'-1')+'">'+clean(item.label)+'</button>').join('');
   parts.innerHTML=group().parts.map((item,i)=>'<button type="button" data-part="'+i+'" aria-pressed="'+(i===partIndex)+'">'+clean(item.label)+'</button>').join('');
   query('#grimMakerPartTitle').textContent=part().label;
   const labels=partChoices(part());
   query('#grimMakerPartCount').textContent=labels.length+' choices';
   options.innerHTML=labels.map((label,index)=>{
     const selected=values[part().key]===index;
     const graphic=part().palette?'<span class="grim-maker-color" style="background:'+AVATAR_PALETTES[part().palette][index][1]+'"></span>':
       '<span class="grim-maker-thumb">'+renderAvatarSvg({...values,[part().key]:index})+'</span>';
     return '<button type="button" class="grim-maker-option" data-choice="'+index+'" aria-pressed="'+selected+'" aria-label="'+clean(part().label+': '+label)+'">'+graphic+'<small>'+clean(label)+'</small></button>';
   }).join('');
 }
 function discard(force){
   if(saving)return;
   if(!force&&dirty&&!window.confirm('Discard your portrait changes?'))return;
   shell.remove();
   document.body.style.overflow=oldOverflow;
   document.removeEventListener('keydown',onKey);
   activeMaker=null;
   if(previousFocus?.isConnected)previousFocus.focus();
 }
 function onKey(e){
   if(e.key==='Escape'){e.preventDefault();discard(false);return;}
   if(e.key!=='Tab')return;
   const focusable=[...shell.querySelectorAll('button:not([disabled]):not([tabindex="-1"])')];
   const index=focusable.indexOf(document.activeElement);
   if(e.shiftKey&&index===0){e.preventDefault();focusable[focusable.length-1]?.focus();}
   else if(!e.shiftKey&&index===focusable.length-1){e.preventDefault();focusable[0]?.focus();}
 }
 document.addEventListener('keydown',onKey);
 shell.addEventListener('click',async e=>{
   if(e.target===shell){discard(false);return;}
   const button=e.target.closest('button');
   if(!button||saving)return;
   if(button.dataset.group!==undefined){groupIndex=Number(button.dataset.group);partIndex=0;paint();tabs.querySelector('[data-group="'+groupIndex+'"]')?.focus();return;}
   if(button.dataset.part!==undefined){partIndex=Number(button.dataset.part);paint();parts.querySelector('[data-part="'+partIndex+'"]')?.focus();return;}
   if(button.dataset.choice!==undefined){
     const index=Number(button.dataset.choice);
     if(!Number.isInteger(index)||index<0||index>=partChoices(part()).length)return;
     values[part().key]=index;dirty=true;paint();
     options.querySelector('[data-choice="'+index+'"]')?.focus();return;
   }
   const action=button.dataset.action;
   if(action==='close'||action==='cancel'){discard(false);return;}
   if(action==='random'){values=randomAvatar();dirty=true;paint();return;}
   if(action==='reset'){values={...DEFAULT_AVATAR};dirty=true;paint();return;}
   if(action==='save'){
     if(typeof onSave!=='function'){msg.textContent='Saving is unavailable for this character.';return;}
     saving=true;save.disabled=true;save.textContent='Rendering…';msg.textContent='Drawing your portrait…';
     try{
       const code=encodeAvatar(values);
       const portrait=await renderAvatarPng(code);
       await onSave({code,portrait});
       saving=false;discard(true);
     }catch(error){
       saving=false;save.disabled=false;save.textContent='Save portrait';
       msg.textContent='Could not save: '+(error?.message||'Unknown error');
     }
   }
 });
 activeMaker={close:discard};
 paint();
 query('.grim-maker-close').focus();
 return activeMaker;
}
