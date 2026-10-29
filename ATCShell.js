// ATCShell.js: portal-wide companion to AttendanceTimeCheckerPlus.js, run by its loadShell() as new Function('ATC', code).
// Navbar time chip, Timeline cog strip, the portal theme (Timeline + Attendance follow displayTheme) and Material You.
// ATC is the widget's bridge: prefs() shift() fmt() att() onAtt(); this file adds tick(att) and apply().
'use strict';
const D = document, H = D.documentElement, P = () => ATC.prefs();
const style = (id, on, css) => { const s = D.getElementById(id); if (on && !s) D.head.insertAdjacentHTML('beforeend', `<style id="${id}">${css}</style>`); else if (!on && s) s.remove(); };
const put = (el, v) => { if (el && el.textContent !== v) el.textContent = v; };
const route = () => ATC.onAtt() ? 'att' : /^#\/home(\/Timeline)?$/i.test(location.hash.split('?')[0]) ? 'tl' : '';
const hms = s => s == null ? '—' : ATC.fmt(Math.max(0, Math.round(s))).replace(/^0(?=\d)/, '');
const hm = s => hms(s).replace(/:\d\d$/, '');

// TIME: today's Actual/Active from the Home dashboard API (the host's personal-info card). "H.MM" strings, a
// 1-digit minute ×10 like the host. Ticks on locally while checked in, never after check-out (the host's L419 bug does).
const SNAP = 'attSnap', AGE = 300000;
let snap = null, busy = false, due = 0;
try { snap = JSON.parse(sessionStorage.getItem(SNAP)); } catch (_) {}
const hmSec = s => { if (!s || s === '-') return null; const [h, m = '0'] = String(s).split('.'); return (+h * 60 + (m.length === 1 ? +m * 10 : +m)) * 60; };
function pull() {
    const tok = sessionStorage.getItem('authToken'); if (busy || !tok) return; busy = true;
    const d = new Date(), ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getDate();
    fetch('/api/Home/getDashboardPerformanceRecord', { method: 'POST', body: JSON.stringify({ from_date: ds, food_menu_date: ds }),
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok, currentUser: sessionStorage.getItem('authUser') || '' } })
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(j => { const a = (j._ActualActiveTime || [])[0] || {}, c = (j._Total_Checkin_Hours || [])[0] || {};
            snap = { act: hmSec(a.Actual_Time), actv: hmSec(a.Active_Time), live: !!c.checkin && c.checkin !== '-' && (!c.checkout || c.checkout === '-'), t: Date.now() };
            try { sessionStorage.setItem(SNAP, JSON.stringify(snap)); } catch (_) {} })
        .catch(e => console.warn('ATCShell: time fetch', e)).finally(() => { busy = false; });
}
// On Attendance the widget's own scrape is exact for Actual and the live state; Active is the API's either way.
function times() {
    const a = ATC.att(), onA = ATC.onAtt() && a.worked >= 0, live = onA ? a.live : !!(snap && snap.live);
    const el = live && snap ? (Date.now() - snap.t) / 1000 : 0, act = onA ? a.worked : snap && snap.act != null ? snap.act + el : null;
    const actv = snap && snap.actv != null ? Math.min(snap.actv + el, act == null ? Infinity : act) : null;
    return { act, actv, live, shift: ATC.shift() };
}

// GAUGE: a rim cog (turns while checked in) meshing a pinion; outer ring actual/shift, inner ring active/actual.
// Rotation is a transform on the outer <svg> (composited); rings move by custom properties, never layout.
const cog = (n, ro, ri) => { let p = ''; for (let i = 0; i < n * 4; i++) { const a = i / (n * 4) * 2 * Math.PI, r = i % 4 < 2 ? ro : ri; p += (i ? 'L' : 'M') + (50 + r * Math.cos(a)).toFixed(1) + ' ' + (50 + r * Math.sin(a)).toFixed(1); } return p + 'Z'; };
const COG = cog(28, 50, 45), PIN = cog(10, 50, 37);
const gauge = (cls = '') => `<div class="atc-g ${cls}" aria-hidden="true"><svg class="atc-g-pin" viewBox="0 0 100 100"><path d="${PIN}"/></svg><svg class="atc-g-cog" viewBox="0 0 100 100"><path d="${COG}"/></svg>`
    + `<svg class="atc-g-dial" viewBox="0 0 100 100"><circle class="f" cx="50" cy="50" r="44"/><circle class="t" cx="50" cy="50" r="38"/><circle class="a" cx="50" cy="50" r="38"/><circle class="t i" cx="50" cy="50" r="28"/><circle class="b" cx="50" cy="50" r="28"/></svg><span class="atc-g-c"><b></b><small></small></span></div>`;

