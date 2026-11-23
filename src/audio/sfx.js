// Synthesised sound effects (Web Audio). Nothing is downloaded: every sound is
// built from oscillators, filtered noise and a generated reverb, tuned for a
// heavy, dark-fantasy feel — low bells, dull impacts, glassy shatters.
export function createSfx() {
  let ctx = null, master = null, verb = null, noiseBuf = null, volume = 0.7;
  function init() {
    if (ctx) return true;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp).connect(ctx.destination);
    // Generated cathedral-ish reverb: decaying stereo noise.
    const len = ctx.sampleRate * 3.2;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    verb = ctx.createConvolver();
    verb.buffer = ir;
    const verbGain = ctx.createGain(); verbGain.gain.value = 0.55;
    verb.connect(verbGain).connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const n = noiseBuf.getChannelData(0);
    for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;
    return true;
  }
  const now = () => ctx.currentTime;
  function out(dry = 1, wet = 0.3) {
    const g = ctx.createGain();
    const d = ctx.createGain(); d.gain.value = dry;
    const w = ctx.createGain(); w.gain.value = wet;
    g.connect(d).connect(master); g.connect(w).connect(verb);
    return g;
  }
  function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  function tone(freq, { type = 'sine', t = now(), a = 0.005, peak = 0.3, dec = 1, dest, glide = null, detune = 0 }) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + a + dec * 0.6);
    env(g, t, a, peak, dec);
    o.connect(g).connect(dest); o.start(t); o.stop(t + a + dec + 0.05);
  }
  function noise({ t = now(), a = 0.002, peak = 0.4, dec = 0.3, type = 'lowpass', freq = 1200, q = 0.7, sweep = null, dest }) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + a + dec);
    const g = ctx.createGain(); env(g, t, a, peak, dec);
    s.connect(f).connect(g).connect(dest); s.start(t, Math.random()); s.stop(t + a + dec + 0.05);
  }
  /** Inharmonic bell: the low toll heard at the turn of a round. */
  function bell(base, { t = now(), peak = 0.22, dec = 4, dest }) {
    for (const [ratio, amp, d] of [[0.5, 1, 1.2], [1, 0.8, 1], [1.183, 0.5, 0.8], [1.506, 0.45, 0.6], [2, 0.35, 0.5], [2.74, 0.2, 0.35], [3.76, 0.12, 0.25]]) tone(base * ratio, { t, a: 0.004, peak: peak * amp, dec: dec * d, dest, detune: (Math.random() - 0.5) * 6 });
  }
  const S = {
    hit(sev = 0.3) {
      const t = now(), o = out(1, 0.25);
      tone(110 - sev * 40, { type: 'sine', t, peak: 0.5 + sev * 0.4, dec: 0.35 + sev * 0.3, glide: 45, dest: o });
      noise({ t, peak: 0.35 + sev * 0.3, dec: 0.12 + sev * 0.15, freq: 2400, sweep: 300, dest: o });
      noise({ t: t + 0.01, peak: 0.12, dec: 0.08, type: 'bandpass', freq: 3800, q: 3, dest: o });
    },
    crit() {
      const t = now(), o = out(1, 0.5);
      tone(70, { type: 'sine', t, peak: 0.9, dec: 0.9, glide: 32, dest: o });
      tone(140, { type: 'triangle', t, peak: 0.25, dec: 0.4, glide: 60, dest: o });
      noise({ t, peak: 0.7, dec: 0.35, freq: 3000, sweep: 180, dest: o });
      noise({ t: t + 0.02, peak: 0.25, dec: 0.5, type: 'bandpass', freq: 900, q: 1.5, dest: o });
    },
    heal() {
      const t = now(), o = out(0.7, 0.8);
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, { t: t + i * 0.07, a: 0.02, peak: 0.09, dec: 1.6, dest: o }));
      noise({ t, a: 0.3, peak: 0.05, dec: 1, type: 'highpass', freq: 5000, dest: o });
    },
    shield() {
      const t = now(), o = out(0.8, 0.6);
      tone(392, { type: 'triangle', t, a: 0.01, peak: 0.12, dec: 0.9, dest: o });
      tone(587.3, { type: 'sine', t: t + 0.05, a: 0.01, peak: 0.1, dec: 1.1, dest: o });
      noise({ t, a: 0.08, peak: 0.06, dec: 0.5, type: 'bandpass', freq: 2500, q: 4, sweep: 6000, dest: o });
    },
    condition(kind = '') {
      const t = now(), o = out(0.8, 0.5);
      if (/burn|fire|flame/i.test(kind)) { noise({ t, a: 0.05, peak: 0.4, dec: 0.9, freq: 400, sweep: 2600, dest: o }); noise({ t: t + 0.1, a: 0.2, peak: 0.12, dec: 1.2, type: 'highpass', freq: 3000, dest: o }); }
      else if (/frozen|frost|ice|cold/i.test(kind)) { [1760, 2093, 2637].forEach((f, i) => tone(f, { t: t + i * 0.05, peak: 0.05, dec: 0.9, dest: o })); noise({ t, a: 0.02, peak: 0.12, dec: 0.6, type: 'highpass', freq: 6000, dest: o }); }
      else { noise({ t, a: 0.12, peak: 0.25, dec: 0.45, type: 'bandpass', freq: 600, q: 1.2, sweep: 2200, dest: o }); tone(196, { t, a: 0.05, peak: 0.08, dec: 0.8, type: 'triangle', glide: 147, dest: o }); }
    },
    turn(enemy = false) {
      const o = out(0.8, 0.8);
      bell(enemy ? 98 : 130.8, { peak: enemy ? 0.16 : 0.13, dec: enemy ? 3.5 : 2.6, dest: o });
    },
    round() { const o = out(0.7, 1); bell(73.4, { peak: 0.2, dec: 5.5, dest: o }); },
    death(enemy = true) {
      const t = now(), o = out(1, 0.9);
      // Glass breaking + a long low fall.
      for (let i = 0; i < 9; i++) noise({ t: t + Math.random() * 0.18, peak: 0.12 + Math.random() * 0.1, dec: 0.05 + Math.random() * 0.12, type: 'bandpass', freq: 2500 + Math.random() * 5000, q: 6, dest: o });
      tone(enemy ? 55 : 41, { type: 'sine', t, a: 0.01, peak: 0.8, dec: enemy ? 1.6 : 3, glide: 26, dest: o });
      if (!enemy) bell(55, { t: t + 0.35, peak: 0.18, dec: 6, dest: o });
    },
    revive() {
      const t = now(), o = out(0.6, 1);
      [261.6, 392, 523.25, 784].forEach((f, i) => tone(f, { t: t + i * 0.11, a: 0.05, peak: 0.08, dec: 2.2, dest: o }));
    },
    banner(kind = 'start') {
      // A swelling drone with a dull boom: the moment before a fight.
      const t = now(), o = out(0.9, 1);
      if (kind === 'victory') { [196, 246.9, 293.7, 392].forEach((f, i) => tone(f, { t: t + i * 0.04, a: 0.4, peak: 0.09, dec: 3.5, type: 'triangle', dest: o })); bell(98, { t, peak: 0.1, dec: 5, dest: o }); return; }
      noise({ t, a: 1.1, peak: 0.25, dec: 0.4, freq: 200, sweep: 3000, dest: o });
      tone(49, { t: t + 1.15, a: 0.01, peak: 0.9, dec: 2.4, glide: 30, dest: o });
      tone(98, { t: t + 1.15, a: 0.01, peak: 0.2, dec: 2, type: 'triangle', dest: o });
      noise({ t: t + 1.15, peak: 0.5, dec: 0.5, freq: 1500, sweep: 120, dest: o });
    },
    reveal() { const t = now(), o = out(0.7, 0.8); noise({ t, a: 0.4, peak: 0.18, dec: 0.6, type: 'bandpass', freq: 300, q: 1, sweep: 1800, dest: o }); tone(146.8, { t: t + 0.3, a: 0.05, peak: 0.1, dec: 1.5, type: 'triangle', dest: o }); },
    page() { const t = now(), o = out(0.8, 0.4); noise({ t, a: 0.05, peak: 0.18, dec: 0.35, type: 'bandpass', freq: 1800, q: 0.8, sweep: 700, dest: o }); },
  };
  return {
    /** Must be called from a click/tap (browser autoplay rules). */
    unlock() { if (init()) ctx.resume?.(); return !!ctx; },
    get ready() { return !!ctx && ctx.state === 'running'; },
    setVolume(v) { volume = Math.max(0, Math.min(1, v)); if (master) master.gain.value = volume; },
    play(name, ...args) {
      if (!ctx || ctx.state !== 'running' || volume <= 0 || !S[name]) return;
      try { S[name](...args); } catch (e) { console.warn('[grim] sfx', e); }
    },
  };
}

