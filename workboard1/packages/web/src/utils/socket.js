import { io } from 'socket.io-client';
import { getToken } from './api.js';

let socket = null;

export const initializeSocket = () => {
  if (socket && socket.connected) {
    return socket;
  }

  const token = getToken();
  if (!token) {
    console.warn('No auth token available for socket connection');
    return null;
  }

  const socketUrl = window.location.hostname === 'localhost' 
    ? 'http://localhost:5001' 
    : `${window.location.protocol}//${window.location.hostname}:5001`;

  socket = io(socketUrl, {
    auth: {
      token
    },
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    timeout: 20000
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  // Handle notification events
  socket.on('notification', (notification) => {
    console.log('Received notification:', notification);
    
    // Dispatch custom event for notification system
    window.dispatchEvent(new CustomEvent('socketNotification', { 
      detail: notification 
    }));
  });

  // Handle task events
  socket.on('task:update', (data) => {
    console.log('Task update received:', data);
    
    // Dispatch custom event for task updates
    window.dispatchEvent(new CustomEvent('taskUpdate', { 
      detail: data 
    }));
  });

  // Handle ticket events
  socket.on('ticket:update', (data) => {
    console.log('Ticket update received:', data);
    
    // Dispatch custom event for ticket updates
    window.dispatchEvent(new CustomEvent('ticketUpdate', { 
      detail: data 
    }));
  });

  // Handle project events
  socket.on('project:update', (data) => {
    console.log('Project update received:', data);
    
    // Dispatch custom event for project updates
    window.dispatchEvent(new CustomEvent('projectUpdate', { 
      detail: data 
    }));
  });

  // Handle leave decision events
  socket.on('leave:decision', (data) => {
    console.log('Leave decision received:', data);
    
    // Dispatch custom event for leave decisions
    window.dispatchEvent(new CustomEvent('leaveDecision', { 
      detail: data 
    }));
  });

  // Handle chat events
  socket.on('message:new', (data) => {
    console.log('New message received:', data);
  });

  socket.on('messages:history', (data) => {
    console.log('Messages history received:', data);
  });

  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Project-related socket functions
export const joinProject = (projectId) => {
  if (socket && socket.connected) {
    socket.emit('join:project', { projectId });
  }
};

export const leaveProject = (projectId) => {
  if (socket && socket.connected) {
    socket.emit('leave:project', { projectId });
  }
};

export const broadcastTaskUpdate = (projectId, task) => {
  if (socket && socket.connected) {
    socket.emit('task:broadcast', { projectId, task });
  }
};

export const broadcastTicketUpdate = (projectId, ticket) => {
  if (socket && socket.connected) {
    socket.emit('ticket:broadcast', { projectId, ticket });
  }
};

// Chat functions
export const sendMessage = (projectId, message) => {
  if (socket && socket.connected) {
    socket.emit('message:send', { projectId, message });
  }
};

// User presence functions
export const joinUserRoom = (userId) => {
  if (socket && socket.connected) {
    socket.emit('join:user', { userId });
  }
};

export const leaveUserRoom = (userId) => {
  if (socket && socket.connected) {
    socket.emit('leave:user', { userId });
  }
};

// Notification acknowledgment
export const acknowledgeNotification = (notificationId) => {
  if (socket && socket.connected) {
    socket.emit('notification:acknowledge', { notificationId });
  }
};

// Helper function to emit custom events with error handling
const emitSocketEvent = (eventName, data) => {
  if (socket && socket.connected) {
    socket.emit(eventName, data);
    return true;
  }
  console.warn(`Cannot emit ${eventName}: socket not connected`);
  return false;
};

export { emitSocketEvent };