// ═══════════════════════════════════════════
// SUPABASE CLIENT (Direct REST API — no SDK needed)
// ═══════════════════════════════════════════
const SUPABASE_CONFIG_KEY = 'supabase_config';
let sbUrl = '';
let sbKey = '';

function getSupabaseConfig() {
  try { return JSON.parse(localStorage.getItem(SUPABASE_CONFIG_KEY)) || null; }
  catch(e) { return null; }
}

async function supabaseFetch(path, options = {}) {
  const config = getSupabaseConfig();
  if (!config) throw new Error('Supabase not connected');
  const url = config.url.replace(/\/$/, '') + '/rest/v1/' + path;
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': config.key,
      'Authorization': 'Bearer ' + config.key,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res;
}

function connectSupabase() {
  const url = document.getElementById('supabase-url').value.trim();
  const key = document.getElementById('supabase-key').value.trim();
  if (!url || !key) {
    setConnStatus('❌ Dono fields fill karo', 'var(--danger)');
    return;
  }
  localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify({ url, key }));
  updateDbStatus(true);
  setConnStatus('✅ Connected to Supabase! Loading data...', 'var(--success)');
  // Load data from cloud
  setTimeout(async () => {
    const ok = await loadFromSupabase();
    if (ok) {
      renderBoard(); renderCustomCreds();
      setConnStatus('✅ Connected! Data loaded from cloud.', 'var(--success)');
    } else {
      setConnStatus('✅ Connected! Tables may be empty. Use Force Sync to push local data.', 'var(--warning)');
    }
  }, 500);
}

function disconnectSupabase() {
  localStorage.removeItem(SUPABASE_CONFIG_KEY);
  updateDbStatus(false);
  setConnStatus('⛔ Disconnected', 'var(--warning)');
}

function updateDbStatus(online) {
  const dot = document.getElementById('dbDot');
  const label = document.getElementById('dbLabel');
  const syncDot = document.getElementById('syncDot');
  const syncLabel = document.getElementById('syncLabel');
  dot.className = 'sync-dot ' + (online ? 'online' : 'offline');
  label.textContent = online ? 'DB: Supabase ☁' : 'DB: Local 💾';
  syncDot.className = 'sync-dot ' + (online ? 'online' : 'offline');
  syncLabel.textContent = online
    ? 'Live: Auto-saving to Supabase ☁'
    : 'Local only 💾 — Connect Supabase for cloud sync';
}

function forceSyncAll() {
  const config = getSupabaseConfig();
  if (!config) return setConnStatus('❌ Pehle Connect karo', 'var(--danger)');
  setConnStatus('⏳ Syncing all data...', 'var(--warning)');
  data.tasks.forEach(t => syncTask(t));
  data.customCreds.forEach(c => syncCred(c));
  setConnStatus('✅ All data synced! ' + data.tasks.length + ' tasks, ' + data.customCreds.length + ' creds', 'var(--success)');
}

async function refreshFromSupabase() {
  const ok = await loadFromSupabase();
  if (ok) {
    renderBoard(); renderCustomCreds();
    setConnStatus('✅ Refreshed from Supabase!', 'var(--success)');
  } else {
    setConnStatus('❌ Could not load from Supabase. Connect first.', 'var(--danger)');
  }
}

function setConnStatus(msg, color) {
  const el = document.getElementById('connection-status');
  el.innerHTML = `<span style="color:${color}">${msg}</span>`;
}

function openSQLEditor() {
  const sql = `-- RestroMind System Hub — Tables
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo',
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.credentials (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  access JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon all" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all" ON public.credentials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all" ON public.users FOR ALL USING (true) WITH CHECK (true);`;
  
  const ta = document.createElement('textarea');
  ta.value = sql; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select(); document.execCommand('copy');
  document.body.removeChild(ta);
  window.open('https://supabase.com/dashboard/project/ifgblmrmckhhkyovnvuc/sql/new', '_blank');
  setConnStatus('✅ SQL copied! Naye tab mein paste (Ctrl+V) karo aur RUN dabao.', 'var(--success)');
}



