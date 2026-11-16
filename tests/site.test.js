'use strict';
/* Zero-dependency contract checks for the static site.
   Run with: node --test tests/   (Node 18+; no install or build needed.) */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('index.html');
const cssFiles = ['site.css', 'refinement.css', 'finishing.css', 'hero-background.css', 'polish.css'];
const css = cssFiles.map(read).join('\n');

function jpegSize(file) {
  const b = fs.readFileSync(path.join(root, file));
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i < b.length - 9) {
    if (b[i] !== 0xff) { i++; continue; }
    const marker = b[i + 1];
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01) { i += 2; continue; }
    const len = b.readUInt16BE(i + 2);
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
    }
    i += 2 + len;
  }
  return null;
}

test('one h1, unique ids, and in-page anchors resolve', () => {
  assert.equal((html.match(/<h1\b/gi) || []).length, 1);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, 'duplicate id found');
  for (const m of html.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(ids.includes(m[1]), `unresolved anchor #${m[1]}`);
  }
});

test('every local asset referenced by the page exists', () => {
  for (const m of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|mailto:|tel:|data:|#)/i.test(url)) continue;
    assert.ok(fs.existsSync(path.join(root, url.split('?')[0])), `missing asset ${url}`);
  }
});

test('structured data blocks are valid JSON', () => {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.ok(blocks.length >= 3);
  for (const b of blocks) assert.doesNotThrow(() => JSON.parse(b[1]));
});

test('CSP is strict and self-only', () => {
  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  for (const directive of ["default-src 'self'", "style-src 'self'", "script-src 'self'", "base-uri 'none'", "form-action 'none'"]) {
    assert.ok(csp.includes(directive), `missing ${directive}`);
  }
  for (const forbidden of ['unsafe-inline', 'unsafe-eval', 'data:', 'frame-src', 'http://', 'https://']) {
    assert.ok(!csp.includes(forbidden), `unexpected CSP permission ${forbidden}`);
  }
});

test('social metadata is complete for Open Graph and Twitter', () => {
  for (const name of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image',
    'og:title', 'og:description', 'og:image', 'og:image:alt', 'og:locale', 'og:site_name']) {
    assert.ok(new RegExp('(?:name|property)="' + name + '"').test(html), `missing ${name}`);
  }
});

