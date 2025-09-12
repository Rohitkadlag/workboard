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
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-500/30 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Welcome section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-brand-50 to-white border border-brand-100 shadow-sm p-6 sm:p-8">
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-brand-100/50 blur-2xl" aria-hidden="true" />
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
          Welcome back, {user?.name}! 👋
        </h1>
        <p className="mt-2 text-gray-600">
          Here's an overview of your projects and tasks.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="text-sm font-medium text-red-700">{error}</div>
          <button
            onClick={fetchDashboardData}
            className="mt-3 inline-flex items-center rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="group relative rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 ring-1 ring-brand-200">
              <span className="text-2xl">📋</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Projects</p>
              <p className="text-2xl font-bold tracking-tight text-gray-900">{stats.totalProjects}</p>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-transparent transition group-hover:ring-brand-200" />
        </div>

        <div className="group relative rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-50 ring-1 ring-yellow-200">
              <span className="text-2xl">⚡</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Tasks</p>
              <p className="text-2xl font-bold tracking-tight text-gray-900">{stats.activeTasks}</p>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-transparent transition group-hover:ring-yellow-200" />
        </div>

        <div className="group relative rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 ring-1 ring-green-200">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed Tasks</p>
              <p className="text-2xl font-bold tracking-tight text-gray-900">{stats.completedTasks}</p>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-transparent transition group-hover:ring-green-200" />
        </div>
      </div>

      {/* Recent projects and tasks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Projects */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-gray-900">Your Projects</h2>
            <Link
              to="/projects"
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              View all →
            </Link>
          </div>
          
          {projects.length === 0 ? (
            <div className="py-10 text-center">
              <span className="mb-3 block text-4xl">📋</span>
              <p className="mb-4 text-sm text-gray-500">No projects yet</p>
              {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                <Link to="/projects" className="inline-flex items-center rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700">
                  Create Project
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
              {projects.slice(0, 5).map((project) => (
                <Link
                  key={project._id}
                  to={`/projects/${project._id}`}
                  className="block p-4 hover:bg-brand-50/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{project.name}</h3>
                      <p className="text-sm text-gray-500">
                        {project.key} • Manager: {project.manager?.name}
                      </p>
                    </div>
                    <div className="text-xs font-medium text-gray-500">
                      {project.members?.length || 0} members
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent tasks */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-gray-900">Recent Tasks</h2>
            <Link
              to="/projects"
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              View all →
            </Link>
          </div>
          
          {recentTasks.length === 0 ? (
            <div className="py-10 text-center">
              <span className="mb-3 block text-4xl">📝</span>
              <p className="text-sm text-gray-500">No tasks yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTasks.map((task) => (
                <div
                  key={task._id}
                  className="rounded-lg border border-gray-100 p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
                      <p className="mt-1 text-xs text-gray-500">
                        {task.projectName}
                        {task.dueDate && (
                          <span className="ml-2">
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ring-1 ring-inset ${getStatusColor(task.status)}`}>
                      {formatStatus(task.status)}
                    </span>
                  </div>
                  {task.assignees?.length > 0 && (
                    <div className="mt-3 flex items-center space-x-1">
                      {task.assignees.slice(0, 3).map((assignee, index) => (
                        <div
                          key={assignee._id}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700 ring-1 ring-brand-200"
                          title={assignee.name}
                        >
                          {assignee.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {task.assignees.length > 3 && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-500 ring-1 ring-gray-200">
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
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-gray-900">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
            <Link
              to="/projects"
              className="flex items-center rounded-lg border border-gray-100 p-4 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50"
            >
              <div className="mr-3 rounded-lg bg-brand-100 p-2 ring-1 ring-brand-200">
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
            className="flex items-center rounded-lg border border-gray-100 p-4 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50"
          >
            <div className="mr-3 rounded-lg bg-green-100 p-2 ring-1 ring-green-200">
              <span className="text-xl">🏖️</span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Request Leave</h3>
              <p className="text-sm text-gray-500">Submit a leave request</p>
            </div>
          </Link>
          
          <Link
            to="/projects"
            className="flex items-center rounded-lg border border-gray-100 p-4 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50"
          >
            <div className="mr-3 rounded-lg bg-purple-100 p-2 ring-1 ring-purple-200">
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

