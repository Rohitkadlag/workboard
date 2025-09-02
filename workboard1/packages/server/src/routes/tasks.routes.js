import express from 'express';
import { getTasks, createTask, updateTaskStatus, updateTaskAssignees } from '../controllers/tasks.controller.js';
import { auth } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import { ROLES } from '@workboard/shared';

const router = express.Router();

router.get('/', auth, getTasks);
router.post('/', auth, createTask);
router.patch('/:id/status', auth, updateTaskStatus);
router.patch('/:id/assignees', auth, rbac(ROLES.ADMIN, ROLES.MANAGER), updateTaskAssignees);

export default router;