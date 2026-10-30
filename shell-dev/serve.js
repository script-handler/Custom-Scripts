// Local test server for the live portal: serves the widget WITH the bridge (applied in memory, the file on disk is
// untouched) and the local ATCShell.js, both read fresh on every request, so an edit shows on the next reload.
// Nothing is pushed; only a browser whose loader opts in (localStorage.atcDev, see README) runs these copies.
//
//   "C:/Program Files/nodejs/node.exe" shell-dev/serve.js [port]
const http = require('http'), fs = require('fs'), path = require('path');
const { bridge } = require('./bridge');
const ROOT = path.join(__dirname, '..'), PORT = +process.argv[2] || 8737, ORIGIN = 'http://localhost:' + PORT;
const GH_SHELL = "'https://raw.githubusercontent.com/script-handler/Custom-Scripts/refs/heads/main/ATCShell.js?v=' + BUILD_LABEL";

function widget() {
    const src = bridge(fs.readFileSync(path.join(ROOT, 'AttendanceTimeCheckerPlus.js'), 'utf8'));
    if (src.split(GH_SHELL).length !== 2) throw new Error('shell URL not found in the bridged widget');
    return src.replace(GH_SHELL, () => `'${ORIGIN}/ATCShell.js?v=' + Date.now()`);
}

http.createServer((req, res) => {
    // CORS + Chrome's private-network preflight: an https page fetching localhost.
    const head = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Private-Network': 'true', 'Access-Control-Allow-Headers': '*', 'Cache-Control': 'no-store' };
    if (req.method === 'OPTIONS') { res.writeHead(204, head); return res.end(); }
    const p = req.url.split('?')[0];
    try {
        const body = p === '/AttendanceTimeCheckerPlus.js' ? widget() : p === '/ATCShell.js' ? fs.readFileSync(path.join(ROOT, 'ATCShell.js'), 'utf8') : null;
        if (body == null) { res.writeHead(404, head); return res.end('not found'); }
        res.writeHead(200, { ...head, 'Content-Type': 'text/javascript; charset=utf-8' }); res.end(body);
        console.log(new Date().toLocaleTimeString(), 'served', p);
    } catch (e) { res.writeHead(500, head); res.end(String(e)); console.error(e.message); }
}).listen(PORT, '127.0.0.1', () => console.log(`ATC dev server on ${ORIGIN}  (Ctrl+C to stop)`));
