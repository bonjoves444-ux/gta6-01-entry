// Screenshot staging: ?shot=N puts the game into a live scene — the car
// holds a fixed speed, police chase, the helicopter circles, traffic and
// pedestrians keep moving — with no input, no mission progress and no
// game over. The debug snapshot reads speed from the car, never the body.
import { makeCar, syncCar, forwardOf } from './vehicles.js';
import { spawnCruiser, spawnHeli, clearCruisers, removeHeli } from './police.js';
import { spawnRival } from './combat.js';
import { currentMission, moveMarker, stageText } from './missions.js';

export function shotFromUrl() {
  try {
    const n = parseInt(new URLSearchParams(window.location.search).get('shot') || '0', 10);
    return n >= 1 && n <= 4 ? n : 0;
  } catch (e) {
    return 0;
  }
}

function putPlayerInCar(G, x, z, heading, speed) {
  const p = G.player;
  if (p.car) {
    G.scene.remove(p.car.group);
    p.car = null;
  }
  const car = makeCar(G, { x, z, heading, name: 'Solmar Comet', nos: true, color: 0xe85a2a });
  car.speed = speed;
  p.inCar = true;
  p.car = car;
  p.group.visible = false;
  p.x = x;
  p.z = z;
  p.heading = heading;
  syncCar(car);
  return car;
}

function stageTrafficAhead(G, roadX, zList) {
  for (const z of zList) {
    const car = makeCar(G, {
      traffic: true, axis: 'z', road: roadX, dir: -1,
      x: roadX - 2.4, z, heading: Math.PI,
    });
    car.speed = 12;
    G.cars.push(car);
  }
}

// Put a staged cruiser into its ahead-flanking formation slot so the
// forward-facing chase camera actually sees it, lightbar and all.
function placeCruiserAhead(G, car) {
  const p = G.player;
  const f = forwardOf(p.heading);
  const px = -f.z;
  const pz = f.x;
  const lane = car.lane || 0;
  car.x = p.x + f.x * 16 + px * lane * 5.5;
  car.z = p.z + f.z * 16 + pz * lane * 5.5;
  car.heading = p.heading;
  car.speed = G.targetSpeed;
  syncCar(car);
}

function parkHeliAhead(G) {
  // The helicopter circles; start it ahead of the player (north) so it
  // sits inside the chase camera's frame from the first second.
  if (G.heli) G.heli.angle = -Math.PI / 2;
}

