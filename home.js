/* Needs api.js (CONFIG, $, esc, api, logout, getUser, authReady) loaded first */
let pollTimer = null;
logoutHooks.push(() => clearInterval(pollTimer));

/* ===== MENU ===== */
function setMenu(o) {
  document.body.classList.toggle('open', o);
  $('#menu').setAttribute('aria-hidden', !o);
  $('#burger').setAttribute('aria-expanded', o);
}

/* ===== VIEWS (hash router) ===== */
const VIEWS = ['home', 'ai', 'notifications', 'profile', 'settings'];
function route() {
  const name = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home';
  VIEWS.forEach((v) => ($('#v-' + v).hidden = v !== name));
  setMenu(false);
  if (name === 'notifications') openNotes();
  if (name === 'profile') renderProfile();
  if (name === 'settings') renderSettings();
  if (name === 'ai') setTimeout(() => $('#ci').focus(), 50);
  scrollTo(0, 0);
}

/* ===== USER ===== */
function applyUser() {
  const u = getUser();
  $('#hi').textContent = u.name ? 'Hi, ' + u.name : 'Welcome';
  $('#nm').textContent = u.name ? ', ' + u.name.split(' ')[0] : '';
}
function renderProfile() {
  const u = getUser();
  $('#pf').innerHTML = `<h3>${esc(u.name || 'User')}</h3><p>${esc(u.email || '')}</p>`;
}

/* ===== NOTIFICATIONS ===== */
let notes = [], known = null;
const seen = new Set(JSON.parse(localStorage.getItem('seenNotes') || '[]'));
const canNotify = () => 'Notification' in window;
const nid = (n) => String(n._id ?? n.id ?? n.createdAt);
const isNew = (n) => !n.read && !seen.has(nid(n));
function updateBadge() {
  const c = notes.filter(isNew).length;
  $('#badge').hidden = !c; $('#badge').textContent = c > 9 ? '9+' : c;
}
function popup(n) {
  if (canNotify() && Notification.permission === 'granted') {
    try { new Notification(n.title || 'Nexora', { body: n.message || n.body || '' }); } catch { /* ignore */ }
  }
}
async function loadNotes() {
  try {
    const d = await api(CONFIG.EP.notifications);
    notes = d.notifications || [];
    if (known) notes.filter((n) => !known.has(nid(n))).forEach(popup);
    known = new Set(notes.map(nid));
    updateBadge();
    if (!$('#v-notifications').hidden) drawNotes();
  } catch (e) { if (!$('#v-notifications').hidden) $('#nl').innerHTML = `<p class="empty">${esc(e.message)}</p>`; }
}
const ICONS = { purchase: '🛍️', account: '👤', message: '💬', system: '⚙️', update: '📢' };
function drawNotes() {
  $('#nl').innerHTML = notes.length ? notes.map((n) => `<div class="n${isNew(n) ? ' new' : ''}"><span class="ni">${ICONS[n.type] || '🔔'}</span><div><h4>${esc(n.title || 'Notification')}</h4><p>${esc(n.message || n.body || '')}</p>${n.createdAt ? `<small>${esc(new Date(n.createdAt).toLocaleString('en-IN'))}</small>` : ''}</div></div>`).join('')
    : '<p class="empty">No notifications yet.</p>';
}
async function openNotes() {
  $('#ask').hidden = !(canNotify() && Notification.permission === 'default');
  await loadNotes();
  drawNotes();
  notes.forEach((n) => seen.add(nid(n)));
  localStorage.setItem('seenNotes', JSON.stringify([...seen].slice(-300)));
  updateBadge();
  /* mark read on server too (best effort) */
  api('/api/notifications/read-all', { method: 'PATCH' }).catch(() => {});
}
async function askPermission() {
  if (!canNotify()) return;
  await Notification.requestPermission();
  $('#ask').hidden = true; renderSettings();
}

/* ===== SETTINGS ===== */
const say = (el, t, bad) => { el.textContent = t || ''; el.className = 'msg' + (t ? (bad ? ' bad' : ' good') : ''); };
async function busy(form, fn, out) {
  const b = form.querySelector('button[type=submit]'); b.disabled = true; say(out, '');
  try { await fn(); } catch (e) { say(out, e.message, true); }
  b.disabled = false;
}

function renderSettings() {
  const u = getUser();
  pwReset(u.email || '');
  const s = !canNotify() ? 'Your browser does not support notifications.'
    : Notification.permission === 'granted' ? 'Enabled ✓ You will get a browser alert for new notifications.'
    : Notification.permission === 'denied' ? 'Blocked. Allow notifications for this site in your browser settings.'
    : 'Not enabled yet.';
  $('#ns').textContent = s;
  $('#ne').hidden = !(canNotify() && Notification.permission === 'default');
}

