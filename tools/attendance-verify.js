// The attendance day and what keys on it: the real functions, lifted out of the userscript and
// the sync bot, run against a clock this file sets.
//
//   node tools/attendance-verify.js
//
//   1  the attendance day: Pakistan's date, the day before until 5 AM
//   2  a day shift: paid hour by hour, its shift credited once, the milestones once
//   3  a shift past midnight: nothing paid or credited again after 12 (the old double count)
//   4  a night shift: credited to the day it began, at 2 AM
//   5  a worked Saturday earns its shift; weekends neither grow nor break the streak
//   6  a missed Monday resets the streak only: work days and the longest streak stay
//   7  a clock set back, or forward and back, pays, credits and streaks nothing twice; a day key
//      left in the future blocks nothing
//   8  the upgrade: the old one-day fields seed today only where they can be today's
//   9  the 5 AM edge: the hours count for the day they were read on
//  10  the sync bot: work days grow by no more than the days since its anchor (+1), however
//      often a client syncs
const fs = require('fs'), path = require('path'), vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'AttendanceTimeCheckerPlus.js'), 'utf8').split('\r\n').join('\n');
const BOT = fs.readFileSync(path.join(ROOT, 'github-actions-bot', '.github', 'workflows', 'sync.yml'), 'utf8').split('\r\n').join('\n');

let pass = 0, fail = 0;
const ok = (name, cond, detail) => { if (cond) pass++; else fail++; console.log((cond ? '  ✓ ' : '  ✗ ') + name + (detail !== undefined && !cond ? ' — ' + detail : '')); };
const head = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(4, 60 - t.length)));

// A top-level declaration in src at the given indent: a function to its closing brace, a const
// object or array literal to its closing "};" / "];", else the declaration's line.
function lift(src, name, indent) {
    const pad = ' '.repeat(indent);
    const at = [pad + 'function ' + name + '(', pad + 'const ' + name + ' =', pad + 'const ' + name + ',', pad + 'let ' + name + ' ='].map(k => src.indexOf(k)).filter(i => i >= 0)[0];
    if (at === undefined) throw new Error('not found: ' + name);
    const first = src.slice(at, src.indexOf('\n', at));
    const open = /^\s*function /.test(first) ? '{' : first.trimEnd().slice(-1);
    if (open === '{' || open === '[') {
        const end = src.indexOf('\n' + pad + (open === '[' ? ']' : '}'), at);
        return src.slice(at, src.indexOf('\n', end + 1));
    }
    return first;
}

// ── The client, on a clock we set ─────────────────────────────────
// Instants are given in Pakistan time (UTC+5); the test machine's own zone does not matter,
// as attendanceNow() reads the time in Asia/Karachi.
let NOW = 0;
const pkt = (y, mo, d, h, mi) => Date.UTC(y, mo - 1, d, h - 5, mi || 0);
class FakeDate extends Date {
    constructor(...a) { if (a.length) super(...a); else super(NOW); }
    static now() { return NOW; }
}
const client = () => {
    const store = new Map(), notes = [];
    const ctx = {
        Date: FakeDate, Math, JSON, Number, Object, Array, String, isFinite, parseInt,
        localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
        xpSystemReady: true, notes,
        userXP: { level: 1, currentXP: 0, totalXP: 0, lastHourTracked: -1, todayHours: 0, consecutiveDays: 0, totalWorkDays: 0, gameSessions: 0,
            lastAttendanceDate: null, lastShiftCompletedDate: null, lastStreakBonusDate: null, hadStreakReset: false, longestStreak: 0, achievements: [], milestonesReached: [],
            dayLog: null, todayKey: null },
        store,
        userPreferences: { shiftDuration: '8h' },
    };
    const parts = [
        ['XP_PER_HOUR', 4], ['STREAK_BONUS', 4], ['STREAK_BONUS_MAX_DAYS', 4], ['STREAK_MIN_HOURS', 4], ['MILESTONE_BONUSES', 4],
        ['ATTENDANCE_TZ', 4], ['attendanceNow', 4], ['attendanceDay', 4], ['DAY_LOG_KEEP', 4], ['dayEntry', 4], ['seedDayLog', 4],
        ['SHIFT_DURATIONS', 4], ['getShiftSeconds', 4],
        ['awardXP', 4], ['calculateStreak', 4], ['raiseLongestStreak', 4], ['checkMilestones', 4], ['checkAchievements', 4], ['unlockWhen', 4],
    ].map(([n, i]) => lift(SRC, n, i));
    const stubs = `
        function showXPNotification(text) { notes.push(text); }
        function checkLevelUp() {}
        function saveUserXP() {}
        function updateXPDisplay() {}
        function unlockAchievement(id) { if (!userXP.achievements.includes(id)) userXP.achievements.push(id); }
        this.awardXP = awardXP; this.attendanceDay = attendanceDay; this.checkAchievements = checkAchievements;`;
    vm.createContext(ctx);
    vm.runInContext(parts.join('\n') + stubs, ctx);
    return ctx;
};
// The portal's view at a moment: hours on today's rows (the widget's totalWorkedTime / 3600).
const at = (C, y, mo, d, h, mi, hours) => { NOW = pkt(y, mo, d, h, mi); C.awardXP(hours); return C.userXP; };

