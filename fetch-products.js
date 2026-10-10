/* fetch-products.js: run this ONCE on your computer. It is not part of the website.
 
   What it does: asks The Beauty API for products in each category and saves them in products.json.
   The website then reads products.json, so the browser never has to call the API (that is what CORS blocks).
 
   How to run (needs Node.js 18 or newer, from https://nodejs.org):
     1. Put your key in config.js (key: '...').
     2. Open a terminal in your project folder.
     3. Run:   node fetch-products.js
        Want more or fewer products?   node fetch-products.js 3      (3 pages per category, 20 products per page)
 
   Cost: 6 categories x pages = 30 API calls by default. The free plan has 100 in total, so run it once, not 4 times. */
 
const fs = require('fs');
const path = require('path');
 
const CATEGORIES = ['skincare', 'suncare', 'makeup', 'haircare', 'body/bath', 'fragrance'];
const PAGES = Math.min(Math.max(parseInt(process.argv[2], 10) || 5, 1), 10);
const BASE = process.env.BEAUTY_API_BASE || 'https://api.thebeautyapi.com/v1';
const OUT = path.join(__dirname, 'products.json');
 
if (typeof fetch !== 'function') {
  console.error('Your Node.js is too old. Install Node 18 or newer from https://nodejs.org and try again.');
  process.exit(1);
}
 
/* find the key: environment variable, or config.js */
function findKey() {
  if (process.env.BEAUTY_API_KEY) return process.env.BEAUTY_API_KEY.trim();
  try {
    const text = fs.readFileSync(path.join(__dirname, 'config.js'), 'utf8');
    const m = text.match(/key:\s*['"]([^'"]+)['"]/);
    if (m && !m[1].startsWith('PASTE')) return m[1].trim();
  } catch { /* no config.js here */ }
  return '';
}
 
const KEY = findKey();
if (!KEY) {
  console.error('No API key found. Put it in config.js (key: \'...\') next to this file, then run again.');
  process.exit(1);
}
 
const wait = ms => new Promise(r => setTimeout(r, ms));
let calls = 0;
 
async function getPage(category, page) {
  const url = BASE + '/products?category=' + encodeURIComponent(category) + '&page=' + page;
  calls++;
  const res = await fetch(url, { headers: { 'x-api-key': KEY } });
  if (res.status === 403) throw new Error('The API says your key is not valid (403). Check the key in config.js.');
  if (res.status === 429) throw new Error('The API says the limit is used up (429). Saved what we had.');
  if (!res.ok) throw new Error('The API answered with error ' + res.status + '.');
  return res.json();
}
 
(async () => {
  const byCategory = {};
  let stopped = '';
 
  for (const category of CATEGORIES) {
    byCategory[category] = [];
    for (let page = 1; page <= PAGES; page++) {
      try {
        const data = await getPage(category, page);
        (data.results || []).forEach(p => {
          byCategory[category].push({
            id: String(p.id),
            brand: p.brand || '',
            name: p.name || '',
            category: p.category || category,
            image_url: p.image_url || ''
          });
        });
        process.stdout.write('  ' + category + ' page ' + page + ': ' + byCategory[category].length + ' so far\n');
        if (!data.pagination || !data.pagination.has_more) break;
      } catch (err) {
        stopped = err.message;
        break;
      }
      await wait(300);                       // free plan allows 5 requests per second
    }
    if (stopped) break;
  }
 
  /* mix the categories so the "All" view is not 100 sunscreens in a row */
  const mixed = [];
  const seen = new Set();
  const lists = CATEGORIES.map(c => byCategory[c] || []);
  for (let i = 0; lists.some(l => i < l.length); i++) {
    lists.forEach(l => {
      if (i < l.length && !seen.has(l[i].id)) { seen.add(l[i].id); mixed.push(l[i]); }
    });
  }
 
  if (!mixed.length) {
    console.error('\nNo products saved. ' + (stopped || 'The API returned nothing.'));
    process.exit(1);
  }
 
  fs.writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString(), products: mixed }, null, 1));
  console.log('\nSaved ' + mixed.length + ' products to products.json using ' + calls + ' API call(s).');
  if (stopped) console.log('Note: stopped early. ' + stopped);
  console.log('Done. Refresh your site.');
})();
 