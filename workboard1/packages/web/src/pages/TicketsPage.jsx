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
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">Tickets</h1>
          <p className="mt-1 text-gray-600">Track issues, requests, and project tickets</p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        >
          <span className="mr-2">+</span>
          Create Ticket
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="text-sm font-medium text-red-700">{error}</div>
          <button
            onClick={fetchData}
            className="mt-3 inline-flex items-center rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          <button
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear all
          </button>
        </div>
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Project</label>
            <select
              className="w-full rounded-md border border-gray-300 px-2 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
            <select
              className="w-full rounded-md border border-gray-300 px-2 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Priority</label>
            <select
              className="w-full rounded-md border border-gray-300 px-2 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
            <select
              className="w-full rounded-md border border-gray-300 px-2 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
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
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <span className="mb-4 block text-6xl">🎫</span>
          <h3 className="mb-2 text-lg font-medium text-gray-900">No tickets found</h3>
          <p className="mb-6 text-gray-600">
            Create your first ticket to track issues and requests
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
          >
            Create Ticket
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Ticket
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Assigned
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {tickets.map((ticket) => (
                  <tr key={ticket._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link
                        to={`/tickets/${ticket._id}`}
                        className="block hover:text-brand-600"
                      >
                        <div className="flex items-start space-x-3">
                          <span className="mt-0.5 text-xl">{getTypeIcon(ticket.type)}</span>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {ticket.title}
                            </div>
                            <div className="max-w-xs truncate text-sm text-gray-500">
                              {ticket.description}
                            </div>
                            {ticket.comments?.length > 0 && (
                              <div className="mt-1 text-xs text-gray-400">
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
                      <span className={`rounded-full px-2 py-1 text-xs ring-1 ring-inset ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`rounded-full px-2 py-1 text-xs ring-1 ring-inset ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {ticket.assignedTo ? (
                        <div className="flex items-center">
                          <div className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700 ring-1 ring-brand-200">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg max-h-screen overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">Create New Ticket</h2>
        
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Project *</label>
            <select
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
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
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
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
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
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
              className="mt-1 w-full rounded-md border border-gray-300 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Brief summary of the issue or request"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Description *</label>
            <textarea
              required
              className="mt-1 w-full rounded-md border border-gray-300 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
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
                <div className="py-4 text-center">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-brand-500/30 border-t-transparent"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  <select
                    className="w-full rounded-md border border-gray-300 px-2 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
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
                    <div className="rounded-md border border-blue-200 bg-blue-50 p-2">
                      {projectMembers.find(m => m._id === formData.assignedTo) && (
                        <div className="flex items-center space-x-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700 ring-1 ring-brand-200">
                            {projectMembers.find(m => m._id === formData.assignedTo).name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm font-medium">
                              {projectMembers.find(m => m._id === formData.assignedTo).name}
                            </span>
                            <span className={`ml-2 rounded px-1 py-0.5 text-xs ${
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
              className="flex-1 inline-flex items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Ticket'}
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

export default TicketsPage;