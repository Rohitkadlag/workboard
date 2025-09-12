import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { leaveAPI } from '../utils/api.js';

const LeaveApprovalsPage = () => {
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingRequests, setProcessingRequests] = useState(new Set());
  const [decisionNotes, setDecisionNotes] = useState({});

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await leaveAPI.getPending();
      setPendingRequests(response.data.requests || []);
    } catch (error) {
      console.error('Fetch pending requests error:', error);
      setError('Failed to load pending leave requests. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecision = async (requestId, decision) => {
    if (processingRequests.has(requestId)) return;

    try {
      setProcessingRequests(prev => new Set([...prev, requestId]));
      setError('');

      const note = decisionNotes[requestId] || '';
      await leaveAPI.makeDecision(requestId, decision, note);

      // Remove from pending list
      setPendingRequests(prev => prev.filter(req => req._id !== requestId));
      
      // Clear the note
      setDecisionNotes(prev => {
        const updated = { ...prev };
        delete updated[requestId];
        return updated;
      });

      // Show success message
      const message = `Leave request ${decision.toLowerCase()} successfully`;
      // You could add a toast notification here
      console.log(message);

    } catch (error) {
      console.error('Decision error:', error);
      setError(error.response?.data?.error || `Failed to ${decision.toLowerCase()} request`);
    } finally {
      setProcessingRequests(prev => {
        const updated = new Set(prev);
        updated.delete(requestId);
        return updated;
      });
    }
  };

  const handleNoteChange = (requestId, note) => {
    setDecisionNotes(prev => ({
      ...prev,
      [requestId]: note
    }));
  };

  const calculateLeaveDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate).toLocaleDateString();
    const end = new Date(endDate).toLocaleDateString();
    return `${start} - ${end}`;
  };

  const getConflictsHint = (request) => {
    if (request.aiDecision?.conflicts?.length > 0) {
      return request.aiDecision.conflicts.join(', ');
    }
    return 'No conflicts detected';
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-brand-50 to-white border border-brand-100 shadow-sm p-6 sm:p-8">
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-brand-100/50 blur-2xl" aria-hidden="true" />
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 mb-2">Leave Approvals</h1>
        <p className="text-gray-600">
          Review and approve pending leave requests from your team members
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <span className="inline-flex items-center rounded-full bg-white/70 px-3 py-1 ring-1 ring-gray-200">
            <span className="mr-2">👤</span>
            <span>Role: <strong>{user?.role}</strong></span>
          </span>
          <span className="inline-flex items-center rounded-full bg-white/70 px-3 py-1 ring-1 ring-gray-200">
            <span className="mr-2">📋</span>
            <span>Pending Requests: <strong>{pendingRequests.length}</strong></span>
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="text-sm font-medium text-red-700">{error}</div>
          <button
            onClick={fetchPendingRequests}
            className="mt-3 inline-flex items-center rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Pending Requests */}
      {pendingRequests.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <span className="mb-4 block text-6xl">✅</span>
          <h3 className="mb-2 text-lg font-medium text-gray-900">No Pending Requests</h3>
          <p className="text-gray-600">All leave requests have been processed.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Conflicts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {pendingRequests.map((request) => (
                  <tr key={request._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 ring-1 ring-brand-200">
                          <span className="text-sm font-medium text-brand-700">
                            {request.employee?.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {request.employee?.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {request.employee?.email}
                          </div>
                          <div className="text-xs text-gray-400">
                            Balance: {request.employee?.leaveBalance} days
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDateRange(request.startDate, request.endDate)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {calculateLeaveDays(request.startDate, request.endDate)} days
                      </div>
                      <div className="text-xs text-gray-400">
                        Requested: {new Date(request.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs truncate text-sm text-gray-900" title={request.reason}>
                        {request.reason}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs text-sm text-gray-600">
                        {getConflictsHint(request)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-3">
                        {/* Decision Note */}
                        <textarea
                          className="w-full rounded-md border border-gray-300 text-xs shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                          rows="2"
                          placeholder="Optional note for decision..."
                          value={decisionNotes[request._id] || ''}
                          onChange={(e) => handleNoteChange(request._id, e.target.value)}
                          maxLength={500}
                        />
                        
                        {/* Action Buttons */}
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleDecision(request._id, 'APPROVED')}
                            disabled={processingRequests.has(request._id)}
                            className="inline-flex items-center rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
                          >
                            {processingRequests.has(request._id) ? '...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleDecision(request._id, 'DENIED')}
                            disabled={processingRequests.has(request._id)}
                            className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                          >
                            {processingRequests.has(request._id) ? '...' : 'Deny'}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
        <h3 className="mb-3 font-semibold text-blue-900">Authorization Guidelines</h3>
        <div className="space-y-2 text-sm text-blue-800">
          {user?.role === 'ADMIN' ? (
            <p>As an ADMIN, you can approve or deny any leave request in the system.</p>
          ) : (
            <p>As a MANAGER, you can approve or deny leave requests from employees in projects you manage.</p>
          )}
          <p>• Add optional notes to provide context for your decisions</p>
          <p>• Approved requests will automatically deduct days from the employee's balance</p>
          <p>• Employees will receive real-time notifications of your decisions</p>
        </div>
      </div>
    </div>
  );
};

export default LeaveApprovalsPage;