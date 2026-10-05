const API = 'https://backend-production-d71ae.up.railway.app';
const LOGIN = 'login.html';
let PAGE = 'home';

const W = [
  { id: 'ai-machine', n: 'AI Machine', c: 'AI / Technology', tags: 'ai technology', d: 'Futuristic AI product website with animated hero and feature sections.', p: 999, o: 1499, r: 4.8, v: 312, e: '🤖', h: 260, demo: 'https://example.com/ai-machine', f: ['Animated hero', 'Feature grid', 'Pricing section', 'Contact form'], pg: ['Home', 'Features', 'Pricing', 'Contact'] },
  { id: 'nextgen', n: 'NextGen', c: 'Education', tags: 'education learning', d: 'Modern education website for courses, instructors and enrolments.', p: 1499, o: 0, r: 4.7, v: 241, e: '🎓', h: 200, demo: 'https://example.com/nextgen', f: ['Course catalog', 'Instructor profiles', 'Enrol call-to-action', 'Testimonials'], pg: ['Home', 'Courses', 'Instructors', 'Contact'] },
  { id: 'mytube', n: 'MyTube', c: 'Video Platform', tags: 'video platform', d: 'Video platform UI with browse grid, player page and categories.', p: 1299, o: 1799, r: 4.6, v: 198, e: '🎬', h: 350, demo: 'https://example.com/mytube', f: ['Video grid', 'Player page', 'Category filters', 'Search'], pg: ['Home', 'Watch', 'Categories', 'Library'] },
  { id: 'abbas-portfolio', n: 'Abbas Portfolio', c: 'Portfolio', tags: 'portfolio personal', d: 'Clean personal portfolio to showcase projects, skills and contact info.', p: 799, o: 0, r: 4.9, v: 356, e: '🧑‍💻', h: 160, demo: 'portfolio.html', f: ['Project gallery', 'Skills section', 'About me', 'Contact links'], pg: ['Home', 'Projects', 'About', 'Contact'] },
  { id: 'modern-business', n: 'Modern Business', c: 'Business', tags: 'business company agency', d: 'Professional business website with services, team and enquiry form.', p: 1199, o: 1599, r: 4.7, v: 274, e: '💼', h: 30, demo: 'buisness.html', f: ['Services section', 'Team cards', 'Client logos', 'Enquiry form'], pg: ['Home', 'Services', 'About', 'Contact'] },
  { id: 'language-learning', n: 'Language Learning', c: 'Education', tags: 'education language learning', d: 'Interactive language learning site with lessons and progress sections.', p: 1499, o: 0, r: 4.6, v: 167, e: '🗣️', h: 300, demo: 'https://example.com/language-learning', f: ['Lesson cards', 'Progress tracker', 'Level selector', 'Pricing'], pg: ['Home', 'Lessons', 'Pricing', 'Contact'] },
  { id: 'ai-learning-platform', n: 'AI Learning Platform', c: 'AI / Education', tags: 'ai education learning dashboard', d: 'AI powered learning platform with dashboard-style interface.', p: 1999, o: 2499, r: 4.9, v: 289, e: '🧠', h: 240, demo: 'https://example.com/ai-learning-platform', f: ['Dashboard UI', 'Course modules', 'AI tutor section', 'Progress charts'], pg: ['Home', 'Dashboard', 'Courses', 'Contact'] },
];
const CATS = [['Business Websites', '💼', 'business'], ['Portfolio Websites', '🧑‍💻', 'portfolio'], ['E-commerce Websites', '🛒', 'ecommerce'], ['AI Websites', '🤖', 'ai'], ['Education Websites', '🎓', 'education'], ['Blog Websites', '✍️', 'blog'], ['Landing Pages', '🚀', 'landing'], ['Dashboard UI', '📊', 'dashboard'], ['Restaurant Websites', '🍽️', 'restaurant'], ['Agency Websites', '🏢', 'agency']];

