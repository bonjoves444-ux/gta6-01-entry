// vehicles.js — the cars Rio can steal and drive, the city's traffic,
// and the arcade driving model: throttle, steering, handbrake slides and NOS.
import * as THREE from "three";
import { makeSeededRandom, randomPick, randomRange } from "./random.js";
import { resolveCityCollision } from "./city.js";

const CAR_COLORS = [0xe83a3a, 0x2a6fd8, 0xffd23e, 0x37d67a, 0xf2f2f2, 0x222222, 0xff8c42, 0x9d6bd8];
const CAR_NAMES = ["Solmar Comet", "Costa Cruiser", "Palma GT", "Duna Pickup", "Marina Sedan", "Toro Van"];

export function buildCarMesh(color, isPolice) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: isPolice ? 0x1c2f4a : color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.4), bodyMat);
  body.position.y = 0.65;
  group.add(body);
  const cabinMat = new THREE.MeshLambertMaterial({ color: 0x9fd8ef });
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 2.2), cabinMat);
  cabin.position.set(0, 1.3, -0.2);
  group.add(cabin);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelPositions = [[-1.0, 0.42, 1.45], [1.0, 0.42, 1.45], [-1.0, 0.42, -1.45], [1.0, 0.42, -1.45]];
  const wheels = [];
  for (const [wx, wy, wz] of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(wx, wy, wz);
    group.add(wheel);
    wheels.push(wheel);
  }
  // Headlights and taillights so dusk shots read as cars at a glance.
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const hx of [-0.65, 0.65]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.1), headMat);
    head.position.set(hx, 0.7, 2.22);
    group.add(head);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const hx of [-0.65, 0.65]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.1), tailMat);
    tail.position.set(hx, 0.7, -2.22);
    group.add(tail);
  }
  if (isPolice) {
    // Split light bar: red half and blue half, flashed alternately by police.js.
    const barRed = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    barRed.position.set(-0.32, 1.75, -0.2);
    barRed.name = "police-lightbar-red";
    group.add(barRed);
    const barBlue = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    barBlue.position.set(0.32, 1.75, -0.2);
    barBlue.name = "police-lightbar-blue";
    group.add(barBlue);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.3, 4.42),
      new THREE.MeshBasicMaterial({ color: 0xffffff }));
    stripe.position.y = 0.62;
    group.add(stripe);
    // Roof number so the helicopter crew can call the unit out.
    const roofMark = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.9),
      new THREE.MeshBasicMaterial({ color: 0xffd23e }));
    roofMark.position.set(0, 1.66, 0.9);
    group.add(roofMark);
  }
  // NOS flame cone at the exhaust, hidden until the boost fires.
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 1.6, 8),
    new THREE.MeshBasicMaterial({ color: 0x3aa7ff, transparent: true, opacity: 0.9 })
  );
  flame.position.set(0, 0.55, -2.8);
  flame.rotation.x = -Math.PI / 2;
  flame.visible = false;
  flame.name = "nos-flame";
  group.add(flame);
  return { group, wheels, flame };
}

export function createCar(scene, options) {
  const color = options.color !== undefined ? options.color : randomPick(makeSeededRandom(options.seed || 7), CAR_COLORS);
  const built = buildCarMesh(color, !!options.isPolice);
  built.group.position.set(options.x || 0, 0, options.z || 0);
  built.group.rotation.y = options.heading || 0;
  scene.add(built.group);
  return {
    mesh: built.group,
    wheels: built.wheels,
    flame: built.flame,
    name: options.name || randomPick(makeSeededRandom((options.seed || 7) + 3), CAR_NAMES),
    color,
    isPolice: !!options.isPolice,
    isTraffic: !!options.isTraffic,
    speed: 0,
    heading: options.heading || 0,
    health: 100,
    armor: 0,
    nos: 100,
    boosting: false,
    routeAxis: options.routeAxis || "x",
    routeFixed: options.routeFixed || 0,
    routeDirection: options.routeDirection || 1,
    routeSpeed: options.routeSpeed || 9,
    parked: !!options.parked,
    stolen: false,
  };
}

// Parked cars the player can steal, placed on roads around the city.
export function spawnParkedCars(scene, city) {
  const cars = [];
  const rng = makeSeededRandom(4242);
  city.carSpawns.forEach((spawn, index) => {
    const car = createCar(scene, {
      x: spawn.x, z: spawn.z, heading: spawn.heading,
      color: CAR_COLORS[index % CAR_COLORS.length],
      seed: 100 + index, parked: true,
    });
    car.name = CAR_NAMES[index % CAR_NAMES.length];
    cars.push(car);
  });
  for (let i = 0; i < 6; i++) {
    const x = randomRange(rng, -150, 150);
    const z = randomRange(rng, -150, 150);
    const car = createCar(scene, { x, z, heading: randomRange(rng, 0, Math.PI * 2), seed: 500 + i, parked: true });
    cars.push(car);
  }
  return cars;
}

