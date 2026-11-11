// ATCShell.js on a stand-in portal: the REAL userscript + the REAL EGP stylesheets (bootstrap 5.0.2, style.css,
// EnhancedStyle.css from the Global Portal repo), the portal URL, the time API and the shell's GitHub URL intercepted.
// Checks the SPA boot, chip + popover, Timeline time card, the v2 M3 tokens per widget theme and scheme, Material You; PNGs of each state.
//
//   "C:/Program Files/nodejs/node.exe" shell-dev/host-run.js [outDir]
const { spawn } = require('child_process');
const { bridge } = require('./bridge');
const fs = require('fs'), path = require('path'), os = require('os');

const ROOT = path.join(__dirname, '..'), EGP = process.env.EGP_WEB || 'C:/Users/HASSANNASIR2/GIT/Global Portal/Global Employee Web/Content';
const OUT = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'shell-host-run'));
const BASE = 'https://globalportal.mtbc.com/', TL = BASE + '#/home/Timeline';
const CHROME = require('../pool-dev/browser').browserPath();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const api = { checkout: '-' };

const css = ['bootstrap5/css/bootstrap.min.css', 'css/style.css', 'css/EnhancedStyle.css'].map(f => { try { return fs.readFileSync(path.join(EGP, f), 'utf8'); } catch (_) { console.log('  (missing ' + f + ')'); return ''; } }).join('\n');
const icons = ['Assign Practice', '☆', '◎', '⚑', '⚙'].map((t, i) => `<div class="${i ? 'bg-icon' : 'bg-iconWider'} cursor-pointer"><a class="icon-link">${t}</a></div>`).join('');
const box = (t, body, c = '') => `<div class="col-4 mb-3"><div class="box-widget h-100 ${c}"><span class="box-widget-title">${t}</span>${body}</div></div>`;
const TLV = `<section class="body_content"><div class="upper-text gp-users-detail"><span>Thu, Oct 29 · Islamabad Active Users on eGP: 54</span></div><div class="inside-section position-relative" id="inside-section-toggle"><div class="row">`
    + box('Hassan Nasir', `<app-personal-info-widget><div class="gp-user-horizontal-fig"><div class="fig-pod lg user-status"><img class="Profile-img" width="72" height="72" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect width='1' height='1' fill='%23889'/%3E%3C/svg%3E"></div><figcaption><h5><b>Hassan Nasir</b> <small>Senior Software Engineer</small></h5></figcaption></div><div class="time-check d-flex justify-content-between mt-2"><span class="fs-sm fw-bold">Last Check In: 1:55 PM</span><span class="fs-sm fw-bold">Last Check Out: -</span></div>`
        + `<div class="time-check d-flex justify-content-between mt-2"><span class="fs-sm fw-bold">Actual Time: 6:20:25</span><span class="fs-sm fw-bold">Active Time: 6:17:25</span></div></app-personal-info-widget>`)
    + box('Performance', `<div class="d-flex gap-2 my-2"><button class="nav-link active text-black">Performance</button><button class="nav-link text-black">Disciplinary Status</button></div><div class="circle-progress-inner d-flex gap-3">${[81, 66].map(v => '<div><div class="circular-progress" style="position:relative"><svg viewBox="0 0 100 100"><circle class="progress-bg" cx="50" cy="50" r="40"></circle><circle class="progress" cx="50" cy="50" r="40" style="stroke-dashoffset:' + (251.2 * (1 - v / 100)) + '"></circle></svg><span class="progress-inner-text">' + v + '%</span></div></div>').join('')}</div>`)
    + box('Health', `<app-health-widget><ul class="list-unstyled my-3 p-0 d-flex justify-content-around">${['Height', 'Weight', 'Blood Pressure', 'BMI'].map(k => '<li class="text-center"><img width="28" height="28" src="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath fill=%27%231a60a8%27 d=%27M4 4h16v16H4z%27/%3E%3C/svg%3E" alt=""><span class="d-block">' + k + '</span></li>').join('')}</ul></app-health-widget>`)
    + box('Careers', '<span class="d-block fs-2 pointer-cr timline-font-color">3</span><span>Internal</span>')
    + '<div class="col-4 mb-3"><div class="box-widget h-100 list-widget"><span class="box-widget-title">HR & Compliance</span><ul class="m-0 ps-3 news-scroll">' + ['Phishing uses fake sites posing as trusted organisations.', 'Never share passwords or security codes.', 'Daylight Saving Time ends on Sunday.'].map(t => '<li style="list-style: disc;color:#666; font-size:11px;">' + t + '</li>').join('') + '</ul></div></div>'
    + box('Prayer Time', '<div class="d-flex justify-content-around">' + [['F', '5:10'], ['Z', '1:30'], ['A', '4:00'], ['M', '5:25'], ['I', '7:15'], ['J', '1:30']].map(([k, t]) => '<div class="prayer-col text-center"><small class="fs-md fw-bold">' + k + '</small><small class="fs-md d-block">' + t + '</small></div>').join('') + '</div>')
    + box('Stock Price', '<p>CCLD:$1.77</p><ul><li>CareCloud to Announce Third Quarter 2026 Results</li></ul>', 'news-widget') + '</div></div></section>';
const ATTV = `<div class="collapse-sidebar" style="display:block"><i class="fa">»</i></div><div class="row"><div class="col-2"><div class="side-nav-tab"><ul><li><a>Leave Record</a></li><li><a>Attendance Record</a></li></ul></div></div><div class="col-10">`
    + `<section class="body_content" id="attendence-record-tab"><div class="attendance-details-wrapper p-3"><div class="attendence-inner"><h6>Attendance</h6><div class="d-flex gap-2 mb-3"><input class="form-control w-25" value="16117 : HASSAN NASIR"><select class="form-select w-25"><option>Month to Date</option></select><button class="gp-btn gp-btn-primary btn">Submit</button></div>`
    + `<div class="attendence-outer d-flex gap-2 mb-3">${['Last Check-In|07:59 AM', 'Last Check-Out|05:29 PM', 'Total Hours|7'].map(s => `<div class="attendence-box bgAttendancebox"><div class="attendence-box-inner text-center"><small>${s.split('|')[0]}</small><br><strong>${s.split('|')[1]}</strong></div></div>`).join('')}</div>`
    + `<div class="emp-list-table"><div class="table-responsive table-theme main-attendance-table"><table class="table table-striped"><thead class="sticky-top"><tr><th>Sr #</th><th>Date</th><th>Day</th><th>Time</th><th>Check In/Out</th><th>Actual hour(s)</th></tr></thead><tbody id="rows"></tbody></table></div></div></div></div></section></div></div>`;

