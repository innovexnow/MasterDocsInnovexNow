import { useState, useEffect, useCallback } from 'react';
import { getArchitectureAdminCatalog, saveArchitectureEntity, deleteRecord } from '../../services/cms.js';
import type { Database } from '../../types/database';

type DiagramRow = Database['public']['Tables']['architecture_diagrams']['Row'];

const systemDesignTypes = [
  'data_flow',
  'project_structure',
  'dependencies',
  'database_schema',
  'rest_communication',
  'grpc_communication',
  'sequence_diagram',
  'flow_chart',
  'er_diagram',
  'deployment_diagram',
  'authentication_flow',
  'notification_flow',
  'payment_flow',
  'markdown_explanation',
  'code_sample',
  'table',
  'notes',
];

export default function SystemDesignBuilder() {
  const [catalog, setCatalog] = useState<DiagramRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [designTitle, setDesignTitle] = useState('');
  const [designType, setDesignType] = useState('data_flow');
  const [designDescription, setDesignDescription] = useState('');
  const [designContent, setDesignContent] = useState('');
  const [designMetadata, setDesignMetadata] = useState('{}');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await getArchitectureAdminCatalog();
      setCatalog(rows);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!designTitle.trim()) return;
    try {
      await saveArchitectureEntity('architecture_diagrams', {
        title: designTitle,
        slug: designTitle.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        architecture_type: 'system_design',
        description: designDescription || undefined,
        icon: '🎨',
        nodes: [],
        connections: [],
        metadata: {
          design_type: designType,
          content: designContent,
          ...JSON.parse(designMetadata || '{}'),
        },
      });
      setDesignTitle('');
      setDesignDescription('');
      setDesignContent('');
      setDesignMetadata('{}');
      await load();
      setMessage({ type: 'success', text: 'System design created.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleDelete = async () => {
    if (!selectedId || !confirm('Delete this system design?')) return;
    try {
      await deleteRecord('architecture_diagrams', selectedId);
      setSelectedId('');
      await load();
      setMessage({ type: 'success', text: 'System design deleted.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const selected = catalog.find((d) => d.id === selectedId);

  return (
    <div className="system-design-builder">
      {message && (
        <div className={`notice ${message.type === 'success' ? 'notice-success' : 'notice-error'}`}>
          {message.text}
        </div>
      )}

      <div className="system-design-form card">
        <h3>Create System Design</h3>
        <label>Title<input value={designTitle} onChange={(e) => setDesignTitle(e.target.value)} /></label>
        <label>Type<select value={designType} onChange={(e) => setDesignType(e.target.value)}>
          {systemDesignTypes.map((type) => (
            <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
          ))}
        </select></label>
        <label>Description<textarea value={designDescription} onChange={(e) => setDesignDescription(e.target.value)} /></label>
        <label>Content<textarea value={designContent} onChange={(e) => setDesignContent(e.target.value)} rows={6} /></label>
        <label>Metadata (JSON)<textarea value={designMetadata} onChange={(e) => setDesignMetadata(e.target.value)} rows={3} /></label>
        <button className="btn btn-primary" onClick={handleCreate} disabled={!designTitle.trim()}>
          Create System Design
        </button>
      </div>

      <div className="system-design-catalog">
        <h3>Saved Designs</h3>
        {loading ? (
          <p>Loading…</p>
        ) : catalog.length === 0 ? (
          <p>No system designs yet.</p>
        ) : (
          catalog.map((design) => (
            <div key={design.id} className={`system-design-item ${selectedId === design.id ? 'active' : ''}`}>
              <button onClick={() => setSelectedId(design.id)}>
                {design.icon} {design.title}
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
            </div>
          ))
        )}
      </div>

      {selected && (
        <div className="system-design-preview card">
          <h3>{selected.icon} {selected.title}</h3>
          <p>{selected.description}</p>
          <pre>{JSON.stringify(selected.metadata, null, 2)}</pre>
        </div>
      )}

      <style>{`
        .system-design-builder { padding: 16px; }
        .system-design-form { max-width: 600px; }
        .system-design-form label { display: block; margin: 8px 0; font-size: 12px; color: var(--text2); }
        .system-design-form input, .system-design-form select, .system-design-form textarea { display: block; width: 100%; padding: 6px 8px; margin-top: 4px; background: var(--surface2); color: var(--text); border: 1px solid var(--border); border-radius: 4px; }
        .system-design-catalog { margin-top: 24px; }
        .system-design-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 8px; }
        .system-design-item.active { border-color: var(--primary); background: var(--surface2); }
        .system-design-preview { margin-top: 16px; }
        .system-design-preview pre { max-height: 300px; overflow-y: auto; background: var(--surface2); padding: 12px; border-radius: 8px; font-size: 12px; }
      `}</style>
    </div>
  );
}
