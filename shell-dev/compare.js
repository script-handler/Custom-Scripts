// Design | ours, per screen and theme, at the design's 1920 frames. The design side renders Screens v2's own files
// (ref/design-v2, React vendored); ours renders the REAL EGP DOM captured to ref/egp/{timeline,attendance}.html with the
// bridged widget and the local ATCShell.js. Writes PNGs and compare.html to the out dir.
//
//   "C:/Program Files/nodejs/node.exe" shell-dev/compare.js [outDir] [--only=tl|att] [--themes=my-light,aurora-dark]
const { spawn } = require('child_process');
const { bridge } = require('./bridge');
const fs = require('fs'), path = require('path'), os = require('os');

const ROOT = path.join(__dirname, '..'), REF = path.join(__dirname, 'ref', 'design-v2'), FX = path.join(__dirname, 'ref', 'egp');
const args = process.argv.slice(2), flag = k => (args.find(a => a.startsWith('--' + k + '=')) || '').split('=')[1];
const OUT = path.resolve(args.find(a => !a.startsWith('--')) || path.join(__dirname, 'compare-out'));
const CHROME = require('../pool-dev/browser').browserPath();
const DESIGN = 'https://design.local/', BASE = 'https://globalportal.mtbc.com/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const SCREENS = { tl: { file: 'Timeline v2.dc.html', fx: 'timeline.html', hash: '#/home/Timeline', h: 1080 },
    att: { file: 'Attendance v2.dc.html', fx: 'attendance.html', hash: '#/time-absence/attendence-record', h: 1400 } };
const MAGENTA = { cyberBgPrimary: '#0a0512', cyberBgSecondary: '#170a26', cyberAccent: '#ff2a6d', cyberHighlight: '#d16bff', cyberPanelTint: '#8a2be2', cyberText: '#ffd6e8', cyberGlow: '#ff2a6d', cyberBorder: '#ff5c94' };
const THEMES = { // design key → widget prefs + browser scheme
    'my-light': [{ displayTheme: 'material' }, 'light'], 'my-dark': [{ displayTheme: 'material' }, 'dark'],
    'aurora-light': [{ displayTheme: 'glassmorphic' }, 'light'], 'aurora-dark': [{ displayTheme: 'glassmorphic' }, 'dark'],
    'cyber-yellow-cyan': [{ displayTheme: 'retro-futuristic' }, 'dark'], 'cyber-magenta-noir': [{ displayTheme: 'retro-futuristic', ...MAGENTA }, 'dark'],
    'biz-light': [{ displayTheme: 'business' }, 'light'] };
