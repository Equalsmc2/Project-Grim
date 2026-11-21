// Camera rig: spherical coordinates (target, yaw, pitch, distance) driven by
// damped springs. Cinematic and tactical are goal presets on the same rig,
// so switching between them is one continuous move through the same world.
//
// Layers, applied in order each frame:
//   base framing (solved so every card is on screen)
//   + director motion (follow / orbit / sweep, turn spotlights)
//   + user input (orbit, pan, zoom) — free in tactical, gentle in cinematic
//   + tiny handheld breathing (off with reduced motion)
import * as THREE from 'three';

const TAU = Math.PI * 2;
const v = new THREE.Vector3();

export function createRig(camera) {
  const cur = { target: new THREE.Vector3(0, 1, 0), yaw: 0, pitch: 0.3, dist: 22 };
  const goal = { target: new THREE.Vector3(0, 1, 0), yaw: 0, pitch: 0.3, dist: 22 };
  const user = { yaw: 0, pitch: 0, zoom: 1, pan: new THREE.Vector3(), lastInput: -1e9 };
  let stiffness = 6;
  let transitionUntil = 0;

  function apply(groundAt) {
    const cp = Math.cos(cur.pitch);
    camera.position.set(
      cur.target.x + Math.sin(cur.yaw) * cp * cur.dist,
      cur.target.y + Math.sin(cur.pitch) * cur.dist,
      cur.target.z + Math.cos(cur.yaw) * cp * cur.dist,
    );
    const floor = groundAt(camera.position.x, camera.position.z) + 0.6;
    if (camera.position.y < floor) camera.position.y = floor;
    camera.lookAt(cur.target);
  }

  return {
    cur, goal, user,
    /** Smoothly approach the goal. `slow` is used for mode transitions. */
    step(dt, now) {
      const k = 1 - Math.exp(-dt * (now < transitionUntil ? 2.4 : stiffness));
      cur.target.lerp(goal.target, k);
      let dy = goal.yaw - cur.yaw;
      dy = ((dy + Math.PI) % TAU + TAU) % TAU - Math.PI;
      cur.yaw += dy * k;
      cur.pitch += (goal.pitch - cur.pitch) * k;
      cur.dist += (goal.dist - cur.dist) * k;
    },
    apply,
    transition(now, ms = 1600) { transitionUntil = now + ms; },
    snap() { cur.target.copy(goal.target); cur.yaw = goal.yaw; cur.pitch = goal.pitch; cur.dist = goal.dist; },
    setStiffness(s) { stiffness = s; },
    pose() { return { x: cur.target.x, y: cur.target.y, z: cur.target.z, yaw: cur.yaw, pitch: cur.pitch, dist: cur.dist }; },
  };
}

/**
 * Finds the camera distance (and, if needed, a steeper pitch) at which all
 * points are inside the safe area of the screen and the enemy row is not
 * hidden behind the player row.
 * @param {THREE.PerspectiveCamera} camera
 * @param {{target:THREE.Vector3,yaw:number,pitch:number}} pose
 * @param {Array<{min:THREE.Vector3,max:THREE.Vector3,side:string}>} boxes
 */
export function solveFraming(camera, pose, boxes, { safe = { x: 0.9, top: 0.78, bottom: -0.72 }, minDist = 6, maxDist = 140, maxPitch = 0.46 } = {}) {
  const probe = camera.clone();
  probe.aspect = camera.aspect;
  probe.updateProjectionMatrix();
  const corners = [];
  for (const b of boxes) for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) corners.push(new THREE.Vector3(x, y, z));
  if (!corners.length) return { dist: 22, pitch: pose.pitch };

  const place = (pitch, dist) => {
    const cp = Math.cos(pitch);
    probe.position.set(pose.target.x + Math.sin(pose.yaw) * cp * dist, pose.target.y + Math.sin(pitch) * dist, pose.target.z + Math.cos(pose.yaw) * cp * dist);
    probe.lookAt(pose.target);
    probe.updateMatrixWorld();
  };
  const fits = () => corners.every((c) => {
    v.copy(c).project(probe);
    return v.z < 1 && Math.abs(v.x) <= safe.x && v.y <= safe.top && v.y >= safe.bottom;
  });
  const rowsClear = () => {
    // Bottom edge of the enemy cards must sit above the top of the player cards.
    let enemyBottom = Infinity, playerTop = -Infinity;
    for (const b of boxes) {
      if (b.side === 'enemy') { v.set((b.min.x + b.max.x) / 2, b.min.y + (b.max.y - b.min.y) * 0.3, b.max.z).project(probe); enemyBottom = Math.min(enemyBottom, v.y); }
      else { v.set((b.min.x + b.max.x) / 2, b.max.y, b.min.z).project(probe); playerTop = Math.max(playerTop, v.y); }
    }
    return enemyBottom === Infinity || playerTop === -Infinity || enemyBottom > playerTop - 0.02;
  };
  let pitch = pose.pitch, dist = maxDist;
  for (let attempt = 0; attempt < 14; attempt++) {
    let lo = minDist, hi = maxDist;
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      place(pitch, mid);
      if (fits()) hi = mid; else lo = mid;
    }
    dist = hi;
    place(pitch, dist);
    if (rowsClear() || pitch >= maxPitch) break;
    pitch = Math.min(maxPitch, pitch + 0.035);
  }
  return { dist, pitch };
}

/** Pointer/touch/wheel controls. Emits normalized deltas to the world. */
export function attachControls(el, { onOrbit, onPan, onZoom, onInput, isTactical }) {
  const pointers = new Map();
  let lastPinch = 0;
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener('pointerdown', (e) => {
    if (e.button > 2) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, button: e.button, shift: e.shiftKey, moved: 0 });
  });
  el.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY; p.moved += Math.abs(dx) + Math.abs(dy);
    if (p.moved > 4 && !p.captured) { try { el.setPointerCapture(e.pointerId); } catch {} p.captured = true; }
    if (p.moved <= 4 || p.claimed) return;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (lastPinch) onZoom(lastPinch / d);
      lastPinch = d;
      onPan(dx / 2, dy / 2);
    } else if (p.button === 2 || p.button === 1 || p.shift || (isTactical() && e.ctrlKey)) onPan(dx, dy);
    else onOrbit(dx, dy);
    onInput();
  });
  const end = (e) => { pointers.delete(e.pointerId); if (pointers.size < 2) lastPinch = 0; };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('wheel', (e) => { e.preventDefault(); onZoom(Math.exp(e.deltaY * 0.0012)); onInput(); }, { passive: false });
  return {
    /** A drag that started on a card or paint stroke is not a camera move. */
    claim(pointerId) { const p = pointers.get(pointerId); if (p) p.claimed = true; },
    get dragging() { return [...pointers.values()].some((p) => p.moved > 4 && !p.claimed); },
  };
}
