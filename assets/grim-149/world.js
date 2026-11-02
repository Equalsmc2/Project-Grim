import * as T from './vendor/three.module.js';
import {normalizeEnvironment} from './environment-state.js';
import {effectiveTime,lightAt,skyAt,smoothValue,isPrecipitation} from './atmosphere.js';
import {clusteredProps,accumulationTarget,pathDistance} from './world-polish.js';
import {createNativeCardLayer} from './native-cards.js';
import {clampZoomToCards} from './camera-guard.js';
import {calculateCameraPose,applyCameraPose,FIELD_WIDTH,FIELD_DEPTH,DEFAULT_CAMERA_VIEW,MIN_CAMERA_ZOOM,MAX_CAMERA_ZOOM} from './camera-frame.js';

// Grim 1.2: the battlefield is a region INSIDE a continuous 3D landscape.
// Unit anchors are fixed in world coordinates. Cards are genuine Three.js
// camera-facing planes sharing the scene depth buffer with environment props.
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const hillScale=(h='mid')=>({flat:0,small:.45,mid:1,mountains:1.9}[h]??1);
const palettes={
 blank:{ground:0x25292b,low:0x191e20,horizon:0x222d31,sky:0x0c1117,foliage:0x344a40},
 grass:{ground:0x3e6942,low:0x253f31,horizon:0x405b50,sky:0x101b22,foliage:0x31523e},
 stone:{ground:0x69716f,low:0x43494b,horizon:0x535d62,sky:0x101820,foliage:0x43544a},
 dirt:{ground:0x775b43,low:0x483a2f,horizon:0x695a4b,sky:0x1a1b1f,foliage:0x4b563e},
 sand:{ground:0xb9a076,low:0x827359,horizon:0x9c8d79,sky:0x29282b,foliage:0x777153},
 snow:{ground:0xb2c3cd,low:0x647f8d,horizon:0x829ba9,sky:0x151e2a,foliage:0x314f43},
 leaves:{ground:0x845a3b,low:0x4c392f,horizon:0x775e4b,sky:0x191822,foliage:0x755231}
};
export function landscapeHeight(x,z,w,d,seed=7301,variation=.35,hills='mid'){
  // Playable region stays level for unit markers. Only the distant environment
  // rises into soft hills; no geometry seams or separate floating platform.
  const hs=hillScale(hills);
  const rim=clamp(Math.max((Math.abs(x)-w*.45)/(w*.65),(Math.abs(z)-d*.44)/(d*.95),0),0,1);
  const roll=Math.sin(x*.135+seed*.0013)*.55+Math.cos(z*.17+seed*.00031)*.45+
             Math.sin(x*.085+z*.07)*.28;
  const macro=hs<=0?0:rim*rim*(.55+Math.max(0,roll+1)*1.15)*hs;
  const micro=(Math.sin(x*.9+z*.3)*Math.cos(z*.75-x*.22))*.035*variation*(hs===0?.15:1);
  return macro+micro;
}
const rngFactory=(seed)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const material=(color,opts={})=>new T.MeshStandardMaterial({color,roughness:.95,...opts});
const placeOnTerrain=(o,x,z,w,d,e,offset=0)=>o.position.set(x,landscapeHeight(x,z,w,d,e.seed,e.variation,e.hills)+offset,z);
function shadowTexture(){
 const c=document.createElement('canvas');c.width=c.height=64;
 const ctx=c.getContext('2d');const g=ctx.createRadialGradient(32,32,3,32,32,32);
 g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(.35,'rgba(0,0,0,.31)');g.addColorStop(1,'rgba(0,0,0,0)');
 ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;
}

function gridTexture(line=0x5d6368,bg='rgba(0,0,0,0)'){
 const c=document.createElement('canvas');c.width=c.height=128;
 const ctx=c.getContext('2d');
 ctx.clearRect(0,0,128,128);
 ctx.fillStyle=bg;ctx.fillRect(0,0,128,128);
 ctx.strokeStyle='#'+line.toString(16).padStart(6,'0');
 ctx.globalAlpha=.9;ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(128,0);ctx.lineTo(128,128);ctx.stroke();
 ctx.globalAlpha=.42;ctx.lineWidth=1;
 ctx.beginPath();ctx.moveTo(64,0);ctx.lineTo(64,128);ctx.moveTo(0,64);ctx.lineTo(128,64);ctx.stroke();
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=4;return tex;
}

