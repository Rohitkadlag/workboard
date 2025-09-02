import LeaveRequest from '../models/LeaveRequest.js';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import leaveAgent from '../services/leaveAgent.js';
import logger from '../config/logger.js';
import { LEAVE_STATUS, ROLES } from '@workboard/shared';

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
      aiDecision,
      history: [{
        by: req.user._id,
        action: 'CREATED',
        note: `Leave request submitted for ${start.toDateString()} to ${end.toDateString()}`
      }]
    });

    await leaveRequest.save();
    await leaveRequest.populate([
      { path: 'employee', select: 'name email role leaveBalance' },
      { path: 'decidedBy', select: 'name email role' }
    ]);

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
    if (req.user.role === ROLES.EMPLOYEE) {
      query.employee = req.user._id;
    }
    // Managers and admins can see all requests

    const requests = await LeaveRequest.find(query)
      .populate('employee', 'name email role')
      .populate('decidedBy', 'name email role')
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

export const getPendingLeaveRequests = async (req, res) => {
  try {
    let query = { status: LEAVE_STATUS.PENDING };

    // ADMIN can see all pending requests
    if (req.user.role === ROLES.ADMIN) {
      // No additional filters
    } else if (req.user.role === ROLES.MANAGER) {
      // MANAGER can only see pending requests from employees in projects they manage
      const managedProjects = await Project.find({ manager: req.user._id }).select('members');
      const managedEmployees = new Set();
      
      managedProjects.forEach(project => {
        project.members.forEach(member => {
          managedEmployees.add(member.toString());
        });
      });

      if (managedEmployees.size === 0) {
        return res.json({ requests: [], total: 0 });
      }

      query.employee = { $in: Array.from(managedEmployees) };
    } else {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const requests = await LeaveRequest.find(query)
      .populate('employee', 'name email role leaveBalance')
      .populate('decidedBy', 'name email role')
      .sort({ createdAt: -1 });

    res.json({
      requests,
      total: requests.length
    });
  } catch (error) {
    logger.error('Get pending leave requests error:', error);
    res.status(500).json({ error: 'Failed to fetch pending leave requests' });
  }
};

export const decideLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, note } = req.body;

    if (!['APPROVED', 'DENIED'].includes(decision)) {
      return res.status(400).json({
        error: 'Decision must be APPROVED or DENIED'
      });
    }

    const leaveRequest = await LeaveRequest.findById(id).populate('employee');
    if (!leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    if (leaveRequest.status !== LEAVE_STATUS.PENDING) {
      return res.status(400).json({ error: 'Leave request is not pending' });
    }

    // Check authorization
    let canDecide = false;
    if (req.user.role === ROLES.ADMIN) {
      canDecide = true;
    } else if (req.user.role === ROLES.MANAGER) {
      // Check if manager manages any project that includes this employee
      const managedProjects = await Project.find({ 
        manager: req.user._id,
        members: leaveRequest.employee._id
      });
      canDecide = managedProjects.length > 0;
    }

    if (!canDecide) {
      return res.status(403).json({ error: 'You cannot decide on this leave request' });
    }

    // Update leave request
    leaveRequest.status = decision;
    leaveRequest.decisionNote = note;
    leaveRequest.decidedBy = req.user._id;
    leaveRequest.decidedAt = new Date();
    
    leaveRequest.history.push({
      by: req.user._id,
      action: decision,
      note: note || `Leave request ${decision.toLowerCase()}`
    });

    await leaveRequest.save();
    
    // If approved, update employee's leave balance
    if (decision === 'APPROVED') {
      const daysRequested = leaveAgent.calculateLeaveDays(
        leaveRequest.startDate, 
        leaveRequest.endDate
      );
      
      leaveRequest.employee.leaveBalance = Math.max(0, leaveRequest.employee.leaveBalance - daysRequested);
      await leaveRequest.employee.save();
    }

    await leaveRequest.populate('decidedBy', 'name email role');

    // Emit realtime notification to employee
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${leaveRequest.employee._id}`).emit('leave:decision', {
        id: leaveRequest._id,
        status: decision,
        note: note,
        decidedBy: req.user.name,
        decidedAt: leaveRequest.decidedAt
      });

      // Also emit to project rooms where employee is a member
      const employeeProjects = await Project.find({ members: leaveRequest.employee._id });
      employeeProjects.forEach(project => {
        io.to(`project:${project._id}`).emit('leave:decision', {
          id: leaveRequest._id,
          employee: leaveRequest.employee.name,
          status: decision,
          decidedBy: req.user.name
        });
      });
    }

    logger.info('Leave request decision made:', {
      requestId: id,
      decision,
      decidedBy: req.user._id,
      employee: leaveRequest.employee._id
    });

    res.json({
      message: `Leave request ${decision.toLowerCase()}`,
      leave: leaveRequest
    });

  } catch (error) {
    logger.error('Decide leave request error:', error);
    res.status(500).json({ error: 'Failed to process decision' });
  }
};

export const getAISuggestions = async (req, res) => {
  try {
    const { preferredStart, preferredEnd, horizonDays = 45 } = req.body;
    
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + horizonDays);

    // Get user's projects
    const userProjects = await Project.find({
      $or: [
        { manager: req.user._id },
        { members: req.user._id }
      ]
    }).populate('members', 'name email');

    // Get teammates and their approved/pending leaves
    const teammateIds = new Set();
    userProjects.forEach(project => {
      project.members.forEach(member => {
        if (member._id.toString() !== req.user._id.toString()) {
          teammateIds.add(member._id.toString());
        }
      });
    });

    const overlappingLeaves = await LeaveRequest.find({
      employee: { $in: Array.from(teammateIds) },
      status: { $in: [LEAVE_STATUS.APPROVED, LEAVE_STATUS.PENDING] },
      endDate: { $gte: new Date() },
      startDate: { $lte: horizon }
    }).populate('employee', 'name');

    // Get tasks due within horizon for user's projects
    const projectIds = userProjects.map(p => p._id);
    const upcomingTasks = await Task.find({
      project: { $in: projectIds },
      dueDate: { $gte: new Date(), $lte: horizon },
      status: { $ne: 'DONE' }
    }).populate('project', 'name key');

    // Build context for AI
    const context = {
      employee: {
        name: req.user.name,
        role: req.user.role,
        leaveBalance: req.user.leaveBalance
      },
      preferences: {
        preferredStart,
        preferredEnd
      },
      policy: {
        maxConsecutiveDays: 14,
        minNoticeDays: 2,
        minCoverage: 0.6,
        horizonDays
      },
      teammates: Array.from(teammateIds).length,
      overlappingLeaves: overlappingLeaves.map(leave => ({
        employee: leave.employee.name,
        startDate: leave.startDate.toISOString().split('T')[0],
        endDate: leave.endDate.toISOString().split('T')[0],
        status: leave.status
      })),
      upcomingTasks: upcomingTasks.map(task => ({
        title: task.title,
        project: task.project.name,
        dueDate: task.dueDate.toISOString().split('T')[0]
      }))
    };

    const suggestions = await leaveAgent.getSuggestions(context);

    res.json({ suggestions });

  } catch (error) {
    logger.error('Get AI suggestions error:', error);
    res.status(500).json({ error: 'Failed to get AI suggestions' });
  }
};