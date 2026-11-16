// Camera composition is independent of Three.js. The renderer's card-aware
// fitting step remains authoritative after every cinematic movement.
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const styles=Object.freeze({
  follow:{swing:3.5,glide:.55,pitch:.65,focus:1},
  orbit:{swing:4.8,glide:.78,pitch:.8,focus:.2},
  sweep:{swing:6.8,glide:1,pitch:1,focus:0}
});
const softLimit=(value,limit)=>limit*Math.tanh(value/limit);

// A velocity-aware, critically damped camera control. The speed cap prevents
// turn switches and manually re-entering cinematic mode from whipping the view.
// Call with the measured frame delta, never with elapsed wall-clock time.
export function springCinematicValue(value,target,velocity,dt,{response=.95,maxSpeed=Infinity}={}){
  let remaining=clamp(Number.isFinite(dt)?dt:0,0,.15);
  if(!remaining)return {value,velocity};
  const omega=2/Math.max(.2,response);
  // Small integration steps keep the same movement feel at 15, 30 and 60 FPS.
  while(remaining>1e-7){
    const step=Math.min(remaining,1/60);
    const acceleration=(target-value)*omega*omega-2*omega*velocity;
    const nextVelocity=clamp(velocity+acceleration*step,-maxSpeed,maxSpeed);
    value+=nextVelocity*step;
    velocity=nextVelocity;
    remaining-=step;
  }
  return {value,velocity};
}

export function cinematicTargets(phase,activeWorldX=0,options={}){
  const x=Number.isFinite(activeWorldX)?activeWorldX:0;
  const raw=Number(options.strength);
  const strength=Number.isFinite(raw)?clamp(raw,.4,2.4):1.5;
  const style=styles[options.style]||styles.follow;
  const edge=Math.min(1,Math.abs(x)/13);
  const safeSwing=1-.3*edge;
  const focus=Math.tanh(x/8)*4.6*style.focus;
  const yaw=softLimit((focus+Math.sin(phase)*style.swing*safeSwing)*strength,12);
  const glide=softLimit((Math.tanh(x/7)*.8*style.focus+Math.sin(phase*.78)*style.glide*safeSwing)*strength,2.4);
  return {
    desiredYaw:yaw*Math.PI/180,
    desiredPitch:softLimit(Math.sin(phase*.54+.4)*style.pitch*strength,2),
    desiredGlide:glide
  };
}
