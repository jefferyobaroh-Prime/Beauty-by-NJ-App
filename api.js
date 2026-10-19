/* api.js: the only file that talks to The Beauty API.
   Every other file just calls BeautyAPI.list(...), BeautyAPI.search(...) or BeautyAPI.get(...).
   Needs config.js loaded first.
 
   LOCAL MODE (default): browsers are blocked by CORS from calling The Beauty API directly,
   so fetch-products.js downloads the products ONCE into products.json, and this file reads that.
   No key in the browser, no 100-call limit, and it is fast.
 
   Why it caches: the free Sandbox plan allows only 100 API calls in total.
   So every answer is saved in the browser for 24 hours, and the same request is never sent twice. */
const BeautyAPI = (() => {
  const CACHE_PREFIX = 'njApi:';
  const TTL = 24 * 60 * 60 * 1000;     // keep answers for 24 hours
  const inFlight = new Map();          // same request asked twice at once = one call
 
  class ApiError extends Error {
    constructor(message, status) { super(message); this.status = status; }
  }
 
  /* ---------- cache ---------- */
  function cacheGet(url) {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + url);
      if (!raw) return null;
      const { t, data } = JSON.parse(raw);
      if (Date.now() - t > TTL) { localStorage.removeItem(CACHE_PREFIX + url); return null; }
      return data;
    } catch { return null; }
  }
 
  function clearCache() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(CACHE_PREFIX))
      .forEach(k => localStorage.removeItem(k));
  }
 
  function cacheSet(url, data) {
    const entry = JSON.stringify({ t: Date.now(), data });
    try { localStorage.setItem(CACHE_PREFIX + url, entry); }
    catch {                                         // storage full: empty our cache and try once more
      clearCache();
      try { localStorage.setItem(CACHE_PREFIX + url, entry); } catch { /* fine, just not cached */ }
    }
  }
 
  /* ---------- counting real calls (so you can watch the 100 limit) ---------- */
  function countCall(path) {
    let n = 0;
    try {
      n = (Number(localStorage.getItem('njApiCalls')) || 0) + 1;
      localStorage.setItem('njApiCalls', n);
    } catch { /* ignore */ }
    console.info('[BeautyAPI] real call #' + n + ' (this browser): ' + path);
  }
 
  /* ---------- the request itself ---------- */
  function request(path, params = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v);
    });
    const query = qs.toString();
    const url = BEAUTY_API.base + path + (query ? '?' + query : '');
 
    const cached = cacheGet(url);
    if (cached) return Promise.resolve(cached);
    if (inFlight.has(url)) return inFlight.get(url);
 
    if (!BEAUTY_API.key || BEAUTY_API.key.startsWith('PASTE')) {
      return Promise.reject(new ApiError('Add your API key to config.js first.', 0));
    }
 
    const promise = (async () => {
      let res;
      try {
        res = await fetch(url, { headers: { 'x-api-key': BEAUTY_API.key } });
      } catch (err) {
        console.error('[BeautyAPI] request failed (internet down, or blocked by CORS):', err);
        throw new ApiError("We couldn't reach the product service. Check your internet and try again.", 0);
      }
      countCall(path + (query ? '?' + query : ''));
 
      if (!res.ok) {
        const messages = {
          403: 'The API key is missing or not valid. Check config.js.',
          404: 'That product could not be found.',
          429: 'Too many requests, or the free 100-call limit is used up. Try again later.'
        };
        throw new ApiError(messages[res.status] || 'Something went wrong (error ' + res.status + ').', res.status);
      }
 
      const data = await res.json();
      cacheSet(url, data);
      return data;
    })();
 
    inFlight.set(url, promise);
    promise.then(() => inFlight.delete(url), () => inFlight.delete(url));
    return promise;
  }
 
  /* ---------- the API has no prices, so the site makes demo prices ----------
     The same product always gets the same price (worked out from its id), on every page. */
  function demoPrice(id) {
    let h = 0;
    for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return 2500 + (h % 156) * 100;          // between N2,500 and N18,000
  }
 
  /* ---------- LOCAL MODE: read products.json instead of calling the API ---------- */
  const PAGE_SIZE = 20;
  let localPromise = null;
 
  function loadLocal() {
    if (!localPromise) {
      localPromise = fetch(BEAUTY_API.localFile || 'products.json')
        .then(res => {
          if (!res.ok) throw new Error('status ' + res.status);
          return res.json();
        })
        .then(data => {
          if (!data || !Array.isArray(data.products)) throw new Error('bad file');
          return data.products;
        })
        .catch(err => {
          localPromise = null;                  // let the Retry button try again
          console.error('[BeautyAPI] could not load products.json:', err);
          throw new ApiError('Product list not found. Run fetch-products.js once to create products.json.', 0);
        });
    }
    return localPromise;
  }
 
  function paginate(all, page) {
    page = Math.max(1, Number(page) || 1);
    const start = (page - 1) * PAGE_SIZE;
    return {
      results: all.slice(start, start + PAGE_SIZE),
      pagination: { page, has_more: start + PAGE_SIZE < all.length, total: all.length },
      no_match: all.length === 0
    };
  }
 
 // words people might type for each category, on top of the category name itself
  const CATEGORY_WORDS = {
    'skincare':  'skincare skin care face',
    'suncare':   'suncare sun care sunscreen spf',
    'makeup':    'makeup make-up cosmetics',
    'haircare':  'haircare hair care',
    'body/bath': 'body care bath body bath lotion',
    'fragrance': 'fragrance perfume scent',
    'other':     'other'
  };
  const categoryWords = (c) => CATEGORY_WORDS[c] || String(c || '');

  const localApi = {
    async list(filters = {}) {
      /* ...leave exactly as it is... */
    },
    async search(q, page = 1) {
      const all = await loadLocal();
      const words = String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
      const found = all.filter(p => {
        // search the name, the brand AND the category (so "skincare", "body care" or "perfume" work too)
        const text = ((p.brand || '') + ' ' + (p.name || '') + ' ' + categoryWords(p.category)).toLowerCase();
        return words.every(w => text.includes(w));
      });
      return paginate(found, page);
    },
    async get(id) {
      /* ...leave exactly as it is... */
    }
  };
 
  const useLocal = BEAUTY_API.useLocal !== false;
 
  /* ---------- what the rest of the site uses ---------- */
  return {
    ApiError,
    demoPrice,
    // search by brand or product name. Returns { results: [...], pagination: { page, has_more, total } }
    search: (q, page = 1) => useLocal ? localApi.search(q, page) : request('/products/search', { q, page }),
    // browse. filters: category, brand, origin, page.  category is one of:
    // skincare, suncare, makeup, haircare, body/bath, fragrance, other
    list: (filters = {}) => useLocal ? localApi.list(filters) : request('/products', filters),
    // one product, with the full ingredient list
    get: (id) => useLocal ? localApi.get(id) : request('/products/' + encodeURIComponent(id)),
    callsUsed: () => Number(localStorage.getItem('njApiCalls')) || 0,
    clearCache
  };
})();
 