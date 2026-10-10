/* navuser.js: turns the nav's profile icon into the signed-in person's photo or initials.
   Needs nothing else. Add it to the bottom of every page that has <a class="profileLink">.
   Signed out: shows the plain person icon and links to the sign-in page.
   Signed in:  shows their photo (or initials) and links to profile.html. */
(function () {
  const link = document.querySelector('.profileLink');
  if (!link) return;

  const plainIcon = Array.from(link.childNodes).map(n => n.cloneNode(true));   // the person icon written in the HTML
  let paintId = 0;                                                             // lets us ignore a photo that loads too late

  function currentUser() {
    try { return JSON.parse(localStorage.getItem('njUser')); } catch { return null; }
  }

  function initialsOf(name) {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '?';
    const first = Array.from(words[0])[0];
    const last  = words.length > 1 ? Array.from(words[words.length - 1])[0] : '';
    return (first + last).toUpperCase();
  }

  function paint() {
    const id = ++paintId;
    const user = currentUser();

    if (!user || !user.email) {                       // nobody signed in
      link.href = 'signin.html';
      link.title = 'Sign in';
      link.setAttribute('aria-label', 'Sign in');
      link.classList.remove('hasUser');
      link.replaceChildren(...plainIcon.map(n => n.cloneNode(true)));
      return;
    }

    const name = (user.name || '').trim() || user.email.split('@')[0];
    link.href = 'profile.html';
    link.title = name;
    link.setAttribute('aria-label', 'My account, ' + name);
    link.classList.add('hasUser');

    const avatar = document.createElement('span');    // initials first, so something shows straight away
    avatar.className = 'navAvatar';
    avatar.textContent = initialsOf(name);
    link.replaceChildren(avatar);

    if (user.picture) {                               // then swap in the photo once it has loaded
      const img = new Image();
      img.alt = '';
      img.referrerPolicy = 'no-referrer';             // Google photo links sometimes fail without this
      img.onload = () => { if (paintId === id) avatar.replaceChildren(img); };
      img.src = user.picture;                         // if it fails to load, the initials stay
    }
  }

  paint();

  // keep it right when they sign in or out in another tab, or come back with the Back button
  window.addEventListener('storage', (e) => { if (e.key === null || e.key === 'njUser' || e.key === 'njUsers') paint(); });
  window.addEventListener('pageshow', (e) => { if (e.persisted) paint(); });
})();