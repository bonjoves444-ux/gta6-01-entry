// city.js — Solmar City at golden hour: warm roads, lit towers, neon signs,
// the beachfront, the docks, the market, and the big wheel on the pier side.
// Everything here is placed once, deterministically, so the city looks the
// same every run and every screenshot.
import * as THREE from "three";
import { makeSeededRandom, randomRange, randomPick } from "./random.js";

export const CITY_HALF = 200;
export const ROAD_SPACING = 55;
export const ROAD_WIDTH = 11;

// Warm sunset palette: terracotta, peach, teal and cream walls under a low sun.
const WALL_COLORS = [0xe8a06a, 0xf2c98a, 0x7fc8b8, 0xf7e3c0, 0xd96c4f, 0x9fb8d8, 0xe8a2b8, 0xc8b06a];
const ROOF_COLORS = [0xa34a2e, 0x3f6fb5, 0x4f9d6c, 0x8a5fb5, 0xc8b06a, 0x6b4a8a];
const NEON_COLORS = [0xff2a7a, 0x2affd8, 0xffd23e, 0xff6a2a, 0x7aff5a, 0xc86aff];
const WINDOW_GLOW = 0xffd98a;

function lambert(color) {
  return new THREE.MeshLambertMaterial({ color });
}

function glow(color) {
  return new THREE.MeshBasicMaterial({ color });
}

function box(group, material, x, y, z, w, h, d) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

// A strip of warm lit windows on one face of a building.
function windowStrip(group, x, y, z, w, h, face) {
  const win = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glow(WINDOW_GLOW));
  win.position.set(x, y, z);
  if (face === "south") win.rotation.y = 0;
  else if (face === "north") win.rotation.y = Math.PI;
  else if (face === "east") win.rotation.y = Math.PI / 2;
  else win.rotation.y = -Math.PI / 2;
  group.add(win);
  return win;
}

// A bright neon sign board stuck to a wall, facing the street.
function neonSign(group, rng, x, y, z, w, face) {
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(w, 2.4),
    glow(randomPick(rng, NEON_COLORS))
  );
  sign.position.set(x, y, z);
  sign.rotation.y = face === "south" ? 0 : face === "north" ? Math.PI : face === "east" ? Math.PI / 2 : -Math.PI / 2;
  group.add(sign);
  return sign;
}