// ═══════════════════════════════════════════
// DATA STORE — Supabase first, localStorage backup
// ═══════════════════════════════════════════
const STORAGE_KEY = 'restromind_system_hub';

const defaultData = {
  tasks: [
    { id: '1', title: 'Admin App - Auth Module', desc: 'Login, Register, Forgot Password, Token Refresh', status: 'done', tags: ['mobile', 'auth'] },
    { id: '2', title: 'Admin App - Dashboard', desc: 'Overview stats, recent updates, reports summary', status: 'done', tags: ['mobile', 'dashboard'] },
    { id: '3', title: 'Admin App - Menu Management', desc: 'CRUD dishes, search, pagination, category filter', status: 'done', tags: ['mobile', 'menu'] },
    { id: '4', title: 'Admin App - Categories', desc: 'CRUD categories, items by category, search', status: 'done', tags: ['mobile', 'categories'] },
    { id: '5', title: 'Admin App - Orders', desc: 'List, accept, reject, prep time, ready, complete', status: 'done', tags: ['mobile', 'orders'] },
    { id: '6', title: 'Admin App - Statistics', desc: 'Revenue, customers, peak hours, goals, category revenue', status: 'done', tags: ['mobile', 'stats'] },
    { id: '7', title: 'Admin App - Settings', desc: 'Profile, theme, notifications, change password', status: 'done', tags: ['mobile', 'settings'] },
    { id: '8', title: 'Backend - Auth APIs', desc: '4 endpoints: login, register, forgot-password, refresh', status: 'done', tags: ['backend', 'auth'] },
    { id: '9', title: 'Backend - Dashboard APIs', desc: '2 endpoints: overview, reports-summary', status: 'done', tags: ['backend', 'dashboard'] },
    { id: '10', title: 'Backend - Menu APIs', desc: '8 endpoints: CRUD, search, count, status, category-items', status: 'done', tags: ['backend', 'menu'] },
    { id: '11', title: 'Backend - Category APIs', desc: '6 endpoints: CRUD, items-by-category, search', status: 'done', tags: ['backend', 'categories'] },
    { id: '12', title: 'Backend - Order APIs', desc: '6 endpoints: list, accept, reject, prep-time, ready, complete', status: 'done', tags: ['backend', 'orders'] },
    { id: '13', title: 'Backend - Profile/Settings APIs', desc: '5 endpoints: profile, notifications, theme, change-password', status: 'done', tags: ['backend', 'settings'] },
    { id: '14', title: 'Backend - Statistics APIs', desc: '5 endpoints: revenue, customers, peak-hours, goals, category-revenue', status: 'done', tags: ['backend', 'stats'] },
    { id: '15', title: 'Backend - Upload API', desc: '1 endpoint: image upload to S3', status: 'done', tags: ['backend', 'upload'] },
    { id: '16', title: 'QA Regression Dashboard', desc: 'Test case management, API runner, DB explorer, APK tester', status: 'review', tags: ['qa', 'testing'] },
    { id: '17', title: 'System Hub Web App', desc: 'Centralized documentation & progress tracking (Supabase)', status: 'done', tags: ['docs', 'tooling'] },
    { id: '18', title: 'iOS App Store Release', desc: 'Build, sign, TestFlight, App Store submission', status: 'todo', tags: ['ios', 'release'] },
    { id: '19', title: 'Android Play Store Release', desc: 'Build AAB, Play Console, store listing', status: 'todo', tags: ['android', 'release'] },
    { id: '20', title: 'Performance Optimization', desc: 'API response times, image caching, lazy loading', status: 'in-progress', tags: ['backend', 'mobile', 'perf'] },
  ],
  customCreds: []
};

let data = JSON.parse(JSON.stringify(defaultData));
let editingTaskId = null;

function loadLocalData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      data.tasks = parsed.tasks || defaultData.tasks;
      data.customCreds = parsed.customCreds || [];
      return true;
    }
  } catch(e) {}
  return false;
}

