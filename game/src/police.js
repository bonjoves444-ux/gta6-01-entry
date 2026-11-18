// police.js — the wanted level, the Solmar Police cruisers that answer it,
// and the police helicopter that joins the chase at three stars and up.
// Every cruiser carries a unit number and a behaviour the HUD roster shows.
import * as THREE from "three";
import { createCar } from "./vehicles.js";

const UNIT_NUMBERS = ["07", "12", "19", "23", "31", "44"];

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
    heli: null,
    heliAngle: 0,
    roster: [],
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

// A small canvas texture that reads POLICE on the cruiser doors.
function policeDoorTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const g = canvas.getContext("2d");
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = "#1c2f4a";
  g.font = "bold 44px Verdana, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("POLICE", 128, 34);
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

let doorTexture = null;

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
  car.unit = UNIT_NUMBERS[ctx.police.cars.length % UNIT_NUMBERS.length];
  car.behaviour = "PURSUIT";
  // Each cruiser holds its own pursuit lane (-5, 0 or +5 metres off the
  // player's line) so the pack flanks instead of piling onto one spot.
  car.pursuitOffset = ((ctx.police.cars.length % 3) - 1) * 5;
  if (!doorTexture) doorTexture = policeDoorTexture();
  for (const side of [-1, 1]) {
    const door = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 0.5),
      new THREE.MeshBasicMaterial({ map: doorTexture, transparent: true })
    );
    door.position.set(side * 1.08, 0.72, 0);
    door.rotation.y = side * Math.PI / 2;
    car.mesh.add(door);
  }
  ctx.police.cars.push(car);
  ctx.scene.add(car.mesh);
  return car;
}

// The police helicopter: body, tail, spinning rotor and a searchlight cone
// that tracks the player from above. It circles the chase at 30 metres out.
export function spawnPoliceHelicopter(ctx) {
  if (ctx.police.heli) return ctx.police.heli;
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1c2f4a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 5.2), bodyMat);
  group.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 1.2, 2.2),
    new THREE.MeshLambertMaterial({ color: 0x9fd8ef })
  );
  cabin.position.set(0, 0.4, 1.4);
  group.add(cabin);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 5.5), bodyMat);
  tail.position.set(0, 0.3, -4.6);
  group.add(tail);
  const skidMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  for (const side of [-1, 1]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 4.4), skidMat);
    skid.position.set(side * 1.3, -1.0, 0.4);
    group.add(skid);
  }
  const rotor = new THREE.Group();
  rotor.position.y = 1.1;
  const bladeMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(11, 0.12, 0.5), bladeMat);
    blade.rotation.y = a;
    rotor.add(blade);
  }
  group.add(rotor);
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(3.24, 0.4, 5.24),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  stripe.position.y = -0.2;
  group.add(stripe);
  // Searchlight: a translucent cone from the belly to the street.
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(6, 26, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xfff2b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false,
    })
  );
  cone.position.y = -13;
  cone.rotation.x = Math.PI;
  group.add(cone);
  const spot = new THREE.Mesh(
    new THREE.CircleGeometry(5, 20),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.35, depthWrite: false })
  );
  spot.rotation.x = -Math.PI / 2;
  spot.position.y = -25.8;
  group.add(spot);
  group.position.set(0, 30, 0);
  ctx.scene.add(group);
  ctx.police.heli = { mesh: group, rotor, cone, spot };
  // Start the helicopter ahead of the player, high in the chase camera's view.
  ctx.police.heliAngle = Math.PI;
  return ctx.police.heli;
}

export function removePoliceHelicopter(ctx) {
  if (!ctx.police.heli) return;
  ctx.scene.remove(ctx.police.heli.mesh);
  ctx.police.heli = null;
}

function updateHelicopter(ctx, dt) {
  const heli = ctx.police.heli;
  if (!heli) return;
  const player = ctx.player;
  const pos = player.inCar ? player.inCar.mesh.position : player.mesh.position;
  ctx.police.heliAngle += dt * 0.55;
  // Low and wide — 42 metres out, 16 up — so the helicopter sits inside the
  // chase camera's frame instead of hovering above it.
  const radius = 42;
  heli.mesh.position.set(
    pos.x + Math.sin(ctx.police.heliAngle) * radius,
    16 + Math.sin(ctx.time * 0.8) * 1.5,
    pos.z + Math.cos(ctx.police.heliAngle) * radius
  );
  heli.mesh.rotation.y = Math.atan2(pos.x - heli.mesh.position.x, pos.z - heli.mesh.position.z);
  heli.rotor.rotation.y += dt * 22;
  // Keep the searchlight pool on the player.
  heli.spot.position.x = pos.x - heli.mesh.position.x;
  heli.spot.position.z = pos.z - heli.mesh.position.z;
  heli.spot.position.y = -heli.mesh.position.y + 0.3;
  heli.cone.lookAt(pos.x, 0, pos.z);
  heli.cone.rotateX(-Math.PI / 2);
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
// The roster the HUD shows is rebuilt here every frame: unit, distance, behaviour.
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
  // The helicopter joins at three stars and leaves when the heat is gone.
  if (player.wanted >= 3 && !police.heli) spawnPoliceHelicopter(ctx);
  if (player.wanted < 3 && police.heli) removePoliceHelicopter(ctx);
  if (police.heli) updateHelicopter(ctx, dt);

  let nearestDistance = Infinity;
  police.roster = [];
  for (const car of police.cars) {
    const topSpeed = 24 + player.wanted * 2.5;
    // Chase the player's line, offset into this cruiser's pursuit lane.
    const dx = playerPos.x - car.mesh.position.x;
    const dz = playerPos.z - car.mesh.position.z;
    const dist = Math.hypot(dx, dz) || 1;
    const offset = car.pursuitOffset || 0;
    steerToward(car,
      playerPos.x + (-dz / dist) * offset,
      playerPos.z + (dx / dist) * offset,
      dt, topSpeed);
    const distance = Math.hypot(
      car.mesh.position.x - playerPos.x,
      car.mesh.position.z - playerPos.z
    );
    nearestDistance = Math.min(nearestDistance, distance);
    car.behaviour = distance < 8 ? "RAMMING" : distance < 30 ? "PURSUIT" : "RESPONDING";
    police.roster.push({
      unit: car.unit || "??",
      distance: Math.round(distance),
      behaviour: car.behaviour,
    });
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
    // Flash the split light bar: red on one side, blue on the other, alternating.
    const barRed = car.mesh.getObjectByName("police-lightbar-red");
    const barBlue = car.mesh.getObjectByName("police-lightbar-blue");
    const phase = Math.floor(ctx.time * 7) % 2 === 0;
    if (barRed) barRed.material.color.setHex(phase ? 0xff2222 : 0x551111);
    if (barBlue) barBlue.material.color.setHex(phase ? 0x111155 : 0x2244ff);
  }
  if (police.heli) {
    police.roster.unshift({ unit: "AIR-1", distance: 42, behaviour: "OVERHEAD" });
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
    police.roster = [];
  }
}

export function clearPolice(ctx) {
  for (const car of ctx.police.cars) ctx.scene.remove(car.mesh);
  ctx.police.cars.length = 0;
  ctx.police.roster = [];
  ctx.police.heat = 0;
  ctx.police.arrestTimer = 0;
  removePoliceHelicopter(ctx);
}
