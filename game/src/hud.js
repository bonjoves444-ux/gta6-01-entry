// hud.js — the SOLMAR heads-up display: glass panels, the mission
// panel with its gold chapter chip, timer and segmented stage bar,
// the PD roster, weapon slots, radio, the round street minimap, and
// the dialogue box with a drawn portrait per character. All DOM; the
// 3D scene never draws UI.

// Inline SVG portraits, one per story character.
const PORTRAITS = {
  Marco: '<svg viewBox="0 0 64 64" width="52" height="52"><rect width="64" height="64" rx="10" fill="#ff2e88"/><circle cx="32" cy="30" r="15" fill="#e8b98a"/><path d="M17 28 Q32 8 47 28 L47 22 Q32 6 17 22 Z" fill="#1c1c26"/><rect x="14" y="24" width="36" height="6" rx="3" fill="#ff2e88"/><circle cx="26" cy="30" r="2.4" fill="#1c1c26"/><circle cx="38" cy="30" r="2.4" fill="#1c1c26"/><path d="M26 40 Q32 44 38 40" stroke="#1c1c26" stroke-width="2" fill="none"/><rect x="18" y="48" width="28" height="12" rx="4" fill="#1c1c26"/></svg>',
  Lena: '<svg viewBox="0 0 64 64" width="52" height="52"><rect width="64" height="64" rx="10" fill="#2ec8ff"/><circle cx="32" cy="30" r="15" fill="#f0c09a"/><path d="M15 32 Q12 10 32 10 Q52 10 49 32 Q46 18 32 18 Q18 18 15 32 Z" fill="#ff5aa0"/><rect x="18" y="26" width="28" height="7" rx="3.5" fill="#0a0a12"/><line x1="32" y1="29" x2="32" y2="33" stroke="#0a0a12" stroke-width="2"/><path d="M26 40 Q32 44 38 40" stroke="#7a2a3a" stroke-width="2" fill="none"/><rect x="18" y="48" width="28" height="12" rx="4" fill="#ff5aa0"/></svg>',
  default: '<svg viewBox="0 0 64 64" width="52" height="52"><rect width="64" height="64" rx="10" fill="#8a7a9a"/><circle cx="32" cy="30" r="15" fill="#e8b98a"/><circle cx="26" cy="30" r="2.4" fill="#1c1c26"/><circle cx="38" cy="30" r="2.4" fill="#1c1c26"/><path d="M26 40 Q32 44 38 40" stroke="#1c1c26" stroke-width="2" fill="none"/><rect x="18" y="48" width="28" height="12" rx="4" fill="#1c1c26"/></svg>',
};

// Map places: letter, label and world position, shared by the city
// map canvas and its legend. One table drives both, so they can
// never disagree about where a place is or what it is called.
const MAP_PLACES = [
  { letter: 'S', label: 'Safehouse — Rio’s flat', x: -62, z: 18, color: '#4ade80' },
  { letter: 'R', label: 'Rio’s Garage — repair, NOS, armour', x: -56, z: 24, color: '#ff5aa0' },
  { letter: 'L', label: 'Lead & Iron — guns and ammo', x: 60, z: -20, color: '#4ad84a' },
  { letter: 'M', label: 'Market Row', x: 25, z: 45, color: '#ffc21a' },
  { letter: 'T', label: 'Marina Tower', x: -70, z: -45, color: '#2ec8ff' },
  { letter: 'P', label: 'The Pier — ferris wheel', x: -106, z: 55, color: '#ff7a3c' },
  { letter: 'D', label: 'The Docks', x: -110, z: -120, color: '#8a7a9a' },
  { letter: 'H', label: 'Hotel Marina', x: -76, z: -90, color: '#ffd27a' },
];

