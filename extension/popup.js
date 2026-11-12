/* global extractProduct, chrome */
const $ = (id) => document.getElementById(id);
const store = { get: (k) => chrome.storage.local.get(k), set: (o) => chrome.storage.local.set(o), remove: (k) => chrome.storage.local.remove(k) };
let cfg = {};
let data = null;

async function call(path, { method = 'GET', body } = {}) {
  const r = await fetch(cfg.api.replace(/\/$/, '') + path, {
    method, headers: { 'Content-Type': 'application/json', ...(cfg.token && { Authorization: 'Bearer ' + cfg.token }) },
    body: body && JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) { await store.remove('token'); throw new Error('Your session expired. Connect again.'); }
  if (!r.ok) throw new Error(d.error || `Request failed (${r.status})`);
  return d;
}

function show(id) { ['connect', 'work'].forEach((x) => { $(x).hidden = x !== id; }); }

async function init() {
  cfg = await store.get(['api', 'site', 'token', 'name', 'phone']);
  $('api').value = cfg.api || ''; $('site').value = cfg.site || ''; $('phone').value = cfg.phone || '';
  if (!cfg.token || !cfg.api) { show('connect'); return; }
  $('who').textContent = `${cfg.name || 'Signed in'} · ${new URL(cfg.api).host}`;
  $('logout').hidden = false;
  show('work');
  readPage();
}

$('login').onclick = async () => {
  const api = $('api').value.trim().replace(/\/$/, '');
  if (!/^https?:\/\/.+\/api$/.test(api)) { alert('The API address ends with /api, e.g. https://api.yourshop.com/api'); return; }
  cfg = { api };
  try {
    const r = await call('/auth/login', { method: 'POST', body: { phone: $('phone').value, password: $('password').value } });
    if (!r.user.permissions?.includes('products')) throw new Error('This account cannot manage products.');
    await store.set({ api, site: $('site').value.trim().replace(/\/$/, ''), token: r.token, name: r.user.name, phone: $('phone').value });
    init();
  } catch (e) { alert(e.message); }
};
$('logout').onclick = async () => { await store.remove(['token']); location.reload(); };

async function readPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!/^https?:/.test(tab?.url || '')) throw new Error('Open a product page first, then click the extension.');
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractProduct });
    data = result;
    const cats = await call('/categories');
    fill(cats);
  } catch (e) { $('status').textContent = e.message; }
}

function fill(cats) {
  $('status').textContent = `Found on this page (${data.source}). Check and edit, then import.`;
  $('name').value = data.name || '';
  $('price').value = data.price ?? '';
  $('salePrice').value = data.salePrice ?? '';
  $('description').value = data.description || '';
  if (data.currency && !/BDT|৳/i.test(data.currency)) { $('currency').hidden = false; $('currency').textContent = `Prices on this page are in ${data.currency}. Change them to taka before importing.`; }
  const sel = $('category');
  sel.innerHTML = cats.map((c) => `<option value="${c._id}">${c.name.replace(/</g, '&lt;')}</option>`).join('') + '<option value="__new">+ New category…</option>';
  const guess = cats.find((c) => data.category && c.name.toLowerCase() === data.category.toLowerCase());
  if (guess) sel.value = guess._id; else if (data.category) { sel.value = '__new'; $('newCat').value = data.category; }
  $('newCatWrap').hidden = sel.value !== '__new';
  sel.onchange = () => { $('newCatWrap').hidden = sel.value !== '__new'; };
  const box = $('images');
  box.innerHTML = '';
  data.images.forEach((u, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'img on'; b.dataset.url = u; b.title = u;
    b.innerHTML = `<img src="${u.replace(/"/g, '&quot;')}" alt="" referrerpolicy="no-referrer"><i>${i + 1}</i>`;
    b.onclick = () => b.classList.toggle('on');
    box.appendChild(b);
  });
  if (!data.images.length) box.innerHTML = '<p class="muted">No images found on this page.</p>';
  $('toggleAll').onclick = () => { const any = box.querySelector('.img.on'); box.querySelectorAll('.img').forEach((x) => x.classList.toggle('on', !any)); $('toggleAll').textContent = any ? 'all' : 'none'; };
  if (data.variants?.length) { $('variantsWrap').hidden = false; $('variantsInfo').textContent = data.variants.map((v) => v.label).slice(0, 6).join(', '); }
  $('form').hidden = false;
}

$('form').onsubmit = async (e) => {
  e.preventDefault();
  $('error').hidden = true;
  $('import').disabled = true; $('import').textContent = 'Importing…';
  try {
    const images = [...document.querySelectorAll('#images .img.on')].map((b) => b.dataset.url);
    const cat = $('category').value === '__new' ? $('newCat').value.trim() : $('category').value;
    const p = await call('/products/import', { method: 'POST', body: {
      name: $('name').value.trim(), price: $('price').value, salePrice: $('salePrice').value, category: cat || 'Imported',
      stock: $('stock').value, unit: $('unit').value, description: $('description').value, images, details: data.details,
      variants: $('useVariants').checked ? data.variants : [], active: $('active').checked, sourceUrl: data.sourceUrl,
    } });
    $('form').hidden = true; $('done').hidden = false;
    $('doneName').textContent = p.name;
    const site = cfg.site || (await store.get('site')).site;
    $('openProduct').hidden = !site; if (site) $('openProduct').href = `${site}/product/${encodeURIComponent(p.slug)}`;
    $('openAdmin').hidden = !site; if (site) $('openAdmin').href = `${site}/admin#products`;
  } catch (err) {
    $('error').hidden = false; $('error').textContent = err.message;
  }
  $('import').disabled = false; $('import').textContent = 'Import to store';
};

init();
