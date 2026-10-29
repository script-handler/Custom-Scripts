// ATCShell.js on a stand-in portal: the REAL userscript + the REAL EGP stylesheets (bootstrap 5.0.2, style.css,
// EnhancedStyle.css from the Global Portal repo), the portal URL, the time API and the shell's GitHub URL intercepted.
// Checks the SPA boot, chip, Timeline strip, portal theme per widget theme and scheme, Material You; PNGs of each state.
//
//   "C:/Program Files/nodejs/node.exe" shell-dev/host-run.js [outDir]
const { spawn } = require('child_process');
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
    + box('Hassan Nasir', `<app-personal-info-widget><div>Senior Software Engineer</div><div class="time-check d-flex justify-content-between mt-2"><span class="fs-sm fw-bold">Last Check In: 1:55 PM</span><span class="fs-sm fw-bold">Last Check Out: -</span></div>`
        + `<div class="time-check d-flex justify-content-between mt-2"><span class="fs-sm fw-bold">Actual Time: 6:20:25</span><span class="fs-sm fw-bold">Active Time: 6:17:25</span></div></app-personal-info-widget>`)
    + box('Performance', `<div class="d-flex gap-2 my-2"><button class="nav-link active">Performance</button><button class="nav-link">Disciplinary Status</button></div><svg width="60" height="60" class="circular-progress"><circle class="progress" cx="30" cy="30" r="24" fill="none" stroke="#ebebeb" stroke-width="5"/><text x="30" y="34" text-anchor="middle">81%</text></svg>`)
    + box('Stock Price', '<p>CCLD:$1.77</p><ul><li>CareCloud to Announce Third Quarter 2026 Results</li></ul>', 'news-widget') + '</div></div></section>';
const ATTV = `<div class="row"><div class="col-2"><div class="side-nav-tab"><ul><li><a>Leave Record</a></li><li><a>Attendance Record</a></li></ul></div></div><div class="col-10">`
    + `<section class="body_content" id="attendence-record-tab"><div class="attendance-details-wrapper p-3"><div class="attendence-inner"><h6>Attendance</h6><div class="d-flex gap-2 mb-3"><input class="form-control w-25" value="16117 : HASSAN NASIR"><select class="form-select w-25"><option>Month to Date</option></select><button class="gp-btn gp-btn-primary btn">Submit</button></div>`
    + `<div class="attendence-outer d-flex gap-2 mb-3">${['Last Check-In|07:59 AM', 'Last Check-Out|05:29 PM', 'Total Hours|7'].map(s => `<div class="attendence-box bgAttendancebox"><div class="attendence-box-inner text-center"><small>${s.split('|')[0]}</small><br><strong>${s.split('|')[1]}</strong></div></div>`).join('')}</div>`
    + `<div class="emp-list-table"><div class="table-responsive table-theme main-attendance-table"><table class="table table-striped"><thead class="sticky-top"><tr><th>Sr #</th><th>Date</th><th>Day</th><th>Time</th><th>Check In/Out</th><th>Actual hour(s)</th></tr></thead><tbody id="rows"></tbody></table></div></div></div></div></section></div></div>`;

function page() {
    const script = fs.readFileSync(path.join(ROOT, 'AttendanceTimeCheckerPlus.js'), 'utf8');
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
    if (att) document.getElementById('rows').innerHTML = '<tr class="bg-success"><td colspan="6">Alternate Saturday - Approved</td></tr>' + row(1, at(300), 'In') + row(2, at(150), 'Out') + row(3, at(140), 'In'); }
addEventListener('hashchange', render); render();</script>
<script>${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
}

