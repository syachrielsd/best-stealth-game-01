// sound.js — every sound is synthesized with WebAudio: no audio files,
// no network. The context is created at boot (suspended) and resumed on
// the first user gesture, as browsers require.

export function createSound() {
  let ctx = null;
  let master = null;
  let muted = false;
  let alarmNodes = null;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    } catch {
      return false;
    }
    return true;
  }

  /** Call from any user gesture to unlock audio. */
  function unlock() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noiseBurst(dur, vol, lowpass) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(filter).connect(g).connect(master);
    src.start(t0);
  }

  return {
    unlock,
    toggleMute() { muted = !muted; if (muted) this.stopAlarm(); return muted; },
    get muted() { return muted; },
    /** Soft leather footstep; louder + faster when the walker runs. */
    footstep(running) {
      noiseBurst(0.07, running ? 0.22 : 0.09, running ? 900 : 500);
    },
    /** Guard footstep from a distance: a dull tap that tells you where he is. */
    guardStep(distance) {
      const vol = Math.max(0.02, 0.16 * (1 - distance / 420));
      if (vol <= 0.02) return;
      noiseBurst(0.06, vol, 320);
    },
    pickup() { tone(880, 0.12, 'sine', 0.25); tone(1318, 0.18, 'sine', 0.2, 0.07); },
    coinClink() { tone(2093, 0.09, 'triangle', 0.22); tone(1568, 0.14, 'triangle', 0.16, 0.05); },
    smokePuff() { noiseBurst(0.5, 0.25, 1200); },
    lockpickTick() { tone(1200, 0.05, 'square', 0.08); },
    caseOpen() { tone(523, 0.15, 'sine', 0.22); tone(784, 0.2, 'sine', 0.22, 0.1); tone(1046, 0.3, 'sine', 0.2, 0.2); },
    /** A rising two-note alarm when a guard spots you. */
    spotted() { tone(440, 0.16, 'square', 0.14); tone(587, 0.22, 'square', 0.14, 0.14); },
    /** Looping alarm siren while fully detected; call stopAlarm to end it. */
    startAlarm() {
      if (!ensure() || muted || alarmNodes) return;
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 620;
      lfo.type = 'sine';
      lfo.frequency.value = 2.2;
      lfoGain.gain.value = 180;
      g.gain.value = 0.05;
      lfo.connect(lfoGain).connect(osc.frequency);
      osc.connect(g).connect(master);
      osc.start();
      lfo.start();
      alarmNodes = { osc, lfo, g };
    },
    stopAlarm() {
      if (!alarmNodes) return;
      try { alarmNodes.osc.stop(); alarmNodes.lfo.stop(); } catch { /* already stopped */ }
      alarmNodes = null;
    },
    winChime() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.35, 'sine', 0.22, i * 0.12));
    },
    caughtSting() { tone(220, 0.5, 'sawtooth', 0.2, 0, 110); tone(110, 0.7, 'sawtooth', 0.18, 0.15, 55); },
  };
}
