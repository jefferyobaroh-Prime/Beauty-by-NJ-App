/* faq.js: search, expand/collapse all, menu highlight, and opening a question from a link (faq.html#delivery-fee). */
(function () {
  'use strict';

  const items   = Array.from(document.querySelectorAll('.faqItem'));
  const groups  = Array.from(document.querySelectorAll('.faqGroup'));
  const links   = Array.from(document.querySelectorAll('.faqMenuLink'));
  const search  = document.getElementById('faqSearch');
  const status  = document.getElementById('faqStatus');
  const toggle  = document.getElementById('faqToggleAll');
  const empty   = document.getElementById('faqEmpty');
  const clear   = document.getElementById('faqClear');
  if (!items.length) return;

  const total = items.length;
  const smooth = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

  // text of each question + answer, in lower case, for searching
  const haystack = new Map(items.map(function (it) { return [it, it.textContent.toLowerCase().replace(/\s+/g, ' ')]; }));
  const openedBySearch = new Set();

  const visibleItems = function () { return items.filter(function (it) { return !it.hidden; }); };
  const plural = function (n) { return n + (n === 1 ? ' question' : ' questions'); };

  /* ---------- search ---------- */
  function applySearch() {
    const q = search.value.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    let shown = 0;

    items.forEach(function (it) {
      const ok = words.every(function (w) { return haystack.get(it).indexOf(w) !== -1; });
      it.hidden = !ok;
      if (ok) shown++;

      if (q.length >= 2 && ok) {                    // open the matches so the answer is right there
        if (!it.open) { it.open = true; openedBySearch.add(it); }
      } else if (openedBySearch.has(it)) {          // put back what the search opened
        it.open = false; openedBySearch.delete(it);
      }
    });

    groups.forEach(function (g) {
      g.hidden = !g.querySelector('.faqItem:not([hidden])');
      const link = document.querySelector('.faqMenuLink[href="#' + g.id + '"]');
      if (link) link.classList.toggle('faqDim', g.hidden);
    });

    empty.hidden = shown !== 0;
    status.textContent = q ? plural(shown) + ' match "' + search.value.trim() + '"' : plural(total);
    syncToggle();
  }

  search.addEventListener('input', applySearch);
  search.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && search.value) { search.value = ''; applySearch(); }
  });
  clear.addEventListener('click', function () { search.value = ''; applySearch(); search.focus(); });

  /* ---------- expand all / collapse all ---------- */
  function syncToggle() {
    const vis = visibleItems();
    const allOpen = vis.length > 0 && vis.every(function (it) { return it.open; });
    toggle.textContent = allOpen ? 'Collapse all' : 'Expand all';
    toggle.disabled = vis.length === 0;
  }

  toggle.addEventListener('click', function () {
    const vis = visibleItems();
    const open = !vis.every(function (it) { return it.open; });
    vis.forEach(function (it) { it.open = open; openedBySearch.delete(it); });
    syncToggle();
  });

  // keep the button in step when someone opens or closes a single question
  // ("toggle" does not bubble, so we listen in the capture phase)
  document.addEventListener('toggle', function (e) {
    const it = e.target;
    if (!it.classList || !it.classList.contains('faqItem')) return;
    syncToggle();
  }, true);

  /* ---------- menu: highlight the topic you are reading ---------- */
  function setCurrent(id) {
    links.forEach(function (a) {
      if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  if ('IntersectionObserver' in window) {
    const seen = new Map();
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { seen.set(en.target.id, en.isIntersecting ? en.boundingClientRect.top : null); });
      let best = null;
      groups.forEach(function (g) {
        const top = seen.get(g.id);
        if (top === null || top === undefined || g.hidden) return;
        if (best === null || top < seen.get(best)) best = g.id;
      });
      if (best) setCurrent(best);
    }, { rootMargin: '-20% 0px -60% 0px', threshold: 0 });
    groups.forEach(function (g) { io.observe(g); });
  }
  if (groups[0]) setCurrent(groups[0].id);

  links.forEach(function (a) {
    a.addEventListener('click', function (e) {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      if (target.hidden) { search.value = ''; applySearch(); }      // a search was hiding it
      target.scrollIntoView({ behavior: smooth, block: 'start' });
      setCurrent(target.id);
      history.replaceState(null, '', '#' + target.id);
    });
  });

  /* ---------- open a question from a link: faq.html#delivery-fee ---------- */
  function openFromHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;

    if (target.classList.contains('faqItem')) {
      if (target.hidden) { search.value = ''; applySearch(); }
      target.open = true;
      target.classList.remove('faqFlash');
      void target.offsetWidth;                        // lets the flash play again
      target.classList.add('faqFlash');
    }
    target.scrollIntoView({ behavior: smooth, block: 'start' });
    const group = target.closest('.faqGroup');
    if (group) setCurrent(group.id);
  }

  window.addEventListener('hashchange', openFromHash);
  window.addEventListener('load', function () { if (location.hash) setTimeout(openFromHash, 50); });

  syncToggle();
})();