// missions.js — Rio's eight-mission crew story, with a spoken line from the
// crew on every job, plus taxi side jobs. Steps reuse five kinds: reach,
// pickup, lose-heat, timed-reach and hold.
import * as THREE from "three";
import { raiseWanted } from "./police.js";

export const MISSION_LIST = [
  {
    id: "getaway",
    title: "1 — Getaway Driver",
    briefing: "Marco needs a wheelman. Steal any car, then reach the gold marker at the docks.",
    dialogue: { name: "MARCO", line: "Rio! My wheelman is back. Steal something fast and meet me at the docks.", color: "#ffd23e" },
    steps: [
      { kind: "reach", label: "Steal a car", target: null },
      { kind: "reach", label: "Drive to the docks marker", target: { x: 178, z: 0 } },
    ],
    reward: 500,
  },
  {
    id: "pickup",
    title: "2 — The Pickup",
    briefing: "A package is waiting at Mercado Solmar. Go on foot, grab it with E, then bring it to Rio's garage.",
    dialogue: { name: "LENA", line: "Package is at the market stalls, south side. On foot, Rio — no heat on this one.", color: "#7dd8ff" },
    steps: [
      { kind: "pickup", label: "Pick up the package at the market (press E)", target: { x: 0, z: 140 } },
      { kind: "reach", label: "Deliver the package to the garage", target: { x: -55, z: 55 } },
    ],
    reward: 800,
  },
  {
    id: "pursuit",
    title: "3 — Hot Pursuit",
    briefing: "The crew tipped the police off. Lose the wanted level — hide, drive fast, stay out of sight.",
    dialogue: { name: "MARCO", line: "They made us! Lose them on the beachfront — cut through the market and don't stop.", color: "#ffd23e" },
    steps: [
      { kind: "lose-heat", label: "Lose the police — get your wanted level to zero", target: null },
    ],
    reward: 1000,
  },
  {
    id: "delivery",
    title: "4 — Dock Delivery",
    briefing: "Cargo for the docks, and the clock is ticking. Drive to the east pier in 90 seconds.",
    dialogue: { name: "LENA", line: "Ninety seconds, Rio. The boat leaves with the tide — or without our cargo.", color: "#7dd8ff" },
    steps: [
      { kind: "timed-reach", label: "Drive the cargo to the docks pier", target: { x: 178, z: 60 }, timeLimit: 90 },
    ],
    reward: 1500,
  },
  {
    id: "heist",
    title: "5 — The Solmar Heist",
    briefing: "The big one: Solmar Bank. Hold the bank steps for 20 seconds, then escape to the safehouse.",
    dialogue: { name: "MARCO", line: "Twenty seconds on those steps and the vault is ours. Then run — the whole city will hear it.", color: "#ffd23e" },
    steps: [
      { kind: "hold", label: "Hold the bank steps — stay in the gold ring", target: { x: 55, z: -55 }, holdTime: 20 },
      { kind: "reach", label: "Escape to the safehouse on the beach", target: { x: -140, z: -140 } },
    ],
    reward: 5000,
  },
  {
    id: "informant",
    title: "6 — The Informant",
    briefing: "A talker by the big wheel knows who ratted the crew out. Pick up his envelope, then get it to the safehouse.",
    dialogue: { name: "LENA", line: "The informant waits by the wheel, north beach. Grab the envelope — and don't let his friends follow you.", color: "#7dd8ff" },
    steps: [
      { kind: "pickup", label: "Meet the informant by the Solmar Wheel (press E)", target: { x: -172, z: -110 } },
      { kind: "reach", label: "Carry the envelope to the safehouse", target: { x: -140, z: -140 } },
    ],
    reward: 1800,
  },
  {
    id: "smuggler",
    title: "7 — Smuggler's Run",
    briefing: "Hot goods, hotter engine. Run the coast road to the north pier in 100 seconds — the police are already watching.",
    dialogue: { name: "MARCO", line: "Coast road, full throttle, NOS if you have it. One hundred seconds and we're rich.", color: "#ffd23e" },
    steps: [
      { kind: "timed-reach", label: "Run the coast road to the north pier", target: { x: 178, z: -60 }, timeLimit: 100 },
    ],
    reward: 2500,
  },
  {
    id: "king",
    title: "8 — King of the Coast",
    briefing: "The last job: hold Marina Tower's plaza for 25 seconds while Lena cracks the safe, then vanish down the beach.",
    dialogue: { name: "LENA", line: "Last one, Rio. Hold the plaza, keep the cops off me for twenty-five seconds, and we own this city.", color: "#7dd8ff" },
    steps: [
      { kind: "hold", label: "Hold Marina Tower plaza — stay in the gold ring", target: { x: 27.5, z: 0 }, holdTime: 25 },
      { kind: "reach", label: "Vanish down the beach promenade", target: { x: -172, z: 40 } },
    ],
    reward: 8000,
  },
];

