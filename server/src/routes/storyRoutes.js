import express from 'express';
import { createStory, getStories, viewStory } from '../controllers/storyController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/', createStory);
router.get('/', getStories);
router.post('/:id/view', viewStory);

export default router;
