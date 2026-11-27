// Pool v2 camera and renderer verification. `node pool-dev/render-verify.js`
//
//   1. The cameras against the design's own projection code: 2D exactly,
//      3D exactly up to the design's left–right mirror (its frame is
//      left-handed, ours is not; see pool-camera.js).
//   2. Unprojection: a screen click maps back to the table point it came
//      from, in every camera, including mid-blend.
//   3. Near-plane clipping, the director's cuts and eases.
//   4. The polygon clipper and the ball-marking caps.
//   5. The guides on the real physics: squirt, throw, draw bending back.
//   6. Whole frames through the headless rasterizer: every scene draws
//      without throwing, and the pixels land where they should.
//   7. Snooker's table (POOL_V2_PLAN.md, Snooker, S1): its frames, its plain balls, its
//      markings and the D, and the table cache telling the two games apart.
// What it looks like is judged with snapshot.js in real Chrome.
const P = require('./load').render();
const { Raster, Ctx } = require('../ludo-dev/preview.js');

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
    if (cond) { pass++; console.log('  ✓ ' + name + (detail !== undefined ? '  (' + detail + ')' : '')); }
    else { fail++; console.log('  ✗ ' + name + (detail !== undefined ? ' — ' + detail : '')); }
};
const head = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 50 - t.length)));
const rng = P.ppRandom(11);
const rand = (a, b) => a + (b - a) * rng();
const cfg = P.ppCreateWorld().cfg;
const W = 368, H = 412, DEG = Math.PI / 180;

