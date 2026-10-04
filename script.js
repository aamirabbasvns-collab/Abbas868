/* Set your Railway URL if the frontend is hosted separately, e.g. 'https://your-app.up.railway.app' */
const API_BASE = 'backend-production-d71ae.up.railway.app';

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

document.querySelectorAll('.eye').forEach((b) => b.onclick = () => {
  const i = $(b.dataset.t), hidden = i.type === 'password';
  i.type = hidden ? 'text' : 'password';
  b.querySelector('.slash').classList.toggle('hide', !hidden);
  b.setAttribute('aria-label', hidden ? 'Hide password' : 'Show password');
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

document.querySelectorAll('.sbtn').forEach((b) => b.onclick = async () => {
  clear();
  const r = await fetch(API_BASE + '/api/auth/' + b.dataset.p, { credentials: 'include' });
  if (r.redirected) return (location.href = r.url);
  const d = await r.json().catch(() => ({}));
  show(d.error || 'Social sign-up is unavailable right now.');
});

$('f').addEventListener('submit', async (e) => {
  e.preventDefault(); clear();
  const email = $('email').value.trim(), password = pw.value;
  if (!$('name').value.trim()) return show('Enter your full name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return show('Enter a valid email address.');
  if (password.length < 8) return show('Use at least 8 characters for your password.');
  if (password !== pw2.value) return show('Passwords do not match.');
  if (!$('terms').checked) return show('Please accept the Terms and Privacy Policy to continue.');
  go.disabled = true; go.classList.add('load'); label('Creating account…');
  try {
    const r = await fetch(API_BASE + '/api/auth/signup', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: $('name').value.trim(), email, password }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Could not create your account. Please try again.');
    go.classList.remove('load'); go.classList.add('ok'); label('Account created ✓');
    setTimeout(() => (location.href = API_BASE + '/dashboard'), 700);
  } catch (err) {
    show(err.message === 'Failed to fetch' ? 'Cannot reach the server. Check your connection.' : err.message);
    go.disabled = false; go.classList.remove('load'); label('Create Account');
  }
});
