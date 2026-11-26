// The ring course and the mission: fly the rings in order, then come home
// and land on the runway. A new course is drawn for every lap.
import { COURSE } from './config.js';
import { createRandom } from './random.js';

/** Ring centres for a course: out up the valley, around the north bowl, and back down to the runway. */
export function generateCourse(seed) {
  const rng = createRandom(seed);
  // Out north (rings 1-4), the turnaround in the bowl (ring 5), then back
  // south (rings 6-8) already lined up for runway 27 — the course itself
  // brings the plane home, so there is no separate 180-degree turn to fly.
  const zs = [470, 700, 930, 1160, 1500, 1250, 950, 650];
  // A gentle weave: no more than ~28 units sideways between rings, so a
  // modest bank gets the plane there in time. The valley is the course;
  // the challenge is the flying, not a slalom.
  const xs = [8, -12, 16, -8, 0, -60, -20, 0];
  const ys = [24, 20, 28, 22, 26, 24, 22, 24];
  const rings = zs.map((z, i) => ({
    x: xs[i] + rng.range(-4, 4),
    y: ys[i] + rng.range(-2, 2),
    z,
    r: i === 0 ? COURSE.firstRingRadius : COURSE.ringRadius,
    hit: false,
  }));
  // Each ring faces the flight direction it was approached from.
  for (let i = 0; i < rings.length; i++) {
    const prev = i === 0 ? { x: 0, y: 20, z: 350 } : rings[i - 1];
    const dx = rings[i].x - prev.x;
    const dz = rings[i].z - prev.z;
    const len = Math.hypot(dx, dz) || 1;
    rings[i].nx = dx / len;
    rings[i].nz = dz / len;
  }
  return rings;
}

/** A fresh mission: lap 1, no ring hit yet, heading out. */
export function createMission(seed) {
  return {
    seed,
    lap: 1,
    rings: generateCourse(seed),
    next: 0,
    phase: 'rings',
    score: 0,
    message: '',
    messageUntil: 0,
  };
}

/**
 * Check whether the plane crossed the next ring's plane inside its radius
 * between the previous and current positions. Returns true on a hit.
 */
export function checkRing(mission, prev, pos) {
  if (mission.phase !== 'rings') return false;
  const ring = mission.rings[mission.next];
  if (!ring) return false;
  const before = (prev.x - ring.x) * ring.nx + (prev.z - ring.z) * ring.nz;
  const after = (pos.x - ring.x) * ring.nx + (pos.z - ring.z) * ring.nz;
  if (before >= 0 || after <= 0) return false;
  const dx = pos.x - ring.x;
  const dy = pos.y - ring.y;
  const dz = pos.z - ring.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist > ring.r) return false;
  ring.hit = true;
  mission.next += 1;
  mission.score += COURSE.ringScore;
  if (mission.next >= mission.rings.length) {
    mission.phase = 'return';
    mission.message = 'ALL RINGS! RETURN TO RUNWAY 27 AND LAND';
  } else {
    mission.message = `RING ${mission.next} OF ${mission.rings.length}! +${COURSE.ringScore}`;
  }
  return true;
}

/** Award the landing bonus and start the next lap's course. */
export function completeLap(mission) {
  mission.score += COURSE.landingBonus;
  mission.lap += 1;
  mission.rings = generateCourse(mission.seed + mission.lap * 7919);
  mission.next = 0;
  mission.phase = 'rings';
  mission.message = `LANDED! +${COURSE.landingBonus} — LAP ${mission.lap} COURSE IS UP`;
}

/** The ring the pilot is aiming for, or null when heading home. */
export function nextRing(mission) {
  if (mission.phase !== 'rings') return null;
  return mission.rings[mission.next] ?? null;
}
