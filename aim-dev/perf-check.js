// AimLab frame cost in real Chrome (the userscript on the stand-in portal, via host-run's boot).
// Chaos runs in 2D and 3D while a 1000 Hz "gaming mouse" moves over the viewport (pointer
// events fired in the page: CDP's own input manages ~10 a second), at full speed and at 4× CPU
// throttle (a slower PC). Per second of play: Chrome's counts of layouts and style recalcs and
// their cost, script time, and the frame times. Headless paints in software, so frame times are
// an upper bound (a slow PC, roughly); the layout and recalc counts are exact.
//
//   "C:/Program Files/nodejs/node.exe" aim-dev/perf-check.js            the 2D / 3D table
//   "C:/Program Files/nodejs/node.exe" aim-dev/perf-check.js --ab       plus the A/B probes
const { boot, sleep } = require('./host-run');

const SECS = 3, AB = process.argv.includes('--ab');

// A/B probes, applied in the page before a sample (test-only).
const PROBES = {
    none: '',
    noShadow: "Object.defineProperty(CanvasRenderingContext2D.prototype, 'shadowBlur', { set() {}, get() { return 0; }, configurable: true });",
    flatBg: "window.__aim.S.vp.style.background = '#0C0B13';",
};

async function run(ctx, label, { mode, throttle, mouse = true, play = true, probe = 'none', max = false, dpr = 1 }) {
    const { send, ev } = ctx;
    await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: dpr, mobile: false });
    await send('Emulation.setCPUThrottlingRate', { rate: throttle });
    await ev(`(() => { const S = window.__aim.S; S.vp.style.background = ''; S.st.scen = 'chaos'; S.st.mode = '${mode}'; S.st.diff = 'normal';
        const act = a => { const b = document.createElement('button'); b.setAttribute('data-act', a); S.hud.appendChild(b); b.click(); b.remove(); };
        if (S.max !== ${max}) act('max');
        act('quit'); if (${play}) act('play'); if ('${mode}' === '3d') { S.locked = true; S.ovKey = ''; } ${PROBES[probe]} return 1; })()`);
    if (play) {
        for (let i = 0; i < 200 && !(await ev("window.__aim.S.phase === 'run'")); i++) await sleep(100);
        // Keep the run alive with the clock reading as it does in play (25.0 down to 24.8, not 999999.5).
        await ev('(() => { const r = window.__aim.S.run; clearInterval(window.__keep); window.__keep = setInterval(() => { r.len = r.el + 25000; }, 200); return 1; })()');
    }
    // Frames, and the mouse: ~1000 pointermoves a second on the viewport, circling.
    await ev(`(() => {
        window.__fr = []; window.__stop = false;
        const f = t => { if (window.__stop) return; window.__fr.push(t); requestAnimationFrame(f); }; requestAnimationFrame(f);
        if (${mouse}) {
            const vp = window.__aim.S.vp, ch = new MessageChannel(); let a = 0, last = performance.now();
            ch.port1.onmessage = () => {
                if (window.__stop) return;
                const now = performance.now();
                if (now - last >= 1) { last = now; a += 0.01; const b = vp.getBoundingClientRect();
                    vp.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: b.left + b.width * (0.5 + 0.35 * Math.cos(a)), clientY: b.top + b.height * (0.5 + 0.35 * Math.sin(a * 0.7)) })); }
                ch.port2.postMessage(0);
            };
            ch.port2.postMessage(0);
        }
        return 1; })()`);
    const metrics = async () => Object.fromEntries((await send('Performance.getMetrics')).result.metrics.map(m => [m.name, m.value]));
    await sleep(300);
    const m0 = await metrics(), t0 = Date.now();
    await sleep(SECS * 1000);
    const m1 = await metrics(), secs = (Date.now() - t0) / 1000;
    const fr = await ev('(() => { window.__stop = true; const f = window.__fr, d = []; for (let i = 1; i < f.length; i++) d.push(f[i] - f[i - 1]); return d.slice(-400); })()');
    await send('Emulation.setCPUThrottlingRate', { rate: 1 });
    // The probes are page-wide: put shadowBlur back.
    if (probe === 'noShadow') await ev("delete CanvasRenderingContext2D.prototype.shadowBlur; 1");
    const d = fr.slice().sort((x, y) => x - y), q = p => d.length ? +d[Math.min(d.length - 1, Math.floor(d.length * p))].toFixed(1) : 0;
    const per = k => (m1[k] - m0[k]) / secs;
    return { case: label, throttle: throttle + '×', layouts: Math.round(per('LayoutCount')), recalcs: Math.round(per('RecalcStyleCount')),
        layoutMs: Math.round(per('LayoutDuration') * 1000), recalcMs: Math.round(per('RecalcStyleDuration') * 1000), scriptMs: Math.round(per('ScriptDuration') * 1000),
        fps: Math.round(fr.length / secs), frameMedian: q(0.5), frameP95: q(0.95), over33ms: fr.filter(x => x > 33).length };
}

