// The admin page (github-actions-bot/admin/index.html) in headless Chrome.
//
//   node pool-dev/admin-verify.js [dir]
//
// GitHub is stubbed in the page: the gist is a fixture, and each dispatch is recorded and
// answered as the bot would (status-admin.json with its rid), or not answered, to try the resend
// and the give-up. It checks what the page shows (the attention list, the tables, player names
// as text), what each button sends (event, payload, a build token equal to the userscript's), the
// waits, that secrets are never stored, and the layout at 1280 and 390 px. Screenshots go to dir.
// Without github-actions-bot/ beside this repo there is nothing to test, and it says so.
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const { browserPath } = require('./browser');
const { keyFor } = require('../tools/games-key');

const ROOT = path.join(__dirname, '..');
const PAGE = path.join(ROOT, 'github-actions-bot', 'admin', 'index.html');
const OUT = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'admin-verify'));
let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
    if (cond) { pass++; console.log('  ✓ ' + name); }
    else { fail++; console.log('  ✗ ' + name + (detail !== undefined ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); }
};
const head = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 50 - t.length)));
const sleep = ms => new Promise(r => setTimeout(r, ms));
if (!fs.existsSync(PAGE)) { console.log('  · github-actions-bot/admin/index.html is not here; nothing to test\n\n0 passed, 0 failed'); process.exit(0); }

// ── The userscript's own derivations, lifted from it ─────────────────
const HOST = fs.readFileSync(path.join(ROOT, 'AttendanceTimeCheckerPlus.js'), 'utf8').replace(/\r\n/g, '\n');
const PAGE_SRC = fs.readFileSync(PAGE, 'utf8');
const hostConst = n => (HOST.match(new RegExp("const " + n + "\\s*=\\s*'([^']+)'")) || [])[1];
const pageCfg = n => (PAGE_SRC.match(new RegExp(n + ": '([^']+)'")) || [])[1];
const PAT = 'github_pat_TEST_0123456789', ADMIN = 'the-admin-key', UNLOCK = 'unlock-secret-for-the-test-123';
function hostFn(start, end, params, args) {
    const a = HOST.indexOf(start), b = HOST.indexOf(end, a);
    return new Function(...params, HOST.slice(a, b) + '\nreturn arguments;')(...args);
}
const hostBuildToken = (() => {
    const a = HOST.indexOf('    const _BLD_SALT'), b = HOST.indexOf('    const BUILD_TOKEN = _buildToken();');
    return new Function('BUILD_SEED', 'GH_DISPATCHER_PAT', HOST.slice(a, b) + '\nreturn _buildToken();')(hostConst('BUILD_SEED'), PAT);
})();
const hostXpHash = (() => {
    const a = HOST.indexOf('    const _ACS'), b = HOST.indexOf('    function _saveXPIntegrity');
    return new Function('GH_DISPATCHER_PAT', HOST.slice(a, b) + '\nreturn _xpHash;')(PAT);
})();
const hostLevel = (() => {
    const a = HOST.indexOf('    function calculateXPForNextLevel'), b = HOST.indexOf('    function deriveLevelFromTotalXP'), c = HOST.indexOf('    // Repair userXP.level', b);
    return new Function('LEVEL_LOOP_GUARD', HOST.slice(a, HOST.indexOf('\n    }\n', a) + 7) + HOST.slice(b, c) + '\nreturn deriveLevelFromTotalXP;')(10000);
})();
void hostFn;