// Dark-theme audit: visible elements still drawing a light border, background or hr (EGP's hard-coded whites).
const AUDIT = `(() => {
  const lum = c => { const m = /rgba?\\(([\\d.]+), ([\\d.]+), ([\\d.]+)(?:, ([\\d.]+))?/.exec(c); if (!m || (m[4] !== undefined && +m[4] < .35)) return 0; if (Math.max(m[1], m[2], m[3]) - Math.min(m[1], m[2], m[3]) > 40) return 0; return (.2126 * m[1] + .7152 * m[2] + .0722 * m[3]) / 255; };
  const path = e => { const p = []; for (let n = e; n && n !== document.body && p.length < 4; n = n.parentElement) p.unshift(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.classList.length ? '.' + [...n.classList].slice(0, 3).join('.') : '')); return p.join(' > '); };
  const out = {};
  for (const e of document.querySelectorAll('#global-portal *')) {
    if (e.closest('svg')) continue;
    const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 1 || r.bottom < 0 || r.top > innerHeight * 2) continue;
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const hits = [];
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) if (parseFloat(cs['border' + side + 'Width']) >= 1 && cs['border' + side + 'Style'] !== 'none' && lum(cs['border' + side + 'Color']) > .8) hits.push('border-' + side.toLowerCase());
    if (lum(cs.backgroundColor) > .85 && e.tagName !== 'IMG') hits.push('background');
    if (e.tagName === 'HR' && +cs.opacity > .2) hits.push('hr ' + cs.color + ' ' + cs.opacity);
    if (hits.length) { const k = path(e) + '  [' + hits.join(', ') + ']'; out[k] = (out[k] || 0) + 1; }
  }
  return Object.entries(out).map(([k, n]) => (n > 1 ? n + '× ' : '') + k);
})()`;
// Card crops, design selector | ours selector, per screen: the pairs to read card by card.
// 'tag=Text' finds the design's card as the section around the first such element whose text starts with Text.
const CARDS = { tl: { profile: ['section[aria-label="Profile"]', '.atc-c-profile'], stock: ['h3=Stock price', '.atc-c-stock-price'], careers: ['h3=Careers', '.atc-c-careers'],
    documents: ['h3=Documents', '.atc-c-documents'], approval: ['h3=Approval', '.atc-c-approval'], leaders: ['span=Supervisor', '.atc-c-leaders'], birthday: ['span=Birthdays', '.atc-c-birthday'],
    coworkers: ['h3=Co-workers', '.atc-c-co-workers'], awards: ['span=Company awards', '.atc-c-company-awards'], spotlight: ['h3=Spotlight', '.atc-c-spotlight'], happening: ['h3=Happening', '.atc-c-happening-around-me'],
    health: ['h3=Health', '.atc-c-health'], knowledge: ['h3=eGP Knowledge', '.atc-c-egp-knowledge'], promotion: ['span=Promotion', '.atc-c-promotion'], recognition: ['h3=Recognition', '.atc-c-recognition'],
    offers: ['h3=Special offers', '.atc-c-special-offers'], market: ['span=Market place', '.atc-c-market-place'], events: ['h3=Events', '.atc-c-events'] },
    att: { bento: ['div[style*="1.15fr 1.15fr"]', '.atc-bento'], table: ['[role=table]', '.main-attendance-table'] } };
const themes = (flag('themes') || Object.keys(THEMES).join(',')).split(','), screens = (flag('only') || 'tl,att').split(',');

const VENDOR = { 'react@18.3.1/umd/react.production.min.js': 'react.production.min.js', 'react-dom@18.3.1/umd/react-dom.production.min.js': 'react-dom.production.min.js' };
const TYPE = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };
// The fixture: the captured EGP page plus the bridged widget, which fetches the local shell.
function fixture(name) {
    const html = fs.readFileSync(path.join(FX, name), 'utf8'), widget = bridge(fs.readFileSync(path.join(ROOT, 'AttendanceTimeCheckerPlus.js'), 'utf8'));
    const boot = `<script>sessionStorage.setItem('authToken', 'tok'); sessionStorage.setItem('authUser', '16117'); window.$ = window.$ || (sel => ({ before: el => { const t = document.querySelector(sel); if (t) t.parentNode.insertBefore(el, t); } }));</script>`
        + `<script>${widget.replace(/<\/script/gi, '<\\/script')}</script>`;
    return html.includes('</body>') ? html.replace('</body>', () => boot + '</body>') : html + boot;
}

