    // ═══════════════════════════════════════════════════════════════════
    // 8-BALL POOL — RENDERER (v2)
    // ═══════════════════════════════════════════════════════════════════
    // Canvas2D, painted in layers:
    //   1  table shadow, apron, felt
    //   2  rail inner face, jaw faces, nose faces
    //   3  cushion tops, rail boards and bevel, lip, sights, spots
    //   4  pocket rims, then the pocket shafts
    //   5  kitchen tint, head string
    //   6  ball shadows, guides
    //   7  balls, far to near
    //   8  ghost ball, cue, called-pocket rings, ball-in-hand ghost and hand
    // Layers 1–4 depend only on the camera, so they can be cached.
    // 2D pocket floors and ball markings are clipped as polygons (Sutherland–Hodgman),
    // not ctx.clip(), so the tests' headless rasterizer can draw them; 3D pockets clip
    // (a headless context without clip() gets the opening alone).
    // Table materials and ball colours are physical; theme colours come in via scene.theme.

    const PG_RAIL_Z = 16;              // rail top
    const PG_NOSE_Z = 10;              // cushion nose height
    const PG_POCKET_FLOOR = -64;
    // Pool's heights unless the table sets its own. Sizes drawn around a ball (cue,
    // shadow, rings) scale by pgK = R / 14, so pool's are unscaled.
    const pgRailZ = cfg => (cfg.railZ !== undefined ? cfg.railZ : PG_RAIL_Z);
    const pgNoseZ = cfg => (cfg.noseZ !== undefined ? cfg.noseZ : PG_NOSE_Z);
    const pgK = cfg => cfg.ballR / 14;

    const PG_FELTS = {
        green:     { felt: ['#2E8F70', '#1D6E55', '#114534'], cushion: '#185F4B', jaw: '#0F4234', nose: '#0E3B2F',
            light: { far: ['#2E8A69', '#1C6A51', '#155842', '#0E4130'], near: ['#4DB28C', '#2A8564', '#22765A', '#185E47'], shade: '#03110C' } },
        red:       { felt: ['#9C3E3B', '#7A2C2B', '#491719'], cushion: '#6B2626', jaw: '#4E1A1B', nose: '#451617' },
        blue:      { felt: ['#3272AB', '#245B8D', '#143659'], cushion: '#1F4F7D', jaw: '#163C5F', nose: '#133453' },
        lightgrey: { felt: ['#A3AEB8', '#86929D', '#59636D'], cushion: '#707C87', jaw: '#56606A', nose: '#4C565F' },
        purple:    pgFeltFrom('#7A55B5', '#2B1847'),
        teal:      pgFeltFrom('#2A9A98', '#0D4644'),
        charcoal:  pgFeltFrom('#50565F', '#1B1E23'),
    };
    // A cloth from two colours, the centre and the edge of its radial gradient: the cushions
    // sit between the middle and the edge, the jaws and noses darker still (as the presets).
    function pgFeltFrom(centre, edge) {
        const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
        const hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
        const a = rgb(centre), b = rgb(edge), mix = (p, q, t) => p.map((v, i) => v + (q[i] - v) * t), mid = mix(a, b, 0.5);
        return { felt: [hex(a), hex(mid), hex(b)], cushion: hex(mix(mid, b, 0.4)), jaw: hex(b.map(v => v * 0.94)), nose: hex(b.map(v => v * 0.85)) };
    }
    // The light on the cushions (the design, 2026-10-13): one lamp above the table's top-left, so
    // the cushions facing it (S, E) are lit and the far ones (N, W) shaded. Each top runs from a
    // bright nose to a dark rail, and a soft shadow lies on the cloth below its nose, wider and
    // darker under the far cushions: the edge reads by light and shadow, not by a drawn line.
    const PG_LIGHT_AT = [0, 0.12, 0.6, 1];
    const PG_SHADE = { far: { w: 11, stops: [[0, 0.55], [0.35, 0.22], [1, 0]] }, near: { w: 5, stops: [[0, 0.38], [1, 0]] } };
    // A cloth without its own light takes green's steps on its cushion colour (green's stops over
    // its cushion, by mean channel), no brighter than 1.31× its centre (green's nose), and a
    // shadow of its edge colour at a fifth.
    const PG_LIGHT_K = { far: [1.49, 1.11, 0.9, 0.65], near: [2.04, 1.42, 1.25, 0.97] };
    function pgLight(mat) {
        if (mat.light) return mat.light;
        const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), mean = c => (c[0] + c[1] + c[2]) / 3;
        const hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
        const c = rgb(mat.cushion), cap = mean(rgb(mat.felt[0])) * 1.31;
        const step = k => { const s = c.map(v => v * k), m = mean(s); return hex(m > cap ? s.map(v => v * cap / m) : s); };
        mat.light = { far: PG_LIGHT_K.far.map(step), near: PG_LIGHT_K.near.map(step), shade: hex(rgb(mat.felt[2]).map(v => v * 0.2)) };
        return mat.light;
    }
    // ⚙️'s custom cloth ({ centre, edge }, each #rrggbb), or green if it is not one.
    function pgFeltCustom(c) {
        const ok = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
        return c && ok(c.centre) && ok(c.edge) ? pgFeltFrom(c.centre, c.edge) : 'green';
    }
    const PG_BALL_COLOURS = { 1: '#E9B825', 2: '#2457C5', 3: '#D2352B', 4: '#6A3FA0', 5: '#EE7A2E', 6: '#1F8A4C', 7: '#8C2A20', 8: '#141516' };
    // Each game's ball looks by id: { cue }, else { colour, stripe, number }. The HUD's
    // dots read it too. Snooker ids: a colour's value (yellow 2 … black 7), reds 8 upward.
    const PG_SNOOKER_COLOURS = { 2: '#E8C21E', 3: '#1F7A3F', 4: '#6B3F22', 5: '#1F4FB5', 6: '#E88FA8', 7: '#121314' };
    const PG_SNOOKER_RED = '#B3202A';
    const PG_LOOKS = {
        pool: id => (id === 0 ? { cue: true } : { colour: PG_BALL_COLOURS[id > 8 ? id - 8 : id], stripe: id > 8, number: true }),
        snooker: id => (id === 0 ? { cue: true } : { colour: id >= 8 ? PG_SNOOKER_RED : PG_SNOOKER_COLOURS[id] || PG_SNOOKER_RED, stripe: false, number: false }),
    };
    const pgLookCache = {};
    function pgBallLook(game, id) {
        const g = PG_LOOKS[game] ? game : 'pool', key = g + '|' + id;
        return pgLookCache[key] || (pgLookCache[key] = PG_LOOKS[g](id));
    }
    const PG_IVORY = '#F3EEE2';
    const PG_GUIDE = '#F4F1E8';
    const PG_GUIDE_OBJ = '#FFFFFF';    // the object ball's bar and ring: brightest, whatever the ball
    const PG_THEME = { accent: '#f093fb', hot: '#ff5d73', font: 'Inter, system-ui, sans-serif' };
    const PG_HAND = 'M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-6-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.83L7 15';
    const PG_STRIPE = 0.46;            // stripe caps start 0.46 R from the centre (a 27–73% band)
    const PG_NUMBER = 0.888;           // number disc: cos of its angular radius (0.46 of the diameter across)

    // ── Polygon helpers ───────────────────────────────────────────────
    function pgCirc(cx, cy, r, z, k) {
        const o = [];
        for (let i = 0; i < k; i++) { const t = i / k * Math.PI * 2; o.push([cx + r * Math.cos(t), cy + r * Math.sin(t), z]); }
        return o;
    }
    const pgRect = (hx, hy, z) => [[-hx, -hy, z], [hx, -hy, z], [hx, hy, z], [-hx, hy, z]];

    function pgTrace(ctx, poly) {
        if (!poly || poly.length < 3) return;
        ctx.moveTo(poly[0][0], poly[0][1]);
        for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
        ctx.closePath();
    }
    function pgFill(ctx, polys, style, alpha) {
        ctx.beginPath();
        polys.forEach(p => pgTrace(ctx, p));
        ctx.globalAlpha = alpha === undefined ? 1 : alpha;
        ctx.fillStyle = style;
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    function pgBounds(polys) {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        polys.forEach(p => p.forEach(q => { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }));
        return { x: x0, y: y0, w: Math.max(1e-6, x1 - x0), h: Math.max(1e-6, y1 - y0) };
    }

    // Sutherland–Hodgman: `subject` clipped to the convex polygon `clip`.
    function pgClipConvex(subject, clip) {
        if (!subject || subject.length < 3 || !clip || clip.length < 3) return [];
        let area = 0;
        for (let i = 0; i < clip.length; i++) { const a = clip[i], b = clip[(i + 1) % clip.length]; area += a[0] * b[1] - b[0] * a[1]; }
        const sg = area >= 0 ? 1 : -1;
        let out = subject;
        for (let i = 0; i < clip.length && out.length; i++) {
            const A = clip[i], B = clip[(i + 1) % clip.length];
            const side = p => sg * ((B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0]));
            const cut = (S, E) => {
                const s = side(S), e = side(E), t = s / (s - e);
                return [S[0] + t * (E[0] - S[0]), S[1] + t * (E[1] - S[1])];
            };
            const input = out; out = [];
            for (let j = 0; j < input.length; j++) {
                const S = input[(j + input.length - 1) % input.length], E = input[j];
                const ein = side(E) >= 0, sin = side(S) >= 0;
                if (ein) { if (!sin) out.push(cut(S, E)); out.push(E); }
                else if (sin) out.push(cut(S, E));
            }
        }
        return out;
    }

    function pgRgb(hex, k) {
        const n = parseInt(hex.slice(1), 16);
        const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.min(255, Math.round(v * k)));
        return 'rgb(' + c.join(', ') + ')';
    }
    function pgRgba(hex, a) {
        const n = parseInt(hex.slice(1), 16);
        return 'rgba(' + ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255) + ', ' + a + ')';
    }

    // ── Layers 1–4: the table ─────────────────────────────────────────
    // The cushions, traced from the physics table so they are the colliders:
    // { top, nose: [a, b], ends: [[p, q], …] } (nose face drops to the felt; end faces are jaw-coloured; the top rises
    // from nose to rail height). Each end, nose side first: the nose's round (snooker's the collider's; pool's drawn,
    // the user, 2026-10-15), the jaw onto the hole, then, if the jaw meets the hole before the rail line, the hole's
    // edge back to it (cloth turning down into the hole).
    function pgCushions(cfg, table) {
        const t = table || ppBuildTable(cfg), CU = cfg.cushionWidth, N = pgNoseZ(cfg), T = pgRailZ(cfg);
        const out = [];
        t.segments.filter(s => s.kind === 'cushion').forEach(s => {
            const o = [-s.nx, -s.ny], A = [s.ax, s.ay];                   // off the table; a point on the nose line
            const dep = (x, y) => ((x - A[0]) * o[0] + (y - A[1]) * o[1]) / CU;
            const at = (x, y) => [x, y, N + (T - N) * Math.max(0, Math.min(1, dep(x, y)))];
            const end = (E, other) => {
                const d = pgUnit(E[0] - other[0], E[1] - other[1]);
                // The pocket, and which of its mouth's ends this is.
                let p = null, k = 0, best = Infinity;
                t.pockets.forEach(q => [0, 1].forEach(i => {
                    const g = Math.hypot(q.mouth[2 * i] - (E[0] + d[0] * (cfg.noseRound || 0)), q.mouth[2 * i + 1] - (E[1] + d[1] * (cfg.noseRound || 0)));
                    if (g < best) { best = g; p = q; k = i; }
                }));
                const j = p.jaws[k], ja = Array.isArray(j) ? [j[0], j[1]] : [j.ax, j.ay], jb = Array.isArray(j) ? [j[2], j[3]] : [j.bx, j.by];
                const pts = [];
                if (p.cuts) {
                    const a = p.cuts[k], a0 = Math.atan2(-o[1], -o[0]), a1 = a0 + 2 * (a.mid - a0 - 2 * Math.PI * Math.round((a.mid - a0) / (2 * Math.PI)));
                    for (let i = 0; i <= 8; i++) { const th = a0 + (a1 - a0) * i / 8; pts.push(at(a.cx + a.r * Math.cos(th), a.cy + a.r * Math.sin(th))); }
                } else {
                    // Pool's drawn round between the nose and the jaw (the nose point collider sits within a couple of units).
                    const jl = Math.hypot(jb[0] - ja[0], jb[1] - ja[1]), u = [(jb[0] - ja[0]) / jl, (jb[1] - ja[1]) / jl], nb = [-d[0], -d[1]];
                    const half = Math.acos(Math.max(-1, Math.min(1, nb[0] * u[0] + nb[1] * u[1]))) / 2;
                    const r = Math.min(PG_NOSE_ROUND, 0.6 * jl * Math.tan(half)), dd = r / Math.tan(half);
                    const bis = pgUnit(nb[0] + u[0], nb[1] + u[1]), C = [ja[0] + bis[0] * r / Math.sin(half), ja[1] + bis[1] * r / Math.sin(half)];
                    const b0 = Math.atan2(ja[1] + nb[1] * dd - C[1], ja[0] + nb[0] * dd - C[0]), b1 = Math.atan2(ja[1] + u[1] * dd - C[1], ja[0] + u[0] * dd - C[0]);
                    let sp = b1 - b0;
                    sp -= 2 * Math.PI * Math.round(sp / (2 * Math.PI));
                    for (let i = 0; i <= 8; i++) { const th = b0 + sp * i / 8; pts.push(at(C[0] + r * Math.cos(th), C[1] + r * Math.sin(th))); }
                }
                // The jaw: to the rail line, or to the hole and round its edge to the rail line.
                const da = dep(ja[0], ja[1]), db = dep(jb[0], jb[1]);
                if (db >= 1) {
                    const f = (1 - da) / (db - da);
                    pts.push(at(ja[0] + (jb[0] - ja[0]) * f, ja[1] + (jb[1] - ja[1]) * f));
                } else {
                    // Round the pocket's body (pgPocketBody) from the jaw's end, the way that goes deeper, to the rail line.
                    pts.push(at(jb[0], jb[1]));
                    const body = pgPocketBody(cfg, p, 0, 192), nb = body.length;
                    let i0 = 0;
                    body.forEach((q, i) => { if (Math.hypot(q[0] - jb[0], q[1] - jb[1]) < Math.hypot(body[i0][0] - jb[0], body[i0][1] - jb[1])) i0 = i; });
                    const step = dep(...body[(i0 + 1) % nb]) > dep(...body[(i0 + nb - 1) % nb]) ? 1 : -1;
                    let last = [jb[0], jb[1]];
                    for (let i = 1; i < nb; i++) {
                        const [x, y] = body[(i0 + step * i + nb * 2) % nb];
                        if (dep(x, y) >= 1) {
                            const f = (1 - dep(last[0], last[1])) / (dep(x, y) - dep(last[0], last[1]));
                            pts.push(at(last[0] + (x - last[0]) * f, last[1] + (y - last[1]) * f));
                            break;
                        }
                        pts.push(at(x, y));
                        last = [x, y];
                    }
                }
                return pts;
            };
            const sa = end([s.ax, s.ay], [s.bx, s.by]), sb = end([s.bx, s.by], [s.ax, s.ay]), ends = [];
            [sa, sb].forEach(e => { for (let i = 0; i < e.length - 1; i++) ends.push([e[i], e[i + 1]]); });
            out.push({ top: sa.slice().reverse().concat(sb), nose: [sa[0], sb[0]], ends });
        });
        return out;
    }
    // The pocket as drawn: the drop (the capture circle) carried back along its outward line u to the rail's inner
    // corner (a middle: the rail line), the way a real pocket's drop runs on under the rail inside its fall. A
    // capsule of radius r + grow, xy points anticlockwise, the back half first.
    function pgPocketBody(cfg, p, grow, n) {
        const IX = cfg.halfLength + cfg.cushionWidth, IY = cfg.halfWidth + cfg.cushionWidth, u = p.u, m = (n || 48) / 2;
        const L = p.kind === 'corner' ? Math.max(0, (p.sx * IX - p.x) * u[0] + (p.sy * IY - p.y) * u[1]) : Math.max(0, IY - Math.abs(p.y));
        const r = p.r + grow, a0 = Math.atan2(u[1], u[0]), q = [p.x + u[0] * L, p.y + u[1] * L], out = [];
        for (let i = 0; i <= m; i++) { const t = a0 - Math.PI / 2 + i / m * Math.PI; out.push([q[0] + r * Math.cos(t), q[1] + r * Math.sin(t)]); }
        for (let i = 0; i <= m; i++) { const t = a0 + Math.PI / 2 + i / m * Math.PI; out.push([p.x + r * Math.cos(t), p.y + r * Math.sin(t)]); }
        return out;
    }
    const PG_NOSE_ROUND = 12;             // pool's drawn nose radius: the cushion's depth, as snooker's design
    const pgUnit = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };

    // Which rail a cushion lies along, and the way into the table from it. The design's world is
    // ours mirrored in y: its N, the top of its 2D view and of ours, is our +y.
    const PG_INWARD = { N: [0, -1], S: [0, 1], W: [1, 0], E: [-1, 0] };
    function pgCushionSide(cfg, c) {
        const y = (c.nose[0][1] + c.nose[1][1]) / 2, x = (c.nose[0][0] + c.nose[1][0]) / 2;
        return Math.abs(y) >= cfg.halfWidth - 1e-6 ? (y > 0 ? 'N' : 'S') : x < 0 ? 'W' : 'E';
    }
    // A linear gradient across a band, from the line a–b (world points) to that line moved by
    // [dx, dy] at height z, its stripes parallel to the line as drawn; null when off screen.
    function pgBandGradient(ctx, view, a, b, dx, dy, z) {
        const p = pcProject(view, a), q = pcProject(view, b), f = pcProject(view, [(a[0] + b[0]) / 2 + dx, (a[1] + b[1]) / 2 + dy, z]);
        if (!p || !q || !f) return null;
        const l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, nx = -(q[1] - p[1]) / l, ny = (q[0] - p[0]) / l;
        const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, t = (f[0] - mx) * nx + (f[1] - my) * ny;
        return Math.abs(t) < 1e-3 ? null : ctx.createLinearGradient(mx, my, mx + nx * t, my + ny * t);
    }
    // The shadow on the cloth below each cushion's nose. Its ends taper at 45° toward the pockets:
    // squared off, they read as the pocket's edge (the user, 2026-10-27).
    function pgDrawCushionShadows(ctx, view, cfg, cush, light) {
        cush.forEach(c => {
            const side = pgCushionSide(cfg, c), v = PG_INWARD[side], sh = PG_SHADE[side === 'N' || side === 'W' ? 'far' : 'near'];
            const a = [c.nose[0][0], c.nose[0][1], 0], b = [c.nose[1][0], c.nose[1][1], 0], u = pgUnit(b[0] - a[0], b[1] - a[1]), w = sh.w;
            const g = pgBandGradient(ctx, view, a, b, v[0] * w, v[1] * w, 0);
            if (!g) return;
            sh.stops.forEach(([at, op]) => g.addColorStop(at, pgRgba(light.shade, op)));
            pgFill(ctx, [pcPoly(view, [a, b, [b[0] + (v[0] - u[0]) * w, b[1] + (v[1] - u[1]) * w, 0], [a[0] + (v[0] + u[0]) * w, a[1] + (v[1] + u[1]) * w, 0]])], g);
        });
    }
    // 2D: the playing edge, each cushion's nose, rounded ends and jaws, as a dark line (the user,
    // 2026-10-27: on a pale cloth the jaws melted into it and a pocket's mouth could not be judged).
    // The rail line, where a cushion top meets the wood, is left alone.
    function pgDrawCushionEdges(ctx, view, cfg, cush) {
        const T = pgRailZ(cfg) - 1e-6;
        ctx.save();
        ctx.beginPath();
        cush.forEach(c => c.top.forEach((p, i) => {
            const q = c.top[(i + 1) % c.top.length], s = p[2] < T || q[2] < T ? pcSeg(view, p, q) : null;
            if (s) { ctx.moveTo(s[0][0], s[0][1]); ctx.lineTo(s[1][0], s[1][1]); }
        }));
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.stroke();
        ctx.restore();
    }
    // Cushion tops: each lit across its depth, nose to rail; flat where the gradient can't be had.
    function pgDrawCushionTops(ctx, view, cfg, cush, mat) {
        const light = pgLight(mat), T = pgRailZ(cfg), CU = cfg.cushionWidth;
        cush.forEach(c => {
            const side = pgCushionSide(cfg, c), v = PG_INWARD[side], stops = light[side === 'N' || side === 'W' ? 'far' : 'near'];
            const g = pgBandGradient(ctx, view, c.nose[0], c.nose[1], -v[0] * CU, -v[1] * CU, T);
            if (g) PG_LIGHT_AT.forEach((at, i) => g.addColorStop(at, stops[i]));
            pgFill(ctx, [pcPoly(view, c.top)], g || mat.cushion);
        });
    }

    // The table's own markings (snooker), else pool's foot and head spots.
    //   { spots: [{ x, y, r }], lines: [[[x, y], [x, y]]], arcs: [{ x, y, r, a0, a1 }] }
    function pgMarks(table) {
        return table.marks || { spots: [{ x: table.footX, y: 0, r: 3 }, { x: table.headX, y: 0, r: 3 }], lines: [], arcs: [] };
    }
    function pgDrawMarks(ctx, view, marks) {
        const lines = (marks.lines || []).slice();
        (marks.arcs || []).forEach(a => {
            const n = Math.max(8, Math.ceil(Math.abs(a.a1 - a.a0) / 0.08)), pts = [];
            for (let i = 0; i <= n; i++) { const t = a.a0 + (a.a1 - a.a0) * i / n; pts.push([a.x + a.r * Math.cos(t), a.y + a.r * Math.sin(t)]); }
            lines.push(pts);
        });
        lines.forEach(pts => pgStrokeLine(ctx, view, pts, 0.1, pgRgba(PG_IVORY, 0.35), 1, null, false));
        if (marks.spots && marks.spots.length) pgFill(ctx, marks.spots.map(s => pcPoly(view, pgCirc(s.x, s.y, s.r, 0.1, 10))), PG_IVORY, 0.35);
    }

    // The woodwork (the design, 2026-10-15): warm walnut for pool, deep red mahogany for snooker.
    // Each rail board runs outer edge to inner [4 stops], darker on the far rails (N, W); the
    // apron falls from rail height to its foot. A bevel at the inner edge: shade on the far
    // rails, light on the near, by alpha.
    const PG_WOOD = {
        pool: { far: ['#5C381F', '#B67E47', '#966236', '#6A4123'], near: ['#6E4426', '#D09455', '#B0753F', '#7E4F2A'], apron: ['#45291A', '#1F1209'] },
        snooker: { far: ['#2E1108', '#642B19', '#4C1D10', '#2A1007'], near: ['#3A160B', '#7A3520', '#5E2414', '#34140A'], apron: ['#2A0E06', '#120502'] },
    };
    // Pocket caps over the rail's cut-out (the user's references, 2026-11-27): pool's leather, snooker's brass fall.
    //   cap, curl: the plate and its rolled lip; seam: its edge on the wood; lip: the lit roll; drop: the liner's bands down the hole
    const PG_POCKET_CAP = {
        pool: { cap: '#7A4E2C', curl: '#A87349', seam: '#2A170C', lip: 'rgba(255, 214, 170, 0.55)', drop: ['#36231A', '#1A110B', '#090605'] },
        snooker: { cap: '#9C8559', curl: '#CDB585', seam: '#2A1A0C', lip: 'rgba(255, 240, 205, 0.6)', drop: ['#332A1E', '#17120C', '#080706'] },
    };
    const PG_FALL_W = 0.4;             // the fall plate's width round the pocket's body, ·r
    const PG_BEVEL = 5, PG_BEVEL_A = { N: 0.34, W: 0.28, S: 0.2, E: 0.16 };
    // Pool's sights, mother-of-pearl in a brass ring: [dx, dy, r, colour, alpha] (ring, pearl,
    // a blue-green and a pink tint, a highlight).
    const PG_SIGHT = [[0, 0, 4.6, '#B98F3E', 1], [0, 0, 3.5, '#ECE6DC', 1], [0.9, 0.7, 2.2, '#C9E2E6', 0.75], [-1.1, 1.2, 1.4, '#EBD3E2', 0.7], [-1.1, -1.1, 1.1, '#FFFFFF', 0.9]];
    // Wood grain over poly, running along the world line a→b as drawn: a tile of fine waving
    // streaks, dark grain with a lighter figure (the design's turbulence), made once; none
    // without a canvas to make it on.
    let PG_GRAIN = null;
    function pgGrain(ctx, view, mk, poly, a, b) {
        const p = pcProject(view, a), q = pcProject(view, b);
        if (!mk || !ctx.createPattern || typeof DOMMatrix !== 'function' || !p || !q || poly.length < 3) return;
        if (!PG_GRAIN) {
            const W = 512, H = 64, cv = mk(W, H), c = cv.getContext('2d'), img = c.createImageData(W, H);
            let seed = 7;
            const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
            const rows = () => { const r = Array.from({ length: H }, rnd); return r.map((v, y) => (r[(y + H - 1) % H] + 2 * v + r[(y + 1) % H]) / 4); };
            const g = rows(), fig = rows(), ph = g.map(() => rnd() * 2 * Math.PI);
            for (let x = 0; x < W; x++) {
                const wv = Math.round(2.5 * Math.sin(2 * Math.PI * x / W) + 1.2 * Math.sin(6 * Math.PI * x / W + 1));
                for (let y = 0; y < H; y++) {
                    const n = g[(y + wv + H) % H], m = fig[y] * (0.5 + 0.5 * Math.sin(14 * Math.PI * x / W + ph[y]));
                    const dark = Math.max(0, Math.min(1, 2.6 * n - 1.1)) * 0.55, light = Math.max(0, Math.min(1, 3.2 * m - 1.9)) * 0.16;
                    img.data.set(dark >= light ? [15, 8, 4, dark * 255] : [255, 219, 158, light * 255], 4 * (y * W + x));
                }
            }
            c.putImageData(img, 0, 0);
            PG_GRAIN = cv;
        }
        const pat = ctx.createPattern(PG_GRAIN, 'repeat'), l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, cs = (q[0] - p[0]) / l, sn = (q[1] - p[1]) / l;
        if (!pat) return;
        pat.setTransform(new DOMMatrix([cs, sn, -sn, cs, p[0], p[1]]));
        pgFill(ctx, [poly], pat);
    }

    // ── The room (3D): the bar round the table, out of focus ─────────
    // Lights in table units of HL: [angle, distance, height, radius, colour, alpha]; seeded, so every pose agrees.
    const PG_ROOM_LIGHTS = (() => {
        let s = 7;
        const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
        // Mostly lamp amber, some neon; from the floor (-0.5) up past the eye, so every view from Cue to High sees some.
        const ink = ['#FFA23D', '#FFA23D', '#FFC46B', '#FFE0A8', '#FF7A2E', '#FF3F7F', '#28C8FF', '#A070FF'];
        return Array.from({ length: 72 }, (_, i) => [i / 72 * Math.PI * 2 + rnd() * 0.1, 2.2 + rnd() * 2, -0.45 + rnd() * 1.05,
            0.04 + rnd() * 0.07, ink[Math.floor(rnd() * ink.length)], 0.45 + rnd() * 0.4]);
    })();
    const PG_HAZE = '#1C1814';
    // The sign on each end wall (the user's picture): a lightbox among the lights, facing the table. Units of HL.
    const PG_SIGN = { at: 3, w: 1.15, z: -0.12, img: null, v: 0 };
    const PG_SIGN_SRC = 'data:image/jpeg;base64,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';
    // The picture once decoded, else null (and starts it); v bumps on load, so cached frames redraw.
    function pgSignImage() {
        const img = PG_SIGN.img;
        if (img) return img.complete && img.naturalWidth ? img : null;
        if (typeof Image !== 'function') return null;
        PG_SIGN.img = new Image();
        PG_SIGN.img.onload = () => { PG_SIGN.v++; };
        PG_SIGN.img.src = PG_SIGN_SRC;
        return null;
    }
    const pgSignVersion = () => PG_SIGN.v;
    // The image's triangle (t: image px) onto a screen triangle (s), a device pixel wider so the seams close
    // (at any scale: the room layer is half size).
    function pgTexTri(ctx, img, s0, s1, s2, t0, t1, t2) {
        const cx = (s0[0] + s1[0] + s2[0]) / 3, cy = (s0[1] + s1[1] + s2[1]) / 3;
        const m = ctx.getTransform ? ctx.getTransform() : null, px = 1 / (m ? Math.hypot(m.a, m.b) || 1 : 1);
        const grow = p => { const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * px, p[1] + dy / l * px]; };
        const du1 = t1[0] - t0[0], dv1 = t1[1] - t0[1], du2 = t2[0] - t0[0], dv2 = t2[1] - t0[1], det = du1 * dv2 - du2 * dv1;
        if (Math.abs(det) < 1e-9) return;
        const dx1 = s1[0] - s0[0], dy1 = s1[1] - s0[1], dx2 = s2[0] - s0[0], dy2 = s2[1] - s0[1];
        const a = (dx1 * dv2 - dx2 * dv1) / det, b = (dy1 * dv2 - dy2 * dv1) / det, c = (dx2 * du1 - dx1 * du2) / det, d = (dy2 * du1 - dy1 * du2) / det;
        ctx.save();
        ctx.beginPath(); pgTrace(ctx, [grow(s0), grow(s1), grow(s2)]); ctx.clip();
        ctx.transform(a, b, c, d, s0[0] - a * t0[0] - c * t0[1], s0[1] - b * t0[0] - d * t0[1]);
        // Only the triangle's own part of the picture (2 px over), not the whole of it clipped away.
        const ts = [t0, t1, t2], bx = Math.max(0, Math.min(...ts.map(t => t[0])) - 2), by = Math.max(0, Math.min(...ts.map(t => t[1])) - 2);
        const bw = Math.min(img.naturalWidth, Math.max(...ts.map(t => t[0])) + 2) - bx, bh = Math.min(img.naturalHeight, Math.max(...ts.map(t => t[1])) + 2) - by;
        ctx.drawImage(img, bx, by, bw, bh, bx, by, bw, bh);
        ctx.restore();
    }
    // sx: +1 the foot wall, −1 the head wall. A glow round it, a dark board, the picture (a 4×3 grid of
    // affine triangles: canvas has no perspective drawImage), a neon rim.
    function pgDrawSign(ctx, view, HL, sx) {
        const x = sx * PG_SIGN.at * HL;
        if ((view.eye[0] - x) * sx >= 0) return;
        const img = pgSignImage(), hw = PG_SIGN.w * HL / 2, hh = hw * (img ? img.naturalHeight / img.naturalWidth : 9 / 16);
        const at = (u, v, k) => [x, sx * (hw + k) * (1 - 2 * u), PG_SIGN.z * HL + (2 * hh + 2 * k) * (1 - v) - k];
        const quad = k => [at(0, 0, k), at(1, 0, k), at(1, 1, k), at(0, 1, k)].map(p => pcProject(view, p));
        const q = quad(0), board = quad(0.03 * HL);
        if (q.some(p => !p) || board.some(p => !p)) return;
        const c = pcProject(view, [x, 0, PG_SIGN.z * HL + hh]), span = Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]);
        const g = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], span);
        g.addColorStop(0, 'rgba(255, 128, 150, 0.32)'); g.addColorStop(0.5, 'rgba(190, 110, 220, 0.12)'); g.addColorStop(1, 'rgba(190, 110, 220, 0)');
        ctx.beginPath(); ctx.arc(c[0], c[1], span, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
        pgFill(ctx, [board], '#120C12');
        if (img && typeof ctx.clip === 'function') {
            const NX = 4, NY = 3, iw = img.naturalWidth, ih = img.naturalHeight, grid = [];
            for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) grid.push(pcProject(view, at(i / NX, j / NY, 0)));
            const P = (i, j) => grid[j * (NX + 1) + i], T = (i, j) => [i / NX * iw, j / NY * ih];
            for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
                pgTexTri(ctx, img, P(i, j), P(i + 1, j), P(i + 1, j + 1), T(i, j), T(i + 1, j), T(i + 1, j + 1));
                pgTexTri(ctx, img, P(i, j), P(i + 1, j + 1), P(i, j + 1), T(i, j), T(i + 1, j + 1), T(i, j + 1));
            }
            // Opaque (the triangles overlap at the seams), then dimmed to the room in one pass.
            pgFill(ctx, [q], '#120C12', 0.08);
        }
        [[5, 'rgba(255, 92, 168, 0.22)'], [1.5, 'rgba(255, 170, 214, 0.95)']].forEach(([w, ink]) => {
            ctx.beginPath(); pgTrace(ctx, board); ctx.strokeStyle = ink; ctx.lineWidth = w; ctx.stroke();
        });
    }
    // The screen y of the horizon, or null when the camera looks (nearly) straight down.
    function pgHorizon(view) {
        const f = view.fwd, l = Math.hypot(f[0], f[1]);
        if (view.ortho || l < 0.2) return null;
        const d = [f[0] / l, f[1] / l, 0], cz = pcDot(d, f);
        return view.H / 2 - view.pose.F * pcDot(d, view.upv) / cz;
    }
    // Under the table: a floor lit by the table's lamp, a warm glow at the horizon, the bar's lights past it.
    // Gradients keep a transparent middle stop where the test rasterizer would flatten them over the frame.
    function pgDrawRoom(ctx, view, cfg) {
        const W = view.W, H = view.H, HL = cfg.halfLength, hz = pgHorizon(view);
        const floor = pcPoly(view, pgCirc(0, 0, 1, -0.5 * HL, 48).map(p => [p[0] * 2.1 * HL, p[1] * 1.6 * HL, p[2]]));
        if (floor.length >= 3) {
            const b = pgBounds([floor]);
            ctx.save();
            ctx.beginPath(); pgTrace(ctx, floor);
            ctx.translate(b.x + b.w / 2, b.y + b.h / 2); ctx.scale(1, b.h / b.w);
            const g = ctx.createRadialGradient(0, 0, 0, 0, 0, b.w / 2);
            g.addColorStop(0, 'rgba(196, 128, 64, 0.5)'); g.addColorStop(0.5, 'rgba(140, 84, 40, 0.24)'); g.addColorStop(1, 'rgba(96, 60, 32, 0)');
            ctx.fillStyle = g; ctx.fill();
            ctx.restore();
        }
        // The back bar's glow, flattened along the horizon (still felt from above it, at the Stand view).
        if (hz !== null && hz > -0.8 * H) {
            ctx.save();
            ctx.translate(W / 2, hz); ctx.scale(1, 0.42);
            const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.85 * W);
            glow.addColorStop(0, 'rgba(255, 160, 80, 0.34)'); glow.addColorStop(0.45, 'rgba(255, 128, 64, 0.12)'); glow.addColorStop(1, 'rgba(255, 128, 64, 0)');
            ctx.fillStyle = glow; ctx.fillRect(-W, -H / 0.42, 2 * W, 2 * H / 0.42);
            ctx.restore();
        }
        // Bokeh: a flat disc with a soft rim, and a faint halo. The signs go between the lights past their walls and the nearer ones.
        const light = ([a, d, z, r, ink, al]) => {
            const p = pcProject(view, [Math.cos(a) * d * HL, Math.sin(a) * d * HL * 0.7, z * HL]);
            if (!p) return;
            const rad = Math.max(2.5, Math.min(0.07 * H, r * HL * p[2]));
            [[2.8, al * 0.24], [1, al]].forEach(([k, alpha]) => {
                const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], rad * k);
                g.addColorStop(0, pgRgba(ink, alpha)); g.addColorStop(0.72, pgRgba(ink, alpha * 0.8)); g.addColorStop(1, pgRgba(ink, 0));
                ctx.beginPath(); ctx.arc(p[0], p[1], rad * k, 0, Math.PI * 2);
                ctx.fillStyle = g; ctx.fill();
            });
        };
        PG_ROOM_LIGHTS.forEach(l => { if (l[1] >= PG_SIGN.at) light(l); });
        if (view.eye) [1, -1].forEach(sx => pgDrawSign(ctx, view, HL, sx));
        PG_ROOM_LIGHTS.forEach(l => { if (l[1] < PG_SIGN.at) light(l); });
    }
    // Offscreen layers by name, kept while their size holds; null without a canvas maker (the tests).
    const PG_LAYERS = {};
    function pgLayer(mk, name, w, h) {
        let L = PG_LAYERS[name];
        if (L && L.c.width === w && L.c.height === h) { L.fresh = false; return L; }
        const c = mk && mk(w, h);
        if (!c || !c.getContext || c.width !== w || c.height !== h) return null;
        return (PG_LAYERS[name] = { c, ctx: c.getContext('2d'), fresh: true });
    }
    // The room at half the CSS resolution, scaled up: it is all glow and blur, and while the camera turns
    // (every aim move) the table layer is drawn each frame, where full-size room fills cost several times more.
    const PG_ROOM_SCALE = 0.5;
    function pgDrawRoomLayer(ctx, view, cfg, mk) {
        const k = PG_ROOM_SCALE, L = pgLayer(mk, 'room', Math.ceil(view.W * k), Math.ceil(view.H * k));
        if (!L) return pgDrawRoom(ctx, view, cfg);
        L.ctx.setTransform(1, 0, 0, 1, 0, 0); L.ctx.clearRect(0, 0, L.c.width, L.c.height);
        L.ctx.setTransform(k, 0, 0, k, 0, 0);
        pgDrawRoom(L.ctx, view, cfg);
        ctx.drawImage(L.c, 0, 0, L.c.width / k, L.c.height / k);
    }
    function pgVignette(ctx, W, H) {
        const m = Math.hypot(W, H) / 2;
        ctx.save();
        ctx.translate(W / 2, H * 0.56); ctx.scale(W / (2 * m), H / (2 * m));
        const v = ctx.createRadialGradient(0, 0, 0.55 * m, 0, 0, 1.25 * m);
        [[0, 0], [0.3, 0], [0.5, 0], [0.75, 0.18], [1, 0.5]].forEach(([at, al]) => v.addColorStop(at, 'rgba(0, 0, 0, ' + al + ')'));
        ctx.fillStyle = v; ctx.fillRect(-2 * m, -2 * m, 4 * m, 4 * m);
        ctx.restore();
    }
    // Over the finished table: haze on the far cloth (gone by the High view), then a vignette (baked at
    // an eighth of the size, once per size).
    function pgDrawAir(ctx, view, felt, mk) {
        const W = view.W, H = view.H, pitch = Math.asin(Math.max(-1, Math.min(1, -view.fwd[2]))) * 180 / Math.PI;
        const a = 0.42 * Math.max(0, Math.min(1, (40 - pitch) / 25));
        if (a > 0.01 && felt.length >= 3) {
            const b = pgBounds([felt]), g = ctx.createLinearGradient(0, b.y, 0, b.y + 0.6 * b.h);
            g.addColorStop(0, pgRgba(PG_HAZE, a)); g.addColorStop(0.4, pgRgba(PG_HAZE, a * 0.35)); g.addColorStop(0.7, pgRgba(PG_HAZE, 0)); g.addColorStop(1, pgRgba(PG_HAZE, 0));
            pgFill(ctx, [felt], g);
        }
        const L = pgLayer(mk, 'vignette', Math.ceil(W / 8), Math.ceil(H / 8));
        if (!L) return pgVignette(ctx, W, H);
        if (L.fresh) pgVignette(L.ctx, L.c.width, L.c.height);
        ctx.drawImage(L.c, 0, 0, W, H);
    }

    // cloth: a preset's name, or a cloth (pgFeltFrom). mk(w, h): a canvas, for the grain.
    function pgDrawTable(ctx, view, cfg, table, cloth, mk) {
        const P = pts => pcPoly(view, pts);
        const mat = cloth && typeof cloth === 'object' && Array.isArray(cloth.felt) ? cloth : PG_FELTS[cloth] || PG_FELTS.green;
        const HL = cfg.halfLength, HW = cfg.halfWidth, CU = cfg.cushionWidth, RL = cfg.railWidth - cfg.cushionWidth;
        const TZ = pgRailZ(cfg), OX = HL + CU + RL, OY = HW + CU + RL, IX = HL + CU, IY = HW + CU;
        const eye = view.eye, wood = PG_WOOD[cfg.game] || PG_WOOD.pool;

        // 1. The room, shadow, felt (the apron after the rails, step 3).
        if (eye) pgDrawRoomLayer(ctx, view, cfg, mk);
        const shadow = view.ortho ? P(pgRect(OX + 4, OY + 4, -1).map(p => [p[0], p[1] - 12, p[2]])) : P(pgRect(OX + 30, OY + 30, -90));
        ctx.save();
        if ('filter' in ctx) ctx.filter = 'blur(9px)';
        pgFill(ctx, [shadow], '#000000', 0.55);
        ctx.restore();
        const felt = P(pgRect(IX, IY, 0));
        // Radial at (50%, 46%), r 62% of the felt's bounding box (again through a pocket's cut, step 4).
        const drawFelt = () => {
            if (felt.length < 3) return;
            const b = pgBounds([felt]);
            ctx.save();
            ctx.beginPath(); pgTrace(ctx, felt);
            ctx.translate(b.x + b.w / 2, b.y + b.h * 0.46);
            ctx.scale(1, b.h / b.w);
            const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.62 * b.w);
            g.addColorStop(0, mat.felt[0]); g.addColorStop(0.6, mat.felt[1]); g.addColorStop(1, mat.felt[2]);
            ctx.fillStyle = g;
            ctx.fill();
            ctx.restore();
        };
        drawFelt();

        // 2. The cushions' shadows on the cloth, rail inner faces, jaw faces, nose faces.
        const cush = pgCushions(cfg, table);
        pgDrawCushionShadows(ctx, view, cfg, cush, pgLight(mat));
        if (eye) {
            const ri = [];
            if (eye[0] < IX) ri.push(P([[IX, -IY, TZ], [IX, IY, TZ], [IX, IY, 0], [IX, -IY, 0]]));
            if (eye[0] > -IX) ri.push(P([[-IX, -IY, TZ], [-IX, IY, TZ], [-IX, IY, 0], [-IX, -IY, 0]]));
            if (eye[1] < IY) ri.push(P([[-IX, IY, TZ], [IX, IY, TZ], [IX, IY, 0], [-IX, IY, 0]]));
            if (eye[1] > -IY) ri.push(P([[-IX, -IY, TZ], [IX, -IY, TZ], [IX, -IY, 0], [-IX, -IY, 0]]));
            pgFill(ctx, ri, '#24150D');
            const jaws = [];
            cush.forEach(c => c.ends.forEach(([p, q]) => jaws.push(P([p, q, [q[0], q[1], 0], [p[0], p[1], 0]]))));
            pgFill(ctx, jaws, mat.jaw);
        }
        pgFill(ctx, cush.map(c => P([c.nose[0], c.nose[1], [c.nose[1][0], c.nose[1][1], 0], [c.nose[0][0], c.nose[0][1], 0]])), mat.nose);

        // 3. Cushion tops, rail boards and bevel, mitres, lip, sights, spots.
        pgDrawCushionTops(ctx, view, cfg, cush, mat);
        // A side's strip of rail top from k0 to k1 units out from the cloth: [outer ×2, inner ×2].
        const strip = (side, k0, k1) => {
            const v = PG_INWARD[side], sg = -(v[0] + v[1]), ns = !v[0];
            const at = (u, k) => (ns ? [u * (IX + k), sg * (IY + k), TZ] : [sg * (IX + k), u * (IY + k), TZ]);
            return [at(-1, k1), at(1, k1), at(1, k0), at(-1, k0)];
        };
        ['N', 'S', 'W', 'E'].forEach(side => {
            const far = side === 'N' || side === 'W', v = PG_INWARD[side], q = strip(side, 0, RL), board = P(q), st = wood[far ? 'far' : 'near'];
            const g = pgBandGradient(ctx, view, q[0], q[1], v[0] * RL, v[1] * RL, TZ);
            if (g) [0, 0.34, 0.62, 1].forEach((at, i) => g.addColorStop(at, st[i]));
            pgFill(ctx, [board], g || st[2]);
            pgGrain(ctx, view, mk, board, q[0], q[1]);
            pgFill(ctx, [P(strip(side, 0, PG_BEVEL))], far ? '#000000' : '#FFE4BC', PG_BEVEL_A[side]);
        });
        ctx.beginPath();
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
            const a = pcProject(view, [sx * OX, sy * OY, TZ]), b = pcProject(view, [sx * IX, sy * IY, TZ]);
            if (a && b) { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
        });
        ctx.strokeStyle = 'rgba(26, 12, 6, 0.7)'; ctx.lineWidth = 1; ctx.stroke();
        [[PG_BEVEL, 'rgba(255, 233, 200, 0.18)', 0.75], [0, 'rgba(243, 238, 226, 0.12)', 1]].forEach(([k, style, w]) => {
            ctx.beginPath(); pgTrace(ctx, P(pgRect(IX + k, IY + k, TZ)));
            ctx.strokeStyle = style; ctx.lineWidth = w; ctx.stroke();
        });
        if (cfg.diamonds !== false) {
            const at = [];
            [-375, -250, -125, 125, 250, 375].forEach(x => at.push([x, -(IY + RL / 2)], [x, IY + RL / 2]));
            [-125, 0, 125].forEach(y => at.push([-(IX + RL / 2), y], [IX + RL / 2, y]));
            PG_SIGHT.forEach(([dx, dy, r, col, a]) => pgFill(ctx, at.map(([x, y]) => P(pgCirc(x + dx, y + dy, r, TZ + 0.1, 12))), col, a));
        }
        pgDrawMarks(ctx, view, pgMarks(table));
        // The aprons (the rails' outer sides, turned to the eye): last, as nothing on the table is in front of them. Drawn
        // first, the cloth and cushions hidden behind the rail painted over them from a low eye outside it (the user's
        // sweep, 2026-11-27).
        if (eye) {
            const lo = -46;
            [[OX, -OY, OX, OY, eye[0] > OX], [-OX, -OY, -OX, OY, eye[0] < -OX], [-OX, OY, OX, OY, eye[1] > OY], [-OX, -OY, OX, -OY, eye[1] < -OY]].forEach(([x0, y0, x1, y1, seen]) => {
                if (!seen) return;
                const a = [x0, y0, TZ], b = [x1, y1, TZ], face = P([a, b, [x1, y1, lo], [x0, y0, lo]]), g = pgBandGradient(ctx, view, a, b, 0, 0, lo);
                if (g) wood.apron.forEach((c, i) => g.addColorStop(i, c));
                pgFill(ctx, [face], g || wood.apron[1]);
                pgGrain(ctx, view, mk, face, a, b);
            });
        }

        // 4. Pockets. Each is its body (pgPocketBody: the drop carried back under the rail), wrapped on the rail by the
        // fall plate (seam, plate, rolled lip), then the opening (the user, 2026-11-27: real pockets, refs).
        const capK = pgK(cfg), cap = PG_POCKET_CAP[cfg.game] || PG_POCKET_CAP.pool;
        // Points cut back to the rail (outside the cloth's inner edge): those over the cloth go to the nearest edge,
        // through the corner when that edge changes (a straight cut across it drew a "D", the user, 2026-11-27).
        // chord: cut straight across the corner instead (the opening from behind, which covers the cushions' corner).
        const clampRail = (pts, p, z, chord) => {
            const out = [], cx = Math.sign(p.x) * IX, cy = Math.sign(p.y) * IY, corner = !chord && p.kind === 'corner';
            let edge = null;
            pts.forEach(([x, y]) => {
                if (Math.abs(x) > IX || Math.abs(y) > IY) { out.push([x, y, z]); edge = null; return; }
                const e = IX - Math.abs(x) < IY - Math.abs(y) ? 'x' : 'y';
                if (corner && edge && e !== edge) out.push([cx, cy, z]);
                out.push(e === 'x' ? [Math.sign(x) * IX, y, z] : [x, Math.sign(y) * IY, z]);
                edge = e;
            });
            return out;
        };
        const at = (pts, z) => pts.map(([x, y]) => [x, y, z]);
        const fall = p => PG_FALL_W * p.r;
        const plates = table.pockets.map(p => P(clampRail(pgPocketBody(cfg, p, fall(p), 48), p, TZ + 0.2)));
        pgFill(ctx, table.pockets.map(p => P(clampRail(pgPocketBody(cfg, p, fall(p) + 1.2 * capK, 48), p, TZ + 0.15))), cap.seam);
        pgFill(ctx, plates, cap.cap);
        // The rolled lip round the opening, inside the plate (without clip, none).
        if (typeof ctx.clip === 'function') table.pockets.forEach((p, i) => {
            if (plates[i].length < 3) return;
            ctx.save(); ctx.beginPath(); pgTrace(ctx, plates[i]); ctx.clip();
            pgFill(ctx, [P(clampRail(pgPocketBody(cfg, p, 3.5 * capK, 48), p, TZ + 0.25))], cap.curl);
            ctx.restore();
        });
        const bandZ = [[TZ + 0.3, 0], [0, -22], [-22, PG_POCKET_FLOOR]];
        // The walls: the fall's liner curling in, then the drop, then the bag; dark below the lip, so from the table
        // the back wall reads as the pocket's inside, not a varnished barrel (the user, 2026-11-27).
        const bandRGB = cap.drop;
        const lit = [0.55, 0.8, 1.08];
        // In 3D (pool and snooker): the opening's edge is at rail height over the rail and drops to the felt across the
        // mouth; the wall's top band shows only over the rail. The cushions are then redrawn in front of the openings.
        if (eye) {
            const over = (x, y) => Math.abs(x) > IX || Math.abs(y) > IY, holes = [], backs = [];
            // A cushion face turned toward the eye (its outward normal: away from the cushion's middle), and a face as drawn.
            const seen = (c, a, b) => {
                const cx = c.top.reduce((s, t) => s + t[0], 0) / c.top.length, cy = c.top.reduce((s, t) => s + t[1], 0) / c.top.length;
                const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
                let nx = b[1] - a[1], ny = a[0] - b[0];
                if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny; }
                return (eye[0] - mx) * nx + (eye[1] - my) * ny > 0;
            };
            const face = (a, b) => P([a, b, [b[0], b[1], 0], [a[0], a[1], 0]]);
            const faces = () => {
                const jaws = [], noses = [];
                cush.forEach(c => {
                    c.ends.forEach(([a, b]) => { if (seen(c, a, b)) jaws.push(face(a, b)); });
                    if (seen(c, c.nose[0], c.nose[1])) noses.push(face(c.nose[0], c.nose[1]));
                });
                pgFill(ctx, jaws, mat.jaw);
                pgFill(ctx, noses, mat.nose);
            };
            table.pockets.forEach(p => {
                // The opening is the pocket's body (the user, 2026-11-27: a round hole with a fall sloping behind it read as a
                // sink gutter, the pocket gone; the long pockets back).
                const body = pgPocketBody(cfg, p, 0, 72), nb = body.length;
                // Behind: the eye outside the table beyond a rail this pocket's body cuts (a corner's both, a middle's own).
                // Tested on the hole, a hole just inside the rail's edge was drawn over the rail in front of it (the user,
                // 2026-11-27: "they clip through").
                const behind = (p.kind === 'corner' && Math.abs(eye[0]) > IX && eye[0] * p.x > 0) || (Math.abs(eye[1]) > IY && eye[1] * p.y > 0 && (p.kind === 'corner' || Math.abs(p.y) + p.r > IY));
                // lid: the rail top's opening, closed along the inner edge (straight across the corner from behind, for the
                // no-clip fallback); mouth: the loop dropping to the felt across the mouth.
                const lid = clampRail(body, p, TZ + 0.3, behind), mouth = [];
                for (let i = 0; i < nb; i++) {
                    const [x0, y0] = body[i], [x1, y1] = body[(i + 1) % nb], o0 = over(x0, y0), o1 = over(x1, y1);
                    mouth.push([x0, y0, o0 ? TZ + 0.3 : 0.05]);
                    if (o0 !== o1) { const xm = (x0 + x1) / 2, ym = (y0 + y1) / 2; mouth.push([xm, ym, o0 ? TZ + 0.3 : 0.05], [xm, ym, o1 ? TZ + 0.3 : 0.05]); }
                }
                // The opening is both: seen from the side the mouth's felt edge rises above the lid's inner edge, and the
                // lid alone left a D of the cap across the mouth (the user, 2026-11-27). From behind, a sightline through the
                // body at rail height lands in it up to its far felt edge, and on the bed past it: the mouth cut to that
                // outline (the lid there drew a chord nothing makes; low, it shrinks to the rail's cut, no wedges).
                const aps = (behind ? [P(mouth)] : [P(lid), P(mouth)]).filter(a => a.length >= 3);
                if (!aps.length) return;
                const cut = behind ? P(at(body, TZ + 0.3)) : null;
                if (!behind) holes.push(...aps);
                else if (cut.length >= 3) backs.push({ p, cut, ap: aps[0] });
                // The opening need not be convex, so this uses clip(); without it, the rail's cut alone (from behind).
                if (typeof ctx.clip !== 'function') { pgFill(ctx, behind ? [P(lid)] : aps, '#040303'); return; }
                ctx.save();
                if (cut && cut.length >= 3) {
                    // Through the rail's cut: the bed and the cushions past the hole (a shading trick here drew a dark
                    // blob over the cloth up close, the user's sweep, 2026-11-27); not the bed under the body, the drop.
                    ctx.beginPath(); pgTrace(ctx, cut); ctx.clip();
                    const under = P(at(body, 0));
                    pgFill(ctx, [cut], '#040303');
                    ctx.save();
                    if (under.length >= 3) { ctx.beginPath(); ctx.rect(0, 0, view.W, view.H); pgTrace(ctx, under.slice().reverse()); ctx.clip('evenodd'); }
                    drawFelt();
                    ctx.restore();
                    faces();
                    pgDrawCushionTops(ctx, view, cfg, cush, mat);
                }
                pgFill(ctx, aps, '#040303');
                ctx.beginPath(); aps.forEach(a => pgTrace(ctx, a)); ctx.clip();
                // The walls round the body (inward faces turned to the eye), and the cloth rolling over the bed's edge into
                // the drop where the body crosses the bed.
                const cloth = [[], [], []], CF = 0.45 * cfg.ballR, cl = Math.hypot(p.x, p.y) || 1;
                const walls = [[], [], [], [], [], [], [], [], []];
                for (let i = 0; i < nb; i++) {
                    const [x0, y0] = body[i], [x1, y1] = body[(i + 1) % nb], l = Math.hypot(x1 - x0, y1 - y0) || 1;
                    const nx = -(y1 - y0) / l, ny = (x1 - x0) / l, px = (x0 + x1) / 2, py = (y0 + y1) / 2;
                    if ((eye[0] - px) * nx + (eye[1] - py) * ny <= 0) continue;
                    const lt = Math.max(0, nx * (-p.x / cl) + ny * (-p.y / cl)), bi = lt > 0.66 ? 2 : lt > 0.25 ? 1 : 0;
                    bandZ.forEach((bz, band) => {
                        if (band === 0 && !over(px, py)) return;              // no rail wall above the felt across the mouth
                        walls[band * 3 + bi].push(P([[x0, y0, bz[0]], [x1, y1, bz[0]], [x1, y1, bz[1]], [x0, y0, bz[1]]]));
                    });
                    if (!over(px, py)) cloth[bi].push(P([[x0, y0, 0.05], [x1, y1, 0.05], [x1, y1, -CF], [x0, y0, -CF]]));
                }
                walls.forEach((w, i) => { if (w.length) pgFill(ctx, w, pgRgb(bandRGB[Math.floor(i / 3)], lit[i % 3])); });
                pgFill(ctx, [P(at(pgPocketBody(cfg, p, -0.14 * p.r, 36), PG_POCKET_FLOOR))], '#1E140E');
                pgFill(ctx, [P(at(pgPocketBody(cfg, p, -0.34 * p.r, 36), PG_POCKET_FLOOR))], '#020303');
                cloth.forEach((c, i) => { if (c.length) pgFill(ctx, c, pgRgb(mat.cushion, [0.55, 0.7, 0.85][i])); });
                ctx.restore();
                // The rolled lip where the fall turns into the drop, over the rail only.
                ctx.beginPath();
                let pen = false;
                for (let i = 0; i <= nb; i++) {
                    const [x, y] = body[i % nb], s = over(x, y) && pcProject(view, [x, y, TZ + 0.3]);
                    if (s) { if (pen) ctx.lineTo(s[0], s[1]); else ctx.moveTo(s[0], s[1]); }
                    pen = !!s;
                }
                ctx.strokeStyle = cap.lip; ctx.lineWidth = 1.4; ctx.stroke();
            });
            // The cushions in front of the openings, and only there (clipped to them): elsewhere step 2–3 drew them in
            // order. Only faces turned toward the eye (back faces painted over the rail, the user, 2026-11-27).
            ctx.save();
            if (typeof ctx.clip === 'function') { ctx.beginPath(); holes.forEach(h => pgTrace(ctx, h)); ctx.clip(); }
            faces();
            pgDrawCushionTops(ctx, view, cfg, cush, mat);
            ctx.restore();
            // From behind: only the jaw faces over the drop, where they turn down into it. No tops: drawn there they laid
            // the cloth flat across the hole (the user, 2026-11-27).
            if (typeof ctx.clip === 'function') backs.forEach(({ p, cut, ap }) => {
                const hang = [];
                cush.forEach(c => c.ends.forEach(([a, b]) => {
                    if (seen(c, a, b) && Math.hypot((a[0] + b[0]) / 2 - p.x, (a[1] + b[1]) / 2 - p.y) < p.r) hang.push(face(a, b));
                }));
                if (!hang.length) return;
                ctx.save();
                ctx.beginPath(); pgTrace(ctx, cut); ctx.clip();
                ctx.beginPath(); pgTrace(ctx, ap); ctx.clip();
                pgFill(ctx, hang, mat.jaw);
                ctx.restore();
            });
            pgDrawAir(ctx, view, P(pgRect(OX, OY, TZ)), mk);
            return;
        }
        // 2D: the cushions' playing edge, then the opening from above, its floor inside it.
        pgDrawCushionEdges(ctx, view, cfg, cush);
        table.pockets.forEach(p => {
            const aperture = P(at(pgPocketBody(cfg, p, 0, 48), TZ + 0.3));
            if (aperture.length < 3) return;
            pgFill(ctx, [aperture], '#3A281C');
            pgFill(ctx, [pgClipConvex(P(at(pgPocketBody(cfg, p, -0.14 * p.r, 36), PG_POCKET_FLOOR)), aperture)], '#1E140E');
            pgFill(ctx, [pgClipConvex(P(at(pgPocketBody(cfg, p, -0.34 * p.r, 36), PG_POCKET_FLOOR)), aperture)], '#020303');
        });
    }

    // ── Balls ─────────────────────────────────────────────────────────
    // Body frame: x = the number's pole, z = the stripe axis (digits' up), y = z × x.
    // A fixed per-id "print" shows a fresh rack's numbers from above, each turned a
    // little; the physics quaternion rolls it from there.
    const pgPrintCache = {};
    function pgPrint(id) {
        if (pgPrintCache[id]) return pgPrintCache[id];
        const rot = ((id * 53) % 50 - 25) * Math.PI / 180, tilt = ((id * 37) % 24 - 12) * Math.PI / 180;
        const A0 = [-Math.sin(rot), Math.cos(rot), 0];                     // stripe axis, on the felt plane
        const Nn = [Math.cos(rot) * Math.sin(tilt), Math.sin(rot) * Math.sin(tilt), Math.cos(tilt)];
        const Y = pcNorm(pcCross(A0, Nn)), A = pcCross(Nn, Y);
        return (pgPrintCache[id] = [Nn, Y, A]);                            // columns: body x, y, z in the world
    }

    function pgQuatApply(q, v) {
        const [w, x, y, z] = q;
        const tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0]);
        return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
    }

    // The visible part of a spherical cap (axis `a` in view coordinates,
    // boundary at a·p = h) as a screen polygon, or null when it is behind.
    function pgCap(a, h, cx, cy, rad) {
        const rho = Math.sqrt(Math.max(0, 1 - h * h));
        let e1 = Math.abs(a[2]) < 0.9 ? pcCross(a, [0, 0, 1]) : pcCross(a, [1, 0, 0]);
        e1 = pcNorm(e1);
        const e2 = pcCross(a, e1), K = 40, rim = [];
        for (let i = 0; i < K; i++) {
            const t = i / K * Math.PI * 2, c = Math.cos(t) * rho, s = Math.sin(t) * rho;
            rim.push([h * a[0] + c * e1[0] + s * e2[0], h * a[1] + c * e1[1] + s * e2[1], h * a[2] + c * e1[2] + s * e2[2]]);
        }
        const vis = rim.map(p => p[2] >= 0);
        const scr = p => [cx + p[0] * rad, cy - p[1] * rad];
        if (vis.every(Boolean)) return rim.map(scr);
        if (!vis.some(Boolean)) return null;
        // Start where the rim comes into view, walk the visible arc, then close
        // along the silhouette on the cap's side.
        let s0 = 0;
        while (!(vis[s0] && !vis[(s0 + K - 1) % K])) s0++;
        const onSil = (P, Q) => {
            const t = P[2] / (P[2] - Q[2]);
            const x = P[0] + t * (Q[0] - P[0]), y = P[1] + t * (Q[1] - P[1]), l = Math.hypot(x, y) || 1;
            return [x / l, y / l, 0];
        };
        const pts = [onSil(rim[(s0 + K - 1) % K], rim[s0])];
        let i = s0;
        while (vis[i % K]) { pts.push(rim[i % K]); i++; }
        pts.push(onSil(rim[(i - 1) % K], rim[i % K]));
        const th0 = Math.atan2(pts[pts.length - 1][1], pts[pts.length - 1][0]), th1 = Math.atan2(pts[0][1], pts[0][0]);
        let ccw = th1 - th0; while (ccw < 0) ccw += Math.PI * 2;
        const mid = d => { const t = th0 + d / 2; return Math.cos(t) * a[0] + Math.sin(t) * a[1]; };
        const span = mid(ccw) >= mid(ccw - Math.PI * 2) ? ccw : ccw - Math.PI * 2;
        const n = Math.max(2, Math.ceil(Math.abs(span) / 0.15));
        for (let k = 1; k < n; k++) { const t = th0 + span * k / n; pts.push([Math.cos(t), Math.sin(t), 0]); }
        return pts.map(scr);
    }

    // A ball's number as a cached sprite per id, size and font: fillText is the dearest
    // call on the canvas. At 2× so foreshortening does not blur it; null without a canvas.
    function pgDigit(sprites, make, id, fs, font) {
        if (!sprites || !make) return null;
        // Quarter-octave sizes (drawn scaled), so a turning camera reuses sprites instead of baking new ones.
        const px = Math.pow(2, Math.ceil(Math.log2(Math.max(fs, 4)) * 4) / 4), key = id + '|' + px + '|' + font;
        let s = sprites.get(key);
        if (!s) {
            const w = Math.ceil(px * 1.5) * 2, h = Math.ceil(px * 1.3) * 2;
            const c = make(w, h), g = c.getContext && c.getContext('2d');
            if (!g) return null;
            g.scale(2, 2);
            g.fillStyle = '#15191B';
            g.font = '700 ' + px.toFixed(1) + 'px ' + font;
            g.textAlign = 'center'; g.textBaseline = 'middle';
            g.fillText(String(id), w / 4, h / 4);
            s = { c, w: w / 2, h: h / 2, px };
            if (sprites.size > 400) sprites.clear();
            sprites.set(key, s);
        }
        return s;
    }

    // `v` is the view basis at the ball: right, up and toward the viewer, in world vectors.
    function pgDrawBall(ctx, b, cx, cy, rad, v, theme, alpha) {
        const dd = rad * 2, id = b.id;
        const local = w => [pcDot(w, v.r), pcDot(w, v.u), pcDot(w, v.t)];
        ctx.globalAlpha = alpha === undefined ? 1 : alpha;
        const disc = () => { ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.closePath(); };
        const look = pgBallLook(theme.game, id);
        if (look.cue) {
            disc();
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
            g.addColorStop(0, '#F8F4EB'); g.addColorStop(1, '#E6DFCF');
            ctx.fillStyle = g; ctx.fill();
        } else if (!look.stripe && !look.number) {
            // Plain (snooker's): nothing printed to roll.
            disc(); ctx.fillStyle = look.colour; ctx.fill();
        } else {
            disc(); ctx.fillStyle = look.colour; ctx.fill();
            const M = pgPrint(id), q = b.q || [1, 0, 0, 0];
            const N = local(pgQuatApply(q, M[0])), Y = local(pgQuatApply(q, M[1])), A = local(pgQuatApply(q, M[2]));
            const ivory = [];
            if (look.stripe) {
                ivory.push(pgCap(A, PG_STRIPE, cx, cy, rad), pgCap([-A[0], -A[1], -A[2]], PG_STRIPE, cx, cy, rad));
            }
            if (look.number) [N, [-N[0], -N[1], -N[2]]].forEach(n => ivory.push(pgCap(n, PG_NUMBER, cx, cy, rad)));
            ctx.beginPath(); ivory.forEach(p => pgTrace(ctx, p));
            ctx.fillStyle = PG_IVORY; ctx.fill();
            // Digits on the facing disc, foreshortened; hidden on small balls, faded as it turns away.
            if (look.number && dd >= 15) {
                [[N, 1], [[-N[0], -N[1], -N[2]], -1]].forEach(([n, sgn]) => {
                    const facing = n[2];
                    if (facing < 0.3) return;
                    const fs = Math.max(dd * 0.27, 6);
                    ctx.save();
                    ctx.globalAlpha = (alpha === undefined ? 1 : alpha) * Math.min(1, (facing - 0.3) / 0.25);
                    // Text x along body y (mirrored on the far pole so it reads the right way), text down = −z.
                    ctx.transform(sgn * Y[0], -sgn * Y[1], -A[0], A[1], cx + n[0] * rad, cy - n[1] * rad);
                    const spr = pgDigit(theme.sprites, theme.makeCanvas, id, fs, theme.font);
                    if (spr) {
                        const k = fs / spr.px;
                        ctx.drawImage(spr.c, -spr.w * k / 2, -spr.h * k / 2 + fs * 0.04, spr.w * k, spr.h * k);
                    } else {
                        ctx.fillStyle = '#15191B';
                        ctx.font = '700 ' + fs.toFixed(1) + 'px ' + theme.font;
                        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.fillText(String(id), 0, fs * 0.04);
                    }
                    ctx.restore();
                });
            }
        }
        // Lamp highlight and rim shade, fixed to the view.
        disc();
        const hx = cx - 0.34 * rad, hy = cy - 0.46 * rad, hl = 0.991 * dd;
        const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, hl);
        hg.addColorStop(0, 'rgba(255, 255, 255, 0.9)'); hg.addColorStop(0.14, 'rgba(255, 255, 255, 0.22)'); hg.addColorStop(0.34, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = hg; ctx.fill();
        const sy = cy - 0.16 * rad, sl = 0.766 * dd;
        const sg = ctx.createRadialGradient(cx, sy, 0, cx, sy, sl);
        sg.addColorStop(0.48, 'rgba(0, 0, 0, 0)'); sg.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
        ctx.fillStyle = sg; ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'; ctx.lineWidth = 0.5; ctx.stroke();
        ctx.globalAlpha = 1;
    }

    function pgViewBasis(view, p) {
        const t = view.toViewer(p);
        let r = view.right;
        r = pcNorm([r[0] - pcDot(r, t) * t[0], r[1] - pcDot(r, t) * t[1], r[2] - pcDot(r, t) * t[2]]);
        return { r, u: pcCross(t, r), t };
    }

    // ── Guides ────────────────────────────────────────────────────────
    // The shot's opening on the real physics: the cue ball's path to first contact
    // (squirt included), the object ball's line (throw included), and where the cue
    // ball goes next, so draw visibly bends back. reach: how far that last path is followed, table units.
    // objPath: also follow the object ball alone, off the cushions, into out.objPath (Hawkeye).
    function pgGuide(world, shot, reach = 200, objPath = false) {
        const w = ppCloneWorld(world);
        w.log = [];
        const cue0 = w.balls.find(b => b.id === 0);
        const start = [cue0.x, cue0.y];
        ppStrike(w, shot);
        const first = () => w.log.find(e => (e.type === 'ball' && (e.a === 0 || e.b === 0)) || (e.type === 'cushion' && e.ball === 0) || (e.type === 'pocket' && e.ball === 0));
        let ev = null, snap = null;
        for (let i = 0; i < 360 && !ev; i++) {
            snap = ppCloneWorld(w); snap.log = w.log.slice();
            ppStep(w, 1 / 60);
            ev = first();
            if (!ev && ppSettled(w)) break;
        }
        const out = { start, contact: null, hit: -1, cushion: false, pocketed: false, obj: null, after: [] };
        const cueOf = W => W.balls.find(b => b.id === 0);
        if (!ev) { const c = cueOf(w); out.contact = [c.x, c.y]; return out; }
        // Re-run the frame that held the contact in fine steps, to place it within ~1.5 u.
        const fine = snap;
        let fev = null;
        for (let i = 0; i < 32 && !fev; i++) {
            ppStep(fine, 1 / 1920);
            fev = fine.log.find(e => (e.type === 'ball' && (e.a === 0 || e.b === 0)) || (e.type === 'cushion' && e.ball === 0) || (e.type === 'pocket' && e.ball === 0));
        }
        const W2 = fev ? fine : w, e2 = fev || ev, c = cueOf(W2);
        out.contact = [c.x, c.y];
        if (e2.type === 'pocket') { out.pocketed = true; return out; }
        if (e2.type === 'cushion') out.cushion = true;
        else {
            out.hit = e2.a === 0 ? e2.b : e2.a;
            const ob = W2.balls.find(b => b.id === out.hit);
            const sp = Math.hypot(ob.vx, ob.vy);
            if (sp > 1e-6) out.obj = { x: ob.x, y: ob.y, dx: ob.vx / sp, dy: ob.vy / sp };
        }
        // One ball alone: where its spin takes it, not later collisions (and far cheaper). A ball
        // that drops ends at its pocket.
        const follow = (W, id) => {
            const pts = [], ball = () => W.balls[0];
            W.balls = [W.balls.find(b => b.id === id)];
            let len = 0, px = ball().x, py = ball().y;
            pts.push([px, py]);
            for (let i = 0; i < 240 * reach / 200 && len < reach; i++) {
                ppStep(W, 1 / 120);
                const b = ball();
                if (b.state === 'pocketed') { if (id !== 0 && W.table.pockets[b.pocket]) pts.push([W.table.pockets[b.pocket].x, W.table.pockets[b.pocket].y]); break; }
                len += Math.hypot(b.x - px, b.y - py); px = b.x; py = b.y;
                pts.push([px, py]);
                if (b.vx === 0 && b.vy === 0) break;
            }
            return pts;
        };
        if (objPath && out.obj) out.objPath = follow(ppCloneWorld(W2), out.hit);
        // The cue ball, far enough for the longest drawn path (3.5 diameters at a 10 aim's 1.75, pool).
        out.after = follow(W2, 0);
        return out;
    }

    function pgTrim(pts, maxLen) {
        const out = [pts[0]];
        let len = 0;
        for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1], b = pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
            if (len + d >= maxLen) { const t = (maxLen - len) / d; out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]); break; }
            len += d; out.push(b);
        }
        return out;
    }

    function pgStrokeLine(ctx, view, pts, z, style, width, dash, underlay) {
        const segs = [];
        for (let i = 1; i < pts.length; i++) {
            const s = pcSeg(view, [pts[i - 1][0], pts[i - 1][1], z], [pts[i][0], pts[i][1], z]);
            if (s) segs.push(s);
        }
        if (!segs.length) return;
        const path = () => {
            ctx.beginPath();
            segs.forEach((s, i) => { if (i === 0 || s[0][0] !== segs[i - 1][1][0]) ctx.moveTo(s[0][0], s[0][1]); ctx.lineTo(s[1][0], s[1][1]); });
        };
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        if (underlay) {
            path(); ctx.setLineDash(dash || []); ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)'; ctx.lineWidth = width + 2; ctx.stroke();
        }
        path(); ctx.setLineDash(dash || []); ctx.strokeStyle = style; ctx.lineWidth = width; ctx.stroke();
        ctx.setLineDash([]);
    }

    // A ball's swept corridor on the felt along pts (x, y), half-width hw, GTA-style: solid edges and a
    // gradient between them, both fading from alpha a0 at the start to a1 at the end. Drawn a segment at a
    // time, so a path that bends (off a cushion) fades along its own length.
    function pgBand(ctx, view, pts, hw, colour, a0, a1, holes) {
        const z = 0.3, n = pts.length, cum = [0];
        if (n < 2) return;
        // Cut out of the rings (even-odd), so a bar ends on its ring's curve; a context without clip() draws it whole.
        const cut = !!(holes && holes.length && typeof ctx.clip === 'function');
        if (cut) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, view.W, view.H); holes.forEach(h => pgTrace(ctx, h)); ctx.clip('evenodd'); }
        for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
        const total = cum[n - 1];
        if (total < 1e-6) return;
        const side = pts.map((p, i) => {
            const q0 = pts[Math.max(0, i - 1)], q1 = pts[Math.min(n - 1, i + 1)], dx = q1[0] - q0[0], dy = q1[1] - q0[1], l = Math.hypot(dx, dy) || 1;
            return [[p[0] - dy / l * hw, p[1] + dx / l * hw, z], [p[0] + dy / l * hw, p[1] - dx / l * hw, z]];
        });
        const alpha = i => a0 + (a1 - a0) * cum[i] / total;
        ctx.lineCap = 'round';
        for (let i = 1; i < n; i++) {
            const axis = pcSeg(view, [pts[i - 1][0], pts[i - 1][1], z], [pts[i][0], pts[i][1], z]);
            const quad = pcPoly(view, [side[i - 1][0], side[i][0], side[i][1], side[i - 1][1]]);
            if (!axis || quad.length < 3) continue;
            const grad = k => {
                const g = ctx.createLinearGradient(axis[0][0], axis[0][1], axis[1][0], axis[1][1]);
                const c0 = Math.min(1, alpha(i - 1) * k), c1 = Math.min(1, alpha(i) * k);
                g.addColorStop(0, pgRgba(colour, c0)); g.addColorStop(0.5, pgRgba(colour, (c0 + c1) / 2)); g.addColorStop(1, pgRgba(colour, c1));
                return g;
            };
            ctx.beginPath(); pgTrace(ctx, quad); ctx.fillStyle = grad(0.32); ctx.fill();
            ctx.beginPath();
            [0, 1].forEach(e => { const sg = pcSeg(view, side[i - 1][e], side[i][e]); if (sg) { ctx.moveTo(sg[0][0], sg[0][1]); ctx.lineTo(sg[1][0], sg[1][1]); } });
            ctx.strokeStyle = grad(1); ctx.lineWidth = 2; ctx.stroke();
        }
        if (cut) ctx.restore();
    }
    // A path resampled every step units (the followed paths come in 1/120 s steps).
    function pgResample(pts, step) {
        const out = [pts[0]];
        let acc = 0;
        for (let i = 1; i < pts.length; i++) {
            acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
            if (acc >= step || i === pts.length - 1) { out.push(pts[i]); acc = 0; }
        }
        return out;
    }

    // Felt rings sit inside a ball's footprint: the ghost and its target touch at 2 R, so theirs never meet (GTA's).
    const PG_RING = 0.84;               // ·R
    const PG_RING_GAP = 0.3;           // ·R, the least gap between two rings
    const PG_BAR = 0.62;               // ·R, a guide bar's half-width: narrower than the rings it runs between
    // A ring on the felt round (x, y): an ellipse in perspective.
    const pgRingPoly = (view, x, y, r) => pcPoly(view, pgCirc(x, y, r, 0.35, 36));
    function pgFeltRing(ctx, ring, stroke, width, fill) {
        if (!ring || ring.length < 3) return;
        ctx.beginPath(); pgTrace(ctx, ring);
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'; ctx.lineWidth = width + 1.5; ctx.stroke();
        ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke();
    }

    // ── The frame ─────────────────────────────────────────────────────
    // scene = {
    //   view, world, felt, theme, cache,            cache = {} kept by the caller, or null
    //   makeCanvas(w, h),                            offscreen canvas for the table layer
    //   dpr,                                         backing-store scale of ctx
    //   aim: { angle, power, gap, dragging, hot } | null, null hides the cue and the guides; dragging shows the power ring
    //   cue: a PQ_SET cue (Standard if absent), cueT: ms for its sheen,
    //   guide: pgGuide(…) | null, guideMode: 'full' | 'short' | 'off' (aim line and ghost ball only), illegal,
    //   guideLen: the object ball's line in full mode, table units (default 4 ball diameters; 0 draws no paths),
    //   pathK: the cue's aim, stretching the cue ball's path in full mode (default 1),
    //   bih: { x, y, valid, reason } | null, zone: 'kitchen' | 'D' | null (or legacy kitchen),
    //   call: { called } | null, ring: the nominated ball's id (snooker; ⚙️ Ball Ring off: null) | null,
    //   drops: [{ ball, pocket, t }],
    // }
    function pgRender(ctx, scene) {
        const view = scene.view, w = scene.world, cfg = w.cfg, table = w.table, R = cfg.ballR, K = pgK(cfg);
        const theme = Object.assign({}, PG_THEME, scene.theme, { game: cfg.game || 'pool' });
        if (scene.cache && scene.makeCanvas) { theme.sprites = scene.cache.digits || (scene.cache.digits = new Map()); theme.makeCanvas = scene.makeCanvas; }
        const dpr = scene.dpr || 1;
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, view.W, view.H);

        // Layers 1–4, cached per camera pose. While the camera moves a cache would be
        // thrown away each frame, so the table draws straight to screen until the pose holds.
        const key = JSON.stringify([view.pose, scene.felt, dpr, theme.game, pgSignVersion()]);
        const moving = !!scene.cache && scene.cache.lastKey !== undefined && scene.cache.lastKey !== key;
        if (scene.cache) scene.cache.lastKey = key;
        if (scene.cache && scene.makeCanvas && moving && scene.cache.key !== key) {
            pgDrawTable(ctx, view, cfg, table, scene.felt, scene.makeCanvas);
        } else if (scene.cache && scene.makeCanvas) {
            const c = scene.cache;
            if (c.key !== key) {
                if (!c.canvas || c.canvas.width !== Math.round(view.W * dpr) || c.canvas.height !== Math.round(view.H * dpr)) {
                    c.canvas = scene.makeCanvas(Math.round(view.W * dpr), Math.round(view.H * dpr));
                }
                const tc = c.canvas.getContext('2d');
                tc.setTransform(1, 0, 0, 1, 0, 0);
                tc.clearRect(0, 0, c.canvas.width, c.canvas.height);
                tc.setTransform(dpr, 0, 0, dpr, 0, 0);
                pgDrawTable(tc, view, cfg, table, scene.felt, scene.makeCanvas);
                c.key = key;
            }
            ctx.drawImage(c.canvas, 0, 0, view.W, view.H);
        } else {
            pgDrawTable(ctx, view, cfg, table, scene.felt, scene.makeCanvas);
        }

        // 5. The ball-in-hand zone.
        const zone = scene.zone || (scene.kitchen ? 'kitchen' : null);
        if (zone === 'kitchen') {
            pgFill(ctx, [pcPoly(view, [[-cfg.halfLength, -cfg.halfWidth, 0.2], [table.headX, -cfg.halfWidth, 0.2], [table.headX, cfg.halfWidth, 0.2], [-cfg.halfLength, cfg.halfWidth, 0.2]])], theme.accent, 0.12);
            pgStrokeLine(ctx, view, [[table.headX, -cfg.halfWidth], [table.headX, cfg.halfWidth]], 0.3, pgRgba(theme.accent, 0.8), 1.5, [6, 5], true);
        } else if (zone === 'D' && table.marks) {
            const m = table.marks, arc = [];
            for (let i = 0; i <= 24; i++) { const t = Math.PI / 2 + i / 24 * Math.PI; arc.push([m.baulkX + m.dR * Math.cos(t), m.dR * Math.sin(t)]); }
            pgFill(ctx, [pcPoly(view, arc.map(q => [q[0], q[1], 0.2]))], theme.accent, 0.12);
            pgStrokeLine(ctx, view, arc.concat([[m.baulkX, m.dR]]), 0.3, pgRgba(theme.accent, 0.8), 1.5, [6, 5], true);
        }

        // Pocket drops: sinking into the hole, under everything still in play.
        (scene.drops || []).forEach(d => {
            const p = table.pockets[d.pocket], t = Math.max(0, Math.min(1, d.t));
            if (!p) return;
            const x = d.ball.x + (p.x - d.ball.x) * t, y = d.ball.y + (p.y - d.ball.y) * t;
            const s = pcProject(view, [x, y, R - 2.2 * R * t]);
            if (s) pgDrawBall(ctx, d.ball, s[0], s[1], R * s[2] * (1 - 0.35 * t), pgViewBasis(view, [x, y, R]), theme, 1 - t);
        });

        // 6. Shadows, then guides and the rings on the felt.
        const live = w.balls.filter(b => b.state !== 'pocketed' && !(scene.bih && b.id === 0));
        pgFill(ctx, live.map(b => pcPoly(view, pgCirc(b.x + 4 * K, b.y - 5 * K, R * 1.08, 0.3, 20))), '#000000', 0.38);
        // 'off' (a tournament's) is ⚙️ Guideline None: the corridor and the ghost ball, nothing past the contact.
        const g = scene.aim && scene.guide ? scene.guide : null;
        let ghost = null;
        const cue = w.balls.find(b => b.id === 0);
        const ink = scene.illegal ? theme.hot : PG_GUIDE;
        // The rings' outlines first: the bars are cut where they pass inside one, then the rings are stroked over them.
        const holes = [], ringAt = (x, y, r) => { const p = pgRingPoly(view, x, y, r); if (p.length >= 3) holes.push(p); return p; };
        const ghostOn = !!(g && g.contact && !g.pocketed), hit = g && g.hit > 0 ? w.balls.find(b => b.id === g.hit) : null;
        let cueRing = null;
        if (scene.aim && cue && cue.state !== 'pocketed' && !scene.bih) {
            // The cue ball's ring is wider (it shows round the ball), but gives way to the ghost's and the target's when close.
            const near = Math.min(ghostOn ? Math.hypot(g.contact[0] - cue.x, g.contact[1] - cue.y) : Infinity, hit ? Math.hypot(hit.x - cue.x, hit.y - cue.y) : Infinity);
            cueRing = ringAt(cue.x, cue.y, R * Math.max(PG_RING, Math.min(1.18, near / R - PG_RING - PG_RING_GAP)));
        }
        const hitRing = hit ? ringAt(hit.x, hit.y, R * PG_RING) : null, ghostRing = ghostOn ? ringAt(g.contact[0], g.contact[1], R * PG_RING) : null;
        if (g && g.contact) {
            // Lengths are in ball diameters, so snooker's small balls get as much line as pool's.
            const short = scene.guideMode === 'short', D = 2 * R;
            const L = scene.guideMode === 'off' ? 0 : short ? 2 * D : typeof scene.guideLen === 'number' ? scene.guideLen : 4 * D;
            const dx = g.contact[0] - g.start[0], dy = g.contact[1] - g.start[1], dl = Math.hypot(dx, dy) || 1;
            const ux = dx / dl, uy = dy / dl;
            // Three bars (GTA's), each narrower than the rings and fading as it goes: the cue ball to the ghost, the
            // object ball in bright white, the cue ball's deflection off it.
            const bar = (pts, colour, a0, a1) => pgBand(ctx, view, pts, R * PG_BAR, colour, a0, a1, holes);
            if (dl > 2.3 * R) bar([g.start, g.contact], ink, 0.9, 0.45);
            const objInk = hit ? PG_GUIDE_OBJ : theme.accent;
            // Hawkeye's object ball runs its followed path, off the cushions; otherwise L past its edge.
            if (g.obj && L > 0 && g.objPath && g.objPath.length > 1) bar(pgResample(g.objPath, R), objInk, 0.95, 0.15);
            else if (g.obj && L > 0) bar([[g.obj.x, g.obj.y], [g.obj.x + g.obj.dx * (R + L), g.obj.y + g.obj.dy * (R + L)]], objInk, 0.95, 0);
            if (g.after.length > 1 && L > 0) {
                const tail = pgTrim(g.after, (short ? 1.5 : (g.cushion ? 3.5 : 2.5) * (scene.pathK || 1)) * D + R);
                if (tail.length > 1) bar(pgResample(tail, R), PG_GUIDE, 0.7, 0);
            }
            if (hitRing) pgFeltRing(ctx, hitRing, pgRgba(scene.illegal ? theme.hot : objInk, 0.9), 1.5);
            // The ghost ball is its ring on the felt; the prohibition sign across it when that ball may not be hit first.
            if (ghostRing) {
                pgFeltRing(ctx, ghostRing, pgRgba(ink, 0.95), 1.75, pgRgba(ink, 0.14));
                if (scene.illegal) {
                    const k = R * 0.8;
                    pgStrokeLine(ctx, view, [[g.contact[0] - (ux - uy) * k, g.contact[1] - (uy + ux) * k], [g.contact[0] + (ux - uy) * k, g.contact[1] + (uy + ux) * k]], 0.4, theme.hot, 2);
                }
                const q = pcProject(view, [g.contact[0], g.contact[1], R]);
                if (q && q[3] > PC_NEAR + R) ghost = [q[0], q[1], R * q[2]];
            }
        }
        if (cueRing) pgFeltRing(ctx, cueRing, pgRgba(PG_GUIDE, 0.5), 1.25);

        // 7. Balls, far to near.
        const drawn = live.map(b => ({ b, c: view.toCam([b.x, b.y, R]) })).filter(o => o.c[2] >= PC_NEAR + R).sort((p, q) => q.c[2] - p.c[2]);
        drawn.forEach(({ b, c }) => {
            const s = view.toScr(c), rad = R * s[2];
            if (rad < 0.8) return;
            pgDrawBall(ctx, b, s[0], s[1], rad, pgViewBasis(view, [b.x, b.y, R]), theme);
        });

        // 8. Cue, power ring, called-pocket rings, ball in hand.
        if (scene.aim && cue && cue.state !== 'pocketed' && !scene.bih) {
            // The shooter's cue (scene.cue, else Standard) at the game's scale: the tip off the
            // ball by the pull-back, the butt rising a tenth of the length; near a rail, raised over it on a fixed line.
            const a = scene.aim, d = [Math.cos(a.angle), Math.sin(a.angle)], D = 2 * R, len = (PQ_GAME[theme.game] || PQ_GAME.pool)[0] * D;
            const gap = (a.gap !== undefined ? a.gap : 8 + (a.power || 0) * 1.1) * K;
            const m = pcCueRise([cue.x, cue.y], a.angle, cfg), slope = PC_CUE_SLOPE, fix = Math.min(1, (m - slope) / 0.05);
            const ax = pcNorm([-d[0], -d[1], m]);
            const axis = s => [cue.x - d[0] * (R + gap + s * len), cue.y - d[1] * (R + gap + s * len),
                R + 1.5 * K + slope * s * len + (m - slope) * (gap + s * len) + fix * slope * gap];
            const toEye = p => (view.ortho ? [0, 0, 1] : pcNorm(pcSub(view.eye, p)));
            // The silhouette's sides, square to the rod and the line of sight.
            const side = p => pcNorm(pcCross(ax, toEye(p)));
            const mid = axis(0.5), v = toEye(mid), lit = pcNorm([v[0] * 0.8, v[1] * 0.8, 1 + v[2] * 0.8]), av = pcDot(ax, v);
            const e1 = pcNorm([v[0] - ax[0] * av, v[1] - ax[1] * av, v[2] - ax[2] * av]);
            pqDraw(ctx, scene.cue || PQ_SET[0], theme.game, {
                pt: (s, wd) => { const p = axis(s), e = side(p); return [p[0] + e[0] * wd * D, p[1] + e[1] * wd * D, p[2] + e[2] * wd * D]; },
                scr: p => { const q = pcProject(view, p); return q && [q[0], q[1]]; },
                poly: pts => pcPoly(view, pts), light: [pcDot(lit, e1), pcDot(lit, side(mid))], t: scene.cueT, mk: scene.makeCanvas,
            });
            // The pull-back ring beside the cue ball while power is dragged (3D; 2D has the gauge alone).
            const cs = a.dragging && !view.ortho ? pcProject(view, [cue.x, cue.y, R]) : null;
            if (cs) {
                const rad = R * cs[2], rr = Math.max(14, 0.55 * rad), p = Math.max(0, Math.min(100, a.power || 0)) / 100;
                const x = Math.min(view.W - rr - 30, cs[0] + 1.9 * rad), y = Math.max(rr + 8, Math.min(view.H - rr - 8, cs[1] - 0.2 * rad));
                ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.28)'; ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)'; ctx.lineWidth = 3; ctx.stroke();
                if (p > 0) {
                    ctx.beginPath(); ctx.arc(x, y, rr, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
                    ctx.lineCap = 'round'; ctx.strokeStyle = a.hot ? theme.hot : theme.accent; ctx.lineWidth = 3.5; ctx.stroke();
                }
                ctx.beginPath(); ctx.arc(x, y, rr * 0.22, 0, Math.PI * 2);
                ctx.fillStyle = pgRgba(PG_GUIDE, 0.85); ctx.fill();
            }
        }
        if (scene.ring) {
            // Snooker's nominated ball: a see-through accent ring at r + max(3 px, 0.4 r).
            const b = w.balls.find(o => o.id === scene.ring && o.state !== 'pocketed');
            const s = b && pcProject(view, [b.x, b.y, R]);
            if (s && s[3] > PC_NEAR + R) {
                const rad = R * s[2], rr = rad + Math.max(3, rad * 0.4);
                // It steps aside where the ghost ball sits on it, so the aim stays readable.
                const cut = ghost ? pgRingGap(s[0], s[1], rr, ghost[0], ghost[1], ghost[2] + 4) : null;
                ctx.beginPath();
                if (cut) ctx.arc(s[0], s[1], rr, cut[0], cut[1]); else ctx.arc(s[0], s[1], rr, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)'; ctx.lineWidth = 3; ctx.stroke();
                ctx.strokeStyle = pgRgba(theme.accent, 0.6); ctx.lineWidth = 1.5; ctx.stroke();
            }
        }
        // Pocket rings: the called one lit, the rest dashed. Snooker's are lighter so its small
        // pockets and a ball in their jaws still read.
        if (scene.call) {
            const lite = theme.game === 'snooker';
            table.pockets.forEach((p, i) => {
                const ring = pcPoly(view, pgCirc(p.x, p.y, p.r + 12 * K, pgRailZ(cfg) + 0.5, 32));
                if (ring.length < 3) return;
                ctx.beginPath(); pgTrace(ctx, ring);
                if (i === scene.call.called) {
                    ctx.fillStyle = pgRgba(theme.accent, lite ? 0.1 : 0.22); ctx.fill();
                    ctx.strokeStyle = lite ? pgRgba(theme.accent, 0.75) : theme.accent; ctx.lineWidth = lite ? 2.25 : 3; ctx.stroke();
                } else {
                    ctx.setLineDash([4, 3]); ctx.strokeStyle = pgRgba(theme.accent, lite ? 0.45 : 0.9); ctx.lineWidth = lite ? 1.5 : 1.75; ctx.stroke(); ctx.setLineDash([]);
                }
            });
        }
        if (scene.bih) {
            const s = pcProject(view, [scene.bih.x, scene.bih.y, R]);
            if (s && s[3] > PC_NEAR + R) {
                const gr = R * s[2], ok = scene.bih.valid !== false;
                ctx.beginPath(); ctx.arc(s[0], s[1], gr, 0, Math.PI * 2);
                ctx.fillStyle = ok ? pgRgba(PG_IVORY, 0.6) : pgRgba(theme.hot, 0.4); ctx.fill();
                ctx.setLineDash(ok ? [3, 2] : []);
                ctx.strokeStyle = ok ? theme.accent : theme.hot; ctx.lineWidth = 2; ctx.stroke();
                ctx.setLineDash([]);
                ctx.beginPath(); ctx.arc(s[0], s[1], gr + 5, 0, Math.PI * 2);
                ctx.strokeStyle = pgRgba(ok ? theme.accent : theme.hot, 0.35); ctx.lineWidth = 1; ctx.stroke();
                if (typeof Path2D === 'function') {
                    ctx.save();
                    ctx.translate(s[0] + gr * 0.2, s[1] + gr * 0.1); ctx.scale(0.95, 0.95);
                    const hand = new Path2D(PG_HAND);
                    ctx.fillStyle = '#15191B'; ctx.fill(hand);
                    ctx.strokeStyle = PG_IVORY; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(hand);
                    ctx.restore();
                }
            }
        }
        ctx.restore();
    }

    // The part of a ring (centre x, y, radius r) left clear of a circle (gx, gy, gr), as the arc
    // [from, to] drawn clockwise, or null when they do not meet (the whole ring).
    function pgRingGap(x, y, r, gx, gy, gr) {
        const d = Math.hypot(gx - x, gy - y);
        if (d >= r + gr || d + r <= gr || d + gr <= r) return null;
        const half = Math.acos(Math.max(-1, Math.min(1, (d * d + r * r - gr * gr) / (2 * d * r)))), a = Math.atan2(gy - y, gx - x);
        return [a + half, a - half + 2 * Math.PI];
    }

    // Pocket screen positions for hit-testing a call; off-screen ones are called from the mini-map.
    function pgPocketMarks(view, table, cfg) {
        const Z = cfg ? pgRailZ(cfg) : PG_RAIL_Z, K = table.R / 14;
        return table.pockets.map((p, i) => {
            const s = pcProject(view, [p.x, p.y, Z]);
            const inView = !!s && s[0] > 10 && s[0] < view.W - 10 && s[1] > 10 && s[1] < view.H - 10;
            return { i, x: s ? s[0] : 0, y: s ? s[1] : 0, r: s ? (p.r + 12 * K) * s[2] : 0, inView };
        });
    }
