/* njcart.js: the cart, shared by every page (shop, cart, and later checkout).
   The cart lives in the browser under 'njCart', so it survives reloads and page changes.
   Load this on every page that shows the cart badge or adds/changes items. */
const NJCart = {
  /* ---- the rules. Change a number here and the whole site follows ---- */
  MAX_QTY: 10,                    // most of one product a customer can buy
  DELIVERY_FEE: 1500,             // flat delivery fee in Lagos (naira)
  FREE_DELIVERY_OVER: 30000,      // delivery is free when the subtotal reaches this
  PROMOS: {                       // demo promo codes: CODE -> percent off the subtotal
    NJFAM10: 10,
    WELCOME5: 5
  },
 
  /* ---- reading and saving ---- */
  items() {
    let raw;
    try { raw = JSON.parse(localStorage.getItem('njCart')); } catch { raw = null; }
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(i => i && typeof i.id === 'string' && typeof i.name === 'string')
      .map(i => ({
        id: i.id,
        brand: String(i.brand || ''),
        name: i.name,
        image: String(i.image || ''),
        category: String(i.category || ''),
        price: Math.max(0, Number(i.price) || 0),
        qty: Math.min(this.MAX_QTY, Math.max(1, Math.floor(Number(i.qty)) || 1))
      }));
  },
 
  _save(items) {
    localStorage.setItem('njCart', JSON.stringify(items));    // may throw if storage is full; callers handle it
    this._changed();
  },
 
  _changed() {
    this.paintBadge();
    window.dispatchEvent(new Event('njcart'));                // pages listen to this to redraw
  },
 
  /* ---- changing the cart ---- */
  // returns 'added', 'more' (quantity went up) or 'max' (already at the limit)
  add(product, price) {
    const items = this.items();
    const line = items.find(i => i.id === product.id);
    if (line) {
      if (line.qty >= this.MAX_QTY) return 'max';
      line.qty += 1;
      this._save(items);
      return 'more';
    }
    items.push({
      id: product.id,
      brand: product.brand || '',
      name: product.name,
      image: product.image_url || '',
      category: product.category || '',
      price,
      qty: 1
    });
    this._save(items);
    return 'added';
  },
 
  setQty(id, qty) {
    const items = this.items();
    const line = items.find(i => i.id === id);
    if (!line) return;
    line.qty = Math.min(this.MAX_QTY, Math.max(1, Math.floor(Number(qty)) || 1));
    this._save(items);
  },
 
  remove(id) { this._save(this.items().filter(i => i.id !== id)); },
 
  clear() {
    localStorage.removeItem('njCart');
    localStorage.removeItem('njPromo');
    this._changed();
  },
 
  /* ---- promo code ---- */
  promoCode() {
    const code = localStorage.getItem('njPromo');
    return code && this.PROMOS[code] ? code : '';
  },
 
  // returns true if the code is real (and saves it), false if not
  applyPromo(input) {
    const code = String(input || '').trim().toUpperCase();
    if (!this.PROMOS[code]) return false;
    localStorage.setItem('njPromo', code);
    this._changed();
    return true;
  },
 
  removePromo() { localStorage.removeItem('njPromo'); this._changed(); },
 
  /* ---- numbers ---- */
  count() { return this.items().reduce((n, i) => n + i.qty, 0); },
 
  summary() {
    const items    = this.items();
    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const code     = this.promoCode();
    const percent  = code ? this.PROMOS[code] : 0;
    const discount = Math.round(subtotal * percent / 100);
    const after    = subtotal - discount;
    const free     = after >= this.FREE_DELIVERY_OVER;
    const delivery = items.length === 0 ? 0 : (free ? 0 : this.DELIVERY_FEE);
    return {
      items, count: this.count(), subtotal, code, percent, discount, delivery,
      total: after + delivery,
      toFreeDelivery: items.length === 0 || free ? 0 : this.FREE_DELIVERY_OVER - after   // how much more for free delivery
    };
  },
 
  formatNaira(n) { return '₦' + Number(n).toLocaleString('en-NG'); },
 
  /* ---- the little number on the cart icon, on every page ---- */
  paintBadge() {
    document.querySelectorAll('.cartLink').forEach(link => {
      let badge = link.querySelector('.cartBadge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'cartBadge';
        badge.setAttribute('aria-hidden', 'true');
        link.append(badge);
      }
      const n = this.count();
      badge.textContent = n > 99 ? '99+' : String(n);
      badge.hidden = n === 0;
      link.setAttribute('aria-label', n ? 'Cart, ' + n + (n === 1 ? ' item' : ' items') : 'Cart');
    });
  }
};
 
// keep the badge right on page load, and when the cart changes in another tab
document.addEventListener('DOMContentLoaded', () => NJCart.paintBadge());
window.addEventListener('storage', (e) => { if (e.key === 'njCart' || e.key === 'njPromo') NJCart._changed(); });
 