/* Social links */
const SOCIAL = [
  ['GitHub', 'https://github.com/aamir133667'],
  ['Instagram', 'https://instagram.com/aamir.86043'],
  ['Facebook', 'https://www.facebook.com/search/top?q=' + encodeURIComponent('Aamir Abbas')],
  ['YouTube', 'https://youtube.com'],
];

/* ===== HELPERS + AUTH ===== */
const $ = (s, r = document) => r.querySelector(s);
const tok = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null') || {};
const inr = (n) => '₹' + n.toLocaleString('en-IN');
const stars = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); location.replace(LOGIN); };
const api = (path, opt = {}) => fetch(API + path, { ...opt, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok } })
  .then(async (r) => {
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) logout();
    if (!r.ok || d.success === false) throw new Error(d.message || 'Something went wrong. Please try again.');
    return d;
  });
const PREVIEW = /[?&]preview\b/.test(location.search) && ['localhost', '127.0.0.1', ''].includes(location.hostname);
let qs = new URLSearchParams();

/* ===== SOLD STATE ===== */
const SOLD = new Set(JSON.parse(localStorage.getItem('sold') || '[]'));
const saveSold = () => localStorage.setItem('sold', JSON.stringify([...SOLD]));
let rerender = null; // set by pages that show product cards
async function loadSold() {
  // 1) websites sold to anyone (needs GET /api/purchases/sold -> { sold: ['id', ...] } on the backend)
  try { const d = await api('/api/purchases/sold'); (d.sold || d.ids || []).forEach((id) => SOLD.add(id)); } catch (e) { /* endpoint not added yet */ }
  // 2) websites bought by this user
  try { const d = await api('/api/purchases/mine'); (d.purchases || []).forEach((x) => x.status === 'paid' && SOLD.add(x.productId)); } catch (e) { /* ignore */ }
  saveSold();
  if (rerender) rerender();
}

if (PREVIEW) setTimeout(boot);
else if (!tok) logout();
else fetch(API + '/api/auth/me', { headers: { Authorization: 'Bearer ' + tok } }) // backend decides, not localStorage
  .then((r) => { if (r.status === 401 || r.status === 403) throw 0; return r.ok ? r.json() : {}; })
  .then((d) => { if (d.user) { localStorage.setItem('user', JSON.stringify(d.user)); Object.assign(user, d.user); } boot(); })
  .catch((e) => (e === 0 ? logout() : boot()));

