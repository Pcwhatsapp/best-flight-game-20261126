// Skycrest — Alpine Ring Run: boot and the one loop.
// Input is read every frame, the world advances in fixed 1/60 s steps, and
// the renderer paints what is there. Screens: title, play, paused, crashed,
// landed, complete. ?shot=cover|cockpit|river|landing (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { VIEW } from './config.js';
import { createMission, checkRing, completeLap } from './course.js';
import { createPlane, stepPlane } from './flight.js';
import { isOnRunway } from './terrain.js';
import { createInput, ACTION_CAMERA, ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART } from './input.js';
import { createAudio } from './audio.js';
import { drawWorld } from './render.js';
import { drawPlane, drawCockpitFrame } from './plane.js';
import { drawHUD, drawOverlay } from './hud.js';
import { stageShot, shotMission } from './shots.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;
const BEST_KEY = 'skycrest-best-score';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const ctx = canvas.getContext('2d');

function fitCanvas() {
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;
}
fitCanvas();

const game = {
  plane: createPlane(),
  mission: createMission(seed),
  camera: 'chase',
  screen: 'title',
  time: 0,
  best: readBest(),
  audio: createAudio(),
  paused: false,
};

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: the best score then lasts this visit only.
  }
}

function setStatus(text) {
  status.textContent = text;
}

/** Start a fresh flight from the runway. */
function startFlight() {
  game.plane = createPlane();
  game.mission = createMission(seed);
  game.screen = 'play';
  game.audio.unlock();
  setStatus('Flying. Fly through the rings, then land on the runway.');
}

/** One fixed physics step while playing. */
function stepWorld(input) {
  const plane = game.plane;
  const prev = { x: plane.x, y: plane.y, z: plane.z };
  const outcome = stepPlane(plane, input, STEP);
  if (outcome === 'crashed') {
    game.screen = 'crashed';
    game.audio.crash();
    setStatus(`Crashed. Score ${game.mission.score}. Press R to fly again.`);
    return;
  }
  if (outcome === 'landed') {
    if (game.mission.phase === 'return') {
      if (isOnRunway(plane.x, plane.z)) {
        completeLap(game.mission);
        game.mission.messageUntil = game.time + 4;
        game.audio.land();
        game.plane.fuel = 100;
        game.plane.throttle = 0;
        game.plane.speed = 0;
        game.screen = 'landed';
        setStatus(`Landed! Score ${game.mission.score}. Press Enter for the next lap.`);
        return;
      }
      // A soft touchdown off the strip is safe, but the lap is not done:
      // refuel, take off again and put her on the runway.
      game.plane.fuel = 100;
      game.mission.message = 'OFF THE RUNWAY — TAKE OFF AND TRY AGAIN';
      game.mission.messageUntil = game.time + 3;
      return;
    }
    game.plane.fuel = 100;
    return;
  }
  if (checkRing(game.mission, prev, plane)) {
    game.audio.ring();
    game.mission.messageUntil = game.time + 2.5;
  }
}

function render() {
  const plane = game.plane;
  const mission = game.mission;
  const cam = drawWorld(ctx, plane, mission, game.camera, game.time);
  if (game.camera === 'chase') drawPlane(ctx, plane, game.time);
  else drawCockpitFrame(ctx, plane, {
    fuel: Math.round(plane.fuel),
    throttle: Math.round(plane.throttle * 100),
  });
  if (game.screen === 'play' || game.screen === 'paused') {
    drawHUD(ctx, cam, plane, mission, game.time);
  }
  if (game.screen === 'title') {
    drawOverlay(
      ctx,
      'SKYCREST',
      [
        'Alpine Ring Run — fly the rings, then land on runway 27.',
        `Best score: ${game.best}`,
        'Arrows / WASD — pitch and roll   Shift / Ctrl — throttle',
        'Mouse — steer   C — camera   P — pause   M — sound',
        'Press Enter or click to fly',
      ],
      '#ffc93c',
    );
  } else if (game.screen === 'paused') {
    drawOverlay(ctx, 'PAUSED', ['Press P to keep flying', 'R — restart the flight'], '#37c8e8');
  } else if (game.screen === 'crashed') {
    drawOverlay(
      ctx,
      'CRASHED',
      [`Score: ${game.mission.score}   Best: ${Math.max(game.best, game.mission.score)}`, 'Press R to fly again'],
      '#ff5a3c',
    );
  } else if (game.screen === 'landed') {
    drawOverlay(
      ctx,
      'TOUCHDOWN',
      [
        game.mission.message,
        `Score: ${game.mission.score}`,
        'Press Enter to fly the next lap — or R to start over',
      ],
      '#37c8e8',
    );
  }
  if (game.mission.score > game.best) {
    game.best = game.mission.score;
    saveBest(game.best);
  }
}

function runShot(name) {
  game.mission = shotMission();
  game.screen = stageShot(name, game);
  let painted = 0;
  function paint() {
    render();
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    game.time += elapsed;
    const pressed = input.takePressed();
    if (pressed & ACTION_MUTE) game.audio.toggleMute();
    if (pressed & ACTION_CAMERA) game.camera = game.camera === 'chase' ? 'cockpit' : 'chase';
    if (pressed & ACTION_RESTART) {
      startFlight();
    }
    if (game.screen === 'title' && pressed & ACTION_CONFIRM) {
      startFlight();
    } else if (game.screen === 'landed' && pressed & ACTION_CONFIRM) {
      // Next lap: a fresh aircraft on the runway, the new course already up.
      game.plane = createPlane();
      game.screen = 'play';
    } else if (pressed & ACTION_PAUSE) {
      if (game.screen === 'play') game.screen = 'paused';
      else if (game.screen === 'paused') game.screen = 'play';
    }
    if (game.screen === 'play') {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        stepWorld(input.read());
        accumulator -= STEP;
        if (game.screen !== 'play') break;
      }
      game.audio.update(game.plane);
    }
    render();
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