head('1  The attendance day');
{
    const C = client(), key = (y, mo, d, h, mi) => { NOW = pkt(y, mo, d, h, mi); return C.attendanceDay().toDateString(); };
    ok('2:30 PM Tuesday is Tuesday', key(2026, 10, 13, 14, 30) === 'Tue Oct 13 2026');
    ok('11:59 PM Tuesday is Tuesday', key(2026, 10, 13, 23, 59) === 'Tue Oct 13 2026');
    ok('12:30 AM Wednesday is still Tuesday', key(2026, 10, 14, 0, 30) === 'Tue Oct 13 2026');
    ok('4:59 AM Wednesday is still Tuesday', key(2026, 10, 14, 4, 59) === 'Tue Oct 13 2026');
    ok('5:00 AM Wednesday is Wednesday', key(2026, 10, 14, 5, 0) === 'Wed Oct 14 2026');
}

head('2  A day shift');
{
    const C = client();
    for (let h = 1; h <= 8; h++) at(C, 2026, 10, 12, 9 + h, 0, h);
    const x = C.userXP;
    ok('8 hours paid once each, the 2-hour and 4/6/8 milestones once, and the shift credited once',
       x.totalWorkDays === 1 && x.lastShiftCompletedDate === 'Mon Oct 12 2026' && x.todayHours === 8, JSON.stringify({ wd: x.totalWorkDays, h: x.todayHours }));
    const xp = x.totalXP;
    at(C, 2026, 10, 12, 18, 30, 8.4);
    ok('a later look the same evening changes nothing', x.totalXP === xp && x.totalWorkDays === 1);
}

head('3  A shift past midnight (the old double count)');
{
    const C = client();
    for (let h = 1; h <= 8; h++) at(C, 2026, 10, 13, 15 + h, 0, h);       // Tue 3 PM in, 8 h at 11 PM
    const x = C.userXP, xp = x.totalXP, notes = C.notes.length;
    ok('8 hours by 11 PM Tuesday: credited, for Tuesday', x.totalWorkDays === 1 && x.lastShiftCompletedDate === 'Tue Oct 13 2026');
    at(C, 2026, 10, 14, 0, 30, 9.5);                                         // 12:30 AM, still on Tuesday's rows
    ok('at 12:30 AM: one more hour paid (the 9th), not the whole day again', x.totalXP - xp === 15, '+' + (x.totalXP - xp) + ' XP');
    ok('…no second shift credited, no milestone repaid', x.totalWorkDays === 1 && !C.notes.slice(notes).some(n => /Bonus XP/.test(n) && !/Streak/.test(n)), C.notes.slice(notes).join(' | '));
    at(C, 2026, 10, 14, 4, 50, 13.8);
    ok('…nor at 4:50 AM', x.totalWorkDays === 1 && x.lastShiftCompletedDate === 'Tue Oct 13 2026');
}

