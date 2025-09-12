import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projectsAPI, tasksAPI, usersAPI } from '../utils/api.js';
import { getSocket, joinProject, broadcastTaskUpdate } from '../utils/socket.js';
import { useAuth } from '../context/AuthContext.jsx';
import { TASK_STATUS, ROLES } from '@workboard/shared';
import ChatPanel from '../components/ChatPanel.jsx';

const ProjectBoard = () => {
  const { id: projectId } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(null);
  const [availableAssignees, setAvailableAssignees] = useState([]);
  const [assigneesByRole, setAssigneesByRole] = useState({});
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

  const canManageTasks = user?.role === ROLES.ADMIN || 
    (project && project.manager?._id === user?.id);

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
      
      // Fetch available assignees for this project
      fetchAvailableAssignees();
    } catch (error) {
      console.error('Fetch project data error:', error);
      setError(error.response?.data?.error || 'Failed to load project data.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableAssignees = async (startDate = null, endDate = null) => {
    try {
      const response = await usersAPI.getAvailableAssignees(projectId, startDate, endDate);
      setAvailableAssignees(response.data.assignees);
      setAssigneesByRole(response.data.assigneesByRole);
    } catch (error) {
      console.error('Fetch assignees error:', error);
      // Fallback to project members if API fails
      if (project?.members) {
        setAvailableAssignees(project.members);
      }
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

  const handleTaskAssignment = async (taskId, assignees) => {
    try {
      const response = await tasksAPI.updateAssignees(taskId, assignees);
      
      // Update local state
      setTasks(prev => prev.map(task => 
        task._id === taskId ? response.data.task : task
      ));

      // Close modal
      setShowAssignModal(null);

      // Broadcast to other users
      broadcastTaskUpdate(projectId, response.data.task);
    } catch (error) {
      console.error('Update task assignees error:', error);
      setError('Failed to update task assignees.');
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
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-500/30 border-t-transparent"></div>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-medium text-red-700">{error}</p>
          <Link to="/projects" className="mt-3 inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Project header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-brand-50 to-white border border-brand-100 shadow-sm p-6 sm:p-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-center space-x-3">
              <Link
                to="/projects"
                className="text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                ← Projects
              </Link>
              <span className="text-gray-300">/</span>
              <span className="rounded-md bg-brand-100 px-2 py-1 text-xs font-medium text-brand-800 ring-1 ring-brand-200">
                {project?.key}
              </span>
            </div>
            <h1 className="mb-2 text-2xl font-semibold tracking-tight text-gray-900">{project?.name}</h1>
            {project?.description && (
              <p className="mb-4 text-gray-600">{project.description}</p>
            )}
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <span>👤 Manager: {project?.manager?.name}</span>
              <span>👥 {project?.members?.length || 0} members</span>
              <span>📝 {tasks.length} tasks</span>
            </div>
          </div>
          
          <button
            onClick={() => {
              setShowCreateTask(true);
              fetchAvailableAssignees();
            }}
            className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
          >
            <span className="mr-2">+</span>
            Add Task
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      <div className="flex space-x-6">
        {/* Kanban board */}
        <div className="flex-1">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            {statusColumns.map((column) => (
              <div key={column.key} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{column.title}</h3>
                  <span className={`rounded-full px-2 py-1 text-xs ring-1 ring-inset ${column.color}`}>
                    {getTasksByStatus(column.key).length}
                  </span>
                </div>
                
                <div className="space-y-3">
                  {getTasksByStatus(column.key).map((task) => (
                    <div
                      key={task._id}
                      className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <h4 className="mb-1 text-sm font-medium text-gray-900">
                          {task.title}
                        </h4>
                        {canManageTasks && (
                          <button
                            onClick={() => setShowAssignModal(task._id)}
                            className="rounded px-1 py-0.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-brand-600"
                            title="Assign task"
                          >
                            👤
                          </button>
                        )}
                      </div>
                      
                      {task.description && (
                        <p className="mb-3 line-clamp-2 text-xs text-gray-600">
                          {task.description}
                        </p>
                      )}
                      
                      <div className="mb-3 flex items-center justify-between">
                        {task.points > 0 && (
                          <span className="rounded px-2 py-1 text-xs ring-1 ring-inset bg-blue-50 text-blue-800 ring-blue-200">
                            {task.points} pts
                          </span>
                        )}
                        
                        {task.dueDate && (
                          <span className={`rounded px-2 py-1 text-xs ring-1 ring-inset ${
                            isOverdue(task.dueDate)
                              ? 'bg-red-50 text-red-800 ring-red-200'
                              : 'bg-gray-50 text-gray-700 ring-gray-200'
                          }`}>
                            {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                      
                      {/* Task assignees */}
                      {task.assignees?.length > 0 && (
                        <div className="mb-3 flex items-center space-x-1">
                          {task.assignees.slice(0, 3).map((assignee) => (
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
                      
                      {/* Status change buttons */}
                      <div className="flex flex-wrap gap-1">
                        {statusColumns.map((statusOption) => (
                          <button
                            key={statusOption.key}
                            onClick={() => handleTaskStatusChange(task._id, statusOption.key)}
                            disabled={task.status === statusOption.key}
                            className={`rounded px-2 py-1 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40 ${
                              task.status === statusOption.key
                                ? 'cursor-not-allowed bg-gray-200 text-gray-500'
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
                    <div className="py-8 text-center">
                      <p className="text-sm text-gray-400">No tasks</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat panel */}
        <div className="w-80">
          <div className="h-96 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
            <ChatPanel projectId={projectId} />
          </div>
        </div>
      </div>

      {/* Task Assignment Modal */}
      {showAssignModal && (
        <TaskAssignModal
          task={tasks.find(t => t._id === showAssignModal)}
          project={project}
          onClose={() => setShowAssignModal(null)}
          onAssign={handleTaskAssignment}
        />
      )}

      {/* Create task modal */}
      {showCreateTask && (
        <CreateTaskModal
          newTask={newTask}
          setNewTask={setNewTask}
          project={project}
          availableAssignees={availableAssignees}
          assigneesByRole={assigneesByRole}
          onClose={() => {
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
          onSubmit={handleCreateTask}
          onDateRangeChange={fetchAvailableAssignees}
          isCreating={isCreatingTask}
        />
      )}
    </div>
  );
};

// Task Assignment Modal Component
const TaskAssignModal = ({ task, project, onClose, onAssign }) => {
  const [selectedAssignees, setSelectedAssignees] = useState(
    task?.assignees?.map(a => a._id) || []
  );
  const [availableUsers, setAvailableUsers] = useState([]);
  const [usersByRole, setUsersByRole] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAvailableUsers();
  }, [task]);

  const fetchAvailableUsers = async () => {
    try {
      setIsLoading(true);
      const response = await usersAPI.getAvailableAssignees(
        project._id, 
        task?.dueDate ? task.dueDate : null, 
        task?.dueDate ? task.dueDate : null
      );
      setAvailableUsers(response.data.assignees);
      setUsersByRole(response.data.assigneesByRole);
    } catch (error) {
      console.error('Fetch available users error:', error);
      // Fallback to project members
      setAvailableUsers(project?.members || []);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = () => {
    onAssign(task._id, selectedAssignees);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-500/30 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md max-h-96 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold">Assign Task: {task?.title}</h3>
        
        <div className="space-y-4">
          {Object.entries(usersByRole).map(([role, users]) => (
            users.length > 0 && (
              <div key={role}>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  {role}s ({users.length})
                </h4>
                <div className="space-y-2 border-l-2 border-gray-200 pl-4">
                  {users.map((member) => (
                    <label key={member.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedAssignees.includes(member.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAssignees(prev => [...prev, member.id]);
                          } else {
                            setSelectedAssignees(prev => prev.filter(id => id !== member.id));
                          }
                        }}
                        className="rounded border-gray-300 focus:ring-brand-500/40"
                      />
                      <div className="flex items-center space-x-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700 ring-1 ring-brand-200">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-sm">{member.name}</span>
                          <div className="text-xs text-gray-500">{member.email}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
        
        <div className="mt-6 flex space-x-3">
          <button onClick={handleAssign} className="flex-1 inline-flex items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700">
            Assign ({selectedAssignees.length})
          </button>
          <button onClick={onClose} className="flex-1 inline-flex items-center justify-center rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Create Task Modal Component
const CreateTaskModal = ({ 
  newTask, 
  setNewTask, 
  project, 
  availableAssignees,
  assigneesByRole,
  onClose, 
  onSubmit, 
  onDateRangeChange,
  isCreating 
}) => {
  const [selectedRole, setSelectedRole] = useState('all');

  const handleDateChange = (field, value) => {
    const updatedTask = { ...newTask, [field]: value };
    setNewTask(updatedTask);
    
    // Fetch updated assignees when date changes
    if (updatedTask.dueDate) {
      onDateRangeChange(updatedTask.dueDate, updatedTask.dueDate);
    }
  };

  const getDisplayUsers = () => {
    if (selectedRole === 'all') {
      return availableAssignees;
    }
    return assigneesByRole[selectedRole] || [];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg max-h-screen overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">Create New Task</h2>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              required
              className="mt-1 w-full rounded-md border border-gray-300 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              value={newTask.title}
              onChange={(e) => setNewTask({...newTask, title: e.target.value})}
              placeholder="Enter task title"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              className="mt-1 w-full rounded-md border border-gray-300 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
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
                className="mt-1 w-full rounded-md border border-gray-300 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                value={newTask.dueDate}
                onChange={(e) => handleDateChange('dueDate', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Story Points</label>
              <input
                type="number"
                min="0"
                max="100"
                className="mt-1 w-full rounded-md border border-gray-300 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                value={newTask.points}
                onChange={(e) => setNewTask({...newTask, points: e.target.value})}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Assignees</label>
              <select
                className="text-xs rounded-md border border-gray-300 px-2 py-1 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value={ROLES.ADMIN}>Admins ({assigneesByRole[ROLES.ADMIN]?.length || 0})</option>
                <option value={ROLES.MANAGER}>Managers ({assigneesByRole[ROLES.MANAGER]?.length || 0})</option>
                <option value={ROLES.EMPLOYEE}>Employees ({assigneesByRole[ROLES.EMPLOYEE]?.length || 0})</option>
              </select>
            </div>
            
            <div className="max-h-32 space-y-2 overflow-y-auto rounded-md border border-gray-200 p-2">
              {getDisplayUsers().length === 0 ? (
                <p className="py-2 text-center text-sm text-gray-500">
                  No available assignees
                  {newTask.dueDate && " for selected date"}
                </p>
              ) : (
                getDisplayUsers().map((member) => (
                  <label key={member.id || member._id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newTask.assignees.includes(member.id || member._id)}
                      onChange={(e) => {
                        const memberId = member.id || member._id;
                        if (e.target.checked) {
                          setNewTask(prev => ({
                            ...prev,
                            assignees: [...prev.assignees, memberId]
                          }));
                        } else {
                          setNewTask(prev => ({
                            ...prev,
                            assignees: prev.assignees.filter(id => id !== memberId)
                          }));
                        }
                      }}
                      className="rounded border-gray-300 focus:ring-brand-500/40"
                    />
                    <div className="flex flex-1 items-center space-x-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700 ring-1 ring-brand-200">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm">{member.name}</span>
                        <span className={`ml-2 rounded px-1 py-0.5 text-xs ${
                          member.role === ROLES.ADMIN ? 'bg-red-100 text-red-700' :
                          member.role === ROLES.MANAGER ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {member.role}
                        </span>
                        {member.leaveBalance !== undefined && (
                          <div className="text-xs text-gray-500">
                            Leave: {member.leaveBalance} days
                          </div>
                        )}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
            
            {newTask.dueDate && (
              <p className="mt-1 text-xs text-blue-600">
                ℹ️ Showing users available on {new Date(newTask.dueDate).toLocaleDateString()}
              </p>
            )}
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={isCreating}
              className="flex-1 inline-flex items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Task'}
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

export default ProjectBoard;