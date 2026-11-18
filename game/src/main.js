// main.js — SOLMAR boot, golden-hour lighting, the game loop, the camera,
// pedestrians, cash pickups, the ferris wheel, and the game states.
// Shot mode (?shot=1..4) runs the chase LIVE: the car drives at speed, the
// police close in and the helicopter circles overhead while the camera rolls.
import * as THREE from "three";
import { buildCity } from "./city.js";
import { createInputHandler } from "./input.js";
import { createPlayer, updatePlayerOnFoot, tryEnterOrExitCar } from "./player.js";
import {
  spawnParkedCars, spawnTrafficCars, updateTrafficCar, drivePlayerCar,
} from "./vehicles.js";
import {
  createPoliceSystem, updatePolice, clearPolice, raiseWanted,
  spawnPoliceCar, spawnPoliceHelicopter,
} from "./police.js";
import {
  createMissionSystem, startMission, updateMissions, updateTaxiJob, startTaxiJob,
  missionStageText,
} from "./missions.js";
import {
  createCombatSystem, updateCombatEffects, updateEnemies, tryPunch, tryShoot,
  addCrashSparks, spawnEnemy, switchWeapon,
} from "./combat.js";
import { createHud } from "./hud.js";
import { createAudioSystem } from "./audio.js";
import { createSaveSystem } from "./save.js";
import { createShopSystem, nearestShop, openShop, closeShop } from "./shops.js";
import { readShotNumber, applyShotScene } from "./shots.js";

const canvas = document.getElementById("game-canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
// Golden hour over the coast: a warm orange sky, matching fog, and a low sun.
scene.background = new THREE.Color(0xff9e57);
scene.fog = new THREE.Fog(0xff9e57, 200, 480);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
camera.position.set(-40, 24, 80);

const sun = new THREE.DirectionalLight(0xffb36b, 1.5);
sun.position.set(-160, 55, 90);
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffd9b0, 0.6));
const duskFill = new THREE.HemisphereLight(0xffc98a, 0x3a2a4a, 0.35);
scene.add(duskFill);

const input = createInputHandler(canvas);
const hud = createHud();
const audio = createAudioSystem();
const save = createSaveSystem();
const city = buildCity(scene);
const player = createPlayer(scene, city.playerSpawn);
const cars = spawnParkedCars(scene, city);
const traffic = spawnTrafficCars(scene, 18);
const police = createPoliceSystem(scene);
const missions = createMissionSystem(scene);
const combat = createCombatSystem(scene);
const shops = createShopSystem(scene);

// The shared context every system reads: scene, player, city, HUD, audio, police.
const ctx = {
  scene, camera, renderer, sun, city, input, hud, audio, save,
  player, cars, traffic, police, missions, combat, shops,
  pedestrians: [],
  time: 0,
  timeOfDay: "sunset",
  cameraHeading: 0,
  cameraMode: "chase",
  cameraDistance: 13,
  state: "menu",
  gameOver,
  shotLive: false,
  effects: {
    addCrashSparks(x, y, z) { addCrashSparks(ctx, x, y, z); },
  },
};
ctx.police = police;

function gameOver(reason) {
  if (ctx.state === "over") return;
  ctx.state = "over";
  document.getElementById("gameover-text").textContent = reason;
  document.getElementById("gameover-overlay").style.display = "flex";
  audio.stopMusic();
  audio.setEnginePitch(0);
}

// --- Pedestrians -----------------------------------------------------------
const PED_COLORS = [0xff8c42, 0x37d67a, 0xe83a8a, 0x2a6fd8, 0xf2f2f2, 0xffd23e];
const PED_SHIRTS = [0xff8c42, 0x37d67a, 0xe83a8a, 0x2a6fd8, 0xf2f2f2, 0xffd23e, 0x9d6bd8, 0x37c8c8];
function spawnPedestrians(count) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    const group = new THREE.Group();
    const color = PED_SHIRTS[i % PED_SHIRTS.length];
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.95, 0.4),
      new THREE.MeshLambertMaterial({ color }));
    body.position.y = 1.1;
    group.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45),
      new THREE.MeshLambertMaterial({ color: 0xd9a066 }));
    head.position.y = 1.85;
    group.add(head);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.3),
      new THREE.MeshLambertMaterial({ color: 0x333a44 }));
    legs.position.y = 0.4;
    group.add(legs);
    const x = -180 + Math.random() * 360;
    const z = -180 + Math.random() * 360;
    group.position.set(x, 0, z);
    group.rotation.y = Math.random() * Math.PI * 2;
    scene.add(group);
    peds.push({
      mesh: group, heading: Math.random() * Math.PI * 2,
      speed: 1.2 + Math.random() * 1.2, fleeing: false, changeTimer: 2 + Math.random() * 3,
    });
  }
  return peds;
}

