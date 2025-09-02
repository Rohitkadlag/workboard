import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projectsAPI, tasksAPI } from '../utils/api.js';
import { getSocket, joinProject, broadcastTaskUpdate } from '../utils/socket.js';
import { useAuth } from '../context/AuthContext.jsx';
import { TASK_STATUS } from '@workboard/shared';
import ChatPanel from '../components/ChatPanel.jsx';

const ProjectBoard = () => {
  const { id: projectId } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignees: [],
    dueDate: '',
    points: 0,
  });
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const statusColumns = [
    { key: TASK_STATUS.BACKLOG, title: 'Backlog', color: 'bg-gray-100 text-gray-800' },
    { key: TASK_STATUS.TODO, title: 'To Do', color: 'bg-blue-100 text-blue-800' },
    { key: TASK_STATUS.IN_PROGRESS, title: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
    { key: TASK_STATUS.REVIEW, title: 'Review', color: 'bg-purple-100 text-purple-800' },
    { key: TASK_STATUS.DONE, title: 'Done', color: 'bg-green-100 text-green-800' },
  ];

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  useEffect(() => {
    // Set up socket listeners for real-time updates
    const socket = getSocket();
    if (socket && projectId) {
      joinProject(projectId);

      const handleTaskUpdate = (data) => {
        if (data.projectId === projectId) {
          // Refresh tasks when someone else updates a task
          fetchTasks();
        }
      };

      socket.on('task:updated', handleTaskUpdate);

      return () => {
        socket.off('task:updated', handleTaskUpdate);
      };
    }
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setIsLoading(true);
      setError('');

      const [projectResponse, tasksResponse] = await Promise.all([
        projectsAPI.getById(projectId),
        tasksAPI.getByProject(projectId),
      ]);

      setProject(projectResponse.data.project);
      setTasks(tasksResponse.data.tasks || []);
    } catch (error) {
      console.error('Fetch project data error:', error);
      setError(error.response?.data?.error || 'Failed to load project data.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await tasksAPI.getByProject(projectId);
      setTasks(response.data.tasks || []);
    } catch (error) {
      console.error('Fetch tasks error:', error);
    }
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      const response = await tasksAPI.updateStatus(taskId, newStatus);
      
      // Update local state
      setTasks(prev => prev.map(task => 
        task._id === taskId ? response.data.task : task
      ));

      // Broadcast to other users
      broadcastTaskUpdate(projectId, response.data.task);
    } catch (error) {
      console.error('Update task status error:', error);
      setError('Failed to update task status.');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    
    if (!newTask.title.trim()) {
      setError('Task title is required');
      return;
    }

    try {
      setIsCreatingTask(true);
      setError('');

      const taskData = {
        project: projectId,
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        assignees: newTask.assignees,
        dueDate: newTask.dueDate || null,
        points: parseInt(newTask.points) || 0,
      };

      const response = await tasksAPI.create(taskData);
      
      // Add to local state
      setTasks(prev => [...prev, response.data.task]);
      
      // Broadcast to other users
      broadcastTaskUpdate(projectId, response.data.task);
      
      // Reset form
      setNewTask({
        title: '',
        description: '',
        assignees: [],
        dueDate: '',
        points: 0,
      });
      setShowCreateTask(false);
    } catch (error) {
      console.error('Create task error:', error);
      setError(error.response?.data?.error || 'Failed to create task.');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status);
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString();
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 max-w-md mx-auto">
          <p className="text-red-700">{error}</p>
          <Link to="/projects" className="btn btn-outline btn-sm mt-4">
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <Link
                to="/projects"
                className="text-brand-600 hover:text-brand-700 text-sm font-medium"
              >
                ← Projects
              </Link>
              <span className="text-gray-300">/</span>
              <span className="px-2 py-1 bg-brand-100 text-brand-800 text-xs font-medium rounded-md">
                {project?.key}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{project?.name}</h1>
            {project?.description && (
              <p className="text-gray-600 mb-4">{project.description}</p>
            )}
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <span>👤 Manager: {project?.manager?.name}</span>
              <span>👥 {project?.members?.length || 0} members</span>
              <span>📝 {tasks.length} tasks</span>
            </div>
          </div>
          
          <button
            onClick={() => setShowCreateTask(true)}
            className="btn btn-primary"
          >
            <span className="mr-2">+</span>
            Add Task
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="flex space-x-6">
        {/* Kanban board */}
        <div className="flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {statusColumns.map((column) => (
              <div key={column.key} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">{column.title}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${column.color}`}>
                    {getTasksByStatus(column.key).length}
                  </span>
                </div>
                
                <div className="space-y-3">
                  {getTasksByStatus(column.key).map((task) => (
                    <div
                      key={task._id}
                      className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <h4 className="font-medium text-gray-900 text-sm mb-2">
                        {task.title}
                      </h4>
                      
                      {task.description && (
                        <p className="text-gray-600 text-xs mb-3 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between mb-3">
                        {task.points > 0 && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {task.points} pts
                          </span>
                        )}
                        
                        {task.dueDate && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            isOverdue(task.dueDate)
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                      
                      {/* Task assignees */}
                      {task.assignees?.length > 0 && (
                        <div className="flex items-center space-x-1 mb-3">
                          {task.assignees.slice(0, 3).map((assignee) => (
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
                      
                      {/* Status change buttons (simplified drag-n-drop) */}
                      <div className="flex space-x-1">
                        {statusColumns.map((statusOption) => (
                          <button
                            key={statusOption.key}
                            onClick={() => handleTaskStatusChange(task._id, statusOption.key)}
                            disabled={task.status === statusOption.key}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              task.status === statusOption.key
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            title={`Move to ${statusOption.title}`}
                          >
                            {statusOption.title.charAt(0)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {getTasksByStatus(column.key).length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-400 text-sm">No tasks</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat panel */}
        <div className="w-80">
          <div className="h-96">
            <ChatPanel projectId={projectId} />
          </div>
        </div>
      </div>

      {/* Create task modal */}
      {showCreateTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-screen overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Create New Task</h2>
            
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  required
                  className="form-input mt-1"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  placeholder="Enter task title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  className="form-textarea mt-1"
                  rows="3"
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  placeholder="Task description (optional)"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Due Date</label>
                  <input
                    type="date"
                    className="form-input mt-1"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Story Points</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="form-input mt-1"
                    value={newTask.points}
                    onChange={(e) => setNewTask({...newTask, points: e.target.value})}
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={isCreatingTask}
                  className="btn btn-primary flex-1"
                >
                  {isCreatingTask ? 'Creating...' : 'Create Task'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateTask(false);
                    setNewTask({
                      title: '',
                      description: '',
                      assignees: [],
                      dueDate: '',
                      points: 0,
                    });
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
    </div>
  );
};

export default ProjectBoard;