// ── The fixture gist ─────────────────────────────────────────────────
const NOW = Date.now(), iso = ms => new Date(ms).toISOString(), DAY = 864e5;
const T = c => c.repeat(32);
const XSS = '<img src=x onerror="window.__xss=1">Mal';
const board = {
    lastUpdated: iso(NOW - 60000), latestBuild: 'v14',
    players: [
        { clientId: 'c1', displayName: 'Ayesha', totalXP: 12000, level: 9, gameSessions: 40, totalWorkDays: 30, flagged: true, flagReason: 'xp_budget', flaggedAt: iso(NOW - DAY), serverSync: iso(NOW - 3600e3), recovery: { v: 1 } },
        { clientId: 'c2', displayName: 'Bilal', totalXP: 800, level: 3, restricted: 'no_plus', restrictedAt: iso(NOW - 2 * DAY), serverSync: iso(NOW - 7200e3) },
        { clientId: 'c3', displayName: 'Zara', totalXP: 30000, level: 15, serverSync: iso(NOW - 600e3) },
        { clientId: 'c4', displayName: 'Omar', totalXP: 5000, level: 6, serverSync: iso(NOW - 900e3) },
        { clientId: 'c6', displayName: XSS, totalXP: 10, level: 1, serverSync: iso(NOW - 99 * DAY) },
    ],
};
const files = {
    'attendance_widget_registry.json': JSON.stringify(board),
    'keys.json': JSON.stringify({ n: 7 }),
    'blocked.json': JSON.stringify({ c5: { at: iso(NOW - 3 * DAY), reason: 'cheating', name: 'Sana' } }),
    'acct-c1.json': JSON.stringify({ clientId: 'c1', login: true, loginAt: iso(NOW - 5 * DAY), name: 'Ayesha' }),
    ['plus-' + T('1') + '.json']: JSON.stringify({ at: iso(NOW - 9 * DAY), via: 'login', grant: { clientId: 'c1', at: iso(NOW - 9 * DAY) } }),
    ['plus-' + T('2') + '.json']: JSON.stringify({ at: iso(NOW - 8 * DAY), via: 'key', n: 3, grant: { clientId: 'c1', at: iso(NOW - 8 * DAY) } }),
    ['plus-' + T('7') + '.json']: JSON.stringify({ revoked: true, at: iso(NOW - 20 * DAY) }),
    ['plus-' + T('8') + '.json']: JSON.stringify({ at: iso(NOW - 4 * DAY), via: 'login', grant: { clientId: 'c4', at: iso(NOW - 4 * DAY) } }),
    ['plus-' + T('9') + '.json']: JSON.stringify({ revoked: true, banned: 'tamper', reason: 'lock-bypass', clientId: 'c4', hadPlus: false, at: iso(NOW - DAY) }),
    ['status-' + T('1') + '.json']: JSON.stringify({ rid: 'aa', event: 'login', ok: true, code: 'ok', msg: '', at: iso(NOW - 3600e3) }),
};
['a', 'b', 'c', 'd'].forEach((c, i) => { files['plus-' + T(c) + '.json'] = JSON.stringify({ at: iso(NOW - i * DAY), via: 'login', grant: { clientId: 'c3', at: iso(NOW - i * DAY) } }); });

