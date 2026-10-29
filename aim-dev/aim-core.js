    // ── AimLab core: scenarios, spawn rules, scoring, the reaction rules. No DOM (aim-ui.js draws). ──
    // Design: aim-dev/ref/design (Canvas A12 spawn rules, A13 timing). Plan: AIMLAB_PLAN.md.
    const AIM_SCEN = {
        // size: 2D diameter in px; ang: 3D angular radius in degrees (about the 2D size at the 95° default FOV).
        chaos:    { name: 'Chaos', group: 'aim', len: 30, count: 3, size: 46, ang: 6.5, desc: 'Three live targets; hit one, another spawns. Drift at Hard.' },
        flick:    { name: 'Flick', group: 'aim', len: 30, count: 1, size: 26, ang: 3.8, desc: 'One small target at a time. Measures time-to-kill.' },
        tracking: { name: 'Tracking', group: 'aim', len: 45, count: 1, size: 50, ang: 7, desc: 'Keep aim on a curving target to fill the ring.' },
        shrink:   { name: 'Shrink', group: 'aim', len: 30, count: 3, size: 50, ang: 7, life: 1600, desc: 'Hit before they shrink away. A vanish is a miss.' },
        // Ranked modes beside Chaos (design M1–M13): Chaos rules, scored as a total with bonuses.
        sprint:   { name: 'Sprint 50', group: 'aim', goal: 50, count: 3, size: 46, ang: 6.5, tag: '50 targets', desc: 'Clear 50, fastest total wins' },
        endless:  { name: 'Endless', group: 'aim', count: 3, size: 46, ang: 6.5, life: 3200, tag: 'survival', desc: 'Hits add time; bonus = frenzy' },
        levels:   { name: 'Levels', group: 'aim', count: 3, size: 46, ang: 6.5, tag: '10 stages', camp: true, desc: 'Goals, stars and a boss' },
        // RefleX's two modes: rounds and delays are its Normal, unchanged.
        screen:   { name: 'Screen', group: 'react', rounds: 5, minDelay: 1000, maxDelay: 4000, noCam: true, desc: 'Wait for green, then click anywhere.' },
        target:   { name: 'Target', group: 'react', rounds: 8, minDelay: 800, maxDelay: 3000, size: 60, ang: 8, desc: 'Click the target the moment it appears.' }
    };
    const AIM_ORDER = ['chaos', 'sprint', 'endless', 'levels', 'flick', 'tracking', 'shrink', 'screen', 'target'];
    const AIM_RANKED = ['chaos', 'sprint', 'endless', 'levels'], AIM_PRACTICE = ['flick', 'tracking', 'shrink'];
    // Levels: goal hits | track (% on target over the stage) | bonus kills | boss. s2/s3: the 2- and 3-star
    // accuracy (% on target for Tracking). drift px/s, shr/life ms, k size; all scale with the skill rating.
    const AIM_STAGES = [
        { name: 'Warm-up', base: 'chaos', goal: 'hits', n: 15, len: 25, s2: 75, s3: 90 },
        { name: 'Flick', base: 'flick', goal: 'hits', n: 15, len: 25, s2: 75, s3: 90 },
        { name: 'Drift', base: 'chaos', goal: 'hits', n: 18, len: 30, drift: 50, s2: 75, s3: 88 },
        { name: 'Tracking', base: 'tracking', goal: 'track', n: 70, len: 15, s2: 80, s3: 88 },
        { name: 'Shrink', base: 'shrink', goal: 'hits', n: 20, len: 30, shr: 1800, s2: 75, s3: 88 },
        { name: 'Bonus hunt', base: 'chaos', goal: 'bonus', n: 3, len: 40, every: 6, s2: 75, s3: 88 },
        { name: 'Precision', base: 'chaos', goal: 'hits', n: 20, len: 30, k: 0.7, missMs: 1000, s2: 80, s3: 92 },
        { name: 'Speed', base: 'chaos', goal: 'hits', n: 25, len: 30, life: 1400, s2: 75, s3: 88 },
        { name: 'Mixed', base: 'chaos', goal: 'hits', n: 25, len: 35, drift: 55, shr: 2200, s2: 75, s3: 88 },
        { name: 'Boss', base: 'chaos', goal: 'boss', n: 12, len: 60, s2: 70, s3: 85 }
    ];
    // Medal floors per mode, [2D, 3D]: Bronze, Silver, Gold, Platinum (Levels: campaign stars).
    const AIM_MEDALS = { chaos: [[300, 450, 600, 750], [220, 330, 450, 560]], sprint: [[7000, 9000, 11000, 12500], [6000, 7800, 9500, 11000]],
        endless: [[4000, 9000, 16000, 25000], [3000, 7000, 12000, 19000]], levels: [[12, 20, 26, 30], [12, 20, 26, 30]],
        flick: [[300, 500, 750, 1000], [220, 380, 560, 750]], tracking: [[800, 1400, 2000, 2600], [640, 1100, 1600, 2100]] };
    const AIM_TIER = ['', 'Bronze', 'Silver', 'Gold', 'Platinum'];
    const aimMedal = (id, mode, v) => { const m = AIM_MEDALS[id]; if (!m || !(v > 0)) return 0; const t = m[mode === '3d' ? 1 : 0]; let k = 0; while (k < 4 && v >= t[k]) k++; return k; };
    const aimNextMedal = (id, mode, v) => { const m = AIM_MEDALS[id], k = aimMedal(id, mode, v); return !m || k >= 4 ? null : { tier: k + 1, need: m[mode === '3d' ? 1 : 0][k] - (v || 0), from: k ? m[mode === '3d' ? 1 : 0][k - 1] : 0, to: m[mode === '3d' ? 1 : 0][k] }; };
    const AIM_BONUS_HP = 3, AIM_BONUS_WIN = 1500, AIM_BONUS_LIFE = 6000, AIM_BONUS_ESC = 2000, AIM_FRENZY_MS = 5000, AIM_VULN_MS = 3000;
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
    // Legacy: the records the old boards read (aimChaosHighScore, reflexHighScores). Ranked: every board,
    // 2D and 3D, at Normal; Levels runs at its adaptive difficulty and always ranks.
    const aimLegacy = (id, mode, diff) => diff === 'normal' && (id === 'screen' || ((id === 'chaos' || id === 'target') && mode === '2d'));
    const aimRanked = (id, mode, diff) => id === 'levels' || (diff === 'normal' && (AIM_RANKED.indexOf(id) >= 0 || AIM_SCEN[id].group === 'react'));
    const aimBestKey = (id, mode, diff) => id + '|' + (AIM_SCEN[id].noCam ? '-' : mode) + '|' + (id === 'levels' ? 'normal' : diff);
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
    // A run carries its own rules (cnt targets, rk size, spd, dv drift px/s, shr shrink ms, life expiry ms), so
    // Endless' levels and Levels' stages reuse one engine. base: the scenario whose behaviour it plays.
    function aimNewRun(id, mode, diff, sp, stage, skill) {
        const S = AIM_SCEN[id], D = AIM_DIFF[diff];
        const run = { id, mode, diff, sp, len: S.len ? S.len * 1000 : Infinity, el: 0, score: 0, hits: 0, shots: 0, streak: 0, bestStreak: 0, nid: 1,
            tg: [], kills: [], marks: [], fx: [], trail: [], onMs: 0, onRun: 0, spark: new Array(30).fill(0), over: false,
            base: id, cnt: S.count, rk: 1, spd: D.speed, dv: D.drift && id === 'chaos' ? 60 * D.speed : 0, shr: id === 'shrink' ? S.life * D.life : 0, life: 0, bonusKills: 0, frenzy: 0 };
        if (id === 'sprint') run.pen = 0;
        if (id === 'endless') Object.assign(run, { left: 15000, lvl: 1, life: S.life * D.life, life0: S.life * D.life, nextBonus: 20, bonusAt: 25000, hitPts: 0, streakPts: 0 });
        if (id === 'levels') {
            const G = AIM_STAGES[stage], r = skill || 1, b = AIM_SCEN[G.base];
            Object.assign(run, { stage, G, skill: r, base: G.base, len: G.len * 1000, cnt: G.goal === 'boss' ? 0 : b.count, rk: (G.k || 1) / Math.sqrt(r), spd: r,
                dv: (G.drift || 0) * r, shr: (G.shr || (G.base === 'shrink' ? b.life : 0)) / r, life: G.life ? G.life / r : 0, missMs: G.missMs || 0, goalN: 0, clear: false,
                nextBonus: G.every || Infinity, bonusAt: Infinity, minionAt: 0 });
        }
        return run;
    }
    // Bonus 1.6× (design M5), boss and its minions (M12); the 3D boss stays inside the 28° tall window.
    const aimKindK = (kind, ang) => kind === 'bonus' ? 1.6 : kind === 'boss' ? (ang ? 1.8 : 2.3) : kind === 'minion' ? 0.65 : 1;
    function aimAddTarget(run, aim, rnd, kind) {
        rnd = rnd || Math.random;
        const sp = run.sp, r = aimRadius(sp, run.base, run.diff) * run.rk * aimKindK(kind, sp.ang);
        if (run.base === 'tracking') {
            const t = { id: run.nid++, r, r0: r, born: run.el, ph: [rnd() * 6.3, rnd() * 6.3, rnd() * 6.3, rnd() * 6.3] };
            aimTrackPos(run, t); run.tg.push(t); return t;
        }
        // 2D: the bonus spawns with room for its rings (1.6×), the boss for its health bar.
        const p = aimSpawnAt(sp, sp.ang ? r : kind === 'bonus' ? r * 1.6 : kind === 'boss' ? r * 1.3 : r, run.tg, aim, rnd);
        if (!p) return null;
        const t = { id: run.nid++, x: p.x, y: p.y, r, r0: r, born: run.el, vx: 0, vy: 0 };
        const dv = kind === 'boss' ? 45 : kind ? 0 : run.dv;
        if (dv) { const a = rnd() * 6.283, v = sp.ang ? dv / 10 : dv * sp.k; t.vx = Math.cos(a) * v; t.vy = Math.sin(a) * v; }
        if (kind) { t.kind = kind; if (kind === 'bonus') t.hp = AIM_BONUS_HP; if (kind === 'boss') { t.hp = run.G.n; t.armor = true; } }
        run.tg.push(t);
        return t;
    }
    function aimFill(run, aim, rnd) { for (let n = run.tg.filter(t => !t.kind).length; n < run.cnt; n++) if (!aimAddTarget(run, aim, rnd)) break; }
    // The first frame of a run: its targets, and the boss stage's boss and two minions.
    function aimStart(run, aim, rnd) {
        aimFill(run, aim, rnd);
        if (run.G && run.G.goal === 'boss') ['boss', 'minion', 'minion'].forEach(k => aimAddTarget(run, aim, rnd, k));
    }
    // Tracking: two sines per axis, phases per target; speed scales with difficulty.
    function aimTrackPos(run, t) {
        const sp = run.sp, s = run.el / 1000 * run.spd, p = t.ph;
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
    // A text popup (no burst): c colours it (good, red, gold, muted, accent).
    const aimPop = (run, x, y, pts, sub, c, dy) => run.fx.push({ x, y, at: run.el, pts, sub: sub || '', c: c || '', pop: true, dy: dy || 0 });
    function aimShoot(run, aim, rnd) {
        if (run.over || run.base === 'tracking') return null;
        const t = aimHitAt(run, aim);
        // The armoured boss deflects: not a shot, not a miss.
        if (t && t.kind === 'boss' && t.armor) { aimPop(run, aim.x, aim.y, '0', 'DEFLECTED', 'muted'); return null; }
        run.shots++;
        if (!t) { run.streak = 0; aimMissCost(run, aim); run.marks.push({ x: aim.x, y: aim.y, at: run.el }); return null; }
        run.hits++; run.streak++; run.bestStreak = Math.max(run.bestStreak, run.streak);
        const ttk = run.el - t.born, m = aimMult(run.streak);
        run.kills.push({ at: run.el, ttk });
        run.spark[Math.min(29, Math.floor(run.el / run.len * 30))]++;
        if (t.kind === 'bonus' || t.kind === 'boss') return aimHitBig(run, t, aim);
        // Chaos is hits × 10, as the ranked board always was; the practice scenarios pay the streak multiplier.
        let pts = run.id === 'chaos' || run.id === 'levels' ? 10 : run.id === 'sprint' ? 100 : Math.round(10 * m), c = '';
        let sub = run.id === 'flick' ? 'TTK ' + Math.round(ttk) + ' MS' : run.streak < 2 ? '' : run.id === 'chaos' || run.id === 'sprint' ? 'STREAK ' + run.streak : (m > 1 ? '×' + m + ' · ' : '') + 'STREAK ' + run.streak;
        let label = '+' + pts;
        if (run.id === 'endless') {
            // Points: 20 + 10 a level, the streak multiplier, ×2 in Frenzy. Time: 2–5 s, shrinking with hits, so a run always ends.
            const fr = run.el < run.frenzy ? 2 : 1, b = (10 + 10 * run.lvl) * fr;
            pts = Math.round(b * m); run.hitPts += b; run.streakPts += pts - b;
            const g = (2000 + 3000 * (rnd || Math.random)()) * 40 / (40 + run.hits);
            run.left += g;
            label = '+' + (g / 1000).toFixed(1) + ' s'; c = fr > 1 ? 'gold' : 'good';
            sub = '+' + pts + (fr > 1 ? ' · ×2 FRENZY' : run.streak >= 2 ? ' · STREAK ' + run.streak : '');
        } else if (run.id === 'levels') {
            if (t.kind === 'minion') {
                pts = 50; label = '+50'; sub = 'MINION';
                const b = run.tg.find(q => q.kind === 'boss');
                if (b) { b.armor = false; b.vuln = run.el + AIM_VULN_MS; }
                run.minionAt = run.el + 1500;
            } else if (run.G.goal === 'hits') { run.goalN++; sub = 'GOAL ' + run.goalN + ' / ' + run.G.n; }
        }
        run.score += pts;
        run.fx.push({ x: t.x, y: t.y, r: t.r, at: run.el, pts: label, sub, c, col: t.kind || '' });
        run.tg = run.tg.filter(q => q !== t);
        if (run.id === 'endless' && run.hits % 15 === 0) aimLevelUp(run, t);
        aimFill(run, aim, rnd);
        aimGoal(run);
        return t;
    }
    // Bonus: three hits, each within 1.5 s of the last (a lapse refills it), pays +5 s, +250 and Frenzy.
    // Boss: only while vulnerable (3 s after a minion dies), 150 a hit.
    function aimHitBig(run, t, aim) {
        t.hp--;
        if (t.kind === 'boss') {
            run.score += 150;
            aimPop(run, aim.x, aim.y, '+150', 'CORE HIT');
            if (t.hp > 0) return t;
            run.fx.push({ x: t.x, y: t.y, r: t.r, at: run.el, pts: '', sub: '', col: 'boss' });
            run.tg = run.tg.filter(q => q !== t && q.kind !== 'minion');
            run.goalN = run.G.n; aimGoal(run);
            return t;
        }
        if (t.hp > 0) { t.win = run.el + AIM_BONUS_WIN; aimPop(run, t.x, t.y - t.r * 0.4, '', t.hp + (t.hp > 1 ? ' HITS' : ' HIT') + ' LEFT', 'gold'); return t; }
        run.score += 250; run.bonusKills++; run.frenzy = run.el + AIM_FRENZY_MS;
        if (run.id === 'endless') run.left += 5000; else run.goalN++;
        run.fx.push({ x: t.x, y: t.y, r: t.r, at: run.el, pts: run.id === 'endless' ? '+5 s' : '+250', sub: run.id === 'endless' ? '+250 · FRENZY' : 'BONUS ' + run.goalN + ' / ' + run.G.n, c: 'good', col: 'bonus' });
        run.tg = run.tg.filter(q => q !== t);
        aimGoal(run);
        return t;
    }
    function aimMissCost(run, aim) {
        const c = run.id === 'sprint' ? 500 : run.id === 'endless' ? 1000 : run.missMs || 0;
        if (!c) return;
        if (run.id === 'sprint') run.pen += c; else if (run.id === 'endless') run.left = Math.max(0, run.left - c); else run.el = Math.min(run.len, run.el + c);
        aimPop(run, aim.x, aim.y, (run.id === 'sprint' ? '+' : '−') + c / 1000 + ' s', run.id === 'sprint' ? 'MISS PENALTY' : 'MISS', 'red');
    }
    // Endless: a level every 15 hits; targets shrink, live shorter and drift from level 3.
    function aimLevelUp(run, t) {
        run.lvl++;
        const f = run.lvl - 1;
        run.rk = Math.max(0.6, 1 - 0.06 * f); run.life = run.life0 * Math.max(0.55, 1 - 0.06 * f);
        run.dv = run.lvl >= 3 ? (30 + 8 * (run.lvl - 3)) * AIM_DIFF[run.diff].speed : 0;
        aimPop(run, t.x, t.y, '', 'LEVEL ' + run.lvl, 'accent', -26);
    }
    function aimGoal(run) {
        if (run.over) return;
        if (run.id === 'sprint' && run.hits >= AIM_SCEN.sprint.goal) run.over = true;
        if (run.G && run.G.goal !== 'track' && run.goalN >= run.G.n) { run.clear = true; run.over = true; }
    }
    function aimTick(run, dt, aim, rnd) {
        if (run.over) return;
        run.el = Math.min(run.len, run.el + dt);
        const sp = run.sp, s = dt / 1000;
        if (run.base === 'tracking') {
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
            // Shrink and expiry: a vanish is a miss (Endless: −2 s).
            if (run.shr || run.life) {
                const end = run.shr && run.life ? Math.min(run.shr, run.life) : run.shr || run.life;
                for (const t of run.tg.slice()) {
                    if (t.kind) continue;
                    const age = run.el - t.born;
                    if (run.shr) t.r = t.r0 * Math.max(0, 1 - age / run.shr);
                    if (age < end) continue;
                    run.shots++; run.streak = 0; run.fx.push({ x: t.x, y: t.y, r: t.r0, at: run.el, vanish: true }); run.tg = run.tg.filter(q => q !== t);
                    if (run.id === 'endless') { run.left = Math.max(0, run.left - 2000); aimPop(run, t.x, t.y, '−2 s', 'EXPIRED', 'red', -14); }
                }
                aimFill(run, aim, rnd);
            }
            for (const t of run.tg.slice()) {
                if (t.kind === 'bonus') {
                    if (t.win && run.el > t.win) { t.win = 0; t.hp = AIM_BONUS_HP; }
                    if (run.el - t.born >= AIM_BONUS_LIFE) { run.tg = run.tg.filter(q => q !== t); run.fx.push({ x: t.x, y: t.y, r: t.r0, at: run.el, vanish: true, esc: true }); }
                } else if (t.kind === 'boss' && !t.armor && run.el > t.vuln) t.armor = true;
            }
            if (run.G && run.G.goal === 'boss' && run.el >= run.minionAt && run.tg.filter(t => t.kind === 'minion').length < 2 && run.tg.some(t => t.kind === 'boss')) { aimAddTarget(run, aim, rnd, 'minion'); run.minionAt = run.el + 1500; }
            // Bonus targets: Endless every 20 hits (5 more per kill) or 25 s; Bonus hunt every few hits.
            if ((run.id === 'endless' || (run.G && run.G.goal === 'bonus')) && (run.hits >= run.nextBonus || run.el >= run.bonusAt) && !run.tg.some(t => t.kind === 'bonus')) {
                if (aimAddTarget(run, aim, rnd, 'bonus')) { run.nextBonus = run.hits + (run.G ? run.G.every : 20 + 5 * run.bonusKills); if (run.id === 'endless') run.bonusAt = run.el + 25000; }
            }
        }
        // Endless: the clock drains 10% faster each level.
        if (run.id === 'endless') { run.left -= dt * (1 + 0.1 * (run.lvl - 1)); if (run.left <= 0) { run.left = 0; run.over = true; } }
        run.marks = run.marks.filter(m => run.el - m.at < AIM_FX_MS);
        run.fx = run.fx.filter(m => run.el - m.at < AIM_FX_MS);
        if (run.el >= run.len) { run.over = true; if (run.G && run.G.goal === 'track') run.clear = aimLiveAcc(run) >= run.G.n; }
    }
    function aimSummary(run) {
        const track = run.base === 'tracking', iv = run.kills.map((k, i) => k.at - (i ? run.kills[i - 1].at : 0));
        const top = Math.max(1, ...run.spark);
        return {
            score: Math.round(run.score), hits: run.hits, shots: run.shots, bestStreak: run.bestStreak,
            acc: track ? (run.el ? Math.round(run.onMs / run.el * 100) : 0) : run.shots ? Math.round(run.hits / run.shots * 100) : 0,
            react: Math.round(aimMean(iv)), ttk: Math.round(aimMean(run.kills.map(k => k.ttk))), onS: run.onMs / 1000,
            spark: run.spark.map(v => v / top)
        };
    }
    // Total-score breakdowns (results M3, M6, M10): [label, points] lines; the total is their sum.
    function aimBreakdown(run, sm) {
        const a = sm.acc / 100, L = [];
        if (run.id === 'sprint') {
            const t = (run.el + run.pen) / 1000, done = run.hits >= AIM_SCEN.sprint.goal;
            L.push(['Base', run.hits * 100], ['Speed bonus', done ? Math.max(0, Math.round((60 - t) * 100)) : 0], ['Accuracy bonus', Math.round(3000 * a * a)], ['Streak bonus', 20 * run.bestStreak], ['Flawless', done && sm.acc === 100 ? 1000 : 0]);
        } else if (run.id === 'endless') {
            L.push(['Hits', Math.round(run.hitPts)], ['Streaks', Math.round(run.streakPts)], ['Bonus kills', 250 * run.bonusKills], ['Survival', Math.round(run.el / 20)], ['Accuracy', Math.round(2000 * a * a)]);
        } else if (run.id === 'levels') {
            const left = Math.max(0, run.len - run.el) / 1000, b = [1000, Math.round(left * 70), Math.round(400 * a)], sum = b[0] + b[1] + b[2];
            L.push(['Base', b[0]], ['Time left · ' + left.toFixed(1) + ' s', b[1]], [(run.base === 'tracking' ? 'On target · ' : 'Accuracy · ') + sm.acc + '%', b[2]], ['Skill ×' + run.skill.toFixed(2), Math.round(sum * (run.skill - 1))]);
        }
        return { lines: L, total: L.reduce((s, l) => s + l[1], 0) };
    }
    // Live accuracy: '—' until the first shot (tracking: share of time on target).
    const aimLiveAcc = run => run.base === 'tracking' ? (run.el > 0 ? Math.round(run.onMs / run.el * 100) : null) : run.shots ? Math.round(run.hits / run.shots * 100) : null;

    // ── Levels: one campaign per camera. Best stars per stage outlive it; the skill rating (0.8–1.25) moves
    // with each result and scales the next stage's size, speed and lifetimes. ──
    const aimStars = (run, sm) => !run.clear ? 0 : sm.acc >= run.G.s3 ? 3 : sm.acc >= run.G.s2 ? 2 : 1;
    const aimSkillNext = (r, stars) => Math.round(Math.max(0.8, Math.min(1.25, r + [-0.06, -0.02, 0.02, 0.06][stars])) * 100) / 100;
    function aimCamp(st, mode) {
        const c = st.camp[mode] = Object.assign({ stage: 0, lives: 3, score: 0, skill: 1, stars: [], cleared: 0 }, st.camp[mode]);
        while (c.stars.length < AIM_STAGES.length) c.stars.push(0);
        return c;
    }
    const aimStarSum = c => c.stars.reduce((s, v) => s + v, 0);
    const aimStageGoal = G => G.goal === 'track' ? 'Stay on target ' + G.n + '% for ' + G.len + ' s' : G.goal === 'bonus' ? 'Kill ' + G.n + ' bonus targets in ' + G.len + ' s'
        : G.goal === 'boss' ? 'Beat the boss in ' + G.len + ' s' : 'Hit ' + G.n + ' targets in ' + G.len + ' s';
    const aimStageCrit = G => { const u = G.goal === 'track' ? '% on target' : '% accuracy'; return [G.goal === 'track' ? G.n + u : 'Clear the goal', G.s2 + u, G.s3 + u]; };

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
            xh: Object.assign({}, AIM_XH_DEFAULT, s.xh), set: Object.assign({}, AIM_SET_DEFAULT, s.set),
            // camp: Levels per camera; rec: what the achievements and Records read (Gold Sprints, best survival ms, boss beaten).
            camp: s.camp && typeof s.camp === 'object' ? s.camp : {}, rec: Object.assign({ golds: 0, survive: 0, boss: 0 }, s.rec) };
    }
    function aimSave(st) { try { localStorage.setItem(AIM_KEY, JSON.stringify(st)); } catch (_) {} }
    // A legacy-board best merges the old record (aimChaosHighScore, reflexHighScores) with the local one.
    function aimBestOf(st, id, mode, diff) {
        const v = st.bests[aimBestKey(id, mode, diff)], react = AIM_SCEN[id].group === 'react';
        let b = typeof v === 'number' && v > 0 ? v : 0;
        if (aimLegacy(id, mode, diff)) {
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
