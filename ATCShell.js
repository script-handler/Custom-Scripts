// ATCShell.js: portal-wide companion to AttendanceTimeCheckerPlus.js, run by its loadShell() as new Function('ATC', code).
// Design: ATC Shell v2 (M3 Expressive). Navbar time chip + popover, the Timeline time card, the web theme (Plus, pref
// webTheme: Timeline, Attendance and the loader follow the widget's Display Theme) and Material You for the widget panel.
// ATC is the widget's bridge: prefs() shift() fmt() att() onAtt() plus(); this file adds tick(att) and apply().
'use strict';
const D = document, H = D.documentElement, P = () => ATC.prefs();
const style = (id, css) => { let s = D.getElementById(id); if (css == null) { if (s) s.remove(); return; } if (!s) { s = D.createElement('style'); s.id = id; D.head.appendChild(s); } if (s.textContent !== css) s.textContent = css; };
const put = (el, v) => { if (el && el.textContent !== v) el.textContent = v; };
const cls = (el, v) => { if (el && el.className !== v) el.className = v; };
const route = () => ATC.onAtt() ? 'att' : /^#\/home(\/Timeline)?$/i.test(location.hash.split('?')[0]) ? 'tl' : '';
const hms = s => s == null ? '–:––:––' : ATC.fmt(Math.max(0, Math.round(s))).replace(/^0(?=\d)/, '');
const hm = s => hms(s).replace(/:\d\d$/, '');
const clock = ms => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const lsJSON = k => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (_) { return {}; } };

// TIME: today's Actual/Active from the Home dashboard API (the host's personal-info card). "H.MM" strings, a
// 1-digit minute ×10 like the host. Ticks on locally while checked in, never after check-out (the host's L419 bug does).
const SNAP = 'attSnap', AGE = 300000;
let snap = null, busy = false, due = 0, err = false;
try { snap = JSON.parse(sessionStorage.getItem(SNAP)); } catch (_) {}
const hmSec = s => { if (!s || s === '-') return null; const [h, m = '0'] = String(s).split('.'); return (+h * 60 + (m.length === 1 ? +m * 10 : +m)) * 60; };
function pull() {
    const tok = sessionStorage.getItem('authToken'); if (busy || !tok) return; busy = true;
    const d = new Date(), ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getDate();
    fetch('/api/Home/getDashboardPerformanceRecord', { method: 'POST', body: JSON.stringify({ from_date: ds, food_menu_date: ds }),
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok, currentUser: sessionStorage.getItem('authUser') || '' } })
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(j => { const a = (j._ActualActiveTime || [])[0] || {}, c = (j._Total_Checkin_Hours || [])[0] || {};
            snap = { act: hmSec(a.Actual_Time), actv: hmSec(a.Active_Time), live: !!c.checkin && c.checkin !== '-' && (!c.checkout || c.checkout === '-'), out: c.checkout && c.checkout !== '-' ? c.checkout : '', t: Date.now() };
            err = false; try { sessionStorage.setItem(SNAP, JSON.stringify(snap)); } catch (_) {} })
        .catch(e => { err = true; console.warn('ATCShell: time fetch', e); }).finally(() => { busy = false; });
}
// On Attendance the widget's own scrape is exact for Actual and the live state; Active is the API's either way.
// st: live | over | out | none | wait (first fetch) | error (no times newer than 15 min).
function times() {
    const a = ATC.att(), onA = ATC.onAtt() && a.worked >= 0, live = onA ? a.live : !!(snap && snap.live);
    const el = live && snap ? (Date.now() - snap.t) / 1000 : 0, act = onA ? a.worked : snap && snap.act != null ? snap.act + el : null;
    const actv = snap && snap.actv != null ? Math.min(snap.actv + el, act == null ? Infinity : act) : null;
    const shift = ATC.shift(), left = act == null ? null : shift - act, stale = err && !onA && (!snap || Date.now() - snap.t > 900000);
    const st = stale ? 'error' : !onA && !snap ? 'wait' : live ? (left <= 0 ? 'over' : 'live') : act ? 'out' : 'none';
    return { act, actv, live, shift, left, st };
}

// <gen:tokens> from shell-dev/ref/design-v2 by shell-dev/gen-tokens.js; regenerate, don't edit.
const ROLES = 'primary on-primary primary-container on-primary-container inverse-primary secondary on-secondary secondary-container on-secondary-container tertiary on-tertiary tertiary-container on-tertiary-container error on-error error-container on-error-container surface surface-dim surface-bright surface-container-lowest surface-container-low surface-container surface-container-high surface-container-highest on-surface on-surface-variant outline outline-variant inverse-surface inverse-on-surface scrim shadow'.split(' ');
const ST = 'ok ok-container on-ok-container danger danger-container on-danger-container low low-container on-low-container tense tense-container on-tense-container void void-container on-void-container home home-container on-home-container'.split(' ');
const SCHEMES = { // ROLES, ST, then ink fill on-fill track
    'my-light': '#0B57D0 #FFFFFF #D3E3FD #041E49 #A8C7FA #00639B #FFFFFF #C2E7FF #001D35 #146C2E #FFFFFF #C4EED0 #072711 #B3261E #FFFFFF #F9DEDC #410E0B #FFFFFF #D3DBE5 #FFFFFF #FFFFFF #F8FAFD #F0F4F9 #E9EEF6 #DDE3EA #1F1F1F #444746 #747775 #C4C7C5 #303030 #F2F2F2 #000000 #000000 #1E8A5A #99FDC3 #004529 #B3261E #FFE2DD #7E0004 #1F5FBF #E0E8FF #00397F #9A5200 #FFE3D0 #5D2F00 #5B3FB8 #ECE4FF #401E9C #B0164E #FFE1E5 #7B0032 #0B57D0 #0B57D0 #FFFFFF #C2E7FF',
    'my-dark': '#A8C7FA #062E6F #0842A0 #D3E3FD #0B57D0 #7FCFFF #003355 #004A77 #C2E7FF #6DD58C #0A3818 #0F5223 #C4EED0 #F2B8B5 #601410 #8C1D18 #F9DEDC #131314 #131314 #37393B #0E0E0E #1B1B1B #1E1F20 #282A2C #333537 #E3E3E3 #C4C7C5 #8E918F #444746 #E3E3E3 #303030 #000000 #000000 #5FD3A1 #00452E #85F8C4 #FF8A95 #701B2A #FFDADB #7CB8FF #003D6C #D2E4FF #FFB86B #583300 #FFDCBC #B9A8FF #3E2E7C #E7DEFF #FF8FA3 #6E1D31 #FFD9DD #A8C7FA #A8C7FA #062E6F #004A77',
    'aurora-light': '#6D5BD0 #FFFFFF #E5DEFF #1A0063 #B3A6FF #00629F #FFFFFF #D0E4FF #001D34 #8E3B9C #FFFFFF #FFD6FE #350040 #B3261E #FFFFFF #FFDAD6 #93000A #F6F4FC #DDD8EC #FFFFFF #FFFFFF #FBFAFE #F1EEFA #EAE6F6 #E2DDF1 #1E1B2E #5B5670 #79738E #D9D5E8 #312F37 #F4EFF9 #000000 #000000 #1E8A5A #99FDC3 #004529 #B3261E #FFE2DD #7E0004 #1F5FBF #E0E8FF #00397F #9A5200 #FFE3D0 #5D2F00 #5B3FB8 #ECE4FF #401E9C #B0164E #FFE1E5 #7B0032 #5A47BF #6D5BD0 #FFFFFF #D9D5E8',
    'aurora-dark': '#8B78F0 #14111F #4730A7 #E5DEFF #6D5BD0 #9BCBFF #003256 #004A7A #D0E4FF #F8ACFF #570066 #731F82 #FFD6FE #FF8A95 #690005 #93000A #FFDAD6 #24202F #1A1724 #3E3850 #1A1724 #2A2536 #2F2A3D #363046 #3E3850 #EEEAF6 #A8A2B8 #8A8499 #46405A #E5E0EB #312F37 #000000 #000000 #5FD3A1 #00452E #85F8C4 #FF8A95 #701B2A #FFDADB #7CB8FF #003D6C #D2E4FF #FFB86B #583300 #FFDCBC #B9A8FF #3E2E7C #E7DEFF #FF8FA3 #6E1D31 #FFD9DD #B3A6FF #8B78F0 #14111F #2E2A3B',
    'biz-light': '#1E88E5 #FFFFFF #E3F2FD #0D47A1 #A2C9FF #1565C0 #FFFFFF #E3F2FD #0D47A1 #8F4A00 #FFFFFF #B35E00 #FFFBFF #B3261E #FFFFFF #FFDAD6 #93000A #FFFFFF #E3E8EF #FFFFFF #FFFFFF #F5F8FC #EEF2F6 #E8EDF3 #E3EAF3 #2B2B2B #6B7280 #8A94A3 #E3E8EF #2B2B2B #F5F8FC #000000 #000000 #1E8A5A #99FDC3 #004529 #B3261E #FFE2DD #7E0004 #1F5FBF #E0E8FF #00397F #9A5200 #FFE3D0 #5D2F00 #5B3FB8 #ECE4FF #401E9C #B0164E #FFE1E5 #7B0032 #1565C0 #1565C0 #FFFFFF #E3EAF3'
};
const SHAPES = { // x y in %, 60 points each
    'circle': '50 0,55 0,60 1,65 2,70 4,75 7,79 10,83 13,87 17,90 21,93 25,96 30,98 35,99 40,100 45,100 50,100 55,99 60,98 65,96 70,93 75,90 79,87 83,83 87,79 90,75 93,70 96,65 98,60 99,55 100,50 100,45 100,40 99,35 98,30 96,25 93,21 90,17 87,13 83,10 79,7 75,4 70,2 65,1 60,0 55,0 50,0 45,1 40,2 35,4 30,7 25,10 21,13 17,17 13,21 10,25 7,30 4,35 2,40 1,45 0',
    'square': '50 0,56 0,62 0,68 0,74 0,80 1,86 2,91 5,95 9,98 14,99 20,100 26,100 32,100 38,100 44,100 50,100 56,100 62,100 68,100 74,99 80,98 86,95 91,91 95,86 98,80 99,74 100,68 100,62 100,56 100,50 100,44 100,38 100,32 100,26 100,20 99,14 98,9 95,5 91,2 86,1 80,0 74,0 68,0 62,0 56,0 50,0 44,0 38,0 32,0 26,1 20,2 14,5 9,9 5,14 2,20 1,26 0,32 0,38 0,44 0',
    'slanted': '50 0,56 0,62 0,68 0,74 0,80 0,86 0,92 1,97 4,98 9,98 15,97 21,97 27,96 33,95 39,94 45,94 51,93 57,92 63,91 69,91 75,90 81,89 86,88 92,85 97,80 100,74 100,68 100,62 100,56 100,50 100,44 100,38 100,32 100,26 100,20 100,14 100,8 99,3 96,2 91,2 85,3 79,3 73,4 67,5 61,6 55,6 49,7 43,8 37,9 31,9 25,10 19,11 14,12 8,15 3,20 0,26 0,32 0,38 0,44 0',
    'oval': '50 5,55 3,60 1,65 0,70 0,75 0,80 1,85 3,90 6,93 9,96 13,98 18,100 23,100 28,100 34,99 39,98 44,96 49,94 53,92 58,89 62,86 67,83 71,79 75,76 78,72 82,68 85,64 88,59 91,55 93,50 95,45 97,40 99,35 100,30 100,25 100,20 99,15 97,10 94,7 91,4 87,2 82,0 77,0 72,0 66,1 61,2 56,4 51,6 47,8 42,11 38,14 33,17 29,21 25,24 22,28 18,32 15,36 12,41 9,45 7',
    'pill': '50 7,54 4,59 2,64 1,69 0,74 0,78 1,83 3,87 6,91 9,94 13,97 17,99 22,100 27,100 32,99 37,98 42,96 46,93 50,89 54,86 57,82 61,79 65,75 68,71 72,68 75,64 79,61 82,57 86,54 90,50 93,46 96,41 98,36 99,31 100,26 100,22 99,17 97,13 94,9 91,6 87,3 83,1 78,0 73,0 68,1 63,2 58,4 54,7 50,11 46,14 43,18 39,21 35,25 32,29 28,32 25,36 21,39 18,43 14,46 10',
    'diamond': '50 0,54 2,57 5,60 8,63 11,65 15,68 18,71 22,74 25,76 29,79 32,82 35,85 39,87 42,90 46,91 50,90 54,87 58,85 61,82 65,79 68,76 71,74 75,71 78,68 82,65 85,63 89,60 92,57 95,54 98,50 100,46 98,43 95,40 92,37 89,35 85,32 82,29 78,26 75,24 71,21 68,18 65,15 61,13 58,10 54,9 50,10 46,13 42,15 39,18 35,21 32,24 29,26 25,29 22,32 18,35 15,37 11,40 8,43 5,46 2',
    'pentagon': '50 2,55 3,59 6,64 9,68 12,72 15,76 18,80 21,85 24,89 27,93 30,97 33,99 38,100 43,99 48,97 53,96 58,94 63,92 67,91 72,89 77,88 82,86 87,84 92,81 96,76 98,71 98,66 98,60 98,55 98,50 98,45 98,40 98,34 98,29 98,24 98,19 96,16 92,14 87,12 82,11 77,9 72,8 67,6 63,4 58,3 53,1 48,0 43,1 38,3 33,7 30,11 27,15 24,20 21,24 18,28 15,32 12,36 9,41 6,45 3',
    'gem': '50 0,55 1,59 4,63 6,67 9,71 12,76 14,80 17,84 20,88 22,91 26,92 31,92 36,92 41,92 46,92 51,92 56,92 61,92 66,92 71,91 75,88 79,84 82,80 85,76 88,72 90,68 93,64 96,60 98,55 100,50 100,45 100,40 98,36 96,32 93,28 90,24 88,20 85,16 82,12 79,9 75,8 71,8 66,8 61,8 56,8 51,8 46,8 41,8 36,8 31,9 26,12 22,16 20,20 17,24 14,29 12,33 9,37 6,41 4,45 1',
    'sunny': '50 0,55 2,59 5,63 8,68 11,73 12,78 12,83 13,87 17,88 22,88 27,89 32,92 37,95 41,98 45,100 50,98 55,95 59,92 63,89 68,88 73,88 78,87 83,83 87,78 88,73 88,68 89,63 92,59 95,55 98,50 100,45 98,41 95,37 92,32 89,27 88,22 88,17 87,13 83,12 78,12 73,11 68,8 63,5 59,2 55,0 50,2 45,5 41,8 37,11 32,12 27,12 22,13 17,17 13,22 12,27 12,32 11,37 8,41 5,45 2',
    'cookie4': '50 0,55 1,60 2,64 5,67 8,71 12,74 16,77 19,81 23,84 26,88 29,92 33,95 36,98 40,99 45,100 50,99 55,98 60,95 64,92 67,88 71,84 74,81 77,77 81,74 84,71 88,67 92,64 95,60 98,55 99,50 100,45 99,40 98,36 95,33 92,29 88,26 84,23 81,19 77,16 74,12 71,8 67,5 64,2 60,1 55,0 50,1 45,2 40,5 36,8 33,12 29,16 26,19 23,23 19,26 16,29 12,33 8,36 5,40 2,45 1',
    'cookie6': '50 7,55 6,60 5,65 5,70 5,75 7,79 10,82 14,84 19,85 24,87 28,90 33,94 36,97 41,99 45,100 50,99 55,97 59,94 64,90 67,87 72,85 76,84 81,82 86,79 90,75 93,70 95,65 95,60 95,55 94,50 93,45 94,40 95,35 95,30 95,25 93,21 90,18 86,16 81,15 76,13 72,10 67,6 64,3 59,1 55,0 50,1 45,3 41,6 36,10 33,13 28,15 24,16 19,18 14,21 10,25 7,30 5,35 5,40 5,45 6',
    'cookie9': '49 2,54 0,59 1,63 3,67 7,71 11,76 13,81 14,86 16,89 20,90 25,90 31,92 36,95 40,98 45,99 50,98 55,95 59,92 63,90 68,90 74,89 79,87 84,82 86,77 87,72 89,68 92,64 96,60 99,54 100,49 98,45 96,40 94,34 95,29 95,24 94,20 90,18 86,15 81,12 77,7 74,3 71,1 66,1 61,3 56,4 50,3 45,1 40,1 35,3 30,7 26,11 24,15 20,17 15,19 10,23 6,28 5,33 5,39 6,44 5',
    'cookie12': '50 0,55 2,59 5,64 6,70 6,75 7,78 11,81 15,85 19,89 22,93 25,94 30,94 36,95 41,98 45,100 50,98 55,95 59,94 64,94 70,93 75,89 78,85 81,81 85,78 89,75 93,70 94,64 94,59 95,55 98,50 100,45 98,41 95,36 94,30 94,25 93,22 89,19 85,15 81,11 78,7 75,6 70,6 64,5 59,2 55,0 50,2 45,5 41,6 36,6 30,7 25,11 22,15 19,19 15,22 11,25 7,30 6,36 6,41 5,45 2',
    'clover4': '50 13,54 8,58 3,64 1,71 0,77 1,84 3,89 6,94 11,97 16,99 23,100 29,99 36,97 42,92 46,87 50,92 54,97 58,99 64,100 71,99 77,97 84,94 89,89 94,84 97,77 99,71 100,64 99,58 97,54 92,50 87,46 92,42 97,36 99,29 100,23 99,16 97,11 94,6 89,3 84,1 77,0 71,1 64,3 58,8 54,13 50,8 46,3 42,1 36,0 29,1 23,3 16,6 11,11 6,16 3,23 1,29 0,36 1,42 3,46 8',
    'burst': '50 0,53 7,56 15,63 18,68 12,74 7,74 15,72 23,77 28,85 26,93 26,88 32,82 37,85 44,93 47,100 50,93 53,85 56,82 63,88 68,93 74,85 74,77 72,72 77,74 85,74 93,68 88,63 82,56 85,53 93,50 100,47 93,44 85,37 82,32 88,26 93,26 85,28 77,23 72,15 74,7 74,12 68,18 63,15 56,7 53,0 50,7 47,15 44,18 37,12 32,7 26,15 26,23 28,28 23,26 15,26 7,32 12,37 18,44 15,47 7',
    'soft-burst': '50 10,55 8,60 4,66 2,69 7,70 13,74 17,79 19,85 19,90 21,91 26,89 32,88 38,92 42,97 45,100 50,97 55,92 58,88 62,89 68,91 74,90 79,85 81,79 81,74 83,70 87,69 93,66 98,60 96,55 92,50 90,45 92,40 96,34 98,31 93,30 87,26 83,21 81,15 81,10 79,9 74,11 68,12 62,8 58,3 55,0 50,3 45,8 42,12 38,11 32,9 26,10 21,15 19,21 19,26 17,30 13,31 7,34 2,40 4,45 8',
    'flower': '50 0,56 1,61 4,64 8,67 12,72 10,78 10,83 13,87 17,90 22,90 28,88 33,92 36,96 39,99 44,100 50,99 56,96 61,92 64,88 67,90 72,90 78,87 83,83 87,78 90,72 90,67 88,64 92,61 96,56 99,50 100,44 99,39 96,36 92,33 88,28 90,22 90,17 87,13 83,10 78,10 72,12 67,8 64,4 61,1 56,0 50,1 44,4 39,8 36,12 33,10 28,10 22,13 17,17 13,22 10,28 10,33 12,36 8,39 4,44 1',
    'puffy': '50 0,56 1,61 2,67 2,72 2,78 3,82 6,86 10,90 14,94 18,97 22,98 28,98 33,98 39,99 44,100 50,99 56,98 61,98 67,98 72,97 78,94 82,90 86,86 90,82 94,78 97,72 98,67 98,61 98,56 99,50 100,44 99,39 98,33 98,28 98,22 97,18 94,14 90,10 86,6 82,3 78,2 72,2 67,2 61,1 56,0 50,1 44,2 39,2 33,2 28,3 22,6 18,10 14,14 10,18 6,22 3,28 2,33 2,39 2,44 1',
    'puffy-diamond': '50 0,54 2,58 5,62 7,67 9,70 13,73 17,77 19,81 23,83 27,87 30,91 33,93 38,95 42,98 46,100 50,98 54,95 58,93 62,91 67,87 70,83 73,81 77,77 81,73 83,70 87,67 91,62 93,58 95,54 98,50 100,46 98,42 95,38 93,33 91,30 87,27 83,23 81,19 77,17 73,13 70,9 67,7 62,5 58,2 54,0 50,2 46,5 42,7 38,9 33,13 30,17 27,19 23,23 19,27 17,30 13,33 9,38 7,42 5,46 2',
    'pixel-circle': '50 0,56 0,63 0,69 0,70 6,73 10,80 10,86 10,90 14,90 20,90 27,94 30,100 31,100 37,100 44,100 50,100 56,100 63,100 69,94 70,90 73,90 80,90 86,86 90,80 90,73 90,70 94,69 100,63 100,56 100,50 100,44 100,37 100,31 100,30 94,27 90,20 90,14 90,10 86,10 80,10 73,6 70,0 69,0 63,0 56,0 50,0 44,0 37,0 31,6 30,10 27,10 20,10 14,14 10,20 10,27 10,30 6,31 0,37 0,44 0',
    'pixel-triangle': '50 5,56 5,60 8,60 14,60 20,62 25,68 25,74 25,80 27,80 33,80 39,81 45,87 45,93 45,99 45,100 51,100 57,100 63,100 70,100 76,100 82,100 88,99 94,93 95,87 95,81 95,75 95,69 95,62 95,56 95,50 95,44 95,38 95,31 95,25 95,19 95,13 95,7 95,1 94,0 88,0 82,0 76,0 70,0 63,0 57,0 51,1 45,7 45,13 45,19 45,20 39,20 33,20 27,26 25,32 25,38 25,40 20,40 14,40 8,44 5'
};
const WAVE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='12'%3E%3Cpath d='M-20 6 Q-10 0 0 6 T20 6 T40 6 T60 6' fill='none' stroke='%23000' stroke-width='4' stroke-linecap='round'/%3E%3C/svg%3E\")";
// </gen:tokens>

