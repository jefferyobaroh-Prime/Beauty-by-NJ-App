/* bestsellers.js: fills the Bestsellers section on the homepage with 12 products from products.json.
 
   Needs this empty container in index.html (replace your 12 hard-coded cards with it):
       <div class="productGrid" id="bestsellers"></div>
 
   Scripts to load at the bottom of index.html, in this order (before your app.js is fine):
       <script src="./njauth.js"></script>
       <script src="./njwish.js"></script>
       <script src="./njcart.js"></script>
       <script src="./config.js"></script>
       <script src="./api.js"></script>
       <script src="./bestsellers.js"></script>
 
   How it picks: 2 products from each of the 6 categories (so you get a mix, not 12 sunscreens),
   only products that have a picture, then shuffles the order.
   DAILY = true  : same 12 all day, new 12 tomorrow (looks like a real "bestsellers" list)
   DAILY = false : new random 12 on every refresh                                          */
(() => {
  const DAILY = true;
  const PER_CATEGORY = 2;
  const CATEGORIES = ['skincare', 'suncare', 'makeup', 'haircare', 'body/bath', 'fragrance'];
  const LABELS = { 'skincare': 'Skincare', 'suncare': 'Suncare', 'makeup': 'Makeup',
                   'haircare': 'Haircare', 'body/bath': 'Body Care', 'fragrance': 'Fragrance' };
 
  const grid = document.getElementById('bestsellers');
  if (!grid) return;
 
  const naira = n => '₦' + n.toLocaleString('en-NG');
 
  /* ---------- random numbers (seeded, so "daily" mode gives the same answer all day) ---------- */
  function makeRandom() {
    if (!DAILY) return Math.random;
    const d = new Date();
    let seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    return () => {                       // small, well-known seeded generator (mulberry32)
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
 
  function shuffle(list, rand) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
 
  function pick(products, total) {
    const rand = makeRandom();
    const withPic = products.filter(p => p && p.id && p.name && p.image_url);
    const chosen = [];
    const used = new Set();
 
    CATEGORIES.forEach(cat => {
      shuffle(withPic.filter(p => p.category === cat), rand)
        .slice(0, PER_CATEGORY)
        .forEach(p => { chosen.push(p); used.add(p.id); });
    });
 
    if (chosen.length < total) {          // a category had too few: top up from everything else
      shuffle(withPic.filter(p => !used.has(p.id)), rand)
        .slice(0, total - chosen.length)
        .forEach(p => chosen.push(p));
    }
    return shuffle(chosen, rand).slice(0, total);
  }
 
  // the hearts need njwish.js. If the page forgot to load it, load it now.
  function loadWish() {
    if (typeof NJWish !== 'undefined') return Promise.resolve(true);
    if (window.__njwishLoading) return window.__njwishLoading;          // never load it twice
    return window.__njwishLoading = new Promise(resolve => {
      const s = document.createElement('script');
      s.src = './njwish.js';
      s.onload = () => resolve(typeof NJWish !== 'undefined');
      s.onerror = () => {
        console.warn('[wishlist] njwish.js was not found. Save it in the same folder as this page to get the hearts.');
        resolve(false);
      };
      document.head.append(s);
    });
  }
  const wishReady = loadWish();
 
  /* ---------- the little "Added to cart" message ---------- */
  let toast, toastTimer;
  function showToast(message) {
    toast = toast || document.getElementById('toast');
    if (!toast) {                          // homepage has none: make one
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.append(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }
 
  function addToCart(p, price) {
    try {
      const result = NJCart.add(p, price);
      showToast(result === 'max' ? 'Maximum of ' + NJCart.MAX_QTY + ' per product'
              : result === 'more' ? 'Quantity updated in your cart'
              : 'Added to cart');
    } catch {
      showToast("Couldn't add that. Browser storage may be full.");
    }
  }
 
  /* ---------- one card (same look as the shop page) ---------- */
  function makeCard(p) {
    const price = BeautyAPI.demoPrice(p.id);
 
    const card = document.createElement('article');
    card.className = 'productCard';
 
    const imgBox = document.createElement('div');
    imgBox.className = 'productImg';
    const showInitial = () => {
      imgBox.replaceChildren();
      imgBox.textContent = (p.brand || p.name || '?').trim()[0].toUpperCase();
      imgBox.classList.add('noImg');
    };
    const img = new Image();
    img.alt = (p.brand ? p.brand + ' ' : '') + p.name;
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.onerror = showInitial;
    img.src = p.image_url;
    imgBox.append(img);
 
    const brand = document.createElement('p');
    brand.className = 'productBrand';
    brand.textContent = p.brand || '';
 
    const name = document.createElement('h3');
    name.className = 'productName';
    name.textContent = p.name;
 
    const meta = document.createElement('div');
    meta.className = 'productMeta';
    const tag = document.createElement('span');
    tag.className = 'productTag';
    tag.textContent = LABELS[p.category] || 'Other';
    const priceEl = document.createElement('span');
    priceEl.className = 'productPrice';
    priceEl.textContent = naira(price);
    meta.append(tag, priceEl);
 
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'productAdd';
    btn.textContent = 'Add to cart';
    btn.setAttribute('aria-label', 'Add ' + p.name + ' to cart');
    btn.addEventListener('click', () => addToCart(p, price));
 
    // heart button (only if njwish.js is on the page)
    const heart = typeof NJWish !== 'undefined' ? NJWish.makeButton(p, showToast) : null;
 
    card.append(imgBox, ...(heart ? [heart] : []), brand, name, meta, btn);
    return card;
  }
 
  /* ---------- go ---------- */
  function showSkeletons() {
    for (let i = 0; i < 12; i++) {
      const s = document.createElement('div');
      s.className = 'productCard skeleton';
      s.setAttribute('aria-hidden', 'true');
      grid.append(s);
    }
  }
 
  async function init() {
    showSkeletons();
    try {
      const res = await fetch(BEAUTY_API.localFile || 'products.json');
      if (!res.ok) throw new Error('status ' + res.status);
      const data = await res.json();
      await wishReady;
      const items = pick(data.products || [], 12);
      if (!items.length) throw new Error('no products');
      grid.replaceChildren(...items.map(makeCard));
    } catch (err) {
      console.error('[bestsellers] could not load products.json:', err);
      const sec = grid.closest('section');
      (sec || grid).hidden = true;         // better to hide the section than show a broken one
    }
  }
 
  init();
})();
 