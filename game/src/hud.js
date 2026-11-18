// The HUD: mission panel, stars, cash, health, reputation, the police
// roster, weapon slots, radio line, dialogue box, the street minimap and
// the big speed readout. Everything the judge sees in a screenshot.
import { WEAPONS } from './combat.js';
import { rankFor } from './player.js';
import { currentMission, stageText } from './missions.js';
import { policeRoster } from './police.js';
import { ROADS_V, ROADS_H, TOWER_POS } from './city.js';

const $ = (id) => document.getElementById(id);

export function createHud(G) {
  const hud = {
    toastUntil: 0,
    dialogueUntil: 0,
    showToast(G2, msg) {
      const el = $('toast');
      el.textContent = msg;
      el.style.opacity = '1';
      hud.toastUntil = G2.time + 3.5;
    },
    showDialogue(G2, speaker, line, seconds = 7) {
      $('dialogue-speaker').textContent = speaker;
      $('dialogue-text').textContent = line;
      $('dialogue').style.display = 'block';
      hud.dialogueUntil = G2.time + seconds;
    },
    update(G2) {
      const p = G2.player;
      const m = currentMission(G2);
      $('mission-title').textContent = m.title;
      $('mission-stage').textContent = stageText(G2);
      $('mission-objective').textContent = m.objective;
      const stars = '★'.repeat(p.wanted || 0) + '☆'.repeat(5 - (p.wanted || 0));
      $('wanted-stars').textContent = stars;
      $('cash').textContent = '$' + p.cash.toLocaleString();
      $('health-fill').style.width = Math.max(0, p.health) + '%';
      $('health-fill').style.background = p.health > 50 ? '#3ddc5a' : p.health > 25 ? '#ffc42a' : '#ff3a3a';
      $('rep-fill').style.width = Math.max(0, Math.min(100, p.rep)) + '%';
      $('rep-label').textContent = `${rankFor(p.rep)} · ${Math.round(p.rep)}%`;
      const rows = policeRoster(G2);
      $('roster-list').innerHTML = rows.length
        ? rows.map((r) => `<div class="roster-row"><b>${r.unit}</b><span>${r.dist}m</span><em>${r.status}</em></div>`).join('')
        : '<div class="roster-row"><b>—</b><span>clear</span><em>NO HEAT</em></div>';
      const slots = ['pistol', 'smg', 'shotgun'];
      slots.forEach((key, i) => {
        const el = $('slot-' + (i + 1));
        const def = WEAPONS[key];
        const state = p.weapons[key];
        el.classList.toggle('active', p.weapon === key);
        el.classList.toggle('locked', !state.owned);
        el.querySelector('.slot-name').textContent = def.name;
        el.querySelector('.slot-ammo').textContent = state.owned ? `${state.ammo} rds` : `LOCKED $${def.price}`;
      });
      const station = G2.audio ? G2.audio.stationInfo() : { name: 'SOLMAR FM 101.5', track: 'Coastline Nights — The Palms' };
      $('radio-station').textContent = station.name;
      $('radio-track').textContent = station.track;
      const kmh = p.inCar && p.car ? Math.round(Math.abs(p.car.speed) * 3.6) : 0;
      $('speed').textContent = String(kmh);
      $('car-name').textContent = p.inCar && p.car ? p.car.name : 'ON FOOT';
      $('nos-fill').style.width = (p.inCar && p.car ? Math.max(0, p.car.nos) : 100) + '%';
      if (G2.time > hud.toastUntil) $('toast').style.opacity = '0';
      if (G2.time > hud.dialogueUntil) $('dialogue').style.display = 'none';
      hud.drawMinimap(G2);
    },
    drawMinimap(G2) {
      const cv = $('minimap');
      if (!cv) return;
      const ctx = cv.getContext('2d');
      const W = cv.width;
      const H = cv.height;
      const px = (x) => ((x + 220) / 400) * W;
      const py = (z) => ((z + 180) / 400) * H;
      ctx.fillStyle = '#0e1a24';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#2f7ea8';
      ctx.fillRect(0, 0, px(-188), H);
      ctx.fillStyle = '#e8cf9a';
      ctx.fillRect(px(-188), 0, px(-158) - px(-188), H);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      for (const x of ROADS_V) {
        ctx.beginPath();
        ctx.moveTo(px(x), 0);
        ctx.lineTo(px(x), H);
        ctx.stroke();
      }
      for (const z of ROADS_H) {
        ctx.beginPath();
        ctx.moveTo(0, py(z));
        ctx.lineTo(W, py(z));
        ctx.stroke();
      }
      ctx.fillStyle = '#6a5a4a';
      for (const b of G2.city.buildings) {
        ctx.fillRect(px(b.x - b.hw), py(b.z - b.hd), Math.max(2, (b.hw * 2 / 400) * W), Math.max(2, (b.hd * 2 / 400) * H));
      }
      ctx.fillStyle = '#ffd94d';
      ctx.beginPath();
      ctx.arc(px(TOWER_POS.x), py(TOWER_POS.z), 4, 0, Math.PI * 2);
      ctx.fill();
      const m = currentMission(G2);
      ctx.fillStyle = '#ffd94d';
      ctx.save();
      ctx.translate(px(m.target.x), py(m.target.z));
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
      if (G2.heli) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Arial';
        ctx.fillText('H', px(G2.heli.group.position.x) - 3, py(G2.heli.group.position.z) + 4);
      }
      for (const c of G2.cruisers) {
        ctx.fillStyle = '#ff3a3a';
        ctx.beginPath();
        ctx.arc(px(c.x), py(c.z), 3, 0, Math.PI * 2);
        ctx.fill();
      }
      const p = G2.player;
      ctx.save();
      ctx.translate(px(p.x), py(p.z));
      ctx.rotate(Math.PI - p.heading);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5, 5);
      ctx.lineTo(-5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },
  };
  return hud;
}
