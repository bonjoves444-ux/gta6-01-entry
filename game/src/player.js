// player.js — Rio Vega on foot: walking, running, entering and leaving cars.
import * as THREE from "three";
import { resolveCityCollision } from "./city.js";
import { nearestStealableCar } from "./vehicles.js";
import { raiseWanted } from "./police.js";

export function createPlayer(scene, spawn) {
  const group = new THREE.Group();
  // Rio: dark jacket, jeans, cap — a readable silhouette at a distance.
  const jacketMat = new THREE.MeshLambertMaterial({ color: 0x2a4a6b });
  const jeansMat = new THREE.MeshLambertMaterial({ color: 0x2c3550 });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
  const capMat = new THREE.MeshLambertMaterial({ color: 0xffd23e });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.0, 0.45), jacketMat);
  torso.position.y = 1.15;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skinMat);
  head.position.y = 1.95;
  group.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.16, 0.56), capMat);
  cap.position.y = 2.24;
  group.add(cap);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.32), jeansMat);
  legL.position.set(-0.22, 0.42, 0);
  legL.name = "leg-left";
  group.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.32), jeansMat);
  legR.position.set(0.22, 0.42, 0);
  legR.name = "leg-right";
  group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.85, 0.26), jacketMat);
  armL.position.set(-0.58, 1.15, 0);
  group.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.85, 0.26), jacketMat);
  armR.position.set(0.58, 1.15, 0);
  group.add(armR);
  group.position.set(spawn.x, 0, spawn.z);
  scene.add(group);
  return {
    mesh: group,
    heading: 0,
    walkSpeed: 7,
    runSpeed: 11,
    health: 100,
    cash: 0,
    wanted: 0,
    inCar: null,
    ammo: 24,
    hasPackage: false,
    walkCycle: 0,
  };
}

// Walk with WASD relative to the camera heading; Shift runs.
export function updatePlayerOnFoot(ctx, dt) {
  const player = ctx.player;
  const input = ctx.input;
  const axes = input.moveAxes();
  const running = input.isDown("ShiftLeft") || input.isDown("ShiftRight");
  const speed = running ? player.runSpeed : player.walkSpeed;
  if (axes.forward !== 0 || axes.strafe !== 0) {
    const cameraHeading = ctx.cameraHeading;
    const forwardX = Math.sin(cameraHeading);
    const forwardZ = Math.cos(cameraHeading);
    const rightX = Math.cos(cameraHeading);
    const rightZ = -Math.sin(cameraHeading);
    let moveX = forwardX * axes.forward + rightX * axes.strafe;
    let moveZ = forwardZ * axes.forward + rightZ * axes.strafe;
    const length = Math.hypot(moveX, moveZ) || 1;
    moveX /= length;
    moveZ /= length;
    player.heading = Math.atan2(moveX, moveZ);
    let nextX = player.mesh.position.x + moveX * speed * dt;
    let nextZ = player.mesh.position.z + moveZ * speed * dt;
    const resolved = resolveCityCollision(ctx.city, nextX, nextZ, 0.7);
    nextX = resolved.x;
    nextZ = resolved.z;
    player.mesh.position.x = Math.max(-198, Math.min(198, nextX));
    player.mesh.position.z = Math.max(-198, Math.min(198, nextZ));
    player.walkCycle += dt * speed * 1.6;
    const swing = Math.sin(player.walkCycle) * 0.45;
    const legL = player.mesh.getObjectByName("leg-left");
    const legR = player.mesh.getObjectByName("leg-right");
    if (legL) legL.rotation.x = swing;
    if (legR) legR.rotation.x = -swing;
  }
  player.mesh.rotation.y = player.heading;
  player.mesh.visible = true;
}

// E near a car steals it (and raises the wanted level); E in a car steps out.
export function tryEnterOrExitCar(ctx) {
  const player = ctx.player;
  if (player.inCar) {
    const car = player.inCar;
    car.speed = 0;
    player.inCar = null;
    const sideX = Math.cos(car.heading);
    const sideZ = -Math.sin(car.heading);
    player.mesh.position.set(
      car.mesh.position.x + sideX * 2.6,
      0,
      car.mesh.position.z + sideZ * 2.6
    );
    player.mesh.visible = true;
    ctx.hud.showToast("Out of the " + car.name);
    return;
  }
  const car = nearestStealableCar(ctx, 6.5);
  if (!car) {
    ctx.hud.showToast("No car close enough — walk up to one and press E");
    return;
  }
  player.inCar = car;
  car.parked = false;
  car.stolen = true;
  player.mesh.visible = false;
  raiseWanted(ctx, 1, "Grand theft auto — " + car.name);
  ctx.hud.showToast("Stole the " + car.name + "! The police are watching.");
  ctx.audio.playSteal();
}