const BASE_CSS = `
html{--gk-face:#fff;--gk-track:rgba(0,0,0,.08);--gk-cog:#c4c7c5;--gk-cog2:#9aa0a6;--gk-text:#1f1f1f;--gk-mute:#5f6368;--gk-acc:#6d5bd0;--gk-acc2:#1e8a5a;--gk-ok:#1e8a5a;--gk-pop:#fff;--gk-line:#e1e3e1}
html[data-atc-theme=business]{--gk-acc:#1e88e5;--gk-acc2:#2e7d32}
html[data-atc-theme=retro-futuristic]{--gk-acc:var(--rt-cyber-hl,#00b8d4);--gk-acc2:#d500f9;--gk-cog:#2a2f55;--gk-cog2:#11142b}
html[data-atc-theme=material]{--gk-acc:#0b57d0;--gk-acc2:#146c2e;--gk-face:#f0f4f9;--gk-pop:#f0f4f9}
html[data-att-skin]{--gk-face:var(--sk-raise);--gk-track:var(--sk-tint2);--gk-cog:var(--sk-line2);--gk-cog2:var(--sk-surf2);--gk-text:var(--sk-text);--gk-mute:var(--sk-mute);--gk-acc:var(--sk-acc);--gk-acc2:var(--sk-acc2);--gk-ok:var(--sk-acc2);--gk-pop:var(--sk-raise);--gk-line:var(--sk-line)}
.atc-g{--ga:0;--gb:0;--gs:40px;position:relative;width:var(--gs);height:var(--gs);flex:none}
.atc-g>svg{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible}
.atc-g .atc-g-cog{fill:var(--gk-cog);animation:atcSpin 40s linear infinite paused;will-change:transform}
.atc-g .atc-g-pin{left:74%;top:74%;width:44%;height:44%;fill:var(--gk-cog2);animation:atcSpin 14.29s linear infinite reverse paused;will-change:transform}
.atc-g.is-live :is(.atc-g-cog,.atc-g-pin){animation-play-state:running}
.atc-g-dial .f{fill:var(--gk-face)}.atc-g-dial .t{fill:none;stroke:var(--gk-track);stroke-width:7}.atc-g-dial .t.i{stroke-width:6}
.atc-g-dial :is(.a,.b){fill:none;stroke-linecap:round;transform:rotate(-90deg);transform-origin:50px 50px;transition:stroke-dashoffset .8s cubic-bezier(.2,0,0,1)}
.atc-g-dial .a{stroke:var(--gk-acc);stroke-width:7;stroke-dasharray:238.8;stroke-dashoffset:calc(238.8px*(1 - var(--ga)))}
.atc-g-dial .b{stroke:var(--gk-acc2);stroke-width:6;stroke-dasharray:176;stroke-dashoffset:calc(176px*(1 - var(--gb)))}
.atc-g.is-over .atc-g-dial .a{stroke:var(--gk-ok)}
.atc-g-c{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;color:var(--gk-text);font:700 calc(var(--gs)*.19)/1 Roboto,system-ui,sans-serif;font-variant-numeric:tabular-nums}
.atc-g-c small{font:500 calc(var(--gs)*.09)/1.3 Roboto,system-ui,sans-serif;color:var(--gk-mute)}
@keyframes atcSpin{to{transform:rotate(1turn)}}
@media (prefers-reduced-motion:reduce){.atc-g svg{animation:none!important}}
.atc-chip{position:relative;display:flex;align-items:center;margin:0 .35rem 0 .25rem}
.atc-chip-b{display:flex;align-items:center;gap:8px;height:34px;padding:0 12px 0 4px;border:0;border-radius:17px;background:var(--gk-face);color:var(--gk-text);box-shadow:inset 0 0 0 1px var(--gk-line);font:600 12px/1 Roboto,system-ui,sans-serif;font-variant-numeric:tabular-nums;cursor:pointer;white-space:nowrap}
.atc-chip-b:hover{box-shadow:inset 0 0 0 1px var(--gk-acc)}.atc-chip-b:focus-visible{outline:2px solid var(--gk-acc);outline-offset:2px}
.atc-chip .atc-g{--gs:26px;margin-right:6px}
.atc-pop{position:absolute;top:calc(100% + 8px);right:0;z-index:1050;min-width:230px;padding:14px 16px 12px;border-radius:16px;background:var(--gk-pop);color:var(--gk-text);box-shadow:0 4px 8px 3px rgba(0,0,0,.15),0 1px 3px rgba(0,0,0,.3);font:13px/1.4 Roboto,system-ui,sans-serif}
.atc-pop[hidden]{display:none}
.atc-pop-h{display:flex;align-items:center;gap:12px;margin-bottom:10px;font-weight:600}.atc-pop-h .atc-g{--gs:56px}.atc-pop-h .atc-g-c{display:flex}
.atc-pop dl{display:grid;grid-template-columns:auto 1fr;gap:4px 16px;margin:0 0 10px}.atc-pop dt{color:var(--gk-mute);font-weight:400}.atc-pop dd{margin:0;text-align:right;font-weight:600;font-variant-numeric:tabular-nums}
.atc-pop dt i{display:inline-block;width:8px;height:8px;margin-right:6px;border-radius:50%}
.atc-pop a{display:block;padding-top:8px;border-top:1px solid var(--gk-line);color:var(--gk-acc);font-weight:600;text-decoration:none}
.atc-hide{display:none!important}
.atc-strip{display:flex;align-items:center;gap:14px;margin-top:.5rem;font-size:12px;font-variant-numeric:tabular-nums}
.atc-strip .atc-g{--gs:34px;margin-right:8px}
.atc-strip>span{display:flex;flex-direction:column;line-height:1.25}
.atc-strip>span:is(:nth-child(2),:nth-child(3)) i::before{content:"";display:inline-block;width:7px;height:7px;margin-right:5px;border-radius:50%;background:var(--gk-acc)}.atc-strip>span:nth-child(3) i::before{background:var(--gk-acc2)}.atc-strip i{font-style:normal;color:var(--gk-mute);font-size:11px}.atc-strip b{color:var(--gk-text)}
.atc-dot-a{background:var(--gk-acc)}.atc-dot-b{background:var(--gk-acc2)}`;

