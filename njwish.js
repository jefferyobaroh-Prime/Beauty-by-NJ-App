/* njwish.js: the wishlist (the hearts on products), shared by every page.
   It is saved on the signed-in person's account, so each customer has their own wishlist.
   Load it AFTER njauth.js on every page that shows hearts or the wishlist:
       <script src="./njauth.js"></script>
       <script src="./njwish.js"></script>
 
   Used by the pages like this:
       NJWish.makeButton(product, showToast)   gives you a heart button for a product card
       NJWish.items() / .count() / .has(id) / .toggle(product) / .remove(id)        */
const NJWish = {
  MAX: 200,   // most products one person can save
 
  // a plain heart. It is written by us, never from user text, so it is safe to use as HTML.
  HEART: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
 
  /* ---- reading ---- */
  // newest first. Anything damaged in storage is skipped instead of crashing the page.
  items() {
    const user = NJ.current();
    const raw = user && Array.isArray(user.wishlist) ? user.wishlist : [];
    return raw
      .filter(i => i && typeof i.id === 'string' && i.id && typeof i.name === 'string')
      .map(i => ({
        id: i.id,
        brand: String(i.brand || ''),
        name: i.name,
        image_url: typeof i.image_url === 'string' ? i.image_url : '',
        category: String(i.category || ''),
        addedAt: Number(i.addedAt) || 0
      }));
  },
  count() { return this.items().length; },
  has(id) { return this.items().some(i => i.id === id); },
 
  /* ---- changing ---- */
  _save(list) {
    try {
      NJ.update({ wishlist: list });
    } catch {
      return false;                       // browser storage is full
    }
    this._changed();
    return true;
  },
 
  // returns 'added', 'removed', 'full', 'error' or 'signin' (nobody is signed in)
  toggle(product) {
    if (!NJ.current()) return 'signin';
    const list = this.items();
    const at = list.findIndex(i => i.id === product.id);
 
    if (at >= 0) {
      list.splice(at, 1);
      return this._save(list) ? 'removed' : 'error';
    }
    if (list.length >= this.MAX) return 'full';
 
    list.unshift({
      id: product.id,
      brand: product.brand || '',
      name: product.name,
      image_url: product.image_url || '',
      category: product.category || '',
      addedAt: Date.now()
    });
    return this._save(list) ? 'added' : 'error';
  },
 
  remove(id) {
    if (!this.has(id)) return;
    this._save(this.items().filter(i => i.id !== id));
  },
 
  /* ---- the heart button ---- */
  // notify is the page's own little message function (showToast)
  makeButton(product, notify = () => {}) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'wishBtn';
    btn.dataset.id = product.id;
    btn.dataset.name = product.name;
    btn.innerHTML = this.HEART;
    this._paint(btn, this.has(product.id));
 
    btn.addEventListener('click', () => {
      const result = this.toggle(product);
      if (result === 'signin') {
        notify('Sign in to save products to your wishlist');
        setTimeout(() => { location.href = 'signin.html'; }, 1500);
        return;
      }
      notify(result === 'added'   ? 'Saved to your wishlist'
           : result === 'removed' ? 'Removed from your wishlist'
           : result === 'full'    ? 'Your wishlist is full (' + this.MAX + ' products)'
           : "Couldn't save that. Browser storage may be full.");
    });
    return btn;
  },
 
  _paint(btn, on) {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    const name = btn.dataset.name || 'product';
    const label = (on ? 'Remove ' : 'Add ') + name + (on ? ' from wishlist' : ' to wishlist');
    btn.setAttribute('aria-label', label);
    btn.title = on ? 'Remove from wishlist' : 'Add to wishlist';
  },
 
  // make every heart on the page match what is saved
  paintAll() {
    const saved = new Set(this.items().map(i => i.id));
    document.querySelectorAll('.wishBtn[data-id]').forEach(btn => this._paint(btn, saved.has(btn.dataset.id)));
  },
 
  _changed() {
    this.paintAll();
    window.dispatchEvent(new Event('njwish'));     // pages listen to this to redraw
  }
};
 
// keep hearts right when the wishlist changes in another tab, or when you come back with the Back button
window.addEventListener('storage', (e) => { if (e.key === 'njUser' || e.key === null) NJWish._changed(); });
window.addEventListener('pageshow', (e) => { if (e.persisted) NJWish._changed(); });
 