export function applyShot(G, n) {
  G.liveShot = true;
  G.shotNum = n;
  G.started = true;
  G.policePinned = true;
  clearCruisers(G);
  removeHeli(G);
  for (const e of G.enemies) G.scene.remove(e.group);
  G.enemies = [];
  document.getElementById('start-overlay').style.display = 'none';
  document.getElementById('pause-overlay').style.display = 'none';
  document.getElementById('shop-overlay').style.display = 'none';

  if (n === 1) {
    G.missions.index = 2;
    G.missions.step = 0;
    G.player.wanted = 4;
    putPlayerInCar(G, -165, 40, Math.PI, 30);
    G.targetSpeed = 30;
    G.camMode = 1;
    spawnCruiser(G, -1);
    spawnCruiser(G, 0);
    spawnCruiser(G, 1);
    for (const c of G.cruisers) placeCruiserAhead(G, c);
    spawnHeli(G);
    parkHeliAhead(G);
    stageTrafficAhead(G, -165, [8, -22, -52]);
    G.hud.showDialogue(G, 'MARCO', 'They made us! Lose them on the beachfront — cut through the market and don’t stop.', 30);
  } else if (n === 2) {
    G.missions.index = 5;
    G.missions.step = 0;
    G.player.wanted = 1;
    putPlayerInCar(G, 0, 110, Math.PI, 24);
    G.targetSpeed = 24;
    G.camMode = 0;
    spawnCruiser(G, -1);
    spawnCruiser(G, 1);
    for (const c of G.cruisers) placeCruiserAhead(G, c);
    stageTrafficAhead(G, 0, [78, 52]);
    const extra = makeCar(G, { traffic: true, axis: 'x', road: 120, dir: 1, x: -40, z: 117.6, heading: Math.PI / 2 });
    extra.speed = 11;
    G.cars.push(extra);
    G.hud.showDialogue(G, 'LENA', 'He is waiting by the neon towers. One star is fine — five is a funeral.', 30);
  } else if (n === 3) {
    G.missions.index = 1;
    G.missions.step = 0;
    G.player.wanted = 0;
    const p = G.player;
    if (p.car) {
      G.scene.remove(p.car.group);
      p.car = null;
    }
    p.inCar = false;
    p.group.visible = true;
    p.x = -6;
    p.z = 122;
    p.heading = Math.PI;
    p.camHeading = Math.PI - 0.6;
    p.group.position.set(p.x, 0, p.z);
    p.group.rotation.y = p.heading;
    p.weapons.smg.owned = true;
    p.weapons.smg.ammo = 120;
    p.weapon = 'smg';
    G.targetSpeed = 0;
    G.camMode = 2;
    spawnRival(G, -14, 128);
    spawnRival(G, 11, 123);
    G.hud.showDialogue(G, 'LENA', 'Two of Vex’s boys are waiting by the stalls. Handle them, then grab the package.', 30);
  } else {
    G.missions.index = 7;
    G.missions.step = 1;
    G.player.wanted = 5;
    G.city.setDusk(true);
    G.dusk = true;
    putPlayerInCar(G, -165, 120, Math.PI, 32);
    G.targetSpeed = 32;
    G.camMode = 1;
    spawnCruiser(G, -1);
    spawnCruiser(G, 0);
    spawnCruiser(G, 1);
    for (const c of G.cruisers) placeCruiserAhead(G, c);
    spawnHeli(G);
    parkHeliAhead(G);
    stageTrafficAhead(G, -165, [88, 58]);
    G.hud.showDialogue(G, 'LENA', 'Five stars, one road, and the whole city watching. Drive like you own it.', 30);
  }
  moveMarker(G);
  // The marker's sky beam reads as a glitch stripe in a still frame, so
  // shots keep the gold ground ring and hide the beam; the fare marker
  // stays hidden too.
  if (G.marker && G.marker.userData.beam) G.marker.userData.beam.visible = false;
  if (G.fareMarker) G.fareMarker.visible = false;
  const m = currentMission(G);
  G.hud.showToast(G, `${m.title} — ${stageText(G)}`);
}

export function updateLiveShot(G, dt) {
  const p = G.player;
  if (p.inCar && p.car) {
    const car = p.car;
    car.speed = G.targetSpeed;
    const f = forwardOf(car.heading);
    const nx = car.x + f.x * car.speed * dt;
    const nz = car.z + f.z * car.speed * dt;
    const fixed = G.city.collide(nx, nz, 1.6);
    car.x = fixed.x;
    car.z = fixed.z;
    p.x = car.x;
    p.z = car.z;
    p.heading = car.heading;
    syncCar(car);
  }
}

export function debugSnapshot(G) {
  const p = G.player;
  const kmh = p.inCar && p.car ? Math.round(Math.abs(p.car.speed) * 3.6) : 0;
  return {
    x: Math.round(p.x * 10) / 10,
    z: Math.round(p.z * 10) / 10,
    heading: Math.round(p.heading * 100) / 100,
    camHeading: Math.round(p.camHeading * 100) / 100,
    inCar: p.inCar,
    speedKmh: kmh,
    wanted: p.wanted || 0,
    mission: G.missions.index + 1,
    stage: stageText(G),
    heli: !!G.heli,
    police: G.cruisers.length,
    frames: G.frames,
    time: Math.round(G.time * 100) / 100,
    liveShot: G.liveShot,
  };
}
