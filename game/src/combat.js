// combat.js — weapons, tracers and rivals for SOLMAR.
// Four weapon slots: fists (always owned), pistol (owned), SMG and
// shotgun (locked until bought at Lead & Iron). Firing draws a tracer
// and a muzzle flash; rivals walk up and swing, and the HUD is told
// about damage through the onDamage callback.
import * as THREE from 'three';

// Combat: owns the weapon rack, the tracers in flight, and the rivals.
export class Combat {
  constructor(scene) {
    this.scene = scene;
    this.weapons = [
      { id: 'fists', name: 'Fists', slot: 0, owned: true, price: 0, mag: Infinity, reserve: Infinity, magSize: Infinity, icon: '✊' },
      { id: 'pistol', name: 'Pistol', slot: 1, owned: true, price: 0, mag: 12, reserve: 60, magSize: 12, icon: '🔫' },
      { id: 'smg', name: 'Viper SMG', slot: 2, owned: false, price: 600, mag: 32, reserve: 120, magSize: 32, icon: '🔫' },
      { id: 'shotgun', name: 'Breaker Shotgun', slot: 3, owned: false, price: 900, mag: 6, reserve: 24, magSize: 6, icon: '💥' },
    ];
    this.slot = 1;
    this.current = this.weapons[1];
    this.rivals = [];
    this.tracers = [];
    this.flash = null;
    this.flashTimer = 0;
    this.holdFlash = false;
    this.heldTracer = null;
    this.buildFlash();
  }

  // buildFlash: one additive sprite reused for every muzzle flash.
  buildFlash() {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255,255,200,1)');
    grad.addColorStop(0.4, 'rgba(255,180,60,0.9)');
    grad.addColorStop(1, 'rgba(255,120,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    this.flash = new THREE.Sprite(mat);
    this.flash.scale.set(1.4, 1.4, 1);
    this.flash.visible = false;
    this.scene.add(this.flash);
  }

  // slots(): the four weapon slots for the HUD, in slot order.
  slots() {
    return this.weapons.map((w) => ({
      slot: w.slot + 1,
      id: w.id,
      name: w.name,
      owned: w.owned,
      price: w.price,
      mag: w.mag,
      reserve: w.reserve,
      icon: w.icon,
      active: this.current.id === w.id,
    }));
  }

  // select(slot, toast): switch to a weapon slot. A locked weapon
  // toasts where to buy it; an owned one switches and reports ammo.
  select(slot, toast) {
    const w = this.weapons.find((x) => x.slot === slot);
    if (!w) return;
    if (!w.owned) {
      if (toast) toast('🔒 ' + w.name + ' is locked — buy it at Lead & Iron ($' + w.price + ')');
      return;
    }
    this.slot = slot;
    this.current = w;
    if (toast) {
      const ammo = w.mag === Infinity ? '∞' : w.mag + '/' + w.reserve;
      toast(w.name + ' ready — ' + ammo);
    }
  }

  // buy(weaponId): buy a locked weapon. Returns { ok, msg }.
  buy(weaponId) {
    const w = this.weapons.find((x) => x.id === weaponId);
    if (!w) return { ok: false, msg: 'No such weapon.' };
    if (w.owned) return { ok: false, msg: w.name + ' is already yours.' };
    w.owned = true;
    w.mag = w.magSize;
    return { ok: true, msg: w.name + ' bought.' };
  }

  // buyAmmo(weaponId, amount): top up a weapon's reserve. Fists take
  // no ammo. Returns { ok, msg }.
  buyAmmo(weaponId, amount) {
    const w = this.weapons.find((x) => x.id === weaponId);
    if (!w) return { ok: false, msg: 'No such weapon.' };
    if (!w.owned) return { ok: false, msg: 'Buy the ' + w.name + ' first.' };
    if (w.mag === Infinity) return { ok: false, msg: 'Fists need no ammo.' };
    w.reserve += amount;
    return { ok: true, msg: '+' + amount + ' ' + w.name + ' ammo.' };
  }

