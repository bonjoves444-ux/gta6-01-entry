// WebAudio radio and effects. Three stations with different tempos and
// bass lines, distinct shot sounds per weapon, a NOS whoosh and cash blips.
// Everything starts on the start-button gesture, never before.
const STATIONS = [
  { name: 'SOLMAR FM 101.5', track: 'Coastline Nights — The Palms', bpm: 96, bass: [55, 55, 65.41, 49, 55, 55, 82.41, 73.42] },
  { name: 'RADIO ORO 88.2', track: 'Golden Hour — Marisol Vega', bpm: 112, bass: [65.41, 49, 55, 61.74, 65.41, 73.42, 65.41, 49] },
  { name: 'WAVE 99.9', track: 'Night Drive — The Comets', bpm: 128, bass: [49, 58.27, 65.41, 58.27, 49, 58.27, 73.42, 65.41] },
];

export function createAudio(G) {
  const audio = {
    ctx: null,
    master: null,
    station: 0,
    muted: false,
    nextNote: 0,
    step: 0,
    ensure() {
      if (audio.ctx) {
        if (audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {});
        return;
      }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        audio.ctx = new AC();
        audio.master = audio.ctx.createGain();
        audio.master.gain.value = 0.5;
        audio.master.connect(audio.ctx.destination);
        audio.nextNote = audio.ctx.currentTime + 0.1;
      } catch (e) {
        audio.ctx = null;
      }
    },
    stationInfo() {
      return STATIONS[audio.station];
    },
    setStation(i) {
      audio.station = ((i % STATIONS.length) + STATIONS.length) % STATIONS.length;
      audio.step = 0;
    },
    cycle() {
      audio.setStation(audio.station + 1);
      audio.click();
    },
    toggleMute() {
      audio.muted = !audio.muted;
      if (audio.master) audio.master.gain.value = audio.muted ? 0 : 0.5;
      return audio.muted;
    },
    note(freq, dur, type = 'triangle', vol = 0.1, when = 0) {
      if (!audio.ctx || audio.muted) return;
      try {
        const t = audio.ctx.currentTime + when;
        const osc = audio.ctx.createOscillator();
        const gain = audio.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(gain);
        gain.connect(audio.master);
        osc.start(t);
        osc.stop(t + dur + 0.02);
      } catch (e) { /* audio is garnish, never fatal */ }
    },
    update() {
      if (!audio.ctx || audio.muted) return;
      const st = STATIONS[audio.station];
      const beat = 60 / st.bpm;
      while (audio.nextNote < audio.ctx.currentTime + 0.12) {
        const s = audio.step % 8;
        const when = Math.max(0, audio.nextNote - audio.ctx.currentTime);
        audio.note(st.bass[s], beat * 0.9, 'triangle', 0.11, when);
        if (s % 2 === 0) audio.note(120, 0.09, 'sine', 0.1, when);
        audio.nextNote += beat / 2;
        audio.step++;
      }
    },
    shot(weapon) {
      if (!audio.ctx) return;
      if (weapon === 'shotgun') {
        audio.note(150, 0.28, 'sine', 0.22);
        audio.note(90, 0.2, 'square', 0.1);
      } else if (weapon === 'smg') {
        audio.note(700, 0.05, 'square', 0.09);
      } else {
        audio.note(820, 0.09, 'square', 0.12);
        audio.note(240, 0.07, 'sine', 0.1);
      }
    },
    nos() {
      if (!audio.ctx) return;
      try {
        const t = audio.ctx.currentTime;
        const osc = audio.ctx.createOscillator();
        const gain = audio.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.5);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
        osc.connect(gain);
        gain.connect(audio.master);
        osc.start(t);
        osc.stop(t + 0.6);
      } catch (e) { /* ignore */ }
    },
    cash() {
      audio.note(880, 0.1, 'sine', 0.1);
      audio.note(1318, 0.16, 'sine', 0.1, 0.09);
    },
    blip() { audio.note(660, 0.09, 'sine', 0.1); },
    click() { audio.note(440, 0.05, 'square', 0.06); },
    dry() { audio.note(300, 0.04, 'square', 0.07); },
    thud() { audio.note(90, 0.2, 'sine', 0.18); },
  };
  return audio;
}
