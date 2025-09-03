import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { projectsAPI, usersAPI } from '../utils/api.js';
import { ROLES } from '@workboard/shared';

const ProjectsPage = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    key: '',
    description: '',
    members: []
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
      setNewProject({ name: '', key: '', description: '', members: [] });
      setShowCreateForm(false);
      
    } catch (error) {
      console.error('Create project error:', error);
      setError(error.response?.data?.error || 'Failed to create project. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      setIsDeletingProject(true);
      setError('');
      
      await projectsAPI.delete(projectId);
      
      // Remove from local state
      setProjects(prev => prev.filter(p => p._id !== projectId));
      setShowDeleteModal(null);
      
      // Show success message
      console.log('Project deleted successfully');
      
    } catch (error) {
      console.error('Delete project error:', error);
      setError(error.response?.data?.error || 'Failed to delete project. Please try again.');
    } finally {
      setIsDeletingProject(false);
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
  const canDeleteProject = user?.role === ROLES.ADMIN;

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
        <CreateProjectModal
          newProject={newProject}
          setNewProject={setNewProject}
          onClose={() => {
            setShowCreateForm(false);
            setNewProject({ name: '', key: '', description: '', members: [] });
            setError('');
          }}
          onSubmit={handleCreateProject}
          onNameChange={handleNameChange}
          isCreating={isCreating}
        />
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <DeleteProjectModal
          project={showDeleteModal}
          onClose={() => setShowDeleteModal(null)}
          onConfirm={() => handleDeleteProject(showDeleteModal._id)}
          isDeleting={isDeletingProject}
        />
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
            <div
              key={project._id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:border-brand-300 hover:shadow-md transition-all"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <Link
                      to={`/projects/${project._id}`}
                      className="block hover:text-brand-600"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {project.name}
                      </h3>
                    </Link>
                    <div className="flex items-center space-x-2">
                      <span className="inline-block px-2 py-1 bg-brand-100 text-brand-800 text-xs font-medium rounded-md">
                        {project.key}
                      </span>
                      {canDeleteProject && (
                        <button
                          onClick={() => setShowDeleteModal(project)}
                          className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50"
                          title="Delete project"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
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

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Link
                    to={`/projects/${project._id}`}
                    className="btn btn-outline btn-sm w-full"
                  >
                    View Project →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Delete Project Modal Component
const DeleteProjectModal = ({ project, onClose, onConfirm, isDeleting }) => {
  const [confirmText, setConfirmText] = useState('');
  const expectedText = project.key;

  const canDelete = confirmText === expectedText;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Delete Project</h2>
            <p className="text-sm text-gray-600">This action cannot be undone</p>
          </div>
        </div>
        
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <h3 className="font-medium text-red-800 mb-2">
            "{project.name}" will be permanently deleted
          </h3>
          <div className="text-sm text-red-700 space-y-1">
            <p>• All tasks in this project will be deleted</p>
            <p>• All tickets will be deleted</p>
            <p>• All project messages will be deleted</p>
            <p>• {project.members?.length || 0} team members will be notified</p>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type <strong>{expectedText}</strong> to confirm deletion:
          </label>
          <input
            type="text"
            className="form-input w-full"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={`Enter ${expectedText}`}
            autoFocus
          />
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={onConfirm}
            disabled={!canDelete || isDeleting}
            className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex-1"
          >
            {isDeleting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Deleting...
              </div>
            ) : (
              'Delete Project'
            )}
          </button>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="btn btn-secondary flex-1"
          >
            Cancel
          </button>
        </div>
        
        <p className="text-xs text-gray-500 mt-3 text-center">
          Only administrators can delete projects
        </p>
      </div>
    </div>
  );
};

// Create Project Modal Component with Role-based User Selection
const CreateProjectModal = ({ newProject, setNewProject, onClose, onSubmit, onNameChange, isCreating }) => {
  const [allUsers, setAllUsers] = useState([]);
  const [usersByRole, setUsersByRole] = useState({});
  const [selectedRole, setSelectedRole] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await usersAPI.getByRole();
      setAllUsers(response.data.users || []);
      setUsersByRole(response.data.groupedUsers || {});
    } catch (error) {
      console.error('Fetch users error:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const getFilteredUsers = () => {
    let users = selectedRole === 'all' ? allUsers : (usersByRole[selectedRole] || []);
    
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      users = users.filter(user => 
        user.name.toLowerCase().includes(search) || 
        user.email.toLowerCase().includes(search)
      );
    }
    
    return users;
  };

  const handleMemberToggle = (userId) => {
    setNewProject(prev => ({
      ...prev,
      members: prev.members.includes(userId)
        ? prev.members.filter(id => id !== userId)
        : [...prev.members, userId]
    }));
  };

  const selectAllRole = (role) => {
    const roleUsers = usersByRole[role] || [];
    const roleUserIds = roleUsers.map(user => user._id);
    
    setNewProject(prev => ({
      ...prev,
      members: [...new Set([...prev.members, ...roleUserIds])]
    }));
  };

  const deselectAllRole = (role) => {
    const roleUsers = usersByRole[role] || [];
    const roleUserIds = roleUsers.map(user => user._id);
    
    setNewProject(prev => ({
      ...prev,
      members: prev.members.filter(id => !roleUserIds.includes(id))
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Create New Project</h2>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Project Name</label>
              <input
                type="text"
                required
                className="form-input mt-1"
                value={newProject.name}
                onChange={onNameChange}
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
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Team Members ({newProject.members.length} selected)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Search users..."
                  className="form-input text-xs px-2 py-1"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                  className="form-select text-xs"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <option value="all">All Roles</option>
                  <option value={ROLES.ADMIN}>Admins ({usersByRole[ROLES.ADMIN]?.length || 0})</option>
                  <option value={ROLES.MANAGER}>Managers ({usersByRole[ROLES.MANAGER]?.length || 0})</option>
                  <option value={ROLES.EMPLOYEE}>Employees ({usersByRole[ROLES.EMPLOYEE]?.length || 0})</option>
                </select>
              </div>
            </div>

            {/* Role-based bulk actions */}
            {selectedRole !== 'all' && usersByRole[selectedRole]?.length > 0 && (
              <div className="flex space-x-2 mb-3">
                <button
                  type="button"
                  onClick={() => selectAllRole(selectedRole)}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Select All {selectedRole}s
                </button>
                <button
                  type="button"
                  onClick={() => deselectAllRole(selectedRole)}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Deselect All {selectedRole}s
                </button>
              </div>
            )}
            
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
              {isLoadingUsers ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600 mx-auto"></div>
                </div>
              ) : getFilteredUsers().length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No users found
                  {searchTerm && ` matching "${searchTerm}"`}
                  {selectedRole !== 'all' && ` in ${selectedRole} role`}
                </p>
              ) : (
                <div className="space-y-2">
                  {getFilteredUsers().map((userOption) => (
                    <label key={userOption._id} className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={newProject.members.includes(userOption._id)}
                        onChange={() => handleMemberToggle(userOption._id)}
                        className="rounded border-gray-300"
                      />
                      <div className="flex items-center space-x-2 flex-1">
                        <div className="w-6 h-6 bg-brand-100 rounded-full flex items-center justify-center text-xs font-medium text-brand-700">
                          {userOption.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium">{userOption.name}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">{userOption.email}</span>
                            <span className={`px-1 py-0.5 text-xs rounded ${
                              userOption.role === ROLES.ADMIN ? 'bg-red-100 text-red-700' :
                              userOption.role === ROLES.MANAGER ? 'bg-blue-100 text-blue-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {userOption.role}
                            </span>
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              Note: You will automatically be added as a project member and manager
            </p>
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
              onClick={onClose}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectsPage;