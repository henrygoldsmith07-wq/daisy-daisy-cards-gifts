
(function () {
  'use strict';

  var SHOP = {
    name: 'Daisy Daisy',
    email: 'rebekahellaltd@gmail.com',
    phone: '029 2075 6793',
    hoursConfirmed: false
  };
  var KEY = 'dd-shortlist-v1';
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  /* ---------- open status ---------- */
  function fmt(mins) {
    var h = Math.floor(mins / 60), m = mins % 60, ampm = h >= 12 ? 'pm' : 'am', h12 = h % 12 || 12;
    return h12 + (m ? ':' + (m < 10 ? '0' + m : m) : '') + ampm;
  }
  function renderStatus() {
    var el = document.getElementById('status'), txt = document.getElementById('status-text');
    if (!el || !txt) return;
    el.className = 'status';
    txt.textContent = 'Listed opening: Mon–Sat from 9am · call for today’s hours';
  }
  function markToday() {
    var rows = document.querySelectorAll('#hours-table tr[data-day]');
    var d = new Date().getDay();
    for (var i = 0; i < rows.length; i++) {
      if (Number(rows[i].getAttribute('data-day')) === d) rows[i].classList.add('today');
    }
  }

  /* ---------- shortlist store ---------- */
  function load() {
    try { var raw=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(raw)?raw.filter(function(x){return x&&typeof x.name==='string'&&typeof x.group==='string';}).slice(0,20):[];}catch(e){return [];}
  }
  function save(list) {
    document.getElementById('request-result').replaceChildren();
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
    renderBasket();
  }
  function add(name, group) {
    var list = load();
    for (var i = 0; i < list.length; i++) if (list[i].name === name) return;
    list.push({ name: name, group: group });
    save(list);
  }
  function remove(name) { save(load().filter(function (x) { return x.name !== name; })); }

  function renderBasket() {
    var list = load();
    document.querySelectorAll('[data-add]').forEach(function(btn){var chosen=list.some(function(x){return x.name===btn.dataset.add;});btn.textContent=chosen?'On your shortlist':'Add to shortlist';btn.classList.toggle('added',chosen);});
    var count = document.getElementById('basket-count');
    var sr = document.getElementById('basket-sr');
    if (count) { count.textContent = String(list.length); count.classList.toggle('on', list.length > 0); }
    if (sr) sr.textContent = list.length === 1 ? '1 item on your shortlist' : list.length + ' items on your shortlist';

    var box = document.getElementById('basket-list');
    if (!box) return;
    if (!list.length) {
      box.innerHTML = '<p class="empty">Nothing on the list yet.<br>Tap “Add to shortlist” on anything that sounds right.</p>';
      document.getElementById('send-btn').disabled = true;
      return;
    }
    document.getElementById('send-btn').disabled = false;
    var html = '';
    for (var i = 0; i < list.length; i++) {
      html += '<div class="basket-row"><div><div class="br-name">' + esc(list[i].name) +
        '</div><div class="br-meta">' + esc(list[i].group || '') + ' · availability to confirm</div></div>' +
        '<button class="remove" type="button" data-remove="' + esc(list[i].name) + '">Remove</button></div>';
    }
    box.innerHTML = html;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  /* ---------- drawer ---------- */
  var drawer = document.getElementById('drawer');
  var backdrop = document.getElementById('backdrop');
  var lastFocus = null;
  function openDrawer() {
    lastFocus = document.activeElement;
    drawer.hidden = false; backdrop.hidden = false;
    document.body.style.overflow='hidden';
    document.querySelectorAll('main,header,footer,nav').forEach(function(el){el.inert=true;});
    requestAnimationFrame(function () { drawer.classList.add('open'); backdrop.classList.add('open'); });
    document.getElementById('drawer-close').focus();
    document.addEventListener('keydown', onKey);
  }
  function closeDrawer() {
    drawer.classList.remove('open'); backdrop.classList.remove('open');
    document.body.style.overflow='';
    document.querySelectorAll('main,header,footer,nav').forEach(function(el){el.inert=false;});
    document.removeEventListener('keydown', onKey);
    setTimeout(function () { drawer.hidden = true; backdrop.hidden = true; }, 260);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function onKey(e) {
    if (e.key === 'Escape') { closeDrawer(); return; }
    if (e.key !== 'Tab') return;
    var f = drawer.querySelectorAll('a[href], button:not([disabled]), input, textarea, select');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- request form ---------- */
  function makeRef() {
    var d = new Date();
    var stamp = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    var rnd = Math.random().toString(36).slice(2, 5).toUpperCase();
    return 'DD-' + stamp + '-' + rnd;
  }

  function onSubmit(e) {
    e.preventDefault();
    var err = document.getElementById('req-err');
    err.hidden = true;
    if (document.getElementById('req-hp').value) return;

    var list = load();
    if (!list.length) { err.textContent = 'Add something to your shortlist first.'; err.hidden = false; return; }

    var name = document.getElementById('req-name').value.trim();
    var contact = document.getElementById('req-contact').value.trim();
    var note = document.getElementById('req-note').value.trim();
    var fulfil = document.querySelector('input[name="fulfil"]:checked').value;

    if (name.length < 2) { err.textContent = 'Please give a name the shop can ask for.'; err.hidden = false; return; }
    if (contact.length < 5) { err.textContent = 'Please add a phone number or email address.'; err.hidden = false; return; }

    var ref = makeRef();
    var lines = list.map(function (x) { return '- ' + x.name; }).join('\n');
    var body = 'Hello Daisy Daisy,\n\nI would like to order the following:\n\n' + lines +
      '\n\nHow I would like to get it: ' + fulfil +
      '\nMy name: ' + name +
      '\nBest contact: ' + contact +
      (note ? '\nNotes: ' + note : '') +
      '\n\nReference: ' + ref +
      '\n\nPlease let me know what you have in stock, the price, and when I can collect.\n\nThank you.';
    var mailto = 'mailto:' + SHOP.email + '?subject=' + encodeURIComponent('Shortlist ' + ref + ' — ' + name) + '&body=' + encodeURIComponent(body);

    var box = document.getElementById('request-result');
    box.innerHTML = '<div class="confirmed"><strong>Request ready — ' + esc(ref) + '</strong>' +
      '<p style="font-size:.89rem;margin:.3rem 0 .7rem">Send it to the shop and they will come back with stock, price and a pickup time.</p>' +
      '<p style="margin:0 0 .7rem"><span class="ref-code">' + esc(ref) + '</span></p>' +
      '<a class="btn btn-primary btn-block" href="' + esc(mailto) + '">Open the email to Daisy Daisy</a>' +
      '<button class="btn btn-ghost btn-block" type="button" id="copy-ref" style="margin-top:.5rem">Copy full request</button>' +
      '<p style="font-size:.78rem;color:var(--ink-soft);margin:.7rem 0 0">No email app? Copy the full request and call ' + SHOP.phone + ' to read out your request.</p></div>';

    var copyBtn = document.getElementById('copy-ref');
    if (copyBtn) copyBtn.addEventListener('click', function () {
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(body).then(function () { copyBtn.textContent = 'Copied'; }, function () {});
    });
    var full=document.createElement('pre');full.textContent=body;full.style.cssText='white-space:pre-wrap;font:inherit;font-size:.85rem;overflow-wrap:anywhere';box.appendChild(full);
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /* ---------- wire up ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-add]') : null;
    if (t) {
      add(t.getAttribute('data-add'), t.getAttribute('data-group'));
      t.textContent = 'On your shortlist';
      t.classList.add('added');
      openDrawer();
      return;
    }
    var r = e.target.closest ? e.target.closest('[data-remove]') : null;
    if (r) { remove(r.getAttribute('data-remove')); return; }
    if (e.target.closest && e.target.closest('[data-open-drawer]')) { openDrawer(); return; }
    var chip = e.target.closest ? e.target.closest('.chip') : null;
    if (chip) {
      var f = chip.getAttribute('data-filter');
      var chips = document.querySelectorAll('.chip');
      for (var i = 0; i < chips.length; i++) chips[i].setAttribute('aria-pressed', String(chips[i] === chip));
      var items = document.querySelectorAll('#ranges-grid .item');
      for (var j = 0; j < items.length; j++) {
        var tags = items[j].getAttribute('data-tags') || '';
        items[j].hidden = f !== 'all' && tags.indexOf(f) === -1;
      }
    }
  });

  var openBtn = document.getElementById('basket-open');
  if (openBtn) openBtn.addEventListener('click', openDrawer);
  document.getElementById('drawer-close').addEventListener('click', closeDrawer);
  backdrop.addEventListener('click', closeDrawer);
  document.getElementById('request-form').addEventListener('submit', onSubmit);

  var y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());

  renderStatus(); markToday(); renderBasket();
  setInterval(renderStatus, 60000);
})();
