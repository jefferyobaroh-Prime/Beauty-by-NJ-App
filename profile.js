const user = NJ.current();
 
if (!user) {
  location.replace('signin.html');          // nobody signed in, send them to sign in
} else {
  renderProfile(user);
  setupLogout();
  setupEditProfile();
  setupAddresses();
  setupWishlist();
}
 
/* ---------- small helpers ---------- */
function displayName(u) {
  return (u.name || '').trim() || u.email.split('@')[0];
}
 
function initialsOf(name) {
  const p = name.split(/\s+/);
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}
 
// put a photo (or the initials) inside a round avatar element
function paintAvatar(el, picture, name) {
  const id = el._paintId = (el._paintId || 0) + 1;   // lets us ignore a photo that loads too late
  const shown = el.querySelector('img');
 
  if (!picture) { el.textContent = initialsOf(name); return; }
  if (shown && shown.src === picture) { shown.alt = name; return; }   // same photo, nothing to redraw
  if (!shown) el.textContent = initialsOf(name);                      // initials until the photo loads
 
  const img = new Image();
  img.alt = name;
  img.referrerPolicy = 'no-referrer';         // Google photo URLs sometimes fail without this
  img.onload = () => { if (el._paintId === id) el.replaceChildren(img); };
  img.src = picture;                          // if it fails to load, what was showing stays
}
 
// shrink + square-crop a chosen photo so it is small enough to store (about 20 to 40 KB)
function resizeImage(file, size) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      if (!side) return reject(new Error('empty image'));
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';                 // transparent PNGs get a white background
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img,
        (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side,   // crop from the centre
        0, 0, size, size);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('cannot decode')); };
    img.src = url;
  });
}
 
/* ---------- show the signed-in person's details ---------- */
function renderProfile(u) {
  const name   = displayName(u);
  const joined = new Date(u.joined);
  const since  = (isNaN(joined) ? new Date() : joined)
                   .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
 
  const values = {
    name,
    firstName: name.split(/\s+/)[0],
    email:     u.email,
    phone:     u.phone || 'Not added yet',
    since
  };
 
  // fill every element that has data-user="something" (the avatar is handled below)
  document.querySelectorAll('[data-user]').forEach(el => {
    if (el.id === 'avatar') return;
    el.textContent = values[el.dataset.user] ?? '';
  });
 
  document.title = 'Beauty by NJ | ' + values.firstName;
  paintAvatar(document.getElementById('avatar'), u.picture, name);
}
 
/* ---------- log out ---------- */
function setupLogout() {
  document.querySelector('.logOut a').addEventListener('click', (e) => {
    e.preventDefault();
    NJ.logout();
    location.href = 'signin.html';
  });
}
 
/* ---------- little "saved" message ---------- */
let toastTimer;
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}
 
/* ---------- edit profile popup ---------- */
function setupEditProfile() {
  const modal       = document.getElementById('editModal');
  const form        = document.getElementById('editForm');
  const error       = document.getElementById('edError');
  const nameEl      = document.getElementById('edName');
  const emailEl     = document.getElementById('edEmail');
  const phoneEl     = document.getElementById('edPhone');
  const photoInput  = document.getElementById('edPhoto');
  const preview     = document.getElementById('edPhotoPreview');
  const removeBtn   = document.getElementById('edPhotoRemove');
 
  let pendingPhoto;   // undefined = leave the photo alone, '' = remove it, 'data:...' = new photo
 
  function clearError() {
    error.hidden = true;
    form.querySelectorAll('.invalid').forEach(i => i.classList.remove('invalid'));
  }
 
  function showError(message) {
    error.textContent = message;
    error.hidden = false;
  }
 
  function fail(input, message) {
    input.classList.add('invalid');
    showError(message);
    input.focus();
  }
 
  function showPhotoPreview(picture) {
    paintAvatar(preview, picture, displayName(NJ.current()));
    removeBtn.hidden = !picture;
  }
 
  // open: fill the form with the current details
  document.getElementById('editProfileBtn').addEventListener('click', () => {
    const u = NJ.current();
    nameEl.value  = u.name  || '';
    emailEl.value = u.email;
    phoneEl.value = u.phone || '';
    pendingPhoto  = undefined;
    photoInput.value = '';
    showPhotoPreview(u.picture);
    clearError();
    modal.showModal();
    nameEl.focus();
  });
 
  // choose a photo
  photoInput.addEventListener('change', async () => {
    const file = photoInput.files[0];
    if (!file) return;
    clearError();
 
    if (!file.type.startsWith('image/')) {
      showError('Please choose an image file (JPG or PNG).');
    } else if (file.size > 15 * 1024 * 1024) {
      showError('That photo is too large. Choose one under 15 MB.');
    } else {
      try {
        pendingPhoto = await resizeImage(file, 256);
        showPhotoPreview(pendingPhoto);
      } catch {
        showError("We couldn't read that image. Try a JPG or PNG.");
      }
    }
    photoInput.value = '';        // lets the same file be chosen again
  });
 
  // remove the photo
  removeBtn.addEventListener('click', () => {
    pendingPhoto = '';
    showPhotoPreview('');
  });
 
  // close
  document.getElementById('closeEdit').addEventListener('click', () => modal.close());
  document.getElementById('cancelEdit').addEventListener('click', () => modal.close());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });
 
  // save
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearError();
 
    const name  = nameEl.value.trim();
    const phone = phoneEl.value.trim();
 
    if (name.length < 2) return fail(nameEl, 'Please enter your full name.');
    if (phone && !/^(\+234|0)\d{10}$/.test(phone.replace(/\s/g, '')))
                         return fail(phoneEl, 'Use a Nigerian number like 08012345678.');
 
    const changes = { name, phone };
    if (pendingPhoto !== undefined) changes.picture = pendingPhoto;
 
    try {
      NJ.update(changes);
    } catch {
      return showError("Couldn't save. Your browser storage may be full.");
    }
 
    renderProfile(NJ.current());   // refresh the page without reloading
    modal.close();
    showToast('Profile updated');
  });
}
 
 
/* ---------- saved addresses ---------- */
 
function renderAddresses() {
  const list  = document.getElementById('addressList');
  const empty = document.getElementById('addressEmpty');
  const items = NJ.addresses().slice().sort((a, b) => b.isDefault - a.isDefault);   // default first
 
  empty.hidden = items.length > 0;
  list.replaceChildren();
 
  items.forEach(a => {
    const card = document.createElement('article');
    card.className = 'addressCard';
    card.dataset.id = a.id;
 
    const tag = document.createElement('p');
    tag.className = 'addressTag';
    tag.textContent = a.isDefault ? a.label + ' • Default' : a.label;   // textContent keeps user text harmless
 
    const street = document.createElement('p');
    street.className = 'addressStreet';
    street.textContent = a.street;
 
    const place = document.createElement('p');
    place.className = 'addressPlace';
    place.textContent = a.city + ', ' + a.state;
 
    card.append(tag, street, place);
 
    if (a.phone) {
      const phone = document.createElement('p');
      phone.className = 'addressPhone';
      phone.textContent = 'Phone: ' + a.phone;
      card.append(phone);
    }
 
    const actions = document.createElement('div');
    actions.className = 'addressActions';
 
    const edit = document.createElement('button');
    edit.type = 'button'; edit.className = 'addrEdit'; edit.textContent = 'Edit';
    edit.setAttribute('aria-label', 'Edit ' + a.label + ' address');
 
    const del = document.createElement('button');
    del.type = 'button'; del.className = 'addrDelete link-btn'; del.textContent = 'Delete';
    del.setAttribute('aria-label', 'Delete ' + a.label + ' address');
 
    actions.append(edit);
    if (!a.isDefault) {
      const def = document.createElement('button');
      def.type = 'button'; def.className = 'addrDefault'; def.textContent = 'Set as default';
      actions.append(def);
    }
    actions.append(del);
    card.append(actions);
    list.append(card);
  });
}
 
