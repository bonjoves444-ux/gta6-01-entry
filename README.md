# SOLMAR — Open-World Crime Game

[![Competition](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/bonjoves444-ux/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/bonjoves444-ux/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game for the [make.fun "Make GTA 6" bounty](https://make.fun/bounty/gta6-01). Sunset, salt air, and five stars on your tail.

## The game

You are a driver in Solmar, a sunset beachfront city with the sea to the west, a neon downtown to the east, Marina Tower, a ferris wheel on the pier, a market, and the docks. Drive the pink Solmar Comet, steal traffic cars, lose the cops, run eight story missions for Marco the fixer and Lena the driver, buy guns at Lead & Iron, tune the Comet at Rio's Garage, and save your progress.

- **Open world** — Palm Strand beach road, downtown grid, market row, marina, pier and docks, with traffic, 14 pedestrians, palms, lamps and boats.
- **Police** — cruisers in flanking formation with strobing lightbars and a helicopter with a real searchlight at wanted level 3 and above. The PD roster on the HUD names every unit, its distance and its role.
- **Missions** — eight chapters with a countdown, a gold marker ring, step-by-step objectives, cash rewards and +12 rep per completion.
- **Combat** — fists, pistol, Viper SMG and Breaker Shotgun, with tracers, muzzle flashes and rivals who walk up and swing.
- **Shops** — Lead & Iron (SMG, shotgun, ammo) and Rio's Garage (repair, NOS, armour).
- **HUD** — mission panel with timer and stage bar, wanted stars, big green cash, weapon slots, three-station procedural radio, round street minimap with coastline, mission ring and search circle, health and respect bars, dialogue portraits, a speed cluster with gear and NOS, and a full-screen city map (M) with districts, the story list and the route to the current job.
- **Save** — press L any time; the game keeps cash, rep, weapons, car and position in localStorage.

## Controls

WASD drive / walk · E enter car or open a shop · F punch · 1–4 weapons · Click shoot (on foot, armed) · Shift NOS boost · R radio · L save · M city map · P pause

## Play it

```sh
node serve.ts
```

Then open http://127.0.0.1:8080/ in desktop Chrome. No network needed — every script, texture and sound is generated in the browser from the files under `game/`, with three.js vendored under `game/vendor/`.

## Shots

`screenshots/` holds four renders of the game itself: the king-of-the-coast chase on Palm Strand, the title screen with Rio and the Comet, the night shootout at the market, and the full-screen city map.

## Layout

- `game/index.html` — page, HUD and import map
- `game/src/main.js` — renderer, game state, camera, frame loop, shot staging hook
- `game/src/city.js` — the city: sky, sea, roads, buildings, signs, wheel, tower, palms, peds
- `game/src/vehicles.js` — hero car, PD cruisers, traffic
- `game/src/player.js` — the on-foot driver
- `game/src/police.js` — cruiser formation and helicopter
- `game/src/missions.js` — the eight story missions
- `game/src/combat.js` — weapons, tracers, rivals
- `game/src/shops.js` — Lead & Iron and Rio's Garage
- `game/src/hud.js` — HUD panels, the minimap and the city map
- `game/src/audio.js` — procedural radio stations and SFX
- `game/src/input.js`, `game/src/save.js`, `game/src/shots.js`, `game/src/random.js` — input, saves, screenshot staging, seeded random
- `main.ts` — entry program: copies `game/` and `screenshots/` to the output directory and writes `dossier.json`
- `serve.ts` — plain Node static server for local play