// THEME: the widget's Display Theme picks a family; Material You and Aurora follow the browser's light/dark,
// Cyberpunk is always dark and built from the widget's 8 cyber colours, Just Business is always light.
const MQ = matchMedia('(prefers-color-scheme: dark)');
const famOf = th => ({ material: 'my', business: 'biz', 'retro-futuristic': 'cyber' })[th] || 'aurora';
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgba = (h, a) => `rgba(${hex(h).join(',')},${a})`;
const mix = (a, b, w) => { const B = hex(b); return '#' + hex(a).map((v, i) => Math.round(v * w + B[i] * (1 - w)).toString(16).padStart(2, '0')).join(''); };
const lum = h => { const q = hex(h).map(x => (x /= 255) <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4); return .2126 * q[0] + .7152 * q[1] + .0722 * q[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
// Just Business never morphs, so its circle and square are exact.
const sh = (n, flat) => flat && n === 'circle' ? 'circle(50%)' : flat && n === 'square' ? 'inset(0 round 22%)' : `polygon(${SHAPES[n].replace(/(\d+) (\d+)/g, '$1% $2%')})`;
const SPR = { // M3 Expressive springs as CSS linear()
    es: '414ms linear(0,0.061,0.202,0.379,0.56,0.724,0.859,0.961,1.028,1.071,1.09,1.093,1.084,1.07,1.053,1.036,1.022,1.01,1.002,0.996,0.993,0.991,0.992,0.993,0.994,0.995,0.997,0.998,0.999,1,1,1.001,1)',
    ed: '478ms linear(0,0.038,0.127,0.242,0.366,0.486,0.597,0.693,0.771,0.838,0.89,0.931,0.961,0.982,0.996,1.006,1.011,1.014,1.014,1.014,1.013,1.011,1.009,1.007,1.006,1.005,1.003,1.002,1.002,1.001,1.001,1,1)',
    sf: '210ms linear(0,0.032,0.099,0.185,0.28,0.375,0.467,0.551,0.627,0.693,0.751,0.803,0.843,0.877,0.904,0.926,0.944,0.958,0.969,0.978,0.984,0.989,0.993,0.996,0.998,0.999,1,1.001,1.001,1.001,1.001,1.001,1)',
    sd: '283ms linear(0,0.026,0.088,0.166,0.257,0.351,0.437,0.522,0.599,0.664,0.725,0.777,0.818,0.856,0.886,0.91,0.931,0.948,0.96,0.971,0.979,0.985,0.99,0.993,0.996,0.998,0.999,1,1.001,1.001,1.001,1.001,1)',
    ss: '411ms linear(0,0.023,0.079,0.155,0.237,0.326,0.413,0.492,0.568,0.637,0.696,0.749,0.795,0.833,0.866,0.893,0.915,0.934,0.949,0.962,0.971,0.979,0.985,0.989,0.993,0.996,0.997,0.999,1,1.001,1.001,1.001,1)',
    xf: '193ms linear(0,0.067,0.189,0.325,0.455,0.568,0.663,0.74,0.802,0.85,0.887,0.915,0.936,0.953,0.965,0.974,0.981,0.986,0.99,0.992,0.994,0.996,0.997,0.998,0.998,0.999,0.999,0.999,1,1,1,1,1)',
    xd: '272ms linear(0,0.049,0.154,0.278,0.4,0.512,0.609,0.69,0.757,0.811,0.854,0.887,0.914,0.934,0.95,0.962,0.971,0.978,0.984,0.988,0.991,0.993,0.995,0.996,0.997,0.998,0.998,0.999,0.999,0.999,0.999,1,1)',
    xs: '360ms linear(0,0.045,0.138,0.254,0.368,0.478,0.572,0.656,0.724,0.782,0.827,0.865,0.894,0.918,0.936,0.951,0.962,0.971,0.978,0.983,0.987,0.99,0.992,0.994,0.996,0.997,0.997,0.998,0.999,0.999,0.999,0.999,1)'
};
const MSC = n => `var(--md-sys-color-${n})`;
// Material You's component tokens; the other families override.
const DEF = { page: MSC('surface-container'), region: MSC('surface'), 'r-region': '32px', card: MSC('surface-container'), 'card-border': '0 solid transparent',
    'card-shadow': '0 0 0 transparent', 'r-card': '24px', 'r-card-sm': '16px', hero: MSC('primary-container'), 'on-hero': MSC('on-primary-container'), 'hero-ink': MSC('primary'),
    'hero-shadow': '0 0 0 transparent', 'r-hero': '32px', hazard: 'none', 'hazard-h': '0px', mesh: 'none', 'mesh-d': 'none', glass: MSC('surface-container-high'), 'glass-blur': 'none',
    nav: MSC('surface-container'), 'nav-border': 'transparent', tile: MSC('surface-container-high'), 'tile-2': MSC('secondary-container'), 'on-tile-2': MSC('on-secondary-container'),
    'tile-3': MSC('tertiary-container'), 'on-tile-3': MSC('on-tertiary-container'), 'r-btn': '9999px', 'r-btn-inner': '8px', 'r-chip': '8px', 'r-field': '16px', 'btn-clip': 'none', 'card-clip': 'none',
    sh: ['cookie12', 'sunny', 'cookie9', 'cookie4', 'clover4', 'sunny', 'pill', 'cookie6', 'soft-burst', 'cookie9', 'sunny'],
    'font-display': "'Roboto Flex','Roboto',sans-serif", 'font-num': "'Roboto Flex','Roboto',sans-serif", 'font-body': "'Roboto Flex','Roboto',sans-serif",
    'num-fvs': "'wdth' 36,'wght' 720,'opsz' 144", 'num-fvs-sm': "'wdth' 60,'wght' 640", 'display-fvs': "'wdth' 100,'wght' 600", 'title-tt': 'none', 'title-ls': '0px',
    spatial: SPR.ed, 'spatial-fast': SPR.es, effects: SPR.xd, 'wavy-d': 'inline', 'flat-d': 'none', anim: 'running', drift: 'none', glow: 'none', 'glow-text': 'none' };
const SH_KEYS = ['avatar', 'avatar-2', 'i1', 'i2', 'i3', 'i4', 'i5', 'i6', 'badge', 'mood', 'mood-2'];
const AURORA = d => {
    const m = (a, b, c, e) => [[102, 126, 234, a], [79, 172, 254, b], [240, 147, 251, c], [118, 75, 162, e]];
    const g = (at, stops, base) => stops.map(([r, gg, b, a], i) => `radial-gradient(${at[i]}, rgba(${r},${gg},${b},${a}) 0, transparent ${base ? 60 : 70}%)`).join(',') + (base ? ',' + base : '');
    const HERO = ['80% 120% at 0% 0%', '70% 120% at 100% 0%', '90% 120% at 90% 100%', '80% 120% at 10% 100%'], MESH = ['42% 52% at 12% 8%', '40% 50% at 88% 4%', '46% 56% at 78% 92%', '40% 48% at 20% 96%'];
    return { page: MSC('surface'), region: 'transparent', 'r-card-sm': '20px', 'r-btn-inner': '10px', 'r-chip': '12px', 'r-field': '20px', 'mesh-d': 'block', 'glass-blur': 'blur(28px) saturate(160%)',
        'tile-2': MSC('primary-container'), 'on-tile-2': MSC('on-primary-container'), 'on-hero': MSC('on-surface'),
        sh: ['flower', 'puffy', 'puffy', 'flower', 'pill', 'oval', 'puffy-diamond', 'cookie6', 'flower', 'puffy', 'flower'],
        'font-display': "'Sora','Roboto Flex',sans-serif", 'font-num': "'Sora','Roboto Flex',sans-serif", 'num-fvs': 'normal', 'num-fvs-sm': 'normal', 'display-fvs': 'normal', 'title-ls': '-.01em',
        spatial: SPR.ss, 'spatial-fast': SPR.sd, effects: SPR.xs, drift: 'atcDrift 36s ease-in-out infinite alternate',
        ...(d ? { card: 'rgba(36,32,48,.72)', 'card-border': '1px solid rgba(255,255,255,.09)', 'card-shadow': 'inset 0 1px 0 rgba(255,255,255,.10),0 12px 32px rgba(0,0,0,.35)',
            hero: g(HERO, m(.55, .4, .42, .55), 'rgba(36,32,48,.78)'), 'hero-ink': '#B3A6FF', 'hero-shadow': 'inset 0 1px 0 rgba(255,255,255,.14),0 16px 40px rgba(0,0,0,.4)',
            mesh: g(MESH, m(.5, .34, .34, .55)), glass: 'rgba(36,32,48,.62)', nav: 'rgba(36,32,48,.55)', 'nav-border': 'rgba(255,255,255,.08)', tile: 'rgba(255,255,255,.06)' }
            : { card: 'rgba(255,255,255,.62)', 'card-border': '1px solid rgba(255,255,255,.85)', 'card-shadow': 'inset 0 1px 0 rgba(255,255,255,.95),0 12px 32px rgba(60,40,120,.14)',
            hero: g(HERO, m(.38, .34, .4, .28), 'rgba(255,255,255,.66)'), 'hero-ink': '#5A47BF', 'hero-shadow': 'inset 0 1px 0 #FFFFFF,0 16px 40px rgba(60,40,120,.18)',
            mesh: g(MESH, m(.42, .38, .4, .3)), glass: 'rgba(255,255,255,.55)', nav: 'rgba(255,255,255,.55)', 'nav-border': 'rgba(255,255,255,.85)', tile: 'rgba(255,255,255,.7)' }) };
};
const BIZ = { page: '#EEF2F6', region: 'transparent', 'r-region': '0px', card: '#FFFFFF', 'card-border': '1px solid #E3E8EF', 'card-shadow': '0 1px 3px rgba(16,24,40,.08)', 'r-card': '8px', 'r-card-sm': '8px',
    hero: '#FFFFFF', 'on-hero': '#2B2B2B', 'hero-ink': '#1565C0', 'hero-shadow': '0 1px 3px rgba(16,24,40,.08),inset 0 3px 0 #1E88E5', 'r-hero': '10px', glass: '#FFFFFF', nav: '#FFFFFF', 'nav-border': '#E3E8EF',
    tile: '#F5F8FC', 'tile-2': '#E3F2FD', 'on-tile-2': '#0D47A1', 'tile-3': '#F5F8FC', 'on-tile-3': '#1565C0', 'r-btn': '8px', 'r-btn-inner': '4px', 'r-field': '8px',
    sh: ['circle', 'circle', 'square', 'square', 'square', 'square', 'square', 'square', 'circle', 'circle', 'circle'],
    'font-display': "'Segoe UI','Roboto Flex','Roboto',sans-serif", 'font-num': "'Segoe UI','Roboto Flex','Roboto',sans-serif", 'font-body': "'Segoe UI','Roboto Flex',sans-serif",
    'num-fvs': 'normal', 'num-fvs-sm': 'normal', 'display-fvs': 'normal', spatial: '0ms linear', 'spatial-fast': '0ms linear', effects: '0ms linear', 'wavy-d': 'none', 'flat-d': 'inline', anim: 'paused' };
// Cyberpunk: M3 roles and the HUD's component tokens from the 8 widget colours (design: cyberScheme in x-schemes.js).
const CY = ['cyberBgPrimary', 'cyberBgSecondary', 'cyberAccent', 'cyberHighlight', 'cyberPanelTint', 'cyberText', 'cyberGlow', 'cyberBorder'];
const CY_DEF = ['#07091a', '#11142b', '#fff200', '#00e5ff', '#00e5ff', '#fff200', '#fff200', '#fff200'];
const CY_ST = { ok: '#00F0A8', danger: '#FF5A6E', low: '#00E5FF', tense: '#F8E71C', void: '#B388FF', home: '#FF2BD6' };
function cyber(p) {
    const [bg, bg2, acc, hi, tint, text, glow, border] = CY.map((k, i) => /^#[0-9a-f]{6}$/i.test(p[k]) ? p[k] : CY_DEF[i]), gi = Math.max(0, Math.min(1, +p.cyberGlowIntensity || .6)) / .6;
    const shi = mix(tint, bg2, .16);
    // Muted text leans on the highlight; the default palette types in its accent, so there it is the highlight alone.
    const base = text.toLowerCase() === acc.toLowerCase() ? hi : mix(hi, text, .5);
    let w = .72, osv; do { osv = mix(base, bg, w); w += .02; } while (w < 1 && contrast(osv, shi) < 4.6);
    const c = { primary: acc, 'on-primary': bg, 'primary-container': mix(acc, bg, .18), 'on-primary-container': acc, 'inverse-primary': mix(acc, bg, .6),
        secondary: hi, 'on-secondary': bg, 'secondary-container': mix(hi, bg, .18), 'on-secondary-container': hi, tertiary: mix(tint, '#FFFFFF', .75), 'on-tertiary': bg,
        'tertiary-container': mix(tint, bg, .28), 'on-tertiary-container': mix(tint, '#FFFFFF', .35), error: '#FF5A6E', 'on-error': bg, 'error-container': mix('#FF5A6E', bg, .16), 'on-error-container': '#FF5A6E',
        surface: bg, 'surface-dim': bg, 'surface-bright': mix(tint, bg2, .2), 'surface-container-lowest': mix(bg, '#000000', .7), 'surface-container-low': mix(bg2, bg, .5), 'surface-container': bg2,
        'surface-container-high': mix(tint, bg2, .08), 'surface-container-highest': shi, 'on-surface': text, 'on-surface-variant': osv, outline: mix(border, bg, .7), 'outline-variant': mix(border, bg, .3),
        'inverse-surface': text, 'inverse-on-surface': bg, scrim: '#000000', shadow: '#000000' };
    const st = {}; for (const k in CY_ST) { st[k] = CY_ST[k]; st[k + '-container'] = mix(CY_ST[k], bg, .16); st['on-' + k + '-container'] = CY_ST[k]; }
    const x = { ink: acc, fill: acc, 'on-fill': bg, track: mix(hi, bg2, .22), 'state-ink': text, page: bg, region: rgba(bg2, .55), 'r-region': '4px', card: rgba(bg2, .92),
        'card-border': `1px solid ${rgba(border, .45)}`, 'card-shadow': `inset 0 0 18px ${rgba(acc, .1)}`, 'r-card': '2px', 'r-card-sm': '2px',
        'card-clip': 'polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)',
        hero: `repeating-linear-gradient(0deg,${rgba(hi, .07)} 0 1px,transparent 1px 3px),linear-gradient(135deg,${rgba(hi, .2)},transparent 55%),${bg2}`, 'on-hero': text, 'hero-ink': acc,
        'hero-shadow': `inset 0 0 0 1px ${rgba(border, .7)},inset 0 0 28px ${rgba(acc, .18)}`, 'r-hero': '2px', hazard: `repeating-linear-gradient(-45deg,${acc} 0 6px,transparent 6px 12px)`, 'hazard-h': '6px',
        mesh: `radial-gradient(60% 40% at 50% -10%,${rgba(hi, .22)} 0,transparent 70%)`, 'mesh-d': 'block', glass: rgba(bg2, .82), 'glass-blur': 'blur(16px)', nav: bg, 'nav-border': rgba(border, .6),
        tile: rgba(hi, .1), 'tile-2': c['primary-container'], 'on-tile-2': acc, 'tile-3': c['secondary-container'], 'on-tile-3': hi, 'r-btn': '2px', 'r-btn-inner': '2px', 'r-chip': '2px', 'r-field': '2px',
        'btn-clip': 'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)',
        sh: ['gem', 'diamond', 'slanted', 'diamond', 'pixel-circle', 'gem', 'pixel-triangle', 'pentagon', 'burst', 'pixel-circle', 'gem'],
        'font-display': "'Chakra Petch',sans-serif", 'font-num': "'Share Tech Mono','Orbitron',monospace", 'num-fvs': 'normal', 'num-fvs-sm': 'normal', 'display-fvs': 'normal',
        'title-tt': 'uppercase', 'title-ls': '.08em', spatial: SPR.sf, 'spatial-fast': SPR.sf, effects: SPR.xf,
        glow: `0 0 12px ${rgba(glow, Math.min(1, .55 * gi).toFixed(2))}`, 'glow-text': `0 0 10px ${rgba(glow, Math.min(1, .6 * gi).toFixed(2))}` };
    return { c, st, x };
}
const FONT = { my: 'family=Roboto+Flex:opsz,wdth,wght@8..144,25..151,100..1000', aurora: 'family=Roboto+Flex:opsz,wdth,wght@8..144,25..151,100..1000&family=Sora:wght@400;500;600;700',
    cyber: 'family=Roboto+Flex:opsz,wdth,wght@8..144,25..151,100..1000&family=Chakra+Petch:wght@500;600;700&family=Share+Tech+Mono' };
// The active family's tokens on <html>; rebuilt only when the theme, the browser scheme or a cyber colour changes.
let tokKey = '';
function tokens() {
    const p = P(), fam = famOf(p.displayTheme), dark = fam === 'cyber' || (fam !== 'biz' && MQ.matches);
    const key = fam + dark + (fam === 'cyber' ? CY.map(k => p[k]).join() + p.cyberGlowIntensity : '');
    if (key === tokKey) return dark; tokKey = key;
    let c = {}, st = {}, x;
    if (fam === 'cyber') ({ c, st, x } = cyber(p));
    else { const v = SCHEMES[fam + '-' + (dark ? 'dark' : 'light')].split(' '); ROLES.forEach((r, i) => c[r] = v[i]); ST.forEach((r, i) => st[r] = v[ROLES.length + i]);
        const [ink, fill, onFill, track] = v.slice(ROLES.length + ST.length); x = { ink, fill, 'on-fill': onFill, track, 'state-ink': c['on-surface'], ...(fam === 'aurora' ? AURORA(dark) : fam === 'biz' ? BIZ : {}) }; }
    const t = { ...DEF, ...x };
    const vars = Object.entries(c).map(([k, v]) => `--md-sys-color-${k}:${v}`).concat(Object.entries(st).map(([k, v]) => `--x-${k}:${v}`),
        Object.entries(t).filter(([k]) => k !== 'sh').map(([k, v]) => `--x-${k}:${v}`), t.sh.map((n, i) => `--x-sh-${SH_KEYS[i]}:${sh(n, fam === 'biz')}`), [`--x-wave:${WAVE}`]);
    style('atc-x-tokens', `html{${vars.join(';')}}`);
    H.dataset.xFam = fam;
    let f = D.getElementById('atc-x-fonts'); const href = FONT[fam] && 'https://fonts.googleapis.com/css2?' + FONT[fam] + '&display=swap';
    if (!href) { if (f) f.remove(); } else { if (!f) { f = D.createElement('link'); f.id = 'atc-x-fonts'; f.rel = 'stylesheet'; D.head.appendChild(f); } if (f.getAttribute('href') !== href) f.href = href; }
    return dark;
}

// RING (M3 circular progress): outer = Actual ÷ shift with the track gap and round ends, inner = Active ÷ Actual.
// While checked in the outer arc is wavy: a static conic mask over a spinning wave, so the turn is a composited transform.
const RS = s => s <= 28 ? { t: 3, amp: 0, gap: 3, inner: 0 } : s <= 72 ? { t: 5, amp: 1.1, wl: 18, gap: 4, inner: 4, rg: 3 } : { t: 8, amp: 1.6, wl: 26, gap: 5, inner: 6, rg: 5 };
const WAVES = {};
const wavePath = (s, r, amp, n) => WAVES[s] || (WAVES[s] = Array.from({ length: 181 }, (_, i) => { const a = i / 180 * 2 * Math.PI, rr = r + amp * Math.sin(n * a); return (i ? 'L' : 'M') + (s / 2 + rr * Math.cos(a)).toFixed(2) + ',' + (s / 2 + rr * Math.sin(a)).toFixed(2); }).join('') + 'Z');
const ring = s => `<div class="atc-r" data-rs="${s}" style="--rs:${s}px" role="progressbar" aria-valuemin="0" aria-valuemax="100"></div>`;
function ringHTML(s, st, pO, pI) {
    const S = RS(s), c = s / 2, rO = c - S.t / 2 - S.amp, empty = /none|error|wait/.test(st), rot = `transform="rotate(-90 ${c} ${c})"`;
    if (empty) pO = pI = 0;
    let o = '';
    const arc = (r, t, p, k) => {
        const C = 2 * Math.PI * r, g = S.gap, base = `cx="${c}" cy="${c}" r="${r.toFixed(2)}" stroke-width="${t}" ${rot}`;
        if (p < 1) { const tl = p === 0 ? C : C * (1 - p) - 2 * g - t;
            if (tl > 0) o += `<circle class="tr" ${base} ${p ? `stroke-linecap="round" stroke-dasharray="${tl.toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-(C * p + g + t / 2)).toFixed(2)}"` : st === 'error' ? 'stroke-dasharray="2 5"' : ''}/>`; }
        if (p > 0) o += `<circle class="${k}" ${base} stroke-linecap="${p < 1 ? 'round' : 'butt'}" stroke-dasharray="${Math.max(C * p - (p < 1 ? t : 0), .01).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${p < 1 ? -t / 2 : 0}"/>`;
    };
    arc(rO, S.t, pO, 'fo');
    if (S.inner) arc(rO - S.t / 2 - S.amp - S.rg - S.inner / 2, S.inner, pI, 'fi');
    if (s >= 100) o += `<text class="v" x="${c}" y="${c + (st === 'none' ? 9 : 6)}">${empty ? '—' : Math.round(pI * 100) + '%'}</text>` + (empty ? '' : `<text class="l" x="${c}" y="${c + 22}">focus</text>`);
    const wv = S.amp && pO > 0 ? `<div class="atc-r-wv" style="--rp:${(pO * 100).toFixed(2)}%"><svg viewBox="0 0 ${s} ${s}"><path d="${wavePath(s, rO, S.amp, Math.max(6, Math.round(2 * Math.PI * rO / S.wl)))}" stroke-width="${S.t}"/></svg></div>` : '';
    return `<svg viewBox="0 0 ${s} ${s}">${o}</svg>${wv}`;
}

const ICON = { // Material icons, 24px
    vis: 'M12 6c3.79 0 7.17 2.13 8.82 5.5C19.17 14.87 15.79 17 12 17s-7.17-2.13-8.82-5.5C4.83 8.13 8.21 6 12 6m0-2C7 4 2.73 7.11 1 11.5 2.73 15.89 7 19 12 19s9.27-3.11 11-7.5C21.27 7.11 17 4 12 4zm0 5c1.38 0 2.5 1.12 2.5 2.5S13.38 14 12 14s-2.5-1.12-2.5-2.5S10.62 9 12 9m0-2c-2.48 0-4.5 2.02-4.5 4.5S9.52 16 12 16s4.5-2.02 4.5-4.5S14.48 7 12 7z',
    visoff: 'M12 6c3.79 0 7.17 2.13 8.82 5.5-.59 1.22-1.42 2.27-2.41 3.12l1.41 1.41c1.39-1.23 2.49-2.77 3.18-4.53C21.27 7.11 17 4 12 4c-1.27 0-2.49.2-3.64.57l1.65 1.65C10.66 6.09 11.32 6 12 6zm-1.07 1.14L13 9.21c.57.25 1.03.71 1.28 1.28l2.07 2.07c.08-.34.14-.7.14-1.07C16.5 9.01 14.48 7 12 7c-.37 0-.72.05-1.07.14zM2.01 3.87l2.68 2.68C3.06 7.83 1.77 9.53 1 11.5 2.73 15.89 7 19 12 19c1.52 0 2.98-.29 4.32-.82l3.42 3.42 1.41-1.41L3.42 2.45 2.01 3.87zm7.5 7.5l2.61 2.61c-.04.01-.08.02-.12.02-1.38 0-2.5-1.12-2.5-2.5 0-.05.01-.08.01-.13zm-3.4-3.4l1.75 1.75c-.23.55-.36 1.15-.36 1.78 0 2.48 2.02 4.5 4.5 4.5.63 0 1.23-.13 1.77-.36l.98.98c-.88.24-1.8.38-2.75.38-3.79 0-7.17-2.13-8.82-5.5.7-1.43 1.72-2.61 2.93-3.53z',
    info: 'M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
    lock: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z',
    down: 'M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z',
    event: 'M16.53 11.06 15.47 10l-4.88 4.88-2.12-2.12-1.06 1.06L10.59 17l5.94-5.94zM19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z',
    verified: 'm23 12-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.54 6.71 4.73l-3.61.81.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5l3.4-1.47 3.4 1.46 1.89-3.19 3.61-.82-.34-3.69L23 12zm-12.91 4.72-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z',
    task: 'M22 5.18 10.59 16.6l-4.24-4.24 1.41-1.41 2.83 2.83 10-10L22 5.18zm-2.21 5.04c.13.57.21 1.17.21 1.78 0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8c1.58 0 3.04.46 4.28 1.25l1.44-1.44A9.9 9.9 0 0 0 12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10c0-1.19-.22-2.33-.6-3.39l-1.61 1.61z',
    cake: 'M12 6c1.11 0 2-.9 2-2 0-.38-.1-.73-.29-1.03L12 0l-1.71 2.97c-.19.3-.29.65-.29 1.03 0 1.1.9 2 2 2zm4.6 9.99-1.07-1.07-1.08 1.07c-1.3 1.3-3.58 1.31-4.89 0l-1.07-1.07-1.09 1.07C6.75 16.64 5.88 17 4.96 17c-.73 0-1.4-.23-1.96-.61V21c0 .55.45 1 1 1h16c.55 0 1-.45 1-1v-4.61c-.56.38-1.23.61-1.96.61-.92 0-1.79-.36-2.44-1.01zM18 9h-5V7h-2v2H6c-1.66 0-3 1.34-3 3v1.54c0 1.08.88 1.96 1.96 1.96.52 0 1.02-.2 1.38-.57l2.14-2.13 2.13 2.13c.74.74 2.03.74 2.77 0l2.14-2.13 2.13 2.13c.37.37.86.57 1.38.57 1.08 0 1.96-.88 1.96-1.96V12C21 10.34 19.66 9 18 9z',
    doc: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
    group: 'M8 10H5V7H3v3H0v2h3v3h2v-3h3v-2zm10 1c1.66 0 2.99-1.34 2.99-3S19.66 5 18 5c-.32 0-.63.05-.91.14.57.81.9 1.79.9 2.86s-.34 2.04-.9 2.86c.28.09.59.14.91.14zm-5 0c1.66 0 2.99-1.34 2.99-3S14.66 5 13 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm6.62 2.16c.83.73 1.38 1.66 1.38 2.84v2h3v-2c0-1.54-2.37-2.49-4.38-2.84zM13 13c-2 0-6 1-6 3v2h12v-2c0-2-4-3-6-3z',
    star: 'M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
    book: 'M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z',
    news: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z',
    play: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z',
    car: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z',
    bike: 'M19.44 9.03 15.41 5H11v2h3.59l2 2H5c-2.8 0-5 2.2-5 5s2.2 5 5 5c2.46 0 4.45-1.69 4.9-4h1.65l2.77-2.77c-.21.54-.32 1.14-.32 1.77 0 2.8 2.2 5 5 5s5-2.2 5-5c0-2.65-1.97-4.77-4.56-4.97zM7.82 15C7.4 16.15 6.28 17 5 17c-1.63 0-3-1.37-3-3s1.37-3 3-3c1.28 0 2.4.85 2.82 2H5v2h2.82zM19 17c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z',
    laptop: 'M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z',
    phone: 'M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z',
    misc: 'M12 2l-5.5 9h11L12 2zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zM3 21.5h8v-8H3v8z',
    ruler: 'M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H3V8h2v4h2V8h2v4h2V8h2v4h2V8h2v4h2V8h2v8z',
    weight: 'M20.57 14.86 22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z',
    heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    gauge: 'M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.27-10.44zm-9.79 6.84a2 2 0 0 0 2.83 0l5.66-8.49-8.49 5.66a2 2 0 0 0 0 2.83z',
    bell: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z',
    next: 'M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
    chat: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z',
    history: 'M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.95 8.95 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z',
    login: 'M11 7 9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z',
    logout: 'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z',
    timer: 'M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61 1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.96 8.96 0 0 0 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z',
    rise: 'M4 18h16v2H4zM5 16h14c0-3.87-3.13-7-7-7s-7 3.13-7 7zM11 3h2v3h-2zM3.52 8.1l1.41-1.41 2.12 2.12-1.41 1.41zM16.95 8.81l2.12-2.12 1.41 1.41-2.12 2.12z',
    moon: 'M12.34 2.02C6.59 1.82 2 6.42 2 12c0 5.52 4.48 10 10 10 3.71 0 6.93-2.02 8.66-5.02-7.51-.25-12.09-8.43-8.32-14.96z',
    hour: 'M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2H6z',
    beach: 'M13.13 14.56l1.43-1.43 6.44 6.44L19.57 21zm4.29-5.73 2.86-2.86c-3.95-3.95-10.35-3.96-14.3-.02 3.93-1.3 8.31-.25 11.44 2.88zM5.95 5.98c-3.94 3.95-3.93 10.35.02 14.3l2.86-2.86C5.7 14.29 4.65 9.91 5.95 5.98zm.02-.02-.01.01c-.38 3.01 1.17 6.88 4.3 10.02l5.73-5.73c-3.13-3.13-7.01-4.68-10.02-4.3z',
    busy: 'M9.31 17l2.44-2.44L14.19 17l1.06-1.06-2.44-2.44 2.44-2.44L14.19 10l-2.44 2.44L9.31 10l-1.06 1.06 2.44 2.44-2.44 2.44L9.31 17zM19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z',
    sched: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
    home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
    office: 'M17 11V3H7v4H3v14h8v-4h2v4h8V11h-4zM7 19H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm4 4H9v-2h2v2zm0-4H9V9h2v2zm0-4H9V5h2v2zm4 8h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zm4 12h-2v-2h2v2zm0-4h-2v-2h2v2z',
    search: 'M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    sheet: 'M19 7H9c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm0 2v2H9V9h10zm-6 6v-2h2v2h-2zm2 2v2h-2v-2h2zm-4-2H9v-2h2v2zm6-2h2v2h-2v-2zm-8 4h2v2H9v-2zm8 2v-2h2v2h-2zM6 17H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v1h-2V5H5v10h1v2z',
    trend: 'M16 18l2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6z',
    add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
    off: 'M19.35 10.04C18.67 6.59 15.64 4 12 4c-1.48 0-2.85.43-4.01 1.17l1.46 1.46C10.21 6.23 11.08 6 12 6c3.04 0 5.5 2.46 5.5 5.5v.5H19c1.66 0 3 1.34 3 3 0 1.13-.64 2.11-1.56 2.62l1.45 1.45C23.16 18.16 24 16.68 24 15c0-2.64-2.05-4.78-4.65-4.96zM3 5.27l2.75 2.74C2.56 8.15 0 10.77 0 14c0 3.31 2.69 6 6 6h11.73l2 2L21 20.73 4.27 4 3 5.27zM7.73 10l8 8H6c-2.21 0-4-1.79-4-4s1.79-4 4-4h1.73z'
};
const icon = n => `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${ICON[n]}"/></svg>`;
const MASK = n => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='${ICON[n]}'/></svg>`)}") center/contain no-repeat`;

const BASE_CSS = `
html:root{--x-r-btn-c:min(var(--x-r-btn),16px)}
html[data-att-skin=dark]{color-scheme:dark}
@media (prefers-reduced-motion:reduce){html:root{--x-anim:paused;--x-wavy-d:none;--x-flat-d:inline;--x-drift:none;--x-spatial:0ms linear;--x-spatial-fast:0ms linear}}
@keyframes atcSpin{to{transform:rotate(1turn)}}@keyframes atcSlide{to{transform:translateX(-40px)}}
@keyframes atcDrift{0%{transform:translate3d(-3%,-2%,0) scale(1.05)}100%{transform:translate3d(3%,2%,0) scale(1.12)}}
@keyframes atcMood{0%,100%{clip-path:var(--x-sh-mood);transform:rotate(0)}50%{clip-path:var(--x-sh-mood-2);transform:rotate(20deg)}}
@keyframes atcPop{0%{opacity:0;transform:scale(.86) translateY(-6px)}100%{opacity:1;transform:none}}
.atc-r{position:relative;width:var(--rs);height:var(--rs);flex:none;line-height:0}
.atc-r svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;fill:none}
.atc-r .tr{stroke:var(--x-track)}.atc-r .fo{stroke:var(--rc,var(--md-sys-color-primary))}.atc-r .fi{stroke:var(--md-sys-color-secondary)}
.atc-r.st-over{--rc:var(--x-tense)}.atc-r.st-error{--rc:var(--md-sys-color-error)}
.atc-r text{text-anchor:middle;fill:var(--md-sys-color-on-surface-variant);font:500 11px var(--x-font-body);letter-spacing:.5px}
.atc-r text.v{fill:var(--md-sys-color-on-surface);font:600 28px var(--x-font-num);font-variation-settings:var(--x-num-fvs-sm);letter-spacing:0}
.atc-r-wv{position:absolute;inset:0;display:none;-webkit-mask:conic-gradient(#000 var(--rp),transparent 0);mask:conic-gradient(#000 var(--rp),transparent 0)}
.atc-r-wv svg{animation:atcSpin 9s linear infinite;animation-play-state:var(--x-anim)}.atc-r-wv path{stroke:var(--rc,var(--md-sys-color-primary));stroke-linejoin:round}
.atc-r.is-wavy .atc-r-wv{display:var(--x-wavy-d)}.atc-r.is-wavy circle.fo{display:var(--x-flat-d)}
.atc-chip{position:relative;display:flex;gap:2px;height:32px;align-self:center;margin:0 6px 0 2px;font-family:var(--x-font-body);color:var(--md-sys-color-on-surface)}
.atc-chip>button{position:relative;display:flex;align-items:center;margin:0;border:0;background:var(--x-tile-2);color:var(--x-on-tile-2);cursor:pointer;clip-path:var(--x-btn-clip);box-shadow:var(--x-glow)}
.atc-chip>button::before,.atc-btn::before{content:"";position:absolute;inset:0;border-radius:inherit;background:currentColor;opacity:0;transition:opacity var(--x-effects);pointer-events:none}
.atc-chip>button:hover::before,.atc-btn:hover::before{opacity:.08}.atc-chip>button:is(:active,:focus-visible)::before,.atc-btn:is(:active,:focus-visible)::before{opacity:.1}
.atc-chip>button:focus-visible,.atc-btn:focus-visible{outline:3px solid var(--md-sys-color-secondary);outline-offset:2px}
.atc-chip-b{gap:6px;padding:0 12px 0 4px;border-radius:var(--x-r-btn-c) var(--x-r-btn-inner) var(--x-r-btn-inner) var(--x-r-btn-c);font:600 13px/20px var(--x-font-body);letter-spacing:.1px;white-space:nowrap;transition:border-radius var(--x-spatial-fast)}
.atc-chip-b:active{border-radius:var(--x-r-btn-c) min(16px,var(--x-r-btn-c)) min(16px,var(--x-r-btn-c)) var(--x-r-btn-c)}
.atc-chip-b>span{position:relative;font-family:var(--x-font-num);font-variation-settings:var(--x-num-fvs-sm);font-variant-numeric:tabular-nums}
.atc-chip-t{width:32px;justify-content:center;padding:0;border-radius:var(--x-r-btn-inner) var(--x-r-btn-c) var(--x-r-btn-c) var(--x-r-btn-inner);transition:border-radius var(--x-spatial)}
.atc-chip-t svg{width:20px;height:20px;transition:transform var(--x-spatial)}
.atc-chip.is-open .atc-chip-t{border-radius:var(--x-r-btn-c)}.atc-chip.is-open .atc-chip-t svg{transform:rotate(180deg)}
.atc-chip.st-over .atc-chip-b>span{color:var(--x-tense)}.atc-chip.st-error .atc-chip-b>span{color:var(--md-sys-color-error)}
.atc-pop{position:absolute;top:40px;right:0;z-index:1060;width:344px;box-sizing:border-box;padding:calc(16px + var(--x-hazard-h)) 16px 16px;display:flex;flex-direction:column;gap:14px;
 border-radius:var(--x-r-hero);background:var(--x-hero);backdrop-filter:var(--x-glass-blur);-webkit-backdrop-filter:var(--x-glass-blur);border:var(--x-card-border);
 box-shadow:var(--x-hero-shadow),0 4px 8px 3px rgba(0,0,0,.15),0 1px 3px rgba(0,0,0,.3);color:var(--x-on-hero);clip-path:var(--x-card-clip);text-align:left;cursor:default;
 transform-origin:top right;animation:atcPop var(--x-spatial) both;font:400 13px/18px var(--x-font-body)}
.atc-pop::before{content:"";position:absolute;left:0;right:0;top:0;height:var(--x-hazard-h);background:var(--x-hazard)}
.atc-pop[hidden]{display:none}
.atc-pop-h{display:flex;align-items:center;gap:14px}
.atc-mood{width:52px;height:52px;flex:none;display:grid;place-items:center;font-size:28px;line-height:1;background:var(--x-tile-2);clip-path:var(--x-sh-mood);animation:atcMood 7s ease-in-out infinite;animation-play-state:var(--x-anim)}
.atc-mood:empty{display:none}
.atc-pop-m{flex:1;min-width:0;display:flex;flex-direction:column}
.atc-k{font-size:11px;line-height:16px;font-weight:600;letter-spacing:.6px;text-transform:uppercase;color:var(--x-hero-ink);white-space:nowrap}
.atc-big{font-family:var(--x-font-num);font-variation-settings:var(--x-num-fvs);font-size:40px;line-height:44px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.01em;text-shadow:var(--x-glow-text);white-space:nowrap}
.atc-pop-e{display:flex;flex-direction:column;align-items:flex-end;font-size:11px;line-height:14px;white-space:nowrap;color:var(--md-sys-color-on-surface-variant)}
.atc-pop-e b{font-family:var(--x-font-num);font-size:16px;line-height:22px;font-weight:600;color:var(--x-on-hero)}
:is(.atc-pop,.atc-time).st-over :is(.atc-k,.atc-big){color:var(--x-tense)}:is(.atc-pop,.atc-time).st-error .atc-k{color:var(--md-sys-color-error)}
:is(.atc-pop,.atc-time):is(.st-none,.st-error,.st-wait) .atc-big{color:var(--md-sys-color-on-surface-variant)}
.atc-wv{display:flex;align-items:center;gap:4px;height:12px;color:var(--md-sys-color-primary)}.st-over .atc-wv{color:var(--x-tense)}
.atc-wv-a{position:relative;flex:none;width:calc(var(--wp,0) * (100% - 12px));height:12px;overflow:hidden}
.atc-wv-a::before{content:"";position:absolute;left:0;right:0;top:4px;height:4px;border-radius:2px;background:currentColor;display:var(--x-flat-d)}
.atc-wv-a::after{content:"";position:absolute;top:0;bottom:0;left:0;right:-40px;background:currentColor;-webkit-mask:var(--x-wave) 0 50%/40px 12px repeat-x;mask:var(--x-wave) 0 50%/40px 12px repeat-x;display:var(--x-wavy-d);animation:atcSlide 1.2s linear infinite;animation-play-state:var(--x-anim)}
.atc-wv:not(.is-live) .atc-wv-a::before{display:block}.atc-wv:not(.is-live) .atc-wv-a::after{display:none}
.atc-wv-t{flex:1;height:4px;border-radius:2px;background:var(--x-track)}.atc-wv-s{width:4px;height:4px;flex:none;border-radius:50%;background:currentColor}
.atc-pop:is(.st-none,.st-wait,.st-error) .atc-wv{display:none}
.atc-err{display:none;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:var(--x-r-card-sm);background:var(--md-sys-color-error-container);color:var(--md-sys-color-on-error-container);font-size:13px;line-height:18px}
.atc-err svg{width:18px;height:18px;flex:none}.atc-pop.st-error .atc-err{display:flex}
.atc-pop-x{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;white-space:nowrap}
.atc-streak{height:28px;box-sizing:border-box;display:flex;align-items:center;gap:4px;padding:0 10px 0 6px;border-radius:var(--x-r-chip);border:1px solid var(--md-sys-color-outline-variant)}
.atc-lv{width:28px;height:28px;display:grid;place-items:center;background:var(--x-fill);color:var(--x-on-fill);clip-path:var(--x-sh-badge);font:700 11px var(--x-font-num)}
.atc-xp{margin-left:auto;font-size:11px;font-weight:400;font-variant-numeric:tabular-nums;color:var(--md-sys-color-on-surface-variant)}
.atc-btn{position:relative;height:40px;display:flex;align-items:center;justify-content:center;gap:8px;border-radius:var(--x-r-btn);clip-path:var(--x-btn-clip);background:var(--x-fill);color:var(--x-on-fill)!important;
 font:600 14px/20px var(--x-font-body);letter-spacing:.1px;text-decoration:none!important;box-shadow:var(--x-glow)}
.atc-btn svg{position:relative;width:18px;height:18px}
.atc-hide{display:none!important}
.atc-time{box-sizing:border-box;display:flex;align-items:center;gap:14px;margin-top:.5rem;padding:10px 14px 10px 10px;border-radius:var(--x-r-card-sm);background:var(--x-glass);border:var(--x-card-border);
 color:var(--md-sys-color-on-surface);font-family:var(--x-font-body);clip-path:var(--x-card-clip)}
.atc-tm{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.atc-time .atc-k{color:var(--x-ink);letter-spacing:.5px}.atc-time .atc-big{font-size:34px;line-height:38px;color:var(--md-sys-color-on-surface)}
.atc-sub{font-size:12px;line-height:16px;letter-spacing:.3px;color:var(--md-sys-color-on-surface-variant);white-space:nowrap}
.atc-tg{flex:none;display:grid;grid-template-columns:auto auto;gap:6px 12px}.atc-tg>div{display:flex;flex-direction:column;min-width:0}
.atc-tg i{display:flex;align-items:center;gap:5px;font:500 11px/14px var(--x-font-body);letter-spacing:.4px;color:var(--md-sys-color-on-surface-variant);white-space:nowrap}
.atc-tg i::before{content:"";width:8px;height:8px;flex:none;background:var(--d);clip-path:var(--x-sh-i4)}
.atc-tg b{font-family:var(--x-font-num);font-variation-settings:var(--x-num-fvs-sm);font-size:14px;line-height:20px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--md-sys-color-on-surface)}
.atc-tg>:nth-child(1){--d:var(--md-sys-color-primary)}.atc-tg>:nth-child(2){--d:var(--md-sys-color-secondary)}.atc-tg>:nth-child(3){--d:var(--md-sys-color-outline)}
.atc-tg>:nth-child(4){--d:var(--md-sys-color-tertiary)}.atc-tg>:nth-child(4) b{color:var(--x-ink)}
.atc-time:is(.st-none,.st-error,.st-wait) .atc-tg{display:none}`;

// LOADER (M3 loading indicator, design xLoader) over EGP's blockUI gif, every route: the img's own box is the
// indicator (gif swapped for a clear pixel), the blockMsg its container. A spring morph and quarter turn every
// 650ms over a 4666ms spin. Business morphs without overshoot; Cyberpunk uses its angular shapes. Part of the
// web theme (data-atc-web), so it is Plus too.
const spring = (z, k, ms) => { const w = Math.sqrt(k), wd = w * Math.sqrt(1 - z * z), v = [];
    for (let i = 0; i < 40; i++) { const t = i / 40 * ms / 1000; v.push(+(1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + z * w / wd * Math.sin(wd * t))).toFixed(3)); }
    return `linear(${v.join(',')},1)`; };
const LI = { my: [['soft-burst', 'cookie9', 'pentagon', 'pill', 'sunny', 'cookie4', 'oval'], spring(.6, 200, 650)],
    aurora: [['soft-burst', 'cookie9', 'pentagon', 'pill', 'sunny', 'cookie4', 'oval'], spring(.75, 130, 650)],
    cyber: [['gem', 'diamond', 'pentagon', 'pixel-circle', 'burst', 'slanted', 'pixel-triangle'], spring(.5, 520, 650)],
    biz: [['square', 'circle', 'pill', 'oval'], 'cubic-bezier(.2,0,0,1)'] };
const GIF = 'img[src$="images/loading.gif"]', MSG = '.blockUI.blockMsg.blockPage';
const LOADER_CSS = `
@keyframes atcLiTurn{0%{rotate:0deg}25%{rotate:90deg}50%{rotate:180deg}75%{rotate:270deg}100%{rotate:360deg}}
${Object.entries(LI).map(([f, [s, e]]) => `@keyframes atcLi-${f}{${s.concat(s[0]).map((n, i) => `${+(i / s.length * 100).toFixed(3)}%{clip-path:${sh(n)}}`).join('')}}
html[data-x-fam=${f}] ${GIF}{clip-path:${sh(s[0])};animation:atcLi-${f} ${s.length * 650}ms ${e} infinite,atcLiTurn 2600ms ${e} infinite,atcSpin 4666ms linear infinite}`).join('\n')}
html[data-x-fam] ${GIF}{content:url("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");box-sizing:border-box;width:38px!important;height:38px!important;margin:5px;vertical-align:middle;border:0;background:var(--li,var(--md-sys-color-primary))}
html[data-x-fam=aurora]{--li:linear-gradient(135deg,var(--md-sys-color-primary),var(--md-sys-color-tertiary))}
html[data-x-fam] .blockUI.blockOverlay{background:var(--md-sys-color-surface)!important}
html[data-x-fam=aurora] .blockUI.blockOverlay{backdrop-filter:blur(8px)}
html[data-x-fam] ${MSG}{top:50%!important;left:50%!important;width:72px!important;height:72px!important;translate:-50% -50%;box-sizing:border-box;border-radius:50%;background:var(--md-sys-color-primary-container)!important;--li:var(--md-sys-color-on-primary-container)}
html[data-x-fam] ${MSG} ${GIF}{display:block;width:57px!important;height:57px!important;margin:7px auto 0}
html[data-x-fam=aurora] ${MSG}{background:var(--x-glass)!important;border:var(--x-card-border)!important;box-shadow:var(--x-card-shadow);backdrop-filter:var(--x-glass-blur);--li:linear-gradient(135deg,var(--md-sys-color-primary),var(--md-sys-color-tertiary))}
html[data-x-fam=aurora] ${MSG} ${GIF}{margin-top:6px}
html[data-x-fam=cyber] ${MSG}{border-radius:var(--x-r-btn);border:1px solid var(--md-sys-color-outline)!important;box-shadow:var(--x-glow);--li:var(--md-sys-color-primary)}
html[data-x-fam=cyber] ${MSG} ${GIF},html[data-x-fam=biz] ${MSG} ${GIF}{margin-top:6px}
html[data-x-fam=biz] ${MSG}{background:var(--x-card)!important;border:var(--x-card-border)!important;box-shadow:var(--x-card-shadow);--li:var(--md-sys-color-primary)}
@media (prefers-reduced-motion:reduce){html[data-x-fam] ${GIF}{animation:atcSpin 4666ms linear infinite}}`.replace(/html\[data-x-fam/g, 'html[data-atc-web][data-x-fam');

// PORTAL THEME: Timeline and Attendance only (data-att-skin), so untested pages are never half-themed. EGP's own
// tokens (EnhancedStyle.css :root) are remapped first, then the surfaces those miss. No :has().
const R = 'html[data-att-skin]', RD = 'html[data-att-skin=dark]', NW = ':not(#total-time-summary *)', NWW = `:where(${NW})`, OS = MSC('on-surface'), OSV = MSC('on-surface-variant'), OV = MSC('outline-variant');
const LAYER = p => `color-mix(in srgb,${OS} ${p}%,transparent)`;
const AT = `${R} #global-portal #attendence-record-tab`, EV = `${R} #global-portal app-evaluation-widget .emp-info`;
const SKIN_CSS = `
${R}{--theme-color:var(--x-fill)!important;--primary-color:var(--x-ink);--bg-grey:${MSC('surface-container')};--secondary:var(--x-fill);--color-light_blue:var(--x-tile-2);--color-sky_blue:var(--x-tile);
 --text-primary:var(--x-ink);--text-grey:${OSV};--text-light:${OS};--light:${MSC('surface-container')};--dark:${OS};--bgWhiteSmoke:var(--x-tile);--bgCyanBlue:var(--x-tile);--bgBluishCyan:var(--x-tile);
 --bgCyan:var(--x-tile);--bgBluishCyanDark:var(--x-tile-2);--bgDarkGrey:${OV};--bgYellowGreen:var(--x-ok-container);--dangerRed:var(--x-danger-container);--bgteapink:var(--x-home-container);
 --bgOrangyRose:var(--x-tense-container);--bgYellowOrange:var(--x-tense-container);--bg-yellowish:var(--x-tense-container);--text-cyanblue:var(--x-ink);scrollbar-color:${OV} var(--x-page)}
${R} body{background:var(--x-page)!important;color:${OS}}
${R} body::before{content:"";position:fixed;inset:-6%;z-index:-1;pointer-events:none;display:var(--x-mesh-d);background:var(--x-mesh);animation:var(--x-drift);animation-play-state:var(--x-anim);will-change:transform}
${R} #global-portal{background:transparent!important;color:${OS};font-family:var(--x-font-body)}
${R} nav.gp-main-navbar{background:var(--x-nav)!important;box-shadow:0 1px 0 var(--x-nav-border)!important;border:0!important}
${R} .gp-main-navbar .navbar-brand{color:${OS}!important;font-family:var(--x-font-display);font-variation-settings:var(--x-display-fvs);text-transform:var(--x-title-tt);letter-spacing:var(--x-title-ls)}
${R} .gp-main-navbar .nav-link{color:${OSV}!important;border-radius:var(--x-r-btn);font-weight:600}${R} .gp-main-navbar .nav-link:hover{background:${LAYER(8)}}
${R} .header-icons :is(.bg-icon,.bg-iconEmp) .icon-link,${R} .header-icons .fa-calendar{background-color:var(--x-tile)!important;color:${OSV}!important;border-radius:50%}
${R} .header-icons .bg-iconWider .icon-link{background-color:var(--x-tile)!important;color:${OSV}!important;border-radius:var(--x-r-btn);font-weight:600;white-space:nowrap}
${RD} .header-icons img[src*=websoft i],${RD} .header-icons .bg-iconWider.cursor-pointer .icon-link>svg:only-child{filter:brightness(0) invert(.88)}
/* Header icons: the host's coloured SVGs take the design's on-surface-variant; the avatar's dropdown button drops its default face. */
${R} .header-icons .bg-icon .icon-link{color:${OSV}!important}
${R} .header-icons .bg-icon .icon-link svg :is(path,circle,rect,ellipse,line,polyline,polygon)[fill]:not([fill=none]):not([fill^="url"]){fill:currentColor}
${R} .header-icons .bg-icon .icon-link svg :is(path,circle,rect,ellipse,line,polyline,polygon)[stroke]:not([stroke=none]){stroke:currentColor}
${R} .gp-user-profile .dropdown-toggle{background:transparent!important;color:${OSV}!important;box-shadow:none!important}
${R} #global-portal .gp-navbar-link .fa-calendar{background:transparent!important;color:${OSV}!important}
${R} #sidebarNav{background:var(--x-glass)!important;border:var(--x-card-border);box-shadow:var(--x-card-shadow)}
${R} #sidebarNav .sidebar-icons-link{background:transparent!important;clip-path:var(--x-sh-avatar);transition:clip-path var(--x-spatial),background-color var(--x-effects)}
${R} #sidebarNav .sidebar-icons-link:is(:hover,.selected){background:var(--x-tile-2)!important}${R} #sidebarNav .sidebar-icons-link:hover{clip-path:var(--x-sh-i4)}
${R} #sidebarNav .sidebar-icons-link [stroke]:not([stroke=none]){stroke:${OSV}!important}${R} #sidebarNav .sidebar-icons-link :is([fill=white i],[fill='#fff' i],[fill='#ffffff' i]){fill:${OSV}}
${R} #sidebarNav .sidebar-icons-link.selected [stroke]:not([stroke=none]){stroke:var(--x-on-tile-2)!important}
${R} :is(.body_content .inside-section,.attendance-details-wrapper,.tab-content-inner-admin,#attendence-record-tab>.attendence-inner){background:var(--x-region)!important;border:0!important;box-shadow:none!important;border-radius:var(--x-r-region)!important}
/* Bootstrap 5's border utilities force #dee2e6 !important: the white hairlines on dark themes. */
${R} #global-portal :is(.border,.border-top,.border-bottom,.border-start,.border-end){border-color:${OV}!important}
${R} #global-portal hr{border:0;height:1px;background:${OV};color:${OV};opacity:1}
/* A card inside a card (Spotlight's carousel): only the outer one draws chrome. */
${R} #global-portal .box-widget .box-widget{background:transparent!important;border:0!important;box-shadow:none!important;border-radius:0!important}
/* Footer strip (Weather | Food | Prayer): three cards, no rule line; the weather block loses its divider. */
${R} #global-portal .gp-footer .gap-footer-inner{border-top:0!important;padding-top:0!important}
${R} .gp-footer .gap-footer-inner>.row{--bs-gutter-x:12px;align-items:stretch}
${R} :is(weather-widget,app-food-menu-widget){display:block;height:100%}${R} .gp-footer .gap-footer-inner .footer-col{height:100%;box-sizing:border-box;padding:8px 14px;background:var(--x-card);border:var(--x-card-border);box-shadow:var(--x-card-shadow);border-radius:var(--x-r-card);clip-path:var(--x-card-clip)}
${R} #global-portal weather-widget .footer-title,${R} #global-portal weather-widget :is(table,tr,td,th){border:0!important}
${R} .box-widget{background:var(--x-card)!important;border:var(--x-card-border)!important;box-shadow:var(--x-card-shadow)!important;border-radius:var(--x-r-card)!important;color:${OS}}
${R} :is(.box-widget-title,.box-widget h5,.box-widget h6,#attendence-record-tab h6){font-family:var(--x-font-display);font-variation-settings:var(--x-display-fvs);text-transform:var(--x-title-tt);letter-spacing:var(--x-title-ls);color:${OS}!important}
/* #global-portal: EGP's own "#global-portal .text-black{color:#333!important}" carries an ID; the tab rules carry one more class. */
${R} #global-portal :is(.text-black,.text-dark,.text-body)${NWW}{color:${OS}!important}
${R} #global-portal :is(.text-grey,.text-secondary,.text-muted,.timline-font-color,.box-widget small)${NWW}{color:${OSV}!important}
${R} :is(.color-theme,.text-primary,.box-widget a:not(.nav-link,.btn))${NWW}{color:var(--x-ink)!important}
${RD} #global-portal :is([style*='color:#333'],[style*='color: #333'],[style*='color:#000'],[style*='color: #000'],[style*='color:black'],[style*='color: black'])${NWW}{color:${OS}!important}
${R} :is(.bg-white,.t-heading)${NW}:not(.sidebar-icons-link){background-color:var(--x-card)!important}${R} .bg-light${NW}{background-color:var(--x-tile)!important}
${R} #global-portal :is(.box-widget,.gp-footer) :is(button.nav-link,.box-widget-title-new){background:${MSC('surface-container-highest')}!important;color:${OSV}!important;border:0!important;border-radius:var(--x-r-btn-inner)!important;
 font-weight:700;clip-path:var(--x-btn-clip);transition:border-radius var(--x-spatial-fast),background-color var(--x-effects)}
${R} #global-portal :is(.box-widget,.gp-footer) :is(button.nav-link.active,.box-widget-title-new.active,span.selected){background:var(--x-fill)!important;color:var(--x-on-fill)!important;border-radius:var(--x-r-btn)!important;box-shadow:var(--x-glow)}
${R} .box-widget .highlighted-content{background:var(--x-tile)!important;color:${OS}!important;border-radius:var(--x-r-card-sm)}
${R} :is(.Profile-img,.box-widget img.rounded-circle){clip-path:var(--x-sh-avatar);border-radius:0!important;transition:clip-path var(--x-spatial)}
${R} app-personal-info-widget .Profile-img:hover{clip-path:var(--x-sh-avatar-2)}
${R} :is(.gp-user-img,.sup-img,app-gm-widget img){clip-path:var(--x-sh-avatar);border-radius:0!important;transition:clip-path var(--x-spatial)}
${R} :is(.gp-user-img,.sup-img,app-gm-widget img):hover{clip-path:var(--x-sh-avatar-2)}
${R} app-team-info-widget li:nth-child(6n+2) .gp-user-img{clip-path:var(--x-sh-i1)}${R} app-team-info-widget li:nth-child(6n+3) .gp-user-img{clip-path:var(--x-sh-i2)}${R} app-team-info-widget li:nth-child(6n+4) .gp-user-img{clip-path:var(--x-sh-i3)}${R} app-team-info-widget li:nth-child(6n+5) .gp-user-img{clip-path:var(--x-sh-i4)}${R} app-team-info-widget li:nth-child(6n+6) .gp-user-img{clip-path:var(--x-sh-i5)}
${R} #global-portal .box-widget :is(span.fs-2.timline-font-color,app-personal-info-widget .text-primary.fs-4){color:var(--x-ink)!important;font-family:var(--x-font-num);font-variation-settings:var(--x-num-fvs);font-weight:700;line-height:1.1;text-shadow:var(--x-glow-text)}
/* Health: four tiles, icon shape (mountDecor) over the value in the number font over the label; Donor joins the header row. */
${R} app-health-widget>.box-widget{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto 1fr;column-gap:8px;align-items:center}
${R} app-health-widget>.box-widget>.d-flex{grid-area:1/1}${R} app-health-widget>.box-widget>strong{grid-area:1/2;white-space:nowrap}
${R} #global-portal app-health-widget ul{grid-area:2/1/3/3;align-self:stretch;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:8px 0 0!important}
${R} app-health-widget li{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:8px 2px;border-radius:var(--x-r-card-sm);background:var(--x-tile);min-width:0}
${R} app-health-widget li>img{display:none}
.atc-hico{display:none}${R} .atc-hico{width:36px;height:36px;display:grid;place-items:center;flex:none}${R} .atc-hico svg{width:20px;height:20px}
${R} #global-portal app-health-widget li>span.d-block{order:2;font-size:11px;font-weight:600;color:${OSV};white-space:nowrap}
${R} #global-portal app-health-widget li>span.timline-font-color{order:1;font-family:var(--x-font-num);font-size:14px!important;font-weight:700;color:var(--x-ink)!important;white-space:nowrap}
${R} #global-portal app-health-widget :is(small,strong){font-size:11px!important;font-weight:500!important;color:${OSV}!important}
/* Co-workers: 52px shaped tonal avatars, one shape each; online is a dot outside the shape. */
${R} .atc-c-co-workers .box-widget-title .atc-n{margin-left:6px;font-family:var(--x-font-body);font-size:12px;font-weight:500;color:${OSV};text-transform:none;letter-spacing:0}
${R} #global-portal .atc-c-co-workers ul.team-members-list{display:flex;flex-wrap:wrap;gap:8px;margin:0;padding:0}
${R} #global-portal .atc-c-co-workers li.team-member{margin:0!important;list-style:none}
${R} #global-portal .atc-c-co-workers .team-member .fig-pod{position:relative;width:52px!important;height:52px!important;margin:0!important;border:0!important;box-shadow:none!important;background:none!important}
${R} #global-portal .atc-c-co-workers .team-member .fig-pod img{width:52px!important;height:52px!important;border:0!important;object-fit:cover;background:var(--x-tile-2);clip-path:var(--x-sh-i1)}
${R} #global-portal .atc-c-co-workers .team-member:nth-child(6n+2) .fig-pod img{background:var(--x-tile-3);clip-path:var(--x-sh-i2)}${R} #global-portal .atc-c-co-workers .team-member:nth-child(6n+3) .fig-pod img{background:${MSC('surface-container-highest')};clip-path:var(--x-sh-i3)}
${R} #global-portal .atc-c-co-workers .team-member:nth-child(6n+4) .fig-pod img{clip-path:var(--x-sh-i4)}${R} #global-portal .atc-c-co-workers .team-member:nth-child(6n+5) .fig-pod img{background:var(--x-tile-3);clip-path:var(--x-sh-i5)}
${R} #global-portal .atc-c-co-workers .team-member:nth-child(6n) .fig-pod img{background:${MSC('surface-container-highest')};clip-path:var(--x-sh-i6)}
${R} #global-portal .atc-c-co-workers .team-member .fig-pod img:hover{clip-path:var(--x-sh-avatar-2)}
${R} .atc-c-co-workers .fig-pod.active::after{content:"";position:absolute;right:0;bottom:2px;width:10px;height:10px;border-radius:50%;background:var(--x-ok);box-shadow:0 0 0 2px var(--x-card)}
${R} .atc-c-co-workers .fig-pod::before{display:none!important}
/* Team members, empty: icon tile + line, centred (mountDecor). */
.atc-deco{display:none}${R} .atc-deco{display:flex}
${R} .atc-v-empty.is-col{flex-direction:column;justify-content:center;gap:10px;text-align:center}
${R} .atc-c-co-workers .atc-deco .atc-v-ico{width:72px;height:72px;clip-path:var(--x-sh-i3)}${R} .atc-c-co-workers .atc-deco b{font-size:14px;font-weight:600;color:${OS}}
${R} .atc-c-co-workers .flex-grow-1.justify-content-around{justify-content:center!important}
/* Awards: a tile per person, star badge on the avatar. */
${R} #global-portal .atc-c-company-awards .carousel-item>.d-flex{gap:8px;justify-content:stretch!important;margin:0!important}
${R} #global-portal .atc-c-company-awards .gp-user-vertical-fig{flex:1 1 0;width:auto!important;min-width:0;padding:12px 8px 10px;gap:4px;border-radius:var(--x-r-card-sm);background:var(--x-tile)}
${R} #global-portal .atc-c-company-awards .fig-pod{position:relative;width:52px!important;height:52px!important;margin:4px 0 0!important;border:0!important;box-shadow:none!important;background:none!important}
${R} #global-portal .atc-c-company-awards .fig-pod img{width:52px!important;height:52px!important;border:0!important;border-radius:0!important;object-fit:cover;background:${MSC('surface-container-highest')};clip-path:var(--x-sh-avatar)}
${R} .atc-c-company-awards .fig-pod::before{content:"";position:absolute;right:-8px;top:-6px;z-index:1;width:24px;height:24px;background:${MSC('tertiary')};clip-path:var(--x-sh-badge)}
${R} .atc-c-company-awards .fig-pod::after{content:"";position:absolute;right:-3px;top:-1px;z-index:2;width:14px;height:14px;background:${MSC('on-tertiary')};-webkit-mask:${MASK('star')};mask:${MASK('star')}}
${R} #global-portal .atc-c-company-awards figcaption{max-width:100%;text-transform:none!important}
${R} #global-portal .atc-c-company-awards figcaption strong{font-size:13px;line-height:17px;font-weight:700;color:${OS};overflow:hidden;text-overflow:ellipsis}
${R} #global-portal .atc-c-company-awards figcaption small{font-size:11px!important;color:${OSV}!important}
${R} .atc-c-company-awards .comments-icon{z-index:3}
/* Recognition: a plain title (the host's lone tab), 36px numbers; only Awards keeps the accent. */
${R} #global-portal .box-widget.atc-c-recognition button.nav-link.nav-link{background:transparent!important;color:${OS}!important;padding:0!important;box-shadow:none!important;clip-path:none;font:600 15px/20px var(--x-font-display)!important;font-variation-settings:var(--x-display-fvs);letter-spacing:var(--x-title-ls);text-transform:var(--x-title-tt)}
${R} #global-portal .atc-c-recognition span.fs-2{font-size:36px!important;line-height:40px}${R} #global-portal .atc-c-recognition span.fs-2:not(.pointer-cr){color:${OS}!important;text-shadow:none}
${R} #global-portal .atc-c-recognition .text-center>small{font-size:11px!important;font-weight:600}
/* Happening: each headline a tile row with an icon tile; the pane's repeated heading goes. */
${R} .atc-c-happening-around-me .tab-pane>small{display:none}
${R} #global-portal .atc-c-happening-around-me ul.news-scroll{display:flex;flex-direction:column;gap:6px;margin:4px 0 0;padding:0!important}
${R} .atc-c-happening-around-me ul.news-scroll>li{list-style:none;position:relative;display:flex;align-items:center;min-height:40px;box-sizing:border-box;padding:6px 8px 6px 46px;border-radius:var(--x-r-card-sm);background:var(--x-tile);font-size:11px;line-height:15px}
${R} .atc-c-happening-around-me ul.news-scroll>li::before{content:"";position:absolute;left:8px;top:50%;margin-top:-14px;width:28px;height:28px;background:var(--x-tile-2);clip-path:var(--x-sh-i1)}
${R} .atc-c-happening-around-me ul.news-scroll>li::after{content:"";position:absolute;left:14px;top:50%;margin-top:-8px;width:16px;height:16px;background:var(--x-on-tile-2);-webkit-mask:${MASK('news')};mask:${MASK('news')}}
${R} #global-portal .atc-c-happening-around-me ul.news-scroll a{color:${OS}!important;text-decoration:none;font-size:11px}
${R} #global-portal .atc-c-happening-around-me ul.news-scroll a:hover{color:var(--x-ink)!important}
/* Sub-header: a glass toolbar pill (menu button + links), the date, the active-users chip. */
${R} .body_content>.justify-content-between:first-child{gap:6px;padding:8px 0 4px 8px!important;white-space:nowrap}
${R} #global-portal #sidebar-toggle-btn{width:36px;height:36px;margin:0!important;padding:0;display:grid;place-items:center;border:0;border-radius:var(--x-r-btn) 4px 4px var(--x-r-btn);background:var(--x-glass)!important;color:${OSV}}
${R} #sidebar-toggle-btn svg :is([stroke]:not([stroke=none])){stroke:currentColor}${R} #sidebar-toggle-btn svg :is([fill]:not([fill=none])){fill:currentColor}
${R} #global-portal .body_content .gp-users-detail.mr-auto{height:36px;box-sizing:border-box;display:flex;align-items:center;gap:2px;margin:0 auto 0 -4px!important;padding:0 6px;border-radius:4px var(--x-r-btn) var(--x-r-btn) 4px;background:var(--x-glass)}
${R} .body_content .gp-users-detail.mr-auto>span.margin-r5{display:none}
${R} #global-portal .body_content .gp-users-detail.mr-auto>:is(a,span:not(.margin-r5)){height:28px;display:flex!important;align-items:center;gap:6px;padding:0 10px;border-radius:var(--x-r-btn);text-decoration:none;cursor:pointer;transition:background-color var(--x-effects)}
${R} .body_content .gp-users-detail.mr-auto>:is(a,span):hover{background:${LAYER(8)}}
${R} #global-portal .body_content .gp-users-detail.mr-auto>* span{margin:0!important;padding:0!important;font-size:12px!important;font-weight:600;letter-spacing:.4px;text-transform:uppercase;color:${OS}!important}
${R} #global-portal .body_content .gp-users-detail.mr-auto>* span.fs-9{font-size:10px!important;font-weight:500;letter-spacing:0;color:${OSV}!important}
${R} #global-portal .body_content .gp-users-detail.mr-auto i{margin:0!important;font-size:15px;color:var(--x-ink)!important}
${R} #global-portal .body_content .gp-users-detail.justify-content-end{gap:10px!important}
${R} #global-portal .body_content .gp-users-detail.justify-content-end :is(span.fs-md,.fa-calendar){font-size:12px!important;font-weight:500;color:${OSV}!important}
${R} #global-portal .body_content .gp-users-detail.justify-content-end>span.fs-md{height:28px;display:flex;align-items:center;gap:6px;padding:0 12px;border-radius:var(--x-r-chip);background:var(--x-tile);color:${OS}!important}
${R} #global-portal .body_content .gp-users-detail.justify-content-end>span.fs-md>.timline-font-color{font-family:var(--x-font-num);font-weight:700;color:var(--x-ink)!important}
/* Nav: the brand's badge shape; Assign Practice as a tile-3 pill. */
${R} .gp-main-navbar .navbar-brand{font-size:20px;font-weight:700}
${R} .gp-main-navbar .navbar-brand::before{content:"";display:inline-block;width:28px;height:28px;margin-right:10px;vertical-align:middle;background:var(--x-fill);clip-path:var(--x-sh-badge)}
${R} .header-icons .bg-iconEmp .icon-link.icon-link{height:36px;display:flex;align-items:center;gap:8px;padding:0 16px 0 12px;background:var(--x-tile-3)!important;color:var(--x-on-tile-3)!important;border-radius:var(--x-r-btn)!important;clip-path:var(--x-btn-clip);font-size:14px;font-weight:600;white-space:nowrap}
${R} .box-widget.list-widget{display:flex;flex-direction:column}${R} #global-portal .box-widget.list-widget>ul.news-scroll{flex:1 1 0;min-height:0;max-height:none;padding-left:0!important}
${R} .list-widget>ul.news-scroll>li{list-style:none!important;position:relative;min-height:30px;padding:4px 0 4px 34px;color:${OSV}!important}
${R} .list-widget>ul.news-scroll>li::before{content:"";position:absolute;left:0;top:3px;width:26px;height:26px;background:var(--x-danger-container);clip-path:var(--x-sh-i5)}
${R} .list-widget>ul.news-scroll>li::after{content:"";position:absolute;left:6px;top:9px;width:14px;height:14px;background:var(--x-on-danger-container);-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z'/%3E%3C/svg%3E") center/contain no-repeat}
${R} .list-widget>ul.news-scroll>li:nth-child(3n+2)::before{background:var(--x-tile-2);clip-path:var(--x-sh-i1)}${R} .list-widget>ul.news-scroll>li:nth-child(3n+2)::after{background:var(--x-on-tile-2)}
${R} .list-widget>ul.news-scroll>li:nth-child(3n)::before{background:var(--x-tile-3);clip-path:var(--x-sh-i2)}${R} .list-widget>ul.news-scroll>li:nth-child(3n)::after{background:var(--x-on-tile-3)}
${R} app-resource-center-widget figure:nth-child(5n+1) .fig-pod img{clip-path:var(--x-sh-i1)}${R} app-resource-center-widget figure:nth-child(5n+2) .fig-pod img{clip-path:var(--x-sh-i2)}${R} app-resource-center-widget figure:nth-child(5n+3) .fig-pod img{clip-path:var(--x-sh-i3)}${R} app-resource-center-widget figure:nth-child(5n+4) .fig-pod img{clip-path:var(--x-sh-i4)}${R} app-resource-center-widget figure:nth-child(5n+0) .fig-pod img{clip-path:var(--x-sh-i5)}${R} app-resource-center-widget .fig-pod img{border-radius:0!important;transition:clip-path var(--x-spatial)}${R} app-resource-center-widget .fig-pod img:hover{clip-path:var(--x-sh-avatar-2)}
${R} specialpackages-widget .col-md-4:nth-child(3n+1) .Special-widget-Icon img{clip-path:var(--x-sh-i4)}${R} specialpackages-widget .col-md-4:nth-child(3n+2) .Special-widget-Icon img{clip-path:var(--x-sh-i1)}${R} specialpackages-widget .col-md-4:nth-child(3n+0) .Special-widget-Icon img{clip-path:var(--x-sh-i6)}${R} specialpackages-widget .Special-widget-Icon img{border-radius:0!important;transition:clip-path var(--x-spatial)}${R} specialpackages-widget .Special-widget-Icon img:hover{clip-path:var(--x-sh-avatar-2)}
${R} .prayer-col{padding:2px 6px;border-radius:var(--x-r-chip);clip-path:var(--x-btn-clip);transition:background-color var(--x-effects),color var(--x-effects)}
${R} .prayer-col.atc-now{background:var(--x-fill);color:var(--x-on-fill);box-shadow:var(--x-glow)}${R} #global-portal .prayer-col.atc-now small{color:inherit!important}
${R} #global-portal .collapse-sidebar{border:0!important}
${R} #global-portal .collapse-sidebar i{background:var(--x-tile-2)!important;color:var(--x-on-tile-2)!important;border-radius:0 999px 999px 0;box-shadow:var(--x-card-shadow);clip-path:var(--x-btn-clip);transition:background-color var(--x-effects)}
${R} #global-portal .collapse-sidebar i:hover{background:var(--x-fill)!important;color:var(--x-on-fill)!important}
/* RENDER-OVER: a card with a view hides its host content (kept, for Angular and for forwarded clicks). */
.atc-view{display:none}${R} .box-widget.atc-over>:not(.atc-view){display:none!important}
${R} .atc-over>.atc-view{display:flex;flex-direction:column;gap:8px;height:100%;min-height:100%;box-sizing:border-box;font-family:var(--x-font-body);font-size:12px;line-height:16px;color:${OS}}
${R} .atc-view [data-fwd]{cursor:pointer}
.atc-v-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
${R} #global-portal .atc-view .atc-v-t{margin:0!important;font-size:15px!important;line-height:20px!important;font-weight:600!important;color:inherit!important}${R} #global-portal .atc-view :is(small,.atc-v-sup small){color:inherit!important}
${R} #global-portal .atc-view .atc-v-link{color:var(--x-ink)!important}${R} #global-portal .atc-c-careers .atc-view .atc-v-link{color:var(--x-hero-ink)!important}
${R} #global-portal .atc-view .atc-v-news a{color:${OSV}!important}${R} #global-portal .atc-view .atc-v-news a:hover{color:${OS}!important}
.atc-v-t{margin:0;font:600 15px/20px var(--x-font-display);font-variation-settings:var(--x-display-fvs);letter-spacing:var(--x-title-ls);text-transform:var(--x-title-tt);color:inherit;white-space:nowrap}
.atc-v-link{font-weight:700;color:var(--x-ink);white-space:nowrap}.atc-v-link:hover{text-decoration:underline}
.atc-v-chip{height:24px;display:inline-flex;align-items:center;gap:6px;padding:0 10px;border-radius:var(--x-r-chip);background:var(--x-tile);font-weight:600;white-space:nowrap}
.atc-v-chip i{font-style:normal;font-weight:500;color:${OSV}}
.atc-v-big{font-family:var(--x-font-num);font-variation-settings:var(--x-num-fvs);font-weight:700;font-variant-numeric:tabular-nums;color:var(--x-ink);text-shadow:var(--x-glow-text)}
.atc-v-mute{color:${OSV}}.atc-v-strong{font-size:14px;line-height:20px;font-weight:600}
.atc-v-ico{display:grid;place-items:center;flex:none;background:var(--x-tile-2);color:var(--x-on-tile-2)}.atc-v-ico svg{width:55%;height:55%}
.atc-v-empty{flex:1;display:flex;align-items:center;gap:14px}
.atc-v-empty .atc-v-ico{width:64px;height:64px;clip-path:var(--x-sh-i4)}
.atc-c-approval .atc-v-ico{background:var(--x-ok-container);color:var(--x-on-ok-container)}.atc-c-birthday .atc-v-ico{width:48px;height:48px;background:var(--x-tile-3);color:var(--x-on-tile-3);clip-path:var(--x-sh-i2)}
.atc-v-stack{display:flex;flex-direction:column;gap:2px;min-width:0}
/* Stock (Timeline v2). */
.atc-v-stock{display:flex;align-items:baseline;gap:10px;font-family:var(--x-font-display);font-size:16px;font-weight:700}
.atc-v-stock .atc-v-big{font-size:44px;line-height:48px}
.atc-v-news{display:flex;flex-direction:column;gap:4px;font-size:11px;line-height:15px;color:${OSV}}
.atc-v-news a{display:flex;gap:6px;color:inherit!important;text-decoration:none}.atc-v-news a:hover{color:${OS}!important}
.atc-v-news a::before{content:"";width:6px;height:6px;margin-top:5px;flex:none;background:var(--x-ink);clip-path:var(--x-sh-i4)}
/* Careers: a hero card, 64px count. */
${R} .box-widget.atc-c-careers{background:var(--x-hero)!important;box-shadow:var(--x-hero-shadow)!important;color:var(--x-on-hero)}
.atc-c-careers .atc-v-link{color:var(--x-hero-ink)}
.atc-v-count{flex:1;display:flex;align-items:center;gap:10px}.atc-v-count .atc-v-big{font-size:64px;line-height:64px;color:var(--x-hero-ink)}
.atc-v-count .atc-v-strong{font-size:13px;line-height:17px}
/* Documents: the count inside a shape. */
.atc-v-doc{flex:1;display:flex;align-items:center;gap:10px}
.atc-v-doc .atc-v-ico{width:44px;height:44px;clip-path:var(--x-sh-i6);background:var(--x-ok-container);color:var(--x-on-ok-container);font:700 20px var(--x-font-num)}
.atc-v-doc .atc-v-ico.is-bad{background:var(--x-danger-container);color:var(--x-on-danger-container)}
.atc-v-doc .atc-v-strong{font-size:11px;line-height:14px}
/* Leadership + supervisor (app-gm-widget). */
.atc-v-lead{display:grid;grid-template-columns:1fr 150px;gap:12px;height:100%}
.atc-v-leads{display:flex;flex-direction:column;gap:6px;justify-content:center;min-width:0}
.atc-v-person{display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:var(--x-r-card-sm);background:var(--x-tile);min-width:0}
.atc-v-person img,.atc-v-sup img{flex:none;object-fit:cover;background:${MSC('surface-container-highest')};clip-path:var(--x-sh-avatar)}
.atc-v-person img{width:44px;height:44px}.atc-v-person:nth-child(2) img{clip-path:var(--x-sh-i3)}
.atc-v-person b{display:block;font-size:14px;line-height:20px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.atc-v-person span{display:block;color:${OSV};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.atc-v-sup{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:8px;border-radius:var(--x-r-card-sm);background:var(--x-tile-2);color:var(--x-on-tile-2);text-align:center;min-width:0}
.atc-v-sup small{font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase}
.atc-v-av{position:relative;flex:none;display:inline-flex}.atc-v-av.is-on::after{content:"";position:absolute;right:0;bottom:2px;width:10px;height:10px;border-radius:50%;background:var(--x-ok);box-shadow:0 0 0 2px var(--x-tile)}.atc-v-sup .atc-v-av.is-on::after{box-shadow:0 0 0 2px var(--x-tile-2)}
.atc-v-sup img{width:56px;height:56px}.atc-v-sup b{font-size:14px;font-weight:700;white-space:nowrap}.atc-v-sup span{font-size:11px;white-space:nowrap}
/* Shared view parts: connected tab group, pager, icon action. */
.atc-v-seg{display:flex;gap:2px;min-width:0}
.atc-v-seg>span{height:26px;display:flex;align-items:center;justify-content:center;padding:0 9px;box-sizing:border-box;font-size:11px;font-weight:700;white-space:nowrap;background:${MSC('surface-container-highest')};color:${OSV};
 border-radius:var(--x-r-btn-inner);clip-path:var(--x-btn-clip);transition:border-radius var(--x-spatial-fast),background-color var(--x-effects)}
.atc-v-seg>span:first-child{border-radius:var(--x-r-btn) var(--x-r-btn-inner) var(--x-r-btn-inner) var(--x-r-btn)}.atc-v-seg>span:last-child{border-radius:var(--x-r-btn-inner) var(--x-r-btn) var(--x-r-btn) var(--x-r-btn-inner)}
.atc-v-seg>span.is-on{background:var(--x-fill);color:var(--x-on-fill);border-radius:var(--x-r-btn);box-shadow:var(--x-glow)}
.atc-v-seg.is-lg>span{height:28px;padding:0 12px;font-size:12px}.atc-v-seg.is-fill{flex:1}.atc-v-seg.is-fill>span{flex:1 1 0}.atc-v-seg.is-fill>span.is-on{flex:1.2 1 0}
.atc-v-pg{display:flex;gap:2px;flex:none}.atc-v-pg>span{width:26px;height:26px;display:grid;place-items:center;border-radius:50%;background:${MSC('surface-container-highest')};color:${OSV}}
.atc-v-pg svg{width:18px;height:18px}.atc-v-pg .is-prev svg,.atc-v-ev.is-prev svg{transform:scaleX(-1)}
.atc-v-act{width:28px;height:28px;display:grid;place-items:center;flex:none;border-radius:50%;color:${OSV};transition:background-color var(--x-effects)}.atc-v-act:hover{background:${LAYER(8)}}.atc-v-act svg{width:18px;height:18px}
/* Spotlight: the pick in a tile-2 tile, the next ones peeking. */
.atc-v-spot{flex:1;display:flex;gap:6px;min-height:0}
.atc-v-sp{position:relative;flex:0 0 66%;display:flex;align-items:center;gap:8px;padding:8px;box-sizing:border-box;min-width:0;border-radius:var(--x-r-card-sm);background:var(--x-tile-2);color:var(--x-on-tile-2);clip-path:var(--x-card-clip);font-size:11px;line-height:14px}
.atc-v-sp img{width:40px;height:40px;flex:none;object-fit:cover;background:${MSC('surface')};clip-path:var(--x-sh-avatar)}
.atc-v-sp .atc-v-stack>*{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.atc-v-sp b{font-size:13px;line-height:16px;font-weight:700}.atc-v-sp .atc-v-stack>span:last-child{opacity:.8}
.atc-v-sp .atc-v-act{position:absolute;right:2px;top:2px;width:24px;height:24px;color:inherit}.atc-v-sp .atc-v-act svg{width:15px;height:15px}
.atc-c-spotlight .atc-v-head>.atc-v-pg{margin-left:auto}.atc-c-spotlight .atc-v-head>.atc-v-link{margin-left:4px}
.atc-v-sp2,.atc-v-sp3{display:grid;place-items:center;overflow:hidden;border-radius:var(--x-r-card-sm);clip-path:var(--x-card-clip)}.atc-v-sp2[role=button],.atc-v-sp3[role=button]{cursor:pointer}
.atc-v-sp2 img,.atc-v-sp3 img{width:32px;height:32px;object-fit:cover;background:${MSC('surface')};clip-path:var(--x-sh-avatar)}.atc-v-sp3 img{width:26px;height:26px;opacity:.8}.atc-v-sp2{flex:0 0 20%;background:var(--x-tile-3)}.atc-v-sp3{flex:1;background:var(--x-tile)}
/* eGP Knowledge: an icon tile and the item. */
.atc-v-row{flex:1;display:flex;align-items:center;gap:10px;min-width:0}.atc-v-row b{font-size:13px;line-height:17px;font-weight:700}
.atc-c-egp-knowledge .atc-v-ico{width:52px;height:52px;clip-path:var(--x-sh-i5)}
/* Promotion: people in tiles. */
.atc-v-promo{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:stretch;min-height:0}
.atc-v-pr{position:relative;display:flex;gap:8px;align-items:center;padding:6px 8px;border-radius:var(--x-r-card-sm);background:var(--x-tile);min-width:0}
.atc-v-pr img{width:40px;height:40px;flex:none;object-fit:cover;background:${MSC('surface-container-highest')};clip-path:var(--x-sh-avatar)}
.atc-v-pr :is(b,span,i){display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.atc-v-pr b{font-size:13px;line-height:17px;font-weight:700}
.atc-v-pr span{font-size:11px;line-height:14px;color:${OSV}}.atc-v-pr i{font-style:normal;font-size:11px;font-weight:700;color:var(--x-ink)}
.atc-v-pr .atc-v-act{position:absolute;right:4px;bottom:4px;width:24px;height:24px}.atc-v-pr .atc-v-act svg{width:15px;height:15px}
/* Special offers: colour tiles with a blob; the narrow last one keeps its name for hover only. */
.atc-v-offers{flex:1;display:flex;gap:6px;min-height:0}
.atc-v-offer{position:relative;min-width:0;min-height:76px;display:flex;flex-direction:column;justify-content:flex-end;padding:30px 10px 8px;border-radius:var(--x-r-card-sm);clip-path:var(--x-card-clip);overflow:hidden;font-size:12px;line-height:15px}
.atc-v-offer:nth-child(1){flex:1.3 1 0;background:var(--x-fill);color:var(--x-on-fill)}.atc-v-offer:nth-child(2){flex:1 1 0;background:var(--x-tile-2);color:var(--x-on-tile-2)}.atc-v-offer:nth-child(n+3){flex:1 1 0;background:var(--x-tile-3);color:var(--x-on-tile-3)}
.atc-v-offer>i{position:absolute;right:-12px;top:-12px;width:42px;height:42px;background:${MSC('tertiary')};clip-path:var(--x-sh-i4)}
.atc-v-offer:nth-child(2)>i{background:${MSC('primary')};clip-path:var(--x-sh-i6)}.atc-v-offer:nth-child(n+3)>i{background:${MSC('secondary')};clip-path:var(--x-sh-i2)}
.atc-v-offer>:is(b,small){position:relative;overflow:hidden;text-overflow:ellipsis}.atc-v-offer>small{white-space:nowrap}.atc-v-offer>b{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2}.atc-v-offer>b{font-weight:700}.atc-v-offer>small{font-size:10px;line-height:13px;opacity:.85}
.atc-v-offer .atc-v-act{position:absolute;left:4px;top:4px;width:24px;height:24px;color:inherit}.atc-v-offer .atc-v-act svg{width:15px;height:15px}
/* Market place: icon tiles with counts. */
.atc-v-market{flex:1;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));align-items:center;text-align:center}
.atc-v-market>div{display:flex;flex-direction:column;align-items:center;gap:2px;font-size:11px;font-weight:600;white-space:nowrap}
.atc-v-market .atc-v-ico{width:42px;height:42px}.atc-v-market .atc-v-ico svg{width:22px;height:22px}.atc-v-market b{font-family:var(--x-font-num);color:var(--x-ink)}
/* Events: colour tiles, play icon over views · rating. */
.atc-v-events{flex:1;display:flex;gap:6px;min-height:0}
.atc-v-ev{position:relative;min-width:0;display:flex;flex-direction:column;justify-content:space-between;padding:8px;border-radius:var(--x-r-card-sm);clip-path:var(--x-card-clip);overflow:hidden}
.atc-v-ev.e0{flex:1.7 1 0}.atc-v-ev.e1{flex:1 1 0}.atc-v-ev.e2{flex:.6 1 0}.atc-v-ev.is-more{flex:0 0 28px;padding:8px 0;align-items:center;justify-content:center}
.atc-v-ev svg{width:22px;height:22px}.atc-v-ev span{font-family:var(--x-font-num);font-size:10px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* Profile details: the design's 4-column grid, label over value. */
.atc-pgrid{display:none}${R} .atc-pgrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px 10px;margin:4px 0 2px}
.atc-pgrid>div{display:flex;flex-direction:column;min-width:0}
.atc-pgrid span{font-size:10px;line-height:13px;font-weight:500;letter-spacing:.3px;color:${OSV};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.atc-pgrid b{font-size:12px;line-height:16px;font-weight:600;color:var(--x-on-hero);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.atc-pgrid b[data-fwd]{color:var(--x-hero-ink)}
/* BONUS ROW (app-evaluation-widget, XProfile footer): EGP's svgs stay the hover/click targets, so the popover still
   anchors to them; each paints a Material icon through a mask on its own box, its paths hidden. Vault and More info
   are text buttons. EGP pinned the popover at top:288px of the card, over this row: the pointer left the icon, the
   popover closed, then opened again (the flashing). It hangs under the row now and never takes the pointer. */
${EV}{display:flex!important;align-items:center;gap:4px;margin-top:8px!important;font-size:12px;line-height:16px}
${EV}>small{display:inline-flex!important;align-items:center;gap:2px;font-size:12px!important;font-weight:600!important;color:inherit!important;white-space:nowrap}
${EV}>small>span:first-child{margin-left:4px;color:var(--x-hero-ink)}${EV}>small>span{display:inline-flex}
${EV} svg{box-sizing:border-box;flex:none;margin:0!important;padding:0;cursor:pointer;background:${OSV};transition:background-color .15s}${EV} svg>*{visibility:hidden}
${EV}>small>svg,${EV}>small>span>svg{width:28px!important;height:28px!important;-webkit-mask:${MASK('vis')};mask:${MASK('vis')};-webkit-mask-size:18px;mask-size:18px}
${EV}>small>svg[width="16"]{-webkit-mask-image:${MASK('visoff').split(' center')[0]};mask-image:${MASK('visoff').split(' center')[0]}}
${EV}>small>span>svg{-webkit-mask-image:${MASK('info').split(' center')[0]};mask-image:${MASK('info').split(' center')[0]}}
${EV}>small>svg:hover,${EV}>small>span>svg:hover{background:var(--x-hero-ink)}
${EV}>span{display:inline-flex!important;align-items:center;gap:2px!important;margin-left:auto}
${EV}>span>span,${EV}>span>small{position:relative;display:inline-flex!important;align-items:center;gap:4px;height:28px;padding:0 8px;border-radius:var(--x-r-btn);clip-path:var(--x-btn-clip);font-size:12px;font-weight:600;color:var(--x-hero-ink);transition:background-color .15s}
${EV}>span>span:hover,${EV}>span>small:hover{background:color-mix(in srgb,var(--x-hero-ink) 10%,transparent)}
${EV}>span>span>svg{width:16px!important;height:16px!important;background:var(--x-hero-ink);-webkit-mask:${MASK('lock')};mask:${MASK('lock')}}
${EV}>span>span>small{position:static;display:inline;padding:0;height:auto}
${EV}>span a{color:var(--x-hero-ink)!important;font-size:12px;font-weight:600;text-decoration:none!important;white-space:nowrap}${EV}>span a::after{content:"";position:absolute;inset:0}
${R} #global-portal app-evaluation-widget{display:block;position:relative}
${R} #global-portal .performance-metrics-popover .popover{top:calc(100% + 8px)!important;left:0!important;pointer-events:none!important}
/* PROFILE HERO (XProfile): the card is tagged atc-c-profile by tagCards(). */
${R} .box-widget.atc-c-profile{position:relative;background:var(--x-hero)!important;color:var(--x-on-hero);border-radius:var(--x-r-hero)!important;box-shadow:var(--x-hero-shadow)!important}
${R} .atc-c-profile::before{content:"";position:absolute;left:0;right:0;top:0;height:var(--x-hazard-h);background:var(--x-hazard);pointer-events:none}
${R} .atc-c-profile .border-bottom{border-color:transparent!important}
${R} .atc-c-profile .border-bottom>.row{flex-wrap:nowrap;align-items:flex-start!important}${R} .atc-c-profile .border-bottom>.row>.col-md-9{flex:1 1 auto;width:auto;min-width:0}${R} .atc-c-profile .border-bottom>.row>.col-md-3{flex:none;width:auto}
${R} .atc-c-profile .gp-user-horizontal-fig{display:flex;align-items:center;gap:14px}
${R} .atc-c-profile .fig-pod.lg{position:relative;width:76px!important;height:76px!important;flex:none}
${R} .atc-c-profile .fig-pod.lg::before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,${MSC('primary')},${MSC('tertiary')});clip-path:var(--x-sh-avatar);transition:clip-path var(--x-spatial)}
${R} .atc-c-profile .fig-pod.lg:hover::before{clip-path:var(--x-sh-avatar-2)}
${R} #global-portal .atc-c-profile .fig-pod.lg .Profile-img{position:absolute;inset:4px;width:68px!important;height:68px!important;border:0!important;object-fit:cover;background:${MSC('surface-container-highest')}}
${R} .atc-c-profile .fig-pod.lg.active::after{content:"";position:absolute;right:-2px;bottom:2px;width:16px;height:16px;border-radius:50%;background:var(--x-ok);box-shadow:0 0 0 3px ${MSC('surface')}}
${R} .atc-c-profile figcaption{display:flex;flex-wrap:wrap;align-items:center;gap:6px;min-width:0}
${R} .atc-c-profile figcaption h5{width:100%;margin:0}
${R} .atc-c-profile figcaption h5 b{display:block;font-size:24px;line-height:28px;font-weight:700;text-shadow:var(--x-glow-text)}
${R} #global-portal .atc-c-profile figcaption h5 small{display:block;margin-top:2px;font-size:12px;line-height:16px;color:${OSV}!important}
${R} .atc-c-profile figcaption>small.mt-1,${R} .atc-c-profile figcaption a.emp-attachment-hover,${R} .atc-pchip,${R} .atc-since{display:inline-flex;align-items:center;gap:4px;height:24px;box-sizing:border-box;margin:0!important;padding:0 9px;border-radius:var(--x-r-chip);font-size:11px;font-weight:500;white-space:nowrap}
${R} .atc-c-profile figcaption>small.mt-1,${R} .atc-c-profile figcaption a.emp-attachment-hover,${R} .atc-since{border:1px solid ${OV}}
${R} #global-portal .atc-c-profile figcaption a.emp-attachment-hover{color:var(--x-hero-ink)!important;font-weight:600}
${R} .atc-c-profile figcaption .margin-r5.margin-l5{display:none}
${R} .atc-pchip{padding-left:6px;font-weight:600;background:var(--x-ok-container);color:var(--x-on-ok-container)}
${R} .atc-pchip.is-tense{background:var(--x-tense-container);color:var(--x-on-tense-container)}${R} .atc-pchip.is-danger{background:var(--x-danger-container);color:var(--x-on-danger-container)}
${R} .atc-pchip svg{width:15px;height:15px}
${R} #global-portal .atc-c-profile .col-md-3 .text-center>.text-primary.fs-4{width:54px;height:54px;margin:0 auto 2px;display:grid!important;place-items:center;line-height:1;background:var(--x-tile-3);color:var(--x-on-tile-3)!important;clip-path:var(--x-sh-badge);font-size:26px;text-shadow:none}
${R} .atc-c-profile .col-md-3 .text-center>small{font-size:11px;font-weight:600;letter-spacing:.3px;white-space:nowrap}
${R} #global-portal .atc-c-profile table.emp-data-info td :is(span,p){font-size:inherit!important}
${R} .atc-c-profile table.emp-data-info td{padding:2px 8px 2px 0;font-size:10px!important;line-height:13px;letter-spacing:.3px;color:${OSV};vertical-align:top}
${R} #global-portal .atc-c-profile table.emp-data-info :is(b,a){font-size:12px;line-height:16px;font-weight:600;color:var(--x-on-hero)!important;letter-spacing:0}
${R} #global-portal .atc-c-profile table.emp-data-info a{color:var(--x-hero-ink)!important}
${R} #global-portal .atc-c-profile .time-check :is(small,span){font-size:11px;font-weight:500!important;color:${OSV}}
${R} #global-portal .atc-c-profile a:not(.emp-attachment-hover){color:var(--x-hero-ink)!important;font-weight:600}
${R} app-personal-info-widget figcaption h5 b{font-family:var(--x-font-display);font-variation-settings:var(--x-display-fvs);text-transform:var(--x-title-tt);letter-spacing:var(--x-title-ls);color:${OS}}
${R} .circular-progress .progress-bg{stroke:var(--x-track)!important}${R} .circular-progress circle.progress{stroke:${MSC('primary')}!important}
${R} .circle-progress-inner>:nth-child(5) circle.progress{stroke:${MSC('secondary')}!important}
${R} .circular-progress .progress-inner-text{color:${OS};font-family:var(--x-font-num);font-variation-settings:var(--x-num-fvs-sm);font-weight:700}
${R} :is(.popover,.dropdown-menu,.toast){background-color:${MSC('surface-container-high')}!important;color:${OS}!important;border-color:${OV}!important;border-radius:var(--x-r-card-sm)}
${R} .modal-content{background-color:${MSC('surface-container-high')}!important;color:${OS}!important;border:0!important;border-radius:var(--x-r-hero)}
${R} :is(.popover-title,.popover-header,.modal-header,.modal-footer){background:transparent!important;color:${OS}!important;border-color:${OV}!important}
${R} .popover.bottom>.arrow::after{border-bottom-color:${MSC('surface-container-high')}!important}${R} .popover.top>.arrow::after{border-top-color:${MSC('surface-container-high')}!important}
${R} .popover.left>.arrow::after{border-left-color:${MSC('surface-container-high')}!important}${R} .popover.right>.arrow::after{border-right-color:${MSC('surface-container-high')}!important}
${R} :is(.dropdown-item,.close,.btn-close){color:${OS}!important;text-shadow:none}${R} .dropdown-item:hover{background:${LAYER(8)}!important}
${R} :is(#calendar,.fc){background:transparent!important}${R} .fc :is(td,th,.fc-widget-content,.fc-widget-header){border-color:${OV}!important}
${R} .fc-disabled-day{background:${LAYER(4)}!important}${R} .fc-button{background:var(--x-tile-2)!important;color:var(--x-on-tile-2)!important;border:0!important;text-shadow:none!important;box-shadow:none!important}
${R} #global-portal .side-nav-tab{background:var(--x-card)!important;border:var(--x-card-border)!important;border-radius:var(--x-r-card);box-shadow:var(--x-card-shadow);padding:6px;overflow:hidden}
${R} #global-portal .side-nav-tab *{border:0!important;box-shadow:none!important}${R} #global-portal .side-nav-tab :is(li,.ui-state-default){background:transparent!important;margin-bottom:2px}
${R} #global-portal .side-nav-tab ul>li>a{color:${OSV}!important;border-radius:var(--x-r-card-sm)!important;font-weight:600;transition:background-color var(--x-effects)}
${R} #global-portal .side-nav-tab ul>li>a:hover{background:${LAYER(8)}}${R} #global-portal .side-nav-tab ul>li>a i{color:var(--x-ink)!important}
${R} #global-portal .side-nav-tab li:is(.ui-tabs-active,.active)>a{background:var(--x-tile-2)!important;color:var(--x-on-tile-2)!important}
${R} #global-portal .side-nav-tab li:is(.ui-tabs-active,.active)>a i{color:var(--x-on-tile-2)!important}
${R} #global-portal :is(.ui-widget-content,.ui-widget-header,.ui-tabs){background:transparent!important;color:${OS}!important;border-color:${OV}!important}
${R} :where(#global-portal) :is(.form-control,.form-select,select,textarea,input:not([type=checkbox],[type=radio],[type=color],[type=range]),.custom-search-input)${NW}{background-color:transparent!important;color:${OS}!important;
 border:1px solid ${MSC('outline')}!important;border-radius:var(--x-r-field)!important;box-shadow:none!important}
${R} :where(#global-portal) :is(.form-control,.form-select,select,textarea,input):focus${NW}{border-color:${MSC('primary')}!important;box-shadow:inset 0 0 0 1px ${MSC('primary')}!important}
${R} option{background:${MSC('surface-container-high')};color:${OS}}${R} ::placeholder{color:${OSV}!important}
${RD} .form-select${NW}{background-image:url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23c4c7c5' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e")!important}
${R} .form-floating-label label{background:transparent!important;top:-18px!important;left:6px!important;color:${OSV}!important;font-weight:600}
${R} :where(#global-portal) :is(.gp-btn-primary,.btn-primary)${NW}{background:var(--x-fill)!important;border-color:transparent!important;color:var(--x-on-fill)!important;border-radius:var(--x-r-btn)!important;clip-path:var(--x-btn-clip);font-weight:600;box-shadow:var(--x-glow)!important}
${R} :where(#global-portal) :is(.btn-light,.btn-default,.btn-secondary,.btn-outline-primary)${NW}{background:var(--x-tile-2)!important;color:var(--x-on-tile-2)!important;border-color:transparent!important;border-radius:var(--x-r-btn)!important}
${R} .attendence-outer .attendence-box{background:var(--x-tile)!important;color:${OSV}!important;border:var(--x-card-border)!important;border-radius:var(--x-r-card-sm)!important;box-shadow:none!important}
${R} .attendence-outer .attendence-box:first-child{background:var(--x-tile-2)!important;color:var(--x-on-tile-2)!important}${R} .attendence-outer .attendence-box:first-child strong{color:var(--x-on-tile-2)!important}
${R} .attendence-outer .attendence-box strong{color:var(--x-ink)!important;font-family:var(--x-font-num);font-variation-settings:var(--x-num-fvs-sm);white-space:nowrap;letter-spacing:-.02em;text-shadow:var(--x-glow-text)}
${R} .emp-list-table .table-theme th{background:${MSC('surface-container-high')}!important;color:${OSV}!important;border-color:${OV}!important;font-weight:700;text-transform:var(--x-title-tt);letter-spacing:var(--x-title-ls)}
${R} .table${NW}{--bs-table-bg:transparent;--bs-table-accent-bg:transparent;--bs-table-striped-bg:${LAYER(4)};--bs-table-striped-color:${OS};--bs-table-hover-bg:${LAYER(8)};--bs-table-hover-color:${OS};color:${OS};border-color:${OV}}
${R} .table${NW}>:not(caption)>*>*{border-bottom-color:${OV}!important}${R} #global-portal .table-theme td{color:${OS}}
${R} :is(.bg-success,.bg-success>td)${NW}{background-color:color-mix(in srgb,var(--x-ok-container) 30%,transparent)!important;color:${OS}!important}
${R} #global-portal tr.bg-success>td:first-child${NW}{box-shadow:inset 5px 0 0 var(--x-ok)!important}
${R} #global-portal tr.bg-success>td[colspan] b${NW}{display:inline-block;padding:2px 12px;border-radius:var(--x-r-chip);background:var(--x-ok-container);color:var(--x-on-ok-container)!important;font-weight:600}
${R} :is(.bg-danger,.bg-danger>td)${NW}{background-color:color-mix(in srgb,var(--x-danger-container) 30%,transparent)!important;color:${OS}!important}
${R} #global-portal tr.bg-danger>td:first-child${NW}{box-shadow:inset 5px 0 0 var(--x-danger)!important}
${R} #global-portal tr.bg-danger>td[colspan] b${NW}{display:inline-block;padding:2px 12px;border-radius:var(--x-r-chip);background:var(--x-danger-container);color:var(--x-on-danger-container)!important;font-weight:600}
${R} #global-portal .set-purple${NW}{box-shadow:inset 5px 0 0 var(--x-void)!important}
${R} #global-portal :is(.bg-purple,.purple-box)${NW}{background:var(--x-void-container)!important;color:var(--x-on-void-container)!important}${R} #global-portal table .apt-reason-purple{color:var(--x-void)!important}
${R} :where(#global-portal) .page-link${NW}{background:transparent!important;color:${OS}!important;border:0!important;border-radius:var(--x-r-btn)!important;margin:0 2px}
${R} :where(#global-portal) .page-item.active .page-link${NW}{background:var(--x-fill)!important;color:var(--x-on-fill)!important}
/* Drawer (XRail drawer): 48px rows with an icon (mountAtt tags them by text). */
${R} #global-portal .side-nav-tab ul>li>a[data-atc-ico]{min-height:48px;display:flex!important;align-items:center;gap:12px;padding:0 16px!important;text-align:left;font-size:14px}
${R} .side-nav-tab a[data-atc-ico]::before{content:"";width:20px;height:20px;flex:none;background:currentColor;-webkit-mask:${MASK('event')};mask:${MASK('event')}}
${R} .side-nav-tab a[data-atc-ico=busy]::before{-webkit-mask:${MASK('busy')};mask:${MASK('busy')}}
/* ATTENDANCE (Attendance v2). Header: display title, filled fields, 48px Submit; Open in Excel moves to the top right. */
${AT} .attendence-inner{position:relative}
${AT} .attendence-inner>div:first-child{float:left;height:52px;display:flex;align-items:center;margin:0 16px 16px 4px}
${AT} .attendence-inner>div:first-child>h5{margin:0!important;font-family:var(--x-font-display);font-variation-settings:var(--x-display-fvs);font-size:30px;line-height:36px;font-weight:700;letter-spacing:var(--x-title-ls);text-transform:var(--x-title-tt);text-shadow:var(--x-glow-text);color:${OS}!important}
${AT} .attendence-inner>.row.mb-2{--bs-gutter-x:0;display:flex;flex-wrap:nowrap;align-items:center;gap:16px;margin:0 200px 16px 0!important}
${AT} .attendence-inner>.row.mb-2>[class*=col-]{flex:none;width:auto;max-width:none;padding:0;margin:0!important}
${AT} .attendence-inner>.row.mb-2>:nth-child(1){width:340px}${AT} .attendence-inner>.row.mb-2>:nth-child(2){width:220px}
${AT} .form-floating-label{position:relative}
${AT} .form-floating-label>:is(input,select){box-sizing:border-box;width:100%;height:52px!important;padding:20px 16px 4px!important;border:0!important;border-radius:var(--x-r-card-sm) var(--x-r-card-sm) 4px 4px!important;clip-path:var(--x-btn-clip);
 background-color:${MSC('surface-container-highest')}!important;box-shadow:inset 0 -1px 0 ${OSV}!important;font-size:14px!important;line-height:20px;color:${OS}!important;transition:box-shadow var(--x-effects)}
${AT} .form-floating-label>select{padding-right:40px!important}${AT} .form-floating-label>:is(input,select):focus{box-shadow:inset 0 -2px 0 ${MSC('primary')}!important}
${AT} .form-floating-label>label{position:absolute;top:8px!important;left:16px!important;right:auto;margin:0;padding:0!important;transform:none!important;opacity:1;font-size:11px!important;line-height:14px;font-weight:600;color:${OSV}!important;background:transparent!important;pointer-events:none}
${AT} .form-floating-label:focus-within>label{color:${MSC('primary')}!important}
${AT} .attendence-inner>.row.mb-2 .gp-btn-primary{height:48px;display:inline-flex;align-items:center;gap:8px;padding:0 28px 0 22px!important;font-size:16px!important;font-weight:700!important;line-height:1}
${AT} .attendence-inner>.row.mb-2 .gp-btn-primary::before{content:"";width:20px;height:20px;flex:none;background:currentColor;-webkit-mask:${MASK('search')};mask:${MASK('search')}}
${AT} li[data-atc-xl]{position:absolute;top:6px;right:0;list-style:none}
${AT} li[data-atc-xl] .gp-btn{height:40px;display:inline-flex;align-items:center;gap:8px;padding:0 16px!important;background:var(--x-tile-2)!important;color:var(--x-on-tile-2)!important;box-shadow:none!important;font-size:14px!important;font-weight:700!important;white-space:nowrap}
${AT} li[data-atc-xl] .gp-btn>svg{display:none}${AT} li[data-atc-xl] .gp-btn::before{content:"";width:18px;height:18px;flex:none;background:currentColor;-webkit-mask:${MASK('sheet')};mask:${MASK('sheet')}}
/* Bento (XBento): four group cards, the first a hero; tiles of icon shape, number + unit, label; Hours % wave. */
.atc-bento{display:none}${AT} .atc-bento .atc-v-t{margin:0!important;font-size:15px!important;line-height:20px!important;font-weight:600!important;color:inherit!important}${AT} .atc-bento{clear:both;display:grid;grid-template-columns:1.15fr 1.15fr 1fr 1.1fr;gap:12px;margin:0 0 16px;font-family:var(--x-font-body);font-size:12px;line-height:16px;color:${OS}}
.atc-bg{position:relative;box-sizing:border-box;min-width:min-content;padding:14px;display:flex;flex-direction:column;gap:12px;overflow:hidden;border-radius:var(--x-r-card);background:var(--x-card);border:var(--x-card-border);box-shadow:var(--x-card-shadow);clip-path:var(--x-card-clip)}
.atc-bg.is-hero{background:var(--x-hero);color:var(--x-on-hero);box-shadow:var(--x-hero-shadow)}.atc-bg.is-hero::before{content:"";position:absolute;left:0;right:0;top:0;height:var(--x-hazard-h);background:var(--x-hazard)}
.atc-bg-n{font-size:11px;font-weight:500;color:${OSV};white-space:nowrap}
.atc-bg-tiles{display:grid;gap:8px}
.atc-bt{position:relative;box-sizing:border-box;padding:12px;display:flex;flex-direction:column;gap:8px;border-radius:var(--x-r-card-sm);background:var(--x-tile);clip-path:var(--x-card-clip)}
.atc-bt-h{display:flex;align-items:center;justify-content:space-between}.atc-bt .atc-v-ico{width:36px;height:36px}.atc-bt .atc-v-ico svg{width:20px;height:20px}
.atc-bt-d{font-size:11px;font-weight:600;color:${OSV};white-space:nowrap}.atc-bt-d.is-ok{color:var(--x-ok)}.atc-bt-d.is-tense{color:var(--x-tense)}
.atc-bt-v{font-family:var(--x-font-num);font-variation-settings:var(--x-num-fvs);font-size:34px;line-height:38px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.01em;white-space:nowrap;text-shadow:var(--x-glow-text)}
.atc-bt-v small{margin-left:2px;font-size:15px;font-weight:600;color:${OSV}}
.atc-bt-k{font-size:11px;line-height:14px;font-weight:600;letter-spacing:.4px;color:${OSV};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.atc-bg-wave{display:flex;flex-direction:column;gap:6px;margin-top:auto}.atc-bg-wl{display:flex;justify-content:space-between;font-size:11px;font-weight:600;color:${OSV}}
.atc-wv.is-thick{height:20px;gap:6px}.atc-wv.is-thick .atc-wv-a{width:calc(var(--wp,0) * (100% - 20px));height:20px}.atc-wv.is-thick .atc-wv-a::before{top:6px;height:8px;border-radius:4px}
.atc-wv.is-thick .atc-wv-a::after{-webkit-mask-size:40px 20px;mask-size:40px 20px}.atc-wv.is-thick .atc-wv-t{height:8px;border-radius:4px}.atc-wv.is-thick .atc-wv-s{width:8px;height:8px}
/* Search pill + legend as filter chips with counts. */
${AT} .attendence-inner>.row:not(.mb-2){--bs-gutter-x:0;clear:both;display:flex;flex-wrap:nowrap;align-items:center;gap:12px;margin:0 0 16px!important}
${AT} .attendence-inner>.row:not(.mb-2)>[class*=col-]{flex:none;width:auto;max-width:none;padding:0;margin:0}
${AT} .attendence-inner>.row:not(.mb-2)>.col-lg-2{width:360px}${AT} .attendence-inner>.row:not(.mb-2)>.col-lg-10{flex:1 1 0;min-width:0}
${AT} .search-box{margin:0!important}${AT} .custom-search-input::placeholder{text-transform:none}
${AT} .search-box .custom-search-input{box-sizing:border-box;width:100%!important;height:48px!important;padding:0 16px 0 48px!important;border:0!important;border-radius:var(--x-r-btn)!important;clip-path:var(--x-btn-clip);background-color:${MSC('surface-container-high')}!important;box-shadow:none!important;font-size:15px!important;color:${OS}!important}
${AT} .search-box .search-icon{position:absolute;left:16px!important;right:auto!important;top:50%!important;transform:translateY(-50%);display:grid;place-items:center;color:${OSV}}
${AT} .search-box .search-icon svg{width:22px;height:22px}${AT} .search-box .search-icon svg [fill]:not([fill=none]){fill:currentColor}${AT} .search-box .search-icon svg [stroke]:not([stroke=none]){stroke:currentColor}
${AT} .attendence-legends{justify-content:flex-start!important;align-items:center}${AT} .attendence-legends>ul{margin:0;padding:0}
.atc-legend{display:none}${AT} .atc-legend{flex:1;min-width:0;display:flex;align-items:center;gap:8px;margin-left:8px}
.atc-lg{height:32px;box-sizing:border-box;display:inline-flex;align-items:center;gap:8px;padding:0 12px 0 8px;border:1px solid ${OV};border-radius:var(--x-r-chip);font-size:13px;font-weight:600;white-space:nowrap;cursor:pointer;transition:background-color var(--x-effects)}
.atc-lg:hover{background:${LAYER(8)}}.atc-lg.is-on{border-color:transparent;background:var(--x-tile-2);color:var(--x-on-tile-2)}
.atc-lg i{width:14px;height:14px;flex:none}.atc-lg b{font-family:var(--x-font-num);font-size:12px;font-weight:600;opacity:.75}.atc-lg-meta{margin-left:auto;font-size:12px;color:${OSV};white-space:nowrap}
/* Panel | table while the panel is the 640px summary and the region is wide enough; the table takes the panel's height
   and scrolls. Narrower, the bento wraps 2 × 2 and the panel stays above the table (viewport queries: a size container would
   also contain the fixed-position overlays inside). */
@media (max-width: 1699px){${AT} .atc-bento{grid-template-columns:1fr 1fr}}
@media (min-width: 1560px){${AT} .atc-2col .emp-list-table{display:grid;grid-template-columns:560px minmax(0,1fr);gap:16px;align-items:start}
${AT} .atc-2col #total-time-summary{width:auto!important;max-width:none!important;margin:0!important;transform:none!important}
${AT} .atc-2col .main-attendance-table{align-self:stretch;contain:size;min-height:600px;max-height:none!important}
${AT} .atc-2col>.d-flex.justify-content-between{margin-left:576px}}
/* Table (XTable): card, tile-2 header in display type, shape markers, In/Out icons, WFH / short / extra chips, leave and absent chips. */
${AT} .main-attendance-table{height:auto!important;max-height:820px;overflow:auto;border:var(--x-card-border)!important;border-radius:var(--x-r-card)!important;background:var(--x-card)!important;box-shadow:var(--x-card-shadow);clip-path:var(--x-card-clip);font-variant-numeric:tabular-nums}
${AT} .main-attendance-table>table{margin:0!important;width:100%;border-collapse:separate;border-spacing:0}
${AT} .main-attendance-table thead th{height:44px;padding:0 8px!important;border:0!important;background:var(--x-tile-2)!important;color:var(--x-on-tile-2)!important;text-align:left!important;vertical-align:middle;white-space:nowrap;
 font-family:var(--x-font-display);font-variation-settings:var(--x-display-fvs);font-size:13px!important;font-weight:600!important;letter-spacing:var(--x-title-ls);text-transform:var(--x-title-tt)}
${AT} .main-attendance-table thead th:first-child{width:92px;padding-left:36px!important}${AT} .main-attendance-table thead th:nth-child(2){width:140px}
${AT} .main-attendance-table tbody tr{background:transparent!important}
${AT} .main-attendance-table tbody tr>td{height:36px;padding:0 8px!important;border:0!important;border-top:1px solid ${OV}!important;background:transparent!important;box-shadow:none!important;text-align:left!important;vertical-align:middle;font-size:12px!important;line-height:16px;color:${OS}!important}
${AT} .main-attendance-table tbody tr:hover>td{background:${LAYER(8)}!important}
${AT} .main-attendance-table tbody tr>td:first-child{position:relative;padding-left:36px!important;box-shadow:none!important;color:${OSV}!important}
${AT} .main-attendance-table tbody tr>td:nth-child(2),${AT} .main-attendance-table tbody tr>td:nth-child(4):not([colspan]){font-weight:500}
${AT} .main-attendance-table tbody tr>:is(td:nth-child(3),td.text-muted){color:${OSV}!important}
${AT} .main-attendance-table tr[data-atc-k]>td:first-child::before{content:"";position:absolute;left:12px;top:50%;width:12px;height:12px;margin-top:-6px}
${AT} .main-attendance-table tr[data-atc-k=leave]>td:first-child::before{background:var(--x-ok);clip-path:var(--x-sh-i2)}
${AT} .main-attendance-table tr:is([data-atc-k=absent],[data-atc-k=bad])>td:first-child::before{background:${MSC('error')};clip-path:var(--x-sh-i5)}
${AT} .main-attendance-table tr[data-atc-k=wfh]>td:first-child::before{background:${MSC('tertiary')};clip-path:var(--x-sh-i3)}
${AT} .main-attendance-table td[data-atc-io]::before{content:"";display:inline-block;width:16px;height:16px;margin-right:6px;vertical-align:-4px;background:${MSC('primary')};-webkit-mask:${MASK('login')};mask:${MASK('login')}}
${AT} .main-attendance-table td[data-atc-io=out]::before{background:${OSV};-webkit-mask:${MASK('logout')};mask:${MASK('logout')}}
${AT} .main-attendance-table tr[data-atc-t~=wfh] td[data-atc-io=in]::after{content:"WFH";display:inline-flex;align-items:center;height:20px;margin-left:6px;padding:0 8px;vertical-align:middle;border-radius:var(--x-r-chip);background:${MSC('tertiary-container')};color:${MSC('on-tertiary-container')};font-size:11px;font-weight:600}
${AT} .main-attendance-table tbody tr>td[data-atc-chip]{position:relative;z-index:0;padding-left:30px!important;font-weight:600}
${AT} .main-attendance-table td[data-atc-chip]::before{content:"";position:absolute;z-index:-1;left:4px;top:50%;width:calc(8ch + 34px);height:22px;margin-top:-11px;border-radius:var(--x-r-chip)}
${AT} .main-attendance-table td[data-atc-chip]::after{content:"";position:absolute;left:11px;top:50%;width:14px;height:14px;margin-top:-7px;background:currentColor}
${AT} .main-attendance-table tbody tr>td[data-atc-chip=bad]{color:var(--x-on-danger-container)!important}${AT} .main-attendance-table td[data-atc-chip=bad]::before{background:var(--x-danger-container)}
${AT} .main-attendance-table td[data-atc-chip=bad]::after{-webkit-mask:${MASK('trend')};mask:${MASK('trend')}}
${AT} .main-attendance-table tbody tr>td[data-atc-chip=ok]{color:var(--x-on-ok-container)!important}${AT} .main-attendance-table td[data-atc-chip=ok]::before{background:var(--x-ok-container)}
${AT} .main-attendance-table td[data-atc-chip=ok]::after{-webkit-mask:${MASK('add')};mask:${MASK('add')}}
${AT} .main-attendance-table tbody tr>td[colspan="5"]{color:${OSV}!important}
${AT} .main-attendance-table tbody tr>td[colspan] b{display:inline;padding:0!important;background:none!important;font-weight:400!important;color:${OSV}!important}
${AT} .main-attendance-table td[data-atc-same] b>span:last-child{display:none}
.atc-lchip{display:inline-flex;align-items:center;gap:6px;height:24px;margin-right:8px;padding:0 12px 0 8px;vertical-align:middle;border-radius:var(--x-r-chip);background:var(--x-ok-container);color:var(--x-on-ok-container);font-size:12px;font-weight:600;white-space:nowrap}
.atc-lchip svg{width:16px;height:16px}.atc-lchip.is-absent{background:${MSC('error-container')};color:${MSC('on-error-container')}}.atc-lchip.is-pending{background:var(--x-tense-container);color:var(--x-on-tense-container)}
${AT} .main-attendance-table tbody tr[data-atc-k=total]>td{border-top:2px solid ${OV}!important;background:var(--x-tile)!important;font-weight:700}
${AT} .main-attendance-table tbody tr[data-atc-k=none]>td{height:72px;text-align:center!important;color:${OSV}!important}
${AT} .main-attendance-table[data-atc-f=wfh] tbody tr[data-atc-k]:not([data-atc-k=total]):not([data-atc-t~=wfh]),${AT} .main-attendance-table[data-atc-f=ok] tbody tr[data-atc-k]:not([data-atc-k=total]):not([data-atc-t~=ok]),
${AT} .main-attendance-table[data-atc-f=bad] tbody tr[data-atc-k]:not([data-atc-k=total]):not([data-atc-t~=bad]){display:none}
/* Pager: a connected group, the current page filled; Show as an outlined select. */
${AT} .attendance-details-wrapper>.d-flex.justify-content-between{margin-top:10px!important}
${AT} .pagination{gap:2px!important;margin:0}
${AT} .pagination .page-link{min-width:36px;width:auto!important;height:36px!important;box-sizing:border-box;display:grid;place-items:center;margin:0!important;padding:0 10px!important;border:0!important;border-radius:var(--x-r-btn-inner)!important;clip-path:var(--x-btn-clip);
 background:${MSC('surface-container-highest')}!important;color:${OSV}!important;box-shadow:none!important;font-family:var(--x-font-num);font-size:13px;font-weight:700;text-align:center}
${AT} .pagination .page-item:first-child .page-link{border-radius:var(--x-r-btn) var(--x-r-btn-inner) var(--x-r-btn-inner) var(--x-r-btn)!important}${AT} .pagination .page-item:last-child .page-link{border-radius:var(--x-r-btn-inner) var(--x-r-btn) var(--x-r-btn) var(--x-r-btn-inner)!important}
${AT} .pagination input.page-link{width:44px!important;background:var(--x-fill)!important;color:var(--x-on-fill)!important;border-radius:var(--x-r-btn)!important;opacity:1}
${AT} .pagination button.page-link:disabled{opacity:.5}
${AT} .form-inline label{margin-right:10px;font-size:12px;font-weight:500;color:${OSV}}
${AT} .form-inline select{width:auto;height:36px!important;padding:0 28px 0 12px!important;font-size:14px!important;border:1px solid ${MSC('outline')}!important;border-radius:var(--x-r-field)!important}`;

// MATERIAL YOU: a fourth widget theme over the glass base, like Just Business. M3 tokens (Google blue baseline),
// flat tonal surfaces, M3 shapes and type. Light/dark follows the browser, like the portal.
const M3 = d => d
    ? '--att-panel:#131314;--att-card:#1e1f20;--att-border:#444746;--att-shadow:none;--att-text:#e3e3e3;--att-muted:#c4c7c5;--att-accent:#a8c7fa;--att-on-accent:#062e6f;--att-ink:#a8c7fa;--att-track:#0842a0;--att-inner:#282a2c;--att-inner-b:#333537;--att-scheme:dark;--att-ok:#6dd58c;--att-danger:#f2b8b5;--att-low:#a8c7fa;--att-tense:#ffb68a;--att-void:#d0bcff;--att-up:#6dd58c;--att-run:#fdd663;--att-home:#ffb1c8;--m-pc:#0842a0;--m-on-pc:#d3e3fd;--m-sc:#1e1f20;--m-sch:#333537;--m-out:#8e918f;--m-inv:#e3e3e3;--m-on-inv:#303030;color-scheme:dark'
    : '--att-panel:#f8fafd;--att-card:#ffffff;--att-border:#e1e3e1;--att-shadow:0 1px 2px rgba(0,0,0,.3),0 1px 3px 1px rgba(0,0,0,.15);--att-text:#1f1f1f;--att-muted:#444746;--att-accent:#0b57d0;--att-on-accent:#ffffff;--att-ink:#0b57d0;--att-track:#d3e3fd;--att-inner:#f0f4f9;--att-inner-b:#e1e3e1;--att-scheme:light;--att-ok:#146c2e;--att-danger:#b3261e;--att-low:#0b57d0;--att-tense:#8a5300;--att-void:#6750a4;--att-up:#146c2e;--att-run:#8a5300;--att-home:#b0164e;--m-pc:#d3e3fd;--m-on-pc:#041e49;--m-sc:#f0f4f9;--m-sch:#dde3ea;--m-out:#747775;--m-inv:#303030;--m-on-inv:#f2f2f2;color-scheme:light';
const T = '#total-time-summary.mat-theme', MS = 'html.atc-mat :is(.settings-modal,.xp-milestone-notification)';
const MAT_CSS = `
${T},${MS}{${M3(0)};--att-display:'Roboto Flex',Roboto,system-ui,sans-serif}
@media (prefers-color-scheme:dark){${T},${MS}{${M3(1)}}}
${T}:is(*,:hover){background:var(--att-panel);border:0;border-radius:28px;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;color:var(--att-text);font-family:'Roboto Flex',Roboto,system-ui,sans-serif}
${T}::before,${T} .rt-sweep{display:none}
${T} .ws-card{border:0;border-radius:24px;background:var(--att-card);box-shadow:var(--att-shadow);backdrop-filter:none;-webkit-backdrop-filter:none}
${T} .ws-head .summary-title{font:400 28px/1.15 var(--att-display)!important;letter-spacing:0}
${T} .ws-head .emoji-display{background:var(--m-pc);border:0;box-shadow:none;clip-path:var(--x-sh-mood)}
${T} .ws-head :is(.settings-button,.developer-info){border:0;border-radius:50%;background:var(--m-sc);color:var(--att-text);transition:background .2s}
${T} .ws-head :is(.settings-button,.developer-info):hover{background:var(--m-sch)}
${T} .ws-head .pip-button{height:40px;border-radius:20px;padding:0 24px 0 16px;font:500 14px/1 var(--att-display);letter-spacing:.1px;box-shadow:none;transition:box-shadow .2s}
${T} .ws-head .pip-button:hover{box-shadow:0 1px 2px rgba(0,0,0,.3),0 1px 3px 1px rgba(0,0,0,.15)}
${T} .ws-k{font:500 14px/1.4 var(--att-display);letter-spacing:.1px;text-transform:none}
${T} .ws-big{font:700 57px/1 var(--att-display);font-variation-settings:'wdth' 36,'wght' 720,'opsz' 144;letter-spacing:-.25px}
${T} .ws-at b{font:500 22px var(--att-display)}
${T} :is(.ws-pill,.ws-tl-bar){border:0;border-radius:8px;background:var(--att-inner)}
${T} .ws-tl-bar{border-radius:14px}
${T} .ws-tl-work{background-image:none;animation:none;border-radius:6px}
${T} .ws-slot.is-now{border-color:var(--att-accent);background:var(--m-pc)}
${T} .progress-bar{height:8px!important;border:0;border-radius:4px;background:var(--att-track)!important;box-shadow:none!important}
${T} .progress-fill{border-radius:4px;background:var(--att-accent)!important;box-shadow:none!important;animation:none!important}
${T} :is(.progress-fill,.progress-bar)::before,${T} .progress-fill::after{display:none}
${T} .modern-table{border:1px solid var(--att-inner-b);border-radius:16px;background:var(--att-card);box-shadow:none}
${T} .modern-table :is(th,td){border-color:var(--att-inner-b)!important;background:transparent}
${T} .modern-table th{color:var(--att-muted);font:500 12px/1.3 'Roboto Flex',Roboto,system-ui,sans-serif;letter-spacing:.5px;text-transform:none}
${T} .modern-table tbody tr:hover{background:color-mix(in srgb,var(--att-text) 8%,transparent)}
${T} :is(.emoji-display,.progress-bar,.modern-table tr,.settings-button,.developer-info,.pip-button):hover{transform:none!important}
${T} .ws-time-top .atc-r{align-self:center;margin-right:22px}
html.atc-mat .settings-modal{background:var(--m-sc);border:0;border-radius:28px;box-shadow:0 4px 8px 3px rgba(0,0,0,.15),0 1px 3px rgba(0,0,0,.3);backdrop-filter:none;-webkit-backdrop-filter:none;color:var(--att-text);font-family:'Roboto Flex',Roboto,system-ui,sans-serif}
html.atc-mat .settings-modal :is(.settings-tab){border:0;border-radius:16px;color:var(--att-muted)}
html.atc-mat .settings-modal .settings-tab.is-active{background:var(--m-pc);color:var(--m-on-pc)}
html.atc-mat .settings-modal .settings-select{border-radius:8px}
html.atc-mat .settings-modal .toggle-switch{width:52px;height:32px;border-radius:16px;background:var(--m-sch);box-shadow:inset 0 0 0 2px var(--m-out)}
html.atc-mat .settings-modal .toggle-switch::after{top:8px;left:8px;width:16px;height:16px;background:var(--m-out);box-shadow:none;transition:all .2s cubic-bezier(.2,0,0,1)}
html.atc-mat .settings-modal .toggle-switch.active{background:var(--att-accent);box-shadow:none}
html.atc-mat .settings-modal .toggle-switch.active::after{top:4px;left:4px;width:24px;height:24px;background:var(--att-on-accent);transform:translateX(20px)}
html.atc-mat .xp-milestone-notification{background:var(--m-inv);color:var(--m-on-inv);border:0;border-radius:8px;box-shadow:0 4px 8px 3px rgba(0,0,0,.15),0 1px 3px rgba(0,0,0,.3)}`;

// CHIP: a split button in the persistent header, its popover a mini widget. Angular may re-render the header,
// so it is re-mounted when detached.
let chip = null, pop = null, tcard = null, mring = null;
function mountChip(on) {
    const host = on && D.querySelector('.gp-main-navbar .header-icons');
    if (!host) { if (chip) chip.remove(); return; }
    if (!chip) {
        chip = D.createElement('div'); chip.setAttribute('role', 'group'); chip.setAttribute('aria-label', "Today's time");
        chip.innerHTML = `<button type="button" class="atc-chip-b" aria-haspopup="dialog" aria-expanded="false">${ring(24)}<span data-k="chip">—</span></button>`
            + `<button type="button" class="atc-chip-t" aria-haspopup="dialog" aria-expanded="false" aria-label="Open today's time">${icon('down')}</button>`
            + `<div class="atc-pop" role="dialog" aria-label="Today's time" hidden><div class="atc-pop-h"><div class="atc-mood" data-k="mood"></div>`
            + `<div class="atc-pop-m"><span class="atc-k" data-k="head"></span><span class="atc-big" data-k="big"></span></div><div class="atc-pop-e"><span data-k="endl"></span><b data-k="end"></b></div></div>`
            + `<div class="atc-wv" role="progressbar" aria-label="Shift progress"><div class="atc-wv-a"></div><div class="atc-wv-t"></div><div class="atc-wv-s"></div></div>`
            + `<div class="atc-err">${icon('off')}<span>Couldn't reach attendance. Times are hidden, not stale.</span></div>`
            + `<div class="atc-pop-x"><span class="atc-streak">🔥 <span data-k="streak"></span></span><span class="atc-lv" data-k="lv"></span><span data-k="lvl"></span><span class="atc-xp" data-k="xp"></span></div>`
            + `<a class="atc-btn" href="#/time-absence/attendence-record">${icon('event')}<span>Open attendance</span></a></div>`;
        pop = chip.querySelector('.atc-pop');
        const btns = chip.querySelectorAll('button'), show = v => { pop.hidden = !v; btns.forEach(b => b.setAttribute('aria-expanded', v)); chip.dataset.open = v ? '1' : ''; paint(); };
        btns.forEach(b => b.addEventListener('click', e => { e.stopPropagation(); show(pop.hidden); }));
        pop.addEventListener('click', e => { if (e.target.closest('a')) show(false); });
        D.addEventListener('click', e => { if (chip && !pop.hidden && !chip.contains(e.target)) show(false); });
        D.addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden) { show(false); btns[0].focus(); } });
    }
    if (!chip.isConnected) host.prepend(chip);
}
// TIMELINE: the profile card's Actual/Active row becomes the time card (ring, countdown, four values).
function mountTime(on) {
    if (!on) { if (tcard) { tcard.remove(); tcard = null; D.querySelectorAll('.atc-hide').forEach(r => r.classList.remove('atc-hide')); } return; }
    if (tcard && tcard.isConnected) return;
    const row = [...D.querySelectorAll('app-personal-info-widget .time-check')].find(r => /Actual Time/.test(r.textContent)); if (!row) return;
    tcard = D.createElement('div'); tcard.setAttribute('role', 'group');
    tcard.innerHTML = ring(64) + '<div class="atc-tm"><span class="atc-k" data-k="head"></span><span class="atc-big" data-k="big"></span><span class="atc-sub" data-k="sub"></span></div>'
        + '<div class="atc-tg"><div><i>Actual</i><b data-k="act"></b></div><div><i>Active</i><b data-k="actv"></b></div><div><i>Focus</i><b data-k="foc"></b></div><div><i data-k="l4"></i><b data-k="v4"></b></div></div>';
    row.classList.add('atc-hide'); row.after(tcard);
}
// MATERIAL: the ring sits in the panel's time card, between the countdown and "Complete at"; renderFullContent may rebuild it.
function mountPanel(on) {
    if (!on) { if (mring) { mring.remove(); mring = null; } return; }
    if (mring && mring.isConnected) return;
    const at = D.querySelector('#total-time-summary .ws-time-top .ws-at'); if (!at) return;
    at.insertAdjacentHTML('beforebegin', ring(112)); mring = at.previousElementSibling;
}

// One pass over every mounted ring and label; writes only what changed.
// PRAYER (Timeline): mark the next prayer. The host lists F Z A M I J as 12-hour times without AM/PM; only Fajr is
// in the morning, Jumma replaces Zuhr on Friday, and after Isha the next one is tomorrow's Fajr.
// CARDS (Timeline): each .box-widget is tagged by its content, atc-c-<title slug> (atc-c-profile for the personal
// card), so the skin keys on what a card is, not on where EGP's grid puts it.
function tagCards() {
    D.querySelectorAll('.box-widget').forEach(c => {
        if (c.parentElement && c.parentElement.closest('.box-widget')) return;
        const t = c.querySelector('.box-widget-title'), own = t ? [...t.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ').trim() : '';
        // Untitled cards (Awards, Promotion, Market place, Performance) are named by their first tab, button or span.
        const k = c.querySelector('app-personal-info-widget') ? 'profile' : c.querySelector('app-gm-widget') ? 'leaders'
            : (own || txt(c.querySelector('.box-widget-title-new')) || txt(c.querySelector('button.nav-link')) || txt(c.querySelector('span.selected') && c.querySelector('span.selected').parentElement.firstElementChild) || txt(t)).split(/\s[-–]\s|\d/)[0].trim().toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-+|-+$/g, '');
        if (k && c.dataset.atcC !== k) { if (c.dataset.atcC) c.classList.remove('atc-c-' + c.dataset.atcC); c.dataset.atcC = k; c.classList.add('atc-c-' + k); }
    });
}
// RENDER-OVER views, by card slug: read(card) → data (null leaves the host card as it is) and html(data). Elements
// the view must act through go in data.fwd; [data-fwd=i] in the view clicks fwd[i].
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// A view's text is only what the host shows: popover bodies hold the unmasked numbers behind the masked ones.
const SKIP = 'popover-content,.popover,script,style,[hidden]';
const txt = e => { if (!e) return ''; let t = ''; const w = D.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) if (!(n.parentElement && n.parentElement.closest(SKIP) && e.contains(n.parentElement.closest(SKIP)))) t += n.textContent;
    return t.replace(/\s+/g, ' ').trim(); };
const ico = (n, cls = '') => `<span class="atc-v-ico ${cls}">${icon(n)}</span>`;
const src = img => img ? img.getAttribute('src') || '' : '';
const btn = (i, label, body, c = '') => `<span class="${c}" role="button" tabindex="0" aria-label="${label}" data-fwd="${i}">${body}</span>`;
// The host's ‹ › carousel controls (Angular *ngIf's them), forwarded as a small pager.
const carCtl = root => ['prev', 'next'].map(k => root.querySelector('.carousel-control-' + k));
const pager = (pg, at, lb = ['Previous', 'Next']) => pg.some(Boolean) ? `<span class="atc-v-pg">${pg.map((on, i) => on ? btn(at + i, lb[i], icon('next'), i ? '' : 'is-prev') : '').join('')}</span>` : '';
// A connected button group (Timeline v2's cg): tabs forward to the host's buttons, the active one filled.
const tabsOf = (bs, short = t => t) => bs.map(b => [short(txt(b)), b.classList.contains('active')]);
const seg = (tabs, at, c = '') => `<div class="atc-v-seg ${c}" role="group">${tabs.map(([t, on], i) => `<span role="button" tabindex="0" class="${on ? 'is-on' : ''}" data-fwd="${at + i}">${esc(t)}</span>`).join('')}</div>`;
// Tile tones in turn, as Timeline v2 cycles them.
const TONE = [['var(--x-tile-2)', 'var(--x-on-tile-2)'], ['var(--x-tile-3)', 'var(--x-on-tile-3)'], [MSC('surface-container-highest'), MSC('on-surface-variant')]];
const tone = j => `background:${TONE[j % 3][0]};color:${TONE[j % 3][1]}`;
const MK = k => /car/i.test(k) ? 'car' : /bike/i.test(k) ? 'bike' : /laptop/i.test(k) ? 'laptop' : /mobile/i.test(k) ? 'phone' : 'misc';
const VIEWS = {
    'stock-price': { read: c => { const p = c.querySelector('.fs-15 .timline-font-color'); if (!p) return null; const a = [...c.querySelectorAll('ul li a')];
            return { sym: txt(p.parentElement).split(':')[0] || 'CCLD', price: txt(p), range: txt(c.querySelector('small .selected')), news: a.map(txt), fwd: a }; },
        html: d => `<div class="atc-v-head"><h3 class="atc-v-t">Stock price</h3>${d.range ? `<span class="atc-v-chip"><i>52w</i>${esc(d.range.replace('-', '–'))}</span>` : ''}</div>`
            + `<div class="atc-v-stock">${esc(d.sym)}<span class="atc-v-big">$${esc(d.price)}</span></div><div class="atc-v-news">${d.news.map((t, i) => `<a data-fwd="${i}">${esc(t)}</a>`).join('')}</div>` },
    careers: { read: c => { const n = [...c.querySelectorAll('.fs-2')]; if (!n.length) return null; const more = c.querySelector('.box-widget-title a');
            return { n: n.map(e => [txt(e), txt(e.parentElement.querySelector('small'))]), fwd: [more, ...n] }; },
        html: d => `<div class="atc-v-head"><h3 class="atc-v-t">Careers</h3><a class="atc-v-link" data-fwd="0">More</a></div>`
            + d.n.map(([v, k], i) => `<div class="atc-v-count" data-fwd="${i + 1}"><span class="atc-v-big">${esc(v)}</span><span class="atc-v-strong">${esc(k.toLowerCase())}<br>openings</span></div>`).join('') },
    documents: { read: c => { const n = c.querySelector('.fs-2'), sm = [...c.querySelectorAll('small')]; if (!n) return null;
            return { n: txt(n), k: txt(sm[0]) || 'Missing/Expired', add: txt(sm[1]) || 'Add New Document', fwd: [n, sm[1]] }; },
        html: d => `<div class="atc-v-head"><h3 class="atc-v-t">Documents</h3></div><div class="atc-v-doc" data-fwd="0"><span class="atc-v-ico ${+d.n ? 'is-bad' : ''}">${esc(d.n)}</span>`
            + `<span class="atc-v-strong">${esc(d.k.replace('/', ' /\u00a0').toLowerCase())}</span></div><a class="atc-v-link" data-fwd="1">+ ${esc(d.add.replace(/ new /i, ' '))}</a>` },
    approval: { read: c => /no records/i.test(c.textContent) ? {} : null,
        html: () => `<div class="atc-v-empty">${ico('task')}<div class="atc-v-stack"><h3 class="atc-v-t">Approval</h3><span class="atc-v-strong">All caught up</span><span class="atc-v-mute">No records waiting for your approval</span></div></div>` },
    birthday: { read: c => /no birthdays/i.test(c.textContent) ? { day: txt(c.querySelector('.box-widget-title small')) } : null,
        html: d => `<div class="atc-v-empty" style="flex-direction:column;justify-content:center;text-align:center;gap:6px">${ico('cake')}<h3 class="atc-v-t" style="font-size:13px">Birthdays${d.day ? ' · ' + esc(d.day) : ''}</h3><span class="atc-v-mute">None today</span></div>` },
    leaders: { read: c => { const f = [...c.querySelectorAll('app-gm-widget figure')]; if (f.length < 2) return null; const p = e => [e.querySelector('img') ? e.querySelector('img').getAttribute('src') : '', txt(e.querySelector('figcaption strong')), txt(e.querySelector('figcaption small')), !!e.querySelector('.fig-pod.active')];
            return { lead: f.slice(0, -1).map(p), sup: p(f[f.length - 1]), title: txt(c.querySelector('app-gm-widget .border-start > strong')) || 'Supervisor' }; },
        html: d => { const av = (s, on) => `<span class="atc-v-av${on ? ' is-on' : ''}"${on ? ' title="Online"' : ''}><img src="${esc(s)}" alt=""></span>`;
            return `<div class="atc-v-lead"><div class="atc-v-leads">${d.lead.map(([s, n, r, on]) => `<div class="atc-v-person">${av(s, on)}<div style="min-width:0"><b>${esc(n)}</b><span>${esc(r)}</span></div></div>`).join('')}</div>`
            + `<div class="atc-v-sup"><small>${esc(d.title)}</small>${av(d.sup[0], d.sup[3])}<b>${esc(d.sup[1])}</b><span>${esc(d.sup[2])}</span></div></div>`; } },
    // Days run newest first: ‹ is newer, › older. The host's › stays on the last day and throws there, so it's dropped;
    // the peek tiles are the next two days, the second one two clicks away.
    spotlight: { read: c => { const its = [...c.querySelectorAll('.carousel-item')], a = its.findIndex(x => x.classList.contains('active')), it = its[a], f = it && it.querySelector('.gp-user-horizontal-fig'); if (!f) return null;
            const sm = f.querySelectorAll('figcaption small'), ci = it.querySelector('.comments-icon'), im = ci ? ci.querySelectorAll('img') : [], ctl = carCtl(c), nx = ctl[1] && a < its.length - 1 ? ctl[1] : null;
            const peek = nx ? its.slice(a + 1, a + 3).map(x => src(x.querySelector('.gp-user-horizontal-fig img'))) : [];
            return { img: src(f.querySelector('img')), n: txt(f.querySelector('strong')), r: txt(sm[0]), by: txt(sm[1]).replace(/^Recommended By:\s*/i, '').replace(/^(\S)\S*\s+(?=\S)/, '$1. '),
                likes: txt(ci && ci.querySelector('small')), pg: [!!ctl[0], !!nx], peek,
                fwd: [[...it.querySelectorAll('.box-widget-title a')].pop(), im[0], im[1], ctl[0], nx, nx && { click: () => { nx.click(); nx.click(); } }] }; },
        html: d => `<div class="atc-v-head"><h3 class="atc-v-t">Spotlight</h3>${pager(d.pg, 3, ['Newer', 'Older'])}<a class="atc-v-link" data-fwd="0">Recommend</a></div><div class="atc-v-spot" role="list">`
            + `<div class="atc-v-sp" role="listitem"><img src="${esc(d.img)}" alt=""><div class="atc-v-stack"><b>${esc(d.n)}</b><span>${esc(d.r)}</span><span>${btn(1, 'Like', '👍 ' + esc(d.likes), 'atc-v-like')}${d.by ? ' · by ' + esc(d.by) : ''}</span></div>${btn(2, 'Send wishes', icon('chat'), 'atc-v-act')}</div>`
            + [0, 1].map(i => d.peek[i] != null ? btn(4 + i, 'Older', `<img src="${esc(d.peek[i])}" alt="">`, 'atc-v-sp' + (i + 2)) : `<span class="atc-v-sp${i + 2}"></span>`).join('') + '</div>' },
    'egp-knowledge': { read: c => { const it = c.querySelector('.carousel-item.active'); if (!it) return null; const m = /(\d+)\s*\/\s*(\d+)/.exec(txt(it.querySelector('figcaption .fw-bold'))), ctl = carCtl(c);
            return { t: txt(it.querySelector('.know-knowledge')), i: m ? m[1] : '', n: m ? m[2] : '', pg: ctl.map(Boolean), fwd: [it.querySelector('.play-button-overlay'), ...ctl] }; },
        html: d => `<div class="atc-v-head"><h3 class="atc-v-t">eGP Knowledge</h3>${pager(d.pg, 1)}</div>`
            + `<div class="atc-v-row" role="button" tabindex="0" data-fwd="0">${ico('book')}<div class="atc-v-stack"><b>${esc(d.t)}</b>${d.n ? `<span class="atc-v-mute">${esc(d.i)} of ${esc(d.n)}</span>` : ''}</div></div>` },
    promotion: { read: c => { const bs = [...c.querySelectorAll('.footer-title button.nav-link')], pane = c.querySelector('.tab-pane.active'); if (!bs.length || !pane) return null;
            const it = pane.querySelector('.carousel-item.active') || pane, fs = [...it.querySelectorAll('.gp-user-horizontal-fig')], ctl = carCtl(pane);
            return { tabs: tabsOf(bs, t => t.replace(/^Work /, '').replace(/ Aboard$/, '')), pg: ctl.map(Boolean),
                p: fs.map(f => [src(f.querySelector('.fig-pod img')), txt(f.querySelector('strong')), txt(f.querySelector('figcaption > small')), txt(f.querySelector('figcaption .d-flex > small'))]),
                fwd: [...bs, ...ctl, ...fs.map(f => f.querySelector('.comments-icon img') || f.querySelector('.fig-pod img'))] }; },
        html: d => { const n = d.tabs.length; return `<div class="atc-v-head">${seg(d.tabs, 0, 'is-fill is-lg')}${pager(d.pg, n)}</div><div class="atc-v-promo">`
            + (d.p.length ? d.p.map(([s, nm, r, dt], i) => `<div class="atc-v-pr"><img src="${esc(s)}" alt=""><div style="min-width:0"><b>${esc(nm)}</b><span>${esc(r)}</span><i>${esc(dt)}</i></div>${btn(n + 2 + i, 'Send wishes', icon('chat'), 'atc-v-act')}</div>`).join('')
                : '<span class="atc-v-mute">No one this month</span>') + '</div>'; } },
    'special-offers': { read: c => { const it = c.querySelector('.carousel-item.active') || c, fs = [...it.querySelectorAll('figure')]; if (!fs.length) return null;
            const bell = c.querySelector('.box-widget-title .fa-bell-o'), h = fs.map(f => f.querySelector('.fa-history'));
            return { o: fs.map((f, i) => [...f.querySelectorAll('figcaption small')].map(txt).concat(!!h[i])), fwd: [bell && bell.parentElement, ...fs.map(f => f.querySelector('.Special-widget-Icon img') || f.querySelector('.Special-widget-Icon')), ...h] }; },
        html: d => { const n = d.o.length; return `<div class="atc-v-head"><h3 class="atc-v-t">Special offers</h3>${btn(0, 'Notifications', icon('bell'), 'atc-v-act')}</div><div class="atc-v-offers" role="list">`
            + d.o.map(([a, b, hist], i) => `<div role="listitem" class="atc-v-offer" data-fwd="${1 + i}" title="${esc(a + ' ' + b)}"><i></i><small>${esc(a)}</small><b>${esc(b)}</b>${hist ? btn(1 + n + i, 'History', icon('history'), 'atc-v-act') : ''}</div>`).join('') + '</div>'; } },
    'market-place': { read: c => { const fs = [...c.querySelectorAll('figure.gp-user-vertical-fig')], bs = [...c.querySelectorAll('button.nav-link')]; if (!fs.length) return null;
            return { tabs: tabsOf(bs), m: fs.map(f => [...f.querySelectorAll('figcaption small')].map(txt)), fwd: [...bs, ...fs.map(f => f.querySelector('.fig-pod img'))] }; },
        html: d => `<div class="atc-v-head">${seg(d.tabs, 0, 'is-lg')}</div><div class="atc-v-market">`
            + d.m.map(([k, v], i) => `<div role="button" tabindex="0" data-fwd="${d.tabs.length + i}"><span class="atc-v-ico" style="${tone(i)};clip-path:var(--x-sh-i${i % 6 + 1})">${icon(MK(k))}</span><span>${esc(k)} <b>${esc(v)}</b></span></div>`).join('') + '</div>' },
    events: { read: c => { const bs = [...c.querySelectorAll('button.nav-link')], pane = c.querySelector('.tab-pane.active'); if (!pane) return null;
            const it = pane.querySelector('.carousel-item.active') || pane, vs = [...it.querySelectorAll('.video-container')].slice(0, 3), ctl = carCtl(pane);
            return { tabs: tabsOf(bs), pg: ctl.map(Boolean), v: vs.map(v => [txt(v.querySelector('.likes .fs-10')), txt(v.querySelector('.ratings .fs-10')), (v.querySelector('img') || {}).title || '']),
                fwd: [...bs, ...ctl, ...vs.map(v => v.querySelector('.play-button-overlay'))] }; },
        html: d => { const n = d.tabs.length; return `<div class="atc-v-head"><h3 class="atc-v-t">Events</h3>${seg(d.tabs, 0)}</div><div class="atc-v-events" role="list">`
            + (d.pg[0] ? `<div class="atc-v-ev is-more is-prev" role="button" tabindex="0" aria-label="Previous" data-fwd="${n}" style="${tone(2)}">${icon('next')}</div>` : '')
            + d.v.map(([l, r, t], i) => `<div role="listitem" class="atc-v-ev e${i}" data-fwd="${n + 2 + i}" title="${esc(t)}" style="${tone(i)}">${icon('play')}<span>${esc(l)}${r ? ' · ★' + esc(r) : ''}</span></div>`).join('')
            + (d.pg[1] ? `<div class="atc-v-ev is-more" role="button" tabindex="0" aria-label="Next" data-fwd="${n + 1}" style="${tone(2)}">${icon('next')}</div>` : '') + '</div>'; } }
};
function renderOver() {
    D.querySelectorAll('.box-widget[data-atc-c]').forEach(c => {
        const v = VIEWS[c.dataset.atcC]; if (!v) return;
        let d = null; try { d = v.read(c); } catch (_) {}
        let o = c.querySelector(':scope > .atc-view');
        if (!d) { if (o) { o.remove(); c.classList.remove('atc-over'); } return; }
        const { fwd, ...data } = d, k = JSON.stringify(data);
        if (!o) { o = D.createElement('div'); o.className = 'atc-view'; c.appendChild(o);
            o.addEventListener('click', e => { const t = e.target.closest('[data-fwd]'), f = t && c._atcFwd && c._atcFwd[+t.dataset.fwd]; if (f) { e.preventDefault(); f.click(); } });
            o.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-fwd]')) { e.preventDefault(); e.target.click(); } }); }
        c._atcFwd = fwd || [];
        if (o.dataset.k !== k) { o.dataset.k = k; o.innerHTML = v.html(data); }
        if (!c.classList.contains('atc-over')) c.classList.add('atc-over');
    });
}
// PROFILE DETAILS: the host's label/value table becomes the design's 4-column grid (label over value), with the
// check-in row folded in. The host rows stay, hidden; links forward.
function mountProfileGrid() {
    const w = D.querySelector('app-personal-info-widget'), t = w && w.querySelector('table.emp-data-info'); if (!t) return;
    const cells = [], fwd = [];
    t.querySelectorAll('tr').forEach(tr => { const td = [...tr.cells];
        for (let i = 0; i < td.length; i++) { const l = txt(td[i]), a = td[i].querySelector('a');
            if (/:$/.test(l) && td[i + 1]) { const v = txt(td[i + 1]); if (v) cells.push([l.slice(0, -1).replace('Insurance', 'Ins.'), v, td[i + 1].querySelector('a')]); i++; }
            else if (a && l) cells.push([l.split(' ')[0], l.split(' ').slice(1).join(' ') + ' ↗', a]); } });
    const tc = w.querySelector('.time-check'); if (tc && !/Actual Time/.test(tc.textContent)) tc.querySelectorAll('small').forEach(e => { const m = /^([^:]+):\s*(.+)$/.exec(txt(e)); if (m) cells.push([m[1], m[2], null]); });
    if (!cells.length) return;
    const k = JSON.stringify(cells.map(c => c.slice(0, 2)));
    let g = w.querySelector('.atc-pgrid'), host = t.closest('.row');
    if (!g) { g = D.createElement('div'); g.className = 'atc-pgrid'; host.after(g);
        g.addEventListener('click', e => { const b = e.target.closest('[data-fwd]'), f = b && g._fwd[+b.dataset.fwd]; if (f) { e.preventDefault(); f.click(); } }); }
    g._fwd = cells.map(c => c[2]);
    if (g.dataset.k !== k) { g.dataset.k = k; g.innerHTML = cells.map(([l, v, a], i) => `<div><span>${esc(l)}</span><b${a ? ` data-fwd="${i}"` : ''}>${esc(v)}</b></div>`).join(''); }
    if (!host.classList.contains('atc-hide')) host.classList.add('atc-hide');
    if (tc && !/Actual Time/.test(tc.textContent) && !tc.classList.contains('atc-hide')) tc.classList.add('atc-hide');
}
// PROFILE: Employee Status as a chip under the name (the host keeps it in its details table).
function mountProfileChip() {
    const fc = D.querySelector('app-personal-info-widget figcaption'), z = D.querySelector('app-personal-info-widget [class*="zone-"]'); if (!fc || !z) return;
    let c = fc.querySelector('.atc-pchip');
    if (!c) { c = D.createElement('span'); c.innerHTML = icon('verified') + '<span></span>'; const h = fc.querySelector('h5'); if (h) h.after(c); else fc.prepend(c); }
    const z2 = /zone-red/.test(z.className) ? ' is-danger' : /zone-(yellow|orange|amber)/.test(z.className) ? ' is-tense' : '';
    cls(c, 'atc-pchip' + z2); put(c.lastChild, z.textContent.trim());
    const j = fc.querySelector(':scope > small.mt-1'), m = j && /(\d{2})\/\d{2}\/\d{2}(\d{2})/.exec(j.textContent);
    if (m) { let sc = fc.querySelector('.atc-since'); if (!sc) { sc = D.createElement('span'); sc.className = 'atc-since'; j.before(sc); } put(sc, 'Since ' + m[1] + '/' + m[2]); if (!j.classList.contains('atc-hide')) j.classList.add('atc-hide'); }
    const row = z.closest('tr') || z.closest('p'); if (row && !row.classList.contains('atc-hide')) row.classList.add('atc-hide');
}
// DECOR (Timeline): small additions to cards restyled in place (their hover popovers stay): the co-worker count,
// the empty-team tile, Health's icon tiles.
const HICO = [['height', 'ruler'], ['weight', 'weight'], ['pressure', 'heart'], ['bmi', 'gauge']];
function mountDecor() {
    const cw = D.querySelector('.atc-c-co-workers');
    if (cw) {
        const t = cw.querySelector('.box-widget-title');
        if (t) { let s = t.querySelector('.atc-n'); if (!s) { s = D.createElement('span'); s.className = 'atc-n'; t.appendChild(s); } put(s, String(cw.querySelectorAll('li.team-member').length)); }
        const p = [...cw.querySelectorAll('p')].find(e => /no team assigned/i.test(e.textContent)), dc = cw.querySelector('.atc-deco');
        if (p && !dc) p.insertAdjacentHTML('beforebegin', `<div class="atc-deco atc-v-empty is-col">${ico('group')}<b>No team assigned yet</b></div>`);
        else if (!p && dc) dc.remove();
        if (p && !p.classList.contains('atc-hide')) p.classList.add('atc-hide');
    }
    D.querySelectorAll('app-health-widget li').forEach((li, j) => { if (li.querySelector('.atc-hico')) return;
        const k = txt(li.querySelector('span.d-block')).toLowerCase(), h = HICO.find(([w]) => k.includes(w));
        li.insertAdjacentHTML('afterbegin', `<span class="atc-hico" style="${tone(j)};clip-path:var(--x-sh-i${(j + 1) % 6 + 1})">${icon(h ? h[1] : 'heart')}</span>`); });
}
// ATTENDANCE (Attendance v2): the bento over the host's four groups, the legend as filter chips with counts, row tags
// for the table's markers and chips, and panel | table columns while the panel is the 640px summary (game mode off).
// The host nodes stay; the shell adds data-atc-* tags and its own elements.
const BI = { login: ['i1', 1], logout: ['i2', 2], timer: ['i3', 3], rise: ['i4', 2], moon: ['i6', 2], hour: ['i5', 3], beach: ['i2', 3], busy: ['i1', 2], sched: ['i3', 2], home: ['i4', 3], office: ['i1', 1] };
const BT = [null, ['var(--x-fill)', 'var(--x-on-fill)'], TONE[0], TONE[1]];
const bIcon = (k, g) => /check-in/.test(k) ? (/avg/.test(k) ? 'rise' : 'login') : /check-out/.test(k) ? (/avg/.test(k) ? 'moon' : 'logout') : /total/.test(k) ? 'timer'
    : /working/.test(k) ? (/month/.test(g) ? 'sched' : 'hour') : /leave/.test(k) ? 'beach' : /absent/.test(k) ? 'busy' : /home/.test(k) ? 'home' : /office/.test(k) ? 'office' : 'sched';
const sentence = t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
const MON = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
const md = s => { const m = /^(\d{1,2})\/(\d{1,2})\/\d{4}$/.exec(s); return m ? MON[+m[1] - 1] + ' ' + +m[2] : s; };
// Legend chips: filter key (a row's data-atc-t token), label, marker colour and shape.
const LG = [['', 'All', MSC('on-surface-variant'), 'circle(50%)'], ['wfh', 'Work from home', MSC('tertiary'), 'var(--x-sh-i3)'], ['ok', 'Approved extra hours', 'var(--x-ok)', 'var(--x-sh-i2)'], ['bad', 'Short / missing', MSC('error'), 'var(--x-sh-i5)']];
function tagRow(tr) {
    const td = [...tr.cells], v = i => td[i] ? txt(td[i]) : '', t = [], lv = tr.classList.contains('bg-danger') ? 'absent' : tr.classList.contains('bg-success') ? 'leave' : '';
    let k = 'normal';
    if (!lv && td.length < 3) k = 'none';
    else if (!lv && td[0].colSpan >= 4) k = 'total';
    else {
        const m = lv && (td.find(c => c.colSpan >= 5) || td[td.length - 1]);
        if (m) { // leave / absent: a chip before the host's "Type - Status [ Reason ]"; a reason repeating the type is dropped
            k = lv; if (k === 'absent') t.push('bad');
            const b = m.querySelector('b'), sp = b ? b.querySelectorAll('span') : [], type = b && b.firstChild && b.firstChild.nodeType === 3 ? b.firstChild.textContent.trim() : '';
            if (sp.length > 1 && txt(sp[sp.length - 1]).replace(/[[\]]/g, '').trim().toLowerCase() === type.toLowerCase()) m.dataset.atcSame = '1';
            if (!m.querySelector('.atc-lchip')) m.insertAdjacentHTML('afterbegin', `<span class="atc-lchip is-${k}${k === 'leave' && m.classList.contains('text-danger') ? ' is-pending' : ''}">${icon(k === 'leave' ? 'beach' : 'busy')}${k === 'leave' ? 'Leave' : 'Absent'}</span>`);
        } else { // missing check-in/out comes from the server as text-danger on the first cells
            const bad = td.slice(0, 5).some(c => c.classList.contains('text-danger'));
            if (td[0].classList.contains('set-purple')) t.push('wfh');
            if (bad) t.push('bad');
            if (/[1-9]/.test(v(7))) { t.push('ok'); td[7].dataset.atcChip = 'ok'; }
            if (bad && v(5)) td[5].dataset.atcChip = 'bad';
            if (td[4]) td[4].dataset.atcIo = /out/i.test(v(4)) ? 'out' : 'in';
            k = bad ? 'bad' : t.includes('wfh') ? 'wfh' : 'normal';
        }
    }
    tr.dataset.atcT = t.join(' '); tr.dataset.atcK = k;
}
const bentoHTML = gs => gs.map((g, gi) => `<section class="atc-bg${gi ? '' : ' is-hero'}" aria-label="${esc(g.title)}"><div class="atc-v-head"><h3 class="atc-v-t">${esc(g.title)}</h3><span class="atc-bg-n">${esc(g.note)}</span></div>`
    + `<div class="atc-bg-tiles" style="grid-template-columns:repeat(${g.tiles.length},minmax(min-content,1fr))">` + g.tiles.map(t => { const [sh, tn] = BI[t.i];
        return `<div class="atc-bt"><div class="atc-bt-h"><span class="atc-v-ico" style="clip-path:var(--x-sh-${sh});background:${BT[tn][0]};color:${BT[tn][1]}">${icon(t.i)}</span><span class="atc-bt-d ${t.dc}">${esc(t.d)}</span></div>`
            + `<span class="atc-bt-v">${esc(t.v)}<small>${esc(t.u)}</small></span><span class="atc-bt-k">${esc(t.k)}</span></div>`; }).join('') + '</div>'
    + (g.wave ? `<div class="atc-bg-wave"><div class="atc-wv is-thick is-live" role="progressbar" aria-label="Office share of hours" aria-valuenow="${g.wave[0]}" style="--wp:${g.wave[0] / 100}"><div class="atc-wv-a"></div><div class="atc-wv-t"></div><div class="atc-wv-s"></div></div>`
        + `<div class="atc-bg-wl"><span>Office ${g.wave[0]}%</span><span>Home ${g.wave[1]}%</span></div></div>` : '') + '</section>').join('');
function mountAtt() {
    const wrap = D.querySelector('#attendence-record-tab .attendance-details-wrapper'), inner = wrap && wrap.querySelector('.attendence-inner'); if (!inner) return;
    const cols = [...inner.querySelectorAll(':scope > .row > [class*=col-]')].filter(c => c.querySelector('.attendence-outer'));
    if (cols.length) {
        const row = cols[0].parentElement, shiftH = ATC.shift() / 3600;
        const groups = cols.map(c => {
            const h = txt(c.querySelector('h6')), m = /^(.*?)\s*\((.*)\)\s*$/.exec(h), title = m ? m[1] : h, g = title.toLowerCase();
            const note = m ? m[2] : /30 days/.test(g) ? 'average' : /month/.test(g) ? MON[new Date().getMonth()] : /percent/.test(g) ? 'MTD' : '';
            const tiles = [...c.querySelectorAll('.attendence-box')].map(b => {
                const k = txt(b.querySelector('small')), kl = k.toLowerCase(), s = txt(b.querySelector('strong')), p = /^([\d.:]+)\s*(AM|PM|%)?$/i.exec(s), i = bIcon(kl, g);
                const v = p ? p[1] : s, u = p && p[2] ? p[2].toUpperCase() : p && /hour|hrs|working/.test(kl) ? 'h' : '';
                let d = '', dc = '';
                if (i === 'timer' || i === 'sched') { const x = parseFloat(v) - shiftH; if (shiftH && isFinite(x) && Math.abs(x) >= .05) { d = (x > 0 ? '+' : '−') + Math.round(Math.abs(x) * 10) / 10 + 'h'; dc = x > 0 ? 'is-ok' : 'is-tense'; } }
                if (i === 'busy' && v === '0') { d = '✓'; dc = 'is-ok'; }
                return { k: sentence(k).replace(/ hrs$/, ''), v, u, i, d, dc };
            });
            const pct = i => { const t = tiles.find(x => x.i === i); return t ? Math.round(parseFloat(t.v)) || 0 : 0; };
            return { title: sentence(title), note, tiles, wave: /percent/.test(g) ? [pct('office'), pct('home')] : null };
        });
        let b = wrap.querySelector('.atc-bento'); if (!b) { b = D.createElement('div'); b.className = 'atc-bento'; }
        if (b.nextElementSibling !== row) row.before(b);
        const k = JSON.stringify(groups); if (b.dataset.k !== k) { b.dataset.k = k; b.innerHTML = bentoHTML(groups); }
        cols.forEach(c => c.classList.contains('atc-hide') || c.classList.add('atc-hide'));
    }
    D.querySelectorAll('.side-nav-tab li > a').forEach(a => { const k = /leave/i.test(a.textContent) ? 'busy' : /attend/i.test(a.textContent) ? 'event' : ''; if (k && a.dataset.atcIco !== k) a.dataset.atcIco = k; });
    const si = inner.querySelector('.custom-search-input'), ph = 'Search date, day or status'; if (si && si.placeholder !== ph) { if (!('atcPh' in si.dataset)) si.dataset.atcPh = si.placeholder; si.placeholder = ph; }
    const tbl = wrap.querySelector('.main-attendance-table'), tb = tbl && tbl.querySelector('tbody');
    if (tb) for (const tr of tb.rows) if (!tr.dataset.atcK) tagRow(tr);
    const lh = inner.querySelector('.attendence-legends');
    if (lh && tb) {
        lh.querySelectorAll('ul > li').forEach(li => { if (li.querySelector('button')) { if (!li.dataset.atcXl) li.dataset.atcXl = '1'; } else if (!li.classList.contains('atc-hide')) li.classList.add('atc-hide'); });
        const rows = [...tb.rows].filter(r => r.dataset.atcK && !/^(total|none)$/.test(r.dataset.atcK)), f = tbl.dataset.atcF || '';
        const n = LG.map(([key]) => key ? rows.filter(r => (' ' + r.dataset.atcT + ' ').includes(' ' + key + ' ')).length : rows.length);
        const ds = rows.map(r => r.cells[1] ? txt(r.cells[1]) : '').filter(s => /\d\/\d/.test(s));
        const meta = rows.length + ' records' + (ds.length ? ' · ' + md(ds[0]) + ' – ' + md(ds[ds.length - 1]) : '');
        let lg = lh.querySelector('.atc-legend');
        if (!lg) { lg = D.createElement('div'); lg.className = 'atc-legend'; lg.setAttribute('role', 'group'); lg.setAttribute('aria-label', 'Filter rows'); lh.prepend(lg);
            const pick = e => { const c = e.target.closest('[data-f]'), t = c && D.querySelector('#attendence-record-tab .main-attendance-table'); if (t) { e.preventDefault(); t.dataset.atcF = c.dataset.f; mountAtt(); } };
            lg.addEventListener('click', pick); lg.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') pick(e); }); }
        const k = JSON.stringify([f, n, meta]);
        if (lg.dataset.k !== k) { lg.dataset.k = k; lg.innerHTML = LG.map(([key, t, c, sh], i) => `<span role="button" tabindex="0" aria-pressed="${f === key}" class="atc-lg${f === key ? ' is-on' : ''}" data-f="${key}"><i style="background:${c};clip-path:${sh}"></i>${t}<b>${n[i]}</b></span>`).join('')
            + `<span class="atc-lg-meta">${esc(meta)}</span>`; }
    }
    const pn = D.getElementById('total-time-summary'), two = !!(pn && pn.classList.contains('game-mode-off') && wrap.contains(pn));
    if (wrap.classList.contains('atc-2col') !== two) wrap.classList.toggle('atc-2col', two);
}
function markPrayer() {
    const cols = D.querySelectorAll('.prayer-col'); if (!cols.length) return;
    const d = new Date(), now = d.getHours() * 60 + d.getMinutes(), fri = d.getDay() === 5;
    let next = null, at = Infinity, fajr = null;
    cols.forEach(c => { const k = (c.children[0]?.textContent || '').trim().charAt(0).toUpperCase(), m = /(\d{1,2}):(\d{2})/.exec(c.children[1]?.textContent || '');
        if (!m || (k === 'J' && !fri) || (k === 'Z' && fri)) return;
        const t = (+m[1] % 12 + (k === 'F' ? 0 : 12)) * 60 + +m[2]; if (k === 'F') fajr = c;
        if (t >= now && t < at) { at = t; next = c; } });
    next = next || fajr;
    cols.forEach(c => { if (c.classList.contains('atc-now') !== (c === next)) c.classList.toggle('atc-now', c === next); });
}
const MOOD = { live: '😊', over: '🤩', out: '😌', none: '😴', wait: '😶', error: '😶' };
function paint() {
    const tm = times(), rs = D.querySelectorAll('.atc-r'); if (!rs.length) return;
    const { st, act, actv, left, shift } = tm, pO = act == null ? 0 : Math.min(1, act / shift), pI = act ? Math.min(1, (actv || 0) / act) : 0;
    const foc = act && actv != null ? Math.round(pI * 100) + '%' : '—', wavy = st === 'live' || st === 'over', now = Date.now();
    const outAt = snap && snap.out || (st === 'out' ? '—' : '');
    rs.forEach(r => { const s = +r.dataset.rs, k = st + pO.toFixed(3) + pI.toFixed(3);
        if (r.dataset.rk !== k) { r.dataset.rk = k; r.innerHTML = ringHTML(s, st, pO, pI); r.setAttribute('aria-valuenow', Math.round(pO * 100));
            r.setAttribute('aria-label', st === 'error' ? 'Time data unavailable' : /none|wait/.test(st) ? 'Not checked in' : `${Math.round(pO * 100)}% of shift, ${foc} focus`); }
        cls(r, 'atc-r st-' + st + (wavy && RS(s).amp ? ' is-wavy' : '')); });
    const hb = { live: ['Time until freedom', hms(left)], over: ['Overtime', '+' + hms(-left)], out: ['Checked out' + (outAt ? ' · ' + outAt : ''), hms(act)],
        none: ['Not checked in', hms(null)], wait: ['Today', hms(null)], error: ['Time unavailable', hms(null)] }[st];
    const txt = { chip: { live: hm(left) + ' left', over: '+' + hm(-left) + ' over', out: hm(act) + ' worked', none: 'Check in', wait: '—', error: 'Offline' }[st],
        head: hb[0], big: hb[1], act: hms(act), actv: hms(actv), foc,
        sub: { live: `${Math.round(pO * 100)}% of ${Math.round(shift / 360) / 10}h shift`, over: 'Shift complete · log extra hours', out: 'worked today', none: `${Math.round(shift / 360) / 10}h shift`, wait: '', error: 'Retrying' }[st],
        l4: { over: 'Ended', out: 'Out at' }[st] || 'Leave at', v4: st === 'out' ? outAt : left == null ? '—' : clock(now + left * 1000),
        endl: { live: 'Complete at', over: 'Shift ended', out: 'Out at', none: 'Shift', wait: '', error: 'Last update' }[st],
        end: st === 'live' || st === 'over' ? clock(now + left * 1000) : st === 'out' ? outAt : st === 'none' ? Math.round(shift / 360) / 10 + 'h' : st === 'error' && snap ? clock(snap.t) : '',
        mood: P().emojiSet === 'none' ? '' : MOOD[st] };
    if (chip && chip.isConnected) {
        cls(chip, 'atc-chip st-' + st + (chip.dataset.open ? ' is-open' : ''));
        put(chip.querySelector('[data-k=chip]'), txt.chip); chip.firstChild.setAttribute('aria-label', hb[0] + ' ' + hb[1]);
        if (!pop.hidden) {
            const x = lsJSON('userXP'); Object.assign(txt, { streak: (x.consecutiveDays || 0) + '-day streak', lv: String(x.level || 1), lvl: 'Level ' + (x.level || 1), xp: (x.totalXP || 0).toLocaleString() + ' XP' });
            cls(pop, 'atc-pop st-' + st); pop.querySelectorAll('[data-k]').forEach(el => put(el, txt[el.dataset.k]));
            const wv = pop.querySelector('.atc-wv'), w = pO.toFixed(4); cls(wv, 'atc-wv' + (wavy ? ' is-live' : ''));
            if (wv.style.getPropertyValue('--wp') !== w) { wv.style.setProperty('--wp', w); wv.setAttribute('aria-valuenow', Math.round(pO * 100)); }
        }
    }
    if (tcard && tcard.isConnected) { cls(tcard, 'atc-time st-' + st); tcard.setAttribute('aria-label', hb[0] + ' ' + hb[1]); tcard.querySelectorAll('[data-k]').forEach(el => put(el, txt[el.dataset.k])); }
}

// WEB THEME off, or Plus gone: the page skin's marks come off and EGP reads as before; the chip, the time card and
// the widget's own theme stay.
function unskin() {
    D.querySelectorAll('.atc-view,.atc-deco,.atc-n,.atc-hico,.atc-pgrid,.atc-pchip,.atc-since,.atc-bento,.atc-legend,.atc-lchip').forEach(e => e.remove());
    const keep = tcard && tcard.previousElementSibling;
    D.querySelectorAll('.atc-hide').forEach(e => { if (e !== keep) e.classList.remove('atc-hide'); });
    D.querySelectorAll('.atc-over,.atc-2col,.atc-now').forEach(e => e.classList.remove('atc-over', 'atc-2col', 'atc-now'));
    D.querySelectorAll('tr[data-atc-k]').forEach(tr => { delete tr.dataset.atcK; });
    D.querySelectorAll('[data-atc-ph]').forEach(e => { e.placeholder = e.dataset.atcPh; delete e.dataset.atcPh; });
}
let lastRoute = null, wasWeb = null;
ATC.tick = att => {
    const r = route(), p = P(), dark = tokens(), web = p.webTheme !== false && !!(ATC.plus && ATC.plus());
    if (r !== lastRoute) { lastRoute = r; if (!snap || Date.now() - snap.t > 60000) due = 0; }
    if (web !== wasWeb) { wasWeb = web; if (web) H.dataset.atcWeb = ''; else { delete H.dataset.atcWeb; unskin(); } }
    const sk = r && web ? (dark ? 'dark' : 'light') : '';
    if ((H.dataset.attSkin || '') !== sk) { if (sk) H.dataset.attSkin = sk; else delete H.dataset.attSkin; }
    if (Date.now() >= due) { due = Date.now() + AGE; pull(); }
    mountChip(r !== 'att');
    mountTime(r === 'tl' && !!(snap && snap.act != null));
    mountPanel(att && p.displayTheme === 'material');
    if (web && r === 'tl') { tagCards(); renderOver(); mountDecor(); mountProfileChip(); mountProfileGrid(); markPrayer(); }
    if (web && r === 'att') mountAtt();
    paint();
};
ATC.apply = () => {
    const p = P(), mat = p.displayTheme === 'material';
    H.dataset.atcTheme = p.displayTheme; H.classList.toggle('atc-mat', mat);
    style('atc-base-css', BASE_CSS); style('atc-loader-css', LOADER_CSS); style('atc-skin-css', SKIN_CSS); style('atc-mat-css', mat ? MAT_CSS : null);
    ATC.tick(ATC.onAtt());
};
