// shots.js — deterministic ?shot= scenes for the four screenshots.
// Each shot sets the time of day, Rio's place and vehicle, the wanted level,
// the mission state and the dialogue, then the normal loop rolls the scene
// LIVE: the car holds its speed, the police close in and the helicopter
// circles overhead. No shot edits the game: they only arrange what the
// camera sees, and the motion is real.
import { spawnPoliceCar, spawnPoliceHelicopter } from "./police.js";
import { startMission } from "./missions.js";
import { spawnEnemy } from "./combat.js";

export function readShotNumber() {
  const params = new URLSearchParams(window.location.search);
  const shot = parseInt(params.get("shot") || "", 10);
  return Number.isFinite(shot) && shot >= 1 && shot <= 4 ? shot : 0;
}

function placePlayerInCar(ctx, carIndex, x, z, heading, speed) {
  const car = ctx.cars[carIndex];
  car.mesh.position.set(x, 0, z);
  car.heading = heading;
  car.mesh.rotation.y = heading;
  car.parked = false;
  car.speed = speed;
  ctx.shotSpeed = speed;
  ctx.player.inCar = car;
  ctx.player.mesh.visible = false;
  ctx.player.mesh.position.set(x, 0, z);
}

function placePlayerOnFoot(ctx, x, z, heading) {
  ctx.player.inCar = null;
  ctx.player.mesh.visible = true;
  ctx.player.mesh.position.set(x, 0, z);
  ctx.player.heading = heading;
  ctx.player.mesh.rotation.y = heading;
}

function setGoldenHour(ctx, sunIntensity) {
  ctx.sun.intensity = sunIntensity;
  ctx.sun.color.setHex(0xffb36b);
  ctx.sun.position.set(-160, 55, 90);
  ctx.scene.background.setHex(0xff9e57);
  ctx.scene.fog.color.setHex(0xff9e57);
}

function stageCruisersBehind(ctx, count, aheadX, aheadZ, heading) {
  for (let i = 0; i < count; i++) spawnPoliceCar(ctx);
  ctx.police.cars.forEach((car, i) => {
    // Cruisers flank Rio's tail in the next lanes, so they read in the frame
    // beside his car instead of filling the gap between camera and player.
    const side = i % 2 === 0 ? -5.5 : 5.5;
    const behind = 7 + i * 6;
    car.mesh.position.set(
      aheadX - Math.sin(heading) * behind + Math.cos(heading) * side, 0,
      aheadZ - Math.cos(heading) * behind - Math.sin(heading) * side);
    car.heading = heading;
    car.mesh.rotation.y = heading;
    car.speed = 26 + i * 2;
  });
  // No extra cruisers wander in during the shot: the staged ones are the cast.
  ctx.police.spawnTimer = 9999;
}

