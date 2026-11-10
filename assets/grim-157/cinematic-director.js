// Cinematic composition is deliberately independent of the renderer. Camera
// fitting remains authoritative afterward, so no shot can crop a card.
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

export function cinematicTargets(phase,activeWorldX=0){
  const x=Number.isFinite(activeWorldX)?activeWorldX:0;
  const focusX=clamp(x*.22,-4.2,4.2);
  const breathing=Math.sin(phase)*1.65;
  return {
    desiredYaw:clamp(focusX+breathing,-7,7)*Math.PI/180,
    desiredPitch:Math.sin(phase*.5+.4)*.55,
    desiredGlide:clamp(x*.13,-.75,.75)+Math.sin(phase*.62)*.14
  };
}
