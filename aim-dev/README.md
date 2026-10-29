# aim-dev

AimLab: the aim and reaction trainer that replaced Chaos Aim Trainer and RefleX. It is kept
outside `AttendanceTimeCheckerPlus.js` so it can be read, diffed and tested on its own. The
userscript carries a verbatim copy of `aim-core.js` + `aim-ui.js` (the *engine* block) and of
`aim-theme.css` (the *theme* block), and `aim-verify.js` asserts both are byte-identical.

**Edit the files here, never the copy in the userscript.**

```
node aim-dev/reinsert.js            # splice both blocks into the userscript
node aim-dev/reinsert.js --check    # exit 1 if either copy differs
node aim-dev/aim-verify.js          # spawner (25k spawns), drift, scoring, RefleX parity, 3D hits, storage, host wiring
node aim-dev/host-run.js [dir]      # the REAL userscript in headless Chrome: every mode, sheets, Max, themes, PNGs
node aim-dev/perf-check.js          # frame cost on the GPU, full speed and 4× throttle; a gate (exits 1); --ab adds probes, --max Max at 150%
```

Use `"C:/Program Files/nodejs/node.exe"`; the default `node` here is v10. `host-run.js` needs Node 22.

## Files

| file | what it is |
|---|---|
| `aim-core.js` | scenarios and difficulties, the spawn rules (no overlaps, ever), drift, tracking paths, scoring, Sprint/Endless/Levels rules (bonus target, boss, stages, skill rating, medals), RefleX's reaction rules, storage, the crosshair share code. No DOM |
| `aim-ui.js` | the panel, the canvas (2D arena and the 3D room), pointer lock, input, overlays (campaign map, stage card, breakdown results), sheets (scenarios, Records), results, XP, Max |
| `aim-theme.css` | `--aim-*` tokens for Aurora dark, Aurora light and Cyberpunk, then the components. The canvas reads the same tokens |
| `load.js` | evaluates both modules against stub host helpers and returns the internals |
| `reinsert.js` | the sentinel splice, as in `snake-dev/` and `pool-dev/` |
| `aim-verify.js` | headless checks, plus a static audit of the host wiring |
| `host-run.js` | real-Chrome run on a stand-in portal (headless has no pointer lock, so 3D sets the lock flag through the probe) |
| `ref/` | the frozen Claude Design canvas; see `ref/README.md` |

## Things not to break

- **The legacy records keep their old meaning** (`aimLegacy`). Only 2D Chaos, Screen and 2D Target at
  Normal write `aimChaosHighScore` / `reflexHighScores`. Chaos is always hits × 10 over 30 s.
- **The ranked boards** (`aimRanked`): Chaos, Sprint 50, Endless and Levels in 2D and 3D, Screen and
  Target, at Normal (Levels always). Their bests live in `aimLab.bests` as `<mode>|<2d|3d>|normal`, and
  the host's `collectGameModeBests` sends them as `aim:<mode>` (3D: `aim:<mode>Fps`, Target 3D:
  `reflex:targetFps`). Levels also sends `aim:levelsStage` and ranks by stage, then score. Practice
  scenarios and Easy/Hard keep local bests only.
- **Sprint and Endless score a breakdown** (`aimBreakdown`); the total is always the sum of its lines.
  Endless must always end: each hit's 2–5 s shrinks as hits grow (×40 / (40 + hits)) and the clock
  drains 10% faster each level. `aim-verify.js` plays a perfect bot to the end in 2D and 3D.
- **Levels' campaign** (`aimCamp`, one per camera): a first clear adds its score and moves the
  campaign on; a fail costs a life unless it is a replay; three lost ends it. Best stars per stage
  outlive campaigns. The skill rating stays within 0.8–1.25.
- **The reaction rules are RefleX's.** These are pinned by 300 scripted runs against a simulator of the old code:
  - the 80 ms debounce
  - early clicks and off-target clicks count as false starts
  - a click during the cool-off after an early click is another false start
  - the third false start ends the run, with the remaining rounds counted at the max delay
  - 1.2 s before the round re-arms, and 0.3 s between rounds
- **GO is timed from the frame that painted it** (`aimReactPainted`), not from the timer.
- **The spawner never overlaps.** A failed candidate relaxes the gap down to 0. When no position fits, it returns null and the slot stays empty; it never forces an overlap.
- **No text changes per frame.** On this page a text change costs a full restyle (the host has 43 `:has()` rules). Live numbers go through `aimSet`, which drives CSS counters; `perf-check.js` fails if a run restyles much more than the idle panel.
- **Drift is re-checked every frame.** Targets that close to the gap swap velocities and are pushed back apart, so they can't pass through each other.
