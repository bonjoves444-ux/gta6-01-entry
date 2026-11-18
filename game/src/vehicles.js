// vehicles.js — cars for SOLMAR: the pink hero Comet, Solmar PD
// cruisers with strobing lightbars, and the traffic that fills the
// streets. One Car class builds all three kinds from the same arcade
// driving model, so a stolen cruiser drives like any other car.
//
// Heading convention, used everywhere in the game: heading 0 is
// north, forward is (sin h, -cos h), and the mesh is built facing +Z
// with rotation.y = PI - heading.

import * as THREE from 'three';
import { clamp } from './random.js';

export const HERO_COLOR = 0xff2e88;

// Shared geometry, built once and reused by every car on the road.
const GEO = {
  hull: new THREE.BoxGeometry(1.9, 0.55, 4.2),
  cabin: new THREE.BoxGeometry(1.6, 0.5, 2.0),
  wheel: new THREE.CylinderGeometry(0.38, 0.38, 0.28, 10),
  wing: new THREE.BoxGeometry(1.9, 0.07, 0.5),
  fin: new THREE.BoxGeometry(0.07, 0.42, 0.5),
  strut: new THREE.BoxGeometry(0.09, 0.3, 0.12),
  splitter: new THREE.BoxGeometry(1.9, 0.1, 0.5),
  skirt: new THREE.BoxGeometry(0.1, 0.16, 2.6),
  mirror: new THREE.BoxGeometry(0.22, 0.12, 0.1),
  scoop: new THREE.BoxGeometry(0.6, 0.12, 0.8),
  exhaust: new THREE.CylinderGeometry(0.09, 0.09, 0.4, 8),
  tailBar: new THREE.BoxGeometry(1.7, 0.14, 0.06),
  headlamp: new THREE.BoxGeometry(0.42, 0.12, 0.06),
  plate: new THREE.BoxGeometry(0.55, 0.18, 0.04),
  lightBase: new THREE.BoxGeometry(1.1, 0.09, 0.34),
  lamp: new THREE.BoxGeometry(0.5, 0.14, 0.3),
  pushBar: new THREE.BoxGeometry(1.7, 0.22, 0.12),
  flame: new THREE.ConeGeometry(0.16, 0.9, 8),
};

const MAT = {
  glass: new THREE.MeshStandardMaterial({ color: 0x182238, metalness: 0.9, roughness: 0.12 }),
  tyre: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 }),
  hub: new THREE.MeshStandardMaterial({ color: 0xd8d8e0, metalness: 0.9, roughness: 0.25 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xf0f0f5, metalness: 1.0, roughness: 0.15 }),
  black: new THREE.MeshStandardMaterial({ color: 0x0c0c10, metalness: 0.4, roughness: 0.6 }),
  tailRed: new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xcc0000, emissiveIntensity: 0.9 }),
  headWhite: new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xffedb0, emissiveIntensity: 1.2 }),
  flameOrange: new THREE.MeshBasicMaterial({ color: 0xff7a1a }),
  flameBlue: new THREE.MeshBasicMaterial({ color: 0x66ccff }),
  white: new THREE.MeshStandardMaterial({ color: 0xf2f2f2, metalness: 0.5, roughness: 0.35 }),
};

function paint(color, metalness, roughness) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

// Door-decal texture: "SOLMAR PD" in dark navy on a clear background,
// drawn once on a canvas and pasted on both doors of every cruiser.
let pdDecal = null;
function pdDecalTexture() {
  if (pdDecal) return pdDecal;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 64);
  g.fillStyle = '#101830';
  g.font = 'bold 34px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('SOLMAR PD', 128, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  pdDecal = tex;
  return tex;
}

// Blob shadow: a soft dark ellipse drawn once on a canvas and laid
// under every car, so each one sits on the road even where the sun's
// shadow map is too soft or too long to read.
let blobTex = null;
function blobTexture() {
  if (blobTex) return blobTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 10, 128, 128, 126);
  grad.addColorStop(0, 'rgba(0,0,0,0.6)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.3)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  blobTex = tex;
  return tex;
}

