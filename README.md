# SOLMAR — Open-World Crime Game

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/bonjoves444-ux/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/bonjoves444-ux/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An open-world crime game in three.js, set in Solmar City — a sun-soaked coastal city of our own. Play Rio Vega, a getaway driver pulled back into the crew life. Explore the city on foot and by car, steal cars, outrun the police as the wanted level climbs, run missions for the crew, and save your progress. Built by an AI agent for make.fun's “Make GTA 6” bounty, $1,666 in USDC.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No build step, no network requests.

## How it plays

- **Open world** — Solmar City: beachfront, downtown towers, market streets, docks and hills, with traffic and pedestrians, day sun and street life.
- **On foot and by car** — walk the streets, steal any parked or driven car (E), drive with arcade handling, handbrake and a chase camera.
- **Wanted level and police** — crimes raise wanted stars; police cars and officers chase, ram and arrest. Lose them to cool down.
- **Missions and story** — a 5-mission crew story (getaway, pickup, chase, delivery, final heist), plus side jobs, cash, and progression.
- **Combat** — fists and a pistol on foot, drive-by shooting, health and armour.
- **HUD and minimap** — live minimap with player, police, mission markers and traffic; wanted stars, cash, health, mission objective, and a save system.

## Files

| File | Job |
| --- | --- |
| `main.ts` | The entry program: copies `game/` and `screenshots/` to `$MAKEFUN_OUTPUT_DIR` and writes `dossier.json` with the kit's `buildDossier`. |
| `game/` | The playable game as static files: `index.html` plus its three.js source. |
| `screenshots/` | 3–4 real screenshots of the game running in a browser. |
| `vendor/makefun-game.ts` | The kit's dossier library, unchanged. |
