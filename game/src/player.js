// player.js — the thief: movement, sneak, lure coins, smoke, lockpick.
// The player is a circle; walls are pushed out of with axis-separated moves.

import { LEVEL_W, LEVEL_H, OPAL_CASE, OPAL_POS, TREASURES, EXIT_ZONE, PLAYER_START, inShadow, solidRects } from './level.js';

export const PLAYER_RADIUS = 12;
const WALK_SPEED = 165;
const SNEAK_SPEED = 75;
const LOCKPICK_TIME = 2.0;

export function createPlayer() {
  return {
    x: PLAYER_START.x, y: PLAYER_START.y,
    facing: 0, // radians, toward the mouse / last move direction
    sneaking: false,
    moving: false,
    stepTimer: 0,
    coins: 3,
    smoke: 2,
    treasures: 0,
    treasureNames: [],
    hasOpal: false,
    lockpick: 0, // 0..1 progress while holding E at the case
    inBeam: false,
    hidden: false, // standing in a shadow pool
    caught: false,
  };
}

function collideCircle(x, y, r, rects) {
  for (const rc of rects) {
    const cx = Math.max(rc.x, Math.min(x, rc.x + rc.w));
    const cy = Math.max(rc.y, Math.min(y, rc.y + rc.h));
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

/** Move the player one fixed step; returns nothing, mutates player. */
export function updatePlayer(player, input, dt, state, sound) {
  const rects = solidRects();
  const ax = input.axisX();
  const ay = input.axisY();
  const len = Math.hypot(ax, ay);
  player.sneaking = input.sneaking;
  player.moving = len > 0;
  if (len > 0) {
    const speed = player.sneaking ? SNEAK_SPEED : WALK_SPEED;
    const nx = (ax / len) * speed * dt;
    const ny = (ay / len) * speed * dt;
    // Axis-separated movement so the player slides along walls.
    if (!collideCircle(player.x + nx, player.y, PLAYER_RADIUS, rects)) player.x += nx;
    if (!collideCircle(player.x, player.y + ny, PLAYER_RADIUS, rects)) player.y += ny;
    player.x = Math.max(16 + PLAYER_RADIUS, Math.min(LEVEL_W - 16 - PLAYER_RADIUS, player.x));
    player.y = Math.max(16 + PLAYER_RADIUS, Math.min(LEVEL_H - 16 - PLAYER_RADIUS, player.y));
    player.facing = Math.atan2(ay, ax);
    // Footsteps: walking is audible, sneaking is silent.
    player.stepTimer -= dt;
    if (player.stepTimer <= 0) {
      player.stepTimer = player.sneaking ? 0.55 : 0.34;
      if (!player.sneaking) {
        sound.footstep(false);
        state.noise = { x: player.x, y: player.y, radius: 85, ttl: 0.4 };
      }
    }
  }
  // Face the mouse when it has moved away from the player.
  const mdx = input.mouse.x - player.x;
  const mdy = input.mouse.y - player.y;
  if (Math.hypot(mdx, mdy) > 60) player.facing = Math.atan2(mdy, mdx);

  player.hidden = inShadow(player.x, player.y);

  // Small treasures: touch to collect.
  for (const t of TREASURES) {
    if (t.taken) continue;
    const dx = player.x - t.x, dy = player.y - t.y;
    if (dx * dx + dy * dy < 30 * 30) {
      t.taken = true;
      player.treasures += 1;
      player.treasureNames.push(t.name);
      state.toast = `Stole the ${t.name}! (${player.treasures}/12)`;
      state.toastTtl = 2.2;
      sound.pickup();
    }
  }

  // The Ember Opal: hold E at the locked case to pick it.
  const nearCase = Math.hypot(player.x - OPAL_POS.x, player.y - OPAL_POS.y) < 78;
  if (nearCase && !player.hasOpal && input.keys.has('KeyE')) {
    player.lockpick += dt / LOCKPICK_TIME;
    if (Math.random() < dt * 6) sound.lockpickTick();
    if (player.lockpick >= 1) {
      player.hasOpal = true;
      player.lockpick = 0;
      state.toast = 'THE EMBER OPAL IS YOURS — now slip out the dock door, unseen!';
      state.toastTtl = 4;
      state.suspicion = Math.min(100, state.suspicion + 25);
      for (const g of state.guards) g.state = 'suspicious';
      sound.caseOpen();
    }
  } else if (player.lockpick > 0) {
    player.lockpick = Math.max(0, player.lockpick - dt * 2);
  }

  // Throw a lure coin toward the facing direction (Space or click).
  if ((input.wasPressed('Space') || input.wasPressed('MouseClick')) && player.coins > 0 && state.phase === 'play') {
    player.coins -= 1;
    const dist = 190;
    const lx = player.x + Math.cos(player.facing) * dist;
    const ly = player.y + Math.sin(player.facing) * dist;
    state.lure = { x: Math.max(40, Math.min(1240, lx)), y: Math.max(40, Math.min(760, ly)), ttl: 5 };
    state.toast = 'Coin tossed — a guard goes to look.';
    state.toastTtl = 1.8;
    sound.coinClink();
  }

  // Smoke puff at your feet (Q): a cloud no guard can see through.
  if (input.wasPressed('KeyQ') && player.smoke > 0 && state.phase === 'play') {
    player.smoke -= 1;
    state.smokes.push({ x: player.x, y: player.y, r: 92, ttl: 6 });
    sound.smokePuff();
  }

  // Reaching the dock door with the Opal wins the heist.
  if (player.hasOpal &&
      player.x >= EXIT_ZONE.x && player.x <= EXIT_ZONE.x + EXIT_ZONE.w &&
      player.y >= EXIT_ZONE.y && player.y <= EXIT_ZONE.y + EXIT_ZONE.h) {
    state.phase = 'won';
    state.winTime = state.time;
    sound.stopAlarm();
    sound.winChime();
  }
}