head('4  A night shift');
{
    const C = client();
    at(C, 2026, 10, 14, 19, 0, 1);                                            // Wed 6 PM in
    at(C, 2026, 10, 14, 23, 0, 5);
    at(C, 2026, 10, 15, 2, 0, 8);                                             // 2 AM Thursday: 8 h
    const x = C.userXP;
    ok('8 hours at 2 AM: one shift, credited to Wednesday', x.totalWorkDays === 1 && x.lastShiftCompletedDate === 'Wed Oct 14 2026');
    ok('…and the streak day is Wednesday', x.lastAttendanceDate === 'Wed Oct 14 2026');
    at(C, 2026, 10, 15, 19, 0, 1); at(C, 2026, 10, 16, 2, 0, 8);              // Thursday night
    ok('the next night is Thursday\'s: a second shift, a 2-day streak', x.totalWorkDays === 2 && x.lastShiftCompletedDate === 'Thu Oct 15 2026' && x.consecutiveDays === 2);
}

head('5  Saturdays');
{
    const C = client();
    at(C, 2026, 10, 9, 18, 0, 8);                                             // Friday: a shift, streak 1
    at(C, 2026, 10, 10, 18, 0, 8);                                            // a worked Saturday
    const x = C.userXP;
    ok('a worked Saturday earns its shift', x.totalWorkDays === 2 && x.lastShiftCompletedDate === 'Sat Oct 10 2026');
    ok('…and leaves the streak where Friday put it', x.consecutiveDays === 1 && x.lastAttendanceDate === 'Fri Oct 09 2026');
    at(C, 2026, 10, 12, 18, 0, 8);                                            // Monday
    ok('an off Sunday breaks nothing: Monday follows Friday', x.consecutiveDays === 2 && x.totalWorkDays === 3);
}

head('6  A missed Monday');
{
    const C = client();
    [12, 13, 14, 15, 16].forEach(d => at(C, 2026, 10, d, 18, 0, 8));         // Mon–Fri
    const x = C.userXP;
    ok('five days: a 5-day streak, five shifts', x.consecutiveDays === 5 && x.totalWorkDays === 5);
    at(C, 2026, 10, 20, 18, 0, 8);                                            // back on Tuesday
    ok('Tuesday after a missed Monday: the streak starts again at 1', x.consecutiveDays === 1 && x.hadStreakReset === true);
    ok('…work days keep counting and the longest streak stays', x.totalWorkDays === 6 && x.longestStreak === 5);
}

head('7  A clock set back');
{
    const C = client();
    at(C, 2026, 10, 13, 18, 0, 8);
    at(C, 2026, 10, 14, 18, 0, 8);                                            // Tue, Wed: streak 2
    // What counts: XP, credits and the streak. (The one-day display fields follow the clock's day.)
    const x = C.userXP, held = () => JSON.stringify([x.totalXP, x.totalWorkDays, x.consecutiveDays, x.longestStreak, x.lastAttendanceDate, x.achievements]);
    const snap = held();
    at(C, 2026, 10, 13, 18, 0, 8);                                            // the clock back to Tuesday
    ok('back to Tuesday: no XP, no shift, no streak', held() === snap, held());
    // Monday was never seen: its rows are real work, paid once — and its streak gap (negative)
    // no longer counts as consecutive.
    at(C, 2026, 10, 12, 18, 0, 8);
    ok('back to an unseen Monday: its hours and shift paid once, the streak untouched', x.totalWorkDays === 3 && x.consecutiveDays === 2 && x.lastAttendanceDate === 'Wed Oct 14 2026');
    const mon = held();
    at(C, 2026, 10, 12, 18, 30, 8.5);
    ok('…and only once', held() === mon);
}
{
    const C = client(), x = C.userXP;
    at(C, 2026, 10, 13, 15, 0, 5);                                            // Tuesday 3 PM: 5 h paid
    const xp = x.totalXP;
    at(C, 2026, 10, 14, 15, 0, 0);                                            // a tick on Wednesday (no rows: 0 h)
    at(C, 2026, 10, 13, 15, 5, 5);                                            // back to Tuesday
    ok('forward a day and back: Tuesday\'s 5 hours and 4-hour milestone are not paid again', x.totalXP === xp, '+' + (x.totalXP - xp) + ' XP');
    at(C, 2027, 1, 5, 15, 0, 0);                                              // a clock a year ahead, once
    at(C, 2026, 10, 14, 15, 0, 6);                                            // the real Wednesday
    ok('a day key left in the future blocks nothing: Wednesday is paid and the next day credited',
       x.totalXP > xp && (at(C, 2026, 10, 15, 18, 0, 8), x.totalWorkDays === 1 && x.lastShiftCompletedDate === 'Thu Oct 15 2026'));
}

