// hud.js — the HUD: wanted stars, cash, health, objective, speed, toasts and minimap.
export function createHud() {
  const wantedEl = document.getElementById("wanted");
  const cashEl = document.getElementById("cash");
  const healthBarEl = document.getElementById("health-bar");
  const objectiveTitleEl = document.getElementById("objective-title");
  const objectiveTextEl = document.getElementById("objective-text");
  const speedEl = document.getElementById("speed");
  const toastEl = document.getElementById("toast");
  const bannerEl = document.getElementById("mission-banner");
  const crosshairEl = document.getElementById("crosshair");
  const minimapCanvas = document.getElementById("minimap");
  const minimapCtx = minimapCanvas.getContext("2d");
  let toastTimer = null;
  let bannerTimer = null;

  return {
    showToast(message) {
      toastEl.textContent = message;
      toastEl.style.display = "block";
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toastEl.style.display = "none"; }, 3200);
    },
    showBanner(message) {
      bannerEl.textContent = message;
      bannerEl.style.display = "block";
      if (bannerTimer) clearTimeout(bannerTimer);
      bannerTimer = setTimeout(() => { bannerEl.style.display = "none"; }, 2400);
    },
    setObjective(title, text) {
      objectiveTitleEl.textContent = title;
      objectiveTextEl.textContent = text;
    },
    setCrosshairVisible(visible) {
      crosshairEl.style.display = visible ? "block" : "none";
    },
    update(ctx) {
      const player = ctx.player;
      wantedEl.textContent = player.wanted > 0 ? "★".repeat(player.wanted) : "";
      cashEl.textContent = "$" + player.cash.toLocaleString("en-US");
      healthBarEl.style.width = Math.max(0, player.health) + "%";
      healthBarEl.style.background = player.health > 50 ? "#37d67a" : player.health > 25 ? "#ffd23e" : "#ff5a5a";
      if (player.inCar) {
        const kmh = Math.round(Math.abs(player.inCar.speed) * 3.6);
        speedEl.innerHTML = kmh + ' <small>km/h · ' + player.inCar.name + "</small>";
      } else {
        speedEl.innerHTML = "";
      }
      this.drawMinimap(ctx, minimapCtx, minimapCanvas);
    },
    // The minimap: roads in grey, the sea in blue, the player as a white arrow,
    // police as red dots, traffic as pale dots and the mission marker in gold.
    drawMinimap(ctx, mapCtx, canvas) {
      const size = canvas.width;
      const scale = size / 440;
      const toMapX = (x) => size / 2 + x * scale;
      const toMapY = (z) => size / 2 + z * scale;
      mapCtx.fillStyle = "#12324a";
      mapCtx.fillRect(0, 0, size, size);
      mapCtx.fillStyle = "#2a7fb8";
      mapCtx.fillRect(0, 0, size / 2 - 160 * scale, size);
      mapCtx.fillStyle = "#f2e2b8";
      mapCtx.fillRect(size / 2 - 175 * scale, 0, 18 * scale, size);
      mapCtx.strokeStyle = "#5a6068";
      mapCtx.lineWidth = 5;
      for (const road of ctx.city.roads) {
        mapCtx.beginPath();
        mapCtx.moveTo(toMapX(road.x1), toMapY(road.z1));
        mapCtx.lineTo(toMapX(road.x2), toMapY(road.z2));
        mapCtx.stroke();
      }
      mapCtx.fillStyle = "#ffd23e";
      const step = ctx.missions ? currentStepTarget(ctx) : null;
      if (step) {
        mapCtx.beginPath();
        mapCtx.arc(toMapX(step.x), toMapY(step.z), 7, 0, Math.PI * 2);
        mapCtx.fill();
      }
      mapCtx.fillStyle = "#ffffff";
      for (const car of ctx.cars) {
        if (car.isTraffic) {
          mapCtx.fillRect(toMapX(car.mesh.position.x) - 1.5, toMapY(car.mesh.position.z) - 1.5, 3, 3);
        }
      }
      mapCtx.fillStyle = "#ff2a2a";
      for (const car of ctx.police.cars) {
        mapCtx.beginPath();
        mapCtx.arc(toMapX(car.mesh.position.x), toMapY(car.mesh.position.z), 4, 0, Math.PI * 2);
        mapCtx.fill();
      }
      const playerPos = ctx.player.inCar ? ctx.player.inCar.mesh.position : ctx.player.mesh.position;
      const heading = ctx.player.inCar ? ctx.player.inCar.heading : ctx.player.heading;
      mapCtx.save();
      mapCtx.translate(toMapX(playerPos.x), toMapY(playerPos.z));
      mapCtx.rotate(-heading + Math.PI);
      mapCtx.fillStyle = "#ffffff";
      mapCtx.beginPath();
      mapCtx.moveTo(0, -8);
      mapCtx.lineTo(6, 6);
      mapCtx.lineTo(-6, 6);
      mapCtx.closePath();
      mapCtx.fill();
      mapCtx.restore();
      mapCtx.strokeStyle = "rgba(255,255,255,.9)";
      mapCtx.lineWidth = 2;
      mapCtx.beginPath();
      mapCtx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      mapCtx.stroke();
    },
  };
}

function currentStepTarget(ctx) {
  if (ctx.missions.taxi) {
    return ctx.missions.taxi.phase === "pickup" ? ctx.missions.taxi.pickup : ctx.missions.taxi.drop;
  }
  if (!ctx.missions || ctx.missions.finished) return null;
  const mission = ctx.missions.index < 5
    ? { steps: [] }
    : null;
  if (!mission) return null;
  // Read the live step target from the beacon, which missions.js keeps in sync.
  if (ctx.missions.beacon && ctx.missions.beacon.visible) {
    return { x: ctx.missions.beacon.position.x, z: ctx.missions.beacon.position.z };
  }
  return null;
}
