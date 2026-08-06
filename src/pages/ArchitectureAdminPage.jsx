import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import styles from '../legacy/home.css?raw';
import ArchitectureWorkspace from '../components/architecture/ArchitectureWorkspace.jsx';
import { supabase } from '../lib/supabase.js';
import { deleteRecord, getArchitectureAdminCatalog, saveArchitectureEntity } from '../services/cms.js';
import { validateArchitectureConnection } from '../utils/adminFields.js';
import AuthLoadingScreen from '../components/AuthLoadingScreen.jsx';

const emptyDiagram = { title: '', slug: '', architecture_type: 'web', icon: '🌐', description: '', sort_order: 0, visibility: true, layout_type: 'horizontal' };
const emptyNode = { title: '', subtitle: '', icon: '▣', node_type: 'frontend', position_x: 0, position_y: 0, sort_order: 0, visibility: true, metadata: {} };
const emptyConnection = { source_node_id: '', target_node_id: '', label: 'REST', connection_type: 'http', direction: 'forward', visibility: true };

const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function Field({ label, value, onChange, type = 'text', required = false, placeholder = '' }) {
  return (
    <label>
      {label.replaceAll('_', ' ')}
      {type === 'textarea'
        ? <textarea required={required} placeholder={placeholder} value={value || ''} onChange={(event) => onChange(event.target.value)} />
        : <input required={required} placeholder={placeholder} type={type} value={value ?? ''} onChange={(event) => onChange(type === 'number' ? Number(event.target.value) : event.target.value)} />}
    </label>
  );
}