function updatePedestrians(dt) {
  for (const ped of ctx.pedestrians) {
    ped.changeTimer -= dt;
    const playerPos = player.inCar ? player.inCar.mesh.position : player.mesh.position;
    const dx = ped.mesh.position.x - playerPos.x;
    const dz = ped.mesh.position.z - playerPos.z;
    const distance = Math.hypot(dx, dz);
    if (player.wanted > 0 && distance < 22) ped.fleeing = true;
    if (ped.fleeing) {
      ped.heading = Math.atan2(dx, dz);
      const speed = 5;
      ped.mesh.position.x += Math.sin(ped.heading) * speed * dt;
      ped.mesh.position.z += Math.cos(ped.heading) * speed * dt;
      if (distance > 45) ped.fleeing = false;
    } else {
      if (ped.changeTimer <= 0) {
        ped.heading += (Math.random() - 0.5) * 1.8;
        ped.changeTimer = 2 + Math.random() * 4;
      }
      ped.mesh.position.x += Math.sin(ped.heading) * ped.speed * dt;
      ped.mesh.position.z += Math.cos(ped.heading) * ped.speed * dt;
    }
    ped.mesh.position.x = Math.max(-195, Math.min(195, ped.mesh.position.x));
    ped.mesh.position.z = Math.max(-195, Math.min(195, ped.mesh.position.z));
    ped.mesh.rotation.y = ped.heading;
  }
}

ctx.pedestrians = spawnPedestrians(34);

// --- Cash pickups ----------------------------------------------------------
const cashPickups = [];
function spawnCashPickups() {
  const geo = new THREE.BoxGeometry(0.9, 0.5, 0.5);
  const mat = new THREE.MeshBasicMaterial({ color: 0x37d67a });
  const spots = [
    [-110, -110], [110, 110], [0, -110], [-110, 0], [110, -55],
    [55, 110], [-55, -110], [165, 110], [-165, -55], [55, 0],
    [-165, 165], [165, -165],
  ];
  for (const [x, z] of spots) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.8, z);
    scene.add(mesh);
    cashPickups.push({ mesh, x, z, taken: false });
  }
}
spawnCashPickups();

function updateCashPickups(dt) {
  const pos = player.inCar ? player.inCar.mesh.position : player.mesh.position;
  for (const pickup of cashPickups) {
    if (pickup.taken) continue;
    pickup.mesh.rotation.y += dt * 2;
    pickup.mesh.position.y = 0.8 + Math.sin(ctx.time * 3 + pickup.x) * 0.25;
    const distance = Math.hypot(pos.x - pickup.x, pos.z - pickup.z);
    if (distance < 3) {
      pickup.taken = true;
      pickup.mesh.visible = false;
      player.cash += 100;
      hud.showToast("Found street cash! +$100");
      audio.playCash();
    }
  }
}

// --- Camera ----------------------------------------------------------------
const CAMERA_MODES = ["chase", "chase-far", "follow", "wide"];
function updateCamera(dt) {
  const target = player.inCar ? player.inCar.mesh.position : player.mesh.position;
  const heading = player.inCar ? player.inCar.heading : player.heading;
  let desiredHeading = heading;
  if (ctx.cameraMode === "wide") desiredHeading = heading + 0.6;
  // On foot the camera holds its angle: letting it chase the player's heading
  // feeds back into camera-relative walking and Rio spirals while strafing.
  // Behind the wheel the camera follows the car, which steers on its own.
  if (!player.inCar && !ctx.shotLive) desiredHeading = ctx.cameraHeading;
  let diff = desiredHeading - ctx.cameraHeading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  ctx.cameraHeading += diff * Math.min(1, dt * 6);
  const distances = { chase: 15, "chase-far": 20, follow: 9, wide: 30 };
  const heights = { chase: 6.5, "chase-far": 8, follow: 4, wide: 14 };
  const distance = distances[ctx.cameraMode] || 13;
  const height = heights[ctx.cameraMode] || 5.5;
  const cameraX = target.x - Math.sin(ctx.cameraHeading) * distance;
  const cameraZ = target.z - Math.cos(ctx.cameraHeading) * distance;
  camera.position.x += (cameraX - camera.position.x) * Math.min(1, dt * 6);
  camera.position.y += (height - camera.position.y) * Math.min(1, dt * 6);
  camera.position.z += (cameraZ - camera.position.z) * Math.min(1, dt * 6);
  camera.lookAt(target.x, 2.2, target.z);
}

// --- Rival crew during the heist -------------------------------------------
let heistSpawnedFor = -1;
function maybeSpawnHeistEnemies() {
  if (missions.index === 4 && heistSpawnedFor !== 4) {
    heistSpawnedFor = 4;
    spawnEnemy(ctx, 62, -48);
    spawnEnemy(ctx, 48, -62);
    hud.showToast("Rival crew is guarding the bank!");
  }
  if (missions.index === 5 && heistSpawnedFor !== 5) {
    heistSpawnedFor = 5;
    spawnEnemy(ctx, -160, -100);
    spawnEnemy(ctx, -150, -122);
    hud.showToast("The informant's friends are watching the wheel!");
  }
}

// --- Live shot mode ----------------------------------------------------------
// In shot mode the game plays itself: Rio's car holds its staged speed down
// the road, cruisers chase and the helicopter circles, so the frame is a
// moving chase, not a frozen tableau. No input, no mission progress, no bust.
function updateShotLive(dt) {
  const car = player.inCar;
  if (car) {
    car.speed = ctx.shotSpeed || 28;
    car.mesh.position.x += Math.sin(car.heading) * car.speed * dt;
    car.mesh.position.z += Math.cos(car.heading) * car.speed * dt;
    car.mesh.position.x = Math.max(-198, Math.min(198, car.mesh.position.x));
    car.mesh.position.z = Math.max(-198, Math.min(198, car.mesh.position.z));
    car.mesh.rotation.y = car.heading;
    for (const wheel of car.wheels) wheel.rotation.x += (car.speed * dt) / 0.42;
    audio.setEnginePitch(0);
  }
  for (const tcar of traffic) updateTrafficCar(tcar, dt);
  updatePedestrians(dt);
  updatePolice(ctx, dt);
  updateCombatEffects(ctx, dt);
  updateEnemies(ctx, dt);
  updateCamera(dt);
  hud.update(ctx);
}

// --- Main loop ---------------------------------------------------------------
const clock = new THREE.Clock();
let taxiCooldown = 20;

function animate() {
  requestAnimationFrame(animate);
  window.SOLMAR_FRAMES = (window.SOLMAR_FRAMES || 0) + 1;
  const dt = Math.min(clock.getDelta(), 0.05);
  ctx.time += dt;

  // The big wheel turns and the tower beacon blinks, in every mode.
  if (city.ferrisWheel) city.ferrisWheel.rotation.z += dt * 0.12;
  const towerBeacon = scene.getObjectByName("tower-beacon");
  if (towerBeacon) {
    towerBeacon.visible = Math.floor(ctx.time * 1.5) % 2 === 0;
  }

  if (ctx.shotLive) {
    updateShotLive(dt);
  } else if (ctx.state === "playing") {
    if (input.wasPressed("KeyP") || input.wasPressed("Escape")) {
      ctx.state = "paused";
      document.getElementById("pause-overlay").style.display = "flex";
      audio.setEnginePitch(0);
    }
    if (input.wasPressed("KeyE")) {
      const shop = nearestShop(ctx, 8);
      if (shop) openShop(ctx, shop);
      else tryEnterOrExitCar(ctx);
    }
    if (input.wasPressed("KeyC")) {
      const next = (CAMERA_MODES.indexOf(ctx.cameraMode) + 1) % CAMERA_MODES.length;
      ctx.cameraMode = CAMERA_MODES[next];
      hud.showToast("Camera: " + ctx.cameraMode);
    }
    if (input.wasPressed("KeyM")) {
      const muted = audio.toggleMute();
      document.getElementById("sound-btn").textContent = "Sound: " + (muted ? "OFF" : "ON");
    }
    if (input.wasPressed("KeyL")) save.saveGame(ctx);
    if (input.wasPressed("KeyF")) tryPunch(ctx);
    if (input.wasPressed("KeyT")) startTaxiJob(ctx);
    if (input.wasPressed("Digit1")) switchWeapon(ctx, "pistol");
    if (input.wasPressed("Digit2")) switchWeapon(ctx, "smg");
    if (input.wasPressed("Digit3")) switchWeapon(ctx, "shotgun");
    if (input.wasPressed("KeyR")) {
      const station = audio.nextStation();
      hud.setRadio(station.name, station.track);
      hud.showToast("Radio: " + station.name);
    }
    if (input.mouseClicked()) tryShoot(ctx);
    if (input.mouseDown() && player.weapon === "smg") tryShoot(ctx);

    if (player.inCar) {
      drivePlayerCar(ctx, player.inCar, dt);
      hud.setCrosshairVisible(false);
    } else {
      updatePlayerOnFoot(ctx, dt);
      hud.setCrosshairVisible(true);
      audio.setEnginePitch(0);
    }
    for (const car of traffic) updateTrafficCar(car, dt);
    updatePedestrians(dt);
    updatePolice(ctx, dt);
    updateMissions(ctx, dt);
    updateTaxiJob(ctx, dt);
    updateCombatEffects(ctx, dt);
    updateEnemies(ctx, dt);
    updateCashPickups(dt);
    maybeSpawnHeistEnemies();

    // Slow health recovery when the heat is off.
    if (player.wanted === 0 && player.health > 0 && player.health < 100) {
      player.health = Math.min(100, player.health + dt * 2);
    }
    if (player.health <= 0) {
      gameOver("Rio took too many hits and the run ended on the Solmar streets.");
    }
    // A quiet stretch with no mission marker invites a taxi fare.
    taxiCooldown -= dt;
    if (taxiCooldown <= 0 && !missions.taxi && missions.index >= 1) {
      taxiCooldown = 45;
      if (Math.random() < 0.4) startTaxiJob(ctx);
    }
    updateCamera(dt);
    hud.update(ctx);
  }

  // The beacon pulses so the objective is easy to spot from across the city.
  if (missions.beacon.visible) {
    missions.beacon.rotation.y += dt * 0.8;
    missions.beacon.material.opacity = 0.28 + Math.sin(ctx.time * 4) * 0.1;
  }
  input.endFrame();
  renderer.render(scene, camera);
}

