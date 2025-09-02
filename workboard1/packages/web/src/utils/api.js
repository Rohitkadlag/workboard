import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Helper function to set token
export const setToken = (token) => {
  if (token) {
    localStorage.setItem('access_token', token);
  } else {
    localStorage.removeItem('access_token');
  }
};

// Helper function to get token
export const getToken = () => {
  return localStorage.getItem('access_token');
};

// API methods
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
};

export const projectsAPI = {
  getAll: () => api.get('/projects'),
  getById: (id) => api.get(`/projects/${id}`),
  create: (projectData) => api.post('/projects', projectData),
};

export const tasksAPI = {
  getByProject: (projectId) => api.get(`/tasks?project=${projectId}`),
  create: (taskData) => api.post('/tasks', taskData),
  updateStatus: (taskId, status) => api.patch(`/tasks/${taskId}/status`, { status }),
  updateAssignees: (taskId, assignees) => api.patch(`/tasks/${taskId}/assignees`, { assignees }),
};

export const leaveAPI = {
  submit: (leaveData) => api.post('/leave/submit', leaveData),
  getAll: () => api.get('/leave'),
  getPending: () => api.get('/leave/pending'),
  makeDecision: (id, decision, note) => api.patch(`/leave/${id}/decision`, { decision, note }),
  getSuggestions: (preferences) => api.post('/leave/suggest', preferences),
};

export const ticketsAPI = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    return api.get(`/tickets?${params.toString()}`);
  },
  getById: (id) => api.get(`/tickets/${id}`),
  create: (ticketData) => api.post('/tickets', ticketData),
  update: (id, updateData) => api.patch(`/tickets/${id}`, updateData),
  addComment: (id, body) => api.post(`/tickets/${id}/comments`, { body }),
};

export default api;