function setupAddresses() {
  const NG_STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta',
    'Ebonyi','Edo','Ekiti','Enugu','FCT (Abuja)','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi',
    'Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];
 
  const modal   = document.getElementById('addressModal');
  const form    = document.getElementById('addressForm');
  const error   = document.getElementById('adError');
  const title   = document.getElementById('addressTitle');
  const labelEl = document.getElementById('adLabel');
  const street  = document.getElementById('adStreet');
  const city    = document.getElementById('adCity');
  const stateEl = document.getElementById('adState');
  const phoneEl = document.getElementById('adPhone');
  const defEl   = document.getElementById('adDefault');
 
  let editingId = null;   // null = adding a new address
 
  // fill the State dropdown once
  stateEl.append(new Option('Select state', ''));
  NG_STATES.forEach(s => stateEl.append(new Option(s, s)));
 
  function clearError() {
    error.hidden = true;
    form.querySelectorAll('.invalid').forEach(i => i.classList.remove('invalid'));
  }
  function fail(input, message) {
    input.classList.add('invalid');
    error.textContent = message;
    error.hidden = false;
    input.focus();
  }
 
  function openForm(addr) {
    editingId = addr ? addr.id : null;
    const first = NJ.addresses().length === 0;
 
    title.textContent = addr ? 'Edit address' : 'Add new address';
    labelEl.value  = addr ? addr.label : 'Home';
    street.value   = addr ? addr.street : '';
    city.value     = addr ? addr.city : '';
    stateEl.value  = addr ? addr.state : 'Lagos';
    phoneEl.value  = addr ? (addr.phone || '') : '';
    defEl.checked  = addr ? !!addr.isDefault : first;
    // the only address (or the current default) has to stay the default
    defEl.disabled = first || (addr && addr.isDefault);
 
    clearError();
    modal.showModal();
    street.focus();
  }
 
  document.getElementById('addAddressBtn').addEventListener('click', () => openForm(null));
  document.getElementById('closeAddress').addEventListener('click', () => modal.close());
  document.getElementById('cancelAddress').addEventListener('click', () => modal.close());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });
 
  // Edit / Set as default / Delete (one listener for the whole list)
  const deleteTimers = new WeakMap();
  document.getElementById('addressList').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    const card = e.target.closest('.addressCard');
    if (!btn || !card) return;
    const id = card.dataset.id;
    const addr = NJ.addresses().find(a => a.id === id);
    if (!addr) return;
 
    if (btn.classList.contains('addrEdit')) return openForm(addr);
 
    if (btn.classList.contains('addrDefault')) {
      NJ.saveAddress({ id, isDefault: true });
      renderAddresses();
      return showToast(addr.label + ' is now your default address');
    }
 
    if (btn.classList.contains('addrDelete')) {
      // first tap asks "Sure?", second tap within 3 seconds deletes
      if (!deleteTimers.has(btn)) {
        btn.textContent = 'Tap again to delete';
        deleteTimers.set(btn, setTimeout(() => { btn.textContent = 'Delete'; deleteTimers.delete(btn); }, 3000));
        return;
      }
      clearTimeout(deleteTimers.get(btn));
      NJ.removeAddress(id);
      renderAddresses();
      showToast('Address deleted');
    }
  });
 
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearError();
 
    const data = {
      label:  labelEl.value,
      street: street.value.trim(),
      city:   city.value.trim(),
      state:  stateEl.value,
      phone:  phoneEl.value.trim()
    };
 
    if (data.street.length < 5) return fail(street, 'Enter the full street address, with the house number.');
    if (data.city.length < 2)   return fail(city, 'Enter your city or area.');
    if (!data.state)            return fail(stateEl, 'Choose your state.');
    if (data.phone && !/^(\+234|0)\d{10}$/.test(data.phone.replace(/\s/g, '')))
                                return fail(phoneEl, 'Use a Nigerian number like 08012345678.');
 
    data.isDefault = defEl.checked;
    if (editingId) data.id = editingId;
 
    try {
      NJ.saveAddress(data);
    } catch {
      return fail(street, "Couldn't save. Your browser storage may be full.");
    }
 
    renderAddresses();
    modal.close();
    showToast(editingId ? 'Address updated' : 'Address saved');
  });
 
  renderAddresses();   // show whatever is already saved
}
 
