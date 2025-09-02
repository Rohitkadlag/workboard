import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { leaveAPI } from '../utils/api.js';

const LeavePage = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error when user starts typing
    if (error) setError('');
  };

  const calculateLeaveDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    
    if (start > end) return 0;
    
    // Simple business days calculation (excluding weekends)
    let businessDays = 0;
    const current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
        businessDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return businessDays;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    // Validation
    if (!formData.startDate || !formData.endDate || !formData.reason.trim()) {
      setError('Please fill in all fields');
      return;
    }

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      setError('Start date cannot be in the past');
      return;
    }

    if (startDate >= endDate) {
      setError('End date must be after start date');
      return;
    }

    const leaveDays = calculateLeaveDays();
    if (leaveDays === 0) {
      setError('Invalid date range selected');
      return;
    }

    if (leaveDays > user?.leaveBalance) {
      setError(`Insufficient leave balance. You have ${user.leaveBalance} days available.`);
      return;
    }

    try {
      setIsSubmitting(true);
      
      const response = await leaveAPI.submit({
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason.trim(),
      });

      setResult(response.data);
      
      // Reset form on successful submission
      setFormData({
        startDate: '',
        endDate: '',
        reason: '',
      });

    } catch (error) {
      console.error('Leave submission error:', error);
      setError(error.response?.data?.error || 'Failed to submit leave request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const leaveDays = calculateLeaveDays();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Leave Request</h1>
        <p className="text-gray-600">
          Submit a leave request and get instant AI-powered decision processing
        </p>
        <div className="mt-4 flex items-center space-x-6 text-sm">
          <span className="flex items-center">
            <span className="mr-2">🏖️</span>
            <span>Available Balance: <strong>{user?.leaveBalance || 0} days</strong></span>
          </span>
          <span className="flex items-center">
            <span className="mr-2">👤</span>
            <span>Role: <strong>{user?.role}</strong></span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leave request form */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Submit Leave Request</h2>
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  required
                  className="form-input mt-1"
                  value={formData.startDate}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  required
                  className="form-input mt-1"
                  value={formData.endDate}
                  onChange={handleChange}
                  min={formData.startDate || new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {/* Duration display */}
            {leaveDays > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-800">
                    Duration: <strong>{leaveDays} business days</strong>
                  </span>
                  <span className={`text-sm ${
                    leaveDays <= user?.leaveBalance
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {leaveDays <= user?.leaveBalance
                      ? `✓ Within balance (${user.leaveBalance - leaveDays} remaining)`
                      : `⚠️ Exceeds balance by ${leaveDays - user.leaveBalance} days`
                    }
                  </span>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                Reason for Leave
              </label>
              <textarea
                id="reason"
                name="reason"
                rows="4"
                required
                className="form-textarea mt-1"
                placeholder="Please provide a detailed reason for your leave request..."
                value={formData.reason}
                onChange={handleChange}
                maxLength={500}
              />
              <p className="mt-1 text-xs text-gray-500">
                {formData.reason.length}/500 characters
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || leaveDays > (user?.leaveBalance || 0)}
              className="btn btn-primary w-full"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin -ml-1 mr-3 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  Processing with AI Agent...
                </div>
              ) : (
                'Submit Leave Request'
              )}
            </button>
          </form>
        </div>

        {/* AI Decision Result */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Agent Decision</h2>
          
          {!result ? (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">🤖</span>
              <p className="text-gray-500 mb-2">AI Leave Agent Ready</p>
              <p className="text-sm text-gray-400">
                Submit a leave request to see the AI-powered decision analysis
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Decision status */}
              <div className={`p-4 rounded-lg border-2 ${
                result.leave.status === 'APPROVED'
                  ? 'bg-green-50 border-green-200'
                  : result.leave.status === 'DENIED'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-center">
                  <span className="text-2xl mr-3">
                    {result.leave.status === 'APPROVED' ? '✅' : 
                     result.leave.status === 'DENIED' ? '❌' : '⏳'}
                  </span>
                  <div>
                    <h3 className={`font-bold text-lg ${
                      result.leave.status === 'APPROVED' ? 'text-green-800' :
                      result.leave.status === 'DENIED' ? 'text-red-800' : 'text-yellow-800'
                    }`}>
                      Request {result.leave.status}
                    </h3>
                    <p className={`text-sm ${
                      result.leave.status === 'APPROVED' ? 'text-green-700' :
                      result.leave.status === 'DENIED' ? 'text-red-700' : 'text-yellow-700'
                    }`}>
                      {new Date(result.leave.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* AI Analysis */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">AI Analysis & Rationale</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono overflow-x-auto">
                    {JSON.stringify(result.agent, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Leave request details */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Request Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Start Date:</span>
                    <p className="font-medium">{new Date(result.leave.startDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">End Date:</span>
                    <p className="font-medium">{new Date(result.leave.endDate).toLocaleDateString()}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Reason:</span>
                    <p className="font-medium mt-1">{result.leave.reason}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">How the AI Leave Agent Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
          <div className="flex items-start">
            <span className="mr-2">🔍</span>
            <div>
              <p className="font-medium">Analysis</p>
              <p>Reviews your workload, leave balance, and request details</p>
            </div>
          </div>
          <div className="flex items-start">
            <span className="mr-2">⚖️</span>
            <div>
              <p className="font-medium">Decision</p>
              <p>Applies company policies and considers business impact</p>
            </div>
          </div>
          <div className="flex items-start">
            <span className="mr-2">📋</span>
            <div>
              <p className="font-medium">Recommendations</p>
              <p>Provides actionable insights and next steps</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeavePage;