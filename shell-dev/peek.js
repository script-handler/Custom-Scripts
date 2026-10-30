// Prints a component's markup from a captured EGP page, without svg bodies, comments, Angular attributes or URLs.
//   "C:/Program Files/nodejs/node.exe" shell-dev/peek.js timeline "<stock-widget" [chars]
const fs = require('fs'), path = require('path');
const [page, start, n = 2500] = process.argv.slice(2);
const s = fs.readFileSync(path.join(__dirname, 'ref', 'egp', page + '.html'), 'utf8'), a = s.indexOf(start);
if (a < 0) { console.log('not found: ' + start); process.exit(1); }
console.log(s.slice(a, a + +n * 3).replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>').replace(/<popover-content[\s\S]*?<\/popover-content>/g, '')
    .replace(/\s(src|href|_ngcontent-c\d+|_nghost-c\d+|data-bs-[a-z]+|aria-[a-z]+|style)="[^"]*"/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').slice(0, +n));
