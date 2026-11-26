// The screenshot scenes behind ?shot=cover|cockpit|river|landing.
// Each one stages a real moment of the game — the same state, physics and
// renderer as play — paints it twice and sets window.__shotReady so a
// screenshot tool knows the frame is ready.
import { createMission } from './course.js';

/** Place the aircraft and mission for a named scene. Returns the screen. */
export function stageShot(name, game) {
  const { plane, mission } = game;
  if (name === 'cockpit') {
    plane.x = 0;
    plane.y = 26;
    plane.z = 200;
    plane.heading = 0.02;
    plane.pitch = -0.03;
    plane.roll = 0.08;
    plane.speed = 42;
    plane.throttle = 0.68;
    plane.fuel = 78;
    mission.next = 0;
    mission.message = '';
    game.camera = 'cockpit';
    return 'play';
  }
  if (name === 'river') {
    // Low over the river itself (the channel runs near x=-35 here), banked
    // toward ring 3 ahead — far enough that the ring reads as a target,
    // not a wall.
    plane.x = -35;
    plane.y = 10;
    plane.z = 850;
    plane.heading = 0.15;
    plane.pitch = 0.02;
    plane.roll = 0.35;
    plane.speed = 48;
    plane.throttle = 0.74;
    plane.fuel = 61;
    mission.next = 2;
    mission.message = 'RING 3 OF 8! +100';
    mission.messageUntil = 999999;
    game.camera = 'chase';
    return 'play';
  }
  if (name === 'landing') {
    plane.x = 2;
    plane.y = 13;
    plane.z = 60;
    plane.heading = 0.01;
    plane.pitch = -0.06;
    plane.roll = 0.02;
    plane.speed = 31;
    plane.throttle = 0.34;
    plane.fuel = 44;
    mission.phase = 'return';
    mission.message = 'FINAL — LAND ON RUNWAY 27';
    mission.messageUntil = 999999;
    game.camera = 'chase';
    return 'play';
  }
  // 'cover' and anything else: the opening shot, runway below and ahead,
  // first ring in the distance, valley beyond.
  plane.x = 0;
  plane.y = 26;
  plane.z = 200;
  plane.heading = 0.02;
  plane.pitch = -0.03;
  plane.roll = 0.08;
  plane.speed = 42;
  plane.throttle = 0.68;
  plane.fuel = 78;
  mission.next = 0;
  mission.message = '';
  game.camera = 'chase';
  return 'play';
}

/** A fresh mission for a screenshot scene (same course every time). */
export function shotMission() {
  return createMission(7);
}