// Hud: binds to the DOM ids in index.html and pushes game state into
// them. Construct once; main.js calls update(state) every frame.
export class Hud {
  constructor() {
    this.el = {};
    const ids = [
      'hud', 'menu', 'pause-overlay', 'shop-overlay', 'shop-title', 'shop-items',
      'mission-panel', 'mission-chapter', 'mission-title', 'mission-timer',
      'mission-brief', 'mission-hint', 'mission-stage', 'mission-next',
      'day-time', 'cash', 'stars', 'heat-label',
      'roster', 'roster-rows', 'roster-count',
      'weapons', 'radio', 'radio-station', 'radio-track',
      'minimap', 'minimap-label', 'health-bar', 'health-num',
      'rep-bar', 'rep-num', 'dialogue', 'dialogue-portrait',
      'dialogue-name', 'dialogue-role', 'dialogue-text',
      'speed-car', 'speed-condition', 'speed-num', 'speed-gear',
      'speed-nos', 'toast', 'hint', 'loading-note', 'crosshair',
      'map-overlay', 'map-story', 'map-current', 'map-legend',
      'map-stats', 'citymap',
    ];
    for (const id of ids) this.el[id] = document.getElementById(id);
    this.minimapCtx = this.el.minimap ? this.el.minimap.getContext('2d') : null;
    this.mapCtx = this.el.citymap ? this.el.citymap.getContext('2d') : null;
    this.toastTimer = null;
    this.lastCash = null;
    this.lastDialogue = '';
    this.buildWeaponSlots();
  }

  // buildWeaponSlots: four empty slot boxes, filled by setWeapons().
  buildWeaponSlots() {
    if (!this.el.weapons) return;
    this.el.weapons.innerHTML = '';
    this.slotEls = [];
    for (let i = 0; i < 4; i++) {
      const d = document.createElement('div');
      d.className = 'weapon-slot';
      d.innerHTML = '<div class="ws-num">' + (i + 1) + '</div><div class="ws-icon">·</div><div class="ws-ammo"></div><div class="ws-name"></div>';
      this.el.weapons.appendChild(d);
      this.slotEls.push(d);
    }
  }

  // setWeapons(slots): paint the four weapon slots from combat.slots().
  setWeapons(slots) {
    if (!this.slotEls) return;
    for (let i = 0; i < 4 && i < slots.length; i++) {
      const s = slots[i];
      const d = this.slotEls[i];
      d.classList.toggle('active', !!s.active);
      d.classList.toggle('locked', !s.owned);
      d.querySelector('.ws-icon').textContent = s.icon;
      d.querySelector('.ws-ammo').textContent = !s.owned ? 'LOCKED' : s.mag === Infinity ? '∞' : s.mag + '/' + s.reserve;
      d.querySelector('.ws-name').textContent = !s.owned ? '$' + s.price : s.name.toUpperCase();
    }
  }

  // show(): reveal the in-game HUD (after Start).
  show() {
    if (this.el.hud) this.el.hud.style.display = 'block';
    if (this.el.menu) this.el.menu.style.display = 'none';
  }

  // hide(): hide the in-game HUD (back to the title screen).
  hide() {
    if (this.el.hud) this.el.hud.style.display = 'none';
    if (this.el.menu) this.el.menu.style.display = 'flex';
  }

  // setCash(v): big green cash figure, top right.
  setCash(v) {
    if (this.lastCash === v) return;
    this.lastCash = v;
    if (this.el.cash) this.el.cash.textContent = '$' + Math.floor(v).toLocaleString('en-US');
  }

  // setDialogue(giver, role, text): pin a dialogue box with the
  // character's drawn portrait.
  setDialogue(giver, role, text) {
    const key = giver + '|' + text;
    if (key === this.lastDialogue) return;
    this.lastDialogue = key;
    if (!this.el.dialogue) return;
    this.el.dialogue.style.display = 'flex';
    this.el['dialogue-portrait'].innerHTML = PORTRAITS[giver] || PORTRAITS.default;
    this.el['dialogue-name'].textContent = (giver || '').toUpperCase();
    this.el['dialogue-role'].textContent = role || '';
    this.el['dialogue-text'].textContent = text;
  }

