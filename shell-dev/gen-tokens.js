// Regenerates the <gen:tokens> block of ATCShell.js from the v2 design export (shell-dev/ref/design-v2): the
// M3 colour schemes (x-schemes.js) and the shapes the themes use (x-tokens.css), resampled to N points at whole
// percent so any two still morph (the design's 32 × 100-point set is ~40 KB).
//   "C:/Program Files/nodejs/node.exe" shell-dev/gen-tokens.js
const fs = require('fs'), path = require('path');
const REF = path.join(__dirname, 'ref/design-v2'), FILE = path.join(__dirname, '..', 'ATCShell.js');
const X = new Function(fs.readFileSync(path.join(REF, 'x-schemes.js'), 'utf8').replace(/^export /gm, '') + ';return { THEMES };')();
const kebab = s => s.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
const t0 = X.THEMES[0], ROLES = Object.keys(t0.c), ST = Object.keys(t0.st);
const SCHEMES = Object.fromEntries(X.THEMES.filter(t => t.fam !== 'cyber').map(t =>
    [t.key, [...ROLES.map(r => t.c[r]), ...ST.map(r => t.st[r]), t.ink, t.fill, t.onFill, t.track].join(' ')]));

const css = fs.readFileSync(path.join(REF, 'x-tokens.css'), 'utf8'), N = 60;
const USED = ['circle', 'square', 'slanted', 'oval', 'pill', 'diamond', 'pentagon', 'gem', 'sunny', 'cookie4', 'cookie6', 'cookie9', 'cookie12',
    'clover4', 'burst', 'soft-burst', 'flower', 'puffy', 'puffy-diamond', 'pixel-circle', 'pixel-triangle'];
const SHAPES = {};
for (const k of USED) {
    const m = css.match(new RegExp('--x-shape-' + k + ':polygon\\(([^)]*)\\)')); if (!m) throw new Error('no shape ' + k);
    const P = m[1].split(',').map(p => p.trim().split(/\s+/).map(parseFloat));
    const L = [0]; for (let i = 1; i <= P.length; i++) { const a = P[i - 1], b = P[i % P.length]; L.push(L[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    const pts = [];
    for (let j = 0, i = 0; j < N; j++) { const d = j / N * L[P.length]; while (L[i + 1] < d) i++; const a = P[i], b = P[(i + 1) % P.length], f = (d - L[i]) / (L[i + 1] - L[i] || 1);
        pts.push(Math.round(a[0] + (b[0] - a[0]) * f) + ' ' + Math.round(a[1] + (b[1] - a[1]) * f)); }
    SHAPES[k] = pts.join(',');
}
const wave = name => css.match(new RegExp('--x-' + name + ':(url\\("[^"]*"\\))'))[1];

const block = `// <gen:tokens> from shell-dev/ref/design-v2 by shell-dev/gen-tokens.js; regenerate, don't edit.
const ROLES = '${ROLES.map(kebab).join(' ')}'.split(' ');
const ST = '${ST.map(kebab).join(' ')}'.split(' ');
const SCHEMES = { // ROLES, ST, then ink fill on-fill track
${Object.entries(SCHEMES).map(([k, v]) => `    '${k}': '${v}'`).join(',\n')}
};
const SHAPES = { // x y in %, ${N} points each
${Object.entries(SHAPES).map(([k, v]) => `    '${k}': '${v}'`).join(',\n')}
};
const WAVE = ${JSON.stringify(wave('wave-4'))};
// </gen:tokens>`;
const src = fs.readFileSync(FILE, 'utf8'), re = /\/\/ <gen:tokens>[\s\S]*?\/\/ <\/gen:tokens>/;
if (!re.test(src)) throw new Error('ATCShell.js has no <gen:tokens> block');
fs.writeFileSync(FILE, src.replace(re, () => block));
console.log(`✓ ${Object.keys(SCHEMES).length} schemes, ${USED.length} shapes, ${block.length} bytes`);
