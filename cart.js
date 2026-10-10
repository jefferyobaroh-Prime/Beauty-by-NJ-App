/* cart.js: the cart page. Reads the cart from njcart.js and draws it. */

const itemsBox   = document.getElementById('cartItems');
const emptyBox   = document.getElementById('cartEmpty');
const orderSum   = document.getElementById('orderSum');
const countEl    = document.getElementById('cartCount');
const promoBox   = document.getElementById('promoApplied');
const promoForm  = document.getElementById('promoForm');
const promoInput = document.getElementById('promoInput');
const promoError = document.getElementById('promoError');
const checkout   = document.getElementById('checkoutBtn');
const naira      = n => NJCart.formatNaira(n);

/* ---------- little message at the bottom ---------- */
let toastTimer;
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

/* ---------- a product picture, or its first letter if there is none ---------- */
function makeMedia(className, item, alt) {
  const box = document.createElement('div');
  box.className = className;
  const letter = () => {
    box.replaceChildren();
    box.textContent = (item.brand || item.name || '?').trim()[0].toUpperCase();
    box.classList.add('noImg');
  };
  if (item.image) {
    const img = new Image();
    img.alt = alt;
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.onerror = letter;
    img.src = item.image;
    box.append(img);
  } else {
    letter();
  }
  return box;
}

/* ---------- one line in the cart ---------- */
function makeRow(item) {
  const row = document.createElement('div');
  row.className = 'cartList';
  row.dataset.id = item.id;

  const info = document.createElement('div');
  info.className = 'itemInfo';
  const name = document.createElement('div');
  name.className = 'itemName';
  name.textContent = item.name;
  const meta = document.createElement('div');
  meta.className = 'itemMeta';
  meta.textContent = item.brand;
  info.append(name, meta);

  const unit = document.createElement('div');
  unit.className = 'itemUnit';
  unit.textContent = naira(item.price) + ' each';

  const stepper = document.createElement('div');
  stepper.className = 'qtyStepper';
  const dec = document.createElement('button');
  dec.type = 'button'; dec.className = 'qtyDec'; dec.textContent = '\u2212';
  dec.setAttribute('aria-label', 'Decrease quantity of ' + item.name);
  dec.disabled = item.qty <= 1;
  const val = document.createElement('span');
  val.className = 'qtyValue'; val.textContent = item.qty;
  const inc = document.createElement('button');
  inc.type = 'button'; inc.className = 'qtyInc'; inc.textContent = '+';
  inc.setAttribute('aria-label', 'Increase quantity of ' + item.name);
  inc.disabled = item.qty >= NJCart.MAX_QTY;
  stepper.append(dec, val, inc);

  const total = document.createElement('div');
  total.className = 'itemTotal';
  total.textContent = naira(item.price * item.qty);

  const remove = document.createElement('button');
  remove.type = 'button'; remove.className = 'removeBtn';
  remove.setAttribute('aria-label', 'Remove ' + item.name + ' from cart');
  remove.innerHTML = '<svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true"><use href="#ic-trash"></use></svg>';

  row.append(makeMedia('itemMedia', item, item.brand + ' ' + item.name), info, unit, stepper, total, remove);
  return row;
}

/* ---------- draw the whole page from the cart ---------- */
function render() {
  const s = NJCart.summary();
  const has = s.items.length > 0;

  // remember which button had the keyboard focus, so it is not lost when the row is redrawn
  const active = document.activeElement;
  const keep = active && active.closest && active.closest('.cartList')
    ? { id: active.closest('.cartList').dataset.id, cls: active.className.split(' ')[0] } : null;

  countEl.textContent = has ? s.count + (s.count === 1 ? ' item' : ' items') : '';
  itemsBox.replaceChildren(...s.items.map(makeRow));
  emptyBox.hidden = has;
  orderSum.hidden = !has;

  if (keep) {
    const again = [...itemsBox.querySelectorAll('.cartList')].find(r => r.dataset.id === keep.id);
    let btn = again && again.querySelector('.' + keep.cls);
    if (btn && btn.disabled) btn = again.querySelector('.qtyInc:not(:disabled), .qtyDec:not(:disabled)');   // that button just switched off: use its partner
    if (btn) btn.focus();
  }

  // promo
  promoBox.hidden = !s.code;
  promoForm.hidden = !!s.code;
  if (s.code) document.getElementById('promoText').textContent = s.code + ' applied - ' + s.percent + '% off';

  // numbers
  document.getElementById('sumSubtotal').textContent = naira(s.subtotal);
  document.getElementById('discountRow').hidden = s.discount === 0;
  document.getElementById('sumDiscount').textContent = '\u2212' + naira(s.discount);
  document.getElementById('sumDelivery').textContent = has && s.delivery === 0 ? 'Free' : naira(s.delivery);
  document.getElementById('sumTotal').textContent = naira(s.total);

  const nudge = document.getElementById('deliveryNudge');
  nudge.hidden = !has;
  nudge.textContent = s.toFreeDelivery > 0
    ? 'Add ' + naira(s.toFreeDelivery) + ' more to get free delivery'
    : 'You have free delivery';

  checkout.disabled = !has;

  if (has) loadRoutine();
}