// Traffic cars cruise the road grid on straight lanes and wrap at the city edge.
export function spawnTrafficCars(scene, count) {
  const rng = makeSeededRandom(99);
  const cars = [];
  for (let i = 0; i < count; i++) {
    const vertical = rng() > 0.5;
    const fixed = (Math.floor(randomRange(rng, -3, 4)) * 55);
    const along = randomRange(rng, -180, 180);
    const car = createCar(scene, {
      x: vertical ? fixed : along,
      z: vertical ? along : fixed,
      heading: vertical ? (rng() > 0.5 ? 0 : Math.PI) : (rng() > 0.5 ? Math.PI / 2 : -Math.PI / 2),
      seed: 900 + i, isTraffic: true,
      routeAxis: vertical ? "z" : "x",
      routeFixed: fixed,
      routeDirection: rng() > 0.5 ? 1 : -1,
      routeSpeed: randomRange(rng, 7, 12),
    });
    cars.push(car);
  }
  return cars;
}

export function updateTrafficCar(car, dt) {
  if (car.parked) return;
  const step = car.routeSpeed * car.routeDirection * dt;
  if (car.routeAxis === "z") {
    car.mesh.position.z += step;
    if (car.mesh.position.z > 195) { car.mesh.position.z = -195; }
    if (car.mesh.position.z < -195) { car.mesh.position.z = 195; }
  } else {
    car.mesh.position.x += step;
    if (car.mesh.position.x > 195) { car.mesh.position.x = -195; }
    if (car.mesh.position.x < -195) { car.mesh.position.x = 195; }
  }
  // Wheels spin with the road speed.
  for (const wheel of car.wheels) wheel.rotation.x += (car.routeSpeed * dt) / 0.42;
}

// Arcade driving: throttle, braking, steering that tightens at speed,
// handbrake slides, and NOS — hold N for a blue-flame boost that drains the tank.
export function drivePlayerCar(ctx, car, dt) {
  const input = ctx.input;
  const axes = input.moveAxes();
  const handbrake = input.isDown("Space");
  const wantNos = input.isDown("KeyN") && car.nos > 0 && car.speed > 4;
  const maxSpeed = wantNos ? 48 : 34;
  const accel = handbrake ? 4 : wantNos ? 34 : 22;
  if (axes.forward > 0) car.speed += accel * dt;
  if (axes.forward < 0) car.speed -= (car.speed > 0.5 ? 30 : 12) * dt;
  if (axes.forward === 0) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 8 * dt);
  if (handbrake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 26 * dt);
  car.speed = Math.max(-12, Math.min(maxSpeed, car.speed));
  car.boosting = wantNos && car.speed > 4;
  if (car.boosting) {
    car.nos = Math.max(0, car.nos - dt * 30);
    if (Math.random() < 0.3) ctx.audio.playNos();
  } else {
    car.nos = Math.min(100, car.nos + dt * 4);
  }
  if (car.flame) car.flame.visible = car.boosting;
  const steerAmount = axes.strafe * (handbrake ? 1.6 : 1.0) * Math.min(1, Math.abs(car.speed) / 10) * 1.9 * dt;
  car.heading -= steerAmount * Math.sign(car.speed || 1);
  const forwardX = Math.sin(car.heading);
  const forwardZ = Math.cos(car.heading);
  let nextX = car.mesh.position.x + forwardX * car.speed * dt;
  let nextZ = car.mesh.position.z + forwardZ * car.speed * dt;
  const resolved = resolveCityCollision(ctx.city, nextX, nextZ, 2.4);
  if (resolved.hit) {
    if (Math.abs(car.speed) > 14) {
      const damage = Math.max(0, 4 - car.armor);
      ctx.player.health = Math.max(0, ctx.player.health - damage);
      ctx.effects.addCrashSparks(car.mesh.position.x, 1, car.mesh.position.z);
      ctx.audio.playCrash();
    }
    car.speed *= 0.35;
    nextX = resolved.x;
    nextZ = resolved.z;
  }
  car.mesh.position.x = Math.max(-198, Math.min(198, nextX));
  car.mesh.position.z = Math.max(-198, Math.min(198, nextZ));
  car.mesh.rotation.y = car.heading;
  car.mesh.rotation.z = -axes.strafe * Math.min(0.08, Math.abs(car.speed) * 0.003);
  for (const wheel of car.wheels) wheel.rotation.x += (car.speed * dt) / 0.42;
  ctx.audio.setEnginePitch(Math.abs(car.speed) / maxSpeed);
  return car.speed;
}

// The nearest stealable car within reach of the player, or null.
export function nearestStealableCar(ctx, maxDistance) {
  let best = null;
  let bestDistance = maxDistance;
  for (const car of ctx.cars) {
    if (car.isPolice) continue;
    const dx = car.mesh.position.x - ctx.player.mesh.position.x;
    const dz = car.mesh.position.z - ctx.player.mesh.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = car;
    }
  }
  return best;
}
