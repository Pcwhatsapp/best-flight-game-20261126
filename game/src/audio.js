// Synthesised sound: no audio files. An engine hum that follows the
// throttle, wind that follows the speed, and chimes for rings, landings
// and crashes. Everything is created lazily on the first user gesture.
export function createAudio() {
  let ctx = null;
  let engineOsc1 = null;
  let engineOsc2 = null;
  let engineGain = null;
  let windGain = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      // Engine: two detuned saws through a lowpass.
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc1 = ctx.createOscillator();
      engineOsc1.type = 'sawtooth';
      engineOsc1.frequency.value = 55;
      engineOsc2 = ctx.createOscillator();
      engineOsc2.type = 'sawtooth';
      engineOsc2.frequency.value = 82.5;
      engineOsc1.connect(filter);
      engineOsc2.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(master);
      engineOsc1.start();
      engineOsc2.start();
      // Wind: looped noise through a bandpass.
      const len = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 900;
      band.Q.value = 0.6;
      windGain = ctx.createGain();
      windGain.gain.value = 0;
      noise.connect(band);
      band.connect(windGain);
      windGain.connect(master);
      noise.start();
      return true;
    } catch {
      ctx = null;
      return false;
    }
  }

  function tone(freq, dur, type, vol, when = 0) {
    if (!ctx || !master) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const t = ctx.currentTime + when;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  return {
    /** Call on the first gesture so the browser allows audio. */
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    /** Continuous engine and wind, from the aircraft state. */
    update(plane) {
      if (!ctx || muted) {
        if (engineGain) engineGain.gain.value = 0;
        if (windGain) windGain.gain.value = 0;
        return;
      }
      const target = 0.05 + plane.throttle * 0.11;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
      engineOsc1.frequency.setTargetAtTime(52 + plane.throttle * 48, ctx.currentTime, 0.1);
      engineOsc2.frequency.setTargetAtTime(78 + plane.throttle * 72, ctx.currentTime, 0.1);
      windGain.gain.setTargetAtTime(Math.min(0.16, plane.speed * 0.0022), ctx.currentTime, 0.15);
    },
    ring() {
      tone(880, 0.5, 'sine', 0.22);
      tone(1318, 0.6, 'sine', 0.18, 0.09);
    },
    land() {
      tone(220, 0.25, 'sine', 0.25);
      tone(330, 0.4, 'sine', 0.2, 0.1);
    },
    crash() {
      if (!ctx || !master) return;
      try {
        const len = ctx.sampleRate * 0.5;
        const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.value = 0.5;
        src.connect(gain);
        gain.connect(master);
        src.start();
      } catch {
        // Ignore.
      }
      tone(70, 0.5, 'sine', 0.4);
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}
