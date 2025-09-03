import express from 'express';
import { getProjects, createProject, getProject, updateProject } from '../controllers/projects.controller.js';
import { auth } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import { ROLES } from '@workboard/shared';

const router = express.Router();

router.get('/', auth, getProjects);
router.post('/', auth, rbac(ROLES.ADMIN, ROLES.MANAGER), createProject);
router.get('/:id', auth, getProject);
router.patch('/:id', auth, rbac(ROLES.ADMIN, ROLES.MANAGER), updateProject);

export default router;