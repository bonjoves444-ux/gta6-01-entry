// SOLMAR — bootstrap and the main loop. Wires every system together:
// city, player, cars, police, missions, combat, shops, HUD, audio, input,
// saves and the live-shot staging the screenshots use.
import * as THREE from 'three';
import { createRng, range, pick } from './random.js';
import { buildCity, updateCity } from './city.js';
import { makeCar, spawnTraffic, updateTraffic, drivePlayerCar, syncCar, forwardOf } from './vehicles.js';
import { createPlayer, updatePlayer, nearestCar, enterCar, exitCar, punch, tickPlayer } from './player.js';
import { setWanted, ensurePolice, updatePolice } from './police.js';
import { currentMission, makeMarker, moveMarker, updateMissions } from './missions.js';
import { switchWeapon, shoot, updateCombat } from './combat.js';
import { buildShops, nearestShop, openShop, closeShop } from './shops.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { saveGame, loadGame, applySave } from './save.js';
import { shotFromUrl, applyShot, updateLiveShot, debugSnapshot } from './shots.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.domElement.id = 'game-canvas';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
camera.position.set(-55, 5, 70);

const G = {
  scene,
  camera,
  renderer,
  rng: createRng(20261118),
  time: 0,
  frames: 0,
  started: false,
  paused: false,
  liveShot: false,
  shotNum: 0,
  policePinned: false,
  dusk: false,
  targetSpeed: 0,
  city: null,
  player: null,
  cars: [],
  cruisers: [],
  heli: null,
  enemies: [],
  tracers: [],
  peds: [],
  missions: { index: 0, step: 0 },
  fareTimer: 30,
  fare: null,
  fareMarker: null,
  marker: null,
  shopOpen: null,
  camMode: 0,
  busted: false,
  fireCooldown: 0,
};

G.input = createInput();
G.audio = createAudio(G);
G.city = buildCity(G);
G.player = createPlayer(G);
G.player.wanted = 0;
G.hud = createHud(G);
buildShops(G);
spawnTraffic(G, 12);

// Two parked cars near the spawn: the first thing a new player steals.
for (const [px, pz, h] of [[-52, 46, 0.4], [-46, 64, -0.3]]) {
  const parked = makeCar(G, { x: px, z: pz, heading: h });
  parked.parked = true;
  G.cars.push(parked);
}

// Pedestrians strolling the sidewalks.
function createPeds() {
  const rng = createRng(4242);
  const cols = [0xe85d3d, 0x2f8f6b, 0xe8a13d, 0x7a5a9a, 0x3a6bc2];
  const roads = [-120, -60, 0, 60, 120];
  for (let i = 0; i < 14; i++) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.9, 0.35),
      new THREE.MeshLambertMaterial({ color: pick(rng, cols) })
    );
    body.position.y = 1.05;
    group.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 10, 8),
      new THREE.MeshLambertMaterial({ color: 0xd9a986 })
    );
    head.position.y = 1.7;
    group.add(head);
    const vertical = rng() < 0.5;
    const road = pick(rng, roads);
    const ped = {
      group,
      axis: vertical ? 'z' : 'x',
      lane: road + (rng() < 0.5 ? 7.5 : -7.5),
      pos: range(rng, -160, 200),
      dir: rng() < 0.5 ? 1 : -1,
      speed: range(rng, 1.2, 2.4),
    };
    G.scene.add(group);
    G.peds.push(ped);
  }
}
createPeds();

