import { useState, useEffect } from 'react';
import { adminList, saveRecord, deleteRecord } from '../../services/cms.js';
import type { Database } from '../../types/database';

type Download = Database['public']['Tables']['downloads']['Row'];

export default function DownloadManager() {
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', file_url: '', file_name: '', file_type: '', version: '', category: '', platform: '' });

  const load = async () => { try { setLoading(true); const rows = await adminList('downloads'); setDownloads(rows); setError(''); } catch (err: any) { setError(err.message); } finally { setLoading(false); } };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => { try { await saveRecord('downloads', formData); setFormData({ title: '', description: '', file_url: '', file_name: '', file_type: '', version: '', category: '', platform: '' }); setShowForm(false); await load(); } catch (err: any) { setError(err.message); } };

  const handleDelete = async (id: string) => { if (!confirm('Delete?')) return; try { await deleteRecord('downloads', id); await load(); } catch (err: any) { setError(err.message); } };

  return (
    <div className="download-manager">
      {error && <div className="notice notice-error">{error}</div>}
      <div className="download-header"><h2>Downloads</h2><button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add Download'}</button></div>
      {showForm && (
        <div className="download-form card"><h3>New Download</h3>
          <label>Title<input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} /></label>
          <label>Description<textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></label>
          <label>File URL<input value={formData.file_url} onChange={(e) => setFormData({ ...formData, file_url: e.target.value })} /></label>
          <label>File Name<input value={formData.file_name} onChange={(e) => setFormData({ ...formData, file_name: e.target.value })} /></label>
          <label>File Type<input value={formData.file_type} onChange={(e) => setFormData({ ...formData, file_type: e.target.value })} /></label>
          <label>Version<input value={formData.version} onChange={(e) => setFormData({ ...formData, version: e.target.value })} /></label>
          <label>Category<input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} /></label>
          <label>Platform<input value={formData.platform} onChange={(e) => setFormData({ ...formData, platform: e.target.value })} /></label>
          <button className="btn btn-primary" onClick={handleCreate}>Save</button>
        </div>
      )}
      <div className="download-list">
        {loading ? <p>Loading…</p> : downloads.length === 0 ? <div className="empty-state"><p>No downloads yet.</p></div> : downloads.map((dl) => (
          <div key={dl.id} className="download-item card">
            <div className="download-item-header"><h4>{dl.title}</h4><span className="badge badge-purple">{dl.file_type || 'unknown'}</span></div>
            {dl.description && <p>{dl.description}</p>}
            <div className="download-item-meta">{dl.version && <span>v{dl.version}</span>}{dl.platform && <span>{dl.platform}</span>}{dl.file_name && <span>{dl.file_name}</span>}</div>
            <div className="download-item-actions">
              {dl.file_url && <a className="btn btn-outline btn-sm" href={dl.file_url} target="_blank" rel="noopener noreferrer">Download</a>}
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(dl.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        .download-manager { padding: 16px; }
        .download-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .download-form { margin-bottom: 16px; }
        .download-form label { display: block; margin: 8px 0; font-size: 12px; color: var(--text2); }
        .download-form input, .download-form textarea { display: block; width: 100%; padding: 6px 8px; margin-top: 4px; background: var(--surface2); color: var(--text); border: 1px solid var(--border); border-radius: 4px; }
        .download-list { display: grid; gap: 12px; }
        .download-item-header { display: flex; justify-content: space-between; align-items: center; }
        .download-item-meta { display: flex; gap: 12px; font-size: 12px; color: var(--text2); margin: 8px 0; }
        .download-item-actions { display: flex; gap: 8px; }
        .empty-state { text-align: center; padding: 24px; color: var(--text2); }
      `}</style>
    </div>
  );
}
