import express from 'express';
import { submitLeaveRequest, getLeaveRequests } from '../controllers/leave.controller.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.post('/submit', auth, submitLeaveRequest);
router.get('/', auth, getLeaveRequests);

export default router;