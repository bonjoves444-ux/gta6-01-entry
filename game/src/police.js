// police.js — Solmar PD: cruisers that chase in flanking formation
// and a helicopter that pins the player with a searchlight at
// wanted level 3 and above. The formation never uses a centre spot
// ahead of the player, so the hero car is never hidden behind a
// cruiser in the screenshots.

import * as THREE from 'three';
import { Car } from './vehicles.js';
import { clamp, wrapAngle } from './random.js';

const UNIT_NAMES = ['EGRET-12', 'OSPREY-07', 'PELICAN-21', 'CORMORANT-33', 'GANNET-19'];
const UNIT_ROLES = ['RAMMING', 'PURSUIT', 'ROADBLOCK', 'PURSUIT', 'RAMMING'];

// Flanking formation spots, (metres ahead, metres to the side) —
// always off-centre so the hero car stays visible down the middle.
const FORMATION = [
  { ahead: 24, side: -5.5 },
  { ahead: 30, side: 5.5 },
  { ahead: 38, side: -5.5 },
  { ahead: 44, side: 5.5 },
  { ahead: 50, side: -5.5 },
];

// Close formation for the staged chase shot: the cruisers ride the
// hero's bumper (6-28 m) so the roster reads like a real pile-on
// instead of a distant escort. Used only when closeFormation is set.
const CLOSE_FORMATION = [
  { ahead: 6, side: -4.5 },
  { ahead: 10, side: 4.5 },
  { ahead: 16, side: -4.5 },
  { ahead: 22, side: 4.5 },
  { ahead: 28, side: -4.5 },
];

// Police: owns the cruiser fleet, the helicopter, and the wanted level.
export class Police {
  constructor(scene) {
    this.scene = scene;
    this.cruisers = [];
    this.heli = null;
    this.heliLight = null;
    this.heliCone = null;
    this.heliRotor = null;
    this.wanted = 0;
    this.heat = 0;
    this.coolTimer = 0;
    this.closeFormation = false;
    this.elapsed = 0;
    this.buildHeli();
  }

