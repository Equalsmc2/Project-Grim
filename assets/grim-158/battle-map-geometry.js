import * as T from './vendor/three.module.js';
import {palettes} from './world-foundations.js';

// The tactical set uses the exact low-poly shapes, silhouettes and material
// palette of world.js scenery. This is geometry, never painted 2D tokens.
export const BATTLE_CELL_SIZE=2.6;
const material=(color,opts={})=>new T.MeshStandardMaterial({color,roughness:.91,...opts});
const mats={floor:0x777773,difficult:0x786d60,water:0x4d798a,wall:0x666867};
const tilePos=(map,x,y)=>({x:(x+.5-map.width/2)*BATTLE_CELL_SIZE,z:(y+.5-map.height/2)*BATTLE_CELL_SIZE});
export function worldCell(map,x,y){return tilePos(map,x,y);}
export function cellAtWorld(map,x,z){
  const col=Math.floor(x/BATTLE_CELL_SIZE+map.width/2),row=Math.floor(z/BATTLE_CELL_SIZE+map.height/2);
  return col>=0&&row>=0&&col<map.width&&row<map.height?{x:col,y:row}:null;
}

export function buildBattleGeometry(map){
  const group=new T.Group(),clickable=new T.Mesh(
    new T.PlaneGeometry(map.width*BATTLE_CELL_SIZE,map.height*BATTLE_CELL_SIZE),
    new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide})
  );
  clickable.rotation.x=-Math.PI/2;clickable.position.y=.08;clickable.name='battle-floor-picker';
  clickable.renderOrder=-1;
  group.add(clickable);
  const indexed=new Map();
  for(let row=0;row<map.height;row++)for(let col=0;col<map.width;col++){
    const code=map.rows[row]?.[col]||'.';
    if(!indexed.has(code))indexed.set(code,[]);
    const point=tilePos(map,col,row);indexed.get(code).push(point);
  }
  const dummy=new T.Object3D();
  function instances(points,geometry,color,place,{transparent=false,opacity=1}={}){
    if(!points?.length){geometry.dispose();return;}
    const mesh=new T.InstancedMesh(geometry,material(color,{transparent,opacity,side:T.DoubleSide}),points.length);
    points.forEach((point,i)=>{
      dummy.position.set(point.x,0,point.z);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);
      place(dummy,point,i);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  }
  const all=[...indexed.values()].flat();
  instances(all,new T.BoxGeometry(BATTLE_CELL_SIZE*.998,.13,BATTLE_CELL_SIZE*.998),mats.floor,o=>o.position.y=-.065);
  for(const [code,color] of [[':',mats.difficult],['~',mats.water]]){
    instances(indexed.get(code),new T.BoxGeometry(BATTLE_CELL_SIZE*.985,.045,BATTLE_CELL_SIZE*.985),color,o=>o.position.y=.036,{transparent:code==='~',opacity:code==='~'?.8:1});
  }
  const walls=indexed.get('#');
  instances(walls,new T.BoxGeometry(BATTLE_CELL_SIZE*.99,2.5,BATTLE_CELL_SIZE*.99),mats.wall,o=>o.position.y=1.25);
  instances(walls,new T.BoxGeometry(BATTLE_CELL_SIZE*1.02,.17,BATTLE_CELL_SIZE*1.02),0x92918b,o=>o.position.y=2.56);
  instances(walls,new T.BoxGeometry(BATTLE_CELL_SIZE*1.01,.17,BATTLE_CELL_SIZE*1.01),0x555654,o=>o.position.y=.13);
  const covers=indexed.get('O');
  instances(covers,new T.BoxGeometry(BATTLE_CELL_SIZE*.8,1.1,BATTLE_CELL_SIZE*.8),0x655c51,o=>o.position.y=.58);
  instances(covers,new T.BoxGeometry(BATTLE_CELL_SIZE*.9,.13,BATTLE_CELL_SIZE*.9),0xaaa093,o=>o.position.y=1.17);
  // Reuse the existing world scenery's exact mesh vocabulary and colors.
  const woods=0x594636,foliage=palettes.grass.foliage;
  instances(indexed.get('T'),new T.CylinderGeometry(.13,.20,1.5,6),woods,o=>o.position.y=.75);
  for(const [h,r,center] of [[2.25,.86,2.3],[1.75,.73,3.25]]){
    instances(indexed.get('T'),new T.ConeGeometry(r,h,7),foliage,(o,p)=>{o.position.y=center;o.rotation.y=(p.x+p.z)*.19;});
  }
  instances(indexed.get('R'),new T.IcosahedronGeometry(.65,0),0x777b78,o=>{o.position.y=.29;o.scale.set(1.1,.85,1.24);});
  instances(indexed.get('B'),new T.IcosahedronGeometry(.6,1),foliage,o=>{o.position.y=.37;o.scale.set(1.3,.72,1.04);});
  instances(indexed.get('L'),new T.CylinderGeometry(.19,.25,1.7,7),0x604837,o=>{o.position.y=.25;o.rotation.z=Math.PI/2;});
  instances(indexed.get('P'),new T.CylinderGeometry(.36,.43,2.25,8),0x777779,o=>o.position.y=1.125);
  instances(indexed.get('U'),new T.BoxGeometry(1.3,1,.7),0x70706c,o=>{o.position.y=.5;o.rotation.y=.23;});
  instances(indexed.get('G'),new T.BoxGeometry(.58,1,.2),0x6e7070,o=>o.position.y=.5);
  instances(indexed.get('M'),new T.IcosahedronGeometry(.75,1),0x9c9483,o=>{o.position.y=.28;o.scale.set(1,.42,1);});
  // A shared thin grid keeps 5-foot measurements clear, including on dark tiles.
  const edge=[],w=map.width*BATTLE_CELL_SIZE,h=map.height*BATTLE_CELL_SIZE;
  for(let x=0;x<=map.width;x++){
    const xx=x*BATTLE_CELL_SIZE-w/2;edge.push(xx,.091,-h/2,xx,.091,h/2);
  }
  for(let z=0;z<=map.height;z++){
    const zz=z*BATTLE_CELL_SIZE-h/2;edge.push(-w/2,.091,zz,w/2,.091,zz);
  }
  const lines=new T.BufferGeometry();lines.setAttribute('position',new T.Float32BufferAttribute(edge,3));
  group.add(new T.LineSegments(lines,new T.LineBasicMaterial({color:0x1d2223,transparent:true,opacity:.6})));
  const border=new T.Mesh(new T.BoxGeometry(w+.33,.38,h+.33),material(0x2b2c2d));
  border.position.y=-.29;border.receiveShadow=true;group.add(border);
  // Click target belongs to the map, but is invisible in the rendered scene.
  return {group,clickable};
}
