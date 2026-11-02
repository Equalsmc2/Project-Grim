import {AMBIENCE_TRACKS,createAmbiencePlayer,normalizeSelection,formatGain} from './ambience.js';
import {ENV_DEFAULT,PRESETS,normalizeEnvironment} from './environment-state.js';
import {ATMOSPHERE_PRESETS,effectiveTime} from './atmosphere.js';
import {subscribe,updateState} from './state.js';
const panel=document.getElementById('environmentEditor');
const choices={ground:['blank','grass','stone','dirt','sand','snow','leaves'],hills:['flat','small','mid','mountains'],weather:['none','rain','snow','leaves','dust','blizzard','sandstorm','thunderstorm'],props:['mixed','forest','rocks','ruins','snow','grass','bushes','logs','graves']};
const ranges={terrainWidth:['Terrain width',18,48,1],terrainDepth:['Terrain depth',12,36,1],variation:['Surface variation',0,1,.05],pathX:['Path position X',-7,7,.1],pathZ:['Path position Z',-4,4,.1],pathAngle:['Path orientation °',-180,180,5],pathWidth:['Path width',.5,6,.1],pathEdge:['Path edge scatter',0,1,.05],intensity:['Weather intensity',0,1,.05],windAngle:['Wind direction °',0,360,5],windSpeed:['Wind speed',0,5,.1],fog:['Atmospheric fog',0,1,.05],accumulation:['Ground accumulation',0,1,.05],density:['Prop density',0,1,.05],timeOfDay:['Time of day (hours)',0,24,.25],cloudCover:['Cloud coverage',0,1,.05],cycleSpeed:['Cycle speed (hours / real hour)',1,96,1],cinematicSpeed:['Cinematic pan speed',.35,2.5,.05]};
const select=(key,label,values)=>`<label class="field"><span>${label}</span><select data-env="${key}">${values.map(v=>`<option value="${v}">${v}</option>`).join('')}</select></label>`;
const slider=(key)=>{const [label,min,max,step]=ranges[key];return `<label class="field"><span>${label} <output id="env-${key}"></output></span><input type="range" aria-label="${label}" data-env="${key}" min="${min}" max="${max}" step="${step}"></label>`;};
const atmosphereKeys=['timeOfDay','cloudCover','cycleSpeed','cinematicSpeed','fog','accumulation','intensity','windAngle','windSpeed'];
const terrainKeys=Object.keys(ranges).filter(key=>!atmosphereKeys.includes(key));
panel.innerHTML=`
 <div class="environment-toolbar">${select('preset','Environment preset',Object.keys(PRESETS))}<button class="button button-secondary" id="envRegenerate">Regenerate seed</button><button class="button button-secondary" id="envClear">Clear props</button></div>
 <div class="grim-atmosphere-panel">
  <div class="panel-header"><div><span class="eyebrow">LIVE LIGHTING / SKY</span><h3>Living atmosphere</h3></div><span class="atmosphere-clock" id="envClock">12:00</span></div>
  <div class="atmosphere-presets">${Object.keys(ATMOSPHERE_PRESETS).map(name=>`<button type="button" class="button button-secondary atmo-preset" data-atmo-preset="${name}" title="Set ${name} atmosphere">${name}</button>`).join('')}</div>
  <div class="environment-grid atmosphere-controls">${slider('timeOfDay')}<label class="toggle-line"><input type="checkbox" data-env="cycleEnabled"><span>Run day / night cycle</span></label>${slider('cloudCover')}${slider('cycleSpeed')}${select('weather','3D weather / storm',choices.weather)}${slider('intensity')}${slider('fog')}${slider('accumulation')}${slider('windAngle')}${slider('windSpeed')}</div>
  <div class="environment-grid grim-cinematic-editor"><label class="toggle-line"><input type="checkbox" data-env="cinematicPan"><span>Automatic cinematic camera pan on the stage</span></label>${slider('cinematicSpeed')}</div>
  <p class="helper">Sun, moon, clouds, weather and lighting transition smoothly. Night darkens the environment without hiding combat cards.</p>
 </div>
 <div class="grim-ambience-panel" aria-label="Ambience sounds">
  <div class="grim-ambience-heading"><div><span class="eyebrow">STAGE AUDIO / LOOPING</span><h3>Ambience</h3></div><span id="ambienceSelected" class="ambient-muted">Off</span></div>
  <div class="grim-ambience-controls">
   <label class="field"><span>Stage ambience</span><select id="ambienceTrack" aria-label="Stage ambience sound">${Object.entries(AMBIENCE_TRACKS).map(([id,t])=>`<option value="${id}">${t.label}</option>`).join('')}</select></label>
   <label class="field"><span>Stage volume <output id="ambienceVolumeText">55%</output></span><input id="ambienceVolume" type="range" min="0" max="100" step="5" aria-label="Stage ambience volume"></label>
   <button class="button button-secondary" type="button" id="ambiencePreview">▶ Preview</button>
  </div>
  <p class="helper" id="ambiencePreviewStatus" role="status">The DM's preview plays only on this device. Stage playback requires one click on Enable Sound in the viewer.</p>
 </div>
 <details class="grim-environment-details"><summary>Terrain, paths & props</summary><div class="environment-grid">${['ground','hills','props'].map(k=>select(k,({ground:'Ground material',hills:'Hill profile',props:'Prop family'})[k],choices[k])).join('')}<label class="toggle-line"><input type="checkbox" data-env="path"><span>Stone path / mixed ground</span></label>${terrainKeys.map(slider).join('')}</div></details>
 <p class="helper" id="envSeed"></p>`;
