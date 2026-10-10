import express from 'express';
import { getUsers, getUserById, updateProfile } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getUsers);
router.get('/:id', getUserById);
router.patch('/profile', updateProfile);

export default router;
