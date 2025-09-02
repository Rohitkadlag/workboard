import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ticketsAPI } from '../utils/api.js';
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
    const isProjectManager = ticket.project?.manager === user.id;
    const isRaiser = ticket.raisedBy?._id === user.id;
    
    return isAdmin || isProjectManager || isRaiser;
  };

  const canAssignTicket = () => {
    if (!ticket || !user) return false;
    
    const isAdmin = user.role === ROLES.ADMIN;
    const isProjectManager = ticket.project?.manager === user.id;
    
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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 max-w-md mx-auto">
          <p className="text-red-700">{error}</p>
          <Link to="/tickets" className="btn btn-outline btn-sm mt-4">
            Back to Tickets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Link
            to="/tickets"
            className="text-brand-600 hover:text-brand-700 text-sm font-medium"
          >
            ← Tickets
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-600 text-sm">#{id.slice(-6)}</span>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-2xl">{getTypeIcon(ticket?.type)}</span>
              <h1 className="text-2xl font-bold text-gray-900">{ticket?.title}</h1>
            </div>

            <div className="flex items-center space-x-4 mb-4">
              <span className={`px-3 py-1 text-sm rounded-full border ${getStatusColor(ticket?.status)}`}>
                {ticket?.status?.replace('_', ' ')}
              </span>
              <span className={`px-3 py-1 text-sm rounded-full border ${getPriorityColor(ticket?.priority)}`}>
                {ticket?.priority} Priority
              </span>
              <span className="text-sm text-gray-500">
                Created {new Date(ticket?.createdAt).toLocaleDateString()}
              </span>
            </div>

            <p className="text-gray-600 whitespace-pre-wrap">{ticket?.description}</p>
          </div>

          {canUpdateTicket() && (
            <button
              onClick={() => {
                setUpdateData({
                  status: ticket.status,
                  priority: ticket.priority,
                  title: ticket.title,
                  description: ticket.description
                });
                setShowUpdateModal(true);
              }}
              className="btn btn-outline btn-sm"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Comments */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Comments ({ticket?.comments?.length || 0})
            </h3>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="mb-6">
              <textarea
                className="form-textarea w-full"
                rows="3"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                maxLength={1000}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">
                  {newComment.length}/1000 characters
                </span>
                <button
                  type="submit"
                  disabled={!newComment.trim() || isAddingComment}
                  className="btn btn-primary btn-sm"
                >
                  {isAddingComment ? 'Adding...' : 'Add Comment'}
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-4">
              {ticket?.comments?.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-4xl mb-4 block">💬</span>
                  <p className="text-gray-500">No comments yet</p>
                </div>
              ) : (
                ticket?.comments?.map((comment) => (
                  <div key={comment._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-sm font-medium text-brand-700">
                        {comment.author?.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          {comment.author?.name}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap pl-10">
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
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Details</h3>
            
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
                  <div className="w-5 h-5 bg-brand-100 rounded-full flex items-center justify-center text-xs font-medium text-brand-700">
                    {ticket?.raisedBy?.name?.charAt(0).toUpperCase()}
                  </div>
                  <span>{ticket?.raisedBy?.name}</span>
                </div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Assigned to:</span>
                {ticket?.assignedTo ? (
                  <div className="flex items-center space-x-1">
                    <div className="w-5 h-5 bg-brand-100 rounded-full flex items-center justify-center text-xs font-medium text-brand-700">
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
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity</h3>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-2 text-sm">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <div>
                  <span className="text-gray-900">Ticket created by</span>
                  <span className="font-medium ml-1">{ticket?.raisedBy?.name}</span>
                  <div className="text-gray-500 text-xs">
                    {new Date(ticket?.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
              
              {ticket?.comments?.map((comment) => (
                <div key={comment._id} className="flex items-start space-x-2 text-sm">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mt-2"></div>
                  <div>
                    <span className="text-gray-900">Comment by</span>
                    <span className="font-medium ml-1">{comment.author?.name}</span>
                    <div className="text-gray-500 text-xs">
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

// Update Modal Component
const TicketUpdateModal = ({ ticket, updateData, setUpdateData, onClose, onUpdate, isUpdating, canAssign }) => {
  const { user } = useAuth();
  const isRaiser = ticket?.raisedBy?._id === user?.id;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-screen overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Update Ticket</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              className="form-input mt-1"
              value={updateData.title || ''}
              onChange={(e) => setUpdateData({...updateData, title: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              className="form-textarea mt-1"
              rows="4"
              value={updateData.description || ''}
              onChange={(e) => setUpdateData({...updateData, description: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                className="form-select mt-1"
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
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Priority</label>
              <select
                className="form-select mt-1"
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
            </div>
          </div>

          {canAssign && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Assign to</label>
              <select
                className="form-select mt-1"
                value={updateData.assignedTo || ticket.assignedTo?._id || ''}
                onChange={(e) => setUpdateData({...updateData, assignedTo: e.target.value || null})}
              >
                <option value="">Unassigned</option>
                {ticket.project?.members?.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        <div className="flex space-x-3 mt-6">
          <button
            onClick={onUpdate}
            disabled={isUpdating}
            className="btn btn-primary flex-1"
          >
            {isUpdating ? 'Updating...' : 'Update Ticket'}
          </button>
          <button
            onClick={onClose}
            className="btn btn-secondary flex-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailPage;