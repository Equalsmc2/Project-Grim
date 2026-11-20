import * as T from './vendor/three.module.js';
import {createNativeCardLayer} from './native-cards.js?v=2';
import {disposeSceneGraph} from './scene-resources.js';
import {BATTLE_CELL_SIZE,buildBattleGeometry,worldCell,cellAtWorld} from './battle-map-geometry.js';
import {getBattlePositions} from './battle-map-state.js';

const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const wrapYaw=value=>((value+180)%360+360)%360-180;
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
  let yaw=0,pitch=0,zoom=1,view='tactical',width=1,height=1,panX=0,panZ=0,interactionMode='build';
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
    const target=new T.Vector3(panX,.2,panZ);
    const horizontal=distance*Math.cos(elevation);
    camera.position.set(target.x+Math.sin(az)*horizontal,Math.sin(elevation)*distance+target.y,target.z+Math.cos(az)*horizontal);
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
    // A full card fits inside one 5-ft square in both width and height:
    // 0.58 tiles wide × (268/160) = 0.97 tiles tall. Never screen-size it.
    cards.update(camera,width,height,env,FLAT_GROUND,time,1,BATTLE_CELL_SIZE*.58);
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
    let pointerAction=null,last='';
    renderer.domElement.addEventListener('contextmenu',event=>event.preventDefault());
    renderer.domElement.addEventListener('pointerdown',event=>{
      if(event.button>2)return;
      const kind=event.button===1||event.shiftKey?'pan':event.button===2||event.altKey?'orbit':interactionMode;
      if(kind==='build'&&event.button!==0)return;
      event.preventDefault();
      pointerAction={id:event.pointerId,kind,x:event.clientX,y:event.clientY};last='';
      renderer.domElement.setPointerCapture?.(event.pointerId);
      if(kind==='build'){
        const cell=pickCell(event);if(cell){last=`${cell.x}:${cell.y}`;onCell(cell,'start');}
      }
    });
    renderer.domElement.addEventListener('pointermove',event=>{
      if(!pointerAction||pointerAction.id!==event.pointerId)return;
      const dx=event.clientX-pointerAction.x,dy=event.clientY-pointerAction.y;
      pointerAction.x=event.clientX;pointerAction.y=event.clientY;
      if(pointerAction.kind==='orbit')orbit(yaw+dx*.38,pitch-dy*.29);
      else if(pointerAction.kind==='pan')pan(dx,dy);
      else{
        const cell=pickCell(event),id=cell&&`${cell.x}:${cell.y}`;
        if(cell&&id!==last){last=id;onCell(cell,'move');}
      }
    });
    for(const type of ['pointerup','pointercancel'])renderer.domElement.addEventListener(type,event=>{if(pointerAction?.id===event.pointerId)pointerAction=null;last='';});
    renderer.domElement.addEventListener('wheel',event=>{event.preventDefault();zoomTo(zoom*Math.exp(-event.deltaY*.001));},{passive:false});
  }
  function orbit(nextYaw,nextPitch){yaw=wrapYaw(Number(nextYaw)||0);pitch=clamp(Number(nextPitch)||0,-70,58);cameraPose();draw();}
  function pan(dx,dy){
    if(!map)return;
    const depth=camera.position.distanceTo(new T.Vector3(panX,.2,panZ));
    const units=(2*depth*Math.tan(camera.fov*Math.PI/360))/Math.max(1,height);
    const right=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,0);
    const up=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,1);
    const limitX=map.width*BATTLE_CELL_SIZE*.8,limitZ=map.height*BATTLE_CELL_SIZE*.8;
    panX=clamp(panX+(-dx*right.x+dy*up.x)*units,-limitX,limitX);
    panZ=clamp(panZ+(-dx*right.z+dy*up.z)*units,-limitZ,limitZ);
    cameraPose();draw();
  }
  function zoomTo(next){zoom=clamp(Number(next)||1,.35,4.5);cameraPose();draw();return zoom;}
  function resetView(){yaw=0;pitch=0;zoom=1;panX=0;panZ=0;cameraPose();draw();}
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;observer?.observe(host);
  const visibility=()=>{if(!document.hidden)draw();};document.addEventListener('visibilitychange',visibility);
  resize();
  return {
    setMap,resize,orbit,pan,zoomTo,resetView,getOrbit:()=>({yaw,pitch}),getZoom:()=>zoom,
    setInteractionMode(next){if(['build','orbit','pan'].includes(next))interactionMode=next;return interactionMode;},
    getView:()=>view,setView(next){if(['ground','tactical','overhead'].includes(next)){view=next;cameraPose();draw();}return view;},
    pauseCinematic(){},setQuality(next){quality=next;renderer.shadowMap.enabled=quality!=='low';resize();},
    setReducedMotion(next){reducedMotion=!!next;cards.setReducedMotion(reducedMotion);draw();},
    dispose(){disposed=true;cancelAnimationFrame(frame);observer?.disconnect();document.removeEventListener('visibilitychange',visibility);cards.dispose();if(geometry)disposeSceneGraph(geometry.group);renderer.dispose();renderer.domElement.remove();}
  };
}
