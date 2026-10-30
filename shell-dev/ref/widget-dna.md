# ATC Plus widget: design DNA (reference for ATC Shell designs)

These values are extracted from `AttendanceTimeCheckerPlus.js` (1.8 MB, ~28k lines), so you don't need to read the whole file.
Full source: https://raw.githubusercontent.com/script-handler/Custom-Scripts/refs/heads/main/AttendanceTimeCheckerPlus.js
Where things live in the source:
- line ~19056: aurora and glass panel
- lines ~19400–19430: `--att-*` tokens
- line ~26229: Just Business
- line ~27056: `CYBER_PALETTES`

## What the widget is
The widget is a playful, gamified companion that sits inside a sober corporate HR portal. It is the fun layer of the employee's day, not more enterprise UI:
- **Countdown:** a big "Time until freedom" timer and "Complete at" time, an emoji mood path that changes as the shift progresses, and a day timeline bar.
- **Progression:** XP, levels, streaks, 28 achievements, an online leaderboard, and XP milestone toasts.
- **Mini-games:** Snake (with skins), Breakout, Flappy Bird, Tetris, Pool (with table cloths and a 3D cue) and Ludo (3 CPU tiers, hot-seat).
- **Float:** the panel pops out into a Picture-in-Picture window.
- **Prayer times:** shown with a quick "+" action.
- **Settings modal** with General / Theme / Cue Games / Ludo tabs. Its Theme tab offers:
  - Display Theme
  - Neumorphic Depth (Glassmorphic only)
  - Fluid Gradients (Glassmorphic only)
  - Cyberpunk Palette, eight custom colours, Glow Intensity, Panel Shape and Background Image (Cyberpunk only)

## Themes: these exact colours are the source of truth

### Glassmorphic Aurora (default): dark, or light under `prefers-color-scheme: light`
- **Aurora gradient stops:** #667EEA, #764BA2, #F093FB, #4FACFE. Animated "fluid gradients" drift behind the panel.
- **Panel:** frosted glass, `blur(28px) saturate(160%)`, 24px radius, a 1px white rim, an inner top highlight, and 22px-radius inner cards.
- **Display font:** Sora; body font: Inter.

| token | dark | light |
|---|---|---|
| panel | #24202F | #F6F4FC |
| card | rgba(36,32,48,.72) | rgba(255,255,255,.62) |
| border | rgba(255,255,255,.09) | rgba(255,255,255,.85) |
| text | #EEEAF6 | #1E1B2E |
| muted | #A8A2B8 | #5B5670 |
| **accent** | **#8B78F0** | **#6D5BD0** |
| on-accent | #14111F | #FFFFFF |
| ink (accent text) | #B3A6FF | #5A47BF |
| track | #2E2A3B | #D9D5E8 |
| ok / danger | #5FD3A1 / #FF8A95 | #1E8A5A / #B3261E |
| low / tense / void | #7CB8FF / #FFB86B / #B9A8FF | #1F5FBF / #9A5200 / #5B3FB8 |
| up / run / home | #5FD3A1 / #FFC857 / #FF8FA3 | #1E7A50 / #8A5300 / #B0164E |
| shadow | 0 12px 32px rgba(0,0,0,.35) | 0 12px 32px rgba(60,40,120,.14) |

### Cyberpunk HUD (always dark; the user picks a palette or sets all 8 colours)
- **Fonts:** Chakra Petch for display; Orbitron and Share Tech Mono for HUD numerals.
- **Look:** glow (adjustable intensity), hazard stripes, scanlines, angular "panel shape" options, and an optional background image.
- **Status colours:** ok #00F0A8, danger #FF5A6E, low #00E5FF, tense #F8E71C, void #B388FF, home #FF2BD6.

| palette | bg | bg-2 | accent | highlight | panel tint | text | glow | border |
|---|---|---|---|---|---|---|---|---|
| Yellow / Cyan (default) | #07091A | #11142B | #FFF200 | #00E5FF | #00E5FF | #FFF200 | #FFF200 | #FFF200 |
| Blade Amber | #0B0705 | #1C1209 | #FFA227 | #FFD08A | #C9741F | #FFCF9B | #FF8C1A | #E2872B |
| Magenta Noir | #0A0512 | #170A26 | #FF2A6D | #D16BFF | #8A2BE2 | #FFD6E8 | #FF2A6D | #FF5C94 |
| Acid Green | #04100A | #082114 | #05FFA1 | #B4FF3A | #00C98A | #C8FFE6 | #05FFA1 | #3AFFB0 |
| Ghost Mono | #0C0C0F | #16161C | #9AA4B8 | #E6EBF5 | #6B7488 | #EEF2FA | #C3CCDD | #7D879C |
| Violet Haze | #0B0616 | #180D2C | #C88BF5 | #E3B8FF | #7C3AED | — | — | — |

### Just Business (light only, whatever the OS scheme, and no motion)
- **Look:** flat, matching the portal itself.
- **Fonts:** Segoe UI / Roboto.
- **Colours:**
  - page #EEF2F6; panel #FFFFFF; border #E3E8EF
  - text #2B2B2B; muted #6B7280
  - accent #1E88E5; ink #1565C0; track #E3EAF3; inner #F5F8FC
  - active tab #E3F2FD with a #90CAF9 border
- **Shape and shadow:** radius 10px (8px on cards); shadow 0 1px 3px rgba(16,24,40,.08).

### Material You (new, defined by this project)
Google's M3 baseline: primary #0B57D0 (light) and #A8C7FA (dark), as used in Google Workspace. It follows the OS light/dark setting.

## Rule
For each theme, the M3 `primary` role must be that theme's accent, exactly as listed above, not a tone derived from it. Generate everything else around it with a fidelity-preserving scheme (Fidelity / Content, or Expressive for Material You).
