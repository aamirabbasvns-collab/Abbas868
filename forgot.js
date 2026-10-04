/* ===== BACKEND CONFIG (Abbas868 backend on Railway) ===== */
const API_BASE = 'https://backend-production-d71ae.up.railway.app';
const SEND_OTP_PATH = '/api/otp/send';
const RESET_PATH = '/api/auth/reset-password';
const LOGIN_PAGE = 'login.html';
const RESEND_SECONDS = 60;

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
const msg = $('msg');
let email = '', tick = null;

function show(text, ok) {
  msg.textContent = text; msg.classList.toggle('info', !!ok);
  msg.classList.add('show'); msg.classList.remove('shake');
  if (!ok) { void msg.offsetWidth; msg.classList.add('shake'); }
}
const clear = () => msg.classList.remove('show');
const busy = (btn, on, text) => {
  btn.disabled = on; btn.classList.toggle('load', on);
  if (text) btn.querySelector('.lbl').textContent = text;
};
async function post(path, body) {
  const r = await fetch(API_BASE + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return { r, d: await r.json().catch(() => ({})) };
}
const netMsg = (e) => (e.message === 'Failed to fetch' ? 'Cannot reach the server. Check your connection.' : e.message);

// show/hide password
document.querySelectorAll('.eye').forEach((b) => {
  b.addEventListener('pointerdown', (e) => e.preventDefault());
  b.onclick = () => {
    const i = $(b.dataset.t), hidden = i.type === 'password';
    i.type = hidden ? 'text' : 'password';
    b.querySelector('.slash').classList.toggle('hide', !hidden);
    b.setAttribute('aria-label', hidden ? 'Hide password' : 'Show password');
  };
});

// password strength
$('pw').addEventListener('input', () => {
  const v = $('pw').value; let s = 0;
  if (v.length >= 8) s++;
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
  if (/\d/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  if (!v) s = 0;
  $('meter').dataset.s = s;
  $('hint').textContent = !v ? 'Use letters, numbers and a symbol for a stronger password.'
    : ['Too weak', 'Weak: add more characters', 'Fair: add numbers or a symbol', 'Good', 'Strong'][s];
});
$('otp').addEventListener('input', (e) => (e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6)));

// resend countdown
function startTimer() {
  let n = RESEND_SECONDS; const b = $('resend'); b.disabled = true;
  clearInterval(tick);
  const set = () => (b.textContent = n > 0 ? `Resend in ${n}s` : 'Resend OTP');
  set();
  tick = setInterval(() => { n--; set(); if (n <= 0) { clearInterval(tick); b.disabled = false; } }, 1000);
}

async function sendOtp(btn, label) {
  busy(btn, true, 'Sending…');
  try {
    const { r, d } = await post(SEND_OTP_PATH, { email, purpose: 'forgot-password' });
    if (!r.ok || d.success === false) throw new Error(d.message || 'Could not send the code. Try again.');
    $('f1').classList.add('hide'); $('f2').classList.remove('hide');
    $('title').textContent = 'Reset your password';
    $('sub').textContent = 'Enter the 6-digit code sent to ' + email;
    show('If this email has an account, a code is on its way. It expires in 10 minutes.', true);
    startTimer(); $('otp').focus();
  } catch (err) { show(netMsg(err)); }
  busy(btn, false, label);
}

$('f1').addEventListener('submit', (e) => {
  e.preventDefault(); clear();
  email = $('email').value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return show('Enter a valid email address.');
  sendOtp($('go'), 'Send OTP');
});
$('resend').onclick = () => { clear(); sendOtp($('resend'), 'Resend OTP'); };
$('change').onclick = () => {
  clearInterval(tick); clear();
  $('f2').classList.add('hide'); $('f1').classList.remove('hide');
  $('title').textContent = 'Forgot password?';
  $('sub').textContent = "Enter your email and we'll send you a verification code";
};

$('f2').addEventListener('submit', async (e) => {
  e.preventDefault(); clear();
  const otp = $('otp').value, pw = $('pw').value, go2 = $('go2');
  if (otp.length !== 6) return show('Enter the 6-digit code from your email.');
  if (pw.length < 8) return show('Use at least 8 characters for your new password.');
  if (pw !== $('pw2').value) return show('Passwords do not match.');
  busy(go2, true, 'Resetting…');
  try {
    // The backend checks the OTP itself inside reset-password, so /api/otp/verify is NOT called (it would delete the code).
    const { r, d } = await post(RESET_PATH, { email, otp, newPassword: pw });
    if (!r.ok || d.success === false) throw new Error(d.message || 'Could not reset your password. Try again.');
    busy(go2, false, 'Password reset ✓'); go2.disabled = true; go2.classList.add('ok');
    show('Password updated. Redirecting to sign in…', true);
    setTimeout(() => (location.href = LOGIN_PAGE), 1500);
  } catch (err) { show(netMsg(err)); busy(go2, false, 'Reset Password'); }
});