panel.addEventListener('input',ev=>{
 const el=ev.target,key=el.dataset.env;if(!key)return;
 updateState(s=>{
  if(key==='preset')s.environment=normalizeEnvironment({...ENV_DEFAULT,...PRESETS[el.value],preset:el.value,seed:s.environment.seed});
  else{
   if(key==='cycleEnabled'){
    if(!el.checked)s.environment.timeOfDay=effectiveTime(s.environment);
    s.environment.timeEpoch=Date.now();
   }else if(key==='timeOfDay')s.environment.timeEpoch=Date.now();
   s.environment[key]=el.type==='checkbox'?el.checked:el.type==='range'?Number(el.value):el.value;
   if(['timeOfDay','cycleEnabled','cycleSpeed','weather','intensity','cloudCover','fog','windAngle','windSpeed','accumulation'].includes(key))s.environment.atmospherePreset='Custom';
  }
 });
});
panel.addEventListener('click',ev=>{
 const button=ev.target.closest('[data-atmo-preset]');if(!button)return;
 const name=button.dataset.atmoPreset,preset=ATMOSPHERE_PRESETS[name];if(!preset)return;
 updateState(s=>{s.environment={...s.environment,...preset,atmospherePreset:name,timeEpoch:Date.now()};},`Atmosphere: ${name}`);
});
document.getElementById('envRegenerate').onclick=()=>updateState(s=>{s.environment.seed=1+Math.floor(Math.random()*2147483646);},'Environment regenerated');
document.getElementById('envClear').onclick=()=>updateState(s=>s.environment.density=0,'Environment props cleared');
let latest;
subscribe(s=>{
 latest=normalizeEnvironment(s.environment);
 panel.querySelectorAll('[data-env]').forEach(el=>{
  const key=el.dataset.env;if(el.type==='checkbox')el.checked=latest[key];
  else if(document.activeElement!==el)el.value=latest[key];
  const out=document.getElementById('env-'+key);
  if(out)out.textContent=key==='timeOfDay'?`${Math.floor(latest[key]).toString().padStart(2,'0')}:${Math.round((latest[key]%1)*60).toString().padStart(2,'0')}`:latest[key];
 });
 panel.querySelectorAll('[data-atmo-preset]').forEach(el=>el.classList.toggle('selected',el.dataset.atmoPreset===latest.atmospherePreset));
 document.getElementById('envSeed').textContent=`Layout seed ${latest.seed} · terrain ${latest.terrainWidth} × ${latest.terrainDepth} · hills ${latest.hills} · world-anchored cards`;
 showClock();
});
function showClock(){
 if(!latest)return;const time=effectiveTime(latest),h=Math.floor(time),m=Math.floor((time-h)*60);
 document.getElementById('envClock').textContent=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}
// Display-only update: never writes shared state from an interval.
setInterval(()=>{if(!document.hidden&&latest?.cycleEnabled)showClock();},2000);

// Preview is never broadcast; stage audio is entirely controlled by the
// selected track/volume, already serialized by updateState/Firebase sync.
const soundPicker=document.getElementById('ambienceTrack');
const soundLevel=document.getElementById('ambienceVolume');
const soundValue=document.getElementById('ambienceVolumeText');
const soundSelected=document.getElementById('ambienceSelected');
const previewButton=document.getElementById('ambiencePreview');
const previewStatus=document.getElementById('ambiencePreviewStatus');
const preview=createAmbiencePlayer({onStatus:(type)=>{
 if(type==='playing')previewStatus.textContent='Preview playing locally · not heard on the player stage';
 if(type==='blocked'||type==='error'){previewStatus.textContent='Preview unavailable: audio blocked or file could not load';previewButton.textContent='▶ Preview';}
 if(type==='locked')previewStatus.textContent='Preview stopped · stage selection is unchanged';
}});
function stopPreview(){preview.disable();previewButton.textContent='▶ Preview';}
soundPicker.addEventListener('change',()=>{
 stopPreview();updateState(s=>{s.environment.ambience=normalizeSelection(soundPicker.value);},'Ambience: '+AMBIENCE_TRACKS[normalizeSelection(soundPicker.value)].label);
});
soundLevel.addEventListener('input',()=>{
 const value=Number(soundLevel.value)/100;soundValue.textContent=formatGain(value);
 updateState(s=>{s.environment.ambienceVolume=value;});
 if(preview.enabled)preview.sync(soundPicker.value,value);
});
previewButton.addEventListener('click',()=>{
 if(preview.enabled){stopPreview();return;}
 const id=normalizeSelection(soundPicker.value);
 if(id==='none'){previewStatus.textContent='Choose an ambience sound first';return;}
 preview.sync(id,Number(soundLevel.value)/100);
 preview.enable();previewButton.textContent='■ Stop preview';
});
subscribe(s=>{
 const e=normalizeEnvironment(s.environment);
 if(document.activeElement!==soundPicker)soundPicker.value=e.ambience;
 if(document.activeElement!==soundLevel)soundLevel.value=Math.round(e.ambienceVolume*100);
 soundValue.textContent=formatGain(e.ambienceVolume);
 soundSelected.textContent=AMBIENCE_TRACKS[e.ambience].label;
 previewButton.disabled=e.ambience==='none';
 if(e.ambience==='none'&&preview.enabled)stopPreview();
});
window.addEventListener('pagehide',()=>preview.dispose());
