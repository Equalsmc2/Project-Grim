// The Project Grim world: one Three.js scene shared by the cinematic and
// tactical views. The TV stage and the GM's live preview both run this.
import * as THREE from 'three';
import { installHeightFog } from './fog.js';
import { createTerrain } from './terrain.js';
import { createSky } from './sky.js';
import { createWeather } from './weather.js';
import { buildProps, createPropMaterial } from './props.js';
import { createCard, createShatter, CARD_H, CARD_W } from './cards.js';
import { createRig, solveFraming, attachControls } from './camera.js';
import { planFormation, cellToWorld, worldToCell } from './formation.js';
import { sampleAtmosphere } from './atmosphere.js';
import { effectiveTime } from '../core/environment.js';
import { activeMap, boardPositions } from '../core/battlemap.js';
import { initiativeOrder } from '../core/rules.js';

const QUALITY = {
  low: { pixel: 1, shadow: 0, antialias: false },
  balanced: { pixel: 1.5, shadow: 1024, antialias: true },
  high: { pixel: 2, shadow: 2048, antialias: true },
};
const TACTICAL_SCALE = 0.58;

export function createWorld(container, { role = 'stage', quality = 'balanced', reducedMotion = false, onEvent = () => {} } = {}) {
  installHeightFog();
  let q = QUALITY[quality] ? quality : 'balanced';
  let reduced = reducedMotion;
  const renderer = new THREE.WebGLRenderer({ antialias: QUALITY[q].antialias, powerPreference: 'high-performance', alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = QUALITY[q].shadow > 0;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'world-canvas';
  renderer.domElement.style.touchAction = 'none';
  Object.assign(renderer.domElement.style, { width: '100%', height: '100%', display: 'block' });
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x777777, 0.01);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 2400);
  const rig = createRig(camera);

  // Lighting
  const hemi = new THREE.HemisphereLight(0xffffff, 0x333333, 1);
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.castShadow = renderer.shadowMap.enabled;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  const sunTarget = new THREE.Object3D();
  sun.target = sunTarget;
  const turnLight = new THREE.PointLight(0xffa25a, 0, 7, 1.6);
  const fireLights = [0, 1].map(() => new THREE.PointLight(0xff6a20, 0, 6, 1.8));
  scene.add(hemi, sun, sunTarget, turnLight, ...fireLights);

  const terrain = createTerrain({ quality: q });
  const sky = createSky();
  const weather = createWeather();
  const propMat = createPropMaterial();
  scene.add(terrain.group, sky.mesh, weather.group);
  let props = null;

  // Lightning bolt (thunderstorm)
  const boltMat = new THREE.LineBasicMaterial({ color: 0xe6ecff, transparent: true, opacity: 0, fog: false });
  const bolt = new THREE.Line(new THREE.BufferGeometry(), boltMat);
  bolt.frustumCulled = false;
  scene.add(bolt);

  const cards = new Map();
  const effects = [];
  let campaign = null;
  let mapRef = null;
  let worldKey = '', propsKey = '', cellsKey = '';
  let tactical = false, tacticalBlend = 0;
  let selectedId = '';
  let tool = { kind: 'select', terrain: 'wall' };
  let framing = { target: new THREE.Vector3(0, 1, 0), yaw: 0, pitch: 0.24, dist: 24 };
  let framingDirty = true;
  let formationInfo = { zBack: -8, halfW: 6 };
  let activeId = '', lastActiveId = '', spotlightUntil = 0, spotlightTarget = null;
  let flash = 0, nextFlash = 2;
  let lastPoseSent = 0, lastPoseSig = '';
  let obstacles = [];
  let disposed = false;
  let everPlaced = false;  // no entrance animations for the first load


  // ------------------------------------------------------------ sizing
  let width = 1, height = 1, pixelRatio = 1, adaptive = 1;
  function resize() {
    const r = container.getBoundingClientRect();
    width = Math.max(1, Math.round(r.width));
    height = Math.max(1, Math.round(r.height));
    pixelRatio = Math.min(window.devicePixelRatio || 1, QUALITY[q].pixel) * adaptive;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    framingDirty = true;
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  // ------------------------------------------------------------ build
  function rebuild(env, map) {
    const path = env.path ? { x: env.pathX, z: env.pathZ, angle: env.pathAngle, width: env.pathWidth } : null;
    const wk = JSON.stringify([env.seed, env.hills, map.width, map.height, path]);
    if (wk !== worldKey) {
      worldKey = wk;
      terrain.build({ seed: env.seed, hills: env.hills, mapW: map.width, mapH: map.height, path });
      propsKey = '';
      for (const c of cards.values()) c.placed = false;
    }
    const ck = map.rows.join('|');
    if (ck !== cellsKey) { cellsKey = ck; terrain.setCells(map); }
    terrain.setGround(env.ground, env);
    const pk = JSON.stringify([wk, env.props, env.density, env.ground, ck, q]);
    if (pk !== propsKey) {
      propsKey = pk;
      if (props) { scene.remove(props.group); props.dispose(); }
      props = buildProps({ env, map, heightAt: terrain.heightAt, material: propMat.material, quality: q });
      obstacles = props.obstacles.map((o) => ({ ...o, fade: 1, goal: 1 }));
      scene.add(props.group);
    }
    const shadowSize = QUALITY[q].shadow;
    if (shadowSize && sun.shadow.mapSize.x !== shadowSize) { sun.shadow.mapSize.set(shadowSize, shadowSize); sun.shadow.map?.dispose(); sun.shadow.map = null; }
    const span = Math.max(map.width, map.height) / 2 + 8;
    Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 260 });
    sun.shadow.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------ floating numbers
  function floatText(card, text, color) {
    if (reduced || card.visible < 0.5) return;
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const g = c.getContext('2d');
    g.font = '800 84px Inter, system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 10; g.strokeStyle = 'rgba(10,8,6,.85)'; g.strokeText(text, 128, 66);
    g.fillStyle = color; g.fillText(text, 128, 66);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, fog: false });
    const sp = new THREE.Sprite(mat);
    sp.renderOrder = 20;
    const s = card.scale;
    const start = card.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6 * s, (CARD_H + 0.5) * s, 0));
    sp.position.copy(start);
    sp.scale.set(1.6 * s, 0.8 * s, 1);
    scene.add(sp);
    let t = 0;
    effects.push({ tick(dt) {
      t += dt;
      const p = t / 1.6;
      sp.position.y = start.y + p * 1.1 * s;
      const pop = p < 0.12 ? 0.6 + (p / 0.12) * 0.6 : 1.2 - Math.min(0.2, (p - 0.12));
      sp.scale.set(1.6 * s * pop, 0.8 * s * pop, 1);
      mat.opacity = p < 0.7 ? 1 : Math.max(0, 1 - (p - 0.7) / 0.3);
      if (p >= 1) { scene.remove(sp); tex.dispose(); mat.dispose(); return false; }
      return true;
    } });
  }

  // ------------------------------------------------------------ cards
  function updateCards() {
    const c = campaign;
    const combat = c.meta.mode === 'combat';
    const showCards = combat || c.presentation.showSceneCards;
    const gm = role === 'gm';
    const all = initiativeOrder(c.characters);
    const ordered = combat ? all : c.characters;
    const visible = ordered.filter((x) => !x.hidden);
    const players = visible.filter((x) => x.faction !== 'enemy');
    const enemies = visible.filter((x) => x.faction === 'enemy');
    const formation = planFormation({ players, enemies, mapW: mapRef.width, mapH: mapRef.height, cardScale: c.presentation.cardScale });
    const board = boardPositions(mapRef, c.characters);
    const rank = new Map(visible.map((x, i) => [x.id, i + 1]));
    activeId = combat ? c.combat.activeId : '';
    const seen = new Set();
    let minZ = 0, maxX = 0;
    for (const ch of c.characters) {
      const show = showCards && (!ch.hidden || (gm && tactical));
      if (!show && !cards.has(ch.id)) continue;
      seen.add(ch.id);
      let card = cards.get(ch.id);
      if (!card) {
        card = createCard(ch.id);
        cards.set(ch.id, card);
        scene.add(card.root);
        card.visible = 0;
      }
      const data = {
        name: ch.name, ancestry: ch.ancestry, className: ch.className, level: ch.level, hp: ch.hp, maxHp: ch.maxHp, tempHp: ch.tempHp,
        ac: ch.ac, initiative: ch.initiative, perception: ch.perception, faction: ch.faction, conditions: ch.conditions, symbol: ch.symbol,
        rank: rank.get(ch.id) || 0, active: ch.id === activeId, combat,
      };
      const prevRatio = card.hpRatio, prevDown = card.down, wasPlaced = card.placed;
      const prev = card.last;
      card.paint(data, c.portraits[ch.id], () => updateCards());
      card.setFx(data);
      const shownNow = show && !ch.hidden;
      if (prev && wasPlaced) {
        // Event animations, driven purely by what changed in the shared state.
        const hpDrop = prev.hp - ch.hp + Math.max(0, prev.tempHp - ch.tempHp);
        const addedConds = ch.conditions.filter((x) => !prev.conditions.includes(x));
        if (!prevDown && card.down) { if (!reduced) effects.push(createShatter(scene, card)); card.play('crit'); }
        else if (prevDown && !card.down) card.play('revive');
        else if (hpDrop > 0) card.play(hpDrop >= ch.maxHp * 0.3 ? 'crit' : 'hit', { fraction: hpDrop / Math.max(1, ch.maxHp) });
        else if (ch.hp > prev.hp) card.play('heal');
        else if (ch.tempHp > prev.tempHp) card.play('shield');
        if (hpDrop > 0) floatText(card, `-${hpDrop}`, '#ff6a4d');
        else if (ch.hp > prev.hp) floatText(card, `+${ch.hp - prev.hp}`, '#9be38a');
        if (ch.tempHp > prev.tempHp) floatText(card, `+${ch.tempHp - prev.tempHp}`, '#7fd6cf');
        if (!prevDown && card.down) floatText(card, ch.faction === 'enemy' ? 'Defeated' : 'Down', '#e0c39a');
        if (addedConds.length && hpDrop <= 0) {
          const fx = addedConds.map((x) => x.toLowerCase()).join(' ');
          card.play('condition', { color: /burn|fire|flame/.test(fx) ? 0xff7a2a : /frozen|frost|ice|cold/.test(fx) ? 0x9cd0ff : /dying|wounded|doomed/.test(fx) ? 0xb4412f : 0xece4d4 });
        }
        if (data.active && !prev.active) card.play('turn');
        if (prev.hidden && !ch.hidden) card.play('reveal');
        if (!prev.shown && shownNow) card.play('enter');
      } else if (!prev && campaign && card.visible === 0 && shownNow && cards.size > 1 && everPlaced) card.play('enter');
      card.last = { hp: ch.hp, tempHp: ch.tempHp, conditions: [...ch.conditions], active: data.active, hidden: ch.hidden, shown: shownNow };
      let x, z, scale;
      if (tactical) {
        const p = board.get(ch.id);
        const w = p ? cellToWorld(p.x, p.y, mapRef.width, mapRef.height) : { x: 0, z: 0 };
        x = w.x; z = w.z; scale = TACTICAL_SCALE;
      } else {
        const f = formation.get(ch.id);
        if (f) { x = f.x; z = f.z; scale = f.scale; minZ = Math.min(minZ, z); maxX = Math.max(maxX, Math.abs(x)); }
        else { x = card.goal.x; z = card.goal.z; scale = card.goalScale; }
      }
      card.goal.set(x, terrain.heightAt(x, z), z);
      card.goalScale = scale;
      card.goalVisible = show && (tactical || formation.has(ch.id)) ? 1 : 0;
      card.goalActive = data.active ? 1 : 0;
      card.goalGhost = ch.hidden ? 1 : 0;
      card.goalSelected = gm && ch.id === selectedId ? 1 : 0;
      card.goalFall = card.down ? (ch.faction === 'enemy' ? 1.38 : 0.42) : 0;
      if (!card.placed) { card.pos.copy(card.goal); card.scale = scale; }
    }
    for (const [id, card] of cards) {
      if (!seen.has(id) || !c.characters.some((x) => x.id === id)) {
        card.goalVisible = 0;
        if (!c.characters.some((x) => x.id === id)) card.removeAt = performance.now() + 900;
      }
    }
    formationInfo = { zBack: minZ, halfW: maxX + CARD_W };
    if (activeId !== lastActiveId) {
      if (lastActiveId && activeId && !tactical && campaign.environment.cinematicPan && !reduced) spotlightUntil = performance.now() + 2800;
      lastActiveId = activeId;
    }
    updateObstacleGoals();
    framingDirty = true;
  }

  function updateObstacleGoals() {
    for (const o of obstacles) {
      let goal = 1;
      if (!tactical && o.tall) {
        // Sink tall scenery that would stand between the camera and the cards.
        if (Math.abs(o.x) < formationInfo.halfW + 1.5 && o.z > formationInfo.zBack - 1.5) goal = 0;
      }
      if (!tactical) for (const card of cards.values()) if (card.goalVisible && Math.hypot(card.goal.x - o.x, card.goal.z - o.z) < 1.4) goal = 0;
      o.goal = goal;
    }
  }

  function tickObstacles(dt) {
    const m4 = new THREE.Matrix4(), s = new THREE.Vector3(), p = new THREE.Vector3(), qq = new THREE.Quaternion();
    const dirty = new Set();
    for (const o of obstacles) {
      if (!o.mesh || Math.abs(o.fade - o.goal) < 0.001) continue;
      o.fade += (o.goal - o.fade) * (1 - Math.exp(-dt * 5));
      if (Math.abs(o.fade - o.goal) < 0.002) o.fade = o.goal;
      o.mesh.userData.base[o.index].decompose(p, qq, s);
      s.multiplyScalar(Math.max(0.0001, o.fade));
      p.y -= (1 - o.fade) * 0.4;
      m4.compose(p, qq, s);
      o.mesh.setMatrixAt(o.index, m4);
      dirty.add(o.mesh);
    }
    for (const m of dirty) m.instanceMatrix.needsUpdate = true;
  }

  // ------------------------------------------------------------ framing
  function computeFraming() {
    framingDirty = false;
    const boxes = [];
    for (const card of cards.values()) {
      if (card.goalVisible < 0.5) continue;
      const s = card.goalScale;
      boxes.push({
        min: new THREE.Vector3(card.goal.x - (CARD_W / 2) * s, card.goal.y, card.goal.z - 0.3),
        max: new THREE.Vector3(card.goal.x + (CARD_W / 2) * s, card.goal.y + (CARD_H + 0.15) * s, card.goal.z + 0.3),
        side: campaign.characters.find((c) => c.id === card.id)?.faction === 'enemy' ? 'enemy' : 'player',
      });
    }
    if (tactical) {
      const hw = mapRef.width / 2, hh = mapRef.height / 2;
      const t = new THREE.Vector3(0, 0, 0.6);
      const sol = solveFraming(camera, { target: t, yaw: 0, pitch: 0.98 }, [{ min: new THREE.Vector3(-hw, 0, -hh), max: new THREE.Vector3(hw, 0.6, hh), side: 'map' }], { safe: { x: 0.92, top: 0.86, bottom: -0.86 }, maxPitch: 0.98 });
      framing = { target: t, yaw: 0, pitch: 0.98, dist: sol.dist };
    } else if (boxes.length) {
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, maxY = 0;
      for (const b of boxes) { minX = Math.min(minX, b.min.x); maxX = Math.max(maxX, b.max.x); minZ = Math.min(minZ, b.min.z); maxZ = Math.max(maxZ, b.max.z); maxY = Math.max(maxY, b.max.y); }
      const target = new THREE.Vector3((minX + maxX) / 2, maxY * 0.42, (minZ + maxZ) / 2 + 0.6);
      const bottom = campaign.meta.mode === 'combat' ? -0.68 : -0.75;
      const sol = solveFraming(camera, { target, yaw: 0, pitch: 0.2 }, boxes, { safe: { x: 0.9, top: 0.74, bottom } });
      framing = { target, yaw: 0, pitch: sol.pitch, dist: sol.dist };
    } else {
      framing = { target: new THREE.Vector3(0, 1.4, -2), yaw: 0, pitch: 0.16, dist: Math.max(18, mapRef.width * 0.75) };
    }
  }

  function directorGoal(time, dt) {
    const env = campaign.environment;
    const g = rig.goal;
    g.target.copy(framing.target);
    g.yaw = framing.yaw;
    g.pitch = framing.pitch;
    g.dist = framing.dist;
    const sinceInput = (performance.now() - rig.user.lastInput) / 1000;

    if (tactical) {
      const pose = campaign.camera?.pose;
      if (role === 'stage' && campaign.stage.followGm && pose && Date.now() - campaign.camera.at < 6 * 3600e3 && sinceInput > 4) {
        g.target.set(pose.x, pose.y, pose.z); g.yaw = pose.yaw; g.pitch = pose.pitch; g.dist = pose.dist;
        return;
      }
      g.target.add(rig.user.pan);
      g.yaw += rig.user.yaw;
      g.pitch = THREE.MathUtils.clamp(g.pitch + rig.user.pitch, 0.32, 1.48);
      g.dist *= rig.user.zoom;
      const hw = mapRef.width / 2 + 2, hh = mapRef.height / 2 + 2;
      g.target.x = THREE.MathUtils.clamp(g.target.x, -hw, hw);
      g.target.z = THREE.MathUtils.clamp(g.target.z, -hh, hh);
      return;
    }

    // Cinematic: the director layer.
    const strength = env.cinematicStrength / 1.5;
    const speed = env.cinematicSpeed;
    if (env.cinematicPan && !reduced) {
      const t = time * speed;
      const active = cards.get(activeId);
      if (env.cinematicStyle === 'follow' && active && campaign.meta.mode === 'combat') {
        g.target.x += (active.goal.x - g.target.x) * 0.3 * strength;
        g.yaw += THREE.MathUtils.clamp(active.goal.x * 0.018 * strength, -0.22, 0.22) + Math.sin(t * 0.11) * 0.04 * strength;
        g.dist *= 0.97;
      } else if (env.cinematicStyle === 'sweep') {
        g.target.x += Math.sin(t * 0.06) * formationInfo.halfW * 0.25 * strength;
        g.yaw += -Math.sin(t * 0.06) * 0.12 * strength;
        g.dist *= 1 + Math.sin(t * 0.045) * 0.05;
      } else {
        g.yaw += Math.sin(t * 0.07) * 0.24 * strength;
        g.pitch += Math.sin(t * 0.05) * 0.03 * strength;
      }
      // Turn spotlight: a brief push-in toward whoever's turn it now is.
      const now = performance.now();
      if (now < spotlightUntil && active) {
        const left = (spotlightUntil - now) / 2800;
        const w = Math.sin(Math.min(1, (1 - left) * 2.2) * Math.PI * 0.5) * Math.min(1, left * 3);
        g.target.lerp(new THREE.Vector3(active.goal.x, active.goal.y + CARD_H * active.goalScale * 0.5, active.goal.z), 0.55 * w);
        g.dist *= 1 - 0.38 * w;
        g.yaw += THREE.MathUtils.clamp(active.goal.x * 0.02, -0.18, 0.18) * w;
      }
    }
    // User offsets: gentle in cinematic, decaying back when idle.
    if (sinceInput > 7 && env.cinematicPan) {
      const k = 1 - Math.exp(-dt * 0.8);
      rig.user.yaw *= 1 - k; rig.user.pitch *= 1 - k; rig.user.zoom += (1 - rig.user.zoom) * k; rig.user.pan.multiplyScalar(1 - k);
    }
    g.yaw += rig.user.yaw;
    g.pitch = THREE.MathUtils.clamp(g.pitch + rig.user.pitch, 0.04, 0.8);
    g.dist *= rig.user.zoom;
    g.target.add(rig.user.pan);
    if (!reduced) {
      g.target.y += Math.sin(time * 0.31) * 0.025;
      g.yaw += Math.sin(time * 0.23) * 0.004;
    }
  }

  // ------------------------------------------------------------ atmosphere
  function updateAtmosphere(time, dt) {
    const env = campaign.environment;
    const storm = env.weather === 'thunderstorm' ? 1 : 0;
    const tint = env.weather === 'sandstorm' ? 0x9c7c58 : env.weather === 'blizzard' ? 0xc2cad6 : null;
    const hour = effectiveTime(env);
    const a = sampleAtmosphere(hour, { cloud: env.cloudCover, fog: env.fog, storm, tint });
    if (storm) {
      nextFlash -= dt;
      if (nextFlash <= 0) {
        flash = 1;
        nextFlash = 4 + Math.random() * 9;
        const pts = [];
        let x = (Math.random() - 0.5) * 160, y = 70, z = -90 - Math.random() * 60;
        while (y > 0) { pts.push(new THREE.Vector3(x, y, z)); x += (Math.random() - 0.5) * 7; y -= 4 + Math.random() * 5; z += (Math.random() - 0.5) * 3; }
        bolt.geometry.dispose();
        bolt.geometry = new THREE.BufferGeometry().setFromPoints(pts);
      }
    }
    flash = Math.max(0, flash - dt * 3.2);
    const fl = flash * (0.6 + 0.4 * Math.sin(time * 60));
    boltMat.opacity = flash > 0.55 ? 1 : 0;

    sky.uniforms.uZenith.value.copy(a.zenith);
    sky.uniforms.uHorizon.value.copy(a.horizon);
    sky.uniforms.uFog.value.copy(a.fog);
    sky.uniforms.uSunDir.value.copy(a.sunDir);
    sky.uniforms.uMoonDir.value.copy(a.moonDir);
    sky.uniforms.uSunCol.value.copy(a.sun);
    sky.uniforms.uNight.value = a.night;
    sky.uniforms.uCloud.value = Math.min(1, env.cloudCover + storm * 0.4);
    sky.uniforms.uTime.value = time;
    sky.uniforms.uFlash.value = fl * 0.6;
    sky.uniforms.uHaze.value = Math.min(1, env.fog * 0.8 + (tint ? 0.6 : 0));
    const wa = (env.windAngle * Math.PI) / 180;
    sky.uniforms.uWind.value.set(Math.cos(wa), Math.sin(wa)).multiplyScalar(0.5 + env.windSpeed);

    let density = 0.0045 + env.fog * 0.032 + (env.weather === 'blizzard' ? 0.022 : 0) + (env.weather === 'sandstorm' ? 0.026 : 0) + (env.weather === 'thunderstorm' ? 0.006 : 0) + (env.weather === 'rain' ? 0.004 : 0);
    density *= 1 - tacticalBlend * 0.45;
    scene.fog.color.copy(a.fog);
    scene.fog.density = density;
    renderer.setClearColor(a.fog);

    hemi.color.copy(a.hemiSky);
    hemi.groundColor.copy(a.hemiGround);
    hemi.intensity = a.hemiI * (1 + fl * 2.5);
    sun.color.copy(a.night > 0.5 ? new THREE.Color(0x9fb4e0) : a.sun);
    sun.intensity = a.sunI * (1 + fl * 1.5);
    sun.position.copy(a.lightDir).multiplyScalar(120);
    sunTarget.position.set(0, 0, 0);
    renderer.toneMappingExposure = a.exposure;

    const wet = env.weather === 'rain' ? 0.45 + env.intensity * 0.45 : storm ? 0.75 + env.intensity * 0.25 : 0;
    const wetness = Math.min(1, wet + (env.weather === 'rain' || storm ? env.accumulation * 0.3 : 0));
    const snow = env.ground === 'snow' ? 0.65 : 0;
    const snowAcc = Math.min(1, snow + (['snow', 'blizzard'].includes(env.weather) ? env.accumulation * 0.9 + env.intensity * 0.2 : env.accumulation * 0.25 * (env.ground === 'snow' ? 1 : 0)));
    terrain.uniforms.uWet.value = wetness;
    terrain.uniforms.uSnow.value = ['snow', 'blizzard'].includes(env.weather) ? env.accumulation * 0.9 : 0;
    terrain.uniforms.uTime.value = time;
    propMat.uniforms.uSnow.value = snowAcc;
    propMat.uniforms.uWet.value = wetness;
    propMat.uniforms.uTime.value = reduced ? 0 : time;
    propMat.uniforms.uWind.value.set(Math.cos(wa), Math.sin(wa)).multiplyScalar(0.4 + env.windSpeed * (env.weather === 'blizzard' || env.weather === 'sandstorm' || storm ? 1.6 : 1));
    weather.set({ weather: env.weather, intensity: env.intensity, windAngle: env.windAngle, windSpeed: env.windSpeed, quality: q });
    const light = 0.35 + (1 - a.night) * 0.65 + fl;
    weather.update(reduced ? time * 0.25 : time, rig.cur.target, light, pixelRatio, density);
    return a;
  }

  // ------------------------------------------------------------ interaction (GM)
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hoverCell = null, dragCard = null, paintStroke = null;
  function pick(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const targets = [];
    for (const c of cards.values()) if (c.root.visible) targets.push(c.root);
    const hitCard = ray.intersectObjects(targets, true).find((h) => h.object.userData.cardId);
    const hitGround = terrain.mesh ? ray.intersectObject(terrain.mesh, false)[0] : null;
    const cell = hitGround ? worldToCell(hitGround.point.x, hitGround.point.z, mapRef.width, mapRef.height) : null;
    const inMap = cell && cell.x >= 0 && cell.y >= 0 && cell.x < mapRef.width && cell.y < mapRef.height;
    return { cardId: hitCard?.object.userData.cardId || '', cell: inMap ? cell : null, point: hitGround?.point || null };
  }
  const controls = attachControls(renderer.domElement, {
    onOrbit(dx, dy) {
      const k = tactical ? 0.006 : 0.0035;
      rig.user.yaw -= dx * k;
      rig.user.pitch += dy * k * 0.8;
      if (!tactical) { rig.user.yaw = THREE.MathUtils.clamp(rig.user.yaw, -0.7, 0.7); rig.user.pitch = THREE.MathUtils.clamp(rig.user.pitch, -0.15, 0.45); }
    },
    onPan(dx, dy) {
      const s = rig.cur.dist * 0.0016;
      const right = new THREE.Vector3(Math.cos(rig.cur.yaw), 0, -Math.sin(rig.cur.yaw));
      const fwd = new THREE.Vector3(-Math.sin(rig.cur.yaw), 0, -Math.cos(rig.cur.yaw));
      rig.user.pan.addScaledVector(right, -dx * s).addScaledVector(fwd, dy * s);
      if (!tactical) rig.user.pan.clampLength(0, 6);
    },
    onZoom(f) { rig.user.zoom = THREE.MathUtils.clamp(rig.user.zoom * f, tactical ? 0.25 : 0.55, tactical ? 2.2 : 1.6); },
    onInput() { rig.user.lastInput = performance.now(); },
    isTactical: () => tactical,
  });

  if (role === 'gm') {
    const el = renderer.domElement;
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || !campaign) return;
      const hit = pick(e);
      if (tactical && tool.kind === 'paint' && hit.cell) {
        controls.claim(e.pointerId);
        paintStroke = { id: `s${Date.now()}`, cells: new Set([`${hit.cell.x}:${hit.cell.y}`]) };
        onEvent({ type: 'paint', cells: [[hit.cell.x, hit.cell.y]], terrain: tool.terrain, stroke: paintStroke.id });
        return;
      }
      if (hit.cardId) {
        if (tactical) { controls.claim(e.pointerId); dragCard = { id: hit.cardId, cell: null, startX: e.clientX, startY: e.clientY }; }
        e.__grimCard = hit.cardId;
      }
      el.__down = { x: e.clientX, y: e.clientY, hit };
    });
    el.addEventListener('pointermove', (e) => {
      if (!campaign) return;
      const hit = pick(e);
      hoverCell = tactical ? hit.cell : null;
      if (paintStroke && hit.cell) {
        const k = `${hit.cell.x}:${hit.cell.y}`;
        if (!paintStroke.cells.has(k)) { paintStroke.cells.add(k); onEvent({ type: 'paint', cells: [[hit.cell.x, hit.cell.y]], terrain: tool.terrain, stroke: paintStroke.id }); }
      }
      if (dragCard && hit.cell) dragCard.cell = hit.cell;
      el.style.cursor = hit.cardId ? 'pointer' : tactical && tool.kind === 'paint' ? 'crosshair' : 'grab';
    });
    el.addEventListener('pointerup', (e) => {
      const down = el.__down;
      el.__down = null;
      if (paintStroke) { paintStroke = null; return; }
      if (dragCard) {
        const moved = Math.hypot(e.clientX - dragCard.startX, e.clientY - dragCard.startY) > 6;
        if (moved && dragCard.cell) onEvent({ type: 'move', id: dragCard.id, x: dragCard.cell.x, y: dragCard.cell.y });
        else onEvent({ type: 'select', id: dragCard.id });
        dragCard = null;
        return;
      }
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
      if (down.hit.cardId) onEvent({ type: 'select', id: down.hit.cardId });
      else if (down.hit.cell) onEvent({ type: 'cell', x: down.hit.cell.x, y: down.hit.cell.y });
      else onEvent({ type: 'select', id: '' });
    });
    el.addEventListener('pointerleave', () => { hoverCell = null; });
  }

  // ------------------------------------------------------------ loop
  const clock = new THREE.Clock();
  let raf = 0, frameTimes = [], lastAdapt = 0, frames = 0, fpsAt = performance.now(), fps = 0;
  const camPos = new THREE.Vector3();
  function frame() {
    raf = requestAnimationFrame(frame);
    if (disposed || !campaign || document.hidden || width < 2) return;
    const dt = Math.min(0.05, clock.getDelta());
    const time = clock.elapsedTime;
    const now = performance.now();

    tacticalBlend += ((tactical ? 1 : 0) - tacticalBlend) * (1 - Math.exp(-dt * 3));
    terrain.uniforms.uGrid.value = tacticalBlend;
    terrain.uniforms.uFocus.value = tacticalBlend;
    const hc = hoverCell || (dragCard?.cell ?? null);
    terrain.uniforms.uHover.value.set(hc ? hc.x : -1, hc ? hc.y : -1, hc ? 1 : 0);
    const sel = selectedId && tactical ? boardPositions(mapRef, campaign.characters).get(selectedId) : null;
    terrain.uniforms.uSelect.value.set(sel ? sel.x : -1, sel ? sel.y : -1, sel ? 1 : 0);

    if (framingDirty) computeFraming();
    directorGoal(time, dt);
    rig.step(dt, now);
    rig.apply(terrain.heightAt);
    sky.mesh.position.copy(camera.position);

    updateAtmosphere(time, dt);
    tickObstacles(dt);

    // Cards: billboard, lean in tactical, fall when down.
    camera.getWorldPosition(camPos);
    let fireIdx = 0;
    const active = cards.get(activeId);
    for (const [id, card] of cards) {
      card.tick(dt, time, reduced);
      card.spin.rotation.y = Math.atan2(camPos.x - card.pos.x, camPos.z - card.pos.z);
      const elev = Math.atan2(camPos.y - card.pos.y, Math.hypot(camPos.x - card.pos.x, camPos.z - card.pos.z));
      card.pivot.rotation.x = -elev * 0.85 * tacticalBlend - card.fall;
      if (card.burning && fireIdx < fireLights.length && q !== 'low' && card.visible > 0.5) {
        const L = fireLights[fireIdx++];
        L.position.set(card.pos.x, card.pos.y + 0.8 * card.scale, card.pos.z + 0.4);
        L.intensity = (reduced ? 3 : 2.4 + Math.sin(time * 13 + fireIdx) * 0.8 + Math.sin(time * 7.3) * 0.5) * card.scale;
        L.distance = 6 * card.scale;
      }
      if (card.removeAt && now > card.removeAt) { scene.remove(card.root); card.dispose(); cards.delete(id); }
    }
    for (let i = fireIdx; i < fireLights.length; i++) fireLights[i].intensity = 0;
    if (active && active.visible > 0.5) {
      turnLight.position.set(active.pos.x, active.pos.y + 1.2 * active.scale, active.pos.z + 1.2 * active.scale);
      turnLight.intensity = 3.2 * active.active * active.scale;
      turnLight.distance = 8 * active.scale;
    } else turnLight.intensity = 0;
    for (let i = effects.length - 1; i >= 0; i--) if (!effects[i].tick(dt)) effects.splice(i, 1);

    renderer.render(scene, camera);

    // GM tactical camera → TV (throttled)
    if (role === 'gm' && tactical && now - lastPoseSent > 250) {
      const p = rig.pose();
      const sig = [p.x, p.y, p.z, p.yaw, p.pitch, p.dist].map((n) => n.toFixed(2)).join();
      if (sig !== lastPoseSig && now - rig.user.lastInput < 1500) { lastPoseSig = sig; lastPoseSent = now; onEvent({ type: 'pose', pose: p }); }
    }

    // Adaptive resolution: protect frame rate during heavy weather.
    frames++;
    frameTimes.push(dt);
    if (frameTimes.length > 90) frameTimes.shift();
    if (now - fpsAt > 1000) { fps = (frames * 1000) / (now - fpsAt); frames = 0; fpsAt = now; }
    if (now - lastAdapt > 2500 && frameTimes.length >= 60) {
      const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      if (avg > 1 / 40 && adaptive > 0.6) { adaptive = Math.max(0.6, adaptive - 0.1); resize(); lastAdapt = now; }
      else if (avg < 1 / 58 && adaptive < 1) { adaptive = Math.min(1, adaptive + 0.05); resize(); lastAdapt = now; }
    }
  }
  raf = requestAnimationFrame(frame);

  renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onEvent({ type: 'status', text: 'Graphics context lost — recovering…' }); });
  renderer.domElement.addEventListener('webglcontextrestored', () => { worldKey = ''; propsKey = ''; cellsKey = ''; if (campaign) api.setCampaign(campaign); onEvent({ type: 'status', text: '' }); });

  const api = {
    setCampaign(c) {
      const first = !campaign;
      campaign = c;
      mapRef = activeMap(c);
      const wasTactical = tactical;
      tactical = c.meta.mode === 'combat' && c.stage.view === 'tactical';
      if (wasTactical !== tactical) {
        rig.transition(performance.now(), 1800);
        rig.user.yaw = 0; rig.user.pitch = 0; rig.user.zoom = 1; rig.user.pan.set(0, 0, 0);
      }
      rebuild(c.environment, mapRef);
      updateCards();
      if (first) { computeFraming(); directorGoal(0, 0); rig.snap(); }
      everPlaced = true;
    },
    setQuality(next) {
      if (!QUALITY[next] || next === q) return;
      q = next;
      renderer.shadowMap.enabled = QUALITY[q].shadow > 0;
      sun.castShadow = renderer.shadowMap.enabled;
      propsKey = '';
      if (campaign) rebuild(campaign.environment, mapRef);
      scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
      adaptive = 1;
      resize();
    },
    setReducedMotion(v) { reduced = !!v; },
    setTool(t) { tool = { ...tool, ...t }; },
    setSelected(id) { selectedId = id || ''; if (campaign) updateCards(); },
    resetCamera() { rig.user.yaw = 0; rig.user.pitch = 0; rig.user.zoom = 1; rig.user.pan.set(0, 0, 0); rig.user.lastInput = -1e9; rig.transition(performance.now(), 900); },
    getPose: () => rig.pose(),
    stats: () => ({ fps: Math.round(fps), pixelRatio: +pixelRatio.toFixed(2), calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, cards: cards.size, tactical, quality: q }),
    /** Screen rectangles of visible cards (for tests and HUD layout). */
    cardRects() {
      const out = [];
      const v = new THREE.Vector3();
      for (const [id, card] of cards) {
        if (card.visible < 0.5) continue;
        const s = card.scale;
        const pts = [[-CARD_W / 2, 0.1], [CARD_W / 2, 0.1], [-CARD_W / 2, CARD_H + 0.1], [CARD_W / 2, CARD_H + 0.1]].map(([x, y]) => { v.set(x * s, y * s, 0); card.pivot.localToWorld(v); return v.clone().project(camera); });
        const xs = pts.map((p) => ((p.x + 1) / 2) * width), ys = pts.map((p) => ((1 - p.y) / 2) * height);
        out.push({ id, left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) });
      }
      return out;
    },
    get renderer() { return renderer; },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      for (const c of cards.values()) c.dispose();
      props?.dispose();
      terrain.dispose(); sky.dispose(); weather.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
  return api;
}
