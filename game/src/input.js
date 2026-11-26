// Keyboard and mouse: held keys steer, one-shot presses act.
// Mouse position steers too — the stick follows the pointer — and a click
// on the canvas starts the game. Keyboard always wins over the mouse.
import { VIEW } from './config.js';
import { clamp } from './random.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_CAMERA = 4;
export const ACTION_RESTART = 8;
export const ACTION_MUTE = 16;

export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: 0, y: 0, active: false, movedAt: 0 };
  let pressed = 0;

  const keyOf = (e) => e.key.toLowerCase();
  const onDown = (e) => {
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(keyOf(e))) e.preventDefault();
    if (e.repeat) return;
    keys.add(keyOf(e));
    if (keyOf(e) === 'enter' || keyOf(e) === ' ') pressed |= ACTION_CONFIRM;
    if (keyOf(e) === 'p' || keyOf(e) === 'escape') pressed |= ACTION_PAUSE;
    if (keyOf(e) === 'c') pressed |= ACTION_CAMERA;
    if (keyOf(e) === 'r') pressed |= ACTION_RESTART;
    if (keyOf(e) === 'm') pressed |= ACTION_MUTE;
  };
  const onUp = (e) => keys.delete(keyOf(e));
  const onMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * VIEW.width;
    mouse.y = ((e.clientY - rect.top) / rect.height) * VIEW.height;
    mouse.active = true;
    mouse.movedAt = performance.now();
  };
  const onClick = () => {
    pressed |= ACTION_CONFIRM;
  };
  const onBlur = () => keys.clear();

  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('click', onClick);

  const held = (...names) => names.some((n) => keys.has(n));

  return {
    /** The steering for this frame: pitch and roll -1..1, throttle -1..1. */
    read() {
      let pitch = 0;
      let roll = 0;
      if (held('arrowup', 'w')) pitch += 1;
      if (held('arrowdown', 's')) pitch -= 1;
      if (held('arrowleft', 'a')) roll -= 1;
      if (held('arrowright', 'd')) roll += 1;
      // Mouse steering: the pointer's distance from centre is the stick.
      if (pitch === 0 && roll === 0 && mouse.active && performance.now() - mouse.movedAt < 2500) {
        roll = clamp((mouse.x - VIEW.width / 2) / 260, -1, 1);
        pitch = clamp((VIEW.height / 2 - mouse.y) / 260, -1, 1);
      }
      let throttle = 0;
      if (held('shift')) throttle += 1;
      if (held('control', 'meta')) throttle -= 1;
      return { pitch, roll, throttle };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takePressed() {
      const out = pressed;
      pressed = 0;
      return out;
    },
  };
}