(async () => {
    const ctx = await boot({ gpu: !process.argv.includes('--cpu') });
    await ctx.send('Performance.enable');
    for (let i = 0; i < 100 && !(await ctx.ev("typeof window.switchGame === 'function' && !!window.__aim")); i++) await sleep(200);
    await ctx.ev("window.switchGame('aim')");
    await sleep(800);
    const rows = [];
    const idle = {}, play2d = {};
    for (const throttle of [1, 4]) {
        rows.push(idle[throttle] = await run(ctx, 'idle panel, no mouse', { mode: '2d', throttle, play: false, mouse: false }));
        rows.push(play2d[throttle] = await run(ctx, '2D', { mode: '2d', throttle }));
        if (AB) rows.push(await run(ctx, '2D, no mouse', { mode: '2d', throttle, mouse: false }));
        if (AB) rows.push(await run(ctx, '2D, no shadowBlur', { mode: '2d', throttle, probe: 'noShadow' }));
        if (AB) rows.push(await run(ctx, '2D, flat background', { mode: '2d', throttle, probe: 'flatBg' }));
        rows.push(await run(ctx, '3D', { mode: '3d', throttle }));
    }
    // Max, at a laptop's 150% display scaling: the 2D targets are 1.7× there.
    if (process.argv.includes('--max')) for (const throttle of [1, 4]) for (const mode of ['2d', '3d'])
        rows.push(await run(ctx, mode.toUpperCase() + ' Max @150%', { mode, throttle, max: true, dpr: 1.5 }));
    console.table(rows);
    if (ctx.errors.length) console.log('page errors:', ctx.errors.slice(0, 3));
    // The gate: a 2D run costs little more than the idle panel, even on a slow PC (4×), and holds
    // 60 fps with no long frames at full speed.
    const gates = [
        ['full speed: 2D holds 60 fps', play2d[1].fps >= 55 && play2d[1].over33ms <= idle[1].over33ms + 2, play2d[1].fps + ' fps, ' + play2d[1].over33ms + ' long'],
        ['4×: 2D restyle within 1.5× the idle panel', play2d[4].recalcMs <= Math.max(1.5 * idle[4].recalcMs, idle[4].recalcMs + 30), play2d[4].recalcMs + ' vs ' + idle[4].recalcMs + ' ms/s'],
        ['4×: at most 3 more long frames than idle', play2d[4].over33ms <= idle[4].over33ms + 3, play2d[4].over33ms + ' vs ' + idle[4].over33ms],
    ];
    gates.forEach(g => console.log((g[1] ? '  ✓ ' : '  ✗ ') + g[0] + ' — ' + g[2]));
    clearTimeout(ctx.bail); try { ctx.ws.close(); ctx.proc.kill(); } catch (_) {}
    process.exit(gates.every(g => g[1]) ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
