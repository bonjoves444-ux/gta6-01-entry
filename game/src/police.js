// Wanted level, police cruisers that flank the player in spread lanes, and
// the helicopter that joins at three stars and circles overhead.
import * as THREE from 'three';
import { makeCar, syncCar, forwardOf } from './vehicles.js';

export function setWanted(G, level) {
  G.player.wanted = Math.max(0, Math.min(5, level));
}

export function spawnCruiser(G, lane) {
  const p = G.player;
  const f = forwardOf(p.heading);
  const px = -f.z;
  const pz = f.x;
  const behind = 26 + Math.abs(lane) * 6;
  const car = makeCar(G, {
    police: true,
    unit: 7 + G.cruisers.length * 3,
    lane,
    x: p.x - f.x * behind + px * lane * 5,
    z: p.z - f.z * behind + pz * lane * 5,
    heading: p.heading,
    maxSpeed: 36,
  });
  car.speed = 20;
  G.cruisers.push(car);
  return car;
}

export function spawnHeli(G) {
  if (G.heli) return;
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.1, 4.2),
    new THREE.MeshLambertMaterial({ color: 0x1c2a44 })
  );
  body.position.y = 0;
  group.add(body);
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 4.5),
    new THREE.MeshLambertMaterial({ color: 0x1c2a44 })
  );
  tail.position.set(0, 0.2, 3.6);
  group.add(tail);
  const rotor = new THREE.Mesh(
    new THREE.BoxGeometry(9, 0.08, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x111116 })
  );
  rotor.position.y = 0.8;
  group.add(rotor);
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(2.24, 0.3, 1.2),
    new THREE.MeshBasicMaterial({ color: 0xffd94d })
  );
  stripe.position.set(0, 0.1, -0.5);
  group.add(stripe);
  const coneGeo = new THREE.ConeGeometry(7, 18, 20, 1, true);
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfff2b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false,
  });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.y = -9;
  cone.rotation.x = Math.PI;
  group.add(cone);
  G.scene.add(group);
  G.heli = { group, rotor, angle: G.player.heading + Math.PI, radius: 36, height: 14 };
}

export function removeHeli(G) {
  if (!G.heli) return;
  G.scene.remove(G.heli.group);
  G.heli = null;
}

export function clearCruisers(G) {
  for (const c of G.cruisers) G.scene.remove(c.group);
  G.cruisers = [];
}

export function ensurePolice(G) {
  const want = Math.min(G.player.wanted, 3);
  if (G.liveShot && G.policePinned) return;
  while (G.cruisers.length < want) {
    const lanes = [-1, 0, 1];
    spawnCruiser(G, lanes[G.cruisers.length % 3]);
  }
  while (G.cruisers.length > want) {
    const c = G.cruisers.pop();
    G.scene.remove(c.group);
  }
  if (G.player.wanted >= 3) spawnHeli(G);
  else removeHeli(G);
}

export function updatePolice(G, dt) {
  const p = G.player;
  const f = forwardOf(p.heading);
  const px = -f.z;
  const pz = f.x;
  for (const car of G.cruisers) {
    const lane = car.lane || 0;
    const ahead = G.liveShot ? 16 : -9;
    const tx = p.x + f.x * ahead + px * lane * 5.5;
    const tz = p.z + f.z * ahead + pz * lane * 5.5;
    const dx = tx - car.x;
    const dz = tz - car.z;
    const dist = Math.hypot(dx, dz);
    const wantHeading = Math.atan2(dx, dz);
    let diff = wantHeading - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    // At the formation point there is no direction to steer toward
    // (atan2(0, 0) is meaningless) — hold the player's heading instead.
    if (dist > 2) car.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    if (G.liveShot) {
      // Hold formation ahead of the player so the chase reads in the
      // forward-facing camera: same speed, same heading, spread lanes.
      car.speed = p.car ? p.car.speed : 12;
    } else {
      const target = Math.min(34, Math.max(10, Math.abs(p.car ? p.car.speed : 0) + 2));
      if (dist > 14) car.speed = Math.min(36, car.speed + 14 * dt);
      else car.speed = Math.max(8, car.speed - 10 * dt);
      void target;
    }
    if (dist > 130) {
      car.x = p.x - f.x * (26 + Math.abs(lane) * 6) + px * lane * 5;
      car.z = p.z - f.z * (26 + Math.abs(lane) * 6) + pz * lane * 5;
      car.heading = p.heading;
      car.speed = 22;
    }
    const cf = forwardOf(car.heading);
    car.x += cf.x * car.speed * dt;
    car.z += cf.z * car.speed * dt;
    const fixed = G.city.collide(car.x, car.z, 1.6);
    car.x = fixed.x;
    car.z = fixed.z;
    syncCar(car);
    const flash = Math.sin(G.time * 14) > 0;
    if (car.redBar && car.blueBar) {
      car.redBar.material.color.set(flash ? 0xff2a2a : 0x550000);
      car.blueBar.material.color.set(flash ? 0x1133aa : 0x2a6bff);
    }
  }
  if (G.heli) {
    const h = G.heli;
    h.angle += dt * 0.22;
    h.group.position.set(
      p.x + Math.cos(h.angle) * h.radius,
      h.height,
      p.z + Math.sin(h.angle) * h.radius
    );
    h.group.rotation.y = Math.atan2(p.x - h.group.position.x, p.z - h.group.position.z);
    h.rotor.rotation.y += dt * 22;
  }
}

export function policeRoster(G) {
  const rows = [];
  const p = G.player;
  if (G.heli) {
    const d = Math.round(Math.hypot(G.heli.group.position.x - p.x, G.heli.group.position.z - p.z));
    rows.push({ unit: 'AIR-1', dist: d, status: 'OVERHEAD' });
  }
  const sorted = [...G.cruisers].sort((a, b) => {
    const da = Math.hypot(a.x - p.x, a.z - p.z);
    const db = Math.hypot(b.x - p.x, b.z - p.z);
    return da - db;
  });
  for (const c of sorted.slice(0, 4)) {
    const d = Math.round(Math.hypot(c.x - p.x, c.z - p.z));
    rows.push({ unit: `UNIT ${String(c.unit).padStart(2, '0')}`, dist: d, status: 'PURSUIT' });
  }
  return rows.slice(0, 5);
}
