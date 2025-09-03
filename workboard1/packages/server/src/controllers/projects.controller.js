import Project from '../models/Project.js';
import logger from '../config/logger.js';
import { ROLES } from '@workboard/shared';

export const getProjects = async (req, res) => {
  try {
    let query = {};
    
    // Non-admins can only see projects they're involved in
    if (req.user.role !== ROLES.ADMIN) {
      query = {
        $or: [
          { manager: req.user._id },
          { members: req.user._id }
        ]
      };
    }

    const projects = await Project.find(query)
      .populate('manager', 'name email role')
      .populate('members', 'name email role')
      .sort({ createdAt: -1 });

    res.json({
      projects,
      total: projects.length
    });
  } catch (error) {
    logger.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

export const createProject = async (req, res) => {
  try {
    const { name, key, description, members = [] } = req.body;

    if (!name || !key) {
      return res.status(400).json({
        error: 'Project name and key are required'
      });
    }

    // Validate key format (alphanumeric, uppercase)
    const keyRegex = /^[A-Z0-9]+$/;
    if (!keyRegex.test(key)) {
      return res.status(400).json({
        error: 'Project key must contain only uppercase letters and numbers'
      });
    }

    // Create project with current user as manager
    const uniqueMembers = [...new Set([req.user._id.toString(), ...members])]; // Include manager and dedupe
    
    const project = new Project({
      name,
      key: key.toUpperCase(),
      description,
      manager: req.user._id,
      members: uniqueMembers
    });

    await project.save();
    
    // Populate manager and members
    await project.populate('manager', 'name email role');
    await project.populate('members', 'name email role');

    // Emit real-time notifications
    const io = req.app.get('io');
    if (io) {
      // Notify all team members about project creation (except the creator)
      uniqueMembers.forEach(memberId => {
        if (memberId !== req.user._id.toString()) {
          io.to(`user:${memberId}`).emit('notification', {
            type: 'project_assigned',
            title: 'Added to New Project',
            message: `You have been added to project: ${project.name}`,
            data: {
              projectId: project._id,
              projectName: project.name,
              projectKey: project.key,
              addedBy: req.user.name,
              role: 'member'
            }
          });
        }
      });
    }

    logger.info('Project created:', { 
      projectId: project._id, 
      key, 
      manager: req.user._id,
      membersCount: uniqueMembers.length 
    });

    res.status(201).json({
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    logger.error('Create project error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        error: 'Project key already exists'
      });
    }
    
    res.status(500).json({ error: 'Failed to create project' });
  }
};

export const getProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id)
      .populate('manager', 'name email role')
      .populate('members', 'name email role');

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user has access to this project
    const hasAccess = req.user.role === ROLES.ADMIN ||
      project.manager._id.toString() === req.user._id.toString() ||
      project.members.some(member => member._id.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    res.json({ project });
  } catch (error) {
    logger.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
};

export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, members = [] } = req.body;

    const project = await Project.findById(id).populate('members', 'name email');
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check permissions - only admin or project manager can update
    const canUpdate = req.user.role === ROLES.ADMIN ||
      project.manager.toString() === req.user._id.toString();

    if (!canUpdate) {
      return res.status(403).json({ error: 'Only project managers and admins can update projects' });
    }

    const oldMembers = project.members.map(m => m._id.toString());
    const newMembers = [...new Set([req.user._id.toString(), ...members])]; // Always include manager

    // Update project
    if (name && name.trim()) project.name = name.trim();
    if (description !== undefined) project.description = description.trim();
    project.members = newMembers;

    await project.save();
    await project.populate('manager', 'name email role');
    await project.populate('members', 'name email role');

    // Emit notifications for member changes
    const io = req.app.get('io');
    if (io) {
      // Find added and removed members
      const addedMembers = newMembers.filter(id => !oldMembers.includes(id));
      const removedMembers = oldMembers.filter(id => !newMembers.includes(id));

      // Notify newly added members
      addedMembers.forEach(memberId => {
        if (memberId !== req.user._id.toString()) {
          io.to(`user:${memberId}`).emit('notification', {
            type: 'project_assigned',
            title: 'Added to Project',
            message: `You have been added to project: ${project.name}`,
            data: {
              projectId: project._id,
              projectName: project.name,
              projectKey: project.key,
              addedBy: req.user.name
            }
          });
        }
      });

      // Notify removed members
      removedMembers.forEach(memberId => {
        if (memberId !== req.user._id.toString()) {
          io.to(`user:${memberId}`).emit('notification', {
            type: 'project_removed',
            title: 'Removed from Project',
            message: `You have been removed from project: ${project.name}`,
            data: {
              projectId: project._id,
              projectName: project.name,
              removedBy: req.user.name
            }
          });
        }
      });

      // Emit project update to all current members
      io.to(`project:${id}`).emit('project:update', {
        action: 'updated',
        project: project,
        updatedBy: req.user.name
      });
    }

    logger.info('Project updated:', { 
      projectId: id, 
      updatedBy: req.user._id,
      membersAdded: addedMembers?.length || 0,
      membersRemoved: removedMembers?.length || 0
    });

    res.json({
      message: 'Project updated successfully',
      project
    });

  } catch (error) {
    logger.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    // Only admins can delete projects
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ 
        error: 'Only administrators can delete projects' 
      });
    }

    const project = await Project.findById(id).populate('members', 'name email');
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if project has associated data (tasks, tickets, etc.)
    const Task = (await import('../models/Task.js')).default;
    const Ticket = (await import('../models/Ticket.js')).default;
    const Message = (await import('../models/Message.js')).default;

    const [taskCount, ticketCount, messageCount] = await Promise.all([
      Task.countDocuments({ project: id }),
      Ticket.countDocuments({ project: id }),
      Message.countDocuments({ project: id })
    ]);

    const totalData = taskCount + ticketCount + messageCount;

    // Store project data for notifications before deletion
    const projectData = {
      id: project._id,
      name: project.name,
      key: project.key,
      members: project.members.map(m => m._id.toString()),
      manager: project.manager.toString()
    };

    if (totalData > 0) {
      // Delete associated data first
      await Promise.all([
        Task.deleteMany({ project: id }),
        Ticket.deleteMany({ project: id }),
        Message.deleteMany({ project: id })
      ]);

      logger.info('Deleted project data:', {
        projectId: id,
        tasks: taskCount,
        tickets: ticketCount,
        messages: messageCount
      });
    }

    // Delete the project
    await Project.findByIdAndDelete(id);

    // Emit notifications to all project members
    const io = req.app.get('io');
    if (io) {
      // Notify all project members about deletion
      projectData.members.forEach(memberId => {
        if (memberId !== req.user._id.toString()) {
          io.to(`user:${memberId}`).emit('notification', {
            type: 'project_deleted',
            title: 'Project Deleted',
            message: `Project "${projectData.name}" has been deleted by administrator`,
            data: {
              projectName: projectData.name,
              projectKey: projectData.key,
              deletedBy: req.user.name,
              dataDeleted: {
                tasks: taskCount,
                tickets: ticketCount,
                messages: messageCount
              }
            }
          });
        }
      });

      // Emit project deletion event
      io.to(`project:${id}`).emit('project:deleted', {
        projectId: id,
        projectName: projectData.name,
        deletedBy: req.user.name
      });
    }

    logger.info('Project deleted:', { 
      projectId: id, 
      projectName: projectData.name,
      deletedBy: req.user._id,
      totalDataDeleted: totalData
    });

    res.json({
      message: 'Project and all associated data deleted successfully',
      deletedData: {
        tasks: taskCount,
        tickets: ticketCount,
        messages: messageCount
      }
    });

  } catch (error) {
    logger.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};