export function applyShotScene(ctx, shot) {
  const city = ctx.city;
  // Live mode: the loop keeps driving, chasing and circling for the shot.
  ctx.shotLive = true;
  ctx.timeOfDay = "sunset";
  setGoldenHour(ctx, 1.5);
  // Dialogue stays pinned for the whole screenshot render.
  const pinDialogue = (name, line, color) => ctx.hud.showDialogue(name, line, color, 30000);
  if (shot === 1) {
    // COVER: a police chase at speed up the beachfront avenue — the sea on
    // the left, the wheel ahead, four stars, three cruisers on Rio's tail and
    // the helicopter overhead with its searchlight on him.
    placePlayerInCar(ctx, 0, -165, 40, Math.PI, 30);
    ctx.player.cash = 2450;
    ctx.player.rep = 62;
    ctx.player.wanted = 4;
    ctx.police.heat = 100;
    stageCruisersBehind(ctx, 3, -165, 40, Math.PI);
    spawnPoliceHelicopter(ctx);
    // Traffic ahead on the beachfront avenue, so the road is alive.
    ctx.traffic.forEach((car, i) => {
      car.mesh.position.set(-165 + (i % 2 ? 5 : -5), 0, -10 - i * 22);
      car.routeAxis = "z";
    });
    ctx.hud.setObjective("3 — Hot Pursuit", "Lose the police — get your wanted level to zero", "MISSION 3/8 · STEP 1/1");
    pinDialogue("MARCO", "They made us! Lose them on the beachfront — cut through the market and don't stop.", "#ffd23e");
    const station = ctx.audio.station();
    ctx.hud.setRadio(station.name, station.track);
    ctx.cameraMode = "chase-far";
  } else if (shot === 2) {
    // Downtown at speed: Rio threading traffic between the neon towers, the
    // informant's job on the HUD, one star and two cruisers closing in.
    // He drives north into downtown, Marina Tower ahead on the right.
    placePlayerInCar(ctx, 2, 0, 110, Math.PI, 24);
    ctx.player.cash = 4300;
    ctx.player.rep = 48;
    ctx.player.wanted = 1;
    ctx.police.heat = 100;
    stageCruisersBehind(ctx, 2, 0, 110, Math.PI);
    ctx.traffic.forEach((car, i) => {
      car.mesh.position.set(-55 + (i % 3) * 55, 0, 55 - i * 12);
      car.routeAxis = "z";
    });
    ctx.hud.setObjective("6 — The Informant", "Meet the informant by the Solmar Wheel (press E)", "MISSION 6/8 · STEP 1/2");
    pinDialogue("LENA", "The informant waits by the wheel, north beach. Grab the envelope — and don't let his friends follow you.", "#7dd8ff");
    const station = ctx.audio.station();
    ctx.hud.setRadio(station.name, station.track);
    ctx.cameraMode = "chase";
  } else if (shot === 3) {
    // On foot at the market: the pickup job, gold beacon over the stalls, the
    // SMG in Rio's hands, two rivals closing in and the wheel on the skyline.
    placePlayerOnFoot(ctx, -6, 122, 0);
    ctx.player.cash = 1800;
    ctx.player.rep = 35;
    ctx.player.wanted = 0;
    ctx.player.weapons.smg = true;
    ctx.player.ammoByWeapon.smg = 120;
    ctx.player.weapon = "smg";
    ctx.player.ammo = 120;
    ctx.player.hasPackage = false;
    startMission(ctx, 1);
    spawnEnemy(ctx, -14, 128);
    spawnEnemy(ctx, 8, 126);
    ctx.hud.setObjective("2 — The Pickup", "Pick up the package at the market (press E)", "MISSION 2/8 · STEP 1/2");
    pinDialogue("LENA", "Package is at the market stalls, south side. On foot, Rio — no heat on this one.", "#7dd8ff");
    // Wide high camera: the stalls, the beacon, Rio and both rivals in one frame.
    ctx.cameraMode = "wide";
    ctx.cameraHeading = 0.6;
  } else if (shot === 4) {
    // Dusk heist escape: five stars, the helicopter and three cruisers on a
    // NOS-lit run down the beach promenade, the wheel glowing behind Rio.
    placePlayerInCar(ctx, 4, -165, 120, Math.PI, 32);
    ctx.player.cash = 12500;
    ctx.player.rep = 88;
    ctx.player.wanted = 5;
    ctx.police.heat = 100;
    stageCruisersBehind(ctx, 3, -165, 120, Math.PI);
    spawnPoliceHelicopter(ctx);
    ctx.sun.intensity = 1.1;
    ctx.scene.background.setHex(0xe87a4a);
    ctx.scene.fog.color.setHex(0xe87a4a);
    ctx.hud.setObjective("8 — King of the Coast", "Vanish down the beach promenade", "MISSION 8/8 · STEP 2/2");
    pinDialogue("LENA", "Last one, Rio. Hold the plaza, keep the cops off me, and we own this city.", "#7dd8ff");
    const station = ctx.audio.station();
    ctx.hud.setRadio(station.name, station.track);
    ctx.cameraMode = "chase-far";
  }
  ctx.hud.update(ctx);
  return shot;
}
