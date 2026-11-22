// hud.js — everything the player reads: the detection meter, treasures,
// gadgets, timer, objective line, toasts, and the title / caught / won
// screens. All canvas-drawn so screenshots show the whole game.

import { LEVEL_W } from './level.js';

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function drawTopBar(ctx, state) {
  const { player, time } = state;
  ctx.fillStyle = 'rgba(6,9,16,0.82)';
  ctx.fillRect(0, 0, LEVEL_W, 46);
  ctx.fillStyle = '#e8c96a';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('THE LAST LANTERN', 18, 29);
  // Treasures.
  ctx.fillStyle = '#f4ead0';
  ctx.font = '15px Georgia, serif';
  ctx.fillText(`◆ ${player.treasures}/12   Opal ${player.hasOpal ? '★' : '☆'}`, 250, 29);
  // Gadgets.
  ctx.fillText(`◉ lure ×${player.coins}   ☁ smoke ×${player.smoke}`, 470, 29);
  // Timer.
  ctx.fillText(`⏱ ${fmtTime(time)}`, 700, 29);
  // Objective.
  ctx.fillStyle = '#9fb8d8';
  ctx.font = 'italic 14px Georgia, serif';
  const objective = player.hasOpal
    ? 'Escape through the dock door — unseen!'
    : 'Steal the Ember Opal from the Lantern Room';
  ctx.fillText(objective, 800, 29);
}

function drawDetectionMeter(ctx, state) {
  const s = state.suspicion;
  const x = 470, y = 56, w = 340, h = 16;
  ctx.fillStyle = 'rgba(6,9,16,0.82)';
  ctx.fillRect(x - 8, y - 8, w + 16, h + 26);
  const color = s < 40 ? '#7dd8a8' : s < 70 ? '#ffbb40' : '#ff5040';
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.max(0, (w * s) / 100), h);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = s < 40 ? '#c8f0dc' : s < 70 ? '#ffe1a0' : '#ffc0b8';
  ctx.font = 'bold 12px Georgia, serif';
  ctx.textAlign = 'center';
  const label = s < 15 ? 'UNSEEN' : s < 40 ? 'HEARD SOMETHING…' : s < 70 ? 'SUSPICIOUS!' : s < 100 ? 'SPOTTED — HIDE!' : 'CAUGHT!';
  ctx.fillText(`${label}  ${Math.floor(s)}%`, x + w / 2, y + h + 14);
  if (state.player.inBeam) {
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 14px Georgia, serif';
    ctx.fillText('⚠ IN THE SEARCHLIGHT — MOVE!', x + w / 2, y + h + 34);
  }
}

function drawToast(ctx, state) {
  if (!state.toast || state.toastTtl <= 0) return;
  ctx.fillStyle = 'rgba(6,9,16,0.85)';
  ctx.font = '15px Georgia, serif';
  const w = ctx.measureText(state.toast).width + 28;
  ctx.fillRect((LEVEL_W - w) / 2, 740, w, 32);
  ctx.strokeStyle = '#e8c96a';
  ctx.lineWidth = 1;
  ctx.strokeRect((LEVEL_W - w) / 2, 740, w, 32);
  ctx.fillStyle = '#ffe9a8';
  ctx.textAlign = 'center';
  ctx.fillText(state.toast, LEVEL_W / 2, 761);
}

function drawCenterPanel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(4,6,12,0.72)';
  ctx.fillRect(0, 0, LEVEL_W, 800);
  ctx.fillStyle = 'rgba(10,14,24,0.95)';
  ctx.fillRect(340, 210, 600, 380);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(340, 210, 600, 380);
  ctx.fillStyle = accent;
  ctx.font = 'bold 34px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 640, 275);
  ctx.fillStyle = '#f4ead0';
  ctx.font = '17px Georgia, serif';
  lines.forEach((line, i) => ctx.fillText(line, 640, 325 + i * 32));
}

function drawTitle(ctx) {
  drawCenterPanel(ctx, 'THE LAST LANTERN', [
    'A lighthouse keeper guards the Ember Opal.',
    'Slip past ten keepers, time the searchlight,',
    'steal the Opal — and vanish through the dock door.',
    '',
    'WASD move · Shift sneak · Space / click lure coin',
    'Q smoke · E pick the lock · R restart',
    '',
    'Click or press Enter to begin the heist.',
  ], '#e8c96a');
}

function drawCaught(ctx, state) {
  drawCenterPanel(ctx, 'CAUGHT!', [
    `The keepers caught you after ${fmtTime(state.time)}.`,
    `Treasures stolen: ${state.player.treasures}/12${state.player.hasOpal ? ' — the Opal was yours!' : ''}`,
    '',
    'The beam never sleeps. Time your crossings,',
    'hide in the shadow pools, and let suspicion fade.',
    '',
    'Press R to try again.',
  ], '#ff5040');
}

function drawWon(ctx, state) {
  const ghost = state.peakSuspicion < 50;
  drawCenterPanel(ctx, 'VANISHED INTO THE NIGHT', [
    `The Ember Opal is yours. Escape in ${fmtTime(state.winTime)}.`,
    `Treasures: ${state.player.treasures}/12  ·  Gadgets left: ${state.player.coins + state.player.smoke}`,
    ghost ? 'GHOST — never once truly spotted. A perfect heist.' : 'A clean getaway, if not a quiet one.',
    '',
    'Press R to run the heist again.',
  ], '#7dd8a8');
}

/** Draw the HUD and any overlay screen on top of the world. */
export function renderHud(ctx, state) {
  if (state.phase === 'title') { drawTitle(ctx); return; }
  drawTopBar(ctx, state);
  drawDetectionMeter(ctx, state);
  drawToast(ctx, state);
  if (state.phase === 'caught') drawCaught(ctx, state);
  if (state.phase === 'won') drawWon(ctx, state);
}
