// AimLab checks: the spawner never overlaps, scoring, RefleX parity, 3D hits, the crosshair code,
// the splice and the host wiring.   "C:/Program Files/nodejs/node.exe" aim-dev/aim-verify.js
const fs = require('fs');
const path = require('path');
const load = require('./load');
const { BLOCKS, devBlock, locate, TARGET, trim } = require('./reinsert');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.error('  ✗ ' + m); } };
const sec = t => console.log('\n' + t);
function seeded(s) { return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

const L = load();

// ── 1. The spawner: 2D and 3D, every scenario and difficulty, never an overlap ──
sec('spawner');
const spaces = [
    ['316 idle', () => L.aimSpace2d(316, 366, [], 1)],
    ['368 run', () => L.aimSpace2d(368, 492, [{ x: 252, y: 0, w: 116, h: 64 }], 1)],
    ['Max 2D', () => L.aimSpace2d(1280, 800, [{ x: 0, y: 0, w: 1280, h: 96 }, { x: 0, y: 704, w: 1280, h: 96 }], 1.7)],
    ['3D', () => L.aimSpace3d()]
];
let spawns = 0, relaxed = 0, nulls = 0, clearMiss = 0;
for (const [label, mk] of spaces) for (const id of ['chaos', 'flick', 'shrink']) for (const diff of Object.keys(L.AIM_DIFF)) {
    const rnd = seeded(spawns + 7), sp = mk(), run = L.aimNewRun(id, sp.ang ? '3d' : '2d', diff, sp);
    for (let i = 0; i < 700; i++) {
        const aim = sp.ang ? { x: (rnd() - 0.5) * 40, y: (rnd() - 0.5) * 20 } : { x: rnd() * sp.w, y: rnd() * sp.h };
        if (run.tg.length) run.tg.splice(Math.floor(rnd() * run.tg.length), 1);
        const before = run.tg.slice();
        const t = L.aimAddTarget(run, aim, rnd);
        if (!t) { nulls++; continue; }
        spawns++;
        for (const q of before) {
            const d = L.aimDist(sp, t, q);
            ok(d >= t.r + q.r - 1e-9, `${label} ${id} ${diff}: overlap ${d.toFixed(2)} < ${(t.r + q.r).toFixed(2)}`);
            if (d < t.r + q.r + sp.gap - 1e-9) relaxed++;
        }
        if (L.aimDist(sp, t, aim) < t.r + sp.clear) clearMiss++;
        if (!sp.ang) {
            ok(t.x - t.r >= sp.edge - 1e-9 && t.x + t.r <= sp.w - sp.edge + 1e-9 && t.y - t.r >= sp.edge - 1e-9 && t.y + t.r <= sp.h - sp.edge + 1e-9, `${label} ${id}: off the edge`);
            for (const h of sp.holes) { const dx = Math.max(h.x - t.x, 0, t.x - h.x - h.w), dy = Math.max(h.y - t.y, 0, t.y - h.y - h.h); ok(dx * dx + dy * dy >= t.r * t.r - 1e-9, `${label} ${id}: under the HUD`); }
        } else ok(t.x - t.r >= sp.y0 - 1e-9 && t.x + t.r <= sp.y1 + 1e-9 && t.y - t.r >= sp.p0 - 1e-9 && t.y + t.r <= sp.p1 + 1e-9, `3D ${id}: outside the window`);
    }
}
ok(spawns >= 20000, `20,000+ spawns (got ${spawns})`);
console.log(`  ${spawns} spawns, 0 overlaps allowed; gap relaxed on ${relaxed} pairs, aim zone yielded ${clearMiss}×, no room ${nulls}×`);

// Drift (Chaos Hard) re-checks every frame: no pair ever closes to an overlap.
sec('drift');
for (const [label, mk] of spaces) {
    const rnd = seeded(99), sp = mk(), run = L.aimNewRun('chaos', sp.ang ? '3d' : '2d', 'hard', sp);
    L.aimFill(run, null, rnd);
    let worst = Infinity;
    for (let f = 0; f < 1800 && !run.over; f++) {
        L.aimTick(run, 16, null, rnd);
        for (let i = 0; i < run.tg.length; i++) for (let j = i + 1; j < run.tg.length; j++) { const a = run.tg[i], b = run.tg[j]; worst = Math.min(worst, L.aimDist(sp, a, b) - a.r - b.r); }
    }
    ok(worst >= -0.5, `${label}: drift closed to ${worst.toFixed(2)}`);
    ok(run.tg.some(t => t.vx || t.vy), `${label}: Hard Chaos drifts`);
}

// ── 2. Scoring ──
sec('scoring');
{
    const rnd = seeded(3), sp = L.aimSpace2d(368, 492, [], 1), run = L.aimNewRun('chaos', '2d', 'normal', sp);
    L.aimFill(run, null, rnd);
    for (let i = 0; i < 400 && !run.over; i++) {
        L.aimTick(run, 75, null, rnd);
        const t = run.tg[0], aim = rnd() < 0.8 && t ? { x: t.x + (rnd() - 0.5) * t.r, y: t.y } : { x: 2, y: 2 };
        L.aimShoot(run, aim, rnd);
    }
    ok(run.over && run.el === 30000, 'Chaos runs 30 s');
    ok(run.score === run.hits * 10, `Chaos Normal is hits × 10 (${run.score} vs ${run.hits})`);
    const s = L.aimSummary(run);
    ok(s.acc === Math.round(run.hits / run.shots * 100), 'accuracy is hits / shots');
    ok(L.aimLiveAcc(L.aimNewRun('chaos', '2d', 'normal', sp)) === null, "accuracy reads '—' before the first shot");
    ok(L.aimMult(3) === 1 && L.aimMult(4) === 1.25 && L.aimMult(6) === 1.5 && L.aimMult(9) === 2 && L.aimMult(14) === 2, 'streak multiplier matches the design (4 ×1.25, 6 ×1.5, 9 ×2)');
    // The hit test is the drawn radius: no slop.
    const t = run.tg[0] || L.aimAddTarget(run, null, rnd);
    ok(!!L.aimHitAt(run, { x: t.x + t.r - 0.01, y: t.y }) && !L.aimHitAt(run, { x: t.x + t.r + 0.01, y: t.y }), '2D hit = the drawn edge');
    const sh = L.aimNewRun('shrink', '2d', 'normal', sp); L.aimFill(sh, null, rnd);
    for (let i = 0; i < 200; i++) L.aimTick(sh, 16, null, rnd);
    ok(sh.shots >= 3 && sh.hits === 0, 'Shrink: a vanish counts as a miss');
    const tr = L.aimNewRun('tracking', '2d', 'normal', sp); L.aimFill(tr, null, rnd);
    for (let i = 0; i < 300; i++) { const q = tr.tg[0]; L.aimTick(tr, 16, { x: q.x, y: q.y }, rnd); }
    ok(tr.onMs > 4000 && tr.score > 0 && L.aimLiveAcc(tr) >= 99, 'Tracking scores time on target');
}
ok(L.aimRanked('chaos', '2d', 'normal') && !L.aimRanked('chaos', '3d', 'normal') && !L.aimRanked('chaos', '2d', 'hard') && L.aimRanked('screen', '3d', 'normal') && L.aimRanked('target', '2d', 'normal') && !L.aimRanked('target', '3d', 'normal') && !L.aimRanked('flick', '2d', 'normal'), 'ranked: Chaos 2D, Screen, Target 2D at Normal');

// ── 3. 3D hits: the aim ray against the target's angular radius ──
sec('3D');
{
    const sp = L.aimSpace3d(), run = L.aimNewRun('flick', '3d', 'normal', sp);
    run.tg.push({ id: 99, x: 10, y: 5, r: 1.5, r0: 1.5, born: 0 });
    ok(!!L.aimHitAt(run, { x: 10, y: 5 }), 'dead centre hits');
    const edge = (d) => ({ x: 10 + d / Math.cos(5 * Math.PI / 180), y: 5 });
    ok(!!L.aimHitAt(run, edge(1.49)) && !L.aimHitAt(run, edge(1.52)), 'the edge of the cone is the edge of the hit');
    ok(Math.abs(L.aimAngle({ x: 0, y: 0 }, { x: 0, y: 10 }) - 10) < 1e-9, 'angles are degrees from the camera');
}

// ── 4. RefleX parity: the old click rules, simulated, against the new state machine ──
sec('reaction parity');
function oldReflex(id, clicks, rv) {
    const cfg = id === 'screen' ? { rounds: 5, min: 1000, max: 4000, tg: false } : { rounds: 8, min: 800, max: 3000, tg: true };
    const s = { round: 0, wait: false, can: false, start: 0, times: [], fs: 0, last: 0, done: false };
    let ri = 0, timers = [], go = null;
    const startRound = (t, n) => { if (n > cfg.rounds) { s.done = true; return; } s.round = n; s.wait = true; s.can = false; go = { t: t + rv[ri++] * (cfg.max - cfg.min) + cfg.min, fn: tt => { s.start = tt; s.can = true; s.wait = false; } }; timers.push(go); };
    const falseStart = t => { s.fs++; s.can = false; timers = timers.filter(x => x !== go); if (s.fs >= 3) { while (s.times.length < cfg.rounds) s.times.push(cfg.max); s.done = true; return; } timers.push({ t: t + 1200, fn: tt => startRound(tt, s.round) }); };
    const click = (t, on) => { if (t - s.last < 80) return; s.last = t; if (s.wait) return falseStart(t); if (!s.can) return; if (cfg.tg && !on) return falseStart(t); s.times.push(Math.round(t - s.start)); s.can = false; timers.push({ t: t + 300, fn: tt => startRound(tt, s.round + 1) }); };
    startRound(0, 1);
    const q = clicks.slice();
    while (!s.done) {
        timers.sort((a, b) => a.t - b.t);
        const tm = timers[0], c = q[0];
        if (tm && (!c || tm.t <= c.t)) { timers.shift(); tm.fn(tm.t); } else if (c) { q.shift(); click(c.t, c.on); } else break;
    }
    return { times: s.times, fs: s.fs, fail: s.fs >= 3 };
}
let runs = 0;
for (const id of ['screen', 'target']) for (let seed = 1; seed <= 150; seed++) {
    const rnd = seeded(seed * 31 + (id === 'target' ? 7 : 0)), rv = [], rec = () => { const v = rnd(); rv.push(v); return v; };
    const R = L.aimReactNew(id, 'normal'), clicks = [];
    let t = 0;
    L.aimReactNext(R, t, rec);
    for (let guard = 0; R.phase !== 'done' && guard < 200; guard++) {
        if (R.phase === 'wait') {
            const a = rnd();
            if (a < 0.18) { t = R.until - 40; clicks.push({ t, on: false }); L.aimReactClick(R, t, false); continue; }
            t = R.until; L.aimReactTick(R, t, rec, () => ({ x: 0, y: 0, r: 30 })); L.aimReactPainted(R, t);
            const miss = id === 'target' && a > 0.9, rt = 120 + Math.floor(rnd() * 300);
            t += rt; clicks.push({ t, on: !miss }); L.aimReactClick(R, t, !miss);
        } else { t = R.until; L.aimReactTick(R, t, rec); }
    }
    const o = oldReflex(id, clicks, rv), n = L.aimReactSummary(R);
    ok(JSON.stringify(o.times) === JSON.stringify(n.times) && o.fs === n.fs && o.fail === n.fail, `${id} seed ${seed}: old ${JSON.stringify(o)} vs new ${JSON.stringify({ times: n.times, fs: n.fs, fail: n.fail })}`);
    runs++;
}
console.log(`  ${runs} scripted runs, old rules = new rules`);
{
    const R = L.aimReactNew('screen', 'normal'); L.aimReactNext(R, 0, () => 0.5);
    ok(L.aimReactClick(R, 100, true) === 'false' && L.aimReactClick(R, 150, true) === 'debounce', '80 ms debounce');
    ok(L.aimReactClick(R, 400, true) === 'false' && R.fs === 2, 'a click in the cool-off after an early click is another false start');
    ok(L.aimReactClick(R, 700, true) === 'fail' && R.times.length === 5 && R.times.every(v => v === 4000), 'the third ends the run, rounds counted at 4,000 ms');
    const G = L.aimReactNew('screen', 'normal'); L.aimReactNext(G, 0, () => 0); L.aimReactTick(G, 1000, () => 0);
    ok(L.aimReactClick(G, 1001, true) === 'false', 'a click before GO is painted is a false start');
}

// ── 5. Storage and the crosshair code ──
sec('storage');
{
    const L2 = load({ store: { aimChaosHighScore: '730', reflexHighScores: JSON.stringify({ screen: { best: 198, avg: 219 }, target: { best: 286, avg: 300 } }) } });
    const st = L2.aimLoad();
    ok(L2.aimBestOf(st, 'chaos', '2d', 'normal') === 730, 'Chaos 2D Normal best includes aimChaosHighScore');
    ok(L2.aimBestOf(st, 'screen', '2d', 'normal') === 198 && L2.aimBestOf(st, 'target', '2d', 'normal') === 286, 'Reaction bests include reflexHighScores');
    ok(L2.aimBestOf(st, 'chaos', '3d', 'normal') === 0, '3D Chaos keeps its own best');
    const x = Object.assign({}, L.AIM_XH_DEFAULT, { xs: 'circle', color: '#FF4FD8', len: 9, gap: 0, outline: false, dot: false, op: 70, dyn: false });
    const back = L.aimXhParse(L.aimXhCode(x));
    ok(back && back.xs === 'circle' && back.color === '#FF4FD8' && back.len === 9 && back.gap === 0 && !back.outline && !back.dot && back.op === 70 && !back.dyn, 'crosshair code round-trips');
    ok(L.aimXhParse('AL1-Q00') === null && L.aimXhParse('') === null, 'a bad code is refused');
    ok(L.aimXhParse('AL1-X4CF0B0-99-99-99-9-9-500-1').len === 20, 'code values are clamped');
}

// ── 6. The splice and the host wiring ──
sec('host');
const src = fs.readFileSync(TARGET, 'utf8');
for (const b of BLOCKS) {
    try { const at = locate(src, b); ok(trim(src.slice(at.start, at.end)) === trim(devBlock(b, '\n')), b.name + ' block is byte-identical to aim-dev/ (run reinsert.js)'); }
    catch (e) { ok(false, e.message); }
}
const gone = ['handleAimClick', 'startAimGame', 'renderAimGame', 'aimChaosMode', 'startReflexGame', 'handleReflexClick', 'updateReflexDisplay', 'reflexGameModes', 'multi-game-area', 'gameAreaElement', 'reflexMode', 'startReflexGameBtn', 'aim-controls', 'reflex-controls', 'aim-results'];
for (const g of gone) ok(!new RegExp('\\b' + g.replace('-', '\\-') + '\\b').test(src), 'old code removed: ' + g);
ok(/aim:\s*\{\s*el:\s*'aim-root'/.test(src) && !/\breflex:\s*\{\s*el:/.test(src), 'GAME_PANELS: AimLab on aim-root, no RefleX panel');
ok(!src.includes("switchGame('reflex')"), 'no RefleX switcher button');
ok(/case 'aim':\s*aimDetach\(\)/.test(src), 'cleanupCurrentGame detaches AimLab');
ok(src.includes("if (game === 'reflex') return aimReactLbMode()"), "the reflex board follows AimLab's Reaction scenario");
ok(!src.includes("gameScoreBtn('reflex'") && src.includes("gameScoreBtn('aim', 'aim-high-score', 'aim-current-score')"), 'one board button in the header (no second RefleX one)');
ok(/aim:\s*\{[^\n]*\n\s*modes: \{ chaos: 'Chaos', screen: 'Screen', target: 'Target' \}/.test(src) && src.includes("if (game === 'aim')    return aimLbMode();"), "AimLab's board has Chaos, Screen and Target tabs, opened on the scenario played");
ok(src.includes("if (game === 'aim') { if (mode === 'screen' || mode === 'target') return lbBoardValue(player, 'reflex', mode);"), "the reaction tabs read RefleX's records");
ok(/if \(typeof aimOnThemeChange === 'function'\) aimOnThemeChange\(\)/.test(src), 'a theme change reaches AimLab');

console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
