// render.js — draws the whole level on one canvas: floor, walls, cover,
// shadow pools, treasures, the Opal, the searchlight beam, guards with
// their vision cones, and the thief. Procedural art only, no assets.

import { LEVEL_W, LEVEL_H, WALLS, COVER, SHADOWS, TREASURES, OPAL_CASE, OPAL_POS, EXIT_ZONE, ZONES } from './level.js';
import { beamEdges, BEAM_PIVOT } from './light.js';
import { VISION_RANGE } from './guards.js';

const ZONE_COLORS = ['#252e45', '#2e2a48', '#23404e'];
const ZONE_BOUNDS = [
  { y0: 556, y1: 784 }, { y0: 296, y1: 540 }, { y0: 16, y1: 280 },
];

// Precomputed floor speckles so the floor does not shimmer between frames.
const SPECKLES = [];
{
  let seed = 1234567;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let i = 0; i < 420; i++) {
    SPECKLES.push({ x: 20 + rnd() * 1240, y: 20 + rnd() * 760, r: 0.8 + rnd() * 1.8, a: 0.05 + rnd() * 0.1 });
  }
}

function drawFloor(ctx) {
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = ZONE_COLORS[i];
    ctx.fillRect(16, ZONE_BOUNDS[i].y0, 1248, ZONE_BOUNDS[i].y1 - ZONE_BOUNDS[i].y0);
  }
  // Floorboards: faint horizontal lines.
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = 40; y < 780; y += 28) { ctx.moveTo(16, y); ctx.lineTo(1264, y); }
  ctx.stroke();
  for (const s of SPECKLES) {
    ctx.fillStyle = `rgba(255,255,255,${s.a})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Zone labels painted on the floor.
  ctx.fillStyle = 'rgba(232,201,106,0.16)';
  ctx.font = 'bold 26px Georgia, serif';
  ctx.textAlign = 'center';
  for (const z of ZONES) ctx.fillText(z.name, z.x, z.y);
}

function drawWallsAndCover(ctx) {
  for (const w of WALLS) {
    ctx.fillStyle = '#4a5878';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(w.x, w.y, w.w, 3);
  }
  for (const c of COVER) {
    if (c.kind === 'crate') {
      ctx.fillStyle = '#6b4a26';
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = '#3d2a14';
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + c.w, c.y + c.h);
      ctx.moveTo(c.x + c.w, c.y); ctx.lineTo(c.x, c.y + c.h);
      ctx.stroke();
    } else if (c.kind === 'shelf') {
      ctx.fillStyle = '#4a3220';
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.fillStyle = '#7a5a34';
      for (let bx = c.x + 6; bx < c.x + c.w - 8; bx += 16) ctx.fillRect(bx, c.y + 6, 9, c.h - 12);
    } else { // curtain
      ctx.fillStyle = '#6e1f2a';
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.fillStyle = '#8e2a38';
      const step = 8;
      for (let i = 0; i < c.w / step; i += 2) ctx.fillRect(c.x + i * step, c.y, 4, c.h);
      for (let i = 0; i < c.h / step; i += 2) ctx.fillRect(c.x, c.y + i * step, c.w, 4);
    }
  }
}

function drawShadows(ctx) {
  for (const s of SHADOWS) {
    ctx.fillStyle = 'rgba(8,12,28,0.55)';
    ctx.beginPath();
    ctx.ellipse(s.x + s.w / 2, s.y + s.h / 2, s.w / 2, s.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,160,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawTreasures(ctx, time) {
  for (const t of TREASURES) {
    if (t.taken) continue;
    const bob = Math.sin(time * 2 + t.x) * 2;
    ctx.save();
    ctx.translate(t.x, t.y + bob);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#e8c96a';
    ctx.fillRect(-6, -6, 12, 12);
    ctx.fillStyle = '#fff3c4';
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
  }
}

function drawOpalCase(ctx, player, time) {
  const glow = 0.5 + Math.sin(time * 3) * 0.2;
  ctx.fillStyle = `rgba(255,110,40,${0.18 + glow * 0.12})`;
  ctx.beginPath();
  ctx.arc(OPAL_POS.x, OPAL_POS.y, 46, 0, Math.PI * 2);
  ctx.fill();
  // Glass case.
  ctx.fillStyle = 'rgba(180,220,255,0.16)';
  ctx.fillRect(OPAL_CASE.x, OPAL_CASE.y, OPAL_CASE.w, OPAL_CASE.h);
  ctx.strokeStyle = '#9fb8d8';
  ctx.lineWidth = 2;
  ctx.strokeRect(OPAL_CASE.x, OPAL_CASE.y, OPAL_CASE.w, OPAL_CASE.h);
  if (!player.hasOpal) {
    ctx.save();
    ctx.translate(OPAL_POS.x, OPAL_POS.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ff6e28';
    ctx.fillRect(-11, -11, 22, 22);
    ctx.fillStyle = '#ffd9a0';
    ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();
    ctx.fillStyle = '#dfe8ff';
    ctx.font = '12px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('THE EMBER OPAL', OPAL_POS.x, OPAL_CASE.y + OPAL_CASE.h + 16);
    const near = Math.hypot(player.x - OPAL_POS.x, player.y - OPAL_POS.y) < 78;
    if (near) {
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 14px Georgia, serif';
      ctx.fillText('Hold E to pick the lock…', OPAL_POS.x, OPAL_CASE.y - 12);
      // Lockpick progress ring.
      ctx.strokeStyle = '#e8c96a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(OPAL_POS.x, OPAL_POS.y, 30, -Math.PI / 2, -Math.PI / 2 + player.lockpick * Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawExit(ctx, hasOpal, time) {
  const open = hasOpal;
  const pulse = open ? 0.5 + Math.sin(time * 4) * 0.3 : 0.25;
  ctx.fillStyle = open ? `rgba(80,220,120,${pulse})` : 'rgba(120,140,120,0.25)';
  ctx.fillRect(EXIT_ZONE.x, EXIT_ZONE.y, EXIT_ZONE.w, EXIT_ZONE.h);
  ctx.strokeStyle = open ? '#7dffa8' : '#5a6a5a';
  ctx.lineWidth = 2;
  ctx.strokeRect(EXIT_ZONE.x, EXIT_ZONE.y, EXIT_ZONE.w, EXIT_ZONE.h);
  ctx.fillStyle = open ? '#c8ffd8' : '#9aa89a';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT — GO!' : 'DOCK DOOR', EXIT_ZONE.x + EXIT_ZONE.w / 2, EXIT_ZONE.y + EXIT_ZONE.h / 2 + 5);
}

function drawBeam(ctx, beam) {
  const [e1, e2] = beamEdges(beam);
  const grad = ctx.createRadialGradient(BEAM_PIVOT.x, BEAM_PIVOT.y, 10, BEAM_PIVOT.x, BEAM_PIVOT.y, 780);
  grad.addColorStop(0, 'rgba(255,230,150,0.34)');
  grad.addColorStop(1, 'rgba(255,230,150,0.05)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(BEAM_PIVOT.x, BEAM_PIVOT.y);
  ctx.lineTo(e1.x, e1.y);
  ctx.lineTo(e2.x, e2.y);
  ctx.closePath();
  ctx.fill();
  // The lantern itself.
  ctx.fillStyle = '#2c3448';
  ctx.beginPath();
  ctx.arc(BEAM_PIVOT.x, BEAM_PIVOT.y, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(BEAM_PIVOT.x, BEAM_PIVOT.y, 11, 0, Math.PI * 2);
  ctx.fill();
}

function drawCone(ctx, x, y, facing, range, halfAngle, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, facing - halfAngle, facing + halfAngle);
  ctx.closePath();
  ctx.fill();
}

function drawGuards(ctx, guards, time) {
  for (const g of guards) {
    const alerted = g.state === 'chase' || g.alert > 55;
    const color = g.state === 'chase' ? 'rgba(255,60,50,0.30)'
      : g.state === 'suspicious' || g.state === 'search' ? 'rgba(255,170,40,0.26)'
      : 'rgba(255,220,110,0.16)';
    drawCone(ctx, g.x, g.y, g.facing, VISION_RANGE, 0.61, color);
  }
  for (const g of guards) {
    // Body: navy keeper with a brass helmet, visible against the floor.
    ctx.fillStyle = '#22304a';
    ctx.beginPath();
    ctx.arc(g.x, g.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = g.state === 'chase' ? '#ff5040' : '#e8c96a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#e8c96a';
    ctx.beginPath();
    ctx.arc(g.x, g.y, 6, 0, Math.PI * 2);
    ctx.fill();
    // Facing tick.
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.facing) * 18, g.y + Math.sin(g.facing) * 18);
    ctx.stroke();
    // "!" when suspicious, "?" while searching.
    if (g.state === 'chase' || g.alert > 55) {
      ctx.fillStyle = '#ff5040';
      ctx.font = 'bold 20px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - 20);
    } else if (g.state === 'search') {
      ctx.fillStyle = '#ffbb40';
      ctx.font = 'bold 18px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', g.x, g.y - 20);
    }
    // Personal alert ring.
    if (g.alert > 2) {
      ctx.strokeStyle = g.alert > 55 ? '#ff5040' : '#ffbb40';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 18, -Math.PI / 2, -Math.PI / 2 + (g.alert / 100) * Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawPlayer(ctx, player, time) {
  // Your own small lantern glow: dim, so it never gives you away.
  const glow = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, 70);
  glow.addColorStop(0, 'rgba(255,210,130,0.20)');
  glow.addColorStop(1, 'rgba(255,210,130,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 70, 0, Math.PI * 2);
  ctx.fill();
  // Hooded thief: dark cloak, pale hood.
  ctx.fillStyle = '#1c1426';
  ctx.beginPath();
  ctx.arc(player.x, player.y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = player.sneaking ? '#7dd8a8' : '#e8c96a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#e8dcc0';
  ctx.beginPath();
  ctx.arc(player.x + Math.cos(player.facing) * 4, player.y + Math.sin(player.facing) * 4, 5, 0, Math.PI * 2);
  ctx.fill();
  if (player.sneaking) {
    ctx.fillStyle = '#7dd8a8';
    ctx.font = '11px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('sneaking', player.x, player.y - 18);
  }
}

function drawEffects(ctx, state, time) {
  for (const s of state.smokes) {
    const a = Math.min(0.75, s.ttl / 2);
    ctx.fillStyle = `rgba(200,205,220,${a * 0.55})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(230,235,245,${a * 0.35})`;
    ctx.beginPath();
    ctx.arc(s.x - 20, s.y + 12, s.r * 0.55, 0, Math.PI * 2);
    ctx.arc(s.x + 24, s.y - 14, s.r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (state.lure) {
    const blink = 0.6 + Math.sin(time * 8) * 0.4;
    ctx.fillStyle = `rgba(232,201,106,${blink})`;
    ctx.beginPath();
    ctx.arc(state.lure.x, state.lure.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(232,201,106,${blink * 0.7})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(state.lure.x, state.lure.y, 12 + Math.sin(time * 4) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** Draw one frame of the game world (no HUD). */
export function renderWorld(ctx, state) {
  const { player, guards, beam, time } = state;
  ctx.clearRect(0, 0, LEVEL_W, LEVEL_H);
  drawFloor(ctx);
  drawShadows(ctx);
  drawTreasures(ctx, time);
  drawOpalCase(ctx, player, time);
  drawExit(ctx, player.hasOpal, time);
  drawWallsAndCover(ctx);
  drawGuards(ctx, guards, time);
  drawPlayer(ctx, player, time);
  drawEffects(ctx, state, time);
  // The searchlight sweeps over everything: it is the level's light.
  drawBeam(ctx, beam);
  // Darkness at the edges: the night presses in, the beam cuts through.
  const edge = ctx.createRadialGradient(640, 400, 380, 640, 400, 900);
  edge.addColorStop(0, 'rgba(4,6,12,0)');
  edge.addColorStop(1, 'rgba(4,6,12,0.26)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, LEVEL_W, LEVEL_H);
}
