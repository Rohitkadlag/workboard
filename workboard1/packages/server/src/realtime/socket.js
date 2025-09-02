import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Message from '../models/Message.js';
import logger from '../config/logger.js';

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST']
    }
  });

  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, config.jwtAccessSecret);
      const user = await User.findById(decoded.id).select('-passwordHash');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    logger.info('User connected:', { userId: socket.userId, socketId: socket.id });

    // Join project room
    socket.on('join:project', async (data) => {
      try {
        const { projectId } = data;
        
        if (!projectId) {
          socket.emit('error', { message: 'Project ID is required' });
          return;
        }

        // Verify user has access to project
        const project = await Project.findById(projectId);
        if (!project) {
          socket.emit('error', { message: 'Project not found' });
          return;
        }

        const hasAccess = socket.user.role === 'ADMIN' ||
          project.manager.toString() === socket.userId ||
          project.members.includes(socket.userId);

        if (!hasAccess) {
          socket.emit('error', { message: 'Access denied to this project' });
          return;
        }

        // Join room
        const roomName = `project:${projectId}`;
        socket.join(roomName);
        
        logger.info('User joined project room:', { 
          userId: socket.userId, 
          projectId, 
          roomName 
        });

        socket.emit('joined:project', { projectId });

        // Send recent messages
        const recentMessages = await Message.find({ project: projectId })
          .populate('sender', 'name email')
          .sort({ createdAt: -1 })
          .limit(50);

        socket.emit('messages:history', { 
          projectId, 
          messages: recentMessages.reverse() 
        });

      } catch (error) {
        logger.error('Join project error:', error);
        socket.emit('error', { message: 'Failed to join project' });
      }
    });

    // Handle chat messages
    socket.on('chat:message', async (data) => {
      try {
        const { projectId, message } = data;

        if (!projectId || !message || !message.trim()) {
          socket.emit('error', { message: 'Project ID and message are required' });
          return;
        }

        // Verify user has access to project
        const project = await Project.findById(projectId);
        if (!project) {
          socket.emit('error', { message: 'Project not found' });
          return;
        }

        const hasAccess = socket.user.role === 'ADMIN' ||
          project.manager.toString() === socket.userId ||
          project.members.includes(socket.userId);

        if (!hasAccess) {
          socket.emit('error', { message: 'Access denied to this project' });
          return;
        }

        // Save message to database
        const chatMessage = new Message({
          project: projectId,
          sender: socket.userId,
          body: message.trim()
        });

        await chatMessage.save();
        await chatMessage.populate('sender', 'name email');

        // Broadcast to project room
        const roomName = `project:${projectId}`;
        io.to(roomName).emit('message:new', {
          projectId,
          message: chatMessage
        });

        logger.info('Chat message sent:', { 
          userId: socket.userId, 
          projectId, 
          messageId: chatMessage._id 
        });

      } catch (error) {
        logger.error('Chat message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle task updates
    socket.on('task:update', async (data) => {
      try {
        const { projectId, task } = data;

        if (!projectId || !task) {
          socket.emit('error', { message: 'Project ID and task data are required' });
          return;
        }

        // Verify user has access to project
        const project = await Project.findById(projectId);
        if (!project) {
          socket.emit('error', { message: 'Project not found' });
          return;
        }

        const hasAccess = socket.user.role === 'ADMIN' ||
          project.manager.toString() === socket.userId ||
          project.members.includes(socket.userId);

        if (!hasAccess) {
          socket.emit('error', { message: 'Access denied to this project' });
          return;
        }

        // Broadcast task update to project room
        const roomName = `project:${projectId}`;
        socket.to(roomName).emit('task:updated', {
          projectId,
          task,
          updatedBy: {
            id: socket.userId,
            name: socket.user.name
          }
        });

        logger.info('Task update broadcasted:', { 
          userId: socket.userId, 
          projectId, 
          taskId: task._id || task.id 
        });

      } catch (error) {
        logger.error('Task update error:', error);
        socket.emit('error', { message: 'Failed to broadcast task update' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      logger.info('User disconnected:', { 
        userId: socket.userId, 
        socketId: socket.id, 
        reason 
      });
    });
  });

  return io;
};