# Design reference

`design/` is a frozen copy of the Claude Design canvas *"Design AIMLAB compact trainer"*
(<https://claude.ai/design/p/94f70deb-157f-44b0-a110-635483f451e5>), copied 2026-10-28 through
the `DesignSync` tool (`get_project` → `list_files` → `get_file`). No file was truncated.

Build against this copy, not the live canvas. The `.dc.html` files render only inside the Design
editor; read them for exact numbers, tokens and layer order.

| file | what it is |
|---|---|
| `Canvas.dc.html` | the index: rows A1–A14 (aim), A12 spawn rules, A13 spawn/hit/miss timing, R1–R9 (reaction), S1–S4 (sheets), F1–F4 (Max), L1–L5 (Aurora light), C1–C6 (Cyberpunk) |
| `AimPanel.dc.html` | the compact 400×640 panel: header chip, stat tiles, footer, every scene and the four sheets |
| `AimViewport.dc.html` | the play viewport in every state; holds the theme tokens, the 3D room geometry and the overlay layouts |
| `AimMax.dc.html` | the 1280×800 full view |
| `Target.dc.html` | disc, sphere, hit burst, tracking ring, shrink ghost |
| `Crosshair.dc.html` | the five crosshair styles, driven by one config |

`support.js` (the Design runtime) and the three `uploads/*.png` were not copied.

**Deliberate departures**, recorded in `AIMLAB_PLAN.md`:
- **The page's own title.** The widget's header already shows the game title, so the compact top row is just the scenario chip and the bests button. The brand mark appears only in Max.
- **The Cyberpunk primary.** It is the widget's `--rt-text` fill, as in pool, not an accent fill.
- **The Chaos popup.** It shows "+10 · STREAK n" without a multiplier, as the canvas's own note says ("Chaos Normal is hits × 10").
