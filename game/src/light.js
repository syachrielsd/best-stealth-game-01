// light.js — the rotating lighthouse searchlight: the level's heartbeat.
// A bright beam sweeps the whole level on a fixed rhythm from the lantern
// at the top. Standing in it exposes you fast, so every crossing is a
// timing puzzle. The same beam lights the floor, showing what is safe.

export const BEAM_PIVOT = { x: 640, y: 34 };
const BEAM_HALF_ANGLE = 0.24; // radians, half the beam's width
const BEAM_LENGTH = 780;
const SWEEP_PERIOD = 9; // seconds for one full sweep out and back
const SWEEP_MAX = 1.15; // radians either side of straight down

export function createBeam() {
  return { angle: Math.PI / 2, time: 0 };
}

/** Advance the sweep; the beam swings like a pendulum, slow at the edges. */
export function updateBeam(beam, dt) {
  beam.time += dt;
  const phase = (beam.time / SWEEP_PERIOD) * Math.PI * 2;
  beam.angle = Math.PI / 2 + Math.sin(phase) * SWEEP_MAX;
}

/** True when point (x, y) is lit by the beam right now. */
export function pointInBeam(beam, x, y) {
  const dx = x - BEAM_PIVOT.x;
  const dy = y - BEAM_PIVOT.y;
  const dist = Math.hypot(dx, dy);
  if (dist > BEAM_LENGTH || dist < 8) return false;
  let a = Math.atan2(dy, dx) - beam.angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return Math.abs(a) < BEAM_HALF_ANGLE;
}

/** The beam's two edge rays, for drawing the wedge. */
export function beamEdges(beam) {
  const a1 = beam.angle - BEAM_HALF_ANGLE;
  const a2 = beam.angle + BEAM_HALF_ANGLE;
  return [
    { x: BEAM_PIVOT.x + Math.cos(a1) * BEAM_LENGTH, y: BEAM_PIVOT.y + Math.sin(a1) * BEAM_LENGTH },
    { x: BEAM_PIVOT.x + Math.cos(a2) * BEAM_LENGTH, y: BEAM_PIVOT.y + Math.sin(a2) * BEAM_LENGTH },
  ];
}
