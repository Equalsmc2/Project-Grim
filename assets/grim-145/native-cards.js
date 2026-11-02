import * as T from './vendor/three.module.js';

// Cards are real camera-facing meshes in the SAME WebGL scene and depth buffer
// as scenery. The only DOM cards are the explicit non-WebGL fallback.
export const CARD_WIDTH_PX=174;
export const CARD_HEIGHT_PX=240;
export const TEXTURE_WIDTH=696;
export const TEXTURE_HEIGHT=960;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const clean=s=>String(s??'');

export function cardVisualData(c,place,combat){
  return {
    id:clean(c.id), name:clean(c.name), className:clean(c.className), ancestry:clean(c.ancestry),
    portrait:clean(c.portrait), symbol:clean(c.symbol||'✦'),
    level:Math.max(1,Number(c.level)||1),
    hp:Math.max(0,Number(c.hp)||0),maxHp:Math.max(1,Number(c.maxHp)||1),
    ac:Number(c.ac)||0, initiative:Number(c.initiative)||0,
    conditions:Array.isArray(c.conditions)?c.conditions.slice(0,2).map(clean):[],
    enemy:place.side==='enemy',active:!!place.active,rank:Number(place.rank)||1,combat:!!combat
  };
}

export function cardPixelSize(viewWidth,cardScale,perspectiveDistance=30){
  const responsive=viewWidth<520?.39:viewWidth<800?.47:viewWidth<1100?.53:.60;
  const perspective=clamp(Math.pow(30/Math.max(perspectiveDistance,1),.20),.92,1.06);
  const scale=clamp(responsive*((Number(cardScale)||.72)/.72)*perspective,.32,.76);
  return {width:CARD_WIDTH_PX*scale,height:CARD_HEIGHT_PX*scale,scale};
}

// Perspective projection converts a desired *screen-space* height into a true
// world-space plane height. This keeps billboards legible across camera modes
// without detaching them from their world coordinates.
export function worldHeightForPixels(pixelHeight,viewportHeight,depth,fovDegrees){
  return Math.max(.01,2*Math.max(.01,depth)*Math.tan(fovDegrees*Math.PI/360)*pixelHeight/Math.max(1,viewportHeight));
}

