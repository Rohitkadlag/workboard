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
    const project = new Project({
      name,
      key: key.toUpperCase(),
      description,
      manager: req.user._id,
      members: [...new Set([req.user._id, ...members])] // Include manager and dedupe
    });

    await project.save();
    
    // Populate manager and members
    await project.populate('manager', 'name email role');
    await project.populate('members', 'name email role');

    logger.info('Project created:', { projectId: project._id, key, manager: req.user._id });

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