async function main() {
    fs.mkdirSync(OUT, { recursive: true });
    const port = 9500 + Math.floor(Math.random() * 200);
    const proc = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + port, '--user-data-dir=' + fs.mkdtempSync(path.join(os.tmpdir(), 'shell-host-')), '--no-first-run', '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' });
    const bail = setTimeout(() => { console.log('✗ TIMEOUT'); try { proc.kill(); } catch (_) {} process.exit(2); }, 180000);
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
    const go = async (url, prefs) => { await send('Page.navigate', { url: BASE }); await sleep(300);
        await ev(`localStorage.setItem('attendancePrefs', ${JSON.stringify(JSON.stringify(prefs || {}))}); sessionStorage.removeItem('attSnap'); 1`);
        // A fresh query each time: BASE → BASE#/… alone is a same-document hash change, no reload.
        await send('Page.navigate', { url: url.replace('#', '?n=' + (++nav) + '#') }); await sleep(300); await until("document.readyState === 'complete'"); };
    let pass = 0, fail = 0, nav = 0;
    const ok = (n, c, d) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (d !== undefined ? ' — ' + JSON.stringify(d) : '')); } };
    const state = () => ev(`(() => { const H = document.documentElement, g = document.querySelector('.atc-strip .atc-g');
        return { skin: H.dataset.attSkin || '', theme: H.dataset.atcTheme || '', chip: !!document.querySelector('.gp-main-navbar .header-icons > .atc-chip:first-child'), strip: !!document.querySelector('app-personal-info-widget .atc-strip'),
            hostHidden: [...document.querySelectorAll('app-personal-info-widget .time-check')].filter(r => /Actual Time/.test(r.textContent)).every(r => getComputedStyle(r).display === 'none'),
            ga: g && g.style.getPropertyValue('--ga'), gb: g && g.style.getPropertyValue('--gb'), live: !!(g && g.classList.contains('is-live')), act: document.querySelector('.atc-strip [data-k=act]')?.textContent,
            panel: !!document.getElementById('total-time-summary'), mat: !!document.querySelector('#total-time-summary.mat-theme'), mg: !!document.querySelector('#total-time-summary .ws-time-top .atc-g'),
            bodyBg: getComputedStyle(document.body).backgroundColor, boxBg: getComputedStyle(document.querySelector('.box-widget, .attendence-box') || document.body).backgroundColor }; })()`);

    console.log('\n── Timeline, Glassmorphic (default prefs)');
    for (const sc of ['dark', 'light']) {
        await scheme(sc); await go(TL);
        ok(`${sc}: chip and strip mount`, await until("!!document.querySelector('.atc-chip') && !!document.querySelector('.atc-strip')"));
        await sleep(400); const s = await state();
        ok(`${sc}: portal skin follows the browser (${s.skin})`, s.skin === sc && s.theme === 'glassmorphic', s);
        ok(`${sc}: chip first in header-icons, host Actual/Active row hidden`, s.chip && s.hostHidden, s);
        ok(`${sc}: strip reads the API ("4.5" → 4:50 + ticks), rings set, cogs live`, /^4:5\d:\d\d$/.test(s.act) && +s.ga > 0.5 && +s.gb > 0.7 && s.live, s);
        await shot('tl-glass-' + sc);
        for (const [n, q] of [['chip', '.atc-chip'], ['strip', '.atc-strip']]) { const b = await ev("(() => { const r = document.querySelector('" + q + "').getBoundingClientRect(); return { x: r.left - 12, y: r.top - 12, width: r.width + 40, height: r.height + 28 }; })()");
            const r = await send('Page.captureScreenshot', { format: 'png', clip: { ...b, scale: 4 } }); fs.writeFileSync(path.join(OUT, 'zoom-' + n + '-' + sc + '.png'), Buffer.from(r.result.data, 'base64')); }
    }
    console.log('\n── SPA: Timeline → Attendance (used to need a reload)');
    await ev("location.hash = '#/time-absence/attendence-record'; 1");
    ok('full widget boots after in-app navigation', await until("!!document.getElementById('total-time-summary')"));
    await sleep(1200); let s = await state();
    ok('chip leaves on Attendance; skin stays', !s.chip && s.skin === 'light', s);
    await shot('att-glass-light');
    ok('settings modal has no separate portal rows', await ev("(() => { document.querySelector('#total-time-summary .settings-button')?.click(); const m = document.querySelector('.settings-modal'); const r = !!m && !m.innerHTML.includes('portalSkin') && !m.innerHTML.includes('portalChip') && m.innerHTML.includes('Material You'); document.querySelector('.settings-modal-overlay, .settings-overlay')?.click(); return r; })()"));

    for (const [th, nm] of [['material', 'mat'], ['business', 'biz'], ['retro-futuristic', 'cyber']]) {
        console.log(`\n── ${th}`);
        for (const sc of ['light', 'dark']) {
            await scheme(sc); await go(TL, { displayTheme: th });
            await until("!!document.querySelector('.atc-strip')"); await sleep(400); s = await state();
            ok(`${sc} Timeline: theme ${th}, skin ${th === 'retro-futuristic' ? 'dark (always)' : sc}`, s.theme === th && s.skin === (th === 'retro-futuristic' ? 'dark' : sc), s);
            await shot(`tl-${nm}-${sc}`);
            await ev("location.hash = '#/time-absence/attendence-record'; 1");
            await until("!!document.getElementById('total-time-summary')"); await sleep(1200); s = await state();
            if (th === 'material') ok(`${sc} Attendance: Material panel + cog gauge in the time card`, s.mat && s.mg, s);
            if (sc === 'dark') ok('dark: host table text is the theme text, not #555', await ev("getComputedStyle(document.querySelector('#rows tr:nth-child(3) td:nth-child(2)')).color !== 'rgb(85, 85, 85)'"));
            await shot(`att-${nm}-${sc}`);
        }
    }
    console.log('\n── Checked out');
    api.checkout = '5:00 PM'; await scheme('light'); await go(TL);
    await until("!!document.querySelector('.atc-strip')"); await sleep(1300); s = await state();
    const a1 = s.act; await sleep(1500); s = await state();
    ok('cogs stop and Actual stops ticking after check-out (host keeps ticking)', !s.live && s.act === a1, { a1, s });
    ok('time API called, shell fetched', hits.api > 0 && hits.shell > 0, hits);
    ok('no page exceptions', !errors.length, errors);

    console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed · PNGs in ${OUT}`);
    clearTimeout(bail); await send('Browser.close').catch(() => {}); ws.close(); process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(2); });
