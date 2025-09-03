import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ticketsAPI, projectsAPI, usersAPI } from '../utils/api.js';
import { TICKET_TYPES, TICKET_PRIORITY, TICKET_STATUS, ROLES } from '@workboard/shared';

const TicketsPage = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({
    project: '',
    status: '',
    priority: '',
    type: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [filters]);

  useEffect(() => {
    // Listen for ticket updates
    const handleTicketUpdate = (event) => {
      const update = event.detail;
      console.log('Ticket update received:', update);
      
      if (update.action === 'created') {
        setTickets(prev => [update.ticket, ...prev]);
      } else if (update.action === 'updated') {
        setTickets(prev => prev.map(ticket => 
          ticket._id === update.ticket._id ? update.ticket : ticket
        ));
      } else if (update.action === 'comment_added') {
        fetchTickets(); // Refresh to get latest comment count
      }
    };

    window.addEventListener('ticketUpdate', handleTicketUpdate);
    return () => window.removeEventListener('ticketUpdate', handleTicketUpdate);
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const [ticketsResponse, projectsResponse] = await Promise.all([
        ticketsAPI.getAll(filters),
        projectsAPI.getAll()
      ]);

      setTickets(ticketsResponse.data.tickets || []);
      setProjects(projectsResponse.data.projects || []);
    } catch (error) {
      console.error('Fetch data error:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTickets = async () => {
    try {
      const response = await ticketsAPI.getAll(filters);
      setTickets(response.data.tickets || []);
    } catch (error) {
      console.error('Fetch tickets error:', error);
      setError('Failed to load tickets. Please try again.');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      project: '',
      status: '',
      priority: '',
      type: ''
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case TICKET_STATUS.OPEN:
        return 'bg-blue-100 text-blue-800';
      case TICKET_STATUS.IN_PROGRESS:
        return 'bg-yellow-100 text-yellow-800';
      case TICKET_STATUS.RESOLVED:
        return 'bg-green-100 text-green-800';
      case TICKET_STATUS.CLOSED:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case TICKET_PRIORITY.CRITICAL:
        return 'bg-red-100 text-red-800';
      case TICKET_PRIORITY.HIGH:
        return 'bg-orange-100 text-orange-800';
      case TICKET_PRIORITY.MEDIUM:
        return 'bg-yellow-100 text-yellow-800';
      case TICKET_PRIORITY.LOW:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case TICKET_TYPES.BUG:
        return '🐛';
      case TICKET_TYPES.REQUEST:
        return '💡';
      case TICKET_TYPES.ACCESS:
        return '🔐';
      case TICKET_TYPES.OTHER:
        return '📋';
      default:
        return '📋';
    }
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
          <p className="text-gray-600">Track issues, requests, and project tickets</p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <span className="mr-2">+</span>
          Create Ticket
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-sm text-red-700">{error}</div>
          <button
            onClick={fetchData}
            className="mt-2 btn btn-sm btn-outline"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          <button
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear all
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select
              className="form-select"
              value={filters.project}
              onChange={(e) => handleFilterChange('project', e.target.value)}
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name} ({project.key})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="form-select"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Statuses</option>
              {Object.values(TICKET_STATUS).map((status) => (
                <option key={status} value={status}>
                  {status.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              className="form-select"
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
            >
              <option value="">All Priorities</option>
              {Object.values(TICKET_PRIORITY).map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              className="form-select"
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="">All Types</option>
              {Object.values(TICKET_TYPES).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      {tickets.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">🎫</span>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
          <p className="text-gray-600 mb-6">
            Create your first ticket to track issues and requests
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            Create Ticket
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tickets.map((ticket) => (
                  <tr key={ticket._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link
                        to={`/tickets/${ticket._id}`}
                        className="block hover:text-brand-600"
                      >
                        <div className="flex items-start space-x-3">
                          <span className="text-xl mt-0.5">{getTypeIcon(ticket.type)}</span>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {ticket.title}
                            </div>
                            <div className="text-sm text-gray-500 max-w-xs truncate">
                              {ticket.description}
                            </div>
                            {ticket.comments?.length > 0 && (
                              <div className="text-xs text-gray-400 mt-1">
                                💬 {ticket.comments.length} comments
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {ticket.project?.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {ticket.project?.key}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {ticket.assignedTo ? (
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-brand-100 rounded-full flex items-center justify-center text-xs font-medium text-brand-700 mr-2">
                            {ticket.assignedTo.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-gray-900">
                            {ticket.assignedTo.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        by {ticket.raisedBy?.name}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <CreateTicketModal
          projects={projects}
          onClose={() => setShowCreateModal(false)}
          onCreate={(newTicket) => {
            setTickets(prev => [newTicket, ...prev]);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
};

// Create Ticket Modal Component with Role-based Assignment
const CreateTicketModal = ({ projects, onClose, onCreate }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    project: '',
    title: '',
    description: '',
    type: TICKET_TYPES.OTHER,
    priority: TICKET_PRIORITY.MEDIUM,
    assignedTo: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [projectMembers, setProjectMembers] = useState([]);
  const [membersByRole, setMembersByRole] = useState({});
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  useEffect(() => {
    if (formData.project) {
      fetchProjectMembers();
    } else {
      setProjectMembers([]);
      setMembersByRole({});
    }
  }, [formData.project]);

  const fetchProjectMembers = async () => {
    try {
      setIsLoadingMembers(true);
      const response = await usersAPI.getProjectMembers(formData.project);
      setProjectMembers(response.data.members || []);
      setMembersByRole(response.data.membersByRole || {});
    } catch (error) {
      console.error('Fetch project members error:', error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.project || !formData.title || !formData.description) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      
      const response = await ticketsAPI.create(formData);
      onCreate(response.data.ticket);
      
    } catch (error) {
      console.error('Create ticket error:', error);
      setError(error.response?.data?.error || 'Failed to create ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-screen overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Create New Ticket</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Project *</label>
            <select
              required
              className="form-select mt-1"
              value={formData.project}
              onChange={(e) => setFormData({...formData, project: e.target.value, assignedTo: ''})}
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name} ({project.key})
                </option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select
                className="form-select mt-1"
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
              >
                {Object.values(TICKET_TYPES).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Priority</label>
              <select
                className="form-select mt-1"
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
              >
                {Object.values(TICKET_PRIORITY).map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Title *</label>
            <input
              type="text"
              required
              className="form-input mt-1"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Brief summary of the issue or request"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Description *</label>
            <textarea
              required
              className="form-textarea mt-1"
              rows="4"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Detailed description of the ticket..."
            />
          </div>

          {/* Assignment section */}
          {formData.project && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign to (Optional)
              </label>
              
              {isLoadingMembers ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600 mx-auto"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  <select
                    className="form-select"
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
                  >
                    <option value="">Unassigned</option>
                    {Object.entries(membersByRole).map(([role, users]) => (
                      users.length > 0 && (
                        <optgroup key={role} label={`${role}s (${users.length})`}>
                          {users.map((member) => (
                            <option key={member._id} value={member._id}>
                              {member.name} - {member.email}
                            </option>
                          ))}
                        </optgroup>
                      )
                    ))}
                  </select>
                  
                  {/* Show assignee info */}
                  {formData.assignedTo && (
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                      {projectMembers.find(m => m._id === formData.assignedTo) && (
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-brand-100 rounded-full flex items-center justify-center text-xs font-medium text-brand-700">
                            {projectMembers.find(m => m._id === formData.assignedTo).name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm font-medium">
                              {projectMembers.find(m => m._id === formData.assignedTo).name}
                            </span>
                            <span className={`ml-2 px-1 py-0.5 text-xs rounded ${
                              projectMembers.find(m => m._id === formData.assignedTo).role === ROLES.ADMIN ? 'bg-red-100 text-red-700' :
                              projectMembers.find(m => m._id === formData.assignedTo).role === ROLES.MANAGER ? 'bg-blue-100 text-blue-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {projectMembers.find(m => m._id === formData.assignedTo).role}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary flex-1"
            >
              {isSubmitting ? 'Creating...' : 'Create Ticket'}
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

export default TicketsPage;