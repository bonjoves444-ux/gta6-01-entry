// Vehicles: the player's cars, police cruisers, traffic and the driving
// model. A car is a small group of boxes with wheels, lights and, for the
// police, a flashing lightbar and POLICE door lettering.
import * as THREE from 'three';
import { createRng, range, pick } from './random.js';

const CAR_NAMES = ['Solmar Comet', 'Solmar Sting', 'Solmar Rumbler', 'Solmar Dune', 'Solmar Vice'];
const TRAFFIC_COLORS = [0xc23a3a, 0x3a6bc2, 0xe8c83a, 0x3aa88a, 0x8a8a92, 0xd86a2a, 0x6a3aa8];

export function policeDoorTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#f2f2f2';
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#10203a';
  g.font = 'bold 40px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('POLICE', 128, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let doorTex = null;

export function makeCar(G, opts = {}) {
  const color = opts.color ?? pick(G.rng, TRAFFIC_COLORS);
  const police = !!opts.police;
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: police ? 0xf2f2f2 : color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), bodyMat);
  body.position.y = 0.55;
  group.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.55, 2.2),
    new THREE.MeshLambertMaterial({ color: 0x1c2430 })
  );
  cabin.position.set(0, 1.1, -0.2);
  group.add(cabin);
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(2.02, 0.18, 4.42),
    new THREE.MeshLambertMaterial({ color: police ? 0x10203a : 0x111116 })
  );
  stripe.position.y = 0.62;
  group.add(stripe);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.36, wz);
    group.add(wheel);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const s of [-1, 1]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.1), headMat);
    head.position.set(s * 0.65, 0.6, -2.22);
    group.add(head);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.1), new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
    tail.position.set(s * 0.65, 0.6, 2.22);
    group.add(tail);
  }
  let redBar = null;
  let blueBar = null;
  if (police) {
    if (!doorTex) doorTex = policeDoorTexture();
    for (const s of [-1, 1]) {
      const door = new THREE.Mesh(
        new THREE.PlaneGeometry(1.9, 0.5),
        new THREE.MeshBasicMaterial({ map: doorTex })
      );
      door.position.set(s * 1.02, 0.62, 0.1);
      door.rotation.y = s * Math.PI / 2;
      group.add(door);
    }
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.4), new THREE.MeshLambertMaterial({ color: 0x222226 }));
    barBase.position.set(0, 1.5, -0.2);
    group.add(barBase);
    redBar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.36), new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
    redBar.position.set(-0.3, 1.6, -0.2);
    group.add(redBar);
    blueBar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.36), new THREE.MeshBasicMaterial({ color: 0x2a6bff }));
    blueBar.position.set(0.3, 1.6, -0.2);
    group.add(blueBar);
    const unit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.5), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    unit.position.set(0, 1.42, 0.6);
    group.add(unit);
  }
  G.scene.add(group);
  const car = {
    group,
    x: opts.x ?? 0,
    z: opts.z ?? 0,
    heading: opts.heading ?? 0,
    speed: 0,
    maxSpeed: opts.maxSpeed ?? 34,
    health: 100,
    nos: 100,
    armoured: false,
    name: opts.name ?? pick(G.rng, CAR_NAMES),
    police,
    redBar,
    blueBar,
    traffic: !!opts.traffic,
    axis: opts.axis ?? 'z',
    road: opts.road ?? 0,
    dir: opts.dir ?? 1,
    unit: opts.unit ?? 0,
    lane: opts.lane ?? 0,
    nosFlame: null,
  };
  if (opts.nos) {
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 1.6, 8),
      new THREE.MeshBasicMaterial({ color: 0x3db8ff, transparent: true, opacity: 0.85 })
    );
    flame.rotation.x = Math.PI / 2;
    flame.position.set(0, 0.55, 2.9);
    flame.visible = false;
    group.add(flame);
    car.nosFlame = flame;
  }
  syncCar(car);
  return car;
}

