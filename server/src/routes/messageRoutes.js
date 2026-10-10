import express from 'express';
import { getMessages, sendMessage, toggleReaction, deleteMessage } from '../controllers/messageController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/conversations/:conversationId/messages', getMessages);
router.post('/conversations/:conversationId/messages', sendMessage);
router.post('/messages/:id/reaction', toggleReaction);
router.delete('/messages/:id', deleteMessage);

export default router;
