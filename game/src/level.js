// level.js — the lighthouse interior: one connected level in three zones.
// Cellar (bottom) -> Gallery (middle) -> Lantern Room (top, the Ember Opal).
// Walls and cover are axis-aligned rectangles; they block movement and sight.

export const LEVEL_W = 1280;
export const LEVEL_H = 800;

// Outer walls (16 thick) plus the two zone dividers with stair gaps.
export const WALLS = [
  { x: 0, y: 0, w: 1280, h: 16 }, { x: 0, y: 784, w: 1280, h: 16 },
  { x: 0, y: 0, w: 16, h: 800 }, { x: 1264, y: 0, w: 16, h: 800 },
  // Divider Cellar | Gallery (y 540), stair gap x 520..760.
  { x: 16, y: 540, w: 504, h: 16 }, { x: 760, y: 540, w: 504, h: 16 },
  // Divider Gallery | Lantern Room (y 280), stair gap x 440..840.
  { x: 16, y: 280, w: 424, h: 16 }, { x: 840, y: 280, w: 424, h: 16 },
];

// Cover: crates, shelves, curtains. Solid, blocks movement and line of sight.
// kind: 'crate' | 'shelf' | 'curtain' — drawn differently, same collision.
export const COVER = [
  // Cellar
  { x: 120, y: 620, w: 90, h: 60, kind: 'crate' },
  { x: 300, y: 680, w: 70, h: 50, kind: 'crate' },
  { x: 900, y: 620, w: 110, h: 60, kind: 'crate' },
  { x: 1080, y: 700, w: 80, h: 50, kind: 'crate' },
  { x: 560, y: 600, w: 16, h: 120, kind: 'crate' },
  { x: 700, y: 660, w: 16, h: 100, kind: 'crate' },
  // Gallery
  { x: 120, y: 360, w: 140, h: 40, kind: 'shelf' },
  { x: 1020, y: 360, w: 140, h: 40, kind: 'shelf' },
  { x: 560, y: 420, w: 160, h: 40, kind: 'shelf' },
  { x: 300, y: 300, w: 16, h: 90, kind: 'curtain' },
  { x: 964, y: 300, w: 16, h: 90, kind: 'curtain' },
  { x: 180, y: 470, w: 60, h: 60, kind: 'curtain' },
  { x: 1040, y: 470, w: 60, h: 60, kind: 'curtain' },
  // Lantern Room
  { x: 200, y: 120, w: 90, h: 60, kind: 'crate' },
  { x: 990, y: 120, w: 90, h: 60, kind: 'crate' },
  { x: 420, y: 90, w: 16, h: 80, kind: 'curtain' },
  { x: 844, y: 90, w: 16, h: 80, kind: 'curtain' },
];

// Shadow pools: standing here you are harder to spot and suspicion drains fast.
export const SHADOWS = [
  { x: 200, y: 740, w: 160, h: 40 },
  { x: 1000, y: 580, w: 180, h: 40 },
  { x: 640, y: 320, w: 220, h: 44 },
  { x: 180, y: 480, w: 160, h: 40 },
  { x: 300, y: 200, w: 160, h: 40 },
  { x: 820, y: 200, w: 160, h: 40 },
];

// Small treasures: 12, touch to collect.
export const TREASURES = [
  { x: 170, y: 745, name: 'Brass compass' },
  { x: 350, y: 730, name: 'Silver sextant' },
  { x: 960, y: 570, name: 'Pearl rosary' },
  { x: 1150, y: 740, name: 'Ivory spyglass' },
  { x: 200, y: 400, name: 'Gilt portrait' },
  { x: 1150, y: 400, name: 'Jade inkwell' },
  { x: 640, y: 470, name: 'Ruby brooch' },
  { x: 420, y: 330, name: 'Gold pocket watch' },
  { x: 860, y: 330, name: 'Emerald snuffbox' },
  { x: 250, y: 240, name: 'Topaz lantern' },
  { x: 1030, y: 240, name: 'Sapphire astrolabe' },
  { x: 640, y: 220, name: 'Opal cameo' },
];

// The Ember Opal sits in a locked glass case in the Lantern Room.
export const OPAL_CASE = { x: 596, y: 76, w: 88, h: 56 };
export const OPAL_POS = { x: 640, y: 104 };

// The dock door: the way in, and the way out once the Opal is yours.
export const EXIT_ZONE = { x: 36, y: 736, w: 96, h: 48 };
export const PLAYER_START = { x: 84, y: 700 };

// Zone labels, drawn on the floor.
export const ZONES = [
  { name: 'THE CELLAR', x: 640, y: 772 },
  { name: 'THE GALLERY', x: 640, y: 528 },
  { name: 'THE LANTERN ROOM', x: 640, y: 268 },
];

/** Every solid rectangle (walls + cover) for collision and sight tests. */
export function solidRects() {
  return WALLS.concat(COVER);
}

/** True when point (x, y) lies inside any shadow pool. */
export function inShadow(x, y) {
  for (const s of SHADOWS) {
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true;
  }
  return false;
}

/** True when point (x, y) lies inside a solid rectangle. */
export function hitsSolid(x, y, rects) {
  for (const r of rects) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
  }
  return false;
}
