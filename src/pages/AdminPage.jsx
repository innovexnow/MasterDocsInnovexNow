import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styles from '../legacy/home.css?raw';
import { supabase } from '../lib/supabase.js';
import { adminList, deleteRecord, saveRecord, signIn, uploadFile } from '../services/cms.js';
import { getFieldOptions, relationFields } from '../utils/adminFields.js';
import AuthLoadingScreen from '../components/AuthLoadingScreen.jsx';

const managers = {
  menus: ['title', 'slug', 'route', 'icon', 'parent_id', 'page_id', 'audience', 'sort_order', 'status', 'visibility'],
  pages: ['title', 'slug', 'subtitle', 'description', 'icon', 'layout_type', 'seo_title', 'seo_description', 'sort_order', 'status', 'visibility'],
  sections: ['page_id', 'section_type', 'title', 'subtitle', 'description', 'icon', 'layout_type', 'content_json', 'sort_order', 'visibility'],
  content_cards: ['section_id', 'title', 'icon', 'description', 'column_size', 'sort_order', 'visibility'],
  content_card_items: ['card_id', 'text', 'icon', 'link', 'sort_order', 'visibility'],
  architecture_diagrams: ['section_id', 'title', 'description', 'layout_type'],
  architecture_nodes: ['diagram_id', 'title', 'subtitle', 'description', 'icon', 'node_type', 'position_x', 'position_y', 'sort_order', 'visibility'],
  architecture_connections: ['diagram_id', 'source_node_id', 'target_node_id', 'label', 'connection_type', 'direction', 'visibility'],
  api_applications: ['name', 'slug', 'description', 'icon', 'sort_order', 'visibility'],
  api_modules: ['application_id', 'title', 'slug', 'description', 'version', 'base_url', 'sort_order', 'visibility'],
  api_endpoints: ['module_id', 'title', 'method', 'endpoint', 'description', 'auth_requirement', 'notes', 'version', 'sort_order', 'visibility', 'deprecated'],
  downloads: ['title', 'description', 'file_url', 'file_name', 'file_type', 'version', 'category', 'platform', 'release_date', 'sort_order', 'visibility'],
  environments: ['name', 'type', 'backend_url', 'frontend_url', 'ssh_host', 'rds_host', 's3_bucket', 'supabase_url', 'sort_order', 'visibility'],
  credentials: ['label', 'value'],
  files: ['name', 'original_name', 'path', 'category', 'mime_type', 'alt_text', 'caption'],
  milestones: ['title', 'description', 'status', 'start_date', 'due_date', 'sort_order'],
  tasks: ['milestone_id', 'title', 'module', 'description', 'assignee', 'status', 'priority', 'start_date', 'due_date', 'progress_percent', 'version', 'sort_order'],
  media: ['title', 'description', 'alt_text', 'caption', 'category', 'visibility'],
  tags: ['name', 'slug', 'color', 'description'],
  entity_tags: ['entity_type', 'entity_id', 'tag_id'],
  revisions: ['resource_type', 'resource_id', 'version', 'change_type'],
  activity_logs: ['user_id', 'action', 'resource_type', 'resource_id'],
  cms_roles: ['name', 'description', 'permissions'],
  cms_permissions: ['code', 'description'],
  settings: ['key', 'value', 'description', 'category'],
  audit_logs: [],
};

const names = {
  menus: 'Menu Manager', pages: 'Page Manager', sections: 'Page Builder', content_cards: 'Cards', content_card_items: 'Card Items',
  architecture_diagrams: 'Architecture Manager', architecture_nodes: 'Architecture Nodes', architecture_connections: 'Connections',
  api_applications: 'API Applications', api_modules: 'API Modules', api_endpoints: 'API Endpoints', downloads: 'Downloads',
  environments: 'Access & Environments', credentials: 'Credentials', files: 'Media Library', milestones: 'Milestones', tasks: 'Progress',
  media: 'Media Library', tags: 'Tags', entity_tags: 'Entity Tags', revisions: 'Revision History', activity_logs: 'Activity Logs',
  cms_roles: 'Roles', cms_permissions: 'Permissions', settings: 'Global Settings', audit_logs: 'Audit Logs',
};

const numeric = new Set(['sort_order', 'column_size', 'position_x', 'position_y', 'progress_percent']);
const boolean = new Set(['visibility', 'deprecated']);
const textareas = new Set(['description', 'content_json', 'notes', 'value']);
const publicPageTitles = { design: 'System Design', frontend: 'Frontend Apps', backend: 'Backend Services', supabase: 'Supabase' };

function newRecord(resource, count) {
  const record = { sort_order: count, visibility: true };
  if (resource === 'menus' || resource === 'pages') record.status = 'draft';
  if (resource === 'tasks') Object.assign(record, { status: 'todo', priority: 'medium', progress_percent: 0 });
  if (resource === 'milestones') record.status = 'not_started';
  if (resource === 'api_endpoints') Object.assign(record, { method: 'GET', auth_requirement: 'none' });
  if (resource === 'environments') record.type = 'development';
  return record;
}

