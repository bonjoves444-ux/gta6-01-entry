// shots.js — deterministic ?shot= scenes for the four screenshots.
// Each shot sets the time of day, Rio's place and vehicle, the wanted level and the
// mission state, then lets the normal render loop draw the frame. No shot edits the
// game: they only arrange what the camera sees.
import { spawnPoliceCar } from "./police.js";
import { startMission } from "./missions.js";

export function readShotNumber() {
  const params = new URLSearchParams(window.location.search);
  const shot = parseInt(params.get("shot") || "", 10);
  return Number.isFinite(shot) && shot >= 1 && shot <= 4 ? shot : 0;
}

function placePlayerInCar(ctx, carIndex, x, z, heading) {
  const car = ctx.cars[carIndex];
  car.mesh.position.set(x, 0, z);
  car.heading = heading;
  car.mesh.rotation.y = heading;
  car.parked = false;
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

export function applyShotScene(ctx, shot) {
  const city = ctx.city;
  // Freeze gameplay motion for the shot: the frame is a still tableau of the
  // live game, so police, traffic and the player hold their arranged places.
  ctx.shotHold = true;
  ctx.sun.intensity = 1.15;
  if (shot === 1) {
    // Cover: a police chase on the beachfront avenue — wanted stars, minimap,
    // mission objective and three cruisers closing in behind Rio's car.
    placePlayerInCar(ctx, 0, -110, 40, 0);
    ctx.player.cash = 2450;
    ctx.player.wanted = 3;
    ctx.police.heat = 100;
    for (let i = 0; i < 3; i++) spawnPoliceCar(ctx);
    ctx.police.cars.forEach((car, i) => {
      // Cruisers right on Rio's tail, between the chase camera and his car.
      car.mesh.position.set(-113 + i * 3, 0, 34 - i * 6);
      car.heading = 0;
      car.mesh.rotation.y = 0;
    });
    ctx.hud.setObjective("3 — Hot Pursuit", "Lose the police — get your wanted level to zero");
    ctx.cameraMode = "chase-far";
    ctx.timeOfDay = "day";
  } else if (shot === 2) {
    // Downtown driving: Rio in traffic between the towers, Marina Tower ahead.
    placePlayerInCar(ctx, 2, 0, 110, Math.PI);
    ctx.player.cash = 1300;
    ctx.player.wanted = 0;
    ctx.traffic.forEach((car, i) => {
      car.mesh.position.set(-55 + (i % 3) * 55, 0, 60 - i * 22);
    });
    ctx.hud.setObjective("1 — Getaway Driver", "Drive to the docks marker");
    ctx.cameraMode = "chase";
    ctx.timeOfDay = "day";
  } else if (shot === 3) {
    // On foot at the market: the pickup mission, gold beacon over the stalls,
    // pedestrians and a parked car nearby. Rio faces south toward the market.
    placePlayerOnFoot(ctx, -6, 122, 0);
    ctx.player.cash = 800;
    ctx.player.wanted = 0;
    ctx.player.hasPackage = false;
    startMission(ctx, 1);
    ctx.cameraMode = "follow";
    ctx.timeOfDay = "day";
  } else if (shot === 4) {
    // Dusk overview: Rio on the beach promenade, the city glowing behind him,
    // start-screen energy with the full HUD on show.
    placePlayerOnFoot(ctx, -172, 40, Math.PI / 2);
    ctx.player.cash = 5000;
    ctx.player.wanted = 1;
    ctx.police.heat = 100;
    spawnPoliceCar(ctx);
    ctx.sun.intensity = 0.55;
    ctx.sun.color.setHex(0xff9d5c);
    ctx.scene.background.setHex(0x2a3a5c);
    ctx.scene.fog.color.setHex(0x2a3a5c);
    ctx.hud.setObjective("5 — The Solmar Heist", "Escape to the safehouse on the beach");
    ctx.cameraMode = "wide";
    ctx.timeOfDay = "dusk";
  }
  ctx.hud.update(ctx);
  return shot;
}
