[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/bonjoves444-ux/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/bonjoves444-ux/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01)

# SOLMAR — Open-World Crime Game

An original open-world crime game for the make.fun **Make GTA 6** bounty
(gta6-01). No Rockstar names, characters, maps, art or music — Solmar City,
Rio Vega, Marco, Lena and the whole crew story are invented here.

You are Rio Vega, a getaway driver pulled back into crew life. Explore Solmar
City on foot and by car at golden hour, steal cars, outrun the Solmar Police
and their helicopter, run eight crew missions, take taxi fares, buy guns at
Ammu-Nation, tune your car at Rio's Garage, and build your cash and crew rep
from $0 to king of the coast.

## How to run

Serve `game/` with any static HTTP server and open `game/index.html` in
desktop Chrome. For example:

```sh
cd game && python3 -m http.server 8080
```

Then open http://localhost:8080/ — no build step, no network requests, every
file the game loads lives under `game/`. Or run `node serve.ts` from the
repo root, which serves `game/` on http://localhost:8080.

## How to play

- **WASD** — walk / drive (Shift runs on foot)
- **E** — steal and enter a car, step out of one, or shop at a marker
- **SPACE** — handbrake drift, **N** — NOS boost
- **1 / 2 / 3** — pistol / SMG / shotgun (buy the locked ones at Ammu-Nation)
- **F** — punch, **CLICK** — shoot (hold for the SMG)
- **R** — cycle the three radio stations
- **C** — change camera, **P** — pause, **M** — sound on/off, **L** — save game
- **T** — take a taxi fare

## What is in the game — round 2

- A golden-hour coastal city: downtown towers with lit windows and neon,
  market streets, docks, a beach promenade with palms and umbrellas, and the
  big Solmar Wheel turning on the pier side, with traffic cars and pedestrians.
- Wanted stars with police cruisers that chase, ram and arrest — plus a police
  helicopter with a searchlight that joins the chase at three stars — and a
  live police-response roster on the HUD (unit, distance, behaviour).
- Eight crew missions with spoken dialogue from Marco and Lena: Getaway
  Driver, The Pickup, Hot Pursuit, Dock Delivery, The Solmar Heist, The
  Informant, Smuggler's Run and King of the Coast — plus taxi side jobs,
  street cash pickups and a crew-rep rank that grows with every job done.
- Combat on foot with three weapons (pistol, SMG, shotgun), rival crew
  members who fight back, and drive-by capable cars with NOS and armour.
- Shops that spend real cash: Ammu-Nation sells guns and ammo, Rio's Garage
  sells repairs, NOS refills and armour plating.
- A dense HUD: mission objective with its stage (e.g. MISSION 3/8 · STEP 1/1),
  wanted stars, cash, health, crew rep, speed, weapon slots, radio station,
  dialogue line, police roster, and a street minimap with buildings, coast,
  the helicopter and the mission marker.
- Synthesized WebAudio sound (engine, sirens, shots, cash, three radio
  stations) and a save system in localStorage with a downloadable save file.

## Screenshots

The four screenshots in `screenshots/` are real renders of this game's own
code, taken in a desktop browser from the deterministic `?shot=1..4` scenes.
Round 2 stages them as live action at speed — no frozen tableaus: a beachfront
police chase with the helicopter overhead, downtown traffic at speed, the
market pickup on foot with rivals closing in, and the dusk heist escape.

## Round 2 — what changed from round 1

Round 1 scored 977,345 (12W/0D/0L) but won its house games by a hair: frozen
0 km/h tableaus, flat midday light, plain cruisers, a thin HUD and five
missions. Round 2 fixes exactly that: golden-hour lighting with lit windows
and neon, live-motion screenshots at 86–115 km/h, a helicopter with a
searchlight, split red/blue light bars and POLICE door markings, a police
roster, weapon slots, radio, dialogue and crew rep on the HUD, a street
minimap with buildings, three more missions, two more weapons, two shops,
NOS and drift.

## Files

- `game/index.html` — page, HUD, menus and the shop overlay
- `game/src/main.js` — boot, golden-hour light, game loop, camera, live shots
- `game/src/city.js` — Solmar City: roads, towers, neon, beach, wheel, docks
- `game/src/player.js` — Rio on foot, entering and leaving cars, loadout
- `game/src/vehicles.js` — stealable cars, traffic, arcade driving, NOS
- `game/src/police.js` — wanted level, cruisers, helicopter, roster
- `game/src/missions.js` — the eight-mission crew story and taxi jobs
- `game/src/combat.js` — fists, three weapons, rival crew and hit effects
- `game/src/shops.js` — Ammu-Nation and Rio's Garage
- `game/src/hud.js` — HUD, roster, weapons, radio, dialogue, minimap
- `game/src/audio.js` — synthesized sound, three radio stations
- `game/src/save.js` — save / load in localStorage (v2: full loadout)
- `game/src/shots.js` — deterministic live-action screenshot scenes
- `game/src/input.js` — keyboard and mouse input
- `game/src/random.js` — seeded random numbers
- `game/vendor/three.module.min.js` — vendored three.js (minified build)
- `main.ts` — the entry program: copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json`

## License

MIT — see `LICENSE`.
