# SOLMAR — Open-World Crime Game

An original open-world crime game for the make.fun **Make GTA 6** bounty
(`gta6-01`), built with three.js and plain static files. No network
requests, no borrowed assets: the city, the cars, the radio and the story
are all SOLMAR's own.

## The game

Sunset over a beachfront city. You are a driver for Marco and Lena's crew,
working eight story missions from getaway driver to King of the Coast while
the Solmar police chase you across the beachfront road, downtown and the
docks.

- **Open world**: a beach with the sea to the west, a beachfront road, a
  downtown of neon towers, the Marina Tower with its blinking beacon, the
  Solmar Wheel turning over the sand, a market, docks, palms, lamps and
  traffic lights. Streets form a grid; buildings are dense enough that no
  view is an empty flat patch.
- **On foot and by car**: walk with WASD, steal any car with E, drive with
  WASD, Space handbrakes, N fires the NOS boost with a blue flame. Cars
  take crash damage; armour from the garage cuts it.
- **Wanted and police**: 0–5 stars. Cruisers chase in spread lanes so they
  flank instead of stacking, each with a flashing red/blue lightbar and
  POLICE door lettering. At 3 stars a helicopter joins, circling overhead
  with a searchlight cone. The HUD's police roster lists AIR-1 and the
  nearest units with distances.
- **Missions and story**: 8 missions in order — Getaway Driver, The Pickup,
  Hot Pursuit, Dock Delivery, The Solmar Heist, The Informant, Smuggler's
  Run, King of the Coast — each with an objective marker, dialogue from
  Marco or Lena, a cash payout and +12 crew reputation. Taxi fares appear
  between missions (+$40, +2 rep).
- **Combat**: pistol (owned), SMG ($600 at Ammu-Nation, automatic fire) and
  shotgun ($900, five pellets at once), each with its own ammo and sound.
  Rival gang members chase and swing; F punches up close.
- **Shops**: Ammu-Nation at (47, 118) sells guns and ammo. Rio's Garage at
  (-47, 63) sells repairs ($200), NOS refills ($250) and armour ($500);
  garage services need you in a car. Press E within 8 m to open a shop.
- **HUD**: mission panel, wanted stars, cash, health and reputation bars
  with a rank label, police roster, three weapon slots, radio line, a
  dialogue box, a circular minimap drawn from the real streets, building
  blocks, coastline, tower, heli and police dots, and a big km/h readout
  with the car name and a NOS meter.
- **Audio**: three radio stations with different tempos and bass lines
  (SOLMAR FM 101.5, RADIO ORO 88.2, WAVE 99.9), cycled with R; distinct
  shot sounds, a NOS whoosh, cash blips. M mutes.
- **Save**: L saves cash, rep, weapons, radio, mission progress and
  position to localStorage (`solmar-save-v2`); it loads on the next start.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk or drive (camera-relative on foot) |
| E | Enter a car, leave a car, open a shop |
| Space | Handbrake |
| N | NOS boost |
| Click | Shoot (hold for SMG auto fire) |
| F | Punch |
| 1 / 2 / 3 | Pistol / SMG / Shotgun |
| R | Change radio station |
| C | Cycle camera (chase / far / wide) |
| P or Esc | Pause |
| L | Save |
| M | Mute |

## Screenshots

`?shot=N` stages a live scene (no input, no mission progress, no game
over) — the car holds a fixed speed while police chase and the helicopter
circles:

1. **Hot Pursuit** — beachfront at 108 km/h, wanted 4, three flanking
   cruisers, helicopter overhead, ferris wheel and sea in frame.
2. **The Informant** — downtown at 86 km/h, wanted 1, neon towers.
3. **The Pickup** — on foot at the market, SMG drawn, two rivals, stalls
   and the tower beacon in one wide frame.
4. **King of the Coast** — dusk escape at 115 km/h, wanted 5, helicopter
   and three cruisers.

Take them with `python3 shoot-solmar.py 6000` (see below) or open
`http://127.0.0.1:8080/?shot=1` in a browser.

## Running it

```sh
node serve.ts --port 8080   # then open http://127.0.0.1:8080/
```

## Round 1 faults and the round 2 fixes

Round 1 scored 977,345 (12W/0D/0L) but won every house game only by a hair.
Viewing its four shots against the leaders showed five faults:

1. **Frozen tableaus.** Shots held the car at 0 km/h, so cars looked parked.
   Round 2 stages live scenes: the car holds 108 / 86 / 115 km/h while
   police chase and traffic moves.
2. **Empty frame.** Half the frame was flat tan ground, untextured boxes
   and flat midday light. Round 2 is golden-hour sunset with a beach, sea,
   ferris wheel, neon signs, lit windows, palms, umbrellas and dense
   buildings, plus a deeper dusk variant for the final shot.
3. **Police read as plain cars.** Round 2 cruisers carry a flashing
   red/blue lightbar, POLICE door lettering and unit numbers, chase in
   spread lanes, and a helicopter with a searchlight joins at 3 stars.
4. **Thin HUD.** Round 2 stacks a police roster, three weapon slots, a
   radio line, a dialogue box, a real street minimap, a reputation bar and
   a big km/h readout with the car name and NOS meter.
5. **Thin depth.** Round 1 had 5 missions, 1 pistol, no shops. Round 2 has
   8 missions, 3 weapons, Ammu-Nation and Rio's Garage, NOS, armour, taxi
   fares and a save system.

Two bugs from round 1 are fixed by design: the on-foot camera now holds
its heading and never chases the player's facing (which used to feed back
into camera-relative strafing and spin the player in circles), and the
shop's cash line lives in its own paragraph — the open-shop code rewrites
the subtitle, which used to destroy a nested cash element and crash.

## Layout

```
game/index.html        page + HUD
game/src/main.js       bootstrap + main loop + camera
game/src/city.js       sunset city: streets, buildings, wheel, tower, market
game/src/vehicles.js   cars, traffic, driving model, NOS, damage
game/src/player.js     on-foot movement, stealing cars, stats
game/src/police.js     wanted level, cruisers, helicopter, roster
game/src/missions.js   the eight missions, markers, payouts, fares
game/src/combat.js     weapons, tracers, rivals
game/src/shops.js      Ammu-Nation and Rio's Garage
game/src/hud.js        HUD panels, roster, minimap, dialogue, toasts
game/src/audio.js      radio stations and effects (WebAudio)
game/src/input.js      keyboard + mouse state
game/src/save.js       localStorage save / load
game/src/shots.js      ?shot=N live staging + debug snapshot
game/vendor/three.module.min.js   vendored three.js
main.ts                entry program: copies game/ + screenshots/ to
                       $MAKEFUN_OUTPUT_DIR and writes dossier.json
serve.ts               static dev server
shots.json             the four shots' metadata
```