/* ===== SHARED LAYOUT ===== */
const shot = (p, big, sold) => `<div class="shot${big ? ' big' : ''}" style="--h:${p.h};position:relative"><div class="bar"><i></i><i></i><i></i></div><div class="sb"><span>${p.e}</span><u></u><u></u></div>${sold ? '<b class="sold-tag">SOLD</b>' : ''}</div>`;
function layout() {
  $('#hd').outerHTML = `<header class="hd"><a class="brand" href="#/"><i></i>Abbas868</a>
  <form class="search" id="sf" role="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="q" type="search" placeholder="Search websites (AI, Portfolio, Education…)" aria-label="Search websites"></form>
  <div class="acts"><a class="ib" href="#/purchases" aria-label="Cart and purchases"><svg viewBox="0 0 24 24"><path d="M3 4h2l2.5 11h10L20 7H6"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></svg></a>
  <button class="ib" id="prof" aria-label="Profile"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg></button>
  <button class="ib" id="burger" aria-label="Open menu" aria-expanded="false"><span class="bg"><i></i><i></i><i></i></span></button></div></header>
  <div class="ov" id="ov"></div>
  <aside class="menu" id="menu" aria-hidden="true"><div class="mh"><a class="brand" href="#/"><i></i>Abbas868</a><button class="ib" id="close" aria-label="Close menu">✕</button></div>
  <p class="hi">${user.name ? 'Hi, ' + user.name : 'Welcome'}</p>
  <nav><a href="#/">🏠 Home</a><a href="#/websites">🌐 Websites</a><a href="#/demos">🎬 Demos</a><a href="#/about">ℹ️ About</a><a href="#/purchases">🧾 My Purchases</a><a href="#/contact">✉️ Contact</a><a href="aamir.html">🤝 Meet with Aamir</a><button id="logout">🚪 Logout</button></nav></aside>`;
  $('#ft').outerHTML = `<footer><div class="wrap fg"><div><a class="brand" href="#/"><i></i>Abbas868</a><p>Professional websites. Ready to launch.</p>
  <div class="chips">${SOCIAL.map((s) => `<a class="chip" href="${s[1]}" target="_blank" rel="noopener noreferrer">${s[0]}</a>`).join('')}</div></div>
  <div><h4>EXPLORE</h4><a href="#/">Home</a><a href="#/websites">Websites</a><a href="#/demos">Demos</a><a href="#/about">About</a><a href="#/purchases">My Purchases</a></div>
  <div><h4>COMPANY</h4><a href="aamir.html">Meet with Aamir</a><a href="#/contact">Contact</a><a href="#">Privacy Policy</a><a href="#">Terms &amp; Conditions</a></div></div>
  <p class="copy">© 2026 Abbas868. All rights reserved.</p></footer>`;
  const set = (o) => { document.body.classList.toggle('open', o); $('#menu').setAttribute('aria-hidden', !o); $('#burger').setAttribute('aria-expanded', o); };
  $('#burger').onclick = $('#prof').onclick = () => set(true);
  $('#close').onclick = $('#ov').onclick = () => set(false);
  $('#menu').addEventListener('click', (e) => e.target.closest('a') && set(false)); // close menu after choosing an item
  addEventListener('keydown', (e) => e.key === 'Escape' && set(false));
  $('#logout').onclick = logout;
  $('#sf').onsubmit = (e) => { e.preventDefault(); if (PAGE !== 'websites') location.hash = '#/websites?q=' + encodeURIComponent($('#q').value); };
}

