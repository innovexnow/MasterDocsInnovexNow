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
  const sql = `-- RestroMind System Hub — Tables + Secure Login RPC
-- ⚠️ Passwords are stored as SHA-256 hashes. Never stored as plaintext.

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

-- Row Level Security (allow anon access)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon all" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all" ON public.credentials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- Secure login RPC: password NEVER returned in any response
-- Client sends SHA-256 hash; RPC compares with stored hash or migrates plaintext
-- Also handles migration: if stored password is plaintext, auto-upgrades to hash
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE OR REPLACE FUNCTION public.verify_login(p_username TEXT, p_password TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record public.users%ROWTYPE;
BEGIN
  -- Try matching with hashed password first (new system)
  SELECT * INTO user_record
  FROM public.users
  WHERE username = p_username AND password = p_password;

  -- If not found, try migration: stored password might be plaintext
  IF user_record.id IS NULL THEN
    SELECT * INTO user_record
    FROM public.users
    WHERE username = p_username
      AND encode(sha256(password::bytea), 'hex') = p_password;

    -- Migrate plaintext password to hash
    IF user_record.id IS NOT NULL THEN
      UPDATE public.users
      SET password = p_password
      WHERE id = user_record.id;
    END IF;
  END IF;

  IF user_record.id IS NOT NULL THEN
    RETURN json_build_object(
      'username', user_record.username,
      'role', user_record.role,
      'access', user_record.access
    );
  ELSE
    RETURN NULL;
  END IF;
END;
$$;

-- Allow anonymous users to call the login RPC
GRANT EXECUTE ON FUNCTION public.verify_login TO anon;`;
  
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
      <div><div class="cred-label">${escapeHtml(c.label)}</div><div class="cred-value hidden-text">${escapeHtml(c.value)}</div></div>
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
        <div class="task-title">${escapeHtml(t.title)}</div>
        ${t.desc ? `<div class="task-desc">${escapeHtml(t.desc)}</div>` : ''}
        <div class="task-meta">
          ${(t.tags||[]).map(tag => `<span class="badge ${tag==='backend'?'badge-blue':tag==='mobile'?'badge-purple':tag==='auth'?'badge-yellow':tag==='qa'?'badge-green':tag==='docs'?'badge':'badge'}">${escapeHtml(tag)}</span>`).join('')}
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
  return supabaseFetch('users?select=username,role,access,created_at').then(r => r.json()).catch(() => null);
}