// PORTAL THEME: Timeline and Attendance take the widget's Display Theme, light or dark with the browser
// (Cyberpunk is always dark); no setting of its own. Remaps EGP's own tokens (EnhancedStyle.css :root), then the
// surfaces those miss. data-att-skin is set on those two routes only, so untested pages are never half-themed. No :has().
const SK = { // [light, dark]: bg, bg2, surf, surf2, raise, line, line2, text, mute, acc, acc2, ink, rad
    glassmorphic: [['#ebe8f5', '#f6f4fc', '#ffffff', '#ece8fa', '#ffffff', 'rgba(109,91,208,.14)', '#d9d5e8', '#1e1b2e', '#5b5670', '#6d5bd0', '#1e8a5a', '#5a47bf', '22px'],
        ['#121018', '#17141f', '#1f1c29', '#2a2638', '#2a2638', 'rgba(255,255,255,.09)', '#4a4560', '#eeeaf6', '#a8a2b8', '#a593ff', '#5fd3a1', '#c4b8ff', '22px']],
    'retro-futuristic': [null, ['var(--rt-bg-1,#07091a)', 'var(--rt-bg-1,#07091a)', 'var(--rt-bg-2,#11142b)', '#1a1f3d', '#1a1f3d', 'rgba(0,229,255,.22)', '#2a2f55', '#e6f7ff', '#8fa3c0', 'var(--rt-cyber-hl,#00e5ff)', '#ff2bd6', 'var(--rt-accent,#fff200)', '4px']],
    business: [['#eef2f6', '#ffffff', '#f5f8fc', '#e3f2fd', '#ffffff', '#e3e8ef', '#cfd8e3', '#2b2b2b', '#6b7280', '#1e88e5', '#2e7d32', '#1565c0', '10px'],
        ['#0e1318', '#121920', '#18202a', '#212b38', '#212b38', 'rgba(255,255,255,.08)', '#3a4656', '#e6edf5', '#9aa7b6', '#64b5f6', '#81c995', '#90caf9', '10px']],
    material: [['#e9eef6', '#f8fafd', '#ffffff', '#e9eef6', '#ffffff', '#e1e3e1', '#c4c7c5', '#1f1f1f', '#444746', '#0b57d0', '#146c2e', '#0b57d0', '24px'],
        ['#0e0e0f', '#131314', '#1e1f20', '#282a2c', '#282a2c', '#444746', '#5f6368', '#e3e3e3', '#c4c7c5', '#a8c7fa', '#6dd58c', '#a8c7fa', '24px']]
};
const SKV = ['bg', 'bg2', 'surf', 'surf2', 'raise', 'line', 'line2', 'text', 'mute', 'acc', 'acc2', 'ink', 'rad'];
const R = 'html[data-att-skin]', RD = 'html[data-att-skin=dark]', NW = ':not(#total-time-summary *)';
const SKIN_CSS = Object.keys(SK).map(k => SK[k].map((p, d) => p && `html[data-att-skin=${d ? 'dark' : 'light'}][data-atc-theme=${k}]{${p.map((v, i) => `--sk-${SKV[i]}:${v}`).join(';')}}`).join('\n')).join('\n') + `
${R}{--sk-acc-t:color-mix(in srgb,var(--sk-acc) 16%,transparent);--sk-tint:color-mix(in srgb,var(--sk-text) 4%,transparent);--sk-tint2:color-mix(in srgb,var(--sk-text) 9%,transparent);--theme-color:var(--sk-acc)!important;--primary-color:var(--sk-ink);--bg-grey:var(--sk-surf);--secondary:var(--sk-acc);--color-light_blue:var(--sk-surf2);--color-sky_blue:var(--sk-acc-t);--text-primary:var(--sk-ink);--text-grey:var(--sk-mute);--text-light:var(--sk-text);--light:var(--sk-surf);--dark:var(--sk-text);scrollbar-color:var(--sk-line2) var(--sk-bg)}
${RD}{--bgWhiteSmoke:var(--sk-surf2);--bgCyanBlue:var(--sk-surf2);--bgBluishCyan:var(--sk-surf2);--bgCyan:var(--sk-surf2);--bgBluishCyanDark:var(--sk-surf2);--bgDarkGrey:var(--sk-line2);--bgYellowGreen:#22331d;--dangerRed:#3a1d21;--bgteapink:#3a1d21;--bgOrangyRose:#3a241e;--bgYellowOrange:#382c1a;--bg-yellowish:#382c1a;--text-cyanblue:var(--sk-ink);color-scheme:dark}
${R} body,${R} #global-portal{background:var(--sk-bg)!important;color:var(--sk-text)}
${R} :is(.body_content .inside-section,.attendance-details-wrapper,.tab-content-inner-admin,#attendence-record-tab>.attendence-inner){background:var(--sk-bg2)!important;border-color:var(--sk-line)!important;box-shadow:none!important;border-radius:calc(var(--sk-rad) + 6px)}
${R} .box-widget{border-radius:var(--sk-rad);box-shadow:inset 0 0 0 1px var(--sk-line)}
${R} :is(.text-black,.text-dark,.text-body)${NW}{color:var(--sk-text)!important}
${R} :is(.bg-white,.t-heading)${NW}{background-color:var(--sk-raise)!important}${R} .bg-light${NW}{background-color:var(--sk-surf)!important}
${R} nav.gp-main-navbar{background:var(--sk-surf)!important;box-shadow:0 1px 0 var(--sk-line)}
${R} .gp-main-navbar :is(.navbar-brand,.nav-link){color:var(--sk-text)!important}
${R} .header-icons :is(.bg-icon,.bg-iconWider,.bg-iconEmp) .icon-link,${R} .header-icons .fa-calendar{background-color:var(--sk-surf2)!important;color:var(--sk-ink)!important;border-radius:calc(var(--sk-rad)/2.5)}
${R} :is(.popover,.dropdown-menu,.modal-content,.toast){background-color:var(--sk-raise)!important;color:var(--sk-text)!important;border-color:var(--sk-line)!important;border-radius:calc(var(--sk-rad)*.75)}
${R} :is(.popover-title,.popover-header,.modal-header,.modal-footer){background:transparent!important;color:var(--sk-text)!important;border-color:var(--sk-line)!important}
${R} .popover.bottom>.arrow::after{border-bottom-color:var(--sk-raise)!important}${R} .popover.top>.arrow::after{border-top-color:var(--sk-raise)!important}
${R} .popover.left>.arrow::after{border-left-color:var(--sk-raise)!important}${R} .popover.right>.arrow::after{border-right-color:var(--sk-raise)!important}
${R} :is(.dropdown-item,.close,.btn-close){color:var(--sk-text)!important;text-shadow:none}${R} .dropdown-item:hover{background:var(--sk-acc-t)!important}
${R} .box-widget :is(button.nav-link,span.selected,.highlighted-content,.box-widget-title-new.active){background:var(--sk-acc-t)!important;color:var(--sk-text)!important;border-radius:calc(var(--sk-rad)/2.5)}
${R} :is(#calendar,.fc){background:transparent!important}${R} .fc :is(td,th,.fc-widget-content,.fc-widget-header){border-color:var(--sk-line)!important}
${R} .fc-disabled-day{background:var(--sk-tint)!important}${R} .fc-button{background:var(--sk-surf2)!important;color:var(--sk-text)!important;border-color:var(--sk-line)!important;text-shadow:none!important;box-shadow:none!important}
${R} circle.progress{stroke:var(--sk-line2)!important}${R} .circular-progress text{fill:var(--sk-text)!important}
${R} #global-portal .side-nav-tab{background:var(--sk-surf)!important;border-color:var(--sk-line)!important;border-radius:calc(var(--sk-rad)/2)}${R} #global-portal .side-nav-tab a{color:var(--sk-text)!important}
${R} .attendence-outer .attendence-box{background:var(--sk-surf)!important;color:var(--sk-mute)!important;border-radius:var(--sk-rad);box-shadow:inset 0 0 0 1px var(--sk-line)}${R} .attendence-outer .attendence-box strong{color:var(--sk-text)}
${R} .emp-list-table .table-theme th{background:var(--sk-surf2)!important;color:var(--sk-text)!important;border-right-color:var(--sk-line)!important}
${R} .table${NW}{--bs-table-bg:transparent;--bs-table-accent-bg:transparent;--bs-table-striped-bg:var(--sk-tint);--bs-table-striped-color:var(--sk-text);--bs-table-hover-bg:var(--sk-tint2);--bs-table-hover-color:var(--sk-text);color:var(--sk-text);border-color:var(--sk-line)}
${R} .table${NW}>:not(caption)>*>*{border-bottom-color:var(--sk-line)!important}
${R} #global-portal .table-theme td{color:var(--sk-text)}
${RD} :is(.bg-success,.bg-success>td)${NW}{background-color:rgba(46,160,67,.2)!important;color:#9be9a8!important}${RD} :is(.bg-danger,.bg-danger>td)${NW}{background-color:rgba(248,81,73,.2)!important;color:#ffa198!important}
${R} :where(#global-portal) :is(.form-control,.form-select,select,textarea,input:not([type=checkbox],[type=radio],[type=color],[type=range]),.custom-search-input)${NW}{background-color:var(--sk-raise)!important;color:var(--sk-text)!important;border-color:var(--sk-line2)!important}
${R} :where(#global-portal) :is(.page-link,.btn-light,.btn-default)${NW}{background:var(--sk-raise)!important;color:var(--sk-text)!important;border-color:var(--sk-line)!important}
${R} :where(#global-portal) :is(.gp-btn-primary,.btn-primary)${NW}{background:var(--sk-acc)!important;border-color:var(--sk-acc)!important;color:var(--sk-bg2)!important;border-radius:calc(var(--sk-rad)/2)}
${R} ::placeholder{color:var(--sk-mute)!important}
html[data-att-skin][data-atc-theme=material] :is(#global-portal,.popover,.modal-content){font-family:Roboto,system-ui,sans-serif}
html[data-att-skin][data-atc-theme=material] :where(#global-portal) :is(.gp-btn-primary,.btn-primary,.page-link)${NW}{border-radius:20px}
html[data-att-skin][data-atc-theme=retro-futuristic] :is(.box-widget,.attendence-box,.body_content .inside-section){box-shadow:inset 0 0 0 1px var(--sk-line),0 0 12px color-mix(in srgb,var(--sk-acc) 12%,transparent)!important}
${RD} #total-time-summary:not(.retro-theme,.biz-theme,.mat-theme){--att-panel:#24202F;--att-border:rgba(255,255,255,.09);--att-shadow:0 12px 32px rgba(0,0,0,.35);--att-text:#EEEAF6;--att-muted:#A8A2B8;--att-accent:#8B78F0;--att-on-accent:#14111F;--att-ink:#B3A6FF;--att-track:#2E2A3B;--att-inner:rgba(255,255,255,.045);--att-inner-b:rgba(255,255,255,.07);--att-scheme:dark;--att-card:rgba(36,32,48,.72);--att-ok:#5FD3A1;--att-danger:#FF8A95;--att-low:#7CB8FF;--att-tense:#FFB86B;--att-void:#B9A8FF;--att-up:#5FD3A1;--att-run:#FFC857;--att-home:#FF8FA3}
html[data-att-skin=light] #total-time-summary:not(.retro-theme,.biz-theme,.mat-theme){--att-panel:#F6F4FC;--att-border:rgba(255,255,255,.85);--att-shadow:0 12px 32px rgba(60,40,120,.14);--att-text:#1E1B2E;--att-muted:#5B5670;--att-accent:#6D5BD0;--att-on-accent:#FFFFFF;--att-ink:#5A47BF;--att-track:#D9D5E8;--att-inner:rgba(255,255,255,.6);--att-inner-b:rgba(109,91,208,.14);--att-scheme:light;--att-card:rgba(255,255,255,.62);--att-ok:#1E8A5A;--att-danger:#B3261E;--att-low:#1F5FBF;--att-tense:#9A5200;--att-void:#5B3FB8;--att-up:#1E7A50;--att-run:#8A5300;--att-home:#B0164E}
${RD} #total-time-summary.biz-theme{--att-panel:#18202a;--att-border:#2b3644;--att-text:#e6edf5;--att-muted:#9aa7b6;--att-accent:#64b5f6;--att-on-accent:#0e1318;--att-ink:#90caf9;--att-track:#2b3644;--att-inner:#212b38;--att-inner-b:#2b3644;--att-card:#18202a;--att-scheme:dark;color-scheme:dark}
${RD} #total-time-summary.biz-theme:is(*,:hover){background:#121920;border-color:#2b3644;color:#e6edf5}`;

// MATERIAL YOU: a fourth widget theme over the glass base, like Just Business. M3 tokens (Google blue baseline),
// flat tonal surfaces, M3 shapes and type. Light/dark follows the browser, like the portal.
const M3 = d => d
    ? '--att-panel:#131314;--att-card:#1e1f20;--att-border:#444746;--att-shadow:none;--att-text:#e3e3e3;--att-muted:#c4c7c5;--att-accent:#a8c7fa;--att-on-accent:#062e6f;--att-ink:#a8c7fa;--att-track:#0842a0;--att-inner:#282a2c;--att-inner-b:#333537;--att-scheme:dark;--att-ok:#6dd58c;--att-danger:#f2b8b5;--att-low:#a8c7fa;--att-tense:#ffb68a;--att-void:#d0bcff;--att-up:#6dd58c;--att-run:#fdd663;--att-home:#ffb1c8;--m-pc:#0842a0;--m-on-pc:#d3e3fd;--m-sc:#1e1f20;--m-sch:#333537;--m-out:#8e918f;--m-inv:#e3e3e3;--m-on-inv:#303030;color-scheme:dark'
    : '--att-panel:#f8fafd;--att-card:#ffffff;--att-border:#e1e3e1;--att-shadow:0 1px 2px rgba(0,0,0,.3),0 1px 3px 1px rgba(0,0,0,.15);--att-text:#1f1f1f;--att-muted:#444746;--att-accent:#0b57d0;--att-on-accent:#ffffff;--att-ink:#0b57d0;--att-track:#d3e3fd;--att-inner:#f0f4f9;--att-inner-b:#e1e3e1;--att-scheme:light;--att-ok:#146c2e;--att-danger:#b3261e;--att-low:#0b57d0;--att-tense:#8a5300;--att-void:#6750a4;--att-up:#146c2e;--att-run:#8a5300;--att-home:#b0164e;--m-pc:#d3e3fd;--m-on-pc:#041e49;--m-sc:#f0f4f9;--m-sch:#dde3ea;--m-out:#747775;--m-inv:#303030;--m-on-inv:#f2f2f2;color-scheme:light';