function updatePeds(dt) {
  for (const ped of G.peds) {
    ped.pos += ped.dir * ped.speed * dt;
    if (ped.pos > 210) ped.pos = -170;
    if (ped.pos < -170) ped.pos = 210;
    if (ped.axis === 'z') {
      ped.group.position.set(ped.lane, 0, ped.pos);
      ped.group.rotation.y = ped.dir > 0 ? 0 : Math.PI;
    } else {
      ped.group.position.set(ped.pos, 0, ped.lane);
      ped.group.rotation.y = ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    ped.group.position.y = Math.abs(Math.sin(G.time * 6 + ped.pos)) * 0.06;
  }
}

G.marker = makeMarker(G);
moveMarker(G);
const fareRing = new THREE.Mesh(
  new THREE.CylinderGeometry(4, 4, 0.25, 24),
  new THREE.MeshBasicMaterial({ color: 0x3ddc5a, transparent: true, opacity: 0.55 })
);
fareRing.position.y = 0.1;
fareRing.visible = false;
scene.add(fareRing);
G.fareMarker = fareRing;

function updateCamera(dt) {
  const p = G.player;
  const dists = p.inCar ? [9, 14, 20] : [8, 12, 14];
  const heights = p.inCar ? [3.2, 6, 11] : [4.5, 7, 8.5];
  const dist = dists[G.camMode];
  const height = heights[G.camMode];
  const heading = p.inCar ? p.heading : p.camHeading;
  const f = forwardOf(heading);
  const tx = p.x - f.x * dist;
  const tz = p.z - f.z * dist;
  const k = G.frames < 3 ? 1 : 1 - Math.pow(0.002, dt);
  camera.position.x += (tx - camera.position.x) * k;
  camera.position.y += (height - camera.position.y) * k;
  camera.position.z += (tz - camera.position.z) * k;
  camera.lookAt(p.x + f.x * 6, 1.6, p.z + f.z * 6);
}

function handlePressed() {
  const pressed = G.input.pressed.splice(0);
  for (const code of pressed) {
    if (code === 'KeyE') {
      if (G.shopOpen) {
        closeShop(G);
      } else if (G.player.inCar) {
        exitCar(G);
      } else {
        const shop = nearestShop(G);
        if (shop) openShop(G, shop);
        else {
          const car = nearestCar(G, 4.5);
          if (car) enterCar(G, car);
        }
      }
    } else if (code === 'KeyF') {
      punch(G);
    } else if (code === 'KeyR') {
      G.audio.cycle();
      G.hud.showToast(G, `Radio: ${G.audio.stationInfo().name}`);
    } else if (code === 'KeyC') {
      G.camMode = (G.camMode + 1) % 3;
      G.hud.showToast(G, ['Camera: chase', 'Camera: far', 'Camera: wide'][G.camMode]);
    } else if (code === 'KeyP' || code === 'Escape') {
      if (G.started && !G.liveShot) {
        if (G.shopOpen) closeShop(G);
        G.paused = !G.paused;
        document.getElementById('pause-overlay').style.display = G.paused ? 'flex' : 'none';
      }
    } else if (code === 'KeyL') {
      if (saveGame(G)) G.hud.showToast(G, `Game saved — $${G.player.cash.toLocaleString()} in the bank.`);
      else G.hud.showToast(G, 'Save failed — storage unavailable.');
    } else if (code === 'KeyM') {
      const muted = G.audio.toggleMute();
      G.hud.showToast(G, muted ? 'Sound muted.' : 'Sound on.');
    } else if (code === 'Digit1') switchWeapon(G, 1);
    else if (code === 'Digit2') switchWeapon(G, 2);
    else if (code === 'Digit3') switchWeapon(G, 3);
  }
  if (G.input.mouseClicked) {
    G.input.mouseClicked = false;
    if (G.started && !G.paused && !G.shopOpen) shoot(G);
  }
  if (G.input.mouseDown && G.started && !G.paused && !G.shopOpen) {
    const w = G.player.weapons[G.player.weapon];
    if (w && w.owned) {
      const auto = G.player.weapon === 'smg';
      if (auto && G.fireCooldown <= 0) {
        shoot(G);
        G.fireCooldown = 0.13;
      }
    }
  }
}

function wireButtons() {
  document.getElementById('start-btn').addEventListener('click', () => {
    G.audio.ensure();
    G.started = true;
    document.getElementById('start-overlay').style.display = 'none';
    const saved = loadGame();
    if (saved) {
      applySave(G, saved);
      moveMarker(G);
      G.hud.showToast(G, 'Save loaded — welcome back to Solmar.');
    }
    const m = currentMission(G);
    G.hud.showDialogue(G, m.speaker, m.line, 7);
  });
  document.getElementById('resume-btn').addEventListener('click', () => {
    G.paused = false;
    document.getElementById('pause-overlay').style.display = 'none';
  });
  document.getElementById('shop-close-btn').addEventListener('click', () => closeShop(G));
}

wireButtons();

const shot = shotFromUrl();
if (shot > 0) {
  applyShot(G, shot);
}

window.SOLMAR_DEBUG = () => debugSnapshot(G);
window.SOLMAR_FRAMES = 0;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!G.paused) {
    G.time += dt;
    G.frames++;
    if (G.fireCooldown > 0) G.fireCooldown -= dt;
    handlePressed();
    if (G.liveShot) {
      updateLiveShot(G, dt);
    } else if (G.started) {
      if (G.player.inCar) drivePlayerCar(G, dt);
      else updatePlayer(G, dt);
      tickPlayer(G, dt);
      updateMissions(G, dt);
    }
    updateTraffic(G, dt);
    updatePeds(dt);
    ensurePolice(G);
    updatePolice(G, dt);
    updateCombat(G, dt);
    updateCity(G, dt);
    G.audio.update();
  }
  updateCamera(dt);
  G.hud.update(G);
  window.SOLMAR_FRAMES = G.frames;
  renderer.render(scene, camera);
}
animate();
