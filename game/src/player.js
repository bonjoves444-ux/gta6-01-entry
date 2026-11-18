// player.js — the on-foot player for SOLMAR: a pink-jacketed driver
// who walks the streets, punches, and slips in and out of cars.
// Built facing +Z like the cars, so rotation.y = PI - heading holds.

// Player: on foot by default. .car is the car being driven, or null.
import * as THREE from 'three';
import { clamp, wrapAngle } from './random.js';

export class Player {
  constructor(scene, x, z, heading) {
    this.scene = scene;
    this.x = x;
    this.z = z;
    this.heading = heading || 0;
    this.onFoot = true;
    this.car = null;
    this.gun = 'pistol';
    this.walkPhase = 0;
    this.punchTimer = 0;
    this.mesh = new THREE.Group();
    this.mesh.position.set(x, 0, z);
    this.buildBody();
    scene.add(this.mesh);
    this.syncMesh();
  }

  // buildBody: pink jacket with dark side panels and a zip strip, head
  // with hair, cap with a pink brim, sunglasses, pivoted arms and legs,
  // and a small SMG in hand whenever the player is armed. Proportions
  // are human now — long legs, small head — instead of the old
  // big-headed block figure.
  buildBody() {
    const pink = new THREE.MeshStandardMaterial({ color: 0xff2e88, roughness: 0.6 });
    const pinkDark = new THREE.MeshStandardMaterial({ color: 0xd41e6e, roughness: 0.65 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1c1c26, roughness: 0.7 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.7 });
    const hair = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.9 });
    // Torso: chest, waist and belt, dark side panels, pale zip strip.
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.62, 0.34), pink);
    chest.position.y = 1.18;
    chest.castShadow = true;
    this.mesh.add(chest);
    const waist = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.18, 0.32), pinkDark);
    waist.position.y = 0.86;
    this.mesh.add(waist);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.07, 0.34), dark);
    belt.position.y = 0.94;
    this.mesh.add(belt);
    const zip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.58, 0.02), new THREE.MeshStandardMaterial({ color: 0xffe0f0, roughness: 0.5 }));
    zip.position.set(0, 1.18, 0.18);
    this.mesh.add(zip);
    for (const sx of [-1, 1]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.58, 0.36), dark);
      panel.position.set(sx * 0.28, 1.18, 0);
      this.mesh.add(panel);
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.36), pinkDark);
      pad.position.set(sx * 0.3, 1.46, 0);
      this.mesh.add(pad);
    }
    // Chest pocket on the left.
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.02), pinkDark);
    pocket.position.set(-0.16, 1.28, 0.18);
    this.mesh.add(pocket);
    // Neck, head, hair, cap with pink brim, sunglasses.
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.12, 8), skin);
    neck.position.y = 1.52;
    this.mesh.add(neck);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.34), skin);
    head.position.y = 1.72;
    head.castShadow = true;
    this.mesh.add(head);
    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.36), hair);
    hairTop.position.y = 1.88;
    this.mesh.add(hairTop);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.09, 10), dark);
    cap.position.y = 1.93;
    this.mesh.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.2), pink);
    brim.position.set(0, 1.9, 0.26);
    this.mesh.add(brim);
    const shades = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 0.05), new THREE.MeshStandardMaterial({ color: 0x0a0a12, metalness: 0.8, roughness: 0.2 }));
    shades.position.set(0, 1.73, 0.18);
    this.mesh.add(shades);
    // Arms and legs on pivots so they can swing while walking.
    this.armL = this.limb(-0.36, 1.42, pink, 0.58, 0.16, skin);
    this.armR = this.limb(0.36, 1.42, pink, 0.58, 0.16, skin);
    this.legL = this.limb(-0.16, 0.85, dark, 0.8, 0.15, dark, true);
    this.legR = this.limb(0.16, 0.85, dark, 0.8, 0.15, dark, true);
    // Small SMG in the right hand when armed.
    const smg = new THREE.Group();
    const smgBody = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.5), dark);
    smg.add(smgBody);
    const smgGrip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.1), dark);
    smgGrip.position.set(0, -0.14, 0.05);
    smg.add(smgGrip);
    smg.position.set(0, -0.6, 0.15);
    this.armR.add(smg);
    this.smgMesh = smg;
    this.smgMesh.visible = false;
  }

  // limb(x, y, material, len, width, tipMat, isLeg): one pivoted arm or
  // leg, hanging down from its shoulder/hip pivot so walk() can swing
  // it. A hand (skin) or shoe (dark, forward) caps the end.
  limb(x, y, material, len, width, tipMat, isLeg) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const seg = new THREE.Mesh(new THREE.BoxGeometry(width, len, width + 0.02), material);
    seg.position.y = -len / 2;
    seg.castShadow = true;
    pivot.add(seg);
    if (isLeg) {
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.3), tipMat);
      shoe.position.set(0, -len - 0.02, 0.06);
      shoe.castShadow = true;
      pivot.add(shoe);
    } else {
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.15), tipMat);
      hand.position.set(0, -len - 0.04, 0);
      pivot.add(hand);
    }
    this.mesh.add(pivot);
    return pivot;
  }

  // walk(dt, input, camYaw): move on foot with WASD relative to the
  // camera yaw, swinging arms and legs with each step.
  walk(dt, input, camYaw) {
    if (!this.onFoot) return;
    let fx = 0;
    let fz = 0;
    if (input.down('KeyW')) { fx += Math.sin(camYaw); fz += -Math.cos(camYaw); }
    if (input.down('KeyS')) { fx -= Math.sin(camYaw); fz -= -Math.cos(camYaw); }
    if (input.down('KeyA')) { fx += Math.sin(camYaw - Math.PI / 2); fz += -Math.cos(camYaw - Math.PI / 2); }
    if (input.down('KeyD')) { fx += Math.sin(camYaw + Math.PI / 2); fz += -Math.cos(camYaw + Math.PI / 2); }
    const len = Math.hypot(fx, fz);
    if (len > 0.01) {
      fx /= len;
      fz /= len;
      const speed = 5.2;
      this.x += fx * speed * dt;
      this.z += fz * speed * dt;
      const targetHeading = Math.atan2(fx, -fz);
      this.heading = this.heading + wrapAngle(targetHeading - this.heading) * Math.min(1, dt * 12);
      this.walkPhase += dt * 9;
      const swing = Math.sin(this.walkPhase) * 0.55;
      this.armL.rotation.x = swing;
      this.armR.rotation.x = -swing;
      this.legL.rotation.x = -swing;
      this.legR.rotation.x = swing;
    } else {
      this.armL.rotation.x *= 0.8;
      this.armR.rotation.x *= 0.8;
      this.legL.rotation.x *= 0.8;
      this.legR.rotation.x *= 0.8;
    }
    this.syncMesh();
  }

  // update(dt): punch animation decay and the armed-gun visibility.
  update(dt) {
    if (this.punchTimer > 0) {
      this.punchTimer -= dt;
      this.armR.rotation.x = -1.4 * Math.max(0, this.punchTimer / 0.25);
    }
    if (this.smgMesh) this.smgMesh.visible = this.onFoot && this.gun !== 'fists';
    this.syncMesh();
  }

  // punch(): throw a punch — a quick right-arm swing.
  punch() {
    this.punchTimer = 0.25;
  }

  // enterCar(car): climb in. The on-foot mesh hides while driving.
  enterCar(car) {
    this.car = car;
    this.onFoot = false;
    this.mesh.visible = false;
    this.x = car.x;
    this.z = car.z;
    this.heading = car.heading;
  }

  // exitCar(): step out beside the car, facing the same way it does.
  exitCar() {
    if (!this.car) return;
    const car = this.car;
    const side = 2.2;
    const sx = Math.cos(car.heading) * side;
    const sz = Math.sin(car.heading) * side;
    this.car = null;
    this.onFoot = true;
    this.x = car.x + sx;
    this.z = car.z + sz;
    this.heading = car.heading;
    this.mesh.visible = true;
    this.syncMesh();
  }

  // place(x, z, h): teleport the player (spawns, saves, shot staging).
  place(x, z, h) {
    this.x = x;
    this.z = z;
    if (h !== undefined) this.heading = h;
    this.syncMesh();
  }

  // syncMesh(): push x/z/heading into the mesh.
  syncMesh() {
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = Math.PI - this.heading;
  }
}