/* change password: email -> send OTP -> (OTP + new password) -> success
   Backend note: /otp/verify deletes the OTP, so the OTP is checked by /auth/reset-password itself. */
const pw = { email: '' };
let cd = null;
function pwStep(n) {
  document.querySelectorAll('#pwc .step').forEach((s) => (s.hidden = s.dataset.s != n));
  document.querySelectorAll('#steps li').forEach((li, i) => li.classList.toggle('on', i < n));
  say($('#pwm'), '');
}
function pwReset(email) {
  clearInterval(cd); pw.email = '';
  ['#po', '#np', '#cp'].forEach((s) => ($(s).value = ''));
  $('#pe').value = email; pwStep(1);
}
function cooldown() {
  let s = 30; const b = $('#rs'); b.disabled = true; b.textContent = `Resend in ${s}s`; clearInterval(cd);
  cd = setInterval(() => {
    s--; if (s <= 0) { clearInterval(cd); b.disabled = false; b.textContent = 'Resend OTP'; } else b.textContent = `Resend in ${s}s`;
  }, 1000);
}
const sendOtp = (email) => api(CONFIG.EP.sendOtp, { method: 'POST', body: JSON.stringify({ email, purpose: 'forgot-password' }) });

function initPassword() {
  const out = $('#pwm');
  $('#pw1').onsubmit = (e) => {
    e.preventDefault();
    busy($('#pw1'), async () => {
      const email = $('#pe').value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Please enter a valid email address.');
      await sendOtp(email);
      pw.email = email; $('#pto').textContent = email; pwStep(2); cooldown();
      say(out, 'OTP sent. Check your email.');
    }, out);
  };
  $('#rs').onclick = async () => {
    try { await sendOtp(pw.email); cooldown(); say(out, 'OTP sent again.'); } catch (e) { say(out, e.message, true); }
  };
  $('#pw2').onsubmit = (e) => {
    e.preventDefault();
    busy($('#pw2'), async () => {
      const otp = $('#po').value.trim(), a = $('#np').value, b = $('#cp').value;
      if (!/^\d{6}$/.test(otp)) throw new Error('Please enter the 6-digit OTP from your email.');
      if (a.length < 8) throw new Error('Password must be at least 8 characters.');
      if (a !== b) throw new Error('Passwords do not match.');
      await api(CONFIG.EP.resetPassword, { method: 'POST', body: JSON.stringify({ email: pw.email, otp, newPassword: a }) });
      ['#np', '#cp', '#po'].forEach((s) => ($(s).value = ''));
      clearInterval(cd); pwStep(3);
    }, out);
  };
}

/* ===== AI CHAT ===== */
function addMsg(text, cls) {
  const d = document.createElement('div'); d.className = 'm ' + cls; d.textContent = text;
  $('#msgs').appendChild(d); $('#msgs').scrollTop = 1e9; return d;
}
const chatHistory = []; // backend accepts [{role:'user'|'model', text}]
function initChat() {
  $('#cf').onsubmit = async (e) => {
    e.preventDefault();
    const t = $('#ci').value.trim(); if (!t) return;
    $('#ci').value = ''; addMsg(t, 'me');
    const w = addMsg('', 'bot'); w.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';
    $('#cs').disabled = true;
    try {
      const d = await api(CONFIG.EP.ai, { method: 'POST', body: JSON.stringify({ message: t, history: chatHistory.slice(-12) }) });
      const reply = d.message || d.reply || 'No reply received.';
      w.textContent = reply;
      chatHistory.push({ role: 'user', text: t }, { role: 'model', text: reply });
    } catch (err) { w.textContent = err.message; w.classList.add('err'); }
    $('#cs').disabled = false; $('#msgs').scrollTop = 1e9; $('#ci').focus();
  };
}

/* ===== BOOT ===== */
authReady.then(() => {
  applyUser();
  $('#burger').onclick = () => setMenu(true);
  $('#prof').onclick = () => (location.hash = '#profile');
  $('#close').onclick = $('#ov').onclick = () => setMenu(false);
  $('#menu').addEventListener('click', (e) => e.target.closest('a') && setMenu(false));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  $('#logout').onclick = logout;
  $('#bell').onclick = () => (location.hash = '#notifications');
  $('#allow').onclick = $('#ne').onclick = askPermission;
  $('#deny').onclick = () => ($('#ask').hidden = true);
  initPassword(); initChat();

  document.body.classList.remove('gate');
  addEventListener('hashchange', route);
  route();
  loadNotes();
  pollTimer = setInterval(loadNotes, CONFIG.POLL_MS);
});
