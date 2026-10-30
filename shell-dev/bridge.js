// The ATCShell.js bridge: exact find/replace steps that bind the shell into AttendanceTimeCheckerPlus.js. Each
// anchor must match exactly once, so a drifted widget fails loudly instead of half-applying. A widget that is
// already bound (its 'route gate' declares the ATC object) passes through unchanged.
//
//   node shell-dev/bridge.js            check every anchor still matches the widget (or that it is bound)
//   node shell-dev/bridge.js --write    apply to AttendanceTimeCheckerPlus.js (release only)
//
// host-run.js, serve.js and compare.js bridge in memory, so they work on the bound and the unbound widget alike.
// In-app navigation needs the 'loaded gate' and 'keep panel' steps: the report arrives after the table, and
// Angular drops the panel on leaving Attendance (host-run.js reproduces both).
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, '..', 'AttendanceTimeCheckerPlus.js');

const STEPS = [
    ['route gate', `    const currentUrl = window.location.href;
    const targetUrl = "https://globalportal.mtbc.com/#/time-absence/attendence-record";

    if (currentUrl !== targetUrl) {
        return;
    }`, `    // Portal-wide: the full widget runs on Attendance only; ATCShell.js (chip, skin, Material) on every route.
    if (location.host !== 'globalportal.mtbc.com') return;
    const onAtt = () => location.hash.split('?')[0] === '#/time-absence/attendence-record';
    const ATC = {};`],
    ['live flag', `    let lastTotalWorkedTime = -1; // Track if we need to re-render
`, `    let lastTotalWorkedTime = -1; // Track if we need to re-render
    let lastAttLive = false; // last session still open (ATCShell)
    let keptPanel = null; // the panel Angular dropped on in-app navigation, games and all
`],
    // In-app navigation lands before the report: until it arrives Angular shows "No Record Found." AND the totals
    // row. A first render then had no sessions, and the games guard blocked every later one (only "Day total").
    ['loaded gate', `        const tableDiv = document.querySelector('.main-attendance-table');
        if (!tableDiv) {
            return;
        }

        let totalTimeDiv = document.getElementById('total-time-summary');`, `        const tableDiv = document.querySelector('.main-attendance-table');
        if (!tableDiv || !attendanceLoaded(tableDiv)) {
            return;
        }

        // Back on Attendance after in-app navigation: the same element goes back, so the games keep their DOM.
        let totalTimeDiv = document.getElementById('total-time-summary') || keptPanel;`],
    ['keep panel', `            isFirstRender = true;
            isNewElement = true;
        }

        calculateTotalTime(totalTimeDiv);`, `            isFirstRender = true;
            isNewElement = true;
            keptPanel = totalTimeDiv;
        }

        calculateTotalTime(totalTimeDiv);`],
    // A kept panel still has its old parent: Angular detaches the whole page, not the panel.
    ['reattach', `        if (!totalTimeDiv.parentNode) {
            $('.main-attendance-table').before(totalTimeDiv);`, `        if (!totalTimeDiv.isConnected) {
            $('.main-attendance-table').before(totalTimeDiv);`],
    ['loaded test', `    function calculateTotalTime(totalTimeDiv) {`, `    // The report is in: a dated row, or "No Record Found." alone (an empty report, not one still loading).
    function attendanceLoaded(table) {
        const rows = [...table.querySelectorAll('tbody tr')];
        return rows.some(r => [...r.cells].some(c => /^\\d{1,2}\\/\\d{1,2}\\/\\d{4}$/.test(c.textContent.trim())))
            || (rows.length === 1 && /No Record/i.test(rows[0].textContent));
    }

    function calculateTotalTime(totalTimeDiv) {`],
    ['theme option', `['business', 'Just Business']], { id: 'theme-selector'`, `['business', 'Just Business'], ['material', 'Material You']], { id: 'theme-selector'`],
    ['apply hook', `    function applyPreferences() {
        const container = document.getElementById('total-time-summary');
        if (!container) return;
        container.classList.toggle('biz-theme', userPreferences.displayTheme === 'business');`, `    function applyPreferences() {
        ATC.apply?.();
        const container = document.getElementById('total-time-summary');
        if (!container) return;
        container.classList.toggle('biz-theme', userPreferences.displayTheme === 'business');
        container.classList.toggle('mat-theme', userPreferences.displayTheme === 'material');`],
    ['first-render class', `            if (userPreferences.displayTheme === 'business') totalTimeDiv.classList.add('biz-theme');`,
        `            if (userPreferences.displayTheme === 'business') totalTimeDiv.classList.add('biz-theme');
            if (userPreferences.displayTheme === 'material') totalTimeDiv.classList.add('mat-theme');`],
    ['live state', `            lastTotalWorkedTime = totalWorkedTime;
        }`, `            lastTotalWorkedTime = totalWorkedTime;
            lastAttLive = !!checkInOutList.length && checkInOutList[checkInOutList.length - 1].checkOut === 'Current';
        }`],
    ['tick hook', `                const currentUrl = window.location.href;
                if (currentUrl === targetUrl) {
                    insertAndCalculate();
                }`, `                const att = onAtt();
                if (att) insertAndCalculate();
                try { ATC.tick?.(att); } catch (e) { ATC.tick = null; console.warn('ATCShell:', e); }`],
    ['boot', `    window.addEventListener('load', () => {
        loadPreferences();

        const checkUrlAndRun = () => {
            const currentUrl = window.location.href;
            if (currentUrl !== targetUrl) {
                return;
            }

            insertAndCalculate();
            const submitButton = document.querySelector('.gp-btn.gp-btn-primary');
            if (submitButton) {
                submitButton.addEventListener('click', (event) => {
                    setTimeout(insertAndCalculate, 500);
                });
            }
        };

        checkUrlAndRun();

        startUpdateLoop();
    });`, `    // ATCShell.js bridge: read-only views of widget state; the shell adds tick/apply and follows displayTheme.
    Object.assign(ATC, { prefs: () => userPreferences, shift: getShiftSeconds, fmt: secondsToHHMMSS, att: () => ({ worked: lastTotalWorkedTime, live: lastAttLive }), onAtt, plus: gamesOpen });
    // A fresh browser off Attendance (no XP/leaderboard init there): take only the account's prefs from the gist, local wins as in applyPlayerRecordToLocal.
    async function prefsFromGist() {
        const prof = lsJSON('atc_lb_profile', null); if (!prof || !prof.registered || lsJSON('attendancePrefs', {}).displayTheme) return;
        const rec = (((await fetchRegistry()) || {}).players || []).find(p => p.clientId === prof.clientId), cp = rec && rec.userPreferences;
        if (cp && typeof cp === 'object') { const m = { ...cp, ...lsJSON('attendancePrefs', {}) }; localStorage.setItem('attendancePrefs', JSON.stringify(m)); userPreferences = { ...userPreferences, ...m }; applyPreferences(); }
    }
    function loadShell() {
        const url = localStorage.getItem('atcShellUrl') || 'https://raw.githubusercontent.com/script-handler/Custom-Scripts/refs/heads/main/ATCShell.js?v=' + BUILD_LABEL;
        fetch(url).then(r => r.ok ? r.text() : Promise.reject(r.status)).then(code => { new Function('ATC', code)(ATC); ATC.apply?.(); })
            .catch(e => console.warn('ATCShell:', e));
    }

    function boot() {
        loadPreferences();
        if (onAtt()) insertAndCalculate();
        // Delegated: the Attendance search button comes and goes with the route.
        document.addEventListener('click', e => { if (onAtt() && e.target.closest?.('.gp-btn.gp-btn-primary')) setTimeout(insertAndCalculate, 500); });
        // Theme changed in another tab (or by the gist restore there): every open portal page follows.
        window.addEventListener('storage', e => { if (e.key === 'attendancePrefs') { loadPreferences(); applyPreferences(); } });
        loadShell();
        if (!onAtt()) prefsFromGist();
        startUpdateLoop();
    }
    if (document.readyState === 'complete') boot(); else window.addEventListener('load', boot);`]
];

// The widget source with the bridge applied; throws naming every anchor that does not match exactly once.
// Line endings follow the file (a core.autocrlf checkout is CRLF).
const isBound = src => src.includes('    const ATC = {};');
function bridge(src) {
    if (isBound(src)) return src;
    const nl = src.includes('\r\n') ? '\r\n' : '\n', eol = t => t.replace(/\n/g, nl), steps = STEPS.map(([n, from, to]) => [n, eol(from), eol(to)]);
    const bad = steps.filter(([, from]) => src.split(from).length !== 2).map(([name]) => name);
    if (bad.length) throw new Error('bridge anchors not unique/found: ' + bad.join(', '));
    return steps.reduce((s, [, from, to]) => s.replace(from, () => to), src);
}

if (require.main === module) {
    const src = fs.readFileSync(FILE, 'utf8'), out = bridge(src);
    if (isBound(src)) console.log('✓ the widget is already bound');
    else if (process.argv.includes('--write')) { fs.writeFileSync(FILE, out); console.log('✓ bridge applied to AttendanceTimeCheckerPlus.js'); }
    else console.log(`✓ all ${STEPS.length} anchors match once (+${out.split('\n').length - src.split('\n').length} lines when applied)`);
}
module.exports = { bridge, isBound, STEPS };
