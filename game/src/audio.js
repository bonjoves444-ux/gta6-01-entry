// audio.js — synthesized WebAudio sound: engine, sirens, shots, cash and a bass loop.
export function createAudioSystem() {
  let audioCtx = null;
  let engineOsc = null;
  let engineGain = null;
  let musicTimer = null;
  let muted = false;
  let musicStep = 0;

  function ensureContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      audioCtx = new AudioContextClass();
      engineOsc = audioCtx.createOscillator();
      engineOsc.type = "sawtooth";
      engineOsc.frequency.value = 60;
      engineGain = audioCtx.createGain();
      engineGain.gain.value = 0;
      const filter = audioCtx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 700;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(audioCtx.destination);
      engineOsc.start();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function playTone(frequency, duration, type, volume, slideTo) {
    if (muted) return;
    const ctx = ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume || 0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  function playNoise(duration, volume) {
    if (muted) return;
    const ctx = ensureContext();
    if (!ctx) return;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = volume || 0.2;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }

  // A slow coastal bass loop: A minor, four bars, no samples, no network.
  const BASS_LINE = [55, 0, 55, 65.4, 55, 0, 49, 55, 55, 0, 55, 65.4, 82.4, 0, 73.4, 65.4];

  return {
    unlock() {
      ensureContext();
    },
    isMuted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      if (engineGain) engineGain.gain.value = 0;
      return muted;
    },
    setEnginePitch(ratio) {
      if (muted || !engineOsc || !engineGain) return;
      engineOsc.frequency.value = 55 + ratio * 160;
      engineGain.gain.value = ratio > 0.02 ? 0.05 + ratio * 0.05 : 0;
    },
    startMusic() {
      if (musicTimer || muted) return;
      ensureContext();
      musicTimer = setInterval(() => {
        if (muted) return;
        const note = BASS_LINE[musicStep % BASS_LINE.length];
        musicStep += 1;
        if (note > 0) playTone(note, 0.42, "triangle", 0.12);
        if (musicStep % 4 === 0) playTone(220, 0.2, "sine", 0.04);
      }, 300);
    },
    stopMusic() {
      if (musicTimer) {
        clearInterval(musicTimer);
        musicTimer = null;
      }
    },
    playShot() {
      playNoise(0.16, 0.35);
      playTone(180, 0.1, "square", 0.12, 60);
    },
    playPunch() {
      playNoise(0.08, 0.25);
    },
    playCrash() {
      playNoise(0.3, 0.3);
      playTone(90, 0.25, "sawtooth", 0.15, 40);
    },
    playSteal() {
      playTone(330, 0.12, "square", 0.12);
      playTone(440, 0.18, "square", 0.12);
    },
    playCash() {
      playTone(880, 0.12, "sine", 0.16);
      setTimeout(() => playTone(1320, 0.22, "sine", 0.16), 110);
    },
    playMissionStart() {
      playTone(523, 0.15, "triangle", 0.16);
      setTimeout(() => playTone(659, 0.15, "triangle", 0.16), 140);
      setTimeout(() => playTone(784, 0.3, "triangle", 0.16), 280);
    },
    playSirenBlip() {
      playTone(700, 0.22, "sine", 0.12, 950);
      setTimeout(() => playTone(950, 0.22, "sine", 0.12, 700), 220);
    },
    playPickup() {
      playTone(660, 0.1, "sine", 0.14);
      setTimeout(() => playTone(990, 0.18, "sine", 0.14), 90);
    },
  };
}
