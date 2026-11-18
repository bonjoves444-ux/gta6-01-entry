// city.js — Solmar itself: a sunset beachfront city with the sea to
// the west, a neon downtown, the marina tower, a ferris wheel, the
// market, the docks, palms marching down Palm Strand, and the two
// shops. Everything is procedural canvas textures and shared
// geometry, so the city stays self-contained and light enough for a
// software renderer.
//
// Heading convention: heading 0 is north, forward is (sin h, -cos h).

import * as THREE from 'three';
import { mulberry32, range, pick, clamp } from './random.js';
// Car builds the kerbside parked cars below (and the traffic the
// player can steal lives in vehicles.js too, same class).
import { Car } from './vehicles.js';

export const SEA_EDGE_X = -118;
export const SPAWN_POS = { x: -62, z: 18 };
export const GARAGE_POS = { x: -56, z: 24 };
export const AMMU_POS = { x: 60, z: -20 };
export const MARKET_POS = { x: 25, z: 45 };
export const TOWER_POS = { x: -70, z: -45 };
export const WHEEL_POS = { x: -106, z: 55 };

const PALETTES = {
  sunset: {
    name: 'sunset', sunY: 30,
    top: 0x2b1a5e, mid: 0xff7a3c, low: 0xffb36b,
    fog: 0xe88a52, sunColor: 0xffd9a0, sunIntensity: 2.6,
    hemiSky: 0xffb080, hemiGround: 0x40304a,
    exposure: 1.15, rimColor: 0xff6fa5, cloud: 0xffd9c0,
  },
  dusk: {
    name: 'dusk', sunY: 18,
    top: 0x1a0f3c, mid: 0xc44a7a, low: 0xff5a3c,
    fog: 0x8a3a5e, sunColor: 0xff9a70, sunIntensity: 2.2,
    hemiSky: 0x8a5a9a, hemiGround: 0x2a2038,
    exposure: 1.05, rimColor: 0xd84a8a, cloud: 0xe8a0b8,
  },
  // Night: dark blue sky, cool moonlight, no sun disc — the lamps,
  // shopfronts and wheel bulbs do the lighting, like a neon street.
  night: {
    name: 'night', sunY: 120,
    top: 0x05081f, mid: 0x0d1238, low: 0x241a4a,
    fog: 0x0a0e24, sunColor: 0x8aa0e0, sunIntensity: 0.55,
    hemiSky: 0x35508a, hemiGround: 0x14101e,
    exposure: 1.0, rimColor: 0x2a4a8a, cloud: 0x8a90b8,
  },
};

// --- canvas texture helpers -------------------------------------------------

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// facadeTexture(base, litA, litB, rng): one building face, 6 x 12
// windows with frames, floor lines, vertical tint bands and a lit
// ground-floor shopfront band. Returns { map, emissive } — the
// emissive canvas holds ONLY the lit windows, so at night the
// windows glow and the wall stays dark.
function facadeTexture(base, litA, litB, rng) {
  const c1 = document.createElement('canvas');
  c1.width = 256;
  c1.height = 512;
  const c2 = document.createElement('canvas');
  c2.width = 256;
  c2.height = 512;
  const g = c1.getContext('2d');
  const e = c2.getContext('2d');
  e.fillStyle = '#000000';
  e.fillRect(0, 0, 256, 512);
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 512);
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, 'rgba(255,255,255,0.10)');
  grad.addColorStop(1, 'rgba(0,0,0,0.20)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 512);
  // Vertical tint bands for depth.
  for (let i = 0; i < 3; i++) {
    g.fillStyle = 'rgba(0,0,0,0.08)';
    g.fillRect(40 + i * 80, 0, 26, 512);
  }
  // Ground floor: darker band with four lit shopfronts.
  g.fillStyle = 'rgba(20,14,30,0.55)';
  g.fillRect(0, 468, 256, 44);
  for (let c = 0; c < 4; c++) {
    g.fillStyle = litA;
    g.fillRect(12 + c * 62, 476, 48, 26);
    e.fillStyle = litA;
    e.fillRect(12 + c * 62, 476, 48, 26);
  }
  const cols = 6;
  const rows = 12;
  for (let r = 0; r < rows; r++) {
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(0, 16 + r * 36, 256, 2);
    for (let c = 0; c < cols; c++) {
      const x = 14 + c * 40;
      const y = 20 + r * 36;
      const roll = rng();
      let lit = null;
      if (roll < 0.45) lit = litA;
      else if (roll < 0.58) lit = litB;
      // Window frame, then the lit or dark pane inside it.
      g.fillStyle = 'rgba(20,16,32,0.85)';
      g.fillRect(x - 2, y - 2, 30, 24);
      if (lit) {
        g.fillStyle = lit;
        g.fillRect(x, y, 26, 20);
        e.fillStyle = lit;
        e.fillRect(x, y, 26, 20);
      } else {
        g.fillStyle = 'rgba(48,40,72,0.9)';
        g.fillRect(x, y, 26, 20);
      }
    }
  }
  const map = new THREE.CanvasTexture(c1);
  map.colorSpace = THREE.SRGBColorSpace;
  const emissive = new THREE.CanvasTexture(c2);
  emissive.colorSpace = THREE.SRGBColorSpace;
  return { map, emissive };
}