const T = '#total-time-summary.mat-theme', MS = 'html.atc-mat :is(.settings-modal,.xp-milestone-notification)';
const MAT_CSS = `
${T},${MS}{${M3(0)};--att-display:'Google Sans','Google Sans Text',Roboto,system-ui,sans-serif}
@media (prefers-color-scheme:dark){${T},${MS}{${M3(1)}}}
html[data-att-skin=dark] ${T},html.atc-mat[data-att-skin=dark] :is(.settings-modal,.xp-milestone-notification){${M3(1)}}
html[data-att-skin=light] ${T},html.atc-mat[data-att-skin=light] :is(.settings-modal,.xp-milestone-notification){${M3(0)}}
${T}:is(*,:hover){background:var(--att-panel);border:0;border-radius:28px;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;color:var(--att-text);font-family:Roboto,system-ui,sans-serif}
${T}::before,${T} .rt-sweep{display:none}
${T} .ws-card{border:0;border-radius:24px;background:var(--att-card);box-shadow:var(--att-shadow);backdrop-filter:none;-webkit-backdrop-filter:none}
${T} .ws-head .summary-title{font:400 28px/1.15 var(--att-display)!important;letter-spacing:0}
${T} .ws-head .emoji-display{background:var(--m-pc);border:0;box-shadow:none}
${T} .ws-head :is(.settings-button,.developer-info){border:0;border-radius:50%;background:var(--m-sc);color:var(--att-text);transition:background .2s}
${T} .ws-head :is(.settings-button,.developer-info):hover{background:var(--m-sch)}
${T} .ws-head .pip-button{height:40px;border-radius:20px;padding:0 24px 0 16px;font:500 14px/1 var(--att-display);letter-spacing:.1px;box-shadow:none;transition:box-shadow .2s}
${T} .ws-head .pip-button:hover{box-shadow:0 1px 2px rgba(0,0,0,.3),0 1px 3px 1px rgba(0,0,0,.15)}
${T} .ws-k{font:500 14px/1.4 var(--att-display);letter-spacing:.1px;text-transform:none}
${T} .ws-big{font:400 57px/1 var(--att-display);letter-spacing:-.25px}
${T} .ws-at b{font:500 22px var(--att-display)}
${T} :is(.ws-pill,.ws-tl-bar){border:0;border-radius:8px;background:var(--att-inner)}
${T} .ws-tl-bar{border-radius:14px}
${T} .ws-tl-work{background-image:none;animation:none;border-radius:6px}
${T} .ws-slot.is-now{border-color:var(--att-accent);background:var(--m-pc)}
${T} .progress-bar{height:8px!important;border:0;border-radius:4px;background:var(--att-track)!important;box-shadow:none!important}
${T} .progress-fill{border-radius:4px;background:var(--att-accent)!important;box-shadow:none!important;animation:none!important}
${T} :is(.progress-fill,.progress-bar)::before,${T} .progress-fill::after{display:none}
${T} .modern-table{border:1px solid var(--att-inner-b);border-radius:16px;background:var(--att-card);box-shadow:none}
${T} .modern-table :is(th,td){border-color:var(--att-inner-b)!important;background:transparent}
${T} .modern-table th{color:var(--att-muted);font:500 12px/1.3 Roboto,system-ui,sans-serif;letter-spacing:.5px;text-transform:none}
${T} .modern-table tbody tr:hover{background:color-mix(in srgb,var(--att-text) 8%,transparent)}
${T} :is(.emoji-display,.progress-bar,.modern-table tr,.settings-button,.developer-info,.pip-button):hover{transform:none!important}
${T} .ws-time-top .atc-g{--gs:104px;align-self:center;margin-right:22px}${T} .ws-time-top .atc-g-c{display:flex}
html.atc-mat .settings-modal{background:var(--m-sc);border:0;border-radius:28px;box-shadow:0 4px 8px 3px rgba(0,0,0,.15),0 1px 3px rgba(0,0,0,.3);backdrop-filter:none;-webkit-backdrop-filter:none;color:var(--att-text);font-family:Roboto,system-ui,sans-serif}
html.atc-mat .settings-modal :is(.settings-tab){border:0;border-radius:16px;color:var(--att-muted)}
html.atc-mat .settings-modal .settings-tab.is-active{background:var(--m-pc);color:var(--m-on-pc)}
html.atc-mat .settings-modal .settings-select{border-radius:8px}
html.atc-mat .settings-modal .toggle-switch{width:52px;height:32px;border-radius:16px;background:var(--m-sch);box-shadow:inset 0 0 0 2px var(--m-out)}
html.atc-mat .settings-modal .toggle-switch::after{top:8px;left:8px;width:16px;height:16px;background:var(--m-out);box-shadow:none;transition:all .2s cubic-bezier(.2,0,0,1)}
html.atc-mat .settings-modal .toggle-switch.active{background:var(--att-accent);box-shadow:none}
html.atc-mat .settings-modal .toggle-switch.active::after{top:4px;left:4px;width:24px;height:24px;background:var(--att-on-accent);transform:translateX(20px)}
html.atc-mat .xp-milestone-notification{background:var(--m-inv);color:var(--m-on-inv);border:0;border-radius:8px;box-shadow:0 4px 8px 3px rgba(0,0,0,.15),0 1px 3px rgba(0,0,0,.3)}`;