async function ensureSuperAdmin() {
  const config = getSupabaseConfig();
  if (!config) return;
  try {
    const res = await supabaseFetch('users?select=username&role=eq.super-admin');
    const users = await res.json();
    if (!Array.isArray(users) || users.length === 0) {
      const hashedPassword = await hashPassword('admin123');
      await supabaseFetch('users', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({
          username: 'admin', password: hashedPassword,
          role: 'super-admin', access: JSON.stringify(ALL_PAGES)
        })
      });
      console.log('✅ Super admin created: admin / admin123 (password hashed)');
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
    const hashedPassword = await hashPassword(pass);
    const res = await supabaseFetch('rpc/verify_login', {
      method: 'POST',
      body: JSON.stringify({ p_username: user, p_password: hashedPassword })
    });
    const result = await res.json();
    if (!result || !result.username) {
      msg.textContent = '❌ Invalid username or password'; msg.className = 'login-msg error'; return;
    }
    const session = { username: result.username, role: result.role, access: typeof result.access === 'string' ? JSON.parse(result.access) : (result.access || []) };
    localStorage.setItem('session', JSON.stringify(session));
    applySession(session);
    renderUserList();
    msg.textContent = '✅ Logged in!'; msg.className = 'login-msg success';
    setTimeout(() => document.getElementById('loginOverlay').classList.add('hidden'), 200);
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

let _authCheckDone = false;

(function initAuth() {
  renderAccessCheckboxes();
  const raw = localStorage.getItem('session');
  const overlay = document.getElementById('loginOverlay');
  const msg = document.getElementById('loginMsg');

  if (raw) {
    try {
      const session = JSON.parse(raw);
      applySession(session);
      overlay.classList.add('hidden');
      // Validate session in background + load users
      (async () => {
        await ensureSuperAdmin();
        const config = getSupabaseConfig();
        if (config) {
          try {
            const res = await supabaseFetch(`users?username=eq.${encodeURIComponent(session.username)}&select=username,role,access`);
            const users = await res.json();
            if (Array.isArray(users) && users.length > 0) {
              const u = users[0];
              session.access = typeof u.access === 'string' ? JSON.parse(u.access) : (u.access || []);
              session.role = u.role;
              localStorage.setItem('session', JSON.stringify(session));
              applySession(session);
            }
          } catch(e) { /* ignore */ }
        }
        renderUserList();
      })();
      return;
    } catch(e) { localStorage.removeItem('session'); }
  }

  // No valid session — show login
  (async () => {
    await ensureSuperAdmin();
    if (getSupabaseConfig()) {
      msg.textContent = 'Enter credentials to login';
    } else {
      msg.textContent = '⚠️ Connect Supabase first (⚡tab)';
      msg.className = 'login-msg error';
    }
  })();
})();

function renderAccessCheckboxes() {
  const container = document.getElementById('access-checkboxes');
  if (!container) return;
  container.innerHTML = ALL_PAGES.map(p =>
    `<label style="font-size:13px;display:flex;align-items:center;gap:4px;cursor:pointer;">
      <input type="checkbox" value="${escapeHtml(p)}" checked> ${escapeHtml(p.charAt(0).toUpperCase() + p.slice(1))}
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
    const hashedPassword = await hashPassword(password);
    await supabaseFetch('users', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ username, password: hashedPassword, role: 'user', access: JSON.stringify(access) })
    });
    msg.textContent = `✅ User "${escapeHtml(username)}" created!`;
    document.getElementById('new-user-name').value = '';
    document.getElementById('new-user-pass').value = '';
    renderUserList();
  } catch(e) { msg.textContent = '❌ Error: ' + e.message; }
}

async function renderUserList() {
  const container = document.getElementById('user-list');
  if (!container) return;
  try {
    const res = await supabaseFetch('users?select=username,role,access,created_at&order=created_at.asc');
    const users = await res.json();
    if (!Array.isArray(users)) { container.innerHTML = '<p style="color:var(--text2);">No users found.</p>'; return; }
    container.innerHTML = users.map(u => {
      const access = typeof u.access === 'string' ? JSON.parse(u.access) : (u.access || []);
      const isSuper = u.role === 'super-admin';
      return `<div class="user-row" style="cursor:pointer;" onclick="openEditUser('${escapeHtml(u.username)}')">
        <div class="user-info">
          <div class="user-name">${escapeHtml(u.username)} <span class="${isSuper ? 'badge-admin' : 'badge-user'}">${isSuper ? 'Super Admin' : 'User'}</span></div>
          <div class="access-chips">${access.map(a => `<span>${escapeHtml(a)}</span>`).join('')}</div>
          <div class="user-meta">Created: ${new Date(u.created_at).toLocaleDateString()}</div>
        </div>
        ${isSuper ? '' : `<button class="btn btn-outline" style="padding:6px 14px;font-size:12px;border-color:var(--danger);color:var(--danger);" onclick="event.stopPropagation();deleteUser('${escapeHtml(u.username)}')">🗑️</button>`}
      </div>`;
    }).join('');
  } catch(e) { container.innerHTML = '<p style="color:var(--danger);">Error loading users.</p>'; }
}

async function openEditUser(username) {
  try {
    const res = await supabaseFetch(`users?username=eq.${encodeURIComponent(username)}&select=username,role,access,created_at`);
    const users = await res.json();
    if (!Array.isArray(users) || !users.length) return alert('User not found');
    const u = users[0];
    const access = typeof u.access === 'string' ? JSON.parse(u.access) : (u.access || []);
    document.getElementById('edit-user-name').value = u.username;
    document.getElementById('edit-user-pass').value = '';
    document.getElementById('edit-user-pass').placeholder = 'Leave empty to keep current';
    document.getElementById('edit-user-original').value = u.username;
    const container = document.getElementById('edit-access-checkboxes');
    container.innerHTML = ALL_PAGES.map(p =>
      `<label style="font-size:13px;display:flex;align-items:center;gap:4px;cursor:pointer;">
        <input type="checkbox" value="${escapeHtml(p)}" ${access.includes(p) ? 'checked' : ''}> ${escapeHtml(p.charAt(0).toUpperCase() + p.slice(1))}
      </label>`
    ).join('');
    document.getElementById('userModal').classList.add('open');
  } catch(e) { alert('Error: ' + e.message); }
}

async function updateUser() {
  const original = document.getElementById('edit-user-original').value;
  const username = document.getElementById('edit-user-name').value.trim();
  const password = document.getElementById('edit-user-pass').value.trim();
  const checked = document.querySelectorAll('#edit-access-checkboxes input:checked');
  const access = Array.from(checked).map(c => c.value);
  if (!access.length) return alert('Select at least one access');

  const body = { access: JSON.stringify(access) };
  if (password) body.password = await hashPassword(password);

  try {
    await supabaseFetch(`users?username=eq.${encodeURIComponent(original)}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify(body)
    });
    document.getElementById('admin-msg').textContent = `✅ "${escapeHtml(username)}" updated!`;
    closeUserModal();
    renderUserList();
  } catch(e) { alert('Error: ' + e.message); }
}