// decalTexture(w, h, draw): a canvas texture for a flat decal plane.
function decalTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const roofNumCache = {};
function roofNumberTexture(num, color) {
  const key = num + color;
  if (roofNumCache[key]) return roofNumCache[key];
  const tex = decalTexture(256, 256, (g) => {
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(128, 128, 112, 0, Math.PI * 2); g.fill();
    g.strokeStyle = color; g.lineWidth = 10;
    g.beginPath(); g.arc(128, 128, 100, 0, Math.PI * 2); g.stroke();
    g.fillStyle = color;
    g.font = 'bold 110px Arial';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(num, 128, 134);
  });
  roofNumCache[key] = tex;
  return tex;
}

let doorTex = null;
function doorTextTexture() {
  if (doorTex) return doorTex;
  doorTex = decalTexture(768, 128, (g) => {
    g.textAlign = 'center';
    g.font = 'bold 68px Arial';
    g.fillStyle = '#ffffff';
    g.fillText('SOLMAR', 384, 58);
    g.font = 'bold 34px Arial';
    g.fillStyle = '#ffd7ea';
    g.fillText('C O M E T', 384, 108);
  });
  return doorTex;
}

// Car: one drivable vehicle. type is 'hero', 'cruiser' or 'traffic'.
// The mesh is built facing +Z, so rotation.y = PI - heading.
export class Car {
  constructor(type, color, x, z, heading, label) {
    this.type = type;
    this.color = color;
    this.label = label || null;
    this.x = x;
    this.z = z;
    this.heading = heading || 0;
    this.speed = 0;
    this.condition = 100;
    this.nos = 100;
    this.nosOwned = false;
    this.armoured = false;
    this.wheels = [];
    this.flames = [];
    this.redLamp = null;
    this.blueLamp = null;
    this.mesh = new THREE.Group();
    this.mesh.position.set(x, 0, z);
    if (type === 'hero') this.buildHero(color);
    else if (type === 'cruiser') this.buildCruiser();
    else this.buildTraffic(color);
    this.syncMesh();
  }

  add(mesh, x, y, z, castShadow) {
    mesh.position.set(x, y, z);
    mesh.castShadow = !!castShadow;
    this.mesh.add(mesh);
    return mesh;
  }

