// Seeded random helpers for SOLMAR. One small deterministic generator keeps
// the city layout identical on every load, so screenshots stay reproducible.

export function createRng(seed) {
  let state = seed >>> 0;
  if (state === 0) state = 0x9e3779b9;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function range(rng, low, high) {
  return low + rng() * (high - low);
}

export function int(rng, low, high) {
  return Math.floor(range(rng, low, high + 1));
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

export function chance(rng, probability) {
  return rng() < probability;
}
