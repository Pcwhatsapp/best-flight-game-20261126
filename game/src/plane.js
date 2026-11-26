// The aircraft itself: a vector-drawn single-prop tourer, seen from behind
// in chase view (banking with the roll), and the cockpit frame for first
// person view. All art is drawn code — no image files.
import { COLORS, VIEW } from './config.js';

/** Draw the aircraft in chase view, centred low on the screen. */
export function drawPlane(ctx, plane, time) {
  const cx = VIEW.width / 2;
  const cy = VIEW.height * 0.66;
  const span = 150;
  const len = 118;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(plane.roll);
  ctx.translate(0, -plane.pitch * 46);
  // Soft shadow under the aircraft, on nothing in particular: it grounds it.
  ctx.fillStyle = 'rgba(10, 25, 40, 0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 44, 92, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  // Main wings, swept back, red tips.
  ctx.fillStyle = COLORS.planeBody;
  ctx.strokeStyle = '#8b98a5';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-span, 26);
  ctx.lineTo(-26, 2);
  ctx.lineTo(-22, -8);
  ctx.lineTo(-span + 14, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(span, 26);
  ctx.lineTo(26, 2);
  ctx.lineTo(22, -8);
  ctx.lineTo(span - 14, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.planeStripe;
  ctx.fillRect(-span, 18, 16, 10);
  ctx.fillRect(span - 16, 18, 16, 10);
  // Tailplane and fin.
  ctx.fillStyle = COLORS.planeBody;
  ctx.beginPath();
  ctx.moveTo(-34, len * 0.32);
  ctx.lineTo(-8, len * 0.42);
  ctx.lineTo(-8, len * 0.52);
  ctx.lineTo(-34, len * 0.52);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(34, len * 0.32);
  ctx.lineTo(8, len * 0.42);
  ctx.lineTo(8, len * 0.52);
  ctx.lineTo(34, len * 0.52);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-4, len * 0.3);
  ctx.lineTo(4, len * 0.3);
  ctx.lineTo(9, len * 0.52);
  ctx.lineTo(-9, len * 0.52);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Fuselage: wide at the tail, tapering to the nose far ahead.
  const body = ctx.createLinearGradient(-14, 0, 14, 0);
  body.addColorStop(0, COLORS.planeBelly);
  body.addColorStop(0.5, COLORS.planeBody);
  body.addColorStop(1, COLORS.planeBelly);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-13, len * 0.55);
  ctx.quadraticCurveTo(-17, 0, -6, -len * 0.48);
  ctx.quadraticCurveTo(0, -len * 0.56, 6, -len * 0.48);
  ctx.quadraticCurveTo(17, 0, 13, len * 0.55);
  ctx.quadraticCurveTo(0, len * 0.62, -13, len * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Red cheatline along the fuselage.
  ctx.strokeStyle = COLORS.planeStripe;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-12, len * 0.3);
  ctx.quadraticCurveTo(-13, -len * 0.1, -5, -len * 0.42);
  ctx.moveTo(12, len * 0.3);
  ctx.quadraticCurveTo(13, -len * 0.1, 5, -len * 0.42);
  ctx.stroke();
  // Canopy: light blue, lit by the sun.
  ctx.fillStyle = COLORS.planeCanopy;
  ctx.beginPath();
  ctx.ellipse(0, -len * 0.18, 8.5, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(-2.5, -len * 0.24, 2.6, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Spinning prop disc, faint, ahead of the nose.
  ctx.strokeStyle = 'rgba(200, 214, 224, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -len * 0.52, 26, 5, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Navigation lights: red port, green starboard, blinking white tail.
  const blink = Math.sin(time * 6) > 0 ? 1 : 0.25;
  ctx.fillStyle = '#ff2e2e';
  ctx.beginPath();
  ctx.arc(-span + 4, 20, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2eff5a';
  ctx.beginPath();
  ctx.arc(span - 4, 20, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = blink;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, len * 0.58, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** The cockpit frame for first-person view: struts, glareshield, dashboard. */
export function drawCockpitFrame(ctx, plane, display) {
  const W = VIEW.width;
  const H = VIEW.height;
  // Canopy struts.
  ctx.strokeStyle = '#1c2733';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W * 0.22, H * 0.42);
  ctx.moveTo(W, 0);
  ctx.lineTo(W * 0.78, H * 0.42);
  ctx.stroke();
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(W * 0.5, 0);
  ctx.lineTo(W * 0.5, H * 0.16);
  ctx.stroke();
  // Nose tip, just visible over the panel.
  ctx.fillStyle = '#d5dce2';
  ctx.beginPath();
  ctx.moveTo(W * 0.47, H * 0.86);
  ctx.lineTo(W * 0.5, H * 0.78);
  ctx.lineTo(W * 0.53, H * 0.86);
  ctx.closePath();
  ctx.fill();
  // Dashboard panel.
  const panelY = H * 0.82;
  ctx.fillStyle = '#141c26';
  ctx.beginPath();
  ctx.roundRect(0, panelY, W, H - panelY, [18, 18, 0, 0]);
  ctx.fill();
  ctx.fillStyle = '#232f3d';
  ctx.fillRect(0, panelY, W, 4);
  // Gauges: attitude, altimeter, airspeed, compass.
  gauge(ctx, W * 0.2, panelY + 62, 46, 'ATT', plane, 'attitude');
  gauge(ctx, W * 0.36, panelY + 62, 46, 'ALT', plane, 'alt');
  gauge(ctx, W * 0.52, panelY + 62, 46, 'SPD', plane, 'spd');
  gauge(ctx, W * 0.68, panelY + 62, 46, 'HDG', plane, 'hdg');
  // Fuel and throttle bars on the panel.
  ctx.fillStyle = '#0b1118';
  ctx.fillRect(W * 0.8, panelY + 26, 150, 14);
  ctx.fillRect(W * 0.8, panelY + 52, 150, 14);
  ctx.fillStyle = display.fuel < 25 ? '#ff5a3c' : '#37c8e8';
  ctx.fillRect(W * 0.8, panelY + 26, 150 * (display.fuel / 100), 14);
  ctx.fillStyle = '#ffc93c';
  ctx.fillRect(W * 0.8, panelY + 52, 150 * (display.throttle / 100), 14);
  ctx.fillStyle = '#dff3ff';
  ctx.font = '600 13px ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`FUEL ${display.fuel}%`, W * 0.8, panelY + 20);
  ctx.fillText(`THR ${display.throttle}%`, W * 0.8, panelY + 46);
}

function gauge(ctx, x, y, r, label, plane, kind) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#0b1118';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3d5a73';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#dff3ff';
  ctx.font = '700 11px ui-monospace, monospace';
  ctx.textAlign = 'center';
  if (kind === 'attitude') {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r - 4, 0, Math.PI * 2);
    ctx.clip();
    ctx.rotate(-plane.roll);
    ctx.translate(0, plane.pitch * 60);
    ctx.fillStyle = '#3f8fd6';
    ctx.fillRect(-r, -r, r * 2, r);
    ctx.fillStyle = '#8a6b45';
    ctx.fillRect(-r, 0, r * 2, r);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-r, -1.5, r * 2, 3);
    ctx.restore();
    ctx.fillStyle = '#ffc93c';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(-14, 4);
    ctx.lineTo(14, 4);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'alt') {
    const a = (plane.y * 0.11) % (Math.PI * 2);
    ctx.strokeStyle = '#dff3ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.sin(a) * (r - 10), -Math.cos(a) * (r - 10));
    ctx.stroke();
    ctx.fillStyle = '#ffc93c';
    ctx.font = '700 13px ui-monospace, monospace';
    ctx.fillText(String(Math.round(plane.y * 32.8)), 0, 4);
  } else if (kind === 'spd') {
    const a = (plane.speed / 72) * Math.PI * 1.5 - Math.PI * 0.75;
    ctx.strokeStyle = '#37c8e8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r - 8, -Math.PI * 0.75, a);
    ctx.stroke();
    ctx.fillStyle = '#dff3ff';
    ctx.font = '700 13px ui-monospace, monospace';
    ctx.fillText(String(Math.round(plane.speed * 3.6)), 0, 4);
  } else {
    const hdg = ((plane.heading * 180) / Math.PI % 360) + 360;
    ctx.fillStyle = '#ffc93c';
    ctx.font = '700 14px ui-monospace, monospace';
    ctx.fillText(String(Math.round(hdg % 360)).padStart(3, '0'), 0, 4);
  }
  ctx.fillStyle = '#8fb8d8';
  ctx.font = '600 10px ui-monospace, monospace';
  ctx.fillText(label, 0, r + 16);
  ctx.restore();
}
