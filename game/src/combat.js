// combat.js — fists, the pistol, rival crew members, and hit effects.
import * as THREE from "three";
import { raiseWanted } from "./police.js";

export function createCombatSystem(scene) {
  const flashGeometry = new THREE.SphereGeometry(0.35, 8, 6);
  const flashMaterial = new THREE.MeshBasicMaterial({ color: 0xffe27a });
  const flash = new THREE.Mesh(flashGeometry, flashMaterial);
  flash.visible = false;
  scene.add(flash);
  return {
    scene,
    flash,
    flashTimer: 0,
    punchTimer: 0,
    shootCooldown: 0,
    enemies: [],
    sparks: [],
    tracer: null,
  };
}

// Short-lived orange sparks at a crash or a bullet impact.
export function addCrashSparks(ctx, x, y, z) {
  const combat = ctx.combat;
  const geo = new THREE.SphereGeometry(0.22, 6, 5);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffa62b });
  for (let i = 0; i < 8; i++) {
    const spark = new THREE.Mesh(geo, mat);
    spark.position.set(x + (Math.random() - 0.5) * 2, y + Math.random(), z + (Math.random() - 0.5) * 2);
    spark.userData.life = 0.5 + Math.random() * 0.3;
    combat.scene.add(spark);
    combat.sparks.push(spark);
  }
}

export function updateCombatEffects(ctx, dt) {
  const combat = ctx.combat;
  if (combat.flashTimer > 0) {
    combat.flashTimer -= dt;
    if (combat.flashTimer <= 0) combat.flash.visible = false;
  }
  for (let i = combat.sparks.length - 1; i >= 0; i--) {
    const spark = combat.sparks[i];
    spark.userData.life -= dt;
    spark.position.y += dt * 2;
    if (spark.userData.life <= 0) {
      combat.scene.remove(spark);
      combat.sparks.splice(i, 1);
    }
  }
  if (combat.shootCooldown > 0) combat.shootCooldown -= dt;
  if (combat.punchTimer > 0) combat.punchTimer -= dt;
}

// A rival crew member: a red-jacketed walker who shoves back when hit.
export function spawnEnemy(ctx, x, z) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xa83232 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.0, 0.45), bodyMat);
  body.position.y = 1.15;
  group.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshLambertMaterial({ color: 0xc98a5e }));
  head.position.y = 1.95;
  group.add(head);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.35),
    new THREE.MeshLambertMaterial({ color: 0x222222 }));
  legs.position.y = 0.42;
  group.add(legs);
  group.position.set(x, 0, z);
  ctx.scene.add(group);
  const enemy = { mesh: group, health: 60, state: "idle" };
  ctx.combat.enemies.push(enemy);
  return enemy;
}

export function updateEnemies(ctx, dt) {
  const player = ctx.player;
  for (let i = ctx.combat.enemies.length - 1; i >= 0; i--) {
    const enemy = ctx.combat.enemies[i];
    const dx = player.mesh.position.x - enemy.mesh.position.x;
    const dz = player.mesh.position.z - enemy.mesh.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 14 && distance > 1.6) {
      enemy.mesh.position.x += (dx / distance) * 3.2 * dt;
      enemy.mesh.position.z += (dz / distance) * 3.2 * dt;
      enemy.mesh.rotation.y = Math.atan2(dx, dz);
    } else if (distance <= 1.6) {
      // The rival lands a hit every second he stays in range.
      enemy.state = "attacking";
      if (!enemy.hitTimer || enemy.hitTimer <= 0) {
        player.health = Math.max(0, player.health - 5);
        enemy.hitTimer = 1;
        ctx.hud.showToast("Rival crew member hit you!");
      } else {
        enemy.hitTimer -= dt;
      }
    }
    if (enemy.health <= 0) {
      ctx.scene.remove(enemy.mesh);
      ctx.combat.enemies.splice(i, 1);
      ctx.player.cash += 50;
      ctx.hud.showToast("Rival down. +$50");
    }
  }
}

// Punch: short range, no ammo, no wanted level unless a cop sees it.
export function tryPunch(ctx) {
  const combat = ctx.combat;
  if (combat.punchTimer > 0 || ctx.player.inCar) return;
  combat.punchTimer = 0.45;
  ctx.audio.playPunch();
  for (const enemy of combat.enemies) {
    const distance = Math.hypot(
      enemy.mesh.position.x - ctx.player.mesh.position.x,
      enemy.mesh.position.z - ctx.player.mesh.position.z
    );
    if (distance < 2.6) {
      enemy.health -= 25;
      addCrashSparks(ctx, enemy.mesh.position.x, 1.4, enemy.mesh.position.z);
    }
  }
  for (const ped of ctx.pedestrians) {
    const distance = Math.hypot(
      ped.mesh.position.x - ctx.player.mesh.position.x,
      ped.mesh.position.z - ctx.player.mesh.position.z
    );
    if (distance < 2.4) {
      ped.fleeing = true;
      raiseWanted(ctx, 1, "Assault on a pedestrian");
    }
  }
}

// Shoot: a ray from the camera through the crosshair; hits enemies, peds and cars.
export function tryShoot(ctx) {
  const combat = ctx.combat;
  const player = ctx.player;
  if (combat.shootCooldown > 0 || player.inCar || player.ammo <= 0) return;
  combat.shootCooldown = 0.32;
  player.ammo -= 1;
  ctx.audio.playShot();
  const origin = ctx.camera.position.clone();
  const direction = new THREE.Vector3();
  ctx.camera.getWorldDirection(direction);
  const flashPos = origin.clone().add(direction.clone().multiplyScalar(1.2));
  flashPos.y -= 0.3;
  combat.flash.position.copy(flashPos);
  combat.flash.visible = true;
  combat.flashTimer = 0.07;
  const raycaster = new THREE.Raycaster(origin, direction, 0, 60);
  const targets = [];
  for (const enemy of combat.enemies) targets.push(enemy.mesh);
  for (const ped of ctx.pedestrians) targets.push(ped.mesh);
  for (const car of ctx.cars) targets.push(car.mesh);
  const hits = raycaster.intersectObjects(targets, true);
  if (hits.length > 0) {
    const hitPoint = hits[0].point;
    addCrashSparks(ctx, hitPoint.x, hitPoint.y, hitPoint.z);
    let hitObject = hits[0].object;
    while (hitObject.parent && hitObject.parent !== ctx.scene) hitObject = hitObject.parent;
    for (const enemy of combat.enemies) {
      if (enemy.mesh === hitObject) enemy.health -= 34;
    }
    for (const ped of ctx.pedestrians) {
      if (ped.mesh === hitObject) {
        ped.fleeing = true;
        raiseWanted(ctx, 1, "Shots fired in Solmar City");
      }
    }
    for (const car of ctx.cars) {
      if (car.mesh === hitObject) {
        car.health -= 20;
        if (car.health <= 0) addCrashSparks(ctx, car.mesh.position.x, 1, car.mesh.position.z);
      }
    }
  }
}
