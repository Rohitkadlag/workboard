import express from 'express';
import { 
  createTicket, 
  getTickets, 
  getTicket, 
  updateTicket, 
  addComment 
} from '../controllers/tickets.controller.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.post('/', auth, createTicket);
router.get('/', auth, getTickets);
router.get('/:id', auth, getTicket);
router.patch('/:id', auth, updateTicket);
router.post('/:id/comments', auth, addComment);

export default router;