/** Maps presentation events to sounds; returns how many played. */
export function playEvents(sfx, events) {
  let n = 0;
  const has = (t) => events.some((e) => e.type === t);
  for (const e of events) {
    if (e.type === 'damage') { sfx.play(e.crit ? 'crit' : 'hit', e.fraction); n++; }
    else if (e.type === 'down') { sfx.play('death', e.enemy); n++; }
    else if (e.type === 'heal' && !has('revive')) { sfx.play('heal'); n++; }
    else if (e.type === 'revive') { sfx.play('revive'); n++; }
    else if (e.type === 'shield') { sfx.play('shield'); n++; }
    else if (e.type === 'condition' && !has('damage')) { sfx.play('condition', e.condition); n++; }
    else if (e.type === 'turn' && !has('round') && !has('combatStart')) { sfx.play('turn', e.enemy); n++; }
    else if (e.type === 'round') { sfx.play('round'); n++; }
    else if (e.type === 'combatStart') { sfx.play('banner', 'start'); n++; }
    else if (e.type === 'victory') { sfx.play('banner', 'victory'); n++; }
    else if (e.type === 'reveal') { sfx.play('reveal'); n++; }
    else if (e.type === 'overlay' && e.kind === 'title') { sfx.play('banner', 'start'); n++; }
    else if (e.type === 'overlay') { sfx.play('page'); n++; }
  }
  return n;
}