function page() {
    // The widget with the bridge (applied in memory while the file is not bound).
    // api.oldWidget: a published widget from before ATC.float, as under a shell-only test (atcShellUrl).
    let script = bridge(fs.readFileSync(path.join(ROOT, 'AttendanceTimeCheckerPlus.js'), 'utf8'));
    if (api.oldWidget) script = script.replace(', float: togglePictureInPicture', '');
    return `<!doctype html><html><head><meta charset="utf-8"><title>Global Portal</title><style>${css}</style></head><body>
<div id="global-portal"><header><nav class="navbar navbar-expand-xl bg-grey gp-main-navbar px-3"><a class="navbar-brand fw-bold">MTBC Employee Portal</a><ul class="navbar-nav me-auto"><li class="nav-item"><a class="nav-link">Benefits</a></li><li class="nav-item"><a class="nav-link">Self-Care</a></li></ul><div class="header-icons d-flex">${icons}</div></nav></header><div id="view" class="p-3"></div></div>
<script>sessionStorage.setItem('authToken', 'tok'); sessionStorage.setItem('authUser', '16117');
window.$ = sel => ({ before: el => { const t = document.querySelector(sel); if (t) t.parentNode.insertBefore(el, t); } });
const V = { tl: ${JSON.stringify(TLV)}, att: ${JSON.stringify(ATTV)} };
const p2 = n => String(n).padStart(2, '0'), now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
const at = m => { const d = new Date(now.getTime() - m * 60000); return p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds()); };
const day = p2(now.getMonth() + 1) + '/' + p2(now.getDate()) + '/' + now.getFullYear();
const row = (i, t, k) => '<tr><td>' + i + '</td><td>' + day + '</td><td>Thursday</td><td>' + t + '</td><td>' + k + '</td><td></td></tr>';
function render() { const att = location.hash.startsWith('#/time-absence'); document.getElementById('view').innerHTML = att ? V.att : V.tl;
    // Like Attendence.html: until the report arrives, "No Record Found." and the totals row.
    if (att) { const tb = document.getElementById('rows'); tb.innerHTML = '<tr><td class="text-danger text-center" colspan="8">No Record Found.</td></tr><tr><td colspan="4"></td><td>Total</td><td>0</td></tr>';
        setTimeout(() => { tb.innerHTML = '<tr class="bg-success"><td colspan="6">Alternate Saturday - Approved</td></tr>' + row(1, at(300), 'In') + row(2, at(150), 'Out') + row(3, at(140), 'In') + '<tr><td class="text-center set-purple">4</td><td>10/02/2026</td><td>Friday</td><td>09:00:00</td><td>In</td><td></td></tr><tr class="bg-danger"><td>5</td><td>10/05/2026</td><td colspan="5"><b>Absent<span> - Unapproved</span></b></td></tr>'; }, 1500); } }
addEventListener('hashchange', render); render();</script>
<script>${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
}

async function main() {
    fs.mkdirSync(OUT, { recursive: true });
    const port = 9500 + Math.floor(Math.random() * 200);
    // A throwaway profile, removed on exit (each run's is ~40-80 MB).
    const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'shell-host-'));
    process.on('exit', () => { try { proc.kill(); } catch (_) {} try { fs.rmSync(PROFILE, { recursive: true, force: true, maxRetries: 5 }); } catch (_) {} });
    // PERF=1 keeps the GPU: without it WebGL is software and headless is paint-bound, hiding what costs what.
    const proc = spawn(CHROME, ['--headless=new', process.env.PERF ? '--enable-gpu-rasterization' : '--disable-gpu', '--remote-debugging-port=' + port, '--user-data-dir=' + PROFILE, '--no-first-run', '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' });
    const bail = setTimeout(() => { console.log('✗ TIMEOUT'); try { proc.kill(); } catch (_) {} process.exit(2); }, process.env.PERF ? 420000 : 180000);
    let target;
    for (let i = 0; i < 80 && !target; i++) { await sleep(200); try { target = (await (await fetch('http://127.0.0.1:' + port + '/json/list')).json()).find(t => t.type === 'page'); } catch (_) {} }
    if (!target) { console.log('✗ Chrome did not start'); process.exit(2); }
    const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
    let id = 0; const pending = {}, errors = [], hits = { api: 0, shell: 0 };
    const send = (method, params) => new Promise(r => { const n = ++id; pending[n] = r; ws.send(JSON.stringify({ id: n, method, params })); });
    const reply = (rid, type, body, extra = []) => send('Fetch.fulfillRequest', { requestId: rid, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: type }, { name: 'Access-Control-Allow-Origin', value: '*' }].concat(extra), body: Buffer.from(body).toString('base64') });
    ws.addEventListener('message', e => {
        const m = JSON.parse(e.data);
        if (m.id && pending[m.id]) { pending[m.id](m); delete pending[m.id]; return; }
        if (m.method === 'Fetch.requestPaused') {
            const u = m.params.request.url, rid = m.params.requestId;
            if (u.includes('/api/Home/getDashboardPerformanceRecord')) { hits.api++; reply(rid, 'application/json', JSON.stringify({ _ActualActiveTime: [{ Actual_Time: '4.5', Actual_Time2: '', Active_Time: '4.05' }], _Total_Checkin_Hours: [{ checkin: '1:55 PM', checkout: api.checkout }], _ShiftUser: [{ shift_name: 'Morning' }] })); }
            else if (u.startsWith(BASE)) reply(rid, 'text/html; charset=utf-8', page());
            else if (u.includes('/ATCShell.js')) { hits.shell++; reply(rid, 'text/plain', fs.readFileSync(path.join(ROOT, 'ATCShell.js'), 'utf8')); }
            else if (u.includes('/glass-theme-bg/')) { const f = u.split('/glass-theme-bg/')[1]; reply(rid, f.endsWith('.png') ? 'image/png' : 'image/jpeg', fs.readFileSync(path.join(ROOT, 'glass-theme-bg', f))); }
            else send('Fetch.failRequest', { requestId: rid, errorReason: 'BlockedByClient' });
        }
        if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    });
    await send('Runtime.enable'); await send('Page.enable'); await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
    await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false });
    const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); if (r.result && r.result.exceptionDetails) throw new Error(x.slice(0, 90) + ': ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text)); return r.result?.result?.value; };
    const scheme = v => send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: v }] });
    const until = async (x, ms = 8000) => { for (let t = 0; t < ms; t += 150) { if (await ev(x)) return true; await sleep(150); } return false; };
    const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 1400, height: Math.min(1700, await ev('document.documentElement.scrollHeight')), scale: 1 } }); fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.result.data, 'base64')); };
    // plus: a stored Plus grant (the gist can't answer here, so it stands); the web theme is Plus.
    const go = async (url, prefs, plus = true) => { await send('Page.navigate', { url: BASE }); await sleep(300);
        await ev(`localStorage.setItem('attendancePrefs', ${JSON.stringify(JSON.stringify(prefs || {}))}); sessionStorage.removeItem('attSnap');
            ${plus ? "localStorage.setItem('atc_games_ok', String(Date.now() + 864e5)); localStorage.setItem('atc_games_secret', 'harness')" : "localStorage.removeItem('atc_games_ok'); localStorage.removeItem('atc_games_secret')"}; 1`);
        // A fresh query each time: BASE → BASE#/… alone is a same-document hash change, no reload.
        await send('Page.navigate', { url: url.replace('#', '?n=' + (++nav) + '#') }); await sleep(300); await until("document.readyState === 'complete'"); };
    let pass = 0, fail = 0, nav = 0;
    const ok = (n, c, d) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (d !== undefined ? ' — ' + JSON.stringify(d) : '')); } };
    const state = () => ev(`(() => { const H = document.documentElement, q = x => document.querySelector(x), cs = getComputedStyle(H), r = q('.atc-time .atc-r');
        return { skin: H.dataset.attSkin || '', theme: H.dataset.atcTheme || '', fam: H.dataset.xFam || '', primary: cs.getPropertyValue('--md-sys-color-primary').trim().toLowerCase(),
            chip: !!q('.gp-main-navbar .header-icons > .atc-chip:first-child'), time: !!q('app-personal-info-widget .atc-time'), st: (q('.atc-time')?.className || '').replace('atc-time ', ''),
            hostHidden: [...document.querySelectorAll('app-personal-info-widget .time-check')].filter(r => /Actual Time/.test(r.textContent)).every(r => getComputedStyle(r).display === 'none'),
            pO: r && +r.getAttribute('aria-valuenow'), wavy: !!(r && r.classList.contains('is-wavy')), act: q('.atc-time [data-k=act]')?.textContent, big: q('.atc-time [data-k=big]')?.textContent,
            avatar: q('.Profile-img') ? getComputedStyle(q('.Profile-img')).clipPath.slice(0, 8) : '',
            panel: !!document.getElementById('total-time-summary'), mat: !!q('#total-time-summary.mat-theme'), mr: !!q('#total-time-summary .ws-time-top .atc-r'),
            bodyBg: getComputedStyle(document.body).backgroundColor, boxBg: getComputedStyle(q('.box-widget, .attendence-box') || document.body).backgroundColor }; })()`);
    const zoom = async (name, q, pad = 12) => { const b = await ev(`(() => { const r = document.querySelector('${q}').getBoundingClientRect(); return { x: Math.max(0, r.left - ${pad}), y: Math.max(0, r.top - ${pad}), width: r.width + ${2 * pad}, height: r.height + ${2 * pad} }; })()`);
        const r = await send('Page.captureScreenshot', { format: 'png', clip: { ...b, scale: 3 } }); fs.writeFileSync(path.join(OUT, 'zoom-' + name + '.png'), Buffer.from(r.result.data, 'base64')); };
    // The open popover sits under the chip at the header's right end.
    const popShot = async name => { const r = await send('Page.captureScreenshot', { format: 'png', clip: { x: 900, y: 0, width: 500, height: 440, scale: 2 } }); fs.writeFileSync(path.join(OUT, 'pop-' + name + '.png'), Buffer.from(r.result.data, 'base64')); };
    const PRIMARY = { glassmorphic: ['#6d5bd0', '#8b78f0'], material: ['#0b57d0', '#a8c7fa'], business: ['#1e88e5', '#1e88e5'], 'retro-futuristic': ['#fff200', '#fff200'], liquid: ['#b9defb', '#b9defb'] };

    console.log('\n── Timeline, Glassmorphic Aurora (default prefs)');
    for (const sc of ['dark', 'light']) {
        await scheme(sc); await go(TL);
        ok(`${sc}: chip and time card mount`, await until("!!document.querySelector('.atc-chip') && !!document.querySelector('.atc-time')"));
        await sleep(400); const s = await state();
        if (process.env.DBG) { console.log('DBG', JSON.stringify(await ev(process.env.DBG), null, 1)); process.exit(0); }
        ok(`${sc}: skin follows the browser, Aurora tokens, primary = widget accent (${s.primary})`, s.skin === sc && s.fam === 'aurora' && s.primary === PRIMARY.glassmorphic[+(sc === 'dark')], s);
        ok(`${sc}: chip first in header-icons, host Actual/Active row hidden`, s.chip && s.hostHidden, s);
        ok(`${sc}: time card reads the API ("4.5" → 4:50 + ticks), live, wavy ring`, /^4:5\d:\d\d$/.test(s.act) && s.st === 'st-live' && s.pO > 50 && s.wavy, s);
        ok(`${sc}: profile avatar takes the theme shape`, s.avatar === 'polygon(', s);
        ok(`${sc}: HR & Compliance rows sit behind shaped tiles; exactly one prayer marked next`, await ev("getComputedStyle(document.querySelector('.news-scroll li'), '::before').clipPath.startsWith('polygon') && getComputedStyle(document.querySelector('.news-scroll li')).listStyleType === 'none' && document.querySelectorAll('.prayer-col.atc-now').length === 1"));
        await shot('tl-aurora-' + sc); await zoom('time-aurora-' + sc, '.atc-time');
        await ev("document.querySelector('.atc-chip-b').click(); 1"); await sleep(700);
        ok(`${sc}: popover opens with countdown, wave and XP row`, await ev(String.raw`(() => { const p = document.querySelector('.atc-pop'); return !p.hidden && /^\d:\d\d:\d\d$/.test(p.querySelector('[data-k=big]').textContent) && p.querySelector('.atc-wv').classList.contains('is-live') && /Level/.test(p.querySelector('[data-k=lvl]').textContent); })()`));
        await zoom('chip-aurora-' + sc, '.atc-chip', 24); await popShot('aurora-' + sc);
        await ev("document.body.click(); 1"); await sleep(200);
        ok(`${sc}: popover closes on an outside click`, await ev("document.querySelector('.atc-pop').hidden"));
    }
    console.log('\n── SPA: Timeline → Attendance (used to need a reload)');
    await ev("location.hash = '#/time-absence/attendence-record'; 1");
    ok('full widget boots after in-app navigation', await until("!!document.getElementById('total-time-summary')"));
    const sessions = "(() => { const t = document.querySelector('#total-time-summary .modern-table'); return !!t && /Current/.test(t.textContent) && t.querySelectorAll('tbody tr').length === 2; })()";
    ok('the panel waits for the report: both sessions shown, not just "Day total"', await until(sessions, 6000));
    await ev("window.__panel = document.getElementById('total-time-summary'); location.hash = '#/home/Timeline'; 1"); await until("!!document.querySelector('.atc-time')");
    await ev("location.hash = '#/time-absence/attendence-record'; 1");
    ok('back on Attendance: the same panel (games and all) returns, sessions intact', await until("document.getElementById('total-time-summary') === window.__panel") && await until(sessions, 6000));
    await sleep(1200); let s = await state();
    ok('chip leaves on Attendance; skin stays', !s.chip && s.skin === 'light', s);
    ok('side-nav collapse handle takes the theme (not #1a60a8)', await ev("getComputedStyle(document.querySelector('.collapse-sidebar i')).backgroundColor !== 'rgb(26, 96, 168)'"));
    await shot('att-aurora-light');
    ok('settings modal has no separate portal rows', await ev("(() => { document.querySelector('#total-time-summary .settings-button')?.click(); const m = document.querySelector('.settings-modal'); const r = !!m && !m.innerHTML.includes('portalSkin') && !m.innerHTML.includes('portalChip') && m.innerHTML.includes('Material You'); document.querySelector('.settings-modal-overlay, .settings-overlay')?.click(); return r; })()"));

    for (const [th, nm] of [['material', 'my'], ['business', 'biz'], ['retro-futuristic', 'cyber'], ['liquid', 'lg']]) {
        console.log(`\n── ${th}`);
        for (const sc of ['light', 'dark']) {
            const want = th === 'retro-futuristic' || th === 'liquid' ? 'dark' : th === 'business' ? 'light' : sc;
            await scheme(sc); await go(TL, { displayTheme: th });
            await until("!!document.querySelector('.atc-time')"); await sleep(400); s = await state();
            ok(`${sc} Timeline: ${th} → family ${nm}, skin ${want}, primary ${PRIMARY[th][+(want === 'dark')]}`, s.theme === th && s.fam === nm && s.skin === want && s.primary === PRIMARY[th][+(want === 'dark')], s);
            ok(`${sc} Timeline: the active tab (EGP text-black) takes on-fill text`, await ev("(() => { const b = document.querySelector('.box-widget button.nav-link.active'), c = document.createElement('i'); c.style.color = getComputedStyle(document.documentElement).getPropertyValue('--x-on-fill'); document.body.append(c); const r = getComputedStyle(b).color === getComputedStyle(c).color; c.remove(); return r; })()"));
            ok(`${sc} Timeline: performance value arcs take primary, the track the theme track`, await ev("(() => { const v = getComputedStyle(document.querySelector('.circular-progress circle.progress')).stroke, t = getComputedStyle(document.querySelector('.circular-progress .progress-bg')).stroke; return v !== t && v !== 'rgb(0, 139, 239)'; })()"));
            ok(`${sc} Timeline: blockUI loader is the M3 loading indicator (atcLi-${nm}) in a 72px container on a surface veil`, await ev(`(() => { document.body.insertAdjacentHTML('beforeend', '<div class="blockUI blockOverlay" style="z-index:1000;width:100%;height:100%;top:0;left:0;background-color:#000;opacity:0.6;position:fixed"></div><div class="blockUI blockMsg blockPage" style="z-index:1080;position:fixed;padding:0;margin:0;width:30%;top:40%;left:35%;text-align:center;border:none;background:none"><img src="../../../../../images/loading.gif" alt="Loading"></div>');
                const i = document.querySelector('.blockMsg img'), m = i.parentElement, o = document.querySelector('.blockOverlay'), c = getComputedStyle(i), rm = matchMedia('(prefers-reduced-motion:reduce)').matches;
                const r = c.clipPath.startsWith('polygon') && (rm ? c.animationName === 'atcSpin' : c.animationName.startsWith('atcLi-${nm},')) && c.backgroundImage + c.backgroundColor !== 'nonergba(0, 0, 0, 0)' && m.getBoundingClientRect().width === 72 && getComputedStyle(o).backgroundColor !== 'rgb(0, 0, 0)';
                document.querySelectorAll('.blockUI').forEach(e => e.remove()); return r; })()`));
            await shot(`tl-${nm}-${sc}`); await zoom(`time-${nm}-${sc}`, '.atc-time');
            await ev("document.querySelector('.atc-chip-b').click(); 1"); await sleep(600); await zoom(`chip-${nm}-${sc}`, '.atc-chip', 24); await popShot(`${nm}-${sc}`);
            await ev("document.body.click(); location.hash = '#/time-absence/attendence-record'; 1");
            await until("!!document.getElementById('total-time-summary')"); await sleep(1200); s = await state();
            if (th === 'material') ok(`${sc} Attendance: Material panel + ring in the time card`, s.mat && s.mr, s);
            if (th === 'material') ok(`${sc} Attendance: absent row is a shape marker + Absent chip, not a red flood`, await ev("(() => { const r = document.querySelector('#rows tr.bg-danger'); return !!r && r.dataset.atcK === 'absent' && !!r.querySelector('.atc-lchip.is-absent') && getComputedStyle(r.cells[0], '::before').backgroundColor !== 'rgba(0, 0, 0, 0)' && getComputedStyle(r.cells[0]).backgroundColor === 'rgba(0, 0, 0, 0)'; })()"));
            if (th === 'material') ok(`${sc} Attendance: rows tagged (WFH marker, In/Out icon cells, leave chip)`, await ev("(() => { const r = [...document.querySelectorAll('#rows tr')]; const w = r.find(x => x.cells[0] && x.cells[0].classList.contains('set-purple')); return !!w && w.dataset.atcK === 'wfh' && w.cells[4].dataset.atcIo === 'in' && r.some(x => x.dataset.atcK === 'leave' && x.querySelector('.atc-lchip')); })()"));
            if (want === 'dark') ok('dark: host table text is the theme text, not #555', await ev("getComputedStyle(document.querySelector('#rows tr:nth-child(3) td:nth-child(2)')).color !== 'rgb(85, 85, 85)'"));
            await shot(`att-${nm}-${sc}`);
        }
    }
    console.log('\n── Cyberpunk, user palette (Magenta Noir)');
    await go(TL, { displayTheme: 'retro-futuristic', cyberBgPrimary: '#0a0512', cyberBgSecondary: '#170a26', cyberAccent: '#ff2a6d', cyberHighlight: '#d16bff', cyberPanelTint: '#8a2be2', cyberText: '#ffd6e8', cyberGlow: '#ff2a6d', cyberBorder: '#ff5c94' });
    await until("!!document.querySelector('.atc-time')"); await sleep(400); s = await state();
    ok('Cyberpunk scheme is built from the widget palette (primary #ff2a6d, page bg #0a0512)', s.primary === '#ff2a6d' && s.bodyBg === 'rgb(10, 5, 18)', s);
    await shot('tl-cyber-magenta'); await zoom('time-cyber-magenta', '.atc-time');
    console.log('\n── Web Theme (Plus)');
    const ATT = BASE + '#/time-absence/attendence-record', web = "'atcWeb' in document.documentElement.dataset";
    const row = "(() => { document.querySelector('#total-time-summary .settings-button')?.click(); const r = document.querySelector('.settings-modal [data-plus-only]'), v = !!r && getComputedStyle(r).display !== 'none' && !!r.querySelector('[data-pref=webTheme]'); document.querySelector('.settings-modal-overlay')?.click(); return r ? v : null; })()";
    await scheme('light'); await go(TL, {}, false);
    await until("!!document.querySelector('.atc-time')"); await sleep(400); s = await state();
    ok('free tier: no page skin, views or loader theme; the chip and time card stay', !s.skin && !(await ev(web)) && !(await ev("!!document.querySelector('.atc-view,.atc-pgrid')")) && s.chip && s.time, s);
    await ev("location.hash = '#/time-absence/attendence-record'; 1"); await until("!!document.getElementById('total-time-summary')"); await sleep(800);
    ok('free tier: Settings > Theme keeps the Web Theme row hidden', await ev(row) === false);
    await go(TL, { webTheme: false });
    await until("!!document.querySelector('.atc-time')"); await sleep(400); s = await state();
    ok('Plus, Web Theme off: the page keeps EGP\'s look; tokens still follow the theme for the chip', !s.skin && !(await ev(web)) && s.fam === 'aurora' && s.chip, s);
    await go(ATT); await until("!!document.querySelector('#rows .atc-lchip')"); await sleep(600);
    ok('Plus: Settings > Theme shows the Web Theme row', await ev(row) === true);
    await ev("document.querySelector('#total-time-summary .settings-button').click(); document.querySelector('.settings-modal .toggle-switch[data-pref=webTheme]').click(); document.querySelector('.settings-modal-overlay')?.click(); 1");
    ok('switched off live: skin, row chips, tags and hidden host parts all come off', await until(`!document.documentElement.dataset.attSkin && !(${web}) && !document.querySelector('.atc-lchip,.atc-bento,.atc-legend,#attendence-record-tab .atc-hide,tr[data-atc-k]')`, 4000)
        && JSON.parse(await ev("localStorage.getItem('attendancePrefs')")).webTheme === false);
    await ev("document.querySelector('#total-time-summary .settings-button').click(); document.querySelector('.settings-modal .toggle-switch[data-pref=webTheme]').click(); document.querySelector('.settings-modal-overlay')?.click(); 1");
    ok('switched on again: the skin and row chips come back', await until(`document.documentElement.dataset.attSkin === 'light' && (${web}) && !!document.querySelector('#rows .atc-lchip')`, 4000));
    console.log('\n── Icons, USA clocks, Float, laptop layout (EGP markup injected where the stand-in has none)');
    await go(TL); await until("!!document.querySelector('.atc-chip')"); await sleep(600);
    await ev(`(() => { const row = document.querySelector('.box-widget').parentElement;
        row.insertAdjacentHTML('beforeend', '<div class="box-widget h-100" id="usa-x"><span class="box-widget-title d-flex justify-content-lg-start">USA <span class="d-flex gap-4 mx-4">'
            + [137, 80, 64, 173].map(n => '<small class="color-theme fw-bold"><iframe src="https://freesecure.timeanddate.com/clock/i6eupqji/n' + n + '/fs10/tct/pct/ts1/ta1" width="65" height="13"></iframe></small>').join('')
            + '</span></span><a class="carousel-control-next" role="button"><span class="carousel-control-next-icon"><svg width="20" height="20" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg></span></a></div>');
        document.body.insertAdjacentHTML('afterbegin', '<div class="sidebar" id="sidebarNav"><div class="sidebar-icons"><ul class="list-unstyled"><li class="sd-icon"><a class="sidebar-icons-link" title="Early Coming / Late Sitting Approval"><svg width="21" height="6" viewBox="0 0 21 6"><path d="M0 0h21v6H0z" fill="white"/></svg></a></li></ul></div></div>');
        document.querySelector('.header-icons').insertAdjacentHTML('beforeend', '<div class="bg-iconEmp cursor-pointer"><a class="icon-link" style="width:135px"><i class="fas fa-address-card me-1"></i> Assign Practice </a></div>');
        const fig = (n, a, w) => '<div class="gp-user-vertical-fig position-relative w-45">' + (w ? '<div class="comments-icon"><img src="/Content/images/comment-dots-Regular.svg"></div>' : '') + '<div class="fig-pod"><a><img alt="..."></a></div><figcaption><strong>' + n + '</strong><small>' + a + '</small></figcaption></div>';
        row.insertAdjacentHTML('beforeend', '<div class="box-widget h-50" id="aw-x"><app-company-awards-widget><div class="gp-performers"><div class="d-flex mb-2"><div class="d-flex gap-3"><div class="box-widget-title-new active"> Company Awards <span><i id="add-eom-tom-request-btn" class="fa fa-plus"></i></span></div><div class="box-widget-title-new"> Idea Nomination </div></div><div><small><a>More Info</a></small></div></div>'
            + '<div id="myTabContent" class="tab-content d-block"><div class="tab-pane active"><div class="carousel slide"><div class="carousel-inner"><div class="carousel-item active"><div class="d-flex">' + fig('Muhammad Aasim', 'Stand OUT Performer', 0) + fig('Muzamil Manzoor', 'Star Performer', 1) + '</div></div></div></div>'
            + '<a class="carousel-control-next" role="button"><span class="carousel-control-next-icon"></span></a></div></div></div><div class="modal fade" id="add-eom-tom-modal"></div></app-company-awards-widget></div>'); return 1; })()`);
    await sleep(1600);
    ok('USA: the timeanddate iframes give way to themed zone clocks (Pacific first, as EGP orders them)', await ev(String.raw`(() => { const c = [...document.querySelectorAll('#usa-x .atc-clk')], f = document.querySelector('#usa-x iframe');
        const pac = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles', timeZoneName: 'short' }).format(new Date());
        return c.length === 4 && c.every(e => /^\d{1,2}:\d{2} [AP]M [A-Z]{2,5}$/.test(e.textContent)) && c[0].textContent === pac && getComputedStyle(f).display === 'none' && getComputedStyle(c[0].parentElement).backgroundColor !== 'rgba(0, 0, 0, 0)'; })()`));
    ok('Company Awards is laid out as Promotion (tabs, add, More, pager, person tiles); its add-award modal stays out of the hidden content', await ev("(() => { const c = document.getElementById('aw-x'), v = c.querySelector(':scope > .atc-view'); return !!v && v.querySelectorAll('.atc-v-seg > span').length === 2 && v.querySelectorAll('.atc-v-pr.is-award').length === 2 && !!v.querySelector('.atc-v-pg [aria-label=Next]') && !!v.querySelector('[aria-label=\"Add an award\"]') && v.querySelectorAll('.atc-v-pr [aria-label=\"Send wishes\"]').length === 1 && getComputedStyle(c.querySelector('.gp-performers')).display === 'none' && getComputedStyle(c.querySelector('app-company-awards-widget')).display === 'contents' && c.querySelector('#add-eom-tom-modal').parentElement.tagName === 'APP-COMPANY-AWARDS-WIDGET'; })()"));
    ok('modal close buttons: a themed close symbol at full opacity, not the Bootstrap black × image', await ev("(() => { document.body.insertAdjacentHTML('beforeend', '<div class=\"modal-header\" id=\"mc-x\"><button type=\"button\" class=\"btn-close\"></button></div>'); const b = document.querySelector('#mc-x .btn-close'), c = getComputedStyle(b), p = getComputedStyle(b, '::before'), osv = getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-on-surface-variant').trim(), probe = document.createElement('i'); probe.style.color = osv; document.body.append(probe); const want = getComputedStyle(probe).color; probe.remove(); const r = c.backgroundImage === 'none' && c.opacity === '1' && p.webkitMaskImage.includes('data:image/svg') && c.color === want; document.getElementById('mc-x').remove(); return r; })()"));
    ok('carousel arrows left in a restyled card are the 28px pager button with a symbol', await ev("(() => { const a = document.querySelector('#usa-x .carousel-control-next'), s = a.querySelector('svg'), b = a.getBoundingClientRect(); return Math.round(b.width) === 28 && getComputedStyle(a).backgroundColor !== 'rgba(0, 0, 0, 0)' && getComputedStyle(s).webkitMaskImage.includes('data:image/svg'); })()"));
    ok('rail: EC/LS (a 21 × 6 wordmark svg) draws a whole 24px symbol', await ev("(() => { const s = document.querySelector('#sidebarNav .sidebar-icons-link svg'), b = s.getBoundingClientRect(); return Math.round(b.width) === 24 && Math.round(b.height) === 24 && getComputedStyle(s).webkitMaskImage.includes('data:image/svg'); })()"));
    ok('1400 px: Assign Practice is icon-only (EGP pins it at 135px); the time card drops its values under the countdown', await ev("(() => { const a = document.querySelector('.header-icons .bg-iconEmp .icon-link'), big = document.querySelector('.atc-time .atc-big'), tg = document.querySelector('.atc-time .atc-tg'); return a.getBoundingClientRect().width < 60 && tg.getBoundingClientRect().top >= big.getBoundingClientRect().bottom; })()"));
    ok('chip Float: its label survives paint() and it sits beside Open attendance', await ev("(() => { document.querySelector('.atc-chip-b').click(); return 1; })()") && await sleep(1500) === undefined
        && await ev("(() => { const b = document.querySelector('.atc-pop [data-act=float]'); return !!b && /Float/.test(b.textContent) && !!b.querySelector('svg') && b.getBoundingClientRect().width > 50; })()"));
    // A trusted click (CDP input, so it carries user activation): the real Document Picture-in-Picture path, unstubbed.
    const fb = await ev("(() => { const r = document.querySelector('.atc-pop [data-act=float]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()");
    for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: fb.x, y: fb.y, button: 'left', clickCount: 1 });
    await sleep(1800);
    const real = await ev("(() => { const w = documentPictureInPicture.window; return w ? { time: (w.document.querySelector('.time') || {}).textContent, face: !!w.document.querySelector('button.mood'), w: w.innerWidth, h: w.innerHeight } : null; })()");
    ok('chip Float, real click: Chrome opens the floating window with the countdown', !!real && /^\d\d:\d\d:\d\d$/.test(real.time) && real.face, real);
    await ev("(() => { const w = documentPictureInPicture.window; if (w) w.close(); document.querySelector('.atc-chip-b').click(); return 1; })()"); await sleep(600);
    ok('chip Float opens the widget float off Attendance with the shell time; its face closes it', await ev(String.raw`(async () => {
        const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:240px;height:80px;border:0'; document.body.append(f); let closed = 0; f.contentWindow.close = () => { closed++; };
        documentPictureInPicture.requestWindow = async () => f.contentWindow; document.querySelector('.atc-pop [data-act=float]').click(); await new Promise(r => setTimeout(r, 1400));
        const d = f.contentDocument, t = d.querySelector('.time'); const r = !!t && /^\d\d:\d\d:\d\d$/.test(t.textContent) && !!d.body.style.getPropertyValue('--att-accent'); d.querySelector('.mood').click(); f.remove(); return r && closed === 1; })()`));
    api.oldWidget = true; await go(TL); await until("!!document.querySelector('.atc-chip')"); await sleep(800);
    await ev("document.querySelector('.atc-chip-b').click(); 1"); await sleep(500);
    const fo = await ev("(() => { const b = document.querySelector('.atc-pop [data-act=float]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()");
    if (fo) for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: fo.x, y: fo.y, button: 'left', clickCount: 1 });
    await sleep(1800);
    const sf = await ev("(() => { const w = documentPictureInPicture.window; if (!w) return null; const r = { time: w.document.querySelector('.time').textContent, label: w.document.querySelector('.label').textContent, face: w.document.querySelector('button.mood').textContent, bg: w.document.body.style.getPropertyValue('--sc') }; w.close(); return r; })()");
    ok('under a widget without ATC.float the chip still floats, in the shell\'s own window (real click)', !!fo && !!sf && /^\d+:\d\d:\d\d$/.test(sf.time) && sf.label === 'Left in shift' && !!sf.face && !!sf.bg, { fo, sf });
    api.oldWidget = false; await go(TL); await until("!!document.querySelector('.atc-chip')");
    await ev("location.hash = '#/time-absence/attendence-record'; 1"); await until("!!document.getElementById('total-time-summary')"); await sleep(1000);
    const cols = () => ev("getComputedStyle(document.getElementById('total-time-summary')).gridTemplateColumns.split(' ').length");
    ok('widget workspace at 1400 px: still three columns (320 px sides)', await cols() === 3 && /^320px/.test(await ev("getComputedStyle(document.getElementById('total-time-summary')).gridTemplateColumns")));
    await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 1000, deviceScaleFactor: 1, mobile: false }); await sleep(400);
    ok('widget workspace at 1366 px: the right column drops under the other two', await cols() === 2);
    await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false });
    // desk: a quote already there, the menu still adds another
    const addQ = async (t) => { await ev("document.querySelector('#total-time-summary .desk-kebab').click(); document.querySelector('#total-time-summary .desk-menu [data-desk=add]').click(); 1");
        return ev(`(() => { const f = document.querySelector('#total-time-summary .desk-edit'); if (!f) return null; f.querySelector('textarea').value = ${JSON.stringify(t)}; f.querySelector('[type=submit]').click(); return JSON.parse(localStorage.getItem('customQuotes') || 'null'); })()`); };
    await ev("(() => { const d = document.querySelector('#total-time-summary .desk'); if (!d.querySelector('.desk-kebab')) { d.querySelector('[data-desk=edit]').click(); const f = d.querySelector('.desk-edit'); f.querySelector('textarea').value = 'First'; f.querySelector('[type=submit]').click(); } return 1; })()");
    const n0 = await ev("JSON.parse(localStorage.getItem('customQuotes') || '[]').length"), qs = await addQ('Second line');
    const lbl = await ev("(() => { document.querySelector('#total-time-summary .desk-kebab').click(); const t = document.querySelector('#total-time-summary .desk-menu .desk-ml:last-of-type').textContent; document.querySelector('#total-time-summary .desk-kebab').click(); return t; })()");
    ok('desk card: with a quote showing, "Add another quote…" adds one (not an edit) and the menu counts them', !!qs && qs.length === Math.max(n0, 1) + 1 && qs[qs.length - 1].text === 'Second line' && /of \d+/.test(lbl), { n0, qs, lbl });
    console.log('\n── Modals in dark (EGP greys and light panels)');
    await scheme('dark'); await go(TL, { displayTheme: 'material' }); await until("!!document.querySelector('.atc-chip')"); await sleep(600);
    ok('dark: EGP modal titles, labels and light panels read on the themed surface (contrast ≥ 4.5 / 3)', await ev(String.raw`(() => {
        document.body.insertAdjacentHTML('beforeend', '<div class="modal show" id="md-x" style="display:block"><div class="modal-dialog"><div class="modal-content"><div class="modal-header"><h5 class="modal-title" style="color:#444">Change Password</h5><button type="button" class="btn-close"></button></div><div class="modal-body"><div style="background:#fff"><label class="control-label" style="color:#666">Sibling(s) working in MTBC.</label></div><p class="text-blue">Best of luck</p></div><div class="modal-footer"><button class="btn btn-info">Save</button></div></div></div></div>');
        const P = s => s.match(/[\d.]+/g).map(Number), L = c => { const f = v => (v /= 255) <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
        const cr = (a, b) => { const x = L(P(a)), y = L(P(b)); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }, q = x => document.querySelector('#md-x ' + x), c = (e, p) => getComputedStyle(e)[p];
        const surf = c(q('.modal-content'), 'backgroundColor'), inner = c(q('.modal-body > div'), 'backgroundColor'), lbg = P(inner)[3] === 0 ? surf : inner, btn = q('.btn-info');
        const r = cr(c(q('.modal-title'), 'color'), surf) >= 4.5 && cr(c(q('.control-label'), 'color'), lbg) >= 3 && cr(c(q('.text-blue'), 'color'), surf) >= 3 && cr(c(btn, 'color'), c(btn, 'backgroundColor')) >= 3;
        document.getElementById('md-x').remove(); return r; })()`));
    console.log('\n── Liquid Glass engine (a stripes image in IndexedDB behind the glass)');
    await go(TL, { displayTheme: 'liquid' }); await until("!!document.querySelector('.atc-time')");
    await ev(`new Promise(res => { const c = document.createElement('canvas'); c.width = c.height = 480; const x = c.getContext('2d');
        for (let i = 0; i < 20; i++) { x.fillStyle = i % 2 ? '#f2f2f2' : '#101010'; x.fillRect(i * 24, 0, 24, 480); } x.fillStyle = '#ff3c3c'; for (let y = 30; y < 480; y += 90) x.fillRect(0, y, 480, 3);
        c.toBlob(b => { const o = indexedDB.open('attendanceImageBox', 1); o.onupgradeneeded = () => o.result.createObjectStore('images');
            o.onsuccess = () => { const t = o.result.transaction('images', 'readwrite'); t.objectStore('images').put(b, 'liquid'); t.oncomplete = () => res(1); }; }); })`);
    await go(TL, { displayTheme: 'liquid', lgBg: 'image', lgBgUrl: 'idb:1' }); await until("!!document.querySelector('.atc-time')");
    ok('Liquid, image background: the WebGL engine takes the glass (html.lg-gl, one canvas)', await until("document.documentElement.classList.contains('lg-gl') && document.querySelectorAll('#atc-lg-canvas').length === 1", 8000));
    await sleep(1200); await shot('tl-lg-engine'); await zoom('lg-engine-card', '.box-widget', 30);
    ok('…and idles: no WebGL draws in 2 s without input', await ev(`new Promise(r => { const P = WebGLRenderingContext.prototype, d = P.drawArrays; let n = 0; P.drawArrays = function () { n++; return d.apply(this, arguments); };
        setTimeout(() => { P.drawArrays = d; r(n === 0 || n); }, 2000); })`) === true);
    const drawsWhileMoving = async () => { await ev("(() => { const P = WebGLRenderingContext.prototype, d = P.drawArrays; window.__n = 0; window.__d = d; P.drawArrays = function () { window.__n++; return d.apply(this, arguments); }; return 1; })()");
        for (let i = 0; i < 12; i++) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 200 + i * 60, y: 200 + i * 20 }); await sleep(60); }
        await sleep(400); return ev("(() => { WebGLRenderingContext.prototype.drawArrays = window.__d; return window.__n; })()"); };
    ok('the pointer wakes it for the cursor light', await drawsWhileMoving() > 0);
    await ev(`localStorage.setItem('attendancePrefs', JSON.stringify({ ...JSON.parse(localStorage.getItem('attendancePrefs')), lgHoverFx: false })); dispatchEvent(new StorageEvent('storage', { key: 'attendancePrefs' })); 1`); await sleep(1500);
    const still = await drawsWhileMoving();
    ok('Hover Effects off: the pointer no longer wakes it, and the CSS hover rules switch off (html.lg-nofx)', still === 0 && await ev("document.documentElement.classList.contains('lg-nofx')"), still);
    await ev(`localStorage.setItem('attendancePrefs', JSON.stringify({ ...JSON.parse(localStorage.getItem('attendancePrefs')), displayTheme: 'material' })); dispatchEvent(new StorageEvent('storage', { key: 'attendancePrefs' })); 1`);
    ok('switching theme tears it down (no canvas, no lg-gl, no Liquid CSS)', await until("!document.getElementById('atc-lg-canvas') && !document.documentElement.classList.contains('lg-gl') && !document.getElementById('atc-lg-css')"));
    for (const pal of ['ocean', 'violet', 'graphite', 'green']) {
        await go(TL, { displayTheme: 'liquid', lgPalette: pal }); await until("!!document.querySelector('.atc-time')");
        ok(`${pal}: Background › Palette image (the default) loads its image into the engine`, await until("document.documentElement.classList.contains('lg-gl')", 8000));
        await sleep(800); await shot('tl-lg-' + pal); await send('Page.navigate', { url: BASE + '#/time-absence/attendence-record' }); await until("!!document.getElementById('total-time-summary')"); await sleep(1500); await shot('att-lg-' + pal);
    }
    await ev("document.querySelector('#total-time-summary .settings-button').click(); document.querySelector('[data-settings-tab=theme]').click(); 1"); await sleep(500); await zoom('lg-settings', '.settings-modal', 8);
    const acc = await ev("(() => { const d = document.querySelector('.lg-optics'), seen = s => document.querySelector(s).checkVisibility(); return [!!d, !!d && !d.open, !seen('[data-pref=lgRefract]'), seen('[data-pref=lgPalette]'), !seen('[data-pref=lgAccent]')]; })()");
    ok('Theme tab: Clarity and the sliders sit closed under Glass Optics; Glass Colors only for Custom', acc.every(Boolean), acc);
    ok('…picking Custom shows Glass Colors', await ev("(() => { const s = document.querySelector('[data-pref=lgPalette]'); s.value = 'custom'; return document.querySelector('[data-pref=lgAccent]').checkVisibility(); })()"));
    const rows = await ev(`(() => { const v = p => document.querySelector('[data-pref=' + p + ']').checkVisibility(), t = document.getElementById('theme-selector'), was = [v('auBg'), v('lgHoverFx'), v('lgPalette')];
        t.value = 'glassmorphic'; t.dispatchEvent(new Event('change')); return was.concat(v('auBg'), v('lgHoverFx'), v('lgPalette')); })()`);
    ok("Aurora's Background rows are hidden under Liquid and show on switching; Hover Effects stays (shared); Liquid's hide", rows.join() === 'false,true,true,true,true,false', rows);
    ok('the old Neumorphic Depth / Fluid Gradients toggles are gone', await ev("!document.querySelector('[data-pref=neumorphicDepth],[data-pref=fluidGradients]')"));
    await ev("document.querySelector('.lg-optics>summary').click(); 1"); await sleep(300); await zoom('lg-settings-open', '.settings-modal', 8);
    for (const sc of ['dark', 'light']) {
        await scheme(sc); await go(TL, { auBg: 'image', auBgUrl: 'https://github.com/script-handler/Custom-Scripts/blob/main/glass-theme-bg/violet-glass.png?raw=true' }); await until("!!document.querySelector('.atc-time')");
        ok(`Aurora (${sc}): its own image (a github.com page link) sits behind frosted CSS glass, no refraction engine`, await until("/violet-glass\\.png|blob:/.test(document.getElementById('atc-lg-bg')?.textContent || '') && !document.getElementById('atc-lg-canvas') && !document.documentElement.classList.contains('lg-gl')", 8000));
        await sleep(800); await shot('tl-aurora-image-' + sc);
    }
    for (const th of ['glassmorphic', 'liquid']) {
        await go(BASE + '#/time-absence/attendence-record', { displayTheme: th, lgBg: 'mesh' }); await until("!!document.querySelector('.side-nav-tab')"); await sleep(600);
        ok(`${th}: the side nav stays position:fixed (EGP's), so the page isn't pushed down`, await ev("getComputedStyle(document.querySelector('#global-portal .side-nav-tab')).position === 'fixed'"));
    }
    await scheme('dark');
    // PERF=1: main-thread cost per second on Timeline at 4× CPU throttle while a real mouse crosses the cards (hover, spotlight) and
    // the page scrolls, then 2 s with no input: Aurora, Liquid in CSS, Liquid with the engine bending an image.
    if (process.env.PERF) {
        await send('Performance.enable');
        const metrics = async () => Object.fromEntries((await send('Performance.getMetrics')).result.metrics.map(m => [m.name, m.value]));
        const cost = (a, b) => { const s = b.Timestamp - a.Timestamp, f = k => ((b[k] - a[k]) / s * 1000).toFixed(0).padStart(4); return `script ${f('ScriptDuration')} · style ${f('RecalcStyleDuration')} · layout ${f('LayoutDuration')} · all tasks ${f('TaskDuration')} ms/s`; };
        const LQ = { displayTheme: 'liquid', lgBg: 'mesh' };
        for (const [label, prefs] of [['Aurora          ', {}], ['Liquid, CSS     ', LQ], ['Liquid, no hover', { ...LQ, lgHoverFx: false }], ['Liquid + engine ', { ...LQ, lgBg: 'image', lgBgUrl: 'idb:1' }]]) {
            await go(TL, prefs); await until("!!document.querySelector('.atc-time')"); await sleep(1500); await send('Emulation.setCPUThrottlingRate', { rate: 4 });
            let a = await metrics();
            for (let i = 0; i < 60; i++) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 120 + (i * 53) % 1200, y: 120 + (i * 31) % 520 }); if (i % 15 === 14) await ev('scrollBy(0, 40); 1'); await sleep(40); }
            let b = await metrics(); console.log(`  · ${label} moving: ${cost(a, b)}`);
            await sleep(700); a = await metrics(); await sleep(2000); b = await metrics(); console.log(`  · ${label} idle:   ${cost(a, b)}`);
            await send('Emulation.setCPUThrottlingRate', { rate: 1 });
        }
    }
    await scheme('light');
    console.log('\n── Early coming modal (EGP: static, no close) and a locked page');
    await go(TL); await until("!!document.querySelector('.atc-chip')"); await sleep(400);
    await ev(`(() => { document.body.insertAdjacentHTML('beforeend', '<div class="modal fade show" id="early-coming-modal" style="display:block" data-bs-backdrop="static" data-bs-keyboard="false"><div class="modal-dialog"><div class="modal-content"><div class="modal-header"><div class="section-heading"><h2 class="pull-left">EARLY COMING</h2><div class="clearfix"></div></div></div><div class="modal-body"><textarea></textarea></div><div class="modal-footer"><button class="btn btn-info" id="ec-save">Save</button></div></div></div></div><div class="modal-backdrop fade show"></div>');
        document.body.classList.add('modal-open'); window.__saves = 0; document.getElementById('ec-save').addEventListener('click', () => window.__saves++); return 1; })()`);
    ok('early coming: the shell adds a close to the modal header', await until("!!document.querySelector('#early-coming-modal .modal-header .atc-ec-x')", 3000));
    await ev("document.querySelector('#early-coming-modal .atc-ec-x').click(); 1"); await sleep(300);
    ok('…which hides it without saving, and the page unlocks (backdrop, modal-open) two ticks on', await ev("(() => { const m = document.getElementById('early-coming-modal'); return getComputedStyle(m).display === 'none' && window.__saves === 0; })()")
        && await until("!document.querySelector('.modal-backdrop') && !document.body.classList.contains('modal-open')", 4000));
    await ev("(() => { const m = document.getElementById('early-coming-modal'); m.classList.add('show'); m.style.display = 'block'; document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return 1; })()"); await sleep(200);
    ok('early coming: Escape closes it too', await ev("getComputedStyle(document.getElementById('early-coming-modal')).display === 'none'"));
    await ev("(() => { const m = document.getElementById('early-coming-modal'); m.classList.add('show'); m.style.display = 'block'; return 1; })()"); await sleep(300);
    ok('early coming: closed for the day, EGP reopening it (as on a reload) is closed again at once and never painted', await ev("localStorage.getItem('atcEcClosed') === new Date().toDateString() && document.documentElement.hasAttribute('data-atc-ecd') && getComputedStyle(document.getElementById('early-coming-modal')).display === 'none'"));
    await ev("localStorage.removeItem('atcEcClosed'); 1");
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }] }); await sleep(300);
    ok('reduced motion (Windows animation effects off): the waves still move', await ev("(() => { const w = document.querySelector('.atc-time .atc-r.is-wavy .atc-r-wv'), a = w && getComputedStyle(w.querySelector('svg')); return !!w && getComputedStyle(w).display !== 'none' && a.animationPlayState === 'running' && a.animationName !== 'none'; })()"));
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await ev(`(() => { document.body.insertAdjacentHTML('beforeend', '<div class="modal fade in" id="bs3-x" style="display:block"></div><div class="modal-backdrop fade in"></div>'); document.body.classList.add('modal-open'); return 1; })()`); await sleep(3200);
    ok('a backdrop is left alone while another modal is open (Bootstrap 3 .in)', await ev("!!document.querySelector('.modal-backdrop') && document.body.classList.contains('modal-open')"));
    await ev("document.getElementById('bs3-x').remove(); 1");
    ok('…and once that modal is gone by hand (as users delete it in DevTools), the page unlocks', await until("!document.querySelector('.modal-backdrop') && !document.body.classList.contains('modal-open')", 4000));
    console.log('\n── Checked out');
    api.checkout = '5:00 PM'; await scheme('light'); await go(TL);
    await until("!!document.querySelector('.atc-time')"); await sleep(1300); s = await state();
    const a1 = s.act; await sleep(1500); s = await state();
    ok('checked out: Actual stops ticking, ring flat, "Checked out · 5:00 PM"', s.st === 'st-out' && !s.wavy && s.act === a1 && /5:00 PM/.test(await ev("document.querySelector('.atc-time [data-k=head]').textContent")), { a1, s });
    await zoom('time-out', '.atc-time');
    ok('time API called, shell fetched', hits.api > 0 && hits.shell > 0, hits);
    ok('no page exceptions', !errors.length, errors);

    console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed · PNGs in ${OUT}`);
    clearTimeout(bail); await send('Browser.close').catch(() => {}); ws.close(); await sleep(800); process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(2); });
