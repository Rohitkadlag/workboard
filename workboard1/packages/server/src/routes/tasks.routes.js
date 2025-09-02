import express from 'express';
import { getTasks, createTask, updateTaskStatus } from '../controllers/tasks.controller.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, getTasks);
router.post('/', auth, createTask);
router.patch('/:id/status', auth, updateTaskStatus);

export default router;