export function createMissionSystem(scene) {
  // A glowing gold beacon marks the current objective in the world.
  const beaconGeometry = new THREE.CylinderGeometry(4.5, 4.5, 14, 20, 1, true);
  const beaconMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd23e, transparent: true, opacity: 0.35, side: THREE.DoubleSide,
  });
  const beacon = new THREE.Mesh(beaconGeometry, beaconMaterial);
  beacon.position.y = 7;
  beacon.visible = false;
  scene.add(beacon);
  const ringGeometry = new THREE.RingGeometry(3.4, 4.4, 32);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffd23e, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.15;
  ring.visible = false;
  scene.add(ring);
  return {
    index: 0,
    step: 0,
    stepTimer: 0,
    holdTimer: 0,
    beacon,
    ring,
    taxi: null,
    completed: 0,
    finished: false,
  };
}

export function currentMission(missions) {
  return MISSION_LIST[missions.index] || null;
}

export function currentStep(missions) {
  const mission = currentMission(missions);
  return mission ? mission.steps[missions.step] : null;
}

// "MISSION 3/8 · STEP 1/2" — the stage line the HUD shows under the title.
export function missionStageText(missions) {
  const mission = currentMission(missions);
  if (!mission) return "";
  return "MISSION " + (missions.index + 1) + "/" + MISSION_LIST.length +
    " · STEP " + (missions.step + 1) + "/" + mission.steps.length;
}

export function startMission(ctx, index) {
  const missions = ctx.missions;
  missions.index = index;
  missions.step = 0;
  missions.stepTimer = 0;
  missions.holdTimer = 0;
  missions.heatRaised = false;
  const mission = MISSION_LIST[index];
  ctx.hud.setObjective(mission.title, mission.briefing, missionStageText(missions));
  ctx.hud.showBanner(mission.title);
  if (mission.dialogue) {
    ctx.hud.showDialogue(mission.dialogue.name, mission.dialogue.line, mission.dialogue.color);
  }
  ctx.audio.playMissionStart();
  updateMissionMarker(ctx);
}

export function updateMissionMarker(ctx) {
  const step = currentStep(ctx.missions);
  const missions = ctx.missions;
  if (step && step.target) {
    missions.beacon.position.set(step.target.x, 7, step.target.z);
    missions.beacon.visible = true;
    missions.ring.position.set(step.target.x, 0.15, step.target.z);
    missions.ring.visible = true;
  } else {
    missions.beacon.visible = false;
    missions.ring.visible = false;
  }
}

function completeStep(ctx) {
  const missions = ctx.missions;
  const mission = currentMission(missions);
  missions.step += 1;
  missions.stepTimer = 0;
  missions.holdTimer = 0;
  missions.heatRaised = false;
  if (missions.step >= mission.steps.length) {
    ctx.player.cash += mission.reward;
    ctx.player.rep = Math.min(100, (ctx.player.rep || 0) + 12);
    missions.completed += 1;
    ctx.hud.showToast(mission.title + " complete! +$" + mission.reward + " · +12 rep");
    ctx.audio.playCash();
    ctx.save.saveGame(ctx);
    if (missions.index + 1 < MISSION_LIST.length) {
      startMission(ctx, missions.index + 1);
    } else {
      missions.finished = true;
      ctx.hud.setObjective("SOLMAR LEGEND",
        "Every crew job done. Solmar is yours — free roam, take fares, keep the cash coming.",
        "8/8 MISSIONS COMPLETE");
      ctx.hud.showBanner("SOLMAR LEGEND");
      ctx.hud.showDialogue("MARCO", "That's it, Rio. Eight jobs, one legend. The coast is yours.", "#ffd23e");
      missions.beacon.visible = false;
      missions.ring.visible = false;
    }
    return;
  }
  const nextStep = currentStep(missions);
  ctx.hud.setObjective(mission.title, nextStep.label, missionStageText(missions));
  updateMissionMarker(ctx);
}

function playerPosition(ctx) {
  return ctx.player.inCar ? ctx.player.inCar.mesh.position : ctx.player.mesh.position;
}

