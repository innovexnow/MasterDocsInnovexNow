import { useNavigation } from '../hooks/useNavigation';
import WorkStatusTracker from '../components/workstatus/WorkStatusTracker.jsx';
import DynamicSidebar from '../components/navigation/DynamicSidebar';
import '../components/workstatus/workstatus.css';

export default function WorkStatusPage() {
  const { menus, settings, loading, error } = useNavigation();

  if (loading) {
    return (
      <div className="app">
        <div className="main">
          <p>Loading Work Status Tracker…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="main">
          <div className="notice">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <DynamicSidebar menus={menus} settings={settings} />
      <main className="main">
        <div className="page active">
          <h2 className="page-title">📈 Work Status Tracker</h2>
          <p className="page-sub">Modern project progress tracking with detailed module, submodule, and API progress</p>

          <WorkStatusTracker />
        </div>
      </main>
    </div>
  );
}