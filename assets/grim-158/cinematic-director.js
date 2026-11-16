// Camera composition is independent of Three.js. The renderer's card-aware
// fitting step remains authoritative after every cinematic movement.
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const styles=Object.freeze({
  follow:{swing:3.5,glide:.55,pitch:.65,focus:1},
  orbit:{swing:4.8,glide:.78,pitch:.8,focus:.2},
  sweep:{swing:6.8,glide:1,pitch:1,focus:0}
});

export function cinematicTargets(phase,activeWorldX=0,options={}){
  const x=Number.isFinite(activeWorldX)?activeWorldX:0;
  const raw=Number(options.strength);
  const strength=Number.isFinite(raw)?clamp(raw,.4,2.4):1.5;
  const style=styles[options.style]||styles.follow;
  const focus=clamp(x*.52,-5,5)*style.focus;
  const yaw=clamp((focus+Math.sin(phase)*style.swing)*strength,-12,12);
  const glide=clamp((clamp(x*.16,-.8,.8)*style.focus+Math.sin(phase*.78)*style.glide)*strength,-2.4,2.4);
  return {
    desiredYaw:yaw*Math.PI/180,
    desiredPitch:clamp(Math.sin(phase*.54+.4)*style.pitch*strength,-2,2),
    desiredGlide:glide
  };
}
