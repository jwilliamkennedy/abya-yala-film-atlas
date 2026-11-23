/* Themes and Languages pages (2026-11-23): a menu of every entry by group, one entry's films at a time, steps between
   entries. Reads the page's own index (.facet-index, with its labels in data-*) and lists (.facet-list > li[id]);
   without this script every list shows. */
(function () {
  'use strict';
  var idx = document.querySelector('.facet-index');
  var items = Array.prototype.slice.call(document.querySelectorAll('.facet-list > li[id]'));
  if (!idx || !items.length) return;
  var L = { choose: idx.dataset.choose || 'Choose', all: idx.dataset.all || 'All', prev: idx.dataset.prev || 'Previous', next: idx.dataset.next || 'Next' };
  var root = document.documentElement;
  root.classList.add('facets-js');
  var byId = {};
  items.forEach(function (li) { byId[li.id] = li; });
  var nameOf = function (li) { var h = li.querySelector('h2'); return h ? h.textContent.trim() : li.id; };
  // "47 films · ▶ Watch 22": the count and what follows sit side by side, so the dots between them go
  document.querySelectorAll('.facet-list .codes').forEach(function (p) {
    p.childNodes.forEach(function (x) { if (x.nodeType === 3) x.nodeValue = x.nodeValue.replace(/^\s*·\s*/, ' ').replace(/\s*·\s*$/, ''); });
  });

  // the bar: one menu (grouped, with counts), previous and next, and All
  var bar = document.createElement('div');
  bar.className = 'facet-bar';
  var pick = document.createElement('details');
  pick.className = 'facet-pick';
  var sum = document.createElement('summary');
  var label = document.createElement('span');
  sum.appendChild(label);
  pick.appendChild(sum);
  var panel = document.createElement('div');
  idx.querySelectorAll('section').forEach(function (sec) {
    var col = document.createElement('div');
    var h = document.createElement('h3');
    h.textContent = sec.querySelector('h2').textContent;
    col.appendChild(h);
    sec.querySelectorAll('li').forEach(function (li) {
      var a = li.querySelector('a');
      if (!a || !byId[a.getAttribute('href').slice(1)]) return;
      var b = document.createElement('a');
      b.href = a.getAttribute('href');
      var t = document.createElement('span'); t.textContent = (a.querySelector('.nm') || a).textContent;
      var n = document.createElement('span'); n.className = 'n'; n.textContent = (a.querySelector('.n') || {}).textContent || '';
      b.appendChild(t); b.appendChild(n);
      col.appendChild(b);
    });
    panel.appendChild(col);
  });
  pick.appendChild(panel);
  var prev = document.createElement('button');
  prev.type = 'button'; prev.className = 'step'; prev.textContent = '←';
  var next = document.createElement('button');
  next.type = 'button'; next.className = 'step'; next.textContent = '→';
  var all = document.createElement('button');
  all.type = 'button'; all.className = 'all'; all.textContent = L.all;
  [pick, prev, next, all].forEach(function (x) { bar.appendChild(x); });
  idx.parentNode.insertBefore(bar, idx);

  function show(id, scroll) {
    var li = byId[id];
    items.forEach(function (x) { x.classList.toggle('on', x === li); });
    document.querySelectorAll('.fam').forEach(function (f) { f.classList.toggle('on', !!li && f.contains(li)); });
    root.classList.toggle('facet-open', !!li);
    var i = items.indexOf(li);
    label.textContent = li ? nameOf(li) : L.choose;
    prev.disabled = !li || i <= 0;
    next.disabled = !li || i >= items.length - 1;
    prev.title = prev.disabled ? '' : nameOf(items[i - 1]);
    next.title = next.disabled ? '' : nameOf(items[i + 1]);
    prev.setAttribute('aria-label', prev.title || L.prev);
    next.setAttribute('aria-label', next.title || L.next);
    all.setAttribute('aria-pressed', li ? 'false' : 'true');
    panel.querySelectorAll('a').forEach(function (a) { a.setAttribute('aria-current', a.getAttribute('href') === '#' + id ? 'true' : 'false'); });
    pick.open = false;
    if (scroll) {
      var top = bar.getBoundingClientRect().top + window.scrollY - 8;
      if (window.scrollY > top || !li) window.scrollTo({ top: li ? top : 0, behavior: 'auto' });
    }
  }
  function go(id) {
    if (id) history.pushState(null, '', '#' + id);
    else history.pushState(null, '', location.pathname + location.search);
    show(id, true);
  }
  function fromHash(scroll) { var id = decodeURIComponent(location.hash.slice(1)); show(byId[id] ? id : '', scroll); }
  function current() { return items.findIndex(function (x) { return x.classList.contains('on'); }); }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (a && byId[a.getAttribute('href').slice(1)] && (bar.contains(a) || idx.contains(a))) { e.preventDefault(); go(a.getAttribute('href').slice(1)); return; }
    if (pick.open && !pick.contains(e.target)) pick.open = false;
  });
  prev.addEventListener('click', function () { var i = current(); if (i > 0) go(items[i - 1].id); });
  next.addEventListener('click', function () { var i = current(); if (i < items.length - 1) go(items[i + 1].id); });
  all.addEventListener('click', function () { go(''); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pick.open) { pick.open = false; sum.focus(); } });
  window.addEventListener('popstate', function () { fromHash(true); });
  window.addEventListener('hashchange', function () { fromHash(true); });
  fromHash(false);
  if (root.classList.contains('facet-open')) { var t = bar.getBoundingClientRect().top + window.scrollY - 8; window.scrollTo(0, t); }
})();