function createSky(pal){
 const sky=new T.Mesh(new T.SphereGeometry(155,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{top:{value:new T.Color(pal.sky)},bottom:{value:new T.Color(pal.horizon)}},vertexShader:`varying float vY;void main(){vec4 p=modelMatrix*vec4(position,1.);vY=normalize(position).y;gl_Position=projectionMatrix*viewMatrix*p;}`,fragmentShader:`uniform vec3 top;uniform vec3 bottom;varying float vY;void main(){float t=smoothstep(-.18,.50,vY);gl_FragColor=vec4(mix(bottom,top,t),1.);}` }));
 sky.frustumCulled=false;sky.renderOrder=-100;return sky;
}
export function createWorld(host,stage){
 let fieldWidth=FIELD_WIDTH,fieldDepth=FIELD_DEPTH;
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setClearColor(0x111820);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.outputColorSpace=T.SRGBColorSpace;
 host.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Continuous 3D battlefield');
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(40,1,.1,210);
 const ambient=new T.HemisphereLight(0xe3eaf2,0x293331,1.75);scene.add(ambient);
 const sun=new T.DirectionalLight(0xfff3df,2.15);sun.position.set(-13,25,5);sun.castShadow=true;
 sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:1,far:125});sun.shadow.bias=-.00045;sun.shadow.normalBias=.025;sun.shadow.radius=2;sun.shadow.camera.updateProjectionMatrix();scene.add(sun);
 const spotlight=new T.SpotLight(0xffffff,26,30,.43,.7,1);scene.add(spotlight,spotlight.target);
 let root=new T.Group();scene.add(root);
 const markerGroup=new T.Group();scene.add(markerGroup);
 const nativeCards=createNativeCardLayer(scene,{onChange:()=>{dirty=true;wake();},onError:message=>console.warn('Native cards:',message)});
 const groundShadow=shadowTexture();
 let zoom=1,viewMode=DEFAULT_CAMERA_VIEW,transition=null;
 let width=1,height=1,yaw=0,pitch=0,env=normalizeEnvironment(),signature='',terrainSignature='',weatherSystems=[],fogMeshes=[],anchors=[],disposed=false,lost=false,frame=0,last=0,dirty=true,projectionDirty=true,lastStatsAt=0,markerSignature='';
 let skyMesh=null,sunBody=null,moonBody=null,sunHalo=null,moonHalo=null,starMesh=null,cloudMesh=null,cloudShadowMesh=null,terrainMaterial=null,wetPatches=null,snowPatches=null,sandPatches=null;
 let scenicMaterials=[],accumulation={wet:0,snow:0,sand:0},nightStage=false;
 let cinematicEnabled=false,cinematicSpeed=1,cinematicPauseUntil=0,cinematicStart=0;
 const sunDir=new T.Vector3(),moonDir=new T.Vector3(),stormTint=new T.Color(),fogTarget=new T.Color();
 let clouds=[],cloudClock=0,cloudUpdated=0,currentHour=12,currentCloud=.18,currentFog=0,currentStormIntensity=0,windPhase=0;
 const cloudDummy=new T.Object3D(),cloudTint=new T.Color(),skyTop=new T.Color(),skyBottom=new T.Color(),fogTint=new T.Color();
 const dummy=new T.Object3D(),target=new T.Vector3();
 const stageShell=document.getElementById('stageApp');
 function wake(){if(!frame&&!disposed&&!lost&&!document.hidden)frame=requestAnimationFrame(tick);}
 function fitCardsZoom(z){return clampZoomToCards({requestedZoom:z,anchors,width,height,mode:viewMode,yaw,pitch,fieldWidth,fieldDepth,env,landscapeHeight});}
 function cameraPose(animate=false){
  zoom=fitCardsZoom(zoom);
  const pose=calculateCameraPose({width,height,yaw,pitch,zoom,mode:viewMode,fieldWidth,fieldDepth});
  if(animate&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
   transition={start:performance.now(),duration:650,fromPos:camera.position.clone(),toPos:pose.position.clone(),fromTarget:target.clone(),toTarget:pose.target.clone(),fromFov:camera.fov,toFov:pose.fov,aspect:pose.aspect};
  }else{transition=null;applyCameraPose(camera,pose);target.copy(pose.target);}
  dirty=true;projectionDirty=true;wake();
 }
 function resize(){
  width=stage.clientWidth||1;height=stage.clientHeight||1;
  const dpr=Math.min(devicePixelRatio||1,1.5);
  const gpuRatio=Math.min(dpr,Math.max(.7,Math.sqrt(2800000/(width*height))));
  if(Math.abs(renderer.getPixelRatio()-gpuRatio)>.025)renderer.setPixelRatio(gpuRatio);
  renderer.setSize(width,height);cameraPose();
 }
 function disposeObject(group){
  const geos=new Set(),mats=new Set(),textures=new Set();
  group.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material){for(const m of (Array.isArray(o.material)?o.material:[o.material])){mats.add(m);if(m.map&&m.map!==groundShadow)textures.add(m.map);}}if(o.isInstancedMesh)o.dispose?.();});
  geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
 }
 function clearRoot(){disposeObject(root);scene.remove(root);root=new T.Group();scene.add(root);}
 function instanced(geo,mat,count,fn,{shadows=false}={}){
  if(!count){geo.dispose();mat.dispose();return null;}
  const mesh=new T.InstancedMesh(geo,mat,count);
  for(let i=0;i<count;i++){dummy.position.set(0,0,0);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);fn(dummy,i);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
  mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=shadows;mesh.receiveShadow=false;root.add(mesh);return mesh;
 }
 function makeTerrain(e,rnd,pal){
  const tw=Math.max(fieldWidth*3.7,112),td=Math.max(fieldDepth*5.2,112);
  const segX=110,segZ=110;
  const geo=new T.PlaneGeometry(tw,td,segX,segZ),attr=geo.attributes.position;
  const colors=[],base=new T.Color(pal.ground),low=new T.Color(pal.low),outer=new T.Color(pal.horizon);
  const c=new T.Color();
  for(let i=0;i<attr.count;i++){
    const x=attr.getX(i),z=attr.getY(i),dist=Math.max(Math.abs(x)/(tw*.5),Math.abs(z)/(td*.5));
    attr.setZ(i,landscapeHeight(x,z,fieldWidth,fieldDepth,e.seed,e.variation,e.hills));
    const n=.055*Math.sin(x*.85+z*.36)+.045*Math.sin(z*1.27-x*.51);
    c.copy(base).lerp(low,clamp(dist*.46+n,.02,.52)).lerp(outer,clamp((dist-.65)*.85,0,.3));
    colors.push(c.r,c.g,c.b);
  }
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.rotateX(-Math.PI/2);geo.computeVertexNormals();
  terrainMaterial=material(0xffffff,{vertexColors:true,metalness:0});
  const mesh=new T.Mesh(geo,terrainMaterial);mesh.receiveShadow=true;root.add(mesh);
  if(e.ground==='blank'||e.ground==='stone'){
   const gridGeo=geo.clone();
   const gridTex=gridTexture(e.ground==='stone'?0x586067:0x60666b);
   gridTex.repeat.set(Math.max(18,Math.round(tw*.42)),Math.max(18,Math.round(td*.42)));
   const gridMat=new T.MeshBasicMaterial({map:gridTex,transparent:true,opacity:e.ground==='stone'?.62:.52,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
   const gridMesh=new T.Mesh(gridGeo,gridMat);
   gridMesh.renderOrder=5;
   root.add(gridMesh);
  }
  return {tw,td};
 }
 function makeWeatherGround(e,rnd){
  // Instanced ground features survive weather changes; opacity and material
  // properties update without rebuilding the landscape or restarting cards.
  const make=(kind,count,geo,color,scaleXY)=>{
   const m=instanced(geo,new T.MeshBasicMaterial({color,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-3}),count,(o)=>{
    let x=0,z=0;
    for(let tries=0;tries<12;tries++){
     x=(rnd()-.5)*fieldWidth*1.65;z=(rnd()-.5)*fieldDepth*1.55;
     if(pathDistance(x,z,e)>e.pathWidth*.5+.9)break;
    }
    const y=landscapeHeight(x,z,fieldWidth,fieldDepth,e.seed,e.variation,e.hills);
    o.position.set(x,y+.1+(kind==='wet'?.004:0),z);o.rotation.set(-Math.PI/2,0,rnd()*6.28);
    const v=.5+rnd();o.scale.set(scaleXY[0]*v,scaleXY[1]*v,1);
   });
   if(m){m.renderOrder=4;m.frustumCulled=false;}
   return m;
  };
  wetPatches=make('wet',85,new T.CircleGeometry(1,16),0x243f4a,[1.25,.58]);
  snowPatches=make('snow',135,new T.CircleGeometry(1,12),0xdceaf1,[1.16,.75]);
  sandPatches=make('sand',95,new T.CircleGeometry(1,12),0xb69c6b,[1.12,.58]);
 }
 function addSurface(e,rnd,pal){
  if(e.ground==='blank')return;
  const n=Math.min(1300,Math.round(420+e.variation*690));
  const isGrass=e.ground==='grass',isLeaves=e.ground==='leaves';
  const geo=isGrass?new T.ConeGeometry(.053,.26,3):isLeaves?new T.PlaneGeometry(.16,.11):new T.IcosahedronGeometry(1,0);
  const mesh=instanced(geo,material(isGrass?0x739568:isLeaves?0xffffff:pal.ground,{side:T.DoubleSide}),n,(o,i)=>{
   const x=(rnd()-.5)*fieldWidth*1.9,z=(rnd()-.5)*fieldDepth*2.4;
   placeOnTerrain(o,x,z,fieldWidth,fieldDepth,e,isGrass?.12:.035);
   o.rotation.y=rnd()*6.28;
   if(isGrass)o.scale.set(.6+rnd()*.8,.5+rnd()*1.2,.6+rnd()*.8);
   else if(isLeaves){o.rotation.x=-Math.PI/2+(rnd()-.5)*.28;o.scale.setScalar(.65+rnd()*.9);}
   else o.scale.set(.025+rnd()*.075,.01+rnd()*.028,.025+rnd()*.075);
  });
  if(mesh&&isLeaves){const cs=[0xa8512d,0xb77a37,0xd3a14c,0x724328];for(let i=0;i<n;i++)mesh.setColorAt(i,new T.Color(cs[i%cs.length]));mesh.instanceColor.needsUpdate=true;}
 }
 function addPaths(e,rnd,terrain){
  if(!e.path)return;
  const tw=terrain?.tw||fieldWidth,td=terrain?.td||fieldDepth;
  const a=e.pathAngle*Math.PI/180;
  const point=(x,z)=>[Math.cos(a)*x+Math.sin(a)*z+e.pathX,-Math.sin(a)*x+Math.cos(a)*z+e.pathZ];
  const positions=[];
  for(let z=-td*.52;z<=td*.52;z+=.62){
   for(let x=-e.pathWidth/2+.25;x<e.pathWidth/2;x+=.61){
    const [xx,zz]=point(x+(rnd()-.5)*.1,z);
    if(Math.abs(xx)>tw*.5-.6||Math.abs(zz)>td*.5-.6)continue;
    positions.push([xx,zz]);
   }
  }
  instanced(new T.BoxGeometry(.55,.11,.56),material(0x82827d),positions.length,(o,i)=>{
   const [x,z]=positions[i];placeOnTerrain(o,x,z,fieldWidth,fieldDepth,e,.075);o.rotation.y=a+(rnd()-.5)*.07;o.scale.y=.65+rnd()*.45;
  },{shadows:false});
  const loose=[];
  for(let i=0;i<Math.round((td*2.2)*e.pathEdge);i++){
   const [x,z]=point((rnd()>.5?1:-1)*(e.pathWidth*.5+.15+rnd()*.48),(rnd()-.5)*td*1.12);
   if(Math.abs(x)<tw*.5-.4&&Math.abs(z)<td*.5-.4)loose.push([x,z]);
  }
  instanced(new T.IcosahedronGeometry(.11,0),material(0x77746a),loose.length,(o,i)=>{const [x,z]=loose[i];placeOnTerrain(o,x,z,fieldWidth,fieldDepth,e,.045);o.scale.y=.45;});
 }
 function addProps(e,rnd,pal){
  if(e.density<=0)return;
  const types={forest:['tree','bush','log','tuft','rock'],rocks:['rock'],ruins:['pillar','ruin','grave','rock'],snow:['mound','rock','tree'],grass:['tuft'],bushes:['bush'],logs:['log'],graves:['grave'],mixed:['tree','bush','log','tuft','rock','pillar','ruin','grave','mound']}[e.props]||['rock'];
  const grouped=clusteredProps(e,rnd,fieldWidth,fieldDepth);
  const each=(name,geo,color,fn,{shadows=true}={})=>{
   const all=grouped[name]||[];
   const mat=material(color);if(all.length)scenicMaterials.push({mat,base:mat.color.clone(),name});
   instanced(geo,mat,all.length,(o,i)=>fn(o,all[i],i),{shadows});
  };
  // Multi-layer trees: 3D trunk + two tapered foliage tiers sharing exact
  // instance positions. Real silhouette depth at low poly cost.
  if(grouped.tree){
   const treeColor=e.ground==='leaves'?0xb16b37:pal.foliage;
   each('tree',new T.CylinderGeometry(.13,.20,1.5,6),0x594636,(o,p)=>{
    const s=p.s;placeOnTerrain(o,p.x,p.z,fieldWidth,fieldDepth,e,.72*s);o.scale.setScalar(s);
   });
   for(const [h,r,base] of [[2.25,.86,2.3],[1.75,.73,3.25]]){
    each('tree',new T.ConeGeometry(r,h,7),treeColor,(o,p)=>{
     placeOnTerrain(o,p.x,p.z,fieldWidth,fieldDepth,e,base*p.s);o.scale.setScalar(p.s);o.rotation.y=(p.x+p.z)*.19;
    });
   }
  }
  each('rock',new T.IcosahedronGeometry(.65,0),0x777b78,(o,p)=>{placeOnTerrain(o,p.x,p.z,fieldWidth,fieldDepth,e,.23*p.s);o.scale.set(.9*p.s,.56*p.s,1.1*p.s);o.rotation.y=p.x*1.71;});
  each('bush',new T.IcosahedronGeometry(.6,1),pal.foliage,(o,p)=>{placeOnTerrain(o,p.x,p.z,fieldWidth,fieldDepth,e,.37*p.s);o.scale.set(1.18*p.s,.64*p.s,.82*p.s);});
  each('log',new T.CylinderGeometry(.19,.25,1.7,7),0x604837,(o,p)=>{placeOnTerrain(o,p.x,p.z,fieldWidth,fieldDepth,e,.19*p.s);o.rotation.z=Math.PI/2;o.rotation.y=p.z;o.scale.setScalar(p.s);});
  each('tuft',new T.ConeGeometry(.27,.67,4),0x658757,(o,p)=>{placeOnTerrain(o,p.x,p.z,fieldWidth,fieldDepth,e,.27*p.s);o.rotation.y=p.z;o.scale.setScalar(p.s);},{shadows:false});
  each('pillar',new T.CylinderGeometry(.36,.43,2.25,8),0x777779,(o,p)=>{placeOnTerrain(o,p.x,p.z,fieldWidth,fieldDepth,e,1.1*p.s);o.scale.setScalar(p.s);});
  each('ruin',new T.BoxGeometry(1.3,1,.7),0x70706c,(o,p)=>{placeOnTerrain(o,p.x,p.z,fieldWidth,fieldDepth,e,.50*p.s);o.rotation.y=p.x;o.scale.setScalar(p.s);});
  each('grave',new T.BoxGeometry(.58,1,.2),0x6e7070,(o,p)=>{placeOnTerrain(o,p.x,p.z,fieldWidth,fieldDepth,e,.45*p.s);o.scale.setScalar(p.s);});
  each('mound',new T.IcosahedronGeometry(.75,1),e.ground==='snow'?0xc1d0d9:0x9c9483,(o,p)=>{placeOnTerrain(o,p.x,p.z,fieldWidth,fieldDepth,e,.22*p.s);o.scale.set(p.s,.35*p.s,p.s);});
 }
 function glowTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');const gradient=ctx.createRadialGradient(64,64,6,64,64,64);
  gradient.addColorStop(0,'rgba(255,255,255,.66)');gradient.addColorStop(.28,'rgba(255,255,255,.25)');gradient.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  return new T.CanvasTexture(canvas);
 }
 function makeClouds(e,rnd){
  clouds=Array.from({length:68},()=>({x:(rnd()-.5)*170,z:-17-rnd()*115,y:16+rnd()*24,s:2+rnd()*3.2,offset:rnd()*6.28}));
  const geometry=new T.IcosahedronGeometry(1,1);
  const matCloud=new T.MeshLambertMaterial({color:0xe3e6e6,transparent:true,opacity:.64,depthWrite:false,fog:true,flatShading:true});
  cloudMesh=new T.InstancedMesh(geometry,matCloud,clouds.length);cloudMesh.frustumCulled=false;root.add(cloudMesh);
  const shadeMat=new T.MeshBasicMaterial({color:0x152029,transparent:true,opacity:.07,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  cloudShadowMesh=new T.InstancedMesh(new T.PlaneGeometry(1,1),shadeMat,clouds.length);
  cloudShadowMesh.frustumCulled=false;cloudShadowMesh.renderOrder=3;root.add(cloudShadowMesh);
 }
 function addAtmosphere(e,rnd,pal){
  scene.background=new T.Color(pal.sky);
  scene.fog=new T.FogExp2(pal.horizon,.011+e.fog*.022);
  skyMesh=createSky(pal);root.add(skyMesh);
  const discGeo=new T.SphereGeometry(1,16,12);
  sunBody=new T.Mesh(discGeo,new T.MeshBasicMaterial({color:0xfff1d1,fog:false,toneMapped:false}));
  sunBody.scale.setScalar(3.6);sunBody.renderOrder=0;root.add(sunBody);
  moonBody=new T.Mesh(discGeo.clone(),new T.MeshBasicMaterial({color:0xc5d9f3,fog:false,toneMapped:false}));
  moonBody.scale.setScalar(2.6);moonBody.renderOrder=0;root.add(moonBody);
  const glow=glowTexture();
  sunHalo=new T.Sprite(new T.SpriteMaterial({map:glow,color:0xffb765,transparent:true,opacity:.38,depthWrite:false,fog:false}));
  sunHalo.scale.set(22,22,1);root.add(sunHalo);
  moonHalo=new T.Sprite(new T.SpriteMaterial({map:glow.clone(),color:0x8da9d4,transparent:true,opacity:.21,depthWrite:false,fog:false}));
  moonHalo.scale.set(13,13,1);root.add(moonHalo);
  const stars=[];
  for(let i=0;i<250;i++){
   const az=rnd()*Math.PI*2,elev=.08+rnd()*1.33;
   stars.push(Math.sin(az)*Math.cos(elev)*145,Math.sin(elev)*145,-Math.cos(az)*Math.cos(elev)*145);
  }
  const pointsGeo=new T.BufferGeometry();pointsGeo.setAttribute('position',new T.Float32BufferAttribute(stars,3));
  starMesh=new T.Points(pointsGeo,new T.PointsMaterial({color:0xbacde1,size:1.4,sizeAttenuation:false,transparent:true,opacity:0,depthWrite:false,fog:false}));
  starMesh.frustumCulled=false;root.add(starMesh);
  makeClouds(e,rnd);
  const count=28;
  const fogMat=new T.MeshBasicMaterial({color:pal.horizon,transparent:true,opacity:0,depthWrite:false,fog:true});
  const mesh=instanced(new T.SphereGeometry(1,10,6),fogMat,count,(o)=>{
   let bestX=0,bestZ=0,bestY=Infinity;
   for(let attempt=0;attempt<4;attempt++){
    const x=(rnd()-.5)*fieldWidth*2.4,z=(rnd()-.5)*fieldDepth*2.6;
    const y=landscapeHeight(x,z,fieldWidth,fieldDepth,e.seed,e.variation,e.hills);
    if(y<bestY){bestX=x;bestZ=z;bestY=y;}
   }
   o.position.set(bestX,bestY+.15,bestZ);o.scale.set(3+rnd()*4,.12+rnd()*.16,2.4+rnd()*2.8);
  });if(mesh){mesh.castShadow=false;mesh.frustumCulled=false;fogMeshes.push(mesh);}
 }
 function makeWeatherSystem(type,seed){
  if(!type||type==='none')return null;
  const rnd=rngFactory(seed+type.length*701);
  const rain=type==='rain'||type==='thunderstorm',snow=type==='snow'||type==='blizzard',sand=type==='dust'||type==='sandstorm',leaf=type==='leaves';
  const count=rain?750:snow?550:sand?440:320;
  const geo=rain?new T.BoxGeometry(.025,.46,.025):leaf?new T.PlaneGeometry(.17,.1):sand?new T.IcosahedronGeometry(.042,0):new T.IcosahedronGeometry(.066,0);
  const mat=material(leaf?0xffb36a:sand?0xc8a77a:rain?0xa9c5e6:0xeef4fa,{side:T.DoubleSide,transparent:true,opacity:0,depthWrite:false,fog:true});
  const wx=Math.max(26,fieldWidth*.9),wz=Math.max(26,fieldDepth*1.35);
  const points=Array.from({length:count},()=>({x:(rnd()-.5)*wx*2,z:(rnd()-.5)*wz*2,y:.6+rnd()*(sand?2.8:12),phase:rnd()*6.28,weight:.5+rnd()*.7}));
  const mesh=instanced(geo,mat,count,(o,i)=>{const p=points[i];o.position.set(p.x,p.y,p.z);o.scale.setScalar(p.weight);});
  if(!mesh)return null;
  mesh.frustumCulled=false;mesh.castShadow=false;
  if(leaf){const colors=[0xe9a64f,0xc87343,0xb45d33,0xd7b36a];for(let i=0;i<count;i++)mesh.setColorAt(i,new T.Color(colors[i%4]));mesh.instanceColor.needsUpdate=true;}
  return {type,mesh,points,rain,snow,sand,leaf,opacity:0,targetOpacity:0,particleCount:count};
 }
 function updateWeatherTarget(){
  const type=env.weather;
  for(const item of weatherSystems)item.targetOpacity=item.type===type?Math.max(0,env.intensity):0;
  if(isPrecipitation(env)&&!weatherSystems.some(s=>s.type===type)){
   const system=makeWeatherSystem(type,env.seed);if(system){system.targetOpacity=env.intensity;weatherSystems.push(system);}
  }
  dirty=true;wake();
 }
 function weatherTick(t,dt){
  const wind=env.windAngle*Math.PI/180;
  for(let n=weatherSystems.length-1;n>=0;n--){
   const sys=weatherSystems[n];
   sys.opacity=smoothValue(sys.opacity,sys.targetOpacity,dt,2);
   sys.mesh.material.opacity=sys.opacity*(sys.rain?.54:sys.sand?.52:.76);
   const halfX=Math.max(26,fieldWidth*.9),halfZ=Math.max(26,fieldDepth*1.35);
   const fall=sys.rain?11:sys.snow?(sys.type==='blizzard'?1.35:.75):sys.leaf?1.35:.08;
   for(let i=0;i<sys.points.length;i++){
    const p=sys.points[i];
    p.x+=Math.cos(wind)*env.windSpeed*dt*(sys.rain?.52:sys.type==='blizzard'?1.8:sys.type==='sandstorm'?2.8:1);
    p.z+=Math.sin(wind)*env.windSpeed*dt*(sys.type==='blizzard'?1.8:1);
    p.y-=fall*dt*(.65+p.weight*.4);
    if(p.y<(.08+landscapeHeight(p.x,p.z,fieldWidth,fieldDepth,env.seed,env.variation,env.hills)))p.y=sys.sand?2.4:12.7;
    if(p.x>halfX)p.x=-halfX;if(p.x< -halfX)p.x=halfX;
    if(p.z>halfZ)p.z=-halfZ;if(p.z< -halfZ)p.z=halfZ;
    const far=clamp((Math.abs(p.z)-fieldDepth*.35)/(fieldDepth*1.5),0,1);
    const scale=(1-far*.6)*p.weight;
    dummy.position.set(p.x,p.y,p.z);dummy.scale.setScalar(scale);
    dummy.rotation.set(sys.leaf?t*.001+p.phase:sys.type==='blizzard'?.4:0,p.phase,sys.leaf?t*.0007:0);
    dummy.updateMatrix();sys.mesh.setMatrixAt(i,dummy.matrix);
   }
   sys.mesh.instanceMatrix.needsUpdate=true;
   if(sys.targetOpacity===0&&sys.opacity<.005){
    root.remove(sys.mesh);disposeObject(sys.mesh);weatherSystems.splice(n,1);
   }
  }
 }
 function cloudTick(dt,now){
  if(!cloudMesh)return;
  const coverage=currentCloud,wind=env.windAngle*Math.PI/180;
  cloudClock+=(dt||0)*env.windSpeed*.14;
  if(now-cloudUpdated<100)return;
  cloudUpdated=now;
  for(let i=0;i<clouds.length;i++){
   const c=clouds[i],fill=clamp((coverage*clouds.length-i)/9,0,1);
   const x=((c.x+cloudClock*Math.cos(wind)+87)%174+174)%174-87;
   const z=((c.z+cloudClock*Math.sin(wind)+134)%134+134)%134-134;
   cloudDummy.position.set(x,c.y+Math.sin(c.offset+now*.00005)*.35,z);
   cloudDummy.scale.set(c.s*1.9*fill,c.s*.4*fill,c.s*1.3*fill);
   cloudDummy.rotation.set(0,c.offset,0);cloudDummy.updateMatrix();cloudMesh.setMatrixAt(i,cloudDummy.matrix);
   if(cloudShadowMesh){cloudDummy.position.set(x+.9,.12,z);cloudDummy.rotation.set(-Math.PI/2,0,0);cloudDummy.scale.set(c.s*4*fill,c.s*2.6*fill,1);cloudDummy.updateMatrix();cloudShadowMesh.setMatrixAt(i,cloudDummy.matrix);}
  }
  cloudMesh.instanceMatrix.needsUpdate=true;if(cloudShadowMesh)cloudShadowMesh.instanceMatrix.needsUpdate=true;
 }
 function updateLighting(dt,now){
  const targetTime=effectiveTime(env,Date.now());
  const diff=((targetTime-currentHour+36)%24)-12;
  currentHour=(currentHour+diff*(1-Math.exp(-dt*2))+24)%24;
  currentCloud=smoothValue(currentCloud,env.cloudCover,dt,2.5);
  currentFog=smoothValue(currentFog,env.fog,dt,2.5);
  currentStormIntensity=smoothValue(currentStormIntensity,env.intensity,dt,2.5);
  const sky=skyAt(currentHour,currentCloud,env.weather,currentStormIntensity),light=sky.light;
  const colorBlend=1-Math.exp(-dt*1.4);
  fogTint.setRGB(...sky.top);skyTop.lerp(fogTint,colorBlend);
  fogTint.setRGB(...sky.horizon);skyBottom.lerp(fogTint,colorBlend);
  if(skyMesh){skyMesh.material.uniforms.top.value.copy(skyTop);skyMesh.material.uniforms.bottom.value.copy(skyBottom);}
  scene.background.copy(skyTop);
  const sunA=Math.PI*(currentHour-6)/12;
  sunDir.set(Math.cos(sunA)*.35,Math.sin(sunA),-Math.cos(sunA)*.93).normalize();
  const moonA=sunA+Math.PI;
  moonDir.set(Math.cos(moonA)*.35,Math.sin(moonA),-Math.cos(moonA)*.93).normalize();
  if(sunBody){sunBody.position.copy(sunDir).multiplyScalar(115);sunBody.visible=light.solar>-.04;sunHalo.position.copy(sunBody.position);sunHalo.material.opacity=light.daylight*.34*(1-currentCloud*.45);sunHalo.visible=sunBody.visible;}
  if(moonBody){moonBody.position.copy(moonDir).multiplyScalar(115);moonBody.visible=light.solar<.04;moonHalo.position.copy(moonBody.position);moonHalo.material.opacity=moonBody.visible?.25:0;moonHalo.visible=moonBody.visible;}
  if(starMesh)starMesh.material.opacity=Math.pow(1-light.daylight,2)*(1-currentCloud*.9);
  if(cloudMesh){const storm=light.storm;cloudTint.setRGB(...(env.weather==='sandstorm'?[.53,.40,.28]:[.86,.88,.90]));cloudTint.lerp(stormTint.setRGB(.27,.30,.35),Math.min(.75,storm*.57+currentCloud*.22));cloudMesh.material.color.copy(cloudTint);cloudMesh.material.opacity=.48+.3*currentCloud;}
  if(cloudShadowMesh)cloudShadowMesh.material.opacity=.045+currentCloud*.10;
  ambient.intensity=smoothValue(ambient.intensity,light.ambient,dt,2);
  ambient.color.setRGB(.55+.35*light.daylight,.63+.31*light.daylight,.78+.18*light.daylight);
  sun.intensity=smoothValue(sun.intensity,light.direct+light.moon,dt,2);
  fogTint.setHex(light.solar>=0?(light.twilight>.15?0xffb782:0xfff3df):0x9bbce5);sun.color.lerp(fogTint,colorBlend);
  sun.position.copy(light.solar>=0?sunDir:moonDir).multiplyScalar(55);
  if(scene.fog){
   const storm=env.weather==='sandstorm'||env.weather==='blizzard'||env.weather==='thunderstorm'?currentStormIntensity:0;
   fogTint.copy(skyBottom).lerp(skyTop,.22);scene.fog.color.lerp(fogTint,colorBlend);
   scene.fog.density=smoothValue(scene.fog.density,.006+currentFog*.05+storm*.038,dt,2);
  }
  if(fogMeshes.length)for(const m of fogMeshes){m.material.opacity=currentFog*.046;m.material.color.copy(skyBottom);}
  const accTarget=accumulationTarget(env,currentStormIntensity);
  accumulation.wet=smoothValue(accumulation.wet,accTarget.wet,dt,3.2);
  accumulation.snow=smoothValue(accumulation.snow,accTarget.snow,dt,4.2);
  accumulation.sand=smoothValue(accumulation.sand,accTarget.sand,dt,4);
  if(terrainMaterial){
   const wet=accumulation.wet*.26,snowCover=accumulation.snow*.12,sandCover=accumulation.sand*.12;
   terrainMaterial.color.setRGB(1-wet+snowCover,1-wet*.9+snowCover*.97,1-wet*.78+snowCover*.94-sandCover*.6);
   terrainMaterial.roughness=clamp(.95-accumulation.wet*.36,.48,.95);
  }
  if(wetPatches)wetPatches.material.opacity=accumulation.wet*.47;
  if(snowPatches)snowPatches.material.opacity=accumulation.snow*.83;
  if(sandPatches)sandPatches.material.opacity=accumulation.sand*.38;
  if(scenicMaterials.length){
   for(const m of scenicMaterials){
    m.mat.color.copy(m.base);
    if(accumulation.snow>.01&&['tree','rock','bush','mound','ruin','pillar'].includes(m.name))m.mat.color.lerp(fogTarget.setHex(0xd7e3ea),accumulation.snow*.32);
    m.mat.roughness=.95-accumulation.wet*.18;
   }
  }
  // Soft shadow contrast: cloud-heavy skies don't create impossibly sharp
  // direct shadows, and moonlight retains weaker but readable form.
  sun.castShadow=light.direct+light.moon>.13;
  const night=light.daylight<.18;
  if(night!==nightStage){nightStage=night;stageShell?.classList.toggle('grim-night',night);}
  sun.shadow.bias=-.00045;
  // Rare brief flashes cast real light on terrain and props during lightning.
  if(env.weather==='thunderstorm'&&currentStormIntensity>.35){
   const spike=Math.max(0,Math.sin(now*.00044*18)*Math.sin(now*.00031*17));
   const flash=spike>.988?(spike-.988)*110*currentStormIntensity:0;
   ambient.intensity+=flash*.7;sun.intensity+=flash*1.8;
  }
  return Math.abs(diff)>.015||Math.abs(currentCloud-env.cloudCover)>.01||Math.abs(currentFog-env.fog)>.01||Math.abs(currentStormIntensity-env.intensity)>.01||Math.abs(skyTop.r-sky.top[0])>.004||Math.abs(skyTop.g-sky.top[1])>.004||Math.abs(skyTop.b-sky.top[2])>.004;
 }
 function rebuild(value){
  const nextEnv=normalizeEnvironment(value);
  const next=JSON.stringify(nextEnv);if(next===signature)return;
  const oldW=fieldWidth,oldD=fieldDepth;
  env=nextEnv;signature=next;updateCinematicSettings(env);
  fieldWidth=env.terrainWidth;fieldDepth=env.terrainDepth;
  const stable=JSON.stringify([env.ground,env.hills,env.variation,env.path,env.pathX,env.pathZ,env.pathAngle,env.pathWidth,env.pathEdge,env.props,env.density,env.seed,fieldWidth,fieldDepth]);
  if(stable!==terrainSignature){
   terrainSignature=stable;markerSignature='';clearRoot();weatherSystems=[];fogMeshes=[];
   skyMesh=sunBody=moonBody=sunHalo=moonHalo=starMesh=cloudMesh=cloudShadowMesh=terrainMaterial=wetPatches=snowPatches=sandPatches=null;scenicMaterials=[];
   cloudClock=cloudUpdated=0;
   const rnd=rngFactory(env.seed),pal=palettes[env.ground]||palettes.blank;
   const terrain=makeTerrain(env,rnd,pal);addSurface(env,rnd,pal);addPaths(env,rnd,terrain);addProps(env,rnd,pal);makeWeatherGround(env,rnd);addAtmosphere(env,rnd,pal);
   if(oldW!==fieldWidth||oldD!==fieldDepth)cameraPose();
  }
  updateWeatherTarget();
  dirty=true;projectionDirty=true;wake();
 }
 function setCards(placements,characters=[],combat=false){
  if(width!==stage.clientWidth||height!==stage.clientHeight)resize();
  anchors=[];
  for(const [id,p] of placements){
   const x=clamp(Number(p.worldX)||0,-fieldWidth*.5+1,fieldWidth*.5-1);
   const z=clamp(Number(p.worldZ)||0,-fieldDepth*.5+1,fieldDepth*.5-1);
   anchors.push({id,x,z,active:p.active,layout:p});
  }
  const nextSig=JSON.stringify(anchors.map(a=>[a.id,a.x,a.z,a.active,a.layout.side]));
  if(nextSig!==markerSignature){
   markerSignature=nextSig;disposeObject(markerGroup);markerGroup.clear();
   for(const a of anchors){
    const y=landscapeHeight(a.x,a.z,fieldWidth,fieldDepth,env.seed,env.variation,env.hills);
    const shadow=new T.Mesh(new T.PlaneGeometry(2.7,1.48),new T.MeshBasicMaterial({map:groundShadow,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,opacity:a.active?.94:.74}));
    shadow.rotation.x=-Math.PI/2;shadow.position.set(a.x,y+.085,a.z);markerGroup.add(shadow);
    const ring=new T.Mesh(new T.TorusGeometry(a.active?.76:.58,a.active?.043:.022,5,36),new T.MeshBasicMaterial({color:a.active?0xe8eded:a.layout.side==='enemy'?0xb3b5b9:0xd5dbd5,transparent:true,opacity:a.active?.86:.33,depthWrite:false}));
    ring.rotation.x=-Math.PI/2;ring.position.set(a.x,y+.10,a.z);markerGroup.add(ring);
   }
  }
  nativeCards.setCards(anchors,characters,combat);
  if(anchors.length){const fit=fitCardsZoom(zoom);if(fit<zoom-.001){zoom=fit;cameraPose();}}
  stageShell.classList.toggle('native-cards-ready',true);
  dirty=true;projectionDirty=true;wake();
 }
 function updateCinematicSettings(e){
  const nextEnabled=!!e.cinematicPan;
  cinematicSpeed=clamp(Number(e.cinematicSpeed)||1,.35,2.5);
  if(nextEnabled!==cinematicEnabled){
   cinematicEnabled=nextEnabled;
   cinematicStart=performance.now();
   dirty=true;wake();
  }
 }
 function cinematicStep(t,dt){
  if(!cinematicEnabled||transition||t<cinematicPauseUntil)return false;
  if(!cinematicStart)cinematicStart=t;
  // A restrained side-to-side dolly/orbit, not a full spin. Fixed zoom means
  // no automatic camera retreat and no sudden change in card size.
  const phase=(t-cinematicStart)*.00022*cinematicSpeed;
  const presetLimit=viewMode==='ground'?20:viewMode==='overhead'?28:24;
  const desiredYaw=Math.sin(phase)*Math.min(presetLimit-2,12)*Math.PI/180;
  const desiredPitch=Math.sin(phase*.68+.8)*1.7;
  const blend=1-Math.exp(-Math.min(Math.max(dt,0),.05)*2.5);
  const y0=yaw,p0=pitch;
  yaw+=(desiredYaw-yaw)*blend;pitch+=(desiredPitch-pitch)*blend;
  if(Math.abs(yaw-y0)<1e-7&&Math.abs(pitch-p0)<1e-5)return false;
  const pose=calculateCameraPose({width,height,yaw,pitch,zoom,mode:viewMode,fieldWidth,fieldDepth});
  const glide=Math.sin(phase*.53)*.55;
  pose.position.x+=glide;pose.target.x+=glide;
  applyCameraPose(camera,pose);target.copy(pose.target);
  projectionDirty=true;dirty=true;return true;
 }
 function projectCards(time){
  // Real 3D billboards share opaque geometry's depth buffer. No CSS silhouette
  // masks, delayed bitmap generation, or independently sorted HTML overlay.
  camera.updateMatrixWorld();
  nativeCards.update(camera,width,height,env,landscapeHeight,time);
  let active=false;
  for(const a of anchors)if(a.active){
   const y=landscapeHeight(a.x,a.z,fieldWidth,fieldDepth,env.seed,env.variation,env.hills);
   spotlight.position.set(a.x,10,a.z+2);spotlight.target.position.set(a.x,y,a.z);
   active=true;break;
  }
  spotlight.visible=active;
 }
 function tick(t){
  frame=0;if(disposed||lost||document.hidden)return;
  const dt=Math.min((t-last)/1000||0,.05);last=t;
  const transitionMoving=updateLighting(dt,t);
  const accMoving=Object.entries(accumulationTarget(env,currentStormIntensity)).some(([key,value])=>Math.abs(accumulation[key]-value)>.008);
  const environmentMoving=weatherSystems.length>0||currentCloud>.015||env.cycleEnabled||transitionMoving||accMoving;
  if(weatherSystems.length)weatherTick(t,dt);
  if(cloudMesh && (currentCloud>.015||transitionMoving))cloudTick(dt,t);
  if(fogMeshes.length)for(const m of fogMeshes)m.position.x=Math.sin(t*.00012)*.3*env.windSpeed;
  if(transition){
   const f=clamp((t-transition.start)/transition.duration,0,1),ease=f*f*(3-2*f);
   camera.position.lerpVectors(transition.fromPos,transition.toPos,ease);
   camera.fov=transition.fromFov+(transition.toFov-transition.fromFov)*ease;camera.aspect=transition.aspect;camera.updateProjectionMatrix();
   target.lerpVectors(transition.fromTarget,transition.toTarget,ease);camera.lookAt(target);camera.updateMatrixWorld();
   projectionDirty=true;dirty=true;if(f>=1)transition=null;
  }
  const cinematicMoving=cinematicStep(t,dt);
  const cardFxMoving=nativeCards.needsAnimation(t);
  if(dirty||environmentMoving||transition||cinematicMoving||cardFxMoving){
   if(projectionDirty){projectCards(t);projectionDirty=false;}
   else if(cardFxMoving)nativeCards.update(camera,width,height,env,landscapeHeight,t);
   renderer.render(scene,camera);dirty=false;
   if(t-lastStatsAt>1000||!lastStatsAt){lastStatsAt=t;window.grim3DStats={drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,particles:weatherSystems.reduce((n,s)=>n+s.points.length,0),geometries:renderer.info.memory.geometries,pixelRatio:renderer.getPixelRatio(),hour:currentHour,cloudCover:currentCloud,accumulation:{...accumulation}};}
  }
  if(environmentMoving||transition||cinematicEnabled||cardFxMoving)frame=requestAnimationFrame(tick);
 }
 function visibility(){if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{last=performance.now();dirty=true;wake();}}
 document.addEventListener('visibilitychange',visibility);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;cancelAnimationFrame(frame);frame=0;host.classList.add('world-lost');document.getElementById('stageApp').classList.remove('webgl-ready','native-cards-ready');document.getElementById('worldStatus').textContent='3D paused · restoring graphics';});
 renderer.domElement.addEventListener('webglcontextrestored',()=>{lost=false;frame=0;signature='';terrainSignature='';projectionDirty=true;rebuild(env);host.classList.remove('world-lost');document.getElementById('stageApp').classList.add('webgl-ready','native-cards-ready');document.getElementById('worldStatus').textContent='3D WORLD';});
 resize();return {
  update:rebuild,setCards,
  resize(){resize();wake();},
  orbit(y,p){yaw=y*Math.PI/180;pitch=p;cinematicPauseUntil=performance.now()+10000;cameraPose();wake();},
  setView(mode){if(!['tactical','ground','overhead'].includes(mode))return viewMode;viewMode=mode;yaw=0;pitch=0;zoom=1;cameraPose(true);wake();return viewMode;},
  getView(){return viewMode;},
  getOrbit(){return {yaw:yaw*180/Math.PI,pitch};},
  pauseCinematic(ms=10000){cinematicPauseUntil=performance.now()+clamp(ms,0,60000);},
  setCinematic(enabled,speed){updateCinematicSettings({cinematicPan:enabled,cinematicSpeed:speed});return cinematicEnabled;},
  getCinematic(){return cinematicEnabled;},
  zoomTo(v){cinematicPauseUntil=performance.now()+10000;zoom=fitCardsZoom(clamp(Number(v)||1,MIN_CAMERA_ZOOM,MAX_CAMERA_ZOOM));cameraPose();wake();return zoom;},
  getZoom(){return zoom;},
  dispose(){disposed=true;cancelAnimationFrame(frame);frame=0;stageShell.classList.remove('native-cards-ready');nativeCards.dispose();document.removeEventListener('visibilitychange',visibility);clearRoot();disposeObject(markerGroup);markerGroup.clear();groundShadow.dispose();scene.remove(markerGroup);renderer.dispose();renderer.domElement.remove();}
 };
}