async function main() {
    fs.mkdirSync(OUT, { recursive: true });
    const port = 9700 + Math.floor(Math.random() * 200), PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'shell-compare-'));
    const proc = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=' + port, '--user-data-dir=' + PROFILE, '--no-first-run', '--window-size=1920,1400', 'about:blank'], { stdio: 'ignore' });
    process.on('exit', () => { try { proc.kill(); } catch (_) {} try { fs.rmSync(PROFILE, { recursive: true, force: true, maxRetries: 5 }); } catch (_) {} });
    const bail = setTimeout(() => { console.log('✗ TIMEOUT'); process.exit(2); }, 600000);
    let target;
    for (let i = 0; i < 80 && !target; i++) { await sleep(200); try { target = (await (await fetch('http://127.0.0.1:' + port + '/json/list')).json()).find(t => t.type === 'page'); } catch (_) {} }
    if (!target) { console.log('✗ Chrome did not start'); process.exit(2); }
    const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
    let id = 0; const pending = {}, errors = [];
    const send = (method, params) => new Promise(r => { const n = ++id; pending[n] = r; ws.send(JSON.stringify({ id: n, method, params })); });
    const reply = (rid, type, body) => send('Fetch.fulfillRequest', { requestId: rid, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: type }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: Buffer.from(body).toString('base64') });
    let designTheme = 'my-light';
    ws.addEventListener('message', e => {
        const m = JSON.parse(e.data);
        if (m.id && pending[m.id]) { pending[m.id](m); delete pending[m.id]; return; }
        if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
        if (m.method !== 'Fetch.requestPaused') return;
        const u = m.params.request.url, rid = m.params.requestId, vend = Object.keys(VENDOR).find(k => u.includes(k));
        if (vend) return reply(rid, 'text/javascript', fs.readFileSync(path.join(REF, 'vendor', VENDOR[vend])));
        if (u.startsWith(DESIGN + '__out/')) { const f = path.join(OUT, decodeURIComponent(u.slice(DESIGN.length + 6).split('?')[0])); return fs.existsSync(f) ? reply(rid, f.endsWith('.png') ? 'image/png' : 'text/html; charset=utf-8', fs.readFileSync(f)) : send('Fetch.fulfillRequest', { requestId: rid, responseCode: 404, body: '' }); }
        if (u.startsWith(DESIGN)) {
            const f = decodeURIComponent(u.slice(DESIGN.length).split('?')[0]), p = path.join(REF, f);
            if (!fs.existsSync(p)) return send('Fetch.fulfillRequest', { requestId: rid, responseCode: 404, body: '' });
            let body = fs.readFileSync(p, 'utf8');
            // The root screen's theme is its data-props default; dc-imports get it as a prop.
            if (/ v2\.dc\.html$/.test(f)) body = body.replace('&quot;default&quot;:&quot;my-light&quot;', () => '&quot;default&quot;:&quot;' + designTheme + '&quot;');
            return reply(rid, TYPE[path.extname(f)] || 'text/plain', body);
        }
        if (u.includes('/api/Home/getDashboardPerformanceRecord')) return reply(rid, 'application/json', JSON.stringify({ _ActualActiveTime: [{ Actual_Time: '4.5', Active_Time: '4.05' }], _Total_Checkin_Hours: [{ checkin: '7:59 AM', checkout: '-' }] }));
        if (u.includes('/ATCShell.js')) return reply(rid, 'text/plain', fs.readFileSync(path.join(ROOT, 'ATCShell.js'), 'utf8'));
        if (u.startsWith(BASE) && /^https:\/\/globalportal\.mtbc\.com\/(\?[^#]*)?(#.*)?$/.test(u)) { const fx = /fx=(\w+)/.exec(u); return reply(rid, 'text/html; charset=utf-8', fx ? fixture(SCREENS[fx[1]].fx) : '<!doctype html><title>blank</title>'); }
        if (/\/api\/|^https:\/\/api\.github\.com\//.test(u)) return send('Fetch.failRequest', { requestId: rid, errorReason: 'BlockedByClient' });
        send('Fetch.continueRequest', { requestId: rid }); // fonts, EGP css and images
    });
    await send('Runtime.enable'); await send('Page.enable'); await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
    const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); return r.result?.result?.value; };
    const until = async (x, ms = 15000) => { for (let t = 0; t < ms; t += 200) { if (await ev(x)) return true; await sleep(200); } return false; };
    const crop = async (sel, file) => { const b = await ev("(() => { const q = " + JSON.stringify(sel) + ", m = /^(\\w+)=(.+)$/.exec(q), e = m ? [...document.querySelectorAll(m[1])].find(x => x.textContent.trim().startsWith(m[2]))?.closest('section') : document.querySelector(q); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left - 8, y: r.top - 8, width: r.width + 16, height: r.height + 16 }; })()");
        if (!b) return null; const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...b, scale: 1.5 } }); fs.writeFileSync(path.join(OUT, file), Buffer.from(r.result.data, 'base64')); return file; };
    const shot = async (file, h) => { const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 1920, height: h, scale: 1 } }); fs.writeFileSync(path.join(OUT, file), Buffer.from(r.result.data, 'base64')); };
    let nav = 0;
    const rows = [];
    for (const sc of screens) {
        const S = SCREENS[sc], hasFx = fs.existsSync(path.join(FX, S.fx));
        if (!hasFx) console.log(`  (no ref/egp/${S.fx}: design side only)`);
        for (const th of themes) {
            const [prefs, scheme] = THEMES[th];
            await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: S.h, deviceScaleFactor: 1, mobile: false });
            await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
            designTheme = th;
            await send('Page.navigate', { url: DESIGN + encodeURIComponent(S.file) + '?n=' + (++nav) });
            await until("!!document.querySelector('#dc-root [data-x]')"); await ev('document.fonts.ready.then(() => 1)'); await sleep(1500);
            const dFile = `design-${sc}-${th}.png`; await shot(dFile, S.h);
            const cards = Object.entries(CARDS[sc]); for (const [k, [ds]] of cards) await crop(ds, `crop-${k}-${th}-design.png`);
            let oFile = null;
            if (hasFx) {
                await send('Page.navigate', { url: BASE + '?n=' + (++nav) }); await sleep(300);
                // The web theme is Plus: a stored grant, which stands while the gist is out of reach (blocked below).
                await ev(`localStorage.setItem('attendancePrefs', ${JSON.stringify(JSON.stringify(prefs))}); sessionStorage.removeItem('attSnap'); localStorage.setItem('atc_games_ok', String(Date.now() + 864e5)); localStorage.setItem('atc_games_secret', 'compare'); 1`);
                // The widget boots on window load, which a stalled live EGP image can hold back: retry once, and say so.
                const mounted = "document.documentElement.dataset.xFam && " + (sc === 'att' ? "!!document.getElementById('total-time-summary')" : "!!document.querySelector('.atc-chip')");
                for (let a = 0; a < 2; a++) {
                    await send('Page.navigate', { url: BASE + '?fx=' + sc + '&n=' + (++nav) + S.hash });
                    if (await until(mounted, 20000)) break;
                    console.log(`    ✗ shell not mounted (readyState ${await ev('document.readyState')})${a ? '; audit below is of an unskinned page' : ', retrying'}`);
                }
                await ev('document.fonts.ready.then(() => 1)'); await sleep(2500);
                oFile = `ours-${sc}-${th}.png`; await shot(oFile, S.h);
                if (flag('eval') && th === themes[0]) console.log(await ev(fs.readFileSync(flag('eval'), 'utf8')));
                if (flag('slugs') && th === themes[0]) console.log(await ev("[...document.querySelectorAll('.box-widget[data-atc-c]')].map(c => { const r = c.getBoundingClientRect(); return c.dataset.atcC + ' @' + [r.left, r.top, r.width, r.height].map(Math.round).join(','); }).join('\\n')"));
                for (const [k, [, os]] of cards) await crop(os, `crop-${k}-${th}-ours.png`);
                if (flag('loader')) { // jquery.blockUI's page DOM as BlockUIComponent opens it, plus a request widget's inline gif
                    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'no-preference' }] });
                    await ev(`document.body.insertAdjacentHTML('beforeend', '<div class="blockUI" style="display:none"></div><div class="blockUI blockOverlay" style="z-index:1000;border:none;margin:0;padding:0;width:100%;height:100%;top:0;left:0;background-color:#000;opacity:0.6;cursor:wait;position:fixed"></div><div class="blockUI blockMsg blockPage" style="z-index:1080;position:fixed;padding:0;margin:0;width:30%;top:40%;left:35%;text-align:center;color:#000;border:none;background:none;font-size:12px;cursor:auto"><img src="../../../../../images/loading.gif" alt="Loading"></div><div id="li-inline" style="position:fixed;z-index:1100;left:20px;top:20px;padding:8px;background:var(--md-sys-color-surface-container)"><img src="/images/loading.gif" style="height:45px"></div>'); 1`);
                    for (const t of [0, 330, 650, 1300]) { await sleep(t ? 330 : 100); await crop('.blockMsg', `loader-${th}-${t}.png`); }
                    await crop('#li-inline', `loader-${th}-inline.png`);
                    await ev("document.querySelectorAll('.blockUI,#li-inline').forEach(e => e.remove()); 1");
                    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
                }
                if (scheme === 'dark') { const a = await ev(AUDIT) || []; fs.writeFileSync(path.join(OUT, `audit-${sc}-${th}.txt`), a.join('\n')); console.log(`    audit: ${a.length} light leftovers`); }
            }
            rows.push({ sc, th, dFile, oFile }); console.log(`  ✓ ${sc} ${th}`);
        }
    }
    const cell = f => f ? `<a href="${f}"><img src="${f}" loading="lazy"></a>` : '<div class="none">no fixture</div>';
    fs.writeFileSync(path.join(OUT, 'compare.html'), `<!doctype html><meta charset="utf-8"><title>ATC Shell: design vs ours</title>
<style>body{margin:0;padding:16px;background:#111;color:#eee;font:14px system-ui}h2{margin:24px 0 8px;font-weight:600}.p{display:grid;grid-template-columns:1fr 1fr;gap:8px}.p img{width:100%;display:block;border:1px solid #333}.p span{font-size:12px;color:#999}.none{display:grid;place-items:center;height:200px;border:1px dashed #444;color:#777}</style>
${rows.map(r => `<h2>${r.sc === 'tl' ? 'Timeline' : 'Attendance'} · ${r.th}</h2><div class="p"><div><span>design</span>${cell(r.dFile)}</div><div><span>ours</span>${cell(r.oFile)}</div></div>`).join('\n')}`);
    // One sheet per theme: every card crop, design | ours, side by side (cards-<theme>.png).
    for (const th of themes) {
        const pairs = Object.keys(CARDS).flatMap(sc => Object.keys(CARDS[sc])).filter(k => fs.existsSync(path.join(OUT, `crop-${k}-${th}-design.png`)));
        if (!pairs.length) continue;
        fs.writeFileSync(path.join(OUT, `cards-${th}.html`), `<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:12px;background:#777;font:600 13px system-ui;color:#fff}.r{display:grid;grid-template-columns:110px 1fr 1fr;gap:10px;align-items:start;margin-bottom:10px}img{max-width:100%;display:block}</style>`
            + pairs.map(k => `<div class="r"><span>${k}</span><img src="crop-${k}-${th}-design.png"><img src="crop-${k}-${th}-ours.png" onerror="this.replaceWith('no fixture')"></div>`).join(''));
        await send('Emulation.setDeviceMetricsOverride', { width: 1500, height: 900, deviceScaleFactor: 1, mobile: false });
        await send('Page.navigate', { url: DESIGN + '__out/' + `cards-${th}.html` }); await until("[...document.images].every(i => i.complete)"); await sleep(300);
        const h = await ev('document.documentElement.scrollHeight'), r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 1500, height: h, scale: 1 } });
        fs.writeFileSync(path.join(OUT, `cards-${th}.png`), Buffer.from(r.result.data, 'base64'));
    }
    console.log(`\n${errors.length ? '⚠ ' + errors.length + ' page errors (first: ' + String(errors[0]).slice(0, 160) + ')' : '✓ no page errors'} · ${path.join(OUT, 'compare.html')}`);
    clearTimeout(bail); await send('Browser.close').catch(() => {}); ws.close(); await sleep(800); process.exit(0);
}
main().catch(e => { console.error(e); process.exit(2); });
