// The heads-up display: altitude, speed and heading on lit instruments,
// a compass tape, fuel and throttle, the ring count, and the messages the
// pilot reads. Everything is drawn code; nothing is an image.
import { COLORS, VIEW } from './config.js';
import { displayState } from './flight.js';
import { nextRing } from './course.js';

const FONT = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = COLORS.hudPanel;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(140, 190, 230, 0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function compassLabel(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return dirs[idx];
}

/** The compass tape across the top, centred on the current heading. */
function drawCompass(ctx, headingDeg) {
  const cx = VIEW.width / 2;
  const y = 30;
  panel(ctx, cx - 210, 10, 420, 42);
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - 210, 10, 420, 42);
  ctx.clip();
  ctx.fillStyle = COLORS.hudText;
  ctx.font = `700 15px ${FONT}`;
  ctx.textAlign = 'center';
  // Ticks anchored to absolute bearings, so N/NE/E... always land on a
  // tick no matter the heading (a grid anchored to the heading itself
  // would almost never hit a multiple of 45).
  const start = Math.floor((headingDeg - 120) / 15) * 15;
  for (let b = start; b <= headingDeg + 120; b += 15) {
    const deg = ((b % 360) + 360) % 360;
    const rel = ((b - headingDeg + 540) % 360) - 180;
    const x = cx + rel * 1.5;
    const major = deg % 45 === 0;
    ctx.strokeStyle = major ? '#dff3ff' : 'rgba(223,243,255,0.45)';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, y + 8);
    ctx.lineTo(x, y + (major ? 20 : 14));
    ctx.stroke();
    if (major) {
      const label = deg % 90 === 0 ? compassLabel(deg) : String(deg).padStart(3, '0');
      ctx.fillText(label, x, y - 2);
    }
  }
  ctx.restore();
  // The heading caret.
  ctx.fillStyle = COLORS.hudAccent;
  ctx.beginPath();
  ctx.moveTo(cx, 12);
  ctx.lineTo(cx - 6, 22);
  ctx.lineTo(cx + 6, 22);
  ctx.closePath();
  ctx.fill();
}

/** Altitude, speed, vertical speed and heading, top left. */
function drawFlightData(ctx, d) {
  panel(ctx, 16, 10, 196, 118);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8fb8d8';
  ctx.font = `600 12px ${FONT}`;
  ctx.fillText('ALTITUDE', 28, 32);
  ctx.fillText('AIRSPEED', 28, 66);
  ctx.fillText('VERT SPD', 28, 100);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = `700 24px ${FONT}`;
  ctx.fillText(`${d.altitudeFt.toLocaleString('en-US')} ft`, 28, 54);
  ctx.fillText(`${d.speedKt} kt`, 28, 88);
  ctx.font = `700 18px ${FONT}`;
  ctx.fillText(`${d.verticalFpm >= 0 ? '+' : ''}${d.verticalFpm} fpm`, 28, 118);
}

/** Score, rings, fuel and throttle, top right. */
function drawMission(ctx, mission, d) {
  panel(ctx, VIEW.width - 216, 10, 200, 118);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8fb8d8';
  ctx.font = `600 12px ${FONT}`;
  ctx.fillText('SCORE', VIEW.width - 204, 32);
  ctx.fillText(mission.phase === 'rings' ? `RINGS  ${mission.next}/${mission.rings.length}` : 'RETURN TO BASE', VIEW.width - 204, 66);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = `700 24px ${FONT}`;
  ctx.fillText(String(mission.score), VIEW.width - 204, 54);
  // Fuel bar.
  ctx.fillStyle = '#0b1118';
  ctx.fillRect(VIEW.width - 204, 76, 176, 12);
  ctx.fillStyle = d.fuel < 25 ? COLORS.hudWarn : '#37c8e8';
  ctx.fillRect(VIEW.width - 204, 76, 176 * (d.fuel / 100), 12);
  ctx.fillStyle = '#8fb8d8';
  ctx.font = `600 11px ${FONT}`;
  ctx.fillText(`FUEL ${d.fuel}%`, VIEW.width - 204, 100);
  // Throttle bar.
  ctx.fillStyle = '#0b1118';
  ctx.fillRect(VIEW.width - 204, 106, 176, 8);
  ctx.fillStyle = COLORS.hudAccent;
  ctx.fillRect(VIEW.width - 204, 106, 176 * (d.throttle / 100), 8);
}