function rounded(ctx,x,y,w,h,r){
  const a=Math.min(r,w/2,h/2);
  ctx.beginPath();ctx.moveTo(x+a,y);ctx.lineTo(x+w-a,y);ctx.quadraticCurveTo(x+w,y,x+w,y+a);
  ctx.lineTo(x+w,y+h-a);ctx.quadraticCurveTo(x+w,y+h,x+w-a,y+h);
  ctx.lineTo(x+a,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-a);
  ctx.lineTo(x,y+a);ctx.quadraticCurveTo(x,y,x+a,y);ctx.closePath();
}
function fitText(ctx,value,maxWidth,size=16,min=9){
  let t=clean(value);ctx.font=`700 ${size}px system-ui, sans-serif`;
  while(ctx.measureText(t).width>maxWidth && size>min){size-=.5;ctx.font=`700 ${size}px system-ui, sans-serif`;}
  if(ctx.measureText(t).width>maxWidth){while(t.length>1&&ctx.measureText(t+'…').width>maxWidth)t=t.slice(0,-1);t+='…';}
  return t;
}
export function paintCard(ctx,data,portrait=null){
  const w=CARD_WIDTH_PX,h=CARD_HEIGHT_PX;
  ctx.clearRect(0,0,w,h);
  ctx.save();
  rounded(ctx,1,1,w-2,h-2,7);ctx.fillStyle=data.enemy?'#171819':'#121616';ctx.fill();
  ctx.strokeStyle=data.active?'#ffffff':data.enemy?'#d4d4d4':'#8b9a9a';ctx.lineWidth=data.active?3:1.5;ctx.stroke();
  const sheen=ctx.createLinearGradient(0,0,w,h);sheen.addColorStop(0,'rgba(255,255,255,.16)');sheen.addColorStop(.29,'rgba(255,255,255,0)');sheen.addColorStop(1,'rgba(255,255,255,.025)');
  rounded(ctx,4,4,w-8,h-8,5);ctx.fillStyle=sheen;ctx.fill();
  ctx.textBaseline='middle';ctx.textAlign='left';
  ctx.font='700 9px monospace';ctx.fillStyle=data.enemy?'#f0f0f0':'#b6d5d0';
  ctx.fillText(data.enemy?'◆ ENEMY / NPC':'● PLAYER / PC',10,17);
  ctx.textAlign='right';ctx.fillText(`LVL ${data.level}`,w-10,17);ctx.textAlign='left';
  rounded(ctx,9,30,w-18,109,4);ctx.fillStyle=data.enemy?'#343538':'#293538';ctx.fill();
  ctx.save();rounded(ctx,9,30,w-18,109,4);ctx.clip();
  if(portrait && portrait.complete && portrait.naturalWidth){
    const ratio=Math.max((w-18)/portrait.naturalWidth,109/portrait.naturalHeight);
    const pw=portrait.naturalWidth*ratio,ph=portrait.naturalHeight*ratio;
    ctx.drawImage(portrait,9+(w-18-pw)/2,30+(109-ph)/2,pw,ph);
  }else{
    const art=ctx.createLinearGradient(9,30,w-9,139);art.addColorStop(0,data.enemy?'#555256':'#4b5759');art.addColorStop(1,'#101314');ctx.fillStyle=art;ctx.fillRect(9,30,w-18,109);
    ctx.textAlign='center';ctx.font='700 29px system-ui, sans-serif';ctx.fillStyle='rgba(255,255,255,.30)';ctx.fillText(data.symbol,w/2,85);
    ctx.font='700 9px monospace';ctx.fillText(data.enemy?'NPC':'PC',w/2,123);ctx.textAlign='left';
  }
  ctx.restore();
  ctx.fillStyle='rgba(255,255,255,.10)';ctx.fillRect(9,138,w-18,1);
  ctx.fillStyle='#ffffff';ctx.font='700 16px system-ui, sans-serif';
  const nm=fitText(ctx,data.name,w-20,16,10);ctx.fillText(nm,10,157);
  ctx.fillStyle='#b6bbbe';ctx.font='11px system-ui, sans-serif';
  const role=clean(data.ancestry)+(data.ancestry&&data.className?' · ':'')+clean(data.className);
  let sub=role;while(ctx.measureText(sub).width>w-20&&sub.length>2)sub=sub.slice(0,-2)+'…';
  ctx.fillText(sub,10,174);
  ctx.fillStyle='#777e83';ctx.fillRect(10,185,w-20,1);
  const stats=[['HP',`${data.hp}/${data.maxHp}`],['AC',String(data.ac)],[data.combat?'INIT':'LVL',String(data.combat?data.initiative:data.level)]];
  stats.forEach(([label,val],i)=>{const x=10+i*53;
    ctx.fillStyle='#b8bdc0';ctx.font='700 8px monospace';ctx.fillText(label,x,198);
    ctx.fillStyle='#f3f4f4';ctx.font='700 16px system-ui, sans-serif';ctx.fillText(val,x,216);
  });
  ctx.font='700 8px monospace';ctx.fillStyle=data.enemy?'#bdbfc3':'#aab8b4';
  ctx.fillText(`TURN ${String(data.rank).padStart(2,'0')}`,10,231);
  ctx.textAlign='right';ctx.fillStyle=data.active?'#ffffff':'#e8e5da';
  if(data.conditions.length)ctx.fillText(data.conditions.join(' · ').slice(0,21),w-9,231);
  else if(data.active)ctx.fillText('● ACTIVE',w-9,231);
  ctx.textAlign='left';
  if(data.active){ctx.strokeStyle='rgba(255,255,255,.98)';ctx.lineWidth=2;rounded(ctx,4,4,w-8,h-8,5);ctx.stroke();}
  ctx.restore();
}

