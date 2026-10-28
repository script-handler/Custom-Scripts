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
    // The cushions, from the physics config so they match the colliders:
    // { top, nose: [a, b], ends: [[p, q], …] } (nose face drops to the felt; end faces
    // are jaw-coloured). Pool's are quads [nose start, nose end, rail end, rail start].
    function pgCushions(cfg) {
        if (cfg.pocketStyle === 'rounded') return pgRoundedCushions(cfg);
        const HL = cfg.halfLength, HW = cfg.halfWidth, CU = cfg.cushionWidth;
        const CB = cfg.cornerRailEnd, CN = cfg.cornerNose, SB = cfg.sideRailEnd, SN = cfg.sideNose;
        const N = pgNoseZ(cfg), T = pgRailZ(cfg), q = [];
        [-1, 1].forEach(sy => {
            [[-HL + CB, -SB, -HL + CN, -SN], [SB, HL - CB, SN, HL - CN]].forEach(g => {
                q.push([[g[2], sy * HW, N], [g[3], sy * HW, N], [g[1], sy * (HW + CU), T], [g[0], sy * (HW + CU), T]]);
            });
        });
        [-1, 1].forEach(sx => {
            q.push([[sx * HL, -HW + CN, N], [sx * HL, HW - CN, N], [sx * (HL + CU), HW - CB, T], [sx * (HL + CU), -HW + CB, T]]);
        });
        // Each end's corner, where the playing face meets the jaw, is drawn rounded (the user,
        // 2026-10-15), as snooker's are. Drawn only: the nose point collider sits within a
        // couple of units of the arc.
        const at = (x, y, A, u) => { const dep = Math.min(1, Math.abs(u[0] * (y - A[1]) - u[1] * (x - A[0])) / CU); return [x, y, N + (T - N) * dep]; };
        const round = (A, other, rail) => {
            const nb = pgUnit(other[0] - A[0], other[1] - A[1]), jl = Math.hypot(rail[0] - A[0], rail[1] - A[1]), jb = [(rail[0] - A[0]) / jl, (rail[1] - A[1]) / jl];
            const half = Math.acos(Math.max(-1, Math.min(1, nb[0] * jb[0] + nb[1] * jb[1]))) / 2;    // half the corner's angle
            const r = Math.min(PG_NOSE_ROUND, 0.6 * jl * Math.tan(half)), d = r / Math.tan(half);
            const bis = pgUnit(nb[0] + jb[0], nb[1] + jb[1]), C = [A[0] + bis[0] * r / Math.sin(half), A[1] + bis[1] * r / Math.sin(half)];
            const a0 = Math.atan2(A[1] + nb[1] * d - C[1], A[0] + nb[0] * d - C[0]), a1 = Math.atan2(A[1] + jb[1] * d - C[1], A[0] + jb[0] * d - C[0]);
            let sp = a1 - a0;
            sp -= 2 * Math.PI * Math.round(sp / (2 * Math.PI));
            const pts = [];
            for (let i = 0; i <= 8; i++) { const t = a0 + sp * i / 8; pts.push(at(C[0] + r * Math.cos(t), C[1] + r * Math.sin(t), A, nb)); }
            return pts;                                                    // nose side first, jaw side last
        };
        return q.map(c => {
            const sa = round(c[0], c[1], c[3]), sb = round(c[1], c[0], c[2]), ends = [];
            [[sa, c[3]], [sb, c[2]]].forEach(([s, rail]) => {
                for (let i = 0; i < s.length - 1; i++) ends.push([s[i], s[i + 1]]);
                ends.push([s[s.length - 1], rail]);
            });
            return { top: [c[3]].concat(sa.slice().reverse(), sb, [c[2]]), nose: [sa[0], sb[0]], ends };
        });
    }
    const PG_NOSE_ROUND = 12;             // pool's drawn nose radius: the cushion's depth, as snooker's design
    const pgUnit = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };

    // Snooker's cushions, matching ppBuildRoundedTable; the top rises from nose to rail height.
    function pgRoundedCushions(cfg) {
        const HL = cfg.halfLength, HW = cfg.halfWidth, CU = cfg.cushionWidth, RHO = cfg.noseRound;
        const c = cfg.cornerNose, s = cfg.sideNose, N = pgNoseZ(cfg), T = pgRailZ(cfg), NA = 8;
        const out = [];
        // One run from u = a to b; dirA/dirB point toward each end's pocket, jbA/jbB are the
        // jaw leans; map(u, depth, z) is the point that fraction of the way to the rail.
        const run = (a, b, dirA, dirB, jbA, jbB, map) => {
            const at = (u, dep) => map(u, dep, N + (T - N) * dep);
            const end = (e, dir, jb) => {
                const pts = [];
                for (let i = 0; i <= NA; i++) { const t = i / NA * Math.PI / 2; pts.push(at(e - dir * RHO + dir * RHO * Math.sin(t), RHO * (1 - Math.cos(t)) / CU)); }
                pts.push(at(e + dir * jb, 1));
                return pts;
            };
            const sa = end(a, dirA, jbA), sb = end(b, dirB, jbB);
            const top = sb.concat(sa.slice().reverse());
            const ends = [];
            [sa, sb].forEach(p => { for (let i = 0; i < p.length - 1; i++) ends.push([p[i], p[i + 1]]); });
            out.push({ top, nose: [sa[0], sb[0]], ends });
        };
        const cj = cfg.cornerJawBack, sj = cfg.sideJawBack;
        [-1, 1].forEach(sy => {
            const m = (u, dep, z) => [u, sy * (HW + dep * CU), z];
            run(-HL + c, -s, -1, 1, cj, sj, m);
            run(s, HL - c, -1, 1, sj, cj, m);
        });
        [-1, 1].forEach(sx => run(-HW + c, HW - c, -1, 1, cj, cj, (u, dep, z) => [sx * (HL + dep * CU), u, z]));
        return out;
    }

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

    // cloth: a preset's name, or a cloth (pgFeltFrom). mk(w, h): a canvas, for the grain.
    function pgDrawTable(ctx, view, cfg, table, cloth, mk) {
        const P = pts => pcPoly(view, pts);
        const mat = cloth && typeof cloth === 'object' && Array.isArray(cloth.felt) ? cloth : PG_FELTS[cloth] || PG_FELTS.green;
        const HL = cfg.halfLength, HW = cfg.halfWidth, CU = cfg.cushionWidth, RL = cfg.railWidth - cfg.cushionWidth;
        const TZ = pgRailZ(cfg), OX = HL + CU + RL, OY = HW + CU + RL, IX = HL + CU, IY = HW + CU;
        const eye = view.eye, wood = PG_WOOD[cfg.game] || PG_WOOD.pool;

        // 1. Shadow, apron, felt.
        const shadow = view.ortho ? P(pgRect(OX + 4, OY + 4, -1).map(p => [p[0], p[1] - 12, p[2]])) : P(pgRect(OX + 30, OY + 30, -90));
        ctx.save();
        if ('filter' in ctx) ctx.filter = 'blur(9px)';
        pgFill(ctx, [shadow], '#000000', 0.55);
        ctx.restore();
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
        const felt = P(pgRect(IX, IY, 0));
        if (felt.length >= 3) {
            // Radial at (50%, 46%), r 62% of the felt's bounding box.
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
        }

        // 2. The cushions' shadows on the cloth, rail inner faces, jaw faces, nose faces.
        const cush = pgCushions(cfg);
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

        // 4. Pockets: a leather rim clamped to the rail's inner edge, then the hole.
        const rims = table.pockets.map(p => P(pgCirc(p.x, p.y, p.r + 7, TZ + 0.2, 36).map(q => {
            if (Math.abs(q[0]) < IX && Math.abs(q[1]) < IY) {
                const dx = IX - Math.abs(q[0]), dy = IY - Math.abs(q[1]);
                return dx < dy ? [Math.sign(q[0]) * IX, q[1], q[2]] : [q[0], Math.sign(q[1]) * IY, q[2]];
            }
            return q;
        })));
        pgFill(ctx, rims, '#1A1410');
        const bandZ = [[TZ + 0.3, 0], [0, -22], [-22, PG_POCKET_FLOOR]];
        const bandRGB = ['#563C29', '#302117', '#150F0B'];
        const lit = [0.55, 0.8, 1.08];
        const NF = 30;
        // In 3D (pool and snooker): a pocket's lip is at rail height only over the rail and
        // drops to the felt across the gap; the wall's top band shows only over the rail.
        // The cushions are then redrawn in front of the holes.
        if (eye) {
            const over = (x, y) => Math.abs(x) > IX || Math.abs(y) > IY;
            table.pockets.forEach(p => {
                const rim = [];
                for (let i = 0; i < 72; i++) {
                    const t0 = i / 72 * Math.PI * 2, t1 = (i + 1) / 72 * Math.PI * 2;
                    const x0 = p.x + p.r * Math.cos(t0), y0 = p.y + p.r * Math.sin(t0), x1 = p.x + p.r * Math.cos(t1), y1 = p.y + p.r * Math.sin(t1);
                    const o0 = over(x0, y0), o1 = over(x1, y1);
                    rim.push([x0, y0, o0 ? TZ + 0.3 : 0.05]);
                    if (o0 !== o1) { const xm = (x0 + x1) / 2, ym = (y0 + y1) / 2; rim.push([xm, ym, o0 ? TZ + 0.3 : 0.05], [xm, ym, o1 ? TZ + 0.3 : 0.05]); }
                }
                const ap = P(rim);
                if (ap.length < 3) return;
                pgFill(ctx, [ap], '#040303');
                // The opening need not be convex, so this uses clip(); without it, the opening alone.
                if (typeof ctx.clip !== 'function') return;
                ctx.save();
                ctx.beginPath(); pgTrace(ctx, ap); ctx.clip();
                const walls = [[], [], [], [], [], [], [], [], []], cl = Math.hypot(p.x, p.y) || 1;
                for (let k = 0; k < NF; k++) {
                    const a0 = k / NF * Math.PI * 2, a1 = (k + 1) / NF * Math.PI * 2, am = (a0 + a1) / 2;
                    const nx = -Math.cos(am), ny = -Math.sin(am), px = p.x + p.r * Math.cos(am), py = p.y + p.r * Math.sin(am);
                    if ((eye[0] - px) * nx + (eye[1] - py) * ny <= 0) continue;
                    const face = Math.max(0, nx * (-p.x / cl) + ny * (-p.y / cl)), bi = face > 0.66 ? 2 : face > 0.25 ? 1 : 0;
                    const x0 = p.x + p.r * Math.cos(a0), y0 = p.y + p.r * Math.sin(a0), x1 = p.x + p.r * Math.cos(a1), y1 = p.y + p.r * Math.sin(a1);
                    bandZ.forEach((bz, band) => {
                        if (band === 0 && !over(px, py)) return;              // no rail wall above the felt across the gap
                        walls[band * 3 + bi].push(P([[x0, y0, bz[0]], [x1, y1, bz[0]], [x1, y1, bz[1]], [x0, y0, bz[1]]]));
                    });
                }
                walls.forEach((w, i) => { if (w.length) pgFill(ctx, w, pgRgb(bandRGB[Math.floor(i / 3)], lit[i % 3])); });
                pgFill(ctx, [P(pgCirc(p.x, p.y, p.r * 0.86, PG_POCKET_FLOOR, 36))], '#1E140E');
                pgFill(ctx, [P(pgCirc(p.x, p.y, p.r * 0.66, PG_POCKET_FLOOR, 36))], '#020303');
                ctx.restore();
            });
            const jaws = [];
            cush.forEach(c => c.ends.forEach(([p, q]) => jaws.push(P([p, q, [q[0], q[1], 0], [p[0], p[1], 0]]))));
            pgFill(ctx, jaws, mat.jaw);
            pgFill(ctx, cush.map(c => P([c.nose[0], c.nose[1], [c.nose[1][0], c.nose[1][1], 0], [c.nose[0][0], c.nose[0][1], 0]])), mat.nose);
            pgDrawCushionTops(ctx, view, cfg, cush, mat);
            return;
        }
        // 2D: the cushions' playing edge, then the hole from above, its floor inside it.
        pgDrawCushionEdges(ctx, view, cfg, cush);
        table.pockets.forEach(p => {
            const aperture = P(pgCirc(p.x, p.y, p.r, TZ + 0.3, 36));
            if (aperture.length < 3) return;
            pgFill(ctx, [aperture], '#3A281C');
            pgFill(ctx, [pgClipConvex(P(pgCirc(p.x, p.y, p.r * 0.86, PG_POCKET_FLOOR, 36)), aperture)], '#1E140E');
            pgFill(ctx, [pgClipConvex(P(pgCirc(p.x, p.y, p.r * 0.66, PG_POCKET_FLOOR, 36)), aperture)], '#020303');
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
        const px = Math.round(fs * 2) / 2, key = id + '|' + px + '|' + font;
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

    // ── The frame ─────────────────────────────────────────────────────
    // scene = {
    //   view, world, felt, theme, cache,            cache = {} kept by the caller, or null
    //   makeCanvas(w, h),                            offscreen canvas for the table layer
    //   dpr,                                         backing-store scale of ctx
    //   aim: { angle, power, gap } | null,           null hides the cue and the guides
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
        const key = JSON.stringify([view.pose, scene.felt, dpr, theme.game]);
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

        // 6. Shadows, then guides.
        const live = w.balls.filter(b => b.state !== 'pocketed' && !(scene.bih && b.id === 0));
        pgFill(ctx, live.map(b => pcPoly(view, pgCirc(b.x + 4 * K, b.y - 5 * K, R * 1.08, 0.3, 20))), '#000000', 0.38);
        // 'off' (a tournament's) is ⚙️ Guideline None: the aim line and the ghost ball, nothing past the contact.
        const g = scene.aim && scene.guide ? scene.guide : null;
        const Z = 0.6;
        if (g && g.contact) {
            // Lengths are in ball diameters, so snooker's small balls get as much line as pool's.
            const short = scene.guideMode === 'short', D = 2 * R;
            const L = scene.guideMode === 'off' ? 0 : short ? 2 * D : typeof scene.guideLen === 'number' ? scene.guideLen : 4 * D;
            const dx = g.contact[0] - g.start[0], dy = g.contact[1] - g.start[1], dl = Math.hypot(dx, dy) || 1;
            const ux = dx / dl, uy = dy / dl;
            if (dl > 2.3 * R) {
                pgStrokeLine(ctx, view, [[g.start[0] + ux * R * 1.3, g.start[1] + uy * R * 1.3], [g.contact[0] - ux * R, g.contact[1] - uy * R]], Z, pgRgba(PG_GUIDE, 0.85), 1.5, [5, 4]);
            }
            // A path from a ball's centre, started at its edge.
            const fromEdge = path => {
                let k = 0, acc = 0;
                while (k < path.length - 1 && acc < R) { acc += Math.hypot(path[k + 1][0] - path[k][0], path[k + 1][1] - path[k][1]); k++; }
                return path.slice(k);
            };
            // Hawkeye's object ball runs its followed path, off the cushions; otherwise a straight line L long.
            const objTail = g.obj && L > 0 && g.objPath ? fromEdge(g.objPath) : null;
            if (objTail && objTail.length > 1) pgStrokeLine(ctx, view, objTail, Z, theme.accent, 2, null, true);
            else if (g.obj && L > 0 && !g.objPath) {
                pgStrokeLine(ctx, view, [[g.obj.x + g.obj.dx * R, g.obj.y + g.obj.dy * R], [g.obj.x + g.obj.dx * (R + L), g.obj.y + g.obj.dy * (R + L)]], Z, theme.accent, 2, null, true);
            }
            if (g.after.length > 1 && L > 0) {
                const tail = fromEdge(pgTrim(g.after, (short ? 1.5 : (g.cushion ? 3.5 : 2.5) * (scene.pathK || 1)) * D + R));
                if (tail.length > 1) pgStrokeLine(ctx, view, tail, Z, pgRgba(PG_GUIDE, 0.4), 1.2, [2, 4]);
            }
        }

        // 7. Balls, far to near.
        const drawn = live.map(b => {
            const c = view.toCam([b.x, b.y, R]);
            return { b, c };
        }).filter(o => o.c[2] >= PC_NEAR + R).sort((p, q) => q.c[2] - p.c[2]);
        drawn.forEach(({ b, c }) => {
            const s = view.toScr(c), rad = R * s[2];
            if (rad < 0.8) return;
            pgDrawBall(ctx, b, s[0], s[1], rad, pgViewBasis(view, [b.x, b.y, R]), theme);
        });

        // 8. Ghost ball, cue, called-pocket rings, ball in hand.
        let ghost = null;
        if (g && g.contact && !g.pocketed) {
            const s = pcProject(view, [g.contact[0], g.contact[1], R]);
            if (s && s[3] > PC_NEAR + R) {
                const gr = R * s[2];
                ghost = [s[0], s[1], gr];
                // A solid rim with a reticle (Cue Club's): ticks square to the aim, one pointing at
                // the contact, and the centre dot, so the line reads with no guide drawn.
                const ink = scene.illegal ? theme.hot : pgRgba(PG_GUIDE, 0.95);
                ctx.beginPath(); ctx.arc(s[0], s[1], gr, 0, Math.PI * 2);
                ctx.fillStyle = pgRgba(PG_GUIDE, 0.08); ctx.fill();
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'; ctx.lineWidth = 3; ctx.stroke();
                ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.stroke();
                const s0 = pcProject(view, [g.start[0], g.start[1], R]);
                if (!scene.illegal && gr >= 5) {
                    const a = s0 && Math.hypot(s[0] - s0[0], s[1] - s0[1]) > 1 ? Math.atan2(s[1] - s0[1], s[0] - s0[0]) : 0;
                    ctx.beginPath();
                    for (let i = 0; i < 4; i++) {
                        const c = Math.cos(a + i * Math.PI / 2), n = Math.sin(a + i * Math.PI / 2);
                        ctx.moveTo(s[0] + c * gr * 0.45, s[1] + n * gr * 0.45); ctx.lineTo(s[0] + c * gr, s[1] + n * gr);
                    }
                    ctx.lineCap = 'round'; ctx.strokeStyle = ink; ctx.lineWidth = 1.25; ctx.stroke();
                    ctx.beginPath(); ctx.arc(s[0], s[1], Math.max(1, gr * 0.09), 0, Math.PI * 2);
                    ctx.fillStyle = ink; ctx.fill();
                }
                if (scene.illegal) {
                    // The prohibition sign: this ball may not be hit first.
                    ctx.beginPath();
                    ctx.moveTo(s[0] - gr * 0.62, s[1] + gr * 0.62); ctx.lineTo(s[0] + gr * 0.62, s[1] - gr * 0.62);
                    ctx.strokeStyle = theme.hot; ctx.lineWidth = 2; ctx.stroke();
                }
            }
        }
        const cue = w.balls.find(b => b.id === 0);
        if (scene.aim && cue && cue.state !== 'pocketed' && !scene.bih) {
            // The shooter's cue (scene.cue, else Standard) at the game's scale: the tip off the
            // ball by the pull-back, the butt rising a tenth of the length.
            const a = scene.aim, d = [Math.cos(a.angle), Math.sin(a.angle)], D = 2 * R, len = (PQ_GAME[theme.game] || PQ_GAME.pool)[0] * D;
            const gap = (a.gap !== undefined ? a.gap : 8 + (a.power || 0) * 1.1) * K;
            const ax = pcNorm([-d[0], -d[1], 0.1]);
            const axis = s => [cue.x - d[0] * (R + gap + s * len), cue.y - d[1] * (R + gap + s * len), R + 1.5 * K + 0.1 * s * len];
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