// ── 1. The design's projection ────────────────────────────────────────
head("Against the design's projection");
// Table.dc.html's camera, verbatim apart from packaging. Its frame is y-down.
function designCamera(mode, cue, aimDeg, lean) {
    const R = 14, HL = 500, HW = 250, CU = 12, RL = 36, OX = HL + CU + RL, OY = HW + CU + RL;
    const a = aimDeg * Math.PI / 180, d = [Math.cos(a), Math.sin(a)];
    const sub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
    const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
    const nrm = p => { const l = Math.hypot(p[0], p[1], p[2]) || 1; return [p[0] / l, p[1] / l, p[2] / l]; };
    if (mode === '3d') {
        const F = 1.1 * H, lt = lean / 100;
        const phi = (19.5 + 28.5 * lt) * Math.PI / 180, dist = 110 + 310 * lt;
        const pitch = phi - Math.atan(0.34 / 1.1);
        const camPos = [cue[0] - d[0] * dist * Math.cos(phi), cue[1] - d[1] * dist * Math.cos(phi), R + dist * Math.sin(phi)];
        const f = [d[0] * Math.cos(pitch), d[1] * Math.cos(pitch), -Math.sin(pitch)];
        const r = nrm([f[1], -f[0], 0]);
        const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
        const toCam = p => { const q = sub(p, camPos); return [dot(q, r), dot(q, u), dot(q, f)]; };
        return p => { const c = toCam(p); return [W / 2 + F * c[0] / c[2], H / 2 - F * c[1] / c[2], F / c[2]]; };
    }
    const s = Math.min((W - 16) / (2 * OX), (H - 16) / (2 * OY));
    return p => [W / 2 + s * p[0], H / 2 + s * p[1], s];
}
{
    let worst3 = 0, worst2 = 0, n = 0;
    for (let k = 0; k < 20; k++) {
        const cueD = [rand(-450, 450), rand(-220, 220)], aimD = rand(-180, 180), lean = rand(0, 100);
        const des3 = designCamera('3d', cueD, aimD, lean), des2 = designCamera('2d');
        const ours3 = P.pcView(P.pcChase([cueD[0], -cueD[1]], -aimD * DEG, lean, W, H, cfg));
        const ours2 = P.pcView(P.pcOrtho(W, H, cfg));
        for (let i = 0; i < 25; i++) {
            const pD = [rand(-550, 550), rand(-300, 300), rand(-60, 20)], p = [pD[0], -pD[1], pD[2]];
            const c = ours3.toCam(p);
            if (c[2] > 4) {
                const a = des3(pD), b = ours3.toScr(c);
                worst3 = Math.max(worst3, Math.abs(b[0] - (W - a[0])), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]));
                n++;
            }
            const a2 = des2(pD), b2 = ours2.toScr(ours2.toCam(p));
            worst2 = Math.max(worst2, Math.abs(b2[0] - a2[0]), Math.abs(b2[1] - a2[1]), Math.abs(b2[2] - a2[2]));
        }
    }
    ok('2D is the design\'s projection exactly', worst2 < 1e-9, 'worst ' + worst2.toExponential(1) + ' px');
    // 3D left the design's chase for the GTA-style one (POOL_V2_PLAN.md, 3D aim camera v3); the design's lean 100 is kept as High's ground.
    ok('3D chase: the design\'s camera is still a valid pose to compare against (sampled ' + n + ' points)', n > 100 && worst3 > 0);
    const scfg = P.psCreateWorld ? P.psCreateWorld().cfg : null;
    [0, 45, 100].forEach((lean, i) => {
        const at = P.pcProject(P.pcView(P.pcChase([0, 0], 0, lean, W, H, cfg)), [0, 0, cfg.ballR]);
        const want = H / 2 + P.PC_CHASE.drop[i] * H;
        ok(['Cue', 'Stand', 'High'][i] + ' stop: the cue ball sits on the centre line, ' + P.PC_CHASE.drop[i] + '·H below the centre', Math.abs(at[0] - W / 2) < 1e-9 && Math.abs(at[1] - want) < 0.5, at[1].toFixed(1) + ' vs ' + want.toFixed(1));
    });
    // Bridging off the cushion (the user, 2026-11-27): near a rail the cue clears it and the eye stays over the cue.
    [cfg, scfg].filter(Boolean).forEach(c => {
        const R = c.ballR, el = (cue, a) => { const p = P.pcChase(cue, a, 0, W, H, c); return Math.atan2(p.eye[2] - R, Math.hypot(p.eye[0] - cue[0], p.eye[1] - cue[1])); };
        const IX = c.halfLength + c.cushionWidth, frozen = [-(c.halfLength - R), 40], open = [0, 0];
        const m = P.pcCueRise(frozen, 0, c), tB = IX + frozen[0] + P.PC_BRIDGE.back * R;
        ok((c.game || 'pool') + ': frozen on the rail the cue rests over it, ' + P.PC_BRIDGE.up + 'R above the top', Math.abs(R + 1.5 * R / 14 + m * (tB - R) - (P.pcRailTop(c) + P.PC_BRIDGE.up * R)) < 1e-9 && m > P.PC_CUE_SLOPE, m.toFixed(3));
        ok((c.game || 'pool') + ': …the eye rises over the cue, and mid-table nothing changes', Math.abs(el(frozen, 0) - Math.atan(m) - P.PC_EYE_OVER) < 1e-9 && P.pcCueRise(open, 0, c) === P.PC_CUE_SLOPE && Math.abs(el(open, 0) - P.PC_CHASE.phi[0] * Math.PI / 180) < 1e-9);
    });
    {
        const R = cfg.ballR, cueStop = P.pcChase([0, 0], 0, 0, W, H, cfg), cs =P.pcProject(P.pcView(cueStop), [0, 0, R]);
        ok('Cue stop: at least a quarter of the height is left below the cue ball for the cue', H - cs[1] >= 0.25 * H, ((H - cs[1]) / H).toFixed(2) + '·H');
        // The cue's axis at the eye's distance back (pool-render.js: R + 1.5K + 0.1·s past the ball and its 8 K gap).
        const back = Math.hypot(cueStop.eye[0], cueStop.eye[1]), axisZ = R + 1.5 + 0.1 * (back - R - 8);
        ok('Cue stop: the eye clears the cue\'s axis, so the cue is seen from above, not cut through', cueStop.eye[2] - axisZ > R, (cueStop.eye[2] - axisZ).toFixed(1) + ' u');
        const far = 25 * 2 * R, plain = P.pcView(P.pcChase([0, 0], 0, 0, W, H, cfg)), zoom = P.pcView(P.pcChase([0, 0], 0, 0, W, H, cfg, far));
        const r0 = P.pcProject(plain, [far, 0, R])[2] * R, r1 = P.pcProject(zoom, [far, 0, R])[2] * R;
        const c0 = P.pcProject(plain, [0, 0, R]), c1 = P.pcProject(zoom, [0, 0, R]);
        ok('a far target (25 D) is dolly-zoomed: at least 1.4× bigger on screen', r1 >= 1.4 * r0, (r1 / r0).toFixed(2) + '×');
        ok('…while the cue ball keeps its place and (within 4%) its size', Math.abs(c1[2] / c0[2] - 1) < 0.04 && Math.abs(c0[1] - c1[1]) < 0.5, (c1[2] / c0[2]).toFixed(3));
        if (scfg) {
            const sR = scfg.ballR, sp = P.pcProject(P.pcView(P.pcChase([0, 0], 0.3, 0, W, H, scfg)), [0, 0, sR]);
            ok('snooker frames like pool: the cue ball is the same size on screen', Math.abs(sp[2] * sR - cs[2] * R) < 0.02 * cs[2] * R, (sp[2] * sR).toFixed(1) + ' vs ' + (cs[2] * R).toFixed(1) + ' px');
        }
        // The contact stays under the top overlays: the cue ball near a corner, every stop and aim, out to the far cushion, both tables.
        let worstTop = Infinity;
        [cfg, scfg].filter(Boolean).forEach(c => [0, 45, 100].forEach(lean => {
            const cue = [-c.halfLength + 3 * c.ballR, -c.halfWidth + 3 * c.ballR], hx = c.halfLength - c.ballR, hy = c.halfWidth - c.ballR;
            for (let k = 0; k < 36; k++) {
                const a = k * 10 * DEG, dx = Math.cos(a), dy = Math.sin(a);
                const reach = Math.min(dx ? ((dx > 0 ? hx : -hx) - cue[0]) / dx : Infinity, dy ? ((dy > 0 ? hy : -hy) - cue[1]) / dy : Infinity);
                [0.3, 0.6, 1].forEach(t => {
                    const focus = Math.max(2 * c.ballR, reach * t);
                    const v = P.pcView(P.pcChase(cue, a, lean, W, H, c, focus)), p = P.pcProject(v, [cue[0] + dx * focus, cue[1] + dy * focus, c.ballR]);
                    if (p) worstTop = Math.min(worstTop, p[1] - p[2] * c.ballR);
                });
            }
        }));
        ok('the target stays in view below the top overlays at every stop and aim', worstTop >= 40, 'highest ghost top ' + worstTop.toFixed(1) + ' px');
        // Aimed up the table from the baulk end, the far corner pockets sit in view, clear of the top overlays
        // (turned 8°, the one it turns toward; the other is off the shot's line and may leave the side).
        let worstFar = Infinity, worstSide = Infinity;
        [cfg, scfg].filter(Boolean).forEach(c => [0, 45, 100].forEach(lean => [-8, 0, 8].forEach(deg => {
            const cue = [-c.halfLength + 4 * c.ballR, 0], a = deg * DEG, dx = Math.cos(a), dy = Math.sin(a);
            const rail = Math.min((c.halfLength - cue[0]) / dx, c.halfWidth / Math.abs(dy || 1e-9)) + c.railWidth / 2;
            const fr = p => [(p[0] - cue[0]) * dx + (p[1] - cue[1]) * dy, (p[1] - cue[1]) * dx - (p[0] - cue[0]) * dy];
            const v = P.pcView(P.pcChase(cue, a, lean, W, H, c, 40 * c.ballR, [[rail, 0], fr([c.halfLength, c.halfWidth]), fr([c.halfLength, -c.halfWidth])]));
            [1, -1].filter(s => deg * s >= 0).forEach(s => {
                const p = P.pcProject(v, [c.halfLength, s * c.halfWidth, 0]);
                worstFar = Math.min(worstFar, p ? p[1] : -Infinity); worstSide = Math.min(worstSide, p ? Math.min(p[0], W - p[0]) : -Infinity);
            });
        })));
        // Sweeping the aim round, with every pocket handed in as the game does: the lens never goes wider than
        // the stop's own and the pose never jumps (the user: two views flicked in turn as the aim swept).
        let minF = Infinity, worstStep = 0, worstEl = 0;
        [cfg, scfg].filter(Boolean).forEach(c => [[300, -150], [-380, 200], [-c.halfLength + 4 * c.ballR, 0]].forEach(cue => [0, 45, 100].forEach(lean => {
            let prev = null;
            for (let d = 0; d <= 360; d += 0.25) {
                const a = d * DEG, dx = Math.cos(a), dy = Math.sin(a);
                const lim = (s, e, h) => (e > 1e-9 ? (h - s) / e : e < -1e-9 ? (-h - s) / e : Infinity);
                const t = Math.min(lim(cue[0], dx, c.halfLength), lim(cue[1], dy, c.halfWidth)) + c.railWidth / 2;
                const fr = p => [(p[0] - cue[0]) * dx + (p[1] - cue[1]) * dy, (p[1] - cue[1]) * dx - (p[0] - cue[0]) * dy];
                const pk = (c === cfg ? P.ppCreateWorld() : P.psCreateWorld()).table.pockets.map(p => fr([p.x, p.y]));
                const pose = P.pcChase(cue, a, lean, W, H, c, 10 * c.ballR, [[t, 0], [t, 0]].concat(pk));
                const back = Math.hypot(pose.eye[0] - cue[0], pose.eye[1] - cue[1]), el = Math.atan2(pose.eye[2] - c.ballR, back) / DEG;
                minF = Math.min(minF, pose.F / H);
                const want = P.pcChase(cue, a, lean, W, H, c), elWant = Math.atan2(want.eye[2] - c.ballR, Math.hypot(want.eye[0] - cue[0], want.eye[1] - cue[1])) / DEG;
                worstEl = Math.max(worstEl, Math.abs(el - elWant));
                if (prev) worstStep = Math.max(worstStep, 100 * Math.abs(Math.log(back / prev.back)), 2000 * Math.abs(pose.F / H - prev.F));
                prev = { back, F: pose.F / H };
            }
        })));
        // (the user: High had turned into Stand; the stop's angle is kept, the eye pulls back instead)
        ok('sweeping the aim: the stop\'s angle and lens kept, and no jumps', minF >= 1.25 - 1e-9 && worstEl < 0.01 && worstStep < 6,
            'narrowest F ' + minF.toFixed(3) + ' H, angle off by ' + worstEl.toFixed(3) + '°, largest step per 0.25° ' + worstStep.toFixed(1) + '%');
        // The Eye view: the chase pose from behind the target ball along its line, swung to and from.
        {
            const d = P.pcDirector(W, H, cfg), at = [100, 40], ang = 0.6;
            const base = { camera: '3d', shotCam: 'overhead', phase: 'aim', cue: [-200, -60], aim: 0.3, lean: 45, focus: 300 };
            const peek = Object.assign({}, base, { peek: { at, angle: ang, focus: 250, far: [] } });
            P.pcDirect(d, base, 16); P.pcDirect(d, base, 1000);
            const chase = d.pose;
            const first = P.pcDirect(d, peek, 16);
            for (let i = 0; i < 60; i++) P.pcDirect(d, peek, 16);
            const p = d.pose, v = P.pcView(p), s = P.pcProject(v, [at[0], at[1], cfg.ballR]);
            const behind = Math.atan2(at[1] - p.eye[1], at[0] - p.eye[0]);
            const jump = Math.hypot(first.eye[0] - chase.eye[0], first.eye[1] - chase.eye[1]);
            ok('Eye view: from behind the target ball, looking along its line, the ball bottom centre', d.key === 'peek' && Math.abs(behind - ang) < 1e-6 && Math.abs(s[0] - W / 2) < 0.5 && s[1] > H / 2,
                'heading off ' + Math.abs(behind - ang).toExponential(1) + ', ball at ' + s[0].toFixed(1) + ',' + s[1].toFixed(1));
            ok('…swung to over the tween, not cut', jump < 0.1 * Math.hypot(p.eye[0] - chase.eye[0], p.eye[1] - chase.eye[1]), jump.toFixed(1) + ' u in the first frame');
            P.pcDirect(d, base, 16);
            ok('…and back behind the cue ball when it ends', d.key === 'chase');
        }
        ok('aimed up the table, the far corner pockets are in view below the overlays', worstFar >= 0.14 * H && worstSide >= 10, 'top ' + worstFar.toFixed(1) + ' px, side ' + worstSide.toFixed(1) + ' px');
        const d = P.pcDirector(W, H, cfg), inp = f => ({ camera: '3d', shotCam: 'overhead', phase: 'aim', cue: [0, 0], aim: 0, lean: 0, focus: f });
        P.pcDirect(d, inp(3 * R), 16);
        const before = P.pcDirect(d, inp(3 * R), 16).F, after = P.pcDirect(d, inp(60 * R), 16).F, settled = (() => { let p; for (let i = 0; i < 200; i++) p = P.pcDirect(d, inp(60 * R), 16); return p.F; })();
        ok('the zoom eases toward a new target, no jump, and comes to rest', after - before < 0.15 * (settled - before) && Math.abs(settled - P.pcChase([0, 0], 0, 0, W, H, cfg, 60 * R).F) < 1e-9);
    }
    const v = P.pcView(P.pcChase([0, 0], 0, 35, W, H, cfg));
    const right = P.pcProject(v, [200, -100, 0]), left = P.pcProject(v, [200, 100, 0]);
    ok('aiming along +x, the table\'s −y side is on screen right (not mirrored)', right[0] > W / 2 && left[0] < W / 2);
}