/** The artificial horizon, bottom left. */
function drawAttitude(ctx, plane) {
  const x = 78;
  const y = VIEW.height - 78;
  const r = 52;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = COLORS.hudPanel;
  ctx.beginPath();
  ctx.arc(0, 0, r + 8, 0, Math.PI * 2);
  ctx.fill();
  // The rolling horizon, clipped to the disc.
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.rotate(-plane.roll);
  ctx.translate(0, plane.pitch * 90);
  ctx.fillStyle = '#3f8fd6';
  ctx.fillRect(-r - 10, -r - 10, (r + 10) * 2, r + 10);
  ctx.fillStyle = '#8a6b45';
  ctx.fillRect(-r - 10, 0, (r + 10) * 2, r + 10);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-r - 10, -2, (r + 10) * 2, 4);
  ctx.restore();
  // Ring and aircraft marker, still in the gauge's own frame.
  ctx.strokeStyle = 'rgba(140,190,230,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = COLORS.hudAccent;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(-18, 6);
  ctx.lineTo(18, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#8fb8d8';
  ctx.font = `600 11px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('ATTITUDE', x, y + r + 18);
}

/** A centre reticle and an arrow toward the next ring when it is off view. */
function drawReticle(ctx, cam, plane, mission) {
  const cx = VIEW.width / 2;
  const cy = VIEW.height * 0.44;
  ctx.strokeStyle = 'rgba(223,243,255,0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 16, 0, Math.PI * 2);
  ctx.moveTo(cx - 24, cy);
  ctx.lineTo(cx - 12, cy);
  ctx.moveTo(cx + 12, cy);
  ctx.lineTo(cx + 24, cy);
  ctx.moveTo(cx, cy - 24);
  ctx.lineTo(cx, cy - 12);
  ctx.moveTo(cx, cy + 12);
  ctx.lineTo(cx, cy + 24);
  ctx.stroke();
  const ring = nextRing(mission);
  if (!ring) return;
  const dx = ring.x - plane.x;
  const dy = ring.y - plane.y;
  const dz = ring.z - plane.z;
  const rx = dx * cam.rx + dy * cam.ry + dz * cam.rz;
  const ry = dx * cam.ux + dy * cam.uy + dz * cam.uz;
  const rz = dx * cam.fx + dy * cam.fy + dz * cam.fz;
  if (rz > 0 && Math.abs(rx) < 320 && Math.abs(ry) < 200) return;
  // Off view: an arrow at the screen edge, pointing at the ring.
  const ang = Math.atan2(-ry, rx);
  const ex = cx + Math.cos(ang) * 300;
  const ey = cy - Math.sin(ang) * 190;
  const clampedX = Math.max(60, Math.min(VIEW.width - 60, ex));
  const clampedY = Math.max(120, Math.min(VIEW.height - 120, ey));
  ctx.save();
  ctx.translate(clampedX, clampedY);
  ctx.rotate(-ang);
  ctx.fillStyle = COLORS.ringNext;
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-10, -12);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-10, 12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = COLORS.ringNext;
  ctx.font = `700 13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(`RING ${mission.next + 1}`, clampedX, clampedY + 30);
}

/** Flash messages and warnings, centre screen. */
function drawMessages(ctx, mission, plane, time) {
  const d = displayState(plane);
  ctx.textAlign = 'center';
  if (mission.message && time < mission.messageUntil) {
    ctx.fillStyle = COLORS.hudAccent;
    ctx.font = `700 26px ${FONT}`;
    ctx.fillText(mission.message, VIEW.width / 2, 150);
  }
  if (d.fuel < 25 && d.fuel > 0) {
    const blink = Math.sin(time * 8) > 0;
    if (blink) {
      ctx.fillStyle = COLORS.hudWarn;
      ctx.font = `700 22px ${FONT}`;
      ctx.fillText('LOW FUEL — LAND ON THE RUNWAY', VIEW.width / 2, 186);
    }
  }
  if (plane.speed < 24 && plane.y > 4) {
    ctx.fillStyle = COLORS.hudWarn;
    ctx.font = `700 20px ${FONT}`;
    ctx.fillText('STALL — NOSE DOWN, THROTTLE UP', VIEW.width / 2, 186);
  }
}

/** The full HUD for a flying screen. */
export function drawHUD(ctx, cam, plane, mission, time) {
  const d = displayState(plane);
  drawCompass(ctx, d.headingDeg);
  drawFlightData(ctx, d);
  drawMission(ctx, mission, d);
  drawAttitude(ctx, plane);
  drawReticle(ctx, cam, plane, mission);
  drawMessages(ctx, mission, plane, time);
}

/** A centred overlay panel (title, pause, crash, landing, complete). */
export function drawOverlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(6, 14, 24, 0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const w = 640;
  const h = 120 + lines.length * 34;
  const x = (VIEW.width - w) / 2;
  const y = (VIEW.height - h) / 2;
  ctx.fillStyle = 'rgba(8, 18, 30, 0.88)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = accent || COLORS.hudAccent;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = accent || COLORS.hudAccent;
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText(title, VIEW.width / 2, y + 58);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = `400 17px ${FONT}`;
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW.width / 2, y + 100 + i * 34);
  });
}