test('no inline style attributes and both fonts are preloaded', () => {
  assert.equal((html.match(/\sstyle="/g) || []).length, 0);
  for (const font of ['assets/dm-sans.woff2', 'assets/fraunces.woff2']) {
    assert.ok(html.includes(`rel="preload" href="${font}"`), `missing preload ${font}`);
    assert.ok(fs.existsSync(path.join(root, font)), `missing font ${font}`);
  }
});

test('all JavaScript parses', () => {
  for (const file of ['app.js', 'shortlist.js', 'direction.js', 'refinement.js', 'serve.js']) {
    assert.doesNotThrow(() => new vm.Script(read(file), { filename: file }));
  }
});

test('DOM contracts used by scripts are present in the markup', () => {
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
  for (const id of ['drawer', 'backdrop', 'request-result', 'request-form', 'basket-open',
    'drawer-close', 'send-btn', 'basket-count', 'basket-sr', 'basket-list', 'req-err',
    'req-name', 'req-contact', 'req-note', 'req-hp', 'ranges-grid', 'filter-status',
    'main-nav', 'status-text', 'year']) {
    assert.ok(ids.has(id), `script expects #${id}`);
  }
  for (const cls of ['drawer-open', 'copy-buffer', 'image-viewer', 'gallery-more',
    'photo-zoom', 'range-note', 'hours-note', 'request-note', 'optional-label']) {
    assert.ok(css.includes('.' + cls), `stylesheet missing .${cls}`);
  }
  assert.ok(css.includes('.steps h3'), 'steps heading style not updated for h3');
  assert.ok(!html.includes('data-reveal'), 'inert reveal markup should not return');
  assert.ok(!css.includes('html.js-reveal') && !css.includes('.hero-parallax'), 'inert motion CSS should not return');
  assert.ok(read('app.js').includes("document.querySelector('#filter-status')"));
  assert.ok(html.includes('<form id="request-form" novalidate>'));
  assert.ok(html.includes('id="req-name" name="name" type="text" autocomplete="name" aria-describedby="req-err"'));
  assert.ok(html.includes('id="req-contact" name="contact" type="text" autocomplete="off" aria-describedby="req-err"'));
  assert.ok(html.indexOf('src="shortlist.js"') < html.indexOf('src="app.js"'),
    'shortlist.js must load before app.js');
  assert.ok(/<noscript>[\s\S]*mailto:rebekahellaltd@gmail\.com[\s\S]*<\/noscript>/.test(html),
    'no-JS users need a contact route');
  assert.ok(css.includes('.noscript-note') && css.includes('.mailto-tip'));
});

test('local server protects paths and disables caching', () => {
  const server = read('serve.js');
  assert.ok(server.includes("rel === '/'") && server.includes("'/index.html'"));
  assert.ok(server.includes('file.startsWith(root + path.sep)'));
  assert.ok(server.includes("'Cache-Control': 'no-store'"));
});

test('filter count is derived from the DOM and long enquiries are flagged', () => {
  const app = read('app.js');
  assert.ok(app.includes("announceFilter('',document.querySelectorAll('#ranges-grid .item').length)"));
  assert.ok(app.includes('body.length>1500'));
  assert.ok(app.includes('mailto-tip'));
});

test('gallery images are lazy, described, sized and use accurate srcset descriptors', () => {
  const cards = [...html.matchAll(/<figure class="photo-card"><img([^>]+)>/g)].map(m => m[1]);
  assert.equal(cards.length, 13);
  let checked = 0;
  for (const attrs of cards) {
    assert.ok(attrs.includes('loading="lazy"'));
    assert.ok(attrs.includes('alt="'));
    assert.ok(/width="\d+"/.test(attrs) && /height="\d+"/.test(attrs));
    const srcset = attrs.match(/srcset="([^"]+)"/)[1];
    for (const part of srcset.split(',')) {
      const [url, descriptor] = part.trim().split(/\s+/);
      const declared = parseInt(descriptor, 10);
      const actual = jpegSize(url);
      assert.ok(actual, `cannot read ${url}`);
      assert.equal(actual.w, declared, `descriptor mismatch for ${url}`);
      checked++;
    }
  }
  assert.ok(checked > 20);
});

test('small footer text meets WCAG AA contrast on the footer background', () => {
  const srgb = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = hex => {
    const n = parseInt(hex.replace('#', ''), 16);
    return 0.2126*srgb((n>>16)&255) + 0.7152*srgb((n>>8)&255) + 0.0722*srgb(n&255);
  };
  const ratio = (a, b) => {
    const x = lum(a), y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  const css = read('site.css');
  const note = css.match(/\.foot-note\s*\{[^}]*color:\s*(#[0-9a-f]{6})/i)[1];
  const footerBg = css.match(/footer\s*\{[^}]*background:\s*var\(--ink\)/i) ? '#323c39' : null;
  assert.ok(footerBg, 'footer background token changed; recheck this test');
  assert.ok(ratio(note, footerBg) >= 4.5, `footer note ${note} below 4.5:1 on ${footerBg}`);
});

test('closed drawer and narrow layouts cannot overflow the viewport', () => {
  assert.ok(css.includes('.drawer[hidden]{display:none!important}'),
    'author display:flex overrides [hidden] without an explicit rule');
  assert.ok(css.includes('.grid-cards .item-body,.split>*,.section-head{min-width:0'),
    'grid children need min-width:0 to shrink on narrow screens');
  assert.ok(css.includes('minmax(min(232px, 100%), 1fr)'),
    'auto-fill grid needs a shrinkable minimum');
  assert.ok(css.includes('footer a,.visit-list a{display:inline-flex;align-items:center;min-height:44px}'));
  assert.ok(css.includes('details.qa p a{display:inline-block;min-height:44px'));
  for (const obsolete of ['.jiro-experience', '.card-stack', '.type-hero', '.display-card', '.coffee-grid', '.planning', '.hero-wordmark', '.hero{', '.label', ',select', 'select:focus', 'h4{']) {
    assert.ok(!css.includes(obsolete), `obsolete shared CSS "${obsolete}" should be gone`);
  }
});

test('shortlist names are unique and every filter matches at least one card', () => {
  const names = [...html.matchAll(/data-add="([^"]+)"/g)].map(m => m[1]);
  assert.ok(names.length > 0);
  assert.equal(new Set(names).size, names.length, 'shortlist is keyed by name, so names must be unique');

  const chips = [...html.matchAll(/class="chip"[^>]*data-filter="([^"]+)"/g)].map(m => m[1]);
  assert.ok(chips.length > 0);
  const tags = [...html.matchAll(/<article class="item" data-tags="([^"]+)"/g)].map(m => m[1]);
  for (const filter of chips) {
    if (filter === 'all') continue;
    assert.ok(tags.some(t => t.split(/\s+/).includes(filter)), `chip "${filter}" matches no card`);
  }
});

test('static ARIA references resolve (excluding ids created at runtime)', () => {
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
  // These are assigned by refinement.js when the gallery viewer is built.
  const runtimeIds = new Set(['viewer-caption', 'inspiration-photos']);
  const attrs = /aria-(?:labelledby|describedby|controls)="([^"]+)"/g;
  for (const m of html.matchAll(attrs)) {
    for (const ref of m[1].split(/\s+/)) {
      assert.ok(ids.has(ref) || runtimeIds.has(ref), `ARIA reference #${ref} does not resolve`);
    }
  }
});

test('enquiry text preserves items, quantities, fulfilment and reference', () => {
  const scope = { globalThis: {} };
  vm.createContext(scope);
  new vm.Script(read('shortlist.js')).runInContext(scope);
  const build = scope.globalThis.DDBuildEnquiry;
  assert.equal(typeof build, 'function');
  const items = [
    { name: 'Birthday cards', group: 'Cards', qty: 2 },
    { name: 'Gift wrap and ribbon', group: 'Wrap', qty: 1 },
  ];
  const text = build(items, 'Local delivery', 'Ada', 'ada@example.com', 'A 60th card', 'DD-20261116-AB12');
  assert.ok(text.includes('2 × Birthday cards'));
  assert.ok(text.includes('1 × Gift wrap and ribbon'));
  assert.ok(text.includes('Collection or delivery enquiry: Local delivery'));
  assert.ok(text.includes('Name: Ada'));
  assert.ok(text.includes('Reply to: ada@example.com'));
  assert.ok(text.includes('Notes: A 60th card'));
  assert.ok(text.includes('Reference: DD-20261116-AB12'));
  assert.ok(text.includes('before anything is reserved or purchased'));
  const terse = build(items, 'Collect from the shop', 'Ada', '02920756793', '', 'DD-X');
  assert.ok(!terse.includes('Notes:'));
  assert.ok(terse.includes('Reply to: 02920756793'));
});

test('shortlist sanitizer rejects malformed or duplicated stored data', () => {
  const scope = { globalThis: {} };
  vm.createContext(scope);
  new vm.Script(read('shortlist.js')).runInContext(scope);
  const sanitize = scope.globalThis.DDSanitize;
  const norm = value => JSON.parse(JSON.stringify(value));
  assert.equal(typeof sanitize, 'function');
  assert.deepEqual(norm(sanitize(null)), []);
  assert.deepEqual(norm(sanitize('not an array')), []);
  assert.deepEqual(norm(sanitize([null, 3, {}, { name: '', group: 'Cards' }])), []);
  assert.deepEqual(
    norm(sanitize([
      { name: 'Birthday cards', group: 'Cards', qty: 3 },
      { name: 'Birthday cards', group: 'Cards', qty: 9 },
      { name: 'Gift wrap and ribbon', group: 'Wrap', qty: 0 },
      { name: 'x'.repeat(200), group: 'Cards', qty: 1 },
      { name: 'Small gift enquiry', group: 'Gifts', qty: 999 },
      { name: ' thank you', group: 'Cards', qty: '4' },
    ])),
    [
      { name: 'Birthday cards', group: 'Cards', qty: 3 },
      { name: 'Gift wrap and ribbon', group: 'Wrap', qty: 1 },
      { name: 'Small gift enquiry', group: 'Gifts', qty: 20 },
      { name: ' thank you', group: 'Cards', qty: 4 },
    ]
  );
  assert.equal(sanitize(Array.from({ length: 40 }, (_, i) => ({ name: 'n' + i, group: 'Cards', qty: 1 }))).length, 20);
});

test('form validation contract', () => {
  const app = read('app.js');
  assert.ok(read('refinement.js').includes("photo.setAttribute('width','1200')"));
  assert.ok(read('refinement.js').includes("photo.alt=''"));
  assert.ok(app.includes('DDBuildEnquiry(list,fulfil,name,contact,note,ref)'));
  assert.ok(app.includes('name.length<2'));
  assert.ok(app.includes('Enter an email address or phone number'));
  assert.ok(app.includes('mailto:rebekahellaltd@gmail.com'));
  assert.ok(app.includes("not([tabindex=\"-1\"])"), 'honeypot must stay out of the focus trap');
});