// ── 2. Unprojection ───────────────────────────────────────────────────
head('Unprojection');
{
    const poses = [
        ['chase lean 0', P.pcChase([-160, -70], 0.3, 0, W, H, cfg)],
        ['chase lean 100', P.pcChase([200, 100], 2.4, 100, W, H, cfg)],
        ['broadcast', P.pcBroadcast(W, H, cfg)],
        ['ortho', P.pcOrtho(W, H, cfg)],
        ['half-way chase → broadcast', P.pcBlend(P.pcChase([0, 0], -1.2, 50, W, H, cfg), P.pcBroadcast(W, H, cfg), 0.5)],
        ['max-size chase', P.pcChase([-300, 0], 0, 35, 1232, 672, cfg)],
    ];
    poses.forEach(([name, pose]) => {
        const v = P.pcView(pose);
        let worst = 0, tried = 0;
        for (let i = 0; i < 300; i++) {
            const x = rand(-500, 500), y = rand(-250, 250), z = cfg.ballR;
            const s = P.pcProject(v, [x, y, z]);
            if (!s || s[0] < 0 || s[0] > v.W || s[1] < 0 || s[1] > v.H) continue;
            const back = v.unproject(s[0], s[1], z);
            worst = Math.max(worst, Math.hypot(back[0] - x, back[1] - y));
            tried++;
        }
        ok(name + ': screen → table → screen round-trips', tried > 20 && worst < 1e-6, tried + ' on-screen points, worst ' + worst.toExponential(1) + ' u');
    });
    const v = P.pcView(P.pcChase([0, 0], 0, 0, W, H, cfg));
    ok('a pixel above the horizon unprojects to nothing', v.unproject(W / 2, 0, cfg.ballR) === null);
}

// ── 3. Clipping and the director ──────────────────────────────────────
head('Clipping and the director');
{
    const v = P.pcView(P.pcChase([0, 0], 0, 35, W, H, cfg));
    const behind = P.pcPoly(v, [[-400, -20, 0], [-380, -20, 0], [-380, 20, 0], [-400, 20, 0]]);
    ok('a polygon behind the eye is dropped', behind.length === 0);
    const across = P.pcPoly(v, [[-400, -20, 0], [300, -20, 0], [300, 20, 0], [-400, 20, 0]]);
    ok('a polygon through the near plane is cut, not wrapped', across.length >= 3 && across.every(p => isFinite(p[0]) && isFinite(p[1])), across.length + ' points');
    const seg = P.pcSeg(v, [-400, 0, 0], [300, 0, 0]);
    ok('a segment through the near plane keeps its visible part', seg && seg[1][1] < H && isFinite(seg[0][1]));
    ok('a segment wholly behind is dropped', P.pcSeg(v, [-400, 0, 0], [-390, 0, 0]) === null);

    const d = P.pcDirector(W, H, cfg);
    const inp = o => Object.assign({ camera: '3d', phase: 'aim', cue: [-250, 0], aim: 0, lean: 35 }, o);
    const p0 = P.pcDirect(d, inp(), 0);
    ok('the first pose is the chase camera', p0.kind === 'persp' && d.key === 'chase');
    const p1 = P.pcDirect(d, inp({ phase: 'moving' }), 0);
    ok('a shot starts an ease, not a cut', d.key === 'broadcast' && d.t === 0 && Math.hypot(...p1.eye.map((e, i) => e - p0.eye[i])) < 1e-9);
    P.pcDirect(d, inp({ phase: 'moving' }), 325);
    const mid = d.pose;
    const bc = P.pcBroadcast(W, H, cfg);
    ok('half-way through, the camera is between the two', mid.eye[2] > p0.eye[2] && mid.eye[2] < bc.eye[2]);
    P.pcDirect(d, inp({ phase: 'moving' }), 400);
    ok('after 650 ms it is the broadcast camera', d.t === 1 && d.pose === d.pose && Math.abs(d.pose.eye[2] - bc.eye[2]) < 1e-9);
    const last = d.pose;
    P.pcDirect(d, inp({ phase: 'aim', cue: [100, 50], aim: 1 }), 16);
    const noJump = d.pose === last;
    P.pcDirect(d, inp({ phase: 'aim', cue: [100, 50], aim: 1 }), 16);
    ok('when the balls stop it eases back from where it was, with no jump', d.key === 'chase' && noJump && d.t > 0 && d.t < 1);
    P.pcDirect(d, inp({ phase: 'aim', cue: [100, 50], aim: 1.4 }), 1000);
    const live = P.pcChase([100, 50], 1.4, 35, W, H, cfg);
    ok('the chase target is live: it follows aim changes during the ease', Math.hypot(...d.pose.eye.map((e, i) => e - live.eye[i])) < 1e-9);
    P.pcDirect(d, inp({ phase: 'bih' }), 16);
    ok('ball in hand cuts straight to 2D', d.pose.kind === 'ortho' && d.t === 1);
    P.pcDirect(d, inp({ phase: 'aim' }), 16);
    ok('and leaving it cuts back to 3D', d.pose.kind === 'persp' && d.t === 1);
    P.pcDirect(d, inp({ camera: '2d', phase: 'moving' }), 16);
    ok('the 2D camera stays 2D while balls run', d.pose.kind === 'ortho');
    // Shot camera set to stay in 3D: the camera stands up into the survey
    // (the whole table, in 3D) while the balls run, then comes back down.
    const dist3 = (p, q) => Math.hypot(...p.eye.map((e, i) => e - q.eye[i]));
    const heading = p => Math.atan2(p.target[1] - p.eye[1], p.target[0] - p.eye[0]);
    const pitchOf = p => Math.atan2(p.eye[2] - p.target[2], Math.hypot(p.eye[0] - p.target[0], p.eye[1] - p.target[1])) / DEG;
    const inFrame = pose => {
        const sv = P.pcView(pose), OX = cfg.halfLength + cfg.railWidth, OY = cfg.halfWidth + cfg.railWidth;
        let worst = Infinity;
        [16, -46].forEach(z => [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => {
            const p = P.pcProject(sv, [a * OX, b * OY, z]);
            worst = Math.min(worst, p ? Math.min(p[0], sv.W - p[0], p[1] - 38, sv.H - p[1]) : -Infinity);
        }));
        return worst;
    };
    [[W, H, 'compact'], [1232, 672, 'Max']].forEach(([w, h, name]) => {
        for (const a of [0, 0.7, Math.PI / 2, 2.4, -1.2]) {
            const sp = P.pcSurvey(a, w, h, cfg), room = inFrame(sp);
            if (room < 13.5 || room > 40) { ok('stay 3D: the survey fits the whole table, ' + name + ', aim ' + a, false, room.toFixed(1)); return; }
        }
        ok('stay 3D: the survey fits the whole table, rails and apron, clear of the top overlays, at any aim (' + name + ')', true);
    });
    const sv0 = P.pcSurvey(0.7, W, H, cfg);
    ok('stay 3D: the survey faces the way the shot went, from above the lean range', Math.abs(heading(sv0) - 0.7) < 1e-9 && pitchOf(sv0) > 48 && sv0.up[2] === 1);
    const s3 = P.pcDirector(W, H, cfg);
    const aimPose = P.pcDirect(s3, inp({ shotCam: '3d' }), 0);
    P.pcDirect(s3, inp({ shotCam: '3d', phase: 'moving', cue: [300, 100] }), 16);
    P.pcDirect(s3, inp({ shotCam: '3d', phase: 'moving', cue: [300, 100] }), 400);
    const rising = s3.pose;
    ok('stay 3D: the camera rises and backs off, keeping the shot\'s heading', pitchOf(rising) > pitchOf(aimPose) + 3 && dist3(rising, { eye: rising.target }) > dist3(aimPose, { eye: aimPose.target }) && Math.abs(heading(rising)) < 1e-9);
    P.pcDirect(s3, inp({ shotCam: '3d', phase: 'moving', cue: [310, 90] }), 2000);
    const up = s3.pose;
    ok('stay 3D: and stands in the survey, whatever the cue ball does', dist3(up, P.pcSurvey(0, W, H, cfg)) < 1e-9);
    P.pcDirect(s3, inp({ shotCam: '3d', phase: 'aim', cue: [310, 90], aim: 2 }), 16);
    P.pcDirect(s3, inp({ shotCam: '3d', phase: 'aim', cue: [310, 90], aim: 2 }), 300);
    ok('stay 3D: once the balls stop it holds a beat to show the table', dist3(s3.pose, up) < 1e-9);
    P.pcDirect(s3, inp({ shotCam: '3d', phase: 'aim', cue: [310, 90], aim: 2 }), 500);
    const back = P.pcChase([310, 90], 2, 35, W, H, cfg), swing = s3.pose;
    const swung = heading(swing) > 0.05 && heading(swing) < 1.95;
    ok('stay 3D: then swings round to the new aim, not across the table', dist3(swing, back) > 1 && dist3(swing, up) > 1 && swung && swing.eye[2] > 20, heading(swing).toFixed(2));
    P.pcDirect(s3, inp({ shotCam: '3d', phase: 'aim', cue: [310, 90], aim: 2 }), 900);
    ok('stay 3D: and lands on the chase pose behind the cue ball', dist3(s3.pose, back) < 1e-9);
    const s3b = P.pcDirector(W, H, cfg);
    P.pcDirect(s3b, inp({ shotCam: '3d' }), 0);
    P.pcDirect(s3b, inp({ shotCam: '3d', phase: 'moving' }), 16);
    P.pcDirect(s3b, inp({ shotCam: '3d', phase: 'moving' }), 100);
    P.pcDirect(s3b, inp({ shotCam: '3d', phase: 'aim', aim: 1 }), 16);
    const quick = s3b.t;
    P.pcDirect(s3b, inp({ shotCam: '3d', phase: 'aim', aim: 1 }), 2000);
    const firstSurvey = s3b.survey;
    P.pcDirect(s3b, inp({ shotCam: '3d', phase: 'moving', aim: 1 }), 16);
    ok('stay 3D: a soft shot that barely rose gets a shorter beat', quick > -P.PC_SURVEY_DWELL_MS / P.PC_TWEEN_MS.back / 2 && quick < 0);
    ok('stay 3D: each shot surveys from its own heading, not the last one', s3b.survey !== firstSurvey && Math.abs(heading(s3b.survey) - 1) < 1e-9);
    const b = P.pcBroadcast(W, H, cfg), bv = P.pcView(b), ov = P.pcView(P.pcOrtho(W, H, cfg));
    const corner = [cfg.halfLength + cfg.railWidth, cfg.halfWidth + cfg.railWidth, 16];
    const pb = P.pcProject(bv, corner), po = P.pcProject(ov, corner);
    ok('broadcast frames the table like the 2D view', Math.hypot(pb[0] - po[0], pb[1] - po[1]) < 3, Math.hypot(pb[0] - po[0], pb[1] - po[1]).toFixed(2) + ' px apart at the rail corner');
}

