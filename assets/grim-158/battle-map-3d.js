import * as T from './vendor/three.module.js';
import {createNativeCardLayer} from './native-cards.js';
import {disposeSceneGraph} from './scene-resources.js';
import {BATTLE_CELL_SIZE,buildBattleGeometry,worldCell,cellAtWorld} from './battle-map-geometry.js';
import {getBattlePositions} from './battle-map-state.js';

const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const FLAT_GROUND=()=>0;

/** A genuine 3D encounter stage, shared by the TV and the DM's live preview. */
export function createBattleMap3D(host,{onCell=null,quality='balanced',reducedMotion=false}={}){
  const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});
  renderer.setClearColor(0x15191d);
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.shadowMap.enabled=quality!=='low';
  renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-label',onCell?'3D battle map editor':'3D tactical battle map');
  renderer.domElement.style.cssText='width:100%;height:100%;display:block;touch-action:none';
  host.appendChild(renderer.domElement);
  const scene=new T.Scene();scene.background=new T.Color(0x15191d);
  const camera=new T.PerspectiveCamera(44,1,.1,2500);
  scene.add(new T.HemisphereLight(0xe3eaf2,0x313436,2.0));
  const key=new T.DirectionalLight(0xffeee0,2.45);key.position.set(-20,35,18);key.castShadow=renderer.shadowMap.enabled;
  key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:1,far:150});key.shadow.bias=-.00035;scene.add(key);
  const rim=new T.DirectionalLight(0xaec8d6,.8);rim.position.set(18,14,-19);scene.add(rim);
  let map=null,geometry=null,signature='',frame=0,disposed=false;
  const cards=createNativeCardLayer(scene,{onChange:()=>draw(),onError:e=>console.warn('Battle cards:',e)});
  cards.setReducedMotion(reducedMotion);
  let yaw=0,pitch=0,zoom=1,view='tactical',width=1,height=1;
  const picker=new T.Raycaster(),cursor=new T.Vector2();
  const env={terrainWidth:32,terrainDepth:20,seed:0,variation:0,hills:'flat'};
  function cameraPose(){
    if(!map)return;
    const w=map.width*BATTLE_CELL_SIZE,h=map.height*BATTLE_CELL_SIZE;
    const aspect=Math.max(.4,width/height);
    const base=Math.max(h*.95,w/(aspect*.85),12);
    const elevation=clamp((view==='overhead'?79:view==='ground'?29:55)+pitch,12,86)*Math.PI/180;
    const distance=(base+7)*(view==='ground'?1.18:1.05)/zoom;
    const az=yaw*Math.PI/180;
    const target=new T.Vector3(0,.2,0);
    const horizontal=distance*Math.cos(elevation);
    camera.position.set(Math.sin(az)*horizontal,Math.sin(elevation)*distance+target.y,Math.cos(az)*horizontal);
    camera.lookAt(target);camera.updateMatrixWorld(true);
  }
  function resize(){
    if(disposed)return;
    width=Math.max(1,host.clientWidth);height=Math.max(1,host.clientHeight);
    renderer.setPixelRatio(Math.min(quality==='low'?1:quality==='high'?1.75:1.4,window.devicePixelRatio||1));
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();cameraPose();draw();
  }
  function draw(){if(!disposed&&map&&!frame)frame=requestAnimationFrame(tick);}
  function tick(time){
    frame=0;if(disposed||!map||document.hidden)return;
    cards.update(camera,width,height,env,FLAT_GROUND,time);
    renderer.render(scene,camera);
    if(!reducedMotion&&cards.needsAnimation(time))draw();
  }
  function setMap(nextMap,cast=[],activeId='',scale=1){
    if(disposed)return;
    if(!nextMap){map=null;cards.setCards([],[],false);if(geometry){scene.remove(geometry.group);disposeSceneGraph(geometry.group);geometry=null;}return;}
    map=nextMap;
    const nextSignature=JSON.stringify([map.id,map.width,map.height,map.rows]);
    if(signature!==nextSignature){
      const next=buildBattleGeometry(map);
      scene.add(next.group);
      if(geometry){scene.remove(geometry.group);disposeSceneGraph(geometry.group);}
      geometry=next;signature=nextSignature;
      cameraPose();
    }
    const characters=cast.filter(c=>!c.hidden);
    const locations=getBattlePositions(map,cast);
    const placements=characters.filter(c=>locations.has(c.id)).map((c,index)=>{
      const cell=locations.get(c.id),p=worldCell(map,cell.x,cell.y);
      const layout={worldX:p.x,worldZ:p.z,side:c.faction==='enemy'?'enemy':'player',active:c.id===activeId,rank:index+1,index,scale};
      return {id:c.id,x:p.x,z:p.z,active:layout.active,layout};
    });
    cards.setCards(placements,characters,true);
    draw();
  }
  function pickCell(event){
    if(!geometry||!map)return null;
    const rect=renderer.domElement.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return null;
    cursor.set((event.clientX-rect.left)/rect.width*2-1,-((event.clientY-rect.top)/rect.height*2-1));
    picker.setFromCamera(cursor,camera);
    const hit=picker.intersectObject(geometry.clickable,false)[0];
    return hit?cellAtWorld(map,hit.point.x,hit.point.z):null;
  }
  if(onCell){
    let painting=false,last='';
    renderer.domElement.addEventListener('contextmenu',event=>event.preventDefault());
    renderer.domElement.addEventListener('pointerdown',event=>{
      if(event.button!==0||event.altKey)return;
      painting=true;last='';renderer.domElement.setPointerCapture?.(event.pointerId);
      const cell=pickCell(event);if(cell){last=`${cell.x}:${cell.y}`;onCell(cell,'start');}
    });
    renderer.domElement.addEventListener('pointermove',event=>{
      if(!painting)return;
      const cell=pickCell(event),id=cell&&`${cell.x}:${cell.y}`;
      if(cell&&id!==last){last=id;onCell(cell,'move');}
    });
    for(const type of ['pointerup','pointercancel'])renderer.domElement.addEventListener(type,()=>{painting=false;last='';});
    // The DM can hold Alt and drag with the right mouse button to orbit the preview.
    let drag=null;
    renderer.domElement.addEventListener('pointerdown',event=>{if(event.button===2||event.altKey){drag={x:event.clientX,y:event.clientY};renderer.domElement.setPointerCapture?.(event.pointerId);}});
    renderer.domElement.addEventListener('pointermove',event=>{if(!drag)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;drag={x:event.clientX,y:event.clientY};orbit(clamp(yaw+dx*.3,-180,180),clamp(pitch-dy*.3,-20,20));});
    renderer.domElement.addEventListener('pointerup',()=>drag=null);
    renderer.domElement.addEventListener('wheel',event=>{event.preventDefault();zoomTo(zoom*Math.exp(-event.deltaY*.001));},{passive:false});
  }
  function orbit(nextYaw,nextPitch){yaw=clamp(Number(nextYaw)||0,-180,180);pitch=clamp(Number(nextPitch)||0,-20,20);cameraPose();draw();}
  function zoomTo(next){zoom=clamp(Number(next)||1,.55,2.1);cameraPose();draw();return zoom;}
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;observer?.observe(host);
  const visibility=()=>{if(!document.hidden)draw();};document.addEventListener('visibilitychange',visibility);
  resize();
  return {
    setMap,resize,orbit,zoomTo,getOrbit:()=>({yaw,pitch}),getZoom:()=>zoom,
    getView:()=>view,setView(next){if(['ground','tactical','overhead'].includes(next)){view=next;cameraPose();draw();}return view;},
    pauseCinematic(){},setQuality(next){quality=next;renderer.shadowMap.enabled=quality!=='low';resize();},
    setReducedMotion(next){reducedMotion=!!next;cards.setReducedMotion(reducedMotion);draw();},
    dispose(){disposed=true;cancelAnimationFrame(frame);observer?.disconnect();document.removeEventListener('visibilitychange',visibility);cards.dispose();if(geometry)disposeSceneGraph(geometry.group);renderer.dispose();renderer.domElement.remove();}
  };
}