function Login({ onSuccess }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  return <div className="login-overlay"><form className="login-box" onSubmit={async (event) => { event.preventDefault(); try { await signIn(form.email, form.password); onSuccess(); } catch (caught) { setError(caught.message); } }}><h2>⬡ RestroDocs</h2><p>Admin Dashboard</p><label>Email</label><input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /><label>Password</label><input type="password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><button className="btn btn-primary">🔑 Login</button>{error && <div className="login-msg error">{error}</div>}</form></div>;
}

function Editor({ resource, record, onClose, onSaved }) {
  const [value, setValue] = useState(record);
  const [options, setOptions] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const relationTables = useMemo(() => [...new Set(managers[resource].map((field) => relationFields[field]?.table).filter(Boolean))], [resource]);

  useEffect(() => {
    let active = true;
    Promise.all(relationTables.map(async (table) => [table, await adminList(table)]))
      .then((entries) => { if (active) setOptions(Object.fromEntries(entries)); })
      .catch((caught) => { if (active) setError(`Could not load relationship choices: ${caught.message}`); });
    return () => { active = false; };
  }, [relationTables]);

  const update = (field, fieldValue) => {
    setError('');
    setValue((current) => ({ ...current, [field]: fieldValue }));
  };

  const renderField = (field) => {
    const relation = relationFields[field];
    if (relation) {
      let rows = options[relation.table] || [];
      if (field === 'parent_id') rows = rows.filter((row) => row.id !== record.id);
      if ((field === 'source_node_id' || field === 'target_node_id') && value.diagram_id) rows = rows.filter((row) => row.diagram_id === value.diagram_id);
      if (field === 'target_node_id' && value.source_node_id) rows = rows.filter((row) => row.id !== value.source_node_id);
      if (field === 'source_node_id' && value.target_node_id) rows = rows.filter((row) => row.id !== value.target_node_id);
      return <select value={value[field] ?? ''} onChange={(event) => update(field, event.target.value || null)}><option value="">— None —</option>{rows.map((row) => <option key={row.id} value={row.id}>{row[relation.label] || row.slug || row.id}</option>)}</select>;
    }
    if (boolean.has(field)) return <select value={String(value[field] ?? true)} onChange={(event) => update(field, event.target.value === 'true')}><option value="true">Enabled</option><option value="false">Disabled</option></select>;
    if (resource === 'credentials' && field === 'label') return <input required value={value[field] ?? ''} onChange={(event) => update(field, event.target.value)} />;
    if (resource === 'credentials' && field === 'value') return <input required type="password" autoComplete="new-password" value={value[field] ?? ''} onChange={(event) => update(field, event.target.value)} />;
    const choices = getFieldOptions(resource, field);
    if (choices) return <select value={value[field] ?? ''} onChange={(event) => update(field, event.target.value)}><option value="">— Select —</option>{choices.map((choice) => <option key={choice} value={choice}>{choice.replaceAll('_', ' ')}</option>)}</select>;
    if (textareas.has(field)) return <textarea value={typeof value[field] === 'object' ? JSON.stringify(value[field], null, 2) : value[field] ?? ''} onChange={(event) => update(field, event.target.value)} />;
    return <input type={numeric.has(field) ? 'number' : field.includes('date') ? 'date' : 'text'} value={value[field] ?? ''} onChange={(event) => update(field, numeric.has(field) ? Number(event.target.value) : event.target.value)} />;
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...value };
      for (const key of ['content_json', 'value']) {
        if (typeof payload[key] === 'string' && payload[key].trim()) {
          try { payload[key] = JSON.parse(payload[key]); } catch { /* Supabase accepts a plain string as JSONB. */ }
        }
      }
      for (const field of Object.keys(relationFields)) if (field in payload && !payload[field]) payload[field] = null;
      await saveRecord(resource, payload);
      onSaved();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setSaving(false);
    }
  };

  return <div className="modal-overlay open" onMouseDown={onClose}><form className="modal admin-editor-modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={submit}><div className="modal-header"><div><h3>{record.id ? 'Edit' : 'Add'} {names[resource]}</h3><p>Relationship fields use database records—choose a label instead of typing an ID.</p></div><button type="button" className="modal-close" aria-label="Close" onClick={onClose}>×</button></div><div className="admin-editor-grid">{managers[resource].map((field) => <label key={field}>{field.replaceAll('_', ' ')}{renderField(field)}</label>)}</div>{error && <div className="notice notice-error">{error}</div>}<div className="btn-row admin-editor-actions"><button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button><button disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Save'}</button></div></form></div>;
}