head('8  The upgrade');
{
    // The old code's fields, as it left them, and the new code's first look.
    const old = (C, f, xpLastDay) => { Object.assign(C.userXP, f); if (xpLastDay) C.store.set('xpLastDay', xpLastDay); };
    let C = client();
    old(C, { lastHourTracked: 5, todayHours: 5, milestonesReached: [2, 4] }, 'Tue Oct 13 2026');
    let xp = C.userXP.totalXP;
    at(C, 2026, 10, 13, 15, 0, 5.5);
    ok('mid-day: the hours and milestones already paid stay paid', C.userXP.totalXP === xp && !C.store.has('xpLastDay'));
    // The review's case: the old build paid Tuesday's 9 h across midnight under a Wednesday key and
    // credited the shift to Wednesday; the new one arrives on Wednesday afternoon.
    C = client();
    old(C, { lastHourTracked: 9, todayHours: 9, milestonesReached: [2, 4, 6, 8], lastShiftCompletedDate: 'Wed Oct 14 2026', totalWorkDays: 7 }, 'Wed Oct 14 2026');
    xp = C.userXP.totalXP;
    at(C, 2026, 10, 14, 14, 0, 5);
    ok('a Wednesday key on hours Wednesday\'s rows cannot hold (9 > 5): Wednesday is paid from 0', C.userXP.totalXP - xp === 5 * 15 + 10 + 25, '+' + (C.userXP.totalXP - xp));
    at(C, 2026, 10, 14, 18, 0, 8);
    ok('…and its own shift is credited', C.userXP.totalWorkDays === 8 && C.userXP.lastShiftCompletedDate === 'Wed Oct 14 2026');
    // The same, arriving at 1 AM: the Wednesday key is tomorrow's, so it is Tuesday's own.
    C = client();
    old(C, { lastHourTracked: 9, todayHours: 9, milestonesReached: [2, 4, 6, 8], lastShiftCompletedDate: 'Wed Oct 14 2026', totalWorkDays: 7 }, 'Wed Oct 14 2026');
    xp = C.userXP.totalXP;
    at(C, 2026, 10, 14, 1, 0, 9.4);
    ok('arriving at 1 AM on Tuesday\'s shift: nothing repaid, nothing credited again', C.userXP.totalXP === xp && C.userXP.totalWorkDays === 7);
}

head('9  The 5 AM edge');
{
    const C = client(), x = C.userXP;
    for (let h = 1; h <= 13; h++) at(C, 2026, 10, 13, 16 + h > 23 ? h - 8 : 16 + h, 0, h);   // Tue 4 PM → 5 AM
    const xp = x.totalXP, wd = x.totalWorkDays;
    NOW = pkt(2026, 10, 14, 4, 59); const tue = C.attendanceDay();                  // the rows read at 4:59…
    NOW = pkt(2026, 10, 14, 5, 0); C.awardXP(13, tue);                              // …paid at 5:00
    ok('hours read at 4:59 and paid at 5:00 count for Tuesday: nothing new for Wednesday', x.totalXP === xp && x.totalWorkDays === wd && x.todayKey === 'Tue Oct 13 2026');
    at(C, 2026, 10, 14, 9, 0, 3);
    ok('Wednesday\'s own first hours are paid', x.totalXP - xp >= 3 * 15 && x.todayKey === 'Wed Oct 14 2026');
}

