// Combat: three weapons, tracers, rival gang members who chase and swing,
// and the locked-weapon toast that points the player at Ammu-Nation.
import * as THREE from 'three';
import { killEnemy } from './player.js';

export const WEAPONS = {
  pistol: { name: 'Pistol', damage: 34, price: 0, auto: false, sound: 'pop' },
  smg: { name: 'SMG', damage: 16, price: 600, auto: true, sound: 'rattle' },
  shotgun: { name: 'Shotgun', damage: 22, price: 900, auto: false, sound: 'boom', pellets: 5 },
};

export function switchWeapon(G, key) {
  const names = ['pistol', 'smg', 'shotgun'];
  const w = names[key - 1];
  if (!w) return;
  const def = WEAPONS[w];
  const owned = G.player.weapons[w].owned;
  if (!owned) {
    G.hud.showToast(G, `${def.name} is LOCKED — buy it at Ammu-Nation for $${def.price}.`);
    return;
  }
  G.player.weapon = w;
  G.hud.showToast(G, `${def.name} ready — ${G.player.weapons[w].ammo} rounds.`);
  G.audio?.click?.();
}

export function makeTracer(G, from, to) {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(from.x, from.y, from.z),
    new THREE.Vector3(to.x, to.y, to.z),
  ]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe94d }));
  G.scene.add(line);
  G.tracers.push({ line, life: 0.09 });
}

export function shoot(G) {
  const p = G.player;
  const w = WEAPONS[p.weapon];
  const state = p.weapons[p.weapon];
  if (state.ammo <= 0) {
    G.hud.showToast(G, `${w.name} is dry — buy ammo at Ammu-Nation.`);
    G.audio?.dry?.();
    return;
  }
  state.ammo--;
  const origin = p.inCar && p.car
    ? { x: p.car.x, y: 1.2, z: p.car.z }
    : { x: p.x, y: 1.5, z: p.z };
  const heading = p.inCar && p.car ? p.car.heading : p.heading;
  const dx = Math.sin(heading);
  const dz = Math.cos(heading);
  let hit = null;
  let bestD = 46;
  const cone = p.weapon === 'shotgun' ? 0.34 : 0.16;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const ex = e.x - origin.x;
    const ez = e.z - origin.z;
    const d = Math.hypot(ex, ez);
    if (d > 46 || d < 0.5) continue;
    const dot = (ex * dx + ez * dz) / d;
    if (dot > Math.cos(cone) && d < bestD) {
      bestD = d;
      hit = e;
    }
  }
  const end = hit
    ? { x: hit.x, y: 1.2, z: hit.z }
    : { x: origin.x + dx * 42, y: 1.2, z: origin.z + dz * 42 };
  makeTracer(G, origin, end);
  G.audio?.shot?.(p.weapon);
  if (hit) {
    const pellets = w.pellets ?? 1;
    hit.health -= w.damage * pellets;
    if (hit.health <= 0) killEnemy(G, hit);
  }
}

export function spawnRival(G, x, z) {
  const group = new THREE.Group();
  const coat = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.9, 0.42),
    new THREE.MeshLambertMaterial({ color: 0x8a1f2a })
  );
  coat.position.y = 1.15;
  group.add(coat);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0xc9a586 })
  );
  head.position.y = 1.8;
  group.add(head);
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.12, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a })
  );
  band.position.y = 1.95;
  group.add(band);
  G.scene.add(group);
  const enemy = { group, x, z, health: 100, dead: false, swing: 0 };
  group.position.set(x, 0, z);
  G.enemies.push(enemy);
  return enemy;
}

export function updateCombat(G, dt) {
  const p = G.player;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const d = Math.hypot(p.x - e.x, p.z - e.z);
    if (d > 1.6) {
      const mx = (p.x - e.x) / d;
      const mz = (p.z - e.z) / d;
      e.x += mx * 3.4 * dt;
      e.z += mz * 3.4 * dt;
      e.group.position.set(e.x, 0, e.z);
      e.group.rotation.y = Math.atan2(mx, mz);
    } else {
      e.swing -= dt;
      if (e.swing <= 0) {
        e.swing = 1.1;
        p.health = Math.max(0, p.health - 6);
        G.hud.showToast(G, 'A rival landed a hit — health dropping!');
      }
    }
  }
  for (let i = G.tracers.length - 1; i >= 0; i--) {
    const t = G.tracers[i];
    t.life -= dt;
    if (t.life <= 0) {
      G.scene.remove(t.line);
      t.line.geometry.dispose();
      G.tracers.splice(i, 1);
    }
  }
  if (p.health <= 0 && !G.liveShot && !G.busted) {
    G.busted = true;
    setTimeout(() => {
      if (G.busted) {
        p.health = 100;
        p.cash = Math.max(0, p.cash - 200);
        p.x = -55;
        p.z = 55;
        p.inCar = false;
        p.group.visible = true;
        p.group.position.set(p.x, 0, p.z);
        G.busted = false;
        G.hud.showToast(G, 'You woke up at the beach — the crew took $200.');
      }
    }, 1200);
  }
}
