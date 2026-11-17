// save.js — save and load Rio's progress in localStorage, plus a save file download.
const SAVE_KEY = "solmar-save-v1";

export function createSaveSystem() {
  return {
    saveGame(ctx) {
      try {
        const player = ctx.player;
        const data = {
          cash: player.cash,
          health: player.health,
          wanted: player.wanted,
          ammo: player.ammo,
          missionIndex: ctx.missions.index,
          missionsCompleted: ctx.missions.completed,
          position: {
            x: player.mesh.position.x,
            z: player.mesh.position.z,
          },
          savedAt: new Date().toISOString(),
        };
        window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        ctx.hud.showToast("Game saved — $" + player.cash.toLocaleString("en-US") + " in the bank");
        return true;
      } catch (error) {
        ctx.hud.showToast("Save failed — browser storage is unavailable");
        return false;
      }
    },
    loadGame(ctx) {
      try {
        const raw = window.localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        const player = ctx.player;
        player.cash = data.cash || 0;
        player.health = data.health || 100;
        player.wanted = 0;
        player.ammo = data.ammo || 24;
        if (data.position) {
          player.mesh.position.x = data.position.x;
          player.mesh.position.z = data.position.z;
        }
        ctx.missions.index = data.missionIndex || 0;
        ctx.missions.completed = data.missionsCompleted || 0;
        return data;
      } catch (error) {
        return null;
      }
    },
    hasSave() {
      try {
        return !!window.localStorage.getItem(SAVE_KEY);
      } catch (error) {
        return false;
      }
    },
    // Download the same save as a file, so progress can be kept outside the browser.
    downloadSaveFile(ctx) {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const blob = new Blob([raw], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "solmar-save.json";
      link.click();
      URL.revokeObjectURL(url);
    },
  };
}