function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ─── Auto-sync to Supabase (fire & forget) ───
async function syncTask(task) {
  const config = getSupabaseConfig();
  if (!config) return;
  try {
    await supabaseFetch('tasks', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({
        id: task.id, title: task.title, description: task.desc || '',
        status: task.status, tags: JSON.stringify(task.tags || []),
        updated_at: new Date().toISOString()
      })
    });
  } catch(e) { console.warn('Sync task failed:', e); }
}

async function deleteTaskFromSB(id) {
  const config = getSupabaseConfig();
  if (!config) return;
  try {
    await supabaseFetch('tasks?id=eq.' + id, { method: 'DELETE' });
  } catch(e) { console.warn('Delete task failed:', e); }
}

async function syncCred(cred) {
  const config = getSupabaseConfig();
  if (!config) return;
  try {
    await supabaseFetch('credentials', {
      method: 'POST',
      body: JSON.stringify({ label: cred.label, value: cred.value })
    });
  } catch(e) { console.warn('Sync cred failed:', e); }
}

async function deleteCredFromSB(label) {
  const config = getSupabaseConfig();
  if (!config) return;
  try {
    await supabaseFetch('credentials?label=eq.' + encodeURIComponent(label), { method: 'DELETE' });
  } catch(e) { console.warn('Delete cred failed:', e); }
}

async function loadFromSupabase() {
  const config = getSupabaseConfig();
  if (!config) return false;
  try {
    const tasksRes = await supabaseFetch('tasks?select=*&order=created_at.asc');
    const tasksData = await tasksRes.json();
    if (Array.isArray(tasksData) && tasksData.length) {
      data.tasks = tasksData.map(t => ({
        id: t.id, title: t.title, desc: t.description || '',
        status: t.status || 'todo',
        tags: typeof t.tags === 'string' ? JSON.parse(t.tags) : (t.tags || [])
      }));
    }
    const credsRes = await supabaseFetch('credentials?select=*&order=created_at.asc');
    const credsData = await credsRes.json();
    if (Array.isArray(credsData) && credsData.length) {
      data.customCreds = credsData.map(c => ({ label: c.label, value: c.value }));
    }
    saveLocal();
    return true;
  } catch(e) {
    console.warn('Supabase load failed, using local:', e);
    return false;
  }
}

// Init: try Supabase first, fallback to local
(async function initData() {
  const loaded = await loadFromSupabase();
  if (!loaded) loadLocalData();
  renderBoard();
  renderCustomCreds();
})();

// ═══════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════
document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('page-' + el.dataset.page).classList.add('active');
  });
});

// ═══════════════════════════════════════════
// CREDENTIALS
// ═══════════════════════════════════════════
function toggleCred(el) {
  const val = el.closest('.cred-item').querySelector('.cred-value');
  if (!val) return;
  val.classList.toggle('revealed');
  el.textContent = val.classList.contains('revealed') ? '🙈 Hide' : '👁️ Show';
}

function addCred() {
  const label = document.getElementById('new-cred-label').value.trim();
  const value = document.getElementById('new-cred-value').value.trim();
  if (!label || !value) return alert('Enter both label and value');
  data.customCreds.push({ label, value });
  saveLocal();
  syncCred({ label, value });
  renderCustomCreds();
  document.getElementById('new-cred-label').value = '';
  document.getElementById('new-cred-value').value = '';
}

function renderCustomCreds() {
  const container = document.getElementById('custom-creds');
  if (!data.customCreds.length) { container.innerHTML = ''; return; }
  container.innerHTML = `<div class="card"><h3>🔐 Custom Credentials</h3>${data.customCreds.map((c, i) => `
    <div class="cred-item">
      <div><div class="cred-label">${c.label}</div><div class="cred-value hidden-text">${c.value}</div></div>
      <div style="display:flex;gap:8px;">
        <span class="cred-toggle" onclick="toggleCred(this)">👁️ Show</span>
        <span class="cred-toggle" style="color:var(--danger);" onclick="deleteCred(${i})">🗑️</span>
      </div>
    </div>`).join('')}</div>`;
}

