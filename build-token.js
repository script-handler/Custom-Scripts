// Prints the sync build token (BUILD_TOKEN_CURRENT) for the userscript's seed and dispatcher PAT.
// Usage: node build-token.js [new-hex-seed]   (no argument = the BUILD_SEED in the userscript)
//        node build-token.js --pat            (the raw dispatcher PAT, for the admin page's login)
// Must mirror _buildToken() in AttendanceTimeCheckerPlus.js and the one-liner in sync.yml.
const fs = require('fs'), path = require('path');

const src = fs.readFileSync(path.join(__dirname, 'AttendanceTimeCheckerPlus.js'), 'utf8');
const PAT = String.fromCharCode(...src.match(/GH_DISPATCHER_PAT = String\.fromCharCode\(([\d,\s]+)\)/)[1].split(',').map(Number));
if (process.argv[2] === '--pat') { console.log(PAT); process.exit(0); }
const SEED = process.argv[2] || src.match(/const BUILD_SEED\s*=\s*'([0-9a-f]+)'/)[1];
const SALT = 'bld_tkn_2026_v1';

const msg = `${SEED}|${PAT}|${SALT}`;
let h1 = 0x811c9dc5, h2 = 0xcbf29ce4;
for (let i = 0; i < msg.length; i++) {
    const c = msg.charCodeAt(i);
    h1 ^= c;                 h1 = Math.imul(h1, 0x01000193);
    h2 ^= (c ^ (h1 & 0xff)); h2 = Math.imul(h2, 0x100000001b3 & 0xffffffff);
}
h1 = ((h1 >>> 13) | (h1 << 19)) >>> 0;
h2 = ((h2 >>> 17) | (h2 << 15)) >>> 0;

console.log(`seed  ${SEED}`);
console.log(`token ${h1.toString(36)}-${h2.toString(36)}`);
