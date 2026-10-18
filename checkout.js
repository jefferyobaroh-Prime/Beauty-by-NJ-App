/* checkout.js: the checkout page.
   Needs, loaded before it: njauth.js, config.js, njcart.js, njorders.js (checkout.html already does this). */
(function () {
  'use strict';
 
  /* ---------- rules you can change ---------- */
  const DELIVERY_STATES = ['Lagos'];                       // states we deliver to. Add more names to open them up.
  const PENDING_KEY     = 'njPendingOrder';                // keeps the same order number if the page is refreshed
  const NG_STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta',
    'Ebonyi','Edo','Ekiti','Enugu','FCT (Abuja)','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi',
    'Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];
 
  /* ---------- guards: must be signed in, and must have something in the cart ---------- */
  const user = NJ.current();
  if (!user) { location.replace('signin.html'); return; }
  if (NJCart.items().length === 0) { location.replace('cart.html'); return; }
 
  const $ = (id) => document.getElementById(id);
  const form      = $('checkoutForm');
  const placeBtn  = $('coPlace');
  const errorEl   = $('coError');
  const toastEl   = $('toast');
 
  let done    = false;       // true once the order is saved, so nothing redraws while we leave
  let busy    = false;       // true while a payment is in progress (blocks double clicks)
  let addrMode = 'saved';    // 'saved' = pick one of the saved addresses, 'new' = typing a new one
  let selectedId = '';
 
  // one order number for this visit (also used as the bank transfer narration)
  let orderId = '';
  try { orderId = sessionStorage.getItem(PENDING_KEY) || ''; } catch (e) { /* storage blocked: fine */ }
  if (!orderId) {
    orderId = NJOrders.newId();
    try { sessionStorage.setItem(PENDING_KEY, orderId); } catch (e) { /* ignore */ }
  }
 
  /* ---------- small helpers ---------- */
  const naira = (n) => NJCart.formatNaira(n);
 
  let toastTimer;
  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
  }
 
  function clearError() {
    errorEl.hidden = true;
    errorEl.textContent = '';
    form.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
  }
 
  function fail(input, message) {
    if (input) { input.classList.add('invalid'); input.focus(); }
    errorEl.textContent = message;
    errorEl.hidden = false;
    errorEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return false;
  }
 
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
 
  function displayName(u) { return (u.name || '').trim() || u.email.split('@')[0]; }
 
  /* ---------- 1. contact ---------- */
  const nameEl  = $('coName');
  const emailEl = $('coEmail');
  const phoneEl = $('coPhone');
 
  const savedList = () => NJ.addresses().slice().sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
 
  nameEl.value  = displayName(user);
  emailEl.value = user.email;
  phoneEl.value = user.phone || ((savedList()[0] || {}).phone || '');
 
  /* ---------- 2. delivery address ---------- */
  const addrListEl = $('coAddrList');
  const addNewBtn  = $('coAddNew');
  const newAddrEl  = $('coNewAddr');
  const cancelNew  = $('coCancelNew');
  const labelEl    = $('coLabel');
  const streetEl   = $('coStreet');
  const cityEl     = $('coCity');
  const stateEl    = $('coState');
  const saveAddrEl = $('coSaveAddr');
  const zoneNotice = $('coZoneNotice');
 
  NG_STATES.forEach(s => stateEl.append(new Option(s, s)));
  stateEl.value = 'Lagos';
 
  function renderAddresses() {
    const list = savedList();
    addrListEl.replaceChildren();
 
    if (list.length === 0) addrMode = 'new';                         // nothing saved yet: go straight to the form
    if (addrMode === 'saved' && !list.some(a => a.id === selectedId)) selectedId = list[0].id;
 
    list.forEach(a => {
      const card = el('label', 'coAddr');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'addr';
      radio.value = a.id;
      radio.checked = addrMode === 'saved' && a.id === selectedId;
      radio.addEventListener('change', () => {
        addrMode = 'saved';
        selectedId = a.id;
        syncAddressUI();
      });
 
      const body = el('span', 'coAddrBody');
      body.append(
        el('span', 'coAddrTag', a.isDefault ? a.label + ' • Default' : a.label),
        el('span', 'coAddrStreet', a.street),
        el('span', 'coAddrPlace', a.city + ', ' + a.state)
      );
      card.append(radio, body);
      addrListEl.append(card);
    });
 
    syncAddressUI();
  }
 
  function syncAddressUI() {
    const hasSaved = savedList().length > 0;
    newAddrEl.hidden  = addrMode !== 'new';
    addNewBtn.hidden  = !hasSaved || addrMode === 'new';
    cancelNew.hidden  = !hasSaved;
    addrListEl.hidden = !hasSaved;
    if (addrMode === 'new') addrListEl.querySelectorAll('input[name="addr"]').forEach(r => { r.checked = false; });
    checkZone();
  }
 
  addNewBtn.addEventListener('click', () => {
    addrMode = 'new';
    syncAddressUI();
    streetEl.focus();
  });
  cancelNew.addEventListener('click', () => {
    addrMode = 'saved';
    selectedId = (savedList()[0] || {}).id || '';
    renderAddresses();
  });
  stateEl.addEventListener('change', checkZone);
 
  // the state of whichever address is currently chosen
  function chosenState() {
    if (addrMode === 'new') return stateEl.value;
    const a = savedList().find(x => x.id === selectedId);
    return a ? a.state : '';
  }
 
  function checkZone() {
    const state = chosenState();
    const bad = state && !DELIVERY_STATES.includes(state);
    zoneNotice.hidden = !bad;
    if (bad) zoneNotice.textContent = 'We only deliver within ' + DELIVERY_STATES.join(', ') + ' for now. ' +
      'Please choose an address in ' + DELIVERY_STATES.join(' or ') + ' to continue.';
    return !bad;
  }
 
  /* ---------- 3. payment options ---------- */
  const payRadios = Array.from(form.querySelectorAll('input[name="pay"]'));
  const notes = { paystack: $('payNotePaystack'), transfer: $('payNoteTransfer'), cod: $('payNoteCod') };
 
  const paystackKey = () => (typeof PAYSTACK !== 'undefined' && PAYSTACK.publicKey) ? String(PAYSTACK.publicKey).trim() : '';
  const paystackMode = () => {                      // 'live', 'test', 'secret' (a mistake) or 'demo' (no key set)
    const k = paystackKey();
    if (/^sk_/.test(k)) return 'secret';
    if (/^pk_live_/.test(k)) return 'live';
    if (/^pk_test_/.test(k)) return 'test';
    return 'demo';
  };
 
  const payMethod = () => (payRadios.find(r => r.checked) || {}).value || 'paystack';
 
  function syncPayment() {
    const method = payMethod();
    Object.keys(notes).forEach(k => { notes[k].hidden = k !== method; });
 
    if (method === 'paystack') {
      const mode = paystackMode();
      const note = notes.paystack;
      if (mode === 'demo') {
        note.textContent = 'Demo mode: no Paystack key is set yet, so this will pretend the payment went through.';
      } else if (mode === 'test') {
        note.textContent = 'Test mode: use the Paystack test card 4084 0840 8408 4081, any future expiry date and CVV 408. ' +
          'If it asks, the PIN is 0000 and the OTP is 123456. No real money moves.';
      } else if (mode === 'secret') {
        note.textContent = 'The key in config.js starts with sk_. That is a SECRET key and must not be used here. Use the public key (pk_test_...).';
      } else {
        note.textContent = '';
        note.hidden = true;
      }
    }
    updatePlaceLabel();
  }
  payRadios.forEach(r => r.addEventListener('change', syncPayment));
 
  function updatePlaceLabel() {
    if (busy) return;
    const s = NJCart.summary();
    const method = payMethod();
    placeBtn.textContent =
      method === 'paystack' ? 'Pay ' + naira(s.total) + ' with Paystack' :
      method === 'transfer' ? 'I have paid, place order' :
                              'Place order';
  }
 
  /* ---------- the order summary on the right ---------- */
  function renderSummary() {
    if (done) return;
    const s = NJCart.summary();
    if (s.items.length === 0) { location.replace('cart.html'); return; }
 
    const list = $('coItems');
    list.replaceChildren();
    s.items.forEach(i => {
      const li = el('li', 'coItem');
 
      const thumb = el('span', 'coThumb');
      const initial = (i.brand || i.name || '?').trim()[0].toUpperCase();
      if (i.image) {
        const img = document.createElement('img');
        img.src = i.image;
        img.alt = '';
        img.loading = 'lazy';
        img.addEventListener('error', () => { thumb.replaceChildren(document.createTextNode(initial)); });
        thumb.append(img);
      } else {
        thumb.textContent = initial;
      }
 
      const info = el('span', 'coItemInfo');
      if (i.brand) info.append(el('span', 'coItemBrand', i.brand));
      info.append(el('span', 'coItemName', i.name), el('span', 'coItemQty', 'Qty ' + i.qty));
 
      li.append(thumb, info, el('span', 'coItemPrice', naira(i.price * i.qty)));
      list.append(li);
    });
 
    $('coSubtotal').textContent = naira(s.subtotal);
    $('coDiscountRow').hidden = s.discount === 0;
    $('coDiscount').textContent = '-' + naira(s.discount);
    $('coPromoLine').hidden = !s.code;
    if (s.code) $('coPromoText').textContent = 'Code ' + s.code + ' (' + s.percent + '% off)';
    $('coDelivery').textContent = s.delivery === 0 ? 'Free' : naira(s.delivery);
    $('coTotal').textContent = naira(s.total);
 
    // bank transfer details
    const bank = (typeof BANK_TRANSFER !== 'undefined') ? BANK_TRANSFER : { bank: '', name: '', number: '' };
    $('trBank').textContent   = bank.bank;
    $('trName').textContent   = bank.name;
    $('trNumber').textContent = bank.number;
    $('trAmount').textContent = naira(s.total);
    $('trRef').textContent    = orderId;
 
    updatePlaceLabel();
  }
 
  window.addEventListener('njcart', renderSummary);                       // cart changed in another tab
  window.addEventListener('pageshow', (e) => {                            // came back with the Back button
    if (e.persisted && NJCart.items().length === 0 && !done) location.replace('cart.html');
  });
 
  /* ---------- validating the form ---------- */
  // returns { contact, address, note } or null (after showing the problem)
  function collect() {
    clearError();
 
    const name = nameEl.value.trim();
    if (name.length < 2) { fail(nameEl, 'Please enter your full name.'); return null; }
 
    const phone = phoneEl.value.replace(/\s/g, '');
    if (!/^(\+234|0)\d{10}$/.test(phone)) {
      fail(phoneEl, 'Enter a Nigerian phone number like 08012345678 or +2348012345678.');
      return null;
    }
 
    let address;
    if (addrMode === 'saved') {
      const a = savedList().find(x => x.id === selectedId);
      if (!a) { fail(null, 'Please choose a delivery address.'); return null; }
      address = { label: a.label, street: a.street, city: a.city, state: a.state, phone };
    } else {
      const street = streetEl.value.trim();
      const city   = cityEl.value.trim();
      if (street.length < 5) { fail(streetEl, 'Please enter your street address.'); return null; }
      if (city.length < 2)   { fail(cityEl, 'Please enter your city or area.'); return null; }
      address = { label: labelEl.value, street, city, state: stateEl.value, phone };
    }
 
    if (!DELIVERY_STATES.includes(address.state)) {
      checkZone();
      fail(null, 'We cannot deliver to ' + address.state + ' yet. Please use an address in ' + DELIVERY_STATES.join(' or ') + '.');
      return null;
    }
 
    return {
      contact: { name, email: user.email, phone },
      address,
      note: $('coNote').value.trim().slice(0, 300),
      saveNew: addrMode === 'new' && saveAddrEl.checked
    };
  }
 
  /* ---------- placing the order ---------- */
  function setBusy(on, text) {
    busy = on;
    placeBtn.disabled = on;
    if (on) placeBtn.textContent = text || 'Please wait...';
    else updatePlaceLabel();
  }
 
  // saves the order on the account, empties the cart and moves to the thank-you page
  function finalize(payment, ctx) {
    if (done) return;
    const snap = ctx.snap;
 
    if (ctx.saveNew) {
      try { NJ.saveAddress({ label: ctx.address.label, street: ctx.address.street, city: ctx.address.city, state: ctx.address.state, phone: ctx.address.phone }); }
      catch (e) { console.warn('[checkout] could not save the address', e); }
    }
 
    const order = NJOrders.create({
      id: orderId,
      status: 'Processing',
      createdAt: new Date().toISOString(),
      items: snap.items.map(i => ({ id: i.id, brand: i.brand, name: i.name, image: i.image, price: i.price, qty: i.qty })),
      subtotal: snap.subtotal,
      promoCode: snap.code,
      discount: snap.discount,
      delivery: snap.delivery,
      total: snap.total,
      contact: ctx.contact,
      address: ctx.address,
      note: ctx.note,
      payment
    });
 
    if (!order) {
      setBusy(false);
      const paidMsg = payment.status === 'paid' ? ' Your payment did go through (reference ' + payment.reference + '), so please keep it and contact us.' : '';
      fail(null, 'We could not save your order on this device. Check that the browser allows site storage and try again.' + paidMsg);
      return;
    }
 
    done = true;
    try { sessionStorage.removeItem(PENDING_KEY); } catch (e) { /* ignore */ }
    NJCart.clear();
    location.href = 'order-success.html?id=' + encodeURIComponent(order.id);
  }
 
  function loadPaystack() {
    return new Promise((resolve, reject) => {
      if (window.PaystackPop) { resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://js.paystack.co/v1/inline.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('Paystack script did not load'));
      document.head.append(s);
    });
  }
 
  async function payWithPaystack(ctx) {
    const mode = paystackMode();
 
    if (mode === 'secret') {
      setBusy(false);
      fail(null, 'config.js has a Paystack SECRET key (sk_...). Replace it with your PUBLIC test key (pk_test_...) and refresh.');
      return;
    }
 
    // no key yet: pretend, so the whole flow can still be shown
    if (mode === 'demo') {
      setBusy(true, 'Processing payment...');
      setTimeout(() => finalize({ method: 'paystack', status: 'paid', mode: 'demo', reference: orderId }, ctx), 1600);
      return;
    }
 
    setBusy(true, 'Opening Paystack...');
    try { await loadPaystack(); }
    catch (e) {
      setBusy(false);
      fail(null, 'We could not reach Paystack. Check your internet connection and try again.');
      return;
    }
 
    let paid = false;
    // a fresh reference for every attempt: Paystack rejects a reference it has already seen
    const reference = orderId + '-' + Date.now().toString(36);
 
    const handler = window.PaystackPop.setup({
      key: paystackKey(),
      email: ctx.contact.email,
      amount: Math.round(ctx.snap.total * 100),                 // Paystack counts in kobo
      currency: (typeof PAYSTACK !== 'undefined' && PAYSTACK.currency) || 'NGN',
      ref: reference,
      metadata: {
        custom_fields: [
          { display_name: 'Order number', variable_name: 'order_number', value: orderId },
          { display_name: 'Customer',     variable_name: 'customer',     value: ctx.contact.name },
          { display_name: 'Phone',        variable_name: 'phone',        value: ctx.contact.phone }
        ]
      },
      callback: function (response) {                          // must be a normal function, not async
        paid = true;
        finalize({ method: 'paystack', status: 'paid', mode: mode, reference: (response && response.reference) || reference }, ctx);
      },
      onClose: function () {
        if (paid || done) return;
        setBusy(false);
        showToast('Payment cancelled. Your cart is still here.');
      }
    });
    setBusy(true, 'Waiting for payment...');
    handler.openIframe();
  }
 
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (busy || done) return;
 
    const data = collect();
    if (!data) return;
 
    const snap = NJCart.summary();
    if (snap.items.length === 0) { location.replace('cart.html'); return; }
 
    const ctx = { ...data, snap };
    const method = payMethod();
 
    if (method === 'paystack') { payWithPaystack(ctx); return; }
 
    setBusy(true, 'Placing your order...');
    if (method === 'transfer') {
      finalize({ method: 'transfer', status: 'awaiting', mode: '', reference: orderId }, ctx);
    } else {
      finalize({ method: 'cod', status: 'on-delivery', mode: '', reference: orderId }, ctx);
    }
  });
 
  // clear a red field as soon as the person starts fixing it
  form.addEventListener('input', (e) => { if (e.target.classList) e.target.classList.remove('invalid'); });
 
  /* ---------- go ---------- */
  renderAddresses();
  syncPayment();
  renderSummary();
})();
 