  // buildHeli: capsule body, glass nose, tail boom + fin + tail rotor,
  // four-blade main rotor with a faint blur disc, skids, and a
  // searchlight cone fed by a real SpotLight.
  buildHeli() {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x22242e, metalness: 0.6, roughness: 0.4 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 2.2, 4, 8), bodyMat);
    body.rotation.x = Math.PI / 2;
    body.castShadow = true;
    g.add(body);
    const nose = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x1a2c44, metalness: 0.9, roughness: 0.1 })
    );
    nose.position.set(0, -0.1, 1.7);
    nose.scale.set(1, 0.8, 0.8);
    g.add(nose);
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.35, 3.4, 8), bodyMat);
    boom.rotation.x = Math.PI / 2;
    boom.position.set(0, 0.15, -2.6);
    g.add(boom);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.8), bodyMat);
    fin.position.set(0, 0.6, -4.1);
    g.add(fin);
    const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 0.12), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    tailRotor.position.set(-0.3, 0.3, -4.2);
    g.add(tailRotor);
    this.tailRotor = tailRotor;
    // Four-blade main rotor plus a faint translucent blur disc.
    this.heliRotor = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.05, 0.28), new THREE.MeshStandardMaterial({ color: 0x14141a }));
      blade.rotation.y = (i * Math.PI) / 4;
      this.heliRotor.add(blade);
    }
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(3.2, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, side: THREE.DoubleSide })
    );
    disc.rotation.x = -Math.PI / 2;
    this.heliRotor.add(disc);
    this.heliRotor.position.y = 1.15;
    g.add(this.heliRotor);
    // Skids.
    for (const sx of [-0.8, 0.8]) {
      const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), new THREE.MeshStandardMaterial({ color: 0x333333 }));
      skid.rotation.x = Math.PI / 2;
      skid.position.set(sx, -1.05, 0.2);
      g.add(skid);
    }
    // Searchlight: a soft narrow cone under the nose plus a real
    // SpotLight. Kept faint on purpose — a bright cone reads as a
    // paper triangle and swallows the whole frame.
    const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.028, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.6, 18, 16, 1, true), coneMat);
    cone.position.set(0, -11, 0);
    cone.rotation.x = Math.PI;
    g.add(cone);
    this.heliCone = cone;
    this.heliLight = new THREE.SpotLight(0xfff2c0, 60, 60, 0.32, 0.5, 1.2);
    this.heliLight.position.set(0, -1, 0.5);
    const lightTarget = new THREE.Object3D();
    lightTarget.position.set(0, -26, 0);
    g.add(lightTarget);
    this.heliLight.target = lightTarget;
    g.add(this.heliLight);
    g.visible = false;
    this.heli = g;
    this.scene.add(g);
  }

  // setWanted(n, player): set the wanted level, spawning or removing
  // cruisers to match, and staging the helicopter at level 3+.
  setWanted(n, player) {
    this.wanted = clamp(n | 0, 0, 5);
    const want = this.wanted === 0 ? 0 : Math.min(this.wanted + 1, 5);
    while (this.cruisers.length < want) {
      const idx = this.cruisers.length;
      const car = new Car('cruiser', 0xffffff, 0, 0, 0, UNIT_NAMES[idx].split('-')[1]);
      this.cruisers.push(car);
      this.scene.add(car.mesh);
    }
    while (this.cruisers.length > want) {
      const car = this.cruisers.pop();
      this.scene.remove(car.mesh);
    }
    if (this.heli) this.heli.visible = this.wanted >= 3;
    if (player) this.stageFormation({ x: player.x, z: player.z }, player.heading, this.cruisers.length);
  }

  // addHeat(amount): raise the heat; the wanted level climbs with it.
  addHeat(amount) {
    this.heat = Math.min(100, this.heat + amount);
    const level = this.heat <= 0 ? 0 : this.heat < 20 ? 1 : this.heat < 40 ? 2 : this.heat < 60 ? 3 : this.heat < 85 ? 4 : 5;
    if (level !== this.wanted) this.setWanted(level, null);
  }

  // cool(dt): heat bleeds off over time while the player stays out of
  // sight; the wanted level falls with it. Shot mode skips this.
  cool(dt) {
    if (this.wanted === 0) return;
    this.coolTimer += dt;
    if (this.coolTimer > 6) {
      this.coolTimer = 0;
      this.heat = Math.max(0, this.heat - 12);
      const level = this.heat <= 0 ? 0 : this.heat < 20 ? 1 : this.heat < 40 ? 2 : this.heat < 60 ? 3 : this.heat < 85 ? 4 : 5;
      if (level < this.wanted) this.setWanted(level, null);
    }
  }

  // stageFormation(playerPos, heading, count): place the cruisers in
  // flanking spots ahead of the player, all facing the player's way.
  stageFormation(playerPos, heading, count) {
    const fx = Math.sin(heading);
    const fz = -Math.cos(heading);
    const rx = Math.cos(heading);
    const rz = Math.sin(heading);
    const spots = this.closeFormation ? CLOSE_FORMATION : FORMATION;
    for (let i = 0; i < this.cruisers.length; i++) {
      const spot = spots[i % spots.length];
      const car = this.cruisers[i];
      car.x = playerPos.x + fx * spot.ahead + rx * spot.side;
      car.z = playerPos.z + fz * spot.ahead + rz * spot.side;
      car.heading = heading;
      car.speed = 12;
      car.syncMesh();
    }
  }

  // stageHeliAhead(playerPos, heading): hold the helicopter 45 m
  // ahead of the player at y 22, in formation mode.
  stageHeliAhead(playerPos, heading) {
    if (!this.heli) return;
    const fx = Math.sin(heading);
    const fz = -Math.cos(heading);
    this.heli.position.set(playerPos.x + fx * 45, 22, playerPos.z + fz * 45);
    this.heli.rotation.y = Math.PI - heading;
    this.heli.visible = this.wanted >= 3;
  }

  // update(dt, player, speed, heading): chase the player, strobe the
  // lightbars, spin the rotors, and keep the helicopter overhead.
  update(dt, player, speed, heading) {
    this.elapsed += dt;
    const px = player ? player.x : 0;
    const pz = player ? player.z : 0;
    for (let i = 0; i < this.cruisers.length; i++) {
      const car = this.cruisers[i];
      car.strobe(this.elapsed);
      const spots = this.closeFormation ? CLOSE_FORMATION : FORMATION;
      const spot = spots[i % spots.length];
      const fx = Math.sin(heading);
      const fz = -Math.cos(heading);
      const rx = Math.cos(heading);
      const rz = Math.sin(heading);
      const tx = px + fx * spot.ahead + rx * spot.side;
      const tz = pz + fz * spot.ahead + rz * spot.side;
      const dx = tx - car.x;
      const dz = tz - car.z;
      const dist = Math.hypot(dx, dz);
      const wantHeading = Math.atan2(dx, -dz);
      car.heading += wrapAngle(wantHeading - car.heading) * Math.min(1, dt * 2.2);
      const target = dist > 8 ? Math.min(30, 10 + dist * 0.7) : 12;
      car.speed += (target - car.speed) * Math.min(1, dt * 1.5);
      car.x += Math.sin(car.heading) * car.speed * dt;
      car.z += -Math.cos(car.heading) * car.speed * dt;
      // A close cruiser rams: it dents the player's car a little.
      if (player && player.car && dist < 5.5) {
        player.car.condition = Math.max(0, player.car.condition - 2 * dt);
      }
      car.syncMesh();
    }
    if (this.heli && this.wanted >= 3) {
      this.heli.visible = true;
      const hx = this.heli.position.x;
      const hz = this.heli.position.z;
      const dx = px - hx;
      const dz = pz - hz;
      const dist = Math.hypot(dx, dz);
      if (dist > 30) {
        this.heli.position.x += (dx / dist) * 26 * dt;
        this.heli.position.z += (dz / dist) * 26 * dt;
      }
      this.heli.position.y = 22 + Math.sin(this.elapsed * 0.8) * 1.2;
      this.heli.rotation.y = Math.PI - Math.atan2(dx, -dz);
      if (this.heliRotor) this.heliRotor.rotation.y += dt * 22;
      if (this.tailRotor) this.tailRotor.rotation.z += dt * 30;
      if (this.heliCone) this.heliCone.material.opacity = 0.024 + 0.008 * Math.sin(this.elapsed * 3);
      // The searchlight cone always points at the player.
      const look = new THREE.Vector3(px - hx, -22, pz - hz).normalize();
      this.heliCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), look.clone().negate());
    } else if (this.heli) {
      this.heli.visible = false;
    }
  }

  // roster(player): HUD rows { name, dist, role } for every cruiser,
  // nearest first, distances in whole metres.
  roster(player) {
    const rows = [];
    for (let i = 0; i < this.cruisers.length; i++) {
      const car = this.cruisers[i];
      const dist = player ? Math.round(Math.hypot(car.x - player.x, car.z - player.z)) : 0;
      rows.push({ name: UNIT_NAMES[i % UNIT_NAMES.length], dist, role: UNIT_ROLES[i % UNIT_ROLES.length] });
    }
    rows.sort((a, b) => a.dist - b.dist);
    return rows;
  }
}
