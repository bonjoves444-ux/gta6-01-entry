// The player on foot: movement, entering and leaving cars, punching, and
// the wallet of stats (cash, reputation, health, weapons) the HUD reads.
import * as THREE from 'three';

export const START_CASH = 2450;
export const START_REP = 62;

export function rankFor(rep) {
  if (rep >= 90) return 'KING OF THE COAST';
  if (rep >= 75) return 'CREW CAPTAIN';
  if (rep >= 55) return 'CREW MEMBER';
  if (rep >= 30) return 'STREET RUNNER';
  return 'ROOKIE';
}

export function createPlayer(G) {
  const group = new THREE.Group();
  const jacket = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.85, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x2a6b8a })
  );
  jacket.position.y = 1.15;
  group.add(jacket);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0xd9a986 })
  );
  head.position.y = 1.8;
  group.add(head);
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.27, 0.29, 0.12, 12),
    new THREE.MeshLambertMaterial({ color: 0xe8a13d })
  );
  cap.position.y = 2.0;
  group.add(cap);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x2a2a30 });
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.7, 0.3), legMat);
    leg.position.set(s * 0.18, 0.35, 0);
    group.add(leg);
  }
  G.scene.add(group);
  const player = {
    group,
    x: -55,
    z: 55,
    heading: 0,
    camHeading: 0,
    walkSpeed: 6.5,
    inCar: false,
    car: null,
    health: 100,
    cash: START_CASH,
    rep: START_REP,
    weapons: {
      pistol: { owned: true, ammo: 240 },
      smg: { owned: false, ammo: 0 },
      shotgun: { owned: false, ammo: 0 },
    },
    weapon: 'pistol',
    punchCooldown: 0,
  };
  group.position.set(player.x, 0, player.z);
  return player;
}

export function updatePlayer(G, dt) {
  const p = G.player;
  if (p.inCar || G.shopOpen || !G.started || G.paused) return;
  const input = G.input;
  const fwd = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
  const strafe = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (fwd === 0 && strafe === 0) return;
  // Camera-relative movement against the FROZEN on-foot camera heading:
  // the camera never chases the player's heading, so W+D walks a straight
  // diagonal instead of spiralling.
  const ch = p.camHeading;
  const fx = Math.sin(ch);
  const fz = Math.cos(ch);
  const rx = Math.cos(ch);
  const rz = -Math.sin(ch);
  let mx = fx * fwd + rx * strafe;
  let mz = fz * fwd + rz * strafe;
  const len = Math.hypot(mx, mz) || 1;
  mx /= len;
  mz /= len;
  const nx = p.x + mx * p.walkSpeed * dt;
  const nz = p.z + mz * p.walkSpeed * dt;
  const fixed = G.city.collide(nx, nz, 0.6);
  p.x = fixed.x;
  p.z = fixed.z;
  p.heading = Math.atan2(mx, mz);
  p.group.position.set(p.x, 0, p.z);
  p.group.rotation.y = p.heading;
  // Walk swing on the legs, purely cosmetic.
  p.group.children.forEach((child, i) => {
    if (i >= 3) child.position.z = Math.sin(G.time * 9 + i) * 0.12;
  });
}

export function nearestCar(G, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of G.cars) {
    const d = Math.hypot(car.x - G.player.x, car.z - G.player.z);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

export function enterCar(G, car) {
  const p = G.player;
  p.inCar = true;
  p.car = car;
  car.traffic = false;
  car.parked = false;
  p.group.visible = false;
  p.x = car.x;
  p.z = car.z;
  p.heading = car.heading;
  G.hud.showToast(G, `Stole the ${car.name} — drive!`);
}

export function exitCar(G) {
  const p = G.player;
  const car = p.car;
  if (!car) return;
  p.inCar = false;
  p.car = null;
  const f = { x: Math.sin(car.heading), z: Math.cos(car.heading) };
  p.x = car.x - f.z * 2.4;
  p.z = car.z + f.x * 2.4;
  p.camHeading = car.heading;
  p.group.visible = true;
  p.group.position.set(p.x, 0, p.z);
  car.speed = 0;
}

export function punch(G) {
  const p = G.player;
  if (p.punchCooldown > 0 || p.inCar) return;
  p.punchCooldown = 0.45;
  let hit = null;
  let bestD = 2.4;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const d = Math.hypot(e.x - p.x, e.z - p.z);
    if (d < bestD) {
      bestD = d;
      hit = e;
    }
  }
  if (hit) {
    hit.health -= 25;
    G.hud.showToast(G, 'You landed a punch!');
    if (hit.health <= 0) killEnemy(G, hit);
  }
}

export function killEnemy(G, enemy) {
  enemy.dead = true;
  enemy.group.rotation.x = -Math.PI / 2;
  enemy.group.position.y = 0.4;
  G.player.cash += 120;
  G.hud.showToast(G, 'Rival down — took $120 off him.');
}

export function tickPlayer(G, dt) {
  if (G.player.punchCooldown > 0) G.player.punchCooldown -= dt;
}
