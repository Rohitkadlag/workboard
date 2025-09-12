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
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-500/30 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-brand-50 to-white border border-brand-100 shadow-sm p-6 sm:p-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">Projects</h1>
          <p className="mt-1 text-gray-600">Manage your projects and track progress</p>
        </div>
        {canCreateProject && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
          >
            <span className="mr-2">+</span>
            Create Project
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="text-sm font-medium text-red-700">{error}</div>
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
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <span className="mb-4 block text-6xl">📋</span>
          <h3 className="mb-2 text-lg font-medium text-gray-900">No projects yet</h3>
          <p className="mb-6 text-gray-600">
            {canCreateProject 
              ? "Create your first project to get started"
              : "No projects have been assigned to you yet"
            }
          </p>
          {canCreateProject && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
            >
              Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project._id}
              className="rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
            >
              <div className="p-6">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex-1">
                    <Link
                      to={`/projects/${project._id}`}
                      className="block hover:text-brand-600"
                    >
                      <h3 className="mb-1 text-lg font-semibold text-gray-900">
                        {project.name}
                      </h3>
                    </Link>
                    <div className="flex items-center space-x-2">
                      <span className="inline-block rounded-md bg-brand-100 px-2 py-1 text-xs font-medium text-brand-800 ring-1 ring-brand-200">
                        {project.key}
                      </span>
                      {canDeleteProject && (
                        <button
                          onClick={() => setShowDeleteModal(project)}
                          className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-700"
                          title="Delete project"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                {project.description && (
                  <p className="mb-4 line-clamp-3 text-sm text-gray-600">
                    {project.description}
                  </p>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">👤</span>
                    <span>Manager: {project.manager?.name}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">👥</span>
                    <span>{project.members?.length || 0} members</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
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
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700 ring-1 ring-brand-200"
                          title={member.name}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {project.members.length > 5 && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-500 ring-1 ring-gray-200">
                          +{project.members.length - 5}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-4 border-t border-gray-200 pt-4">
                  <Link
                    to={`/projects/${project._id}`}
                    className="inline-flex w-full items-center justify-center rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center">
          <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 ring-1 ring-red-200">
            <span className="text-2xl">⚠️</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Delete Project</h2>
            <p className="text-sm text-gray-600">This action cannot be undone</p>
          </div>
        </div>
        
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4">
          <h3 className="mb-2 font-medium text-red-800">
            "{project.name}" will be permanently deleted
          </h3>
          <div className="space-y-1 text-sm text-red-700">
            <p>• All tasks in this project will be deleted</p>
            <p>• All tickets will be deleted</p>
            <p>• All project messages will be deleted</p>
            <p>• {project.members?.length || 0} team members will be notified</p>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Type <strong>{expectedText}</strong> to confirm deletion:
          </label>
          <input
            type="text"
            className="w-full rounded-md border border-gray-300 shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
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
            className="flex-1 inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? (
              <div className="flex items-center justify-center">
                <div className="-ml-1 mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Deleting...
              </div>
            ) : (
              'Delete Project'
            )}
          </button>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 inline-flex items-center justify-center rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
        
        <p className="mt-3 text-center text-xs text-gray-500">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-screen overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">Create New Project</h2>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Project Name</label>
              <input
                type="text"
                required
                className="mt-1 w-full rounded-md border border-gray-300 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
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
                className="mt-1 w-full rounded-md border border-gray-300 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                value={newProject.key}
                onChange={(e) => setNewProject({...newProject, key: e.target.value.toUpperCase()})}
                placeholder="e.g., PROJ"
                maxLength="10"
              />
              <p className="mt-1 text-xs text-gray-500">
                Unique identifier (auto-generated from name)
              </p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              className="mt-1 w-full rounded-md border border-gray-300 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              rows="3"
              value={newProject.description}
              onChange={(e) => setNewProject({...newProject, description: e.target.value})}
              placeholder="Project description (optional)"
            />
          </div>
          
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Team Members ({newProject.members.length} selected)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Search users..."
                  className="text-xs rounded-md border border-gray-300 px-2 py-1 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                  className="text-xs rounded-md border border-gray-300 px-2 py-1 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
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
              <div className="mb-3 flex space-x-2">
                <button
                  type="button"
                  onClick={() => selectAllRole(selectedRole)}
                  className="text-xs rounded px-2 py-1 bg-blue-50 text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100"
                >
                  Select All {selectedRole}s
                </button>
                <button
                  type="button"
                  onClick={() => deselectAllRole(selectedRole)}
                  className="text-xs rounded px-2 py-1 bg-gray-50 text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
                >
                  Deselect All {selectedRole}s
                </button>
              </div>
            )}
            
            <div className="max-h-48 overflow-y-auto rounded-md border border-gray-200 p-3">
              {isLoadingUsers ? (
                <div className="py-4 text-center">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-brand-500/30 border-t-transparent"></div>
                </div>
              ) : getFilteredUsers().length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-500">
                  No users found
                  {searchTerm && ` matching "${searchTerm}"`}
                  {selectedRole !== 'all' && ` in ${selectedRole} role`}
                </p>
              ) : (
                <div className="space-y-2">
                  {getFilteredUsers().map((userOption) => (
                    <label key={userOption._id} className="flex items-center space-x-2 rounded p-2 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={newProject.members.includes(userOption._id)}
                        onChange={() => handleMemberToggle(userOption._id)}
                        className="rounded border-gray-300 focus:ring-brand-500/40"
                      />
                      <div className="flex flex-1 items-center space-x-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700 ring-1 ring-brand-200">
                          {userOption.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium">{userOption.name}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">{userOption.email}</span>
                            <span className={`rounded px-1 py-0.5 text-xs ${
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
            
            <p className="mt-2 text-xs text-gray-500">
              Note: You will automatically be added as a project member and manager
            </p>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={isCreating}
              className="flex-1 inline-flex items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Project'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 inline-flex items-center justify-center rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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