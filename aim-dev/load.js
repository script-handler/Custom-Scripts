// Evaluates aim-core.js + aim-ui.js as one unit against stub host helpers and hands back the
// internals. Both files are indented blocks of the userscript's IIFE body (no exports of their
// own), so wrapping them in a Function makes the same source drop-in-able and testable.
const fs = require('fs');
const path = require('path');

const FILES = ['aim-core.js', 'aim-ui.js'];
const source = () => FILES.map(f => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('\n\n');

function stubEnvironment(store) {
    global.localStorage = {
        _s: store || {},
        getItem(k) { return Object.prototype.hasOwnProperty.call(this._s, k) ? this._s[k] : null; },
        setItem(k, v) { this._s[k] = String(v); },
        removeItem(k) { delete this._s[k]; }
    };
    if (typeof global.performance !== 'object') global.performance = { now: () => Date.now() };
}

// The host helpers AimLab calls, as the userscript defines them (lsJSON, lsInt, the RefleX store).
const HOST = `
    function lsJSON(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (_) { return fallback; } }
    function lsInt(key, fallback = 0) { const n = parseInt(localStorage.getItem(key), 10); return Number.isFinite(n) ? n : fallback; }
    const saveAimHighScore = n => localStorage.setItem('aimChaosHighScore', String(n));
    function _m(r) { const b = r && typeof r.best === 'number' && r.best > 0 ? r.best : Infinity, a = r && typeof r.avg === 'number' && r.avg > 0 ? r.avg : Infinity; return { best: b, avg: a }; }
    function loadReflexHighScores() { const raw = lsJSON('reflexHighScores', null) || {}; return { screen: _m(raw.screen), target: _m(raw.target) }; }
    function saveReflexHighScores(s) { localStorage.setItem('reflexHighScores', JSON.stringify(s)); }
    const userXP = { totalXP: 0 };
    const __xp = [];
    function awardGameXP(type, perf) { __xp.push({ type, perf }); userXP.totalXP += 10; }
`;

module.exports = function load(opts) {
    opts = opts || {};
    stubEnvironment(opts.store);
    return new Function(HOST + source() + `
        return { AIM_SCEN, AIM_ORDER, AIM_DIFF, AIM_STAGES, AIM_MEDALS, aimMedal, aimNextMedal, aimLegacy, aimStart, aimBreakdown, aimStars, aimSkillNext, aimCamp, aimStarSum, aimStageGoal, aimStageCrit, AIM_GAP_PX, AIM_EDGE_PX, AIM_CLEAR_PX, AIM_GAP_DEG, AIM_CLEAR_DEG, AIM_FS_LIMIT, AIM_SOON_MS, AIM_NEXT_MS,
            aimDist, aimAngle, aimMult, aimRanked, aimBestKey, aimSpace2d, aimSpace3d, aimRadius, aimSpawnAt,
            aimNewRun, aimAddTarget, aimFill, aimShoot, aimTick, aimSummary, aimHitAt, aimRescale, aimLiveAcc,
            aimReactNew, aimReactArm, aimReactNext, aimReactTick, aimReactPainted, aimReactClick, aimReactSummary,
            aimLoad, aimSave, aimBestOf, aimXhCode, aimXhParse, AIM_XH_DEFAULT,
            initAimLab, aimDetach, aimToggleMax, aimReactLbMode, aimOnThemeChange, xp: __xp };
    `)();
};
module.exports.source = source;
module.exports.FILES = FILES;