function asphaltTexture(plain) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#33302e';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.05) + ')';
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    // Plain asphalt has no markings: the cross streets use it, so
    // their rotated dashes never read as dark stripes across the
    // avenue. Only the avenues get dashes and edge lines.
    if (plain) return;
    // Centre dashes, running down the texture.
    g.fillStyle = '#f5c542';
    for (let y = 0; y < h; y += 64) g.fillRect(w / 2 - 4, y + 8, 8, 34);
    // Edge lines.
    g.fillStyle = '#e8e8e8';
    g.fillRect(6, 0, 4, h);
    g.fillRect(w - 10, 0, 4, h);
  });
}

function sandTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#d9b380';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1600; i++) {
      const v = Math.random();
      g.fillStyle = v < 0.5 ? 'rgba(120,80,40,0.25)' : 'rgba(255,240,210,0.3)';
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
}

function stripeTexture(c1, c2) {
  return canvasTex(128, 64, (g, w, h) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 === 0 ? c1 : c2;
      g.fillRect(i * 16, 0, 16, h);
    }
  });
}

function signTexture(lines, bg, fg, glow) {
  return canvasTex(512, 192, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = fg;
    g.lineWidth = 6;
    g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = fg;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    if (lines.length === 1) {
      g.font = 'bold 72px Arial, sans-serif';
      g.fillText(lines[0], w / 2, h / 2);
    } else {
      g.font = 'bold 52px Arial, sans-serif';
      g.fillText(lines[0], w / 2, h / 2 - 42);
      g.font = 'bold 44px Arial, sans-serif';
      g.fillText(lines[1], w / 2, h / 2 + 44);
    }
  });
}

