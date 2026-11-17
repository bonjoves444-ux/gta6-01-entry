// police.js — the wanted level and the Solmar Police who answer it.
import { createCar } from "./vehicles.js";

export function createPoliceSystem(scene) {
  return {
    scene,
    cars: [],
    officers: [],
    heat: 0,
    coolTimer: 0,
    spawnTimer: 0,
    arrestTimer: 0,
    maxCars: 6,
  };
}

export function raiseWanted(ctx, stars, reason) {
  const player = ctx.player;
  const before = player.wanted;
  player.wanted = Math.min(5, player.wanted + stars);
  ctx.police.heat = 100;
  ctx.police.coolTimer = 0;
  if (player.wanted > before) {
    ctx.hud.showToast("WANTED " + "★".repeat(player.wanted) + " — " + reason);
    ctx.audio.playSirenBlip();
  }
}

export function lowerWanted(ctx, stars) {
  ctx.player.wanted = Math.max(0, ctx.player.wanted - stars);
  if (ctx.player.wanted === 0) {
    ctx.hud.showToast("You lost the cops. Solmar forgets — for now.");
  }
}

// Spawn a police cruiser on a road near the player, pointed at them.
export function spawnPoliceCar(ctx) {
  const player = ctx.player;
  const angle = Math.random() * Math.PI * 2;
  const distance = 42 + Math.random() * 18;
  const x = Math.max(-190, Math.min(190, player.mesh.position.x + Math.sin(angle) * distance));
  const z = Math.max(-190, Math.min(190, player.mesh.position.z + Math.cos(angle) * distance));
  const car = createCar(ctx.scene, {
    x, z, heading: Math.atan2(player.mesh.position.x - x, player.mesh.position.z - z),
    isPolice: true, seed: 7000 + ctx.police.cars.length,
  });
  car.name = "Solmar Police Cruiser";
  ctx.police.cars.push(car);
  ctx.scene.add(car.mesh);
  return car;
}

function steerToward(car, targetX, targetZ, dt, topSpeed) {
  const dx = targetX - car.mesh.position.x;
  const dz = targetZ - car.mesh.position.z;
  const desired = Math.atan2(dx, dz);
  let diff = desired - car.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
  car.speed += (topSpeed - car.speed) * Math.min(1, dt * 1.4);
  car.mesh.position.x += Math.sin(car.heading) * car.speed * dt;
  car.mesh.position.z += Math.cos(car.heading) * car.speed * dt;
  car.mesh.rotation.y = car.heading;
  for (const wheel of car.wheels) wheel.rotation.x += (car.speed * dt) / 0.42;
}

// Police chase, ram, and arrest. Heat cools when the player stays unseen and slow.
export function updatePolice(ctx, dt) {
  const police = ctx.police;
  const player = ctx.player;
  const playerPos = player.inCar
    ? player.inCar.mesh.position
    : player.mesh.position;

  // Keep the number of cruisers in step with the wanted level.
  const wantedCars = Math.min(police.maxCars, player.wanted + 1);
  police.spawnTimer -= dt;
  if (player.wanted > 0 && police.cars.length < wantedCars && police.spawnTimer <= 0) {
    spawnPoliceCar(ctx);
    police.spawnTimer = 2.2;
  }

  let nearestDistance = Infinity;
  for (const car of police.cars) {
    const topSpeed = 24 + player.wanted * 2.5;
    steerToward(car, playerPos.x, playerPos.z, dt, topSpeed);
    const distance = Math.hypot(
      car.mesh.position.x - playerPos.x,
      car.mesh.position.z - playerPos.z
    );
    nearestDistance = Math.min(nearestDistance, distance);
    // A ram at speed damages the player's car and health.
    if (distance < 3.2 && car.speed > 10) {
      if (player.inCar) {
        player.inCar.health -= 8;
        player.inCar.speed *= 0.5;
      } else {
        player.health = Math.max(0, player.health - 6);
      }
      ctx.effects.addCrashSparks(car.mesh.position.x, 1, car.mesh.position.z);
      ctx.audio.playCrash();
      car.speed *= 0.4;
    }
    // Flash the light bar red and blue.
    const bar = car.mesh.getObjectByName("police-lightbar");
    if (bar) {
      bar.material.color.setHex(Math.floor(ctx.time * 6) % 2 === 0 ? 0xff2222 : 0x2244ff);
    }
  }

  // Arrest: a cruiser sitting on an on-foot player for two seconds ends the run.
  if (player.wanted > 0 && !player.inCar && nearestDistance < 3.4) {
    police.arrestTimer += dt;
    if (police.arrestTimer > 2) {
      ctx.gameOver("The Solmar Police boxed Rio in and made the arrest.");
    }
  } else {
    police.arrestTimer = 0;
  }

  // Cool down: no crime for a while and the stars fall, one at a time.
  if (player.wanted > 0) {
    police.heat -= dt * (nearestDistance > 60 ? 9 : 2.5);
    if (police.heat <= 0) {
      police.heat = 100;
      lowerWanted(ctx, 1);
    }
  }

  // Remove cruisers once the heat is gone.
  if (player.wanted === 0 && police.cars.length > 0) {
    for (const car of police.cars) ctx.scene.remove(car.mesh);
    police.cars.length = 0;
  }
}

export function clearPolice(ctx) {
  for (const car of ctx.police.cars) ctx.scene.remove(car.mesh);
  ctx.police.cars.length = 0;
  ctx.police.heat = 0;
  ctx.police.arrestTimer = 0;
}
