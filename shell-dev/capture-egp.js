// Paste into DevTools on the live portal (Timeline, then Attendance), with the page fully loaded. It downloads the
// page as a static fixture for compare.js / host-run.js: scripts and everything the widget or ATCShell added are
// removed, URLs made absolute. Save the files to shell-dev/ref/egp/ (gitignored: they hold your personal data).
(() => {
    const att = location.hash.startsWith('#/time-absence'), d = document.documentElement.cloneNode(true);
    d.querySelectorAll('script, noscript, iframe, #attendance-modern-styles, #att-biz-styles, [id^="atc-"], #total-time-summary, .atc-chip, .atc-time, .atc-r, .settings-modal-overlay, .achievements-modal-overlay, .xp-milestone-notification, .ach-ui, .pip-placeholder').forEach(e => e.remove());
    d.querySelectorAll('.atc-hide').forEach(e => e.classList.remove('atc-hide'));
    ['data-att-skin', 'data-atc-theme', 'data-x-fam', 'style'].forEach(a => d.removeAttribute(a)); d.classList.remove('atc-mat');
    d.querySelectorAll('[src]').forEach(e => e.setAttribute('src', e.src));
    d.querySelectorAll('link[href]').forEach(e => e.setAttribute('href', e.href));
    const html = '<!doctype html>\n' + d.outerHTML, a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = att ? 'attendance.html' : 'timeline.html'; a.click();
    console.log('saved', a.download, Math.round(html.length / 1024) + ' KB');
})();
