// city.js — builds Solmar City: roads, towers, market streets, beach, docks and props.
import * as THREE from "three";
import { makeSeededRandom, randomRange, randomPick } from "./random.js";

export const CITY_HALF = 200;
export const ROAD_SPACING = 55;
export const ROAD_WIDTH = 11;

const BUILDING_COLORS = [0xf2d8a7, 0xffb27d, 0x7dd8c3, 0xff9d9d, 0xa8c8f0, 0xf7e6c8, 0xe8a2c8, 0x9fd08a];
const ROOF_COLORS = [0xd96c4f, 0x3f6fb5, 0x4f9d6c, 0x8a5fb5, 0xc8b06a];

function makeBoxMaterial(color) {
  return new THREE.MeshLambertMaterial({ color });
}

function addBox(scene, group, material, x, y, z, w, h, d) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  group.add(mesh);
  return mesh;
}

// Build the whole city once. Returns the colliders, road lines, landmarks and spawn points
// that the traffic, police, missions and minimap all read from.
export function buildCity(scene) {
  const rng = makeSeededRandom(20261117);
  const group = new THREE.Group();
  group.name = "solmar-city";
  scene.add(group);

  const colliders = [];
  const roads = [];
  const buildings = [];

  // Ground: warm sand-toned land, plus a blue sea strip on the west edge.
  const land = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY_HALF * 2 + 80, CITY_HALF * 2 + 80),
    new THREE.MeshLambertMaterial({ color: 0xcbb98a })
  );
  land.rotation.x = -Math.PI / 2;
  land.position.set(0, 0, 0);
  group.add(land);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(90, CITY_HALF * 2 + 80),
    new THREE.MeshLambertMaterial({ color: 0x2a7fb8 })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(-CITY_HALF - 45, 0.05, 0);
  group.add(sea);

  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(26, CITY_HALF * 2),
    new THREE.MeshLambertMaterial({ color: 0xf2e2b8 })
  );
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(-CITY_HALF + 2, 0.06, 0);
  group.add(beach);

  // Road grid: vertical and horizontal asphalt strips with pale centre dashes.
  const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x3a3f46 });
  const dashMaterial = new THREE.MeshLambertMaterial({ color: 0xf5e9c8 });
  for (let x = -165; x <= 165; x += ROAD_SPACING) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, CITY_HALF * 2), roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.08, 0);
    group.add(road);
    roads.push({ x1: x, z1: -CITY_HALF, x2: x, z2: CITY_HALF, vertical: true });
    for (let z = -CITY_HALF + 12; z < CITY_HALF; z += 14) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 5), dashMaterial);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.1, z);
      group.add(dash);
    }
  }
  for (let z = -165; z <= 165; z += ROAD_SPACING) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(CITY_HALF * 2, ROAD_WIDTH), roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.08, z);
    group.add(road);
    roads.push({ x1: -CITY_HALF, z1: z, x2: CITY_HALF, z2: z, vertical: false });
  }

  // Buildings fill every block between roads. Downtown (near the centre) gets towers;
  // the market district (south) gets low colourful shops; the docks (east) get warehouses.
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
      const color = isDocks ? 0x8a7f74 : randomPick(rng, BUILDING_COLORS);
      const mesh = addBox(scene, group, makeBoxMaterial(color), x, h / 2, z, w, h, d);
      buildings.push(mesh);
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      // Roof cap and a few lit windows on tall towers.
      const roof = addBox(scene, group, makeBoxMaterial(randomPick(rng, ROOF_COLORS)),
        x, h + 0.6, z, w * 0.7, 1.2, d * 0.7);
      roof.castShadow = false;
      if (h > 40) {
        const winMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
        for (let wy = 8; wy < h - 4; wy += 9) {
          const win = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.55, 2.2), winMat);
          win.position.set(x, wy, z + d / 2 + 0.06);
          group.add(win);
        }
      }
    }
  }

  // Marina Tower, the downtown landmark: a tall glass slab with a glowing crown.
  // It stands on the (27.5, 27.5) block, clear of the road grid.
  const tower = addBox(scene, group, makeBoxMaterial(0x5fb8e8), 27.5, 48, 27.5, 26, 96, 26);
  tower.name = "marina-tower";
  colliders.push({ minX: 14.5, maxX: 40.5, minZ: 14.5, maxZ: 40.5 });
  const crown = addBox(scene, group, new THREE.MeshBasicMaterial({ color: 0xffd23e }),
    27.5, 97, 27.5, 28, 2, 28);

  // Palm trees along the beach promenade and the market streets.
  const trunkMat = makeBoxMaterial(0x8a6a42);
  const leafMat = makeBoxMaterial(0x3f9d4e);
  function addPalm(x, z) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 7, 6), trunkMat);
    trunk.position.set(x, 3.5, z);
    group.add(trunk);
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(3.2, 3.4, 7), leafMat);
    leaves.position.set(x, 8.2, z);
    group.add(leaves);
    colliders.push({ minX: x - 0.6, maxX: x + 0.6, minZ: z - 0.6, maxZ: z + 0.6 });
  }
  for (let z = -180; z <= 180; z += 24) addPalm(-178, z);
  for (let z = -150; z <= 150; z += 48) addPalm(-140, z);
  for (let x = -120; x <= 120; x += 48) addPalm(x, 118);

  // Street lamps on the main avenues.
  const lampMat = makeBoxMaterial(0x2c2f36);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
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

  // Docks: wooden piers jutting east into the water-side basin, with crates.
  const pierMat = makeBoxMaterial(0x7a5c38);
  for (const pz of [-60, 0, 60]) {
    addBox(scene, group, pierMat, 185, 1, pz, 34, 2, 12);
    for (let i = 0; i < 3; i++) {
      addBox(scene, group, makeBoxMaterial(0xd96c4f),
        172 + i * 7, 3.4, pz + randomRange(rng, -3, 3), 5, 4.8, 5);
    }
  }

  // Market stalls in the south district: striped awnings over crates.
  const awningColors = [0xff5a5a, 0xffd23e, 0x37d67a];
  for (let i = 0; i < 8; i++) {
    const sx = -120 + i * 34;
    const sz = 140;
    addBox(scene, group, makeBoxMaterial(awningColors[i % 3]), sx, 4.4, sz, 12, 0.8, 9);
    addBox(scene, group, makeBoxMaterial(0x9a7b4f), sx, 1.6, sz, 10, 3.2, 8);
    colliders.push({ minX: sx - 5, maxX: sx + 5, minZ: sz - 4, maxZ: sz + 4 });
  }

  return {
    group,
    colliders,
    roads,
    buildings,
    landmarks: {
      marinaTower: { x: 0, z: 0, label: "Marina Tower" },
      bank: { x: 55, z: -55, label: "Solmar Bank" },
      docks: { x: 178, z: 0, label: "Solmar Docks" },
      market: { x: 0, z: 140, label: "Mercado Solmar" },
      safehouse: { x: -140, z: -140, label: "Safehouse" },
      beach: { x: -178, z: 40, label: "Solmar Beach" },
      garage: { x: -55, z: 55, label: "Rio's Garage" },
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
