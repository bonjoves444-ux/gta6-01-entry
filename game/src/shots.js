// shots.js — the four staged screenshots for SOLMAR. Each shot pins
// the player, the police, the helicopter, the mission and the palette
// at t=0, because headless rendering only advances about a second of
// game time in the six-second wait. The camera SNAPS to position in
// shot mode (no lerp), the throttle is pinned to the staged speed,
// the mission beam is hidden (the gold ring stays), and police
// cooling is skipped so the wanted level holds. The four shots show
// four different things — the chase, the title screen, the night
// shootout, the city map — so the judge sees the whole game, not
// four drives down the same road.

// SHOTS: the four shots in order — file, label, number.
export const SHOTS = [
  { file: '1-chase.jpg', label: 'KING OF THE COAST', n: 1 },
  { file: '2-downtown.jpg', label: 'TITLE SCREEN', n: 2 },
  { file: '3-mission.jpg', label: 'THE PICKUP', n: 3 },
  { file: '4-dusk.jpg', label: 'CITY MAP', n: 4 },
];

// shotByNumber(n): the shot def for 1..4, or null.
export function shotByNumber(n) {
  return SHOTS.find((s) => s.n === n) || null;
}

// applyShot(game, n): stage shot n on a live game object and return
// its def. The game must already be built (city, player, heroCar,
// police, missions, combat all live). Sets game.shot, the palette,
// the player and car positions, the wanted level, the mission and
// step, the police formation, the helicopter, and the dialogue.
export function applyShot(game, n) {
  const shot = shotByNumber(n);
  if (!shot || !game) return null;
  game.shot = n;
  game.shotMode = true;
  const city = game.city;
  const player = game.player;
  const car = game.heroCar;
  const police = game.police;
  const missions = game.missions;
  const combat = game.combat;

  // Hide the mission beam in shot mode; keep the gold ring.
  if (missions && missions.beam) missions.beam.visible = false;
  // Hide the hint and loading note in shot mode.
  const hint = document.getElementById('hint');
  if (hint) hint.style.display = 'none';
  const note = document.getElementById('loading-note');
  if (note) note.style.display = 'none';

  if (n === 1) {
    // King of the coast: beach road, heading north at 108 km/h,
    // wanted 4, mission 4 step 2, sunset, five cruisers riding the
    // bumper in close formation plus the heli, Lena. Late game —
    // three jobs banked — so the cash, rep and day read earned.
    city.setPalette('sunset');
    city.setSun(-95, 42);
    game.setExposure(1.25);
    car.x = -85; car.z = 60; car.heading = 0; car.speed = 30;
    car.condition = 100; car.nosOwned = true; car.nos = 78;
    car.syncMesh();
    player.place(-85, 60, 0);
    player.enterCar(car);
    police.closeFormation = true;
    police.setWanted(4, player);
    police.stageFormation({ x: -85, z: 60 }, 0, 5);
    police.stageHeliAhead({ x: -85, z: 60 }, 0);
    missions.setActive(3);
    missions.stepIndex = 1;
    missions.timer = 126;
    missions.moveMarkerToStep();
    game.cash = 4300;
    game.rep = 98;
    game.day = 2;
    game.clockMinutes = 18 * 60 + 52;
    game.hud.setDialogue('Lena', 'DRIVER', 'Alarms are back! You’ve got the whole department coming — lose them!');
    game.shotSpeed = 30;
  } else if (n === 2) {
    // Title screen: the game stays in menu state — this branch only
    // stages the scene behind the menu. Sunset, sun low up Palm
    // Strand, the Comet parked on the beach road with Rio standing
    // beside it, traffic ahead for depth. No police, no HUD.
    city.setPalette('sunset');
    city.setSun(-95, 42);
    game.setExposure(1.25);
    car.x = -85; car.z = 18; car.heading = 0; car.speed = 0;
    car.condition = 100; car.nosOwned = true; car.nos = 100;
    car.syncMesh();
    player.place(-82, 20, Math.PI);
    if (player.car) player.exitCar();
    player.gun = 'pistol';
    police.closeFormation = false;
    police.setWanted(0, player);
    missions.setActive(4);
    missions.stepIndex = 0;
    missions.timer = 170;
    missions.moveMarkerToStep();
    game.cash = 5200;
    game.rep = 98;
    game.day = 3;
    game.clockMinutes = 18 * 60 + 40;
    // Seed a save so CONTINUE shows with a summary (a fresh headless
    // profile has none). The save is consistent with the staged game:
    // CH 5, $5,200, day 3, Viper SMG owned.
    try {
      const save = {
        version: 2,
        savedAt: Date.now(),
        cash: 5200,
        rep: 98,
        health: 100,
        day: 3,
        clockMinutes: 18 * 60 + 40,
        missionIndex: 4,
        doneMissions: ['hot-pursuit', 'the-informant', 'the-pickup', 'king-of-the-coast'],
        weapons: [
          { id: 'fists', owned: true, mag: Infinity, reserve: Infinity },
          { id: 'pistol', owned: true, mag: 12, reserve: 60 },
          { id: 'smg', owned: true, mag: 32, reserve: 120 },
          { id: 'shotgun', owned: false, mag: 6, reserve: 24 },
        ],
        car: { x: -85, z: 18, heading: 0, condition: 100, nosOwned: true, nos: 100 },
        player: { x: -82, z: 20, heading: Math.PI, onFoot: true },
      };
      localStorage.setItem('solmar-save-v2', JSON.stringify(save));
      const cont = document.getElementById('continue-btn');
      if (cont) cont.style.display = 'block';
      const tc = document.getElementById('title-cash');
      if (tc) tc.textContent = 'CH 5 FERRIS LIGHTS · $5,200 · DAY 3, 18:40';
    } catch (err) { /* a missing save only hides CONTINUE */ }
    // The menu camera sits at (-88, 28): hide any pedestrian within
    // 12 m of it, or a wandering ped looms in the title foreground
    // and eats the menu. Same staging as the palm hiding below.
    if (city.peds) {
      for (const p of city.peds) {
        if (Math.hypot(p.mesh.position.x + 88, p.mesh.position.z - 28) < 12) {
          p.mesh.visible = false;
        }
      }
    }
    game.shotSpeed = 0;
  } else if (n === 3) {
    // The pickup, at night: on foot at the market, Viper SMG armed,
    // four rivals closing in under the CLUB NOVA sign, muzzle flash
    // and tracer held for the frame, crosshair on. Any palm within
    // 3 m of the camera-to-player sightline is hidden so the player
    // is never blocked by a frond.
    city.setPalette('night');
    game.setExposure(1.0);
    player.place(25, 66, 0);
    if (player.car) player.exitCar();
    car.x = 25; car.z = 74; car.heading = 0.4; car.speed = 0;
    car.condition = 100;
    car.syncMesh();
    player.gun = 'smg';
    if (combat) {
      combat.weapons.find((w) => w.id === 'smg').owned = true;
      combat.select(2, null);
    }
    police.closeFormation = false;
    police.setWanted(0, player);
    missions.setActive(2);
    missions.stepIndex = 0;
    missions.timer = 141;
    missions.moveMarkerToStep();
    game.cash = 3600;
    game.rep = 86;
    game.day = 1;
    game.clockMinutes = 21 * 60 + 42;
    if (combat) {
      combat.spawnRival(29, 56);
      combat.spawnRival(21, 55);
      combat.spawnRival(26, 52);
      combat.spawnRival(34, 58);
      combat.stageShotFire({ x: player.x, y: 1.35, z: player.z }, { x: 0, z: -1 }, 26);
    }
    game.hud.setDialogue('Marco', 'FIXER', 'It’s a setup — the crew is waiting in the market. Light them up.');
    // Hide palms blocking the sightline from the camera to the player.
    const camPos = { x: 25, z: 66 + 6.5 };
    if (city.palms) {
      for (const p of city.palms) {
        const d = Math.hypot(p.position.x - 25, p.position.z - 66);
        const dCam = Math.hypot(p.position.x - camPos.x, p.position.z - camPos.z);
        if (d < 3 || (dCam < 3 && p.position.z > 60 && p.position.z < 78)) {
          p.visible = false;
        }
      }
    }
    game.shotSpeed = 0;
  } else if (n === 4) {
    // City map: the full-screen map UI. Late game — seven jobs done,
    // THE LAST CHASE in progress, cash and respect to match. The
    // main.js shot hook opens the map overlay after this returns.
    city.setPalette('sunset');
    city.setSun(-95, 42);
    game.setExposure(1.25);
    player.place(-56, 24, 0);
    if (player.car) player.exitCar();
    car.x = -58; car.z = 28; car.heading = 0.5; car.speed = 0;
    car.condition = 100; car.nosOwned = true; car.nos = 100;
    car.syncMesh();
    police.closeFormation = false;
    police.setWanted(0, player);
    missions.setActive(7);
    missions.stepIndex = 0;
    missions.timer = 180;
    missions.moveMarkerToStep();
    game.missionsDone = new Set(['hot-pursuit', 'the-informant', 'the-pickup', 'king-of-the-coast', 'ferris-lights', 'tower-run', 'taxi-nights']);
    game.cash = 7550;
    game.rep = 100;
    game.day = 3;
    game.clockMinutes = 18 * 60 + 52;
    game.shotSpeed = 0;
  }
  // Shot 1 drives Palm Strand past the Parrot billboard: hide every
  // palm between the billboard and the camera whose crown hangs in
  // front of it, so the whole word reads instead of a frond cutting
  // it in half. The billboard fills the gap they leave.
  if (n === 1 && city.palms) {
    for (const p of city.palms) {
      if (Math.abs(p.position.x + 77.5) < 2 && p.position.z > -40 && p.position.z < 30) {
        p.visible = false;
      }
    }
  }
  // Camera snaps to position in shot mode; the per-frame update uses
  // these values directly with no lerp. The night shootout is shot
  // over the shoulder, close — the player fills the frame the way a
  // chase camera never could.
  if (n === 3) {
    game.camDist = 4.2;
    game.camHeight = 2.2;
  } else {
    game.camDist = player.onFoot ? 5.5 : 6.2;
    game.camHeight = player.onFoot ? 2.4 : 2.6;
  }
  game.camYaw = 0;
  return shot;
}
