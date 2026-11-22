// input.js — keyboard and mouse behind one action map.
// Movement uses e.code (positional, so WASD works on any layout).

export function createInput(canvas) {
  const keys = new Set();
  const input = {
    keys,
    mouse: { x: 0, y: 0, clicked: false },
    /** A key pressed since the last consume (edge-triggered actions). */
    pressed: new Set(),
    axisX() {
      let x = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      return x;
    },
    axisY() {
      let y = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      return y;
    },
    get sneaking() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    /** True once for the frame the key went down; call after reading. */
    wasPressed(code) { return this.pressed.has(code); },
    endFrame() { this.pressed.clear(); this.mouse.clicked = false; },
  };

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!e.repeat) {
      keys.add(e.code);
      input.pressed.add(e.code);
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    input.mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    input.mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  });
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    input.mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    input.mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
    input.mouse.clicked = true;
    input.pressed.add('MouseClick');
  });
  return input;
}