/* ---------- wishlist ---------- */
function setupWishlist() {
  const list     = document.getElementById('wishList');
  const empty    = document.getElementById('wishEmpty');
  const stat     = document.getElementById('statWish');
  const toggle   = document.getElementById('wishToggle');
  if (!list || !empty || typeof NJWish === 'undefined') return;
 
  const PREVIEW = 4;                       // how many show before "View all"
  let showAll = false;
  const naira = n => '\u20A6' + n.toLocaleString('en-NG');
  const labelFor = c => ({ skincare: 'Skincare', suncare: 'Suncare', makeup: 'Makeup', haircare: 'Haircare',
                           'body/bath': 'Body Care', fragrance: 'Fragrance' })[c] || 'Other';
 
  // one saved product, drawn with the same card styles as the shop
  function makeCard(p) {
    const price = typeof BeautyAPI !== 'undefined' ? BeautyAPI.demoPrice(p.id) : 0;
 
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
      img.onerror = showInitial;
      img.src = p.image_url;
      imgBox.append(img);
    } else {
      showInitial();
    }
 
    const brand = document.createElement('p');
    brand.className = 'productBrand';
    brand.textContent = p.brand;
 
    const name = document.createElement('h3');
    name.className = 'productName';
    name.textContent = p.name;
 
    const meta = document.createElement('div');
    meta.className = 'productMeta';
    const tag = document.createElement('span');
    tag.className = 'productTag';
    tag.textContent = labelFor(p.category);
    meta.append(tag);
    if (price) {
      const priceEl = document.createElement('span');
      priceEl.className = 'productPrice';
      priceEl.textContent = naira(price);
      meta.append(priceEl);
    }
 
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'productAdd';
    add.textContent = 'Add to cart';
    add.setAttribute('aria-label', 'Add ' + p.name + ' to cart');
    add.addEventListener('click', () => {
      if (typeof NJCart === 'undefined' || !price) return showToast("Cart isn't available on this page");
      try {
        const result = NJCart.add(p, price);
        showToast(result === 'max' ? 'Maximum of ' + NJCart.MAX_QTY + ' per product'
                : result === 'more' ? 'Quantity updated in your cart'
                : 'Added to cart');
      } catch {
        showToast("Couldn't add that. Browser storage may be full.");
      }
    });
 
    card.append(imgBox, NJWish.makeButton(p, showToast), brand, name, meta, add);
    return card;
  }
 
  function render() {
    const hadFocus = list.contains(document.activeElement);   // keyboard user just removed something
    const items = NJWish.items();
 
    if (stat) stat.textContent = items.length;
    empty.hidden = items.length > 0;
    list.replaceChildren(...(showAll ? items : items.slice(0, PREVIEW)).map(makeCard));
 
    if (toggle) {
      toggle.hidden = items.length <= PREVIEW;
      toggle.textContent = showAll ? 'Show less' : 'View all (' + items.length + ')';
    }
    if (hadFocus) {                                            // do not drop keyboard focus on the floor
      const next = list.querySelector('.wishBtn');
      if (next) next.focus();
      else { empty.tabIndex = -1; empty.focus(); }
    }
  }
 
  if (toggle) toggle.addEventListener('click', (e) => { e.preventDefault(); showAll = !showAll; render(); });
  window.addEventListener('njwish', render);
  render();
}
 