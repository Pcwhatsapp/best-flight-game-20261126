// The aircraft: state and one fixed physics step.
// Heading is clockwise from north (+z). Pitch is nose up positive.
// Roll is right-wing-down positive. Speed is in world units per second.
import { PLANE } from './config.js';
import { clamp } from './random.js';
import { heightAt } from './terrain.js';

/** A fresh aircraft parked on the runway, ready to take off. */
export function createPlane() {
  return {
    x: PLANE.startPos.x,
    y: PLANE.startPos.y,
    z: PLANE.startPos.z,
    heading: PLANE.startHeading,
    pitch: 0,
    roll: 0,
    speed: 0,
    throttle: 0,
    fuel: PLANE.fuelStart,
    verticalSpeed: 0,
    grounded: true,
    airTime: 0,
  };
}

/**
 * One physics step. `input` is { pitch: -1..1, roll: -1..1, throttle: -1..1 }
 * where pitch +1 is nose up and roll +1 is right wing down.
 * Returns 'flying' | 'crashed' | 'landed'.
 *
 * The aircraft is either on its wheels (grounded) or in the air, and the
 * two states are kept strictly apart: on the ground the wheels hold the
 * plane at wheel height, so a parked aircraft can never sink into the
 * runway and "crash" at standstill; in the air the stall sink applies and
 * a touchdown is judged by the real descent rate.
 */
export function stepPlane(p, input, dt) {
  // Throttle: out of fuel means the engine is dead.
  if (p.fuel <= 0) p.throttle = 0;
  else p.throttle = clamp(p.throttle + input.throttle * 0.55 * dt, 0, 1);

  // Roll toward the stick, then ease back toward level when untouched.
  // On the ground the wings stay level — the plane taxis straight.
  const rollTarget = input.roll * PLANE.maxRoll;
  const rollRate = input.roll !== 0 ? PLANE.rollRate : PLANE.levelRate;
  p.roll += clamp(rollTarget - p.roll, -rollRate * dt, rollRate * dt);
  p.roll = clamp(p.roll, -PLANE.maxRoll, PLANE.maxRoll);
  if (p.grounded) p.roll = 0;

  // Pitch toward the stick, then ease back toward level.
  const pitchTarget = input.pitch * PLANE.maxPitch;
  const pitchRate = input.pitch !== 0 ? PLANE.pitchRate : PLANE.levelRate;
  p.pitch += clamp(pitchTarget - p.pitch, -pitchRate * dt, pitchRate * dt);
  p.pitch = clamp(p.pitch, -PLANE.maxPitch, PLANE.maxPitch);

  // Takeoff assists, for a pilot who only holds the throttle: at rotation
  // speed the wing lifts the nose by itself, and for the first seconds
  // after liftoff the plane holds a gentle climb until it is clear of the
  // valley floor. Neither ever fights a nose-down input, and the climb-out
  // never applies on approach (airTime is long by then).
  if (p.grounded && p.speed >= PLANE.rotateSpeed && input.pitch >= 0) {
    p.pitch = Math.max(p.pitch, 0.12);
  }
  if (!p.grounded && p.airTime < 5 && p.y < 25 && input.pitch >= 0) {
    p.pitch = Math.max(p.pitch, 0.2);
  }

  // A banked turn changes heading: a coordinated turn, tighter when slow.
  // The factor is tuned so a modest bank answers promptly — the pilot
  // must be able to aim at a ring 150 units ahead, not watch it slide by.
  const turnRate = Math.tan(p.roll) * 0.7 * (38 / Math.max(20, p.speed));
  p.heading += turnRate * dt;

  // Speed chases the throttle, helped by a dive and hurt by a climb.
  // With no fuel there is no thrust at all, so a dead stick rolls and
  // glides to a stop instead of cruising on at idle speed.
  const targetSpeed = p.fuel <= 0 ? 0 : PLANE.minSpeed + p.throttle * (PLANE.maxSpeed - PLANE.minSpeed);
  const climbCost = Math.sin(p.pitch) * 14;
  p.speed += clamp(targetSpeed - climbCost - p.speed, -26 * dt, 18 * dt);
  if (p.speed < 0) p.speed = 0;

  // Fuel burns with throttle; a dead stick still sips a little.
  p.fuel = Math.max(0, p.fuel - (0.16 + p.throttle * PLANE.fuelDrain) * dt);

  if (p.grounded) {
    // Steering on the ground: the plane taxis in the direction the pilot
    // points it, so an off-runway landing is recoverable — steer, pull
    // back, and lift off again instead of rolling in a straight line.
    p.heading += input.roll * 0.9 * dt * Math.min(1, p.speed / 15);
    // Rolling on its wheels: forward along the heading, held at wheel
    // height over whatever ground is underneath, gentle rolling drag.
    const cp = Math.cos(p.pitch);
    p.x += Math.sin(p.heading) * cp * p.speed * dt;
    p.z += Math.cos(p.heading) * cp * p.speed * dt;
    p.y = heightAt(p.x, p.z) + 1.1;
    p.verticalSpeed = 0;
    p.airTime = 0;
    p.speed = Math.max(0, p.speed - 8 * dt);
    // Liftoff: the wing has flying speed and the nose is up.
    if (p.speed >= PLANE.stallSpeed && p.pitch > 0) {
      p.grounded = false;
      return 'flying';
    }
    return 'landed';
  }

  // In the air: below stall speed the wing gives up and the plane sinks.
  p.airTime += dt;
  let sink = 0;
  if (p.speed < PLANE.stallSpeed) sink = (PLANE.stallSpeed - p.speed) * 0.55;
  p.verticalSpeed = p.speed * Math.sin(p.pitch) - sink;

  // Move along the nose direction.
  const cp = Math.cos(p.pitch);
  p.x += Math.sin(p.heading) * cp * p.speed * dt;
  p.y += p.verticalSpeed * dt;
  p.z += Math.cos(p.heading) * cp * p.speed * dt;

  // The ground decides the ending.
  const ground = heightAt(p.x, p.z);
  if (p.y <= ground + 1.1) {
    p.y = ground + 1.1;
    // A touchdown is gentle when the descent was controlled, the wings
    // were near level and the speed was low; anything else is a crash.
    const gentle = -p.verticalSpeed < 5.5 && Math.abs(p.roll) < 0.5 && p.speed < 46;
    if (gentle) {
      p.grounded = true;
      p.verticalSpeed = 0;
      p.speed = Math.max(0, p.speed - 8 * dt);
      return 'landed';
    }
    return 'crashed';
  }
  return 'flying';
}

/** Display helpers: feet, knots and a 0..359 heading. */
export function displayState(p) {
  return {
    altitudeFt: Math.max(0, Math.round(p.y * 32.8)),
    speedKt: Math.round(p.speed * 3.6),
    headingDeg: Math.round(((p.heading * 180) / Math.PI % 360) + 360) % 360,
    verticalFpm: Math.round(p.verticalSpeed * 196.8),
    fuel: Math.round(p.fuel),
    throttle: Math.round(p.throttle * 100),
  };
}
