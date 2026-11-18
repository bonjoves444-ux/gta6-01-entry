// audio.js — procedural WebAudio radio, SFX and engine hum for SOLMAR.
// No audio files: every station is a small looping pattern of synth
// notes, so the game stays fully self-contained and offline.

// Radio: three stations, each with its own scale, tempo and bass line.
// ensure() must run from a user gesture (the Start click); every
// other method is safe to call before that and simply does nothing.
export class Radio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.stationIndex = 0;
    this.muted = false;
    this.stationName = 'REEF 92.3';
    this.trackName = 'Coral Light — The Tides';
    this.nextNoteAt = 0;
    this.step = 0;
    this.stations = [
      {
        name: 'REEF 92.3',
        label: 'Sunset Drive',
        track: 'Coral Light — The Tides',
        tempo: 116,
        root: 220,
        scale: [0, 3, 5, 7, 10, 12, 15],
        bass: [0, 0, 7, 5],
        wave: 'triangle',
      },
      {
        name: 'PARROT FM',
        label: 'Parrot Nights',
        track: 'Parrot Nights — The Palms',
        tempo: 98,
        root: 196,
        scale: [0, 2, 4, 7, 9, 12, 14],
        bass: [0, 5, 3, 7],
        wave: 'sine',
      },
      {
        name: 'SOLMAR CLASSICS',
        label: 'Coast Road',
        track: 'Coast Road — Marina Blue',
        tempo: 84,
        root: 174,
        scale: [0, 2, 4, 5, 7, 9, 11, 12],
        bass: [0, 4, 5, 4],
        wave: 'sawtooth',
      },
    ];
  }

  // ensure(): build the AudioContext and the engine hum. Call from a
  // user gesture; safe to call repeatedly, it builds only once.
  ensure() {
    try {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.32;
      this.master.connect(this.ctx.destination);
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 320;
      this.engineOsc.connect(filt);
      filt.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
      this.nextNoteAt = this.ctx.currentTime + 0.1;
    } catch (err) {
      this.ctx = null;
    }
  }

  // nextStation(): cycle to the next station and report its label.
  nextStation() {
    this.stationIndex = (this.stationIndex + 1) % this.stations.length;
    const st = this.stations[this.stationIndex];
    this.stationName = st.name;
    this.trackName = st.track;
    this.step = 0;
    return st.name + ' · ' + st.label;
  }

  // setMuted(m): silence (or restore) all sound. Returns the new state.
  setMuted(m) {
    this.muted = !!m;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.32;
    return this.muted;
  }

  // setRadio(label): show a station label on the HUD without sound.
  setRadio(label) {
    const st = this.stations[this.stationIndex];
    return st.name + ' · ' + st.label;
  }

  // chime(): short two-note mission ping.
  chime() {
    if (!this.ctx) return;
    this.blip(880, 0.09, 'sine', 0.18);
    setTimeout(() => this.blip(1318, 0.12, 'sine', 0.18), 90);
  }

  // gunshot(): a short noise burst plus a low thump.
  gunshot() {
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const dur = 0.12;
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.value = 0.5;
      src.connect(g);
      g.connect(this.master);
      src.start(t);
      this.blip(90, 0.1, 'square', 0.3);
    } catch (err) { /* audio is best-effort */ }
  }

  // setEngine(kmh, wanted): pitch the engine hum with road speed and
  // lift it a touch while the police are on the player's tail.
  setEngine(kmh, wanted) {
    if (!this.ctx || !this.engineOsc) return;
    try {
      const target = 48 + kmh * 0.9 + wanted * 6;
      this.engineOsc.frequency.setTargetAtTime(target, this.ctx.currentTime, 0.08);
      const vol = kmh > 2 ? 0.05 + Math.min(kmh / 160, 1) * 0.05 : 0.0;
      this.engineGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1);
    } catch (err) { /* audio is best-effort */ }
  }

  // update(dt): schedule the current station's next notes when due.
  // Runs every frame; silent until ensure() has built a context.
  update(dt) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    try {
      const st = this.stations[this.stationIndex];
      const stepDur = 60 / st.tempo / 2;
      while (this.nextNoteAt < this.ctx.currentTime + 0.25) {
        const bar = Math.floor(this.step / 8) % 4;
        const degree = st.scale[this.step % st.scale.length];
        const freq = st.root * Math.pow(2, degree / 12);
        if (this.step % 2 === 0) {
          this.noteAt(freq, this.nextNoteAt, stepDur * 1.8, st.wave, 0.05);
        }
        if (this.step % 8 === 0) {
          const bassDeg = st.bass[bar];
          this.noteAt(st.root * 0.5 * Math.pow(2, bassDeg / 12), this.nextNoteAt, stepDur * 6, 'sine', 0.12);
        }
        this.step++;
        this.nextNoteAt += stepDur;
      }
    } catch (err) { /* audio is best-effort */ }
  }

  // blip(freq, dur, wave, vol): one immediate note, now.
  blip(freq, dur, wave, vol) {
    if (!this.ctx) return;
    this.noteAt(freq, this.ctx.currentTime, dur, wave, vol);
  }

  // noteAt(freq, when, dur, wave, vol): one scheduled note.
  noteAt(freq, when, dur, wave, vol) {
    try {
      const o = this.ctx.createOscillator();
      o.type = wave;
      o.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(vol, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, when + dur);
      o.connect(g);
      g.connect(this.master);
      o.start(when);
      o.stop(when + dur + 0.05);
    } catch (err) { /* audio is best-effort */ }
  }
}
