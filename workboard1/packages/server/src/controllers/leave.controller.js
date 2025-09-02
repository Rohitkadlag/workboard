import LeaveRequest from '../models/LeaveRequest.js';
import Task from '../models/Task.js';
import leaveAgent from '../services/leaveAgent.js';
import logger from '../config/logger.js';
import { LEAVE_STATUS } from '@workboard/shared';

export const submitLeaveRequest = async (req, res) => {
  try {
    const { startDate, endDate, reason } = req.body;

    if (!startDate || !endDate || !reason) {
      return res.status(400).json({
        error: 'Start date, end date, and reason are required'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({
        error: 'End date must be after start date'
      });
    }

    if (start < new Date()) {
      return res.status(400).json({
        error: 'Start date cannot be in the past'
      });
    }

    // Get employee's current tasks during the requested period
    const workload = await Task.find({
      assignees: req.user._id,
      dueDate: {
        $gte: start,
        $lte: end
      }
    }).populate('project', 'name key');

    // Process with AI agent
    logger.info('Processing leave request with AI agent:', { 
      employee: req.user._id, 
      startDate, 
      endDate,
      workloadTasks: workload.length
    });

    const aiDecision = await leaveAgent.processLeaveRequest(
      req.user,
      { startDate, endDate, reason },
      workload
    );

    // Create leave request
    const leaveRequest = new LeaveRequest({
      employee: req.user._id,
      startDate: start,
      endDate: end,
      reason,
      status: aiDecision.decision === 'APPROVED' ? LEAVE_STATUS.APPROVED :
              aiDecision.decision === 'DENIED' ? LEAVE_STATUS.DENIED :
              LEAVE_STATUS.PENDING,
      aiDecision
    });

    await leaveRequest.save();
    await leaveRequest.populate('employee', 'name email role leaveBalance');

    // If approved, update leave balance
    if (leaveRequest.status === LEAVE_STATUS.APPROVED) {
      const daysRequested = leaveAgent.calculateLeaveDays(startDate, endDate);
      req.user.leaveBalance = Math.max(0, req.user.leaveBalance - daysRequested);
      await req.user.save();
      
      logger.info('Leave approved and balance updated:', {
        employee: req.user._id,
        daysDeducted: daysRequested,
        newBalance: req.user.leaveBalance
      });
    }

    logger.info('Leave request processed:', { 
      requestId: leaveRequest._id, 
      decision: aiDecision.decision,
      status: leaveRequest.status
    });

    res.status(201).json({
      message: 'Leave request submitted and processed',
      leave: leaveRequest,
      agent: aiDecision
    });

  } catch (error) {
    logger.error('Submit leave request error:', error);
    res.status(500).json({ error: 'Failed to process leave request' });
  }
};

export const getLeaveRequests = async (req, res) => {
  try {
    let query = {};
    
    // Employees can only see their own requests
    if (req.user.role === 'EMPLOYEE') {
      query.employee = req.user._id;
    }
    // Managers and admins can see all requests

    const requests = await LeaveRequest.find(query)
      .populate('employee', 'name email role')
      .sort({ createdAt: -1 });

    res.json({
      requests,
      total: requests.length
    });
  } catch (error) {
    logger.error('Get leave requests error:', error);
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
};