function deleteCred(i) {
  const cred = data.customCreds[i];
  data.customCreds.splice(i, 1);
  saveLocal();
  deleteCredFromSB(cred.label);
  renderCustomCreds();
}

// ═══════════════════════════════════════════
// ACCORDION
// ═══════════════════════════════════════════
function toggleAccordion(el) {
  el.parentElement.classList.toggle('open');
}

// ═══════════════════════════════════════════
// API TABLE
// ═══════════════════════════════════════════
function renderAPIs() {
  const apis = [
    {m:'Auth', method:'POST', ep:'/api/auth/login', desc:'Admin login', auth:'No'},
    {m:'Auth', method:'POST', ep:'/api/auth/admin/register', desc:'Register admin', auth:'No'},
    {m:'Auth', method:'POST', ep:'/api/auth/forgot-password', desc:'Password reset', auth:'No'},
    {m:'Auth', method:'POST', ep:'/api/user/auth/refresh', desc:'Refresh token', auth:'No'},
    {m:'Dashboard', method:'GET', ep:'/dashboard/overview', desc:'Overview stats', auth:'Yes'},
    {m:'Dashboard', method:'GET', ep:'/dashboard/reports-summary', desc:'Reports summary', auth:'Yes'},
    {m:'Menu Items', method:'GET', ep:'/api/menu/items', desc:'Paginated items', auth:'Yes'},
    {m:'Menu Items', method:'GET', ep:'/api/menu/items/search', desc:'Search items', auth:'Yes'},
    {m:'Menu Items', method:'GET', ep:'/api/menu/items/count', desc:'Item counts', auth:'Yes'},
    {m:'Menu Items', method:'GET', ep:'/api/menu/items/{id}', desc:'Item by ID', auth:'Yes'},
    {m:'Menu Items', method:'POST', ep:'/api/menu/items', desc:'Create item', auth:'Yes'},
    {m:'Menu Items', method:'PUT', ep:'/api/menu/items/{id}', desc:'Update item', auth:'Yes'},
    {m:'Menu Items', method:'PATCH', ep:'/api/menu/items/{id}/status', desc:'Update status', auth:'Yes'},
    {m:'Menu Items', method:'DELETE', ep:'/api/menu/items/{id}', desc:'Delete item', auth:'Yes'},
    {m:'Categories', method:'GET', ep:'/api/categories', desc:'Paginated categories', auth:'Yes'},
    {m:'Categories', method:'POST', ep:'/api/categories', desc:'Create category', auth:'Yes'},
    {m:'Categories', method:'PUT', ep:'/api/categories/{id}', desc:'Update category', auth:'Yes'},
    {m:'Categories', method:'DELETE', ep:'/api/categories/{id}', desc:'Delete category', auth:'Yes'},
    {m:'Categories', method:'GET', ep:'/api/categories/{id}/items', desc:'Items by category', auth:'Yes'},
    {m:'Categories', method:'GET', ep:'/api/categories/{id}/items/search', desc:'Search in category', auth:'Yes'},
    {m:'Orders', method:'GET', ep:'/api/orders', desc:'List orders', auth:'Yes'},
    {m:'Orders', method:'POST', ep:'/api/orders/{id}/accept', desc:'Accept order', auth:'Yes'},
    {m:'Orders', method:'POST', ep:'/api/orders/{id}/reject', desc:'Reject order', auth:'Yes'},
    {m:'Orders', method:'POST', ep:'/api/orders/{id}/preparation-time', desc:'Set prep time', auth:'Yes'},
    {m:'Orders', method:'POST', ep:'/api/orders/{id}/ready', desc:'Mark ready', auth:'Yes'},
    {m:'Orders', method:'PATCH', ep:'/api/orders/{id}/complete', desc:'Mark complete', auth:'Yes'},
    {m:'Profile', method:'GET', ep:'/api/v1/profile', desc:'Get profile', auth:'Yes'},
    {m:'Profile', method:'PUT', ep:'/api/v1/profile', desc:'Update profile', auth:'Yes'},
    {m:'Settings', method:'PUT', ep:'/api/v1/settings/notifications', desc:'Notification settings', auth:'Yes'},
    {m:'Settings', method:'PUT', ep:'/api/v1/settings/theme', desc:'Theme (dark mode)', auth:'Yes'},
    {m:'Settings', method:'POST', ep:'/api/v1/settings/change-password', desc:'Change password', auth:'Yes'},
    {m:'Statistics', method:'GET', ep:'/api/v1/stats/revenue', desc:'Revenue stats', auth:'Yes'},
    {m:'Statistics', method:'GET', ep:'/api/v1/stats/customers', desc:'Customer stats', auth:'Yes'},
    {m:'Statistics', method:'GET', ep:'/api/v1/stats/peak-hours', desc:'Peak hours', auth:'Yes'},
    {m:'Statistics', method:'GET', ep:'/api/v1/stats/goals', desc:'Daily goals', auth:'Yes'},
    {m:'Statistics', method:'GET', ep:'/api/v1/stats/category-revenue', desc:'Category revenue', auth:'Yes'},
    {m:'Upload', method:'POST', ep:'/api/upload/image', desc:'Upload image', auth:'Yes'},
  ];

  const modules = [...new Set(apis.map(a=>a.m))];
  const moduleCounts = {};
  apis.forEach(a => { moduleCounts[a.m] = (moduleCounts[a.m]||0)+1; });

  let html = '';
  modules.forEach(mod => {
    const filtered = apis.filter(a => a.m === mod);
    html += `<div class="card" style="padding:16px 20px;">
      <h3 style="display:flex;justify-content:space-between;align-items:center;">
        <span>${mod}</span>
        <span class="badge badge-blue">${moduleCounts[mod]} APIs</span>
      </h3>
      <div class="table-wrap">
        <table>
          <tr><th>Method</th><th>Endpoint</th><th>Description</th><th>Auth</th></tr>
          ${filtered.map(a => `<tr><td><span class="badge ${a.method==='GET'?'badge-green':a.method==='POST'?'badge-yellow':a.method==='PUT'?'badge-blue':a.method==='PATCH'?'badge-purple':'badge-red'}">${a.method}</span></td><td><code style="font-size:12px;">${a.ep}</code></td><td>${a.desc}</td><td>${a.auth==='Yes'?'🔒':'🔓'}</td></tr>`).join('')}
        </table>
      </div>
    </div>`;
  });
  document.getElementById('api-table-container').innerHTML = html;
}

