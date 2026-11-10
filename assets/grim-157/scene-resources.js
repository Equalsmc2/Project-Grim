// Project Grim — ownership of GPU resources created by a generated scene.
// Only scene-world and marker groups are passed here. Native card textures and
// the intentionally shared ground-shadow texture are owned elsewhere.
const TEXTURE_FIELDS=['map','alphaMap','aoMap','bumpMap','displacementMap','emissiveMap','envMap','lightMap','metalnessMap','normalMap','roughnessMap','specularMap'];

export function disposeSceneGraph(group,{retainTextures=[]}={}){
  if(!group?.traverse)return {geometries:0,materials:0,textures:0,instances:0};
  const geometries=new Set(),materials=new Set(),textures=new Set();
  const retained=new Set(retainTextures);
  let instances=0;
  group.traverse(o=>{
    if(o.geometry)geometries.add(o.geometry);
    if(o.material){
      for(const mat of Array.isArray(o.material)?o.material:[o.material]){
        if(!mat)continue;
        materials.add(mat);
        for(const key of TEXTURE_FIELDS){
          const tex=mat[key];if(tex?.dispose&&!retained.has(tex))textures.add(tex);
        }
      }
    }
    if(o.isInstancedMesh){o.dispose?.();instances++;}
  });
  for(const geometry of geometries)geometry.dispose?.();
  for(const material of materials)material.dispose?.();
  for(const texture of textures)texture.dispose?.();
  return {geometries:geometries.size,materials:materials.size,textures:textures.size,instances};
}

// Geometry is fully constructed while the previous world remains visible.
// Only after construction succeeds do we replace the old scene group.
export function commitSceneGroup(scene,previous,next,{retainTextures=[]}={}){
  scene.add(next);
  scene.remove(previous);
  return disposeSceneGraph(previous,{retainTextures});
}
