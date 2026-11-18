// save.js — save and load Rio's progress in localStorage, plus a save file
// download. Round 2 saves the whole loadout: cash, rep, weapons and ammo,
// the mission index, the radio station and where Rio was standing.
const SAVE_KEY = "solmar-save-v2";

export function createSaveSystem() {
  return {
    saveGame(ctx) {
      try {
        const player = ctx.player;
        const data = {
          version: 2,
          cash: player.cash,
          health: player.health,
          rep: player.rep || 0,
          wanted: player.wanted,
          weapon: player.weapon,
          weapons: player.weapons,
          ammoByWeapon: player.ammoByWeapon,
          ammo: player.ammo,
          missionIndex: ctx.missions.index,
          missionsCompleted: ctx.missions.completed,
          radioStation: ctx.audio.station().name,
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
        player.rep = data.rep || 0;
        player.wanted = 0;
        player.weapon = data.weapon || "pistol";
        player.weapons = data.weapons || { pistol: true, smg: false, shotgun: false };
        player.ammoByWeapon = data.ammoByWeapon || { pistol: 24, smg: 0, shotgun: 0 };
        player.ammo = player.ammoByWeapon[player.weapon] || 0;
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
    // Wipe the save and start the story over from mission one.
    clearSave() {
      try {
        window.localStorage.removeItem(SAVE_KEY);
        return true;
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
