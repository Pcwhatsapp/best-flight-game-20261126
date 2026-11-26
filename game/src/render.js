// The 3D view: a pinhole camera behind the aircraft, a painted sky with sun
// and mountain ridges, drifting clouds, and the valley floor drawn as a
// projected heightmap grid, far cells first.
import { COLORS, VIEW, WORLD } from './config.js';
import { clamp, createRandom, hash2, lerp } from './random.js';
import { groundColor, heightAt, riverX } from './terrain.js';

const FOCAL = (VIEW.height / 2) / Math.tan((VIEW.fovDeg * Math.PI) / 360);

/** A camera: position, and right/up/forward unit vectors. */
function makeCamera(plane, mode) {
  const cp = Math.cos(plane.pitch);
  const fx = Math.sin(plane.heading) * cp;
  const fy = Math.sin(plane.pitch);
  const fz = Math.cos(plane.heading) * cp;
  if (mode === 'cockpit') {
    // At the nose, looking where the nose points, rolling with the plane.
    const px = plane.x + fx * VIEW.cockpitForward;
    const py = plane.y + fy * VIEW.cockpitForward;
    const pz = plane.z + fz * VIEW.cockpitForward;
    return basisFrom(px, py, pz, fx, fy, fz, plane.roll);
  }
  // Chase: behind and above the aircraft, looking past it.
  const bx = plane.x - fx * VIEW.chaseBack;
  const by = plane.y - fy * VIEW.chaseBack + VIEW.chaseUp;
  const bz = plane.z - fz * VIEW.chaseBack;
  const tx = plane.x + fx * 42;
  const ty = plane.y + fy * 42 + 1.5;
  const tz = plane.z + fz * 42;
  let dx = tx - bx;
  let dy = ty - by;
  let dz = tz - bz;
  const len = Math.hypot(dx, dy, dz) || 1;
  dx /= len;
  dy /= len;
  dz /= len;
  return basisFrom(bx, by, bz, dx, dy, dz, plane.roll * 0.55);
}

function basisFrom(px, py, pz, fx, fy, fz, roll) {
  // Right = forward x world-up, then up = forward x right (a right-handed
  // camera: screen x to the right, screen y up).
  let rx = fz;
  let ry = 0;
  let rz = -fx;
  const rl = Math.hypot(rx, ry, rz) || 1;
  rx /= rl;
  ry /= rl;
  rz /= rl;
  let ux = fy * rz - fz * ry;
  let uy = fz * rx - fx * rz;
  let uz = fx * ry - fy * rx;
  const cos = Math.cos(roll);
  const sin = Math.sin(roll);
  const nrx = rx * cos - ux * sin;
  const nry = ry * cos - uy * sin;
  const nrz = rz * cos - uz * sin;
  const nux = rx * sin + ux * cos;
  const nuy = ry * sin + uy * cos;
  const nuz = rz * sin + uz * cos;
  return { px, py, pz, fx, fy, fz, rx: nrx, ry: nry, rz: nrz, ux: nux, uy: nuy, uz: nuz };
}

/** Project a world point to screen space; null when behind the camera. */
function project(cam, x, y, z) {
  const dx = x - cam.px;
  const dy = y - cam.py;
  const dz = z - cam.pz;
  const cx = dx * cam.rx + dy * cam.ry + dz * cam.rz;
  const cy = dx * cam.ux + dy * cam.uy + dz * cam.uz;
  const cz = dx * cam.fx + dy * cam.fy + dz * cam.fz;
  if (cz < 0.6) return null;
  return {
    x: VIEW.width / 2 + (cx / cz) * FOCAL,
    y: VIEW.height / 2 - (cy / cz) * FOCAL,
    depth: cz,
    scale: FOCAL / cz,
  };
}

