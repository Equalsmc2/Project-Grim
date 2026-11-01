import * as T from './vendor/three.module.js';
import {normalizeEnvironment} from './environment-state.js';
import {calculateCameraPose,applyCameraPose,FIELD_WIDTH,FIELD_DEPTH,DEFAULT_CAMERA_VIEW,MIN_CAMERA_ZOOM,MAX_CAMERA_ZOOM} from './camera-frame.js';

// Grim 1.2: the battlefield is a region INSIDE a continuous 3D landscape.
// Unit anchors are fixed in world coordinates. The cards are sharp camera-facing
// HTML billboards; only their projected screen positions change on camera orbit.
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const palettes={
 blank:{ground:0x25292b,low:0x191e20,horizon:0x222d31,sky:0x0c1117,foliage:0x344a40},
 grass:{ground:0x3e6942,low:0x253f31,horizon:0x405b50,sky:0x101b22,foliage:0x31523e},
 stone:{ground:0x69716f,low:0x43494b,horizon:0x535d62,sky:0x101820,foliage:0x43544a},
 dirt:{ground:0x775b43,low:0x483a2f,horizon:0x695a4b,sky:0x1a1b1f,foliage:0x4b563e},
 sand:{ground:0xb9a076,low:0x827359,horizon:0x9c8d79,sky:0x29282b,foliage:0x777153},
 snow:{ground:0xb2c3cd,low:0x647f8d,horizon:0x829ba9,sky:0x151e2a,foliage:0x314f43},
 leaves:{ground:0x845a3b,low:0x4c392f,horizon:0x775e4b,sky:0x191822,foliage:0x755231}
};
export function landscapeHeight(x,z,w,d,seed=7301,variation=.35){
  // Playable region stays level for unit markers. Only the distant environment
  // rises into soft hills; no geometry seams or separate floating platform.
  const rim=clamp(Math.max((Math.abs(x)-w*.45)/(w*.65),(Math.abs(z)-d*.44)/(d*.95),0),0,1);
  const roll=Math.sin(x*.135+seed*.0013)*.55+Math.cos(z*.17+seed*.00031)*.45+
             Math.sin(x*.085+z*.07)*.28;
  return rim*rim*(.55+Math.max(0,roll+1)*1.15)+
         (Math.sin(x*.9+z*.3)*Math.cos(z*.75-x*.22))*.035*variation;
}
const rngFactory=(seed)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const material=(color,opts={})=>new T.MeshStandardMaterial({color,roughness:.95,...opts});
const placeOnTerrain=(o,x,z,w,d,e,offset=0)=>o.position.set(x,landscapeHeight(x,z,w,d,e.seed,e.variation)+offset,z);
function shadowTexture(){
 const c=document.createElement('canvas');c.width=c.height=64;
 const ctx=c.getContext('2d');const g=ctx.createRadialGradient(32,32,3,32,32,32);
 g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(.35,'rgba(0,0,0,.31)');g.addColorStop(1,'rgba(0,0,0,0)');
 ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;
}
function createSky(pal){
 const sky=new T.Mesh(new T.SphereGeometry(155,24,12),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{top:{value:new T.Color(pal.sky)},bottom:{value:new T.Color(pal.horizon)}},vertexShader:`varying float vY; void main(){vec4 p=modelMatrix*vec4(position,1.);vY=normalize(position).y;gl_Position=projectionMatrix*viewMatrix*p;}`,fragmentShader:`uniform vec3 top;uniform vec3 bottom;varying float vY;void main(){float t=smoothstep(-.10,.46,vY);gl_FragColor=vec4(mix(bottom,top,t),1.);}` }));
 sky.frustumCulled=false;return sky;
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
 sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-34,right:34,top:34,bottom:-34});sun.shadow.bias=-.0005;sun.shadow.normalBias=.02;scene.add(sun);
 const spotlight=new T.SpotLight(0xffffff,26,30,.43,.7,1);scene.add(spotlight,spotlight.target);
 let root=new T.Group();scene.add(root);
 const markerGroup=new T.Group();scene.add(markerGroup);
 const groundShadow=shadowTexture();
 let zoom=1,viewMode=DEFAULT_CAMERA_VIEW,transition=null;
 let width=1,height=1,yaw=0,pitch=0,env=normalizeEnvironment(),signature='',weather=null,fogMeshes=[],particles=[],anchors=[],disposed=false,lost=false,frame=0,last=0,dirty=true,projectionDirty=true,lastStatsAt=0,markerSignature='';
 const dummy=new T.Object3D(),proj=new T.Vector3(),foot=new T.Vector3(),cardPoint=new T.Vector3(),target=new T.Vector3();
 const cardElements=new Map(),baseElements=new Map();
 function wake(){if(!frame&&!disposed&&!lost&&!document.hidden)frame=requestAnimationFrame(tick);}
 function cameraPose(animate=false){
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
    attr.setZ(i,landscapeHeight(x,z,fieldWidth,fieldDepth,e.seed,e.variation));
    const n=.055*Math.sin(x*.85+z*.36)+.045*Math.sin(z*1.27-x*.51);
    c.copy(base).lerp(low,clamp(dist*.46+n,.02,.52)).lerp(outer,clamp((dist-.65)*.85,0,.3));
    colors.push(c.r,c.g,c.b);
  }
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.rotateX(-Math.PI/2);geo.computeVertexNormals();
  const mesh=new T.Mesh(geo,material(0xffffff,{vertexColors:true,metalness:0}));mesh.receiveShadow=true;root.add(mesh);
  if(e.ground==='blank'||e.ground==='stone'){
   const grid=new T.GridHelper(fieldWidth,Math.round(fieldWidth),0x676b71,0x44484b);
   grid.scale.z=fieldDepth/fieldWidth;grid.position.y=.055;root.add(grid);
  }
  return {tw,td};
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
 function addPaths(e,rnd){
  if(!e.path)return;
  const a=e.pathAngle*Math.PI/180;
  const point=(x,z)=>[Math.cos(a)*x+Math.sin(a)*z+e.pathX,-Math.sin(a)*x+Math.cos(a)*z+e.pathZ];
  const positions=[];
  for(let z=-fieldDepth*.65;z<=fieldDepth*.65;z+=.62){
   for(let x=-e.pathWidth/2+.25;x<e.pathWidth/2;x+=.61){
    const [xx,zz]=point(x+(rnd()-.5)*.1,z);
    if(Math.abs(xx)>fieldWidth*.5-.5||Math.abs(zz)>fieldDepth*.5-.5)continue;
    positions.push([xx,zz]);
   }
  }
  instanced(new T.BoxGeometry(.55,.11,.56),material(0x82827d),positions.length,(o,i)=>{
   const [x,z]=positions[i];placeOnTerrain(o,x,z,fieldWidth,fieldDepth,e,.075);o.rotation.y=a+(rnd()-.5)*.07;o.scale.y=.65+rnd()*.45;
  },{shadows:false});
  const loose=[];
  for(let i=0;i<Math.round(110*e.pathEdge);i++){
   const [x,z]=point((rnd()>.5?1:-1)*(e.pathWidth*.5+.15+rnd()*.48),(rnd()-.5)*fieldDepth*1.25);
   if(Math.abs(x)<fieldWidth*.5&&Math.abs(z)<fieldDepth*.5)loose.push([x,z]);
  }
  instanced(new T.IcosahedronGeometry(.11,0),material(0x77746a),loose.length,(o,i)=>{const [x,z]=loose[i];placeOnTerrain(o,x,z,fieldWidth,fieldDepth,e,.045);o.scale.y=.45;});
 }
 function addProps(e,rnd,pal){
  if(e.density<=0)return;
  const types={forest:['tree','bush','log','tuft','rock'],rocks:['rock'],ruins:['pillar','ruin','grave','rock'],snow:['mound','rock','tree'],grass:['tuft'],bushes:['bush'],logs:['log'],graves:['grave'],mixed:['tree','bush','log','tuft','rock','pillar','ruin','grave','mound']}[e.props]||['rock'];
  const spots=[];
  const within=Math.round(e.density*85);
  for(let i=0;i<within;i++){
   let x=0,z=0;
   for(let tries=0;tries<15;tries++){
    x=(rnd()-.5)*(fieldWidth-2);z=(rnd()-.5)*(fieldDepth-2);
    if(Math.abs(x)>fieldWidth*.27||Math.abs(z)>fieldDepth*.34)break;
   }
   spots.push({x,z,s:.65+rnd()*.65,far:false});
  }
  // Scenery continues beyond the playable rectangle. At low camera angles
  // this creates genuine depth and a natural horizon instead of hard edges.
  const distant=Math.round(e.density*150);
  for(let i=0;i<distant;i++){
   const z=-(fieldDepth*.55+rnd()*fieldDepth*1.9);
   const x=(rnd()-.5)*fieldWidth*3.4;
   spots.push({x,z,s:.85+rnd()*.9,far:true});
  }
  const grouped=Object.fromEntries(types.map(k=>[k,[]]));
  for(let i=0;i<spots.length;i++)grouped[types[i%types.length]].push(spots[i]);
  const each=(name,geo,color,fn,{shadows=true}={})=>{
   const all=grouped[name]||[];
   instanced(geo,material(color),all.length,(o,i)=>fn(o,all[i],i),{shadows});
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
 function addAtmosphere(e,rnd,pal){
  scene.background=new T.Color(pal.sky);
  // Real fog fades far geometry and weather together, rather than screen-space
  // particles floating in a pure black void.
  scene.fog=new T.FogExp2(pal.horizon,.011+e.fog*.022);
  ambient.color.setHex(e.ground==='snow'?0xe4ecf6:0xdce9df);
  const sky=createSky(pal);root.add(sky);
  if(e.fog>0){
   // Low wisps sit in world space and track terrain relief, not camera pixels.
   const count=Math.min(24,Math.round(8+e.fog*16));
   const fogMat=new T.MeshBasicMaterial({color:pal.horizon,transparent:true,opacity:e.fog*.035,depthWrite:false,fog:true});
   const mesh=instanced(new T.SphereGeometry(1,10,6),fogMat,count,(o)=>{
    const x=(rnd()-.5)*fieldWidth*2.4,z=(rnd()-.5)*fieldDepth*2.2;
    placeOnTerrain(o,x,z,fieldWidth,fieldDepth,e,.22);o.scale.set(2.8+rnd()*3,.16+rnd()*.16,2+rnd()*2);
   });if(mesh){mesh.castShadow=false;mesh.frustumCulled=false;fogMeshes.push(mesh);}
  }
 }
 function addWeather(e,rnd){
  weather=null;particles=[];
  if(e.weather==='none'||e.intensity<=0)return;
  const isRain=e.weather==='rain',isLeaf=e.weather==='leaves',isDust=e.weather==='dust';
  const count=Math.round(e.intensity*(isRain?750:isLeaf?280:isDust?320:430));
  const geo=isRain?new T.BoxGeometry(.018,.36,.018):isLeaf?new T.PlaneGeometry(.16,.09):isDust?new T.IcosahedronGeometry(.027,0):new T.IcosahedronGeometry(.055,0);
  const mat=material(isLeaf?0xffffff:isDust?0xc7b08a:isRain?0xa1bac5:0xe6e9ee,{side:T.DoubleSide,transparent:true,opacity:isRain?.50:isDust?.52:.73,depthWrite:false,fog:true});
  const volumeX=Math.max(26,fieldWidth*.9),volumeZ=Math.max(26,fieldDepth*1.35);
  particles=Array.from({length:count},()=>({x:(rnd()-.5)*volumeX*2,z:(rnd()-.5)*volumeZ*2,y:.5+rnd()*(isDust?1.25:10),phase:rnd()*Math.PI*2,weight:.5+rnd()*.7}));
  weather=instanced(geo,mat,count,(o,i)=>{
   const p=particles[i];o.position.set(p.x,p.y,p.z);
   // Weather becomes quieter with distance, and never stars the whole sky.
   const far=clamp((Math.abs(p.z)-fieldDepth*.35)/(fieldDepth*1.5),0,1);
   o.scale.setScalar((1-far*.55)*p.weight);if(isLeaf)o.rotation.set(-.5,p.phase,.5);
  },{shadows:false});
  if(weather){weather.frustumCulled=false;weather.receiveShadow=false;}
  if(isLeaf){const colors=[0xe9a64f,0xc87343,0xb45d33,0xd7b36a];for(let i=0;i<count;i++)weather.setColorAt(i,new T.Color(colors[i%4]));weather.instanceColor.needsUpdate=true;}
 }
 function rebuild(value){
  const nextEnv=normalizeEnvironment(value);
  const next=JSON.stringify(nextEnv);if(next===signature)return;
  const oldW=fieldWidth,oldD=fieldDepth;
  env=nextEnv;signature=next;
  fieldWidth=env.terrainWidth;fieldDepth=env.terrainDepth;
  clearRoot();weather=null;fogMeshes=[];particles=[];
  const rnd=rngFactory(env.seed),pal=palettes[env.ground]||palettes.blank;
  makeTerrain(env,rnd,pal);addSurface(env,rnd,pal);addPaths(env,rnd);addProps(env,rnd,pal);addAtmosphere(env,rnd,pal);addWeather(env,rnd);
  if(oldW!==fieldWidth||oldD!==fieldDepth)cameraPose();
  dirty=true;projectionDirty=true;wake();
 }
 function setCards(placements){
  if(width!==stage.clientWidth||height!==stage.clientHeight)resize();
  anchors=[];cardElements.clear();
  for(const [id,p] of placements){
   const x=clamp(Number(p.worldX)||0,-fieldWidth*.5+1,fieldWidth*.5-1);
   const z=clamp(Number(p.worldZ)||0,-fieldDepth*.5+1,fieldDepth*.5-1);
   anchors.push({id,x,z,active:p.active,layout:p});
   const el=document.querySelector(`[data-combatant-id="${CSS.escape(id)}"]`);if(el)cardElements.set(id,el);
  }
  const nextSig=JSON.stringify(anchors.map(a=>[a.id,a.x,a.z,a.active,a.layout.side]));
  if(nextSig!==markerSignature){
   markerSignature=nextSig;disposeObject(markerGroup);markerGroup.clear();
   for(const a of anchors){
    const y=landscapeHeight(a.x,a.z,fieldWidth,fieldDepth,env.seed,env.variation);
    const shadow=new T.Mesh(new T.PlaneGeometry(2.7,1.48),new T.MeshBasicMaterial({map:groundShadow,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,opacity:a.active?.94:.74}));
    shadow.rotation.x=-Math.PI/2;shadow.position.set(a.x,y+.085,a.z);markerGroup.add(shadow);
    const ring=new T.Mesh(new T.TorusGeometry(a.active?.76:.58,a.active?.043:.022,5,36),new T.MeshBasicMaterial({color:a.active?0xe8eded:a.layout.side==='enemy'?0xb3b5b9:0xd5dbd5,transparent:true,opacity:a.active?.86:.33,depthWrite:false}));
    ring.rotation.x=-Math.PI/2;ring.position.set(a.x,y+.10,a.z);markerGroup.add(ring);
   }
  }
  dirty=true;projectionDirty=true;wake();
 }
 function projectCards(){
  camera.updateMatrixWorld();let active=false;
  for(const a of anchors){
   const y=landscapeHeight(a.x,a.z,fieldWidth,fieldDepth,env.seed,env.variation);
   const hover=a.active?1.45:1.1;
   foot.set(a.x,y+.02,a.z).project(camera);proj.set(a.x,y+hover,a.z).project(camera);
   const px=(proj.x+1)*width*.5,groundY=(1-foot.y)*height*.5,bottomY=(1-proj.y)*height*.5;
   const distance=camera.position.distanceTo(cardPoint.set(a.x,y+hover,a.z));
   const responsive=width<520?.39:width<800?.47:width<1100?.53:.60;
   const perspective=clamp(31/Math.max(distance,1),.81,1.1);
   const scale=clamp(responsive*(a.layout.scale/.72)*perspective,.32,.76);
   const el=cardElements.get(a.id);if(!el)continue;
   // Keep the HTML laminated card hovering exactly over the 3D ground shadow.
   el.style.setProperty('--px',px.toFixed(2)+'px');
   el.style.setProperty('--py',(bottomY-240*scale).toFixed(2)+'px');
   el.style.setProperty('--unit-scale',scale.toFixed(3));
   el.style.setProperty('--tether-size','0px');
   el.style.zIndex=String(30+Math.round((a.z+fieldDepth*.5)*2)+(a.active?100:0));
   if(a.active){spotlight.position.set(a.x,10,a.z+2);spotlight.target.position.set(a.x,0,a.z);active=true;}
  }
  spotlight.visible=active;
 }
 function tick(t){
  frame=0;if(disposed||lost||document.hidden)return;
  const dt=Math.min((t-last)/1000||0,.05);last=t;
  const moving=!!weather||!!fogMeshes.length;
  if(weather){
   const wind=env.windAngle*Math.PI/180,halfX=Math.max(26,fieldWidth*.9),halfZ=Math.max(26,fieldDepth*1.35);
   const rain=env.weather==='rain',snow=env.weather==='snow',leaf=env.weather==='leaves',dust=env.weather==='dust';
   const fall=rain?10.5:snow?.85:leaf?1.45:.08;
   for(let i=0;i<particles.length;i++){
    const p=particles[i];
    p.x+=Math.cos(wind)*env.windSpeed*dt*(rain?.48:1);
    p.z+=Math.sin(wind)*env.windSpeed*dt;
    p.y-=fall*dt*(.65+p.weight*.4);
    if(p.y<(.08+landscapeHeight(p.x,p.z,fieldWidth,fieldDepth,env.seed,env.variation))){p.y=dust?1.4:10.7;}
    if(p.x>halfX)p.x=-halfX;if(p.x< -halfX)p.x=halfX;
    if(p.z>halfZ)p.z=-halfZ;if(p.z< -halfZ)p.z=halfZ;
    const far=clamp((Math.abs(p.z)-fieldDepth*.35)/(fieldDepth*1.5),0,1);
    const s=(1-far*.55)*p.weight;
    dummy.position.set(p.x,p.y,p.z);dummy.scale.setScalar(s);
    dummy.rotation.set(leaf?t*.001+p.phase:0,p.phase,leaf?t*.0007:0);
    dummy.updateMatrix();weather.setMatrixAt(i,dummy.matrix);
   }
   weather.instanceMatrix.needsUpdate=true;
  }
  if(fogMeshes.length)for(const m of fogMeshes)m.position.x=Math.sin(t*.00012)*.3*env.windSpeed;
  if(transition){
   const f=clamp((t-transition.start)/transition.duration,0,1),ease=f*f*(3-2*f);
   camera.position.lerpVectors(transition.fromPos,transition.toPos,ease);
   camera.fov=transition.fromFov+(transition.toFov-transition.fromFov)*ease;camera.aspect=transition.aspect;camera.updateProjectionMatrix();
   target.lerpVectors(transition.fromTarget,transition.toTarget,ease);camera.lookAt(target);camera.updateMatrixWorld();
   projectionDirty=true;dirty=true;if(f>=1)transition=null;
  }
  if(dirty||moving){
   if(projectionDirty){projectCards();projectionDirty=false;}
   renderer.render(scene,camera);dirty=false;
   if(t-lastStatsAt>1000||!lastStatsAt){lastStatsAt=t;window.grim3DStats={drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,particles:particles.length,geometries:renderer.info.memory.geometries,pixelRatio:renderer.getPixelRatio()};}
  }
  if(moving||transition)frame=requestAnimationFrame(tick);
 }
 function visibility(){if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{last=performance.now();dirty=true;wake();}}
 document.addEventListener('visibilitychange',visibility);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;cancelAnimationFrame(frame);frame=0;host.classList.add('world-lost');document.getElementById('stageApp').classList.remove('webgl-ready');document.getElementById('worldStatus').textContent='3D paused · restoring graphics';});
 renderer.domElement.addEventListener('webglcontextrestored',()=>{lost=false;frame=0;signature='';projectionDirty=true;rebuild(env);host.classList.remove('world-lost');document.getElementById('stageApp').classList.add('webgl-ready');document.getElementById('worldStatus').textContent='3D WORLD';});
 resize();return {
  update:rebuild,setCards,
  resize(){resize();wake();},
  orbit(y,p){yaw=y*Math.PI/180;pitch=p;cameraPose();wake();},
  setView(mode){if(!['tactical','ground','overhead'].includes(mode))return viewMode;viewMode=mode;yaw=0;pitch=0;zoom=1;cameraPose(true);wake();return viewMode;},
  getView(){return viewMode;},
  zoomTo(v){zoom=clamp(Number(v)||1,MIN_CAMERA_ZOOM,MAX_CAMERA_ZOOM);cameraPose();wake();return zoom;},
  getZoom(){return zoom;},
  dispose(){disposed=true;cancelAnimationFrame(frame);frame=0;document.removeEventListener('visibilitychange',visibility);clearRoot();disposeObject(markerGroup);markerGroup.clear();groundShadow.dispose();scene.remove(markerGroup);renderer.dispose();renderer.domElement.remove();}
 };
}
