// guards.js — the lighthouse keepers: learnable patrols, vision cones,
// and a detection system that always gives you a chance to recover.
// States: patrol -> suspicious (investigate) -> chase -> search -> patrol.
// Suspicion rises while a guard sees you and drains while you stay hidden.

import { solidRects, inShadow } from './level.js';
import { pointInBeam } from './light.js';

export const VISION_RANGE = 195;
const VISION_HALF_ANGLE = 0.61; // ~35 degrees either side
const PATROL_SPEED = 55;
const CHASE_SPEED = 108;
const INVESTIGATE_SPEED = 82;
const GUARD_RADIUS = 13;

// Patrol routes: loops the player can learn and time.
const PATROLS = [
  { waypoints: [[150, 600], [450, 600], [450, 720], [150, 720]], zone: 'Cellar' },
  { waypoints: [[850, 600], [1150, 600], [1150, 730], [850, 730]], zone: 'Cellar' },
  { waypoints: [[640, 580], [640, 760]], zone: 'Cellar' },
  { waypoints: [[150, 330], [500, 330], [500, 500], [150, 500]], zone: 'Gallery' },
  { waypoints: [[800, 330], [1150, 330], [1150, 500], [800, 500]], zone: 'Gallery' },
  { waypoints: [[640, 300], [640, 520]], zone: 'Gallery' },
  { waypoints: [[300, 450], [950, 450]], zone: 'Gallery' },
  { waypoints: [[300, 120], [550, 120], [550, 240], [300, 240]], zone: 'Lantern Room' },
  { waypoints: [[730, 120], [1000, 120], [1000, 240], [730, 240]], zone: 'Lantern Room' },
  { waypoints: [[640, 150], [640, 260]], zone: 'Lantern Room' },
];

export function createGuards() {
  return PATROLS.map((p, i) => ({
    id: i,
    x: p.waypoints[0][0], y: p.waypoints[0][1],
    facing: 0,
    wp: 1, // next waypoint index
    waypoints: p.waypoints,
    state: 'patrol', // patrol | suspicious | chase | search
    alert: 0, // 0..100, this guard's own suspicion
    target: null, // {x, y} to investigate
    searchTimer: 0,
    pauseTimer: 0,
    stepTimer: Math.random() * 0.4,
    seenFlash: 0, // counts down after first spotting you
  }));
}

/** Segment (x1,y1)-(x2,y2) blocked by any solid rect? (line-of-sight test) */
export function losBlocked(x1, y1, x2, y2, rects) {
  for (const r of rects) {
    if (segmentHitsRect(x1, y1, x2, y2, r)) return true;
  }
  return false;
}

function segmentHitsRect(x1, y1, x2, y2, r) {
  // Quick reject: segment entirely on one side.
  if (Math.max(x1, x2) < r.x || Math.min(x1, x2) > r.x + r.w) return false;
  if (Math.max(y1, y2) < r.y || Math.min(y1, y2) > r.y + r.h) return false;
  // An endpoint inside the rect counts as a hit.
  if (x1 >= r.x && x1 <= r.x + r.w && y1 >= r.y && y1 <= r.y + r.h) return true;
  if (x2 >= r.x && x2 <= r.x + r.w && y2 >= r.y && y2 <= r.y + r.h) return true;
  // Test the four edges.
  return (
    segmentsCross(x1, y1, x2, y2, r.x, r.y, r.x + r.w, r.y) ||
    segmentsCross(x1, y1, x2, y2, r.x + r.w, r.y, r.x + r.w, r.y + r.h) ||
    segmentsCross(x1, y1, x2, y2, r.x + r.w, r.y + r.h, r.x, r.y + r.h) ||
    segmentsCross(x1, y1, x2, y2, r.x, r.y + r.h, r.x, r.y)
  );
}

function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Can this guard see the player right now? (cone + range + line of sight + smoke) */
export function guardSeesPlayer(guard, player, state) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > VISION_RANGE) return false;
  let a = Math.atan2(dy, dx) - guard.facing;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  if (Math.abs(a) > VISION_HALF_ANGLE) return false;
  // Smoke clouds block sight.
  for (const s of state.smokes) {
    if (segmentHitsRect(guard.x, guard.y, player.x, player.y, { x: s.x - s.r, y: s.y - s.r, w: s.r * 2, h: s.r * 2 })) return false;
  }
  return !losBlocked(guard.x, guard.y, player.x, player.y, solidRects());
}

function moveToward(guard, tx, ty, speed, dt) {
  const dx = tx - guard.x, dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  guard.facing = Math.atan2(dy, dx);
  return dist - step < 4;
}

/** One fixed-step update for every guard. Mutates guards and state. */
export function updateGuards(guards, player, state, dt, beam, sound) {
  const rects = solidRects();
  let maxAlert = 0;

  for (const g of guards) {
    const sees = guardSeesPlayer(g, player, state);
    const playerHidden = inShadow(player.x, player.y);

    if (sees) {
      // Seen! Suspicion climbs fast up close, slower far away, slower still
      // if you are sneaking or crouched in a shadow pool. Once a guard is
      // already chasing you, it climbs half as fast again: the chase is the
      // warning, and breaking line of sight is always a real way out.
      let rate = 55 * (1 - (Math.hypot(player.x - g.x, player.y - g.y) / VISION_RANGE) * 0.55);
      if (player.sneaking) rate *= 0.55;
      if (playerHidden) rate *= 0.6;
      if (g.state === 'chase') rate *= 0.5;
      g.alert = Math.min(100, g.alert + rate * dt);
      g.target = { x: player.x, y: player.y };
      if (g.alert > 55 && g.state === 'patrol') {
        g.state = 'suspicious';
        if (g.seenFlash <= 0) {
          sound.spotted();
          state.toast = 'A keeper spotted you — break line of sight!';
          state.toastTtl = 2;
        }
        g.seenFlash = 1.2;
      }
      if (g.alert > 85) g.state = 'chase';
    } else {
      // Unseen: suspicion drains — fast in shadow, slow in the open.
      // This is the recovery chance: hide, wait, and the heat fades.
      const drain = playerHidden ? 34 : 15;
      g.alert = Math.max(0, g.alert - drain * dt);
      if (g.alert < 30 && g.state === 'chase') g.state = 'search';
      if (g.alert < 12 && (g.state === 'suspicious' || g.state === 'search')) {
        g.state = 'patrol';
        g.target = null;
      }
    }
    if (g.seenFlash > 0) g.seenFlash -= dt;
    maxAlert = Math.max(maxAlert, g.alert);

    // Footsteps: a nearby guard's tread tells you where he is.
    g.stepTimer -= dt;
    if (g.stepTimer <= 0) {
      g.stepTimer = g.state === 'patrol' ? 0.5 : 0.34;
      sound.guardStep(Math.hypot(player.x - g.x, player.y - g.y));
    }

    // Movement by state.
    if (g.state === 'patrol') {
      const wp = g.waypoints[g.wp];
      if (g.pauseTimer > 0) {
        g.pauseTimer -= dt;
      } else if (moveToward(g, wp[0], wp[1], PATROL_SPEED, dt)) {
        g.wp = (g.wp + 1) % g.waypoints.length;
        g.pauseTimer = 0.7; // a beat at each corner: patrols you can learn
      }
    } else if (g.state === 'suspicious' || g.state === 'chase') {
      const dest = g.target || { x: g.x, y: g.y };
      const speed = g.state === 'chase' ? CHASE_SPEED : INVESTIGATE_SPEED;
      if (moveToward(g, dest.x, dest.y, speed, dt)) {
        if (g.state === 'suspicious') {
          g.state = 'search';
          g.searchTimer = 2.4;
        }
      }
    } else if (g.state === 'search') {
      g.searchTimer -= dt;
      g.facing += dt * 1.6; // scans the room, then gives up
      if (g.searchTimer <= 0) { g.state = 'patrol'; g.target = null; }
    }

    // A lure coin pulls the nearest guards to its landing spot.
    if (state.lure && g.state !== 'chase') {
      const d = Math.hypot(g.x - state.lure.x, g.y - state.lure.y);
      if (d < 340) {
        g.state = 'suspicious';
        g.target = { x: state.lure.x, y: state.lure.y };
        g.alert = Math.max(g.alert, 20);
      }
    }
    // A noise (your footsteps) turns nearby guards toward it.
    if (state.noise && g.state === 'patrol') {
      const d = Math.hypot(g.x - state.noise.x, g.y - state.noise.y);
      if (d < 130) {
        g.state = 'suspicious';
        g.target = { x: state.noise.x, y: state.noise.y };
      }
    }
  }

  // The shared detection meter: the worst guard, or the beam, whichever is hotter.
  state.suspicion = Math.max(maxAlert, state.beamExposure);
  if (state.suspicion >= 100) {
    state.phase = 'caught';
    sound.stopAlarm();
    sound.caughtSting();
  } else if (state.suspicion > 60) {
    sound.startAlarm();
  } else {
    sound.stopAlarm();
  }
}
