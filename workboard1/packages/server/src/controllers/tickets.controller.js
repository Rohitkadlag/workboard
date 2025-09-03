import Ticket from '../models/Ticket.js';
import Project from '../models/Project.js';
import logger from '../config/logger.js';
import { ROLES, TICKET_STATUS, TICKET_TYPES, TICKET_PRIORITY } from '@workboard/shared';

export const createTicket = async (req, res) => {
  try {
    const { project: projectId, title, description, type = 'OTHER', priority = 'MEDIUM', assignedTo } = req.body;

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

    // Validate assignedTo if provided
    if (assignedTo && !project.members.includes(assignedTo)) {
      return res.status(400).json({ error: 'Assignee must be a project member' });
    }

    const ticket = new Ticket({
      project: projectId,
      raisedBy: req.user._id,
      title: title.trim(),
      description: description.trim(),
      type,
      priority,
      assignedTo: assignedTo || null,
      watchers: [req.user._id] // Auto-add raiser as watcher
    });

    await ticket.save();
    await ticket.populate([
      { path: 'raisedBy', select: 'name email role' },
      { path: 'assignedTo', select: 'name email role' },
      { path: 'project', select: 'name key manager members' },
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

      // Send assignment notification if ticket is assigned
      if (assignedTo && assignedTo !== req.user._id.toString()) {
        io.to(`user:${assignedTo}`).emit('notification', {
          type: 'ticket_assigned',
          title: 'New Ticket Assigned',
          message: `You have been assigned to ticket: ${ticket.title}`,
          data: {
            ticketId: ticket._id,
            projectName: project.name,
            assignedBy: req.user.name
          }
        });
      }
    }

    logger.info('Ticket created:', { ticketId: ticket._id, project: projectId, raisedBy: req.user._id, assignedTo });

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
      .populate('project', 'name key manager')
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
      .populate('project', 'name key manager members')
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

    const ticket = await Ticket.findById(id).populate([
      { path: 'project', populate: { path: 'manager', select: 'name email' } },
      { path: 'raisedBy', select: 'name email' },
      { path: 'assignedTo', select: 'name email' }
    ]);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticket.status !== TICKET_STATUS.OPEN && ticket.status !== TICKET_STATUS.IN_PROGRESS) {
      return res.status(400).json({ error: 'Cannot update resolved or closed tickets' });
    }

    // Check permissions - FIXED AUTHORIZATION LOGIC
    const project = ticket.project;
    const isProjectManager = project.manager._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === ROLES.ADMIN;
    const isRaiser = ticket.raisedBy._id.toString() === req.user._id.toString();

    // Only admin, project manager, or raiser can update tickets
    if (!isAdmin && !isProjectManager && !isRaiser) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = {};
    const oldAssignedTo = ticket.assignedTo?._id?.toString();
    
    // Status updates
    if (status && Object.values(TICKET_STATUS).includes(status)) {
      // Raisers can only close their own tickets
      if (isRaiser && !isAdmin && !isProjectManager) {
        if (status !== TICKET_STATUS.CLOSED) {
          return res.status(403).json({ error: 'You can only close your own tickets' });
        }
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
      { path: 'project', select: 'name key manager members' },
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

      // Send assignment notification if assignee changed
      if (updates.assignedTo !== undefined) {
        const newAssignedTo = updates.assignedTo?.toString();
        
        // Notify old assignee about unassignment
        if (oldAssignedTo && oldAssignedTo !== newAssignedTo && oldAssignedTo !== req.user._id.toString()) {
          io.to(`user:${oldAssignedTo}`).emit('notification', {
            type: 'ticket_unassigned',
            title: 'Ticket Unassigned',
            message: `You have been unassigned from ticket: ${ticket.title}`,
            data: {
              ticketId: ticket._id,
              projectName: project.name,
              updatedBy: req.user.name
            }
          });
        }
        
        // Notify new assignee about assignment
        if (newAssignedTo && newAssignedTo !== oldAssignedTo && newAssignedTo !== req.user._id.toString()) {
          io.to(`user:${newAssignedTo}`).emit('notification', {
            type: 'ticket_assigned',
            title: 'Ticket Assigned',
            message: `You have been assigned to ticket: ${ticket.title}`,
            data: {
              ticketId: ticket._id,
              projectName: project.name,
              assignedBy: req.user.name
            }
          });
        }
      }

      // Notify about status changes
      if (updates.status && updates.status !== ticket.status) {
        const statusMessage = `Ticket status changed to: ${updates.status.replace('_', ' ')}`;
        
        // Notify all watchers except the updater
        ticket.watchers.forEach(watcherId => {
          if (watcherId.toString() !== req.user._id.toString()) {
            io.to(`user:${watcherId}`).emit('notification', {
              type: 'ticket_status_changed',
              title: 'Ticket Status Updated',
              message: statusMessage,
              data: {
                ticketId: ticket._id,
                projectName: project.name,
                newStatus: updates.status,
                updatedBy: req.user.name
              }
            });
          }
        });
      }
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

    const ticket = await Ticket.findById(id).populate([
      { path: 'project', select: 'name key manager members' },
      { path: 'watchers', select: 'name email' }
    ]);
    
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

      // Notify all watchers except the commenter
      ticket.watchers.forEach(watcherId => {
        if (watcherId.toString() !== req.user._id.toString()) {
          io.to(`user:${watcherId}`).emit('notification', {
            type: 'ticket_comment',
            title: 'New Comment on Ticket',
            message: `${req.user.name} commented on: ${ticket.title}`,
            data: {
              ticketId: ticket._id,
              projectName: project.name,
              commentBy: req.user.name,
              commentPreview: body.trim().substring(0, 100) + (body.trim().length > 100 ? '...' : '')
            }
          });
        }
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