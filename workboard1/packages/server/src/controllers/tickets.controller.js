import Ticket from '../models/Ticket.js';
import Project from '../models/Project.js';
import logger from '../config/logger.js';
import { ROLES, TICKET_STATUS, TICKET_TYPES, TICKET_PRIORITY } from '@workboard/shared';

export const createTicket = async (req, res) => {
  try {
    const { project: projectId, title, description, type = 'OTHER', priority = 'MEDIUM' } = req.body;

    if (!projectId || !title || !description) {
      return res.status(400).json({
        error: 'Project ID, title, and description are required'
      });
    }

    // Verify user has access to project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const hasAccess = req.user.role === ROLES.ADMIN ||
      project.manager.toString() === req.user._id.toString() ||
      project.members.includes(req.user._id);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    // Validate type and priority
    if (!Object.values(TICKET_TYPES).includes(type)) {
      return res.status(400).json({ error: 'Invalid ticket type' });
    }

    if (!Object.values(TICKET_PRIORITY).includes(priority)) {
      return res.status(400).json({ error: 'Invalid ticket priority' });
    }

    const ticket = new Ticket({
      project: projectId,
      raisedBy: req.user._id,
      title: title.trim(),
      description: description.trim(),
      type,
      priority,
      watchers: [req.user._id] // Auto-add raiser as watcher
    });

    await ticket.save();
    await ticket.populate([
      { path: 'raisedBy', select: 'name email role' },
      { path: 'assignedTo', select: 'name email role' },
      { path: 'project', select: 'name key' },
      { path: 'watchers', select: 'name email' },
      { path: 'comments.author', select: 'name email' }
    ]);

    // Emit real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${projectId}`).emit('ticket:update', {
        action: 'created',
        ticket: ticket
      });
    }

    logger.info('Ticket created:', { ticketId: ticket._id, project: projectId, raisedBy: req.user._id });

    res.status(201).json({
      message: 'Ticket created successfully',
      ticket
    });

  } catch (error) {
    logger.error('Create ticket error:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
};

export const getTickets = async (req, res) => {
  try {
    const { project: projectId, status, priority, assignedTo, type } = req.query;

    let query = {};
    
    if (projectId) {
      // Verify user has access to project
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const hasAccess = req.user.role === ROLES.ADMIN ||
        project.manager.toString() === req.user._id.toString() ||
        project.members.includes(req.user._id);

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this project' });
      }

      query.project = projectId;
    } else {
      // If no project specified, only show tickets from projects user has access to
      const accessibleProjects = await Project.find({
        $or: [
          { manager: req.user._id },
          { members: req.user._id }
        ]
      }).select('_id');
      
      query.project = { $in: accessibleProjects.map(p => p._id) };
    }

    // Apply filters
    if (status && Object.values(TICKET_STATUS).includes(status)) {
      query.status = status;
    }
    if (priority && Object.values(TICKET_PRIORITY).includes(priority)) {
      query.priority = priority;
    }
    if (type && Object.values(TICKET_TYPES).includes(type)) {
      query.type = type;
    }
    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    const tickets = await Ticket.find(query)
      .populate('raisedBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('project', 'name key')
      .populate('watchers', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      tickets,
      total: tickets.length
    });

  } catch (error) {
    logger.error('Get tickets error:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
};

export const getTicket = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await Ticket.findById(id)
      .populate('raisedBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('project', 'name key')
      .populate('watchers', 'name email')
      .populate('comments.author', 'name email');

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Verify user has access to the project
    const project = await Project.findById(ticket.project._id);
    const hasAccess = req.user.role === ROLES.ADMIN ||
      project.manager.toString() === req.user._id.toString() ||
      project.members.includes(req.user._id);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this ticket' });
    }

    res.json({ ticket });

  } catch (error) {
    logger.error('Get ticket error:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
};

export const updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedTo, priority, title, description } = req.body;

    const ticket = await Ticket.findById(id).populate('project');
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check permissions
    const project = ticket.project;
    const isProjectManager = project.manager.toString() === req.user._id.toString();
    const isAdmin = req.user.role === ROLES.ADMIN;
    const isRaiser = ticket.raisedBy.toString() === req.user._id.toString();

    // Only admin, project manager, or raiser can update tickets
    // Raiser can only close their own tickets
    if (!isAdmin && !isProjectManager && !isRaiser) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = {};
    
    // Status updates
    if (status && Object.values(TICKET_STATUS).includes(status)) {
      if (isRaiser && status !== TICKET_STATUS.CLOSED) {
        return res.status(403).json({ error: 'You can only close your own tickets' });
      }
      if (!isAdmin && !isProjectManager && status !== TICKET_STATUS.CLOSED) {
        return res.status(403).json({ error: 'Only managers and admins can change ticket status' });
      }
      updates.status = status;
    }

    // Assignment updates (admin/manager only)
    if (assignedTo !== undefined) {
      if (!isAdmin && !isProjectManager) {
        return res.status(403).json({ error: 'Only managers and admins can assign tickets' });
      }
      
      if (assignedTo) {
        // Verify assignee is a project member
        if (!project.members.includes(assignedTo)) {
          return res.status(400).json({ error: 'Assignee must be a project member' });
        }
      }
      updates.assignedTo = assignedTo || null;
    }

    // Priority updates (admin/manager only)
    if (priority && Object.values(TICKET_PRIORITY).includes(priority)) {
      if (!isAdmin && !isProjectManager) {
        return res.status(403).json({ error: 'Only managers and admins can change priority' });
      }
      updates.priority = priority;
    }

    // Title/description updates (admin/manager/raiser)
    if (title && title.trim()) {
      updates.title = title.trim();
    }
    if (description && description.trim()) {
      updates.description = description.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    Object.assign(ticket, updates);
    await ticket.save();
    
    await ticket.populate([
      { path: 'raisedBy', select: 'name email role' },
      { path: 'assignedTo', select: 'name email role' },
      { path: 'project', select: 'name key' },
      { path: 'watchers', select: 'name email' }
    ]);

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${project._id}`).emit('ticket:update', {
        action: 'updated',
        ticket: ticket,
        updatedBy: req.user.name
      });
    }

    logger.info('Ticket updated:', { ticketId: id, updates, updatedBy: req.user._id });

    res.json({
      message: 'Ticket updated successfully',
      ticket
    });

  } catch (error) {
    logger.error('Update ticket error:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
};

export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Comment body is required' });
    }

    const ticket = await Ticket.findById(id).populate('project');
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Verify user has access to project
    const project = ticket.project;
    const hasAccess = req.user.role === ROLES.ADMIN ||
      project.manager.toString() === req.user._id.toString() ||
      project.members.includes(req.user._id);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const comment = {
      author: req.user._id,
      body: body.trim(),
      createdAt: new Date()
    };

    ticket.comments.push(comment);
    
    // Add commenter to watchers if not already watching
    if (!ticket.watchers.includes(req.user._id)) {
      ticket.watchers.push(req.user._id);
    }

    await ticket.save();
    
    await ticket.populate([
      { path: 'comments.author', select: 'name email' },
      { path: 'project', select: 'name key' }
    ]);

    // Get the newly added comment with populated author
    const newComment = ticket.comments[ticket.comments.length - 1];

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${project._id}`).emit('ticket:update', {
        action: 'comment_added',
        ticketId: ticket._id,
        comment: newComment
      });
    }

    logger.info('Comment added to ticket:', { ticketId: id, commentBy: req.user._id });

    res.status(201).json({
      message: 'Comment added successfully',
      comment: newComment
    });

  } catch (error) {
    logger.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};