// ═══════════════════════════════════════════
// PROGRESS BOARD
// ═══════════════════════════════════════════
function renderBoard() {
  const statuses = ['todo', 'in-progress', 'review', 'done'];
  statuses.forEach(s => {
    const tasks = data.tasks.filter(t => t.status === s);
    document.getElementById(`count-${s}`).textContent = tasks.length;
    const list = document.getElementById(`tasks-${s}`);
    list.innerHTML = tasks.map(t => `
      <div class="task" onclick="editTask('${t.id}')" draggable="true" data-id="${t.id}">
        <div class="task-title">${t.title}</div>
        ${t.desc ? `<div class="task-desc">${t.desc}</div>` : ''}
        <div class="task-meta">
          ${(t.tags||[]).map(tag => `<span class="badge ${tag==='backend'?'badge-blue':tag==='mobile'?'badge-purple':tag==='auth'?'badge-yellow':tag==='qa'?'badge-green':tag==='docs'?'badge':'badge'}">${tag}</span>`).join('')}
          <span class="cred-toggle" style="font-size:11px;margin-left:auto;" onclick="event.stopPropagation();deleteTask('${t.id}')">🗑️</span>
        </div>
      </div>
    `).join('');
  });
}

function openAddTask() {
  editingTaskId = null;
  document.getElementById('modal-title').textContent = 'Add Task';
  document.getElementById('task-id').value = '';
  document.getElementById('task-title').value = '';
  document.getElementById('task-desc').value = '';
  document.getElementById('task-status').value = 'todo';
  document.getElementById('task-tags').value = '';
  document.getElementById('taskModal').classList.add('open');
}

