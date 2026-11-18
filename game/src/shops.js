// shops.js — the two Solmar shops: Lead & Iron and Rio's Garage.
// Shops is pure purchase logic; the DOM overlay lives in main.js and
// the HUD. Every buy returns { ok, msg } so the caller can toast it.

// Catalogue: id, label, price, what it does, and which shop sells it.
const CATALOG = [
  { id: 'smg', shop: 'ammunition', label: 'Viper SMG', price: 600, kind: 'weapon', weapon: 'smg' },
  { id: 'shotgun', shop: 'ammunition', label: 'Breaker Shotgun', price: 900, kind: 'weapon', weapon: 'shotgun' },
  { id: 'pistol-ammo', shop: 'ammunition', label: 'Pistol ammo ×24', price: 120, kind: 'ammo', weapon: 'pistol', amount: 24 },
  { id: 'smg-ammo', shop: 'ammunition', label: 'SMG ammo ×48', price: 200, kind: 'ammo', weapon: 'smg', amount: 48 },
  { id: 'repair', shop: 'garage', label: 'Full repair', price: 200, kind: 'repair' },
  { id: 'nos', shop: 'garage', label: 'NOS kit', price: 250, kind: 'nos' },
  { id: 'armour', shop: 'garage', label: 'Armour plating', price: 500, kind: 'armour' },
];

// Shops: open/close state plus the nearest-shop check and buying.
export class Shops {
  constructor() {
    this.openId = null;
    this.catalog = CATALOG;
  }

  // open(id): open the 'garage' or 'ammunition' shop overlay.
  open(id) {
    this.openId = id;
    return this.items(id);
  }

  // close(): shut whichever shop is open.
  close() {
    this.openId = null;
  }

  // items(id): the catalogue rows for one shop.
  items(id) {
    return CATALOG.filter((c) => c.shop === id);
  }

  // nearest(player): 'garage' or 'ammunition' when the player stands
  // within 9 m of that shop's door, else null. Positions are given by
  // the caller through player.nearShop, set by main.js each frame.
  nearest(player) {
    if (!player) return null;
    return player.nearShop || null;
  }

  // buy(itemId, ctx): run one purchase against the live game context.
  // ctx carries { cash, combat, car, toast }. Garage services need a
  // car in the context; weapon buys need the combat system. The cash
  // is only taken when the purchase actually succeeds.
  buy(itemId, ctx) {
    const item = CATALOG.find((c) => c.id === itemId);
    if (!item) return { ok: false, msg: 'No such item.' };
    if (!ctx || typeof ctx.cash !== 'number') return { ok: false, msg: 'Shop is closed.' };
    if (ctx.cash < item.price) {
      return { ok: false, msg: 'Not enough cash — ' + item.label + ' costs $' + item.price + '.' };
    }
    if (item.kind === 'repair' || item.kind === 'nos' || item.kind === 'armour') {
      const car = ctx.car;
      if (!car) return { ok: false, msg: 'Bring a car to Rio first.' };
      if (item.kind === 'repair') {
        if (car.condition >= 100) return { ok: false, msg: 'Already in perfect shape.' };
        car.condition = 100;
      } else if (item.kind === 'nos') {
        if (car.nosOwned) return { ok: false, msg: 'NOS is already fitted.' };
        car.nosOwned = true;
        car.nos = 100;
      } else {
        if (car.armoured) return { ok: false, msg: 'Armour is already fitted.' };
        car.armoured = true;
        car.condition = Math.min(100, car.condition + 25);
      }
    } else if (item.kind === 'weapon') {
      const bought = ctx.combat ? ctx.combat.buy(item.weapon) : null;
      if (!bought || !bought.ok) return bought || { ok: false, msg: 'Could not buy that weapon.' };
    } else if (item.kind === 'ammo') {
      const bought = ctx.combat ? ctx.combat.buyAmmo(item.weapon, item.amount) : null;
      if (!bought || !bought.ok) return bought || { ok: false, msg: 'Could not buy that ammo.' };
    }
    ctx.cash -= item.price;
    return { ok: true, msg: item.label + ' — $' + item.price + '. Enjoy, kid.' };
  }
}
