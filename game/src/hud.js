// hud.js — the HUD: wanted stars, cash, health, crew rep, mission objective
// with its stage, speed, weapon slots, radio, dialogue, the police roster,
// toasts, and a real street minimap with buildings, coast and the helicopter.
export function createHud() {
  const wantedEl = document.getElementById("wanted");
  const cashEl = document.getElementById("cash");
  const healthBarEl = document.getElementById("health-bar");
  const repBarEl = document.getElementById("rep-bar");
  const repLabelEl = document.getElementById("rep-label");
  const objectiveTitleEl = document.getElementById("objective-title");
  const objectiveTextEl = document.getElementById("objective-text");
  const objectiveStageEl = document.getElementById("objective-stage");
  const speedEl = document.getElementById("speed");
  const toastEl = document.getElementById("toast");
  const bannerEl = document.getElementById("mission-banner");
  const crosshairEl = document.getElementById("crosshair");
  const rosterEl = document.getElementById("roster");
  const rosterListEl = document.getElementById("roster-list");
  const weaponsEl = document.getElementById("weapons");
  const radioEl = document.getElementById("radio");
  const radioStationEl = document.getElementById("radio-station");
  const radioTrackEl = document.getElementById("radio-track");
  const dialogueEl = document.getElementById("dialogue");
  const dialogueNameEl = document.getElementById("dialogue-name");
  const dialogueLineEl = document.getElementById("dialogue-line");
  const minimapCanvas = document.getElementById("minimap");
  const minimapCtx = minimapCanvas.getContext("2d");
  let toastTimer = null;
  let bannerTimer = null;
  let dialogueTimer = null;

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
    setObjective(title, text, stage) {
      objectiveTitleEl.textContent = title;
      objectiveTextEl.textContent = text;
      objectiveStageEl.textContent = stage || "";
    },
    setCrosshairVisible(visible) {
      crosshairEl.style.display = visible ? "block" : "none";
    },
    // A short spoken line from a crew member, with their name in their colour.
    // Shots pin the line for 30 seconds so it survives the slow screenshot
    // render; in normal play it fades after a few seconds.
    showDialogue(name, line, color, durationMs) {
      dialogueNameEl.textContent = name;
      dialogueNameEl.style.color = color || "#ffd23e";
      dialogueLineEl.textContent = line;
      dialogueEl.style.display = "block";
      if (dialogueTimer) clearTimeout(dialogueTimer);
      dialogueTimer = setTimeout(() => { dialogueEl.style.display = "none"; }, durationMs || 5200);
    },
    setRadio(station, track) {
      radioStationEl.textContent = station;
      radioTrackEl.textContent = track;
      radioEl.style.display = "block";
    },
    update(ctx) {
      const player = ctx.player;
      wantedEl.textContent = player.wanted > 0 ? "★".repeat(player.wanted) : "";
      cashEl.textContent = "$" + player.cash.toLocaleString("en-US");
      healthBarEl.style.width = Math.max(0, player.health) + "%";
      healthBarEl.style.background = player.health > 50 ? "#37d67a" : player.health > 25 ? "#ffd23e" : "#ff5a5a";
      const rep = player.rep || 0;
      repBarEl.style.width = Math.min(100, rep) + "%";
      repLabelEl.textContent = "REP " + Math.round(rep) + "% · " + repRank(rep);
      if (player.inCar) {
        const kmh = Math.round(Math.abs(player.inCar.speed) * 3.6);
        const nos = player.inCar.boosting ? " · NOS!" : "";
        speedEl.innerHTML = kmh + ' <small>km/h · ' + player.inCar.name + nos + "</small>";
      } else {
        speedEl.innerHTML = "";
      }
      // Weapon slots: owned weapons light up, the selected one is gold.
      const slots = weaponsEl.querySelectorAll(".weapon-slot");
      slots.forEach((slot) => {
        const key = slot.getAttribute("data-weapon");
        const owned = player.weapons && player.weapons[key];
        const selected = player.weapon === key;
        slot.classList.toggle("owned", !!owned);
        slot.classList.toggle("selected", selected);
        const ammoEl = slot.querySelector(".weapon-ammo");
        if (ammoEl) {
          ammoEl.textContent = owned ? (player.ammoByWeapon[key] ?? 0) + " rds" : "LOCKED";
        }
      });
      // Police roster: units, distances and behaviour, or a quiet-city line.
      // The helicopter leads the list so AIR-1 is never cut off by the slice.
      if (player.wanted > 0) {
        rosterEl.style.display = "block";
        const rows = (ctx.police.roster || []).slice(0, 5).map((unit) =>
          "UNIT " + unit.unit + " — " + unit.distance + "m · " + unit.behaviour
        );
        rosterListEl.innerHTML = rows.length
          ? rows.map((row) => "<div>" + row + "</div>").join("")
          : "<div>DISPATCHING UNITS…</div>";
      } else {
        rosterEl.style.display = "none";
      }
      this.drawMinimap(ctx, minimapCtx, minimapCanvas);
    },
    // The minimap: sea and beach on the west, building blocks, the road grid,
    // the player as a white arrow, police as red dots, the helicopter as a
    // gold H, traffic as pale dots and the mission marker in gold.
    drawMinimap(ctx, mapCtx, canvas) {
      const size = canvas.width;
      const scale = size / 440;
      const toMapX = (x) => size / 2 + x * scale;
      const toMapY = (z) => size / 2 + z * scale;
      mapCtx.fillStyle = "#12324a";
      mapCtx.fillRect(0, 0, size, size);
      mapCtx.fillStyle = "#1e6f9e";
      mapCtx.fillRect(0, 0, size / 2 - 160 * scale, size);
      mapCtx.fillStyle = "#f2dcae";
      mapCtx.fillRect(size / 2 - 175 * scale, 0, 18 * scale, size);
      mapCtx.fillStyle = "#8a7a5c";
      for (const rect of ctx.city.buildingRects || []) {
        mapCtx.fillRect(
          toMapX(rect.x - rect.w / 2), toMapY(rect.z - rect.d / 2),
          rect.w * scale, rect.d * scale
        );
      }
      mapCtx.strokeStyle = "#c8c8c8";
      mapCtx.lineWidth = 4;
      for (const road of ctx.city.roads) {
        mapCtx.beginPath();
        mapCtx.moveTo(toMapX(road.x1), toMapY(road.z1));
        mapCtx.lineTo(toMapX(road.x2), toMapY(road.z2));
        mapCtx.stroke();
      }
      // Marina Tower gets a gold square so the landmark reads on the map.
      mapCtx.fillStyle = "#ffd23e";
      mapCtx.fillRect(toMapX(27.5) - 3, toMapY(27.5) - 3, 6, 6);
      const step = ctx.missions ? currentStepTarget(ctx) : null;
      if (step) {
        mapCtx.beginPath();
        mapCtx.arc(toMapX(step.x), toMapY(step.z), 7, 0, Math.PI * 2);
        mapCtx.fill();
      }
      mapCtx.fillStyle = "#e8e8e8";
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
      if (ctx.police.heli) {
        mapCtx.fillStyle = "#ffd23e";
        mapCtx.font = "bold 13px Verdana, sans-serif";
        mapCtx.textAlign = "center";
        mapCtx.textBaseline = "middle";
        mapCtx.fillText("H", toMapX(ctx.police.heli.mesh.position.x), toMapY(ctx.police.heli.mesh.position.z));
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

function repRank(rep) {
  if (rep >= 80) return "KING OF THE COAST";
  if (rep >= 60) return "CREW CAPTAIN";
  if (rep >= 40) return "TRUSTED DRIVER";
  if (rep >= 20) return "PROSPECT";
  return "NEW BLOOD";
}

function currentStepTarget(ctx) {
  if (ctx.missions.taxi) {
    return ctx.missions.taxi.phase === "pickup" ? ctx.missions.taxi.pickup : ctx.missions.taxi.drop;
  }
  if (!ctx.missions || ctx.missions.finished) return null;
  // Read the live step target from the beacon, which missions.js keeps in sync.
  if (ctx.missions.beacon && ctx.missions.beacon.visible) {
    return { x: ctx.missions.beacon.position.x, z: ctx.missions.beacon.position.z };
  }
  return null;
}