function editTask(id) {
  const t = data.tasks.find(t => t.id === id);
  if (!t) return;
  editingTaskId = id;
  document.getElementById('modal-title').textContent = 'Edit Task';
  document.getElementById('task-id').value = id;
  document.getElementById('task-title').value = t.title;
  document.getElementById('task-desc').value = t.desc || '';
  document.getElementById('task-status').value = t.status;
  document.getElementById('task-tags').value = (t.tags||[]).join(', ');
  document.getElementById('taskModal').classList.add('open');
}

function saveTask() {
  const title = document.getElementById('task-title').value.trim();
  const desc = document.getElementById('task-desc').value.trim();
  const status = document.getElementById('task-status').value;
  const tags = document.getElementById('task-tags').value.split(',').map(s => s.trim()).filter(Boolean);
  if (!title) return alert('Title is required');

  const id = document.getElementById('task-id').value;
  if (id) {
    const t = data.tasks.find(t => t.id === id);
    if (t) { t.title = title; t.desc = desc; t.status = status; t.tags = tags; syncTask(t); }
  } else {
    const newTask = { id: Date.now().toString(), title, desc, status, tags };
    data.tasks.push(newTask);
    syncTask(newTask);
  }
  saveLocal();
  renderBoard();
  closeModal();
}

function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  data.tasks = data.tasks.filter(t => t.id !== id);
  deleteTaskFromSB(id);
  saveLocal();
  renderBoard();
}

function closeModal() {
  document.getElementById('taskModal').classList.remove('open');
}

// ─── Drag & Drop ───
document.addEventListener('dragstart', e => {
  if (e.target.classList.contains('task')) {
    e.dataTransfer.setData('text/plain', e.target.dataset.id);
  }
});
document.addEventListener('dragover', e => {
  const col = e.target.closest('.col');
  if (col) { e.preventDefault(); col.style.borderColor = 'var(--primary)'; }
});
document.addEventListener('dragleave', e => {
  const col = e.target.closest('.col');
  if (col) col.style.borderColor = '';
});
document.addEventListener('drop', e => {
  const col = e.target.closest('.col');
  if (!col) return;
  e.preventDefault();
  col.style.borderColor = '';
  const id = e.dataTransfer.getData('text/plain');
  const newStatus = col.dataset.status;
  const t = data.tasks.find(t => t.id === id);
  if (t && t.status !== newStatus) {
    t.status = newStatus;
    saveLocal();
    syncTask(t);
    renderBoard();
  }
});

// ═══════════════════════════════════════════
// EXPORT / IMPORT
// ═══════════════════════════════════════════
function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'system-hub-backup.json';
  a.click();
}

function importData() {
  document.getElementById('importFile').click();
}

function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const imported = JSON.parse(ev.target.result);
      if (imported.tasks) {
        data.tasks = imported.tasks;
        data.customCreds = imported.customCreds || [];
        saveLocal();
        renderBoard();
        renderCustomCreds();
        // Sync all imported data to Supabase
        data.tasks.forEach(t => syncTask(t));
        data.customCreds.forEach(c => syncCred(c));
        alert('Data imported successfully!');
      } else {
        alert('Invalid file format');
      }
    } catch(err) { alert('Error importing file'); }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function resetData() {
  if (!confirm('Reset all data to defaults? This will NOT delete Supabase data.')) return;
  data = JSON.parse(JSON.stringify(defaultData));
  saveLocal();
  renderBoard();
  renderCustomCreds();
}

// ═══════════════════════════════════════════
// AUTH SYSTEM
// ═══════════════════════════════════════════
const ALL_PAGES = ['architecture','design','credentials','access','downloads','frontend','backend','apis','progress','supabase'];

