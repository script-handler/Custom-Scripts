    // ═══════════════════════════════════════════════════════════════════
    // 8-BALL POOL — CAMERA (v2)
    // ═══════════════════════════════════════════════════════════════════
    // Poses, projection and unprojection, plus the director that moves between them.
    //   chase      over the cue, behind the cue ball; lean 0–100 runs the Cue / Stand / High stops
    //              (PC_CHASE, in ball diameters), dolly-zoomed toward far targets
    //   broadcast  high over the table, framed like 2D; eased to while balls run
    //   survey     the whole table from the shooter's side at 58° (Stay 3D while balls run)
    //   ortho      the 2D top-down view, 8 px margin
    // World frame is the physics frame (right-handed, so unlike the design's y-down
    // frame the 3D view is not mirrored). Screen space is CSS px, y down. Pure: no DOM.

    const PC_NEAR = 4;                 // near plane, table units in front of the eye
    const PC_MARGIN = 8;               // 2D fit margin, px

    const pcSub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
    const pcDot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
    const pcCross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const pcNorm = p => { const l = Math.hypot(p[0], p[1], p[2]) || 1; return [p[0] / l, p[1] / l, p[2] / l]; };
    const pcLerp = (a, b, t) => a + (b - a) * t;
    const pcLerp3 = (a, b, t) => [pcLerp(a[0], b[0], t), pcLerp(a[1], b[1], t), pcLerp(a[2], b[2], t)];

    // Outer size, rails included.
    function pcTableExtent(cfg) {
        return { OX: cfg.halfLength + cfg.railWidth, OY: cfg.halfWidth + cfg.railWidth };
    }

    // The rail top wide shots fit: the table's own (snooker), else R + 2 (pool's 16).
    const pcRailTop = cfg => (cfg.railZ !== undefined ? cfg.railZ : cfg.ballR + 2);

    // Lean stops Cue / Stand / High: elevation (°), eye distance (ball diameters), cue ball below centre (·H).
    const PC_LEAN_AT = [0, 45, 100];
    const PC_CHASE = { phi: [12, 27, 50], dist: [7, 11, 16], drop: [0.08, 0.15, 0.2] };
    const PC_CHASE_F = 1.25;           // focal length, ·H
    // Dolly-zoom on far targets: focus (ball diameters) from..to maps zoom 1..max (fading out toward High).
    const PC_ZOOM = { from: 6, to: 26, max: 1.7, min: 0.5 };
    const PC_DROP_MAX = 0.27;          // the cue ball may sink this far to keep the target in view

    function pcLeanLerp(v, lean) {
        const l = Math.max(0, Math.min(100, lean)), A = PC_LEAN_AT;
        const i = l <= A[1] ? 0 : 1;
        return pcLerp(v[i], v[i + 1], (l - A[i]) / (A[i + 1] - A[i]));
    }
    const pcZoom = (focus, D) => (focus > 0 ? 1 + (PC_ZOOM.max - 1) * Math.max(0, Math.min(1, (focus / D - PC_ZOOM.from) / (PC_ZOOM.to - PC_ZOOM.from))) : 1);

    // A perspective pose: eye, target, up hint and focal length. Sized in ball diameters, so
    // snooker frames like pool. focus: cue ball to contact, table units (none: no zoom).
    function pcChase(cue, aim, lean, W, H, cfg, focus) {
        const R = cfg ? cfg.ballR : 14, D = 2 * R;
        const phi = pcLeanLerp(PC_CHASE.phi, lean) * Math.PI / 180, lt = Math.max(0, Math.min(100, lean)) / 100;
        const dist0 = pcLeanLerp(PC_CHASE.dist, lean) * D, drop0 = pcLeanLerp(PC_CHASE.drop, lean);
        let z = 1 + (pcZoom(focus, D) - 1) * (1 - lt), drop = drop0, F, back, up;
        // Keep the contact below the top overlays: sink the cue ball, and past PC_DROP_MAX widen the view.
        for (;;) {
            F = PC_CHASE_F * H * z; back = dist0 * z * Math.cos(phi); up = dist0 * z * Math.sin(phi); drop = drop0;
            if (!(focus > 0)) break;
            const top = PC_SURVEY_MARGIN.top + 1.6 * R * F / (back + focus);
            const need = phi - Math.atan(up / (back + focus)) - Math.atan((H / 2 - top) / F);
            const want = need > 0 ? Math.tan(need) * F / H : 0;
            if (want <= PC_DROP_MAX || z <= PC_ZOOM.min) { drop = Math.max(drop0, Math.min(PC_DROP_MAX, want)); break; }
            z = Math.max(PC_ZOOM.min, z * 0.92);
        }
        const pitch = phi - Math.atan(drop * H / F);
        const d = [Math.cos(aim), Math.sin(aim)];
        const eye = [cue[0] - d[0] * back, cue[1] - d[1] * back, R + up];
        const f = [d[0] * Math.cos(pitch), d[1] * Math.cos(pitch), -Math.sin(pitch)];
        const k = eye[2] / Math.sin(pitch);       // where the centre ray meets the felt
        return { kind: 'persp', eye, target: [eye[0] + f[0] * k, eye[1] + f[1] * k, 0], up: [0, 0, 1], F, W, H };
    }

    // Straight down, screen-up = +y. The long focal length keeps it near
    // orthographic, so the cut to and from 2D barely moves anything.
    function pcBroadcast(W, H, cfg) {
        const { OX, OY } = pcTableExtent(cfg);
        const F = 4 * H, top = pcRailTop(cfg);    // fit the rail top
        const h = top + F * Math.max(OX / (W / 2 - PC_MARGIN), OY / (H / 2 - PC_MARGIN));
        return { kind: 'persp', eye: [0, 0, h], target: [0, 0, 0], up: [0, 1, 0], F, W, H };
    }

    // Standing up after the shot: facing the way it went, high and pulled back
    // so the whole table fits, centred on its projected bounds.
    const PC_SURVEY_PITCH = 58 * Math.PI / 180;
    // px kept clear; the top also clears the camera toggle and group pill
    const PC_SURVEY_MARGIN = { side: 14, top: 52, bottom: 14 };
    const PC_APRON_Z = -46;            // the apron's bottom edge, as the renderer draws it

    function pcSurvey(aim, W, H, cfg) {
        const { OX, OY } = pcTableExtent(cfg);
        const top = pcRailTop(cfg), F = 1.1 * H, m = PC_SURVEY_MARGIN;
        const cx = W / 2, cy = (m.top + H - m.bottom) / 2;     // the middle of the clear box
        const corners = [];
        [top, PC_APRON_Z].forEach(z => [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => corners.push([a * OX, b * OY, z])));
        const back = [-Math.cos(aim) * Math.cos(PC_SURVEY_PITCH), -Math.sin(aim) * Math.cos(PC_SURVEY_PITCH), Math.sin(PC_SURVEY_PITCH)];
        const at = (T, d) => ({ kind: 'persp', eye: [T[0] + back[0] * d, T[1] + back[1] * d, back[2] * d], target: T, up: [0, 0, 1], F, W, H });
        const bounds = pose => {
            const v = pcView(pose);
            let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
            for (const c of corners) {
                const p = pcProject(v, c);
                if (!p) return null;
                x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]);
            }
            return { v, x0, x1, y0, y1 };
        };
        const fits = b => b && b.x1 - b.x0 <= W - 2 * m.side && b.y1 - b.y0 <= H - m.top - m.bottom;
        let T = [0, 0, 0], d = 1000;
        for (let pass = 0; pass < 3; pass++) {
            let lo = 150, hi = 8000;
            for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (fits(bounds(at(T, mid)))) hi = mid; else lo = mid; }
            d = hi;
            // Slide over the felt until the bounds sit mid clear box.
            const b = bounds(at(T, d));
            const p = b.v.unproject((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 0), q = b.v.unproject(cx, cy, 0);
            if (p && q) T = [T[0] + p[0] - q[0], T[1] + p[1] - q[1], 0];
        }
        return at(T, d);
    }

    function pcOrtho(W, H, cfg) {
        const { OX, OY } = pcTableExtent(cfg);
        return { kind: 'ortho', s: Math.min((W - 2 * PC_MARGIN) / (2 * OX), (H - 2 * PC_MARGIN) / (2 * OY)), W, H };
    }

    // Heading, elevation and distance of the eye around its target (upright poses).
    function pcOrbit(pose) {
        const o = pcSub(pose.eye, pose.target), d = Math.hypot(o[0], o[1], o[2]);
        return { az: Math.atan2(o[1], o[0]), el: Math.asin(o[2] / d), d };
    }
    const pcUpright = p => p.up[0] === 0 && p.up[1] === 0 && p.up[2] === 1;

    // Perspective poses blend; ortho cuts at the midpoint. Two upright poses
    // orbit the short way round rather than cutting across the table.
    function pcBlend(a, b, t) {
        if (t <= 0) return a;
        if (t >= 1) return b;
        if (a.kind !== 'persp' || b.kind !== 'persp') return t < 0.5 ? a : b;
        if (pcUpright(a) && pcUpright(b)) {
            const A = pcOrbit(a), B = pcOrbit(b);
            let da = B.az - A.az;
            da -= 2 * Math.PI * Math.round(da / (2 * Math.PI));
            const T = pcLerp3(a.target, b.target, t), az = A.az + da * t, el = pcLerp(A.el, B.el, t);
            const d = Math.exp(pcLerp(Math.log(A.d), Math.log(B.d), t));
            const eye = [T[0] + Math.cos(az) * Math.cos(el) * d, T[1] + Math.sin(az) * Math.cos(el) * d, T[2] + Math.sin(el) * d];
            return { kind: 'persp', eye, target: T, up: [0, 0, 1], F: pcLerp(a.F, b.F, t), W: b.W, H: b.H };
        }
        return {
            kind: 'persp', eye: pcLerp3(a.eye, b.eye, t), target: pcLerp3(a.target, b.target, t),
            up: pcNorm(pcLerp3(a.up, b.up, t)), F: pcLerp(a.F, b.F, t), W: b.W, H: b.H,
        };
    }

    const pcEase = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

    // A view is a pose made usable: toCam (world → camera, z = depth),
    // toScr (camera → [sx, sy, px-per-unit]), project, unproject.
    function pcView(pose) {
        const W = pose.W, H = pose.H;
        if (pose.kind === 'ortho') {
            const s = pose.s;
            return {
                pose, W, H, ortho: true, eye: null,
                right: [1, 0, 0], upv: [0, 1, 0], fwd: [0, 0, -1],
                toCam: p => [p[0], p[1], 1000 - p[2]],
                toScr: c => [W / 2 + s * c[0], H / 2 - s * c[1], s],
                // The point on the plane z = h under a screen pixel.
                unproject: (sx, sy) => [(sx - W / 2) / s, (H / 2 - sy) / s],
                toViewer: () => [0, 0, 1],
            };
        }
        const eye = pose.eye, F = pose.F;
        const f = pcNorm(pcSub(pose.target, eye));
        let r = pcCross(f, pose.up);
        if (Math.hypot(r[0], r[1], r[2]) < 1e-9) r = pcCross(f, [0, 1, 0]);
        r = pcNorm(r);
        const u = pcCross(r, f);
        const toCam = p => { const q = pcSub(p, eye); return [pcDot(q, r), pcDot(q, u), pcDot(q, f)]; };
        return {
            pose, W, H, ortho: false, eye, right: r, upv: u, fwd: f,
            toCam,
            toScr: c => [W / 2 + F * c[0] / c[2], H / 2 - F * c[1] / c[2], F / c[2]],
            unproject: (sx, sy, h) => {
                const a = (sx - W / 2) / F, b = (H / 2 - sy) / F;
                const dir = [r[0] * a + u[0] * b + f[0], r[1] * a + u[1] * b + f[1], r[2] * a + u[2] * b + f[2]];
                if (Math.abs(dir[2]) < 1e-12) return null;
                const t = ((h || 0) - eye[2]) / dir[2];
                return t > 0 ? [eye[0] + dir[0] * t, eye[1] + dir[1] * t] : null;
            },
            toViewer: p => pcNorm(pcSub(eye, p)),
        };
    }

    // World point → [sx, sy, px-per-unit, depth], or null behind the near plane.
    function pcProject(view, p) {
        const c = view.toCam(p);
        if (c[2] < PC_NEAR) return null;
        const s = view.toScr(c);
        return [s[0], s[1], s[2], c[2]];
    }

    // World polygon → screen [[sx, sy], …], near-clipped; under 3 points means nothing to draw.
    function pcPoly(view, pts) {
        const cam = pts.map(view.toCam), out = [];
        for (let i = 0; i < cam.length; i++) {
            const A = cam[i], B = cam[(i + 1) % cam.length];
            const ain = A[2] >= PC_NEAR, bin = B[2] >= PC_NEAR;
            if (ain) out.push(A);
            if (ain !== bin) {
                const t = (PC_NEAR - A[2]) / (B[2] - A[2]);
                out.push([A[0] + t * (B[0] - A[0]), A[1] + t * (B[1] - A[1]), PC_NEAR]);
            }
        }
        return out.map(c => { const s = view.toScr(c); return [s[0], s[1]]; });
    }

    // World segment → [[sx, sy], [sx, sy]] clipped at the near plane, or null.
    function pcSeg(view, p, q) {
        let A = view.toCam(p), B = view.toCam(q);
        if (A[2] < PC_NEAR && B[2] < PC_NEAR) return null;
        const cut = (X, Y) => { const t = (PC_NEAR - X[2]) / (Y[2] - X[2]); return [X[0] + t * (Y[0] - X[0]), X[1] + t * (Y[1] - X[1]), PC_NEAR]; };
        if (A[2] < PC_NEAR) A = cut(A, B);
        if (B[2] < PC_NEAR) B = cut(B, A);
        const a = view.toScr(A), b = view.toScr(B);
        return [[a[0], a[1]], [b[0], b[1]]];
    }

    // ── Director ──────────────────────────────────────────────────────
    // Picks each frame's pose and eases between them:
    //   aim     chase (or 2D if picked)
    //   moving  ease to broadcast, or stand up into the survey (Stay 3D)
    //   rest    back to chase; from the survey, after a beat
    //   bih     ball in hand always cuts to 2D
    // input = { camera: '3d'|'2d', shotCam: 'overhead'|'3d', phase: 'aim'|'moving'|'bih', cue, aim, lean, focus? }
    const PC_TWEEN_MS = { moving: 650, aim: 500, survey: 900, back: 750 };
    const PC_SURVEY_DWELL_MS = 450;
    const PC_FOCUS_MS = 250;           // the zoom's low-pass, so sweeping near and far balls doesn't pump

    function pcDirector(W, H, cfg) {
        return { W, H, cfg, key: null, from: null, t: 1, ms: 1, pose: null, survey: null, focus: 0 };
    }

    // Eases dir.focus toward the input's; snaps when within half a unit so the pose comes to rest.
    function pcFocus(dir, input, dtMs) {
        const f = input.focus;
        if (!(f > 0)) return;
        if (!(dir.focus > 0) || typeof dtMs !== 'number') { dir.focus = f; return; }
        dir.focus += (f - dir.focus) * (1 - Math.exp(-dtMs / PC_FOCUS_MS));
        if (Math.abs(f - dir.focus) < 0.5) dir.focus = f;
    }

    function pcTarget(dir, input) {
        const two = input.camera === '2d' || input.phase === 'bih';
        if (two) return { key: 'ortho', pose: pcOrtho(dir.W, dir.H, dir.cfg) };
        if (input.phase === 'moving') {
            if (input.shotCam !== '3d') return { key: 'broadcast', pose: pcBroadcast(dir.W, dir.H, dir.cfg) };
            // Stay in 3D: face the way the shot was played, fixed for the whole shot.
            if (dir.key !== 'survey') dir.survey = pcSurvey(input.aim, dir.W, dir.H, dir.cfg);
            return { key: 'survey', pose: dir.survey };
        }
        return { key: 'chase', pose: pcChase(input.cue, input.aim, input.lean, dir.W, dir.H, dir.cfg, dir.focus) };
    }

    // Advances by dtMs. A chase target is live (follows aim, lean and focus), so the
    // blend heads where the camera should be now, not where it was.
    function pcDirect(dir, input, dtMs) {
        pcFocus(dir, input, dtMs);
        const tg = pcTarget(dir, input);
        if (dir.key !== tg.key) {
            const cut = !dir.pose || tg.key === 'ortho' || dir.key === 'ortho';
            const fromSurvey = dir.key === 'survey';
            // A soft shot barely stood up, so it gets a shorter beat back.
            const risen = fromSurvey ? pcEase(dir.t) : 0;
            dir.from = dir.pose;
            dir.key = tg.key;
            dir.ms = tg.key === 'broadcast' ? PC_TWEEN_MS.moving : tg.key === 'survey' ? PC_TWEEN_MS.survey
                : fromSurvey ? PC_TWEEN_MS.back : PC_TWEEN_MS.aim;
            // A negative t is the beat: the pose stays put until t passes 0.
            dir.t = cut ? 1 : fromSurvey && tg.key === 'chase' ? -PC_SURVEY_DWELL_MS * risen / dir.ms : 0;
        } else {
            dir.t = Math.min(1, dir.t + (dtMs || 0) / dir.ms);
        }
        dir.pose = dir.t >= 1 ? tg.pose : pcBlend(dir.from, tg.pose, pcEase(dir.t));
        return dir.pose;
    }

    function pcResize(dir, W, H) {
        dir.W = W; dir.H = H; dir.key = null; dir.pose = null;
    }
