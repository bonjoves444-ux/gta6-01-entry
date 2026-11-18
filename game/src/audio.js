// audio.js — synthesized WebAudio sound: engine, sirens, gunshots, cash and
// three radio stations, each with its own bass line and tempo. No samples,
// no network — everything is an oscillator.
export const RADIO_STATIONS = [
  { name: "SOLMAR FM 101.5", track: "Coastline Nights — The Palms", tempo: 300, bass: [55, 0, 55, 65.4, 55, 0, 49, 55, 55, 0, 55, 65.4, 82.4, 0, 73.4, 65.4] },
  { name: "RADIO ORO 88.2", track: "Golden Hour — Marina Lights", tempo: 260, bass: [65.4, 65.4, 0, 82.4, 73.4, 0, 65.4, 49, 65.4, 65.4, 0, 98, 82.4, 73.4, 65.4, 0] },
  { name: "BEACH STATIC 94.9", track: "Wheel at Dusk — DJ Umbra", tempo: 340, bass: [49, 0, 49, 58.3, 49, 0, 43.7, 49, 49, 0, 55, 58.3, 65.4, 0, 58.3, 55] },
];

export function createAudioSystem() {
  let audioCtx = null;
  let engineOsc = null;
  let engineGain = null;
  let musicTimer = null;
  let muted = false;
  let musicStep = 0;
  let stationIndex = 0;

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

  function currentStation() {
    return RADIO_STATIONS[stationIndex % RADIO_STATIONS.length];
  }

  function scheduleMusic() {
    const station = currentStation();
    musicTimer = setInterval(() => {
      if (muted) return;
      const note = station.bass[musicStep % station.bass.length];
      musicStep += 1;
      if (note > 0) playTone(note, 0.42, "triangle", 0.12);
      if (musicStep % 4 === 0) playTone(220, 0.2, "sine", 0.04);
    }, station.tempo);
  }

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
    station() {
      return currentStation();
    },
    // Cycle to the next station and retune the bass loop to its tempo.
    nextStation() {
      stationIndex = (stationIndex + 1) % RADIO_STATIONS.length;
      musicStep = 0;
      if (musicTimer) {
        clearInterval(musicTimer);
        musicTimer = null;
        scheduleMusic();
      }
      return currentStation();
    },
    startMusic() {
      if (musicTimer || muted) return;
      ensureContext();
      scheduleMusic();
    },
    stopMusic() {
      if (musicTimer) {
        clearInterval(musicTimer);
        musicTimer = null;
      }
    },
    playShot(weapon) {
      if (weapon === "shotgun") {
        playNoise(0.3, 0.5);
        playTone(120, 0.2, "square", 0.18, 40);
      } else if (weapon === "smg") {
        playNoise(0.08, 0.22);
        playTone(220, 0.06, "square", 0.1, 90);
      } else {
        playNoise(0.16, 0.35);
        playTone(180, 0.1, "square", 0.12, 60);
      }
    },
    playPunch() {
      playNoise(0.08, 0.25);
    },
    playCrash() {
      playNoise(0.3, 0.3);
      playTone(90, 0.25, "sawtooth", 0.15, 40);
    },
    playNos() {
      playNoise(0.12, 0.12);
      playTone(400, 0.12, "sawtooth", 0.05, 1200);
    },
    playWeaponSwitch() {
      playTone(500, 0.07, "square", 0.1);
      setTimeout(() => playTone(700, 0.07, "square", 0.1), 70);
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