/** Clouds: fixed billboards scattered over the valley, seeded once. */
function makeClouds() {
  const rng = createRandom(20261126);
  const clouds = [];
  for (let i = 0; i < 42; i++) {
    clouds.push({
      x: rng.range(-260, 260),
      y: rng.range(58, 95),
      z: rng.range(0, 2000),
      s: rng.range(14, 30),
      puffs: [0, 1, 2].map(() => ({ dx: rng.range(-1, 1), dy: rng.range(-0.25, 0.25), r: rng.range(0.45, 0.8) })),
    });
  }
  return clouds;
}

const CLOUDS = makeClouds();

/** A distant ridge silhouette, drawn as a filled path across the screen. */
function drawRidge(ctx, heading, offset, baseY, amp, color, seed) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, VIEW.height);
  for (let sx = 0; sx <= VIEW.width; sx += 16) {
    const a = heading + (sx / VIEW.width - 0.5) * 1.9 + offset;
    const n = Math.sin(a * 2.1 + seed) * 0.5 + Math.sin(a * 5.3 + seed * 2.7) * 0.3 + Math.sin(a * 11.7 + seed * 1.3) * 0.2;
    const y = baseY - (0.35 + 0.65 * Math.abs(n)) * amp;
    ctx.lineTo(sx, y);
  }
  ctx.lineTo(VIEW.width, VIEW.height);
  ctx.closePath();
  ctx.fill();
}

function drawSky(ctx, plane, cam, time) {
  const horizonY = VIEW.height / 2 + (cam.fy / Math.max(0.15, Math.abs(cam.fz))) * FOCAL * 0.4;
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  grad.addColorStop(0, COLORS.skyTop);
  grad.addColorStop(0.55, COLORS.skyMid);
  grad.addColorStop(0.75, COLORS.skyHorizon);
  grad.addColorStop(1, '#9db8a4');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Sun: fixed in the world to the north-west, high in the sky.
  const sun = project(cam, -420, 320, 900);
  if (sun) {
    const glow = ctx.createRadialGradient(sun.x, sun.y, 4, sun.x, sun.y, 120);
    glow.addColorStop(0, COLORS.sunGlow);
    glow.addColorStop(1, 'rgba(255,236,170,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sun.x - 130, sun.y - 130, 260, 260);
    ctx.fillStyle = COLORS.sunCore;
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, 26, 0, Math.PI * 2);
    ctx.fill();
  }
  drawRidge(ctx, plane.heading, 0.4, horizonY + 26, 130, COLORS.mountainFar, 3.1);
  drawRidge(ctx, plane.heading, 0.9, horizonY + 40, 84, COLORS.mountainNear, 7.7);
}