export function createNativeCardLayer(scene,{onError=()=>{},onChange=()=>{}}={}){
  const group=new T.Group();group.name='GRIM_NATIVE_CARDS';scene.add(group);
  const entries=new Map();let available=true;
  const cardGeometry=new T.PlaneGeometry(1,1);
  const cameraForward=new T.Vector3(),fromCamera=new T.Vector3(),groundPoint=new T.Vector3();
  function disposeEntry(entry){
    entry.alive=false;entry.image&&(entry.image.onload=entry.image.onerror=null);
    group.remove(entry.mesh);entry.mesh.material.dispose();entry.texture.dispose();
  }
  function renderTexture(entry){
    const ctx=entry.canvas.getContext('2d');if(!ctx){onError('Canvas 2D unavailable');return;}
    ctx.setTransform(TEXTURE_WIDTH/CARD_WIDTH_PX,0,0,TEXTURE_HEIGHT/CARD_HEIGHT_PX,0,0);
    paintCard(ctx,entry.data,entry.image);
    entry.texture.needsUpdate=true;onChange();
  }
  function setCards(anchors,characters,combat){
    if(!available)return;
    const lookup=new Map((characters||[]).map(c=>[clean(c.id),c]));
    const used=new Set();
    for(const a of anchors){
      const c=lookup.get(clean(a.id));if(!c)continue;
      const data=cardVisualData(c,a.layout,combat);const id=clean(a.id);
      used.add(id);
      const signature=JSON.stringify(data);
      let entry=entries.get(id);
      if(!entry){
        const canvas=document.createElement('canvas');canvas.width=TEXTURE_WIDTH;canvas.height=TEXTURE_HEIGHT;
        const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
        texture.anisotropy=4;
        const mat=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide,depthTest:true,depthWrite:true,transparent:false,alphaTest:.04,toneMapped:false,fog:false});
        const mesh=new T.Mesh(cardGeometry,mat);mesh.name='GRIM_CARD_'+id;
        mesh.frustumCulled=false;mesh.userData.combatantId=id;
        group.add(mesh);entry={mesh,texture,canvas,signature:'',data,alive:true,image:null};entries.set(id,entry);
      }
      if(entry.signature!==signature){
        entry.signature=signature;entry.data=data;entry.image&&(entry.image.onload=entry.image.onerror=null);entry.image=null;
        renderTexture(entry);
        if(/^data:image\/(png|jpeg|webp);base64,[\w+/=]+$/.test(data.portrait) && typeof Image!=='undefined'){
          const image=new Image();entry.image=image;
          image.onload=()=>{if(entry.alive&&entry.image===image)renderTexture(entry);};
          image.onerror=()=>{if(entry.alive&&entry.image===image){entry.image=null;renderTexture(entry);}};
          image.src=data.portrait;
        }
      }
      entry.anchor=a;
    }
    for(const [id,entry] of entries)if(!used.has(id)){disposeEntry(entry);entries.delete(id);}
  }
  function update(camera,viewportWidth,viewportHeight,env,landscapeHeight){
    if(!available)return;
    const camQuaternion=camera.quaternion;
    cameraForward.set(0,0,-1).applyQuaternion(camQuaternion);
    for(const entry of entries.values()){
      const a=entry.anchor;const ground=landscapeHeight(a.x,a.z,env.terrainWidth,env.terrainDepth,env.seed,env.variation,env.hills);
      const hover=a.active?1.45:1.1;
      const distance=camera.position.distanceTo(groundPoint.set(a.x,ground+hover,a.z));
      const pix=cardPixelSize(viewportWidth,a.layout.scale,distance);
      // Correct perspective size at the *plane center*, rather than anchoring
      // via a foreground overlay. Frustum projection and 3D depth now agree.
      fromCamera.set(a.x-camera.position.x,ground+hover-camera.position.y,a.z-camera.position.z);
      const depth=Math.max(.1,fromCamera.dot(cameraForward));
      const h=worldHeightForPixels(pix.height,viewportHeight,depth,camera.fov);
      const w=h*CARD_WIDTH_PX/CARD_HEIGHT_PX;
      entry.mesh.scale.set(w,h,1);
      entry.mesh.position.set(a.x,ground+hover+h*.5,a.z);
      entry.mesh.quaternion.copy(camQuaternion);
      entry.mesh.visible=true;
    }
  }
  function dispose(){available=false;for(const e of entries.values())disposeEntry(e);entries.clear();scene.remove(group);cardGeometry.dispose();}
  return {setCards,update,dispose,group,entries,get count(){return entries.size;}};
}