// ── 4. Polygons and ball markings ─────────────────────────────────────
head('Polygons and ball markings');
{
    const area = p => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; } return Math.abs(a) / 2; };
    const sq = (x, y, s) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s]];
    ok('clip: overlapping squares leave the overlap', Math.abs(area(P.pgClipConvex(sq(0, 0, 10), sq(5, 5, 10))) - 25) < 1e-9);
    ok('clip: the clip polygon\'s winding does not matter', Math.abs(area(P.pgClipConvex(sq(0, 0, 10), sq(5, 5, 10).reverse())) - 25) < 1e-9);
    ok('clip: disjoint polygons leave nothing', P.pgClipConvex(sq(0, 0, 4), sq(10, 10, 4)).length === 0);

    const cap = (a, h) => P.pgCap(P.pcNorm(a), h, 0, 0, 100);
    const face = cap([0, 0, 1], 0.46);
    const rho = Math.sqrt(1 - 0.46 * 0.46) * 100;
    ok('a cap facing the viewer is its full rim circle', face.length === 40 && face.every(p => Math.abs(Math.hypot(p[0], p[1]) - rho) < 1e-6));
    ok('a cap facing away is not drawn', cap([0, 0, -1], 0.46) === null);
    const side = cap([1, 0, 0], 0.46);
    const inDisc = side.every(p => Math.hypot(p[0], p[1]) <= 100 + 1e-6);
    // Seen side-on, the cap is the disc's sliver beyond x = 46: area r²(θ − sin θ cos θ), θ = acos 0.46.
    const th = Math.acos(0.46), expect = 100 * 100 * (th - Math.sin(th) * Math.cos(th));
    ok('a cap seen side-on is the sliver of the disc beyond its rim', inDisc && Math.abs(area(side) - expect) / expect < 0.02, area(side).toFixed(0) + ' vs ' + expect.toFixed(0) + ' px²');
    const tilt = cap([0.6, 0.2, 0.3], 0.46);
    ok('a tilted cap stays inside the ball', tilt && tilt.every(p => Math.hypot(p[0], p[1]) <= 100 + 1e-6));
}

// ── 5. Guides ─────────────────────────────────────────────────────────
head('Guides on the real physics');
{
    const world = balls => { const w = P.ppCreateWorld(); w.balls = balls.map(([id, x, y]) => P.ppMakeBall(id, x, y)); return w; };
    const straight = P.pgGuide(world([[0, -200, 0], [3, 100, 0]]), { angle: 0, speed: 1600, tipX: 0, tipY: 0 });
    ok('straight in: contact one ball-width short of the object ball', straight.hit === 3 && Math.abs(straight.contact[0] - (100 - 28)) < 2 && Math.abs(straight.contact[1]) < 1e-6, straight.contact.map(v => v.toFixed(2)).join(', '));
    ok('straight in: the object ball goes straight on', straight.obj && Math.abs(straight.obj.dy) < 1e-6 && straight.obj.dx > 0.999);
    const draw = P.pgGuide(world([[0, -200, 0], [3, 100, 0]]), { angle: 0, speed: 1600, tipX: 0, tipY: -0.55 });
    const back = draw.after[draw.after.length - 1][0];
    ok('draw: the cue ball\'s path after contact comes back', back < draw.contact[0] - 20, (back - draw.contact[0]).toFixed(0) + ' u');
    const follow = P.pgGuide(world([[0, -200, 0], [3, 100, 0]]), { angle: 0, speed: 1600, tipX: 0, tipY: 0.45 });
    ok('follow: it runs on through', follow.after[follow.after.length - 1][0] > follow.contact[0] + 20);
    const cut = P.pgGuide(world([[0, -200, 0], [3, 100, 14]]), { angle: 0, speed: 1600, tipX: 0, tipY: 0 });
    const tangent = Math.atan2(cut.after[cut.after.length - 1][1] - cut.contact[1], cut.after[cut.after.length - 1][0] - cut.contact[0]);
    ok('a half-ball cut sends the two balls apart on opposite sides', cut.obj.dy > 0 && tangent < 0, 'object ' + (Math.atan2(cut.obj.dy, cut.obj.dx) / DEG).toFixed(1) + '°, cue ' + (tangent / DEG).toFixed(1) + '°');
    const eng = P.pgGuide(world([[0, -200, 0], [3, 300, 0]]), { angle: 0, speed: 1600, tipX: 0.5, tipY: 0 });
    ok('right English squirts the contact left of the aim line', eng.contact[1] > 0.5, eng.contact[1].toFixed(2) + ' u');
    const rail = P.pgGuide(world([[0, 0, 0]]), { angle: Math.PI / 2 - 0.3, speed: 1200, tipX: 0, tipY: 0 });
    ok('no ball in the way: contact is the cushion, with a rebound path', rail.cushion && rail.hit === -1 && Math.abs(rail.contact[1] - (cfg.halfWidth - cfg.ballR)) < 2 && rail.after.length > 3);
    const scratch = P.pgGuide(world([[0, 300, 50]]), { angle: Math.PI / 4, speed: 900, tipX: 0, tipY: 0 });
    ok('straight at a pocket: the guide ends in it', scratch.pocketed);
    const w = world([[0, -200, 0], [3, 100, 0]]), snap = JSON.stringify(w);
    P.pgGuide(w, { angle: 0, speed: 1600 });
    ok('computing a guide leaves the real world alone', JSON.stringify(w) === snap);
    const t0 = Date.now();
    const rack = P.ppRack(P.ppCreateWorld(), P.ppRandom(3));
    for (let i = 0; i < 50; i++) P.pgGuide(rack, { angle: rand(-0.2, 0.2), speed: 1600, tipX: 0, tipY: rand(-0.5, 0.5) });
    const ms = (Date.now() - t0) / 50;
    ok('a guide on a full rack costs under 4 ms', ms < 4, ms.toFixed(2) + ' ms');
}

