// SOLMAR's city: a golden-hour beachfront town built from three.js boxes,
// canvas textures and a slow-turning ferris wheel. No external assets.
import * as THREE from 'three';
import { createRng, range, pick, chance } from './random.js';

export const ROADS_V = [-165, -120, -60, 0, 60, 120];
export const ROADS_H = [-120, -60, 0, 60, 120, 180];
export const WORLD = { minX: -220, maxX: 180, minZ: -180, maxZ: 220 };
export const BEACH_ROAD_X = -165;
export const TOWER_POS = { x: 14, z: 104 };
export const WHEEL_POS = { x: -184, z: -108 };

function windowTexture(rng, base, lit) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 256);
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(0, 0, 128, 10);
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 6; col++) {
      const on = rng() < lit;
      g.fillStyle = on ? pick(rng, ['#ffd98a', '#ffe9b0', '#ffb46b']) : 'rgba(20,24,40,0.85)';
      g.fillRect(10 + col * 19, 18 + row * 20, 13, 12);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function neonTexture(word, color) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#14081c';
  g.fillRect(0, 0, 256, 64);
  g.strokeStyle = color;
  g.lineWidth = 3;
  g.strokeRect(4, 4, 248, 56);
  g.fillStyle = color;
  g.font = 'bold 34px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(word, 128, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function stripeTexture(rng) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const g = c.getContext('2d');
  const cols = [pick(rng, ['#e85d3d', '#2f8f6b', '#e8a13d', '#3d7de8']), '#f7ead2'];
  for (let i = 0; i < 8; i++) {
    g.fillStyle = cols[i % 2];
    g.fillRect(i * 16, 0, 16, 64);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function roadTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#33333a';
  g.fillRect(0, 0, 64, 128);
  g.fillStyle = '#e8c85a';
  g.fillRect(30, 8, 4, 40);
  g.fillRect(30, 76, 4, 40);
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.fillRect(3, 0, 2, 128);
  g.fillRect(59, 0, 2, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function policeTexture() {
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

export function buildCity(G) {
  const scene = G.scene;
  const rng = createRng(20261118);
  scene.background = new THREE.Color(0xff8c42);
  scene.fog = new THREE.Fog(0xff9a52, 130, 460);

  const sun = new THREE.DirectionalLight(0xffb36b, 1.7);
  sun.position.set(-190, 70, -60);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xffb27a, 0x5a4636, 0.65));
  const amb = new THREE.AmbientLight(0xff9a6b, 0.35);
  scene.add(amb);

  const city = {
    buildings: [],
    wheel: null,
    beacon: null,
    sun,
    amb,
    collide(x, z, r) {
      let nx = x;
      let nz = z;
      for (const b of city.buildings) {
        const cx = Math.max(b.x - b.hw, Math.min(nx, b.x + b.hw));
        const cz = Math.max(b.z - b.hd, Math.min(nz, b.z + b.hd));
        const dx = nx - cx;
        const dz = nz - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 < r * r) {
          if (d2 > 0.0001) {
            const d = Math.sqrt(d2);
            nx = cx + (dx / d) * r;
            nz = cz + (dz / d) * r;
          } else {
            nz = b.z + b.hd + r;
          }
        }
      }
      nx = Math.max(WORLD.minX + 2, Math.min(WORLD.maxX - 2, nx));
      nz = Math.max(WORLD.minZ + 2, Math.min(WORLD.maxZ - 2, nz));
      return { x: nx, z: nz };
    },
    setDusk(on) {
      if (on) {
        scene.background.set(0x8a3b4d);
        scene.fog.color.set(0x9a4a52);
        sun.intensity = 0.9;
        sun.color.set(0xff7a4a);
      } else {
        scene.background.set(0xff8c42);
        scene.fog.color.set(0xff9a52);
        sun.intensity = 1.7;
        sun.color.set(0xffb36b);
      }
    },
  };

  // Ground: warm urban base, sand strip, sea, foam line.
  const base = new THREE.Mesh(
    new THREE.PlaneGeometry(460, 460),
    new THREE.MeshLambertMaterial({ color: 0x9c8a6d })
  );
  base.rotation.x = -Math.PI / 2;
  base.position.set(-20, 0, 20);
  scene.add(base);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 420),
    new THREE.MeshLambertMaterial({ color: 0xe8cf9a })
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(-174, 0.01, 20);
  scene.add(sand);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 460),
    new THREE.MeshLambertMaterial({ color: 0x2f7ea8 })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(-252, 0.02, 20);
  scene.add(sea);

  const foam = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 420),
    new THREE.MeshBasicMaterial({ color: 0xf5f0dc })
  );
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(-190, 0.03, 20);
  scene.add(foam);

  // Roads: sidewalk slab, then asphalt with a dashed centre line.
  const roadTex = roadTexture();
  const walkMat = new THREE.MeshLambertMaterial({ color: 0xb0a894 });
  const roadMat = new THREE.MeshLambertMaterial({ map: roadTex });
  for (const x of ROADS_V) {
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(16, 400), walkMat);
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(x, 0.02, 20);
    scene.add(walk);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(10, 400), roadMat.clone());
    road.material.map = roadTex.clone();
    road.material.map.needsUpdate = true;
    road.material.map.repeat.set(1, 26);
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.04, 20);
    scene.add(road);
  }
  for (const z of ROADS_H) {
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(400, 16), walkMat);
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(-20, 0.02, z);
    scene.add(walk);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(400, 10), roadMat.clone());
    road.material.map = roadTex.clone();
    road.material.map.needsUpdate = true;
    road.material.map.repeat.set(26, 1);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = Math.PI / 2;
    road.position.set(-20, 0.04, z);
    scene.add(road);
  }

  // Buildings: dense blocks between streets, tall downtown, none on the
  // beach, the market, the spawn plaza or the shop lots.
  const skins = [
    windowTexture(createRng(11), '#8a6a52', 0.55),
    windowTexture(createRng(22), '#6b5a72', 0.5),
    windowTexture(createRng(33), '#7a5a4a', 0.6),
    windowTexture(createRng(44), '#5a6a7a', 0.45),
    windowTexture(createRng(55), '#a8845a', 0.55),
  ];
  const neons = ['SOLMAR', 'HOTEL', 'CASINO', 'NEON', 'PALMS', 'ORO', 'TACOS', 'SURF'];
  const neonCols = ['#ff5ad2', '#3de8ff', '#ffe94d', '#7dff5a', '#ff8a3d'];
  const keepOut = [
    { x0: -24, x1: 16, z0: 110, z1: 148 }, // market
    { x0: -72, x1: -38, z0: 38, z1: 76 }, // spawn plaza + garage lot
    { x0: 34, x1: 62, z0: 104, z1: 132 }, // Ammu-Nation lot
    { x0: 0, x1: 28, z0: 90, z1: 118 }, // Marina Tower lot
    { x0: -200, x1: -156, z0: -180, z1: 220 }, // beach + sea
  ];
  const blocked = (x, z, hw, hd) =>
    keepOut.some((k) => x - hw < k.x1 && x + hw > k.x0 && z - hd < k.z1 && z + hd > k.z0);
  const vEdges = [-220, ...ROADS_V, 180];
  const hEdges = [-180, ...ROADS_H, 220];
  for (let vi = 0; vi < vEdges.length - 1; vi++) {
    for (let hi = 0; hi < hEdges.length - 1; hi++) {
      const bx0 = vEdges[vi] + 10;
      const bx1 = vEdges[vi + 1] - 10;
      const bz0 = hEdges[hi] + 10;
      const bz1 = hEdges[hi + 1] - 10;
      if (bx1 - bx0 < 14 || bz1 - bz0 < 14) continue;
      const downtown = bx0 > -45 && bx1 < 45 && bz0 > 55;
      const count = downtown ? int2(rng, 2, 3) : int2(rng, 1, 2);
      for (let n = 0; n < count; n++) {
        const w = range(rng, 10, 17);
        const d = range(rng, 10, 15);
        const x = range(rng, bx0 + w / 2, bx1 - w / 2);
        const z = range(rng, bz0 + d / 2, bz1 - d / 2);
        if (blocked(x, z, w / 2 + 1, d / 2 + 1)) continue;
        if (city.buildings.some((b) => Math.abs(b.x - x) < (b.hw + w / 2 + 3) && Math.abs(b.z - z) < (b.hd + d / 2 + 3))) continue;
        const h = downtown ? range(rng, 24, 52) : range(rng, 8, 26);
        const skin = pick(rng, skins);
        const tower = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          new THREE.MeshLambertMaterial({ map: skin })
        );
        tower.position.set(x, h / 2, z);
        scene.add(tower);
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(w * 0.3, 1.2, d * 0.3),
          new THREE.MeshLambertMaterial({ color: 0x4a4038 })
        );
        roof.position.set(x + w * 0.2, h + 0.6, z);
        scene.add(roof);
        city.buildings.push({ x, z, hw: w / 2, hd: d / 2, h });
        if (downtown && chance(rng, 0.55)) {
          const sign = new THREE.Mesh(
            new THREE.PlaneGeometry(11, 2.8),
            new THREE.MeshBasicMaterial({ map: neonTexture(pick(rng, neons), pick(rng, neonCols)) })
          );
          sign.position.set(x, Math.min(h - 3, 26), z + d / 2 + 0.15);
          scene.add(sign);
        }
      }
    }
  }

  // Marina Tower: the tallest block downtown, antenna + blinking beacon.
  const towerSkin = windowTexture(createRng(99), '#7a6a8a', 0.65);
  const marina = new THREE.Mesh(
    new THREE.BoxGeometry(16, 70, 16),
    new THREE.MeshLambertMaterial({ map: towerSkin })
  );
  marina.position.set(TOWER_POS.x, 35, TOWER_POS.z);
  scene.add(marina);
  city.buildings.push({ x: TOWER_POS.x, z: TOWER_POS.z, hw: 8, hd: 8, h: 70 });
  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.5, 12, 8),
    new THREE.MeshLambertMaterial({ color: 0x30303a })
  );
  antenna.position.set(TOWER_POS.x, 76, TOWER_POS.z);
  scene.add(antenna);
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xff2a2a })
  );
  beacon.position.set(TOWER_POS.x, 82.5, TOWER_POS.z);
  scene.add(beacon);
  city.beacon = beacon;

  // Solmar Wheel on the beach, turning slowly, facing the city.
  const wheelGroup = new THREE.Group();
  wheelGroup.position.set(WHEEL_POS.x, 0, WHEEL_POS.z);
  wheelGroup.rotation.y = Math.PI / 2;
  const legMat = new THREE.MeshLambertMaterial({ color: 0xe8e0cc });
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 20, 8), legMat);
    leg.position.set(s * 5, 9, 0);
    leg.rotation.z = s * 0.3;
    wheelGroup.add(leg);
  }
  const spinner = new THREE.Group();
  spinner.position.set(0, 17, 0);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(15, 0.55, 8, 40),
    new THREE.MeshBasicMaterial({ color: 0xffd94d })
  );
  spinner.add(ring);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.4, 30, 0.4), legMat);
    spoke.position.set(0, 0, 0);
    spoke.rotation.z = a;
    spinner.add(spoke);
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2, 2),
      new THREE.MeshLambertMaterial({ color: pick(rng, [0xff5a7a, 0x3de8ff, 0xffe94d, 0x7dff5a]) })
    );
    cab.position.set(Math.cos(a) * 15, Math.sin(a) * 15, 0);
    spinner.add(cab);
  }
  wheelGroup.add(spinner);
  scene.add(wheelGroup);
  city.wheel = spinner;

  // Market stalls with striped canopies.
  for (let i = 0; i < 6; i++) {
    const sx = -15.3 + i * 5.4;
    const sz = 126 + (i % 2) * 12;
    const stall = new THREE.Group();
    stall.position.set(sx, 0, sz);
    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(4, 1.1, 2.2),
      new THREE.MeshLambertMaterial({ color: 0x8a5a3a })
    );
    counter.position.y = 0.55;
    stall.add(counter);
    const canopy = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 3),
      new THREE.MeshLambertMaterial({ map: stripeTexture(rng), side: THREE.DoubleSide })
    );
    canopy.rotation.x = -Math.PI / 2 + 0.35;
    canopy.position.y = 2.9;
    stall.add(canopy);
    for (const px of [-2, 2]) {
      for (const pz of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6), legMat);
        post.position.set(px, 1.3, pz);
        stall.add(post);
      }
    }
    const goods = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.5, 1.6),
      new THREE.MeshLambertMaterial({ color: pick(rng, [0xe85d3d, 0x2f8f6b, 0xe8a13d]) })
    );
    goods.position.y = 1.35;
    stall.add(goods);
    scene.add(stall);
  }

  // Palms along the beachfront, umbrellas on the sand, lamps, traffic
  // lights at the downtown crossings, and two wooden docks.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f8f4f });
  const palmAt = (x, z, s = 1) => {
    const palm = new THREE.Group();
    palm.position.set(x, 0, z);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * s, 0.4 * s, 7 * s, 8), trunkMat);
    trunk.position.y = 3.5 * s;
    trunk.rotation.z = 0.12;
    palm.add(trunk);
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 3.4 * s), leafMat);
      const a = (i / 5) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 1.2 * s, 7 * s, Math.sin(a) * 1.2 * s);
      leaf.rotation.y = -a;
      leaf.rotation.x = 0.5;
      palm.add(leaf);
    }
    scene.add(palm);
  };
  for (let z = -160; z < 210; z += 26) palmAt(-156, z, range(rng, 0.9, 1.3));
  for (let z = -100; z < 160; z += 55) palmAt(-178, z, range(rng, 0.9, 1.2));
  for (let i = 0; i < 8; i++) palmAt(range(rng, -30, 30), range(rng, 120, 138), 1);

  const umbCols = [0xff5a7a, 0x3de8ff, 0xffe94d];
  for (let i = 0; i < 7; i++) {
    const ux = -180 + (i % 3) * 4;
    const uz = -140 + Math.floor(i / 3) * 90 + range(rng, -8, 8);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 6), legMat);
    pole.position.set(ux, 1.2, uz);
    scene.add(pole);
    const top = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 0.9, 8),
      new THREE.MeshLambertMaterial({ color: umbCols[i % 3] })
    );
    top.position.set(ux, 2.8, uz);
    scene.add(top);
  }

  const lampHeadMat = new THREE.MeshBasicMaterial({ color: 0xffc46b });
  for (const x of ROADS_V) {
    for (let z = -160; z < 210; z += 60) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 6), new THREE.MeshLambertMaterial({ color: 0x2a2a30 }));
      pole.position.set(x + 6, 3, z);
      scene.add(pole);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), lampHeadMat);
      head.position.set(x + 6, 6.1, z);
      scene.add(head);
    }
  }
  const lightAt = (x, z) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5.5, 6), new THREE.MeshLambertMaterial({ color: 0x222226 }));
    pole.position.set(x, 2.75, z);
    scene.add(pole);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), new THREE.MeshLambertMaterial({ color: 0x1a1a1e }));
    box.position.set(x, 5.6, z);
    scene.add(box);
    const dotCols = [0xff2a2a, 0xffc42a, 0x2aff5a];
    dotCols.forEach((c, i) => {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color: c }));
      dot.position.set(x, 6.1 - i * 0.42, z + 0.28);
      scene.add(dot);
    });
  };
  lightAt(6, 66);
  lightAt(-6, 114);
  lightAt(66, 114);
  lightAt(-54, 66);

  const dockMat = new THREE.MeshLambertMaterial({ color: 0x8a6a44 });
  for (const dz of [-40, 70]) {
    for (let i = 0; i < 8; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.25, 3.4), dockMat);
      plank.position.set(-192 - i * 2.6, 0.6, dz);
      scene.add(plank);
    }
  }

  return city;
}

function int2(rng, low, high) {
  return Math.floor(low + rng() * (high - low + 1));
}

export function updateCity(G, dt) {
  if (G.city.wheel) G.city.wheel.rotation.z += dt * 0.22;
  if (G.city.beacon) {
    const on = Math.sin(G.time * 4) > 0;
    G.city.beacon.material.color.set(on ? 0xff2a2a : 0x551111);
  }
}