  // addBlob(opacity): a soft dark ellipse under the car — the contact
  // shadow that grounds it on the road. The plane is stretched by
  // its own geometry (2.7 x 5.2), so the round gradient reads as an
  // ellipse under the car.
  addBlob(opacity) {
    const blob = new THREE.Mesh(
      new THREE.PlaneGeometry(2.7, 5.2),
      new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, opacity, depthWrite: false })
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.05;
    this.mesh.add(blob);
  }

  // decal(tex, w, h, x, y, z, ry, rx): a thin textured plane laid on
  // a surface — livery, lettering, roof numbers. Offset a hair off
  // the surface with polygonOffset so it never z-fights the paint.
  decal(tex, w, h, x, y, z, ry, rx) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -1 })
    );
    m.position.set(x, y, z);
    if (ry) m.rotation.y = ry;
    if (rx) m.rotation.x = rx;
    this.mesh.add(m);
    return m;
  }

  // buildHero: the Solmar Comet — tapered pink hull, slanted glass
  // canopy, rear wing on struts, splitter, skirts, mirrors, scoop,
  // twin exhausts, full-width tail bar, headlights and plate.
  buildHero(color) {
    const body = paint(color, 0.85, 0.28);
    body.emissive = new THREE.Color(0x881040);
    body.emissiveIntensity = 0.45;
    const hull = this.add(new THREE.Mesh(GEO.hull, body), 0, 0.55, 0, true);
    hull.scale.set(1, 1, 1);
    // Tapered nose: a slimmer front wedge so the car reads fast.
    const nose = this.add(new THREE.Mesh(GEO.hull, body), 0, 0.5, 1.7, true);
    nose.scale.set(0.82, 0.8, 0.55);
    // Slanted glass canopy, double-sided so it reads from any angle.
    const glassMat = MAT.glass.clone();
    glassMat.color = new THREE.Color(0x3a4a6a);
    glassMat.side = THREE.DoubleSide;
    const canopy = this.add(new THREE.Mesh(GEO.cabin, glassMat), 0, 1.02, -0.3, true);
    canopy.rotation.x = -0.12;
    canopy.scale.set(1, 0.9, 1);
    // Pink roof panel over the canopy: from the chase camera the car
    // reads pink on top, not one black slab.
    this.add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1.7), body), 0, 1.32, -0.3, true);
    // Livery: roof roundel "07" and SOLMAR COMET door lettering, so
    // the pink hull reads as a named car, not a pink box.
    this.decal(roofNumberTexture('07', '#d41e6e'), 1.1, 1.1, 0, 1.38, -0.3, 0, -Math.PI / 2);
    this.decal(doorTextTexture(), 2.4, 0.4, 0.96, 0.62, 0.1, Math.PI / 2);
    this.decal(doorTextTexture(), 2.4, 0.4, -0.96, 0.62, 0.1, -Math.PI / 2);
    // Rear wing on two struts with end fins.
    this.add(new THREE.Mesh(GEO.wing, body), 0, 1.18, -1.95, true);
    this.add(new THREE.Mesh(GEO.strut, MAT.black), -0.7, 1.0, -1.95);
    this.add(new THREE.Mesh(GEO.strut, MAT.black), 0.7, 1.0, -1.95);
    this.add(new THREE.Mesh(GEO.fin, body), -0.95, 1.28, -1.95, true);
    this.add(new THREE.Mesh(GEO.fin, body), 0.95, 1.28, -1.95, true);
    // Front splitter, side skirts, mirrors, hood scoop.
    this.add(new THREE.Mesh(GEO.splitter, MAT.black), 0, 0.32, 2.2);
    this.add(new THREE.Mesh(GEO.skirt, MAT.black), -0.98, 0.32, 0);
    this.add(new THREE.Mesh(GEO.skirt, MAT.black), 0.98, 0.32, 0);
    this.add(new THREE.Mesh(GEO.mirror, body), -1.05, 0.95, 0.55);
    this.add(new THREE.Mesh(GEO.mirror, body), 1.05, 0.95, 0.55);
    this.add(new THREE.Mesh(GEO.scoop, MAT.black), 0, 0.86, 1.2);
    // Twin exhausts with hidden NOS flame cones behind them.
    for (const sx of [-0.35, 0.35]) {
      const pipe = this.add(new THREE.Mesh(GEO.exhaust, MAT.chrome), sx, 0.5, -2.15);
      pipe.rotation.x = Math.PI / 2;
      const flame = new THREE.Mesh(GEO.flame, MAT.flameOrange);
      flame.position.set(sx, 0.5, -2.7);
      flame.rotation.x = -Math.PI / 2;
      flame.visible = false;
      this.mesh.add(flame);
      this.flames.push(flame);
    }
    // Full-width red tail bar, headlights, plate.
    this.add(new THREE.Mesh(GEO.tailBar, MAT.tailRed), 0, 0.72, -2.12);
    this.add(new THREE.Mesh(GEO.headlamp, MAT.headWhite), -0.6, 0.62, 2.12);
    this.add(new THREE.Mesh(GEO.headlamp, MAT.headWhite), 0.6, 0.62, 2.12);
    this.add(new THREE.Mesh(GEO.plate, MAT.chrome), 0, 0.45, -2.13);
    // Rear window on the canopy's back slope, plus a bumper and
    // diffuser fins — so the back of the car is not one flat pink face.
    this.add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.4, 0.04), MAT.glass), 0, 1.05, -1.32, true);
    this.add(new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.22, 0.14), MAT.black), 0, 0.36, -2.14, true);
    for (const fx of [-0.6, 0, 0.6]) {
      this.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.3), MAT.black), fx, 0.3, -2.2);
    }
    // Pink neon underglow: a soft additive pool under the car so it
    // sits in light instead of flat on the asphalt.
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 5.0),
      new THREE.MeshBasicMaterial({ color: 0xff2e88, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.07;
    this.mesh.add(glow);
    this.addBlob(0.4);
    this.addWheels(true);
  }

  // buildCruiser: white body, black hood and trunk panels, lightbar
  // above the cabin roofline, PD decals, push bar, spotlight, roof no.
  buildCruiser() {
    const body = MAT.white;
    this.add(new THREE.Mesh(GEO.hull, body), 0, 0.55, 0, true);
    const hood = this.add(new THREE.Mesh(GEO.hull, MAT.black), 0, 0.78, 1.45);
    hood.scale.set(0.9, 0.25, 0.6);
    const trunk = this.add(new THREE.Mesh(GEO.hull, MAT.black), 0, 0.78, -1.5);
    trunk.scale.set(0.9, 0.25, 0.5);
    this.add(new THREE.Mesh(GEO.cabin, MAT.glass), 0, 1.0, -0.25, true);
    // Roof unit number, so the chase camera can read which cruiser is
    // which from above — the roster names them, the roof shows it.
    if (this.label) this.decal(roofNumberTexture(this.label, '#111111'), 0.9, 0.9, 0, 1.26, -0.25, 0, -Math.PI / 2);
    // Lightbar: base at y ~1.42, lamps at y ~1.54, above the roofline.
    this.add(new THREE.Mesh(GEO.lightBase, MAT.black), 0, 1.42, -0.25);
    const redMat = new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff0000, emissiveIntensity: 2 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x2040ff, emissive: 0x0022ff, emissiveIntensity: 2 });
    this.redLamp = this.add(new THREE.Mesh(GEO.lamp, redMat), -0.3, 1.54, -0.25);
    this.blueLamp = this.add(new THREE.Mesh(GEO.lamp, blueMat), 0.3, 1.54, -0.25);
    // "SOLMAR PD" door decals on both sides.
    const decalMat = new THREE.MeshBasicMaterial({ map: pdDecalTexture(), transparent: true });
    for (const sx of [-1, 1]) {
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.32), decalMat);
      decal.position.set(sx * 0.97, 0.62, 0.1);
      decal.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
      this.mesh.add(decal);
    }
    this.add(new THREE.Mesh(GEO.pushBar, MAT.black), 0, 0.45, 2.18);
    this.add(new THREE.Mesh(GEO.tailBar, MAT.tailRed), 0, 0.72, -2.12);
    this.add(new THREE.Mesh(GEO.headlamp, MAT.headWhite), -0.6, 0.62, 2.12);
    this.add(new THREE.Mesh(GEO.headlamp, MAT.headWhite), 0.6, 0.62, 2.12);
    this.addBlob(0.35);
    this.addWheels(false);
  }

  // buildTraffic: a plain commuter car in one paint colour.
  buildTraffic(color) {
    const body = paint(color, 0.6, 0.45);
    this.add(new THREE.Mesh(GEO.hull, body), 0, 0.55, 0, true);
    this.add(new THREE.Mesh(GEO.cabin, MAT.glass), 0, 0.98, -0.2);
    this.add(new THREE.Mesh(GEO.headlamp, MAT.headWhite), -0.6, 0.62, 2.12);
    this.add(new THREE.Mesh(GEO.headlamp, MAT.headWhite), 0.6, 0.62, 2.12);
    this.add(new THREE.Mesh(GEO.tailBar, MAT.tailRed), 0, 0.72, -2.12);
    this.addBlob(0.35);
    this.addWheels(false);
  }

  // addWheels: four visible wheels with hubcaps, spun by road speed.
  addWheels(hero) {
    for (const [wx, wz] of [[-1.02, 1.35], [1.02, 1.35], [-1.02, -1.35], [1.02, -1.35]]) {
      const wheel = new THREE.Group();
      wheel.position.set(wx, 0.38, wz);
      const tyre = new THREE.Mesh(GEO.wheel, MAT.tyre);
      tyre.rotation.z = Math.PI / 2;
      tyre.castShadow = true;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 8), MAT.hub);
      hub.rotation.z = Math.PI / 2;
      wheel.add(tyre);
      wheel.add(hub);
      this.mesh.add(wheel);
      this.wheels.push(wheel);
    }
  }

  // strobe(elapsed): alternate the red and blue lamps, about 4 Hz.
  strobe(elapsed) {
    if (!this.redLamp || !this.blueLamp) return;
    const phase = Math.floor(elapsed * 8) % 2 === 0;
    this.redLamp.material.emissiveIntensity = phase ? 2.4 : 0.15;
    this.blueLamp.material.emissiveIntensity = phase ? 0.15 : 2.4;
  }

  // drive(dt, throttle, steer, boost): arcade handling. throttle -1..1,
  // steer -1..1, boost burns NOS for a burst of speed and flames.
  drive(dt, throttle, steer, boost) {
    const top = boost && this.nosOwned && this.nos > 0 ? 46 : 38;
    const accel = throttle >= 0 ? 16 : 22;
    this.speed += throttle * accel * dt;
    this.speed -= this.speed * 0.55 * dt;
    if (boost && this.nosOwned && this.nos > 0 && throttle > 0) {
      this.speed += 9 * dt;
      this.nos = Math.max(0, this.nos - 26 * dt);
    }
    this.speed = clamp(this.speed, -10, top);
    const steerAuthority = clamp(Math.abs(this.speed) / 12, 0, 1);
    this.heading += steer * 1.9 * steerAuthority * dt * Math.sign(this.speed || 1);
    const fx = Math.sin(this.heading);
    const fz = -Math.cos(this.heading);
    this.x += fx * this.speed * dt;
    this.z += fz * this.speed * dt;
    const boosting = boost && this.nosOwned && this.nos > 0 && throttle > 0.3;
    for (const f of this.flames) f.visible = boosting;
    this.syncMesh();
  }

  // kmh(): road speed in kilometres per hour for the HUD.
  kmh() {
    return Math.abs(this.speed) * 3.6;
  }

  // gear(): 1..6 from road speed, for the HUD gear badge.
  gear() {
    const k = this.kmh();
    if (k < 25) return 1;
    if (k < 50) return 2;
    if (k < 80) return 3;
    if (k < 110) return 4;
    if (k < 140) return 5;
    return 6;
  }

  // syncMesh(): push x/z/heading/speed into the mesh, spin the wheels.
  syncMesh() {
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = Math.PI - this.heading;
    const spin = this.speed * 0.016;
    for (const w of this.wheels) w.rotation.x += spin;
  }
}

