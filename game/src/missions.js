// The story: eight missions with Marco and Lena, a glowing objective
// marker, cash payouts, crew reputation and the occasional taxi fare.
import * as THREE from 'three';

export const MISSIONS = [
  { title: 'Getaway Driver', objective: 'Steal a car and reach the Marina Tower', speaker: 'MARCO', line: 'First rule of Solmar: never walk when you can drive. Take that Comet.', target: { x: 14, z: 92 }, pay: 400 },
  { title: 'The Pickup', objective: 'Meet Lena at the market and deal with the rivals', speaker: 'LENA', line: 'Two of Vex’s boys are waiting by the stalls. Handle them, then grab the package.', target: { x: -6, z: 122 }, pay: 650 },
  { title: 'Hot Pursuit', objective: 'Lose the cops on the beachfront — do not stop', speaker: 'MARCO', line: 'They made us! Lose them on the beachfront — cut through the market and don’t stop.', target: { x: -165, z: -80 }, pay: 900 },
  { title: 'Dock Delivery', objective: 'Deliver the crate to the north dock', speaker: 'LENA', line: 'Crate goes to the north dock, no questions. The tide waits for nobody.', target: { x: -196, z: -40 }, pay: 800 },
  { title: 'The Solmar Heist', objective: 'Hit the casino vault and get out clean', speaker: 'MARCO', line: 'The vault opens at sunset. In and out, and nobody sees our faces.', target: { x: 0, z: 60 }, pay: 1500 },
  { title: 'The Informant', objective: 'Pick up the informant downtown without being seen', speaker: 'LENA', line: 'He is waiting by the neon towers. One star is fine — five is a funeral.', target: { x: 0, z: 110 }, pay: 1100 },
  { title: 'Smuggler’s Run', objective: 'Run the coast road to the south docks', speaker: 'MARCO', line: 'Coast road, full throttle. If the heli shows up, you are already too slow.', target: { x: -165, z: 180 }, pay: 1300 },
  { title: 'King of the Coast', objective: 'Escape the five-star dragnet and reach the wheel', speaker: 'LENA', line: 'Five stars, one road, and the whole city watching. Drive like you own it.', target: { x: -184, z: -108 }, pay: 2500 },
];

export function currentMission(G) {
  return MISSIONS[Math.min(G.missions.index, MISSIONS.length - 1)];
}

export function stageText(G) {
  const m = G.missions;
  const totalSteps = 2;
  return `MISSION ${Math.min(m.index + 1, 8)}/8 · STEP ${m.step + 1}/${totalSteps}`;
}

export function makeMarker(G) {
  const geo = new THREE.CylinderGeometry(5, 5, 0.25, 28);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffd94d, transparent: true, opacity: 0.55 });
  const ring = new THREE.Mesh(geo, mat);
  ring.position.y = 0.1;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 42, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd94d, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
  );
  beam.position.y = 21;
  ring.add(beam);
  ring.userData.beam = beam;
  G.scene.add(ring);
  return ring;
}

export function moveMarker(G) {
  const m = currentMission(G);
  G.marker.position.set(m.target.x, 0.1, m.target.z);
}

export function updateMissions(G, dt) {
  if (G.liveShot) return;
  const m = G.missions;
  const cur = currentMission(G);
  const d = Math.hypot(G.player.x - cur.target.x, G.player.z - cur.target.z);
  if (d < 7) {
    if (m.step === 0) {
      m.step = 1;
      G.hud.showToast(G, 'Step complete — one more to go.');
      G.audio?.blip?.();
    } else {
      m.step = 0;
      G.player.cash += cur.pay;
      G.player.rep = Math.min(100, G.player.rep + 12);
      G.hud.showToast(G, `${cur.title} done — +$${cur.pay}, +12 rep.`);
      G.audio?.cash?.();
      if (m.index < MISSIONS.length - 1) {
        m.index++;
        const next = currentMission(G);
        G.hud.showDialogue(G, next.speaker, next.line, 7);
        moveMarker(G);
      } else {
        G.hud.showDialogue(G, 'LENA', 'That is the whole coast, boss. Solmar is yours.', 8);
        G.player.rep = 100;
      }
    }
  }
  // Taxi fares: a gold marker pops up now and then; reach it for $40 and +2 rep.
  G.fareTimer -= dt;
  if (G.fareTimer <= 0 && !G.fare) {
    G.fare = { x: -60 + Math.random() * 120, z: -60 + Math.random() * 180 };
    G.fareMarker.position.set(G.fare.x, 0.1, G.fare.z);
    G.fareMarker.visible = true;
    G.fareTimer = 45;
  }
  if (G.fare) {
    const fd = Math.hypot(G.player.x - G.fare.x, G.player.z - G.fare.z);
    if (fd < 6) {
      G.player.cash += 40;
      G.player.rep = Math.min(100, G.player.rep + 2);
      G.hud.showToast(G, 'Fare dropped off — +$40, +2 rep.');
      G.fare = null;
      G.fareMarker.visible = false;
      G.fareTimer = 40;
    }
  }
}
