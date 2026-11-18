// input.js — keyboard + mouse input with per-frame edge detection.
// The game reads .down(code) for held keys and .pressed(code) for the
// single frame a key went down, so a tap never fires twice and a held
// key never re-triggers an action every frame.

// Input: attach to window once; call endFrame() at the end of every
// game frame to clear the one-frame edge flags.
export class Input {
  constructor() {
    this.keys = new Set();
    this.justPressed = new Set();
    this.clickEdge = false;
    this.mouseDown = false;
    this.mouseX = 0;
    this.mouseY = 0;
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (!this.keys.has(e.code)) this.justPressed.add(e.code);
      this.keys.add(e.code);
      if (e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    window.addEventListener('mousedown', (e) => {
      this.mouseDown = true;
      this.clickEdge = true;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });
    window.addEventListener('mouseup', () => {
      this.mouseDown = false;
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDown = false;
    });
  }

  // down(code): true while the key is held.
  down(code) {
    return this.keys.has(code);
  }

  // pressed(code): true only on the frame the key went down.
  pressed(code) {
    return this.justPressed.has(code);
  }

  // clicked(): true only on the frame the mouse button went down.
  clicked() {
    return this.clickEdge;
  }

  // endFrame(): clear the one-frame edges. Call once per frame, after
  // the game has read them — and right at the end of startGame, so a
  // click on the Start button can never fire a shot on frame one.
  endFrame() {
    this.justPressed.clear();
    this.clickEdge = false;
  }
}