export default function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedResource = searchParams.get('resource');
  const openNew = searchParams.get('new') === '1';
  const targetPage = searchParams.get('page');
  const autoOpenRef = useRef('');
  const [session, setSession] = useState(undefined);
  const [resource, setResource] = useState(requestedResource && managers[requestedResource] ? requestedResource : 'menus');
  const [rows, setRows] = useState([]);
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const load = useCallback(async () => { try { setRows(await adminList(resource)); setError(''); } catch (caught) { setError(caught.message); } }, [resource]);

  useEffect(() => { supabase?.auth.getSession().then(({ data }) => setSession(data.session)); const listener = supabase?.auth.onAuthStateChange((_event, next) => setSession(next)); return () => listener?.data.subscription.unsubscribe(); }, []);
  useEffect(() => {
    if (!session) return undefined;
    let active = true;
    adminList(resource)
      .then(async (records) => {
        if (!active) return;
        setRows(records);
        setError('');
        const requestKey = `${resource}:${targetPage || ''}:${openNew}`;
        if (openNew && autoOpenRef.current !== requestKey) {
          autoOpenRef.current = requestKey;
          const draft = newRecord(resource, records.length);
          if (resource === 'sections' && targetPage) {
            const pages = await adminList('pages');
            let page = pages.find((item) => item.slug === targetPage);
            if (!page) page = await saveRecord('pages', { title: publicPageTitles[targetPage] || targetPage, slug: targetPage, status: 'active', visibility: true, sort_order: pages.length, layout_type: 'full_width' });
            Object.assign(draft, { page_id: page.id, title: `${publicPageTitles[targetPage] || targetPage} Section`, section_type: 'rich_text', layout_type: 'full_width' });
          }
          if (active) {
            setEdit(draft);
            setSearchParams({ resource }, { replace: true });
          }
        }
      })
      .catch((caught) => { if (active) setError(caught.message); });
    return () => { active = false; };
  }, [openNew, resource, session, setSearchParams, targetPage]);
  if (session === undefined) return <AuthLoadingScreen />;
  if (!session) return <><style>{styles}</style><Login onSuccess={() => supabase.auth.getSession().then(({ data }) => setSession(data.session))} /></>;

  const filtered = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase()));
  const reorder = async (row, direction) => { const index = rows.findIndex((item) => item.id === row.id); const other = rows[index + direction]; if (!other) return; await Promise.all([saveRecord(resource, { ...row, sort_order: other.sort_order }), saveRecord(resource, { ...other, sort_order: row.sort_order })]); load(); };

  return <div className="app"><style>{styles}</style><nav className="sidebar admin-sidebar"><h1>⬡ RestroDocs <span>CMS</span></h1><Link className="nav-item admin-architecture-link" to="/admin/architecture">📐 Architecture Builder</Link>{Object.keys(managers).map((key) => <button key={key} className={`nav-item admin-nav-button ${resource === key ? 'active' : ''}`} onClick={() => { setResource(key); setSearchParams({ resource: key }); setError(''); setQuery(''); }}><span className="nav-text">{names[key]}</span></button>)}</nav><main className="main"><div className="admin-title-row"><div><h1 className="page-title">{names[resource]}</h1><p className="page-sub">Manage database content without changing source code.</p></div>{resource !== 'audit_logs' && resource !== 'files' && <button className="btn btn-primary" onClick={() => setEdit(newRecord(resource, rows.length))}>＋ Add</button>}</div><div className="card"><div className="admin-filters"><input placeholder={`Search ${names[resource].toLowerCase()}`} value={query} onChange={(event) => setQuery(event.target.value)} />{resource === 'files' && <label className="btn btn-outline">Upload file<input hidden type="file" onChange={async (event) => { try { if (event.target.files[0]) { await uploadFile(event.target.files[0]); load(); } } catch (caught) { setError(caught.message); } }} /></label>}</div>{error && <div className="notice notice-error">{error}</div>}<div className="table-wrap"><table><thead><tr><th>Record</th><th>Status</th><th>Order</th><th>Actions</th></tr></thead><tbody>{filtered.map((row) => { const status = row.status || (row.visibility === false ? 'disabled' : 'active'); return <tr key={row.id}><td><b>{row.title || row.name || row.label || row.key || row.action}</b><div className="admin-row-sub">{row.slug || row.endpoint || row.description || row.resource_type}</div></td><td><span className={`badge ${status === 'active' || status === 'done' || status === 'completed' ? 'badge-green' : 'badge-yellow'}`}>{status}</span></td><td>{'sort_order' in row && <><button aria-label="Move up" className="btn btn-outline btn-sm" onClick={() => reorder(row, -1)}>↑</button> <button aria-label="Move down" className="btn btn-outline btn-sm" onClick={() => reorder(row, 1)}>↓</button></>}</td><td>{resource !== 'audit_logs' && <><button className="btn btn-outline btn-sm" onClick={() => setEdit(row)}>Edit</button> <button className="btn btn-danger btn-sm" onClick={async () => { if (confirm('Delete this record?')) { await deleteRecord(resource, row.id); load(); } }}>Delete</button></>}</td></tr>; })}</tbody></table></div>{filtered.length === 0 && <div className="admin-empty-state"><span>＋</span><h3>No records found</h3><p>Use the Add button to create the first record in this section.</p></div>}</div>{edit && <Editor resource={resource} record={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}</main></div>;
}