// Traffic: a handful of commuter cars looping the city streets.
// Each car owns one straight lane (a fixed x or a fixed z) and wraps
// around at the city edge, so the streets never empty out.
export class Traffic {
  constructor(scene, rng) {
    this.cars = [];
    this.scene = scene;
    const paints = [0x3a6fd8, 0xd8a03a, 0x4a9a5a, 0xc0c4cc, 0x8a4ad8, 0xd84a4a, 0x3a8a8a, 0xe0e0e0];
    const lanes = [
      { x: -88, z0: -120, z1: 120, dir: 1 },
      { x: -82, z0: -120, z1: 120, dir: -1 },
      { x: -60, z0: -120, z1: 120, dir: 1 },
      { x: -40, z0: -120, z1: 120, dir: -1 },
      { x: -20, z0: -120, z1: 120, dir: 1 },
      { x: 10, z0: -120, z1: 120, dir: -1 },
      { x: 40, z0: -120, z1: 120, dir: 1 },
      { z: -60, x0: -60, x1: 110, dir: 1 },
      { z: -20, x0: -60, x1: 110, dir: -1 },
      { z: 20, x0: -60, x1: 110, dir: 1 },
      { z: 60, x0: -60, x1: 110, dir: -1 },
      { z: -100, x0: -60, x1: 110, dir: 1 },
      { z: -40, x0: -60, x1: 110, dir: -1 },
      { z: 40, x0: -60, x1: 110, dir: 1 },
      { z: -80, x0: -60, x1: 110, dir: -1 },
      { z: 80, x0: -60, x1: 110, dir: 1 },
    ];
    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i];
      const color = paints[i % paints.length];
      let car;
      if (lane.x !== undefined) {
        const z = lane.dir > 0 ? lane.z0 + rng() * 60 : lane.z1 - rng() * 60;
        car = new Car('traffic', color, lane.x + (rng() - 0.5) * 1.5, z, lane.dir > 0 ? Math.PI : 0);
        car.lane = lane;
      } else {
        const x = lane.dir > 0 ? lane.x0 + rng() * 60 : lane.x1 - rng() * 60;
        car = new Car('traffic', color, x, lane.z + (rng() - 0.5) * 1.5, lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
        car.lane = lane;
      }
      car.speed = 9 + rng() * 5;
      car.cruise = car.speed;
      this.cars.push(car);
      scene.add(car.mesh);
    }
  }

  // update(dt): roll every traffic car along its lane, wrapping at
  // the ends so the flow never stops.
  update(dt) {
    for (const car of this.cars) {
      const lane = car.lane;
      car.speed = car.cruise;
      const fx = Math.sin(car.heading);
      const fz = -Math.cos(car.heading);
      car.x += fx * car.speed * dt;
      car.z += fz * car.speed * dt;
      if (lane.x !== undefined) {
        if (car.heading === Math.PI && car.z > lane.z1) car.z = lane.z0;
        if (car.heading === 0 && car.z < lane.z0) car.z = lane.z1;
      } else {
        if (car.heading === Math.PI / 2 && car.x > lane.x1) car.x = lane.x0;
        if (car.heading === -Math.PI / 2 && car.x < lane.x0) car.x = lane.x1;
      }
      car.syncMesh();
    }
  }
}