  // fire(from, dir, toast): shoot the current weapon from `from`
  // along `dir`. Draws a tracer and a muzzle flash, spends one round,
  // and reloads from reserve when the magazine runs dry.
  fire(from, dir, toast) {
    const w = this.current;
    if (!w || w.id === 'fists') return false;
    if (w.mag <= 0) {
      if (w.reserve > 0) {
        const take = Math.min(w.magSize, w.reserve);
        w.reserve -= take;
        w.mag = take;
        if (toast) toast(w.name + ' reloaded — ' + w.mag + '/' + w.reserve);
      } else {
        if (toast) toast(w.name + ' is dry — buy ammo at Lead & Iron.');
      }
      return false;
    }
    w.mag -= 1;
    const spread = w.id === 'shotgun' ? 0.06 : w.id === 'smg' ? 0.03 : 0.012;
    const dx = dir.x + (Math.random() - 0.5) * spread;
    const dz = dir.z + (Math.random() - 0.5) * spread;
    const len = w.id === 'shotgun' ? 14 : 26;
    const end = { x: from.x + dx * len, z: from.z + dz * len, y: (from.y || 1.3) };
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(from.x, from.y || 1.3, from.z),
      new THREE.Vector3(end.x, end.y, end.z),
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.95 });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.tracers.push({ line, life: 0.09 });
    if (this.flash) {
      this.flash.position.set(from.x + dx * 0.8, (from.y || 1.3), from.z + dz * 0.8);
      this.flash.visible = true;
      this.flashTimer = 0.06;
    }
    // A tracer that reaches a rival drops them.
    for (let i = this.rivals.length - 1; i >= 0; i--) {
      const r = this.rivals[i];
      const d = Math.hypot(r.x - end.x, r.z - end.z);
      const d2 = Math.hypot(r.x - from.x, r.z - from.z);
      if (d < 2.2 || d2 < 1.6) {
        this.scene.remove(r.mesh);
        this.rivals.splice(i, 1);
        if (toast) toast('Rival down.');
      }
    }
    return true;
  }

  // stageShotFire(from, dir, len): pin a muzzle flash and a tracer
  // for a staged screenshot. Unlike fire(), it spends no ammo, hits
  // nothing, and the flash and tracer stay put until the page is
  // reloaded — the shoot waits seconds, so a live flash would be
  // long gone by the time the screenshot is taken. The flash is
  // small on purpose — a big one swallows the shooter at close range.
  stageShotFire(from, dir, len) {
    if (this.flash) {
      this.flash.position.set(from.x + dir.x * 0.8, from.y || 1.35, from.z + dir.z * 0.8);
      this.flash.scale.set(1.4, 1.4, 1);
      this.flash.visible = true;
      this.holdFlash = true;
    }
    const reach = len || 26;
    const end = { x: from.x + dir.x * reach, z: from.z + dir.z * reach, y: from.y || 1.35 };
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(from.x, from.y || 1.35, from.z),
      new THREE.Vector3(end.x, end.y, end.z),
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.95 });
    this.heldTracer = new THREE.Line(geo, mat);
    this.scene.add(this.heldTracer);
  }

  // spawnRival(x, z): a dark-jacketed rival with red trim and a cap,
  // who walks toward the player and swings when close.
  spawnRival(x, z) {
    const g = new THREE.Group();
    // Rivals wear loud jackets — red, teal, dark — so they read as
    // people against the stalls instead of black silhouettes.
    const jackets = [0xd02020, 0x2ec8ff, 0x23232e];
    const dark = new THREE.MeshStandardMaterial({ color: jackets[this.rivals.length % jackets.length], roughness: 0.7 });
    const red = new THREE.MeshStandardMaterial({ color: 0xd02020, roughness: 0.6 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xd8a878, roughness: 0.7 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.72, 0.34), dark);
    torso.position.y = 1.1;
    torso.castShadow = true;
    g.add(torso);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.36), red);
    trim.position.y = 1.32;
    g.add(trim);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.38), skin);
    head.position.y = 1.68;
    g.add(head);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.09, 10), red);
    cap.position.y = 1.93;
    g.add(cap);
    // Red marker triangle over the rival's head, so the player can
    // spot the crew at a glance — and so a shootout reads at once.
    const marker = new THREE.Mesh(
      new THREE.ConeGeometry(0.34, 0.7, 4),
      new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff0000, emissiveIntensity: 1.6 })
    );
    marker.rotation.x = Math.PI;
    marker.position.y = 2.55;
    g.add(marker);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.18), dark);
    armL.position.set(-0.4, 1.1, 0);
    g.add(armL);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.18), dark);
    armR.position.set(0.4, 1.1, 0);
    g.add(armR);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.2), dark);
    legL.position.set(-0.16, 0.38, 0);
    g.add(legL);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.2), dark);
    legR.position.set(0.16, 0.38, 0);
    g.add(legR);
    g.position.set(x, 0, z);
    this.scene.add(g);
    const rival = { mesh: g, x, z, swing: 0, hitTimer: 0, marker };
    this.rivals.push(rival);
    return rival;
  }

  // update(dt, player, onDamage): rivals close in and swing; tracers
  // and the muzzle flash fade out. onDamage(n) is called per hit.
  update(dt, player, onDamage) {
    for (const r of this.rivals) {
      const dx = player.x - r.x;
      const dz = player.z - r.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.05) {
        r.x += (dx / d) * 3.4 * dt;
        r.z += (dz / d) * 3.4 * dt;
        r.mesh.position.set(r.x, 0, r.z);
        r.mesh.rotation.y = Math.PI - Math.atan2(dx, -dz);
      }
      r.hitTimer -= dt;
      if (d < 1.6 && r.hitTimer <= 0) {
        r.hitTimer = 1.1;
        r.swing = 0.3;
        if (onDamage) onDamage(6);
      }
      if (r.swing > 0) r.swing -= dt;
      if (r.marker) r.marker.rotation.y += dt * 2;
    }
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      t.line.material.opacity = Math.max(0, t.life / 0.09);
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        t.line.material.dispose();
        this.tracers.splice(i, 1);
      }
    }
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0 && this.flash && !this.holdFlash) this.flash.visible = false;
    }
  }
}