// --- Menus -------------------------------------------------------------------
function startGame(fromSave) {
  audio.unlock();
  audio.startMusic();
  const station = audio.station();
  hud.setRadio(station.name, station.track);
  document.getElementById("start-overlay").style.display = "none";
  document.getElementById("pause-overlay").style.display = "none";
  document.getElementById("gameover-overlay").style.display = "none";
  if (fromSave) {
    const data = save.loadGame(ctx);
    if (data) {
      hud.showToast("Save loaded — welcome back to Solmar");
      startMission(ctx, ctx.missions.index);
    } else {
      hud.showToast("No save found — starting a new story");
      startMission(ctx, 0);
    }
  } else {
    player.cash = 0;
    player.health = 100;
    player.rep = 0;
    player.wanted = 0;
    player.ammo = 24;
    player.weapon = "pistol";
    player.weapons = { pistol: true, smg: false, shotgun: false };
    player.ammoByWeapon = { pistol: 24, smg: 0, shotgun: 0 };
    missions.index = 0;
    missions.completed = 0;
    missions.finished = false;
    heistSpawnedFor = -1;
    clearPolice(ctx);
    player.mesh.position.set(city.playerSpawn.x, 0, city.playerSpawn.z);
    startMission(ctx, 0);
  }
  ctx.state = "playing";
}

document.getElementById("start-btn").addEventListener("click", () => startGame(false));
document.getElementById("continue-btn").addEventListener("click", () => startGame(true));
document.getElementById("resume-btn").addEventListener("click", () => {
  document.getElementById("pause-overlay").style.display = "none";
  ctx.state = "playing";
});
document.getElementById("save-btn").addEventListener("click", () => save.saveGame(ctx));
document.getElementById("restart-btn").addEventListener("click", () => startGame(false));
document.getElementById("retry-btn").addEventListener("click", () => startGame(false));
document.getElementById("shop-close-btn").addEventListener("click", () => closeShop(ctx));
document.getElementById("sound-btn").addEventListener("click", () => {
  const muted = audio.toggleMute();
  document.getElementById("sound-btn").textContent = "Sound: " + (muted ? "OFF" : "ON");
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// A tiny debug handle for play-testing: position, heading and car state.
window.SOLMAR_DEBUG = () => ({
  x: Math.round((player.inCar ? player.inCar.mesh.position.x : player.mesh.position.x) * 10) / 10,
  z: Math.round((player.inCar ? player.inCar.mesh.position.z : player.mesh.position.z) * 10) / 10,
  heading: Math.round((player.inCar ? player.inCar.heading : player.heading) * 100) / 100,
  cameraHeading: Math.round(ctx.cameraHeading * 100) / 100,
  inCar: !!player.inCar,
  speed: player.inCar ? Math.round(player.inCar.speed * 3.6) : 0,
  wanted: player.wanted,
  mission: missions.index + 1,
  stage: missionStageText(missions),
  heli: !!police.heli,
  policeCars: police.cars.length,
  frames: window.SOLMAR_FRAMES || 0,
  time: Math.round(ctx.time * 100) / 100,
  shotLive: !!ctx.shotLive,
});

// --- Screenshot scenes -------------------------------------------------------
const shot = readShotNumber();
if (shot > 0) {
  document.getElementById("start-overlay").style.display = "none";
  ctx.state = "playing";
  applyShotScene(ctx, shot);
  // Let the first frames settle, then roll the live chase for the shot.
  updateCamera(0.5);
  hud.update(ctx);
} else {
  hud.setObjective("SOLMAR CITY", "Welcome to Solmar. Steal a car and meet Marco at the docks.", "8 MISSIONS · GOLDEN HOUR");
}

animate();
