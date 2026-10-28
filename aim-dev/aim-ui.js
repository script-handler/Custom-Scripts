    // ── AimLab UI: the panel, the canvas (2D arena, 3D room), input, sheets, results, Max ──
    // Host API: initAimLab() · aimDetach() · aimToggleMax() · aimLbMode() · aimReactLbMode() · aimOnThemeChange()
    const aimC = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
    const AIM_ICON = {
        chaos: aimC(6, 7, 2.6) + aimC(14.5, 6.5, 2) + aimC(11, 14.5, 3), flick: aimC(15, 5, 2.2) + 'M4 16l7.5-7.5M11.5 8.5H8M11.5 8.5V12',
        tracking: 'M2.5 15.5c2.5-6 5-7 7.5-3.5s5 2.5 7.5-5' + aimC(10, 12, 2.4), shrink: aimC(10, 10, 7) + aimC(10, 10, 3.8) + aimC(10, 10, 1),
        screen: 'M3 4.5h14v11H3zM10.8 7l-2.3 3.3h3l-2.3 3.2', target: aimC(10, 10, 6.5) + aimC(10, 10, 1.6) + 'M10 1.5v2.5M10 16v2.5M1.5 10H4M16 10h2.5',
        brand: 'M4.5 10a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0 -11 0M10 1.8v4M10 14.2v4M1.8 10h4M14.2 10h4', play: 'M6.5 4.2 15.8 10 6.5 15.8Z', pause: 'M7.5 5v10M12.5 5v10',
        restart: 'M4.5 10a5.5 5.5 0 1 0 1.8-4.1M4.5 3.5v3h3', xh: 'M4.5 10a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0 -11 0M10 2v4M10 14v4M2 10h4M14 10h4',
        settings: 'M3.5 6h8M15.5 6h1M3.5 14h1M8.5 14h8M11.5 6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M4.5 14a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
        max: 'M3.5 7.5v-4h4M16.5 7.5v-4h-4M3.5 12.5v4h4M16.5 12.5v4h-4', exit: 'M7.5 3.5v4h-4M12.5 3.5v4h4M7.5 16.5v-4h-4M12.5 16.5v-4h4',
        close: 'M5.5 5.5l9 9M14.5 5.5l-9 9', chev: 'M6 8l4 4 4-4', copy: 'M7 7h9v9H7zM13 4H4v9', warn: 'M10 4.5v7M10 15v.5',
        trophy: 'M6.5 3.5h7v4a3.5 3.5 0 0 1-7 0ZM6.5 5H4.2a2.4 2.4 0 0 0 2.6 3M13.5 5h2.3a2.4 2.4 0 0 1-2.6 3M10 11v3M7 16.5h6',
        lock: 'M10 3c-3 0-4.5 2-4.5 4.5v5C5.5 15 7 17 10 17s4.5-2 4.5-4.5v-5C14.5 5 13 3 10 3ZM10 6v2.5'
    };
    const aimSvg = (d, cls) => `<svg class="aim-i${cls ? ' ' + cls : ''}" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="${d}"/></svg>`;
    const aimEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    const aimFmt = n => Math.round(n).toLocaleString('en-US');
    const AIM_SWATCH = ['#4CF0B0', '#FFFFFF', '#4FACFE', '#FFE15A', '#FF4FD8', '#FF5D73'];
    const AIM_TCOLORS = ['#FF5D73', '#FFB547', '#4CF0B0', '#4FACFE', '#B06CFF'];
    const AIM_ROOM = { x: 10, fl: -3.2, ce: 4.6, bk: 16, fr: -6 };
    const AIM_SND = { tick: [1800, 40, 'square', 0.04], pop: [520, 90, 'sine', 0.12], ding: [1320, 220, 'triangle', 0.07] };

    const aimS = { root: null, hud: null, vp: null, cv: null, ctx: null, st: null, on: false, raf: 0, lastMs: 0, tokAt: -1e9, tok: {},
        phase: 'idle', prev: '', run: null, R: null, res: null, sheet: '', max: false, count: 0, W: 0, H: 0, dpr: 1, ptr: null,
        yaw: 0, pitch: 0, locked: false, lockTry: false, open: 0, ro: null, hudKey: '', ovKey: '', confirmReset: false };

    const aimScen = () => AIM_SCEN[aimS.st.scen];
    const aimMode = () => aimScen().noCam ? '2d' : aimS.st.mode;
    const aimIs3d = () => aimMode() === '3d';
    const aimDiffName = d => AIM_DIFF[d].name;
    const aimLive = () => aimS.phase === 'count' || aimS.phase === 'run';

    // Through the host's shared bank (sfxTone): ⚙️ Game Sounds is the master, AimLab's Sound its own switch.
    function aimBeep(f, ms, type, vol) { if (aimS.st && aimS.st.set.sound && typeof sfxTone === 'function') sfxTone(f, ms, type, vol || 0.08); }
    const aimHitSnd = () => { const s = AIM_SND[aimS.st.set.hitSnd] || AIM_SND.tick; aimBeep(s[0], s[1], s[2], s[3]); };

    // ── Theme: the canvas reads the --aim-* tokens off the HUD (they follow Aurora light/dark and Cyberpunk) ──
    function aimReadTok() {
        const S = aimS; if (!S.hud) return;
        const cs = getComputedStyle(S.hud), g = k => cs.getPropertyValue('--aim-' + k).trim();
        S.tok = { text: g('text') || '#F4F2FA', muted: g('muted') || '#A9A6BC', accent: g('accent') || '#4FACFE', red: g('red') || '#FF5D73', redText: g('red-text') || '#FF8396',
            track: g('track') || 'rgba(255,255,255,.16)', cyber: g('cyber') === '1', light: g('light') === '1', popSh: g('pop-shadow') || 'rgba(0,0,0,.6)',
            ceil: g('room-ceil') || '#0C0B12', side: g('room-side') || '#15131E', back: g('room-back') || '#1D1A2A', floor: g('room-floor') || '#100F18',
            grid: g('room-grid') || 'rgba(146,128,255,.26)', wgrid: g('room-wgrid') || 'rgba(255,255,255,.045)', edge: g('room-edge') || 'rgba(255,255,255,.1)',
            light2: g('room-light') || 'rgba(160,140,255,.22)', vign: g('vign') || 'rgba(0,0,0,.5)', shadow: g('shadow') || 'rgba(0,0,0,.9)', font: g('font') || 'Inter, system-ui, sans-serif' };
        S.tokAt = performance.now();
    }
    function aimOnThemeChange() { aimReadTok(); aimSyncMaxTheme(); }
    const aimHex = h => { const n = parseInt(String(h).replace('#', ''), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
    const aimRgba = (h, a) => { const c = aimHex(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
    const aimMix = (a, b, t) => { const x = aimHex(a), y = aimHex(b); return 'rgb(' + x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',') + ')'; };

    // ── Build ─────────────────────────────────────────────────────────
    function aimBuild(root) {
        const S = aimS, I = AIM_ICON, h = document.createElement('div');
        h.className = 'aim-hud';
        const tile = '<div class="aim-tile"><span class="l"></span><span class="v"><b></b><u></u><em></em></span><span class="bar"><i></i></span><span class="pips"><i></i><i></i><i></i></span></div>';
        h.innerHTML =
            `<div class="aim-top"><div class="aim-brand"><span class="aim-logo">${aimSvg(I.brand)}</span><b>AimLab</b></div>` +
            `<button type="button" class="aim-chip" data-act="sheet:scenarios" aria-label="Choose scenario"><span class="aim-chip-i"></span><span class="aim-chip-t"><b></b><i></i></span>${aimSvg(I.chev, 'is-chev')}</button>` +
            `<button type="button" class="aim-bestb" data-act="sheet:bests" aria-label="Personal bests">${aimSvg(I.trophy, 'is-gold')}<b></b><i>best</i></button></div>` +
            `<div class="aim-tiles">${tile + tile + tile + tile}</div>` +
            `<div class="aim-vp"><canvas class="aim-cv"></canvas><div class="aim-vchip"><span></span><b></b></div>` +
            `<div class="aim-vbtns"><button type="button" class="aim-vb" data-act="pause" aria-label="Pause">${aimSvg(I.pause)}</button><button type="button" class="aim-vb" data-act="max" aria-label="Max view">${aimSvg(I.max)}</button></div>` +
            `<div class="aim-esc"><kbd>Esc</kbd><span>Pause</span></div><div class="aim-custom"><i></i>Custom · not ranked</div><div class="aim-ov"></div></div>` +
            `<div class="aim-foot"><button type="button" class="aim-b is-primary aim-pp" data-act="playpause" aria-label="Play">${aimSvg(I.play)}<span>Play</span></button>` +
            `<button type="button" class="aim-b" data-act="restart" aria-label="Restart">${aimSvg(I.restart)}</button>` +
            `<div class="aim-seg" role="group" aria-label="Camera"><button type="button" data-act="mode:2d">2D</button><button type="button" data-act="mode:3d">3D</button></div>` +
            `<button type="button" class="aim-b aim-mode1" data-act="mode:toggle" aria-label="Camera mode"><b></b><span>MODE</span></button>` +
            `<button type="button" class="aim-b" data-act="sheet:crosshair" aria-label="Crosshair">${aimSvg(I.xh)}</button>` +
            `<button type="button" class="aim-b" data-act="sheet:settings" aria-label="Settings">${aimSvg(I.settings)}</button>` +
            `<span class="aim-sep"></span><button type="button" class="aim-b aim-maxb" data-act="max" aria-label="Max view">${aimSvg(I.max, 'is-in')}${aimSvg(I.exit, 'is-out')}<span>Exit</span></button></div>` +
            `<div class="aim-status"><i></i><span></span></div><div class="aim-rank"></div>` +
            `<div class="aim-sheetw"><div class="aim-scrim" data-act="sheet:"></div><div class="aim-sheet" role="dialog" aria-modal="true"></div></div>`;
        root.innerHTML = '';
        root.appendChild(h);
        S.root = root; S.hud = h; S.vp = h.querySelector('.aim-vp'); S.cv = h.querySelector('.aim-cv'); S.ctx = S.cv.getContext('2d');
        S.tiles = Array.from(h.querySelectorAll('.aim-tile'));
        h.addEventListener('click', aimOnClick);
        h.addEventListener('input', aimOnInput);
        h.addEventListener('change', aimOnInput);
    }

    // ── Lifecycle ─────────────────────────────────────────────────────
    function initAimLab() {
        const root = document.getElementById('aim-root');
        if (!root) return;
        const S = aimS;
        if (!S.st) S.st = aimLoad();
        if (!S.hud || !root.contains(S.hud)) aimBuild(root);
        if (S.on) return;
        S.on = true;
        const vp = S.vp;
        vp.addEventListener('pointerdown', aimOnDown);
        vp.addEventListener('pointermove', aimOnMove);
        vp.addEventListener('pointerleave', aimOnLeave);
        window.addEventListener('keydown', aimOnKey, true);
        window.addEventListener('blur', aimOnBlur);
        document.addEventListener('visibilitychange', aimOnBlur);
        document.addEventListener('pointerlockchange', aimOnLockChange);
        document.addEventListener('pointerlockerror', aimOnLockError);
        if (window.ResizeObserver) { S.ro = new ResizeObserver(aimResize); S.ro.observe(vp); }
        aimReadTok(); aimLayout(); aimResize(); aimOv(); aimSyncScoreBtn();
        S.lastMs = 0; S.raf = requestAnimationFrame(aimLoop);
    }
    // Leaving the panel: a run in progress is dropped (no XP), Max and the lock close.
    function aimDetach() {
        const S = aimS;
        if (S.max) aimToggleMax();
        if (!S.on) return;
        S.on = false;
        if (S.raf) cancelAnimationFrame(S.raf); S.raf = 0;
        aimLock(false);
        const vp = S.vp;
        vp.removeEventListener('pointerdown', aimOnDown);
        vp.removeEventListener('pointermove', aimOnMove);
        vp.removeEventListener('pointerleave', aimOnLeave);
        window.removeEventListener('keydown', aimOnKey, true);
        window.removeEventListener('blur', aimOnBlur);
        document.removeEventListener('visibilitychange', aimOnBlur);
        document.removeEventListener('pointerlockchange', aimOnLockChange);
        document.removeEventListener('pointerlockerror', aimOnLockError);
        if (S.ro) { S.ro.disconnect(); S.ro = null; }
        if (aimLive() || S.phase === 'paused') aimQuit();
        S.sheet = '';
    }

    // ── Layout and size ───────────────────────────────────────────────
    function aimLayout() {
        const S = aimS, h = S.hud; if (!h) return;
        const live = aimLive() || S.phase === 'paused';
        h.classList.toggle('is-run', live);
        h.classList.toggle('is-3d', aimIs3d());
        h.classList.toggle('is-react', aimScen().group === 'react');
        h.classList.toggle('is-max', S.max);
        h.classList.toggle('is-narrow', !S.max && h.clientWidth > 0 && h.clientWidth < 352);
        h.classList.toggle('is-sheet', !!S.sheet);
        h.classList.toggle('is-done', S.phase === 'ares' || S.phase === 'rres');
        S.vp.classList.toggle('is-aim', S.phase === 'count' || (S.phase === 'run' && !aimScen().noCam));
        // Plain and Grid drop the arena's dots (Grid draws its lines on the canvas).
        S.vp.classList.toggle('is-flat', S.st.set.bg !== 'room');
        S.hudKey = '';
    }
    function aimSpace() {
        const S = aimS;
        if (aimIs3d()) return aimSpace3d();
        // No spawns under the in-run HUD: Pause/Max in the corner, or Max's bars.
        const holes = S.max ? [{ x: 0, y: 0, w: S.W, h: 96 }, { x: 0, y: S.H - 96, w: S.W, h: 96 }] : (aimLive() || S.phase === 'paused') ? [{ x: S.W - 116, y: 0, w: 116, h: 64 }] : [];
        return aimSpace2d(S.W, S.H, holes, S.max ? 1.7 : 1);
    }
    function aimResize() {
        const S = aimS; if (!S.vp) return;
        const W = S.vp.clientWidth, H = S.vp.clientHeight;
        if (!W || !H) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (W !== S.W || H !== S.H || dpr !== S.dpr) {
            S.W = W; S.H = H; S.dpr = dpr;
            S.cv.width = Math.round(W * dpr); S.cv.height = Math.round(H * dpr);
            S.cv.style.width = W + 'px'; S.cv.style.height = H + 'px';
        }
        S.hud.classList.toggle('is-narrow', !S.max && S.hud.clientWidth < 352);
        if (S.run && !aimIs3d()) aimRescale(S.run, aimSpace());
        aimFitOv();
    }
    function aimLocal(e) {
        const S = aimS, r = S.vp.getBoundingClientRect();
        return { x: (e.clientX - r.left) * S.W / (r.width || 1), y: (e.clientY - r.top) * S.H / (r.height || 1) };
    }
    const aimAim = () => aimIs3d() ? { x: aimS.yaw, y: aimS.pitch } : aimS.ptr;

    // ── Flow ──────────────────────────────────────────────────────────
    function aimPlay() {
        const S = aimS, sc = aimScen(), now = performance.now();
        S.res = null; S.sheet = ''; S.yaw = 0; S.pitch = 0; S.run = null; S.R = null;
        if (sc.group === 'aim') { S.phase = 'count'; S.count = AIM_COUNT_MS; S.lastBeep = 4; }
        else { S.phase = 'run'; S.R = aimReactNew(S.st.scen, S.st.diff); aimReactNext(S.R, now); }
        aimLayout(); aimResize();
        if (sc.group === 'aim') S.run = aimNewRun(S.st.scen, aimMode(), S.st.diff, aimSpace());
        if (aimIs3d()) aimLock(true);
        aimOv(); aimSheet(); aimSyncScoreBtn();
    }
    function aimPause() {
        const S = aimS; if (!aimLive()) return;
        S.prev = S.phase; S.phase = 'paused';
        aimLock(false); aimLayout(); aimOv();
    }
    function aimResume() {
        const S = aimS; if (S.phase !== 'paused') return;
        S.phase = S.prev || 'run';
        // A reaction round in flight re-arms: a pause must not hand out a free GO.
        if (S.R && (S.R.phase === 'wait' || S.R.phase === 'go')) aimReactArm(S.R, performance.now());
        aimLayout();
        if (aimIs3d()) aimLock(true);
        aimOv();
    }
    function aimQuit() {
        const S = aimS;
        S.phase = 'idle'; S.run = null; S.R = null; S.res = null;
        aimLock(false); aimLayout(); aimResize(); aimOv(); aimSyncScoreBtn();
    }
    function aimStep(dt, ts) {
        const S = aimS;
        S.open = Math.max(0, S.open - dt);
        if (S.phase === 'count') {
            if (aimIs3d() && !S.locked) return;
            S.count -= dt;
            const n = Math.ceil(S.count / 1000);
            if (n !== S.lastBeep && n > 0) { S.lastBeep = n; aimBeep(660, 90, 'sine', 0.07); }
            if (S.count <= 0) { S.phase = 'run'; aimBeep(990, 140, 'sine', 0.08); aimFill(S.run, aimAim()); aimLayout(); aimOv(); }
            else aimOvCount();
            return;
        }
        if (S.phase !== 'run') return;
        if (aimIs3d() && !S.locked) return;
        if (S.run) {
            aimTick(S.run, dt, aimAim());
            if (S.run.over) aimFinish();
        } else if (S.R) {
            if (aimReactTick(S.R, ts, Math.random, aimReactSpawn)) { aimOv(); if (S.R.phase === 'go' && S.R.id === 'screen') aimBeep(880, 60, 'square', 0.03); }
            if (S.R.phase === 'done') aimReactFinish();
        }
    }
    function aimReactSpawn() {
        const S = aimS, sp = aimSpace(), r = aimRadius(sp, 'target', S.st.diff), p = aimSpawnAt(sp, r, [], aimAim());
        return p ? { x: p.x, y: p.y, r, born: performance.now() } : null;
    }
    function aimLoop(ts) {
        const S = aimS;
        if (!S.on) return;
        S.raf = requestAnimationFrame(aimLoop);
        const dt = S.lastMs ? Math.min(50, ts - S.lastMs) : 0;
        S.lastMs = ts;
        if (ts - S.tokAt > 500) aimReadTok();
        aimStep(dt, ts);
        aimDraw();
        if (S.R) aimReactPainted(S.R, ts);
        aimHudSync();
    }

    // ── Results ───────────────────────────────────────────────────────
    function aimXp(fn) { const x0 = typeof userXP === 'object' && userXP ? userXP.totalXP || 0 : 0; try { fn(); } catch (_) {} return Math.max(0, (typeof userXP === 'object' && userXP ? userXP.totalXP || 0 : 0) - x0); }
    function aimFinish() {
        const S = aimS, run = S.run, st = S.st, sm = aimSummary(run), id = run.id, mode = run.mode, diff = run.diff;
        const key = aimBestKey(id, mode, diff), prev = aimBestOf(st, id, mode, diff), ranked = aimRanked(id, mode, diff), isBest = sm.score > prev && sm.score > 0;
        if (isBest) st.bests[key] = sm.score;
        if (ranked && sm.score > lsInt('aimChaosHighScore')) saveAimHighScore(sm.score);
        st.last[key] = { score: sm.score, acc: sm.acc };
        aimSave(st);
        // The aim XP table is Chaos's: other scenarios pay on a Chaos-sized score, Sharpshooter stays Chaos Normal's.
        const xpScore = Math.round((id === 'chaos' ? sm.score : id === 'tracking' ? sm.score / 3 : sm.hits * 10) * (diff === 'easy' ? 0.5 : 1));
        const xp = aimXp(() => awardGameXP('aim', { score: xpScore, accuracy: id === 'chaos' && diff === 'normal' ? sm.acc : Math.min(sm.acc, 94), hits: sm.hits, isHighScore: ranked && isBest }));
        S.res = Object.assign({ kind: 'aim', id, mode, diff, prev, isBest, ranked, xp }, sm);
        S.phase = 'ares'; S.run = null;
        aimBeep(isBest ? 1320 : 740, 260, 'triangle', 0.08);
        aimLock(false); aimLayout(); aimResize(); aimOv(); aimSyncScoreBtn();
    }
    function aimReactFinish() {
        const S = aimS, R = S.R, st = S.st, sm = aimReactSummary(R), id = R.id, mode = aimMode(), diff = R.diff;
        const key = aimBestKey(id, mode, diff), prev = aimBestOf(st, id, mode, diff), ranked = aimRanked(id, mode, diff) && !sm.fail;
        const isBest = !sm.fail && sm.best > 0 && (!prev || sm.best < prev);
        if (!sm.fail) {
            if (isBest) st.bests[key] = sm.best;
            const ak = key + '|avg', pa = st.bests[ak];
            if (sm.avg > 0 && (!pa || sm.avg < pa)) st.bests[ak] = sm.avg;
        }
        st.last[key] = { avg: sm.avg, best: sm.best, fail: sm.fail };
        aimSave(st);
        // A failed run is not posted (design R9); RefleX's own record stays the board's source.
        let changed = false;
        if (ranked) {
            const hs = loadReflexHighScores();
            if (sm.avg > 0 && sm.avg < hs[id].avg) { hs[id].avg = sm.avg; changed = true; }
            if (sm.best > 0 && sm.best < hs[id].best) { hs[id].best = sm.best; changed = true; }
            if (changed) saveReflexHighScores(hs);
        }
        const xp = aimXp(() => awardGameXP('reflex', { avgTime: sm.avg, bestTime: sm.best, falseStarts: sm.fs, isHighScore: changed }));
        S.res = Object.assign({ kind: 'react', id, mode, diff, prev, prevAvg: st.bests[key + '|avg'], isBest, ranked, xp, max: R.max, rounds: R.rounds }, sm);
        S.phase = 'rres'; S.R = null;
        aimBeep(sm.fail ? 220 : 990, 240, 'triangle', 0.07);
        aimLock(false); aimLayout(); aimResize(); aimOv(); aimSyncScoreBtn();
    }

    // One header button, the team board: its tabs are the ranked scenarios (Chaos, Screen, Target),
    // and it shows and opens the one being played; the aim scenarios with no board show Chaos.
    function aimReactLbMode() { return aimS.st && aimS.st.scen === 'target' ? 'target' : 'screen'; }
    function aimLbMode() { return aimS.st && aimScen().group === 'react' ? aimReactLbMode() : 'chaos'; }
    function aimSyncScoreBtn() {
        const S = aimS; if (!S.st || typeof updateGameScoreBtn !== 'function') return;
        const m = aimLbMode(), res = S.res && S.res.ranked ? S.res : null;
        if (m === 'chaos') updateGameScoreBtn('aim', S.run && aimRanked(S.run.id, S.run.mode, S.run.diff) ? Math.round(S.run.score) : res && res.kind === 'aim' ? res.score : null, aimBestOf(S.st, 'chaos', '2d', 'normal'));
        else updateGameScoreBtn('aim', res && res.id === m ? res.best : null, aimBestOf(S.st, m, '2d', 'normal') || null, ' ms');
    }

    // ── Pointer lock (3D): raw movement first, as pool does ──
    function aimLock(on) {
        const S = aimS, vp = S.vp; if (!vp) return;
        if (!on) { if (document.pointerLockElement === vp) document.exitPointerLock(); return; }
        if (document.pointerLockElement === vp || !vp.requestPointerLock) return;
        S.lockTry = true;
        const go = o => { const p = vp.requestPointerLock(o); return p && p.catch ? p : null; };
        try { const p = go({ unadjustedMovement: true }); if (p) p.catch(() => { S.lockTry = false; try { const q = go(); if (q) q.catch(() => {}); } catch (_) {} }); else S.lockTry = false; }
        catch (_) { S.lockTry = false; try { go(); } catch (_) {} }
    }
    function aimOnLockChange() {
        const S = aimS, on = document.pointerLockElement === S.vp;
        S.locked = on; S.lockTry = false;
        if (!on && aimIs3d() && aimLive()) aimPause();
        aimOv();
    }
    // As pool: the raw-input attempt failing is not news (the plain lock follows); a refused plain lock is.
    // Chrome refuses a re-lock for about a second after Esc released one.
    function aimOnLockError() {
        if (!aimS.lockTry && typeof showXPNotification === 'function') showXPNotification('The browser refused the mouse lock. Click the play area again', 'game', 'lock');
        aimS.lockTry = false; aimOv();
    }

    // ── Input ─────────────────────────────────────────────────────────
    function aimOnDown(e) {
        const S = aimS;
        if (e.button !== 0 || S.sheet || (e.target.closest && e.target.closest('button, input, .aim-card'))) return;
        if (aimIs3d() && (aimLive()) && !S.locked) { aimLock(true); e.preventDefault(); return; }
        if (S.phase !== 'run') return;
        e.preventDefault();
        const aim = aimAim(), now = e.timeStamp || performance.now();
        if (!aim) return;
        if (S.run) {
            const t = aimShoot(S.run, aim);
            if (S.st.xh.dyn) S.open = 120;
            if (t) aimHitSnd(); else if (S.run.id !== 'tracking') aimBeep(180, 60, 'sine', 0.03);
        } else if (S.R) {
            const tg = S.R.tg, on = !!tg && aimDist(aimSpace(), aim, tg) <= tg.r;
            const r = aimReactClick(S.R, now, on);
            if (r === 'hit') aimHitSnd(); else if (r === 'false' || r === 'fail') aimBeep(200, 160, 'sawtooth', 0.04);
            if (r !== 'debounce' && r !== 'ignored') aimOv();
        }
    }
    function aimOnMove(e) {
        const S = aimS;
        if (S.locked) {
            const k = 0.08 * S.st.set.sens, mx = e.movementX || 0, my = e.movementY || 0;
            if (Math.abs(mx) > 250 || Math.abs(my) > 250) return; // Chrome's pointer-lock spike
            S.yaw = Math.max(-60, Math.min(60, S.yaw + mx * k));
            S.pitch = Math.max(-40, Math.min(40, S.pitch + (S.st.set.invY ? my : -my) * k));
            return;
        }
        S.ptr = aimLocal(e);
    }
    function aimOnLeave() { aimS.ptr = null; }
    function aimOnBlur() { if ((document.hidden || !document.hasFocus()) && aimLive()) aimPause(); }
    const aimTyping = e => { const t = e.target; return !!t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || !!t.isContentEditable); };
    function aimOnKey(e) {
        const S = aimS;
        if (!S.on || aimTyping(e)) return;
        const take = () => { e.preventDefault(); e.stopPropagation(); };
        if (e.key === 'Escape') {
            if (S.sheet) { take(); aimSheetOpen(''); }
            else if (aimLive()) { take(); aimPause(); }
            else if (S.phase === 'paused' && !aimIs3d()) { take(); aimResume(); }
        } else if ((e.code === 'Space' || e.key === ' ') && !S.sheet && (S.phase === 'idle' || S.phase === 'ares' || S.phase === 'rres')) {
            if (!S.hud.offsetParent && !S.max) return;
            take(); aimPlay();
        }
    }
    function aimOnClick(e) {
        const b = e.target.closest('[data-act]');
        if (!b || !aimS.hud.contains(b)) return;
        const S = aimS, [act, arg] = b.getAttribute('data-act').split(':');
        const st = S.st, save = () => aimSave(st);
        switch (act) {
            case 'play': case 'again': case 'restart': aimPlay(); break;
            case 'playpause': if (aimLive()) aimPause(); else if (S.phase === 'paused') aimResume(); else aimPlay(); break;
            case 'pause': aimPause(); break;
            case 'resume': aimResume(); break;
            case 'quit': aimQuit(); break;
            case 'lock': aimLock(true); break;
            case 'max': aimToggleMax(); break;
            case 'sheet': aimSheetOpen(arg || ''); break;
            case 'mode':
                if (aimScen().noCam || aimLive() || S.phase === 'paused') break;
                st.mode = arg === 'toggle' ? (st.mode === '3d' ? '2d' : '3d') : arg; save();
                if (S.phase !== 'idle') S.phase = 'idle', S.res = null;
                aimLayout(); aimResize(); aimOv(); aimSheet(); break;
            case 'scen': if (AIM_SCEN[arg]) { st.scen = arg; save(); aimQuit(); aimSheetOpen(''); } break;
            case 'diff': if (AIM_DIFF[arg]) { st.diff = arg; save(); aimQuit(); aimSheet(); } break;
            case 'xs': st.xh.xs = arg; save(); aimSheet(); break;
            case 'xc': st.xh.color = arg; save(); aimSheet(); break;
            case 'tc': st.set.tcolor = arg; save(); aimSheet(); break;
            case 'snd': st.set.hitSnd = arg; save(); aimHitSnd(); aimSheet(); break;
            case 'bg': st.set.bg = arg; save(); aimLayout(); aimSheet(); break;
            case 'copy': { const c = aimXhCode(st.xh); try { navigator.clipboard.writeText(c); } catch (_) {} b.classList.add('is-done'); break; }
            case 'paste': {
                const f = S.hud.querySelector('.aim-code'), apply = v => { const x = aimXhParse(v); if (f) f.classList.toggle('is-bad', !x); if (x) { st.xh = x; save(); aimSheet(); } };
                try { navigator.clipboard.readText().then(apply, () => apply(f && f.value)); } catch (_) { apply(f && f.value); }
                break;
            }
            case 'board': aimSheetOpen(''); if (typeof toggleGameLeaderboard === 'function') toggleGameLeaderboard('aim', true); break;
            case 'reset':
                if (!S.confirmReset) { S.confirmReset = true; b.textContent = 'Confirm reset'; break; }
                st.bests = {}; st.last = {}; save(); S.confirmReset = false; aimSheet(); aimOv(); break;
        }
    }
    // Sheet inputs: data-set="xh.len" / "set.sens", numbers, checkboxes, the crosshair code.
    function aimOnInput(e) {
        const el = e.target, k = el.getAttribute && el.getAttribute('data-set');
        if (!k) return;
        const S = aimS, [o, f] = k.split('.'), obj = S.st[o];
        if (f === 'code') { if (e.type !== 'change') return; const x = aimXhParse(el.value); el.classList.toggle('is-bad', !x); if (x) { S.st.xh = x; aimSave(S.st); aimSheet(); } return; }
        if (f === 'color') { if (!/^#[0-9a-f]{6}$/i.test(el.value)) { el.classList.add('is-bad'); return; } obj.color = el.value.toUpperCase(); }
        else if (el.type === 'checkbox') obj[f] = el.checked;
        else { const v = parseFloat(el.value); if (!isFinite(v)) return; obj[f] = Math.max(+el.min || -1e9, Math.min(+el.max || 1e9, v)); }
        aimSave(S.st);
        // Live preview without rebuilding the sheet under the slider.
        S.hud.querySelectorAll(`[data-out="${k}"]`).forEach(n => { n.textContent = aimOutVal(k, obj[f]); if (n.tagName === 'INPUT' && n !== el) n.value = obj[f]; });
        S.hud.querySelectorAll(`input[data-set="${k}"]`).forEach(n => { if (n !== el) n.value = obj[f]; });
        if (o === 'xh') aimXhPreview();
        if (e.type === 'change' || el.type === 'checkbox') aimSheet();
    }
    const aimOutVal = (k, v) => k === 'xh.op' ? v + '%' : k === 'set.fov' ? v + '°' : k === 'set.sens' ? (+v).toFixed(2) : String(v);

    // ── Drawing ───────────────────────────────────────────────────────
    function aimCam() {
        const S = aimS, f = S.W / 2 / Math.tan(S.st.set.fov * Math.PI / 360), y = S.yaw * Math.PI / 180, p = S.pitch * Math.PI / 180;
        return { W: S.W, H: S.H, f, cy: Math.cos(y), sy: Math.sin(y), cp: Math.cos(p), sp: Math.sin(p) };
    }
    const aimToCam = (C, q) => { const x1 = q[0] * C.cy - q[2] * C.sy, z1 = q[0] * C.sy + q[2] * C.cy; return [x1, q[1] * C.cp - z1 * C.sp, q[1] * C.sp + z1 * C.cp]; };
    const aimProj = (C, q) => [C.W / 2 + C.f * q[0] / q[2], C.H / 2 - C.f * q[1] / q[2]];
    const AIM_NEAR = 0.05;
    function aimClipPoly(C, pts) {
        const q = pts.map(p => aimToCam(C, p)), out = [];
        for (let i = 0; i < q.length; i++) {
            const a = q[i], b = q[(i + 1) % q.length], ia = a[2] > AIM_NEAR, ib = b[2] > AIM_NEAR;
            if (ia) out.push(a);
            if (ia !== ib) { const t = (AIM_NEAR - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, AIM_NEAR]); }
        }
        return out.map(p => aimProj(C, p));
    }
    function aimSeg(c, C, a, b) {
        let p = aimToCam(C, a), q = aimToCam(C, b);
        if (p[2] <= AIM_NEAR && q[2] <= AIM_NEAR) return;
        if (p[2] <= AIM_NEAR || q[2] <= AIM_NEAR) { const t = (AIM_NEAR - p[2]) / (q[2] - p[2]), m = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, AIM_NEAR]; if (p[2] <= AIM_NEAR) p = m; else q = m; }
        const A = aimProj(C, p), B = aimProj(C, q);
        c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]);
    }
    function aimDrawRoom(c, C, bg) {
        const T = aimS.tok, R = AIM_ROOM, X = R.x, F = R.fl, U = R.ce, B = R.bk, N = R.fr;
        c.fillStyle = T.back; c.fillRect(0, 0, C.W, C.H);
        if (bg === 'plain') return;
        const face = (pts, col) => { const p = aimClipPoly(C, pts); if (p.length < 3) return; c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1]); c.closePath(); c.fillStyle = col; c.fill(); };
        const shaded = bg === 'room';
        face([[-X, U, N], [X, U, N], [X, U, B], [-X, U, B]], shaded ? T.ceil : T.back);
        face([[-X, F, N], [X, F, N], [X, F, B], [-X, F, B]], shaded ? T.floor : T.back);
        face([[-X, U, N], [-X, U, B], [-X, F, B], [-X, F, N]], shaded ? T.side : T.back);
        face([[X, U, N], [X, U, B], [X, F, B], [X, F, N]], shaded ? T.side : T.back);
        face([[-X, U, B], [X, U, B], [X, F, B], [-X, F, B]], T.back);
        c.lineWidth = 1;
        c.beginPath();
        for (let z = N + 2; z < B; z += 2.5) { aimSeg(c, C, [-X, F, z], [-X, U, z]); aimSeg(c, C, [X, F, z], [X, U, z]); }
        for (let x = -X + 2.5; x < X; x += 2.5) aimSeg(c, C, [x, F, B], [x, U, B]);
        for (let y = F + 1.56; y < U; y += 1.56) aimSeg(c, C, [-X, y, B], [X, y, B]);
        c.strokeStyle = T.wgrid; c.stroke();
        c.beginPath();
        for (let x = -X; x <= X; x += 20 / 12) aimSeg(c, C, [x, F, N], [x, F, B]);
        for (let z = N + 1.5; z < B; z += 2.2) aimSeg(c, C, [-X, F, z], [X, F, z]);
        c.strokeStyle = T.grid; c.stroke();
        c.beginPath();
        [[-X, F], [X, F], [-X, U], [X, U]].forEach(e => aimSeg(c, C, [e[0], e[1], N], [e[0], e[1], B]));
        aimSeg(c, C, [-X, F, B], [X, F, B]); aimSeg(c, C, [-X, U, B], [X, U, B]); aimSeg(c, C, [-X, F, B], [-X, U, B]); aimSeg(c, C, [X, F, B], [X, U, B]);
        c.lineWidth = 1.2; c.strokeStyle = T.edge; c.stroke();
        if (!shaded) return;
        const L = aimToCam(C, [0, U - 1, B - 2]);
        if (L[2] > AIM_NEAR) { const p = aimProj(C, L), g = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], C.W * 0.45); g.addColorStop(0, T.light2); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, C.W, C.H); }
    }
    function aimVignette(c, W, H) {
        const g = c.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.42, W / 2, H * 0.45, Math.max(W, H) * 0.75);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, aimS.tok.vign); c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    // A spawn scales 0.3 → 1.12 → 1 over 180 ms; it can be hit from frame 1.
    function aimSpawnScale(age) { const a = Math.max(0, Math.min(1, age / 180)); return a < 0.61 ? [0.3 + 0.82 * a / 0.61, 0.35 + 0.65 * a / 0.61] : [1.12 - 0.12 * (a - 0.61) / 0.39, 1]; }
    function aimDisc(c, x, y, r, col, k, op) {
        const T = aimS.tok;
        c.save(); c.globalAlpha = op; c.translate(x, y); c.scale(k, k);
        if (T.cyber) {
            const g = c.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, aimRgba(col, 0.3)); g.addColorStop(0.2, aimRgba(col, 0.3)); g.addColorStop(0.21, aimRgba(col, 0.1)); g.addColorStop(1, aimRgba(col, 0.1));
            c.shadowColor = aimRgba(col, 0.6); c.shadowBlur = r * 0.64;
            c.beginPath(); c.arc(0, 0, r - 1, 0, 6.2832); c.fillStyle = g; c.fill(); c.lineWidth = 2; c.strokeStyle = col; c.stroke(); c.shadowBlur = 0;
            c.beginPath(); c.arc(0, 0, r * 0.56, 0, 6.2832); c.lineWidth = 1.5; c.strokeStyle = aimRgba(col, 0.8); c.stroke();
            c.beginPath(); c.arc(0, 0, Math.max(1.5, r * 0.15), 0, 6.2832); c.fillStyle = col; c.fill();
        } else {
            c.beginPath(); c.arc(0, 0, r + 3, 0, 6.2832); c.fillStyle = aimRgba(col, 0.22); c.fill();
            const g = c.createRadialGradient(0, -r * 0.24, 0, 0, 0, r); g.addColorStop(0, aimMix(col, '#ffffff', 0.2)); g.addColorStop(0.58, col); g.addColorStop(1, aimMix(col, '#000000', 0.16));
            c.shadowColor = aimRgba(col, 0.38); c.shadowBlur = r * 0.76; c.shadowOffsetY = r * 0.24;
            c.beginPath(); c.arc(0, 0, r, 0, 6.2832); c.fillStyle = g; c.fill(); c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
            c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(0, 0, r - 1, 0, 6.2832); c.stroke();
            c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,255,255,.38)'; c.beginPath(); c.arc(0, 0, r * 0.56, 0, 6.2832); c.stroke();
            c.beginPath(); c.arc(0, 0, Math.max(1.5, r * 0.15), 0, 6.2832); c.fillStyle = '#FFFFFF'; c.fill();
        }
        c.restore();
    }
    function aimSphere(c, x, y, r, col, k, op) {
        c.save(); c.globalAlpha = op; c.translate(x, y); c.scale(k, k);
        const g = c.createRadialGradient(-r * 0.32, -r * 0.4, 0, 0, 0, r);
        g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.09, aimMix(col, '#ffffff', 0.55)); g.addColorStop(0.38, col); g.addColorStop(0.76, aimMix(col, '#000000', 0.45)); g.addColorStop(1, aimMix(col, '#000000', 0.72));
        if (aimS.tok.cyber) { c.shadowColor = aimRgba(col, 0.55); c.shadowBlur = r * 0.8; }
        c.beginPath(); c.arc(0, 0, r, 0, 6.2832); c.fillStyle = g; c.fill();
        c.restore();
    }
    // Hit: a burst ring, a flash and 8 shards; the popup rises 24 px and fades by 600 ms.
    function aimBurst(c, x, y, r, col, bp, pts, sub, k) {
        const T = aimS.tok, s = r * 2;
        c.save();
        c.globalAlpha = 0.8 * (1 - bp) + 0.05; c.lineWidth = 1.5; c.strokeStyle = col; c.beginPath(); c.arc(x, y, s * (1.1 + bp * 0.9) / 2, 0, 6.2832); c.stroke();
        c.globalAlpha = Math.max(0, 1 - bp * 1.6);
        const g = c.createRadialGradient(x, y, 0, x, y, s * 0.75); g.addColorStop(0, T.light ? aimRgba(col, 0.45) : 'rgba(255,255,255,.65)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, s * 0.75, 0, 6.2832); c.fill();
        for (let i = 0; i < 8; i++) {
            const a = (i * 45 + 22.5) * Math.PI / 180, d = s * (0.72 + bp * 0.6) * 0.7, w = s * (0.16 - bp * 0.07);
            c.globalAlpha = 1 - bp * 0.7; c.fillStyle = i % 2 ? col : (T.light ? aimMix(col, '#000000', 0.1) : '#FFFFFF');
            c.save(); c.translate(x + Math.cos(a) * d, y + Math.sin(a) * d); c.rotate(a); c.fillRect(-w / 2, -1.25, w, 2.5); c.restore();
        }
        if (pts) {
            c.globalAlpha = Math.max(0, 1 - bp); c.textAlign = 'center'; c.shadowColor = T.popSh; c.shadowBlur = 8;
            const py = y - 30 * k - 24 * bp * k;
            c.fillStyle = T.text; c.font = `800 ${18 * k}px ${T.font}`; c.fillText(pts, x, py);
            if (sub) { c.fillStyle = T.accent; c.font = `700 ${9.5 * k}px ${T.font}`; c.fillText(sub, x, py + 13 * k); }
        }
        c.restore();
    }
    function aimDrawXh(c, x, y, cfg, k, open) {
        const r = n => Math.round(n * 2) / 2, L = r(cfg.len * k), T = r(cfg.thick * k), G = r((cfg.gap + (open || 0)) * k), ow = cfg.outline ? r(cfg.ow * k) : 0;
        const xs = cfg.xs, bars = [];
        if (xs === 'cross' || xs === 'crossdot' || xs === 't') { bars.push([G, -T / 2, L, T], [-G - L, -T / 2, L, T], [-T / 2, G, T, L]); if (xs !== 't') bars.push([-T / 2, -G - L, T, L]); }
        const dot = xs === 'dot' || xs === 'crossdot' || ((xs === 'circle' || xs === 't') && cfg.dot), D = r((xs === 'dot' ? Math.max(cfg.ds, 3) : cfg.ds) * k), cr = G + L * 0.6;
        c.save(); c.translate(Math.round(x), Math.round(y)); c.globalAlpha = cfg.op / 100;
        const pass = (col, e) => {
            c.fillStyle = col; c.strokeStyle = col;
            for (const b of bars) if (b[2] && b[3]) c.fillRect(b[0] - e, b[1] - e, b[2] + 2 * e, b[3] + 2 * e);
            if (xs === 'circle') { c.lineWidth = T + 2 * e; c.beginPath(); c.arc(0, 0, Math.max(1, cr - T / 2), 0, 6.2832); c.stroke(); }
            if (dot && D) { c.beginPath(); c.arc(0, 0, D / 2 + e, 0, 6.2832); c.fill(); }
        };
        if (ow) pass('rgba(0,0,0,.85)', ow);
        pass(cfg.color, 0);
        c.restore();
    }
    function aimDraw() {
        const S = aimS, c = S.ctx, W = S.W, H = S.H;
        if (!c || !W) return;
        c.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
        c.clearRect(0, 0, W, H);
        const sc = aimScen(), is3d = aimIs3d(), T = S.tok, col = S.st.set.tcolor, k = S.max ? 1.7 : 1;
        const C = is3d ? aimCam() : null, run = S.run, R = S.R;
        if (is3d) { aimDrawRoom(c, C, S.st.set.bg); aimVignette(c, W, H); }
        else if (S.st.set.bg === 'grid' && !(R && sc.noCam)) {
            c.beginPath(); for (let x = 0; x <= W; x += 24) { c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, H); } for (let y = 0; y <= H; y += 24) { c.moveTo(0, y + 0.5); c.lineTo(W, y + 0.5); }
            c.strokeStyle = T.cyber ? aimRgba('#00F0FF', 0.08) : T.light ? 'rgba(15,23,42,.08)' : 'rgba(255,255,255,.06)'; c.lineWidth = 1; c.stroke();
        }
        // World → screen for a yaw/pitch point (3D) or px (2D); [x, y, scale] or null behind the camera.
        const at = (p, r) => {
            if (!is3d) return [p.x, p.y, r];
            const d = aimDir(p.x, p.y), q = aimToCam(C, [d[0] * AIM_D, d[1] * AIM_D, d[2] * AIM_D]);
            if (q[2] < 0.3) return null;
            const s = aimProj(C, q); return [s[0], s[1], C.f * AIM_D * Math.tan(r * Math.PI / 180) / q[2], q];
        };
        const tg = run ? run.tg : R && R.tg ? [R.tg] : [], el = run ? run.el : 0;
        if (run && run.id === 'tracking' && run.trail.length > 1) {
            c.beginPath(); run.trail.forEach((p, i) => { const s = at(p, 1); if (s) i ? c.lineTo(s[0], s[1]) : c.moveTo(s[0], s[1]); });
            c.globalAlpha = 0.45; c.lineWidth = 2.5; c.lineCap = 'round'; c.strokeStyle = T.accent; c.stroke(); c.globalAlpha = 1;
        }
        if (is3d) for (const t of tg) {
            const s = at(t, t.r); if (!s) continue;
            const d = aimDir(t.x, t.y), f = aimToCam(C, [d[0] * AIM_D, AIM_ROOM.fl, d[2] * AIM_D]);
            if (f[2] <= AIM_NEAR) continue;
            const p = aimProj(C, f), rx = s[2] * 1.3, g = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], rx);
            g.addColorStop(0, T.shadow); g.addColorStop(1, 'rgba(0,0,0,0)');
            c.save(); c.globalAlpha = 0.6; c.translate(p[0], p[1]); c.scale(1, 0.25); c.translate(-p[0], -p[1]); c.fillStyle = g; c.beginPath(); c.arc(p[0], p[1], rx, 0, 6.2832); c.fill(); c.restore();
        }
        for (const m of run ? run.marks : []) {
            const s = at(m, 0.5); if (!s) continue;
            const a = (el - m.at) / AIM_FX_MS, d = (18 + 9 * a) * k / 2;
            c.save(); c.globalAlpha = 0.8 * (1 - a); c.strokeStyle = T.muted; c.fillStyle = T.muted; c.lineWidth = 1.5;
            c.beginPath(); c.arc(s[0], s[1], d, 0, 6.2832); c.stroke(); c.beginPath(); c.arc(s[0], s[1], 1.5, 0, 6.2832); c.fill(); c.restore();
        }
        const order = is3d ? tg.slice().sort((a, b) => (at(b, b.r) || [0, 0, 0, [0, 0, 0]])[3][2] - (at(a, a.r) || [0, 0, 0, [0, 0, 0]])[3][2]) : tg;
        for (const t of order) {
            const s = at(t, t.r); if (!s) continue;
            const age = run ? el - t.born : performance.now() - t.born, sp = aimSpawnScale(age);
            if (run && run.id === 'shrink') { const g = at(t, t.r0 * 1.12); c.save(); c.setLineDash([4, 4]); c.lineWidth = 1.5; c.strokeStyle = aimRgba(col, 0.5); c.beginPath(); c.arc(g[0], g[1], g[2], 0, 6.2832); c.stroke(); c.restore(); }
            (is3d ? aimSphere : aimDisc)(c, s[0], s[1], s[2], col, sp[0], sp[1]);
            if (run && run.id === 'tracking') {
                const rr = s[2] * 1.6, a = aimLiveAcc(run) || 0;
                c.save(); c.lineWidth = 3; c.strokeStyle = T.track; c.beginPath(); c.arc(s[0], s[1], rr, 0, 6.2832); c.stroke();
                c.strokeStyle = T.accent; c.lineCap = 'round'; c.beginPath(); c.arc(s[0], s[1], rr, -Math.PI / 2, -Math.PI / 2 + 6.2832 * a / 100); c.stroke(); c.restore();
            }
        }
        for (const f of run ? run.fx : []) {
            const bp = (el - f.at) / AIM_FX_MS, s = at(f, f.r); if (!s) continue;
            if (f.vanish) {
                c.save(); c.globalAlpha = 0.7 * (1 - bp); c.setLineDash([4, 4]); c.lineWidth = 1.5; c.strokeStyle = T.red; c.beginPath(); c.arc(s[0], s[1], 28 * k, 0, 6.2832); c.stroke();
                c.setLineDash([]); c.fillStyle = T.redText; c.font = `700 ${9 * k}px ${T.font}`; c.textAlign = 'center'; c.fillText('MISS', s[0], s[1] + 28 * k + 12 * k); c.restore();
            } else aimBurst(c, s[0], s[1], s[2], col, bp, f.pts, f.sub, k);
        }
        // Crosshair: centred in 3D, at the pointer in 2D while aiming.
        const show = is3d ? !sc.noCam && (aimLive() || S.phase === 'paused' || S.phase === 'idle') : (aimLive() || S.phase === 'paused') && S.ptr && !sc.noCam;
        if (show) { const p = is3d ? { x: W / 2, y: H / 2 } : S.ptr; aimDrawXh(c, p.x, p.y, S.st.xh, S.max ? 1.3 : 1, S.open > 0 ? 3 : 0); }
    }

    // ── HUD (tiles, chips) — text only changes when its value does ──
    const aimSet = (el, v) => { if (el && el.textContent !== v) el.textContent = v; };
    function aimTiles() {
        const S = aimS, sc = aimScen(), run = S.run, R = S.R, res = S.res, st = S.st;
        if (sc.group === 'aim') {
            const len = sc.len * 1000, left = run ? Math.max(0, run.len - run.el) : res ? 0 : len, frac = left / len;
            const acc = run ? aimLiveAcc(run) : res && res.kind === 'aim' ? res.acc : null, m = run && run.id !== 'chaos' ? aimMult(run.streak) : 1;
            return [['TIME', (left / 1000).toFixed(1), 's', '', { bar: st.set.timerBar ? frac : -1, hot: frac < 0.3 && frac > 0 }],
                ['SCORE', aimFmt(run ? run.score : res && res.kind === 'aim' ? res.score : 0), '', ''],
                ['ACCURACY', acc === null ? '—' : String(acc), acc === null ? '' : '%', ''],
                ['STREAK', String(run ? run.streak : res && res.kind === 'aim' ? res.bestStreak : 0), res && !run ? 'best' : '', m > 1 ? '×' + m : '']];
        }
        const n = R ? R.rounds : sc.rounds, t = R ? R.times : res && res.kind === 'react' ? res.times : [], fs = R ? R.fs : res && res.kind === 'react' ? res.fs : 0;
        const last = t.length ? t[t.length - 1] : null, avg = t.length ? Math.round(aimMean(t)) : null;
        return [['ROUND', String(R ? R.round : res ? n : 0), '/' + n, ''], ['LAST', last === null ? '—' : aimFmt(last), last === null ? '' : 'ms', ''],
            ['AVERAGE', avg === null ? '—' : aimFmt(avg), avg === null ? '' : 'ms', ''], [S.hud.classList.contains('is-narrow') ? 'FALSE ST.' : 'FALSE STARTS', String(fs), '/3', '', { pips: fs, hot: fs >= 2 }]];
    }
    function aimHudSync() {
        const S = aimS, st = S.st, sc = aimScen(), mode = aimMode().toUpperCase(), narrow = S.hud.classList.contains('is-narrow');
        aimTiles().forEach((d, i) => {
            const el = S.tiles[i], x = d[4] || {};
            aimSet(el.children[0], d[0]); aimSet(el.querySelector('b'), d[1]); aimSet(el.querySelector('u'), d[2]); aimSet(el.querySelector('em'), d[3]);
            el.classList.toggle('is-hot', !!x.hot);
            el.classList.toggle('has-bar', x.bar >= 0);
            if (x.bar >= 0) el.querySelector('.bar i').style.width = Math.round(x.bar * 100) + '%';
            el.classList.toggle('has-pips', x.pips !== undefined);
            if (x.pips !== undefined) Array.from(el.querySelectorAll('.pips i')).forEach((p, j) => p.classList.toggle('is-on', j < x.pips));
        });
        const key = [st.scen, st.diff, mode, narrow, S.phase, S.max].join('|');
        if (key !== S.hudKey) {
            S.hudKey = key;
            const dn = aimDiffName(st.diff), meta = sc.noCam ? dn : (narrow || sc.name.length > 5) ? mode + (st.diff !== 'normal' && !narrow ? ' · ' + dn : '') : mode + ' · ' + dn;
            S.hud.querySelector('.aim-chip-i').innerHTML = aimSvg(AIM_ICON[st.scen]);
            aimSet(S.hud.querySelector('.aim-chip-t b'), sc.name); aimSet(S.hud.querySelector('.aim-chip-t i'), S.max ? (sc.group === 'react' ? 'Reaction · ' + dn : mode + ' · ' + dn) : meta);
            const b = aimBestOf(st, st.scen, aimMode(), st.diff);
            aimSet(S.hud.querySelector('.aim-bestb b'), b ? aimFmt(b) + (sc.group === 'react' ? ' ms' : '') : '—');
            S.hud.querySelectorAll('.aim-seg button').forEach(x => x.classList.toggle('is-on', !sc.noCam && x.getAttribute('data-act') === 'mode:' + aimMode()));
            S.hud.querySelector('.aim-seg').classList.toggle('is-off', !!sc.noCam);
            S.hud.querySelector('.aim-mode1').classList.toggle('is-off', !!sc.noCam);
            aimSet(S.hud.querySelector('.aim-mode1 b'), mode);
            const live = aimLive(), pp = S.hud.querySelector('.aim-pp');
            pp.innerHTML = aimSvg(live ? AIM_ICON.pause : AIM_ICON.play) + `<span>${live ? 'Pause' : S.phase === 'paused' ? 'Resume' : 'Play'}</span>`;
            pp.setAttribute('aria-label', live ? 'Pause' : 'Play');
            S.hud.classList.toggle('is-custom', st.diff !== 'normal');
            const ranked = aimRanked(st.scen, aimMode(), st.diff);
            aimSet(S.hud.querySelector('.aim-rank'), dn + ' · ' + (ranked ? 'ranked' : st.diff === 'normal' ? 'local best (' + mode + ')' : 'not ranked'));
        }
        const done = S.phase === 'ares' || S.phase === 'rres';
        aimSet(S.hud.querySelector('.aim-status span'), done ? 'Run complete' : sc.noCam && S.phase === 'run' ? 'Click anywhere on GO' : aimIs3d() ? (S.locked ? 'Mouse locked' : 'Mouse free') : 'Free cursor');
        S.hud.querySelector('.aim-status').classList.toggle('is-on', !done && (aimLive() || S.locked));
        // In-viewport chip: per scenario, while running.
        let chip = null;
        const run = S.run, R = S.R;
        if (S.phase === 'run' && run) {
            if (run.id === 'tracking') chip = ['ON TARGET', (aimLiveAcc(run) || 0) + '%', 1];
            else if (run.id === 'flick') chip = ['AVG TTK', run.kills.length ? Math.round(aimMean(run.kills.map(x => x.ttk))) + ' ms' : '—'];
            else if (run.id === 'shrink') chip = ['LIFETIME', (AIM_SCEN.shrink.life * AIM_DIFF[run.diff].life / 1000).toFixed(1) + ' s'];
        } else if (S.phase === 'run' && R && R.id === 'target') chip = ['ROUND ' + R.round + ' / ' + R.rounds, aimIs3d() ? 'Flick & click' : 'Click it'];
        const vc = S.hud.querySelector('.aim-vchip');
        vc.classList.toggle('is-on', !!chip);
        if (chip) { aimSet(vc.children[0], chip[0]); aimSet(vc.children[1], chip[1]); vc.classList.toggle('is-acc', !!chip[2]); }
    }

    // ── Overlays (DOM over the canvas): rebuilt only when the state they show changes ──
    function aimVpBg() {
        const S = aimS, R = S.R, sc = aimScen();
        const bg = sc.noCam && R && S.phase !== 'paused' ? (R.phase === 'go' ? 'go' : R.phase === 'soon' ? 'soon' : 'wait') : '';
        ['wait', 'go', 'soon'].forEach(k => S.vp.classList.toggle('is-' + k, bg === k));
    }
    function aimOvCount() {
        const S = aimS, n = Math.max(1, Math.ceil(S.count / 1000)), el = S.vp.querySelector('.aim-count-n'), ring = S.vp.querySelector('.aim-count-ring');
        if (el) aimSet(el, String(n));
        if (ring) ring.style.strokeDasharray = (377 * (S.count % 1000 || 1000) / 1000).toFixed(1) + ' 377';
    }
    function aimOv() {
        const S = aimS; if (!S.hud) return;
        aimVpBg();
        const sc = aimScen(), st = S.st, R = S.R, mode = aimMode().toUpperCase(), dn = aimDiffName(st.diff), I = AIM_ICON, kbd = k => `<kbd>${k}</kbd>`;
        let key = S.phase + '|' + st.scen + '|' + st.diff + '|' + mode + '|' + S.locked, h = '';
        if (R && S.phase === 'run') key += '|' + R.phase + '|' + R.round + '|' + R.fs + '|' + R.times.length;
        if (key === S.ovKey) return;
        S.ovKey = key;
        const needLock = aimIs3d() && !S.locked && aimLive();
        if (needLock) {
            h = `<div class="aim-scrimv"></div><div class="aim-ovc"><button type="button" class="aim-card aim-unlock" data-act="lock"><span class="aim-lockic">${aimSvg(I.lock)}</span><b>Click to lock mouse</b><span>Mouse turns the camera. The crosshair stays centred.</span><span class="aim-hint">${kbd('Esc')}to release and pause</span></button></div>`;
        } else if (S.phase === 'idle') {
            const last = st.last[aimBestKey(st.scen, aimMode(), st.diff)], b = aimBestOf(st, st.scen, aimMode(), st.diff), react = sc.group === 'react';
            const kick = react ? 'REACTION · ' + sc.name.toUpperCase() : 'AIM · SCENARIO';
            const meta = react ? `${sc.rounds} rounds · ${(sc.minDelay * AIM_DIFF[st.diff].delay[0] / 1000).toFixed(1).replace('.0', '')}–${(sc.maxDelay * AIM_DIFF[st.diff].delay[1] / 1000).toFixed(1).replace('.0', '')} s delay · ${dn}${sc.noCam ? '' : ' · ' + mode}`
                : `${sc.count === 1 ? (st.scen === 'tracking' ? 'Moving target' : '1 target') : sc.count + ' targets'} · ${sc.len} s · ${dn} · ${mode}`;
            const lastT = !last ? 'No runs yet' : react ? (last.fail ? 'failed run' : 'avg ' + aimFmt(last.avg) + ' ms') : aimFmt(last.score) + ' pts · ' + last.acc + '%';
            h = `<div class="aim-ovc"><div class="aim-idle"><div class="aim-kick">${kick}</div><div class="aim-idle-n">${sc.name}</div><div class="aim-idle-m">${meta}</div>` +
                `<div class="aim-rings"><button type="button" class="aim-playbig" data-act="play" aria-label="Play">${aimSvg(I.play)}</button></div>` +
                `<div class="aim-hint">Click to start${kbd('Space')}</div></div></div>` +
                `<div class="aim-lastpill"><span class="aim-kick">LAST</span><b>${lastT}</b>${b ? `<span>· best ${aimFmt(b)}${react ? ' ms' : ''}</span>` : ''}</div>`;
        } else if (S.phase === 'count') {
            h = `<div class="aim-scrimv"></div><div class="aim-ovc"><div class="aim-count"><div class="aim-count-d"><svg viewBox="0 0 132 132" width="132" height="132"><circle cx="66" cy="66" r="60" class="aim-count-t"/><circle cx="66" cy="66" r="60" class="aim-count-ring"/></svg><span class="aim-count-n">3</span></div>` +
                `<b>Get ready</b><span>${sc.name} · ${sc.len} s · aim at the first target</span></div></div>`;
        } else if (S.phase === 'paused') {
            const run = S.run, acc = run ? aimLiveAcc(run) : null;
            const line = run ? `${sc.name} · ${((run.len - run.el) / 1000).toFixed(1)} s left` : `${sc.name} · round ${R ? R.round : 1} of ${sc.rounds}`;
            const sub = run ? `${aimFmt(run.score)} pts · ${acc === null ? '—' : acc + '%'} accuracy` : `${R ? R.times.length : 0} rounds timed · ${R ? R.fs : 0}/3 false starts`;
            h = `<div class="aim-scrimv is-blur"></div><div class="aim-ovc"><div class="aim-card aim-pausec"><div class="aim-kick">PAUSED</div><div class="aim-pause-t">${line}</div><div class="aim-pause-s">${sub}</div>` +
                `<button type="button" class="aim-btn is-primary" data-act="resume">${aimSvg(I.play)}Resume</button><div class="aim-row2"><button type="button" class="aim-btn" data-act="restart">${aimSvg(I.restart)}Restart</button><button type="button" class="aim-btn is-red" data-act="quit">${aimSvg(I.close)}Quit</button></div>` +
                `<div class="aim-hint">${kbd('Esc')}to resume</div></div></div>`;
        } else if (S.phase === 'run' && R) {
            const avg = R.times.length ? Math.round(aimMean(R.times)) : 0, pa = st.bests[aimBestKey(R.id, aimMode(), R.diff) + '|avg'];
            if (R.phase === 'wait' && sc.noCam) h = `<div class="aim-ovc aim-rx"><div class="aim-wait"><div class="aim-waitr"><i></i><i></i><i></i></div><b>Wait for green…</b><span>Round ${R.round} of ${R.rounds} · don’t click yet</span></div></div>`;
            else if (R.phase === 'wait') h = `<div class="aim-ovc aim-rx is-soft"><div class="aim-wait"><b>Wait for the target…</b><span>Round ${R.round} of ${R.rounds} · don’t click yet</span></div></div>`;
            else if (R.phase === 'go' && sc.noCam) h = '<div class="aim-ovc"><div class="aim-go"><b>GO</b><span>CLICK ANYWHERE</span></div></div>';
            else if (R.phase === 'time') {
                const v = R.times[R.times.length - 1], ref = pa || avg, d = v - ref;
                h = `<div class="aim-ovc aim-rx${sc.noCam ? '' : ' is-soft'}"><div class="aim-time"><div class="aim-kick">ROUND ${R.round} OF ${R.rounds}</div><div class="aim-time-v"><b>${aimFmt(v)}</b><span>ms</span></div>` +
                    (ref && R.times.length > 1 || pa ? `<div class="aim-time-c${d <= 0 ? ' is-good' : ''}">${d <= 0 ? '−' : '+'}${Math.abs(Math.round(d))} ms vs your average</div>` : '') + `<span>Next round in 0.3 s</span></div></div>`;
            } else if (R.phase === 'soon') {
                h = `<div class="aim-ovc aim-rx is-soon"><div class="aim-soon"><span class="aim-soonic">${aimSvg(I.warn)}</span><b>${R.fromWait ? 'Too soon' : 'Missed'}</b><div class="aim-soon-n">False start ${R.fs} of 3<span>${[0, 1, 2].map(i => `<i class="${i < R.fs ? 'is-on' : ''}"></i>`).join('')}</span></div>` +
                    `<span>${R.fromWait ? 'Wait for green' : 'Click the target itself'}. Round re-arms in 1.2 s.<br>A third false start ends the run.</span></div></div>`;
            }
        } else if (S.phase === 'ares' && S.res) h = aimOvAimRes(S.res);
        else if (S.phase === 'rres' && S.res) h = aimOvReactRes(S.res);
        S.hud.querySelector('.aim-ov').innerHTML = h;
        if (S.phase === 'count') aimOvCount();
        aimLayout(); aimFitOv();
    }
    // Overlay cards scale down to fit a short viewport (the 316 px column), and up 1.5× in Max.
    function aimFitOv() {
        const S = aimS; if (!S.hud || !S.W) return;
        S.hud.querySelectorAll('.aim-ovc > *').forEach(el => {
            el.style.transform = '';
            const w = el.offsetWidth, h = el.offsetHeight;
            if (!w || !h) return;
            const k = Math.min(S.max ? 1.5 : 1, (S.H - 12) / h, (S.W - 8) / w);
            if (k !== 1) el.style.transform = 'scale(' + k.toFixed(3) + ')';
        });
    }
    function aimOvAimRes(r) {
        const sc = AIM_SCEN[r.id], mode = r.mode.toUpperCase(), track = r.id === 'tracking', I = AIM_ICON;
        const tag = r.ranked ? 'Ranked · posted' : r.diff !== 'normal' ? 'Custom · not ranked' : 'Local best · ' + mode;
        const cmp = r.isBest ? [r.prev ? 'Previous best ' + aimFmt(r.prev) : 'First best', r.prev ? '+' + aimFmt(r.score - r.prev) : aimFmt(r.score), 'is-good'] : [r.prev ? 'Personal best ' + aimFmt(r.prev) : 'Personal best', r.prev ? '−' + aimFmt(r.prev - r.score) : '—', ''];
        const stats = [['ACCURACY', r.acc, '%'], track ? ['ON TARGET', r.onS.toFixed(1), 's'] : ['HITS/SHOTS', r.hits, '/' + r.shots], ['REACTION', track ? '—' : r.react || '—', track || !r.react ? '' : 'ms'],
            ['AVG TTK', track ? '—' : r.ttk || '—', track || !r.ttk ? '' : 'ms'], [track ? 'BEST HOLD' : 'BEST STREAK', r.bestStreak, track ? 's' : ''], ['XP EARNED', '+' + r.xp, 'xp', 1]];
        return `<div class="aim-scrimv is-blur"></div>${r.isBest ? '<div class="aim-bestglow"></div>' : ''}<div class="aim-ovc"><div class="aim-res">` +
            `<div class="aim-res-h"><span class="aim-kick">${sc.name.toUpperCase()} · ${mode} · ${AIM_DIFF[r.diff].name.toUpperCase()}</span>${r.isBest ? `<span class="aim-newbest">${aimSvg(I.trophy)}NEW BEST</span>` : `<span class="aim-tag">${tag}</span>`}</div>` +
            `<div class="aim-res-m"><div class="aim-res-big${r.isBest ? ' is-best' : ''}"><b>${aimFmt(r.score)}</b><span>pts</span></div><div class="aim-res-c"><span>${cmp[0]}</span><b class="${cmp[2]}">${cmp[1]}</b></div></div>` +
            `<div class="aim-spark-h"><span>${track ? 'ON TARGET' : 'HITS PER SECOND'}</span><span>0 – ${sc.len} s</span></div><div class="aim-spark">${r.spark.map(v => `<i class="${v >= 0.8 ? 'is-hi' : ''}" style="height:${Math.max(2, Math.round(v * 36))}px"></i>`).join('')}</div>` +
            `<div class="aim-stats">${stats.map(s => `<div class="aim-stat"><span>${s[0]}</span><b${s[3] ? ' class="is-acc"' : ''}>${s[1]}<u>${s[2]}</u></b></div>`).join('')}</div>` +
            `<div class="aim-row2 is-wide"><button type="button" class="aim-btn is-primary" data-act="again">${aimSvg(I.restart)}Play again</button><button type="button" class="aim-btn" data-act="sheet:scenarios">Change scenario</button></div></div></div>`;
    }
    function aimOvReactRes(r) {
        const sc = AIM_SCEN[r.id], I = AIM_ICON, fail = r.fail, real = r.times.filter(v => v < r.max || !fail);
        const tag = fail ? 'Not posted' : r.ranked ? 'Ranked · posted' : r.diff !== 'normal' ? 'Custom · not ranked' : 'Local best · 3D';
        const top = Math.max(320, ...real.map(v => v * 1.15)), bestV = real.length ? Math.min(...real) : 0, ok = r.times.filter(v => v < r.max).length;
        const bars = r.times.map((v, i) => { const pen = fail && v >= r.max; return `<div class="aim-rb${pen ? ' is-pen' : !fail && v === bestV ? ' is-best' : ''}"><span>${aimFmt(v)}</span><i style="height:${pen ? 96 : Math.max(3, Math.round(v / top * 96))}px"></i></div>`; }).join('');
        const cmp = r.isBest ? [r.prev ? 'Previous best ' + aimFmt(r.prev) + ' ms' : 'First best', r.prev ? '−' + aimFmt(r.prev - r.best) + ' ms' : aimFmt(r.best) + ' ms', 'is-good'] : [r.prev ? 'Personal best ' + aimFmt(r.prev) + ' ms' : 'Personal best', r.prev ? (fail ? aimFmt(r.prev) + ' ms' : '+' + aimFmt(r.best - r.prev) + ' ms') : '—', ''];
        const stats = fail ? [['AVERAGE', aimFmt(r.avg), 'ms'], ['BEST ROUND', bestV ? aimFmt(bestV) : '—', bestV ? 'ms' : ''], ['XP EARNED', '+' + r.xp, 'xp', 1]] : [['FALSE STARTS', r.fs, '/3'], ['BEST ROUND', aimFmt(r.best), 'ms'], ['XP EARNED', '+' + r.xp, 'xp', 1]];
        return `<div class="aim-scrimv is-blur"></div><div class="aim-ovc"><div class="aim-res">` +
            `<div class="aim-res-h"><span class="aim-kick${fail ? ' is-red' : ''}">${sc.name.toUpperCase()} · ${fail ? 'RUN FAILED' : AIM_DIFF[r.diff].name.toUpperCase()}</span>${r.isBest ? `<span class="aim-newbest">${aimSvg(I.trophy)}NEW BEST</span>` : `<span class="aim-tag${fail ? ' is-red' : ''}">${tag}</span>`}</div>` +
            `<div class="aim-res-m"><div><div class="aim-res-big${fail ? ' is-fail' : ''}"><b>${fail ? r.fs : aimFmt(r.avg)}</b><span>${fail ? 'false starts' : 'ms avg'}</span></div><div class="aim-res-sub">${fail ? `Rounds ${ok + 1}–${r.rounds} counted at ${aimFmt(r.max)} ms` : `Best round ${aimFmt(r.best)} ms · dashed line = avg`}</div></div><div class="aim-res-c"><span>${cmp[0]}</span><b class="${cmp[2]}">${cmp[1]}</b></div></div>` +
            `<div class="aim-rbars${r.times.length > 5 ? ' is-many' : ''}">${fail ? '' : `<div class="aim-avgline" style="bottom:${Math.round(r.avg / top * 96)}px"></div>`}${bars}</div>` +
            `<div class="aim-rlabels">${r.times.map((v, i) => `<span>R${i + 1}</span>`).join('')}</div>` +
            `<div class="aim-stats is-3">${stats.map(s => `<div class="aim-stat"><span>${s[0]}</span><b${s[3] ? ' class="is-acc"' : ''}>${s[1]}<u>${s[2]}</u></b></div>`).join('')}</div>` +
            `<div class="aim-row2 is-wide"><button type="button" class="aim-btn is-primary" data-act="again">${aimSvg(I.restart)}${fail ? 'Try again' : 'Play again'}</button><button type="button" class="aim-btn" data-act="sheet:scenarios">Change scenario</button></div></div></div>`;
    }

    // ── Sheets: scenarios, crosshair, settings, personal bests ──
    function aimSheetOpen(name) {
        const S = aimS;
        if (name && aimLive()) aimPause();
        S.sheet = name; S.confirmReset = false;
        // Shown first: the crosshair previews measure their canvases.
        aimLayout(); aimSheet();
    }
    function aimSheet() {
        const S = aimS, w = S.hud && S.hud.querySelector('.aim-sheet');
        if (!w) return;
        const st = S.st, I = AIM_ICON, name = S.sheet, T = { scenarios: ['CHOOSE', 'Scenario'], crosshair: ['CROSSHAIR', 'Crosshair editor'], settings: ['AIMLAB', 'Settings'], bests: ['RECORDS', 'Personal bests'] }[name];
        if (!T) { w.innerHTML = ''; return; }
        const seg = (opts, cur, act) => `<div class="aim-segs">${opts.map(o => `<button type="button" class="${o[0] === cur ? 'is-on' : ''}" data-act="${act}:${o[0]}">${o[1]}</button>`).join('')}</div>`;
        const tog = (k, on) => `<input type="checkbox" class="aim-tog" data-set="${k}"${on ? ' checked' : ''}>`;
        const slider = (k, label, v, min, max, step, t) => `<label class="aim-sl"><span class="aim-sl-h"><span>${t || ''}${label}</span><b data-out="${k}">${aimOutVal(k, v)}</b></span><input type="range" data-set="${k}" min="${min}" max="${max}" step="${step || 1}" value="${v}"></label>`;
        let b = '';
        if (name === 'scenarios') {
            const card = id => {
                const s = AIM_SCEN[id], on = id === st.scen, react = s.group === 'react', bb = (m) => aimBestOf(st, id, m, st.diff);
                const b1 = react ? (s.noCam ? (bb('2d') ? aimFmt(bb('2d')) + ' ms' : '—') : '2D ' + (bb('2d') ? aimFmt(bb('2d')) + ' ms' : '—')) : '2D ' + (bb('2d') ? aimFmt(bb('2d')) : '—');
                const av = st.bests[aimBestKey(id, '2d', st.diff) + '|avg'];
                const b2 = react ? (s.noCam ? (av ? 'avg ' + aimFmt(av) : '') : '3D ' + (bb('3d') ? aimFmt(bb('3d')) + ' ms' : '—')) : '3D ' + (bb('3d') ? aimFmt(bb('3d')) : '—');
                const len = react ? s.rounds + ' rounds' : s.len + ' s';
                return `<button type="button" class="aim-card aim-scard${on ? ' is-on' : ''}" data-act="scen:${id}"><span class="aim-scard-i">${aimSvg(I[id])}</span><span class="aim-scard-t"><span><b>${s.name}</b><i>${len}</i></span><span>${s.desc}</span></span><span class="aim-scard-b"><b>${b1}</b><span>${b2}</span></span></button>`;
            };
            b = `<div class="aim-segs is-diff">${Object.keys(AIM_DIFF).map(d => `<button type="button" class="${d === st.diff ? 'is-on' : ''}" data-act="diff:${d}"><b>${AIM_DIFF[d].name}</b><span>${AIM_DIFF[d].sub}</span></button>`).join('')}</div>` +
                `<div class="aim-note"><i></i>Normal runs post to the team leaderboard. Easy and Hard stay local.</div>` +
                `<div class="aim-grp"><span>AIM</span><span>BEST 2D · 3D</span></div>${['chaos', 'flick', 'tracking', 'shrink'].map(card).join('')}` +
                `<div class="aim-grp"><span>REACTION · LOWER IS BETTER</span><span>BEST</span></div>${['screen', 'target'].map(card).join('')}`;
        } else if (name === 'crosshair') {
            const x = st.xh;
            b = `<div class="aim-xhp"><div class="aim-xhbox is-2d"><canvas class="aim-xhc" data-k="2d"></canvas><span>2D ARENA</span></div><div class="aim-xhbox is-3d"><canvas class="aim-xhc" data-k="3d"></canvas><span>3D ROOM</span></div></div>` +
                `<div class="aim-presets">${[['cross', 'Cross'], ['dot', 'Dot'], ['crossdot', 'Cross+dot'], ['circle', 'Circle'], ['t', 'T-shape']].map(p => `<button type="button" class="aim-preset${x.xs === p[0] ? ' is-on' : ''}" data-act="xs:${p[0]}"><canvas class="aim-xhc" data-k="p" data-xs="${p[0]}"></canvas><span>${p[1]}</span></button>`).join('')}</div>` +
                `<div class="aim-swatches">${AIM_SWATCH.map(c => `<button type="button" class="aim-sw${x.color.toUpperCase() === c ? ' is-on' : ''}" data-act="xc:${c}" aria-label="Colour ${c}" style="--sw:${c}"></button>`).join('')}<label class="aim-hex"><i style="background:${x.color}"></i><input type="text" maxlength="7" data-set="xh.color" value="${x.color}" aria-label="Custom colour"></label></div>` +
                `<div class="aim-sliders">${slider('xh.len', 'Length', x.len, 0, 20)}${slider('xh.thick', 'Thickness', x.thick, 1, 6)}${slider('xh.gap', 'Gap', x.gap, 0, 12)}${slider('xh.op', 'Opacity', x.op, 10, 100, 5)}` +
                `${slider('xh.ow', 'Outline', x.ow, 1, 3, 1, tog('xh.outline', x.outline))}${slider('xh.ds', 'Centre dot', x.ds, 1, 6, 1, tog('xh.dot', x.dot))}</div>` +
                `<label class="aim-row"><span><b>Dynamic</b><i>Opens briefly on each shot</i></span>${tog('xh.dyn', x.dyn)}</label>` +
                `<div class="aim-codeh"><input type="text" class="aim-code" data-set="xh.code" value="${aimXhCode(x)}" aria-label="Crosshair code" spellcheck="false"><button type="button" class="aim-btn" data-act="copy">${aimSvg(I.copy)}Copy code</button><button type="button" class="aim-btn" data-act="paste">Paste</button></div>`;
        } else if (name === 'settings') {
            const s = st.set, row = (l, d, ctl) => `<label class="aim-row"><span><b>${l}</b>${d ? `<i>${d}</i>` : ''}</span>${ctl}</label>`;
            b = `<div class="aim-row is-line"><span><b>Mode</b></span>${seg([['2d', '2D'], ['3d', '3D']], st.mode, 'mode')}</div>` +
                `<div class="aim-row is-line is-sl"><span class="aim-grow"><b>Sensitivity</b><input type="range" data-set="set.sens" min="0.1" max="5" step="0.05" value="${s.sens}"></span><input type="number" class="aim-num" data-set="set.sens" min="0.1" max="5" step="0.05" value="${s.sens}" aria-label="Sensitivity"></div>` +
                `<div class="aim-row is-line is-sl"><span class="aim-grow"><b>Field of view <i>· 3D only · 70–110</i></b><input type="range" data-set="set.fov" min="70" max="110" step="1" value="${s.fov}"></span><b class="aim-big" data-out="set.fov">${s.fov}°</b></div>` +
                row('Invert Y', '3D camera pitch', tog('set.invY', s.invY)) + row('Sound', 'Hit, miss and countdown cues', tog('set.sound', s.sound)) + row('Timer bar', 'Draining bar in the TIME tile', tog('set.timerBar', s.timerBar)) +
                `<div class="aim-row is-line"><span><b>Hit sound</b></span><div class="aim-pills">${[['tick', 'Tick'], ['pop', 'Pop'], ['ding', 'Ding']].map(p => `<button type="button" class="${s.hitSnd === p[0] ? 'is-on' : ''}" data-act="snd:${p[0]}">${p[1]}</button>`).join('')}</div></div>` +
                `<div class="aim-row is-line"><span><b>Target colour</b></span><div class="aim-tcs">${AIM_TCOLORS.map(c => `<button type="button" class="aim-sw${s.tcolor.toUpperCase() === c ? ' is-on' : ''}" data-act="tc:${c}" aria-label="Target ${c}" style="--sw:${c}"></button>`).join('')}</div></div>` +
                `<div class="aim-row"><span><b>Background</b></span>${seg([['room', 'Room'], ['grid', 'Grid'], ['plain', 'Plain']], s.bg, 'bg')}</div>`;
        } else if (name === 'bests') {
            const rows = [];
            AIM_ORDER.forEach(id => {
                const s = AIM_SCEN[id];
                (s.noCam ? ['-'] : ['2d', '3d']).forEach((m, i) => {
                    const cells = Object.keys(AIM_DIFF).map(d => { const v = aimBestOf(st, id, m === '-' ? '2d' : m, d), rk = aimRanked(id, m === '-' ? '2d' : m, d); return `<span class="${rk ? 'is-rk' : ''}${v ? '' : ' is-none'}">${v ? aimFmt(v) : '—'}</span>`; }).join('');
                    rows.push(`<div class="aim-brow${i ? ' is-sub' : ''}"><b>${i ? '' : s.name}</b><i>${m === '-' ? '—' : m.toUpperCase()}</i>${cells}</div>`);
                });
            });
            b = `<div class="aim-legend"><span><i></i>Ranked · team board</span><span>Lower ms is better</span></div>` +
                `<div class="aim-btable"><div class="aim-brow is-head"><b>SCENARIO</b><i></i><span>EASY</span><span>NORMAL</span><span>HARD</span></div>${rows.join('')}</div>` +
                `<div class="aim-row2 is-wide is-end"><button type="button" class="aim-btn is-primary" data-act="board">Open team board</button><button type="button" class="aim-btn is-red is-auto" data-act="reset">Reset</button></div>`;
        }
        w.className = 'aim-sheet is-' + name;
        w.setAttribute('aria-label', T[1]);
        w.innerHTML = `<div class="aim-grab"></div><div class="aim-sheet-h"><span><span class="aim-kick">${T[0]}</span><b>${T[1]}</b></span><button type="button" class="aim-b" data-act="sheet:" aria-label="Close">${aimSvg(I.close)}</button></div><div class="aim-sheet-b">${b}</div>`;
        if (name === 'crosshair') aimXhPreview();
        S.hudKey = '';
    }
    // The editor's previews: the live crosshair over a 2D target and the 3D room, and each preset.
    function aimXhPreview() {
        const S = aimS, st = S.st;
        S.hud.querySelectorAll('.aim-xhc').forEach(cv => {
            const r = cv.getBoundingClientRect(), W = Math.round(cv.clientWidth || r.width), H = Math.round(cv.clientHeight || r.height), d = Math.min(window.devicePixelRatio || 1, 2);
            if (!W || !H) return;
            cv.width = W * d; cv.height = H * d;
            const c = cv.getContext('2d'), k = cv.getAttribute('data-k');
            c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, W, H);
            if (k === 'p') { aimDrawXh(c, W / 2, H / 2, Object.assign({}, st.xh, { xs: cv.getAttribute('data-xs') }), 1.1, 0); return; }
            if (k === '3d') {
                const C = { W, H, f: W / 2 / Math.tan(st.set.fov * Math.PI / 360), cy: 1, sy: 0, cp: 1, sp: 0 };
                aimDrawRoom(c, C, 'room'); aimSphere(c, W * 0.62, H * 0.35, 15, st.set.tcolor, 1, 1);
            } else aimDisc(c, W * 0.6, H * 0.45, 27, st.set.tcolor, 1, 1);
            aimDrawXh(c, W / 2, H / 2, st.xh, 2.4, 0);
        });
        const code = S.hud.querySelector('.aim-code');
        if (code && document.activeElement !== code) { code.value = aimXhCode(st.xh); code.classList.remove('is-bad'); }
    }

    // ── Max: 1280 × 800, scaled to fit; the HUD moves in and out whole ──
    function aimSyncMaxTheme() {
        const f = aimS.maxFrame; if (!f) return;
        const w = document.getElementById('total-time-summary'), cyber = !!(w && w.classList.contains('retro-theme'));
        f.classList.toggle('retro-theme', cyber);
        try { if (cyber) { applyCyberTokens(f); applyCyberShape(f); } else { clearCyberTokens(f); clearCyberShape(f); } } catch (_) {}
    }
    function aimFitMax() {
        const S = aimS; if (!S.maxFrame || !S.maxPanel) return;
        const k = Math.min(1, (window.innerWidth - 32) / 1280, (window.innerHeight - 32) / 800);
        S.maxPanel.style.width = Math.round(1280 * k) + 'px'; S.maxPanel.style.height = Math.round(800 * k) + 'px';
        S.maxFrame.style.transform = 'scale(' + k + ')';
    }
    function aimBuildMax(panel) {
        const S = aimS;
        S.maxPanel = panel; S.maxFrame = document.createElement('div'); S.maxFrame.className = 'aim-max-frame';
        panel.appendChild(S.maxFrame); S.maxFrame.appendChild(S.hud);
        S.max = true; aimSyncMaxTheme(); aimFitMax();
        window.addEventListener('resize', aimFitMax);
        aimReadTok(); aimLayout(); aimResize(); S.ovKey = ''; aimOv();
    }
    function aimUnbuildMax() {
        const S = aimS;
        window.removeEventListener('resize', aimFitMax);
        if (S.root) S.root.appendChild(S.hud);
        S.maxFrame = null; S.maxPanel = null; S.max = false;
        aimReadTok(); aimLayout(); aimResize(); S.ovKey = ''; aimOv();
    }
    function aimToggleMax() {
        const S = aimS; if (!S.hud || typeof toggleGameMaxModal !== 'function') return;
        const locked = S.locked;
        S.max = toggleGameMaxModal({ canvasId: 'aim-root', title: 'AimLab', panelClass: 'aim-max-panel', build: aimBuildMax, unbuild: aimUnbuildMax, onToggle: aimToggleMax });
        // Moving the viewport drops the lock; a live 3D run pauses through aimOnLockChange.
        if (locked && aimIs3d() && aimLive()) aimPause();
    }
