/* shop.js: the shop page. Works from the address bar:
     shop.html                     all products
     shop.html?category=makeup     one category
     shop.html?q=serum             search          */
 
// label shown on the site  ->  value the API understands
const CATEGORIES = [
  { label: 'All',       value: '' },
  { label: 'Skincare',  value: 'skincare' },
  { label: 'Suncare',   value: 'suncare' },
  { label: 'Makeup',    value: 'makeup' },
  { label: 'Haircare',  value: 'haircare' },
  { label: 'Body Care', value: 'body/bath' },
  { label: 'Fragrance', value: 'fragrance' }
];
 
const grid     = document.getElementById('productGrid');
const msgBox   = document.getElementById('shopMsg');
const msgText  = document.getElementById('shopMsgText');
const retryBtn = document.getElementById('shopRetry');
const moreBtn  = document.getElementById('loadMore');
 
const urlParams = new URLSearchParams(location.search);
const q         = (urlParams.get('q') || '').trim();
const wanted    = urlParams.get('category') || '';
const category  = CATEGORIES.some(c => c.value === wanted) ? wanted : '';
 
let page = 1;
let loading = false;
 
const demoPrice = BeautyAPI.demoPrice;      // demo prices come from api.js, so the cart agrees
const naira = n => '₦' + n.toLocaleString('en-NG');
 
/* ---------- little message at the bottom ---------- */
let toastTimer;
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}
 
/* ---------- cart (the shared cart lives in njcart.js) ---------- */
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
 
/* ---------- one product card ---------- */
function makeCard(p) {
  const price = demoPrice(p.id);
 
  const card = document.createElement('article');
  card.className = 'productCard';
 
  const imgBox = document.createElement('div');
  imgBox.className = 'productImg';
 
  const showInitial = () => {
    imgBox.replaceChildren();
    imgBox.textContent = (p.brand || p.name || '?').trim()[0].toUpperCase();
    imgBox.classList.add('noImg');
  };
 
  if (p.image_url) {
    const img = new Image();
    img.alt = (p.brand ? p.brand + ' ' : '') + p.name;
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.onerror = showInitial;            // broken link: show the brand's first letter instead
    img.src = p.image_url;
    imgBox.append(img);
  } else {
    showInitial();
  }
 
  const brand = document.createElement('p');
  brand.className = 'productBrand';
  brand.textContent = p.brand || '';
 
  const name = document.createElement('h2');
  name.className = 'productName';
  name.textContent = p.name;
 
  const meta = document.createElement('div');
  meta.className = 'productMeta';
 
  const tag = document.createElement('span');
  tag.className = 'productTag';
  tag.textContent = (CATEGORIES.find(c => c.value === p.category) || {}).label || 'Other';
 
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
 
/* ---------- loading skeletons ---------- */
function showSkeletons(n) {
  for (let i = 0; i < n; i++) {
    const s = document.createElement('div');
    s.className = 'productCard skeleton';
    s.setAttribute('aria-hidden', 'true');
    grid.append(s);
  }
}
function clearSkeletons() { grid.querySelectorAll('.skeleton').forEach(s => s.remove()); }
 
function showMessage(text, canRetry) {
  msgText.textContent = text;
  retryBtn.hidden = !canRetry;
  msgBox.hidden = false;
}
 
/* ---------- get a page of products and show it ---------- */
async function loadPage() {
  if (loading) return;
  loading = true;
  msgBox.hidden = true;
  moreBtn.disabled = true;
  moreBtn.textContent = 'Loading...';
  showSkeletons(page === 1 ? 8 : 4);
 
  try {
    const data = q ? await BeautyAPI.search(q, page)
                   : await BeautyAPI.list({ category, page });
 
    clearSkeletons();
    const items = (data.results || []).filter(p => p && p.id && p.name);   // skip incomplete records
    items.forEach(p => grid.append(makeCard(p)));
 
    const total = data.pagination ? data.pagination.total : items.length;
    document.getElementById('shopCount').textContent =
      total ? total.toLocaleString('en-NG') + (total === 1 ? ' product' : ' products') : '';
 
    if (!grid.children.length) {
      showMessage(q ? 'No products matched "' + q + '". Try a shorter word, like a brand name.'
                    : 'No products in this category yet.', false);
    }
 
    moreBtn.hidden = !(data.pagination && data.pagination.has_more);
    page += 1;
  } catch (err) {
    clearSkeletons();
    if (page === 1) showMessage(err.message, true);        // nothing on screen yet: offer "Try again"
    else            showToast(err.message);                // products already showing: keep them
  } finally {
    loading = false;
    moreBtn.disabled = false;
    moreBtn.textContent = 'Load more';
  }
}
 
/* ---------- page header: title, search box, category chips ---------- */
const activeLabel = (CATEGORIES.find(c => c.value === category) || CATEGORIES[0]).label;
const title = q ? 'Results for "' + q + '"' : (category ? activeLabel : 'All products');
document.getElementById('shopTitle').textContent = title;
document.title = title + ' | Beauty by NJ';
document.getElementById('shopQ').value = q;
 
const chips = document.getElementById('catChips');
CATEGORIES.forEach(c => {
  const a = document.createElement('a');
  a.className = 'catChip';
  a.textContent = c.label;
  a.href = c.value ? 'shop.html?category=' + encodeURIComponent(c.value) : 'shop.html';
  if (!q && c.value === category) { a.classList.add('active'); a.setAttribute('aria-current', 'page'); }
  chips.append(a);
});
 
moreBtn.addEventListener('click', loadPage);
retryBtn.addEventListener('click', loadPage);
loadPage();
 