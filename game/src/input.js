// Keyboard and mouse state. Movement keys are read every frame; action
// keys queue one press event each so E, R, C, P, L, M and the digit keys
// fire exactly once per tap.
const MOVE = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  Space: 'handbrake',
  KeyN: 'nos',
};

export function createInput() {
  const input = {
    keys: new Set(),
    pressed: [],
    mouseDown: false,
    mouseClicked: false,
    get forward() { return input.keys.has('KeyW') || input.keys.has('ArrowUp'); },
    get back() { return input.keys.has('KeyS') || input.keys.has('ArrowDown'); },
    get left() { return input.keys.has('KeyA') || input.keys.has('ArrowLeft'); },
    get right() { return input.keys.has('KeyD') || input.keys.has('ArrowRight'); },
    get handbrake() { return input.keys.has('Space'); },
    get nos() { return input.keys.has('KeyN'); },
  };
  window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (!e.repeat) {
      input.pressed.push(e.code);
      input.keys.add(e.code);
    }
  });
  window.addEventListener('keyup', (e) => input.keys.delete(e.code));
  window.addEventListener('blur', () => input.keys.clear());
  window.addEventListener('mousedown', (e) => {
    if (e.target && e.target.closest && e.target.closest('button')) return;
    input.mouseDown = true;
    input.mouseClicked = true;
  });
  window.addEventListener('mouseup', () => { input.mouseDown = false; });
  return input;
}