export default function ArchitectureAdminPage() {
  const [session, setSession] = useState(undefined);
  const [catalog, setCatalog] = useState([]);
  const [selected, setSelected] = useState('');
  const [diagram, setDiagram] = useState(emptyDiagram);
  const [node, setNode] = useState(emptyNode);
  const [connection, setConnection] = useState(emptyConnection);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(0);
  const titleRef = useRef(null);

  const load = useCallback(async (preferredId = '') => {
    try {
      const rows = await getArchitectureAdminCatalog();
      setCatalog(rows);
      setSelected((current) => preferredId || (rows.some((item) => item.id === current) ? current : rows[0]?.id || ''));
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  }, []);

  useEffect(() => { supabase?.auth.getSession().then(({ data }) => setSession(data.session)); }, []);
  useEffect(() => { if (session) load(); }, [session, load]);
  useEffect(() => { setNode(emptyNode); setConnection(emptyConnection); }, [selected]);

  if (session === undefined) return <AuthLoadingScreen />;
  if (!session) return <Navigate to="/admin" replace />;

  const active = catalog.find((item) => item.id === selected);
  const nodes = active?.architecture_nodes || [];
  const connections = active?.architecture_connections || [];

  const createArchitecture = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const saved = await saveArchitectureEntity('architecture_diagrams', diagram);
      setDiagram(emptyDiagram);
      setSlugEdited(false);
      await load(saved.id);
      setPreviewVersion((version) => version + 1);
      setMessage({ type: 'success', text: `“${saved.title}” created. Add at least two nodes, then connect them.` });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const saveNode = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await saveArchitectureEntity('architecture_nodes', { ...node, diagram_id: active.id });
      setNode(emptyNode);
      await load(active.id);
      setPreviewVersion((version) => version + 1);
      setMessage({ type: 'success', text: 'Node saved.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const saveConnection = async (event) => {
    event.preventDefault();
    const validation = validateArchitectureConnection(connection, nodes.length);
    if (validation) {
      setMessage({ type: 'error', text: validation });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await saveArchitectureEntity('architecture_connections', { ...connection, diagram_id: active.id });
      setConnection(emptyConnection);
      await load(active.id);
      setPreviewVersion((version) => version + 1);
      setMessage({ type: 'success', text: 'Connection saved.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const startNew = () => {
    setDiagram(emptyDiagram);
    setSlugEdited(false);
    setMessage(null);
    titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    titleRef.current?.focus();
  };

  return (
    <div className="app">
      <style>{styles}</style>
      <aside className="sidebar architecture-admin-nav">
        <h1>⬡ Architecture <span>CMS</span></h1>
        <Link className="nav-item" to="/">← Website</Link>
        <Link className="nav-item" to="/admin/sections">⚙ All managers</Link>
        <button className="nav-item admin-nav-button architecture-new-nav" onClick={startNew}>＋ New architecture</button>
        <div className="architecture-nav-label">Saved architectures</div>
        {catalog.map((item) => (
          <button className={`nav-item admin-nav-button ${item.id === selected ? 'active' : ''}`} onClick={() => setSelected(item.id)} key={item.id}>
            <span className="icon">{item.icon}</span><span className="nav-text">{item.title}</span>
          </button>
        ))}
        {!catalog.length && <p className="architecture-nav-empty">None created yet</p>}
      </aside>

      <main className="main">
        <div className="admin-title-row">
          <div><h1 className="page-title">📐 Architecture Builder</h1><p className="page-sub">Create and switch between separate Web, Android, iOS, Testing, Backend, or custom architectures.</p></div>
          <button className="btn btn-primary" onClick={startNew}>＋ New architecture</button>
        </div>
        {message && <div className={`notice ${message.type === 'success' ? 'notice-success' : 'notice-error'}`}>{message.text}</div>}

        <div className="architecture-admin-grid">
          <form className="card architecture-form-card" onSubmit={createArchitecture}>
            <div className="architecture-card-heading"><div><h3>＋ New architecture</h3><p>Create another independent architecture tab.</p></div><span className="step-num">1</span></div>
            <label>title<input ref={titleRef} required value={diagram.title} onChange={(event) => { const title = event.target.value; setDiagram((current) => ({ ...current, title, slug: slugEdited ? current.slug : slugify(title) })); }} /></label>
            <Field required label="slug" placeholder="example: android-app" value={diagram.slug} onChange={(value) => { setSlugEdited(true); setDiagram({ ...diagram, slug: slugify(value) }); }} />
            <label>Architecture type<select value={diagram.architecture_type} onChange={(event) => setDiagram({ ...diagram, architecture_type: event.target.value })}><option value="web">Web</option><option value="android">Android</option><option value="ios">iOS</option><option value="testing">Testing</option><option value="backend">Backend</option><option value="custom">Custom</option></select></label>
            <Field label="icon" value={diagram.icon} onChange={(value) => setDiagram({ ...diagram, icon: value })} />
            <Field label="description" type="textarea" value={diagram.description} onChange={(value) => setDiagram({ ...diagram, description: value })} />
            <button disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Create architecture'}</button>
          </form>

          {active ? <>
            <form className="card architecture-form-card" onSubmit={saveNode}>
              <div className="architecture-card-heading"><div><h3>＋ Add node</h3><p>Adding to <b>{active.title}</b></p></div><span className="step-num">2</span></div>
              <Field required label="title" value={node.title} onChange={(value) => setNode({ ...node, title: value })} />
              <Field label="subtitle" value={node.subtitle} onChange={(value) => setNode({ ...node, subtitle: value })} />
              <Field label="icon" value={node.icon} onChange={(value) => setNode({ ...node, icon: value })} />
              <Field label="node_type" value={node.node_type} onChange={(value) => setNode({ ...node, node_type: value })} />
              <Field label="technology" value={node.metadata.technology || ''} onChange={(value) => setNode({ ...node, metadata: { ...node.metadata, technology: value } })} />
              <Field label="sort_order" type="number" value={node.sort_order} onChange={(value) => setNode({ ...node, sort_order: value })} />
              <button disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Save node'}</button>
            </form>

            <form className="card architecture-form-card" onSubmit={saveConnection}>
              <div className="architecture-card-heading"><div><h3>＋ Connect nodes</h3><p>{nodes.length < 2 ? 'Add at least two nodes first.' : 'Choose two different nodes.'}</p></div><span className="step-num">3</span></div>
              <label>Source<select disabled={nodes.length < 2} value={connection.source_node_id} onChange={(event) => setConnection({ ...connection, source_node_id: event.target.value, target_node_id: event.target.value === connection.target_node_id ? '' : connection.target_node_id })}><option value="">Select source node</option>{nodes.filter((item) => item.id !== connection.target_node_id).map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
              <label>Target<select disabled={nodes.length < 2} value={connection.target_node_id} onChange={(event) => setConnection({ ...connection, target_node_id: event.target.value })}><option value="">Select target node</option>{nodes.filter((item) => item.id !== connection.source_node_id).map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
              <Field label="label" value={connection.label} onChange={(value) => setConnection({ ...connection, label: value })} />
              <label>Direction<select value={connection.direction} onChange={(event) => setConnection({ ...connection, direction: event.target.value })}><option value="forward">Forward →</option><option value="backward">Backward ←</option><option value="bidirectional">Both ↔</option></select></label>
              <button disabled={saving || nodes.length < 2 || !connection.source_node_id || !connection.target_node_id} className="btn btn-primary">{saving ? 'Saving…' : 'Save connection'}</button>
            </form>
          </> : <div className="card architecture-builder-empty"><h3>Create your first architecture</h3><p>Complete step 1. Node and connection tools will appear here afterward.</p></div>}
        </div>

        {active && <div className="card architecture-manage-card">
          <div className="admin-title-row"><div><h3>Manage {active.title}</h3><p className="page-sub">{nodes.length} nodes · {connections.length} connections</p></div><button className="btn btn-danger btn-sm" onClick={async () => { if (confirm('Delete this architecture and all its nodes?')) { await deleteRecord('architecture_diagrams', active.id); setSelected(''); await load(); setPreviewVersion((version) => version + 1); } }}>Delete architecture</button></div>
          <div className="table-wrap"><table><thead><tr><th>Node</th><th>Type</th><th>Technology</th><th>Action</th></tr></thead><tbody>{nodes.map((item) => <tr key={item.id}><td>{item.icon} {item.title}<div className="admin-row-sub">{item.subtitle}</div></td><td>{item.node_type}</td><td>{item.metadata?.technology}</td><td><button className="btn btn-danger btn-sm" onClick={async () => { await deleteRecord('architecture_nodes', item.id); await load(active.id); setPreviewVersion((version) => version + 1); }}>Delete</button></td></tr>)}</tbody></table>{!nodes.length && <p className="architecture-table-empty">No nodes yet.</p>}</div>
          {!!connections.length && <div className="architecture-connection-manager"><h4>Connections</h4>{connections.map((item) => { const source = nodes.find((nodeItem) => nodeItem.id === item.source_node_id); const target = nodes.find((nodeItem) => nodeItem.id === item.target_node_id); return <div className="architecture-connection-row" key={item.id}><span>{source?.title || 'Unknown'} <b>{item.direction === 'bidirectional' ? '↔' : item.direction === 'backward' ? '←' : '→'}</b> {target?.title || 'Unknown'} <small>{item.label}</small></span><button className="btn btn-danger btn-sm" onClick={async () => { await deleteRecord('architecture_connections', item.id); await load(active.id); setPreviewVersion((version) => version + 1); }}>Delete</button></div>; })}</div>}
        </div>}

        <h2 className="page-title architecture-preview-title">Live preview</h2>
        <ArchitectureWorkspace key={previewVersion} initialActive={selected} />
      </main>
    </div>
  );
}
