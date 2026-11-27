// Maps how the pockets take a ball, so a pocket rebuild can keep pots as hard (POOL_V2_PLAN.md, Pockets rebuilt).
//
//   node pool-dev/pocket-probe.js save <file>                       today's geometry → JSON
//   node pool-dev/pocket-probe.js compare <file> ['{"pool":{…},"snooker":{…}}']   cfg overrides vs the saved map
//
// For pool and snooker, a corner (top right) and a middle (top): a ball fired at the mouth's centre along 5 approach
// angles × 13 sideways offsets (±2 R) × 3 paces. Each line: o dropped clean, j dropped off a jaw, r touched a jaw or
// nose and stayed up, x missed. The mouth (the nose ends) is the reference, so it means the same on any geometry.
const fs = require('fs');
const P = require('./load').snooker();

const ANGLES = { corner: [-35, -20, 0, 20, 35], side: [-45, -25, 0, 25, 45] };
const OFFS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];   // ·R/3
const PACE = [0.12, 0.35, 0.7];                           // ·maxSpeed

function world(game, over) { return game === 'snooker' ? P.psCreateWorld(over) : P.ppCreateWorld(over); }

function map(game, over) {
    const out = {};
    const w0 = world(game, over), t = w0.table, R = w0.cfg.ballR;
    [['corner', 2], ['side', 1]].forEach(([kind, pi]) => {
        const p = t.pockets[pi], m = p.mouth, T = [(m[0] + m[2]) / 2, (m[1] + m[3]) / 2];
        const u = kind === 'corner' ? [p.sx / Math.SQRT2, p.sy / Math.SQRT2] : [0, p.sy];
        out[kind] = ANGLES[kind].map(deg => PACE.map(f => OFFS.map(k => {
            const th = deg * Math.PI / 180, a = [u[0] * Math.cos(th) - u[1] * Math.sin(th), u[0] * Math.sin(th) + u[1] * Math.cos(th)];
            const n = [-a[1], a[0]], o = k * R / 3, D = 14 * R;
            const w = world(game, over);
            w.balls = [P.ppMakeBall(0, T[0] - a[0] * D + n[0] * o, T[1] - a[1] * D + n[1] * o)];
            P.ppStrike(w, { angle: Math.atan2(a[1], a[0]), speed: f * w.cfg.maxSpeed, tipX: 0, tipY: 0 });
            P.ppSimulate(w, 10);
            const pk = w.log.some(e => e.type === 'pocket' && e.ball === 0 && e.pocket === pi);
            const jaw = w.log.some(e => e.type === 'cushion' && e.kind !== 'cushion');
            return pk ? (jaw ? 'j' : 'o') : (jaw ? 'r' : 'x');
        }).join('')));
    });
    return out;
}

module.exports = { map, ANGLES, OFFS, PACE };
const [cmd, file, overs] = require.main === module ? process.argv.slice(2) : [];
const games = ['pool', 'snooker'];
if (cmd === 'save') {
    const all = {};
    games.forEach(g => { all[g] = map(g); });
    fs.writeFileSync(file, JSON.stringify(all, null, 1));
    console.log('saved', file);
} else if (cmd === 'compare') {
    const base = JSON.parse(fs.readFileSync(file, 'utf8')), o = overs ? JSON.parse(overs) : {};
    games.forEach(g => {
        const now = map(g, o[g]);
        ['corner', 'side'].forEach(kind => {
            let same = 0, n = 0, d0 = 0, d1 = 0;
            const rows = [];
            base[g][kind].forEach((byPace, ai) => byPace.forEach((s0, pi) => {
                const s1 = now[kind][ai][pi];
                for (let i = 0; i < s0.length; i++) { n++; if (s0[i] === s1[i]) same++; if (/[oj]/.test(s0[i])) d0++; if (/[oj]/.test(s1[i])) d1++; }
                rows.push(`  ${String(ANGLES[kind][ai]).padStart(3)}° ×${PACE[pi]}  ${s0}  ${s1}${s0 === s1 ? '' : '  ≠'}`);
            }));
            console.log(`${g} ${kind}: ${(100 * same / n).toFixed(1)}% the same, drops ${d0} → ${d1} of ${n}`);
            if (process.env.ROWS) rows.forEach(r => console.log(r));
        });
    });
} else if (cmd === 'sweep') {
    // Each pocket kind on each table: hole widths 1.5–1.8 balls × shelves −1.5…+1 R, closest to the saved map first.
    const base = JSON.parse(fs.readFileSync(file, 'utf8'));
    games.forEach(g => ['corner', 'side'].forEach(kind => {
        const res = [];
        for (let w = 1.5; w <= 1.801; w += 0.05) for (let sh = -1.5; sh <= 1.001; sh += 0.25) {
            const over = kind === 'corner' ? { cornerHoleW: w, cornerShelf: sh } : { sideHoleW: w, sideShelf: sh };
            let now;
            try { now = map(g, over)[kind]; } catch (e) { continue; }
            let same = 0, n = 0, d0 = 0, d1 = 0;
            base[g][kind].forEach((byPace, ai) => byPace.forEach((s0, pi) => {
                const s1 = now[ai][pi];
                for (let i = 0; i < s0.length; i++) { n++; if (s0[i] === s1[i]) same++; if (/[oj]/.test(s0[i])) d0++; if (/[oj]/.test(s1[i])) d1++; }
            }));
            res.push({ w: +w.toFixed(2), sh: +sh.toFixed(2), same: 100 * same / n, d0, d1 });
        }
        res.sort((a, b) => b.same - a.same);
        console.log(`${g} ${kind}: ` + res.slice(0, 5).map(r => `w ${r.w} shelf ${r.sh}: ${r.same.toFixed(1)}% drops ${r.d0}→${r.d1}`).join(' | '));
    }));
} else if (require.main === module) {
    console.log('usage: pocket-probe.js save <file> | compare <file> [overrides] | sweep <file>');
}