function closeUserModal() {
  document.getElementById('userModal').classList.remove('open');
}

async function deleteUser(username) {
  if (!confirm(`Delete user "${username}"?`)) return;
  try {
    await supabaseFetch(`users?username=eq.${encodeURIComponent(username)}`, { method: 'DELETE' });
    renderUserList();
    document.getElementById('admin-msg').textContent = `🗑️ User "${escapeHtml(username)}" deleted`;
  } catch(e) { alert('Error: ' + e.message); }
}

// ═══════════════════════════════════════════
// AWS CLOUD
// ═══════════════════════════════════════════
const AWS_SERVICES = [
  { id: 's3', name: 'Amazon S3', icon: '🗄️', desc: 'Object storage for images, assets, and backups. Stores restaurant logos, dish images, and app static assets.', link: 'https://ap-south-1.console.aws.amazon.com/s3/home?region=ap-south-1', tags: ['Storage', 'Assets', 'Backups'] },
  { id: 'ec2-1', name: 'Amazon EC2 (App Server)', icon: '🖥️', desc: 'Virtual server hosting the RestroMind backend APIs and admin dashboard.', link: 'https://ap-south-1.console.aws.amazon.com/ec2/home?region=ap-south-1', tags: ['Compute', 'Backend', 'API'] },
  { id: 'ec2-2', name: 'Amazon EC2 (Database Server)', icon: '🖥️', desc: 'EC2 instance hosting the RDS proxy and migration services for database management.', link: 'https://ap-south-1.console.aws.amazon.com/ec2/home?region=ap-south-1', tags: ['Compute', 'Database', 'Migration'] },
  { id: 'iam-1', name: 'AWS IAM (Users & Roles)', icon: '🔑', desc: 'Identity and access management — controls who can access AWS resources with specific permissions.', link: 'https://ap-south-1.console.aws.amazon.com/iam/home?region=ap-south-1', tags: ['Security', 'Access Control', 'Auth'] },
  { id: 'iam-2', name: 'AWS IAM (Service Roles)', icon: '🔐', desc: 'Service roles for EC2, Lambda, and S3 to securely communicate with each other.', link: 'https://ap-south-1.console.aws.amazon.com/iam/home?region=ap-south-1', tags: ['Security', 'Service Roles', 'Permissions'] },
  { id: 'aurora', name: 'Amazon Aurora (MySQL)', icon: '🗃️', desc: 'High-performance relational database for core RestroMind data — restaurants, menus, orders, customers.', link: 'https://ap-south-1.console.aws.amazon.com/rds/home?region=ap-south-1', tags: ['Database', 'MySQL', 'Production'] },
  { id: 'rds', name: 'Amazon RDS (Read Replica)', icon: '📦', desc: 'RDS read replica for analytics queries, reporting, and reducing load on primary Aurora DB.', link: 'https://ap-south-1.console.aws.amazon.com/rds/home?region=ap-south-1', tags: ['Database', 'Replica', 'Analytics'] },
  { id: 'dms-1', name: 'AWS DMS (Migration Task)', icon: '🔄', desc: 'Database Migration Service — migrates on-premise or existing DB to Aurora with minimal downtime.', link: 'https://ap-south-1.console.aws.amazon.com/dms/v2/home?region=ap-south-1', tags: ['Migration', 'Database', 'Tool'] },
  { id: 'dms-2', name: 'AWS DMS (Replication Instance)', icon: '⚡', desc: 'DMS replication instance handling continuous data sync between source and target databases.', link: 'https://ap-south-1.console.aws.amazon.com/dms/v2/home?region=ap-south-1', tags: ['Migration', 'Replication', 'Sync'] },
];

