import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { projectsAPI } from '../utils/api.js';
import { ROLES } from '@workboard/shared';

const ProjectsPage = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    key: '',
    description: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await projectsAPI.getAll();
      setProjects(response.data.projects || []);
    } catch (error) {
      console.error('Fetch projects error:', error);
      setError('Failed to load projects. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    
    if (!newProject.name || !newProject.key) {
      setError('Project name and key are required');
      return;
    }

    try {
      setIsCreating(true);
      setError('');
      
      await projectsAPI.create(newProject);
      
      // Refresh projects list
      await fetchProjects();
      
      // Reset form and close modal
      setNewProject({ name: '', key: '', description: '' });
      setShowCreateForm(false);
      
    } catch (error) {
      console.error('Create project error:', error);
      setError(error.response?.data?.error || 'Failed to create project. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const generateKeyFromName = (name) => {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .split(' ')
      .map(word => word.substring(0, 3))
      .join('')
      .substring(0, 10);
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setNewProject({
      ...newProject,
      name,
      key: generateKeyFromName(name)
    });
  };

  const canCreateProject = user?.role === ROLES.ADMIN || user?.role === ROLES.MANAGER;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600">Manage your projects and track progress</p>
        </div>
        
        {canCreateProject && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary"
          >
            <span className="mr-2">+</span>
            Create Project
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Create project form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Create New Project</h2>
            
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Project Name</label>
                <input
                  type="text"
                  required
                  className="form-input mt-1"
                  value={newProject.name}
                  onChange={handleNameChange}
                  placeholder="Enter project name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Project Key</label>
                <input
                  type="text"
                  required
                  className="form-input mt-1"
                  value={newProject.key}
                  onChange={(e) => setNewProject({...newProject, key: e.target.value.toUpperCase()})}
                  placeholder="e.g., PROJ"
                  maxLength="10"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Unique identifier (auto-generated from name)
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  className="form-textarea mt-1"
                  rows="3"
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  placeholder="Project description (optional)"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="btn btn-primary flex-1"
                >
                  {isCreating ? 'Creating...' : 'Create Project'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewProject({ name: '', key: '', description: '' });
                    setError('');
                  }}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Projects grid */}
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">📋</span>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-600 mb-6">
            {canCreateProject 
              ? "Create your first project to get started"
              : "No projects have been assigned to you yet"
            }
          </p>
          {canCreateProject && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn btn-primary"
            >
              Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project._id}
              to={`/projects/${project._id}`}
              className="block bg-white rounded-lg shadow-sm border border-gray-200 hover:border-brand-300 hover:shadow-md transition-all"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {project.name}
                    </h3>
                    <span className="inline-block px-2 py-1 bg-brand-100 text-brand-800 text-xs font-medium rounded-md">
                      {project.key}
                    </span>
                  </div>
                </div>
                
                {project.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {project.description}
                  </p>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="mr-2">👤</span>
                    <span>Manager: {project.manager?.name}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="mr-2">👥</span>
                    <span>{project.members?.length || 0} members</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="mr-2">📅</span>
                    <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                
                {project.members?.length > 0 && (
                  <div className="mt-4 flex items-center space-x-2">
                    <span className="text-xs text-gray-500">Team:</span>
                    <div className="flex space-x-1">
                      {project.members.slice(0, 5).map((member, index) => (
                        <div
                          key={member._id}
                          className="w-6 h-6 bg-brand-100 rounded-full flex items-center justify-center text-xs font-medium text-brand-700"
                          title={member.name}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {project.members.length > 5 && (
                        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs text-gray-500">
                          +{project.members.length - 5}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;