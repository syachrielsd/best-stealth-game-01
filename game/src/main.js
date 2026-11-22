// main.js — boot and the game loop: a fixed-timestep simulation with a
// clamped delta, so the game plays the same on any machine and never
// blows up after a tab switch. Scenes: title -> play -> caught / won.

import { createInput } from './input.js';
import { createSound } from './sound.js';
import { createPlayer, updatePlayer } from './player.js';
import { createGuards, updateGuards } from './guards.js';
import { createBeam, updateBeam, pointInBeam } from './light.js';
import { TREASURES } from './level.js';
import { renderWorld } from './render.js';
import { renderHud } from './hud.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const sound = createSound();

function createGameState() {
  for (const t of TREASURES) t.taken = false;
  return {
    phase: 'title', // title | play | caught | won
    time: 0,
    winTime: 0,
    suspicion: 0, // 0..100, the shared detection meter
    beamExposure: 0, // 0..100, how exposed the searchlight has caught you
    peakSuspicion: 0,
    player: createPlayer(),
    guards: createGuards(),
    beam: createBeam(),
    smokes: [],
    lure: null,
    noise: null,
    toast: '',
    toastTtl: 0,
  };
}

let state = createGameState();

/** Stage a deterministic scene for a screenshot (?shot=cover|sneak|alarm|escape).
 *  Staged scenes are frozen: guards, the beam and the detection meter hold
 *  the composed moment instead of playing forward into a catch. */
function applyShot(shot) {
  state.phase = 'play';
  state.stage = true;
  const p = state.player;
  if (shot === 'cover') {
    p.x = 300; p.y = 730;
  } else if (shot === 'sneak') {
    // Mid-sneak near-miss in the Gallery: a keeper turns toward you.
    p.x = 500; p.y = 430; p.sneaking = true;
    const g = state.guards[3];
    g.x = 585; g.y = 430; g.facing = Math.PI; g.alert = 38; g.state = 'suspicious';
    g.target = { x: p.x, y: p.y };
    state.suspicion = 38;
    state.toast = 'A keeper spotted you — break line of sight!';
    state.toastTtl = 99;
  } else if (shot === 'alarm') {
    // Fully spotted under the beam, a keeper closing in.
    p.x = 640; p.y = 470;
    p.inBeam = true; // the frozen beam points straight down at the player
    state.beam.time = 0; // beam points straight down at the player
    const g = state.guards[5];
    g.x = 640; g.y = 330; g.facing = Math.PI / 2; g.alert = 82; g.state = 'chase';
    g.target = { x: p.x, y: p.y };
    state.suspicion = 82;
    state.beamExposure = 82;
    state.toast = 'SPOTTED — HIDE!';
    state.toastTtl = 99;
  } else if (shot === 'escape') {
    // Opal in hand, slipping out the dock door as the alarm fades.
    p.hasOpal = true;
    p.x = 210; p.y = 720;
    const g = state.guards[1];
    g.x = 900; g.y = 640; g.alert = 45; g.state = 'suspicious';
    g.target = { x: 300, y: 700 };
    state.suspicion = 45;
    state.toast = 'THE EMBER OPAL IS YOURS — now slip out the dock door, unseen!';
    state.toastTtl = 99;
  }
}

function startGame() {
  sound.unlock();
  if (state.phase === 'title') state.phase = 'play';
}

function restart() {
  state = createGameState();
  state.phase = 'play';
  sound.stopAlarm();
}

function update(dt) {
  if (state.phase !== 'play') return;
  state.time += dt;
  if (state.stage) {
    // A staged screenshot scene: the world holds still, only the clock
    // and the toast run, so the composed moment survives the shutter.
    if (state.toastTtl > 0 && state.toastTtl < 90) state.toastTtl -= dt;
    return;
  }
  updateBeam(state.beam, dt);
  state.player.inBeam = pointInBeam(state.beam, state.player.x, state.player.y);
  if (state.player.inBeam) {
    state.beamExposure = Math.min(100, state.beamExposure + 30 * dt);
  } else {
    state.beamExposure = Math.max(0, state.beamExposure - 20 * dt);
  }
  updatePlayer(state.player, input, dt, state, sound);
  updateGuards(state.guards, state.player, state, dt, state.beam, sound);
  state.peakSuspicion = Math.max(state.peakSuspicion, state.suspicion);
  // Decay short-lived effects.
  if (state.toastTtl > 0) state.toastTtl -= dt;
  if (state.noise) { state.noise.ttl -= dt; if (state.noise.ttl <= 0) state.noise = null; }
  if (state.lure) { state.lure.ttl -= dt; if (state.lure.ttl <= 0) state.lure = null; }
  for (let i = state.smokes.length - 1; i >= 0; i--) {
    state.smokes[i].ttl -= dt;
    if (state.smokes[i].ttl <= 0) state.smokes.splice(i, 1);
  }
  // Global keys.
  if (input.wasPressed('KeyR')) restart();
  if (input.wasPressed('KeyM')) sound.toggleMute();
  input.endFrame();
}

// Fixed timestep: 60 simulation steps a second, render every frame.
const STEP = 1 / 60;
let last = performance.now();
let acc = 0;
let paused = false;

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25; // clamp: a tab switch never blows up the sim
  if (paused) return;
  acc += dt;
  let steps = 0;
  while (acc >= STEP && steps < 5) {
    update(STEP);
    acc -= STEP;
    steps++;
  }
  if (steps === 5) acc = 0; // spiral-of-death guard
  renderWorld(ctx, state);
  renderHud(ctx, state);
}

document.addEventListener('visibilitychange', () => {
  paused = document.hidden;
  if (paused) sound.stopAlarm();
  last = performance.now();
});
window.addEventListener('pointerdown', () => sound.unlock(), { once: true });
window.addEventListener('keydown', (e) => {
  sound.unlock();
  if (e.code === 'Enter' && state.phase === 'title') startGame();
  if (e.code === 'KeyR' && (state.phase === 'caught' || state.phase === 'won')) restart();
});

// A screenshot preset starts the game at once, no click needed.
// Test handle: lets an automated play-test read the live state.
// It changes nothing about the game itself.
window.__lantern = { getState: () => state };

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  applyShot(shot);
} else {
  canvas.addEventListener('pointerdown', startGame);
}
requestAnimationFrame(frame);