/* ---------- + / - / remove (one listener for the whole list) ---------- */
itemsBox.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  const row = e.target.closest('.cartList');
  if (!btn || !row) return;
  const id = row.dataset.id;
  const line = NJCart.items().find(i => i.id === id);
  if (!line) return;

  try {
    if (btn.classList.contains('qtyInc'))      NJCart.setQty(id, line.qty + 1);
    else if (btn.classList.contains('qtyDec')) NJCart.setQty(id, line.qty - 1);
    else if (btn.classList.contains('removeBtn')) { NJCart.remove(id); showToast('Removed from cart'); }
  } catch {
    showToast("Couldn't update your cart. Browser storage may be full.");
  }
});

/* ---------- promo code ---------- */
promoForm.addEventListener('submit', (e) => {
  e.preventDefault();
  promoError.hidden = true;
  const code = promoInput.value.trim();
  if (!code) { promoError.textContent = 'Type a promo code first.'; promoError.hidden = false; return; }
  if (NJCart.applyPromo(code)) {
    promoInput.value = '';
    showToast('Promo code applied');
  } else {
    promoError.textContent = "That code isn't valid.";
    promoError.hidden = false;
    promoInput.focus();
  }
});
document.getElementById('promoRemove').addEventListener('click', () => NJCart.removePromo());

/* ---------- checkout ---------- */
checkout.addEventListener('click', () => {
  if (!NJ.current()) { location.href = 'signin.html'; return; }   // sign in first
  location.href = 'checkout.html';                                // the next page we build
});

/* ---------- "Complete your routine": 3 products from the shop ---------- */
let routineState = 'idle';      // idle -> loading -> done

async function loadRoutine() {
  if (routineState !== 'idle') return;
  routineState = 'loading';

  const items = NJCart.items();
  const counts = {};
  items.forEach(i => { if (i.category) counts[i.category] = (counts[i.category] || 0) + i.qty; });
  const category = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || 'skincare';

  try {
    const data = await BeautyAPI.list({ category });
    const inCart = new Set(NJCart.items().map(i => i.id));
    const picks = (data.results || []).filter(p => p && p.id && p.name && !inCart.has(p.id)).slice(0, 3);
    if (!picks.length) throw new Error('nothing to suggest');

    const wrap = document.getElementById('routineWrapper');
    wrap.replaceChildren(...picks.map(makeRoutineCard));
    document.getElementById('routineList').hidden = false;
    routineState = 'done';
  } catch {
    routineState = 'done';      // no suggestions is fine: the section just stays hidden
  }
}

function makeRoutineCard(p) {
  const price = BeautyAPI.demoPrice(p.id);
  const card = document.createElement('div');
  card.className = 'routineCard';

  const media = makeMedia('routineMedia', { image: p.image_url, brand: p.brand, name: p.name }, (p.brand ? p.brand + ' ' : '') + p.name);
  const name = document.createElement('h3');
  name.textContent = (p.brand ? p.brand + ' ' : '') + p.name;

  const foot = document.createElement('div');
  foot.className = 'routineFoot';
  const priceEl = document.createElement('span');
  priceEl.className = 'routinePrice';
  priceEl.textContent = naira(price);

  const add = document.createElement('button');
  add.type = 'button'; add.className = 'routineAdd'; add.textContent = 'Add';
  add.setAttribute('aria-label', 'Add ' + p.name + ' to cart');
  add.addEventListener('click', () => {
    try {
      const result = NJCart.add(p, price);
      if (result === 'max') { showToast('Maximum of ' + NJCart.MAX_QTY + ' per product'); return; }
    } catch { showToast("Couldn't add that. Browser storage may be full."); return; }
    const original = add.textContent;
    add.textContent = 'Added \u2713';
    add.classList.add('added');
    setTimeout(() => { add.textContent = original; add.classList.remove('added'); }, 1400);
  });

  foot.append(priceEl, add);
  card.append(media, name, foot);
  return card;
}

/* ---------- keep the page right whenever the cart changes ---------- */
window.addEventListener('njcart', render);
render();