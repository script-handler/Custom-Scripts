// Runs the REAL userscript in Chrome and plays AimLab inside the actual widget: every scenario
// group, both cameras, the sheets, Max and the three themes, with PNGs of each state.
//
//   "C:/Program Files/nodejs/node.exe" aim-dev/host-run.js [outDir]
//
// Same stand-in portal as pool-dev/host-run.js (the portal URL is intercepted, everything else
// fails at once). A test-only probe is appended inside the script's closure to read AimLab's state.
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const OUT = path.resolve(process.argv.slice(2).find(a => !a.startsWith('--')) || path.join(os.tmpdir(), 'aim-host-run'));
const PORTAL = 'https://globalportal.mtbc.com/#/time-absence/attendence-record';
const CHROME = require('../pool-dev/browser').browserPath();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SECRET = '5eed'.repeat(16), TAG = crypto.createHash('sha256').update(SECRET).digest('hex').slice(0, 32);
const registry = () => JSON.stringify({ files: { 'attendance_widget_registry.json': { content: JSON.stringify({ lastUpdated: new Date().toISOString(), players: [], gamesUnlock: { n: 1, tags: { [TAG]: { at: new Date().toISOString(), n: 0 } }, grants: {} } }) } } });

function page() {
    let script = fs.readFileSync(path.join(ROOT, 'AttendanceTimeCheckerPlus.js'), 'utf8');
    const end = script.lastIndexOf('})();');
    const probe = `
    window.__aim = { S: aimS, AIM_SCEN, aimDist, aimAddTarget, aimCamp, aimOv, collectGameModeBests, setBoard(a) { leaderboardData = a; }, get xp() { return userXP; }, get currentGame() { return currentGame; }, get prefs() { return userPreferences; }, applyPreferences };
`;
    script = script.slice(0, end) + probe + script.slice(end);
    return `<!doctype html><html><head><meta charset="utf-8"><title>Attendance</title></head>
<style>body { margin: 0; background: #1b1d2a; } @media (prefers-color-scheme: light) { body { background: #eef1f6; } }</style>
<body><div class="main-attendance-table"><table><tbody id="rows"></tbody></table></div>
<script>(function () { const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
const d = String(now.getMonth() + 1).padStart(2, '0') + '/' + String(now.getDate()).padStart(2, '0') + '/' + now.getFullYear();
document.getElementById('rows').innerHTML = '<tr><td>1</td><td>' + d + '</td><td>Mon</td><td>09:00:00</td><td>In</td></tr>'; })();
window.$ = sel => ({ before: el => { const t = document.querySelector(sel); if (t) t.parentNode.insertBefore(el, t); } });</script>
<script>localStorage.setItem("atc_games_secret", "${SECRET}"); localStorage.setItem("atc_games_ok", String(Date.now() + 864e5));</script>
<script>${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
}

// Headless Chrome on the stand-in portal, the real userscript loaded: { send, ev, errors, proc, ws, bail }.
// perf-check.js boots through this too; gpu: true keeps the GPU (real compositing and canvas).
async function boot(opts) {
    const port = 9700 + Math.floor(Math.random() * 200), gpu = opts && opts.gpu;
    const proc = spawn(CHROME, ['--headless=new', gpu ? '--enable-gpu-rasterization' : '--disable-gpu', '--remote-debugging-port=' + port, '--user-data-dir=' + fs.mkdtempSync(path.join(os.tmpdir(), 'aim-host-')),
        '--no-first-run', '--no-default-browser-check', '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' });
    const bail = setTimeout(() => { console.log('✗ TIMEOUT'); try { proc.kill(); } catch (_) {} process.exit(2); }, 300000);
    let target;
    for (let i = 0; i < 80 && !target; i++) { await sleep(200); try { target = (await (await fetch('http://127.0.0.1:' + port + '/json/list')).json()).find(t => t.type === 'page'); } catch (_) {} }
    if (!target) { console.log('✗ Chrome did not start'); process.exit(2); }
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(r => ws.addEventListener('open', r));
    let id = 0;
    const pending = {}, errors = [], html = page();
    const send = (method, params) => new Promise(r => { const n = ++id; pending[n] = r; ws.send(JSON.stringify({ id: n, method, params })); });
    ws.addEventListener('message', e => {
        const m = JSON.parse(e.data);
        if (m.id && pending[m.id]) { pending[m.id](m); delete pending[m.id]; return; }
        if (m.method === 'Fetch.requestPaused') {
            const u = m.params.request.url, rid = m.params.requestId;
            if (u.startsWith('https://globalportal.mtbc.com/')) send('Fetch.fulfillRequest', { requestId: rid, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }], body: Buffer.from(html).toString('base64') });
            else if (u.startsWith('https://api.github.com/gists/')) {
                const cors = [{ name: 'Access-Control-Allow-Origin', value: 'https://globalportal.mtbc.com' }, { name: 'Access-Control-Allow-Headers', value: 'Authorization, Accept' }, { name: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' }];
                if (m.params.request.method === 'OPTIONS') send('Fetch.fulfillRequest', { requestId: rid, responseCode: 204, responseHeaders: cors });
                else send('Fetch.fulfillRequest', { requestId: rid, responseCode: 200, responseHeaders: cors.concat([{ name: 'Content-Type', value: 'application/json' }]), body: Buffer.from(registry()).toString('base64') });
            } else send('Fetch.failRequest', { requestId: rid, errorReason: 'BlockedByClient' });
        }
        if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    });
    await send('Runtime.enable'); await send('Page.enable');
    await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
    await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
    await send('Page.navigate', { url: PORTAL });
    const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); if (r.result && r.result.exceptionDetails) throw new Error(x.slice(0, 90) + ': ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text)); return r.result?.result?.value; };
    return { send, ev, errors, proc, ws, bail };
}

async function main() {
    fs.mkdirSync(OUT, { recursive: true });
    const { send, ev, errors, proc, ws, bail } = await boot();
    let pass = 0, fail = 0;
    const ok = (n, c, d) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (d !== undefined ? ' — ' + JSON.stringify(d) : '')); } };
    const head = t => console.log('\n── ' + t);
    const mouse = (type, x, y, b) => send('Input.dispatchMouseEvent', { type, x, y, button: b ? 'left' : 'none', buttons: b ? 1 : 0, clickCount: 1 });
    const clickAt = async (x, y) => { await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y, 1); await mouse('mouseReleased', x, y, 1); };
    const rect = sel => ev('(() => { const e = document.querySelector(' + JSON.stringify(sel) + '); if (!e || !e.getClientRects().length) return null; const b = e.getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; })()');
    const click = async sel => { await ev('(() => { const e = document.querySelector(' + JSON.stringify(sel) + '); if (e && e.closest(".aim-sheet-b")) e.scrollIntoView({ block: "center" }); })()'); const r = await rect(sel); if (!r) return false; await clickAt(r[0] + r[2] / 2, r[1] + r[3] / 2); await sleep(150); return true; };
    const shot = async (name, sel) => { const r = await rect(sel); if (!r) { console.log('  · no ' + sel + ' for ' + name); return; } const p = await send('Page.captureScreenshot', { format: 'png', clip: { x: Math.max(0, r[0] - 4), y: Math.max(0, r[1] - 4), width: r[2] + 8, height: r[3] + 8, scale: 1 } }); fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(p.result.data, 'base64')); };
    const waitFor = async (x, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 8000)) { if (await ev(x)) return true; await sleep(80); } return false; };
    // The game clock is frame time capped at 50 ms a frame, so a slow headless browser stretches
    // the 3 s countdown: waits on it allow 9 s.
    // Viewport-local → page px.
    const vpPt = async (x, y) => { const r = await ev('(() => { const S = window.__aim.S, b = S.vp.getBoundingClientRect(); return [b.left, b.top, b.width / S.W]; })()'); return [r[0] + x * r[2], r[1] + y * r[2]]; };
    const overlap = () => ev('(() => { const S = window.__aim.S, r = S.run; if (!r) return 0; let n = 0; for (let i = 0; i < r.tg.length; i++) for (let j = i + 1; j < r.tg.length; j++) if (window.__aim.aimDist(r.sp, r.tg[i], r.tg[j]) < r.tg[i].r + r.tg[j].r) n++; return n; })()');

    head('boot');
    ok('the widget renders', await waitFor("!!document.getElementById('aim-root') && typeof window.switchGame === 'function'", 20000));
    await ev("window.switchGame('aim')");
    ok('AimLab opens', await waitFor("!!document.querySelector('#aim-root .aim-hud') && window.__aim.currentGame === 'aim'"));
    ok('8 game buttons, no RefleX tab', await ev("document.querySelectorAll('.game-switcher .game-switch-btn').length === 8 && !document.getElementById('game-switch-reflex')"));
    ok('the title reads AimLab', (await ev("document.getElementById('game-title').textContent")).includes('AimLab'));
    await sleep(400);
    const lay = await ev("(() => { const h = document.querySelector('.aim-hud').getBoundingClientRect(), v = document.querySelector('.aim-vp').getBoundingClientRect(), f = document.querySelector('.aim-foot').getBoundingClientRect(); return { hw: h.width, hh: h.height, vw: v.width, vh: v.height, fh: f.height }; })()");
    ok('the viewport keeps the design\'s 368:438', Math.abs(lay.vw / lay.vh - 368 / 438) < 0.02, lay);
    ok('footer is 44 px', Math.abs(lay.fh - 44) < 1, lay.fh);
    await shot('A1-idle', '.snake-game-container');

    head('Chaos 2D');
    await click('.aim-playbig');
    ok('countdown', await waitFor("window.__aim.S.phase === 'count'", 2000));
    await sleep(900); await shot('A2-countdown', '.snake-game-container');
    ok('the run starts after 3-2-1', await waitFor("window.__aim.S.phase === 'run' && window.__aim.S.run.tg.length === 3", 9000),
        await ev("(() => { const S = window.__aim.S; return { phase: S.phase, count: S.count, mode: S.st.mode, tg: S.run && S.run.tg.length, W: S.W, H: S.H, on: S.on }; })()"));
    const run2 = await ev("(() => { const h = document.querySelector('.aim-hud'), v = document.querySelector('.aim-vp').getBoundingClientRect(); return { foot: getComputedStyle(document.querySelector('.aim-foot')).display, vh: v.height, btns: getComputedStyle(document.querySelector('.aim-vbtns')).display }; })()");
    ok('during a run the footer goes and the viewport grows', run2.foot === 'none' && run2.vh > lay.vh + 40, run2);
    ok('Pause and Max sit in the viewport', run2.btns === 'flex');
    let maxOverlap = 0;
    for (let i = 0; i < 24; i++) {
        const t = await ev("(() => { const t = window.__aim.S.run.tg[0]; return t ? [t.x, t.y] : null; })()");
        if (!t) break;
        const p = await vpPt(t[0], t[1]);
        await clickAt(p[0], p[1]);
        if (i % 6 === 5) { const p2 = await vpPt(6, 300); await clickAt(p2[0], p2[1]); }
        maxOverlap = Math.max(maxOverlap, await overlap());
        await sleep(60);
    }
    const st = await ev("(() => { const r = window.__aim.S.run; return { hits: r.hits, shots: r.shots, score: r.score }; })()");
    ok('clicks on targets hit', st.hits >= 20, st);
    ok('Chaos score is hits × 10', st.score === st.hits * 10, st);
    ok('no two targets ever overlapped', maxOverlap === 0);
    // Live numbers are CSS counters (aimSet): rebuild what each tile shows from them.
    const tile = await ev(`Array.from(document.querySelectorAll('.aim-tile')).map(t => Array.from(t.querySelectorAll('.l, .v > *')).map(e => {
        if (!e.classList.contains('aim-cnt')) return e.textContent;
        const p = k => e.style.getPropertyValue(k).trim();
        return p('--a') + (e.classList.contains('is-k') ? ',' + p('--b').padStart(3, '0') : '') + (e.classList.contains('is-d') ? '.' + p('--c') : '');
    }).join(''))`);
    ok('the tiles show the run', tile[1].includes(String(st.score)) && /ACCURACY\d+%/.test(tile[2]), tile);
    { const t = await ev("(() => { const t = window.__aim.S.run.tg[1]; return [t.x, t.y]; })()"); const p = await vpPt(t[0] + 60, t[1]); await mouse('mouseMoved', p[0], p[1]); }
    await sleep(120); await shot('A3-play-2d', '.snake-game-container');
    await ev("(() => { const r = window.__aim.S.run; r.el = r.len - 200; })()");
    ok('the run ends in results', await waitFor("window.__aim.S.phase === 'ares'", 3000));
    await sleep(300); await shot('A10-results', '.snake-game-container');
    const saved = await ev("({ ls: JSON.parse(localStorage.getItem('aimLab')), hi: +localStorage.getItem('aimChaosHighScore'), res: window.__aim.S.res })");
    ok('the ranked best lands in aimChaosHighScore', saved.hi === saved.res.score && saved.res.ranked, { hi: saved.hi, score: saved.res.score });
    ok('XP is shown on the results', saved.res.xp > 0, saved.res.xp);

    head('Pause');
    await click('[data-act="again"]');
    await waitFor("window.__aim.S.phase === 'run'", 9000);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    ok('Esc pauses', await waitFor("window.__aim.S.phase === 'paused'", 1000));
    await shot('A6-paused', '.snake-game-container');
    await click('[data-act="quit"]');
    ok('Quit returns to idle', await waitFor("window.__aim.S.phase === 'idle'", 1000));

    head('sheets');
    for (const s of ['scenarios', 'crosshair', 'settings', 'records']) {
        await click('.aim-chip');
        if (s !== 'scenarios') await ev("(() => { const b = document.createElement('button'); b.setAttribute('data-act', 'sheet:" + s + "'); document.querySelector('.aim-hud').appendChild(b); b.click(); b.remove(); })()");
        await sleep(250);
        ok(s + ' sheet opens', await ev("document.querySelector('.aim-sheet.is-" + s + "') !== null"));
        await shot('S-' + s, '.snake-game-container');
        if (s === 'crosshair') {
            // A crosshair code pasted in applies.
            await ev("(() => { const f = document.querySelector('.aim-code'); f.value = 'AL1-OFF4FD8-9-3-2-1-0-80-0'; f.dispatchEvent(new Event('change', { bubbles: true })); })()");
            ok('a pasted crosshair code applies', await ev("window.__aim.S.st.xh.xs === 'circle' && window.__aim.S.st.xh.color === '#FF4FD8'"));
            await ev("(() => { const S = window.__aim.S; S.st.xh = Object.assign({}, S.st.xh, { xs: 'crossdot', color: '#4CF0B0' }); })()");
        }
    }
    await click('.aim-sheet-h [data-act="sheet:"]');

    head('Reaction · Screen');
    await click('.aim-chip'); await sleep(200);
    await click('[data-act="scen:screen"]');
    ok('Screen is selected, the camera toggle disabled', await ev("window.__aim.S.st.scen === 'screen' && document.querySelector('.aim-seg').classList.contains('is-off')"));
    ok('one board button in the header', await ev("!document.getElementById('reflex-lb-btn') && getComputedStyle(document.getElementById('aim-lb-btn')).display !== 'none'"));
    await click('#aim-lb-btn'); await sleep(300);
    const tabs = await ev("Array.from(document.querySelectorAll('#game-lb-overlay .game-lb-tabs .game-lb-tab')).map(t => [t.textContent.replace(/[^A-Za-z]/g, ''), t.classList.contains('is-active')])");
    ok('the board has the six ranked tabs, open on Screen', tabs.map(t => t[0]).join() === 'Chaos,Sprint,Endless,Levels,Screen,Target' && tabs[4][1], tabs);
    await shot('LB-aim-screen', '.snake-game-container');
    await ev("window.closeGameLeaderboard && window.closeGameLeaderboard()");
    await shot('R1-idle', '.snake-game-container');
    await click('.aim-playbig');
    ok('wait state', await waitFor("window.__aim.S.R && window.__aim.S.R.phase === 'wait'", 1000));
    await shot('R2-wait', '.snake-game-container');
    const vc = async () => { const r = await rect('.aim-vp'); return [r[0] + r[2] / 2, r[1] + r[3] / 2]; };
    let c = await vc();
    await clickAt(c[0], c[1]);
    ok('an early click is a false start', await waitFor("window.__aim.S.R.phase === 'soon' && window.__aim.S.R.fs === 1", 800));
    await shot('R5-too-soon', '.snake-game-container');
    for (let r = 0; r < 5; r++) {
        if (!await waitFor("window.__aim.S.R && window.__aim.S.R.phase === 'go' && window.__aim.S.R.goAt > 0", 7000)) break;
        if (r === 0) await shot('R3-go', '.snake-game-container');
        await sleep(40 + r * 20); c = await vc(); await clickAt(c[0], c[1]);
        if (r === 0) { await sleep(60); await shot('R4-round-time', '.snake-game-container'); }
    }
    ok('five rounds lead to results', await waitFor("window.__aim.S.phase === 'rres'", 3000));
    await sleep(250); await shot('R8-results', '.snake-game-container');
    const rx = await ev("({ hs: JSON.parse(localStorage.getItem('reflexHighScores') || '{}'), res: window.__aim.S.res })");
    ok('five times, one false start', rx.res.times.length === 5 && rx.res.fs === 1, rx.res);
    ok('the ranked Screen best lands in reflexHighScores', rx.hs.screen && rx.hs.screen.best === rx.res.best, rx.hs);

    head('Reaction · Target 3D (lock simulated: headless has no pointer lock)');
    await ev("(() => { const S = window.__aim.S; S.st.scen = 'target'; S.st.mode = '3d'; })()");
    await click('[data-act="sheet:"]').catch(() => {});
    await ev("(() => { const b = document.createElement('button'); b.setAttribute('data-act', 'quit'); document.querySelector('.aim-hud').appendChild(b); b.click(); b.remove(); })()");
    await click('.aim-playbig');
    await sleep(200);
    ok('3D without the lock asks for it', await ev("!!document.querySelector('.aim-unlock')"));
    await shot('A5-unlocked', '.snake-game-container');
    await ev("(() => { window.__aim.S.locked = true; window.__aim.S.ovKey = ''; })()");
    ok('the target appears in the room', await waitFor("window.__aim.S.R && window.__aim.S.R.tg", 6000));
    await sleep(120); await shot('R7-target-3d', '.snake-game-container');
    await ev("(() => { const S = window.__aim.S; S.locked = false; })()");
    await ev("(() => { const b = document.createElement('button'); b.setAttribute('data-act', 'quit'); document.querySelector('.aim-hud').appendChild(b); b.click(); b.remove(); })()");

    head('Chaos 3D');
    await ev("(() => { const S = window.__aim.S; S.st.scen = 'chaos'; S.st.mode = '3d'; })()");
    await click('.aim-playbig'); await sleep(100);
    await ev("(() => { window.__aim.S.locked = true; window.__aim.S.ovKey = ''; })()");
    ok('3D Chaos runs', await waitFor("window.__aim.S.phase === 'run' && window.__aim.S.run.tg.length === 3", 9000));
    const t3 = await ev("(() => { const S = window.__aim.S, t = S.run.tg[0]; S.yaw = t.x; S.pitch = t.y; return 1; })()");
    await sleep(50);
    const c3 = await vc(); await clickAt(c3[0], c3[1]);
    ok('a centred shot at a target hits in 3D', await waitFor("window.__aim.S.run.hits === 1", 800));
    await ev("(() => { const S = window.__aim.S; S.yaw = 4; S.pitch = 2; })()");
    await sleep(200); await shot('A4-play-3d', '.snake-game-container');
    ok('no overlap in 3D', (await overlap()) === 0);

    head('Max');
    await ev("(() => { const b = document.createElement('button'); b.setAttribute('data-act', 'max'); document.querySelector('.aim-hud').appendChild(b); b.click(); b.remove(); })()");
    await sleep(500);
    ok('Max opens with the HUD inside', await ev("!!document.querySelector('.aim-max-frame .aim-hud.is-max')"));
    await ev("(() => { const S = window.__aim.S; if (S.phase === 'paused') { S.prev = 'run'; S.phase = 'run'; } S.locked = true; S.ovKey = ''; })()");
    await sleep(300); await shot('F1-max-3d', '.aim-max-frame');
    await ev("(() => { const S = window.__aim.S; S.locked = false; })()");
    await ev("(() => { const b = document.querySelector('.aim-maxb'); b.click(); })()");
    await sleep(400);
    ok('Max closes and the HUD returns to the panel', await ev("!document.querySelector('.aim-max-frame') && !!document.querySelector('#aim-root .aim-hud:not(.is-max)')"));

    head('ranked modes (M1–M15)');
    const act = a => ev("(() => { const b = document.createElement('button'); b.setAttribute('data-act', " + JSON.stringify(a) + "); document.querySelector('.aim-hud').appendChild(b); b.click(); b.remove(); })()");
    const scen = async (id, m) => { await act('quit'); await ev("(() => { const S = window.__aim.S; S.st.scen = '" + id + "'; S.st.mode = '" + (m || '2d') + "'; S.st.diff = 'normal'; S.hudKey = ''; S.ovKey = ''; })()"); await act('quit'); };
    const shootTarget = async kind => { const t = await ev("(() => { const t = window.__aim.S.run.tg.find(q => " + (kind ? "q.kind === '" + kind + "'" : '!q.kind') + "); return t ? [t.x, t.y] : null; })()"); if (!t) return false; const p = await vpPt(t[0], t[1]); await clickAt(p[0], p[1]); await sleep(40); return true; };
    await click('.aim-chip'); await sleep(250);
    ok('the scenario sheet groups Ranked, Practice and Reaction', await ev("document.querySelectorAll('.aim-sheet .aim-scard').length === 4 && document.querySelectorAll('.aim-sheet .aim-pcard').length === 3 && document.querySelectorAll('.aim-sheet .aim-rcard').length === 2 && document.querySelectorAll('.aim-sheet .aim-scard .aim-medal').length === 4"));
    await shot('M1-scenarios', '.snake-game-container');
    await act('sheet:');

    await scen('sprint');
    await click('.aim-playbig');
    ok('Sprint runs', await waitFor("window.__aim.S.phase === 'run' && window.__aim.S.run.id === 'sprint' && window.__aim.S.run.tg.length === 3", 9000));
    for (let i = 0; i < 8; i++) await shootTarget();
    { const p = await vpPt(8, 400); await clickAt(p[0], p[1]); }
    ok('a miss adds 0.5 s', await ev("window.__aim.S.run.pen === 500"));
    ok('the TIME tile counts up in hundredths', await ev("(() => { const b = document.querySelector('.aim-tile b'); return b.classList.contains('is-d2') && b.classList.contains('aim-cnt'); })()"));
    await sleep(80); await shot('M2-sprint', '.snake-game-container');
    await ev("window.__aim.S.run.hits = 49");
    await shootTarget();
    ok('the 50th hit ends Sprint in a breakdown', await waitFor("window.__aim.S.phase === 'ares' && !!document.querySelector('.aim-brk')", 2000));
    await sleep(700); await shot('M3a-sprint-counting', '.snake-game-container');
    ok('the lines land one by one', await ev("document.querySelectorAll('.aim-lines > .is-in').length >= 1 && !document.querySelector('.aim-brk.is-done')"));
    await waitFor("window.__aim.S.res.shown", 4000); await sleep(200);
    await shot('M3-sprint-results', '.snake-game-container');
    const spr = await ev("(() => { const r = window.__aim.S.res, b = document.querySelector('.aim-brk-total'); return { total: r.total, sum: r.lines.reduce((a, l) => a + l[1], 0), shown: b.style.getPropertyValue('--a') + (b.classList.contains('is-k') ? ',' + b.style.getPropertyValue('--b').padStart(3, '0') : ''), best: JSON.parse(localStorage.getItem('aimLab')).bests['sprint|2d|normal'] }; })()");
    ok('the total is the sum of its lines, shown and saved', spr.total === spr.sum && spr.shown.replace(/^0,/, '') === spr.total.toLocaleString('en-US') && spr.best === spr.total, spr);

    await scen('endless');
    await click('.aim-playbig');
    ok('Endless runs', await waitFor("window.__aim.S.phase === 'run' && window.__aim.S.run.id === 'endless'", 9000));
    for (let i = 0; i < 6; i++) await shootTarget();
    ok('hits add time', await ev("window.__aim.S.run.left > 15000 - window.__aim.S.run.el"));
    await shot('M4-endless', '.snake-game-container');
    await ev("(() => { const S = window.__aim.S, r = S.run, b = window.__aim.aimAddTarget(r, null, Math.random, 'bonus'); return !!b; })()");
    await shootTarget('bonus');
    ok('the bonus takes a hit and opens its window', await ev("(() => { const b = window.__aim.S.run.tg.find(q => q.kind === 'bonus'); return !!b && b.hp === 2 && b.win > 0; })()"));
    { const t = await ev("(() => { const b = window.__aim.S.run.tg.find(q => q.kind === 'bonus'); return [b.x + 30, b.y + 20]; })()"); const p = await vpPt(t[0], t[1]); await mouse('mouseMoved', p[0], p[1]); }
    await sleep(60); await shot('M5-bonus', '.snake-game-container');
    await shootTarget('bonus'); await shootTarget('bonus');
    ok('three hits kill it: Frenzy ×2', await ev("window.__aim.S.run.bonusKills === 1 && window.__aim.S.run.el < window.__aim.S.run.frenzy"));
    await ev("window.__aim.S.run.left = 4200");
    await sleep(150);
    ok('Frenzy: the edge glows, the score tile shows ×2, the clock runs hot', await ev("document.querySelector('.aim-vp').classList.contains('is-frenzy') && document.querySelectorAll('.aim-tile')[1].classList.contains('has-badge') && document.querySelector('.aim-tile').classList.contains('is-alarm')"));
    await shot('M4b-endless-frenzy', '.snake-game-container');
    await ev("window.__aim.S.run.left = 1");
    ok('the clock running out ends Endless', await waitFor("window.__aim.S.phase === 'ares' && window.__aim.S.res.id === 'endless'", 2000));
    await waitFor("window.__aim.S.res.shown", 4000); await sleep(200);
    await shot('M6-endless-over', '.snake-game-container');

    await scen('levels');
    await sleep(200);
    ok('Levels opens on the campaign map', await ev("document.querySelectorAll('.aim-node').length === 10 && !!document.querySelector('.aim-node.is-cur')"));
    await ev("(() => { const S = window.__aim.S, c = window.__aim.aimCamp(S.st, '2d'); Object.assign(c, { stage: 5, score: 24310, skill: 1.08, stars: [3, 3, 2, 3, 3, 0, 0, 0, 0, 0] }); S.ovKey = ''; S.hudKey = ''; window.__aim.aimOv(); })()");
    await sleep(150); await shot('M7-levels-map', '.snake-game-container');
    await click('.aim-node[data-act="stage:3"]');
    ok('a cleared stage opens its card as a replay', await ev("window.__aim.S.phase === 'intro' && window.__aim.S.stageSel === 3 && /REPLAY/.test(document.querySelector('.aim-intro').textContent)"));
    await shot('M8-stage-intro', '.snake-game-container');
    await click('.aim-intro [data-act="play"]');
    ok('Start plays the stage', await waitFor("window.__aim.S.phase === 'run' && window.__aim.S.run.G.name === 'Tracking'", 9000));
    { const t = await ev("(() => { const t = window.__aim.S.run.tg[0]; return [t.x, t.y]; })()"); const p = await vpPt(t[0], t[1]); await mouse('mouseMoved', p[0], p[1]); }
    await sleep(400); await shot('M9-stage-track', '.snake-game-container');
    ok('the GOAL tile shows % on target with the 70% mark', await ev("(() => { const t = document.querySelectorAll('.aim-tile')[1]; return t.classList.contains('has-mark') && /GOAL/.test(t.textContent); })()"));
    await ev("(() => { const r = window.__aim.S.run; r.onMs = r.len * 0.9; r.el = r.len - 1; })()");
    ok('a tracking stage on goal clears with stars', await waitFor("window.__aim.S.phase === 'ares' && window.__aim.S.res.kind === 'stage'", 2000));
    await waitFor("window.__aim.S.res.shown", 4000); await sleep(200);
    await shot('M10-stage-clear', '.snake-game-container');
    ok('a replay keeps the campaign where it was', await ev("window.__aim.aimCamp(window.__aim.S.st, '2d').stage === 5 && window.__aim.aimCamp(window.__aim.S.st, '2d').lives === 3"));
    await act('again');
    ok('Next stage opens the current stage', await ev("window.__aim.S.phase === 'intro' && window.__aim.S.stageSel === 5"));
    await click('.aim-intro [data-act="play"]');
    await waitFor("window.__aim.S.phase === 'run'", 9000);
    for (let i = 0; i < 4; i++) await shootTarget();
    await shot('M9b-stage-hits', '.snake-game-container');
    await ev("(() => { const r = window.__aim.S.run; r.el = r.len - 1; })()");
    ok('time out fails the stage and costs a life', await waitFor("window.__aim.S.phase === 'ares' && window.__aim.S.res.kind === 'fail'", 2000) && await ev("window.__aim.aimCamp(window.__aim.S.st, '2d').lives === 2"));
    await sleep(150); await shot('M11-stage-fail', '.snake-game-container');
    await ev("(() => { const S = window.__aim.S, c = window.__aim.aimCamp(S.st, '2d'); Object.assign(c, { stage: 9, stars: [3, 3, 3, 2, 3, 3, 2, 3, 2, 0], score: 46000 }); })()");
    await act('stage:9'); await click('.aim-intro [data-act="play"]');
    ok('the boss stage: a boss and two minions', await waitFor("window.__aim.S.phase === 'run' && window.__aim.S.run.tg.filter(t => t.kind === 'minion').length === 2 && window.__aim.S.run.tg.some(t => t.kind === 'boss')", 9000));
    await shootTarget('boss');
    ok('the armoured boss deflects', await ev("window.__aim.S.run.tg.find(t => t.kind === 'boss').hp === 12 && window.__aim.S.run.shots === 0"));
    await sleep(60); await shot('M12-boss-armour', '.snake-game-container');
    await shootTarget('minion'); await shootTarget('boss');
    ok('a minion down opens the boss', await ev("(() => { const b = window.__aim.S.run.tg.find(t => t.kind === 'boss'); return b.hp === 11 && !b.armor; })()"));
    await sleep(60); await shot('M12b-boss-vulnerable', '.snake-game-container');
    await ev("(() => { const b = window.__aim.S.run.tg.find(t => t.kind === 'boss'); b.hp = 1; })()");
    await shootTarget('boss');
    ok('beating the boss completes the campaign', await waitFor("window.__aim.S.phase === 'ares' && window.__aim.S.res.kind === 'camp'", 2000));
    await sleep(200); await shot('M13-campaign-complete', '.snake-game-container');
    const lv = await ev("(() => { const b = JSON.parse(localStorage.getItem('aimLab')).bests; return { score: b['levels|2d|normal'], stage: b['levels|2d|normal|stage'] }; })()");
    ok('the campaign best keeps its stage (10) with its score', lv.stage === 10 && lv.score > 46000, lv);
    await click('.aim-bestb'); await sleep(300);
    ok('Records: medals per mode × camera and four achievements', await ev("document.querySelectorAll('.aim-sheet.is-records .aim-mrow:not(.is-head)').length === 6 && document.querySelectorAll('.aim-sheet .aim-ach').length === 4"));
    await shot('M15-records', '.snake-game-container');
    await act('sheet:');
    await ev("window.__aim.setBoard([['Priya N.', 10, 52340], ['Marcus L.', 10, 49880], ['Aiko T.', 9, 41205], ['Dev R.', 8, 36950], ['Sofia M.', 8, 34410]].map(([n, st, v], i) => ({ clientId: 'p' + i, displayName: n, gameBests: { aim: 700 - i * 40 }, gameModeBests: { 'aim:levels': v, 'aim:levelsStage': st, 'aim:sprintFps': 9000 + i * 300, 'reflex:screen': 180 + i * 7 } })))");
    await click('#aim-lb-btn'); await sleep(300);
    const lb = await ev("({ tabs: Array.from(document.querySelectorAll('#game-lb-overlay .game-lb-tabs .game-lb-tab')).map(t => t.textContent.replace(/[^A-Za-z]/g, '')), on: (document.querySelector('#game-lb-overlay .game-lb-tabs .is-active') || {}).textContent, dims: document.querySelectorAll('#game-lb-overlay .game-lb-dims .game-lb-tab').length })");
    ok('the board: six tabs, 2D | 3D, open on Levels', lb.tabs.join() === 'Chaos,Sprint,Endless,Levels,Screen,Target' && /Levels/.test(lb.on) && lb.dims === 2, lb);
    await shot('M14-board-levels', '.snake-game-container');
    await ev("window.setGameLeaderboardMode('screen')");
    ok('Screen disables 2D | 3D', await ev("Array.from(document.querySelectorAll('#game-lb-overlay .game-lb-dims .game-lb-tab')).every(b => b.disabled)"));
    await shot('M14b-board-screen', '.snake-game-container');
    await ev("window.setGameLeaderboardMode('sprint'); window.setGameLeaderboardDim('3d')");
    ok('3D shows the Fps board', await ev("document.querySelector('#game-lb-overlay .game-lb-foot').textContent.startsWith('3D')"));
    await ev("window.closeGameLeaderboard()");
    await act('max'); await sleep(500);
    await shot('M13-max-campaign', '.aim-max-frame');
    await scen('endless');
    await act('play'); await waitFor("window.__aim.S.phase === 'run'", 9000);
    for (let i = 0; i < 3; i++) { const t = await ev("(() => { const t = window.__aim.S.run.tg.find(q => !q.kind); return t ? [t.x, t.y] : null; })()"); const p = await vpPt(t[0], t[1]); await clickAt(p[0], p[1]); await sleep(40); }
    await sleep(80); await shot('M4-max-endless', '.aim-max-frame');
    await act('quit'); await ev("document.querySelector('.aim-maxb').click()"); await sleep(400);

    head('themes');
    await ev("(() => { const b = document.createElement('button'); b.setAttribute('data-act', 'quit'); document.querySelector('.aim-hud').appendChild(b); b.click(); b.remove(); window.__aim.S.st.mode = '2d'; })()");
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
    await sleep(700);
    ok('Aurora light retokens the HUD', (await ev("getComputedStyle(document.querySelector('.aim-hud')).getPropertyValue('--aim-text').trim()")).toUpperCase() === '#0F172A');
    await click('.aim-playbig'); await waitFor("window.__aim.S.phase === 'run'", 9000);
    { const t = await ev("(() => { const t = window.__aim.S.run.tg[0]; return [t.x + 50, t.y]; })()"); const p = await vpPt(t[0], t[1]); await mouse('mouseMoved', p[0], p[1]); }
    await sleep(600); await shot('L1-light-play-2d', '.snake-game-container');
    await scen('levels'); await sleep(300); await shot('L7-light-map', '.snake-game-container');
    await click('.aim-bestb'); await sleep(300); await shot('L15-light-records', '.snake-game-container'); await act('sheet:');
    await scen('chaos'); await click('.aim-playbig'); await waitFor("window.__aim.S.phase === 'run'", 9000);
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
    await ev("(() => { const p = window.__aim.prefs; p.displayTheme = 'retro-futuristic'; window.__aim.applyPreferences(); })()");
    await sleep(1600);
    ok('Cyberpunk retokens the HUD', (await ev("getComputedStyle(document.querySelector('.aim-hud')).getPropertyValue('--aim-cyber').trim()")) === '1');
    await shot('C1-cyber-play-2d', '.snake-game-container');
    // Cyberpunk's wider monospace: results, then the bests sheet, with nothing cut off.
    await ev("(() => { const r = window.__aim.S.run; if (r) r.el = r.len - 100; })()");
    await waitFor("window.__aim.S.phase === 'ares'", 3000); await sleep(300);
    await shot('C4-cyber-results', '.snake-game-container');
    const clipped = () => ev("Array.from(document.querySelectorAll('.aim-hud :is(.aim-stat span, .aim-tile .l, .aim-mrow > *, .aim-ach b, .aim-ach em, .aim-mtot b, .aim-kick, .aim-lines span, .aim-lines b, .aim-brk-medal b)')).filter(e => e.getClientRects().length && e.scrollWidth > e.clientWidth + 1).map(e => e.textContent)");
    ok('Cyberpunk results: no label cut off', !(await clipped()).length, await clipped());
    await click('.aim-bestb'); await sleep(300);
    await shot('C-cyber-records', '.snake-game-container');
    ok('Cyberpunk records: no label cut off', !(await clipped()).length, await clipped());
    ok('…and the medal total is not clipped at the top', await ev("(() => { const l = document.querySelector('.aim-mtot').getBoundingClientRect(), b = document.querySelector('.aim-sheet-b').getBoundingClientRect(); return l.top >= b.top - 0.5; })()"));
    await click('.aim-sheet-h [data-act="sheet:"]');
    await scen('levels'); await sleep(300); await shot('C7-cyber-map', '.snake-game-container');
    await click('.aim-node.is-cur'); await sleep(250); await shot('C8-cyber-intro', '.snake-game-container');
    ok('Cyberpunk stage card: no label cut off', !(await clipped()).length, await clipped());
    await scen('chaos');

    head('switching away');
    await ev("window.switchGame('snake')");
    await sleep(200);
    // A finished run's results may stay up for when you come back; a live one never survives leaving.
    ok('leaving stops the loop with no live run', await ev("(() => { const S = window.__aim.S; return S.on === false && S.run === null && S.phase !== 'run' && S.phase !== 'count' && S.phase !== 'paused'; })()"));
    await ev("window.switchGame('aim')"); await sleep(200);
    await ev("(() => { const b = document.createElement('button'); b.setAttribute('data-act', 'play'); document.querySelector('.aim-hud').appendChild(b); b.click(); b.remove(); })()");
    await ev("window.switchGame('snake')"); await sleep(200);
    ok('leaving mid-run drops the run', await ev("window.__aim.S.run === null && window.__aim.S.phase === 'idle'"));
    ok('no page errors', errors.length === 0, errors.slice(0, 5));

    console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed · PNGs in ${OUT}`);
    clearTimeout(bail); try { ws.close(); proc.kill(); } catch (_) {}
    process.exit(fail ? 1 : 0);
}
if (require.main === module) main().catch(e => { console.error(e); process.exit(2); });
module.exports = { boot, sleep };