function renderAWS() {
  const container = document.getElementById('aws-container');
  const stats = document.getElementById('aws-stats');
  if (!container) return;
  stats.innerHTML = `
    <div class="rm-stat-card blue"><div class="num">${AWS_SERVICES.length}</div><div class="label">☁️ Total Services</div></div>
    <div class="rm-stat-card green"><div class="num">ap-south-1</div><div class="label">📍 Region (Mumbai)</div></div>
    <div class="rm-stat-card gray"><div class="num">${new Set(AWS_SERVICES.map(s => s.tags[0])).size}</div><div class="label">📂 Categories</div></div>
  `;
  container.innerHTML = AWS_SERVICES.map(s => `
    <div class="aws-svc">
      <div class="aws-icon">${s.icon}</div>
      <div class="aws-body">
        <h4>${s.name}</h4>
        <p>${s.desc}</p>
        <div class="aws-tags">${s.tags.map(t => `<span>${t}</span>`).join('')}</div>
        <a class="aws-link" href="${s.link}" target="_blank">🔗 Open AWS Console →</a>
      </div>
    </div>
  `).join('');
}

renderAWS();

// ═══════════════════════════════════════════
// APP ROADMAP
// ═══════════════════════════════════════════
const ROADMAP_KEY = 'rm-tracker';
const ROADMAP_DATA = [
  {
    name: '🔐 Auth Flow (Pre-login)', icon: '🔐',
    items: [
      { id: 'splash', title: 'Splash Screen — auto-login check, 2-sec splash' },
      { id: 'onboarding', title: 'Onboarding Screen — 3-page intro (manage restaurant, control menu, track prices)' },
      { id: 'signup', title: 'Signup / Login Screen — email + password login, forgot password dialog' },
      { id: 'register', title: 'Register Screen — new restaurant registration (name, owner, email, phone, password, location, logo)' },
    ]
  },
  {
    name: '📱 Dashboard Tab', icon: '📱',
    items: [
      { id: 'dash-header', title: 'Header — user name, profile logo, notifications' },
      { id: 'dash-overview', title: 'Overview section — total dishes, active menu, categories, updates' },
      { id: 'dash-recent', title: 'Recently updated items list' },
      { id: 'dash-fab', title: 'Quick add dish FAB' },
    ]
  },
  {
    name: '🍽️ Menu Tab', icon: '🍽️',
    items: [
      { id: 'menu-mgmt', title: 'Menu management screen' },
      { id: 'menu-categories', title: 'Category filter chips (All, category list)' },
      { id: 'menu-search', title: 'Search bar with debounce' },
      { id: 'menu-pagination', title: 'Paginated menu items list' },
      { id: 'menu-crud', title: 'Add / Edit / Delete menu items' },
      { id: 'menu-nav', title: 'Category items navigation' },
    ]
  },
  {
    name: '📊 Stats Tab', icon: '📊',
    items: [
      { id: 'stats-revenue', title: 'Revenue statistics with date range filter' },
      { id: 'stats-customers', title: 'Customer statistics' },
      { id: 'stats-goals', title: 'Daily goals progress' },
      { id: 'stats-peak', title: 'Peak hours data' },
      { id: 'stats-category', title: 'Category revenue breakdown' },
    ]
  },
  {
    name: '📂 Categories Tab', icon: '📂',
    items: [
      { id: 'cat-list', title: 'Category list with search' },
      { id: 'cat-crud', title: 'Create / Edit / Delete categories' },
      { id: 'cat-icon', title: 'Category icon upload' },
      { id: 'cat-nav', title: 'Navigate to category items' },
    ]
  },
  {
    name: '⚙️ Settings Tab', icon: '⚙️',
    items: [
      { id: 'settings-profile', title: 'User profile (name, email, restaurant name, logo)' },
      { id: 'settings-edit', title: 'Edit profile' },
      { id: 'settings-theme', title: 'Dark mode toggle' },
      { id: 'settings-notifications', title: 'Notification settings' },
      { id: 'settings-logout', title: 'Logout' },
    ]
  },
  {
    name: '📋 Sub-screens', icon: '📋',
    items: [
      { id: 'sub-adddish', title: 'Add Dish Screen — name, category, price, image, dietary, description, discount' },
      { id: 'sub-editdish', title: 'Edit Dish Screen — update existing, same form pre-filled' },
      { id: 'sub-categoryitems', title: 'Category Items Screen — items in category with search & pagination' },
      { id: 'sub-orders', title: 'Orders Screen — list with accept/mark-ready actions' },
      { id: 'sub-revenuebycat', title: 'Revenue By Category Screen — category-wise breakdown' },
      { id: 'sub-resetpass', title: 'Reset Password Dialog — forgot password flow' },
    ]
  },
  {
    name: '🔔 Notifications', icon: '🔔',
    items: [
      { id: 'notif', title: 'Push notifications for Admin App' },
    ]
  },
  {
    name: '🚀 Future Plans', icon: '🚀',
    items: [
      { id: 'future-1', title: 'iOS App Store Release' },
      { id: 'future-2', title: 'Android Play Store Release' },
      { id: 'future-3', title: 'Performance Optimization (API response, caching, lazy loading)' },
      { id: 'future-4', title: 'Offline mode with local DB sync' },
      { id: 'future-5', title: 'Multi-language support' },
      { id: 'future-6', title: 'AI-based dish recommendations' },
    ]
  }
];

