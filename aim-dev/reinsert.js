// Re-inserts aim-dev/ into AttendanceTimeCheckerPlus.js: the engine (aim-core.js + aim-ui.js) and
// the theme (aim-theme.css, inside the modernStyles template literal). Same contract as snake-dev/
// and pool-dev/: sentinel comments, refuses to guess, never a partial splice.
//
//   node aim-dev/reinsert.js           # splice
//   node aim-dev/reinsert.js --check   # exit 1 if either copy differs
const fs = require('fs');
const path = require('path');
const { FILES } = require('./load');

const TARGET = path.join(__dirname, '..', 'AttendanceTimeCheckerPlus.js');
const BLOCKS = [
    { name: 'engine', files: FILES, open: '    // ═══ AIMLAB ENGINE — generated from aim-dev/, do not edit here ═══', close: '    // ═══ END AIMLAB ENGINE ═══' },
    { name: 'theme CSS', files: ['aim-theme.css'], open: '            /* ═══ AIMLAB THEME — generated from aim-dev/aim-theme.css, do not edit here ═══ */', close: '            /* ═══ END AIMLAB THEME ═══ */', css: true }
];
const trim = s => s.replace(/\r\n/g, '\n').replace(/\n+$/, '');

function devBlock(b, eol) {
    const s = b.files.map(f => trim(fs.readFileSync(path.join(__dirname, f), 'utf8'))).join('\n\n');
    if (b.css && (s.includes('`') || s.includes('${'))) throw new Error('aim-theme.css has a backtick or "${", which would break the template literal');
    return s.replace(/\n/g, eol);
}
function locate(src, b) {
    const o = src.indexOf(b.open), c = src.indexOf(b.close);
    if (o === -1 || c === -1) throw new Error(b.name + ': sentinels not found');
    if (src.indexOf(b.open, o + 1) !== -1 || src.indexOf(b.close, c + 1) !== -1) throw new Error(b.name + ': sentinels appear more than once');
    if (c < o) throw new Error(b.name + ': closing sentinel precedes the opening one');
    return { start: src.indexOf('\n', o) + 1, end: c };
}

if (require.main === module) {
    const check = process.argv.includes('--check');
    let src = fs.readFileSync(TARGET, 'utf8');
    const eol = src.includes('\r\n') ? '\r\n' : '\n';
    let bad = 0;
    try {
        for (const b of BLOCKS) {
            const at = locate(src, b), old = src.slice(at.start, at.end), next = devBlock(b, eol);
            if (trim(old) === trim(next)) { console.log('· ' + b.name + ' up to date'); continue; }
            if (check) { console.error('✗ ' + b.name + ' differs from aim-dev/'); bad++; continue; }
            src = src.slice(0, at.start) + next + eol + src.slice(at.end);
            console.log('✓ ' + b.name + ' replaced');
        }
    } catch (e) { console.error('✗ ' + e.message); process.exit(1); }
    if (check) process.exit(bad ? 1 : 0);
    fs.writeFileSync(TARGET, src, 'utf8');
}
module.exports = { BLOCKS, devBlock, locate, TARGET, trim };
