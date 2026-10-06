/* ===== SHARED: backend config + auth. Used by home.html and video.html. ===== */
const CONFIG = {
  API: 'https://backend-production-d71ae.up.railway.app',
  LOGIN: 'login.html',
  EP: {
    me: '/api/auth/me',
    notifications: '/api/notifications',          // GET -> { notifications: [{ _id, type, title, message, read, createdAt }] }
    ai: '/api/ai/chat',                           // POST { message } -> { message }
    videos: '/api/videos/feed',                   // GET -> { videos: [{ _id, videoUrl, caption, hashtags, creator:{name} }] }
    sendOtp: '/api/otp/send',                     // POST { email, purpose:'forgot-password' }
    resetPassword: '/api/auth/reset-password'     // POST { email, otp, newPassword }
  },
  POLL_MS: 30000,
};

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tok = () => localStorage.getItem('token');
const getUser = () => { try { return JSON.parse(localStorage.getItem('user')) || {}; } catch { return {}; } };
const logoutHooks = [];

function logout() {
  logoutHooks.forEach((f) => { try { f(); } catch { /* ignore */ } });
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  location.replace(CONFIG.LOGIN);
}

async function api(path, opt = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 30000);
  try {
    const r = await fetch(CONFIG.API + path, {
      ...opt,
      signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok() }
    });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) { logout(); throw new Error('Session expired.'); }
    if (!r.ok || d.success === false) throw new Error(d.message || 'Something went wrong. Please try again.');
    return d;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Server is not responding. Please try again.');
    throw e;
  } finally { clearTimeout(t); }
}

/* Resolves for a valid session; invalid token -> login. Server slow/offline -> page still opens (8s timeout). */
const authReady = (async () => {
  if (!tok()) { logout(); return new Promise(() => {}); }
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(CONFIG.API + CONFIG.EP.me, { headers: { Authorization: 'Bearer ' + tok() }, signal: ctl.signal });
    clearTimeout(t);
    if (r.status === 401 || r.status === 403) { logout(); return new Promise(() => {}); }
    const d = r.ok ? await r.json().catch(() => ({})) : {};
    if (d.user) localStorage.setItem('user', JSON.stringify(d.user));
  } catch { /* offline/timeout: let the page open */ }
})();

addEventListener('pageshow', (e) => { if (e.persisted && !tok()) logout(); });
