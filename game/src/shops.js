// shops.js — the two places Rio spends his cash: Ammu-Nation by the market,
// which sells guns and ammo, and Rio's Garage, which repairs cars, refills
// NOS and bolts on armour. Walk up to a shop marker and press E.
import * as THREE from "three";
import { WEAPONS } from "./combat.js";

export const SHOP_DEFS = [
  {
    id: "gunshop",
    title: "AMMU-NATION — SOLMAR",
    subtitle: "Guns, ammo, no questions asked.",
    x: 47, z: 118,
    color: 0xff5a5a,
    items: [
      { id: "smg", label: "SMG — fast full-auto fire", price: 600 },
      { id: "shotgun", label: "Shotgun — five pellets up close", price: 900 },
      { id: "ammo-pistol", label: "Pistol ammo — 48 rounds", price: 100 },
      { id: "ammo-smg", label: "SMG ammo — 120 rounds", price: 150 },
      { id: "ammo-shotgun", label: "Shotgun shells — 24 rounds", price: 150 },
    ],
  },
  {
    id: "garage",
    title: "RIO'S GARAGE",
    subtitle: "Repairs, NOS and armour for the getaway car.",
    x: -47, z: 63,
    color: 0x37d67a,
    items: [
      { id: "repair", label: "Full repair — car back to 100 health", price: 200 },
      { id: "nos", label: "NOS refill — a full boost tank", price: 250 },
      { id: "armor", label: "Armour plating — crash damage halved", price: 500 },
    ],
  },
];

// Floating shop signs over the two markers, so the shops read from the street.
export function createShopSystem(scene) {
  const shops = [];
  for (const def of SHOP_DEFS) {
    const group = new THREE.Group();
    group.position.set(def.x, 0, def.z);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 7.5, 6),
      new THREE.MeshLambertMaterial({ color: 0x2c2f36 })
    );
    pole.position.y = 3.75;
    group.add(pole);
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(6, 1.8, 0.4),
      new THREE.MeshBasicMaterial({ color: def.color })
    );
    sign.position.y = 8.2;
    group.add(sign);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3.0, 3.8, 32),
      new THREE.MeshBasicMaterial({ color: def.color, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.15;
    group.add(ring);
    scene.add(group);
    shops.push({ ...def, mesh: group });
  }
  return { shops, open: null };
}

// The shop Rio is standing close enough to use, or null.
export function nearestShop(ctx, maxDistance) {
  const pos = ctx.player.inCar ? ctx.player.inCar.mesh.position : ctx.player.mesh.position;
  let best = null;
  let bestDistance = maxDistance;
  for (const shop of ctx.shops.shops) {
    const distance = Math.hypot(pos.x - shop.x, pos.z - shop.z);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = shop;
    }
  }
  return best;
}

export function openShop(ctx, shop) {
  ctx.shops.open = shop;
  ctx.state = "shop";
  document.getElementById("shop-title").textContent = shop.title;
  document.getElementById("shop-subtitle").textContent = shop.subtitle;
  document.getElementById("shop-cash").textContent = "$" + ctx.player.cash.toLocaleString("en-US");
  const list = document.getElementById("shop-items");
  list.innerHTML = "";
  for (const item of shop.items) {
    const row = document.createElement("div");
    row.className = "shop-item";
    const label = document.createElement("span");
    label.textContent = item.label;
    const button = document.createElement("button");
    button.textContent = "BUY $" + item.price;
    button.addEventListener("click", () => buyShopItem(ctx, shop, item));
    row.appendChild(label);
    row.appendChild(button);
    list.appendChild(row);
  }
  document.getElementById("shop-overlay").style.display = "flex";
  ctx.audio.playPickup();
}

export function closeShop(ctx) {
  ctx.shops.open = null;
  document.getElementById("shop-overlay").style.display = "none";
  if (ctx.state === "shop") ctx.state = "playing";
}

export function buyShopItem(ctx, shop, item) {
  const player = ctx.player;
  if (player.cash < item.price) {
    ctx.hud.showToast("Not enough cash — $" + item.price + " needed");
    return;
  }
  if (item.id === "smg" || item.id === "shotgun") {
    if (player.weapons[item.id]) {
      ctx.hud.showToast("You already own the " + WEAPONS[item.id].name);
      return;
    }
    player.weapons[item.id] = true;
    player.ammoByWeapon[item.id] = item.id === "smg" ? 120 : 24;
    player.weapon = item.id;
    player.cash -= item.price;
    ctx.hud.showToast(WEAPONS[item.id].name + " bought! Press " + (item.id === "smg" ? "2" : "3") + " to use it");
    ctx.audio.playCash();
  } else if (item.id === "ammo-pistol") {
    player.ammoByWeapon.pistol += 48;
    player.cash -= item.price;
    ctx.hud.showToast("Pistol ammo +48");
    ctx.audio.playCash();
  } else if (item.id === "ammo-smg") {
    if (!player.weapons.smg) {
      ctx.hud.showToast("Buy the SMG first");
      return;
    }
    player.ammoByWeapon.smg += 120;
    player.cash -= item.price;
    ctx.hud.showToast("SMG ammo +120");
    ctx.audio.playCash();
  } else if (item.id === "ammo-shotgun") {
    if (!player.weapons.shotgun) {
      ctx.hud.showToast("Buy the shotgun first");
      return;
    }
    player.ammoByWeapon.shotgun += 24;
    player.cash -= item.price;
    ctx.hud.showToast("Shotgun shells +24");
    ctx.audio.playCash();
  } else if (item.id === "repair") {
    if (!player.inCar) {
      ctx.hud.showToast("Drive a car in to repair it");
      return;
    }
    player.inCar.health = 100;
    player.cash -= item.price;
    ctx.hud.showToast("Car repaired — good as new");
    ctx.audio.playCash();
  } else if (item.id === "nos") {
    if (!player.inCar) {
      ctx.hud.showToast("Drive a car in to fill its NOS tank");
      return;
    }
    player.inCar.nos = 100;
    player.cash -= item.price;
    ctx.hud.showToast("NOS tank full — hold N to boost");
    ctx.audio.playCash();
  } else if (item.id === "armor") {
    if (!player.inCar) {
      ctx.hud.showToast("Drive a car in to armour it");
      return;
    }
    player.inCar.armor = 2;
    player.cash -= item.price;
    ctx.hud.showToast("Armour plating fitted — crash damage halved");
    ctx.audio.playCash();
  }
  player.ammo = player.ammoByWeapon[player.weapon] || 0;
  document.getElementById("shop-cash").textContent = "$" + player.cash.toLocaleString("en-US");
}
