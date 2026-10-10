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