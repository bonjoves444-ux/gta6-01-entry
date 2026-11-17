[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/bonjoves444-ux/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/bonjoves444-ux/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01)

# SOLMAR — Open-World Crime Game

An original open-world crime game for the make.fun **Make GTA 6** bounty
(gta6-01). No Rockstar names, characters, maps, art or music — Solmar City,
Rio Vega and the whole crew story are invented here.

You are Rio Vega, a getaway driver pulled back into crew life. Explore Solmar
City on foot and by car, steal cars, outrun the Solmar Police, run five crew
missions, take taxi fares, and build your cash from $0 to king of the coast.

## How to run

Serve `game/` with any static HTTP server and open `game/index.html` in
desktop Chrome. For example:

```sh
cd game && python3 -m http.server 8080
```

Then open http://localhost:8080/ — no build step, no network requests, every
file the game loads lives under `game/`.

## How to play

- **WASD** — walk / drive (Shift runs on foot)
- **E** — steal and enter a car, or step out of one
- **SPACE** — handbrake
- **F** — punch, **CLICK** — shoot the pistol
- **C** — change camera, **P** — pause, **M** — sound on/off, **L** — save game
- **T** — take a taxi fare

## What is in the game

- A sun-soaked coastal city: downtown towers, market streets, docks, beach
  promenade, palms and street lamps, with traffic cars and pedestrians.
- Wanted stars with police cruisers that chase, ram and arrest — lose them to
  cool the heat.
- Five crew missions: Getaway Driver, The Pickup, Hot Pursuit, Dock Delivery
  and The Solmar Heist, plus taxi side jobs and street cash pickups.
- Combat on foot, drive-by capable cars, a HUD with a live minimap, wanted
  stars, cash, health, mission objective and speed.
- Synthesized WebAudio sound (engine, sirens, shots, cash, bass loop) and a
  save system in localStorage with a downloadable save file.

## Screenshots

The four screenshots in `screenshots/` are real renders of this game's own
code, taken in a desktop browser from the deterministic `?shot=1..4` scenes:
a police chase, downtown traffic, the market pickup mission, and dusk on the
beach promenade.

## Files

- `game/index.html` — page, HUD and menus
- `game/src/main.js` — boot, game loop, camera, pedestrians, cash pickups
- `game/src/city.js` — Solmar City: roads, buildings, beach, docks, props
- `game/src/player.js` — Rio on foot, entering and leaving cars
- `game/src/vehicles.js` — stealable cars, traffic and arcade driving
- `game/src/police.js` — wanted level, pursuit, ramming and arrests
- `game/src/missions.js` — the five-mission crew story and taxi jobs
- `game/src/combat.js` — fists, pistol, rival crew and hit effects
- `game/src/hud.js` — HUD, minimap, toasts and banners
- `game/src/audio.js` — synthesized sound and music
- `game/src/save.js` — save / load in localStorage
- `game/src/shots.js` — deterministic screenshot scenes
- `game/src/input.js` — keyboard and mouse input
- `game/src/random.js` — seeded random numbers
- `game/vendor/three.module.min.js` — vendored three.js (minified build)
- `main.ts` — the entry program: copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json`

## License

MIT — see `LICENSE`.