// CHIP: in the persistent header; Angular may re-render it, so re-mounted when detached.
let chip = null, strip = null, mgauge = null;
function mountChip(on) {
    const host = on && D.querySelector('.gp-main-navbar .header-icons');
    if (!host) { if (chip) chip.remove(); return; }
    if (!chip) {
        chip = D.createElement('div'); chip.className = 'atc-chip';
        chip.innerHTML = `<button type="button" class="atc-chip-b" aria-haspopup="dialog" aria-expanded="false" title="Today's time">${gauge()}<span data-k="chip">—</span></button>`
            + `<div class="atc-pop" role="dialog" aria-label="Today's time" hidden><div class="atc-pop-h">${gauge()}<span>Today<br><small data-k="state"></small></span></div>`
            + `<dl><dt><i class="atc-dot-a"></i>Actual</dt><dd data-k="act"></dd><dt><i class="atc-dot-b"></i>Active</dt><dd data-k="actv"></dd><dt>Shift left</dt><dd data-k="left"></dd><dt>Leave at</dt><dd data-k="out"></dd></dl>`
            + `<a href="#/time-absence/attendence-record">Open attendance →</a></div>`;
        const btn = chip.firstChild, pop = chip.lastChild, show = v => { pop.hidden = !v; btn.setAttribute('aria-expanded', v); if (v) paint(); };
        btn.addEventListener('click', e => { e.stopPropagation(); show(pop.hidden); });
        pop.addEventListener('click', e => { if (e.target.closest('a')) show(false); });
        D.addEventListener('click', e => { if (chip && !chip.contains(e.target)) show(false); });
        D.addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden) { show(false); btn.focus(); } });
    }
    if (!chip.isConnected) host.prepend(chip);
}
// TIMELINE: the profile card's Actual/Active row becomes a cog strip.
function mountStrip(on) {
    if (!on) { if (strip) { strip.remove(); strip = null; } return; }
    if (strip && strip.isConnected) return;
    const row = [...D.querySelectorAll('app-personal-info-widget .time-check')].find(r => /Actual Time/.test(r.textContent)); if (!row) return;
    strip = D.createElement('div'); strip.className = 'atc-strip';
    strip.innerHTML = gauge() + '<span><i>Actual</i><b data-k="act"></b></span><span><i>Active</i><b data-k="actv"></b></span><span><i>Left</i><b data-k="left"></b></span><span><i>Leave at</i><b data-k="out"></b></span>';
    row.classList.add('atc-hide'); row.after(strip);
}
// MATERIAL: the cog gauge sits in the time card, between the countdown and "Complete at"; renderFullContent may rebuild it.
function mountPanel(on) {
    if (!on) { if (mgauge) { mgauge.remove(); mgauge = null; } return; }
    if (mgauge && mgauge.isConnected) return;
    const at = D.querySelector('#total-time-summary .ws-time-top .ws-at'); if (!at) return;
    at.insertAdjacentHTML('beforebegin', gauge()); mgauge = at.previousElementSibling;
}

