import express from 'express';
import {
  getConversations,
  createConversation,
  getConversationById,
  markAsRead,
  addParticipant,
  removeParticipant,
  updateGroupProfile,
  updateConversationSettings,
} from '../controllers/conversationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getConversations);
router.post('/', createConversation);
router.get('/:id', getConversationById);
router.patch('/:id', updateGroupProfile);
router.patch('/:id/settings', updateConversationSettings);
router.post('/:id/read', markAsRead);
router.post('/:id/participants', addParticipant);
router.delete('/:id/participants/:userId', removeParticipant);

export default router;
