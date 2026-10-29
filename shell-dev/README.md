# `shell-dev/`: ATCShell.js, the portal-wide companion

`ATCShell.js` (repo root) is fetched and run by `AttendanceTimeCheckerPlus.js` (`loadShell()`) on every portal
route. It does four things:

- adds the navbar time chip
- replaces the Timeline profile card's Actual/Active row with a cog strip
- themes Timeline and Attendance from the widget's own **Display Theme**, light or dark with the browser (Cyberpunk is always dark)
- provides the Material You theme

It has no settings of its own. It reads `attendancePrefs` through the bridge. A fresh browser off Attendance pulls the account's prefs from the gist (`prefsFromGist`).

```
"C:/Program Files/nodejs/node.exe" shell-dev/host-run.js [outDir]   # stand-in portal, ~25 checks + PNGs
```

`host-run.js` serves a stand-in portal styled by the real EGP stylesheets (bootstrap 5.0.2, `style.css`,
`EnhancedStyle.css`) read from the Global Portal repo; set `EGP_WEB` to its `Content` folder if it moves. It
intercepts the time API (`/api/Home/getDashboardPerformanceRecord`) and the shell's GitHub URL.

To try a dev copy of the shell on the live portal, set `localStorage.atcShellUrl` to its URL.
