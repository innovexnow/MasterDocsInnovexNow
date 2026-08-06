import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from '../legacy/home.css?raw';
import completeCmsSetup from '../../database/complete_cms_setup.sql?raw';
import enhancementMigration from '../../database/migrations/202608060001_dynamic_cms_enhancement.sql?raw';
import seedMigration from '../../database/migrations/202608060002_seed_home_and_navigation.sql?raw';

const projectRef = (import.meta.env.VITE_SUPABASE_URL || '').match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
const editorUrl = projectRef
  ? `https://supabase.com/dashboard/project/${projectRef}/sql/new`
  : 'https://supabase.com/dashboard';
const scripts = [
  {
    name: 'Complete CMS setup (all sections)',
    path: 'database/complete_cms_setup.sql',
    sql: completeCmsSetup,
    version: '2026-08-05.4',
  },
  {
    name: 'Dynamic CMS enhancement (media, tags, revisions, activity logs)',
    path: 'database/migrations/202608060001_dynamic_cms_enhancement.sql',
    sql: enhancementMigration,
    version: '2026-08-06.1',
  },
  {
    name: 'Home, System Hub pages and navigation seed',
    path: 'database/migrations/202608060002_seed_home_and_navigation.sql',
    sql: seedMigration,
    version: '2026-08-06.2',
  },
];

async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    return copied;
  }
}

export default function DatabaseSetupPage() {
  const [copyState, setCopyState] = useState({ index: null, state: 'idle' });

  const copy = async (index, sql) => {
    const copied = await writeClipboard(sql);
    setCopyState({ index, state: copied ? 'copied' : 'failed' });
    if (copied) setTimeout(() => setCopyState({ index: null, state: 'idle' }), 6000);
  };

  return (
    <div className="database-setup-page">
      <style>{styles}</style>
      <header className="section-manager-header">
        <div>
          <span className="badge badge-purple">ONE-TIME SETUP</span>
          <h1 className="page-title">⚡ Connect the Dynamic CMS Database</h1>
          <p className="page-sub">Create or repair every CMS table without removing existing content.</p>
        </div>
        <Link className="btn btn-outline" to="/admin/sections">← Section Managers</Link>
      </header>

      <div className="setup-layout">
        <section className="card">
          <h3>How to apply the database</h3>
          <ol className="setup-steps">
            <li>Open the connected project in the Supabase SQL Editor.</li>
            <li>Copy and run the scripts below <b>in order</b> into a new query.</li>
            <li>Confirm each one&apos;s <b>INSTALLER_VERSION</b> matches what is shown.</li>
            <li>Run them once, then return to RestroDocs and refresh.</li>
          </ol>
          <a className="btn btn-primary" href={editorUrl} target="_blank" rel="noopener noreferrer">
            Open Supabase SQL Editor ↗
          </a>
          <div className="notice setup-security">
            This installer is additive and rerunnable. Never paste a service-role key or database password here.
          </div>
        </section>

        <section>
          <h2>SQL scripts</h2>
          {scripts.map((script, index) => (
            <article className="card setup-script" key={script.path}>
              <span className="step-num">{index + 1}</span>
              <div>
                <h3>{script.name}</h3>
                <code>{script.path}</code>
                <p>{script.sql.split('\n').length} lines · installer {script.version}</p>
              </div>
              <button className="btn btn-outline" onClick={() => copy(index, script.sql)}>
                {copyState.index === index && copyState.state === 'copied' ? '✓ COPIED — paste now' : copyState.index === index && copyState.state === 'failed' ? 'Copy failed — open file' : '📋 Copy SQL'}
              </button>
            </article>
          ))}
          {copyState.state === 'failed' && (
            <div className="notice">Browser blocked clipboard access. Open the SQL file shown above and copy all its contents manually.</div>
          )}
        </section>
      </div>

      <section className="card setup-flow">
        <h3>How dynamic content works</h3>
        <div className="setup-flow-row"><span>Admin Builder</span><b>→</b><span>Supabase tables</span><b>→</b><span>RestroDocs page</span></div>
        <p>Saved and enabled records appear when the page reloads. No frontend rebuild is required.</p>
      </section>
    </div>
  );
}
