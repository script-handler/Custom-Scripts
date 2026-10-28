# AimLab: merging Chaos Aim Trainer and RefleX — analysis, Claude Design prompt, build plan

> **Status (2026-10-28): built and tested by the user (gameplay and sound, no issues found), not committed.** The design came back from Claude Design and is frozen in `aim-dev/ref/design/`. Phases A–D are done:
> - AimLab lives in `aim-dev/` (see its README) and is spliced into the userscript.
> - Chaos Aim Trainer and RefleX are removed. The switcher has 8 buttons.
> - The userscript is 27,413 lines.
>
> Checks:
> - `aim-verify.js`: 44,454 assertions.
> - `host-run.js` in real Chrome: 42 checks.
> - `ludo-dev/verify-all.js`: no new failures. Seven assertions in five suites were already failing before this change; they are listed in the decision log.

## Context

Two of the widget's oldest games test the same skill, and each has its own tab:

- **Chaos Aim Trainer**: about 380 lines at [AttendanceTimeCheckerPlus.js:13883-14262](AttendanceTimeCheckerPlus.js#L13883-L14262).
- **RefleX**: about 400 lines at [:13484-13881](AttendanceTimeCheckerPlus.js#L13484-L13881).

Both are DOM-div games sharing one `#multi-game-area`. Neither comes near Pool v2, which has a canvas engine, 2D and 3D cameras with pointer lock, a 1280×800 Max view, themed HUD tokens, a settings sheet and the `pool-dev/` test suites.

The user wants them merged into one game, **AimLab**, with:

- a custom crosshair
- a **2D mode** with a free cursor
- a **3D mode** with FPS aiming and a crosshair locked to the centre
- a Max button
- a better panel layout
- **targets that never overlap**
- an overhaul of the gameplay logic, also applied to RefleX's reaction tests

The design comes first, from a Claude Design prompt (Part 2), the same way pool's screens were done (POOL_V2_PLAN.md Appendices A–D).

**Decided with the user:**
- **Name:** *AimLab*. It replaces "Chaos Aim Trainer" and the RefleX tab, so the switcher goes from 9 buttons to 8.
- **Scenarios**, in two groups:
  - **Aim:** Chaos, Flick, Tracking, Shrink.
  - **Reaction:** Screen and Target, which are RefleX's two modes upgraded.
  - Aim scenarios run in 2D and 3D. Reaction Screen has no camera.
- **Line budget:** build it in `aim-dev/` and copy it in as one verbatim block, the same way pool is. It may use the 27k–30k reserve. The file is 26,906 lines today, and deleting RefleX gives back roughly another 450.
- **Score continuity:** the old games' records stay valid, as long as the matching scenario is played at its default settings:
  - 2D Chaos at Normal keeps `aimChaosHighScore`, the `aim` cloud board and Sharpshooter.
  - Reaction Screen and 2D Target at Normal keep `reflexHighScores`, the `reflex:screen` and `reflex:target` boards, Lightning Reflexes and RefleX's anti-cheat rules.
  - Everything else gets its own local best.

---

## Part 1: Critical analysis (today's games against Pool v2)

### Chaos Aim Trainer

| Area | Today | Pool v2 | Verdict |
|---|---|---|---|
| **Rendering** | Absolutely positioned `<div>`s. Every hit runs `querySelectorAll` and adds or removes nodes. There is no frame loop: `aimRenderFrameId` is declared but never started | One canvas with a `requestAnimationFrame` loop, DPR-aware, with a draw cache | The engine needs rebuilding. DOM targets cannot move smoothly or render in 3D |
| **"Chaos"** | `targetSpeed: 800` is never read, so targets never move | — | The name promises motion that the game doesn't have |
| **Spawning** | Uniform random positions with **no spacing check**, so targets overlap (visible in the screenshot). Targets can also spawn under the cursor | — | **Bug.** It needs a spacing guarantee |
| **ID hack** | `spawnMultipleTargets` busy-waits (`while (Date.now() === tempId)`) to get unique ids | — | It blocks the main thread. Remove it and use a counter |
| **Hit test** | A `click` event (fires on release), with 5 px of slop outside the drawn circle. Positions come from `getBoundingClientRect()` at spawn time and go stale after a resize | `pointerdown`, with coordinates mapped through the view's scale (`poolLocal`) | Hits are late, and the hitbox doesn't match the drawn target |
| **Timer** | `setInterval` in whole seconds, with drift and no countdown | Clock driven by the frame loop | Needs a 3-2-1 countdown and a frame-accurate clock |
| **Scoring** | A flat 10 points per hit, misses cost nothing, and accuracy reads 100% before the first shot | Records, tiers, per-mode splits | Too shallow to improve against |
| **Input** | The OS `cursor: crosshair` only | Pointer lock (`poolLockSet` [:10644](AttendanceTimeCheckerPlus.js#L10644)), C/L keys, 2D and 3D cameras | Crosshair and 2D/3D are both missing. Pool already has the pieces to reuse |
| **Layout** | A squeezed play area, a cramped text stats strip that repeats the header's score, and two full-width buttons | Header, cards, the viewport as the hero, an icon footer | Space is spent on chrome |
| **Max** | None | `toggleGameMaxModal` with `cfg.build` | Missing. The shared helper is ready to reuse |
| **Theme** | Inline styles: a `rgba(0,0,0,.3)` background (the flat grey in the screenshot) and a red/amber results gradient | `--pool-*` tokens over Aurora dark, Aurora light and Cyberpunk, WCAG-audited | Off-theme in every preset |

### RefleX

| Area | Today | Verdict |
|---|---|---|
| **Separate tab** | Its own switcher button, header, stats and controls, all for two short reaction tests | It belongs as scenarios inside AimLab |
| **Screen mode** | 5 rounds; click when the area changes colour. The anti-cheat is sound: an 80 ms debounce, a false start on early clicks, a fail after 3 with the remaining rounds filled at the worst time | **Keep the rules exactly as they are.** Only the presentation changes: themed wait and GO states, a "Too soon" state, per-round bars |
| **Target mode** | 8 rounds. One 60 px target in one of 5 random colours appears after a delay, and a miss counts as a false start. Same DOM and `click` problems as Aim | Use the shared spawner and renderer, `pointerdown` and the custom crosshair. In 3D it becomes a flick reaction |
| **Timing** | `Date.now()` and `setTimeout` | Use `performance.now()`, and stamp GO on the frame that first draws it, so the time measured matches what the player saw |
| **Results** | A `position:fixed` inline-styled box | A themed results screen with per-round bars, average, best and false starts |
| **Shared state** | Shares `#multi-game-area` and `gameAreaElement` with Aim, and each overwrites the other's `className` and listeners | Goes away: one root, one engine |

**In short:** both games are placeholders built on the same weak DOM base. A single canvas engine using pool's HUD pattern gives both of them every feature you asked for. RefleX's anti-cheat and both games' score records carry over unchanged.

---

## Part 2: Claude Design prompt (for you to paste)

Start a **new** Claude Design canvas named *"AimLab, compact panel, 2D and 3D"*, then paste:

```text
Design AIMLAB, a compact aim and reaction trainer for a small widget panel on a work portal, at the quality bar of a premium FPS aim trainer. It replaces two dated games, an aim trainer and a reaction-time game, whose problems are: a squished play area, cramped text stat strips, two big Play/Reset buttons eating the panel, targets that overlap each other, the OS cursor as the only crosshair, no fullscreen, and static targets in a mode called "Chaos". The name is "AimLab", written as one word.

FORMATS. Compact artboards are 400×640 with a 368-wide play viewport that must still work in a 316px column; full-view (Max) artboards are 1280×800, scaled to fit the window. The play viewport is the hero and takes most of the compact panel's height.

THEMES. The widget has two theme presets. Show every key screen in Aurora dark, and the main play screens and results also in Aurora light and Cyberpunk HUD:
- Glassmorphic Aurora: frosted glass cards (white at 8% on dark, 16% borders), Inter throughout, uppercase tracked labels, radius 14 cards / 12 controls, primary = aurora gradient (violet → blue), accent sky blue #4FACFE, hot red #FF5D73, dark backdrop radial #251F33 → #06080A; the light variant is white glass on a pale ground with slate text.
- Cyberpunk HUD: dark, neon accent (user-picked, default cyan), angular clipped corners, thin scanline/grid motifs, monospace numerals.
Text contrast at least 4.5:1, touch targets at least 44px, stroke icons only, no emoji.

COMPACT LAYOUT. A header row: the AimLab icon and name, a scenario chip that opens the scenario sheet, and the best-score/trophy button. Then a slim stat bar of four compact tiles whose content depends on the scenario group:
- Aim: TIME (a draining bar plus seconds), SCORE, ACCURACY, STREAK.
- Reaction: ROUND (3/5), LAST (ms), AVERAGE (ms), FALSE STARTS (x/3).
Numerals large, labels tiny. Then the play viewport. Then an icon footer of 44px buttons: Play/Pause (primary), Restart, 2D/3D toggle, Crosshair, Settings, Max. No full-width button pair. During a run the footer may collapse to Pause and Max so the viewport grows.

MODES (2D / 3D).
- 2D: a flat arena with a free cursor. The OS cursor is hidden and the custom crosshair follows the pointer. Targets are flat discs with a subtle rim and a centre dot.
- 3D: a first-person view into a simple room (grid floor, back wall, side walls, soft lighting) with shaded, shadowed sphere targets at depth. The crosshair is locked at the centre and mouse movement turns the camera (pointer lock). Show the "Click to lock mouse · Esc to release" state and the locked in-play state.
- Reaction Screen has no camera: the 2D/3D toggle shows as disabled there.

SCENARIOS. A sheet opened from the scenario chip, in two labelled groups. Each card has an icon, a one-line description, the length, and the player's bests (2D and 3D for aim; ms for reaction).
AIM group:
1. Chaos (the default): 3 targets at once; hit one and another spawns; at Hard they drift. 30 s.
2. Flick: one small target at a time at a random spot; measures time-to-kill.
3. Tracking: one target on smooth curved paths; keep the crosshair on it (2D: hover, 3D: hold aim). A ring fills while on target.
4. Shrink: targets appear and shrink away; a target that vanishes counts as a miss.
REACTION group (lower ms is better):
5. Screen: 5 rounds. The viewport waits in a calm state ("Wait for green…") for a random 1–4 s, then turns GO; click anywhere. Clicking early is a false start: show a distinct "Too soon" state; 3 false starts fail the run.
6. Target: 8 rounds. After a random delay one target appears; click it as fast as possible. Clicking off the target is a false start. Works in 2D and 3D (in 3D it is a flick-and-click).
Each scenario has a difficulty control: Easy / Normal / Hard (aim: target size, speed, lifetime; reaction: delay range). Only "Normal" runs post to the team leaderboard; show a small "Custom · not ranked" tag when the settings differ.

TARGETS MUST NEVER OVERLAP. One annotated artboard shows the spacing: every target keeps a clear gap from every other target and from the crosshair at spawn; in 3D the spacing is angular. Also show the spawn animation, the hit effect (a quick burst plus a "+10" popup and streak multiplier text), and the miss mark (a faint ring where the shot landed, fading).

CROSSHAIR EDITOR. A sheet with a large live preview over the 2D and 3D backgrounds: style presets (Cross, Dot, Cross + dot, Circle, T-shape), colour swatches plus custom, length, thickness, gap, outline on/off and thickness, centre dot on/off and size, opacity, and "dynamic" (opens briefly on each shot). Include a share code field ("Copy code / Paste code").

SETTINGS SHEET. Mode (2D / 3D), sensitivity with a numeric field, FOV for 3D (70–110), invert Y, sound on/off, hit sound choice, show the timer bar, target colour, background (Room / Grid / Plain).

STATES TO DRAW (compact unless noted):
1. Idle: the viewport shows the scenario name, a big Play prompt, and the last result in one line.
2. A 3-2-1 countdown over the viewport.
3. In play: 2D Chaos (three non-overlapping targets, custom crosshair, live stat bar).
4. In play: 3D Chaos, locked. 5. 3D unlocked prompt.
6. Paused (Esc), with Resume / Restart / Quit.
7. In play: Tracking (on-target ring), Flick, Shrink.
8. Reaction Screen: the wait, the GO, the round's time ("214 ms"), and "Too soon" with the false-start counter.
9. Reaction Target in 2D, and in 3D.
10. Aim results: score, accuracy, hits/shots, average reaction ms, average time-to-kill, best streak, a sparkline of hits over the run, personal-best comparison and a NEW BEST state, XP earned, then Play again / Change scenario.
11. Reaction results: one bar per round (ms), with average, best, false starts, personal-best comparison, XP, Play again; plus the failed run after 3 false starts.
12. Scenario sheet. 13. Crosshair editor. 14. Settings sheet. 15. Personal bests (every scenario × 2D/3D × difficulty, with ranked boards marked).
16. Max (1280×800): 3D Chaos in play with the HUD as overlays at the edges (stat tiles top-centre, scenario top-left, controls bottom); Max 2D Chaos; Max Reaction Screen; Max results.

Title each artboard ("A3 Play 2D", and so on), grouped under row titles: "AimLab · aim", "AimLab · reaction", "AimLab · sheets", "AimLab · full view", "AimLab · themes". Prefer reusable components (StatTile, Target, Crosshair, Viewport, Sheet, RoundBars) with variants over one-offs.
```

---

## Part 3: Build plan (after the design comes back)

### Phase A: design (you, in Claude Design)
Paste the prompt. When the design is final, copy the canvas to `aim-dev/ref/design/` with a README naming the version, the same way `pool-dev/ref/README.md` does. The copy is the reference to build from.

### Phase B: the `aim-dev/` engine
The structure follows `snake-dev/` and `pool-dev/` (load, reinsert, verify):

- **`aim-core.js`**: pure logic, with no DOM.
  - The scenario table: 4 aim and 2 reaction scenarios, each with Easy, Normal and Hard presets.
  - **The spawner.** It guarantees no overlaps by rejection sampling:
    - A new target needs `dist ≥ rA + rB + gap` from every live target, and a minimum distance from the crosshair.
    - In 3D the same test uses angles on a sphere shell.
    - It retries up to N times, then relaxes the gap.
    - Ids come from a counter.
  - Moving-target paths.
  - Scoring:
    - 2D Chaos Normal is exactly `hits × 10` over 30 s.
    - The other aim scenarios add streak, time-to-kill and reaction terms.
  - **The reaction state machine**, porting RefleX's rules exactly:
    - 5 rounds in Screen and 8 in Target, with their delays: Screen 1000–4000 ms, Target 800–3000 ms.
    - The 80 ms click debounce.
    - Early clicks are false starts, and so are off-target clicks in Target.
    - A run fails after 3 false starts, with the remaining rounds filled at `maxDelay`.
    - After a false start the round re-arms 1200 ms later, and after a hit the next round starts 300 ms later.
    - Times use `performance.now()`, and GO is stamped on the frame that first draws it.
  - Hit tests: a 2D circle with no slop beyond the drawn radius, and a 3D ray–sphere test.
- **`aim-render.js`**:
  - Canvas 2D at the device pixel ratio.
  - 3D through a yaw/pitch perspective projection, using the same approach as pool's camera (`pool-dev/pool-camera.js`). It draws the room, shaded spheres, effects, the reaction wait and GO fills, and the crosshair.
  - A crosshair renderer driven by the crosshair code.
- **`aim-ui.js`**: the HUD DOM (scenario chip, the stat tiles for each group, the icon footer), the sheets (scenarios, crosshair, settings, bests), countdown, pause and both results screens. Max is built through `toggleGameMaxModal({ build, unbuild, ... })` ([:11856](AttendanceTimeCheckerPlus.js#L11856)), following `poolBuildMax` and `poolFitMax` ([:11801-11840](AttendanceTimeCheckerPlus.js#L11801-L11840)), with `applyCyberTokens` and `applyCyberShape` as in `poolSyncMaxTheme`.
- **`aim-theme.css`**: `--aim-*` tokens mapped onto Aurora dark, Aurora light and Cyberpunk, modelled on `pool-dev/pool-theme.css`.
- **`load.js`, `reinsert.js` and `aim-verify.js`**, copied in shape from `snake-dev/`.
- **Input:**
  - `pointerdown` for shots.
  - 2D hides the OS cursor and draws the crosshair at the pointer.
  - 3D uses pointer lock and turns the camera by `movementX/Y × sensitivity`, following `poolLockSet` and `poolOnLockChange`. Esc pauses the run.
  - `aimDetach()` drops every listener, mirroring `poolDetach`.

### Phase C: host wiring in `AttendanceTimeCheckerPlus.js`

**Delete both old games:**
- **Aim:**
  - state [:233-254](AttendanceTimeCheckerPlus.js#L233-L254)
  - engine [:13883-14262](AttendanceTimeCheckerPlus.js#L13883-L14262)
  - `#aim-stats`, `#aim-controls` and `#aim-results` ([:26452](AttendanceTimeCheckerPlus.js#L26452), [:26481](AttendanceTimeCheckerPlus.js#L26481), [:26523](AttendanceTimeCheckerPlus.js#L26523))
  - `window.startAimGameBtn` and `window.resetAimGameBtn` ([:26754](AttendanceTimeCheckerPlus.js#L26754))
- **RefleX:**
  - state, about [:188-231](AttendanceTimeCheckerPlus.js#L188-L231)
  - engine [:13484-13881](AttendanceTimeCheckerPlus.js#L13484-L13881)
  - `#reflex-scoreboard`, `#reflex-stats`, `#reflex-controls` and `#reflex-results`
  - the `window.*Reflex*Btn` handlers
- **Shared and switcher:**
  - `#multi-game-area`, `gameAreaElement`, and their CSS ([:18647-18650](AttendanceTimeCheckerPlus.js#L18647-L18650), the targetPulse and bulletHoleFade keyframes)
  - the stop-game `case 'reflex'` and `case 'aim'` ([:17024-17034](AttendanceTimeCheckerPlus.js#L17024-L17034))
  - the RefleX switcher button ([:26378](AttendanceTimeCheckerPlus.js#L26378))

**Add:**
- `<div id="aim-root">`.
- `GAME_PANELS.aim` ([:17079](AttendanceTimeCheckerPlus.js#L17079)) becomes `{ el: 'aim-root', noControls: true, icon: 'g-aim', title: 'AimLab', start: initAimLab }`. Remove `GAME_PANELS.reflex`.
- `switchGame('reflex')` maps to `aim` with Reaction selected, so any stray caller still works.
- The switcher button title becomes "AimLab".
- `stopCurrentGame` gets `case 'aim': aimDetach()`.

**Keep the record paths unchanged:**
- **Aim:**
  - `awardGameXP('aim', …)` ([:17704](AttendanceTimeCheckerPlus.js#L17704))
  - `aimChaosHighScore` ([:675](AttendanceTimeCheckerPlus.js#L675)), written only by 2D Chaos at Normal
  - Sharpshooter ([:17398](AttendanceTimeCheckerPlus.js#L17398))
- **Reaction:**
  - `awardGameXP('reflex', { avgTime, bestTime, falseStarts, isHighScore })` ([:17694](AttendanceTimeCheckerPlus.js#L17694))
  - `loadReflexHighScores` and `saveReflexHighScores` ([:658](AttendanceTimeCheckerPlus.js#L658)) plus `queueScoreSync()`, written only by Screen and 2D Target at Normal
  - Lightning ([:17399](AttendanceTimeCheckerPlus.js#L17399))

**Leaderboard:**
- The `LB_BOARDS` keys `aim` and `reflex` stay, because cloud data is keyed by them. Only their labels change, to "AimLab · Chaos" and "AimLab · Reaction" ([:2141-2143](AttendanceTimeCheckerPlus.js#L2141-L2143)).
- `gameLbMode('reflex')` ([:2251](AttendanceTimeCheckerPlus.js#L2251)) reads the selected reaction scenario instead of `reflexMode`.
- AimLab's trophy button opens the board for the selected scenario: the `aim` board for Chaos and the `reflex` board for Reaction. For scenarios that have only local bests, it opens the Personal bests sheet.
- The header's `#aim-scoreboard` uses `gameScoreBtn` for both units (pts and ms).

**Storage, preferences and docs:**
- One new local key, `aimLab`: JSON holding each scenario × mode × difficulty best, plus the crosshair code and settings. Add it to the backup list at [:785](AttendanceTimeCheckerPlus.js#L785).
- Default mode and sensitivity go through `sel()` in ⚙️.
- The features list ([:24844-24847](AttendanceTimeCheckerPlus.js#L24844-L24847)) merges into one AimLab line.
- The `currentGame` comment ([:187](AttendanceTimeCheckerPlus.js#L187)) is updated.
- Start a living plan, `AIMLAB_PLAN.md`, with progress and a decision log, as for pool. Code comments stay terse.

### Phase D: budget check
Run `wc -l` after the reinsert. Roughly +2k is added and about 850 deleted. The target is to stay below about 28,500 lines. If it gets close, stop and tell you before using more of the reserve.

---

## Verification
Use `"C:/Program Files/nodejs/node.exe"`; bare `node` is v10.

1. `aim-dev/aim-verify.js` checks:
   - **The spawner.** 20,000 spawns for every scenario and difficulty, at viewport sizes 316, 368 and 1280×800, in 2D and 3D: **zero overlaps**, and the gap from the crosshair holds.
   - **Aim scoring.** 2D Chaos Normal gives `score === hits × 10` with a 30 s clock.
   - **Reaction parity.** Scripted click streams through the new state machine and through RefleX's old rules give the same results: debounce, false start, a fail after 3 with penalty filling, and the same average and best.
   - **3D hits.** Rays at the edge of a sphere hit, and rays just outside it miss.
   - **The splice.** `reinsert.js --check` finds the copy byte-identical.
2. In real Chrome, a `host-run`-style script adapted from `pool-dev/host-run.js` (CDP):
   - Boot the widget. There are 8 switcher buttons and no RefleX tab.
   - Play 2D Chaos: `aimChaosHighScore` and XP update.
   - Play Reaction Screen: `reflexHighScores.screen` and XP update, and the `reflex` board opens from the trophy.
   - Open and close Max.
   - Switch games mid-run and confirm no leaked listeners or animation frames.
   - Take snapshots in Aurora dark, Aurora light and Cyberpunk.
3. A theme audit modelled on `pool-dev/theme-verify.js`: WCAG AA contrast on every HUD state.
4. By hand:
   - 3D pointer lock: entering, Esc to pause, and resuming.
   - Sensitivity feel.
   - The crosshair editor, including copying and pasting a code.
   - The team leaderboard still shows both boards with their existing scores.

---

## Decision log

| Date | Decision | Why |
|---|---|---|
| 2026-10-28 | **The compact top row is the scenario chip and the bests button only.** The brand appears only in Max | The widget header above the panel already shows the game title and the team-board button |
| 2026-10-28 | **The panel height is `100cqw × 438/368 + 170 px`** | The viewport keeps the design's 368:438 at every column width, including 294 px in the real widget. The rows around it are fixed |
| 2026-10-28 | **3D sizes are angles:** Chaos 6.5°, Flick 3.8°, Tracking and Shrink 7°, Target 8° radius, at the 95° default FOV | These match the design's 30–52 px targets in a 368 px viewport. The first cut (2.6°) drew 6 px spheres |
| 2026-10-28 | **Chaos is always hits × 10.** The popup shows STREAK n with no multiplier | This follows the canvas note "Chaos Normal is hits × 10" and keeps the ranked board's meaning. The other scenarios pay the design's multiplier: 4 ×1.25, 6 ×1.5, 9 ×2 |
| 2026-10-28 | **The aim XP table stays Chaos's.** The other scenarios award XP on a Chaos-sized score: Flick and Shrink on hits × 10, Tracking on score / 3. Easy pays half. Sharpshooter's accuracy is passed only from Chaos Normal | `awardGameXP('aim')` is host code, tuned to Chaos. Without this, Tracking's larger scores would max out XP |
| 2026-10-28 | **A failed reaction run (3 false starts) is not posted** | Design R9 says "Not posted". RefleX used to store a best round from a failed run |
| 2026-10-28 | **A click on GO before the frame has painted it is a false start** | Nobody could have seen it. RefleX counted it as a reaction |
| 2026-10-28 | **The stacked re-arm timers from RefleX are not reproduced** | RefleX queued a new 1.2 s re-arm on every false start without clearing the old one, so two rounds could arm at once. That was a bug. The parity runs use scripts with one click per cool-off |
| 2026-10-28 | **`aimLab` is not in `ACCOUNT_KEYS`** | That list is what a logout clears so the cloud record can restore it. AimLab's local bests aren't in the cloud record, so adding the key would wipe them on logout |
| 2026-10-28 | **The leaderboard keys `aim` and `reflex` stay; only their labels change**, to AimLab and Reaction | Cloud data is keyed by them. `gameLbMode('reflex')` now reads `aimReactLbMode()` |
| 2026-10-28 | **Moving a live 3D run into or out of Max pauses it** | Moving the viewport drops the pointer lock, and taking the lock back needs a click |
| 2026-10-28 | **Seven existing assertions were already failing before this change** and are left alone: `BUILD_LABEL` v11, the emoji check, the colour row's eight swatches, the `ludoRecord` restore, and the pool and snooker board tiers | A before/after run of `verify-all.js` showed the same seven failing in both |
| 2026-10-28 | **One header button and one tabbed team board** with Chaos, Screen and Target. The in-panel trophy is now an icon that opens Personal bests; Max still shows the number | The user saw two score buttons, and the header one showed only the old Chaos record. Pool and Snake group their boards by mode. The Screen and Target tabs read RefleX's records through `lbBoardValue`, so cloud data is unchanged. `lbLower` ranks those two tabs low first |
| 2026-10-28 | **Cyberpunk fixes.** The tracked labels close up from 0.12em to 0.03em; HITS/SHOTS and REACTION are shorter; the legend lost its negative margin; the sheet uses the game tabs' scrollbar | The user reported clipped text and a heavy scrollbar in Cyberpunk |
| 2026-10-28 | **The sound bank is shared with pool and snooker** (`sfxPlay`, `sfxTone` and `sfxNoise` in the host), under one ⚙️ *Game Sounds* switch | The user asked for pool and snooker sound in one go; see POOL_V2_PLAN.md, *Sound design for pool and snooker* |
