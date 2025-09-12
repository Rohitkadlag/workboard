import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ticketsAPI, usersAPI } from '../utils/api.js';
import { TICKET_STATUS, TICKET_PRIORITY, TICKET_TYPES, ROLES } from '@workboard/shared';

const TicketDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateData, setUpdateData] = useState({});

  useEffect(() => {
    fetchTicket();
  }, [id]);

  useEffect(() => {
    // Listen for ticket updates
    const handleTicketUpdate = (event) => {
      const update = event.detail;
      if (update.ticketId === id || update.ticket?._id === id) {
        if (update.action === 'comment_added') {
          // Add new comment to the list
          setTicket(prev => ({
            ...prev,
            comments: [...prev.comments, update.comment]
          }));
        } else if (update.action === 'updated') {
          // Update ticket data
          setTicket(prev => ({
            ...prev,
            ...update.ticket
          }));
        }
      }
    };

    window.addEventListener('ticketUpdate', handleTicketUpdate);
    return () => window.removeEventListener('ticketUpdate', handleTicketUpdate);
  }, [id]);

  const fetchTicket = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await ticketsAPI.getById(id);
      setTicket(response.data.ticket);
    } catch (error) {
      console.error('Fetch ticket error:', error);
      setError(error.response?.data?.error || 'Failed to load ticket');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;

    try {
      setIsAddingComment(true);
      const response = await ticketsAPI.addComment(id, newComment.trim());
      
      // Add comment to local state
      setTicket(prev => ({
        ...prev,
        comments: [...prev.comments, response.data.comment]
      }));
      
      setNewComment('');
    } catch (error) {
      console.error('Add comment error:', error);
      setError('Failed to add comment');
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleUpdateTicket = async () => {
    try {
      setIsUpdating(true);
      const response = await ticketsAPI.update(id, updateData);
      
      setTicket(response.data.ticket);
      setShowUpdateModal(false);
      setUpdateData({});
    } catch (error) {
      console.error('Update ticket error:', error);
      setError(error.response?.data?.error || 'Failed to update ticket');
    } finally {
      setIsUpdating(false);
    }
  };

  const canUpdateTicket = () => {
    if (!ticket || !user) return false;
    
    const isAdmin = user.role === ROLES.ADMIN;
    const isProjectManager = ticket.project?.manager?._id === user.id || 
                           ticket.project?.manager?.toString() === user.id;
    const isRaiser = ticket.raisedBy?._id === user.id;
    
    return isAdmin || isProjectManager || isRaiser;
  };

  const canAssignTicket = () => {
    if (!ticket || !user) return false;
    
    const isAdmin = user.role === ROLES.ADMIN;
    const isProjectManager = ticket.project?.manager?._id === user.id || 
                           ticket.project?.manager?.toString() === user.id;
    
    return isAdmin || isProjectManager;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case TICKET_STATUS.OPEN:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case TICKET_STATUS.IN_PROGRESS:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case TICKET_STATUS.RESOLVED:
        return 'bg-green-100 text-green-800 border-green-200';
      case TICKET_STATUS.CLOSED:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case TICKET_PRIORITY.CRITICAL:
        return 'bg-red-100 text-red-800 border-red-200';
      case TICKET_PRIORITY.HIGH:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case TICKET_PRIORITY.MEDIUM:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case TICKET_PRIORITY.LOW:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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

  if (error && !ticket) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-medium text-red-700">{error}</p>
          <Link to="/tickets" className="mt-3 inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Back to Tickets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-brand-50 to-white border border-brand-100 shadow-sm p-6 sm:p-8">
        <div className="mb-4 flex items-center space-x-3">
          <Link
            to="/tickets"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            ← Tickets
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-600">#{id.slice(-6)}</span>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-center space-x-3">
              <span className="text-2xl">{getTypeIcon(ticket?.type)}</span>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{ticket?.title}</h1>
            </div>

            <div className="mb-4 flex items-center space-x-4">
              <span className={`rounded-full border px-3 py-1 text-sm ${getStatusColor(ticket?.status)}`}>
                {ticket?.status?.replace('_', ' ')}
              </span>
              <span className={`rounded-full border px-3 py-1 text-sm ${getPriorityColor(ticket?.priority)}`}>
                {ticket?.priority} Priority
              </span>
              <span className="text-sm text-gray-500">
                Created {new Date(ticket?.createdAt).toLocaleDateString()}
              </span>
            </div>

            <p className="whitespace-pre-wrap text-gray-600">{ticket?.description}</p>
          </div>

          {canUpdateTicket() && (
            <button
              onClick={() => {
                setUpdateData({
                  status: ticket.status,
                  priority: ticket.priority,
                  title: ticket.title,
                  description: ticket.description,
                  assignedTo: ticket.assignedTo?._id || ''
                });
                setShowUpdateModal(true);
              }}
              className="inline-flex items-center rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content - Comments */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Comments ({ticket?.comments?.length || 0})
            </h3>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="mb-6">
              <textarea
                className="w-full rounded-md border border-gray-300 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                rows="3"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                maxLength={1000}
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {newComment.length}/1000 characters
                </span>
                <button
                  type="submit"
                  disabled={!newComment.trim() || isAddingComment}
                  className="inline-flex items-center rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
                >
                  {isAddingComment ? 'Adding...' : 'Add Comment'}
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-4">
              {ticket?.comments?.length === 0 ? (
                <div className="py-8 text-center">
                  <span className="mb-4 block text-4xl">💬</span>
                  <p className="text-gray-500">No comments yet</p>
                </div>
              ) : (
                ticket?.comments?.map((comment) => (
                  <div key={comment._id} className="rounded-lg border border-gray-100 p-4">
                    <div className="mb-2 flex items-center space-x-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-medium text-brand-700 ring-1 ring-brand-200">
                        {comment.author?.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          {comment.author?.name}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap pl-10 text-sm text-gray-700">
                      {comment.body}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Ticket Info */}
        <div className="space-y-6">
          {/* Details */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Details</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Project:</span>
                <Link 
                  to={`/projects/${ticket?.project?._id}`}
                  className="text-brand-600 hover:text-brand-700"
                >
                  {ticket?.project?.name}
                </Link>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium">{ticket?.type}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Raised by:</span>
                <div className="flex items-center space-x-1">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700 ring-1 ring-brand-200">
                    {ticket?.raisedBy?.name?.charAt(0).toUpperCase()}
                  </div>
                  <span>{ticket?.raisedBy?.name}</span>
                </div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Assigned to:</span>
                {ticket?.assignedTo ? (
                  <div className="flex items-center space-x-1">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700 ring-1 ring-brand-200">
                      {ticket.assignedTo.name.charAt(0).toUpperCase()}
                    </div>
                    <span>{ticket.assignedTo.name}</span>
                  </div>
                ) : (
                  <span className="text-gray-500">Unassigned</span>
                )}
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Watchers:</span>
                <span>{ticket?.watchers?.length || 0}</span>
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Activity</h3>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-2 text-sm">
                <div className="mt-2 h-2 w-2 rounded-full bg-blue-600"></div>
                <div>
                  <span className="text-gray-900">Ticket created by</span>
                  <span className="ml-1 font-medium">{ticket?.raisedBy?.name}</span>
                  <div className="text-xs text-gray-500">
                    {new Date(ticket?.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
              
              {ticket?.comments?.map((comment) => (
                <div key={comment._id} className="flex items-start space-x-2 text-sm">
                  <div className="mt-2 h-2 w-2 rounded-full bg-gray-400"></div>
                  <div>
                    <span className="text-gray-900">Comment by</span>
                    <span className="ml-1 font-medium">{comment.author?.name}</span>
                    <div className="text-xs text-gray-500">
                      {new Date(comment.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Update Modal */}
      {showUpdateModal && (
        <TicketUpdateModal
          ticket={ticket}
          updateData={updateData}
          setUpdateData={setUpdateData}
          onClose={() => setShowUpdateModal(false)}
          onUpdate={handleUpdateTicket}
          isUpdating={isUpdating}
          canAssign={canAssignTicket()}
        />
      )}
    </div>
  );
};

// Update Modal Component with Role-based Assignment
const TicketUpdateModal = ({ ticket, updateData, setUpdateData, onClose, onUpdate, isUpdating, canAssign }) => {
  const { user } = useAuth();
  const [projectMembers, setProjectMembers] = useState([]);
  const [membersByRole, setMembersByRole] = useState({});
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [selectedRole, setSelectedRole] = useState('all');
  
  const isRaiser = ticket?.raisedBy?._id === user?.id;

  useEffect(() => {
    if (ticket?.project?._id) {
      fetchProjectMembers();
    }
  }, [ticket]);

  const fetchProjectMembers = async () => {
    try {
      setIsLoadingMembers(true);
      const response = await usersAPI.getProjectMembers(ticket.project._id);
      setProjectMembers(response.data.members || []);
      setMembersByRole(response.data.membersByRole || {});
    } catch (error) {
      console.error('Fetch project members error:', error);
      // Fallback to existing project members if available
      setProjectMembers(ticket.project?.members || []);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const getFilteredMembers = () => {
    if (selectedRole === 'all') {
      return projectMembers;
    }
    return membersByRole[selectedRole] || [];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg max-h-screen overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">Update Ticket</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-gray-300 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              value={updateData.title || ''}
              onChange={(e) => setUpdateData({...updateData, title: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              className="mt-1 w-full rounded-md border border-gray-300 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              rows="4"
              value={updateData.description || ''}
              onChange={(e) => setUpdateData({...updateData, description: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                value={updateData.status || ticket.status}
                onChange={(e) => setUpdateData({...updateData, status: e.target.value})}
                disabled={isRaiser && updateData.status !== TICKET_STATUS.CLOSED}
              >
                {Object.values(TICKET_STATUS).map((status) => (
                  <option key={status} value={status} disabled={isRaiser && status !== TICKET_STATUS.CLOSED}>
                    {status.replace('_', ' ')}
                  </option>
                ))}
              </select>
              {isRaiser && (
                <p className="mt-1 text-xs text-gray-500">
                  You can only close your own tickets
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Priority</label>
              <select
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                value={updateData.priority || ticket.priority}
                onChange={(e) => setUpdateData({...updateData, priority: e.target.value})}
                disabled={!canAssign}
              >
                {Object.values(TICKET_PRIORITY).map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
              {!canAssign && (
                <p className="mt-1 text-xs text-gray-500">
                  Only managers and admins can change priority
                </p>
              )}
            </div>
          </div>

          {canAssign && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Assign to</label>
                {!isLoadingMembers && (
                  <select
                    className="text-xs rounded-md border border-gray-300 px-2 py-1 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                  >
                    <option value="all">All Roles</option>
                    <option value={ROLES.ADMIN}>Admins ({membersByRole[ROLES.ADMIN]?.length || 0})</option>
                    <option value={ROLES.MANAGER}>Managers ({membersByRole[ROLES.MANAGER]?.length || 0})</option>
                    <option value={ROLES.EMPLOYEE}>Employees ({membersByRole[ROLES.EMPLOYEE]?.length || 0})</option>
                  </select>
                )}
              </div>
              
              {isLoadingMembers ? (
                <div className="py-4 text-center">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-brand-500/30 border-t-transparent"></div>
                </div>
              ) : (
                <select
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  value={updateData.assignedTo || ticket.assignedTo?._id || ''}
                  onChange={(e) => setUpdateData({...updateData, assignedTo: e.target.value || null})}
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
              )}
              
              {/* Show current assignee info */}
              {updateData.assignedTo && (
                <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 p-2">
                  {projectMembers.find(m => m._id === updateData.assignedTo) && (
                    <div className="flex items-center space-x-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700 ring-1 ring-brand-200">
                        {projectMembers.find(m => m._id === updateData.assignedTo).name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-sm font-medium">
                          {projectMembers.find(m => m._id === updateData.assignedTo).name}
                        </span>
                        <span className={`ml-2 rounded px-1 py-0.5 text-xs ${
                          projectMembers.find(m => m._id === updateData.assignedTo).role === ROLES.ADMIN ? 'bg-red-100 text-red-700' :
                          projectMembers.find(m => m._id === updateData.assignedTo).role === ROLES.MANAGER ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {projectMembers.find(m => m._id === updateData.assignedTo).role}
                        </span>
                        {projectMembers.find(m => m._id === updateData.assignedTo).leaveBalance !== undefined && (
                          <div className="text-xs text-gray-500">
                            Leave balance: {projectMembers.find(m => m._id === updateData.assignedTo).leaveBalance} days
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="mt-6 flex space-x-3">
          <button
            onClick={onUpdate}
            disabled={isUpdating}
            className="flex-1 inline-flex items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
          >
            {isUpdating ? 'Updating...' : 'Update Ticket'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailPage;