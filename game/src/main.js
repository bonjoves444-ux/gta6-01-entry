// main.js — SOLMAR entry point: renderer, game state, input wiring,
// the camera, the frame loop, and the ?shot= staging hook.
// The game is a three.js open-world crime game: drive the pink Comet
// around a sunset beachfront city, lose the cops, run eight missions
// for Marco and Lena, buy guns at Lead & Iron, and save your progress.

import * as THREE from 'three';
import { buildCity, SPAWN_POS, GARAGE_POS, AMMU_POS } from './city.js';
import { Car, Traffic, HERO_COLOR } from './vehicles.js';
import { Player } from './player.js';
import { Police } from './police.js';
import { Missions } from './missions.js';
import { Combat } from './combat.js';
import { Shops } from './shops.js';
import { Hud } from './hud.js';
import { Radio } from './audio.js';
import { Input } from './input.js';
import { saveGame, loadGame, hasSave, applySave, SAVE_KEY } from './save.js';
import { applyShot, shotByNumber } from './shots.js';
import { mulberry32 } from './random.js';

// --- renderer ---------------------------------------------------------------
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
camera.position.set(-62, 4, 30);

// --- game object --------------------------------------------------------------
// One plain object holds everything the frame loop and the HUD need.
// state: 'menu' | 'playing' | 'paused' | 'shop'.
const game = {
  state: 'menu',
  cash: 2450,
  rep: 62,
  health: 100,
  day: 1,
  clockMinutes: 18 * 60 + 52,
  camYaw: Math.PI,
  camDist: 6.2,
  camHeight: 2.6,
  wanted: 0,
  fare: 0,
  missionsDone: new Set(),
  shot: 0,
  shotMode: false,
  shotSpeed: 0,
  player: null,
  heroCar: null,
  traffic: null,
  police: null,
  missions: null,
  combat: null,
  shops: null,
  city: null,
  hud: null,
  radio: null,
  input: null,
  elapsed: 0,
  errors: [],
};

window.addEventListener('error', (e) => {
  game.errors.push(String(e.message || e.error || 'error').slice(0, 200));
});

// --- world ----------------------------------------------------------------------
game.city = buildCity(scene, 20261118);
game.heroCar = new Car('hero', HERO_COLOR, -58, 22, Math.PI);
scene.add(game.heroCar.mesh);
game.player = new Player(scene, SPAWN_POS.x, SPAWN_POS.z, Math.PI);
game.traffic = new Traffic(scene, mulberry32(7));
game.police = new Police(scene);
game.missions = new Missions(scene);
game.combat = new Combat(scene);
game.shops = new Shops();
game.hud = new Hud();
game.radio = new Radio();
game.input = new Input();

// setExposure(v): renderer exposure for the active palette.
game.setExposure = function setExposure(v) {
  renderer.toneMappingExposure = v;
};

// placeShotTraffic(): in shot mode, park three traffic cars ahead on
// the player's road so the chase reads deep. In normal play the
// traffic runs its own lanes and this is never called.
game.placeShotTraffic = function placeShotTraffic() {
  const cars = game.traffic.cars;
  if (!cars || cars.length < 3) return;
  const px = game.player.x;
  const pz = game.player.z;
  const heading = game.player.heading;
  const spots = game.shot === 3
    ? [{ x: 10, z: 30, h: 0.6 }, { x: 38, z: 52, h: -0.4 }, { x: -20, z: 60, h: 2.2 }]
    : [{ x: px - 2, z: pz - 28, h: 0 }, { x: px + 2, z: pz - 48, h: 0 }, { x: px - 1, z: pz - 68, h: 0 }];
  for (let i = 0; i < 3; i++) {
    const c = cars[i];
    c.x = spots[i].x;
    c.z = spots[i].z;
    c.heading = spots[i].h;
    c.speed = 10;
    c.cruise = 10;
    c.syncMesh();
  }
};

// --- menu -----------------------------------------------------------------------
const menuEl = document.getElementById('menu');
const startBtn = document.getElementById('start-btn');
const continueBtn = document.getElementById('continue-btn');
const titleCash = document.getElementById('title-cash');
const controlsBtn = document.getElementById('controls-btn');
const settingsBtn = document.getElementById('settings-btn');
const howtoPanel = document.getElementById('howto-panel');
const settingsCard = document.getElementById('settings-card');
const soundToggle = document.getElementById('sound-toggle');
const resetSaveBtn = document.getElementById('reset-save');

if (hasSave()) {
  continueBtn.style.display = 'block';
  const saved = loadGame();
  if (saved && titleCash) titleCash.textContent = 'SAVE FOUND — $' + Math.floor(saved.cash).toLocaleString('en-US') + ' · REP ' + saved.rep;
}

function startGame() {
  game.radio.ensure();
  game.state = 'playing';
  game.hud.show();
  game.hud.setRadio(game.radio.stationName + ' · ' + game.radio.stations[game.radio.stationIndex].label);
  game.hud.setTrack(game.radio.trackName);
  game.hud.setDialogue('Marco', 'FIXER', 'Welcome back to Solmar. CH 1 is live — lose the cops, bring the money home.');
  game.hud.toast('WASD drive / walk · E enter car · F punch · 1-4 weapons · R radio · L save · P pause');
  // The Start click must never fire a shot on frame one.
  game.input.endFrame();
}

function continueGame() {
  const data = loadGame();
  if (data) {
    applySave(game, data);
    game.hud.toast('Save loaded — welcome back.');
  }
  startGame();
}

if (startBtn) startBtn.addEventListener('click', startGame);
if (continueBtn) continueBtn.addEventListener('click', continueGame);
if (controlsBtn) controlsBtn.addEventListener('click', () => {
  if (howtoPanel) howtoPanel.style.display = howtoPanel.style.display === 'none' ? 'block' : 'none';
});
if (settingsBtn) settingsBtn.addEventListener('click', () => {
  if (settingsCard) settingsCard.style.display = settingsCard.style.display === 'block' ? 'none' : 'block';
});
if (soundToggle) soundToggle.addEventListener('click', () => {
  const muted = game.radio.setMuted(!game.radio.muted);
  soundToggle.textContent = muted ? 'OFF' : 'ON';
});
if (resetSaveBtn) resetSaveBtn.addEventListener('click', () => {
  try { localStorage.removeItem(SAVE_KEY); } catch (err) { /* storage may be blocked */ }
  if (continueBtn) continueBtn.style.display = 'none';
  if (titleCash) titleCash.textContent = '';
});

// --- pause -------------------------------------------------------------------------
const pauseEl = document.getElementById('pause-overlay');
const resumeBtn = document.getElementById('resume-btn');
const quitBtn = document.getElementById('quit-btn');

function pauseGame() {
  if (game.state !== 'playing') return;
  game.state = 'paused';
  pauseEl.style.display = 'flex';
}

function resumeGame() {
  if (game.state !== 'paused') return;
  game.state = 'playing';
  pauseEl.style.display = 'none';
  game.input.endFrame();
}

if (resumeBtn) resumeBtn.addEventListener('click', resumeGame);
if (quitBtn) quitBtn.addEventListener('click', () => {
  game.state = 'menu';
  pauseEl.style.display = 'none';
  game.hud.hide();
});

// --- city map ----------------------------------------------------------------------
const mapEl = document.getElementById('map-overlay');
const mapCloseBtn = document.getElementById('map-close');

function openMap() {
  game.hud.showMap(game);
  game.state = 'map';
  if (mapEl) mapEl.style.display = 'flex';
  const hudEl = document.getElementById('hud');
  if (hudEl) hudEl.style.display = 'none';
  game.input.endFrame();
}

function closeMap() {
  game.state = 'playing';
  if (mapEl) mapEl.style.display = 'none';
  const hudEl = document.getElementById('hud');
  if (hudEl) hudEl.style.display = 'block';
  game.input.endFrame();
}

if (mapCloseBtn) mapCloseBtn.addEventListener('click', closeMap);

// --- shop overlay -------------------------------------------------------------------
const shopEl = document.getElementById('shop-overlay');
const shopTitle = document.getElementById('shop-title');
const shopItems = document.getElementById('shop-items');
const shopClose = document.getElementById('shop-close');

function openShop(id) {
  const items = game.shops.open(id);
  shopTitle.textContent = id === 'garage' ? 'RIO’S GARAGE' : 'LEAD & IRON';
  shopItems.innerHTML = '';
  for (const item of items) {
    const row = document.createElement('button');
    row.className = 'shop-row';
    row.innerHTML = '<span>' + item.label + '</span><span>$' + item.price + '</span>';
    row.addEventListener('click', () => {
      const car = (game.player && game.player.car) || game.heroCar;
      const ctx = { cash: game.cash, combat: game.combat, car };
      const res = game.shops.buy(item.id, ctx);
      game.cash = ctx.cash;
      game.hud.toast(res.msg);
      if (res.ok) game.radio.chime();
    });
    shopItems.appendChild(row);
  }
  game.state = 'shop';
  shopEl.style.display = 'flex';
}

