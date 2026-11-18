// Save and load through localStorage: cash, reputation, weapons, radio,
// mission progress and where the player stood.
export const SAVE_KEY = 'solmar-save-v2';

export function saveGame(G) {
  try {
    const p = G.player;
    const data = {
      cash: p.cash,
      rep: p.rep,
      health: p.health,
      weapon: p.weapon,
      weapons: p.weapons,
      radio: G.audio ? G.audio.station : 0,
      mission: G.missions.index,
      step: G.missions.step,
      x: p.x,
      z: p.z,
      heading: p.heading,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function applySave(G, data) {
  if (!data) return;
  const p = G.player;
  if (typeof data.cash === 'number') p.cash = data.cash;
  if (typeof data.rep === 'number') p.rep = data.rep;
  if (typeof data.health === 'number') p.health = data.health;
  if (data.weapons) p.weapons = data.weapons;
  if (data.weapon && p.weapons[data.weapon]) p.weapon = data.weapon;
  if (typeof data.radio === 'number' && G.audio) G.audio.setStation(data.radio);
  if (typeof data.mission === 'number') G.missions.index = Math.max(0, Math.min(7, data.mission));
  if (typeof data.step === 'number') G.missions.step = data.step === 1 ? 1 : 0;
  if (typeof data.x === 'number' && typeof data.z === 'number') {
    p.x = data.x;
    p.z = data.z;
    p.group.position.set(p.x, 0, p.z);
  }
  if (typeof data.heading === 'number') {
    p.heading = data.heading;
    p.camHeading = data.heading;
  }
}