  // toast(msg): one short line at the bottom of the screen for a few
  // seconds. A new toast replaces the old one.
  toast(msg) {
    if (!this.el.toast) return;
    this.el.toast.textContent = msg;
    this.el.toast.style.opacity = '1';
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      if (this.el.toast) this.el.toast.style.opacity = '0';
    }, 3200);
  }

  // setRoster(rows): PD response rows { name, dist, role } plus the
  // unit count line. Hidden entirely when nobody is after the player.
  setRoster(rows) {
    if (!this.el.roster) return;
    if (!rows || rows.length === 0) {
      this.el.roster.style.display = 'none';
      return;
    }
    this.el.roster.style.display = 'block';
    const extra = rows.length > 5 ? '<div class="roster-more">+' + (rows.length - 5) + ' more units in the search zone</div>' : '';
    const shown = rows.slice(0, 5).map((r) => {
      const pill = r.role === 'RAMMING' ? 'pill-red' : r.role === 'PURSUIT' ? 'pill-amber' : 'pill-blue';
      return '<div class="roster-row"><span class="roster-car">🚓</span><span class="roster-name">' + r.name + '</span><span class="roster-dist">' + r.dist + ' m</span><span class="pill ' + pill + '">' + r.role + '</span></div>';
    }).join('');
    this.el['roster-rows'].innerHTML = shown + extra;
    if (this.el['roster-count']) this.el['roster-count'].textContent = rows.length + ' UNITS · CODE ' + Math.max(1, rows.length);
  }

  // setRadio(label): station + track line with the equaliser bars.
  setRadio(label) {
    if (this.el['radio-station']) this.el['radio-station'].textContent = label;
  }

  setTrack(track) {
    if (this.el['radio-track']) this.el['radio-track'].textContent = track;
  }

  // fmtTimer(s): seconds to M:SS.
  fmtTimer(s) {
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return m + ':' + String(r).padStart(2, '0');
  }

  // update(state): push one frame of game state into every HUD panel.
  // state carries mission, timer, cash, rep, health, clock, wanted,
  // speed, car, location, roster rows, minimap data and radio.
  update(state) {
    if (!state) return;
    this.setCash(state.cash);
    if (this.el['day-time']) {
      const hh = Math.floor(state.clockMinutes / 60);
      const mm = Math.floor(state.clockMinutes % 60);
      this.el['day-time'].textContent = 'DAY ' + state.day + ' ' + hh + ':' + String(mm).padStart(2, '0');
    }
    if (this.el.stars) {
      let stars = '';
      for (let i = 0; i < 5; i++) stars += i < state.wanted ? '★' : '☆';
      this.el.stars.textContent = stars;
      this.el.stars.className = state.wanted >= 4 ? 'stars hot' : 'stars';
    }
    if (this.el['heat-label']) {
      let label = 'STREETS QUIET';
      let cls = 'heat-quiet';
      if (state.wanted >= 3 && state.heli) { label = '🚁 HELICOPTER OVERHEAD'; cls = 'heat-hot'; }
      else if (state.wanted >= 4) { label = '⚠ MAXIMUM HEAT — LOSE THEM'; cls = 'heat-hot'; }
      else if (state.wanted > 0) { label = state.inSight ? 'IN SIGHT' : 'SEARCH ZONE FOLLOWS YOU'; cls = 'heat-warm'; }
      this.el['heat-label'].textContent = label;
      this.el['heat-label'].className = cls;
    }
    const m = state.mission;
    if (m && this.el['mission-panel']) {
      this.el['mission-chapter'].textContent = 'CH ' + m.ch;
      this.el['mission-title'].textContent = m.title;
      this.el['mission-timer'].textContent = '⏱ ' + this.fmtTimer(state.missionTimer);
      this.el['mission-brief'].textContent = m.brief;
      this.el['mission-hint'].textContent = m.hint;
      const total = m.steps.length;
      const done = Math.min(state.stepIndex, total);
      let segs = '';
      for (let i = 0; i < total; i++) {
        segs += '<span class="seg' + (i < done ? ' done' : '') + '"></span>';
      }
      this.el['mission-stage'].innerHTML = 'STAGE ' + Math.min(done + 1, total) + '/' + total + ' ' + segs;
      this.el['mission-next'].textContent = 'NEXT  ' + m.next;
    }
    if (this.el['health-bar']) this.el['health-bar'].style.width = Math.max(0, state.health) + '%';
    if (this.el['health-num']) this.el['health-num'].textContent = Math.round(state.health);
    if (this.el['rep-bar']) this.el['rep-bar'].style.width = Math.min(100, state.rep) + '%';
    if (this.el['rep-num']) this.el['rep-num'].textContent = Math.round(state.rep);
    if (this.el['speed-num']) this.el['speed-num'].textContent = Math.round(state.speedKmh || 0);
    if (this.el['speed-gear']) this.el['speed-gear'].textContent = 'G' + (state.gear || 1);
    if (this.el['speed-car']) this.el['speed-car'].textContent = state.carName || 'ON FOOT';
    if (this.el['speed-condition']) {
      this.el['speed-condition'].style.width = Math.max(0, state.condition || 0) + '%';
    }
    if (this.el['speed-nos']) {
      this.el['speed-nos'].style.width = Math.max(0, state.nos || 0) + '%';
      this.el['speed-nos'].parentElement.style.display = state.nosOwned ? 'block' : 'none';
    }
    if (this.el['minimap-label']) this.el['minimap-label'].textContent = (state.location || 'SOLMAR CITY').toUpperCase();
    if (this.el.crosshair) {
      // The crosshair stays hidden in shot mode except for the night
      // shootout (shot 3), where it is part of the frame.
      this.el.crosshair.style.display = state.onFoot && state.armed && (!state.shotMode || state.shot === 3) ? 'block' : 'none';
    }
    if (state.roster) this.setRoster(state.roster);
    if (state.weapons) this.setWeapons(state.weapons);
    if (state.radioLabel) this.setRadio(state.radioLabel);
    if (state.radioTrack) this.setTrack(state.radioTrack);
    this.drawMinimap(state);
  }

  // drawMinimap(state): the round street map — sea, sand, blocks,
  // roads, the tower, the mission ring, the red search circle, police
  // dots, the heli dot, and the player arrow, all in world space.
  drawMinimap(state) {
    const ctx = this.minimapCtx;
    const cv = this.el.minimap;
    if (!ctx || !cv) return;
    const W = cv.width;
    const H = cv.height;
    const R = W / 2;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.arc(R, R, R - 2, 0, Math.PI * 2);
    ctx.clip();
    // Sea west, sand strip, city ground.
    ctx.fillStyle = '#1a3a55';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c9a06a';
    ctx.fillRect(0, 0, W * 0.10, H);
    ctx.fillStyle = '#22303e';
    ctx.fillRect(W * 0.10, 0, W * 0.9, H);
    // World-to-map: the city spans about x -130..130, z -140..140.
    const px = state.playerX || 0;
    const pz = state.playerZ || 0;
    const toMap = (x, z) => [R + (x - px) * 0.55, R + (z - pz) * 0.55];
    // City blocks.
    ctx.fillStyle = '#31435a';
    for (let bx = -120; bx <= 120; bx += 24) {
      for (let bz = -130; bz <= 130; bz += 26) {
        const [mx, my] = toMap(bx, bz);
        ctx.fillRect(mx - 5, my - 5, 10, 10);
      }
    }
    // Roads.
    ctx.strokeStyle = '#5a6a7a';
    ctx.lineWidth = 2;
    for (const rx of [-85, -60, -40, -20, 10, 40]) {
      const [x1, y1] = toMap(rx, -140);
      const [x2, y2] = toMap(rx, 140);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    for (const rz of [-100, -60, -20, 20, 60]) {
      const [x1, y1] = toMap(-130, rz);
      const [x2, y2] = toMap(130, rz);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    // Coastline.
    ctx.strokeStyle = '#7ec8e8';
    ctx.lineWidth = 2;
    const [cx1, cy1] = toMap(-118, -140);
    const [cx2, cy2] = toMap(-118, 140);
    ctx.beginPath(); ctx.moveTo(cx1, cy1); ctx.lineTo(cx2, cy2); ctx.stroke();
    // Marina Tower.
    const [tx, ty] = toMap(-70, -45);
    ctx.fillStyle = '#ffd27a';
    ctx.beginPath(); ctx.arc(tx, ty, 4, 0, Math.PI * 2); ctx.fill();
    // Mission ring.
    if (state.missionTarget) {
      const [mx, my] = toMap(state.missionTarget.x, state.missionTarget.z);
      ctx.strokeStyle = '#ffc21a';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(mx, my, 7, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ffc21a';
      ctx.beginPath(); ctx.arc(mx, my, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    // Red search circle while wanted.
    if (state.wanted > 0) {
      ctx.strokeStyle = 'rgba(255,60,60,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(R, R, 26 + state.wanted * 4, 0, Math.PI * 2); ctx.stroke();
    }
    // Police dots and the heli dot.
    if (state.policeDots) {
      for (const d of state.policeDots) {
        const [mx, my] = toMap(d.x, d.z);
        ctx.fillStyle = '#4a90ff';
        ctx.beginPath(); ctx.arc(mx, my, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (state.heliDot) {
      const [mx, my] = toMap(state.heliDot.x, state.heliDot.z);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(mx, my, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    // Player arrow, pointing along the heading.
    ctx.save();
    ctx.translate(R, R);
    ctx.rotate(state.heading || 0);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(5, 6);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
    // Rim.
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(R, R, R - 2, 0, Math.PI * 2); ctx.stroke();
  }

  // showMap(game): fill the city-map overlay — story list, current
  // job, legend, stats — and draw the map canvas. Called when the
  // player opens the map (M) and for the staged map screenshot.
  showMap(game) {
    if (!game || !this.el['map-story']) return;
    const done = game.missionsDone || new Set();
    const list = game.missions ? game.missions.list : [];
    const active = game.missions ? game.missions.activeIndex : 0;
    // Story list: every job with its payout and state.
    this.el['map-story'].innerHTML = list.map((m, i) => {
      const state = done.has(m.id) ? 'done' : (i === active ? 'active' : 'locked');
      const label = done.has(m.id) ? 'Complete' : (i === active ? 'In progress' : 'Locked');
      return '<div class="map-job ' + state + '"><span class="chip">' + m.ch + '</span><span class="t">' + m.title + '</span><span class="p">$' + m.reward.toLocaleString('en-US') + '</span><span class="s">' + label + '</span></div>';
    }).join('');
    // Current job.
    const cur = list[active];
    if (cur && this.el['map-current']) {
      const step = cur.steps[Math.min(game.missions.stepIndex, cur.steps.length - 1)];
      const dist = step ? Math.round(Math.hypot(game.player.x - step.x, game.player.z - step.z)) : 0;
      const total = cur.steps.length;
      const doneSteps = Math.min(game.missions.stepIndex, total);
      this.el['map-current'].innerHTML =
        '<div class="cur-title">' + cur.title + '</div>' +
        '<div class="cur-brief">CH ' + cur.ch + ' — ' + cur.brief + '</div>' +
        '<div class="cur-stage">STAGE ' + Math.min(doneSteps + 1, total) + '/' + total + ' &nbsp;·&nbsp; GPS ' + dist + ' m</div>';
    }
    // Legend: the three markers first, then every place.
    const special = [
      { dot: '▶', color: '#ffffff', label: 'You are here' },
      { dot: '◎', color: '#ffc21a', label: 'Story contact' },
      { dot: '●', color: '#ffc21a', label: 'Job objective' },
    ];
    this.el['map-legend'].innerHTML = special.map((s) =>
      '<div class="map-legend-row"><span class="map-legend-dot" style="background:' + s.color + ';color:#1a1a1a">' + s.dot + '</span><span>' + s.label + '</span></div>'
    ).join('') + MAP_PLACES.map((p) =>
      '<div class="map-legend-row"><span class="map-legend-dot" style="background:' + p.color + '">' + p.letter + '</span><span>' + p.label + '</span></div>'
    ).join('');
    // Stats.
    const hh = Math.floor(game.clockMinutes / 60);
    const mm = Math.floor(game.clockMinutes % 60);
    this.el['map-stats'].innerHTML =
      '<div class="map-stat">Cash <span>$' + Math.floor(game.cash).toLocaleString('en-US') + '</span></div>' +
      '<div class="map-stat">Respect <span class="y">' + Math.round(game.rep) + '</span></div>' +
      '<div class="map-stat">Jobs done <span class="y">' + done.size + ' / ' + list.length + '</span></div>' +
      '<div class="map-stat">Day ' + game.day + ' · ' + hh + ':' + String(mm).padStart(2, '0') + '</div>';
    this.drawCityMap(game);
  }

  // drawCityMap(game): the big map canvas — sea, sand, city ground,
  // street grid, district labels, place markers, the GPS route from
  // the player to the current objective, and the player arrow.
  drawCityMap(game) {
    const ctx = this.mapCtx;
    const cv = this.el.citymap;
    if (!ctx || !cv) return;
    const W = cv.width;
    const H = cv.height;
    // World x -130..130 -> map x 0..W; world z -140..140 -> map y 0..H.
    const toMap = (x, z) => [(x + 130) / 260 * W, (z + 140) / 280 * H];
    // Sea, then land, then the sand strip along the coast.
    ctx.fillStyle = '#14608a';
    ctx.fillRect(0, 0, W, H);
    const [lx] = toMap(-118, 0);
    ctx.fillStyle = '#22303e';
    ctx.fillRect(lx, 0, W - lx, H);
    ctx.fillStyle = '#c9a06a';
    ctx.fillRect(lx, 0, 8, H);
    // City blocks.
    ctx.fillStyle = '#31435a';
    for (let bx = -120; bx <= 120; bx += 24) {
      for (let bz = -130; bz <= 130; bz += 26) {
        const [mx, my] = toMap(bx, bz);
        ctx.fillRect(mx - 6, my - 6, 12, 12);
      }
    }
    // Roads.
    ctx.strokeStyle = '#5a6a7a';
    ctx.lineWidth = 3;
    for (const rx of [-85, -60, -40, -20, 10, 40, 60]) {
      const [x1, y1] = toMap(rx, -140);
      const [x2, y2] = toMap(rx, 140);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    for (const rz of [-100, -60, -20, 20, 60]) {
      const [x1, y1] = toMap(-130, rz);
      const [x2, y2] = toMap(130, rz);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    // Coastline.
    ctx.strokeStyle = '#7ec8e8';
    ctx.lineWidth = 2;
    const [cx1, cy1] = toMap(-118, -140);
    const [cx2, cy2] = toMap(-118, 140);
    ctx.beginPath(); ctx.moveTo(cx1, cy1); ctx.lineTo(cx2, cy2); ctx.stroke();
    // District labels.
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px Arial, sans-serif';
    const label = (text, x, z, vertical) => {
      const [mx, my] = toMap(x, z);
      ctx.save();
      ctx.translate(mx, my);
      if (vertical) ctx.rotate(-Math.PI / 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(10,10,20,0.85)';
      ctx.strokeText(text, 0, 0);
      ctx.fillStyle = '#ffd27a';
      ctx.fillText(text, 0, 0);
      ctx.restore();
    };
    label('PALM STRAND', -85, -10, true);
    label('DOWNTOWN', 30, 0, false);
    label('MARKET ROW', 25, 62, false);
    label('MARINA TOWER', -70, -62, false);
    label('THE PIER', -106, 72, false);
    label('THE DOCKS', -108, -128, false);
    // Place markers.
    for (const p of MAP_PLACES) {
      const [mx, my] = toMap(p.x, p.z);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(mx, my, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Arial, sans-serif';
      ctx.fillText(p.letter, mx, my + 3.5);
    }
    // GPS route: player to the current objective, elbowed along the grid.
    const cur = game.missions ? game.missions.list[game.missions.activeIndex] : null;
    const step = cur ? cur.steps[Math.min(game.missions.stepIndex, cur.steps.length - 1)] : null;
    if (step) {
      const [px, py] = toMap(game.player.x, game.player.z);
      const [tx, ty] = toMap(step.x, step.z);
      ctx.strokeStyle = '#ffc21a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(tx, py);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      // Objective ring.
      ctx.strokeStyle = '#ffc21a';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(tx, ty, 10, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ffc21a';
      ctx.beginPath(); ctx.arc(tx, ty, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    // Player arrow.
    const [ax, ay] = toMap(game.player.x, game.player.z);
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(game.player.heading || 0);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(7, 8);
    ctx.lineTo(-7, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
