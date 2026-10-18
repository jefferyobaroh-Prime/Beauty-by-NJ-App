/* config.js: your product settings live here, in one place.
 
   useLocal: true  = the site reads products.json (made by fetch-products.js). Use this.
   useLocal: false = the site calls The Beauty API directly. Browsers block this (CORS), so it only
                     works if the API owners ever allow it.
 
   key: only fetch-products.js needs it, and only once. Once products.json exists you can delete the key
   from this file, so it is never public.
   Get a key at https://thebeautyapi.com/dashboard (the free Sandbox plan is enough). */
const BEAUTY_API = {
  base: 'https://api.thebeautyapi.com/v1',
  key:  'TlZ7ehzZKq8STXgPHWe2K1mcEhiqYuJ32VHNF33q',
  useLocal: true,
  localFile: 'products.json'
};

/* ---------- PAYSTACK (checkout) ----------
   1. Sign up free at https://paystack.com and open Settings > API Keys & Webhooks.
   2. Make sure the TEST MODE switch is on, then copy the "Test Public Key". It starts with pk_test_
   3. Paste it below.
 
   Only ever paste the PUBLIC key (pk_test_...). NEVER paste the secret key (sk_...) in a website file,
   because anyone can open this file in their browser.
 
   Left as it is, checkout runs in DEMO mode: the pay button fakes a successful payment so you can still
   show the whole flow without a Paystack account. */
const PAYSTACK = {
  publicKey: 'PASTE_YOUR_PAYSTACK_TEST_PUBLIC_KEY_HERE',
  currency:  'NGN'
};
 
/* ---------- BANK TRANSFER (checkout) ----------
   These are made-up details for the school project. Nobody can pay into them. */
const BANK_TRANSFER = {
  bank:    'Demo Bank of Nigeria',
  name:    'Beauty by NJ Ltd',
  number:  '0123456789'
};
 