document.querySelectorAll('.pw-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = btn.closest('.pw-wrap').querySelector('input');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.setAttribute('aria-pressed', show);
    btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });
});

function resetPwToggles(scope) {
  scope.querySelectorAll('.pw-wrap').forEach(wrap => {
    wrap.querySelector('input').type = 'password';
    const btn = wrap.querySelector('.pw-toggle');
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', 'Show password');
  });
}

/* ---------- sign-in form ---------- */
document.getElementById('signinForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('siEmail').value.trim();
  const pass  = document.getElementById('siPass').value;
  const err   = document.getElementById('siError');

  if (!/^\S+@\S+\.\S+$/.test(email) || !pass) {
    err.textContent = 'Enter a valid email and your password.';
    err.hidden = false;
    return;
  }
  err.hidden = true;
  window.location.href = 'profile.html';   // demo: nothing is verified
});

/* ---------- sign-up popup ---------- */
const modal      = document.getElementById('signupModal');
const signupForm = document.getElementById('signupForm');
const suError    = document.getElementById('suError');

document.querySelectorAll('.openSignup').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    modal.showModal();
  });
});

document.getElementById('closeSignup').addEventListener('click', () => modal.close());

// only the dark backdrop makes e.target the dialog itself
modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.close();
});

modal.addEventListener('close', () => {
  signupForm.reset();
  suError.hidden = true;
  signupForm.querySelectorAll('.invalid').forEach(i => i.classList.remove('invalid'));
  resetPwToggles(modal);
});

signupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  suError.hidden = true;
  signupForm.querySelectorAll('.invalid').forEach(i => i.classList.remove('invalid'));

  const nameEl  = document.getElementById('suName');
  const emailEl = document.getElementById('suEmail');
  const phoneEl = document.getElementById('suPhone');
  const passEl  = document.getElementById('suPass');

  const fail = (input, msg) => {
    input.classList.add('invalid');
    suError.textContent = msg;
    suError.hidden = false;
    input.focus();
  };

  const phone = phoneEl.value.replace(/\s/g, '');

  if (nameEl.value.trim().length < 2)           return fail(nameEl, 'Please enter your full name.');
  if (!/^\S+@\S+\.\S+$/.test(emailEl.value.trim())) return fail(emailEl, 'That email does not look right.');
  if (phone && !/^(\+234|0)\d{10}$/.test(phone)) return fail(phoneEl, 'Use a Nigerian number like 08012345678.');
  if (passEl.value.length < 8)                  return fail(passEl, 'Password must be at least 8 characters.');

  // demo only: store the profile, never the password
  localStorage.setItem(NJ.save({
  name: nameEl.value.trim(),
  email: emailEl.value.trim(),
  phone: phoneEl.value.trim()
}));
if (!NJ.login(email)) {
  err.textContent = 'No account found for that email in this browser. Sign up first.';
  err.hidden = false;
  return;
}
err.hidden = true;
window.location.href = 'profile.html';
})