// ── The sync bot ──────────────────────────────────────────────────
head('10  The sync bot');
{
    const names = ['MAX_XP_PER_DAY', 'MAX_XP_PER_GAME', 'MAX_XP_PER_ACHIEVEMENT', 'XP_BURST_ALLOWANCE', 'xpBudget', 'xpForNextLevel', 'deriveLevel', 'mergeModeBests', 'next_has', 'validatePlayer'];
    const warnings = [];
    const ctx = { Date, Math, JSON, Number, Object, Array, String, Set, Map, Infinity, isFinite, core: { warning: w => warnings.push(w), info: () => {} } };
    vm.createContext(ctx);
    vm.runInContext(names.map(n => lift(BOT, n, 12)).join('\n') + '\nthis.validatePlayer = validatePlayer;', ctx);
    const day = 864e5, iso = ms => new Date(ms).toISOString();
    const prev = (wd, daysAgo) => ({ clientId: 'c1', displayName: 'T', totalXP: 1000, totalWorkDays: wd, gameSessions: 5, longestStreak: 3, achievements: [], serverSync: iso(Date.now() - daysAgo * day) });
    const sync = (p, next) => ctx.validatePlayer(Object.assign({}, p, next), p, new Date().toISOString());
    let r = sync(prev(40, 3), { totalWorkDays: 44 });
    ok('3 days on: +4 passes (the days, plus one)', !r.flagged && r.totalWorkDays === 44);
    r = sync(prev(40, 0.2), { totalWorkDays: 42 });
    ok('hours later: +2 passes (an old client\'s midnight double)', !r.flagged && r.totalWorkDays === 42);
    r = sync(prev(40, 3), { totalWorkDays: 90 });
    ok('3 days on: +50 is flagged, and held at the cap', r.flagged === true && /^workdays: 90 vs max 44 \(40 \+ 3d\)$/.test(r.flagReason) && r.totalWorkDays === 44, JSON.stringify([r.flagReason, r.totalWorkDays]));
    // Syncing every few minutes: the anchor stays where it was set, so +2 a sync does not add up.
    let rec = prev(40, 0), got = [];
    for (let i = 0; i < 10; i++) { rec = sync(rec, { totalWorkDays: rec.totalWorkDays + 2 }); got.push(rec.totalWorkDays); }
    ok('ten syncs minutes apart, +2 each: held at 41 (the anchor\'s 40, plus one), and flagged', got[got.length - 1] === 41 && rec.flagged === true, got.join(','));
    r = sync(Object.assign(prev(40, 3), { flagged: true, flagReason: 'xp_budget: +50000', flaggedAt: 'then' }), { totalWorkDays: 90 });
    ok('an earlier flag keeps its reason', r.flagReason === 'xp_budget: +50000' && r.flaggedAt === 'then' && r.totalWorkDays === 44);
    r = sync(prev(40, 3), { totalWorkDays: 90, totalXP: undefined });
    ok('a sync without totalXP is capped all the same', r.totalWorkDays === 44 && r.flagged === true);
    r = sync(prev(40, 3), { totalWorkDays: 41, workDaysAnchor: { at: new Date(0).toISOString(), n: 0 } });
    ok('a client cannot bring its own anchor', r.workDaysAnchor.n === 40);
    r = sync(prev(40, 3), { totalWorkDays: 30 });
    ok('a count that goes back is restored, not flagged', !r.flagged && r.totalWorkDays === 40);
    r = ctx.validatePlayer({ clientId: 'c2', totalXP: 0, totalWorkDays: 64, gameSessions: 0, achievements: [] }, null, new Date().toISOString());
    ok('a first sync has nothing to compare: taken as sent', !r.flagged && r.totalWorkDays === 64);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
