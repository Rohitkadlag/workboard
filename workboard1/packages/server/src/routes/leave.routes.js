import express from 'express';
import { 
  submitLeaveRequest, 
  getLeaveRequests, 
  getPendingLeaveRequests,
  decideLeaveRequest,
  getAISuggestions
} from '../controllers/leave.controller.js';
import { auth } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import { ROLES } from '@workboard/shared';

const router = express.Router();

// Employee routes
router.post('/submit', auth, submitLeaveRequest);
router.get('/', auth, getLeaveRequests);
router.post('/suggest', auth, getAISuggestions);

// Admin/Manager routes
router.get('/pending', auth, rbac(ROLES.ADMIN, ROLES.MANAGER), getPendingLeaveRequests);
router.patch('/:id/decision', auth, rbac(ROLES.ADMIN, ROLES.MANAGER), decideLeaveRequest);

export default router;