function closeShop() {
  game.shops.close();
  game.state = 'playing';
  shopEl.style.display = 'none';
  game.input.endFrame();
}

if (shopClose) shopClose.addEventListener('click', closeShop);

// --- per-frame input --------------------------------------------------------------
// P pause, E enter car / open shop, F punch, Digit1-4 weapons,
// R radio, L save, mouse click shoots while on foot and armed.
function handleKeys() {
  const input = game.input;
  if (input.pressed('KeyP')) {
    if (game.state === 'playing') pauseGame();
    else if (game.state === 'paused') resumeGame();
    return;
  }
  if (input.pressed('KeyM')) {
    if (game.state === 'playing') openMap();
    else if (game.state === 'map') closeMap();
    return;
  }
  if (input.pressed('Escape') && game.state === 'map') {
    closeMap();
    return;
  }
  if (game.state !== 'playing') return;
  if (input.pressed('KeyE')) {
    if (game.player.nearShop) {
      openShop(game.player.nearShop);
      return;
    }
    if (game.player.onFoot) {
      const d = Math.hypot(game.heroCar.x - game.player.x, game.heroCar.z - game.player.z);
      if (d < 4.5) {
        game.player.enterCar(game.heroCar);
        game.hud.toast('Solmar Comet — yours. Drive.');
      }
    } else {
      game.player.exitCar();
    }
  }
  if (input.pressed('KeyF') && game.player.onFoot) {
    game.player.punch();
    for (let i = game.combat.rivals.length - 1; i >= 0; i--) {
      const r = game.combat.rivals[i];
      if (Math.hypot(r.x - game.player.x, r.z - game.player.z) < 1.9) {
        game.combat.scene.remove(r.mesh);
        game.combat.rivals.splice(i, 1);
        game.hud.toast('Rival down.');
      }
    }
  }
  for (let s = 0; s < 4; s++) {
    if (input.pressed('Digit' + (s + 1))) {
      game.combat.select(s, (msg) => game.hud.toast(msg));
      game.player.gun = game.combat.current.id;
    }
  }
  if (input.pressed('KeyR')) {
    const label = game.radio.nextStation();
    game.hud.setRadio(label);
    game.hud.setTrack(game.radio.trackName);
    game.hud.toast('📻 ' + label + ' — ' + game.radio.trackName);
  }
  if (input.pressed('KeyL')) {
    const ok = saveGame(game);
    game.hud.toast(ok ? '💾 Saved. See you soon, Solmar.' : '💾 Save failed — storage is blocked.');
  }
  if (input.clicked() && game.player.onFoot && game.combat.current.id !== 'fists') {
    const from = { x: game.player.x, y: 1.35, z: game.player.z };
    const dir = { x: Math.sin(game.camYaw), z: -Math.cos(game.camYaw) };
    const fired = game.combat.fire(from, dir, (msg) => game.hud.toast(msg));
    if (fired) {
      game.radio.gunshot();
      game.police.addHeat(4);
    }
  }
}

// --- camera ---------------------------------------------------------------------------
// Low close chase camera: behind the car (or the player on foot),
// looking 12 m ahead at y 2.2. In shot mode the camera SNAPS to
// position; in play it eases, and while driving the yaw follows the
// car. While on foot the camera heading stays frozen.
const camTarget = new THREE.Vector3();
const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();

function updateCamera(dt) {
  const player = game.player;
  const focus = player.onFoot ? player : game.heroCar;
  if (!player.onFoot) {
    const targetYaw = game.heroCar.heading;
    let diff = targetYaw - game.camYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff <= -Math.PI) diff += Math.PI * 2;
    game.camYaw += diff * Math.min(1, dt * 3.2);
  }
  const fx = Math.sin(game.camYaw);
  const fz = -Math.cos(game.camYaw);
  camTarget.set(focus.x, 0, focus.z);
  camPos.set(focus.x - fx * game.camDist, game.camHeight, focus.z - fz * game.camDist);
  camLook.set(focus.x + fx * 12, 2.3, focus.z + fz * 12);
  if (game.shotMode) {
    camera.position.copy(camPos);
    camera.lookAt(camLook);
  } else {
    camera.position.lerp(camPos, Math.min(1, dt * 8));
    camera.lookAt(camLook);
  }
}