// Build the whole city once. Returns the colliders, road lines, building
// rectangles (for the minimap), landmarks and spawn points that traffic,
// police, missions and the HUD all read from.
export function buildCity(scene) {
  const rng = makeSeededRandom(20261118);
  const group = new THREE.Group();
  group.name = "solmar-city-golden-hour";
  scene.add(group);

  const colliders = [];
  const roads = [];
  const buildings = [];
  const buildingRects = [];

  // Land: warm dry grass and sand tones; the sea is a deep sunset blue.
  const land = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY_HALF * 2 + 80, CITY_HALF * 2 + 80),
    lambert(0xc9a86e)
  );
  land.rotation.x = -Math.PI / 2;
  group.add(land);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(90, CITY_HALF * 2 + 80),
    lambert(0x1e6f9e)
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(-CITY_HALF - 45, 0.05, 0);
  group.add(sea);

  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(26, CITY_HALF * 2),
    lambert(0xf2dcae)
  );
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(-CITY_HALF + 2, 0.06, 0);
  group.add(beach);

  // Sidewalks frame every road, so the grid reads as streets, not bare asphalt.
  const sidewalkMat = lambert(0xb59a78);
  const roadMat = lambert(0x33373e);
  const dashMat = lambert(0xf5e9c8);
  for (let x = -165; x <= 165; x += ROAD_SPACING) {
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH + 7, CITY_HALF * 2), sidewalkMat);
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(x, 0.07, 0);
    group.add(walk);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, CITY_HALF * 2), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.08, 0);
    group.add(road);
    roads.push({ x1: x, z1: -CITY_HALF, x2: x, z2: CITY_HALF, vertical: true });
    for (let z = -CITY_HALF + 12; z < CITY_HALF; z += 14) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 5), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.1, z);
      group.add(dash);
    }
  }
  for (let z = -165; z <= 165; z += ROAD_SPACING) {
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(CITY_HALF * 2, ROAD_WIDTH + 7), sidewalkMat);
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(0, 0.07, z);
    group.add(walk);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(CITY_HALF * 2, ROAD_WIDTH), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.08, z);
    group.add(road);
    roads.push({ x1: -CITY_HALF, z1: z, x2: CITY_HALF, z2: z, vertical: false });
  }

  // Buildings fill every block between roads. Downtown (near the centre) gets
  // towers with lit windows and neon; the market (south) gets low colourful
  // shops; the docks (east) get warehouses and container stacks.
  const blockCenters = [];
  for (let bx = -165 + ROAD_SPACING / 2; bx < 165; bx += ROAD_SPACING) {
    for (let bz = -165 + ROAD_SPACING / 2; bz < 165; bz += ROAD_SPACING) {
      blockCenters.push({ x: bx, z: bz });
    }
  }
  for (const block of blockCenters) {
    const distCenter = Math.hypot(block.x, block.z);
    const isDowntown = distCenter < 80;
    const isMarket = block.z > 90;
    const isDocks = block.x > 130;
    const count = isDowntown ? 1 : 2;
    for (let i = 0; i < count; i++) {
      const ox = count === 1 ? 0 : (i === 0 ? -11 : 11);
      const oz = count === 1 ? 0 : (i === 0 ? -11 : 11);
      const w = randomRange(rng, 14, 20);
      const d = randomRange(rng, 14, 20);
      let h;
      if (isDowntown) h = randomRange(rng, 34, 72);
      else if (isDocks) h = randomRange(rng, 10, 16);
      else if (isMarket) h = randomRange(rng, 7, 13);
      else h = randomRange(rng, 10, 26);
      const x = block.x + ox;
      const z = block.z + oz;
      const color = isDocks ? 0x8a7f74 : randomPick(rng, WALL_COLORS);
      const mesh = box(group, lambert(color), x, h / 2, z, w, h, d);
      buildings.push(mesh);
      buildingRects.push({ x, z, w, d });
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      // Roof cap, warm window strips on the street faces, neon on the tall ones.
      box(group, lambert(randomPick(rng, ROOF_COLORS)), x, h + 0.6, z, w * 0.7, 1.2, d * 0.7);
      for (let wy = 6; wy < h - 3; wy += 8) {
        windowStrip(group, x, wy, z + d / 2 + 0.06, w * 0.6, 2.0, "south");
        if (h > 20) windowStrip(group, x + w / 2 + 0.06, wy, z, d * 0.6, 2.0, "east");
      }
      if (isDowntown && h > 40) {
        neonSign(group, rng, x, h * 0.55, z + d / 2 + 0.12, Math.min(12, w * 0.7), "south");
      }
      if (isMarket) {
        neonSign(group, rng, x, 5.2, z + d / 2 + 0.12, Math.min(10, w * 0.7), "south");
      }
    }
  }

  // Marina Tower, the downtown landmark: a tall glass slab with a glowing crown
  // and a blinking beacon on its antenna.
  const tower = box(group, lambert(0x4a90c8), 27.5, 48, 27.5, 26, 96, 26);
  tower.name = "marina-tower";
  colliders.push({ minX: 14.5, maxX: 40.5, minZ: 14.5, maxZ: 40.5 });
  buildingRects.push({ x: 27.5, z: 27.5, w: 26, d: 26 });
  box(group, glow(0xffd23e), 27.5, 97, 27.5, 28, 2, 28);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 14, 6), lambert(0x333333));
  antenna.position.set(27.5, 105, 27.5);
  group.add(antenna);
  const beaconLight = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), glow(0xff2a2a));
  beaconLight.position.set(27.5, 112, 27.5);
  beaconLight.name = "tower-beacon";
  group.add(beaconLight);
  for (let wy = 8; wy < 92; wy += 8) {
    windowStrip(group, 27.5, wy, 27.5 + 13.06, 15, 2.4, "south");
  }

  // The big wheel on the beachfront: two A-frame legs, a turning rim with
  // cabins, and a hub light. It turns slowly the whole game.
  const wheelGroup = new THREE.Group();
  wheelGroup.position.set(-182, 0, -110);
  group.add(wheelGroup);
  const legMat = lambert(0xf2f2f2);
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.0, 26, 6), legMat);
    leg.position.set(side * 3, 13, 0);
    leg.rotation.z = side * 0.28;
    wheelGroup.add(leg);
  }
  const rim = new THREE.Group();
  rim.position.set(0, 24, 0);
  wheelGroup.add(rim);
  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(11, 0.55, 8, 28), glow(0xffd23e));
  rim.add(rimRing);
  const spokeMat = lambert(0xd8d8d8);
  for (let s = 0; s < 4; s++) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 22, 6), spokeMat);
    spoke.rotation.z = (s * Math.PI) / 4;
    rim.add(spoke);
  }
  const cabinColors = [0xff5a5a, 0x2a6fd8, 0x37d67a, 0xffd23e];
  for (let c = 0; c < 8; c++) {
    const angle = (c / 8) * Math.PI * 2;
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 2.2, 2.2),
      lambert(cabinColors[c % cabinColors.length])
    );
    cabin.position.set(Math.sin(angle) * 11, Math.cos(angle) * 11, 0);
    rim.add(cabin);
  }
  const hub = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 8), glow(0xff6a2a));
  rim.add(hub);
  colliders.push({ minX: -188, maxX: -176, minZ: -116, maxZ: -104 });

  // Beach umbrellas and stalls along the promenade, so the west edge is a place.
  const umbrellaColors = [0xff5a5a, 0xffd23e, 0x2a6fd8, 0x37d67a];
  for (let i = 0; i < 7; i++) {
    const ux = -178 + (i % 2) * 6;
    const uz = -150 + i * 52;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 3.4, 6), lambert(0xf2f2f2));
    pole.position.set(ux, 1.7, uz);
    group.add(pole);
    const top = new THREE.Mesh(
      new THREE.ConeGeometry(2.6, 1.4, 8),
      lambert(umbrellaColors[i % umbrellaColors.length])
    );
    top.position.set(ux, 3.9, uz);
    group.add(top);
  }

  // Palm trees along the beach promenade, the market streets and the docks road.
  const trunkMat = lambert(0x8a6a42);
  const leafMat = lambert(0x3f9d4e);
  function addPalm(x, z) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 7, 6), trunkMat);
    trunk.position.set(x, 3.5, z);
    group.add(trunk);
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(3.2, 3.4, 7), leafMat);
    leaves.position.set(x, 8.2, z);
    group.add(leaves);
    colliders.push({ minX: x - 0.6, maxX: x + 0.6, minZ: z - 0.6, maxZ: z + 0.6 });
  }
  for (let z = -180; z <= 180; z += 24) addPalm(-172, z);
  for (let z = -150; z <= 150; z += 48) addPalm(-140, z);
  for (let x = -120; x <= 120; x += 48) addPalm(x, 118);
  for (let x = -110; x <= 110; x += 55) addPalm(x, -158);

  // Street lamps with warm bulbs on the main avenues.
  const lampMat = lambert(0x2c2f36);
  const bulbMat = glow(0xffe9a8);
  for (let x = -165; x <= 165; x += ROAD_SPACING) {
    for (let z = -110; z <= 110; z += 110) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 6, 6), lampMat);
      pole.position.set(x + 7, 3, z);
      group.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), bulbMat);
      bulb.position.set(x + 7, 6.2, z);
      group.add(bulb);
    }
  }

  // Traffic lights at the four central intersections: pole, housing, three lamps.
  for (const [tx, tz] of [[-55, -55], [55, -55], [-55, 55], [55, 55]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 5.4, 6), lampMat);
    pole.position.set(tx + 7, 2.7, tz + 7);
    group.add(pole);
    box(group, lambert(0x1c1c1c), tx + 7, 5.6, tz + 7, 0.9, 2.2, 0.9);
    box(group, glow(0x37d67a), tx + 7, 4.9, tz + 7.55, 0.5, 0.5, 0.1);
  }

  // Docks: wooden piers jutting east, with crates and bright container stacks.
  const pierMat = lambert(0x7a5c38);
  const containerColors = [0xd96c4f, 0x2a6fd8, 0x37d67a, 0xffd23e];
  for (const pz of [-60, 0, 60]) {
    box(group, pierMat, 185, 1, pz, 34, 2, 12);
    for (let i = 0; i < 3; i++) {
      box(group, lambert(0xd96c4f), 172 + i * 7, 3.4, pz + randomRange(rng, -3, 3), 5, 4.8, 5);
    }
  }
  for (let i = 0; i < 6; i++) {
    box(group, lambert(containerColors[i % containerColors.length]),
      150 + (i % 3) * 12, 3, -90 + Math.floor(i / 3) * 16, 10, 6, 7);
  }

  // Market stalls in the south district: striped awnings over crates.
  const awningColors = [0xff5a5a, 0xffd23e, 0x37d67a];
  for (let i = 0; i < 8; i++) {
    const sx = -120 + i * 34;
    const sz = 140;
    box(group, lambert(awningColors[i % 3]), sx, 4.4, sz, 12, 0.8, 9);
    box(group, lambert(0x9a7b4f), sx, 1.6, sz, 10, 3.2, 8);
    colliders.push({ minX: sx - 5, maxX: sx + 5, minZ: sz - 4, maxZ: sz + 4 });
  }

  return {
    group,
    colliders,
    roads,
    buildings,
    buildingRects,
    ferrisWheel: rim,
    landmarks: {
      marinaTower: { x: 27.5, z: 27.5, label: "Marina Tower" },
      bank: { x: 55, z: -55, label: "Solmar Bank" },
      docks: { x: 178, z: 0, label: "Solmar Docks" },
      market: { x: 0, z: 140, label: "Mercado Solmar" },
      safehouse: { x: -140, z: -140, label: "Safehouse" },
      beach: { x: -178, z: 40, label: "Solmar Beach" },
      garage: { x: -55, z: 55, label: "Rio's Garage" },
      ferrisWheel: { x: -182, z: -110, label: "Solmar Wheel" },
      gunShop: { x: 55, z: 110, label: "Ammu-Nation" },
    },
    // Open spots on roads where the player, parked cars and traffic can spawn.
    carSpawns: [
      { x: -55, z: 0, heading: 0 },
      { x: 0, z: -55, heading: Math.PI / 2 },
      { x: 55, z: 55, heading: Math.PI },
      { x: -110, z: 110, heading: -Math.PI / 2 },
      { x: 110, z: -110, heading: 0 },
      { x: 0, z: 110, heading: Math.PI / 2 },
    ],
    playerSpawn: { x: -55, z: 55 },
  };
}

// True when a circle of the given radius at (x, z) overlaps any building collider.
export function collidesWithCity(city, x, z, radius) {
  for (const box of city.colliders) {
    if (x + radius > box.minX && x - radius < box.maxX &&
        z + radius > box.minZ && z - radius < box.maxZ) {
      return box;
    }
  }
  return null;
}

// Push a circle out of a collider it overlaps, so cars and walkers slide along walls.
export function resolveCityCollision(city, x, z, radius) {
  const box = collidesWithCity(city, x, z, radius);
  if (!box) return { x, z, hit: false };
  const pushLeft = x + radius - box.minX;
  const pushRight = box.maxX - (x - radius);
  const pushUp = z + radius - box.minZ;
  const pushDown = box.maxZ - (z - radius);
  const smallest = Math.min(pushLeft, pushRight, pushUp, pushDown);
  if (smallest === pushLeft) x = box.minX - radius;
  else if (smallest === pushRight) x = box.maxX + radius;
  else if (smallest === pushUp) z = box.minZ - radius;
  else z = box.maxZ + radius;
  return { x, z, hit: true };
}
