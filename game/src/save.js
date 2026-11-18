// save.js — localStorage save/load for SOLMAR.
// One slot, versioned, so an old save from an earlier build never
// silently loads into a newer one and corrupts the game state.

export const SAVE_KEY = 'solmar-save-v2';
export const SAVE_VERSION = 2;

// saveGame(state): snapshot the parts of the game worth keeping and
// write them to localStorage. Returns true when the write landed.
// The car lives on the player while driving and on state.heroCar while
// parked, so the car is read from (state.player && state.player.car)
// first and state.heroCar second — the game object has no `car` field.
export function saveGame(state) {
  try {
    const car = (state.player && state.player.car) || state.heroCar || null;
    const data = {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      cash: state.cash,
      rep: state.rep,
      health: state.health,
      day: state.day,
      clockMinutes: state.clockMinutes,
      missionIndex: state.missions ? state.missions.activeIndex : 0,
      doneMissions: state.missionsDone ? [...state.missionsDone] : [],
      weapons: state.combat ? state.combat.weapons.map((w) => ({
        id: w.id,
        owned: w.owned,
        mag: w.mag,
        reserve: w.reserve,
      })) : [],
      car: car ? {
        x: car.x,
        z: car.z,
        heading: car.heading,
        condition: car.condition,
        nosOwned: car.nosOwned,
        nos: car.nos,
      } : null,
      player: state.player ? {
        x: state.player.x,
        z: state.player.z,
        heading: state.player.heading,
        onFoot: state.player.onFoot,
      } : null,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    return false;
  }
}

// loadGame(): read the save slot back. Returns the parsed object, or
// null when there is no save, it is not valid JSON, or its version is
// older than the one this build understands.
export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== SAVE_VERSION) return null;
    return data;
  } catch (err) {
    return null;
  }
}

// hasSave(): true when a save of the current version exists.
export function hasSave() {
  return loadGame() !== null;
}

// applySave(state, data): push a loaded save back into a live game.
// Only touches fields the save actually carries, so a partial save
// can never blank out a live value. Returns true when applied.
export function applySave(state, data) {
  if (!data) return false;
  if (typeof data.cash === 'number') state.cash = data.cash;
  if (typeof data.rep === 'number') state.rep = data.rep;
  if (typeof data.health === 'number') state.health = data.health;
  if (typeof data.day === 'number') state.day = data.day;
  if (typeof data.clockMinutes === 'number') state.clockMinutes = data.clockMinutes;
  if (state.missions && typeof data.missionIndex === 'number') {
    state.missions.setActive(data.missionIndex);
  }
  if (state.missionsDone && Array.isArray(data.doneMissions)) {
    state.missionsDone = new Set(data.doneMissions);
  }
  if (state.combat && Array.isArray(data.weapons)) {
    for (const saved of data.weapons) {
      const w = state.combat.weapons.find((x) => x.id === saved.id);
      if (w) {
        w.owned = !!saved.owned;
        // JSON turns Infinity into null, so a null mag/reserve means
        // the bottomless fists — restore Infinity, not zero.
        w.mag = saved.mag === null || saved.mag === undefined ? Infinity : saved.mag | 0;
        w.reserve = saved.reserve === null || saved.reserve === undefined ? Infinity : saved.reserve | 0;
      }
    }
  }
  if (data.car && state.heroCar) {
    state.heroCar.x = data.car.x;
    state.heroCar.z = data.car.z;
    state.heroCar.heading = data.car.heading;
    state.heroCar.condition = data.car.condition;
    state.heroCar.nosOwned = !!data.car.nosOwned;
    state.heroCar.nos = data.car.nos;
    state.heroCar.syncMesh();
  }
  if (data.player && state.player) {
    state.player.place(data.player.x, data.player.z, data.player.heading);
    if (data.player.onFoot === false && state.heroCar) {
      state.player.enterCar(state.heroCar);
    }
  }
  return true;
}
