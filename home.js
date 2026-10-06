/* ===== CONFIG: backend URL and endpoints live here, in ONE place ===== */
const CONFIG = {
  API: 'https://backend-production-d71ae.up.railway.app',
  LOGIN: 'login.html',
  EP: {
    me: '/api/auth/me',              // existing
    notifications: '/api/notifications', // GET -> { notifications: [{ id, type, title, message, createdAt }] }
    ai: '/api/ai/chat',              // POST { message } -> { reply }
    videos: '/api/videos',           // GET -> { videos: [{ id, url, title, description, creator }] }
  },
  POLL_MS: 30000,
};

/* ===== HELPERS + AUTH ===== */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tok = () => localStorage.getItem('token');
let pollTimer = null;

function logout() { // clear ONLY auth data, then replace history entry so Back can't return
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  clearInterval(pollTimer);
  location.replace(CONFIG.LOGIN);
}
async function api(path, opt = {}) {
  const r = await fetch(CONFIG.API + path, { ...opt, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok() } });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) { logout(); throw new Error('Session expired.'); }
  if (!r.ok || d.success === false) throw new Error(d.message || 'Something went wrong. Please try again.');
  return d;
}
const getUser = () => { try { return JSON.parse(localStorage.getItem('user')) || {}; } catch { return {}; } };

/* Guard: the backend decides, not localStorage */
(async function guard() {
  if (!tok()) return logout();
  try {
    const r = await fetch(CONFIG.API + CONFIG.EP.me, { headers: { Authorization: 'Bearer ' + tok() } });
    if (r.status === 401 || r.status === 403) return logout();
    const d = r.ok ? await r.json().catch(() => ({})) : {};
    if (d.user) localStorage.setItem('user', JSON.stringify(d.user));
  } catch { /* offline: allow, API calls will fail on their own */ }
  boot();
})();
// Back/forward cache after logout: re-check the token
addEventListener('pageshow', (e) => { if (e.persisted && !tok()) logout(); });

/* ===== MENU ===== */
function setMenu(o) {
  document.body.classList.toggle('open', o);
  $('#menu').setAttribute('aria-hidden', !o);
  $('#burger').setAttribute('aria-expanded', o);
}

/* ===== VIEWS (hash router) ===== */
const VIEWS = ['home', 'ai', 'video', 'notifications', 'profile', 'settings'];
function route() {
  const name = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home';
  VIEWS.forEach((v) => ($('#v-' + v).hidden = v !== name));
  setMenu(false);
  if (name !== 'video') $('#vp').pause();
  if (name === 'video') openVideos();
  if (name === 'notifications') openNotes();
  if (name === 'profile') renderProfile();
  if (name === 'settings') renderSettings();
  if (name === 'ai') setTimeout(() => $('#ci').focus(), 50);
  scrollTo(0, 0);
}

/* ===== PROFILE ===== */
function renderProfile() {
  const u = getUser();
  $('#pf').innerHTML = `<h3>${esc(u.name || 'User')}</h3><p>${esc(u.email || '')}</p>`;
}

/* ===== NOTIFICATIONS (real, from backend) ===== */
let notes = [], known = null;
const seen = new Set(JSON.parse(localStorage.getItem('seenNotes') || '[]'));
const canNotify = () => 'Notification' in window;
const nid = (n) => String(n.id ?? n._id ?? n.createdAt);
function updateBadge() {
  const c = notes.filter((n) => !seen.has(nid(n))).length;
  $('#badge').hidden = !c; $('#badge').textContent = c > 9 ? '9+' : c;
}
function popup(n) { // browser notification, only if user allowed it
  if (canNotify() && Notification.permission === 'granted') {
    try { new Notification(n.title || 'Abbas868', { body: n.message || n.body || '' }); } catch { /* ignore */ }
  }
}
async function loadNotes() {
  try {
    const d = await api(CONFIG.EP.notifications);
    notes = d.notifications || [];
    if (known) notes.filter((n) => !known.has(nid(n))).forEach(popup); // only genuinely new ones
    known = new Set(notes.map(nid));
    updateBadge();
    if (!$('#v-notifications').hidden) drawNotes();
  } catch (e) { if (!$('#v-notifications').hidden) $('#nl').innerHTML = `<p class="empty">${esc(e.message)}</p>`; }
}
const ICONS = { purchase: '🛍️', account: '👤', message: '💬', system: '⚙️', update: '📢' };
function drawNotes() {
  $('#nl').innerHTML = notes.length ? notes.map((n) => `<div class="n${seen.has(nid(n)) ? '' : ' new'}"><span class="ni">${ICONS[n.type] || '🔔'}</span><div><h4>${esc(n.title || 'Notification')}</h4><p>${esc(n.message || n.body || '')}</p>${n.createdAt ? `<small>${esc(new Date(n.createdAt).toLocaleString('en-IN'))}</small>` : ''}</div></div>`).join('')
    : '<p class="empty">No notifications yet.</p>';
}
async function openNotes() {
  $('#ask').hidden = !(canNotify() && Notification.permission === 'default');
  await loadNotes();
  drawNotes();
  notes.forEach((n) => seen.add(nid(n)));
  localStorage.setItem('seenNotes', JSON.stringify([...seen].slice(-300)));
  updateBadge();
}
async function askPermission() {
  if (!canNotify()) return;
  await Notification.requestPermission();
  $('#ask').hidden = true; renderSettings();
}

/* ===== SETTINGS ===== */
function renderSettings() {
  const s = !canNotify() ? 'Your browser does not support notifications.'
    : Notification.permission === 'granted' ? 'Enabled ✓ You will get a browser alert for new notifications.'
    : Notification.permission === 'denied' ? 'Blocked. Allow notifications for this site in your browser settings.'
    : 'Not enabled yet.';
  $('#ns').textContent = s;
  $('#ne').hidden = !(canNotify() && Notification.permission === 'default');
}

/* ===== AI CHAT ===== */
function addMsg(text, cls) {
  const d = document.createElement('div'); d.className = 'm ' + cls; d.textContent = text; // textContent: safe
  $('#msgs').appendChild(d); $('#msgs').scrollTop = 1e9; return d;
}
$('#cf').onsubmit = async (e) => {
  e.preventDefault();
  const t = $('#ci').value.trim(); if (!t) return;
  $('#ci').value = ''; addMsg(t, 'me');
  const w = addMsg('', 'bot'); w.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';
  $('#cs').disabled = true;
  try {
    const d = await api(CONFIG.EP.ai, { method: 'POST', body: JSON.stringify({ message: t }) });
    w.textContent = d.reply || d.message || d.response || 'No reply received.';
  } catch (err) { w.textContent = err.message; w.classList.add('err'); }
  $('#cs').disabled = false; $('#msgs').scrollTop = 1e9; $('#ci').focus();
};

/* ===== VIDEO ===== */
let vids = [], vi = 0, loaded = false;
const vp = () => $('#vp');
async function openVideos() {
  if (loaded) return;
  try {
    const d = await api(CONFIG.EP.videos); vids = d.videos || []; loaded = true;
    if (!vids.length) { $('#vmsg').textContent = 'No videos yet.'; return; }
    $('#vmsg').hidden = true; $('#vwrap').hidden = false; showVideo(0);
  } catch (e) { $('#vmsg').textContent = e.message; }
}
function showVideo(i) {
  vi = (i + vids.length) % vids.length;
  const v = vids[vi], el = vp();
  el.src = v.url; el.load();
  $('#vt').textContent = v.title || ''; $('#vd').textContent = v.description || '';
  const c = typeof v.creator === 'object' ? (v.creator?.name || '') : (v.creator || '');
  $('#vc').textContent = c || 'Unknown creator'; $('#va').textContent = (c || '?')[0].toUpperCase();
  $('#vn').textContent = `Video ${vi + 1} of ${vids.length}`;
  el.play().catch(() => syncPlay());
}
const syncPlay = () => { $('#vplay').textContent = vp().paused ? '▶' : '⏸'; $('#vmute').textContent = vp().muted ? '🔇' : '🔊'; };
function togglePlay() { const el = vp(); el.paused ? el.play().catch(() => {}) : el.pause(); }

/* ===== BOOT ===== */
function boot() {
  const u = getUser();
  $('#hi').textContent = u.name ? 'Hi, ' + u.name : 'Welcome';
  if (u.name) $('#nm').textContent = ', ' + u.name.split(' ')[0];

  $('#burger').onclick = $('#prof').onclick = () => (location.hash === '#profile' ? route() : (setMenu(true)));
  $('#close').onclick = $('#ov').onclick = () => setMenu(false); // closes when clicking outside
  $('#menu').addEventListener('click', (e) => e.target.closest('a') && setMenu(false));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  $('#logout').onclick = logout;
  $('#bell').onclick = () => (location.hash = '#notifications');
  $('#allow').onclick = $('#ne').onclick = askPermission;
  $('#deny').onclick = () => ($('#ask').hidden = true);

  const el = vp();
  el.onclick = $('#vplay').onclick = togglePlay;
  el.onplay = el.onpause = el.onvolumechange = syncPlay;
  el.onended = () => showVideo(vi + 1);
  $('#vnext').onclick = () => showVideo(vi + 1);
  $('#vprev').onclick = () => showVideo(vi - 1);
  $('#vmute').onclick = () => { el.muted = !el.muted; };
  $('#vfs').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : $('#vbox').requestFullscreen?.());

  document.body.classList.remove('gate');
  addEventListener('hashchange', route);
  route();
  loadNotes();
  pollTimer = setInterval(loadNotes, CONFIG.POLL_MS);
}
