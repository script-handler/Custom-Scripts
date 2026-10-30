# `shell-dev/`: ATCShell.js, the portal-wide companion

`ATCShell.js` (repo root) is fetched and run by `AttendanceTimeCheckerPlus.js` (`loadShell()`) on every portal route. The widget's side is the bridge in `bridge.js` (exact find/replace steps, bound into the widget on 2026-10-30); the dev tools apply it in memory if the widget is ever unbound again. It follows the **ATC Shell v2** design (M3 Expressive) and does four things:

- adds a navbar time chip (a split button) whose popover is a mini widget: countdown, wavy shift progress, streak, level and XP
- replaces the Timeline profile card's Actual/Active row with a time card: a ring, the countdown and four values
- themes Timeline and Attendance from the widget's own **Display Theme**. This is **Plus**, and its Settings › Theme › **Web Theme** toggle (pref `webTheme`, shown to Plus only) turns it off; off, or without Plus, `unskin()` takes every page mark back off and only the widget is themed (the chip and time card stay). The loader belongs to it too:

  | Display Theme | M3 family | Light/dark |
  |---|---|---|
  | Glassmorphic | Aurora | follows the browser |
  | Material You | Material You | follows the browser |
  | Cyberpunk | Cyberpunk, built from the widget's 8 cyber colours | always dark |
  | Just Business | Business | always light |

- provides the Material You theme for the widget panel

It has no settings of its own. It reads `attendancePrefs` and Plus (`ATC.plus`, the widget's `gamesOpen`) through the bridge and `userXP` from localStorage. host-run.js and compare.js store a Plus grant before each load (the gist is out of their reach, so it stands). A fresh browser off Attendance pulls the account's prefs from the gist (`prefsFromGist`).

```
"C:/Program Files/nodejs/node.exe" shell-dev/bridge.js              # anchors still match the widget?
"C:/Program Files/nodejs/node.exe" shell-dev/gen-tokens.js          # rebuild ATCShell.js's <gen:tokens> block from ref/design-v2
"C:/Program Files/nodejs/node.exe" shell-dev/host-run.js [outDir]   # stand-in portal, ~65 checks + PNGs
"C:/Program Files/nodejs/node.exe" shell-dev/compare.js [outDir] [--only=tl|att] [--themes=my-light,...]   # design | ours report
    # --slugs=1   print each Timeline card's atc-c-<slug> and box (first theme)
    # --eval=f.js print the result of evaluating f.js on our side (first theme), for DOM questions
    # --loader=1  inject a blockUI page block + an inline loader gif, crop loader-<theme>-<ms>.png frames with motion on
```

## Matching the design
- **`compare.js`** renders two sides at 1920 for each theme, then writes `compare-out/compare.html`:
  - **Design side:** Screens v2's own files from `ref/design-v2`, with the Claude Design runtime and React vendored in `vendor/`. Google Fonts load live.
  - **Our side:** the real EGP page captured in `ref/egp/`, with the bridged widget and the local `ATCShell.js`.
- **`capture-egp.js`** makes those captures. Paste it into DevTools on Timeline and on Attendance, then move the two downloads into `ref/egp/`. They hold personal data and are gitignored. Capture with `atcDev` off.
- **`GAPS.md`** is the ledger, with one row per design element. A row is `verified-live` only when compare.js and a live screenshot agree.

`ref/design-v2/` is the design export from Claude Design. Only the v2 files are kept: `x-tokens.css`, `x-schemes.js`, the `X*` components and `Timeline v2`. `gen-tokens.js` takes from it the colour schemes and the 21 shapes the themes use, resampled to 60 points (the export's set is ~40 KB). Cyberpunk is built at runtime from the user's palette (`cyber()` in the shell), not from the export.

`host-run.js` serves a stand-in portal styled by the real EGP stylesheets (bootstrap 5.0.2, `style.css`,
`EnhancedStyle.css`) read from the Global Portal repo; set `EGP_WEB` to its `Content` folder if it moves. It
intercepts the time API (`/api/Home/getDashboardPerformanceRecord`) and the shell's GitHub URL. It blocks Google
Fonts, so its PNGs show fallback type, not Roboto Flex, Sora or Chakra Petch. Set `DBG` to a JS expression to print it
after the first Timeline load and stop.

## Testing on the live portal before a push

`serve.js` serves your local files on `http://localhost:8737`. It sends the widget **with the bridge applied in memory** (the file on disk is untouched), with its shell URL pointed at the local `ATCShell.js`. Both are read fresh on each request, so a reload picks up edits.

1. Start it: `"C:/Program Files/nodejs/node.exe" shell-dev/serve.js`
2. In the User JavaScript and CSS entry for `https://globalportal.mtbc.com/*`, replace the loader once with this one. It behaves exactly like the published loader unless `atcDev` is set:
   ```javascript
   (async () => {
     const gh = "https://raw.githubusercontent.com/script-handler/Custom-Scripts/refs/heads/main/AttendanceTimeCheckerPlus.js";
     let code = null;
     if (localStorage.getItem('atcDev')) try {   // local copies from shell-dev/serve.js
       const r = await fetch('http://localhost:8737/AttendanceTimeCheckerPlus.js?v=' + Date.now());
       if (r.ok) code = await r.text(); else console.warn('ATC dev server:', r.status, await r.text());
     } catch (e) { console.warn('ATC dev server is down; using GitHub', e); }
     if (!code) code = await (await fetch(gh + '?v=' + Date.now())).text();
     eval(code);
   })();
   ```
3. On the portal, in DevTools: `localStorage.setItem('atcDev', '1')`, then reload. If Chrome asks to let the site reach devices on your local network, allow it.
4. To go back to the published version: `localStorage.removeItem('atcDev')` and reload.

The local copy runs against your real account: XP, the gist sync and the leaderboard behave as they would after a push.

What to check:
- open Attendance by clicking through the portal (not a reload): both punch-log sessions show, not only "Day total"
- go to Timeline and back: the same panel returns with its game state, and the sessions are still there
- a full reload on Attendance still works, and Submit with another Date Criteria still updates the panel
- the chip and popover on Timeline and on another route, and the Timeline time card
- each Display Theme (Glassmorphic, Material You, Business, Cyberpunk with a couple of palettes) in light and dark OS mode
- the real cards, sidebar, side-nav, Select Member / Date Criteria fields and the table: the harness only has a simplified copy

To try just a different shell build, set `localStorage.atcShellUrl` to its URL.
