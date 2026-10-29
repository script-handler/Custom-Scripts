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
ok(L.aimLegacy('chaos', '2d', 'normal') && !L.aimLegacy('chaos', '3d', 'normal') && !L.aimLegacy('chaos', '2d', 'hard') && L.aimLegacy('screen', '3d', 'normal') && L.aimLegacy('target', '2d', 'normal') && !L.aimLegacy('target', '3d', 'normal') && !L.aimLegacy('flick', '2d', 'normal'), 'legacy records: Chaos 2D, Screen, Target 2D at Normal, as before');
ok(['chaos', 'sprint', 'endless'].every(id => L.aimRanked(id, '2d', 'normal') && L.aimRanked(id, '3d', 'normal') && !L.aimRanked(id, '2d', 'hard')) && L.aimRanked('levels', '3d', 'easy') && L.aimRanked('target', '3d', 'normal') && !L.aimRanked('flick', '2d', 'normal'), 'ranked: every ranked mode in 2D and 3D at Normal; Levels always; practice never');

// ── 2b. The ranked modes: Sprint, Endless, the bonus target, Levels ──
sec('modes');
{
    const sp2 = () => L.aimSpace2d(368, 492, [{ x: 252, y: 0, w: 116, h: 64 }], 1);
    // A bot: every gap ms it shoots the bonus, a vulnerable boss, a minion or a target; p = hit rate.
    const play = (run, gap, p, rnd, cap) => {
        L.aimStart(run, null, rnd);
        let t = 0, next = gap;
        while (!run.over && t < (cap || 6e5)) {
            const q = run.tg[0], track = run.base === 'tracking';
            L.aimTick(run, 16, track && q && rnd() < p ? { x: q.x, y: q.y } : null, rnd); t += 16;
            if (t < next || track) continue;
            next += gap;
            const k = run.tg.find(x => x.kind === 'bonus') || run.tg.find(x => x.kind === 'boss' && !x.armor) || run.tg.find(x => x.kind === 'minion') || run.tg.find(x => !x.kind);
            L.aimShoot(run, k && rnd() < p ? { x: k.x, y: k.y } : run.sp.ang ? { x: 33, y: 17.5 } : { x: 2, y: 2 }, rnd);
            for (let i = 0; i < run.tg.length; i++) for (let j = i + 1; j < run.tg.length; j++) { const a = run.tg[i], b = run.tg[j]; ok(L.aimDist(run.sp, a, b) >= a.r + b.r - 0.5, `${run.id} ${a.kind || 'target'}/${b.kind || 'target'} overlap`); }
        }
        return t;
    };
    for (const mode of ['2d', '3d']) {
        const sp = () => mode === '3d' ? L.aimSpace3d() : sp2();
        const s = L.aimNewRun('sprint', mode, 'normal', sp()); play(s, 600, 0.9, seeded(5));
        const sm = L.aimSummary(s), bk = L.aimBreakdown(s, sm);
        ok(s.over && s.hits === 50, `${mode} Sprint ends on the 50th hit`);
        ok(s.pen === (s.shots - s.hits) * 500, `${mode} Sprint: each miss adds 0.5 s`);
        ok(bk.total === bk.lines.reduce((a, l) => a + l[1], 0) && bk.lines[0][1] === 5000 && bk.lines.every(l => l[1] >= 0), `${mode} Sprint breakdown sums to its total`);
        for (const [gap, p] of [[700, 0.85], [160, 1]]) {
            const e = L.aimNewRun('endless', mode, 'normal', sp()), t = play(e, gap, p, seeded(9), 15 * 60e3);
            ok(e.over && t < 10 * 60e3, `${mode} Endless always ends (${gap} ms a shot, ${p * 100}%): ${(t / 1000).toFixed(0)} s`);
            const b = L.aimBreakdown(e, L.aimSummary(e));
            ok(b.total === b.lines.reduce((a, l) => a + l[1], 0) && b.lines[2][1] === 250 * e.bonusKills, `${mode} Endless breakdown sums; bonus kills pay 250`);
        }
        let r = 1;
        L.AIM_STAGES.forEach((G, i) => {
            const run = L.aimNewRun('levels', mode, 'normal', sp(), i, r); play(run, 450, 0.95, seeded(i + 3));
            const sm2 = L.aimSummary(run), b2 = L.aimBreakdown(run, sm2), st = L.aimStars(run, sm2);
            ok(run.clear && st >= 1, `${mode} stage ${i + 1} (${G.name}) can be cleared`);
            ok(b2.total === b2.lines.reduce((a, l) => a + l[1], 0), `${mode} stage ${i + 1} breakdown sums`);
            r = L.aimSkillNext(r, st);
            ok(r >= 0.8 && r <= 1.25, 'skill stays within 0.8–1.25');
        });
    }
    ok(L.AIM_STAGES.length === 10 && L.AIM_STAGES[9].goal === 'boss' && L.AIM_STAGES.every(G => G.s3 > G.s2 && G.len > 0 && G.n > 0), 'ten stages, the boss last, every star bar set');
    let r = 1; for (let i = 0; i < 20; i++) r = L.aimSkillNext(r, 3); ok(r === 1.25, 'skill caps at 1.25');
    for (let i = 0; i < 20; i++) r = L.aimSkillNext(r, 0); ok(r === 0.8, 'skill floors at 0.8');
    // The bonus: a lapsed window refills it; untouched, it escapes at 6 s.
    const e = L.aimNewRun('endless', '2d', 'normal', sp2()), rnd = seeded(11);
    L.aimStart(e, null, rnd);
    const bonus = L.aimAddTarget(e, null, rnd, 'bonus');
    ok(bonus && bonus.hp === 3 && Math.abs(bonus.r - e.tg[0].r * 1.6) < 1e-9, 'bonus: 3 hits, 1.6× a target');
    L.aimShoot(e, { x: bonus.x, y: bonus.y }, rnd); ok(bonus.hp === 2 && bonus.win > e.el, 'a bonus hit opens the 1.5 s window');
    for (let i = 0; i < 100; i++) L.aimTick(e, 16, null, rnd);
    ok(bonus.hp === 3, 'the window lapses: health refills');
    for (let i = 0; i < 3; i++) L.aimShoot(e, { x: bonus.x, y: bonus.y }, rnd);
    ok(e.bonusKills === 1 && e.frenzy > e.el && !e.tg.includes(bonus), 'three quick hits kill it: Frenzy starts');
    const b2 = L.aimAddTarget(e, null, rnd, 'bonus');
    for (let i = 0; i < 400 && e.tg.includes(b2); i++) L.aimTick(e, 16, null, rnd);
    ok(!e.tg.includes(b2) && e.el - b2.born >= 6000 && e.el - b2.born < 6100, 'an untouched bonus escapes at 6 s');
    // The boss: armoured until a minion dies, then 3 s open.
    const bs = L.aimNewRun('levels', '2d', 'normal', sp2(), 9, 1); L.aimStart(bs, null, rnd);
    const boss = bs.tg.find(t => t.kind === 'boss'), min = bs.tg.find(t => t.kind === 'minion');
    ok(boss && bs.tg.filter(t => t.kind === 'minion').length === 2 && boss.hp === 12, 'boss stage: the boss (12) and two minions');
    L.aimShoot(bs, { x: boss.x, y: boss.y }, rnd); ok(boss.hp === 12 && bs.shots === 0, 'armoured: a shot deflects and is not counted');
    L.aimShoot(bs, { x: min.x, y: min.y }, rnd); L.aimShoot(bs, { x: boss.x, y: boss.y }, rnd);
    ok(boss.hp === 11 && !boss.armor, 'a minion down opens the boss');
    for (let i = 0; i < 200; i++) L.aimTick(bs, 16, null, rnd);
    ok(boss.armor, 'the boss closes again after 3 s');
    ok(['chaos', 'sprint', 'endless', 'levels', 'flick', 'tracking'].every(id => L.AIM_MEDALS[id].every(t => t.every((v, i) => !i || v > t[i - 1]))), 'medal floors rise Bronze → Platinum');
    ok(L.aimMedal('sprint', '2d', 11000) === 3 && L.aimMedal('sprint', '2d', 10999) === 2 && L.aimMedal('levels', '2d', 26) === 3 && L.aimMedal('chaos', '3d', 0) === 0, 'medal tiers read the floors');
    const st = { camp: {} }, c = L.aimCamp(st, '2d');
    ok(c.stars.length === 10 && c.lives === 3 && c.skill === 1 && L.aimCamp(st, '2d') === st.camp['2d'], 'a campaign starts at stage 1 with 3 lives');
}

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
ok(src.includes("modes: { chaos: 'Chaos', sprint: 'Sprint', endless: 'Endless', levels: 'Levels', screen: 'Screen', target: 'Target' }") && src.includes("if (game === 'aim')    return aimLbMode();") && src.includes('dims: true'), "AimLab's board: six tabs and a 2D | 3D toggle, opened on the mode played");
ok(src.includes("if (mode === 'screen' || mode === 'target') return lbBoardValue(player, 'reflex', mode);") && src.includes("(mode === 'targetFps' ? 'reflex:' : 'aim:') + mode"), "the reaction tabs read RefleX's records; the rest read aim:<mode>[Fps]");
ok(src.includes("put(k, aimB[m + '|' + d + '|normal'])") && src.includes("put('reflex:targetFps', aimB['target|3d|normal'])"), 'collectGameModeBests sends the ranked bests');
ok(['aimSprinter', 'aimSurvivor', 'aimGiantSlayer', 'aimCampaigner'].every(k => new RegExp(k + ':\\s*\\{ name').test(src) && new RegExp(k + ': \\d+').test(src)), 'the four AimLab achievements, each with XP');
ok(/if \(typeof aimOnThemeChange === 'function'\) aimOnThemeChange\(\)/.test(src), 'a theme change reaches AimLab');

console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
