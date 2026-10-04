/* ===== BACKEND CONFIG (Abbas868 backend on Railway) ===== */
const API_BASE = 'https://backend-production-d71ae.up.railway.app';
const LOGIN_PATHS = ['/api/auth/login', '/api/auth/signin']; // first path that exists on your server is used
const REDIRECT_AFTER_LOGIN = 'dashboard.html';              // page opened after successful login

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

// Already signed in? Go straight to the app.
if (localStorage.getItem('token')) location.replace(REDIRECT_AFTER_LOGIN);

const $ = (id) => document.getElementById(id);
const msg = $('msg'), go = $('go'), pw = $('pw');
const label = (t) => (go.querySelector('.lbl').textContent = t);

function show(text) {
  msg.textContent = text; msg.classList.add('show'); msg.classList.remove('shake');
  void msg.offsetWidth; msg.classList.add('shake');
}
const clear = () => msg.classList.remove('show');

$('eye').addEventListener('pointerdown', (e) => e.preventDefault());
$('eye').onclick = () => {
  const hidden = pw.type === 'password';
  pw.type = hidden ? 'text' : 'password';
  $('slash').classList.toggle('hide', !hidden);
  $('eye').setAttribute('aria-label', hidden ? 'Hide password' : 'Show password');
  $('eye').setAttribute('aria-pressed', String(hidden));
};

$('fp').onclick = (e) => { e.preventDefault(); show('Password reset is coming soon. Contact support for help.'); };

async function post(path, body) {
  const r = await fetch(API_BASE + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  return { r, d };
}

$('f').addEventListener('submit', async (e) => {
  e.preventDefault(); clear();
  const email = $('email').value.trim(), password = pw.value;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return show('Enter a valid email address.');
  if (!password) return show('Enter your password.');
  go.disabled = true; go.classList.add('load'); label('Signing in…');
  try {
    let res = null;
    for (const p of LOGIN_PATHS) {
      res = await post(p, { email, password });
      if (res.r.status !== 404) break; // route exists
    }
    const { r, d } = res;
    if (r.status === 404) throw new Error('Login route not found on the server. Check LOGIN_PATHS in script.js.');
    if (!r.ok || d.success === false) throw new Error(d.message || d.error || 'Incorrect email or password.');

    const token = d.token || d.accessToken || (d.data && d.data.token);
    const user = d.user || (d.data && d.data.user) || null;
    if (!token) throw new Error('Login worked but the server sent no token. Send routes/auth.js so I can match it.');
    localStorage.setItem('token', token);
    if (user) localStorage.setItem('user', JSON.stringify(user));

    go.classList.remove('load'); go.classList.add('ok'); label('Success ✓');
    setTimeout(() => (location.href = REDIRECT_AFTER_LOGIN), 600);
  } catch (err) {
    show(err.message === 'Failed to fetch' ? 'Cannot reach the server. Check your connection.' : err.message);
    go.disabled = false; go.classList.remove('load'); label('Login');
  }
});
