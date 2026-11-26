// The valley: a procedural heightmap with a river, a lake-side plain and a
// flattened runway strip. Pure functions of (x, z), so the terrain is the
// same every frame and every run.
import { WORLD } from './config.js';
import { clamp, hash2, lerp, smoothstep } from './random.js';

/** The river's centre x at a given z (a slow S-curve down the valley). */
export function riverX(z) {
  return 34 * Math.sin(z * 0.006) + 26 * Math.sin(z * 0.0016 + 2.0);
}

/** Raw rolling hills, before the river carve and the runway flatten. */
function hills(x, z) {
  const a = 7 * Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.016);
  const b = 4.5 * Math.sin(x * 0.043 + 0.4) * Math.sin(z * 0.031 + 2.1);
  const c = 2.2 * Math.sin(x * 0.11 + 3.0) * Math.cos(z * 0.083 + 1.2);
  const d = 1.1 * Math.sin(x * 0.23 + 0.7) * Math.sin(z * 0.19 + 4.4);
  // Lifted so the valley floor is meadow, not water: only the river channel
  // (carved below) drops under the waterline.
  return a + b + c + d + 3.0;
}

/** Mountains rising with distance from the valley centre line. */
function mountains(x, z) {
  // The valley widens toward the far north, and the peaks sink there,
  // opening a wide bowl for the turnaround after the last outbound ring —
  // the walls recede instead of boxing the pilot in.
  const widen = 1 + 0.9 * smoothstep(1200, 1600, z);
  const ax = Math.abs(x) / widen;
  const side = smoothstep(70, 230, ax);
  const ridge = 26 * side;
  const detail = 9 * side * Math.sin(x * 0.03 + 1.1) * Math.cos(z * 0.012 + 0.5);
  const far = 14 * smoothstep(180, 320, ax);
  const bowl = 1 - 0.7 * smoothstep(1250, 1650, z);
  return (ridge + detail + far) * bowl;
}

/** Ground height at (x, z), in world units. */
export function heightAt(x, z) {
  let h = hills(x, z) + mountains(x, z);
  // Carve the river channel, deep enough to run under the waterline.
  const d = Math.abs(x - riverX(z));
  h -= 7.5 * Math.exp(-(d * d) / (2 * 11 * 11));
  // Flatten the runway strip and a wide apron around it, so the ground
  // beside the strip is flat meadow — a slightly wide landing is a soft
  // touchdown on grass (recoverable), not a crash into a hillside.
  const r = WORLD.runway;
  const edge = 40;
  const inX = smoothstep(r.x0 - edge, r.x0 + 4, x) * (1 - smoothstep(r.x1 - 4, r.x1 + edge, x));
  const inZ = smoothstep(r.z0 - edge, r.z0 + 10, z) * (1 - smoothstep(r.z1 - 10, r.z1 + edge, z));
  const flat = inX * inZ;
  h = lerp(h, 0, flat);
  return h;
}

/** Whether (x, z) is on the runway strip itself. */
export function isOnRunway(x, z) {
  const r = WORLD.runway;
  return x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
}

/** Approximate slope at (x, z), for shading. */
export function slopeAt(x, z) {
  const e = 2;
  const dx = (heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e);
  const dz = (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
  return Math.sqrt(dx * dx + dz * dz);
}

const MEADOW = ['#67a34e', '#5d9b4a', '#7fae56', '#4f8f3e'];
const FIELD = ['#b5a05e', '#a8894e', '#c2b06a'];

/**
 * The ground colour at (x, z): water, sand, meadow and field patchwork,
 * forest, rock and snow by height, darkened by slope.
 */
export function groundColor(x, z, h, time) {
  const patch = hash2(Math.floor(x / 24), Math.floor(z / 24));
  const patch2 = hash2(Math.floor(x / 9) + 40, Math.floor(z / 9) + 7);
  let base;
  if (h < WORLD.waterLevel) {
    // Water shimmer: a slow travelling brightness wave.
    const shimmer = 0.5 + 0.5 * Math.sin(x * 0.35 + z * 0.22 + time * 0.9);
    base = shimmer > 0.72 ? '#3f8fd6' : '#2f7fc9';
    return base;
  }
  if (h < 0.6) base = '#c9b078';
  else if (h < 9) base = patch < 0.28 ? FIELD[Math.floor(patch2 * FIELD.length)] : MEADOW[Math.floor(patch * MEADOW.length)];
  else if (h < 20) base = patch2 < 0.5 ? '#2f6b34' : '#3a7a3c';
  else if (h < 30) base = '#7d7468';
  else if (h < 38) base = '#8d8478';
  else base = '#e8eef2';
  const slope = slopeAt(x, z);
  const shade = clamp(1 - slope * 0.45, 0.6, 1);
  return shadeColor(base, shade);
}

/** Darken a #rrggbb colour by a factor. */
export function shadeColor(hex, factor) {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * factor);
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * factor);
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * factor);
  return `rgb(${r},${g},${b})`;
}