function loadRoadmapState() {
  try {
    const raw = localStorage.getItem(ROADMAP_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  // Init with defaults: splash+dash-header+settings-logout done, some in-progress
  const defaults = {};
  ROADMAP_DATA.forEach(m => m.items.forEach(i => { defaults[i.id] = 'pending'; }));
  defaults['splash'] = 'done';
  defaults['signup'] = 'done';
  defaults['register'] = 'done';
  defaults['dash-header'] = 'done';
  defaults['dash-overview'] = 'done';
  defaults['menu-mgmt'] = 'done';
  defaults['menu-crud'] = 'done';
  defaults['menu-pagination'] = 'done';
  defaults['cat-list'] = 'done';
  defaults['cat-crud'] = 'done';
  defaults['cat-nav'] = 'done';
  defaults['settings-profile'] = 'done';
  defaults['settings-edit'] = 'done';
  defaults['settings-theme'] = 'done';
  defaults['settings-notifications'] = 'done';
  defaults['settings-logout'] = 'done';
  defaults['notif'] = 'in-progress';
  defaults['sub-orders'] = 'in-progress';
  defaults['sub-adddish'] = 'in-progress';
  defaults['sub-editdish'] = 'in-progress';
  defaults['sub-categoryitems'] = 'done';
  defaults['sub-revenuebycat'] = 'done';
  defaults['sub-resetpass'] = 'done';
  defaults['dash-recent'] = 'done';
  defaults['dash-fab'] = 'in-progress';
  defaults['menu-search'] = 'done';
  defaults['menu-categories'] = 'done';
  defaults['menu-nav'] = 'done';
  defaults['stats-revenue'] = 'in-progress';
  defaults['stats-customers'] = 'in-progress';
  defaults['stats-goals'] = 'pending';
  defaults['stats-peak'] = 'pending';
  defaults['stats-category'] = 'pending';
  defaults['cat-icon'] = 'pending';
  defaults['onboarding'] = 'done';
  return defaults;
}

let roadmapState = loadRoadmapState();

function saveRoadmapState() {
  localStorage.setItem(ROADMAP_KEY, JSON.stringify(roadmapState));
}

function toggleRoadmapItem(id) {
  const cycle = { 'pending': 'in-progress', 'in-progress': 'done', 'done': 'pending' };
  roadmapState[id] = cycle[roadmapState[id]] || 'pending';
  saveRoadmapState();
  renderRoadmap();
}

function renderRoadmap() {
  const container = document.getElementById('roadmap-container');
  if (!container) return;
  let total = 0, done = 0, inProg = 0;
  ROADMAP_DATA.forEach(m => m.items.forEach(i => {
    total++;
    const s = roadmapState[i.id] || 'pending';
    if (s === 'done') done++;
    else if (s === 'in-progress') inProg++;
  }));
  const pct = total ? Math.round(done / total * 100) : 0;

  // Stats
  document.getElementById('roadmap-stats').innerHTML = `
    <div class="rm-stat-card green"><div class="num">${done}</div><div class="label">✅ Done</div></div>
    <div class="rm-stat-card yellow"><div class="num">${inProg}</div><div class="label">🔧 In Progress</div></div>
    <div class="rm-stat-card gray"><div class="num">${total - done - inProg}</div><div class="label">⏳ Pending</div></div>
    <div class="rm-stat-card blue"><div class="num">${pct}%</div><div class="label">📈 Complete</div></div>
  `;

  // Modules
  container.innerHTML = ROADMAP_DATA.map(mod => {
    const modItems = mod.items.map(i => {
      const s = roadmapState[i.id] || 'pending';
      return `<div class="rm-item" onclick="toggleRoadmapItem('${i.id}')">
        <div class="rm-status ${s}"></div>
        <div class="rm-title ${s === 'done' ? 'done-text' : ''}">${i.title}</div>
        <span class="rm-badge">${s === 'done' ? '✅' : s === 'in-progress' ? '🔧' : '⏳'}</span>
      </div>`;
    }).join('');
    const modDone = mod.items.filter(i => (roadmapState[i.id] || 'pending') === 'done').length;
    const modPct = Math.round(modDone / mod.items.length * 100);
    const barColor = modPct === 100 ? 'var(--success)' : modPct > 50 ? 'var(--warning)' : 'var(--info)';
    return `<div class="card rm-module">
      <h3>${mod.name} <span style="font-size:13px;color:var(--text2);font-weight:400;">${modDone}/${mod.items.length} (${modPct}%)</span></h3>
      <div class="rm-bar"><div class="rm-bar-fill" style="width:${modPct}%;background:${barColor};"></div></div>
      ${modItems}
    </div>`;
  }).join('');
}

renderRoadmap();

// ═══════════════════════════════════════════
// SECURITY UTILITIES
// ═══════════════════════════════════════════
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
