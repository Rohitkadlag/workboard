import express from 'express';
import authRoutes from './auth.routes.js';
import projectsRoutes from './projects.routes.js';
import tasksRoutes from './tasks.routes.js';
import leaveRoutes from './leave.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/projects', projectsRoutes);
router.use('/tasks', tasksRoutes);
router.use('/leave', leaveRoutes);

export default router;