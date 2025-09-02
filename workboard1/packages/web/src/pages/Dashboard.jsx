import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { projectsAPI, tasksAPI } from '../utils/api.js';

const Dashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeTasks: 0,
    completedTasks: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Fetch projects
      const projectsResponse = await projectsAPI.getAll();
      const userProjects = projectsResponse.data.projects || [];
      setProjects(userProjects);

      // Fetch tasks for all user projects
      let allTasks = [];
      for (const project of userProjects) {
        try {
          const tasksResponse = await tasksAPI.getByProject(project._id);
          const projectTasks = tasksResponse.data.tasks || [];
          allTasks = [...allTasks, ...projectTasks.map(task => ({ ...task, projectName: project.name }))];
        } catch (taskError) {
          console.warn(`Failed to fetch tasks for project ${project._id}:`, taskError);
        }
      }

      // Filter tasks assigned to current user or show all if admin/manager
      const userTasks = user.role === 'ADMIN' || user.role === 'MANAGER'
        ? allTasks
        : allTasks.filter(task => 
            task.assignees?.some(assignee => assignee._id === user.id)
          );

      // Sort by creation date and take recent 10
      const sortedTasks = userTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRecentTasks(sortedTasks.slice(0, 10));

      // Calculate stats
      const activeTasks = userTasks.filter(task => 
        task.status !== 'DONE'
      ).length;
      
      const completedTasks = userTasks.filter(task => 
        task.status === 'DONE'
      ).length;

      setStats({
        totalProjects: userProjects.length,
        activeTasks,
        completedTasks,
      });

    } catch (error) {
      console.error('Dashboard fetch error:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'BACKLOG':
        return 'bg-gray-100 text-gray-800';
      case 'TODO':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'REVIEW':
        return 'bg-purple-100 text-purple-800';
      case 'DONE':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status) => {
    return status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name}! 👋
        </h1>
        <p className="mt-1 text-gray-600">
          Here's an overview of your projects and tasks.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-sm text-red-700">{error}</div>
          <button
            onClick={fetchDashboardData}
            className="mt-2 btn btn-sm btn-outline"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-brand-100 rounded-lg">
              <span className="text-2xl">📋</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalProjects}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">⚡</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeTasks}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedTasks}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent projects and tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Projects</h2>
            <Link
              to="/projects"
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              View all →
            </Link>
          </div>
          
          {projects.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-4 block">📋</span>
              <p className="text-gray-500 mb-4">No projects yet</p>
              {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                <Link to="/projects" className="btn btn-primary btn-sm">
                  Create Project
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {projects.slice(0, 5).map((project) => (
                <Link
                  key={project._id}
                  to={`/projects/${project._id}`}
                  className="block p-3 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{project.name}</h3>
                      <p className="text-sm text-gray-500">
                        {project.key} • Manager: {project.manager?.name}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400">
                      {project.members?.length || 0} members
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent tasks */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Tasks</h2>
            <Link
              to="/projects"
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              View all →
            </Link>
          </div>
          
          {recentTasks.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-4 block">📝</span>
              <p className="text-gray-500">No tasks yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTasks.map((task) => (
                <div
                  key={task._id}
                  className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {task.projectName}
                        {task.dueDate && (
                          <span className="ml-2">
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                      {formatStatus(task.status)}
                    </span>
                  </div>
                  {task.assignees?.length > 0 && (
                    <div className="mt-2 flex items-center space-x-1">
                      {task.assignees.slice(0, 3).map((assignee, index) => (
                        <div
                          key={assignee._id}
                          className="w-6 h-6 bg-brand-100 rounded-full flex items-center justify-center text-xs font-medium text-brand-700"
                          title={assignee.name}
                        >
                          {assignee.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {task.assignees.length > 3 && (
                        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs text-gray-500">
                          +{task.assignees.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
            <Link
              to="/projects"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-brand-300 hover:bg-brand-50 transition-colors"
            >
              <div className="p-2 bg-brand-100 rounded-lg mr-3">
                <span className="text-xl">➕</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Create Project</h3>
                <p className="text-sm text-gray-500">Start a new project</p>
              </div>
            </Link>
          )}
          
          <Link
            to="/leave"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-brand-300 hover:bg-brand-50 transition-colors"
          >
            <div className="p-2 bg-green-100 rounded-lg mr-3">
              <span className="text-xl">🏖️</span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Request Leave</h3>
              <p className="text-sm text-gray-500">Submit a leave request</p>
            </div>
          </Link>
          
          <Link
            to="/projects"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-brand-300 hover:bg-brand-50 transition-colors"
          >
            <div className="p-2 bg-purple-100 rounded-lg mr-3">
              <span className="text-xl">📊</span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">View Projects</h3>
              <p className="text-sm text-gray-500">Browse all projects</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;