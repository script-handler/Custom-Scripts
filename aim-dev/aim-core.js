    // ── AimLab core: scenarios, spawn rules, scoring, the reaction rules. No DOM (aim-ui.js draws). ──
    // Design: aim-dev/ref/design (Canvas A12 spawn rules, A13 timing). Plan: AIMLAB_PLAN.md.
    const AIM_SCEN = {
        // size: 2D diameter in px; ang: 3D angular radius in degrees (about the 2D size at the 95° default FOV).
        chaos:    { name: 'Chaos', group: 'aim', len: 30, count: 3, size: 46, ang: 6.5, desc: 'Three live targets; hit one, another spawns. Drift at Hard.' },
        flick:    { name: 'Flick', group: 'aim', len: 30, count: 1, size: 26, ang: 3.8, desc: 'One small target at a time. Measures time-to-kill.' },
        tracking: { name: 'Tracking', group: 'aim', len: 45, count: 1, size: 50, ang: 7, desc: 'Keep aim on a curving target to fill the ring.' },
        shrink:   { name: 'Shrink', group: 'aim', len: 30, count: 3, size: 50, ang: 7, life: 1600, desc: 'Hit before they shrink away. A vanish is a miss.' },
        // RefleX's two modes: rounds and delays are its Normal, unchanged.
        screen:   { name: 'Screen', group: 'react', rounds: 5, minDelay: 1000, maxDelay: 4000, noCam: true, desc: 'Wait for green, then click anywhere.' },
        target:   { name: 'Target', group: 'react', rounds: 8, minDelay: 800, maxDelay: 3000, size: 60, ang: 8, desc: 'Click the target the moment it appears.' }
    };
    const AIM_ORDER = ['chaos', 'flick', 'tracking', 'shrink', 'screen', 'target'];
    // delay: [min ×, max ×] on the reaction wait.
    const AIM_DIFF = {
        easy:   { name: 'Easy', sub: 'BIG · SLOW', size: 1.3, speed: 0.6, life: 1.5, delay: [1, 0.5] },
        normal: { name: 'Normal', sub: 'RANKED', size: 1, speed: 1, life: 1, delay: [1, 1] },
        hard:   { name: 'Hard', sub: 'SMALL · DRIFT', size: 0.75, speed: 1.5, life: 0.7, delay: [0.6, 1.25], drift: true }
    };
    const AIM_GAP_PX = 24, AIM_EDGE_PX = 12, AIM_CLEAR_PX = 48, AIM_GAP_DEG = 6, AIM_CLEAR_DEG = 10, AIM_TRIES = 40;
    const AIM_DEBOUNCE_MS = 80, AIM_FS_LIMIT = 3, AIM_SOON_MS = 1200, AIM_NEXT_MS = 300, AIM_COUNT_MS = 3000, AIM_FX_MS = 600;
    // 3D: targets sit on a shell AIM_D from the camera, inside this window (degrees from the room's forward).
    const AIM_D = 12, AIM_YAW = 34, AIM_P0 = -10, AIM_P1 = 18;
    const AIM_KEY = 'aimLab';
    const AIM_XH_DEFAULT = { xs: 'crossdot', color: '#4CF0B0', len: 6, thick: 2, gap: 4, outline: true, ow: 1, dot: true, ds: 2, op: 100, dyn: true };
    const AIM_SET_DEFAULT = { sens: 1, fov: 95, invY: false, sound: true, hitSnd: 'tick', timerBar: true, tcolor: '#FF5D73', bg: 'room' };

    const aimDir = (y, p) => { const a = y * Math.PI / 180, b = p * Math.PI / 180; return [Math.cos(b) * Math.sin(a), Math.sin(b), Math.cos(b) * Math.cos(a)]; };
    const aimAngle = (a, b) => { const u = aimDir(a.x, a.y), v = aimDir(b.x, b.y); return Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1] + u[2] * v[2]))) * 180 / Math.PI; };
    // Centre distance: px in 2D, degrees from the camera in 3D (depth can't hide an overlap).
    const aimDist = (sp, a, b) => sp.ang ? aimAngle(a, b) : Math.hypot(a.x - b.x, a.y - b.y);
    const aimMult = s => s >= 9 ? 2 : s >= 6 ? 1.5 : s >= 4 ? 1.25 : 1;
    const aimRanked = (id, mode, diff) => diff === 'normal' && (id === 'screen' || ((id === 'chaos' || id === 'target') && mode === '2d'));
    const aimBestKey = (id, mode, diff) => id + '|' + (AIM_SCEN[id].noCam ? '-' : mode) + '|' + diff;
    const aimMean = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;

    // A spawn space. 2D: px, with holes (the in-run HUD) no target may sit under. k scales sizes (Max).
    function aimSpace2d(w, h, holes, k) { return { ang: false, w, h, k: k || 1, holes: holes || [], edge: AIM_EDGE_PX, gap: AIM_GAP_PX, clear: AIM_CLEAR_PX }; }
    function aimSpace3d() { return { ang: true, k: 1, holes: [], edge: 0, gap: AIM_GAP_DEG, clear: AIM_CLEAR_DEG, y0: -AIM_YAW, y1: AIM_YAW, p0: AIM_P0, p1: AIM_P1 }; }
    function aimRadius(sp, id, diff) { const S = AIM_SCEN[id], d = AIM_DIFF[diff].size; return sp.ang ? S.ang * d : S.size / 2 * d * sp.k; }

    // Rejection sampling: dist(A,B) ≥ rA + rB + gap against every live target, the edge clear of the aim,
    // off the HUD. 40 tries, then the gap relaxes by 25% at a time down to 0; never an overlap (null if no room).
    function aimSpawnAt(sp, r, live, aim, rnd) {
        rnd = rnd || Math.random;
        const fits = (p, gap, clear) => {
            for (const q of sp.holes) { const dx = Math.max(q.x - p.x, 0, p.x - q.x - q.w), dy = Math.max(q.y - p.y, 0, p.y - q.y - q.h); if (dx * dx + dy * dy < r * r) return false; }
            if (aim && clear > 0 && aimDist(sp, p, aim) < r + clear) return false;
            for (const t of live) if (aimDist(sp, p, t) < r + t.r + gap) return false;
            return true;
        };
        const lo = sp.ang ? [sp.y0 + r, sp.p0 + r] : [r + sp.edge, r + sp.edge], hi = sp.ang ? [sp.y1 - r, sp.p1 - r] : [sp.w - r - sp.edge, sp.h - r - sp.edge];
        if (hi[0] < lo[0] || hi[1] < lo[1]) return null;
        const pick = () => ({ x: lo[0] + rnd() * (hi[0] - lo[0]), y: lo[1] + rnd() * (hi[1] - lo[1]) });
        for (let g = sp.gap; ; g = g > 0.5 ? g * 0.75 : 0) {
            for (let i = 0; i < AIM_TRIES; i++) { const p = pick(); if (fits(p, g, sp.clear)) return p; }
            if (!g) break;
        }
        // Last resort: scan for any free spot, the aim zone included.
        const st = sp.ang ? 0.5 : 4;
        for (let y = lo[1]; y <= hi[1]; y += st) for (let x = lo[0]; x <= hi[0]; x += st) if (fits({ x, y }, 0, 0)) return { x, y };
        return null;
    }

    // ── Aim runs ─────────────────────────────────────────────────────
    function aimNewRun(id, mode, diff, sp) {
        return { id, mode, diff, sp, len: AIM_SCEN[id].len * 1000, el: 0, score: 0, hits: 0, shots: 0, streak: 0, bestStreak: 0, nid: 1,
            tg: [], kills: [], marks: [], fx: [], trail: [], onMs: 0, onRun: 0, spark: new Array(30).fill(0), over: false };
    }
    function aimAddTarget(run, aim, rnd) {
        rnd = rnd || Math.random;
        const S = AIM_SCEN[run.id], D = AIM_DIFF[run.diff], sp = run.sp, r = aimRadius(sp, run.id, run.diff);
        if (run.id === 'tracking') {
            const t = { id: run.nid++, r, r0: r, born: run.el, ph: [rnd() * 6.3, rnd() * 6.3, rnd() * 6.3, rnd() * 6.3] };
            aimTrackPos(run, t); run.tg.push(t); return t;
        }
        const p = aimSpawnAt(sp, r, run.tg, aim, rnd);
        if (!p) return null;
        const t = { id: run.nid++, x: p.x, y: p.y, r, r0: r, born: run.el, vx: 0, vy: 0 };
        if (D.drift && run.id === 'chaos') { const a = rnd() * 6.283, v = (sp.ang ? 6 : 60 * sp.k) * D.speed; t.vx = Math.cos(a) * v; t.vy = Math.sin(a) * v; }
        run.tg.push(t);
        return t;
    }
    function aimFill(run, aim, rnd) { const n = AIM_SCEN[run.id].count; for (let i = run.tg.length; i < n; i++) if (!aimAddTarget(run, aim, rnd)) break; }
    // Tracking: two sines per axis, phases per target; speed scales with difficulty.
    function aimTrackPos(run, t) {
        const sp = run.sp, s = run.el / 1000 * AIM_DIFF[run.diff].speed, p = t.ph;
        const ux = 0.62 * Math.sin(0.9 * s + p[0]) + 0.38 * Math.sin(1.7 * s + p[1]), uy = 0.6 * Math.sin(1.1 * s + p[2]) + 0.4 * Math.sin(0.7 * s + p[3]);
        if (sp.ang) { t.x = ux * (sp.y1 - t.r) * 0.85; t.y = (sp.p0 + sp.p1) / 2 + uy * ((sp.p1 - sp.p0) / 2 - t.r); return; }
        const top = sp.holes.reduce((m, q) => Math.max(m, q.y + q.h), sp.edge);
        t.x = sp.w / 2 + ux * (sp.w / 2 - t.r - sp.edge);
        t.y = (top + sp.h - sp.edge) / 2 + uy * ((sp.h - sp.edge - top) / 2 - t.r);
    }
    // Rescale a live 2D run when the viewport changes size (footer hides, Max opens).
    function aimRescale(run, sp) {
        const o = run.sp; run.sp = sp;
        if (sp.ang || o.ang || !o.w || !o.h) return;
        const sx = sp.w / o.w, sy = sp.h / o.h, sk = sp.k / o.k;
        for (const t of run.tg) { t.x *= sx; t.y *= sy; t.r *= sk; t.r0 *= sk; t.vx *= sk; t.vy *= sk; }
        for (const m of run.marks.concat(run.fx)) { m.x *= sx; m.y *= sy; if (m.r) m.r *= sk; }
        for (const p of run.trail) { p.x *= sx; p.y *= sy; }
    }
    function aimHitAt(run, aim) { for (const t of run.tg) if (aimDist(run.sp, aim, t) <= t.r) return t; return null; }
    function aimShoot(run, aim, rnd) {
        if (run.over || run.id === 'tracking') return null;
        run.shots++;
        const t = aimHitAt(run, aim);
        if (!t) { run.streak = 0; run.marks.push({ x: aim.x, y: aim.y, at: run.el }); return null; }
        run.hits++; run.streak++; run.bestStreak = Math.max(run.bestStreak, run.streak);
        const ttk = run.el - t.born, m = aimMult(run.streak);
        // Chaos is hits × 10, as the ranked board always was; the others pay the streak multiplier.
        const pts = run.id === 'chaos' ? 10 : Math.round(10 * m);
        run.score += pts;
        run.kills.push({ at: run.el, ttk });
        run.spark[Math.min(29, Math.floor(run.el / run.len * 30))]++;
        const sub = run.id === 'flick' ? 'TTK ' + Math.round(ttk) + ' MS' : run.streak < 2 ? '' : run.id === 'chaos' ? 'STREAK ' + run.streak : (m > 1 ? '×' + m + ' · ' : '') + 'STREAK ' + run.streak;
        run.fx.push({ x: t.x, y: t.y, r: t.r, at: run.el, pts: '+' + pts, sub });
        run.tg = run.tg.filter(q => q !== t);
        aimFill(run, aim, rnd);
        return t;
    }
    function aimTick(run, dt, aim, rnd) {
        if (run.over) return;
        run.el = Math.min(run.len, run.el + dt);
        const sp = run.sp, D = AIM_DIFF[run.diff], s = dt / 1000;
        if (run.id === 'tracking') {
            const t = run.tg[0];
            if (t) {
                aimTrackPos(run, t);
                run.trail.push({ x: t.x, y: t.y }); if (run.trail.length > 40) run.trail.shift();
                const on = !!aim && aimDist(sp, aim, t) <= t.r;
                t.on = on;
                if (on) {
                    run.onMs += dt; run.onRun += dt; run.streak = Math.floor(run.onRun / 1000); run.bestStreak = Math.max(run.bestStreak, run.streak);
                    run.score += s * 40 * aimMult(run.streak);
                    run.spark[Math.min(29, Math.floor(run.el / run.len * 30))] += dt;
                } else { run.onRun = 0; run.streak = 0; }
            }
        } else {
            for (const t of run.tg) {
                if (!t.vx && !t.vy) continue;
                t.x += t.vx * s; t.y += t.vy * s;
                const lo = sp.ang ? [sp.y0, sp.p0] : [sp.edge, sp.edge], hi = sp.ang ? [sp.y1, sp.p1] : [sp.w - sp.edge, sp.h - sp.edge];
                if (t.x - t.r < lo[0] && t.vx < 0 || t.x + t.r > hi[0] && t.vx > 0) t.vx = -t.vx;
                if (t.y - t.r < lo[1] && t.vy < 0 || t.y + t.r > hi[1] && t.vy > 0) t.vy = -t.vy;
                for (const q of sp.holes) if (t.x + t.r > q.x && t.x - t.r < q.x + q.w && t.y + t.r > q.y && t.y - t.r < q.y + q.h && t.vy < 0) t.vy = -t.vy;
            }
            // Drift never closes below the gap: approaching pairs swap their normal velocities and part.
            for (let i = 0; i < run.tg.length; i++) for (let j = i + 1; j < run.tg.length; j++) {
                const a = run.tg[i], b = run.tg[j], d = aimDist(sp, a, b), min = a.r + b.r + sp.gap;
                if (d >= min || !d) continue;
                const nx = (b.x - a.x) / d, ny = (b.y - a.y) / d, va = a.vx * nx + a.vy * ny, vb = b.vx * nx + b.vy * ny;
                if (va - vb > 0) { a.vx += (vb - va) * nx; a.vy += (vb - va) * ny; b.vx += (va - vb) * nx; b.vy += (va - vb) * ny; }
                const push = (min - d) / 2 + 0.01; a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
            }
            if (run.id === 'shrink') {
                const life = AIM_SCEN.shrink.life * D.life;
                for (const t of run.tg.slice()) {
                    const age = run.el - t.born;
                    t.r = t.r0 * Math.max(0, 1 - age / life);
                    if (age >= life) { run.shots++; run.streak = 0; run.fx.push({ x: t.x, y: t.y, r: t.r0, at: run.el, vanish: true }); run.tg = run.tg.filter(q => q !== t); }
                }
                aimFill(run, aim, rnd);
            }
        }
        run.marks = run.marks.filter(m => run.el - m.at < AIM_FX_MS);
        run.fx = run.fx.filter(m => run.el - m.at < AIM_FX_MS);
        if (run.el >= run.len) run.over = true;
    }
    function aimSummary(run) {
        const track = run.id === 'tracking', iv = run.kills.map((k, i) => k.at - (i ? run.kills[i - 1].at : 0));
        const top = Math.max(1, ...run.spark);
        return {
            score: Math.round(run.score), hits: run.hits, shots: run.shots, bestStreak: run.bestStreak,
            acc: track ? (run.el ? Math.round(run.onMs / run.el * 100) : 0) : run.shots ? Math.round(run.hits / run.shots * 100) : 0,
            react: Math.round(aimMean(iv)), ttk: Math.round(aimMean(run.kills.map(k => k.ttk))), onS: run.onMs / 1000,
            spark: run.spark.map(v => v / top)
        };
    }
    // Live accuracy: '—' until the first shot (tracking: share of time on target).
    const aimLiveAcc = run => run.id === 'tracking' ? (run.el > 0 ? Math.round(run.onMs / run.el * 100) : null) : run.shots ? Math.round(run.hits / run.shots * 100) : null;

    // ── Reaction (RefleX's rules) ────────────────────────────────────
    // 80 ms debounce · a click before GO is a false start, as is Target's off-target click · the third
    // ends the run, its missing rounds counted at the max delay · 1.2 s cool-off, 0.3 s between rounds.
    function aimReactNew(id, diff) {
        const S = AIM_SCEN[id], d = AIM_DIFF[diff].delay;
        return { id, diff, rounds: S.rounds, min: S.minDelay * d[0], max: S.maxDelay * d[1], round: 0, phase: 'idle', times: [], fs: 0, last: -1e9, until: 0, goAt: 0, fromWait: false, fail: false, tg: null };
    }
    function aimReactArm(R, now, rnd) { R.phase = 'wait'; R.tg = null; R.goAt = 0; R.until = now + R.min + (rnd || Math.random)() * (R.max - R.min); }
    function aimReactNext(R, now, rnd) { if (R.round >= R.rounds) { R.phase = 'done'; return; } R.round++; aimReactArm(R, now, rnd); }
    // spawn() places Target's target when GO lands; returns true when the phase changed.
    function aimReactTick(R, now, rnd, spawn) {
        if (R.phase === 'wait' && now >= R.until) { R.phase = 'go'; R.goAt = 0; if (R.id === 'target' && spawn) R.tg = spawn(); return true; }
        if (R.phase === 'time' && now >= R.until) { aimReactNext(R, now, rnd); return true; }
        if (R.phase === 'soon' && now >= R.until) { aimReactArm(R, now, rnd); return true; }
        return false;
    }
    // GO is timed from the frame that first paints it, not from the timer.
    function aimReactPainted(R, now) { if (R.phase === 'go' && !R.goAt) R.goAt = now; }
    function aimReactFalse(R, now, fromWait) {
        R.fs++; R.tg = null;
        if (R.fs >= AIM_FS_LIMIT) { while (R.times.length < R.rounds) R.times.push(R.max); R.fail = true; R.phase = 'done'; return 'fail'; }
        R.phase = 'soon'; R.fromWait = fromWait; R.until = now + AIM_SOON_MS;
        return 'false';
    }
    function aimReactClick(R, now, onTarget) {
        if (now - R.last < AIM_DEBOUNCE_MS) return 'debounce';
        R.last = now;
        // Unpainted GO counts as the wait: nobody saw it.
        if (R.phase === 'wait' || (R.phase === 'go' && !R.goAt) || (R.phase === 'soon' && R.fromWait)) return aimReactFalse(R, now, true);
        if (R.phase !== 'go') return 'ignored';
        if (R.id === 'target' && !onTarget) return aimReactFalse(R, now, false);
        R.times.push(Math.round(now - R.goAt)); R.phase = 'time'; R.tg = null; R.until = now + AIM_NEXT_MS;
        return 'hit';
    }
    // As RefleX: the average counts penalty rounds, the best is the fastest round.
    const aimReactSummary = R => ({ avg: Math.round(aimMean(R.times)), best: R.times.length ? Math.min(...R.times) : 0, fs: R.fs, fail: R.fail, times: R.times.slice() });

    // ── Storage: one 'aimLab' key; the ranked boards keep their own keys ──
    function aimLoad() {
        const s = lsJSON(AIM_KEY, null) || {};
        return { scen: AIM_SCEN[s.scen] ? s.scen : 'chaos', diff: AIM_DIFF[s.diff] ? s.diff : 'normal', mode: s.mode === '3d' ? '3d' : '2d',
            bests: s.bests && typeof s.bests === 'object' ? s.bests : {}, last: s.last && typeof s.last === 'object' ? s.last : {},
            xh: Object.assign({}, AIM_XH_DEFAULT, s.xh), set: Object.assign({}, AIM_SET_DEFAULT, s.set) };
    }
    function aimSave(st) { try { localStorage.setItem(AIM_KEY, JSON.stringify(st)); } catch (_) {} }
    // A ranked best merges the legacy record (aimChaosHighScore, reflexHighScores) with the local one.
    function aimBestOf(st, id, mode, diff) {
        const v = st.bests[aimBestKey(id, mode, diff)], react = AIM_SCEN[id].group === 'react';
        let b = typeof v === 'number' && v > 0 ? v : 0;
        if (aimRanked(id, mode, diff)) {
            if (id === 'chaos') b = Math.max(b, lsInt('aimChaosHighScore'));
            else { const r = loadReflexHighScores()[id], l = r && isFinite(r.best) && r.best > 0 ? r.best : 0; if (l) b = b ? Math.min(b, l) : l; }
        }
        return react ? b || 0 : b;
    }

    // Crosshair share code: AL1-<style><hex>-len-thick-gap-outline-dot-opacity-dynamic (outline/dot 0 = off).
    const AIM_XS = { C: 'cross', D: 'dot', X: 'crossdot', O: 'circle', T: 't' };
    function aimXhCode(c) {
        const s = Object.keys(AIM_XS).find(k => AIM_XS[k] === c.xs) || 'X';
        return 'AL1-' + s + c.color.slice(1).toUpperCase() + '-' + [c.len, c.thick, c.gap, c.outline ? c.ow : 0, c.dot ? c.ds : 0, c.op, c.dyn ? 1 : 0].join('-');
    }
    function aimXhParse(code) {
        const m = /^AL1-([CDXOT])([0-9A-F]{6})-(\d+)-(\d+)-(\d+)-(\d+)-(\d+)-(\d+)-([01])$/i.exec(String(code || '').trim());
        if (!m) return null;
        const n = (i, lo, hi) => Math.max(lo, Math.min(hi, parseInt(m[i], 10)));
        const ow = n(6, 0, 3), ds = n(7, 0, 6);
        return { xs: AIM_XS[m[1].toUpperCase()], color: '#' + m[2].toUpperCase(), len: n(3, 0, 20), thick: n(4, 1, 6), gap: n(5, 0, 12),
            outline: ow > 0, ow: ow || 1, dot: ds > 0, ds: ds || 2, op: n(8, 10, 100), dyn: m[9] === '1' };
    }