// --- HUD push ----------------------------------------------------------------------------
function pushHud() {
  const player = game.player;
  const car = player.car || game.heroCar;
  const mission = game.missions.active;
  const step = mission.steps[Math.min(game.missions.stepIndex, mission.steps.length - 1)];
  const rows = game.police.roster(player);
  game.wanted = game.police.wanted;
  game.hud.update({
    mission,
    missionTimer: Math.max(0, game.missions.timer),
    stepIndex: game.missions.stepIndex,
    cash: game.cash,
    rep: game.rep,
    health: game.health,
    day: game.day,
    clockMinutes: game.clockMinutes,
    wanted: game.police.wanted,
    heli: game.police.wanted >= 3,
    inSight: rows.length > 0 && rows[0].dist < 30,
    speedKmh: player.onFoot ? 0 : car.kmh(),
    gear: player.onFoot ? 1 : car.gear(),
    carName: player.onFoot ? 'ON FOOT' : 'SOLMAR COMET',
    condition: car.condition,
    nos: car.nos,
    nosOwned: car.nosOwned,
    location: game.city.locationNameAt(player.x, player.z),
    onFoot: player.onFoot,
    shotMode: game.shotMode,
    shot: game.shot,
    armed: game.combat.current.id !== 'fists',
    roster: rows,
    weapons: game.combat.slots(),
    radioLabel: game.radio.stationName + ' · ' + (game.radio.stations[game.radio.stationIndex].label || ''),
    radioTrack: game.radio.trackName,
    playerX: player.x,
    playerZ: player.z,
    heading: player.heading,
    missionTarget: step ? { x: step.x, z: step.z } : null,
    policeDots: game.police.cruisers.map((c) => ({ x: c.x, z: c.z })),
    heliDot: game.police.wanted >= 3 && game.police.heli ? { x: game.police.heli.position.x, z: game.police.heli.position.z } : null,
  });
}

// --- frame loop -----------------------------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  game.elapsed += dt;
  const input = game.input;

  if (game.state === 'playing') {
    handleKeys();
    const player = game.player;
    // Nearest shop within 9 m, for the E key.
    const dg = Math.hypot(player.x - GARAGE_POS.x, player.z - GARAGE_POS.z);
    const da = Math.hypot(player.x - AMMU_POS.x, player.z - AMMU_POS.z);
    player.nearShop = dg < 9 ? 'garage' : da < 9 ? 'ammunition' : null;

    if (player.onFoot) {
      player.walk(dt, input, game.camYaw);
      player.update(dt);
    } else {
      const car = game.heroCar;
      let throttle = 0;
      if (input.down('KeyW')) throttle = 1;
      if (input.down('KeyS')) throttle = -0.7;
      let steer = 0;
      if (input.down('KeyA')) steer = -1;
      if (input.down('KeyD')) steer = 1;
      const boost = input.down('ShiftLeft') || input.down('ShiftRight');
      if (game.shotMode) {
        // Shot mode: throttle pinned to the staged speed.
        car.speed = game.shotSpeed;
        car.x += Math.sin(car.heading) * car.speed * dt;
        car.z += -Math.cos(car.heading) * car.speed * dt;
        car.syncMesh();
      } else {
        car.drive(dt, throttle, steer, boost);
      }
      player.x = car.x;
      player.z = car.z;
      player.heading = car.heading;
    }

    // Mission events: step, complete (+cash, +12 rep), timeout.
    const ev = game.missions.update(dt, player, player.onFoot);
    if (ev && ev.type === 'step') {
      game.radio.chime();
      game.hud.toast('✓ ' + ev.mission.steps[ev.stepIndex - 1].label);
    } else if (ev && ev.type === 'complete') {
      game.cash += ev.mission.reward;
      game.rep = Math.min(100, game.rep + 12);
      game.missionsDone.add(ev.mission.id);
      game.radio.chime();
      game.hud.toast('★ ' + ev.mission.title + ' complete — +$' + ev.mission.reward + ' · +12 REP');
      game.hud.setDialogue(ev.mission.giver, ev.mission.giver === 'Marco' ? 'FIXER' : 'DRIVER', 'Clean work. Next job is on the board when you want it.');
      game.missions.startNext();
    } else if (ev && ev.type === 'timeout') {
      game.hud.toast('⏱ ' + ev.mission.title + ' — out of time. The job is gone.');
      game.missions.startNext();
    }

    if (!game.shotMode) game.police.cool(dt);
    game.police.update(dt, player, player.onFoot ? 0 : game.heroCar.speed, player.heading);
    game.combat.update(dt, player, (n) => {
      game.health = Math.max(0, game.health - n);
      if (game.health <= 0) {
        game.health = 100;
        game.cash = Math.max(0, game.cash - 150);
        player.place(SPAWN_POS.x, SPAWN_POS.z, Math.PI);
        game.hud.toast('You got jumped — patched up at the flat. -$150.');
      }
    });
    game.traffic.update(dt);
    game.radio.setEngine(player.onFoot ? 0 : game.heroCar.kmh(), game.police.wanted);
    game.clockMinutes += dt * 0.35;
    if (game.clockMinutes >= 24 * 60) {
      game.clockMinutes -= 24 * 60;
      game.day += 1;
    }
    updateCamera(dt);
    pushHud();
  } else if (game.state === 'menu') {
    if (game.shotMode && game.shot === 2) {
      // Title shot: fixed camera down Palm Strand — the Comet and Rio
      // stand in the road ahead, close enough to read, the sun low
      // over the beach behind them.
      camera.position.set(-88, 2.6, 28);
      camera.lookAt(-86, 1.6, 10);
    } else {
      // Slow orbit around the spawn for the title backdrop.
      const t = game.elapsed * 0.05;
      camera.position.set(-58 + Math.sin(t) * 14, 6, 22 + Math.cos(t) * 14);
      camera.lookAt(-70, 3, -10);
    }
    game.traffic.update(dt);
    game.police.update(dt, game.player, 0, 0);
  } else if (game.state === 'map') {
    // The map overlay covers the screen; only keys are live (M/Esc).
    handleKeys();
  }

  game.city.update(dt, game.elapsed, { x: game.player.x, y: 0, z: game.player.z });
  game.radio.update(dt);
  renderer.render(scene, camera);
  input.endFrame();
}

