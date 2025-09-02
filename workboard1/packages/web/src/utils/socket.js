import { io } from 'socket.io-client';
import { getToken } from './api.js';

const SOCKET_URL = 'http://localhost:5001';

let socket = null;

export const initializeSocket = () => {
  const token = getToken();
  
  if (!token) {
    console.warn('No auth token found, cannot initialize socket');
    return null;
  }

  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: {
      token: token
    },
    autoConnect: true
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  // Listen for leave decisions
  socket.on('leave:decision', (data) => {
    console.log('Leave decision received:', data);
    // Dispatch custom event that components can listen to
    window.dispatchEvent(new CustomEvent('leaveDecision', { detail: data }));
  });

  // Listen for ticket updates
  socket.on('ticket:update', (data) => {
    console.log('Ticket update received:', data);
    window.dispatchEvent(new CustomEvent('ticketUpdate', { detail: data }));
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

// Socket event helpers
export const joinProject = (projectId) => {
  if (socket) {
    socket.emit('join:project', { projectId });
  }
};

export const leaveProject = (projectId) => {
  if (socket) {
    socket.emit('leave:project', { projectId });
  }
};

export const sendMessage = (projectId, message) => {
  if (socket) {
    socket.emit('chat:message', { projectId, message });
  }
};

export const broadcastTaskUpdate = (projectId, task) => {
  if (socket) {
    socket.emit('task:update', { projectId, task });
  }
};

export default {
  initializeSocket,
  getSocket,
  disconnectSocket,
  joinProject,
  leaveProject,
  sendMessage,
  broadcastTaskUpdate
};