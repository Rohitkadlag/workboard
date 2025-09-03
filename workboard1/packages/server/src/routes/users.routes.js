import express from 'express';
import { 
  getUsers, 
  getProjectMembers, 
  getUsersByRole, 
  getAvailableAssignees 
} from '../controllers/users.controller.js';
import { auth } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import { ROLES } from '@workboard/shared';

const router = express.Router();

// Get all users with optional filters
router.get('/', auth, getUsers);

// Get users grouped by role
router.get('/by-role', auth, getUsersByRole);

// Get members of a specific project
router.get('/project/:id/members', auth, getProjectMembers);

// Get available assignees for a project (excludes users on leave if date range provided)
router.get('/project/:id/assignees', auth, getAvailableAssignees);

export default router;