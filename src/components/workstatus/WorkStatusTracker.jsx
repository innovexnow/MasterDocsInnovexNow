import { useState, useEffect } from 'react';
import ProjectCard from './ProjectCard.jsx';
import CreateModuleDialog from './CreateModuleDialog.jsx';
import { adminList } from '../../services/cms.js';
import './workstatus.css';

function mapTasksToProjects(tasks) {
  const byModule = {};
  for (const task of tasks) {
    const mod = task.module || 'General';
    if (!byModule[mod]) {
      byModule[mod] = {
        id: mod,
        name: mod,
        completedApis: 0,
        totalApis: 0,
        apis: [],
      };
    }
    byModule[mod].totalApis++;
    if (task.status === 'done') {
      byModule[mod].completedApis++;
    }
    byModule[mod].apis.push({
      id: task.id,
      name: task.title,
      completed: task.status === 'done',
    });
  }
  return Object.values(byModule).map((mod) => {
    const progress = mod.totalApis > 0 ? Math.round((mod.completedApis / mod.totalApis) * 100) : 0;
    return {
      id: mod.id,
      name: mod.name,
      progress,
      completedApis: mod.completedApis,
      totalApis: mod.totalApis,
      pendingApis: mod.totalApis - mod.completedApis,
      submodules: [mod],
    };
  });
}

export default function WorkStatusTracker() {
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [expandedProjects, setExpandedProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const tasks = await adminList('tasks');
      const mapped = mapTasksToProjects(tasks);
      setProjects(mapped.length > 0 ? mapped : []);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const toggleExpand = (projectId) => {
    setExpandedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleToggleApi = (projectId, submoduleId, apiId) => {
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id === projectId) {
          const updatedSubmodules = project.submodules.map((submodule) => {
            if (submodule.id === submoduleId) {
              const updatedApis = submodule.apis.map((api) =>
                api.id === apiId ? { ...api, completed: !api.completed } : api
              );
              const completedApis = updatedApis.filter((a) => a.completed).length;
              const totalApis = updatedApis.length;
              return {
                ...submodule,
                apis: updatedApis,
                completedApis,
                totalApis,
              };
            }
            return submodule;
          });

          const totalCompleted = updatedSubmodules.reduce(
            (sum, sm) => sum + sm.completedApis,
            0
          );
          const totalApis = updatedSubmodules.reduce(
            (sum, sm) => sum + sm.totalApis,
            0
          );
          const progress =
            totalApis > 0 ? Math.round((totalCompleted / totalApis) * 100) : 0;

          return {
            ...project,
            submodules: updatedSubmodules,
            completedApis: totalCompleted,
            totalApis,
            pendingApis: totalApis - totalCompleted,
            progress,
          };
        }
        return project;
      })
    );
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      searchTerm === '' ||
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.submodules.some(
        (sm) =>
          sm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sm.apis.some((api) => api.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );

    let matchesFilter = true;
    if (filter === 'completed') {
      matchesFilter = project.progress === 100;
    } else if (filter === 'in-progress') {
      matchesFilter = project.progress > 0 && project.progress < 100;
    } else if (filter === 'pending') {
      matchesFilter = project.progress === 0;
    }

    return matchesSearch && matchesFilter;
  });

  const overallStats = {
    totalModules: projects.length,
    totalApis: projects.reduce((sum, p) => sum + p.totalApis, 0),
    completedApis: projects.reduce((sum, p) => sum + p.completedApis, 0),
    pendingApis: projects.reduce((sum, p) => sum + p.pendingApis, 0),
    overallProgress:
      projects.reduce((sum, p) => sum + p.progress, 0) / (projects.length || 1),
  };

  if (loading) {
    return (
      <div className="workstatus-tracker">
        <div className="workstatus-header">
          <div className="stats-overview">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="stat-card">
                <div className="stat-value">—</div>
                <div className="stat-label">Loading…</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="workstatus-tracker">
      <div className="workstatus-header">
        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-value">{overallStats.totalModules}</div>
            <div className="stat-label">Total Modules</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{overallStats.totalApis}</div>
            <div className="stat-label">Total APIs</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{overallStats.completedApis}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{overallStats.pendingApis}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{Math.round(overallStats.overallProgress)}%</div>
            <div className="stat-label">Overall Progress</div>
          </div>
        </div>

        <div className="controls-row">
          <div className="search-filter-section">
            <input
              type="text"
              placeholder="Search modules, submodules, or APIs…"
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="filter-chips">
              <button
                className={`filter-chip ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button
                className={`filter-chip ${filter === 'completed' ? 'active' : ''}`}
                onClick={() => setFilter('completed')}
              >
                Completed
              </button>
              <button
                className={`filter-chip ${filter === 'in-progress' ? 'active' : ''}`}
                onClick={() => setFilter('in-progress')}
              >
                In Progress
              </button>
              <button
                className={`filter-chip ${filter === 'pending' ? 'active' : ''}`}
                onClick={() => setFilter('pending')}
              >
                Pending
              </button>
            </div>
          </div>

          <button
            className="fab-button"
            onClick={() => {
              setEditingProject(null);
              setShowDialog(true);
            }}
          >
            <span className="fab-icon">+</span>
            Add Module
          </button>
        </div>
      </div>

      <div className="projects-grid">
        {filteredProjects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>No projects found</h3>
            <p>Create your first project to start tracking progress</p>
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditingProject(null);
                setShowDialog(true);
              }}
            >
              + Create First Module
            </button>
          </div>
        ) : (
          filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isExpanded={expandedProjects.includes(project.id)}
              onToggleExpand={() => toggleExpand(project.id)}
              onEdit={() => {}}
              onDelete={() => {}}
              onToggleApi={handleToggleApi}
            />
          ))
        )}
      </div>

      {showDialog && (
        <CreateModuleDialog
          project={editingProject}
          onClose={() => {
            setShowDialog(false);
            setEditingProject(null);
          }}
          onSave={(data) => {
            setProjects((prev) => [...prev, data]);
            setShowDialog(false);
            setEditingProject(null);
          }}
        />
      )}
    </div>
  );
}