function getUsersFromSB() {
  const config = getSupabaseConfig();
  if (!config) return null;
  return supabaseFetch('users?select=*').then(r => r.json()).catch(() => null);
}

async function ensureSuperAdmin() {
  const config = getSupabaseConfig();
  if (!config) return;
  try {
    const res = await supabaseFetch('users?select=username&role=eq.super-admin');
    const users = await res.json();
    if (!Array.isArray(users) || users.length === 0) {
      await supabaseFetch('users', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({
          username: 'admin', password: 'admin123',
          role: 'super-admin', access: JSON.stringify(ALL_PAGES)
        })
      });
      console.log('✅ Super admin created: admin / admin123');
    }
  } catch(e) { console.warn('Auth init:', e); }
}

async function handleLogin() {
  const user = document.getElementById('login-user').value.trim();
  const pass = document.getElementById('login-pass').value.trim();
  const msg = document.getElementById('loginMsg');
  if (!user || !pass) { msg.textContent = 'Enter username and password'; msg.className = 'login-msg error'; return; }
  msg.textContent = 'Logging in...'; msg.className = 'login-msg';

  try {
    const config = getSupabaseConfig();
    if (!config) { msg.textContent = '❌ Supabase not connected. Connect first.'; msg.className = 'login-msg error'; return; }
    const res = await supabaseFetch(`users?username=eq.${encodeURIComponent(user)}&select=*`);
    const users = await res.json();
    if (!Array.isArray(users) || users.length === 0) {
      msg.textContent = '❌ User not found'; msg.className = 'login-msg error'; return;
    }
    const u = users[0];
    if (u.password !== pass) {
      msg.textContent = '❌ Wrong password'; msg.className = 'login-msg error'; return;
    }
    const session = { username: u.username, role: u.role, access: typeof u.access === 'string' ? JSON.parse(u.access) : (u.access || []) };
    localStorage.setItem('session', JSON.stringify(session));
    applySession(session);
    msg.textContent = '✅ Logged in!'; msg.className = 'login-msg success';
    setTimeout(() => document.getElementById('loginOverlay').classList.add('hidden'), 300);
  } catch(e) {
    msg.textContent = '❌ Error: ' + e.message; msg.className = 'login-msg error';
  }
}

function handleLogout() {
  localStorage.removeItem('session');
  document.getElementById('loginOverlay').classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(n => n.style.display = '');
  document.getElementById('nav-admin').style.display = 'none';
  document.getElementById('sidebarUser').textContent = '';
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
  document.getElementById('loginMsg').textContent = '';
}

function applySession(session) {
  document.getElementById('sidebarUser').textContent = session.username + (session.role === 'super-admin' ? ' 👑' : '');
  if (session.role === 'super-admin') {
    document.querySelectorAll('.nav-item').forEach(n => n.style.display = '');
    document.getElementById('nav-admin').style.display = '';
  } else {
    document.querySelectorAll('.nav-item').forEach(n => {
      const page = n.dataset.page;
      if (!page || page === 'admin') { n.style.display = 'none'; return; }
      n.style.display = session.access.includes(page) ? '' : 'none';
    });
    // Switch to first allowed page if current is restricted
    const active = document.querySelector('.nav-item.active');
    if (active && active.dataset.page && !session.access.includes(active.dataset.page)) {
      const firstAllowed = document.querySelector('.nav-item[style*="display:"]');
      if (firstAllowed) firstAllowed.click();
    }
  }
}

(async function initAuth() {
  await ensureSuperAdmin();
  renderAccessCheckboxes();
  const raw = localStorage.getItem('session');
  if (raw) {
    try {
      const session = JSON.parse(raw);
      const config = getSupabaseConfig();
      if (config) {
        const res = await supabaseFetch(`users?username=eq.${encodeURIComponent(session.username)}&select=*`);
        const users = await res.json();
        if (Array.isArray(users) && users.length > 0) {
          const u = users[0];
          session.access = typeof u.access === 'string' ? JSON.parse(u.access) : (u.access || []);
          session.role = u.role;
          localStorage.setItem('session', JSON.stringify(session));
          applySession(session);
          document.getElementById('loginOverlay').classList.add('hidden');
          return;
        }
      }
    } catch(e) { localStorage.removeItem('session'); }
  }
  // Show login
  if (getSupabaseConfig()) {
    document.getElementById('loginMsg').textContent = 'Enter credentials to login';
  } else {
    document.getElementById('loginMsg').textContent = '⚠️ Connect Supabase first (⚡tab)';
    document.getElementById('loginMsg').className = 'login-msg error';
  }
})();

