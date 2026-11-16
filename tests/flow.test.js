'use strict';
/* Behaviour test for the core shortlist -> enquiry journey.
   Uses a small purpose-built DOM stub; no dependencies or browser needed. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function harness() {
  const all = [];
  const doc = { activeElement: null, handlers: {} };

  class El {
    constructor(tag = 'div') {
      this.tag = tag;
      this.children = [];
      this.parent = null;
      this.attributes = {};
      this.dataset = {};
      this._text = '';
      this._html = '';
      this.hidden = false;
      this.disabled = false;
      this.value = '';
      this.checked = false;
      this.tabIndex = 0;
      this.style = {};
      this.handlers = {};
      const set = new Set();
      this.classList = {
        add: (...c) => c.forEach(x => set.add(x)),
        remove: (...c) => c.forEach(x => set.delete(x)),
        toggle: (c, force) => {
          const on = force === undefined ? !set.has(c) : force;
          on ? set.add(c) : set.delete(c);
          return on;
        },
        contains: c => set.has(c),
      };
      all.push(this);
    }
    setAttribute(k, v) {
      this.attributes[k] = String(v);
      if (k === 'id') this.id = String(v);
      if (k.startsWith('data-')) {
        const key = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        this.dataset[key] = String(v);
      }
    }
    getAttribute(k) { return k in this.attributes ? this.attributes[k] : null; }
    removeAttribute(k) { delete this.attributes[k]; }
    addEventListener(type, fn) { (this.handlers[type] ||= []).push(fn); }
    dispatch(type, extra = {}) {
      (this.handlers[type] || []).forEach(fn => fn({ target: this, preventDefault() {}, ...extra }));
    }
    get textContent() { return this._text; }
    set textContent(v) { this._text = String(v); this.children = []; }
    get innerHTML() { return this._html; }
    set innerHTML(v) { this._html = String(v); }
    append(...nodes) { nodes.forEach(n => { n.parent = this; this.children.push(n); }); }
    replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
    focus() { doc.activeElement = this; }
    select() {}
    contains(el) { return el === this || this.children.some(c => c.contains && c.contains(el)); }
    querySelector(sel) { return doc.querySelector(sel, this); }
    querySelectorAll(sel) { return doc.querySelectorAll(sel, this); }
    getClientRects() { return [{}]; }
    closest(sel) {
      let node = this;
      while (node) {
        if (matches(node, sel)) return node;
        node = node.parent;
      }
      return null;
    }
  }

  function matches(el, sel) {
    return sel.split(',').map(s => s.trim()).some(part => {
      if (part.startsWith('#')) return el.id === part.slice(1);
      if (part.startsWith('.')) return el.classList.contains(part.slice(1));
      if (/^(main|header|footer|nav)$/.test(part)) return el.tag === part;
      if (part === '[data-add]') return 'add' in el.dataset;
      if (part === '[data-qty]') return 'qty' in el.dataset;
      if (part === '[data-remove]') return 'remove' in el.dataset;
      if (part === '[data-open-drawer]') return 'data-open-drawer' in el.attributes;
      if (part === '[aria-invalid]') return 'aria-invalid' in el.attributes;
      if (part === 'input[name=fulfil]:checked') return el.tag === 'input' && el.attributes.name === 'fulfil' && el.checked;
      if (part.includes(' ')) {
        const [ancestor, child] = part.split(/\s+/);
        return matches(el, child) && !!el.parent && matches(el.parent, ancestor);
      }
      return false;
    });
  }

  doc.createElement = tag => new El(tag);
  doc.querySelector = (sel, within) => doc.querySelectorAll(sel, within)[0] || null;
  doc.querySelectorAll = (sel, within) => all.filter(el => (!within || within.contains(el)) && matches(el, sel));
  doc.addEventListener = (type, fn) => { (doc.handlers[type] ||= []).push(fn); };
  doc.dispatch = (type, extra = {}) => {
    (doc.handlers[type] || []).forEach(fn => fn({ preventDefault() {}, ...extra }));
  };
  doc.body = new El('body');

  const make = (tag, id) => {
    const el = new El(tag);
    if (id) el.setAttribute('id', id);
    return el;
  };

  const ids = ['drawer', 'backdrop', 'request-result', 'request-form', 'basket-open',
    'drawer-close', 'send-btn', 'basket-count', 'basket-sr', 'basket-list',
    'filter-status', 'req-err', 'req-name', 'req-contact', 'req-note', 'req-hp',
    'ranges-grid', 'status-text', 'year'];
  ids.forEach(id => make('div', id));

  const grid = doc.querySelector('#ranges-grid');
  const names = ['Birthday cards', 'Gift wrap and ribbon'];
  names.forEach((name, i) => {
    const article = new El('article');
    article.setAttribute('data-tags', 'wrap');
    article.classList.add('item');
    article.parent = grid;
    const button = new El('button');
    button.setAttribute('data-add', name);
    button.setAttribute('data-group', i ? 'Wrap' : 'Cards');
  });

  const collect = new El('input');
  collect.setAttribute('name', 'fulfil');
  collect.checked = true;
  collect.value = 'Collect from the shop';

  const storage = new Map();
  const localStorage = {
    getItem: k => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, v),
  };
  const crypto = { getRandomValues: () => [12345] };
  const navigator = { clipboard: { writeText: async () => { throw new Error('no clipboard'); } } };
  const sandbox = {
    document: doc,
    addEventListener() {},
    localStorage,
    crypto,
    navigator,
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    requestAnimationFrame: fn => fn(),
    setTimeout: () => 0,
    clearTimeout: () => {},
    execCommand: () => true,
    console,
    Uint32Array,
  };
  vm.createContext(sandbox);
  sandbox.window = sandbox; // in a browser, window is the global object
  new vm.Script(read('shortlist.js')).runInContext(sandbox);
  new vm.Script(read('app.js')).runInContext(sandbox);

  return { doc, sandbox, storage };
}

test('adding an item updates the shortlist, opens the drawer and prepares an unsent enquiry', () => {
  const { doc } = harness();
  const count = doc.querySelector('#basket-count');
  const send = doc.querySelector('#send-btn');
  assert.equal(count.textContent, '0');
  assert.equal(send.disabled, true);

  const add = doc.querySelectorAll('[data-add]')[0];
  doc.dispatch('click', { target: add });

  assert.equal(count.textContent, '1');
  assert.equal(send.disabled, false);
  assert.equal(doc.querySelector('#drawer').hidden, false);
  assert.match(doc.querySelector('#basket-list').innerHTML, /Birthday cards/);

  doc.querySelector('#req-name').value = 'Ada';
  doc.querySelector('#req-contact').value = 'ada@example.com';
  doc.querySelector('#req-note').value = 'A 60th card';
  doc.querySelector('#request-form').dispatch('submit');

  const result = doc.querySelector('#request-result');
  assert.equal(result.children.length, 1);
  const box = result.children[0];
  const mailto = box.children.find(el => el.tag === 'a');
  assert.ok(mailto, 'expected a mailto link');
  assert.match(mailto.href, /^mailto:rebekahellaltd@gmail\.com\?subject=/);
  assert.match(decodeURIComponent(mailto.href), /1 × Birthday cards/);
  assert.match(decodeURIComponent(mailto.href), /Name: Ada/);
  assert.match(decodeURIComponent(mailto.href), /Notes: A 60th card/);
  assert.match(decodeURIComponent(mailto.href), /Reference: DD-\d{8}-[A-Z0-9]+/);
});

test('invalid contact is rejected without preparing an enquiry', () => {
  const { doc } = harness();
  doc.dispatch('click', { target: doc.querySelectorAll('[data-add]')[0] });
  doc.querySelector('#req-name').value = 'Ada';
  doc.querySelector('#req-contact').value = 'not-a-contact';
  doc.querySelector('#request-form').dispatch('submit');

  const error = doc.querySelector('#req-err');
  assert.equal(error.hidden, false);
  assert.match(error.textContent, /email address or phone number/);
  assert.equal(doc.querySelector('#request-result').children.length, 0);
  assert.equal(doc.querySelector('#req-contact').getAttribute('aria-invalid'), 'true');
});

test('repeat adds and quantity buttons stay within the 1-20 bounds', () => {
  const { doc } = harness();
  const add = doc.querySelectorAll('[data-add]')[0];
  doc.dispatch('click', { target: add });
  doc.dispatch('click', { target: add });
  assert.equal(doc.querySelector('#basket-count').textContent, '2');

  const plus = doc.createElement('button');
  plus.setAttribute('data-qty', '1');
  plus.setAttribute('data-name', 'Birthday cards');
  for (let i = 0; i < 25; i++) doc.dispatch('click', { target: plus });
  assert.equal(doc.querySelector('#basket-count').textContent, '20');

  const minus = doc.createElement('button');
  minus.setAttribute('data-qty', '-1');
  minus.setAttribute('data-name', 'Birthday cards');
  for (let i = 0; i < 25; i++) doc.dispatch('click', { target: minus });
  assert.equal(doc.querySelector('#basket-count').textContent, '1');
});

test('removing the last item disables submission again', () => {
  const { doc } = harness();
  doc.dispatch('click', { target: doc.querySelectorAll('[data-add]')[0] });
  assert.equal(doc.querySelector('#send-btn').disabled, false);

  const remove = doc.createElement('button');
  remove.setAttribute('data-remove', 'Birthday cards');
  doc.dispatch('click', { target: remove });

  assert.equal(doc.querySelector('#basket-count').textContent, '0');
  assert.equal(doc.querySelector('#send-btn').disabled, true);
  assert.match(doc.querySelector('#basket-list').innerHTML, /shortlist is empty/);
});

test('a filled honeypot silently blocks an enquiry', () => {
  const { doc } = harness();
  doc.dispatch('click', { target: doc.querySelectorAll('[data-add]')[0] });
  doc.querySelector('#req-hp').value = 'spam';
  doc.querySelector('#req-name').value = 'Ada';
  doc.querySelector('#req-contact').value = 'ada@example.com';
  doc.querySelector('#request-form').dispatch('submit');
  assert.equal(doc.querySelector('#request-result').children.length, 0);
});

test('filtering reports the matching count through the live region', () => {
  const { doc } = harness();
  const chip = doc.createElement('button');
  chip.setAttribute('data-filter', 'wrap');
  chip._text = 'Wrap & finishing';
  chip.classList.add('chip');
  doc.querySelector('#ranges-grid').append(chip);
  doc.dispatch('click', { target: chip });
  assert.match(doc.querySelector('#filter-status').textContent, /^Showing \d+ occasions? for Wrap & finishing\.$/);
});
