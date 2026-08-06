import { useState, useEffect } from 'react';

export default function CreateModuleDialog({ project, onClose, onSave }) {
  const [moduleName, setModuleName] = useState('');
  const [submodules, setSubmodules] = useState([
    { id: '1', name: '', apis: [{ id: '1-1', name: '', completed: false }] }
  ]);
  const [previewData, setPreviewData] = useState(null);

  // Initialize form if editing existing project
  useEffect(() => {
    if (project) {
      setModuleName(project.name);
      setSubmodules(project.submodules || [
        { id: '1', name: '', apis: [{ id: '1-1', name: '', completed: false }] }
      ]);
    } else {
      setModuleName('');
      setSubmodules([
        { id: '1', name: '', apis: [{ id: '1-1', name: '', completed: false }] }
      ]);
    }
  }, [project]);

  // Update preview whenever form changes
  useEffect(() => {
    const totalApis = submodules.reduce((total, sm) => total + sm.apis.length, 0);
    const completedApis = submodules.reduce((total, sm) => 
      total + sm.apis.filter(api => api.completed).length, 0
    );
    
    setPreviewData({
      name: moduleName || 'New Module',
      submodules: submodules.map(sm => ({
        name: sm.name || 'Submodule',
        apis: sm.apis.map(api => ({
          name: api.name || 'API',
          completed: api.completed
        }))
      })),
      totalApis,
      completedApis,
      progress: totalApis > 0 ? Math.round((completedApis / totalApis) * 100) : 0
    });
  }, [moduleName, submodules]);

  const addSubmodule = () => {
    const newId = Date.now().toString();
    setSubmodules(prev => [
      ...prev,
      { 
        id: newId, 
        name: '', 
        apis: [{ id: `${newId}-1`, name: '', completed: false }] 
      }
    ]);
  };

  const removeSubmodule = (submoduleId) => {
    if (submodules.length > 1) {
      setSubmodules(prev => prev.filter(sm => sm.id !== submoduleId));
    }
  };

  const updateSubmoduleName = (submoduleId, name) => {
    setSubmodules(prev => prev.map(sm => 
      sm.id === submoduleId ? { ...sm, name } : sm
    ));
  };

  const addApi = (submoduleId) => {
    setSubmodules(prev => prev.map(sm => {
      if (sm.id === submoduleId) {
        const newApiId = `${submoduleId}-${sm.apis.length + 1}`;
        return {
          ...sm,
          apis: [...sm.apis, { id: newApiId, name: '', completed: false }]
        };
      }
      return sm;
    }));
  };

  const removeApi = (submoduleId, apiId) => {
    setSubmodules(prev => prev.map(sm => {
      if (sm.id === submoduleId && sm.apis.length > 1) {
        return {
          ...sm,
          apis: sm.apis.filter(api => api.id !== apiId)
        };
      }
      return sm;
    }));
  };

  const updateApiName = (submoduleId, apiId, name) => {
    setSubmodules(prev => prev.map(sm => {
      if (sm.id === submoduleId) {
        return {
          ...sm,
          apis: sm.apis.map(api => 
            api.id === apiId ? { ...api, name } : api
          )
        };
      }
      return sm;
    }));
  };

  const toggleApiCompleted = (submoduleId, apiId) => {
    setSubmodules(prev => prev.map(sm => {
      if (sm.id === submoduleId) {
        return {
          ...sm,
          apis: sm.apis.map(api => 
            api.id === apiId ? { ...api, completed: !api.completed } : api
          )
        };
      }
      return sm;
    }));
  };

  const handleSave = () => {
    if (!moduleName.trim()) {
      alert('Module name is required');
      return;
    }

    const filteredSubmodules = submodules
      .filter(sm => sm.name.trim() !== '')
      .map(sm => ({
        ...sm,
        apis: sm.apis.filter(api => api.name.trim() !== '')
      }))
      .filter(sm => sm.apis.length > 0);

    if (filteredSubmodules.length === 0) {
      alert('Add at least one submodule with at least one API');
      return;
    }

    const completedApis = filteredSubmodules.reduce((total, sm) => 
      total + sm.apis.filter(api => api.completed).length, 0
    );
    const totalApis = filteredSubmodules.reduce((total, sm) => total + sm.apis.length, 0);

    onSave({
      name: moduleName.trim(),
      submodules: filteredSubmodules,
      progress: totalApis > 0 ? Math.round((completedApis / totalApis) * 100) : 0,
      completedApis,
      totalApis,
      pendingApis: totalApis - completedApis
    });
  };

  return (
    <div className="dialog-overlay">
      <div className="module-dialog">
        <div className="dialog-header">
          <h3>{project ? 'Edit Module' : 'Create New Module'}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="dialog-content">
          <div className="form-section">
            <div className="form-group">
              <label>Module Name</label>
              <input
                type="text"
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                placeholder="e.g., User App, Admin App, Backend APIs"
              />
            </div>

            <div className="form-section-header">
              <h4>Submodules</h4>
              <button className="add-btn" onClick={addSubmodule}>+ Add Submodule</button>
            </div>

            {submodules.map((submodule, smIndex) => (
              <div key={submodule.id} className="submodule-form">
                <div className="submodule-header">
                  <input
                    type="text"
                    value={submodule.name}
                    onChange={(e) => updateSubmoduleName(submodule.id, e.target.value)}
                    placeholder={`Submodule ${smIndex + 1} Name`}
                  />
                  {submodules.length > 1 && (
                    <button 
                      className="remove-btn"
                      onClick={() => removeSubmodule(submodule.id)}
                      title="Remove submodule"
                    >
                      🗑️
                    </button>
                  )}
                </div>

                <div className="apis-section">
                  <div className="apis-header">
                    <h5>APIs</h5>
                    <button 
                      className="add-btn small"
                      onClick={() => addApi(submodule.id)}
                    >
                      + Add API
                    </button>
                  </div>

                  {submodule.apis.map((api, apiIndex) => (
                    <div key={api.id} className="api-form-row">
                      <input
                        type="text"
                        value={api.name}
                        onChange={(e) => updateApiName(submodule.id, api.id, e.target.value)}
                        placeholder={`API ${apiIndex + 1} Name`}
                      />
                      <label className="api-checkbox-label">
                        <input
                          type="checkbox"
                          checked={api.completed}
                          onChange={() => toggleApiCompleted(submodule.id, api.id)}
                        />
                        <span>Completed</span>
                      </label>
                      {submodule.apis.length > 1 && (
                        <button 
                          className="remove-btn small"
                          onClick={() => removeApi(submodule.id, api.id)}
                          title="Remove API"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="preview-section">
            <h4>Live Preview</h4>
            <div className="preview-card">
              <div className="preview-header">
                <h5>{previewData?.name}</h5>
                <div className="preview-progress">
                  <div className="preview-progress-text">{previewData?.progress}%</div>
                  <div className="preview-stats">
                    {previewData?.completedApis}/{previewData?.totalApis} APIs
                  </div>
                </div>
              </div>

              <div className="preview-submodules">
                {previewData?.submodules.map((submodule, smIndex) => (
                  <div key={smIndex} className="preview-submodule">
                    <div className="preview-submodule-header">
                      <span className="expand-icon">▼</span>
                      <span className="preview-submodule-name">{submodule.name}</span>
                      <span className="preview-submodule-stats">
                        {submodule.apis.filter(a => a.completed).length}/{submodule.apis.length}
                      </span>
                    </div>
                    
                    <div className="preview-apis">
                      {submodule.apis.map((api, apiIndex) => (
                        <div key={apiIndex} className="preview-api">
                          <span className={`api-indicator ${api.completed ? 'completed' : 'pending'}`}>
                            {api.completed ? '🟢' : '⚪'}
                          </span>
                          <span className={`preview-api-name ${api.completed ? 'completed' : ''}`}>
                            {api.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {(!previewData?.submodules || previewData.submodules.length === 0) && (
                <div className="preview-empty">
                  No submodules added yet
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="dialog-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            {project ? 'Update Module' : 'Create Module'}
          </button>
        </div>
      </div>
    </div>
  );
}