import { useState } from 'react';

export default function ProjectCard({ 
  project, 
  isExpanded, 
  onToggleExpand, 
  onEdit, 
  onDelete,
  onToggleApi 
}) {
  const [expandedSubmodules, setExpandedSubmodules] = useState([]);

  const toggleSubmodule = (submoduleId) => {
    setExpandedSubmodules(prev => 
      prev.includes(submoduleId)
        ? prev.filter(id => id !== submoduleId)
        : [...prev, submoduleId]
    );
  };

  const calculateProgressRadius = (progress) => {
    const circumference = 2 * Math.PI * 30; // Radius of 30
    return circumference - (progress / 100) * circumference;
  };

  return (
    <div className={`project-card ${isExpanded ? 'expanded' : ''}`}>
      <div className="project-card-header" onClick={onToggleExpand}>
        <div className="project-info">
          <h3 className="project-name">{project.name}</h3>
          <div className="project-stats">
            <span className="stat-badge">
              <span className="stat-icon">📊</span>
              {project.progress}%
            </span>
            <span className="stat-badge">
              <span className="stat-icon">✅</span>
              {project.completedApis}/{project.totalApis}
            </span>
            <span className="stat-badge">
              <span className="stat-icon">⏳</span>
              {project.pendingApis} pending
            </span>
          </div>
        </div>

        <div className="project-header-right">
          <div className="progress-ring-container">
            <svg className="progress-ring" width="64" height="64">
              <circle
                className="progress-ring-bg"
                strokeWidth="4"
                fill="transparent"
                r="30"
                cx="32"
                cy="32"
              />
              <circle
                className="progress-ring-circle"
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 30}`}
                strokeDashoffset={calculateProgressRadius(project.progress)}
                fill="transparent"
                r="30"
                cx="32"
                cy="32"
              />
            </svg>
            <div className="progress-text">{project.progress}%</div>
          </div>

          <div className="project-actions">
            <button 
              className="icon-button edit-btn"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              title="Edit"
            >
              ✏️
            </button>
            <button 
              className="icon-button delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete"
            >
              🗑️
            </button>
            <button 
              className="icon-button expand-btn"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? '▲' : '▼'}
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="project-card-body">
          <div className="submodules-list">
            {project.submodules.map(submodule => (
              <div key={submodule.id} className="submodule-card">
                <div 
                  className="submodule-header"
                  onClick={() => toggleSubmodule(submodule.id)}
                >
                  <div className="submodule-info">
                    <h4 className="submodule-name">
                      <span className="expand-icon">
                        {expandedSubmodules.includes(submodule.id) ? '▼' : '▶'}
                      </span>
                      {submodule.name}
                    </h4>
                    <div className="submodule-stats">
                      <span className="submodule-stat">
                        <span className="stat-icon-small">✅</span>
                        {submodule.completedApis}/{submodule.totalApis}
                      </span>
                      <span className="submodule-progress">
                        {Math.round((submodule.completedApis / submodule.totalApis) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {expandedSubmodules.includes(submodule.id) && (
                  <div className="apis-list">
                    {submodule.apis.map(api => (
                      <div key={api.id} className="api-item">
                        <label className="api-checkbox">
                          <input
                            type="checkbox"
                            checked={api.completed}
                            onChange={() => onToggleApi(project.id, submodule.id, api.id)}
                          />
                          <span className={`api-name ${api.completed ? 'completed' : 'pending'}`}>
                            {api.name}
                          </span>
                        </label>
                        <div className="api-status">
                          {api.completed ? (
                            <span className="status-badge status-completed">✅ Completed</span>
                          ) : (
                            <span className="status-badge status-pending">⏳ Pending</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {project.submodules.length === 0 && (
            <div className="empty-submodules">
              <p>No submodules added yet. Click Edit to add submodules.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}