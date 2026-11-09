// Stateless quality budgets plus a small mutable, device-local weather clock.
// Keep simulation time independent of the display's animation-frame rate.
export const WEATHER_HZ=Object.freeze({low:20,balanced:30,high:45});
export function weatherInterval(quality='balanced'){
  return 1/(WEATHER_HZ[quality]||WEATHER_HZ.balanced);
}
export function createWeatherBudget(){return {elapsed:0,pending:0,steps:0};}
export function advanceWeatherBudget(clock,dt,quality='balanced',active=true){
  if(!active){clock.elapsed=0;clock.pending=0;return 0;}
  // Bound catch-up after a stalled/hidden tab instead of fast-forwarding
  // hundreds of high-cost particle updates at once.
  const delta=Math.max(0,Math.min(.1,Number(dt)||0));
  clock.elapsed=Math.min(.15,clock.elapsed+delta);
  clock.pending=Math.min(.15,clock.pending+delta);
  const interval=weatherInterval(quality);
  if(clock.elapsed+1e-9<interval)return 0;
  const step=clock.pending;
  clock.pending=0;
  clock.elapsed=Math.max(0,clock.elapsed-interval);
  if(clock.elapsed>=interval)clock.elapsed=clock.elapsed%interval;
  clock.steps++;
  return step;
}
export function needsSceneryRefresh(previousWet,previousSnow,wet,snow,tolerance=.004){
  return !Number.isFinite(previousWet)||!Number.isFinite(previousSnow)||Math.abs(previousWet-wet)>tolerance||Math.abs(previousSnow-snow)>tolerance;
}
