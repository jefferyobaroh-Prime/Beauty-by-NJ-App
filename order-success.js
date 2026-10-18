* order-success.js: the thank-you page. Shows one saved order, picked by ?id=NJ-... in the address bar. */
(function () {
  'use strict';
 
  const user = NJ.current();
  if (!user) { location.replace('signin.html'); return; }
 
  const wrap = document.getElementById('osWrap');
  const id   = new URLSearchParams(location.search).get('id') || '';
  const order = id ? NJOrders.get(id) : null;
 
  const naira = (n) => NJCart.formatNaira(n);
 
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
 
  function row(label, value, extraClass) {
    const r = el('div', extraClass || '');
    r.append(el('span', '', label), el('span', '', value));
    return r;
  }
 
  /* ---------- no such order ---------- */
  if (!order) {
    document.title = 'Order not found | Beauty by NJ';
    const box = el('div', 'osCard osCenter');
    box.append(
      el('h1', '', 'We could not find that order'),
      el('p', 'osLead', 'It may belong to a different account, or it was placed in another browser.')
    );
    const actions = el('div', 'osActions');
    const a1 = el('a', 'emptyBtn', 'See my orders'); a1.href = 'profile.html#orders';
    const a2 = el('a', 'osGhost', 'Keep shopping'); a2.href = 'shop.html';
    actions.append(a1, a2);
    box.append(actions);
    wrap.append(box);
    return;
  }
 
  document.title = 'Order ' + order.id + ' | Beauty by NJ';
 
  const pay = order.payment || {};
  const firstName = ((order.contact && order.contact.name) || '').trim().split(/\s+/)[0] || 'there';
 
  /* ---------- the message at the top ---------- */
  const top = el('section', 'osCard osCenter');
 
  const tick = el('div', 'osTick');
  tick.setAttribute('aria-hidden', 'true');
  tick.innerHTML = '<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';   // fixed icon, no user text in it
 
  const lead = el('p', 'osLead');
 
  const msg = el('p', 'osMsg');
  const idTag = () => el('strong', 'osNoWrap', order.id);          // keeps the order number on one line
  if (pay.status === 'paid') {
    msg.append('Payment received' + (pay.mode === 'demo' ? ' (demo payment)' : pay.mode === 'test' ? ' (test payment)' : '') + '. We are packing your order now.');
  } else if (pay.status === 'awaiting') {
    msg.append('We are waiting for your bank transfer of ' + naira(order.total) + '. Use ', idTag(), ' as the narration. We start packing as soon as it is confirmed.');
  } else {
    msg.append('Please pay ' + naira(order.total) + ' to the rider when your order arrives.');
  }
 
  lead.replaceChildren('Your order ', idTag(), ' has been placed.');
  top.append(tick, el('h1', '', 'Thank you, ' + firstName + '!'), lead, msg);
 
  if (pay.status === 'awaiting' && typeof BANK_TRANSFER !== 'undefined') {
    const bank = el('dl', 'osBank');
    [['Bank', BANK_TRANSFER.bank], ['Account name', BANK_TRANSFER.name], ['Account number', BANK_TRANSFER.number], ['Amount', naira(order.total)], ['Narration', order.id]]
      .forEach(([k, v]) => { const d = el('div'); d.append(el('dt', '', k), el('dd', '', v)); bank.append(d); });
    top.append(bank);
  }
 
  /* ---------- details ---------- */
  const details = el('section', 'osCard');
  const grid = el('div', 'osGrid');
 
  const created = new Date(order.createdAt);
  const from = new Date(created); from.setDate(from.getDate() + 2);
  const to   = new Date(created); to.setDate(to.getDate() + 4);
  const fmt  = (d) => d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' });
 
  const a = order.address || {};
  const blocks = [
    ['Delivery address', [a.label ? a.label + ' address' : '', a.street, [a.city, a.state].filter(Boolean).join(', '), a.phone ? 'Phone: ' + a.phone : ''].filter(Boolean)],
    ['Payment', [NJOrders.paymentLabel(pay)]],
    ['Estimated delivery', isNaN(created) ? ['2 to 4 days'] : [fmt(from) + ' to ' + fmt(to)]]
  ];
  blocks.forEach(([title, lines]) => {
    const b = el('div', 'osBlock');
    b.append(el('h2', '', title));
    lines.forEach(line => b.append(el('p', '', line)));
    grid.append(b);
  });
  details.append(grid);
 
  if (order.note) {
    const n = el('div', 'osBlock osNote');
    n.append(el('h2', '', 'Delivery note'), el('p', '', order.note));
    details.append(n);
  }
 
  /* ---------- items and totals ---------- */
  const itemsCard = el('section', 'osCard');
  itemsCard.append(el('h2', 'osH', 'Items'));
 
  const ul = el('ul', 'coItems osItems');
  order.items.forEach(i => {
    const li = el('li', 'coItem');
    const thumb = el('span', 'coThumb');
    const initial = (i.brand || i.name || '?').trim()[0].toUpperCase();
    if (i.image) {
      const img = document.createElement('img');
      img.src = i.image; img.alt = ''; img.loading = 'lazy';
      img.addEventListener('error', () => { thumb.replaceChildren(document.createTextNode(initial)); });
      thumb.append(img);
    } else {
      thumb.textContent = initial;
    }
    const info = el('span', 'coItemInfo');
    if (i.brand) info.append(el('span', 'coItemBrand', i.brand));
    info.append(el('span', 'coItemName', i.name), el('span', 'coItemQty', 'Qty ' + i.qty + ' × ' + naira(i.price)));
    li.append(thumb, info, el('span', 'coItemPrice', naira(i.price * i.qty)));
    ul.append(li);
  });
  itemsCard.append(ul);
 
  const totals = el('div', 'priceDisplay osTotals');
  totals.append(row('Subtotal', naira(order.subtotal), 'subTotal'));
  if (order.discount) totals.append(row('Discount' + (order.promoCode ? ' (' + order.promoCode + ')' : ''), '-' + naira(order.discount), 'discount'));
  totals.append(row('Delivery', order.delivery === 0 ? 'Free' : naira(order.delivery), 'delivery'));
  totals.append(row('Total', naira(order.total), 'grandTotal'));
  itemsCard.append(totals);
 
  /* ---------- buttons ---------- */
  const actions = el('div', 'osActions');
  const view = el('a', 'emptyBtn', 'View my orders'); view.href = 'profile.html#orders';
  const keep = el('a', 'osGhost', 'Continue shopping'); keep.href = 'shop.html';
  const print = el('button', 'osGhost', 'Print receipt'); print.type = 'button';
  print.addEventListener('click', () => window.print());
  actions.append(view, keep, print);
 
  wrap.append(top, details, itemsCard, actions);
})();
 