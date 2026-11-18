// Shops: Ammu-Nation sells guns and ammo, Rio's Garage sells repairs, NOS
// refills and armour. Tall signs on poles mark both from across the city.
// The cash line lives in its OWN paragraph — never nested inside the
// subtitle, which the open-shop code rewrites.
import * as THREE from 'three';
import { WEAPONS } from './combat.js';

export const SHOPS = [
  {
    id: 'ammu',
    name: 'Ammu-Nation',
    x: 47,
    z: 118,
    signColor: '#e8a13d',
    items: [
      { name: 'SMG', desc: 'Automatic fire, holds the street', price: 600, apply: (G) => { G.player.weapons.smg.owned = true; G.player.weapons.smg.ammo += 120; } },
      { name: 'Shotgun', desc: 'Five pellets, one loud argument', price: 900, apply: (G) => { G.player.weapons.shotgun.owned = true; G.player.weapons.shotgun.ammo += 24; } },
      { name: 'Ammo pack', desc: '+60 rounds for your current weapon', price: 100, apply: (G) => { G.player.weapons[G.player.weapon].ammo += 60; } },
    ],
  },
  {
    id: 'garage',
    name: "Rio's Garage",
    x: -47,
    z: 63,
    signColor: '#3de8ff',
    items: [
      { name: 'Repair', desc: 'Full bodywork, good as new', price: 200, needsCar: true, apply: (G) => { G.player.car.health = 100; } },
      { name: 'NOS refill', desc: 'Blue flame, full tank', price: 250, needsCar: true, apply: (G) => { G.player.car.nos = 100; } },
      { name: 'Armour plating', desc: 'Crash damage cut by more than half', price: 500, needsCar: true, apply: (G) => { G.player.car.armoured = true; } },
    ],
  },
];

function signTexture(name, color) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#101018';
  g.fillRect(0, 0, 256, 96);
  g.strokeStyle = color;
  g.lineWidth = 4;
  g.strokeRect(5, 5, 246, 86);
  g.fillStyle = color;
  g.font = 'bold 30px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const words = name.split(' ');
  if (words.length > 1) {
    g.fillText(words[0], 128, 28);
    g.fillText(words.slice(1).join(' '), 128, 62);
  } else {
    g.fillText(name, 128, 50);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildShops(G) {
  for (const shop of SHOPS) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.24, 7.5, 8),
      new THREE.MeshLambertMaterial({ color: 0x2a2a30 })
    );
    pole.position.set(shop.x, 3.75, shop.z - 4);
    G.scene.add(pole);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(7.5, 2.8),
      new THREE.MeshBasicMaterial({ map: signTexture(shop.name, shop.signColor), side: THREE.DoubleSide })
    );
    sign.position.set(shop.x, 8.2, shop.z - 4);
    G.scene.add(sign);
    const hut = new THREE.Mesh(
      new THREE.BoxGeometry(6, 3.4, 5),
      new THREE.MeshLambertMaterial({ color: 0x6a5a4a })
    );
    hut.position.set(shop.x, 1.7, shop.z);
    G.scene.add(hut);
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 2.6, 0.2),
      new THREE.MeshLambertMaterial({ color: 0x1c2430 })
    );
    door.position.set(shop.x, 1.3, shop.z - 2.55);
    G.scene.add(door);
  }
}

export function nearestShop(G) {
  let best = null;
  let bestD = 8;
  for (const shop of SHOPS) {
    const d = Math.hypot(shop.x - G.player.x, shop.z - G.player.z);
    if (d < bestD) {
      bestD = d;
      best = shop;
    }
  }
  return best;
}

export function openShop(G, shop) {
  G.shopOpen = shop;
  const overlay = document.getElementById('shop-overlay');
  document.getElementById('shop-title').textContent = shop.name;
  document.getElementById('shop-subtitle').textContent = shop.id === 'ammu'
    ? 'Guns, ammo, no questions asked.'
    : 'Repairs, NOS and armour — bring the car.';
  const list = document.getElementById('shop-items');
  list.innerHTML = '';
  shop.items.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'shop-item';
    const owned = shop.id === 'ammu' && item.name === 'SMG' && G.player.weapons.smg.owned;
    const owned2 = shop.id === 'ammu' && item.name === 'Shotgun' && G.player.weapons.shotgun.owned;
    const bought = owned || owned2;
    row.innerHTML = `<b>${item.name}</b><span>${item.desc}</span><em>${bought ? 'OWNED' : '$' + item.price}</em>`;
    const btn = document.createElement('button');
    btn.textContent = bought ? 'Owned' : 'Buy';
    btn.disabled = bought;
    btn.onclick = () => buyItem(G, i);
    row.appendChild(btn);
    list.appendChild(row);
  });
  updateShopCash(G);
  overlay.style.display = 'block';
}

export function updateShopCash(G) {
  const el = document.getElementById('shop-cash');
  if (el) el.textContent = `Cash: $${G.player.cash.toLocaleString()}`;
}

export function closeShop(G) {
  G.shopOpen = null;
  document.getElementById('shop-overlay').style.display = 'none';
}

export function buyItem(G, index) {
  const shop = G.shopOpen;
  if (!shop) return;
  const item = shop.items[index];
  if (item.needsCar && !G.player.inCar) {
    G.hud.showToast(G, 'That service needs your car — drive in first.');
    return;
  }
  if (G.player.cash < item.price) {
    G.hud.showToast(G, `Not enough cash — ${item.name} costs $${item.price}.`);
    return;
  }
  G.player.cash -= item.price;
  item.apply(G);
  G.audio?.cash?.();
  G.hud.showToast(G, `Bought ${item.name} for $${item.price}.`);
  openShop(G, shop);
}
