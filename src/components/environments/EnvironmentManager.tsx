import { useState, useEffect } from 'react';
import { adminList, saveRecord, deleteRecord } from '../../services/cms.js';
import type { Database } from '../../types/database';

type Environment = Database['public']['Tables']['environments']['Row'];

export default function EnvironmentManager() {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'development', backend_url: '', frontend_url: '', ssh_host: '', rds_host: '', s3_bucket: '', supabase_url: '', metadata: '{}' });

  const load = async () => { try { setLoading(true); const rows = await adminList('environments'); setEnvironments(rows); setError(''); } catch (err: any) { setError(err.message); } finally { setLoading(false); } };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => { try { await saveRecord('environments', formData); setFormData({ name: '', type: 'development', backend_url: '', frontend_url: '', ssh_host: '', rds_host: '', s3_bucket: '', supabase_url: '', metadata: '{}' }); setShowForm(false); await load(); } catch (err: any) { setError(err.message); } };

  const handleDelete = async (id: string) => { if (!confirm('Delete?')) return; try { await deleteRecord('environments', id); await load(); } catch (err: any) { setError(err.message); } };

  return (
    <div className="environment-manager">
      {error && <div className="notice notice-error">{error}</div>}
      <div className="environment-header"><h2>Environments</h2><button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add Environment'}</button></div>
      {showForm && (
        <div className="environment-form card"><h3>New Environment</h3>
          <label>Name<input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></label>
          <label>Type<select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}><option value="production">Production</option><option value="qa">QA</option><option value="development">Development</option><option value="staging">Staging</option><option value="local">Local</option></select></label>
          <label>Backend URL<input value={formData.backend_url} onChange={(e) => setFormData({ ...formData, backend_url: e.target.value })} /></label>
          <label>Frontend URL<input value={formData.frontend_url} onChange={(e) => setFormData({ ...formData, frontend_url: e.target.value })} /></label>
          <label>SSH Host<input value={formData.ssh_host} onChange={(e) => setFormData({ ...formData, ssh_host: e.target.value })} /></label>
          <label>RDS Host<input value={formData.rds_host} onChange={(e) => setFormData({ ...formData, rds_host: e.target.value })} /></label>
          <label>S3 Bucket<input value={formData.s3_bucket} onChange={(e) => setFormData({ ...formData, s3_bucket: e.target.value })} /></label>
          <label>Supabase URL<input value={formData.supabase_url} onChange={(e) => setFormData({ ...formData, supabase_url: e.target.value })} /></label>
          <button className="btn btn-primary" onClick={handleCreate}>Save</button>
        </div>
      )}
      <div className="environment-list">
        {loading ? <p>Loading…</p> : environments.length === 0 ? <div className="empty-state"><p>No environments yet.</p></div> : environments.map((env) => (
          <div key={env.id} className="environment-item card">
            <div className="environment-item-header"><h4>{env.name}</h4><span className="badge badge-purple">{env.type}</span></div>
            <div className="environment-item-urls">
              {env.backend_url && <span><b>Backend:</b> <a href={env.backend_url} target="_blank" rel="noopener noreferrer">{env.backend_url}</a></span>}
              {env.frontend_url && <span><b>Frontend:</b> <a href={env.frontend_url} target="_blank" rel="noopener noreferrer">{env.frontend_url}</a></span>}
              {env.ssh_host && <span><b>SSH:</b> {env.ssh_host}</span>}
              {env.rds_host && <span><b>RDS:</b> {env.rds_host}</span>}
              {env.s3_bucket && <span><b>S3:</b> {env.s3_bucket}</span>}
            </div>
            <div className="environment-item-actions">
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(env.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        .environment-manager { padding: 16px; }
        .environment-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .environment-form { margin-bottom: 16px; }
        .environment-form label { display: block; margin: 8px 0; font-size: 12px; color: var(--text2); }
        .environment-form input, .environment-form select { display: block; width: 100%; padding: 6px 8px; margin-top: 4px; background: var(--surface2); color: var(--text); border: 1px solid var(--border); border-radius: 4px; }
        .environment-list { display: grid; gap: 12px; }
        .environment-item-header { display: flex; justify-content: space-between; align-items: center; }
        .environment-item-urls { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; margin: 8px 0; }
        .environment-item-actions { display: flex; gap: 8px; }
        .empty-state { text-align: center; padding: 24px; color: var(--text2); }
      `}</style>
    </div>
  );
}
