// input.js — keyboard and mouse state for walking, driving, combat and menus.
export function createInputHandler(canvas) {
  const keys = {};
  const pressed = {};
  let mouseDown = false;
  let mouseClicked = false;

  function onKeyDown(event) {
    const code = event.code;
    if (!keys[code]) pressed[code] = true;
    keys[code] = true;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) {
      event.preventDefault();
    }
  }

  function onKeyUp(event) {
    keys[event.code] = false;
  }

  function onMouseDown(event) {
    if (event.button === 0) {
      mouseDown = true;
      mouseClicked = true;
    }
  }

  function onMouseUp(event) {
    if (event.button === 0) mouseDown = false;
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);

  return {
    keys,
    // True only on the single frame the key went down.
    wasPressed(code) {
      return !!pressed[code];
    },
    isDown(code) {
      return !!keys[code];
    },
    mouseClicked() {
      return mouseClicked;
    },
    mouseDown() {
      return mouseDown;
    },
    // Call once per frame after the game has read the input.
    endFrame() {
      for (const code of Object.keys(pressed)) pressed[code] = false;
      mouseClicked = false;
    },
    // Steering and throttle in the range -1..1, shared by walking and driving.
    moveAxes() {
      let forward = 0;
      let strafe = 0;
      if (keys.KeyW || keys.ArrowUp) forward += 1;
      if (keys.KeyS || keys.ArrowDown) forward -= 1;
      if (keys.KeyA || keys.ArrowLeft) strafe -= 1;
      if (keys.KeyD || keys.ArrowRight) strafe += 1;
      return { forward, strafe };
    },
  };
}
