/* Themes page (2026-11-23): a menu of the 30 themes by family, one theme's films at a time, steps between themes.
   Reads the page's own index (.theme-index) and lists (.fam, .facet-list > li[id]); without this script every list shows. */
(function () {
  'use strict';
  var idx = document.querySelector('.theme-index');
  var items = Array.prototype.slice.call(document.querySelectorAll('.fam .facet-list > li[id]'));
  if (!idx || !items.length) return;
  var root = document.documentElement;
  root.classList.add('themes-js');
  var byId = {};
  items.forEach(function (li) { byId[li.id] = li; });
  var nameOf = function (li) { var h = li.querySelector('h2'); return h ? h.textContent.trim() : li.id; };

  // the bar: one menu (grouped by family, with counts), previous and next, and All themes
  var bar = document.createElement('div');
  bar.className = 'theme-bar';
  var pick = document.createElement('details');
  pick.className = 'theme-pick';
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
      var t = document.createElement('span'); t.textContent = a.textContent;
      var n = document.createElement('span'); n.className = 'n'; n.textContent = (li.querySelector('.n') || {}).textContent || '';
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
  all.type = 'button'; all.className = 'all'; all.textContent = 'All themes';
  [pick, prev, next, all].forEach(function (x) { bar.appendChild(x); });
  idx.parentNode.insertBefore(bar, idx);

  function show(id, scroll) {
    var li = byId[id];
    items.forEach(function (x) { x.classList.toggle('on', x === li); });
    document.querySelectorAll('.fam').forEach(function (f) { f.classList.toggle('on', !!li && f.contains(li)); });
    root.classList.toggle('theme-open', !!li);
    var i = items.indexOf(li);
    label.textContent = li ? nameOf(li) : 'Choose a theme';
    prev.disabled = !li || i <= 0;
    next.disabled = !li || i >= items.length - 1;
    prev.title = prev.disabled ? '' : nameOf(items[i - 1]);
    next.title = next.disabled ? '' : nameOf(items[i + 1]);
    prev.setAttribute('aria-label', prev.title || 'Previous theme');
    next.setAttribute('aria-label', next.title || 'Next theme');
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

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (a && byId[a.getAttribute('href').slice(1)] && (bar.contains(a) || idx.contains(a))) { e.preventDefault(); go(a.getAttribute('href').slice(1)); return; }
    if (pick.open && !pick.contains(e.target)) pick.open = false;
  });
  prev.addEventListener('click', function () { var i = items.findIndex(function (x) { return x.classList.contains('on'); }); if (i > 0) go(items[i - 1].id); });
  next.addEventListener('click', function () { var i = items.findIndex(function (x) { return x.classList.contains('on'); }); if (i < items.length - 1) go(items[i + 1].id); });
  all.addEventListener('click', function () { go(''); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pick.open) { pick.open = false; sum.focus(); } });
  window.addEventListener('popstate', function () { fromHash(true); });
  window.addEventListener('hashchange', function () { fromHash(true); });
  fromHash(false);
  if (root.classList.contains('theme-open')) { var t = bar.getBoundingClientRect().top + window.scrollY - 8; window.scrollTo(0, t); }
})();
