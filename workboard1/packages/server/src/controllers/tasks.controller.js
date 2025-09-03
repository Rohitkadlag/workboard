import Task from '../models/Task.js';
import Project from '../models/Project.js';
import logger from '../config/logger.js';
import { ROLES, TASK_STATUS } from '@workboard/shared';

export const getTasks = async (req, res) => {
  try {
    const { project: projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({
        error: 'Project ID is required'
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

    const tasks = await Task.find({ project: projectId })
      .populate('assignees', 'name email role')
      .sort({ createdAt: -1 });

    res.json({
      tasks,
      total: tasks.length
    });
  } catch (error) {
    logger.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

export const createTask = async (req, res) => {
  try {
    const { project: projectId, title, description, assignees = [], dueDate, points = 0 } = req.body;

    if (!projectId || !title) {
      return res.status(400).json({
        error: 'Project ID and title are required'
      });
    }

    // Verify user has access to project
    const project = await Project.findById(projectId).populate('manager', 'name email');
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const hasAccess = req.user.role === ROLES.ADMIN ||
      project.manager._id.toString() === req.user._id.toString() ||
      project.members.includes(req.user._id);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    // Filter assignees to only include project members
    const validAssignees = assignees.filter(id => project.members.includes(id));

    const task = new Task({
      project: projectId,
      title,
      description,
      assignees: validAssignees,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      points: Math.max(0, parseInt(points) || 0),
      status: TASK_STATUS.BACKLOG
    });

    await task.save();
    await task.populate('assignees', 'name email role');

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${projectId}`).emit('task:update', {
        action: 'created',
        task: task
      });

      // Send assignment notifications to each assignee
      validAssignees.forEach(assigneeId => {
        if (assigneeId !== req.user._id.toString()) {
          io.to(`user:${assigneeId}`).emit('notification', {
            type: 'task_assigned',
            title: 'New Task Assigned',
            message: `You have been assigned to task: ${task.title}`,
            data: {
              taskId: task._id,
              projectName: project.name,
              assignedBy: req.user.name,
              dueDate: task.dueDate
            }
          });
        }
      });
    }

    logger.info('Task created:', { taskId: task._id, project: projectId, title, assignees: validAssignees });

    res.status(201).json({
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    logger.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
};

export const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!Object.values(TASK_STATUS).includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        validStatuses: Object.values(TASK_STATUS)
      });
    }

    const task = await Task.findById(id).populate([
      { path: 'project', populate: { path: 'manager', select: 'name email' } },
      { path: 'assignees', select: 'name email' }
    ]);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Verify user has access to project
    const project = task.project;
    const hasAccess = req.user.role === ROLES.ADMIN ||
      project.manager._id.toString() === req.user._id.toString() ||
      project.members.includes(req.user._id);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this task' });
    }

    const oldStatus = task.status;
    task.status = status;
    await task.save();

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${project._id}`).emit('task:update', {
        action: 'status_updated',
        task: task,
        updatedBy: req.user.name
      });

      // Notify assignees about status change (except the updater)
      task.assignees.forEach(assignee => {
        if (assignee._id.toString() !== req.user._id.toString()) {
          io.to(`user:${assignee._id}`).emit('notification', {
            type: 'task_status_changed',
            title: 'Task Status Updated',
            message: `Task "${task.title}" status changed from ${oldStatus.replace('_', ' ')} to ${status.replace('_', ' ')}`,
            data: {
              taskId: task._id,
              projectName: project.name,
              oldStatus,
              newStatus: status,
              updatedBy: req.user.name
            }
          });
        }
      });
    }

    logger.info('Task status updated:', { taskId: task._id, status, updatedBy: req.user._id });

    res.json({
      message: 'Task status updated successfully',
      task
    });
  } catch (error) {
    logger.error('Update task status error:', error);
    res.status(500).json({ error: 'Failed to update task status' });
  }
};

export const updateTaskAssignees = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignees = [] } = req.body;

    if (!Array.isArray(assignees)) {
      return res.status(400).json({
        error: 'Assignees must be an array of user IDs'
      });
    }

    const task = await Task.findById(id).populate([
      { path: 'project', populate: { path: 'manager', select: 'name email' } },
      { path: 'assignees', select: 'name email' }
    ]);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Verify user has permission to assign tasks
    const project = task.project;
    const canAssign = req.user.role === ROLES.ADMIN ||
      project.manager._id.toString() === req.user._id.toString();

    if (!canAssign) {
      return res.status(403).json({ 
        error: 'Only project managers and admins can assign tasks' 
      });
    }

    // Filter assignees to only include project members
    const validAssignees = assignees.filter(assigneeId => 
      project.members.some(member => member.toString() === assigneeId)
    );

    const oldAssignees = task.assignees.map(a => a._id.toString());
    task.assignees = validAssignees;
    await task.save();
    await task.populate('assignees', 'name email role');

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${project._id}`).emit('task:update', {
        action: 'assignees_updated',
        task: task,
        updatedBy: req.user.name
      });

      // Determine who was added/removed
      const newAssignees = validAssignees;
      const addedAssignees = newAssignees.filter(id => !oldAssignees.includes(id));
      const removedAssignees = oldAssignees.filter(id => !newAssignees.includes(id));

      // Notify newly assigned users
      addedAssignees.forEach(assigneeId => {
        if (assigneeId !== req.user._id.toString()) {
          io.to(`user:${assigneeId}`).emit('notification', {
            type: 'task_assigned',
            title: 'Task Assigned',
            message: `You have been assigned to task: ${task.title}`,
            data: {
              taskId: task._id,
              projectName: project.name,
              assignedBy: req.user.name,
              dueDate: task.dueDate
            }
          });
        }
      });

      // Notify removed assignees
      removedAssignees.forEach(assigneeId => {
        if (assigneeId !== req.user._id.toString()) {
          io.to(`user:${assigneeId}`).emit('notification', {
            type: 'task_unassigned',
            title: 'Task Unassigned',
            message: `You have been unassigned from task: ${task.title}`,
            data: {
              taskId: task._id,
              projectName: project.name,
              unassignedBy: req.user.name
            }
          });
        }
      });
    }

    logger.info('Task assignees updated:', { 
      taskId: task._id, 
      assignees: validAssignees, 
      updatedBy: req.user._id 
    });

    res.json({
      message: 'Task assignees updated successfully',
      task
    });
  } catch (error) {
    logger.error('Update task assignees error:', error);
    res.status(500).json({ error: 'Failed to update task assignees' });
  }
};