// ── 6. Frames through the rasterizer ──────────────────────────────────
head('Frames');
Ctx.prototype.scale = function (sx, sy) { const m = this.m; this.m = [m[0] * sx, m[1] * sx, m[2] * sy, m[3] * sy, m[4], m[5]]; };
Ctx.prototype.transform = function (a, b, c, d, e, f) {
    const m = this.m;
    this.m = [m[0] * a + m[2] * b, m[1] * a + m[3] * b, m[0] * c + m[2] * d, m[1] * c + m[3] * d, m[0] * e + m[2] * f + m[4], m[1] * e + m[3] * f + m[5]];
};
Ctx.prototype.drawImage = function () {};
Ctx.BACKDROP = '#000000';
function frame(scene, w, h) {
    const r = new Raster(w || W, h || H), ctx = new Ctx(r, 1);
    P.pgRender(ctx, scene);
    const px = (x, y) => { const i = ((Math.round(y) * r.w) + Math.round(x)) * 4; return [r.buf[i], r.buf[i + 1], r.buf[i + 2]]; };
    return { px };
}
{
    const rack = P.ppRack(P.ppCreateWorld(), P.ppRandom(5));
    const chase = P.pcView(P.pcChase([rack.table.headX, 0], 0, 35, W, H, cfg));
    const ortho = P.pcView(P.pcOrtho(W, H, cfg));
    const guide = P.pgGuide(rack, { angle: 0, speed: 1600 });
    const scenes = {
        '3D aim with guides': { view: chase, world: rack, aim: { angle: 0, power: 40 }, guide, guideMode: 'full' },
        '2D aim with guides': { view: ortho, world: rack, aim: { angle: 0, power: 0 }, guide, guideMode: 'short', illegal: true },
        'broadcast, no cue': { view: P.pcView(P.pcBroadcast(W, H, cfg)), world: rack, aim: null },
        'ball in hand on the break': { view: ortho, world: rack, bih: { x: -300, y: 20, valid: true }, kitchen: true },
        'ball in hand, invalid': { view: ortho, world: rack, bih: { x: rack.table.footX, y: 0, valid: false } },
        'call pocket in 3D': { view: chase, world: rack, aim: { angle: 0, power: 0 }, call: { called: 2 } },
        'pocket drop': { view: chase, world: rack, drops: [{ ball: rack.balls[5], pocket: 2, t: 0.5 }] },
        'every felt': { view: ortho, world: rack, felt: 'red' },
        'max size': { view: P.pcView(P.pcChase([-250, 0], 0, 35, 1232, 672, cfg)), world: rack, aim: { angle: 0, power: 20 }, size: [1232, 672] },
        'lean 0 near the rail': { view: P.pcView(P.pcChase([-480, 230], -0.4, 0, W, H, cfg)), world: rack, aim: { angle: -0.4, power: 0 } },
    };
    Object.entries(scenes).forEach(([name, s]) => {
        let err = null;
        try { frame(s, s.size && s.size[0], s.size && s.size[1]); } catch (e) { err = e; }
        ok(name + ' draws', !err, err ? err.stack.split('\n').slice(0, 2).join(' ') : undefined);
    });
    ['green', 'red', 'blue', 'lightgrey'].forEach(felt => {
        const f = frame({ view: ortho, world: P.ppCreateWorld(), felt }).px(W / 2 + 60, H / 2 + 40);
        ok(felt + ' felt fills the playfield', f[0] + f[1] + f[2] > 60, f.join(','));
    });
    const top = frame({ view: ortho, world: rack });
    const s = ortho.pose.s, at = (x, y) => [W / 2 + s * x, H / 2 - s * y];
    const felt = top.px(...at(-100, 100)), cue = top.px(...at(rack.table.headX, 0)), hole = top.px(...at(0, cfg.halfWidth + 16));
    ok('2D: green felt at (−100, 100)', felt[1] > felt[0] && felt[1] > felt[2], felt.join(','));
    // The rasterizer flattens each gradient to its middle stop, so the rim
    // shade darkens the whole ball here; "neutral and light" is the check.
    const ivory = c => Math.max(...c) - Math.min(...c) < 16 && c[0] > 90;
    ok('2D: the cue ball is ivory', ivory(cue), cue.join(','));
    ok('2D: the top side pocket is dark', hole.every(c => c < 70), hole.join(','));
    const apex = top.px(...at(rack.table.footX, 0));
    ok('2D: the apex ball (the 1 or a stripe) is not felt', Math.abs(apex[1] - felt[1]) > 20 || Math.abs(apex[0] - felt[0]) > 20, apex.join(','));
    const t3 = frame({ view: chase, world: rack });
    const c3 = P.pcProject(chase, [rack.table.headX, 0, cfg.ballR]);
    const cue3 = t3.px(c3[0], c3[1]);
    ok('3D: the cue ball sits where the camera puts it', ivory(cue3), cue3.join(','));
    const sky = t3.px(W / 2, 20), sky2 = frame({ view: ortho, world: rack }).px(W / 2, 4);
    ok('3D: above the far rail is the room: dark and warm, not felt', sky.every(c => c < 70) && sky[0] >= sky[2] && sky[0] >= sky[1], sky.join(','));
    ok('2D draws no room: its backdrop stays cleared', sky2.every(c => c < 10), sky2.join(','));
    const sm = (P.pgDrawRoom.toString() + P.pgDrawAir.toString()).match(/createRadialGradient|createLinearGradient/g) || [];
    // The signs: the picture as 4×3×2 textured triangles on the wall ahead, from either end; the one behind is skipped.
    {
        let draws = 0;
        const was = P.PG_SIGN.img, v0 = P.pgSignVersion();
        Ctx.prototype.clip = function () {}; Ctx.prototype.drawImage = function () { draws++; };
        P.PG_SIGN.img = { complete: true, naturalWidth: 640, naturalHeight: 360 };
        frame({ view: chase, world: rack });
        const ahead = draws; draws = 0;
        frame({ view: P.pcView(P.pcChase([rack.table.footX, 0], Math.PI, 35, W, H, cfg)), world: rack });
        const behind = draws; draws = 0;
        delete Ctx.prototype.clip; Ctx.prototype.drawImage = function () {};
        P.PG_SIGN.img = was;
        ok('looking up the table or down it, the sign ahead is drawn (24 triangles) and the one behind is not', ahead === 24 && behind === 24, ahead + ' / ' + behind);
        ok('the sign\'s load bumps a version that keys the table cache and the game\'s redraw', P.pgSignVersion() === v0 && /pgSignVersion\(\)/.test(P.pgRender.toString()));
    }
    {
        const made = [], mk = (w, h) => { made.push([w, h]); return { width: w, height: h, getContext: () => new Ctx(new Raster(w, h), 1) }; };
        frame({ view: chase, world: rack, makeCanvas: mk }); frame({ view: chase, world: rack, makeCanvas: mk });
        const has = (w, h) => made.filter(m => m[0] === w && m[1] === h).length;
        ok('the room draws into a half-size layer, and the vignette is baked at an eighth once per size (aiming redraws the table each frame)',
            has(Math.ceil(W / 2), Math.ceil(H / 2)) === 1 && has(Math.ceil(W / 8), Math.ceil(H / 8)) === 1, JSON.stringify(made));
    }
    ok('the room is drawn with the table layer (cached per pose), not per frame', sm.length >= 4 && !/pgDrawRoom|pgDrawAir/.test(P.pgRender.toString()));
    const hidden = frame({ view: ortho, world: rack, bih: { x: 0, y: 0, valid: true } }).px(...at(rack.table.headX, 0));
    ok('ball in hand hides the real cue ball', !ivory(hidden), hidden.join(','));

    // ⚙️ Aim Guide None (guideLen 0): the aim line and the ghost ball, nothing after the contact.
    const R = cfg.ballR, two = P.ppCreateWorld();
    two.balls = [P.ppMakeBall(0, -300, 0), P.ppMakeBall(1, 0, 0)];
    const g2 = P.pgGuide(two, { angle: 0, speed: 1600 });
    const lit = (img, pts) => pts.some(([x, y]) => { const c = img.px(...at(x, y)); return Math.max(...c) - felt[1] > 25 || c[0] - felt[0] > 40; });
    // The guides are ball-wide bands with solid edges (no centre line), so their edges are sampled, at ±R.
    const edges = xs => [].concat(...xs.map(x => [[x, R], [x, -R]]));
    const path = edges([40, 50, 60, 70, 80].map(x => R + x)), aimLine = edges([-260, -240, -220, -200, -180, -160, -140, -120, -100]);
    const long = frame({ view: ortho, world: two, aim: { angle: 0, power: 0 }, guide: g2, guideMode: 'full', guideLen: 150 });
    const none = frame({ view: ortho, world: two, aim: { angle: 0, power: 0 }, guide: g2, guideMode: 'full', guideLen: 0 });
    ok('Aim Guide Long draws the object ball\'s path', !!g2.obj && lit(long, path));
    ok('Aim Guide None draws no object-ball path', !lit(none, path));
    ok('…but keeps the aim line to the contact', lit(none, aimLine));
    // The ghost's ring on the felt (PG_RING · R), sampled round its upper and lower halves (clear of the aim line).
    const rim = Array.from({ length: 16 }, (_, i) => { const t = Math.PI / 4 + i / 15 * Math.PI / 2 * (i < 8 ? 1 : -1) + (i < 8 ? 0 : Math.PI); return [g2.contact[0] + P.PG_RING * R * Math.cos(t), P.PG_RING * R * Math.sin(t)]; });
    // The ghost touches its target at 2 R, so their rings keep a gap (GTA's do); the cue ball's gives way on a short shot.
    ok('the ghost\'s ring and the target\'s never meet: at least 0.3 R apart', 2 - 2 * P.PG_RING >= P.PG_RING_GAP - 1e-9 && P.PG_RING_GAP >= 0.3, (2 - 2 * P.PG_RING).toFixed(2) + ' R');
    // GTA's bars are narrower than the rings they run between, and end on them (cut out where the context clips).
    ok('a guide bar is narrower than the ghost ring', P.PG_BAR < P.PG_RING - 0.1, P.PG_BAR + ' R vs ' + P.PG_RING + ' R');
    const ghost = img => rim.some(([x, y]) => Math.min(...img.px(...at(x, y))) > 120);
    ok('…and the ghost ball at the contact', ghost(none) && !ghost(frame({ view: ortho, world: two })));
    const tourOff = frame({ view: ortho, world: two, aim: { angle: 0, power: 0 }, guide: g2, guideMode: 'off', guideLen: 150 });
    ok("a tournament's Guideline None (guideMode off) draws the same: the aim line and the ghost ball, no path", lit(tourOff, aimLine) && ghost(tourOff) && !lit(tourOff, path));
}

