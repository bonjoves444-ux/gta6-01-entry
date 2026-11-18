// random.js — seeded random numbers so city layouts and screenshot scenes are
// repeatable, plus the small picking helpers the city and the shops share.
export function makeSeededRandom(seed) {
  let state = seed >>> 0;
  if (state === 0) state = 0x9e3779b9;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomRange(rng, min, max) {
  return min + rng() * (max - min);
}

export function randomInt(rng, min, max) {
  return Math.floor(randomRange(rng, min, max + 1));
}

export function randomPick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

// Pick one entry by weight: heavier entries come up more often.
export function randomChoiceWeighted(rng, entries) {
  let total = 0;
  for (const entry of entries) total += entry.weight;
  let roll = rng() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.value;
  }
  return entries[entries.length - 1].value;
}

// A tiny deterministic hash of a short string, used to seed districts from
// their names so the same district always builds the same way.
export function hashStringToSeed(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// Shuffle a list in place with the seeded generator, so shuffled spawns and
// shop stock stay repeatable between runs.
export function shuffleSeeded(rng, list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
}

// A random point inside an axis-aligned rectangle on the map.
export function randomPointInRect(rng, minX, maxX, minZ, maxZ) {
  return { x: randomRange(rng, minX, maxX), z: randomRange(rng, minZ, maxZ) };
}

// A random compass heading in radians.
export function randomHeading(rng) {
  return rng() * Math.PI * 2;
}
