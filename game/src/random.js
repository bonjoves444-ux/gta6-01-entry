// random.js — tiny seeded random helpers for SOLMAR.
// Every bit of world randomness in the game flows through these so a
// fixed seed always builds the same Solmar, which keeps screenshots
// and playtests repeatable from one run to the next.

// mulberry32: a small fast seeded PRNG. Returns a function that yields
// a float in [0, 1) on every call, deterministically for one seed.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// range(rng, min, max): a float between min and max from the given rng.
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// pick(rng, arr): one element of arr, chosen by the rng.
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

// clamp(v, lo, hi): keep v inside [lo, hi].
export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// lerp(a, b, t): straight-line blend between a and b.
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// smoothstep(edge0, edge1, x): 0 below edge0, 1 above edge1, eased between.
export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// wrapAngle(a): fold any angle back into (-PI, PI].
export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a <= -Math.PI) a += Math.PI * 2;
  return a;
}

// valueNoise(x, z, seed): smooth deterministic 2D noise in roughly [-1, 1].
// Built from a hashed lattice with bilinear interpolation, no tables.
function hash2(ix, iz, seed) {
  let h = (ix * 374761393 + iz * 668265263 + seed * 974634211) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) % 10000) / 10000;
}

export function valueNoise(x, z, seed) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz, seed) * 2 - 1;
  const b = hash2(ix + 1, iz, seed) * 2 - 1;
  const c = hash2(ix, iz + 1, seed) * 2 - 1;
  const d = hash2(ix + 1, iz + 1, seed) * 2 - 1;
  return lerp(lerp(a, b, sx), lerp(c, d, sx), sz);
}