function renderAccessCheckboxes() {
  const container = document.getElementById('access-checkboxes');
  if (!container) return;
  container.innerHTML = ALL_PAGES.map(p =>
    `<label style="font-size:13px;display:flex;align-items:center;gap:4px;cursor:pointer;">
      <input type="checkbox" value="${p}" checked> ${p.charAt(0).toUpperCase() + p.slice(1)}
    </label>`
  ).join('');
}

async function createUser() {
  const username = document.getElementById('new-user-name').value.trim();
  const password = document.getElementById('new-user-pass').value.trim();
  const msg = document.getElementById('admin-msg');
  if (!username || !password) { msg.textContent = '❌ Username and password required'; return; }
  const checked = document.querySelectorAll('#access-checkboxes input:checked');
  const access = Array.from(checked).map(c => c.value);
  if (!access.length) { msg.textContent = '❌ Select at least one access'; return; }

  try {
    await supabaseFetch('users', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ username, password, role: 'user', access: JSON.stringify(access) })
    });
    msg.textContent = `✅ User "${username}" created!`;
    document.getElementById('new-user-name').value = '';
    document.getElementById('new-user-pass').value = '';
    renderUserList();
  } catch(e) { msg.textContent = '❌ Error: ' + e.message; }
}

async function renderUserList() {
  const container = document.getElementById('user-list');
  if (!container) return;
  try {
    const res = await supabaseFetch('users?select=*&order=created_at.asc');
    const users = await res.json();
    if (!Array.isArray(users)) { container.innerHTML = '<p style="color:var(--text2);">No users found.</p>'; return; }
    container.innerHTML = users.map(u => {
      const access = typeof u.access === 'string' ? JSON.parse(u.access) : (u.access || []);
      const isSuper = u.role === 'super-admin';
      return `<div class="user-row">
        <div class="user-info">
          <div class="user-name">${u.username} <span class="${isSuper ? 'badge-admin' : 'badge-user'}">${isSuper ? 'Super Admin' : 'User'}</span></div>
          <div class="access-chips">${access.map(a => `<span>${a}</span>`).join('')}</div>
          <div class="user-meta">Created: ${new Date(u.created_at).toLocaleDateString()}</div>
        </div>
        ${isSuper ? '' : `<button class="btn btn-outline" style="padding:6px 14px;font-size:12px;border-color:var(--danger);color:var(--danger);" onclick="deleteUser('${u.username}')">🗑️</button>`}
      </div>`;
    }).join('');
  } catch(e) { container.innerHTML = '<p style="color:var(--danger);">Error loading users.</p>'; }
}

async function deleteUser(username) {
  if (!confirm(`Delete user "${username}"?`)) return;
  try {
    await supabaseFetch(`users?username=eq.${encodeURIComponent(username)}`, { method: 'DELETE' });
    renderUserList();
    document.getElementById('admin-msg').textContent = `🗑️ User "${username}" deleted`;
  } catch(e) { alert('Error: ' + e.message); }
}

// ═══════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════
function copyText(text) {
  navigator.clipboard.writeText(text).then(() => alert('Copied!'));
}

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
// Auto-connect if fields are pre-filled
(function autoConnect() {
  const url = document.getElementById('supabase-url');
  const key = document.getElementById('supabase-key');
  const config = getSupabaseConfig();
  if (config) {
    updateDbStatus(true);
  } else if (url && key && url.value && key.value) {
    connectSupabase();
  } else {
    updateDbStatus(false);
  }
})();

renderAPIs();