function glowTexture() {
  return canvasTex(128, 128, (g, w, h) => {
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255,205,110,0.85)');
    grad.addColorStop(0.25, 'rgba(255,150,60,0.45)');
    grad.addColorStop(1, 'rgba(255,150,60,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

function cloudTexture() {
  return canvasTex(256, 128, (g, w, h) => {
    for (let i = 0; i < 14; i++) {
      const x = 30 + Math.random() * (w - 60);
      const y = 40 + Math.random() * 48;
      const r = 18 + Math.random() * 26;
      const grad = g.createRadialGradient(x, y, 2, x, y, r);
      grad.addColorStop(0, 'rgba(255,255,255,0.55)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  });
}

// buildCity(scene, seed): build the whole city and hand back the
// handles main.js needs. The scene is kept lean on purpose: shared
// geometries and materials, a 1024 shadow map, and no post-processing,
// so the page loads fast even on a software renderer.
export function buildCity(scene, seed) {
  const rng = mulberry32(seed);
  const group = new THREE.Group();
  scene.add(group);
  const buildings = [];
  const palms = [];
  const peds = [];
  const clouds = [];
  const beacons = [];
  let wheelSpinner = null;
  let foamTex = null;
  let skyMat = null;
  let sunDisc = null;
  let sunHalo = null;

  // --- lights ---------------------------------------------------------------
  const hemi = new THREE.HemisphereLight(0xffb080, 0x40304a, 1.25);
  group.add(hemi);
  const sunLight = new THREE.DirectionalLight(0xffd9a0, 2.6);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.left = -60;
  sunLight.shadow.camera.right = 60;
  sunLight.shadow.camera.top = 60;
  sunLight.shadow.camera.bottom = -60;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 340;
  sunLight.shadow.bias = -0.0006;
  sunLight.position.set(40, 70, -160);
  group.add(sunLight);
  group.add(sunLight.target);
  const rim = new THREE.DirectionalLight(0xff6fa5, 0.9);
  rim.position.set(-60, 40, 120);
  group.add(rim);
  // Warm fill from the south, behind the chase camera: the facades
  // the camera actually sees face south, and the low northern sun
  // leaves them black without it. This one light is the difference
  // between "dark boxes" and a lit city.
  const fill = new THREE.DirectionalLight(0xff9a7a, 0.85);
  fill.position.set(-20, 30, 160);
  group.add(fill);
  group.add(fill.target);
  scene.fog = new THREE.Fog(0xe88a52, 120, 420);

  // --- sky dome, sun disc, halo, clouds --------------------------------------
  skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x2b1a5e) },
      midColor: { value: new THREE.Color(0xff7a3c) },
      lowColor: { value: new THREE.Color(0xffb36b) },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vP; uniform vec3 topColor; uniform vec3 midColor; uniform vec3 lowColor; void main(){ float h = normalize(vP).y; vec3 c = h > 0.12 ? mix(midColor, topColor, smoothstep(0.12, 0.65, h)) : mix(lowColor, midColor, smoothstep(-0.08, 0.12, h)); gl_FragColor = vec4(c, 1.0); }',
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(430, 20, 14), skyMat);
  group.add(sky);

  sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(55, 32),
    new THREE.MeshBasicMaterial({ color: 0xffa040, fog: false })
  );
  // Dead ahead over Palm Strand: the beach-road corridor is the one
  // sightline with no buildings in it, so the low sun clears the
  // downtown skyline and washes the road, as in the reference.
  sunDisc.position.set(-95, 62, -390);
  sunDisc.lookAt(0, 20, 0);
  group.add(sunDisc);
  sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, opacity: 1.0, depthWrite: false, fog: false }));
  sunHalo.position.copy(sunDisc.position);
  sunHalo.scale.set(460, 460, 1);
  group.add(sunHalo);

  const cloudTex = cloudTexture();
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(70 + rng() * 60, 26 + rng() * 14),
      new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, opacity: 0.5, depthWrite: false })
    );
    m.position.set(-220 + rng() * 440, 95 + rng() * 55, -320 + rng() * 260);
    m.userData.drift = 0.6 + rng() * 1.1;
    m.userData.baseOpacity = 0.5;
    group.add(m);
    clouds.push(m);
  }
  // Low pink clouds hugging the horizon around the sun, so the sky
  // above the road is layered instead of one flat gradient.
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(120 + rng() * 60, 18 + rng() * 10),
      new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, opacity: 0.65, depthWrite: false, color: 0xffb090 })
    );
    m.position.set(-160 + i * 70 + rng() * 20, 42 + rng() * 18, -330 + rng() * 30);
    m.userData.drift = 0.4;
    m.userData.baseOpacity = 0.65;
    group.add(m);
    clouds.push(m);
  }

  // --- ground: sand, sea, foam ----------------------------------------------
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 560),
    new THREE.MeshStandardMaterial({ map: sandTexture(), roughness: 1 })
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(40, -0.06, 0);
  sand.receiveShadow = true;
  group.add(sand);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 560),
    new THREE.MeshPhongMaterial({ color: 0x2a6a8a, shininess: 120, specular: 0xffb080 })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(SEA_EDGE_X - 110, 0.02, 0);
  group.add(sea);

  foamTex = canvasTex(64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 5);
  });
  foamTex.wrapS = THREE.RepeatWrapping;
  foamTex.wrapT = THREE.RepeatWrapping;
  foamTex.repeat.set(1, 40);
  const foam = new THREE.Mesh(
    new THREE.PlaneGeometry(3.5, 560),
    new THREE.MeshBasicMaterial({ map: foamTex, transparent: true, opacity: 0.65, depthWrite: false })
  );
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(SEA_EDGE_X + 1, 0.08, 0);
  group.add(foam);
  group.userData.foam = foam;

  // --- roads -----------------------------------------------------------------
  const asphalt = asphaltTexture();
  asphalt.wrapS = THREE.RepeatWrapping;
  asphalt.wrapT = THREE.RepeatWrapping;
  const asphaltPlain = asphaltTexture(true);
  asphaltPlain.wrapS = THREE.RepeatWrapping;
  asphaltPlain.wrapT = THREE.RepeatWrapping;
  const roadMat = new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.92 });
  function road(cx, cz, w, l, alongZ, y, plain) {
    const tex = (plain ? asphaltPlain : asphalt).clone();
    tex.needsUpdate = true;
    tex.repeat.set(alongZ ? 1 : l / 24, alongZ ? l / 24 : 1);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, l),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 })
    );
    m.rotation.x = -Math.PI / 2;
    if (!alongZ) m.rotation.z = Math.PI / 2;
    m.position.set(cx, y || 0.02, cz);
    m.receiveShadow = true;
    group.add(m);
  }
  // Each road tier sits at its own height, so overlapping road planes
  // never z-fight into stripes across the frame.
  road(-85, 0, 13, 260, true, 0.02); // Palm Strand, the beach road
  for (const x of [-60, -40, -20, 10, 40, 60]) road(x, 0, 10, 250, true, 0.03);
  for (const z of [-100, -60, -20, 20, 60]) road(20, z, 10, 200, false, 0.04, true);
  // Sidewalk strips along Palm Strand.
  const walkMat = new THREE.MeshStandardMaterial({ color: 0xb89a72, roughness: 1 });
  for (const sx of [-92.5, -77.5]) {
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 260), walkMat);
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(sx, 0.05, 0);
    group.add(walk);
  }

  // Crosswalks where the avenues meet Palm Strand: white bars across
  // the beach road, so the asphalt reads as a street, not a runway.
  const crossMat = new THREE.MeshBasicMaterial({ color: 0xf2f2ee, transparent: true, opacity: 0.8 });
  for (const cz of [-60, -20, 20, 60]) {
    for (let i = 0; i < 6; i++) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(11, 0.6), crossMat);
      bar.rotation.x = -Math.PI / 2;
      bar.position.set(-85, 0.035, cz - 3 + i * 1.2);
      group.add(bar);
    }
  }

  // Sun glare on Palm Strand: a long additive streak down the road
  // toward the camera, bright where the sun sits and fading south,
  // so the low sun washes the asphalt instead of floating above it.
  const glareTex = canvasTex(64, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255,200,120,0.55)');
    grad.addColorStop(0.5, 'rgba(255,160,80,0.22)');
    grad.addColorStop(1, 'rgba(255,140,60,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
  const glare = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 130),
    new THREE.MeshBasicMaterial({ map: glareTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  glare.rotation.x = -Math.PI / 2;
  glare.position.set(-85, 0.06, -55);
  group.add(glare);

  // --- buildings ---------------------------------------------------------------
  const facades = [
    facadeTexture('#7a5a8a', '#ffd27a', '#ff7ab0', mulberry32(seed + 11)),
    facadeTexture('#6a4a7a', '#ffcf6a', '#ff8ac0', mulberry32(seed + 23)),
    facadeTexture('#8a5a62', '#ffe09a', '#ff9a6a', mulberry32(seed + 37)),
    facadeTexture('#5a5a80', '#ffd27a', '#7ab0ff', mulberry32(seed + 51)),
    facadeTexture('#2a6a72', '#ffe9a0', '#7ad8ff', mulberry32(seed + 67)),
    facadeTexture('#a8846a', '#ffd27a', '#ff9a6a', mulberry32(seed + 83)),
  ];
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const parapetMat = new THREE.MeshStandardMaterial({ color: 0x2c2438, roughness: 0.9 });
  const acMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.5, roughness: 0.6 });
  const glassBandMat = new THREE.MeshStandardMaterial({ color: 0xffe9a0, emissive: 0xffc860, emissiveIntensity: 0.9, roughness: 0.2 });
  const awningTex = stripeTexture('#ff2e88', '#ffffff');
  const awningMat = new THREE.MeshStandardMaterial({ map: awningTex, roughness: 0.8 });

  // Keep-clear corridors: the downtown avenue at x=60 and the
  // market square (shot 3 stands in it on foot). No building may
  // intrude, or a shot's whole frame becomes one dark facade.
  const CLEAR_RECTS = [
    { x0: 50, x1: 70, z0: -130, z1: 42 },
    { x0: 6, x1: 46, z0: 32, z1: 82 },
  ];
  function nearSpecial(x, z, r) {
    const spots = [MARKET_POS, GARAGE_POS, AMMU_POS, TOWER_POS, WHEEL_POS, { x: -76, z: -90 }, SPAWN_POS];
    if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < r)) return true;
    return CLEAR_RECTS.some((rc) => x > rc.x0 - 9 && x < rc.x1 + 9 && z > rc.z0 - 9 && z < rc.z1 + 9);
  }

  for (const gx of [-60, -40, -20, 0, 20, 40, 60, 80, 100]) {
    for (const gz of [-110, -80, -50, -20, 10, 40, 70, 100]) {
      if (rng() < 0.14) continue;
      const x = gx + range(rng, -4, 4);
      const z = gz + range(rng, -4, 4);
      if (nearSpecial(x, z, 14)) continue;
      // The Parrot billboard at (-72, -28) must stand clear: a
      // building at (-60, -20) used to swallow its right end, so no
      // building footprint may touch the billboard's box.
      if (x + 10 > -84 && x - 10 < -60 && z + 10 > -36 && z - 10 < -20) continue;
      const w = range(rng, 12, 20);
      const d = range(rng, 12, 20);
      const tall = x > 0 ? range(rng, 18, 44) : range(rng, 9, 26);
      const f = pick(rng, facades);
      const mat = new THREE.MeshStandardMaterial({ map: f.map, emissiveMap: f.emissive, emissive: 0xffc860, emissiveIntensity: 0.55, roughness: 0.85 });
      const b = new THREE.Mesh(unitBox, mat);
      b.scale.set(w, tall, d);
      b.position.set(x, tall / 2, z);
      b.castShadow = true;
      b.receiveShadow = true;
      group.add(b);
      buildings.push(b);
      const cap = new THREE.Mesh(unitBox, parapetMat);
      cap.scale.set(w + 0.6, 0.8, d + 0.6);
      cap.position.set(x, tall + 0.4, z);
      cap.castShadow = true;
      group.add(cap);
      if (rng() < 0.5) {
        const ac = new THREE.Mesh(unitBox, acMat);
        ac.scale.set(2.2, 1.1, 1.8);
        ac.position.set(x + range(rng, -3, 3), tall + 1.3, z + range(rng, -3, 3));
        group.add(ac);
      }
      if (tall > 20 && rng() < 0.35) {
        // Rooftop water tower: tank on the roof with a cone cap — the
        // silhouette that breaks the flat parapet line.
        const tx = x + range(rng, -4, 4);
        const tz = z + range(rng, -4, 4);
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 2.6, 8), new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.9 }));
        tank.position.set(tx, tall + 1.5, tz);
        tank.castShadow = true;
        group.add(tank);
        const tcone = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.2, 8), parapetMat);
        tcone.position.set(tx, tall + 3.4, tz);
        group.add(tcone);
      }
      if (rng() < 0.35) {
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 5, 5), acMat);
        ant.position.set(x + range(rng, -4, 4), tall + 3, z + range(rng, -4, 4));
        group.add(ant);
      }
      // Ground-floor shopfronts: lit glass band plus a striped awning
      // facing the street, on any building that rolls one.
      if (rng() < 0.55) {
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, 2.6), glassBandMat);
        glass.position.set(x - w / 2 - 0.06, 1.6, z);
        glass.rotation.y = -Math.PI / 2;
        group.add(glass);
        const awn = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.85, 1.6), awningMat);
        awn.position.set(x - w / 2 - 0.9, 3.4, z);
        awn.rotation.y = -Math.PI / 2;
        awn.rotation.x = 0.35;
        group.add(awn);
      }
    }
  }

  // --- billboards and shop signs ---------------------------------------------
  function billboard(x, z, ry, w, h, tex, y) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.85, roughness: 0.6 })
    );
    m.position.set(x, y, z);
    m.rotation.y = ry;
    group.add(m);
    for (const px of [-w / 2 + 1, w / 2 - 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, y, 6), parapetMat);
      pole.position.set(x + Math.cos(ry) * px, y / 2, z - Math.sin(ry) * px);
      group.add(pole);
    }
    return m;
  }
  const parrotTex = signTexture(['PARROT', 'FM'], '#ff2e88', '#ffffff');
  // Bigger, closer to the road and high enough to clear the palm
  // crowns, so northbound drivers read the whole word face-on.
  billboard(-72, -28, -Math.PI / 6, 24, 9, parrotTex, 14);
  const leadTex = signTexture(['LEAD & IRON'], '#1a7a3a', '#d8ffd8');
  billboard(60, -20, Math.PI, 12, 4.5, leadTex, 7);
  const garageTex = signTexture(['RIO’S', 'GARAGE'], '#1c1030', '#ff5aa0');
  billboard(-56, 24, -Math.PI / 2, 10, 4, garageTex, 6.5);
  const hotelTex = signTexture(['HOTEL', 'MARINA'], '#241a4a', '#ffd27a');
  billboard(-76, -90, -Math.PI / 2, 11, 4.2, hotelTex, 8);
  // CLUB NOVA: the neon sign over the market square, facing the
  // southbound camera — the anchor of the night shootout shot.
  const novaTex = signTexture(['CLUB NOVA'], '#ff2e88', '#ffd7ec');
  billboard(25, 30, 0, 12, 4.5, novaTex, 8);

  // --- market stalls at (25, 45) ----------------------------------------------
  const stallCols = [0xff2e88, 0x2ec8ff, 0xffc21a, 0x4ad84a];
  for (let i = 0; i < 6; i++) {
    const sx = 14 + (i % 3) * 11;
    const sz = 38 + Math.floor(i / 3) * 12;
    const stall = new THREE.Group();
    const counter = new THREE.Mesh(unitBox, new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.9 }));
    counter.scale.set(4, 1, 2);
    counter.position.y = 0.5;
    counter.castShadow = true;
    stall.add(counter);
    const awnMat = new THREE.MeshStandardMaterial({ map: stripeTexture(i % 2 ? '#ff2e88' : '#2ec8ff', '#ffffff'), roughness: 0.8 });
    const awn = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.6), awnMat);
    awn.position.y = 2.6;
    awn.rotation.x = -Math.PI / 2 + 0.25;
    stall.add(awn);
    for (let k = 0; k < 4; k++) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 5), acMat);
      pole.position.set(k % 2 ? 2.1 : -2.1, 1.2, k < 2 ? 1 : -1);
      stall.add(pole);
    }
    for (let k = 0; k < 5; k++) {
      const goods = new THREE.Mesh(unitBox, new THREE.MeshStandardMaterial({ color: stallCols[(i + k) % 4], roughness: 0.6 }));
      goods.scale.set(0.6, 0.5, 0.6);
      goods.position.set(-1.6 + k * 0.8, 1.3, (rng() - 0.5) * 0.6);
      stall.add(goods);
    }
    stall.position.set(sx, 0, sz);
    group.add(stall);
  }

  // --- docks and boats ----------------------------------------------------------
  const dockMat = new THREE.MeshStandardMaterial({ color: 0x7a5a38, roughness: 1 });
  for (let i = 0; i < 8; i++) {
    const plank = new THREE.Mesh(unitBox, dockMat);
    plank.scale.set(2.2, 0.3, 14);
    plank.position.set(-112 + i * 2.4, 0.4, -122);
    group.add(plank);
  }
  for (let i = 0; i < 6; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 2.2, 6), dockMat);
    post.position.set(-114 + i * 4.4, 0.8, -114);
    group.add(post);
  }
  const boatCols = [0xe8e8e8, 0xff5a5a, 0x5aa8ff];
  for (let i = 0; i < 3; i++) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(unitBox, new THREE.MeshStandardMaterial({ color: boatCols[i], roughness: 0.5 }));
    hull.scale.set(2.4, 1, 6);
    hull.position.y = 0.5;
    boat.add(hull);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2, 4), new THREE.MeshStandardMaterial({ color: boatCols[i], roughness: 0.5 }));
    bow.rotation.x = Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.position.set(0, 0.5, 3.8);
    boat.add(bow);
    const cabin = new THREE.Mesh(unitBox, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
    cabin.scale.set(1.6, 0.9, 2);
    cabin.position.set(0, 1.4, -0.5);
    boat.add(cabin);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.4, 5), acMat);
    mast.position.set(0, 2.6, -0.5);
    boat.add(mast);
    boat.position.set(-128 - i * 5, 0, -108 + i * 9);
    boat.rotation.y = range(rng, -0.4, 0.4);
    group.add(boat);
  }

  // --- ferris wheel at (-106, 55) ------------------------------------------------
  const wheel = new THREE.Group();
  wheel.position.set(WHEEL_POS.x, 0, WHEEL_POS.z);
  wheel.rotation.y = Math.PI / 2;
  const legMat = new THREE.MeshStandardMaterial({ color: 0xff5aa0, metalness: 0.5, roughness: 0.4 });
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 15, 6), legMat);
    leg.position.set(s * 3.4, 7.5, 0);
    leg.rotation.z = s * 0.35;
    wheel.add(leg);
  }
  const spinner = new THREE.Group();
  spinner.position.y = 15;
  const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(11, 0.35, 8, 40), legMat);
  spinner.add(wheelRim);
  for (let i = 0; i < 8; i++) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 22, 5), legMat);
    spoke.rotation.z = (i * Math.PI) / 8;
    spinner.add(spoke);
  }
  const gondolaCols = [0xff2e88, 0xffc21a, 0x2ec8ff, 0x4ad84a, 0xff7a3c];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const gondola = new THREE.Mesh(unitBox, new THREE.MeshStandardMaterial({ color: gondolaCols[i % 5], roughness: 0.5 }));
    gondola.scale.set(1.8, 1.5, 1.5);
    gondola.position.set(Math.cos(a) * 11, Math.sin(a) * 11, 0);
    spinner.add(gondola);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 6), new THREE.MeshStandardMaterial({ color: 0xffe9a0, emissive: 0xffc860, emissiveIntensity: 1.6 }));
    bulb.position.set(Math.cos(a) * 11, Math.sin(a) * 11 + 1, 0);
    spinner.add(bulb);
  }
  wheel.add(spinner);
  wheelSpinner = spinner;
  group.add(wheel);

  // --- Marina Tower at (-70, -45) --------------------------------------------------
  const tower = new THREE.Group();
  tower.position.set(TOWER_POS.x, 0, TOWER_POS.z);
  const towerBody = new THREE.Mesh(
    new THREE.CylinderGeometry(4.5, 7, 42, 10),
    new THREE.MeshStandardMaterial({ color: 0x8a7a9a, metalness: 0.4, roughness: 0.6 })
  );
  towerBody.position.y = 21;
  tower.add(towerBody);
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 5.5, 3, 10), new THREE.MeshStandardMaterial({ color: 0x3a3048, roughness: 0.7 }));
  deck.position.y = 42;
  tower.add(deck);
  const glassRing = new THREE.Mesh(
    new THREE.CylinderGeometry(6.2, 6.2, 1.6, 10, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xffe9a0, emissive: 0xffc860, emissiveIntensity: 1.4, side: THREE.DoubleSide })
  );
  glassRing.position.y = 42;
  tower.add(glassRing);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, 12, 5), acMat);
  antenna.position.y = 49;
  tower.add(antenna);
  const beaconMat = new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff0000, emissiveIntensity: 2 });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), beaconMat);
  beacon.position.y = 55.5;
  tower.add(beacon);
  beacons.push({ mat: beaconMat, phase: rng() * 6 });
  group.add(tower);

  // --- palms along Palm Strand ------------------------------------------------------
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.34, 6.5, 7);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a5a30, roughness: 1 });
  const trunkRingGeo = new THREE.TorusGeometry(0.3, 0.045, 5, 10);
  const frondGeo = new THREE.ConeGeometry(0.5, 3.0, 6);
  const frondMatA = new THREE.MeshStandardMaterial({ color: 0x46b45a, roughness: 0.8, side: THREE.DoubleSide });
  const frondMatB = new THREE.MeshStandardMaterial({ color: 0x2f8a42, roughness: 0.8, side: THREE.DoubleSide });
  const nutGeo = new THREE.SphereGeometry(0.18, 6, 6);
  const nutMat = new THREE.MeshStandardMaterial({ color: 0x6a4a26, roughness: 0.9 });
  function palm(x, z, lean) {
    const p = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 3.25;
    trunk.rotation.z = lean;
    trunk.castShadow = true;
    p.add(trunk);
    // Bark rings, parented to the trunk so they follow its lean.
    for (let r = 0; r < 4; r++) {
      const wy = 1.4 + r * 1.5;
      const rad = 0.34 - (0.14 * wy) / 6.5;
      const ring = new THREE.Mesh(trunkRingGeo, trunkMat);
      ring.position.y = wy - 3.25;
      ring.rotation.x = Math.PI / 2;
      ring.scale.set(rad / 0.3, rad / 0.3, 1);
      trunk.add(ring);
    }
    const top = new THREE.Group();
    top.position.set(-Math.sin(lean) * 3.25, 6.5, 0);
    // Two rings of fronds — five high, four low and offset, each
    // drooping further — so the canopy reads layered, not one flat
    // star. The old palm was a single 9 m green triangle.
    const rings = [
      { n: 5, y: 0, tilt: 1.9, off: 0 },
      { n: 4, y: -0.45, tilt: 2.35, off: 0.6 },
    ];
    for (const ring of rings) {
      for (let i = 0; i < ring.n; i++) {
        const a = ring.off + (i / ring.n) * Math.PI * 2;
        const frond = new THREE.Mesh(frondGeo, i % 2 ? frondMatA : frondMatB);
        frond.position.set(Math.cos(a) * 1.15, ring.y - 0.2, Math.sin(a) * 1.15);
        frond.rotation.z = Math.cos(a) * ring.tilt;
        frond.rotation.x = -Math.sin(a) * ring.tilt;
        frond.scale.set(1, 1, 0.3);
        frond.castShadow = true;
        top.add(frond);
      }
    }
    for (const sx of [-0.4, 0.4]) {
      const nut = new THREE.Mesh(nutGeo, nutMat);
      nut.position.set(sx, -0.6, 0.25);
      top.add(nut);
    }
    p.add(top);
    p.position.set(x, 0, z);
    group.add(p);
    palms.push(p);
    return p;
  }
  for (let z = -120; z <= 120; z += 14) {
    palm(-92.5, z + range(rng, -3, 3), range(rng, -0.08, 0.08));
    if (rng() < 0.85) palm(-77.5, z + 8 + range(rng, -3, 3), range(rng, -0.08, 0.08));
  }

  // --- beach dressing: umbrellas, chairs, lifeguard tower ------------------------------
  const umbCols = [0xff2e88, 0xffc21a, 0x2ec8ff];
  for (let i = 0; i < 12; i++) {
    const ux = -100 - rng() * 12;
    const uz = -110 + i * 20 + range(rng, -4, 4);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 5), acMat);
    pole.position.set(ux, 1.3, uz);
    group.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.2, 0.9, 8), new THREE.MeshStandardMaterial({ color: umbCols[i % 3], roughness: 0.8 }));
    top.position.set(ux, 2.9, uz);
    group.add(top);
    const chair = new THREE.Mesh(unitBox, new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.9 }));
    chair.scale.set(0.8, 0.5, 1.8);
    chair.position.set(ux + 2, 0.25, uz + 1);
    group.add(chair);
  }
  const lg = new THREE.Group();
  const lgTower = new THREE.Mesh(unitBox, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }));
  lgTower.scale.set(2.2, 5, 2.2);
  lgTower.position.y = 2.5;
  lg.add(lgTower);
  const lgRoof = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.2, 4), new THREE.MeshStandardMaterial({ color: 0xff2e88, roughness: 0.7 }));
  lgRoof.position.y = 5.6;
  lgRoof.rotation.y = Math.PI / 4;
  lg.add(lgRoof);
  lg.position.set(-100, 0, 20);
  group.add(lg);

  // --- lamps, traffic lights, hydrants, benches -----------------------------------------
  const lampGlowMat = new THREE.MeshStandardMaterial({ color: 0xffe9a0, emissive: 0xffc860, emissiveIntensity: 0.7 });
  const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.7 });
  for (let z = -110; z <= 110; z += 22) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.4, 5), lampPoleMat);
    pole.position.set(-77.5, 2.7, z);
    group.add(pole);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), lampGlowMat);
    globe.position.set(-77.5, 5.6, z);
    group.add(globe);
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 4.5, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false })
    );
    cone.position.set(-77.5, 3.4, z);
    group.add(cone);
  }
  function trafficLight(x, z) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 5.6, 5), lampPoleMat);
    pole.position.y = 2.8;
    g.add(pole);
    const head = new THREE.Mesh(unitBox, lampPoleMat);
    head.scale.set(0.7, 1.7, 0.5);
    head.position.set(0, 5.4, 0);
    g.add(head);
    const cols = [0xff2020, 0xffc21a, 0x2ad84a];
    const lit = Math.floor(rng() * 3);
    for (let i = 0; i < 3; i++) {
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshStandardMaterial({ color: cols[i], emissive: cols[i], emissiveIntensity: i === lit ? 2 : 0.15 })
      );
      lamp.position.set(0, 5.9 - i * 0.55, 0.28);
      g.add(lamp);
    }
    g.position.set(x, 0, z);
    group.add(g);
  }
  trafficLight(-78, -58);
  trafficLight(-78, -18);
  trafficLight(-78, 22);
  trafficLight(-78, 62);
  const hydMat = new THREE.MeshStandardMaterial({ color: 0xd02020, roughness: 0.5 });
  for (const [hx, hz] of [[-78, -40], [-78, 40], [12, -18], [42, 22]]) {
    const hyd = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.9, 8), hydMat);
    hyd.position.set(hx, 0.45, hz);
    group.add(hyd);
  }
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.9 });
  for (let i = 0; i < 6; i++) {
    const bench = new THREE.Mesh(unitBox, benchMat);
    bench.scale.set(2, 0.5, 0.7);
    bench.position.set(-92, 0.5, -90 + i * 38);
    group.add(bench);
  }

  // --- kerbside parked cars: fourteen still traffic cars that make
  // the avenues feel inhabited instead of empty. They sit on the
  // kerbs, well away from the lanes you drive, away from the Palm
  // Strand chase stretch (z 25..55) and away from the market
  // square. Pure scenery: they can never be stolen, the E prompt
  // only ever opens the Comet.
  const parked = [];
  const parkedSpots = [
    // East kerb of Palm Strand, noses pointing north.
    [-79.8, -115, 0], [-79.8, -95, 0], [-79.8, -75, 0],
    [-79.8, 75, 0], [-79.8, 95, 0], [-79.8, 115, 0],
    // West kerb of Palm Strand, noses pointing south.
    [-90.0, -105, Math.PI], [-90.0, -85, Math.PI],
    [-90.0, 85, Math.PI], [-90.0, 105, Math.PI],
    // Downtown side streets.
    [28, -22, Math.PI / 2], [-8, -22, -Math.PI / 2],
    [28, -62, Math.PI / 2], [-28, 62, -Math.PI / 2],
  ];
  const parkedPaints = [0x3a6fd8, 0xd8a03a, 0x4a9a5a, 0xc0c4cc, 0x8a4ad8, 0xd84a4a, 0x3a8a8a, 0xe0e0e0, 0xff2e88, 0x2ec8ff];
  parkedSpots.forEach(([px, pz, ph], i) => {
    const car = new Car('traffic', parkedPaints[i % parkedPaints.length], px, pz, ph);
    group.add(car.mesh);
    parked.push(car);
  });

  // --- pedestrians: thirty people now, taller or shorter at random,
  // pairs chatting on the pavement, a few strolling the beach.
  const pedCols = [0xff8a5a, 0x5aa8ff, 0xffd27a, 0x8a5ad8, 0x4ad84a, 0xe8e8e8];
  for (let i = 0; i < 30; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.7, 3, 8), new THREE.MeshStandardMaterial({ color: pedCols[i % pedCols.length], roughness: 0.8 }));
    body.position.y = 0.95;
    body.castShadow = true;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.7 }));
    head.position.y = 1.7;
    g.add(head);
    let anchor;
    let speed = 0.4 + rng() * 0.7;
    let amp = 8;
    if (i < 6) {
      // Two per pavement spot, chatting: they barely drift, and every
      // spot is far north of the title camera at z 28, so nobody
      // wanders into the menu foreground.
      const spot = [-92.5, -77.5][i % 2];
      const sz = -100 + Math.floor(i / 2) * 45;
      anchor = { x: spot + (i % 2 ? 1.2 : -1.2), z: sz };
      speed = 0.08;
      amp = 1.5;
    } else if (i < 10) {
      // Strollers down by the umbrellas and the sand.
      anchor = { x: -100 - rng() * 10, z: -100 + rng() * 200 };
    } else {
      anchor = { x: -92 + rng() * 150, z: -110 + rng() * 220 };
      if (rng() < 0.4) { anchor.x = -92.5; anchor.z = -110 + rng() * 220; }
    }
    // Height varies a little from person to person.
    const height = 0.9 + rng() * 0.25;
    g.scale.setScalar(height);
    g.position.set(anchor.x, 0, anchor.z);
    group.add(g);
    peds.push({ mesh: g, anchor, phase: rng() * 6.28, speed, amp, dir: rng() * 6.28 });
  }

  // --- palette + location names ---------------------------------------------------------------
  function setPalette(name) {
    const p = PALETTES[name] || PALETTES.sunset;
    skyMat.uniforms.topColor.value.setHex(p.top);
    skyMat.uniforms.midColor.value.setHex(p.mid);
    skyMat.uniforms.lowColor.value.setHex(p.low);
    scene.fog.color.setHex(p.fog);
    sunLight.color.setHex(p.sunColor);
    sunLight.intensity = p.sunIntensity;
    hemi.color.setHex(p.hemiSky);
    hemi.groundColor.setHex(p.hemiGround);
    rim.color.setHex(p.rimColor);
    // Night has no sun: hide the disc and halo, and dim the clouds
    // to faint shapes instead of pale blobs in a dark sky.
    const isNight = name === 'night';
    sunDisc.visible = !isNight;
    sunHalo.visible = !isNight;
    for (const c of clouds) c.material.opacity = isNight ? 0.15 : (c.userData.baseOpacity || 0.5);
    const y = p.sunY * 1.35;
    sunDisc.position.set(-95, y, -390);
    sunHalo.position.copy(sunDisc.position);
    return p;
  }

  // setSun(x, y, z): move the sun disc and halo, per shot, so the low
  // sun sits dead ahead down the shot's own street instead of one
  // fixed spot that a skyline can swallow.
  function setSun(x, y, z) {
    sunDisc.position.set(x, y, z === undefined ? -390 : z);
    sunHalo.position.copy(sunDisc.position);
  }

  function locationNameAt(x, z) {
    if (x < -100) return 'THE DOCKS';
    if (Math.hypot(x - MARKET_POS.x, z - MARKET_POS.z) < 24) return 'MARKET ROW';
    if (Math.hypot(x - TOWER_POS.x, z - TOWER_POS.z) < 14) return 'MARINA TOWER';
    if (Math.hypot(x - WHEEL_POS.x, z - WHEEL_POS.z) < 14) return 'THE PIER';
    if (Math.hypot(x - GARAGE_POS.x, z - GARAGE_POS.z) < 10) return 'RIO’S GARAGE';
    if (Math.abs(x + 85) < 9) return 'PALM STRAND';
    if (x > 0) return 'DOWNTOWN';
    return 'SOLMAR CITY';
  }

  // update(dt, elapsed, playerPos): spin the wheel, blink the beacons,
  // scroll the foam, drift the clouds, wander the pedestrians, and
  // re-centre the sun's shadow frustum on the player every frame so
  // the hero car and the cruisers always cast where the camera looks.
  function update(dt, elapsed, playerPos) {
    if (wheelSpinner) wheelSpinner.rotation.z += dt * 0.12;
    for (const b of beacons) {
      b.mat.emissiveIntensity = (Math.sin(elapsed * 2.4 + b.phase) > 0) ? 2.2 : 0.15;
    }
    if (foamTex) foamTex.offset.y = (elapsed * 0.03) % 1;
    for (const c of clouds) {
      c.position.x += c.userData.drift * dt;
      if (c.position.x > 260) c.position.x = -260;
    }
    for (const p of peds) {
      p.dir += Math.sin(elapsed * 0.3 + p.phase) * dt * 0.4;
      // Each ped wanders inside its own radius: chat pairs barely
      // move (amp 1.5), everyone else roams the usual 8 metres.
      const wander = p.amp || 8;
      p.mesh.position.x = p.anchor.x + Math.sin(elapsed * p.speed * 0.2 + p.phase) * wander;
      p.mesh.position.z = p.anchor.z + Math.cos(elapsed * p.speed * 0.16 + p.phase) * wander;
      p.mesh.rotation.y = Math.PI - (p.dir + elapsed * 0.1);
      p.mesh.position.y = Math.abs(Math.sin(elapsed * 3 + p.phase)) * 0.05;
    }
    if (playerPos) {
      const sx = 55;
      const sy = 48;
      const sz = -160;
      sunLight.position.set(playerPos.x + sx, playerPos.y + sy, playerPos.z + sz);
      sunLight.target.position.set(playerPos.x, 0, playerPos.z);
      sunLight.target.updateMatrixWorld();
    }
  }

  setPalette('sunset');
  // Hand back everything main.js needs, parked cars included.
  return {
    group, update, setPalette, setSun, locationNameAt, sunLight,
    garagePos: GARAGE_POS, ammuPos: AMMU_POS, marketPos: MARKET_POS,
    spawnPos: SPAWN_POS, peds, palms, buildings, parked,
  };
}
