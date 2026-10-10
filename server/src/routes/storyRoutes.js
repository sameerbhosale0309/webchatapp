import express from 'express';
import { createStory, getStories, viewStory, deleteStory } from '../controllers/storyController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/', createStory);
router.get('/', getStories);
router.post('/:id/view', viewStory);
router.delete('/:id', deleteStory);

export default router;
