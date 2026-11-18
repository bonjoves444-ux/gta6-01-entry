// missions.js — the eight SOLMAR story missions, told by Marco the
// fixer and Lena the driver. Each mission has two steps: reach a spot,
// then reach the next one, against a countdown. Finishing pays cash
// and +12 rep; running the clock out fails the mission.

// Mission defs: id, chapter, giver, title, briefing, timer seconds,
// two steps {x, z, label}, and the cash reward.
const DEFS = [
  {
    id: 'hot-pursuit', ch: 1, giver: 'Marco', role: 'FIXER',
    title: 'HOT PURSUIT',
    brief: 'Lose the cops before the scanner window closes',
    hint: 'They can see you — break line of sight',
    next: 'Bring the money home',
    timer: 150, reward: 500,
    steps: [
      { x: -85, z: -60, label: 'Break line of sight on Palm Strand' },
      { x: -56, z: 24, label: 'Bring the money home to Rio’s Garage' },
    ],
  },
  {
    id: 'the-informant', ch: 2, giver: 'Lena', role: 'DRIVER',
    title: 'THE INFORMANT',
    brief: 'Meet the informant, then get the envelope to Marco',
    hint: 'Quiet streets. No sirens. Not tonight.',
    next: 'Envelope to Marco',
    timer: 180, reward: 650,
    steps: [
      { x: 20, z: 0, label: 'Meet the informant downtown' },
      { x: -56, z: 24, label: 'Envelope to Marco at the garage' },
    ],
  },
  {
    id: 'the-pickup', ch: 3, giver: 'Marco', role: 'FIXER',
    title: 'THE PICKUP',
    brief: 'Collect the package at the market, walk it home',
    hint: 'On foot. Keep it casual.',
    next: 'Walk the package home',
    timer: 150, reward: 700,
    steps: [
      { x: 25, z: 45, label: 'Collect the package at the market' },
      { x: -62, z: 18, label: 'Walk it back to the spawn flat' },
    ],
  },
  {
    id: 'king-of-the-coast', ch: 4, giver: 'Lena', role: 'DRIVER',
    title: 'KING OF THE COAST',
    brief: 'Outrun the whole coast guard of cruisers to the docks',
    hint: 'Five stars. One road. No brakes.',
    next: 'King of the coast, for one night',
    timer: 150, reward: 900,
    steps: [
      { x: -85, z: -100, label: 'Hold the coast road' },
      { x: -104, z: -128, label: 'Reach the docks' },
    ],
  },
  {
    id: 'ferris-lights', ch: 5, giver: 'Marco', role: 'FIXER',
    title: 'FERRIS LIGHTS',
    brief: 'The wheel man is waiting under the ferris wheel',
    hint: 'He only talks when the lights are on.',
    next: 'Back to Rio’s with the keys',
    timer: 170, reward: 800,
    steps: [
      { x: -106, z: 55, label: 'Find the wheel man' },
      { x: -56, z: 24, label: 'Back to Rio’s Garage' },
    ],
  },
  {
    id: 'tower-run', ch: 6, giver: 'Lena', role: 'DRIVER',
    title: 'TOWER RUN',
    brief: 'Grab the drop at Marina Tower, then lose the tail',
    hint: 'Tower door first. Tail second.',
    next: 'Lose the tail on Palm Strand',
    timer: 170, reward: 950,
    steps: [
      { x: -70, z: -45, label: 'Grab the drop at the tower door' },
      { x: -85, z: 40, label: 'Lose the tail on Palm Strand' },
    ],
  },
  {
    id: 'taxi-nights', ch: 7, giver: 'Marco', role: 'FIXER',
    title: 'TAXI NIGHTS',
    brief: 'A rider waits at the pier. Take them to the hotel.',
    hint: 'Five stars for the driver, or else.',
    next: 'Drop the rider at the hotel',
    timer: 200, reward: 600,
    steps: [
      { x: -106, z: 55, label: 'Pick up the rider at the pier' },
      { x: -76, z: -90, label: 'Drop them at the hotel' },
    ],
  },
  {
    id: 'the-last-chase', ch: 8, giver: 'Lena', role: 'DRIVER',
    title: 'THE LAST CHASE',
    brief: 'One roadblock, one run to the docks. Make it count.',
    hint: 'This is the one they’ll tell stories about.',
    next: 'The docks. The boat. Gone.',
    timer: 180, reward: 1200,
    steps: [
      { x: -85, z: -60, label: 'Break the roadblock' },
      { x: -104, z: -128, label: 'Reach the docks' },
    ],
  },
];

// Missions: the active mission, its gold marker ring and light beam,
// the countdown, and step/complete/timeout events for main.js.
import * as THREE from 'three';
export class Missions {
  constructor(scene) {
    this.scene = scene;
    this.list = DEFS;
    this.activeIndex = 0;
    this.active = DEFS[0];
    this.stepIndex = 0;
    this.timer = DEFS[0].timer;
    this.marker = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3, 0.18, 8, 40),
      new THREE.MeshBasicMaterial({ color: 0xffc21a })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.25;
    this.marker.add(ring);
    this.beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 1.6, 26, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffc21a, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
    );
    this.beam.position.y = 13;
    this.marker.add(this.beam);
    this.marker.position.set(DEFS[0].steps[0].x, 0, DEFS[0].steps[0].z);
    scene.add(this.marker);
    this.moveMarkerToStep();
  }

  // setActive(i): jump to mission i (used by saves) and reset it.
  setActive(i) {
    this.activeIndex = ((i % this.list.length) + this.list.length) % this.list.length;
    this.active = this.list[this.activeIndex];
    this.stepIndex = 0;
    this.timer = this.active.timer;
    this.moveMarkerToStep();
  }

  // startNext(): advance to the following mission after a completion.
  startNext() {
    this.setActive(this.activeIndex + 1);
  }

  // moveMarkerToStep(): put the gold ring and beam on the current step.
  moveMarkerToStep() {
    const step = this.active.steps[this.stepIndex];
    if (!step) return;
    this.marker.position.set(step.x, 0, step.z);
  }

  // update(dt, player, onFoot): tick the timer, pulse the marker, and
  // report { type: 'step' | 'complete' | 'timeout' } events. Returns
  // null when nothing happened this frame.
  update(dt, player, onFoot) {
    this.timer -= dt;
    const pulse = 1 + Math.sin(performance.now() * 0.004) * 0.12;
    this.marker.scale.set(pulse, 1, pulse);
    this.marker.rotation.y += dt * 0.6;
    if (this.timer <= 0) {
      this.timer = 0;
      return { type: 'timeout', mission: this.active };
    }
    const step = this.active.steps[this.stepIndex];
    if (!step) return null;
    const d = Math.hypot(player.x - step.x, player.z - step.z);
    if (d < 6.5) {
      this.stepIndex++;
      if (this.stepIndex >= this.active.steps.length) {
        const done = this.active;
        return { type: 'complete', mission: done };
      }
      this.moveMarkerToStep();
      return { type: 'step', mission: this.active, stepIndex: this.stepIndex };
    }
    return null;
  }
}