export function updateMissions(ctx, dt) {
  const missions = ctx.missions;
  if (missions.finished) return;
  const mission = currentMission(missions);
  if (!mission) return;
  const step = currentStep(missions);
  if (!step) return;
  const pos = playerPosition(ctx);
  missions.stepTimer += dt;

  if (step.kind === "reach" && step.target) {
    if (mission.id === "getaway" && missions.step === 0 && !ctx.player.inCar) {
      ctx.hud.setObjective(mission.title, "Steal a car — walk up to one and press E", missionStageText(missions));
      return;
    }
    const distance = Math.hypot(pos.x - step.target.x, pos.z - step.target.z);
    if (distance < 7) completeStep(ctx);
    return;
  }
  if (step.kind === "pickup" && step.target) {
    const distance = Math.hypot(pos.x - step.target.x, pos.z - step.target.z);
    if (distance < 6 && !ctx.player.inCar) {
      ctx.hud.setObjective(mission.title, "Press E to grab it", missionStageText(missions));
      if (ctx.input.wasPressed("KeyE")) {
        ctx.player.hasPackage = true;
        ctx.hud.showToast("Grabbed. Take it where it needs to go.");
        completeStep(ctx);
      }
    }
    return;
  }
  if (step.kind === "lose-heat") {
    if (!missions.heatRaised) {
      missions.heatRaised = true;
      raiseWanted(ctx, 3, "The crew tipped the police off!");
    }
    if (ctx.player.wanted === 0) completeStep(ctx);
    return;
  }
  if (step.kind === "timed-reach" && step.target) {
    const left = Math.max(0, step.timeLimit - missions.stepTimer);
    ctx.hud.setObjective(mission.title, step.label + " — " + Math.ceil(left) + "s left", missionStageText(missions));
    const distance = Math.hypot(pos.x - step.target.x, pos.z - step.target.z);
    if (distance < 7) {
      completeStep(ctx);
      return;
    }
    if (left <= 0) {
      ctx.hud.showToast("Too slow! The window closed — try again.");
      missions.stepTimer = 0;
    }
    return;
  }
  if (step.kind === "hold" && step.target) {
    const distance = Math.hypot(pos.x - step.target.x, pos.z - step.target.z);
    if (distance < 6) {
      missions.holdTimer += dt;
      ctx.hud.setObjective(mission.title,
        "Hold the ring — " + Math.ceil(step.holdTime - missions.holdTimer) + "s",
        missionStageText(missions));
      if (missions.holdTimer >= step.holdTime) {
        if (mission.id === "heist") {
          ctx.player.cash += 2000;
          ctx.hud.showToast("Vault cracked! +$2,000 — now run!");
          raiseWanted(ctx, 4, "Bank alarm — Solmar Bank heist!");
        } else {
          ctx.hud.showToast("Safe cracked! Now vanish!");
          raiseWanted(ctx, 3, "Marina Tower alarm!");
        }
        completeStep(ctx);
      }
    } else {
      missions.holdTimer = 0;
      ctx.hud.setObjective(mission.title, "Get to the ring and hold it", missionStageText(missions));
    }
  }
}

// Taxi side job: pick up a waiting pedestrian and drop them at their destination.
export function startTaxiJob(ctx) {
  if (ctx.missions.taxi) return;
  const rng = Math.random;
  const pickup = { x: (rng() * 300 - 150), z: (rng() * 300 - 150) };
  const drop = { x: (rng() * 300 - 150), z: (rng() * 300 - 150) };
  ctx.missions.taxi = { pickup, drop, phase: "pickup", fare: 120 + Math.floor(rng() * 180) };
  ctx.hud.showToast("Taxi fare: pick up the passenger at the gold marker");
  ctx.hud.showDialogue("DISPATCH", "Fare waiting on the north side. Be quick, driver.", "#7dd8ff");
  ctx.missions.beacon.position.set(pickup.x, 7, pickup.z);
  ctx.missions.beacon.visible = true;
  ctx.missions.ring.position.set(pickup.x, 0.15, pickup.z);
  ctx.missions.ring.visible = true;
}

export function updateTaxiJob(ctx, dt) {
  const taxi = ctx.missions.taxi;
  if (!taxi) return;
  if (currentStep(ctx.missions) && currentStep(ctx.missions).target) return;
  const pos = playerPosition(ctx);
  const target = taxi.phase === "pickup" ? taxi.pickup : taxi.drop;
  const distance = Math.hypot(pos.x - target.x, pos.z - target.z);
  if (distance < 7 && ctx.player.inCar) {
    if (taxi.phase === "pickup") {
      taxi.phase = "drop";
      ctx.hud.showToast("Passenger aboard — drive to the drop-off");
      ctx.missions.beacon.position.set(taxi.drop.x, 7, taxi.drop.z);
      ctx.missions.ring.position.set(taxi.drop.x, 0.15, taxi.drop.z);
    } else {
      ctx.player.cash += taxi.fare;
      ctx.player.rep = Math.min(100, (ctx.player.rep || 0) + 2);
      ctx.hud.showToast("Fare complete! +$" + taxi.fare + " · +2 rep");
      ctx.audio.playCash();
      ctx.missions.taxi = null;
      updateMissionMarker(ctx);
    }
  }
}
