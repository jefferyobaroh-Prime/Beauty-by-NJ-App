(function () {
  'use strict';

  const SHOP_PAGE = 'shop.html';

  const FORM_SELECTORS   = '#navSearch, .navSearch, form[role="search"]';
  const INPUT_SELECTORS  = '#navSearchInput, #searchInput, .searchInput, input[type="search"], input[name="q"]';
  const BUTTON_SELECTORS = '#navSearchBtn, #searchBtn, .searchBtn, .searchButton, button[aria-label*="earch" i]';

  const form  = document.querySelector(FORM_SELECTORS);
  const input = (form && form.querySelector(INPUT_SELECTORS)) || document.querySelector(INPUT_SELECTORS);
  const button = (form && form.querySelector(BUTTON_SELECTORS)) || document.querySelector(BUTTON_SELECTORS);
  if (!input && !button) return;

  const phone = window.matchMedia('(max-width: 900px)');
  const wrap  = form || (input && input.parentElement) || (button && button.parentElement);

  function go() {
    const term = (input ? input.value : '').trim().replace(/\s+/g, ' ');
    if (!term) { openBox(); return; }                 // empty: just open/focus the box, never send people to an empty page
    location.href = SHOP_PAGE + '?q=' + encodeURIComponent(term);
  }

  function openBox() {
    if (wrap) wrap.classList.add('open');
    if (input) input.focus();
  }
  function closeBox() { if (wrap) wrap.classList.remove('open'); }

  // Enter key
  if (input) {
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); go(); }
      if (e.key === 'Escape') { input.value = ''; closeBox(); input.blur(); }
    });
  }

  // the button
  if (button) {
    button.addEventListener('click', function (e) {
      e.preventDefault();
      const boxIsHidden = phone.matches && wrap && !wrap.classList.contains('open');
      if (boxIsHidden) { openBox(); return; }         // on a phone the first tap only opens the box
      go();
    });
  }

  // if it is a real <form>, pressing submit does the same thing
  if (form) {
    form.addEventListener('submit', function (e) { e.preventDefault(); go(); });
  }

  // tap outside the open box on a phone to close it
  document.addEventListener('click', function (e) {
    if (wrap && wrap.classList.contains('open') && !wrap.contains(e.target)) closeBox();
  });

  // coming from a results page? keep the word in the box
  if (input && !input.value) {
    const q = new URLSearchParams(location.search).get('q');
    if (q) input.value = q;
  }
})();