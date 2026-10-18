/* njorders.js: orders, saved on the customer's account (same idea as the wishlist).
   Load it after njauth.js on: checkout.html, order-success.html and profile.html.
 
   An order looks like this:
   {
     id:        'NJ-261006-4F9K',          order number the customer sees
     createdAt: '2026-10-06T10:15:00Z',
     status:    'Processing',
     items:     [{ id, brand, name, image, price, qty }],
     subtotal, promoCode, discount, delivery, total,     (all in naira)
     contact:   { name, email, phone },
     address:   { label, street, city, state, phone },
     note:      'Call me at the gate',
     payment:   { method: 'paystack' | 'transfer' | 'cod',
                  status: 'paid' | 'awaiting' | 'on-delivery',
                  mode:   'test' | 'demo' | '',          (paystack only)
                  reference: 'NJ-261006-4F9K' }
   }
*/
const NJOrders = {
  MAX: 100,                 // keeps the newest 100 orders per account
  POINTS_PER: 100,          // 1 loyalty point for every N100 spent
 
  _read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
 
  _user() { return this._read('njUser', null); },
 
  /* ---- reading ---- */
  list() {
    const u = this._user();
    return u && Array.isArray(u.orders) ? u.orders.filter(o => o && o.id && Array.isArray(o.items)) : [];
  },
 
  get(id) { return this.list().find(o => o.id === id) || null; },
 
  stats() {
    const orders = this.list();
    const spent  = orders.reduce((n, o) => n + (Number(o.total) || 0), 0);
    return { count: orders.length, spent, points: Math.floor(spent / this.POINTS_PER) };
  },
 
  /* ---- order numbers ---- */
  newId() {
    const d = new Date();
    const yymmdd = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';        // no O/0/I/1, so numbers are easy to read out
    let tail = '';
    for (let i = 0; i < 4; i++) tail += letters[Math.floor(Math.random() * letters.length)];
    return 'NJ-' + yymmdd + '-' + tail;
  },
 
  /* ---- saving ---- */
  // Saves an order on the signed-in account. Returns the order, or null if nobody is signed in or storage failed.
  // Calling it twice with the same id returns the first one, so a double click can never make two orders.
  create(order) {
    const user = this._user();
    if (!user || !user.email) return null;
 
    const existing = this.get(order.id);
    if (existing) return existing;
 
    const saved = { status: 'Processing', createdAt: new Date().toISOString(), ...order };
    const orders = [saved, ...this.list()].slice(0, this.MAX);
 
    try {
      const key   = user.email.trim().toLowerCase();
      const users = this._read('njUsers', {});
      const merged = { ...(users[key] || user), ...user, orders };
      users[key] = merged;
      localStorage.setItem('njUsers', JSON.stringify(users));
      localStorage.setItem('njUser', JSON.stringify(merged));
    } catch (e) {
      console.warn('[orders] could not save the order', e);
      return null;
    }
    window.dispatchEvent(new Event('njorders'));
    return saved;
  },
 
  /* ---- small helpers used by checkout, the success page and the profile ---- */
  formatDate(iso) {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
  },
 
  // words shown to the customer for how the order is paid
  paymentLabel(p) {
    p = p || {};
    if (p.method === 'paystack') return p.status === 'paid' ? 'Paid by card (Paystack)' : 'Paystack';
    if (p.method === 'transfer') return p.status === 'paid' ? 'Paid by bank transfer' : 'Bank transfer, awaiting payment';
    if (p.method === 'cod')      return 'Pay on delivery';
    return 'Payment';
  },
 
  // the little coloured tag: { text, tone } where tone is 'good', 'wait' or 'info'
  paymentChip(p) {
    p = p || {};
    if (p.status === 'paid')     return { text: 'Paid',               tone: 'good' };
    if (p.status === 'awaiting') return { text: 'Awaiting transfer',  tone: 'wait' };
    return                              { text: 'Pay on delivery',    tone: 'info' };
  }
};
 
/* ---- styles for the orders list on the profile page (injected, so you paste nothing into style.css) ---- */
(function injectOrderStyles() {
  if (document.getElementById('njordersStyles')) return;
  const css = `
    #orderList { display: grid; gap: 14px; margin-top: 14px; }
    .ordCard { background: #fff; border: 1px solid #DCE6CE; border-radius: 18px; padding: 18px; display: grid; gap: 12px; min-width: 0; }
    .ordTop { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
    .ordTop > div { min-width: 0; }
    .ordNo { font-weight: 800; font-size: 1rem; overflow-wrap: anywhere; margin: 0; }
    .ordDate { font-size: .82rem; color: #4B5A44; margin: 2px 0 0; }
    .ordChips { display: flex; gap: 6px; flex-wrap: wrap; }
    .ordChip { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: .72rem; font-weight: 700; background: #E3EEDA; color: #1E3518; white-space: nowrap; }
    .ordChip.good { background: #DCEFD3; color: #1E5A14; }
    .ordChip.wait { background: #FFF1C9; color: #7A5A00; }
    .ordChip.info { background: #E3EEDA; color: #1E3518; }
    .ordThumbs { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .ordThumb { width: 48px; height: 48px; border-radius: 10px; background: #F4F8EF; border: 1px solid #DCE6CE; overflow: hidden; display: grid; place-items: center; font-weight: 800; color: #3F6B34; flex-shrink: 0; }
    .ordThumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .ordMore { font-size: .82rem; font-weight: 700; color: #4B5A44; }
    .ordBottom { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .ordTotal { font-weight: 800; font-size: 1.05rem; margin: 0; }
    .ordTotal small { display: block; font-weight: 500; font-size: .75rem; color: #4B5A44; }
    .ordView { display: inline-block; padding: 9px 18px; border: 1.5px solid #1E3518; border-radius: 999px; color: #1E3518; font-weight: 700; font-size: .85rem; text-decoration: none; }
    .ordView:hover { background: #1E3518; color: #fff; }
    #ordersToggle { background: none; border: none; padding: 6px 0; font: inherit; font-weight: 700; color: #3F6B34; text-decoration: underline; cursor: pointer; justify-self: start; }
  `;
  const style = document.createElement('style');
  style.id = 'njordersStyles';
  style.textContent = css;
  document.head.append(style);
})();
 