import * as T from './vendor/three.module.js';
import {normalizeEnvironment} from './environment-state.js';
// Everything in this module is world-space geometry. HTML cards project from
// fixed world anchors and are composited above the canvas for guaranteed clarity.
export function createWorld(host,stage){
 // The playable arena is a single wide 35 × 19 world-space rectangle.
 // IMPORTANT: never stretch the arena along Z in root.scale: that was the
 // reason the 1.1 grass/snow surfaces looked square despite wide geometry.
 const FIELD_W=35, FIELD_D=19;
 const HALF_W=FIELD_W/2, HALF_D=FIELD_D/2;
 const EDGE_MARGIN=.7, SURFACE_MARGIN=.2;
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setClearColor(0x050505);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 host.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','3D environment battlefield');
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(44,1,.1,140);
 scene.add(new T.HemisphereLight(0xe6e6e6,0x242424,2));
 const sun=new T.DirectionalLight(0xffffff,2.4);sun.position.set(-7,15,9);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-21,right:21,top:21,bottom:-21});sun.shadow.bias=-.001;scene.add(sun);
 const spotlight=new T.SpotLight(0xffffff,35,35,.38,.7,1);spotlight.position.set(0,10,0);scene.add(spotlight,spotlight.target);
 let root=new T.Group();scene.add(root);
 // Marker meshes live outside environment root so changing the weather or
 // ground material never relocates units.
 let markerGroup=new T.Group();scene.add(markerGroup);
 let markerSignature='';let weather=null,fogMesh=null,particles=[],env=normalizeEnvironment(),signature='',width=1,height=1,yaw=0,pitch=0,anchors=[],frame=0,last=0,dirty=true,disposed=false,lost=false;
 const dummy=new T.Object3D(),project=new T.Vector3(),footProject=new T.Vector3(),cardPosition=new T.Vector3();
 const cardElements=new Map();let projectionDirty=true,lastStatsAt=0;
 const mat=(color,extra={})=>{return new T.MeshStandardMaterial({color,roughness:.88,...extra});};
 const randomFactory=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 function cameraPose(){
   // Perspective camera looks down at the rectangle while preserving its true
   // aspect ratio. Refit distance for narrower displays or camera orbiting;
   // do NOT resize world axes independently to make the plane fit.
   const orbitFit=1+Math.abs(Math.sin(yaw))*.45;
   const portraitFit=Math.max(1,.93/(width/height));
   const fit=orbitFit*portraitFit;
   camera.position.set(Math.sin(yaw)*26*fit,(24+pitch)*fit,Math.cos(yaw)*26*fit);
   camera.lookAt(0,0,0);camera.updateMatrixWorld();
   // Keep all four terrain corners visible, giving the HUD / cards breathing
   // room. This also keeps the entire physical rectangle on-screen at 1024px.
   for(let i=0;i<5;i++){
     let maxX=0,maxY=0;
     for(const x of [-HALF_W,HALF_W])for(const z of [-HALF_D,HALF_D]){
       const q=new T.Vector3(x,0,z).project(camera);
       maxX=Math.max(maxX,Math.abs(q.x));maxY=Math.max(maxY,Math.abs(q.y));
     }
     const oversize=Math.max(maxX/.965,maxY/.73);
     if(oversize<=1.001)break;
     camera.position.multiplyScalar(oversize*1.01);
     camera.updateMatrixWorld();
   }
   dirty=true;projectionDirty=true;
 }
 function resize(){
   width=stage.clientWidth||1;height=stage.clientHeight||1;
   const ratio=width/height;
   camera.aspect=ratio;camera.fov=ratio<1?48:42;
   root.scale.set(1,1,1);camera.updateProjectionMatrix();
   // Constrain 3D canvas pixel count on ultra-high-resolution TVs; HTML cards
   // remain full native resolution, so readability is unaffected.
   const dpr=Math.min(devicePixelRatio||1,1.5);
   const gpuRatio=Math.min(dpr,Math.max(.75,Math.sqrt(3200000/(width*height))));
   if(Math.abs(renderer.getPixelRatio()-gpuRatio)>.025)renderer.setPixelRatio(gpuRatio);
   renderer.setSize(width,height);
   cameraPose();projectionDirty=true;
 }
 function disposeRoot(){const geos=new Set(),mats=new Set();root.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));if(o.isInstancedMesh)o.dispose();});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());scene.remove(root);root=new T.Group();scene.add(root);root.scale.set(1,1,1);}
 function instance(geometry,material,count,place){const mesh=new T.InstancedMesh(geometry,material,count);for(let i=0;i<count;i++){dummy.position.set(0,0,0);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);place(dummy,i);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;}
 function rebuild(value){env=normalizeEnvironment(value);const next=JSON.stringify(env);if(next===signature)return;signature=next;disposeRoot();weather=null;fogMesh=null;particles=[];
 const rnd=randomFactory(env.seed),gray={blank:0x171717,grass:0x32651e,stone:0x606773,dirt:0x69472c,sand:0xc8a45f,snow:0xd4e4ef,leaves:0x714022};
 const groundGeo=new T.PlaneGeometry(FIELD_W,FIELD_D,72,48),positions=groundGeo.attributes.position;
 for(let i=0;i<positions.count;i++)positions.setZ(i,env.ground==='blank'?0:(rnd()-.5)*env.variation*(env.ground==='sand'?.5:.2));groundGeo.rotateX(-Math.PI/2);groundGeo.computeVertexNormals();
 const ground=new T.Mesh(groundGeo,mat(gray[env.ground]));ground.receiveShadow=true;root.add(ground);
 const base=new T.Mesh(new T.BoxGeometry(FIELD_W,.35,FIELD_D),mat(0x141414));base.position.y=-.25;root.add(base);
 if(env.ground==='blank'||env.ground==='stone'){const grid=new T.GridHelper(FIELD_W,Math.round(FIELD_W),0x666666,0x333333);grid.scale.z=FIELD_D/FIELD_W;grid.position.y=.025;root.add(grid);}
 if(['grass','leaves','snow','sand','dirt','stone'].includes(env.ground)){
 const grass=env.ground==='grass',leaves=env.ground==='leaves';
 const scatter=instance(grass?new T.ConeGeometry(.055,.32,3):new T.DodecahedronGeometry(1,0),mat(grass?0x74a63a:leaves?0xffffff:gray[env.ground]),Math.round(350+env.variation*750),(o)=>{o.position.set((rnd()-.5)*(FIELD_W-SURFACE_MARGIN),.06,(rnd()-.5)*(FIELD_D-SURFACE_MARGIN));o.rotation.y=rnd()*6.28;if(!grass)o.scale.set(.03+rnd()*.12,leaves?.014:.02+rnd()*.045,.03+rnd()*.16);});if(leaves){const colors=[0xef8b21,0xc94e1c,0xf6bb3c,0x97411b];for(let i=0;i<scatter.count;i++)scatter.setColorAt(i,new T.Color(colors[i%colors.length]));}}
 if(env.path){const angle=env.pathAngle*Math.PI/180;const point=(x,z)=>[Math.cos(angle)*x+Math.sin(angle)*z+env.pathX,-Math.sin(angle)*x+Math.cos(angle)*z+env.pathZ];
 const stones=[];for(let z=-HALF_D;z<=HALF_D;z+=.66)for(let x=-env.pathWidth/2+.2;x<env.pathWidth/2;x+=.65){const [px,pz]=point(x+(rnd()-.5)*.12,z);if(Math.abs(px)<HALF_W-EDGE_MARGIN&&Math.abs(pz)<HALF_D-EDGE_MARGIN)stones.push([px,pz]);}
 instance(new T.BoxGeometry(.58,.12,.59),mat(0x777773),stones.length,(o,i)=>{o.position.set(stones[i][0],.09,stones[i][1]);o.rotation.y=angle+(rnd()-.5)*.12;o.scale.y=.6+rnd()*.5;});
 const edge=[];for(let i=0;i<150*env.pathEdge;i++){const [x,z]=point((rnd()>.5?1:-1)*(env.pathWidth/2+rnd()*.45),(rnd()-.5)*(FIELD_D*1.6));if(Math.abs(x)<HALF_W-(EDGE_MARGIN-.1)&&Math.abs(z)<HALF_D-(EDGE_MARGIN-.1))edge.push([x,z]);}
 instance(new T.DodecahedronGeometry(.11,0),mat(0x555550),edge.length,(o,i)=>{o.position.set(edge[i][0],.04,edge[i][1]);o.scale.set(1,.5,1);});}
 const count=Math.round(env.density*65),spots=Array.from({length:count},()=>{let x,z;do{x=(rnd()-.5)*(FIELD_W-1.5);z=(rnd()-.5)*(FIELD_D-1.5);}while(Math.abs(x)<7&&Math.abs(z)<5.4);return [x,z,.65+rnd()*.65];});
 const kinds={forest:['tree','bush','log','grass','rock'],rocks:['rock'],ruins:['pillar','ruin','grave','rock'],snow:['mound','rock','tree'],grass:['grass'],bushes:['bush'],logs:['log'],graves:['grave'],mixed:['tree','bush','log','grass','rock','pillar','ruin','grave','mound']}[env.props];
 const definitions={rock:[new T.DodecahedronGeometry(.6,0),0x626262,[1,.7,1],.35],bush:[new T.IcosahedronGeometry(.65,0),0x426c27,[1,.7,1],.4],tree:[new T.ConeGeometry(.8,2.3,7),(env.ground==='leaves'?0xcd621e:0x285b2a),[1,1,1],1.7],log:[new T.CylinderGeometry(.2,.24,1.7,7),0x694125,[1,1,1],.24],grass:[new T.ConeGeometry(.25,.7,4),0x699b32,[1,1,1],.35],pillar:[new T.CylinderGeometry(.34,.4,2.4,8),0x777777,[1,1,1],1.2],ruin:[new T.BoxGeometry(1.4,1,.6),0x616161,[1,1,1],.5],grave:[new T.BoxGeometry(.55,1,.18),0x777777,[1,1,1],.5],mound:[new T.IcosahedronGeometry(.8,1),0xb2b6b9,[1,.45,1],.15]};
 for(const [k,kind]of kinds.entries()){const selected=spots.filter((_,i)=>i%kinds.length===k),[geo,color,scale,y]=definitions[kind];instance(geo,mat(color),selected.length,(o,i)=>{const [x,z,s]=selected[i];o.position.set(x,y*s,z);o.scale.set(scale[0]*s,scale[1]*s,scale[2]*s);o.rotation.y=rnd()*6.28;if(kind==='log')o.rotation.z=Math.PI/2;});if(kind==='tree')instance(new T.CylinderGeometry(.12,.18,1,6),mat(0x4b443c),selected.length,(o,i)=>{o.position.set(selected[i][0],.5,selected[i][1]);});}
 // Dispose unused geometries created for the prop catalog.
 for(const [kind,[geo]]of Object.entries(definitions))if(!kinds.includes(kind))geo.dispose();
 if(env.weather!=='none'&&env.intensity>0){const n=Math.round(env.intensity*(env.weather==='rain'?1000:500));const rain=env.weather==='rain',leaf=env.weather==='leaves';
 weather=instance(rain?new T.BoxGeometry(.015,.4,.015):leaf?new T.SphereGeometry(.12,4,2).scale(1,.13,1.7):new T.IcosahedronGeometry(env.weather==='dust'?.025:.045,0),mat(leaf?0xffffff:env.weather==='dust'?0xd6af6c:env.weather==='rain'?0x9fc8e8:0xe7f3ff,{transparent:true,opacity:rain?.45:.9}),n,()=>{});weather.castShadow=false;weather.receiveShadow=false;weather.frustumCulled=false;if(leaf){const colors=[0xf4a229,0xd95516,0xf2c244,0xb9431c];for(let i=0;i<n;i++)weather.setColorAt(i,new T.Color(colors[i%4]));}
 particles=Array.from({length:n},()=>({x:(rnd()-.5)*(FIELD_W+2),y:rnd()*(env.weather==='dust'?1.2:10),z:(rnd()-.5)*(FIELD_D+3),phase:rnd()*6.28}));}
 if(env.fog>0){fogMesh=instance(new T.SphereGeometry(1,12,6),new T.MeshBasicMaterial({color:0xb4b8ba,transparent:true,opacity:env.fog*.055,depthWrite:false}),18,(o)=>{o.position.set((rnd()-.5)*FIELD_W,.1+rnd()*.2,(rnd()-.5)*FIELD_D);o.scale.set(2+rnd()*2,.18+rnd()*.2,1.3+rnd());});fogMesh.castShadow=false;fogMesh.receiveShadow=false;}
 dirty=true;wake();}
 // These ground positions are authoritative for the card overlays and
 // their small 3D bases. Camera movement projects them; it never rewrites them.
 function setCards(placements){
   if(width!==stage.clientWidth||height!==stage.clientHeight)resize();
   anchors=[];
   cardElements.clear();
   for(const [id,p] of placements){
     const x=Math.max(-HALF_W+1,Math.min(HALF_W-1,Number(p.worldX)||0));
     const z=Math.max(-HALF_D+1,Math.min(HALF_D-1,Number(p.worldZ)||0));
     anchors.push({id,x,z,active:p.active,layout:p});
     const el=document.querySelector(`[data-combatant-id="${CSS.escape(id)}"]`);
     if(el)cardElements.set(id,el);
   }
   const nextSignature=JSON.stringify(anchors.map(a=>[a.id,a.x,a.z,a.active,a.layout.side]));
   if(nextSignature!==markerSignature){
     markerSignature=nextSignature;
     for(const object of [...markerGroup.children]){
       markerGroup.remove(object);
       object.traverse(child=>{
         child.geometry?.dispose();
         if(child.material)(Array.isArray(child.material)?child.material:[child.material]).forEach(m=>m.dispose());
       });
     }
     const markerMaterial=(color,opacity)=>new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:T.DoubleSide});
     for(const a of anchors){
       const color=a.layout.side==='enemy'?0xbdbdbd:0xe7e7e7;
       const ring=new T.Mesh(new T.TorusGeometry(a.active?.85:.64,.05,6,36),markerMaterial(color,a.active?.94:.64));
       ring.rotation.x=-Math.PI/2;
       ring.position.set(a.x,.14,a.z);
       markerGroup.add(ring);
       const core=new T.Mesh(new T.CircleGeometry(a.active?.68:.48,28),markerMaterial(color,a.active?.18:.09));
       core.rotation.x=-Math.PI/2;
       core.position.set(a.x,.13,a.z);
       markerGroup.add(core);
       const stem=new T.Mesh(new T.CylinderGeometry(.026,.026,.60,6),markerMaterial(color,.58));
       stem.position.set(a.x,.42,a.z);
       markerGroup.add(stem);
     }
   }
   dirty=true;projectionDirty=true;wake();
 }
 function projectCards(){
   camera.updateMatrixWorld();
   const referenceDistance=35;
   let anyActive=false;
   for(const a of anchors){
     // Ground ring and the hovering card BOTH come from fixed world points.
     // A billboard remains perfectly front-facing while the camera orbits.
     footProject.set(a.x,.10,a.z).project(camera);
     project.set(a.x,.96,a.z).project(camera);
     const px=(project.x+1)*width*.5;
     const groundY=(1-footProject.y)*height*.5;
     const bottomY=(1-project.y)*height*.5;
     const distance=camera.position.distanceTo(cardPosition.set(a.x,.96,a.z));
     // Physical perspective: closer markers are slightly larger. The DM's
     // card-size slider still works, with responsive limits on small screens.
     const responsive=width<520?.48:width<800?.60:width<1100?.69:.77;
     const perspective=Math.max(.72,Math.min(1.15,referenceDistance/Math.max(distance,1)));
     const scale=Math.max(.40,Math.min(.92,responsive*(a.layout.scale/.78)*perspective));
     const topY=bottomY-264*scale;
     const el=cardElements.get(a.id);
     if(!el)continue;
     el.style.setProperty('--px',px.toFixed(2)+'px');
     el.style.setProperty('--py',topY.toFixed(2)+'px');
     el.style.setProperty('--unit-scale',scale.toFixed(3));
     el.style.setProperty('--tether-size',Math.max(0,(groundY-bottomY)/scale).toFixed(2)+'px');
     el.style.zIndex=String(30+Math.round((a.z+10)*2)+(a.active?100:0));
     if(a.active){
       spotlight.position.set(a.x,10,a.z+2);
       spotlight.target.position.set(a.x,0,a.z);
       anyActive=true;
     }
   }
   spotlight.visible=anyActive;
 }
 function tick(t){frame=0;if(disposed||lost||document.hidden)return;const dt=Math.min((t-last)/1000||0,.05);last=t;const moving=!!weather||!!fogMesh;
 if(weather){const angle=env.windAngle*Math.PI/180;const wrapX=HALF_W+1,wrapZ=HALF_D+1.5;particles.forEach((p,i)=>{p.x+=Math.cos(angle)*env.windSpeed*dt;p.z+=Math.sin(angle)*env.windSpeed*dt;p.y-=(env.weather==='rain'?9:env.weather==='snow'?.65:env.weather==='leaves'?1:.05)*dt;if(p.y<0)p.y=env.weather==='dust'?1.2:10;if(p.x>wrapX)p.x=-wrapX;if(p.x< -wrapX)p.x=wrapX;if(p.z>wrapZ)p.z=-wrapZ;if(p.z< -wrapZ)p.z=wrapZ;dummy.position.set(p.x,p.y,p.z);dummy.scale.set(1,1,1);dummy.rotation.set(env.weather==='leaves'?t*.001+p.phase:0,p.phase,env.weather==='leaves'?t*.002:0);dummy.updateMatrix();weather.setMatrixAt(i,dummy.matrix);});weather.instanceMatrix.needsUpdate=true;}
 if(fogMesh)fogMesh.position.x=Math.sin(t*.00012)*.3*env.windSpeed;
 if(dirty||moving){
   // HTML card anchors only change when the camera or roster changes. Weather
   // animates exclusively on the GPU scene and must not trigger DOM layout.
   if(projectionDirty){projectCards();projectionDirty=false;}
   renderer.render(scene,camera);dirty=false;
   if(t-lastStatsAt>1000||!lastStatsAt){lastStatsAt=t;window.grim3DStats={drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,particles:particles.length,geometries:renderer.info.memory.geometries,pixelRatio:renderer.getPixelRatio()};}
 }
 if(moving)frame=requestAnimationFrame(tick);}
 function wake(){if(!frame&&!document.hidden&&!disposed&&!lost)frame=requestAnimationFrame(tick);}
 function visibility(){if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{last=performance.now();dirty=true;wake();}}
 document.addEventListener('visibilitychange',visibility);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;cancelAnimationFrame(frame);host.classList.add('world-lost');document.getElementById('stageApp').classList.remove('webgl-ready');document.getElementById('worldStatus').textContent='3D paused · restoring graphics';});
 renderer.domElement.addEventListener('webglcontextrestored',()=>{lost=false;frame=0;signature='';projectionDirty=true;rebuild(env);host.classList.remove('world-lost');document.getElementById('stageApp').classList.add('webgl-ready');document.getElementById('worldStatus').textContent='3D WORLD';});
 resize();cameraPose();return {update:rebuild,setCards,resize(){resize();wake();},orbit(y,p){yaw=y*Math.PI/180;pitch=p*.3;cameraPose();wake();},dispose(){disposed=true;cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility);disposeRoot();markerGroup.traverse(o=>{o.geometry?.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});scene.remove(markerGroup);renderer.dispose();renderer.domElement.remove();}};
}