function drawClouds(ctx, cam) {
  for (const c of CLOUDS) {
    const p = project(cam, c.x, c.y, c.z);
    if (!p || p.depth > 900) continue;
    const s = c.s * p.scale;
    if (s < 4) continue;
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    for (const puff of c.puffs) {
      ctx.beginPath();
      ctx.ellipse(p.x + puff.dx * s, p.y + puff.dy * s, puff.r * s, puff.r * s * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawTerrain(ctx, cam, plane, time) {
  const step = WORLD.gridStep;
  const zStart = Math.floor((cam.pz + WORLD.gridAhead) / step) * step;
  const zEnd = cam.pz - WORLD.gridBehind;
  const x0 = Math.floor((cam.px - WORLD.gridSide) / step) * step;
  const x1 = cam.px + WORLD.gridSide;
  // Far cells first, so near ground paints over far ground.
  for (let gz = zStart; gz > zEnd; gz -= step) {
    for (let gx = x0; gx < x1; gx += step) {
      const h00 = heightAt(gx, gz);
      const h10 = heightAt(gx + step, gz);
      const h01 = heightAt(gx, gz + step);
      const h11 = heightAt(gx + step, gz + step);
      const p00 = project(cam, gx, h00, gz);
      const p10 = project(cam, gx + step, h10, gz);
      const p01 = project(cam, gx, h01, gz + step);
      const p11 = project(cam, gx + step, h11, gz + step);
      if (!p00 || !p10 || !p01 || !p11) continue;
      if (Math.max(p00.x, p10.x, p01.x, p11.x) < -40 || Math.min(p00.x, p10.x, p01.x, p11.x) > VIEW.width + 40) continue;
      if (Math.max(p00.y, p10.y, p01.y, p11.y) < -40 || Math.min(p00.y, p10.y, p01.y, p11.y) > VIEW.height + 40) continue;
      const hm = (h00 + h10 + h01 + h11) / 4;
      const cx = gx + step / 2;
      const cz = gz + step / 2;
      const depth = Math.hypot(cx - cam.px, cz - cam.pz);
      let color = groundColor(cx, cz, hm, time);
      if (depth > WORLD.fogNear) {
        const f = clamp((depth - WORLD.fogNear) / (WORLD.fogFar - WORLD.fogNear), 0, 0.72);
        color = mixFog(color, f);
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(p00.x, p00.y);
      ctx.lineTo(p10.x, p10.y);
      ctx.lineTo(p11.x, p11.y);
      ctx.lineTo(p01.x, p01.y);
      ctx.closePath();
      ctx.fill();
      // A few trees on flat meadow, near the camera only.
      if (depth < 130 && hm > 1 && hm < 12 && hash2(gx, gz) < 0.16) {
        drawTree(ctx, cam, cx, hm, cz, depth);
      }
    }
  }
}

function mixFog(rgb, f) {
  const m = rgb.match(/\d+/g);
  if (!m) return rgb;
  const r = Math.round(lerp(+m[0], 207, f));
  const g = Math.round(lerp(+m[1], 228, f));
  const b = Math.round(lerp(+m[2], 242, f));
  return `rgb(${r},${g},${b})`;
}

function drawTree(ctx, cam, x, h, z, depth) {
  const base = project(cam, x, h, z);
  const top = project(cam, x, h + 7, z);
  if (!base || !top) return;
  const w = Math.max(2, 3.2 * base.scale);
  ctx.fillStyle = '#245c2c';
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(base.x - w, base.y);
  ctx.lineTo(base.x + w, base.y);
  ctx.closePath();
  ctx.fill();
}

function drawRunway(ctx, cam) {
  const r = WORLD.runway;
  const seg = 20;
  for (let z = r.z0; z < r.z1; z += seg) {
    const a = project(cam, r.x0, 0.15, z);
    const b = project(cam, r.x1, 0.15, z);
    const c = project(cam, r.x1, 0.15, z + seg);
    const d = project(cam, r.x0, 0.15, z + seg);
    if (!a || !b || !c || !d) continue;
    ctx.fillStyle = COLORS.runway;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
    // Edge lines, so the strip reads against the grass.
    for (const [ex0, ex1] of [[r.x0 + 0.1, r.x0 + 0.9], [r.x1 - 0.9, r.x1 - 0.1]]) {
      const e1 = project(cam, ex0, 0.3, z);
      const e2 = project(cam, ex1, 0.3, z);
      const e3 = project(cam, ex1, 0.3, z + seg);
      const e4 = project(cam, ex0, 0.3, z + seg);
      if (e1 && e2 && e3 && e4) {
        ctx.fillStyle = COLORS.runwayLine;
        ctx.beginPath();
        ctx.moveTo(e1.x, e1.y);
        ctx.lineTo(e2.x, e2.y);
        ctx.lineTo(e3.x, e3.y);
        ctx.lineTo(e4.x, e4.y);
        ctx.closePath();
        ctx.fill();
      }
    }
    // Centreline dash every other segment.
    if (Math.floor(z / seg) % 2 === 0) {
      const l1 = project(cam, -0.7, 0.3, z + 3);
      const l2 = project(cam, 0.7, 0.3, z + 3);
      const l3 = project(cam, 0.7, 0.3, z + 13);
      const l4 = project(cam, -0.7, 0.3, z + 13);
      if (l1 && l2 && l3 && l4) {
        ctx.fillStyle = COLORS.runwayLine;
        ctx.beginPath();
        ctx.moveTo(l1.x, l1.y);
        ctx.lineTo(l2.x, l2.y);
        ctx.lineTo(l3.x, l3.y);
        ctx.lineTo(l4.x, l4.y);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  // Threshold bars at both ends.
  for (const z of [r.z0 + 4, r.z1 - 8]) {
    for (let x = -9; x <= 9; x += 3) {
      const a = project(cam, x - 1, 0.3, z);
      const b = project(cam, x + 1, 0.3, z);
      const c = project(cam, x + 1, 0.3, z + 6);
      const d = project(cam, x - 1, 0.3, z + 6);
      if (!a || !b || !c || !d) continue;
      ctx.fillStyle = COLORS.runwayLine;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.closePath();
      ctx.fill();
    }
  }
  drawWindsock(ctx, cam);
  drawHangar(ctx, cam);
}

function drawWindsock(ctx, cam) {
  const px = -17;
  const pz = 210;
  const base = project(cam, px, 0, pz);
  const top = project(cam, px, 9, pz);
  if (!base || !top) return;
  ctx.strokeStyle = '#d8d8d8';
  ctx.lineWidth = Math.max(1, 2.4 * base.scale);
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.lineTo(top.x, top.y);
  ctx.stroke();
  const tip = project(cam, px + 5, 8.2, pz);
  if (tip) {
    ctx.fillStyle = '#ff7a1a';
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(top.x, top.y + 3.4 * base.scale);
    ctx.closePath();
    ctx.fill();
  }
}

function drawHangar(ctx, cam) {
  // Inside the flattened runway apron, so it sits on the ground instead
  // of sinking into a hillside.
  const corners = [
    [-24, 0, 200], [-16, 0, 200], [-16, 6, 200], [-24, 6, 200],
    [-24, 0, 212], [-16, 0, 212], [-16, 6, 212], [-24, 6, 212],
  ].map(([x, y, z]) => project(cam, x, y, z));
  if (corners.some((p) => !p)) return;
  const quad = (i0, i1, i2, i3, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(corners[i0].x, corners[i0].y);
    ctx.lineTo(corners[i1].x, corners[i1].y);
    ctx.lineTo(corners[i2].x, corners[i2].y);
    ctx.lineTo(corners[i3].x, corners[i3].y);
    ctx.closePath();
    ctx.fill();
  };
  quad(4, 5, 6, 7, '#8a94a0');
  quad(1, 5, 6, 2, '#6d7683');
  quad(0, 1, 2, 3, '#7c8694');
}

function drawRings(ctx, cam, mission, time) {
  for (let i = 0; i < mission.rings.length; i++) {
    const ring = mission.rings[i];
    if (ring.hit) continue;
    const isNext = mission.phase === 'rings' && i === mission.next;
    const p = project(cam, ring.x, ring.y, ring.z);
    if (!p || p.depth > 950) continue;
    const radius = Math.max(2, ring.r * p.scale);
    const pulse = isNext ? 0.75 + 0.25 * Math.sin(time * 5) : 0.6;
    const color = isNext ? COLORS.ringNext : COLORS.ringOther;
    ctx.lineWidth = Math.max(2, radius * 0.16);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.28 * pulse;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.95 * pulse;
    ctx.lineWidth = Math.max(1.5, radius * 0.045);
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.1 * pulse;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/** Paint the whole 3D scene. Returns the camera, for the HUD's ring arrow. */
export function drawWorld(ctx, plane, mission, mode, time) {
  const cam = makeCamera(plane, mode);
  drawSky(ctx, plane, cam, time);
  drawClouds(ctx, cam);
  drawTerrain(ctx, cam, plane, time);
  drawRunway(ctx, cam);
  drawRings(ctx, cam, mission, time);
  return cam;
}

export { project };
