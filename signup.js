/* ===== BACKEND CONFIG (Abbas868 backend on Railway) ===== */
const API_BASE = 'https://backend-production-d71ae.up.railway.app';
const SIGNUP_PATHS = ['/api/auth/signup', '/api/auth/register']; // first path that exists on your server is used
const REDIRECT_AFTER_SIGNUP = 'dashboard.html'; // used when the server returns a token
const LOGIN_PAGE = 'index.html';                // used when signup works but no token is returned

(() => {
  const c = document.getElementById('bg'), x = c.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w, h, dpr, P = [];
  const size = () => {
    dpr = Math.min(devicePixelRatio || 1, 2); w = c.width = innerWidth * dpr; h = c.height = innerHeight * dpr;
    P = Array.from({ length: Math.min(70, Math.floor(innerWidth / 18)) }, () => ({
      x: Math.random() * w, y: Math.random() * h, r: (Math.random() * 1.6 + .6) * dpr,
      vx: (Math.random() - .5) * .25 * dpr, vy: (Math.random() - .5) * .25 * dpr, p: Math.random() * 6.28 }));
  };
  const draw = () => {
    x.clearRect(0, 0, w, h);
    for (const a of P) {
      a.x = (a.x + a.vx + w) % w; a.y = (a.y + a.vy + h) % h; a.p += .02;
      const g = .35 + .35 * Math.sin(a.p);
      x.beginPath(); x.arc(a.x, a.y, a.r, 0, 6.28); x.fillStyle = `rgba(150,235,255,${g})`;
      x.shadowColor = '#5de0ff'; x.shadowBlur = 8 * dpr; x.fill();
    }
    if (!still) requestAnimationFrame(draw);
  };
  addEventListener('resize', () => { size(); if (still) draw(); });
  size(); draw();
})();

const $ = (id) => document.getElementById(id);
const msg = $('msg'), go = $('go'), pw = $('pw'), pw2 = $('pw2');
const label = (t) => (go.querySelector('.lbl').textContent = t);

function show(text) {
  msg.textContent = text; msg.classList.add('show'); msg.classList.remove('shake');
  void msg.offsetWidth; msg.classList.add('shake');
}
const clear = () => msg.classList.remove('show');

document.querySelectorAll('.eye').forEach((b) => {
  b.addEventListener('pointerdown', (e) => e.preventDefault()); // keep keyboard/focus on the input
  b.onclick = () => {
    const i = $(b.dataset.t), hidden = i.type === 'password';
    i.type = hidden ? 'text' : 'password';
    b.querySelector('.slash').classList.toggle('hide', !hidden);
    b.setAttribute('aria-label', hidden ? 'Hide password' : 'Show password');
    b.setAttribute('aria-pressed', String(hidden));
  };
});

pw.addEventListener('input', () => {
  const v = pw.value;
  let s = 0;
  if (v.length >= 8) s++;
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
  if (/\d/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  if (!v) s = 0;
  $('meter').dataset.s = s;
  $('hint').textContent = !v ? 'Use letters, numbers and a symbol for a stronger password.'
    : ['Too weak', 'Weak: add more characters', 'Fair: add numbers or a symbol', 'Good', 'Strong'][s];
});

async function post(path, body) {
  const r = await fetch(API_BASE + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  return { r, d };
}

$('f').addEventListener('submit', async (e) => {
  e.preventDefault(); clear();
  const name = $('name').value.trim(), email = $('email').value.trim(), password = pw.value;
  if (!name) return show('Enter your full name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return show('Enter a valid email address.');
  if (password.length < 8) return show('Use at least 8 characters for your password.');
  if (password !== pw2.value) return show('Passwords do not match.');
  if (!$('terms').checked) return show('Please accept the Terms and Privacy Policy to continue.');
  go.disabled = true; go.classList.add('load'); label('Creating account…');
  try {
    // extra aliases (fullName/username) are harmless; the backend ignores fields it does not use
    const body = { name, fullName: name, username: name, email, password, confirmPassword: pw2.value };
    let res = null;
    for (const p of SIGNUP_PATHS) {
      res = await post(p, body);
      if (res.r.status !== 404) break; // route exists
    }
    const { r, d } = res;
    if (r.status === 404) throw new Error('Signup route not found on the server. Check SIGNUP_PATHS in signup.js.');
    if (!r.ok || d.success === false) throw new Error(d.message || d.error || 'Could not create your account. Please try again.');

    const token = d.token || d.accessToken || (d.data && d.data.token);
    const user = d.user || (d.data && d.data.user) || null;
    if (token) { localStorage.setItem('token', token); if (user) localStorage.setItem('user', JSON.stringify(user)); }

    go.classList.remove('load'); go.classList.add('ok'); label('Account created ✓');
    setTimeout(() => (location.href = token ? REDIRECT_AFTER_SIGNUP : LOGIN_PAGE), 800);
  } catch (err) {
    show(err.message === 'Failed to fetch' ? 'Cannot reach the server. Check your connection.' : err.message);
    go.disabled = false; go.classList.remove('load'); label('Create Account');
  }
});