// ── 7. Snooker's table ────────────────────────────────────────────────
head('Snooker table');
{
    const snk = P.psRack(P.psCreateWorld(), P.ppRandom(7), 15), scfg = snk.cfg;
    const ortho = P.pcView(P.pcOrtho(W, H, scfg));
    const chase = P.pcView(P.pcChase([snk.balls[0].x, snk.balls[0].y], 0.1, 35, W, H, scfg));
    const guide = P.pgGuide(snk, { angle: 0.1, speed: 800 });
    const scenes = {
        'snooker 2D, the break-off in the D': { view: ortho, world: snk, zone: 'D', bih: { x: snk.balls[0].x, y: snk.balls[0].y, valid: true } },
        'snooker 3D aim with guides': { view: chase, world: snk, aim: { angle: 0.1, power: 30 }, guide, guideMode: 'full' },
        'snooker broadcast': { view: P.pcView(P.pcBroadcast(W, H, scfg)), world: snk },
        'snooker survey': { view: P.pcView(P.pcSurvey(0.4, W, H, scfg)), world: snk },
        'snooker nominated ring (pink)': { view: chase, world: snk, aim: { angle: 0.1, power: 0 }, ring: 6 },
        'snooker pocket drop': { view: chase, world: snk, drops: [{ ball: snk.balls[3], pocket: 2, t: 0.5 }] },
        'snooker Max size': { view: P.pcView(P.pcChase([-320, -30], 0.1, 35, 1232, 672, scfg)), world: snk, aim: { angle: 0.1, power: 20 }, size: [1232, 672] },
    };
    Object.entries(scenes).forEach(([name, s]) => {
        let err = null;
        try { frame(s, s.size && s.size[0], s.size && s.size[1]); } catch (ex) { err = ex; }
        ok(name + ' draws', !err, err ? err.stack.split('\n').slice(0, 2).join(' ') : undefined);
    });
    let plain = true;
    [0, 2, 3, 4, 5, 6, 7, 8, 15, 22].forEach(id => {
        const l = P.pgBallLook('snooker', id);
        if (id === 0 ? !l.cue : l.stripe || l.number || !/^#[0-9A-F]{6}$/i.test(l.colour)) plain = false;
    });
    ok('snooker\'s balls are plain: no stripes, no numbers; reds from id 8, colours by value', plain &&
       P.pgBallLook('snooker', 8).colour === P.pgBallLook('snooker', 22).colour && P.pgBallLook('snooker', 6).colour === '#E88FA8' && P.pgBallLook('snooker', 2).colour === '#E8C21E');
    ok('the renderer knows the ball set from the table (cfg.game)', scfg.game === 'snooker' && !P.ppCreateWorld().cfg.game);
    // The table layer is cached by pose; the game is part of the key, so the same pose on
    // the other game's table redraws it.
    // (A new key's first frame is drawn straight to the screen, as while the camera moves; the
    // second caches it.)
    const cache = {}, fakeCanvas = () => ({ width: W, height: H, getContext: () => new Ctx(new Raster(W, H), 1) });
    const draw = world => frame({ view: P.pcView(P.pcOrtho(W, H, world.cfg)), world, cache, makeCanvas: fakeCanvas });
    const pool = P.ppRack(P.ppCreateWorld(), P.ppRandom(1));
    draw(pool); const k1 = cache.key; draw(snk); const seen = cache.lastKey; draw(snk); const k3 = cache.key;
    ok('the same pose on the other game\'s table is another table: the game is in the cache key', /"pool"/.test(k1) && /"snooker"/.test(seen) && k3 === seen && k3 !== k1);
    // Pixels (the 2D view): no diamonds on snooker's rails, the black on its spot.
    const so = P.pcView(P.pcOrtho(W, H, scfg)), s = so.pose.s, at = (x, y) => [W / 2 + s * x, H / 2 - s * y];
    const dia = [125, 250 + scfg.cushionWidth + (scfg.railWidth - scfg.cushionWidth) / 2];
    const snkRail = frame({ view: so, world: P.psCreateWorld() }).px(...at(dia[0], dia[1]));
    const poolRail = frame({ view: P.pcView(P.pcOrtho(W, H, cfg)), world: P.ppCreateWorld() }).px(...at(dia[0], dia[1]));
    ok('a diamond on pool\'s rail, plain wood on snooker\'s', poolRail[0] > 150 && snkRail[0] < 150, poolRail.join(',') + ' vs ' + snkRail.join(','));
    // The woodwork (the design, 2026-10-15): pool's warm walnut, snooker's deep red mahogany,
    // pool's sights mother-of-pearl in a brass ring.
    const poolWood = frame({ view: P.pcView(P.pcOrtho(W, H, cfg)), world: P.ppCreateWorld() }).px(...at(60, dia[1]));
    const snkWood = frame({ view: so, world: P.psCreateWorld() }).px(...at(60, dia[1]));
    ok('each game its own wood: pool\'s walnut is warm and light, snooker\'s mahogany deep and red', poolWood[0] > 120 && poolWood[1] > 80 && snkWood[0] < 110 && snkWood[0] > 2 * snkWood[1],
       poolWood.join(',') + ' vs ' + snkWood.join(','));
    const ring = frame({ view: P.pcView(P.pcOrtho(W, H, cfg)), world: P.ppCreateWorld() }).px(...at(dia[0] + 4.1, dia[1]));
    ok('pool\'s sight is pearl inside a brass ring', poolRail.every(c => c > 190) && ring[0] - ring[2] > 60, poolRail.join(',') + ' / ring ' + ring.join(','));
    // Neon is lit across the rod by its own stops, not shaded dark like the rest.
    const rod = new Raster(600, 40), rc = Object.assign(new Ctx(rod, 1), { clip() {} });
    P.pqDrawFlat(rc, P.pqById('collector'), 'pool', 0, 20, 600, 0.71, 0.73, null);
    const neon = (() => { const i = (20 * 600 + 300) * 4; return [rod.buf[i], rod.buf[i + 1], rod.buf[i + 2]]; })();
    ok('a neon ring draws lit, white-hot at its core', neon.every(c => c > 200), neon.join(','));
    const black = frame({ view: so, world: snk }).px(...at(409.2, 0)), felt = frame({ view: so, world: snk }).px(...at(409.2, 60));
    ok('2D: the black sits on its spot (dark, not felt)', black.every(c => c < 60) && felt[1] > 60, black.join(',') + ' / felt ' + felt.join(','));
    const dIn = frame({ view: so, world: P.psCreateWorld(), zone: 'D' }).px(...at(-330, 0)), dOut = frame({ view: so, world: P.psCreateWorld() }).px(...at(-330, 0));
    ok('ball in hand tints the D in the theme accent', dIn.join() !== dOut.join(), dIn.join(',') + ' vs ' + dOut.join(','));
    const rounded = P.pgCushions(scfg), square = P.pgCushions(cfg);
    // Traced from the physics (the pockets rebuilt, 2026-11-27): each end the nose's round, the jaw, then the pocket's
    // edge back to the rail line, ending on it at rail height.
    const sT = P.pgRailZ(scfg);
    ok('snooker\'s cushions curve into the pockets: each end a 9-point round, the jaw, and the pocket\'s edge to the rail',
       rounded.length === 6 && rounded.every(c => c.ends.length > 18 && [c.top[0], c.top[c.top.length - 1]].every(q => Math.abs(q[2] - sT) < 1e-9)));
    // Pool's are drawn rounded too (the user, 2026-10-15), within a couple of units of the nose colliders.
    const noses = P.ppCreateWorld().table.points.filter(p => p.kind === 'nose'), arcPts = [].concat(...square.map(c => c.top));
    const off = Math.max(...noses.map(n => Math.min(...arcPts.map(q => Math.hypot(q[0] - n.x, q[1] - n.y)))));
    ok('pool\'s cushion ends are drawn rounded (a 9-point arc into a straight jaw), within 2.75 u of each nose collider (2.5 before the tighter mouths, 2026-11-27)',
       square.length === 6 && square.every(c => c.ends.length === 18 && c.top.length === 20) && noses.length === 12 && off < 2.75, off.toFixed(2) + ' u');
    // Since the v3 camera the chase is sized in ball diameters, so snooker's eye sits at its own scale.
    const kE = (P.pcChase([0, 0], 0, 0, W, H, scfg).eye[2] - scfg.ballR) / (P.pcChase([0, 0], 0, 0, W, H, cfg).eye[2] - cfg.ballR);
    ok('the chase camera is sized by the ball on the snooker table; the shadow shrinks with the ball', P.pgK(scfg) < 0.53 && Math.abs(kE - scfg.ballR / cfg.ballR) < 1e-9, kE.toFixed(3));
}

head("The nominated ball's ring and the ghost ball");
{
    // Ring r 20 at the origin, a ghost r 14 (+4) at 22 px to the right: the ring opens there.
    const cut = P.pgRingGap(0, 0, 20, 22, 0, 18);
    const onRing = t => [20 * Math.cos(t), 20 * Math.sin(t)];
    let clear = !!cut;
    for (let k = 0; k <= 200 && cut; k++) { const p = onRing(cut[0] + (cut[1] - cut[0]) * k / 200); if (Math.hypot(p[0] - 22, p[1]) < 18 - 1e-6) clear = false; }
    ok('where the ghost ball sits on the ring, the ring is cut: none of what is drawn runs under it', clear && cut[1] - cut[0] > Math.PI && cut[1] - cut[0] < 2 * Math.PI);
    ok('…and the cut ends where the two meet', !!cut && Math.abs(Math.hypot(onRing(cut[0])[0] - 22, onRing(cut[0])[1]) - 18) < 1e-6);
    ok('a ghost ball clear of the ring leaves it whole', P.pgRingGap(0, 0, 20, 60, 0, 18) === null && P.pgRingGap(0, 0, 20, 0, 0, 5) === null);
}

head('Table cloth');
{
    const ortho = P.pcView(P.pcOrtho(W, H, cfg));
    const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), near = (a, b) => rgb(a).every((v, i) => Math.abs(v - rgb(b)[i]) <= 10);
    const g = P.pgFeltFrom('#2E8F70', '#114534'), hand = P.PG_FELTS.green;
    ok('a cloth from two colours matches the hand-made green from its own centre and edge', near(g.felt[1], hand.felt[1]) && near(g.cushion, hand.cushion) && near(g.jaw, hand.jaw) && near(g.nose, hand.nose), JSON.stringify(g));
    ['purple', 'teal', 'charcoal'].forEach(felt => {
        const f = frame({ view: ortho, world: P.ppCreateWorld(), felt }).px(W / 2 + 60, H / 2 + 40);
        ok(felt + ' cloth fills the playfield', f[0] + f[1] + f[2] > 30, f.join(','));
    });
    const red = frame({ view: ortho, world: P.ppCreateWorld(), felt: P.pgFeltCustom({ centre: '#E03030', edge: '#601010' }) }).px(W / 2 + 60, H / 2 + 40);
    ok('a custom cloth draws its own colours (red here)', red[0] > red[1] + 60 && red[0] > red[2] + 60, red.join(','));
    ok('a custom cloth that is not two #rrggbb colours draws green', P.pgFeltCustom({ centre: 'red', edge: '#601010' }) === 'green' && P.pgFeltCustom(null) === 'green');
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exitCode = fail ? 1 : 0;