// The stub: installed before the page's own script runs.
const STUB = `
window.__ADMIN_TIMING = { poll: 40, resend: 500, giveUp: 1800, refresh: 600000, refreshAnon: 600000 };
(() => {
  const T = window.__T = { files: ${JSON.stringify(files)}, dispatches: [], gets: 0, mode: 'reply', adminKey: ${JSON.stringify(ADMIN)} };
  const json = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: { 'Content-Type': 'application/json' } });
  window.fetch = async (url, init) => {
    url = String(url); init = init || {};
    if (/\\/dispatches$/.test(url)) {
      const body = JSON.parse(init.body);
      T.dispatches.push({ url, auth: init.headers && init.headers.Authorization, body });
      setTimeout(() => {
        if (T.mode === 'silent') return;
        if (T.mode === 'silent-once') { T.mode = 'reply'; return; }
        const p = body.client_payload, bad = p.admin_key !== T.adminKey;
        T.files['status-admin.json'] = JSON.stringify({ rid: p.rid, event: body.event_type, ok: !bad, code: bad ? 'bad_key' : (T.code || 'ok'), msg: body.event_type === 'admin-ping' ? 'pong' : '', at: new Date().toISOString() });
      }, 60);
      return new Response(null, { status: 204 });
    }
    if (/\\/gists\\//.test(url)) {
      T.gets++;
      const out = {};
      for (const [k, v] of Object.entries(T.files)) out[k] = { filename: k, content: v, truncated: false };
      return json({ files: out });
    }
    return new Response('', { status: 404 });
  };
})();`;

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const port = 9500 + Math.floor(Math.random() * 300), prof = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-verify-'));
    const proc = spawn(browserPath(), ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + port, '--user-data-dir=' + prof, '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
    const bail = setTimeout(() => { console.log('✗ TIMEOUT'); try { proc.kill(); } catch (_) {} process.exit(2); }, 120000);
    let target;
    for (let i = 0; i < 80 && !target; i++) { await sleep(200); try { target = (await (await fetch('http://127.0.0.1:' + port + '/json/list')).json()).find(t => t.type === 'page'); } catch (_) {} }
    if (!target) { console.log('✗ Chrome did not start'); process.exit(2); }
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(r => { ws.onopen = r; });
    let id = 0; const wait = {}, errors = [];
    ws.onmessage = e => {
        const m = JSON.parse(e.data);
        if (m.id && wait[m.id]) { wait[m.id](m); delete wait[m.id]; }
        if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception ? m.params.exceptionDetails.exception.description : m.params.exceptionDetails.text);
        if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value || a.description).join(' '));
    };
    const cdp = (method, params) => new Promise(r => { const i = ++id; wait[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async x => {
        const r = await cdp('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true });
        if (r.result.exceptionDetails) throw new Error('page: ' + (r.result.exceptionDetails.exception ? r.result.exceptionDetails.exception.description : r.result.exceptionDetails.text));
        return r.result.result.value;
    };
    const until = async (x, ms) => { const end = Date.now() + (ms || 4000); while (Date.now() < end) { if (await ev(x)) return true; await sleep(40); } return false; };
    const click = sel => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true; })()`);
    const shot = async name => { const s = await cdp('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(s.result.data, 'base64')); };
    const dispatches = () => ev('window.__T.dispatches.map(d => ({ event: d.body.event_type, p: d.body.client_payload, auth: d.auth }))');
    const last = async () => (await dispatches()).slice(-1)[0];
    const settle = () => until("!window.__admin.S.log.some(e => ['queued', 'sending', 'waiting'].includes(e.state))", 5000);
    const confirm = async (reason, num) => {
        if (!(await until("document.getElementById('dlg').open", 2000))) return false;
        if (reason !== undefined) await ev(`document.getElementById('dlg-reason').value = ${JSON.stringify(reason)}`);
        if (num !== undefined) await ev(`(() => { const i = document.getElementById('dlg-num'); i.value = ${JSON.stringify(String(num))}; i.dispatchEvent(new Event('input')); })()`);
        return click('#dlg-ok');
    };

    await cdp('Runtime.enable', {});
    await cdp('Page.enable', {});
    await cdp('Page.addScriptToEvaluateOnNewDocument', { source: STUB });
    await cdp('Page.navigate', { url: 'file:///' + PAGE.replace(/\\/g, '/') });
    await until('!!window.__admin', 8000);

    head('Settings agree with the userscript');
    ok('BUILD_SEED and BUILD_LABEL are the userscript\'s', pageCfg('BUILD_SEED') === hostConst('BUILD_SEED') && pageCfg('BUILD_LABEL') === hostConst('BUILD_LABEL'), [pageCfg('BUILD_SEED'), hostConst('BUILD_SEED')]);
    ok('the gist and the bot repo are the userscript\'s', pageCfg('GIST_ID') === hostConst('REGISTRY_GIST_ID') && pageCfg('REPO') === hostConst('GH_BOT_REPO') && pageCfg('BOARD') === hostConst('REGISTRY_GIST_FILE'));
    ok('the page\'s build token for a token is the userscript\'s', (await ev(`window.__admin.buildToken(${JSON.stringify(PAT)})`)) === hostBuildToken, hostBuildToken);
    ok('…its XP signature and level curve too', (await ev(`window.__admin.xpHash(${JSON.stringify(PAT)}, 5000, 6, 40, 30)`)) === hostXpHash(5000, 6, 40, 30) &&
        JSON.stringify(await ev('window.__admin.deriveLevel(5000)')) === JSON.stringify(hostLevel(5000)));

    head('Connect');
    await ev(`document.getElementById('admin-key').value = ${JSON.stringify(ADMIN)}; document.getElementById('pat').value = ${JSON.stringify(PAT)}`);
    await click('#connect-btn');
    ok('it reads the board and shows the app', await until("!document.getElementById('app').hidden && document.getElementById('connect').hidden"));
    ok('…and checks the key with a ping, carrying the key, the build token, the label and a rid', await until("window.__T.dispatches.length === 1") && await (async () => {
        const d = await last();
        return d.event === 'admin-ping' && d.p.admin_key === ADMIN && d.p.build_token === hostBuildToken && d.p.build_label === hostConst('BUILD_LABEL') && /^[0-9a-f]{16}$/.test(d.p.rid) && d.auth === 'Bearer ' + PAT;
    })(), await last());
    ok('the bot\'s answer turns the pill to Connected', await until("document.getElementById('conn-pill').textContent.includes('Connected')"));
    ok('the drawer and its scrim are really hidden until a player is opened', await ev("getComputedStyle(document.getElementById('drawer')).display === 'none' && getComputedStyle(document.getElementById('scrim')).display === 'none'"));
    ok('the fields are emptied once read', await ev("document.getElementById('admin-key').value === '' && document.getElementById('pat').value === ''"));
    await shot('admin-attention');

    head('What it shows');
    const keys = await ev("[...document.querySelectorAll('#attention-list [data-key]')].map(e => e.getAttribute('data-key'))");
    ok('attention: the recent tamper ban first, then ban evasion', keys[0] === 'ban:' + T('9') && keys[1] === 'evade:c4', keys);
    ok('…a shared licence (Zara on 4 browsers), the flag and the restriction', keys.includes('shared:c3') && keys.includes('flag:c1') && keys.includes('restrict:c2'), keys);
    ok('…and nothing for the old revoke or the blocked account without Plus', !keys.some(k => k.includes(T('7')) || k.includes('c5')), keys);
    ok('the counts: 5 on the board, 7 Plus browsers, 1 revoked, 1 banned, 1 blocked, key #7', await ev("[...document.querySelectorAll('#stats .stat b')].map(b => b.textContent).join()") === '5,7,1,1,1,1,1,#7',
        await ev("[...document.querySelectorAll('#stats .stat b')].map(b => b.textContent).join()"));
    await click('[data-tab="players"]');
    ok('players: the board and the blocked account off it', await ev("document.querySelectorAll('#players-list tbody tr').length") === 6);
    ok('a player\'s name is shown as text, never run', await ev("!window.__xss && [...document.querySelectorAll('#players-list .linkish')].some(b => b.textContent === " + JSON.stringify(XSS) + ") && !document.querySelector('#players-list img')"));
    await ev("document.querySelector('#players-chips [data-filter=\"blocked\"]').click()");
    ok('the Blocked filter: Sana, off the board, with her name from blocked.json', await ev("[...document.querySelectorAll('#players-list tbody tr')].map(r => r.getAttribute('data-id')).join()") === 'c5');
    await ev("document.querySelector('#players-chips [data-filter=\"all\"]').click()");
    await ev("(() => { const i = document.getElementById('players-q'); i.value = '" + T('d').slice(0, 10) + "'; i.dispatchEvent(new Event('input')); })()");
    ok('search finds a player by one of their browser tags', await ev("[...document.querySelectorAll('#players-list tbody tr')].map(r => r.getAttribute('data-id')).join()") === 'c3');
    await ev("(() => { const i = document.getElementById('players-q'); i.value = ''; i.dispatchEvent(new Event('input')); })()");
    await click('[data-tab="browsers"]');
    ok('browsers: all 9, newest first', await ev("document.querySelectorAll('#browsers-list tbody tr').length") === 9);
    ok('…the tamper ban says its account is claimed, not proven', await ev(`document.querySelector('#browsers-list tr[data-tag="${T('9')}"]').textContent.includes('claimed, not proven')`));
    await shot('admin-browsers');

    head('Commands');
    await click('[data-tab="attention"]');
    await click('[data-key="flag:c1"] [data-act="unflag"]');
    await settle();
    let d = await last();
    ok('Unflag sends admin-unflag for the player, and shows Done', d.event === 'admin-unflag' && d.p.client_id === 'c1' && await ev("window.__admin.S.log[0].state === 'ok'"), d);
    await click('[data-key="evade:c4"] [data-act="ban-account"]');
    await confirm('alt account');
    await settle();
    d = await last();
    ok('Ban account asks, then sends admin-account-ban with the reason', d.event === 'admin-account-ban' && d.p.client_id === 'c4' && d.p.reason === 'alt account', d);
    const before = (await dispatches()).length;
    await click('[data-key="restrict:c2"] [data-act="unrestrict"]');
    await settle();
    d = await last();
    ok('Clear restriction is a rollback of restricted and restrictedAt to null', d.event === 'admin-rollback' && d.p.client_id === 'c2' && d.p.overrides.restricted === null && d.p.overrides.restrictedAt === null && (await dispatches()).length === before + 1);
    // Cancelling a dialog sends nothing.
    const n0 = (await dispatches()).length;
    await click(`[data-key="ban:${T('9')}"] [data-act="restore"]`);
    await until("document.getElementById('dlg').open", 2000);
    await click('#dlg-cancel');
    await sleep(150);
    ok('Cancel in a dialog sends nothing', (await dispatches()).length === n0 && !(await ev("document.getElementById('dlg').open")));
    // The drawer.
    await click('[data-tab="players"]');
    await click('#players-list [data-act="open"][data-arg="c1"]');
    ok('a player opens in the drawer with their two browsers', await until("!document.getElementById('drawer').hidden") && await ev("document.querySelectorAll('#drawer .body .items .item').length") === 2);
    await shot('admin-drawer');
    await click('#drawer [data-act="xp"]');
    await confirm(undefined, 5000);
    await settle();
    d = await last();
    const lv = hostLevel(5000);
    ok('Set XP: a rollback with the derived level and the userscript\'s signature', d.event === 'admin-rollback' && d.p.overrides.totalXP === 5000 && d.p.overrides.level === lv.level && d.p.overrides.currentXP === lv.currentXP &&
        d.p.overrides.xpSig === hostXpHash(5000, lv.level, 40, 30), d.p.overrides);
    await click('#drawer [data-act="revoke-all"]');
    await confirm();
    await until('window.__T.dispatches.length >= ' + ((await dispatches()).length + 2), 6000);
    await settle();
    const two = (await dispatches()).slice(-2);
    ok('Revoke all browsers sends one revoke per active browser, one after the other', two.every(x => x.event === 'admin-games-revoke') && two.map(x => x.p.tag).sort().join() === [T('1'), T('2')].join(), two.map(x => x.event + ':' + x.p.tag));
    await click('#drawer [data-close]');
    ok('closing the drawer hides it again', await ev("getComputedStyle(document.getElementById('drawer')).display === 'none'"));
    ok('the corner shows at most one finished command', await ev("document.querySelectorAll('#queue .qi:not([data-state=queued]):not([data-state=sending]):not([data-state=waiting])').length") <= 1);
    await click('[data-tab="browsers"]');
    await click(`#browsers-list tr[data-tag="${T('7')}"] [data-act="restore"]`);
    await confirm();
    await settle();
    d = await last();
    ok('Restore on a revoked browser sends admin-games-restore', d.event === 'admin-games-restore' && d.p.tag === T('7'));
    await click(`#browsers-list tr[data-tag="${T('8')}"] [data-act="ban"]`);
    await confirm('sold keys');
    await settle();
    d = await last();
    ok('Ban on an active browser sends admin-games-ban with the reason', d.event === 'admin-games-ban' && d.p.tag === T('8') && d.p.reason === 'sold keys');

    head('Waiting for the bot');
    await ev("window.__T.mode = 'silent-once'");
    let n1 = (await dispatches()).length;
    await click('[data-tab="attention"]');
    await click('[data-key="flag:c1"] [data-act="unflag"]');
    await settle();
    let sent = (await dispatches()).slice(n1);
    ok('no answer: sent again once with a new rid, and the second answer counts', sent.length === 2 && sent[0].p.rid !== sent[1].p.rid && await ev("window.__admin.S.log[0].state === 'ok' && window.__admin.S.log[0].resent === true"), sent.map(x => x.p.rid));
    await ev("window.__T.mode = 'silent'");
    n1 = (await dispatches()).length;
    await click('[data-key="flag:c1"] [data-act="unflag"]');
    await until("window.__admin.S.log[0].state === 'fail'", 6000);
    ok('never an answer: it gives up and says why', (await dispatches()).length - n1 === 2 && /No answer from the bot/.test(await ev('window.__admin.S.log[0].msg')));
    await click('[data-tab="keys"]');
    n1 = (await dispatches()).length;
    await click('[data-act="rotate"]');
    await confirm();
    await until("window.__admin.S.log[0].state === 'fail'", 6000);
    ok('Skip key is never sent twice, even unanswered (twice would skip two keys)', (await dispatches()).length - n1 === 1 && (await last()).event === 'admin-games-rotate');
    await ev("window.__T.mode = 'reply'");

    head('License keys');
    await ev(`(() => { const i = document.getElementById('unlock'); i.value = ${JSON.stringify(UNLOCK)}; i.dispatchEvent(new Event('input')); })()`);
    const want = [7, 8, 9].map(n => keyFor(UNLOCK, n).match(/.{4}/g).join('-'));
    ok('with the unlock secret it shows keys #7, #8 and #9 as the bot makes them', await until(`[...document.querySelectorAll('#key-list .keyline .mono')].map(e => e.textContent).join() === ${JSON.stringify(want.join())}`, 3000), want);
    ok('…and the secret never left the page', (await ev('JSON.stringify(window.__T.dispatches)')).indexOf(UNLOCK) === -1);
    await shot('admin-keys');

    head('Secrets and a wrong key');
    const stored = await ev('JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage), document.cookie])');
    ok('nothing secret is stored: not the key, the token or the unlock secret', ![ADMIN, PAT, UNLOCK].some(s => stored.includes(s)), stored);
    await click('#lock-btn');
    ok('Lock forgets them and returns to Connect', await ev("!document.getElementById('connect').hidden && window.__admin.S.adminKey === '' && window.__admin.S.pat === '' && document.getElementById('unlock').value === ''"));
    await ev(`document.getElementById('admin-key').value = 'wrong'; document.getElementById('pat').value = ${JSON.stringify(PAT)}`);
    await click('#connect-btn');
    ok('a wrong admin key: the ping comes back bad_key, and the pill says so', await until("document.getElementById('conn-pill').textContent.includes('Admin key rejected')", 4000) && /not accepted/.test(await ev('window.__admin.S.log[0].msg')));
    await click('#lock-btn');
    await click('#view-only-btn');
    n1 = (await dispatches()).length;
    await until("!document.getElementById('app').hidden");
    await click('[data-key="flag:c1"] [data-act="unflag"]');
    await sleep(200);
    ok('View only: actions send nothing and say why', (await dispatches()).length === n1 && /Connect with the admin key/.test(await ev("document.getElementById('queue').textContent")));

    head('Layout');
    for (const [w, h, name] of [[1280, 900, 'wide'], [390, 844, 'phone']]) {
        await cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 500 });
        for (const tab of ['attention', 'players', 'browsers']) {
            await click(`[data-tab="${tab}"]`);
            await sleep(120);
            const over = await ev('document.documentElement.scrollWidth - window.innerWidth');
            ok(`${name} (${w} px), ${tab}: no sideways scroll of the page`, over <= 0, over);
        }
        await shot('admin-' + name);
    }
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await ev("document.documentElement.setAttribute('data-theme', 'light')");
    await click('[data-tab="attention"]');
    ok('the light theme has its own background', await ev("getComputedStyle(document.body).backgroundColor") === 'rgb(246, 247, 249)');
    await shot('admin-light');
    ok('no page errors', errors.length === 0, errors);

    clearTimeout(bail);
    ws.close(); proc.kill(); await sleep(400);
    try { fs.rmSync(prof, { recursive: true, force: true }); } catch (_) {}
    console.log('\n' + pass + ' passed, ' + fail + ' failed   (PNGs in ' + OUT + ')');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('✗ ' + (e.stack || e)); process.exit(1); });
