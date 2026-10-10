const NJ = {
  _read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },

  users()   { return this._read('njUsers', {}); },   // everyone who signed up in this browser
  current() { return this._read('njUser', null); },  // whoever is signed in right now

  // create or update an account, and sign that person in
  save(user) {
    const key = user.email.trim().toLowerCase();
    const users = this.users();
    const merged = { joined: new Date().toISOString(), ...users[key], ...user };
    users[key] = merged;
    localStorage.setItem('njUsers', JSON.stringify(users));
    localStorage.setItem('njUser', JSON.stringify(merged));
    return merged;
  },

  // email sign-in: works only for accounts created in this browser
  login(email) {
    const user = this.users()[email.trim().toLowerCase()];
    if (!user) return null;
    localStorage.setItem('njUser', JSON.stringify(user));
    return user;
  },

  /* ---------- addresses (stored on the user as an array) ---------- */
  addresses() { return (this.current() || {}).addresses || []; },

  // add a new address, or edit one when it has an id. Exactly one address is always the default.
  saveAddress(addr) {
    let list = this.addresses().slice();
    const i = list.findIndex(a => a.id === addr.id);

    if (i >= 0) list[i] = { ...list[i], ...addr };
    else        list.push({ ...addr, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) });

    const saved = i >= 0 ? list[i] : list[list.length - 1];
    if (list.length === 1) saved.isDefault = true;                       // the first one is always the default
    if (saved.isDefault) list = list.map(a => ({ ...a, isDefault: a.id === saved.id }));
    if (!list.some(a => a.isDefault)) list[0].isDefault = true;          // never end up with no default

    this.update({ addresses: list });
    return saved;
  },

  removeAddress(id) {
    const list = this.addresses().filter(a => a.id !== id);
    if (list.length && !list.some(a => a.isDefault)) list[0].isDefault = true;   // promote another one
    this.update({ addresses: list });
  },
  
  logout() { localStorage.removeItem('njUser'); }
};