// --- debug hook ----------------------------------------------------------------------------
// SOLMAR_DEBUG(): one JSON snapshot for the verify scripts.
window.SOLMAR_DEBUG = function SOLMAR_DEBUG() {
  const player = game.player;
  return JSON.stringify({
    state: game.state,
    errors: game.errors,
    shot: game.shot,
    x: Math.round(player.x * 10) / 10,
    z: Math.round(player.z * 10) / 10,
    speed: Math.round((player.onFoot ? 0 : game.heroCar.kmh()) * 10) / 10,
    wanted: game.police.wanted,
    mission: game.missions.activeIndex,
    step: game.missions.stepIndex,
    cash: Math.round(game.cash),
    rep: Math.round(game.rep),
    cruisers: game.police.cruisers.map((c) => ({ x: Math.round(c.x), z: Math.round(c.z), h: Math.round(c.heading * 100) / 100 })),
    traffic: game.traffic.cars.slice(0, 3).map((c) => ({ x: Math.round(c.x), z: Math.round(c.z) })),
    heli: game.police.heli && game.police.heli.visible ? { x: Math.round(game.police.heli.position.x), z: Math.round(game.police.heli.position.z) } : null,
  });
};

// --- resize + shot param ----------------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ?shot=1..4 stages the scene live. Shots 1 and 3 are in-game play;
// shot 2 stays on the title screen and shot 4 opens the city map.
const params = new URLSearchParams(window.location.search);
const shotParam = parseInt(params.get('shot') || '0', 10);
if (shotParam >= 1 && shotParam <= 4) {
  if (shotParam === 2) {
    applyShot(game, 2);
    game.placeShotTraffic();
  } else if (shotParam === 4) {
    applyShot(game, 4);
    openMap();
  } else {
    game.state = 'playing';
    game.hud.show();
    game.hud.setRadio(game.radio.stationName + ' · ' + game.radio.stations[game.radio.stationIndex].label);
    game.hud.setTrack(game.radio.trackName);
    applyShot(game, shotParam);
    game.placeShotTraffic();
    // Re-stage the formation after traffic, so the cruisers sit exactly
    // where the shot wants them.
    game.police.stageFormation({ x: game.player.x, z: game.player.z }, game.player.heading, game.police.cruisers.length);
    if (game.police.wanted >= 3) game.police.stageHeliAhead({ x: game.player.x, z: game.player.z }, game.player.heading);
    updateCamera(1);
  }
}

document.getElementById('loading-note').style.display = 'none';
animate();
