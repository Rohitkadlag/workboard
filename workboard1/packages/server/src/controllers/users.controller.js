import User from '../models/User.js';
import Project from '../models/Project.js';
import logger from '../config/logger.js';
import { ROLES } from '@workboard/shared';

export const getUsers = async (req, res) => {
  try {
    const { role, project, search, includeCurrentUser = 'true' } = req.query;

    let query = {};
    
    // Role filtering
    if (role && Object.values(ROLES).includes(role)) {
      query.role = role;
    }

    // Exclude current user if specified
    if (includeCurrentUser === 'false') {
      query._id = { $ne: req.user._id };
    }

    // Project-specific filtering
    if (project) {
      const projectDoc = await Project.findById(project);
      if (!projectDoc) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Verify user has access to this project
      const hasAccess = req.user.role === ROLES.ADMIN ||
        projectDoc.manager.toString() === req.user._id.toString() ||
        projectDoc.members.includes(req.user._id);

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this project' });
      }

      // Filter users to only project members
      query._id = { 
        ...query._id,
        $in: projectDoc.members 
      };
    }

    // Search by name or email
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex }
      ];
    }

    const users = await User.find(query)
      .select('-passwordHash -__v')
      .sort({ name: 1 });

    // Group by role for easier frontend handling
    const usersByRole = {
      [ROLES.ADMIN]: [],
      [ROLES.MANAGER]: [],
      [ROLES.EMPLOYEE]: []
    };

    users.forEach(user => {
      if (usersByRole[user.role]) {
        usersByRole[user.role].push(user);
      }
    });

    res.json({
      users,
      usersByRole,
      total: users.length
    });

  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const getProjectMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, excludeCurrentUser = 'false' } = req.query;

    const project = await Project.findById(id).populate('members', '-passwordHash -__v');
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify user has access to this project
    const hasAccess = req.user.role === ROLES.ADMIN ||
      project.manager.toString() === req.user._id.toString() ||
      project.members.some(member => member._id.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    let members = project.members;

    // Filter by role if specified
    if (role && Object.values(ROLES).includes(role)) {
      members = members.filter(member => member.role === role);
    }

    // Exclude current user if specified
    if (excludeCurrentUser === 'true') {
      members = members.filter(member => member._id.toString() !== req.user._id.toString());
    }

    // Group by role
    const membersByRole = {
      [ROLES.ADMIN]: [],
      [ROLES.MANAGER]: [],
      [ROLES.EMPLOYEE]: []
    };

    members.forEach(member => {
      if (membersByRole[member.role]) {
        membersByRole[member.role].push(member);
      }
    });

    res.json({
      project: {
        id: project._id,
        name: project.name,
        key: project.key
      },
      members,
      membersByRole,
      total: members.length
    });

  } catch (error) {
    logger.error('Get project members error:', error);
    res.status(500).json({ error: 'Failed to fetch project members' });
  }
};

export const getUsersByRole = async (req, res) => {
  try {
    const { roles } = req.query; // Comma-separated list of roles
    
    let query = {};
    
    if (roles) {
      const requestedRoles = roles.split(',').filter(role => Object.values(ROLES).includes(role));
      if (requestedRoles.length > 0) {
        query.role = { $in: requestedRoles };
      }
    }

    // Only include active users (you might want to add an active field to User model)
    const users = await User.find(query)
      .select('name email role leaveBalance')
      .sort({ role: 1, name: 1 });

    // Group by role for easier frontend consumption
    const groupedUsers = {};
    Object.values(ROLES).forEach(role => {
      groupedUsers[role] = users.filter(user => user.role === role);
    });

    res.json({
      users,
      groupedUsers,
      total: users.length,
      breakdown: {
        [ROLES.ADMIN]: groupedUsers[ROLES.ADMIN].length,
        [ROLES.MANAGER]: groupedUsers[ROLES.MANAGER].length,
        [ROLES.EMPLOYEE]: groupedUsers[ROLES.EMPLOYEE].length
      }
    });

  } catch (error) {
    logger.error('Get users by role error:', error);
    res.status(500).json({ error: 'Failed to fetch users by role' });
  }
};

export const getAvailableAssignees = async (req, res) => {
  try {
    const { project: projectId, startDate, endDate } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const project = await Project.findById(projectId).populate('members', '-passwordHash -__v');
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify user has access to this project
    const hasAccess = req.user.role === ROLES.ADMIN ||
      project.manager.toString() === req.user._id.toString() ||
      project.members.some(member => member._id.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    let availableMembers = project.members;

    // If date range provided, filter out users on approved leave
    if (startDate && endDate) {
      const LeaveRequest = (await import('../models/LeaveRequest.js')).default;
      const { LEAVE_STATUS } = await import('@workboard/shared');
      
      const usersOnLeave = await LeaveRequest.find({
        status: LEAVE_STATUS.APPROVED,
        startDate: { $lte: new Date(endDate) },
        endDate: { $gte: new Date(startDate) }
      }).distinct('employee');

      availableMembers = project.members.filter(member => 
        !usersOnLeave.some(onLeaveId => onLeaveId.toString() === member._id.toString())
      );
    }

    // Group by role
    const assigneesByRole = {
      [ROLES.ADMIN]: [],
      [ROLES.MANAGER]: [],
      [ROLES.EMPLOYEE]: []
    };

    availableMembers.forEach(member => {
      if (assigneesByRole[member.role]) {
        assigneesByRole[member.role].push({
          id: member._id,
          name: member.name,
          email: member.email,
          role: member.role,
          leaveBalance: member.leaveBalance
        });
      }
    });

    res.json({
      project: {
        id: project._id,
        name: project.name,
        key: project.key
      },
      assignees: availableMembers.map(member => ({
        id: member._id,
        name: member.name,
        email: member.email,
        role: member.role,
        leaveBalance: member.leaveBalance
      })),
      assigneesByRole,
      total: availableMembers.length,
      dateRange: startDate && endDate ? { startDate, endDate } : null
    });

  } catch (error) {
    logger.error('Get available assignees error:', error);
    res.status(500).json({ error: 'Failed to fetch available assignees' });
  }
};