/* ===== BUY + PAYMENT (all secrets live on the backend) ===== */
const loadRzp = () => window.Razorpay ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.onload = ok; s.onerror = () => no(new Error('Could not load the payment window.')); document.head.appendChild(s); });
function buy(id) {
  const p = W.find((x) => x.id === id); if (!p || SOLD.has(id)) return;
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="box" role="dialog" aria-modal="true"><h3>Confirm your purchase</h3><div class="sp"><b>${p.n}</b><b>${inr(p.p)}</b></div>
  <h4>WHAT'S INCLUDED</h4><ul><li>Complete website source code</li><li>${p.pg.length} pages: ${p.pg.join(', ')}</li><li>Responsive design, ready to customize</li><li>Download access in My Purchases</li></ul>
  <h4>LICENSE</h4><p>One website project per purchase. You may customize it for yourself or a client. Reselling or redistributing the source code is not allowed.</p>
  <div class="row"><button class="btn ghost" id="cx">Cancel</button><button class="btn" id="pay">Proceed to Payment</button></div><small id="pm"></small></div>`;
  document.body.appendChild(m);
  const say = (t) => ($('#pm', m).textContent = t), btn = $('#pay', m);
  $('#cx', m).onclick = () => m.remove(); m.onclick = (e) => e.target === m && m.remove();
  btn.onclick = async () => {
    btn.disabled = true; say('Creating your order…');
    try {
      const o = await api('/api/purchases/order', { method: 'POST', body: JSON.stringify({ productId: p.id }) });
      await loadRzp();
      new Razorpay({
        key: o.keyId, order_id: o.orderId, amount: o.amount, currency: 'INR', name: 'Abbas868', description: p.n,
        prefill: { name: user.name, email: user.email }, theme: { color: '#7c5cff' },
        handler: async (r) => { // backend verifies the signature before anything is unlocked
          say('Verifying payment…');
          try {
            await api('/api/purchases/verify', { method: 'POST', body: JSON.stringify(r) });
            SOLD.add(p.id); saveSold(); // mark as sold right away
            location.hash = '#/purchases?new=1';
          } catch (e) { say(e.message); }
        },
        modal: { ondismiss: () => { btn.disabled = false; say('Payment cancelled.'); } },
      }).open();
    } catch (e) { btn.disabled = false; say(e.message); }
  };
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-buy]'); if (b && !b.disabled) buy(b.dataset.buy); });

/* ===== PAGES ===== */
const buyBtn = (p, cls = 'btn sm') => SOLD.has(p.id)
  ? `<button class="${cls} ghost" disabled style="opacity:.6;cursor:not-allowed">Sold</button>`
  : `<button class="${cls}" data-buy="${p.id}">Buy Now</button>`;

const card = (p) => { const s = SOLD.has(p.id); return `<article class="card rv${s ? ' sold' : ''}">${shot(p, false, s)}<span class="cc">${p.c}</span><h3>${p.n}</h3><p>${p.d}</p>
<div class="chips"><span class="chip ok">Responsive</span><span class="chip">HTML</span><span class="chip">CSS</span><span class="chip">JavaScript</span></div>
<div class="pr">${inr(p.p)}${p.o ? `<s>${inr(p.o)}</s>` : ''}<span class="st">${stars(p.r)} ${p.r}</span></div>
<div class="row"><a class="btn ghost sm" href="${p.demo}" target="_blank" rel="noopener noreferrer">Live Demo</a><a class="btn ghost sm" href="#/site/${p.id}">View Details</a>${buyBtn(p)}</div></article>`; };

/* HOME: only the hero */
function home() {
  rerender = null;
  $('#app').innerHTML = `<section class="wrap hero"><div class="hc"><h1>Premium Websites. <em>Ready to Launch.</em></h1>
  <p>Explore professionally designed websites, templates and complete web projects. Preview the live demo and purchase the website that fits your needs.</p>
  <div class="cta"><a class="btn" href="#/websites">Explore Websites</a><a class="btn ghost" href="#/demos">View Demos</a></div>
  <ul class="trust"><li>✓ Responsive Design</li><li>✓ Clean Code</li><li>✓ Ready to Customize</li><li>✓ Secure Purchase</li></ul></div>
  <div class="hv">${shot({ h: 260, e: '🌐' }, true)}</div></section>`;
}

/* WEBSITES: categories + marketplace */
function websites() {
  $('#app').innerHTML = `<h2>Explore Website Categories</h2><div class="cats">${CATS.map((c) => `<button class="cat" data-k="${c[2]}"><span>${c[1]}</span>${c[0]}</button>`).join('')}</div>
  <h2 style="margin-top:44px">Featured Websites</h2><div class="tools">
  <select id="fc" aria-label="Category"><option value="">All categories</option>${[...new Set(W.map((p) => p.c))].map((c) => `<option>${c}</option>`).join('')}</select>
  <select id="fp" aria-label="Price"><option value="">Any price</option><option value="1000">Under ₹1,000</option><option value="1500">Under ₹1,500</option><option value="9999">₹1,500 and above</option></select>
  <select id="ft" aria-label="Technology"><option value="">All technologies</option><option>HTML</option><option>CSS</option><option>JavaScript</option></select>
  <select id="fs" aria-label="Sort"><option value="pop">Most popular</option><option value="lo">Price: low to high</option><option value="hi">Price: high to low</option></select><small id="cn"></small></div>
  <div class="grid" id="grid"></div>`;
  const q = $('#q'); q.value = qs.get('q') || '';
  const run = () => {
    const t = q.value.trim().toLowerCase(), c = $('#fc').value, pr = +$('#fp').value, te = $('#ft').value.toLowerCase(), s = $('#fs').value;
    let l = W.filter((p) => (!t || (p.n + ' ' + p.c + ' ' + p.tags + ' ' + p.d + ' html css javascript').toLowerCase().includes(t))
      && (!c || p.c === c) && (!te || 'html css javascript'.includes(te))
      && (!pr || (pr === 9999 ? p.p >= 1500 : p.p < pr)));
    l.sort((a, b) => (SOLD.has(a.id) - SOLD.has(b.id)) || (s === 'lo' ? a.p - b.p : s === 'hi' ? b.p - a.p : b.v - a.v)); // sold ones go last
    $('#grid').innerHTML = l.length ? l.map(card).join('') : '<p class="empty">No websites match your search. Try another keyword.</p>';
    $('#cn').textContent = l.length + ' website' + (l.length === 1 ? '' : 's'); reveal();
  };
  rerender = run;
  q.oninput = run; ['#fc', '#fp', '#ft', '#fs'].forEach((s) => ($(s).onchange = run));
  document.querySelectorAll('.cat').forEach((b) => (b.onclick = () => { q.value = b.dataset.k; run(); $('#grid').scrollIntoView(); }));
  run();
}

/* DEMOS: only demos */
function demos() {
  rerender = null;
  $('#app').innerHTML = `<h2>Try Before You Buy</h2><div class="g">${W.map((p) => `<div class="card">${shot(p, false, SOLD.has(p.id))}<h3>${p.n}</h3><a class="btn" href="${p.demo}" target="_blank" rel="noopener noreferrer">Open Live Demo</a></div>`).join('')}</div>`;
}

function details() {
  const p = W.find((x) => x.id === qs.get('id'));
  rerender = () => details();
  if (!p) return ($('#app').innerHTML = '<p class="empty">Website not found. <a href="#/websites" style="color:var(--b)">Back to marketplace</a></p>');
  document.title = p.n + ' | Abbas868';
  const s = SOLD.has(p.id);
  $('#app').innerHTML = `<a href="#/websites" style="color:var(--mute)">← All websites</a><div class="dt" style="margin-top:20px"><div>${shot(p, true, s)}</div><div>
  <span class="cc" style="color:var(--b);font-weight:600">${p.c}</span><h1 style="font-size:2.2rem;margin:6px 0">${p.n}</h1><div class="st" style="color:#fbbf24">${stars(p.r)} ${p.r}</div>
  <p class="lead" style="margin:12px 0">${p.d}</p><div class="pr" style="font-size:1.8rem;margin-bottom:18px">${inr(p.p)}${p.o ? `<s>${inr(p.o)}</s>` : ''}</div>
  <div class="row"><a class="btn ghost" href="${p.demo}" target="_blank" rel="noopener noreferrer">Live Demo</a>${buyBtn(p, 'btn')}</div></div></div>
  <div class="g" style="margin-top:34px"><div class="fc"><h3>✨ Features</h3><ul>${p.f.map((x) => `<li>${x}</li>`).join('')}</ul></div>
  <div class="fc"><h3>📄 Pages included</h3><ul>${p.pg.map((x) => `<li>${x}</li>`).join('')}</ul></div>
  <div class="fc"><h3>⚙️ Technologies</h3><p>HTML, CSS, JavaScript. No framework required.</p></div>
  <div class="fc"><h3>📱 Responsive</h3><p>Looks great on mobile, tablet, laptop and desktop screens.</p></div>
  <div class="fc"><h3>🌐 Compatibility</h3><p>Chrome, Edge, Firefox, Safari. Android, iOS, Windows and macOS.</p></div></div>`;
}

async function purchases() {
  rerender = null;
  const box = $('#app'); box.innerHTML = '<h1>My <em>Purchases</em></h1><p class="lead" id="pn">Loading your purchases…</p><div class="g" id="pl"></div>';
  if (qs.get('new')) $('#pn').textContent = 'Payment successful! Your website is ready below.';
  try {
    const d = await api('/api/purchases/mine'), list = d.purchases || [];
    $('#pn').textContent = qs.get('new') ? 'Payment successful! Your website is ready below.' : list.length ? '' : 'You have no purchases yet.';
    $('#pl').innerHTML = list.map((x) => {
      const p = W.find((w) => w.id === x.productId) || { n: x.productId, e: '🌐', h: 260, demo: '#' };
      return `<div class="card">${shot(p)}<h3>${p.n}</h3><div class="pc" style="padding:0"><div class="sp"><span>Order ID</span><span>${x.orderId}</span></div>
      <div class="sp"><span>Purchased</span><span>${new Date(x.paidAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span></div>
      <div class="sp"><span>Payment</span><span class="chip ok">${x.status === 'paid' ? 'Paid' : x.status}</span></div></div>
      <div class="row">${x.accessUrl ? `<a class="btn sm" href="${x.accessUrl}" target="_blank" rel="noopener noreferrer">Download / Access</a>` : ''}<a class="btn ghost sm" href="${p.demo}" target="_blank" rel="noopener noreferrer">View Website</a></div></div>`;
    }).join('');
  } catch (e) { $('#pn').textContent = e.message; }
}

function reveal() {
  const io = new IntersectionObserver((es) => es.forEach((x) => x.isIntersecting && (x.target.classList.add('in'), io.unobserve(x.target))), { threshold: .1 });
  document.querySelectorAll('.rv:not(.in)').forEach((el) => io.observe(el));
}
function about() {
  rerender = null;
  $('#app').innerHTML = `<h1>About <em>NGI web</em></h1><p class="lead">Abbas868 provides professionally designed, ready-to-use websites and templates for developers, businesses, students and creators.</p>
  <div class="g"><div class="fc"><h3>🎯 Mission</h3><p>Make launching a professional website fast, affordable and simple.</p></div><div class="fc"><h3>📦 What we provide</h3><p>Complete websites and templates with source code, ready to customize.</p></div><div class="fc"><h3>⚙️ Technology</h3><p>Clean, responsive HTML, CSS and JavaScript that works on every device.</p></div><div class="fc"><h3>💬 Support</h3><p>Help with setup and questions after you buy.</p></div><div class="fc"><h3>🔒 Secure purchasing</h3><p>Payments are handled and verified by our backend. We never see your card details.</p></div></div>`;
}
function contact() {
  rerender = null;
  $('#app').innerHTML = `<h1>Contact <em>us</em></h1><p class="lead">Questions about a website, a purchase or customization? Email us and we will reply as soon as we can.</p>
  <div class="fc"><h3>Email</h3><p><a href="mailto:aamirabbas0078.com">aamirabbas0078.com</a> (replace with your real address)</p></div>`;
}

/* Single-page router: #/  #/websites  #/demos  #/site/<id>  #/purchases  #/about  #/contact
   Only the page picked in the menu is shown; every other page stays hidden. */
const ROUTES = { home, websites, demos, site: details, purchases, about, contact };
function route() {
  const [path, query] = location.hash.replace(/^#\/?/, '').split('?');
  const [name, arg] = path.split('/');
  qs = new URLSearchParams(query || ''); if (arg) qs.set('id', arg);
  PAGE = ROUTES[name] ? name : 'home';
  document.title = 'Abbas868 | Premium Websites';
  document.body.classList.remove('open'); $('#menu').setAttribute('aria-hidden', 'true');
  $('#app').className = PAGE === 'home' ? '' : 'wrap';
  ROUTES[PAGE]();
  reveal();
  scrollTo(0, 0);
}
function boot() {
  document.body.classList.remove('gate'); layout(); route();
  addEventListener('hashchange', route);
  if (!PREVIEW) loadSold();
}
document.addEventListener('click', (e) => { // smooth page transitions between internal pages (e.g. aamir.html)
  const a = e.target.closest('a[href]');
  if (!a || a.target || /^(#|https?:|mailto:)/.test(a.getAttribute('href'))) return;
  e.preventDefault(); document.body.classList.add('leave'); setTimeout(() => (location.href = a.href), 200);
});
addEventListener('pageshow', (e) => e.persisted && document.body.classList.remove('leave'));
