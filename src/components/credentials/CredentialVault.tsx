import { useState, useEffect } from 'react';
import { adminList, saveRecord, deleteRecord } from '../../services/cms.js';
import type { Database } from '../../types/database';

type Credential = Database['public']['Tables']['credentials']['Row'];

export default function CredentialVault() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ label: '', value: '', environment: 'global', category: '', visibility: 'admin_only', description: '' });

  const load = async () => { try { setLoading(true); const rows = await adminList('credentials'); setCredentials(rows); setError(''); } catch (err: any) { setError(err.message); } finally { setLoading(false); } };

  useEffect(() => { load(); }, []);

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => { try { await saveRecord('credentials', formData); setFormData({ label: '', value: '', environment: 'global', category: '', visibility: 'admin_only', description: '' }); setShowForm(false); await load(); } catch (err: any) { setError(err.message); } };

  const handleDelete = async (id: string) => { if (!confirm('Delete?')) return; try { await deleteRecord('credentials', id); await load(); } catch (err: any) { setError(err.message); } };

  return (
    <div className="credential-vault">
      {error && <div className="notice notice-error">{error}</div>}
      <div className="credential-header"><h2>Credentials Vault</h2><button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add Credential'}</button></div>
      {showForm && (
        <div className="credential-form card"><h3>New Credential</h3>
          <label>Label<input value={formData.label} onChange={(e) => setFormData({ ...formData, label: e.target.value })} /></label>
          <label>Value<input type="password" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} /></label>
          <label>Environment<select value={formData.environment} onChange={(e) => setFormData({ ...formData, environment: e.target.value })}><option value="global">Global</option><option value="production">Production</option><option value="qa">QA</option><option value="development">Development</option><option value="staging">Staging</option><option value="local">Local</option></select></label>
          <label>Category<input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} /></label>
          <label>Visibility<select value={formData.visibility} onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}><option value="admin_only">Admin Only</option><option value="public">Public</option><option value="role_based">Role Based</option></select></label>
          <label>Description<textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></label>
          <button className="btn btn-primary" onClick={handleCreate}>Save</button>
        </div>
      )}
      <div className="credential-list">
        {loading ? <p>Loading…</p> : credentials.length === 0 ? <div className="empty-state"><p>No credentials yet.</p></div> : credentials.map((cred) => (
          <div key={cred.id} className="credential-item card">
            <div className="credential-item-header"><h4>{cred.label}</h4><span className="badge badge-purple">{cred.environment}</span></div>
            {cred.description && <p>{cred.description}</p>}
            <div className="credential-value">
              {revealedIds.has(cred.id) ? (
                <code>{cred.encrypted_value}</code>
              ) : (
                <code>••••••••••••</code>
              )}
              <button className="btn btn-outline btn-sm" onClick={() => toggleReveal(cred.id)}>
                {revealedIds.has(cred.id) ? 'Hide' : 'Reveal'}
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => navigator.clipboard.writeText(cred.encrypted_value || '')}>Copy</button>
            </div>
            <div className="credential-item-actions">
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(cred.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        .credential-vault { padding: 16px; }
        .credential-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .credential-form { margin-bottom: 16px; }
        .credential-form label { display: block; margin: 8px 0; font-size: 12px; color: var(--text2); }
        .credential-form input, .credential-form textarea, .credential-form select { display: block; width: 100%; padding: 6px 8px; margin-top: 4px; background: var(--surface2); color: var(--text); border: 1px solid var(--border); border-radius: 4px; }
        .credential-list { display: grid; gap: 12px; }
        .credential-item-header { display: flex; justify-content: space-between; align-items: center; }
        .credential-value { display: flex; align-items: center; gap: 8px; margin: 8px 0; }
        .credential-value code { flex: 1; background: var(--surface2); padding: 8px; border-radius: 4px; font-size: 12px; word-break: break-all; }
        .credential-item-actions { display: flex; gap: 8px; }
        .empty-state { text-align: center; padding: 24px; color: var(--text2); }
      `}</style>
    </div>
  );
}
