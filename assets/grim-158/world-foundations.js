import * as T from './vendor/three.module.js';

// Stable, deterministic terrain and shared visual foundations. These are
// independent of camera, combat, Firebase, and world lifecycle state.
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const hillScale=(h='mid')=>({flat:0,small:.45,mid:1,mountains:1.9}[h]??1);
export const palettes={
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
export const rngFactory=(seed)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};

export function shadowTexture(){
 const c=document.createElement('canvas');c.width=c.height=64;
 const ctx=c.getContext('2d');const g=ctx.createRadialGradient(32,32,3,32,32,32);
 g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(.35,'rgba(0,0,0,.31)');g.addColorStop(1,'rgba(0,0,0,0)');
 ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;
}

export function gridTexture(line=0x5d6368,bg='rgba(0,0,0,0)'){
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


export function createSky(pal){
 const sky=new T.Mesh(new T.SphereGeometry(155,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{top:{value:new T.Color(pal.sky)},bottom:{value:new T.Color(pal.horizon)}},vertexShader:`varying float vY;void main(){vec4 p=modelMatrix*vec4(position,1.);vY=normalize(position).y;gl_Position=projectionMatrix*viewMatrix*p;}`,fragmentShader:`uniform vec3 top;uniform vec3 bottom;varying float vY;void main(){float t=smoothstep(-.18,.50,vY);gl_FragColor=vec4(mix(bottom,top,t),1.);}` }));
 sky.frustumCulled=false;sky.renderOrder=-100;return sky;
}