// One pass over every mounted gauge and label; writes only what changed.
function paint() {
    const T = times(), gs = D.querySelectorAll('.atc-g'); if (!gs.length) return;
    const ga = T.act == null ? 0 : Math.min(1, T.act / T.shift), gb = T.act ? Math.min(1, (T.actv || 0) / T.act) : 0;
    const left = T.act == null ? null : T.shift - T.act, over = left != null && left <= 0, foc = T.act && T.actv != null ? Math.round(gb * 100) + '%' : '—';
    const out = left == null ? '—' : over ? 'Done' : new Date(Date.now() + left * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const vA = ga.toFixed(3), vB = gb.toFixed(3);
    gs.forEach(g => { if (g.dataset.v !== vA + vB) { g.dataset.v = vA + vB; g.style.setProperty('--ga', vA); g.style.setProperty('--gb', vB); }
        g.classList.toggle('is-live', T.live); g.classList.toggle('is-over', over); put(g.querySelector('.atc-g-c b'), foc); put(g.querySelector('.atc-g-c small'), 'focus'); });
    const txt = { chip: T.act == null ? '—' : over ? '+' + hm(-left) + ' over' : hm(left) + ' left', act: hms(T.act), actv: hms(T.actv), left: left == null ? '—' : over ? '+' + hms(-left) : hms(left), out,
        state: T.live ? 'Checked in · ' + foc + ' focus' : T.act ? 'Checked out' : 'Not checked in' };
    [chip, strip].forEach(root => root && root.isConnected && root.querySelectorAll('[data-k]').forEach(el => { if (el.closest('[hidden]')) return; put(el, txt[el.dataset.k]); }));
}

const MQ = matchMedia('(prefers-color-scheme: dark)');
const skinOf = p => p.displayTheme === 'retro-futuristic' || MQ.matches ? 'dark' : 'light';
let lastRoute = null;
ATC.tick = att => {
    const r = route(), p = P();
    if (r !== lastRoute) { lastRoute = r; if (!snap || Date.now() - snap.t > 60000) due = 0; }
    const sk = r ? skinOf(p) : '';
    if ((H.dataset.attSkin || '') !== sk) { if (sk) H.dataset.attSkin = sk; else delete H.dataset.attSkin; }
    if (Date.now() >= due) { due = Date.now() + AGE; pull(); }
    mountChip(r !== 'att');
    mountStrip(r === 'tl' && (snap && snap.act != null));
    mountPanel(att && p.displayTheme === 'material');
    paint();
};
ATC.apply = () => {
    const p = P(), mat = p.displayTheme === 'material';
    H.dataset.atcTheme = p.displayTheme; H.classList.toggle('atc-mat', mat);
    style('atc-base-css', true, BASE_CSS); style('atc-skin-css', true, SKIN_CSS); style('atc-mat-css', mat, MAT_CSS);
    ATC.tick(ATC.onAtt());
};