export function syncCar(car) {
  car.group.position.set(car.x, 0, car.z);
  car.group.rotation.y = car.heading;
}

export function forwardOf(heading) {
  return { x: Math.sin(heading), z: Math.cos(heading) };
}

export function spawnTraffic(G, count) {
  const rng = createRng(777);
  for (let i = 0; i < count; i++) {
    const vertical = rng() < 0.5;
    const road = pick(rng, vertical ? [-120, -60, 0, 60, 120] : [-120, -60, 0, 60, 120, 180]);
    const car = makeCar(G, {
      traffic: true,
      axis: vertical ? 'z' : 'x',
      road,
      dir: rng() < 0.5 ? 1 : -1,
      x: vertical ? road + (rng() < 0.5 ? -2.4 : 2.4) : range(rng, -200, 160),
      z: vertical ? range(rng, -160, 200) : road + (rng() < 0.5 ? -2.4 : 2.4),
      heading: 0,
    });
    car.speed = range(rng, 8, 14);
    if (vertical) car.heading = car.dir > 0 ? 0 : Math.PI;
    else car.heading = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    G.cars.push(car);
  }
}

export function updateTraffic(G, dt) {
  for (const car of G.cars) {
    if (car.parked) {
      syncCar(car);
      continue;
    }
    if (car.axis === 'z') {
      car.z += car.dir * car.speed * dt;
      if (car.z > 215) car.z = -175;
      if (car.z < -175) car.z = 215;
      car.x = car.road + (car.dir > 0 ? 2.4 : -2.4);
    } else {
      car.x += car.dir * car.speed * dt;
      if (car.x > 175) car.x = -215;
      if (car.x < -215) car.x = 175;
      car.z = car.road + (car.dir > 0 ? -2.4 : 2.4);
    }
    syncCar(car);
  }
}

export function drivePlayerCar(G, dt) {
  const car = G.player.car;
  const input = G.input;
  const fwd = input.forward ? 1 : 0;
  const back = input.back ? 1 : 0;
  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const nosing = input.nos && car.nos > 0 && car.speed > 4;
  const accel = nosing ? 40 : 22;
  if (fwd) car.speed += accel * dt;
  if (back) car.speed -= (car.speed > 0.5 ? 30 : 12) * dt;
  if (!fwd && !back) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 8 * dt);
  if (input.handbrake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 26 * dt);
  const top = nosing ? 46 : car.maxSpeed;
  car.speed = Math.max(-10, Math.min(top, car.speed));
  if (nosing) car.nos = Math.max(0, car.nos - 22 * dt);
  if (car.nosFlame) car.nosFlame.visible = nosing;
  const grip = input.handbrake ? 0.55 : 1;
  const turnRate = 1.9 * Math.min(1, Math.abs(car.speed) / 10) * grip;
  car.heading += steer * turnRate * dt * Math.sign(car.speed || 1);
  const f = forwardOf(car.heading);
  const nx = car.x + f.x * car.speed * dt;
  const nz = car.z + f.z * car.speed * dt;
  const fixed = G.city.collide(nx, nz, 1.6);
  const hitWall = Math.abs(fixed.x - nx) > 0.01 || Math.abs(fixed.z - nz) > 0.01;
  if (hitWall && Math.abs(car.speed) > 6) {
    const dmg = Math.abs(car.speed) * (car.armoured ? 0.35 : 0.8);
    car.health = Math.max(0, car.health - dmg);
    G.player.health = Math.max(0, G.player.health - dmg * 0.35);
    if (car.health <= 0) car.speed = 0;
    else car.speed *= 0.35;
    G.audio?.thud?.();
  }
  car.x = fixed.x;
  car.z = fixed.z;
  G.player.x = car.x;
  G.player.z = car.z;
  G.player.heading = car.heading;
  syncCar(car);
}

export function damageCar(G, car, amount) {
  car.health = Math.max(0, car.health - amount);
  if (car.health <= 0) car.speed = 0;
}
